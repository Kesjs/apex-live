import type { Prediction } from '../domain/contracts'
import { heureCourte, jourDeFiche, pct, quandLabel } from '../lib/format'
import { matchStatus } from '../lib/match-status'
import { Link } from '../lib/router'
import { Crest } from './Crest'
import { Icon } from './Icon'

/** Match vedette (Option B) : carte Hero sombre vert forêt avec probabilités en clair. */
export function FeaturedMatch({ fiche }: { fiche: Prediction }) {
  const p = fiche.pronostics
  if (!p) return null
  const status = matchStatus(fiche)

  return (
    <div className="card featured featured-hero rise">
      <svg className="featured-deco" viewBox="0 0 260 260" fill="none" aria-hidden="true">
        <circle cx="130" cy="130" r="120" />
        <circle cx="130" cy="130" r="60" />
        <path d="M130 10v240" />
      </svg>

      <div className="featured-top">
        <span className="featured-league-pill">{fiche.competition}</span>
        <span className="tn featured-when">
          {quandLabel(jourDeFiche(fiche))} · {heureCourte(fiche.date_heure)}
        </span>
      </div>

      <div className="featured-teams">
        <div className="featured-team">
          <Crest nom={fiche.equipes.domicile} logoUrl={fiche.logos?.domicile} taille="xl" />
          <strong>{fiche.equipes.domicile}</strong>
        </div>
        <div className="featured-center">
          {(status.final || status.live) && status.score ? (
            <>
              <span className="featured-hero-score tn">{status.score}</span>
              <span className="featured-status-pill">{status.label}</span>
            </>
          ) : (
            <span className="featured-vs-pill">VS</span>
          )}
        </div>
        <div className="featured-team">
          <Crest nom={fiche.equipes.exterieur} logoUrl={fiche.logos?.exterieur} taille="xl" />
          <strong>{fiche.equipes.exterieur}</strong>
        </div>
      </div>

      <div className="featured-metrics">
        <div className="featured-metric">
          <span className="featured-metric-label">Issue</span>
          <strong className="featured-metric-val tn">
            {p.issue.court ?? p.issue.selection} <em>{pct(p.issue.probabilite)}</em>
          </strong>
        </div>
        <div className="featured-metric">
          <span className="featured-metric-label">Buts</span>
          <strong className="featured-metric-val tn">
            {p.buts.court ?? p.buts.selection} <em>{pct(p.buts.probabilite)}</em>
          </strong>
        </div>
        <div className="featured-metric">
          <span className="featured-metric-label">Score</span>
          <strong className="featured-metric-val tn">{p.scores[0]?.score ?? '–'}</strong>
        </div>
      </div>

      <Link to={'/match/' + fiche.match_id} className="btn featured-cta featured-hero-cta">
        Voir le détail et la synthèse
        <Icon name="arrow" size={18} strokeWidth={2} />
      </Link>
    </div>
  )
}
