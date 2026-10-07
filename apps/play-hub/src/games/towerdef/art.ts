import { COLS, ROWS, type MapData } from './maps'

export type TowerKind = 'arrow' | 'cannon' | 'frost' | 'tesla'
export type EnemyKind = 'grunt' | 'runner' | 'tank' | 'flyer' | 'healer' | 'boss'

const TAU = Math.PI * 2
export const TIER_GEM = ['#a3e635', '#38bdf8', '#fbbf24']

type Theme = {
  bg: string
  a: string
  b: string
  edge: string
  pathOut: string
  pathIn: string
  pebble: string
}

export const THEMES: Theme[] = [
  { bg: '#1f3a0c', a: '#4d7c0f', b: '#558a17', edge: '#2f4f0b', pathOut: '#7c4a1e', pathIn: '#d9b27a', pebble: '#b68a52' },
  { bg: '#3b1d0b', a: '#b8763c', b: '#c27f44', edge: '#7a3f17', pathOut: '#5a2d10', pathIn: '#ecc58c', pebble: '#c9995c' },
  { bg: '#1e293b', a: '#7f97b3', b: '#89a1bc', edge: '#4b5f78', pathOut: '#475a72', pathIn: '#e8eef6', pebble: '#bccadb' },
]

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.28) {
  ctx.globalAlpha = a
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 1
}

function poly(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, n: number, rot = 0) {
  ctx.beginPath()
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU
    if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  ctx.closePath()
}

