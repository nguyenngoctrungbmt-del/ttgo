/** Street Brawler vector art: IK-posed fighters and parallax streets. */

const TAU = Math.PI * 2

export type Style = {
  skin: string
  shirt: string
  shirt2: string
  pants: string
  shoes: string
  hair: 'band' | 'cap' | 'bald' | 'bandana' | 'mohawk' | 'hood'
  hairColor: string
  extra?: 'lid' | 'knife' | 'shades' | 'wraps'
  size: number
}

export type PoseName = 'idle' | 'walk' | 'punch' | 'windup' | 'uppercut' | 'duck' | 'hurt' | 'stagger' | 'air' | 'ko' | 'throw' | 'block' | 'crouch' | 'super'

type V = { x: number; y: number }

function ik(s: V, t: V, l1: number, l2: number, bend: number): V {
  const dx = t.x - s.x
  const dy = t.y - s.y
  const d = Math.min(Math.max(Math.hypot(dx, dy), 0.01), l1 + l2 - 0.01)
  const a = Math.atan2(dy, dx)
  const c = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))
  const b = a + Math.acos(c) * bend
  return { x: s.x + Math.cos(b) * l1, y: s.y + Math.sin(b) * l1 }
}

function limb(ctx: CanvasRenderingContext2D, a: V, b: V, c: V, w: number, color: string, outline: string) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = outline
  ctx.lineWidth = w + 3
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.lineTo(c.x, c.y)
  ctx.stroke()
  ctx.strokeStyle = color
  ctx.lineWidth = w
  ctx.stroke()
}

/**
 * Draw a fighter standing at (x, gy) facing `face` (+1 right).
 * `k` is the pose progress 0..1, `ph` a walk/anim phase, `u` px per unit.
 */
