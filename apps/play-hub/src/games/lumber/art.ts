/** Lumber Chop vector art: seasons, trunk segments, branches and the lumberjack. */

export type SegKind = 'log' | 'gold' | 'hard' | 'fury' | 'freeze' | 'flip' | 'helmet'
/** `flip` animates a thorn vine swapping sides (1 → 0). */
export type Seg = { branch: -1 | 0 | 1; kind: SegKind; hp: number; dent: number; flip?: number }

export type Season = {
  name: string
  skyTop: string
  skyBot: string
  far: string
  near: string
  ground: string
  groundDark: string
  leaf: string
  leafDark: string
  bark: string
  barkLight: string
  barkDark: string
  ambient: string[]
  /** Ambient particle style. */
  fall: 'petal' | 'pollen' | 'leaf' | 'snow' | 'firefly' | 'ember'
  sun: string
  night?: boolean
  /** Extra background layers. */
  volcano?: boolean
  aurora?: boolean
  pines?: boolean
}

export const SEASONS: Season[] = [
  { name: 'Spring', skyTop: '#60a5fa', skyBot: '#dbeafe', far: '#86efac', near: '#4ade80', ground: '#65a30d', groundDark: '#3f6212', leaf: '#4ade80', leafDark: '#15803d', bark: '#8b5a2b', barkLight: '#b07a45', barkDark: '#5b3716', ambient: ['#f9a8d4', '#fbcfe8', '#ffffff'], fall: 'petal', sun: '#fef08a' },
  { name: 'Summer', skyTop: '#0ea5e9', skyBot: '#fef3c7', far: '#22c55e', near: '#16a34a', ground: '#4d7c0f', groundDark: '#365314', leaf: '#16a34a', leafDark: '#14532d', bark: '#7c4a21', barkLight: '#a16a3a', barkDark: '#4a2a10', ambient: ['#fef08a', '#fde68a'], fall: 'pollen', sun: '#fde047' },
  { name: 'Autumn', skyTop: '#f97316', skyBot: '#fde68a', far: '#c2410c', near: '#9a3412', ground: '#a16207', groundDark: '#713f12', leaf: '#f97316', leafDark: '#b45309', bark: '#6b3f1d', barkLight: '#94603a', barkDark: '#3f2410', ambient: ['#ea580c', '#facc15', '#dc2626'], fall: 'leaf', sun: '#fff7ed' },
  { name: 'Ember Grove', skyTop: '#431407', skyBot: '#fb923c', far: '#7c2d12', near: '#451a03', ground: '#57534e', groundDark: '#292524', leaf: '#fb923c', leafDark: '#9a3412', bark: '#3f2a1d', barkLight: '#5c4030', barkDark: '#1c120b', ambient: ['#fb923c', '#fde047', '#f97316'], fall: 'ember', sun: '#fecaca', volcano: true },
  { name: 'Winter', skyTop: '#64748b', skyBot: '#e2e8f0', far: '#f1f5f9', near: '#cbd5e1', ground: '#f8fafc', groundDark: '#cbd5e1', leaf: '#e2e8f0', leafDark: '#94a3b8', bark: '#5b4636', barkLight: '#7d6552', barkDark: '#3a2a1e', ambient: ['#ffffff', '#e0f2fe'], fall: 'snow', sun: '#f8fafc' },
  { name: 'Aurora Taiga', skyTop: '#020617', skyBot: '#134e4a', far: '#115e59', near: '#064e3b', ground: '#e2e8f0', groundDark: '#94a3b8', leaf: '#047857', leafDark: '#064e3b', bark: '#4b3b30', barkLight: '#6d5848', barkDark: '#2a1f18', ambient: ['#ffffff', '#ccfbf1'], fall: 'snow', sun: '#f0fdfa', night: true, aurora: true, pines: true },
  { name: 'Starry Night', skyTop: '#0b1026', skyBot: '#3730a3', far: '#1e3a8a', near: '#172554', ground: '#14532d', groundDark: '#052e16', leaf: '#15803d', leafDark: '#052e16', bark: '#4a3424', barkLight: '#6b4c36', barkDark: '#2a1c12', ambient: ['#fde047', '#bef264'], fall: 'firefly', sun: '#f1f5f9', night: true },
  { name: 'Cherry Bloom', skyTop: '#f472b6', skyBot: '#fdf2f8', far: '#f9a8d4', near: '#db2777', ground: '#65a30d', groundDark: '#3f6212', leaf: '#f9a8d4', leafDark: '#db2777', bark: '#5b3a2e', barkLight: '#7f5545', barkDark: '#3a2219', ambient: ['#fbcfe8', '#ffffff', '#f472b6'], fall: 'petal', sun: '#fff1f2' },
]

