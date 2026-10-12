import type { PilierId, Valeur } from '../../../src/domain/contracts.ts'
import type { Cotes } from '../types.ts'

const SEUIL = 0.08
/** Au-delà, l'écart vient presque toujours d'une erreur de données ou de modèle, pas d'une vraie opportunité. */
const PLAFOND = 0.2

/**
 * Probabilité « du marché » pour une sélection, en retirant la marge du bookmaker
 * quand le marché complet est connu (1N2, ou paire Plus/Moins 2,5). Sinon 1/cote brut,
 * ce qui sous-estime légèrement la value : on reste prudent.
 */
export function probaImplicite(cle: string, cotes: Cotes): number | null {
  const c = cotes[cle]
  if (c === undefined || c <= 1) return null
  const { '1': c1, N: cN, '2': c2 } = cotes
  if (c1 && cN && c2 && ['1', '2', '1X', 'X2'].includes(cle)) {
    const marge = 1 / c1 + 1 / cN + 1 / c2
    const f1 = 1 / c1 / marge
    const fN = 1 / cN / marge
    const f2 = 1 / c2 / marge
    return cle === '1' ? f1 : cle === '2' ? f2 : cle === '1X' ? f1 + fN : fN + f2
  }
  if (cle === 'O2.5' || cle === 'U2.5') {
    const o = cotes['O2.5']
    const u = cotes['U2.5']
    if (o && u) return 1 / c / (1 / o + 1 / u)
  }
  return 1 / c
}

export function valeur(candidats: Array<{ pilier: PilierId; cle: string; probabilite: number }>, cotes: Cotes): Valeur | null {
  let meilleur: Valeur | null = null
  for (const c of candidats) {
    const impl = probaImplicite(c.cle, cotes)
    if (impl === null) continue
    const ecart = c.probabilite - impl
    if (ecart >= SEUIL && ecart <= PLAFOND && (!meilleur || ecart > meilleur.ecart)) meilleur = { pilier: c.pilier, ecart }
  }
  return meilleur ? { pilier: meilleur.pilier, ecart: Math.round(meilleur.ecart * 100) / 100 } : null
}
