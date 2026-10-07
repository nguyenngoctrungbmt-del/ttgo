/** Vector building sprites for Merge Town, cached per tier and size. */

export const TIER_NAMES = ['Tent', 'Hut', 'Cottage', 'House', 'Villa', 'Tower', 'Castle', 'Palace', 'Skyscraper', 'Monument']
export const CRANE = 10
export const DOZER = 11
export const ROCK = 12

const cache = new Map<string, HTMLCanvasElement>()

type G = CanvasRenderingContext2D

function shade(g: G, x: number, y: number, _w: number, h: number, top: string, bottom: string) {
  const gr = g.createLinearGradient(x, y, x, y + h)
  gr.addColorStop(0, top)
  gr.addColorStop(1, bottom)
  g.fillStyle = gr
}

function box(g: G, x: number, y: number, w: number, h: number, top: string, bottom: string, r = 2) {
  shade(g, x, y, w, h, top, bottom)
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  g.fill()
}

function roof(g: G, x: number, y: number, w: number, h: number, c1: string, c2: string, over = 0.08) {
  shade(g, x, y, w, h, c1, c2)
  g.beginPath()
  g.moveTo(x - w * over, y + h)
  g.lineTo(x + w / 2, y)
  g.lineTo(x + w + w * over, y + h)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.22)'
  g.beginPath()
  g.moveTo(x - w * over, y + h)
  g.lineTo(x + w / 2, y)
  g.lineTo(x + w * 0.56, y + h * 0.12)
  g.lineTo(x + w * 0.1, y + h)
  g.closePath()
  g.fill()
}

function win(g: G, x: number, y: number, w: number, h: number, lit = true) {
  g.fillStyle = '#334155'
  g.fillRect(x - 1, y - 1, w + 2, h + 2)
  g.fillStyle = lit ? '#fde68a' : '#7dd3fc'
  g.fillRect(x, y, w, h)
  g.fillStyle = 'rgba(255,255,255,0.55)'
  g.fillRect(x, y, w * 0.35, h)
}

function door(g: G, x: number, y: number, w: number, h: number) {
  g.fillStyle = '#7c2d12'
  g.beginPath()
  g.moveTo(x, y + h)
  g.lineTo(x, y + w / 2)
  g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0)
  g.lineTo(x + w, y + h)
  g.closePath()
  g.fill()
  g.fillStyle = '#fde047'
  g.beginPath()
  g.arc(x + w * 0.75, y + h * 0.6, Math.max(0.8, w * 0.08), 0, Math.PI * 2)
  g.fill()
}

function flag(g: G, x: number, y: number, s: number, c: string) {
  g.strokeStyle = '#475569'
  g.lineWidth = Math.max(1, s * 0.12)
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x, y - s)
  g.stroke()
  g.fillStyle = c
  g.beginPath()
  g.moveTo(x, y - s)
  g.lineTo(x + s * 0.7, y - s * 0.82)
  g.lineTo(x, y - s * 0.62)
  g.closePath()
  g.fill()
}

