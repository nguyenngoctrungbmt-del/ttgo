/** Number Merge tile art: chunky 3D blocks with per-value colours. */

const HUES = [
  ['#93c5fd', '#3b82f6', '#1e40af'],
  ['#6ee7b7', '#10b981', '#065f46'],
  ['#fde68a', '#f59e0b', '#92400e'],
  ['#fdba74', '#f97316', '#9a3412'],
  ['#fca5a5', '#ef4444', '#991b1b'],
  ['#f9a8d4', '#ec4899', '#9d174d'],
  ['#c4b5fd', '#8b5cf6', '#5b21b6'],
  ['#67e8f9', '#06b6d4', '#155e75'],
  ['#bef264', '#84cc16', '#3f6212'],
  ['#fcd34d', '#d97706', '#78350f'],
  ['#f0abfc', '#d946ef', '#86198f'],
  ['#5eead4', '#14b8a6', '#115e59'],
]

export function hueFor(v: number) {
  const i = Math.max(0, Math.round(Math.log2(v)) - 1)
  return HUES[i % HUES.length]
}

export function label(v: number) {
  if (v >= 1e9) return `${Math.round(v / 1e9)}B`
  if (v >= 1e6) return `${Math.round(v / 1e6)}M`
  if (v >= 1e4) return `${Math.round(v / 1e3)}K`
  return String(v)
}

