import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { AddressInfo } from 'node:net'
import { genererJour } from '../src/batch.ts'
import { evaluerFiche, evaluerTermines, jugerButs, jugerIssue } from '../src/evaluate.ts'
import { construireHistorique } from '../src/historique.ts'
import { creerServeur } from '../src/server.ts'
import { DemoSource } from '../src/sources/demo-source.ts'
import { JsonSource } from '../src/sources/json-source.ts'
import { Store } from '../src/store.ts'
import type { Interne } from '../src/types.ts'
import type { Historique, Prediction } from '../../src/domain/contracts.ts'

const NOW = new Date('2026-10-11T12:00:00Z')

test('Règles d’évaluation', () => {
  assert.equal(jugerIssue('1X', 1, 1), true)
  assert.equal(jugerIssue('1', 1, 1), false)
  assert.equal(jugerIssue('X2', 0, 2), true)
  assert.equal(jugerButs('O1.5', 1, 1), true)
  assert.equal(jugerButs('U2.5', 2, 1), false)
  assert.equal(jugerButs('BTTS', 2, 0), false)
  const interne: Interne = { issue: '1X', buts: 'O1.5', bonus: { categorie: 'cartons', ligne: 3.5 }, scores: ['2-1', '1-1'] }
  const ok = evaluerFiche(interne, { match_id: 'x', statut: 'termine', score_domicile: 2, score_exterieur: 1, bonus: { cartons: 5 } })
  assert.deepEqual(ok, { statut: 'evalue', issue: true, buts: true, bonus: true, score: true, score_final: '2-1' })
  const sansStat = evaluerFiche(interne, { match_id: 'x', statut: 'termine', score_domicile: 0, score_exterieur: 3 })
  assert.equal(sansStat?.bonus, null)
  assert.equal(sansStat?.issue, false)
  assert.equal(evaluerFiche(interne, { match_id: 'x', statut: 'a_venir' }), null)
  assert.equal(evaluerFiche(interne, { match_id: 'x', statut: 'annule' })?.statut, 'annule')
})

test('Circuit complet : lot → évaluation → historique → API', async () => {
  const store = new Store()
  const source = new DemoSource({ maintenant: () => NOW })
  for (let n = -20; n <= 2; n++) {
    const d = new Date(NOW)
    d.setUTCDate(d.getUTCDate() + n)
    const bilan = await genererJour(d.toISOString().slice(0, 10), source, store, {}, new Date(d.getTime() - 86400000))
    assert.equal(bilan.avecPronostics, bilan.rencontres)
  }
  const evalues = await evaluerTermines(store, source, NOW)
  assert.ok(evalues > 50)
  assert.equal(await evaluerTermines(store, source, NOW), 0) // rien de nouveau

  const histo = await construireHistorique(store, '7j', NOW)
  const nb = histo.jours.reduce((s, j) => s + j.matchs.length, 0)
  assert.ok(nb > 0)
  assert.equal(histo.taux.issue.total, nb)
  assert.ok(histo.taux.issue.reussis <= nb)
  assert.ok(histo.jours[0].jour > histo.jours[histo.jours.length - 1].jour || histo.jours.length === 1)
  assert.ok((await construireHistorique(store, 'saison', NOW)).taux.issue.total >= histo.taux.issue.total)

  const serveur = creerServeur(store, { maintenant: () => NOW })
  await new Promise<void>(r => serveur.listen(0, r))
  const base = 'http://127.0.0.1:' + (serveur.address() as AddressInfo).port
  try {
    const jour = (await (await fetch(base + '/api/matchs?date=2026-10-12')).json()) as Prediction[]
    assert.equal(jour.length, 6)
    assert.equal(jour[0].resultat.statut, 'non_evalue')
    const un = await fetch(base + '/api/matchs/' + jour[0].match_id)
    assert.equal(un.status, 200)
    assert.equal(((await un.json()) as Prediction).match_id, jour[0].match_id)
    assert.equal((await fetch(base + '/api/matchs/inconnu')).status, 404)
    assert.equal((await fetch(base + '/api/matchs?date=hier')).status, 400)
    assert.equal((await fetch(base + '/api/matchs?date=2031-01-01')).status, 200)
    assert.deepEqual(await (await fetch(base + '/api/matchs?date=2031-01-01')).json(), [])
    assert.equal((await fetch(base + '/api/historique?periode=an')).status, 400)
    const h = (await (await fetch(base + '/api/historique?periode=7j')).json()) as Historique
    assert.equal(h.periode, '7j')
    assert.equal((await fetch(base + '/api/matchs', { method: 'OPTIONS' })).status, 204)
  } finally {
    serveur.close()
  }
})

test('Une fiche dont le match a commencé n’est plus recalculée ; une fiche évaluée n’est jamais écrasée', async () => {
  const store = new Store()
  const source = new DemoSource({ maintenant: () => NOW })
  await genererJour('2026-10-05', source, store, {}, new Date('2026-10-05T00:00:00Z'))
  const avant = (await store.parJour('2026-10-05'))[0]
  const bilan = await genererJour('2026-10-05', source, store, {}, NOW)
  assert.equal(bilan.ignores, bilan.rencontres)
  assert.equal((await store.parJour('2026-10-05'))[0].meta.genere_le, avant.meta.genere_le)
  await evaluerTermines(store, source, NOW)
  const evalue = (await store.parId(avant.match_id))!
  assert.equal(evalue.resultat.statut, 'evalue')
  await store.enregistrer('2026-10-05', { ...evalue, resultat: { statut: 'non_evalue', issue: null, buts: null, bonus: null, score: null } }, null)
  assert.equal((await store.parId(avant.match_id))!.resultat.statut, 'evalue')
})

test('Source JSON : lit rencontres, contextes et résultats', async () => {
  const dossier = await mkdtemp(join(tmpdir(), 'apex-'))
  await mkdir(join(dossier, 'rencontres'))
  const historique = (n: number) => Array.from({ length: n }, (_, i) => ({ date: '2026-09-' + String(20 - i).padStart(2, '0'), domicile: true, buts_pour: 2, buts_contre: 1 }))
  const rencontre = { match_id: 'j1', date_heure: '2026-10-12T17:00:00Z', competition: 'Ligue X', domicile: { id: 'a', nom: 'A', matchs: historique(8) }, exterieur: { id: 'b', nom: 'B', matchs: historique(8) }, cotes: {} }
  await writeFile(join(dossier, 'rencontres', '2026-10-12.json'), JSON.stringify({ rencontres: [rencontre] }))
  await writeFile(join(dossier, 'contextes.json'), JSON.stringify({ 'Ligue X': { competition: 'Ligue X', moy_buts_domicile: 1.5, moy_buts_exterieur: 1.2, moy_bonus: {} } }))
  const s = new JsonSource(dossier)
  assert.equal((await s.rencontres('2026-10-12')).length, 1)
  assert.deepEqual(await s.rencontres('2026-10-13'), [])
  assert.equal(await s.resultat('j1'), null)
  await assert.rejects(s.contexte('Inconnue'), /Contexte manquant/)
  const store = new Store()
  const bilan = await genererJour('2026-10-12', s, store, {}, NOW)
  assert.equal(bilan.avecPronostics, 1)
  assert.equal((await store.parId('j1'))?.pronostics?.scores.length, 3)
})
