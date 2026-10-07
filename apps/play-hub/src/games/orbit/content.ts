/** Sky biomes, ambient particles and new enemy art for Orbit Guard. */
import { glow } from '../../shared/action/fx'

type Feature = 'giant' | 'nebula' | 'ice' | 'sun'
type MoteKind = 'none' | 'dust' | 'shard' | 'ember'

export type Biome = { name: string; sub: string; bg: string; star: string; halo: string; feature: Feature; mote: MoteKind; moteColors: string[] }

export const BIOMES: Biome[] = [
  { name: 'DEEP SPACE', sub: 'home orbit', bg: '#050816', star: '#e0e7ff', halo: '#1d4ed8', feature: 'giant', mote: 'none', moteColors: ['#ffffff'] },
  { name: 'NEBULA DRIFT', sub: 'drifting into pink clouds', bg: '#0c0420', star: '#fbcfe8', halo: '#a21caf', feature: 'nebula', mote: 'dust', moteColors: ['#f0abfc', '#99f6e4'] },
  { name: 'ICE BELT', sub: 'frozen shards all around', bg: '#031423', star: '#e0f2fe', halo: '#0891b2', feature: 'ice', mote: 'shard', moteColors: ['#e0f2fe', '#7dd3fc'] },
  { name: 'SOLAR FLARE', sub: 'too close to the sun', bg: '#170603', star: '#fed7aa', halo: '#ea580c', feature: 'sun', mote: 'ember', moteColors: ['#fb923c', '#fde047', '#f87171'] },
]

export type Mote = { x: number; y: number; s: number; ph: number; d: number }

export function makeMotes(n: number): Mote[] {
  return Array.from({ length: n }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.4, ph: Math.random() * 6.28, d: 0.3 + Math.random() * 0.7 }))
}

export function stepMotes(motes: Mote[], kind: MoteKind, dt: number) {
  for (const m of motes) {
    m.ph += dt * (0.6 + m.d)
    if (kind === 'dust') {
      m.x += dt * 0.012 * m.d
      m.y += dt * 0.005 * m.d
    } else if (kind === 'shard') {
      m.x -= dt * 0.02 * m.d
      m.y += dt * 0.025 * m.d
    } else if (kind === 'ember') m.y -= dt * 0.05 * m.d
    if (m.x > 1.05) m.x -= 1.1
    if (m.x < -0.05) m.x += 1.1
    if (m.y > 1.05) m.y -= 1.1
    if (m.y < -0.05) m.y += 1.1
  }
}

