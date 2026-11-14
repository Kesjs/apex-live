import { useEffect, useRef, useState } from 'react'
import { copyPartnerCode, PARTNER } from '../lib/partner'
import { Icon } from './Icon'

interface PartnerStripProps {
  variant?: 'sidebar' | 'banner'
  contextHint?: string
}

/**
 * Bannière publicitaire photographique partenaire (format barre latérale ou leaderboard).
 * Style visuel cohérent avec ApexPromoCarousel : fond stade nocturne, coupon « kenken » et mention 18+.
 */
export function PartnerStrip({ variant = 'banner', contextHint }: PartnerStripProps) {
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const onCopy = async () => {
    setCopyFailed(false)
    const ok = await copyPartnerCode()
    if (!ok) {
      setCopied(false)
      setCopyFailed(true)
      return
    }
    setCopied(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setCopied(false), 2000)
  }

  const backdrop = variant === 'sidebar' ? '/apex-kenken/stade.webp' : '/apex-kenken/ballon.webp'

  return (
    <aside
      className={`partner-ad partner-ad--${variant}`}
      aria-label={`Publicité ${PARTNER.name} · code promo ${PARTNER.codePromo}`}
    >
      <div
        className="partner-ad__bg"
        style={{ backgroundImage: `url(${backdrop})` }}
        aria-hidden="true"
      />
      <div className="partner-ad__scrim" aria-hidden="true" />

      <div className="partner-ad__content">
        <div className="partner-ad__info">
          <div className="partner-ad__top">
            <span className="partner-ad__logo" aria-label={PARTNER.name}>
              1X<span>BET</span>
            </span>
            <span className="partner-ad__badge">Sponsorisé · 18+</span>
          </div>
          <p className="partner-ad__headline">
            {variant === 'sidebar'
              ? 'Bonus bienvenue jusqu’à 200 %'
              : PARTNER.headline}
          </p>
          {variant === 'banner' && (
            <p className="partner-ad__sub">
              {contextHint || PARTNER.shortPitch}
            </p>
          )}
        </div>

        <div className="partner-ad__ticket-group">
          <div className="partner-ad__ticket">
            <span className="partner-ad__ticket-label">CODE PROMO</span>
            <strong className="partner-ad__ticket-code">{PARTNER.codePromo}</strong>
          </div>
          <button
            type="button"
            className="partner-ad__copy"
            onClick={onCopy}
            aria-label={`Copier le code promo ${PARTNER.codePromo}`}
          >
            <Icon name={copied ? 'check' : 'copy'} size={15} />
            <span>{copied ? 'Copié' : 'Copier'}</span>
          </button>
          {PARTNER.affiliateUrl && (
            <a
              href={PARTNER.affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored nofollow"
              className="partner-ad__visit"
            >
              {PARTNER.visitLabel}
            </a>
          )}
        </div>
      </div>

      {copyFailed && (
        <p className="partner-ad__error" role="status">
          Sélectionnez le code « {PARTNER.codePromo} » ci-dessus pour le copier.
        </p>
      )}
    </aside>
  )
}
