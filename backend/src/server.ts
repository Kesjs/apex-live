import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { PeriodeHistorique } from '../../src/domain/contracts.ts'
import { construireHistorique } from './historique.ts'
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
        res.writeHead(204, { 'access-control-allow-origin': origine, 'access-control-allow-methods': 'GET, OPTIONS', 'access-control-allow-headers': 'accept' })
        return void res.end()
      }
      if (req.method !== 'GET') return envoyer(405, { erreur: 'Méthode non autorisée.' })
      const url = new URL(req.url ?? '/', 'http://localhost')
      const chemin = url.pathname.replace(/\/$/, '')

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
        return envoyer(200, await store.actualites(categorie ?? undefined), 'public, max-age=300')
      }
      return envoyer(404, { erreur: 'Route inconnue.' })
    } catch (e) {
      console.error(e)
      return envoyer(500, { erreur: 'Erreur interne.' })
    }
  })
}
