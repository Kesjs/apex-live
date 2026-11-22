import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
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

const MAX_CREDITS = 20
const CREDIT_WINDOW_MS = 2 * 60 * 60 * 1000
const CREDITS_KEY = 'apex:ai:credits:v2'
const MESSAGES_KEY = 'apex:ai:messages:v1'
const THREADS_KEY = 'apex:ai:threads:v1'
const MAX_THREADS = 15

export interface ChatThread {
  id: string
  title: string
  updatedAt: number
  messages: ChatMessage[]
}

function readThreads(): ChatThread[] {
  try {
    const raw = window.localStorage.getItem(THREADS_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as ChatThread[]
    return Array.isArray(arr) ? arr.slice(0, MAX_THREADS) : []
  } catch {
    return []
  }
}

function writeThreads(threads: ChatThread[]): void {
  try {
    window.localStorage.setItem(THREADS_KEY, JSON.stringify(threads.slice(0, MAX_THREADS)))
  } catch {
    /* ignore */
  }
}

function formatResetIn(resetAt: number): string {
  const diffMin = Math.max(1, Math.ceil((resetAt - Date.now()) / 60_000))
  const h = Math.floor(diffMin / 60)
  const m = diffMin % 60
  if (h <= 0) return `${m} min`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

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

type SseEvent =
  | { type: 'start'; model?: string }
  | { type: 'delta'; text?: string }
  | { type: 'done'; model?: string; text?: string }
  | { type: 'error'; error?: string }

interface AiChatContextValue {
  isOpen: boolean
  activeMatch: Prediction | null
  screenContext: ScreenContext | null
  contextAttached: boolean
  messages: ChatMessage[]
  sending: boolean
  streamingId: string | null
  error: string | null
  creditsLeft: number
  maxCredits: number
  creditPct: number
  resetInLabel: string
  threads: ChatThread[]
  activeThreadId: string | null
  historyOpen: boolean
  setHistoryOpen: (open: boolean) => void
  selectThread: (id: string) => void
  deleteThread: (id: string) => void
  regenerateLast: () => Promise<void>
  open: (opts?: { match?: Prediction | null; prefill?: string }) => void
  close: () => void
  toggle: () => void
  setActiveMatch: (m: Prediction | null) => void
  setScreenContext: (ctx: ScreenContext | null) => void
  setContextAttached: (enabled: boolean) => void
  sendMessage: (prompt: string, tab?: string) => Promise<void>
  stopGenerating: () => void
  resetConversation: () => void
}

const AiChatContext = createContext<AiChatContextValue>({
  isOpen: false,
  activeMatch: null,
  screenContext: null,
  contextAttached: true,
  messages: [],
  sending: false,
  streamingId: null,
  error: null,
  creditsLeft: MAX_CREDITS,
  maxCredits: MAX_CREDITS,
  creditPct: 100,
  resetInLabel: '2h',
  threads: [],
  activeThreadId: null,
  historyOpen: false,
  setHistoryOpen: () => undefined,
  selectThread: () => undefined,
  deleteThread: () => undefined,
  regenerateLast: async () => undefined,
  open: () => undefined,
  close: () => undefined,
  toggle: () => undefined,
  setActiveMatch: () => undefined,
  setScreenContext: () => undefined,
  setContextAttached: () => undefined,
  sendMessage: async () => undefined,
  stopGenerating: () => undefined,
  resetConversation: () => undefined,
})

export function AiChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeMatch, setActiveMatchState] = useState<Prediction | null>(null)
  const [screenContext, setScreenContext] = useState<ScreenContext | null>(null)
  const [contextAttached, setContextAttached] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>(() => readMessages())
  const [threads, setThreads] = useState<ChatThread[]>(() => readThreads())
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [credits, setCredits] = useState<CreditState>(() => readCredits())
  const abortRef = useRef<AbortController | null>(null)

  const setActiveMatch = useCallback((m: Prediction | null) => {
    setActiveMatchState(m)
    if (m) setContextAttached(true)
  }, [])

  useEffect(() => {
    writeMessages(messages)
    if (messages.length === 0) return
    const firstUser = messages.find(m => m.role === 'user')?.text ?? 'Discussion Apex IA'
    const autoTitle = activeMatch
      ? `${activeMatch.equipes.domicile} · ${activeMatch.equipes.exterieur}`
      : firstUser.length > 44
        ? `${firstUser.slice(0, 44)}…`
        : firstUser
    const threadId = activeThreadId ?? `t-${Date.now()}`
    if (!activeThreadId) setActiveThreadId(threadId)
    setThreads(prev => {
      const next: ChatThread[] = [
        { id: threadId, title: autoTitle, updatedAt: Date.now(), messages: messages.slice(-24) },
        ...prev.filter(t => t.id !== threadId),
      ].slice(0, MAX_THREADS)
      writeThreads(next)
      return next
    })
  }, [messages, activeThreadId, activeMatch])

  const creditsLeft = Math.max(0, MAX_CREDITS - credits.used)
  const creditPct = Math.round((creditsLeft / MAX_CREDITS) * 100)
  const resetInLabel = formatResetIn(credits.resetAt)

  const stopGenerating = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
  }, [])

  const sendMessage = useCallback(
    async (rawPrompt: string, tab = 'Libre') => {
      const prompt = rawPrompt.trim()
      if (!prompt || sending) return
      const freshCredits = readCredits()
      setCredits(freshCredits)
      if (freshCredits.used >= MAX_CREDITS) {
        setError(`Capacité atteinte pour cette session. Recharge automatique dans ${formatResetIn(freshCredits.resetAt)}.`)
        return
      }

      const nowTime = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: prompt,
        timestamp: nowTime,
      }
      const priorHistory = messages.slice(-10).map(m => ({ role: m.role, text: m.text }))
      setMessages([...messages, userMsg])
      setSending(true)
      setStreamingId(null)
      setError(null)

      const controller = new AbortController()
      abortRef.current = controller

      const assistantId = `a-${Date.now()}`
      const metaLabel = contextAttached && activeMatch
        ? `${activeMatch.equipes.domicile} · ${activeMatch.equipes.exterieur}`
        : 'Apex IA'
      const aiTimestamp = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      let accumulated = ''

      const upsertAssistant = (text: string) => {
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === assistantId)
          const updated: ChatMessage = {
            id: assistantId,
            role: 'assistant',
            text,
            meta: metaLabel,
            timestamp: aiTimestamp,
          }
          if (idx === -1) return [...prev, updated]
          const copy = prev.slice()
          copy[idx] = updated
          return copy
        })
      }

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream, application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            prompt,
            tab,
            stream: true,
            history: priorHistory,
            match: contextAttached && activeMatch ? mapMatchPayload(activeMatch) : undefined,
            screenContext: contextAttached && screenContext ? screenContext : undefined,
          }),
        })

        const contentType = res.headers.get('content-type') || ''

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(errData.error || 'Le serveur IA ne répond pas pour le moment.')
        }

        if (contentType.includes('text/event-stream') && res.body) {
          const reader = res.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''

          const handleLine = (rawLine: string) => {
            const line = rawLine.trim()
            if (!line.startsWith('data:')) return
            const jsonStr = line.slice(5).trim()
            if (!jsonStr) return
            let ev: SseEvent
            try {
              ev = JSON.parse(jsonStr) as SseEvent
            } catch {
              return
            }
            if (ev.type === 'start') {
              setStreamingId(assistantId)
            } else if (ev.type === 'delta' && ev.text) {
              accumulated += ev.text
              setStreamingId(assistantId)
              upsertAssistant(accumulated)
            } else if (ev.type === 'done' && ev.text) {
              accumulated = ev.text
              upsertAssistant(accumulated)
            } else if (ev.type === 'error' && !accumulated.trim()) {
              throw new Error(ev.error || 'Erreur pendant la génération de la réponse.')
            }
          }

          while (true) {
            const { done, value } = await reader.read()
            if (value) {
              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split(/\r?\n/)
              buffer = lines.pop() ?? ''
              for (const line of lines) handleLine(line)
            }
            if (done) break
          }
          const rest = decoder.decode()
          if (rest) buffer += rest
          for (const line of buffer.split(/\r?\n/)) handleLine(line)
        } else {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
            reply?: string
            sections?: Array<{ label?: string; sub?: string; body?: string }>
          }
          const replyText = (data.reply || data.sections?.[0]?.body || '').trim()
          if (!replyText) throw new Error(data.error || 'Réponse vide reçue du modèle IA.')
          accumulated = replyText
          upsertAssistant(accumulated)
        }

        const finalReply = accumulated.trim()
        if (!finalReply) {
          throw new Error('Réponse vide reçue du modèle IA.')
        }
        upsertAssistant(finalReply)

        const updatedCredits: CreditState = {
          used: freshCredits.used + 1,
          resetAt: freshCredits.resetAt,
        }
        writeCredits(updatedCredits)
        setCredits(updatedCredits)
      } catch (err) {
        const aborted = controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')
        if (aborted) {
          if (accumulated.trim()) {
            upsertAssistant(accumulated.trim())
            const updatedCredits: CreditState = {
              used: freshCredits.used + 1,
              resetAt: freshCredits.resetAt,
            }
            writeCredits(updatedCredits)
            setCredits(updatedCredits)
          }
        } else {
          setError(err instanceof Error ? err.message : 'Erreur de communication avec Apex IA.')
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        setSending(false)
        setStreamingId(null)
      }
    },
    [activeMatch, contextAttached, messages, screenContext, sending],
  )

  const open = useCallback(
    (opts?: { match?: Prediction | null; prefill?: string }) => {
      if (opts?.match !== undefined) {
        setActiveMatch(opts.match)
        if (opts.match) setContextAttached(true)
      }
      setIsOpen(true)
      if (opts?.prefill) {
        void sendMessage(opts.prefill, 'Libre')
      }
    },
    [sendMessage, setActiveMatch],
  )

  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(o => !o), [])
  const resetConversation = useCallback(() => {
    stopGenerating()
    setMessages([])
    setActiveThreadId(null)
    setHistoryOpen(false)
    setStreamingId(null)
    setSending(false)
    setError(null)
  }, [stopGenerating])

  const selectThread = useCallback(
    (id: string) => {
      stopGenerating()
      const found = threads.find(t => t.id === id)
      if (!found) return
      setActiveThreadId(found.id)
      setMessages(found.messages)
      setHistoryOpen(false)
      setError(null)
    },
    [stopGenerating, threads],
  )

  const deleteThread = useCallback(
    (id: string) => {
      setThreads(prev => {
        const next = prev.filter(t => t.id !== id)
        writeThreads(next)
        return next
      })
      if (activeThreadId === id) {
        setActiveThreadId(null)
        setMessages([])
      }
    },
    [activeThreadId],
  )

  const regenerateLast = useCallback(async () => {
    if (sending) return
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user')
    if (lastUserIdx === -1) return
    const realIdx = messages.length - 1 - lastUserIdx
    const lastPrompt = messages[realIdx].text
    setMessages(prev => prev.slice(0, realIdx))
    await sendMessage(lastPrompt, 'Libre')
  }, [messages, sending, sendMessage])

  const value = useMemo<AiChatContextValue>(
    () => ({
      isOpen,
      activeMatch,
      screenContext,
      contextAttached,
      messages,
      sending,
      streamingId,
      error,
      creditsLeft,
      maxCredits: MAX_CREDITS,
      creditPct,
      resetInLabel,
      threads,
      activeThreadId,
      historyOpen,
      setHistoryOpen,
      selectThread,
      deleteThread,
      regenerateLast,
      open,
      close,
      toggle,
      setActiveMatch,
      setScreenContext,
      setContextAttached,
      sendMessage,
      stopGenerating,
      resetConversation,
    }),
    [
      activeMatch,
      close,
      contextAttached,
      creditsLeft,
      creditPct,
      resetInLabel,
      threads,
      activeThreadId,
      historyOpen,
      selectThread,
      deleteThread,
      regenerateLast,
      error,
      isOpen,
      messages,
      open,
      resetConversation,
      screenContext,
      sendMessage,
      sending,
      setActiveMatch,
      stopGenerating,
      streamingId,
      toggle,
    ],
  )

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>
}

export function useAiChat(): AiChatContextValue {
  return useContext(AiChatContext)
}
