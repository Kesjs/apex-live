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
        let body: { prompt?: string; tab?: string; history?: string[]; match?: { domicile?: string; exterieur?: string } } = {}
        try { body = JSON.parse(Buffer.concat(buffers).toString('utf-8')) } catch { /* ignore */ }
        const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
        if (!prompt || prompt.length > 500) return envoyer(400, { error: 'Question invalide' })

        const key = process.env.GEMINI_API_KEY
        const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
        const domicile = body.match?.domicile || 'équipe à domicile'
        const exterieur = body.match?.exterieur || 'équipe extérieure'
        const history = Array.isArray(body.history) ? body.history.slice(-8).filter((item) => typeof item === 'string') : []

        if (!key) {
          return envoyer(200, {
            sections: [{
              label: 'Assistant Apex',
              sub: 'Mode local',
              time: '',
              body: `Analyse pour ${domicile} - ${exterieur} : « ${prompt} ». Pour recevoir les analyses de Gemini en direct, configurez GEMINI_API_KEY dans votre fichier .env.`,
            }],
          })
        }

        const instruction = [
          `Tu es l'assistant football d'Apex. Réponds en français, simplement et directement.`,
          `Match: ${domicile} contre ${exterieur}. Onglet: ${body.tab || 'Question'}.`,
          `Tu n'as accès à aucune donnée en direct dans cette requête. N'invente jamais de score, statistique, cote ou événement.`,
          `Si l'information manque, dis-le clairement et propose ce que l'utilisateur peut préciser.`,
          `Historique récent: ${history.join(' | ')}`,
          `Question actuelle: ${prompt}`,
        ].join('\n')

        try {
          const rep = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: instruction }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 350 } }),
          })
          if (!rep.ok) return envoyer(rep.status === 429 ? 429 : 502, { error: 'Réponse IA indisponible' })
          const data = (await rep.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
          const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
          if (!text) return envoyer(502, { error: 'Réponse IA vide' })
          return envoyer(200, { sections: [{ label: 'Réponse Apex', sub: model, time: '', body: text }] })
        } catch {
          return envoyer(502, { error: 'Connexion IA impossible' })
        }
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
