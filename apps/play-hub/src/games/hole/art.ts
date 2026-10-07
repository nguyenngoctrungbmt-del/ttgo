/** Vector drawing for Black Hole's city objects (top-down with faux-3D buildings). */
import type { Obj } from './city'

const sprites = new Map<string, HTMLCanvasElement>()
/** Perspective strength: roof displacement per unit of height per unit of distance. */
const PERSP = 1 / 950

export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  let r = n >> 16
  let g = (n >> 8) & 255
  let b = n & 255
  if (k >= 0) {
    r += (255 - r) * k
    g += (255 - g) * k
    b += (255 - b) * k
  } else {
    r *= 1 + k
    g *= 1 + k
    b *= 1 + k
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`
}

function sprite(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  let c = sprites.get(key)
  if (c) return c
  c = document.createElement('canvas')
  const s = 3
  c.width = Math.ceil(w * s)
  c.height = Math.ceil(h * s)
  const g = c.getContext('2d')!
  g.scale(s, s)
  draw(g)
  sprites.set(key, c)
  return c
}

function carSprite(color: string) {
  return sprite(`car|${color}`, 36, 20, (g) => {
    g.translate(18, 10)
    g.fillStyle = shade(color, -0.45)
    g.beginPath()
    g.roundRect(-17, -9, 34, 18, 5)
    g.fill()
    g.fillStyle = color
    g.beginPath()
    g.roundRect(-16, -8, 32, 16, 5)
    g.fill()
    g.fillStyle = '#1e293b'
    g.beginPath()
    g.roundRect(3, -6.5, 6, 13, 2)
    g.fill()
    g.beginPath()
    g.roundRect(-12, -6, 4, 12, 2)
    g.fill()
    g.fillStyle = shade(color, 0.25)
    g.beginPath()
    g.roundRect(-8, -6, 11, 12, 2)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.fillRect(4, -5.5, 2, 5)
    g.fillStyle = '#fef08a'
    g.fillRect(14.5, -7, 2, 3)
    g.fillRect(14.5, 4, 2, 3)
    g.fillStyle = '#dc2626'
    g.fillRect(-16.5, -7, 1.5, 3)
    g.fillRect(-16.5, 4, 1.5, 3)
  })
}

function treeSprite(color: string, snow: boolean) {
  return sprite(`tree|${color}|${snow}`, 40, 40, (g) => {
    g.translate(20, 20)
    const blobs = [
      [0, 0, 15],
      [-7, -5, 9],
      [6, -6, 9],
      [7, 6, 9],
      [-6, 7, 9],
    ]
    g.fillStyle = shade(color, -0.4)
    for (const [x, y, r] of blobs) {
      g.beginPath()
      g.arc(x + 1, y + 1.5, r + 1, 0, Math.PI * 2)
      g.fill()
    }
    for (const [x, y, r] of blobs) {
      const grad = g.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r)
      grad.addColorStop(0, snow ? '#ffffff' : shade(color, 0.35))
      grad.addColorStop(1, snow ? '#cbd5e1' : color)
      g.fillStyle = grad
      g.beginPath()
      g.arc(x, y, r, 0, Math.PI * 2)
      g.fill()
    }
  })
}

function quad(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) {
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  ctx.lineTo(bx, by)
  ctx.lineTo(cx, cy)
  ctx.lineTo(dx, dy)
  ctx.closePath()
  ctx.fill()
}

/**
 * Extruded box: draws the camera-facing walls and returns the roof offset.
 * `bands` > 0 adds window rows to the walls.
 */
function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  height: number,
  camX: number,
  camY: number,
  wall: string,
  bands: number,
  lit: boolean,
) {
  const ox = (x - camX) * height * PERSP
  const oy = (y - camY) * height * PERSP
  const x0 = x - w / 2
  const x1 = x + w / 2
  const y0 = y - h / 2
  const y1 = y + h / 2
  const faces: [number, number, number, number, number, number, string][] = []
  if (oy > 0) faces.push([x0, y0, x1, y0, 0, -1, shade(wall, 0.12)])
  if (oy < 0) faces.push([x1, y1, x0, y1, 0, 1, shade(wall, -0.28)])
  if (ox > 0) faces.push([x0, y1, x0, y0, -1, 0, shade(wall, 0.02)])
  if (ox < 0) faces.push([x1, y0, x1, y1, 1, 0, shade(wall, -0.18)])
  for (const [ax, ay, bx, by, , , col] of faces) {
    ctx.fillStyle = col
    quad(ctx, ax, ay, bx, by, bx + ox, by + oy, ax + ox, ay + oy)
    if (bands > 0) {
      ctx.strokeStyle = lit ? 'rgba(253,224,71,0.85)' : 'rgba(255,255,255,0.28)'
      ctx.lineWidth = Math.max(1, height / bands / 3)
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      for (let i = 1; i < bands; i++) {
        const t = i / bands
        ctx.moveTo(ax + ox * t, ay + oy * t)
        ctx.lineTo(bx + ox * t, by + oy * t)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }
  }
  return { ox, oy }
}

/** Draws one object at (x, y) with uniform scale `s` (used for falling). */
export function drawObj(ctx: CanvasRenderingContext2D, o: Obj, x: number, y: number, s: number, camX: number, camY: number, t: number, night: boolean, snow: boolean) {
  const flat = o.height === 0 || o.kind === 'car' || o.kind === 'bus'
  ctx.save()
  ctx.translate(x, y)
  if (s !== 1) ctx.scale(s, s)
  if (flat) {
    // Soft contact shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.beginPath()
    ctx.ellipse(2.5, 3.5, o.w * 0.5, o.h * 0.5, o.rot, 0, Math.PI * 2)
    ctx.fill()
    ctx.rotate(o.rot)
  }
  switch (o.kind) {
    case 'cone': {
      ctx.fillStyle = '#7c2d12'
      ctx.fillRect(-4.5, -4.5, 9, 9)
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.arc(0, 0, 3.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(0, 0, 2.3, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'hydrant': {
      ctx.fillStyle = '#7f1d1d'
      ctx.beginPath()
      ctx.arc(0, 0, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(-0.5, -0.5, 3.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fca5a5'
      ctx.beginPath()
      ctx.arc(-1.4, -1.4, 1.4, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'bin': {
      ctx.fillStyle = '#14532d'
      ctx.beginPath()
      ctx.arc(0, 0, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.arc(-0.6, -0.6, 4.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#14532d'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(-3.5, 0)
      ctx.lineTo(3, 0)
      ctx.stroke()
      break
    }
    case 'lamp': {
      ctx.fillStyle = '#1e293b'
      ctx.beginPath()
      ctx.arc(0, 0, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(7, -5)
      ctx.stroke()
      ctx.fillStyle = night ? '#fef08a' : '#e2e8f0'
      ctx.beginPath()
      ctx.arc(7, -5, 2.8, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'person': {
      const step = Math.sin(t * 9 + o.seed * 20) * (Math.abs(o.vx) + Math.abs(o.vy) > 1 ? 2.2 : 0.3)
      ctx.fillStyle = o.color2
      ctx.beginPath()
      ctx.arc(3 + step, -4.5, 1.7, 0, Math.PI * 2)
      ctx.arc(3 - step, 4.5, 1.7, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = o.color
      ctx.beginPath()
      ctx.ellipse(0, 0, 3.4, 5.6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = o.color2
      ctx.beginPath()
      ctx.arc(0.6, 0, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#3f2a1d'
      ctx.beginPath()
      ctx.arc(-0.4, 0, 2.6, Math.PI * 0.5, Math.PI * 1.5)
      ctx.fill()
      break
    }
    case 'bush': {
      ctx.fillStyle = snow ? '#cbd5e1' : '#166534'
      ctx.beginPath()
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = snow ? '#f8fafc' : '#4ade80'
      for (const [bx, by] of [
        [-3, -2],
        [3, -3],
        [1, 3],
      ]) {
        ctx.beginPath()
        ctx.arc(bx, by, 4.3, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'bench': {
      ctx.fillStyle = '#44403c'
      ctx.fillRect(-10, -4.5, 2, 9)
      ctx.fillRect(8, -4.5, 2, 9)
      ctx.fillStyle = '#b45309'
      for (let i = 0; i < 3; i++) ctx.fillRect(-11, -4 + i * 3, 22, 2.2)
      break
    }
    case 'tree': {
      const sp = treeSprite(o.color, snow)
      const r = o.size * 1.25
      ctx.drawImage(sp, -r, -r, r * 2, r * 2)
      break
    }
    case 'car': {
      ctx.drawImage(carSprite(o.color), -18, -10, 36, 20)
      if (night) {
        ctx.fillStyle = 'rgba(254,240,138,0.28)'
        ctx.beginPath()
        ctx.moveTo(16, -6)
        ctx.lineTo(48, -16)
        ctx.lineTo(48, 16)
        ctx.lineTo(16, 6)
        ctx.closePath()
        ctx.fill()
      }
      break
    }
    case 'bus': {
      ctx.fillStyle = '#a16207'
      ctx.beginPath()
      ctx.roundRect(-29, -11, 58, 22, 4)
      ctx.fill()
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.roundRect(-28, -10, 56, 20, 4)
      ctx.fill()
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(22, -8, 4, 16)
      ctx.fillStyle = '#fde68a'
      ctx.fillRect(-22, -5, 38, 10)
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(-14, -3, 8, 6)
      ctx.fillRect(2, -3, 8, 6)
      break
    }
    case 'fountain': {
      ctx.fillStyle = '#64748b'
      ctx.beginPath()
      ctx.arc(0, 0, 30, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#cbd5e1'
      ctx.beginPath()
      ctx.arc(0, 0, 27, 0, Math.PI * 2)
      ctx.fill()
      const wg = ctx.createRadialGradient(-6, -6, 2, 0, 0, 23)
      wg.addColorStop(0, '#7dd3fc')
      wg.addColorStop(1, '#0284c7')
      ctx.fillStyle = wg
      ctx.beginPath()
      ctx.arc(0, 0, 23, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 1.5
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.6 + i * 0.5) % 1
        ctx.globalAlpha = 1 - k
        ctx.beginPath()
        ctx.arc(0, 0, 5 + k * 17, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = '#e2e8f0'
      ctx.beginPath()
      ctx.arc(0, 0, 5, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'statue': {
      const { ox, oy } = box(ctx, 0, 0, 44, 44, o.height * 0.4, camX - x, camY - y, '#a8a29e', 0, false)
      ctx.fillStyle = '#d6d3d1'
      ctx.fillRect(-22 + ox, -22 + oy, 44, 44)
      const fx2 = ox * 2.2
      const fy2 = oy * 2.2
      ctx.fillStyle = '#92400e'
      ctx.beginPath()
      ctx.ellipse(fx2, fy2, 10, 13, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#d97706'
      ctx.beginPath()
      ctx.arc(fx2 - 1, fy2 - 2, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#b45309'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(fx2 + 5, fy2)
      ctx.lineTo(fx2 + 13, fy2 - 9)
      ctx.stroke()
      break
    }
    case 'kiosk': {
      const { ox, oy } = box(ctx, 0, 0, o.w, o.h, o.height, camX - x, camY - y, o.color2, 0, false)
      const hw = o.w / 2
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 ? '#ffffff' : o.color
        ctx.fillRect(-hw + ox + (i * o.w) / 4, -hw + oy, o.w / 4, o.h)
      }
      break
    }
    case 'house': {
      const { ox, oy } = box(ctx, 0, 0, o.w, o.h, o.height, camX - x, camY - y, o.color2, 0, false)
      const hw = o.w / 2
      const hh = o.h / 2
      const rx = ox
      const ry = oy
      const ridge = o.height * 0.25
      // Pitched roof: two slopes meeting at a ridge.
      ctx.fillStyle = shade(o.color, 0.15)
      quad(ctx, -hw - 3 + rx, -hh - 3 + ry, hw + 3 + rx, -hh - 3 + ry, hw + 3 + rx * 1.25, ry * 1.25 + 0, -hw - 3 + rx * 1.25, ry * 1.25)
      ctx.fillStyle = shade(o.color, -0.2)
      quad(ctx, -hw - 3 + rx * 1.25, ry * 1.25, hw + 3 + rx * 1.25, ry * 1.25, hw + 3 + rx, hh + 3 + ry, -hw - 3 + rx, hh + 3 + ry)
      ctx.strokeStyle = shade(o.color, -0.45)
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-hw - 3 + rx * 1.25, ry * 1.25)
      ctx.lineTo(hw + 3 + rx * 1.25, ry * 1.25)
      ctx.stroke()
      ctx.fillStyle = '#57534e'
      ctx.fillRect(hw * 0.35 + rx * 1.1, -hh * 0.6 + ry * 1.1 - ridge * 0.1, 7, 9)
      if (night) {
        ctx.fillStyle = 'rgba(253,224,71,0.8)'
        ctx.fillRect(-hw * 0.5 + rx, hh + ry - 1, 6, 2)
      }
      break
    }
    case 'shop': {
      const { ox, oy } = box(ctx, 0, 0, o.w, o.h, o.height, camX - x, camY - y, o.color2, 3, night)
      const hw = o.w / 2
      const hh = o.h / 2
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(-hw + ox, -hh + oy, o.w, o.h)
      ctx.fillStyle = '#cbd5e1'
      ctx.fillRect(-hw + 4 + ox, -hh + 4 + oy, o.w - 8, o.h - 8)
      ctx.fillStyle = o.color
      ctx.fillRect(-hw + ox, hh - 8 + oy, o.w, 8)
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(-hw * 0.5 + ox, -hh * 0.4 + oy, 12, 10)
      ctx.fillRect(hw * 0.1 + ox, -hh * 0.5 + oy, 10, 8)
      break
    }
    case 'tower':
    case 'sky': {
      const glass = o.kind === 'sky'
      const { ox, oy } = box(ctx, 0, 0, o.w, o.h, o.height, camX - x, camY - y, glass ? o.color : o.color, glass ? 9 : 6, night)
      const hw = o.w / 2
      const hh = o.h / 2
      const rg = ctx.createLinearGradient(-hw + ox, -hh + oy, hw + ox, hh + oy)
      rg.addColorStop(0, shade(o.color, 0.35))
      rg.addColorStop(1, shade(o.color, -0.15))
      ctx.fillStyle = rg
      ctx.fillRect(-hw + ox, -hh + oy, o.w, o.h)
      ctx.strokeStyle = shade(o.color, -0.4)
      ctx.lineWidth = 3
      ctx.strokeRect(-hw + 5 + ox, -hh + 5 + oy, o.w - 10, o.h - 10)
      if (glass) {
        ctx.strokeStyle = '#e2e8f0'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(ox, oy)
        ctx.lineTo(ox * 1.25, oy * 1.25)
        ctx.stroke()
        ctx.fillStyle = Math.sin(t * 4) > 0 ? '#ef4444' : '#7f1d1d'
        ctx.beginPath()
        ctx.arc(ox * 1.25, oy * 1.25, 3.5, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.strokeStyle = '#facc15'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(ox, oy, o.w * 0.18, 0, Math.PI * 2)
        ctx.moveTo(ox - 5, oy - 6)
        ctx.lineTo(ox - 5, oy + 6)
        ctx.moveTo(ox + 5, oy - 6)
        ctx.lineTo(ox + 5, oy + 6)
        ctx.moveTo(ox - 5, oy)
        ctx.lineTo(ox + 5, oy)
        ctx.stroke()
      }
      break
    }
    case 'monument': {
      const tiers = [
        [1, 0.35],
        [0.68, 0.7],
        [0.38, 1],
      ]
      let ox = 0
      let oy = 0
      for (const [k, hk] of tiers) {
        const r = box(ctx, 0, 0, o.w * k, o.h * k, o.height * hk, camX - x, camY - y, k === 0.38 ? '#fbbf24' : '#d6d3d1', k === 1 ? 4 : 0, night)
        ox = r.ox
        oy = r.oy
        const g = ctx.createLinearGradient(-o.w * k * 0.5 + ox, -o.h * k * 0.5 + oy, o.w * k * 0.5 + ox, o.h * k * 0.5 + oy)
        g.addColorStop(0, k === 0.38 ? '#fde68a' : '#f5f5f4')
        g.addColorStop(1, k === 0.38 ? '#d97706' : '#a8a29e')
        ctx.fillStyle = g
        ctx.fillRect(-o.w * k * 0.5 + ox, -o.h * k * 0.5 + oy, o.w * k, o.h * k)
      }
      ctx.fillStyle = '#fef3c7'
      ctx.beginPath()
      ctx.arc(ox, oy, 10 + Math.sin(t * 3) * 2, 0, Math.PI * 2)
      ctx.fill()
      break
    }
  }
  ctx.restore()
}
