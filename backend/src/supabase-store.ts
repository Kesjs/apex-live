import type { NewsArticle, Prediction, ResultatFiche } from '../../src/domain/contracts.ts'
import type { LigneAEvaluer, Stockage } from './store.ts'
import type { Interne } from './types.ts'

/**
 * Stockage Supabase, via l'API REST (PostgREST) : aucune bibliothèque à installer.
 * Les tables se créent avec backend/supabase/schema.sql.
 * Utilise la clé « service_role » (secrète, à ne mettre que dans le back-end, jamais dans le front).
 */
export class SupabaseStore implements Stockage {
  private base: string
  private cle: string
  private appel: typeof fetch

  constructor(url: string, cle: string, fetchImpl: typeof fetch = fetch) {
    this.base = url.replace(/\/$/, '') + '/rest/v1'
    this.cle = cle
    this.appel = fetchImpl
  }

  private async requete(chemin: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}): Promise<Response> {
    const headers: Record<string, string> = { apikey: this.cle, 'content-type': 'application/json', ...init.headers }
    // Les anciennes clés (JWT, « eyJ… ») vont aussi dans Authorization ; les nouvelles (« sb_secret_… ») non.
    if (this.cle.startsWith('eyJ')) headers.authorization = 'Bearer ' + this.cle
    const r = await this.appel(this.base + chemin, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
    if (!r.ok) throw new Error('Supabase ' + r.status + ' sur ' + chemin.split('?')[0] + ' : ' + (await r.text()).slice(0, 300))
    return r
  }

  async enregistrer(jour: string, fiche: Prediction, interne: Interne | null): Promise<void> {
    await this.requete('/rpc/enregistrer_fiche', {
      method: 'POST',
      body: { p_match_id: fiche.match_id, p_jour: jour, p_date_heure: fiche.date_heure, p_fiche: fiche, p_interne: interne },
    })
  }

  async parJour(jour: string): Promise<Prediction[]> {
    const r = await this.requete('/fiches?select=fiche&jour=eq.' + encodeURIComponent(jour) + '&order=date_heure.asc,match_id.asc')
    return ((await r.json()) as Array<{ fiche: Prediction }>).map(l => l.fiche)
  }

  async parId(id: string): Promise<Prediction | null> {
    const r = await this.requete('/fiches?select=fiche&limit=1&match_id=eq.' + encodeURIComponent(id))
    const l = (await r.json()) as Array<{ fiche: Prediction }>
    return l[0]?.fiche ?? null
  }

  async aEvaluer(avantIso: string): Promise<LigneAEvaluer[]> {
    const lignes = await this.toutesLesLignes<{ match_id: string; date_heure: string; fiche: Prediction; interne: Interne | null }>(
      '/fiches?select=match_id,date_heure,fiche,interne&evalue=eq.false&date_heure=lt.' + encodeURIComponent(avantIso) + '&order=date_heure.asc',
    )
    return lignes
  }

  async marquerEvalue(id: string, resultat: ResultatFiche): Promise<void> {
    const fiche = await this.parId(id)
    if (!fiche) return
    fiche.resultat = resultat
    await this.requete('/fiches?match_id=eq.' + encodeURIComponent(id), { method: 'PATCH', body: { fiche, evalue: true } })
  }

  async evaluees(depuisJour: string): Promise<Array<{ jour: string; fiche: Prediction }>> {
    return this.toutesLesLignes<{ jour: string; fiche: Prediction }>(
      '/fiches?select=jour,fiche&evalue=eq.true&jour=gte.' + encodeURIComponent(depuisJour) + '&order=jour.desc,date_heure.desc',
    )
  }

  async enregistrerActualites(articles: NewsArticle[]): Promise<void> {
    if (!articles.length) return
    await this.requete('/actualites?on_conflict=id', {
      method: 'POST',
      headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
      body: articles.map(article => ({ id: article.id, categorie: article.categorie, article, publie_le: article.publie_le })),
    })
  }

  async actualites(categorie?: NewsArticle['categorie']): Promise<NewsArticle[]> {
    const filter = categorie ? '&categorie=eq.' + encodeURIComponent(categorie) : ''
    const r = await this.requete('/actualites?select=article&order=publie_le.desc&limit=50' + filter)
    return ((await r.json()) as Array<{ article: NewsArticle }>).map(row => row.article)
  }

  /** Supabase renvoie au plus 1000 lignes par requête : on lit par tranches. */
  private async toutesLesLignes<T>(chemin: string): Promise<T[]> {
    const out: T[] = []
    for (let debut = 0; ; debut += 1000) {
      const r = await this.requete(chemin, { headers: { 'range-unit': 'items', range: debut + '-' + (debut + 999) } })
      const page = (await r.json()) as T[]
      out.push(...page)
      if (page.length < 1000) return out
    }
  }

  async fermer(): Promise<void> {}
}
