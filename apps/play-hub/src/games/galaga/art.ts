/** Vector sprites for Star Squadron. Aliens are drawn facing +y (toward the player). */

export type Kind = 'bee' | 'butterfly' | 'boss' | 'wasp' | 'drone'
export type PowerKind = 'rapid' | 'spread' | 'shield'

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2)
  ctx.fill()
}

function eyes(ctx: CanvasRenderingContext2D, y: number, gap: number, r: number, white: string, pupil: string, angry = false) {
  for (const sd of [-1, 1]) {
    ctx.fillStyle = white
    ell(ctx, sd * gap, y, r, r * 1.1)
    ctx.fillStyle = pupil
    ell(ctx, sd * gap, y + r * 0.35, r * 0.55, r * 0.6)
    if (angry) {
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(sd * (gap + r), y - r * 0.4)
      ctx.lineTo(sd * (gap - r * 0.9), y + r * 0.5)
      ctx.stroke()
    }
  }
}

export function drawAlien(
  ctx: CanvasRenderingContext2D,
  kind: Kind,
  x: number,
  y: number,
  rot: number,
  flapPhase: number,
  hurt: boolean,
  flash: boolean,
) {
  const flap = 0.55 + 0.45 * Math.abs(Math.sin(flapPhase))
  const c = (col: string) => (flash ? '#ffffff' : col)
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate(rot)
  ctx.scale(1.15, 1.15)
  // Soft shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ell(ctx, 2, 4, 10, 8)
  if (kind === 'bee') {
    ctx.fillStyle = c('rgba(147,197,253,0.9)')
    for (const sd of [-1, 1]) {
      ell(ctx, sd * 8, -3, 8 * flap, 4.5, sd * 0.45)
      ell(ctx, sd * 6, -7, 5 * flap, 3, sd * 0.9)
    }
    ctx.fillStyle = c('#facc15')
    ell(ctx, 0, -1, 6.5, 9)
    ctx.fillStyle = c('#dc2626')
    ell(ctx, 0, -3, 6.2, 1.6)
    ell(ctx, 0, -7, 4.6, 1.4)
    ctx.fillStyle = c('#2563eb')
    ell(ctx, 0, 7, 5.2, 4.6)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ell(ctx, -2.2, -1, 1.6, 3.4)
    eyes(ctx, 8, 2.3, 1.7, c('#ffffff'), '#111827')
    ctx.strokeStyle = c('#2563eb')
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.moveTo(-2, 10.5)
    ctx.lineTo(-5, 14)
    ctx.moveTo(2, 10.5)
    ctx.lineTo(5, 14)
    ctx.stroke()
  } else if (kind === 'butterfly') {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = c('#2563eb')
      ell(ctx, sd * 9, 0, 9 * flap, 7.5, sd * 0.25)
      ctx.fillStyle = c('#e0f2fe')
      ell(ctx, sd * 9.5, 0, 6 * flap, 4.8, sd * 0.25)
      ctx.fillStyle = c('#ef4444')
      ell(ctx, sd * 10, 1, 2.4 * flap, 2.4)
    }
    ctx.fillStyle = c('#dc2626')
    ell(ctx, 0, -1, 4.5, 9)
    ctx.fillStyle = c('#fef2f2')
    ell(ctx, 0, 7, 4.8, 4.2)
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ell(ctx, -1.5, -2, 1.2, 3.5)
    eyes(ctx, 7.5, 2.1, 1.6, c('#fde047'), '#7f1d1d')
    ctx.strokeStyle = c('#fecaca')
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(-1.5, 10)
    ctx.quadraticCurveTo(-4, 13, -6, 12)
    ctx.moveTo(1.5, 10)
    ctx.quadraticCurveTo(4, 13, 6, 12)
    ctx.stroke()
  } else if (kind === 'boss') {
    const body = hurt ? '#a855f7' : '#16a34a'
    const belly = hurt ? '#d8b4fe' : '#4ade80'
    const wing = hurt ? '#f472b6' : '#0ea5e9'
    for (const sd of [-1, 1]) {
      ctx.fillStyle = c(wing)
      ctx.beginPath()
      ctx.moveTo(sd * 6, -4)
      ctx.lineTo(sd * (8 + 10 * flap), -10)
      ctx.lineTo(sd * (10 + 8 * flap), 4)
      ctx.lineTo(sd * 6, 4)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = c('#fde047')
      ell(ctx, sd * (9 + 6 * flap), -3, 1.8, 1.8)
    }
    // Crest
    ctx.fillStyle = c('#facc15')
    ctx.beginPath()
    ctx.moveTo(-6, -8)
    ctx.lineTo(-4, -15)
    ctx.lineTo(-1.5, -9)
    ctx.lineTo(0, -16)
    ctx.lineTo(1.5, -9)
    ctx.lineTo(4, -15)
    ctx.lineTo(6, -8)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = c(body)
    ell(ctx, 0, 0, 9.5, 10.5)
    ctx.fillStyle = c(belly)
    ell(ctx, 0, 3, 6, 6)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ell(ctx, -3.5, -4, 2, 3.5)
    eyes(ctx, 4, 3.4, 2.4, c('#fef2f2'), '#b91c1c', true)
    // Mandibles
    ctx.strokeStyle = c(body)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-4, 9)
    ctx.quadraticCurveTo(-6, 14, -2, 15)
    ctx.moveTo(4, 9)
    ctx.quadraticCurveTo(6, 14, 2, 15)
    ctx.stroke()
  } else if (kind === 'wasp') {
    ctx.fillStyle = c('rgba(254,243,199,0.85)')
    for (const sd of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(sd * 3, -2)
      ctx.lineTo(sd * (6 + 9 * flap), -9)
      ctx.lineTo(sd * (5 + 6 * flap), 2)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = c('#7c2d12')
    ctx.beginPath()
    ctx.moveTo(-2, -10)
    ctx.lineTo(0, -16)
    ctx.lineTo(2, -10)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = c('#f97316')
    ell(ctx, 0, -3, 5, 8)
    ctx.fillStyle = c('#431407')
    ell(ctx, 0, -4, 4.8, 1.3)
    ell(ctx, 0, -8, 3.6, 1.2)
    ctx.fillStyle = c('#fb923c')
    ell(ctx, 0, 6, 4.4, 4)
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ell(ctx, -1.6, -3, 1.2, 3)
    eyes(ctx, 7, 2, 1.7, c('#fecaca'), '#7f1d1d', true)
  } else {
    // Armoured drone
    ctx.fillStyle = c('#475569')
    for (const sd of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(sd * 6, -5)
      ctx.lineTo(sd * (10 + 4 * flap), -8)
      ctx.lineTo(sd * (12 + 4 * flap), 3)
      ctx.lineTo(sd * 6, 5)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = c(hurt ? '#cbd5e1' : '#94a3b8')
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6
      const px = Math.cos(a) * 9.5
      const py = Math.sin(a) * 10
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = c('#334155')
    ctx.fillRect(-6.5, 2.5, 13, 4)
    ctx.fillStyle = c('#22d3ee')
    ctx.fillRect(-5.5, 3.3, 11, 2.4)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ell(ctx, -3, -4, 2.2, 2.6)
    if (hurt) {
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(-2, -8)
      ctx.lineTo(0, -3)
      ctx.lineTo(-3, 0)
      ctx.moveTo(4, -6)
      ctx.lineTo(2, -2)
      ctx.stroke()
    }
  }
  ctx.restore()
}

/** Player fighter (nose at -y). `red` = captured tint. */
export function drawFighter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  red: boolean,
  t: number,
  rot = 0,
  tilt = 0,
  flame = true,
) {
  ctx.save()
  ctx.translate(x, y)
  if (rot) ctx.rotate(rot)
  ctx.scale(s * (1 - Math.abs(tilt) * 0.35), s)
  if (flame) {
    const f = 6 + Math.sin(t * 40) * 2
    ctx.fillStyle = 'rgba(56,189,248,0.55)'
    ell(ctx, 0, 16 + f * 0.5, 3.6, f)
    ctx.fillStyle = '#fef9c3'
    ell(ctx, 0, 15 + f * 0.25, 1.8, f * 0.5)
  }
  const hull = red ? '#fecaca' : '#f1f5f9'
  const trim = red ? '#b91c1c' : '#dc2626'
  ctx.fillStyle = hull
  ctx.beginPath()
  ctx.moveTo(0, -17)
  ctx.lineTo(4, -7)
  ctx.lineTo(4.5, 1)
  ctx.lineTo(14, 7)
  ctx.lineTo(14, 14)
  ctx.lineTo(4.5, 11)
  ctx.lineTo(3, 15)
  ctx.lineTo(-3, 15)
  ctx.lineTo(-4.5, 11)
  ctx.lineTo(-14, 14)
  ctx.lineTo(-14, 7)
  ctx.lineTo(-4.5, 1)
  ctx.lineTo(-4, -7)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = red ? '#fca5a5' : '#cbd5e1'
  ctx.beginPath()
  ctx.moveTo(0, -1)
  ctx.lineTo(13, 8.5)
  ctx.lineTo(13, 13)
  ctx.lineTo(4, 10)
  ctx.lineTo(-4, 10)
  ctx.lineTo(-13, 13)
  ctx.lineTo(-13, 8.5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = trim
  ctx.fillRect(-14, 4, 2.5, 10)
  ctx.fillRect(11.5, 4, 2.5, 10)
  ctx.fillRect(-1.2, 3, 2.4, 9)
  ctx.fillStyle = red ? '#7f1d1d' : '#1d4ed8'
  ell(ctx, 0, -6, 2.3, 4.2)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ell(ctx, -0.7, -7.5, 0.8, 1.6)
  ctx.restore()
}

export function drawCapsule(ctx: CanvasRenderingContext2D, x: number, y: number, kind: PowerKind, t: number) {
  const col = kind === 'rapid' ? '#facc15' : kind === 'spread' ? '#22d3ee' : '#4ade80'
  const pulse = 1 + Math.sin(t * 8) * 0.08
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(pulse, pulse)
  ctx.globalAlpha = 0.3
  ctx.fillStyle = col
  ell(ctx, 0, 0, 16, 16)
  ctx.globalAlpha = 1
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.roundRect(-11, -8, 22, 16, 8)
  ctx.fill()
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.roundRect(-9.5, -6.5, 19, 13, 6.5)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillRect(-6, -5, 12, 2)
  ctx.strokeStyle = '#0f172a'
  ctx.fillStyle = '#0f172a'
  ctx.lineWidth = 1.8
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (kind === 'rapid') {
    ctx.moveTo(-4, 2)
    ctx.lineTo(-1, -1.5)
    ctx.lineTo(2, 2)
    ctx.moveTo(-1, 4)
    ctx.lineTo(2, 0.5)
    ctx.lineTo(5, 4)
  } else if (kind === 'spread') {
    ctx.moveTo(0, 4)
    ctx.lineTo(0, -3)
    ctx.moveTo(0, 4)
    ctx.lineTo(-4, -2)
    ctx.moveTo(0, 4)
    ctx.lineTo(4, -2)
  } else {
    ctx.arc(0, 0.5, 3.5, 0, Math.PI * 2)
  }
  ctx.stroke()
  ctx.restore()
}

/** Mothership boss: armoured saucer with a glowing core, side pods and a hanging cannon. */
export function drawMothership(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, hull: string, glowCol: string, t: number, flash: boolean, hurt: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  // Soft aura
  const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 80)
  aura.addColorStop(0, `${glowCol}55`)
  aura.addColorStop(1, `${glowCol}00`)
  ctx.fillStyle = aura
  ell(ctx, 0, 0, 80, 60)
  // Side pods with pulsing lights
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#1f2937'
    ell(ctx, sd * 44, 6, 13, 10)
    ctx.fillStyle = hull
    ell(ctx, sd * 44, 4, 11, 8)
    ctx.fillStyle = glowCol
    ctx.globalAlpha = 0.6 + Math.sin(t * 6 + sd) * 0.4
    ell(ctx, sd * 44, 6, 4, 3)
    ctx.globalAlpha = 1
  }
  // Main saucer
  const g = ctx.createLinearGradient(0, -24, 0, 22)
  g.addColorStop(0, '#f8fafc')
  g.addColorStop(0.25, hull)
  g.addColorStop(1, '#0f172a')
  ctx.fillStyle = g
  ell(ctx, 0, 4, 46, 17)
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ell(ctx, 0, 12, 40, 7)
  // Rim lights chase around the hull
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI + Math.PI * 0.05
    const lx = Math.cos(a) * 40
    const ly = 6 + Math.sin(a) * 9
    ctx.fillStyle = Math.floor(t * 8 + i) % 3 === 0 ? '#ffffff' : glowCol
    ell(ctx, lx, ly, 2.4, 2.4)
  }
  // Dome with an angry eye
  const dome = ctx.createRadialGradient(-6, -16, 2, 0, -8, 22)
  dome.addColorStop(0, '#ffffff')
  dome.addColorStop(0.4, glowCol)
  dome.addColorStop(1, hull)
  ctx.fillStyle = dome
  ctx.beginPath()
  ctx.ellipse(0, -4, 22, 18, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ell(ctx, 0, -9, 9, 6 - Math.max(0, Math.sin(t * 1.3)) * 4)
  ctx.fillStyle = hurt > 0.6 ? '#ef4444' : '#fde047'
  ell(ctx, Math.sin(t * 1.7) * 3, -9, 3.6, 3.6)
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-13, -17)
  ctx.lineTo(-3, -13)
  ctx.moveTo(13, -17)
  ctx.lineTo(3, -13)
  ctx.stroke()
  // Cannon
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.roundRect(-6, 16, 12, 12, 3)
  ctx.fill()
  ctx.fillStyle = glowCol
  ell(ctx, 0, 28, 4, 2.5)
  // Battle damage
  if (hurt > 0.35) {
    ctx.strokeStyle = 'rgba(15,23,42,0.8)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(-30, 2)
    ctx.lineTo(-22, 8)
    ctx.lineTo(-25, 13)
    ctx.moveTo(24, 0)
    ctx.lineTo(18, 9)
    ctx.stroke()
  }
  if (flash) {
    ctx.globalAlpha = 0.55
    ctx.fillStyle = '#ffffff'
    ell(ctx, 0, 2, 47, 20)
    ctx.globalAlpha = 1
  }
  ctx.restore()
}
