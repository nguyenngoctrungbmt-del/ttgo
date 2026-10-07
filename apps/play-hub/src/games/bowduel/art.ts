export type Hat = 'cap' | 'hood' | 'viking' | 'band' | 'iron' | 'shadow' | 'wizard' | 'brute' | 'ninja' | 'knight' | 'crown' | 'feather' | 'pirate' | 'samurai' | 'jester' | 'sun'
export type Weapon = 'bow' | 'axe' | 'spear'

export type Look = {
  skin: string
  shirt: string
  trim: string
  pants: string
  hat: Hat
  hatColor: string
  hair: string
  /** Body scale (brutes are bigger). */
  size: number
}

export type Pose = {
  aimA: number
  draw: number
  lean: number
  flinch: number
  blink: boolean
  dead: boolean
}

export type Sky = { top: string; bot: string; far: string; mid: string; ground: string; dirt: string; grass: string; sun: string; night: boolean }

export const SKIES: Sky[] = [
  { top: '#38bdf8', bot: '#e0f2fe', far: '#94a3b8', mid: '#6ea36a', ground: '#7c4a21', dirt: '#5b3415', grass: '#4ade80', sun: '#fef08a', night: false },
  { top: '#fb923c', bot: '#fde68a', far: '#b45309', mid: '#a16207', ground: '#7c2d12', dirt: '#431407', grass: '#a3e635', sun: '#fff7ed', night: false },
  { top: '#6366f1', bot: '#f0abfc', far: '#6b21a8', mid: '#4c1d95', ground: '#3b0764', dirt: '#1e1b4b', grass: '#c084fc', sun: '#fdf4ff', night: false },
  { top: '#0f172a', bot: '#1e3a8a', far: '#1e293b', mid: '#14532d', ground: '#1c1917', dirt: '#0c0a09', grass: '#22c55e', sun: '#f1f5f9', night: true },
  { top: '#7dd3fc', bot: '#f8fafc', far: '#cbd5e1', mid: '#e2e8f0', ground: '#64748b', dirt: '#334155', grass: '#f1f5f9', sun: '#ffffff', night: false },
  // Autumn woods, desert dunes, volcano.
  { top: '#f59e0b', bot: '#fef3c7', far: '#b45309', mid: '#c2410c', ground: '#713f12', dirt: '#422006', grass: '#ea580c', sun: '#fffbeb', night: false },
  { top: '#0ea5e9', bot: '#fde68a', far: '#fbbf24', mid: '#d97706', ground: '#d6a35c', dirt: '#92400e', grass: '#facc15', sun: '#fffbeb', night: false },
  { top: '#1c0a0a', bot: '#9a3412', far: '#450a0a', mid: '#292524', ground: '#292524', dirt: '#0c0a09', grass: '#f97316', sun: '#fdba74', night: true },
]

export function sr(seed: number, i: number) {
  const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453
  return v - Math.floor(v)
}

// ── Weapons ────────────────────────────────────────────────

/** Arrow pointing +x with its tip at (0,0). */
export function drawArrow(ctx: CanvasRenderingContext2D, len = 34, fletch = '#ef4444') {
  ctx.strokeStyle = '#7c4a21'
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-len, 0)
  ctx.lineTo(-5, 0)
  ctx.stroke()
  ctx.fillStyle = '#cbd5e1'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-8, -3.5)
  ctx.lineTo(-6, 0)
  ctx.lineTo(-8, 3.5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = fletch
  ctx.beginPath()
  ctx.moveTo(-len + 9, 0)
  ctx.lineTo(-len - 1, -5)
  ctx.lineTo(-len + 2, 0)
  ctx.lineTo(-len - 1, 5)
  ctx.closePath()
  ctx.fill()
}

/** Spear pointing +x with its tip at (0,0). */
export function drawSpear(ctx: CanvasRenderingContext2D, len = 58) {
  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-len, 0)
  ctx.lineTo(-10, 0)
  ctx.stroke()
  ctx.fillStyle = '#e2e8f0'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-7, -5, -14, 0)
  ctx.quadraticCurveTo(-7, 5, 0, 0)
  ctx.fill()
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.moveTo(-14, 0)
  ctx.lineTo(-20, -5)
  ctx.lineTo(-19, 0)
  ctx.lineTo(-20, 5)
  ctx.closePath()
  ctx.fill()
}

