import type { Contexte, Equipe, MatchPasse, Rencontre, ResultatReel, Source } from '../types.ts'
import type { StatsCsv } from './stats-csv.ts'

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>
type CompetitionCode = 'CL' | 'PL' | 'PD' | 'SA' | 'BL1' | 'FL1' | 'PPL' | 'DED' | 'ELC'

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

const FINISHED = new Set(['FINISHED', 'AWARDED'])
const CANCELLED = new Set(['CANCELLED', 'POSTPONED', 'SUSPENDED'])
/** historiqueSeulement : sert à la forme des équipes (toutes compétitions confondues), mais ses matchs ne sont pas pronostiqués. */
const COMPETITIONS: Array<{ code: CompetitionCode; name: string; historiqueSeulement?: boolean }> = [
  { code: 'CL', name: 'UEFA Champions League' },
  { code: 'PL', name: 'Premier League' },
  { code: 'PD', name: 'Primera Division' },
  { code: 'SA', name: 'Serie A' },
  { code: 'BL1', name: 'Bundesliga' },
  { code: 'FL1', name: 'Ligue 1' },
  { code: 'PPL', name: 'Primeira Liga' },
  { code: 'DED', name: 'Eredivisie', historiqueSeulement: true },
  { code: 'ELC', name: 'Championship', historiqueSeulement: true },
]
const AFFICHEES = COMPETITIONS.filter(c => !c.historiqueSeulement)

export class FootballDataSource implements Source {
  readonly nom = 'football-data.org'
  get nomCotes(): string {
    return this.csv?.aDesCotes ? 'football-data.co.uk (moyenne des bookmakers)' : 'non configurées'
  }
  private readonly baseUrl = 'https://api.football-data.org/v4'
  private readonly cache = new Map<string, MatchApi[]>()
  private readonly apiKey: string
  private readonly fetcher: Fetcher
  private readonly pauseMs: number
  private readonly csv?: StatsCsv
  private dernierAppel = 0

  /** pauseMs : délai minimal entre deux appels (forfait gratuit = 10 appels/minute → 6,5 s). */
  constructor(apiKey: string, fetcher: Fetcher = fetch, pauseMs = 6500, csv?: StatsCsv) {
    if (!apiKey) throw new Error('FOOTBALL_DATA_KEY est obligatoire pour SOURCE=football-data.')
    this.apiKey = apiKey
    this.fetcher = fetcher
    this.pauseMs = pauseMs
    this.csv = csv
  }

  /** Cartons, corners et fautes du match (CSV football-data.co.uk), s'ils existent. */
  private bonusCsv(match: MatchApi): MatchPasse['bonus'] {
    const c = COMPETITIONS.find(item => item.code === match.competition.code)
    return c ? this.csv?.bonus(c.name, match.utcDate.slice(0, 10), match.homeTeam.name, match.awayTeam.name) : undefined
  }

  private async appeler(url: URL): Promise<Response> {
    for (let essai = 0; essai < 2; essai++) {
      const attente = this.dernierAppel + this.pauseMs - Date.now()
      if (attente > 0) await new Promise(ok => setTimeout(ok, attente))
      this.dernierAppel = Date.now()
      const reponse = await this.fetcher(url, { headers: { 'X-Auth-Token': this.apiKey } })
      if (reponse.status !== 429 || essai === 1) return reponse
      await new Promise(ok => setTimeout(ok, 62_000)) // quota minute dépassé : on attend et on retente une fois
    }
    throw new Error('inatteignable')
  }

  private saisonCourante(): number {
    const d = new Date()
    return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1
  }

  private async request(path: string, params: Record<string, string>): Promise<MatchApi[]> {
    const url = new URL(this.baseUrl + path)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    const response = await this.appeler(url)
    const raw = await response.text()
    const body = JSON.parse(raw) as MatchesResponse & { message?: string }
    if (!response.ok) throw new Error(`football-data.org ${response.status} sur ${path}: ${body.message ?? 'réponse invalide'}`)
    return body.matches ?? []
  }

