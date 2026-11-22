import { useEffect } from 'react'
import { useAiChat } from '../lib/ai-chat'
import { Icon } from './Icon'
import ChatComposer from './ui/chat'

/**
 * Assistant Apex IA discret et contextuel :
 *   - Bouton flottant léger (FAB mobile au-dessus de la bottom nav, pilule desktop en bas à droite)
 *   - Tiroir latéral sur desktop (430px) et Bottom Sheet sur mobile (86dvh)
 */
export function ApexAiTopBar() {
  const {
    isOpen,
    activeMatch,
    screenContext,
    contextAttached,
    messages,
    threads,
    historyOpen,
    setHistoryOpen,
    open,
    close,
    resetConversation,
  } = useAiChat()

  useEffect(() => {
    if (!isOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, close])

  const subText = !contextAttached
    ? 'Discussion libre · Assistant Apex'
    : activeMatch
      ? `${activeMatch.equipes.domicile} · ${activeMatch.equipes.exterieur}`
      : screenContext?.pageTitle || 'Assistant Apex · Football & cotes'

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          className="apex-ai-fab"
          onClick={() => open()}
          aria-label="Ouvrir l’assistant Apex IA"
        >
          <Icon name="sparkle" size={18} />
          <span>Apex IA</span>
          {messages.length > 0 && <span className="apex-ai-fab__badge">{messages.length}</span>}
        </button>
      )}

      {isOpen && (
        <div
          className="apex-ai-backdrop"
          onClick={e => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <section
            className="apex-ai-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Assistant Apex IA"
          >
            <header className="apex-ai-drawer__head">
              <div className="apex-ai-drawer__id">
                <span className="apex-ai-drawer__mark">
                  <Icon name="sparkle" size={18} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <h2 className="apex-ai-drawer__title">Apex IA</h2>
                  <p className="apex-ai-drawer__sub">{subText}</p>
                </div>
              </div>
              <div className="apex-ai-drawer__controls">
                {threads.length > 0 && (
                  <button
                    type="button"
                    className={'apex-ai-icon-btn' + (historyOpen ? ' is-active' : '')}
                    onClick={() => setHistoryOpen(!historyOpen)}
                    title="Historique des discussions"
                    aria-label="Historique des discussions"
                    aria-pressed={historyOpen}
                  >
                    <Icon name="clock" size={16} />
                  </button>
                )}
                {(messages.length > 0 || historyOpen) && (
                  <button
                    type="button"
                    className="apex-ai-icon-btn"
                    onClick={resetConversation}
                    title="Nouvelle discussion"
                    aria-label="Nouvelle discussion"
                  >
                    <Icon name="refresh" size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="apex-ai-icon-btn"
                  onClick={close}
                  title="Fermer"
                  aria-label="Fermer l’assistant Apex IA"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
            </header>

            <ChatComposer />
          </section>
        </div>
      )}
    </>
  )
}
