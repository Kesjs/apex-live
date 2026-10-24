type Request = { method?: string; body?: unknown }
type Response = {
  status: (code: number) => Response
  json: (body: unknown) => void
  end: () => void
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite'

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  const key = process.env.GEMINI_API_KEY
  if (!key) return res.status(503).json({ error: 'Assistant non configuré' })

  const body = (req.body || {}) as { prompt?: string; tab?: string; history?: string[]; match?: { domicile?: string; exterieur?: string } }
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt || prompt.length > 500) return res.status(400).json({ error: 'Question invalide' })

  const domicile = body.match?.domicile || 'équipe à domicile'
  const exterieur = body.match?.exterieur || 'équipe extérieure'
  const history = Array.isArray(body.history) ? body.history.slice(-8).filter((item) => typeof item === 'string') : []
  const instruction = [
    `Tu es l'assistant football d'Apex. Réponds en français, simplement et directement.`,
    `Match: ${domicile} contre ${exterieur}. Onglet: ${body.tab || 'Question'}.`,
    `Tu n'as accès à aucune donnée en direct dans cette requête. N'invente jamais de score, statistique, cote ou événement.`,
    `Si l'information manque, dis-le clairement et propose ce que l'utilisateur peut préciser.`,
    `Historique récent: ${history.join(' | ')}`,
    `Question actuelle: ${prompt}`,
  ].join('\n')

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: instruction }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 350 } }),
    })
    if (!response.ok) return res.status(response.status === 429 ? 429 : 502).json({ error: 'Réponse IA indisponible' })
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
    if (!text) return res.status(502).json({ error: 'Réponse IA vide' })
    return res.status(200).json({ sections: [{ label: 'Réponse Apex', sub: MODEL, time: '', body: text }] })
  } catch {
    return res.status(502).json({ error: 'Connexion IA impossible' })
  }
}
