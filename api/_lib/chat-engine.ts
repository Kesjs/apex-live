export interface ChatMatchContext {
  domicile?: string
  exterieur?: string
  competition?: string
  date_heure?: string
  score_actuel?: string
  statut?: string
  buts_attendus?: { domicile: number; exterieur: number }
  stats?: {
    domicile?: { matchs: number; buts_marques: number; buts_encaisses: number; plus_2_5: number; sans_encaisser: number; derniers: string[] }
    exterieur?: { matchs: number; buts_marques: number; buts_encaisses: number; plus_2_5: number; sans_encaisser: number; derniers: string[] }
  }
  forme?: { domicile: string[]; exterieur: string[] }
  pronostics?: {
    issue?: { selection: string; probabilite: number; cote?: number; justification?: string }
    buts?: { selection: string; probabilite: number; cote?: number; justification?: string }
    bonus?: { categorie: string; selection: string; valeur_observee?: number; moyenne_ligue?: number; justification?: string }
    scores?: Array<{ score: string; probabilite: number }>
  }
}

export interface ScreenContext {
  route?: string
  pageTitle?: string
  valueBets?: Array<{ match: string; competition: string; choix: string; avantagePct: number; cote?: number }>
  topMatches?: Array<{ match: string; competition: string; issue: string; probaPct: number; cote?: number }>
  headlines?: string[]
  historySummary?: string
}

export interface HistoryTurn {
  role: 'user' | 'assistant' | 'model'
  text: string
}

export interface ChatRequestPayload {
  prompt: string
  tab?: string
  history?: Array<string | HistoryTurn>
  match?: ChatMatchContext
  screenContext?: ScreenContext
}

export type ChatStreamEvent =
  | { type: 'start'; model: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; model: string; text: string }
  | { type: 'error'; error: string }

export interface ChatEngineConfig {
  apiKey: string
  preferredModel?: string
  connectTimeoutMs?: number
  totalTimeoutMs?: number
  signal?: AbortSignal
  fetchImpl?: typeof fetch
}

interface GeminiPart {
  text?: string
  thought?: boolean
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: Array<{ text: string }>
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] }
  }>
}

const ANALYTICAL_TABS = new Set(['Value Bets', 'Tactique', 'Statistiques'])
const ANALYSIS_QUERY_RE = /\b(match|cote|cotes|value|poisson|pronostic|pronostics|compo|compos|tactique|xg|stats?|statistiques?|classement|buts|historique|actu|actus|actualites|analyse|analyser|bankroll|bookmaker|bookmakers|pari|paris)\b/i

function needsAnalyticalThinking(payload: ChatRequestPayload): boolean {
  if (payload.match?.domicile && payload.match?.exterieur) return true
  if (payload.tab && ANALYTICAL_TABS.has(payload.tab)) return true
  return payload.prompt.length > 18 && ANALYSIS_QUERY_RE.test(payload.prompt)
}

function buildThinkingConfig(model: string, deep: boolean): { thinkingLevel: 'minimal' | 'low' } | undefined {
  if (!model.startsWith('gemini-3.')) return undefined
  if (model.includes('3.8')) return { thinkingLevel: 'low' }
  return { thinkingLevel: deep ? 'low' : 'minimal' }
}

export function candidateModelsList(preferredModel?: string): string[] {
  const candidates = [
    preferredModel,
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
  ]
  const unique: string[] = []
  for (const item of candidates) {
    const clean = typeof item === 'string' ? item.trim() : ''
    if (clean && !unique.includes(clean)) unique.push(clean)
  }
  return unique
}

