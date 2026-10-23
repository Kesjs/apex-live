import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Logo } from '../components/Icon'
import { useAuth } from '../lib/auth'
import { Link, useRouter } from '../lib/router'
import { FondAccueil } from './WelcomePage'

export default function AuthPage({ mode }: { mode: 'connexion' | 'inscription' }) {
  const { navigate } = useRouter()
  const { configuree, demanderCode, verifierCode, connexionGoogle, marquerVu } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeEnvoye, setCodeEnvoye] = useState(false)
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
    setEnvoi(true)
    const r = codeEnvoye ? await verifierCode(email, code) : await demanderCode(email)
    setEnvoi(false)
    if (!r.ok) setErreur(r.erreur)
    else if (!codeEnvoye) { setCodeEnvoye(true); setInfo('Un code à six chiffres vient d’être envoyé à ' + email.trim() + '.') }
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
        <button type="button" className="auth-google" disabled={!configuree || envoi} onClick={connexionGoogle}>
          <svg className="google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" />
            <path fill="#34A853" d="M12 21.99c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.99Z" />
            <path fill="#FBBC05" d="M6.54 14.08A5.85 5.85 0 0 1 6.23 12c0-.72.12-1.42.31-2.08V7.39H3.3A9.99 9.99 0 0 0 2 12c0 1.66.4 3.23 1.3 4.61l3.24-2.53Z" />
            <path fill="#EA4335" d="M12 5.89c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.84 2.93 14.63 2 12 2a9.74 9.74 0 0 0-8.7 5.39l3.24 2.53C7.31 7.61 9.46 5.89 12 5.89Z" />
          </svg>
          <span>Continuer avec Google</span>
        </button>
        <div className="auth-divider"><span>ou par e-mail</span></div>
        <form className="auth-form" onSubmit={soumettre} noValidate={false}>
          <label htmlFor="auth-email">Adresse e-mail</label>
          <input id="auth-email" type="email" autoComplete="email" inputMode="email" placeholder="vous@exemple.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={codeEnvoye} />
          {codeEnvoye && <><label htmlFor="auth-code">Code reçu par e-mail</label><input id="auth-code" className="auth-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></>}
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
          <button type="submit" className="welcome-cta" disabled={envoi || !configuree || (codeEnvoye && code.length !== 6)}>
            <span>{envoi ? 'Un instant…' : codeEnvoye ? 'Valider le code' : 'Recevoir mon code'}</span>
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
