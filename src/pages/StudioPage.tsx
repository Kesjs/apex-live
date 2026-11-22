import { useEffect, useMemo, useState } from 'react'
import { provider } from '../data'
import { useDay } from '../lib/day'
import { buildThreeCoupons, buildTikTokCaption, renderPosterToDataUrl } from '../lib/studio-posters'
import { useAsync } from '../lib/useAsync'
import { DateRail } from '../components/DateRail'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/ui'
import './StudioPage.css'

export default function StudioPage() {
  const { jour, setJour } = useDay()
  const [countPerPoster, setCountPerPoster] = useState<4 | 5>(4)
  const [seed, setSeed] = useState(0)
  const [posters, setPosters] = useState<Record<string, string>>({})
  const [captionCopied, setCaptionCopied] = useState(false)

  const [etat] = useAsync(() => provider.listMatches(jour), [jour])
  const matchs = useMemo(() => (etat.status === 'ready' ? etat.data : []), [etat])
  const coupons = useMemo(() => buildThreeCoupons(matchs, countPerPoster, seed), [matchs, countPerPoster, seed])

  const dateLabel = useMemo(() => {
    const d = new Date(`${jour}T12:00:00`)
    return Number.isNaN(d.getTime())
      ? jour
      : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  }, [jour])

  useEffect(() => {
    document.title = 'Studio Affiches · Apex'
  }, [])

  useEffect(() => {
    let cancelled = false
    if (matchs.length === 0) {
      setPosters({})
      return
    }
    void Promise.all(
      coupons.map(async c => [c.theme, await renderPosterToDataUrl(c, dateLabel)] as const),
    ).then(entries => {
      if (!cancelled) setPosters(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [coupons, dateLabel, matchs.length])

  const downloadPng = (theme: string, title: string) => {
    const url = posters[theme]
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `apex-${jour}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`
    a.click()
  }

  const copyCaption = async () => {
    try {
      await navigator.clipboard?.writeText(buildTikTokCaption(coupons, dateLabel))
      setCaptionCopied(true)
      window.setTimeout(() => setCaptionCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  const uniqueUsed = new Set(coupons.flatMap(c => c.picks.map(p => p.match.match_id))).size

  return (
    <div className="page-body studio-page">
      <PageHeader
        titre="Studio Affiches TikTok"
        sous="3 combinés distincts (1080×1920 PNG) parmi les matchs les plus abordables."
      />
      <DateRail jour={jour} onChange={setJour} />

      <section className="card studio-toolbar">
        <div className="studio-toolbar__group">
          <span className="muted small">Matchs par affiche :</span>
          <div className="studio-seg">
            <button type="button" aria-pressed={countPerPoster === 4} onClick={() => setCountPerPoster(4)}>
              4 matchs
            </button>
            <button type="button" aria-pressed={countPerPoster === 5} onClick={() => setCountPerPoster(5)}>
              5 matchs
            </button>
          </div>
          {matchs.length > 0 && (
            <span className="muted small">
              {uniqueUsed} matchs uniques utilisés sur {matchs.filter(m => m.pronostics).length} éligibles
            </span>
          )}
        </div>

        <div className="studio-toolbar__actions">
          <button type="button" className="btn btn-secondary" onClick={() => setSeed(s => s + 1)}>
            <Icon name="refresh" size={16} />
            Mélanger
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void copyCaption()}>
            <Icon name={captionCopied ? 'check' : 'copy'} size={16} />
            {captionCopied ? 'Légende copiée' : 'Copier légende TikTok'}
          </button>
        </div>
      </section>

      {etat.status === 'loading' && (
        <section className="card state">
          <h2>Chargement des matchs…</h2>
          <p>Préparation des 3 affiches du {dateLabel}.</p>
        </section>
      )}

      {etat.status === 'ready' && coupons.every(c => c.picks.length === 0) && (
        <EmptyState
          titre="Aucun match avec pronostic ce jour"
          texte="Sélectionnez une autre journée dans la barre de dates ci-dessus pour générer vos 3 affiches."
        />
      )}

      {etat.status === 'ready' && coupons.some(c => c.picks.length > 0) && (
        <div className="studio-grid">
          {coupons.map(c => (
            <article key={c.theme} className="card studio-card">
              <div className="studio-card__head">
                <div>
                  <h2>{c.title}</h2>
                  <p className="muted small">{c.picks.length} sélections · zéro doublon prioritaire</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!posters[c.theme]}
                  onClick={() => downloadPng(c.theme, c.title)}
                >
                  Télécharger PNG
                </button>
              </div>
              {posters[c.theme] ? (
                <img
                  className="studio-poster-preview"
                  src={posters[c.theme]}
                  alt={`Affiche ${c.title}`}
                />
              ) : (
                <div className="studio-poster-loading">Rendu HD en cours…</div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
