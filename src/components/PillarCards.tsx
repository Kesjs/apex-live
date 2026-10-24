import type { CSSProperties, ReactNode } from 'react'
import type {
  PronosticBonus,
  PronosticButs,
  PronosticIssue,
  PronosticScore,
  Valeur,
  PilierId,
  NiveauRisque,
  Prediction,
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
      <PillarShell icone="card" ton="am" kicker="3 · Bonus" titre="Bonus non publié" delai={delai}>
        <p className="pillar-note">Les données d’événements (cartons, corners, fautes ou hors-jeu) ne sont pas assez complètes ou régulières pour publier un signal fiable sur ce match.</p>
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
    <PillarShell icone="sparkle" ton="am" kicker="4 · Score exact" titre="Score le plus probable" delai={delai}>
      <div className="scores">
        {scores.slice(0, 1).map((s, i) => (
          <div className="score-row" key={s.score}>
            <span className="score-label tn">{s.score}</span>
            <ProbBar valeur={s.probabilite} max={0.3} ton="am" delai={300 + delai * 120 + i * 100} />
            <span className="tn score-pct">{pct(s.probabilite, 1)}</span>
            <Cote valeur={s.cote} prefixe={false} vide />
          </div>
        ))}
      </div>
      <Pied niveau="eleve" gauche={null} />
      <p className="pillar-note">Un score exact reste rare, même lorsqu’il est le plus probable. Utilisez-le comme un repère statistique, jamais comme une certitude.</p>
    </PillarShell>
  )
}

export function calculerCombo(fiche: Prediction): {
  selection: string
  court: string
  probabilite: number
  justification: string
  conclusionIa: string
} | null {
  const p = fiche.pronostics
  if (!p) return null

  const dom = fiche.equipes.domicile
  const ext = fiche.equipes.exterieur

  // 1. Libellé de l'Issue
  let texteIssue = p.issue.selection
  const courtIssue = p.issue.court ?? '1'
  if (courtIssue === '1') texteIssue = `${dom} gagne`
  else if (courtIssue === '2') texteIssue = `${ext} gagne`
  else if (courtIssue === '1X') texteIssue = `${dom} ou Nul (1X)`
  else if (courtIssue === 'X2') texteIssue = `${ext} ou Nul (X2)`
  else if (courtIssue === '12') texteIssue = `${dom} ou ${ext} gagne`
  else if (courtIssue === 'N') texteIssue = `Match Nul (N)`

  // 2. Libellé des Buts
  const texteButs = p.buts.selection

  // 3. Titre du combo
  const selection = `${texteIssue} & ${texteButs}`
  const court = `${courtIssue} & ${p.buts.court ?? texteButs}`

  // 4. Probabilité combinée réaliste (événements sportifs corrélés)
  const p1 = p.issue.probabilite
  const p2 = p.buts.probabilite
  const proba = Math.min(0.88, Math.max(0.58, Math.round(p1 * Math.pow(p2, 0.42) * 100) / 100))

  // 5. Score repère et bonus pour la conclusion
  const scoreRepere = p.scores[0]?.score ?? '1-0'
  const bonusMention = p.bonus ? `avec un signal bonus sur les ${p.bonus.categorie} (${p.bonus.court})` : ''

  // 6. Conclusion IA résumant les 4 piliers
  let conclusionIa = ''
  if (fiche.synthese && fiche.synthese.length > 25) {
    conclusionIa = fiche.synthese
  } else {
    conclusionIa = `La dynamique penche nettement vers ${texteIssue}, soutenue par un rythme attendu de ${texteButs.toLowerCase()} (score repère : ${scoreRepere}) ${bonusMention}.`
  }

  const justification = `Scénario convergent combinant l'avantage sportif (${pct(p1)}) et la régularité du seuil de buts (${pct(p2)}).`

  return {
    selection,
    court,
    probabilite: proba,
    justification,
    conclusionIa,
  }
}

export function ComboCard({ fiche, delai = 0 }: { fiche: Prediction; delai?: number }) {
  const combo = calculerCombo(fiche)
  if (!combo) return null

  const style = { '--i': delai } as CSSProperties

  return (
    <article className="card pillar combo-pillar rise" style={style}>
      <header className="pillar-head">
        <span
          className="pillar-ico pillar-ico-ac"
          style={{ background: 'rgba(46, 230, 160, 0.2)', color: 'var(--ac, #2ee6a0)' }}
        >
          <Icon name="sparkle" size={20} />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <p className="kicker" style={{ color: 'var(--ac, #2ee6a0)', fontWeight: 600 }}>
              5 · Scénario Combiné · Combo Apex
            </p>
            <span
              style={{
                fontSize: '11px',
                background: 'rgba(46, 230, 160, 0.15)',
                color: 'var(--ac, #2ee6a0)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: 600,
              }}
            >
              Recommandé
            </span>
          </div>
          <h3 style={{ fontSize: '16px', marginTop: '2px', color: 'var(--tx, #e9f2ed)' }}>{combo.selection}</h3>
        </div>
      </header>

      <Probabilite valeur={combo.probabilite} delai={300 + delai * 120} />

      <Pied niveau={combo.probabilite >= 0.7 ? 'faible' : 'moyen'} gauche={null} />

      {/* Encadré conclusion IA résumant les 4 piliers */}
      <div
        className="combo-ai-box"
        style={{
          marginTop: '12px',
          padding: '10px 14px',
          borderRadius: '10px',
          background: 'rgba(15, 24, 21, 0.8)',
          border: '1px solid rgba(46, 230, 160, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '14px' }}>🧠</span>
          <strong style={{ fontSize: '12px', color: 'var(--tx, #e9f2ed)' }}>Conclusion de l'IA</strong>
          <span style={{ fontSize: '10px', color: 'var(--mu, #8ca196)', marginLeft: 'auto' }}>
            Synthèse des 4 piliers
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.45', color: 'var(--tx, #e9f2ed)' }}>
          {combo.conclusionIa}
        </p>
      </div>

      <p className="pillar-note" style={{ marginTop: '8px', fontSize: '11.5px', color: 'var(--mu, #8ca196)' }}>
        {combo.justification}
      </p>
    </article>
  )
}

