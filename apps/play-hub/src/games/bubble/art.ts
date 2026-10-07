export const COLORS = [
  { base: '#ef4444', light: '#fecaca', dark: '#7f1d1d' },
  { base: '#3b82f6', light: '#bfdbfe', dark: '#1e3a8a' },
  { base: '#22c55e', light: '#bbf7d0', dark: '#14532d' },
  { base: '#facc15', light: '#fef9c3', dark: '#854d0e' },
  { base: '#a855f7', light: '#e9d5ff', dark: '#4c1d95' },
  { base: '#f97316', light: '#fed7aa', dark: '#7c2d12' },
]

export type Special = 'bomb' | 'rainbow' | 'bolt'

export type Palette = { top: string; bot: string; glow: string; frame: string }
export const PALETTES: Palette[] = [
  { top: '#1e1b4b', bot: '#312e81', glow: '#818cf8', frame: '#a5b4fc' },
  { top: '#083344', bot: '#155e75', glow: '#22d3ee', frame: '#67e8f9' },
  { top: '#3b0764', bot: '#831843', glow: '#f472b6', frame: '#f9a8d4' },
  { top: '#052e16', bot: '#14532d', glow: '#4ade80', frame: '#86efac' },
  { top: '#431407', bot: '#7c2d12', glow: '#fb923c', frame: '#fdba74' },
]

const cache = new Map<string, HTMLCanvasElement>()

function symbol(g: CanvasRenderingContext2D, kind: number, r: number) {
  g.beginPath()
  const s = r * 0.32
  switch (kind) {
    case 0:
      g.arc(0, 0, s, 0, Math.PI * 2)
      break
    case 1:
      g.moveTo(0, -s * 1.1)
      g.lineTo(s, s * 0.8)
      g.lineTo(-s, s * 0.8)
      g.closePath()
      break
    case 2:
      g.rect(-s * 0.85, -s * 0.85, s * 1.7, s * 1.7)
      break
    case 3:
      g.moveTo(0, -s * 1.15)
      g.lineTo(s, 0)
      g.lineTo(0, s * 1.15)
      g.lineTo(-s, 0)
      g.closePath()
      break
    case 4:
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2
        const rr = i % 2 ? s * 0.5 : s * 1.15
        if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
        else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      g.closePath()
      break
    default:
      g.moveTo(0, s * 0.9)
      g.bezierCurveTo(-s * 1.6, -s * 0.2, -s * 0.5, -s * 1.3, 0, -s * 0.4)
      g.bezierCurveTo(s * 0.5, -s * 1.3, s * 1.6, -s * 0.2, 0, s * 0.9)
  }
}

/** Glossy bubble sprite, cached per colour + radius + dpr. */
export function bubbleSprite(color: number, r: number, dpr: number): HTMLCanvasElement {
  const key = `${color}|${Math.round(r * 10)}|${dpr}`
  const hit = cache.get(key)
  if (hit) return hit
  const size = Math.ceil(r * 2 + 4)
  const c = document.createElement('canvas')
  c.width = Math.ceil(size * dpr)
  c.height = Math.ceil(size * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate(size / 2, size / 2)
  const col = COLORS[color]
  const grad = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r)
  grad.addColorStop(0, col.light)
  grad.addColorStop(0.45, col.base)
  grad.addColorStop(1, col.dark)
  g.fillStyle = grad
  g.beginPath()
  g.arc(0, 0, r, 0, Math.PI * 2)
  g.fill()
  // rim light
  g.strokeStyle = 'rgba(255,255,255,0.35)'
  g.lineWidth = r * 0.08
  g.beginPath()
  g.arc(0, 0, r * 0.86, Math.PI * 0.15, Math.PI * 0.75)
  g.stroke()
  // symbol for colour-blind players
  g.fillStyle = 'rgba(255,255,255,0.28)'
  symbol(g, color, r)
  g.fill()
  // gloss
  g.fillStyle = 'rgba(255,255,255,0.75)'
  g.beginPath()
  g.ellipse(-r * 0.38, -r * 0.45, r * 0.3, r * 0.17, -0.7, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.9)'
  g.beginPath()
  g.arc(-r * 0.1, -r * 0.62, r * 0.07, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = 'rgba(0,0,0,0.25)'
  g.lineWidth = 1
  g.beginPath()
  g.arc(0, 0, r - 0.5, 0, Math.PI * 2)
  g.stroke()
  cache.set(key, c)
  return c
}

export function drawBubble(ctx: CanvasRenderingContext2D, color: number, x: number, y: number, r: number, dpr: number, scale = 1) {
  const s = bubbleSprite(color, r, dpr)
  const size = (r * 2 + 4) * scale
  ctx.drawImage(s, x - size / 2, y - size / 2, size, size)
}

export function drawSpecial(ctx: CanvasRenderingContext2D, kind: Special, x: number, y: number, r: number, t: number, scale = 1) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  if (kind === 'bomb') {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r)
    g.addColorStop(0, '#6b7280')
    g.addColorStop(1, '#0f172a')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.ellipse(-r * 0.38, -r * 0.42, r * 0.28, r * 0.15, -0.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = r * 0.14
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(r * 0.3, -r * 0.8)
    ctx.quadraticCurveTo(r * 0.7, -r * 1.3, r * 0.3, -r * 1.45)
    ctx.stroke()
    const f = 0.7 + Math.sin(t * 28) * 0.3
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(r * 0.3, -r * 1.45, r * 0.22 * f, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(0, r * 0.1, r * 0.22, 0, Math.PI * 2)
    ctx.fill()
  } else if (kind === 'rainbow') {
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = COLORS[i].base
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, r, t * 2 + (i / 6) * Math.PI * 2, t * 2 + ((i + 1) / 6) * Math.PI * 2)
      ctx.closePath()
      ctx.fill()
    }
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 0, 0, 0, r)
    g.addColorStop(0, 'rgba(255,255,255,0.85)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.15)')
    g.addColorStop(1, 'rgba(0,0,0,0.25)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
  } else {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r)
    g.addColorStop(0, '#fef9c3')
    g.addColorStop(0.5, '#38bdf8')
    g.addColorStop(1, '#0c4a6e')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.moveTo(r * 0.15, -r * 0.75)
    ctx.lineTo(-r * 0.45, r * 0.1)
    ctx.lineTo(-r * 0.02, r * 0.1)
    ctx.lineTo(-r * 0.2, r * 0.75)
    ctx.lineTo(r * 0.45, -r * 0.12)
    ctx.lineTo(r * 0.02, -r * 0.12)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(0, 0, r - 0.5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

export function drawStarMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.sin(t * 2) * 0.2)
  ctx.fillStyle = '#fde047'
  ctx.strokeStyle = '#a16207'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 ? r * 0.2 : r * 0.48
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

