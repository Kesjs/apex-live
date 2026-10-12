import type { FormeRecente, LettreForme } from '../domain/contracts'

const SENS: Record<LettreForme, string> = { V: 'victoire', N: 'nul', D: 'défaite' }

function Serie({ nom, serie }: { nom: string; serie: LettreForme[] }) {
  return (
    <div className="form-row">
      <span className="form-name">{nom}</span>
      <div className="form" role="img" aria-label={serie.map(l => SENS[l]).join(', ')}>
        {serie.map((l, i) => (
          <b key={i} className={'form-' + l}>
            {l}
          </b>
        ))}
      </div>
    </div>
  )
}

/** Forme récente des deux équipes (du plus ancien au plus récent). */
export function FormStrip({ forme, domicile, exterieur }: { forme: FormeRecente; domicile: string; exterieur: string }) {
  return (
    <div className="card form-card">
      <Serie nom={domicile} serie={forme.domicile} />
      <Serie nom={exterieur} serie={forme.exterieur} />
      <p className="muted small">V victoire · N nul · D défaite, du plus ancien au plus récent.</p>
    </div>
  )
}
