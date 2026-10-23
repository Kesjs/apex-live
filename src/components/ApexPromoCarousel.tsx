'use client';

import { useEffect, useRef, useState } from 'react';
import './ApexPromoCarousel.css';

type Slide = {
  title: string;
  description: string;
  image: string;
};

const slides: Slide[] = [
  {
    title: 'Le football à l’honneur.',
    description: 'Retrouvez votre code promo 1xBet en un geste.',
    image: '/apex-kenken/stade.webp',
  },
  {
    title: 'Chaque match a son ambiance.',
    description: 'Un seul code à garder sous la main : kenken.',
    image: '/apex-kenken/ballon.webp',
  },
  {
    title: 'Votre code, toujours prêt.',
    description: 'Copiez-le facilement depuis Apex.',
    image: '/apex-kenken/tribunes.webp',
  },
];

const CODE = 'kenken';

/**
 * Bannière publicitaire mobile pour Apex.
 * affiliateUrl reste facultatif : ne pas inventer de lien partenaire.
 * Ne pas faire passer cette publicité pour un pronostic Apex.
 */
export default function ApexPromoCarousel({
  affiliateUrl,
}: {
  affiliateUrl?: string;
}) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const startX = useRef<number | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduceMotion(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || hovered || focused) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setActive((index) => (index + 1) % slides.length);
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [paused, reduceMotion, hovered, focused]);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const copyPromo = async () => {
    setCopyFailed(false);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(CODE);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = CODE;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const didCopy = document.execCommand('copy');
        textarea.remove();
        if (!didCopy) throw new Error('La copie est indisponible');
      }
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Le navigateur empêchant la copie, afficher une valeur sélectionnable.
      setCopied(false);
      setCopyFailed(true);
    }
  };

  return (
    <section
      className="apxPromo"
      data-paused={paused || hovered || focused}
      aria-label="Publicité 1xBet — code promo kenken"
      aria-roledescription="carrousel publicitaire"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        if (startX.current == null) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        if (Math.abs(dx) > 42) {
          setActive((index) => (index + (dx < 0 ? 1 : slides.length - 1)) % slides.length);
        }
        startX.current = null;
      }}
      onTouchCancel={() => { startX.current = null; }}
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
        <div className="apxPromo__logo" aria-label="1xBet">1X<span>BET</span></div>
        <span className="apxPromo__adLabel">Publicité</span>
      </header>
      <div className="apxPromo__message" key={active} aria-live="off">
        <h3>{slides[active].title}</h3>
        <p>{slides[active].description}</p>
      </div>
      <div className="apxPromo__bottom">
        <div className="apxPromo__actions">
          <div className="apxPromo__code"><small>CODE PROMO</small><strong>kenken</strong></div>
          <button className="apxPromo__copy" type="button" onClick={copyPromo}
                  aria-label="Copier le code promo kenken">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1"
                 strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="8" y="8" width="12" height="12" rx="2" />
              <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
            </svg>
            {copied ? 'Copié !' : 'Copier'}
          </button>
          {affiliateUrl && <a href={affiliateUrl} target="_blank" rel="noopener noreferrer sponsored nofollow"
            className="apxPromo__visit">Visiter</a>}
        </div>
        <div className="apxPromo__row">
          <span>18+ · Jouer comporte des risques</span>
          <div className="apxPromo__dots" role="group" aria-label="Commandes du carrousel publicitaire">
            {!reduceMotion && <button type="button" className="apxPromo__pause"
              aria-label={paused ? 'Reprendre le défilement' : 'Mettre le défilement en pause'}
              onClick={() => setPaused((value) => !value)}>{paused ? '▶' : 'Ⅱ'}</button>}
            {slides.map((slide, index) => (
              <button key={slide.image} type="button"
                      aria-pressed={active === index}
                      aria-label={`Scène ${index + 1} sur ${slides.length}`}
                      className={`apxPromo__dot ${active === index ? 'apxPromo__dot--active' : ''}`}
                      onClick={() => { setActive(index); setPaused(true); }} />
            ))}
          </div>
        </div>
      </div>
      {copyFailed && <p className="apxPromo__error" role="status">Copie indisponible. Sélectionnez le code kenken ci-dessus.</p>}
      <span className="apxPromo__sr" role="status" aria-live="polite">
        {copied ? 'Code kenken copié dans le presse-papiers.' : ''}
      </span>
    </section>
  );
}
