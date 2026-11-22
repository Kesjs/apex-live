import type { Prediction } from '../domain/contracts'
import { SectionTitle } from './ui'

type Ligne = {
  label: string
  g: number
  d: number
  formatG: string
  formatD: string
  /** true = plus c'est haut, mieux c'est ; false = plus c'est bas, mieux c'est ; null = pas de « meilleur ». */
  plusEstMieux: boolean | null
}

/** Statistiques concrètes des deux équipes sur leurs derniers matchs avec barres de comparaison. */
export function StatsComparees({ fiche }: { fiche: Prediction }) {
  const s = fiche.stats
  if (!s) return null

  const nDom = s.domicile.matchs
  const nExt = s.exterieur.matchs
  const nbMatchs = Math.max(nDom, nExt)

  const bmDom = Math.round(s.domicile.buts_marques * nDom)
  const bmExt = Math.round(s.exterieur.buts_marques * nExt)
  const beDom = Math.round(s.domicile.buts_encaisses * nDom)
  const beExt = Math.round(s.exterieur.buts_encaisses * nExt)
  const p25Dom = Math.round(s.domicile.plus_2_5 * nDom)
  const p25Ext = Math.round(s.exterieur.plus_2_5 * nExt)
  const bttsDom = Math.round(s.domicile.deux_marquent * nDom)
  const bttsExt = Math.round(s.exterieur.deux_marquent * nExt)
  const csDom = Math.round(s.domicile.sans_encaisser * nDom)
  const csExt = Math.round(s.exterieur.sans_encaisser * nExt)

  const lignes: Ligne[] = [
    { label: 'Buts marqués', g: bmDom, d: bmExt, formatG: String(bmDom), formatD: String(bmExt), plusEstMieux: true },
    { label: 'Buts encaissés', g: beDom, d: beExt, formatG: String(beDom), formatD: String(beExt), plusEstMieux: false },
    { label: 'Matchs à +2,5 buts', g: p25Dom, d: p25Ext, formatG: `${p25Dom} / ${nDom}`, formatD: `${p25Ext} / ${nExt}`, plusEstMieux: null },
    { label: 'Les deux équipes marquent', g: bttsDom, d: bttsExt, formatG: `${bttsDom} / ${nDom}`, formatD: `${bttsExt} / ${nExt}`, plusEstMieux: null },
    { label: 'Clean sheets (0 but encaissé)', g: csDom, d: csExt, formatG: `${csDom} / ${nDom}`, formatD: `${csExt} / ${nExt}`, plusEstMieux: true },
  ]

  return (
    <section className="card data-card" aria-labelledby="stats-equipes">
      <SectionTitle id="stats-equipes">Comparaison avant le match</SectionTitle>
      <p className="muted small cmp-note">Bilan sur les {nbMatchs} derniers matchs avant cette rencontre.</p>

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
                  {nDom === 0 ? '—' : l.formatG}
                </strong>
                <span className="cmp-label">{l.label}</span>
                <strong className={'cmp-num tn' + (dMieux ? ' is-best' : '')}>
                  {nExt === 0 ? '—' : l.formatD}
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
