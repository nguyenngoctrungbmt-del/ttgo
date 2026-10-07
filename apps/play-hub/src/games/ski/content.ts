/** Late-run content art for Slope Ski: rolling snowballs, crevasses, avalanche, boost orb, biome ambience. */

const TAU = Math.PI * 2
let boostCache: HTMLCanvasElement | null = null

/** Giant rolling snowball with a carried rock and spin stripes. */
export function drawSnowball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, roll: number) {
  ctx.fillStyle = 'rgba(70,100,150,0.3)'
  ctx.beginPath()
  ctx.ellipse(x + r * 0.25, y + r * 0.15, r * 1.05, r * 0.32, 0, 0, TAU)
  ctx.fill()
  const cy = y - r * 0.8
  const g = ctx.createRadialGradient(x - r * 0.35, cy - r * 0.4, r * 0.1, x, cy, r)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(0.65, '#e2e8f0')
  g.addColorStop(1, '#94a3b8')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, cy, r, 0, TAU)
  ctx.fill()
  // rolling clumps: positions rotate with the roll angle
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, cy, r, 0, TAU)
  ctx.clip()
  for (let i = 0; i < 5; i++) {
    const a = roll + i * 1.26
    const px = x + Math.cos(a) * r * 0.62
    const py = cy + Math.sin(i * 1.7) * r * 0.45
    const vis = Math.sin(a)
    if (vis < -0.1) continue
    ctx.fillStyle = i === 2 ? '#64748b' : 'rgba(148,163,184,0.55)'
    ctx.beginPath()
    ctx.ellipse(px, py, r * 0.16 * (0.4 + vis * 0.6), r * 0.14, 0, 0, TAU)
    ctx.fill()
  }
  // a pine branch stuck in it
  const ba = roll + 3.3
  if (Math.sin(ba) > 0) {
    const bx = x + Math.cos(ba) * r * 0.5
    ctx.strokeStyle = '#7c4a21'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(bx, cy - r * 0.15)
    ctx.lineTo(bx + 6, cy - r * 0.45)
    ctx.stroke()
    ctx.fillStyle = '#1f5135'
    ctx.beginPath()
    ctx.ellipse(bx + 6, cy - r * 0.48, 5, 3, -0.6, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
  ctx.strokeStyle = 'rgba(71,85,105,0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, cy, r - 1, 0.2, 1.5)
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath()
  ctx.ellipse(x - r * 0.38, cy - r * 0.42, r * 0.22, r * 0.12, -0.6, 0, TAU)
  ctx.fill()
}

/** Telegraph for a snowball about to roll in: pulsing edge marker + dashed path. */
export function drawRollWarn(ctx: CanvasRenderingContext2D, ex: number, ey: number, dx: number, dy: number, side: number, k: number, t: number, W: number) {
  const pulse = 0.55 + Math.sin(t * 14) * 0.45
  ctx.save()
  ctx.globalAlpha = 0.35 + 0.4 * k
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 3
  ctx.setLineDash([10, 9])
  ctx.lineDashOffset = -t * 60
  ctx.beginPath()
  ctx.moveTo(ex, ey)
  ctx.lineTo(ex + dx * W * 1.4, ey + dy * W * 1.4)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = pulse
  const ix = side < 0 ? 26 : W - 26
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.moveTo(ix - side * 14, ey)
  ctx.lineTo(ix + side * 10, ey - 16)
  ctx.lineTo(ix + side * 10, ey + 16)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = "900 15px 'Plus Jakarta Sans', system-ui, sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('!', ix + side * 3, ey + 1)
  ctx.textBaseline = 'alphabetic'
  ctx.restore()
}

/** Ice crevasse. `open` 0 = hairline crack (telegraph), 1 = fully open chasm. */
export function drawCrevasse(ctx: CanvasRenderingContext2D, x: number, y: number, half: number, open: number, seed: number) {
  const n = 9
  const hgt = 3 + open * 13
  // jagged top & bottom edges
  ctx.beginPath()
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const px = x - half + u * half * 2
    const taper = Math.sin(u * Math.PI)
    const j = Math.sin(seed * 7 + i * 2.3) * 3
    ctx.lineTo(px, y - hgt * taper + j * taper)
  }
  for (let i = n; i >= 0; i--) {
    const u = i / n
    const px = x - half + u * half * 2
    const taper = Math.sin(u * Math.PI)
    const j = Math.sin(seed * 5 + i * 1.9) * 3
    ctx.lineTo(px, y + hgt * taper * 0.7 + j * taper)
  }
  ctx.closePath()
  if (open < 0.08) {
    ctx.strokeStyle = 'rgba(30,64,120,0.55)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    return
  }
  const g = ctx.createLinearGradient(0, y - hgt, 0, y + hgt)
  g.addColorStop(0, '#e0f2fe')
  g.addColorStop(0.3, '#38bdf8')
  g.addColorStop(0.65, '#0c4a6e')
  g.addColorStop(1, '#082f49')
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // hairline fractures running out from both ends
  ctx.strokeStyle = 'rgba(30,64,120,0.5)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  for (const s of [-1, 1]) {
    const ex = x + s * half
    ctx.moveTo(ex, y)
    ctx.lineTo(ex + s * 12, y - 3 + Math.sin(seed) * 3)
    ctx.lineTo(ex + s * 22, y + 2)
    ctx.moveTo(ex + s * 12, y - 3 + Math.sin(seed) * 3)
    ctx.lineTo(ex + s * 18, y - 9)
  }
  ctx.stroke()
  // warning glint along the lip while opening
  if (open < 1) {
    ctx.strokeStyle = `rgba(239,68,68,${0.6 * (1 - open)})`
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x - half, y)
    ctx.lineTo(x + half, y)
    ctx.stroke()
  }
}

