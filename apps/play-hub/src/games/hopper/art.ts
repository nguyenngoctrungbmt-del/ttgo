/** Road Hopper vector art: biomes, oblique boxes, vehicles, the frog and the eagle. */

export type Biome = {
  name: string
  grassA: string
  grassB: string
  obstacle: 'tree' | 'cactus' | 'pine' | 'lamp' | 'palm' | 'maple' | 'basalt' | 'crystal'
  canopy: string
  canopyDark: string
  trunk: string
  road: string
  roadLine: string
  water: string
  waterDeep: string
  gravel: string
  rock: string
  sky: string
  ambient: Ambient
}

export type Ambient = 'none' | 'dust' | 'snow' | 'rain' | 'fireflies' | 'leaves' | 'embers' | 'sparkle'

export const BIOMES: Biome[] = [
  { name: 'Meadow', grassA: '#8fd65a', grassB: '#84cc4f', obstacle: 'tree', canopy: '#4ade80', canopyDark: '#16a34a', trunk: '#92400e', road: '#4b5563', roadLine: '#f8fafc', water: '#38bdf8', waterDeep: '#0284c7', gravel: '#a8a29e', rock: '#9ca3af', sky: '#bae6fd', ambient: 'none' },
  { name: 'Desert', grassA: '#f5d68a', grassB: '#eccb74', obstacle: 'cactus', canopy: '#65a30d', canopyDark: '#3f6212', trunk: '#a16207', road: '#78716c', roadLine: '#fde68a', water: '#22d3ee', waterDeep: '#0891b2', gravel: '#d6d3d1', rock: '#d97706', sky: '#fde68a', ambient: 'dust' },
  { name: 'Snowfield', grassA: '#f1f5f9', grassB: '#e2e8f0', obstacle: 'pine', canopy: '#15803d', canopyDark: '#14532d', trunk: '#78350f', road: '#64748b', roadLine: '#e0f2fe', water: '#7dd3fc', waterDeep: '#0ea5e9', gravel: '#cbd5e1', rock: '#94a3b8', sky: '#e0f2fe', ambient: 'snow' },
  { name: 'Neon City', grassA: '#52525b', grassB: '#4b4b53', obstacle: 'lamp', canopy: '#f0abfc', canopyDark: '#a21caf', trunk: '#27272a', road: '#18181b', roadLine: '#22d3ee', water: '#1d4ed8', waterDeep: '#1e3a8a', gravel: '#3f3f46', rock: '#71717a', sky: '#312e81', ambient: 'rain' },
  { name: 'Volcano Ridge', grassA: '#6b4f45', grassB: '#5f453c', obstacle: 'basalt', canopy: '#f97316', canopyDark: '#7c2d12', trunk: '#292524', road: '#1c1917', roadLine: '#fb923c', water: '#0d9488', waterDeep: '#134e4a', gravel: '#57534e', rock: '#44403c', sky: '#7c2d12', ambient: 'embers' },
  { name: 'Jungle', grassA: '#65a30d', grassB: '#5b9a0b', obstacle: 'palm', canopy: '#22c55e', canopyDark: '#15803d', trunk: '#78350f', road: '#57534e', roadLine: '#fef08a', water: '#14b8a6', waterDeep: '#0f766e', gravel: '#a8a29e', rock: '#78716c', sky: '#bbf7d0', ambient: 'fireflies' },
  { name: 'Autumn Hills', grassA: '#e5a33a', grassB: '#d9962e', obstacle: 'maple', canopy: '#f97316', canopyDark: '#c2410c', trunk: '#7c2d12', road: '#57534e', roadLine: '#fff7ed', water: '#3b82f6', waterDeep: '#1d4ed8', gravel: '#a8a29e', rock: '#a8a29e', sky: '#fed7aa', ambient: 'leaves' },
  { name: 'Crystal Grotto', grassA: '#c4b5fd', grassB: '#b9a8fb', obstacle: 'crystal', canopy: '#67e8f9', canopyDark: '#0e7490', trunk: '#6d28d9', road: '#3b0764', roadLine: '#f0abfc', water: '#38bdf8', waterDeep: '#4338ca', gravel: '#a78bfa', rock: '#7c3aed', sky: '#ede9fe', ambient: 'sparkle' },
]

export const CAR_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#e2e8f0']

