/** Gold Claw vector art: mine strata, treasures, mole, claw and the miner. */

const TAU = Math.PI * 2

export type ItemKind = 'gold' | 'rock' | 'diamond' | 'bag' | 'tnt' | 'mole' | 'bone'

export type Mine = { name: string; sky: [string, string]; grass: string; layers: string[]; speck: string }

export const MINES: Mine[] = [
  { name: 'Sunny Hills', sky: ['#7dd3fc', '#e0f2fe'], grass: '#65a30d', layers: ['#a16207', '#854d0e', '#713f12', '#5b3410', '#45270c'], speck: '#d6a35c' },
  { name: 'Copper Canyon', sky: ['#fdba74', '#fef3c7'], grass: '#a3a33a', layers: ['#b45309', '#9a3412', '#7c2d12', '#651f0f', '#4a160b'], speck: '#f59e0b' },
  { name: 'Crystal Cavern', sky: ['#a5b4fc', '#e0e7ff'], grass: '#4d7c0f', layers: ['#6d5a8a', '#5b4a78', '#4a3c66', '#3a2f54', '#2c2442'], speck: '#c4b5fd' },
  { name: 'Lava Depths', sky: ['#fca5a5', '#fee2e2'], grass: '#57534e', layers: ['#7c2d12', '#651c0e', '#4c140b', '#3b0f09', '#2a0a06'], speck: '#fb923c' },
]

function hash(i: number, s: number) {
  const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453
  return v - Math.floor(v)
}

export function paintMine(ctx: CanvasRenderingContext2D, mine: Mine, W: number, H: number, sy: number, u: number, seed: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, sy)
  sky.addColorStop(0, mine.sky[0])
  sky.addColorStop(1, mine.sky[1])
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, W, sy)
  // distant hills
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.beginPath()
  ctx.moveTo(0, sy)
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, sy - 18 * u - Math.sin(x * 0.02 + seed) * 10 * u - Math.sin(x * 0.051) * 6 * u)
  ctx.lineTo(W, sy)
  ctx.fill()
  // strata
  const n = mine.layers.length
  const depth = H - sy
  for (let i = 0; i < n; i++) {
    const y0 = sy + (i / n) * depth
    ctx.fillStyle = mine.layers[i]
    ctx.beginPath()
    ctx.moveTo(0, H)
    ctx.lineTo(0, y0)
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y0 + (i ? Math.sin(x * 0.03 + i * 2 + seed) * 6 * u : 0))
    ctx.lineTo(W, H)
    ctx.fill()
  }
  // specks and pebbles
  for (let i = 0; i < 160; i++) {
    const x = hash(i, seed) * W
    const y = sy + 10 * u + hash(i, seed + 1) * (depth - 10 * u)
    const r = (1 + hash(i, seed + 2) * 2.5) * u
    ctx.globalAlpha = 0.35
    ctx.fillStyle = i % 3 ? 'rgba(0,0,0,0.6)' : mine.speck
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.4, r, 0, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  // roots near the top
  ctx.strokeStyle = 'rgba(60,30,10,0.5)'
  ctx.lineWidth = 1.5 * u
  for (let i = 0; i < 8; i++) {
    const x = hash(i, seed + 7) * W
    ctx.beginPath()
    ctx.moveTo(x, sy + 4 * u)
    ctx.quadraticCurveTo(x + 8 * u, sy + 20 * u, x - 4 * u, sy + (28 + hash(i, 9) * 20) * u)
    ctx.stroke()
  }
  // grass strip
  ctx.fillStyle = mine.grass
  ctx.fillRect(0, sy - 6 * u, W, 10 * u)
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.fillRect(0, sy - 6 * u, W, 2 * u)
  for (let x = 4; x < W; x += 9 * u) {
    ctx.fillStyle = mine.grass
    ctx.beginPath()
    ctx.moveTo(x, sy - 5 * u)
    ctx.lineTo(x + 3 * u, sy - 12 * u - hash(x, 3) * 4 * u)
    ctx.lineTo(x + 6 * u, sy - 5 * u)
    ctx.fill()
  }
  // depth shade
  const sh = ctx.createLinearGradient(0, sy, 0, H)
  sh.addColorStop(0, 'rgba(0,0,0,0)')
  sh.addColorStop(1, 'rgba(0,0,0,0.35)')
  ctx.fillStyle = sh
  ctx.fillRect(0, sy, W, depth)
}

