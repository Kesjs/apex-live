import type { CategorieBonus } from '../../src/domain/contracts.ts'

export type { CategorieBonus }
export const CATEGORIES: CategorieBonus[] = ['cartons', 'corners', 'fautes', 'hors-jeu']

/** Un match déjà joué par une équipe (entrée du moteur). */
export interface MatchPasse {
  /** AAAA-MM-JJ */
  date: string
  domicile: boolean
  buts_pour: number
  buts_contre: number
  /** Totaux du match (les deux équipes ensemble). Absents si la source ne les fournit pas. */
  bonus?: Partial<Record<CategorieBonus, number>>
}

export interface Equipe {
  id: string
  nom: string
  matchs: MatchPasse[]
}

/**
 * Cotes disponibles pour une rencontre. Clés :
 *  '1' 'N' '2' '1X' 'X2' '12'            issue
 *  'O1.5' 'O2.5' 'U2.5' 'U3.5' 'BTTS'    buts
 *  'score:2-1'                            scores exacts
 *  'bonus:cartons:O3.5'                   bonus
 */
export type Cotes = Record<string, number>

export interface Rencontre {
  match_id: string
  date_heure: string
  competition: string
  domicile: Equipe
  exterieur: Equipe
  logos?: { domicile?: string; exterieur?: string }
  cotes: Cotes
  cotes_observees_le?: string
}

/** Moyennes de la compétition, nécessaires pour situer une équipe. */
export interface Contexte {
  competition: string
  moy_buts_domicile: number
  moy_buts_exterieur: number
  /** Moyenne par match (les deux équipes ensemble). */
  moy_bonus: Partial<Record<CategorieBonus, number>>
}

export interface ResultatReel {
  match_id: string
  statut: 'termine' | 'annule' | 'a_venir'
  score_domicile?: number
  score_exterieur?: number
  bonus?: Partial<Record<CategorieBonus, number>>
}

/** Une source de données (démo, fichiers JSON, ou une API réelle à écrire). */
export interface Source {
  readonly nom: string
  readonly nomCotes: string
  rencontres(jour: string): Promise<Rencontre[]>
  /** `jour` (AAAA-MM-JJ) : n'utiliser que les matchs antérieurs à ce jour (rétro-calcul sans triche). */
  contexte(competition: string, jour?: string): Promise<Contexte>
  resultat(matchId: string): Promise<ResultatReel | null>
  /** Variante groupée facultative, utilisée pour économiser les appels API. */
  resultats?(matchIds: string[]): Promise<Map<string, ResultatReel>>
}

/** Ce que le moteur retient de chaque fiche pour pouvoir l'évaluer après le match. */
export interface Interne {
  issue: string
  buts: string
  bonus: { categorie: CategorieBonus; ligne: number } | null
  scores: string[]
}
