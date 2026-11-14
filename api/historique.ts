import type { PeriodeHistorique } from '../src/domain/contracts.ts'
import { buildRealHistorique } from './_lib/match-engine.ts'

declare const process: { env: Record<string, string | undefined> }

type Request = { method?: string; query?: Record<string, string | string[]>; url?: string }
type Response = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => Response
  json: (body: unknown) => void
  end: () => void
}

const PERIODES = new Set<PeriodeHistorique>(['7j', '30j', 'saison'])

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  const queryUrl = req.url ? new URL(req.url, 'http://localhost') : null
  const rawPeriode =
    queryUrl?.searchParams.get('periode') ??
    (typeof req.query?.periode === 'string' ? req.query.periode : '30j')
  const periode: PeriodeHistorique = PERIODES.has(rawPeriode as PeriodeHistorique)
    ? (rawPeriode as PeriodeHistorique)
    : '30j'

  try {
    const historique = await buildRealHistorique(periode, process.env, new Date())
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=14400')
    return res.status(200).json(historique)
  } catch (err) {
    console.error('Erreur /api/historique:', err)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).json({ error: 'Impossible de calculer l’historique.' })
  }
}
