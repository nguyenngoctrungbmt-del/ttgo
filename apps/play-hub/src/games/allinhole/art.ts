/** All in Hole object art. Each object is drawn around (0,0) = its floor contact point, radius R in px. */
import type { Kind } from './levels'

type G = CanvasRenderingContext2D

const HUES: Record<string, string[][]> = {
  ball: [['#fca5a5', '#ef4444', '#991b1b'], ['#93c5fd', '#3b82f6', '#1e3a8a'], ['#fde68a', '#f59e0b', '#92400e'], ['#86efac', '#22c55e', '#166534']],
  cube: [['#c4b5fd', '#8b5cf6', '#4c1d95'], ['#fdba74', '#f97316', '#9a3412'], ['#67e8f9', '#06b6d4', '#155e75'], ['#f9a8d4', '#ec4899', '#831843']],
  block: [['#fde047', '#eab308', '#854d0e'], ['#fca5a5', '#ef4444', '#7f1d1d'], ['#a5b4fc', '#6366f1', '#312e81'], ['#6ee7b7', '#10b981', '#064e3b']],
  gem: [['#a5f3fc', '#22d3ee', '#0e7490'], ['#f5d0fe', '#d946ef', '#86198f'], ['#bbf7d0', '#22c55e', '#14532d'], ['#fecaca', '#ef4444', '#7f1d1d']],
  can: [['#fecaca', '#dc2626', '#7f1d1d'], ['#bfdbfe', '#2563eb', '#1e3a8a'], ['#d9f99d', '#65a30d', '#365314'], ['#fef08a', '#ca8a04', '#713f12']],
}

function sphere(g: G, R: number, c: string[]) {
  const cy = -R
  const gr = g.createRadialGradient(-R * 0.35, cy - R * 0.4, R * 0.1, 0, cy, R)
  gr.addColorStop(0, c[0])
  gr.addColorStop(0.55, c[1])
  gr.addColorStop(1, c[2])
  g.fillStyle = gr
  g.beginPath()
  g.arc(0, cy, R, 0, Math.PI * 2)
  g.fill()
}

function gloss(g: G, x: number, y: number, rx: number, ry: number, a = 0.55) {
  g.fillStyle = `rgba(255,255,255,${a})`
  g.beginPath()
  g.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2)
  g.fill()
}

/** Box with a lighter top face (tilted view). */
function box(g: G, R: number, c: string[], h = 1.5) {
  const w = R * 1.6
  const top = R * 0.9
  const H = R * h
  g.fillStyle = c[2]
  g.beginPath()
  g.roundRect(-w / 2, -H, w, H, R * 0.12)
  g.fill()
  const fg = g.createLinearGradient(0, -H, 0, 0)
  fg.addColorStop(0, c[1])
  fg.addColorStop(1, c[2])
  g.fillStyle = fg
  g.beginPath()
  g.roundRect(-w / 2, -H + top * 0.5, w, H - top * 0.5, R * 0.12)
  g.fill()
  g.fillStyle = c[0]
  g.beginPath()
  g.roundRect(-w / 2, -H - top * 0.5, w, top, R * 0.14)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.fillRect(-w / 2 + R * 0.15, -H - top * 0.35, w * 0.5, R * 0.12)
}

