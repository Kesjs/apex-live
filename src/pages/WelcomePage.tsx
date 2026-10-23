import { useEffect, useState } from 'react'
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
  const [intention, setIntention] = useState('comprendre')

  useEffect(() => {
    document.title = 'Bienvenue · Apex'
  }, [])

  const commencer = () => {
    window.localStorage.setItem('apex:intention', intention)
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
          <div className="welcome-intentions" role="group" aria-label="Votre objectif">
            <p className="welcome-intention-label">Qu'est-ce qui vous intéresse le plus ?</p>
            {[
              ['comprendre', 'Comprendre les matchs'],
              ['signaux', 'Voir les signaux les plus solides'],
              ['suivre', 'Suivre mes équipes'],
              ['evaluer', 'Voir les résultats d’Apex'],
            ].map(([value, label]) => <button key={value} type="button" className={intention === value ? 'is-selected' : ''} aria-pressed={intention === value} onClick={() => setIntention(value)}>{label}</button>)}
          </div>
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
