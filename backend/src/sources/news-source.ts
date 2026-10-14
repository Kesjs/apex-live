import type { NewsArticle } from '../../../src/domain/contracts.ts'

type NewsFetcher = (input: string | URL, init?: RequestInit) => Promise<Response>

interface TheNewsArticle {
  uuid?: string
  title?: string
  description?: string | null
  url?: string
  source?: string | { name?: string }
  published_at?: string
  image_url?: string | null
}

interface TheNewsResponse { data?: TheNewsArticle[]; error?: string }

export class TheNewsApiSource {
  private readonly baseUrl = 'https://api.thenewsapi.com/v1/news/all'
  private readonly apiKey: string
  private readonly fetcher: NewsFetcher
  constructor(apiKey: string, fetcher: NewsFetcher = fetch) {
    if (!apiKey) throw new Error('THE_NEWS_API_KEY est obligatoire pour synchroniser les actualités.')
    this.apiKey = apiKey
    this.fetcher = fetcher
  }

  async actualites(): Promise<NewsArticle[]> {
    const url = new URL(this.baseUrl)
    url.searchParams.set('api_token', this.apiKey)
    url.searchParams.set('search', 'football OR soccer OR Champions League OR Europa League')
    url.searchParams.set('language', 'fr')
    url.searchParams.set('limit', '50')
    url.searchParams.set('sort', 'published_at')
    const response = await this.fetcher(url)
    const body = (await response.json()) as TheNewsResponse
    if (!response.ok || body.error) throw new Error('TheNewsAPI ' + response.status + ' : ' + (body.error ?? 'réponse invalide'))
    return (body.data ?? []).filter(article => article.title && article.url).map(article => {
      const rawSource = article.source
      const source = typeof rawSource === 'string' ? rawSource : rawSource?.name ?? 'Source externe'
      const text = article.description?.trim() || 'Ouvrir la source pour lire l’article.'
      const normalized = (article.title + ' ' + text).toLowerCase()
      const categorie: NewsArticle['categorie'] = normalized.includes('champions league') || normalized.includes('ligue des champions')
        ? 'champions-league'
        : normalized.includes('europa league') || normalized.includes('ligue europa')
          ? 'europa-league'
          : 'football'
      return {
        id: article.uuid ?? article.url!,
        titre: article.title!,
        resume: text,
        url: article.url!,
        source,
        publie_le: article.published_at ?? new Date().toISOString(),
        ...(article.image_url ? { image_url: article.image_url } : {}),
        categorie,
      }
    })
  }
}
