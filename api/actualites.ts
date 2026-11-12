type Request = { method?: string; query?: Record<string, string | string[]>; url?: string }
type Response = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => Response
  json: (body: unknown) => void
  end: () => void
}

interface NewsArticle {
  id: string
  titre: string
  resume: string
  url: string
  source: string
  publie_le: string
  image_url?: string
  categorie: 'football' | 'champions-league' | 'europa-league'
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '')).trim()
}

function parseRss(xml: string, sourceName: string): NewsArticle[] {
  const articles: NewsArticle[] = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)

  for (const match of itemMatches) {
    const itemXml = match[1]
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i)
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i)
    const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i)
    const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i) || itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i)
    const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)

    const rawTitle = titleMatch ? titleMatch[1] : ''
    const titre = stripHtml(rawTitle)
    const rawLink = linkMatch ? linkMatch[1] : ''
    const url = stripHtml(rawLink)
    const rawDesc = descMatch ? descMatch[1] : ''
    let resume = stripHtml(rawDesc)
    if (!resume || resume.length < 10) resume = 'Consultez la source officielle pour le résumé complet.'

    let imageUrl = enclosureMatch ? enclosureMatch[1] : undefined
    if (!imageUrl) {
      const imgInDesc = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i)
      if (imgInDesc) imageUrl = imgInDesc[1]
    }

    let publieLe: string
    try {
      publieLe = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString()
    } catch {
      publieLe = new Date().toISOString()
    }

    if (titre && url) {
      const normalized = (titre + ' ' + resume).toLowerCase()
      const categorie: NewsArticle['categorie'] =
        normalized.includes('champions league') || normalized.includes('ligue des champions') || normalized.includes('c1')
          ? 'champions-league'
          : normalized.includes('europa league') || normalized.includes('ligue europa') || normalized.includes('c3')
            ? 'europa-league'
            : 'football'

      articles.push({
        id: url,
        titre,
        resume,
        url,
        source: sourceName,
        publie_le: publieLe,
        ...(imageUrl ? { image_url: imageUrl } : {}),
        categorie,
      })
    }
  }

  return articles
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const queryUrl = req.url ? new URL(req.url, 'http://localhost') : null
  const categorie = queryUrl?.searchParams.get('categorie') || (typeof req.query?.categorie === 'string' ? req.query.categorie : null)

  const sources = [
    { url: 'https://dwh.lequipe.fr/api/edito/rss?path=/Football/', name: "L'Équipe" },
    { url: 'https://rmcsport.bfmtv.com/rss/football/', name: 'RMC Sport' },
  ]

  const tous: NewsArticle[] = []

  await Promise.allSettled(
    sources.map(async s => {
      try {
        const response = await fetch(s.url, { headers: { 'User-Agent': 'ApexBot/1.0 (Football News Reader)' } })
        if (!response.ok) return
        const xml = await response.text()
        const parsed = parseRss(xml, s.name)
        tous.push(...parsed)
      } catch (err) {
        console.warn('Erreur récupération RSS', s.name, err)
      }
    })
  )

  tous.sort((a, b) => new Date(b.publie_le).getTime() - new Date(a.publie_le).getTime())

  const uniques = new Map<string, NewsArticle>()
  for (const art of tous) {
    const cle = art.titre.toLowerCase().slice(0, 30)
    if (!uniques.has(cle)) {
      uniques.set(cle, art)
    }
  }

  let articles = Array.from(uniques.values()).slice(0, 40)
  if (categorie && ['football', 'champions-league', 'europa-league'].includes(categorie)) {
    articles = articles.filter(a => a.categorie === categorie)
  }

  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800')
  return res.status(200).json(articles)
}
