/** Vector art for Hill Rider: bike + rider drawn live, props cached. */

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

/** Bottom-centre anchored blit. */
export function blitBase(ctx: CanvasRenderingContext2D, spr: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  ctx.drawImage(spr, x - w / 2 - PAD, y - h - PAD, w + PAD * 2, h + PAD * 2)
}

export function blit(ctx: CanvasRenderingContext2D, spr: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  ctx.drawImage(spr, x - w / 2 - PAD, y - h / 2 - PAD, w + PAD * 2, h + PAD * 2)
}

export function fuelSprite() {
  return sprite('fuel', 26, 32, (g) => {
    const gr = g.createLinearGradient(-12, 0, 12, 0)
    gr.addColorStop(0, '#991b1b')
    gr.addColorStop(0.45, '#ef4444')
    gr.addColorStop(1, '#7f1d1d')
    g.fillStyle = gr
    g.beginPath()
    g.roundRect(-11, -10, 22, 24, 4)
    g.fill()
    g.fillStyle = '#7f1d1d'
    g.fillRect(-4, -15, 9, 6)
    g.fillStyle = '#fde047'
    g.fillRect(-2, -16, 5, 3)
    g.strokeStyle = '#fecaca'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(-6, -4)
    g.lineTo(6, 8)
    g.moveTo(6, -4)
    g.lineTo(-6, 8)
    g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.fillRect(-9, -8, 3, 20)
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

export function treeSprite(leaf: string, dark: string) {
  return sprite(`tree|${leaf}`, 50, 80, (g) => {
    g.translate(0, 40)
    g.fillStyle = '#6b4226'
    g.fillRect(-3.5, -34, 7, 34)
    g.fillStyle = dark
    g.beginPath()
    g.arc(0, -48, 22, 0, Math.PI * 2)
    g.arc(-13, -38, 13, 0, Math.PI * 2)
    g.arc(13, -38, 13, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = leaf
    g.beginPath()
    g.arc(-4, -52, 15, 0, Math.PI * 2)
    g.arc(-12, -40, 9, 0, Math.PI * 2)
    g.fill()
  })
}

export function cactusSprite() {
  return sprite('cactus', 40, 64, (g) => {
    g.translate(0, 32)
    g.strokeStyle = '#15803d'
    g.lineCap = 'round'
    g.lineWidth = 10
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(0, -56)
    g.moveTo(0, -24)
    g.lineTo(-12, -24)
    g.lineTo(-12, -38)
    g.moveTo(0, -32)
    g.lineTo(12, -32)
    g.lineTo(12, -46)
    g.stroke()
    g.strokeStyle = '#22c55e'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(-2, -2)
    g.lineTo(-2, -54)
    g.stroke()
  })
}

export function rockSprite(col: string, light: string) {
  return sprite(`rock|${col}`, 34, 22, (g) => {
    g.translate(0, 11)
    g.fillStyle = col
    g.beginPath()
    g.moveTo(-16, 0)
    g.lineTo(-11, -14)
    g.lineTo(2, -20)
    g.lineTo(14, -11)
    g.lineTo(17, 0)
    g.closePath()
    g.fill()
    g.fillStyle = light
    g.beginPath()
    g.moveTo(-11, -14)
    g.lineTo(2, -20)
    g.lineTo(4, -8)
    g.lineTo(-6, -5)
    g.closePath()
    g.fill()
  })
}

export function flagSprite() {
  return sprite('flag', 30, 60, (g) => {
    g.translate(0, 30)
    g.fillStyle = '#334155'
    g.fillRect(-1.5, -58, 3, 58)
    g.fillStyle = '#facc15'
    g.beginPath()
    g.moveTo(1.5, -58)
    g.lineTo(26, -50)
    g.lineTo(1.5, -42)
    g.closePath()
    g.fill()
  })
}

export type RiderPose = { lean: number; crouch: number; pedal: number }

/**
 * Bike + rider. `ang` is the frame angle (rear→front), wheels at ±half along
 * the frame, `comp` = suspension compression in px (visual bounce).
 */
export function drawBike(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  fx: number,
  fy: number,
  r: number,
  wheelA: number,
  wheelB: number,
  comp: number,
  pose: RiderPose,
  colors: { frame: string; shirt: string; helmet: string },
  noRider = false,
) {
  const ang = Math.atan2(fy - ry, fx - rx)
  const L = Math.hypot(fx - rx, fy - ry)
  // wheels
  for (const [x, y, a] of [
    [rx, ry, wheelA],
    [fx, fy, wheelB],
  ] as const) {
    ctx.save()
    ctx.translate(x, y)
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#374151'
    ctx.beginPath()
    ctx.arc(0, 0, r - 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1.2
    ctx.rotate(a)
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const sa = (i / 6) * Math.PI * 2
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(sa) * (r - 4), Math.sin(sa) * (r - 4))
    }
    ctx.stroke()
    // tread knobs
    ctx.fillStyle = '#0b0f19'
    for (let i = 0; i < 10; i++) {
      const sa = (i / 10) * Math.PI * 2
      ctx.fillRect(Math.cos(sa) * r - 1.5, Math.sin(sa) * r - 1.5, 3, 3)
    }
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.arc(0, 0, 2.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  ctx.save()
  ctx.translate(rx, ry)
  ctx.rotate(ang)
  // frame local: x along frame, -y up
  const sag = Math.max(-5, Math.min(7, comp))
  const bbX = L * 0.42
  const bbY = 2 + sag * 0.3
  const seatX = L * 0.3
  const seatY = -r * 1.25 + sag
  const headX = L * 0.88
  const headY = -r * 1.35 + sag
  // shocks / springs to wheels
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let i = 0; i <= 6; i++) {
    const k = i / 6
    const x = seatX * 0.3 * (1 - k)
    const y = (seatY + 6) * (1 - k)
    ctx.lineTo(x + (i % 2 ? 2.5 : -2.5), y)
  }
  ctx.stroke()
  ctx.strokeStyle = colors.frame
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(bbX, bbY)
  ctx.lineTo(seatX, seatY + 4)
  ctx.closePath()
  ctx.moveTo(seatX, seatY + 4)
  ctx.lineTo(headX, headY + 4)
  ctx.lineTo(bbX, bbY)
  ctx.moveTo(headX, headY + 4)
  ctx.lineTo(L, 0)
  ctx.stroke()
  // fork highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(headX, headY + 4)
  ctx.lineTo(L - 1, -1)
  ctx.stroke()
  // seat + bars
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.roundRect(seatX - 8, seatY, 14, 4, 2)
  ctx.fill()
  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(headX, headY + 4)
  ctx.lineTo(headX - 2, headY - 6)
  ctx.lineTo(headX + 5, headY - 7)
  ctx.stroke()
  // pedals
  const pa = pose.pedal
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 2.5
  const p1x = bbX + Math.cos(pa) * 7
  const p1y = bbY + Math.sin(pa) * 7
  const p2x = bbX - Math.cos(pa) * 7
  const p2y = bbY - Math.sin(pa) * 7
  ctx.beginPath()
  ctx.moveTo(p1x, p1y)
  ctx.lineTo(p2x, p2y)
  ctx.stroke()
  if (!noRider) {
    const c = pose.crouch
    const lean = pose.lean
    const hipX = seatX + lean * 6
    const hipY = seatY - 4 + c * 4
    const shX = hipX + 12 + lean * 8 + c * 4
    const shY = hipY - 20 + c * 6
    // far leg
    ctx.strokeStyle = '#1e3a8a'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(hipX, hipY)
    ctx.lineTo((hipX + p2x) / 2 + 6, (hipY + p2y) / 2 - 3)
    ctx.lineTo(p2x, p2y)
    ctx.stroke()
    // torso
    ctx.strokeStyle = colors.shirt
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.moveTo(hipX, hipY)
    ctx.lineTo(shX, shY)
    ctx.stroke()
    // near leg
    ctx.strokeStyle = '#1d4ed8'
    ctx.lineWidth = 5.5
    ctx.beginPath()
    ctx.moveTo(hipX, hipY)
    ctx.lineTo((hipX + p1x) / 2 + 7, (hipY + p1y) / 2 - 4)
    ctx.lineTo(p1x, p1y)
    ctx.stroke()
    // arms to bars
    ctx.strokeStyle = '#f0b48a'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(shX, shY + 2)
    ctx.lineTo((shX + headX + 3) / 2, (shY + headY - 6) / 2 + 5)
    ctx.lineTo(headX + 3, headY - 6)
    ctx.stroke()
    // head + helmet
    const hx = shX + 4 + lean * 2
    const hy = shY - 10
    ctx.fillStyle = '#f0b48a'
    ctx.beginPath()
    ctx.arc(hx, hy, 6.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = colors.helmet
    ctx.beginPath()
    ctx.arc(hx - 0.5, hy - 1.5, 7.5, Math.PI * 0.95, Math.PI * 2.15)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillRect(hx - 4, hy - 7.5, 5, 2)
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(hx + 2, hy - 2, 5, 2.5)
  }
  ctx.restore()
}

/** Head position used for crash checks (matches drawBike's rider). */
export function headOffset(L: number, r: number, lean: number, crouch: number) {
  const seatX = L * 0.3
  const seatY = -r * 1.25
  const hipX = seatX + lean * 6
  const hipY = seatY - 4 + crouch * 4
  const shX = hipX + 12 + lean * 8 + crouch * 4
  const shY = hipY - 20 + crouch * 6
  return { x: shX + 4 + lean * 2, y: shY - 10 }
}

// ── Endless content: new biomes, hazards, power-ups ─────

export function pineSprite() {
  return sprite('pine', 44, 84, (g) => {
    g.translate(0, 42)
    g.fillStyle = '#5b3a22'
    g.fillRect(-3, -14, 6, 14)
    const tiers: [number, number, number][] = [
      [-14, 21, 26],
      [-34, 17, 24],
      [-52, 12, 22],
    ]
    for (const [y, hw, hh] of tiers) {
      g.fillStyle = '#14532d'
      g.beginPath()
      g.moveTo(-hw, y)
      g.lineTo(0, y - hh)
      g.lineTo(hw, y)
      g.closePath()
      g.fill()
      g.fillStyle = '#166534'
      g.beginPath()
      g.moveTo(-hw * 0.6, y - 2)
      g.lineTo(0, y - hh)
      g.lineTo(-hw * 0.1, y - 2)
      g.closePath()
      g.fill()
      // snow cap on each tier
      g.fillStyle = '#f8fafc'
      g.beginPath()
      g.moveTo(-hw * 0.55, y - hh * 0.45)
      g.lineTo(0, y - hh)
      g.lineTo(hw * 0.55, y - hh * 0.45)
      g.quadraticCurveTo(hw * 0.2, y - hh * 0.32, 0, y - hh * 0.5)
      g.quadraticCurveTo(-hw * 0.25, y - hh * 0.3, -hw * 0.55, y - hh * 0.45)
      g.fill()
    }
  })
}

export function iceRockSprite() {
  return sprite('icerock', 34, 26, (g) => {
    g.translate(0, 13)
    g.fillStyle = '#7dd3fc'
    g.beginPath()
    g.moveTo(-16, 0)
    g.lineTo(-12, -12)
    g.lineTo(-4, -24)
    g.lineTo(4, -14)
    g.lineTo(10, -20)
    g.lineTo(16, 0)
    g.closePath()
    g.fill()
    g.fillStyle = '#e0f2fe'
    g.beginPath()
    g.moveTo(-12, -12)
    g.lineTo(-4, -24)
    g.lineTo(-2, -8)
    g.closePath()
    g.moveTo(4, -14)
    g.lineTo(10, -20)
    g.lineTo(9, -6)
    g.closePath()
    g.fill()
    g.strokeStyle = '#0ea5e9'
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(-16, 0)
    g.lineTo(-12, -12)
    g.lineTo(-4, -24)
    g.lineTo(4, -14)
    g.lineTo(10, -20)
    g.lineTo(16, 0)
    g.stroke()
  })
}

export function basaltSprite() {
  return sprite('basalt', 36, 44, (g) => {
    g.translate(0, 22)
    const cols: [number, number, number][] = [
      [-14, 8, 26],
      [-6, 9, 40],
      [3, 8, 32],
      [11, 7, 20],
    ]
    for (const [x, w, h] of cols) {
      g.fillStyle = '#1c1917'
      g.fillRect(x, -h, w, h)
      g.fillStyle = '#44403c'
      g.fillRect(x, -h, w, 3)
      g.fillStyle = '#292524'
      g.fillRect(x + w - 2, -h, 2, h)
    }
    // glowing cracks
    g.strokeStyle = '#f97316'
    g.lineWidth = 1.4
    g.beginPath()
    g.moveTo(-4, -30)
    g.lineTo(-1, -22)
    g.lineTo(-4, -14)
    g.moveTo(6, -24)
    g.lineTo(8, -16)
    g.stroke()
  })
}

/** Falling hazard skins: boulder, ice chunk, meteor / lava bomb. */
export function boulderSprite(skin: 'rock' | 'ice' | 'meteor') {
  return sprite(`boulder|${skin}`, 36, 36, (g) => {
    const pal =
      skin === 'ice'
        ? ['#0369a1', '#38bdf8', '#e0f2fe']
        : skin === 'meteor'
          ? ['#1c1917', '#57534e', '#fb923c']
          : ['#44403c', '#78716c', '#d6d3d1']
    g.fillStyle = pal[0]
    g.beginPath()
    if (skin === 'ice') {
      g.moveTo(0, -17)
      g.lineTo(13, -8)
      g.lineTo(15, 7)
      g.lineTo(4, 17)
      g.lineTo(-11, 13)
      g.lineTo(-16, -2)
      g.lineTo(-9, -13)
    } else {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2
        const r = 15 + ((i * 7) % 3) * 1.4
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
    }
    g.closePath()
    g.fill()
    const gr = g.createRadialGradient(-5, -6, 1, 0, 0, 16)
    gr.addColorStop(0, pal[2])
    gr.addColorStop(0.35, pal[1])
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = gr
    g.fill()
    if (skin === 'meteor') {
      g.strokeStyle = '#fb923c'
      g.lineWidth = 1.8
      g.beginPath()
      g.moveTo(-8, -4)
      g.lineTo(-2, 2)
      g.lineTo(-4, 9)
      g.moveTo(4, -10)
      g.lineTo(7, -2)
      g.lineTo(12, 1)
      g.stroke()
    } else if (skin === 'rock') {
      g.fillStyle = 'rgba(0,0,0,0.25)'
      g.beginPath()
      g.arc(5, 4, 3, 0, Math.PI * 2)
      g.arc(-6, 6, 2, 0, Math.PI * 2)
      g.fill()
    } else {
      g.fillStyle = 'rgba(255,255,255,0.7)'
      g.fillRect(-7, -9, 3, 10)
    }
  })
}

export function nitroSprite() {
  return sprite('nitro', 22, 34, (g) => {
    const gr = g.createLinearGradient(-10, 0, 10, 0)
    gr.addColorStop(0, '#1e3a8a')
    gr.addColorStop(0.45, '#38bdf8')
    gr.addColorStop(1, '#1e40af')
    g.fillStyle = gr
    g.beginPath()
    g.roundRect(-9, -11, 18, 26, 8)
    g.fill()
    g.fillStyle = '#cbd5e1'
    g.fillRect(-3, -16, 6, 6)
    g.fillStyle = '#64748b'
    g.fillRect(-5, -12, 10, 2)
    // lightning bolt
    g.fillStyle = '#fde047'
    g.beginPath()
    g.moveTo(2, -6)
    g.lineTo(-4, 3)
    g.lineTo(0, 3)
    g.lineTo(-2, 11)
    g.lineTo(5, 0)
    g.lineTo(1, 0)
    g.closePath()
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.4)'
    g.fillRect(-7, -8, 2.5, 18)
  })
}

/** Fire vent mouth sitting on the ground (anchored bottom-centre). */
export function ventSprite() {
  return sprite('vent', 40, 16, (g) => {
    g.translate(0, 8)
    g.fillStyle = '#292524'
    g.beginPath()
    g.moveTo(-20, 0)
    g.quadraticCurveTo(-14, -14, -7, -12)
    g.lineTo(7, -12)
    g.quadraticCurveTo(14, -14, 20, 0)
    g.closePath()
    g.fill()
    g.fillStyle = '#57534e'
    g.beginPath()
    g.moveTo(-16, -3)
    g.quadraticCurveTo(-12, -12, -7, -12)
    g.lineTo(-5, -9)
    g.closePath()
    g.fill()
    g.fillStyle = '#7c2d12'
    g.beginPath()
    g.ellipse(0, -12, 8, 3, 0, 0, Math.PI * 2)
    g.fill()
  })
}
