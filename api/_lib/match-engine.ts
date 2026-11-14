import type {
  Historique,
  JourHistorique,
  PeriodeHistorique,
  PilierId,
  Prediction,
  TauxPilier,
} from '../../src/domain/contracts.ts'
import { construireFiche } from '../../backend/src/engine/fiche.ts'
import { produireSynthese } from '../../backend/src/engine/synthese.ts'
import { evaluerFiche } from '../../backend/src/evaluate.ts'
import { memeEquipe, StatsCsv } from '../../backend/src/sources/stats-csv.ts'
import type { Contexte, Cotes, Interne, MatchPasse, Rencontre, ResultatReel } from '../../backend/src/types.ts'

export const JOUR_RE = /^\d{4}-\d{2}-\d{2}$/

const FD_BASE = 'https://api.football-data.org/v4'
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io'

const FD_COMP_CSV: Record<string, string> = {
  PL: 'Premier League',
  PD: 'Primera Division',
  SA: 'Serie A',
  BL1: 'Bundesliga',
  FL1: 'Ligue 1',
  PPL: 'Primeira Liga',
}

const FD_ALLOWED_CODES = new Set(['PL', 'PD', 'SA', 'BL1', 'FL1', 'PPL', 'CL', 'WC', 'EC'])

const COMP_NAME_CSV = ['Premier League', 'Primera Division', 'Serie A', 'Bundesliga', 'Ligue 1', 'Primeira Liga'] as const

const APIF_ALLOWED_COUNTRIES = new Set([
  'World',
  'Europe',
  'South America',
  'Africa',
  'Asia',
  'North America',
  'England',
  'Spain',
  'Italy',
  'Germany',
  'France',
  'Portugal',
  'Netherlands',
  'Brazil',
  'Argentina',
])

const APIF_EXCLUDED_RE = /\b(U1[5-9]|U2[0-3]|Women|Feminin|Femenina|Reserve|Reserves|II\b|B\b|C\b|Youth|Academy|Amateur|Regional|3\. Liga|National League|Segunda|Serie C|Serie D|Ligue 2|Eerste|2\. Bundesliga)\b/i

const APIF_MAJOR_RE = /(World Cup|Qualif|Nations League|Euro\b|Africa Cup|AFCON|CAN\b|Copa America|Friendlies|Champions League|Europa League|Conference League|Premier League|La Liga|Serie A|Bundesliga|Ligue 1|Primeira Liga|Eredivisie|Brasileirao|Copa Libertadores)/i

interface CacheEntry<T> {
  exp: number
  val: T
}

const cache = new Map<string, CacheEntry<unknown>>()

function cachedGet<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.exp) {
    cache.delete(key)
    return null
  }
  return entry.val as T
}

function cachedSet<T>(key: string, val: T, ttlMs: number): T {
  cache.set(key, { exp: Date.now() + ttlMs, val })
  return val
}

export function isoJour(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10)
}

export function addDays(jour: string, delta: number): string {
  const [y, m, d] = jour.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + delta))
  return dt.toISOString().slice(0, 10)
}

export function seasonStartYear(jour: string): number {
  const [y, m] = jour.split('-').map(Number)
  return m >= 7 ? y : y - 1
}

type FdTeam = { id?: number; name?: string; shortName?: string; crest?: string }
type FdMatch = {
  id: number
  utcDate: string
  status: string
  competition?: { code?: string; name?: string }
  homeTeam?: FdTeam
  awayTeam?: FdTeam
  score?: {
    fullTime?: { home?: number | null; away?: number | null }
  }
}

type ApifFixture = {
  fixture?: { id?: number; date?: string; status?: { short?: string } }
  league?: { id?: number; name?: string; country?: string }
  teams?: {
    home?: { id?: number; name?: string; logo?: string }
    away?: { id?: number; name?: string; logo?: string }
  }
  goals?: { home?: number | null; away?: number | null }
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}, timeoutMs = 10_000): Promise<T | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function fetchFdMatches(dateFrom: string, dateTo: string, fdKey?: string): Promise<FdMatch[]> {
  if (!fdKey) return []
  // football-data.org traite dateTo comme borne exclusive : pour [dateFrom, dateTo], demander +1 jour.
  const apiDateTo = dateTo <= dateFrom ? addDays(dateFrom, 1) : addDays(dateTo, 1)
  const cacheKey = `fd:matches:${dateFrom}:${apiDateTo}`
  const hit = cachedGet<FdMatch[]>(cacheKey)
  if (hit) return hit

  const data = await fetchJson<{ matches?: FdMatch[] }>(
    `${FD_BASE}/matches?dateFrom=${dateFrom}&dateTo=${apiDateTo}`,
    { 'X-Auth-Token': fdKey },
    10_000,
  )
  const list = (data?.matches ?? []).filter(m => {
    const code = m.competition?.code ?? ''
    if (code && !FD_ALLOWED_CODES.has(code)) return false
    const d = (m.utcDate ?? '').slice(0, 10)
    return d >= dateFrom && d <= dateTo
  })
  return cachedSet(cacheKey, list, 5 * 60_000)
}

