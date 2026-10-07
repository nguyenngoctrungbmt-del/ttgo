/** Space biomes for Rock Blaster: palette, background layer and ambient motes. */
import { glow, rand } from '../../shared/action/fx'

export type MoteKind = 'none' | 'gas' | 'snow' | 'ember'
export type Biome = {
  name: string
  sub: string
  bg: [string, string]
  neb: [string, string]
  star: string
  layer: 'planet' | 'nebula' | 'ring' | 'sun'
  planet: [string, string, string]
  rockHue: [number, number]
  rockSat: number
  mote: MoteKind
  moteColor: string[]
}

export const BIOMES: Biome[] = [
  {
    name: 'DEEP SPACE',
    sub: 'home sector',
    bg: ['#1e1b4b', '#030712'],
    neb: ['#7c3aed', '#0ea5e9'],
    star: '#e0e7ff',
    layer: 'planet',
    planet: ['#fca5a5', '#7f1d1d', '#fecaca'],
    rockHue: [18, 38],
    rockSat: 22,
    mote: 'none',
    moteColor: ['#ffffff'],
  },
  {
    name: 'NEBULA DRIFT',
    sub: 'pink gas clouds ahead',
    bg: ['#4a044e', '#0b0618'],
    neb: ['#ec4899', '#14b8a6'],
    star: '#fbcfe8',
    layer: 'nebula',
    planet: ['#99f6e4', '#115e59', '#ccfbf1'],
    rockHue: [285, 320],
    rockSat: 20,
    mote: 'gas',
    moteColor: ['#f0abfc', '#5eead4', '#f472b6'],
  },
  {
    name: 'ICE BELT',
    sub: 'frozen rocks and frost',
    bg: ['#0c4a6e', '#020617'],
    neb: ['#38bdf8', '#a5b4fc'],
    star: '#f0f9ff',
    layer: 'ring',
    planet: ['#e0f2fe', '#1e3a8a', '#bae6fd'],
    rockHue: [195, 215],
    rockSat: 32,
    mote: 'snow',
    moteColor: ['#ffffff', '#bae6fd', '#e0f2fe'],
  },
  {
    name: 'SOLAR STORM',
    sub: 'solar wind and embers',
    bg: ['#5a1f0c', '#140702'],
    neb: ['#f97316', '#facc15'],
    star: '#fed7aa',
    layer: 'sun',
    planet: ['#fef08a', '#ea580c', '#fdba74'],
    rockHue: [12, 30],
    rockSat: 12,
    mote: 'ember',
    moteColor: ['#fb923c', '#fde047', '#f97316'],
  },
]

/** Waves 1–5 deep space, then a new biome every 5-wave sector, cycling the three new ones. */
export function biomeFor(wave: number) {
  return wave <= 5 ? 0 : 1 + (Math.floor((wave - 6) / 5) % 3)
}

export type Mote = { x: number; y: number; vx: number; vy: number; s: number; ph: number }

export function makeMotes(b: Biome, W: number, H: number): Mote[] {
  const n = b.mote === 'gas' ? 9 : b.mote === 'snow' ? 40 : b.mote === 'ember' ? 30 : 0
  return Array.from({ length: n }, () => makeMote(b, H, rand(0, W)))
}

function makeMote(b: Biome, H: number, x: number): Mote {
  if (b.mote === 'gas') return { x, y: rand(0, H), vx: rand(-8, 8), vy: rand(4, 12), s: rand(40, 90), ph: rand(0, 6) }
  if (b.mote === 'snow') return { x, y: rand(0, H), vx: rand(-18, -6), vy: rand(10, 26), s: rand(0.8, 2.2), ph: rand(0, 6) }
  return { x, y: rand(0, H), vx: rand(-170, -90), vy: rand(30, 70), s: rand(1, 2.4), ph: rand(0, 6) }
}

