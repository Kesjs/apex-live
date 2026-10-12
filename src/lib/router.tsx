import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'

/**
 * Mini routeur maison (aucune dépendance) : suffisant pour 5 écrans.
 * Si l'app grossit, on pourra le remplacer par react-router sans toucher aux pages
 * (elles n'utilisent que Link, useRouter et navigate).
 */

type Location = { path: string; search: string }
type RouterValue = Location & {
  /** Page d'où l'on vient dans l'app (pour le bouton retour), null si arrivée directe. */
  precedent: string | null
  navigate: (to: string, options?: { replace?: boolean }) => void
}

const RouterContext = createContext<RouterValue>({ path: '/', search: '', precedent: null, navigate: () => undefined })

function lire(): Location {
  return { path: window.location.pathname, search: window.location.search }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<Location>(lire)
  const [precedent, setPrecedent] = useState<string | null>(null)

  useEffect(() => {
    const onPop = () => {
      setLocation(lire())
      setPrecedent(null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const url = new URL(to, window.location.origin)
    // Garde le paramètre de test ?demo=... d'une page à l'autre.
    const demo = new URLSearchParams(window.location.search).get('demo')
    if (demo && !url.searchParams.has('demo')) url.searchParams.set('demo', demo)
    const cible = url.pathname + url.search
    if (options?.replace) window.history.replaceState(null, '', cible)
    else if (cible !== window.location.pathname + window.location.search) {
      setPrecedent(window.location.pathname)
      window.history.pushState(null, '', cible)
    }
    setLocation({ path: url.pathname, search: url.search })
    window.scrollTo(0, 0)
  }, [])

  const value = useMemo<RouterValue>(() => ({ ...location, precedent, navigate }), [location, precedent, navigate])
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouter(): RouterValue {
  return useContext(RouterContext)
}

type LinkProps = {
  to: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  'aria-label'?: string
  'aria-current'?: 'page' | undefined
}

export function Link({ to, children, className, style, ...rest }: LinkProps) {
  const { navigate } = useRouter()
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    navigate(to)
  }
  return (
    <a href={to} className={className} style={style} onClick={onClick} {...rest}>
      {children}
    </a>
  )
}
