import { useEffect, useRef } from 'react'
import { addDays, jourCourtLabel, jourLongLabel, jourNumero, todayISO } from '../lib/format'

type DateRailProps = {
  jour: string
  onChange: (jour: string) => void
  nombre?: number
  /** Jours passés affichés avant aujourd'hui. */
  avant?: number
}

/** Sélecteur de jour : quelques jours passés (résultats), aujourd'hui, puis les jours suivants. */
export function DateRail({ jour, onChange, nombre = 7, avant = 3 }: DateRailProps) {
  const aujourdhui = todayISO()
  const jours = Array.from({ length: nombre + avant }, (_, i) => addDays(aujourdhui, i - avant))
  const rail = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // Centre le jour choisi (sans faire défiler la page).
    const bouton = rail.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    const zone = rail.current
    if (bouton && zone) zone.scrollLeft = bouton.offsetLeft - zone.clientWidth / 2 + bouton.clientWidth / 2
  }, [jour])
  return (
    <div ref={rail} className="rail date-rail" role="group" aria-label="Choisir le jour">
      {jours.map((j, i) => (
        <button
          type="button"
          key={j}
          className="date-btn"
          aria-pressed={j === jour}
          aria-label={jourLongLabel(j)}
          onClick={() => onChange(j)}
        >
          <span>{j === aujourdhui ? 'Auj.' : jourCourtLabel(j)}</span>
          <strong>{jourNumero(j)}</strong>
        </button>
      ))}
    </div>
  )
}