/** Throwing axe centred at its balance point, handle along +x. */
export function drawAxe(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#7c4a21'
  ctx.lineWidth = 3.4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-12, 0)
  ctx.lineTo(14, 0)
  ctx.stroke()
  ctx.fillStyle = '#cbd5e1'
  ctx.beginPath()
  ctx.moveTo(8, -2)
  ctx.quadraticCurveTo(10, -10, 18, -13)
  ctx.quadraticCurveTo(21, -4, 18, 5)
  ctx.quadraticCurveTo(11, 3, 8, 2)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.strokeStyle = '#f8fafc'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(18, -11)
  ctx.quadraticCurveTo(20.5, -4, 18, 3)
  ctx.stroke()
}

// ── Fighter ────────────────────────────────────────────────

const SHOULDER_X = 2
const SHOULDER_Y = -47

export function handPositions(aimA: number, draw: number, weapon: Weapon) {
  const c = Math.cos(aimA)
  const s = Math.sin(aimA)
  if (weapon === 'bow') {
    const fx = SHOULDER_X + c * 20
    const fy = SHOULDER_Y + s * 20
    return { fx, fy, bx: fx - c * (7 + draw * 17), by: fy - s * (7 + draw * 17) }
  }
  if (weapon === 'spear') {
    const k = 8 - draw * 14
    return { fx: SHOULDER_X + c * (k + 10), fy: SHOULDER_Y + s * (k + 10), bx: SHOULDER_X + c * k - 2, by: SHOULDER_Y + s * k + 2 }
  }
  // axe: wind up behind the head
  const wa = aimA - 1.2 - draw * 1.6
  return { fx: SHOULDER_X + Math.cos(wa) * 19, fy: SHOULDER_Y + Math.sin(wa) * 19, bx: SHOULDER_X + c * 12, by: SHOULDER_Y + s * 12 + 6 }
}

function limb(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = w
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
}

