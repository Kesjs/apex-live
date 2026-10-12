import type { CSSProperties, ReactNode } from 'react'
import type {
  PronosticBonus,
  PronosticButs,
  PronosticIssue,
  PronosticScore,
  Valeur,
  PilierId,
  NiveauRisque,
} from '../domain/contracts'
import { categorieLabel, decimal, pct, points, risqueDe } from '../lib/format'
import { usePrefs } from '../lib/prefs'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { Chip, Compteur, Cote, ProbBar, Risque } from './ui'

type ShellProps = {
  icone: IconName
  ton: 'ac' | 'am'
  kicker: string
  titre: string
  delai: number
  children: ReactNode
}

function PillarShell({ icone, ton, kicker, titre, delai, children }: ShellProps) {
  const style = { '--i': delai } as CSSProperties
  return (
    <article className="card pillar rise" style={style}>
      <header className="pillar-head">
        <span className={'pillar-ico pillar-ico-' + ton}>
          <Icon name={icone} size={20} />
        </span>
        <div>
          <p className="kicker">{kicker}</p>
          <h3>{titre}</h3>
        </div>
      </header>
      {children}
    </article>
  )
}

function Ecart({ valeur, pilier }: { valeur?: Valeur | null; pilier: PilierId }) {
  const { cotes } = usePrefs()
  if (!cotes || !valeur || valeur.pilier !== pilier) return null
  return (
    <Chip ton="ac" title="Écart entre la probabilité calculée par Apex et celle que laisse entendre la cote">
      Écart {points(valeur.ecart)}
    </Chip>
  )
}

function Probabilite({ valeur, delai }: { valeur: number; delai: number }) {
  return (
    <div className="pillar-prob">
      <ProbBar valeur={valeur} delai={delai} />
      <span className="tn accent pillar-pct">
        <Compteur valeur={valeur} delai={delai} />
      </span>
    </div>
  )
}

function Pied({ gauche, niveau }: { gauche: ReactNode; niveau: NiveauRisque }) {
  return (
    <div className="pillar-foot">
      <div className="pillar-foot-left">{gauche}</div>
      <Risque niveau={niveau} />
    </div>
  )
}

export function IssueCard({ p, valeur, delai }: { p: PronosticIssue; valeur?: Valeur | null; delai: number }) {
  return (
    <PillarShell icone="shield" ton="ac" kicker="1 · Issue du match" titre={p.selection} delai={delai}>
      <Probabilite valeur={p.probabilite} delai={300 + delai * 120} />
      <Pied
        niveau={risqueDe('issue', p.probabilite)}
        gauche={
          <>
            <Cote valeur={p.cote} />
            <Ecart valeur={valeur} pilier="issue" />
          </>
        }
      />
      {p.justification && <p className="pillar-note">{p.justification}</p>}
    </PillarShell>
  )
}

export function ButsCard({ p, valeur, delai }: { p: PronosticButs; valeur?: Valeur | null; delai: number }) {
  return (
    <PillarShell icone="ball" ton="ac" kicker="2 · Nombre de buts" titre={p.selection} delai={delai}>
      <Probabilite valeur={p.probabilite} delai={300 + delai * 120} />
      <Pied
        niveau={risqueDe('buts', p.probabilite)}
        gauche={
          <>
            <Cote valeur={p.cote} />
            <Ecart valeur={valeur} pilier="buts" />
          </>
        }
      />
      {(p.justification || p.frequence) && <p className="pillar-note">{p.justification ?? p.frequence}</p>}
    </PillarShell>
  )
}

export function BonusCard({ p, delai }: { p: PronosticBonus | null; delai: number }) {
  if (!p) {
    return (
      <PillarShell icone="card" ton="am" kicker="3 · Bonus" titre="Pas de bonus pour ce match" delai={delai}>
        <p className="pillar-note">Aucun signal statistique assez net sur les cartons, corners, fautes ou hors-jeu pour proposer un bonus.</p>
      </PillarShell>
    )
  }
  return (
    <PillarShell icone="card" ton="am" kicker={'3 · Bonus · ' + categorieLabel[p.categorie]} titre={p.selection} delai={delai}>
      {p.valeur_observee !== undefined && p.moyenne_ligue !== undefined && (
        <div className="duo">
          <div className="duo-box">
            <p className="duo-value tn am">{decimal(p.valeur_observee)}</p>
            <p className="duo-label">par match, les deux équipes</p>
          </div>
          <div className="duo-box">
            <p className="duo-value tn">{decimal(p.moyenne_ligue)}</p>
            <p className="duo-label">moyenne de la ligue</p>
          </div>
        </div>
      )}
      <Pied niveau="moyen" gauche={<Cote valeur={p.cote} />} />
      <p className="pillar-note">{p.justification} C'est le signal le plus net du jour.</p>
    </PillarShell>
  )
}

export function ScoresCard({ scores, delai }: { scores: PronosticScore[]; delai: number }) {
  return (
    <PillarShell icone="sparkle" ton="am" kicker="4 · Coup de poker" titre="Scores les plus probables" delai={delai}>
      <div className="scores">
        {scores.map((s, i) => (
          <div className="score-row" key={s.score}>
            <span className="score-label tn">{s.score}</span>
            <ProbBar valeur={s.probabilite} max={0.3} ton="am" delai={300 + delai * 120 + i * 100} />
            <span className="tn score-pct">{pct(s.probabilite, 1)}</span>
            <Cote valeur={s.cote} prefixe={false} vide />
          </div>
        ))}
      </div>
      <Pied niveau="eleve" gauche={null} />
      <p className="pillar-note">Un score exact sort rarement, même le plus probable. À prendre comme un pari de fantaisie.</p>
    </PillarShell>
  )
}
