/** Vector art for Slope Ski: cached static sprites + live-drawn characters. */

const PAD = 10
const SCALE = 2
const cache = new Map<string, HTMLCanvasElement>()

function sprite(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
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

/** Draw a sprite anchored at its bottom-centre (x, y = ground contact). */
export function blitBase(ctx: CanvasRenderingContext2D, spr: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  ctx.drawImage(spr, x - w / 2 - PAD, y - h - PAD, w + PAD * 2, h + PAD * 2)
}

export function blit(ctx: CanvasRenderingContext2D, spr: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  ctx.drawImage(spr, x - w / 2 - PAD, y - h / 2 - PAD, w + PAD * 2, h + PAD * 2)
}

export function treeSprite(dark: string, mid: string, size: number) {
  const w = 40 * size
  const h = 64 * size
  return sprite(`tree|${dark}|${size}`, w, h, (g) => {
    g.translate(0, h / 2)
    // shadow
    g.fillStyle = 'rgba(80,110,160,0.25)'
    g.beginPath()
    g.ellipse(6 * size, -2, w * 0.5, 7 * size, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#6b4226'
    g.fillRect(-3 * size, -10 * size, 6 * size, 10 * size)
    const tiers = 3
    for (let i = 0; i < tiers; i++) {
      const by = -8 * size - i * 16 * size
      const hw = (w / 2) * (1 - i * 0.24)
      g.fillStyle = dark
      g.beginPath()
      g.moveTo(-hw, by)
      g.lineTo(0, by - 26 * size)
      g.lineTo(hw, by)
      g.closePath()
      g.fill()
      g.fillStyle = mid
      g.beginPath()
      g.moveTo(-hw * 0.2, by)
      g.lineTo(0, by - 26 * size)
      g.lineTo(hw, by)
      g.closePath()
      g.fill()
      // snow cap
      g.fillStyle = '#f8fafc'
      g.beginPath()
      g.moveTo(-hw * 0.45, by - 13 * size)
      g.lineTo(0, by - 26 * size)
      g.lineTo(hw * 0.45, by - 13 * size)
      g.quadraticCurveTo(hw * 0.2, by - 10 * size, 0, by - 13 * size)
      g.quadraticCurveTo(-hw * 0.2, by - 10 * size, -hw * 0.45, by - 13 * size)
      g.fill()
      g.fillStyle = 'rgba(248,250,252,0.9)'
      g.beginPath()
      g.ellipse(-hw * 0.55, by - 1.5 * size, hw * 0.3, 2.5 * size, 0, 0, Math.PI * 2)
      g.ellipse(hw * 0.4, by - 1.5 * size, hw * 0.35, 2.5 * size, 0, 0, Math.PI * 2)
      g.fill()
    }
  })
}

export function rockSprite() {
  return sprite('rock', 40, 26, (g) => {
    g.translate(0, 13)
    g.fillStyle = 'rgba(80,110,160,0.25)'
    g.beginPath()
    g.ellipse(4, -2, 20, 6, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#475569'
    g.beginPath()
    g.moveTo(-18, -2)
    g.lineTo(-12, -16)
    g.lineTo(0, -22)
    g.lineTo(14, -15)
    g.lineTo(19, -2)
    g.closePath()
    g.fill()
    g.fillStyle = '#64748b'
    g.beginPath()
    g.moveTo(-12, -16)
    g.lineTo(0, -22)
    g.lineTo(3, -8)
    g.lineTo(-8, -4)
    g.closePath()
    g.fill()
    g.fillStyle = '#f8fafc'
    g.beginPath()
    g.moveTo(-10, -17)
    g.lineTo(0, -22)
    g.lineTo(13, -15)
    g.quadraticCurveTo(4, -13, -2, -16)
    g.quadraticCurveTo(-6, -14, -10, -17)
    g.fill()
  })
}

export function stumpSprite() {
  return sprite('stump', 24, 18, (g) => {
    g.translate(0, 9)
    g.fillStyle = 'rgba(80,110,160,0.25)'
    g.beginPath()
    g.ellipse(3, -1, 12, 4, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#7c4a21'
    g.fillRect(-8, -12, 16, 11)
    g.fillStyle = '#d6a46b'
    g.beginPath()
    g.ellipse(0, -12, 8, 3.5, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#f8fafc'
    g.beginPath()
    g.ellipse(-2, -13, 5, 2, 0, 0, Math.PI * 2)
    g.fill()
  })
}

export function rampSprite() {
  return sprite('ramp', 64, 30, (g) => {
    // kicker seen from above-front: wide lip at the bottom
    g.fillStyle = 'rgba(80,110,160,0.3)'
    g.beginPath()
    g.ellipse(4, 12, 34, 7, 0, 0, Math.PI * 2)
    g.fill()
    const gr = g.createLinearGradient(0, -15, 0, 15)
    gr.addColorStop(0, '#e2e8f0')
    gr.addColorStop(1, '#93c5fd')
    g.fillStyle = gr
    g.beginPath()
    g.moveTo(-22, -14)
    g.lineTo(22, -14)
    g.lineTo(31, 10)
    g.lineTo(-31, 10)
    g.closePath()
    g.fill()
    g.fillStyle = '#3b82f6'
    g.fillRect(-31, 10, 62, 4)
    g.fillStyle = '#f97316'
    for (let x = -28; x < 28; x += 12) g.fillRect(x, 10, 6, 4)
    g.strokeStyle = 'rgba(255,255,255,0.8)'
    g.lineWidth = 1.5
    g.beginPath()
    g.moveTo(-12, -10)
    g.lineTo(-16, 6)
    g.moveTo(12, -10)
    g.lineTo(16, 6)
    g.stroke()
  })
}

export function mogulSprite() {
  return sprite('mogul', 36, 18, (g) => {
    const gr = g.createRadialGradient(-5, -4, 2, 0, 0, 18)
    gr.addColorStop(0, '#ffffff')
    gr.addColorStop(0.7, '#e2e8f0')
    gr.addColorStop(1, '#bfdbfe')
    g.fillStyle = gr
    g.beginPath()
    g.ellipse(0, 0, 18, 9, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = 'rgba(96,130,190,0.25)'
    g.beginPath()
    g.ellipse(4, 4, 14, 4, 0, 0, Math.PI)
    g.fill()
  })
}

export function iceSprite() {
  return sprite('ice', 90, 44, (g) => {
    const gr = g.createLinearGradient(-45, -22, 45, 22)
    gr.addColorStop(0, '#a5f3fc')
    gr.addColorStop(0.5, '#e0f2fe')
    gr.addColorStop(1, '#7dd3fc')
    g.fillStyle = gr
    g.globalAlpha = 0.85
    g.beginPath()
    g.ellipse(0, 0, 44, 20, 0.1, 0, Math.PI * 2)
    g.fill()
    g.globalAlpha = 1
    g.strokeStyle = 'rgba(255,255,255,0.9)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(-26, -6)
    g.lineTo(-8, -10)
    g.moveTo(6, 6)
    g.lineTo(24, 2)
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

export function cabinSprite() {
  return sprite('cabin', 70, 60, (g) => {
    g.translate(0, 30)
    g.fillStyle = 'rgba(80,110,160,0.25)'
    g.beginPath()
    g.ellipse(8, -2, 38, 8, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#92400e'
    g.fillRect(-26, -30, 52, 28)
    g.strokeStyle = '#78350f'
    g.lineWidth = 1.2
    for (let y = -26; y < -2; y += 5) {
      g.beginPath()
      g.moveTo(-26, y)
      g.lineTo(26, y)
      g.stroke()
    }
    g.fillStyle = '#fde68a'
    g.fillRect(-16, -22, 9, 8)
    g.fillRect(7, -22, 9, 8)
    g.fillStyle = '#451a03'
    g.fillRect(-4, -16, 8, 14)
    g.fillStyle = '#f8fafc'
    g.beginPath()
    g.moveTo(-33, -28)
    g.lineTo(0, -52)
    g.lineTo(33, -28)
    g.closePath()
    g.fill()
    g.fillStyle = '#cbd5e1'
    g.beginPath()
    g.moveTo(0, -52)
    g.lineTo(33, -28)
    g.lineTo(10, -28)
    g.closePath()
    g.fill()
  })
}

/** Live skier: heading `ang` (0 = straight downhill), `lean` for carve tilt. */
export function drawSkier(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ang: number,
  t: number,
  opts: { jacket: string; pants: string; hat: string; spin?: number; grab?: boolean; crashed?: boolean; scale?: number },
) {
  const s = opts.scale ?? 1
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  if (opts.crashed) {
    // sprawled in the snow
    ctx.rotate(1.2)
    ctx.fillStyle = '#334155'
    ctx.save()
    ctx.rotate(0.6)
    ctx.fillRect(-18, -2, 36, 3)
    ctx.restore()
    ctx.save()
    ctx.rotate(-0.9)
    ctx.fillRect(-16, 4, 32, 3)
    ctx.restore()
    ctx.fillStyle = opts.pants
    ctx.fillRect(-4, 0, 8, 12)
    ctx.fillStyle = opts.jacket
    ctx.beginPath()
    ctx.ellipse(0, -4, 8, 9, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = opts.hat
    ctx.beginPath()
    ctx.arc(0, -15, 5.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }
  const spin = opts.spin ?? 0
  ctx.rotate(spin)
  // skis follow the heading (perspective: rotate the pair)
  const sx = Math.sin(ang)
  const sy = Math.cos(ang)
  ctx.strokeStyle = '#0f172a'
  ctx.lineCap = 'round'
  ctx.lineWidth = 3.4
  for (const off of [-4, 4]) {
    const ox = off * sy
    const oy = -off * sx * 0.4
    ctx.beginPath()
    ctx.moveTo(ox - sx * 16, 4 + oy - sy * 10)
    ctx.lineTo(ox + sx * 16, 4 + oy + sy * 10)
    ctx.stroke()
  }
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 1.2
  for (const off of [-4, 4]) {
    const ox = off * sy
    const oy = -off * sx * 0.4
    ctx.beginPath()
    ctx.moveTo(ox + sx * 10, 4 + oy + sy * 6)
    ctx.lineTo(ox + sx * 16, 4 + oy + sy * 10)
    ctx.stroke()
  }
  const lean = clampN(ang, -1.2, 1.2)
  // legs
  ctx.fillStyle = opts.pants
  ctx.beginPath()
  ctx.roundRect(-6 + lean * 2, -6, 5, 11, 2)
  ctx.roundRect(1 + lean * 2, -6, 5, 11, 2)
  ctx.fill()
  // poles
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1.5
  const pp = Math.sin(t * 6) * 2
  ctx.beginPath()
  ctx.moveTo(-9 + lean, -12)
  ctx.lineTo(-13 - lean * 3, 4 + pp)
  ctx.moveTo(9 + lean, -12)
  ctx.lineTo(13 - lean * 3, 4 - pp)
  ctx.stroke()
  // torso
  const gr = ctx.createLinearGradient(-8, 0, 8, 0)
  gr.addColorStop(0, shadeHex(opts.jacket, -0.3))
  gr.addColorStop(0.5, opts.jacket)
  gr.addColorStop(1, shadeHex(opts.jacket, -0.3))
  ctx.fillStyle = gr
  ctx.beginPath()
  ctx.roundRect(-8 + lean * 3, -20, 16, 16, 6)
  ctx.fill()
  // arms
  ctx.strokeStyle = opts.jacket
  ctx.lineWidth = 4
  ctx.beginPath()
  if (opts.grab) {
    ctx.moveTo(-7 + lean * 3, -16)
    ctx.lineTo(-8, 2)
    ctx.moveTo(7 + lean * 3, -16)
    ctx.lineTo(8, 2)
  } else {
    ctx.moveTo(-7 + lean * 3, -16)
    ctx.lineTo(-10 + lean, -10)
    ctx.moveTo(7 + lean * 3, -16)
    ctx.lineTo(10 + lean, -10)
  }
  ctx.stroke()
  // head: helmet + goggles
  const hx = lean * 4
  ctx.fillStyle = '#fcd9b6'
  ctx.beginPath()
  ctx.arc(hx, -25, 5.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = opts.hat
  ctx.beginPath()
  ctx.arc(hx, -26.5, 6, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.roundRect(hx - 5 + sx * 1.5, -26, 10, 3.5, 1.5)
  ctx.fill()
  ctx.fillStyle = '#67e8f9'
  ctx.fillRect(hx - 3.5 + sx * 1.5, -25.4, 3, 1.6)
  ctx.restore()
}

/** The yeti: big furry chaser with swinging arms. */
export function drawYeti(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, angry: boolean, munch: number) {
  const step = Math.sin(t * 10)
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(80,110,160,0.3)'
  ctx.beginPath()
  ctx.ellipse(0, 4, 24, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  // legs
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath()
  ctx.ellipse(-9, -4 + step * 2, 7, 9, 0, 0, Math.PI * 2)
  ctx.ellipse(9, -4 - step * 2, 7, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  // body
  const gr = ctx.createRadialGradient(-6, -30, 4, 0, -24, 26)
  gr.addColorStop(0, '#ffffff')
  gr.addColorStop(1, '#cbd5e1')
  ctx.fillStyle = gr
  ctx.beginPath()
  ctx.ellipse(0, -24, 19, 22, 0, 0, Math.PI * 2)
  ctx.fill()
  // fur tufts
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1.2
  for (let i = 0; i < 6; i++) {
    const a = -2.6 + i * 0.4
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * 17, -24 + Math.sin(a) * 20)
    ctx.lineTo(Math.cos(a) * 21, -24 + Math.sin(a) * 23)
    ctx.stroke()
  }
  // arms raised and swinging
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 8
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-15, -30)
  ctx.lineTo(-26, -46 + step * 5)
  ctx.moveTo(15, -30)
  ctx.lineTo(26, -46 - step * 5)
  ctx.stroke()
  ctx.fillStyle = '#64748b'
  ctx.beginPath()
  ctx.arc(-26, -47 + step * 5, 4, 0, Math.PI * 2)
  ctx.arc(26, -47 - step * 5, 4, 0, Math.PI * 2)
  ctx.fill()
  // face
  ctx.fillStyle = '#7dd3fc'
  ctx.beginPath()
  ctx.ellipse(0, -30, 10, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = angry ? '#ef4444' : '#0f172a'
  ctx.beginPath()
  ctx.arc(-4, -33, 2, 0, Math.PI * 2)
  ctx.arc(4, -33, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(-7, -37)
  ctx.lineTo(-2, -35)
  ctx.moveTo(7, -37)
  ctx.lineTo(2, -35)
  ctx.stroke()
  // mouth (opens when munching / roaring)
  const open = angry ? 3 + Math.abs(Math.sin(t * 8)) * 3 + munch * 4 : 2
  ctx.fillStyle = '#7f1d1d'
  ctx.beginPath()
  ctx.ellipse(0, -26, 6, open, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(-4, -26 - open, 2, 2.5)
  ctx.fillRect(2, -26 - open, 2, 2.5)
  ctx.restore()
}

export function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, t: number, side: number) {
  ctx.fillStyle = 'rgba(80,110,160,0.25)'
  ctx.beginPath()
  ctx.ellipse(x + 4, y, 6, 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - 30)
  ctx.stroke()
  const wave = Math.sin(t * 7 + x) * 2
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - 30)
  ctx.quadraticCurveTo(x + side * 8, y - 28 + wave, x + side * 15, y - 25 + wave)
  ctx.lineTo(x, y - 19)
  ctx.closePath()
  ctx.fill()
}

function clampN(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v
}

function shadeHex(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = 1 + k
  return `rgb(${(((n >> 16) & 255) * f) | 0},${(((n >> 8) & 255) * f) | 0},${((n & 255) * f) | 0})`
}
