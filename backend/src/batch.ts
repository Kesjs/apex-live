import type { Contexte, Source } from './types.ts'
import { construireFiche } from './engine/fiche.ts'
import { produireSynthese } from './engine/synthese.ts'
import type { Stockage } from './store.ts'

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
  const rencontres = await source.rencontres(jour)
  const contextes = new Map<string, Contexte>()
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
        ctx = await source.contexte(r.competition)
        contextes.set(r.competition, ctx)
      }
      const { fiche, interne } = construireFiche(r, ctx, source, maintenant)
      if (fiche.pronostics) {
        fiche.synthese = await produireSynthese(fiche, env)
        bilan.avecPronostics++
      } else bilan.sansPronostics++
      await store.enregistrer(jour, fiche, interne)
    } catch (e) {
      // Un match en erreur ne doit pas bloquer les autres.
      bilan.erreurs.push(r.match_id + ' : ' + (e as Error).message)
    }
  }
  return bilan
}