function drawTier(g: G, tier: number, s: number) {
  const u = s / 100
  const base = 90 * u
  // soft ground shadow
  g.fillStyle = 'rgba(0,0,0,0.22)'
  g.beginPath()
  g.ellipse(50 * u, base, 38 * u, 7 * u, 0, 0, Math.PI * 2)
  g.fill()
  switch (tier) {
    case 0: {
      // striped canvas tent
      shade(g, 18 * u, 40 * u, 64 * u, 50 * u, '#f87171', '#b91c1c')
      g.beginPath()
      g.moveTo(14 * u, base)
      g.lineTo(50 * u, 36 * u)
      g.lineTo(86 * u, base)
      g.closePath()
      g.fill()
      g.fillStyle = '#fef2f2'
      for (const k of [0.33, 0.66]) {
        g.beginPath()
        g.moveTo(50 * u, 36 * u)
        g.lineTo((14 + 72 * k - 5) * u, base)
        g.lineTo((14 + 72 * k + 5) * u, base)
        g.closePath()
        g.fill()
      }
      g.fillStyle = '#450a0a'
      g.beginPath()
      g.moveTo(42 * u, base)
      g.lineTo(50 * u, 62 * u)
      g.lineTo(58 * u, base)
      g.closePath()
      g.fill()
      g.strokeStyle = '#78350f'
      g.lineWidth = 2.2 * u
      g.beginPath()
      g.moveTo(50 * u, 36 * u)
      g.lineTo(50 * u, 26 * u)
      g.stroke()
      flag(g, 50 * u, 30 * u, 10 * u, '#facc15')
      break
    }
    case 1: {
      // wooden hut with straw roof
      box(g, 24 * u, 54 * u, 52 * u, 36 * u, '#b45309', '#78350f', 2 * u)
      g.strokeStyle = 'rgba(0,0,0,0.25)'
      g.lineWidth = 1.2 * u
      for (let y = 62; y < 90; y += 8) {
        g.beginPath()
        g.moveTo(24 * u, y * u)
        g.lineTo(76 * u, y * u)
        g.stroke()
      }
      roof(g, 20 * u, 26 * u, 60 * u, 32 * u, '#fde68a', '#ca8a04', 0.1)
      door(g, 44 * u, 66 * u, 12 * u, 24 * u)
      break
    }
    case 2: {
      // cottage: cream walls, red roof, chimney
      box(g, 66 * u, 26 * u, 8 * u, 20 * u, '#b45309', '#7c2d12', 1)
      box(g, 22 * u, 52 * u, 56 * u, 38 * u, '#fef3c7', '#fcd34d', 2 * u)
      roof(g, 20 * u, 22 * u, 60 * u, 34 * u, '#f87171', '#b91c1c')
      win(g, 28 * u, 62 * u, 12 * u, 10 * u)
      door(g, 52 * u, 64 * u, 14 * u, 26 * u)
      break
    }
    case 3: {
      // two-storey blue house
      box(g, 18 * u, 40 * u, 64 * u, 50 * u, '#93c5fd', '#2563eb', 2 * u)
      roof(g, 14 * u, 12 * u, 72 * u, 32 * u, '#64748b', '#1e293b')
      win(g, 26 * u, 48 * u, 12 * u, 12 * u)
      win(g, 62 * u, 48 * u, 12 * u, 12 * u)
      win(g, 26 * u, 68 * u, 12 * u, 12 * u)
      door(g, 56 * u, 66 * u, 16 * u, 24 * u)
      g.fillStyle = '#16a34a'
      g.beginPath()
      g.arc(14 * u, 84 * u, 7 * u, 0, Math.PI * 2)
      g.arc(86 * u, 84 * u, 7 * u, 0, Math.PI * 2)
      g.fill()
      break
    }
    case 4: {
      // villa: wide white, terracotta roof, balcony, palm
      box(g, 10 * u, 46 * u, 80 * u, 44 * u, '#ffffff', '#e2e8f0', 3 * u)
      shade(g, 6 * u, 30 * u, 88 * u, 18 * u, '#fb923c', '#c2410c')
      g.beginPath()
      g.moveTo(4 * u, 48 * u)
      g.lineTo(18 * u, 30 * u)
      g.lineTo(82 * u, 30 * u)
      g.lineTo(96 * u, 48 * u)
      g.closePath()
      g.fill()
      win(g, 16 * u, 54 * u, 14 * u, 12 * u)
      win(g, 70 * u, 54 * u, 14 * u, 12 * u)
      win(g, 43 * u, 54 * u, 14 * u, 12 * u)
      g.fillStyle = '#0ea5e9'
      g.fillRect(14 * u, 72 * u, 22 * u, 6 * u)
      door(g, 44 * u, 70 * u, 14 * u, 20 * u)
      win(g, 66 * u, 72 * u, 18 * u, 10 * u, false)
      g.strokeStyle = '#94a3b8'
      g.lineWidth = 1.5 * u
      g.beginPath()
      g.moveTo(40 * u, 68 * u)
      g.lineTo(62 * u, 68 * u)
      g.stroke()
      break
    }
    case 5: {
      // stone tower with cone roof
      box(g, 32 * u, 30 * u, 36 * u, 60 * u, '#cbd5e1', '#64748b', 3 * u)
      g.strokeStyle = 'rgba(30,41,59,0.3)'
      g.lineWidth = 1.2 * u
      for (let y = 40; y < 90; y += 10) {
        g.beginPath()
        g.moveTo(32 * u, y * u)
        g.lineTo(68 * u, y * u)
        g.stroke()
      }
      roof(g, 28 * u, 4 * u, 44 * u, 28 * u, '#a78bfa', '#5b21b6', 0.05)
      flag(g, 50 * u, 6 * u, 12 * u, '#ef4444')
      win(g, 44 * u, 40 * u, 12 * u, 14 * u)
      door(g, 43 * u, 70 * u, 14 * u, 20 * u)
      break
    }
    case 6: {
      // castle: keep + two turrets
      box(g, 22 * u, 44 * u, 56 * u, 46 * u, '#e2e8f0', '#94a3b8', 2 * u)
      for (const x of [8, 70]) {
        box(g, x * u, 30 * u, 22 * u, 60 * u, '#cbd5e1', '#64748b', 2 * u)
        roof(g, (x - 2) * u, 12 * u, 26 * u, 20 * u, '#60a5fa', '#1d4ed8', 0.04)
        win(g, (x + 7) * u, 46 * u, 8 * u, 10 * u)
      }
      g.fillStyle = '#e2e8f0'
      for (let x = 24; x < 76; x += 10) g.fillRect(x * u, 38 * u, 6 * u, 7 * u)
      door(g, 40 * u, 62 * u, 20 * u, 28 * u)
      flag(g, 19 * u, 14 * u, 10 * u, '#facc15')
      flag(g, 81 * u, 14 * u, 10 * u, '#facc15')
      break
    }
    case 7: {
      // palace: gold domes
      box(g, 10 * u, 52 * u, 80 * u, 38 * u, '#fef9c3', '#fcd34d', 2 * u)
      for (const [x, r] of [[24, 11], [76, 11], [50, 17]] as const) {
        box(g, (x - r * 0.7) * u, (52 - r) * u, r * 1.4 * u, (r + 2) * u, '#fde68a', '#ca8a04', 1)
        const gr = g.createRadialGradient((x - r * 0.3) * u, (40 - r) * u, 1, x * u, (44 - r) * u, r * u * 1.2)
        gr.addColorStop(0, '#fef08a')
        gr.addColorStop(1, '#d97706')
        g.fillStyle = gr
        g.beginPath()
        g.arc(x * u, (52 - r) * u, r * 0.95 * u, Math.PI, 0)
        g.quadraticCurveTo((x + r * 0.5) * u, (52 - r * 2.1) * u, x * u, (52 - r * 2.4) * u)
        g.quadraticCurveTo((x - r * 0.5) * u, (52 - r * 2.1) * u, (x - r * 0.95) * u, (52 - r) * u)
        g.fill()
      }
      for (let x = 16; x < 86; x += 14) win(g, x * u, 60 * u, 8 * u, 12 * u)
      door(g, 43 * u, 72 * u, 14 * u, 18 * u)
      break
    }
    case 8: {
      // glass skyscraper
      box(g, 30 * u, 6 * u, 40 * u, 84 * u, '#7dd3fc', '#1e40af', 2 * u)
      box(g, 18 * u, 40 * u, 16 * u, 50 * u, '#bae6fd', '#3b82f6', 1)
      box(g, 66 * u, 30 * u, 16 * u, 60 * u, '#bae6fd', '#3b82f6', 1)
      g.fillStyle = 'rgba(254,240,138,0.85)'
      for (let y = 12; y < 86; y += 8)
        for (let x = 34; x < 66; x += 8) if ((x * 7 + y * 3) % 5 !== 0) g.fillRect(x * u, y * u, 5 * u, 4 * u)
      g.fillStyle = 'rgba(255,255,255,0.35)'
      g.fillRect(32 * u, 8 * u, 6 * u, 80 * u)
      g.strokeStyle = '#94a3b8'
      g.lineWidth = 1.5 * u
      g.beginPath()
      g.moveTo(50 * u, 6 * u)
      g.lineTo(50 * u, -2 * u)
      g.stroke()
      g.fillStyle = '#ef4444'
      g.beginPath()
      g.arc(50 * u, -2 * u, 2 * u, 0, Math.PI * 2)
      g.fill()
      break
    }
    case 9: {
      // golden monument with star
      box(g, 22 * u, 74 * u, 56 * u, 16 * u, '#e2e8f0', '#64748b', 2 * u)
      shade(g, 36 * u, 14 * u, 28 * u, 62 * u, '#fef08a', '#b45309')
      g.beginPath()
      g.moveTo(38 * u, 76 * u)
      g.lineTo(44 * u, 22 * u)
      g.lineTo(56 * u, 22 * u)
      g.lineTo(62 * u, 76 * u)
      g.closePath()
      g.fill()
      g.fillStyle = '#facc15'
      g.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const r = (i % 2 ? 6 : 14) * u
        g.lineTo(50 * u + Math.cos(a) * r, 14 * u + Math.sin(a) * r)
      }
      g.closePath()
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.5)'
      g.fillRect(45 * u, 26 * u, 3 * u, 46 * u)
      break
    }
    case CRANE: {
      g.strokeStyle = '#ca8a04'
      g.lineWidth = 3 * u
      g.fillStyle = '#facc15'
      g.fillRect(40 * u, 20 * u, 10 * u, 70 * u)
      g.beginPath()
      for (let y = 24; y < 88; y += 10) {
        g.moveTo(40 * u, y * u)
        g.lineTo(50 * u, (y + 10) * u)
      }
      g.stroke()
      g.fillRect(14 * u, 16 * u, 74 * u, 8 * u)
      g.fillStyle = '#334155'
      g.fillRect(14 * u, 24 * u, 12 * u, 10 * u)
      g.strokeStyle = '#1e293b'
      g.lineWidth = 1.5 * u
      g.beginPath()
      g.moveTo(80 * u, 24 * u)
      g.lineTo(80 * u, 56 * u)
      g.stroke()
      box(g, 72 * u, 56 * u, 16 * u, 12 * u, '#fb923c', '#c2410c', 2 * u)
      box(g, 30 * u, 82 * u, 30 * u, 8 * u, '#475569', '#1e293b', 2 * u)
      break
    }
    case DOZER: {
      box(g, 22 * u, 50 * u, 52 * u, 24 * u, '#facc15', '#ca8a04', 4 * u)
      box(g, 40 * u, 32 * u, 24 * u, 20 * u, '#fde047', '#eab308', 3 * u)
      win(g, 45 * u, 36 * u, 14 * u, 10 * u, false)
      g.fillStyle = '#1f2937'
      g.beginPath()
      g.roundRect(20 * u, 72 * u, 58 * u, 16 * u, 8 * u)
      g.fill()
      g.fillStyle = '#6b7280'
      for (const x of [28, 42, 56, 70]) {
        g.beginPath()
        g.arc(x * u, 80 * u, 5 * u, 0, Math.PI * 2)
        g.fill()
      }
      g.fillStyle = '#9ca3af'
      g.beginPath()
      g.moveTo(80 * u, 46 * u)
      g.quadraticCurveTo(92 * u, 66 * u, 82 * u, 88 * u)
      g.lineTo(76 * u, 88 * u)
      g.lineTo(76 * u, 46 * u)
      g.closePath()
      g.fill()
      break
    }
    case ROCK: {
      for (const [x, y, r, c1, c2] of [
        [36, 74, 18, '#a8a29e', '#57534e'],
        [62, 76, 16, '#d6d3d1', '#78716c'],
        [50, 58, 15, '#a8a29e', '#44403c'],
      ] as const) {
        const gr = g.createRadialGradient((x - r * 0.4) * u, (y - r * 0.4) * u, 1, x * u, y * u, r * u)
        gr.addColorStop(0, c1)
        gr.addColorStop(1, c2)
        g.fillStyle = gr
        g.beginPath()
        g.moveTo((x - r) * u, (y + r * 0.5) * u)
        g.lineTo((x - r * 0.8) * u, (y - r * 0.5) * u)
        g.lineTo((x - r * 0.1) * u, (y - r) * u)
        g.lineTo((x + r * 0.8) * u, (y - r * 0.6) * u)
        g.lineTo((x + r) * u, (y + r * 0.5) * u)
        g.closePath()
        g.fill()
      }
      g.strokeStyle = 'rgba(28,25,23,0.5)'
      g.lineWidth = 1.4 * u
      g.beginPath()
      g.moveTo(44 * u, 52 * u)
      g.lineTo(50 * u, 62 * u)
      g.lineTo(47 * u, 70 * u)
      g.stroke()
      g.fillStyle = '#65a30d'
      g.beginPath()
      g.ellipse(70 * u, 88 * u, 8 * u, 3 * u, 0, 0, Math.PI * 2)
      g.fill()
      break
    }
  }
}

