/** Extra vector art for Wave Surfer's late-run content (biomes, hazards, kraken). */
import { sprite } from './art'

const TAU = Math.PI * 2

/** Whirlpool on the wave face. open: 0 calm ripple .. 1 fully sucking. */
export function drawWhirl(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, open: number, warn: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, 0.42)
  const r = 18 + open * 24
  const gr = ctx.createRadialGradient(0, 0, 2, 0, 0, r)
  gr.addColorStop(0, `rgba(2,6,23,${0.25 + open * 0.6})`)
  gr.addColorStop(0.6, `rgba(8,47,73,${0.2 + open * 0.35})`)
  gr.addColorStop(1, 'rgba(8,47,73,0)')
  ctx.fillStyle = gr
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, TAU)
  ctx.fill()
  // spiral arms
  ctx.lineCap = 'round'
  ctx.strokeStyle = `rgba(236,254,255,${0.35 + open * 0.5})`
  ctx.lineWidth = 2.6
  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath()
    const base = t * (2 + open * 6) + (arm * TAU) / 3
    for (let i = 0; i <= 14; i++) {
      const k = i / 14
      const a = base + k * 4.2
      const rr = 3 + k * r
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    ctx.stroke()
  }
  // telegraph ring
  if (warn > 0) {
    ctx.strokeStyle = `rgba(248,113,113,${0.5 + 0.5 * Math.sin(t * 18)})`
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 0, r + 6 + warn * 10, 0, TAU)
    ctx.stroke()
  }
  ctx.restore()
}

/** Jet-ski with rider, nose to the left (it rushes at the surfer). */
export function jetskiSprite() {
  return sprite('jetski', 70, 44, (g) => {
    // spray skirt
    g.fillStyle = 'rgba(255,255,255,0.85)'
    g.beginPath()
    g.ellipse(4, 15, 34, 4, 0, 0, TAU)
    g.fill()
    // hull
    const hull = g.createLinearGradient(0, 0, 0, 14)
    hull.addColorStop(0, '#fca5a5')
    hull.addColorStop(0.35, '#dc2626')
    hull.addColorStop(1, '#7f1d1d')
    g.fillStyle = hull
    g.beginPath()
    g.moveTo(-34, 6)
    g.quadraticCurveTo(-30, 0, -14, 0)
    g.lineTo(26, 0)
    g.quadraticCurveTo(33, 1, 33, 8)
    g.lineTo(30, 14)
    g.lineTo(-22, 14)
    g.quadraticCurveTo(-32, 12, -34, 6)
    g.fill()
    g.fillStyle = '#111827'
    g.fillRect(-14, 7, 40, 2.5)
    // seat + handlebar
    g.fillStyle = '#1f2937'
    g.beginPath()
    g.ellipse(10, -1, 13, 3.5, 0, 0, TAU)
    g.fill()
    g.strokeStyle = '#334155'
    g.lineWidth = 2.4
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(-8, 0)
    g.lineTo(-12, -11)
    g.lineTo(-16, -12)
    g.stroke()
    // rider
    g.strokeStyle = '#0f172a'
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(8, -2)
    g.lineTo(2, -18)
    g.stroke()
    g.lineWidth = 3
    g.strokeStyle = '#f0b48a'
    g.beginPath()
    g.moveTo(3, -15)
    g.lineTo(-13, -11)
    g.stroke()
    g.fillStyle = '#facc15'
    g.beginPath()
    g.arc(0, -23, 5.5, 0, TAU)
    g.fill()
    g.fillStyle = '#0f172a'
    g.fillRect(-5.5, -25, 6, 3)
    g.fillStyle = 'rgba(255,255,255,0.6)'
    g.beginPath()
    g.arc(2, -25, 1.6, 0, TAU)
    g.fill()
  })
}

