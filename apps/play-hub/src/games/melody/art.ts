/** Key colours/symbols and the singing bird mascot for Melody Keys. */

export const KEYS = [
  { name: 'Red', color: '#ef4444', dark: '#991b1b', light: '#fca5a5' },
  { name: 'Orange', color: '#f97316', dark: '#9a3412', light: '#fdba74' },
  { name: 'Yellow', color: '#eab308', dark: '#854d0e', light: '#fde047' },
  { name: 'Green', color: '#22c55e', dark: '#166534', light: '#86efac' },
  { name: 'Teal', color: '#14b8a6', dark: '#115e59', light: '#5eead4' },
  { name: 'Blue', color: '#3b82f6', dark: '#1e3a8a', light: '#93c5fd' },
  { name: 'Purple', color: '#a855f7', dark: '#6b21a8', light: '#d8b4fe' },
  { name: 'Pink', color: '#ec4899', dark: '#9d174d', light: '#f9a8d4' },
]

/** Distinct white symbol per key so colour is never the only cue. */
export function drawSymbol(ctx: CanvasRenderingContext2D, i: number, x: number, y: number, s: number, fill = '#fff', stroke = 'rgba(0,0,0,0.35)') {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = fill
  ctx.strokeStyle = stroke
  ctx.lineWidth = Math.max(1.2, s * 0.12)
  ctx.lineJoin = 'round'
  ctx.beginPath()
  switch (i % 8) {
    case 0:
      ctx.arc(0, 0, s * 0.85, 0, Math.PI * 2)
      break
    case 1:
      ctx.moveTo(0, -s)
      ctx.lineTo(s * 0.95, s * 0.75)
      ctx.lineTo(-s * 0.95, s * 0.75)
      ctx.closePath()
      break
    case 2:
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5
        const r = k % 2 ? s * 0.45 : s
        if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      ctx.closePath()
      break
    case 3:
      ctx.roundRect(-s * 0.78, -s * 0.78, s * 1.56, s * 1.56, s * 0.18)
      break
    case 4:
      ctx.moveTo(0, -s)
      ctx.lineTo(s * 0.75, 0)
      ctx.lineTo(0, s)
      ctx.lineTo(-s * 0.75, 0)
      ctx.closePath()
      break
    case 5:
      ctx.moveTo(0, s * 0.85)
      ctx.bezierCurveTo(-s * 1.2, 0, -s * 0.6, -s * 1.0, 0, -s * 0.35)
      ctx.bezierCurveTo(s * 0.6, -s * 1.0, s * 1.2, 0, 0, s * 0.85)
      break
    case 6:
      ctx.arc(0, 0, s * 0.9, Math.PI * 0.25, Math.PI * 1.75)
      ctx.arc(s * 0.35, -s * 0.1, s * 0.65, Math.PI * 1.45, Math.PI * 0.55, true)
      ctx.closePath()
      break
    default:
      // Flower: five petals
      for (let k = 0; k < 5; k++) {
        const a = -Math.PI / 2 + (k * Math.PI * 2) / 5
        ctx.moveTo(Math.cos(a) * s * 0.55 + s * 0.42, Math.sin(a) * s * 0.55)
        ctx.arc(Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, s * 0.42, 0, Math.PI * 2)
      }
      break
  }
  ctx.stroke()
  ctx.fill()
  if (i % 8 === 7) {
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(0, 0, s * 0.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

/** Round songbird; `sing` 0..1 opens the beak, `flap` animates wings. */
export function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, sing: number, color: string, mood: 0 | 1 | -1) {
  ctx.save()
  ctx.translate(x, y)
  const squash = 1 + sing * 0.08
  ctx.scale(1 / squash, squash)
  // Tail
  ctx.fillStyle = '#4338ca'
  ctx.beginPath()
  ctx.moveTo(r * 0.7, r * 0.2)
  ctx.lineTo(r * 1.35, -r * 0.15)
  ctx.lineTo(r * 1.25, r * 0.45)
  ctx.closePath()
  ctx.fill()
  // Body
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.1)
  g.addColorStop(0, '#c7d2fe')
  g.addColorStop(0.55, '#6366f1')
  g.addColorStop(1, '#3730a3')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#312e81'
  ctx.lineWidth = Math.max(1.5, r * 0.05)
  ctx.stroke()
  // Belly
  ctx.fillStyle = '#fef3c7'
  ctx.beginPath()
  ctx.ellipse(-r * 0.05, r * 0.35, r * 0.58, r * 0.45, 0, 0, Math.PI * 2)
  ctx.fill()
  // Wings
  const flap = Math.sin(t * (sing > 0.1 ? 18 : 3)) * (sing > 0.1 ? 0.5 : 0.12)
  for (const s of [-1, 1]) {
    ctx.save()
    ctx.translate(s * r * 0.82, r * 0.05)
    ctx.rotate(s * (0.3 + flap))
    ctx.fillStyle = '#4f46e5'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.15, r * 0.24, r * 0.48, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  // Crest
  ctx.fillStyle = color
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath()
    ctx.ellipse(k * r * 0.18, -r * 1.0, r * 0.1, r * 0.25, k * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
  // Eyes
  const blink = (t % 3.1) < 0.12
  for (const s of [-1, 1]) {
    const ex = s * r * 0.33
    const ey = -r * 0.28
    if (blink || mood === 1 || sing > 0.5) {
      ctx.strokeStyle = '#1e1b4b'
      ctx.lineWidth = Math.max(1.5, r * 0.07)
      ctx.lineCap = 'round'
      ctx.beginPath()
      if (blink) {
        ctx.moveTo(ex - r * 0.1, ey)
        ctx.lineTo(ex + r * 0.1, ey)
      } else ctx.arc(ex, ey + r * 0.05, r * 0.11, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
    } else {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(ex, ey, r * 0.17, r * 0.19, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1e1b4b'
      ctx.beginPath()
      ctx.arc(ex + r * 0.02, ey + (mood === -1 ? r * 0.05 : 0.02 * r), r * 0.1, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(ex - r * 0.02, ey - r * 0.05, r * 0.04, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  if (mood === -1) {
    ctx.strokeStyle = '#1e1b4b'
    ctx.lineWidth = Math.max(1.5, r * 0.06)
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(s * r * 0.48, -r * 0.55)
      ctx.lineTo(s * r * 0.2, -r * 0.45)
      ctx.stroke()
    }
  }
  // Cheeks
  ctx.fillStyle = 'rgba(244,114,182,0.5)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.55, -r * 0.02, r * 0.12, r * 0.07, 0, 0, Math.PI * 2)
  ctx.ellipse(r * 0.55, -r * 0.02, r * 0.12, r * 0.07, 0, 0, Math.PI * 2)
  ctx.fill()
  // Beak
  const open = sing * r * 0.22
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(-r * 0.16, -r * 0.08)
  ctx.lineTo(r * 0.16, -r * 0.08)
  ctx.lineTo(0, r * 0.12 - open * 0.3)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#d97706'
  ctx.beginPath()
  ctx.moveTo(-r * 0.13, -r * 0.02 + open * 0.4)
  ctx.lineTo(r * 0.13, -r * 0.02 + open * 0.4)
  ctx.lineTo(0, r * 0.16 + open)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
