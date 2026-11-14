import { useEffect, useMemo, useState } from 'react'
import type { NewsArticle } from '../domain/contracts'
import { provider } from '../data'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { PartnerStrip } from '../components/PartnerStrip'
import { Chip, Disclaimer, EmptyState, ErrorState } from '../components/ui'
import { useAiChat } from '../lib/ai-chat'
import { useAsync } from '../lib/useAsync'

const FILTRES: Array<{ label: string; value?: NewsArticle['categorie'] }> = [
  { label: 'Toutes' },
  { label: 'Football', value: 'football' },
  { label: 'Champions League', value: 'champions-league' },
  { label: 'Europa League', value: 'europa-league' },
]

function temps(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function ArticleThumb({ src, size = 26 }: { src?: string; size?: number }) {
  const [broken, setBroken] = useState(false)
  if (src && !broken) {
    return <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} />
  }
  return <Icon name="ball" size={size} />
}

function ArticleCard({ article }: { article: NewsArticle }) {
  return (
    <a className="card news-card press" href={article.url} target="_blank" rel="noreferrer">
      <div className="news-thumb news-blue" aria-hidden="true">
        <ArticleThumb src={article.image_url} />
      </div>
      <div className="news-copy">
        <div className="news-meta">
          <span>{article.source}</span>
          <time dateTime={article.publie_le}>{temps(article.publie_le)}</time>
        </div>
        <h3>{article.titre}</h3>
        <p>{article.resume}</p>
      </div>
      <Icon name="chevron" size={17} className="news-go" />
    </a>
  )
}

export default function NewsPage() {
  const { setScreenContext } = useAiChat()
  const [filtre, setFiltre] = useState<{ label: string; value?: NewsArticle['categorie'] }>(FILTRES[0])
  const [etat, reessayer] = useAsync(() => provider.getNews(filtre.value), [filtre.value])
  const articles = useMemo(() => (etat.status === 'ready' ? etat.data : []), [etat])
  const vedette = articles[0]
  const promoBanner = (
    <PartnerStrip
      variant="banner"
      contextHint="Suivez l’actu foot en direct et activez votre code promo kenken sur 1xBet."
    />
  )

  useEffect(() => {
    setScreenContext({
      route: '/actualites',
      pageTitle: `Actualités · ${filtre.label}`,
      headlines: articles.slice(0, 6).map(a => `${a.source} : ${a.titre}`),
    })
  }, [articles, filtre.label, setScreenContext])

  return (
    <div className="page-body news-page">
      <PageHeader titre="Actualités" sous="Dépêches multi-sources (RMC Sport, Foot Mercato, So Foot, Franceinfo, L’Équipe & Europe)." />
      <div className="news-filters" role="group" aria-label="Filtrer les actualités">
        {FILTRES.map(option => (
          <button
            key={option.label}
            type="button"
            className={'filter-btn' + (filtre.label === option.label ? ' is-selected' : '')}
            aria-pressed={filtre.label === option.label}
            onClick={() => setFiltre(option)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {etat.status === 'loading' && (
        <div className="card state">
          <span className="state-icon"><Icon name="chart" size={22} /></span>
          <h2>Chargement des actualités</h2>
          <p>Nous récupérons les dépêches en direct.</p>
        </div>
      )}
      {etat.status === 'error' && (
        <>
          {promoBanner}
          <ErrorState message={etat.error.message} onRetry={reessayer} />
        </>
      )}
      {etat.status === 'ready' && articles.length === 0 && (
        <>
          {promoBanner}
          <EmptyState
            titre="Aucune actualité disponible"
            texte="Les dépêches apparaîtront après la prochaine synchronisation."
            action={
              <button type="button" className="btn btn-secondary" onClick={reessayer}>
                Actualiser
              </button>
            }
          />
        </>
      )}
      {etat.status === 'ready' && vedette && (
        <>
          <section className="news-hero card">
            <div className="news-hero-art" aria-hidden="true">
              <ArticleThumb src={vedette.image_url} size={38} />
            </div>
            <div>
              <Chip ton="ac">À la une · {vedette.source}</Chip>
              <h2>{vedette.titre}</h2>
              <p>{vedette.resume}</p>
              <a className="text-link" href={vedette.url} target="_blank" rel="noreferrer">
                Lire la source <Icon name="arrow" size={16} />
              </a>
            </div>
          </section>
          {promoBanner}
          <section aria-labelledby="dernieres-actus">
            <div className="section-title">
              <h2 id="dernieres-actus">Dernières actualités ({articles.length - 1})</h2>
            </div>
            <div className="news-list">
              {articles.slice(1).map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        </>
      )}
      <Disclaimer />
    </div>
  )
}