export function drawObj(g: G, kind: Kind, R: number, hue: number) {
  g.lineJoin = 'round'
  g.lineCap = 'round'
  switch (kind) {
    case 'ball': {
      const c = HUES.ball[hue % 4]
      sphere(g, R, c)
      g.strokeStyle = 'rgba(255,255,255,0.75)'
      g.lineWidth = Math.max(1, R * 0.18)
      g.beginPath()
      g.ellipse(0, -R, R * 0.95, R * 0.32, -0.3, 0, Math.PI * 2)
      g.stroke()
      gloss(g, -R * 0.35, -R * 1.45, R * 0.28, R * 0.16)
      break
    }
    case 'apple': {
      sphere(g, R, ['#fca5a5', '#dc2626', '#7f1d1d'])
      g.strokeStyle = '#78350f'
      g.lineWidth = Math.max(1, R * 0.15)
      g.beginPath()
      g.moveTo(0, -R * 1.8)
      g.lineTo(R * 0.1, -R * 2.2)
      g.stroke()
      g.fillStyle = '#22c55e'
      g.beginPath()
      g.ellipse(R * 0.35, -R * 2.1, R * 0.32, R * 0.14, -0.4, 0, Math.PI * 2)
      g.fill()
      gloss(g, -R * 0.4, -R * 1.35, R * 0.22, R * 0.14)
      break
    }
    case 'orange': {
      sphere(g, R, ['#fed7aa', '#f97316', '#9a3412'])
      g.fillStyle = 'rgba(154,52,18,0.35)'
      for (let i = 0; i < 6; i++) {
        g.beginPath()
        g.arc(Math.cos(i * 1.7) * R * 0.5, -R + Math.sin(i * 2.3) * R * 0.5, R * 0.06, 0, Math.PI * 2)
        g.fill()
      }
      g.fillStyle = '#15803d'
      g.beginPath()
      g.arc(0, -R * 1.9, R * 0.16, 0, Math.PI * 2)
      g.fill()
      gloss(g, -R * 0.4, -R * 1.4, R * 0.22, R * 0.14)
      break
    }
    case 'melon': {
      sphere(g, R, ['#bbf7d0', '#16a34a', '#14532d'])
      g.strokeStyle = 'rgba(20,83,45,0.7)'
      g.lineWidth = Math.max(1, R * 0.12)
      for (let i = -2; i <= 2; i++) {
        g.beginPath()
        g.ellipse(i * R * 0.32, -R, R * 0.18, R * 0.95, 0, 0, Math.PI * 2)
        g.stroke()
      }
      gloss(g, -R * 0.4, -R * 1.45, R * 0.25, R * 0.14, 0.4)
      break
    }
    case 'cube':
      box(g, R, HUES.cube[hue % 4])
      break
    case 'block': {
      const c = HUES.block[hue % 4]
      box(g, R, c, 1.1)
      // toy-brick studs
      g.fillStyle = c[0]
      g.strokeStyle = c[2]
      g.lineWidth = 1
      for (const sx of [-0.4, 0.4]) {
        g.beginPath()
        g.ellipse(sx * R, -R * 1.2, R * 0.22, R * 0.12, 0, 0, Math.PI * 2)
        g.fill()
        g.stroke()
      }
      break
    }
    case 'dice': {
      box(g, R, ['#ffffff', '#e5e7eb', '#9ca3af'])
      g.fillStyle = '#1f2937'
      const pip = (x: number, y: number) => {
        g.beginPath()
        g.arc(x, y, Math.max(0.8, R * 0.12), 0, Math.PI * 2)
        g.fill()
      }
      pip(-R * 0.4, -R * 0.85)
      pip(0, -R * 0.55)
      pip(R * 0.4, -R * 0.25)
      pip(-R * 0.3, -R * 1.5)
      pip(R * 0.3, -R * 1.5)
      break
    }
    case 'donut': {
      const cy = -R * 0.5
      g.fillStyle = '#b45309'
      g.beginPath()
      g.ellipse(0, cy + R * 0.15, R, R * 0.6, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#f472b6'
      g.beginPath()
      g.ellipse(0, cy, R * 0.92, R * 0.52, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#78350f'
      g.beginPath()
      g.ellipse(0, cy, R * 0.3, R * 0.16, 0, 0, Math.PI * 2)
      g.fill()
      const cols = ['#fde047', '#60a5fa', '#ffffff', '#4ade80']
      for (let i = 0; i < 6; i++) {
        g.fillStyle = cols[i % 4]
        g.fillRect(Math.cos(i * 1.1) * R * 0.6 - 1, cy + Math.sin(i * 1.1) * R * 0.32 - 1, Math.max(1.5, R * 0.14), Math.max(1, R * 0.07))
      }
      break
    }
    case 'duck': {
      g.fillStyle = '#facc15'
      g.beginPath()
      g.ellipse(0, -R * 0.6, R, R * 0.6, 0, 0, Math.PI * 2)
      g.fill()
      g.beginPath()
      g.arc(-R * 0.35, -R * 1.35, R * 0.48, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#f97316'
      g.beginPath()
      g.ellipse(-R * 0.85, -R * 1.28, R * 0.28, R * 0.12, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#1f2937'
      g.beginPath()
      g.arc(-R * 0.48, -R * 1.45, Math.max(0.8, R * 0.09), 0, Math.PI * 2)
      g.fill()
      g.fillStyle = 'rgba(202,138,4,0.8)'
      g.beginPath()
      g.ellipse(R * 0.2, -R * 0.65, R * 0.45, R * 0.25, -0.3, 0, Math.PI * 2)
      g.fill()
      gloss(g, -R * 0.45, -R * 1.62, R * 0.15, R * 0.08, 0.7)
      break
    }
    case 'gem': {
      const c = HUES.gem[hue % 4]
      const top = -R * 1.9
      g.fillStyle = c[2]
      g.beginPath()
      g.moveTo(-R, -R * 1.2)
      g.lineTo(0, 0)
      g.lineTo(R, -R * 1.2)
      g.closePath()
      g.fill()
      g.fillStyle = c[1]
      g.beginPath()
      g.moveTo(-R * 0.4, -R * 1.2)
      g.lineTo(0, 0)
      g.lineTo(R * 0.4, -R * 1.2)
      g.closePath()
      g.fill()
      g.fillStyle = c[0]
      g.beginPath()
      g.moveTo(-R, -R * 1.2)
      g.lineTo(-R * 0.55, top)
      g.lineTo(R * 0.55, top)
      g.lineTo(R, -R * 1.2)
      g.closePath()
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.6)'
      g.beginPath()
      g.moveTo(-R * 0.45, top + R * 0.1)
      g.lineTo(-R * 0.1, top + R * 0.1)
      g.lineTo(-R * 0.5, -R * 1.25)
      g.closePath()
      g.fill()
      break
    }
    case 'can': {
      const c = HUES.can[hue % 4]
      const w = R * 1.3
      const H = R * 2.1
      const fg = g.createLinearGradient(-w / 2, 0, w / 2, 0)
      fg.addColorStop(0, c[2])
      fg.addColorStop(0.45, c[0])
      fg.addColorStop(1, c[2])
      g.fillStyle = fg
      g.beginPath()
      g.ellipse(0, 0, w / 2, R * 0.35, 0, 0, Math.PI)
      g.lineTo(-w / 2, -H)
      g.lineTo(w / 2, -H)
      g.closePath()
      g.fill()
      g.fillRect(-w / 2, -H, w, H)
      g.fillStyle = '#f8fafc'
      g.fillRect(-w / 2, -H * 0.62, w, H * 0.22)
      g.fillStyle = '#cbd5e1'
      g.beginPath()
      g.ellipse(0, -H, w / 2, R * 0.35, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#94a3b8'
      g.beginPath()
      g.ellipse(0, -H, w / 3, R * 0.2, 0, 0, Math.PI * 2)
      g.fill()
      break
    }
    case 'cookie': {
      const cy = -R * 0.35
      g.fillStyle = '#92400e'
      g.beginPath()
      g.ellipse(0, cy + R * 0.12, R, R * 0.62, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#f59e0b'
      g.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        const rr = i % 2 ? R * 0.78 : R
        g.lineTo(Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.6)
      }
      g.closePath()
      g.fill()
      g.fillStyle = '#451a03'
      for (const [x, y] of [[-0.35, -0.1], [0.3, 0.1], [0.05, -0.3], [-0.1, 0.25]]) {
        g.beginPath()
        g.arc(x * R, cy + y * R, Math.max(0.8, R * 0.1), 0, Math.PI * 2)
        g.fill()
      }
      break
    }
    case 'bomb': {
      sphere(g, R, ['#64748b', '#1e293b', '#020617'])
      g.fillStyle = '#ef4444'
      g.beginPath()
      g.ellipse(0, -R, R * 0.45, R * 0.12, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#475569'
      g.fillRect(-R * 0.25, -R * 2.15, R * 0.5, R * 0.3)
      g.strokeStyle = '#a16207'
      g.lineWidth = Math.max(1, R * 0.14)
      g.beginPath()
      g.moveTo(0, -R * 2.15)
      g.quadraticCurveTo(R * 0.3, -R * 2.6, R * 0.6, -R * 2.45)
      g.stroke()
      gloss(g, -R * 0.4, -R * 1.45, R * 0.22, R * 0.13, 0.4)
      break
    }
  }
}

const cache = new Map<string, HTMLCanvasElement>()

/** Cached sprite. Sprite box is 6R wide × 6R tall, contact point at (3R, 4.5R). */
export function objSprite(kind: Kind, R: number, hue: number) {
  const rr = Math.max(3, Math.round(R * 2) / 2)
  const key = `${kind}|${rr}|${hue}`
  const hit = cache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const c = document.createElement('canvas')
  c.width = Math.ceil(rr * 6 * dpr)
  c.height = Math.ceil(rr * 6 * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate(rr * 3, rr * 4.5)
  drawObj(g, kind, rr, hue)
  cache.set(key, c)
  if (cache.size > 400) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return c
}

export const BIOMES = [
  { name: 'Kitchen', floor: ['#f5deb3', '#e7c48f'], line: 'rgba(146,98,48,0.18)', edge: '#8b5a2b', bg: ['#fde68a', '#f59e0b'], wall: ['#fef3c7', '#d6a65c', '#92400e'] },
  { name: 'Garden', floor: ['#86efac', '#4ade80'], line: 'rgba(21,128,61,0.2)', edge: '#166534', bg: ['#7dd3fc', '#0ea5e9'], wall: ['#fef9c3', '#a3a3a3', '#525252'] },
  { name: 'Plaza', floor: ['#e2e8f0', '#cbd5e1'], line: 'rgba(71,85,105,0.22)', edge: '#475569', bg: ['#c4b5fd', '#7c3aed'], wall: ['#fecaca', '#f87171', '#991b1b'] },
  { name: 'Beach', floor: ['#fde68a', '#fcd34d'], line: 'rgba(180,83,9,0.16)', edge: '#b45309', bg: ['#67e8f9', '#0891b2'], wall: ['#bae6fd', '#38bdf8', '#075985'] },
]
