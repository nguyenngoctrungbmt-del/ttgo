/** Vector art for Car Merge: top-down car sprites (cached) and the oval stadium. */

export const CAR_NAMES = ['Buggy', 'Hatchback', 'Sedan', 'Pickup', 'Muscle Car', 'Rally Car', 'Sports Car', 'Supercar', 'Hypercar', 'F1 Racer', 'Jet Car', 'Rocket Car']
export const MAX_TIER = CAR_NAMES.length - 1
export const TIER_COLORS = ['#d6b37a', '#84cc16', '#3b82f6', '#ef4444', '#f97316', '#f8fafc', '#facc15', '#a855f7', '#14b8a6', '#dc2626', '#cbd5e1', '#fb7185']

type G = CanvasRenderingContext2D
const cache = new Map<string, HTMLCanvasElement>()

function lg(g: G, y0: number, y1: number, stops: string[]) {
  const gr = g.createLinearGradient(0, y0, 0, y1)
  stops.forEach((c, i) => gr.addColorStop(i / (stops.length - 1), c))
  return gr
}

/** Body fill with a cross-wise gradient (light along the spine) and an outline. */
function body(g: G, y0: number, y1: number, light: string, mid: string, dark: string, lw = 2.2) {
  g.fillStyle = lg(g, y0, y1, [dark, mid, light, mid, dark])
  g.fill()
  g.lineWidth = lw
  g.strokeStyle = '#0b0f19'
  g.stroke()
}

function wheel(g: G, x: number, y: number, w: number, h: number) {
  g.fillStyle = '#111827'
  g.beginPath()
  g.roundRect(x - w / 2, y - h / 2, w, h, 3)
  g.fill()
  g.fillStyle = '#374151'
  g.fillRect(x - w / 2 + 2, y - 1, w - 4, 2)
}

function glass(g: G, pts: number[], tint = '#1e3a8a') {
  g.beginPath()
  g.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1])
  g.closePath()
  const gr = g.createLinearGradient(pts[0], pts[1], pts[2], pts[3])
  gr.addColorStop(0, '#93c5fd')
  gr.addColorStop(1, tint)
  g.fillStyle = gr
  g.fill()
  g.lineWidth = 1.4
  g.strokeStyle = '#0b0f19'
  g.stroke()
}

function lights(g: G, x: number, y0: number, y1: number, c = '#fef9c3') {
  g.fillStyle = c
  g.beginPath()
  g.ellipse(x, y0, 2, 3.5, 0, 0, Math.PI * 2)
  g.ellipse(x, y1, 2, 3.5, 0, 0, Math.PI * 2)
  g.fill()
}

function shell(g: G, x0: number, x1: number, y0: number, y1: number, nose: number, tail: number) {
  g.beginPath()
  g.moveTo(x0 + tail, y0)
  g.lineTo(x1 - nose, y0)
  g.quadraticCurveTo(x1, y0, x1, (y0 + y1) / 2)
  g.quadraticCurveTo(x1, y1, x1 - nose, y1)
  g.lineTo(x0 + tail, y1)
  g.quadraticCurveTo(x0, y1, x0, (y0 + y1) / 2)
  g.quadraticCurveTo(x0, y0, x0 + tail, y0)
  g.closePath()
}

