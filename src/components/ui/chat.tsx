import { Fragment, useEffect, useRef, useState } from 'react'
import { useAiChat } from '../../lib/ai-chat'
import { Icon } from '../Icon'
import './chat.css'

const MODES = ['Libre', 'Value Bets', 'Tactique', 'Statistiques'] as const

function renderInlineMarkdown(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return <strong key={i}>{tok.slice(2, -2)}</strong>
    }
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return (
        <code className="apex-chat-code" key={i}>
          {tok.slice(1, -1)}
        </code>
      )
    }
    return <Fragment key={i}>{tok}</Fragment>
  })
}

function useSmoothStream(text: string, streaming?: boolean): string {
  const [shownLen, setShownLen] = useState(() => (streaming ? 0 : text.length))

  useEffect(() => {
    if (!streaming) {
      setShownLen(text.length)
      return
    }
    if (shownLen >= text.length) return
    const step = Math.max(2, Math.ceil((text.length - shownLen) / 8))
    const timer = window.setTimeout(() => {
      setShownLen(len => Math.min(text.length, len + step))
    }, 16)
    return () => window.clearTimeout(timer)
  }, [text, streaming, shownLen])

  return streaming ? text.slice(0, shownLen) : text
}

function CopyReplyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard?.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* ignore */
    }
  }
  return (
    <button type="button" className="apex-chat-copy-btn" onClick={onCopy} aria-label="Copier la réponse">
      <Icon name={copied ? 'check' : 'copy'} size={13} />
      <span>{copied ? 'Copié' : 'Copier'}</span>
    </button>
  )
}

function FormattedReply({ text, streaming }: { text: string; streaming?: boolean }) {
  const visibleText = useSmoothStream(text, streaming)
  const lines = visibleText.split('\n').map(l => l.trimEnd())
  const blocks: Array<
    | { type: 'h'; content: string }
    | { type: 'p'; content: string }
    | { type: 'ul'; items: string[] }
    | { type: 'ol'; items: string[] }
  > = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    const heading = /^#{1,3}\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({ type: 'h', content: heading[1] })
      continue
    }
    const bullet = /^[-•*]\s+(.*)$/.exec(line)
    if (bullet) {
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'ul') last.items.push(bullet[1])
      else blocks.push({ type: 'ul', items: [bullet[1]] })
      continue
    }
    const ordered = /^\d+[.)]\s+(.*)$/.exec(line)
    if (ordered) {
      const last = blocks[blocks.length - 1]
      if (last && last.type === 'ol') last.items.push(ordered[1])
      else blocks.push({ type: 'ol', items: [ordered[1]] })
      continue
    }
    blocks.push({ type: 'p', content: line })
  }

  return (
    <div className={streaming ? 'apex-chat-stream' : undefined}>
      {blocks.map((b, idx) => {
        if (b.type === 'h') {
          return (
            <p className="apex-chat-bubble__h" key={idx}>
              {renderInlineMarkdown(b.content)}
            </p>
          )
        }
        if (b.type === 'ul') {
          return (
            <ul className="apex-chat-bubble__ul" key={idx}>
              {b.items.map((item, j) => (
                <li key={j}>{renderInlineMarkdown(item)}</li>
              ))}
            </ul>
          )
        }
        if (b.type === 'ol') {
          return (
            <ol className="apex-chat-bubble__ol" key={idx}>
              {b.items.map((item, j) => (
                <li key={j}>{renderInlineMarkdown(item)}</li>
              ))}
            </ol>
          )
        }
        return (
          <p className="apex-chat-bubble__p" key={idx}>
            {renderInlineMarkdown(b.content)}
          </p>
        )
      })}
      {streaming && <span className="apex-chat-cursor" aria-hidden="true" />}
    </div>
  )
}

