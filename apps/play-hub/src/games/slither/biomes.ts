/** Arena biomes, ambient particles and new hazard art for Slither Arena. */
import { shade, type FloorPal } from './art'

export type MoteKind = 'dust' | 'bubble' | 'ember' | 'snow'
type Decor = 'none' | 'coral' | 'crack' | 'crystal'

export type Biome = {
  name: string
  sub: string
  bg: string
  star: string
  outside: string
  floor: FloorPal
  mote: string[]
  moteKind: MoteKind
  decor: Decor
}

export const BIOMES: Biome[] = [
  {
    name: 'NEON HIVE',
    sub: 'back where it all began',
    bg: '#05070f',
    star: '#c7d2fe',
    outside: '#1c0510',
    floor: { base: '#0d1528', a: '#16223d', b: '#0f182d', line: 'rgba(56, 189, 248, 0.07)' },
    mote: ['#7dd3fc', '#c7d2fe'],
    moteKind: 'dust',
    decor: 'none',
  },
  {
    name: 'CORAL DEEP',
    sub: 'sinking under the reef',
    bg: '#021317',
    star: '#99f6e4',
    outside: '#1a0812',
    floor: { base: '#08242a', a: '#0f3a40', b: '#0a2a30', line: 'rgba(45, 212, 191, 0.10)' },
    mote: ['#5eead4', '#a5f3fc'],
    moteKind: 'bubble',
    decor: 'coral',
  },
  {
    name: 'EMBER WASTES',
    sub: 'the floor is cracking open',
    bg: '#100403',
    star: '#fdba74',
    outside: '#2a0505',
    floor: { base: '#26100a', a: '#45200f', b: '#2e140b', line: 'rgba(251, 146, 60, 0.14)' },
    mote: ['#fb923c', '#fbbf24', '#f87171'],
    moteKind: 'ember',
    decor: 'crack',
  },
  {
    name: 'AURORA VOID',
    sub: 'cold light over crystal fields',
    bg: '#06031a',
    star: '#e9d5ff',
    outside: '#1a0518',
    floor: { base: '#110c26', a: '#1e1640', b: '#140f2c', line: 'rgba(167, 139, 250, 0.11)' },
    mote: ['#a7f3d0', '#e9d5ff', '#ffffff'],
    moteKind: 'snow',
    decor: 'crystal',
  },
]

// ── Ambient motes (screen space) ─────────────────────────

export type Mote = { x: number; y: number; s: number; ph: number; d: number }

export function makeMotes(n: number): Mote[] {
  return Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.4, ph: Math.random() * 6.28, d: 0.3 + Math.random() * 0.7 }))
}

export function stepMotes(motes: Mote[], kind: MoteKind, dt: number) {
  for (const m of motes) {
    m.ph += dt * (1 + m.d)
    if (kind === 'bubble') m.y -= dt * 0.045 * m.d
    else if (kind === 'ember') m.y -= dt * 0.07 * m.d
    else if (kind === 'snow') m.y += dt * 0.035 * m.d
    else m.y -= dt * 0.006 * m.d
    if (m.y < -0.05) m.y += 1.1
    if (m.y > 1.05) m.y -= 1.1
  }
}

