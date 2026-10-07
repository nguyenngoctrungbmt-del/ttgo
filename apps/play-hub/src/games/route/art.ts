/** Vector art for Route Recall: landmark badges, taxi, other cars and arrow icons. */

export const LANDMARKS: { name: string; color: string }[] = [
  { name: 'Park', color: '#16a34a' },
  { name: 'Fountain', color: '#0ea5e9' },
  { name: 'Hospital', color: '#ef4444' },
  { name: 'Gas', color: '#f59e0b' },
  { name: 'School', color: '#8b5cf6' },
  { name: 'Cafe', color: '#92400e' },
  { name: 'Bank', color: '#475569' },
  { name: 'Tower', color: '#db2777' },
]

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
}

/** Round badge with an icon; `label` adds the name underneath. */
export function drawLandmark(ctx: CanvasRenderingContext2D, type: number, x: number, y: number, r: number, label = true) {
  const lm = LANDMARKS[type]
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ell(ctx, 2, 3, r, r)
  ctx.fill()
  ctx.fillStyle = lm.color
  ell(ctx, 0, 0, r, r)
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = Math.max(1.5, r * 0.1)
  ctx.stroke()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const s = r * 0.62
  ctx.fillStyle = '#fff'
  ctx.strokeStyle = '#fff'
  switch (type) {
    case 0: // tree
      ctx.fillStyle = '#bbf7d0'
      ell(ctx, 0, -s * 0.25, s * 0.62, s * 0.62)
      ctx.fill()
      ell(ctx, -s * 0.45, s * 0.05, s * 0.4, s * 0.4)
      ctx.fill()
      ell(ctx, s * 0.45, s * 0.05, s * 0.4, s * 0.4)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillRect(-s * 0.1, s * 0.2, s * 0.2, s * 0.7)
      break
    case 1: // fountain
      ctx.beginPath()
      ctx.moveTo(-s * 0.9, s * 0.3)
      ctx.quadraticCurveTo(0, s * 1.15, s * 0.9, s * 0.3)
      ctx.closePath()
      ctx.fill()
      ctx.lineWidth = Math.max(1.5, s * 0.18)
      ctx.beginPath()
      ctx.moveTo(0, s * 0.3)
      ctx.lineTo(0, -s * 0.75)
      ctx.stroke()
      ctx.lineWidth = Math.max(1, s * 0.11)
      for (const d of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(0, -s * 0.7)
        ctx.quadraticCurveTo(d * s * 0.5, -s * 0.85, d * s * 0.62, s * 0.05)
        ctx.stroke()
      }
      ell(ctx, -s * 0.35, -s * 0.95, s * 0.09, s * 0.09)
      ctx.fill()
      ell(ctx, s * 0.35, -s * 0.95, s * 0.09, s * 0.09)
      ctx.fill()
      break
    case 2: // cross
      ctx.fillRect(-s * 0.22, -s * 0.75, s * 0.44, s * 1.5)
      ctx.fillRect(-s * 0.75, -s * 0.22, s * 1.5, s * 0.44)
      break
    case 3: // fuel pump
      ctx.beginPath()
      ctx.roundRect(-s * 0.6, -s * 0.7, s * 0.85, s * 1.5, s * 0.12)
      ctx.fill()
      ctx.fillStyle = lm.color
      ctx.fillRect(-s * 0.45, -s * 0.52, s * 0.55, s * 0.4)
      ctx.lineWidth = Math.max(1.5, s * 0.14)
      ctx.beginPath()
      ctx.moveTo(s * 0.25, -s * 0.4)
      ctx.lineTo(s * 0.6, -s * 0.15)
      ctx.lineTo(s * 0.6, s * 0.5)
      ctx.stroke()
      break
    case 4: // school: house with bell
      ctx.beginPath()
      ctx.moveTo(-s * 0.8, -s * 0.05)
      ctx.lineTo(0, -s * 0.8)
      ctx.lineTo(s * 0.8, -s * 0.05)
      ctx.closePath()
      ctx.fill()
      ctx.fillRect(-s * 0.6, -s * 0.05, s * 1.2, s * 0.85)
      ctx.fillStyle = lm.color
      ctx.fillRect(-s * 0.15, s * 0.3, s * 0.3, s * 0.5)
      ell(ctx, 0, -s * 0.28, s * 0.14, s * 0.14)
      ctx.fill()
      break
    case 5: // cup
      ctx.beginPath()
      ctx.moveTo(-s * 0.6, -s * 0.35)
      ctx.lineTo(s * 0.45, -s * 0.35)
      ctx.lineTo(s * 0.35, s * 0.6)
      ctx.lineTo(-s * 0.5, s * 0.6)
      ctx.closePath()
      ctx.fill()
      ctx.lineWidth = Math.max(1.5, s * 0.14)
      ctx.beginPath()
      ctx.arc(s * 0.5, s * 0.05, s * 0.25, -Math.PI / 2, Math.PI / 2)
      ctx.stroke()
      ctx.lineWidth = Math.max(1, s * 0.1)
      for (const dx of [-0.25, 0.1]) {
        ctx.beginPath()
        ctx.moveTo(dx * s, -s * 0.5)
        ctx.quadraticCurveTo(dx * s + s * 0.15, -s * 0.7, dx * s, -s * 0.9)
        ctx.stroke()
      }
      break
    case 6: // bank columns
      ctx.beginPath()
      ctx.moveTo(-s * 0.85, -s * 0.35)
      ctx.lineTo(0, -s * 0.85)
      ctx.lineTo(s * 0.85, -s * 0.35)
      ctx.closePath()
      ctx.fill()
      for (const dx of [-0.55, -0.18, 0.18, 0.55]) ctx.fillRect(dx * s - s * 0.1, -s * 0.28, s * 0.2, s * 0.85)
      ctx.fillRect(-s * 0.85, s * 0.6, s * 1.7, s * 0.2)
      break
    default: // radio tower
      ctx.lineWidth = Math.max(1.5, s * 0.14)
      ctx.beginPath()
      ctx.moveTo(-s * 0.5, s * 0.85)
      ctx.lineTo(0, -s * 0.55)
      ctx.lineTo(s * 0.5, s * 0.85)
      ctx.moveTo(-s * 0.3, s * 0.3)
      ctx.lineTo(s * 0.3, s * 0.3)
      ctx.stroke()
      ell(ctx, 0, -s * 0.65, s * 0.16, s * 0.16)
      ctx.fill()
      ctx.lineWidth = Math.max(1, s * 0.08)
      for (const rr of [0.4, 0.65]) {
        ctx.beginPath()
        ctx.arc(0, -s * 0.65, s * rr, -Math.PI * 0.85, -Math.PI * 0.15)
        ctx.stroke()
      }
      break
  }
  if (label) {
    ctx.font = `900 ${Math.max(9, Math.round(r * 0.42))}px 'Plus Jakarta Sans', system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const tw = ctx.measureText(lm.name.toUpperCase()).width + 8
    ctx.fillStyle = 'rgba(15,23,42,0.85)'
    ctx.beginPath()
    ctx.roundRect(-tw / 2, r + 2, tw, r * 0.6, 4)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillText(lm.name.toUpperCase(), 0, r + 2 + r * 0.3)
  }
  ctx.restore()
}

/** Arrow icon: move 'L' | 'S' | 'R', centred, size s. */
export function drawArrow(ctx: CanvasRenderingContext2D, move: string, x: number, y: number, s: number, color = '#fff') {
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = s * 0.22
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  if (move === 'S') {
    ctx.moveTo(0, s * 0.8)
    ctx.lineTo(0, -s * 0.35)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.9)
    ctx.lineTo(s * 0.45, -s * 0.3)
    ctx.lineTo(-s * 0.45, -s * 0.3)
  } else {
    const d = move === 'L' ? -1 : 1
    ctx.moveTo(-d * s * 0.25, s * 0.8)
    ctx.lineTo(-d * s * 0.25, 0)
    ctx.quadraticCurveTo(-d * s * 0.25, -s * 0.35, d * s * 0.15, -s * 0.35)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(d * s * 0.85, -s * 0.35)
    ctx.lineTo(d * s * 0.2, -s * 0.8)
    ctx.lineTo(d * s * 0.2, s * 0.1)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** Top-down car pointing up (−y). */
export function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, body: string, taxi: boolean, night: boolean, brake: boolean) {
  const wdt = len * 0.52
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  if (night) {
    const g = ctx.createRadialGradient(0, -len * 1.1, 4, 0, -len * 1.1, len * 1.2)
    g.addColorStop(0, 'rgba(254,249,195,0.55)')
    g.addColorStop(1, 'rgba(254,249,195,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-wdt * 0.35, -len * 0.45)
    ctx.lineTo(-len * 0.7, -len * 1.9)
    ctx.lineTo(len * 0.7, -len * 1.9)
    ctx.lineTo(wdt * 0.35, -len * 0.45)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.roundRect(-wdt / 2 + 3, -len / 2 + 4, wdt, len, wdt * 0.3)
  ctx.fill()
  // Wheels
  ctx.fillStyle = '#111827'
  for (const sx of [-1, 1]) {
    for (const sy of [-0.3, 0.3]) ctx.fillRect(sx * wdt * 0.5 - 3, sy * len - len * 0.1, 6, len * 0.2)
  }
  const g = ctx.createLinearGradient(-wdt / 2, 0, wdt / 2, 0)
  g.addColorStop(0, body)
  g.addColorStop(0.5, '#ffffff')
  g.addColorStop(0.55, body)
  g.addColorStop(1, body)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.roundRect(-wdt / 2, -len / 2, wdt, len, wdt * 0.3)
  ctx.fill()
  ctx.globalAlpha = 0.25
  ctx.fillStyle = g
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Windscreens
  ctx.fillStyle = '#1e3a5f'
  ctx.beginPath()
  ctx.roundRect(-wdt * 0.38, -len * 0.3, wdt * 0.76, len * 0.18, 3)
  ctx.fill()
  ctx.beginPath()
  ctx.roundRect(-wdt * 0.36, len * 0.22, wdt * 0.72, len * 0.12, 3)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillRect(-wdt * 0.3, -len * 0.28, wdt * 0.2, len * 0.05)
  if (taxi) {
    // Roof sign with checker band
    ctx.fillStyle = '#111827'
    ctx.fillRect(-wdt / 2, -len * 0.02, wdt, len * 0.08)
    ctx.fillStyle = '#fff'
    for (let i = 0; i < 5; i++) if (i % 2 === 0) ctx.fillRect(-wdt / 2 + (i * wdt) / 5, -len * 0.02, wdt / 5, len * 0.04)
    for (let i = 0; i < 5; i++) if (i % 2 === 1) ctx.fillRect(-wdt / 2 + (i * wdt) / 5, len * 0.02, wdt / 5, len * 0.04)
    ctx.fillStyle = '#fef08a'
    ctx.beginPath()
    ctx.roundRect(-wdt * 0.22, -len * 0.12, wdt * 0.44, len * 0.09, 2)
    ctx.fill()
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = 1
    ctx.stroke()
  }
  // Lights
  ctx.fillStyle = '#fef9c3'
  ctx.fillRect(-wdt * 0.42, -len * 0.5, wdt * 0.2, 3)
  ctx.fillRect(wdt * 0.22, -len * 0.5, wdt * 0.2, 3)
  ctx.fillStyle = brake ? '#ff2d2d' : '#b91c1c'
  ctx.fillRect(-wdt * 0.42, len * 0.5 - 3, wdt * 0.2, 3)
  ctx.fillRect(wdt * 0.22, len * 0.5 - 3, wdt * 0.2, 3)
  ctx.restore()
}
