import { useEffect, useState } from 'react'
import { heureCourte } from '../lib/format'

function libelle(iso: string, maintenant: number): string {
  const ecart = new Date(iso).getTime() - maintenant
  if (!Number.isFinite(ecart)) return heureCourte(iso)
  if (ecart <= 0) return ecart < -3 * 3600_000 ? 'Résultat indisponible' : 'Statut en attente'
  const minutes = Math.ceil(ecart / 60_000)
  if (minutes < 60) return `Dans ${minutes} min`
  const heures = Math.floor(minutes / 60)
  const reste = minutes % 60
  if (heures < 24) return reste ? `Dans ${heures} h ${reste}` : `Dans ${heures} h`
  const jours = Math.floor(heures / 24)
  return `Dans ${jours} j`
}

export function KickoffCountdown({ iso }: { iso: string }) {
  const [maintenant, setMaintenant] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setMaintenant(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  return <span className="kickoff-countdown" title={'Coup d’envoi à ' + heureCourte(iso)}>{libelle(iso, maintenant)}</span>
}
