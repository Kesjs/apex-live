/** Configuration centralisée du partenaire bookmaker et du code promo Apex. */

export const PARTNER = {
  name: '1xBet',
  codePromo: 'kenken',
  badge: 'Partenaire cotes & bonus',
  headline: 'Jusqu’à 200 % de bonus de bienvenue sur votre 1er dépôt',
  shortPitch: 'Activez le code promo kenken lors de l’inscription sur 1xBet pour débloquer l’offre partenaire et suivre les cotes en direct.',
  ctaLabel: 'Copier le code kenken',
  visitLabel: 'Ouvrir 1xBet',
  legalNote: '18+ · Offre réservée aux nouveaux inscrits. Les paris comportent des risques : jouez de façon responsable.',
  affiliateUrl: (import.meta.env.VITE_AFFILIATE_URL as string | undefined)?.trim() || '',
} as const

export async function copyPartnerCode(): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(PARTNER.codePromo)
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}
