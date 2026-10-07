/** Parking Jam vector art: top-down cars & trucks, cones, grandma. */

export type Paint = { base: string; light: string; dark: string }

export const PAINTS: Paint[] = [
  { base: '#ef4444', light: '#fca5a5', dark: '#991b1b' },
  { base: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a' },
  { base: '#facc15', light: '#fef08a', dark: '#a16207' },
  { base: '#22c55e', light: '#86efac', dark: '#166534' },
  { base: '#a855f7', light: '#d8b4fe', dark: '#581c87' },
  { base: '#f97316', light: '#fdba74', dark: '#9a3412' },
  { base: '#14b8a6', light: '#5eead4', dark: '#115e59' },
  { base: '#f1f5f9', light: '#ffffff', dark: '#64748b' },
]

type G = CanvasRenderingContext2D

/** Car facing +x, centred at (0,0); L = length, B = breadth (px). */
export function drawCar(g: G, L: number, B: number, p: Paint, truck: boolean) {
  const hl = L / 2
  const hb = B / 2
  // soft shadow
  g.fillStyle = 'rgba(2,6,23,0.35)'
  g.beginPath()
  g.roundRect(-hl + 2, -hb + 4, L, B, B * 0.3)
  g.fill()
  // wheels peeking out
  g.fillStyle = '#0f172a'
  const wx = [-hl + L * 0.2, hl - L * 0.2]
  for (const x of wx) {
    g.beginPath()
    g.roundRect(x - B * 0.17, -hb - 2, B * 0.34, B * 0.16, 2)
    g.roundRect(x - B * 0.17, hb - B * 0.14, B * 0.34, B * 0.16, 2)
    g.fill()
  }
  if (truck) {
    const cab = Math.min(L * 0.34, B * 1.1)
    // cargo box
    const bx0 = -hl
    const bx1 = hl - cab - 2
    const gb = g.createLinearGradient(0, -hb, 0, hb)
    gb.addColorStop(0, '#f8fafc')
    gb.addColorStop(0.5, '#e2e8f0')
    gb.addColorStop(1, '#94a3b8')
    g.fillStyle = gb
    g.beginPath()
    g.roundRect(bx0, -hb, bx1 - bx0, B, 4)
    g.fill()
    g.strokeStyle = '#64748b'
    g.lineWidth = 1.5
    g.stroke()
    g.strokeStyle = 'rgba(100,116,139,0.6)'
    g.lineWidth = 1
    for (let x = bx0 + 8; x < bx1 - 4; x += 8) {
      g.beginPath()
      g.moveTo(x, -hb + 3)
      g.lineTo(x, hb - 3)
      g.stroke()
    }
    g.fillStyle = p.base
    g.fillRect(bx0 + 4, -hb * 0.35, bx1 - bx0 - 8, B * 0.35)
    // cab
    const gc = g.createLinearGradient(0, -hb, 0, hb)
    gc.addColorStop(0, p.light)
    gc.addColorStop(0.5, p.base)
    gc.addColorStop(1, p.dark)
    g.fillStyle = gc
    g.beginPath()
    g.roundRect(hl - cab, -hb + 1, cab, B - 2, [4, B * 0.3, B * 0.3, 4])
    g.fill()
    g.fillStyle = '#0c4a6e'
    g.beginPath()
    g.roundRect(hl - cab * 0.45, -hb * 0.78, cab * 0.22, B * 0.78, 3)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.fillRect(hl - cab * 0.42, -hb * 0.7, cab * 0.06, B * 0.6)
    lights(g, hl, hb, B, -hl)
    return
  }
  // body
  const gr = g.createLinearGradient(0, -hb, 0, hb)
  gr.addColorStop(0, p.light)
  gr.addColorStop(0.45, p.base)
  gr.addColorStop(1, p.dark)
  g.fillStyle = gr
  g.beginPath()
  g.roundRect(-hl, -hb, L, B, [B * 0.32, B * 0.42, B * 0.42, B * 0.32])
  g.fill()
  g.strokeStyle = p.dark
  g.lineWidth = 1.2
  g.stroke()
  // windshield + rear window + roof
  const ws = g.createLinearGradient(L * 0.1, 0, L * 0.3, 0)
  ws.addColorStop(0, '#0c4a6e')
  ws.addColorStop(1, '#38bdf8')
  g.fillStyle = ws
  g.beginPath()
  g.moveTo(L * 0.08, -hb * 0.72)
  g.lineTo(L * 0.25, -hb * 0.82)
  g.quadraticCurveTo(L * 0.3, 0, L * 0.25, hb * 0.82)
  g.lineTo(L * 0.08, hb * 0.72)
  g.closePath()
  g.fill()
  g.fillStyle = '#0c4a6e'
  g.beginPath()
  g.moveTo(-L * 0.24, -hb * 0.7)
  g.lineTo(-L * 0.33, -hb * 0.62)
  g.quadraticCurveTo(-L * 0.37, 0, -L * 0.33, hb * 0.62)
  g.lineTo(-L * 0.24, hb * 0.7)
  g.closePath()
  g.fill()
  const roof = g.createLinearGradient(0, -hb, 0, hb)
  roof.addColorStop(0, p.light)
  roof.addColorStop(1, p.base)
  g.fillStyle = roof
  g.beginPath()
  g.roundRect(-L * 0.24, -hb * 0.68, L * 0.32, B * 0.68, B * 0.12)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.4)'
  g.beginPath()
  g.roundRect(-L * 0.2, -hb * 0.55, L * 0.24, B * 0.12, 2)
  g.fill()
  // hood crease
  g.strokeStyle = 'rgba(255,255,255,0.3)'
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(L * 0.3, -hb * 0.3)
  g.lineTo(hl - 4, -hb * 0.25)
  g.stroke()
  // mirrors
  g.fillStyle = p.dark
  g.beginPath()
  g.ellipse(L * 0.12, -hb - 1.5, 2.5, 2, 0, 0, Math.PI * 2)
  g.ellipse(L * 0.12, hb + 1.5, 2.5, 2, 0, 0, Math.PI * 2)
  g.fill()
  lights(g, hl, hb, B, -hl)
}

