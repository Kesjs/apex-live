import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { usePrefs } from '../lib/prefs'
import './LaunchIntro.css'

const SESSION_KEY = 'apex:intro:v1'

function alreadySeen() {
  try { return window.sessionStorage.getItem(SESSION_KEY) === '1' } catch { return false }
}

/** The application loads beneath the introduction; navigation never replays it. */
export function LaunchIntro({ children }: { children: ReactNode }) {
  const { animations } = usePrefs()
  const [visible, setVisible] = useState(() => !alreadySeen())
  const [leaving, setLeaving] = useState(false)
  const content = useRef<HTMLDivElement>(null)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(() => setLeaving(true), reduced || !animations ? 1000 : 2800)
    return () => window.clearTimeout(timer)
  }, [visible, reduced, animations])

  useEffect(() => {
    if (!leaving) return
    const timer = window.setTimeout(() => {
      try { window.sessionStorage.setItem(SESSION_KEY, '1') } catch { /* Optional storage. */ }
      setVisible(false)
    }, reduced || !animations ? 0 : 420)
    return () => window.clearTimeout(timer)
  }, [leaving, reduced, animations])

  useEffect(() => {
    if (!visible) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [visible])

  return <>
    <div ref={content} inert={visible} aria-hidden={visible || undefined}>{children}</div>
    {visible && <div className={'launch-intro' + (leaving ? ' is-leaving' : '') + (reduced || !animations ? ' is-still' : '')}
      role="dialog" aria-modal="true" aria-labelledby="launch-title" aria-describedby="launch-message"
      onKeyDown={event => {
        if (event.key === 'Escape') setLeaving(true)
        if (event.key === 'Tab') { event.preventDefault(); event.currentTarget.querySelector('button')?.focus() }
      }}>
      <div className="launch-intro__pitch" aria-hidden="true"><i /><i /></div>
      <div className="launch-intro__content">
        <div className="launch-intro__mark" aria-hidden="true">
          <svg className="launch-intro__logo" viewBox="0 0 100 100" fill="none">
            <path className="launch-intro__stroke launch-intro__stroke--left" d="M50 8L9 92h21l20-46 20 46h21L50 8Z" />
            <path className="launch-intro__stroke launch-intro__stroke--right" d="M50 8L91 92H70L50 46 30 92H9L50 8Z" />
            <path className="launch-intro__stroke launch-intro__stroke--bar" d="M30 68h40l7 13H23l7-13Z" />
          </svg>
        </div>
        <h1 id="launch-title" className="launch-intro__name">Apex</h1>
        <p id="launch-message" className="launch-intro__message">Le football nous rassemble.<br /><span>Chaque match a son histoire.</span></p>
        <span className="launch-intro__line" aria-hidden="true" />
      </div>
      <button type="button" className="launch-intro__skip" autoFocus onClick={() => setLeaving(true)}>Passer l’introduction <span aria-hidden="true">↗</span></button>
    </div>}
  </>
}
