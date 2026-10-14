import type { Contexte, Equipe, MatchPasse, Rencontre, ResultatReel, Source } from '../types.ts'

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>
type CompetitionCode = 'CL' | 'PL' | 'PD' | 'SA' | 'BL1' | 'FL1' | 'PPL'

interface MatchApi {
  id: number
  utcDate: string
  status: string
  competition: { code: string; name: string }
  homeTeam: { id: number; name: string; crest?: string }
  awayTeam: { id: number; name: string; crest?: string }
  score?: { fullTime?: { home: number | null; away: number | null } }
}

interface MatchesResponse { matches?: MatchApi[] }

interface TrendSide {
  match_ids?: number[]
  competitions?: string
  form?: string
}

interface TrendApi {
  homeTeam: { id: number; name: string }
  awayTeam: { id: number; name: string }
  trend?: { home?: TrendSide; away?: TrendSide }
}

interface TrendsResponse { trends?: TrendApi[] }

const FINISHED = new Set(['FINISHED', 'AWARDED'])
const CANCELLED = new Set(['CANCELLED', 'POSTPONED', 'SUSPENDED'])
const COMPETITIONS: Array<{ code: CompetitionCode; name: string }> = [
  { code: 'CL', name: 'UEFA Champions League' },
  { code: 'PL', name: 'Premier League' },
  { code: 'PD', name: 'Primera Division' },
  { code: 'SA', name: 'Serie A' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'PPL', name: 'Primeira Liga' },
]

export class FootballDataSource implements Source {
  readonly nom = 'football-data.org'
  readonly nomCotes = 'non configurées'
  private readonly baseUrl = 'https://api.football-data.org/v4'
  private readonly cache = new Map<string, MatchApi[]>()
  private readonly apiKey: string
  private readonly fetcher: Fetcher

  constructor(apiKey: string, fetcher: Fetcher = fetch) {
    if (!apiKey) throw new Error('FOOTBALL_DATA_KEY est obligatoire pour SOURCE=football-data.')
    this.apiKey = apiKey
    this.fetcher = fetcher
  }

  private async request(path: string, params: Record<string, string>): Promise<MatchApi[]> {
    const url = new URL(this.baseUrl + path)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    const response = await this.fetcher(url, { headers: { 'X-Auth-Token': this.apiKey } })
    const raw = await response.text()
    const body = JSON.parse(raw) as MatchesResponse & { message?: string }
    if (!response.ok) throw new Error(`football-data.org ${response.status} sur ${path}: ${body.message ?? 'réponse invalide'}`)
    return body.matches ?? []
  }

