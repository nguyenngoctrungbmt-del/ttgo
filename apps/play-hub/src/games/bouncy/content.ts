// Art for the later-run content: storm/aurora layers, hazards, the Goo King boss and pickups.
import { glow } from '../../shared/action/fx'

const TAU = Math.PI * 2

// ── Ambient biome layers ───────────────────────────────────

/** Thunderstorm: dark cloud banks, slanted rain and a distant flash. */
export function drawStormLayer(ctx: CanvasRenderingContext2D, W: number, H: number, cam: number, t: number, k: number, flash: number, boltX: number) {
  if (k <= 0.01) return
  // Distant flash lights the whole sky
  if (flash > 0) {
    ctx.globalAlpha = k * flash * 0.35
    ctx.fillStyle = '#e0e7ff'
    ctx.fillRect(0, 0, W, H)
    // Far forked bolt
    ctx.globalAlpha = k * flash
    ctx.strokeStyle = '#eef2ff'
    ctx.lineWidth = 2
    ctx.beginPath()
    let x = boltX
    ctx.moveTo(x, 0)
    for (let i = 1; i <= 7; i++) {
      x += Math.sin(boltX * 0.37 + i * 2.1) * 16
      ctx.lineTo(x, i * H * 0.07)
    }
    ctx.stroke()
  }
  // Cloud banks (two parallax rows)
  for (let row = 0; row < 2; row++) {
    const par = row ? 0.22 : 0.12
    const span = H * 1.3
    const base = ((((row * 377 - cam * par) % span) + span) % span) - H * 0.15
    ctx.globalAlpha = k * (row ? 0.55 : 0.4)
    const g = ctx.createLinearGradient(0, base - 30, 0, base + 90)
    g.addColorStop(0, row ? 'rgba(51,65,85,1)' : 'rgba(71,85,105,1)')
    g.addColorStop(1, row ? 'rgba(51,65,85,0)' : 'rgba(71,85,105,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-20, base + 90)
    for (let x = -20; x <= W + 40; x += 36) {
      const bump = 18 + Math.abs(Math.sin(x * 0.031 + row * 2)) * 22
      ctx.arc(x, base, bump, Math.PI, 0)
    }
    ctx.lineTo(W + 40, base + 90)
    ctx.closePath()
    ctx.fill()
  }
  // Rain
  ctx.globalAlpha = k * 0.4
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  for (let i = 0; i < 46; i++) {
    const sp = 620 + (i % 5) * 70
    const x = (((i * 53.7 + t * 90) % (W + 40)) + W + 40) % (W + 40) - 20
    const y = (((i * 97.1 + t * sp) % (H + 40)) + H + 40) % (H + 40) - 20
    ctx.moveTo(x, y)
    ctx.lineTo(x - 5, y + 16)
  }
  ctx.stroke()
  ctx.globalAlpha = 1
}

/** Aurora skies: waving light ribbons, floating ice islands and snow. */
export function drawAuroraLayer(ctx: CanvasRenderingContext2D, W: number, H: number, cam: number, t: number, k: number) {
  if (k <= 0.01) return
  const cols = [
    ['rgba(52,211,153,0)', 'rgba(52,211,153,0.55)'],
    ['rgba(34,211,238,0)', 'rgba(34,211,238,0.45)'],
    ['rgba(192,132,252,0)', 'rgba(192,132,252,0.4)'],
  ]
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 3; i++) {
    const by = H * (0.12 + i * 0.13) + Math.sin(t * 0.3 + i) * 12
    const g = ctx.createLinearGradient(0, by - 30, 0, by + 70)
    g.addColorStop(0, cols[i][0])
    g.addColorStop(0.35, cols[i][1])
    g.addColorStop(1, cols[i][0])
    ctx.globalAlpha = k * (0.65 + Math.sin(t * 0.8 + i * 2) * 0.25)
    ctx.fillStyle = g
    ctx.beginPath()
    for (let x = -10; x <= W + 10; x += 20) ctx.lineTo(x, by - 20 + Math.sin(x * 0.012 + t * 0.6 + i * 1.7) * 22)
    for (let x = W + 10; x >= -10; x -= 20) ctx.lineTo(x, by + 60 + Math.sin(x * 0.017 + t * 0.4 + i) * 16)
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
  // Floating ice islands far behind
  for (let i = 0; i < 3; i++) {
    const span = H * 1.5
    const y = ((((i * 311 - cam * 0.18) % span) + span) % span) - H * 0.2
    const x = ((i * 157 + 60) % (W - 60)) + 30
    const s = 0.7 + (i % 2) * 0.35
    ctx.globalAlpha = k * 0.55
    ctx.fillStyle = '#164e63'
    ctx.beginPath()
    ctx.moveTo(x - 40 * s, y)
    ctx.lineTo(x + 40 * s, y)
    ctx.lineTo(x + 12 * s, y + 34 * s)
    ctx.lineTo(x - 6 * s, y + 46 * s)
    ctx.lineTo(x - 22 * s, y + 22 * s)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#a5f3fc'
    ctx.beginPath()
    ctx.moveTo(x - 42 * s, y)
    ctx.lineTo(x - 16 * s, y - 20 * s)
    ctx.lineTo(x + 4 * s, y - 8 * s)
    ctx.lineTo(x + 20 * s, y - 26 * s)
    ctx.lineTo(x + 42 * s, y)
    ctx.closePath()
    ctx.fill()
  }
  // Snow
  ctx.globalAlpha = k * 0.85
  ctx.fillStyle = '#f0fdfa'
  ctx.beginPath()
  for (let i = 0; i < 40; i++) {
    const x = (((i * 73.3 + Math.sin(t * 0.9 + i) * 18) % W) + W) % W
    const y = (((i * 57.9 + t * (26 + (i % 5) * 9) - cam * 0.35) % H) + H) % H
    const r = 1 + (i % 3) * 0.6
    ctx.moveTo(x + r, y)
    ctx.arc(x, y, r, 0, TAU)
  }
  ctx.fill()
  ctx.globalAlpha = 1
}

// ── Hazards ────────────────────────────────────────────────

/** Grumpy thundercloud; charge 0..1 makes it crackle yellow. */
export function drawStormCloud(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, charge: number, alpha: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y + Math.sin(t * 3) * 2)
  const jit = charge > 0.6 ? Math.sin(t * 60) * 1.5 : 0
  ctx.translate(jit, 0)
  if (charge > 0) glow(ctx, 0, 6, 56, '#fde047', 0.35 * charge * alpha)
  ctx.globalAlpha = alpha
  const g = ctx.createLinearGradient(0, -24, 0, 20)
  g.addColorStop(0, '#94a3b8')
  g.addColorStop(1, '#334155')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(-22, 4, 15, 0, TAU)
  ctx.arc(-6, -8, 19, 0, TAU)
  ctx.arc(14, -4, 17, 0, TAU)
  ctx.arc(28, 6, 12, 0, TAU)
  ctx.fill()
  ctx.beginPath()
  ctx.roundRect(-36, 2, 74, 18, 9)
  ctx.fill()
  // Rim light
  ctx.strokeStyle = 'rgba(226,232,240,0.6)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(-6, -8, 17, Math.PI * 1.1, Math.PI * 1.7)
  ctx.stroke()
  // Angry face
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.ellipse(-8, 2, 5, 4.5, 0, 0, TAU)
  ctx.ellipse(10, 2, 5, 4.5, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(-7, 3, 2.3, 0, TAU)
  ctx.arc(9, 3, 2.3, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-14, -4)
  ctx.lineTo(-3, -1)
  ctx.moveTo(16, -4)
  ctx.lineTo(5, -1)
  ctx.moveTo(-3, 12)
  ctx.quadraticCurveTo(1, 9 - charge * 3, 5, 12)
  ctx.stroke()
  // Sparks while charging
  if (charge > 0.2) {
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < 3; i++) {
      const a = t * 9 + i * 2.1
      const sx = Math.cos(a) * 30
      ctx.moveTo(sx, 16)
      ctx.lineTo(sx + 4, 22)
      ctx.lineTo(sx - 2, 24)
      ctx.lineTo(sx + 3, 30)
    }
    ctx.stroke()
  }
  ctx.restore()
}