export function buildSystemInstruction(payload: ChatRequestPayload): string {
  const lines: string[] = [
    "Tu es Apex IA, l'assistant conversationnel intelligent intégré à Apex Football.",
    "Réponds comme un véritable assistant moderne (style ChatGPT) : naturel, fluide, clair et proportionné au message de l'utilisateur.",
    '',
    'Règles de conversation :',
    "1. Salutation, remerciement ou phrase brève (« Salut », « Ça va ? », « Merci ») : réponds en 1 à 2 phrases simples et sympathiques, sans réciter tes capacités ni parler de méthodologie ou de paris.",
    "2. Question courte ou hors-football (calcul simple, question générale, précision rapide) : réponds directement et brièvement sans ramener de force au football ou aux statistiques.",
    "3. Question footballistique générale (tactique, règles, histoire, joueurs, concepts xG / loi de Poisson / value bet, bookmakers) : réponds directement avec expertise dans un format concis et lisible.",
    "4. Question portant sur le match ouvert ou les éléments affichés à l'écran : appuie-toi exclusivement sur les données réelles ci-dessous et dis franchement si une info manque, sans jamais inventer de chiffre.",
    "5. N'évoque la gestion de bankroll ou le jeu responsable QUE si l'utilisateur parle concrètement de mises, de budget ou de stratégie de pari.",
    "6. Langue : français naturel. N'annonce pas artificiellement « Voici mon analyse » ou ton mode.",
  ]

  if (payload.tab && ANALYTICAL_TABS.has(payload.tab)) {
    lines.push('', `Préférence d'angle pour une question d'analyse : ${payload.tab}. (À n'appliquer que si la question concerne le football ou les paris.)`)
  }

  const m = payload.match
  if (m?.domicile && m?.exterieur) {
    const xgDom = m.buts_attendus?.domicile !== undefined ? m.buts_attendus.domicile.toFixed(2) : 'N/D'
    const xgExt = m.buts_attendus?.exterieur !== undefined ? m.buts_attendus.exterieur.toFixed(2) : 'N/D'
    const formeDom = m.forme?.domicile?.join('-') || 'N/D'
    const formeExt = m.forme?.exterieur?.join('-') || 'N/D'

    lines.push(
      '',
      '[FICHE MATCH CONSULTÉE — CONTEXTE DISPONIBLE SI PERTINENT]',
      `Compétition : ${m.competition || 'Compétition officielle'}`,
      `Match : ${m.domicile} (Domicile) vs ${m.exterieur} (Extérieur)`,
      m.date_heure ? `Date / Heure : ${m.date_heure}` : '',
      m.score_actuel ? `Score actuel/final : ${m.score_actuel}` : '',
      `- xG Apex : ${m.domicile} ${xgDom} - ${xgExt} ${m.exterieur}`,
      `- Forme récente (5 derniers) : ${m.domicile} [${formeDom}] | ${m.exterieur} [${formeExt}]`,
      m.stats?.domicile
        ? `- Stats ${m.domicile} : ${m.stats.domicile.buts_marques} b/m marqués, ${m.stats.domicile.buts_encaisses} encaissés/m, ${Math.round((m.stats.domicile.plus_2_5 || 0) * 100)}% +2.5 buts, ${Math.round((m.stats.domicile.sans_encaisser || 0) * 100)}% clean sheets`
        : '',
      m.stats?.exterieur
        ? `- Stats ${m.stats.exterieur} : ${m.stats.exterieur.buts_marques} b/m marqués, ${m.stats.exterieur.buts_encaisses} encaissés/m, ${Math.round((m.stats.exterieur.plus_2_5 || 0) * 100)}% +2.5 buts, ${Math.round((m.stats.exterieur.sans_encaisser || 0) * 100)}% clean sheets`
        : '',
      m.pronostics?.issue
        ? `- Issue 1N2 : ${m.pronostics.issue.selection} (${m.pronostics.issue.probabilite}%)${m.pronostics.issue.cote ? ` [Cote ${m.pronostics.issue.cote}]` : ''}${m.pronostics.issue.justification ? ` · ${m.pronostics.issue.justification}` : ''}`
        : '',
      m.pronostics?.buts
        ? `- Buts : ${m.pronostics.buts.selection} (${m.pronostics.buts.probabilite}%)${m.pronostics.buts.cote ? ` [Cote ${m.pronostics.buts.cote}]` : ''}${m.pronostics.buts.justification ? ` · ${m.pronostics.buts.justification}` : ''}`
        : '',
      m.pronostics?.bonus
        ? `- Bonus (${m.pronostics.bonus.categorie}) : ${m.pronostics.bonus.selection} (observé : ${m.pronostics.bonus.valeur_observee ?? 'N/D'} vs ligue : ${m.pronostics.bonus.moyenne_ligue ?? 'N/D'})${m.pronostics.bonus.justification ? ` · ${m.pronostics.bonus.justification}` : ''}`
        : '',
      m.pronostics?.scores?.[0]
        ? `- Score exact repère : ${m.pronostics.scores[0].score} (${Math.round(m.pronostics.scores[0].probabilite * 100)}%)`
        : '',
    )
  }

  const sc = payload.screenContext
  if (sc && (sc.valueBets?.length || sc.topMatches?.length || sc.headlines?.length || sc.historySummary)) {
    lines.push('', `[CONTEXTE ÉCRAN (${sc.pageTitle || sc.route || 'Apex'}) — À N'UTILISER QUE SI LA QUESTION Y FAIT RÉFÉRENCE]`)
    if (sc.valueBets?.length) {
      lines.push(
        'Value Bets visibles :',
        ...sc.valueBets.slice(0, 4).map(v => `• ${v.match} (${v.competition}) : ${v.choix}, +${v.avantagePct}% vs cote ${v.cote ?? 'N/D'}`),
      )
    }
    if (sc.topMatches?.length) {
      lines.push(
        'Matchs affichés :',
        ...sc.topMatches.slice(0, 5).map(t => `• ${t.match} (${t.competition}) : ${t.issue} (${t.probaPct}%${t.cote ? `, cote ${t.cote}` : ''})`),
      )
    }
    if (sc.headlines?.length) {
      lines.push(
        'Actualités affichées :',
        ...sc.headlines.slice(0, 5).map(h => `• ${h}`),
      )
    }
    if (sc.historySummary) {
      lines.push(`Bilan historique affiché : ${sc.historySummary}`)
    }
  }

  return lines.filter(Boolean).join('\n')
}

