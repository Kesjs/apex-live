import type { Prediction } from '../domain/contracts'
import { matchStatus } from '../lib/match-status'
import { SectionTitle } from './ui'

const dateMatch = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

/** Bloc éditorial de contexte en bas de fiche match (équivalent du bloc About). */
export function AProposMatch({ fiche }: { fiche: Prediction }) {
  const status = matchStatus(fiche)
  const { domicile, exterieur } = fiche.equipes
  const dateTexte = dateMatch(fiche.date_heure)

  const resumeResultat = status.final && status.score
    ? `La rencontre s’est terminée sur le score de ${status.score}.`
    : status.live && status.score
      ? `Le match est actuellement en cours (${status.score}).`
      : `Le coup d’envoi est prévu le ${dateTexte}.`

  const h2hTexte = fiche.h2h && fiche.h2h.total > 0
    ? ` Sur les ${fiche.h2h.total} dernières confrontations directes, ${domicile} compte ${fiche.h2h.victoires_domicile} victoire(s), ${exterieur} ${fiche.h2h.victoires_exterieur} et ${fiche.h2h.nuls} nul(s)${fiche.h2h.matchs[0] ? ` (dernier duel : ${fiche.h2h.matchs[0].score_domicile}-${fiche.h2h.matchs[0].score_exterieur})` : ''}.`
    : ''

  return (
    <section className="card match-about" aria-labelledby="apropos-match">
      <SectionTitle id="apropos-match">À propos du match</SectionTitle>
      <p className="muted">
        {domicile} affronte {exterieur} en {fiche.competition}. {resumeResultat}{h2hTexte}{' '}
        Retrouvez le détail des face-à-face dans l’onglet H2H, les indicateurs comparés ainsi que les probabilités d’avant-match calculées par Apex.
      </p>
    </section>
  )
}