/** Bark segment with optional gold / iron / power-up decoration. */
export function drawSeg(ctx: CanvasRenderingContext2D, s: Seg, x: number, y: number, w: number, h: number, sea: Season, t: number) {
  const gold = s.kind === 'gold'
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0)
  g.addColorStop(0, gold ? '#a16207' : sea.barkDark)
  g.addColorStop(0.35, gold ? '#fde047' : sea.barkLight)
  g.addColorStop(0.6, gold ? '#facc15' : sea.bark)
  g.addColorStop(1, gold ? '#854d0e' : sea.barkDark)
  ctx.fillStyle = g
  ctx.fillRect(x - w / 2, y, w, h + 0.5)
  // Bark grooves
  ctx.strokeStyle = gold ? 'rgba(133,77,14,0.55)' : 'rgba(0,0,0,0.22)'
  ctx.lineWidth = 2
  ctx.beginPath()
  const seed = (Math.round(y / h) * 7919) % 5
  for (let i = 0; i < 3; i++) {
    const gx = x - w * 0.3 + i * w * 0.28 + ((seed + i) % 3) * 2
    ctx.moveTo(gx, y + h * 0.12)
    ctx.quadraticCurveTo(gx + 4, y + h * 0.5, gx - 1, y + h * 0.88)
  }
  ctx.stroke()
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y + 0.5)
  ctx.lineTo(x + w / 2, y + 0.5)
  ctx.stroke()
  if (gold) {
    const k = (t * 1.5 + y * 0.01) % 1
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.beginPath()
    ctx.moveTo(x - w / 2 + k * w * 1.4 - w * 0.2, y)
    ctx.lineTo(x - w / 2 + k * w * 1.4, y)
    ctx.lineTo(x - w / 2 + k * w * 1.4 - w * 0.25, y + h)
    ctx.lineTo(x - w / 2 + k * w * 1.4 - w * 0.45, y + h)
    ctx.closePath()
    ctx.fill()
    star(ctx, x + w * 0.22, y + h * 0.3, 4 + Math.sin(t * 6) * 1.5, '#fff')
  }
  if (s.kind === 'hard') {
    for (const by of [0.22, 0.7]) {
      ctx.fillStyle = '#64748b'
      ctx.fillRect(x - w / 2 - 2, y + h * by, w + 4, h * 0.14)
      ctx.fillStyle = '#cbd5e1'
      ctx.fillRect(x - w / 2 - 2, y + h * by, w + 4, h * 0.04)
      ctx.fillStyle = '#1e293b'
      for (const rx of [-0.32, 0, 0.32]) {
        ctx.beginPath()
        ctx.arc(x + rx * w, y + h * (by + 0.07), 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (s.dent > 0) {
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x - 6, y + h * 0.4)
      ctx.lineTo(x + 2, y + h * 0.5)
      ctx.lineTo(x - 3, y + h * 0.58)
      ctx.lineTo(x + 6, y + h * 0.66)
      ctx.stroke()
    }
  }
  if (s.kind === 'flip') {
    // Thorny vine wrapped around the log
    ctx.strokeStyle = '#7e22ce'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(x - w / 2, y + h * 0.15)
    ctx.quadraticCurveTo(x, y + h * 0.75, x + w / 2, y + h * 0.4)
    ctx.moveTo(x - w / 2, y + h * 0.8)
    ctx.quadraticCurveTo(x, y + h * 0.2, x + w / 2, y + h * 0.9)
    ctx.stroke()
    ctx.fillStyle = '#e11d48'
    for (const [tx, ty] of THORNS) {
      ctx.beginPath()
      ctx.moveTo(x + tx * w - 3, y + ty * h)
      ctx.lineTo(x + tx * w, y + ty * h - 6)
      ctx.lineTo(x + tx * w + 3, y + ty * h)
      ctx.fill()
    }
  }
  if (s.kind === 'helmet') {
    const cx = x
    const cy = y + h / 2
    const r = Math.min(w, h) * 0.3
    const pulse = 1 + Math.sin(t * 6) * 0.07
    ctx.fillStyle = 'rgba(254,240,138,0.5)'
    ctx.beginPath()
    ctx.arc(cx, cy, r * 1.5 * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = '#ca8a04'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    hardHat(ctx, cx, cy + r * 0.38, r * 0.82)
  }
  if (s.kind === 'fury' || s.kind === 'freeze') {
    const cx = x
    const cy = y + h / 2
    const r = Math.min(w, h) * 0.3
    const pulse = 1 + Math.sin(t * 7) * 0.08
    const col = s.kind === 'fury' ? '#f97316' : '#38bdf8'
    const bgc = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6)
    bgc.addColorStop(0, s.kind === 'fury' ? 'rgba(254,215,170,0.95)' : 'rgba(186,230,253,0.95)')
    bgc.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = bgc
    ctx.beginPath()
    ctx.arc(cx, cy, r * 1.6 * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.strokeStyle = col
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    if (s.kind === 'fury') axeIcon(ctx, cx, cy, r * 0.75)
    else flakeIcon(ctx, cx, cy, r * 0.7)
  }
}

export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y - r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.quadraticCurveTo(x, y, x, y + r)
  ctx.quadraticCurveTo(x, y, x - r, y)
  ctx.quadraticCurveTo(x, y, x, y - r)
  ctx.fill()
}

export function axeIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.6)
  ctx.fillStyle = '#92400e'
  ctx.fillRect(-r * 0.12, -r, r * 0.24, r * 2)
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.moveTo(r * 0.1, -r * 0.95)
  ctx.quadraticCurveTo(r * 1.1, -r * 0.9, r * 0.95, -r * 0.05)
  ctx.lineTo(r * 0.1, -r * 0.35)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#fecaca'
  ctx.fillRect(r * 0.75, -r * 0.8, r * 0.15, r * 0.6)
  ctx.restore()
}

