/** Vector art for Sky Archer. */

export const BALLOON_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7']
const BALLOON_DARK = ['#991b1b', '#1e3a8a', '#14532d', '#a16207', '#581c87']

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2)
  ctx.fill()
}

export function drawBalloon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: number, t: number, golden = false) {
  const col = golden ? '#facc15' : BALLOON_COLORS[color]
  const dark = golden ? '#a16207' : BALLOON_DARK[color]
  // String
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x, y + r * 1.15)
  ctx.quadraticCurveTo(x + Math.sin(t * 3) * 5, y + r * 1.8, x + Math.sin(t * 3 + 1) * 3, y + r * 2.6)
  ctx.stroke()
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.2)
  g.addColorStop(0, golden ? '#fef9c3' : '#ffffff')
  g.addColorStop(0.25, col)
  g.addColorStop(1, dark)
  ctx.fillStyle = g
  ell(ctx, x, y, r * 0.9, r * 1.1)
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.moveTo(x - 3, y + r * 1.15)
  ctx.lineTo(x + 3, y + r * 1.15)
  ctx.lineTo(x, y + r * 1.02)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ell(ctx, x - r * 0.35, y - r * 0.45, r * 0.14, r * 0.26, -0.5)
}

export function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, t: number, falling: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(dir, 1)
  if (falling > 0) ctx.rotate(falling * 6)
  const flap = falling > 0 ? 0.2 : Math.sin(t * 14)
  // Back wing
  ctx.fillStyle = '#1e40af'
  ctx.beginPath()
  ctx.moveTo(-2, -2)
  ctx.quadraticCurveTo(-6, -14 * flap - 4, -14, -12 * flap - 2)
  ctx.lineTo(4, -1)
  ctx.closePath()
  ctx.fill()
  // Body
  ctx.fillStyle = '#3b82f6'
  ell(ctx, 0, 0, 11, 6.5)
  ctx.fillStyle = '#dbeafe'
  ell(ctx, 2, 2.5, 7, 3.4)
  // Tail
  ctx.fillStyle = '#1e40af'
  ctx.beginPath()
  ctx.moveTo(-9, -1)
  ctx.lineTo(-17, -5)
  ctx.lineTo(-16, 3)
  ctx.closePath()
  ctx.fill()
  // Head
  ctx.fillStyle = '#3b82f6'
  ell(ctx, 9, -3, 5, 4.6)
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(13, -4)
  ctx.lineTo(18, -2.5)
  ctx.lineTo(13, -1)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#fff'
  ell(ctx, 10.5, -4.2, 1.8, 1.8)
  ctx.fillStyle = '#111827'
  if (falling > 0) {
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 0.9
    ctx.beginPath()
    ctx.moveTo(9.6, -5.2)
    ctx.lineTo(11.6, -3.2)
    ctx.moveTo(11.6, -5.2)
    ctx.lineTo(9.6, -3.2)
    ctx.stroke()
  } else ell(ctx, 11, -4.2, 0.9, 0.9)
  // Front wing
  ctx.fillStyle = '#60a5fa'
  ctx.beginPath()
  ctx.moveTo(-3, -1)
  ctx.quadraticCurveTo(-4, -16 * flap - 3, -12, -15 * flap)
  ctx.lineTo(5, 0)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** Face-on archery target. `wob` adds a squash wobble after impact. */
export function drawTarget(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, wob: number, gold = false) {
  ctx.save()
  ctx.translate(x, y)
  const sq = 1 + Math.sin(wob * 30) * wob * 0.12
  ctx.scale(sq, 2 - sq)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ell(ctx, 3, 3, r + 2, r + 2)
  const rings = gold ? ['#a16207', '#facc15', '#fde68a', '#facc15', '#fff7ed'] : ['#f8fafc', '#1f2937', '#2563eb', '#dc2626', '#facc15']
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = rings[i]
    ell(ctx, 0, 0, r * (1 - i * 0.2), r * (1 - i * 0.2))
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ell(ctx, -r * 0.35, -r * 0.4, r * 0.25, r * 0.12, -0.6)
  ctx.restore()
}

