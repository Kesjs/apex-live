import type { Prediction } from '../domain/contracts'
import type { Filtre } from '../components/MatchRow'

/** Meilleure fiche du jour pour la vedette : celle dont issue + buts sont les plus probables. */
export function vedette(fiches: Prediction[]): Prediction | null {
  let meilleure: Prediction | null = null
  let score = -1
  for (const fiche of fiches) {
    if (!fiche.pronostics) continue
    const s = fiche.pronostics.issue.probabilite + fiche.pronostics.buts.probabilite
    if (s > score) {
      score = s
      meilleure = fiche
    }
  }
  return meilleure
}

/** Applique le filtre par type de pronostic et classe du plus probable au moins probable. */
export function filtrer(fiches: Prediction[], filtre: Filtre): Prediction[] {
  if (filtre === 'tous') return fiches
  const avec = fiches.filter(f => f.pronostics !== null && (filtre !== 'bonus' || f.pronostics.bonus !== null))
  const valeur = (f: Prediction): number => {
    const p = f.pronostics
    if (!p) return 0
    if (filtre === 'issue') return p.issue.probabilite
    if (filtre === 'buts') return p.buts.probabilite
    if (filtre === 'scores') return p.scores[0]?.probabilite ?? 0
    return 0
  }
  if (filtre === 'bonus') return avec
  return [...avec].sort((a, b) => valeur(b) - valeur(a))
}

export function parCompetition(fiches: Prediction[]): Array<[string, Prediction[]]> {
  const groupes = new Map<string, Prediction[]>()
  for (const fiche of fiches) {
    const liste = groupes.get(fiche.competition) ?? []
    liste.push(fiche)
    groupes.set(fiche.competition, liste)
  }
  return [...groupes.entries()]
}

/** Les n pronostics « buts » les plus probables du jour. */
export function lesPlusSurs(fiches: Prediction[], n = 3): Prediction[] {
  return fiches
    .filter(f => f.pronostics !== null)
    .sort((a, b) => (b.pronostics?.buts.probabilite ?? 0) - (a.pronostics?.buts.probabilite ?? 0))
    .slice(0, n)
}
