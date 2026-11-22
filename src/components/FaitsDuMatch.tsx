import { faitsDuMatch } from '../lib/faits'
import type { Prediction } from '../domain/contracts'
import { Crest } from './Crest'
import { SectionTitle } from './ui'

/** Séries et faits marquants tirés de la forme et des statistiques, avec écusson et compteur. */
export function FaitsDuMatch({ fiche }: { fiche: Prediction }) {
  const faits = faitsDuMatch(fiche)
  if (faits.length === 0) return null
  return (
    <section aria-labelledby="faits" className="stack-sm">
      <SectionTitle id="faits">Séries &amp; faits marquants</SectionTitle>
      <ul className="facts">
        {faits.map((f, i) => {
          const nom = f.equipe === 'domicile' ? fiche.equipes.domicile : fiche.equipes.exterieur
          const logo = f.equipe === 'domicile' ? fiche.logos?.domicile : fiche.logos?.exterieur
          return (
            <li key={i} className="card fact">
              <Crest nom={nom} logoUrl={logo} taille="sm" />
              <p>
                {f.avant}
                <strong className={'fact-key fact-' + f.ton}>{f.cle}</strong>
                {f.apres}
              </p>
              {f.badge && <span className={'fact-badge fact-' + f.ton}>{f.badge}</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