/** Boost orb: cyan crystal with a lightning bolt. */
export function boostSprite() {
  if (boostCache) return boostCache
  const S = 2
  const c = document.createElement('canvas')
  c.width = 44 * S
  c.height = 44 * S
  const g = c.getContext('2d')!
  g.scale(S, S)
  g.translate(22, 22)
  const halo = g.createRadialGradient(0, 0, 4, 0, 0, 21)
  halo.addColorStop(0, 'rgba(103,232,249,0.55)')
  halo.addColorStop(1, 'rgba(103,232,249,0)')
  g.fillStyle = halo
  g.beginPath()
  g.arc(0, 0, 21, 0, TAU)
  g.fill()
  g.fillStyle = '#0e7490'
  g.beginPath()
  g.arc(0, 1.2, 12, 0, TAU)
  g.fill()
  const gr = g.createRadialGradient(-4, -4, 1, 0, 0, 12)
  gr.addColorStop(0, '#ecfeff')
  gr.addColorStop(0.5, '#22d3ee')
  gr.addColorStop(1, '#0891b2')
  g.fillStyle = gr
  g.beginPath()
  g.arc(0, 0, 12, 0, TAU)
  g.fill()
  g.fillStyle = '#fef08a'
  g.strokeStyle = '#a16207'
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(2, -9)
  g.lineTo(-5, 1)
  g.lineTo(-0.5, 1)
  g.lineTo(-2.5, 9)
  g.lineTo(5, -2)
  g.lineTo(0.5, -2)
  g.closePath()
  g.fill()
  g.stroke()
  g.fillStyle = 'rgba(255,255,255,0.8)'
  g.beginPath()
  g.ellipse(-5, -6, 3, 1.6, -0.7, 0, TAU)
  g.fill()
  boostCache = c
  return c
}

export function drawBoost(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const bob = Math.sin(t * 4 + x) * 3
  ctx.fillStyle = 'rgba(14,116,144,0.22)'
  ctx.beginPath()
  ctx.ellipse(x, y + 4, 10, 3, 0, 0, TAU)
  ctx.fill()
  ctx.drawImage(boostSprite(), x - 22, y - 30 + bob, 44, 44)
}

