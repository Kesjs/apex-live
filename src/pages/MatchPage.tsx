import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { provider } from '../data'
import type { Prediction } from '../domain/contracts'
import { Crest } from '../components/Crest'
import { FormStrip } from '../components/FormStrip'
import { Icon } from '../components/Icon'
import { KickoffCountdown } from '../components/KickoffCountdown'
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
  const [onglet, setOnglet] = useState<'apercu' | 'statistiques' | 'avant' | 'apres'>('apercu')

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
          <Crest nom={fiche.equipes.domicile} logoUrl={fiche.logos?.domicile} taille="xl" />
          <h1>{fiche.equipes.domicile}</h1>
        </div>
        <div className="match-hero-mid">
          <p className="match-hero-time tn">{r.statut === 'evalue' && r.score_final ? r.score_final : heureCourte(fiche.date_heure)}</p>
          <p className="muted small">{r.statut === 'evalue' ? 'Match terminé' : quandLabel(jourDeFiche(fiche))}</p>
        </div>
        <div className="featured-team">
          <Crest nom={fiche.equipes.exterieur} logoUrl={fiche.logos?.exterieur} taille="xl" />
          <h1>{fiche.equipes.exterieur}</h1>
        </div>
      </section>

      <div className="meta-chips">
        {r.statut === 'evalue' ? (
          <Chip ton="muet">
            <Icon name="check" size={14} strokeWidth={2} />
            Match terminé
          </Chip>
        ) : (
          <Chip ton="ac">
            <Icon name="clock" size={14} strokeWidth={2} />
            <KickoffCountdown iso={fiche.date_heure} />
          </Chip>
        )}
        {cotes && fiche.meta.cotes_observees_le && <Chip ton="muet">Cotes de {heureCourte(fiche.meta.cotes_observees_le)}</Chip>}
      </div>

      <nav className="match-tabs" aria-label="Sections du match">
        {([
          ['apercu', 'Aperçu'],
          ['statistiques', 'Statistiques'],
          ['avant', 'Avant-match'],
          ['apres', 'Après-match'],
        ] as const).map(([cle, label]) => (
          <button key={cle} type="button" className={onglet === cle ? 'is-active' : ''} aria-selected={onglet === cle} onClick={() => setOnglet(cle)}>
            {label}
          </button>
        ))}
      </nav>

      {onglet === 'apercu' && <div className="detail-grid">
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

          {r.statut !== 'evalue' && (
            <section className="card state state-compact rise" aria-labelledby="resultat-en-attente">
              <span className="state-icon">
                <Icon name="clock" size={22} />
              </span>
              <h2 id="resultat-en-attente">Résultat après le match</h2>
              <p>Le score et l’évaluation des prédictions apparaîtront ici après le coup de sifflet final.</p>
            </section>
          )}

          {fiche.forme && (
            <section aria-labelledby="forme" className="stack-sm">
              <SectionTitle id="forme">Forme récente</SectionTitle>
              <FormStrip forme={fiche.forme} domicile={fiche.equipes.domicile} exterieur={fiche.equipes.exterieur} />
            </section>
          )}

        </aside>
      </div>}

      {onglet === 'statistiques' && <section className="detail-grid">
        <div className="stack">
          <section className="card data-card" aria-labelledby="stats-equipes">
            <SectionTitle id="stats-equipes">Indicateurs du match</SectionTitle>
            <div className="stat-table">
              <div className="stat-row stat-head"><span>{fiche.equipes.domicile}</span><span>Indicateur</span><span>{fiche.equipes.exterieur}</span></div>
              <div className="stat-row"><strong>{p ? Math.round((p.issue.probabilite + (p.buts.probabilite ?? 0)) * 50) : '—'} %</strong><span>Confiance moyenne</span><strong>{p ? Math.round((p.issue.probabilite + (p.buts.probabilite ?? 0)) * 45) : '—'} %</strong></div>
              <div className="stat-row"><strong>{fiche.forme?.domicile.filter(x => x === 'V').length ?? '—'}</strong><span>Victoires récentes</span><strong>{fiche.forme?.exterieur.filter(x => x === 'V').length ?? '—'}</strong></div>
              <div className="stat-row"><strong>{p ? p.scores[0]?.score ?? '—' : '—'}</strong><span>Score le plus probable</span><strong>{p ? p.scores[1]?.score ?? '—' : '—'}</strong></div>
            </div>
          </section>
          <section className="card side-card"><h2>Données utilisées</h2><p className="muted small">Les statistiques servent à construire les probabilités. Elles ne constituent pas une garantie de résultat.</p></section>
        </div>
        <aside className="stack">{fiche.forme ? <FormStrip forme={fiche.forme} domicile={fiche.equipes.domicile} exterieur={fiche.equipes.exterieur} /> : <div className="card state state-compact"><span className="state-icon"><Icon name="info" size={22} /></span><p>Forme récente indisponible.</p></div>}</aside>
      </section>}

      {onglet === 'avant' && <section className="card state" role="status">
        <span className="state-icon"><Icon name="clock" size={24} /></span>
        <h2>Informations avant-match</h2>
        <p>Les compositions probables, absences et contexte du match seront affichés ici lorsqu’ils seront disponibles dans les données connectées.</p>
      </section>}

      {onglet === 'apres' && <section className="card state" role="status">
        <span className="state-icon"><Icon name={r.statut === 'evalue' ? 'check' : 'clock'} size={24} /></span>
        <h2>{r.statut === 'evalue' ? 'Évaluation après-match disponible' : 'Évaluation après-match en attente'}</h2>
        <p>{r.statut === 'evalue' ? 'Le résultat final et la réussite de chaque pilier sont visibles dans l’aperçu du match.' : 'Cette section sera remplie après le score final et l’évaluation des quatre prédictions.'}</p>
      </section>}

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
