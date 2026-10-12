import type { Contexte, Cotes, Equipe, MatchPasse, Rencontre, ResultatReel, Source } from '../types.ts'
import { CATEGORIES } from '../types.ts'
import type { CategorieBonus } from '../types.ts'
import { matrice, issue, plusDe, lesDeuxMarquent, pmf } from '../engine/poisson.ts'

/**
 * Source de DÉMONSTRATION : équipes et chiffres fictifs, générés de façon déterministe.
 * Sert à tester tout le circuit (calcul → stockage → API → interface) sans abonnement de données.
 */

const LIGUES: Record<string, string[]> = {
  'Coupe des Rives': ['Stonebridge', 'Alder Town', 'Oakhurst', 'Seaview', 'Westhaven', 'Lakewood', 'Valmont FC', 'Riverton'],
  'Ligue des Clubs': ['Kingsfield', 'Marlow City', 'Fairmont', 'Dunmore', 'Northbridge FC', 'Port Azure', 'Harbor United', 'Union Park'],
}
const HEURES = ['16:00', '18:45', '19:00', '20:30', '21:00']
const MOY_BONUS: Record<CategorieBonus, number> = { cartons: 4.0, corners: 9.8, fautes: 24, 'hors-jeu': 3.8 }

function hash(t: string): number {
  let h = 2166136261
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function rng(graine: string): () => number {
  let a = hash(graine)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function poissonTirage(r: () => number, l: number): number {
  if (l >= 12) {
    const g = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r())
    return Math.max(0, Math.round(l + Math.sqrt(l) * g))
  }
  const lim = Math.exp(-l)
  let k = 0
  let p = 1
  do {
    k++
    p *= r()
  } while (p > lim && k < 20)
  return k - 1
}
const slug = (t: string): string => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const r2 = (n: number): number => Math.round(n * 100) / 100

interface Latent {
  att: number
  def: number
  tendance: Record<CategorieBonus, number>
}
function latent(nom: string): Latent {
  const r = rng('latent|' + nom)
  return {
    att: 0.78 + r() * 0.55,
    def: 0.82 + r() * 0.45,
    tendance: { cartons: 0.8 + r() * 0.55, corners: 0.8 + r() * 0.5, fautes: 0.85 + r() * 0.4, 'hors-jeu': 0.7 + r() * 0.7 },
  }
}

function addJours(jour: string, n: number): string {
  const d = new Date(jour + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function historique(nom: string, jour: string): MatchPasse[] {
  const l = latent(nom)
  const out: MatchPasse[] = []
  for (let i = 0; i < 12; i++) {
    const r = rng('hist|' + nom + '|' + i)
    const adv = latent('adversaire|' + nom + '|' + i)
    const bonus: Partial<Record<CategorieBonus, number>> = {}
    for (const c of CATEGORIES) bonus[c] = poissonTirage(r, MOY_BONUS[c] * l.tendance[c] * (0.9 + 0.2 * adv.tendance[c] / 1.2))
    out.push({
      date: addJours(jour, -3 * (i + 1)),
      domicile: i % 2 === 0,
      buts_pour: poissonTirage(r, 1.35 * l.att * adv.def),
      buts_contre: poissonTirage(r, 1.35 * l.def * adv.att),
      bonus,
    })
  }
  return out
}

function lambdas(dom: string, ext: string): { lh: number; la: number } {
  const a = latent(dom)
  const b = latent(ext)
  return { lh: 1.5 * a.att * b.def, la: 1.2 * b.att * a.def }
}

function cotesMarche(dom: string, ext: string, id: string): Cotes {
  // Le « marché » a sa propre lecture du match : légèrement différente du modèle, avec une marge de 6 %.
  const r = rng('marche|' + id)
  const { lh, la } = lambdas(dom, ext)
  const m = matrice(lh * (0.85 + 0.3 * r()), la * (0.85 + 0.3 * r()))
  const { p1, pN, p2 } = issue(m)
  const prix = (p: number, marge: number): number => Math.max(1.01, r2(1 / (Math.max(p, 0.005) * marge)))
  const c: Cotes = {
    '1': prix(p1, 1.06), N: prix(pN, 1.06), '2': prix(p2, 1.06),
    '1X': prix(p1 + pN, 1.05), X2: prix(pN + p2, 1.05), '12': prix(p1 + p2, 1.05),
    'O1.5': prix(plusDe(m, 1.5), 1.05), 'O2.5': prix(plusDe(m, 2.5), 1.06), 'U2.5': prix(1 - plusDe(m, 2.5), 1.06),
    'U3.5': prix(1 - plusDe(m, 3.5), 1.05), BTTS: prix(lesDeuxMarquent(m), 1.06),
  }
  for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) c['score:' + i + '-' + j] = prix(m[i][j], 1.15)
  const a = latent(dom)
  const b = latent(ext)
  for (const cat of CATEGORIES) {
    const moyenne = MOY_BONUS[cat] * ((a.tendance[cat] + b.tendance[cat]) / 2) * (0.95 + 0.1 * r())
    for (let ligne = 1.5; ligne <= MOY_BONUS[cat] * 1.8; ligne += 1) {
      let queue = 0
      for (let k = Math.floor(ligne) + 1; k < 80; k++) queue += pmf(k, moyenne)
      c['bonus:' + cat + ':O' + ligne] = prix(queue, 1.08)
    }
  }
  return c
}

export class DemoSource implements Source {
  readonly nom = 'démo (données fictives)'
  readonly nomCotes = 'démo (cotes fictives)'
  private maintenant: () => Date
  constructor(opts: { maintenant?: () => Date } = {}) {
    this.maintenant = opts.maintenant ?? (() => new Date())
  }

  async rencontres(jour: string): Promise<Rencontre[]> {
    const out: Rencontre[] = []
    for (const [competition, equipes] of Object.entries(LIGUES)) {
      const r = rng('jour|' + jour + '|' + competition)
      const melange = [...equipes].sort(() => r() - 0.5)
      for (let k = 0; k < 3; k++) {
        const [d, e] = [melange[2 * k], melange[2 * k + 1]]
        const id = jour + '-' + slug(d) + '-' + slug(e)
        const heure = HEURES[Math.floor(r() * HEURES.length)]
        const equipe = (nom: string): Equipe => ({ id: slug(nom), nom, matchs: historique(nom, jour) })
        out.push({
          match_id: id,
          date_heure: jour + 'T' + heure + ':00Z',
          competition,
          domicile: equipe(d),
          exterieur: equipe(e),
          cotes: cotesMarche(d, e, id),
          cotes_observees_le: jour + 'T03:55:00Z',
        })
      }
    }
    return out.sort((a, b) => (a.date_heure < b.date_heure ? -1 : 1))
  }

  async contexte(competition: string): Promise<Contexte> {
    return { competition, moy_buts_domicile: 1.5, moy_buts_exterieur: 1.2, moy_bonus: { ...MOY_BONUS } }
  }

  async resultat(matchId: string): Promise<ResultatReel | null> {
    const jour = matchId.slice(0, 10)
    const rencontre = (await this.rencontres(jour)).find(x => x.match_id === matchId)
    if (!rencontre) return null
    if (new Date(rencontre.date_heure).getTime() + 2 * 3600_000 > this.maintenant().getTime()) return { match_id: matchId, statut: 'a_venir' }
    const r = rng('resultat|' + matchId)
    const { lh, la } = lambdas(rencontre.domicile.nom, rencontre.exterieur.nom)
    const a = latent(rencontre.domicile.nom)
    const b = latent(rencontre.exterieur.nom)
    const bonus: Partial<Record<CategorieBonus, number>> = {}
    for (const c of CATEGORIES) bonus[c] = poissonTirage(r, MOY_BONUS[c] * ((a.tendance[c] + b.tendance[c]) / 2))
    return { match_id: matchId, statut: 'termine', score_domicile: poissonTirage(r, lh), score_exterieur: poissonTirage(r, la), bonus }
  }
}
