import {
  generateApexChat,
  streamApexChat,
  type ChatMatchContext,
  type HistoryTurn,
  type ScreenContext,
} from './_lib/chat-engine.ts'

declare const process: { env: Record<string, string | undefined> }

type Request = {
  method?: string
  body?: unknown
  headers?: Record<string, string | string[] | undefined>
}

type Response = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => Response
  json: (body: unknown) => void
  write?: (chunk: string) => boolean | void
  flushHeaders?: () => void
  end: (chunk?: string) => void
}

function wantsSse(req: Request, bodyStream: unknown, res: Response): boolean {
  if (typeof res.write !== 'function') return false
  if (bodyStream === false) return false
  if (bodyStream === true) return true
  const accept = String(req.headers?.accept ?? req.headers?.Accept ?? '')
  return accept.includes('text/event-stream')
}

export default async function handler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  let body: {
    prompt?: string
    tab?: string
    stream?: boolean
    history?: Array<string | HistoryTurn>
    match?: ChatMatchContext
    screenContext?: ScreenContext
  } = {}

  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body) as typeof body
    } catch {
      /* ignore malformed JSON */
    }
  } else if (req.body && typeof req.body === 'object') {
    body = req.body as typeof body
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt || prompt.length > 1200) {
    return res.status(400).json({ error: 'Question invalide (1 à 1200 caractères).' })
  }

  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) {
    return res.status(503).json({ error: 'Clé Gemini manquante sur le serveur' })
  }

  const payload = {
    prompt,
    tab: typeof body.tab === 'string' ? body.tab : undefined,
    history: body.history,
    match: body.match,
    screenContext: body.screenContext,
  }
  const preferredModel = process.env.GEMINI_MODEL?.trim()

  if (wantsSse(req, body.stream, res)) {
    let headersSent = false
    const result = await streamApexChat(
      payload,
      { apiKey: key, preferredModel, connectTimeoutMs: 4500, totalTimeoutMs: 18_000 },
      (ev) => {
        if (!headersSent) {
          headersSent = true
          res.status(200)
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache, no-transform')
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('X-Accel-Buffering', 'no')
          res.flushHeaders?.()
        }
        res.write?.(`data: ${JSON.stringify(ev)}\n\n`)
      },
    )

    if (result.ok) {
      return res.end()
    }
    if (result.committed) {
      return res.end()
    }
    return res.status(502).json({ error: result.error })
  }

  const result = await generateApexChat(payload, {
    apiKey: key,
    preferredModel,
    connectTimeoutMs: 5500,
  })

  if (!result.ok) {
    return res.status(502).json({ error: result.error })
  }

  const label = body.match?.domicile ? `${body.match.domicile} · ${body.match.exterieur}` : 'Apex IA'
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({
    model: result.model,
    reply: result.text,
    sections: [{
      label,
      sub: body.tab && body.tab !== 'Général' && body.tab !== 'Libre' ? `Mode ${body.tab}` : 'Assistant Apex',
      time: 'En direct',
      body: result.text,
    }],
  })
}