const shadeCache = new Map<string, string>()
export function shade(col: string, f: number): string {
  const q = Math.round(f * 20) / 20
  const key = `${col}|${q}`
  const hit = shadeCache.get(key)
  if (hit) return hit
  let r: number
  let g: number
  let b: number
  if (col.startsWith('rgb')) {
    ;[r, g, b] = col.replace(/[^0-9,]/g, '').split(',').map(Number)
  } else {
    const n = parseInt(col.slice(1), 16)
    r = (n >> 16) & 255
    g = (n >> 8) & 255
    b = n & 255
  }
  const out = `rgb(${Math.min(255, Math.round(r * q))},${Math.min(255, Math.round(g * q))},${Math.min(255, Math.round(b * q))})`
  shadeCache.set(key, out)
  return out
}

/** Oblique box: footprint centred at (cx, cy), w × d, spanning heights z0..h. Higher parts shift up-right. */
export function box(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, d: number, h: number, color: string, z0 = 0) {
  const k = 0.22
  const a = z0 * k
  const b = h * k
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  const y0 = cy - d / 2
  const y1 = cy + d / 2
  ctx.fillStyle = shade(color, 0.62)
  ctx.beginPath()
  ctx.moveTo(x1 + a, y1 - z0)
  ctx.lineTo(x1 + a, y0 - z0)
  ctx.lineTo(x1 + b, y0 - h)
  ctx.lineTo(x1 + b, y1 - h)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = shade(color, 0.78)
  ctx.beginPath()
  ctx.moveTo(x0 + a, y1 - z0)
  ctx.lineTo(x1 + a, y1 - z0)
  ctx.lineTo(x1 + b, y1 - h)
  ctx.lineTo(x0 + b, y1 - h)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = color
  ctx.fillRect(x0 + b, y0 - h, w, d)
}

export function shadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, a = 0.22) {
  ctx.fillStyle = `rgba(0,0,0,${a})`
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
}