/** Telegraph column under a charging cloud. */
export function drawStrikeWarn(ctx: CanvasRenderingContext2D, x: number, y0: number, H: number, t: number, k: number) {
  const pulse = 0.5 + Math.sin(t * (10 + k * 14)) * 0.5
  ctx.save()
  ctx.globalAlpha = 0.1 + 0.18 * k + pulse * 0.08
  ctx.fillStyle = '#facc15'
  ctx.fillRect(x - 22, y0, 44, H - y0)
  ctx.globalAlpha = 0.5 + 0.4 * pulse
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.setLineDash([10, 8])
  ctx.lineDashOffset = -t * 60
  ctx.beginPath()
  ctx.moveTo(x - 22, y0)
  ctx.lineTo(x - 22, H)
  ctx.moveTo(x + 22, y0)
  ctx.lineTo(x + 22, H)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

/** Jagged lightning bolt from y0 to y1. */
export function drawBolt(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, seed: number, alpha: number) {
  ctx.save()
  glow(ctx, x, (y0 + y1) / 2, 60, '#fde047', 0.25 * alpha)
  const pts: number[] = []
  const n = 12
  for (let i = 0; i <= n; i++) {
    const off = i === 0 || i === n ? 0 : Math.sin(seed * 13.1 + i * 2.7) * 14
    pts.push(x + off, y0 + ((y1 - y0) * i) / n)
  }
  const line = () => {
    ctx.beginPath()
    ctx.moveTo(pts[0], pts[1])
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
    ctx.stroke()
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.globalAlpha = 0.55 * alpha
  ctx.strokeStyle = '#facc15'
  ctx.lineWidth = 12
  line()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#fef9c3'
  ctx.lineWidth = 5
  line()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  line()
  ctx.restore()
}

/** Warning marker at the top edge before a comet drops. */
export function drawCometWarn(ctx: CanvasRenderingContext2D, x: number, t: number, k: number) {
  const pulse = 0.6 + Math.sin(t * (12 + k * 10)) * 0.4
  ctx.save()
  ctx.globalAlpha = 0.25 + 0.2 * pulse
  ctx.strokeStyle = '#fb923c'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 10])
  ctx.beginPath()
  ctx.moveTo(x, 94)
  ctx.lineTo(x, 94 + 240 * k)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1
  ctx.translate(x, 78)
  ctx.scale(0.9 + pulse * 0.2, 0.9 + pulse * 0.2)
  ctx.fillStyle = '#ef4444'
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2.5
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(-15, -11)
  ctx.lineTo(15, -11)
  ctx.lineTo(0, 15)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.fillRect(-1.6, -7, 3.2, 9)
  ctx.beginPath()
  ctx.arc(0, 6, 1.9, 0, TAU)
  ctx.fill()
  ctx.restore()
}

