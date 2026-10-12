import type {
  ApexProvider,
  CategorieBonus,
  FormeRecente,
  Historique,
  JourHistorique,
  LettreForme,
  PeriodeHistorique,
  PilierId,
  Prediction,
  PronosticBonus,
  Pronostics,
  ResultatFiche,
  TauxPilier,
  Valeur,
} from '../domain/contracts'
import { addDays, categorieLabel, hash, parseISODate, todayISO } from '../lib/format'

/**
 * Source de données de DÉMONSTRATION.
 *
 * Tout est fictif (équipes, chiffres, résultats) et généré de façon
 * déterministe à partir de la date, pour que l'interface ait toujours quelque
 * chose à afficher sans back-end. Ne jamais l'utiliser en production.
 *
 * Astuces de test (dans l'URL) :
 *   ?demo=erreur  -> la source renvoie une erreur
 *   ?demo=vide    -> aucun match
 */

function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function poisson(r: () => number, lambda: number): number {
  const limite = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= r()
  } while (p > limite && k < 9)
  return k - 1
}

const round2 = (n: number): number => Math.round(n * 100) / 100
const round1 = (n: number): number => Math.round(n * 10) / 10
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

const FIXTURES: Array<[string, string, string]> = [
  ['Northbridge FC', 'Port Azure', 'Ligue des Clubs'],
  ['Cedar Park', 'Montclair', 'Ligue des Clubs'],
  ['Harbor United', 'Union Park', 'Ligue des Clubs'],
  ['Eastbay FC', 'Redmont', 'Ligue des Clubs'],
  ['Westhaven', 'Lakewood', 'Coupe des Rives'],
  ['Valmont FC', 'Riverton', 'Coupe des Rives'],
  ['Stonebridge', 'Alder Town', 'Coupe des Rives'],
  ['Kingsfield', 'Marlow City', 'Ligue des Clubs'],
  ['Oakhurst', 'Seaview', 'Coupe des Rives'],
  ['Fairmont', 'Dunmore', 'Ligue des Clubs'],
]

const HEURES = ['16:00', '18:45', '19:00', '20:30', '21:00', '21:00']

const BONUS_CONFIG: Record<CategorieBonus, { ligne: number; obs: number; moy: number; unite: string }> = {
  cartons: { ligne: 3.5, obs: 4.6, moy: 3.9, unite: 'cartons' },
  corners: { ligne: 8.5, obs: 10.2, moy: 9.1, unite: 'corners' },
  fautes: { ligne: 24.5, obs: 26.8, moy: 23.4, unite: 'fautes' },
  'hors-jeu': { ligne: 3.5, obs: 4.1, moy: 3.4, unite: 'hors-jeu' },
}

const CATEGORIES: CategorieBonus[] = ['cartons', 'corners', 'fautes', 'hors-jeu']

const SCORE_SETS: Array<[string, string]> = [
  ['2-1', '1-1'],
  ['1-0', '2-0'],
  ['2-1', '2-2'],
  ['1-1', '0-0'],
  ['3-1', '2-1'],
]