export function flakeIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.strokeStyle = '#0284c7'
  ctx.lineWidth = Math.max(1.5, r * 0.18)
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3
    const dx = Math.cos(a) * r
    const dy = Math.sin(a) * r
    ctx.moveTo(x - dx, y - dy)
    ctx.lineTo(x + dx, y + dy)
    for (const s of [-1, 1]) {
      const ex = x + dx * 0.6 * s
      const ey = y + dy * 0.6 * s
      ctx.moveTo(ex, ey)
      ctx.lineTo(ex + Math.cos(a + 0.8 * s) * r * 0.3 * s, ey + Math.sin(a + 0.8 * s) * r * 0.3 * s)
    }
  }
  ctx.stroke()
}

/** Branch sticking out of a trunk side (dir -1 = left), with a leafy tip. */
export function drawBranch(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, len: number, thick: number, sea: Season, sway: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(dir, 1)
  ctx.rotate(-0.08 + sway)
  const g = ctx.createLinearGradient(0, -thick, 0, thick)
  g.addColorStop(0, sea.barkLight)
  g.addColorStop(1, sea.barkDark)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-4, -thick * 0.6)
  ctx.quadraticCurveTo(len * 0.5, -thick * 0.55, len, -thick * 0.2)
  ctx.lineTo(len, thick * 0.2)
  ctx.quadraticCurveTo(len * 0.5, thick * 0.6, -4, thick * 0.65)
  ctx.closePath()
  ctx.fill()
  // twig
  ctx.strokeStyle = sea.bark
  ctx.lineWidth = thick * 0.3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(len * 0.55, -thick * 0.3)
  ctx.lineTo(len * 0.7, -thick * 1.4)
  ctx.stroke()
  // leaves
  const leaf = (lx: number, ly: number, r: number, c: string) => {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(lx, ly, r, 0, Math.PI * 2)
    ctx.fill()
  }
  leaf(len * 0.98, -thick * 0.2, thick * 1.25, sea.leafDark)
  leaf(len * 0.82, -thick * 0.9, thick * 1.0, sea.leafDark)
  leaf(len * 1.05, -thick * 0.6, thick * 1.0, sea.leaf)
  leaf(len * 0.88, -thick * 0.25, thick * 0.85, sea.leaf)
  leaf(len * 0.7, -thick * 1.5, thick * 0.7, sea.leaf)
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.arc(len * 1.0, -thick * 0.95, thick * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export type JackPose = {
  /** 1 = axe at strike, 0 = wound up. */
  swing: number
  squash: number
  tilt: number
  blink: boolean
  fury: boolean
  helmet: boolean
}

/** The lumberjack, feet at (x, y), facing `face` (+1 right). Scale k ≈ 1 at 64 px logs. */
export function drawJack(ctx: CanvasRenderingContext2D, x: number, y: number, face: number, k: number, p: JackPose) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(0, 0, 22 * k, 6 * k, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.rotate(p.tilt)
  ctx.scale(face * k * (1 + (1 - p.squash) * 0.4), k * p.squash)

  // legs + boots
  ctx.fillStyle = '#1e3a8a'
  ctx.beginPath()
  ctx.roundRect(-11, -30, 9, 26, 3)
  ctx.roundRect(2, -30, 9, 26, 3)
  ctx.fill()
  ctx.fillStyle = '#422006'
  ctx.beginPath()
  ctx.roundRect(-13, -7, 13, 7, 3)
  ctx.roundRect(1, -7, 14, 7, 3)
  ctx.fill()

  // back arm (behind body)
  const a = -1.9 + p.swing * 2.25
  const sx = 2
  const sy = -54
  // body: plaid shirt
  const body = ctx.createLinearGradient(-14, 0, 14, 0)
  body.addColorStop(0, '#991b1b')
  body.addColorStop(0.5, '#dc2626')
  body.addColorStop(1, '#991b1b')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.roundRect(-14, -62, 28, 34, 9)
  ctx.fill()
  ctx.strokeStyle = 'rgba(30,0,0,0.45)'
  ctx.lineWidth = 2
  ctx.beginPath()
  for (const px of [-7, 0, 7]) {
    ctx.moveTo(px, -60)
    ctx.lineTo(px, -30)
  }
  for (const py of [-52, -42]) {
    ctx.moveTo(-13, py)
    ctx.lineTo(13, py)
  }
  ctx.stroke()
  ctx.fillStyle = '#422006'
  ctx.fillRect(-14, -33, 28, 5)
  ctx.fillStyle = '#facc15'
  ctx.fillRect(-3, -33, 6, 5)

  // head
  ctx.fillStyle = '#f5c39b'
  ctx.beginPath()
  ctx.arc(2, -73, 11, 0, Math.PI * 2)
  ctx.fill()
  // beard
  ctx.fillStyle = '#78350f'
  ctx.beginPath()
  ctx.moveTo(-8, -74)
  ctx.quadraticCurveTo(-8, -58, 3, -57)
  ctx.quadraticCurveTo(14, -58, 13, -72)
  ctx.quadraticCurveTo(8, -66, 2, -67)
  ctx.quadraticCurveTo(-3, -67, -8, -74)
  ctx.fill()
  // nose + eye
  ctx.fillStyle = '#e8a87c'
  ctx.beginPath()
  ctx.arc(11, -72, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1f2937'
  if (p.blink) ctx.fillRect(5, -77, 5, 1.5)
  else {
    ctx.beginPath()
    ctx.arc(7.5, -77, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = '#78350f'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(4, -81)
  ctx.lineTo(10, p.fury ? -79 : -81.5)
  ctx.stroke()
  // hat
  if (p.helmet) {
    const hg = ctx.createLinearGradient(0, -92, 0, -78)
    hg.addColorStop(0, '#fde047')
    hg.addColorStop(1, '#ca8a04')
    ctx.fillStyle = hg
    ctx.beginPath()
    ctx.arc(2, -79, 12, Math.PI, 0)
    ctx.fill()
    ctx.fillRect(-12, -80, 29, 3)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillRect(-2, -90, 3, 9)
  } else {
    ctx.fillStyle = '#15803d'
    ctx.beginPath()
    ctx.arc(2, -79, 11.5, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = '#166534'
    ctx.fillRect(-10, -81, 24, 4)
    ctx.fillStyle = '#fef9c3'
    ctx.beginPath()
    ctx.arc(-1, -91, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // arm + axe (front)
  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(a)
  ctx.fillStyle = '#b91c1c'
  ctx.beginPath()
  ctx.roundRect(-3, -4.5, 18, 9, 4)
  ctx.fill()
  ctx.fillStyle = '#f5c39b'
  ctx.beginPath()
  ctx.arc(17, 0, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#92400e'
  ctx.fillRect(12, -2, 36, 4)
  // head of axe
  const metal = ctx.createLinearGradient(40, -14, 40, 6)
  metal.addColorStop(0, p.fury ? '#fed7aa' : '#f1f5f9')
  metal.addColorStop(1, p.fury ? '#ea580c' : '#64748b')
  ctx.fillStyle = metal
  ctx.beginPath()
  ctx.moveTo(40, -3)
  ctx.lineTo(40, 4)
  ctx.quadraticCurveTo(50, 8, 54, 14)
  ctx.quadraticCurveTo(58, 2, 54, -14)
  ctx.quadraticCurveTo(50, -8, 40, -3)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fillRect(52, -10, 2, 20)
  ctx.restore()

  ctx.restore()
}

const THORNS: [number, number][] = [[-0.25, 0.42], [0.18, 0.55], [-0.05, 0.5], [0.3, 0.7]]

export function hardHat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const hg = ctx.createLinearGradient(0, y - r, 0, y)
  hg.addColorStop(0, '#fde047')
  hg.addColorStop(1, '#ca8a04')
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.arc(x, y, r, Math.PI, 0)
  ctx.fill()
  ctx.fillRect(x - r * 1.25, y - r * 0.1, r * 2.5, r * 0.28)
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillRect(x - r * 0.12, y - r * 0.9, r * 0.24, r * 0.75)
}

/** Thorny vine that swaps sides on every chop. dir may be fractional while it flips. */
export function drawVine(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, len: number, thick: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(dir, 1)
  const g = ctx.createLinearGradient(0, -thick, 0, thick)
  g.addColorStop(0, '#a855f7')
  g.addColorStop(1, '#581c87')
  ctx.strokeStyle = g
  ctx.lineWidth = thick * 0.9
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-2, 0)
  for (let i = 1; i <= 8; i++) ctx.lineTo((len * i) / 8, Math.sin(i * 1.3 + t * 3) * thick * 0.5)
  ctx.stroke()
  // thorns (warm red = danger)
  ctx.fillStyle = '#e11d48'
  for (let i = 1; i < 8; i++) {
    const px = (len * i) / 8
    const py = Math.sin(i * 1.3 + t * 3) * thick * 0.5
    const s = i % 2 ? -1 : 1
    ctx.beginPath()
    ctx.moveTo(px - thick * 0.35, py)
    ctx.lineTo(px, py + s * thick * 1.15)
    ctx.lineTo(px + thick * 0.35, py)
    ctx.fill()
  }
  // poisonous bulb at the tip
  ctx.fillStyle = '#be123c'
  ctx.beginPath()
  ctx.arc(len, 0, thick * 1.1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.beginPath()
  ctx.arc(len - thick * 0.3, -thick * 0.35, thick * 0.35, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Curved double arrow telling the player a vine will swap sides. */
export function swapArrow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.save()
  ctx.globalAlpha = 0.55 + Math.sin(t * 6) * 0.35
  ctx.strokeStyle = '#f0abfc'
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.arc(x, y + r, r, -Math.PI * 0.85, -Math.PI * 0.15)
  ctx.stroke()
  for (const a of [-Math.PI * 0.85, -Math.PI * 0.15]) {
    const ex = x + Math.cos(a) * r
    const ey = y + r + Math.sin(a) * r
    ctx.beginPath()
    ctx.moveTo(ex - 5, ey - 2)
    ctx.lineTo(ex, ey + 5)
    ctx.lineTo(ex + 5, ey - 2)
    ctx.stroke()
  }
  ctx.restore()
}

/** Falling pinecone (hazard). */
export function drawCone(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  const g = ctx.createLinearGradient(-r, 0, r, 0)
  g.addColorStop(0, '#451a03')
  g.addColorStop(0.45, '#b45309')
  g.addColorStop(1, '#451a03')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, 0, r * 0.72, r, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#2a1206'
  ctx.lineWidth = Math.max(1, r * 0.12)
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo(-r * 0.62, i * r * 0.35 - r * 0.2)
    ctx.quadraticCurveTo(0, i * r * 0.35 + r * 0.15, r * 0.62, i * r * 0.35 - r * 0.2)
    ctx.stroke()
  }
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(0, -r * 1.05, r * 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,237,213,0.5)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.3, -r * 0.35, r * 0.14, r * 0.35, 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Angry face of the Elder Treant carved into the trunk. `roar` 0..1 opens the mouth. */
export function drawTreantFace(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number, roar: number, hurt: number) {
  const s = w / 90
  ctx.save()
  ctx.translate(x + (hurt > 0 ? Math.sin(t * 80) * 2 : 0), y)
  ctx.fillStyle = '#1c120b'
  ctx.beginPath()
  ctx.moveTo(-40 * s, -26 * s)
  ctx.quadraticCurveTo(-20 * s, -8 * s, -4 * s, -12 * s)
  ctx.lineTo(4 * s, -12 * s)
  ctx.quadraticCurveTo(20 * s, -8 * s, 40 * s, -26 * s)
  ctx.lineTo(40 * s, -18 * s)
  ctx.quadraticCurveTo(20 * s, 0, 0, -4 * s)
  ctx.quadraticCurveTo(-20 * s, 0, -40 * s, -18 * s)
  ctx.closePath()
  ctx.fill()
  const glowA = 0.6 + Math.sin(t * 5) * 0.25
  for (const ex of [-20, 20]) {
    ctx.fillStyle = '#0c0805'
    ctx.beginPath()
    ctx.ellipse(ex * s, 4 * s, 11 * s, 8 * s, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = hurt > 0 ? '#fca5a5' : `rgba(250,204,21,${glowA})`
    ctx.beginPath()
    ctx.arc(ex * s, 5 * s, 6 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fef9c3'
    ctx.beginPath()
    ctx.arc(ex * s, 5 * s, 2.6 * s, 0, Math.PI * 2)
    ctx.fill()
  }
  const open = 6 + roar * 22
  ctx.fillStyle = '#0c0805'
  ctx.beginPath()
  ctx.moveTo(-24 * s, 30 * s)
  ctx.quadraticCurveTo(0, (22 - roar * 4) * s, 24 * s, 30 * s)
  ctx.quadraticCurveTo(0, (30 + open) * s, -24 * s, 30 * s)
  ctx.fill()
  ctx.fillStyle = '#fef3c7'
  for (const tx of [-14, -4, 6, 16]) {
    ctx.beginPath()
    ctx.moveTo((tx - 3) * s, 27 * s)
    ctx.lineTo(tx * s, (33 + roar * 4) * s)
    ctx.lineTo((tx + 3) * s, 27 * s)
    ctx.fill()
  }
  if (roar > 0.2) {
    ctx.fillStyle = `rgba(239,68,68,${roar * 0.5})`
    ctx.beginPath()
    ctx.ellipse(0, (32 + open * 0.4) * s, 12 * s, open * 0.3 * s, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
