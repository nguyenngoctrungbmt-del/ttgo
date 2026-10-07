/** Arena biomes that rotate in during long runs: cached ground layer + live ambient particles. */

export type AmbientKind = 'pollen' | 'sand' | 'snow' | 'ember'

export type Biome = {
  name: string
  sub: string
  accent: string
  mark: string
  ambient: AmbientKind
}

export const BIOMES: Biome[] = [
  { name: 'Green Arena', sub: 'back to the meadow', accent: '#a3e635', mark: '#1c1f14', ambient: 'pollen' },
  { name: 'Dune Sea', sub: 'sandstorm rolling in', accent: '#fcd34d', mark: '#6b4a1f', ambient: 'sand' },
  { name: 'Frostfield', sub: 'snow over the battlefield', accent: '#7dd3fc', mark: '#5b7186', ambient: 'snow' },
  { name: 'Ember Wastes', sub: 'lava vents erupt here', accent: '#fb923c', mark: '#0c0a09', ambient: 'ember' },
]

export const EMBER = 3

/** Waves 1-3 meadow, then a new zone every 4 waves, cycling. */
export function biomeForWave(wave: number) {
  if (wave < 4) return 0
  return (1 + Math.floor((wave - 4) / 4)) % BIOMES.length
}

function hash(i: number, k: number) {
  return ((i * k) % 997) / 997
}

