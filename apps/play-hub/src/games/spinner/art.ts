/** Spin Tops art: cached stadium/bowl backdrop and vector battle tops. */
import type { Top } from './SpinnerGame'

export type ArenaKind = 'classic' | 'ice' | 'bumpers' | 'spikes' | 'mini' | 'lava'

const ORDER: ArenaKind[] = ['classic', 'classic', 'ice', 'bumpers', 'classic', 'spikes', 'mini', 'ice', 'bumpers', 'classic']

export function arenaFor(match: number): ArenaKind {
  return ORDER[(match - 1) % ORDER.length]
}

const STYLE: Record<ArenaKind, { center: string; rim: string; line: string; floor: string; glow: string }> = {
  classic: { center: '#475569', rim: '#0f172a', line: 'rgba(148,163,184,0.25)', floor: '#1e1b4b', glow: '#f472b6' },
  ice: { center: '#e0f2fe', rim: '#38bdf8', line: 'rgba(255,255,255,0.55)', floor: '#0c4a6e', glow: '#7dd3fc' },
  bumpers: { center: '#6d28d9', rim: '#2e1065', line: 'rgba(196,181,253,0.3)', floor: '#1e1b4b', glow: '#a78bfa' },
  spikes: { center: '#7f1d1d', rim: '#1c0a0a', line: 'rgba(252,165,165,0.22)', floor: '#2a0a12', glow: '#ef4444' },
  mini: { center: '#b45309', rim: '#451a03', line: 'rgba(253,230,138,0.3)', floor: '#291407', glow: '#fbbf24' },
  lava: { center: '#44403c', rim: '#1c0a03', line: 'rgba(251,146,60,0.25)', floor: '#1a0802', glow: '#f97316' },
}

/** Inner edge of the lava band as a fraction of the bowl radius. */
export const LAVA_IN = 0.8

let cache: { key: string; c: HTMLCanvasElement } | null = null

