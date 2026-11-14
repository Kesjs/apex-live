import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { PeriodeHistorique } from '../../src/domain/contracts.ts'
import {
  generateApexChat,
  streamApexChat,
  type ChatMatchContext,
  type HistoryTurn,
  type ScreenContext,
} from '../../api/_lib/chat-engine.ts'
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
          stream?: boolean
          history?: Array<string | HistoryTurn>
          match?: ChatMatchContext
          screenContext?: ScreenContext
        } = {}
        try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8')) as typeof body } catch { /* ignore */ }
        const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
        if (!prompt || prompt.length > 1200) return envoyer(400, { error: 'Question invalide (1 à 1200 caractères).' })

        const key = process.env.GEMINI_API_KEY?.trim()
        const m = body.match

        if (!key) {
          const bodyDesc = m?.domicile
            ? `[Mode local sans clé API] Pour ${m.domicile} - ${m.exterieur} : vous pouvez consulter les statistiques détaillées (xG, forme, issue 1N2) directement sur les cartes de la fiche. Pour activer Apex IA en direct, configurez GEMINI_API_KEY dans votre fichier .env.`
            : `[Mode local sans clé API] Configurez GEMINI_API_KEY dans votre fichier .env pour activer la conversation en direct avec Apex IA.`
          return envoyer(200, {
            reply: bodyDesc,
            sections: [{
              label: m?.domicile ? `${m.domicile} · ${m.exterieur}` : 'Apex IA',
              sub: 'Mode local',
              time: 'Info',
              body: bodyDesc,
            }],
          })
        }

        const payload = {
          prompt,
          tab: typeof body.tab === 'string' ? body.tab : undefined,
          history: body.history,
          match: body.match,
          screenContext: body.screenContext,
        }
        const preferredModel = process.env.GEMINI_MODEL?.trim()
        const accept = String(req.headers.accept ?? '')
        const wantStream = body.stream !== false && (body.stream === true || accept.includes('text/event-stream'))

        if (wantStream) {
          const ac = new AbortController()
          req.on('close', () => ac.abort())
          let headersSent = false
          const result = await streamApexChat(
            payload,
            { apiKey: key, preferredModel, connectTimeoutMs: 4500, totalTimeoutMs: 18_000, signal: ac.signal },
            (ev) => {
              if (!headersSent) {
                headersSent = true
                res.writeHead(200, {
                  'content-type': 'text/event-stream; charset=utf-8',
                  'access-control-allow-origin': origine,
                  'cache-control': 'no-cache, no-transform',
                  'connection': 'keep-alive',
                })
                res.flushHeaders()
              }
              res.write(`data: ${JSON.stringify(ev)}\n\n`)
            },
          )
          if (result.ok || result.committed) return void res.end()
          return envoyer(502, { error: result.error })
        }

        const result = await generateApexChat(payload, { apiKey: key, preferredModel, connectTimeoutMs: 5500 })
        if (!result.ok) return envoyer(502, { error: result.error })
        const label = m?.domicile ? `${m.domicile} · ${m.exterieur}` : 'Apex IA'
        return envoyer(200, {
          model: result.model,
          reply: result.text,
          sections: [{
            label,
            sub: body.tab && body.tab !== 'Général' && body.tab !== 'Libre' ? `Mode ${body.tab}` : 'Assistant Apex',
            time: 'En direct',
            body: result.text,
          }],
        }, 'no-store')
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
