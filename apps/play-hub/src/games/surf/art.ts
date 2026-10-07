/** Vector art for Wave Surfer (side view). */

const PAD = 10
const SCALE = 2
const cache = new Map<string, HTMLCanvasElement>()

export function sprite(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = (w + PAD * 2) * SCALE
  c.height = (h + PAD * 2) * SCALE
  const g = c.getContext('2d')!
  g.scale(SCALE, SCALE)
  g.translate(PAD + w / 2, PAD + h / 2)
  draw(g)
  cache.set(key, c)
  return c
}

export function blit(ctx: CanvasRenderingContext2D, spr: HTMLCanvasElement, x: number, y: number, w: number, h: number, rot = 0) {
  if (rot) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.drawImage(spr, -w / 2 - PAD, -h / 2 - PAD, w + PAD * 2, h + PAD * 2)
    ctx.restore()
  } else ctx.drawImage(spr, x - w / 2 - PAD, y - h / 2 - PAD, w + PAD * 2, h + PAD * 2)
}

/** Surfer on a board, board centre at origin, facing right. */
export function drawSurfer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rot: number,
  t: number,
  o: { suit: string; board: string; stripe: string; hair: string; crouch: number; arms: number; scale?: number; fallen?: boolean },
) {
  const s = o.scale ?? 1
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(s, s)
  // board
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(1, 3, 25, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  const bg = ctx.createLinearGradient(0, -4, 0, 4)
  bg.addColorStop(0, '#ffffff')
  bg.addColorStop(0.4, o.board)
  bg.addColorStop(1, shade(o.board, -0.35))
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.moveTo(-24, 0)
  ctx.quadraticCurveTo(-22, -4.5, 0, -4.5)
  ctx.quadraticCurveTo(22, -4.5, 27, 0)
  ctx.quadraticCurveTo(22, 3.5, 0, 3.5)
  ctx.quadraticCurveTo(-22, 3.5, -24, 0)
  ctx.fill()
  ctx.fillStyle = o.stripe
  ctx.fillRect(-14, -1.5, 30, 2.2)
  ctx.fillStyle = shade(o.board, -0.5)
  ctx.beginPath()
  ctx.moveTo(-18, 3)
  ctx.lineTo(-22, 9)
  ctx.lineTo(-14, 3)
  ctx.fill()
  if (o.fallen) {
    ctx.restore()
    return
  }
  const c = o.crouch // 0 stand .. 1 deep crouch
  const hipY = -14 + c * 5
  // legs
  ctx.strokeStyle = o.suit
  ctx.lineCap = 'round'
  ctx.lineWidth = 4.5
  ctx.beginPath()
  ctx.moveTo(-8, -4)
  ctx.lineTo(-6 - c * 3, hipY + 6 + c * 2)
  ctx.lineTo(-2, hipY)
  ctx.moveTo(8, -4)
  ctx.lineTo(7 + c * 2, hipY + 6)
  ctx.lineTo(2, hipY)
  ctx.stroke()
  // torso leaning forward
  const lean = 0.25 + c * 0.35
  const shX = Math.sin(lean) * 14
  const shY = hipY - Math.cos(lean) * 14
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(0, hipY)
  ctx.lineTo(shX, shY)
  ctx.stroke()
  // arms (balance)
  const a = o.arms + Math.sin(t * 5) * 0.12
  ctx.lineWidth = 3.4
  ctx.strokeStyle = '#f0b48a'
  ctx.beginPath()
  ctx.moveTo(shX, shY + 1)
  ctx.lineTo(shX - 11, shY + 2 - a * 10)
  ctx.moveTo(shX, shY + 1)
  ctx.lineTo(shX + 12, shY + 4 + a * 6)
  ctx.stroke()
  // head
  ctx.fillStyle = '#f0b48a'
  ctx.beginPath()
  ctx.arc(shX + 3, shY - 6, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = o.hair
  ctx.beginPath()
  ctx.arc(shX + 2, shY - 8, 5.2, Math.PI * 0.9, Math.PI * 2.1)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(shX - 3, shY - 8)
  ctx.lineTo(shX - 8, shY - 5 + Math.sin(t * 9) * 1.5)
  ctx.lineTo(shX - 2, shY - 5)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(shX + 6, shY - 6.5, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function rockSprite() {
  return sprite('rock', 60, 40, (g) => {
    g.fillStyle = '#1e293b'
    g.beginPath()
    g.moveTo(-28, 18)
    g.lineTo(-20, -4)
    g.lineTo(-8, -16)
    g.lineTo(6, -10)
    g.lineTo(14, -18)
    g.lineTo(26, 0)
    g.lineTo(29, 18)
    g.closePath()
    g.fill()
    g.fillStyle = '#334155'
    g.beginPath()
    g.moveTo(-20, -4)
    g.lineTo(-8, -16)
    g.lineTo(-2, -2)
    g.lineTo(-14, 6)
    g.closePath()
    g.fill()
    g.beginPath()
    g.moveTo(6, -10)
    g.lineTo(14, -18)
    g.lineTo(18, -4)
    g.closePath()
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.85)'
    g.beginPath()
    g.ellipse(0, 18, 32, 4, 0, 0, Math.PI * 2)
    g.fill()
  })
}

export function buoySprite() {
  return sprite('buoy', 28, 40, (g) => {
    g.fillStyle = '#ef4444'
    g.beginPath()
    g.moveTo(-11, 14)
    g.lineTo(-7, -10)
    g.lineTo(7, -10)
    g.lineTo(11, 14)
    g.closePath()
    g.fill()
    g.fillStyle = '#f8fafc'
    g.beginPath()
    g.moveTo(-9.3, 4)
    g.lineTo(-8.2, -3)
    g.lineTo(8.2, -3)
    g.lineTo(9.3, 4)
    g.closePath()
    g.fill()
    g.fillStyle = 'rgba(0,0,0,0.2)'
    g.fillRect(3, -10, 5, 24)
    g.fillStyle = '#334155'
    g.fillRect(-1.5, -18, 3, 8)
    g.fillStyle = '#fde047'
    g.beginPath()
    g.arc(0, -19, 3.5, 0, Math.PI * 2)
    g.fill()
  })
}

export function finSprite() {
  return sprite('fin', 40, 30, (g) => {
    g.fillStyle = '#334155'
    g.beginPath()
    g.moveTo(-14, 12)
    g.quadraticCurveTo(-6, -2, 4, -14)
    g.quadraticCurveTo(6, 2, 16, 12)
    g.closePath()
    g.fill()
    g.fillStyle = '#64748b'
    g.beginPath()
    g.moveTo(-6, 12)
    g.quadraticCurveTo(-1, 0, 4, -14)
    g.quadraticCurveTo(0, 2, 2, 12)
    g.closePath()
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.85)'
    g.beginPath()
    g.ellipse(-2, 12, 20, 3, 0, 0, Math.PI * 2)
    g.fill()
  })
}

/** Leaping shark, nose to the left. */
export function sharkSprite() {
  return sprite('shark', 84, 40, (g) => {
    const gr = g.createLinearGradient(0, -14, 0, 14)
    gr.addColorStop(0, '#475569')
    gr.addColorStop(0.55, '#64748b')
    gr.addColorStop(0.56, '#e2e8f0')
    gr.addColorStop(1, '#f8fafc')
    g.fillStyle = gr
    g.beginPath()
    g.moveTo(-40, 2)
    g.quadraticCurveTo(-30, -14, 0, -12)
    g.quadraticCurveTo(24, -10, 32, -2)
    g.lineTo(42, -14)
    g.lineTo(38, 2)
    g.lineTo(42, 14)
    g.lineTo(30, 4)
    g.quadraticCurveTo(10, 12, -20, 10)
    g.quadraticCurveTo(-34, 8, -40, 2)
    g.fill()
    g.fillStyle = '#475569'
    g.beginPath()
    g.moveTo(-4, -12)
    g.lineTo(6, -26)
    g.lineTo(10, -11)
    g.closePath()
    g.fill()
    g.beginPath()
    g.moveTo(-10, 6)
    g.lineTo(-2, 16)
    g.lineTo(2, 7)
    g.closePath()
    g.fill()
    g.fillStyle = '#0f172a'
    g.beginPath()
    g.arc(-30, -3, 2, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#7f1d1d'
    g.lineWidth = 1.5
    g.beginPath()
    g.moveTo(-38, 4)
    g.quadraticCurveTo(-30, 8, -22, 5)
    g.stroke()
    g.fillStyle = '#ffffff'
    for (let i = 0; i < 4; i++) {
      g.beginPath()
      g.moveTo(-36 + i * 3.5, 5)
      g.lineTo(-34.5 + i * 3.5, 8)
      g.lineTo(-33 + i * 3.5, 5)
      g.fill()
    }
    g.strokeStyle = '#334155'
    g.beginPath()
    for (let i = 0; i < 3; i++) {
      g.moveTo(-22 + i * 3, -6)
      g.lineTo(-23 + i * 3, 0)
    }
    g.stroke()
  })
}

export function coinSprite() {
  return sprite('coin', 20, 20, (g) => {
    g.fillStyle = '#a16207'
    g.beginPath()
    g.arc(0, 1.3, 9, 0, Math.PI * 2)
    g.fill()
    const gr = g.createRadialGradient(-3, -3, 1, 0, 0, 9)
    gr.addColorStop(0, '#fef9c3')
    gr.addColorStop(0.55, '#facc15')
    gr.addColorStop(1, '#ca8a04')
    g.fillStyle = gr
    g.beginPath()
    g.arc(0, 0, 9, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#fef08a'
    g.fillRect(-1.1, -4, 2.2, 8)
  })
}

export type PowerKind = 'shield' | 'turbo' | 'star' | 'magnet'

export function powerSprite(kind: PowerKind) {
  return sprite(`pow|${kind}`, 34, 34, (g) => {
    const col = kind === 'shield' ? '#38bdf8' : kind === 'turbo' ? '#f97316' : kind === 'magnet' ? '#e11d48' : '#facc15'
    const gr = g.createRadialGradient(0, 0, 3, 0, 0, 17)
    gr.addColorStop(0, col)
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.fillRect(-17, -17, 34, 34)
    g.fillStyle = 'rgba(255,255,255,0.92)'
    g.beginPath()
    g.arc(0, 0, 11, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = col
    g.lineWidth = 2.5
    g.stroke()
    g.fillStyle = col
    if (kind === 'shield') {
      g.beginPath()
      g.moveTo(0, -7)
      g.lineTo(6, -4)
      g.quadraticCurveTo(6, 4, 0, 8)
      g.quadraticCurveTo(-6, 4, -6, -4)
      g.closePath()
      g.fill()
    } else if (kind === 'turbo') {
      g.beginPath()
      g.moveTo(2, -8)
      g.lineTo(-5, 1)
      g.lineTo(0, 1)
      g.lineTo(-2, 8)
      g.lineTo(5, -1)
      g.lineTo(0, -1)
      g.closePath()
      g.fill()
    } else if (kind === 'magnet') {
      g.lineCap = 'butt'
      g.lineWidth = 4.2
      g.strokeStyle = col
      g.beginPath()
      g.arc(0, -1, 5.5, Math.PI, 0, false)
      g.lineTo(5.5, 5)
      g.moveTo(-5.5, -1)
      g.lineTo(-5.5, 5)
      g.stroke()
      g.fillStyle = '#e2e8f0'
      g.fillRect(-7.6, 3.5, 4.2, 3.5)
      g.fillRect(3.4, 3.5, 4.2, 3.5)
    } else {
      g.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i / 10) * Math.PI * 2
        const r = i % 2 ? 3.4 : 8
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      g.closePath()
      g.fill()
    }
  })
}

export function drawGull(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, s = 1) {
  const f = Math.sin(t * 12) * 6
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.strokeStyle = '#f8fafc'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-14, -f)
  ctx.quadraticCurveTo(-6, -6 - f * 0.4, 0, 0)
  ctx.quadraticCurveTo(6, -6 - f * 0.4, 14, -f)
  ctx.stroke()
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.ellipse(0, 1, 6, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(-6, 0)
  ctx.lineTo(-10, 1.5)
  ctx.lineTo(-6, 2)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(-3.5, 0, 0.9, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = 1 + k
  return `rgb(${Math.min(255, ((n >> 16) & 255) * f) | 0},${Math.min(255, ((n >> 8) & 255) * f) | 0},${Math.min(255, (n & 255) * f) | 0})`
}
