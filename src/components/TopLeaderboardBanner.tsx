import { useEffect, useRef, useState } from 'react'
import { copyPartnerCode, PARTNER } from '../lib/partner'
import { Icon } from './Icon'
import './TopLeaderboardBanner.css'

const SLIDES = [
  {
    headline: 'Jusqu’à 200 % de bonus sur votre 1er dépôt',
    sub: 'Activez l’offre partenaire lors de votre inscription.',
  },
  {
    headline: 'Boostez vos paris sur les affiches du jour',
    sub: `Utilisez le code promo ${PARTNER.codePromo} sur ${PARTNER.name}.`,
  },
  {
    headline: 'Cotes en direct & bonus de bienvenue',
    sub: `Copiez le code ${PARTNER.codePromo} en un clic avant de jouer.`,
  },
] as const

/**
 * Bannière Leaderboard animée en haut de page (format Sofascore).
 * Native HTML/CSS (non bloquée par AdBlock), responsive desktop + mobile.
 */
export function TopLeaderboardBanner() {
  const [slideIdx, setSlideIdx] = useState(0)
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const id = window.setInterval(() => {
      setSlideIdx(i => (i + 1) % SLIDES.length)
    }, 5200)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const onCopy = async () => {
    const ok = await copyPartnerCode()
    if (!ok) return
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  const slide = SLIDES[slideIdx]

  return (
    <div className="leaderboard-shell">
      <aside
        className="leaderboard-ad"
        aria-label={`Publicité ${PARTNER.name} · code promo ${PARTNER.codePromo}`}
      >
        <div
          className="leaderboard-ad__bg"
          style={{ backgroundImage: 'url(/apex-kenken/stade.webp)' }}
          aria-hidden="true"
        />
        <div className="leaderboard-ad__scrim" aria-hidden="true" />
        <div className="leaderboard-ad__sweep" aria-hidden="true" />

        <div className="leaderboard-ad__inner">
          <div className="leaderboard-ad__brand">
            <span className="leaderboard-ad__pub">Publicité</span>
            <span className="leaderboard-ad__logo" aria-label={PARTNER.name}>
              1X<span>BET</span>
            </span>
          </div>

          <div className="leaderboard-ad__copy" key={slideIdx}>
            <p className="leaderboard-ad__headline">{slide.headline}</p>
            <p className="leaderboard-ad__sub">{slide.sub}</p>
          </div>

          <div className="leaderboard-ad__actions">
            <div className="leaderboard-ad__coupon">
              <span className="leaderboard-ad__coupon-label">CODE PROMO :</span>
              <strong className="leaderboard-ad__coupon-code">{PARTNER.codePromo}</strong>
              <button
                type="button"
                className="leaderboard-ad__copy-btn"
                onClick={onCopy}
                aria-label={`Copier le code promo ${PARTNER.codePromo}`}
              >
                <Icon name={copied ? 'check' : 'copy'} size={14} />
                <span>{copied ? 'Copié' : 'Copier'}</span>
              </button>
            </div>

            {PARTNER.affiliateUrl && (
              <a
                href={PARTNER.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer sponsored nofollow"
                className="leaderboard-ad__cta"
              >
                {PARTNER.visitLabel}
                <Icon name="arrow" size={15} />
              </a>
            )}
          </div>
        </div>

        <span className="leaderboard-ad__legal">18+ · Jouer comporte des risques.</span>
      </aside>
    </div>
  )
}
