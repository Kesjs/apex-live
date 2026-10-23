import type { LettreForme, Prediction, StatsEquipe } from '../domain/contracts'

/** Une phrase courte : le mot clé (coloré à l'écran) est isolé du reste. */
export type Fait = {
  avant: string
  cle: string
  apres: string
  ton: 'bon' | 'mauvais' | 'neutre'
}

/** Nombre de matchs consécutifs identiques en partant du plus récent (la série va du plus ancien au plus récent). */
function serie(forme: LettreForme[], lettres: LettreForme[]): number {
  let n = 0
  for (let i = forme.length - 1; i >= 0 && lettres.includes(forme[i]); i--) n++
  return n
}

function faitsEquipe(nom: string, forme: LettreForme[] | undefined, stats: StatsEquipe | undefined): Fait[] {
  const faits: Fait[] = []
  if (forme && forme.length >= 3) {
    const defaites = serie(forme, ['D'])
    const victoires = serie(forme, ['V'])
    const invaincu = serie(forme, ['V', 'N'])
    const sansVictoire = serie(forme, ['N', 'D'])
    if (defaites >= 3) {
      faits.push({ avant: nom + ' a ', cle: 'perdu', apres: ' ses ' + defaites + ' derniers matchs.', ton: 'mauvais' })
    } else if (victoires >= 3) {
      faits.push({ avant: nom + ' a ', cle: 'gagné', apres: ' ses ' + victoires + ' derniers matchs.', ton: 'bon' })
    } else if (invaincu >= 4) {
      faits.push({ avant: nom + ' est ', cle: 'invaincu', apres: ' lors de ses ' + invaincu + ' derniers matchs.', ton: 'bon' })
    } else if (sansVictoire >= 4) {
      faits.push({ avant: nom + ' est ', cle: 'sans victoire', apres: ' lors de ses ' + sansVictoire + ' derniers matchs.', ton: 'mauvais' })
    }
  }
  if (stats && stats.matchs >= 3) {
    const compte = (part: number): number => Math.round(part * stats.matchs)
    if (stats.sans_encaisser >= 0.6) {
      faits.push({ avant: nom + ' a gardé sa cage ', cle: 'inviolée', apres: ' dans ' + compte(stats.sans_encaisser) + ' des ' + stats.matchs + ' derniers matchs.', ton: 'bon' })
    } else if (stats.plus_2_5 >= 0.8) {
      faits.push({ avant: 'Plus de 2,5 buts dans ', cle: compte(stats.plus_2_5) + ' des ' + stats.matchs, apres: ' derniers matchs de ' + nom + '.', ton: 'neutre' })
    } else if (stats.plus_2_5 <= 0.2) {
      faits.push({ avant: 'Moins de 2,5 buts dans ', cle: compte(1 - stats.plus_2_5) + ' des ' + stats.matchs, apres: ' derniers matchs de ' + nom + '.', ton: 'neutre' })
    } else if (stats.deux_marquent >= 0.8) {
      faits.push({ avant: 'Les deux équipes ont marqué dans ', cle: compte(stats.deux_marquent) + ' des ' + stats.matchs, apres: ' derniers matchs de ' + nom + '.', ton: 'neutre' })
    }
  }
  return faits
}

/** Faits marquants du match, générés uniquement à partir des données de forme et de stats de la fiche. */
export function faitsDuMatch(fiche: Prediction): Fait[] {
  const { domicile, exterieur } = fiche.equipes
  return [
    ...faitsEquipe(domicile, fiche.forme?.domicile, fiche.stats?.domicile),
    ...faitsEquipe(exterieur, fiche.forme?.exterieur, fiche.stats?.exterieur),
  ]
}
