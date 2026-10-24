import { useEffect, useState } from 'react'
import { provider } from '../data'
import type { Prediction } from '../domain/contracts'
import ApexPromoCarousel from '../components/ApexPromoCarousel'
import { Crest } from '../components/Crest'
import { FaitsDuMatch } from '../components/FaitsDuMatch'
import { FormStrip } from '../components/FormStrip'
import { Icon } from '../components/Icon'
import { KickoffCountdown } from '../components/KickoffCountdown'
import { PlusMoins } from '../components/PlusMoins'
import { BonusCard, ButsCard, IssueCard, ScoresCard } from '../components/PillarCards'
import { ResultMark } from '../components/ResultMark'
import { DetailSkeleton } from '../components/Skeletons'
import { StatsComparees } from '../components/StatsComparees'
import { Chip, Disclaimer, EmptyState, ErrorState, SectionTitle } from '../components/ui'
import { useFavoris } from '../lib/favoris'
import { heureCourte } from '../lib/format'
import { matchStatus } from '../lib/match-status'
import { Link, useRouter } from '../lib/router'
import { useAsync } from '../lib/useAsync'
import { FactorsCard, MatchSummary } from '../components/MatchInsights'
import '../components/MatchInsights.css'
import './MatchPage.css'

type Tab = 'resume' | 'stats' | 'analyse'
const dateMatch = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function Resultat({ fiche }: { fiche: Prediction }) {
  const r = fiche.resultat
  const status = matchStatus(fiche)
  return <section className="card match-result" aria-labelledby="resultat">
    <SectionTitle id="resultat">{status.final ? 'Résultat final' : status.label}</SectionTitle>
    {status.final ? <>
      <p className="result-headline">{fiche.equipes.domicile} <strong className="tn">{status.score}</strong> {fiche.equipes.exterieur}</p>
      {r.statut === 'evalue' && fiche.pronostics && <>
        <h3>Bilan des pronostics publiés</h3>
        <div className="rmarks"><ResultMark label="Issue" valeur={r.issue} /><ResultMark label="Buts" valeur={r.buts} /><ResultMark label="Bonus" valeur={r.bonus} /><ResultMark label="Score exact" valeur={r.score} /></div>
        {r.bonus_en_attente && <p className="muted small">Le résultat du bonus attend les statistiques d’événements. Le score final est confirmé.</p>}
      </>}
    </> : <p className="muted">{r.statut === 'annule' ? 'La rencontre est annulée ou reportée par la source. Les pronostics ne sont pas évalués.' : status.pending ? 'Le coup d’envoi prévu est passé. La source n’a pas encore confirmé le résultat ; aucun score ni statut en direct n’est déduit de l’heure.' : 'Le résultat sera affiché ici dès sa confirmation par la source.'}</p>}
  </section>
}

