/** Bus Jam vector art: passengers, buses, symbols, scenery. */

export type Hue = { name: string; base: string; light: string; dark: string; sym: Sym }
export type Sym = 'circle' | 'square' | 'star' | 'triangle' | 'heart' | 'diamond' | 'plus'

export const HUES: Hue[] = [
  { name: 'Red', base: '#ef4444', light: '#fca5a5', dark: '#991b1b', sym: 'circle' },
  { name: 'Blue', base: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a', sym: 'square' },
  { name: 'Yellow', base: '#facc15', light: '#fef08a', dark: '#a16207', sym: 'star' },
  { name: 'Green', base: '#22c55e', light: '#86efac', dark: '#14532d', sym: 'triangle' },
  { name: 'Purple', base: '#a855f7', light: '#d8b4fe', dark: '#581c87', sym: 'heart' },
  { name: 'Orange', base: '#f97316', light: '#fdba74', dark: '#9a3412', sym: 'diamond' },
  { name: 'Pink', base: '#ec4899', light: '#f9a8d4', dark: '#9d174d', sym: 'plus' },
]

export const MYSTERY: Hue = { name: 'Mystery', base: '#94a3b8', light: '#e2e8f0', dark: '#334155', sym: 'circle' }

const SKIN = ['#fcd9b8', '#e0a87a', '#9a6340']
const HAIR = ['#3f2a1d', '#111827', '#f2c14e']

type G = CanvasRenderingContext2D

export function symbolPath(g: G, sym: Sym, x: number, y: number, r: number) {
  g.beginPath()
  switch (sym) {
    case 'circle':
      g.arc(x, y, r * 0.8, 0, Math.PI * 2)
      break
    case 'square':
      g.rect(x - r * 0.72, y - r * 0.72, r * 1.44, r * 1.44)
      break
    case 'triangle':
      g.moveTo(x, y - r * 0.95)
      g.lineTo(x + r * 0.95, y + r * 0.7)
      g.lineTo(x - r * 0.95, y + r * 0.7)
      g.closePath()
      break
    case 'diamond':
      g.moveTo(x, y - r)
      g.lineTo(x + r * 0.8, y)
      g.lineTo(x, y + r)
      g.lineTo(x - r * 0.8, y)
      g.closePath()
      break
    case 'plus': {
      const a = r * 0.34
      g.moveTo(x - a, y - r)
      g.lineTo(x + a, y - r)
      g.lineTo(x + a, y - a)
      g.lineTo(x + r, y - a)
      g.lineTo(x + r, y + a)
      g.lineTo(x + a, y + a)
      g.lineTo(x + a, y + r)
      g.lineTo(x - a, y + r)
      g.lineTo(x - a, y + a)
      g.lineTo(x - r, y + a)
      g.lineTo(x - r, y - a)
      g.lineTo(x - a, y - a)
      g.closePath()
      break
    }
    case 'heart':
      g.moveTo(x, y + r * 0.85)
      g.bezierCurveTo(x - r * 1.3, y - r * 0.1, x - r * 0.6, y - r * 1.15, x, y - r * 0.4)
      g.bezierCurveTo(x + r * 0.6, y - r * 1.15, x + r * 1.3, y - r * 0.1, x, y + r * 0.85)
      g.closePath()
      break
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const rr = i % 2 ? r * 0.45 : r
        if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
        else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
      }
      g.closePath()
      break
  }
}

/**
 * Passenger drawn around (0,0) = feet centre; s = cell size.
 * `mystery` draws a grey hoodie with a question mark.
 */
