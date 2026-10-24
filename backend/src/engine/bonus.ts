import type { PronosticBonus } from '../../../src/domain/contracts.ts'
import type { CategorieBonus, Contexte, MatchPasse, Cotes } from '../types.ts'
import { CATEGORIES } from '../types.ts'
import { NB_MATCHS, recents } from './force.ts'

const ECART_MIN = 0.04 // au moins 4 % d'écart par rapport à la moyenne de la ligue
const TAUX_MIN = 0.55 // et la condition doit être vérifiée dans au moins 55 % des matchs
const ECHANTILLON_MIN = 4

const NOM: Record<CategorieBonus, string> = {
  cartons: 'cartons',
  corners: 'corners',
  fautes: 'fautes',
  'hors-jeu': 'hors-jeu',
}

const TITRE: Record<CategorieBonus, string> = {
  cartons: 'Cartons',
  corners: 'Corners',
  fautes: 'Fautes',
  'hors-jeu': 'Hors-jeu',
}

const r1 = (n: number): number => Math.round(n * 10) / 10
const virgule = (n: number): string => String(n).replace('.', ',')

export interface ChoixBonusResult {
  pronostic: PronosticBonus
  categorie: CategorieBonus
  ligne: number
  type: 'plus' | 'moins'
  equipe?: 'domicile' | 'exterieur'
}

interface CandidatBonus {
  cat: CategorieBonus
  type: 'plus' | 'moins'
  ligne: number
  obs: number
  ligue: number
  taux: number
  score: number
  equipe?: 'domicile' | 'exterieur'
  nomEquipe?: string
}

/**
 * Bonus : chaque catégorie est évaluée pour des scénarios « Plus de » (Over) ET « Moins de » (Under),
 * ainsi que pour des options par équipe (ex. discipline cartons ou domination corners).
 * On retient le signal le plus solide statistiquement.
 */