export function drawHat(ctx: CanvasRenderingContext2D, look: Look, hx: number, hy: number, r: number, t: number) {
  const c = look.hatColor
  ctx.fillStyle = c
  switch (look.hat) {
    case 'cap':
      ctx.beginPath()
      ctx.arc(hx, hy - 2, r * 1.02, Math.PI * 1.05, Math.PI * 1.95)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(hx + r * 0.8, hy - r * 0.3, r * 0.65, r * 0.18, 0.1, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.moveTo(hx - r * 0.6, hy - r * 0.8)
      ctx.lineTo(hx - r * 1.5, hy - r * 1.4)
      ctx.lineTo(hx - r * 0.85, hy - r * 0.55)
      ctx.fill()
      break
    case 'hood':
    case 'shadow':
      ctx.beginPath()
      ctx.arc(hx - 1, hy, r * 1.22, Math.PI * 0.62, Math.PI * 2.1)
      ctx.lineTo(hx - r * 1.5, hy + r * 0.9)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.arc(hx + 2, hy + 1, r * 0.98, Math.PI * 1.35, Math.PI * 2.35)
      ctx.fill()
      break
    case 'viking':
    case 'iron':
    case 'knight':
      ctx.beginPath()
      ctx.arc(hx, hy - 1, r * 1.06, Math.PI, Math.PI * 2)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.ellipse(hx - r * 0.35, hy - r * 0.7, r * 0.35, r * 0.12, -0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#475569'
      ctx.fillRect(hx - r * 1.08, hy - 3, r * 2.16, 3.5)
      if (look.hat === 'viking') {
        ctx.fillStyle = '#f5f5f4'
        for (const sx of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(hx + sx * r * 0.8, hy - r * 0.5)
          ctx.quadraticCurveTo(hx + sx * r * 1.7, hy - r * 0.9, hx + sx * r * 1.5, hy - r * 1.9)
          ctx.quadraticCurveTo(hx + sx * r * 1.2, hy - r * 1.0, hx + sx * r * 0.6, hy - r * 0.9)
          ctx.closePath()
          ctx.fill()
        }
      } else if (look.hat === 'knight') {
        ctx.fillStyle = c
        ctx.fillRect(hx - r * 1.05, hy - 2, r * 2.1, r * 0.75)
        ctx.fillStyle = '#111827'
        ctx.fillRect(hx - r * 0.1, hy + r * 0.05, r * 1.15, 2.4)
        ctx.fillStyle = '#dc2626'
        ctx.beginPath()
        ctx.moveTo(hx - r * 0.2, hy - r * 1.05)
        ctx.quadraticCurveTo(hx - r * 1.6, hy - r * 1.9 + Math.sin(t * 6) * 2, hx - r * 2.2, hy - r * 0.6)
        ctx.quadraticCurveTo(hx - r * 1.1, hy - r * 1.1, hx + r * 0.2, hy - r * 0.95)
        ctx.fill()
      } else {
        ctx.fillStyle = '#475569'
        ctx.fillRect(hx + r * 0.25, hy - 2, 3, r * 0.9)
      }
      break
    case 'band':
    case 'ninja':
      if (look.hat === 'ninja') {
        ctx.beginPath()
        ctx.arc(hx, hy, r * 1.04, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = look.skin
        ctx.fillRect(hx - r * 0.2, hy - r * 0.42, r * 1.25, r * 0.5)
      }
      ctx.fillStyle = look.hat === 'ninja' ? '#dc2626' : c
      ctx.fillRect(hx - r * 1.02, hy - r * 0.68, r * 2.04, r * 0.32)
      ctx.beginPath()
      ctx.moveTo(hx - r * 0.95, hy - r * 0.55)
      ctx.quadraticCurveTo(hx - r * 1.8, hy - r * 0.2 + Math.sin(t * 7) * 2, hx - r * 2.3, hy + r * 0.1)
      ctx.lineTo(hx - r * 2.1, hy + r * 0.35)
      ctx.quadraticCurveTo(hx - r * 1.6, hy, hx - r * 0.95, hy - r * 0.35)
      ctx.fill()
      break
    case 'wizard':
      ctx.beginPath()
      ctx.moveTo(hx - r * 1.5, hy - r * 0.45)
      ctx.lineTo(hx + r * 1.5, hy - r * 0.45)
      ctx.lineTo(hx + r * 0.6, hy - r * 0.75)
      ctx.lineTo(hx - r * 0.7, hy - r * 2.6)
      ctx.lineTo(hx - r * 0.5, hy - r * 0.75)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(hx - r * 0.1, hy - r * 1.3, 2.2, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'brute':
      ctx.fillStyle = look.hair
      for (let i = 0; i < 5; i++) {
        ctx.beginPath()
        ctx.moveTo(hx - r * 0.7 + i * r * 0.35, hy - r * 0.8)
        ctx.lineTo(hx - r * 0.55 + i * r * 0.35, hy - r * 1.45)
        ctx.lineTo(hx - r * 0.4 + i * r * 0.35, hy - r * 0.8)
        ctx.fill()
      }
      break
    case 'feather':
      ctx.fillStyle = look.hair
      ctx.beginPath()
      ctx.arc(hx, hy - 1, r * 1.03, Math.PI * 1.05, Math.PI * 1.95)
      ctx.fill()
      ctx.fillStyle = '#a16207'
      ctx.fillRect(hx - r * 1.02, hy - r * 0.62, r * 2.04, r * 0.26)
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.ellipse(hx - r * 1.0, hy - r * 1.3, r * 0.22, r * 0.85, -0.5 + Math.sin(t * 3) * 0.08, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'pirate':
      ctx.beginPath()
      ctx.moveTo(hx - r * 1.6, hy - r * 0.5)
      ctx.quadraticCurveTo(hx, hy - r * 2.4, hx + r * 1.6, hy - r * 0.5)
      ctx.quadraticCurveTo(hx, hy - r * 0.95, hx - r * 1.6, hy - r * 0.5)
      ctx.fill()
      ctx.fillStyle = '#f8fafc'
      ctx.beginPath()
      ctx.arc(hx, hy - r * 1.2, r * 0.22, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#111827'
      ctx.fillRect(hx - r * 0.2, hy - r * 0.3, r * 1.2, 2)
      ctx.beginPath()
      ctx.arc(hx + r * 0.5, hy - r * 0.1, r * 0.22, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'samurai':
      ctx.beginPath()
      ctx.arc(hx, hy - 1, r * 1.08, Math.PI, Math.PI * 2)
      ctx.closePath()
      ctx.fill()
      ctx.fillRect(hx - r * 1.5, hy - r * 0.15, r * 0.7, r * 0.8)
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.moveTo(hx, hy - r * 0.95)
      ctx.lineTo(hx - r * 0.9, hy - r * 2.0)
      ctx.lineTo(hx - r * 0.25, hy - r * 1.0)
      ctx.lineTo(hx + r * 0.25, hy - r * 1.0)
      ctx.lineTo(hx + r * 0.9, hy - r * 2.0)
      ctx.closePath()
      ctx.fill()
      break
    case 'jester':
      for (const [i, col] of [c, look.trim].entries()) {
        const sx = i ? 1 : -1
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.moveTo(hx - r * 0.9 * (i ? 0 : 1), hy - r * 0.6)
        ctx.quadraticCurveTo(hx + sx * r * 1.4, hy - r * 2.0, hx + sx * r * 1.9, hy - r * 0.9 + Math.sin(t * 5 + i) * 2)
        ctx.lineTo(hx + r * 0.9 * (i ? 1 : 0), hy - r * 0.6)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#fde047'
        ctx.beginPath()
        ctx.arc(hx + sx * r * 1.9, hy - r * 0.9 + Math.sin(t * 5 + i) * 2, r * 0.2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = c
      ctx.fillRect(hx - r * 1.0, hy - r * 0.68, r * 2.0, r * 0.3)
      break
    case 'sun':
      ctx.fillStyle = 'rgba(253,224,71,0.35)'
      ctx.beginPath()
      ctx.arc(hx, hy - r * 0.6, r * 2.0 + Math.sin(t * 3) * 1.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = c
      ctx.beginPath()
      for (let i = 0; i < 9; i++) {
        const a = Math.PI + (i / 8) * Math.PI
        const rr = i % 2 ? r * 1.15 : r * 1.9
        ctx.lineTo(hx + Math.cos(a) * rr, hy - r * 0.3 + Math.sin(a) * rr)
      }
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ea580c'
      ctx.beginPath()
      ctx.arc(hx, hy - r * 1.05, r * 0.22, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'crown':
      ctx.fillStyle = '#e0f2fe'
      ctx.beginPath()
      ctx.arc(hx, hy - 1, r * 1.04, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#7dd3fc'
      ctx.beginPath()
      ctx.moveTo(hx - r * 0.9, hy - r * 0.55)
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(hx - r * 0.9 + (i + 0.5) * r * 0.36, hy - r * (i % 2 ? 1.25 : 1.75))
        ctx.lineTo(hx - r * 0.9 + (i + 1) * r * 0.36, hy - r * 0.95)
      }
      ctx.lineTo(hx + r * 0.9, hy - r * 0.55)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#0369a1'
      ctx.lineWidth = 1
      ctx.stroke()
      break
  }
}

/**
 * Fighter in local space: feet at (0,0), facing +x, y up is negative.
 * Caller applies translate/mirror/lean.
 */
export function drawFighter(ctx: CanvasRenderingContext2D, look: Look, weapon: Weapon, p: Pose, t: number, ready: boolean) {
  const breathe = Math.sin(t * 2.4) * 0.8
  const hand = handPositions(p.aimA, p.draw, weapon)
  const hx = 1
  const hy = -66 + breathe * 0.5
  const r = 14
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)'
  ctx.beginPath()
  ctx.ellipse(0, 1, 16, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  // legs
  limb(ctx, -1, -24, -7, -2, 7, look.pants)
  limb(ctx, 2, -24, 8, -2, 7, look.pants)
  ctx.fillStyle = '#3f2a14'
  ctx.beginPath()
  ctx.roundRect(-12, -5, 10, 6, 2.5)
  ctx.roundRect(4, -5, 11, 6, 2.5)
  ctx.fill()
  // back arm
  limb(ctx, SHOULDER_X - 2, SHOULDER_Y + 1, hand.bx, hand.by, 5.5, shade(look.shirt, -0.2))
  ctx.fillStyle = look.skin
  ctx.beginPath()
  ctx.arc(hand.bx, hand.by, 3.4, 0, Math.PI * 2)
  ctx.fill()
  // torso
  ctx.fillStyle = look.shirt
  ctx.beginPath()
  ctx.roundRect(-11, -53 + breathe, 22, 31 - breathe, 7)
  ctx.fill()
  ctx.fillStyle = look.trim
  ctx.fillRect(-11, -30, 22, 4)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fillRect(-8, -50 + breathe, 4, 18)
  ctx.fillStyle = '#fbbf24'
  ctx.fillRect(-2, -30, 4, 4)
  // head
  ctx.fillStyle = look.hair
  ctx.beginPath()
  ctx.arc(hx - 2, hy - 1, r * 1.0, Math.PI * 0.7, Math.PI * 1.9)
  ctx.fill()
  ctx.fillStyle = look.skin
  ctx.beginPath()
  ctx.arc(hx, hy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.beginPath()
  ctx.arc(hx, hy, r, Math.PI * 0.15, Math.PI * 0.85)
  ctx.fill()
  ctx.fillStyle = shade(look.skin, -0.12)
  ctx.beginPath()
  ctx.arc(hx - r * 0.55, hy + 1, 3, 0, Math.PI * 2)
  ctx.fill()
  // face (looks toward aim)
  const ex = hx + 5
  const ey = hy - 1
  const lx = Math.cos(p.aimA) * 1.4
  const ly = Math.sin(p.aimA) * 1.4
  if (p.dead) {
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    for (const ox of [-1, 6]) {
      ctx.moveTo(ex + ox - 2.2, ey - 2.2)
      ctx.lineTo(ex + ox + 2.2, ey + 2.2)
      ctx.moveTo(ex + ox + 2.2, ey - 2.2)
      ctx.lineTo(ex + ox - 2.2, ey + 2.2)
    }
    ctx.stroke()
  } else {
    for (const ox of [-1, 6]) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(ex + ox, ey, 2.8, p.blink ? 0.5 : p.flinch > 0 ? 3.6 : 3.1, 0, 0, Math.PI * 2)
      ctx.fill()
      if (!p.blink) {
        ctx.fillStyle = look.hat === 'shadow' ? '#f43f5e' : '#111827'
        ctx.beginPath()
        ctx.arc(ex + ox + lx, ey + ly, p.flinch > 0 ? 1.1 : 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    if (p.flinch > 0) {
      ctx.moveTo(ex - 4, ey - 6)
      ctx.lineTo(ex + 1, ey - 4.5)
      ctx.moveTo(ex + 10, ey - 6)
      ctx.lineTo(ex + 4.5, ey - 4.5)
    } else {
      ctx.moveTo(ex - 4, ey - 4.5 - p.draw * 1.5)
      ctx.lineTo(ex + 1, ey - 5.5)
      ctx.moveTo(ex + 4.5, ey - 5.5)
      ctx.lineTo(ex + 9.5, ey - 4.5 - p.draw * 1.5)
    }
    ctx.stroke()
  }
  if (p.flinch > 0 || p.dead) {
    ctx.fillStyle = '#7f1d1d'
    ctx.beginPath()
    ctx.ellipse(ex + 3, ey + 7, 2.6, 2.2, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.strokeStyle = '#7f1d1d'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    if (p.draw > 0.5) {
      ctx.moveTo(ex - 1, ey + 7)
      ctx.lineTo(ex + 7, ey + 7)
    } else {
      ctx.moveTo(ex - 1, ey + 6)
      ctx.quadraticCurveTo(ex + 3, ey + 8.5, ex + 7, ey + 5.5)
    }
    ctx.stroke()
  }
  if (look.hat === 'brute' || look.hat === 'viking') {
    ctx.fillStyle = look.hair
    ctx.beginPath()
    ctx.moveTo(ex - 5, ey + 4)
    ctx.quadraticCurveTo(ex + 3, ey + 18, ex + 11, ey + 4)
    ctx.quadraticCurveTo(ex + 3, ey + 9, ex - 5, ey + 4)
    ctx.fill()
  }
  drawHat(ctx, look, hx, hy, r, t)
  // front arm + weapon
  limb(ctx, SHOULDER_X + 1, SHOULDER_Y, hand.fx, hand.fy, 5.5, look.shirt)
  const c = Math.cos(p.aimA)
  const s = Math.sin(p.aimA)
  if (weapon === 'bow') {
    const bend = 1 + p.draw * 0.25
    ctx.strokeStyle = '#7c2d12'
    ctx.lineWidth = 3.2
    ctx.beginPath()
    ctx.arc(hand.fx - c * 6, hand.fy - s * 6, 17, p.aimA - 1.15 / bend, p.aimA + 1.15 / bend)
    ctx.stroke()
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = 1.2
    ctx.stroke()
    const t1x = hand.fx - c * 6 + Math.cos(p.aimA - 1.15 / bend) * 17
    const t1y = hand.fy - s * 6 + Math.sin(p.aimA - 1.15 / bend) * 17
    const t2x = hand.fx - c * 6 + Math.cos(p.aimA + 1.15 / bend) * 17
    const t2y = hand.fy - s * 6 + Math.sin(p.aimA + 1.15 / bend) * 17
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(t1x, t1y)
    ctx.lineTo(hand.bx, hand.by)
    ctx.lineTo(t2x, t2y)
    ctx.stroke()
    if (ready) {
      ctx.save()
      ctx.translate(hand.bx + c * 34, hand.by + s * 34)
      ctx.rotate(p.aimA)
      drawArrow(ctx)
      ctx.restore()
    }
  } else if (weapon === 'spear' && ready) {
    ctx.save()
    ctx.translate(hand.fx + c * 34, hand.fy + s * 34)
    ctx.rotate(p.aimA)
    drawSpear(ctx)
    ctx.restore()
  } else if (weapon === 'axe' && ready) {
    ctx.save()
    ctx.translate(hand.fx, hand.fy)
    ctx.rotate(p.aimA - 1.2 - p.draw * 1.6 - Math.PI / 2)
    ctx.translate(8, 0)
    drawAxe(ctx)
    ctx.restore()
  }
  ctx.fillStyle = look.skin
  ctx.beginPath()
  ctx.arc(hand.fx, hand.fy, 3.6, 0, Math.PI * 2)
  ctx.fill()
}

export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255
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

// ── Ragdoll ────────────────────────────────────────────────

export type RagPt = { x: number; y: number; px: number; py: number }
/** head, neck, hip, handF, handB, footF, footB */
export type Rag = { pts: RagPt[]; t: number; dt0: number }

export const RAG_STICKS: Array<[number, number, number]> = [
  [0, 1, 15],
  [1, 2, 27],
  [1, 3, 20],
  [1, 4, 20],
  [2, 5, 25],
  [2, 6, 25],
  [0, 2, 41],
  [5, 6, 12],
]

export function drawRag(ctx: CanvasRenderingContext2D, rag: Rag, look: Look, toX: (x: number) => number, toY: (y: number) => number, s: number, t: number) {
  const P = rag.pts.map((p) => [toX(p.x), toY(p.y)] as const)
  const w = (n: number) => n * s
  const L = (a: number, b: number, width: number, color: string) => {
    ctx.strokeStyle = color
    ctx.lineWidth = w(width)
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(P[a][0], P[a][1])
    ctx.lineTo(P[b][0], P[b][1])
    ctx.stroke()
  }
  L(2, 5, 7, look.pants)
  L(2, 6, 7, look.pants)
  L(1, 4, 5.5, shade(look.shirt, -0.2))
  L(1, 2, 20, look.shirt)
  L(1, 3, 5.5, look.shirt)
  // head
  const [hx, hy] = P[0]
  const ang = Math.atan2(P[0][1] - P[1][1], P[0][0] - P[1][0]) + Math.PI / 2
  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(ang)
  ctx.scale(s, s)
  ctx.fillStyle = look.skin
  ctx.beginPath()
  ctx.arc(0, 0, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  for (const ox of [3, 10]) {
    ctx.moveTo(ox - 2.2, -3.2)
    ctx.lineTo(ox + 2.2, 1.2)
    ctx.moveTo(ox + 2.2, -3.2)
    ctx.lineTo(ox - 2.2, 1.2)
  }
  ctx.stroke()
  ctx.fillStyle = '#7f1d1d'
  ctx.beginPath()
  ctx.ellipse(7, 7, 2.5, 2, 0, 0, Math.PI * 2)
  ctx.fill()
  drawHat(ctx, look, 1, 0, 14, t)
  ctx.restore()
}

export function stepRag(rag: Rag, dt: number, ground: (x: number) => number) {
  if (dt <= 0) return
  rag.t += dt
  // Verlet with a variable step: rescale the implicit velocity so slow-mo stays smooth.
  const k = dt / (rag.dt0 || dt)
  rag.dt0 = dt
  for (const p of rag.pts) {
    const vx = (p.x - p.px) * 0.995 * k
    const vy = (p.y - p.py) * 0.995 * k
    p.px = p.x
    p.py = p.y
    p.x += vx
    p.y += vy + 900 * dt * dt
  }
  for (let it = 0; it < 5; it++) {
    for (const [a, b, len] of RAG_STICKS) {
      const A = rag.pts[a]
      const B = rag.pts[b]
      const dx = B.x - A.x
      const dy = B.y - A.y
      const d = Math.hypot(dx, dy) || 1
      const k = ((d - len) / d) * 0.5
      A.x += dx * k
      A.y += dy * k
      B.x -= dx * k
      B.y -= dy * k
    }
    rag.pts.forEach((p, i) => {
      const rad = i === 0 ? 13 : i === 2 ? 8 : 3
      const gy = ground(p.x) - rad
      if (p.y > gy) {
        p.y = gy
        p.px = p.x - (p.x - p.px) * 0.5
      }
    })
  }
}
