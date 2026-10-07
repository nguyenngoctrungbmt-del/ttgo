import { softGlow } from './themes'

/** Side-view cruise missile, nose along +x before rotation. */
export function drawCruise(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  // Exhaust flame
  const fl = 8 + Math.sin(t * 50) * 3
  const fg = ctx.createLinearGradient(-14 - fl, 0, -12, 0)
  fg.addColorStop(0, 'rgba(251,146,60,0)')
  fg.addColorStop(1, '#fde68a')
  ctx.fillStyle = fg
  ctx.beginPath()
  ctx.moveTo(-12, -3)
  ctx.lineTo(-14 - fl, 0)
  ctx.lineTo(-12, 3)
  ctx.closePath()
  ctx.fill()
  // Tail fins
  ctx.fillStyle = '#7f1d1d'
  ctx.beginPath()
  ctx.moveTo(-12, -2)
  ctx.lineTo(-16, -8)
  ctx.lineTo(-9, -2)
  ctx.moveTo(-12, 2)
  ctx.lineTo(-16, 8)
  ctx.lineTo(-9, 2)
  ctx.fill()
  // Body
  const g = ctx.createLinearGradient(0, -4, 0, 4)
  g.addColorStop(0, '#f1f5f9')
  g.addColorStop(0.5, '#94a3b8')
  g.addColorStop(1, '#475569')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(14, 0)
  ctx.quadraticCurveTo(10, -4, 4, -4)
  ctx.lineTo(-12, -3.5)
  ctx.lineTo(-12, 3.5)
  ctx.lineTo(4, 4)
  ctx.quadraticCurveTo(10, 4, 14, 0)
  ctx.fill()
  // Red nose + mid wing
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.moveTo(14, 0)
  ctx.quadraticCurveTo(12, -3, 9, -3.6)
  ctx.lineTo(9, 3.6)
  ctx.quadraticCurveTo(12, 3, 14, 0)
  ctx.fill()
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.moveTo(2, 1)
  ctx.lineTo(-5, 9)
  ctx.lineTo(-2, 9)
  ctx.lineTo(5, 1)
  ctx.fill()
  ctx.restore()
}