// ── Map ─────────────────────────────────────────────────────

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, theme: number, seed: number) {
  const r = s * (0.3 + seed * 0.1)
  shadow(ctx, x + r * 0.3, y + r * 0.55, r * 0.9, r * 0.4, 0.25)
  if (theme === 2) {
    // snowy pine
    ctx.fillStyle = '#5b4636'
    ctx.fillRect(x - s * 0.04, y + r * 0.2, s * 0.08, r * 0.45)
    for (let i = 0; i < 3; i++) {
      const yy = y + r * 0.35 - i * r * 0.45
      const ww = r * (1 - i * 0.25)
      ctx.fillStyle = '#1f4b3f'
      ctx.beginPath()
      ctx.moveTo(x, yy - r * 0.7)
      ctx.lineTo(x + ww, yy)
      ctx.lineTo(x - ww, yy)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#f1f5f9'
      ctx.beginPath()
      ctx.moveTo(x, yy - r * 0.7)
      ctx.lineTo(x + ww * 0.45, yy - r * 0.38)
      ctx.lineTo(x - ww * 0.55, yy - r * 0.3)
      ctx.closePath()
      ctx.fill()
    }
    return
  }
  if (theme === 1) {
    // cactus
    ctx.fillStyle = '#3f6212'
    ctx.beginPath()
    ctx.roundRect(x - r * 0.22, y - r * 0.9, r * 0.44, r * 1.5, r * 0.22)
    ctx.fill()
    ctx.beginPath()
    ctx.roundRect(x - r * 0.75, y - r * 0.5, r * 0.3, r * 0.6, r * 0.15)
    ctx.roundRect(x + r * 0.45, y - r * 0.7, r * 0.3, r * 0.55, r * 0.15)
    ctx.fill()
    ctx.fillRect(x - r * 0.6, y - r * 0.05, r * 0.5, r * 0.2)
    ctx.fillRect(x + r * 0.1, y - r * 0.25, r * 0.5, r * 0.2)
    ctx.fillStyle = '#65a30d'
    ctx.fillRect(x - r * 0.12, y - r * 0.8, r * 0.1, r * 1.2)
    return
  }
  ctx.fillStyle = '#5b3a1e'
  ctx.fillRect(x - s * 0.04, y, s * 0.08, r * 0.6)
  ctx.fillStyle = '#2f5d12'
  ctx.beginPath()
  ctx.arc(x, y - r * 0.2, r, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#3f7a17'
  ctx.beginPath()
  ctx.arc(x - r * 0.2, y - r * 0.4, r * 0.7, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#65a30d'
  ctx.beginPath()
  ctx.arc(x - r * 0.35, y - r * 0.55, r * 0.32, 0, TAU)
  ctx.fill()
}

function rock(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, theme: number, seed: number) {
  const r = s * (0.16 + seed * 0.08)
  shadow(ctx, x + r * 0.2, y + r * 0.5, r * 1.1, r * 0.45, 0.22)
  ctx.fillStyle = theme === 1 ? '#8a4b22' : theme === 2 ? '#a5c3dc' : '#78716c'
  poly(ctx, x, y, r, 6, seed * 3)
  ctx.fill()
  ctx.fillStyle = theme === 1 ? '#b0683a' : theme === 2 ? '#e0f2fe' : '#a8a29e'
  poly(ctx, x - r * 0.25, y - r * 0.25, r * 0.5, 5, seed * 5)
  ctx.fill()
}

function flowers(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, theme: number, seed: number) {
  const cols = theme === 0 ? ['#fde047', '#f9a8d4', '#ffffff'] : theme === 1 ? ['#a16207', '#fbbf24', '#7c2d12'] : ['#ffffff', '#e0f2fe', '#ffffff']
  for (let i = 0; i < 5; i++) {
    const a = seed * 20 + i * 1.7
    const px = x + Math.cos(a) * s * 0.28
    const py = y + Math.sin(a * 1.3) * s * 0.28
    ctx.fillStyle = theme === 0 ? '#3f7a17' : 'rgba(0,0,0,0.12)'
    ctx.fillRect(px - 0.5, py, 1, s * 0.08)
    ctx.fillStyle = cols[i % 3]
    ctx.beginPath()
    ctx.arc(px, py, s * 0.045, 0, TAU)
    ctx.fill()
  }
}

/** Paint the static board (ground, path, pads, scenery) — cached by the game. */
export function paintMap(ctx: CanvasRenderingContext2D, md: MapData, W: number, H: number, cs: number, ox: number, oy: number) {
  const th = THEMES[md.def.theme]
  ctx.fillStyle = th.bg
  ctx.fillRect(0, 0, W, H)
  // Ground tiles
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      ctx.fillStyle = (cx + cy) % 2 ? th.a : th.b
      ctx.fillRect(ox + cx * cs, oy + cy * cs, cs + 0.5, cs + 0.5)
    }
  }
  const g = ctx.createRadialGradient(W / 2, oy + (ROWS * cs) / 2, cs * 2, W / 2, oy + (ROWS * cs) / 2, cs * 9)
  g.addColorStop(0, 'rgba(255,255,255,0.08)')
  g.addColorStop(1, 'rgba(0,0,0,0.25)')
  ctx.fillStyle = g
  ctx.fillRect(ox, oy, COLS * cs, ROWS * cs)
  // Grass tufts
  ctx.strokeStyle = th.edge
  ctx.globalAlpha = 0.35
  ctx.lineWidth = 1
  for (let i = 0; i < 90; i++) {
    const x = ox + ((i * 73.13) % (COLS * cs))
    const y = oy + ((i * 41.71 + (i % 7) * 13) % (ROWS * cs))
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x - 2, y - 4)
    ctx.moveTo(x + 2, y)
    ctx.lineTo(x + 3, y - 4)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  const P = (v: number, o: number) => o + (v + 0.5) * cs
  const pts = md.ground.pts
  ctx.save()
  ctx.beginPath()
  ctx.rect(ox, oy, COLS * cs, ROWS * cs)
  ctx.clip()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const trace = () => {
    ctx.beginPath()
    pts.forEach((p, i) => (i ? ctx.lineTo(P(p.x, ox), P(p.y, oy)) : ctx.moveTo(P(p.x, ox), P(p.y, oy))))
  }
  ctx.globalAlpha = 0.3
  ctx.strokeStyle = '#000'
  ctx.lineWidth = cs * 0.96
  ctx.save()
  ctx.translate(0, cs * 0.06)
  trace()
  ctx.stroke()
  ctx.restore()
  ctx.globalAlpha = 1
  ctx.strokeStyle = th.pathOut
  ctx.lineWidth = cs * 0.9
  trace()
  ctx.stroke()
  ctx.strokeStyle = th.pathIn
  ctx.lineWidth = cs * 0.74
  trace()
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = cs * 0.22
  ctx.setLineDash([cs * 0.25, cs * 0.55])
  trace()
  ctx.stroke()
  ctx.setLineDash([])
  // pebbles
  ctx.fillStyle = th.pebble
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const n = Math.round(Math.hypot(b.x - a.x, b.y - a.y) * 2)
    for (let s = 0; s < n; s++) {
      const k = (s + 0.5) / n
      const j = Math.sin(i * 12.9 + s * 78.2) * 0.28
      const px = P(a.x + (b.x - a.x) * k, ox) + (b.y !== a.y ? j * cs : 0)
      const py = P(a.y + (b.y - a.y) * k, oy) + (b.x !== a.x ? j * cs : 0)
      ctx.beginPath()
      ctx.ellipse(px, py, cs * 0.05, cs * 0.035, 0, 0, TAU)
      ctx.fill()
    }
  }
  ctx.restore()

  // Pads: stone platforms
  for (const p of md.pads) {
    const x = P(p.x, ox)
    const y = P(p.y, oy)
    shadow(ctx, x + 1, y + cs * 0.08, cs * 0.4, cs * 0.3, 0.25)
    ctx.fillStyle = '#57534e'
    ctx.beginPath()
    ctx.roundRect(x - cs * 0.4, y - cs * 0.38, cs * 0.8, cs * 0.76, cs * 0.16)
    ctx.fill()
    ctx.fillStyle = '#a8a29e'
    ctx.beginPath()
    ctx.roundRect(x - cs * 0.36, y - cs * 0.38, cs * 0.72, cs * 0.68, cs * 0.14)
    ctx.fill()
    ctx.strokeStyle = 'rgba(87,83,78,0.55)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x - cs * 0.36, y - cs * 0.05)
    ctx.lineTo(x + cs * 0.36, y - cs * 0.05)
    ctx.moveTo(x, y - cs * 0.38)
    ctx.lineTo(x, y - cs * 0.05)
    ctx.moveTo(x - cs * 0.18, y - cs * 0.05)
    ctx.lineTo(x - cs * 0.18, y + cs * 0.3)
    ctx.moveTo(x + cs * 0.18, y - cs * 0.05)
    ctx.lineTo(x + cs * 0.18, y + cs * 0.3)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(x - cs * 0.32, y - cs * 0.35, cs * 0.64, cs * 0.06)
  }

  // Scenery
  for (const d of md.decos) {
    const x = P(d.cx, ox) + (d.seed - 0.5) * cs * 0.3
    const y = P(d.cy, oy) + (d.seed * 7 % 1 - 0.5) * cs * 0.3
    if (d.kind === 0 || d.kind === 3) tree(ctx, x, y, cs, md.def.theme, d.seed)
    else if (d.kind === 1) rock(ctx, x, y, cs, md.def.theme, d.seed)
    else flowers(ctx, x, y, cs, md.def.theme, d.seed)
  }

  // Board frame
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 3
  ctx.strokeRect(ox - 1.5, oy - 1.5, COLS * cs + 3, ROWS * cs + 3)
}

