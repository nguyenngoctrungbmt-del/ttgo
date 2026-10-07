/** Rooftop Ninja vector art for late-run content: rival ninja, shuriken, fire vents, oni boss, scroll. */

/** Rival ninja (navy with red headband). `wind` 0..1 = about to throw (glint). */
export function drawRival(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, wind: number) {
  const bob = Math.sin(t * 6) * 1.5
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(0, 0, 13, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1e3a8a'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-3, -14)
  ctx.lineTo(-8, 0)
  ctx.moveTo(3, -14)
  ctx.lineTo(7, 0)
  ctx.stroke()
  const body = ctx.createLinearGradient(0, -34, 0, -12)
  body.addColorStop(0, '#2563eb')
  body.addColorStop(1, '#1e3a8a')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.roundRect(-9, -33 + bob, 18, 21, 6)
  ctx.fill()
  ctx.fillStyle = '#172554'
  ctx.beginPath()
  ctx.arc(-1, -40 + bob, 8.5, 0, Math.PI * 2)
  ctx.fill()
  // red headband with tails
  ctx.fillStyle = '#ef4444'
  ctx.fillRect(-9.5, -44 + bob, 17, 3.5)
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(7, -43 + bob)
  ctx.quadraticCurveTo(14, -46 + Math.sin(t * 14) * 3, 18, -40 + Math.sin(t * 14 + 1) * 4)
  ctx.stroke()
  // eyes (facing left)
  ctx.fillStyle = '#fef3c7'
  ctx.fillRect(-8, -41 + bob, 7, 2.6)
  ctx.fillStyle = '#111827'
  ctx.fillRect(-7, -41 + bob, 2, 2.6)
  // throwing arm + glint
  const ax = -10 - wind * 4
  const ay = -30 + bob - wind * 10
  ctx.strokeStyle = '#1e3a8a'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(-4, -28 + bob)
  ctx.lineTo(ax, ay)
  ctx.stroke()
  if (wind > 0) {
    ctx.globalAlpha = Math.min(1, wind * 1.5)
    ctx.fillStyle = '#fecaca'
    ctx.beginPath()
    const r = 5 + wind * 7
    ctx.moveTo(ax, ay - r)
    ctx.quadraticCurveTo(ax, ay, ax + r, ay)
    ctx.quadraticCurveTo(ax, ay, ax, ay + r)
    ctx.quadraticCurveTo(ax, ay, ax - r, ay)
    ctx.quadraticCurveTo(ax, ay, ax, ay - r)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

/** Spinning shuriken. */
export function drawShuriken(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, friendly: boolean) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.fillStyle = friendly ? '#fde047' : '#cbd5e1'
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10)
    ctx.lineTo(Math.cos(a + Math.PI / 4) * 3.5, Math.sin(a + Math.PI / 4) * 3.5)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = friendly ? '#a16207' : '#ef4444'
  ctx.lineWidth = 1.2
  ctx.stroke()
  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.arc(0, 0, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Fire vent grate (28 px wide from x); warn 0..1 = puffs, blast 0..1 = flame column. */
export function drawVent(ctx: CanvasRenderingContext2D, x: number, y: number, warn: number, blast: number, t: number) {
  // Raised metal grate with a hot glow inside so it reads as a hazard even while idle
  ctx.fillStyle = 'rgba(249,115,22,0.35)'
  ctx.beginPath()
  ctx.ellipse(x + 14, y - 6, 20, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#a8a29e'
  ctx.beginPath()
  ctx.roundRect(x - 3, y - 9, 34, 9, 2)
  ctx.fill()
  ctx.fillStyle = '#ea580c'
  for (let i = 0; i < 4; i++) ctx.fillRect(x + 1 + i * 7.5, y - 7, 4, 5)
  ctx.fillStyle = '#e7e5e4'
  ctx.fillRect(x - 3, y - 9, 34, 1.5)
  if (warn > 0) {
    ctx.fillStyle = `rgba(249,115,22,${0.25 + warn * 0.6})`
    ctx.fillRect(x, y - 7, 28, 3)
    for (let i = 0; i < 3; i++) {
      const k = (t * 2 + i / 3) % 1
      ctx.globalAlpha = (1 - k) * 0.6
      ctx.fillStyle = '#e7e5e4'
      ctx.beginPath()
      ctx.arc(x + 8 + i * 6, y - 8 - k * 26, 3 + k * 4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  if (blast > 0) {
    const h = 120 * Math.min(1, blast * 4)
    const g = ctx.createLinearGradient(0, y - h, 0, y)
    g.addColorStop(0, 'rgba(254,240,138,0)')
    g.addColorStop(0.3, 'rgba(251,146,60,0.85)')
    g.addColorStop(1, 'rgba(239,68,68,0.95)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x, y - 4)
    for (let i = 0; i <= 6; i++) {
      const px = x + (i / 6) * 28
      ctx.lineTo(px + Math.sin(t * 30 + i) * 3, y - h * (0.75 + Math.sin(t * 22 + i * 2) * 0.25))
    }
    ctx.lineTo(x + 28, y - 4)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(254,249,195,0.85)'
    ctx.beginPath()
    ctx.ellipse(x + 14, y - h * 0.3, 5, h * 0.25, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

const CLOUD: [number, number, number][] = [
  [-30, 22, 14],
  [-12, 26, 17],
  [8, 27, 16],
  [26, 22, 13],
  [0, 16, 15],
]

/** Oni warlord riding a storm cloud. `wind` 0..1 = charging an attack, `hurt` flashes. */
export function drawOni(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, wind: number, hurt: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#334155'
  for (const [cx, cy, r] of CLOUD) {
    ctx.beginPath()
    ctx.arc(cx, cy + Math.sin(t * 2 + cx) * 2, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(148,163,184,0.5)'
  ctx.beginPath()
  ctx.arc(-14, 26, 9, 0, Math.PI * 2)
  ctx.arc(10, 24, 10, 0, Math.PI * 2)
  ctx.fill()
  const body = ctx.createRadialGradient(-8, -18, 4, 0, -10, 34)
  body.addColorStop(0, hurt > 0 ? '#ffffff' : '#f87171')
  body.addColorStop(1, hurt > 0 ? '#fca5a5' : '#7f1d1d')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, -8, 28, 26, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fef3c7'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(s * 12, -28)
    ctx.quadraticCurveTo(s * 22, -44, s * 16, -54)
    ctx.quadraticCurveTo(s * 14, -40, s * 4, -32)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.moveTo(-20, -22)
  ctx.lineTo(-4, -14)
  ctx.lineTo(-4, -11)
  ctx.lineTo(-20, -18)
  ctx.moveTo(20, -22)
  ctx.lineTo(4, -14)
  ctx.lineTo(4, -11)
  ctx.lineTo(20, -18)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.arc(-11, -9, 4, 0, Math.PI * 2)
  ctx.arc(11, -9, 4, 0, Math.PI * 2)
  ctx.fill()
  const open = 3 + wind * 9
  ctx.fillStyle = '#450a0a'
  ctx.beginPath()
  ctx.ellipse(0, 6, 13, open, 0, 0, Math.PI * 2)
  ctx.fill()
  if (wind > 0) {
    ctx.fillStyle = `rgba(253,186,116,${wind})`
    ctx.beginPath()
    ctx.arc(0, 6, open * 0.7, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#fffbeb'
  ctx.beginPath()
  ctx.moveTo(-9, 2)
  ctx.lineTo(-6, 2)
  ctx.lineTo(-8, -6)
  ctx.moveTo(9, 2)
  ctx.lineTo(6, 2)
  ctx.lineTo(8, -6)
  ctx.fill()
  ctx.strokeStyle = '#78350f'
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(24, 0)
  ctx.lineTo(40, -30 - wind * 6)
  ctx.stroke()
  ctx.fillStyle = '#57534e'
  ctx.beginPath()
  ctx.arc(41, -33 - wind * 6, 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Fireball thrown by the oni (orange = hostile, gold once deflected). */
export function drawFireball(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, friendly: boolean) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, 14)
  g.addColorStop(0, '#fffbeb')
  g.addColorStop(0.4, friendly ? '#fde047' : '#fb923c')
  g.addColorStop(1, friendly ? 'rgba(234,179,8,0)' : 'rgba(220,38,38,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, 14 + Math.sin(t * 30) * 1.5, 0, Math.PI * 2)
  ctx.fill()
}

/** Lightning bolt from (x, y0) down to (x, y1). */
export function drawBolt(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, t: number) {
  ctx.strokeStyle = '#fef9c3'
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y0)
  const n = 8
  for (let i = 1; i <= n; i++) ctx.lineTo(x + (i < n ? Math.sin(t * 60 + i * 2.3) * 12 : 0), y0 + ((y1 - y0) * i) / n)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(250,204,21,0.5)'
  ctx.lineWidth = 10
  ctx.stroke()
}

/** Golden scroll pickup (Shadow Dash). */
export function drawScroll(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save()
  ctx.translate(x, y + Math.sin(t * 3) * 4)
  ctx.rotate(Math.sin(t * 2) * 0.15)
  ctx.fillStyle = '#fef3c7'
  ctx.fillRect(-11, -8, 22, 16)
  ctx.fillStyle = '#a855f7'
  ctx.fillRect(-11, -2, 22, 4)
  ctx.fillStyle = '#b45309'
  ctx.beginPath()
  ctx.roundRect(-15, -10, 5, 20, 2)
  ctx.roundRect(10, -10, 5, 20, 2)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.fillRect(-14, -12, 3, 3)
  ctx.fillRect(11, -12, 3, 3)
  ctx.restore()
}