/** Edge warning: flashing chevron where a cruise missile will enter. */
export function drawEdgeWarning(ctx: CanvasRenderingContext2D, W: number, y: number, fromLeft: boolean, t: number) {
  if (Math.floor(t * 8) % 2) return
  const x = fromLeft ? 14 : W - 14
  const d = fromLeft ? 1 : -1
  ctx.fillStyle = 'rgba(239,68,68,0.25)'
  ctx.beginPath()
  ctx.arc(x, y, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fca5a5'
  ctx.strokeStyle = '#7f1d1d'
  ctx.lineWidth = 1.5
  for (const k of [0, 8]) {
    ctx.beginPath()
    ctx.moveTo(x - d * 6 + d * k, y - 8)
    ctx.lineTo(x + d * 2 + d * k, y)
    ctx.lineTo(x - d * 6 + d * k, y + 8)
    ctx.lineTo(x - d * 9 + d * k, y + 8)
    ctx.lineTo(x - d * 1 + d * k, y)
    ctx.lineTo(x - d * 9 + d * k, y - 8)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

/** Armoured warhead: steel casing with bolted plates and a red sensor eye. */
export function drawArmored(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, cracked: boolean, t: number) {
  softGlow(ctx, x, y, 16, cracked ? '251,146,60' : '239,68,68', 0.5)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  const g = ctx.createLinearGradient(0, -6, 0, 6)
  g.addColorStop(0, cracked ? '#fdba74' : '#cbd5e1')
  g.addColorStop(0.5, cracked ? '#9a3412' : '#64748b')
  g.addColorStop(1, '#1e293b')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(10, 0)
  ctx.quadraticCurveTo(8, -6, 2, -6)
  ctx.lineTo(-8, -5)
  ctx.lineTo(-8, 5)
  ctx.lineTo(2, 6)
  ctx.quadraticCurveTo(8, 6, 10, 0)
  ctx.fill()
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 1.2
  ctx.stroke()
  if (cracked) {
    ctx.strokeStyle = '#fde68a'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(-5, -4)
    ctx.lineTo(-1, 0)
    ctx.lineTo(-4, 3)
    ctx.moveTo(-1, 0)
    ctx.lineTo(3, -2)
    ctx.stroke()
  } else {
    ctx.strokeStyle = '#334155'
    ctx.beginPath()
    ctx.moveTo(-3, -5.5)
    ctx.lineTo(-3, 5.5)
    ctx.moveTo(2, -6)
    ctx.lineTo(2, 6)
    ctx.stroke()
    ctx.fillStyle = '#e2e8f0'
    for (const py of [-3.5, 3.5]) {
      ctx.beginPath()
      ctx.arc(-5.5, py, 0.9, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.fillStyle = Math.floor(t * 6) % 2 ? '#fecaca' : '#ef4444'
  ctx.beginPath()
  ctx.arc(6, 0, 1.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Pulsing red reticle on the ground where an armoured warhead will hit. */
export function drawReticle(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const r = 12 + Math.sin(t * 6) * 2
  ctx.strokeStyle = 'rgba(248,113,113,0.85)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - r - 4, y)
  ctx.lineTo(x - r + 3, y)
  ctx.moveTo(x + r + 4, y)
  ctx.lineTo(x + r - 3, y)
  ctx.stroke()
}

/** Golden satellite pickup: hexagonal core, solar wings, blinking beacon. */
export function drawSatellite(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  softGlow(ctx, x, y, 34, '253,224,71', 0.45)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.sin(t * 1.5) * 0.2)
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#1d4ed8'
    ctx.fillRect(s > 0 ? 9 : -25, -5, 16, 10)
    ctx.strokeStyle = '#93c5fd'
    ctx.lineWidth = 1
    ctx.strokeRect(s > 0 ? 9 : -25, -5, 16, 10)
    ctx.beginPath()
    for (const k of [4, 8, 12]) {
      ctx.moveTo((s > 0 ? 9 : -25) + k, -5)
      ctx.lineTo((s > 0 ? 9 : -25) + k, 5)
    }
    ctx.stroke()
    ctx.strokeStyle = '#cbd5e1'
    ctx.beginPath()
    ctx.moveTo(s * 6, 0)
    ctx.lineTo(s * 9, 0)
    ctx.stroke()
  }
  const g = ctx.createLinearGradient(0, -8, 0, 8)
  g.addColorStop(0, '#fef9c3')
  g.addColorStop(1, '#ca8a04')
  ctx.fillStyle = g
  ctx.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    if (k === 0) ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8)
    else ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#713f12'
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.strokeStyle = '#e2e8f0'
  ctx.beginPath()
  ctx.moveTo(0, -8)
  ctx.lineTo(0, -15)
  ctx.stroke()
  ctx.fillStyle = Math.floor(t * 4) % 2 ? '#fde047' : '#f97316'
  ctx.beginPath()
  ctx.arc(0, -16, 2.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Dreadnought: long angular warship with a belly laser that brightens while charging. */
export function drawDread(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, o: { flash: boolean; charge: number; hp: number; maxHp: number; t: number }) {
  softGlow(ctx, x, y + 14, 90, o.charge > 0 ? '239,68,68' : '139,92,246', 0.22 + o.charge * 0.3)
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(dir * 1.2, 1.2)
  // Rear thrusters
  for (const ty of [-5, 5]) {
    const fl = 10 + Math.sin(o.t * 40 + ty) * 4
    const fg = ctx.createLinearGradient(-58 - fl, 0, -54, 0)
    fg.addColorStop(0, 'rgba(129,140,248,0)')
    fg.addColorStop(1, '#c7d2fe')
    ctx.fillStyle = fg
    ctx.beginPath()
    ctx.moveTo(-54, ty - 3)
    ctx.lineTo(-58 - fl, ty)
    ctx.lineTo(-54, ty + 3)
    ctx.closePath()
    ctx.fill()
  }
  // Hull
  const g = ctx.createLinearGradient(0, -16, 0, 14)
  g.addColorStop(0, o.flash ? '#ffffff' : '#94a3b8')
  g.addColorStop(0.45, o.flash ? '#fecaca' : '#475569')
  g.addColorStop(1, '#0f172a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(62, 2)
  ctx.lineTo(40, -8)
  ctx.lineTo(18, -10)
  ctx.lineTo(8, -20)
  ctx.lineTo(-18, -20)
  ctx.lineTo(-28, -10)
  ctx.lineTo(-54, -9)
  ctx.lineTo(-56, 8)
  ctx.lineTo(-30, 12)
  ctx.lineTo(30, 12)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#020617'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Panel lines + bridge windows
  ctx.strokeStyle = 'rgba(15,23,42,0.6)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (const px of [-36, -12, 12, 34]) {
    ctx.moveTo(px, -9)
    ctx.lineTo(px + 3, 11)
  }
  ctx.stroke()
  ctx.fillStyle = '#a5f3fc'
  for (let i = 0; i < 4; i++) ctx.fillRect(-12 + i * 6, -16, 3.5, 3)
  // Running lights
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = Math.floor(o.t * 5 + i) % 3 === 0 ? '#f0abfc' : '#7c3aed'
    ctx.beginPath()
    ctx.arc(-44 + i * 16, 4, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  // Belly laser pod
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.moveTo(-8, 12)
  ctx.lineTo(8, 12)
  ctx.lineTo(5, 20)
  ctx.lineTo(-5, 20)
  ctx.closePath()
  ctx.fill()
  const c = o.charge
  ctx.fillStyle = c > 0 ? (Math.floor(o.t * (8 + c * 20)) % 2 ? '#fecaca' : '#ef4444') : '#7f1d1d'
  ctx.beginPath()
  ctx.arc(0, 20, 3 + c * 3, 0, Math.PI * 2)
  ctx.fill()
  if (c > 0) softGlow(ctx, 0, 20, 10 + c * 18, '248,113,113', 0.4 + c * 0.5)
  ctx.restore()
  // HP pips (unflipped)
  for (let i = 0; i < o.maxHp; i++) {
    ctx.fillStyle = i < o.hp ? '#f43f5e' : 'rgba(255,255,255,0.25)'
    ctx.fillRect(x - o.maxHp * 4.5 + i * 9, y - 36, 7, 3)
  }
}

/** Targeting beam while charging (thin, flickering) or firing (thick). */
export function drawLaser(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number, charge: number, firing: number, t: number) {
  if (firing > 0) {
    const k = Math.min(1, firing * 4)
    for (const [col, lw] of [['rgba(239,68,68,0.35)', 18], ['rgba(254,202,202,0.9)', 7], ['#ffffff', 2.5]] as const) {
      ctx.globalAlpha = k
      ctx.strokeStyle = col
      ctx.lineWidth = lw
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(tx, ty)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    return
  }
  ctx.globalAlpha = 0.35 + charge * 0.5 * (0.6 + 0.4 * Math.sin(t * 30))
  ctx.strokeStyle = '#f87171'
  ctx.lineWidth = 1 + charge * 1.5
  ctx.setLineDash([6, 5])
  ctx.lineDashOffset = -t * 80
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(tx, ty)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1
  drawReticle(ctx, tx, ty, t * 2)
}
