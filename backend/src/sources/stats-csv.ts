import type { CategorieBonus, Cotes } from '../types.ts'

/**
 * Complément gratuit : les fichiers CSV de football-data.co.uk (sans clé).
 * Ils apportent ce que football-data.org ne donne pas : cartons, corners, fautes (donc le Bonus)
 * et les cotes moyennes des bookmakers. Les noms d'équipes diffèrent d'une source à l'autre :
 * on rapproche les deux par la date (±1 jour) et par le nom (voir `memeEquipe`).
 * Toute erreur de téléchargement est tolérée : l'app fonctionne alors sans Bonus ni cotes.
 */

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>
type Bonus = Partial<Record<CategorieBonus, number>>

export interface LigneCsv {
  date: string
  dom: string
  ext: string
  bonus?: Bonus
  cotes: Cotes
}

const BASE = 'https://www.football-data.co.uk'
/** Compétition (nom utilisé par l'app) → division du CSV. La Ligue des champions n'y figure pas. */
const DIVISIONS: Record<string, string> = {
  'Premier League': 'E0',
  'Primera Division': 'SP1',
  'Serie A': 'I1',
  Bundesliga: 'D1',
  'Ligue 1': 'F1',
  'Primeira Liga': 'P1',
}
const MIN_MATCHS_MOYENNE = 30

export function parseCsv(texte: string): Array<Record<string, string>> {
  const lignes: string[][] = []
  let champ = ''
  let ligne: string[] = []
  let guillemets = false
  const t = texte.replace(/^\uFEFF/, '')
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (guillemets) {
      if (c === '"' && t[i + 1] === '"') { champ += '"'; i++ }
      else if (c === '"') guillemets = false
      else champ += c
    } else if (c === '"') guillemets = true
    else if (c === ',') { ligne.push(champ); champ = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      ligne.push(champ); champ = ''
      if (ligne.some(x => x !== '')) lignes.push(ligne)
      ligne = []
    } else champ += c
  }
  ligne.push(champ)
  if (ligne.some(x => x !== '')) lignes.push(ligne)
  const entete = (lignes[0] ?? []).map(x => x.trim())
  return lignes.slice(1).map(l => Object.fromEntries(entete.map((nom, i) => [nom, (l[i] ?? '').trim()])))
}

// ---------- rapprochement des noms d'équipes ----------

const MOTS_VIDES = new Set(['fc', 'afc', 'cf', 'ac', 'as', 'sc', 'ssc', 'us', 'rc', 'rcd', 'ud', 'cd', 'ca', 'sd', 'club', 'de', 'la', 'le', 'el', 'the', 'fsv', 'vfb', 'vfl', 'tsg', 'sv', 'bsc', 'fk', 'og', 'ogc', 'ss', 'sl', 'se', 'calcio', 'balompie', 'futbol'])
/** Nom CSV normalisé → nom football-data.org normalisé, quand le préfixe ne suffit pas. */
const ALIAS: Record<string, string> = {
  wolves: 'wolverhampton wanderers',
  'nottm forest': 'nottingham forest',
  spurs: 'tottenham hotspur',
  'ath madrid': 'atletico madrid',
  'ath bilbao': 'athletic',
  espanol: 'espanyol barcelona',
  'paris sg': 'paris saint germain',
  mgladbach: 'borussia monchengladbach',
  'bayern munich': 'bayern munchen',
  'sp lisbon': 'sporting clube portugal',
  'sp braga': 'sporting braga',
  rennes: 'stade rennais',
  guimaraes: 'vitoria',
}

export function jetons(nom: string): string[] {
  return nom
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(m => m && !MOTS_VIDES.has(m) && !/^\d+$/.test(m))
}

/** Vrai si les deux noms désignent la même équipe : chaque mot du nom le plus court est le début d'un mot de l'autre. */
export function memeEquipe(nomCsv: string, nomApi: string): boolean {
  const brut = jetons(nomCsv).join(' ')
  const a = (ALIAS[brut] ?? brut).split(' ').filter(Boolean)
  const b = jetons(nomApi)
  if (a.length === 0 || b.length === 0) return false
  const [court, long] = a.length <= b.length ? [a, b] : [b, a]
  return court.every(m => long.some(x => (m.length >= 3 ? x.startsWith(m) : x === m)))
}

// ---------- lecture des lignes ----------

function dateIso(brut: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(brut)
  if (!m) return null
  const annee = m[3].length === 2 ? '20' + m[3] : m[3]
  return annee + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0')
}

