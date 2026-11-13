import type { ApexProvider, Historique, JourHistorique, NewsArticle, PeriodeHistorique, PilierId, Prediction, TauxPilier } from '../domain/contracts'
import { demoProvider } from './demo-provider'

/**
 * Source de données : lit directement Supabase (API REST, clé publique « anon »).
 * Les fiches sont écrites par le lot quotidien (GitHub Actions, voir .github/workflows) ; le navigateur ne fait que lire.
 * En cas d'indisponibilité (ex: projet Supabase mis en pause), repli automatique transparent pour ne jamais bloquer l'interface.
 */

const base = ((import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '').replace(/\/$/, '')
const cle = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''
export const supabaseConfigure = Boolean(base && cle)

async function lire<T>(chemin: string): Promise<T[]> {
  const headers: Record<string, string> = { apikey: cle, Accept: 'application/json' }
  if (cle.startsWith('eyJ')) headers.authorization = 'Bearer ' + cle
  let reponse: Response
  try {
    reponse = await fetch(base + '/rest/v1' + chemin, { headers })
  } catch {
    throw new Error('Impossible de joindre le serveur de données.')
  }
  if (!reponse.ok) throw new Error('Le serveur de données a répondu avec une erreur (' + reponse.status + ').')
  return (await reponse.json()) as T[]
}

function debutPeriode(periode: PeriodeHistorique): string {
  const d = new Date()
  if (periode === 'saison') return (d.getUTCMonth() >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1) + '-08-01'
  d.setUTCDate(d.getUTCDate() - (periode === '7j' ? 7 : 30))
  return d.toISOString().slice(0, 10)
}

export const supabaseProvider: ApexProvider = {
  async listMatches(jour) {
    try {
      const lignes = await lire<{ fiche: Prediction }>('/fiches?select=fiche&jour=eq.' + encodeURIComponent(jour) + '&order=date_heure.asc,match_id.asc&limit=1000')
      return lignes.map(l => l.fiche)
    } catch (e) {
      console.warn('Supabase indisponible, affichage des données de référence :', e)
      return demoProvider.listMatches(jour)
    }
  },
  async getMatch(matchId) {
    try {
      const lignes = await lire<{ fiche: Prediction }>('/fiches?select=fiche&limit=1&match_id=eq.' + encodeURIComponent(matchId))
      if (lignes[0]?.fiche) return lignes[0].fiche
      return demoProvider.getMatch(matchId)
    } catch (e) {
      console.warn('Supabase indisponible, repli getMatch :', e)
      return demoProvider.getMatch(matchId)
    }
  },
  async getHistory(periode) {
    try {
      const debut = debutPeriode(periode)
      const lignes: Array<{ jour: string; fiche: Prediction }> = []
      for (let page = 0; page < 10; page++) {
        const lot = await lire<{ jour: string; fiche: Prediction }>(
          '/fiches?select=jour,fiche&evalue=eq.true&jour=gte.' + debut + '&order=jour.desc,date_heure.desc&limit=1000&offset=' + page * 1000,
        )
        lignes.push(...lot)
        if (lot.length < 1000) break
      }
      const taux: Record<PilierId, TauxPilier> = { issue: { reussis: 0, total: 0 }, buts: { reussis: 0, total: 0 }, bonus: { reussis: 0, total: 0 }, scores: { reussis: 0, total: 0 } }
      const parJour = new Map<string, JourHistorique>()
      for (const { jour, fiche } of lignes) {
        if (fiche.pronostics === null || fiche.resultat.statut !== 'evalue') continue
        const r = fiche.resultat
        const verdicts: Array<[PilierId, boolean | null]> = [['issue', r.issue], ['buts', r.buts], ['bonus', r.bonus], ['scores', r.score]]
        for (const [pilier, ok] of verdicts) {
          if (ok === null) continue
          taux[pilier].total++
          if (ok) taux[pilier].reussis++
        }
        if (!parJour.has(jour)) parJour.set(jour, { jour, matchs: [] })
        parJour.get(jour)!.matchs.push(fiche)
      }
      return { periode, mis_a_jour_le: new Date().toISOString(), taux, jours: [...parJour.values()].sort((a, b) => (a.jour < b.jour ? 1 : -1)) }
    } catch (e) {
      console.warn('Supabase indisponible, repli getHistory :', e)
      return demoProvider.getHistory(periode)
    }
  },
  async getNews(categorie) {
    try {
      const query = categorie ? '?categorie=' + encodeURIComponent(categorie) : ''
      const res = await fetch('/api/actualites' + query)
      if (res.ok) {
        const data = (await res.json()) as NewsArticle[]
        if (Array.isArray(data) && data.length > 0) return data
      }
    } catch {
      /* repli vers Supabase ou démo */
    }
    try {
      const filtre = categorie ? '&categorie=eq.' + encodeURIComponent(categorie) : ''
      const lignes = await lire<{ article: NewsArticle }>('/actualites?select=article&order=publie_le.desc&limit=40' + filtre)
      return lignes.map(l => l.article)
    } catch {
      return demoProvider.getNews(categorie)
    }
  },
}
