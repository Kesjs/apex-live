import type { Contexte, Source } from './types.ts'
import { construireFiche } from './engine/fiche.ts'
import { analyserMatch } from './engine/analyse.ts'
import { produireSynthese } from './engine/synthese.ts'
import type { Stockage } from './store.ts'
import { ApiFootballPredictionSource } from './sources/api-football-prediction.ts'

export interface BilanJour {
  jour: string
  rencontres: number
  avecPronostics: number
  sansPronostics: number
  ignores: number
  erreurs: string[]
}

/**
 * Lot quotidien : pour un jour, lit les rencontres, calcule chaque fiche, ajoute la synthèse
 * et enregistre. Une fiche dont le match a déjà commencé n'est jamais recalculée (les cotes ont bougé).
 */
export async function genererJour(
  jour: string,
  source: Source,
  store: Stockage,
  env: Record<string, string | undefined> = {},
  maintenant: Date = new Date(),
): Promise<BilanJour> {
  // Un jour déjà passé = rétro-calcul : sans IA, avec uniquement les données antérieures au match.
  const retro = jour < maintenant.toISOString().slice(0, 10)
  const rencontres = await source.rencontres(jour)
  const contextes = new Map<string, Contexte>()
  const externe = env.API_FOOTBALL_KEY ? new ApiFootballPredictionSource(env.API_FOOTBALL_KEY) : null
  const bilan: BilanJour = { jour, rencontres: rencontres.length, avecPronostics: 0, sansPronostics: 0, ignores: 0, erreurs: [] }

  for (const r of rencontres) {
    const existante = await store.parId(r.match_id)
    if (existante && new Date(r.date_heure).getTime() <= maintenant.getTime()) {
      bilan.ignores++
      continue
    }
    try {
      let ctx = contextes.get(r.competition)
      if (!ctx) {
        ctx = await source.contexte(r.competition, jour)
        contextes.set(r.competition, ctx)
      }
      let sortie = construireFiche(r, ctx, source, maintenant)
      if (externe) {
        try {
          const comparaison = await externe.prediction(r)
          if (comparaison) sortie.fiche.meta.prediction_externe = comparaison
        } catch {
          // L'enrichissement reste facultatif : une restriction de saison/quota ne bloque jamais Apex.
        }
      }
      if (retro) sortie.fiche.meta.retrocalcul = true
      if (sortie.fiche.pronostics) {
        // L'IA choisit et rédige ; si elle échoue ou est refusée par les contrôles, on garde le moteur.
        const ia = retro ? null : await analyserMatch(r, ctx, sortie, env)
        if (ia) sortie = ia
        else sortie.fiche.synthese = await produireSynthese(sortie.fiche, retro ? { ...env, GEMINI_API_KEY: undefined } : env)
        if (env.GEMINI_API_KEY && !retro) await new Promise(ok => setTimeout(ok, Number(env.GEMINI_PAUSE_MS ?? 6500)))
        bilan.avecPronostics++
      } else bilan.sansPronostics++
      await store.enregistrer(jour, sortie.fiche, sortie.interne)
    } catch (e) {
      // Un match en erreur ne doit pas bloquer les autres.
      bilan.erreurs.push(r.match_id + ' : ' + (e as Error).message)
    }
  }
  return bilan
}
