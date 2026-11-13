import { useState } from 'react'
import type { CSSProperties } from 'react'
import { provider } from '../data'
import type { Prediction } from '../domain/contracts'
import { DateRail } from '../components/DateRail'
import { FeaturedMatch } from '../components/FeaturedMatch'
import { FiltrePiliers, MatchRow } from '../components/MatchRow'
import type { Filtre } from '../components/MatchRow'
import { PageHeader } from '../components/PageHeader'
import { FeaturedSkeleton, ListSkeleton } from '../components/Skeletons'
import { Chip, Disclaimer, ErrorState, SectionTitle } from '../components/ui'
import { useDay } from '../lib/day'
import { jourLongLabel, quandLabel, todayISO } from '../lib/format'
import { filtrer, lesPlusSurs, parCompetition, vedette } from '../lib/matchs'
import { Link, useRouter } from '../lib/router'
import { useAsync } from '../lib/useAsync'

function TreveInternationale({ onSelectDate }: { onSelectDate: (date: string) => void }) {
  const { navigate } = useRouter()
  return (
    <div className="card state" style={{ padding: '28px 20px', textAlign: 'center' }}>
      <span className="state-icon" aria-hidden="true" style={{ fontSize: 32 }}>🌍</span>
      <h2 style={{ fontSize: '1.25rem', marginTop: 12, marginBottom: 8 }}>Trêve internationale FIFA en cours</h2>
      <p style={{ color: 'var(--c-muted)', maxWidth: 540, margin: '0 auto 20px', lineHeight: 1.5 }}>
        Les championnats européens (Ligue 1, Premier League, La Liga, Serie A, Bundesliga) sont actuellement en pause pour les rencontres des sélections nationales.
        La reprise des championnats est programmée le <strong>vendredi 20 novembre 2026</strong>.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-primary" onClick={() => onSelectDate('2026-11-20')}>
          Voir la reprise du 20 novembre
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/actualites')}>
          Lire les actualités foot en direct
        </button>
      </div>
    </div>
  )
}

function HomeNewsSection() {
  const { navigate } = useRouter()
  const [etat] = useAsync(() => provider.getNews(), [])
  const articles = etat.status === 'ready' ? etat.data.slice(0, 3) : []

  if (etat.status === 'loading') {
    return (
      <section className="card state" aria-label="Chargement des actualités" style={{ marginTop: 24 }}>
        <p className="muted">Chargement des dépêches foot en direct...</p>
      </section>
    )
  }

  if (articles.length === 0) return null

  return (
    <section aria-labelledby="actus-home-titre" style={{ marginTop: 28 }}>
      <SectionTitle
        id="actus-home-titre"
        aside={
          <button type="button" className="text-link" onClick={() => navigate('/actualites')}>
            Voir toutes les actus ({etat.status === 'ready' ? etat.data.length : ''})
          </button>
        }
      >
        Actualités en direct (L'Équipe & RMC)
      </SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {articles.map(art => (
          <a
            key={art.id}
            href={art.url}
            target="_blank"
            rel="noreferrer"
            className="card press"
            style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, textDecoration: 'none', color: 'inherit' }}
          >
            {art.image_url && (
              <div style={{ width: '100%', height: 160, overflow: 'hidden', backgroundColor: 'var(--c-surface-sunken)' }}>
                <img src={art.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              </div>
            )}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: '0.8rem', color: 'var(--c-muted)' }}>
                <Chip ton="ac">{art.source}</Chip>
                <span>{new Date(art.publie_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.35, marginBottom: 8 }}>{art.titre}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--c-muted)', lineHeight: 1.4, margin: 0, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {art.resume}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

function HomeNewsSidebar() {
  const { navigate } = useRouter()
  const [etat] = useAsync(() => provider.getNews(), [])
  const articles = etat.status === 'ready' ? etat.data.slice(0, 4) : []
  if (articles.length === 0) return null

  return (
    <section className="card side-card rise" aria-labelledby="actus-side-titre">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 id="actus-side-titre" style={{ margin: 0, fontSize: '1rem' }}>Actualités chaudes</h2>
        <button type="button" className="text-link" onClick={() => navigate('/actualites')}>
          Tout voir
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {articles.map(art => (
          <a key={art.id} href={art.url} target="_blank" rel="noreferrer" className="press" style={{ display: 'flex', gap: 10, textDecoration: 'none', color: 'inherit', alignItems: 'flex-start' }}>
            {art.image_url ? (
              <img src={art.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} loading="lazy" />
            ) : null}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--c-primary)', fontWeight: 600 }}>{art.source}</div>
              <strong style={{ fontSize: '0.825rem', lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {art.titre}
              </strong>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

function PlusSurs({ fiches }: { fiches: Prediction[] }) {
  const liste = lesPlusSurs(fiches)
  if (liste.length === 0) return null
  return (
    <section className="card side-card rise" style={{ '--i': 2 } as CSSProperties} aria-labelledby="surs">
      <h2 id="surs">Les plus sûrs du jour</h2>
      <p className="muted small">Pronostics « buts » les plus solides</p>
      <div className="surs-list">
        {liste.map(f => (
          <Link key={f.match_id} to={'/match/' + f.match_id} className="surs-row press">
            <span>
              <strong>
                {f.equipes.domicile} — {f.equipes.exterieur}
              </strong>
              <span className="muted small">{f.pronostics?.buts.selection}</span>
            </span>
            <Chip ton="ac">{f.pronostics?.buts.court ?? f.pronostics?.buts.selection}</Chip>
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
  const [intention] = useState(() => window.localStorage.getItem('apex:intention') ?? 'comprendre')
  const sousTitre = intention === 'signaux'
    ? 'Les signaux les plus solides, expliqués simplement.'
    : intention === 'suivre'
      ? 'Retrouvez les matchs importants pour vous, jour après jour.'
      : intention === 'evaluer'
        ? 'Suivez ce que les pronostics ont réellement donné.'
        : jourLongLabel(jour)

  const estAujourdhui = jour === todayISO()
  const fiches = etat.status === 'ready' ? etat.data : []
  const vedetteFiche = vedette(fiches)
  const liste = filtrer(fiches, filtre)

  return (
    <div className="page-body">
      <PageHeader titre={estAujourdhui ? "Aujourd'hui" : quandLabel(jour)} sous={sousTitre} />
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
            <>
              <TreveInternationale onSelectDate={setJour} />
              <HomeNewsSection />
            </>
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

              <HomeNewsSection />
            </>
          )}
        </div>

        <aside className="stack" aria-label="À savoir">
          {etat.status === 'ready' && fiches.length > 0 && <PlusSurs fiches={fiches} />}
          <HomeNewsSidebar />
        </aside>
      </div>

      <Disclaimer />
    </div>
  )
}
