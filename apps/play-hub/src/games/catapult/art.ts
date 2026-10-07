import type { Body } from './physics'

export type Cam = { s: number; ox: number; gy: number }

export type Biome = {
  name: string
  skyTop: string
  skyBot: string
  sun: string
  far: string
  mid: string
  near: string
  dirt: string
  dirtDark: string
  grass: string
  night: boolean
  snow: boolean
}

export const BIOMES: Biome[] = [
  { name: 'Green Meadow', skyTop: '#60a5fa', skyBot: '#dbeafe', sun: '#fde68a', far: '#93a8d8', mid: '#7cc47a', near: '#4f9d4a', dirt: '#8b5a2b', dirtDark: '#5c3a1a', grass: '#65a30d', night: false, snow: false },
  { name: 'Sunset Cliffs', skyTop: '#f97316', skyBot: '#fde68a', sun: '#fff7ed', far: '#c2410c', mid: '#b45309', near: '#92400e', dirt: '#7c4a21', dirtDark: '#4a2a12', grass: '#a16207', night: false, snow: false },
  { name: 'Frost Peaks', skyTop: '#7dd3fc', skyBot: '#f1f5f9', sun: '#ffffff', far: '#a5b4cb', mid: '#dbe4ee', near: '#c7d2df', dirt: '#64748b', dirtDark: '#334155', grass: '#e2e8f0', night: false, snow: true },
  { name: 'Moonlit Keep', skyTop: '#0b1033', skyBot: '#4c1d95', sun: '#f8fafc', far: '#2e2a6b', mid: '#24205a', near: '#1b4332', dirt: '#3f2a1d', dirtDark: '#24170f', grass: '#2f7d46', night: true, snow: false },
  { name: 'Ember Wastes', skyTop: '#3b0a0a', skyBot: '#f97316', sun: '#fde047', far: '#7f1d1d', mid: '#5b1a14', near: '#44403c', dirt: '#292524', dirtDark: '#110f0e', grass: '#78716c', night: true, snow: false },
]

export function sr(seed: number, i: number) {
  const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453
  return v - Math.floor(v)
}

// ── Background (cached per size + biome) ────────────────────

let bgCache: { key: string; c: HTMLCanvasElement } | null = null

export function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, cam: Cam, bi: number) {
  const dpr = ctx.getTransform().a || 1
  const key = `${W}x${H}:${bi}:${dpr}:${cam.gy}`
  if (!bgCache || bgCache.key !== key) {
    const c = document.createElement('canvas')
    c.width = Math.round(W * dpr)
    c.height = Math.round(H * dpr)
    const g = c.getContext('2d')!
    g.scale(dpr, dpr)
    paintBackground(g, W, H, cam, BIOMES[bi])
    bgCache = { key, c }
  }
  ctx.drawImage(bgCache.c, 0, 0, W, H)
}

