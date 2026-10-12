import type { Prediction } from '../domain/contracts'
import { heureCourte, quandLabel, jourDeFiche } from '../lib/format'
import { Link } from '../lib/router'
import { Crest } from './Crest'
import { Icon } from './Icon'
import { Chip, Compteur, Cote, ProbBar } from './ui'

/** Match vedette : les 4 pronostics en un coup d'œil. */
export function FeaturedMatch({ fiche }: { fiche: Prediction }) {
  const p = fiche.pronostics
  if (!p) return null
  return (
    <div className="card featured rise">
      <svg className="featured-deco" viewBox="0 0 260 260" fill="none" aria-hidden="true">
        <circle cx="130" cy="130" r="120" />
        <circle cx="130" cy="130" r="60" />
        <path d="M130 10v240" />
      </svg>

      <div className="featured-top">
        <Chip>{fiche.competition}</Chip>
        <span className="tn featured-when">
          {quandLabel(jourDeFiche(fiche))} · {heureCourte(fiche.date_heure)}
        </span>
      </div>

      <div className="featured-teams">
        <div className="featured-team">
          <Crest nom={fiche.equipes.domicile} taille="xl" />
          <strong>{fiche.equipes.domicile}</strong>
        </div>
        <span className="featured-vs">VS</span>
        <div className="featured-team">
          <Crest nom={fiche.equipes.exterieur} taille="xl" />
          <strong>{fiche.equipes.exterieur}</strong>
        </div>
      </div>

      <div className="tiles">
        <div className="tile">
          <p className="kicker">1 · Issue</p>
          <p className="tile-value">{p.issue.court ?? p.issue.selection}</p>
          <ProbBar valeur={p.issue.probabilite} delai={200} />
          <p className="tile-foot">
            <span className="tn accent"><Compteur valeur={p.issue.probabilite} delai={200} /></span>
            <Cote valeur={p.issue.cote} mode="texte" />
          </p>
        </div>
        <div className="tile">
          <p className="kicker">2 · Buts</p>
          <p className="tile-value">{p.buts.court ?? p.buts.selection}</p>
          <ProbBar valeur={p.buts.probabilite} delai={300} />
          <p className="tile-foot">
            <span className="tn accent"><Compteur valeur={p.buts.probabilite} delai={200} /></span>
            <Cote valeur={p.buts.cote} mode="texte" />
          </p>
        </div>
        <div className="tile">
          <p className="kicker">3 · Bonus</p>
          <p className="tile-value">{p.bonus ? p.bonus.court ?? p.bonus.selection : 'Pas de bonus'}</p>
          <p className="tile-foot">
            {p.bonus ? (
              <>
                <Chip ton="am">Risque moyen</Chip>
                <Cote valeur={p.bonus.cote} mode="texte" />
              </>
            ) : (
              <span className="muted">Aucun signal assez net</span>
            )}
          </p>
        </div>
        <div className="tile">
          <p className="kicker">4 · Scores</p>
          <p className="tile-value tn">{p.scores.slice(0, 2).map(s => s.score).join(' · ')}</p>
          <p className="tile-foot">
            <Chip ton="am">Risque élevé</Chip>
          </p>
        </div>
      </div>

      <Link to={'/match/' + fiche.match_id} className="btn btn-primary featured-cta">
        Voir le détail et la synthèse
        <Icon name="arrow" size={20} strokeWidth={2} />
      </Link>
    </div>
  )
}
