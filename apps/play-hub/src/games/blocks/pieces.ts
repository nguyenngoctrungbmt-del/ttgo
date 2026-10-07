/** Block Blitz rules data: tetromino shapes, SRS kicks, palettes and helpers. */

export const COLS = 10
export const ROWS = 22
export const HIDDEN = 2
/** Cell flag: this cell carries a gem. Low bits = colour index 1..8. */
export const GEM = 16
export const GARBAGE = 8

export type Pt = [number, number]
export type Piece = { k: number; r: number; x: number; y: number; gem: number }

// Spawn orientation of I O T S Z J L.
const BASE: Pt[][] = [
  [[0, 1], [1, 1], [2, 1], [3, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[2, 0], [0, 1], [1, 1], [2, 1]],
]
export const BOX = [4, 2, 3, 3, 3, 3, 3]

/** SHAPES[kind][rotation] = cells inside the bounding box. */
export const SHAPES: Pt[][][] = BASE.map((cells, k) => {
  const n = BOX[k]
  const rots: Pt[][] = [cells]
  for (let r = 1; r < 4; r++) rots.push(rots[r - 1].map(([x, y]) => [n - 1 - y, x] as Pt))
  return rots
})

// SRS kick data (SRS +y is up; converted to screen space when used).
const KICK_JLSTZ: Record<string, Pt[]> = {
  '01': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '10': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '12': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '21': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '23': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '32': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '30': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '03': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
}
const KICK_I: Record<string, Pt[]> = {
  '01': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '10': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '12': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '21': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '23': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '32': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '30': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '03': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
}

export function kicks(k: number, from: number, to: number): Pt[] {
  if (k === 1) return [[0, 0]]
  return (k === 0 ? KICK_I : KICK_JLSTZ)[`${from}${to}`]
}

export type Tone = { base: string; light: string; dark: string }
/** Index 1..7 = I O T S Z J L, 8 = garbage. */
export const TONES: Tone[] = [
  { base: '#000', light: '#000', dark: '#000' },
  { base: '#22d3ee', light: '#a5f3fc', dark: '#0e7490' },
  { base: '#facc15', light: '#fef08a', dark: '#a16207' },
  { base: '#a855f7', light: '#e9d5ff', dark: '#6b21a8' },
  { base: '#22c55e', light: '#bbf7d0', dark: '#15803d' },
  { base: '#ef4444', light: '#fecaca', dark: '#991b1b' },
  { base: '#3b82f6', light: '#bfdbfe', dark: '#1e40af' },
  { base: '#f97316', light: '#fed7aa', dark: '#c2410c' },
  { base: '#64748b', light: '#cbd5e1', dark: '#334155' },
]

export type Theme = { name: string; top: string; bot: string; glow: string; well: string }
export const THEMES: Theme[] = [
  { name: 'Neon Night', top: '#0f172a', bot: '#1e1b4b', glow: '#818cf8', well: 'rgba(15,23,42,0.82)' },
  { name: 'Deep Sea', top: '#022c3a', bot: '#0c4a6e', glow: '#22d3ee', well: 'rgba(3,22,40,0.82)' },
  { name: 'Sunset Strip', top: '#3b0764', bot: '#9a3412', glow: '#fb923c', well: 'rgba(40,10,40,0.8)' },
  { name: 'Emerald', top: '#052e16', bot: '#14532d', glow: '#4ade80', well: 'rgba(4,30,18,0.82)' },
  { name: 'Magma Core', top: '#1c1917', bot: '#7f1d1d', glow: '#f87171', well: 'rgba(28,10,10,0.84)' },
  { name: 'Aurora', top: '#0b1026', bot: '#134e4a', glow: '#c4b5fd', well: 'rgba(10,16,38,0.82)' },
]

export function cellsOf(p: Piece): Pt[] {
  return SHAPES[p.k][p.r]
}

export function collides(grid: number[], p: Piece, dx = 0, dy = 0, r = p.r): boolean {
  for (const [cx, cy] of SHAPES[p.k][r]) {
    const x = p.x + cx + dx
    const y = p.y + cy + dy
    if (x < 0 || x >= COLS || y >= ROWS) return true
    if (y >= 0 && grid[y * COLS + x] !== 0) return true
  }
  return false
}

export function dropDistance(grid: number[], p: Piece): number {
  let d = 0
  while (!collides(grid, p, 0, d + 1)) d++
  return d
}

export function fullRows(grid: number[]): number[] {
  const out: number[] = []
  for (let y = 0; y < ROWS; y++) {
    let full = true
    for (let x = 0; x < COLS; x++) {
      if (grid[y * COLS + x] === 0) {
        full = false
        break
      }
    }
    if (full) out.push(y)
  }
  return out
}

/** Remove the given rows and drop everything above. */
export function removeRows(grid: number[], rows: number[]): number[] {
  const kill = new Set(rows)
  const kept: number[][] = []
  for (let y = 0; y < ROWS; y++) if (!kill.has(y)) kept.push(grid.slice(y * COLS, y * COLS + COLS))
  const out: number[] = new Array(rows.length * COLS).fill(0)
  for (const row of kept) out.push(...row)
  return out
}

export function bag(): number[] {
  const b = [0, 1, 2, 3, 4, 5, 6]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

export function spawnPiece(k: number, gem: number): Piece {
  return { k, r: 0, x: k === 1 ? 4 : 3, y: 1, gem }
}

/** Gravity: seconds per row. Gentle at first, capped so late levels stay playable. */
export function secondsPerRow(level: number, calm: number): number {
  return Math.max(0.045, 0.9 * Math.pow(0.82, level - 1)) * (1 + calm * 0.1)
}

/** Glossy block sprite cache, keyed by colour and pixel size. */
const sprites = new Map<string, HTMLCanvasElement>()

export function blockSprite(tone: number, size: number): HTMLCanvasElement {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const key = `${tone}|${size}|${dpr}`
  const hit = sprites.get(key)
  if (hit) return hit
  const t = TONES[tone]
  const c = document.createElement('canvas')
  c.width = Math.ceil(size * dpr)
  c.height = Math.ceil(size * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  const s = size
  const r = s * 0.2
  g.fillStyle = t.dark
  g.beginPath()
  g.roundRect(0.5, 0.5, s - 1, s - 1, r)
  g.fill()
  const body = g.createLinearGradient(0, 0, 0, s)
  body.addColorStop(0, t.light)
  body.addColorStop(0.45, t.base)
  body.addColorStop(1, t.dark)
  g.fillStyle = body
  g.beginPath()
  g.roundRect(2, 2, s - 4, s - 5, r * 0.8)
  g.fill()
  // Inner face
  const face = g.createLinearGradient(0, s * 0.2, 0, s * 0.85)
  face.addColorStop(0, t.base)
  face.addColorStop(1, t.dark)
  g.globalAlpha = 0.55
  g.fillStyle = face
  g.beginPath()
  g.roundRect(s * 0.2, s * 0.24, s * 0.6, s * 0.52, r * 0.5)
  g.fill()
  // Gloss
  g.globalAlpha = 0.5
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.roundRect(s * 0.16, s * 0.1, s * 0.68, s * 0.16, s * 0.08)
  g.fill()
  g.globalAlpha = 0.9
  g.beginPath()
  g.arc(s * 0.26, s * 0.18, s * 0.05, 0, Math.PI * 2)
  g.fill()
  g.globalAlpha = 1
  sprites.set(key, c)
  return c
}