const nombre = (v: string | undefined): number | null => {
  if (v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function somme(r: Record<string, string>, a: string, b: string, c?: string, d?: string): number | undefined {
  const vals = [a, b, c, d].filter((x): x is string => !!x).map(k => nombre(r[k]))
  return vals.every(v => v !== null) ? (vals as number[]).reduce((x, y) => x + y, 0) : undefined
}

function cote(r: Record<string, string>, noms: string[]): number | undefined {
  for (const n of noms) {
    const v = nombre(r[n])
    if (v !== null && v > 1) return v
  }
  return undefined
}

const r2 = (n: number): number => Math.round(n * 100) / 100

export function ligneDepuisCsv(r: Record<string, string>): LigneCsv | null {
  const date = dateIso(r.Date ?? '')
  if (!date || !r.HomeTeam || !r.AwayTeam) return null
  const bonus: Bonus = {}
  const cartons = somme(r, 'HY', 'AY', 'HR', 'AR') // jaunes + rouges, les deux équipes
  const corners = somme(r, 'HC', 'AC')
  const fautes = somme(r, 'HF', 'AF')
  if (cartons !== undefined) bonus.cartons = cartons
  if (corners !== undefined) bonus.corners = corners
  if (fautes !== undefined) bonus.fautes = fautes
  const cotes: Cotes = {}
  const h = cote(r, ['AvgH', 'B365H', 'PSH', 'MaxH'])
  const d = cote(r, ['AvgD', 'B365D', 'PSD', 'MaxD'])
  const a = cote(r, ['AvgA', 'B365A', 'PSA', 'MaxA'])
  if (h && d && a) {
    cotes['1'] = h
    cotes.N = d
    cotes['2'] = a
    // Doubles chances : cote implicite des trois cotes ci-dessus (les bookmakers n'en publient pas dans ces fichiers).
    cotes['1X'] = r2(1 / (1 / h + 1 / d))
    cotes.X2 = r2(1 / (1 / d + 1 / a))
    cotes['12'] = r2(1 / (1 / h + 1 / a))
  }
  const over = cote(r, ['Avg>2.5', 'B365>2.5', 'P>2.5', 'Max>2.5'])
  const under = cote(r, ['Avg<2.5', 'B365<2.5', 'P<2.5', 'Max<2.5'])
  if (over) cotes['O2.5'] = over
  if (under) cotes['U2.5'] = under
  return { date, dom: r.HomeTeam, ext: r.AwayTeam, ...(Object.keys(bonus).length ? { bonus } : {}), cotes }
}

const JOUR_MS = 86_400_000
const decaler = (iso: string, n: number): string => new Date(Date.parse(iso) + n * JOUR_MS).toISOString().slice(0, 10)

export class StatsCsv {
  private readonly lignes = new Map<string, LigneCsv[]>() // division → lignes (toutes saisons chargées + matchs à venir)
  private readonly charges = new Set<string>()
  private aVenirCharge = false
  private cotesTrouvees = false
  readonly erreurs: string[] = []
  private readonly fetcher: Fetcher

  constructor(fetcher: Fetcher = fetch) {
    this.fetcher = fetcher
  }

  /** Nombre de matchs lus dans les CSV (toutes divisions). */
  get nbLignes(): number {
    let n = 0
    for (const l of this.lignes.values()) n += l.length
    return n
  }

  get aDesCotes(): boolean {
    return this.cotesTrouvees
  }

  private async telecharger(url: string): Promise<string | null> {
    try {
      const reponse = await this.fetcher(url, { signal: AbortSignal.timeout(30_000) })
      if (!reponse.ok) {
        this.erreurs.push(url + ' → HTTP ' + reponse.status)
        return null
      }
      return new TextDecoder('windows-1252').decode(await reponse.arrayBuffer())
    } catch (e) {
      this.erreurs.push(url + ' → ' + (e instanceof Error ? e.message : 'erreur'))
      return null
    }
  }

  private ajouter(div: string, texte: string): void {
    const liste = this.lignes.get(div) ?? []
    for (const r of parseCsv(texte)) {
      const l = ligneDepuisCsv(r)
      if (!l) continue
      if (Object.keys(l.cotes).length) this.cotesTrouvees = true
      liste.push(l)
    }
    this.lignes.set(div, liste)
  }

  /** Saison `annee` = année de début (2026 pour 2026/27). Un fichier par championnat. */
  async chargerSaison(annee: number): Promise<void> {
    const code = String(annee % 100).padStart(2, '0') + String((annee + 1) % 100).padStart(2, '0')
    for (const div of new Set(Object.values(DIVISIONS))) {
      const cle = code + ':' + div
      if (this.charges.has(cle)) continue
      this.charges.add(cle)
      const texte = await this.telecharger(BASE + '/mmz4281/' + code + '/' + div + '.csv')
      if (texte) this.ajouter(div, texte)
    }
  }

  /** Matchs à venir avec leurs cotes (fixtures.csv, plusieurs championnats dans le même fichier). */
  async chargerAVenir(): Promise<void> {
    if (this.aVenirCharge) return
    this.aVenirCharge = true
    const texte = await this.telecharger(BASE + '/fixtures.csv')
    if (!texte) return
    for (const r of parseCsv(texte)) {
      const l = ligneDepuisCsv(r)
      if (!l || !r.Div) continue
      if (Object.keys(l.cotes).length) this.cotesTrouvees = true
      const liste = this.lignes.get(r.Div) ?? []
      liste.push(l)
      this.lignes.set(r.Div, liste)
    }
  }

  private trouver(competition: string, date: string, dom: string, ext: string): LigneCsv[] {
    const div = DIVISIONS[competition]
    if (!div) return []
    const dates = new Set([date, decaler(date, -1), decaler(date, 1)])
    return (this.lignes.get(div) ?? []).filter(l => dates.has(l.date) && memeEquipe(l.dom, dom) && memeEquipe(l.ext, ext))
  }

  bonus(competition: string, date: string, dom: string, ext: string): Bonus | undefined {
    return this.trouver(competition, date, dom, ext).find(l => l.bonus)?.bonus
  }

  cotes(competition: string, date: string, dom: string, ext: string): Cotes {
    return this.trouver(competition, date, dom, ext).find(l => Object.keys(l.cotes).length)?.cotes ?? {}
  }

  /** Moyenne par match (les deux équipes ensemble) de chaque catégorie, sur les matchs antérieurs à `avantJour`. */
  moyennes(competition: string, avantJour?: string): Bonus {
    const div = DIVISIONS[competition]
    const out: Bonus = {}
    if (!div) return out
    const base = (this.lignes.get(div) ?? []).filter(l => l.bonus && (!avantJour || l.date < avantJour))
    for (const cat of ['cartons', 'corners', 'fautes'] as const) {
      const vals = base.map(l => l.bonus?.[cat]).filter((v): v is number => typeof v === 'number')
      if (vals.length >= MIN_MATCHS_MOYENNE) out[cat] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100
    }
    return out
  }
}