/** Spawn portal and exit gate, animated each frame. */
export function drawGates(ctx: CanvasRenderingContext2D, md: MapData, cs: number, ox: number, oy: number, t: number) {
  const pts = md.ground.pts
  const edge = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const x = Math.max(0, Math.min(COLS - 1, a.x))
    const y = Math.max(0, Math.min(ROWS - 1, a.y))
    void b
    return { x: ox + (x + 0.5) * cs, y: oy + (y + 0.5) * cs }
  }
  const s = edge(pts[0], pts[1])
  ctx.save()
  ctx.translate(s.x, s.y)
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = i === 0 ? '#7f1d1d' : i === 1 ? '#dc2626' : '#fca5a5'
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.8
    ctx.beginPath()
    ctx.arc(0, 0, cs * (0.42 - i * 0.12), t * (2 + i) + i, t * (2 + i) + i + 4.2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.restore()
  const e = edge(pts[pts.length - 1], pts[pts.length - 2])
  // castle gate
  ctx.save()
  ctx.translate(e.x, e.y)
  const w = cs * 0.9
  ctx.fillStyle = '#475569'
  ctx.fillRect(-w / 2, -cs * 0.35, w, cs * 0.7)
  ctx.fillStyle = '#64748b'
  for (let i = 0; i < 4; i++) ctx.fillRect(-w / 2 + i * (w / 3.5), -cs * 0.48, w / 6, cs * 0.16)
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.moveTo(-cs * 0.2, cs * 0.35)
  ctx.lineTo(-cs * 0.2, -cs * 0.05)
  ctx.arc(0, -cs * 0.05, cs * 0.2, Math.PI, 0)
  ctx.lineTo(cs * 0.2, cs * 0.35)
  ctx.fill()
  ctx.fillStyle = '#3b82f6'
  ctx.beginPath()
  ctx.moveTo(cs * 0.3, -cs * 0.48)
  ctx.lineTo(cs * 0.3, -cs * 0.85)
  ctx.lineTo(cs * 0.3 + cs * 0.26 * (0.8 + Math.sin(t * 6) * 0.2), -cs * 0.75)
  ctx.lineTo(cs * 0.3, -cs * 0.66)
  ctx.fill()
  ctx.restore()
}

// ── Towers ──────────────────────────────────────────────────

function base(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, tier: number) {
  const h = s * 0.38
  shadow(ctx, x + s * 0.04, y + s * 0.28, s * 0.42, s * 0.15)
  if (tier === 1) {
    ctx.fillStyle = '#4a2a0f'
    ctx.beginPath()
    ctx.roundRect(x - h, y - h + 2, h * 2, h * 2, s * 0.1)
    ctx.fill()
    ctx.fillStyle = '#9a5f2b'
    ctx.beginPath()
    ctx.roundRect(x - h, y - h, h * 2, h * 2 - 2, s * 0.1)
    ctx.fill()
    ctx.strokeStyle = 'rgba(60,30,10,0.55)'
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo(x - h, y - h + (i * h * 2) / 4)
      ctx.lineTo(x + h, y - h + (i * h * 2) / 4)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.18)'
    ctx.fillRect(x - h + 2, y - h + 1, h * 2 - 4, 2)
    return
  }
  const r = s * 0.42
  ctx.fillStyle = tier === 3 ? '#111827' : '#374151'
  poly(ctx, x, y + 2, r, 8, Math.PI / 8)
  ctx.fill()
  ctx.fillStyle = tier === 3 ? '#4b5563' : '#94a3b8'
  poly(ctx, x, y, r, 8, Math.PI / 8)
  ctx.fill()
  ctx.strokeStyle = tier === 3 ? 'rgba(0,0,0,0.4)' : 'rgba(55,65,81,0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(x, y, r * 0.66, 0, TAU)
  ctx.stroke()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * r * 0.66, y + Math.sin(a) * r * 0.66)
    ctx.lineTo(x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92)
    ctx.stroke()
  }
  if (tier === 3) {
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 2
    poly(ctx, x, y, r, 8, Math.PI / 8)
    ctx.stroke()
    // pennants
    for (const sx of [-1, 1]) {
      const px = x + sx * r * 0.85
      const py = y - r * 0.55
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(px, py + r * 0.4)
      ctx.lineTo(px, py - r * 0.35)
      ctx.stroke()
      ctx.fillStyle = '#dc2626'
      ctx.beginPath()
      ctx.moveTo(px, py - r * 0.35)
      ctx.lineTo(px + sx * r * 0.35, py - r * 0.22)
      ctx.lineTo(px, py - r * 0.1)
      ctx.fill()
    }
  }
}

