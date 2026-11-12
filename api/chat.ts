type Request = { method?: string; body?: unknown }
type Response = {
  status: (code: number) => Response
  json: (body: unknown) => void
  end: () => void
}

declare const process: { env: Record<string, string | undefined> }

export interface MatchChatContext {
  domicile: string
  exterieur: string
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

export function buildChatInstruction(
  prompt: string,
  tab = 'Général',
  history: string[] = [],
  match?: MatchChatContext
): string {
  const parts: string[] = [
    `Tu es Apex Football IA, l'analyste football d'élite et conseiller stratégique de l'application Apex.`,
    `Ton style : passionné, analytique, direct, précis et pédagogue. Tu t'exprimes toujours en français impeccable avec un vocabulaire footballistique riche.`
  ]

  if (match && match.domicile && match.exterieur) {
    const xgDom = match.buts_attendus?.domicile !== undefined ? match.buts_attendus.domicile.toFixed(2) : 'N/D'
    const xgExt = match.buts_attendus?.exterieur !== undefined ? match.buts_attendus.exterieur.toFixed(2) : 'N/D'
    const formeDom = match.forme?.domicile?.join('-') || 'N/D'
    const formeExt = match.forme?.exterieur?.join('-') || 'N/D'

    parts.push(
      ``,
      `--- CONTEXTE DE LA RENCONTRE OUVERTE ---`,
      `Compétition : ${match.competition || 'Compétition officielle'}`,
      `Match : ${match.domicile} (Domicile) vs ${match.exterieur} (Extérieur)`,
      match.date_heure ? `Date / Heure : ${match.date_heure}` : '',
      match.score_actuel ? `Score final/actuel : ${match.score_actuel}` : '',
      `Données statistiques du modèle Apex pour cette rencontre :`,
      `- Buts attendus (xG modèle Apex) : ${match.domicile} ${xgDom} - ${xgExt} ${match.exterieur}`,
      `- Forme récente (5 derniers matchs) : ${match.domicile} [${formeDom}] | ${match.exterieur} [${formeExt}]`,
      match.stats?.domicile ? `- Stats ${match.domicile} : ${match.stats.domicile.buts_marques} buts/m marqués, ${match.stats.domicile.buts_encaisses} encaissés/m, ${Math.round((match.stats.domicile.plus_2_5 || 0) * 100)}% +2.5 buts, ${Math.round((match.stats.domicile.sans_encaisser || 0) * 100)}% clean sheets` : '',
      match.stats?.exterieur ? `- Stats ${match.exterieur} : ${match.stats.exterieur.buts_marques} buts/m marqués, ${match.stats.exterieur.buts_encaisses} encaissés/m, ${Math.round((match.stats.exterieur.plus_2_5 || 0) * 100)}% +2.5 buts, ${Math.round((match.stats.exterieur.sans_encaisser || 0) * 100)}% clean sheets` : '',
      match.pronostics?.issue ? `- Modèle Issue 1N2 : ${match.pronostics.issue.selection} (${match.pronostics.issue.probabilite}%)${match.pronostics.issue.cote ? ` [Cote : ${match.pronostics.issue.cote}]` : ''} - ${match.pronostics.issue.justification || ''}` : '',
      match.pronostics?.buts ? `- Modèle Buts : ${match.pronostics.buts.selection} (${match.pronostics.buts.probabilite}%)${match.pronostics.buts.cote ? ` [Cote : ${match.pronostics.buts.cote}]` : ''} - ${match.pronostics.buts.justification || ''}` : '',
      match.pronostics?.bonus ? `- Modèle Bonus (${match.pronostics.bonus.categorie}) : ${match.pronostics.bonus.selection} (observé : ${match.pronostics.bonus.valeur_observee ?? 'N/D'} vs ligue : ${match.pronostics.bonus.moyenne_ligue ?? 'N/D'}) - ${match.pronostics.bonus.justification || ''}` : '',
      match.pronostics?.scores && match.pronostics.scores[0] ? `- Score exact repère : ${match.pronostics.scores[0].score} (${Math.round(match.pronostics.scores[0].probabilite * 100)}%)` : '',
      `----------------------------------------`
    )
  } else {
    parts.push(
      ``,
      `Contexte : Navigation générale (aucun match particulier sélectionné). Tu es une encyclopédie et un stratège du football : tactique, championnats européens, actualités, joueurs, règles du jeu, ou méthodologies statistiques (xG, loi de Poisson, gestion de bankroll).`
    )
  }

  parts.push(
    ``,
    `DIRECTIVES D'ANALYSE :`,
    `1. Si la question porte sur le match ouvert (${match?.domicile ?? ''} vs ${match?.exterieur ?? ''}) : sers-toi des statistiques et pronostics Apex ci-dessus pour argumenter avec précision (xG, forme, tendances buts/corners/cartons).`,
    `2. Si la question est générale ou porte sur un autre sujet (culture, tactique, règles, transferts, gestion de bankroll, explication de xG/Poisson) : réponds avec ta pleine expertise de football sans jamais refuser en prétextant un manque de données en direct. Ne force JAMAIS de lien artificiel avec un match si l'utilisateur pose une question générale.`,
    `3. Style et concision : réponds avec clarté en 2 à 4 paragraphes courts ou puces aérées (max 250-300 mots). Pas de remplissage. Sois percutant.`
  )

  if (history.length > 0) {
    parts.push(
      ``,
      `Historique récent de la discussion :`,
      ...history.map((h, i) => `[${i + 1}] ${h}`)
    )
  }

  parts.push(
    ``,
    `Onglet thématique : ${tab}`,
    `Question : ${prompt}`
  )

  return parts.filter(Boolean).join('\n')
}

const CANDIDATE_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
].filter((m): m is string => typeof m === 'string' && m.trim().length > 0)

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  const key = process.env.GEMINI_API_KEY
  if (!key) return res.status(503).json({ error: 'Assistant non configuré' })

  let body: {
    prompt?: string
    tab?: string
    history?: string[]
    match?: MatchChatContext
  } = {}

  if (typeof req.body === 'string') {
    try { body = JSON.parse(req.body) } catch { body = {} }
  } else if (req.body && typeof req.body === 'object') {
    body = req.body as typeof body
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (!prompt || prompt.length > 500) return res.status(400).json({ error: 'Question invalide' })

  const history = Array.isArray(body.history) ? body.history.slice(-8).filter((item) => typeof item === 'string') : []
  const instruction = buildChatInstruction(prompt, body.tab || 'Général', history, body.match)

  let lastError = 'Connexion IA impossible'
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: instruction }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
        }),
      })

      if (!response.ok) {
        lastError = `Modèle ${model} indisponible (${response.status})`
        continue
      }

      const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
      const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
      if (!text) continue

      const label = body.match?.domicile ? `${body.match.domicile} vs ${body.match.exterieur}` : 'Apex Football IA'
      return res.status(200).json({
        sections: [
          {
            label,
            sub: body.tab ? `Analyse ${body.tab}` : 'Expert Foot',
            time: 'En direct',
            body: text,
          },
        ],
      })
    } catch {
      lastError = `Erreur de communication avec ${model}`
    }
  }

  return res.status(502).json({ error: lastError })
}
