/** Vector art for Gun Merge: gun sprites (cached), zombies, barricade and backdrop. */

export const GUN_NAMES = [
  'Pistol',
  'Revolver',
  'SMG',
  'Shotgun',
  'Rifle',
  'Assault Rifle',
  'Sniper',
  'Minigun',
  'Rocket Launcher',
  'Laser Rifle',
  'Plasma Cannon',
  'Railgun',
]
export const MAX_TIER = GUN_NAMES.length - 1
/** Badge / glow colour per tier. */
export const TIER_COLORS = ['#94a3b8', '#e2e8f0', '#84cc16', '#f59e0b', '#a3e635', '#fbbf24', '#22c55e', '#f97316', '#ef4444', '#22d3ee', '#d946ef', '#60a5fa']

type G = CanvasRenderingContext2D

const cache = new Map<string, HTMLCanvasElement>()

function grad(g: G, y0: number, y1: number, top: string, bot: string) {
  const gr = g.createLinearGradient(0, y0, 0, y1)
  gr.addColorStop(0, top)
  gr.addColorStop(1, bot)
  return gr
}

/** Fill the current path with a vertical gradient and a dark outline. */
function paint(g: G, y0: number, y1: number, top: string, bot: string, line = 2.2) {
  g.fillStyle = grad(g, y0, y1, top, bot)
  g.fill()
  g.lineWidth = line
  g.strokeStyle = '#0b0f19'
  g.stroke()
}

function rect(g: G, x: number, y: number, w: number, h: number, top: string, bot: string, r = 2) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
  paint(g, y, y + h, top, bot)
}

function poly(g: G, pts: number[], top: string, bot: string) {
  g.beginPath()
  g.moveTo(pts[0], pts[1])
  let y0 = pts[1]
  let y1 = pts[1]
  for (let i = 2; i < pts.length; i += 2) {
    g.lineTo(pts[i], pts[i + 1])
    y0 = Math.min(y0, pts[i + 1])
    y1 = Math.max(y1, pts[i + 1])
  }
  g.closePath()
  paint(g, y0, y1, top, bot)
}

function shine(g: G, x: number, y: number, w: number, a = 0.45) {
  g.strokeStyle = `rgba(255,255,255,${a})`
  g.lineWidth = 1.6
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + w, y)
  g.stroke()
}

function glowDot(g: G, x: number, y: number, r: number, c: string) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r)
  gr.addColorStop(0, '#ffffff')
  gr.addColorStop(0.3, c)
  gr.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = gr
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
}

const WOOD = ['#c47b3f', '#7c3f16']
const STEEL = ['#cbd5e1', '#475569']
const DARK = ['#4b5563', '#111827']

