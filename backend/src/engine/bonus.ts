import type { PronosticBonus } from '../../../src/domain/contracts.ts'
import type { CategorieBonus, Contexte, MatchPasse, Cotes } from '../types.ts'
import { CATEGORIES } from '../types.ts'
import { NB_MATCHS, recents } from './force.ts'

const ECART_MIN = 0.05 // au moins 5 % au-dessus de la moyenne de la ligue
const TAUX_MIN = 0.6 // et la ligne doit avoir été dépassée dans au moins 60 % des matchs
const MARGE_LIGNE = 1.5 // la ligne se place 1,5 sous la moyenne observée : une ligne prudente, donc plus souvent atteinte
const ECHANTILLON_MIN = 6
const NOM: Record<CategorieBonus, string> = { cartons: 'cartons', corners: 'corners', fautes: 'fautes', 'hors-jeu': 'hors-jeu' }
const TITRE: Record<CategorieBonus, string> = { cartons: 'Cartons', corners: 'Corners', fautes: 'Fautes', 'hors-jeu': 'Hors-jeu' }
const r1 = (n: number): number => Math.round(n * 10) / 10
const virgule = (n: number): string => String(n).replace('.', ',')

/**
 * Bonus : chaque catégorie est évaluée séparément. On publie uniquement la meilleure
 * combinaison écart/constance/couverture ; il n'y a aucun tirage aléatoire et une
 * catégorie faible ne peut pas être affichée simplement pour remplir la carte.
 */
export function choisirBonus(
  dom: MatchPasse[],
  ext: MatchPasse[],
  ctx: Contexte,
  cotes: Cotes,
): { pronostic: PronosticBonus; categorie: CategorieBonus; ligne: number } | null {
  const echantillon = [...recents(dom, NB_MATCHS), ...recents(ext, NB_MATCHS)]
  let meilleur: { cat: CategorieBonus; ecart: number; obs: number; ligue: number; ligne: number; taux: number; score: number } | null = null

  for (const cat of CATEGORIES) {
    const ligue = ctx.moy_bonus[cat]
    if (!ligue || ligue <= 0) continue
    const valeurs = echantillon.map(m => m.bonus?.[cat]).filter((v): v is number => typeof v === 'number')
    if (valeurs.length < ECHANTILLON_MIN) continue
    const obs = valeurs.reduce((a, b) => a + b, 0) / valeurs.length
    const ecart = (obs - ligue) / ligue
    if (ecart < ECART_MIN) continue
    const ligne = Math.floor(obs) - MARGE_LIGNE
    if (ligne < 0.5) continue
    const depasse = valeurs.filter(v => v > ligne).length
    const taux = (depasse + 1) / (valeurs.length + 2)
    if (taux < TAUX_MIN) continue
    // La couverture évite de préférer un signal fragile obtenu sur le minimum de données.
    const score = ecart * taux * (valeurs.length / (valeurs.length + 4))
    if (!meilleur || score > meilleur.score) meilleur = { cat, ecart, obs, ligue, ligne, taux, score }
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
