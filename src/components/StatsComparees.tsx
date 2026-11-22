import type { Prediction } from '../domain/contracts'
import { decimal, pct } from '../lib/format'
import { SectionTitle } from './ui'

type Ligne = {
  label: string
  g: number
  d: number
  /** true = plus c'est haut, mieux c'est ; false = plus c'est bas, mieux c'est ; null = pas de « meilleur ». */
  plusEstMieux: boolean | null
  format: (n: number) => string
}

/** Statistiques des deux équipes face à face avec barres de comparaison visuelles. */
export function StatsComparees({ fiche }: { fiche: Prediction }) {
  const s = fiche.stats
  if (!s) return null
  const lignes: Ligne[] = [
    { label: 'Buts attendus (modèle)', g: s.buts_attendus.domicile, d: s.buts_attendus.exterieur, plusEstMieux: true, format: decimal },
    { label: 'Buts marqués / match', g: s.domicile.buts_marques, d: s.exterieur.buts_marques, plusEstMieux: true, format: decimal },
    { label: 'Buts encaissés / match', g: s.domicile.buts_encaisses, d: s.exterieur.buts_encaisses, plusEstMieux: false, format: decimal },
    { label: 'Matchs à plus de 2,5 buts', g: s.domicile.plus_2_5, d: s.exterieur.plus_2_5, plusEstMieux: null, format: n => pct(n) },
    { label: 'Les deux équipes marquent', g: s.domicile.deux_marquent, d: s.exterieur.deux_marquent, plusEstMieux: null, format: n => pct(n) },
    { label: 'Matchs sans encaisser', g: s.domicile.sans_encaisser, d: s.exterieur.sans_encaisser, plusEstMieux: true, format: n => pct(n) },
  ]
  const nbMatchs = Math.max(s.domicile.matchs, s.exterieur.matchs)

  return (
    <section className="card data-card" aria-labelledby="stats-equipes">
      <SectionTitle id="stats-equipes">Comparaison avant le match</SectionTitle>
      <p className="muted small cmp-note">Moyenne calculée sur les {nbMatchs} derniers matchs avant cette rencontre.</p>

      <div className="cmp-list">
        <div className="cmp-head">
          <span>{fiche.equipes.domicile}</span>
          <span>{fiche.equipes.exterieur}</span>
        </div>

        {lignes.map(l => {
          const egal = l.g === l.d
          const gMieux = l.plusEstMieux !== null && !egal && (l.plusEstMieux ? l.g > l.d : l.g < l.d)
          const dMieux = l.plusEstMieux !== null && !egal && !gMieux
          const total = l.g + l.d
          const pctG = total > 0 ? Math.round((l.g / total) * 100) : 50
          const pctD = total > 0 ? 100 - pctG : 50

          return (
            <div className="cmp-item" key={l.label}>
              <div className="cmp-item-top">
                <strong className={'cmp-num tn' + (gMieux ? ' is-best' : '')}>
                  {s.domicile.matchs === 0 ? '—' : l.format(l.g)}
                </strong>
                <span className="cmp-label">{l.label}</span>
                <strong className={'cmp-num tn' + (dMieux ? ' is-best' : '')}>
                  {s.exterieur.matchs === 0 ? '—' : l.format(l.d)}
                </strong>
              </div>
              <div className="cmp-bars" aria-hidden="true">
                <div className="cmp-track cmp-track-left">
                  <span className={'cmp-fill' + (gMieux ? ' is-best' : '')} style={{ width: `${pctG}%` }} />
                </div>
                <div className="cmp-track cmp-track-right">
                  <span className={'cmp-fill' + (dMieux ? ' is-best' : '')} style={{ width: `${pctD}%` }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
