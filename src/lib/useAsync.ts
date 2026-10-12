import { useEffect, useState } from 'react'

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: Error }
  | { status: 'ready'; data: T }

/**
 * Charge des données asynchrones et gère les trois états de l'écran :
 * chargement, erreur, prêt. Renvoie aussi une fonction « réessayer ».
 */
export function useAsync<T>(charger: () => Promise<T>, deps: ReadonlyArray<unknown>): [AsyncState<T>, () => void] {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const [essai, setEssai] = useState(0)

  useEffect(() => {
    let annule = false
    setState({ status: 'loading' })
    charger().then(
      data => {
        if (!annule) setState({ status: 'ready', data })
      },
      (error: unknown) => {
        if (!annule) setState({ status: 'error', error: error instanceof Error ? error : new Error(String(error)) })
      },
    )
    return () => {
      annule = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, essai])

  return [state, () => setEssai(n => n + 1)]
}