/** Grass plot texture with a few seasonal tufts, cached per season and size. */
export function plotSprite(season: number, size: number): HTMLCanvasElement {
  const px = Math.max(12, Math.round(size))
  const key = `plot-${season}-${px}`
  const hit = cache.get(key)
  if (hit) return hit
  const s = SEASONS[season % SEASONS.length]
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const c = document.createElement('canvas')
  c.width = px * dpr
  c.height = px * dpr
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  const gr = g.createLinearGradient(0, 0, 0, px)
  gr.addColorStop(0, s.grass)
  gr.addColorStop(1, s.grassDark)
  g.fillStyle = gr
  g.beginPath()
  g.roundRect(3, 3, px - 6, px - 6, px * 0.14)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.18)'
  g.fillRect(px * 0.18, 5, px * 0.64, 2)
  let seed = season * 31 + 7
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let i = 0; i < 5; i++) {
    const x = px * (0.18 + rnd() * 0.64)
    const y = px * (0.25 + rnd() * 0.55)
    if (s.name === 'Winter Peaks') {
      g.fillStyle = 'rgba(255,255,255,0.8)'
      g.beginPath()
      g.arc(x, y, 1.6, 0, Math.PI * 2)
      g.fill()
    } else if (i % 2 === 0) {
      g.fillStyle = ['#fde047', '#f9a8d4', '#ffffff'][i % 3]
      g.beginPath()
      g.arc(x, y, 1.6, 0, Math.PI * 2)
      g.fill()
    } else {
      g.strokeStyle = 'rgba(0,0,0,0.18)'
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(x - 2, y + 2)
      g.lineTo(x - 1, y - 2)
      g.moveTo(x + 1, y + 2)
      g.lineTo(x + 2, y - 2)
      g.stroke()
    }
  }
  cache.set(key, c)
  return c
}

