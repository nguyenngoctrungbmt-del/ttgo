/** Radial glow fading to the same hue (the shared glow fades to black, which greys out on light ground). */
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 0.5) {
  const n = parseInt(color.slice(1), 16)
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, `rgba(${rgb},1)`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  const prev = ctx.globalAlpha
  ctx.globalAlpha = prev * Math.max(0, Math.min(1, alpha))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = prev
}

/** Molten rock boss: basalt plates, pulsing magma cracks, horned brow, glowing slit eyes. */
export function drawColossus(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  o: { flash: boolean; wobble: number; look: number; t: number; charge: number; chargeColor: string },
) {
  const pulse = 0.5 + 0.5 * Math.sin(o.t * 4)
  if (o.charge > 0) glow(ctx, x, y, r * (1.6 + o.charge), o.chargeColor, 0.35 + o.charge * 0.35)
  else glow(ctx, x, y, r * 1.5, '#f97316', 0.18 + pulse * 0.1)
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(4, r * 0.75, r * 1.05, r * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  const sq = 1 + Math.sin(o.wobble) * 0.04 + o.charge * Math.sin(o.t * 40) * 0.04
  ctx.scale(sq, 2 - sq)
  // Horns
  ctx.fillStyle = '#1c1917'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(s * r * 0.15, -r * 0.85)
    ctx.quadraticCurveTo(s * r * 1.25, -r * 1.0, s * r * 1.05, -r * 1.6)
    ctx.quadraticCurveTo(s * r * 0.95, -r * 0.95, s * r * 0.85, -r * 0.5)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = '#fb923c'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(s * r * 1.04, -r * 1.55, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  // Rock body: lumpy outline
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 2, 0, 0, r * 1.05)
  g.addColorStop(0, o.flash ? '#ffffff' : '#78716c')
  g.addColorStop(0.6, o.flash ? '#fed7aa' : '#44403c')
  g.addColorStop(1, '#1c1917')
  ctx.fillStyle = g
  ctx.beginPath()
  for (let k = 0; k <= 14; k++) {
    const a = (k / 14) * Math.PI * 2
    const rr = r * (1 + (k % 2 ? -0.06 : 0.05))
    if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#0c0a09'
  ctx.lineWidth = 2
  ctx.stroke()
  // Magma cracks
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const cracks: [number, number][][] = [
    [[-0.7, 0.1], [-0.4, 0.3], [-0.45, 0.65]],
    [[0.75, 0.05], [0.45, 0.35], [0.5, 0.7]],
    [[-0.15, 0.55], [0.1, 0.8]],
    [[-0.55, -0.45], [-0.3, -0.6]],
  ]
  for (const [col, lw] of [['rgba(234,88,12,0.6)', 6], [pulse > 0.5 ? '#fdba74' : '#f97316', 2.5]] as const) {
    ctx.strokeStyle = col
    ctx.lineWidth = lw
    for (const c of cracks) {
      ctx.beginPath()
      c.forEach(([cx, cy], k) => (k ? ctx.lineTo(cx * r, cy * r) : ctx.moveTo(cx * r, cy * r)))
      ctx.stroke()
    }
  }
  // Molten core in the chest, brighter while charging
  const cg = ctx.createRadialGradient(0, r * 0.25, 1, 0, r * 0.25, r * 0.38)
  cg.addColorStop(0, '#fff7ed')
  cg.addColorStop(0.4, o.charge > 0 ? o.chargeColor : '#fb923c')
  cg.addColorStop(1, 'rgba(124,45,18,0)')
  ctx.fillStyle = cg
  ctx.beginPath()
  ctx.arc(0, r * 0.25, r * (0.32 + o.charge * 0.1), 0, Math.PI * 2)
  ctx.fill()
  // Heavy brow + angry slit eyes
  ctx.fillStyle = '#292524'
  ctx.beginPath()
  ctx.moveTo(-r * 0.7, -r * 0.42)
  ctx.lineTo(0, -r * 0.18)
  ctx.lineTo(r * 0.7, -r * 0.42)
  ctx.lineTo(r * 0.6, -r * 0.6)
  ctx.lineTo(-r * 0.6, -r * 0.6)
  ctx.closePath()
  ctx.fill()
  const lx = Math.cos(o.look) * r * 0.06
  const ly = Math.sin(o.look) * r * 0.05
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.moveTo(s * r * 0.15 + lx, -r * 0.18 + ly)
    ctx.lineTo(s * r * 0.55 + lx, -r * 0.34 + ly)
    ctx.lineTo(s * r * 0.48 + lx, -r * 0.12 + ly)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.beginPath()
  ctx.ellipse(-r * 0.45, -r * 0.7, r * 0.22, r * 0.09, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

/** Mortar slime extras drawn over the body: steel helmet + stubby launcher tube. */
export function drawMortarGear(ctx: CanvasRenderingContext2D, r: number, look: number, ready: number) {
  ctx.fillStyle = '#334155'
  ctx.beginPath()
  ctx.arc(0, -r * 0.1, r * 1.02, Math.PI * 1.05, Math.PI * 1.95)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#64748b'
  ctx.fillRect(-r * 0.95, -r * 0.42, r * 1.9, r * 0.16)
  ctx.fillStyle = '#cbd5e1'
  for (const s of [-0.6, 0, 0.6]) {
    ctx.beginPath()
    ctx.arc(s * r, -r * 0.34, 1.3, 0, Math.PI * 2)
    ctx.fill()
  }
  // Tube leans toward the target
  ctx.save()
  ctx.translate(0, -r * 0.65)
  ctx.rotate(Math.cos(look) * 0.6)
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(-r * 0.22, -r * 0.9, r * 0.44, r * 0.9)
  ctx.fillStyle = '#475569'
  ctx.fillRect(-r * 0.3, -r * 1.0, r * 0.6, r * 0.2)
  if (ready > 0) {
    ctx.globalAlpha = ready
    ctx.fillStyle = '#fb923c'
    ctx.beginPath()
    ctx.arc(0, -r * 0.95, r * 0.24, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.restore()
}

/** Charger beetle-slime extras: armour bands and a forward horn. */
export function drawChargerGear(ctx: CanvasRenderingContext2D, r: number, dir: number, winding: boolean) {
  ctx.strokeStyle = winding ? '#7f1d1d' : '#78350f'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (const k of [-0.35, 0.05, 0.45]) {
    ctx.beginPath()
    ctx.arc(0, r * k + r * 0.9, r * 1.1, Math.PI * 1.25, Math.PI * 1.75)
    ctx.stroke()
  }
  ctx.save()
  ctx.rotate(dir)
  const hg = ctx.createLinearGradient(r * 0.7, 0, r * 1.7, 0)
  hg.addColorStop(0, '#e7e5e4')
  hg.addColorStop(1, winding ? '#fca5a5' : '#ffffff')
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.moveTo(r * 0.7, -r * 0.3)
  ctx.quadraticCurveTo(r * 1.4, -r * 0.35, r * 1.75, -r * 0.05)
  ctx.quadraticCurveTo(r * 1.3, r * 0.05, r * 0.7, r * 0.3)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()
}

/** Dashed lane showing where a charger is about to dash. */
export function drawDashLane(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, p: number, t: number) {
  const len = 250
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(dir)
  ctx.globalAlpha = 0.25 + p * 0.45
  ctx.fillStyle = '#ef4444'
  ctx.fillRect(0, -10, len * p, 20)
  ctx.globalAlpha = 0.85
  ctx.strokeStyle = '#fecaca'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 6])
  ctx.lineDashOffset = -t * 60
  ctx.beginPath()
  ctx.moveTo(0, -10)
  ctx.lineTo(len, -10)
  ctx.moveTo(0, 10)
  ctx.lineTo(len, 10)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#fecaca'
  ctx.beginPath()
  ctx.moveTo(len + 12, 0)
  ctx.lineTo(len - 2, -12)
  ctx.lineTo(len - 2, 12)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.globalAlpha = 1
}

/** Ground target for an incoming mortar shell: ring + filling disc + crosshair. */
export function drawLobZone(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, t: number) {
  ctx.globalAlpha = 0.18 + p * 0.3
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(x, y, r * p, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.9
  ctx.strokeStyle = p > 0.75 && Math.floor(t * 14) % 2 ? '#ffffff' : '#f87171'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 5])
  ctx.lineDashOffset = t * 30
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(x - 6, y)
  ctx.lineTo(x + 6, y)
  ctx.moveTo(x, y - 6)
  ctx.lineTo(x, y + 6)
  ctx.stroke()
  ctx.globalAlpha = 1
}

export function drawLobShell(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, t: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(x, y, 6 - h * 0.02, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  const sy = y - h
  const g = ctx.createRadialGradient(x - 2, sy - 2, 1, x, sy, 7)
  g.addColorStop(0, '#94a3b8')
  g.addColorStop(1, '#0f172a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, sy, 6.5, 0, Math.PI * 2)
  ctx.fill()
  glow(ctx, x + 3, sy - 6, 7, '#fde047', 0.7 + Math.sin(t * 30) * 0.3)
}

/** Lava vent: bubbling crack telegraph, then a fire column. */
export function drawVent(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, erupt: number, t: number) {
  if (erupt <= 0) {
    glow(ctx, x, y, r * (0.8 + p * 0.6), '#f97316', 0.2 + p * 0.5)
    ctx.strokeStyle = p > 0.7 && Math.floor(t * 12) % 2 ? '#fff7ed' : '#fb923c'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#fde68a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2 + 0.4
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(a) * r * p * 0.8, y + Math.sin(a) * r * p * 0.8)
    }
    ctx.stroke()
    for (let k = 0; k < 3; k++) {
      const bp = (t * 2 + k / 3) % 1
      ctx.globalAlpha = 1 - bp
      ctx.fillStyle = '#fdba74'
      ctx.beginPath()
      ctx.arc(x + Math.cos(k * 2.1) * r * 0.4, y + Math.sin(k * 2.1) * r * 0.4, 2 + bp * 4 * p, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  } else {
    const k = Math.min(1, erupt * 3)
    glow(ctx, x, y, r * 2, '#fb923c', 0.6 * k)
    const g = ctx.createLinearGradient(x, y - r * 3, x, y)
    g.addColorStop(0, 'rgba(254,215,170,0)')
    g.addColorStop(0.5, 'rgba(251,146,60,0.85)')
    g.addColorStop(1, '#fff7ed')
    ctx.globalAlpha = k
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x - r * 0.8, y)
    ctx.quadraticCurveTo(x - r * 0.5, y - r * 1.6, x + Math.sin(t * 20) * 4, y - r * 3)
    ctx.quadraticCurveTo(x + r * 0.5, y - r * 1.6, x + r * 0.8, y)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

export type PickupKind = 'repair' | 'overdrive'

export function drawPickup(ctx: CanvasRenderingContext2D, kind: PickupKind, x: number, y: number, t: number, blink: boolean) {
  if (blink && Math.floor(t * 8) % 2) return
  const by = y + Math.sin(t * 4) * 3
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.beginPath()
  ctx.ellipse(x, y + 12, 10, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  if (kind === 'repair') {
    glow(ctx, x, by, 24, '#4ade80', 0.4)
    const g = ctx.createLinearGradient(0, by - 11, 0, by + 11)
    g.addColorStop(0, '#bbf7d0')
    g.addColorStop(1, '#16a34a')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(x - 11, by - 11, 22, 22, 6)
    ctx.fill()
    ctx.strokeStyle = '#14532d'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - 2.5, by - 7, 5, 14)
    ctx.fillRect(x - 7, by - 2.5, 14, 5)
  } else {
    glow(ctx, x, by, 26, '#22d3ee', 0.45)
    ctx.save()
    ctx.translate(x, by)
    ctx.rotate(Math.sin(t * 2) * 0.15)
    const g = ctx.createLinearGradient(0, -12, 0, 12)
    g.addColorStop(0, '#cffafe')
    g.addColorStop(1, '#0891b2')
    ctx.fillStyle = g
    ctx.beginPath()
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6
      if (k === 0) ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12)
      else ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12)
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#164e63'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#fef08a'
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(2, -9)
    ctx.lineTo(-5, 1)
    ctx.lineTo(-0.5, 1)
    ctx.lineTo(-2, 9)
    ctx.lineTo(5, -2)
    ctx.lineTo(0.5, -2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
  }
}
