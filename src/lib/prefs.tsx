import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/** Réglages de l'utilisateur, gardés sur cet appareil. */
export type Prefs = { cotes: boolean; animations: boolean }

const DEFAUT: Prefs = { cotes: true, animations: true }
const CLE = 'apex:prefs:v2'
const ANCIENNE_CLE = 'apex:prefs'

function lire(): Prefs {
  try {
    const brut = window.localStorage.getItem(CLE)
    if (brut) {
      const o = JSON.parse(brut) as Partial<Prefs>
      return { cotes: o.cotes !== false, animations: o.animations !== false }
    }
    const ancien = window.localStorage.getItem(ANCIENNE_CLE)
    if (ancien) {
      const o = JSON.parse(ancien) as Partial<Prefs>
      return { cotes: true, animations: o.animations !== false }
    }
    return DEFAUT
  } catch {
    return DEFAUT
  }
}

type PrefsValue = Prefs & { modifier: (cle: keyof Prefs, valeur: boolean) => void }

const PrefsContext = createContext<PrefsValue>({ ...DEFAUT, modifier: () => undefined })

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(lire)

  useEffect(() => {
    document.documentElement.dataset.motion = prefs.animations ? 'normal' : 'reduit'
    try {
      window.localStorage.setItem(CLE, JSON.stringify(prefs))
    } catch {
      /* stockage indisponible : les réglages durent le temps de la visite */
    }
  }, [prefs])

  const modifier = useCallback((cle: keyof Prefs, valeur: boolean) => setPrefs(p => ({ ...p, [cle]: valeur })), [])
  const value = useMemo<PrefsValue>(() => ({ ...prefs, modifier }), [prefs, modifier])
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsValue {
  return useContext(PrefsContext)
}