export function choisirBonus(
  dom: MatchPasse[],
  ext: MatchPasse[],
  ctx: Contexte,
  cotes: Cotes,
  nomD?: string,
  nomE?: string,
): ChoixBonusResult {
  const echantillon = [...recents(dom, NB_MATCHS), ...recents(ext, NB_MATCHS)]
  const candidats: CandidatBonus[] = []

  // 1. Évaluation globale des catégories (Plus et Moins)
  for (const cat of CATEGORIES) {
    const ligue = ctx.moy_bonus[cat]
    if (!ligue || ligue <= 0) continue
    const valeurs = echantillon.map(m => m.bonus?.[cat]).filter((v): v is number => typeof v === 'number')
    if (valeurs.length < ECHANTILLON_MIN) continue
    const obs = valeurs.reduce((a, b) => a + b, 0) / valeurs.length
    const coverage = valeurs.length / (valeurs.length + 3)

    // A. Candidats « Plus de » (Over)
    if (obs > ligue * (1 + ECART_MIN)) {
      const ecart = (obs - ligue) / ligue
      let lignesCandidats: number[] = []
      if (cat === 'corners') {
        lignesCandidats = obs >= 11.2 ? [9.5, 10.5, 8.5] : obs >= 10.0 ? [8.5, 9.5] : [8.5]
      } else if (cat === 'cartons') {
        lignesCandidats = obs >= 5.2 ? [3.5, 4.5] : [3.5]
      } else if (cat === 'fautes') {
        lignesCandidats = obs >= 26.5 ? [23.5, 25.5] : [23.5]
      } else {
        lignesCandidats = [3.5]
      }

      for (const ligne of lignesCandidats) {
        const depasse = valeurs.filter(v => v > ligne).length
        const taux = (depasse + 1) / (valeurs.length + 2)
        if (taux >= TAUX_MIN) {
          const cote = cotes['bonus:' + cat + ':O' + ligne]
          const scoreCote = cote !== undefined ? 0.35 : 0
          candidats.push({ cat, type: 'plus', ligne, obs, ligue, taux, score: ecart * taux * coverage + scoreCote })
        }
      }
    }

    // B. Candidats « Moins de » (Under)
    if (obs < ligue * (1 - ECART_MIN)) {
      const ecart = (ligue - obs) / ligue
      let lignesCandidats: number[] = []
      if (cat === 'corners') {
        lignesCandidats = obs <= 8.2 ? [8.5, 9.5] : obs <= 9.2 ? [9.5, 10.5] : [10.5]
      } else if (cat === 'cartons') {
        lignesCandidats = obs <= 3.2 ? [3.5, 4.5] : [4.5]
      } else if (cat === 'fautes') {
        lignesCandidats = obs <= 22.0 ? [23.5, 25.5] : [25.5]
      } else {
        lignesCandidats = [3.5]
      }

      for (const ligne of lignesCandidats) {
        const enDessous = valeurs.filter(v => v < ligne).length
        const taux = (enDessous + 1) / (valeurs.length + 2)
        if (taux >= TAUX_MIN) {
          candidats.push({ cat, type: 'moins', ligne, obs, ligue, taux, score: ecart * taux * coverage })
        }
      }
    }
  }

  // 2. Évaluation spécifique par équipe (cartons & corners) si noms fournis
  if (nomD && nomE) {
    const rD = recents(dom, NB_MATCHS)
    const rE = recents(ext, NB_MATCHS)

    // Corners Domicile (domination offensive)
    const cornersD = rD.map(m => m.bonus?.corners).filter((v): v is number => typeof v === 'number')
    if (cornersD.length >= 3) {
      const moyCornersD = (cornersD.reduce((a, b) => a + b, 0) / cornersD.length) * 0.55
      if (moyCornersD >= 5.2) {
        candidats.push({
          cat: 'corners',
          type: 'plus',
          ligne: 4.5,
          obs: moyCornersD,
          ligue: (ctx.moy_bonus.corners || 9.5) * 0.5,
          taux: 0.72,
          score: 0.55,
          equipe: 'domicile',
          nomEquipe: nomD,
        })
      }
    }

    // Discipline Cartons Domicile
    const cartonsD = rD.map(m => m.bonus?.cartons).filter((v): v is number => typeof v === 'number')
    if (cartonsD.length >= 3) {
      const moyCartonsD = (cartonsD.reduce((a, b) => a + b, 0) / cartonsD.length) * 0.45
      if (moyCartonsD <= 1.6) {
        candidats.push({
          cat: 'cartons',
          type: 'moins',
          ligne: 2.5,
          obs: moyCartonsD,
          ligue: (ctx.moy_bonus.cartons || 4.1) * 0.5,
          taux: 0.75,
          score: 0.58,
          equipe: 'domicile',
          nomEquipe: nomD,
        })
      }
    }

    // Discipline Cartons Extérieur
    const cartonsE = rE.map(m => m.bonus?.cartons).filter((v): v is number => typeof v === 'number')
    if (cartonsE.length >= 3) {
      const moyCartonsE = (cartonsE.reduce((a, b) => a + b, 0) / cartonsE.length) * 0.48
      if (moyCartonsE <= 1.7) {
        candidats.push({
          cat: 'cartons',
          type: 'moins',
          ligne: 2.5,
          obs: moyCartonsE,
          ligue: (ctx.moy_bonus.cartons || 4.1) * 0.5,
          taux: 0.73,
          score: 0.54,
          equipe: 'exterieur',
          nomEquipe: nomE,
        })
      }
    }
  }

  // 3. Choix du meilleur signal
  candidats.sort((a, b) => b.score - a.score)
  let meilleur = candidats[0] ?? null

  // 4. Repli garanti diversifié si aucun signal n'a dépassé les seuils stricts
  if (!meilleur) {
    const valCorners = echantillon.map(m => m.bonus?.corners).filter((v): v is number => typeof v === 'number')
    const valCartons = echantillon.map(m => m.bonus?.cartons).filter((v): v is number => typeof v === 'number')
    const ligueCorners = ctx.moy_bonus.corners || 9.5
    const ligueCartons = ctx.moy_bonus.cartons || 4.1

    if (valCorners.length >= 2) {
      const obsC = valCorners.reduce((a, b) => a + b, 0) / valCorners.length
      if (obsC < ligueCorners) {
        // Tendance basse sur les corners -> Moins de 10,5 ou 9,5
        const ligneC = obsC <= 8.5 ? 9.5 : 10.5
        meilleur = { cat: 'corners', type: 'moins', ligne: ligneC, obs: obsC, ligue: ligueCorners, taux: 0.68, score: 0.45 }
      } else {
        // Tendance haute sur les corners -> Plus de 8,5 ou 9,5
        const ligneC = obsC >= 10.5 ? 9.5 : 8.5
        meilleur = { cat: 'corners', type: 'plus', ligne: ligneC, obs: obsC, ligue: ligueCorners, taux: 0.68, score: 0.48 }
      }
    } else if (valCartons.length >= 2) {
      const obsK = valCartons.reduce((a, b) => a + b, 0) / valCartons.length
      if (obsK < ligueCartons) {
        // Tendance disciplinée -> Moins de 4,5 cartons
        const ligneK = obsK <= 3.2 ? 3.5 : 4.5
        meilleur = { cat: 'cartons', type: 'moins', ligne: ligneK, obs: obsK, ligue: ligueCartons, taux: 0.70, score: 0.47 }
      } else {
        // Tendance engagée -> Plus de 3,5 ou 4,5 cartons
        const ligneK = obsK >= 4.8 ? 4.5 : 3.5
        meilleur = { cat: 'cartons', type: 'plus', ligne: ligneK, obs: obsK, ligue: ligueCartons, taux: 0.68, score: 0.49 }
      }
    } else {
      // Pas de données historiques directes : on s'appuie sur la moyenne de la ligue
      meilleur = {
        cat: 'corners',
        type: 'plus',
        ligne: 8.5,
        obs: ligueCorners,
        ligue: ligueCorners,
        taux: 0.65,
        score: 0.4,
      }
    }
  }

  const { cat, type, ligne, obs, ligue, equipe, nomEquipe } = meilleur

  // Construction des libellés
  let selection: string
  let court: string
  let justification: string

  const prefixe = type === 'moins' ? 'Moins de ' : 'Plus de '
  const signe = type === 'moins' ? '-' : '+'

  if (nomEquipe) {
    const courtNom = nomEquipe.length > 11 ? nomEquipe.slice(0, 10) + '.' : nomEquipe
    const tagCat = cat === 'corners' ? 'Cnr' : 'Crt'
    selection = nomEquipe + ' : ' + prefixe + virgule(ligne) + ' ' + (cat === 'cartons' && ligne <= 1.5 ? 'carton' : NOM[cat])
    court = courtNom + ' ' + tagCat + ' ' + signe + ligne
    justification =
      type === 'moins'
        ? nomEquipe + ' maintient une grande régularité avec une moyenne basse de ' + virgule(r1(obs)) + ' ' + NOM[cat] + ' par match.'
        : nomEquipe + ' imprime un gros volume offensif avec ' + virgule(r1(obs)) + ' ' + NOM[cat] + ' par match.'
  } else {
    selection = prefixe + virgule(ligne) + ' ' + NOM[cat]
    court = TITRE[cat] + ' ' + signe + ligne
    justification =
      type === 'moins'
        ? 'Moyenne observée de ' + virgule(r1(obs)) + ' ' + NOM[cat] + ' par match (profil maîtrisé), sous la moyenne ligue (' + virgule(r1(ligue)) + ').'
        : 'Moyenne combinée de ' + virgule(r1(obs)) + ' ' + NOM[cat] + ' par match, contre ' + virgule(r1(ligue)) + ' pour la ligue.'
  }

  const pronostic: PronosticBonus = {
    categorie: cat,
    selection,
    court,
    justification,
    valeur_observee: r1(obs),
    moyenne_ligue: r1(ligue),
  }

  // Association de la cote si disponible
  const codeCote = 'bonus:' + cat + ':' + (type === 'moins' ? 'U' : 'O') + ligne
  const cote = cotes[codeCote] ?? (type === 'plus' ? cotes['bonus:' + cat + ':O' + ligne] : undefined)
  if (cote !== undefined) pronostic.cote = cote

  return { pronostic, categorie: cat, ligne, type, equipe }
}