export function buildingSprite(tier: number, size: number): HTMLCanvasElement {
  const px = Math.max(12, Math.round(size))
  const key = `${tier}-${px}`
  const hit = cache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const c = document.createElement('canvas')
  c.width = px * dpr
  c.height = px * dpr
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  drawTier(g, tier, px)
  cache.set(key, c)
  if (cache.size > 80) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return c
}

export const SEASONS = [
  { name: 'Spring Meadow', grass: '#4ade80', grassDark: '#16a34a', sky: '#bbf7d0', road: '#d6c7a1' },
  { name: 'Summer Coast', grass: '#a3e635', grassDark: '#65a30d', sky: '#bae6fd', road: '#fde68a' },
  { name: 'Autumn Hills', grass: '#fb923c', grassDark: '#c2410c', sky: '#fed7aa', road: '#d6b38a' },
  { name: 'Winter Peaks', grass: '#e0f2fe', grassDark: '#93c5fd', sky: '#cbd5e1', road: '#94a3b8' },
  { name: 'Desert Oasis', grass: '#fcd34d', grassDark: '#d97706', sky: '#fef3c7', road: '#e7c79a' },
  { name: 'Night City', grass: '#6366f1', grassDark: '#3730a3', sky: '#1e1b4b', road: '#475569' },
]