  /** Matchs terminés de toutes les compétitions suivies pour une saison (1 appel par compétition, mis en cache). */
  private async chargerSaison(annee: number): Promise<void> {
    for (const c of COMPETITIONS) {
      const cle = c.code + ':' + annee
      if (this.cache.has(cle)) continue
      try {
        this.cache.set(cle, await this.request('/competitions/' + c.code + '/matches', { season: String(annee), status: 'FINISHED' }))
      } catch (e) {
        if (!c.historiqueSeulement) throw e
        this.cache.set(cle, []) // compétition d'appoint indisponible : on s'en passe
      }
    }
    await this.csv?.chargerSaison(annee)
  }

  private termines(annees: number[], code?: CompetitionCode): MatchApi[] {
    const vus = new Set<number>()
    const out: MatchApi[] = []
    for (const annee of annees)
      for (const c of COMPETITIONS) {
        if (code && c.code !== code) continue
        for (const m of this.cache.get(c.code + ':' + annee) ?? []) {
          const h = m.score?.fullTime?.home
          const a = m.score?.fullTime?.away
          if (vus.has(m.id) || !FINISHED.has(m.status) || h == null || a == null) continue
          vus.add(m.id)
          out.push(m)
        }
      }
    return out
  }

  /** Les 10 derniers matchs de chaque équipe, toutes compétitions suivies confondues (utile pour la Ligue des champions). */
  private construireHistoriques(annees: number[], avantJour: string): Map<number, MatchPasse[]> {
    const h = new Map<number, MatchPasse[]>()
    for (const match of this.termines(annees)) {
      // Rétro-calcul honnête : on n'utilise que les matchs joués avant ce jour.
      if (match.utcDate.slice(0, 10) >= avantJour) continue
      const home = match.score!.fullTime!.home as number
      const away = match.score!.fullTime!.away as number
      const bonus = this.bonusCsv(match)
      const ajouter = (teamId: number, domicile: boolean) => {
        const liste = h.get(teamId) ?? []
        liste.push({ date: match.utcDate.slice(0, 10), domicile, buts_pour: domicile ? home : away, buts_contre: domicile ? away : home, ...(bonus ? { bonus } : {}) })
        h.set(teamId, liste)
      }
      ajouter(match.homeTeam.id, true)
      ajouter(match.awayTeam.id, false)
    }
    for (const [id, liste] of h) h.set(id, liste.sort((x, y) => y.date.localeCompare(x.date)).slice(0, 10))
    return h
  }

  /** Saison courante ; si une équipe a moins de 10 matchs (début de saison), on complète avec la saison précédente. */
  private async historiques(teamIds: number[], avantJour: string): Promise<Map<number, MatchPasse[]>> {
    const courante = this.saisonCourante()
    await this.chargerSaison(courante)
    let h = this.construireHistoriques([courante], avantJour)
    if (teamIds.some(id => (h.get(id)?.length ?? 0) < 5)) {
      await this.chargerSaison(courante - 1)
      h = this.construireHistoriques([courante, courante - 1], avantJour)
    }
    return h
  }