/** Move + draw ambient motes (screen space, drifting with a little ship parallax). */
export function drawMotes(ctx: CanvasRenderingContext2D, b: Biome, motes: Mote[], W: number, H: number, dt: number, pvx: number, pvy: number, t: number, alpha: number) {
  if (!motes.length || alpha <= 0) return
  for (let i = 0; i < motes.length; i++) {
    const m = motes[i]
    const par = b.mote === 'gas' ? 0.01 : 0.03
    m.x += (m.vx - pvx * par * 30) * dt
    m.y += (m.vy - pvy * par * 30) * dt
    const pad = b.mote === 'gas' ? m.s : 6
    if (m.x < -pad) m.x += W + pad * 2
    if (m.x > W + pad) m.x -= W + pad * 2
    if (m.y < -pad) m.y += H + pad * 2
    if (m.y > H + pad) m.y -= H + pad * 2
    const col = b.moteColor[i % b.moteColor.length]
    if (b.mote === 'gas') {
      glow(ctx, m.x, m.y, m.s, col, (0.07 + Math.sin(t * 0.6 + m.ph) * 0.025) * alpha)
    } else if (b.mote === 'snow') {
      ctx.globalAlpha = (0.45 + Math.sin(t * 3 + m.ph) * 0.3) * alpha
      ctx.fillStyle = col
      ctx.save()
      ctx.translate(m.x, m.y)
      ctx.rotate(Math.PI / 4)
      ctx.fillRect(-m.s, -m.s, m.s * 2, m.s * 2)
      ctx.restore()
    } else {
      ctx.globalAlpha = 0.65 * alpha
      ctx.strokeStyle = col
      ctx.lineWidth = m.s
      ctx.beginPath()
      ctx.moveTo(m.x, m.y)
      ctx.lineTo(m.x - m.vx * 0.06, m.y - m.vy * 0.06)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
}

/** Background fill + biome layer. Drawn at `alpha` so two biomes can cross-fade. */
export function drawSpaceBg(ctx: CanvasRenderingContext2D, b: Biome, W: number, H: number, t: number, alpha: number) {
  if (alpha <= 0) return
  const bg = ctx.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H / 2, Math.max(W, H))
  bg.addColorStop(0, b.bg[0])
  bg.addColorStop(1, b.bg[1])
  ctx.globalAlpha = alpha
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)
  glow(ctx, W * 0.2, H * 0.25, W * 0.5, b.neb[0], 0.12 * alpha)
  glow(ctx, W * 0.85, H * 0.75, W * 0.45, b.neb[1], 0.1 * alpha)
  const [c0, c1, ring] = b.planet
  if (b.layer === 'planet' || b.layer === 'ring') {
    const big = b.layer === 'ring'
    const px = big ? W * 0.18 : W * 0.82
    const py = big ? H * 0.82 : H * 0.16
    const pr = big ? 46 : 24
    const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, 2, px, py, pr + 2)
    pg.addColorStop(0, c0)
    pg.addColorStop(1, c1)
    ctx.fillStyle = pg
    ctx.globalAlpha = 0.55 * alpha
    ctx.beginPath()
    ctx.arc(px, py, pr, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = ring
    ctx.lineWidth = big ? 3 : 1.5
    ctx.beginPath()
    ctx.ellipse(px, py, pr * 1.6, pr * 0.34, -0.3, 0, Math.PI * 2)
    ctx.stroke()
    if (big) {
      // A wide belt of frozen dust across the sky.
      ctx.globalAlpha = 0.045 * alpha
      ctx.strokeStyle = '#e0f2fe'
      ctx.lineWidth = 46
      ctx.beginPath()
      ctx.moveTo(-40, H * 0.15)
      ctx.quadraticCurveTo(W * 0.5, H * 0.45, W + 40, H * 0.3)
      ctx.stroke()
      ctx.globalAlpha = 0.06 * alpha
      ctx.lineWidth = 10
      ctx.stroke()
    }
  } else if (b.layer === 'nebula') {
    // Layered gas clouds slowly breathing.
    for (let i = 0; i < 4; i++) {
      const x = W * (0.15 + i * 0.25) + Math.sin(t * 0.15 + i) * 20
      const y = H * (0.3 + (i % 2) * 0.35) + Math.cos(t * 0.12 + i * 2) * 16
      glow(ctx, x, y, W * 0.38, i % 2 ? b.neb[1] : b.neb[0], 0.14 * alpha)
    }
    const px = W * 0.8
    const py = H * 0.2
    const pg = ctx.createRadialGradient(px - 6, py - 6, 2, px, py, 18)
    pg.addColorStop(0, c0)
    pg.addColorStop(1, c1)
    ctx.globalAlpha = 0.6 * alpha
    ctx.fillStyle = pg
    ctx.beginPath()
    ctx.arc(px, py, 16, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // Huge sun peeking from the top-right corner with slow rays.
    const sx = W * 1.02
    const sy = -H * 0.04
    glow(ctx, sx, sy, W * 0.95, '#fb923c', 0.35 * alpha)
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(t * 0.05)
    ctx.globalAlpha = 0.07 * alpha
    ctx.fillStyle = '#fde68a'
    for (let i = 0; i < 10; i++) {
      ctx.rotate((Math.PI * 2) / 10)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(W * 1.2, -24)
      ctx.lineTo(W * 1.2, 24)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
    const sg = ctx.createRadialGradient(sx - 20, sy + 20, 4, sx, sy, W * 0.3)
    sg.addColorStop(0, '#fffbeb')
    sg.addColorStop(0.5, c0)
    sg.addColorStop(1, c1)
    ctx.globalAlpha = 0.85 * alpha
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.arc(sx, sy, W * 0.28, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
