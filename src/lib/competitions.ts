/** Pays (drapeau) et rang d'affichage des compétitions : les plus importantes en premier. */
type Infos = { drapeau: string; rang: number }

const CONNUES: Record<string, Infos> = {
  'UEFA Champions League': { drapeau: '🇪🇺', rang: 0 },
  'Premier League': { drapeau: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rang: 1 },
  'Primera Division': { drapeau: '🇪🇸', rang: 2 },
  'Serie A': { drapeau: '🇮🇹', rang: 3 },
  Bundesliga: { drapeau: '🇩🇪', rang: 4 },
  'Ligue 1': { drapeau: '🇫🇷', rang: 5 },
  'Primeira Liga': { drapeau: '🇵🇹', rang: 6 },
  Eredivisie: { drapeau: '🇳🇱', rang: 7 },
  Championship: { drapeau: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rang: 8 },
}

const INCONNUE: Infos = { drapeau: '⚽', rang: 99 }

export function infosCompetition(nom: string): Infos {
  return CONNUES[nom] ?? INCONNUE
}

/** Trie des groupes [compétition, éléments] : grandes compétitions d'abord, les autres par ordre alphabétique. */
export function trierCompetitions<T>(groupes: Array<[string, T]>): Array<[string, T]> {
  return [...groupes].sort(([a], [b]) => {
    const d = infosCompetition(a).rang - infosCompetition(b).rang
    return d !== 0 ? d : a.localeCompare(b, 'fr')
  })
}
