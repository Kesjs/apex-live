import { Crest } from '../components/Crest'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/ui'
import { useFavoris } from '../lib/favoris'
import { heureCourte, jourDeIso, quandLabel } from '../lib/format'
import { Link } from '../lib/router'

export default function FavoritesPage() {
  const { favoris, retirer } = useFavoris()

  return (
    <div className="page-body favorites-page">
      <PageHeader
        titre="Favoris"
        sous="Vos matchs enregistrés pour un suivi rapide des pronostics et résultats."
        droite={
          favoris.length > 0 ? (
            <span className="chip chip-ac">
              {favoris.length} {favoris.length === 1 ? 'match favori' : 'matchs favoris'}
            </span>
          ) : undefined
        }
      />

      {favoris.length === 0 ? (
        <EmptyState
          titre="Aucun favori pour l'instant"
          texte="Touchez l'étoile sur la fiche d'un match pour l'enregistrer et le retrouver immédiatement ici."
          action={
            <Link to="/matchs" className="btn btn-primary">
              <Icon name="ball" size={18} />
              <span>Explorer les matchs</span>
            </Link>
          }
        />
      ) : (
        <section aria-labelledby="mes-favoris-titre" className="stack-sm">
          <div className="section-title">
            <h2 id="mes-favoris-titre">Matchs enregistrés</h2>
          </div>
          <div className="card list">
            {favoris.map(f => (
              <div className="fav-row" key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--ln)' }}>
                <Link
                  to={'/match/' + f.id}
                  className="fav-main press"
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
                >
                  <Crest nom={f.domicile} taille="sm" />
                  <div style={{ minWidth: 0, overflow: 'hidden' }}>
                    <strong style={{ display: 'block', fontSize: '15px', color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {f.domicile} · {f.exterieur}
                    </strong>
                    <span className="muted small" style={{ display: 'block', fontSize: '12.5px', color: 'var(--mu)', marginTop: '2px' }}>
                      {f.competition} · {quandLabel(jourDeIso(f.date_heure))} · {heureCourte(f.date_heure)}
                    </span>
                  </div>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                  <Link
                    to={'/match/' + f.id}
                    className="btn btn-secondary"
                    style={{ minHeight: '36px', padding: '0 12px', fontSize: '12px', borderRadius: '10px' }}
                  >
                    Voir l'analyse
                  </Link>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={'Retirer ' + f.domicile + ' · ' + f.exterieur + ' des favoris'}
                    onClick={() => retirer(f.id)}
                    title="Retirer des favoris"
                  >
                    <Icon name="x" size={17} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