/** Draws a gun pointing right inside a 100×100 box (muzzle at ~x 96, y 40–45). */
function drawGun(g: G, tier: number) {
  g.lineJoin = 'round'
  switch (tier) {
    case 0: {
      poly(g, [26, 46, 46, 46, 42, 80, 20, 80], WOOD[0], WOOD[1])
      g.beginPath()
      g.arc(52, 52, 6, 0, Math.PI)
      g.lineWidth = 2.6
      g.strokeStyle = '#1f2937'
      g.stroke()
      rect(g, 16, 30, 66, 17, '#9ca3af', '#374151', 3)
      rect(g, 80, 34, 8, 9, '#6b7280', '#1f2937', 1)
      g.strokeStyle = 'rgba(0,0,0,0.45)'
      g.lineWidth = 1.4
      for (let x = 22; x < 36; x += 4) {
        g.beginPath()
        g.moveTo(x, 33)
        g.lineTo(x, 44)
        g.stroke()
      }
      shine(g, 20, 33, 56)
      rect(g, 74, 27, 4, 4, '#e5e7eb', '#6b7280', 1)
      break
    }
    case 1: {
      poly(g, [24, 50, 40, 52, 36, 86, 16, 82], '#a16207', '#57260b')
      g.fillStyle = '#facc15'
      g.beginPath()
      g.arc(29, 66, 3, 0, Math.PI * 2)
      g.fill()
      rect(g, 50, 35, 46, 9, STEEL[0], STEEL[1], 2)
      rect(g, 50, 31, 44, 4, '#e2e8f0', '#94a3b8', 1)
      rect(g, 22, 30, 30, 26, '#e2e8f0', '#64748b', 4)
      rect(g, 32, 31, 24, 22, '#cbd5e1', '#334155', 6)
      g.strokeStyle = 'rgba(15,23,42,0.6)'
      g.lineWidth = 1.5
      for (let y = 36; y < 52; y += 5) {
        g.beginPath()
        g.moveTo(34, y)
        g.lineTo(54, y)
        g.stroke()
      }
      poly(g, [20, 30, 26, 22, 30, 24, 28, 32], '#9ca3af', '#374151')
      shine(g, 52, 37, 40)
      break
    }
    case 2: {
      g.strokeStyle = '#1f2937'
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(24, 38)
      g.lineTo(6, 40)
      g.lineTo(6, 54)
      g.lineTo(24, 50)
      g.stroke()
      rect(g, 50, 50, 11, 36, '#3f3f46', '#09090b', 2)
      poly(g, [30, 50, 42, 50, 40, 76, 28, 76], DARK[0], DARK[1])
      rect(g, 20, 32, 62, 20, '#65a30d', '#365314', 4)
      rect(g, 80, 36, 16, 11, '#3f3f46', '#111827', 3)
      g.fillStyle = '#0b0f19'
      for (let x = 84; x < 95; x += 4) {
        g.beginPath()
        g.arc(x, 41.5, 1.3, 0, Math.PI * 2)
        g.fill()
      }
      rect(g, 40, 27, 18, 5, '#3f3f46', '#111827', 1)
      shine(g, 24, 35, 54)
      break
    }
    case 3: {
      poly(g, [4, 42, 24, 36, 24, 56, 4, 68], WOOD[0], WOOD[1])
      rect(g, 22, 34, 22, 22, '#6b7280', '#1f2937', 3)
      rect(g, 40, 35, 58, 7, STEEL[0], STEEL[1], 3)
      rect(g, 40, 42, 58, 7, '#94a3b8', '#334155', 3)
      rect(g, 54, 48, 26, 9, '#d08a4c', '#7c3f16', 3)
      g.strokeStyle = 'rgba(0,0,0,0.35)'
      g.lineWidth = 1.2
      for (let x = 58; x < 78; x += 4) {
        g.beginPath()
        g.moveTo(x, 50)
        g.lineTo(x, 55)
        g.stroke()
      }
      g.fillStyle = '#0b0f19'
      g.beginPath()
      g.arc(96, 38.5, 2, 0, Math.PI * 2)
      g.arc(96, 45.5, 2, 0, Math.PI * 2)
      g.fill()
      shine(g, 42, 37, 52)
      break
    }
    case 4: {
      poly(g, [2, 44, 40, 40, 74, 42, 74, 50, 42, 52, 16, 64, 2, 62], '#b45309', '#5b2a0b')
      rect(g, 40, 39, 58, 5, STEEL[0], STEEL[1], 2)
      rect(g, 30, 26, 30, 8, '#334155', '#0f172a', 4)
      rect(g, 26, 25, 6, 10, '#475569', '#0f172a', 2)
      rect(g, 58, 25, 6, 10, '#475569', '#0f172a', 2)
      g.fillStyle = '#7dd3fc'
      g.beginPath()
      g.arc(63, 30, 2.2, 0, Math.PI * 2)
      g.fill()
      g.strokeStyle = '#94a3b8'
      g.lineWidth = 2.4
      g.beginPath()
      g.moveTo(36, 42)
      g.lineTo(32, 50)
      g.stroke()
      g.fillStyle = '#e2e8f0'
      g.beginPath()
      g.arc(32, 51, 2.5, 0, Math.PI * 2)
      g.fill()
      shine(g, 8, 46, 60, 0.3)
      break
    }
    case 5: {
      poly(g, [4, 36, 26, 38, 26, 52, 6, 58], '#d6b37a', '#7c5a2a')
      poly(g, [54, 50, 66, 50, 72, 80, 60, 82], '#a1824a', '#4b3a1c')
      poly(g, [30, 50, 42, 50, 38, 74, 28, 74], '#a1824a', '#4b3a1c')
      rect(g, 24, 33, 52, 19, '#e2c48d', '#8a6a35', 4)
      rect(g, 74, 39, 18, 6, STEEL[0], STEEL[1], 2)
      rect(g, 90, 37, 7, 10, '#475569', '#111827', 2)
      g.beginPath()
      g.moveTo(34, 33)
      g.lineTo(38, 24)
      g.lineTo(60, 24)
      g.lineTo(62, 33)
      g.lineWidth = 3.5
      g.strokeStyle = '#0b0f19'
      g.stroke()
      g.lineWidth = 2
      g.strokeStyle = '#d6b37a'
      g.stroke()
      shine(g, 28, 36, 44)
      break
    }
    case 6: {
      g.strokeStyle = '#1f2937'
      g.lineWidth = 2.4
      g.beginPath()
      g.moveTo(70, 46)
      g.lineTo(78, 66)
      g.moveTo(70, 46)
      g.lineTo(64, 66)
      g.stroke()
      poly(g, [2, 38, 20, 40, 20, 52, 2, 60], '#3f6212', '#1a2e05')
      g.fillStyle = '#0b0f19'
      g.beginPath()
      g.roundRect(6, 44, 8, 8, 2)
      g.fill()
      poly(g, [28, 52, 38, 52, 34, 72, 24, 72], '#3f6212', '#1a2e05')
      rect(g, 18, 38, 40, 15, '#4d7c0f', '#1a2e05', 3)
      rect(g, 56, 41.5, 40, 4, '#94a3b8', '#1f2937', 1.5)
      rect(g, 92, 39, 7, 8, '#475569', '#0b0f19', 1)
      rect(g, 26, 22, 38, 10, '#334155', '#020617', 5)
      rect(g, 22, 20, 8, 14, '#475569', '#0f172a', 2)
      rect(g, 60, 20, 8, 14, '#475569', '#0f172a', 2)
      g.fillStyle = '#38bdf8'
      g.beginPath()
      g.arc(66, 27, 3, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.8)'
      g.beginPath()
      g.arc(65, 26, 1, 0, Math.PI * 2)
      g.fill()
      shine(g, 30, 24, 30)
      break
    }
    case 7: {
      g.strokeStyle = '#ca8a04'
      g.lineWidth = 3
      g.setLineDash([3, 2])
      g.beginPath()
      g.moveTo(34, 64)
      g.quadraticCurveTo(28, 58, 30, 52)
      g.stroke()
      g.setLineDash([])
      rect(g, 16, 62, 30, 22, '#4d7c0f', '#1a2e05', 3)
      g.fillStyle = '#facc15'
      g.fillRect(22, 70, 18, 3)
      for (let i = 0; i < 3; i++) rect(g, 44, 31 + i * 9, 52, 6, STEEL[0], STEEL[1], 3)
      rect(g, 86, 28, 6, 32, '#64748b', '#1e293b', 2)
      rect(g, 58, 29, 5, 30, '#64748b', '#1e293b', 2)
      rect(g, 18, 26, 30, 36, '#fb923c', '#9a3412', 6)
      g.strokeStyle = 'rgba(0,0,0,0.35)'
      g.lineWidth = 1.5
      for (let y = 32; y < 58; y += 5) {
        g.beginPath()
        g.moveTo(22, y)
        g.lineTo(44, y)
        g.stroke()
      }
      g.beginPath()
      g.moveTo(24, 26)
      g.quadraticCurveTo(33, 12, 42, 26)
      g.lineWidth = 4
      g.strokeStyle = '#0b0f19'
      g.stroke()
      g.lineWidth = 2.2
      g.strokeStyle = '#94a3b8'
      g.stroke()
      shine(g, 22, 30, 22)
      break
    }
    case 8: {
      poly(g, [80, 36, 92, 38, 99, 44, 92, 50, 80, 52], '#f87171', '#991b1b')
      rect(g, 10, 33, 72, 22, '#65a30d', '#2f4f0a', 9)
      poly(g, [2, 30, 14, 34, 14, 54, 2, 58], '#4d7c0f', '#1a2e05')
      g.fillStyle = '#facc15'
      g.beginPath()
      g.rect(56, 34, 6, 20)
      g.fill()
      g.fillStyle = '#0b0f19'
      g.beginPath()
      g.moveTo(56, 34)
      g.lineTo(59, 34)
      g.lineTo(62, 44)
      g.lineTo(62, 47)
      g.closePath()
      g.fill()
      poly(g, [36, 55, 46, 55, 44, 74, 34, 74], DARK[0], DARK[1])
      rect(g, 30, 25, 14, 8, '#334155', '#0f172a', 2)
      g.fillStyle = '#ef4444'
      g.beginPath()
      g.arc(40, 29, 2, 0, Math.PI * 2)
      g.fill()
      shine(g, 16, 37, 56, 0.35)
      break
    }
    case 9: {
      poly(g, [6, 40, 28, 34, 28, 54, 10, 60], '#f1f5f9', '#94a3b8')
      poly(g, [34, 54, 44, 54, 40, 74, 30, 74], '#e2e8f0', '#64748b')
      g.beginPath()
      g.moveTo(24, 32)
      g.lineTo(78, 34)
      g.quadraticCurveTo(92, 36, 94, 42)
      g.quadraticCurveTo(92, 48, 78, 50)
      g.lineTo(24, 56)
      g.closePath()
      paint(g, 32, 56, '#ffffff', '#94a3b8')
      g.strokeStyle = '#22d3ee'
      g.lineWidth = 2.5
      g.beginPath()
      g.moveTo(30, 44)
      g.lineTo(84, 42)
      g.stroke()
      glowDot(g, 94, 42, 8, '#22d3ee')
      rect(g, 40, 26, 20, 6, '#1e293b', '#0f172a', 3)
      g.fillStyle = '#67e8f9'
      g.fillRect(43, 28, 14, 2)
      shine(g, 30, 36, 44, 0.8)
      break
    }
    case 10: {
      poly(g, [4, 38, 22, 34, 22, 58, 4, 62], '#7e22ce', '#3b0764')
      poly(g, [30, 58, 42, 58, 38, 78, 28, 78], '#6b21a8', '#2e1065')
      rect(g, 18, 28, 50, 32, '#a855f7', '#4c1d95', 10)
      g.beginPath()
      g.moveTo(66, 34)
      g.lineTo(96, 36)
      g.lineTo(96, 40)
      g.lineTo(76, 42)
      g.closePath()
      paint(g, 34, 42, '#c4b5fd', '#5b21b6')
      g.beginPath()
      g.moveTo(66, 54)
      g.lineTo(96, 52)
      g.lineTo(96, 48)
      g.lineTo(76, 46)
      g.closePath()
      paint(g, 46, 54, '#c4b5fd', '#5b21b6')
      glowDot(g, 44, 44, 14, '#f0abfc')
      g.strokeStyle = 'rgba(255,255,255,0.7)'
      g.lineWidth = 1.6
      g.beginPath()
      g.arc(44, 44, 10, 0, Math.PI * 2)
      g.stroke()
      glowDot(g, 92, 44, 7, '#e879f9')
      shine(g, 24, 31, 38, 0.6)
      break
    }
    default: {
      poly(g, [4, 34, 18, 32, 18, 60, 4, 62], '#ca8a04', '#713f12')
      poly(g, [28, 60, 38, 60, 36, 80, 26, 80], '#334155', '#0f172a')
      g.strokeStyle = 'rgba(147,197,253,0.9)'
      g.lineWidth = 1.6
      g.beginPath()
      for (let x = 46; x < 96; x += 6) {
        g.moveTo(x, 39)
        g.lineTo(x + 3, 44)
        g.lineTo(x, 49)
      }
      g.stroke()
      rect(g, 40, 32, 59, 6, '#334155', '#020617', 2)
      rect(g, 40, 50, 59, 6, '#334155', '#020617', 2)
      rect(g, 14, 28, 34, 34, '#fde047', '#a16207', 6)
      for (const x of [22, 32, 42]) rect(g, x - 3, 26, 6, 38, '#60a5fa', '#1e3a8a', 3)
      glowDot(g, 97, 44, 8, '#93c5fd')
      shine(g, 16, 31, 28, 0.7)
    }
  }
}

