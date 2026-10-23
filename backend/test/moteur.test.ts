import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lesDeuxMarquent, matrice, meilleursScores, issue, plusDe, pmf } from '../src/engine/poisson.ts'
import { butsAttendus, forme } from '../src/engine/force.ts'
import { choisirBonus } from '../src/engine/bonus.ts'
import { probaImplicite, valeur } from '../src/engine/value.ts'
import { construireFiche } from '../src/engine/fiche.ts'
import { chiffresAutorises, produireSynthese, syntheseModele, valider } from '../src/engine/synthese.ts'
import type { Contexte, MatchPasse, Rencontre } from '../src/types.ts'

const ctx: Contexte = { competition: 'T', moy_buts_domicile: 1.5, moy_buts_exterieur: 1.2, moy_bonus: { cartons: 4, corners: 10, fautes: 24, 'hors-jeu': 4 } }
const matchs = (n: number, pour: number, contre: number, bonus?: MatchPasse['bonus']): MatchPasse[] =>
  Array.from({ length: n }, (_, i) => ({ date: '2026-09-' + String(28 - i).padStart(2, '0'), domicile: i % 2 === 0, buts_pour: pour, buts_contre: contre, bonus }))
const rencontre = (d: MatchPasse[], e: MatchPasse[], cotes = {}): Rencontre => ({
  match_id: 'x', date_heure: '2026-10-12T17:00:00Z', competition: 'T', cotes,
  domicile: { id: 'a', nom: 'Alpha', matchs: d }, exterieur: { id: 'b', nom: 'Beta', matchs: e },
})

test('Poisson : la matrice somme à 1 et les probabilités sont cohérentes', () => {
  const m = matrice(1.6, 1.1)
  assert.ok(Math.abs(m.flat().reduce((a, b) => a + b, 0) - 1) < 1e-9)
  const { p1, pN, p2 } = issue(m)
  assert.ok(Math.abs(p1 + pN + p2 - 1) < 1e-9)
  assert.ok(p1 > p2)
  assert.ok(plusDe(m, 1.5) > plusDe(m, 2.5))
  assert.ok(lesDeuxMarquent(m) > 0 && lesDeuxMarquent(m) < 1)
  assert.ok(Math.abs(pmf(2, 1.5) - 0.2510214) < 1e-6)
  const top = meilleursScores(m, 3)
  assert.equal(top.length, 3)
  assert.ok(top[0].probabilite >= top[1].probabilite && top[1].probabilite >= top[2].probabilite)
})

test('Équipes identiques : le domicile garde un léger avantage', () => {
  const { lh, la } = butsAttendus(matchs(10, 1, 1), matchs(10, 1, 1), ctx)
  assert.ok(lh > la)
})

test('Peu de matchs : on reste proche de la moyenne de la ligue (pas d’emballement)', () => {
  const trop = butsAttendus(matchs(2, 5, 0), matchs(2, 0, 3), ctx)
  assert.ok(trop.lh < 4.5 && trop.la > 0.3) // sans prudence, on aurait plus de 10 buts attendus
})

test('Forme : du plus ancien au plus récent', () => {
  const m: MatchPasse[] = [
    { date: '2026-09-01', domicile: true, buts_pour: 2, buts_contre: 0 },
    { date: '2026-09-02', domicile: true, buts_pour: 1, buts_contre: 1 },
    { date: '2026-09-03', domicile: true, buts_pour: 0, buts_contre: 1 },
  ]
  assert.deepEqual(forme(m), ['V', 'N', 'D'])
})

test('Bonus : aucun signal → null ; signal net → cartons', () => {
  const neutre = matchs(10, 1, 1, { cartons: 4, corners: 10, fautes: 24, 'hors-jeu': 4 })
  assert.equal(choisirBonus(neutre, neutre, ctx, {}), null)
  const chaud = matchs(10, 1, 1, { cartons: 5.5, corners: 10, fautes: 24, 'hors-jeu': 4 })
  const b = choisirBonus(chaud, chaud, ctx, { 'bonus:cartons:O3.5': 1.7 })
  assert.equal(b?.categorie, 'cartons')
  assert.equal(b?.ligne, 3.5)
  assert.equal(b?.pronostic.cote, 1.7)
})

test('Bonus : pas assez de données → null', () => {
  const peu = matchs(2, 1, 1, { cartons: 9, corners: 10, fautes: 24, 'hors-jeu': 4 })
  assert.equal(choisirBonus(peu, peu, ctx, {}), null)
})

test('Bonus : la catégorie publiée varie selon le signal le plus solide', () => {
  const cartons = matchs(10, 1, 1, { cartons: 5.5, corners: 10, fautes: 24 })
  const corners = matchs(10, 1, 1, { cartons: 4, corners: 13, fautes: 24 })
  assert.equal(choisirBonus(cartons, cartons, ctx, {})?.categorie, 'cartons')
  assert.equal(choisirBonus(corners, corners, ctx, {})?.categorie, 'corners')
})

