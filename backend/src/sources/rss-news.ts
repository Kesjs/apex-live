import type { NewsArticle } from '../../../src/domain/contracts.ts'
import { TheNewsApiSource } from './news-source.ts'

interface FeedConfig {
  url: string
  name: string
  defaultCat?: NewsArticle['categorie']
  strictSummary?: boolean
}

const RSS_FEEDS: FeedConfig[] = [
  { url: 'https://rmcsport.bfmtv.com/rss/football/', name: 'RMC Sport' },
  { url: 'https://www.footmercato.net/flux-rss', name: 'Foot Mercato' },
  { url: 'https://www.sofoot.com/rss', name: 'So Foot' },
  { url: 'https://www.francetvinfo.fr/sports/foot.rss', name: 'Franceinfo Sport' },
  { url: 'https://dwh.lequipe.fr/api/edito/rss?path=/Football/', name: "L'Équipe", strictSummary: true },
  { url: 'https://news.google.com/rss/search?q=Ligue+des+champions+UEFA+football&hl=fr&gl=FR&ceid=FR:fr', name: 'Google News LDC', defaultCat: 'champions-league' },
  { url: 'https://news.google.com/rss/search?q=Europa+League+UEFA+football&hl=fr&gl=FR&ceid=FR:fr', name: 'Google News C3', defaultCat: 'europa-league' },
]

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  eacute: 'é',
  egrave: 'è',
  ecirc: 'ê',
  euml: 'ë',
  agrave: 'à',
  acirc: 'â',
  ccedil: 'ç',
  icirc: 'î',
  iuml: 'ï',
  ocirc: 'ô',
  ouml: 'ö',
  ugrave: 'ù',
  ucirc: 'û',
  uuml: 'ü',
  rsquo: '’',
  lsquo: '‘',
  laquo: '«',
  raquo: '»',
  hellip: '…',
  ndash: '–',
  mdash: '—',
  euro: '€',
  oelig: 'œ',
}

const PLACEHOLDER_IMAGE_RE =
  /medias\.lequipe\.fr\/img-photo-png\/-\/1500000000833469\/|\/logo[-_.]|placeholder|default[-_]thumb|1x1\.(gif|png|jpg)/i

export function decodeEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = Number.parseInt(hex, 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : _
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : _
    })
    .replace(/&([a-zA-Z]+);/g, (full, name) => NAMED_ENTITIES[name.toLowerCase()] ?? full)
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

function isUsableImage(url: string | undefined): string | undefined {
  if (!url) return undefined
  const clean = decodeEntities(url).trim()
  if (!/^https?:\/\//i.test(clean)) return undefined
  if (PLACEHOLDER_IMAGE_RE.test(clean)) return undefined
  return clean
}

function detectCategorie(text: string, fallback: NewsArticle['categorie'] = 'football'): NewsArticle['categorie'] {
  const n = text.toLowerCase()
  if (n.includes('champions league') || n.includes('ligue des champions') || /\bc1\b/.test(n)) {
    return 'champions-league'
  }
  if (n.includes('europa league') || n.includes('ligue europa') || n.includes('conference league') || /\bc3\b/.test(n)) {
    return 'europa-league'
  }
  return fallback
}

export function parseRssXml(xml: string, feed: FeedConfig | string): NewsArticle[] {
  const cfg: FeedConfig = typeof feed === 'string' ? { url: '', name: feed } : feed
  const articles: NewsArticle[] = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)
  const isGoogle = cfg.name.startsWith('Google News')

  for (const match of itemMatches) {
    const itemXml = match[1]
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i)
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i)
    const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i)
    const contentMatch = itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i)
    const mediaMatch =
      itemXml.match(/<enclosure[^>]+url=["']([^"']+)["']/i) ||
      itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i) ||
      itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i)
    const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)
    const sourceTagMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/i)

    let titre = stripHtml(titleMatch ? titleMatch[1] : '')
    const url = stripHtml(linkMatch ? linkMatch[1] : '')
    if (!titre || !url) continue

    let sourceName = sourceTagMatch ? stripHtml(sourceTagMatch[1]) : cfg.name
    if (isGoogle && titre.includes(' - ')) {
      const idx = titre.lastIndexOf(' - ')
      if (idx > 20) {
        if (!sourceName || sourceName.startsWith('Google')) sourceName = titre.slice(idx + 3).trim()
        titre = titre.slice(0, idx).trim()
      }
    }

    const rawDesc = contentMatch?.[1] || descMatch?.[1] || ''
    let resume = stripHtml(rawDesc)

    let imageUrl = isUsableImage(mediaMatch?.[1])
    if (!imageUrl) {
      const imgInDesc = rawDesc.match(/<img[^>]+src=["']([^"']+)["']/i)
      imageUrl = isUsableImage(imgInDesc?.[1])
    }

    // Rejeter les brèves paywall/vidéo vides (sans résumé exploitable ET sans photo)
    const resumeIdentiqueAuTitre = resume.toLowerCase().startsWith(titre.slice(0, 28).toLowerCase())
    if (cfg.strictSummary && (!resume || resume.length < 35) && !imageUrl) {
      continue
    }
    if (!resume || resume.length < 24 || (isGoogle && resumeIdentiqueAuTitre)) {
      if (isGoogle) {
        resume = cfg.defaultCat === 'champions-league'
          ? `Point complet UEFA Champions League publié par ${sourceName}.`
          : cfg.defaultCat === 'europa-league'
            ? `Actualité UEFA Europa League à lire sur ${sourceName}.`
            : `Dépêche football complète à consulter sur ${sourceName}.`
      } else {
        continue
      }
    }

    if (resume.length > 220) {
      resume = resume.slice(0, 217).replace(/\s+\S*$/, '') + '…'
    }

    let publieLe: string
    try {
      publieLe = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString()
    } catch {
      publieLe = new Date().toISOString()
    }

    const categorie = detectCategorie(`${titre} ${resume}`, cfg.defaultCat ?? 'football')

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

  return articles
}

