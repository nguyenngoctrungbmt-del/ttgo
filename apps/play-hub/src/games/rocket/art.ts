/** Procedural vector art for Rocket Builder: rockets, hazards and pickups. */

export type Build = { engine: number; tanks: ('s' | 'l')[]; nose: number; fins: boolean; boost: number }
export type HazardKind = 'bird' | 'plane' | 'balloon' | 'jet' | 'satellite' | 'meteor'

const BODY_W = 24
const ENGINE_H = 20
const NOZZLE_H = 10
const TANK_H = { s: 24, l: 38 }
const NOSE_H = 28

export function rocketHeight(b: Build) {
  return NOZZLE_H + ENGINE_H + b.tanks.reduce((s, t) => s + TANK_H[t], 0) + (b.nose ? NOSE_H : 8)
}

type G = CanvasRenderingContext2D

function cyl(g: G, x: number, y: number, w: number, h: number, light: string, mid: string, dark: string) {
  const gr = g.createLinearGradient(x, 0, x + w, 0)
  gr.addColorStop(0, dark)
  gr.addColorStop(0.3, light)
  gr.addColorStop(0.65, mid)
  gr.addColorStop(1, dark)
  g.fillStyle = gr
  g.fillRect(x, y, w, h)
}

function flame(g: G, x: number, y: number, w: number, len: number, t: number, seed: number) {
  const fl = len * (0.85 + Math.sin(t * 38 + seed) * 0.15)
  const gr = g.createLinearGradient(0, y, 0, y + fl)
  gr.addColorStop(0, '#fff7ed')
  gr.addColorStop(0.25, '#fde047')
  gr.addColorStop(0.6, '#f97316')
  gr.addColorStop(1, 'rgba(239,68,68,0)')
  g.fillStyle = gr
  g.beginPath()
  g.moveTo(x - w / 2, y)
  g.quadraticCurveTo(x - w * 0.6, y + fl * 0.5, x, y + fl)
  g.quadraticCurveTo(x + w * 0.6, y + fl * 0.5, x + w / 2, y)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.85)'
  g.beginPath()
  g.moveTo(x - w * 0.22, y)
  g.quadraticCurveTo(x, y + fl * 0.45, x + w * 0.22, y)
  g.fill()
}

function booster(g: G, x: number, y: number, h: number, heavy: boolean, burning: boolean, t: number) {
  const w = heavy ? 13 : 11
  if (burning) flame(g, x + w / 2, y + 6, w * 0.9, 26, t, x)
  g.fillStyle = '#334155'
  g.beginPath()
  g.moveTo(x + 1, y)
  g.lineTo(x + w - 1, y)
  g.lineTo(x + w + 1, y + 7)
  g.lineTo(x - 1, y + 7)
  g.closePath()
  g.fill()
  cyl(g, x, y - h, w, h, '#f8fafc', '#e2e8f0', '#94a3b8')
  g.fillStyle = heavy ? '#7c3aed' : '#f97316'
  g.fillRect(x, y - h * 0.55, w, 4)
  g.fillStyle = heavy ? '#a78bfa' : '#fb923c'
  g.beginPath()
  g.moveTo(x, y - h)
  g.quadraticCurveTo(x + w / 2, y - h - w * 1.6, x + w, y - h)
  g.closePath()
  g.fill()
}

