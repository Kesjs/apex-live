import { useState } from 'react'
import type { CSSProperties } from 'react'
import { provider } from '../data'
import type { Prediction } from '../domain/contracts'
import { DateRail } from '../components/DateRail'
import { FeaturedMatch } from '../components/FeaturedMatch'
import { Icon } from '../components/Icon'
import { FiltrePiliers, MatchRow } from '../components/MatchRow'
import type { Filtre } from '../components/MatchRow'
import { PageHeader } from '../components/PageHeader'
import { FeaturedSkeleton, ListSkeleton } from '../components/Skeletons'
import { Disclaimer, EmptyState, ErrorState, SectionTitle } from '../components/ui'
import { useDay } from '../lib/day'
import { jourLongLabel, pct, quandLabel, todayISO } from '../lib/format'
import { filtrer, lesPlusSurs, parCompetition, vedette } from '../lib/matchs'
import { Link, useRouter } from '../lib/router'
import { useAsync } from '../lib/useAsync'

function PlusSurs({ fiches }: { fiches: Prediction[] }) {
  const liste = lesPlusSurs(fiches)
  if (liste.length === 0) return null
  return (
    <section className="card side-card rise" style={{ '--i': 2 } as CSSProperties} aria-labelledby="surs">
      <h2 id="surs">Les plus sûrs du jour</h2>
      <p className="muted small">Pronostics « buts » à la probabilité la plus élevée</p>
      <div className="surs-list">
        {liste.map(f => (
          <Link key={f.match_id} to={'/match/' + f.match_id} className="surs-row press">
            <span>
              <strong>
                {f.equipes.domicile} — {f.equipes.exterieur}
              </strong>
              <span className="muted small">{f.pronostics?.buts.selection}</span>
            </span>
            <span className="tn accent surs-pct">{pct(f.pronostics?.buts.probabilite ?? 0)}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  const { jour, setJour } = useDay()
  const { navigate } = useRouter()
  const [etat, reessayer] = useAsync(() => provider.listMatches(jour), [jour])
  const [filtre, setFiltre] = useState<Filtre>('tous')

  const estAujourdhui = jour === todayISO()
  const fiches = etat.status === 'ready' ? etat.data : []
  const vedetteFiche = vedette(fiches)
  const liste = filtrer(fiches, filtre)

  return (
    <div className="page-body">
      <PageHeader titre={estAujourdhui ? "Aujourd'hui" : quandLabel(jour)} sous={jourLongLabel(jour)} />
      <DateRail jour={jour} onChange={setJour} />

      <div className="home-grid">
        <div className="stack">
          {etat.status === 'loading' && (
            <>
              <section aria-label="Chargement du match vedette">
                <FeaturedSkeleton />
              </section>
              <section aria-label="Chargement des matchs">
                <ListSkeleton />
              </section>
            </>
          )}

          {etat.status === 'error' && <ErrorState message={etat.error.message} onRetry={reessayer} />}

          {etat.status === 'ready' && fiches.length === 0 && (
            <EmptyState
              titre="Aucun match ce jour-là"
              texte="Aucune rencontre n'est analysée pour cette journée."
            />
          )}

          {etat.status === 'ready' && fiches.length > 0 && (
            <>
              {vedetteFiche && (
                <section aria-labelledby="vedette">
                  <SectionTitle id="vedette">Match vedette</SectionTitle>
                  <FeaturedMatch fiche={vedetteFiche} />
                </section>
              )}

              <section aria-labelledby="jour-titre">
                <SectionTitle
                  id="jour-titre"
                  aside={
                    <button type="button" className="text-link" onClick={() => navigate('/matchs')}>
                      Voir tout
                    </button>
                  }
                >
                  Matchs du jour
                </SectionTitle>
                <FiltrePiliers valeur={filtre} onChange={setFiltre} />

                {liste.length === 0 && <p className="muted empty-filter">Aucun match n'a de pronostic de ce type aujourd'hui.</p>}

                {filtre === 'tous' &&
                  parCompetition(liste).map(([competition, groupe]) => (
                    <div key={competition} className="league">
                      <p className="kicker">{competition}</p>
                      <div className="card list">
                        {groupe.map((f, i) => (
                          <MatchRow key={f.match_id} fiche={f} index={i} />
                        ))}
                      </div>
                    </div>
                  ))}

                {filtre !== 'tous' && liste.length > 0 && (
                  <div className="card list league">
                    {liste.map((f, i) => (
                      <MatchRow key={f.match_id} fiche={f} filtre={filtre} index={i} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <aside className="stack" aria-label="À savoir">
          {etat.status === 'ready' && <PlusSurs fiches={fiches} />}
        </aside>
      </div>

      <Disclaimer />
    </div>
  )
}
