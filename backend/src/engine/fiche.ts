import type { Prediction } from '../../../src/domain/contracts.ts'
import type { Contexte, Interne, Rencontre } from '../types.ts'
import { choisirBonus } from './bonus.ts'
import { butsAttendus, forme, MIN_MATCHS } from './force.ts'
import { choisirButs, choisirIssue, choisirScores } from './marches.ts'
import { issue, matrice } from './poisson.ts'
import { valeur } from './value.ts'

export const VERSION_MOTEUR = '1.0.0'

export interface Sortie {
  fiche: Prediction
  interne: Interne | null
}

/**
 * Transforme une rencontre en fiche. Aucune IA ici : tout est calculé de façon déterministe.
 * (La synthèse écrite est ajoutée ensuite par le lot quotidien.)
 */
export function construireFiche(r: Rencontre, ctx: Contexte, source: { nom: string; nomCotes: string }, maintenant = new Date()): Sortie {
  const base: Prediction = {
    match_id: r.match_id,
    date_heure: r.date_heure,
    competition: r.competition,
    equipes: { domicile: r.domicile.nom, exterieur: r.exterieur.nom },
    ...(r.logos ? { logos: r.logos } : {}),
    pronostics: null,
    meta: {
      genere_le: maintenant.toISOString(),
      version_moteur: VERSION_MOTEUR,
      source_stats: source.nom,
      source_cotes: source.nomCotes,
      ...(r.cotes_observees_le ? { cotes_observees_le: r.cotes_observees_le } : {}),
    },
    resultat: { statut: 'non_evalue', issue: null, buts: null, bonus: null, score: null },
  }

  if (r.domicile.matchs.length < MIN_MATCHS || r.exterieur.matchs.length < MIN_MATCHS) {
    return { fiche: { ...base, raison_absence: 'Pas assez de matchs récents pour une analyse fiable.' }, interne: null }
  }

  const fd = forme(r.domicile.matchs)
  const fe = forme(r.exterieur.matchs)
  const { lh, la } = butsAttendus(r.domicile.matchs, r.exterieur.matchs, ctx)
  const m = matrice(lh, la)

  const i = choisirIssue(issue(m), r.domicile.nom, r.exterieur.nom, fd, fe, r.cotes)
  const b = choisirButs(m, r.domicile.matchs, r.exterieur.matchs, r.cotes)
  const bo = choisirBonus(r.domicile.matchs, r.exterieur.matchs, ctx, r.cotes)
  const scores = choisirScores(m, r.cotes)

  const val = valeur(
    [
      { pilier: 'issue', cle: i.cle, probabilite: i.pronostic.probabilite },
      { pilier: 'buts', cle: b.cle, probabilite: b.pronostic.probabilite },
    ],
    r.cotes,
  )

  return {
    fiche: {
      ...base,
      pronostics: { issue: i.pronostic, buts: b.pronostic, bonus: bo ? bo.pronostic : null, scores },
      value: val,
      forme: { domicile: fd, exterieur: fe },
    },
    interne: {
      issue: i.cle,
      buts: b.cle,
      bonus: bo ? { categorie: bo.categorie, ligne: bo.ligne } : null,
      scores: scores.map(s => s.score),
    },
  }
}