function crystal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#0ea5e9'
  ctx.beginPath()
  ctx.moveTo(x, y - r * 1.4)
  ctx.lineTo(x + r * 0.6, y - r * 0.3)
  ctx.lineTo(x + r * 0.4, y + r * 0.7)
  ctx.lineTo(x - r * 0.4, y + r * 0.7)
  ctx.lineTo(x - r * 0.6, y - r * 0.3)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#7dd3fc'
  ctx.beginPath()
  ctx.moveTo(x, y - r * 1.4)
  ctx.lineTo(x - r * 0.6, y - r * 0.3)
  ctx.lineTo(x - r * 0.4, y + r * 0.7)
  ctx.lineTo(x, y + r * 0.7)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f0f9ff'
  ctx.beginPath()
  ctx.moveTo(x - r * 0.1, y - r * 1.1)
  ctx.lineTo(x - r * 0.38, y - r * 0.3)
  ctx.lineTo(x - r * 0.18, y - r * 0.3)
  ctx.closePath()
  ctx.fill()
}

export function drawTower(
  ctx: CanvasRenderingContext2D,
  kind: TowerKind,
  tier: number,
  x: number,
  y: number,
  s: number,
  aim: number,
  t: number,
  recoil: number,
) {
  base(ctx, x, y, s, tier)
  const gem = TIER_GEM[tier - 1]
  if (kind === 'arrow') {
    ctx.save()
    ctx.translate(x, y - s * 0.06)
    ctx.rotate(aim)
    const n = tier === 3 ? 2 : 1
    const rec = recoil * s * 0.08
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * s * 0.26
      ctx.fillStyle = '#5b2a0e'
      ctx.fillRect(-s * 0.2 - rec, off - s * 0.05, s * 0.44, s * 0.1)
      ctx.strokeStyle = tier >= 2 ? '#e2e8f0' : '#c2803c'
      ctx.lineWidth = s * 0.06
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(s * 0.06 - rec, off, s * 0.2, -1.25, 1.25)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1
      const bx = s * 0.06 - rec + Math.cos(1.25) * s * 0.2
      const pull = recoil > 0.5 ? 0 : s * 0.12
      ctx.beginPath()
      ctx.moveTo(bx, off - Math.sin(1.25) * s * 0.2)
      ctx.lineTo(bx - pull - s * 0.02, off)
      ctx.lineTo(bx, off + Math.sin(1.25) * s * 0.2)
      ctx.stroke()
      if (recoil < 0.5) {
        ctx.fillStyle = '#f1f5f9'
        ctx.fillRect(-s * 0.1 - rec, off - 1, s * 0.4, 2)
        ctx.beginPath()
        ctx.moveTo(s * 0.34 - rec, off)
        ctx.lineTo(s * 0.26 - rec, off - s * 0.05)
        ctx.lineTo(s * 0.26 - rec, off + s * 0.05)
        ctx.fill()
      }
    }
    ctx.restore()
    ctx.fillStyle = gem
    ctx.beginPath()
    ctx.arc(x, y - s * 0.06, s * 0.07, 0, TAU)
    ctx.fill()
  } else if (kind === 'cannon') {
    ctx.save()
    ctx.translate(x, y - s * 0.04)
    ctx.fillStyle = '#1f2937'
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.25, 0, TAU)
    ctx.fill()
    ctx.rotate(aim)
    const n = tier === 3 ? 2 : 1
    const bw = s * (0.14 + tier * 0.025)
    const bl = s * (0.36 + tier * 0.05)
    const rec = recoil * s * 0.12
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * bw * 1.15
      ctx.fillStyle = '#111827'
      ctx.beginPath()
      ctx.roundRect(-s * 0.05 - rec, off - bw / 2, bl, bw, bw * 0.3)
      ctx.fill()
      ctx.fillStyle = '#4b5563'
      ctx.fillRect(-s * 0.05 - rec, off - bw / 2 + 1, bl, bw * 0.25)
      ctx.fillStyle = tier === 3 ? '#fbbf24' : '#6b7280'
      ctx.fillRect(bl - s * 0.12 - rec, off - bw / 2 - 1, s * 0.06, bw + 2)
    }
    ctx.restore()
    ctx.fillStyle = '#374151'
    ctx.beginPath()
    ctx.arc(x, y - s * 0.04, s * 0.15, 0, TAU)
    ctx.fill()
    ctx.fillStyle = gem
    ctx.beginPath()
    ctx.arc(x - s * 0.03, y - s * 0.07, s * 0.06, 0, TAU)
    ctx.fill()
  } else if (kind === 'frost') {
    ctx.fillStyle = '#1e3a5f'
    ctx.beginPath()
    ctx.ellipse(x, y + s * 0.05, s * 0.26, s * 0.17, 0, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = '#7dd3fc'
    ctx.lineWidth = 1.5
    ctx.stroke()
    const glowR = s * (0.4 + tier * 0.08)
    const gg = ctx.createRadialGradient(x, y - s * 0.15, 0, x, y - s * 0.15, glowR)
    gg.addColorStop(0, 'rgba(125,211,252,0.45)')
    gg.addColorStop(1, 'rgba(125,211,252,0)')
    ctx.fillStyle = gg
    ctx.beginPath()
    ctx.arc(x, y - s * 0.15, glowR, 0, TAU)
    ctx.fill()
    const bob = Math.sin(t * 2.2) * s * 0.035
    if (tier >= 2) {
      crystal(ctx, x - s * 0.18, y + s * 0.02, s * 0.09)
      crystal(ctx, x + s * 0.18, y + s * 0.02, s * 0.09)
    }
    crystal(ctx, x, y - s * 0.08 + bob, s * (0.15 + tier * 0.03))
    if (tier === 3) {
      for (let i = 0; i < 3; i++) {
        const a = t * 1.6 + (i / 3) * TAU
        crystal(ctx, x + Math.cos(a) * s * 0.34, y - s * 0.12 + Math.sin(a) * s * 0.14, s * 0.05)
      }
    }
  } else {
    // tesla coil
    const top = y - s * (0.28 + tier * 0.04)
    ctx.fillStyle = '#292524'
    ctx.beginPath()
    ctx.ellipse(x, y + s * 0.08, s * 0.22, s * 0.13, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#57534e'
    ctx.fillRect(x - s * 0.05, top, s * 0.1, y + s * 0.08 - top)
    const rings = tier + 2
    for (let i = 0; i < rings; i++) {
      const ry = y + s * 0.02 - (i * (y + s * 0.02 - top - s * 0.06)) / rings
      const rw = s * (0.17 - i * 0.015)
      ctx.fillStyle = '#92400e'
      ctx.beginPath()
      ctx.ellipse(x, ry + 1.5, rw, rw * 0.38, 0, 0, TAU)
      ctx.fill()
      ctx.fillStyle = i % 2 ? '#f59e0b' : '#d97706'
      ctx.beginPath()
      ctx.ellipse(x, ry, rw, rw * 0.38, 0, 0, TAU)
      ctx.fill()
    }
    const sr = s * (0.1 + tier * 0.025)
    const pulse = 1 + Math.sin(t * 9) * 0.08
    const g = ctx.createRadialGradient(x, top, 0, x, top, sr * 2.6 * pulse)
    g.addColorStop(0, 'rgba(165,243,252,0.6)')
    g.addColorStop(1, 'rgba(34,211,238,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, top, sr * 2.6 * pulse, 0, TAU)
    ctx.fill()
    const sg = ctx.createRadialGradient(x - sr * 0.3, top - sr * 0.3, 0, x, top, sr)
    sg.addColorStop(0, '#ffffff')
    sg.addColorStop(0.5, '#67e8f9')
    sg.addColorStop(1, '#0e7490')
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.arc(x, top, sr, 0, TAU)
    ctx.fill()
    if (tier === 3) {
      ctx.strokeStyle = 'rgba(165,243,252,0.7)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(x, top, sr * 1.8, sr * 0.6, t * 0.8, 0, TAU)
      ctx.stroke()
    }
    if (Math.floor(t * 12) % 4 === 0) {
      ctx.strokeStyle = '#e0f2fe'
      ctx.lineWidth = 1.2
      const a = t * 37
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a) * sr, top + Math.sin(a) * sr)
      ctx.lineTo(x + Math.cos(a + 0.4) * sr * 1.8, top + Math.sin(a + 0.4) * sr * 1.8)
      ctx.lineTo(x + Math.cos(a) * sr * 2.4, top + Math.sin(a) * sr * 2.4)
      ctx.stroke()
    }
  }
  // tier pips
  for (let i = 0; i < tier; i++) {
    ctx.fillStyle = '#fde68a'
    ctx.beginPath()
    ctx.arc(x + (i - (tier - 1) / 2) * s * 0.13, y + s * 0.36, s * 0.045, 0, TAU)
    ctx.fill()
  }
}

