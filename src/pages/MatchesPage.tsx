import { useEffect, useState } from 'react'
import { provider } from '../data'
import { DateRail } from '../components/DateRail'
import { Icon } from '../components/Icon'
import { MatchRow } from '../components/MatchRow'
import { PageHeader } from '../components/PageHeader'
import { PartnerStrip } from '../components/PartnerStrip'
import { ListSkeleton } from '../components/Skeletons'
import { Disclaimer, EmptyState, ErrorState } from '../components/ui'
import { useAiChat } from '../lib/ai-chat'
import { infosCompetition } from '../lib/competitions'
import { useDay } from '../lib/day'
import { jourLongLabel, quandLabel } from '../lib/format'
import { parCompetition, valueBets } from '../lib/matchs'
import { usePrefs } from '../lib/prefs'
import { useAsync } from '../lib/useAsync'
import { useRouter } from '../lib/router'

type ModeFiltre = 'tous' | 'value' | 'confiance'

function decalerIso(jour: string, jours: number): string {
  const [y, m, d] = jour.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + jours)).toISOString().slice(0, 10)
}

function normalise(texte: string): string {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function parHeure<T extends { date_heure: string }>(fiches: T[]): Array<[string, T[]]> {
  const groupes = new Map<string, T[]>()
  fiches.forEach(fiche => {
    const heure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(fiche.date_heure))
    groupes.set(heure, [...(groupes.get(heure) ?? []), fiche])
  })
  return [...groupes.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export default function MatchesPage() {
  const { jour, setJour } = useDay()
  const { search } = useRouter()
  const { cotes } = usePrefs()
  const { setScreenContext } = useAiChat()
  const [etat, reessayer] = useAsync(() => provider.listMatches(jour), [jour])
  const [recherche, setRecherche] = useState(() => new URLSearchParams(search).get('q') ?? '')
  const [modeFiltre, setModeFiltre] = useState<ModeFiltre>(() =>
    new URLSearchParams(search).get('filtre') === 'value' ? 'value' : 'tous',
  )
  const [fermees, setFermees] = useState<string[]>([])

  const fiches = etat.status === 'ready' ? etat.data : []
  const [nextState] = useAsync(
    () => (etat.status === 'ready' && fiches.length === 0 && provider.nextMatchday
      ? provider.nextMatchday(decalerIso(jour, 1))
      : Promise.resolve({ date: null, matchs: [] })),
    [etat.status, fiches.length, jour],
  )
  const nextDate = nextState.status === 'ready' ? nextState.data.date : null

  useEffect(() => {
    setScreenContext({
      route: '/matchs',
      pageTitle: `Matchs · ${quandLabel(jour)}`,
      valueBets: valueBets(fiches).slice(0, 4).map(f => ({
        match: `${f.equipes.domicile} vs ${f.equipes.exterieur}`,
        competition: f.competition,
        choix: f.value?.pilier === 'buts' ? (f.pronostics?.buts.selection ?? '') : (f.pronostics?.issue.selection ?? ''),
        avantagePct: Math.round((f.value?.ecart ?? 0) * 100),
        cote: f.value?.pilier === 'buts' ? f.pronostics?.buts.cote : f.pronostics?.issue.cote,
      })),
      topMatches: fiches.slice(0, 6).map(f => ({
        match: `${f.equipes.domicile} vs ${f.equipes.exterieur}`,
        competition: f.competition,
        issue: f.pronostics?.issue.selection ?? 'À venir',
        probaPct: Math.round((f.pronostics?.issue.probabilite ?? 0) * 100),
        cote: f.pronostics?.issue.cote,
      })),
    })
  }, [fiches, jour, setScreenContext])

  const nbValues = valueBets(fiches).length

  const filtrees = fiches.filter(f => {
    if (modeFiltre === 'value' && (!f.value || f.value.ecart <= 0)) return false
    if (modeFiltre === 'confiance' && (!f.pronostics || f.pronostics.issue.probabilite < 0.68)) return false
    if (!recherche.trim()) return true
    const q = normalise(recherche.trim())
    return normalise(f.equipes.domicile).includes(q) || normalise(f.equipes.exterieur).includes(q) || normalise(f.competition).includes(q)
  })

  return (
    <div className="page-body">
      <PageHeader titre="Matchs" sous={jourLongLabel(jour)} />
      <DateRail jour={jour} onChange={setJour} />

      <div className="toolbar">
        <label className="search">
          <Icon name="search" size={18} />
          <span className="sr-only">Rechercher une équipe ou compétition</span>
          <input
            type="search"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Équipe ou compétition…"
            autoComplete="off"
          />
        </label>
      </div>

      {fiches.length > 0 && (
        <div className="filters" role="group" aria-label="Filtrer les rencontres">
          <button
            type="button"
            className={'filter-btn' + (modeFiltre === 'tous' ? ' is-selected' : '')}
            aria-pressed={modeFiltre === 'tous'}
            onClick={() => setModeFiltre('tous')}
          >
            Tous ({fiches.length})
          </button>
          {cotes && (
            <button
              type="button"
              className={'filter-btn' + (modeFiltre === 'value' ? ' is-selected' : '')}
              aria-pressed={modeFiltre === 'value'}
              onClick={() => setModeFiltre('value')}
            >
              Value Bets ({nbValues})
            </button>
          )}
          <button
            type="button"
            className={'filter-btn' + (modeFiltre === 'confiance' ? ' is-selected' : '')}
            aria-pressed={modeFiltre === 'confiance'}
            onClick={() => setModeFiltre('confiance')}
          >
            Confiance élevée
          </button>
        </div>
      )}

      <PartnerStrip
        variant="banner"
        contextHint={
          nbValues > 0
            ? `${nbValues} opportunité${nbValues > 1 ? 's' : ''} Value Bet repérée${nbValues > 1 ? 's' : ''} aujourd’hui · code promo kenken.`
            : undefined
        }
      />

      {etat.status === 'loading' && <ListSkeleton lignes={5} />}
      {etat.status === 'error' && <ErrorState message={etat.error.message} onRetry={reessayer} />}

      {etat.status === 'ready' && fiches.length === 0 && (
        <EmptyState
          titre="Aucun match programmé ce jour"
          texte={
            nextDate
              ? `Aucune compétition principale ne joue ce jour. La prochaine journée est prévue le ${jourLongLabel(nextDate)}.`
              : 'Aucune rencontre n’est analysée pour cette journée.'
          }
          action={
            nextDate ? (
              <button type="button" className="btn btn-primary" onClick={() => setJour(nextDate)}>
                Voir le {quandLabel(nextDate)}
              </button>
            ) : undefined
          }
        />
      )}

      {etat.status === 'ready' && fiches.length > 0 && filtrees.length === 0 && (
        <EmptyState
          titre="Aucun résultat"
          texte="Aucun match ne correspond aux filtres sélectionnés."
          action={
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setRecherche('')
                setModeFiltre('tous')
              }}
            >
              Réinitialiser les filtres
            </button>
          }
        />
      )}

      {etat.status === 'ready' &&
        parCompetition(filtrees).map(([nom, groupe]) => {
          const ouverte = !fermees.includes(nom)
          const idListe = 'ligue-' + nom.replace(/\s+/g, '-').toLowerCase()
          return (
            <section key={nom} className="league" aria-label={nom}>
              <button
                type="button"
                className="league-head"
                aria-expanded={ouverte}
                aria-controls={idListe}
                onClick={() => setFermees(actuelles => (ouverte ? [...actuelles, nom] : actuelles.filter(n => n !== nom)))}
              >
                <span className="league-flag" aria-hidden="true">{infosCompetition(nom).drapeau}</span>
                <span className="league-name">{nom}</span>
                <span className="league-count">{groupe.length} {groupe.length > 1 ? 'matchs' : 'match'}</span>
                <span className={'league-caret' + (ouverte ? ' is-open' : '')} aria-hidden="true">
                  <Icon name="down" size={18} strokeWidth={2} />
                </span>
              </button>
              {ouverte && (
                <div id={idListe}>
                  {parHeure(groupe).map(([heure, matches]) => (
                    <div key={heure} className="hour-group">
                      <div className="hour-label"><Icon name="clock" size={14} /> {heure}</div>
                      <div className="card list">
                        {matches.map((f, i) => <MatchRow key={f.match_id} fiche={f} index={i} />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}

      <Disclaimer />
    </div>
  )
}