export function drawPerson(g: G, hue: Hue, look: number, s: number, mystery = false) {
  const skin = SKIN[look % 3]
  const hair = HAIR[Math.floor(look / 3) % 3]
  const bw = s * 0.27
  const bh = s * 0.36
  // shadow
  g.fillStyle = 'rgba(15,23,42,0.28)'
  g.beginPath()
  g.ellipse(0, 0, s * 0.3, s * 0.1, 0, 0, Math.PI * 2)
  g.fill()
  // legs
  g.fillStyle = '#1e293b'
  g.beginPath()
  g.roundRect(-bw * 0.62, -s * 0.12, bw * 0.5, s * 0.12, 2)
  g.roundRect(bw * 0.12, -s * 0.12, bw * 0.5, s * 0.12, 2)
  g.fill()
  // body
  const top = -s * 0.1 - bh
  const gr = g.createLinearGradient(-bw, top, bw, -s * 0.1)
  gr.addColorStop(0, hue.light)
  gr.addColorStop(0.45, hue.base)
  gr.addColorStop(1, hue.dark)
  g.fillStyle = gr
  g.beginPath()
  g.moveTo(-bw, -s * 0.1)
  g.lineTo(-bw * 1.02, top + bh * 0.35)
  g.quadraticCurveTo(-bw, top, 0, top)
  g.quadraticCurveTo(bw, top, bw * 1.02, top + bh * 0.35)
  g.lineTo(bw, -s * 0.1)
  g.quadraticCurveTo(0, -s * 0.04, -bw, -s * 0.1)
  g.closePath()
  g.fill()
  g.strokeStyle = hue.dark
  g.lineWidth = Math.max(1, s * 0.03)
  g.stroke()
  // arms
  g.fillStyle = hue.base
  g.beginPath()
  g.ellipse(-bw * 1.08, top + bh * 0.55, bw * 0.24, bh * 0.36, 0.15, 0, Math.PI * 2)
  g.ellipse(bw * 1.08, top + bh * 0.55, bw * 0.24, bh * 0.36, -0.15, 0, Math.PI * 2)
  g.fill()
  // chest symbol (colour-blind coding)
  if (mystery) {
    g.fillStyle = '#ffffff'
    g.font = `900 ${Math.round(s * 0.26)}px 'Plus Jakarta Sans', system-ui, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('?', 0, top + bh * 0.55)
  } else {
    g.fillStyle = 'rgba(255,255,255,0.92)'
    symbolPath(g, hue.sym, 0, top + bh * 0.52, s * 0.085)
    g.fill()
  }
  // head
  const hr = s * 0.17
  const hy = top - hr * 0.72
  const hg = g.createRadialGradient(-hr * 0.35, hy - hr * 0.35, hr * 0.2, 0, hy, hr * 1.1)
  hg.addColorStop(0, '#fff7ed')
  hg.addColorStop(0.35, skin)
  hg.addColorStop(1, shade(skin))
  g.fillStyle = hg
  g.beginPath()
  g.arc(0, hy, hr, 0, Math.PI * 2)
  g.fill()
  // hair / hood
  g.fillStyle = mystery ? hue.dark : hair
  g.beginPath()
  g.arc(0, hy - hr * 0.1, hr * 1.04, Math.PI * 1.02, Math.PI * 1.98)
  g.quadraticCurveTo(hr * 0.4, hy - hr * 0.55, -hr * 1.02, hy - hr * 0.05)
  g.fill()
  // face
  g.fillStyle = '#1f2937'
  g.beginPath()
  g.arc(-hr * 0.36, hy + hr * 0.12, hr * 0.13, 0, Math.PI * 2)
  g.arc(hr * 0.36, hy + hr * 0.12, hr * 0.13, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.beginPath()
  g.arc(-hr * 0.32, hy + hr * 0.07, hr * 0.05, 0, Math.PI * 2)
  g.arc(hr * 0.4, hy + hr * 0.07, hr * 0.05, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(244,114,182,0.45)'
  g.beginPath()
  g.ellipse(-hr * 0.6, hy + hr * 0.42, hr * 0.18, hr * 0.11, 0, 0, Math.PI * 2)
  g.ellipse(hr * 0.6, hy + hr * 0.42, hr * 0.18, hr * 0.11, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#7c2d12'
  g.lineWidth = Math.max(1, hr * 0.12)
  g.lineCap = 'round'
  g.beginPath()
  g.arc(0, hy + hr * 0.38, hr * 0.22, 0.2, Math.PI - 0.2)
  g.stroke()
}

function shade(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * 0.78)
  const gg = Math.round(((n >> 8) & 255) * 0.72)
  const b = Math.round((n & 255) * 0.7)
  return `rgb(${r},${gg},${b})`
}

const cache = new Map<string, HTMLCanvasElement>()

/** Cached passenger sprite; drawn with feet at (s*0.5, s*0.9) inside an s×s canvas. */
export function personSprite(color: number, look: number, s: number, mystery: boolean) {
  const key = `${color}|${look}|${Math.round(s)}|${mystery ? 1 : 0}`
  const hit = cache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const c = document.createElement('canvas')
  c.width = Math.ceil(s * dpr)
  c.height = Math.ceil(s * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate(s * 0.5, s * 0.9)
  drawPerson(g, mystery ? MYSTERY : HUES[color], look, s, mystery)
  cache.set(key, c)
  if (cache.size > 220) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return c
}

export function clearArtCache() {
  cache.clear()
}

/** Little head for bus windows. */
export function drawHead(g: G, x: number, y: number, r: number, look: number, color: number, wave: number) {
  const skin = SKIN[look % 3]
  const hair = HAIR[Math.floor(look / 3) % 3]
  const hue = HUES[color]
  // shoulders
  g.fillStyle = hue.base
  g.beginPath()
  g.ellipse(x, y + r * 1.25, r * 1.1, r * 0.6, 0, Math.PI, 0)
  g.fill()
  if (wave) {
    g.strokeStyle = skin
    g.lineWidth = r * 0.45
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(x + r * 0.8, y + r * 0.9)
    g.lineTo(x + r * 1.3 + Math.sin(wave) * r * 0.35, y - r * 0.5)
    g.stroke()
  }
  g.fillStyle = skin
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = hair
  g.beginPath()
  g.arc(x, y - r * 0.1, r * 1.04, Math.PI * 1.05, Math.PI * 1.95)
  g.fill()
  g.fillStyle = '#1f2937'
  g.beginPath()
  g.arc(x - r * 0.35, y + r * 0.1, r * 0.13, 0, Math.PI * 2)
  g.arc(x + r * 0.35, y + r * 0.1, r * 0.13, 0, Math.PI * 2)
  g.fill()
}

/**
 * Side-view bus facing right. (x, y) = bottom centre (road contact). w = length.
 * `heads` lists seated passengers [look, color]; `wave` animates arms.
 */
export function drawBus(g: G, x: number, y: number, w: number, color: number, heads: [number, number][], seats: number, t: number, wave: boolean, wheelRot: number) {
  const hue = HUES[color]
  const h = w * 0.42
  const left = x - w / 2
  const top = y - h - w * 0.05
  // shadow
  g.fillStyle = 'rgba(15,23,42,0.35)'
  g.beginPath()
  g.ellipse(x, y + 2, w * 0.52, w * 0.05, 0, 0, Math.PI * 2)
  g.fill()
  // body
  const gr = g.createLinearGradient(0, top, 0, y)
  gr.addColorStop(0, hue.light)
  gr.addColorStop(0.3, hue.base)
  gr.addColorStop(1, hue.dark)
  g.fillStyle = gr
  g.beginPath()
  g.moveTo(left + w * 0.04, y - w * 0.06)
  g.lineTo(left + w * 0.02, top + h * 0.18)
  g.quadraticCurveTo(left + w * 0.02, top, left + w * 0.1, top)
  g.lineTo(left + w * 0.86, top)
  g.quadraticCurveTo(left + w * 0.97, top + h * 0.05, left + w, top + h * 0.45)
  g.lineTo(left + w, y - w * 0.06)
  g.closePath()
  g.fill()
  g.strokeStyle = hue.dark
  g.lineWidth = 2
  g.stroke()
  // roof highlight
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.beginPath()
  g.roundRect(left + w * 0.08, top + h * 0.05, w * 0.74, h * 0.07, h * 0.035)
  g.fill()
  // windows: seats then windshield
  const wy = top + h * 0.2
  const wh = h * 0.38
  const ww = w * 0.17
  for (let i = 0; i < seats; i++) {
    const wx = left + w * 0.08 + i * (ww + w * 0.035)
    g.fillStyle = '#0f172a'
    g.beginPath()
    g.roundRect(wx, wy, ww, wh, 4)
    g.fill()
    g.save()
    g.beginPath()
    g.roundRect(wx, wy, ww, wh, 4)
    g.clip()
    const glass = g.createLinearGradient(wx, wy, wx + ww, wy + wh)
    glass.addColorStop(0, '#7dd3fc')
    glass.addColorStop(1, '#0369a1')
    g.fillStyle = glass
    g.fillRect(wx, wy, ww, wh)
    const hd = heads[i]
    if (hd) drawHead(g, wx + ww * 0.5, wy + wh * 0.58, ww * 0.24, hd[0], hd[1], wave ? t * 14 + i : 0)
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.beginPath()
    g.moveTo(wx + ww * 0.15, wy)
    g.lineTo(wx + ww * 0.45, wy)
    g.lineTo(wx + ww * 0.05, wy + wh)
    g.lineTo(wx - ww * 0.25, wy + wh)
    g.closePath()
    g.fill()
    g.restore()
  }
  // windshield
  g.fillStyle = '#0c4a6e'
  g.beginPath()
  g.moveTo(left + w * 0.8, wy)
  g.lineTo(left + w * 0.88, wy)
  g.quadraticCurveTo(left + w * 0.97, wy + wh * 0.3, left + w * 0.985, wy + wh)
  g.lineTo(left + w * 0.8, wy + wh)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.4)'
  g.fillRect(left + w * 0.82, wy + 2, w * 0.02, wh - 4)
  // door (between windows and windshield)
  g.fillStyle = hue.dark
  g.beginPath()
  g.roundRect(left + w * 0.7, wy, w * 0.075, h * 0.68, 3)
  g.fill()
  g.fillStyle = 'rgba(186,230,253,0.55)'
  g.fillRect(left + w * 0.71, wy + 3, w * 0.055, wh * 0.7)
  // colour symbol panel
  const sx = left + w * 0.3
  const sy = top + h * 0.78
  g.fillStyle = 'rgba(255,255,255,0.92)'
  g.beginPath()
  g.roundRect(sx - h * 0.2, sy - h * 0.13, h * 0.4, h * 0.26, h * 0.08)
  g.fill()
  g.fillStyle = hue.base
  symbolPath(g, hue.sym, sx, sy, h * 0.1)
  g.fill()
  // stripe
  g.fillStyle = 'rgba(255,255,255,0.75)'
  g.fillRect(left + w * 0.45, top + h * 0.72, w * 0.22, h * 0.05)
  // lights
  g.fillStyle = '#fef08a'
  g.beginPath()
  g.ellipse(left + w * 0.985, y - h * 0.3, w * 0.012, h * 0.07, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#ef4444'
  g.fillRect(left + w * 0.025, y - h * 0.38, w * 0.02, h * 0.12)
  // bumper
  g.fillStyle = '#334155'
  g.beginPath()
  g.roundRect(left + w * 0.02, y - w * 0.07, w * 0.985, w * 0.035, 3)
  g.fill()
  // wheels
  for (const fx of [0.22, 0.8]) {
    const cx = left + w * fx
    const cy = y - w * 0.04
    const r = w * 0.075
    g.fillStyle = '#111827'
    g.beginPath()
    g.arc(cx, cy, r, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#cbd5e1'
    g.beginPath()
    g.arc(cx, cy, r * 0.5, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#64748b'
    g.lineWidth = 1.5
    g.beginPath()
    for (let k = 0; k < 3; k++) {
      const a = wheelRot + (k * Math.PI * 2) / 3
      g.moveTo(cx, cy)
      g.lineTo(cx + Math.cos(a) * r * 0.5, cy + Math.sin(a) * r * 0.5)
    }
    g.stroke()
  }
}

/** Planter box obstacle in the yard, drawn in a cell of size s centred at (x, y). */
export function drawPlanter(g: G, x: number, y: number, s: number) {
  const w = s * 0.86
  g.fillStyle = '#7c4a21'
  g.beginPath()
  g.roundRect(x - w / 2, y - w * 0.1, w, w * 0.5, 6)
  g.fill()
  g.fillStyle = '#a16207'
  g.beginPath()
  g.roundRect(x - w / 2, y - w * 0.12, w, w * 0.14, 5)
  g.fill()
  const bush: [number, number, number][] = [[-0.25, -0.2, 0.24], [0.2, -0.22, 0.26], [0, -0.38, 0.24], [-0.05, -0.12, 0.22]]
  for (const [bx, by, br] of bush) {
    const gr = g.createRadialGradient(x + bx * s - br * s * 0.3, y + by * s - br * s * 0.4, 1, x + bx * s, y + by * s, br * s)
    gr.addColorStop(0, '#86efac')
    gr.addColorStop(1, '#15803d')
    g.fillStyle = gr
    g.beginPath()
    g.arc(x + bx * s, y + by * s, br * s, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = '#f472b6'
  g.beginPath()
  g.arc(x + s * 0.12, y - s * 0.38, s * 0.04, 0, Math.PI * 2)
  g.arc(x - s * 0.22, y - s * 0.26, s * 0.035, 0, Math.PI * 2)
  g.fill()
}

/** Tunnel booth: dark arch facing `dir` (vector toward the cell it feeds). */
export function drawTunnel(g: G, x: number, y: number, s: number, dx: number, dy: number, left: number, nextColor: number) {
  g.save()
  g.translate(x, y)
  g.fillStyle = '#475569'
  g.beginPath()
  g.roundRect(-s * 0.44, -s * 0.44, s * 0.88, s * 0.88, s * 0.18)
  g.fill()
  g.fillStyle = '#64748b'
  g.beginPath()
  g.roundRect(-s * 0.44, -s * 0.44, s * 0.88, s * 0.2, s * 0.12)
  g.fill()
  // opening toward dir
  g.fillStyle = '#0f172a'
  g.beginPath()
  g.ellipse(dx * s * 0.2, dy * s * 0.2, s * (dx ? 0.16 : 0.26), s * (dy ? 0.16 : 0.26), 0, 0, Math.PI * 2)
  g.fill()
  if (nextColor >= 0) {
    g.fillStyle = HUES[nextColor].base
    symbolPath(g, HUES[nextColor].sym, -dx * s * 0.12, -dy * s * 0.12 - (dx ? s * 0.18 : 0), s * 0.1)
    g.fill()
  }
  g.fillStyle = '#ffffff'
  g.font = `900 ${Math.round(s * 0.26)}px 'Plus Jakarta Sans', system-ui, sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.strokeStyle = 'rgba(0,0,0,0.6)'
  g.lineWidth = 3
  g.strokeText(String(left), s * 0.24, -s * 0.26)
  g.fillText(String(left), s * 0.24, -s * 0.26)
  g.restore()
}