/** Cached gun sprite: square canvas, gun points right. */
export function gunSprite(tier: number, size: number): HTMLCanvasElement {
  const px = Math.max(16, Math.round(size))
  const key = `${tier}|${px}`
  const hit = cache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const c = document.createElement('canvas')
  c.width = Math.ceil(px * dpr)
  c.height = Math.ceil(px * dpr)
  const g = c.getContext('2d')!
  // drop shadow: silhouette tinted black, offset down-right
  const sh = document.createElement('canvas')
  sh.width = c.width
  sh.height = c.height
  const sg = sh.getContext('2d')!
  sg.scale((px * dpr) / 100, (px * dpr) / 100)
  drawGun(sg, tier)
  sg.globalCompositeOperation = 'source-in'
  sg.fillStyle = '#000'
  sg.fillRect(0, 0, 100, 100)
  g.globalAlpha = 0.3
  g.drawImage(sh, c.width * 0.02, c.height * 0.045)
  g.globalAlpha = 1
  g.scale((px * dpr) / 100, (px * dpr) / 100)
  drawGun(g, tier)
  cache.set(key, c)
  if (cache.size > 160) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
  return c
}

// ── Zombies ────────────────────────────────────────────────

export type ZKind = 'walker' | 'runner' | 'bat' | 'bomber' | 'spitter' | 'brute' | 'armored' | 'boss'

