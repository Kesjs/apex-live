import type { Prediction, StatsEquipe } from '../../../src/domain/contracts.ts'
import type { Contexte, Interne, MatchPasse, Rencontre } from '../types.ts'
import { choisirBonus } from './bonus.ts'
import { butsAttendus, forme, MIN_MATCHS, NB_MATCHS, recents } from './force.ts'
import { choisirButs, choisirIssue, choisirScores } from './marches.ts'
import { issue, matrice } from './poisson.ts'
import { valeur } from './value.ts'

export const VERSION_MOTEUR = '1.0.0'

const r2 = (n: number): number => Math.round(n * 100) / 100
const part = (matchs: MatchPasse[], vrai: (m: MatchPasse) => boolean): number => (matchs.length ? r2(matchs.filter(vrai).length / matchs.length) : 0)

/** Les statistiques les plus utiles d'une équipe sur ses 10 derniers matchs. */
export function statsEquipe(matchs: MatchPasse[]): StatsEquipe {
  const r = recents(matchs, NB_MATCHS)
  const moy = (f: (m: MatchPasse) => number): number => (r.length ? Math.round((r.reduce((a, m) => a + f(m), 0) / r.length) * 10) / 10 : 0)
  return {
    matchs: r.length,
    buts_marques: moy(m => m.buts_pour),
    buts_encaisses: moy(m => m.buts_contre),
    plus_2_5: part(r, m => m.buts_pour + m.buts_contre > 2.5),
    deux_marquent: part(r, m => m.buts_pour > 0 && m.buts_contre > 0),
    sans_encaisser: part(r, m => m.buts_contre === 0),
    derniers: r.slice(0, 5).map(m => m.buts_pour + '-' + m.buts_contre),
  }
}

/** Moyenne de buts par équipe et par match dans la compétition (marqués = encaissés en moyenne). */
function moyenneLigue(ctx: Contexte): { buts_marques: number; buts_encaisses: number } {
  const moy = Math.round(((ctx.moy_buts_domicile + ctx.moy_buts_exterieur) / 2) * 10) / 10
  return { buts_marques: moy, buts_encaisses: moy }
}

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

  // Moins de 5 matchs récents pour une équipe : on pronostique quand même, en le signalant.
  if (r.domicile.matchs.length < MIN_MATCHS || r.exterieur.matchs.length < MIN_MATCHS) base.meta.donnees_limitees = true

  const fd = forme(r.domicile.matchs)
  const fe = forme(r.exterieur.matchs)
  const { lh, la } = butsAttendus(r.domicile.matchs, r.exterieur.matchs, ctx)
  const m = matrice(lh, la)

  const i = choisirIssue(issue(m), r.domicile.nom, r.exterieur.nom, fd, fe, r.cotes)
  const b = choisirButs(m, r.domicile.matchs, r.exterieur.matchs, r.cotes)
  const bo = choisirBonus(r.domicile.matchs, r.exterieur.matchs, ctx, r.cotes)
  const scores = choisirScores(m, r.cotes) // un seul : le score exact le plus probable

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
      stats: {
        domicile: statsEquipe(r.domicile.matchs),
        exterieur: statsEquipe(r.exterieur.matchs),
        buts_attendus: { domicile: Math.round(lh * 100) / 100, exterieur: Math.round(la * 100) / 100 },
        moyenne_ligue: moyenneLigue(ctx),
      },
    },
    interne: {
      issue: i.cle,
      buts: b.cle,
      bonus: bo ? { categorie: bo.categorie, ligne: bo.ligne } : null,
      scores: scores.map(s => s.score),
    },
  }
}