// ── Enemies ─────────────────────────────────────────────────

export const ENEMY_R: Record<EnemyKind, number> = { grunt: 0.24, runner: 0.2, tank: 0.31, flyer: 0.22, healer: 0.24, boss: 0.5 }
export const ENEMY_COLOR: Record<EnemyKind, string> = {
  grunt: '#84cc16',
  runner: '#f87171',
  tank: '#9ca3af',
  flyer: '#c084fc',
  healer: '#4ade80',
  boss: '#e11d48',
}

function eyes(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pupil = '#111', white = '#fff', angry = false) {
  for (const ex of [x - r * 0.32, x + r * 0.18]) {
    ctx.fillStyle = white
    ctx.beginPath()
    ctx.arc(ex, y, r * 0.2, 0, TAU)
    ctx.fill()
    ctx.fillStyle = pupil
    ctx.beginPath()
    ctx.arc(ex + r * 0.07, y + r * 0.02, r * 0.1, 0, TAU)
    ctx.fill()
  }
  if (angry) {
    ctx.strokeStyle = '#111'
    ctx.lineWidth = Math.max(1.5, r * 0.09)
    ctx.beginPath()
    ctx.moveTo(x - r * 0.55, y - r * 0.3)
    ctx.lineTo(x - r * 0.15, y - r * 0.18)
    ctx.moveTo(x + r * 0.42, y - r * 0.3)
    ctx.lineTo(x + r * 0.02, y - r * 0.18)
    ctx.stroke()
  }
}

