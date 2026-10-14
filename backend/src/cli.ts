import { genererJour } from './batch.ts'
import { evaluerTermines } from './evaluate.ts'
import { creerServeur } from './server.ts'
import { DemoSource } from './sources/demo-source.ts'
import { JsonSource } from './sources/json-source.ts'
import { Store } from './store.ts'
import type { Stockage } from './store.ts'
import { SupabaseStore } from './supabase-store.ts'
import { TheNewsApiSource } from './sources/news-source.ts'
import { FootballDataSource } from './sources/football-data-source.ts'
import type { Source } from './types.ts'

const env = process.env
function creerStockage(): Stockage {
  if ((env.STORE || 'sqlite') === 'supabase') {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) throw new Error('STORE=supabase demande SUPABASE_URL et SUPABASE_SERVICE_KEY.')
    return new SupabaseStore(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)
  }
  return new Store(env.APEX_DB || 'apex.db')
}
const store = creerStockage()

function source(): Source {
  const type = env.SOURCE || 'demo'
  if (type === 'demo') return new DemoSource()
  if (type === 'json') {
    if (!env.SOURCE_DIR) throw new Error('SOURCE=json demande SOURCE_DIR (dossier des fichiers JSON).')
    return new JsonSource(env.SOURCE_DIR)
  }
  if (type === 'football-data') {
    if (!env.FOOTBALL_DATA_KEY) throw new Error('SOURCE=football-data demande FOOTBALL_DATA_KEY.')
    return new FootballDataSource(env.FOOTBALL_DATA_KEY)
  }
  throw new Error('SOURCE inconnue : ' + type + ' (valeurs : football-data, json, demo)')
}

function jourDecale(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const [commande = 'serve', argument] = process.argv.slice(2)

if (commande === 'batch') {
  // Sans argument : aujourd'hui et demain. Avec une date AAAA-MM-JJ : ce jour seulement.
  const jours = argument ? [argument] : [jourDecale(0), jourDecale(1)]
  const s = source()
  for (const j of jours) console.log(await genererJour(j, s, store, env))
  if (env.THE_NEWS_API_KEY) {
    const articles = await new TheNewsApiSource(env.THE_NEWS_API_KEY).actualites()
    await store.enregistrerActualites(articles)
    console.log('Actualités synchronisées :', articles.length)
  }
  console.log('Fiches évaluées :', await evaluerTermines(store, s))
} else if (commande === 'actualites') {
  if (!env.THE_NEWS_API_KEY) throw new Error('THE_NEWS_API_KEY est obligatoire pour actualites.')
  const articles = await new TheNewsApiSource(env.THE_NEWS_API_KEY).actualites()
  await store.enregistrerActualites(articles)
  console.log('Actualités synchronisées :', articles.length)
} else if (commande === 'evaluer') {
  console.log('Fiches évaluées :', await evaluerTermines(store, source()))
} else if (commande === 'seed') {
  const s = source()
  for (let n = -14; n <= 6; n++) await genererJour(jourDecale(n), s, store, env)
  console.log('Fiches évaluées :', await evaluerTermines(store, s))
  console.log('Base prête (' + (env.APEX_DB || 'apex.db') + '). Lance : npm run dev')
} else if (commande === 'serve') {
  const port = Number(env.PORT || 8787)
  creerServeur(store, { origine: env.CORS_ORIGIN || '*' }).listen(port, () => console.log('Apex back-end sur http://localhost:' + port))
} else {
  console.error('Commandes : serve | batch [AAAA-MM-JJ] | actualites | evaluer | seed')
  process.exit(1)
}
if (commande !== 'serve') await store.fermer()