function lights(g: G, hl: number, hb: number, B: number, rear: number) {
  g.fillStyle = '#fef9c3'
  g.beginPath()
  g.ellipse(hl - 2.5, -hb * 0.62, 2.2, B * 0.1, 0, 0, Math.PI * 2)
  g.ellipse(hl - 2.5, hb * 0.62, 2.2, B * 0.1, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#dc2626'
  g.fillRect(rear, -hb * 0.78, 2.5, B * 0.2)
  g.fillRect(rear, hb * 0.58, 2.5, B * 0.2)
}

const cache = new Map<string, HTMLCanvasElement>()

/** Cached car sprite facing +x; canvas is (L+8)×(B+10) with the car centred. */
export function carSprite(color: number, L: number, B: number, truck: boolean) {
  const key = `${color}|${Math.round(L)}|${Math.round(B)}|${truck ? 1 : 0}`
  const hit = cache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const c = document.createElement('canvas')
  c.width = Math.ceil((L + 8) * dpr)
  c.height = Math.ceil((B + 10) * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate((L + 8) / 2, (B + 10) / 2)
  drawCar(g, L, B, PAINTS[color % PAINTS.length], truck)
  cache.set(key, c)
  if (cache.size > 120) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return c
}

export function clearCarCache() {
  cache.clear()
}

export function drawCone(g: G, x: number, y: number, s: number) {
  g.fillStyle = 'rgba(2,6,23,0.3)'
  g.beginPath()
  g.ellipse(x + 2, y + 3, s * 0.36, s * 0.3, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#c2410c'
  g.beginPath()
  g.roundRect(x - s * 0.34, y - s * 0.34, s * 0.68, s * 0.68, 4)
  g.fill()
  const gr = g.createRadialGradient(x - s * 0.08, y - s * 0.08, 1, x, y, s * 0.26)
  gr.addColorStop(0, '#fdba74')
  gr.addColorStop(1, '#ea580c')
  g.fillStyle = gr
  g.beginPath()
  g.arc(x, y, s * 0.26, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#ffffff'
  g.lineWidth = s * 0.06
  g.beginPath()
  g.arc(x, y, s * 0.17, 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = '#9a3412'
  g.beginPath()
  g.arc(x, y, s * 0.06, 0, Math.PI * 2)
  g.fill()
}

/** Grandma seen from above-front; (x,y) = feet. step animates the walk. */
export function drawGrandma(g: G, x: number, y: number, s: number, step: number, alarm: boolean) {
  g.save()
  g.translate(x, y)
  g.fillStyle = 'rgba(2,6,23,0.3)'
  g.beginPath()
  g.ellipse(0, 0, s * 0.28, s * 0.09, 0, 0, Math.PI * 2)
  g.fill()
  const sw = Math.sin(step) * s * 0.06
  // legs
  g.fillStyle = '#e7c9a9'
  g.fillRect(-s * 0.1 + sw, -s * 0.16, s * 0.07, s * 0.16)
  g.fillRect(s * 0.04 - sw, -s * 0.16, s * 0.07, s * 0.16)
  // dress
  const gr = g.createLinearGradient(-s * 0.2, -s * 0.6, s * 0.2, -s * 0.12)
  gr.addColorStop(0, '#c4b5fd')
  gr.addColorStop(1, '#6d28d9')
  g.fillStyle = gr
  g.beginPath()
  g.moveTo(-s * 0.24, -s * 0.13)
  g.quadraticCurveTo(-s * 0.18, -s * 0.55, 0, -s * 0.58)
  g.quadraticCurveTo(s * 0.18, -s * 0.55, s * 0.24, -s * 0.13)
  g.closePath()
  g.fill()
  // purse
  g.fillStyle = '#be185d'
  g.beginPath()
  g.roundRect(-s * 0.32, -s * 0.36, s * 0.13, s * 0.11, 2)
  g.fill()
  // cane
  g.strokeStyle = '#78350f'
  g.lineWidth = s * 0.04
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(s * 0.3, -s * 0.02)
  g.lineTo(s * 0.26, -s * 0.4)
  g.quadraticCurveTo(s * 0.24, -s * 0.48, s * 0.17, -s * 0.44)
  g.stroke()
  // head
  g.fillStyle = '#fcd9b8'
  g.beginPath()
  g.arc(0, -s * 0.7, s * 0.14, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#e5e7eb'
  g.beginPath()
  g.arc(0, -s * 0.74, s * 0.14, Math.PI, 0)
  g.fill()
  g.beginPath()
  g.arc(0, -s * 0.88, s * 0.07, 0, Math.PI * 2)
  g.fill()
  // glasses
  g.strokeStyle = '#334155'
  g.lineWidth = 1.2
  g.beginPath()
  g.arc(-s * 0.05, -s * 0.69, s * 0.035, 0, Math.PI * 2)
  g.moveTo(s * 0.085, -s * 0.69)
  g.arc(s * 0.05, -s * 0.69, s * 0.035, 0, Math.PI * 2)
  g.stroke()
  if (alarm) {
    g.fillStyle = '#facc15'
    g.beginPath()
    g.moveTo(0, -s * 1.38)
    g.lineTo(s * 0.17, -s * 1.08)
    g.lineTo(-s * 0.17, -s * 1.08)
    g.closePath()
    g.fill()
    g.fillStyle = '#7c2d12'
    g.fillRect(-s * 0.018, -s * 1.3, s * 0.036, s * 0.12)
    g.fillRect(-s * 0.018, -s * 1.15, s * 0.036, s * 0.035)
  }
  g.restore()
}

/** Cartoon anger mark (four bent strokes). */
export function drawAnger(g: G, x: number, y: number, r: number) {
  g.strokeStyle = '#dc2626'
  g.lineWidth = r * 0.28
  g.lineCap = 'round'
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4
    const cx = x + Math.cos(a) * r * 0.55
    const cy = y + Math.sin(a) * r * 0.55
    g.beginPath()
    g.arc(cx, cy, r * 0.42, a + Math.PI * 0.75, a + Math.PI * 1.25)
    g.stroke()
  }
}