function paintGrass(c: CanvasRenderingContext2D, W: number, H: number) {
  c.fillStyle = '#3f4a2c'
  c.fillRect(0, 0, W, H)
  checker(c, W, H, 'rgba(0,0,0,0.08)')
  for (let i = 0; i < 34; i++) {
    const gx = hash(i, 7919) * W
    const gy = (((i * 104729) % 991) / 991) * H
    if (i % 3 === 0) {
      c.fillStyle = 'rgba(30,35,20,0.45)'
      c.beginPath()
      c.ellipse(gx, gy + 2, 6, 3, 0, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#7c8466'
      c.beginPath()
      c.ellipse(gx, gy, 5, 3.5, 0, 0, Math.PI * 2)
      c.fill()
    } else {
      c.strokeStyle = i % 2 ? '#5d7a2a' : '#6f8f34'
      c.lineWidth = 2
      c.lineCap = 'round'
      c.beginPath()
      for (const k of [-1, 0, 1]) {
        c.moveTo(gx + k * 3, gy)
        c.lineTo(gx + k * 5, gy - 6 - (k === 0 ? 2 : 0))
      }
      c.stroke()
    }
  }
}

function checker(c: CanvasRenderingContext2D, W: number, H: number, color: string) {
  c.fillStyle = color
  const tile = 40
  for (let y = 0; y < H; y += tile) {
    for (let x = (y / tile) % 2 ? 0 : tile; x < W; x += tile * 2) c.fillRect(x, y, tile, tile)
  }
}

function paintDunes(c: CanvasRenderingContext2D, W: number, H: number) {
  const g = c.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#d6b07a')
  g.addColorStop(1, '#b98a52')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  checker(c, W, H, 'rgba(120,72,24,0.06)')
  // Wind ripples: light crest over a dark trough.
  c.lineCap = 'round'
  for (let i = 0; i < 22; i++) {
    const x = hash(i, 4271) * W - 30
    const y = hash(i, 6151) * H
    const len = 50 + hash(i, 337) * 70
    c.strokeStyle = 'rgba(120,72,24,0.22)'
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(x, y + 2)
    c.quadraticCurveTo(x + len / 2, y - 7, x + len, y + 2)
    c.stroke()
    c.strokeStyle = 'rgba(255,240,205,0.4)'
    c.lineWidth = 1.5
    c.beginPath()
    c.moveTo(x, y)
    c.quadraticCurveTo(x + len / 2, y - 9, x + len, y)
    c.stroke()
  }
  for (let i = 0; i < 14; i++) {
    const x = hash(i, 8123) * W
    const y = hash(i + 3, 5003) * H
    if (i % 2) {
      // Bleached rock
      c.fillStyle = 'rgba(80,50,20,0.3)'
      c.beginPath()
      c.ellipse(x + 2, y + 3, 9, 4, 0, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#e7d3b0'
      c.beginPath()
      c.moveTo(x - 8, y + 2)
      c.lineTo(x - 5, y - 5)
      c.lineTo(x + 3, y - 6)
      c.lineTo(x + 8, y + 1)
      c.closePath()
      c.fill()
      c.fillStyle = 'rgba(255,255,255,0.45)'
      c.fillRect(x - 4, y - 4, 5, 2)
    } else {
      // Little cactus
      c.fillStyle = 'rgba(80,50,20,0.3)'
      c.beginPath()
      c.ellipse(x + 3, y + 9, 8, 3, 0, 0, Math.PI * 2)
      c.fill()
      c.strokeStyle = '#3f7d3a'
      c.lineWidth = 5
      c.lineCap = 'round'
      c.beginPath()
      c.moveTo(x, y + 8)
      c.lineTo(x, y - 9)
      c.moveTo(x - 6, y)
      c.lineTo(x - 6, y - 5)
      c.moveTo(x - 6, y + 1)
      c.lineTo(x, y + 1)
      c.moveTo(x + 6, y - 2)
      c.lineTo(x + 6, y - 7)
      c.moveTo(x + 6, y - 1)
      c.lineTo(x, y - 1)
      c.stroke()
      c.strokeStyle = '#86c06c'
      c.lineWidth = 1.2
      c.beginPath()
      c.moveTo(x - 1, y + 6)
      c.lineTo(x - 1, y - 8)
      c.stroke()
    }
  }
}

function paintFrost(c: CanvasRenderingContext2D, W: number, H: number) {
  const g = c.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#d7e3ec')
  g.addColorStop(1, '#b6c8d6')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  checker(c, W, H, 'rgba(60,90,120,0.05)')
  // Frozen ponds with cracks and a glare streak.
  for (let i = 0; i < 5; i++) {
    const x = hash(i, 3571) * W
    const y = hash(i + 7, 2903) * H
    const rx = 30 + hash(i, 211) * 26
    const ry = rx * 0.6
    const ig = c.createRadialGradient(x - rx * 0.3, y - ry * 0.3, 2, x, y, rx)
    ig.addColorStop(0, '#e0f7ff')
    ig.addColorStop(1, '#8ccbe6')
    c.fillStyle = ig
    c.beginPath()
    c.ellipse(x, y, rx, ry, hash(i, 17) * 2, 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = 'rgba(255,255,255,0.8)'
    c.lineWidth = 1
    c.beginPath()
    c.moveTo(x - rx * 0.5, y - ry * 0.1)
    c.lineTo(x - rx * 0.1, y + ry * 0.2)
    c.lineTo(x + rx * 0.2, y - ry * 0.3)
    c.moveTo(x - rx * 0.1, y + ry * 0.2)
    c.lineTo(x + rx * 0.05, y + ry * 0.6)
    c.stroke()
    c.strokeStyle = 'rgba(255,255,255,0.7)'
    c.lineWidth = 3
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(x - rx * 0.55, y - ry * 0.45)
    c.lineTo(x - rx * 0.2, y - ry * 0.65)
    c.stroke()
  }
  for (let i = 0; i < 16; i++) {
    const x = hash(i, 6553) * W
    const y = hash(i + 11, 4441) * H
    if (i % 3 === 0) {
      // Snow-capped pine, top-down
      c.fillStyle = 'rgba(40,70,100,0.25)'
      c.beginPath()
      c.ellipse(x + 4, y + 5, 12, 7, 0, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#1f5141'
      star(c, x, y, 11, 5, 7)
      c.fillStyle = '#f8fafc'
      star(c, x - 1, y - 1, 6, 3, 7)
    } else {
      // Snow mound
      c.fillStyle = 'rgba(80,110,140,0.25)'
      c.beginPath()
      c.ellipse(x + 2, y + 3, 10, 5, 0, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#f8fafc'
      c.beginPath()
      c.ellipse(x, y, 9, 5, 0, 0, Math.PI * 2)
      c.fill()
    }
  }
}

function star(c: CanvasRenderingContext2D, x: number, y: number, ro: number, ri: number, n: number) {
  c.beginPath()
  for (let k = 0; k < n * 2; k++) {
    const a = (k / (n * 2)) * Math.PI * 2
    const r = k % 2 ? ri : ro
    if (k === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
  }
  c.closePath()
  c.fill()
}

let crackKey = ''
let crackCache: { x: number; y: number }[][] = []

/** Crack polylines are shared with the live glow pulse (cached per size). */
export function emberCracks(W: number, H: number) {
  const key = `${W}|${H}`
  if (key === crackKey) return crackCache
  const out: { x: number; y: number }[][] = []
  crackKey = key
  crackCache = out
  for (let i = 0; i < 7; i++) {
    let x = ((i + 0.2 + hash(i, 9001) * 0.6) / 7) * W
    let y = hash(i + 5, 7727) * H
    let a = hash(i, 131) * Math.PI * 2
    const pts = [{ x, y }]
    for (let k = 0; k < 5; k++) {
      a += (hash(i * 7 + k, 389) - 0.5) * 1.4
      x += Math.cos(a) * 22
      y += Math.sin(a) * 22
      pts.push({ x, y })
    }
    out.push(pts)
  }
  return out
}

function paintEmber(c: CanvasRenderingContext2D, W: number, H: number) {
  const g = c.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, Math.max(W, H) * 0.7)
  g.addColorStop(0, '#3a2620')
  g.addColorStop(1, '#1c1412')
  c.fillStyle = g
  c.fillRect(0, 0, W, H)
  checker(c, W, H, 'rgba(0,0,0,0.12)')
  c.lineCap = 'round'
  c.lineJoin = 'round'
  for (const pts of emberCracks(W, H)) {
    for (const [col, lw] of [['rgba(124,45,18,0.8)', 8], ['#ea580c', 3.5], ['#fde68a', 1]] as const) {
      c.strokeStyle = col
      c.lineWidth = lw
      c.beginPath()
      pts.forEach((p, k) => (k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)))
      c.stroke()
    }
  }
  // Obsidian rocks with a violet sheen.
  for (let i = 0; i < 14; i++) {
    const x = hash(i, 5113) * W
    const y = hash(i + 9, 3089) * H
    const s = 5 + hash(i, 71) * 6
    c.fillStyle = 'rgba(0,0,0,0.4)'
    c.beginPath()
    c.ellipse(x + 2, y + 3, s * 1.2, s * 0.6, 0, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = '#0c0a09'
    c.beginPath()
    c.moveTo(x - s, y + s * 0.4)
    c.lineTo(x - s * 0.6, y - s * 0.7)
    c.lineTo(x + s * 0.3, y - s)
    c.lineTo(x + s, y + s * 0.2)
    c.lineTo(x + s * 0.2, y + s * 0.7)
    c.closePath()
    c.fill()
    c.strokeStyle = 'rgba(167,139,250,0.55)'
    c.lineWidth = 1.2
    c.beginPath()
    c.moveTo(x - s * 0.6, y - s * 0.6)
    c.lineTo(x + s * 0.3, y - s * 0.9)
    c.stroke()
  }
  // Ash speckle
  c.fillStyle = 'rgba(168,162,158,0.18)'
  for (let i = 0; i < 60; i++) c.fillRect(hash(i, 2221) * W, hash(i + 2, 1871) * H, 2, 2)
}

const PAINTERS = [paintGrass, paintDunes, paintFrost, paintEmber]

const cache = new Map<string, HTMLCanvasElement>()

/** Static ground for a biome, rendered once per size into an offscreen canvas. */
export function biomeLayer(idx: number, W: number, H: number, dpr: number) {
  const key = `${idx}|${W}|${H}|${dpr}`
  let cv = cache.get(key)
  if (!cv) {
    if (cache.size > 8) cache.clear()
    cv = document.createElement('canvas')
    cv.width = Math.max(1, Math.round(W * dpr))
    cv.height = Math.max(1, Math.round(H * dpr))
    const c = cv.getContext('2d')
    if (c) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      PAINTERS[idx](c, W, H)
    }
    cache.set(key, cv)
  }
  return cv
}

export type Mote = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; ph: number }

const MAX_MOTES = 40

export function stepAmbient(motes: Mote[], kind: AmbientKind, W: number, H: number, dt: number) {
  const rate = kind === 'sand' ? 26 : kind === 'snow' ? 18 : kind === 'ember' ? 12 : 4
  let n = rate * dt
  while (n > 0 && motes.length < MAX_MOTES) {
    if (n < 1 && Math.random() > n) break
    n -= 1
    const m: Mote = { x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, life: 3, max: 3, size: 2, ph: Math.random() * 6 }
    if (kind === 'sand') {
      m.x = -10
      m.vx = 160 + Math.random() * 120
      m.vy = 10 + Math.random() * 20
      m.life = m.max = 2.4
      m.size = 1 + Math.random() * 1.5
    } else if (kind === 'snow') {
      m.y = -6
      m.vx = 12 + Math.random() * 14
      m.vy = 30 + Math.random() * 30
      m.life = m.max = H / m.vy + 1
      m.size = 1.2 + Math.random() * 2
    } else if (kind === 'ember') {
      m.vy = -24 - Math.random() * 30
      m.vx = (Math.random() - 0.5) * 16
      m.life = m.max = 1.6 + Math.random() * 1.4
      m.size = 1.2 + Math.random() * 1.6
    } else {
      m.vx = (Math.random() - 0.5) * 10
      m.vy = -4 - Math.random() * 6
      m.life = m.max = 3 + Math.random() * 2
      m.size = 1.2 + Math.random()
    }
    motes.push(m)
  }
  for (const m of motes) {
    m.ph += dt * 2
    m.x += (m.vx + (kind === 'snow' || kind === 'pollen' ? Math.sin(m.ph) * 12 : 0)) * dt
    m.y += m.vy * dt
    m.life -= dt
  }
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i]
    if (m.life <= 0 || m.x > W + 20 || m.y > H + 10) motes.splice(i, 1)
  }
}

export function drawAmbient(ctx: CanvasRenderingContext2D, motes: Mote[], kind: AmbientKind) {
  for (const m of motes) {
    const fade = Math.min(1, m.life / 0.6, (m.max - m.life) / 0.4)
    if (kind === 'sand') {
      ctx.globalAlpha = 0.55 * fade
      ctx.strokeStyle = '#fff1d0'
      ctx.lineWidth = m.size
      ctx.beginPath()
      ctx.moveTo(m.x, m.y)
      ctx.lineTo(m.x - m.vx * 0.06, m.y - m.vy * 0.06)
      ctx.stroke()
    } else if (kind === 'snow') {
      ctx.globalAlpha = 0.9 * fade
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2)
      ctx.fill()
    } else if (kind === 'ember') {
      ctx.globalAlpha = 0.35 * fade
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.size * 2.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = fade
      ctx.fillStyle = '#fde68a'
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.globalAlpha = 0.5 * fade * (0.6 + 0.4 * Math.sin(m.ph * 2))
      ctx.fillStyle = '#ecfccb'
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}
