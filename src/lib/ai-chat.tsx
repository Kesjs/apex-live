import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Prediction } from '../domain/contracts'
import { heureCourte } from './format'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  meta?: string
  timestamp: string
}

export interface ScreenContext {
  route?: string
  pageTitle?: string
  valueBets?: Array<{ match: string; competition: string; choix: string; avantagePct: number; cote?: number }>
  topMatches?: Array<{ match: string; competition: string; issue: string; probaPct: number; cote?: number }>
  headlines?: string[]
  historySummary?: string
}

const MAX_CREDITS = 10
const CREDIT_WINDOW_MS = 15 * 60 * 60 * 1000
const CREDITS_KEY = 'apex:ai:credits:v1'
const MESSAGES_KEY = 'apex:ai:messages:v1'

interface CreditState {
  used: number
  resetAt: number
}

function readCredits(): CreditState {
  try {
    const raw = window.localStorage.getItem(CREDITS_KEY)
    if (!raw) return { used: 0, resetAt: Date.now() + CREDIT_WINDOW_MS }
    const parsed = JSON.parse(raw) as Partial<CreditState>
    if (typeof parsed.resetAt === 'number' && Date.now() < parsed.resetAt) {
      return { used: Math.max(0, Number(parsed.used) || 0), resetAt: parsed.resetAt }
    }
  } catch {
    /* ignore */
  }
  return { used: 0, resetAt: Date.now() + CREDIT_WINDOW_MS }
}

function writeCredits(state: CreditState): void {
  try {
    window.localStorage.setItem(CREDITS_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

function readMessages(): ChatMessage[] {
  try {
    const raw = window.sessionStorage.getItem(MESSAGES_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as ChatMessage[]
    return Array.isArray(arr) ? arr.slice(-24) : []
  } catch {
    return []
  }
}

function writeMessages(msgs: ChatMessage[]): void {
  try {
    window.sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(msgs.slice(-24)))
  } catch {
    /* ignore */
  }
}

function mapMatchPayload(m: Prediction) {
  const p = m.pronostics
  const r = m.resultat
  return {
    domicile: m.equipes.domicile,
    exterieur: m.equipes.exterieur,
    competition: m.competition,
    date_heure: `${m.date_heure.slice(0, 10)} à ${heureCourte(m.date_heure)}`,
    score_actuel: r?.score_final,
    statut: r?.statut,
    buts_attendus: m.stats?.buts_attendus,
    stats: m.stats,
    forme: m.forme,
    pronostics: p
      ? {
          issue: {
            selection: p.issue.selection,
            probabilite: Math.round(p.issue.probabilite * 100),
            cote: p.issue.cote,
            justification: p.issue.justification,
          },
          buts: {
            selection: p.buts.selection,
            probabilite: Math.round(p.buts.probabilite * 100),
            cote: p.buts.cote,
            justification: p.buts.justification,
          },
          bonus: p.bonus ?? undefined,
          scores: p.scores,
        }
      : undefined,
  }
}

interface AiChatContextValue {
  isOpen: boolean
  activeMatch: Prediction | null
  screenContext: ScreenContext | null
  messages: ChatMessage[]
  sending: boolean
  error: string | null
  creditsLeft: number
  maxCredits: number
  open: (opts?: { match?: Prediction | null; prompt?: string }) => void
  close: () => void
  toggle: () => void
  setActiveMatch: (m: Prediction | null) => void
  setScreenContext: (ctx: ScreenContext | null) => void
  sendMessage: (prompt: string, tab?: string) => Promise<void>
  resetConversation: () => void
}

const AiChatContext = createContext<AiChatContextValue>({
  isOpen: false,
  activeMatch: null,
  screenContext: null,
  messages: [],
  sending: false,
  error: null,
  creditsLeft: MAX_CREDITS,
  maxCredits: MAX_CREDITS,
  open: () => undefined,
  close: () => undefined,
  toggle: () => undefined,
  setActiveMatch: () => undefined,
  setScreenContext: () => undefined,
  sendMessage: async () => undefined,
  resetConversation: () => undefined,
})

export function AiChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeMatch, setActiveMatch] = useState<Prediction | null>(null)
  const [screenContext, setScreenContext] = useState<ScreenContext | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(readMessages)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credits, setCredits] = useState<CreditState>(readCredits)

  useEffect(() => {
    writeMessages(messages)
  }, [messages])

  const creditsLeft = Math.max(0, MAX_CREDITS - credits.used)

  const sendMessage = useCallback(
    async (rawPrompt: string, tab = 'Général') => {
      const prompt = rawPrompt.trim()
      if (!prompt || sending) return
      const freshCredits = readCredits()
      setCredits(freshCredits)
      if (freshCredits.used >= MAX_CREDITS) {
        setError('Quota de questions atteint pour cette fenêtre. Revenez dans quelques heures.')
        return
      }

      const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: prompt,
        timestamp: nowTime,
      }
      const nextHistory = [...messages, userMsg]
      setMessages(nextHistory)
      setSending(true)
      setError(null)

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            tab,
            history: messages.slice(-8).map(m => ({ role: m.role, text: m.text })),
            match: activeMatch ? mapMatchPayload(activeMatch) : undefined,
            screenContext: screenContext ?? undefined,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
          model?: string
          sections?: Array<{ label?: string; sub?: string; body?: string }>
        }
        if (!res.ok) {
          throw new Error(data.error || 'Le serveur IA ne répond pas pour le moment.')
        }
        const replyText = data.sections?.[0]?.body?.trim()
        if (!replyText) {
          throw new Error('Réponse vide reçue du modèle IA.')
        }

        const updatedCredits: CreditState = {
          used: freshCredits.used + 1,
          resetAt: freshCredits.resetAt,
        }
        writeCredits(updatedCredits)
        setCredits(updatedCredits)

        const aiMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          meta: activeMatch
            ? `${activeMatch.equipes.domicile} · ${activeMatch.equipes.exterieur}`
            : data.sections?.[0]?.sub || 'Apex IA',
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages(prev => [...prev, aiMsg])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de communication avec Apex IA.')
      } finally {
        setSending(false)
      }
    },
    [activeMatch, messages, screenContext, sending],
  )

  const open = useCallback(
    (opts?: { match?: Prediction | null; prompt?: string }) => {
      if (opts?.match !== undefined) setActiveMatch(opts.match)
      setIsOpen(true)
      if (opts?.prompt) {
        void sendMessage(opts.prompt)
      }
    },
    [sendMessage],
  )

  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(o => !o), [])
  const resetConversation = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const value = useMemo<AiChatContextValue>(
    () => ({
      isOpen,
      activeMatch,
      screenContext,
      messages,
      sending,
      error,
      creditsLeft,
      maxCredits: MAX_CREDITS,
      open,
      close,
      toggle,
      setActiveMatch,
      setScreenContext,
      sendMessage,
      resetConversation,
    }),
    [activeMatch, close, creditsLeft, error, isOpen, messages, open, resetConversation, screenContext, sendMessage, sending, toggle],
  )

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>
}

export function useAiChat(): AiChatContextValue {
  return useContext(AiChatContext)
}
