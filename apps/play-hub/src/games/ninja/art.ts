/** Vector art for Rooftop Ninja: coins, birds, spike traps and sky palettes. */

let coinSprite: HTMLCanvasElement | null = null

/** Gold coin face, cached; drawn with horizontal squash to fake a spin. */
function coin(): HTMLCanvasElement {
  if (coinSprite) return coinSprite
  const c = document.createElement('canvas')
  c.width = 48
  c.height = 48
  const ctx = c.getContext('2d')!
  ctx.translate(24, 24)
  const g = ctx.createRadialGradient(-6, -7, 2, 0, 0, 22)
  g.addColorStop(0, '#fffbeb')
  g.addColorStop(0.35, '#fde047')
  g.addColorStop(1, '#b45309')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, 21, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.strokeStyle = 'rgba(146,64,14,0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, 15, 0, Math.PI * 2)
  ctx.stroke()
  // square hole like an old mon coin
  ctx.fillStyle = '#78350f'
  ctx.fillRect(-5, -5, 10, 10)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.ellipse(-8, -10, 6, 3, -0.6, 0, Math.PI * 2)
  ctx.fill()
  coinSprite = c
  return c
}

export function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, spin: number) {
  const s = size
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(Math.max(0.15, spin), 1)
  ctx.drawImage(coin(), -s / 2, -s / 2, s, s)
  ctx.restore()
}

/** Hawk flying left with flapping wings. */
export function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const flap = Math.sin(t * 12)
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  // far wing
  ctx.fillStyle = '#4c1d95'
  ctx.beginPath()
  ctx.moveTo(2, -2)
  ctx.quadraticCurveTo(10, -14 - flap * 10, 20, -10 - flap * 16)
  ctx.quadraticCurveTo(12, -2, 6, 2)
  ctx.closePath()
  ctx.fill()
  // tail
  ctx.fillStyle = '#5b21b6'
  ctx.beginPath()
  ctx.moveTo(10, 0)
  ctx.lineTo(22, -4)
  ctx.lineTo(22, 6)
  ctx.closePath()
  ctx.fill()
  // body
  const g = ctx.createLinearGradient(0, -8, 0, 8)
  g.addColorStop(0, '#a78bfa')
  g.addColorStop(1, '#5b21b6')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(2, 0, 13, 7, -0.1, 0, Math.PI * 2)
  ctx.fill()
  // head
  ctx.beginPath()
  ctx.arc(-11, -3, 6.5, 0, Math.PI * 2)
  ctx.fill()
  // beak
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.moveTo(-16, -4)
  ctx.lineTo(-23, -1)
  ctx.lineTo(-16, 0)
  ctx.closePath()
  ctx.fill()
  // angry eye
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(-12, -4, 2.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(-12.8, -4, 1.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1e1b4b'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(-15, -7.5)
  ctx.lineTo(-9, -6)
  ctx.stroke()
  // near wing
  ctx.fillStyle = '#7c3aed'
  ctx.beginPath()
  ctx.moveTo(-2, 0)
  ctx.quadraticCurveTo(4, -16 - flap * 14, 16, -14 - flap * 20)
  ctx.quadraticCurveTo(10, -2, 6, 3)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

/** Row of steel spikes on a rooftop. */
export function drawSpikes(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number) {
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(x - 2, y - 4, w + 4, 4)
  const n = Math.max(3, Math.round(w / 9))
  const sw = w / n
  for (let i = 0; i < n; i++) {
    const sx = x + i * sw
    const g = ctx.createLinearGradient(sx, 0, sx + sw, 0)
    g.addColorStop(0, '#e5e7eb')
    g.addColorStop(1, '#6b7280')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(sx, y - 3)
    ctx.lineTo(sx + sw / 2, y - 18)
    ctx.lineTo(sx + sw, y - 3)
    ctx.closePath()
    ctx.fill()
  }
  // red glint so it reads as danger
  const gl = (t * 1.5) % 1
  ctx.fillStyle = `rgba(239,68,68,${0.6 - gl * 0.6})`
  ctx.fillRect(x - 2, y - 4, w + 4, 2)
}

export type Mote = 'ember' | 'star' | 'leaf' | 'snow' | 'petal'
export type Sky = { top: string; mid: string; low: string; sun: string; far: string; near: string; name: string; mote: Mote; moteColor: string; layer?: 'bamboo' | 'pagoda' }

/** Palettes cycle every 500 m to mark progress. */
export const SKIES: Sky[] = [
  { name: 'Dusk', top: '#1e1b4b', mid: '#7c2d12', low: '#f97316', sun: '#fef3c7', far: '#3b1a4a', near: '#2a1036', mote: 'ember', moteColor: '#fdba74' },
  { name: 'Moonrise', top: '#020617', mid: '#1e3a8a', low: '#6366f1', sun: '#e0e7ff', far: '#1e1b4b', near: '#111033', mote: 'star', moteColor: '#e0e7ff' },
  { name: 'Bamboo Mist', top: '#052e16', mid: '#166534', low: '#bbf7d0', sun: '#f0fdf4', far: '#14532d', near: '#0b3b1f', mote: 'leaf', moteColor: '#86efac', layer: 'bamboo' },
  { name: 'Blood moon', top: '#1c0507', mid: '#7f1d1d', low: '#dc2626', sun: '#fecaca', far: '#3f0d12', near: '#24070b', mote: 'ember', moteColor: '#f87171' },
  { name: 'Snow Temple', top: '#1e293b', mid: '#64748b', low: '#e2e8f0', sun: '#f8fafc', far: '#475569', near: '#334155', mote: 'snow', moteColor: '#ffffff', layer: 'pagoda' },
  { name: 'Dawn', top: '#0c4a6e', mid: '#db2777', low: '#fbbf24', sun: '#fff7ed', far: '#4a1d4a', near: '#2e1035', mote: 'petal', moteColor: '#fbcfe8' },
]
