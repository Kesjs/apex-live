/** Probabilité qu'une loi de Poisson de moyenne `l` donne exactement `k`. */
export function pmf(k: number, l: number): number {
  if (l <= 0) return k === 0 ? 1 : 0
  let p = Math.exp(-l)
  for (let i = 1; i <= k; i++) p *= l / i
  return p
}

export type Matrice = number[][]

/** m[i][j] = probabilité du score i-j (domicile-extérieur), renormalisée à 1. */
export function matrice(lh: number, la: number, max = 10): Matrice {
  const m: Matrice = []
  let somme = 0
  for (let i = 0; i <= max; i++) {
    m.push([])
    for (let j = 0; j <= max; j++) {
      const p = pmf(i, lh) * pmf(j, la)
      m[i].push(p)
      somme += p
    }
  }
  return m.map(l => l.map(p => p / somme))
}

export function issue(m: Matrice): { p1: number; pN: number; p2: number } {
  let p1 = 0
  let pN = 0
  let p2 = 0
  m.forEach((ligne, i) =>
    ligne.forEach((p, j) => {
      if (i > j) p1 += p
      else if (i === j) pN += p
      else p2 += p
    }),
  )
  return { p1, pN, p2 }
}

/** P(total de buts > ligne), ligne du type 1.5. */
export function plusDe(m: Matrice, ligne: number): number {
  let s = 0
  m.forEach((l, i) => l.forEach((p, j) => (i + j > ligne ? (s += p) : 0)))
  return s
}

export function lesDeuxMarquent(m: Matrice): number {
  let s = 0
  m.forEach((l, i) => l.forEach((p, j) => (i > 0 && j > 0 ? (s += p) : 0)))
  return s
}

export function meilleursScores(m: Matrice, n: number): Array<{ score: string; probabilite: number }> {
  const tous: Array<{ score: string; probabilite: number }> = []
  m.forEach((l, i) => l.forEach((p, j) => tous.push({ score: i + '-' + j, probabilite: p })))
  return tous.sort((a, b) => b.probabilite - a.probabilite).slice(0, n)
}