function paintBackground(g: CanvasRenderingContext2D, W: number, H: number, cam: Cam, b: Biome) {
  const gy = cam.gy
  const sky = g.createLinearGradient(0, 0, 0, gy)
  sky.addColorStop(0, b.skyTop)
  sky.addColorStop(1, b.skyBot)
  g.fillStyle = sky
  g.fillRect(0, 0, W, H)

  if (b.night) {
    for (let i = 0; i < 70; i++) {
      g.globalAlpha = 0.3 + sr(3, i) * 0.7
      g.fillStyle = '#fff'
      const r = sr(5, i) * 1.4 + 0.3
      g.beginPath()
      g.arc(sr(7, i) * W, sr(11, i) * gy * 0.7, r, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 1
  }
  // Sun / moon
  const sx = W * 0.8
  const sy = gy * 0.18
  const sg = g.createRadialGradient(sx, sy, 0, sx, sy, 90)
  sg.addColorStop(0, b.sun)
  sg.addColorStop(1, 'rgba(255,255,255,0)')
  g.globalAlpha = 0.55
  g.fillStyle = sg
  g.beginPath()
  g.arc(sx, sy, 90, 0, Math.PI * 2)
  g.fill()
  g.globalAlpha = 1
  g.fillStyle = b.sun
  g.beginPath()
  g.arc(sx, sy, 24, 0, Math.PI * 2)
  g.fill()
  if (b.night && b.name === 'Moonlit Keep') {
    g.fillStyle = b.skyTop
    g.beginPath()
    g.arc(sx + 10, sy - 6, 20, 0, Math.PI * 2)
    g.fill()
  }

  // Far mountains
  g.fillStyle = b.far
  g.beginPath()
  g.moveTo(0, gy)
  const peaks = 7
  const pts: Array<[number, number]> = []
  for (let i = 0; i <= peaks; i++) {
    const x = (i / peaks) * W
    const y = gy - 120 - sr(13, i) * 110
    pts.push([x, y])
    g.lineTo(x - W / peaks / 2, gy - 90 - sr(17, i) * 40)
    g.lineTo(x, y)
  }
  g.lineTo(W, gy)
  g.closePath()
  g.fill()
  if (b.snow) {
    g.fillStyle = '#f8fafc'
    for (const [x, y] of pts) {
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x - 16, y + 22)
      g.lineTo(x - 5, y + 16)
      g.lineTo(x + 4, y + 24)
      g.lineTo(x + 15, y + 20)
      g.closePath()
      g.fill()
    }
  }

  // Distant castle silhouette
  g.fillStyle = shade(b.far, -0.15)
  g.globalAlpha = 0.8
  const cx = W * 0.34
  const cb = gy - 60
  g.fillRect(cx - 28, cb - 21, 56, 24)
  for (const [ox, h] of [[-32, 43], [24, 49], [-6, 60]] as const) {
    g.fillRect(cx + ox, cb - h, 10, h + 3)
    for (let k = 0; k < 3; k++) g.fillRect(cx + ox - 1.5 + k * 4.5, cb - h - 4, 3, 4)
    g.beginPath()
    g.moveTo(cx + ox - 1.5, cb - h - 4)
    g.lineTo(cx + ox + 5, cb - h - 16)
    g.lineTo(cx + ox + 11.5, cb - h - 4)
    g.fill()
  }
  g.globalAlpha = 1

  // Mid hills
  g.fillStyle = b.mid
  g.beginPath()
  g.moveTo(0, gy)
  for (let x = 0; x <= W; x += 8) g.lineTo(x, gy - 46 - Math.sin(x * 0.012 + 1) * 18 - Math.sin(x * 0.031) * 8)
  g.lineTo(W, gy)
  g.closePath()
  g.fill()
  g.fillStyle = b.near
  g.beginPath()
  g.moveTo(0, gy)
  for (let x = 0; x <= W; x += 8) g.lineTo(x, gy - 18 - Math.sin(x * 0.02 + 3) * 9)
  g.lineTo(W, gy)
  g.closePath()
  g.fill()

  // Ground
  const dg = g.createLinearGradient(0, gy, 0, H)
  dg.addColorStop(0, b.dirt)
  dg.addColorStop(1, b.dirtDark)
  g.fillStyle = dg
  g.fillRect(0, gy, W, H - gy)
  g.fillStyle = shade(b.dirt, -0.2)
  for (let i = 0; i < 40; i++) {
    g.beginPath()
    g.ellipse(sr(19, i) * W, gy + 14 + sr(23, i) * (H - gy - 14), 3 + sr(29, i) * 4, 2 + sr(31, i) * 2, 0, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = b.grass
  g.fillRect(0, gy - 2, W, 9)
  g.fillStyle = shade(b.grass, 0.18)
  for (let x = 0; x < W; x += 6) {
    const h = 4 + sr(37, x) * 6
    g.beginPath()
    g.moveTo(x, gy)
    g.lineTo(x + 3, gy - h)
    g.lineTo(x + 6, gy)
    g.fill()
  }
}

/** Lighten (k>0) or darken (k<0) a #rrggbb colour. */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255
  let gg = (n >> 8) & 255
  let bb = n & 255
  if (k >= 0) {
    r += (255 - r) * k
    gg += (255 - gg) * k
    bb += (255 - bb) * k
  } else {
    r *= 1 + k
    gg *= 1 + k
    bb *= 1 + k
  }
  return `rgb(${r | 0},${gg | 0},${bb | 0})`
}

export function drawClouds(ctx: CanvasRenderingContext2D, W: number, gy: number, t: number, night: boolean) {
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 4; i++) {
    const sp = 6 + i * 4
    const span = W + 200
    const x = ((sr(41, i) * span + t * sp) % span) - 100
    const y = gy * (0.1 + sr(43, i) * 0.3)
    const s = 0.7 + sr(47, i) * 0.6
    ctx.globalAlpha = night ? 0.12 : 0.8
    ctx.beginPath()
    ctx.arc(x, y, 18 * s, 0, Math.PI * 2)
    ctx.arc(x + 20 * s, y - 8 * s, 22 * s, 0, Math.PI * 2)
    ctx.arc(x + 44 * s, y, 17 * s, 0, Math.PI * 2)
    ctx.rect(x, y, 44 * s, 17 * s)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── Bodies ─────────────────────────────────────────────────

function cracks(ctx: CanvasRenderingContext2D, b: Body, color: string) {
  const dmg = 1 - b.hp / b.maxHp
  if (dmg < 0.25) return
  const n = dmg > 0.65 ? 3 : dmg > 0.45 ? 2 : 1
  ctx.strokeStyle = color
  ctx.lineWidth = 1.2
  ctx.beginPath()
  for (let k = 0; k < n; k++) {
    const side = Math.floor(sr(b.seed, k) * 4)
    const u = sr(b.seed, k + 10) * 1.6 - 0.8
    let x = side === 0 ? u * b.hw : side === 1 ? b.hw : side === 2 ? u * b.hw : -b.hw
    let y = side === 0 ? -b.hh : side === 1 ? u * b.hh : side === 2 ? b.hh : u * b.hh
    ctx.moveTo(x, y)
    const len = Math.min(b.hw, b.hh) * 0.9 + 4
    for (let s = 0; s < 3; s++) {
      x += (-x / (b.hw + 1)) * len * 0.5 + (sr(b.seed, k * 7 + s) - 0.5) * len * 0.7
      y += (-y / (b.hh + 1)) * len * 0.5 + (sr(b.seed, k * 5 + s + 3) - 0.5) * len * 0.7
      ctx.lineTo(Math.max(-b.hw, Math.min(b.hw, x)), Math.max(-b.hh, Math.min(b.hh, y)))
    }
  }
  ctx.stroke()
}

function burstStar(ctx: CanvasRenderingContext2D, r: number, points: number, inner: number) {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 ? r * inner : r
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
}

export function drawBlock(ctx: CanvasRenderingContext2D, b: Body, biome: Biome) {
  const { hw, hh } = b
  if (b.mat === 'wood') {
    ctx.fillStyle = '#c98b4e'
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2)
    ctx.fillStyle = '#e0a868'
    ctx.fillRect(-hw, -hh, hw * 2, Math.min(4, hh * 0.5))
    ctx.fillStyle = '#9c612d'
    ctx.fillRect(-hw, hh - Math.min(3.5, hh * 0.4), hw * 2, Math.min(3.5, hh * 0.4))
    ctx.strokeStyle = 'rgba(110,62,24,0.55)'
    ctx.lineWidth = 1
    ctx.beginPath()
    if (hw >= hh) {
      for (let k = 1; k < 3; k++) {
        const y = -hh + (hh * 2 * k) / 3
        ctx.moveTo(-hw + 3, y)
        ctx.quadraticCurveTo(0, y + (sr(b.seed, k) - 0.5) * 3, hw - 3, y)
      }
    } else {
      for (let k = 1; k < 3; k++) {
        const x = -hw + (hw * 2 * k) / 3
        ctx.moveTo(x, -hh + 3)
        ctx.quadraticCurveTo(x + (sr(b.seed, k) - 0.5) * 3, 0, x, hh - 3)
      }
    }
    ctx.stroke()
    ctx.fillStyle = '#6b4220'
    const m = Math.min(hw, hh) - 2.5
    for (const [px, py] of [[-hw + 3, -hh + 3], [hw - 3, -hh + 3], [-hw + 3, hh - 3], [hw - 3, hh - 3]]) {
      if (m > 1) {
        ctx.beginPath()
        ctx.arc(px, py, 1.1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    cracks(ctx, b, '#4a2a10')
    ctx.strokeStyle = '#5b3413'
    ctx.lineWidth = 1.6
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2)
  } else if (b.mat === 'stone') {
    ctx.fillStyle = '#98a1ab'
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2)
    ctx.fillStyle = '#bcc4cc'
    ctx.beginPath()
    ctx.moveTo(-hw, -hh)
    ctx.lineTo(hw, -hh)
    ctx.lineTo(hw - 3, -hh + 3)
    ctx.lineTo(-hw + 3, -hh + 3)
    ctx.lineTo(-hw + 3, hh - 3)
    ctx.lineTo(-hw, hh)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#6f7882'
    ctx.beginPath()
    ctx.moveTo(hw, hh)
    ctx.lineTo(-hw, hh)
    ctx.lineTo(-hw + 3, hh - 3)
    ctx.lineTo(hw - 3, hh - 3)
    ctx.lineTo(hw - 3, -hh + 3)
    ctx.lineTo(hw, -hh)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#7d8691'
    for (let k = 0; k < 4; k++) {
      ctx.beginPath()
      ctx.arc((sr(b.seed, k) - 0.5) * hw * 1.4, (sr(b.seed, k + 4) - 0.5) * hh * 1.4, 1.3, 0, Math.PI * 2)
      ctx.fill()
    }
    if (hw > 20 || hh > 20) {
      ctx.strokeStyle = 'rgba(55,62,72,0.5)'
      ctx.lineWidth = 1
      ctx.beginPath()
      if (hw > hh) {
        ctx.moveTo(0, -hh + 3)
        ctx.lineTo(0, hh - 3)
      } else {
        ctx.moveTo(-hw + 3, 0)
        ctx.lineTo(hw - 3, 0)
      }
      ctx.stroke()
    }
    cracks(ctx, b, '#2f353d')
    ctx.strokeStyle = '#3f4650'
    ctx.lineWidth = 1.6
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2)
  } else if (b.mat === 'glass') {
    ctx.fillStyle = 'rgba(165,224,250,0.42)'
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2)
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    const d = Math.min(hw, hh)
    ctx.moveTo(-hw + 3, -hh + d * 1.1)
    ctx.lineTo(-hw + d * 1.1, -hh + 3)
    ctx.moveTo(-hw + 3, -hh + d * 1.7)
    ctx.lineTo(-hw + d * 1.7, -hh + 3)
    ctx.stroke()
    cracks(ctx, b, 'rgba(255,255,255,0.9)')
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 1.6
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2)
    ctx.strokeStyle = 'rgba(224,242,254,0.6)'
    ctx.lineWidth = 0.8
    ctx.strokeRect(-hw + 2.5, -hh + 2.5, hw * 2 - 5, hh * 2 - 5)
  } else if (b.mat === 'tnt') {
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2)
    ctx.fillStyle = '#991b1b'
    ctx.fillRect(-hw, -hh, hw * 2, 3.5)
    ctx.fillRect(-hw, hh - 3.5, hw * 2, 3.5)
    ctx.save()
    ctx.fillStyle = '#facc15'
    burstStar(ctx, Math.min(hw, hh) * 0.75, 8, 0.5)
    ctx.fill()
    ctx.fillStyle = '#7f1d1d'
    ctx.beginPath()
    ctx.arc(0, 0, Math.min(hw, hh) * 0.22, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.strokeStyle = '#450a0a'
    ctx.lineWidth = 1.6
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2)
  } else if (b.mat === 'earth') {
    const g = ctx.createLinearGradient(0, -hh, 0, hh)
    g.addColorStop(0, biome.dirt)
    g.addColorStop(1, biome.dirtDark)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-hw - 12, hh)
    ctx.lineTo(-hw, -hh)
    ctx.lineTo(hw, -hh)
    ctx.lineTo(hw + 12, hh)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = biome.grass
    ctx.fillRect(-hw - 1, -hh - 2, hw * 2 + 2, 7)
    ctx.fillStyle = shade(biome.dirt, -0.25)
    for (let k = 0; k < 8; k++) {
      ctx.beginPath()
      ctx.ellipse((sr(b.seed, k) - 0.5) * hw * 1.8, -hh + 10 + sr(b.seed, k + 9) * (hh * 2 - 14), 3, 2, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (b.flash > 0) {
    ctx.globalAlpha = Math.min(0.7, b.flash * 5)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(-hw, -hh, hw * 2, hh * 2)
    ctx.globalAlpha = 1
  }
}

/** Goblin guard (or the king). lookA is the gaze angle in body-local space. */
export function drawGuard(ctx: CanvasRenderingContext2D, b: Body, lookA: number, scared: boolean, t: number) {
  const r = b.r
  const king = b.mat === 'king'
  // body
  ctx.fillStyle = king ? '#86c440' : '#7cc443'
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#5a9a2c'
  ctx.beginPath()
  ctx.arc(0, 0, r, 0.15 * Math.PI, 0.85 * Math.PI)
  ctx.quadraticCurveTo(0, r * 0.55, Math.cos(0.15 * Math.PI) * r, Math.sin(0.15 * Math.PI) * r)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.35, -r * 0.1, r * 0.22, r * 0.14, -0.6, 0, Math.PI * 2)
  ctx.fill()
  // ears
  ctx.fillStyle = '#6cb236'
  for (const sx of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(sx * r * 0.85, -r * 0.2)
    ctx.lineTo(sx * r * 1.3, -r * 0.45)
    ctx.lineTo(sx * r * 0.9, r * 0.15)
    ctx.closePath()
    ctx.fill()
  }
  // snout
  ctx.fillStyle = '#9bd65e'
  ctx.beginPath()
  ctx.ellipse(0, r * 0.28, r * 0.32, r * 0.22, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#2f5216'
  ctx.beginPath()
  ctx.arc(-r * 0.1, r * 0.28, r * 0.06, 0, Math.PI * 2)
  ctx.arc(r * 0.1, r * 0.28, r * 0.06, 0, Math.PI * 2)
  ctx.fill()
  // eyes
  const blink = (t + b.seed) % 3.4 < 0.12
  const ex = r * 0.34
  const ey = -r * 0.12
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(sx * ex, ey, r * 0.2, blink ? r * 0.04 : r * (scared ? 0.26 : 0.22), 0, 0, Math.PI * 2)
    ctx.fill()
    if (!blink) {
      ctx.fillStyle = '#111827'
      ctx.beginPath()
      ctx.arc(sx * ex + Math.cos(lookA) * r * 0.08, ey + Math.sin(lookA) * r * 0.08, r * (scared ? 0.07 : 0.1), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // brows + mouth
  ctx.strokeStyle = '#2f5216'
  ctx.lineWidth = Math.max(1, r * 0.09)
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (scared) {
    ctx.moveTo(-ex - r * 0.18, ey - r * 0.25)
    ctx.lineTo(-ex + r * 0.15, ey - r * 0.36)
    ctx.moveTo(ex + r * 0.18, ey - r * 0.25)
    ctx.lineTo(ex - r * 0.15, ey - r * 0.36)
  } else {
    ctx.moveTo(-ex - r * 0.18, ey - r * 0.34)
    ctx.lineTo(-ex + r * 0.15, ey - r * 0.24)
    ctx.moveTo(ex + r * 0.18, ey - r * 0.34)
    ctx.lineTo(ex - r * 0.15, ey - r * 0.24)
  }
  ctx.stroke()
  if (scared) {
    ctx.fillStyle = '#3f1d0b'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.62, r * 0.14, r * 0.12, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.beginPath()
    ctx.moveTo(-r * 0.25, r * 0.6)
    ctx.quadraticCurveTo(r * 0.05, r * 0.72, r * 0.3, r * 0.52)
    ctx.stroke()
  }
  if (b.hp < b.maxHp * 0.6) {
    ctx.fillStyle = 'rgba(88,28,135,0.45)'
    ctx.beginPath()
    ctx.arc(r * 0.45, r * 0.15, r * 0.18, 0, Math.PI * 2)
    ctx.fill()
  }
  // headgear
  if (king) {
    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.moveTo(-r * 0.6, -r * 0.62)
    ctx.lineTo(-r * 0.7, -r * 1.25)
    ctx.lineTo(-r * 0.32, -r * 0.92)
    ctx.lineTo(0, -r * 1.4)
    ctx.lineTo(r * 0.32, -r * 0.92)
    ctx.lineTo(r * 0.7, -r * 1.25)
    ctx.lineTo(r * 0.6, -r * 0.62)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = 1.2
    ctx.stroke()
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(0, -r * 0.82, r * 0.11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#38bdf8'
    ctx.beginPath()
    ctx.arc(-r * 0.4, -r * 0.76, r * 0.07, 0, Math.PI * 2)
    ctx.arc(r * 0.4, -r * 0.76, r * 0.07, 0, Math.PI * 2)
    ctx.fill()
    // moustache
    ctx.fillStyle = '#3f2a14'
    ctx.beginPath()
    ctx.ellipse(-r * 0.2, r * 0.45, r * 0.2, r * 0.07, 0.3, 0, Math.PI * 2)
    ctx.ellipse(r * 0.2, r * 0.45, r * 0.2, r * 0.07, -0.3, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillStyle = '#9aa3ae'
    ctx.beginPath()
    ctx.arc(0, -r * 0.3, r * 0.82, Math.PI * 1.05, Math.PI * 1.95)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#cbd2d9'
    ctx.beginPath()
    ctx.ellipse(-r * 0.25, -r * 0.78, r * 0.25, r * 0.08, -0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#6b7280'
    ctx.fillRect(-r * 0.86, -r * 0.42, r * 1.72, r * 0.12)
    ctx.fillRect(-r * 0.05, -r * 1.2, r * 0.1, r * 0.2)
  }
  ctx.strokeStyle = '#2f5216'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  if (b.flash > 0) {
    ctx.globalAlpha = Math.min(0.7, b.flash * 5)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

/** Ammo hero. kind: 0 boulder, 1 split, 2 iron ball, 3 bomb. Drawn in local space around (0,0). */
export function drawAmmo(ctx: CanvasRenderingContext2D, kind: number, r: number, seed: number, t: number, angry = true) {
  if (kind === 3) {
    ctx.fillStyle = '#1f2937'
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(-r, -r * 0.12, r * 2, r * 0.24)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.3, r * 0.18, -0.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(r * 0.3, -r * 0.9)
    ctx.quadraticCurveTo(r * 0.7, -r * 1.5, r * 0.25, -r * 1.7)
    ctx.stroke()
    const fl = 0.7 + Math.sin(t * 30) * 0.3
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(r * 0.25, -r * 1.7, 3 * fl, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fb923c'
    ctx.beginPath()
    ctx.arc(r * 0.25, -r * 1.7, 1.6 * fl, 0, Math.PI * 2)
    ctx.fill()
  } else if (kind === 2) {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r)
    g.addColorStop(0, '#9ca3af')
    g.addColorStop(1, '#374151')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1f2937'
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(Math.cos(a) * r * 0.75, Math.sin(a) * r * 0.75, r * 0.08, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()
  } else {
    const base = kind === 1 ? '#6b9ad8' : '#8d929b'
    const hi = kind === 1 ? '#a8c8f0' : '#b9bec6'
    ctx.fillStyle = base
    ctx.beginPath()
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2
      const rr = r * (0.88 + sr(seed, i) * 0.16)
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = kind === 1 ? '#1e3a8a' : '#3b3f46'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = hi
    ctx.beginPath()
    ctx.ellipse(-r * 0.35, -r * 0.4, r * 0.3, r * 0.16, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.arc(r * 0.4, r * 0.35, r * 0.14, 0, Math.PI * 2)
    ctx.arc(-r * 0.2, r * 0.55, r * 0.09, 0, Math.PI * 2)
    ctx.fill()
  }
  // face
  const ey = kind === 3 ? r * 0.3 : -r * 0.05
  for (const sx of [-1, 1]) {
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(sx * r * 0.32, ey, r * 0.19, r * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = kind === 2 ? '#dc2626' : '#111827'
    ctx.beginPath()
    ctx.arc(sx * r * 0.32 + r * 0.06, ey + r * 0.03, r * 0.09, 0, Math.PI * 2)
    ctx.fill()
  }
  if (angry) {
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = Math.max(1.4, r * 0.12)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-r * 0.55, ey - r * 0.32)
    ctx.lineTo(-r * 0.12, ey - r * 0.18)
    ctx.moveTo(r * 0.55, ey - r * 0.32)
    ctx.lineTo(r * 0.12, ey - r * 0.18)
    ctx.stroke()
  }
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, filled: boolean) {
  ctx.save()
  ctx.translate(x, y)
  burstStar(ctx, r, 5, 0.48)
  ctx.fillStyle = filled ? '#facc15' : 'rgba(15,23,42,0.55)'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = filled ? '#a16207' : 'rgba(255,255,255,0.5)'
  ctx.stroke()
  if (filled) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.ellipse(-r * 0.2, -r * 0.25, r * 0.22, r * 0.1, -0.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Wooden slingshot fork. back=true draws the rear arm only. */
export function drawSling(ctx: CanvasRenderingContext2D, back: boolean) {
  ctx.lineCap = 'round'
  if (back) {
    ctx.strokeStyle = '#5b3413'
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(0, -46)
    ctx.quadraticCurveTo(8, -62, 11, -84)
    ctx.stroke()
    ctx.strokeStyle = '#8a5428'
    ctx.lineWidth = 6
    ctx.stroke()
    return
  }
  ctx.strokeStyle = '#5b3413'
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.moveTo(0, 2)
  ctx.lineTo(0, -46)
  ctx.stroke()
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.moveTo(0, -44)
  ctx.quadraticCurveTo(-8, -62, -11, -84)
  ctx.stroke()
  ctx.strokeStyle = '#a8662f'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(0, 2)
  ctx.lineTo(0, -46)
  ctx.stroke()
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(0, -44)
  ctx.quadraticCurveTo(-8, -62, -11, -84)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,220,170,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-2, 0)
  ctx.lineTo(-2, -44)
  ctx.stroke()
  // binding
  ctx.strokeStyle = '#3f2a14'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-6, -40)
  ctx.lineTo(6, -36)
  ctx.moveTo(-6, -35)
  ctx.lineTo(6, -31)
  ctx.stroke()
}