/** Irregular blob outline for nuggets and rocks. */
export function blob(seed: number, n = 9): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(0.78 + hash(i, seed) * 0.3)
  return out
}

function blobPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, verts: number[], rot: number) {
  ctx.beginPath()
  const n = verts.length
  for (let i = 0; i <= n; i++) {
    const a = rot + (i / n) * TAU
    const rr = r * verts[i % n]
    const px = x + Math.cos(a) * rr
    const py = y + Math.sin(a) * rr * 0.85
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

export function drawItem(
  ctx: CanvasRenderingContext2D,
  kind: ItemKind,
  x: number,
  y: number,
  r: number,
  verts: number[],
  t: number,
  seed: number,
  extra: { dir?: number; holds?: boolean } = {},
) {
  if (kind === 'gold' || kind === 'rock') {
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#000'
    blobPath(ctx, x + r * 0.12, y + r * 0.15, r, verts, seed)
    ctx.fill()
    ctx.globalAlpha = 1
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1)
    if (kind === 'gold') {
      g.addColorStop(0, '#fff7c2')
      g.addColorStop(0.35, '#fcd34d')
      g.addColorStop(1, '#b45309')
    } else {
      g.addColorStop(0, '#d6d3d1')
      g.addColorStop(0.5, '#8a8580')
      g.addColorStop(1, '#44403c')
    }
    ctx.fillStyle = g
    blobPath(ctx, x, y, r, verts, seed)
    ctx.fill()
    ctx.strokeStyle = kind === 'gold' ? '#92400e' : '#292524'
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (kind === 'rock') {
      ctx.strokeStyle = 'rgba(41,37,36,0.6)'
      ctx.beginPath()
      ctx.moveTo(x - r * 0.3, y - r * 0.1)
      ctx.lineTo(x + r * 0.05, y + r * 0.15)
      ctx.lineTo(x + r * 0.35, y + r * 0.05)
      ctx.stroke()
    } else {
      // bumps and sparkle
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.beginPath()
      ctx.ellipse(x - r * 0.35, y - r * 0.35, r * 0.22, r * 0.12, -0.6, 0, TAU)
      ctx.fill()
      const tw = (Math.sin(t * 3 + seed * 10) + 1) / 2
      if (tw > 0.6) sparkle(ctx, x + r * 0.4, y - r * 0.3, r * 0.35 * (tw - 0.5) * 2)
    }
    return
  }
  if (kind === 'diamond') {
    const s = r * 1.1
    ctx.globalAlpha = 0.4
    ctx.fillStyle = '#22d3ee'
    ctx.beginPath()
    ctx.arc(x, y, s * 1.4, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#0891b2'
    ctx.beginPath()
    ctx.moveTo(x - s, y - s * 0.3)
    ctx.lineTo(x - s * 0.5, y - s * 0.8)
    ctx.lineTo(x + s * 0.5, y - s * 0.8)
    ctx.lineTo(x + s, y - s * 0.3)
    ctx.lineTo(x, y + s)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#67e8f9'
    ctx.beginPath()
    ctx.moveTo(x - s, y - s * 0.3)
    ctx.lineTo(x - s * 0.5, y - s * 0.8)
    ctx.lineTo(x, y - s * 0.3)
    ctx.lineTo(x, y + s)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#cffafe'
    ctx.beginPath()
    ctx.moveTo(x - s * 0.5, y - s * 0.8)
    ctx.lineTo(x + s * 0.5, y - s * 0.8)
    ctx.lineTo(x, y - s * 0.3)
    ctx.closePath()
    ctx.fill()
    const tw = (Math.sin(t * 4 + seed * 10) + 1) / 2
    sparkle(ctx, x + s * 0.5, y - s * 0.6, s * 0.5 * tw)
    return
  }
  if (kind === 'bag') {
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.ellipse(x + 2, y + r * 0.85, r * 0.9, r * 0.25, 0, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#a16207'
    ctx.beginPath()
    ctx.moveTo(x - r * 0.4, y - r * 0.55)
    ctx.quadraticCurveTo(x - r * 1.05, y + r * 0.1, x - r * 0.75, y + r * 0.75)
    ctx.quadraticCurveTo(x, y + r * 1.05, x + r * 0.75, y + r * 0.75)
    ctx.quadraticCurveTo(x + r * 1.05, y + r * 0.1, x + r * 0.4, y - r * 0.55)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ca8a04'
    ctx.beginPath()
    ctx.ellipse(x - r * 0.3, y + r * 0.1, r * 0.25, r * 0.4, 0.3, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#a16207'
    ctx.beginPath()
    ctx.moveTo(x - r * 0.35, y - r * 0.6)
    ctx.lineTo(x - r * 0.55, y - r * 0.95)
    ctx.lineTo(x + r * 0.55, y - r * 0.95)
    ctx.lineTo(x + r * 0.35, y - r * 0.6)
    ctx.fill()
    ctx.fillStyle = '#7c2d12'
    ctx.fillRect(x - r * 0.45, y - r * 0.68, r * 0.9, r * 0.14)
    ctx.fillStyle = '#fef3c7'
    ctx.font = `900 ${Math.round(r * 0.95)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('?', x + r * 0.05, y + r * 0.3)
    return
  }
  if (kind === 'tnt') {
    ctx.globalAlpha = 0.3
    ctx.fillStyle = '#000'
    ctx.beginPath()
    ctx.ellipse(x + 2, y + r, r * 0.85, r * 0.25, 0, 0, TAU)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#991b1b'
    ctx.beginPath()
    ctx.roundRect(x - r * 0.8, y - r, r * 1.6, r * 2, r * 0.35)
    ctx.fill()
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(x - r * 0.62, y - r, r * 0.5, r * 2)
    ctx.fillStyle = '#1c1917'
    ctx.fillRect(x - r * 0.8, y - r * 0.68, r * 1.6, r * 0.16)
    ctx.fillRect(x - r * 0.8, y + r * 0.52, r * 1.6, r * 0.16)
    ctx.fillStyle = '#fef3c7'
    ctx.font = `900 ${Math.round(r * 0.62)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('TNT', x, y)
    // fuse spark
    ctx.strokeStyle = '#57534e'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y - r)
    ctx.quadraticCurveTo(x + r * 0.3, y - r * 1.4, x + r * 0.5, y - r * 1.3)
    ctx.stroke()
    if (Math.sin(t * 20 + seed * 9) > 0) sparkle(ctx, x + r * 0.5, y - r * 1.3, r * 0.3, '#fb923c')
    return
  }
  if (kind === 'bone') {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(seed * 3)
    ctx.fillStyle = '#e7e5e4'
    ctx.fillRect(-r * 0.8, -r * 0.18, r * 1.6, r * 0.36)
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(sx * r * 0.85, -r * 0.2, r * 0.25, 0, TAU)
      ctx.arc(sx * r * 0.85, r * 0.2, r * 0.25, 0, TAU)
      ctx.fill()
    }
    ctx.restore()
    return
  }
  // mole
  const dir = extra.dir ?? 1
  const step = Math.sin(t * 12)
  ctx.globalAlpha = 0.3
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(x, y + r * 0.75, r, r * 0.25, 0, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(dir, 1)
  ctx.fillStyle = '#3f2a1d'
  ctx.beginPath()
  ctx.ellipse(-r * 0.45 + step * r * 0.1, r * 0.62, r * 0.22, r * 0.14, 0, 0, TAU)
  ctx.ellipse(r * 0.35 - step * r * 0.1, r * 0.62, r * 0.22, r * 0.14, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#6b4a35'
  ctx.beginPath()
  ctx.ellipse(0, 0, r, r * 0.72, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#8b6650'
  ctx.beginPath()
  ctx.ellipse(-r * 0.25, -r * 0.3, r * 0.45, r * 0.22, -0.3, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#f9a8d4'
  ctx.beginPath()
  ctx.arc(r * 0.98, r * 0.05, r * 0.18, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#111'
  ctx.beginPath()
  ctx.arc(r * 0.55, -r * 0.18, r * 0.09, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#fbcfe8'
  ctx.beginPath()
  ctx.ellipse(r * 0.7, r * 0.4, r * 0.16, r * 0.1, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
  if (extra.holds) drawItem(ctx, 'diamond', x + dir * r * 1.15, y + r * 0.1, r * 0.42, verts, t, seed)
}

export function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color = '#ffffff') {
  if (s <= 0.2) return
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - s)
  ctx.lineTo(x + s * 0.25, y - s * 0.25)
  ctx.lineTo(x + s, y)
  ctx.lineTo(x + s * 0.25, y + s * 0.25)
  ctx.lineTo(x, y + s)
  ctx.lineTo(x - s * 0.25, y + s * 0.25)
  ctx.lineTo(x - s, y)
  ctx.lineTo(x - s * 0.25, y - s * 0.25)
  ctx.closePath()
  ctx.fill()
}

/** Claw: `open` 0 closed..1 open, rotated along the rope angle. */
export function drawClaw(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, u: number, open: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-ang)
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.roundRect(-7 * u, -6 * u, 14 * u, 9 * u, 3 * u)
  ctx.fill()
  ctx.fillStyle = '#94a3b8'
  ctx.fillRect(-5 * u, -5 * u, 4 * u, 6 * u)
  const spread = 0.25 + open * 0.55
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 4.5 * u
  ctx.lineCap = 'round'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(s * 4 * u, 2 * u)
    ctx.quadraticCurveTo(s * (10 + spread * 10) * u, 10 * u, s * (4 + spread * 6) * u, 19 * u)
    ctx.stroke()
  }
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 2 * u
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(s * 4 * u, 2 * u)
    ctx.quadraticCurveTo(s * (10 + spread * 10) * u, 10 * u, s * (4 + spread * 6) * u, 19 * u)
    ctx.stroke()
  }
  ctx.restore()
}

/** The miner turning a winch on the surface. */
export function drawMiner(ctx: CanvasRenderingContext2D, x: number, sy: number, u: number, crank: number, mood: 'idle' | 'strain' | 'cheer' | 'sad', t: number) {
  // winch frame
  ctx.fillStyle = '#78350f'
  ctx.fillRect(x - 26 * u, sy - 34 * u, 6 * u, 34 * u)
  ctx.fillRect(x + 20 * u, sy - 34 * u, 6 * u, 34 * u)
  ctx.fillStyle = '#92400e'
  ctx.fillRect(x - 30 * u, sy - 38 * u, 60 * u, 7 * u)
  // drum
  ctx.fillStyle = '#a16207'
  ctx.beginPath()
  ctx.ellipse(x, sy - 20 * u, 16 * u, 9 * u, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#d6a35c'
  ctx.lineWidth = 1.5 * u
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(x + i * 5 * u + Math.sin(crank) * 2 * u, sy - 28 * u)
    ctx.lineTo(x + i * 5 * u + Math.sin(crank) * 2 * u, sy - 12 * u)
    ctx.stroke()
  }
  // crank handle
  const hx = x + 26 * u + Math.cos(crank) * 9 * u
  const hy = sy - 20 * u + Math.sin(crank) * 9 * u
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 3 * u
  ctx.beginPath()
  ctx.moveTo(x + 26 * u, sy - 20 * u)
  ctx.lineTo(hx, hy)
  ctx.stroke()
  // miner to the right of the winch
  const mx = x + 52 * u
  const bob = mood === 'cheer' ? -Math.abs(Math.sin(t * 10)) * 6 * u : mood === 'strain' ? Math.sin(t * 20) * 1 * u : 0
  ctx.globalAlpha = 0.25
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(mx, sy, 16 * u, 4 * u, 0, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = '#1e3a8a'
  ctx.fillRect(mx - 9 * u, sy - 16 * u, 7 * u, 16 * u + bob)
  ctx.fillRect(mx + 2 * u, sy - 16 * u, 7 * u, 16 * u + bob)
  ctx.fillStyle = '#3f2a1d'
  ctx.fillRect(mx - 11 * u, sy - 3 * u, 10 * u, 4 * u)
  ctx.fillRect(mx + 1 * u, sy - 3 * u, 10 * u, 4 * u)
  ctx.save()
  ctx.translate(mx, sy - 16 * u + bob)
  // body
  ctx.fillStyle = '#2563eb'
  ctx.beginPath()
  ctx.roundRect(-11 * u, -24 * u, 22 * u, 26 * u, 7 * u)
  ctx.fill()
  ctx.fillStyle = '#dc2626'
  ctx.fillRect(-11 * u, -24 * u, 22 * u, 9 * u)
  ctx.fillStyle = '#1e3a8a'
  ctx.fillRect(-7 * u, -24 * u, 3 * u, 22 * u)
  ctx.fillRect(4 * u, -24 * u, 3 * u, 22 * u)
  // arm to crank
  ctx.strokeStyle = '#f1c27d'
  ctx.lineWidth = 5 * u
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-9 * u, -18 * u)
  if (mood === 'cheer') ctx.lineTo(-14 * u, -40 * u)
  else ctx.lineTo(hx - mx, hy - (sy - 16 * u + bob))
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(9 * u, -18 * u)
  ctx.lineTo(mood === 'cheer' ? 14 * u : 12 * u, mood === 'cheer' ? -40 * u : -6 * u)
  ctx.stroke()
  // head
  ctx.fillStyle = '#f1c27d'
  ctx.beginPath()
  ctx.arc(0, -33 * u, 10 * u, 0, TAU)
  ctx.fill()
  // beard
  ctx.fillStyle = '#92400e'
  ctx.beginPath()
  ctx.arc(-2 * u, -28 * u, 8 * u, 0.2, Math.PI - 0.2)
  ctx.fill()
  // helmet with lamp
  ctx.fillStyle = '#facc15'
  ctx.beginPath()
  ctx.arc(0, -36 * u, 10.5 * u, Math.PI, 0)
  ctx.fill()
  ctx.fillRect(-13 * u, -37 * u, 26 * u, 3 * u)
  ctx.fillStyle = '#fef9c3'
  ctx.beginPath()
  ctx.arc(-6 * u, -41 * u, 3 * u, 0, TAU)
  ctx.fill()
  // face
  ctx.fillStyle = '#111'
  if (mood === 'strain') {
    ctx.fillRect(-7 * u, -33 * u, 4 * u, 1.5 * u)
    ctx.fillRect(1 * u, -33 * u, 4 * u, 1.5 * u)
  } else {
    ctx.beginPath()
    ctx.arc(-5 * u, -32 * u, 1.6 * u, 0, TAU)
    ctx.arc(3 * u, -32 * u, 1.6 * u, 0, TAU)
    ctx.fill()
  }
  ctx.strokeStyle = '#111'
  ctx.lineWidth = 1.5 * u
  ctx.beginPath()
  if (mood === 'cheer') ctx.arc(-1 * u, -28 * u, 3 * u, 0.1, Math.PI - 0.1)
  else if (mood === 'sad') ctx.arc(-1 * u, -25 * u, 3 * u, Math.PI + 0.3, -0.3)
  ctx.stroke()
  ctx.restore()
}

export function drawDynamite(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, rot: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.roundRect(-4 * u, -10 * u, 8 * u, 20 * u, 2 * u)
  ctx.fill()
  ctx.fillStyle = '#fca5a5'
  ctx.fillRect(-3 * u, -9 * u, 2 * u, 18 * u)
  ctx.strokeStyle = '#57534e'
  ctx.lineWidth = 1.5 * u
  ctx.beginPath()
  ctx.moveTo(0, -10 * u)
  ctx.lineTo(3 * u, -15 * u)
  ctx.stroke()
  sparkle(ctx, 3 * u, -15 * u, 4 * u, '#fbbf24')
  ctx.restore()
}
