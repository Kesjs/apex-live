import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon, Logo } from './components/Icon'
import type { IconName } from './components/Icon'
import { EmptyState } from './components/ui'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import MatchesPage from './pages/MatchesPage'
import MatchPage from './pages/MatchPage'
import SettingsPage from './pages/SettingsPage'
import { DayProvider } from './lib/day'
import { PrefsProvider } from './lib/prefs'
import { Link, RouterProvider, useRouter } from './lib/router'

type Entree = { to: string; label: string; icone: IconName; actif: (path: string) => boolean }

const ENTREES: Entree[] = [
  { to: '/', label: 'Accueil', icone: 'home', actif: p => p === '/' },
  { to: '/matchs', label: 'Matchs', icone: 'ball', actif: p => p === '/matchs' || p.startsWith('/match/') },
  { to: '/historique', label: 'Historique', icone: 'chart', actif: p => p === '/historique' },
  { to: '/reglages', label: 'Réglages', icone: 'sliders', actif: p => p === '/reglages' },
]

const TITRES: Record<string, string> = {
  '/': 'Accueil',
  '/matchs': 'Matchs',
  '/historique': 'Historique',
  '/reglages': 'Réglages',
}

function Navigation({ variante }: { variante: 'sidebar' | 'bottom' }) {
  const { path } = useRouter()
  return (
    <nav className={variante === 'sidebar' ? 'nav-side' : 'nav-bottom'} aria-label={variante === 'sidebar' ? 'Navigation principale' : 'Navigation mobile'}>
      {ENTREES.map(e => {
        const actif = e.actif(path)
        return (
          <Link key={e.to} to={e.to} className={'nav-link' + (actif ? ' is-active' : '')} aria-current={actif ? 'page' : undefined}>
            <Icon name={e.icone} size={variante === 'sidebar' ? 22 : 24} />
            <span>{e.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

function Routes(): ReactNode {
  const { path } = useRouter()
  if (path === '/') return <HomePage />
  if (path === '/matchs') return <MatchesPage />
  if (path === '/historique') return <HistoryPage />
  if (path === '/reglages') return <SettingsPage />
  const detail = /^\/match\/([^/]+)\/?$/.exec(path)
  if (detail) return <MatchPage matchId={decodeURIComponent(detail[1])} />
  return (
    <div className="page-body">
      <EmptyState
        titre="Page introuvable"
        texte="Cette page n'existe pas."
        action={
          <Link to="/" className="btn btn-secondary">
            Retour à l'accueil
          </Link>
        }
      />
    </div>
  )
}

function Shell() {
  const { path } = useRouter()
  const principal = useRef<HTMLElement>(null)
  const premier = useRef(true)

  useEffect(() => {
    document.title = (TITRES[path] ?? 'Apex') + ' · Apex'
    if (premier.current) {
      premier.current = false
      return
    }
    // Après un changement de page, le lecteur d'écran et le clavier repartent du contenu.
    principal.current?.focus({ preventScroll: true })
  }, [path])

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Aller au contenu
      </a>
      <aside className="sidebar">
        <Link to="/" className="brand" aria-label="Apex, accueil">
          <Logo size={34} />
          <span>
            <strong>Apex</strong>
            <small>Le football en chiffres</small>
          </span>
        </Link>
        <Navigation variante="sidebar" />
        <p className="sidebar-note">Pronostics informatifs calculés à partir de statistiques. Aucun résultat n'est garanti. Jouer comporte des risques.</p>
      </aside>
      <main id="main" ref={principal} tabIndex={-1}>
        <div className="page" key={path}>
          <Routes />
        </div>
      </main>
      <Navigation variante="bottom" />
    </div>
  )
}

export default function App() {
  return (
    <PrefsProvider>
      <RouterProvider>
        <DayProvider>
          <Shell />
        </DayProvider>
      </RouterProvider>
    </PrefsProvider>
  )
}
