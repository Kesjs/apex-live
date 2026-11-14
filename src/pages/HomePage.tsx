import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { provider } from '../data'
import type { Prediction } from '../domain/contracts'
import { DateRail } from '../components/DateRail'
import { FeaturedMatch } from '../components/FeaturedMatch'
import { Icon } from '../components/Icon'
import { FiltrePiliers, MatchRow } from '../components/MatchRow'
import type { Filtre } from '../components/MatchRow'
import { PageHeader } from '../components/PageHeader'
import { PartnerStrip } from '../components/PartnerStrip'
import { FeaturedSkeleton, ListSkeleton } from '../components/Skeletons'
import { Chip, Disclaimer, ErrorState, SectionTitle } from '../components/ui'
import { useAiChat } from '../lib/ai-chat'
import { useDay } from '../lib/day'
import { cote as formatCote, jourLongLabel, quandLabel, todayISO } from '../lib/format'
import { filtrer, lesPlusSurs, parCompetition, valueBets, vedette } from '../lib/matchs'
import { usePrefs } from '../lib/prefs'
import { Link, useRouter } from '../lib/router'
import { useAsync } from '../lib/useAsync'

function decalerIso(jour: string, jours: number): string {
  const [y, m, d] = jour.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + jours)).toISOString().slice(0, 10)
}

function NewsImage({ src, className, style }: { src?: string; className?: string; style?: CSSProperties }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) return null
  return <img src={src} alt="" className={className} style={style} loading="lazy" onError={() => setBroken(true)} />
}