export function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, fletch = '#f43f5e', len = 34) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(-len + 4, 0)
  ctx.lineTo(-2, 0)
  ctx.stroke()
  ctx.fillStyle = '#cbd5e1'
  ctx.beginPath()
  ctx.moveTo(4, 0)
  ctx.lineTo(-4, -3.2)
  ctx.lineTo(-2.5, 0)
  ctx.lineTo(-4, 3.2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = fletch
  ctx.beginPath()
  ctx.moveTo(-len + 10, 0)
  ctx.lineTo(-len + 2, -4.5)
  ctx.lineTo(-len + 4, 0)
  ctx.lineTo(-len + 2, 4.5)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** The archer, feet at (x, y). `aim` radians, `pull` 0..1. */
export function drawArcher(ctx: CanvasRenderingContext2D, x: number, y: number, aim: number, pull: number, t: number, nocked: boolean) {
  const breathe = Math.sin(t * 2) * 0.8
  ctx.save()
  ctx.translate(x, y)
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'
  ell(ctx, 0, 1, 18, 4)
  // Legs
  ctx.strokeStyle = '#3f2a14'
  ctx.lineCap = 'round'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-3, -20)
  ctx.lineTo(-8, 0)
  ctx.moveTo(3, -20)
  ctx.lineTo(7, 0)
  ctx.stroke()
  ctx.fillStyle = '#1c1917'
  ell(ctx, -9, -1, 4.5, 2.2)
  ell(ctx, 8, -1, 4.5, 2.2)
  // Quiver on back
  ctx.save()
  ctx.translate(-9, -38 + breathe)
  ctx.rotate(-0.35)
  ctx.fillStyle = '#7c2d12'
  ctx.fillRect(-4, -12, 8, 22)
  ctx.fillStyle = '#f43f5e'
  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(-3 + i * 3, -12)
    ctx.lineTo(-4 + i * 3, -19)
    ctx.lineTo(-1 + i * 3, -12)
    ctx.fill()
  }
  ctx.restore()
  // Torso (tunic)
  ctx.fillStyle = '#15803d'
  ctx.beginPath()
  ctx.moveTo(-9, -44 + breathe)
  ctx.lineTo(9, -44 + breathe)
  ctx.lineTo(11, -18)
  ctx.lineTo(-11, -18)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#854d0e'
  ctx.fillRect(-11, -24, 22, 4)
  ctx.fillStyle = '#facc15'
  ctx.fillRect(-2, -24, 4, 4)
  // Head
  const hy = -53 + breathe
  ctx.fillStyle = '#f2c79b'
  ell(ctx, 0, hy, 8, 8.5)
  ctx.fillStyle = '#166534'
  ctx.beginPath()
  ctx.moveTo(-9, hy - 2)
  ctx.quadraticCurveTo(0, hy - 18, 12, hy - 5)
  ctx.lineTo(-9, hy - 2)
  ctx.fill()
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-6, hy - 8)
  ctx.quadraticCurveTo(-14, hy - 16, -18, hy - 12)
  ctx.stroke()
  ctx.fillStyle = '#111827'
  ell(ctx, 4, hy - 0.5, 1.4, 1.8)
  ctx.strokeStyle = '#7c2d12'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(2, hy + 4)
  ctx.quadraticCurveTo(4, hy + 5.5, 6, hy + 4)
  ctx.stroke()
  // Bow arm + bow
  const sx = 4
  const sy = -40 + breathe
  ctx.save()
  ctx.translate(sx, sy)
  ctx.rotate(aim)
  ctx.strokeStyle = '#f2c79b'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(16, 0)
  ctx.stroke()
  // Bow limb
  const bend = 1 + pull * 0.35
  ctx.strokeStyle = '#92400e'
  ctx.lineWidth = 3.4
  ctx.beginPath()
  ctx.moveTo(14 - 6 * bend, -24)
  ctx.quadraticCurveTo(26 + 4 * bend, 0, 14 - 6 * bend, 24)
  ctx.stroke()
  ctx.strokeStyle = '#facc15'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(18, -4)
  ctx.lineTo(19, 4)
  ctx.stroke()
  // String
  const sxp = 14 - 6 * bend - pull * 20
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(14 - 6 * bend, -24)
  ctx.lineTo(sxp, 0)
  ctx.lineTo(14 - 6 * bend, 24)
  ctx.stroke()
  if (nocked) drawArrow(ctx, sxp + 34, 0, 0)
  // Draw hand
  ctx.strokeStyle = '#f2c79b'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(0, 2)
  ctx.lineTo(sxp, 0)
  ctx.stroke()
  ctx.restore()
  ctx.restore()
}

