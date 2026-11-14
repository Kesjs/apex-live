declare const process: { env: Record<string, string | undefined> }

type Request = { method?: string; body?: unknown }
type Response = {
  setHeader: (name: string, value: string) => void
  status: (code: number) => Response
  json: (body: unknown) => void
  end: () => void
}

interface ChatMatchContext {
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

interface ScreenContext {
  route?: string
  pageTitle?: string
  valueBets?: Array<{ match: string; competition: string; choix: string; avantagePct: number; cote?: number }>
  topMatches?: Array<{ match: string; competition: string; issue: string; probaPct: number; cote?: number }>
  headlines?: string[]
  historySummary?: string
}

interface HistoryTurn {
  role: 'user' | 'assistant'
  text: string
}

export default async function handler(req: Request, res: Response) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' })
  }

  let body: {
    prompt?: string
    tab?: string
    history?: Array<string | HistoryTurn>
    match?: ChatMatchContext
    screenContext?: ScreenContext
  } = {}

  if (typeof req.body === 'string') {
    try { body = JSON.parse(req.body) } catch { /* ignore */ }
  } else if (req.body && typeof req.body === 'object') {
    body = req.body as typeof body
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt || prompt.length > 800) {
    return res.status(400).json({ error: 'Question invalide (1 à 800 caractères).' })
  }

  const key = process.env.GEMINI_API_KEY?.trim()
  if (!key) {
    return res.status(503).json({ error: 'Clé Gemini manquante sur le serveur' })
  }

  const m = body.match
  const sc = body.screenContext
  const rawHistory = Array.isArray(body.history) ? body.history.slice(-10) : []
  const formattedHistory = rawHistory
    .map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item.text === 'string') {
        return `${item.role === 'user' ? 'Utilisateur' : 'Apex IA'} : ${item.text}`
      }
      return ''
    })
    .filter(Boolean)

  const parts: string[] = [
    `Tu es Apex IA, l'analyste football senior et stratège paris sportifs de l'application Apex (modèle Poisson, value bets et statistiques avancées).`,
    `Style : direct, structuré, pédagogique, objectif et précis en français. Rappelle la gestion de bankroll et le jeu responsable quand on parle de mises.`,
  ]

  if (m?.domicile && m?.exterieur) {
    const xgDom = m.buts_attendus?.domicile !== undefined ? m.buts_attendus.domicile.toFixed(2) : 'N/D'
    const xgExt = m.buts_attendus?.exterieur !== undefined ? m.buts_attendus.exterieur.toFixed(2) : 'N/D'
    const formeDom = m.forme?.domicile?.join('-') || 'N/D'
    const formeExt = m.forme?.exterieur?.join('-') || 'N/D'

    parts.push(
      '',
      '--- FICHE MATCH CONSULTÉE ---',
      `Compétition : ${m.competition || 'Compétition officielle'}`,
      `Match : ${m.domicile} (Domicile) vs ${m.exterieur} (Extérieur)`,
      m.date_heure ? `Date / Heure : ${m.date_heure}` : '',
      m.score_actuel ? `Score actuel/final : ${m.score_actuel}` : '',
      `- Buts attendus (xG Apex) : ${m.domicile} ${xgDom} - ${xgExt} ${m.exterieur}`,
      `- Forme récente (5 derniers) : ${m.domicile} [${formeDom}] | ${m.exterieur} [${formeExt}]`,
      m.stats?.domicile ? `- Stats ${m.domicile} : ${m.stats.domicile.buts_marques} b/m marqués, ${m.stats.domicile.buts_encaisses} encaissés/m, ${Math.round((m.stats.domicile.plus_2_5 || 0) * 100)}% +2.5, ${Math.round((m.stats.domicile.sans_encaisser || 0) * 100)}% clean sheets` : '',
      m.stats?.exterieur ? `- Stats ${m.exterieur} : ${m.stats.exterieur.buts_marques} b/m marqués, ${m.stats.exterieur.buts_encaisses} encaissés/m, ${Math.round((m.stats.exterieur.plus_2_5 || 0) * 100)}% +2.5, ${Math.round((m.stats.exterieur.sans_encaisser || 0) * 100)}% clean sheets` : '',
      m.pronostics?.issue ? `- Pilier Issue 1N2 : ${m.pronostics.issue.selection} (${m.pronostics.issue.probabilite}%)${m.pronostics.issue.cote ? ` [Cote ${m.pronostics.issue.cote}]` : ''} · ${m.pronostics.issue.justification || ''}` : '',
      m.pronostics?.buts ? `- Pilier Buts : ${m.pronostics.buts.selection} (${m.pronostics.buts.probabilite}%)${m.pronostics.buts.cote ? ` [Cote ${m.pronostics.buts.cote}]` : ''} · ${m.pronostics.buts.justification || ''}` : '',
      m.pronostics?.bonus ? `- Pilier Bonus (${m.pronostics.bonus.categorie}) : ${m.pronostics.bonus.selection} (observé : ${m.pronostics.bonus.valeur_observee ?? 'N/D'} vs ligue : ${m.pronostics.bonus.moyenne_ligue ?? 'N/D'}) · ${m.pronostics.bonus.justification || ''}` : '',
      m.pronostics?.scores?.[0] ? `- Score exact repère : ${m.pronostics.scores[0].score} (${Math.round(m.pronostics.scores[0].probabilite * 100)}%)` : '',
      '-----------------------------',
    )
  }

  if (sc) {
    parts.push('', `--- ÉCRAN ACTIF (${sc.pageTitle || sc.route || 'Navigation Apex'}) ---`)
    if (sc.valueBets?.length) {
      parts.push(
        'Value Bets détectés sur l’écran :',
        ...sc.valueBets.slice(0, 4).map(v => `• ${v.match} (${v.competition}) : ${v.choix}, +${v.avantagePct}% vs cote ${v.cote ?? 'N/D'}`),
      )
    }
    if (sc.topMatches?.length) {
      parts.push(
        'Matchs affichés à l’écran :',
        ...sc.topMatches.slice(0, 5).map(t => `• ${t.match} (${t.competition}) : ${t.issue} (${t.probaPct}%${t.cote ? `, cote ${t.cote}` : ''})`),
      )
    }
    if (sc.headlines?.length) {
      parts.push(
        'Titres d’actualités affichés :',
        ...sc.headlines.slice(0, 5).map(h => `• ${h}`),
      )
    }
    if (sc.historySummary) {
      parts.push(`Bilan historique affiché : ${sc.historySummary}`)
    }
  }

  parts.push(
    '',
    'DIRECTIVES :',
    '1. Adapte-toi exactement à la demande de l’utilisateur : s’il interroge sur le match ouvert, les value bets affichés ou les actualités de son écran, exploite les chiffres ci-dessus avec précision.',
    '2. Si la question porte sur tout autre sujet footballistique (tactique, actualités, gestion de bankroll, comparaison de cotes bookmakers, explication Poisson/xG/value, historique d’un club), réponds directement sans forcer de lien artificiel.',
    '3. Sois concis et lisible (150 à 260 mots max, paragraphes courts ou puces claires). Pas de blabla introductif.',
  )

  if (formattedHistory.length > 0) {
    parts.push('', 'Mémoire récente de la conversation :', ...formattedHistory)
  }

  parts.push('', `Angle suggéré : ${body.tab || 'Général'}`, `Question utilisateur : ${prompt}`)

  const instruction = parts.filter(Boolean).join('\n')

  const candidateModels = [
    process.env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-latest',
  ].filter((cm, idx, arr): cm is string => typeof cm === 'string' && cm.trim().length > 0 && arr.indexOf(cm) === idx)

  let lastError = 'Connexion IA impossible'

  for (const mod of candidateModels) {
    try {
      const rep = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: instruction }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
          }),
          signal: AbortSignal.timeout(15_000),
        },
      )
      if (!rep.ok) {
        lastError = `Modèle ${mod} indisponible (${rep.status})`
        continue
      }
      const data = (await rep.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
      const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim()
      if (!text) continue

      const label = m?.domicile ? `${m.domicile} · ${m.exterieur}` : 'Apex IA'
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).json({
        model: mod,
        sections: [{
          label,
          sub: body.tab ? `Mode ${body.tab}` : 'Analyste Football',
          time: 'En direct',
          body: text,
        }],
      })
    } catch {
      lastError = `Erreur de communication avec ${mod}`
    }
  }

  return res.status(502).json({ error: lastError })
}