export function buildGeminiContents(rawHistory: Array<string | HistoryTurn> | undefined, prompt: string): GeminiContent[] {
  const turns: GeminiContent[] = []
  const items = Array.isArray(rawHistory) ? rawHistory.slice(-12) : []

  for (const item of items) {
    let role: 'user' | 'model' = 'user'
    let text = ''
    if (typeof item === 'string') {
      const clean = item.trim()
      if (!clean) continue
      if (/^(Apex IA|Assistant)\s*:/i.test(clean)) {
        role = 'model'
        text = clean.replace(/^(Apex IA|Assistant)\s*:\s*/i, '').trim()
      } else {
        role = 'user'
        text = clean.replace(/^Utilisateur\s*:\s*/i, '').trim()
      }
    } else if (item && typeof item.text === 'string') {
      text = item.text.trim()
      role = item.role === 'user' ? 'user' : 'model'
    }
    if (!text) continue
    const bounded = text.slice(0, 1600)
    if (turns.length === 0 && role === 'model') continue
    const prev = turns[turns.length - 1]
    if (prev && prev.role === role) {
      prev.parts[0].text = `${prev.parts[0].text}\n${bounded}`
    } else {
      turns.push({ role, parts: [{ text: bounded }] })
    }
  }

  // Gemini 3.5+ requires conversation history to end on a user turn; merge or drop trailing user repeats cleanly.
  while (turns.length > 0 && turns[turns.length - 1].role === 'user') {
    turns.pop()
  }
  turns.push({ role: 'user', parts: [{ text: prompt }] })
  return turns
}

export function extractGeminiText(data: GeminiResponse): string {
  const parts = data.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts
    .filter(p => !p.thought && typeof p.text === 'string')
    .map(p => p.text ?? '')
    .join('')
}

function buildGeminiBody(payload: ChatRequestPayload, model: string): Record<string, unknown> {
  const deep = needsAnalyticalThinking(payload)
  const thinkingConfig = buildThinkingConfig(model, deep)
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: 900,
  }
  if (thinkingConfig) generationConfig.thinkingConfig = thinkingConfig

  return {
    systemInstruction: { parts: [{ text: buildSystemInstruction(payload) }] },
    contents: buildGeminiContents(payload.history, payload.prompt),
    generationConfig,
  }
}

function combineSignals(parent?: AbortSignal, timeoutMs?: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const onAbort = () => controller.abort(parent?.reason)

  if (parent) {
    if (parent.aborted) {
      controller.abort(parent.reason)
    } else {
      parent.addEventListener('abort', onAbort, { once: true })
    }
  }
  if (timeoutMs && timeoutMs > 0) {
    timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)
  }

  return {
    signal: controller.signal,
    cancel: () => {
      if (timer) clearTimeout(timer)
      if (parent) parent.removeEventListener('abort', onAbort)
    },
  }
}

export async function generateApexChat(
  payload: ChatRequestPayload,
  config: ChatEngineConfig,
): Promise<{ ok: true; model: string; text: string } | { ok: false; error: string }> {
  const models = candidateModelsList(config.preferredModel)
  const fetchFn = config.fetchImpl ?? fetch
  let lastError = 'Connexion IA impossible'

  for (const mod of models) {
    if (config.signal?.aborted) break
    const { signal, cancel } = combineSignals(config.signal, config.connectTimeoutMs ?? 5000)
    try {
      const rep = await fetchFn(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(mod)}:generateContent?key=${encodeURIComponent(config.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildGeminiBody(payload, mod)),
          signal,
        },
      )
      if (!rep.ok) {
        lastError = `Modèle ${mod} indisponible (${rep.status})`
        continue
      }
      const data = (await rep.json()) as GeminiResponse
      const text = extractGeminiText(data).trim()
      if (!text) {
        lastError = `Réponse vide de ${mod}`
        continue
      }
      return { ok: true, model: mod, text }
    } catch {
      lastError = `Erreur de communication avec ${mod}`
    } finally {
      cancel()
    }
  }

  return { ok: false, error: lastError }
}

