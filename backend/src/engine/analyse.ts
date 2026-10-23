import type { Prediction } from '../../../src/domain/contracts.ts'
import type { Contexte, Cotes, Interne, MatchPasse, Rencontre } from '../types.ts'
import { jugerButs, jugerIssue } from '../evaluate.ts'
import { butsAttendus, forme, NB_MATCHS, recents } from './force.ts'
import { CANDIDATS } from './marches.ts'
import { issue as issuePoisson, matrice, meilleursScores } from './poisson.ts'
import type { Matrice } from './poisson.ts'
import { valeur } from './value.ts'

/**
 * Analyse par l'IA : le moteur calcule les probabilités (Poisson) et propose des options ;
 * l'IA CHOISIT parmi ces options et rédige un vrai raisonnement. Tout ce qu'elle renvoie est
 * vérifié (choix dans la liste, scores cohérents, chiffres issus du dossier, pas d'infos inventées).
 * Si quelque chose ne va pas, on garde le choix mécanique du moteur.
 */

type Fetch = typeof fetch
type Sortie = { fiche: Prediction; interne: Interne | null }

const r1 = (n: number): number => Math.round(n * 10) / 10
const r2 = (n: number): number => Math.round(n * 100) / 100
const pct = (p: number): number => Math.round(p * 100)

export interface OptionIssue { cle: string; selection: string; proba: number; cote?: number }
export interface OptionButs { cle: string; selection: string; court: string; proba: number; cote?: number }
export interface OptionScore { score: string; proba: number; cote?: number }
export interface Options { issues: OptionIssue[]; buts: OptionButs[]; scores: OptionScore[] }

export function construireOptions(m: Matrice, nomD: string, nomE: string, cotes: Cotes): Options {
  const p = issuePoisson(m)
  const brut: OptionIssue[] = [
    { cle: '1', selection: '1 · ' + nomD + ' gagne', proba: p.p1 },
    { cle: 'N', selection: 'N · Match nul', proba: p.pN },
    { cle: '2', selection: '2 · ' + nomE + ' gagne', proba: p.p2 },
    { cle: '1X', selection: '1X · ' + nomD + ' ou nul', proba: p.p1 + p.pN },
    { cle: 'X2', selection: 'X2 · ' + nomE + ' ou nul', proba: p.pN + p.p2 },
    { cle: '12', selection: '12 · Pas de match nul', proba: p.p1 + p.p2 },
  ]
  const issues = brut.map(o => (cotes[o.cle] !== undefined ? { ...o, cote: cotes[o.cle] } : o))
  const buts = CANDIDATS.map(c => {
    const o: OptionButs = { cle: c.cle, selection: c.selection, court: c.court, proba: c.proba(m) }
    if (cotes[c.cle] !== undefined) o.cote = cotes[c.cle]
    return o
  })
  const scores = meilleursScores(m, 12).map(s => {
    const o: OptionScore = { score: s.score, proba: s.probabilite }
    const c = cotes['score:' + s.score]
    if (c !== undefined) o.cote = c
    return o
  })
  return { issues, buts, scores }
}

const moy = (v: number[]): number => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0)

function resume(matchs: MatchPasse[], lieu: 'domicile' | 'exterieur') {
  const r = recents(matchs, NB_MATCHS)
  const lieuMatchs = r.filter(x => x.domicile === (lieu === 'domicile'))
  return {
    nb_matchs: r.length,
    forme_5: forme(matchs).join(' '),
    derniers_scores: recents(matchs, 5).map(x => `${x.buts_pour}-${x.buts_contre} (${x.domicile ? 'dom' : 'ext'})`),
    buts_marques_moy: r1(moy(r.map(x => x.buts_pour))),
    buts_encaisses_moy: r1(moy(r.map(x => x.buts_contre))),
    ...(lieuMatchs.length >= 3
      ? {
          [lieu === 'domicile' ? 'a_domicile' : 'a_l_exterieur']: {
            nb_matchs: lieuMatchs.length,
            buts_marques_moy: r1(moy(lieuMatchs.map(x => x.buts_pour))),
            buts_encaisses_moy: r1(moy(lieuMatchs.map(x => x.buts_contre))),
          },
        }
      : {}),
  }
}

