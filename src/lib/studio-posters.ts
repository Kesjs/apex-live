import type { Prediction } from '../domain/contracts'
import { heureCourte, pct } from './format'

export type CouponTheme = 'securite' | 'equilibre' | 'buts'

export interface CouponPick {
  match: Prediction
  optionLabel: string
  marketKey: string
  probPct: number
}

export interface StudioCoupon {
  theme: CouponTheme
  title: string
  subtitle: string
  accent: string
  picks: CouponPick[]
}

function seededRandom(seed: number): () => number {
  let s = (seed + 1) * 2654435761
  return () => {
    s = (s ^ (s << 13)) >>> 0
    s = (s ^ (s >> 17)) >>> 0
    s = (s ^ (s << 5)) >>> 0
    return (s >>> 0) / 4294967296
  }
}

function shuffleWith<T>(arr: T[], rand: () => number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function pickOptionForTheme(m: Prediction, theme: CouponTheme, usedMarket?: string): CouponPick | null {
  const p = m.pronostics
  if (!p) return null

  const issueCourt = p.issue.court ?? p.issue.selection
  const butsCourt = p.buts.court ?? p.buts.selection
  const pIssue = Math.round(p.issue.probabilite * 100)
  const pButs = Math.round(p.buts.probabilite * 100)

  const candidates: Array<{ label: string; key: string; prob: number; themes: CouponTheme[] }> = [
    {
      label: `${issueCourt} & +1,5 buts`,
      key: 'combo_dc_buts',
      prob: Math.max(52, Math.round((pIssue + pButs) / 2 - 4)),
      themes: ['securite', 'equilibre'],
    },
    {
      label: issueCourt.includes('X') ? `Double chance ${issueCourt}` : `Victoire ${issueCourt}`,
      key: 'issue',
      prob: pIssue,
      themes: issueCourt.includes('X') ? ['securite', 'equilibre'] : ['equilibre'],
    },
    {
      label: butsCourt.includes('+') || butsCourt.includes('-') ? `${butsCourt} buts` : butsCourt,
      key: 'buts',
      prob: pButs,
      themes: ['buts', 'securite'],
    },
  ]

  if (p.buts.probabilite >= 0.55) {
    candidates.push({
      label: '+1,5 buts',
      key: 'over15',
      prob: Math.min(88, Math.max(66, pButs + 8)),
      themes: ['buts', 'securite'],
    })
  }

  const eligible = candidates
    .filter(c => c.themes.includes(theme) && c.key !== usedMarket)
    .sort((a, b) => b.prob - a.prob)

  const chosen = eligible[0] ?? candidates.find(c => c.key !== usedMarket) ?? candidates[0]
  return {
    match: m,
    optionLabel: chosen.label,
    marketKey: chosen.key,
    probPct: chosen.prob,
  }
}

/**
 * Construit 3 combinés distincts de 4 à 5 matchs parmi les matchs les plus abordables.
 * Garantit l'absence de doublons entre les 3 affiches tant qu'il y a assez de matchs.
 */
export function buildThreeCoupons(matches: Prediction[], countPerPoster: 4 | 5, seed: number): StudioCoupon[] {
  const rand = seededRandom(seed)
  const withPronos = matches.filter(m => m.pronostics !== null)

  // Trier par meilleure probabilité globale (matchs abordables en priorité), puis garder le top 75% et mélanger
  const ranked = [...withPronos].sort((a, b) => {
    const pa = Math.max(a.pronostics?.issue.probabilite ?? 0, a.pronostics?.buts.probabilite ?? 0)
    const pb = Math.max(b.pronostics?.issue.probabilite ?? 0, b.pronostics?.buts.probabilite ?? 0)
    return pb - pa
  })
  const poolSize = Math.max(Math.min(ranked.length, countPerPoster * 3), Math.ceil(ranked.length * 0.75))
  const affordablePool = shuffleWith(ranked.slice(0, poolSize), rand)

  const defs: Array<{ theme: CouponTheme; title: string; subtitle: string; accent: string }> = [
    { theme: 'securite', title: 'TICKET SÉCURITÉ', subtitle: 'Double chance & combinaisons prudentes', accent: '#10b981' },
    { theme: 'equilibre', title: 'TICKET ÉQUILIBRÉ', subtitle: 'Victoires & options combinées', accent: '#38bdf8' },
    { theme: 'buts', title: 'TICKET BUTS', subtitle: 'Tendances +1,5 / +2,5 / -3,5 buts', accent: '#f59e0b' },
  ]

  const usedMatchMarkets = new Map<string, Set<string>>()
  const usedGlobal = new Set<string>()

  return defs.map(def => {
    const picks: CouponPick[] = []

    // 1. Prendre d'abord des matchs jamais utilisés sur les autres affiches
    for (const m of affordablePool) {
      if (picks.length >= countPerPoster) break
      if (usedGlobal.has(m.match_id)) continue
      const pick = pickOptionForTheme(m, def.theme)
      if (!pick) continue
      picks.push(pick)
      usedGlobal.add(m.match_id)
      usedMatchMarkets.set(m.match_id, new Set([pick.marketKey]))
    }

    // 2. Si la journée a peu de matchs, compléter avec une option DIFFÉRENTE
    if (picks.length < countPerPoster) {
      for (const m of affordablePool) {
        if (picks.length >= countPerPoster) break
        if (picks.some(x => x.match.match_id === m.match_id)) continue
        const alreadyUsed = usedMatchMarkets.get(m.match_id)
        const pick = pickOptionForTheme(m, def.theme, alreadyUsed ? [...alreadyUsed][0] : undefined)
        if (!pick) continue
        picks.push(pick)
        if (alreadyUsed) alreadyUsed.add(pick.marketKey)
        else usedMatchMarkets.set(m.match_id, new Set([pick.marketKey]))
      }
    }

    return {
      theme: def.theme,
      title: def.title,
      subtitle: `${picks.length} sélections · ${def.subtitle}`,
      accent: def.accent,
      picks,
    }
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 3 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1)
  }
  return `${t}…`
}

async function loadImage(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return null
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = window.setTimeout(() => resolve(null), 2500)
    img.onload = () => {
      window.clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      window.clearTimeout(timer)
      resolve(null)
    }
    img.src = url
  })
}

