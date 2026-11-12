import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { PeriodeHistorique } from '../../src/domain/contracts.ts'
import { construireHistorique } from './historique.ts'
import { fetchLiveNews } from './sources/rss-news.ts'
import type { Stockage } from './store.ts'

const JOUR = /^\d{4}-\d{2}-\d{2}$/
const PERIODES: PeriodeHistorique[] = ['7j', '30j', 'saison']

export function creerServeur(store: Stockage, opts: { origine?: string; maintenant?: () => Date } = {}): Server {
  const origine = opts.origine ?? '*'
  const maintenant = opts.maintenant ?? (() => new Date())

  return createServer(async (req, res) => {
    const envoyer = (statut: number, corps: unknown, cache = 'public, max-age=60'): void => {
      res.writeHead(statut, {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': origine,
        'cache-control': statut === 200 ? cache : 'no-store',
      })
      res.end(JSON.stringify(corps))
    }
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, { 'access-control-allow-origin': origine, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type, accept' })
        return void res.end()
      }
      const url = new URL(req.url ?? '/', 'http://localhost')
      const chemin = url.pathname.replace(/\/$/, '')

      if (req.method === 'POST' && chemin === '/api/chat') {
        const buffers: Buffer[] = []
        for await (const chunk of req) buffers.push(chunk as Buffer)
        let body: {
          prompt?: string
          tab?: string
          history?: string[]
          match?: {
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
        } = {}
        try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8')) } catch { /* ignore */ }
        const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
        if (!prompt || prompt.length > 500) return envoyer(400, { error: 'Question invalide' })

        const key = process.env.GEMINI_API_KEY
        const history = Array.isArray(body.history) ? body.history.slice(-8).filter((item) => typeof item === 'string') : []
        const m = body.match

        if (!key) {
          const bodyDesc = m?.domicile
            ? `[Mode local sans clé API] Pour ${m.domicile} - ${m.exterieur} : vous pouvez consulter les statistiques détaillées (xG, forme, issue 1N2) directement sur les cartes de la fiche. Pour activer l'analyse conversationnelle Gemini en direct, configurez GEMINI_API_KEY dans votre fichier .env.`
            : `[Mode local sans clé API] Vous pouvez poser n'importe quelle question sur le football, la tactique ou les statistiques. Pour activer les réponses de Gemini en direct, configurez GEMINI_API_KEY dans votre fichier .env.`
          return envoyer(200, {
            sections: [{
              label: m?.domicile ? `${m.domicile} vs ${m.exterieur}` : 'Apex Football IA',
              sub: 'Mode local',
              time: 'Info',
              body: bodyDesc,
            }],
          })
        }

        const parts: string[] = [
          `Tu es Apex Football IA, l'analyste football d'élite et conseiller stratégique de l'application Apex.`,
          `Ton style : passionné, analytique, direct, précis et pédagogue. Tu t'exprimes toujours en français impeccable avec un vocabulaire footballistique riche.`
        ]

        if (m && m.domicile && m.exterieur) {
          const xgDom = m.buts_attendus?.domicile !== undefined ? m.buts_attendus.domicile.toFixed(2) : 'N/D'
          const xgExt = m.buts_attendus?.exterieur !== undefined ? m.buts_attendus.exterieur.toFixed(2) : 'N/D'
          const formeDom = m.forme?.domicile?.join('-') || 'N/D'
          const formeExt = m.forme?.exterieur?.join('-') || 'N/D'

          parts.push(
            ``,
            `--- CONTEXTE DE LA RENCONTRE OUVERTE ---`,
            `Compétition : ${m.competition || 'Compétition officielle'}`,
            `Match : ${m.domicile} (Domicile) vs ${m.exterieur} (Extérieur)`,
            m.date_heure ? `Date / Heure : ${m.date_heure}` : '',
            m.score_actuel ? `Score final/actuel : ${m.score_actuel}` : '',
            `Données statistiques du modèle Apex pour cette rencontre :`,
            `- Buts attendus (xG modèle Apex) : ${m.domicile} ${xgDom} - ${xgExt} ${m.exterieur}`,
            `- Forme récente (5 derniers matchs) : ${m.domicile} [${formeDom}] | ${m.exterieur} [${formeExt}]`,
            m.stats?.domicile ? `- Stats ${m.domicile} : ${m.stats.domicile.buts_marques} buts/m marqués, ${m.stats.domicile.buts_encaisses} encaissés/m, ${Math.round((m.stats.domicile.plus_2_5 || 0) * 100)}% +2.5 buts, ${Math.round((m.stats.domicile.sans_encaisser || 0) * 100)}% clean sheets` : '',
            m.stats?.exterieur ? `- Stats ${m.exterieur} : ${m.stats.exterieur.buts_marques} buts/m marqués, ${m.stats.exterieur.buts_encaisses} encaissés/m, ${Math.round((m.stats.exterieur.plus_2_5 || 0) * 100)}% +2.5 buts, ${Math.round((m.stats.exterieur.sans_encaisser || 0) * 100)}% clean sheets` : '',
            m.pronostics?.issue ? `- Modèle Issue 1N2 : ${m.pronostics.issue.selection} (${m.pronostics.issue.probabilite}%)${m.pronostics.issue.cote ? ` [Cote : ${m.pronostics.issue.cote}]` : ''} - ${m.pronostics.issue.justification || ''}` : '',
            m.pronostics?.buts ? `- Modèle Buts : ${m.pronostics.buts.selection} (${m.pronostics.buts.probabilite}%)${m.pronostics.buts.cote ? ` [Cote : ${m.pronostics.buts.cote}]` : ''} - ${m.pronostics.buts.justification || ''}` : '',
            m.pronostics?.bonus ? `- Modèle Bonus (${m.pronostics.bonus.categorie}) : ${m.pronostics.bonus.selection} (observé : ${m.pronostics.bonus.valeur_observee ?? 'N/D'} vs ligue : ${m.pronostics.bonus.moyenne_ligue ?? 'N/D'}) - ${m.pronostics.bonus.justification || ''}` : '',
            m.pronostics?.scores && m.pronostics.scores[0] ? `- Score exact repère : ${m.pronostics.scores[0].score} (${Math.round(m.pronostics.scores[0].probabilite * 100)}%)` : '',
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
          `1. Si la question porte sur le match ouvert (${m?.domicile ?? ''} vs ${m?.exterieur ?? ''}) : sers-toi des statistiques et pronostics Apex ci-dessus pour argumenter avec précision (xG, forme, tendances buts/corners/cartons).`,
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
          `Onglet thématique : ${body.tab || 'Général'}`,
          `Question : ${prompt}`
        )

        const instruction = parts.filter(Boolean).join('\n')
        const candidateModels = [
          process.env.GEMINI_MODEL,
          'gemini-3.5-flash-lite',
          'gemini-3.8-flash',
          'gemini-flash-lite-latest',
          'gemini-flash-latest',
        ].filter((cm): cm is string => typeof cm === 'string' && cm.trim().length > 0)

        let lastError = 'Connexion IA impossible'
        let answered = false

        for (const mod of candidateModels) {
          try {
            const rep = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${mod}:generateContent?key=${encodeURIComponent(key)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: instruction }] }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
              }),
            })
            if (!rep.ok) {
              lastError = `Modèle ${mod} indisponible (${rep.status})`
              continue
            }
            const data = (await rep.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
            const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
            if (!text) continue

            const label = m?.domicile ? `${m.domicile} vs ${m.exterieur}` : 'Apex Football IA'
            answered = true
            envoyer(200, {
              sections: [{
                label,
                sub: body.tab ? `Analyse ${body.tab}` : 'Expert Foot',
                time: 'En direct',
                body: text,
              }],
            })
            break
          } catch {
            lastError = `Erreur de communication avec ${mod}`
          }
        }

        if (!answered) return envoyer(502, { error: lastError })
        return
      }

      if (req.method !== 'GET') return envoyer(405, { erreur: 'Méthode non autorisée.' })

      if (chemin === '/api/sante') return envoyer(200, { ok: true }, 'no-store')

      if (chemin === '/api/matchs') {
        const date = url.searchParams.get('date') ?? ''
        if (!JOUR.test(date)) return envoyer(400, { erreur: 'Paramètre date attendu au format AAAA-MM-JJ.' })
        return envoyer(200, await store.parJour(date))
      }
      const detail = /^\/api\/matchs\/([^/]+)$/.exec(chemin)
      if (detail) {
        const fiche = await store.parId(decodeURIComponent(detail[1]))
        return fiche ? envoyer(200, fiche) : envoyer(404, { erreur: 'Match introuvable.' })
      }
      if (chemin === '/api/historique') {
        const periode = (url.searchParams.get('periode') ?? '30j') as PeriodeHistorique
        if (!PERIODES.includes(periode)) return envoyer(400, { erreur: 'Paramètre periode attendu : 7j, 30j ou saison.' })
        return envoyer(200, await construireHistorique(store, periode, maintenant()))
      }
      if (chemin === '/api/actualites') {
        const categorie = url.searchParams.get('categorie') as 'football' | 'champions-league' | 'europa-league' | null
        if (categorie && !['football', 'champions-league', 'europa-league'].includes(categorie)) return envoyer(400, { erreur: 'Catégorie invalide.' })
        let articles = await store.actualites(categorie ?? undefined)
        if (!articles || articles.length === 0) {
          const directes = await fetchLiveNews()
          articles = categorie ? directes.filter(a => a.categorie === categorie) : directes
        }
        return envoyer(200, articles, 'public, max-age=300')
      }
      return envoyer(404, { erreur: 'Route inconnue.' })
    } catch (e) {
      console.error(e)
      return envoyer(500, { erreur: 'Erreur interne.' })
    }
  })
}
