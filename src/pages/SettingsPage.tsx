import { Crest } from '../components/Crest'
import { Icon } from '../components/Icon'
import type { IconName } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { Disclaimer, SectionTitle } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useFavoris } from '../lib/favoris'
import { heureCourte, jourDeIso, quandLabel } from '../lib/format'
import { usePrefs } from '../lib/prefs'
import type { Prefs } from '../lib/prefs'
import { Link } from '../lib/router'

function Interrupteur({ cle, icone, titre, aide }: { cle: keyof Prefs; icone: IconName; titre: string; aide: string }) {
  const prefs = usePrefs()
  const actif = prefs[cle]
  return (
    <div className="setting">
      <Icon name={icone} size={22} />
      <span className="setting-txt">
        <strong id={'reglage-' + cle}>{titre}</strong>
        <small className="muted">{aide}</small>
      </span>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={actif}
        aria-labelledby={'reglage-' + cle}
        onClick={() => prefs.modifier(cle, !actif)}
      >
        <span className="switch-thumb" />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const { favoris, retirer } = useFavoris()
  const { utilisateur, deconnexion } = useAuth()

  return (
    <div className="page-body">
      <PageHeader titre="Réglages" sous="Vos préférences et vos matchs favoris, gardés sur cet appareil." />

      <div className="settings-grid">
        <section aria-labelledby="favoris" className="stack-sm">
          <SectionTitle id="favoris">Mes favoris</SectionTitle>
          {favoris.length === 0 ? (
            <div className="card state compact">
              <span className="state-icon">
                <Icon name="star" size={22} />
              </span>
              <p>Aucun favori pour l'instant. Touchez l'étoile sur la fiche d'un match pour le retrouver ici.</p>
              <Link to="/matchs" className="btn btn-secondary">
                Voir les matchs
              </Link>
            </div>
          ) : (
            <div className="card list">
              {favoris.map(f => (
                <div className="fav-row" key={f.id}>
                  <Link to={'/match/' + f.id} className="fav-main press">
                    <Crest nom={f.domicile} taille="sm" />
                    <span>
                      <strong>
                        {f.domicile} — {f.exterieur}
                      </strong>
                      <span className="muted small">
                        {f.competition} · {quandLabel(jourDeIso(f.date_heure))} · {heureCourte(f.date_heure)}
                      </span>
                    </span>
                  </Link>
                  <button type="button" className="icon-btn" aria-label={'Retirer ' + f.domicile + ' — ' + f.exterieur + ' des favoris'} onClick={() => retirer(f.id)}>
                    <Icon name="x" size={18} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="stack">
          <section aria-labelledby="compte" className="stack-sm">
            <SectionTitle id="compte">Compte</SectionTitle>
            <div className="card state compact">
              {utilisateur ? (
                <>
                  <p>
                    Connecté avec <strong>{utilisateur.email}</strong>
                  </p>
                  <button type="button" className="btn btn-secondary" onClick={deconnexion}>
                    Se déconnecter
                  </button>
                </>
              ) : (
                <>
                  <p>Vous utilisez Apex sans compte : tous les matchs et pronostics restent accessibles.</p>
                  <Link to="/connexion" className="btn btn-secondary">
                    Se connecter
                  </Link>
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="affichage" className="stack-sm">
            <SectionTitle id="affichage">Affichage</SectionTitle>
            <div className="card list">
              <Interrupteur cle="cotes" icone="chart" titre="Afficher les cotes" aide="Masque toutes les cotes et les écarts qui en dépendent." />
              <Interrupteur cle="animations" icone="sparkle" titre="Animations" aide="Désactive les mouvements et les compteurs animés." />
            </div>
          </section>

          <section aria-labelledby="apropos" className="stack-sm">
            <SectionTitle id="apropos">À propos</SectionTitle>
            <div className="card list">
              <details className="about">
                <summary>
                  <Icon name="info" size={22} />
                  <span>Comment Apex calcule</span>
                  <Icon name="down" size={18} strokeWidth={2} />
                </summary>
                <p>
                  Pour chaque match, Apex estime les buts attendus de chaque équipe à partir de ses 5 derniers matchs (toutes compétitions confondues), puis en déduit la
                  probabilité de chaque issue, du nombre de buts et du score exact le plus probable. Il y a toujours un pronostic ; quand une équipe a peu de matchs récents, il est signalé comme plus fragile. Le bonus (cartons, corners, fautes ou hors-jeu) n'apparaît
                  que lorsqu'un signal est net. Une IA choisit ensuite, parmi les options calculées, le pronostic de chaque pilier et explique son raisonnement ; elle ne
                  modifie pas les pourcentages. Ce sont des estimations, pas des certitudes.
                </p>
              </details>
              <details className="about">
                <summary>
                  <Icon name="shield" size={22} />
                  <span>Jeu responsable</span>
                  <Icon name="down" size={18} strokeWidth={2} />
                </summary>
                <p>
                  Les paris sportifs comportent un risque de perte. Ne misez que ce que vous pouvez vous permettre de perdre, fixez-vous des
                  limites et ne cherchez jamais à vous refaire. Réservé aux personnes majeures. En cas de difficulté, parlez-en à un proche
                  ou à un professionnel.
                </p>
              </details>
            </div>
          </section>
        </div>
      </div>

      <Disclaimer />
    </div>
  )
}
