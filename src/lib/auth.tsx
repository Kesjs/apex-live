import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Connexion facultative (Supabase Auth, sans bibliothèque). Apex fonctionne toujours sans compte :
 * « continuer sans compte » marque seulement l'écran de bienvenue comme vu sur cet appareil.
 */

const URL_SUPABASE = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '')
const CLE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const authConfiguree = Boolean(URL_SUPABASE && CLE_ANON)

const CLE_SESSION = 'apex:session'
const CLE_VU = 'apex:accueil-vu'

type Session = { access_token: string; refresh_token: string; expires_at: number; email: string }
export type Utilisateur = { email: string }
export type ResultatAuth = { ok: true; confirmation?: boolean } | { ok: false; erreur: string }

function lireStockage(cle: string): string | null {
  try {
    return window.localStorage.getItem(cle)
  } catch {
    return null
  }
}
function ecrireStockage(cle: string, valeur: string | null): void {
  try {
    if (valeur === null) window.localStorage.removeItem(cle)
    else window.localStorage.setItem(cle, valeur)
  } catch {
    /* stockage indisponible : la session dure le temps de la visite */
  }
}

function lireSession(): Session | null {
  const brut = lireStockage(CLE_SESSION)
  if (!brut) return null
  try {
    const s = JSON.parse(brut) as Session
    return s.access_token && s.refresh_token && s.email ? s : null
  } catch {
    return null
  }
}

const MESSAGES: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'E-mail ou mot de passe incorrect.'],
  [/already registered|already been registered/i, 'Un compte existe déjà avec cet e-mail. Essayez de vous connecter.'],
  [/password should be at least|weak password/i, 'Le mot de passe est trop court (6 caractères minimum).'],
  [/email not confirmed/i, "Confirmez d'abord votre e-mail grâce au lien reçu dans votre boîte de réception."],
  [/rate limit|too many/i, 'Trop de tentatives. Réessayez dans quelques minutes.'],
  [/valid email|invalid email/i, "Cette adresse e-mail n'a pas l'air valide."],
]

function traduire(message: string): string {
  return MESSAGES.find(([re]) => re.test(message))?.[1] ?? 'Une erreur est survenue. Réessayez dans un instant.'
}

type Corps = { access_token?: string; refresh_token?: string; expires_in?: number; user?: { email?: string }; error_description?: string; msg?: string; message?: string }

async function appeler(chemin: string, corps: Record<string, string>): Promise<{ ok: boolean; data: Corps }> {
  const reponse = await fetch(URL_SUPABASE + '/auth/v1' + chemin, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: CLE_ANON as string },
    body: JSON.stringify(corps),
  })
  const data = (await reponse.json().catch(() => ({}))) as Corps
  return { ok: reponse.ok, data }
}

function versSession(data: Corps, emailSecours: string): Session | null {
  if (!data.access_token || !data.refresh_token) return null
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    email: data.user?.email ?? emailSecours,
  }
}

type AuthValue = {
  utilisateur: Utilisateur | null
  /** true une fois l'écran de bienvenue passé (avec ou sans compte). */
  vu: boolean
  configuree: boolean
  marquerVu: () => void
  connexion: (email: string, mdp?: string) => Promise<ResultatAuth>
  inscription: (email: string, mdp?: string) => Promise<ResultatAuth>
  demanderCode: (email: string) => Promise<ResultatAuth>
  verifierCode: (email: string, code: string) => Promise<ResultatAuth>
  connexionGoogle: () => void
  deconnexion: () => void
}

