import type { Prediction } from '../domain/contracts.ts'

/** A clock alone never proves that a match is live or finished. */
export function matchStatus(fiche: Prediction, now = Date.now()) {
  const r = fiche.resultat
  if (r.statut === 'annule') return { label: 'Annulé ou reporté', score: '—', final: false, pending: false, live: false }
  if (r.score_final) return { label: 'Terminé', score: r.score_final, final: true, pending: false, live: false }
  const elapsed = now - Date.parse(fiche.date_heure)
  if (elapsed >= 0 && elapsed <= 3 * 3600_000) return { label: 'En direct', score: null, final: false, pending: false, live: true }
  if (elapsed > 3 * 3600_000) return { label: 'Résultat en attente', score: '—', final: false, pending: true, live: false }
  return { label: 'À venir', score: null, final: false, pending: false, live: false }
}
