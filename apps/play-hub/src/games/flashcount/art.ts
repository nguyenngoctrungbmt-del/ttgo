/** Vector art for Flash Count objects. Each kind is drawn once per size into a cached sprite. */

export type Kind = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

export const KINDS: { name: string; one: string; color: string }[] = [
  { name: 'apples', one: 'apple', color: '#ef4444' },
  { name: 'stars', one: 'star', color: '#facc15' },
  { name: 'gems', one: 'gem', color: '#22d3ee' },
  { name: 'critters', one: 'critter', color: '#4ade80' },
  { name: 'fish', one: 'fish', color: '#fb923c' },
  { name: 'mushrooms', one: 'mushroom', color: '#c084fc' },
  { name: 'balloons', one: 'balloon', color: '#f472b6' },
  { name: 'moons', one: 'moon', color: '#c7d2fe' },
]

function eyes(ctx: CanvasRenderingContext2D, r: number, y: number, gap: number) {
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#1f2937'
    ctx.beginPath()
    ctx.ellipse(s * gap * r, y * r, r * 0.11, r * 0.14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(s * gap * r - r * 0.03, y * r - r * 0.05, r * 0.045, 0, Math.PI * 2)
    ctx.fill()
  }
}

function smile(ctx: CanvasRenderingContext2D, r: number, y: number, color = '#1f2937') {
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1.2, r * 0.07)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.arc(0, y * r, r * 0.16, 0.2 * Math.PI, 0.8 * Math.PI)
  ctx.stroke()
}

function starPath(ctx: CanvasRenderingContext2D, r: number, inner: number, points = 5) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points
    const rr = i % 2 ? r * inner : r
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
}

