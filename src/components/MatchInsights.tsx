import type { Prediction } from '../domain/contracts'
import { pct } from '../lib/format'
import { SectionTitle } from './ui'


export function MatchSummary({ fiche }: { fiche: Prediction }) {
  const p = fiche.pronostics
  if (!p) return null
  const best = [
    { label: 'Issue', value: p.issue.probabilite, text: p.issue.court ?? p.issue.selection },
    { label: 'Buts', value: p.buts.probabilite, text: p.buts.selection },
  ].sort((a, b) => b.value - a.value)[0]
  return (
    <section className="card match-summary" aria-labelledby="resume-match">
      <SectionTitle id="resume-match">Lecture Apex avant le match</SectionTitle>
      <p>{fiche.synthese ?? 'Apex compare la forme récente et les statistiques disponibles avant de proposer un signal.'}</p>
      <div className="summary-highlight"><strong>{best.text}</strong><span>{pct(best.value)} · signal principal</span></div>
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
