import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Icon } from './Icon'
import type { NiveauRisque } from '../domain/contracts'
import { cote as formatCote, pct, risqueLabel } from '../lib/format'
import { usePrefs } from '../lib/prefs'

export type Ton = 'neutre' | 'ac' | 'am' | 'muet'

export function Chip({ ton = 'neutre', children, title, className = '', dataTooltip }: { ton?: Ton; children: ReactNode; title?: string; className?: string; dataTooltip?: string }) {
  return (
    <span className={'chip chip-' + ton + (className ? ' ' + className : '')} title={title} data-tooltip={dataTooltip}>
      {children}
    </span>
  )
}

export function Risque({ niveau }: { niveau: NiveauRisque }) {
  const ton: Ton = niveau === 'faible' ? 'ac' : 'am'
  const icone = niveau === 'faible' ? 'shield' : niveau === 'moyen' ? 'info' : 'warning'
  return (
    <Chip ton={ton} title={'Risque ' + niveau} className="risk-chip" dataTooltip={'Risque ' + niveau}>
      <Icon name={icone} size={14} strokeWidth={2} />
      <span className="sr-only">{risqueLabel[niveau]}</span>
    </Chip>
  )
}

export function ProbBar({ valeur, ton = 'ac', max = 1, delai = 0 }: { valeur: number; ton?: 'ac' | 'am'; max?: number; delai?: number }) {
  const largeur = Math.max(2, Math.min(100, (valeur / max) * 100))
  const style = { '--w': largeur + '%', '--delay': delai + 'ms' } as CSSProperties
  return (
    <div className={'bar bar-' + ton} role="presentation">
      <i style={style} />
    </div>
  )
}

export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <span className={'skeleton ' + className} style={style} aria-hidden="true" />
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state card" role="alert">
      <span className="state-icon">
        <Icon name="warning" size={24} />
      </span>
      <h2>Impossible d'afficher les données</h2>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          <Icon name="refresh" size={18} />
          Réessayer
        </button>
      )}
    </div>
  )
}

export function EmptyState({ titre, texte, action }: { titre: string; texte: string; action?: ReactNode }) {
  return (
    <div className="state card" role="status">
      <span className="state-icon">
        <Icon name="ball" size={24} />
      </span>
      <h2>{titre}</h2>
      <p>{texte}</p>
      {action}
    </div>
  )
}

export function Disclaimer() {
  return (
    <p className="disclaimer">
      Pronostics informatifs calculés à partir de statistiques. Aucun résultat n'est garanti. Jouer comporte des risques.
    </p>
  )
}

export function SectionTitle({ id, children, aside }: { id?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="section-title">
      <h2 id={id}>{children}</h2>
      {aside}
    </div>
  )
}

/** Cote d'un pronostic. N'affiche rien si la cote est absente ou si l'utilisateur a masqué les cotes. */
export function Cote({ valeur, mode = 'chip', prefixe = true, vide = false }: { valeur?: number; mode?: 'chip' | 'texte'; prefixe?: boolean; vide?: boolean }) {
  const { cotes } = usePrefs()
  if (valeur === undefined || !cotes) return vide ? <span /> : null
  const texte = (prefixe ? 'Cote ' : '') + formatCote(valeur)
  return mode === 'texte' ? <span className="tn muted">{texte}</span> : <Chip>{texte}</Chip>
}

function mouvementReduit(animations: boolean): boolean {
  return !animations || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

/** Pourcentage qui monte de 0 à sa valeur. Les lecteurs d'écran reçoivent directement la valeur finale. */
export function Compteur({ valeur, delai = 0, decimales = 0 }: { valeur: number; delai?: number; decimales?: number }) {
  const { animations } = usePrefs()
  const final = pct(valeur, decimales)
  const [affiche, setAffiche] = useState(() => (mouvementReduit(animations) ? final : pct(0, decimales)))

  useEffect(() => {
    if (mouvementReduit(animations)) {
      setAffiche(final)
      return
    }
    let image = 0
    const DUREE = 900
    const depart = performance.now() + delai
    const pas = (maintenant: number) => {
      const t = Math.min(1, Math.max(0, (maintenant - depart) / DUREE))
      const douce = 1 - Math.pow(1 - t, 3)
      setAffiche(pct(valeur * douce, decimales))
      if (t < 1) image = requestAnimationFrame(pas)
    }
    image = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(image)
  }, [valeur, delai, decimales, animations, final])

  return (
    <>
      <span aria-hidden="true">{affiche}</span>
      <span className="sr-only">{final}</span>
    </>
  )
}
