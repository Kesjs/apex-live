import type { CSSProperties } from 'react'
import { hash, sigle } from '../lib/format'

/** Pastilles de couleur pour les équipes (pas de logos : pas de droits à gérer). */
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

export function Crest({ nom, taille = 'md' }: { nom: string; taille?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const [fond, texte] = PALETTE[hash(nom) % PALETTE.length]
  const style = { '--crest-bg': fond, '--crest-fg': texte } as CSSProperties
  return (
    <span className={'crest crest-' + taille} style={style} aria-hidden="true">
      {sigle(nom)}
    </span>
  )
}
