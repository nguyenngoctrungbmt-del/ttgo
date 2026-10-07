import { MATS, type Mat, type Vehicle } from './physics'

export function lerpColor(a: string, b: string, k: number) {
  const A = parseInt(a.slice(1), 16)
  const B = parseInt(b.slice(1), 16)
  const r = Math.round(((A >> 16) & 255) + (((B >> 16) & 255) - ((A >> 16) & 255)) * k)
  const g = Math.round(((A >> 8) & 255) + (((B >> 8) & 255) - ((A >> 8) & 255)) * k)
  const bl = Math.round((A & 255) + ((B & 255) - (A & 255)) * k)
  return `rgb(${r},${g},${bl})`
}

/** Green → yellow → red by load ratio. */
export function stressColor(k: number) {
  if (k < 0.5) return lerpColor('#22c55e', '#facc15', k / 0.5)
  return lerpColor('#facc15', '#ef4444', Math.min(1, (k - 0.5) / 0.45))
}

export function drawBeam(
  ctx: CanvasRenderingContext2D,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  mat: Mat,
  stress: number | null,
  alpha = 1,
) {
  const len = Math.hypot(bx - ax, by - ay)
  if (len < 0.5) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(ax, ay)
  ctx.rotate(Math.atan2(by - ay, bx - ax))
  const m = MATS[mat]
  const tint = stress == null ? null : stressColor(stress)
  if (mat === 'road') {
    ctx.fillStyle = tint ?? m.color
    ctx.fillRect(0, -1, len, 6)
    ctx.fillStyle = '#1f2937'
    ctx.fillRect(0, -4, len, 4)
    ctx.fillStyle = '#fde68a'
    for (let x = 4; x < len - 6; x += 12) ctx.fillRect(x, -2.6, 6, 1.2)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(0, 4, len, 1)
  } else if (mat === 'wood') {
    ctx.fillStyle = m.dark
    ctx.fillRect(0, -3, len, 6)
    ctx.fillStyle = tint ?? m.color
    ctx.fillRect(0, -2, len, 4)
    if (!tint) {
      ctx.fillStyle = 'rgba(124,74,33,0.45)'
      for (let x = 6; x < len - 4; x += 9) ctx.fillRect(x, -1, 4, 0.8)
    }
  } else {
    ctx.fillStyle = m.dark
    ctx.fillRect(0, -3.5, len, 7)
    ctx.fillStyle = tint ?? m.color
    ctx.fillRect(0, -2.5, len, 5)
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.fillRect(0, -2, len, 1)
    if (!tint) {
      ctx.strokeStyle = m.dark
      ctx.lineWidth = 0.8
      ctx.beginPath()
      for (let x = 6; x < len - 6; x += 10) {
        ctx.moveTo(x, -2.5)
        ctx.lineTo(x + 5, 2.5)
      }
      ctx.stroke()
    }
  }
  ctx.restore()
}

