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
import { StatsCsv } from './sources/stats-csv.ts'
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

// Gardé pour pouvoir afficher dans les logs si le complément CSV (bonus, cotes) a bien été téléchargé.
let csvUtilise: StatsCsv | undefined

function source(): Source {
  const type = env.SOURCE || 'demo'
  if (type === 'demo') return new DemoSource()
  if (type === 'json') {
    if (!env.SOURCE_DIR) throw new Error('SOURCE=json demande SOURCE_DIR (dossier des fichiers JSON).')
    return new JsonSource(env.SOURCE_DIR)
  }
  if (type === 'football-data') {
    if (!env.FOOTBALL_DATA_KEY) throw new Error('SOURCE=football-data demande FOOTBALL_DATA_KEY.')
    // STATS_CSV=non désactive le complément gratuit (cartons, corners, fautes, cotes).
    csvUtilise = env.STATS_CSV === 'non' ? undefined : new StatsCsv()
    return new FootballDataSource(env.FOOTBALL_DATA_KEY, fetch, 6500, csvUtilise)
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
  // Sans argument : aujourd'hui, demain et après-demain. Avec une date AAAA-MM-JJ : ce jour seulement.
  const jours = argument ? [argument] : [jourDecale(0), jourDecale(1), jourDecale(2)]
  const s = source()
  for (const j of jours) console.log(await genererJour(j, s, store, env))
  if (env.THE_NEWS_API_KEY) {
    const articles = await new TheNewsApiSource(env.THE_NEWS_API_KEY).actualites()
    await store.enregistrerActualites(articles)
    console.log('Actualités synchronisées :', articles.length)
  }
  console.log('Fiches évaluées :', await evaluerTermines(store, s))
  if (csvUtilise) {
    if (csvUtilise.erreurs.length) console.warn('ATTENTION — CSV cartons/corners/fautes/cotes non téléchargé(s), donc pas de bonus :\n' + csvUtilise.erreurs.join('\n'))
    else console.log('CSV cartons/corners/fautes/cotes : téléchargés (' + csvUtilise.nbLignes + ' lignes).')
  }
} else if (commande === 'actualites') {
  if (!env.THE_NEWS_API_KEY) throw new Error('THE_NEWS_API_KEY est obligatoire pour actualites.')
  const articles = await new TheNewsApiSource(env.THE_NEWS_API_KEY).actualites()
  await store.enregistrerActualites(articles)
  console.log('Actualités synchronisées :', articles.length)
} else if (commande === 'evaluer') {
  console.log('Fiches évaluées :', await evaluerTermines(store, source()))
} else if (commande === 'seed') {
  // Historique de départ : les 14 derniers jours (rétro-calcul + résultats réels) et les 6 prochains jours.
  // Pas d'IA ici (quota) : lance ensuite `batch` pour que l'IA analyse aujourd'hui, demain et après-demain.
  const s = source()
  const sansIA = { ...env, GEMINI_API_KEY: undefined }
  for (let n = -14; n <= 6; n++) console.log(await genererJour(jourDecale(n), s, store, sansIA))
  console.log('Fiches évaluées :', await evaluerTermines(store, s))
  console.log('Base prête. Lance maintenant : batch')
} else if (commande === 'serve') {
  const port = Number(env.PORT || 8787)
  creerServeur(store, { origine: env.CORS_ORIGIN || '*' }).listen(port, () => console.log('Apex back-end sur http://localhost:' + port))
} else {
  console.error('Commandes : serve | batch [AAAA-MM-JJ] | actualites | evaluer | seed')
  process.exit(1)
}
if (commande !== 'serve') await store.fermer()