/** Pelican, beak to the left. dive: 0 gliding .. 1 tucked dive. */
export function drawPelican(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, dive: number, rot = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(1.3, 1.3)
  const flap = dive > 0.5 ? 0.15 : Math.sin(t * 7)
  // wings
  ctx.fillStyle = '#cbd5e1'
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 1.5
  const span = 26 * (1 - dive * 0.6)
  ctx.beginPath()
  ctx.moveTo(-2, -2)
  ctx.quadraticCurveTo(8, -14 - flap * 10, 6 + span, -6 - flap * 16)
  ctx.quadraticCurveTo(14, -2, 8, 2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.moveTo(6 + span, -6 - flap * 16)
  ctx.lineTo(span - 2, -3 - flap * 12)
  ctx.lineTo(span + 2, -9 - flap * 14)
  ctx.closePath()
  ctx.fill()
  // body
  const bg = ctx.createLinearGradient(0, -8, 0, 8)
  bg.addColorStop(0, '#f8fafc')
  bg.addColorStop(1, '#94a3b8')
  ctx.fillStyle = bg
  ctx.beginPath()
  ctx.ellipse(6, 0, 15, 7.5, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#64748b'
  ctx.beginPath()
  ctx.moveTo(19, -2)
  ctx.lineTo(28, -5)
  ctx.lineTo(27, 3)
  ctx.closePath()
  ctx.fill()
  // head + beak with pouch
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.arc(-9, -5, 5.5, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(-12, -7)
  ctx.lineTo(-34, -3)
  ctx.lineTo(-12, -3)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#fb923c'
  ctx.beginPath()
  ctx.moveTo(-13, -3)
  ctx.quadraticCurveTo(-24, 6, -32, -2)
  ctx.lineTo(-13, -3)
  ctx.fill()
  // angry eye
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(-10, -6, 1.4, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(-13, -9.5)
  ctx.lineTo(-7, -8)
  ctx.stroke()
  ctx.restore()
}

/** Red crosshair on the face where a pelican will strike. */
export function drawReticle(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, k: number) {
  const r = 22 - k * 8
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(t * 2)
  ctx.strokeStyle = `rgba(239,68,68,${0.55 + 0.4 * Math.sin(t * 16)})`
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, TAU)
  ctx.stroke()
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    ctx.moveTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6))
    ctx.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6))
  }
  ctx.stroke()
  ctx.restore()
}

/** Warning chevron at the screen edge for incoming jet-skis. */
export function drawEdgeWarn(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const a = 0.6 + 0.4 * Math.sin(t * 20)
  ctx.save()
  ctx.translate(x, y)
  ctx.globalAlpha = a
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.moveTo(-16, 0)
  ctx.lineTo(4, -15)
  ctx.lineTo(4, 15)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.fillRect(-2.5, -7, 3, 8)
  ctx.fillRect(-2.5, 3, 3, 3)
  ctx.restore()
}

/** Kraken tentacle growing up from the face. len in px, k 0..1 extension. */
export function drawTentacle(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, t: number, seed: number) {
  if (len < 2) return
  const segs = 10
  const pts: number[] = []
  for (let i = 0; i <= segs; i++) {
    const k = i / segs
    pts.push(x + Math.sin(t * 3 + seed + k * 3) * 10 * k + k * k * 10, y - k * len)
  }
  // body: taper from 13 to 3
  ctx.fillStyle = '#7e22ce'
  ctx.beginPath()
  for (let i = 0; i <= segs; i++) {
    const w = 13 - (i / segs) * 10
    ctx.lineTo(pts[i * 2] - w, pts[i * 2 + 1])
  }
  for (let i = segs; i >= 0; i--) {
    const w = 13 - (i / segs) * 10
    ctx.lineTo(pts[i * 2] + w, pts[i * 2 + 1])
  }
  ctx.closePath()
  ctx.fill()
  // lighter belly with suckers
  ctx.fillStyle = '#c084fc'
  ctx.beginPath()
  for (let i = 0; i <= segs; i++) {
    const w = 6 - (i / segs) * 5
    ctx.lineTo(pts[i * 2] + w * 0.4, pts[i * 2 + 1])
  }
  for (let i = segs; i >= 0; i--) {
    const w = 13 - (i / segs) * 10
    ctx.lineTo(pts[i * 2] + w, pts[i * 2 + 1])
  }
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f5d0fe'
  for (let i = 1; i < segs; i += 2) {
    const w = 13 - (i / segs) * 10
    ctx.beginPath()
    ctx.arc(pts[i * 2] + w * 0.65, pts[i * 2 + 1], Math.max(1.2, w * 0.28), 0, TAU)
    ctx.fill()
  }
  // rim light
  ctx.strokeStyle = 'rgba(233,213,255,0.6)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  for (let i = 0; i <= segs; i++) {
    const w = 13 - (i / segs) * 10
    ctx.lineTo(pts[i * 2] - w + 1.5, pts[i * 2 + 1])
  }
  ctx.stroke()
  // foam collar
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath()
  ctx.ellipse(x, y + 2, 20, 5, 0, 0, TAU)
  ctx.fill()
}