export function drawMotes(ctx: CanvasRenderingContext2D, motes: Mote[], b: Biome, W: number, H: number, camX: number, camY: number, alpha: number) {
  if (alpha <= 0.01) return
  for (let i = 0; i < motes.length; i++) {
    const m = motes[i]
    const sway = b.moteKind === 'dust' ? 0 : Math.sin(m.ph) * (b.moteKind === 'bubble' ? 0.012 : 0.02)
    const x = ((((m.x + sway) * W - camX * m.d * 0.25) % W) + W) % W
    const y = (((m.y * H - camY * m.d * 0.25) % H) + H) % H
    const c = b.mote[i % b.mote.length]
    if (b.moteKind === 'bubble') {
      const r = 2 + m.s * 2.4
      ctx.globalAlpha = alpha * 0.45
      ctx.strokeStyle = c
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = alpha * 0.6
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x - r * 0.45, y - r * 0.5, 1.4, 1.4)
    } else if (b.moteKind === 'ember') {
      ctx.globalAlpha = alpha * (0.35 + 0.35 * Math.abs(Math.sin(m.ph * 2.3)))
      ctx.fillStyle = c
      const s = 1 + m.s
      ctx.fillRect(x - s / 2, y - s, s, s * 2)
    } else if (b.moteKind === 'snow') {
      ctx.globalAlpha = alpha * (0.3 + m.d * 0.4)
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.arc(x, y, 0.8 + m.s * 0.9, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.globalAlpha = alpha * 0.25 * m.d
      ctx.fillStyle = c
      ctx.fillRect(x, y, m.s, m.s)
    }
  }
  ctx.globalAlpha = 1
}

// ── Far layer (screen space, behind the arena) ───────────

export function drawFar(
  ctx: CanvasRenderingContext2D,
  b: Biome,
  W: number,
  H: number,
  camX: number,
  camY: number,
  alpha: number,
  stars: { x: number; y: number; s: number; d: number }[],
) {
  if (alpha <= 0.01) return
  ctx.globalAlpha = alpha
  ctx.fillStyle = b.bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = b.star
  for (const s of stars) {
    const sx = (((s.x * W - camX * s.d) % W) + W) % W
    const sy = (((s.y * H - camY * s.d) % H) + H) % H
    ctx.globalAlpha = alpha * (0.25 + s.d * 2)
    ctx.fillRect(sx, sy, s.s, s.s)
  }
  ctx.globalAlpha = 1
}