/** Draws a kind centred at the origin with radius r. */
export function drawKind(ctx: CanvasRenderingContext2D, kind: Kind, r: number) {
  ctx.lineJoin = 'round'
  if (kind === 0) {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r * 1.1)
    g.addColorStop(0, '#fca5a5')
    g.addColorStop(0.45, '#ef4444')
    g.addColorStop(1, '#991b1b')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.6)
    ctx.bezierCurveTo(r * 0.5, -r * 1.05, r * 1.15, -r * 0.5, r * 0.98, r * 0.2)
    ctx.bezierCurveTo(r * 0.85, r * 0.85, r * 0.35, r * 1.05, 0, r * 0.85)
    ctx.bezierCurveTo(-r * 0.35, r * 1.05, -r * 0.85, r * 0.85, -r * 0.98, r * 0.2)
    ctx.bezierCurveTo(-r * 1.15, -r * 0.5, -r * 0.5, -r * 1.05, 0, -r * 0.6)
    ctx.fill()
    ctx.strokeStyle = '#7f1d1d'
    ctx.lineWidth = Math.max(1, r * 0.06)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.ellipse(-r * 0.42, -r * 0.2, r * 0.14, r * 0.28, 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = Math.max(1.5, r * 0.12)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.6)
    ctx.quadraticCurveTo(r * 0.05, -r * 0.95, r * 0.2, -r * 1.1)
    ctx.stroke()
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.ellipse(r * 0.48, -r * 0.98, r * 0.32, r * 0.15, -0.5, 0, Math.PI * 2)
    ctx.fill()
  } else if (kind === 1) {
    const g = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r)
    g.addColorStop(0, '#fef9c3')
    g.addColorStop(0.5, '#facc15')
    g.addColorStop(1, '#ca8a04')
    ctx.fillStyle = g
    starPath(ctx, r * 1.08, 0.48)
    ctx.fill()
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = Math.max(1, r * 0.07)
    ctx.stroke()
    eyes(ctx, r, 0, 0.2)
    smile(ctx, r, 0.12)
  } else if (kind === 2) {
    const top = -r * 0.85
    ctx.fillStyle = '#0891b2'
    ctx.beginPath()
    ctx.moveTo(-r * 0.95, -r * 0.25)
    ctx.lineTo(-r * 0.5, top)
    ctx.lineTo(r * 0.5, top)
    ctx.lineTo(r * 0.95, -r * 0.25)
    ctx.lineTo(0, r * 0.95)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#155e75'
    ctx.lineWidth = Math.max(1, r * 0.07)
    ctx.stroke()
    // Facets
    ctx.fillStyle = '#67e8f9'
    ctx.beginPath()
    ctx.moveTo(-r * 0.5, top)
    ctx.lineTo(r * 0.5, top)
    ctx.lineTo(r * 0.3, -r * 0.25)
    ctx.lineTo(-r * 0.3, -r * 0.25)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#22d3ee'
    ctx.beginPath()
    ctx.moveTo(-r * 0.3, -r * 0.25)
    ctx.lineTo(r * 0.3, -r * 0.25)
    ctx.lineTo(0, r * 0.95)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.beginPath()
    ctx.moveTo(-r * 0.38, -r * 0.72)
    ctx.lineTo(-r * 0.12, -r * 0.72)
    ctx.lineTo(-r * 0.25, -r * 0.4)
    ctx.closePath()
    ctx.fill()
  } else if (kind === 3) {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.1)
    g.addColorStop(0, '#bbf7d0')
    g.addColorStop(0.5, '#4ade80')
    g.addColorStop(1, '#15803d')
    // feet
    ctx.fillStyle = '#166534'
    ctx.beginPath()
    ctx.ellipse(-r * 0.45, r * 0.82, r * 0.28, r * 0.16, 0, 0, Math.PI * 2)
    ctx.ellipse(r * 0.45, r * 0.82, r * 0.28, r * 0.16, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-r * 0.95, r * 0.6)
    ctx.bezierCurveTo(-r * 1.1, -r * 0.4, -r * 0.6, -r * 0.95, 0, -r * 0.95)
    ctx.bezierCurveTo(r * 0.6, -r * 0.95, r * 1.1, -r * 0.4, r * 0.95, r * 0.6)
    ctx.quadraticCurveTo(0, r * 0.95, -r * 0.95, r * 0.6)
    ctx.fill()
    ctx.strokeStyle = '#14532d'
    ctx.lineWidth = Math.max(1, r * 0.06)
    ctx.stroke()
    // antennae
    ctx.strokeStyle = '#15803d'
    ctx.lineWidth = Math.max(1.2, r * 0.08)
    ctx.lineCap = 'round'
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(s * r * 0.25, -r * 0.88)
      ctx.quadraticCurveTo(s * r * 0.35, -r * 1.25, s * r * 0.55, -r * 1.2)
      ctx.stroke()
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(s * r * 0.55, -r * 1.2, r * 0.12, 0, Math.PI * 2)
      ctx.fill()
    }
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(s * r * 0.32, -r * 0.18, r * 0.24, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#111827'
      ctx.beginPath()
      ctx.arc(s * r * 0.32 + r * 0.04, -r * 0.14, r * 0.12, 0, Math.PI * 2)
      ctx.fill()
    }
    smile(ctx, r, 0.25, '#14532d')
  } else if (kind === 4) {
    const g = ctx.createLinearGradient(0, -r, 0, r)
    g.addColorStop(0, '#fdba74')
    g.addColorStop(1, '#ea580c')
    ctx.fillStyle = '#c2410c'
    ctx.beginPath()
    ctx.moveTo(r * 0.55, 0)
    ctx.lineTo(r * 1.1, -r * 0.55)
    ctx.quadraticCurveTo(r * 0.95, 0, r * 1.1, r * 0.55)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(-r * 0.1, 0, r * 0.8, r * 0.58, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#9a3412'
    ctx.lineWidth = Math.max(1, r * 0.06)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = Math.max(1, r * 0.1)
    ctx.beginPath()
    ctx.arc(-r * 0.05, 0, r * 0.42, -0.9, 0.9)
    ctx.stroke()
    ctx.fillStyle = '#c2410c'
    ctx.beginPath()
    ctx.moveTo(-r * 0.2, -r * 0.55)
    ctx.quadraticCurveTo(r * 0.1, -r * 0.95, r * 0.3, -r * 0.5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(-r * 0.5, -r * 0.1, r * 0.17, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(-r * 0.54, -r * 0.1, r * 0.09, 0, Math.PI * 2)
    ctx.fill()
  } else if (kind === 5) {
    ctx.fillStyle = '#fef3c7'
    ctx.beginPath()
    ctx.moveTo(-r * 0.32, -r * 0.1)
    ctx.quadraticCurveTo(-r * 0.42, r * 0.8, -r * 0.2, r * 0.95)
    ctx.lineTo(r * 0.2, r * 0.95)
    ctx.quadraticCurveTo(r * 0.42, r * 0.8, r * 0.32, -r * 0.1)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#a8a29e'
    ctx.lineWidth = Math.max(1, r * 0.05)
    ctx.stroke()
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.6, r * 0.1, 0, -r * 0.2, r * 1.1)
    g.addColorStop(0, '#e9d5ff')
    g.addColorStop(0.5, '#a855f7')
    g.addColorStop(1, '#6b21a8')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-r * 1.0, r * 0.05)
    ctx.bezierCurveTo(-r * 1.0, -r * 0.95, r * 1.0, -r * 0.95, r * 1.0, r * 0.05)
    ctx.quadraticCurveTo(0, -r * 0.15, -r * 1.0, r * 0.05)
    ctx.fill()
    ctx.strokeStyle = '#581c87'
    ctx.lineWidth = Math.max(1, r * 0.06)
    ctx.stroke()
    ctx.fillStyle = '#fff'
    for (const [x, y, s] of [[-0.5, -0.25, 0.15], [0.1, -0.55, 0.18], [0.6, -0.2, 0.12], [-0.12, -0.18, 0.09]]) {
      ctx.beginPath()
      ctx.arc(x * r, y * r, s * r, 0, Math.PI * 2)
      ctx.fill()
    }
    eyes(ctx, r * 0.8, 0.55, 0.22)
  } else if (kind === 6) {
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = Math.max(1, r * 0.05)
    ctx.beginPath()
    ctx.moveTo(0, r * 0.75)
    ctx.bezierCurveTo(r * 0.25, r * 1.05, -r * 0.25, r * 1.2, r * 0.05, r * 1.45)
    ctx.stroke()
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.45, r * 0.08, 0, -r * 0.1, r * 1.0)
    g.addColorStop(0, '#fce7f3')
    g.addColorStop(0.45, '#f472b6')
    g.addColorStop(1, '#be185d')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(0, -r * 0.12, r * 0.78, r * 0.88, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#9d174d'
    ctx.lineWidth = Math.max(1, r * 0.06)
    ctx.stroke()
    ctx.fillStyle = '#be185d'
    ctx.beginPath()
    ctx.moveTo(-r * 0.14, r * 0.85)
    ctx.lineTo(r * 0.14, r * 0.85)
    ctx.lineTo(0, r * 0.72)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath()
    ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.12, r * 0.24, 0.4, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // Crescent moon with a sleepy face; the cut-out uses destination-out on the sprite canvas.
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.6, '#c7d2fe')
    g.addColorStop(1, '#818cf8')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(r * 0.5, -r * 0.3, r * 0.78, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = '#4338ca'
    ctx.lineWidth = Math.max(1.2, r * 0.07)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(-r * 0.5, r * 0.05, r * 0.12, 0.1 * Math.PI, 0.9 * Math.PI)
    ctx.stroke()
    ctx.fillStyle = '#f9a8d4'
    ctx.beginPath()
    ctx.arc(-r * 0.4, r * 0.38, r * 0.09, 0, Math.PI * 2)
    ctx.fill()
  }
}

const cache = new Map<string, HTMLCanvasElement>()

/** Cached sprite; drawn at 2.6×r square so stems and strings fit. */
export function kindSprite(kind: Kind, r: number): HTMLCanvasElement {
  const px = Math.max(6, Math.round(r))
  const key = `${kind}|${px}`
  const hit = cache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const dim = Math.ceil(px * 3)
  const c = document.createElement('canvas')
  c.width = Math.ceil(dim * dpr)
  c.height = Math.ceil(dim * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate(dim / 2, dim / 2)
  drawKind(g, kind, px)
  cache.set(key, c)
  if (cache.size > 120) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return c
}

export function blitKind(ctx: CanvasRenderingContext2D, kind: Kind, x: number, y: number, r: number, rot = 0, sx = 1, sy = 1) {
  const s = kindSprite(kind, r)
  const dim = Math.round(r) * 3
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate(rot)
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy)
  ctx.drawImage(s, -dim / 2, -dim / 2, dim, dim)
  ctx.restore()
}
