import { useEffect, useState } from 'react'
import ChatComposer from './ui/chat'
import { useAiCredits } from '../lib/ai-credits'
import { useRouter } from '../lib/router'
import { provider } from '../data'
import { Icon } from './Icon'
import type { ChatSectionData } from './ui/chat'

export function ApexAiTopBar() {
  const [ouvert, setOuvert] = useState(false)
  const { creditsLeft, maxDailyCredits, timeUntilReset, isQuotaExceeded } = useAiCredits()
  const { path } = useRouter()

  // Détection du match en cours si sur une page /match/:id
  const matchMatch = /^\/match\/([^/]+)/.exec(path)
  const matchId = matchMatch ? decodeURIComponent(matchMatch[1]) : undefined
  const [matchInfo, setMatchInfo] = useState<{ domicile: string; exterieur: string; competition?: string } | null>(null)

  useEffect(() => {
    if (!matchId) {
      setMatchInfo(null)
      return
    }
    let actif = true
    provider.getMatch(matchId).then((fiche) => {
      if (actif && fiche) {
        setMatchInfo({
          domicile: fiche.equipes.domicile,
          exterieur: fiche.equipes.exterieur,
          competition: fiche.competition,
        })
      }
    }).catch(() => undefined)
    return () => { actif = false }
  }, [matchId])

  const titreMatch = matchInfo ? `${matchInfo.domicile} – ${matchInfo.exterieur}` : undefined

  return (
    <aside
      className="apex-ai-bar"
      aria-label="Assistant IA Apex"
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
          background: 'var(--s1, #ffffff)',
          border: '1px solid var(--ln)',
          borderRadius: '14px',
          boxShadow: '0 2px 10px rgba(19, 29, 24, 0.05)',
          overflow: 'hidden',
          transition: 'all 250ms cubic-bezier(0.2, 0.7, 0.2, 1)',
        }}
      >
        {/* Bandeau supérieur toujours visible sous la navbar */}
        <div className="apex-ai-head"
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
                background: 'rgba(10, 166, 106, 0.12)',
                color: 'var(--ac, #0aa66a)',
                fontSize: '13px',
              }}
            >
              <Icon name="sparkle" size={14} />
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tx, #131d18)' }}>
              Apex IA
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 400,
                  color: 'var(--mu, #5d7167)',
                  marginLeft: '4px',
                }}
              >
                Assistant de match
              </span>
            </span>
            {titreMatch && (
              <span
                style={{
                  fontSize: '11px',
                  background: 'rgba(10, 166, 106, 0.08)',
                  color: 'var(--ac, #0aa66a)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: '1px solid rgba(10, 166, 106, 0.2)',
                }}
              >
                Match : {titreMatch}
              </span>
            )}
          </div>

          {/* Statut des crédits & Bouton Toggle */}
          <div className="apex-ai-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
            {/* Jauge des crédits journaliers */}
            <div
              title={`Crédits gratuits d'analyses IA. Prochaine recharge dans ${timeUntilReset}.`}
              className="apex-ai-toggle"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11.5px',
                color: isQuotaExceeded ? 'var(--ko, #dc2626)' : 'var(--ac, #0aa66a)',
                background: isQuotaExceeded ? 'rgba(220, 38, 38, 0.08)' : 'rgba(10, 166, 106, 0.08)',
                padding: '3px 9px',
                borderRadius: '12px',
                fontWeight: 500,
              }}
            >
              <span>{creditsLeft}/{maxDailyCredits} crédits</span>
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
                background: ouvert ? 'var(--s2, #f0f4f2)' : 'var(--ac, #0aa66a)',
                color: ouvert ? 'var(--tx, #131d18)' : '#ffffff',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <span>{ouvert ? 'Fermer' : 'Ouvrir'}</span>
              <Icon name={ouvert ? 'x' : 'down'} size={13} />
            </button>
          </div>
        </div>

        {/* Panneau dépliable avec le composant Chat */}
        {ouvert && (
          <div
            style={{
              padding: '12px 14px 16px',
              borderTop: '1px solid var(--ln)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'var(--s1, #ffffff)',
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
                color: 'var(--mu, #5d7167)',
              }}
            >
              <span>
                {matchInfo ? `Posez une question sur ${matchInfo.domicile} – ${matchInfo.exterieur}.` : 'Posez une question à l’assistant football.'}
              </span>
              <span>{timeUntilReset}</span>
            </div>

            <ChatComposer
              match={matchInfo ?? undefined}
              className="apex-chat-dark"
              onSendPrompt={async (prompt, tab, history) => {
                const response = await fetch('/api/chat', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    prompt,
                    tab,
                    history,
                    match: matchInfo ? { domicile: matchInfo.domicile, exterieur: matchInfo.exterieur } : undefined,
                  }),
                })
                if (!response.ok) throw new Error('Assistant indisponible')
                const data = (await response.json()) as { sections?: ChatSectionData[] }
                return data.sections || []
              }}
            />
          </div>
        )}
      </div>
    </aside>
  )
}
