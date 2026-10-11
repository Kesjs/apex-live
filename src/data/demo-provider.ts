import { dates, getDayFixture, type MatchFixture, type Scenario } from './demo'
import type { FootballDataProvider, MatchQuery, MatchRecord, ProviderResult } from '../domain/contracts'

const demoSource = (observedAt: string, freshnessLabel: string) => ({
  mode: 'synthetic' as const,
  sourceId: 'apex-fixtures',
  sourceLabel: 'Fixtures locales Apex',
  observedAt,
  freshnessLabel,
})

function toRecord(match: MatchFixture, date: string, freshnessLabel: string): MatchRecord {
  const kickoffAt = `${date}T${match.time}:00+02:00`
  return {
    id: match.id,
    kickoffAt,
    timezone: 'Africa/Porto-Novo',
    competition: { id: match.competition.toLowerCase().replaceAll(' ', '-'), name: match.competition },
    home: { id: `${match.id}-home`, name: match.home, initials: match.homeInitials },
    away: { id: `${match.id}-away`, name: match.away, initials: match.awayInitials },
    lifecycle: 'scheduled',
    analysis: match.status === 'available' ? 'available' : match.status === 'soon' ? 'upcoming' : 'insufficient',
    provenance: demoSource(match.observed, freshnessLabel),
  }
}

export class DemoFootballProvider implements FootballDataProvider {
  constructor(private readonly scenario: Scenario = 'success') {}

  async listMatches(query: MatchQuery): Promise<ProviderResult<MatchRecord[]>> {
    const index = dates.findIndex(date => date.iso === query.date)
    const fixture = getDayFixture(index < 0 ? 0 : index, this.scenario)
    if (this.scenario === 'error') return { ok: false, code: 'provider_unavailable', message: 'Les fixtures de démonstration sont indisponibles.' }
    if (this.scenario === 'empty') return { ok: true, data: [] }
    return { ok: true, data: [fixture.featured, ...fixture.upcoming].map(match => toRecord(match, fixture.date.iso, fixture.freshness)) }
  }

  async getMatch(matchId: string): Promise<ProviderResult<MatchRecord>> {
    for (const date of dates) {
      const result = await this.listMatches({ date: date.iso })
      if (!result.ok) return result
      const match = result.data.find(item => item.id === matchId)
      if (match) return { ok: true, data: match }
    }
    return { ok: false, code: 'not_found', message: 'Match introuvable dans les fixtures de démonstration.' }
  }
}