/** Draws a tile with its top-left at x,y. */
export function drawTile(g: CanvasRenderingContext2D, x: number, y: number, s: number, v: number) {
  const [light, base, dark] = hueFor(v)
  const depth = s * 0.09
  const r = s * 0.2
  g.fillStyle = 'rgba(0,0,0,0.28)'
  g.beginPath()
  g.roundRect(x + 2, y + depth + 3, s - 2, s - depth, r)
  g.fill()
  g.fillStyle = dark
  g.beginPath()
  g.roundRect(x, y + depth, s, s - depth, r)
  g.fill()
  const gr = g.createLinearGradient(0, y, 0, y + s - depth)
  gr.addColorStop(0, light)
  gr.addColorStop(0.55, base)
  gr.addColorStop(1, base)
  g.fillStyle = gr
  g.beginPath()
  g.roundRect(x, y, s, s - depth, r)
  g.fill()
  // gloss
  g.fillStyle = 'rgba(255,255,255,0.32)'
  g.beginPath()
  g.roundRect(x + s * 0.1, y + s * 0.06, s * 0.8, s * 0.22, s * 0.11)
  g.fill()
  const big = v >= 512
  if (big) {
    // crown sparkle for big tiles
    g.fillStyle = '#fef9c3'
    g.beginPath()
    const cx = x + s * 0.82
    const cy = y + s * 0.18
    const k = s * 0.09
    g.moveTo(cx, cy - k)
    g.lineTo(cx + k * 0.3, cy - k * 0.3)
    g.lineTo(cx + k, cy)
    g.lineTo(cx + k * 0.3, cy + k * 0.3)
    g.lineTo(cx, cy + k)
    g.lineTo(cx - k * 0.3, cy + k * 0.3)
    g.lineTo(cx - k, cy)
    g.lineTo(cx - k * 0.3, cy - k * 0.3)
    g.closePath()
    g.fill()
  }
  const text = label(v)
  const fs = s * (text.length <= 1 ? 0.5 : text.length === 2 ? 0.46 : text.length === 3 ? 0.38 : 0.3)
  g.font = `900 ${Math.round(fs)}px 'Plus Jakarta Sans', system-ui, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  g.lineWidth = Math.max(3, s * 0.07)
  g.strokeStyle = dark
  g.strokeText(text, x + s / 2, y + (s - depth) / 2 + s * 0.02)
  g.fillStyle = '#ffffff'
  g.fillText(text, x + s / 2, y + (s - depth) / 2 + s * 0.02)
}

/** Grey stone blocker. */
export function drawStone(g: CanvasRenderingContext2D, x: number, y: number, s: number, cracks: number) {
  const depth = s * 0.09
  g.fillStyle = 'rgba(0,0,0,0.3)'
  g.beginPath()
  g.roundRect(x + 2, y + depth + 3, s - 2, s - depth, s * 0.16)
  g.fill()
  g.fillStyle = '#44403c'
  g.beginPath()
  g.roundRect(x, y + depth, s, s - depth, s * 0.16)
  g.fill()
  const gr = g.createLinearGradient(0, y, 0, y + s)
  gr.addColorStop(0, '#d6d3d1')
  gr.addColorStop(1, '#78716c')
  g.fillStyle = gr
  g.beginPath()
  g.moveTo(x + s * 0.15, y)
  g.lineTo(x + s * 0.8, y + s * 0.02)
  g.lineTo(x + s, y + s * 0.25)
  g.lineTo(x + s * 0.97, y + s * 0.75)
  g.lineTo(x + s * 0.75, y + s - depth)
  g.lineTo(x + s * 0.2, y + s - depth)
  g.lineTo(x, y + s * 0.7)
  g.lineTo(x + s * 0.03, y + s * 0.2)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.25)'
  g.beginPath()
  g.ellipse(x + s * 0.35, y + s * 0.22, s * 0.18, s * 0.07, -0.3, 0, Math.PI * 2)
  g.fill()
  // speckles
  g.fillStyle = 'rgba(68,64,60,0.45)'
  for (const [px, py, pr] of [[0.3, 0.55, 0.05], [0.68, 0.38, 0.04], [0.58, 0.7, 0.06], [0.22, 0.32, 0.03], [0.78, 0.6, 0.035]]) {
    g.beginPath()
    g.arc(x + px * s, y + py * s, pr * s, 0, Math.PI * 2)
    g.fill()
  }
  if (cracks > 0) {
    g.strokeStyle = 'rgba(28,25,23,0.85)'
    g.lineWidth = 2.2
    g.beginPath()
    g.moveTo(x + s * 0.08, y + s * 0.42)
    g.lineTo(x + s * 0.3, y + s * 0.48)
    g.lineTo(x + s * 0.42, y + s * 0.36)
    g.lineTo(x + s * 0.6, y + s * 0.52)
    g.lineTo(x + s * 0.74, y + s * 0.44)
    g.lineTo(x + s * 0.94, y + s * 0.56)
    g.moveTo(x + s * 0.42, y + s * 0.36)
    g.lineTo(x + s * 0.46, y + s * 0.2)
    g.stroke()
  }
}

/** Rainbow joker tile. */
export function drawJoker(g: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  const depth = s * 0.09
  g.fillStyle = '#4c1d95'
  g.beginPath()
  g.roundRect(x, y + depth, s, s - depth, s * 0.2)
  g.fill()
  const gr = g.createLinearGradient(x, y, x + s, y + s)
  const cols = ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc']
  cols.forEach((c, i) => gr.addColorStop(((i / cols.length + t * 0.2) % 1), c))
  g.fillStyle = gr
  g.beginPath()
  g.roundRect(x, y, s, s - depth, s * 0.2)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.3)'
  g.beginPath()
  g.roundRect(x + s * 0.1, y + s * 0.06, s * 0.8, s * 0.2, s * 0.1)
  g.fill()
  const cx = x + s / 2
  const cy = y + (s - depth) / 2
  g.fillStyle = '#fff'
  g.strokeStyle = '#4c1d95'
  g.lineWidth = 3
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5 + t
    const rr = i % 2 ? s * 0.13 : s * 0.3
    g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
  }
  g.closePath()
  g.stroke()
  g.fill()
}

/** Bomb piece. */
export function drawBomb(g: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  const cx = x + s / 2
  const cy = y + s * 0.56
  const r = s * 0.34
  g.fillStyle = 'rgba(0,0,0,0.3)'
  g.beginPath()
  g.ellipse(cx + 2, y + s * 0.92, r, r * 0.25, 0, 0, Math.PI * 2)
  g.fill()
  const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r)
  gr.addColorStop(0, '#64748b')
  gr.addColorStop(1, '#0f172a')
  g.fillStyle = gr
  g.beginPath()
  g.arc(cx, cy, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#475569'
  g.fillRect(cx - r * 0.3, cy - r * 1.15, r * 0.6, r * 0.3)
  g.strokeStyle = '#a16207'
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(cx, cy - r * 1.15)
  g.quadraticCurveTo(cx + r * 0.4, cy - r * 1.6, cx + r * 0.7, cy - r * 1.4)
  g.stroke()
  const f = 0.7 + Math.sin(t * 20) * 0.3
  g.fillStyle = '#fde047'
  g.beginPath()
  g.arc(cx + r * 0.72, cy - r * 1.42, r * 0.22 * f, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#f97316'
  g.beginPath()
  g.arc(cx + r * 0.72, cy - r * 1.42, r * 0.12 * f, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.beginPath()
  g.ellipse(cx - r * 0.35, cy - r * 0.35, r * 0.25, r * 0.14, -0.6, 0, Math.PI * 2)
  g.fill()
}
