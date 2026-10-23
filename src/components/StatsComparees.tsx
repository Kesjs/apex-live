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
  /** Moyenne de la compétition (affichée entre parenthèses). */
  moyenne?: number
}

function Valeur({ v, meilleur, texte, moyenne }: { v: number; meilleur: boolean; texte: (n: number) => string; moyenne?: number }) {
  return (
    <span className={'cmp-val tn' + (meilleur ? ' is-best' : '')}>
      <strong>{texte(v)}</strong>
      {moyenne !== undefined && <small>({texte(moyenne)})</small>}
    </span>
  )
}

/** Statistiques des deux équipes face à face, avec la moyenne de la ligue et la meilleure valeur en vert. */
export function StatsComparees({ fiche }: { fiche: Prediction }) {
  const s = fiche.stats
  if (!s) return null
  const m = s.moyenne_ligue
  const lignes: Ligne[] = [
    { label: 'Buts attendus (modèle)', g: s.buts_attendus.domicile, d: s.buts_attendus.exterieur, plusEstMieux: true, format: decimal },
    { label: 'Buts marqués / match', g: s.domicile.buts_marques, d: s.exterieur.buts_marques, plusEstMieux: true, format: decimal, moyenne: m?.buts_marques },
    { label: 'Buts encaissés / match', g: s.domicile.buts_encaisses, d: s.exterieur.buts_encaisses, plusEstMieux: false, format: decimal, moyenne: m?.buts_encaisses },
    { label: 'Matchs à plus de 2,5 buts', g: s.domicile.plus_2_5, d: s.exterieur.plus_2_5, plusEstMieux: null, format: n => pct(n) },
    { label: 'Les deux équipes marquent', g: s.domicile.deux_marquent, d: s.exterieur.deux_marquent, plusEstMieux: null, format: n => pct(n) },
    { label: 'Matchs sans encaisser', g: s.domicile.sans_encaisser, d: s.exterieur.sans_encaisser, plusEstMieux: true, format: n => pct(n) },
  ]
  return (
    <section className="card data-card" aria-labelledby="stats-equipes">
      <SectionTitle id="stats-equipes">Statistiques comparées</SectionTitle>
      <div className="stat-table">
        <div className="stat-row stat-head">
          <span>{fiche.equipes.domicile}</span>
          <span>Indicateur</span>
          <span>{fiche.equipes.exterieur}</span>
        </div>
        {lignes.map(l => {
          const egal = l.g === l.d
          const gMieux = l.plusEstMieux !== null && !egal && (l.plusEstMieux ? l.g > l.d : l.g < l.d)
          const dMieux = l.plusEstMieux !== null && !egal && !gMieux
          return (
            <div className="stat-row" key={l.label}>
              <Valeur v={l.g} meilleur={gMieux} texte={l.format} moyenne={l.moyenne} />
              <span>{l.label}</span>
              <Valeur v={l.d} meilleur={dMieux} texte={l.format} moyenne={l.moyenne} />
            </div>
          )
        })}
        <div className="stat-row">
          <strong>{s.domicile.derniers.join(' · ') || '—'}</strong>
          <span>Derniers scores</span>
          <strong>{s.exterieur.derniers.join(' · ') || '—'}</strong>
        </div>
      </div>
      {m && <p className="muted small cmp-note">Les valeurs entre parenthèses sont la moyenne de la compétition. En vert : la meilleure valeur des deux équipes.</p>}
    </section>
  )
}
