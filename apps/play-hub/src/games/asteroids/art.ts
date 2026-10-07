/** Vector art for Asteroids: ship, UFO, power-up capsules and comets. */

export type PowerKind = 'triple' | 'rapid' | 'shield' | 'nova'

export const POWER_COLOR: Record<PowerKind, [string, string]> = {
  triple: ['#fde047', '#b45309'],
  rapid: ['#c4b5fd', '#6d28d9'],
  shield: ['#67e8f9', '#0e7490'],
  nova: ['#f5d0fe', '#a21caf'],
}

export function drawShip(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, thrust: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  // engine flame
  if (thrust > 0.05) {
    const len = 10 + thrust * 14 + Math.sin(t * 50) * 3
    ctx.fillStyle = 'rgba(251,146,60,0.85)'
    ctx.beginPath()
    ctx.moveTo(-7, -5)
    ctx.quadraticCurveTo(-7 - len, 0, -7, 5)
    ctx.fill()
    ctx.fillStyle = '#fef3c7'
    ctx.beginPath()
    ctx.moveTo(-7, -2.5)
    ctx.quadraticCurveTo(-7 - len * 0.55, 0, -7, 2.5)
    ctx.fill()
  }
  // wings
  ctx.fillStyle = '#155e75'
  ctx.strokeStyle = '#a5f3fc'
  ctx.lineWidth = 1.6
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(2, -4)
  ctx.lineTo(-12, -13)
  ctx.lineTo(-9, -4)
  ctx.closePath()
  ctx.moveTo(2, 4)
  ctx.lineTo(-12, 13)
  ctx.lineTo(-9, 4)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // hull
  const g = ctx.createLinearGradient(0, -7, 0, 7)
  g.addColorStop(0, '#67e8f9')
  g.addColorStop(0.5, '#0e7490')
  g.addColorStop(1, '#164e63')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(17, 0)
  ctx.quadraticCurveTo(4, -8, -9, -5)
  ctx.lineTo(-7, 0)
  ctx.lineTo(-9, 5)
  ctx.quadraticCurveTo(4, 8, 17, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // cockpit
  ctx.fillStyle = '#f0f9ff'
  ctx.beginPath()
  ctx.ellipse(5, 0, 4.2, 2.4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0369a1'
  ctx.beginPath()
  ctx.ellipse(6, 0.5, 2.6, 1.4, 0, 0, Math.PI * 2)
  ctx.fill()
  // wingtip lights
  const blink = Math.sin(t * 6) > 0
  ctx.fillStyle = blink ? '#f87171' : '#7f1d1d'
  ctx.fillRect(-12.5, -14, 2.5, 2.5)
  ctx.fillStyle = blink ? '#4ade80' : '#14532d'
  ctx.fillRect(-12.5, 11.5, 2.5, 2.5)
  ctx.restore()
}

export function drawUfo(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, flash: boolean, charge: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.sin(t * 3) * 0.12)
  // tractor glow
  ctx.fillStyle = 'rgba(74,222,128,0.12)'
  ctx.beginPath()
  ctx.moveTo(-9, 6)
  ctx.lineTo(9, 6)
  ctx.lineTo(18, 30)
  ctx.lineTo(-18, 30)
  ctx.closePath()
  ctx.fill()
  // dome
  const dg = ctx.createRadialGradient(-3, -10, 1, 0, -6, 12)
  dg.addColorStop(0, '#ecfeff')
  dg.addColorStop(1, 'rgba(103,232,249,0.55)')
  ctx.fillStyle = dg
  ctx.beginPath()
  ctx.ellipse(0, -4, 10, 10, 0, Math.PI, 0)
  ctx.fill()
  // alien
  ctx.fillStyle = '#4ade80'
  ctx.beginPath()
  ctx.ellipse(0, -6, 5, 5.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#052e16'
  ctx.beginPath()
  ctx.ellipse(-2, -6.5, 1.6, 2.2, -0.4, 0, Math.PI * 2)
  ctx.ellipse(2, -6.5, 1.6, 2.2, 0.4, 0, Math.PI * 2)
  ctx.fill()
  // saucer body
  const sg = ctx.createLinearGradient(0, -6, 0, 8)
  sg.addColorStop(0, flash ? '#ffffff' : '#d1d5db')
  sg.addColorStop(0.5, flash ? '#ffffff' : '#6b7280')
  sg.addColorStop(1, flash ? '#ffffff' : '#1f2937')
  ctx.fillStyle = sg
  ctx.strokeStyle = '#e5e7eb'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.ellipse(0, 1, 22, 7.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#374151'
  ctx.beginPath()
  ctx.ellipse(0, 4.5, 12, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  // running lights
  for (let i = 0; i < 6; i++) {
    const on = Math.floor(t * 8 + i) % 3 === 0
    ctx.fillStyle = on ? '#fde047' : '#a16207'
    ctx.beginPath()
    ctx.arc(-15 + i * 6, 1.5, 1.6, 0, Math.PI * 2)
    ctx.fill()
  }
  // charging cannon telegraph
  if (charge > 0) {
    ctx.fillStyle = `rgba(244,114,182,${0.4 + charge * 0.6})`
    ctx.beginPath()
    ctx.arc(0, 8, 2 + charge * 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function iconPath(ctx: CanvasRenderingContext2D, kind: PowerKind) {
  ctx.beginPath()
  if (kind === 'triple') {
    // Three bullet shapes fanning out.
    for (const a of [-0.35, 0, 0.35]) {
      const dx = Math.sin(a)
      const dy = -Math.cos(a)
      const px = -dy
      const py = dx
      const bx = dx * 16
      const by = 7
      const len = 15
      ctx.moveTo(bx + px * 1.8, by + py * 1.8)
      ctx.lineTo(bx + dx * (len - 4) + px * 1.8, by + dy * (len - 4) + py * 1.8)
      ctx.lineTo(bx + dx * len, by + dy * len)
      ctx.lineTo(bx + dx * (len - 4) - px * 1.8, by + dy * (len - 4) - py * 1.8)
      ctx.lineTo(bx - px * 1.8, by - py * 1.8)
      ctx.closePath()
    }
  } else if (kind === 'rapid') {
    ctx.moveTo(2, -10)
    ctx.lineTo(-5, 1)
    ctx.lineTo(0, 1)
    ctx.lineTo(-2, 10)
    ctx.lineTo(5, -2)
    ctx.lineTo(0, -2)
    ctx.closePath()
  } else if (kind === 'nova') {
    // Eight-point starburst.
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 ? 3.6 : 9.5
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
  } else {
    ctx.moveTo(0, -9)
    ctx.lineTo(7, -6)
    ctx.quadraticCurveTo(7, 5, 0, 9)
    ctx.quadraticCurveTo(-7, 5, -7, -6)
    ctx.closePath()
  }
}

export function drawPower(ctx: CanvasRenderingContext2D, kind: PowerKind, x: number, y: number, t: number) {
  const [light, dark] = POWER_COLOR[kind]
  ctx.save()
  ctx.translate(x, y)
  // rotating outer ring
  ctx.strokeStyle = light
  ctx.globalAlpha = 0.7
  ctx.lineWidth = 2
  ctx.setLineDash([5, 4])
  ctx.lineDashOffset = -t * 20
  ctx.beginPath()
  ctx.arc(0, 0, 17, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1
  const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, 14)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.35, light)
  g.addColorStop(1, dark)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 1.2
  ctx.stroke()
  iconPath(ctx, kind)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = dark
  ctx.lineWidth = 1.4
  ctx.stroke()
  ctx.restore()
}

/** Blazing comet head with a tapering tail along its velocity. */
export function drawComet(ctx: CanvasRenderingContext2D, x: number, y: number, vx: number, vy: number, t: number) {
  const a = Math.atan2(vy, vx)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  const tail = ctx.createLinearGradient(-110, 0, 0, 0)
  tail.addColorStop(0, 'rgba(239,68,68,0)')
  tail.addColorStop(0.7, 'rgba(249,115,22,0.6)')
  tail.addColorStop(1, 'rgba(254,240,138,0.95)')
  ctx.fillStyle = tail
  ctx.beginPath()
  ctx.moveTo(0, -11)
  ctx.quadraticCurveTo(-60, -6 + Math.sin(t * 30) * 2, -110, 0)
  ctx.quadraticCurveTo(-60, 6 - Math.sin(t * 30) * 2, 0, 11)
  ctx.closePath()
  ctx.fill()
  const g = ctx.createRadialGradient(2, -2, 1, 0, 0, 12)
  g.addColorStop(0, '#fffbeb')
  g.addColorStop(0.4, '#fb923c')
  g.addColorStop(1, '#7f1d1d')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Spiked proximity mine. `arm` 0..1 while counting down to detonation (-1 = dormant). */
export function drawMine(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, arm: number, flash: boolean) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(t * 0.8)
  const hot = arm >= 0
  // spikes
  ctx.fillStyle = flash ? '#ffffff' : hot ? '#fca5a5' : '#94a3b8'
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 1.2
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    ctx.beginPath()
    ctx.moveTo(c * 8 - s * 3, s * 8 + c * 3)
    ctx.lineTo(c * 16, s * 16)
    ctx.lineTo(c * 8 + s * 3, s * 8 - c * 3)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  // body
  const g = ctx.createRadialGradient(-3, -3, 1, 0, 0, 11)
  g.addColorStop(0, flash ? '#ffffff' : '#cbd5e1')
  g.addColorStop(0.55, flash ? '#ffffff' : '#475569')
  g.addColorStop(1, '#0f172a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(226,232,240,0.6)'
  ctx.stroke()
  // seam
  ctx.strokeStyle = 'rgba(15,23,42,0.7)'
  ctx.beginPath()
  ctx.moveTo(-10, 0)
  ctx.lineTo(10, 0)
  ctx.stroke()
  ctx.restore()
  // core light: slow blink when dormant, frantic when armed
  const on = hot ? Math.floor(t * 18) % 2 === 0 : Math.sin(t * 4) > 0.3
  ctx.fillStyle = on ? '#ef4444' : '#7f1d1d'
  ctx.beginPath()
  ctx.arc(x, y, hot ? 4.5 : 3.4, 0, Math.PI * 2)
  ctx.fill()
  if (on) {
    ctx.fillStyle = '#fecaca'
    ctx.beginPath()
    ctx.arc(x - 1, y - 1, 1.4, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** Seeker drone: red arrowhead with a single eye. `tele` 0..1 while aiming a dash. */
export function drawDrone(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, t: number, tele: number, dashing: boolean, flash: boolean) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  if (dashing) {
    ctx.fillStyle = 'rgba(251,113,133,0.55)'
    ctx.beginPath()
    ctx.moveTo(-8, -6)
    ctx.lineTo(-34, 0)
    ctx.lineTo(-8, 6)
    ctx.closePath()
    ctx.fill()
  }
  // side fins flap gently
  const flap = Math.sin(t * 14) * 1.5
  ctx.fillStyle = flash ? '#ffffff' : '#7f1d1d'
  ctx.strokeStyle = '#fecdd3'
  ctx.lineWidth = 1.3
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(-2, -5)
  ctx.lineTo(-11, -14 - flap)
  ctx.lineTo(-6, -4)
  ctx.closePath()
  ctx.moveTo(-2, 5)
  ctx.lineTo(-11, 14 + flap)
  ctx.lineTo(-6, 4)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  const g = ctx.createLinearGradient(0, -8, 0, 8)
  g.addColorStop(0, flash ? '#ffffff' : '#fb7185')
  g.addColorStop(0.5, flash ? '#ffffff' : '#e11d48')
  g.addColorStop(1, flash ? '#ffffff' : '#881337')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(14, 0)
  ctx.lineTo(-8, -8)
  ctx.lineTo(-4, 0)
  ctx.lineTo(-8, 8)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  // eye
  ctx.fillStyle = '#1c1917'
  ctx.beginPath()
  ctx.ellipse(2, 0, 4, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  const eye = tele > 0 ? (Math.floor(t * 20) % 2 ? '#ffffff' : '#fde047') : '#fde047'
  ctx.fillStyle = eye
  ctx.beginPath()
  ctx.arc(3, 0, 1.6 + tele * 1.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Hive mothership boss: armoured disc with a pulsing core. `charge` 0..1 before a volley. */
export function drawMothership(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, charge: number, flash: boolean, hp: number) {
  ctx.save()
  ctx.translate(x, y)
  // hangar arms
  ctx.fillStyle = flash ? '#ffffff' : '#312e81'
  ctx.strokeStyle = '#a5b4fc'
  ctx.lineWidth = 1.6
  for (const sd of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(sd * 30, -10)
    ctx.lineTo(sd * 64, -4)
    ctx.lineTo(sd * 70, 8)
    ctx.lineTo(sd * 34, 14)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = Math.floor(t * 4) % 2 ? '#fde047' : '#a16207'
    ctx.fillRect(sd * 62 - 2.5, 1, 5, 5)
    ctx.fillStyle = flash ? '#ffffff' : '#312e81'
  }
  // outer hull (octagon)
  const g = ctx.createLinearGradient(0, -40, 0, 40)
  g.addColorStop(0, flash ? '#ffffff' : '#818cf8')
  g.addColorStop(0.5, flash ? '#ffffff' : '#3730a3')
  g.addColorStop(1, flash ? '#ffffff' : '#1e1b4b')
  ctx.fillStyle = g
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    const r = 42
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.82)
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.82)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#c7d2fe'
  ctx.lineWidth = 2
  ctx.stroke()
  // rotating light ring
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + t * 0.9
    const on = (i + Math.floor(t * 6)) % 4 === 0
    ctx.fillStyle = on ? '#f0abfc' : '#6b21a8'
    ctx.beginPath()
    ctx.arc(Math.cos(a) * 31, Math.sin(a) * 31 * 0.82, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }
  // armour plates
  ctx.strokeStyle = 'rgba(30,27,75,0.8)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 18)
    ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 33)
  }
  ctx.stroke()
  // damage cracks
  if (hp < 0.5) {
    ctx.strokeStyle = 'rgba(251,146,60,0.85)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(-30, -12)
    ctx.lineTo(-20, -6)
    ctx.lineTo(-24, 4)
    ctx.moveTo(26, 10)
    ctx.lineTo(16, 16)
    ctx.lineTo(20, 24)
    ctx.stroke()
  }
  // core
  const pulse = 0.5 + Math.sin(t * 5) * 0.5
  const cr = 13 + charge * 6
  const cg = ctx.createRadialGradient(0, 0, 1, 0, 0, cr)
  cg.addColorStop(0, '#fff1f2')
  cg.addColorStop(0.4, charge > 0 ? '#f43f5e' : '#e879f9')
  cg.addColorStop(1, charge > 0 ? '#881337' : '#581c87')
  ctx.fillStyle = cg
  ctx.beginPath()
  ctx.arc(0, 0, cr, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = `rgba(255,255,255,${0.35 + pulse * 0.4})`
  ctx.lineWidth = 1.5
  ctx.stroke()
  // eye slit
  ctx.fillStyle = '#1e1b4b'
  ctx.beginPath()
  ctx.ellipse(0, 0, 7, 2.2 + charge * 2.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