async function fetchFdTeamFinishedMatches(teamId: number, fdKey?: string): Promise<FdMatch[]> {
  if (!fdKey) return []
  const cacheKey = `fd:team:${teamId}`
  const hit = cachedGet<FdMatch[]>(cacheKey)
  if (hit) return hit
  const data = await fetchJson<{ matches?: FdMatch[] }>(
    `${FD_BASE}/teams/${teamId}/matches?status=FINISHED&limit=10`,
    { 'X-Auth-Token': fdKey },
    8_000,
  )
  return cachedSet(cacheKey, data?.matches ?? [], 30 * 60_000)
}

async function fetchFdCompetitionFinished(compCode: string, fdKey?: string): Promise<FdMatch[]> {
  if (!fdKey) return []
  const cacheKey = `fd:comp:${compCode}`
  const hit = cachedGet<FdMatch[]>(cacheKey)
  if (hit) return hit
  const data = await fetchJson<{ matches?: FdMatch[] }>(
    `${FD_BASE}/competitions/${compCode}/matches?status=FINISHED`,
    { 'X-Auth-Token': fdKey },
    10_000,
  )
  return cachedSet(cacheKey, data?.matches ?? [], 30 * 60_000)
}

function fdMatchesToPasses(teamId: number, matches: FdMatch[], avantJour?: string): MatchPasse[] {
  const out: MatchPasse[] = []
  for (const m of matches) {
    if (m.status !== 'FINISHED') continue
    const date = (m.utcDate ?? '').slice(0, 10)
    if (!date || (avantJour && date >= avantJour)) continue
    const h = m.score?.fullTime?.home
    const a = m.score?.fullTime?.away
    if (typeof h !== 'number' || typeof a !== 'number') continue
    const dom = m.homeTeam?.id === teamId
    const ext = m.awayTeam?.id === teamId
    if (!dom && !ext) continue
    out.push({
      date,
      domicile: dom,
      buts_pour: dom ? h : a,
      buts_contre: dom ? a : h,
    })
  }
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

async function getStatsForCompetitions(comps: string[], year: number, includeUpcoming: boolean): Promise<StatsCsv> {
  const sorted = [...new Set(comps.filter(Boolean))].sort().join(',')
  const cacheKey = `csv:${year}:${sorted}:${includeUpcoming ? 1 : 0}`
  const hit = cachedGet<StatsCsv>(cacheKey)
  if (hit) return hit

  const stats = new StatsCsv()
  await Promise.all([
    ...comps.map(c => stats.chargerCompetition(c, year)),
    ...(includeUpcoming ? [stats.chargerAVenir()] : []),
  ])
  return cachedSet(cacheKey, stats, includeUpcoming ? 15 * 60_000 : 60 * 60_000)
}

function applyMatchResult(
  fiche: Prediction,
  interne: Interne | null,
  opts: {
    status: string
    homeGoals?: number | null
    awayGoals?: number | null
    bonus?: ResultatReel['bonus']
  },
): void {
  const s = opts.status.toUpperCase()
  const isFinished = s === 'FINISHED' || s === 'AWARDED' || s === 'FT' || s === 'AET' || s === 'PEN'
  const isCancelled = s === 'CANCELLED' || s === 'CANC' || s === 'ABD'
  const hasGoals = typeof opts.homeGoals === 'number' && typeof opts.awayGoals === 'number'

  if (isCancelled) {
    const ev = evaluerFiche(interne, { match_id: fiche.match_id, statut: 'annule' })
    if (ev) fiche.resultat = ev
    return
  }
  if (isFinished && hasGoals) {
    const ev = evaluerFiche(interne, {
      match_id: fiche.match_id,
      statut: 'termine',
      score_domicile: opts.homeGoals!,
      score_exterieur: opts.awayGoals!,
      bonus: opts.bonus,
    })
    if (ev) fiche.resultat = ev
    return
  }
  if ((s === 'IN_PLAY' || s === 'PAUSED' || s === 'LIVE' || s === '1H' || s === 'HT' || s === '2H' || s === 'ET') && hasGoals) {
    fiche.resultat = {
      ...fiche.resultat,
      score_final: `${opts.homeGoals}-${opts.awayGoals}`,
    }
  }
}

// ---------- API-Football (international break fallback + bookmakers) ----------

function apifHasError(data: { errors?: unknown } | null): boolean {
  if (!data || !data.errors) return false
  if (Array.isArray(data.errors)) return data.errors.length > 0
  if (typeof data.errors === 'object') return Object.keys(data.errors as Record<string, unknown>).length > 0
  return true
}

async function fetchApifFixtures(jour: string, apiKey?: string): Promise<ApifFixture[]> {
  if (!apiKey) return []
  const cacheKey = `apif:fixtures:${jour}`
  const hit = cachedGet<ApifFixture[]>(cacheKey)
  if (hit) return hit
  const data = await fetchJson<{ errors?: unknown; response?: ApifFixture[] }>(
    `${API_FOOTBALL_BASE}/fixtures?date=${jour}`,
    { 'x-apisports-key': apiKey },
    10_000,
  )
  const list = data?.response ?? []
  if (apifHasError(data) || list.length === 0) return list
  return cachedSet(cacheKey, list, 60 * 60_000)
}

interface ApifBookmakerOdds {
  sourceName: string
  cotes: Cotes
}

function parseOddNum(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) && n > 1.01 ? Math.round(n * 100) / 100 : undefined
}