export default function ChatComposer() {
  const {
    activeMatch,
    screenContext,
    contextAttached,
    setContextAttached,
    messages,
    sending,
    streamingId,
    error,
    creditsLeft,
    creditPct,
    resetInLabel,
    threads,
    activeThreadId,
    historyOpen,
    selectThread,
    deleteThread,
    regenerateLast,
    sendMessage,
    stopGenerating,
  } = useAiChat()

  const [tab, setTab] = useState<(typeof MODES)[number]>('Libre')
  const [draft, setDraft] = useState('')
  const threadRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const el = threadRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 180 || sending) {
      el.scrollTop = el.scrollHeight
    }
  }, [messages, sending])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`
  }, [draft])

  const contextLabel = activeMatch
    ? `${activeMatch.equipes.domicile} · ${activeMatch.equipes.exterieur}`
    : screenContext?.pageTitle || ''

  const quickPrompts: string[] = contextAttached && activeMatch
    ? [
        `Résume les forces de ${activeMatch.equipes.domicile} · ${activeMatch.equipes.exterieur}`,
        'Le pronostic a-t-il une vraie Value ?',
        'Quel scénario tactique te semble le plus probable ?',
      ]
    : contextAttached && screenContext?.route === '/actualites'
      ? [
          'Fais-moi un point rapide sur les news du jour',
          'Quelles infos ont un impact sportif direct ?',
          'Explique comment analyser une absence majeure',
        ]
      : [
          'Quelles affiches valent le coup aujourd’hui ?',
          'Explique-moi le concept de Value Bet simplement',
          'Comment lire les xG sur Apex ?',
        ]

  const submit = async (textToSend?: string) => {
    const q = (textToSend ?? draft).trim()
    if (!q || sending || creditsLeft <= 0) return
    if (!textToSend) setDraft('')
    await sendMessage(q, tab)
  }

  return (
    <div className="apex-chat-panel">
      <div className="apex-chat-modes" role="group" aria-label="Angle de réponse">
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

      {contextLabel && (
        <div className="apex-chat-ctx-bar">
          <span className="apex-chat-ctx-bar__label">
            {contextAttached ? `Contexte lié : ${contextLabel}` : `Contexte ignoré (${contextLabel})`}
          </span>
          <button
            type="button"
            className="apex-chat-ctx-bar__btn"
            onClick={() => setContextAttached(!contextAttached)}
          >
            {contextAttached ? 'Discussion libre' : 'Lier'}
          </button>
        </div>
      )}

      <div className="apex-chat-thread" ref={threadRef} aria-live="polite">
        {historyOpen ? (
          <div className="apex-chat-history">
            <p className="apex-chat-history__title">Discussions récentes</p>
            {threads.length === 0 ? (
              <p className="muted small">Aucune discussion enregistrée pour le moment.</p>
            ) : (
              <ul className="apex-chat-history__list">
                {threads.map(t => (
                  <li key={t.id} className={'apex-chat-thread-item' + (t.id === activeThreadId ? ' is-active' : '')}>
                    <button type="button" className="apex-chat-thread-open" onClick={() => selectThread(t.id)}>
                      <strong>{t.title}</strong>
                      <span>
                        {t.messages.length} msg · {new Date(t.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="apex-chat-thread-del"
                      onClick={() => deleteThread(t.id)}
                      aria-label={`Supprimer ${t.title}`}
                      title="Supprimer"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : messages.length === 0 ? (
          <div className="apex-chat-empty">
            <p className="apex-chat-empty__title">
              {contextAttached && activeMatch
                ? `${activeMatch.equipes.domicile} · ${activeMatch.equipes.exterieur}`
                : 'Bonjour, je suis Apex IA'}
            </p>
            <p className="apex-chat-empty__text">
              {contextAttached && activeMatch
                ? 'Les statistiques, xG et cotes de cette fiche sont disponibles si vous souhaitez en discuter.'
                : 'Posez n’importe quelle question sur un match, les cotes, la tactique ou simplement pour échanger.'}
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
          <>
            {messages.map((msg, idx) => {
              const isLast = idx === messages.length - 1
              return (
                <div
                  key={msg.id}
                  className={`apex-chat-bubble ${msg.role === 'user' ? 'apex-chat-bubble--user' : 'apex-chat-bubble--assistant'}`}
                >
                  <div className="apex-chat-bubble__meta">
                    <span>{msg.role === 'user' ? 'Vous' : msg.meta || 'Apex IA'}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  {msg.role === 'assistant' ? (
                    <>
                      <FormattedReply text={msg.text} streaming={streamingId === msg.id} />
                      {streamingId !== msg.id && msg.text && (
                        <div className="apex-chat-bubble__foot">
                          {isLast && !sending && (
                            <button
                              type="button"
                              className="apex-chat-copy-btn"
                              onClick={() => void regenerateLast()}
                              aria-label="Régénérer la réponse"
                            >
                              <Icon name="refresh" size={13} />
                              <span>Régénérer</span>
                            </button>
                          )}
                          <CopyReplyButton text={msg.text} />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="apex-chat-bubble__p">{msg.text}</p>
                  )}
                </div>
              )
            })}
            {!sending && messages[messages.length - 1]?.role === 'assistant' && creditsLeft > 0 && (
              <div className="apex-chat-followups">
                {(contextAttached && activeMatch
                  ? ['Risques sur ce match ?', 'Alternative plus sûre ?']
                  : ['Résume en 3 points', 'Donne un exemple concret']
                ).map(q => (
                  <button key={q} type="button" className="apex-chat-followup-btn" onClick={() => void submit(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {sending && !streamingId && (
          <div className="apex-chat-typing" aria-label="Apex IA prépare sa réponse">
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
        {creditPct <= 25 && (
          <p className="apex-chat-capacity-note" role="status">
            {creditsLeft > 0
              ? `Capacité restante : ${creditPct} % · Recharge dans ${resetInLabel}`
              : `Capacité atteinte · Recharge automatique dans ${resetInLabel}`}
          </p>
        )}
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
                ? `Capacité atteinte · Recharge dans ${resetInLabel}`
                : contextAttached && activeMatch
                  ? `Écrire à propos de ${activeMatch.equipes.domicile} · ${activeMatch.equipes.exterieur}…`
                  : 'Écrire un message à Apex IA…'
            }
            disabled={creditsLeft <= 0}
            aria-label="Écrire un message à Apex IA"
          />
          {sending ? (
            <button
              type="button"
              className="apex-chat-composer__stop"
              onClick={stopGenerating}
              title="Arrêter la réponse"
              aria-label="Arrêter la réponse"
            >
              <span className="apex-chat-composer__stop-sq" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              className="apex-chat-composer__send"
              disabled={!draft.trim() || creditsLeft <= 0}
              aria-label="Envoyer"
            >
              <Icon name="arrow" size={18} />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