/** The blowfish shooter. aim is the launch angle; puff 0..1 squashes after a shot. */
export function drawShooter(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, aim: number, puff: number, t: number, danger: boolean) {
  ctx.save()
  ctx.translate(x, y)
  const sq = 1 + puff * 0.18
  // fins
  ctx.fillStyle = '#0e7490'
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(sx * r * 0.8, r * 0.1)
    ctx.quadraticCurveTo(sx * r * 1.55, -r * 0.2 + Math.sin(t * 6 + sx) * r * 0.15, sx * r * 1.4, r * 0.55)
    ctx.closePath()
    ctx.fill()
  }
  // nozzle
  ctx.save()
  ctx.rotate(aim + Math.PI / 2)
  ctx.fillStyle = '#155e75'
  ctx.beginPath()
  ctx.roundRect(-r * 0.32, -r * 1.25, r * 0.64, r * 0.9, r * 0.2)
  ctx.fill()
  ctx.fillStyle = '#67e8f9'
  ctx.fillRect(-r * 0.32, -r * 1.25, r * 0.64, r * 0.14)
  ctx.restore()
  // body
  ctx.scale(sq, 1 / sq)
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r)
  g.addColorStop(0, '#a5f3fc')
  g.addColorStop(0.55, '#22d3ee')
  g.addColorStop(1, '#0e7490')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  // spikes
  ctx.fillStyle = '#0891b2'
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.7
    ctx.beginPath()
    ctx.moveTo(Math.cos(a - 0.12) * r * 0.95, Math.sin(a - 0.12) * r * 0.95)
    ctx.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2)
    ctx.lineTo(Math.cos(a + 0.12) * r * 0.95, Math.sin(a + 0.12) * r * 0.95)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.25, r * 0.13, -0.6, 0, Math.PI * 2)
  ctx.fill()
  // eyes look along aim
  const lx = Math.cos(aim) * r * 0.08
  const ly = Math.sin(aim) * r * 0.08
  const blink = t % 3.3 < 0.12
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(sx * r * 0.36, -r * 0.05, r * 0.22, blink ? r * 0.04 : danger ? r * 0.3 : r * 0.25, 0, 0, Math.PI * 2)
    ctx.fill()
    if (!blink) {
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.arc(sx * r * 0.36 + lx, -r * 0.05 + ly, r * (danger ? 0.08 : 0.11), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.fillStyle = 'rgba(244,114,182,0.5)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.6, r * 0.28, r * 0.14, r * 0.08, 0, 0, Math.PI * 2)
  ctx.ellipse(r * 0.6, r * 0.28, r * 0.14, r * 0.08, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#7f1d1d'
  ctx.beginPath()
  ctx.ellipse(0, r * 0.42, r * (0.1 + puff * 0.08), r * (0.08 + puff * 0.1), 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
