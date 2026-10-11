import { useState } from 'react'
import { ArrowRight, BookmarkSimple, CalendarBlank, CaretLeft, CaretRight, CheckCircle, Info, SoccerBall, Trophy, WarningCircle } from '@phosphor-icons/react'
import { dates, getDayFixture, scenarioLabels, type MatchFixture, type Scenario } from './data/demo'

type HomePanel = { type: 'provenance' | 'analysis' | 'match' | 'account'; match?: MatchFixture }
type Props = {
  loaded: boolean; dateIndex: number; setDateIndex: (index: number) => void;
  scenario: Scenario; setScenario: (value: Scenario) => void;
  revision: number; setRevision: (value: number) => void;
  fixture: ReturnType<typeof getDayFixture>; open: (panel: HomePanel) => void; navigate: (path: string) => void;
}

function Crest({ initials, away = false }: { initials: string; away?: boolean }) {
  return <span className={'home-crest' + (away ? ' away' : '')} aria-hidden="true">{initials}</span>
}

function Source({ observed, freshness, open }: { observed: string; freshness: string; open: () => void }) {
  return <div className="home-source"><div><span>Source : fixtures Apex</span><span>{freshness === 'Indisponible' ? 'Observation indisponible' : 'Observé le ' + observed}</span><span>Fraîcheur : {freshness}</span></div><button className="icon-button" aria-label="Détails de provenance" onClick={open}><Info size={18} /></button></div>
}

