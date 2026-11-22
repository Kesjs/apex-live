import type { LettreForme, Prediction, StatsEquipe } from '../domain/contracts'

/** Une phrase courte : le mot clé (coloré à l'écran) est isolé du reste. */
export type Fait = {
  equipe: 'domicile' | 'exterieur'
  avant: string
  cle: string
  apres: string
  ton: 'bon' | 'mauvais' | 'neutre'
  badge?: string
}

/** Nombre de matchs consécutifs identiques en partant du plus récent (la série va du plus ancien au plus récent). */
function serie(forme: LettreForme[], lettres: LettreForme[]): number {
  let n = 0
  for (let i = forme.length - 1; i >= 0 && lettres.includes(forme[i]); i--) n++
  return n
}

function faitsEquipe(
  equipe: 'domicile' | 'exterieur',
  nom: string,
  forme: LettreForme[] | undefined,
  stats: StatsEquipe | undefined,
): Fait[] {
  const faits: Fait[] = []
  if (forme && forme.length >= 3) {
    const defaites = serie(forme, ['D'])
    const victoires = serie(forme, ['V'])
    const invaincu = serie(forme, ['V', 'N'])
    const sansVictoire = serie(forme, ['N', 'D'])
    if (defaites >= 3) {
      faits.push({ equipe, avant: nom + ' a ', cle: 'perdu', apres: ' ses ' + defaites + ' derniers matchs.', ton: 'mauvais', badge: String(defaites) })
    } else if (victoires >= 3) {
      faits.push({ equipe, avant: nom + ' a ', cle: 'gagné', apres: ' ses ' + victoires + ' derniers matchs.', ton: 'bon', badge: String(victoires) })
    } else if (invaincu >= 4) {
      faits.push({ equipe, avant: nom + ' est ', cle: 'invaincu', apres: ' lors de ses ' + invaincu + ' derniers matchs.', ton: 'bon', badge: String(invaincu) })
    } else if (sansVictoire >= 4) {
      faits.push({ equipe, avant: nom + ' est ', cle: 'sans victoire', apres: ' lors de ses ' + sansVictoire + ' derniers matchs.', ton: 'mauvais', badge: String(sansVictoire) })
    }
  }
  if (stats && stats.matchs >= 3) {
    const compte = (part: number): number => Math.round(part * stats.matchs)
    if (stats.sans_encaisser >= 0.6) {
      const c = compte(stats.sans_encaisser)
      faits.push({ equipe, avant: nom + ' a gardé sa cage ', cle: 'inviolée', apres: ' dans ' + c + ' des ' + stats.matchs + ' derniers matchs.', ton: 'bon', badge: `${c}/${stats.matchs}` })
    } else if (stats.plus_2_5 >= 0.8) {
      const c = compte(stats.plus_2_5)
      faits.push({ equipe, avant: 'Plus de 2,5 buts dans ', cle: c + ' des ' + stats.matchs, apres: ' derniers matchs de ' + nom + '.', ton: 'neutre', badge: `${c}/${stats.matchs}` })
    } else if (stats.plus_2_5 <= 0.2) {
      const c = compte(1 - stats.plus_2_5)
      faits.push({ equipe, avant: 'Moins de 2,5 buts dans ', cle: c + ' des ' + stats.matchs, apres: ' derniers matchs de ' + nom + '.', ton: 'neutre', badge: `${c}/${stats.matchs}` })
    } else if (stats.deux_marquent >= 0.8) {
      const c = compte(stats.deux_marquent)
      faits.push({ equipe, avant: 'Les deux équipes ont marqué dans ', cle: c + ' des ' + stats.matchs, apres: ' derniers matchs de ' + nom + '.', ton: 'neutre', badge: `${c}/${stats.matchs}` })
    }
  }
  return faits
}

/** Faits marquants du match, générés uniquement à partir des données de forme et de stats de la fiche. */
export function faitsDuMatch(fiche: Prediction): Fait[] {
  const { domicile, exterieur } = fiche.equipes
  return [
    ...faitsEquipe('domicile', domicile, fiche.forme?.domicile, fiche.stats?.domicile),
    ...faitsEquipe('exterieur', exterieur, fiche.forme?.exterieur, fiche.stats?.exterieur),
  ]
}