/** Burning comet falling straight down. */
export function drawComet(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  const tail = ctx.createLinearGradient(0, -70, 0, 0)
  tail.addColorStop(0, 'rgba(239,68,68,0)')
  tail.addColorStop(0.6, 'rgba(249,115,22,0.6)')
  tail.addColorStop(1, 'rgba(253,224,71,0.95)')
  ctx.fillStyle = tail
  ctx.beginPath()
  ctx.moveTo(-14, 0)
  ctx.quadraticCurveTo(-8 + Math.sin(t * 30) * 3, -40, 0, -74)
  ctx.quadraticCurveTo(8 + Math.cos(t * 26) * 3, -40, 14, 0)
  ctx.closePath()
  ctx.fill()
  glow(ctx, 0, 0, 26, '#f97316', 0.5)
  ctx.rotate(t * 3)
  const g = ctx.createRadialGradient(-4, -4, 1, 0, 0, 13)
  g.addColorStop(0, '#a8a29e')
  g.addColorStop(1, '#44403c')
  ctx.fillStyle = g
  ctx.beginPath()
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU
    const r = 11 + Math.sin(i * 2.3) * 2
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#fb923c'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#292524'
  ctx.beginPath()
  ctx.arc(3, 2, 3, 0, TAU)
  ctx.arc(-4, 4, 2, 0, TAU)
  ctx.fill()
  ctx.restore()
}

// ── Boss ───────────────────────────────────────────────────

