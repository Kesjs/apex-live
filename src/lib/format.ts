import type { NiveauRisque, PilierId, Prediction } from '../domain/contracts'

const NBSP = ' '

export function pct(p: number, digits = 0): string {
  const value = p * 100
  const text = digits > 0 ? value.toFixed(digits).replace('.', ',') : String(Math.round(value))
  return text + NBSP + '%'
}

export function points(ecart: number): string {
  const value = Math.round(ecart * 100)
  return (value > 0 ? '+' : '') + value + NBSP + 'pts'
}

export function cote(value: number | undefined): string | null {
  if (value === undefined) return null
  return value.toFixed(2).replace('.', ',')
}

export function decimal(value: number): string {
  return value.toFixed(1).replace('.', ',')
}

export function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function sigle(nom: string): string {
  const mots = nom
    .replace(/\bFC\b/gi, '')
    .split(/\s+/)
    .filter(Boolean)
  if (mots.length === 0) return nom.slice(0, 2).toUpperCase()
  if (mots.length === 1) return mots[0].slice(0, 2).toUpperCase()
  return (mots[0][0] + mots[1][0]).toUpperCase()
}

/* ---------- dates ---------- */

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toISODate(date: Date): string {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function parseISODate(jour: string): Date {
  const [y, m, d] = jour.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

export function addDays(jour: string, days: number): string {
  const date = parseISODate(jour)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const jourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const jourMoyen = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function jourCourtLabel(jour: string): string {
  return capitalise(jourCourt.format(parseISODate(jour)).replace('.', ''))
}

export function jourNumero(jour: string): string {
  return String(parseISODate(jour).getDate())
}

export function jourLongLabel(jour: string): string {
  return capitalise(jourLong.format(parseISODate(jour)))
}

export function jourMoyenLabel(jour: string): string {
  return capitalise(jourMoyen.format(parseISODate(jour)))
}

export function heureLabel(iso: string): string {
  return heure.format(new Date(iso)).replace(':', ':')
}

export function heureCourte(iso: string): string {
  const date = new Date(iso)
  return pad(date.getHours()) + ':' + pad(date.getMinutes())
}

export function jourDeIso(iso: string): string {
  return toISODate(new Date(iso))
}

export function jourDeFiche(fiche: Prediction): string {
  return jourDeIso(fiche.date_heure)
}

export function quandLabel(jour: string): string {
  const aujourdhui = todayISO()
  if (jour === aujourdhui) return "Aujourd'hui"
  if (jour === addDays(aujourdhui, 1)) return 'Demain'
  if (jour === addDays(aujourdhui, -1)) return 'Hier'
  return jourMoyenLabel(jour)
}

/* ---------- risque ---------- */

export function risqueDe(pilier: PilierId, probabilite?: number): NiveauRisque {
  if (pilier === 'scores') return 'eleve'
  if (pilier === 'bonus') return 'moyen'
  const p = probabilite ?? 0
  if (p >= 0.75) return 'faible'
  if (p >= 0.55) return 'moyen'
  return 'eleve'
}

export const risqueLabel: Record<NiveauRisque, string> = {
  faible: 'Risque faible',
  moyen: 'Risque moyen',
  eleve: 'Risque élevé',
}

export const categorieLabel = {
  cartons: 'Cartons',
  corners: 'Corners',
  fautes: 'Fautes',
  'hors-jeu': 'Hors-jeu',
} as const

export const pilierLabel: Record<PilierId, string> = {
  issue: 'Issue',
  buts: 'Buts',
  bonus: 'Bonus',
  scores: 'Score',
}