/** Full sky: colour, stars, the biome's landmark and ambient motes. */
export function drawSky(
  ctx: CanvasRenderingContext2D,
  b: Biome,
  W: number,
  H: number,
  t: number,
  alpha: number,
  stars: { x: number; y: number; z: number }[],
  motes: Mote[],
) {
  if (alpha <= 0.01) return
  ctx.globalAlpha = alpha
  ctx.fillStyle = b.bg
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = b.star
  for (const s of stars) {
    ctx.globalAlpha = alpha * (0.25 + s.z * 0.6 + Math.sin(t * 2 + s.x * 40) * 0.12)
    ctx.fillRect(s.x * W, s.y * H, s.z * 1.8, s.z * 1.8)
  }
  const m = Math.min(W, H)
  if (b.feature === 'giant') {
    const gx = W * 0.14
    const gy = H * 0.14
    const gr = m * 0.12
    const gg = ctx.createRadialGradient(gx - gr * 0.4, gy - gr * 0.4, 2, gx, gy, gr)
    gg.addColorStop(0, '#c4b5fd')
    gg.addColorStop(1, '#3b0764')
    ctx.globalAlpha = alpha * 0.6
    ctx.fillStyle = gg
    ctx.beginPath()
    ctx.arc(gx, gy, gr, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(221,214,254,0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(gx, gy, gr * 1.7, gr * 0.35, -0.35, 0, Math.PI * 2)
    ctx.stroke()
  } else if (b.feature === 'nebula') {
    const clouds: [number, number, number, string][] = [
      [0.2, 0.22, 0.55, 'rgba(217,70,239,0.30)'],
      [0.85, 0.35, 0.5, 'rgba(45,212,191,0.20)'],
      [0.35, 0.85, 0.6, 'rgba(139,92,246,0.26)'],
      [0.9, 0.9, 0.4, 'rgba(244,114,182,0.22)'],
    ]
    for (const [fx, fy, fr, col] of clouds) {
      const x = W * fx + Math.sin(t * 0.15 + fx * 9) * 14
      const y = H * fy + Math.cos(t * 0.12 + fy * 7) * 10
      const r = m * fr
      const g = ctx.createRadialGradient(x, y, 0, x, y, r)
      g.addColorStop(0, col)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.globalAlpha = alpha
      ctx.fillStyle = g
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
  } else if (b.feature === 'ice') {
    const gx = W * 0.84
    const gy = H * 0.13
    const gr = m * 0.11
    ctx.globalAlpha = alpha * 0.85
    ctx.strokeStyle = 'rgba(186,230,253,0.35)'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.ellipse(gx, gy, gr * 2, gr * 0.5, 0.3, Math.PI, Math.PI * 2)
    ctx.stroke()
    const gg = ctx.createRadialGradient(gx - gr * 0.4, gy - gr * 0.4, 2, gx, gy, gr)
    gg.addColorStop(0, '#f0f9ff')
    gg.addColorStop(0.5, '#7dd3fc')
    gg.addColorStop(1, '#0c4a6e')
    ctx.fillStyle = gg
    ctx.beginPath()
    ctx.arc(gx, gy, gr, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(224,242,254,0.6)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.ellipse(gx, gy, gr * 2, gr * 0.5, 0.3, 0, Math.PI)
    ctx.stroke()
  } else if (b.feature === 'sun') {
    const sx = W * 1.02
    const sy = -H * 0.02
    const sr = m * 0.42
    ctx.globalAlpha = alpha
    // Corona rays.
    ctx.strokeStyle = 'rgba(251,146,60,0.18)'
    ctx.lineCap = 'round'
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + t * 0.05
      const len = sr * (1.35 + Math.sin(t * 1.7 + i * 2.1) * 0.15)
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.moveTo(sx + Math.cos(a) * sr * 0.9, sy + Math.sin(a) * sr * 0.9)
      ctx.lineTo(sx + Math.cos(a) * len, sy + Math.sin(a) * len)
      ctx.stroke()
    }
    const g = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 1.3)
    g.addColorStop(0, '#fff7ed')
    g.addColorStop(0.45, '#fdba74')
    g.addColorStop(0.7, 'rgba(234,88,12,0.75)')
    g.addColorStop(1, 'rgba(234,88,12,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(sx, sy, sr * 1.3, 0, Math.PI * 2)
    ctx.fill()
  }
  // Ambient motes.
  if (b.mote !== 'none') {
    for (let i = 0; i < motes.length; i++) {
      const mo = motes[i]
      const x = mo.x * W
      const y = mo.y * H
      ctx.fillStyle = b.moteColors[i % b.moteColors.length]
      if (b.mote === 'dust') {
        ctx.globalAlpha = alpha * (0.2 + 0.25 * Math.abs(Math.sin(mo.ph)))
        ctx.beginPath()
        ctx.arc(x, y, 0.8 + mo.s, 0, Math.PI * 2)
        ctx.fill()
      } else if (b.mote === 'shard') {
        ctx.globalAlpha = alpha * (0.35 + mo.d * 0.35)
        const s = 1.5 + mo.s * 1.6
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(mo.ph)
        ctx.beginPath()
        ctx.moveTo(0, -s * 1.6)
        ctx.lineTo(s * 0.6, 0)
        ctx.lineTo(0, s * 1.6)
        ctx.lineTo(-s * 0.6, 0)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      } else {
        ctx.globalAlpha = alpha * (0.3 + 0.4 * Math.abs(Math.sin(mo.ph * 2)))
        const s = 1 + mo.s
        ctx.fillRect(x - s / 2, y - s, s, s * 2)
      }
    }
  }
  ctx.globalAlpha = 1
}

// ── Enemies & pickups ────────────────────────────────────

/** Raider saucer: metallic hull, glass dome, chasing rim lights, red underglow while charging. */
export function drawUfo(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, charge: number, hurt: number, hp: number, maxHp: number) {
  ctx.save()
  ctx.translate(x, y + Math.sin(t * 3) * 2)
  if (charge > 0) glow(ctx, 0, s * 0.3, s * (1.4 + charge), '#ef4444', 0.35 + charge * 0.4)
  // Shadow-ish underside beam.
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(2, s * 0.45, s * 0.9, s * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  // Dome.
  const dg = ctx.createRadialGradient(-s * 0.15, -s * 0.55, 1, 0, -s * 0.3, s * 0.6)
  dg.addColorStop(0, '#f0fdfa')
  dg.addColorStop(0.5, '#5eead4')
  dg.addColorStop(1, '#0f766e')
  ctx.fillStyle = dg
  ctx.beginPath()
  ctx.ellipse(0, -s * 0.18, s * 0.48, s * 0.46, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  // Alien pilot eyes.
  ctx.fillStyle = '#052e16'
  ctx.beginPath()
  ctx.ellipse(-s * 0.13, -s * 0.36, s * 0.07, s * 0.11, 0.3, 0, Math.PI * 2)
  ctx.ellipse(s * 0.13, -s * 0.36, s * 0.07, s * 0.11, -0.3, 0, Math.PI * 2)
  ctx.fill()
  // Hull.
  const hg = ctx.createLinearGradient(0, -s * 0.3, 0, s * 0.35)
  hg.addColorStop(0, hurt > 0 ? '#ffffff' : '#e2e8f0')
  hg.addColorStop(0.5, hurt > 0 ? '#fecaca' : '#94a3b8')
  hg.addColorStop(1, '#334155')
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.ellipse(0, 0, s, s * 0.32, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Rim lights.
  for (let i = 0; i < 6; i++) {
    const on = Math.floor(t * 8 + i) % 3 === 0
    ctx.fillStyle = charge > 0 ? (on ? '#fecaca' : '#ef4444') : on ? '#fde047' : '#a16207'
    ctx.beginPath()
    ctx.arc(-s * 0.7 + (i / 5) * s * 1.4, s * 0.06, s * 0.08, 0, Math.PI * 2)
    ctx.fill()
  }
  // HP pips.
  for (let i = 0; i < maxHp; i++) {
    ctx.fillStyle = i < hp ? '#f87171' : 'rgba(255,255,255,0.2)'
    ctx.fillRect(-maxHp * 4 + i * 8, -s * 0.95, 6, 3)
  }
  ctx.restore()
}

/** Plasma bolt fired by raiders; turns cyan once reflected. */
export function drawBolt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dirX: number, dirY: number, reflected: boolean) {
  const col = reflected ? '#67e8f9' : '#f43f5e'
  ctx.strokeStyle = col
  ctx.globalAlpha = 0.45
  ctx.lineWidth = r * 1.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - dirX * 26, y - dirY * 26)
  ctx.stroke()
  ctx.globalAlpha = 1
  glow(ctx, x, y, r * 2.6, col, 0.55)
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.5, col)
  g.addColorStop(1, reflected ? '#0e7490' : '#881337')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

/** Icy spiral comet head + curved tail; trail dots preview where it is heading. */
export function drawComet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, tx: number, ty: number) {
  const g = ctx.createLinearGradient(x, y, tx, ty)
  g.addColorStop(0, 'rgba(165,243,252,0.85)')
  g.addColorStop(1, 'rgba(165,243,252,0)')
  ctx.strokeStyle = g
  ctx.lineCap = 'round'
  ctx.lineWidth = r * 1.5
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(tx, ty)
  ctx.stroke()
  glow(ctx, x, y, r * 2.4, '#22d3ee', 0.5)
  const hg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r)
  hg.addColorStop(0, '#ffffff')
  hg.addColorStop(0.45, '#a5f3fc')
  hg.addColorStop(1, '#0891b2')
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

/** Prism crystal power-up: faceted gem with a rotating sparkle. */
export function drawPrism(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, t: number) {
  glow(ctx, x, y, r * 2.8, '#e879f9', 0.45 + Math.sin(t * 6) * 0.15)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.sin(rot) * 0.4)
  const pts: [number, number][] = [
    [0, -r * 1.3],
    [r * 0.9, -r * 0.2],
    [0, r * 1.3],
    [-r * 0.9, -r * 0.2],
  ]
  ctx.fillStyle = '#a21caf'
  ctx.beginPath()
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f0abfc'
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.3)
  ctx.lineTo(-r * 0.9, -r * 0.2)
  ctx.lineTo(0, r * 0.1)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#67e8f9'
  ctx.beginPath()
  ctx.moveTo(0, -r * 1.3)
  ctx.lineTo(r * 0.9, -r * 0.2)
  ctx.lineTo(0, r * 0.1)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
  ctx.closePath()
  ctx.stroke()
  ctx.restore()
  // Twinkle.
  const k = (Math.sin(t * 5) + 1) / 2
  ctx.strokeStyle = `rgba(255,255,255,${0.4 + k * 0.6})`
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x + r * 0.6, y - r * 1.2 - 4 * k)
  ctx.lineTo(x + r * 0.6, y - r * 1.2 + 4 * k)
  ctx.moveTo(x + r * 0.6 - 4 * k, y - r * 1.2)
  ctx.lineTo(x + r * 0.6 + 4 * k, y - r * 1.2)
  ctx.stroke()
}

