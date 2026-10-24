import { faitsDuMatch } from '../lib/faits'
import type { Prediction } from '../domain/contracts'
import { SectionTitle } from './ui'

/** Phrases courtes tirées de la forme et des statistiques, avec le mot clé coloré. */
export function FaitsDuMatch({ fiche }: { fiche: Prediction }) {
  const faits = faitsDuMatch(fiche)
  if (faits.length === 0) return null
  return (
    <section aria-labelledby="faits" className="stack-sm">
      <SectionTitle id="faits">Faits avant le match</SectionTitle>
      <ul className="facts">
        {faits.map((f, i) => (
          <li key={i} className="card fact">
            <span className={'fact-mark fact-' + f.ton} aria-hidden="true">+</span>
            <p>
              {f.avant}
              <strong className={'fact-key fact-' + f.ton}>{f.cle}</strong>
              {f.apres}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
