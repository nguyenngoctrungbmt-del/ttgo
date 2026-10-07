/** Swing vector art for the newer hazards and pickups. */

export function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r)
  g.addColorStop(0, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.35, 'rgba(165,243,252,0.35)')
  g.addColorStop(1, 'rgba(34,211,238,0.55)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r * (1 + Math.sin(t * 5) * 0.05), 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#cffafe'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, r * 0.65, -2.6, -1.7)
  ctx.stroke()
  // tiny shield emblem
  ctx.fillStyle = '#0891b2'
  ctx.beginPath()
  ctx.moveTo(x, y - r * 0.35)
  ctx.lineTo(x + r * 0.32, y - r * 0.2)
  ctx.quadraticCurveTo(x + r * 0.3, y + r * 0.25, x, y + r * 0.42)
  ctx.quadraticCurveTo(x - r * 0.3, y + r * 0.25, x - r * 0.32, y - r * 0.2)
  ctx.closePath()
  ctx.fill()
}

/** Stalactite hanging from the ceiling, tip pointing down. `angry` tints it while shaking/falling. */
export function drawSpike(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, angry: boolean) {
  const hw = 14
  const g = ctx.createLinearGradient(x - hw, 0, x + hw, 0)
  g.addColorStop(0, angry ? '#7f1d1d' : '#44403c')
  g.addColorStop(0.4, angry ? '#ef4444' : '#a8a29e')
  g.addColorStop(1, angry ? '#450a0a' : '#292524')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x - hw, y)
  ctx.lineTo(x - hw * 0.55, y + len * 0.45)
  ctx.lineTo(x, y + len)
  ctx.lineTo(x + hw * 0.5, y + len * 0.5)
  ctx.lineTo(x + hw, y)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - hw * 0.45, y + 4)
  ctx.lineTo(x - 2, y + len * 0.75)
  ctx.stroke()
  if (angry) {
    ctx.strokeStyle = '#fecaca'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x + 3, y + 3)
    ctx.lineTo(x - 1, y + len * 0.3)
    ctx.lineTo(x + 4, y + len * 0.45)
    ctx.stroke()
  }
}

/** Cave bat facing left, wings flapping with phase `ph`. */
export function drawBat(ctx: CanvasRenderingContext2D, x: number, y: number, ph: number) {
  const flap = Math.sin(ph * 18)
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#3b0764'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(s * 4, -2)
    ctx.quadraticCurveTo(s * 14, -14 * flap - 6, s * 24, -6 * flap - 2)
    ctx.lineTo(s * 20, 3)
    ctx.lineTo(s * 15, 0)
    ctx.lineTo(s * 11, 5)
    ctx.lineTo(s * 6, 3)
    ctx.closePath()
    ctx.fill()
  }
  const body = ctx.createRadialGradient(-2, -3, 1, 0, 0, 9)
  body.addColorStop(0, '#7e22ce')
  body.addColorStop(1, '#3b0764')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.ellipse(0, 0, 8, 9, 0, 0, Math.PI * 2)
  ctx.fill()
  // ears
  ctx.beginPath()
  ctx.moveTo(-6, -6)
  ctx.lineTo(-5, -13)
  ctx.lineTo(-1, -8)
  ctx.moveTo(6, -6)
  ctx.lineTo(5, -13)
  ctx.lineTo(1, -8)
  ctx.fill()
  // glowing red eyes + fangs
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(-3, -2, 2, 0, Math.PI * 2)
  ctx.arc(3, -2, 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(-3, 3)
  ctx.lineTo(-2, 6)
  ctx.lineTo(-1, 3)
  ctx.moveTo(1, 3)
  ctx.lineTo(2, 6)
  ctx.lineTo(3, 3)
  ctx.fill()
  ctx.restore()
}

/** Lava serpent from screen-space body points (head first): pts = [x0, y0, x1, y1, ...]. */
export function drawSerpent(ctx: CanvasRenderingContext2D, pts: Float32Array, n: number, t: number) {
  for (let i = n - 1; i >= 0; i--) {
    const x = pts[i * 2]
    const y = pts[i * 2 + 1]
    const r = 14 - i * 0.7
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r)
    g.addColorStop(0, '#fde047')
    g.addColorStop(0.5, i % 2 ? '#f97316' : '#ea580c')
    g.addColorStop(1, '#7f1d1d')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    // dorsal spike
    ctx.fillStyle = '#450a0a'
    ctx.beginPath()
    ctx.moveTo(x - r * 0.35, y - r * 0.8)
    ctx.lineTo(x, y - r * 1.45)
    ctx.lineTo(x + r * 0.35, y - r * 0.8)
    ctx.fill()
  }
  if (n < 2) return
  // head
  const hx = pts[0]
  const hy = pts[1]
  const a = Math.atan2(pts[1] - pts[3], pts[0] - pts[2])
  ctx.save()
  ctx.translate(hx, hy)
  ctx.rotate(a)
  const hg = ctx.createLinearGradient(0, -14, 0, 14)
  hg.addColorStop(0, '#fb923c')
  hg.addColorStop(1, '#9a3412')
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.ellipse(6, 0, 20, 13, 0, 0, Math.PI * 2)
  ctx.fill()
  // jaw open
  const jaw = 0.25 + Math.abs(Math.sin(t * 8)) * 0.25
  ctx.fillStyle = '#450a0a'
  ctx.beginPath()
  ctx.moveTo(10, 0)
  ctx.lineTo(28, -10 * jaw * 2)
  ctx.lineTo(28, 10 * jaw * 2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#fff7ed'
  ctx.beginPath()
  ctx.moveTo(16, -4)
  ctx.lineTo(19, 1)
  ctx.lineTo(22, -5)
  ctx.fill()
  // eye
  ctx.fillStyle = '#fef08a'
  ctx.beginPath()
  ctx.arc(8, -6, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1c1917'
  ctx.fillRect(7.2, -9, 1.8, 6)
  ctx.restore()
}
