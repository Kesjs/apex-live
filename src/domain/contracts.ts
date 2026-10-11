/** Provider-independent contracts. Real and synthetic data must use the same shape. */
export type DataMode = 'synthetic' | 'real'
export type MatchLifecycle = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled'
export type AnalysisAvailability = 'available' | 'upcoming' | 'insufficient' | 'stale' | 'unavailable' | 'error'

export interface DataProvenance {
  mode: DataMode
  sourceId: string
  sourceLabel: string
  observedAt: string
  freshnessLabel: string
}

export interface TeamReference {
  id: string
  name: string
  shortName?: string
  initials: string
}

export interface MatchRecord {
  id: string
  kickoffAt: string
  timezone: string
  competition: { id: string; name: string }
  home: TeamReference
  away: TeamReference
  lifecycle: MatchLifecycle
  analysis: AnalysisAvailability
  provenance: DataProvenance
}

export interface MatchQuery {
  date: string
}

export type ProviderResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: 'provider_unavailable' | 'invalid_data' | 'not_found'; message: string; provenance?: DataProvenance }

export interface FootballDataProvider {
  listMatches(query: MatchQuery): Promise<ProviderResult<MatchRecord[]>>
  getMatch(matchId: string): Promise<ProviderResult<MatchRecord>>
}

export type AnalyticalSolidity = 'high' | 'medium' | 'limited' | 'not-evaluated'

export interface AnalysisFactor { label: string; detail: string; direction: 'supporting' | 'risk' | 'neutral' }

export interface AnalysisRecord {
  matchId: string
  solidity: AnalyticalSolidity
  summary: string
  factors: AnalysisFactor[]
  recommendations: string[]
  provenance: DataProvenance
}