export function drawArena(ctx: CanvasRenderingContext2D, W: number, H: number, cx: number, cy: number, s: number, R: number, kind: ArenaKind, t: number) {
  const dpr = ctx.getTransform().a || 1
  const key = `${kind}|${W}|${H}|${s.toFixed(3)}|${R}|${dpr}`
  if (!cache || cache.key !== key) {
    const c = document.createElement('canvas')
    c.width = Math.round(W * dpr)
    c.height = Math.round(H * dpr)
    const g = c.getContext('2d')!
    g.scale(dpr, dpr)
    paintArena(g, W, H, cx, cy, s, R, kind)
    cache = { key, c }
  }
  ctx.drawImage(cache.c, 0, 0, W, H)
  // Sweeping spotlights for a little life.
  const st = STYLE[kind]
  ctx.save()
  ctx.globalAlpha = 0.07
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 2; i++) {
    const a = Math.sin(t * 0.4 + i * 2.2) * 0.6 + (i ? Math.PI : 0)
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a - Math.PI / 2) * W, cy - H)
    ctx.lineTo(cx + Math.cos(a) * R * s * 0.8 - 40, cy + Math.sin(a) * R * s * 0.3)
    ctx.lineTo(cx + Math.cos(a) * R * s * 0.8 + 40, cy + Math.sin(a) * R * s * 0.3)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  if (kind === 'lava') {
    ctx.strokeStyle = '#fb923c'
    ctx.globalAlpha = 0.25 + Math.sin(t * 3) * 0.15
    ctx.lineWidth = 4 * s
    ctx.beginPath()
    ctx.arc(cx, cy, R * s * 0.9, t * 0.3, t * 0.3 + Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
  ctx.strokeStyle = st.glow
  ctx.globalAlpha = 0.25 + Math.sin(t * 2) * 0.1
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(cx, cy, (R + 13) * s, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
}

function paintArena(g: CanvasRenderingContext2D, W: number, H: number, cx: number, cy: number, s: number, R: number, kind: ArenaKind) {
  const st = STYLE[kind]
  const bg = g.createRadialGradient(cx, cy, R * s * 0.5, cx, cy, Math.max(W, H))
  bg.addColorStop(0, st.floor)
  bg.addColorStop(1, '#020617')
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)
  // Crowd: rows of tiny heads around the stadium.
  for (let row = 0; row < 4; row++) {
    const rr = (R + 48 + row * 18) * s
    const n = Math.floor((rr * Math.PI * 2) / 9)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + row * 0.13
      const x = cx + Math.cos(a) * rr
      const y = cy + Math.sin(a) * rr * 0.98
      if (x < -5 || x > W + 5 || y < -5 || y > H + 5) continue
      const hue = (i * 47 + row * 31) % 360
      g.fillStyle = `hsla(${hue}, 60%, ${35 + (i % 3) * 8}%, ${0.55 - row * 0.1})`
      g.beginPath()
      g.arc(x, y, 3.2 * Math.min(1.2, s * 1.3), 0, Math.PI * 2)
      g.fill()
    }
  }
  // Outer stand ring.
  g.fillStyle = '#0b1020'
  g.beginPath()
  g.arc(cx, cy, (R + 30) * s, 0, Math.PI * 2)
  g.fill()
  // Drop shadow under the bowl.
  g.fillStyle = 'rgba(0,0,0,0.45)'
  g.beginPath()
  g.arc(cx + 4, cy + 8, (R + 18) * s, 0, Math.PI * 2)
  g.fill()
  // Dish.
  const dish = g.createRadialGradient(cx - R * s * 0.25, cy - R * s * 0.3, R * s * 0.05, cx, cy, R * s)
  dish.addColorStop(0, shadeHex(st.center, 0.25))
  dish.addColorStop(0.6, st.center)
  dish.addColorStop(1, st.rim)
  g.fillStyle = dish
  g.beginPath()
  g.arc(cx, cy, R * s, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = st.line
  g.lineWidth = 1.5
  for (let k = 1; k <= 5; k++) {
    g.beginPath()
    g.arc(cx, cy, (R * s * k) / 6, 0, Math.PI * 2)
    g.stroke()
  }
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    g.beginPath()
    g.moveTo(cx + Math.cos(a) * R * s * 0.18, cy + Math.sin(a) * R * s * 0.18)
    g.lineTo(cx + Math.cos(a) * R * s * 0.95, cy + Math.sin(a) * R * s * 0.95)
    g.stroke()
  }
  // Centre emblem.
  g.fillStyle = st.line
  g.beginPath()
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2
    const rr = (k % 2 ? 9 : 22) * s
    if (k === 0) g.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
    else g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr)
  }
  g.closePath()
  g.fill()
  // Metal rim.
  const rim = g.createLinearGradient(cx - R * s, cy - R * s, cx + R * s, cy + R * s)
  rim.addColorStop(0, '#f1f5f9')
  rim.addColorStop(0.4, '#94a3b8')
  rim.addColorStop(0.6, '#e2e8f0')
  rim.addColorStop(1, '#475569')
  g.strokeStyle = rim
  g.lineWidth = 11 * s
  g.beginPath()
  g.arc(cx, cy, (R + 5) * s, 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = '#334155'
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    g.beginPath()
    g.arc(cx + Math.cos(a) * (R + 5) * s, cy + Math.sin(a) * (R + 5) * s, 1.8 * s + 0.5, 0, Math.PI * 2)
    g.fill()
  }
  if (kind === 'spikes') {
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const r0 = R * s
      const r1 = (R - 11) * s
      const wv = 0.05
      g.fillStyle = k % 2 ? '#ef4444' : '#e2e8f0'
      g.beginPath()
      g.moveTo(cx + Math.cos(a - wv) * r0, cy + Math.sin(a - wv) * r0)
      g.lineTo(cx + ca * r1, cy + sa * r1)
      g.lineTo(cx + Math.cos(a + wv) * r0, cy + Math.sin(a + wv) * r0)
      g.closePath()
      g.fill()
    }
  }
  if (kind === 'lava') {
    // Molten outer band: tops lose spin while they ride it.
    const band = g.createRadialGradient(cx, cy, R * s * LAVA_IN, cx, cy, R * s)
    band.addColorStop(0, 'rgba(249,115,22,0)')
    band.addColorStop(0.35, 'rgba(249,115,22,0.55)')
    band.addColorStop(1, 'rgba(220,38,38,0.9)')
    g.fillStyle = band
    g.beginPath()
    g.arc(cx, cy, R * s, 0, Math.PI * 2)
    g.arc(cx, cy, R * s * LAVA_IN, 0, Math.PI * 2, true)
    g.fill()
    g.strokeStyle = 'rgba(253,186,116,0.8)'
    g.lineWidth = 1.5
    g.setLineDash([6 * s, 5 * s])
    g.beginPath()
    g.arc(cx, cy, R * s * LAVA_IN, 0, Math.PI * 2)
    g.stroke()
    g.setLineDash([])
  }
  if (kind === 'ice') {
    g.strokeStyle = 'rgba(255,255,255,0.7)'
    g.lineWidth = 1.2
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9
      const r0 = R * s * (0.3 + (k % 3) * 0.2)
      g.beginPath()
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
      g.lineTo(cx + Math.cos(a + 0.15) * (r0 + 22 * s), cy + Math.sin(a + 0.15) * (r0 + 22 * s))
      g.lineTo(cx + Math.cos(a + 0.05) * (r0 + 34 * s), cy + Math.sin(a + 0.05) * (r0 + 34 * s))
      g.stroke()
    }
  }
}

