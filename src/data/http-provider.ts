import type { ApexProvider, Historique, NewsArticle, PeriodeHistorique, Prediction } from '../domain/contracts'

/**
 * Source de données réelle : appelle ton back-end.
 *
 * Endpoints attendus (voir API-CONTRACT.md) :
 *   GET {base}/api/matchs?date=AAAA-MM-JJ        -> Prediction[]
 *   GET {base}/api/matchs/:id                    -> Prediction  (404 si inconnu)
 *   GET {base}/api/historique?periode=7j|30j|saison -> Historique
 *
 * `base` vient de VITE_API_URL (vide = même origine, pratique avec le proxy
 * de Vite en développement).
 */

const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? ''

async function requete<T>(chemin: string): Promise<{ status: number; data: T | null }> {
  let reponse: Response
  try {
    reponse = await fetch(base + chemin, { headers: { Accept: 'application/json' } })
  } catch {
    throw new Error('Impossible de joindre le serveur Apex.')
  }
  if (reponse.status === 404) return { status: 404, data: null }
  if (!reponse.ok) throw new Error('Le serveur Apex a répondu avec une erreur (' + reponse.status + ').')
  try {
    return { status: reponse.status, data: (await reponse.json()) as T }
  } catch {
    throw new Error('Réponse du serveur Apex illisible.')
  }
}

export const httpProvider: ApexProvider = {
  async listMatches(jour) {
    const { data } = await requete<Prediction[]>('/api/matchs?date=' + encodeURIComponent(jour))
    return data ?? []
  },
  async getMatch(matchId) {
    const { data } = await requete<Prediction>('/api/matchs/' + encodeURIComponent(matchId))
    return data
  },
  async getHistory(periode: PeriodeHistorique) {
    const { data } = await requete<Historique>('/api/historique?periode=' + encodeURIComponent(periode))
    if (!data) throw new Error('Historique indisponible.')
    return data
  },
  async getNews(categorie) {
    const query = categorie ? '?categorie=' + encodeURIComponent(categorie) : ''
    const { data } = await requete<NewsArticle[]>('/api/actualites' + query)
    return data ?? []
  },
}
