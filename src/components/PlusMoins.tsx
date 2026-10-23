import type { Prediction } from '../domain/contracts'
import { SectionTitle } from './ui'

/** Barres empilées « Moins de / Plus de 2,5 buts » : une couleur par équipe, sur leurs derniers matchs. */
export function PlusMoins({ fiche }: { fiche: Prediction }) {
  const s = fiche.stats
  if (!s || s.domicile.matchs === 0 || s.exterieur.matchs === 0) return null
  const plusD = Math.round(s.domicile.plus_2_5 * s.domicile.matchs)
  const plusE = Math.round(s.exterieur.plus_2_5 * s.exterieur.matchs)
  const moinsD = s.domicile.matchs - plusD
  const moinsE = s.exterieur.matchs - plusE
  const colonnes = [
    { titre: 'Moins de', d: moinsD, e: moinsE },
    { titre: 'Plus de', d: plusD, e: plusE },
  ]
  const plusGrand = Math.max(...colonnes.map(c => c.d + c.e), 1)
  const part = (n: number, somme: number): string => (somme > 0 ? Math.round((n / somme) * 100) + ' %' : '0 %')
  const resume = colonnes.map(c => c.titre + ' 2,5 : ' + fiche.equipes.domicile + ' ' + c.d + ', ' + fiche.equipes.exterieur + ' ' + c.e).join(' ; ')
  return (
    <section className="card data-card" aria-labelledby="plus-moins">
      <SectionTitle id="plus-moins">Plus / Moins de 2,5 buts</SectionTitle>
      <div className="pm" role="img" aria-label={resume}>
        {colonnes.map(c => {
          const somme = c.d + c.e
          return (
            <div className="pm-col" key={c.titre}>
              <div className="pm-bar" style={{ height: Math.max(somme / plusGrand, 0.08) * 160 + 'px' }}>
                {c.d > 0 && <i className="pm-d" style={{ flex: c.d }}>{c.d} ({part(c.d, somme)})</i>}
                {c.e > 0 && <i className="pm-e" style={{ flex: c.e }}>{c.e} ({part(c.e, somme)})</i>}
              </div>
              <p className="pm-title">{c.titre}</p>
            </div>
          )
        })}
      </div>
      <p className="pm-limit tn">2,5</p>
      <div className="pm-legend">
        <span><i className="pm-d" />{fiche.equipes.domicile}</span>
        <span><i className="pm-e" />{fiche.equipes.exterieur}</span>
      </div>
      <p className="muted small">Nombre de matchs à moins ou à plus de 2,5 buts parmi les derniers matchs de chaque équipe.</p>
    </section>
  )
}