function drawCrest(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  name: string,
  cx: number,
  cy: number,
  size: number,
) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.1)'
  ctx.fill()
  if (img) {
    ctx.clip()
    ctx.drawImage(img, cx - size / 2 + 4, cy - size / 2 + 4, size - 8, size - 8)
  } else {
    ctx.fillStyle = '#e2e8f0'
    ctx.font = '700 18px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name.slice(0, 2).toUpperCase(), cx, cy)
  }
  ctx.restore()
}

/** Génère une affiche PNG 1080×1920 prête pour TikTok / Reels. */
export async function renderPosterToDataUrl(coupon: StudioCoupon, dateLabel: string): Promise<string> {
  const W = 1080
  const H = 1920
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // Fond dégradé stade sombre
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#091c15')
  bg.addColorStop(0.5, '#0f291e')
  bg.addColorStop(1, '#07140f')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Halo lumineux haut droite
  const glow = ctx.createRadialGradient(W * 0.85, 160, 20, W * 0.85, 160, 540)
  glow.addColorStop(0, 'rgba(16, 185, 129, 0.25)')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  // Top branding bar
  ctx.fillStyle = '#16a34a'
  roundRect(ctx, 64, 72, 136, 52, 26)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 26px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('APEX', 132, 99)

  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(236, 253, 245, 0.78)'
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.fillText(dateLabel, W - 64, 99)

  // Titre du combiné
  ctx.textAlign = 'left'
  ctx.fillStyle = coupon.accent
  ctx.font = '800 24px system-ui, sans-serif'
  ctx.fillText('COMBINÉ DU JOUR · TRYAPEX.LIVE', 64, 178)

  ctx.fillStyle = '#ffffff'
  ctx.font = '900 60px system-ui, sans-serif'
  ctx.fillText(coupon.title, 64, 242)

  ctx.fillStyle = 'rgba(236, 253, 245, 0.72)'
  ctx.font = '500 28px system-ui, sans-serif'
  ctx.fillText(coupon.subtitle, 64, 294)

  // Précharger les écussons
  const logos = await Promise.all(
    coupon.picks.map(async p => ({
      dom: await loadImage(p.match.logos?.domicile),
      ext: await loadImage(p.match.logos?.exterieur),
    })),
  )

  // Cartes des matchs (4 ou 5)
  const startY = 348
  const footerTop = 1600
  const availH = footerTop - startY - 24
  const gap = 22
  const cardH = Math.floor((availH - gap * (coupon.picks.length - 1)) / coupon.picks.length)

  coupon.picks.forEach((pick, idx) => {
    const y = startY + idx * (cardH + gap)
    const x = 64
    const cardW = W - 128

    // Carte
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
    roundRect(ctx, x, y, cardW, cardH, 28)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)'
    ctx.lineWidth = 2
    ctx.stroke()

    // Compétition & heure
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(209, 250, 229, 0.72)'
    ctx.font = '600 23px system-ui, sans-serif'
    ctx.fillText(`${pick.match.competition} · ${heureCourte(pick.match.date_heure)}`, x + 32, y + 40)

    // Équipes + écussons
    const midY = y + Math.round(cardH * 0.48)
    drawCrest(ctx, logos[idx].dom, pick.match.equipes.domicile, x + 58, midY, 54)
    ctx.fillStyle = '#ffffff'
    ctx.font = '700 32px system-ui, sans-serif'
    ctx.textAlign = 'left'
    const vsText = `${pick.match.equipes.domicile}  vs  ${pick.match.equipes.exterieur}`
    ctx.fillText(truncateText(ctx, vsText, cardW - 180), x + 102, midY + 2)
    drawCrest(ctx, logos[idx].ext, pick.match.equipes.exterieur, x + cardW - 58, midY, 54)

    // Option sélectionnée + probabilité
    const badgeY = y + cardH - 68
    ctx.fillStyle = 'rgba(16, 185, 129, 0.18)'
    roundRect(ctx, x + 32, badgeY, cardW - 64, 48, 14)
    ctx.fill()

    ctx.fillStyle = '#6ee7b7'
    ctx.font = '800 26px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`✓  ${pick.optionLabel}`, x + 52, badgeY + 25)

    ctx.textAlign = 'right'
    ctx.fillStyle = '#ffffff'
    ctx.font = '800 26px system-ui, sans-serif'
    ctx.fillText(pct(pick.probPct / 100), x + cardW - 52, badgeY + 25)
  })

  // Footer 1xBet + code promo kenken
  const fy = 1620
  ctx.fillStyle = 'rgba(14, 48, 86, 0.85)'
  roundRect(ctx, 64, fy, W - 128, 196, 30)
  ctx.fill()
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = '#ffffff'
  ctx.font = '900 44px system-ui, sans-serif'
  ctx.fillText('1XBET', 104, fy + 68)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.82)'
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.fillText('Bonus bienvenue jusqu’à 200 %', 104, fy + 124)

  // Coupon kenken
  ctx.fillStyle = '#16a34a'
  roundRect(ctx, W - 414, fy + 44, 310, 108, 22)
  ctx.fill()

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(236, 253, 245, 0.9)'
  ctx.font = '700 20px system-ui, sans-serif'
  ctx.fillText('CODE PROMO', W - 259, fy + 76)

  ctx.fillStyle = '#ffffff'
  ctx.font = '900 40px system-ui, sans-serif'
  ctx.fillText('kenken', W - 259, fy + 122)

  // Mention légale bas
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.font = '500 22px system-ui, sans-serif'
  ctx.fillText('tryapex.live · Analyse statistique informative · 18+ Jouer comporte des risques', W / 2, 1868)

  return canvas.toDataURL('image/png')
}

export function buildTikTokCaption(coupons: StudioCoupon[], dateLabel: string): string {
  const lines = [
    `⚽ Mes 3 combinés du jour (${dateLabel}) générés sur Apex !`,
    '',
    ...coupons.map(c => `🔥 ${c.title} : ${c.picks.map(p => `${p.match.equipes.domicile} (${p.optionLabel})`).join(' · ')}`),
    '',
    '📊 Analyses complètes sur tryapex.live',
    '🎁 Code promo 1xBet : kenken (jusqu’à 200 % de bonus)',
    '',
    '#pronosticfoot #parissportifs #football #apex #1xbet #kenken',
  ]
  return lines.join('\n')
}
