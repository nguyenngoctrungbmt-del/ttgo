import { glow } from '../../shared/action/fx'

/** Late-run content for Last Stand: biomes, ambient particles and art for the newer threats. */

export type AmbientKind = 'ash' | 'spore' | 'ember' | 'snow'

export type Biome = { name: string; sub: string; ambient: AmbientKind }

export const BIOMES: Biome[] = [
  { name: 'RUINED CITY', sub: 'hold the street', ambient: 'ash' },
  { name: 'TOXIC BAYOU', sub: 'the swamp is crawling', ambient: 'spore' },
  { name: 'BURNING OUTSKIRTS', sub: 'the suburbs are on fire', ambient: 'ember' },
  { name: 'FROZEN OVERPASS', sub: 'blizzard rolling in', ambient: 'snow' },
]

/** Three waves per biome, cycling forever. */
export function biomeIndexFor(wave: number) {
  return Math.floor(Math.max(0, wave - 1) / 3) % BIOMES.length
}

/** Deterministic 0..1 noise so background props stay put frame to frame. */
function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

function vgrad(ctx: CanvasRenderingContext2D, y0: number, y1: number, a: string, b: string) {
  const g = ctx.createLinearGradient(0, y0, 0, y1)
  g.addColorStop(0, a)
  g.addColorStop(1, b)
  return g
}

function roadDashes(ctx: CanvasRenderingContext2D, W: number, horizon: number, front: number, t: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 3
  for (let i = 0; i < 8; i++) {
    const p0 = (i / 8 + t * 0.02) % 1
    const p1 = p0 + 0.05
    const y0 = horizon + (front - horizon) * Math.pow(p0, 1.15)
    const y1 = horizon + (front - horizon) * Math.pow(p1, 1.15)
    ctx.beginPath()
    ctx.moveTo(W / 2, y0)
    ctx.lineTo(W / 2, y1)
    ctx.stroke()
  }
}

