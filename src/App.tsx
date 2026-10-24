import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon, Logo } from './components/Icon'
import type { IconName } from './components/Icon'
import { EmptyState } from './components/ui'
import { LaunchIntro } from './components/LaunchIntro'
import HistoryPage from './pages/HistoryPage'
import HomePage from './pages/HomePage'
import MatchesPage from './pages/MatchesPage'
import MatchPage from './pages/MatchPage'
import SettingsPage from './pages/SettingsPage'
import AuthPage from './pages/AuthPage'
import WelcomePage from './pages/WelcomePage'
import { AuthProvider, useAuth } from './lib/auth'
import { DayProvider } from './lib/day'
import { PrefsProvider } from './lib/prefs'
import { Link, RouterProvider, useRouter } from './lib/router'
import { ApexAiTopBar } from './components/ApexAiTopBar'
import CommunityPage from './pages/CommunityPage'

type Entree = { to: string; label: string; icone: IconName; actif: (path: string) => boolean }

const ENTREES: Entree[] = [
  { to: '/', label: 'Accueil', icone: 'home', actif: p => p === '/' },
  { to: '/matchs', label: 'Matchs', icone: 'ball', actif: p => p === '/matchs' || p.startsWith('/match/') },
  { to: '/historique', label: 'Historique', icone: 'chart', actif: p => p === '/historique' },
  { to: '/communaute', label: 'Communauté', icone: 'card', actif: p => p === '/communaute' },
  { to: '/reglages', label: 'Réglages', icone: 'sliders', actif: p => p === '/reglages' },
]

const TITRES: Record<string, string> = {
  '/': 'Accueil',
  '/matchs': 'Matchs',
  '/historique': 'Historique',
  '/reglages': 'Réglages',
  '/communaute': 'Communauté',
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
  if (path === '/communaute') return <CommunityPage />
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
  const { navigate } = useRouter()
  const principal = useRef<HTMLElement>(null)
  const premier = useRef(true)
  const [rechercheOuverte, setRechercheOuverte] = useState(false)
  const [recherche, setRecherche] = useState('')

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
      <header className={'mobile-header' + (rechercheOuverte ? ' search-open' : '')}>
        <Link to="/" className="mobile-brand" aria-label="Apex, accueil">
          <Logo size={25} />
          <strong>Apex</strong>
        </Link>
        <form className="mobile-header-actions" onSubmit={event => { event.preventDefault(); navigate('/matchs?q=' + encodeURIComponent(recherche.trim())); setRechercheOuverte(false) }}>
          {rechercheOuverte && <input className="mobile-search-input" value={recherche} onChange={event => setRecherche(event.target.value)} placeholder="Rechercher une équipe" aria-label="Rechercher une équipe" autoFocus />}
          <button type="button" className="mobile-header-btn" aria-label={rechercheOuverte ? 'Fermer la recherche' : 'Rechercher'} onClick={() => setRechercheOuverte(value => !value)}><Icon name="search" size={19} /></button>
          <Link to="/reglages" className="mobile-header-btn" aria-label="Réglages"><Icon name="sliders" size={19} /></Link>
        </form>
      </header>
      <main id="main" ref={principal} tabIndex={-1}>
        <ApexAiTopBar />
        <div className="page" key={path}>
          <Routes />
        </div>
      </main>
      <Navigation variante="bottom" />
    </div>
  )
}

/** Écrans plein page (bienvenue, connexion) ; la première visite passe par la bienvenue, mais on peut toujours continuer sans compte. */
function Racine() {
  const { path, navigate } = useRouter()
  const { utilisateur, vu } = useAuth()
  const premiereVisite = path === '/' && !vu && !utilisateur

  useEffect(() => {
    if (premiereVisite) navigate('/bienvenue', { replace: true })
  }, [premiereVisite, navigate])

  if (path === '/bienvenue') return <WelcomePage />
  if (path === '/connexion') return <AuthPage mode="connexion" />
  if (path === '/inscription') return <AuthPage mode="inscription" />
  if (premiereVisite) return null
  return (
    <DayProvider>
      <Shell />
    </DayProvider>
  )
}

export default function App() {
  return (
    <PrefsProvider>
      <AuthProvider>
        <RouterProvider>
          <LaunchIntro><Racine /></LaunchIntro>
        </RouterProvider>
      </AuthProvider>
    </PrefsProvider>
  )
}
