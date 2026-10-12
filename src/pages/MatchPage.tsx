import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import { provider } from '../data'
import type { Prediction } from '../domain/contracts'
import { Crest } from '../components/Crest'
import { FormStrip } from '../components/FormStrip'
import { Icon } from '../components/Icon'
import { BonusCard, ButsCard, IssueCard, ScoresCard } from '../components/PillarCards'
import { ResultMark } from '../components/ResultMark'
import { DetailSkeleton } from '../components/Skeletons'
import { Chip, Disclaimer, EmptyState, ErrorState, SectionTitle } from '../components/ui'
import { useFavoris } from '../lib/favoris'
import { heureCourte, jourDeFiche, quandLabel } from '../lib/format'
import { Link, useRouter } from '../lib/router'
import { usePrefs } from '../lib/prefs'
import { useAsync } from '../lib/useAsync'

function Fiche({ fiche, retour }: { fiche: Prediction; retour: string }) {
  const { estFavori, basculer } = useFavoris()
  const { cotes } = usePrefs()
  const favori = estFavori(fiche.match_id)
  const p = fiche.pronostics
  const r = fiche.resultat

  useEffect(() => {
    document.title = fiche.equipes.domicile + ' – ' + fiche.equipes.exterieur + ' · Apex'
  }, [fiche])

  return (
    <div className="page-body">
      <div className="topbar">
        <Link to={retour} className="icon-btn" aria-label="Retour">
          <Icon name="back" size={20} strokeWidth={2} />
        </Link>
        <Chip>{fiche.competition}</Chip>
        <button
          type="button"
          className={'icon-btn' + (favori ? ' is-on' : '')}
          aria-pressed={favori}
          aria-label={favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          onClick={() => basculer(fiche)}
        >
          <Icon name="star" size={20} filled={favori} />
        </button>
      </div>

      <section className="match-hero" aria-label="Match">
        <div className="featured-team">
          <Crest nom={fiche.equipes.domicile} taille="xl" />
          <h1>{fiche.equipes.domicile}</h1>
        </div>
        <div className="match-hero-mid">
          <p className="match-hero-time tn">{heureCourte(fiche.date_heure)}</p>
          <p className="muted small">{quandLabel(jourDeFiche(fiche))}</p>
        </div>
        <div className="featured-team">
          <Crest nom={fiche.equipes.exterieur} taille="xl" />
          <h1>{fiche.equipes.exterieur}</h1>
        </div>
      </section>

      <div className="meta-chips">
        <Chip ton="muet">
          <Icon name="clock" size={14} strokeWidth={2} />
          Calculé à {heureCourte(fiche.meta.genere_le)}
        </Chip>
        {cotes && fiche.meta.cotes_observees_le && <Chip ton="muet">Cotes de {heureCourte(fiche.meta.cotes_observees_le)}</Chip>}
      </div>

      <div className="detail-grid">
        <div className="stack">
          {fiche.synthese && (
            <section className="card synthese rise" aria-labelledby="synthese">
              <div className="synthese-head">
                <Icon name="sparkle" size={18} />
                <h2 id="synthese">Synthèse Apex</h2>
              </div>
              <p>{fiche.synthese}</p>
            </section>
          )}

          {!p && (
            <section className="card state" role="status">
              <span className="state-icon">
                <Icon name="info" size={24} />
              </span>
              <h2>Pas de pronostic pour ce match</h2>
              <p>{fiche.raison_absence ?? 'Les données disponibles ne permettent pas de proposer un pronostic fiable.'}</p>
            </section>
          )}

          {p && (
            <section aria-labelledby="piliers" className="stack">
              <SectionTitle id="piliers" aside={<span className="muted small">Du plus sûr au plus risqué</span>}>
                Les 4 pronostics
              </SectionTitle>
              <IssueCard p={p.issue} valeur={fiche.value} delai={1} />
              <ButsCard p={p.buts} valeur={fiche.value} delai={2} />
              <BonusCard p={p.bonus} delai={3} />
              <ScoresCard scores={p.scores} delai={4} />
            </section>
          )}
        </div>

        <aside className="stack" aria-label="Contexte">
          {r.statut === 'evalue' && (
            <section className="card side-card rise" aria-labelledby="resultat">
              <h2 id="resultat">Résultat du match</h2>
              {r.score_final && <p className="final-score tn">{r.score_final}</p>}
              <div className="rmarks">
                <ResultMark label="Issue" valeur={r.issue} />
                <ResultMark label="Buts" valeur={r.buts} />
                <ResultMark label="Bonus" valeur={r.bonus} />
                <ResultMark label="Score" valeur={r.score} />
              </div>
            </section>
          )}

          {fiche.forme && (
            <section aria-labelledby="forme" className="stack-sm">
              <SectionTitle id="forme">Forme récente</SectionTitle>
              <FormStrip forme={fiche.forme} domicile={fiche.equipes.domicile} exterieur={fiche.equipes.exterieur} />
            </section>
          )}

          <details className="card details">
            <summary>
              Sources et fraîcheur
              <Icon name="down" size={18} strokeWidth={2} />
            </summary>
            <dl className="dl">
              <div>
                <dt>Statistiques</dt>
                <dd>{fiche.meta.source_stats}</dd>
              </div>
              <div>
                <dt>Cotes</dt>
                <dd>{fiche.meta.source_cotes}</dd>
              </div>
              <div>
                <dt>Moteur</dt>
                <dd className="tn">Version {fiche.meta.version_moteur}</dd>
              </div>
            </dl>
          </details>
        </aside>
      </div>

      <p className="muted small center">Les pourcentages sont des estimations statistiques, pas des certitudes.</p>
      <Disclaimer />
    </div>
  )
}

export default function MatchPage({ matchId }: { matchId: string }) {
  const { precedent } = useRouter()
  const [etat, reessayer] = useAsync(() => provider.getMatch(matchId), [matchId])
  const retour = precedent && precedent !== '/reglages' ? precedent : '/'

  if (etat.status === 'loading') {
    return (
      <div className="page-body">
        <div className="topbar">
          <Link to={retour} className="icon-btn" aria-label="Retour">
            <Icon name="back" size={20} strokeWidth={2} />
          </Link>
        </div>
        <div style={{ '--i': 0 } as CSSProperties}>
          <DetailSkeleton />
        </div>
      </div>
    )
  }
  if (etat.status === 'error') {
    return (
      <div className="page-body">
        <ErrorState message={etat.error.message} onRetry={reessayer} />
      </div>
    )
  }
  if (etat.data === null) {
    return (
      <div className="page-body">
        <EmptyState
          titre="Match introuvable"
          texte="Ce match n'existe pas ou n'est plus disponible."
          action={
            <Link to="/matchs" className="btn btn-secondary">
              Voir les matchs
            </Link>
          }
        />
      </div>
    )
  }
  return <Fiche fiche={etat.data} retour={retour} />
}
