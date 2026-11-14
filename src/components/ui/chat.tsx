import { Fragment, useEffect, useRef, useState } from 'react'
import { useAiChat } from '../../lib/ai-chat'
import { Icon } from '../Icon'
import './chat.css'

const MODES = ['Général', 'Value Bets', 'Tactique', 'Statistiques'] as const

function renderInlineBold(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*)/g)
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return <strong key={i}>{tok.slice(2, -2)}</strong>
    }
    return <Fragment key={i}>{tok}</Fragment>
  })
}

function FormattedReply({ text }: { text: string }) {
  const lines = text.split('\n').map(l => l.trimEnd())
  const blocks: Array<{ type: 'p'; content: string } | { type: 'ul'; items: string[] }> = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const bullet = /^[-•*]\s+(.*)$/.exec(line)
    if (bullet) {
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'ul') last.items.push(bullet[1])
      else blocks.push({ type: 'ul', items: [bullet[1]] })
    } else {
      blocks.push({ type: 'p', content: line })
    }
  }

  return (
    <>
      {blocks.map((b, idx) =>
        b.type === 'ul' ? (
          <ul className="apex-chat-bubble__ul" key={idx}>
            {b.items.map((item, j) => (
              <li key={j}>{renderInlineBold(item)}</li>
            ))}
          </ul>
        ) : (
          <p className="apex-chat-bubble__p" key={idx}>
            {renderInlineBold(b.content)}
          </p>
        ),
      )}
    </>
  )
}

export default function ChatComposer() {
  const { activeMatch, screenContext, messages, sending, error, creditsLeft, sendMessage } = useAiChat()
  const [tab, setTab] = useState<(typeof MODES)[number]>('Général')
  const [draft, setDraft] = useState('')
  const threadRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, sending])

  const quickPrompts: string[] = activeMatch
    ? [
        `Pourquoi le modèle privilégie ${activeMatch.pronostics?.issue.court ?? 'cette issue'} ?`,
        `Quel est le principal risque sur ${activeMatch.equipes.domicile} · ${activeMatch.equipes.exterieur} ?`,
        'Y a-t-il une vraie Value sur ce match ?',
        'Comparer forme et buts attendus',
      ]
    : screenContext?.route === '/actualites'
      ? [
          'Résume les actualités football marquantes du jour',
          'Quels joueurs ou équipes sont sous pression actuellement ?',
          'Impact des absences sur les prochains matchs',
        ]
      : [
          'Quel est le meilleur Value Bet affiché aujourd’hui ?',
          'Quels sont les pronostics les plus fiables ?',
          'Comment fonctionne le modèle Poisson + xG d’Apex ?',
          'Quelle règle de mise suivre pour gérer sa bankroll ?',
        ]

  const submit = async (textToSend?: string) => {
    const q = (textToSend ?? draft).trim()
    if (!q || sending || creditsLeft <= 0) return
    if (!textToSend) setDraft('')
    await sendMessage(q, tab)
  }

  return (
    <div className="apex-chat-panel">
      <div className="apex-chat-modes" role="group" aria-label="Angle d’analyse">
        {MODES.map(m => (
          <button
            key={m}
            type="button"
            className="apex-chat-mode"
            aria-pressed={tab === m}
            onClick={() => setTab(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="apex-chat-thread" ref={threadRef} aria-live="polite">
        {messages.length === 0 ? (
          <div className="apex-chat-empty">
            <p className="apex-chat-empty__title">
              {activeMatch
                ? `Analyse en contexte · ${activeMatch.equipes.domicile} vs ${activeMatch.equipes.exterieur}`
                : 'Analyste Football & Value Bets'}
            </p>
            <p className="apex-chat-empty__text">
              {activeMatch
                ? 'Toutes les statistiques Poisson, buts attendus, cotes et bonus de cette fiche sont chargés.'
                : 'Posez une question sur l’écran affiché, un match, une cote bookmaker ou la tactique football.'}
            </p>
            <div className="apex-chat-prompts">
              {quickPrompts.map(q => (
                <button
                  key={q}
                  type="button"
                  className="apex-chat-prompt"
                  onClick={() => void submit(q)}
                  disabled={sending || creditsLeft <= 0}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`apex-chat-bubble ${msg.role === 'user' ? 'apex-chat-bubble--user' : 'apex-chat-bubble--assistant'}`}
            >
              <div className="apex-chat-bubble__meta">
                <span>{msg.role === 'user' ? 'Vous' : msg.meta || 'Apex IA'}</span>
                <span>{msg.timestamp}</span>
              </div>
              {msg.role === 'assistant' ? <FormattedReply text={msg.text} /> : <p className="apex-chat-bubble__p">{msg.text}</p>}
            </div>
          ))
        )}

        {sending && (
          <div className="apex-chat-typing" aria-label="Apex IA rédige sa réponse">
            <span />
            <span />
            <span />
          </div>
        )}

        {error && (
          <div className="apex-chat-error" role="alert">
            {error}
          </div>
        )}
      </div>

      <form
        className="apex-chat-composer"
        onSubmit={e => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="apex-chat-composer__box">
          <textarea
            ref={inputRef}
            className="apex-chat-composer__input"
            rows={1}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void submit()
              }
            }}
            placeholder={
              creditsLeft <= 0
                ? 'Crédits temporairement épuisés…'
                : activeMatch
                  ? `Question sur ${activeMatch.equipes.domicile} · ${activeMatch.equipes.exterieur}…`
                  : 'Votre question foot, cotes ou stats…'
            }
            disabled={creditsLeft <= 0}
            aria-label="Poser une question à Apex IA"
          />
          <button
            type="submit"
            className="apex-chat-composer__send"
            disabled={sending || !draft.trim() || creditsLeft <= 0}
            aria-label="Envoyer"
          >
            <Icon name="arrow" size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}