  private async tendances(jour: string, competitions: string[]): Promise<Map<number, MatchPasse[]>> {
    const url = new URL(this.baseUrl + '/trends')
    for (const [key, value] of Object.entries({ date: jour, competitions: competitions.join(','), window: '10' })) url.searchParams.set(key, value)
    const response = await this.fetcher(url, { headers: { 'X-Auth-Token': this.apiKey } })
    if (!response.ok) throw new Error(`football-data.org ${response.status} sur /trends`)
    const body = (await response.json()) as TrendsResponse
    const ids = [...new Set((body.trends ?? []).flatMap(item => [ ...(item.trend?.home?.match_ids ?? []), ...(item.trend?.away?.match_ids ?? []) ]).map(Number).filter(id => Number.isInteger(id) && id > 0))]
    if (ids.length === 0) return new Map()
    const matches = await this.request('/matches', { ids: ids.join(','), limit: '500' })
    const historiques = new Map<number, MatchPasse[]>()
    for (const match of matches) {
      if (!FINISHED.has(match.status)) continue
      const home = match.score?.fullTime?.home
      const away = match.score?.fullTime?.away
      if (home === null || home === undefined || away === null || away === undefined) continue
      const ajouter = (teamId: number, domicile: boolean) => {
        const liste = historiques.get(teamId) ?? []
        liste.push({ date: match.utcDate.slice(0, 10), domicile, buts_pour: domicile ? home : away, buts_contre: domicile ? away : home })
        historiques.set(teamId, liste)
      }
      ajouter(match.homeTeam.id, true)
      ajouter(match.awayTeam.id, false)
    }
    for (const [teamId, liste] of historiques) historiques.set(teamId, liste.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10))
    return historiques
  }

  private async saison(code: CompetitionCode): Promise<MatchApi[]> {
    const key = 'season:' + code
    const cached = this.cache.get(key)
    if (cached) return cached
    // En début de nouvelle saison, la saison courante ne contient pas encore
    // assez de matchs terminés. La saison précédente fournit une base réelle
    // et stable pour la forme, sans fabriquer de statistiques.
    const saisonPrecedente = String(new Date().getUTCFullYear() - 1)
    const matches = await this.request('/competitions/' + code + '/matches', { season: saisonPrecedente })
    this.cache.set(key, matches)
    return matches
  }

  async rencontres(jour: string): Promise<Rencontre[]> {
    const out: Rencontre[] = []
    const lendemain = new Date(jour + 'T00:00:00Z')
    lendemain.setUTCDate(lendemain.getUTCDate() + 1)
    const matches = await this.request('/matches', { competitions: COMPETITIONS.map(item => item.code).join(','), dateFrom: jour, dateTo: lendemain.toISOString().slice(0, 10) })
    const historiques = await this.tendances(jour, [...new Set(matches.map(match => match.competition.code))])
    for (const match of matches) {
      const competition = COMPETITIONS.find(item => item.code === match.competition.code)
      if (!competition) continue
      out.push({
        match_id: String(match.id),
        date_heure: match.utcDate,
        competition: competition.name,
        domicile: this.equipe(match.homeTeam, historiques),
        exterieur: this.equipe(match.awayTeam, historiques),
        logos: { domicile: match.homeTeam.crest, exterieur: match.awayTeam.crest },
        cotes: {},
      })
    }
    return out.sort((a, b) => a.date_heure.localeCompare(b.date_heure))
  }

  async contexte(competitionName: string): Promise<Contexte> {
    const competition = COMPETITIONS.find(item => item.name === competitionName)
    if (!competition) throw new Error('Compétition non configurée : ' + competitionName)
    const matches = (await this.saison(competition.code)).filter(match => FINISHED.has(match.status) && match.score?.fullTime?.home !== null && match.score?.fullTime?.away !== null)
    const total = matches.length || 1
    return { competition: competition.name, moy_buts_domicile: matches.reduce((sum, match) => sum + (match.score?.fullTime?.home ?? 0), 0) / total, moy_buts_exterieur: matches.reduce((sum, match) => sum + (match.score?.fullTime?.away ?? 0), 0) / total, moy_bonus: {} }
  }

  async resultat(matchId: string): Promise<ResultatReel | null> {
    const response = await this.fetcher(this.baseUrl + '/matches/' + encodeURIComponent(matchId), { headers: { 'X-Auth-Token': this.apiKey } })
    if (response.status === 404) return null
    if (!response.ok) throw new Error('football-data.org ' + response.status + ' sur /matches/' + matchId)
    const match = (await response.json()) as MatchApi
    return this.resultatDepuisMatch(matchId, match)
  }

  async resultats(matchIds: string[]): Promise<Map<string, ResultatReel>> {
    const ids = [...new Set(matchIds)].filter(Boolean)
    const out = new Map<string, ResultatReel>()
    if (ids.length === 0) return out
    const matches = await this.request('/matches', { ids: ids.join(','), limit: '500' })
    for (const match of matches) {
      const id = String(match.id)
      const resultat = this.resultatDepuisMatch(id, match)
      if (resultat) out.set(id, resultat)
    }
    return out
  }

  private resultatDepuisMatch(matchId: string, match: MatchApi): ResultatReel {
    if (CANCELLED.has(match.status)) return { match_id: matchId, statut: 'annule' }
    if (!FINISHED.has(match.status)) return { match_id: matchId, statut: 'a_venir' }
    const home = match.score?.fullTime?.home
    const away = match.score?.fullTime?.away
    if (home === null || home === undefined || away === null || away === undefined) return { match_id: matchId, statut: 'annule' }
    return { match_id: matchId, statut: 'termine', score_domicile: home, score_exterieur: away }
  }

  private equipe(team: { id: number; name: string }, historiques: Map<number, MatchPasse[]>): Equipe {
    return { id: String(team.id), nom: team.name, matchs: historiques.get(team.id) ?? [] }
  }
}
