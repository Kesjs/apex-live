import type { CSSProperties } from 'react'
import type { PilierId, Prediction } from '../domain/contracts'
import { heureCourte, pct, pilierLabel } from '../lib/format'
import { Link } from '../lib/router'
import { Crest } from './Crest'
import { Icon } from './Icon'
import { Chip, Cote } from './ui'
import { matchStatus } from '../lib/match-status'

export type Filtre = 'tous' | PilierId

const OPTIONS: Filtre[] = ['tous', 'issue', 'buts', 'bonus', 'scores']

/** Boutons pour n'afficher qu'un type de pronostic. */
export function FiltrePiliers({ valeur, onChange }: { valeur: Filtre; onChange: (valeur: Filtre) => void }) {
  return (
    <div className="rail" role="group" aria-label="Filtrer par type de pronostic">
      {OPTIONS.map(option => (
        <button
          type="button"
          key={option}
          className="filter-btn"
          aria-pressed={option === valeur}
          onClick={() => onChange(option)}
        >
          {option === 'tous' ? 'Tous' : pilierLabel[option]}
        </button>
      ))}
    </div>
  )
}

function Pronos({ fiche, filtre }: { fiche: Prediction; filtre: Filtre }) {
  const p = fiche.pronostics
  if (!p) {
    return <span className="match-pending" title={fiche.raison_absence ?? 'Pronostic indisponible'} aria-label="Pronostic indisponible"><Icon name="info" size={15} /></span>
  }
  const issue = (
    <Chip ton="ac">
      {p.issue.court ?? p.issue.selection}
    </Chip>
  )
  const buts = (
    <Chip>
      {p.buts.court ?? p.buts.selection}
    </Chip>
  )
  const bonus = p.bonus ? <Chip ton="am">{p.bonus.court ?? p.bonus.selection}</Chip> : <Chip ton="muet">Pas de bonus</Chip>

  if (filtre === 'issue') {
    return (
      <>
        {issue}
        <Cote valeur={p.issue.cote} />
      </>
    )
  }
  if (filtre === 'buts') {
    return (
      <>
        {buts}
        <Cote valeur={p.buts.cote} />
      </>
    )
  }
  if (filtre === 'bonus') {
    return (
      <>
        {bonus}
        <Cote valeur={p.bonus?.cote} />
      </>
    )
  }
  if (filtre === 'scores') {
    return (
      <>
        {p.scores.slice(0, 1).map(s => (
          <Chip key={s.score} ton="am">
            {s.score}
          </Chip>
        ))}
      </>
    )
  }
  return (
    <>
      {issue}
      {buts}
      <span className="hide-sm">{bonus}</span>
    </>
  )
}

export function MatchRow({ fiche, filtre = 'tous', index = 0 }: { fiche: Prediction; filtre?: Filtre; index?: number }) {
  const style = { '--i': index } as CSSProperties
  const status = matchStatus(fiche)
  return (
    <Link to={'/match/' + fiche.match_id} className="mrow press rise" style={style}>
      <time className="mrow-time" dateTime={fiche.date_heure}>
        {status.final ? 'Terminé' : status.live ? 'En direct' : status.pending ? 'En attente' : fiche.resultat.statut === 'annule' ? 'Reporté' : heureCourte(fiche.date_heure)}
      </time>
      <span className="mrow-teams">
        <span>
          <Crest nom={fiche.equipes.domicile} logoUrl={fiche.logos?.domicile} taille="sm" />
          {fiche.equipes.domicile}
        </span>
        <span>
          <Crest nom={fiche.equipes.exterieur} logoUrl={fiche.logos?.exterieur} taille="sm" />
          {fiche.equipes.exterieur}
        </span>
      </span>
      <span className="mrow-chips">
        {status.final ? <strong className="row-final-score tn" aria-label={'Score final ' + status.score}>{status.score}</strong> : <Pronos fiche={fiche} filtre={filtre} />}
      </span>
      <Icon name="chevron" size={16} className="mrow-go" />
    </Link>
  )
}