export function construireDossier(r: Rencontre, ctx: Contexte, lh: number, la: number, o: Options) {
  return {
    match: r.domicile.nom + ' - ' + r.exterieur.nom,
    competition: r.competition,
    moyenne_ligue: { buts_domicile: r1(ctx.moy_buts_domicile), buts_exterieur: r1(ctx.moy_buts_exterieur) },
    buts_attendus_modele: { domicile: r1(lh), exterieur: r1(la) },
    domicile: { equipe: r.domicile.nom, ...resume(r.domicile.matchs, 'domicile') },
    exterieur: { equipe: r.exterieur.nom, ...resume(r.exterieur.matchs, 'exterieur') },
    options_issue: o.issues.map(x => ({ cle: x.cle, libelle: x.selection, probabilite_pct: pct(x.proba), ...(x.cote ? { cote: x.cote } : {}) })),
    options_buts: o.buts.map(x => ({ cle: x.cle, libelle: x.selection, probabilite_pct: pct(x.proba), ...(x.cote ? { cote: x.cote } : {}) })),
    options_scores: o.scores.map(x => ({ score: x.score, probabilite_pct: pct(x.proba) })),
  }
}

export function consigne(dossier: unknown): string {
  return (
    "Tu es analyste football pour une plateforme de pronostics. Voici le dossier d'un match : statistiques des deux équipes et options calculées par un modèle statistique (probabilités en %).\n" +
    'Ta mission : CHOISIR un pronostic par pilier parmi les options proposées, puis rédiger ton raisonnement.\n\n' +
    'Règles :\n' +
    "- issue.cle doit être une clé de options_issue ; buts.cle une clé de options_buts ; score = UN seul score exact pris dans options_scores.\n" +
    "- Ne prends pas mécaniquement l'option la plus probable : pèse la probabilité, la forme, l'efficacité offensive/défensive, l'effet domicile/extérieur. Une double chance ou un « plus de 1,5 » très probable n'est pas toujours le meilleur choix. Si une cote est fournie, évite celles inférieures à 1,15.\n" +
    "- Le score choisi doit être cohérent avec tes choix d'issue ET de buts (il doit réaliser les deux).\n" +
    '- issue.raison et buts.raison : une phrase de 160 caractères maximum chacune.\n' +
    '- analyse : 3 à 5 phrases (400 à 900 caractères) qui comparent les deux équipes (forme, attaque, défense, domicile/extérieur), expliquent pourquoi tes choix sont cohérents entre eux et nomment le principal risque.\n' +
    "- N'utilise QUE les faits du dossier. N'invente aucune blessure, suspension, composition, enjeu, météo ni statistique. Aucun chiffre absent du dossier. Ne promets rien (« garanti », « certain »).\n" +
    '- Écris en français, ton neutre.\n\n' +
    'Réponds uniquement par ce JSON : {"issue":{"cle":"","raison":""},"buts":{"cle":"","raison":""},"score":"","analyse":""}\n\n' +
    'Dossier :\n' +
    JSON.stringify(dossier)
  )
}

const nombres = (t: string): string[] => (t.match(/\d+(?:[.,]\d+)?/g) ?? []).map(n => n.replace(',', '.'))
const INTERDITS = /garanti|certain|sûr à 100|ne peut pas perdre|blessé|blessure|suspendu|suspension|absen[ct]|forfait|composition|météo|arbitre|mercato|entraîneur/i

/** Chiffres autorisés : ceux du dossier, plus les petits entiers (0 à 10) utilisés en langage courant. */
function chiffreOk(n: string, permis: Set<string>): boolean {
  if (permis.has(n)) return true
  return /^\d+$/.test(n) && Number(n) <= 10
}

export function texteValide(t: unknown, min: number, max: number, permis: Set<string>): t is string {
  if (typeof t !== 'string') return false
  const s = t.trim()
  if (s.length < min || s.length > max || INTERDITS.test(s)) return false
  return nombres(s).every(n => chiffreOk(n, permis))
}

interface Choix { issue: { cle: string; raison: string }; buts: { cle: string; raison: string }; score: string; analyse: string }