/**
 * Diversifie les articles par média en entrelacement pondéré tout en préservant l'ordre chronologique,
 * pour éviter qu'un flux très bavard monopolise la page d'accueil.
 */
function diversifier(articles: NewsArticle[], maxTotal = 40, maxParSource = 9): NewsArticle[] {
  const dedupe = new Map<string, NewsArticle>()
  for (const art of articles) {
    const cle = art.titre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 42)
    if (!cle) continue
    const existant = dedupe.get(cle)
    // Préférer la version avec image si doublon
    if (!existant || (!existant.image_url && art.image_url)) {
      dedupe.set(cle, art)
    }
  }

  const tries = Array.from(dedupe.values()).sort(
    (a, b) => new Date(b.publie_le).getTime() - new Date(a.publie_le).getTime(),
  )

  const buckets = new Map<string, NewsArticle[]>()
  for (const art of tries) {
    const liste = buckets.get(art.source) ?? []
    if (liste.length < maxParSource) {
      liste.push(art)
      buckets.set(art.source, liste)
    }
  }

  // Ordonner les buckets par article le plus récent (avec priorité à ceux ayant une photo en tête)
  const queues = Array.from(buckets.values()).sort((a, b) => {
    const aPhoto = a[0]?.image_url ? 1 : 0
    const bPhoto = b[0]?.image_url ? 1 : 0
    if (aPhoto !== bPhoto) return bPhoto - aPhoto
    return new Date(b[0].publie_le).getTime() - new Date(a[0].publie_le).getTime()
  })

  const out: NewsArticle[] = []
  let idx = 0
  while (out.length < maxTotal) {
    let added = false
    for (const q of queues) {
      if (idx < q.length) {
        out.push(q[idx])
        added = true
        if (out.length >= maxTotal) break
      }
    }
    if (!added) break
    idx++
  }

  return out
}

let cachePool: { articles: NewsArticle[]; timestamp: number } | null = null
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes de cache mémoire

export async function fetchLiveNews(opts?: {
  categorie?: string | null
  theNewsApiKey?: string
}): Promise<NewsArticle[]> {
  const now = Date.now()
  let pool: NewsArticle[]

  if (cachePool && now - cachePool.timestamp < CACHE_TTL_MS && cachePool.articles.length > 0) {
    pool = cachePool.articles
  } else {
    const tous: NewsArticle[] = []

    const tasks: Array<Promise<void>> = RSS_FEEDS.map(async feed => {
      try {
        const res = await fetch(feed.url, {
          headers: { 'User-Agent': 'ApexBot/1.0 (+https://tryapex.live)' },
          signal: AbortSignal.timeout(7000),
        })
        if (!res.ok) return
        const xml = await res.text()
        tous.push(...parseRssXml(xml, feed))
      } catch (err) {
        console.warn('Erreur récupération flux RSS', feed.name, err)
      }
    })

    if (opts?.theNewsApiKey) {
      tasks.push(
        new TheNewsApiSource(opts.theNewsApiKey)
          .actualites()
          .then(items => {
            tous.push(...items)
          })
          .catch(() => undefined),
      )
    }

    await Promise.allSettled(tasks)
    if (tous.length > 0) {
      cachePool = { articles: tous, timestamp: now }
      pool = tous
    } else {
      pool = cachePool?.articles ?? []
    }
  }

  const cat = opts?.categorie
  const filtre =
    cat && ['football', 'champions-league', 'europa-league'].includes(cat)
      ? pool.filter(a => a.categorie === cat)
      : pool

  // Pour les filtres européens spécialisés, privilégier le tri chronologique strict plutôt qu'un gros quota par source
  if (cat === 'champions-league' || cat === 'europa-league') {
    return diversifier(filtre, 30, 15)
  }
  return diversifier(filtre, 40, 8)
}
