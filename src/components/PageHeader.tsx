import type { ReactNode } from 'react'
import { provider } from '../data'
import { Chip } from './ui'

/** En-tête de page : titre, sous-titre et, si besoin, le badge « données de démonstration ». */
export function PageHeader({ titre, sous, droite }: { titre: string; sous?: string; droite?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{titre}</h1>
        {sous && <p className="muted">{sous}</p>}
      </div>
      <div className="page-header-right">
        {provider.modeLabel && <Chip ton="muet">{provider.modeLabel}</Chip>}
        {droite}
      </div>
    </header>
  )
}
