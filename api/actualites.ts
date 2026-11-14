import { fetchLiveNews } from '../backend/src/sources/rss-news.ts'

declare const process: { env: Record<string, string | undefined> }

type Request = { method?: string; query?: Record<string, string | string[]>; url?: string }
type Response = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => Response
  json: (body: unknown) => void
  end: () => void
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const queryUrl = req.url ? new URL(req.url, 'http://localhost') : null
  const categorie =
    queryUrl?.searchParams.get('categorie') ||
    (typeof req.query?.categorie === 'string' ? req.query.categorie : null)

  try {
    const articles = await fetchLiveNews({
      categorie,
      theNewsApiKey: process.env.THE_NEWS_API_KEY,
    })
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800')
    return res.status(200).json(articles)
  } catch (err) {
    console.warn('Erreur endpoint actualites:', err)
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return res.status(200).json([])
  }
}