/** The Goo King: a crowned slime that spits goo. windup 0..1 opens the mouth. */
export function drawGooKing(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, windup: number, hitFlash: number, faceX: number) {
  ctx.save()
  ctx.translate(x, y)
  const wob = Math.sin(t * 5) * 0.04
  const sq = windup * 0.12
  ctx.scale(1 + wob + sq, 1 - wob - sq * 0.8)
  glow(ctx, 0, 0, 80, '#f0abfc', 0.25)
  // Body
  const g = ctx.createRadialGradient(-16, -18, 4, 0, 0, 56)
  g.addColorStop(0, hitFlash > 0 ? '#ffffff' : '#f5d0fe')
  g.addColorStop(0.5, hitFlash > 0 ? '#fae8ff' : '#c026d3')
  g.addColorStop(1, '#701a75')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-50, 24)
  ctx.bezierCurveTo(-58, -30, -26, -40, 0, -40)
  ctx.bezierCurveTo(26, -40, 58, -30, 50, 24)
  // Dripping bottom edge
  for (let i = 0; i < 5; i++) {
    const x0 = 50 - i * 20
    const drip = 8 + Math.sin(t * 3 + i * 1.7) * 4
    ctx.quadraticCurveTo(x0 - 10, 24 + drip, x0 - 20, 24)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#4a044e'
  ctx.lineWidth = 2.5
  ctx.stroke()
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.beginPath()
  ctx.ellipse(-26, -20, 9, 5, -0.6, 0, TAU)
  ctx.fill()
  // Crown
  ctx.fillStyle = '#facc15'
  ctx.strokeStyle = '#a16207'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-22, -36)
  ctx.lineTo(-24, -58)
  ctx.lineTo(-11, -46)
  ctx.lineTo(0, -64)
  ctx.lineTo(11, -46)
  ctx.lineTo(24, -58)
  ctx.lineTo(22, -36)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(0, -46, 3.5, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#22d3ee'
  ctx.beginPath()
  ctx.arc(-14, -42, 2.5, 0, TAU)
  ctx.arc(14, -42, 2.5, 0, TAU)
  ctx.fill()
  // Eyes
  const look = Math.max(-4, Math.min(4, faceX * 0.04))
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.ellipse(-17, -10, 10, 11, 0, 0, TAU)
  ctx.ellipse(17, -10, 10, 11, 0, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#1e1b4b'
  ctx.beginPath()
  ctx.arc(-17 + look, -6, 4.5, 0, TAU)
  ctx.arc(17 + look, -6, 4.5, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#4a044e'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-29, -26)
  ctx.lineTo(-8, -17)
  ctx.moveTo(29, -26)
  ctx.lineTo(8, -17)
  ctx.stroke()
  // Mouth
  ctx.fillStyle = '#3b0764'
  ctx.beginPath()
  ctx.ellipse(0, 12, 14 + windup * 4, 3 + windup * 10, 0, 0, TAU)
  ctx.fill()
  if (windup > 0.3) {
    ctx.fillStyle = '#a3e635'
    ctx.beginPath()
    ctx.arc(0, 14, windup * 7, 0, TAU)
    ctx.fill()
  }
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.moveTo(-8, 12 - 3 - windup * 9)
  ctx.lineTo(-5, 12 + 2 - windup * 6)
  ctx.lineTo(-2, 12 - 3 - windup * 9)
  ctx.moveTo(2, 12 - 3 - windup * 9)
  ctx.lineTo(5, 12 + 2 - windup * 6)
  ctx.lineTo(8, 12 - 3 - windup * 9)
  ctx.fill()
  ctx.restore()
}

export function drawGoo(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  const s = 1 + Math.sin(t * 18) * 0.08
  ctx.scale(1 / s, s)
  glow(ctx, 0, 0, 24, '#d946ef', 0.35)
  const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 12)
  g.addColorStop(0, '#fbcfe8')
  g.addColorStop(1, '#a21caf')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, -16)
  ctx.quadraticCurveTo(11, -4, 10, 4)
  ctx.arc(0, 4, 10, 0, Math.PI)
  ctx.quadraticCurveTo(-11, -4, 0, -16)
  ctx.fill()
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath()
  ctx.ellipse(-4, 0, 2, 3, -0.4, 0, TAU)
  ctx.fill()
  ctx.restore()
}

/** Boss HP bar at the top of the screen. */
export function drawBossBar(ctx: CanvasRenderingContext2D, W: number, H: number, hp: number, max: number, timeLeft: number) {
  const bw = Math.min(220, W - 120)
  const x = (W - bw) / 2
  const y = H - 40
  ctx.save()
  ctx.fillStyle = 'rgba(15,23,42,0.65)'
  ctx.beginPath()
  ctx.roundRect(x - 4, y - 4, bw + 8, 16, 8)
  ctx.fill()
  const k = Math.max(0, hp / max)
  const g = ctx.createLinearGradient(x, 0, x + bw, 0)
  g.addColorStop(0, '#f0abfc')
  g.addColorStop(1, '#c026d3')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(x, y, Math.max(6, bw * k), 8, 4)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(`GOO KING · ${Math.ceil(timeLeft)}s`, W / 2, y + 14)
  ctx.restore()
}

// ── Pickups & markers ──────────────────────────────────────