type ZLook = { skin: string; skinD: string; shirt: string; shirtD: string; eye: string }
const LOOKS: Record<ZKind, ZLook> = {
  walker: { skin: '#86efac', skinD: '#15803d', shirt: '#60a5fa', shirtD: '#1e3a8a', eye: '#fef08a' },
  runner: { skin: '#bef264', skinD: '#4d7c0f', shirt: '#f87171', shirtD: '#7f1d1d', eye: '#ef4444' },
  bat: { skin: '#a78bfa', skinD: '#4c1d95', shirt: '#7c3aed', shirtD: '#2e1065', eye: '#fde047' },
  bomber: { skin: '#fdba74', skinD: '#9a3412', shirt: '#78716c', shirtD: '#292524', eye: '#fef08a' },
  spitter: { skin: '#a3e635', skinD: '#3f6212', shirt: '#14b8a6', shirtD: '#134e4a', eye: '#f0abfc' },
  brute: { skin: '#94a3b8', skinD: '#334155', shirt: '#a16207', shirtD: '#422006', eye: '#f87171' },
  armored: { skin: '#6ee7b7', skinD: '#065f46', shirt: '#475569', shirtD: '#0f172a', eye: '#fde047' },
  boss: { skin: '#c084fc', skinD: '#581c87', shirt: '#dc2626', shirtD: '#450a0a', eye: '#fef08a' },
}

function ell(g: G, x: number, y: number, rx: number, ry: number) {
  g.beginPath()
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
}

/**
 * Draw a zombie facing the viewer (walking down the lane), centred at x,y
 * with radius r. `t` drives the walk cycle; `flash` 0..1 whitens on hit.
 */
let scratch: HTMLCanvasElement | null = null