/** Top-down car pointing right inside a 100×100 box. */
function drawCar(g: G, tier: number) {
  g.lineJoin = 'round'
  g.lineCap = 'round'
  switch (tier) {
    case 0: {
      for (const [x, y] of [[24, 27], [76, 27], [24, 73], [76, 73]]) wheel(g, x, y, 18, 12)
      g.strokeStyle = '#0b0f19'
      g.lineWidth = 4
      g.beginPath()
      g.moveTo(24, 30)
      g.lineTo(76, 30)
      g.moveTo(24, 70)
      g.lineTo(76, 70)
      g.stroke()
      shell(g, 30, 74, 36, 64, 8, 6)
      body(g, 36, 64, '#fde68a', '#d6b37a', '#7c5a2a')
      g.strokeStyle = '#ef4444'
      g.lineWidth = 3
      g.beginPath()
      g.roundRect(38, 38, 24, 24, 5)
      g.stroke()
      g.fillStyle = lg(g, 43, 57, ['#fecaca', '#dc2626'])
      g.beginPath()
      g.arc(50, 50, 7, 0, Math.PI * 2)
      g.fill()
      g.lineWidth = 1.4
      g.strokeStyle = '#0b0f19'
      g.stroke()
      g.fillStyle = '#1e293b'
      g.fillRect(53, 46, 3, 8)
      break
    }
    case 1: {
      for (const [x, y] of [[32, 31], [70, 31], [32, 69], [70, 69]]) wheel(g, x, y, 14, 8)
      shell(g, 20, 80, 32, 68, 10, 8)
      body(g, 32, 68, '#d9f99d', '#84cc16', '#365314')
      glass(g, [62, 36, 70, 40, 70, 60, 62, 64])
      g.fillStyle = lg(g, 38, 62, ['#4d7c0f', '#a3e635', '#4d7c0f'])
      g.beginPath()
      g.roundRect(36, 38, 26, 24, 5)
      g.fill()
      g.stroke()
      glass(g, [28, 38, 34, 38, 34, 62, 28, 62])
      g.fillStyle = '#365314'
      g.fillRect(58, 29, 4, 4)
      g.fillRect(58, 67, 4, 4)
      lights(g, 78, 38, 62)
      break
    }
    case 2: {
      for (const [x, y] of [[28, 32], [72, 32], [28, 68], [72, 68]]) wheel(g, x, y, 15, 8)
      shell(g, 10, 90, 33, 67, 10, 8)
      body(g, 33, 67, '#bfdbfe', '#3b82f6', '#1e3a8a')
      glass(g, [58, 37, 66, 40, 66, 60, 58, 63])
      g.fillStyle = lg(g, 38, 62, ['#1d4ed8', '#60a5fa', '#1d4ed8'])
      g.beginPath()
      g.roundRect(36, 38, 22, 24, 4)
      g.fill()
      g.stroke()
      glass(g, [30, 39, 36, 38, 36, 62, 30, 61])
      g.strokeStyle = 'rgba(15,23,42,0.4)'
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(70, 40)
      g.lineTo(86, 42)
      g.moveTo(70, 60)
      g.lineTo(86, 58)
      g.stroke()
      lights(g, 88, 39, 61)
      lights(g, 11, 39, 61, '#f87171')
      break
    }
    case 3: {
      for (const [x, y] of [[26, 31], [74, 31], [26, 69], [74, 69]]) wheel(g, x, y, 17, 9)
      shell(g, 8, 92, 32, 68, 8, 3)
      body(g, 32, 68, '#fecaca', '#ef4444', '#7f1d1d')
      g.fillStyle = '#450a0a'
      g.beginPath()
      g.roundRect(12, 36, 36, 28, 2)
      g.fill()
      g.strokeStyle = 'rgba(0,0,0,0.5)'
      g.lineWidth = 1.5
      for (let x = 18; x < 46; x += 6) {
        g.beginPath()
        g.moveTo(x, 37)
        g.lineTo(x, 63)
        g.stroke()
      }
      g.fillStyle = lg(g, 37, 63, ['#991b1b', '#f87171', '#991b1b'])
      g.beginPath()
      g.roundRect(50, 37, 20, 26, 4)
      g.fill()
      g.lineWidth = 1.6
      g.strokeStyle = '#0b0f19'
      g.stroke()
      glass(g, [70, 38, 76, 41, 76, 59, 70, 62])
      g.fillStyle = '#94a3b8'
      g.fillRect(90, 36, 3, 28)
      lights(g, 89, 39, 61)
      break
    }
    case 4: {
      for (const [x, y] of [[26, 30], [74, 30], [26, 70], [74, 70]]) wheel(g, x, y, 17, 9)
      shell(g, 6, 94, 31, 69, 6, 6)
      body(g, 31, 69, '#fed7aa', '#f97316', '#9a3412')
      g.fillStyle = '#111827'
      g.fillRect(6, 44, 88, 4)
      g.fillRect(6, 52, 88, 4)
      g.fillStyle = lg(g, 38, 62, ['#7c2d12', '#fb923c', '#7c2d12'])
      g.beginPath()
      g.roundRect(28, 38, 20, 24, 4)
      g.fill()
      g.lineWidth = 1.6
      g.strokeStyle = '#0b0f19'
      g.stroke()
      glass(g, [48, 38, 56, 41, 56, 59, 48, 62])
      g.fillStyle = '#1f2937'
      g.beginPath()
      g.roundRect(64, 43, 12, 14, 2)
      g.fill()
      g.fillStyle = '#9ca3af'
      g.fillRect(66, 46, 8, 1.5)
      g.fillRect(66, 52, 8, 1.5)
      lights(g, 92, 38, 62)
      break
    }
    case 5: {
      for (const [x, y] of [[26, 31], [72, 31], [26, 69], [72, 69]]) wheel(g, x, y, 16, 9)
      shell(g, 12, 88, 32, 68, 9, 7)
      body(g, 32, 68, '#ffffff', '#e2e8f0', '#94a3b8')
      g.fillStyle = '#2563eb'
      g.beginPath()
      g.moveTo(14, 36)
      g.lineTo(60, 36)
      g.lineTo(80, 50)
      g.lineTo(60, 64)
      g.lineTo(14, 64)
      g.lineTo(30, 50)
      g.closePath()
      g.fill()
      g.fillStyle = '#ef4444'
      g.beginPath()
      g.moveTo(30, 50)
      g.lineTo(14, 40)
      g.lineTo(14, 60)
      g.closePath()
      g.fill()
      g.fillStyle = lg(g, 38, 62, ['#1e3a8a', '#3b82f6', '#1e3a8a'])
      g.beginPath()
      g.roundRect(34, 39, 22, 22, 4)
      g.fill()
      g.lineWidth = 1.6
      g.strokeStyle = '#0b0f19'
      g.stroke()
      g.fillStyle = '#facc15'
      g.beginPath()
      g.arc(45, 50, 6, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#0b0f19'
      g.font = '900 9px sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText('7', 45, 50.5)
      glass(g, [56, 38, 64, 41, 64, 59, 56, 62])
      g.fillStyle = '#0b0f19'
      g.beginPath()
      g.roundRect(8, 30, 6, 40, 2)
      g.fill()
      g.fillStyle = '#fef08a'
      for (const y of [40, 46, 54, 60]) {
        g.beginPath()
        g.arc(88, y, 2, 0, Math.PI * 2)
        g.fill()
      }
      break
    }
    case 6: {
      for (const [x, y] of [[26, 33], [72, 33], [26, 67], [72, 67]]) wheel(g, x, y, 16, 8)
      g.beginPath()
      g.moveTo(10, 40)
      g.quadraticCurveTo(14, 33, 30, 34)
      g.quadraticCurveTo(70, 32, 92, 46)
      g.quadraticCurveTo(95, 50, 92, 54)
      g.quadraticCurveTo(70, 68, 30, 66)
      g.quadraticCurveTo(14, 67, 10, 60)
      g.closePath()
      body(g, 33, 67, '#fef9c3', '#facc15', '#a16207')
      g.beginPath()
      g.ellipse(46, 50, 14, 11, 0, 0, Math.PI * 2)
      g.fillStyle = lg(g, 39, 61, ['#1e3a8a', '#60a5fa', '#1e3a8a'])
      g.fill()
      g.lineWidth = 1.6
      g.strokeStyle = '#0b0f19'
      g.stroke()
      g.fillStyle = 'rgba(255,255,255,0.55)'
      g.beginPath()
      g.ellipse(50, 46, 6, 2.5, -0.3, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#111827'
      g.fillRect(12, 44, 3, 12)
      lights(g, 88, 44, 56)
      break
    }
    case 7: {
      for (const [x, y] of [[26, 31], [74, 31], [26, 69], [74, 69]]) wheel(g, x, y, 17, 8)
      g.beginPath()
      g.moveTo(8, 34)
      g.lineTo(60, 30)
      g.lineTo(94, 44)
      g.lineTo(94, 56)
      g.lineTo(60, 70)
      g.lineTo(8, 66)
      g.closePath()
      body(g, 30, 70, '#e9d5ff', '#a855f7', '#4c1d95')
      g.fillStyle = '#1e1b4b'
      g.beginPath()
      g.moveTo(26, 33)
      g.lineTo(40, 36)
      g.lineTo(28, 40)
      g.closePath()
      g.moveTo(26, 67)
      g.lineTo(40, 64)
      g.lineTo(28, 60)
      g.closePath()
      g.fill()
      glass(g, [42, 38, 66, 42, 66, 58, 42, 62], '#312e81')
      g.strokeStyle = '#1e1b4b'
      g.lineWidth = 1.5
      for (let x = 14; x < 36; x += 5) {
        g.beginPath()
        g.moveTo(x, 44)
        g.lineTo(x, 56)
        g.stroke()
      }
      lights(g, 90, 45, 55, '#e0f2fe')
      break
    }
    case 8: {
      for (const [x, y] of [[28, 32], [74, 33], [28, 68], [74, 67]]) wheel(g, x, y, 16, 8)
      g.beginPath()
      g.moveTo(14, 34)
      g.quadraticCurveTo(50, 28, 80, 42)
      g.lineTo(97, 48)
      g.lineTo(97, 52)
      g.lineTo(80, 58)
      g.quadraticCurveTo(50, 72, 14, 66)
      g.closePath()
      body(g, 30, 70, '#ccfbf1', '#14b8a6', '#134e4a')
      g.fillStyle = '#0b0f19'
      g.beginPath()
      g.roundRect(5, 26, 9, 48, 3)
      g.fill()
      g.fillStyle = '#334155'
      g.fillRect(14, 44, 6, 2)
      g.fillRect(14, 54, 6, 2)
      g.beginPath()
      g.ellipse(48, 50, 13, 9, 0, 0, Math.PI * 2)
      g.fillStyle = lg(g, 41, 59, ['#0f172a', '#38bdf8', '#0f172a'])
      g.fill()
      g.lineWidth = 1.6
      g.strokeStyle = '#0b0f19'
      g.stroke()
      g.strokeStyle = 'rgba(15,23,42,0.6)'
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(64, 40)
      g.lineTo(86, 47)
      g.moveTo(64, 60)
      g.lineTo(86, 53)
      g.stroke()
      lights(g, 93, 47, 53, '#e0f2fe')
      break
    }
    case 9: {
      for (const [x, y] of [[24, 30], [74, 32], [24, 70], [74, 68]]) wheel(g, x, y, 18, 11)
      g.fillStyle = '#0b0f19'
      g.beginPath()
      g.roundRect(87, 26, 8, 48, 2)
      g.roundRect(4, 28, 10, 44, 2)
      g.fill()
      g.fillStyle = '#dc2626'
      g.fillRect(88, 28, 6, 44)
      g.beginPath()
      g.moveTo(12, 44)
      g.lineTo(30, 40)
      g.lineTo(60, 44)
      g.lineTo(96, 47)
      g.lineTo(96, 53)
      g.lineTo(60, 56)
      g.lineTo(30, 60)
      g.lineTo(12, 56)
      g.closePath()
      body(g, 40, 60, '#fecaca', '#dc2626', '#7f1d1d')
      g.beginPath()
      g.ellipse(36, 39, 10, 4, 0, 0, Math.PI * 2)
      g.ellipse(36, 61, 10, 4, 0, 0, Math.PI * 2)
      g.fillStyle = '#991b1b'
      g.fill()
      g.stroke()
      g.fillStyle = lg(g, 45, 55, ['#facc15', '#fef9c3', '#facc15'])
      g.beginPath()
      g.arc(46, 50, 5, 0, Math.PI * 2)
      g.fill()
      g.lineWidth = 1.4
      g.stroke()
      g.fillStyle = '#ffffff'
      g.fillRect(60, 48.5, 24, 3)
      break
    }
    case 10: {
      g.beginPath()
      g.moveTo(14, 46)
      g.lineTo(4, 22)
      g.lineTo(14, 22)
      g.lineTo(40, 44)
      g.lineTo(40, 56)
      g.lineTo(14, 78)
      g.lineTo(4, 78)
      g.lineTo(14, 54)
      g.closePath()
      body(g, 22, 78, '#e2e8f0', '#94a3b8', '#334155')
      wheel(g, 64, 38, 12, 6)
      wheel(g, 64, 62, 12, 6)
      g.beginPath()
      g.moveTo(8, 42)
      g.lineTo(70, 40)
      g.quadraticCurveTo(96, 44, 98, 50)
      g.quadraticCurveTo(96, 56, 70, 60)
      g.lineTo(8, 58)
      g.closePath()
      body(g, 40, 60, '#ffffff', '#cbd5e1', '#475569')
      g.fillStyle = '#ef4444'
      g.fillRect(20, 48, 50, 4)
      g.beginPath()
      g.ellipse(70, 50, 9, 5, 0, 0, Math.PI * 2)
      g.fillStyle = lg(g, 45, 55, ['#0f172a', '#7dd3fc', '#0f172a'])
      g.fill()
      g.lineWidth = 1.4
      g.strokeStyle = '#0b0f19'
      g.stroke()
      g.fillStyle = '#1f2937'
      g.beginPath()
      g.arc(8, 50, 5, 0, Math.PI * 2)
      g.fill()
      break
    }
    default: {
      for (const s of [-1, 1]) {
        g.beginPath()
        g.moveTo(12, 50 + s * 8)
        g.lineTo(4, 50 + s * 30)
        g.lineTo(24, 50 + s * 26)
        g.lineTo(34, 50 + s * 10)
        g.closePath()
        body(g, 50 - 30, 50 + 30, '#fecdd3', '#fb7185', '#9f1239')
      }
      g.beginPath()
      g.moveTo(10, 40)
      g.lineTo(70, 38)
      g.quadraticCurveTo(98, 44, 99, 50)
      g.quadraticCurveTo(98, 56, 70, 62)
      g.lineTo(10, 60)
      g.closePath()
      body(g, 38, 62, '#ffffff', '#f1f5f9', '#94a3b8')
      g.fillStyle = '#e11d48'
      g.beginPath()
      g.moveTo(78, 40)
      g.quadraticCurveTo(98, 44, 99, 50)
      g.quadraticCurveTo(98, 56, 78, 60)
      g.closePath()
      g.fill()
      g.fillStyle = '#e11d48'
      g.fillRect(28, 38.5, 6, 23)
      g.beginPath()
      g.arc(56, 50, 6, 0, Math.PI * 2)
      g.fillStyle = lg(g, 44, 56, ['#0f172a', '#7dd3fc', '#0f172a'])
      g.fill()
      g.lineWidth = 1.6
      g.strokeStyle = '#0b0f19'
      g.stroke()
      g.fillStyle = '#334155'
      g.fillRect(6, 42, 6, 16)
    }
  }
  // roof gloss
  g.fillStyle = 'rgba(255,255,255,0.18)'
  g.beginPath()
  g.ellipse(52, 44, 28, 3, 0, 0, Math.PI * 2)
  g.fill()
}

/** Cached top-down car sprite pointing right (square canvas). */
export function carSprite(tier: number, size: number): HTMLCanvasElement {
  const px = Math.max(16, Math.round(size))
  const key = `${tier}|${px}`
  const hit = cache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const c = document.createElement('canvas')
  c.width = Math.ceil(px * dpr)
  c.height = Math.ceil(px * dpr)
  const g = c.getContext('2d')!
  const s = (px * dpr) / 100
  // soft shadow
  g.fillStyle = 'rgba(0,0,0,0.28)'
  g.beginPath()
  g.ellipse(52 * s, 55 * s, 44 * s, 22 * s, 0, 0, Math.PI * 2)
  g.fill()
  g.scale(s, s)
  drawCar(g, tier)
  cache.set(key, c)
  if (cache.size > 160) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return c
}

/** Exhaust flame behind fast cars, drawn in car space (pointing right, length L). */
export function drawFlame(g: G, L: number, t: number, power: number, color = '#fb923c') {
  const f = L * (0.22 + power * 0.25) * (0.85 + Math.sin(t * 40) * 0.15)
  const gr = g.createLinearGradient(-L * 0.45, 0, -L * 0.45 - f, 0)
  gr.addColorStop(0, '#ffffff')
  gr.addColorStop(0.3, '#fde047')
  gr.addColorStop(0.7, color)
  gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr
  g.beginPath()
  g.moveTo(-L * 0.43, -L * 0.08)
  g.quadraticCurveTo(-L * 0.45 - f * 0.6, -L * 0.1, -L * 0.45 - f, 0)
  g.quadraticCurveTo(-L * 0.45 - f * 0.6, L * 0.1, -L * 0.43, L * 0.08)
  g.closePath()
  g.fill()
}

// ── Track ──────────────────────────────────────────────────

export type TrackGeo = { cx: number; cy: number; half: number; R: number; band: number }

/** Point and heading at progress s (0..1) along the stadium oval, offset `lane` px outward. */
export function trackPoint(T: TrackGeo, s: number, lane: number) {
  const straight = T.half * 2
  const arc = Math.PI * T.R
  const total = straight * 2 + arc * 2
  let d = (((s % 1) + 1) % 1) * total
  const R = T.R + lane
  // start: bottom straight, heading right (counter-clockwise on screen = up the right bend)
  if (d < straight) return { x: T.cx - T.half + d, y: T.cy + R, a: 0 }
  d -= straight
  if (d < arc) {
    const th = Math.PI / 2 - d / T.R
    return { x: T.cx + T.half + Math.cos(th) * R, y: T.cy + Math.sin(th) * R, a: th - Math.PI / 2 }
  }
  d -= arc
  if (d < straight) return { x: T.cx + T.half - d, y: T.cy - R, a: Math.PI }
  d -= straight
  const th = -Math.PI / 2 - d / T.R
  return { x: T.cx - T.half + Math.cos(th) * R, y: T.cy + Math.sin(th) * R, a: th - Math.PI / 2 }
}

const trackCache = new Map<string, HTMLCanvasElement>()

/** Static stadium: stands, grass, asphalt band, curbs, start line. */
export function trackSprite(W: number, H: number, T: TrackGeo, night: boolean): HTMLCanvasElement {
  const key = `${W}|${H}|${night}`
  const hit = trackCache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const c = document.createElement('canvas')
  c.width = Math.ceil(W * dpr)
  c.height = Math.ceil(H * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  const sky = g.createLinearGradient(0, 0, 0, H)
  sky.addColorStop(0, night ? '#0f172a' : '#166534')
  sky.addColorStop(1, night ? '#14532d' : '#4ade80')
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)
  // mowing stripes
  g.fillStyle = 'rgba(255,255,255,0.05)'
  for (let x = 0; x < W; x += 28) g.fillRect(x, 0, 14, H)
  // grandstand at the top
  const sy = Math.max(4, T.cy - T.R - T.band / 2 - 40)
  g.fillStyle = night ? '#1e293b' : '#475569'
  g.beginPath()
  g.roundRect(W * 0.1, sy, W * 0.8, 26, 6)
  g.fill()
  let seed = 3
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  const crowd = ['#f87171', '#60a5fa', '#facc15', '#f472b6', '#4ade80', '#ffffff', '#fb923c']
  for (let row = 0; row < 3; row++) {
    for (let x = W * 0.12; x < W * 0.88; x += 6) {
      g.fillStyle = crowd[Math.floor(rnd() * crowd.length)]
      g.beginPath()
      g.arc(x + (row % 2) * 3, sy + 6 + row * 7, 2.4, 0, Math.PI * 2)
      g.fill()
    }
  }
  g.fillStyle = night ? '#334155' : '#1e293b'
  g.fillRect(W * 0.1, sy + 24, W * 0.8, 4)
  // asphalt band
  const outerR = T.R + T.band / 2
  const innerR = T.R - T.band / 2
  const stadium = (r: number) => {
    g.beginPath()
    g.moveTo(T.cx - T.half, T.cy - r)
    g.lineTo(T.cx + T.half, T.cy - r)
    g.arc(T.cx + T.half, T.cy, r, -Math.PI / 2, Math.PI / 2)
    g.lineTo(T.cx - T.half, T.cy + r)
    g.arc(T.cx - T.half, T.cy, r, Math.PI / 2, Math.PI * 1.5)
    g.closePath()
  }
  // curbs: red/white dashes on the outer edge
  stadium(outerR + 4)
  g.fillStyle = '#ffffff'
  g.fill()
  g.setLineDash([8, 8])
  g.strokeStyle = '#ef4444'
  g.lineWidth = 8
  stadium(outerR + 1)
  g.stroke()
  g.setLineDash([])
  stadium(outerR)
  const asp = g.createLinearGradient(0, T.cy - outerR, 0, T.cy + outerR)
  asp.addColorStop(0, '#374151')
  asp.addColorStop(1, '#1f2937')
  g.fillStyle = asp
  g.fill()
  // lane lines
  g.setLineDash([10, 12])
  g.strokeStyle = 'rgba(255,255,255,0.22)'
  g.lineWidth = 1.5
  stadium(T.R)
  g.stroke()
  g.setLineDash([])
  // infield
  stadium(innerR)
  g.fillStyle = '#ffffff'
  g.fill()
  stadium(innerR - 3)
  const inf = g.createLinearGradient(0, T.cy - innerR, 0, T.cy + innerR)
  inf.addColorStop(0, night ? '#166534' : '#22c55e')
  inf.addColorStop(1, night ? '#14532d' : '#15803d')
  g.fillStyle = inf
  g.fill()
  // infield logo ring
  g.strokeStyle = 'rgba(255,255,255,0.35)'
  g.lineWidth = 3
  g.beginPath()
  g.ellipse(T.cx, T.cy, Math.min(T.half + innerR * 0.5, innerR * 1.6), innerR * 0.5, 0, 0, Math.PI * 2)
  g.stroke()
  // trees in the infield
  for (const ox of [-0.7, 0.7]) {
    const tx = T.cx + T.half * ox
    g.fillStyle = 'rgba(0,0,0,0.2)'
    g.beginPath()
    g.ellipse(tx + 3, T.cy + 4, 12, 7, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#15803d'
    g.beginPath()
    g.arc(tx, T.cy, 11, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#4ade80'
    g.beginPath()
    g.arc(tx - 3, T.cy - 3, 6, 0, Math.PI * 2)
    g.fill()
  }
  // checkered start line on the bottom straight
  const sx = T.cx - T.half + 6
  const n = Math.round(T.band / 6)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 ? '#0b0f19' : '#ffffff'
      g.fillRect(sx + j * 5, T.cy + innerR + i * (T.band / n), 5, T.band / n)
    }
  }
  trackCache.set(key, c)
  if (trackCache.size > 6) {
    const first = trackCache.keys().next().value
    if (first) trackCache.delete(first)
  }
  return c
}