export function drawObstacle(ctx: CanvasRenderingContext2D, b: Biome, kind: number, x: number, y: number, C: number, t: number) {
  shadow(ctx, x + C * 0.08, y + C * 0.14, C * 0.38, C * 0.16)
  if (kind === 2) {
    box(ctx, x, y + C * 0.05, C * 0.62, C * 0.5, C * 0.32, b.rock)
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(x - C * 0.2, y - C * 0.33, C * 0.3, C * 0.08)
    return
  }
  switch (b.obstacle) {
    case 'cactus': {
      box(ctx, x, y + C * 0.05, C * 0.22, C * 0.22, C * 0.85, b.canopy)
      box(ctx, x - C * 0.2, y + C * 0.02, C * 0.14, C * 0.14, C * 0.6, b.canopy, C * 0.3)
      box(ctx, x + C * 0.22, y + C * 0.06, C * 0.14, C * 0.14, C * 0.7, b.canopy, C * 0.42)
      ctx.fillStyle = '#f472b6'
      ctx.beginPath()
      ctx.arc(x + C * 0.06, y - C * 0.82, C * 0.07, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'pine': {
      box(ctx, x, y + C * 0.05, C * 0.16, C * 0.16, C * 0.28, b.trunk)
      for (let i = 0; i < 3; i++) {
        const s = 0.8 - i * 0.22
        const z0 = C * (0.22 + i * 0.28)
        box(ctx, x, y + C * 0.05, C * s, C * s * 0.7, z0 + C * 0.26, b.canopy, z0)
        box(ctx, x, y + C * 0.05, C * s * 0.7, C * s * 0.45, z0 + C * 0.3, '#f8fafc', z0 + C * 0.26)
      }
      break
    }
    case 'lamp': {
      box(ctx, x, y + C * 0.05, C * 0.1, C * 0.1, C * 0.95, b.trunk)
      box(ctx, x + C * 0.1, y - C * 0.02, C * 0.32, C * 0.14, C * 0.08, b.trunk)
      const f = 0.7 + Math.sin(t * 3 + x) * 0.15
      ctx.fillStyle = `rgba(250,232,255,${f})`
      ctx.beginPath()
      ctx.arc(x + C * 0.32, y - C * 0.98, C * 0.1, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = `rgba(240,171,252,${f * 0.25})`
      ctx.beginPath()
      ctx.ellipse(x + C * 0.25, y + C * 0.1, C * 0.4, C * 0.15, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'basalt': {
      // stacked hexagonal basalt columns with glowing lava seams
      box(ctx, x - C * 0.12, y + C * 0.08, C * 0.3, C * 0.3, C * 0.55, b.rock)
      box(ctx, x + C * 0.14, y + C * 0.02, C * 0.26, C * 0.26, C * 0.8, shade(b.rock, 1.15))
      box(ctx, x - C * 0.02, y - C * 0.06, C * 0.22, C * 0.22, C * 0.42, shade(b.rock, 0.9))
      const glow = 0.55 + Math.sin(t * 2.5 + x) * 0.25
      ctx.fillStyle = `rgba(251,146,60,${glow})`
      ctx.fillRect(x + C * 0.02 + C * 0.12, y - C * 0.6, C * 0.03, C * 0.4)
      ctx.fillRect(x - C * 0.18 + C * 0.1, y - C * 0.3, C * 0.16, C * 0.03)
      ctx.fillStyle = `rgba(254,215,170,${glow})`
      ctx.beginPath()
      ctx.arc(x + C * 0.32, y - C * 0.82, C * 0.05, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'crystal': {
      // cluster of faceted crystals
      const shards: [number, number, number, number, string][] = [
        [-0.18, 0.06, 0.16, 0.62, b.canopy],
        [0.12, 0.08, 0.2, 0.95, '#f0abfc'],
        [0.0, 0.14, 0.14, 0.45, '#a5f3fc'],
      ]
      for (const [ox, oy, wd, ht, col] of shards) {
        const bx = x + C * ox
        const by = y + C * oy
        const hw = C * wd * 0.5
        const top = by - C * ht
        ctx.fillStyle = shade(col, 0.7)
        ctx.beginPath()
        ctx.moveTo(bx - hw, by)
        ctx.lineTo(bx - hw * 0.8, top + C * 0.12)
        ctx.lineTo(bx + C * 0.04, top)
        ctx.lineTo(bx, by + 2)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.moveTo(bx, by + 2)
        ctx.lineTo(bx + C * 0.04, top)
        ctx.lineTo(bx + hw * 1.1, top + C * 0.14)
        ctx.lineTo(bx + hw, by)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.fillRect(bx + hw * 0.25, top + C * 0.12, 2, C * ht * 0.45)
      }
      const tw = Math.max(0, Math.sin(t * 3 + x * 0.3))
      if (tw > 0.7) {
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(x + C * 0.16, y - C * 0.78, C * 0.04 * tw, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'palm': {
      box(ctx, x, y + C * 0.05, C * 0.14, C * 0.14, C * 0.85, b.trunk)
      ctx.fillStyle = b.canopy
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + Math.sin(t + x) * 0.1
        ctx.beginPath()
        ctx.ellipse(x + C * 0.03 + Math.cos(a) * C * 0.22, y - C * 0.88 + Math.sin(a) * C * 0.1, C * 0.24, C * 0.08, a, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#854d0e'
      ctx.beginPath()
      ctx.arc(x + C * 0.05, y - C * 0.84, C * 0.06, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    default: {
      box(ctx, x, y + C * 0.05, C * 0.2, C * 0.18, C * 0.36, b.trunk)
      box(ctx, x, y + C * 0.04, C * 0.74, C * 0.58, C * 0.86, b.canopy, C * 0.3)
      box(ctx, x - C * 0.04, y + C * 0.02, C * 0.42, C * 0.34, C * 1.02, b.canopy, C * 0.86)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillRect(x - C * 0.2 + C * 0.2, y - C * 1.08, C * 0.2, C * 0.07)
      ctx.fillStyle = b.canopyDark
      ctx.fillRect(x + C * 0.08 + C * 0.19, y - C * 0.72, C * 0.12, C * 0.1)
    }
  }
}

export function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, dir: number, color: string, kind: 'car' | 'truck' | 'bus', C: number, t: number) {
  const L = len * C - C * 0.12
  shadow(ctx, x + C * 0.08, y + C * 0.2, L * 0.52, C * 0.2, 0.28)
  const bodyH = kind === 'car' ? C * 0.3 : C * 0.42
  if (kind === 'truck') {
    // trailer + cab
    box(ctx, x - dir * C * 0.3, y + C * 0.05, L - C * 0.7, C * 0.72, C * 0.72, '#e5e7eb')
    box(ctx, x + dir * (L / 2 - C * 0.32), y + C * 0.05, C * 0.6, C * 0.66, C * 0.52, color)
    ctx.fillStyle = '#bae6fd'
    ctx.fillRect(x + dir * (L / 2 - C * 0.16) - C * 0.06 + C * 0.12, y - C * 0.42, C * 0.12, C * 0.2)
  } else if (kind === 'bus') {
    box(ctx, x, y + C * 0.05, L, C * 0.7, C * 0.6, color)
    ctx.fillStyle = '#bae6fd'
    for (let i = 0; i < len * 2 - 1; i++) ctx.fillRect(x - L / 2 + C * 0.25 + i * C * 0.48, y - C * 0.15, C * 0.3, C * 0.14)
  } else {
    box(ctx, x, y + C * 0.06, L, C * 0.62, bodyH, color)
    const cx = x - dir * C * 0.08
    box(ctx, cx, y, L * 0.55, C * 0.48, bodyH + C * 0.22, shade(color, 1.12), bodyH)
    ctx.fillStyle = '#bae6fd'
    ctx.fillRect(cx - L * 0.22 + bodyH * 0.24, y + C * 0.24 - bodyH - C * 0.17, L * 0.44, C * 0.11)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(x - L / 2 + (bodyH + C * 0.06) * 0.22, y + C * 0.06 - C * 0.31 - bodyH, L * 0.9, 2)
  }
  // wheels on the front face
  ctx.fillStyle = '#111827'
  const wy = y + C * 0.28
  for (const k of [-0.32, 0.32]) {
    ctx.beginPath()
    ctx.arc(x + k * L, wy, C * 0.1, 0, Math.PI * 2)
    ctx.fill()
  }
  // headlights
  const hx = x + dir * (L / 2) + (dir > 0 ? C * 0.08 : 0)
  ctx.fillStyle = '#fef08a'
  ctx.fillRect(hx - C * 0.04, y + C * 0.18, C * 0.08, C * 0.08)
  if (Math.floor(t * 2) % 2 === 0 && kind !== 'car') {
    ctx.fillStyle = '#f97316'
    ctx.fillRect(x - dir * (L / 2) - C * 0.03, y + C * 0.12, C * 0.06, C * 0.06)
  }
}

export function drawTrain(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, dir: number, C: number) {
  const cars = Math.ceil(len / 2.5)
  for (let i = 0; i < cars; i++) {
    const cx = x - dir * (i * 2.5 - len / 2 + 1.25) * C
    shadow(ctx, cx + C * 0.08, y + C * 0.24, C * 1.2, C * 0.2, 0.3)
    box(ctx, cx, y + C * 0.06, C * 2.35, C * 0.78, C * 0.75, i === 0 ? '#dc2626' : '#f1f5f9')
    ctx.fillStyle = i === 0 ? '#fecaca' : '#1d4ed8'
    ctx.fillRect(cx - C * 1.1 + C * 0.2, y + C * 0.28 - C * 0.48, C * 2.1, C * 0.12)
    ctx.fillStyle = '#bae6fd'
    for (let k = 0; k < 3; k++) ctx.fillRect(cx - C * 0.85 + k * C * 0.7 + C * 0.2, y - C * 0.12, C * 0.36, C * 0.16)
  }
}

export function drawLog(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, C: number) {
  const L = len * C - C * 0.1
  box(ctx, x, y + C * 0.1, L, C * 0.6, C * 0.16, '#a16207')
  ctx.strokeStyle = 'rgba(66,32,6,0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 1; i < len * 2; i++) {
    const lx = x - L / 2 + (i * L) / (len * 2) + C * 0.05
    ctx.moveTo(lx, y - C * 0.17)
    ctx.lineTo(lx, y + C * 0.33)
  }
  ctx.stroke()
  ctx.fillStyle = '#fcd34d'
  ctx.beginPath()
  ctx.ellipse(x - L / 2 + C * 0.05, y + C * 0.08, C * 0.06, C * 0.26, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillRect(x - L / 2 - C * 0.05, y + C * 0.38, L + C * 0.1, 2)
}

export function drawLily(ctx: CanvasRenderingContext2D, x: number, y: number, C: number, t: number) {
  const b = Math.sin(t * 2 + x) * 1.2
  ctx.fillStyle = '#166534'
  ctx.beginPath()
  ctx.ellipse(x, y + 3 + b, C * 0.4, C * 0.28, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#22c55e'
  ctx.beginPath()
  ctx.moveTo(x, y + b)
  ctx.ellipse(x, y + b, C * 0.4, C * 0.28, 0, 0.3, Math.PI * 2 - 0.1)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f9a8d4'
  ctx.beginPath()
  ctx.arc(x - C * 0.14, y - C * 0.06 + b, C * 0.07, 0, Math.PI * 2)
  ctx.fill()
}

export function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, C: number, t: number) {
  const s = Math.abs(Math.cos(t * 3 + x * 0.05))
  const by = y - C * 0.35 + Math.sin(t * 4 + x) * 2
  shadow(ctx, x, y + C * 0.1, C * 0.16, C * 0.06, 0.18)
  ctx.fillStyle = '#b45309'
  ctx.beginPath()
  ctx.ellipse(x, by, C * 0.2 * Math.max(0.15, s), C * 0.2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.ellipse(x - 1, by - 1, C * 0.17 * Math.max(0.12, s), C * 0.17, 0, 0, Math.PI * 2)
  ctx.fill()
  if (s > 0.5) {
    ctx.fillStyle = '#fef9c3'
    ctx.fillRect(x - 2, by - C * 0.1, 3, C * 0.18)
  }
}

export type FrogPose = { z: number; squash: number; face: number; blink: boolean; flat: number; tint?: string }

/** Frog seen from the oblique camera; (x, y) = ground centre. face: 0 up, 1 right, 2 down, 3 left. */
export function drawFrog(ctx: CanvasRenderingContext2D, x: number, y: number, C: number, p: FrogPose) {
  shadow(ctx, x + C * 0.05, y + C * 0.12, C * 0.3 * (1 - p.z / (C * 2)), C * 0.12, 0.3)
  const sy = (1 - p.squash * 0.25) * (p.flat > 0 ? Math.max(0.15, 1 - p.flat) : 1)
  const sx = 1 + p.squash * 0.2 + (p.flat > 0 ? p.flat * 0.5 : 0)
  ctx.save()
  ctx.translate(x, y - p.z)
  ctx.scale(sx, sy)
  const body = p.tint ?? '#4ade80'
  // legs
  box(ctx, -C * 0.24, C * 0.12, C * 0.16, C * 0.14, C * 0.1, '#16a34a')
  box(ctx, C * 0.24, C * 0.12, C * 0.16, C * 0.14, C * 0.1, '#16a34a')
  box(ctx, 0, C * 0.04, C * 0.5, C * 0.46, C * 0.36, body)
  // belly
  ctx.fillStyle = '#d9f99d'
  ctx.fillRect(-C * 0.15 + C * 0.05, C * 0.12 - C * 0.22, C * 0.3, C * 0.14)
  // eyes on top
  const ex = p.face === 1 ? C * 0.06 : p.face === 3 ? -C * 0.06 : 0
  const ey = p.face === 0 ? -C * 0.04 : p.face === 2 ? C * 0.03 : 0
  for (const s of [-1, 1]) {
    const cx = s * C * 0.15 + C * 0.1 + ex * 0.5
    const cy = -C * 0.4 + ey * 0.5
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(cx, cy, C * 0.11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, cy - 1, C * 0.08, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111827'
    if (p.blink) ctx.fillRect(cx - C * 0.06, cy - 1, C * 0.12, 2)
    else {
      ctx.beginPath()
      ctx.arc(cx + ex, cy - 1 + ey, C * 0.04, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // cheeks + mouth on the front face
  if (p.face !== 0) {
    ctx.fillStyle = '#f9a8d4'
    ctx.beginPath()
    ctx.arc(-C * 0.14, C * 0.06, C * 0.04, 0, Math.PI * 2)
    ctx.arc(C * 0.22, C * 0.06, C * 0.04, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#14532d'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(C * 0.04, C * 0.02, C * 0.08, 0.3, Math.PI - 0.3)
    ctx.stroke()
  }
  ctx.restore()
}

export function drawEagle(ctx: CanvasRenderingContext2D, x: number, y: number, C: number, t: number, scale = 1) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  const flap = Math.sin(t * 16) * 0.5
  shadow(ctx, 0, C * 1.2, C * 0.9, C * 0.25, 0.25)
  ctx.fillStyle = '#44403c'
  for (const s of [-1, 1]) {
    ctx.save()
    ctx.scale(s, 1)
    ctx.rotate(flap)
    ctx.beginPath()
    ctx.moveTo(C * 0.15, 0)
    ctx.quadraticCurveTo(C * 0.8, -C * 0.5, C * 1.4, -C * 0.1)
    ctx.lineTo(C * 1.2, C * 0.05)
    ctx.lineTo(C * 1.25, C * 0.15)
    ctx.lineTo(C * 1.0, C * 0.15)
    ctx.quadraticCurveTo(C * 0.6, C * 0.25, C * 0.15, C * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = '#57534e'
  ctx.beginPath()
  ctx.ellipse(0, C * 0.1, C * 0.24, C * 0.42, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f5f5f4'
  ctx.beginPath()
  ctx.arc(0, -C * 0.28, C * 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(-C * 0.07, -C * 0.2)
  ctx.lineTo(C * 0.07, -C * 0.2)
  ctx.lineTo(0, -C * 0.05)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.arc(-C * 0.08, -C * 0.31, C * 0.035, 0, Math.PI * 2)
  ctx.arc(C * 0.08, -C * 0.31, C * 0.035, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-C * 0.15, -C * 0.4)
  ctx.lineTo(-C * 0.03, -C * 0.35)
  ctx.moveTo(C * 0.15, -C * 0.4)
  ctx.lineTo(C * 0.03, -C * 0.35)
  ctx.stroke()
  ctx.restore()
}
