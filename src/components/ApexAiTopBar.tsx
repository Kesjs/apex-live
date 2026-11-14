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
  const { isOpen, activeMatch, screenContext, messages, creditsLeft, maxCredits, open, close, resetConversation } = useAiChat()

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  const subText = activeMatch
    ? `${activeMatch.equipes.domicile} · ${activeMatch.equipes.exterieur}`
    : screenContext?.pageTitle || 'Analyste football & cotes'

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
                <span className="apex-ai-credits" title="Questions disponibles dans cette fenêtre">
                  {creditsLeft}/{maxCredits}
                </span>
                {messages.length > 0 && (
                  <button
                    type="button"
                    className="apex-ai-icon-btn"
                    onClick={resetConversation}
                    title="Nouvelle conversation"
                    aria-label="Nouvelle conversation"
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