/** Friend with an apple on their head, standing on a crate. */
export function drawFriend(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, apple: boolean, hurt: number, cheer: number) {
  ctx.save()
  ctx.translate(x, y)
  // Crate
  ctx.fillStyle = '#a16207'
  ctx.fillRect(-15, -16, 30, 16)
  ctx.strokeStyle = '#713f12'
  ctx.lineWidth = 2
  ctx.strokeRect(-15, -16, 30, 16)
  ctx.beginPath()
  ctx.moveTo(-15, -16)
  ctx.lineTo(15, 0)
  ctx.stroke()
  ctx.translate(0, -16)
  if (hurt > 0) ctx.rotate(Math.min(1, hurt) * 0.5)
  const shake = hurt > 0 || cheer > 0 ? 0 : Math.sin(t * 40) * 0.6
  ctx.translate(shake, 0)
  ctx.strokeStyle = '#1e3a8a'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-3, -18)
  ctx.lineTo(-4, 0)
  ctx.moveTo(3, -18)
  ctx.lineTo(4, 0)
  ctx.stroke()
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.roundRect(-9, -40, 18, 24, 5)
  ctx.fill()
  ctx.strokeStyle = '#f97316'
  ctx.lineWidth = 4
  const armUp = cheer > 0 ? -1 : 0
  ctx.beginPath()
  ctx.moveTo(-8, -36)
  ctx.lineTo(-13, armUp ? -52 : -22)
  ctx.moveTo(8, -36)
  ctx.lineTo(13, armUp ? -52 : -22)
  ctx.stroke()
  ctx.fillStyle = '#e0ac80'
  ell(ctx, 0, -48, 8, 8.5)
  ctx.fillStyle = '#422006'
  ctx.beginPath()
  ctx.arc(0, -50, 8.4, Math.PI * 1.05, Math.PI * 1.95)
  ctx.fill()
  ctx.fillStyle = '#111827'
  if (hurt > 0) {
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 1.2
    for (const ex of [-3, 3]) {
      ctx.beginPath()
      ctx.moveTo(ex - 1.5, -50)
      ctx.lineTo(ex + 1.5, -47)
      ctx.moveTo(ex + 1.5, -50)
      ctx.lineTo(ex - 1.5, -47)
      ctx.stroke()
    }
  } else {
    ell(ctx, -3, -48.5, 1.1, cheer > 0 ? 0.6 : 1.5)
    ell(ctx, 3, -48.5, 1.1, cheer > 0 ? 0.6 : 1.5)
  }
  ctx.strokeStyle = '#7c2d12'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  if (cheer > 0) ctx.arc(0, -44, 3, 0.1, Math.PI - 0.1)
  else {
    ctx.moveTo(-3, -43)
    ctx.lineTo(-1, -44)
    ctx.lineTo(1, -43)
    ctx.lineTo(3, -44)
  }
  ctx.stroke()
  if (apple) {
    ctx.fillStyle = '#dc2626'
    ell(ctx, 0, -62, 6.5, 6)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ell(ctx, -2.2, -63.5, 1.4, 1.8)
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(0, -67)
    ctx.lineTo(1, -70)
    ctx.stroke()
    ctx.fillStyle = '#16a34a'
    ell(ctx, 3, -69, 2.6, 1.3, -0.4)
  }
  ctx.restore()
}

export function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.fillStyle = 'rgba(250,204,21,0.3)'
  ell(ctx, 0, 0, r * 1.8, r * 1.8)
  ctx.fillStyle = '#facc15'
  ctx.strokeStyle = '#a16207'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2
    const rr = i % 2 ? r * 0.45 : r
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fef9c3'
  ell(ctx, -r * 0.2, -r * 0.25, r * 0.18, r * 0.18)
  ctx.restore()
}
