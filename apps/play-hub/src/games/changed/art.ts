/** Vector art for What Changed?: scene backgrounds and ~24 objects drawn centred at the origin. */

export type Theme = 'room' | 'park' | 'desk' | 'aquarium'
export const THEMES: Theme[] = ['room', 'park', 'aquarium', 'desk']
export const THEME_NAME: Record<Theme, string> = { room: 'Cosy room', park: 'Sunny park', desk: 'Study desk', aquarium: 'Aquarium' }

export type Kind =
  | 'fish' | 'starfish' | 'shell' | 'crab' | 'seaweed' | 'jelly' | 'chest'
  | 'tree' | 'flower' | 'mushroom' | 'duck' | 'butterfly' | 'balloon' | 'bench'
  | 'mug' | 'book' | 'pencil' | 'apple' | 'lamp' | 'plant' | 'clock' | 'frame'
  | 'ball' | 'cat' | 'gift' | 'cupcake'

export const THEME_KINDS: Record<Theme, Kind[]> = {
  room: ['lamp', 'plant', 'clock', 'frame', 'book', 'mug', 'ball', 'cat', 'gift', 'balloon', 'cupcake'],
  park: ['tree', 'flower', 'mushroom', 'duck', 'butterfly', 'balloon', 'ball', 'apple', 'bench', 'cat'],
  desk: ['mug', 'book', 'pencil', 'apple', 'clock', 'plant', 'cupcake', 'gift', 'lamp', 'frame'],
  aquarium: ['fish', 'starfish', 'shell', 'crab', 'seaweed', 'jelly', 'chest', 'fish'],
}

/** Kinds whose left/right mirror image is clearly different. */
export const FLIPPABLE = new Set<Kind>(['fish', 'duck', 'mug', 'cat', 'bench', 'lamp'])
/** Kinds whose 90° tilt reads clearly. */
export const TILTABLE = new Set<Kind>(['pencil', 'book', 'frame', 'mushroom', 'tree', 'plant', 'cupcake', 'seaweed', 'chest', 'gift'])

/** Palette paired by luminance so colour swaps also change brightness. */
export const COLORS = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f8fafc', '#78350f']

export function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)))
  const r = f((n >> 16) & 255)
  const g = f((n >> 8) & 255)
  const b = f(n & 255)
  return `rgb(${r},${g},${b})`
}

const OUT = 'rgba(30,20,40,0.55)'

function outline(ctx: CanvasRenderingContext2D, w = 1.6) {
  ctx.strokeStyle = OUT
  ctx.lineWidth = w
  ctx.stroke()
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1e1b4b'
  ctx.beginPath()
  ctx.arc(x + r * 0.15, y + r * 0.1, r * 0.55, 0, Math.PI * 2)
  ctx.fill()
}

