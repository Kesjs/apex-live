import type { PronosticBonus } from '../../../src/domain/contracts.ts'
import type { CategorieBonus, Contexte, MatchPasse, Cotes } from '../types.ts'
import { CATEGORIES } from '../types.ts'
import { NB_MATCHS, recents } from './force.ts'

const ECART_MIN = 0.12 // au moins 12 % au-dessus de la moyenne de la ligue
const TAUX_MIN = 0.7 // et la ligne doit avoir été dépassée dans au moins 70 % des matchs
const ECHANTILLON_MIN = 6
const NOM: Record<CategorieBonus, string> = { cartons: 'cartons', corners: 'corners', fautes: 'fautes', 'hors-jeu': 'hors-jeu' }
const TITRE: Record<CategorieBonus, string> = { cartons: 'Cartons', corners: 'Corners', fautes: 'Fautes', 'hors-jeu': 'Hors-jeu' }
const r1 = (n: number): number => Math.round(n * 10) / 10
const virgule = (n: number): string => String(n).replace('.', ',')

/**
 * Bonus : on cherche la catégorie où les deux équipes sont nettement au-dessus de
 * la moyenne de la ligue, avec une ligne franchie régulièrement. Sinon, pas de bonus (null).
 */
export function choisirBonus(
  dom: MatchPasse[],
  ext: MatchPasse[],
  ctx: Contexte,
  cotes: Cotes,
): { pronostic: PronosticBonus; categorie: CategorieBonus; ligne: number } | null {
  const echantillon = [...recents(dom, NB_MATCHS), ...recents(ext, NB_MATCHS)]
  let meilleur: { cat: CategorieBonus; ecart: number; obs: number; ligue: number; ligne: number; taux: number } | null = null

  for (const cat of CATEGORIES) {
    const ligue = ctx.moy_bonus[cat]
    if (!ligue || ligue <= 0) continue
    const valeurs = echantillon.map(m => m.bonus?.[cat]).filter((v): v is number => typeof v === 'number')
    if (valeurs.length < ECHANTILLON_MIN) continue
    const obs = valeurs.reduce((a, b) => a + b, 0) / valeurs.length
    const ecart = (obs - ligue) / ligue
    if (ecart < ECART_MIN) continue
    const ligne = Math.floor(obs) - 0.5
    if (ligne < 0.5) continue
    const depasse = valeurs.filter(v => v > ligne).length
    const taux = (depasse + 1) / (valeurs.length + 2)
    if (taux < TAUX_MIN) continue
    if (!meilleur || ecart > meilleur.ecart) meilleur = { cat, ecart, obs, ligue, ligne, taux }
  }
  if (!meilleur) return null

  const { cat, obs, ligue, ligne } = meilleur
  const pronostic: PronosticBonus = {
    categorie: cat,
    selection: 'Plus de ' + virgule(ligne) + ' ' + NOM[cat],
    court: TITRE[cat] + ' +' + ligne,
    justification:
      'Moyenne combinée de ' + virgule(r1(obs)) + ' ' + NOM[cat] + ' par match, contre ' + virgule(r1(ligue)) + ' pour la ligue.',
    valeur_observee: r1(obs),
    moyenne_ligue: r1(ligue),
  }
  const cote = cotes['bonus:' + cat + ':O' + ligne]
  if (cote !== undefined) pronostic.cote = cote
  return { pronostic, categorie: cat, ligne }
}
