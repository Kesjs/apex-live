import { useEffect, useRef, useState } from 'react'
import { copyPartnerCode, PARTNER } from '../lib/partner'
import { Icon } from './Icon'
import './ApexPromoCarousel.css'

type Slide = {
  title: string
  description: string
  image: string
}

const slides: Slide[] = [
  {
    title: 'Le football à l’honneur.',
    description: `Retrouvez votre code promo ${PARTNER.name} en un geste.`,
    image: '/apex-kenken/stade.webp',
  },
  {
    title: 'Chaque match a son ambiance.',
    description: `Un seul code à garder sous la main : ${PARTNER.codePromo}.`,
    image: '/apex-kenken/ballon.webp',
  },
  {
    title: 'Votre code, toujours prêt.',
    description: `Copiez ${PARTNER.codePromo} facilement depuis Apex.`,
    image: '/apex-kenken/tribunes.webp',
  },
]

/**
 * Bannière partenaire pour Apex.
 * affiliateUrl reste facultatif : ne pas inventer de lien partenaire.
 */
export default function ApexPromoCarousel({
  affiliateUrl = PARTNER.affiliateUrl || undefined,
}: {
  affiliateUrl?: string
}) {
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const startX = useRef<number | null>(null)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduceMotion(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (reduceMotion || paused || hovered || focused) return
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setActive(index => (index + 1) % slides.length)
      }
    }, 5000)
    return () => window.clearInterval(interval)
  }, [paused, reduceMotion, hovered, focused])

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current)
  }, [])

  const copyPromo = async () => {
    setCopyFailed(false)
    const ok = await copyPartnerCode()
    if (!ok) {
      setCopied(false)
      setCopyFailed(true)
      return
    }
    setCopied(true)
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section
      className="apxPromo"
      data-paused={paused || hovered || focused}
      aria-label={`Publicité ${PARTNER.name} · code promo ${PARTNER.codePromo}`}
      aria-roledescription="carrousel publicitaire"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={e => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
      }}
      onTouchStart={e => {
        startX.current = e.touches[0].clientX
        setPaused(true)
      }}
      onTouchEnd={e => {
        if (startX.current == null) return
        const dx = e.changedTouches[0].clientX - startX.current
        if (Math.abs(dx) > 42) {
          setActive(index => (index + (dx < 0 ? 1 : slides.length - 1)) % slides.length)
        }
        startX.current = null
      }}
      onTouchCancel={() => {
        startX.current = null
      }}
    >
      <div className="apxPromo__track" style={{ transform: `translateX(-${active * 100}%)` }}>
        {slides.map((slide, index) => (
          <div className="apxPromo__slide" aria-hidden={active !== index} key={slide.image}>
            <div className="apxPromo__photo" style={{ backgroundImage: `url(${slide.image})` }} />
          </div>
        ))}
      </div>
      <div className="apxPromo__gradient" aria-hidden="true" />
      <header className="apxPromo__top">
        <div className="apxPromo__logo" aria-label={PARTNER.name}>
          1X<span>BET</span>
        </div>
        <span className="apxPromo__adLabel">Publicité</span>
      </header>
      <div className="apxPromo__message" key={active} aria-live="off">
        <h3>{slides[active].title}</h3>
        <p>{slides[active].description}</p>
      </div>
      <div className="apxPromo__bottom">
        <div className="apxPromo__actions">
          <div className="apxPromo__code">
            <small>CODE PROMO</small>
            <strong>{PARTNER.codePromo}</strong>
          </div>
          <button
            className="apxPromo__copy"
            type="button"
            onClick={copyPromo}
            aria-label={`Copier le code promo ${PARTNER.codePromo}`}
          >
            <Icon name={copied ? 'check' : 'copy'} size={15} />
            {copied ? 'Copié' : 'Copier'}
          </button>
          {affiliateUrl && (
            <a
              href={affiliateUrl}
              target="_blank"
              rel="noopener noreferrer sponsored nofollow"
              className="apxPromo__visit"
            >
              Visiter
            </a>
          )}
        </div>
        <div className="apxPromo__row">
          <span>18+ · Jouer comporte des risques</span>
          <div className="apxPromo__dots" role="group" aria-label="Commandes du carrousel publicitaire">
            {!reduceMotion && (
              <button
                type="button"
                className="apxPromo__pause"
                aria-label={paused ? 'Reprendre le carrousel' : 'Mettre en pause le carrousel'}
                onClick={() => setPaused(p => !p)}
              >
                {paused ? '▶' : '⏸'}
              </button>
            )}
            {slides.map((s, idx) => (
              <button
                key={s.image}
                type="button"
                className={`apxPromo__dot ${active === idx ? 'apxPromo__dot--active' : ''}`}
                aria-label={`Afficher l’annonce ${idx + 1} sur ${slides.length}`}
                aria-pressed={active === idx}
                onClick={() => setActive(idx)}
              />
            ))}
          </div>
        </div>
        {copyFailed && (
          <p className="apxPromo__error" role="status">
            Sélectionnez le code « {PARTNER.codePromo} » ci-dessus pour le copier.
          </p>
        )}
      </div>
    </section>
  )
}
