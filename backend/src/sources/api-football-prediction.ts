import type { Rencontre } from '../types.ts'

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>
type Fixture = { fixture?: { id?: number; date?: string }; teams?: { home?: { name?: string }; away?: { name?: string } } }
type ApiResponse<T> = { response?: T[]; errors?: Record<string, unknown> }

export interface PredictionExterne {
  source: 'api-football'
  issue: { domicile: number; nul: number; exterieur: number }
  recuperee_le: string
}

const normaliser = (s: string) => s.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
const pourcentage = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace('%', '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n / 100 : null
}

/** Enrichissement optionnel : une comparaison, jamais une entrée du moteur Apex. */
export class ApiFootballPredictionSource {
  private readonly cache = new Map<string, Fixture[]>()
  private readonly apiKey: string
  private readonly fetcher: Fetcher
  constructor(apiKey: string, fetcher: Fetcher = fetch) {
    this.apiKey = apiKey
    this.fetcher = fetcher
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T[] | null> {
    const url = new URL('https://v3.football.api-sports.io' + path)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    const response = await this.fetcher(url, { headers: { 'x-apisports-key': this.apiKey } })
    if (!response.ok) return null
    const body = await response.json() as ApiResponse<T>
    return body.errors && Object.keys(body.errors).length ? null : (body.response ?? [])
  }

  async prediction(r: Rencontre): Promise<PredictionExterne | null> {
    const jour = r.date_heure.slice(0, 10)
    let fixtures = this.cache.get(jour)
    if (!fixtures) {
      fixtures = await this.get<Fixture>('/fixtures', { date: jour }) ?? []
      this.cache.set(jour, fixtures)
    }
    const home = normaliser(r.domicile.nom)
    const away = normaliser(r.exterieur.nom)
    const fixture = fixtures.find(f => normaliser(f.teams?.home?.name ?? '') === home && normaliser(f.teams?.away?.name ?? '') === away)
    const id = fixture?.fixture?.id
    if (!id) return null
    const rows = await this.get<{ predictions?: { percent?: { home?: unknown; draw?: unknown; away?: unknown } } }>('/predictions', { fixture: String(id) })
    const p = rows?.[0]?.predictions?.percent
    const domicile = pourcentage(p?.home), nul = pourcentage(p?.draw), exterieur = pourcentage(p?.away)
    if (domicile == null || nul == null || exterieur == null) return null
    return { source: 'api-football', issue: { domicile, nul, exterieur }, recuperee_le: new Date().toISOString() }
  }
}
