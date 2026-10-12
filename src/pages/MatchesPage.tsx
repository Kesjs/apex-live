import { useState } from 'react'
import { provider } from '../data'
import { DateRail } from '../components/DateRail'
import { Icon } from '../components/Icon'
import { MatchRow } from '../components/MatchRow'
import { PageHeader } from '../components/PageHeader'
import { ListSkeleton } from '../components/Skeletons'
import { Disclaimer, EmptyState, ErrorState } from '../components/ui'
import { useDay } from '../lib/day'
import { addDays, jourLongLabel } from '../lib/format'
import { parCompetition } from '../lib/matchs'
import { useAsync } from '../lib/useAsync'

function normalise(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

export default function MatchesPage() {
  const { jour, setJour } = useDay()
  const [etat, reessayer] = useAsync(() => provider.listMatches(jour), [jour])
  const [recherche, setRecherche] = useState('')
  const [competition, setCompetition] = useState('toutes')

  const fiches = etat.status === 'ready' ? etat.data : []
  const competitions = [...new Set(fiches.map(f => f.competition))]
  const actuelle = competition === 'toutes' || competitions.includes(competition) ? competition : 'toutes'
  const filtrees = fiches.filter(f => {
    if (actuelle !== 'toutes' && f.competition !== actuelle) return false
    if (!recherche.trim()) return true
    const q = normalise(recherche.trim())
    return normalise(f.equipes.domicile).includes(q) || normalise(f.equipes.exterieur).includes(q)
  })

  return (
    <div className="page-body">
      <PageHeader titre="Matchs" sous={jourLongLabel(jour)} />
      <DateRail jour={jour} onChange={setJour} />

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={18} />
          <span className="sr-only">Rechercher une équipe</span>
          <input
            type="search"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher une équipe"
            autoComplete="off"
          />
        </label>
        {competitions.length > 1 && (
          <div className="rail" role="group" aria-label="Filtrer par compétition">
            {['toutes', ...competitions].map(c => (
              <button type="button" key={c} className="filter-btn" aria-pressed={c === actuelle} onClick={() => setCompetition(c)}>
                {c === 'toutes' ? 'Toutes les compétitions' : c}
              </button>
            ))}
          </div>
        )}
      </div>

      {etat.status === 'loading' && <ListSkeleton lignes={5} />}
      {etat.status === 'error' && <ErrorState message={etat.error.message} onRetry={reessayer} />}

      {etat.status === 'ready' && fiches.length === 0 && (
        <EmptyState
          titre="Aucun match ce jour-là"
          texte="Aucune rencontre n'est analysée pour cette journée."
          action={
            <button type="button" className="btn btn-secondary" onClick={() => setJour(addDays(jour, 1))}>
              Voir le jour suivant
            </button>
          }
        />
      )}

      {etat.status === 'ready' && fiches.length > 0 && filtrees.length === 0 && (
        <EmptyState
          titre="Aucun résultat"
          texte="Aucun match ne correspond à votre recherche."
          action={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setRecherche('')
                setCompetition('toutes')
              }}
            >
              Effacer les filtres
            </button>
          }
        />
      )}

      {etat.status === 'ready' &&
        parCompetition(filtrees).map(([nom, groupe]) => (
          <section key={nom} className="league" aria-label={nom}>
            <p className="kicker">
              {nom} · {groupe.length} {groupe.length > 1 ? 'matchs' : 'match'}
            </p>
            <div className="card list">
              {groupe.map((f, i) => (
                <MatchRow key={f.match_id} fiche={f} index={i} />
              ))}
            </div>
          </section>
        ))}

      <Disclaimer />
    </div>
  )
}