const AuthContext = createContext<AuthValue>({
  utilisateur: null,
  vu: true,
  configuree: false,
  marquerVu: () => undefined,
  connexion: async () => ({ ok: false, erreur: 'Indisponible.' }),
  inscription: async () => ({ ok: false, erreur: 'Indisponible.' }),
  demanderCode: async () => ({ ok: false, erreur: 'Indisponible.' }),
  verifierCode: async () => ({ ok: false, erreur: 'Indisponible.' }),
  connexionGoogle: () => undefined,
  deconnexion: () => undefined,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(lireSession)
  const [vu, setVu] = useState<boolean>(() => lireStockage(CLE_VU) === '1' || lireSession() !== null)

  const garder = useCallback((s: Session | null) => {
    setSession(s)
    ecrireStockage(CLE_SESSION, s ? JSON.stringify(s) : null)
    if (s) {
      setVu(true)
      ecrireStockage(CLE_VU, '1')
    }
  }, [])

  // Session expirée ou presque : on la renouvelle ; si ça échoue, on repasse en mode sans compte.
  useEffect(() => {
    if (!session || !authConfiguree || session.expires_at * 1000 > Date.now() + 60_000) return
    appeler('/token?grant_type=refresh_token', { refresh_token: session.refresh_token })
      .then(r => garder(r.ok ? versSession(r.data, session.email) : null))
      .catch(() => undefined)
  }, [session, garder])

  const marquerVu = useCallback(() => {
    setVu(true)
    ecrireStockage(CLE_VU, '1')
  }, [])

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const access = hash.get('access_token')
    const refresh = hash.get('refresh_token')
    if (!access || !refresh) return
    garder({ access_token: access, refresh_token: refresh, expires_at: Math.floor(Date.now() / 1000) + Number(hash.get('expires_in') ?? 3600), email: hash.get('user_email') ?? 'Compte Google' })
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }, [garder])

  const demander = useCallback(
    async (chemin: string, email: string, mdp: string): Promise<ResultatAuth> => {
      if (!authConfiguree) return { ok: false, erreur: "La connexion n'est pas encore activée sur cette version." }
      try {
        const r = await appeler(chemin, { email: email.trim(), password: mdp })
        if (!r.ok) return { ok: false, erreur: traduire(r.data.error_description ?? r.data.msg ?? r.data.message ?? '') }
        const s = versSession(r.data, email.trim())
        if (s) {
          garder(s)
          return { ok: true }
        }
        return { ok: true, confirmation: true }
      } catch {
        return { ok: false, erreur: 'Impossible de joindre le serveur. Vérifiez votre connexion.' }
      }
    },
    [garder],
  )

  const connexion = useCallback((email: string, mdp = '') => demander('/token?grant_type=password', email, mdp), [demander])
  const inscription = useCallback((email: string, mdp = '') => demander('/signup', email, mdp), [demander])
  const demanderCode = useCallback(async (email: string): Promise<ResultatAuth> => {
    if (!authConfiguree) return { ok: false, erreur: "La connexion n'est pas encore activée sur cette version." }
    try {
      const r = await appeler('/otp', { email: email.trim() })
      return r.ok ? { ok: true, confirmation: true } : { ok: false, erreur: traduire(r.data.error_description ?? r.data.msg ?? r.data.message ?? '') }
    } catch { return { ok: false, erreur: 'Impossible de joindre le serveur. Vérifiez votre connexion.' } }
  }, [])
  const verifierCode = useCallback(async (email: string, code: string): Promise<ResultatAuth> => {
    if (!authConfiguree) return { ok: false, erreur: "La connexion n'est pas encore activée sur cette version." }
    try {
      const r = await appeler('/verify', { email: email.trim(), token: code.trim(), type: 'email' })
      if (!r.ok) return { ok: false, erreur: traduire(r.data.error_description ?? r.data.msg ?? r.data.message ?? '') }
      const s = versSession(r.data, email.trim())
      if (s) garder(s)
      return s ? { ok: true } : { ok: false, erreur: 'Le code a été accepté, mais la session n’a pas pu être ouverte.' }
    } catch { return { ok: false, erreur: 'Impossible de joindre le serveur. Vérifiez votre connexion.' } }
  }, [garder])
  const connexionGoogle = useCallback(() => {
    if (!authConfiguree) return
    const redirect = encodeURIComponent(window.location.origin + '/')
    window.location.assign(URL_SUPABASE + '/auth/v1/authorize?provider=google&redirect_to=' + redirect)
  }, [])
  const deconnexion = useCallback(() => garder(null), [garder])

  const value = useMemo<AuthValue>(
    () => ({ utilisateur: session ? { email: session.email } : null, vu, configuree: authConfiguree, marquerVu, connexion, inscription, demanderCode, verifierCode, connexionGoogle, deconnexion }),
    [session, vu, marquerVu, connexion, inscription, demanderCode, verifierCode, connexionGoogle, deconnexion],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  return useContext(AuthContext)
}
