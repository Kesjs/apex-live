import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyserMatch, construireDossier, construireOptions, lireChoix } from '../src/engine/analyse.ts'
import { construireFiche } from '../src/engine/fiche.ts'
import { butsAttendus } from '../src/engine/force.ts'
import { matrice } from '../src/engine/poisson.ts'
import { evaluerFiche } from '../src/evaluate.ts'
import type { Contexte, MatchPasse, Rencontre } from '../src/types.ts'

const ctx: Contexte = { competition: 'T', moy_buts_domicile: 1.5, moy_buts_exterieur: 1.2, moy_bonus: {} }
const matchs = (n: number, pour: number, contre: number): MatchPasse[] =>
  Array.from({ length: n }, (_, i) => ({ date: '2026-09-' + String(28 - i).padStart(2, '0'), domicile: i % 2 === 0, buts_pour: pour, buts_contre: contre }))
const rencontre: Rencontre = {
  match_id: 'x', date_heure: '2026-10-12T17:00:00Z', competition: 'T', cotes: {},
  domicile: { id: 'a', nom: 'Alpha', matchs: matchs(10, 2, 0) }, exterieur: { id: 'b', nom: 'Beta', matchs: matchs(10, 0, 2) },
}
const base = construireFiche(rencontre, ctx, { nom: 's', nomCotes: 'c' })
const { lh, la } = butsAttendus(rencontre.domicile.matchs, rencontre.exterieur.matchs, ctx)
const options = construireOptions(matrice(lh, la), 'Alpha', 'Beta', {})
const dossier = construireDossier(rencontre, ctx, lh, la, options)
const choisi = options.scores.find(s => { const [d, e] = s.score.split('-').map(Number); return d > e && d + e > 1.5 })!.score
const ANALYSE =
  'Alpha affiche une forme très solide avec une moyenne de 2 buts marqués et aucun but encaissé sur ses 10 derniers matchs. Beta ne marque pas et en concède 2 par match en moyenne, ce qui renforce le favori. ' +
  'Un succès net d’Alpha ressort donc comme le scénario le plus cohérent. Le principal risque reste un match fermé où un seul but suffit.'
const choix = (extra = {}) =>
  JSON.stringify({ issue: { cle: '1', raison: 'Alpha domine la forme et concède très peu de buts.' }, buts: { cle: 'O1.5', raison: 'Alpha marque en moyenne 2 buts par match.' }, score: choisi, analyse: ANALYSE, ...extra })
const reponse = (texte: string) => (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: texte }] } }] }), { status: 200 })) as unknown as typeof fetch

test('Analyse IA : un choix valide remplace le choix mécanique et reste évaluable', async () => {
  const s = await analyserMatch(rencontre, ctx, base, { GEMINI_API_KEY: 'k' }, reponse(choix()))
  assert.ok(s)
  assert.equal(s.interne?.issue, '1')
  assert.equal(s.fiche.pronostics?.issue.court, '1')
  assert.equal(s.fiche.synthese, ANALYSE)
  assert.equal(s.fiche.pronostics?.scores.length, 1)
  assert.equal(s.fiche.pronostics?.scores[0].score, choisi)
  assert.equal(evaluerFiche(s.interne, { match_id: 'x', statut: 'termine', score_domicile: 2, score_exterieur: 0 })?.issue, true)
})

test('Analyse IA : une clé hors liste est refusée', () => {
  assert.equal(lireChoix(choix({ issue: { cle: 'INVENTE', raison: 'Alpha domine la forme et concède peu.' } }), options, dossier), null)
})

test('Analyse IA : un score incohérent avec les choix est refusé', () => {
  const contraire = options.scores.find(s => { const [d, e] = s.score.split('-').map(Number); return e > d })
  if (contraire) assert.equal(lireChoix(choix({ score: contraire.score }), options, dossier), null)
  assert.equal(lireChoix(choix({ score: '9-9' }), options, dossier), null)
})

test('Analyse IA : chiffre inventé, blessure ou promesse → refus', () => {
  assert.equal(lireChoix(choix({ analyse: ANALYSE + ' Alpha gagne 87.3 % de ses matchs.' }), options, dossier), null)
  assert.equal(lireChoix(choix({ analyse: ANALYSE + ' Le meilleur buteur de Beta est blessé.' }), options, dossier), null)
  assert.equal(lireChoix(choix({ analyse: ANALYSE + ' Victoire garantie.' }), options, dossier), null)
})

test('Analyse IA : sans clé ou en cas d’erreur, le moteur garde la main', async () => {
  assert.equal(await analyserMatch(rencontre, ctx, base, {}), null)
  const panne = (async () => new Response('', { status: 500 })) as unknown as typeof fetch
  assert.equal(await analyserMatch(rencontre, ctx, base, { GEMINI_API_KEY: 'k' }, panne), null)
})
