import { Icon } from './Icon'

/** ✓ réussi, ✗ raté, – non évalué. Jamais la couleur seule : l'icône et le texte masqué portent le sens. */
export function ResultMark({ label, valeur }: { label: string; valeur: boolean | null }) {
  const etat = valeur === null ? 'na' : valeur ? 'ok' : 'ko'
  const texte = valeur === null ? 'non évalué' : valeur ? 'réussi' : 'raté'
  return (
    <span className="rmark">
      <span className={'rmark-box rmark-' + etat}>
        <Icon name={valeur === null ? 'minus' : valeur ? 'check' : 'x'} size={16} strokeWidth={2.4} />
      </span>
      <span className="rmark-label">{label}</span>
      <span className="sr-only">{texte}</span>
    </span>
  )
}
