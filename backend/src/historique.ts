import type { Historique, JourHistorique, PeriodeHistorique, PilierId, TauxPilier } from '../../src/domain/contracts.ts'
import type { Stockage } from './store.ts'

export function debutPeriode(periode: PeriodeHistorique, maintenant: Date): string {
  const d = new Date(maintenant)
  if (periode === 'saison') {
    // Une saison commence au 1er août.
    const annee = d.getUTCMonth() >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1
    return annee + '-08-01'
  }
  d.setUTCDate(d.getUTCDate() - (periode === '7j' ? 7 : 30))
  return d.toISOString().slice(0, 10)
}

export async function construireHistorique(store: Stockage, periode: PeriodeHistorique, maintenant: Date = new Date()): Promise<Historique> {
  const lignes = (await store.evaluees(debutPeriode(periode, maintenant))).filter(l => l.fiche.pronostics !== null && l.fiche.resultat.statut === 'evalue')
  const taux: Record<PilierId, TauxPilier> = {
    issue: { reussis: 0, total: 0 },
    buts: { reussis: 0, total: 0 },
    bonus: { reussis: 0, total: 0 },
    scores: { reussis: 0, total: 0 },
  }
  const parJour = new Map<string, JourHistorique>()
  for (const { jour, fiche } of lignes) {
    const r = fiche.resultat
    const verdicts: Array<[PilierId, boolean | null]> = [['issue', r.issue], ['buts', r.buts], ['bonus', r.bonus], ['scores', r.score]]
    for (const [pilier, ok] of verdicts) {
      if (ok === null) continue
      taux[pilier].total++
      if (ok) taux[pilier].reussis++
    }
    if (!parJour.has(jour)) parJour.set(jour, { jour, matchs: [] })
    parJour.get(jour)!.matchs.push(fiche)
  }
  return {
    periode,
    mis_a_jour_le: maintenant.toISOString(),
    taux,
    jours: [...parJour.values()].sort((a, b) => (a.jour < b.jour ? 1 : -1)),
  }
}