function slug(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function localISO(jour: string, hhmm: string): string {
  const date = parseISODate(jour)
  const [h, m] = hhmm.split(':').map(Number)
  date.setHours(h, m, 0, 0)
  return date.toISOString()
}

function lettre(r: () => number, pVictoire: number, pNul: number): LettreForme {
  const x = r()
  if (x < pVictoire) return 'V'
  if (x < pVictoire + pNul) return 'N'
  return 'D'
}

function formeDe(r: () => number, favoriDomicile: boolean): FormeRecente {
  const dom: LettreForme[] = []
  const ext: LettreForme[] = []
  for (let i = 0; i < 5; i++) {
    dom.push(lettre(r, favoriDomicile ? 0.62 : 0.4, 0.2))
    ext.push(lettre(r, favoriDomicile ? 0.38 : 0.58, 0.22))
  }
  return { domicile: dom, exterieur: ext }
}

function buildFiche(jour: string, index: number, dom: string, ext: string, competition: string, heure: string): Prediction {
  const id = jour + '-' + slug(dom) + '-' + slug(ext)
  const r = rng(hash(id))
  const dateHeure = localISO(jour, heure)
  const meta = {
    genere_le: localISO(jour, '04:45'),
    version_moteur: '0.0.0-demo',
    source_stats: 'demo',
    source_cotes: 'demo',
    cotes_observees_le: localISO(jour, '04:10'),
  }
  const base = { match_id: id, date_heure: dateHeure, competition, equipes: { domicile: dom, exterieur: ext }, meta }
  const vide: ResultatFiche = { statut: 'non_evalue', issue: null, buts: null, bonus: null, score: null }

  if (hash(id) % 6 === 0 || index === 5) {
    return { ...base, pronostics: null, raison_absence: "Historique insuffisant pour l'une des deux équipes.", resultat: vide }
  }

  const favoriDomicile = r() < 0.6
  const favori = favoriDomicile ? dom : ext
  const autre = favoriDomicile ? ext : dom

  /* issue */
  const doubleChance = r() < 0.65
  const pIssue = doubleChance ? 0.68 + r() * 0.2 : 0.55 + r() * 0.17
  const code = doubleChance ? (favoriDomicile ? '1X' : 'X2') : favoriDomicile ? '1' : '2'
  const coteIssue = round2(1 / (pIssue - (r() * 0.1 - 0.02)))
  const issue = {
    selection: doubleChance ? code + ' · ' + favori + ' ou nul' : code + ' · ' + favori,
    court: code,
    probabilite: round2(pIssue),
    cote: coteIssue,
    justification: favoriDomicile
      ? 'Bonne série récente à domicile et confrontations directes plutôt favorables.'
      : "Meilleure dynamique à l'extérieur sur les derniers matchs.",
  }

  /* buts */
  const ligne = r() < 0.6 ? 1.5 : 2.5
  const pButs = ligne === 1.5 ? 0.76 + r() * 0.14 : 0.52 + r() * 0.16
  const coteButs = round2(1 / (pButs - (r() * 0.1 - 0.02)))
  const buts = {
    selection: 'Plus de ' + ligne + ' buts',
    court: '+' + ligne,
    probabilite: round2(pButs),
    cote: coteButs,
    frequence: Math.round(pButs * 10) + ' sur 10 matchs combinés',
  }

  /* bonus */
  let bonus: PronosticBonus | null = null
  let unite = ''
  if (r() < 0.72) {
    const categorie = CATEGORIES[Math.floor(r() * CATEGORIES.length)]
    const cfg = BONUS_CONFIG[categorie]
    const obs = round1(cfg.obs + (r() - 0.5) * 0.8)
    unite = cfg.unite
    bonus = {
      categorie,
      selection: 'Plus de ' + cfg.ligne + ' ' + cfg.unite,
      court: categorieLabel[categorie] + ' +' + cfg.ligne,
      cote: round2(1.55 + r() * 0.4),
      justification: 'Moyenne combinée de ' + String(obs).replace('.', ',') + ' ' + cfg.unite + ' par match, contre ' + String(cfg.moy).replace('.', ',') + ' pour la ligue.',
      valeur_observee: obs,
      moyenne_ligue: cfg.moy,
    }
  }

  /* scores */
  const set = SCORE_SETS[Math.floor(r() * SCORE_SETS.length)]
  const p1 = 0.1 + r() * 0.06
  const p2 = p1 - (0.01 + r() * 0.02)
  const scores = [
    { score: set[0], probabilite: Math.round(p1 * 1000) / 1000, cote: round2(0.9 / p1) },
    { score: set[1], probabilite: Math.round(p2 * 1000) / 1000, cote: round2(0.9 / p2) },
  ]

  const pronostics: Pronostics = { issue, buts, bonus, scores }

  /* écart avec les cotes */
  const ecarts: Array<[PilierId, number]> = [
    ['issue', issue.probabilite - 1 / issue.cote],
    ['buts', buts.probabilite - 1 / buts.cote],
  ]
  ecarts.sort((a, b) => b[1] - a[1])
  const value: Valeur | null = ecarts[0][1] > 0.05 ? { pilier: ecarts[0][0], ecart: round2(ecarts[0][1]) } : null

  /* synthèse */
  const partie1 = r() < 0.5
    ? favori + ' affiche une belle solidité sur ses derniers matchs, tandis que ' + autre + ' peine à garder sa cage inviolée.'
    : favori + ' reste sur une dynamique favorable ; ' + autre + ' a laissé des points en route récemment.'
  const partie2 = ligne === 1.5
    ? 'Les deux équipes marquent régulièrement, ce qui soutient le seuil de 1,5 but.'
    : "Le rythme offensif des deux équipes annonce un match ouvert (seuil de 2,5 buts)."
  const partie3 = bonus
    ? 'Côté bonus, le signal le plus net concerne les ' + unite + '.'
    : "Aucun signal assez net pour proposer un bonus aujourd'hui."
  const synthese = partie1 + ' ' + partie2 + ' ' + partie3

  /* résultat (uniquement pour les jours passés) */
  let resultat: ResultatFiche = vide
  if (jour < todayISO()) {
    const gd = poisson(r, favoriDomicile ? 1.9 : 1.1)
    const ge = poisson(r, favoriDomicile ? 1.0 : 1.7)
    const final = gd + '-' + ge
    const reussiIssue = code === '1X' ? gd >= ge : code === 'X2' ? ge >= gd : code === '1' ? gd > ge : ge > gd
    resultat = {
      statut: 'evalue',
      issue: reussiIssue,
      buts: gd + ge > ligne,
      bonus: bonus ? r() < 0.58 : null,
      score: final === set[0] || final === set[1],
      score_final: final,
    }
  }

  return {
    ...base,
    pronostics,
    value,
    synthese,
    forme: formeDe(r, favoriDomicile),
    resultat,
  }
}

const cacheJours = new Map<string, Prediction[]>()

function buildDay(jour: string): Prediction[] {
  const cached = cacheJours.get(jour)
  if (cached) return cached
  const r = rng(hash(jour))
  const debut = Math.floor(r() * FIXTURES.length)
  const nombre = 5 + Math.floor(r() * 2)
  const fiches: Prediction[] = []
  for (let i = 0; i < nombre; i++) {
    const [dom, ext, comp] = FIXTURES[(debut + i) % FIXTURES.length]
    fiches.push(buildFiche(jour, i, dom, ext, comp, HEURES[i % HEURES.length]))
  }
  fiches.sort((a, b) => a.date_heure.localeCompare(b.date_heure))
  cacheJours.set(jour, fiches)
  return fiches
}

const NB_JOURS: Record<PeriodeHistorique, number> = { '7j': 7, '30j': 30, saison: 90 }

function buildHistory(periode: PeriodeHistorique): Historique {
  const aujourdhui = todayISO()
  const jours: JourHistorique[] = []
  const taux: Record<PilierId, TauxPilier> = {
    issue: { reussis: 0, total: 0 },
    buts: { reussis: 0, total: 0 },
    bonus: { reussis: 0, total: 0 },
    scores: { reussis: 0, total: 0 },
  }
  const compte = (pilier: PilierId, valeur: boolean | null): void => {
    if (valeur === null) return
    taux[pilier].total += 1
    if (valeur) taux[pilier].reussis += 1
  }
  for (let k = 1; k <= NB_JOURS[periode]; k++) {
    const jour = addDays(aujourdhui, -k)
    const matchs = buildDay(jour).filter(f => f.pronostics !== null)
    for (const f of matchs) {
      compte('issue', f.resultat.issue)
      compte('buts', f.resultat.buts)
      compte('bonus', f.resultat.bonus)
      compte('scores', f.resultat.score)
    }
    jours.push({ jour, matchs })
  }
  return { periode, mis_a_jour_le: new Date().toISOString(), taux, jours }
}

function modeDemo(): string | null {
  return new URLSearchParams(window.location.search).get('demo')
}

export const demoProvider: ApexProvider = {
  modeLabel: 'Données de démonstration',
  async listMatches(jour) {
    await sleep(450)
    if (modeDemo() === 'erreur') throw new Error('Source de démonstration en panne (paramètre ?demo=erreur).')
    if (modeDemo() === 'vide') return []
    return buildDay(jour)
  },
  async getMatch(matchId) {
    await sleep(300)
    if (modeDemo() === 'erreur') throw new Error('Source de démonstration en panne (paramètre ?demo=erreur).')
    const jour = matchId.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return null
    return buildDay(jour).find(f => f.match_id === matchId) ?? null
  },
  async getHistory(periode) {
    await sleep(400)
    if (modeDemo() === 'erreur') throw new Error('Source de démonstration en panne (paramètre ?demo=erreur).')
    return buildHistory(periode)
  },
}