export function drawFighter(
  ctx: CanvasRenderingContext2D,
  st: Style,
  x: number,
  gy: number,
  u: number,
  face: number,
  pose: PoseName,
  k: number,
  ph: number,
  flash: boolean,
  glowFist = false,
) {
  const s = u * st.size
  const outline = '#0b0b12'
  // Shadow
  ctx.globalAlpha = 0.35
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(x, gy, 24 * s, 6 * s, 0, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 1

  ctx.save()
  ctx.translate(x, gy)
  ctx.scale(face * s, s)

  const bob = Math.sin(ph * 6) * 1.5
  let hip: V = { x: 0, y: -31 + bob }
  let lean = 0.05
  let footF: V = { x: 9, y: 0 }
  let footB: V = { x: -10, y: 0 }
  let handF: V | null = null
  let handB: V | null = null
  let headTilt = 0
  const walkA = Math.sin(ph * 9)
  switch (pose) {
    case 'walk':
      hip = { x: 0, y: -31 + Math.abs(walkA) * -2 }
      footF = { x: 4 + walkA * 11, y: -Math.max(0, Math.cos(ph * 9)) * 5 }
      footB = { x: -4 - walkA * 11, y: -Math.max(0, -Math.cos(ph * 9)) * 5 }
      lean = 0.1
      break
    case 'punch':
      lean = 0.18
      footF = { x: 16, y: 0 }
      footB = { x: -12, y: 0 }
      hip = { x: 3, y: -30 }
      break
    case 'windup':
      lean = -0.12
      hip = { x: -2, y: -30 }
      break
    case 'uppercut':
      lean = -0.08 + k * -0.15
      hip = { x: 2, y: -28 - k * 10 }
      footF = { x: 10, y: -k * 6 }
      break
    case 'duck':
    case 'crouch':
      hip = { x: -2, y: -18 }
      lean = 0.45
      footF = { x: 13, y: 0 }
      footB = { x: -13, y: 0 }
      break
    case 'hurt':
      lean = -0.4
      hip = { x: -4, y: -29 }
      headTilt = -0.4
      break
    case 'stagger':
      lean = Math.sin(ph * 14) * 0.18 - 0.1
      headTilt = Math.sin(ph * 14) * 0.3
      break
    case 'air':
      hip = { x: 0, y: -34 }
      footF = { x: 10, y: -14 }
      footB = { x: -6, y: -10 }
      lean = 0.25
      break
    case 'ko':
      lean = -0.6
      footF = { x: 14, y: -8 }
      footB = { x: -2, y: -16 }
      headTilt = -0.6
      break
    case 'super':
      hip = { x: 0, y: -38 }
      footF = { x: 8, y: -12 }
      footB = { x: -8, y: -12 }
      lean = 0
      break
    default:
      break
  }
  const shoulder: V = { x: hip.x + Math.sin(lean) * 30, y: hip.y - Math.cos(lean) * 30 }
  const head: V = { x: shoulder.x + Math.sin(lean + headTilt) * 13 + 2, y: shoulder.y - Math.cos(lean + headTilt) * 13 }
  // Hand targets (front = forward arm)
  const guardF = { x: shoulder.x + 14, y: shoulder.y + 2 }
  const guardB = { x: shoulder.x + 8, y: shoulder.y + 6 }
  switch (pose) {
    case 'punch': {
      const e = k < 0.4 ? k / 0.4 : 1 - (k - 0.4) * 0.6
      handF = { x: shoulder.x + 10 + e * 22, y: shoulder.y + 1 }
      handB = { x: shoulder.x + 4, y: shoulder.y + 9 }
      break
    }
    case 'windup':
      handF = { x: shoulder.x - 16, y: shoulder.y + 2 }
      handB = { x: shoulder.x + 12, y: shoulder.y + 4 }
      break
    case 'uppercut':
      handF = { x: shoulder.x + 14 + k * 4, y: shoulder.y + 14 - k * 40 }
      handB = guardB
      break
    case 'duck':
    case 'crouch':
      handF = { x: shoulder.x + 10, y: shoulder.y - 8 }
      handB = { x: shoulder.x + 4, y: shoulder.y - 10 }
      break
    case 'hurt':
    case 'ko':
      handF = { x: shoulder.x + 16, y: shoulder.y - 14 }
      handB = { x: shoulder.x - 16, y: shoulder.y - 10 }
      break
    case 'stagger':
      handF = { x: shoulder.x + 10, y: shoulder.y + 20 }
      handB = { x: shoulder.x - 8, y: shoulder.y + 20 }
      break
    case 'walk':
      handF = { x: shoulder.x + 10 - walkA * 6, y: shoulder.y + 8 }
      handB = { x: shoulder.x + 4 + walkA * 6, y: shoulder.y + 10 }
      break
    case 'air':
      handF = { x: shoulder.x + 18, y: shoulder.y - 6 }
      handB = { x: shoulder.x + 12, y: shoulder.y - 10 }
      break
    case 'throw':
      handF = k < 0.6 ? { x: shoulder.x - 14, y: shoulder.y - 12 } : { x: shoulder.x + 22, y: shoulder.y - 2 }
      handB = guardB
      break
    case 'block':
      handF = { x: shoulder.x + 16, y: shoulder.y + 6 }
      handB = { x: shoulder.x + 12, y: shoulder.y + 2 }
      break
    case 'super':
      handF = { x: shoulder.x + 8, y: shoulder.y - 26 }
      handB = { x: shoulder.x - 8, y: shoulder.y - 26 }
      break
    default:
      handF = { x: guardF.x, y: guardF.y + bob * 0.5 }
      handB = { x: guardB.x, y: guardB.y + bob * 0.5 }
  }
  const skin = flash ? '#ffffff' : st.skin
  const shirt = flash ? '#ffffff' : st.shirt
  const pants = flash ? '#ffffff' : st.pants

  // back arm
  const shB = { x: shoulder.x - 4, y: shoulder.y + 3 }
  const elB = ik(shB, handB, 14, 14, 1)
  limb(ctx, shB, elB, handB, 7, skin, outline)
  ctx.fillStyle = outline
  ctx.beginPath()
  ctx.arc(handB.x, handB.y, 6.2, 0, TAU)
  ctx.fill()
  ctx.fillStyle = st.extra === 'wraps' ? '#e5e7eb' : skin
  ctx.beginPath()
  ctx.arc(handB.x, handB.y, 4.8, 0, TAU)
  ctx.fill()
  // back leg
  const hipB = { x: hip.x - 3, y: hip.y }
  const knB = ik(hipB, footB, 16, 16, -1)
  limb(ctx, hipB, knB, footB, 9, pants, outline)
  ctx.fillStyle = st.shoes
  ctx.beginPath()
  ctx.roundRect(footB.x - 4, footB.y - 4, 12, 5, 2)
  ctx.fill()
  // torso
  ctx.save()
  ctx.translate(hip.x, hip.y)
  ctx.rotate(lean)
  ctx.fillStyle = outline
  ctx.beginPath()
  ctx.roundRect(-10.5, -33.5, 21, 36, 8)
  ctx.fill()
  ctx.fillStyle = shirt
  ctx.beginPath()
  ctx.roundRect(-9, -32, 18, 33, 7)
  ctx.fill()
  ctx.fillStyle = flash ? '#fff' : st.shirt2
  ctx.fillRect(-9, -8, 18, 5)
  if (st.hair === 'band') {
    // tank top straps showing skin
    ctx.fillStyle = skin
    ctx.fillRect(-3, -32, 6, 6)
  }
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(-7, -29, 4, 22)
  ctx.restore()
  // front leg
  const hipF = { x: hip.x + 3, y: hip.y }
  const knF = ik(hipF, footF, 16, 16, -1)
  limb(ctx, hipF, knF, footF, 9, pants, outline)
  ctx.fillStyle = st.shoes
  ctx.beginPath()
  ctx.roundRect(footF.x - 4, footF.y - 4, 12, 5, 2)
  ctx.fill()
  // head
  ctx.save()
  ctx.translate(head.x, head.y)
  ctx.rotate(headTilt * 0.5)
  ctx.fillStyle = outline
  ctx.beginPath()
  ctx.arc(0, 0, 11.5, 0, TAU)
  ctx.fill()
  ctx.fillStyle = skin
  ctx.beginPath()
  ctx.arc(0, 0, 10, 0, TAU)
  ctx.fill()
  // hair styles
  ctx.fillStyle = st.hairColor
  if (st.hair === 'cap') {
    ctx.beginPath()
    ctx.arc(0, -2, 10.5, Math.PI, 0)
    ctx.fill()
    ctx.fillRect(2, -4, 13, 3)
  } else if (st.hair === 'bandana' || st.hair === 'band') {
    ctx.fillStyle = '#1f2937'
    ctx.beginPath()
    ctx.arc(0, -1, 10.2, Math.PI * 1.05, Math.PI * 1.95)
    ctx.fill()
    ctx.fillStyle = st.hairColor
    ctx.fillRect(-10, -6, 20, 4)
    ctx.beginPath()
    ctx.moveTo(-10, -5)
    ctx.lineTo(-18, -9 + Math.sin(ph * 8) * 2)
    ctx.lineTo(-17, -2 + Math.sin(ph * 8) * 2)
    ctx.closePath()
    ctx.fill()
  } else if (st.hair === 'mohawk') {
    ctx.beginPath()
    ctx.moveTo(-6, -8)
    ctx.lineTo(-2, -18)
    ctx.lineTo(2, -10)
    ctx.lineTo(5, -17)
    ctx.lineTo(7, -7)
    ctx.closePath()
    ctx.fill()
  } else if (st.hair === 'hood') {
    ctx.fillStyle = st.shirt
    ctx.beginPath()
    ctx.arc(-1, -1, 12, Math.PI * 0.7, Math.PI * 2.05)
    ctx.fill()
  } else if (st.hair === 'bald') {
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.ellipse(-3, -6, 4, 2.4, -0.4, 0, TAU)
    ctx.fill()
  }
  // face
  if (pose === 'ko' || pose === 'stagger') {
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(3, -3)
    ctx.lineTo(7, 1)
    ctx.moveTo(7, -3)
    ctx.lineTo(3, 1)
    ctx.stroke()
  } else if (st.extra === 'shades') {
    ctx.fillStyle = '#111'
    ctx.fillRect(1, -3, 10, 4)
    ctx.fillStyle = '#60a5fa'
    ctx.fillRect(6, -2.5, 3, 1.5)
  } else {
    ctx.fillStyle = '#111'
    ctx.beginPath()
    ctx.arc(6, -1, 1.7, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = '#111'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(3, -5)
    ctx.lineTo(8.5, pose === 'windup' ? -3 : -4.5)
    ctx.stroke()
  }
  ctx.strokeStyle = '#111'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  if (pose === 'hurt' || pose === 'ko') ctx.arc(6, 5, 2, 0, TAU)
  else {
    ctx.moveTo(4, 5)
    ctx.lineTo(8, 4.5)
  }
  ctx.stroke()
  ctx.restore()
  // front arm
  const shF = { x: shoulder.x + 3, y: shoulder.y + 3 }
  const elF = ik(shF, handF, 14, 14, 1)
  limb(ctx, shF, elF, handF, 7.5, skin, outline)
  if (st.extra === 'lid' && pose !== 'ko' && pose !== 'hurt') {
    ctx.fillStyle = outline
    ctx.beginPath()
    ctx.ellipse(handF.x + 4, handF.y, 5, 17, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.beginPath()
    ctx.ellipse(handF.x + 4, handF.y, 3.8, 15.5, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(handF.x + 3, handF.y - 12, 1.6, 24)
  } else {
    if (glowFist) {
      ctx.fillStyle = 'rgba(239,68,68,0.45)'
      ctx.beginPath()
      ctx.arc(handF.x, handF.y, 12, 0, TAU)
      ctx.fill()
    }
    ctx.fillStyle = outline
    ctx.beginPath()
    ctx.arc(handF.x, handF.y, 7, 0, TAU)
    ctx.fill()
    ctx.fillStyle = st.extra === 'wraps' ? '#f8fafc' : glowFist ? '#fca5a5' : skin
    ctx.beginPath()
    ctx.arc(handF.x, handF.y, 5.6, 0, TAU)
    ctx.fill()
    if (st.extra === 'knife' && (pose === 'throw' ? k < 0.6 : pose !== 'ko')) {
      ctx.fillStyle = '#e5e7eb'
      ctx.beginPath()
      ctx.moveTo(handF.x + 2, handF.y - 3)
      ctx.lineTo(handF.x + 15, handF.y - 9)
      ctx.lineTo(handF.x + 4, handF.y + 1)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.restore()
}

export function drawKnife(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, dir: number, spin: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(spin)
  ctx.scale(dir * u, u)
  ctx.fillStyle = '#0b0b12'
  ctx.fillRect(-9, -2.5, 8, 5)
  ctx.fillStyle = '#e5e7eb'
  ctx.beginPath()
  ctx.moveTo(-1, -3)
  ctx.lineTo(13, 0)
  ctx.lineTo(-1, 3)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// ── Streets ─────────────────────────────────────────────────

export type Street = {
  name: string
  sky: [string, string]
  far: string
  mid: string
  window: string
  ground: string
  curb: string
  road: string
  accent: string
  orb: string
}

export const STREETS: Street[] = [
  { name: 'Downtown', sky: ['#0b1026', '#27325c'], far: '#1a2142', mid: '#222b52', window: '#fde68a', ground: '#4b5563', curb: '#9ca3af', road: '#1f2937', accent: '#60a5fa', orb: '#f8fafc' },
  { name: 'Harbor', sky: ['#3b1d4a', '#f59e0b'], far: '#5b2a4a', mid: '#3f2238', window: '#fdba74', ground: '#6b4f3a', curb: '#a8896c', road: '#3a2a20', accent: '#fb923c', orb: '#fde68a' },
  { name: 'Neon Alley', sky: ['#12031f', '#3b0764'], far: '#2a0b45', mid: '#1e0836', window: '#f0abfc', ground: '#2e1a47', curb: '#a855f7', road: '#1a0f2b', accent: '#22d3ee', orb: '#f0abfc' },
  { name: 'Rooftops', sky: ['#1e3a8a', '#fb7185'], far: '#4c3b74', mid: '#3a2d5c', window: '#fef3c7', ground: '#57534e', curb: '#a8a29e', road: '#292524', accent: '#fda4af', orb: '#fff7ed' },
]

function hash(i: number, s: number) {
  const v = Math.sin(i * 91.7 + s * 47.3) * 43758.5453
  return v - Math.floor(v)
}

/** Paints a horizontally tileable layer (width tw) for parallax. */
export function paintLayer(ctx: CanvasRenderingContext2D, st: Street, idx: number, layer: 0 | 1, tw: number, H: number, gy: number, u: number) {
  if (layer === 0) {
    const g = ctx.createLinearGradient(0, 0, 0, gy)
    g.addColorStop(0, st.sky[0])
    g.addColorStop(1, st.sky[1])
    ctx.fillStyle = g
    ctx.fillRect(0, 0, tw, H)
    // stars
    if (idx !== 1) {
      ctx.fillStyle = '#fff'
      for (let i = 0; i < 40; i++) {
        ctx.globalAlpha = 0.3 + hash(i, 3) * 0.6
        ctx.fillRect(hash(i, 1) * tw, hash(i, 2) * gy * 0.5, 1.5, 1.5)
      }
      ctx.globalAlpha = 1
    }
    // far skyline
    ctx.fillStyle = st.far
    let x = 0
    let i = 0
    while (x < tw) {
      const bw = (30 + hash(i, 5) * 50) * u
      const bh = (80 + hash(i, 6) * 150) * u
      ctx.fillRect(x, gy - bh, bw + 1, bh)
      if (idx === 1 && i % 4 === 1) {
        // harbor crane
        ctx.fillRect(x + bw * 0.4, gy - bh - 60 * u, 5 * u, 60 * u)
        ctx.fillRect(x + bw * 0.4 - 40 * u, gy - bh - 60 * u, 90 * u, 5 * u)
      }
      x += bw
      i++
    }
    return
  }
  // mid buildings with windows
  let x = 0
  let i = 0
  ctx.clearRect(0, 0, tw, H)
  while (x < tw) {
    const bw = Math.min(tw - x, (70 + hash(i, 8) * 60) * u)
    const bh = (120 + hash(i, 9) * 160) * u
    const top = gy - bh
    ctx.fillStyle = st.mid
    ctx.fillRect(x, top, bw, bh)
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(x, top, 3 * u, bh)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(x, top, bw, 6 * u)
    const cols = Math.max(2, Math.floor(bw / (18 * u)))
    const rows = Math.floor((bh - 40 * u) / (22 * u))
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = hash(i * 31 + r * 7 + c, 11) > 0.55
        ctx.fillStyle = lit ? st.window : 'rgba(0,0,0,0.35)'
        ctx.globalAlpha = lit ? 0.85 : 1
        ctx.fillRect(x + 8 * u + c * ((bw - 16 * u) / cols), top + 14 * u + r * 22 * u, ((bw - 16 * u) / cols) * 0.55, 12 * u)
      }
    }
    ctx.globalAlpha = 1
    if (idx === 2) {
      // neon sign
      const sx = x + bw * 0.2
      const sy = top + bh * 0.35
      ctx.strokeStyle = i % 2 ? '#f472b6' : '#22d3ee'
      ctx.lineWidth = 3 * u
      ctx.globalAlpha = 0.9
      ctx.strokeRect(sx, sy, bw * 0.6, 22 * u)
      ctx.beginPath()
      ctx.arc(sx + bw * 0.3, sy + 11 * u, 6 * u, 0, TAU)
      ctx.stroke()
      ctx.globalAlpha = 1
    } else if (idx === 3) {
      // water tank
      ctx.fillStyle = '#3f2d20'
      ctx.fillRect(x + bw * 0.3, top - 34 * u, 30 * u, 26 * u)
      ctx.fillRect(x + bw * 0.3 + 3 * u, top - 8 * u, 3 * u, 8 * u)
      ctx.fillRect(x + bw * 0.3 + 24 * u, top - 8 * u, 3 * u, 8 * u)
      ctx.beginPath()
      ctx.moveTo(x + bw * 0.3 - 3 * u, top - 34 * u)
      ctx.lineTo(x + bw * 0.3 + 15 * u, top - 46 * u)
      ctx.lineTo(x + bw * 0.3 + 33 * u, top - 34 * u)
      ctx.fill()
    }
    // door
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.fillRect(x + bw * 0.4, gy - 34 * u, 18 * u, 34 * u)
    x += bw + 6 * u
    i++
  }
}

export function drawGround(ctx: CanvasRenderingContext2D, st: Street, W: number, H: number, gy: number, u: number, scroll: number, t: number) {
  ctx.fillStyle = st.ground
  ctx.fillRect(0, gy - 4 * u, W, H - gy)
  // paving lines
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = 1.5
  const step = 46 * u
  const off = -((scroll % step) + step) % step
  for (let x = off; x < W + step; x += step) {
    ctx.beginPath()
    ctx.moveTo(x, gy - 4 * u)
    ctx.lineTo(x - 18 * u, gy + 22 * u)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.12)'
  ctx.fillRect(0, gy - 4 * u, W, 2)
  ctx.fillStyle = st.curb
  ctx.fillRect(0, gy + 22 * u, W, 7 * u)
  ctx.fillStyle = st.road
  ctx.fillRect(0, gy + 29 * u, W, H - gy)
  ctx.fillStyle = 'rgba(253,224,71,0.7)'
  const ls = 70 * u
  const lo = -((scroll * 1.2) % ls + ls) % ls
  for (let x = lo; x < W + ls; x += ls) ctx.fillRect(x, gy + 52 * u, 36 * u, 4 * u)
  if (st.name === 'Neon Alley') {
    // wet reflections
    ctx.globalAlpha = 0.18 + Math.sin(t * 2) * 0.04
    ctx.fillStyle = st.accent
    ctx.fillRect(W * 0.15, gy + 34 * u, W * 0.2, 3 * u)
    ctx.fillStyle = '#f472b6'
    ctx.fillRect(W * 0.6, gy + 40 * u, W * 0.25, 3 * u)
    ctx.globalAlpha = 1
  }
}

export function drawLamp(ctx: CanvasRenderingContext2D, x: number, gy: number, u: number, st: Street, t: number) {
  ctx.fillStyle = '#111827'
  ctx.fillRect(x - 3 * u, gy - 150 * u, 6 * u, 150 * u)
  ctx.fillRect(x - 3 * u, gy - 150 * u, 26 * u, 5 * u)
  ctx.fillRect(x - 8 * u, gy - 8 * u, 16 * u, 8 * u)
  const flick = st.name === 'Neon Alley' && Math.sin(t * 23) > 0.92 ? 0.4 : 1
  const g = ctx.createRadialGradient(x + 22 * u, gy - 140 * u, 0, x + 22 * u, gy - 100 * u, 110 * u)
  g.addColorStop(0, `rgba(254,240,138,${0.35 * flick})`)
  g.addColorStop(1, 'rgba(254,240,138,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x + 22 * u, gy - 142 * u)
  ctx.lineTo(x + 80 * u, gy)
  ctx.lineTo(x - 36 * u, gy)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = `rgba(254,249,195,${flick})`
  ctx.beginPath()
  ctx.ellipse(x + 22 * u, gy - 142 * u, 8 * u, 4 * u, 0, 0, TAU)
  ctx.fill()
}

/** Moon or sun, drawn untiled so it never repeats while scrolling. */
export function drawOrb(ctx: CanvasRenderingContext2D, st: Street, W: number, gy: number, u: number) {
  ctx.globalAlpha = 0.15
  ctx.fillStyle = st.orb
  ctx.beginPath()
  ctx.arc(W * 0.72, gy * 0.22, 46 * u, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.arc(W * 0.72, gy * 0.22, 26 * u, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 1
}