export function lireChoix(brut: string, o: Options, dossier: unknown): Choix | null {
  let c: Partial<Choix>
  try {
    c = JSON.parse(brut.replace(/```json|```/g, '').trim()) as Partial<Choix>
  } catch {
    return null
  }
  const permis = new Set(nombres(JSON.stringify(dossier)))
  const oi = o.issues.find(x => x.cle === c.issue?.cle)
  const ob = o.buts.find(x => x.cle === c.buts?.cle)
  if (!oi || !ob || !c.issue || !c.buts) return null
  if (typeof c.score !== 'string' || !o.scores.some(x => x.score === c.score)) return null
  if (!texteValide(c.issue.raison, 15, 200, permis) || !texteValide(c.buts.raison, 15, 200, permis)) return null
  if (!texteValide(c.analyse, 200, 1000, permis)) return null
  const [d, e] = c.score.split('-').map(Number)
  if (!jugerIssue(oi.cle, d, e) || !jugerButs(ob.cle, d, e)) return null
  return c as Choix
}

export function appliquerChoix(base: Sortie, r: Rencontre, o: Options, c: Choix): Sortie | null {
  const p = base.fiche.pronostics
  if (!p) return null
  const oi = o.issues.find(x => x.cle === c.issue.cle)!
  const ob = o.buts.find(x => x.cle === c.buts.cle)!
  const cand = CANDIDATS.find(x => x.cle === ob.cle)!
  const echantillon = [...recents(r.domicile.matchs, NB_MATCHS), ...recents(r.exterieur.matchs, NB_MATCHS)]
  const ok = echantillon.filter(cand.vrai).length
  const issue = { selection: oi.selection, court: oi.cle, probabilite: r2(oi.proba), justification: c.issue.raison.trim(), ...(oi.cote ? { cote: oi.cote } : {}) }
  const buts = {
    selection: ob.selection,
    court: ob.court,
    probabilite: r2(ob.proba),
    frequence: ok + ' sur ' + echantillon.length + ' matchs combinés',
    justification: c.buts.raison.trim(),
    ...(ob.cote ? { cote: ob.cote } : {}),
  }
  const choisi = o.scores.find(x => x.score === c.score)!
  const scores = [{ score: choisi.score, probabilite: r2(choisi.proba), ...(choisi.cote ? { cote: choisi.cote } : {}) }]
  const val = valeur(
    [
      { pilier: 'issue', cle: oi.cle, probabilite: issue.probabilite },
      { pilier: 'buts', cle: ob.cle, probabilite: buts.probabilite },
    ],
    r.cotes,
  )
  return {
    fiche: { ...base.fiche, pronostics: { ...p, issue, buts, scores }, value: val, synthese: c.analyse.trim() },
    interne: { issue: oi.cle, buts: ob.cle, bonus: base.interne?.bonus ?? null, scores: [choisi.score] },
  }
}

async function appelGemini(prompt: string, opts: { cle: string; modele: string; fetchImpl?: Fetch }): Promise<string | null> {
  const appel = opts.fetchImpl ?? fetch
  const rep = await appel('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(opts.modele) + ':generateContent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': opts.cle },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 3000, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 1024 } },
    }),
  })
  if (!rep.ok) return null
  const data = (await rep.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
  return (data.candidates?.[0]?.content?.parts ?? []).map(x => x.text ?? '').join('') || null
}

/** Renvoie la fiche choisie et rédigée par l'IA, ou null (pas de clé, erreur, réponse refusée) → le moteur garde la main. */
export async function analyserMatch(
  r: Rencontre,
  ctx: Contexte,
  base: Sortie,
  env: Record<string, string | undefined>,
  fetchImpl?: Fetch,
): Promise<Sortie | null> {
  const cle = env.GEMINI_API_KEY
  if (!cle || !base.fiche.pronostics) return null
  const { lh, la } = butsAttendus(r.domicile.matchs, r.exterieur.matchs, ctx)
  const options = construireOptions(matrice(lh, la), r.domicile.nom, r.exterieur.nom, r.cotes)
  const dossier = construireDossier(r, ctx, lh, la, options)
  for (let essai = 0; essai < 2; essai++) {
    try {
      const brut = await appelGemini(consigne(dossier), { cle, modele: env.GEMINI_MODEL || 'gemini-2.5-flash', fetchImpl })
      const choix = brut ? lireChoix(brut, options, dossier) : null
      if (choix) return appliquerChoix(base, r, options, choix)
    } catch {
      /* nouvel essai, puis repli sur le moteur */
    }
  }
  return null
}
