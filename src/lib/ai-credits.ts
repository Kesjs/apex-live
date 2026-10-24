import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'apex_ai_daily_credits'
export const MAX_DAILY_CREDITS = 5
export const COOLDOWN_SECONDS = 10

interface CreditState {
  date: string
  creditsLeft: number
  lastUsedTimestamp: number
}

function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadState(): CreditState {
  const today = getTodayString()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CreditState>
      if (parsed.date === today && typeof parsed.creditsLeft === 'number') {
        return {
          date: today,
          creditsLeft: Math.min(MAX_DAILY_CREDITS, Math.max(0, parsed.creditsLeft)),
          lastUsedTimestamp: Number(parsed.lastUsedTimestamp || 0),
        }
      }
    }
  } catch {
    // Si localStorage n'est pas disponible ou corrompu
  }

  const initial: CreditState = {
    date: today,
    creditsLeft: MAX_DAILY_CREDITS,
    lastUsedTimestamp: 0,
  }
  saveState(initial)
  return initial
}

function saveState(state: CreditState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Échec silencieux
  }
}

export function useAiCredits() {
  const [state, setState] = useState<CreditState>(loadState)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)

  // Calcule le cooldown restant basé sur le dernier timestamp
  const recalculateCooldown = useCallback(() => {
    const now = Date.now()
    const elapsed = Math.floor((now - state.lastUsedTimestamp) / 1000)
    const remaining = Math.max(0, COOLDOWN_SECONDS - elapsed)
    setCooldownRemaining(remaining)
  }, [state.lastUsedTimestamp])

  useEffect(() => {
    recalculateCooldown()
    const interval = setInterval(recalculateCooldown, 1000)
    return () => clearInterval(interval)
  }, [recalculateCooldown])

  // Vérification périodique du passage à minuit pour recharger
  useEffect(() => {
    const checkMidnight = () => {
      const today = getTodayString()
      if (state.date !== today) {
        const resetState: CreditState = {
          date: today,
          creditsLeft: MAX_DAILY_CREDITS,
          lastUsedTimestamp: 0,
        }
        saveState(resetState)
        setState(resetState)
      }
    }
    const interval = setInterval(checkMidnight, 60_000)
    return () => clearInterval(interval)
  }, [state.date])

  const consumeCredit = (): boolean => {
    if (cooldownRemaining > 0 || state.creditsLeft <= 0) return false
    const now = Date.now()
    const nextState: CreditState = {
      ...state,
      creditsLeft: Math.max(0, state.creditsLeft - 1),
      lastUsedTimestamp: now,
    }
    saveState(nextState)
    setState(nextState)
    setCooldownRemaining(COOLDOWN_SECONDS)
    return true
  }

  // Temps avant minuit
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const diffMs = midnight.getTime() - now.getTime()
  const hoursLeft = Math.floor(diffMs / (1000 * 60 * 60))
  const minutesLeft = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  const timeUntilReset = `${hoursLeft}h ${minutesLeft}min`

  return {
    creditsLeft: state.creditsLeft,
    maxDailyCredits: MAX_DAILY_CREDITS,
    cooldownRemaining,
    isCoolingDown: cooldownRemaining > 0,
    isQuotaExceeded: state.creditsLeft <= 0,
    consumeCredit,
    timeUntilReset,
    resetToMaxForTesting: () => {
      const resetState: CreditState = {
        date: getTodayString(),
        creditsLeft: MAX_DAILY_CREDITS,
        lastUsedTimestamp: 0,
      }
      saveState(resetState)
      setState(resetState)
    },
  }
}
