/** Helix Drop palettes (one per level, cycling) and a memoised shade helper. */

export type Palette = { name: string; bgTop: string; bgBot: string; solid: string; solidDark: string; pole: string; ball: string; accent: string }

export const PALETTES: Palette[] = [
  { name: 'Bubblegum', bgTop: '#fbcfe8', bgBot: '#a78bfa', solid: '#8b5cf6', solidDark: '#5b21b6', pole: '#f5f3ff', ball: '#f472b6', accent: '#db2777' },
  { name: 'Mint Breeze', bgTop: '#ccfbf1', bgBot: '#22d3ee', solid: '#14b8a6', solidDark: '#0f766e', pole: '#f0fdfa', ball: '#facc15', accent: '#0d9488' },
  { name: 'Sunrise', bgTop: '#fef3c7', bgBot: '#fb923c', solid: '#f59e0b', solidDark: '#b45309', pole: '#fffbeb', ball: '#3b82f6', accent: '#ea580c' },
  { name: 'Deep Ocean', bgTop: '#1e3a8a', bgBot: '#0f172a', solid: '#3b82f6', solidDark: '#1e40af', pole: '#dbeafe', ball: '#fde047', accent: '#60a5fa' },
  { name: 'Lime Pop', bgTop: '#ecfccb', bgBot: '#4ade80', solid: '#16a34a', solidDark: '#14532d', pole: '#f7fee7', ball: '#a855f7', accent: '#15803d' },
  { name: 'Midnight Neon', bgTop: '#312e81', bgBot: '#020617', solid: '#06b6d4', solidDark: '#155e75', pole: '#e0e7ff', ball: '#f0abfc', accent: '#22d3ee' },
  { name: 'Cotton Candy', bgTop: '#e0f2fe', bgBot: '#f9a8d4', solid: '#38bdf8', solidDark: '#0369a1', pole: '#fdf2f8', ball: '#fb7185', accent: '#0284c7' },
  { name: 'Volcano', bgTop: '#44403c', bgBot: '#1c1917', solid: '#a8a29e', solidDark: '#57534e', pole: '#e7e5e4', ball: '#fb923c', accent: '#f97316' },
]

export const RED = { base: '#ef4444', dark: '#991b1b' }

const cache = new Map<string, string>()

/** Multiply a #rrggbb colour by f (0..~1.3), clamped. */
export function shade(hex: string, f: number): string {
  const q = Math.round(f * 20) / 20
  const key = `${hex}|${q}`
  const hit = cache.get(key)
  if (hit) return hit
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.round(((n >> 16) & 255) * q))
  const g = Math.min(255, Math.round(((n >> 8) & 255) * q))
  const b = Math.min(255, Math.round((n & 255) * q))
  const out = `rgb(${r},${g},${b})`
  cache.set(key, out)
  return out
}