export function drawJoint(ctx: CanvasRenderingContext2D, x: number, y: number, anchor: boolean, hot = false) {
  if (anchor) {
    ctx.fillStyle = '#7f1d1d'
    ctx.beginPath()
    ctx.arc(x, y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = hot ? '#fde047' : '#ef4444'
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.arc(x - 1.5, y - 1.5, 1.6, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.arc(x, y, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = hot ? '#fde047' : '#cbd5e1'
  ctx.beginPath()
  ctx.arc(x, y, 3, 0, Math.PI * 2)
  ctx.fill()
}

function wheel(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number) {
  ctx.fillStyle = '#111827'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#9ca3af'
  ctx.beginPath()
  ctx.arc(x, y, r * 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#4b5563'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const a = spin + (i * Math.PI * 2) / 3
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5)
  }
  ctx.stroke()
}

/** Vehicle in its own frame: rear wheel at origin, x along the chassis. */
export function drawVehicle(ctx: CanvasRenderingContext2D, v: Vehicle, t: number) {
  const [r, f] = v.parts
  const d = v.def
  const ang = Math.atan2(f.y - r.y, f.x - r.x)
  ctx.save()
  ctx.translate(r.x, r.y)
  ctx.rotate(ang)
  const wb = d.wb
  const bob = Math.sin(t * 18 + r.x * 0.1) * 0.4
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.fillRect(-d.r - 2, d.r - 1, wb + d.r * 2 + 4, 2)
  ctx.translate(0, bob)
  if (v.kind === 'car' || v.kind === 'van') {
    const bodyH = v.kind === 'van' ? 9 : 7
    ctx.fillStyle = d.color
    ctx.beginPath()
    ctx.roundRect(-d.r - 3, -bodyH - 1, wb + d.r * 2 + 6, bodyH + 2, 3)
    ctx.fill()
    // cabin
    ctx.beginPath()
    if (v.kind === 'car') {
      ctx.moveTo(wb * 0.05, -bodyH)
      ctx.lineTo(wb * 0.22, -bodyH - 9)
      ctx.lineTo(wb * 0.78, -bodyH - 9)
      ctx.lineTo(wb * 0.98, -bodyH)
    } else {
      ctx.moveTo(-d.r - 3, -bodyH)
      ctx.lineTo(-d.r - 3, -bodyH - 11)
      ctx.lineTo(wb * 0.8, -bodyH - 11)
      ctx.lineTo(wb + d.r + 1, -bodyH)
    }
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#bfdbfe'
    if (v.kind === 'car') {
      ctx.beginPath()
      ctx.moveTo(wb * 0.55, -bodyH - 1)
      ctx.lineTo(wb * 0.55, -bodyH - 7.5)
      ctx.lineTo(wb * 0.75, -bodyH - 7.5)
      ctx.lineTo(wb * 0.9, -bodyH - 1)
      ctx.fill()
      ctx.fillRect(wb * 0.27, -bodyH - 7.5, wb * 0.24, 6.5)
    } else {
      ctx.beginPath()
      ctx.moveTo(wb * 0.62, -bodyH - 1)
      ctx.lineTo(wb * 0.62, -bodyH - 9)
      ctx.lineTo(wb * 0.78, -bodyH - 9)
      ctx.lineTo(wb + d.r - 1, -bodyH - 1)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.fillRect(0, -bodyH - 7, wb * 0.5, 3)
    }
    // driver
    ctx.fillStyle = '#fcd34d'
    ctx.beginPath()
    ctx.arc(wb * 0.66, -bodyH - 4, 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111827'
    ctx.fillRect(wb * 0.66 + 0.6, -bodyH - 4.6, 0.9, 0.9)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(-d.r - 2, -bodyH, wb + d.r * 2 + 4, 1.4)
    ctx.fillStyle = '#fef08a'
    ctx.fillRect(wb + d.r + 1, -bodyH + 1, 2, 3)
  } else if (v.kind === 'truck') {
    // cargo box + cab
    ctx.fillStyle = '#e5e7eb'
    ctx.beginPath()
    ctx.roundRect(-d.r - 2, -26, wb * 0.72 + d.r, 22, 2)
    ctx.fill()
    ctx.fillStyle = '#cbd5e1'
    ctx.fillRect(-d.r - 2, -8, wb * 0.72 + d.r, 3)
    ctx.fillStyle = d.color
    ctx.fillRect(-d.r + 2, -21, wb * 0.5, 8)
    ctx.fillStyle = d.color
    ctx.beginPath()
    ctx.moveTo(wb * 0.74, -4)
    ctx.lineTo(wb * 0.74, -22)
    ctx.lineTo(wb + 2, -22)
    ctx.lineTo(wb + d.r + 3, -11)
    ctx.lineTo(wb + d.r + 3, -4)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#bfdbfe'
    ctx.beginPath()
    ctx.moveTo(wb * 0.86, -13)
    ctx.lineTo(wb * 0.86, -20)
    ctx.lineTo(wb + 1, -20)
    ctx.lineTo(wb + d.r + 1, -13)
    ctx.fill()
    ctx.fillStyle = '#374151'
    ctx.fillRect(-d.r - 2, -5, wb + d.r * 2 + 5, 3)
  } else {
    ctx.fillStyle = d.color
    ctx.beginPath()
    ctx.roundRect(-d.r - 4, -24, wb + d.r * 2 + 8, 21, 5)
    ctx.fill()
    ctx.fillStyle = '#bfdbfe'
    for (let x = -d.r; x < wb + d.r - 4; x += 9) ctx.fillRect(x, -20, 7, 7)
    ctx.fillStyle = '#fcd34d'
    ctx.beginPath()
    ctx.arc(wb + d.r - 3, -16, 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fef3c7'
    ctx.fillRect(-d.r - 4, -9, wb + d.r * 2 + 8, 2)
  }
  wheel(ctx, 0, 0, d.r, v.spin)
  wheel(ctx, wb, 0, d.r, v.spin)
  ctx.restore()
}

/** Five-point star. */
export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
}

export function wrench(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.7)
  ctx.fillStyle = on ? '#fbbf24' : 'rgba(255,255,255,0.25)'
  ctx.fillRect(-1.8, -2, 3.6, 12)
  ctx.beginPath()
  ctx.arc(0, -4, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = on ? '#78350f' : 'rgba(0,0,0,0.3)'
  ctx.fillRect(-1.6, -9.5, 3.2, 5)
  ctx.restore()
}
