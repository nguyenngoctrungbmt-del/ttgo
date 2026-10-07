import { glow } from '../../shared/action/fx'

// Vector art for the late-run content: biome layers, geysers, drones, the Sentinel boss and the shield pickup.

function hash(i: number) {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** Mid-depth parallax layer for the Glow Grotto (giant mushrooms) and Sunken Temple (ruined columns + light rays). */
export function drawBiomeLayer(ctx: CanvasRenderingContext2D, part: string, W: number, H: number, cam: number, t: number) {
  if (part === 'glow') {
    const par = 0.5
    const step = 120
    const first = Math.floor((cam * par) / step) - 1
    for (let k = first; k < first + Math.ceil(W / step) + 3; k++) {
      const x = k * step - cam * par + hash(k) * 50
      const tall = H * (0.18 + hash(k + 9) * 0.16)
      const r = 26 + hash(k + 3) * 22
      const base = H + 4
      const capY = base - tall
      ctx.fillStyle = '#1b1238'
      ctx.beginPath()
      ctx.moveTo(x - 7, base)
      ctx.quadraticCurveTo(x - 4 + Math.sin(k) * 8, capY + tall * 0.5, x - 4, capY)
      ctx.lineTo(x + 4, capY)
      ctx.quadraticCurveTo(x + 4 + Math.sin(k) * 8, capY + tall * 0.5, x + 7, base)
      ctx.fill()
      const pink = k % 2 === 0
      glow(ctx, x, capY - r * 0.2, r * 1.8, pink ? '#f472b6' : '#2dd4bf', 0.16 + Math.sin(t * 1.4 + k) * 0.05)
      const g = ctx.createLinearGradient(0, capY - r * 0.7, 0, capY)
      g.addColorStop(0, pink ? '#9d2a6e' : '#0f766e')
      g.addColorStop(1, '#2a1650')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(x, capY, r, r * 0.6, 0, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = pink ? '#fbcfe8' : '#99f6e4'
      ctx.globalAlpha = 0.55 + Math.sin(t * 2 + k) * 0.2
      for (let d = 0; d < 4; d++) {
        const a = Math.PI + 0.5 + d * 0.65
        ctx.beginPath()
        ctx.arc(x + Math.cos(a) * r * 0.62, capY + Math.sin(a) * r * 0.36, 2.2 + (d % 2), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
  } else if (part === 'bubble') {
    // Light shafts from cracks above
    ctx.fillStyle = '#7dd3fc'
    for (let i = 0; i < 4; i++) {
      const x0 = ((i * 157 - cam * 0.15) % (W + 160) + W + 160) % (W + 160) - 80
      ctx.globalAlpha = 0.05 + Math.sin(t * 0.8 + i * 1.7) * 0.025
      ctx.beginPath()
      ctx.moveTo(x0, 0)
      ctx.lineTo(x0 + 34, 0)
      ctx.lineTo(x0 + 110, H)
      ctx.lineTo(x0 + 40, H)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    // Ruined temple columns
    const par = 0.42
    const step = 150
    const first = Math.floor((cam * par) / step) - 1
    for (let k = first; k < first + Math.ceil(W / step) + 3; k++) {
      const x = k * step - cam * par + hash(k) * 40
      const broken = hash(k + 5)
      const top = H * (0.12 + broken * 0.35)
      const cw = 22
      const g = ctx.createLinearGradient(x - cw / 2, 0, x + cw / 2, 0)
      g.addColorStop(0, '#0b3a40')
      g.addColorStop(0.45, '#15606a')
      g.addColorStop(1, '#082a30')
      ctx.fillStyle = g
      ctx.fillRect(x - cw / 2, top, cw, H - top)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      for (let f = -6; f <= 6; f += 6) ctx.fillRect(x + f - 1, top + 6, 2, H - top)
      ctx.fillStyle = '#1a6f78'
      if (broken < 0.45) {
        // Intact capital
        ctx.fillRect(x - cw / 2 - 5, top - 6, cw + 10, 7)
        ctx.fillRect(x - cw / 2 - 2, top - 1, cw + 4, 4)
      } else {
        // Jagged broken top
        ctx.beginPath()
        ctx.moveTo(x - cw / 2, top)
        ctx.lineTo(x - 4, top - 9)
        ctx.lineTo(x + 2, top - 3)
        ctx.lineTo(x + cw / 2, top - 12)
        ctx.lineTo(x + cw / 2, top + 2)
        ctx.closePath()
        ctx.fill()
      }
      // Hanging moss
      ctx.strokeStyle = '#2f855a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x - 6, top)
      ctx.quadraticCurveTo(x - 9 + Math.sin(t + k) * 3, top + 18, x - 6, top + 30)
      ctx.stroke()
    }
  }
}

/** Steam geyser vent; h = current column height, hMax = telegraphed height, warn 0..1 while charging. */
export function drawGeyser(ctx: CanvasRenderingContext2D, x: number, wallY: number, top: boolean, h: number, hMax: number, warn: number, t: number) {
  const dir = top ? 1 : -1
  const cx = x + 12
  // Telegraph: dashed outline of where the column will reach
  if (h < hMax) {
    ctx.save()
    ctx.fillStyle = `rgba(239,68,68,${0.1 + warn * 0.12})`
    ctx.fillRect(cx - 12, top ? wallY : wallY - hMax, 24, hMax)
    ctx.strokeStyle = `rgba(248,113,113,${0.6 + Math.sin(t * 18) * 0.3})`
    ctx.lineWidth = 2.5
    ctx.setLineDash([6, 5])
    ctx.strokeRect(cx - 12, top ? wallY : wallY - hMax, 24, hMax)
    ctx.restore()
    glow(ctx, cx, wallY, 26 + warn * 18, '#f97316', 0.25 + warn * 0.4)
  }
  if (h > 1) {
    const yEnd = wallY + dir * h
    const g = ctx.createLinearGradient(0, wallY, 0, yEnd)
    g.addColorStop(0, '#fff7ed')
    g.addColorStop(0.35, '#fdba74')
    g.addColorStop(1, 'rgba(254,215,170,0.55)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(cx - 8, wallY)
    const n = 6
    for (let i = 1; i <= n; i++) {
      const k = i / n
      ctx.lineTo(cx - 8 - k * 5 + Math.sin(t * 22 + i * 1.7) * 2.5, wallY + dir * h * k)
    }
    for (let i = n; i >= 1; i--) {
      const k = i / n
      ctx.lineTo(cx + 8 + k * 5 + Math.sin(t * 19 + i * 2.3) * 2.5, wallY + dir * h * k)
    }
    ctx.lineTo(cx + 8, wallY)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.fillRect(cx - 2, Math.min(wallY, yEnd), 4, Math.abs(yEnd - wallY))
    // Puffy head
    ctx.fillStyle = 'rgba(255,237,213,0.85)'
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(cx - 8 + i * 8, yEnd + Math.sin(t * 12 + i) * 2, 7 + (i % 2) * 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  // Vent cone (sits on the wall)
  ctx.fillStyle = '#44403c'
  ctx.beginPath()
  ctx.moveTo(cx - 16, wallY - dir * 4)
  ctx.lineTo(cx - 7, wallY + dir * 9)
  ctx.lineTo(cx + 7, wallY + dir * 9)
  ctx.lineTo(cx + 16, wallY - dir * 4)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#1c1917'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = warn > 0 || h > 0 ? '#ef4444' : '#7c2d12'
  ctx.fillRect(cx - 7, wallY + dir * 7 - 1.5, 14, 3)
}

/** Small hostile sentry drone. charge 0..1 while aiming. */
export function drawDrone(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, charge: number) {
  ctx.save()
  ctx.translate(x, y + Math.sin(t * 5) * 2)
  ctx.scale(1.3, 1.3)
  // Rotor arms
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-14, -9)
  ctx.lineTo(14, -9)
  ctx.stroke()
  ctx.fillStyle = 'rgba(226,232,240,0.35)'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(s * 15, -12, 11 * Math.abs(Math.cos(t * 45 + s)), 2, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // Hull
  const g = ctx.createLinearGradient(0, -10, 0, 10)
  g.addColorStop(0, '#94a3b8')
  g.addColorStop(0.5, '#475569')
  g.addColorStop(1, '#1e293b')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-14, -6)
  ctx.lineTo(10, -8)
  ctx.lineTo(16, 0)
  ctx.lineTo(10, 8)
  ctx.lineTo(-14, 6)
  ctx.lineTo(-18, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 1.2
  ctx.stroke()
  // Hazard stripes
  ctx.fillStyle = '#facc15'
  ctx.fillRect(2, -7, 3, 14)
  ctx.fillRect(8, -6, 3, 12)
  // Gun barrel (faces left toward the player)
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(-26, -2, 10, 4)
  // Eye
  if (charge > 0) glow(ctx, -18, 0, 10 + charge * 14, '#ef4444', 0.4 + charge * 0.4)
  ctx.fillStyle = '#7f1d1d'
  ctx.beginPath()
  ctx.arc(-8, 0, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = charge > 0 ? '#fecaca' : '#f87171'
  ctx.beginPath()
  ctx.arc(-9, 0, 2.6 + charge * 1.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export function drawDart(ctx: CanvasRenderingContext2D, x: number, y: number) {
  glow(ctx, x, y, 16, '#ef4444', 0.45)
  ctx.fillStyle = '#fecaca'
  ctx.beginPath()
  ctx.moveTo(x - 10, y)
  ctx.lineTo(x + 4, y - 3.5)
  ctx.lineTo(x + 18, y)
  ctx.lineTo(x + 4, y + 3.5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ef4444'
  ctx.fillRect(x + 6, y - 1.2, 16, 2.4)
}

export function drawOrb(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  glow(ctx, x, y, 22, '#f43f5e', 0.45)
  const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 9)
  g.addColorStop(0, '#fff1f2')
  g.addColorStop(0.45, '#fb7185')
  g.addColorStop(1, '#9f1239')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#fecdd3'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(x, y, 12, t * 8, t * 8 + 1.6)
  ctx.stroke()
}

/** The Sentinel: armored hover-pod boss with a tracking eye. heat 0..1 grows as it overheats. */
export function drawSentinel(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, look: number, charge: number, heat: number) {
  ctx.save()
  ctx.translate(x, y)
  // Twin rotors
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-30, -30)
  ctx.lineTo(-20, -22)
  ctx.moveTo(30, -30)
  ctx.lineTo(20, -22)
  ctx.stroke()
  for (const s of [-1, 1]) {
    ctx.fillStyle = 'rgba(203,213,225,0.25)'
    ctx.beginPath()
    ctx.ellipse(s * 32, -33, 26, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    const bl = Math.cos(t * 55 + s) * 26
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.moveTo(s * 32 - bl, -33)
    ctx.lineTo(s * 32 + bl, -33)
    ctx.stroke()
  }
  // Heat glow behind hull
  glow(ctx, 0, 0, 70, heat > 0.6 ? '#f97316' : '#ef4444', 0.15 + heat * 0.3)
  // Armored octagon hull
  const g = ctx.createLinearGradient(0, -36, 0, 36)
  g.addColorStop(0, '#64748b')
  g.addColorStop(0.45, '#334155')
  g.addColorStop(1, '#0f172a')
  ctx.fillStyle = g
  ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8
    const px = Math.cos(a) * 38
    const py = Math.sin(a) * 34
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#020617'
  ctx.lineWidth = 2
  ctx.stroke()
  // Rim light
  ctx.strokeStyle = 'rgba(226,232,240,0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, 32, Math.PI * 1.15, Math.PI * 1.7)
  ctx.stroke()
  // Rivets and spikes
  ctx.fillStyle = '#94a3b8'
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(Math.cos(a) * 29, Math.sin(a) * 26, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#b91c1c'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(-10, s * 32)
    ctx.lineTo(0, s * 46)
    ctx.lineTo(10, s * 32)
    ctx.fill()
  }
  // Heat cracks
  if (heat > 0.3) {
    ctx.strokeStyle = heat > 0.7 ? '#fde047' : '#fb923c'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(22, -18)
    ctx.lineTo(16, -8)
    ctx.lineTo(24, 0)
    if (heat > 0.6) {
      ctx.moveTo(-20, 16)
      ctx.lineTo(-12, 10)
      ctx.lineTo(-16, 2)
    }
    ctx.stroke()
  }
  // Eye socket
  ctx.fillStyle = '#020617'
  ctx.beginPath()
  ctx.arc(-4, 0, 19, 0, Math.PI * 2)
  ctx.fill()
  const ex = -4 + Math.cos(look) * 6
  const ey = Math.sin(look) * 6
  if (charge > 0) glow(ctx, ex, ey, 24 + charge * 26, '#ef4444', 0.5 + charge * 0.4)
  const eg = ctx.createRadialGradient(ex, ey, 1, ex, ey, 13)
  eg.addColorStop(0, '#fff1f2')
  eg.addColorStop(0.35, '#f87171')
  eg.addColorStop(1, '#7f1d1d')
  ctx.fillStyle = eg
  ctx.beginPath()
  ctx.arc(ex, ey, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1c0a0a'
  ctx.beginPath()
  ctx.ellipse(ex + Math.cos(look) * 3, ey + Math.sin(look) * 3, 3, 6 - charge * 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.beginPath()
  ctx.arc(ex - 4, ey - 5, 2.4, 0, Math.PI * 2)
  ctx.fill()
  // Armored brow (angry)
  ctx.fillStyle = '#475569'
  ctx.beginPath()
  ctx.moveTo(-26, -20)
  ctx.lineTo(16, -12)
  ctx.lineTo(14, -6)
  ctx.lineTo(-24, -13)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** Floating shield-bubble power-up. */
export function drawShieldPick(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const by = y + Math.sin(t * 3) * 3
  glow(ctx, x, by, 30, '#38bdf8', 0.45)
  const g = ctx.createRadialGradient(x - 4, by - 5, 1, x, by, 14)
  g.addColorStop(0, 'rgba(240,249,255,0.95)')
  g.addColorStop(0.5, 'rgba(56,189,248,0.55)')
  g.addColorStop(1, 'rgba(14,116,144,0.85)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, by, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#e0f2fe'
  ctx.lineWidth = 2
  ctx.stroke()
  // Shield emblem
  ctx.fillStyle = '#0c4a6e'
  ctx.beginPath()
  ctx.moveTo(x, by - 7)
  ctx.lineTo(x + 6, by - 4.5)
  ctx.quadraticCurveTo(x + 6, by + 4, x, by + 8)
  ctx.quadraticCurveTo(x - 6, by + 4, x - 6, by - 4.5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#7dd3fc'
  ctx.fillRect(x - 1, by - 4, 2, 9)
  // Orbiting sparkle
  const a = t * 4
  ctx.fillStyle = '#fff'
  ctx.fillRect(x + Math.cos(a) * 18 - 1.5, by + Math.sin(a) * 18 - 1.5, 3, 3)
}
