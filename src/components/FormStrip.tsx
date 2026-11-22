import type { FormeRecente, LettreForme, MatchHistorique } from '../domain/contracts'
import { Crest } from './Crest'

const SENS: Record<LettreForme, string> = { V: 'victoire', N: 'nul', D: 'défaite' }

function sameTeam(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\b(fc|cf|sc|ac|as|us|rc|og|afc|ssc|sl|cd|ud|sd|rcd)\b/g, '').replace(/[^a-z0-9]/g, '')
  const na = norm(a)
  const nb = norm(b)
  return na === nb || (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na)))
}

function outcomeForTeam(m: MatchHistorique, teamName: string): LettreForme {
  if (m.score_domicile === m.score_exterieur) return 'N'
  const isHome = sameTeam(m.domicile, teamName)
  const won = isHome ? m.score_domicile > m.score_exterieur : m.score_exterieur > m.score_domicile
  return won ? 'V' : 'D'
}

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

function ColonneMatchs({ nom, matchs }: { nom: string; matchs: MatchHistorique[] }) {
  return (
    <div className="team-form-col">
      <p className="team-form-head">{nom}</p>
      <ul className="team-form-list">
        {matchs.slice(0, 5).map(m => {
          const res = outcomeForTeam(m, nom)
          return (
            <li key={m.id} className="team-form-row" title={`${m.domicile} ${m.score_domicile}-${m.score_exterieur} ${m.exterieur}`}>
              <Crest nom={m.domicile} logoUrl={m.logo_domicile} taille="sm" />
              <span className={'team-form-score tn form-' + res}>
                {m.score_domicile}-{m.score_exterieur}
              </span>
              <Crest nom={m.exterieur} logoUrl={m.logo_exterieur} taille="sm" />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Forme récente des deux équipes (visuel matchs si disponible, sinon pastilles V/N/D). */
export function FormStrip({
  forme,
  domicile,
  exterieur,
  historique,
}: {
  forme: FormeRecente
  domicile: string
  exterieur: string
  historique?: { domicile: MatchHistorique[]; exterieur: MatchHistorique[] }
}) {
  const hasVisual = Boolean(historique && (historique.domicile.length > 0 || historique.exterieur.length > 0))
  if (hasVisual && historique) {
    return (
      <div className="card form-card">
        <div className="team-form-grid">
          <ColonneMatchs nom={domicile} matchs={historique.domicile} />
          <ColonneMatchs nom={exterieur} matchs={historique.exterieur} />
        </div>
        <p className="muted small">Vert : victoire · Gris : nul · Rouge : défaite (du plus récent au plus ancien).</p>
      </div>
    )
  }
  return (
    <div className="card form-card">
      <Serie nom={domicile} serie={forme.domicile} />
      <Serie nom={exterieur} serie={forme.exterieur} />
      <p className="muted small">V victoire · N nul · D défaite, du plus ancien au plus récent.</p>
    </div>
  )
}