/** Draws an object of size s (≈ bounding box) centred at the origin. */
export function drawObj(ctx: CanvasRenderingContext2D, kind: Kind, s: number, color: string, t: number) {
  const h = s / 2
  const light = shade(color, 0.35)
  const dark = shade(color, -0.35)
  switch (kind) {
    case 'fish': {
      const wag = Math.sin(t * 6) * 0.12
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.moveTo(-h * 0.5, 0)
      ctx.lineTo(-h * 0.95, -h * (0.4 + wag))
      ctx.lineTo(-h * 0.95, h * (0.4 - wag))
      ctx.closePath()
      ctx.fill()
      const g = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5)
      g.addColorStop(0, light)
      g.addColorStop(1, color)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(h * 0.08, 0, h * 0.62, h * 0.42, 0, 0, Math.PI * 2)
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.moveTo(-h * 0.05, -h * 0.38)
      ctx.quadraticCurveTo(h * 0.15, -h * 0.7, h * 0.3, -h * 0.36)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(h * 0.05, 0, h * 0.25, -1, 1)
      ctx.stroke()
      eye(ctx, h * 0.42, -h * 0.08, h * 0.11)
      break
    }
    case 'starfish': {
      ctx.fillStyle = color
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const d = i % 2 ? h * 0.38 : h * 0.92
        if (i === 0) ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d)
        else ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d)
      }
      ctx.closePath()
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = light
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
        ctx.beginPath()
        ctx.arc(Math.cos(a) * h * 0.45, Math.sin(a) * h * 0.45, h * 0.07, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'shell': {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(0, h * 0.75)
      ctx.lineTo(-h * 0.85, -h * 0.1)
      ctx.quadraticCurveTo(0, -h * 1.05, h * 0.85, -h * 0.1)
      ctx.closePath()
      ctx.fill()
      outline(ctx)
      ctx.strokeStyle = dark
      ctx.lineWidth = 1.8
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        ctx.moveTo(0, h * 0.7)
        ctx.lineTo(i * h * 0.3, -h * 0.5 + Math.abs(i) * h * 0.12)
        ctx.stroke()
      }
      ctx.fillStyle = light
      ctx.fillRect(-h * 0.2, h * 0.6, h * 0.4, h * 0.2)
      break
    }
    case 'crab': {
      ctx.strokeStyle = dark
      ctx.lineWidth = h * 0.08
      ctx.lineCap = 'round'
      for (const sd of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.moveTo(sd * h * 0.4, h * 0.1 + i * h * 0.12)
          ctx.lineTo(sd * h * 0.85, h * 0.3 + i * h * 0.18)
          ctx.stroke()
        }
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(sd * h * 0.72, -h * 0.45, h * 0.2, 0, Math.PI * 2)
        ctx.fill()
        outline(ctx)
      }
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(0, h * 0.1, h * 0.55, h * 0.38, 0, 0, Math.PI * 2)
      ctx.fill()
      outline(ctx)
      eye(ctx, -h * 0.18, -h * 0.25, h * 0.11)
      eye(ctx, h * 0.18, -h * 0.25, h * 0.11)
      break
    }
    case 'seaweed': {
      const sway = Math.sin(t * 2) * h * 0.08
      ctx.fillStyle = color
      for (const off of [-0.3, 0.1, 0.4]) {
        ctx.beginPath()
        ctx.moveTo(off * h - h * 0.1, h)
        ctx.quadraticCurveTo(off * h - h * 0.4 + sway, 0, off * h + sway, -h * (0.8 - Math.abs(off) * 0.4))
        ctx.quadraticCurveTo(off * h + h * 0.2 + sway, 0, off * h + h * 0.1, h)
        ctx.closePath()
        ctx.fill()
        outline(ctx, 1.2)
      }
      break
    }
    case 'jelly': {
      const pulse = 1 + Math.sin(t * 3) * 0.04
      ctx.strokeStyle = light
      ctx.lineWidth = 2
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        ctx.moveTo(i * h * 0.2, 0)
        ctx.quadraticCurveTo(i * h * 0.2 + Math.sin(t * 3 + i) * h * 0.12, h * 0.5, i * h * 0.22, h * 0.9)
        ctx.stroke()
      }
      ctx.globalAlpha = 0.9
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(0, 0, h * 0.65 * pulse, h * 0.55, 0, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
      outline(ctx)
      eye(ctx, -h * 0.2, -h * 0.2, h * 0.08)
      eye(ctx, h * 0.2, -h * 0.2, h * 0.08)
      break
    }
    case 'chest': {
      ctx.fillStyle = '#92400e'
      ctx.beginPath()
      ctx.roundRect(-h * 0.8, -h * 0.2, h * 1.6, h * 0.85, 3)
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(-h * 0.8, -h * 0.2)
      ctx.quadraticCurveTo(0, -h * 0.85, h * 0.8, -h * 0.2)
      ctx.closePath()
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = '#facc15'
      ctx.fillRect(-h * 0.12, -h * 0.3, h * 0.24, h * 0.4)
      ctx.fillStyle = '#78350f'
      ctx.fillRect(-h * 0.8, h * 0.25, h * 1.6, h * 0.08)
      break
    }
    case 'tree': {
      ctx.fillStyle = '#92400e'
      ctx.fillRect(-h * 0.12, h * 0.1, h * 0.24, h * 0.9)
      ctx.fillStyle = color
      for (const [x, y, r] of [[-0.3, -0.1, 0.42], [0.3, -0.1, 0.42], [0, -0.45, 0.5]]) {
        ctx.beginPath()
        ctx.arc(x * h, y * h, r * h, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = light
      ctx.beginPath()
      ctx.arc(-h * 0.15, -h * 0.55, h * 0.18, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ef4444'
      for (const [x, y] of [[0.25, -0.25], [-0.35, 0.0], [0.05, -0.6]]) {
        ctx.beginPath()
        ctx.arc(x * h, y * h, h * 0.07, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'flower': {
      ctx.strokeStyle = '#16a34a'
      ctx.lineWidth = h * 0.1
      ctx.beginPath()
      ctx.moveTo(0, h)
      ctx.quadraticCurveTo(h * 0.1, h * 0.4, 0, -h * 0.1)
      ctx.stroke()
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.ellipse(h * 0.22, h * 0.45, h * 0.22, h * 0.09, -0.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = color
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + Math.sin(t) * 0.05
        ctx.beginPath()
        ctx.ellipse(Math.cos(a) * h * 0.3, -h * 0.35 + Math.sin(a) * h * 0.3, h * 0.2, h * 0.13, a, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(0, -h * 0.35, h * 0.16, 0, Math.PI * 2)
      ctx.fill()
      outline(ctx, 1.2)
      break
    }
    case 'mushroom': {
      ctx.fillStyle = '#fef3c7'
      ctx.beginPath()
      ctx.roundRect(-h * 0.2, -h * 0.05, h * 0.4, h * 0.9, h * 0.12)
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(0, -h * 0.1, h * 0.8, h * 0.6, 0, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = '#fff'
      for (const [x, y, r] of [[-0.4, -0.3, 0.12], [0.1, -0.5, 0.14], [0.45, -0.25, 0.1]]) {
        ctx.beginPath()
        ctx.arc(x * h, y * h, r * h, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'duck': {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(-h * 0.1, h * 0.25, h * 0.7, h * 0.42, 0, 0, Math.PI * 2)
      ctx.fill()
      outline(ctx)
      ctx.beginPath()
      ctx.arc(h * 0.35, -h * 0.3, h * 0.32, 0, Math.PI * 2)
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.moveTo(h * 0.6, -h * 0.32)
      ctx.lineTo(h * 0.95, -h * 0.22)
      ctx.lineTo(h * 0.6, -h * 0.14)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.ellipse(-h * 0.2, h * 0.2, h * 0.35, h * 0.18, -0.2, 0, Math.PI * 2)
      ctx.fill()
      eye(ctx, h * 0.42, -h * 0.38, h * 0.08)
      break
    }
    case 'butterfly': {
      const flap = 0.75 + Math.abs(Math.sin(t * 5)) * 0.25
      ctx.fillStyle = color
      for (const sd of [-1, 1]) {
        ctx.beginPath()
        ctx.ellipse(sd * h * 0.42 * flap, -h * 0.22, h * 0.42 * flap, h * 0.36, sd * 0.5, 0, Math.PI * 2)
        ctx.fill()
        outline(ctx, 1.2)
        ctx.beginPath()
        ctx.ellipse(sd * h * 0.32 * flap, h * 0.32, h * 0.28 * flap, h * 0.25, -sd * 0.4, 0, Math.PI * 2)
        ctx.fill()
        outline(ctx, 1.2)
      }
      ctx.fillStyle = light
      ctx.beginPath()
      ctx.arc(-h * 0.42 * flap, -h * 0.22, h * 0.12, 0, Math.PI * 2)
      ctx.arc(h * 0.42 * flap, -h * 0.22, h * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1e1b4b'
      ctx.beginPath()
      ctx.ellipse(0, 0, h * 0.08, h * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'balloon': {
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(0, h * 0.35)
      ctx.quadraticCurveTo(h * 0.15, h * 0.65, 0, h)
      ctx.stroke()
      const g = ctx.createRadialGradient(-h * 0.2, -h * 0.35, 1, 0, -h * 0.15, h * 0.6)
      g.addColorStop(0, light)
      g.addColorStop(1, color)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(0, -h * 0.15, h * 0.48, h * 0.58, 0, 0, Math.PI * 2)
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = dark
      ctx.beginPath()
      ctx.moveTo(-h * 0.08, h * 0.47)
      ctx.lineTo(h * 0.08, h * 0.47)
      ctx.lineTo(0, h * 0.38)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.ellipse(-h * 0.2, -h * 0.38, h * 0.08, h * 0.15, 0.4, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'bench': {
      ctx.fillStyle = '#334155'
      ctx.fillRect(-h * 0.8, h * 0.2, h * 0.1, h * 0.6)
      ctx.fillRect(h * 0.6, h * 0.2, h * 0.1, h * 0.6)
      ctx.fillRect(-h * 0.8, -h * 0.5, h * 0.1, h * 0.7)
      ctx.fillStyle = color
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.roundRect(-h * 0.9, -h * 0.5 + i * h * 0.22, h * 1.75 - (i === 2 ? 0 : h * 0.15), h * 0.15, 2)
        ctx.fill()
        outline(ctx, 1.2)
      }
      break
    }
    case 'mug': {
      ctx.strokeStyle = dark
      ctx.lineWidth = h * 0.14
      ctx.beginPath()
      ctx.arc(h * 0.5, 0, h * 0.25, -Math.PI / 2, Math.PI / 2)
      ctx.stroke()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(-h * 0.55, -h * 0.55, h * 1.05, h * 1.15, h * 0.15)
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = '#78350f'
      ctx.beginPath()
      ctx.ellipse(-h * 0.03, -h * 0.5, h * 0.45, h * 0.1, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = light
      ctx.beginPath()
      ctx.arc(-h * 0.05, h * 0.05, h * 0.18, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-h * 0.1, -h * 0.75 - Math.sin(t * 2) * 3)
      ctx.quadraticCurveTo(h * 0.05, -h * 0.9, -h * 0.05, -h * 1.0)
      ctx.stroke()
      break
    }
    case 'book': {
      ctx.fillStyle = '#f8fafc'
      ctx.fillRect(-h * 0.55, -h * 0.7, h * 1.15, h * 1.4)
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(-h * 0.65, -h * 0.75, h * 1.15, h * 1.45, 3)
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = dark
      ctx.fillRect(-h * 0.65, -h * 0.75, h * 0.18, h * 1.45)
      ctx.fillStyle = light
      ctx.fillRect(-h * 0.25, -h * 0.4, h * 0.55, h * 0.12)
      ctx.fillRect(-h * 0.25, -h * 0.18, h * 0.4, h * 0.08)
      break
    }
    case 'pencil': {
      ctx.save()
      ctx.rotate(-0.7)
      ctx.fillStyle = color
      ctx.fillRect(-h * 0.7, -h * 0.13, h * 1.15, h * 0.26)
      ctx.strokeStyle = OUT
      ctx.lineWidth = 1.4
      ctx.strokeRect(-h * 0.7, -h * 0.13, h * 1.15, h * 0.26)
      ctx.fillStyle = '#fde68a'
      ctx.beginPath()
      ctx.moveTo(h * 0.45, -h * 0.13)
      ctx.lineTo(h * 0.85, 0)
      ctx.lineTo(h * 0.45, h * 0.13)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#1e1b4b'
      ctx.beginPath()
      ctx.moveTo(h * 0.72, -h * 0.04)
      ctx.lineTo(h * 0.85, 0)
      ctx.lineTo(h * 0.72, h * 0.04)
      ctx.fill()
      ctx.fillStyle = '#f472b6'
      ctx.fillRect(-h * 0.9, -h * 0.13, h * 0.2, h * 0.26)
      ctx.fillStyle = '#cbd5e1'
      ctx.fillRect(-h * 0.72, -h * 0.13, h * 0.08, h * 0.26)
      ctx.restore()
      break
    }
    case 'apple': {
      const g = ctx.createRadialGradient(-h * 0.25, -h * 0.2, 1, 0, 0, h * 0.75)
      g.addColorStop(0, light)
      g.addColorStop(1, color)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(0, -h * 0.4)
      ctx.bezierCurveTo(h * 0.5, -h * 0.8, h * 0.95, -h * 0.2, h * 0.7, h * 0.3)
      ctx.bezierCurveTo(h * 0.5, h * 0.8, h * 0.15, h * 0.75, 0, h * 0.6)
      ctx.bezierCurveTo(-h * 0.15, h * 0.75, -h * 0.5, h * 0.8, -h * 0.7, h * 0.3)
      ctx.bezierCurveTo(-h * 0.95, -h * 0.2, -h * 0.5, -h * 0.8, 0, -h * 0.4)
      ctx.fill()
      outline(ctx)
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(0, -h * 0.4)
      ctx.lineTo(h * 0.08, -h * 0.75)
      ctx.stroke()
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.ellipse(h * 0.28, -h * 0.68, h * 0.2, h * 0.09, -0.4, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'lamp': {
      ctx.fillStyle = '#475569'
      ctx.beginPath()
      ctx.ellipse(0, h * 0.85, h * 0.4, h * 0.12, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = h * 0.08
      ctx.beginPath()
      ctx.moveTo(0, h * 0.8)
      ctx.lineTo(-h * 0.25, h * 0.1)
      ctx.lineTo(h * 0.15, -h * 0.35)
      ctx.stroke()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(h * 0.0, -h * 0.75)
      ctx.lineTo(h * 0.4, -h * 0.75)
      ctx.lineTo(h * 0.75, -h * 0.15)
      ctx.lineTo(-h * 0.25, -h * 0.15)
      ctx.closePath()
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = 'rgba(254,240,138,0.35)'
      ctx.beginPath()
      ctx.moveTo(-h * 0.2, -h * 0.15)
      ctx.lineTo(h * 0.7, -h * 0.15)
      ctx.lineTo(h * 0.95, h * 0.6)
      ctx.lineTo(-h * 0.35, h * 0.6)
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'plant': {
      ctx.fillStyle = '#16a34a'
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        ctx.ellipse(i * h * 0.2, -h * 0.35 + Math.abs(i) * h * 0.1, h * 0.14, h * 0.45, i * 0.35, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#4ade80'
      ctx.beginPath()
      ctx.ellipse(0, -h * 0.5, h * 0.1, h * 0.35, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(-h * 0.5, h * 0.05)
      ctx.lineTo(h * 0.5, h * 0.05)
      ctx.lineTo(h * 0.36, h * 0.9)
      ctx.lineTo(-h * 0.36, h * 0.9)
      ctx.closePath()
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = dark
      ctx.fillRect(-h * 0.55, h * 0.02, h * 1.1, h * 0.15)
      break
    }
    case 'clock': {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(0, 0, h * 0.8, 0, Math.PI * 2)
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = '#fffbeb'
      ctx.beginPath()
      ctx.arc(0, 0, h * 0.62, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1e1b4b'
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6
        ctx.beginPath()
        ctx.arc(Math.cos(a) * h * 0.5, Math.sin(a) * h * 0.5, i % 3 ? h * 0.025 : h * 0.05, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = '#1e1b4b'
      ctx.lineCap = 'round'
      ctx.lineWidth = h * 0.07
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, -h * 0.4)
      ctx.moveTo(0, 0)
      ctx.lineTo(h * 0.28, h * 0.08)
      ctx.stroke()
      break
    }
    case 'frame': {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(-h * 0.85, -h * 0.65, h * 1.7, h * 1.3, 3)
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = '#bae6fd'
      ctx.fillRect(-h * 0.65, -h * 0.45, h * 1.3, h * 0.9)
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.moveTo(-h * 0.65, h * 0.45)
      ctx.lineTo(-h * 0.2, -h * 0.15)
      ctx.lineTo(h * 0.1, h * 0.15)
      ctx.lineTo(h * 0.35, -h * 0.05)
      ctx.lineTo(h * 0.65, h * 0.45)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(h * 0.38, -h * 0.25, h * 0.1, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'ball': {
      const g = ctx.createRadialGradient(-h * 0.25, -h * 0.25, 1, 0, 0, h * 0.7)
      g.addColorStop(0, light)
      g.addColorStop(1, color)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, h * 0.62, 0, Math.PI * 2)
      ctx.fill()
      outline(ctx)
      ctx.strokeStyle = luminance(color) > 0.8 ? '#ef4444' : '#fff'
      ctx.lineWidth = h * 0.1
      ctx.beginPath()
      ctx.arc(0, 0, h * 0.62, -0.4, 0.9)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(-h * 0.9, h * 0.1, h * 0.75, -0.7, 0.6)
      ctx.stroke()
      break
    }
    case 'cat': {
      ctx.strokeStyle = color
      ctx.lineWidth = h * 0.14
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-h * 0.5, h * 0.5)
      ctx.quadraticCurveTo(-h * 1.0, h * 0.2 + Math.sin(t * 2) * h * 0.1, -h * 0.8, -h * 0.2)
      ctx.stroke()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.ellipse(-h * 0.1, h * 0.4, h * 0.55, h * 0.38, 0, 0, Math.PI * 2)
      ctx.fill()
      outline(ctx)
      ctx.beginPath()
      ctx.moveTo(h * 0.1, -h * 0.45)
      ctx.lineTo(h * 0.18, -h * 0.85)
      ctx.lineTo(h * 0.38, -h * 0.55)
      ctx.lineTo(h * 0.62, -h * 0.85)
      ctx.lineTo(h * 0.7, -h * 0.45)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.arc(h * 0.4, -h * 0.25, h * 0.36, 0, Math.PI * 2)
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = '#1e1b4b'
      ctx.beginPath()
      ctx.ellipse(h * 0.28, -h * 0.28, h * 0.05, h * 0.09, 0, 0, Math.PI * 2)
      ctx.ellipse(h * 0.54, -h * 0.28, h * 0.05, h * 0.09, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f472b6'
      ctx.beginPath()
      ctx.arc(h * 0.41, -h * 0.15, h * 0.04, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'gift': {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.roundRect(-h * 0.65, -h * 0.25, h * 1.3, h * 1.0, 3)
      ctx.fill()
      outline(ctx)
      ctx.fillStyle = dark
      ctx.fillRect(-h * 0.75, -h * 0.45, h * 1.5, h * 0.25)
      ctx.fillStyle = '#fde047'
      ctx.fillRect(-h * 0.1, -h * 0.45, h * 0.2, h * 1.2)
      ctx.beginPath()
      ctx.ellipse(-h * 0.22, -h * 0.58, h * 0.22, h * 0.13, 0.5, 0, Math.PI * 2)
      ctx.ellipse(h * 0.22, -h * 0.58, h * 0.22, h * 0.13, -0.5, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'cupcake': {
      ctx.fillStyle = '#d97706'
      ctx.beginPath()
      ctx.moveTo(-h * 0.5, 0)
      ctx.lineTo(h * 0.5, 0)
      ctx.lineTo(h * 0.36, h * 0.8)
      ctx.lineTo(-h * 0.36, h * 0.8)
      ctx.closePath()
      ctx.fill()
      outline(ctx)
      ctx.strokeStyle = '#92400e'
      ctx.lineWidth = 1.5
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath()
        ctx.moveTo(i * h * 0.17, h * 0.05)
        ctx.lineTo(i * h * 0.13, h * 0.75)
        ctx.stroke()
      }
      ctx.fillStyle = color
      for (const [x, y, r] of [[-0.3, -0.1, 0.3], [0.3, -0.1, 0.3], [0, -0.35, 0.33]]) {
        ctx.beginPath()
        ctx.arc(x * h, y * h, r * h, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(0, -h * 0.72, h * 0.12, 0, Math.PI * 2)
      ctx.fill()
      break
    }
  }
}

/** Paints the scene background into the stage rectangle. */
export function drawBackdrop(ctx: CanvasRenderingContext2D, theme: Theme, x: number, y: number, w: number, h: number, t: number) {
  if (theme === 'room') {
    const wall = ctx.createLinearGradient(0, y, 0, y + h * 0.6)
    wall.addColorStop(0, '#fde7c8')
    wall.addColorStop(1, '#f8d4a8')
    ctx.fillStyle = wall
    ctx.fillRect(x, y, w, h * 0.6)
    ctx.fillStyle = 'rgba(234,88,12,0.08)'
    for (let i = 0; i < w; i += 28) ctx.fillRect(x + i, y, 12, h * 0.6)
    // Window
    ctx.fillStyle = '#92400e'
    ctx.fillRect(x + w * 0.62, y + h * 0.06, w * 0.3, h * 0.24)
    const sky = ctx.createLinearGradient(0, y + h * 0.07, 0, y + h * 0.29)
    sky.addColorStop(0, '#7dd3fc')
    sky.addColorStop(1, '#e0f2fe')
    ctx.fillStyle = sky
    ctx.fillRect(x + w * 0.635, y + h * 0.075, w * 0.27, h * 0.21)
    ctx.fillStyle = '#92400e'
    ctx.fillRect(x + w * 0.765, y + h * 0.075, 3, h * 0.21)
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.ellipse(x + w * 0.7 + Math.sin(t * 0.3) * 6, y + h * 0.14, 14, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    // Floor
    const fl = ctx.createLinearGradient(0, y + h * 0.6, 0, y + h)
    fl.addColorStop(0, '#b45309')
    fl.addColorStop(1, '#78350f')
    ctx.fillStyle = fl
    ctx.fillRect(x, y + h * 0.6, w, h * 0.4)
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 1.5
    for (let i = 1; i < 5; i++) {
      const yy = y + h * 0.6 + i * h * 0.08
      ctx.beginPath()
      ctx.moveTo(x, yy)
      ctx.lineTo(x + w, yy)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(236,72,153,0.25)'
    ctx.beginPath()
    ctx.ellipse(x + w * 0.5, y + h * 0.8, w * 0.38, h * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fef3c7'
    ctx.fillRect(x, y + h * 0.59, w, 4)
  } else if (theme === 'park') {
    const sky = ctx.createLinearGradient(0, y, 0, y + h * 0.45)
    sky.addColorStop(0, '#38bdf8')
    sky.addColorStop(1, '#bae6fd')
    ctx.fillStyle = sky
    ctx.fillRect(x, y, w, h * 0.45)
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(x + w * 0.85, y + h * 0.08, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    for (const [cx, cy] of [[0.2, 0.08], [0.55, 0.14]]) {
      const ox = Math.sin(t * 0.2 + cx * 9) * 8
      ctx.beginPath()
      ctx.ellipse(x + w * cx + ox, y + h * cy, 26, 9, 0, 0, Math.PI * 2)
      ctx.ellipse(x + w * cx + ox + 14, y + h * cy - 6, 16, 9, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#4ade80'
    ctx.beginPath()
    ctx.moveTo(x, y + h * 0.42)
    ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.3, x + w * 0.6, y + h * 0.4)
    ctx.quadraticCurveTo(x + w * 0.85, y + h * 0.33, x + w, y + h * 0.38)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x, y + h)
    ctx.fill()
    const gr = ctx.createLinearGradient(0, y + h * 0.42, 0, y + h)
    gr.addColorStop(0, '#22c55e')
    gr.addColorStop(1, '#15803d')
    ctx.fillStyle = gr
    ctx.fillRect(x, y + h * 0.45, w, h * 0.55)
    ctx.fillStyle = '#fde68a'
    ctx.beginPath()
    ctx.moveTo(x + w * 0.45, y + h * 0.45)
    ctx.quadraticCurveTo(x + w * 0.2, y + h * 0.75, x + w * 0.35, y + h)
    ctx.lineTo(x + w * 0.65, y + h)
    ctx.quadraticCurveTo(x + w * 0.45, y + h * 0.75, x + w * 0.55, y + h * 0.45)
    ctx.fill()
  } else if (theme === 'desk') {
    const wood = ctx.createLinearGradient(x, 0, x + w, 0)
    wood.addColorStop(0, '#a16207')
    wood.addColorStop(0.5, '#ca8a04')
    wood.addColorStop(1, '#a16207')
    ctx.fillStyle = wood
    ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = 'rgba(120,53,15,0.25)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 9; i++) {
      ctx.beginPath()
      const yy = y + (i + 0.5) * (h / 9)
      ctx.moveTo(x, yy)
      ctx.bezierCurveTo(x + w * 0.3, yy - 6, x + w * 0.6, yy + 6, x + w, yy)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(22,101,52,0.85)'
    ctx.beginPath()
    ctx.roundRect(x + w * 0.08, y + h * 0.2, w * 0.84, h * 0.6, 10)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 2
    ctx.stroke()
  } else {
    const water = ctx.createLinearGradient(0, y, 0, y + h)
    water.addColorStop(0, '#0ea5e9')
    water.addColorStop(1, '#0c4a6e')
    ctx.fillStyle = water
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      const bx = x + w * (0.1 + i * 0.25) + Math.sin(t * 0.5 + i) * 10
      ctx.moveTo(bx, y)
      ctx.lineTo(bx + 30, y)
      ctx.lineTo(bx + 70, y + h * 0.8)
      ctx.lineTo(bx + 20, y + h * 0.8)
      ctx.fill()
    }
    ctx.fillStyle = '#fde68a'
    ctx.beginPath()
    ctx.moveTo(x, y + h * 0.88)
    ctx.quadraticCurveTo(x + w * 0.3, y + h * 0.82, x + w * 0.6, y + h * 0.87)
    ctx.quadraticCurveTo(x + w * 0.85, y + h * 0.9, x + w, y + h * 0.85)
    ctx.lineTo(x + w, y + h)
    ctx.lineTo(x, y + h)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    for (let i = 0; i < 8; i++) {
      const bx = x + ((i * 53) % w)
      const by = y + h - (((t * 30 + i * 70) % (h * 0.9)) + 10)
      ctx.beginPath()
      ctx.arc(bx + Math.sin(t * 2 + i) * 4, by, 2 + (i % 3), 0, Math.PI * 2)
      ctx.fill()
    }
  }
}