  async rencontres(jour: string): Promise<Rencontre[]> {
    const out: Rencontre[] = []
    const lendemain = new Date(jour + 'T00:00:00Z')
    lendemain.setUTCDate(lendemain.getUTCDate() + 1)
    const brut = await this.request('/matches', { competitions: AFFICHEES.map(item => item.code).join(','), dateFrom: jour, dateTo: lendemain.toISOString().slice(0, 10) })
    // La plage de dates peut déborder sur le lendemain : on ne garde que le jour demandé.
    const matches = brut.filter(match => match.utcDate.slice(0, 10) === jour)
    await this.csv?.chargerAVenir()
    const historiques = await this.historiques([...new Set(matches.flatMap(match => [match.homeTeam.id, match.awayTeam.id]))], jour)
    for (const match of matches) {
      const competition = COMPETITIONS.find(item => item.code === match.competition.code)
      if (!competition || competition.historiqueSeulement) continue
      out.push({
        match_id: String(match.id),
        date_heure: match.utcDate,
        competition: competition.name,
        domicile: this.equipe(match.homeTeam, historiques),
        exterieur: this.equipe(match.awayTeam, historiques),
        logos: { domicile: match.homeTeam.crest, exterieur: match.awayTeam.crest },
        cotes: this.csv?.cotes(competition.name, jour, match.homeTeam.name, match.awayTeam.name) ?? {},
      })
    }
    return out.sort((a, b) => a.date_heure.localeCompare(b.date_heure))
  }

  async contexte(competitionName: string, jour?: string): Promise<Contexte> {
    const competition = COMPETITIONS.find(item => item.name === competitionName)
    if (!competition) throw new Error('Compétition non configurée : ' + competitionName)
    const courante = this.saisonCourante()
    await this.chargerSaison(courante)
    const avant = (liste: MatchApi[]) => (jour ? liste.filter(m => m.utcDate.slice(0, 10) < jour) : liste)
    let matches = avant(this.termines([courante], competition.code))
    if (matches.length < 40) {
      // Début de saison : la moyenne de la ligue serait trop instable, on ajoute la saison précédente.
      await this.chargerSaison(courante - 1)
      matches = avant(this.termines([courante, courante - 1], competition.code))
    }
    const total = matches.length || 1
    const somme = (cote: 'home' | 'away') => matches.reduce((acc, m) => acc + (m.score?.fullTime?.[cote] ?? 0), 0)
    return { competition: competition.name, moy_buts_domicile: somme('home') / total || 1.5, moy_buts_exterieur: somme('away') / total || 1.2, moy_bonus: this.csv?.moyennes(competition.name, jour) ?? {} }
  }

  async resultat(matchId: string): Promise<ResultatReel | null> {
    await this.csv?.chargerSaison(this.saisonCourante())
    const response = await this.appeler(new URL(this.baseUrl + '/matches/' + encodeURIComponent(matchId)))
    if (response.status === 404) return null
    if (!response.ok) throw new Error('football-data.org ' + response.status + ' sur /matches/' + matchId)
    const match = (await response.json()) as MatchApi
    return this.resultatDepuisMatch(matchId, match)
  }

  async resultats(matchIds: string[]): Promise<Map<string, ResultatReel>> {
    await this.csv?.chargerSaison(this.saisonCourante())
    const ids = [...new Set(matchIds)].filter(Boolean)
    const out = new Map<string, ResultatReel>()
    for (let i = 0; i < ids.length; i += 150) {
      const matches = await this.request('/matches', { ids: ids.slice(i, i + 150).join(','), limit: '500' })
      for (const match of matches) {
        const id = String(match.id)
        out.set(id, this.resultatDepuisMatch(id, match))
      }
    }
    return out
  }

  private resultatDepuisMatch(matchId: string, match: MatchApi): ResultatReel {
    if (CANCELLED.has(match.status)) return { match_id: matchId, statut: 'annule' }
    if (!FINISHED.has(match.status)) return { match_id: matchId, statut: 'a_venir' }
    const home = match.score?.fullTime?.home
    const away = match.score?.fullTime?.away
    if (home === null || home === undefined || away === null || away === undefined) return { match_id: matchId, statut: 'annule' }
    const bonus = this.bonusCsv(match)
    return { match_id: matchId, statut: 'termine', score_domicile: home, score_exterieur: away, ...(bonus ? { bonus } : {}) }
  }

  private equipe(team: { id: number; name: string }, historiques: Map<number, MatchPasse[]>): Equipe {
    return { id: String(team.id), nom: team.name, matchs: historiques.get(team.id) ?? [] }
  }
}