/** Draws the rocket with its base (bottom of the nozzle) at (x, y). */
export function drawRocket(
  g: G,
  b: Build,
  x: number,
  y: number,
  scale: number,
  o: { t: number; flame?: boolean; boostFlame?: boolean; boosters?: boolean; tilt?: number; flash?: number },
) {
  g.save()
  g.translate(x, y)
  if (o.tilt) g.rotate(o.tilt)
  g.scale(scale, scale)
  const half = BODY_W / 2
  const tier = b.engine
  // main flame
  if (o.flame) flame(g, 0, 0, 16 + tier * 3, 46 + tier * 14, o.t, 0)
  // boosters behind
  if (o.boosters && b.boost) {
    const bh = b.boost === 2 ? 64 : 52
    booster(g, -half - (b.boost === 2 ? 12 : 10), -4, bh, b.boost === 2, !!o.boostFlame, o.t)
    booster(g, half - 1, -4, bh, b.boost === 2, !!o.boostFlame, o.t + 1)
  }
  // nozzle
  g.fillStyle = tier === 2 ? '#7c3aed' : tier === 1 ? '#475569' : '#334155'
  g.beginPath()
  g.moveTo(-7, -NOZZLE_H)
  g.lineTo(7, -NOZZLE_H)
  g.lineTo(10 + tier, 0)
  g.lineTo(-10 - tier, 0)
  g.closePath()
  g.fill()
  let top = -NOZZLE_H
  // engine section
  const engCols = [
    ['#cbd5e1', '#94a3b8', '#475569'],
    ['#fde68a', '#f59e0b', '#92400e'],
    ['#c4b5fd', '#8b5cf6', '#4c1d95'],
  ][tier]
  cyl(g, -half, top - ENGINE_H, BODY_W, ENGINE_H, engCols[0], engCols[1], engCols[2])
  g.fillStyle = 'rgba(0,0,0,0.25)'
  for (let i = 0; i < 3; i++) g.fillRect(-half + 4 + i * 7, top - ENGINE_H + 5, 3, ENGINE_H - 10)
  top -= ENGINE_H
  // fins
  if (b.fins) {
    g.fillStyle = '#dc2626'
    for (const s of [-1, 1]) {
      g.beginPath()
      g.moveTo(s * half, top + 4)
      g.lineTo(s * (half + 12), top + ENGINE_H + 6)
      g.lineTo(s * (half + 12), top + ENGINE_H + 12)
      g.lineTo(s * half, top + ENGINE_H)
      g.closePath()
      g.fill()
    }
    g.fillStyle = '#b91c1c'
    g.fillRect(-1.5, top + 6, 3, ENGINE_H + 4)
  }
  // tanks
  b.tanks.forEach((tk, i) => {
    const h = TANK_H[tk]
    cyl(g, -half, top - h, BODY_W, h, '#ffffff', '#e2e8f0', '#94a3b8')
    g.fillStyle = i % 2 ? '#7c3aed' : '#ef4444'
    g.fillRect(-half, top - h * 0.62, BODY_W, tk === 'l' ? 6 : 4)
    g.fillStyle = 'rgba(15,23,42,0.35)'
    g.fillRect(-half, top - 1, BODY_W, 1.5)
    if (i === b.tanks.length - 1 && tk) {
      // porthole on the top tank
      g.fillStyle = '#334155'
      g.beginPath()
      g.arc(0, top - h * 0.3, 5.5, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#7dd3fc'
      g.beginPath()
      g.arc(0, top - h * 0.3, 4, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.7)'
      g.beginPath()
      g.arc(-1.3, top - h * 0.3 - 1.3, 1.4, 0, Math.PI * 2)
      g.fill()
    }
    top -= h
  })
  // nose
  if (b.nose) {
    const armored = b.nose === 2
    const gr = g.createLinearGradient(-half, 0, half, 0)
    gr.addColorStop(0, armored ? '#475569' : '#991b1b')
    gr.addColorStop(0.35, armored ? '#e2e8f0' : '#f87171')
    gr.addColorStop(1, armored ? '#334155' : '#7f1d1d')
    g.fillStyle = gr
    g.beginPath()
    g.moveTo(-half, top)
    g.quadraticCurveTo(-half, top - NOSE_H * 0.7, 0, top - NOSE_H)
    g.quadraticCurveTo(half, top - NOSE_H * 0.7, half, top)
    g.closePath()
    g.fill()
    if (armored) {
      g.fillStyle = '#1e293b'
      for (const [rx, ry] of [[-6, -8], [6, -8], [0, -16]]) {
        g.beginPath()
        g.arc(rx, top + ry, 1.4, 0, Math.PI * 2)
        g.fill()
      }
    }
  } else {
    g.fillStyle = '#94a3b8'
    g.beginPath()
    g.roundRect(-half, top - 8, BODY_W, 8, [6, 6, 0, 0])
    g.fill()
  }
  if (o.flash && o.flash > 0) {
    g.globalAlpha = o.flash
    g.fillStyle = '#ffffff'
    g.fillRect(-half - 14, top - NOSE_H, BODY_W + 28, -top + NOSE_H)
    g.globalAlpha = 1
  }
  g.restore()
}

export function drawHazard(g: G, kind: HazardKind, x: number, y: number, t: number, dir: number) {
  g.save()
  g.translate(x, y)
  if (dir < 0) g.scale(-1, 1)
  if (kind === 'bird') {
    const f = Math.sin(t * 14) * 0.8
    g.fillStyle = '#1e293b'
    g.beginPath()
    g.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2)
    g.fill()
    g.beginPath()
    g.moveTo(-3, -1)
    g.quadraticCurveTo(-8, -10 * f - 4, -16, -12 * f)
    g.quadraticCurveTo(-8, -2, -3, 2)
    g.fill()
    g.fillStyle = '#f59e0b'
    g.beginPath()
    g.moveTo(8, -1)
    g.lineTo(14, 1)
    g.lineTo(8, 2)
    g.fill()
    g.fillStyle = '#fff'
    g.beginPath()
    g.arc(5, -2, 1.8, 0, Math.PI * 2)
    g.fill()
  } else if (kind === 'plane' || kind === 'jet') {
    const jet = kind === 'jet'
    const body = jet ? '#64748b' : '#f8fafc'
    g.fillStyle = body
    g.beginPath()
    g.ellipse(0, 0, jet ? 26 : 30, jet ? 5 : 7, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = jet ? '#475569' : '#ef4444'
    g.beginPath()
    g.moveTo(-4, 0)
    g.lineTo(-14, jet ? 14 : 16)
    g.lineTo(-8, jet ? 14 : 16)
    g.lineTo(8, 0)
    g.closePath()
    g.fill()
    g.beginPath()
    g.moveTo(-22, 0)
    g.lineTo(-30, -12)
    g.lineTo(-25, -12)
    g.lineTo(-16, -2)
    g.closePath()
    g.fill()
    g.fillStyle = '#38bdf8'
    if (jet) {
      g.beginPath()
      g.ellipse(12, -3, 7, 3, 0, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = 'rgba(253,186,116,0.8)'
      g.beginPath()
      g.moveTo(-26, -2)
      g.lineTo(-40 - Math.sin(t * 40) * 4, 0)
      g.lineTo(-26, 2)
      g.fill()
    } else for (let i = 0; i < 5; i++) g.fillRect(-12 + i * 6, -3, 3, 3)
  } else if (kind === 'balloon') {
    const gr = g.createRadialGradient(-5, -14, 2, 0, -8, 18)
    gr.addColorStop(0, '#fecaca')
    gr.addColorStop(1, '#dc2626')
    g.fillStyle = gr
    g.beginPath()
    g.ellipse(0, -8, 14, 17, 0, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = '#475569'
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(-6, 7)
    g.lineTo(-3, 18)
    g.moveTo(6, 7)
    g.lineTo(3, 18)
    g.stroke()
    g.fillStyle = '#92400e'
    g.fillRect(-4, 18, 8, 6)
  } else if (kind === 'satellite') {
    g.rotate(t * 0.6)
    g.fillStyle = '#1d4ed8'
    g.fillRect(-30, -6, 18, 12)
    g.fillRect(12, -6, 18, 12)
    g.strokeStyle = '#93c5fd'
    g.lineWidth = 1
    for (const sx of [-30, 12]) {
      g.beginPath()
      g.moveTo(sx + 6, -6)
      g.lineTo(sx + 6, 6)
      g.moveTo(sx + 12, -6)
      g.lineTo(sx + 12, 6)
      g.stroke()
    }
    g.fillStyle = '#e2e8f0'
    g.fillRect(-12, -8, 24, 16)
    g.fillStyle = '#facc15'
    g.fillRect(-12, -2, 24, 4)
    g.strokeStyle = '#e2e8f0'
    g.beginPath()
    g.moveTo(0, -8)
    g.lineTo(0, -16)
    g.stroke()
  } else {
    // meteor with a fiery trail
    const gr = g.createLinearGradient(-40, -20, 0, 0)
    gr.addColorStop(0, 'rgba(251,146,60,0)')
    gr.addColorStop(1, 'rgba(251,146,60,0.8)')
    g.fillStyle = gr
    g.beginPath()
    g.moveTo(-6, -10)
    g.lineTo(-44, -30)
    g.lineTo(-10, 8)
    g.closePath()
    g.fill()
    g.rotate(t * 2)
    g.fillStyle = '#78716c'
    g.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const r = 12 + ((i * 37) % 5)
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    g.closePath()
    g.fill()
    g.fillStyle = '#57534e'
    g.beginPath()
    g.arc(-3, -2, 3, 0, Math.PI * 2)
    g.arc(4, 4, 2, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

export const HAZARD_R: Record<HazardKind, number> = { bird: 11, plane: 22, balloon: 15, jet: 20, satellite: 22, meteor: 13 }

export function drawCoin(g: G, x: number, y: number, t: number) {
  const sx = Math.abs(Math.cos(t * 4 + x))
  g.save()
  g.translate(x, y)
  g.scale(Math.max(0.2, sx), 1)
  const gr = g.createRadialGradient(-3, -3, 1, 0, 0, 10)
  gr.addColorStop(0, '#fef9c3')
  gr.addColorStop(0.5, '#facc15')
  gr.addColorStop(1, '#a16207')
  g.fillStyle = gr
  g.beginPath()
  g.arc(0, 0, 9, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#ca8a04'
  g.lineWidth = 1.5
  g.beginPath()
  g.arc(0, 0, 6, 0, Math.PI * 2)
  g.stroke()
  g.restore()
}

export function drawFuel(g: G, x: number, y: number) {
  g.save()
  g.translate(x, y)
  g.fillStyle = '#15803d'
  g.beginPath()
  g.roundRect(-9, -10, 18, 22, 3)
  g.fill()
  g.fillStyle = '#22c55e'
  g.beginPath()
  g.roundRect(-7, -8, 14, 18, 2)
  g.fill()
  g.fillStyle = '#14532d'
  g.fillRect(-3, -14, 8, 5)
  g.strokeStyle = '#f0fdf4'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(-4, -4)
  g.lineTo(4, 6)
  g.moveTo(4, -4)
  g.lineTo(-4, 6)
  g.stroke()
  g.restore()
}
