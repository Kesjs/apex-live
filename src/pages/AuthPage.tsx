import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Logo } from '../components/Icon'
import { useAuth } from '../lib/auth'
import { Link, useRouter } from '../lib/router'
import { FondAccueil } from './WelcomePage'

export default function AuthPage({ mode }: { mode: 'connexion' | 'inscription' }) {
  const { navigate } = useRouter()
  const { configuree, connexion, inscription, marquerVu } = useAuth()
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const estConnexion = mode === 'connexion'

  useEffect(() => {
    document.title = (estConnexion ? 'Connexion' : 'Créer un compte') + ' · Apex'
    setErreur('')
    setInfo('')
  }, [estConnexion])

  const sansCompte = () => {
    marquerVu()
    navigate('/', { replace: true })
  }

  const soumettre = async (event: FormEvent) => {
    event.preventDefault()
    if (envoi) return
    setErreur('')
    setInfo('')
    if (mdp.length < 6) {
      setErreur('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    setEnvoi(true)
    const r = await (estConnexion ? connexion(email, mdp) : inscription(email, mdp))
    setEnvoi(false)
    if (!r.ok) setErreur(r.erreur)
    else if (r.confirmation) setInfo('Compte créé. Ouvrez le lien envoyé à ' + email.trim() + ' pour confirmer votre adresse, puis connectez-vous.')
    else navigate('/', { replace: true })
  }

  return (
    <div className="welcome">
      <FondAccueil />
      <div className="welcome-inner auth">
        <Link to="/bienvenue" className="welcome-brand" aria-label="Apex, retour à la bienvenue">
          <Logo size={26} />
          <strong>Apex</strong>
        </Link>
        <h1 className="auth-title">{estConnexion ? 'Bon retour.' : 'Créez votre compte.'}</h1>
        {!configuree && <p className="auth-note">La connexion n'est pas encore activée sur cette version. Vous pouvez tout de même voir les matchs sans compte.</p>}
        <form className="auth-form" onSubmit={soumettre} noValidate={false}>
          <label htmlFor="auth-email">Adresse e-mail</label>
          <input id="auth-email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={e => setEmail(e.target.value)} />
          <label htmlFor="auth-mdp">Mot de passe</label>
          <input id="auth-mdp" type="password" autoComplete={estConnexion ? 'current-password' : 'new-password'} required minLength={6} value={mdp} onChange={e => setMdp(e.target.value)} />
          {erreur && (
            <p className="auth-erreur" role="alert">
              {erreur}
            </p>
          )}
          {info && (
            <p className="auth-info" role="status">
              {info}
            </p>
          )}
          <button type="submit" className="welcome-cta" disabled={envoi || !configuree}>
            <span>{envoi ? 'Un instant…' : estConnexion ? 'Se connecter' : 'Créer mon compte'}</span>
          </button>
        </form>
        <p className="welcome-alt">
          {estConnexion ? (
            <>
              Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
            </>
          ) : (
            <>
              Déjà un compte ? <Link to="/connexion">Se connecter</Link>
            </>
          )}
        </p>
        <button type="button" className="auth-skip" onClick={sansCompte}>
          Continuer sans compte
        </button>
      </div>
    </div>
  )
}
