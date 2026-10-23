import type { LettreForme } from '../../../src/domain/contracts.ts'
import type { Contexte, MatchPasse } from '../types.ts'

export const NB_MATCHS = 5
// Il y a toujours un pronostic : avec peu (ou pas) de matchs récents, le coefficient de prudence
// ramène l'équipe vers la moyenne de la ligue, et la fiche est marquée « données limitées ».
export const MIN_MATCHS = NB_MATCHS
const DECROISSANCE = 0.88
const PRUDENCE = 4 // 5 matchs récents pèsent ~50 % dans l'estimation, le reste vient de la moyenne de la ligue

export function recents(matchs: MatchPasse[], n = NB_MATCHS): MatchPasse[] {
  return [...matchs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).slice(0, n)
}

/** Moyenne pondérée (les matchs récents pèsent plus), ramenée vers la moyenne de la ligue si peu de matchs. */
function rapport(valeurs: number[], moyenneLigue: number): number {
  let somme = 0
  let poids = 0
  valeurs.forEach((v, i) => {
    const w = Math.pow(DECROISSANCE, i)
    somme += w * (v / moyenneLigue)
    poids += w
  })
  return (somme + PRUDENCE * 1) / (poids + PRUDENCE)
}

const borne = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x))

/** Buts attendus (domicile, extérieur) pour la rencontre. */
export function butsAttendus(dom: MatchPasse[], ext: MatchPasse[], ctx: Contexte): { lh: number; la: number } {
  const moy = (ctx.moy_buts_domicile + ctx.moy_buts_exterieur) / 2
  const d = recents(dom)
  const e = recents(ext)
  const attD = rapport(d.map(m => m.buts_pour), moy)
  const defD = rapport(d.map(m => m.buts_contre), moy)
  const attE = rapport(e.map(m => m.buts_pour), moy)
  const defE = rapport(e.map(m => m.buts_contre), moy)
  return {
    lh: borne(ctx.moy_buts_domicile * attD * defE, 0.2, 4.5),
    la: borne(ctx.moy_buts_exterieur * attE * defD, 0.2, 4.5),
  }
}

/** Les 5 derniers résultats, du plus ancien au plus récent. */
export function forme(matchs: MatchPasse[]): LettreForme[] {
  return recents(matchs, 5)
    .reverse()
    .map(m => (m.buts_pour > m.buts_contre ? 'V' : m.buts_pour === m.buts_contre ? 'N' : 'D'))
}

export const victoires = (f: LettreForme[]): number => f.filter(l => l === 'V').length