/** Telegraph for a tentacle: churning dark patch + the column it will fill. */
export function drawTentacleWarn(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, t: number, k: number) {
  ctx.save()
  ctx.fillStyle = `rgba(59,7,100,${0.25 + k * 0.35})`
  ctx.beginPath()
  ctx.ellipse(x, y, 18 + k * 6, 7, 0, 0, TAU)
  ctx.fill()
  ctx.setLineDash([5, 6])
  ctx.lineDashOffset = -t * 30
  ctx.fillStyle = `rgba(239,68,68,${0.08 + k * 0.14})`
  ctx.fillRect(x - 13, y - len, 26, len)
  ctx.strokeStyle = `rgba(254,202,202,${0.6 + 0.35 * Math.sin(t * 14)})`
  ctx.lineWidth = 2.5
  ctx.strokeRect(x - 13, y - len, 26, len)
  ctx.setLineDash([])
  ctx.fillStyle = 'rgba(233,213,255,0.85)'
  for (let i = 0; i < 4; i++) {
    const ph = (t * 1.8 + i * 0.25) % 1
    ctx.beginPath()
    ctx.arc(x - 10 + i * 7, y - ph * 18, 2 + (i % 2), 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

/** Kraken head rising out of the sea behind the wave. rise 0..1. */
export function drawKraken(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, rise: number) {
  if (rise <= 0) return
  ctx.save()
  ctx.translate(x, y + (1 - rise) * 120 * s)
  ctx.scale(s, s)
  // background tentacles
  ctx.strokeStyle = '#581c87'
  ctx.lineCap = 'round'
  for (let i = 0; i < 4; i++) {
    const side = i < 2 ? -1 : 1
    const ox = side * (34 + (i % 2) * 22)
    ctx.lineWidth = 12 - (i % 2) * 3
    ctx.beginPath()
    ctx.moveTo(ox, 30)
    ctx.quadraticCurveTo(ox + side * 30, -20 + Math.sin(t * 2 + i) * 14, ox + side * (18 + Math.sin(t * 1.6 + i) * 14), -60 - (i % 2) * 14)
    ctx.stroke()
  }
  // mantle
  const gr = ctx.createRadialGradient(-12, -40, 6, 0, -10, 70)
  gr.addColorStop(0, '#c084fc')
  gr.addColorStop(0.5, '#7e22ce')
  gr.addColorStop(1, '#3b0764')
  ctx.fillStyle = gr
  ctx.beginPath()
  ctx.moveTo(-46, 34)
  ctx.quadraticCurveTo(-56, -40, 0, -78)
  ctx.quadraticCurveTo(56, -40, 46, 34)
  ctx.closePath()
  ctx.fill()
  // spots
  ctx.fillStyle = 'rgba(233,213,255,0.35)'
  ctx.beginPath()
  ctx.arc(-16, -50, 6, 0, TAU)
  ctx.arc(14, -58, 4, 0, TAU)
  ctx.arc(22, -36, 5, 0, TAU)
  ctx.fill()
  // eyes with blink
  const blink = Math.sin(t * 0.9) > 0.97 ? 0.15 : 1
  for (const ex of [-20, 20]) {
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.ellipse(ex, -8, 11, 9 * blink, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.ellipse(ex - 3, -8, 2.6, 7 * blink, 0, 0, TAU)
    ctx.fill()
    // angry brow
    ctx.strokeStyle = '#3b0764'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(ex - Math.sign(ex) * 12, -24)
    ctx.lineTo(ex + Math.sign(ex) * 10, -17)
    ctx.stroke()
  }
  ctx.restore()
}

export function pearlSprite() {
  return sprite('pearl', 24, 24, (g) => {
    const halo = g.createRadialGradient(0, 0, 4, 0, 0, 12)
    halo.addColorStop(0, 'rgba(244,114,182,0.5)')
    halo.addColorStop(1, 'rgba(244,114,182,0)')
    g.fillStyle = halo
    g.fillRect(-12, -12, 24, 24)
    const gr = g.createRadialGradient(-2.5, -3, 1, 0, 0, 8)
    gr.addColorStop(0, '#ffffff')
    gr.addColorStop(0.5, '#fce7f3')
    gr.addColorStop(0.85, '#c4b5fd')
    gr.addColorStop(1, '#a78bfa')
    g.fillStyle = gr
    g.beginPath()
    g.arc(0, 0, 7.5, 0, TAU)
    g.fill()
    g.fillStyle = '#ffffff'
    g.beginPath()
    g.ellipse(-2.5, -3, 2.2, 1.4, -0.6, 0, TAU)
    g.fill()
  })
}

/** Distant iceberg (parallax background). */
export function drawBerg(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.fillStyle = '#e0f2fe'
  ctx.beginPath()
  ctx.moveTo(-60, 0)
  ctx.lineTo(-40, -30)
  ctx.lineTo(-22, -26)
  ctx.lineTo(-6, -58)
  ctx.lineTo(14, -40)
  ctx.lineTo(30, -46)
  ctx.lineTo(62, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#7dd3fc'
  ctx.beginPath()
  ctx.moveTo(-6, -58)
  ctx.lineTo(14, -40)
  ctx.lineTo(30, -46)
  ctx.lineTo(62, 0)
  ctx.lineTo(4, 0)
  ctx.lineTo(8, -30)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.beginPath()
  ctx.moveTo(-40, -30)
  ctx.lineTo(-22, -26)
  ctx.lineTo(-6, -58)
  ctx.lineTo(-14, -30)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** Floating ice chunk for the foreground water. */
export function iceChunkSprite() {
  return sprite('ice', 36, 16, (g) => {
    g.fillStyle = '#bae6fd'
    g.beginPath()
    g.moveTo(-17, 4)
    g.lineTo(-12, -5)
    g.lineTo(4, -7)
    g.lineTo(16, -2)
    g.lineTo(17, 5)
    g.closePath()
    g.fill()
    g.fillStyle = '#f0f9ff'
    g.beginPath()
    g.moveTo(-12, -5)
    g.lineTo(4, -7)
    g.lineTo(0, -1)
    g.lineTo(-10, 0)
    g.closePath()
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.7)'
    g.fillRect(-17, 4, 34, 2)
  })
}

/** Volcano with a glowing crater and smoke plume. */
export function drawVolcano(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  // smoke plume
  for (let i = 0; i < 6; i++) {
    const ph = (t * 0.12 + i / 6) % 1
    ctx.fillStyle = `rgba(68,64,60,${0.5 * (1 - ph)})`
    ctx.beginPath()
    ctx.arc(6 + ph * 50 + Math.sin(i * 2 + t * 0.5) * 6, -96 - ph * 90, 12 + ph * 26, 0, TAU)
    ctx.fill()
  }
  const gr = ctx.createLinearGradient(0, -100, 0, 0)
  gr.addColorStop(0, '#292524')
  gr.addColorStop(1, '#431407')
  ctx.fillStyle = gr
  ctx.beginPath()
  ctx.moveTo(-130, 0)
  ctx.quadraticCurveTo(-50, -40, -16, -96)
  ctx.lineTo(18, -96)
  ctx.quadraticCurveTo(54, -40, 130, 0)
  ctx.closePath()
  ctx.fill()
  // crater glow + lava rivers
  const pulse = 0.75 + 0.25 * Math.sin(t * 3)
  ctx.fillStyle = `rgba(251,146,60,${pulse})`
  ctx.beginPath()
  ctx.ellipse(1, -96, 17, 4, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = `rgba(249,115,22,${0.6 * pulse})`
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-6, -94)
  ctx.quadraticCurveTo(-22, -60, -38, -28)
  ctx.moveTo(8, -94)
  ctx.quadraticCurveTo(14, -58, 34, -20)
  ctx.stroke()
  ctx.restore()
}
