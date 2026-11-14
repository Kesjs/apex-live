import { findNextMatchday, getMatchById, getMatchesForDay, JOUR_RE } from './_lib/match-engine.ts'

declare const process: { env: Record<string, string | undefined> }

type Request = { method?: string; query?: Record<string, string | string[]>; url?: string }
type Response = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => Response
  json: (body: unknown) => void
  end: () => void
}

function getParam(req: Request, url: URL | null, name: string): string | null {
  const fromUrl = url?.searchParams.get(name)
  if (fromUrl !== null && fromUrl !== undefined) return fromUrl
  const q = req.query?.[name]
  return typeof q === 'string' ? q : null
}

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const queryUrl = req.url ? new URL(req.url, 'http://localhost') : null
  const id = getParam(req, queryUrl, 'id')
  const date = getParam(req, queryUrl, 'date')
  const next = getParam(req, queryUrl, 'next')
  const from = getParam(req, queryUrl, 'from')

  try {
    if (next === '1') {
      const origin = from && JOUR_RE.test(from) ? from : new Date().toISOString().slice(0, 10)
      const result = await findNextMatchday(origin, process.env)
      res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=3600')
      return res.status(200).json(result)
    }

    if (id) {
      const fiche = await getMatchById(decodeURIComponent(id), process.env)
      if (!fiche) {
        res.setHeader('Cache-Control', 'no-store')
        return res.status(404).json({ error: 'Match introuvable.' })
      }
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1200')
      return res.status(200).json(fiche)
    }

    const jour = date && JOUR_RE.test(date) ? date : new Date().toISOString().slice(0, 10)
    const fiches = await getMatchesForDay(jour, process.env)
    const isPast = jour < new Date().toISOString().slice(0, 10)
    res.setHeader(
      'Cache-Control',
      isPast ? 'public, s-maxage=3600, stale-while-revalidate=86400' : 'public, s-maxage=300, stale-while-revalidate=1200',
    )
    return res.status(200).json(fiches)
  } catch (err) {
    console.error('Erreur /api/matchs:', err)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json(next === '1' ? { date: null, matchs: [] } : [])
  }
}
