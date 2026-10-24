import { useState } from 'react'
import ChatComposer from './ui/chat'
import { useAiCredits } from '../lib/ai-credits'
import { useRouter } from '../lib/router'

export function ApexAiTopBar() {
  const [ouvert, setOuvert] = useState(false)
  const { creditsLeft, maxDailyCredits, timeUntilReset, isQuotaExceeded } = useAiCredits()
  const { path } = useRouter()

  // Détection du match en cours si sur une page /match/:id
  const matchMatch = /^\/match\/([^/]+)/.exec(path)
  const matchId = matchMatch ? decodeURIComponent(matchMatch[1]) : undefined

  // Titre contextuel
  const titreMatch = matchId
    ? matchId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : undefined

  return (
    <aside
      className="apex-ai-bar"
      aria-label="Assistant IA WhoScored"
      style={{
        margin: '0 auto 12px',
        width: '100%',
        maxWidth: '1080px',
        padding: '0 12px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(21, 33, 28, 0.88), rgba(15, 24, 21, 0.92))',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(46, 230, 160, 0.22)',
          borderRadius: '14px',
          boxShadow: '0 8px 24px -4px rgba(0, 0, 0, 0.45), 0 0 16px -2px rgba(46, 230, 160, 0.08)',
          overflow: 'hidden',
          transition: 'all 250ms cubic-bezier(0.2, 0.7, 0.2, 1)',
        }}
      >
        {/* Bandeau supérieur toujours visible sous la navbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          {/* Logo & Titre */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                background: 'rgba(46, 230, 160, 0.2)',
                color: 'var(--ac, #2ee6a0)',
                fontSize: '13px',
              }}
            >
              ✦
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tx, #e9f2ed)' }}>
              Apex IA{' '}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 400,
                  color: 'var(--mu, #8ca196)',
                  marginLeft: '4px',
                }}
              >
                (Style WhoScored · Gemini Flash)
              </span>
            </span>
            {titreMatch && (
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(46, 230, 160, 0.1)',
                  color: 'var(--ac, #2ee6a0)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: '1px solid rgba(46, 230, 160, 0.2)',
                }}
              >
                Match : {titreMatch}
              </span>
            )}
          </div>

          {/* Statut des crédits & Bouton Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
            {/* Jauge des crédits journaliers */}
            <div
              title={`Crédits gratuits d'analyses IA. Prochaine recharge dans ${timeUntilReset}.`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11.5px',
                color: isQuotaExceeded ? 'var(--ko, #ff9a9a)' : 'var(--ac, #2ee6a0)',
                background: isQuotaExceeded ? 'rgba(255, 120, 120, 0.12)' : 'rgba(46, 230, 160, 0.12)',
                padding: '3px 9px',
                borderRadius: '12px',
                fontWeight: 500,
              }}
            >
              <span>⚡ {creditsLeft}/{maxDailyCredits} crédits aujourd'hui</span>
            </div>

            {/* Bouton pour déplier / replier */}
            <button
              type="button"
              onClick={() => setOuvert((v) => !v)}
              aria-expanded={ouvert}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: ouvert ? 'rgba(255, 255, 255, 0.08)' : 'var(--ac, #2ee6a0)',
                color: ouvert ? 'var(--tx, #e9f2ed)' : '#04120d',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <span>{ouvert ? 'Masquer' : 'Poser une question'}</span>
              <span style={{ fontSize: '10px' }}>{ouvert ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>

        {/* Panneau dépliable avec le composant Chat */}
        {ouvert && (
          <div
            style={{
              padding: '12px 14px 16px',
              borderTop: '1px solid rgba(46, 230, 160, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(10, 18, 15, 0.6)',
              animation: 'fade-up 250ms ease both',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                width: '100%',
                maxWidth: '520px',
                marginBottom: '8px',
                fontSize: '11px',
                color: 'var(--mu, #8ca196)',
              }}
            >
              <span>
                💡 Posez une question sur les xG, la forme récente, ou les points faibles tactiques.
              </span>
              <span>Recharge dans {timeUntilReset}</span>
            </div>

            <ChatComposer
              match={
                matchId
                  ? {
                      domicile: titreMatch?.split(' Vs ')[0] || 'Domicile',
                      exterieur: titreMatch?.split(' Vs ')[1] || 'Extérieur',
                      competition: 'Apex Live',
                    }
                  : undefined
              }
              className="apex-chat-dark"
            />
          </div>
        )}
      </div>
    </aside>
  )
}
