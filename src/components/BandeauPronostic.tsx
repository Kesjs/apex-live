import type { Prediction } from '../domain/contracts'
import { Crest } from './Crest'

/** Score exact pronostiqué, dans deux petites cases entre les noms des équipes. */
export function BandeauPronostic({ fiche }: { fiche: Prediction }) {
  const score = fiche.pronostics?.scores[0]?.score
  if (!score) return null
  const [d, e] = score.split('-')
  if (d === undefined || e === undefined) return null
  const { domicile, exterieur } = fiche.equipes
  return (
    <section className="card prono-band" aria-label={'Score pronostiqué : ' + domicile + ' ' + d + ', ' + exterieur + ' ' + e}>
      <p className="kicker">Score pronostiqué</p>
      <div className="prono-line">
        <span className="prono-team prono-home">
          <span className="prono-name">{domicile}</span>
          <Crest nom={domicile} logoUrl={fiche.logos?.domicile} taille="sm" />
        </span>
        <span className="prono-score tn" aria-hidden="true">
          <b>{d}</b>
          <b>{e}</b>
        </span>
        <span className="prono-team prono-away">
          <Crest nom={exterieur} logoUrl={fiche.logos?.exterieur} taille="sm" />
          <span className="prono-name">{exterieur}</span>
        </span>
      </div>
    </section>
  )
}
