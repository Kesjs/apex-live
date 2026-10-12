import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { todayISO } from './format'

/** Jour sélectionné, partagé entre l'Accueil et la page Matchs. */
type DayValue = { jour: string; setJour: (jour: string) => void }

const DayContext = createContext<DayValue>({ jour: todayISO(), setJour: () => undefined })

export function DayProvider({ children }: { children: ReactNode }) {
  const [jour, setJour] = useState<string>(todayISO)
  const value = useMemo<DayValue>(() => ({ jour, setJour }), [jour])
  return <DayContext.Provider value={value}>{children}</DayContext.Provider>
}

export function useDay(): DayValue {
  return useContext(DayContext)
}