export function drawZombie(g: G, kind: ZKind, x: number, y: number, r: number, t: number, flash: number, variant = 0) {
  if (flash <= 0.05) {
    zombieBody(g, kind, x, y, r, t, variant)
    return
  }
  // hit flash: whiten an offscreen copy so only the zombie is tinted
  const dim = Math.ceil(r * 4.4)
  if (!scratch) scratch = document.createElement('canvas')
  if (scratch.width < dim) {
    scratch.width = dim
    scratch.height = dim
  }
  const sg = scratch.getContext('2d')!
  sg.setTransform(1, 0, 0, 1, 0, 0)
  sg.globalCompositeOperation = 'source-over'
  sg.clearRect(0, 0, dim, dim)
  zombieBody(sg, kind, dim / 2, dim / 2, r, t, variant)
  sg.globalCompositeOperation = 'source-atop'
  sg.globalAlpha = flash * 0.8
  sg.fillStyle = '#ffffff'
  sg.fillRect(0, 0, dim, dim)
  sg.globalAlpha = 1
  sg.globalCompositeOperation = 'source-over'
  g.drawImage(scratch, 0, 0, dim, dim, x - dim / 2, y - dim / 2, dim, dim)
}

function zombieBody(g: G, kind: ZKind, x: number, y: number, r: number, t: number, variant: number) {
  const L = LOOKS[kind]
  const sw = Math.sin(t * (kind === 'runner' ? 14 : kind === 'brute' || kind === 'boss' ? 5 : 8))
  g.save()
  g.translate(x, y)
  g.lineJoin = 'round'
  g.lineCap = 'round'
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.3)'
  ell(g, 0, r * 0.95, r * 0.85, r * 0.25)
  g.fill()
  const out = '#0b0f19'
  const lw = Math.max(1.5, r * 0.09)
  g.lineWidth = lw
  g.strokeStyle = out

  if (kind === 'bat') {
    const flap = Math.sin(t * 18)
    g.translate(0, -r * 0.6 + Math.sin(t * 4) * r * 0.15)
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(s * r * 0.3, -r * 0.1)
      g.quadraticCurveTo(s * r * 1.1, -r * (0.9 + flap * 0.5), s * r * 1.7, -r * (0.2 + flap * 0.6))
      g.quadraticCurveTo(s * r * 1.3, r * 0.1, s * r * 1.1, r * 0.25)
      g.quadraticCurveTo(s * r * 0.8, r * 0.05, s * r * 0.3, r * 0.3)
      g.closePath()
      g.fillStyle = grad(g, -r, r * 0.4, L.shirt, L.shirtD)
      g.fill()
      g.stroke()
    }
    ell(g, 0, 0, r * 0.55, r * 0.6)
    g.fillStyle = grad(g, -r * 0.6, r * 0.6, L.skin, L.skinD)
    g.fill()
    g.stroke()
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(s * r * 0.2, -r * 0.45)
      g.lineTo(s * r * 0.42, -r * 0.95)
      g.lineTo(s * r * 0.5, -r * 0.35)
      g.closePath()
      g.fillStyle = L.skinD
      g.fill()
      g.stroke()
    }
    g.fillStyle = L.eye
    ell(g, -r * 0.2, -r * 0.08, r * 0.13, r * 0.11)
    g.fill()
    ell(g, r * 0.2, -r * 0.08, r * 0.13, r * 0.11)
    g.fill()
    g.fillStyle = '#fff'
    g.beginPath()
    g.moveTo(-r * 0.15, r * 0.22)
    g.lineTo(-r * 0.08, r * 0.4)
    g.lineTo(-r * 0.02, r * 0.22)
    g.moveTo(r * 0.15, r * 0.22)
    g.lineTo(r * 0.08, r * 0.4)
    g.lineTo(r * 0.02, r * 0.22)
    g.fill()
  } else {
    const big = kind === 'brute' || kind === 'boss'
    // legs
    for (const s of [-1, 1]) {
      const lift = s * sw
      g.beginPath()
      g.roundRect(s * r * 0.32 - r * 0.15, r * 0.3 - Math.max(0, lift) * r * 0.18, r * 0.3, r * 0.62, r * 0.1)
      g.fillStyle = grad(g, r * 0.3, r, '#57534e', '#1c1917')
      g.fill()
      g.stroke()
    }
    // arms reaching out toward the viewer
    for (const s of [-1, 1]) {
      const reach = s * sw * r * 0.12
      g.beginPath()
      g.moveTo(s * r * 0.55, -r * 0.2)
      g.quadraticCurveTo(s * r * 0.95, r * 0.05 + reach, s * r * (big ? 0.95 : 0.75), r * 0.5 + reach)
      g.lineWidth = r * (big ? 0.34 : 0.24) + lw * 2
      g.strokeStyle = out
      g.stroke()
      g.lineWidth = r * (big ? 0.34 : 0.24)
      g.strokeStyle = L.skin
      g.stroke()
      g.fillStyle = L.skinD
      ell(g, s * r * (big ? 0.95 : 0.75), r * 0.55 + reach, r * (big ? 0.2 : 0.14), r * (big ? 0.18 : 0.12))
      g.fill()
      g.lineWidth = lw
      g.strokeStyle = out
      g.stroke()
    }
    // torso
    const bw = big ? 0.85 : kind === 'bomber' || kind === 'spitter' ? 0.72 : 0.6
    g.beginPath()
    g.roundRect(-r * bw, -r * 0.4, r * bw * 2, r * 0.85, r * 0.3)
    g.fillStyle = grad(g, -r * 0.4, r * 0.45, L.shirt, L.shirtD)
    g.fill()
    g.lineWidth = lw
    g.strokeStyle = out
    g.stroke()
    // torn shirt hem
    g.fillStyle = L.skinD
    g.beginPath()
    g.moveTo(-r * bw * 0.6, r * 0.45)
    g.lineTo(-r * bw * 0.4, r * 0.25)
    g.lineTo(-r * bw * 0.1, r * 0.45)
    g.closePath()
    g.fill()
    if (kind === 'bomber') {
      // glowing belly charge with fuse
      const pulse = 0.6 + Math.sin(t * 12) * 0.4
      g.fillStyle = `rgba(251,146,60,${0.45 + pulse * 0.4})`
      ell(g, 0, r * 0.05, r * 0.42, r * 0.32)
      g.fill()
      g.fillStyle = '#7f1d1d'
      g.beginPath()
      g.roundRect(-r * 0.32, -r * 0.12, r * 0.64, r * 0.32, r * 0.08)
      g.fill()
      g.stroke()
      g.fillStyle = '#fde047'
      for (const s of [-1, 0, 1]) {
        g.beginPath()
        g.arc(s * r * 0.2, r * 0.04, r * 0.06, 0, Math.PI * 2)
        g.fill()
      }
    } else if (kind === 'spitter') {
      g.fillStyle = 'rgba(190,242,100,0.85)'
      ell(g, 0, r * 0.05, r * 0.42, r * 0.3)
      g.fill()
      g.stroke()
      g.fillStyle = 'rgba(255,255,255,0.5)'
      ell(g, -r * 0.14, -r * 0.04, r * 0.1, r * 0.06)
      g.fill()
    } else if (kind === 'armored') {
      // riot vest plates
      g.fillStyle = '#334155'
      g.beginPath()
      g.roundRect(-r * 0.45, -r * 0.32, r * 0.9, r * 0.6, r * 0.12)
      g.fill()
      g.stroke()
      g.fillStyle = '#facc15'
      g.fillRect(-r * 0.45, -r * 0.05, r * 0.9, r * 0.09)
    } else if (kind === 'boss') {
      for (const s of [-1, 1]) {
        g.fillStyle = '#e2e8f0'
        g.beginPath()
        g.moveTo(s * r * 0.75, -r * 0.42)
        g.lineTo(s * r * 1.05, -r * 0.8)
        g.lineTo(s * r * 0.5, -r * 0.45)
        g.closePath()
        g.fill()
        g.stroke()
      }
    }
    // head
    const hr = big ? r * 0.38 : r * 0.42
    const hy = -r * 0.62 + (kind === 'runner' ? r * 0.06 : 0) + sw * r * 0.03
    g.beginPath()
    g.arc(variant % 2 ? r * 0.05 : -r * 0.04, hy, hr, 0, Math.PI * 2)
    g.fillStyle = grad(g, hy - hr, hy + hr, L.skin, L.skinD)
    g.fill()
    g.stroke()
    if (kind === 'armored' || (kind === 'walker' && variant === 2)) {
      g.beginPath()
      g.arc(0, hy - hr * 0.1, hr * 1.05, Math.PI * 1.05, Math.PI * 1.95)
      g.closePath()
      g.fillStyle = kind === 'armored' ? '#475569' : '#ea580c'
      g.fill()
      g.stroke()
    }
    if (kind === 'boss') {
      g.fillStyle = '#facc15'
      g.beginPath()
      g.moveTo(-hr * 0.8, hy - hr * 0.7)
      g.lineTo(-hr * 0.6, hy - hr * 1.5)
      g.lineTo(-hr * 0.2, hy - hr * 0.95)
      g.lineTo(0, hy - hr * 1.6)
      g.lineTo(hr * 0.2, hy - hr * 0.95)
      g.lineTo(hr * 0.6, hy - hr * 1.5)
      g.lineTo(hr * 0.8, hy - hr * 0.7)
      g.closePath()
      g.fill()
      g.stroke()
    }
    // eyes
    const ex = hr * 0.38
    const ey = hy - hr * 0.05
    g.fillStyle = '#0b0f19'
    ell(g, -ex, ey, hr * 0.26, hr * 0.22)
    g.fill()
    ell(g, ex, ey, hr * 0.26, hr * 0.22)
    g.fill()
    g.fillStyle = L.eye
    ell(g, -ex, ey, hr * 0.15, hr * 0.13)
    g.fill()
    ell(g, ex * (variant === 1 ? 0.9 : 1), ey, hr * (variant === 1 ? 0.09 : 0.15), hr * 0.13)
    g.fill()
    // brows (angry)
    g.strokeStyle = out
    g.lineWidth = lw * 1.1
    g.beginPath()
    g.moveTo(-ex - hr * 0.25, ey - hr * 0.35)
    g.lineTo(-ex + hr * 0.2, ey - hr * 0.2)
    g.moveTo(ex + hr * 0.25, ey - hr * 0.35)
    g.lineTo(ex - hr * 0.2, ey - hr * 0.2)
    g.stroke()
    // mouth
    g.fillStyle = '#450a0a'
    g.beginPath()
    g.ellipse(0, hy + hr * 0.48, hr * 0.32, hr * (0.12 + Math.abs(sw) * 0.08), 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#fef3c7'
    g.fillRect(-hr * 0.18, hy + hr * 0.38, hr * 0.1, hr * 0.1)
    g.fillRect(hr * 0.06, hy + hr * 0.38, hr * 0.1, hr * 0.1)
  }
  g.restore()
}

