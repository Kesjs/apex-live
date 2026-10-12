import { useCallback, useState } from 'react'
import type { Prediction } from '../domain/contracts'

/**
 * Favoris stockés sur l'appareil (localStorage), sans compte.
 * Quand l'authentification existera, il suffira de brancher cette fonction
 * sur le back-end.
 */

export type Favori = {
  id: string
  domicile: string
  exterieur: string
  competition: string
  date_heure: string
}

const CLE = 'apex:favoris'

function lire(): Favori[] {
  try {
    const brut = window.localStorage.getItem(CLE)
    if (!brut) return []
    const data: unknown = JSON.parse(brut)
    return Array.isArray(data) ? (data as Favori[]) : []
  } catch {
    return []
  }
}

function ecrire(favoris: Favori[]): void {
  try {
    window.localStorage.setItem(CLE, JSON.stringify(favoris))
  } catch {
    // Stockage indisponible (navigation privée…) : on ignore, l'app reste utilisable.
  }
}

export function useFavoris() {
  const [favoris, setFavoris] = useState<Favori[]>(lire)

  const estFavori = useCallback((id: string) => favoris.some(f => f.id === id), [favoris])

  const basculer = useCallback((fiche: Prediction) => {
    setFavoris(actuels => {
      const existe = actuels.some(f => f.id === fiche.match_id)
      const suivants = existe
        ? actuels.filter(f => f.id !== fiche.match_id)
        : [
            ...actuels,
            {
              id: fiche.match_id,
              domicile: fiche.equipes.domicile,
              exterieur: fiche.equipes.exterieur,
              competition: fiche.competition,
              date_heure: fiche.date_heure,
            },
          ]
      ecrire(suivants)
      return suivants
    })
  }, [])

  const retirer = useCallback((id: string) => {
    setFavoris(actuels => {
      const suivants = actuels.filter(f => f.id !== id)
      ecrire(suivants)
      return suivants
    })
  }, [])

  return { favoris, estFavori, basculer, retirer }
}
