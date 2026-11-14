import { useEffect, useRef, useState } from 'react'
import { copyPartnerCode, PARTNER } from '../lib/partner'
import { Icon } from './Icon'

interface PartnerStripProps {
  variant?: 'sidebar' | 'banner'
  contextHint?: string
}

/** Bloc partenaire compact et sobre (sidebar desktop, Matchs, Fiche match). */
export function PartnerStrip({ variant = 'banner', contextHint }: PartnerStripProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  return (
    <aside
      className={`partner-strip partner-strip--${variant}`}
      aria-label={`Offre partenaire ${PARTNER.name} · code ${PARTNER.codePromo}`}
    >
      <div className="partner-strip__head">
        <span className="partner-strip__brand">
          <strong>{PARTNER.name}</strong> · Partenaire
        </span>
        <span className="partner-strip__tag">18+</span>
      </div>
      <p className="partner-strip__copy">
        {contextHint || PARTNER.shortPitch}
      </p>
      <div className="partner-strip__actions">
        <button
          type="button"
          className="partner-strip__btn"
          onClick={onCopy}
          aria-label={`Copier le code promo ${PARTNER.codePromo}`}
        >
          <span className="partner-strip__code">{PARTNER.codePromo}</span>
          <span className="partner-strip__action">
            <Icon name={copied ? 'check' : 'copy'} size={14} />
            {copied ? 'Copié' : 'Copier'}
          </span>
        </button>
        {PARTNER.affiliateUrl && (
          <a
            href={PARTNER.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer sponsored nofollow"
            className="partner-strip__link"
          >
            {PARTNER.visitLabel}
          </a>
        )}
      </div>
    </aside>
  )
}