export default function Home({ loaded, dateIndex, setDateIndex, scenario, setScenario, revision, setRevision, fixture, open, navigate }: Props) {
  const [filter, setFilter] = useState<'all' | 'available'>('all')
  const unavailable = scenario === 'error' || scenario === 'empty'
  const available = scenario === 'success'
  const match = fixture.featured
  const matches = fixture.upcoming.filter(item => filter === 'all' || (available && item.status === 'available'))
  const competitions = [...new Set(matches.map(item => item.competition))]
  const status = (item: MatchFixture) => scenario === 'stale' ? 'Analyse suspendue' : scenario === 'insufficient' || item.status === 'limited' ? 'Données insuffisantes' : item.status === 'available' ? 'Analyse disponible' : 'Analyse à venir'
  return <div className="home-surface">
    <section className="home-toolbar" aria-label="Sélection de la journée">
      <div className="home-date-line">
        <button className="date-arrow" aria-label="Jour précédent" disabled={dateIndex === 0} onClick={() => setDateIndex(dateIndex - 1)}><CaretLeft size={19} /></button>
        <label className="home-date-choice"><CalendarBlank size={18} aria-hidden="true" /><span className="sr-only">Date des matchs</span><select value={dateIndex} onChange={event => setDateIndex(Number(event.target.value))}>{dates.map((date, index) => <option key={date.iso} value={index}>{index === 2 ? 'Aujourd’hui · 8 octobre' : date.long.replace(' 2026', '')}</option>)}</select></label>
        <button className="date-arrow" aria-label="Jour suivant" disabled={dateIndex === dates.length - 1} onClick={() => setDateIndex(dateIndex + 1)}><CaretRight size={19} /></button>
      </div>
      <div className="home-filter-line" role="group" aria-label="Filtrer les prochains matchs"><button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Tous les matchs</button><button aria-pressed={filter === 'available'} onClick={() => setFilter('available')}>Analyses disponibles</button><span>Heures UTC+2</span></div>
    </section>
    <p className="sr-only" role="status">{loaded ? 'Journée chargée : ' + fixture.date.long : 'Chargement de la journée : ' + fixture.date.long}</p>
    <div className="home-layout" aria-busy={!loaded}>
      <section className="home-featured" aria-labelledby="featured-title">
        <div className="home-section-heading"><h2 id="featured-title">Match vedette</h2>{!unavailable && <button className="icon-button" aria-label="Ajouter le match vedette aux favoris" disabled={!loaded} onClick={() => open({ type: 'account' })}><BookmarkSimple size={20} /></button>}</div>
        {!loaded ? <div className="home-skeleton featured-skeleton" aria-hidden="true"><span /><span /><span /></div> : unavailable ? <div className="home-state"><WarningCircle size={24} /><h3>{scenario === 'error' ? 'Données temporairement indisponibles' : 'Aucun match pertinent'}</h3><p>{scenario === 'error' ? 'La source de démonstration ne répond pas. Aucune rencontre de remplacement n’est affichée.' : 'Aucune rencontre ne remplit les critères d’analyse pour cette journée fictive.'}</p><button className="home-action" onClick={() => { if (scenario === 'error') { setScenario('success'); setRevision(revision + 1) } else { setDateIndex((dateIndex + 1) % dates.length); setScenario('success') } }}>{scenario === 'error' ? 'Réessayer' : 'Consulter une autre journée'}<ArrowRight size={16} /></button></div> : <>
          <div className="home-match-meta"><span><Trophy size={16} />{match.competition}</span><span className={available ? 'home-analysis-status' : ''}>{status(match)}</span></div>
          <button className="home-feature-match" aria-label={'Détails du match ' + match.home + ' contre ' + match.away} onClick={() => open({ type: 'match', match })}><span className="home-team"><Crest initials={match.homeInitials} /><strong>{match.home}</strong></span><span className="home-kickoff"><time>{match.time}</time><span>À venir</span></span><span className="home-team"><Crest initials={match.awayInitials} away /><strong>{match.away}</strong></span></button>
          <div className="home-selection"><h3>Pourquoi ce match ?</h3><p>{available ? 'Forme récente comparable et historique de buts exploitable. Une analyse est disponible.' : 'Une rencontre à examiner, mais les données ne permettent pas de publier une analyse.'}</p></div>
          <div className="home-feature-actions"><button className="home-action" disabled={!available} onClick={() => open({ type: 'analysis', match })}>Voir l’analyse<ArrowRight size={17} /></button>{!available && <span>Aucune recommandation proposée</span>}</div>
          <Source observed={match.observed} freshness={fixture.freshness} open={() => open({ type: 'provenance', match })} />
        </>}
      </section>
      <section className="home-analysis" aria-labelledby="analysis-title">
        <div className="home-section-heading"><h2 id="analysis-title">Apex IA</h2><span className="home-section-caption">Aperçu analytique</span></div>
        {!loaded ? <div className="home-skeleton analysis-skeleton" aria-hidden="true"><span /><span /><span /><span /></div> : unavailable ? <div className="home-state"><Info size={23} /><h3>Aucune analyse disponible</h3><p>{scenario === 'empty' ? 'Aucun match sélectionné pour cette journée.' : 'L’analyse attend des données disponibles et vérifiables.'}</p></div> : <>
          <p className="home-analysis-match">{match.home} — {match.away}</p>
          <div className="home-solidarity"><span>Solidité analytique</span><strong>{available ? 'Élevée' : scenario === 'stale' ? 'Suspendue' : 'Non évaluée'}</strong></div>
          <p className="home-definition">Qualité des données et cohérence de l’analyse. Aucun résultat garanti.</p>
          {available ? <><p className="home-analysis-summary">La forme récente permet une comparaison. Les absences restent à confirmer.</p><h3>Facteurs principaux</h3><ul className="home-factors"><li><CheckCircle size={17} />Forme récente comparable</li><li><CheckCircle size={17} />Historique de buts exploitable</li></ul><div className="home-risk"><WarningCircle size={17} /><div><h3>Point de vigilance</h3><p>Les absences sont encore incomplètes.</p></div></div></> : <div className="home-limited"><h3>{scenario === 'stale' ? 'Données périmées' : 'Données insuffisantes'}</h3><p>{scenario === 'stale' ? 'Observation vieille de 48 h. L’analyse reste suspendue.' : 'Aucune recommandation n’est publiée sans données suffisantes.'}</p></div>}
          <button className="home-analysis-link" disabled={!available} onClick={() => open({ type: 'analysis', match })}>Voir l’analyse complète<ArrowRight size={17} /></button>
          <Source observed={match.observed} freshness={fixture.freshness} open={() => open({ type: 'provenance', match })} />
        </>}
      </section>
      <section className="home-upcoming" aria-labelledby="upcoming-title"><div className="home-section-heading"><h2 id="upcoming-title">Prochains matchs</h2><a href="/matchs" className="home-all-matches" onClick={event => { event.preventDefault(); navigate('/matchs') }}>Voir tous<ArrowRight size={16} /></a></div>
        {!loaded ? <div className="home-skeleton feed-skeleton" aria-hidden="true"><span /><span /><span /></div> : matches.length === 0 ? <div className="home-feed-empty"><SoccerBall size={22} /><p>{scenario === 'error' ? 'Les prochains matchs sont indisponibles.' : filter === 'available' ? 'Aucune analyse disponible dans cette sélection.' : 'Aucun prochain match pertinent pour cette journée.'}</p>{filter === 'available' && <button onClick={() => setFilter('all')}>Afficher tous les matchs</button>}</div> : <div className="home-leagues">{competitions.map(competition => <section className="home-league" key={competition} aria-label={competition}><h3><Trophy size={17} />{competition}</h3><ul>{matches.filter(item => item.competition === competition).map(item => <li key={item.id}><button className="home-fixture-row" onClick={() => open({ type: 'match', match: item })}><time>{item.time}</time><span className="home-row-teams"><span><Crest initials={item.homeInitials} /><strong>{item.home}</strong></span><span><Crest initials={item.awayInitials} away /><span>{item.away}</span></span></span><span className="home-row-status">{status(item)}</span><CaretRight size={17} aria-hidden="true" /></button></li>)}</ul></section>)}</div>}
        {loaded && <Source observed={fixture.observed} freshness={fixture.freshness} open={() => open({ type: 'provenance' })} />}
      </section>
    </div>
    <details className="demo-controls"><summary>Explorer les états de démonstration</summary><label htmlFor="scenario">État simulé de l’Accueil</label><select id="scenario" value={scenario} onChange={event => setScenario(event.target.value as Scenario)}>{Object.entries(scenarioLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></details>
  </div>
}