// ── Scenery ────────────────────────────────────────────────

export const PALETTES = [
  { name: 'Dusk', skyT: '#1e1b4b', skyB: '#c2410c', road: '#3f3f46', roadD: '#18181b', fog: '#fb923c', moon: '#fde68a' },
  { name: 'Midnight', skyT: '#020617', skyB: '#1e3a8a', road: '#334155', roadD: '#0f172a', fog: '#60a5fa', moon: '#e0f2fe' },
  { name: 'Toxic Zone', skyT: '#052e16', skyB: '#4d7c0f', road: '#365314', roadD: '#14200a', fog: '#a3e635', moon: '#d9f99d' },
  { name: 'Blood Moon', skyT: '#1c0505', skyB: '#991b1b', road: '#44403c', roadD: '#1c1917', fog: '#f87171', moon: '#fecaca' },
]

const bgCache = new Map<string, HTMLCanvasElement>()

/** Static battlefield backdrop (sky, skyline, perspective road) for the lane area. */
export function fieldSprite(pal: number, W: number, H: number): HTMLCanvasElement {
  const key = `${pal}|${W}|${H}`
  const hit = bgCache.get(key)
  if (hit) return hit
  const P = PALETTES[pal % PALETTES.length]
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const c = document.createElement('canvas')
  c.width = Math.ceil(W * dpr)
  c.height = Math.ceil(H * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  const hz = H * 0.16
  const sky = g.createLinearGradient(0, 0, 0, hz)
  sky.addColorStop(0, P.skyT)
  sky.addColorStop(1, P.skyB)
  g.fillStyle = sky
  g.fillRect(0, 0, W, hz + 2)
  // moon
  const mg = g.createRadialGradient(W * 0.78, hz * 0.4, 0, W * 0.78, hz * 0.4, hz * 0.9)
  mg.addColorStop(0, P.moon)
  mg.addColorStop(0.25, P.moon)
  mg.addColorStop(0.27, 'rgba(255,255,255,0.15)')
  mg.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = mg
  g.fillRect(0, 0, W, hz)
  // ruined skyline (two layers)
  let seed = 7 + pal * 13
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }
  for (const [layer, col, hMul] of [[0, 'rgba(15,23,42,0.6)', 0.9], [1, 'rgba(2,6,23,0.92)', 0.6]] as const) {
    g.fillStyle = col
    let x = -10
    while (x < W + 10) {
      const bw = 18 + rnd() * 30
      const bh = hz * hMul * (0.35 + rnd() * 0.65)
      g.beginPath()
      g.moveTo(x, hz)
      g.lineTo(x, hz - bh)
      // broken top
      g.lineTo(x + bw * 0.3, hz - bh + rnd() * 6)
      g.lineTo(x + bw * 0.55, hz - bh - rnd() * 8)
      g.lineTo(x + bw, hz - bh + rnd() * 10)
      g.lineTo(x + bw, hz)
      g.closePath()
      g.fill()
      if (layer === 1) {
        g.fillStyle = 'rgba(253,224,71,0.35)'
        for (let k = 0; k < 3; k++) if (rnd() < 0.4) g.fillRect(x + 4 + rnd() * (bw - 8), hz - bh * rnd() * 0.8 - 4, 2.5, 3)
        g.fillStyle = col
      }
      x += bw + rnd() * 6
    }
  }
  // road with perspective
  const road = g.createLinearGradient(0, hz, 0, H)
  road.addColorStop(0, P.roadD)
  road.addColorStop(1, P.road)
  g.fillStyle = road
  g.fillRect(0, hz, W, H - hz)
  // verges
  g.fillStyle = 'rgba(0,0,0,0.25)'
  g.beginPath()
  g.moveTo(0, hz)
  g.lineTo(W * 0.3, hz)
  g.lineTo(0, H * 0.7)
  g.closePath()
  g.fill()
  g.beginPath()
  g.moveTo(W, hz)
  g.lineTo(W * 0.7, hz)
  g.lineTo(W, H * 0.7)
  g.closePath()
  g.fill()
  // lane dashes
  g.fillStyle = 'rgba(253,224,71,0.55)'
  for (let i = 0; i < 9; i++) {
    const k0 = i / 9
    const k1 = (i + 0.5) / 9
    const y0 = hz + (H - hz) * k0 * k0
    const y1 = hz + (H - hz) * k1 * k1
    const w0 = 1 + k0 * 4
    const w1 = 1 + k1 * 4
    g.beginPath()
    g.moveTo(W / 2 - w0, y0)
    g.lineTo(W / 2 + w0, y0)
    g.lineTo(W / 2 + w1, y1)
    g.lineTo(W / 2 - w1, y1)
    g.closePath()
    g.fill()
  }
  // cracks and debris
  g.strokeStyle = 'rgba(0,0,0,0.35)'
  g.lineWidth = 1.2
  for (let i = 0; i < 10; i++) {
    let x = rnd() * W
    let y = hz + 20 + rnd() * (H - hz - 30)
    g.beginPath()
    g.moveTo(x, y)
    for (let k = 0; k < 4; k++) {
      x += (rnd() - 0.5) * 22
      y += (rnd() - 0.3) * 12
      g.lineTo(x, y)
    }
    g.stroke()
  }
  for (let i = 0; i < 14; i++) {
    const x = rnd() * W
    const y = hz + 10 + rnd() * (H - hz - 20)
    const s = 1.5 + rnd() * 3 * (y / H)
    g.fillStyle = rnd() < 0.5 ? 'rgba(120,113,108,0.6)' : 'rgba(41,37,36,0.7)'
    g.beginPath()
    g.moveTo(x - s, y)
    g.lineTo(x, y - s)
    g.lineTo(x + s * 1.2, y + s * 0.2)
    g.lineTo(x, y + s * 0.8)
    g.closePath()
    g.fill()
  }
  // wrecked car at the side
  const cy = hz + (H - hz) * 0.32
  g.save()
  g.translate(W * 0.1, cy)
  g.rotate(-0.25)
  g.fillStyle = '#7f1d1d'
  g.beginPath()
  g.roundRect(-18, -8, 36, 16, 4)
  g.fill()
  g.fillStyle = '#1f2937'
  g.fillRect(-8, -6, 16, 12)
  g.fillStyle = '#0b0f19'
  g.fillRect(-16, -11, 7, 3)
  g.fillRect(9, -11, 7, 3)
  g.fillRect(-16, 8, 7, 3)
  g.restore()
  // tire stack on the right
  g.fillStyle = '#18181b'
  for (let i = 0; i < 3; i++) {
    g.beginPath()
    g.ellipse(W * 0.9, hz + (H - hz) * 0.55 - i * 6, 11, 5, 0, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#3f3f46'
    g.stroke()
  }
  // horizon fog
  const fog = g.createLinearGradient(0, hz - 10, 0, hz + 50)
  fog.addColorStop(0, 'rgba(0,0,0,0)')
  fog.addColorStop(0.4, P.fog + '55')
  fog.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = fog
  g.fillRect(0, hz - 10, W, 60)
  bgCache.set(key, c)
  if (bgCache.size > 8) {
    const first = bgCache.keys().next().value
    if (first) bgCache.delete(first)
  }
  return c
}

/** Sandbag + plank barricade across the lane. `hp` 0..1 adds cracks and gaps. */
export function drawBarricade(g: G, W: number, y: number, hp: number, shake: number) {
  g.save()
  g.translate((Math.random() - 0.5) * shake, 0)
  // wooden planks behind
  for (let i = 0; i < 7; i++) {
    const x = (i + 0.5) * (W / 7)
    const broken = hp < 0.3 + i * 0.05 && i % 2 === 1
    g.save()
    g.translate(x, y - 6)
    g.rotate((i % 2 ? -1 : 1) * 0.18)
    g.fillStyle = '#92400e'
    g.strokeStyle = '#1c0a02'
    g.lineWidth = 1.5
    g.beginPath()
    g.roundRect(-5, broken ? -10 : -24, 10, broken ? 22 : 36, 2)
    g.fill()
    g.stroke()
    g.restore()
  }
  // sandbags
  const n = Math.ceil(W / 34) + 1
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < n; i++) {
      const x = i * 34 + (row ? 17 : 0) - 8
      const by = y + row * 10 - 4
      const gone = hp < 0.5 && row === 0 && (i * 7) % 5 < (0.5 - hp) * 10
      if (gone) continue
      const gr = g.createLinearGradient(0, by - 7, 0, by + 7)
      gr.addColorStop(0, '#d6c08f')
      gr.addColorStop(1, '#7c6a42')
      g.fillStyle = gr
      g.strokeStyle = '#3b2f17'
      g.lineWidth = 1.5
      g.beginPath()
      g.ellipse(x, by, 18, 7.5, 0, 0, Math.PI * 2)
      g.fill()
      g.stroke()
      g.strokeStyle = 'rgba(59,47,23,0.5)'
      g.beginPath()
      g.moveTo(x - 10, by - 1)
      g.lineTo(x + 10, by - 1)
      g.stroke()
    }
  }
  // barbed wire
  g.strokeStyle = '#a8a29e'
  g.lineWidth = 1.2
  g.beginPath()
  for (let x = 0; x <= W; x += 8) g.lineTo(x, y - 30 + Math.sin(x * 0.4) * 3)
  g.stroke()
  g.restore()
}
