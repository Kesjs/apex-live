import { useMemo, useState } from 'react'
import type { MatchHistorique, Prediction } from '../domain/contracts'
import { Crest } from './Crest'
import { SectionTitle } from './ui'

type VueH2H = 'domicile' | 'h2h' | 'exterieur'

function dateCourte(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function sameTeam(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\b(fc|cf|sc|ac|as|us|rc|og|afc|ssc|sl|cd|ud|sd|rcd)\b/g, '').replace(/[^a-z0-9]/g, '')
  const na = norm(a)
  const nb = norm(b)
  return na === nb || (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na)))
}

function grouperParCompetition(matchs: MatchHistorique[]): Array<{ competition: string; items: MatchHistorique[] }> {
  const map = new Map<string, MatchHistorique[]>()
  for (const m of matchs) {
    const key = m.competition || 'Compétition'
    const list = map.get(key)
    if (list) list.push(m)
    else map.set(key, [m])
  }
  return Array.from(map.entries()).map(([competition, items]) => ({ competition, items }))
}

function ListeMatchsH2H({ matchs }: { matchs: MatchHistorique[] }) {
  const groupes = useMemo(() => grouperParCompetition(matchs), [matchs])
  if (matchs.length === 0) {
    return (
      <section className="card state">
        <h2>Aucune rencontre disponible</h2>
        <p>Aucun match passé correspondant à ces critères n’est disponible pour le moment.</p>
      </section>
    )
  }
  return (
    <section className="card h2h-list-card">
      <SectionTitle id="h2h-liste">Dernières confrontations</SectionTitle>
      <div className="h2h-groups">
        {groupes.map(g => (
          <div key={g.competition} className="h2h-group">
            <p className="h2h-comp-label">{g.competition}</p>
            <ul className="h2h-rows">
              {g.items.map(m => {
                const domGagne = m.score_domicile > m.score_exterieur
                const extGagne = m.score_exterieur > m.score_domicile
                return (
                  <li key={m.id} className="h2h-row">
                    <div className="h2h-date">
                      <span className="tn">{dateCourte(m.date_heure)}</span>
                      <span className="muted">FT</span>
                    </div>
                    <div className="h2h-teams">
                      <div className={'h2h-team' + (domGagne ? ' is-winner' : '')}>
                        <Crest nom={m.domicile} logoUrl={m.logo_domicile} taille="sm" />
                        <span>{m.domicile}</span>
                      </div>
                      <div className={'h2h-team' + (extGagne ? ' is-winner' : '')}>
                        <Crest nom={m.exterieur} logoUrl={m.logo_exterieur} taille="sm" />
                        <span>{m.exterieur}</span>
                      </div>
                    </div>
                    <div className="h2h-scores tn">
                      <span className={domGagne ? 'is-winner' : ''}>{m.score_domicile}</span>
                      <span className={extGagne ? 'is-winner' : ''}>{m.score_exterieur}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

export function ConfrontationH2H({ fiche }: { fiche: Prediction }) {
  const [vue, setVue] = useState<VueH2H>('h2h')
  const [filtreDomicile, setFiltreDomicile] = useState(false)
  const [filtreCompetition, setFiltreCompetition] = useState(false)

  const h2hMatchs = useMemo(() => {
    const base = fiche.h2h?.matchs ?? []
    return base.filter(m => {
      if (filtreDomicile && !sameTeam(m.domicile, fiche.equipes.domicile)) return false
      if (filtreCompetition && m.competition !== fiche.competition) return false
      return true
    })
  }, [fiche.h2h?.matchs, fiche.equipes.domicile, fiche.competition, filtreDomicile, filtreCompetition])

  const bilan = useMemo(() => {
    if (!filtreDomicile && !filtreCompetition && fiche.h2h) {
      return {
        total: fiche.h2h.total,
        dom: fiche.h2h.victoires_domicile,
        nuls: fiche.h2h.nuls,
        ext: fiche.h2h.victoires_exterieur,
      }
    }
    let dom = 0
    let nuls = 0
    let ext = 0
    for (const m of h2hMatchs) {
      if (m.score_domicile === m.score_exterieur) {
        nuls++
      } else {
        const domWon = m.score_domicile > m.score_exterieur
        const currentDomIsHome = sameTeam(m.domicile, fiche.equipes.domicile)
        if ((domWon && currentDomIsHome) || (!domWon && !currentDomIsHome)) dom++
        else ext++
      }
    }
    return { total: h2hMatchs.length, dom, nuls, ext }
  }, [filtreDomicile, filtreCompetition, fiche.h2h, fiche.equipes.domicile, h2hMatchs])

  const matchsAffiches =
    vue === 'h2h'
      ? h2hMatchs
      : vue === 'domicile'
        ? fiche.historique_equipes?.domicile ?? []
        : fiche.historique_equipes?.exterieur ?? []

  const pctDom = bilan.total > 0 ? Math.round((bilan.dom / bilan.total) * 100) : 0
  const pctNul = bilan.total > 0 ? Math.round((bilan.nuls / bilan.total) * 100) : 0
  const pctExt = bilan.total > 0 ? Math.max(0, 100 - pctDom - pctNul) : 0

  return (
    <div className="stack h2h-wrap">
      <div className="h2h-controls">
        <div className="h2h-switcher" role="tablist" aria-label="Choisir l'historique">
          <button
            type="button"
            role="tab"
            aria-selected={vue === 'domicile'}
            aria-label={fiche.equipes.domicile}
            className={vue === 'domicile' ? 'is-active' : ''}
            onClick={() => setVue('domicile')}
          >
            <Crest nom={fiche.equipes.domicile} logoUrl={fiche.logos?.domicile} taille="sm" />
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vue === 'h2h'}
            className={vue === 'h2h' ? 'is-active' : ''}
            onClick={() => setVue('h2h')}
          >
            H2H
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vue === 'exterieur'}
            aria-label={fiche.equipes.exterieur}
            className={vue === 'exterieur' ? 'is-active' : ''}
            onClick={() => setVue('exterieur')}
          >
            <Crest nom={fiche.equipes.exterieur} logoUrl={fiche.logos?.exterieur} taille="sm" />
          </button>
        </div>

        {vue === 'h2h' && (
          <div className="h2h-filters">
            <button
              type="button"
              aria-pressed={filtreDomicile}
              className={'h2h-chip' + (filtreDomicile ? ' is-on' : '')}
              onClick={() => setFiltreDomicile(v => !v)}
            >
              Chez {fiche.equipes.domicile}
            </button>
            <button
              type="button"
              aria-pressed={filtreCompetition}
              className={'h2h-chip' + (filtreCompetition ? ' is-on' : '')}
              onClick={() => setFiltreCompetition(v => !v)}
            >
              Cette compétition
            </button>
          </div>
        )}
      </div>

      {vue === 'h2h' && bilan.total > 0 && (
        <section className="card h2h-summary" aria-labelledby="h2h-bilan">
          <SectionTitle id="h2h-bilan">Bilan des confrontations</SectionTitle>
          <div className="h2h-bar" role="img" aria-label={`${bilan.dom} victoires ${fiche.equipes.domicile}, ${bilan.nuls} nuls, ${bilan.ext} victoires ${fiche.equipes.exterieur}`}>
            {pctDom > 0 && <span className="h2h-seg-dom" style={{ width: `${pctDom}%` }} />}
            {pctNul > 0 && <span className="h2h-seg-nul" style={{ width: `${pctNul}%` }} />}
            {pctExt > 0 && <span className="h2h-seg-ext" style={{ width: `${pctExt}%` }} />}
          </div>
          <div className="h2h-bilan-labels tn">
            <span><strong>{bilan.dom}</strong> {bilan.dom > 1 ? 'Victoires' : 'Victoire'}</span>
            <span className="muted"><strong>{bilan.nuls}</strong> {bilan.nuls > 1 ? 'Nuls' : 'Nul'}</span>
            <span><strong>{bilan.ext}</strong> {bilan.ext > 1 ? 'Victoires' : 'Victoire'}</span>
          </div>
        </section>
      )}

      <ListeMatchsH2H matchs={matchsAffiches} />
    </div>
  )
}