function Fiche({ fiche, retour, actualiser, enCours, erreur }: { fiche: Prediction; retour: string; actualiser: () => void; enCours: boolean; erreur: string | null }) {
  const { estFavori, basculer } = useFavoris()
  const [onglet, setOnglet] = useState<Tab>('resume')
  const [now, setNow] = useState(Date.now)
  const status = matchStatus(fiche, now)
  const p = fiche.pronostics
  useEffect(() => {
    document.title = fiche.equipes.domicile + ' – ' + fiche.equipes.exterieur + ' · Apex'
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [fiche])
  return <div className="page-body match-page">
    <header className="match-header card">
      <div className="topbar">
        <Link to={retour} className="icon-btn" aria-label="Retour"><Icon name="back" size={20} /></Link>
        <div className="match-heading"><Chip>{fiche.competition}</Chip><time dateTime={fiche.date_heure}>{dateMatch(fiche.date_heure)}</time></div>
        <button type="button" className={'icon-btn' + (estFavori(fiche.match_id) ? ' is-on' : '')} aria-pressed={estFavori(fiche.match_id)} aria-label={estFavori(fiche.match_id) ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={() => basculer(fiche)}><Icon name="star" size={20} filled={estFavori(fiche.match_id)} /></button>
      </div>
      <section className="match-hero" aria-label="Match">
        <div className="featured-team"><Crest nom={fiche.equipes.domicile} logoUrl={fiche.logos?.domicile} taille="xl" /><h1>{fiche.equipes.domicile}</h1></div>
        <div className="match-hero-mid"><p className="match-hero-time tn">{status.score ?? heureCourte(fiche.date_heure)}</p><Chip ton={status.final ? 'ac' : 'muet'}>{status.label}</Chip></div>
        <div className="featured-team"><Crest nom={fiche.equipes.exterieur} logoUrl={fiche.logos?.exterieur} taille="xl" /><h1>{fiche.equipes.exterieur}</h1></div>
      </section>
      <div className="match-freshness"><span>{status.label === 'À venir' ? <KickoffCountdown iso={fiche.date_heure} /> : status.final ? 'Score confirmé par ' + fiche.meta.source_stats : 'En attente de confirmation par la source'}</span><button type="button" className="refresh-match" disabled={enCours} onClick={actualiser}>{enCours ? 'Actualisation…' : 'Actualiser'}</button></div>
      {fiche.resultat.mis_a_jour_le && <p className="muted small center">Résultat actualisé le {dateMatch(fiche.resultat.mis_a_jour_le)}</p>}
      {erreur && <p role="status" className="refresh-error">{erreur} Les dernières données chargées restent affichées.</p>}
    </header>
    <nav className="match-tabs" aria-label="Sections du match">{([['resume', 'Résumé'], ['stats', 'Statistiques'], ['analyse', 'Analyse Apex']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={onglet === id} aria-controls="match-content" className={onglet === id ? 'is-active' : ''} onClick={() => setOnglet(id)}>{label}</button>)}</nav>
    <div className="detail-grid" id="match-content">
      <div className="stack match-main">
        {onglet === 'resume' && <>
          {status.label !== 'À venir' && <Resultat fiche={fiche} />}
          <FaitsDuMatch fiche={fiche} />
          {fiche.stats && <StatsComparees fiche={fiche} />}
          <section className="card match-coverage"><h2>Compositions et événements</h2><p className="muted small">Les compositions, buteurs, minutes de jeu et statistiques en direct ne sont pas disponibles dans la source actuelle. Ils seront affichés uniquement avec des données confirmées.</p></section>
          {p && <button className="btn btn-secondary" type="button" onClick={() => setOnglet('analyse')}>{status.final ? 'Voir l’analyse publiée avant le match' : 'Comprendre les pronostics Apex'}<Icon name="chevron" size={16} /></button>}
        </>}
        {onglet === 'stats' && <>
          {fiche.stats ? <><StatsComparees fiche={fiche} /><PlusMoins fiche={fiche} /></> : <section className="card state"><h2>Statistiques indisponibles</h2><p>Aucune statistique détaillée n’est disponible pour cette rencontre.</p></section>}
          <section className="card match-coverage"><h2>Périmètre des données</h2><p className="muted small">Ces chiffres décrivent les rencontres précédant le coup d’envoi. Ils ne représentent pas la possession, les tirs ou les événements de ce match. Source : {fiche.meta.source_stats}.</p></section>
        </>}
        {onglet === 'analyse' && <>
          <div className="analysis-notice"><Icon name="info" size={18} /><p>{status.final ? 'Analyse d’avant-match conservée pour comparer les prévisions au résultat réel.' : 'Estimations d’avant-match : les probabilités ne garantissent aucun résultat.'}</p></div>
          {fiche.meta.retrocalcul && <Chip ton="muet">Rétro-calcul avec les données antérieures au match</Chip>}
          {fiche.meta.donnees_limitees && <Chip ton="am">Historique incomplet : estimations plus fragiles</Chip>}
          {p ? <><MatchSummary fiche={fiche} /><div className="prediction-grid"><IssueCard p={p.issue} valeur={fiche.value} delai={0} /><ButsCard p={p.buts} valeur={fiche.value} delai={0} /><BonusCard p={p.bonus} delai={0} /><ScoresCard scores={p.scores} delai={0} /></div><FactorsCard fiche={fiche} /></> : <section className="card state"><h2>Pas de pronostic publié</h2><p>{fiche.raison_absence ?? 'Les données disponibles sont insuffisantes.'}</p></section>}
          {status.final && <Resultat fiche={fiche} />}
          <p className="muted small">Analyse générée le {dateMatch(fiche.meta.genere_le)} · Moteur {fiche.meta.version_moteur}.</p>
        </>}
      </div>
      <aside className="stack match-context" aria-label="Contexte du match">
        {fiche.forme && <section className="stack-sm"><SectionTitle id="forme">Forme avant le match</SectionTitle><FormStrip forme={fiche.forme} domicile={fiche.equipes.domicile} exterieur={fiche.equipes.exterieur} /></section>}
        <section className="card match-coverage"><h2>Confrontations directes</h2><p className="muted small">L’historique des confrontations entre ces deux équipes n’est pas fourni dans cette fiche.</p></section>
        <section className="match-ad stack-sm" aria-label="Offre partenaire"><SectionTitle id="offre-partenaire" aside={<span className="muted small">Publicité</span>}>Partenaire</SectionTitle><ApexPromoCarousel /><p className="muted small">Contenu sponsorisé, indépendant de l’analyse Apex.</p></section>
      </aside>
    </div>
    <Disclaimer />
  </div>
}

export default function MatchPage({ matchId }: { matchId: string }) {
  const { precedent } = useRouter()
  const [etat, reessayer] = useAsync(() => provider.getMatch(matchId), [matchId])
  const [fresh, setFresh] = useState<Prediction | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const fiche = fresh?.match_id === matchId ? fresh : etat.status === 'ready' ? etat.data : null
  useEffect(() => {
    let active = true
    let busy = false
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || busy) return
      busy = true
      try { const next = await provider.getMatch(matchId); if (active && next) setFresh(next) } catch { /* A background failure keeps the last confirmed data. */ }
      finally { busy = false }
    }
    const timer = window.setInterval(refresh, 60_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [matchId])
  async function actualiser() {
    setEnCours(true); setErreur(null)
    try { const next = await provider.getMatch(matchId); if (next) setFresh(next); else setErreur('La rencontre est momentanément indisponible.') }
    catch { setErreur('Impossible d’actualiser la rencontre.') }
    finally { setEnCours(false) }
  }
  if (!fiche && etat.status === 'loading') return <div className="page-body"><DetailSkeleton /></div>
  if (!fiche && etat.status === 'error') return <div className="page-body"><ErrorState message={etat.error.message} onRetry={reessayer} /></div>
  if (!fiche) return <div className="page-body"><EmptyState titre="Match introuvable" texte="Cette rencontre n’est plus disponible." action={<Link to="/matchs" className="btn btn-secondary">Voir les matchs</Link>} /></div>
  return <Fiche key={matchId} fiche={fiche} retour={precedent && precedent !== '/reglages' ? precedent : '/'} actualiser={actualiser} enCours={enCours} erreur={erreur} />
}