export function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save()
  ctx.translate(x, y + Math.sin(t * 3 + x) * 2.5)
  glow(ctx, 0, 0, 16, '#67e8f9', 0.45)
  const sx = 0.75 + Math.abs(Math.cos(t * 2 + x * 0.1)) * 0.25
  ctx.scale(sx, 1)
  ctx.fillStyle = '#0891b2'
  ctx.beginPath()
  ctx.moveTo(-8, -3)
  ctx.lineTo(-4, -8)
  ctx.lineTo(4, -8)
  ctx.lineTo(8, -3)
  ctx.lineTo(0, 9)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#67e8f9'
  ctx.beginPath()
  ctx.moveTo(-8, -3)
  ctx.lineTo(8, -3)
  ctx.lineTo(0, 9)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#cffafe'
  ctx.beginPath()
  ctx.moveTo(-4, -8)
  ctx.lineTo(0, -3)
  ctx.lineTo(-8, -3)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  const tw = Math.sin(t * 4 + x)
  if (tw > 0.7) {
    ctx.save()
    ctx.globalAlpha = (tw - 0.7) / 0.3
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x + 6, y - 12)
    ctx.lineTo(x + 6, y - 4)
    ctx.moveTo(x + 2, y - 8)
    ctx.lineTo(x + 10, y - 8)
    ctx.stroke()
    ctx.restore()
  }
}

function starPath(ctx: CanvasRenderingContext2D, r: number, inner: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU
    const rr = i % 2 ? inner : r
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
}

/** Super Star power-up (smiling gold star). */
export function drawSuperStar(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.sin(t * 3) * 0.2)
  const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 14)
  g.addColorStop(0, '#fef9c3')
  g.addColorStop(0.6, '#facc15')
  g.addColorStop(1, '#f59e0b')
  ctx.fillStyle = g
  starPath(ctx, 13, 6)
  ctx.fill()
  ctx.strokeStyle = '#b45309'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = '#78350f'
  ctx.beginPath()
  ctx.ellipse(-3, -1, 1.3, 2.2, 0, 0, TAU)
  ctx.ellipse(3, -1, 1.3, 2.2, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#78350f'
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.arc(0, 2, 2.6, 0.2, Math.PI - 0.2)
  ctx.stroke()
  ctx.restore()
}

/** Rainbow aura around the hero during Super Star. */
export function drawStarAura(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, k: number) {
  const hues = ['#f87171', '#fbbf24', '#4ade80', '#38bdf8', '#c084fc']
  ctx.save()
  ctx.globalAlpha = Math.min(1, k)
  ctx.lineWidth = 3
  for (let i = 0; i < hues.length; i++) {
    ctx.strokeStyle = hues[i]
    const a = t * 6 + (i / hues.length) * TAU
    ctx.beginPath()
    ctx.arc(x, y, 24, a, a + 0.9)
    ctx.stroke()
  }
  for (let i = 0; i < 4; i++) {
    const a = -t * 4 + i * 1.57
    ctx.save()
    ctx.translate(x + Math.cos(a) * 30, y + Math.sin(a) * 30)
    ctx.scale(0.35, 0.35)
    ctx.fillStyle = '#fde047'
    starPath(ctx, 13, 6)
    ctx.fill()
    ctx.restore()
  }
  ctx.restore()
}

/** Altitude flag planted at the screen edge every 250 m. */
export function drawFlag(ctx: CanvasRenderingContext2D, W: number, y: number, label: string, t: number, big: boolean) {
  const x = W - 8
  ctx.save()
  // Mirror so the pennant points inward from the right edge
  ctx.translate(x, 0)
  ctx.scale(-1, 1)
  ctx.translate(-x, 0)
  ctx.globalAlpha = 0.85
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y + 10)
  ctx.lineTo(x, y - 30)
  ctx.stroke()
  ctx.fillStyle = big ? '#f43f5e' : '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(x + 1, y - 30)
  const wv = Math.sin(t * 6 + y * 0.01) * 3
  ctx.quadraticCurveTo(x + 14, y - 30 + wv, x + 28, y - 24 + wv)
  ctx.quadraticCurveTo(x + 14, y - 18 - wv, x + 1, y - 17)
  ctx.closePath()
  ctx.fill()
  // Un-mirror for the label
  ctx.translate(x, 0)
  ctx.scale(-1, 1)
  ctx.translate(-x, 0)
  ctx.fillStyle = '#fff'
  ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x - 4, y - 6)
  ctx.restore()
}
