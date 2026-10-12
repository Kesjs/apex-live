import { useState } from 'react'
import { provider } from '../data'
import type { PeriodeHistorique, PilierId } from '../domain/contracts'
import { Crest } from '../components/Crest'
import { PageHeader } from '../components/PageHeader'
import { ResultMark } from '../components/ResultMark'
import { ListSkeleton } from '../components/Skeletons'
import { Compteur, Disclaimer, EmptyState, ErrorState, ProbBar, SectionTitle } from '../components/ui'
import { quandLabel } from '../lib/format'
import { Link } from '../lib/router'
import { useAsync } from '../lib/useAsync'

const PERIODES: Array<[PeriodeHistorique, string]> = [
  ['7j', '7 jours'],
  ['30j', '30 jours'],
  ['saison', 'Saison'],
]

const PILIERS: PilierId[] = ['issue', 'buts', 'bonus', 'scores']
const NOMS: Record<PilierId, string> = { issue: 'Issue du match', buts: 'Nombre de buts', bonus: 'Bonus', scores: 'Scores exacts' }
const PAR_PAGE = 3

export default function HistoryPage() {
  const [periode, setPeriode] = useState<PeriodeHistorique>('30j')
  const [visibles, setVisibles] = useState(PAR_PAGE)
  const [etat, reessayer] = useAsync(() => provider.getHistory(periode), [periode])

  const changer = (p: PeriodeHistorique) => {
    setPeriode(p)
    setVisibles(PAR_PAGE)
  }

  return (
    <div className="page-body">
      <PageHeader titre="Historique" sous="Ce que les pronostics ont donné, match après match." />

      <div className="segmented" role="group" aria-label="Période">
        {PERIODES.map(([valeur, label]) => (
          <button type="button" key={valeur} aria-pressed={periode === valeur} onClick={() => changer(valeur)}>
            {label}
          </button>
        ))}
      </div>

      {etat.status === 'loading' && <ListSkeleton lignes={5} />}
      {etat.status === 'error' && <ErrorState message={etat.error.message} onRetry={reessayer} />}

      {etat.status === 'ready' && (
        <div className="history-grid">
          <section aria-labelledby="taux" className="stack-sm">
            <SectionTitle id="taux">Taux de réussite par type</SectionTitle>
            <div className="card taux-card rise">
              {PILIERS.map((pilier, i) => {
                const t = etat.data.taux[pilier]
                const ratio = t.total > 0 ? t.reussis / t.total : 0
                const ton = pilier === 'bonus' || pilier === 'scores' ? 'am' : 'ac'
                return (
                  <div key={pilier}>
                    <div className="taux-line">
                      <span className="taux-name">{NOMS[pilier]}</span>
                      <span className="muted small tn">
                        {t.total > 0 ? t.reussis + ' sur ' + t.total + ' matchs' : 'Pas encore de données'}
                      </span>
                    </div>
                    <div className="taux-bar">
                      <ProbBar valeur={ratio} ton={ton} delai={i * 100} />
                      <span className={'tn taux-pct ' + (ton === 'am' ? 'amber' : 'accent')}>{t.total > 0 ? <Compteur valeur={ratio} delai={i * 100} /> : '—'}</span>
                    </div>
                  </div>
                )
              })}
              <p className="muted small">
                Ces chiffres montrent la fiabilité réelle de chaque type de pronostic, mise à jour après chaque match.
              </p>
            </div>
          </section>

          <section aria-labelledby="recents" className="stack-sm">
            <SectionTitle id="recents">Derniers résultats</SectionTitle>
            {etat.data.jours.length === 0 && <EmptyState titre="Pas encore de résultats" texte="Les résultats apparaîtront après les premiers matchs." />}
            {etat.data.jours.slice(0, visibles).map(jour => (
              <div key={jour.jour} className="league">
                <p className="kicker">{quandLabel(jour.jour)}</p>
                <div className="card list">
                  {jour.matchs.map(f => (
                    <Link key={f.match_id} to={'/match/' + f.match_id} className="hrow press">
                      <span className="hrow-top">
                        <span className="hrow-teams">
                          <Crest nom={f.equipes.domicile} taille="sm" />
                          {f.equipes.domicile} — {f.equipes.exterieur}
                        </span>
                        <span className="hrow-score tn">{f.resultat.score_final ?? '–'}</span>
                      </span>
                      <span className="rmarks">
                        <ResultMark label="Issue" valeur={f.resultat.issue} />
                        <ResultMark label="Buts" valeur={f.resultat.buts} />
                        <ResultMark label="Bonus" valeur={f.resultat.bonus} />
                        <ResultMark label="Score" valeur={f.resultat.score} />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            {visibles < etat.data.jours.length && (
              <button type="button" className="btn btn-secondary" onClick={() => setVisibles(v => v + 4)}>
                Afficher plus de jours
              </button>
            )}
          </section>
        </div>
      )}

      <Disclaimer />
    </div>
  )
}