async function fetchApifOddsForFixture(fixtureId: number, apiKey?: string): Promise<ApifBookmakerOdds | null> {
  if (!apiKey) return null
  const cacheKey = `apif:odds:${fixtureId}`
  const hit = cachedGet<ApifBookmakerOdds | null>(cacheKey)
  if (hit !== null) return hit

  type OddsResp = {
    errors?: unknown
    response?: Array<{
      bookmakers?: Array<{
        id?: number
        name?: string
        bets?: Array<{ name?: string; values?: Array<{ value?: string; odd?: string }> }>
      }>
    }>
  }
  const data = await fetchJson<OddsResp>(
    `${API_FOOTBALL_BASE}/odds?fixture=${fixtureId}`,
    { 'x-apisports-key': apiKey },
    8_000,
  )
  if (apifHasError(data)) return null
  const bookmakers = data?.response?.[0]?.bookmakers ?? []
  if (bookmakers.length === 0) return cachedSet(cacheKey, null, 15 * 60_000)

  const prefOrder = ['1xBet', 'Bet365', 'Pinnacle', 'Unibet', 'Bwin']
  const ordered = [...bookmakers].sort((a, b) => {
    const ia = prefOrder.findIndex(p => (a.name ?? '').toLowerCase().includes(p.toLowerCase()))
    const ib = prefOrder.findIndex(p => (b.name ?? '').toLowerCase().includes(p.toLowerCase()))
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  const chosen = ordered[0]
  const cotes: Cotes = {}
  for (const bet of chosen?.bets ?? []) {
    const bName = (bet.name ?? '').toLowerCase()
    if (bName === 'match winner' || bName === 'home/away' || bName.includes('1x2')) {
      for (const v of bet.values ?? []) {
        const odd = parseOddNum(v.odd)
        if (!odd) continue
        if (v.value === 'Home') cotes['1'] = odd
        else if (v.value === 'Draw') cotes.N = odd
        else if (v.value === 'Away') cotes['2'] = odd
      }
    } else if (bName.includes('double chance')) {
      for (const v of bet.values ?? []) {
        const odd = parseOddNum(v.odd)
        if (!odd) continue
        if (v.value === 'Home/Draw') cotes['1X'] = odd
        else if (v.value === 'Draw/Away') cotes.X2 = odd
        else if (v.value === 'Home/Away') cotes['12'] = odd
      }
    } else if (bName.includes('goals over/under')) {
      for (const v of bet.values ?? []) {
        const odd = parseOddNum(v.odd)
        if (!odd) continue
        if (v.value === 'Over 2.5') cotes['O2.5'] = odd
        else if (v.value === 'Under 2.5') cotes['U2.5'] = odd
        else if (v.value === 'Over 1.5') cotes['O1.5'] = odd
        else if (v.value === 'Under 3.5') cotes['U3.5'] = odd
      }
    } else if (bName.includes('both teams score')) {
      for (const v of bet.values ?? []) {
        const odd = parseOddNum(v.odd)
        if (!odd) continue
        if (v.value === 'Yes') cotes.BTTS = odd
      }
    }
  }

  if (cotes['1'] && cotes.N && cotes['2']) {
    const r2 = (n: number) => Math.round(n * 100) / 100
    cotes['1X'] ??= r2(1 / (1 / cotes['1'] + 1 / cotes.N))
    cotes.X2 ??= r2(1 / (1 / cotes.N + 1 / cotes['2']))
    cotes['12'] ??= r2(1 / (1 / cotes['1'] + 1 / cotes['2']))
  }

  return cachedSet(cacheKey, { sourceName: chosen?.name || 'Bookmakers', cotes }, 4 * 60 * 60_000)
}

type ApifPredictionData = {
  predictions?: { percent?: { home?: string; draw?: string; away?: string } }
  teams?: {
    home?: { last_5?: { goals?: { for?: { average?: string }; against?: { average?: string } } }; league?: { form?: string } }
    away?: { last_5?: { goals?: { for?: { average?: string }; against?: { average?: string } } }; league?: { form?: string } }
  }
}

async function fetchApifPrediction(fixtureId: number, apiKey?: string): Promise<ApifPredictionData | null> {
  if (!apiKey) return null
  const cacheKey = `apif:pred:${fixtureId}`
  const hit = cachedGet<ApifPredictionData | null>(cacheKey)
  if (hit !== null) return hit
  const data = await fetchJson<{ errors?: unknown; response?: ApifPredictionData[] }>(
    `${API_FOOTBALL_BASE}/predictions?fixture=${fixtureId}`,
    { 'x-apisports-key': apiKey },
    8_000,
  )
  if (apifHasError(data)) return null
  return cachedSet(cacheKey, data?.response?.[0] ?? null, 4 * 60 * 60_000)
}

function apifScore(f: ApifFixture): number {
  const name = `${f.league?.country ?? ''} · ${f.league?.name ?? ''}`
  if (APIF_EXCLUDED_RE.test(name)) return -1
  let s = 0
  if (APIF_MAJOR_RE.test(f.league?.name ?? '')) s += 50
  if (f.league?.country === 'World' || f.league?.country === 'Europe' || f.league?.country === 'South America') s += 30
  if (APIF_ALLOWED_COUNTRIES.has(f.league?.country ?? '')) s += 10
  return s
}

function parseFormLetters(str?: string): MatchPasse[] {
  const clean = (str ?? '').replace(/[^WDL]/g, '').slice(-5)
  const today = isoJour()
  return [...clean].reverse().map((c, idx) => ({
    date: addDays(today, -(idx + 1) * 4),
    domicile: idx % 2 === 0,
    buts_pour: c === 'W' ? 2 : c === 'D' ? 1 : 0,
    buts_contre: c === 'W' ? 0 : c === 'D' ? 1 : 2,
  }))
}

async function buildFromApifFixture(f: ApifFixture, apiKey?: string, now: Date = new Date()): Promise<Prediction | null> {
  const id = f.fixture?.id
  const dom = f.teams?.home?.name
  const ext = f.teams?.away?.name
  const dateHeure = f.fixture?.date
  if (!id || !dom || !ext || !dateHeure) return null

  const short = f.fixture?.status?.short ?? 'NS'
  const [oddsData, predData] = await Promise.all([
    fetchApifOddsForFixture(id, apiKey),
    fetchApifPrediction(id, apiKey),
  ])

  let domMatchs = parseFormLetters(predData?.teams?.home?.league?.form)
  let extMatchs = parseFormLetters(predData?.teams?.away?.league?.form)

  const avgGfH = Number(predData?.teams?.home?.last_5?.goals?.for?.average)
  const avgGaH = Number(predData?.teams?.home?.last_5?.goals?.against?.average)
  const avgGfA = Number(predData?.teams?.away?.last_5?.goals?.for?.average)
  const avgGaA = Number(predData?.teams?.away?.last_5?.goals?.against?.average)

  if (Number.isFinite(avgGfH) && Number.isFinite(avgGaH) && domMatchs.length >= 4) {
    domMatchs = domMatchs.map((m, idx) => ({
      ...m,
      buts_pour: Math.max(0, Math.round(avgGfH + (idx === 0 ? 0.2 : 0))),
      buts_contre: Math.max(0, Math.round(avgGaH)),
    }))
  }
  if (Number.isFinite(avgGfA) && Number.isFinite(avgGaA) && extMatchs.length >= 4) {
    extMatchs = extMatchs.map((m, idx) => ({
      ...m,
      buts_pour: Math.max(0, Math.round(avgGfA + (idx === 0 ? 0.2 : 0))),
      buts_contre: Math.max(0, Math.round(avgGaA)),
    }))
  }

  const compLabel = f.league?.name || 'Compétition internationale'
  const r: Rencontre = {
    match_id: `apif-${id}`,
    competition: compLabel,
    date_heure: dateHeure,
    domicile: { id: String(f.teams?.home?.id ?? dom), nom: dom, matchs: domMatchs },
    exterieur: { id: String(f.teams?.away?.id ?? ext), nom: ext, matchs: extMatchs },
    logos: { domicile: f.teams?.home?.logo, exterieur: f.teams?.away?.logo },
    cotes: oddsData?.cotes ?? {},
  }

  const ctx: Contexte = {
    competition: compLabel,
    moy_buts_domicile: 1.45,
    moy_buts_exterieur: 1.15,
    moy_bonus: {},
  }

  const { fiche, interne } = construireFiche(
    r,
    ctx,
    { nom: 'API-Football', nomCotes: oddsData?.sourceName ?? 'Cotes bookmakers' },
    now,
  )
  applyMatchResult(fiche, interne, { status: short, homeGoals: f.goals?.home, awayGoals: f.goals?.away })
  if (fiche.pronostics) {
    fiche.synthese = await produireSynthese(fiche, {})
  }
  return fiche
}

// ---------- Moteur principal matches (football-data.org + StatsCsv) ----------

function compDisplayName(m: FdMatch): string {
  const code = m.competition?.code ?? ''
  return FD_COMP_CSV[code] ?? m.competition?.name ?? 'Compétition'
}

function buildFdRencontreAndContext(
  m: FdMatch,
  jour: string,
  stats: StatsCsv,
  domMatchs: MatchPasse[],
  extMatchs: MatchPasse[],
  cotes: Cotes,
): { r: Rencontre; ctx: Contexte; comp: string; csvComp?: string } {
  const domName = m.homeTeam?.name ?? m.homeTeam?.shortName ?? ''
  const extName = m.awayTeam?.name ?? m.awayTeam?.shortName ?? ''
  const comp = compDisplayName(m)
  const csvComp = FD_COMP_CSV[m.competition?.code ?? '']
  const moyButs = (csvComp ? stats.moyennesButs(csvComp, jour) : null) ?? { domicile: 1.5, exterieur: 1.2 }
  const moyBonus = csvComp ? stats.moyennes(csvComp, jour) : {}

  const r: Rencontre = {
    match_id: String(m.id),
    competition: comp,
    date_heure: m.utcDate,
    domicile: { id: String(m.homeTeam?.id ?? domName), nom: domName, matchs: domMatchs },
    exterieur: { id: String(m.awayTeam?.id ?? extName), nom: extName, matchs: extMatchs },
    logos: { domicile: m.homeTeam?.crest, exterieur: m.awayTeam?.crest },
    cotes,
  }
  const ctx: Contexte = {
    competition: comp,
    moy_buts_domicile: moyButs.domicile,
    moy_buts_exterieur: moyButs.exterieur,
    moy_bonus: moyBonus,
  }
  return { r, ctx, comp, csvComp }
}

export async function getMatchesForDay(jour: string, env: Record<string, string | undefined>): Promise<Prediction[]> {
  const now = new Date()
  const today = isoJour(now)
  const fdKey = env.FOOTBALL_DATA_KEY?.trim()
  const apifKey = env.API_FOOTBALL_KEY?.trim()

  const fdMatches = await fetchFdMatches(jour, jour, fdKey)

  if (fdMatches.length > 0) {
    const csvComps = [...new Set(fdMatches.map(m => FD_COMP_CSV[m.competition?.code ?? '']).filter((x): x is string => Boolean(x)))]
    const hasCl = fdMatches.some(m => m.competition?.code === 'CL')
    const neededCsv = hasCl ? [...COMP_NAME_CSV] : csvComps

    const [stats, clFinished] = await Promise.all([
      getStatsForCompetitions(neededCsv, seasonStartYear(jour), jour >= today),
      hasCl ? fetchFdCompetitionFinished('CL', fdKey) : Promise.resolve([]),
    ])

    let apifPool: ApifFixture[] | null = null
    const fiches: Prediction[] = []
    let apifOddsUsed = 0

    for (const m of fdMatches) {
      const domName = m.homeTeam?.name ?? m.homeTeam?.shortName ?? ''
      const extName = m.awayTeam?.name ?? m.awayTeam?.shortName ?? ''
      if (!domName || !extName) continue

      const csvComp = FD_COMP_CSV[m.competition?.code ?? '']
      let domMatchs = stats.matchsEquipe(domName, jour, 10)
      let extMatchs = stats.matchsEquipe(extName, jour, 10)

      if (m.competition?.code === 'CL' && clFinished.length > 0) {
        if (domMatchs.length < 4 && m.homeTeam?.id) {
          domMatchs = [...domMatchs, ...fdMatchesToPasses(m.homeTeam.id, clFinished, jour)].slice(0, 10)
        }
        if (extMatchs.length < 4 && m.awayTeam?.id) {
          extMatchs = [...extMatchs, ...fdMatchesToPasses(m.awayTeam.id, clFinished, jour)].slice(0, 10)
        }
      }

      let cotes: Cotes = csvComp ? stats.cotes(csvComp, jour, domName, extName) : {}
      let nomCotes = 'football-data.co.uk'

      if (Object.keys(cotes).length === 0 && apifKey && jour >= today && apifOddsUsed < 5) {
        if (apifPool === null) apifPool = await fetchApifFixtures(jour, apifKey)
        const hit = apifPool.find(
          f => memeEquipe(f.teams?.home?.name ?? '', domName) && memeEquipe(f.teams?.away?.name ?? '', extName),
        )
        if (hit?.fixture?.id) {
          apifOddsUsed++
          const apifOdds = await fetchApifOddsForFixture(hit.fixture.id, apifKey)
          if (apifOdds && Object.keys(apifOdds.cotes).length > 0) {
            cotes = apifOdds.cotes
            nomCotes = apifOdds.sourceName
          }
        }
      }

      const { r, ctx } = buildFdRencontreAndContext(m, jour, stats, domMatchs, extMatchs, cotes)
      const { fiche, interne } = construireFiche(r, ctx, { nom: 'football-data.org + football-data.co.uk', nomCotes }, now)
      const csvBonus = csvComp ? stats.bonus(csvComp, jour, domName, extName) : undefined
      applyMatchResult(fiche, interne, {
        status: m.status,
        homeGoals: m.score?.fullTime?.home,
        awayGoals: m.score?.fullTime?.away,
        bonus: csvBonus,
      })
      if (fiche.pronostics) {
        fiche.synthese = await produireSynthese(fiche, {})
      }
      fiches.push(fiche)
    }

    return fiches.sort((a, b) => a.date_heure.localeCompare(b.date_heure))
  }

  // Fallback trêve internationale / coupes : API-Football affiches majeures (plafond 4 matchs = 9 req max <= 10 req/min)
  if (!apifKey) return []
  const rawApif = await fetchApifFixtures(jour, apifKey)
  const selected = rawApif
    .map(f => ({ f, score: apifScore(f) }))
    .filter(x => x.score >= 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(x => x.f)

  const fiches = (await Promise.all(selected.map(f => buildFromApifFixture(f, apifKey, now)))).filter(
    (x): x is Prediction => x !== null,
  )
  return fiches.sort((a, b) => a.date_heure.localeCompare(b.date_heure))
}

export async function getMatchById(id: string, env: Record<string, string | undefined>): Promise<Prediction | null> {
  const hit = cachedGet<Prediction>(`match:${id}`)
  if (hit) return hit

  const now = new Date()
  const fdKey = env.FOOTBALL_DATA_KEY?.trim()
  const apifKey = env.API_FOOTBALL_KEY?.trim()

  if (id.startsWith('apif-') && apifKey) {
    const rawId = Number(id.replace('apif-', ''))
    if (!Number.isFinite(rawId)) return null
    const data = await fetchJson<{ errors?: unknown; response?: ApifFixture[] }>(
      `${API_FOOTBALL_BASE}/fixtures?id=${rawId}`,
      { 'x-apisports-key': apifKey },
      8_000,
    )
    let f = !apifHasError(data) ? data?.response?.[0] : undefined
    if (!f) {
      const todayPool = await fetchApifFixtures(isoJour(now), apifKey)
      f = todayPool.find(item => item.fixture?.id === rawId)
    }
    if (!f) return null
    const fiche = await buildFromApifFixture(f, apifKey, now)
    return fiche ? cachedSet(`match:${id}`, fiche, 5 * 60_000) : null
  }

  if (!fdKey) return null
  const m = await fetchJson<FdMatch>(`${FD_BASE}/matches/${encodeURIComponent(id)}`, { 'X-Auth-Token': fdKey }, 10_000)
  if (!m || !m.homeTeam?.name || !m.awayTeam?.name) return null

  const jour = (m.utcDate ?? isoJour(now)).slice(0, 10)
  const csvComp = FD_COMP_CSV[m.competition?.code ?? '']
  const neededCsv = csvComp ? [csvComp] : [...COMP_NAME_CSV]

  const [stats, fdDom, fdExt] = await Promise.all([
    getStatsForCompetitions(neededCsv, seasonStartYear(jour), jour >= isoJour(now)),
    m.homeTeam.id ? fetchFdTeamFinishedMatches(m.homeTeam.id, fdKey) : Promise.resolve([]),
    m.awayTeam.id ? fetchFdTeamFinishedMatches(m.awayTeam.id, fdKey) : Promise.resolve([]),
  ])

  const domCsv = stats.matchsEquipe(m.homeTeam.name, jour, 10)
  const extCsv = stats.matchsEquipe(m.awayTeam.name, jour, 10)
  const domMatchs = domCsv.length >= 4 ? domCsv : m.homeTeam.id ? fdMatchesToPasses(m.homeTeam.id, fdDom, jour) : domCsv
  const extMatchs = extCsv.length >= 4 ? extCsv : m.awayTeam.id ? fdMatchesToPasses(m.awayTeam.id, fdExt, jour) : extCsv

  let cotes: Cotes = csvComp ? stats.cotes(csvComp, jour, m.homeTeam.name, m.awayTeam.name) : {}
  let nomCotes = 'football-data.co.uk'

  if (Object.keys(cotes).length === 0 && apifKey && jour >= isoJour(now)) {
    const apifPool = await fetchApifFixtures(jour, apifKey)
    const hit = apifPool.find(
      f =>
        memeEquipe(f.teams?.home?.name ?? '', m.homeTeam?.name ?? '') &&
        memeEquipe(f.teams?.away?.name ?? '', m.awayTeam?.name ?? ''),
    )
    if (hit?.fixture?.id) {
      const apifOdds = await fetchApifOddsForFixture(hit.fixture.id, apifKey)
      if (apifOdds && Object.keys(apifOdds.cotes).length > 0) {
        cotes = apifOdds.cotes
        nomCotes = apifOdds.sourceName
      }
    }
  }

  const { r, ctx } = buildFdRencontreAndContext(m, jour, stats, domMatchs, extMatchs, cotes)
  const { fiche, interne } = construireFiche(r, ctx, { nom: 'football-data.org + football-data.co.uk', nomCotes }, now)
  const csvBonus = csvComp ? stats.bonus(csvComp, jour, m.homeTeam.name, m.awayTeam.name) : undefined
  applyMatchResult(fiche, interne, {
    status: m.status,
    homeGoals: m.score?.fullTime?.home,
    awayGoals: m.score?.fullTime?.away,
    bonus: csvBonus,
  })
  if (fiche.pronostics) {
    fiche.synthese = await produireSynthese(fiche, {})
  }
  return fiche
}

export async function findNextMatchday(
  fromJour: string,
  env: Record<string, string | undefined>,
): Promise<{ date: string | null; matchs: Prediction[] }> {
  const fdKey = env.FOOTBALL_DATA_KEY
  if (fdKey) {
    const end = addDays(fromJour, 8)
    const list = await fetchFdMatches(fromJour, end, fdKey)
    const dates = [...new Set(list.map(m => (m.utcDate ?? '').slice(0, 10)).filter(Boolean))].sort()
    if (dates.length > 0) {
      const nextDate = dates[0]
      return { date: nextDate, matchs: await getMatchesForDay(nextDate, env) }
    }
    const start2 = addDays(fromJour, 9)
    const end2 = addDays(fromJour, 17)
    const list2 = await fetchFdMatches(start2, end2, fdKey)
    const dates2 = [...new Set(list2.map(m => (m.utcDate ?? '').slice(0, 10)).filter(Boolean))].sort()
    if (dates2.length > 0) {
      const nextDate = dates2[0]
      return { date: nextDate, matchs: await getMatchesForDay(nextDate, env) }
    }
  }

  for (let offset = 0; offset <= 2; offset++) {
    const d = addDays(fromJour, offset)
    const dayMatches = await getMatchesForDay(d, env)
    if (dayMatches.length > 0) return { date: d, matchs: dayMatches }
  }
  return { date: null, matchs: [] }
}

// ---------- Historique honnête rétro-calculé sur CSV (zéro fuite future) ----------

interface CsvRowMatch {
  comp: string
  date: string
  dom: string
  ext: string
  butsDom: number
  butsExt: number
  bonus?: NonNullable<ResultatReel['bonus']>
  cotes: Cotes
}

const DIV_NAME: Record<string, string> = {
  E0: 'Premier League',
  SP1: 'Primera Division',
  I1: 'Serie A',
  D1: 'Bundesliga',
  F1: 'Ligue 1',
  P1: 'Primeira Liga',
}

export async function buildRealHistorique(
  periode: PeriodeHistorique,
  env: Record<string, string | undefined>,
  maintenant: Date = new Date(),
): Promise<Historique> {
  const au = isoJour(maintenant)
  const delta = periode === '7j' ? 7 : periode === '30j' ? 30 : 120
  const du = addDays(au, -delta)

  const stats = await getStatsForCompetitions([...COMP_NAME_CSV], seasonStartYear(au), false)

  const finished: CsvRowMatch[] = []
  for (const [div, rows] of stats.toutesDivisions.entries()) {
    const comp = DIV_NAME[div] ?? div
    for (const row of rows) {
      if (row.butsDom === undefined || row.butsExt === undefined) continue
      if (row.date < du || row.date >= au) continue
      finished.push({
        comp,
        date: row.date,
        dom: row.dom,
        ext: row.ext,
        butsDom: row.butsDom,
        butsExt: row.butsExt,
        bonus: row.bonus,
        cotes: row.cotes,
      })
    }
  }

  const crestMap = new Map<string, string>()
  if (env.FOOTBALL_DATA_KEY) {
    const fdRecent = await fetchFdMatches(addDays(au, -9), au, env.FOOTBALL_DATA_KEY)
    for (const m of fdRecent) {
      if (m.homeTeam?.name && m.homeTeam.crest) crestMap.set(m.homeTeam.name.toLowerCase(), m.homeTeam.crest)
      if (m.awayTeam?.name && m.awayTeam.crest) crestMap.set(m.awayTeam.name.toLowerCase(), m.awayTeam.crest)
    }
  }

  const findCrest = (teamName: string): string | undefined => {
    for (const [k, url] of crestMap.entries()) {
      if (memeEquipe(teamName, k)) return url
    }
    return undefined
  }

  const recentMatches = finished
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, periode === '7j' ? 40 : periode === '30j' ? 90 : 120)

  const parJourMap = new Map<string, Prediction[]>()
  const taux: Record<PilierId, TauxPilier> = {
    issue: { reussis: 0, total: 0 },
    buts: { reussis: 0, total: 0 },
    bonus: { reussis: 0, total: 0 },
    scores: { reussis: 0, total: 0 },
  }

  const comptabiliser = (p: PilierId, v: boolean | null): void => {
    if (v === null) return
    taux[p].total++
    if (v) taux[p].reussis++
  }

  for (const row of recentMatches) {
    const domMatchs = stats.matchsEquipe(row.dom, row.date, 10)
    const extMatchs = stats.matchsEquipe(row.ext, row.date, 10)
    if (domMatchs.length < 4 || extMatchs.length < 4) continue

    const moyButs = stats.moyennesButs(row.comp, row.date) ?? { domicile: 1.5, exterieur: 1.2 }
    const moyBonus = stats.moyennes(row.comp, row.date)
    const matchId = `hist-${row.date}-${row.dom.replace(/\s+/g, '')}-${row.ext.replace(/\s+/g, '')}`

    const r: Rencontre = {
      match_id: matchId,
      competition: row.comp,
      date_heure: `${row.date}T19:00:00Z`,
      domicile: { id: row.dom, nom: row.dom, matchs: domMatchs },
      exterieur: { id: row.ext, nom: row.ext, matchs: extMatchs },
      logos: { domicile: findCrest(row.dom), exterieur: findCrest(row.ext) },
      cotes: row.cotes,
    }
    const ctx: Contexte = {
      competition: row.comp,
      moy_buts_domicile: moyButs.domicile,
      moy_buts_exterieur: moyButs.exterieur,
      moy_bonus: moyBonus,
    }

    const { fiche, interne } = construireFiche(
      r,
      ctx,
      { nom: 'football-data.co.uk (rétro-calcul)', nomCotes: 'football-data.co.uk' },
      new Date(`${row.date}T08:00:00Z`),
    )
    fiche.meta.retrocalcul = true
    const ev = evaluerFiche(interne, {
      match_id: matchId,
      statut: 'termine',
      score_domicile: row.butsDom,
      score_exterieur: row.butsExt,
      bonus: row.bonus,
    })
    if (ev) {
      fiche.resultat = ev
      if (ev.statut === 'evalue') {
        comptabiliser('issue', ev.issue)
        comptabiliser('buts', ev.buts)
        comptabiliser('bonus', ev.bonus)
        comptabiliser('scores', ev.score)
      }
    }

    const list = parJourMap.get(row.date) ?? []
    list.push(fiche)
    parJourMap.set(row.date, list)
  }

  const jours: JourHistorique[] = [...parJourMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([jour, matchs]) => ({ jour, matchs }))

  return {
    periode,
    mis_a_jour_le: maintenant.toISOString(),
    taux,
    jours,
  }
}