/** Behemoth boss: huge cracked rock with magma veins and angry eyes facing the planet. */
export function drawBehemoth(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, face: number, verts: number[], t: number, hurt: boolean) {
  glow(ctx, x, y, r * 2, '#f97316', 0.25 + Math.sin(t * 4) * 0.08)
  ctx.save()
  ctx.translate(x, y)
  ctx.save()
  ctx.rotate(rot)
  ctx.beginPath()
  verts.forEach((k, i) => {
    const a = (i / verts.length) * Math.PI * 2
    if (i === 0) ctx.moveTo(Math.cos(a) * r * k, Math.sin(a) * r * k)
    else ctx.lineTo(Math.cos(a) * r * k, Math.sin(a) * r * k)
  })
  ctx.closePath()
  if (hurt) ctx.fillStyle = '#ffffff'
  else {
    const g = ctx.createRadialGradient(-r * 0.4, -r * 0.4, 2, 0, 0, r * 1.1)
    g.addColorStop(0, '#a8a29e')
    g.addColorStop(0.5, '#57534e')
    g.addColorStop(1, '#1c1917')
    ctx.fillStyle = g
  }
  ctx.fill()
  ctx.strokeStyle = '#0c0a09'
  ctx.lineWidth = 2.5
  ctx.stroke()
  // Magma veins.
  ctx.strokeStyle = `rgba(251,146,60,${0.7 + Math.sin(t * 5) * 0.3})`
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(-r * 0.7, -r * 0.1)
  ctx.lineTo(-r * 0.3, r * 0.1)
  ctx.lineTo(-r * 0.1, -r * 0.3)
  ctx.lineTo(r * 0.35, -r * 0.15)
  ctx.moveTo(-r * 0.3, r * 0.1)
  ctx.lineTo(-r * 0.15, r * 0.55)
  ctx.moveTo(r * 0.35, -r * 0.15)
  ctx.lineTo(r * 0.55, r * 0.35)
  ctx.stroke()
  // Craters.
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.arc(r * 0.3, r * 0.45, r * 0.16, 0, Math.PI * 2)
  ctx.arc(-r * 0.45, -r * 0.5, r * 0.12, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  // Angry eyes, always facing the planet.
  const fx = Math.cos(face)
  const fy = Math.sin(face)
  for (const side of [-1, 1]) {
    const ex = fx * r * 0.35 - fy * r * 0.3 * side
    const ey = fy * r * 0.35 + fx * r * 0.3 * side
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(ex, ey, r * 0.15, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#7c2d12'
    ctx.beginPath()
    ctx.arc(ex + fx * r * 0.05, ey + fy * r * 0.05, r * 0.07, 0, Math.PI * 2)
    ctx.fill()
    // Brow.
    ctx.strokeStyle = '#0c0a09'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(ex - fy * r * 0.2 * side - fx * r * 0.12, ey + fx * r * 0.2 * side - fy * r * 0.12)
    ctx.lineTo(ex + fy * r * 0.05 * side + fx * r * 0.02, ey - fx * r * 0.05 * side + fy * r * 0.02)
    ctx.stroke()
  }
  ctx.restore()
}
