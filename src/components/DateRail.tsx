import { addDays, jourCourtLabel, jourLongLabel, jourNumero, todayISO } from '../lib/format'

type DateRailProps = {
  jour: string
  onChange: (jour: string) => void
  nombre?: number
}

/** Sélecteur de jour : aujourd'hui puis les jours suivants. */
export function DateRail({ jour, onChange, nombre = 7 }: DateRailProps) {
  const debut = todayISO()
  const jours = Array.from({ length: nombre }, (_, i) => addDays(debut, i))
  return (
    <div className="rail date-rail" role="group" aria-label="Choisir le jour">
      {jours.map((j, i) => (
        <button
          type="button"
          key={j}
          className="date-btn"
          aria-pressed={j === jour}
          aria-label={jourLongLabel(j)}
          onClick={() => onChange(j)}
        >
          <span>{i === 0 ? 'Auj.' : jourCourtLabel(j)}</span>
          <strong>{jourNumero(j)}</strong>
        </button>
      ))}
    </div>
  )
}
