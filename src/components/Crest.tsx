import type { CSSProperties } from 'react'
import { hash, sigle } from '../lib/format'

/** Affiche l'écusson officiel quand la source le fournit, sinon un repli lisible. */
const PALETTE: Array<[string, string]> = [
  ['#143D31', '#7CF0C4'],
  ['#2C2A14', '#F4D56A'],
  ['#1B2B45', '#8DB8FF'],
  ['#3B1F2B', '#FF9DB5'],
  ['#2A2145', '#B9A6FF'],
  ['#3D2A16', '#FFB36B'],
  ['#12363D', '#6FE0F2'],
  ['#3A2018', '#FF8E72'],
]

export function Crest({ nom, logoUrl, taille = 'md' }: { nom: string; logoUrl?: string; taille?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const [fond, texte] = PALETTE[hash(nom) % PALETTE.length]
  const style = { '--crest-bg': fond, '--crest-fg': texte } as CSSProperties
  return (
    <span className={'crest crest-' + taille + (logoUrl ? ' has-logo' : '')} style={style} aria-hidden="true">
      {logoUrl ? <img src={logoUrl} alt="" loading="lazy" onError={event => { event.currentTarget.hidden = true }} /> : sigle(nom)}
    </span>
  )
}