function moon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, halo: string, alpha: number) {
  glow(ctx, x, y, r * 3.2, halo, alpha)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function drawCity(ctx: CanvasRenderingContext2D, W: number, H: number, horizon: number, front: number, t: number) {
  ctx.fillStyle = vgrad(ctx, 0, horizon, '#1e1b2e', '#4c3a5c')
  ctx.fillRect(0, 0, W, horizon + 1)
  moon(ctx, W * 0.22, horizon * 0.4, 16, '#fef9c3', '#fef3c7', 0.4)
  ctx.fillStyle = '#2a2236'
  for (let i = 0; i < 9; i++) {
    const bw = W / 9
    const bh = 24 + ((i * 37) % 50)
    ctx.fillRect(i * bw, horizon - bh, bw - 4, bh)
  }
  ctx.fillStyle = vgrad(ctx, horizon, H, '#3f3a2e', '#1c1917')
  ctx.fillRect(0, horizon, W, H - horizon)
  roadDashes(ctx, W, horizon, front, t, 'rgba(253,224,71,0.25)')
}

function drawBayou(ctx: CanvasRenderingContext2D, W: number, H: number, horizon: number, front: number, t: number) {
  ctx.fillStyle = vgrad(ctx, 0, horizon, '#0b1714', '#34503a')
  ctx.fillRect(0, 0, W, horizon + 1)
  moon(ctx, W * 0.76, horizon * 0.36, 17, '#ecfccb', '#bef264', 0.35)
  // Far tree line
  ctx.fillStyle = '#1b2e22'
  ctx.beginPath()
  ctx.moveTo(0, horizon)
  for (let i = 0; i <= 12; i++) ctx.lineTo((i / 12) * W, horizon - 10 - hash(i) * 18)
  ctx.lineTo(W, horizon)
  ctx.fill()
  // Dead cypress trees with crooked branches
  ctx.strokeStyle = '#0f1c15'
  ctx.lineCap = 'round'
  for (let i = 0; i < 6; i++) {
    const x = ((i + 0.3 + hash(i + 20) * 0.4) / 6) * W
    const th = 46 + hash(i + 40) * 40
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(x, horizon + 2)
    ctx.quadraticCurveTo(x + 4, horizon - th * 0.5, x - 2, horizon - th)
    ctx.stroke()
    ctx.lineWidth = 2.2
    ctx.beginPath()
    for (let k = 0; k < 3; k++) {
      const by = horizon - th * (0.45 + k * 0.18)
      const dir = (k + i) % 2 ? 1 : -1
      ctx.moveTo(x, by)
      ctx.lineTo(x + dir * (10 + hash(i * 3 + k) * 10), by - 8)
    }
    ctx.stroke()
    // Hanging moss
    ctx.strokeStyle = 'rgba(101,163,13,0.35)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let k = 0; k < 3; k++) {
      const mx = x - 8 + k * 7
      const my = horizon - th * 0.7
      ctx.moveTo(mx, my)
      ctx.lineTo(mx + Math.sin(t * 1.3 + k + i) * 1.5, my + 10 + k * 3)
    }
    ctx.stroke()
    ctx.strokeStyle = '#0f1c15'
  }
  ctx.fillStyle = vgrad(ctx, horizon, H, '#2c3a23', '#0e150c')
  ctx.fillRect(0, horizon, W, H - horizon)
  // Murky pools with moonlight shimmer
  for (let i = 0; i < 4; i++) {
    const p = 0.18 + i * 0.2
    const y = horizon + (front - horizon) * Math.pow(p, 1.15)
    const x = i % 2 ? W * (0.12 + hash(i) * 0.08) : W * (0.86 - hash(i) * 0.08)
    const rw = 22 + p * 60
    ctx.fillStyle = 'rgba(20,52,40,0.85)'
    ctx.beginPath()
    ctx.ellipse(x, y, rw, rw * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = `rgba(190,242,100,${0.18 + Math.sin(t * 2 + i) * 0.08})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x - rw * 0.4, y - 1)
    ctx.lineTo(x + rw * 0.2, y - 1)
    ctx.stroke()
  }
  roadDashes(ctx, W, horizon, front, t, 'rgba(190,242,100,0.18)')
  // Low fog bank hugging the horizon
  ctx.fillStyle = vgrad(ctx, horizon - 30, horizon + 50, 'rgba(163,230,53,0)', 'rgba(132,204,22,0.16)')
  ctx.fillRect(0, horizon - 30, W, 50)
  ctx.fillStyle = vgrad(ctx, horizon + 20, horizon + 60, 'rgba(132,204,22,0.16)', 'rgba(132,204,22,0)')
  ctx.fillRect(0, horizon + 20, W, 40)
}

function drawInferno(ctx: CanvasRenderingContext2D, W: number, H: number, horizon: number, front: number, t: number) {
  ctx.fillStyle = vgrad(ctx, 0, horizon, '#1a0707', '#9a3412')
  ctx.fillRect(0, 0, W, horizon + 1)
  glow(ctx, W * 0.6, horizon, W * 0.5, '#fb923c', 0.35)
  // Smoke plumes drifting up
  ctx.fillStyle = 'rgba(28,10,10,0.3)'
  for (let i = 0; i < 4; i++) {
    const bx = ((i + 0.5) / 4) * W
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.06 + k / 4 + hash(i) * 0.5) % 1
      const r = 14 + ph * 34
      ctx.beginPath()
      ctx.arc(bx + Math.sin(ph * 4 + i) * 14 + ph * 30, horizon - 40 - ph * horizon * 0.8, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Burning houses: gabled roofs, lit windows, flames licking the roofline
  for (let i = 0; i < 7; i++) {
    const bw = W / 7
    const x = i * bw
    const bh = 22 + hash(i + 5) * 30
    const top = horizon - bh
    ctx.fillStyle = '#240b0b'
    ctx.beginPath()
    ctx.moveTo(x + 2, horizon)
    ctx.lineTo(x + 2, top)
    ctx.lineTo(x + bw / 2, top - 14)
    ctx.lineTo(x + bw - 2, top)
    ctx.lineTo(x + bw - 2, horizon)
    ctx.fill()
    const lit = 0.55 + Math.sin(t * 9 + i * 2) * 0.25
    ctx.fillStyle = `rgba(249,115,22,${lit})`
    ctx.fillRect(x + bw * 0.25, top + 8, 5, 6)
    ctx.fillRect(x + bw * 0.6, top + 8, 5, 6)
    if (i % 2 === 0) {
      for (let f = 0; f < 3; f++) {
        const fx = x + bw * (0.3 + f * 0.2)
        const fh = 10 + Math.sin(t * 11 + f * 2 + i) * 5 + hash(i + f) * 6
        const fy = top - 6 + f * 2
        ctx.fillStyle = f === 1 ? '#fbbf24' : '#f97316'
        ctx.beginPath()
        ctx.moveTo(fx - 5, fy + 4)
        ctx.quadraticCurveTo(fx - 2, fy - fh * 0.5, fx + Math.sin(t * 7 + f) * 2, fy - fh)
        ctx.quadraticCurveTo(fx + 3, fy - fh * 0.4, fx + 5, fy + 4)
        ctx.fill()
      }
    }
  }
  ctx.fillStyle = vgrad(ctx, horizon, H, '#3a2214', '#110906')
  ctx.fillRect(0, horizon, W, H - horizon)
  // Glowing cracks in the asphalt
  ctx.lineCap = 'round'
  ctx.lineWidth = 2
  ctx.strokeStyle = `rgba(234,88,12,${0.45 + Math.sin(t * 2.5) * 0.15})`
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const p = 0.25 + i * 0.16
    const y = horizon + (front - horizon) * Math.pow(p, 1.15)
    const x = i % 2 ? W * 0.18 : W * 0.8
    ctx.moveTo(x - 20 * p, y)
    ctx.lineTo(x - 4 * p, y + 4 * p)
    ctx.lineTo(x + 10 * p, y - 2)
    ctx.lineTo(x + 26 * p, y + 5 * p)
  }
  ctx.stroke()
  roadDashes(ctx, W, horizon, front, t, 'rgba(251,146,60,0.3)')
}

function drawFrozen(ctx: CanvasRenderingContext2D, W: number, H: number, horizon: number, front: number, t: number) {
  ctx.fillStyle = vgrad(ctx, 0, horizon, '#060c22', '#3b5578')
  ctx.fillRect(0, 0, W, horizon + 1)
  ctx.fillStyle = '#e0f2fe'
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(t * 1.5 + i))
    ctx.fillRect(hash(i) * W, hash(i + 99) * horizon * 0.7, 1.6, 1.6)
  }
  ctx.globalAlpha = 1
  // Aurora ribbons
  ctx.lineCap = 'round'
  for (let k = 0; k < 2; k++) {
    ctx.strokeStyle = k ? 'rgba(103,232,249,0.13)' : 'rgba(52,211,153,0.16)'
    ctx.lineWidth = 16 - k * 5
    ctx.beginPath()
    for (let i = 0; i <= 10; i++) {
      const x = (i / 10) * W
      const y = horizon * (0.25 + k * 0.12) + Math.sin(i * 0.8 + t * 0.6 + k * 2) * 12
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  moon(ctx, W * 0.82, horizon * 0.3, 13, '#f1f5f9', '#bae6fd', 0.3)
  // Snowy pines
  for (let i = 0; i < 10; i++) {
    const x = ((i + hash(i + 7) * 0.6) / 10) * W
    const ph = 26 + hash(i + 3) * 22
    ctx.fillStyle = '#18253f'
    ctx.beginPath()
    ctx.moveTo(x, horizon - ph)
    ctx.lineTo(x - ph * 0.32, horizon)
    ctx.lineTo(x + ph * 0.32, horizon)
    ctx.fill()
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.moveTo(x, horizon - ph)
    ctx.lineTo(x - ph * 0.11, horizon - ph * 0.66)
    ctx.lineTo(x + ph * 0.11, horizon - ph * 0.66)
    ctx.fill()
  }
  // Broken highway overpass
  const deckY = horizon - 58
  ctx.fillStyle = '#34445f'
  for (let i = 0; i < 4; i++) {
    const px = ((i + 0.5) / 4) * W
    ctx.fillRect(px - 5, deckY + 8, 10, horizon - deckY - 8)
  }
  ctx.fillRect(0, deckY, W * 0.44, 14)
  ctx.fillRect(W * 0.56, deckY + 3, W * 0.44, 14)
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, deckY + 11, W * 0.44, 3)
  ctx.fillRect(W * 0.56, deckY + 14, W * 0.44, 3)
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(0, deckY - 2, W * 0.44, 3)
  ctx.fillRect(W * 0.56, deckY + 1, W * 0.44, 3)
  // Snapped rebar on the broken ends
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  for (let k = 0; k < 3; k++) {
    ctx.moveTo(W * 0.44, deckY + 2 + k * 3)
    ctx.lineTo(W * 0.44 + 5 + k * 2, deckY + 5 + k * 4)
    ctx.moveTo(W * 0.56, deckY + 5 + k * 3)
    ctx.lineTo(W * 0.56 - 5 - k * 2, deckY + 9 + k * 3)
  }
  ctx.stroke()
  ctx.fillStyle = vgrad(ctx, horizon, H, '#7e93ad', '#24324a')
  ctx.fillRect(0, horizon, W, H - horizon)
  // Snow drifts on the shoulders
  ctx.fillStyle = 'rgba(241,245,249,0.55)'
  for (let i = 0; i < 4; i++) {
    const p = 0.2 + i * 0.22
    const y = horizon + (front - horizon) * Math.pow(p, 1.15)
    const r = 18 + p * 50
    ctx.beginPath()
    ctx.ellipse(i % 2 ? W * 0.04 : W * 0.96, y, r, r * 0.3, 0, Math.PI, 0)
    ctx.fill()
  }
  roadDashes(ctx, W, horizon, front, t, 'rgba(255,255,255,0.32)')
}

export function drawBiome(ctx: CanvasRenderingContext2D, i: number, W: number, H: number, horizon: number, front: number, t: number) {
  if (i === 1) drawBayou(ctx, W, H, horizon, front, t)
  else if (i === 2) drawInferno(ctx, W, H, horizon, front, t)
  else if (i === 3) drawFrozen(ctx, W, H, horizon, front, t)
  else drawCity(ctx, W, H, horizon, front, t)
}

type Mote = { x: number; y: number; vx: number; vy: number; s: number; ph: number }

/** Ambient weather particles (separate from Fx so they never crowd out hit effects). */
export class Ambient {
  kind: AmbientKind = 'ash'
  motes: Mote[] = []

  reset(kind: AmbientKind) {
    this.kind = kind
    this.motes = []
  }

  private spawn(W: number, H: number, anywhere: boolean): Mote {
    const k = this.kind
    const x = Math.random() * W
    let y = Math.random() * H
    if (!anywhere) y = k === 'ember' || k === 'spore' ? H + 6 : -6
    if (k === 'snow') return { x, y, vx: -12 + Math.random() * 8, vy: 40 + Math.random() * 50, s: 1.2 + Math.random() * 2.4, ph: Math.random() * 6 }
    if (k === 'ember') return { x, y, vx: 10 + Math.random() * 20, vy: -(30 + Math.random() * 50), s: 1 + Math.random() * 1.8, ph: Math.random() * 6 }
    if (k === 'spore') return { x, y, vx: 0, vy: -(8 + Math.random() * 14), s: 1.4 + Math.random() * 1.6, ph: Math.random() * 6 }
    return { x, y, vx: 8 + Math.random() * 10, vy: 12 + Math.random() * 16, s: 1 + Math.random() * 1.6, ph: Math.random() * 6 }
  }

  update(dt: number, W: number, H: number) {
    const cap = this.kind === 'snow' ? 46 : this.kind === 'spore' ? 14 : 30
    while (this.motes.length < cap) this.motes.push(this.spawn(W, H, this.motes.length < cap / 2))
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i]
      m.ph += dt
      m.x += (m.vx + Math.sin(m.ph * 1.7) * (this.kind === 'spore' ? 14 : 8)) * dt
      m.y += m.vy * dt
      if (m.y < -10 || m.y > H + 10 || m.x < -20 || m.x > W + 20) this.motes[i] = this.spawn(W, H, false)
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const k = this.kind
    for (const m of this.motes) {
      if (k === 'spore') {
        const a = 0.35 + Math.abs(Math.sin(m.ph * 2)) * 0.55
        ctx.globalAlpha = a * 0.25
        ctx.fillStyle = '#bef264'
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.s * 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = a
        ctx.fillStyle = '#ecfccb'
      } else if (k === 'ember') {
        ctx.globalAlpha = 0.5 + Math.abs(Math.sin(m.ph * 6)) * 0.5
        ctx.fillStyle = m.s > 2 ? '#fbbf24' : '#f97316'
      } else if (k === 'snow') {
        ctx.globalAlpha = 0.85
        ctx.fillStyle = '#f8fafc'
      } else {
        ctx.globalAlpha = 0.35
        ctx.fillStyle = '#a8a29e'
      }
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

/** Zombie box in screen space; (x, y) = feet. */
export type Box = { x: number; y: number; s: number; h: number; wdt: number; headR: number; headX: number; headY: number }

/** Relative sac positions on the Brood Mother (fractions of width / height). */
export const SACS: [number, number][] = [
  [-0.27, 0.56],
  [0.28, 0.62],
  [0.02, 0.38],
]

export function sacPos(b: Box, i: number) {
  return { x: b.x + SACS[i][0] * b.wdt, y: b.y - SACS[i][1] * b.h, r: b.wdt * 0.11 }
}

/** Spitter extras over the humanoid body: bulging throat sac that swells while charging. */
export function drawSpitter(ctx: CanvasRenderingContext2D, b: Box, bob: number, charge: number, t: number) {
  const k = charge > 0 && charge < 1.2 ? 1 - charge / 1.2 : 0
  const sx = 0
  const sy = b.headY - b.y + bob + b.headR * 1.35
  const r = b.headR * (0.75 + k * 0.6 + Math.sin(t * 8) * 0.04)
  if (k > 0) glow(ctx, sx, sy, r * 3, '#a3e635', 0.35 + k * 0.4)
  const g = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r)
  g.addColorStop(0, '#ecfccb')
  g.addColorStop(0.45, '#84cc16')
  g.addColorStop(1, '#365314')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(sx, sy, r, r * 0.85, 0, 0, Math.PI * 2)
  ctx.fill()
  // Veins
  ctx.strokeStyle = 'rgba(54,83,20,0.8)'
  ctx.lineWidth = Math.max(1, b.s * 1.2)
  ctx.beginPath()
  ctx.moveTo(sx - r * 0.6, sy - r * 0.2)
  ctx.quadraticCurveTo(sx - r * 0.1, sy + r * 0.1, sx - r * 0.2, sy + r * 0.6)
  ctx.moveTo(sx + r * 0.5, sy - r * 0.4)
  ctx.quadraticCurveTo(sx + r * 0.2, sy, sx + r * 0.45, sy + r * 0.5)
  ctx.stroke()
  // Acid drool
  ctx.fillStyle = '#bef264'
  const drip = ((t * 1.4) % 1) * b.headR * 1.2
  ctx.beginPath()
  ctx.arc(sx + r * 0.2, sy + r + drip, Math.max(1.2, b.s * 2.2), 0, Math.PI * 2)
  ctx.fill()
}

/** Bomber extras: strapped canisters with blinking warning bulbs. */
export function drawBomber(ctx: CanvasRenderingContext2D, b: Box, bob: number, danger: number, t: number) {
  const ty = -b.h * 0.66 + bob
  ctx.fillStyle = '#292524'
  ctx.fillRect(-b.wdt / 2, ty + b.h * 0.1, b.wdt, b.h * 0.05)
  for (let i = 0; i < 3; i++) {
    const cx = (-0.3 + i * 0.3) * b.wdt
    const cw = b.wdt * 0.18
    const ch = b.h * 0.2
    const g = ctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0)
    g.addColorStop(0, '#7f1d1d')
    g.addColorStop(0.4, '#dc2626')
    g.addColorStop(1, '#7f1d1d')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(cx - cw / 2, ty, cw, ch, cw * 0.3)
    ctx.fill()
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(cx - cw / 2, ty + ch * 0.3, cw, ch * 0.1)
  }
  const rate = 3 + danger * 9
  const on = Math.sin(t * rate * Math.PI) > 0
  const lr = Math.max(2, b.s * 4)
  if (on) glow(ctx, 0, ty - lr, lr * 4, '#ef4444', 0.6 + danger * 0.3)
  ctx.fillStyle = on ? '#fecaca' : '#991b1b'
  ctx.beginPath()
  ctx.arc(0, ty - lr, lr, 0, Math.PI * 2)
  ctx.fill()
  // Fuse wire
  ctx.strokeStyle = '#d6d3d1'
  ctx.lineWidth = Math.max(1, b.s * 1.4)
  ctx.beginPath()
  ctx.moveTo(-b.wdt * 0.3, ty)
  ctx.quadraticCurveTo(-b.wdt * 0.15, ty - lr * 3, 0, ty - lr)
  ctx.stroke()
}

/** Brood Mother body (head, eyes and mouth are added by the shared zombie renderer). */
export function drawMother(ctx: CanvasRenderingContext2D, b: Box, bob: number, sacs: number[], charge: number, flinch: boolean, t: number) {
  const W = b.wdt
  const H = b.h
  glow(ctx, 0, -H * 0.5, H * 0.75, '#a855f7', 0.22)
  // Stubby legs
  ctx.fillStyle = flinch ? '#ffffff' : '#2b1d33'
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(sx * W * 0.22, -H * 0.08, W * 0.12, H * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // Bloated body
  const g = ctx.createRadialGradient(-W * 0.15, -H * 0.62 + bob, W * 0.05, 0, -H * 0.48 + bob, W * 0.62)
  g.addColorStop(0, flinch ? '#ffffff' : '#7c5a87')
  g.addColorStop(0.6, flinch ? '#f5f5f5' : '#4a3352')
  g.addColorStop(1, flinch ? '#e5e5e5' : '#22152a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, -H * 0.48 + bob, W * 0.52, H * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  // Belly glow while a brood is about to burst out
  const k = charge > 0 && charge < 1.1 && sacs.some((s) => s > 0) ? 1 - charge / 1.1 : 0
  if (k > 0) glow(ctx, 0, -H * 0.3 + bob, W * (0.4 + k * 0.3), '#d9f99d', 0.3 + k * 0.5)
  // Veins
  ctx.strokeStyle = 'rgba(163,230,53,0.45)'
  ctx.lineWidth = Math.max(1, b.s * 2)
  ctx.beginPath()
  ctx.moveTo(-W * 0.4, -H * 0.62 + bob)
  ctx.quadraticCurveTo(-W * 0.1, -H * 0.5 + bob, -W * 0.18, -H * 0.2 + bob)
  ctx.moveTo(W * 0.42, -H * 0.55 + bob)
  ctx.quadraticCurveTo(W * 0.12, -H * 0.45 + bob, W * 0.2, -H * 0.18 + bob)
  ctx.stroke()
  // Long dragging arms
  ctx.strokeStyle = flinch ? '#ffffff' : '#5b4166'
  ctx.lineCap = 'round'
  ctx.lineWidth = W * 0.08
  for (const sx of [-1, 1]) {
    const sw = Math.sin(t * 2 + sx) * W * 0.05
    ctx.beginPath()
    ctx.moveTo(sx * W * 0.45, -H * 0.66 + bob)
    ctx.quadraticCurveTo(sx * W * 0.7, -H * 0.4, sx * W * 0.58 + sw, -H * 0.04)
    ctx.stroke()
  }
  ctx.strokeStyle = '#e7e5e4'
  ctx.lineWidth = Math.max(1, b.s * 2)
  for (const sx of [-1, 1]) {
    const cx = sx * W * 0.58 + Math.sin(t * 2 + sx) * W * 0.05
    ctx.beginPath()
    for (let c = -1; c <= 1; c++) {
      ctx.moveTo(cx + c * W * 0.03, -H * 0.04)
      ctx.lineTo(cx + c * W * 0.05, H * 0.01)
    }
    ctx.stroke()
  }
  // Neck hump + head
  ctx.fillStyle = flinch ? '#ffffff' : '#6b5174'
  ctx.beginPath()
  ctx.arc(0, b.headY - b.y + bob, b.headR, 0, Math.PI * 2)
  ctx.fill()
  // Weak-spot sacs
  for (let i = 0; i < SACS.length; i++) {
    const sx = SACS[i][0] * W
    const sy = -SACS[i][1] * H + bob
    const r = W * 0.11
    if (sacs[i] <= 0) {
      ctx.fillStyle = '#1c1220'
      ctx.beginPath()
      ctx.ellipse(sx, sy, r * 0.7, r * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
      continue
    }
    const pulse = 1 + Math.sin(t * 5 + i * 2) * 0.08
    glow(ctx, sx, sy, r * 2.4, '#bef264', 0.5)
    const sg = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r * pulse)
    sg.addColorStop(0, '#fefce8')
    sg.addColorStop(0.5, '#d9f99d')
    sg.addColorStop(1, '#65a30d')
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.arc(sx, sy, r * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#3f6212'
    ctx.lineWidth = Math.max(1, b.s * 1.5)
    ctx.stroke()
  }
}

/** Rapid-fire crate pickup, centred on (0,0), ~30 px. */
export function drawRapidPickup(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createLinearGradient(0, -12, 0, 12)
  g.addColorStop(0, '#fcd34d')
  g.addColorStop(1, '#b45309')
  ctx.fillStyle = g
  ctx.strokeStyle = '#78350f'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(-13, -4, 26, 16, 3)
  ctx.fill()
  ctx.stroke()
  // Bullets poking out of the crate
  for (let i = 0; i < 4; i++) {
    const bx = -9 + i * 6
    const lift = Math.sin(t * 6 + i) * 1.2
    ctx.fillStyle = '#d97706'
    ctx.fillRect(bx - 2, -9 + lift, 4, 6)
    ctx.fillStyle = '#e5e7eb'
    ctx.beginPath()
    ctx.moveTo(bx - 2, -9 + lift)
    ctx.quadraticCurveTo(bx, -15 + lift, bx + 2, -9 + lift)
    ctx.fill()
  }
  // Lightning stripe
  ctx.fillStyle = '#fff7ed'
  ctx.beginPath()
  ctx.moveTo(2, -2)
  ctx.lineTo(-4, 5)
  ctx.lineTo(0, 5)
  ctx.lineTo(-2, 11)
  ctx.lineTo(5, 3)
  ctx.lineTo(1, 3)
  ctx.closePath()
  ctx.fill()
}

/** Acid glob in flight. */
export function drawGlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  glow(ctx, x, y, r * 2.6, '#a3e635', 0.45)
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
  g.addColorStop(0, '#f7fee7')
  g.addColorStop(0.5, '#84cc16')
  g.addColorStop(1, '#365314')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(x, y, r * (1 + Math.sin(t * 20) * 0.08), r * (1 - Math.sin(t * 20) * 0.08), 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y, r + 5, 0, Math.PI * 2)
  ctx.stroke()
}
