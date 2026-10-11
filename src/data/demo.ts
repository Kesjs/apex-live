export const demoLabel = 'DÉMO — contenu fictif de composition'
export type Scenario = 'success' | 'loading' | 'empty' | 'insufficient' | 'stale' | 'error'
export const scenarioLabels: Record<Scenario, string> = { success: 'Succès', loading: 'Chargement continu', empty: 'Aucun match pertinent', insufficient: 'Données insuffisantes', stale: 'Données périmées', error: 'Erreur fournisseur simulée' }
export const dates = [
  ['2026-10-06', 'Mar.', '6', 'Mardi 6 octobre 2026'], ['2026-10-07', 'Mer.', '7', 'Mercredi 7 octobre 2026'], ['2026-10-08', 'Jeu.', '8', 'Jeudi 8 octobre 2026'], ['2026-10-09', 'Ven.', '9', 'Vendredi 9 octobre 2026'], ['2026-10-10', 'Sam.', '10', 'Samedi 10 octobre 2026'], ['2026-10-11', 'Dim.', '11', 'Dimanche 11 octobre 2026'],
].map(([iso, short, number, long]) => ({ iso, short, number, long }))
export type MatchFixture = { id: string; home: string; away: string; homeInitials: string; awayInitials: string; time: string; competition: string; status: 'available' | 'soon' | 'limited'; observed: string }
const pairings = [['Eastbay FC', 'Redmont', 'EF', 'RE'], ['Harbor United', 'Union Park', 'HU', 'UP'], ['Northbridge FC', 'Port Azure', 'NF', 'PA'], ['Cedar Park', 'Montclair', 'CP', 'MO'], ['Valmont FC', 'Riverton', 'VF', 'RI'], ['Westhaven', 'Lakewood', 'WE', 'LA']]
export function getDayFixture(index: number, scenario: Scenario = 'success') {
  const safe = Math.max(0, Math.min(dates.length - 1, index)); const date = dates[safe]; const day = scenario === 'stale' ? Number(date.number) - 2 : Number(date.number); const observed = `${day} oct. 2026 à 10:15 UTC+2`
  const make = (n: number, order: number, status: MatchFixture['status']): MatchFixture => { const [home, away, hi, ai] = pairings[n % pairings.length]; return { id: `${date.iso}-${order}`, home, away, homeInitials: hi, awayInitials: ai, time: order === 1 ? '18:45' : '21:00', competition: order === 2 ? 'Coupe des Rives' : 'Ligue des Clubs', status, observed } }
  return { date, observed, freshness: scenario === 'error' || scenario === 'empty' ? 'Indisponible' : scenario === 'stale' ? '48 h · périmées' : '18 min · simulées', featured: make(safe, 0, scenario === 'insufficient' || scenario === 'stale' || scenario === 'error' || scenario === 'empty' ? 'limited' : 'available'), upcoming: scenario === 'error' || scenario === 'empty' ? [] : [make(safe + 1, 1, 'available'), make(safe + 2, 2, 'soon'), make(safe + 3, 3, 'limited')] }
}
