/** Mech Survivor vector art: cached enemy sprites, gems, ground tiles and the hero mech. */
import { BIOMES, ENEMIES, type EnemyKind } from './defs'

const SCALE = 2
const sprites = new Map<string, HTMLCanvasElement>()

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w)
  c.height = Math.ceil(h)
  return c
}

function eye(g: CanvasRenderingContext2D, x: number, y: number, r: number, look = 0.3) {
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#0f172a'
  g.beginPath()
  g.arc(x + r * look, y, r * 0.55, 0, Math.PI * 2)
  g.fill()
}

function brow(g: CanvasRenderingContext2D, x: number, y: number, w: number, tilt: number) {
  g.strokeStyle = '#0f172a'
  g.lineWidth = Math.max(1.2, w * 0.25)
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x - w, y - tilt)
  g.lineTo(x + w, y + tilt)
  g.stroke()
}

/** Draws an enemy facing +x at the origin. */
function paintEnemy(g: CanvasRenderingContext2D, kind: EnemyKind, frame: number) {
  const d = ENEMIES[kind]
  const r = d.r
  const body = (rx: number, ry: number) => {
    const grad = g.createRadialGradient(-rx * 0.3, -ry * 0.4, 1, 0, 0, Math.max(rx, ry))
    grad.addColorStop(0, '#ffffff')
    grad.addColorStop(0.18, d.color)
    grad.addColorStop(1, d.dark)
    g.fillStyle = grad
    g.beginPath()
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = d.dark
    g.lineWidth = 1.5
    g.stroke()
  }
  switch (kind) {
    case 'drone': {
      const wing = frame ? 0.5 : 1
      g.fillStyle = 'rgba(226,232,240,0.75)'
      for (const s of [-1, 1]) {
        g.beginPath()
        g.ellipse(-2, s * r * 0.95, r * 0.75, r * 0.28 * wing, 0, 0, Math.PI * 2)
        g.fill()
      }
      body(r, r * 0.9)
      g.fillStyle = '#1e1b4b'
      g.beginPath()
      g.roundRect(r * 0.05, -r * 0.35, r * 0.8, r * 0.7, r * 0.3)
      g.fill()
      g.fillStyle = '#f43f5e'
      g.beginPath()
      g.arc(r * 0.5, 0, r * 0.22, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#fecdd3'
      g.beginPath()
      g.arc(r * 0.56, -r * 0.08, r * 0.08, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = d.dark
      g.lineWidth = 1.5
      g.beginPath()
      g.moveTo(-r * 0.5, -r * 0.6)
      g.lineTo(-r * 0.9, -r * 1.1)
      g.stroke()
      g.fillStyle = '#facc15'
      g.beginPath()
      g.arc(-r * 0.9, -r * 1.1, 2, 0, Math.PI * 2)
      g.fill()
      break
    }
    case 'crawler': {
      g.strokeStyle = d.dark
      g.lineWidth = 2
      g.lineCap = 'round'
      for (let i = 0; i < 3; i++) {
        const lx = -r * 0.5 + i * r * 0.5
        const sw = (i + frame) % 2 ? 0.35 : -0.35
        for (const s of [-1, 1]) {
          g.beginPath()
          g.moveTo(lx, s * r * 0.4)
          g.lineTo(lx + sw * r, s * r * 1.15)
          g.stroke()
        }
      }
      body(r * 1.15, r * 0.75)
      g.strokeStyle = 'rgba(54,83,20,0.6)'
      g.lineWidth = 1.2
      for (let i = 0; i < 2; i++) {
        g.beginPath()
        g.moveTo(-r * 0.6 + i * r * 0.45, -r * 0.65)
        g.lineTo(-r * 0.6 + i * r * 0.45, r * 0.65)
        g.stroke()
      }
      g.strokeStyle = d.dark
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(r * 1.05, -r * 0.25)
      g.quadraticCurveTo(r * 1.5, -r * 0.35, r * 1.45, r * 0.05)
      g.moveTo(r * 1.05, r * 0.25)
      g.quadraticCurveTo(r * 1.5, r * 0.35, r * 1.45, -r * 0.05)
      g.stroke()
      eye(g, r * 0.65, -r * 0.3, r * 0.22)
      eye(g, r * 0.65, r * 0.3, r * 0.22)
      break
    }
    case 'brute': {
      const step = frame ? 3 : -3
      g.fillStyle = d.dark
      g.beginPath()
      g.arc(r * 0.35 + step, -r * 0.95, r * 0.36, 0, Math.PI * 2)
      g.arc(r * 0.35 - step, r * 0.95, r * 0.36, 0, Math.PI * 2)
      g.fill()
      const grad = g.createLinearGradient(0, -r, 0, r)
      grad.addColorStop(0, '#fecaca')
      grad.addColorStop(0.25, d.color)
      grad.addColorStop(1, d.dark)
      g.fillStyle = grad
      g.beginPath()
      g.roundRect(-r * 0.9, -r * 0.85, r * 1.75, r * 1.7, r * 0.45)
      g.fill()
      g.strokeStyle = d.dark
      g.lineWidth = 2
      g.stroke()
      g.fillStyle = 'rgba(69,10,10,0.35)'
      g.fillRect(-r * 0.7, -r * 0.6, r * 0.4, r * 1.2)
      g.fillStyle = '#e2e8f0'
      for (const s of [-1, 1]) {
        g.beginPath()
        g.moveTo(r * 0.2, s * r * 0.75)
        g.lineTo(r * 0.75, s * r * 1.05)
        g.lineTo(r * 0.45, s * r * 0.6)
        g.closePath()
        g.fill()
      }
      eye(g, r * 0.55, -r * 0.25, r * 0.17, 0.4)
      eye(g, r * 0.55, r * 0.25, r * 0.17, 0.4)
      brow(g, r * 0.55, -r * 0.42, r * 0.2, -r * 0.08)
      brow(g, r * 0.55, r * 0.42, r * 0.2, r * 0.08)
      break
    }
    case 'spitter': {
      body(r * 1.05, r * 0.95)
      g.fillStyle = d.dark
      g.beginPath()
      g.roundRect(r * 0.55, -r * 0.28, r * 0.7, r * 0.56, r * 0.2)
      g.fill()
      g.fillStyle = '#042f2e'
      g.beginPath()
      g.arc(r * 1.22, 0, r * 0.2, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = d.dark
      g.lineWidth = 2
      for (const s of [-1, 1]) {
        g.beginPath()
        g.moveTo(0, s * r * 0.5)
        g.lineTo(-r * 0.2, s * r * (frame ? 1.25 : 1.1))
        g.stroke()
        eye(g, -r * 0.2, s * r * (frame ? 1.25 : 1.1), r * 0.2, 0.2)
      }
      g.fillStyle = 'rgba(255,255,255,0.35)'
      g.beginPath()
      g.arc(-r * 0.45, -r * 0.1, r * 0.18, 0, Math.PI * 2)
      g.arc(-r * 0.1, r * 0.35, r * 0.12, 0, Math.PI * 2)
      g.fill()
      break
    }
    case 'bomber': {
      body(r, r)
      g.fillStyle = '#1c1917'
      for (let i = -1; i <= 1; i++) {
        g.save()
        g.beginPath()
        g.arc(0, 0, r - 1, 0, Math.PI * 2)
        g.clip()
        g.translate(i * r * 0.6, 0)
        g.rotate(0.5)
        g.fillRect(-r * 0.12, -r * 1.5, r * 0.24, r * 3)
        g.restore()
      }
      g.fillStyle = '#44403c'
      g.fillRect(-r * 1.2, -r * 0.18, r * 0.4, r * 0.36)
      g.strokeStyle = '#a16207'
      g.lineWidth = 1.8
      g.beginPath()
      g.moveTo(-r * 1.2, 0)
      g.quadraticCurveTo(-r * 1.6, -r * 0.4, -r * 1.45, -r * 0.8)
      g.stroke()
      g.fillStyle = frame ? '#fde047' : '#f97316'
      g.beginPath()
      g.arc(-r * 1.45, -r * 0.8, frame ? 3 : 2.2, 0, Math.PI * 2)
      g.fill()
      eye(g, r * 0.45, -r * 0.3, r * 0.22, 0.4)
      eye(g, r * 0.45, r * 0.3, r * 0.22, 0.4)
      brow(g, r * 0.45, -r * 0.55, r * 0.22, -r * 0.08)
      brow(g, r * 0.45, r * 0.55, r * 0.22, r * 0.08)
      break
    }
    case 'bat': {
      const up = frame ? 1 : 0.35
      g.fillStyle = d.dark
      for (const s of [-1, 1]) {
        g.beginPath()
        g.moveTo(0, s * r * 0.3)
        g.quadraticCurveTo(-r * 0.6, s * r * 1.8 * up, -r * 1.2, s * r * 1.6 * up)
        g.quadraticCurveTo(-r * 0.6, s * r * 1.0 * up, -r * 0.4, s * r * 0.5)
        g.closePath()
        g.fill()
      }
      body(r, r * 0.75)
      eye(g, r * 0.45, -r * 0.25, r * 0.2, 0.4)
      eye(g, r * 0.45, r * 0.25, r * 0.2, 0.4)
      g.fillStyle = '#ffffff'
      g.beginPath()
      g.moveTo(r * 0.85, -r * 0.15)
      g.lineTo(r * 1.05, -r * 0.05)
      g.lineTo(r * 0.85, 0)
      g.fill()
      break
    }
    case 'mortar': {
      // Armored shell-back crab with a mortar tube on its back.
      g.fillStyle = d.dark
      for (let i = 0; i < 3; i++) {
        const lx = -r * 0.55 + i * r * 0.55
        const sw = (i + frame) % 2 ? 2.5 : -2.5
        for (const s of [-1, 1]) {
          g.beginPath()
          g.ellipse(lx + sw, s * r * 0.92, r * 0.2, r * 0.14, 0, 0, Math.PI * 2)
          g.fill()
        }
      }
      const sh = g.createRadialGradient(-r * 0.3, -r * 0.35, 1, 0, 0, r * 1.1)
      sh.addColorStop(0, '#fef3c7')
      sh.addColorStop(0.25, d.color)
      sh.addColorStop(1, d.dark)
      g.fillStyle = sh
      g.beginPath()
      g.ellipse(-r * 0.1, 0, r * 1.05, r * 0.85, 0, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = d.dark
      g.lineWidth = 1.8
      g.stroke()
      // Shell plates.
      g.strokeStyle = 'rgba(69,26,3,0.55)'
      g.lineWidth = 1.4
      g.beginPath()
      g.moveTo(-r * 0.75, -r * 0.45)
      g.lineTo(r * 0.5, -r * 0.45)
      g.moveTo(-r * 0.75, r * 0.45)
      g.lineTo(r * 0.5, r * 0.45)
      g.moveTo(-r * 0.15, -r * 0.8)
      g.lineTo(-r * 0.15, r * 0.8)
      g.stroke()
      // Tube.
      g.fillStyle = '#292524'
      g.beginPath()
      g.arc(-r * 0.25, 0, r * 0.42, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#57534e'
      g.beginPath()
      g.arc(-r * 0.25, 0, r * 0.32, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = frame ? '#f97316' : '#7c2d12'
      g.beginPath()
      g.arc(-r * 0.25, 0, r * 0.17, 0, Math.PI * 2)
      g.fill()
      // Face.
      g.fillStyle = d.dark
      g.beginPath()
      g.ellipse(r * 0.85, 0, r * 0.3, r * 0.42, 0, 0, Math.PI * 2)
      g.fill()
      eye(g, r * 0.95, -r * 0.2, r * 0.16, 0.45)
      eye(g, r * 0.95, r * 0.2, r * 0.16, 0.45)
      brow(g, r * 0.95, -r * 0.4, r * 0.16, -r * 0.06)
      brow(g, r * 0.95, r * 0.4, r * 0.16, r * 0.06)
      break
    }
    case 'linker': {
      // Hovering tesla pylon: coil rings around a glowing core and a single eye.
      g.fillStyle = 'rgba(56,189,248,0.25)'
      g.beginPath()
      g.arc(0, 0, r * 1.35, 0, Math.PI * 2)
      g.fill()
      for (const s of [-1, 1]) {
        g.fillStyle = '#334155'
        g.beginPath()
        g.moveTo(-r * 0.3, s * r * 0.6)
        g.lineTo(r * 0.3, s * r * 0.6)
        g.lineTo(0, s * r * (frame ? 1.45 : 1.3))
        g.closePath()
        g.fill()
      }
      body(r, r)
      g.strokeStyle = '#e0f2fe'
      g.lineWidth = 1.6
      g.beginPath()
      g.ellipse(0, 0, r * 0.95, r * 0.35, 0, 0, Math.PI * 2)
      g.stroke()
      g.strokeStyle = 'rgba(224,242,254,0.5)'
      g.beginPath()
      g.ellipse(0, 0, r * 0.35, r * 0.95, 0, 0, Math.PI * 2)
      g.stroke()
      g.fillStyle = '#0f172a'
      g.beginPath()
      g.arc(r * 0.3, 0, r * 0.42, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = frame ? '#ffffff' : '#7dd3fc'
      g.beginPath()
      g.arc(r * 0.42, 0, r * 0.22, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#0c4a6e'
      g.beginPath()
      g.arc(r * 0.5, 0, r * 0.1, 0, Math.PI * 2)
      g.fill()
      break
    }
    default:
      body(r, r)
  }
}

/** A small combat drone companion (world space). */
export function drawWingDrone(ctx: CanvasRenderingContext2D, x: number, y: number, aim: number, t: number, evolved: boolean) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(x + 2, y + 16, 8, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.save()
  ctx.translate(x, y)
  // Rotors.
  const spin = Math.abs(Math.sin(t * 40))
  ctx.fillStyle = 'rgba(226,232,240,0.6)'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(s * 9, -3, 6 * spin + 1.5, 1.6, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-9, -2)
  ctx.lineTo(9, -2)
  ctx.stroke()
  const g = ctx.createLinearGradient(0, -6, 0, 6)
  g.addColorStop(0, evolved ? '#fef9c3' : '#bbf7d0')
  g.addColorStop(0.5, evolved ? '#facc15' : '#4ade80')
  g.addColorStop(1, evolved ? '#854d0e' : '#14532d')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(-6, -5, 12, 10, 4)
  ctx.fill()
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(Math.cos(aim) * 2.5, Math.sin(aim) * 2 + 0.5, 2.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f0fdf4'
  ctx.beginPath()
  ctx.arc(Math.cos(aim) * 3.2, Math.sin(aim) * 2.5, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export type Mote = { x: number; y: number; vx: number; vy: number; s: number; ph: number }

/** Ambient biome particles: dust, sparks, spores, snow, embers, glints, void motes. */
export function drawMotes(ctx: CanvasRenderingContext2D, motes: Mote[], biome: number, t: number) {
  for (const p of motes) {
    const tw = 0.5 + Math.sin(t * 2 + p.ph) * 0.5
    if (biome === 0) {
      ctx.fillStyle = `rgba(254,243,199,${0.25 + tw * 0.25})`
      ctx.fillRect(p.x, p.y, p.s, p.s)
    } else if (biome === 1) {
      ctx.fillStyle = tw > 0.7 ? '#fde047' : 'rgba(251,191,36,0.5)'
      ctx.fillRect(p.x, p.y, p.s * 0.8, p.s * 0.8)
    } else if (biome === 2) {
      ctx.strokeStyle = `rgba(190,242,100,${0.3 + tw * 0.4})`
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.s * 1.2, 0, Math.PI * 2)
      ctx.stroke()
    } else if (biome === 3) {
      ctx.fillStyle = `rgba(255,255,255,${0.55 + tw * 0.4})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.s * 0.8, 0, Math.PI * 2)
      ctx.fill()
    } else if (biome === 4) {
      ctx.fillStyle = tw > 0.5 ? '#fdba74' : '#f97316'
      ctx.globalAlpha = 0.5 + tw * 0.5
      ctx.fillRect(p.x, p.y, p.s * 0.7, p.s * 0.7)
      ctx.globalAlpha = 1
    } else if (biome === 5) {
      // Crystal glints: four-point sparkles.
      const k = p.s * (0.6 + tw)
      ctx.fillStyle = `rgba(233,213,255,${0.3 + tw * 0.6})`
      ctx.beginPath()
      ctx.moveTo(p.x, p.y - k * 1.6)
      ctx.lineTo(p.x + k * 0.35, p.y)
      ctx.lineTo(p.x, p.y + k * 1.6)
      ctx.lineTo(p.x - k * 0.35, p.y)
      ctx.closePath()
      ctx.moveTo(p.x - k * 1.6, p.y)
      ctx.lineTo(p.x, p.y + k * 0.35)
      ctx.lineTo(p.x + k * 1.6, p.y)
      ctx.lineTo(p.x, p.y - k * 0.35)
      ctx.closePath()
      ctx.fill()
    } else {
      // Void motes: short cyan/violet streaks drifting upward.
      ctx.strokeStyle = p.ph > 3 ? `rgba(34,211,238,${0.3 + tw * 0.5})` : `rgba(167,139,250,${0.3 + tw * 0.5})`
      ctx.lineWidth = p.s * 0.6
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - p.vx * 0.12, p.y - p.vy * 0.12)
      ctx.stroke()
    }
  }
}

/** Velocity for a fresh ambient mote in a biome. */
export function moteVelocity(biome: number): [number, number] {
  if (biome === 3) return [-14 + Math.random() * 10, 26 + Math.random() * 20]
  if (biome === 4) return [-6 + Math.random() * 12, -30 - Math.random() * 30]
  if (biome === 2) return [-4 + Math.random() * 8, -14 - Math.random() * 10]
  if (biome === 6) return [-10 + Math.random() * 20, -60 - Math.random() * 40]
  if (biome === 5) return [0, -4]
  if (biome === 1) return [-20 + Math.random() * 40, 30 + Math.random() * 30]
  return [24 + Math.random() * 16, -4 + Math.random() * 8]
}

/** Cached enemy sprite (frame 0/1, optional white hit flash). */
export function enemySprite(kind: EnemyKind, frame: number, white: boolean) {
  const key = `${kind}|${frame}|${white}`
  let c = sprites.get(key)
  if (c) return c
  const r = ENEMIES[kind].r
  const size = (r * 2 + r * 1.6 + 8) * SCALE
  c = canvas(size, size)
  const g = c.getContext('2d')!
  g.translate(size / 2, size / 2)
  g.scale(SCALE, SCALE)
  paintEnemy(g, kind, frame)
  if (white) {
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'source-atop'
    g.fillStyle = 'rgba(255,255,255,0.85)'
    g.fillRect(0, 0, size, size)
  }
  sprites.set(key, c)
  return c
}

export function enemySpriteSize(kind: EnemyKind) {
  const r = ENEMIES[kind].r
  return r * 2 + r * 1.6 + 8
}

const GEM_COLORS: [number, string, string][] = [
  [25, '#f43f5e', '#881337'],
  [5, '#4ade80', '#14532d'],
  [0, '#38bdf8', '#0c4a6e'],
]

export function gemColor(v: number) {
  return GEM_COLORS.find(([min]) => v >= min)!
}

export function gemSprite(v: number) {
  const [min, col, dark] = gemColor(v)
  const key = `gem|${min}`
  let c = sprites.get(key)
  if (c) return c
  const s = 16 * SCALE
  c = canvas(s, s * 1.3)
  const g = c.getContext('2d')!
  g.scale(SCALE, SCALE)
  g.translate(8, 10)
  const h = min >= 25 ? 9 : min >= 5 ? 8 : 6.5
  const w = h * 0.7
  g.fillStyle = dark
  g.beginPath()
  g.moveTo(0, -h)
  g.lineTo(w, -h * 0.2)
  g.lineTo(0, h)
  g.lineTo(-w, -h * 0.2)
  g.closePath()
  g.fill()
  g.fillStyle = col
  g.beginPath()
  g.moveTo(0, -h + 1.2)
  g.lineTo(w - 1.2, -h * 0.2)
  g.lineTo(0, h - 1.6)
  g.lineTo(-w + 1.2, -h * 0.2)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.65)'
  g.beginPath()
  g.moveTo(0, -h + 1.5)
  g.lineTo(-w + 2, -h * 0.25)
  g.lineTo(0, -h * 0.05)
  g.closePath()
  g.fill()
  sprites.set(key, c)
  return c
}

const tiles = new Map<number, HTMLCanvasElement>()

/** 160px ground tile for a biome, used as a repeating pattern. */
export function groundTile(i: number) {
  let c = tiles.get(i)
  if (c) return c
  const b = BIOMES[i]
  const S = 160
  c = canvas(S, S)
  const g = c.getContext('2d')!
  g.fillStyle = b.ground
  g.fillRect(0, 0, S, S)
  // Soft mottling.
  let seed = 17 + i * 101
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (let k = 0; k < 26; k++) {
    g.fillStyle = k % 2 ? b.ground2 : 'rgba(255,255,255,0.05)'
    g.beginPath()
    g.ellipse(rnd() * S, rnd() * S, 6 + rnd() * 18, 4 + rnd() * 10, rnd() * 3, 0, Math.PI * 2)
    g.fill()
  }
  g.strokeStyle = b.line
  g.lineWidth = 1
  if (i === 1) {
    // Factory plates with rivets.
    for (let x = 0; x <= S; x += 40) {
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x, S)
      g.moveTo(0, x)
      g.lineTo(S, x)
      g.stroke()
    }
    g.fillStyle = 'rgba(15,23,42,0.35)'
    for (let x = 5; x < S; x += 40) for (let y = 5; y < S; y += 40) g.fillRect(x, y, 2, 2)
  } else if (i === 5) {
    // Crystal facets: diagonal fracture lattice with pale highlights.
    for (let k = -S; k <= S; k += 40) {
      g.beginPath()
      g.moveTo(k, 0)
      g.lineTo(k + S, S)
      g.moveTo(k + S, 0)
      g.lineTo(k, S)
      g.stroke()
    }
    g.fillStyle = 'rgba(196,181,253,0.12)'
    for (let k = 0; k < 6; k++) {
      const x = rnd() * S
      const y = rnd() * S
      g.beginPath()
      g.moveTo(x, y - 9)
      g.lineTo(x + 6, y)
      g.lineTo(x, y + 9)
      g.lineTo(x - 6, y)
      g.closePath()
      g.fill()
    }
  } else if (i === 6) {
    // Void grid: neon lines with node lights.
    for (let x = 0; x <= S; x += 32) {
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x, S)
      g.moveTo(0, x)
      g.lineTo(S, x)
      g.stroke()
    }
    g.fillStyle = 'rgba(34,211,238,0.45)'
    for (let x = 0; x <= S; x += 32) for (let y = 0; y <= S; y += 32) if (rnd() < 0.3) g.fillRect(x - 1.5, y - 1.5, 3, 3)
    g.fillStyle = 'rgba(255,255,255,0.5)'
    for (let k = 0; k < 14; k++) g.fillRect(rnd() * S, rnd() * S, 1, 1)
  } else {
    for (let k = 0; k < 10; k++) {
      g.beginPath()
      const x = rnd() * S
      const y = rnd() * S
      g.moveTo(x, y)
      g.lineTo(x + rnd() * 20 - 10, y + rnd() * 12)
      g.stroke()
    }
  }
  tiles.set(i, c)
  return c
}

function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295
}

/** Deterministic scenery (rocks, craters, pipes, crystals) in view. */
export function drawDecor(ctx: CanvasRenderingContext2D, biome: number, x0: number, y0: number, x1: number, y1: number, t: number) {
  const b = BIOMES[biome]
  const C = 170
  for (let cy = Math.floor(y0 / C); cy <= Math.floor(y1 / C); cy++) {
    for (let cx = Math.floor(x0 / C); cx <= Math.floor(x1 / C); cx++) {
      const h = hash(cx, cy)
      if (h > 0.55) continue
      const x = cx * C + hash(cx + 7, cy) * C
      const y = cy * C + hash(cx, cy + 11) * C
      const s = 10 + hash(cx + 3, cy + 5) * 18
      if (h < 0.18) {
        // Crater.
        ctx.fillStyle = 'rgba(0,0,0,0.18)'
        ctx.beginPath()
        ctx.ellipse(x, y, s * 1.4, s * 0.9, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.12)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(x, y + 1, s * 1.4, s * 0.9, 0, 0.2, Math.PI - 0.2)
        ctx.stroke()
        if (biome === 4) {
          ctx.fillStyle = `rgba(249,115,22,${0.45 + Math.sin(t * 3 + h * 20) * 0.2})`
          ctx.beginPath()
          ctx.ellipse(x, y, s * 0.9, s * 0.55, 0, 0, Math.PI * 2)
          ctx.fill()
        } else if (biome === 6) {
          ctx.strokeStyle = `rgba(34,211,238,${0.35 + Math.sin(t * 2 + h * 30) * 0.2})`
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.ellipse(x, y, s * 0.9, s * 0.55, 0, 0, Math.PI * 2)
          ctx.stroke()
          ctx.fillStyle = 'rgba(2,6,23,0.6)'
          ctx.beginPath()
          ctx.ellipse(x, y, s * 0.75, s * 0.45, 0, 0, Math.PI * 2)
          ctx.fill()
        } else if (biome === 5) {
          ctx.fillStyle = 'rgba(167,139,250,0.3)'
          ctx.beginPath()
          ctx.ellipse(x, y, s * 0.9, s * 0.55, 0, 0, Math.PI * 2)
          ctx.fill()
        } else if (biome === 2) {
          ctx.fillStyle = 'rgba(163,230,53,0.35)'
          ctx.beginPath()
          ctx.ellipse(x, y, s * 0.9, s * 0.55, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      } else if (h < 0.4) {
        // Rock cluster.
        ctx.fillStyle = 'rgba(0,0,0,0.22)'
        ctx.beginPath()
        ctx.ellipse(x + 4, y + 5, s, s * 0.6, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = b.rock
        ctx.beginPath()
        ctx.moveTo(x - s, y + s * 0.3)
        ctx.lineTo(x - s * 0.6, y - s * 0.6)
        ctx.lineTo(x + s * 0.3, y - s * 0.8)
        ctx.lineTo(x + s, y)
        ctx.lineTo(x + s * 0.5, y + s * 0.5)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = b.rock2
        ctx.beginPath()
        ctx.moveTo(x - s * 0.6, y - s * 0.6)
        ctx.lineTo(x + s * 0.3, y - s * 0.8)
        ctx.lineTo(x + s * 0.1, y - s * 0.1)
        ctx.lineTo(x - s * 0.5, y)
        ctx.closePath()
        ctx.fill()
      } else {
        // Biome detail: bolts, crystals, reeds.
        ctx.strokeStyle = b.accent
        ctx.fillStyle = b.accent
        ctx.globalAlpha = 0.55
        ctx.lineWidth = 2
        if (biome === 5) {
          // Crystal cluster: faceted shards with a lit face.
          ctx.globalAlpha = 1
          ctx.fillStyle = 'rgba(0,0,0,0.25)'
          ctx.beginPath()
          ctx.ellipse(x + 3, y + 3, s * 0.9, s * 0.35, 0, 0, Math.PI * 2)
          ctx.fill()
          for (let k = 0; k < 3; k++) {
            const bx = x + (k - 1) * s * 0.45
            const hh = s * (1.1 + (k === 1 ? 0.7 : 0.1 * k))
            const ww = s * 0.28
            ctx.fillStyle = b.rock2
            ctx.beginPath()
            ctx.moveTo(bx - ww, y)
            ctx.lineTo(bx - ww * 0.6, y - hh * 0.75)
            ctx.lineTo(bx, y - hh)
            ctx.lineTo(bx + ww, y - hh * 0.7)
            ctx.lineTo(bx + ww, y)
            ctx.closePath()
            ctx.fill()
            ctx.fillStyle = `rgba(233,213,255,${0.45 + Math.sin(t * 1.5 + h * 9 + k) * 0.2})`
            ctx.beginPath()
            ctx.moveTo(bx - ww * 0.6, y - hh * 0.75)
            ctx.lineTo(bx, y - hh)
            ctx.lineTo(bx, y - 2)
            ctx.lineTo(bx - ww * 0.6, y - 2)
            ctx.closePath()
            ctx.fill()
          }
        } else if (biome === 6) {
          // Floating pylon shard with a pulsing rune ring.
          ctx.globalAlpha = 1
          const bob = Math.sin(t * 2 + h * 12) * 3
          ctx.fillStyle = 'rgba(0,0,0,0.35)'
          ctx.beginPath()
          ctx.ellipse(x, y + 6, s * 0.5, s * 0.2, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = b.rock2
          ctx.beginPath()
          ctx.moveTo(x, y - s * 1.4 + bob)
          ctx.lineTo(x + s * 0.35, y - s * 0.6 + bob)
          ctx.lineTo(x, y - s * 0.1 + bob)
          ctx.lineTo(x - s * 0.35, y - s * 0.6 + bob)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = '#67e8f9'
          ctx.fillRect(x - 1, y - s * 1.0 + bob, 2, s * 0.6)
          ctx.strokeStyle = `rgba(34,211,238,${0.3 + Math.sin(t * 3 + h * 7) * 0.25})`
          ctx.beginPath()
          ctx.ellipse(x, y + 4, s * 0.8, s * 0.3, 0, 0, Math.PI * 2)
          ctx.stroke()
        } else if (biome === 3) {
          for (let k = 0; k < 3; k++) {
            ctx.beginPath()
            ctx.moveTo(x + k * 6 - 6, y)
            ctx.lineTo(x + k * 6 - 3, y - s * (0.6 + k * 0.2))
            ctx.lineTo(x + k * 6, y)
            ctx.closePath()
            ctx.fill()
          }
        } else if (biome === 1) {
          ctx.strokeRect(x - s * 0.6, y - s * 0.3, s * 1.2, s * 0.6)
          ctx.beginPath()
          ctx.moveTo(x - s * 0.6, y)
          ctx.lineTo(x + s * 0.6, y)
          ctx.stroke()
        } else {
          for (let k = 0; k < 4; k++) {
            ctx.beginPath()
            ctx.moveTo(x + k * 4 - 6, y + 4)
            ctx.quadraticCurveTo(x + k * 4 - 8, y - s * 0.4, x + k * 4 - 3, y - s * 0.7)
            ctx.stroke()
          }
        }
        ctx.globalAlpha = 1
      }
    }
  }
}

/** The hero mech, facing `face` (radians), cannon aimed at `aim`. */
export function drawMech(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, aim: number, walk: number, moving: boolean, flash: boolean) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1.2, 1.2)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(2, 12, 17, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  const flip = Math.cos(face) < 0 ? -1 : 1
  ctx.scale(flip, 1)
  // Legs.
  const sw = moving ? Math.sin(walk) * 5 : 0
  const lift = moving ? Math.abs(Math.cos(walk)) * 2 : 0
  for (const [lx, ph] of [
    [-6, sw],
    [6, -sw],
  ]) {
    ctx.fillStyle = '#334155'
    ctx.fillRect(lx - 2.5 + ph * 0.3, 2, 5, 9)
    ctx.fillStyle = '#1e293b'
    ctx.beginPath()
    ctx.roundRect(lx - 5 + ph, 9 - (ph > 0 ? lift : 0), 10, 5, 2)
    ctx.fill()
  }
  const bob = moving ? Math.abs(Math.sin(walk)) * -1.5 : Math.sin(walk * 0.3) * 0.6
  ctx.translate(0, bob)
  // Backpack thruster.
  ctx.fillStyle = '#475569'
  ctx.beginPath()
  ctx.roundRect(-14, -14, 8, 14, 3)
  ctx.fill()
  if (moving) {
    ctx.fillStyle = `rgba(56,189,248,${0.5 + Math.sin(walk * 3) * 0.3})`
    ctx.beginPath()
    ctx.ellipse(-12, 3, 3, 4 + Math.sin(walk * 4) * 1.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // Hull.
  const hull = ctx.createLinearGradient(0, -16, 0, 6)
  hull.addColorStop(0, flash ? '#ffffff' : '#e2e8f0')
  hull.addColorStop(0.5, flash ? '#fecaca' : '#94a3b8')
  hull.addColorStop(1, flash ? '#ef4444' : '#475569')
  ctx.fillStyle = hull
  ctx.beginPath()
  ctx.roundRect(-11, -17, 22, 21, 7)
  ctx.fill()
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = '#f97316'
  ctx.fillRect(-11, -3, 22, 3)
  // Cockpit.
  const glass = ctx.createLinearGradient(0, -14, 0, -5)
  glass.addColorStop(0, '#a5f3fc')
  glass.addColorStop(1, '#0e7490')
  ctx.fillStyle = glass
  ctx.beginPath()
  ctx.roundRect(-2, -14, 11, 8, 3)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillRect(0, -13, 4, 2)
  ctx.restore()
  // Shoulder cannon tracks the aim (drawn unflipped).
  ctx.save()
  ctx.translate(x, y - 14 + bob * 1.2)
  ctx.rotate(aim)
  ctx.scale(1.2, 1.2)
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.roundRect(-2, -3.5, 17, 7, 2)
  ctx.fill()
  ctx.fillStyle = '#f97316'
  ctx.fillRect(13, -3.5, 3, 7)
  ctx.fillStyle = '#64748b'
  ctx.beginPath()
  ctx.arc(0, 0, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