test('Value : la marge du bookmaker est retirée', () => {
  const cotes = { '1': 2, N: 4, '2': 4 } // 0.5 + 0.25 + 0.25 = 1.0, pas de marge
  assert.ok(Math.abs(probaImplicite('1', cotes)! - 0.5) < 1e-9)
  const avecMarge = { '1': 1.9, N: 3.8, '2': 3.8 }
  assert.ok(probaImplicite('1', avecMarge)! < 1 / 1.9)
  assert.equal(probaImplicite('O1.5', {}), null)
})

test('Value : seuil minimum et plafond de suspicion', () => {
  const c = { 'O1.5': 1.5 } // implicite 0.667
  assert.equal(valeur([{ pilier: 'buts', cle: 'O1.5', probabilite: 0.7 }], c), null) // écart 0.03
  assert.deepEqual(valeur([{ pilier: 'buts', cle: 'O1.5', probabilite: 0.78 }], c), { pilier: 'buts', ecart: 0.11 })
  assert.equal(valeur([{ pilier: 'buts', cle: 'O1.5', probabilite: 0.95 }], c), null) // écart 0.28 : suspect
})

test('Fiche : peu de matchs (ou aucun) → il y a quand même un pronostic, signalé « données limitées »', () => {
  for (const peu of [matchs(2, 1, 1), []]) {
    const { fiche, interne } = construireFiche(rencontre(peu, matchs(5, 1, 1)), ctx, { nom: 's', nomCotes: 'c' })
    assert.ok(fiche.pronostics)
    assert.equal(fiche.pronostics.scores.length, 1)
    assert.equal(fiche.meta.donnees_limitees, true)
    assert.ok(interne)
  }
  const complet = construireFiche(rencontre(matchs(5, 1, 1), matchs(5, 1, 1)), ctx, { nom: 's', nomCotes: 'c' })
  assert.equal(complet.fiche.meta.donnees_limitees, undefined)
})

test('Fiche : respecte le contrat (4 piliers, 1 score, probabilités entre 0 et 1)', () => {
  const { fiche, interne } = construireFiche(rencontre(matchs(10, 2, 0), matchs(10, 0, 2), { '1': 1.4, N: 4.5, '2': 8 }), ctx, { nom: 's', nomCotes: 'c' })
  const p = fiche.pronostics!
  assert.equal(p.issue.court, '1')
  assert.equal(p.issue.cote, 1.4)
  assert.equal(p.scores.length, 1)
  for (const x of [p.issue.probabilite, p.buts.probabilite, ...p.scores.map(s => s.probabilite)]) assert.ok(x > 0 && x < 1)
  assert.equal(fiche.forme?.domicile.length, 5)
  assert.equal(fiche.resultat.statut, 'non_evalue')
  assert.equal(interne?.issue, '1')
})

test('Synthèse : refuse un chiffre inventé et les promesses, accepte les chiffres de la fiche', () => {
  const { fiche } = construireFiche(rencontre(matchs(10, 2, 0), matchs(10, 0, 2)), ctx, { nom: 's', nomCotes: 'c' })
  const pct = Math.round(fiche.pronostics!.issue.probabilite * 100)
  assert.ok(chiffresAutorises(fiche).has(String(pct)))
  const bon = 'Alpha affiche une belle série et le modèle lui donne ' + pct + ' % de réussite sur ce choix. Beta traverse une période difficile.'
  assert.equal(valider(bon, fiche), true)
  assert.equal(valider(bon.replace(String(pct), '97'), fiche), false)
  assert.equal(valider('Alpha va gagner, c’est garanti à coup sûr. Beta ne fera rien du tout ici.', fiche), false)
  assert.equal(valider('Trop court.', fiche), false)
})

test('Synthèse : Gemini utilisé si valide, repli sans IA sinon (et si l’appel échoue)', async () => {
  const { fiche } = construireFiche(rencontre(matchs(10, 2, 0), matchs(10, 0, 2)), ctx, { nom: 's', nomCotes: 'c' })
  const pct = Math.round(fiche.pronostics!.issue.probabilite * 100)
  const reponse = (texte: string) => (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: texte }] } }] }))) as typeof fetch
  const valide = 'Alpha domine ses derniers matchs, et le modèle retient ce choix à ' + pct + ' %. Beta manque de régularité en ce moment.'
  assert.equal(await produireSynthese(fiche, { GEMINI_API_KEY: 'k' }, reponse(valide)), valide)
  const invente = 'Alpha domine ses derniers matchs avec 412 buts marqués cette saison. Beta manque de régularité en ce moment.'
  assert.equal(await produireSynthese(fiche, { GEMINI_API_KEY: 'k' }, reponse(invente)), syntheseModele(fiche))
  const panne = (async () => { throw new Error('réseau') }) as typeof fetch
  assert.equal(await produireSynthese(fiche, { GEMINI_API_KEY: 'k' }, panne), syntheseModele(fiche))
  assert.equal(await produireSynthese(fiche, {}), syntheseModele(fiche)) // pas de clé
})
