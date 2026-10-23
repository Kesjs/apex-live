/**
 * Contrats de données Apex.
 *
 * C'est la frontière entre le front-end et le back-end : le back-end doit
 * renvoyer exactement ces formes (voir API-CONTRACT.md). Le front ne calcule
 * aucun pronostic, il affiche uniquement ce qu'il reçoit.
 *
 * Les probabilités sont des nombres entre 0 et 1 (0.82 = 82 %).
 */

export type PilierId = 'issue' | 'buts' | 'bonus' | 'scores'

export type CategorieBonus = 'cartons' | 'corners' | 'fautes' | 'hors-jeu'

export type NiveauRisque = 'faible' | 'moyen' | 'eleve'

export type LettreForme = 'V' | 'N' | 'D'

/** Pilier 1 — issue du match (victoire ou double chance). */
export interface PronosticIssue {
  /** Texte complet, ex. « 1X · Northbridge FC ou nul ». */
  selection: string
  /** Version courte pour les listes, ex. « 1X ». Repli : selection. */
  court?: string
  probabilite: number
  cote?: number
  justification?: string
}

/** Pilier 2 — nombre de buts (plus de 1.5, plus de 2.5, les deux marquent…). */
export interface PronosticButs {
  selection: string
  /** Ex. « +1.5 ». Repli : selection. */
  court?: string
  probabilite: number
  cote?: number
  /** Ex. « 9 sur 10 matchs combinés ». */
  frequence?: string
  justification?: string
}

/** Pilier 3 — bonus (cartons, corners, fautes, hors-jeu). Peut être absent. */
export interface PronosticBonus {
  categorie: CategorieBonus
  selection: string
  /** Ex. « Cartons +3.5 ». Repli : selection. */
  court?: string
  cote?: number
  justification: string
  /** Valeur observée pour les deux équipes, ex. 4.6 cartons par match. */
  valeur_observee?: number
  /** Moyenne de la ligue pour comparer, ex. 3.9. */
  moyenne_ligue?: number
}

/** Pilier 4 — un score exact proposé. */
export interface PronosticScore {
  /** Ex. « 2-1 ». */
  score: string
  probabilite: number
  cote?: number
}

export interface Pronostics {
  issue: PronosticIssue
  buts: PronosticButs
  /** null = aucun signal assez net pour proposer un bonus. */
  bonus: PronosticBonus | null
  /** Le score exact le plus probable (un seul élément). */
  scores: PronosticScore[]
}

/** Écart entre la probabilité du moteur et celle déduite de la cote. */
export interface Valeur {
  pilier: PilierId
  /** Ex. 0.06 = 6 points de pourcentage. */
  ecart: number
}

export interface MetaFiche {
  /** Date de génération de la fiche (ISO 8601). */
  genere_le: string
  version_moteur: string
  source_stats: string
  source_cotes: string
  /** Moment où les cotes ont été relevées (ISO 8601). */
  cotes_observees_le?: string
  /** true = fiche calculée après coup, avec uniquement les données antérieures au match (historique de départ). */
  retrocalcul?: boolean
  /** true = au moins une équipe a moins de 5 matchs récents : pronostic donné, mais plus fragile. */
  donnees_limitees?: boolean
  /** Comparaison facultative avec API-Football, uniquement si la saison est accessible et les données sont actuelles. */
  prediction_externe?: {
    source: 'api-football'
    issue: { domicile: number; nul: number; exterieur: number }
    recuperee_le: string
  }
}

export interface ResultatFiche {
  statut: 'non_evalue' | 'evalue' | 'annule'
  /** true = pronostic réussi, false = raté, null = non évalué ou sans objet. */
  issue: boolean | null
  buts: boolean | null
  bonus: boolean | null
  score: boolean | null
  /** Score final, ex. « 2-1 ». */
  score_final?: string
}

/** Statistiques utiles d'une équipe sur ses derniers matchs (5 au plus). Les parts vont de 0 à 1. */
export interface StatsEquipe {
  matchs: number
  buts_marques: number
  buts_encaisses: number
  plus_2_5: number
  deux_marquent: number
  sans_encaisser: number
  /** Derniers scores, du plus récent au plus ancien, ex. « 2-1 » (buts de l'équipe en premier). */
  derniers: string[]
}

export interface StatsMatch {
  domicile: StatsEquipe
  exterieur: StatsEquipe
  /** Buts attendus par le modèle pour cette rencontre. */
  buts_attendus: { domicile: number; exterieur: number }
  /** Moyenne de la compétition par équipe et par match, pour situer les chiffres. Facultatif. */
  moyenne_ligue?: { buts_marques: number; buts_encaisses: number }
}

export interface FormeRecente {
  domicile: LettreForme[]
  exterieur: LettreForme[]
}

/** Fiche complète d'un match. */
export interface Prediction {
  match_id: string
  /** ISO 8601 avec fuseau, ex. 2026-10-12T17:30:00Z. */
  date_heure: string
  competition: string
  equipes: { domicile: string; exterieur: string }
  /** Écussons fournis par la source quand ils sont disponibles. */
  logos?: { domicile?: string; exterieur?: string }
  /** null = données insuffisantes, aucun pronostic publié. */
  pronostics: Pronostics | null
  /** Explique pourquoi il n'y a pas de pronostic. */
  raison_absence?: string
  value?: Valeur | null
  /** Synthèse rédigée (2 à 3 phrases). */
  synthese?: string
  forme?: FormeRecente
  stats?: StatsMatch
  meta: MetaFiche
  resultat: ResultatFiche
}

export type PeriodeHistorique = '7j' | '30j' | 'saison'

export interface TauxPilier {
  reussis: number
  total: number
}

export interface JourHistorique {
  /** Date au format AAAA-MM-JJ. */
  jour: string
  matchs: Prediction[]
}

export interface Historique {
  periode: PeriodeHistorique
  mis_a_jour_le: string
  taux: Record<PilierId, TauxPilier>
  jours: JourHistorique[]
}

export interface NewsArticle {
  id: string
  titre: string
  resume: string
  url: string
  source: string
  publie_le: string
  image_url?: string
  categorie: 'football' | 'champions-league' | 'europa-league'
}

/** Ce que le front attend de la source de données (démo ou vrai back-end). */
export interface ApexProvider {
  /** Fiches d'une journée (AAAA-MM-JJ). Tableau vide si aucun match. */
  listMatches(jour: string): Promise<Prediction[]>
  /** null si le match n'existe pas. */
  getMatch(matchId: string): Promise<Prediction | null>
  getHistory(periode: PeriodeHistorique): Promise<Historique>
  getNews(categorie?: NewsArticle['categorie']): Promise<NewsArticle[]>
  /** Libellé affiché dans l'interface quand la source n'est pas réelle. */
  readonly modeLabel?: string
}