function shadeHex(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const f = (c: number) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k))
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`
}

/** Non-blade attack rings: spikes, gear teeth, heavy disc or long star points. */
function drawRing(ctx: CanvasRenderingContext2D, tp: Top, r: number) {
  const n = tp.blades
  const dark = shadeHex(tp.color, -0.35)
  if (tp.shape === 'disc') {
    ctx.fillStyle = dark
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = tp.color
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = dark
    for (let b = 0; b < n; b++) {
      const a = (b / n) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8, r * 0.1, 0, Math.PI * 2)
      ctx.fill()
    }
    return
  }
  ctx.fillStyle = dark
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.74, 0, Math.PI * 2)
  ctx.fill()
  for (let b = 0; b < n; b++) {
    const a0 = (b / n) * Math.PI * 2
    ctx.save()
    ctx.rotate(a0)
    ctx.fillStyle = tp.color
    ctx.beginPath()
    if (tp.shape === 'spike') {
      ctx.moveTo(r * 0.55, -r * 0.28)
      ctx.lineTo(r * 1.12, 0)
      ctx.lineTo(r * 0.55, r * 0.28)
    } else if (tp.shape === 'gear') {
      const w = (Math.PI / n) * 0.55
      ctx.moveTo(Math.cos(-w) * r * 0.6, Math.sin(-w) * r * 0.6)
      ctx.lineTo(Math.cos(-w * 0.8) * r * 0.98, Math.sin(-w * 0.8) * r * 0.98)
      ctx.lineTo(Math.cos(w * 0.8) * r * 0.98, Math.sin(w * 0.8) * r * 0.98)
      ctx.lineTo(Math.cos(w) * r * 0.6, Math.sin(w) * r * 0.6)
    } else {
      ctx.moveTo(r * 0.5, -r * 0.12)
      ctx.quadraticCurveTo(r * 0.9, -r * 0.05, r * 1.18, r * 0.04)
      ctx.quadraticCurveTo(r * 0.9, r * 0.12, r * 0.5, r * 0.14)
    }
    ctx.closePath()
    ctx.fill()
    if (tp.boss) {
      ctx.fillStyle = tp.color2
      ctx.beginPath()
      ctx.arc(r * 0.9, 0, r * 0.06, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

export function drawTop(ctx: CanvasRenderingContext2D, tp: Top, time: number, isMe: boolean) {
  const r = tp.r
  const fall = tp.out > 0 ? tp.out / 0.6 : 1
  const topple = tp.topple > 0 ? 1 - tp.topple / 0.9 : 0
  const low = 1 - tp.spin / tp.maxSpin
  const wob = (low > 0.6 ? (low - 0.6) * 2.2 : 0) + topple * 1.2
  const ox = Math.cos(time * 9) * wob * r * 0.25
  const oy = Math.sin(time * 9) * wob * r * 0.25
  // Motion trail.
  for (let i = 0; i < tp.trail.length; i += 2) {
    const k = i / tp.trail.length
    ctx.globalAlpha = k * 0.22 * fall
    ctx.fillStyle = tp.color2
    ctx.beginPath()
    ctx.arc(tp.trail[i], tp.trail[i + 1], r * (0.4 + k * 0.5), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  if (isMe && tp.out <= 0) {
    ctx.strokeStyle = 'rgba(249,168,212,0.75)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.ellipse(tp.x, tp.y + 2, r * 1.35, r * 1.2, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.fillStyle = `rgba(0,0,0,${0.35 * fall})`
  ctx.beginPath()
  ctx.ellipse(tp.x + 4, tp.y + 6, r * 1.05 * fall, r * 0.95 * fall, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.translate(tp.x + ox, tp.y + oy)
  ctx.scale(fall, fall * (1 - topple * 0.45))
  if (tp.out > 0) ctx.globalAlpha = Math.max(0.2, fall)
  // Boss charge telegraph.
  if (tp.wave > 0) {
    const tc = tp.sigNow === 'vortex' ? '45,212,191' : tp.sigNow === 'split' ? '244,114,182' : '251,191,36'
    ctx.fillStyle = `rgba(${tc},${0.25 + (0.8 - tp.wave) * 0.6})`
    ctx.beginPath()
    ctx.arc(0, 0, r * (1.3 + (0.8 - tp.wave) * 0.8), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.save()
  ctx.rotate(tp.angle)
  // Attack ring blades.
  const n = tp.blades
  if (tp.shape && tp.shape !== 'blade') drawRing(ctx, tp, r)
  else for (let b = 0; b < n; b++) {
    const a0 = (b / n) * Math.PI * 2
    ctx.save()
    ctx.rotate(a0)
    ctx.fillStyle = shadeHex(tp.color, -0.35)
    ctx.beginPath()
    ctx.moveTo(r * 0.5, -r * 0.3)
    ctx.quadraticCurveTo(r * 1.05, -r * 0.35, r * 1.02, r * 0.12)
    ctx.lineTo(r * 0.78, r * 0.05)
    ctx.quadraticCurveTo(r * 0.72, r * 0.32, r * 0.45, r * 0.32)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = tp.color
    ctx.beginPath()
    ctx.moveTo(r * 0.5, -r * 0.24)
    ctx.quadraticCurveTo(r * 0.95, -r * 0.28, r * 0.94, r * 0.06)
    ctx.lineTo(r * 0.74, 0)
    ctx.quadraticCurveTo(r * 0.68, r * 0.24, r * 0.47, r * 0.25)
    ctx.closePath()
    ctx.fill()
    if (tp.boss) {
      ctx.fillStyle = tp.color2
      ctx.beginPath()
      ctx.moveTo(r * 0.92, -r * 0.1)
      ctx.lineTo(r * 1.22, -r * 0.02)
      ctx.lineTo(r * 0.92, r * 0.06)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
  // Motion blur ring.
  const spinK = tp.spin / tp.maxSpin
  if (spinK > 0.3) {
    ctx.globalAlpha = 0.18 + spinK * 0.15
    ctx.strokeStyle = tp.color2
    ctx.lineWidth = r * 0.35
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = tp.out > 0 ? Math.max(0.2, fall) : 1
  }
  // Metal weight disk.
  const disk = ctx.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.05, 0, 0, r * 0.62)
  disk.addColorStop(0, '#f8fafc')
  disk.addColorStop(0.6, '#94a3b8')
  disk.addColorStop(1, '#334155')
  ctx.fillStyle = disk
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1e293b'
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4
    ctx.beginPath()
    ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.06, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
  // Face chip (does not spin, so the expression reads).
  const chip = ctx.createRadialGradient(-r * 0.1, -r * 0.12, 1, 0, 0, r * 0.38)
  chip.addColorStop(0, shadeHex(tp.color2, 0.4))
  chip.addColorStop(1, tp.color2)
  ctx.fillStyle = shadeHex(tp.color, -0.4)
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = chip
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2)
  ctx.fill()
  const dizzy = low > 0.72 || topple > 0
  const angry = tp.angry > 0 || tp.dash > 0 || tp.boss
  const ex = r * 0.13
  const ey = -r * 0.03
  ctx.strokeStyle = '#0f172a'
  ctx.fillStyle = '#0f172a'
  ctx.lineWidth = Math.max(1, r * 0.06)
  ctx.lineCap = 'round'
  for (const s of [-1, 1]) {
    if (dizzy) {
      ctx.beginPath()
      ctx.moveTo(s * ex - r * 0.06, ey - r * 0.06)
      ctx.lineTo(s * ex + r * 0.06, ey + r * 0.06)
      ctx.moveTo(s * ex + r * 0.06, ey - r * 0.06)
      ctx.lineTo(s * ex - r * 0.06, ey + r * 0.06)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(s * ex, ey, r * 0.065, 0, Math.PI * 2)
      ctx.fill()
      if (angry) {
        ctx.beginPath()
        ctx.moveTo(s * ex - s * r * 0.1, ey - r * 0.15)
        ctx.lineTo(s * ex + s * r * 0.06, ey - r * 0.09)
        ctx.stroke()
      }
    }
  }
  ctx.beginPath()
  if (dizzy) ctx.arc(0, r * 0.16, r * 0.06, 0, Math.PI * 2)
  else if (angry) {
    ctx.moveTo(-r * 0.08, r * 0.16)
    ctx.lineTo(r * 0.08, r * 0.16)
  } else ctx.arc(0, r * 0.08, r * 0.09, 0.2, Math.PI - 0.2)
  ctx.stroke()
  if (tp.flash > 0) {
    ctx.globalAlpha = tp.flash * 5
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  if (tp.shield > 0) {
    ctx.globalAlpha = 0.35 + Math.sin(time * 20) * 0.1
    const sg = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.45)
    sg.addColorStop(0, 'rgba(103,232,249,0)')
    sg.addColorStop(1, 'rgba(103,232,249,0.9)')
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#ecfeff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(0, 0, r * 1.45, time * 6, time * 6 + 2)
    ctx.stroke()
  }
  ctx.restore()
  ctx.globalAlpha = 1
}