export async function streamApexChat(
  payload: ChatRequestPayload,
  config: ChatEngineConfig,
  onEvent: (ev: ChatStreamEvent) => void,
): Promise<{ ok: true; model: string; text: string } | { ok: false; error: string; committed: boolean }> {
  const models = candidateModelsList(config.preferredModel)
  const fetchFn = config.fetchImpl ?? fetch
  let lastError = 'Connexion IA impossible'

  for (const mod of models) {
    if (config.signal?.aborted) return { ok: false, error: 'Requête interrompue', committed: false }
    let committed = false
    let gotFirstByte = false
    const totalMs = config.totalTimeoutMs ?? 18_000
    const connectMs = config.connectTimeoutMs ?? 4500

    const controller = new AbortController()
    const onParentAbort = () => controller.abort(config.signal?.reason)
    if (config.signal) {
      if (config.signal.aborted) {
        controller.abort(config.signal.reason)
      } else {
        config.signal.addEventListener('abort', onParentAbort, { once: true })
      }
    }
    const connectTimer = setTimeout(() => {
      if (!gotFirstByte) controller.abort(new Error('connect_timeout'))
    }, connectMs)
    const totalTimer = setTimeout(() => controller.abort(new Error('total_timeout')), totalMs)

    try {
      const rep = await fetchFn(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(mod)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(config.apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify(buildGeminiBody(payload, mod)),
          signal: controller.signal,
        },
      )

      if (!rep.ok || !rep.body) {
        lastError = `Modèle ${mod} indisponible (${rep.status})`
        continue
      }

      const reader = rep.body.getReader()
      const decoder = new TextDecoder()
      let sseBuffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (value) {
          gotFirstByte = true
          sseBuffer += decoder.decode(value, { stream: true })
          const lines = sseBuffer.split(/\r?\n/)
          sseBuffer = lines.pop() ?? ''

          for (const rawLine of lines) {
            const line = rawLine.trim()
            if (!line.startsWith('data:')) continue
            const jsonText = line.slice(5).trim()
            if (!jsonText || jsonText === '[DONE]') continue
            let parsed: GeminiResponse | null = null
            try {
              parsed = JSON.parse(jsonText) as GeminiResponse
            } catch {
              continue
            }
            const chunkText = extractGeminiText(parsed)
            if (!chunkText) continue
            if (!committed) {
              committed = true
              onEvent({ type: 'start', model: mod })
            }
            fullText += chunkText
            onEvent({ type: 'delta', text: chunkText })
          }
        }
        if (done) break
      }

      const tail = decoder.decode()
      if (tail) sseBuffer += tail
      for (const rawLine of sseBuffer.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line.startsWith('data:')) continue
        const jsonText = line.slice(5).trim()
        if (!jsonText || jsonText === '[DONE]') continue
        try {
          const parsed = JSON.parse(jsonText) as GeminiResponse
          const chunkText = extractGeminiText(parsed)
          if (chunkText) {
            if (!committed) {
              committed = true
              onEvent({ type: 'start', model: mod })
            }
            fullText += chunkText
            onEvent({ type: 'delta', text: chunkText })
          }
        } catch {
          /* ignore trailing incomplete frame */
        }
      }

      const trimmed = fullText.trim()
      if (committed && trimmed) {
        onEvent({ type: 'done', model: mod, text: trimmed })
        return { ok: true, model: mod, text: trimmed }
      }
      lastError = `Réponse vide de ${mod}`
    } catch {
      if (committed) {
        onEvent({ type: 'error', error: 'Réponse interrompue en cours de génération.' })
        return { ok: false, error: 'Réponse interrompue en cours de génération.', committed: true }
      }
      lastError = `Erreur de communication avec ${mod}`
    } finally {
      clearTimeout(connectTimer)
      clearTimeout(totalTimer)
      if (config.signal) config.signal.removeEventListener('abort', onParentAbort)
    }
  }

  return { ok: false, error: lastError, committed: false }
}
