import { useEffect } from 'react'
import { Logo } from '../components/Icon'
import { useAuth } from '../lib/auth'
import { Link, useRouter } from '../lib/router'

/** Fond clair : trois bandes vertes floues. Utilisé par l'accueil et les pages de connexion. */
export function FondAccueil() {
  return (
    <div className="welcome-bands" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  )
}

export default function WelcomePage() {
  const { navigate } = useRouter()
  const { marquerVu } = useAuth()

  useEffect(() => {
    document.title = 'Bienvenue · Apex'
  }, [])

  const commencer = () => {
    marquerVu()
    navigate('/', { replace: true })
  }

  return (
    <div className="welcome">
      <FondAccueil />
      <div className="welcome-inner">
        <div className="welcome-brand">
          <Logo size={26} />
          <strong>Apex</strong>
        </div>
        <div className="welcome-copy">
          <h1>Le football, c'est mieux avec des pronos qui s'expliquent.</h1>
          <p>Issue, buts, bonus et score exact, avec le raisonnement derrière chaque choix.</p>
        </div>
        <div className="welcome-actions">
          <button type="button" className="welcome-cta" onClick={commencer}>
            <span>Commencer</span>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12h16" />
              <path d="M14 6l6 6-6 6" />
            </svg>
          </button>
          <p className="welcome-alt">
            Déjà un compte ? <Link to="/connexion">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