function ProchaineJourneeBanner({ jour, onSelectDate }: { jour: string; onSelectDate: (date: string) => void }) {
  const { navigate } = useRouter()
  const [nextState] = useAsync(
    () => (provider.nextMatchday ? provider.nextMatchday(decalerIso(jour, 1)) : Promise.resolve({ date: null, matchs: [] })),
    [jour],
  )
  const nextDate = nextState.status === 'ready' ? nextState.data.date : null
  const nextCount = nextState.status === 'ready' ? nextState.data.matchs.length : 0

  return (
    <div className="card state" style={{ padding: '26px 20px', textAlign: 'center' }}>
      <span className="state-icon" aria-hidden="true">
        <Icon name="globe" size={26} />
      </span>
      <h2 style={{ fontSize: '1.2rem', marginTop: 10, marginBottom: 8 }}>Aucune affiche majeure programmée ce jour</h2>
      <p style={{ color: 'var(--mu)', maxWidth: 520, margin: '0 auto 18px', lineHeight: 1.5 }}>
        {nextDate
          ? `Prochaine journée active identifiée le ${jourLongLabel(nextDate)}${nextCount > 0 ? ` (${nextCount} rencontres analysées)` : ''}.`
          : 'Consultez les dernières dépêches football ou parcourez le calendrier ci-dessus.'}
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {nextDate && (
          <button type="button" className="btn btn-primary" onClick={() => onSelectDate(nextDate)}>
            Voir le {quandLabel(nextDate)}
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/actualites')}>
          Lire les actualités foot
        </button>
      </div>
    </div>
  )
}

function RadarValueBets({ fiches }: { fiches: Prediction[] }) {
  const { cotes } = usePrefs()
  const topValues = valueBets(fiches).slice(0, 3)
  if (!cotes || topValues.length === 0) return null

  return (
    <section aria-labelledby="radar-value-titre" className="stack-sm">
      <SectionTitle
        id="radar-value-titre"
        aside={
          <Link to="/matchs?filtre=value" className="text-link">
            Tout voir
          </Link>
        }
      >
        Radar Value Bets
      </SectionTitle>
      <div className="radar-list">
        {topValues.map(f => {
          const val = f.value!
          const pilier = val.pilier === 'buts' ? f.pronostics?.buts : f.pronostics?.issue
          return (
            <Link key={f.match_id} to={'/match/' + f.match_id} className="radar-item press">
              <span className="radar-item__main">
                <span className="radar-item__league">{f.competition}</span>
                <span className="radar-item__teams">
                  {f.equipes.domicile} · {f.equipes.exterieur}
                </span>
                {pilier && <span className="radar-item__pick">{pilier.selection}</span>}
              </span>
              <span className="radar-item__meta">
                {pilier?.cote !== undefined && <Chip>{formatCote(pilier.cote)}</Chip>}
                <Chip ton="ac">+{Math.round(val.ecart * 100)} % value</Chip>
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function HomeNewsSection() {
  const { navigate } = useRouter()
  const [etat] = useAsync(() => provider.getNews(), [])
  const articles = etat.status === 'ready' ? etat.data.slice(0, 3) : []

  if (etat.status === 'loading') {
    return (
      <section className="card state" aria-label="Chargement des actualités" style={{ marginTop: 24 }}>
        <p className="muted">Chargement des dépêches foot en direct…</p>
      </section>
    )
  }

  if (articles.length === 0) return null

  return (
    <section aria-labelledby="actus-home-titre" style={{ marginTop: 24 }}>
      <SectionTitle
        id="actus-home-titre"
        aside={
          <button type="button" className="text-link" onClick={() => navigate('/actualites')}>
            Voir toutes les actus ({etat.status === 'ready' ? etat.data.length : ''})
          </button>
        }
      >
        Actualités football en direct
      </SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
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
              <div style={{ width: '100%', height: 152, overflow: 'hidden', backgroundColor: 'var(--s2)' }}>
                <NewsImage src={art.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: '0.8rem', color: 'var(--mu)' }}>
                <Chip ton="ac">{art.source}</Chip>
                <span>{new Date(art.publie_le).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
              </div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 600, lineHeight: 1.35, marginBottom: 8 }}>{art.titre}</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--mu)', lineHeight: 1.45, maxWidth: '64ch', margin: 0, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
            {art.image_url && (
              <NewsImage src={art.image_url} style={{ width: 54, height: 54, borderRadius: 8, objectFit: 'cover', flexShrink: 0, backgroundColor: 'var(--s2)' }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--ac)', fontWeight: 700 }}>{art.source}</div>
              <strong style={{ fontSize: '0.825rem', lineHeight: 1.28, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
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
                {f.equipes.domicile} · {f.equipes.exterieur}
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
  const { setScreenContext } = useAiChat()
  const [etat, reessayer] = useAsync(() => provider.listMatches(jour), [jour])
  const [newsEtat] = useAsync(() => provider.getNews(), [])
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const [intention] = useState(() => {
    try { return window.localStorage.getItem('apex:intention') ?? 'comprendre' } catch { return 'comprendre' }
  })

  const sousTitre = intention === 'signaux'
    ? 'Signaux les plus solides & Value Bets détectés · ' + jourLongLabel(jour)
    : intention === 'suivre'
      ? 'Vos affiches clés · ' + jourLongLabel(jour)
      : intention === 'evaluer'
        ? 'Suivi transparent des pronostics · ' + jourLongLabel(jour)
        : jourLongLabel(jour)

  const estAujourdhui = jour === todayISO()
  const fiches = etat.status === 'ready' ? etat.data : []
  const vedetteFiche = vedette(fiches)
  const liste = filtrer(fiches, filtre)

  useEffect(() => {
    const vals = valueBets(fiches).slice(0, 4).map(f => ({
      match: `${f.equipes.domicile} vs ${f.equipes.exterieur}`,
      competition: f.competition,
      choix: f.value?.pilier === 'buts' ? (f.pronostics?.buts.selection ?? '') : (f.pronostics?.issue.selection ?? ''),
      avantagePct: Math.round((f.value?.ecart ?? 0) * 100),
      cote: f.value?.pilier === 'buts' ? f.pronostics?.buts.cote : f.pronostics?.issue.cote,
    }))
    const topMatches = fiches.slice(0, 5).map(f => ({
      match: `${f.equipes.domicile} vs ${f.equipes.exterieur}`,
      competition: f.competition,
      issue: f.pronostics?.issue.selection ?? 'En attente',
      probaPct: Math.round((f.pronostics?.issue.probabilite ?? 0) * 100),
      cote: f.pronostics?.issue.cote,
    }))
    const headlines = newsEtat.status === 'ready' ? newsEtat.data.slice(0, 4).map(a => `${a.source} : ${a.titre}`) : []
    setScreenContext({
      route: '/',
      pageTitle: estAujourdhui ? 'Accueil · Aujourd’hui' : `Accueil · ${quandLabel(jour)}`,
      valueBets: vals,
      topMatches,
      headlines,
    })
  }, [fiches, newsEtat, estAujourdhui, jour, setScreenContext])

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
              <ProchaineJourneeBanner jour={jour} onSelectDate={setJour} />
              <HomeNewsSection />
            </>
          )}

          {etat.status === 'ready' && fiches.length > 0 && (
            <>
              <RadarValueBets fiches={fiches} />

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
          {intention === 'evaluer' && (
            <section className="card side-card rise" aria-labelledby="suivi-eval">
              <h2 id="suivi-eval">Suivi de précision</h2>
              <p className="muted small">Comparez nos probabilités aux scores finaux dans le journal rétro-calculé.</p>
              <Link to="/historique" className="btn btn-secondary" style={{ marginTop: 10 }}>
                Voir l’historique complet
              </Link>
            </section>
          )}
          <HomeNewsSidebar />
          <PartnerStrip variant="banner" />
        </aside>
      </div>

      <Disclaimer />
    </div>
  )
}