/** Enemy facing right in local space; `face` mirrors it. */
export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  kind: EnemyKind,
  x: number,
  y: number,
  s: number,
  ph: number,
  face: number,
  flash: number,
  slowed: boolean,
) {
  const r = s * ENEMY_R[kind]
  const fly = kind === 'flyer'
  shadow(ctx, x, y + r * 0.8, r * (fly ? 0.7 : 1), r * 0.35, fly ? 0.18 : 0.3)
  if (slowed) {
    ctx.strokeStyle = 'rgba(125,211,252,0.85)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.8, r * 1.1, r * 0.4, 0, 0, TAU)
    ctx.stroke()
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(face, 1)
  const step = Math.sin(ph * 9)
  const bob = -Math.abs(step) * r * 0.14
  if (kind === 'grunt' || kind === 'runner') {
    const body = kind === 'grunt' ? '#65a30d' : '#dc2626'
    const light = kind === 'grunt' ? '#a3e635' : '#fca5a5'
    const dark = kind === 'grunt' ? '#365314' : '#7f1d1d'
    if (kind === 'runner') {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      ctx.lineWidth = 1.5
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(-r * 1.2, -r * 0.4 + i * r * 0.4)
        ctx.lineTo(-r * (1.9 + (i % 2) * 0.4), -r * 0.4 + i * r * 0.4)
        ctx.stroke()
      }
      ctx.rotate(0.22)
    }
    ctx.fillStyle = dark
    ctx.beginPath()
    ctx.ellipse(-r * 0.4 + step * r * 0.25, r * 0.78, r * 0.26, r * 0.16, 0, 0, TAU)
    ctx.ellipse(r * 0.4 - step * r * 0.25, r * 0.78, r * 0.26, r * 0.16, 0, 0, TAU)
    ctx.fill()
    ctx.translate(0, bob)
    // ears or horns
    ctx.fillStyle = kind === 'grunt' ? body : '#fef3c7'
    ctx.beginPath()
    if (kind === 'grunt') {
      ctx.moveTo(-r * 0.7, -r * 0.3)
      ctx.lineTo(-r * 1.35, -r * 0.65)
      ctx.lineTo(-r * 0.75, -r * 0.0)
      ctx.moveTo(r * 0.7, -r * 0.3)
      ctx.lineTo(r * 1.3, -r * 0.7)
      ctx.lineTo(r * 0.8, -r * 0.0)
    } else {
      ctx.moveTo(-r * 0.35, -r * 0.75)
      ctx.lineTo(-r * 0.5, -r * 1.35)
      ctx.lineTo(-r * 0.1, -r * 0.85)
      ctx.moveTo(r * 0.25, -r * 0.8)
      ctx.lineTo(r * 0.45, -r * 1.4)
      ctx.lineTo(r * 0.55, -r * 0.7)
    }
    ctx.fill()
    ctx.fillStyle = flash > 0 ? '#fff' : body
    ctx.beginPath()
    ctx.ellipse(0, 0, r, r * 0.92, 0, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = dark
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = light
    ctx.beginPath()
    ctx.ellipse(-r * 0.3, -r * 0.45, r * 0.4, r * 0.22, -0.4, 0, TAU)
    ctx.fill()
    if (kind === 'grunt') {
      ctx.fillStyle = '#78350f'
      ctx.beginPath()
      ctx.ellipse(0, r * 0.55, r * 0.85, r * 0.3, 0, 0, Math.PI)
      ctx.fill()
    }
    eyes(ctx, r * 0.2, -r * 0.12, r, '#111', kind === 'runner' ? '#fde047' : '#fff', kind === 'runner')
    ctx.fillStyle = '#1c1917'
    ctx.beginPath()
    ctx.ellipse(r * 0.25, r * 0.35, r * 0.25, r * 0.1, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillRect(r * 0.12, r * 0.27, r * 0.09, r * 0.09)
  } else if (kind === 'tank') {
    ctx.fillStyle = '#1f2937'
    for (const lx of [-r * 0.5, r * 0.5]) {
      ctx.beginPath()
      ctx.roundRect(lx - r * 0.22 + (lx > 0 ? -step : step) * r * 0.12, r * 0.45, r * 0.44, r * 0.45, r * 0.12)
      ctx.fill()
    }
    ctx.translate(0, bob * 0.5)
    ctx.fillStyle = flash > 0 ? '#fff' : '#6b7280'
    ctx.beginPath()
    ctx.moveTo(-r, r * 0.55)
    ctx.lineTo(-r, -r * 0.1)
    ctx.arc(0, -r * 0.1, r, Math.PI, 0)
    ctx.lineTo(r, r * 0.55)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#d1d5db'
    ctx.beginPath()
    ctx.ellipse(-r * 0.35, -r * 0.6, r * 0.35, r * 0.18, -0.5, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#4b5563'
    ctx.fillRect(-r, r * 0.12, r * 2, r * 0.16)
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.roundRect(-r * 0.2, -r * 0.3, r * 1.0, r * 0.26, r * 0.1)
    ctx.fill()
    ctx.fillStyle = '#fb923c'
    ctx.fillRect(r * 0.05, -r * 0.24, r * 0.18, r * 0.14)
    ctx.fillRect(r * 0.45, -r * 0.24, r * 0.18, r * 0.14)
    ctx.fillStyle = '#e5e7eb'
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.arc(-r * 0.8 + i * r * 0.4, r * 0.2, r * 0.05, 0, TAU)
      ctx.fill()
    }
  } else if (kind === 'flyer') {
    ctx.translate(0, -s * 0.32 + Math.sin(ph * 4) * r * 0.2)
    const flap = Math.sin(ph * 16)
    ctx.fillStyle = flash > 0 ? '#fff' : '#6b21a8'
    for (const sx of [-1, 1]) {
      ctx.save()
      ctx.scale(sx, 0.4 + Math.abs(flap) * 0.8 * (flap > 0 ? 1 : 0.6))
      ctx.beginPath()
      ctx.moveTo(r * 0.3, 0)
      ctx.quadraticCurveTo(r * 1.2, -r * 1.4, r * 2.1, -r * 0.4)
      ctx.quadraticCurveTo(r * 1.7, -r * 0.1, r * 1.6, r * 0.3)
      ctx.quadraticCurveTo(r * 1.2, 0, r * 1.0, r * 0.35)
      ctx.quadraticCurveTo(r * 0.7, r * 0.1, r * 0.3, r * 0.3)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = flash > 0 ? '#fff' : '#a855f7'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.75, 0, TAU)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-r * 0.5, -r * 0.45)
    ctx.lineTo(-r * 0.35, -r * 1.05)
    ctx.lineTo(-r * 0.1, -r * 0.6)
    ctx.moveTo(r * 0.5, -r * 0.45)
    ctx.lineTo(r * 0.35, -r * 1.05)
    ctx.lineTo(r * 0.1, -r * 0.6)
    ctx.fill()
    ctx.fillStyle = '#e9d5ff'
    ctx.beginPath()
    ctx.ellipse(-r * 0.2, -r * 0.35, r * 0.25, r * 0.12, -0.5, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(-r * 0.05, -r * 0.05, r * 0.15, 0, TAU)
    ctx.arc(r * 0.35, -r * 0.05, r * 0.15, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(r * 0.05, r * 0.3)
    ctx.lineTo(r * 0.12, r * 0.5)
    ctx.lineTo(r * 0.2, r * 0.3)
    ctx.fill()
  } else if (kind === 'healer') {
    ctx.translate(0, bob * 0.6)
    // staff
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = Math.max(2, r * 0.14)
    ctx.beginPath()
    ctx.moveTo(r * 0.8, r * 0.85)
    ctx.lineTo(r * 0.8, -r * 1.1)
    ctx.stroke()
    const og = ctx.createRadialGradient(r * 0.8, -r * 1.25, 0, r * 0.8, -r * 1.25, r * 0.7)
    og.addColorStop(0, 'rgba(187,247,208,0.9)')
    og.addColorStop(1, 'rgba(74,222,128,0)')
    ctx.fillStyle = og
    ctx.beginPath()
    ctx.arc(r * 0.8, -r * 1.25, r * 0.7, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#4ade80'
    ctx.beginPath()
    ctx.arc(r * 0.8, -r * 1.25, r * 0.22, 0, TAU)
    ctx.fill()
    // robe
    ctx.fillStyle = flash > 0 ? '#fff' : '#e2e8f0'
    ctx.beginPath()
    ctx.moveTo(-r * 0.85, r * 0.9)
    ctx.lineTo(-r * 0.45, -r * 0.4)
    ctx.lineTo(r * 0.45, -r * 0.4)
    ctx.lineTo(r * 0.85, r * 0.9)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#16a34a'
    ctx.fillRect(-r * 0.12, -r * 0.3, r * 0.24, r * 1.2)
    // hood
    ctx.fillStyle = flash > 0 ? '#fff' : '#15803d'
    ctx.beginPath()
    ctx.arc(0, -r * 0.55, r * 0.58, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#052e16'
    ctx.beginPath()
    ctx.arc(r * 0.12, -r * 0.5, r * 0.38, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#bbf7d0'
    ctx.beginPath()
    ctx.arc(r * 0.0, -r * 0.52, r * 0.08, 0, TAU)
    ctx.arc(r * 0.26, -r * 0.52, r * 0.08, 0, TAU)
    ctx.fill()
  } else {
    // boss ogre
    const breathe = 1 + Math.sin(ph * 2.5) * 0.03
    ctx.scale(breathe, 2 - breathe)
    ctx.fillStyle = '#4c0519'
    ctx.beginPath()
    ctx.ellipse(-r * 0.45 + step * r * 0.15, r * 0.85, r * 0.3, r * 0.18, 0, 0, TAU)
    ctx.ellipse(r * 0.45 - step * r * 0.15, r * 0.85, r * 0.3, r * 0.18, 0, 0, TAU)
    ctx.fill()
    ctx.translate(0, bob * 0.4)
    ctx.fillStyle = flash > 0 ? '#fff' : '#9f1239'
    for (const sx of [-1, 1]) {
      ctx.beginPath()
      ctx.arc(sx * r * 0.95, r * 0.25 + (sx > 0 ? step : -step) * r * 0.1, r * 0.3, 0, TAU)
      ctx.fill()
    }
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 0.9, r * 0.85, 0, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = '#4c0519'
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.fillStyle = '#fda4af'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.35, r * 0.5, r * 0.38, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#fecdd3'
    ctx.beginPath()
    ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.3, r * 0.15, -0.5, 0, TAU)
    ctx.fill()
    // horns
    ctx.fillStyle = '#fef3c7'
    ctx.beginPath()
    ctx.moveTo(-r * 0.55, -r * 0.6)
    ctx.quadraticCurveTo(-r * 1.1, -r * 0.9, -r * 0.9, -r * 1.35)
    ctx.quadraticCurveTo(-r * 0.6, -r * 0.95, -r * 0.3, -r * 0.8)
    ctx.moveTo(r * 0.55, -r * 0.6)
    ctx.quadraticCurveTo(r * 1.1, -r * 0.9, r * 0.9, -r * 1.35)
    ctx.quadraticCurveTo(r * 0.6, -r * 0.95, r * 0.3, -r * 0.8)
    ctx.fill()
    // crown
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.moveTo(-r * 0.32, -r * 0.78)
    ctx.lineTo(-r * 0.36, -r * 1.12)
    ctx.lineTo(-r * 0.16, -r * 0.95)
    ctx.lineTo(0, -r * 1.2)
    ctx.lineTo(r * 0.16, -r * 0.95)
    ctx.lineTo(r * 0.36, -r * 1.12)
    ctx.lineTo(r * 0.32, -r * 0.78)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#22d3ee'
    ctx.beginPath()
    ctx.arc(0, -r * 0.9, r * 0.06, 0, TAU)
    ctx.fill()
    eyes(ctx, r * 0.1, -r * 0.25, r * 0.9, '#7f1d1d', '#fef08a', true)
    ctx.fillStyle = '#3f0712'
    ctx.beginPath()
    ctx.ellipse(r * 0.05, r * 0.15, r * 0.35, r * 0.12, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(-r * 0.22, r * 0.1)
    ctx.lineTo(-r * 0.16, -r * 0.08)
    ctx.lineTo(-r * 0.1, r * 0.1)
    ctx.moveTo(r * 0.2, r * 0.1)
    ctx.lineTo(r * 0.26, -r * 0.08)
    ctx.lineTo(r * 0.32, r * 0.1)
    ctx.fill()
  }
  ctx.restore()
}

/** Small stand-alone icons for the build menu. */
export function drawMenuIcon(ctx: CanvasRenderingContext2D, kind: TowerKind | 'up' | 'sell', x: number, y: number, s: number, t: number) {
  if (kind === 'up') {
    ctx.fillStyle = '#fde68a'
    ctx.beginPath()
    ctx.moveTo(x, y - s * 0.32)
    ctx.lineTo(x + s * 0.26, y)
    ctx.lineTo(x + s * 0.1, y)
    ctx.lineTo(x + s * 0.1, y + s * 0.28)
    ctx.lineTo(x - s * 0.1, y + s * 0.28)
    ctx.lineTo(x - s * 0.1, y)
    ctx.lineTo(x - s * 0.26, y)
    ctx.closePath()
    ctx.fill()
    return
  }
  if (kind === 'sell') {
    ctx.fillStyle = '#b45309'
    ctx.beginPath()
    ctx.arc(x, y + 1.5, s * 0.26, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(x, y, s * 0.26, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = '#b45309'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, s * 0.16, 0, TAU)
    ctx.stroke()
    return
  }
  ctx.save()
  ctx.translate(x, y + s * 0.06)
  ctx.scale(0.72, 0.72)
  drawTower(ctx, kind, 1, 0, 0, s, -Math.PI / 4, t, 0)
  ctx.restore()
}
