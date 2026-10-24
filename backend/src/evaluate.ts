import type { ResultatFiche } from '../../src/domain/contracts.ts'
import type { Interne, ResultatReel, Source } from './types.ts'
import type { Stockage } from './store.ts'

const DELAI_APRES_COUP_ENVOI_MS = 2 * 3600_000

export function jugerIssue(cle: string, d: number, e: number): boolean {
  switch (cle) {
    case '1': return d > e
    case '2': return e > d
    case '1X': return d >= e
    case 'X2': return e >= d
    case 'N': return d === e
    case '12': return d !== e
    default: return false
  }
}

export function jugerButs(cle: string, d: number, e: number): boolean {
  const t = d + e
  switch (cle) {
    case 'O1.5': return t > 1.5
    case 'O2.5': return t > 2.5
    case 'U2.5': return t < 2.5
    case 'U3.5': return t < 3.5
    case 'BTTS': return d > 0 && e > 0
    default: return false
  }
}

export function evaluerFiche(interne: Interne | null, r: ResultatReel): ResultatFiche | null {
  if (r.statut === 'a_venir') return null
  if (r.statut === 'annule') return { statut: 'annule', issue: null, buts: null, bonus: null, score: null }
  const d = r.score_domicile
  const e = r.score_exterieur
  if (d === undefined || e === undefined) return null
  const final = d + '-' + e
  if (!interne) return { statut: 'evalue', issue: null, buts: null, bonus: null, score: null, score_final: final }
  let bonus: boolean | null = null
  if (interne.bonus) {
    const reel = r.bonus?.[interne.bonus.categorie]
    bonus = typeof reel === 'number' ? reel > interne.bonus.ligne : null
  }
  return {
    statut: 'evalue',
    issue: jugerIssue(interne.issue, d, e),
    buts: jugerButs(interne.buts, d, e),
    bonus,
    score: interne.scores.includes(final),
    score_final: final,
  }
}

/** Évalue toutes les fiches dont le match est terminé. Renvoie le nombre de fiches mises à jour. */
export async function evaluerTermines(store: Stockage, source: Source, maintenant: Date = new Date()): Promise<number> {
  const limite = new Date(maintenant.getTime() - DELAI_APRES_COUP_ENVOI_MS).toISOString()
  const lignes = await store.aEvaluer(limite)
  if (!lignes.length) return 0
  const resultats = source.resultats
    ? await source.resultats(lignes.map(ligne => ligne.match_id))
    : null
  let n = 0
  for (const ligne of lignes) {
    const reel = resultats ? (resultats.get(ligne.match_id) ?? null) : await source.resultat(ligne.match_id)
    if (!reel) continue
    // Publier le score immédiatement ; compléter le bonus pendant au plus trois jours.
    const bonus = ligne.interne?.bonus
    const bonusEnAttente = reel.statut === 'termine' && Boolean(bonus) && typeof reel.bonus?.[bonus!.categorie] !== 'number' && maintenant.getTime() - Date.parse(ligne.date_heure) < 3 * 86_400_000
    const res = evaluerFiche(ligne.interne, reel)
    if (!res) continue
    res.mis_a_jour_le = maintenant.toISOString()
    res.bonus_en_attente = bonusEnAttente
    await store.marquerEvalue(ligne.match_id, res)
    n++
  }
  return n
}