/** Biome atmosphere drawn over the world at low alpha: light rays, heat haze, aurora bands. */
export function drawAtmos(ctx: CanvasRenderingContext2D, b: Biome, W: number, H: number, camX: number, t: number, alpha: number) {
  if (alpha <= 0.01 || b.decor === 'none') return
  ctx.globalAlpha = alpha
  if (b.decor === 'coral') {
    // Slanted god rays from the surface.
    for (let i = 0; i < 4; i++) {
      const x = W * (0.1 + i * 0.28) + Math.sin(t * 0.3 + i) * 20 - (camX * 0.02) % 40
      const g = ctx.createLinearGradient(x, 0, x + 80, H)
      g.addColorStop(0, 'rgba(94,234,212,0.12)')
      g.addColorStop(1, 'rgba(94,234,212,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + 40, 0)
      ctx.lineTo(x + 160, H)
      ctx.lineTo(x + 60, H)
      ctx.closePath()
      ctx.fill()
    }
  } else if (b.decor === 'crack') {
    const g = ctx.createRadialGradient(W / 2, H * 1.1, 10, W / 2, H * 1.1, H * 0.9)
    g.addColorStop(0, 'rgba(249,115,22,0.22)')
    g.addColorStop(1, 'rgba(249,115,22,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  } else if (b.decor === 'crystal') {
    ctx.lineCap = 'round'
    const bands: [string, number, number][] = [
      ['rgba(110,231,183,0.10)', 0.16, 0],
      ['rgba(196,181,253,0.10)', 0.3, 2],
    ]
    for (const [col, yk, off] of bands) {
      ctx.strokeStyle = col
      for (const lw of [46, 18]) {
        ctx.lineWidth = lw
        ctx.beginPath()
        for (let x = -20; x <= W + 20; x += 20) {
          const y = H * yk + Math.sin(x * 0.012 + t * 0.4 + off - camX * 0.0008) * 26 + Math.sin(x * 0.03 + t * 0.9) * 6
          if (x === -20) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
    }
  }
  ctx.globalAlpha = 1
}

// ── World-space floor decorations (cached sprites) ───────

const decorCache = new Map<Decor, HTMLCanvasElement>()
const DS = 128

function decorSprite(kind: Decor) {
  let c = decorCache.get(kind)
  if (c) return c
  c = document.createElement('canvas')
  c.width = DS
  c.height = DS
  const g = c.getContext('2d')!
  const m = DS / 2
  g.lineCap = 'round'
  g.lineJoin = 'round'
  if (kind === 'coral') {
    const branch = (x: number, y: number, a: number, len: number, w: number, depth: number, col: string) => {
      const x2 = x + Math.cos(a) * len
      const y2 = y + Math.sin(a) * len
      g.strokeStyle = col
      g.lineWidth = w
      g.beginPath()
      g.moveTo(x, y)
      g.quadraticCurveTo(x + Math.cos(a + 0.4) * len * 0.5, y + Math.sin(a + 0.4) * len * 0.5, x2, y2)
      g.stroke()
      if (depth > 0) {
        branch(x2, y2, a - 0.5, len * 0.72, w * 0.7, depth - 1, col)
        branch(x2, y2, a + 0.45, len * 0.7, w * 0.7, depth - 1, col)
      } else {
        g.fillStyle = shade('#fb7185', 0.3)
        g.beginPath()
        g.arc(x2, y2, w * 0.9, 0, Math.PI * 2)
        g.fill()
      }
    }
    branch(m, DS - 10, -Math.PI / 2, 34, 9, 3, '#be185d')
    branch(m, DS - 10, -Math.PI / 2 - 0.1, 30, 6, 3, '#f472b6')
    // Anemone blobs.
    for (const [x, y, r] of [
      [26, 104, 9],
      [100, 108, 11],
    ]) {
      g.fillStyle = '#0d9488'
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#5eead4'
      g.lineWidth = 2
      for (let k = 0; k < 7; k++) {
        const a = -Math.PI + (k / 6) * Math.PI
        g.beginPath()
        g.moveTo(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6)
        g.lineTo(x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6)
        g.stroke()
      }
    }
  } else if (kind === 'crack') {
    const pts: [number, number][] = [
      [10, 70],
      [34, 58],
      [50, 72],
      [70, 50],
      [92, 62],
      [118, 44],
    ]
    const path = () => {
      g.beginPath()
      pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
      g.moveTo(50, 72)
      g.lineTo(60, 100)
      g.lineTo(54, 118)
      g.moveTo(70, 50)
      g.lineTo(66, 24)
    }
    g.strokeStyle = 'rgba(249,115,22,0.25)'
    g.lineWidth = 16
    path()
    g.stroke()
    g.strokeStyle = '#ea580c'
    g.lineWidth = 6
    path()
    g.stroke()
    g.strokeStyle = '#fde68a'
    g.lineWidth = 2
    path()
    g.stroke()
  } else if (kind === 'crystal') {
    const prism = (x: number, y: number, w: number, h: number, tilt: number, col: string) => {
      g.save()
      g.translate(x, y)
      g.rotate(tilt)
      g.fillStyle = shade(col, -0.35)
      g.beginPath()
      g.moveTo(-w, 0)
      g.lineTo(-w, -h)
      g.lineTo(0, -h - w * 1.2)
      g.lineTo(w, -h)
      g.lineTo(w, 0)
      g.closePath()
      g.fill()
      g.fillStyle = col
      g.beginPath()
      g.moveTo(-w, 0)
      g.lineTo(-w, -h)
      g.lineTo(0, -h - w * 1.2)
      g.lineTo(0, 0)
      g.closePath()
      g.fill()
      g.strokeStyle = 'rgba(255,255,255,0.55)'
      g.lineWidth = 1.5
      g.beginPath()
      g.moveTo(-w * 0.6, -4)
      g.lineTo(-w * 0.6, -h)
      g.stroke()
      g.restore()
    }
    const gl = g.createRadialGradient(m, 112, 4, m, 112, 56)
    gl.addColorStop(0, 'rgba(196,181,253,0.45)')
    gl.addColorStop(1, 'rgba(196,181,253,0)')
    g.fillStyle = gl
    g.fillRect(0, 50, DS, 78)
    prism(42, 112, 10, 44, -0.35, '#c4b5fd')
    prism(86, 116, 9, 36, 0.4, '#6ee7b7')
    prism(64, 118, 13, 66, 0, '#e9d5ff')
  }
  decorCache.set(kind, c)
  return c
}

export type DecorSpot = { x: number; y: number; s: number; rot: number }

export function makeDecor(R: number): DecorSpot[] {
  const out: DecorSpot[] = []
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2
    const d = Math.sqrt(Math.random()) * (R - 120)
    out.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, s: 90 + Math.random() * 80, rot: (Math.random() - 0.5) * 0.8 })
  }
  return out
}

export function drawDecor(ctx: CanvasRenderingContext2D, spots: DecorSpot[], b: Biome, alpha: number, vx0: number, vx1: number, vy0: number, vy1: number) {
  if (b.decor === 'none' || alpha <= 0.01) return
  const spr = decorSprite(b.decor)
  ctx.globalAlpha = alpha * 0.55
  for (const d of spots) {
    if (d.x + d.s < vx0 || d.x - d.s > vx1 || d.y + d.s < vy0 || d.y - d.s > vy1) continue
    ctx.save()
    ctx.translate(d.x, d.y)
    ctx.rotate(d.rot)
    ctx.drawImage(spr, -d.s / 2, -d.s / 2, d.s, d.s)
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

// ── Hazards ──────────────────────────────────────────────

export type Mine = { x: number; y: number; r: number; arm: number; life: number; ph: number }
export type Vortex = { x: number; y: number; warn: number; life: number; pull: number; core: number; ph: number }

export const MINE_ARM = 2.2
export const VORTEX_WARN = 3

/** Spiky thorn mine: warning ring while arming, then a pulsing armed core. */
export function drawMine(ctx: CanvasRenderingContext2D, m: Mine, t: number) {
  const arming = m.arm > 0
  const k = arming ? 1 - m.arm / MINE_ARM : 1
  const fade = m.life < 1 ? Math.max(0, m.life) : 1
  const r = m.r * (arming ? 0.55 + k * 0.45 : 1) * (0.6 + fade * 0.4)
  ctx.save()
  ctx.translate(m.x, m.y)
  if (arming) {
    // Shrinking dashed telegraph ring.
    ctx.strokeStyle = `rgba(248,113,113,${0.5 + Math.sin(t * 16) * 0.3})`
    ctx.lineWidth = 3
    ctx.setLineDash([8, 7])
    ctx.beginPath()
    ctx.arc(0, 0, m.r * (2.6 - k * 1.4), t * 2, t * 2 + Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 0.35 + k * 0.4
  } else {
    ctx.globalAlpha = fade
    // Danger aura.
    const ag = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 2.1)
    ag.addColorStop(0, 'rgba(239,68,68,0.28)')
    ag.addColorStop(1, 'rgba(239,68,68,0)')
    ctx.fillStyle = ag
    ctx.beginPath()
    ctx.arc(0, 0, r * 2.1, 0, Math.PI * 2)
    ctx.fill()
  }
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.arc(4, 6, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.rotate(m.ph * 0.6)
  // Spikes.
  const n = 9
  ctx.fillStyle = '#7f1d1d'
  ctx.strokeStyle = '#fca5a5'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const a1 = a - 0.22
    const a2 = a + 0.22
    ctx.moveTo(Math.cos(a1) * r * 0.75, Math.sin(a1) * r * 0.75)
    ctx.lineTo(Math.cos(a) * r * 1.45, Math.sin(a) * r * 1.45)
    ctx.lineTo(Math.cos(a2) * r * 0.75, Math.sin(a2) * r * 0.75)
  }
  ctx.fill()
  ctx.stroke()
  // Shell.
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r)
  g.addColorStop(0, '#fca5a5')
  g.addColorStop(0.45, '#dc2626')
  g.addColorStop(1, '#450a0a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1f0606'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.rotate(-m.ph * 0.6)
  // Glowing slit eye.
  const pulse = arming ? 0.3 : 0.6 + Math.sin(t * 7 + m.ph) * 0.4
  ctx.fillStyle = `rgba(254,240,138,${pulse})`
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.42, r * 0.16, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1f0606'
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.08, r * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Gravity vortex: red telegraph ring while forming, then a swirling purple maw. */
export function drawVortex(ctx: CanvasRenderingContext2D, v: Vortex, t: number) {
  const forming = v.warn > 0
  const k = forming ? 1 - v.warn / VORTEX_WARN : 1
  const fade = v.life < 1 ? Math.max(0, v.life) : 1
  ctx.save()
  ctx.translate(v.x, v.y)
  // Pull radius.
  ctx.strokeStyle = forming ? `rgba(248,113,113,${0.45 + Math.sin(t * 14) * 0.3})` : `rgba(196,181,253,${0.22 * fade})`
  ctx.lineWidth = forming ? 4 : 2
  ctx.setLineDash([14, 12])
  ctx.beginPath()
  ctx.arc(0, 0, v.pull, -t * 0.8, -t * 0.8 + Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  const outer = v.pull * (0.35 + k * 0.65)
  const bg = ctx.createRadialGradient(0, 0, v.core * 0.5, 0, 0, outer)
  bg.addColorStop(0, `rgba(76,29,149,${0.55 * k * fade})`)
  bg.addColorStop(0.5, `rgba(124,58,237,${0.18 * k * fade})`)
  bg.addColorStop(1, 'rgba(124,58,237,0)')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.arc(0, 0, outer, 0, Math.PI * 2)
  ctx.fill()
  // Spiral arms.
  ctx.lineCap = 'round'
  ctx.globalAlpha = (0.25 + k * 0.6) * fade
  for (let arm = 0; arm < 5; arm++) {
    ctx.strokeStyle = arm % 2 ? '#c4b5fd' : '#f0abfc'
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let s = 0; s <= 14; s++) {
      const f = s / 14
      const rr = v.core + f * (outer - v.core) * 0.9
      const a = arm * ((Math.PI * 2) / 5) + v.ph * 2.2 + f * 3.2
      const x = Math.cos(a) * rr
      const y = Math.sin(a) * rr
      if (s === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = fade
  // Core: event horizon with a hot rim.
  const cr = v.core * (0.4 + k * 0.6)
  const cg = ctx.createRadialGradient(0, 0, 1, 0, 0, cr * 1.5)
  cg.addColorStop(0, '#000000')
  cg.addColorStop(0.62, '#0b0414')
  cg.addColorStop(0.7, '#f0abfc')
  cg.addColorStop(1, 'rgba(168,85,247,0)')
  ctx.fillStyle = cg
  ctx.beginPath()
  ctx.arc(0, 0, cr * 1.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.globalAlpha = 1
}

/** Small snowflake icon for the Freeze orb. */
export function snowflake(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI
    const dx = Math.cos(a) * r
    const dy = Math.sin(a) * r
    ctx.moveTo(x - dx, y - dy)
    ctx.lineTo(x + dx, y + dy)
    for (const sgn of [-1, 1]) {
      const tx = x + dx * 0.6 * sgn
      const ty = y + dy * 0.6 * sgn
      const pa = a + (sgn > 0 ? 0 : Math.PI)
      ctx.moveTo(tx, ty)
      ctx.lineTo(tx + Math.cos(pa + 2.4) * r * 0.35, ty + Math.sin(pa + 2.4) * r * 0.35)
      ctx.moveTo(tx, ty)
      ctx.lineTo(tx + Math.cos(pa - 2.4) * r * 0.35, ty + Math.sin(pa - 2.4) * r * 0.35)
    }
  }
  ctx.stroke()
}