/** Avalanche front: tumbling snow wall rolling down from the top. `sy` = screen y of the front edge. */
export function drawAvalanche(ctx: CanvasRenderingContext2D, sy: number, W: number, t: number) {
  if (sy < -40) return
  // cast shadow on the snow just ahead of the front
  const sh = ctx.createLinearGradient(0, sy, 0, sy + 46)
  sh.addColorStop(0, 'rgba(30,41,59,0.38)')
  sh.addColorStop(1, 'rgba(30,41,59,0)')
  ctx.fillStyle = sh
  ctx.fillRect(0, sy, W, 46)
  const g = ctx.createLinearGradient(0, sy - 180, 0, sy + 10)
  g.addColorStop(0, 'rgba(71,85,105,0.95)')
  g.addColorStop(0.55, 'rgba(148,163,184,0.97)')
  g.addColorStop(0.85, 'rgba(226,232,240,1)')
  g.addColorStop(1, 'rgba(255,255,255,1)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, -10)
  ctx.lineTo(0, sy)
  const step = 26
  for (let x = 0; x <= W + step; x += step) {
    const bump = Math.sin(x * 0.07 + t * 5) * 7 + Math.sin(x * 0.19 - t * 3) * 5
    ctx.quadraticCurveTo(x - step / 2, sy + 14 + bump, x, sy + bump * 0.4)
  }
  ctx.lineTo(W, -10)
  ctx.closePath()
  ctx.fill()
  // rolling puffs along the front
  for (let i = 0; i < 9; i++) {
    const px = ((i * 53 + t * 40 * (i % 2 ? 1 : -1)) % (W + 60) + W + 60) % (W + 60) - 30
    const r = 16 + (i % 3) * 7 + Math.sin(t * 6 + i) * 3
    const py = sy - r * 0.4 + Math.sin(t * 4 + i * 2) * 4
    ctx.fillStyle = i % 3 === 0 ? '#e2e8f0' : '#ffffff'
    ctx.beginPath()
    ctx.arc(px, py, r, 0, TAU)
    ctx.fill()
    ctx.fillStyle = 'rgba(100,116,139,0.45)'
    ctx.beginPath()
    ctx.arc(px + r * 0.3, py + r * 0.35, r * 0.55, 0, Math.PI)
    ctx.fill()
    ctx.strokeStyle = 'rgba(71,85,105,0.5)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(px, py, r, 0.15, Math.PI - 0.15)
    ctx.stroke()
  }
  // tumbling debris
  for (let i = 0; i < 6; i++) {
    const px = (i * 71 + t * 30) % W
    const py = sy - 30 - ((i * 37 + t * 90) % 90)
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(t * 4 + i)
    ctx.fillStyle = i % 2 ? '#64748b' : '#7c4a21'
    ctx.fillRect(-4, -3, 8, 6)
    ctx.restore()
  }
}

/** Aurora ribbons drawn over the top of the screen (screen space, additive). */
export function drawAurora(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, camY: number) {
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  const bands = [
    { c0: 'rgba(52,211,153,0.28)', y: 0.08, amp: 26, f: 0.012, sp: 0.6 },
    { c0: 'rgba(167,139,250,0.24)', y: 0.17, amp: 20, f: 0.017, sp: -0.45 },
    { c0: 'rgba(45,212,191,0.18)', y: 0.28, amp: 30, f: 0.009, sp: 0.3 },
  ]
  const par = (camY * 0.02) % 1000
  for (const b of bands) {
    const by = H * b.y
    const g = ctx.createLinearGradient(0, by - 40, 0, by + 70)
    g.addColorStop(0, 'rgba(0,0,0,0)')
    g.addColorStop(0.35, b.c0)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, by + 70)
    for (let x = 0; x <= W; x += 24) ctx.lineTo(x, by + Math.sin(x * b.f + t * b.sp + par) * b.amp - 30)
    ctx.lineTo(W, by + 70)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** Blizzard: horizontal gust streaks + whiteout fog at the top and bottom. */
export function drawBlizzard(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, wind: number) {
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  for (let i = 0; i < 14; i++) {
    const y = ((i * 97 + t * 30) % (H + 40)) - 20
    const len = 30 + (i % 4) * 16
    const x = (((i * 131 + t * 420 * Math.sign(wind || 1)) % (W + 120)) + W + 120) % (W + 120) - 60
    ctx.moveTo(x, y)
    ctx.lineTo(x - len * Math.sign(wind || 1), y + 3)
  }
  ctx.stroke()
  const k = 0.25 + Math.abs(wind) * 0.15
  const top = ctx.createLinearGradient(0, 0, 0, H * 0.22)
  top.addColorStop(0, `rgba(241,245,249,${k + 0.2})`)
  top.addColorStop(1, 'rgba(241,245,249,0)')
  ctx.fillStyle = top
  ctx.fillRect(0, 0, W, H * 0.22)
  const bot = ctx.createLinearGradient(0, H * 0.8, 0, H)
  bot.addColorStop(0, 'rgba(241,245,249,0)')
  bot.addColorStop(1, `rgba(241,245,249,${k})`)
  ctx.fillStyle = bot
  ctx.fillRect(0, H * 0.8, W, H * 0.2)
}

/** Distance checkpoint arch across the slope. */
export function drawCheckpoint(ctx: CanvasRenderingContext2D, sy: number, W: number, label: string, t: number) {
  const l = 18
  const r = W - 18
  ctx.fillStyle = 'rgba(70,100,150,0.22)'
  ctx.fillRect(l, sy + 2, r - l, 5)
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(l, sy)
  ctx.lineTo(l, sy - 46)
  ctx.moveTo(r, sy)
  ctx.lineTo(r, sy - 46)
  ctx.stroke()
  // checkered banner with a slight sway
  const sway = Math.sin(t * 3) * 2
  const bw = Math.min(170, W * 0.5)
  const bx = W / 2 - bw / 2
  const by = sy - 50 + sway
  ctx.strokeStyle = 'rgba(51,65,85,0.6)'
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(l, sy - 44)
  ctx.lineTo(bx, by + 6)
  ctx.moveTo(r, sy - 44)
  ctx.lineTo(bx + bw, by + 6)
  ctx.stroke()
  ctx.fillStyle = '#1e3a8a'
  ctx.beginPath()
  ctx.roundRect(bx, by - 6, bw, 26, 6)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(bx + 4 + i * 5, by - 2 + (i % 2) * 5, 5, 5)
    ctx.fillRect(bx + bw - 34 + i * 5, by - 2 + (i % 2) * 5, 5, 5)
  }
  ctx.fillStyle = '#fde047'
  ctx.font = "900 14px 'Plus Jakarta Sans', system-ui, sans-serif"
  ctx.textAlign = 'center'
  ctx.fillText(label, W / 2, by + 12)
}

function h1(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** Mid-ground layer painted on the snow: wind-carved drifts (blizzard) or aurora reflections (aurora). */
export function drawGroundLayer(ctx: CanvasRenderingContext2D, kind: 'aurora' | 'blizzard', W: number, H: number, camY: number, camX: number, t: number) {
  const ROW = 150
  const par = 0.85
  const cy = camY * par
  const r0 = Math.floor(cy / ROW) - 1
  for (let r = r0; r < r0 + Math.ceil(H / ROW) + 3; r++) {
    const sy = r * ROW - cy
    for (let k = 0; k < 2; k++) {
      const hx = h1(r * 3 + k)
      const sx = (((hx * 900 - camX * par) % (W + 200)) + W + 200) % (W + 200) - 100
      if (kind === 'blizzard') {
        // long sastrugi drift with a bright crest and blue lee shadow
        const len = 70 + h1(r + k * 9) * 90
        ctx.fillStyle = 'rgba(148,163,184,0.16)'
        ctx.beginPath()
        ctx.ellipse(sx + 6, sy + 6, len, 9, -0.08, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.beginPath()
        ctx.ellipse(sx, sy, len * 0.9, 4, -0.08, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const pulse = 0.5 + Math.sin(t * 0.8 + r + k * 2) * 0.5
        ctx.fillStyle = k ? `rgba(167,139,250,${0.1 + pulse * 0.08})` : `rgba(52,211,153,${0.1 + pulse * 0.1})`
        ctx.beginPath()
        ctx.ellipse(sx, sy, 90 + hx * 60, 22, 0.05, 0, Math.PI * 2)
        ctx.fill()
        // tiny star glints frozen in the snow
        ctx.fillStyle = 'rgba(236,253,245,0.9)'
        const gx = sx + (h1(r * 7 + k) - 0.5) * 120
        const gy = sy + (h1(r * 11 + k) - 0.5) * 60
        const tw = 1 + Math.abs(Math.sin(t * 3 + r * 5 + k)) * 1.6
        ctx.fillRect(gx - tw, gy - 0.6, tw * 2, 1.2)
        ctx.fillRect(gx - 0.6, gy - tw, 1.2, tw * 2)
      }
    }
  }
}
