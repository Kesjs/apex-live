import type { LettreForme, PronosticButs, PronosticIssue, PronosticScore } from '../../../src/domain/contracts.ts'
import type { Cotes, MatchPasse } from '../types.ts'
import { NB_MATCHS, recents, victoires } from './force.ts'
import { lesDeuxMarquent, meilleursScores, plusDe } from './poisson.ts'
import type { Matrice } from './poisson.ts'

const r2 = (n: number): number => Math.round(n * 100) / 100
const COTE_MIN = 1.15

export function choisirIssue(
  p: { p1: number; pN: number; p2: number },
  nomD: string,
  nomE: string,
  formeD: LettreForme[],
  formeE: LettreForme[],
  cotes: Cotes,
): { pronostic: PronosticIssue; cle: string } {
  const domFavori = p.p1 >= p.p2
  const vFav = victoires(domFavori ? formeD : formeE)
  const vAutre = victoires(domFavori ? formeE : formeD)
  const nom = domFavori ? nomD : nomE
  const autre = domFavori ? nomE : nomD

  let cle: string
  let selection: string
  let probabilite: number
  let justification: string

  // 1. Victoire nette Domicile (1)
  if (p.p1 >= 0.46 && (p.p1 - p.p2 >= 0.08 || p.p1 >= 0.52)) {
    cle = '1'
    probabilite = p.p1
    selection = '1 · ' + nomD + ' gagne'
    justification = nomD + ' : ' + victoires(formeD) + ' victoire(s) récentes ; avantage notable à domicile.'
  }
  // 2. Victoire nette Extérieur (2)
  else if (p.p2 >= 0.42 && (p.p2 - p.p1 >= 0.06 || p.p2 >= 0.48)) {
    cle = '2'
    probabilite = p.p2
    selection = '2 · ' + nomE + ' gagne'
    justification = nomE + ' : ' + victoires(formeE) + ' victoire(s) récentes ; dynamique supérieure en déplacement.'
  }
  // 3. Match ouvert sans nul (12)
  else if (p.pN <= 0.22 && p.p1 >= 0.35 && p.p2 >= 0.35) {
    cle = '12'
    probabilite = p.p1 + p.p2
    selection = '12 · Victoire de l\'une des équipes'
    justification = 'Rencontre ouverte entre deux attaques ; probabilité de match nul très faible (' + Math.round(p.pN * 100) + ' %).'
  }
  // 4. Double chance Domicile (1X)
  else if (domFavori) {
    cle = '1X'
    probabilite = p.p1 + p.pN
    selection = '1X · ' + nom + ' ou nul'
    justification = nom + ' : ' + vFav + ' victoire(s) sur ses 5 derniers matchs ; ' + autre + ' : ' + vAutre + '.'
  }
  // 5. Double chance Extérieur (X2)
  else {
    cle = 'X2'
    probabilite = p.pN + p.p2
    selection = 'X2 · ' + nom + ' ou nul'
    justification = nom + ' : ' + vFav + ' victoire(s) sur ses 5 derniers matchs ; ' + autre + ' : ' + vAutre + '.'
  }

  const pronostic: PronosticIssue = {
    selection,
    court: cle,
    probabilite: r2(probabilite),
    justification,
  }
  if (cotes[cle] !== undefined) pronostic.cote = cotes[cle]
  return { pronostic, cle }
}

export interface CandidatButs {
  cle: string
  selection: string
  court: string
  proba: (m: Matrice) => number
  vrai: (x: MatchPasse) => boolean
}

const total = (x: MatchPasse): number => x.buts_pour + x.buts_contre

export const CANDIDATS: CandidatButs[] = [
  { cle: 'O1.5', selection: 'Plus de 1,5 but', court: '+1.5', proba: m => plusDe(m, 1.5), vrai: x => total(x) > 1.5 },
  { cle: 'O2.5', selection: 'Plus de 2,5 buts', court: '+2.5', proba: m => plusDe(m, 2.5), vrai: x => total(x) > 2.5 },
  { cle: 'U2.5', selection: 'Moins de 2,5 buts', court: '-2.5', proba: m => 1 - plusDe(m, 2.5), vrai: x => total(x) < 2.5 },
  { cle: 'U3.5', selection: 'Moins de 3,5 buts', court: '-3.5', proba: m => 1 - plusDe(m, 3.5), vrai: x => total(x) < 3.5 },
  { cle: 'BTTS', selection: 'Les deux équipes marquent', court: 'BTTS', proba: m => lesDeuxMarquent(m), vrai: x => x.buts_pour > 0 && x.buts_contre > 0 },
]

/** Retient le marché de buts le plus probable (hors cotes trop basses pour avoir un intérêt). */
export function choisirButs(m: Matrice, dom: MatchPasse[], ext: MatchPasse[], cotes: Cotes): { pronostic: PronosticButs; cle: string } {
  const evalues = CANDIDATS.map(c => ({ c, p: c.proba(m) })).sort((a, b) => b.p - a.p)
  const interessants = evalues.filter(e => cotes[e.c.cle] === undefined || cotes[e.c.cle] >= COTE_MIN)
  const choix = (interessants.length ? interessants : evalues)[0]
  const echantillon = [...recents(dom, NB_MATCHS), ...recents(ext, NB_MATCHS)]
  const ok = echantillon.filter(choix.c.vrai).length
  const pronostic: PronosticButs = {
    selection: choix.c.selection,
    court: choix.c.court,
    probabilite: r2(choix.p),
    frequence: ok + ' sur ' + echantillon.length + ' matchs combinés',
  }
  if (cotes[choix.c.cle] !== undefined) pronostic.cote = cotes[choix.c.cle]
  return { pronostic, cle: choix.c.cle }
}

export function choisirScores(m: Matrice, cotes: Cotes): PronosticScore[] {
  return meilleursScores(m, 1).map(s => {
    const out: PronosticScore = { score: s.score, probabilite: r2(s.probabilite) }
    const c = cotes['score:' + s.score]
    if (c !== undefined) out.cote = c
    return out
  })
}
