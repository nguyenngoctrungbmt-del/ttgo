/** Hex slab art for Hexa Sort. */

export type Hue = { name: string; top: string; side: string; dark: string; mark: string }

export const HUES: Hue[] = [
  { name: 'Coral', top: '#f87171', side: '#dc2626', dark: '#7f1d1d', mark: '#fee2e2' },
  { name: 'Sun', top: '#fde047', side: '#eab308', dark: '#854d0e', mark: '#fffbeb' },
  { name: 'Mint', top: '#4ade80', side: '#16a34a', dark: '#14532d', mark: '#dcfce7' },
  { name: 'Sky', top: '#60a5fa', side: '#2563eb', dark: '#1e3a8a', mark: '#dbeafe' },
  { name: 'Grape', top: '#c084fc', side: '#9333ea', dark: '#4c1d95', mark: '#f3e8ff' },
  { name: 'Tangerine', top: '#fdba74', side: '#f97316', dark: '#7c2d12', mark: '#fff7ed' },
  { name: 'Pink', top: '#f9a8d4', side: '#ec4899', dark: '#831843', mark: '#fdf2f8' },
  { name: 'Snow', top: '#f8fafc', side: '#cbd5e1', dark: '#475569', mark: '#64748b' },
]

type G = CanvasRenderingContext2D

/** Flat-top hexagon path, horizontally `s` radius, vertically squashed by k. */
export function hexPath(g: G, x: number, y: number, s: number, k: number) {
  g.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    const px = x + Math.cos(a) * s
    const py = y + Math.sin(a) * s * k
    if (i === 0) g.moveTo(px, py)
    else g.lineTo(px, py)
  }
  g.closePath()
}

/** One slab: side band of height th below the top face. Drawn around (0,0) = top face center. */
export function drawSlab(g: G, hue: Hue, s: number, k: number, th: number) {
  // side band (front half only is visible)
  g.fillStyle = hue.side
  g.beginPath()
  g.moveTo(s, 0)
  for (let i = 0; i <= 3; i++) {
    const a = (i * Math.PI) / 3
    g.lineTo(Math.cos(a) * s, Math.sin(a) * s * k)
  }
  for (let i = 3; i >= 0; i--) {
    const a = (i * Math.PI) / 3
    g.lineTo(Math.cos(a) * s, Math.sin(a) * s * k + th)
  }
  g.closePath()
  g.fill()
  g.strokeStyle = hue.dark
  g.lineWidth = 1
  g.stroke()
  const gr = g.createLinearGradient(0, -s * k, 0, s * k)
  gr.addColorStop(0, hue.top)
  gr.addColorStop(1, hue.side)
  g.fillStyle = gr
  hexPath(g, 0, 0, s, k)
  g.fill()
  g.strokeStyle = 'rgba(255,255,255,0.45)'
  g.lineWidth = 1.2
  g.stroke()
}

/** Distinct emblem per colour, drawn on the top face. */
export function drawMark(g: G, idx: number, s: number, k: number) {
  const hue = HUES[idx]
  const r = s * 0.36
  g.save()
  g.scale(1, k)
  g.fillStyle = hue.mark
  g.strokeStyle = hue.mark
  g.lineWidth = Math.max(1.2, s * 0.08)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  switch (idx) {
    case 0: // heart
      g.moveTo(0, r * 0.8)
      g.bezierCurveTo(-r * 1.2, 0, -r * 0.6, -r, 0, -r * 0.35)
      g.bezierCurveTo(r * 0.6, -r, r * 1.2, 0, 0, r * 0.8)
      g.fill()
      break
    case 1: // sun
      g.arc(0, 0, r * 0.45, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4
        g.moveTo(Math.cos(a) * r * 0.65, Math.sin(a) * r * 0.65)
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      g.stroke()
      break
    case 2: // leaf
      g.moveTo(-r * 0.8, r * 0.6)
      g.quadraticCurveTo(-r * 0.6, -r * 0.9, r * 0.8, -r * 0.6)
      g.quadraticCurveTo(r * 0.6, r * 0.9, -r * 0.8, r * 0.6)
      g.fill()
      break
    case 3: // drop
      g.moveTo(0, -r)
      g.bezierCurveTo(r * 0.8, -r * 0.1, r * 0.7, r * 0.85, 0, r * 0.85)
      g.bezierCurveTo(-r * 0.7, r * 0.85, -r * 0.8, -r * 0.1, 0, -r)
      g.fill()
      break
    case 4: // star
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const rr = i % 2 ? r * 0.45 : r
        if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
        else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      g.closePath()
      g.fill()
      break
    case 5: // ring
      g.arc(0, 0, r * 0.7, 0, Math.PI * 2)
      g.stroke()
      break
    case 6: // flower
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5
        g.moveTo(Math.cos(a) * r * 0.5 + r * 0.38, Math.sin(a) * r * 0.5)
        g.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.38, 0, Math.PI * 2)
      }
      g.fill()
      break
    default: // snowflake
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3
        g.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        g.lineTo(-Math.cos(a) * r, -Math.sin(a) * r)
      }
      g.stroke()
  }
  g.restore()
}
