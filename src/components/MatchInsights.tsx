import type { Prediction, PilierId } from '../domain/contracts'
import { pct } from '../lib/format'
import { Chip, ProbBar, SectionTitle } from './ui'

const PILIERS: Array<[PilierId, string]> = [['issue', 'Issue'], ['buts', 'Buts'], ['bonus', 'Bonus'], ['scores', 'Score']]

export function MatchSummary({ fiche }: { fiche: Prediction }) {
  const p = fiche.pronostics
  if (!p) return null
  const best = [
    { label: 'Issue', value: p.issue.probabilite, text: p.issue.court ?? p.issue.selection },
    { label: 'Buts', value: p.buts.probabilite, text: p.buts.selection },
  ].sort((a, b) => b.value - a.value)[0]
  return (
    <section className="card match-summary" aria-labelledby="resume-match">
      <SectionTitle id="resume-match" aside={<Chip ton={best.value >= 0.75 ? 'ac' : 'am'}>Signal {best.value >= 0.75 ? 'fort' : 'à surveiller'}</Chip>}>Résumé du match</SectionTitle>
      <p>{fiche.synthese ?? 'Apex compare la forme récente et les statistiques disponibles avant de proposer un signal.'}</p>
      <div className="summary-highlight"><strong>{best.text}</strong><span>{pct(best.value)} · signal principal</span></div>
    </section>
  )
}

export function ConfidenceCard({ fiche }: { fiche: Prediction }) {
  const p = fiche.pronostics
  if (!p) return null
  const values = [p.issue.probabilite, p.buts.probabilite, ...(p.bonus ? [0.62] : []), ...(p.scores[0] ? [p.scores[0].probabilite] : [])]
  const score = values.reduce((sum, value) => sum + value, 0) / values.length
  const niveau = fiche.meta.donnees_limitees ? 'À surveiller' : score >= 0.75 ? 'Forte' : score >= 0.62 ? 'Moyenne' : 'Prudente'
  return (
    <section className="card confidence-card" aria-labelledby="confiance">
      <SectionTitle id="confiance" aside={<Chip ton={niveau === 'Forte' ? 'ac' : 'am'}>{niveau}</Chip>}>Confiance Apex</SectionTitle>
      <div className="confidence-score"><strong>{pct(score)}</strong><span>niveau moyen des signaux publiés</span></div>
      <ProbBar valeur={score} ton={niveau === 'Forte' ? 'ac' : 'am'} />
      <p className="muted small">Basé sur les probabilités affichées, la forme récente et la disponibilité des données. Ce niveau n’est pas une garantie de résultat.</p>
    </section>
  )
}

export function FactorsCard({ fiche }: { fiche: Prediction }) {
  const p = fiche.pronostics
  if (!p) return null
  const justifications = [
    ['Forme récente', fiche.forme ? 'Les cinq derniers résultats de chaque équipe sont disponibles.' : 'Forme récente indisponible.'],
    ['Issue', p.issue.justification ?? 'Signal calculé à partir des tendances disponibles.'],
    ['Buts', p.buts.frequence ?? 'Tendance buts calculée sur les matchs récents.'],
    ...(p.bonus ? [['Bonus', p.bonus.justification] as [string, string]] : []),
  ]
  return (
    <section className="card factors-card" aria-labelledby="facteurs">
      <SectionTitle id="facteurs">Pourquoi ce pronostic ?</SectionTitle>
      <div className="factor-list">{justifications.map(([label, text]) => <div className="factor-row" key={label}><strong>{label}</strong><span>{text}</span></div>)}</div>
      <p className="muted small">Sources : {fiche.meta.source_stats}. Moteur {fiche.meta.version_moteur}.</p>
    </section>
  )
}

export function AnalysisTimeline({ fiche }: { fiche: Prediction }) {
  const done = fiche.resultat.statut === 'evalue'
  return (
    <section className="card analysis-timeline" aria-labelledby="parcours-analyse">
      <SectionTitle id="parcours-analyse">Parcours de l’analyse</SectionTitle>
      <ol>{['Données collectées', 'Analyse Apex', 'Pronostic publié', done ? 'Évaluation disponible' : 'Évaluation après le match'].map((label, index) => <li className={index < (done ? 4 : 3) ? 'is-done' : ''} key={label}><span>{index + 1}</span><strong>{label}</strong></li>)}</ol>
    </section>
  )
}

export function PillarConfidence({ fiche }: { fiche: Prediction }) {
  const p = fiche.pronostics
  if (!p) return null
  const values: Partial<Record<PilierId, number>> = { issue: p.issue.probabilite, buts: p.buts.probabilite, bonus: p.bonus ? 0.62 : undefined, scores: p.scores[0]?.probabilite }
  return <div className="pillar-confidence" aria-label="Niveau de confiance par type">{PILIERS.map(([id, label]) => values[id] === undefined ? null : <span key={id}><small>{label}</small><b>{pct(values[id]!)}</b></span>)}</div>
}
