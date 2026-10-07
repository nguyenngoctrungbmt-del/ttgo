import { glow } from '../../shared/action/fx'

// New late-run content for Jetpack Rush: shock mines, crushers, the Sentinel boss,
// gems, EMP cells and the Magma Foundry / Cryo Vault biomes.

export type Mine = { x: number; y: number; cyc: number; bob: number; near: boolean }
export type Crusher = { x: number; top: boolean; depth: number; cyc: number; k: number; near: boolean }
export type Orb = { x: number; y: number; vx: number; vy: number }
export type Gem = { x: number; y: number; pull: boolean; t: number }
export type Cell = { x: number; y: number; t: number }
export type Boss = {
  on: boolean
  state: 'enter' | 'fight' | 'down'
  x: number
  y: number
  t: number
  hp: number
  atk: '' | 'volley'
  atkT: number
  charge: number
  aimY: number
  cellT: number
  hurt: number
  downT: number
  eyeY: number
  boomT: number
}
export type Amb = { x: number; y: number; v: number; s: number; ph: number }
export type AmbKind = 'embers' | 'snow'

export function freshBoss(): Boss {
  return { on: false, state: 'enter', x: 0, y: 0, t: 0, hp: 100, atk: '', atkT: 0, charge: 0, aimY: 0, cellT: 0, hurt: 0, downT: 0, eyeY: 0, boomT: 0 }
}

// Shock mine pulse cycle: charge (telegraph ring) → zap (deadly ring) → rest
export const MINE_P = 2.6
export const MINE_CHARGE = 1.5
export const MINE_ZAP = 2.0
export const MINE_R = 60
export const MINE_CORE = 14

// Crusher cycle: idle (ghost telegraph) → slam → hold → retract
export const CRUSH_P = 2.3
export const CRUSH_W = 44
export function crusherK(cyc: number) {
  if (cyc < 1.05) return 0
  if (cyc < 1.17) return (cyc - 1.05) / 0.12
  if (cyc < 1.8) return 1
  return Math.max(0, 1 - (cyc - 1.8) / 0.5)
}

export function circleRect(cx: number, cy: number, r: number, x0: number, y0: number, x1: number, y1: number) {
  const nx = Math.max(x0, Math.min(cx, x1))
  const ny = Math.max(y0, Math.min(cy, y1))
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy < r * r
}

// ── Ambient particles (fixed pool, no per-frame allocation) ──

export function makeAmb(n: number): Amb[] {
  const a: Amb[] = []
  for (let i = 0; i < n; i++) a.push({ x: Math.random() * 400, y: Math.random() * 800, v: 0.5 + Math.random(), s: 1 + Math.random() * 2, ph: Math.random() * 6 })
  return a
}

export function stepAmb(a: Amb[], kind: AmbKind, dt: number, dx: number, W: number, top: number, bot: number) {
  for (const p of a) {
    if (kind === 'embers') {
      p.y -= (30 + p.v * 50) * dt
      p.x -= dx * (0.35 + p.v * 0.25) - Math.sin(p.ph + p.y * 0.02) * 12 * dt
    } else {
      p.y += (25 + p.v * 35) * dt
      p.x -= dx * (0.3 + p.v * 0.3) + Math.sin(p.ph + p.y * 0.015) * 14 * dt
    }
    if (p.y < top - 6) p.y = bot
    if (p.y > bot + 6) p.y = top
    if (p.x < -10) p.x += W + 20
    if (p.x > W + 10) p.x -= W + 20
  }
}

export function drawAmb(ctx: CanvasRenderingContext2D, a: Amb[], kind: AmbKind, t: number) {
  if (kind === 'embers') {
    for (const p of a) {
      const f = 0.55 + Math.sin(t * 6 + p.ph * 3) * 0.35
      ctx.globalAlpha = 0.25 * f
      ctx.fillStyle = '#fb923c'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.s * 2.6, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = f
      ctx.fillStyle = p.v > 1 ? '#fde68a' : '#fdba74'
      ctx.fillRect(p.x - p.s * 0.5, p.y - p.s * 0.5, p.s, p.s)
    }
  } else {
    ctx.fillStyle = '#f0f9ff'
    for (const p of a) {
      ctx.globalAlpha = 0.45 + p.v * 0.3
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

// ── Biome backgrounds ──────────────────────────────────────

export function drawLavaBack(ctx: CanvasRenderingContext2D, W: number, CEIL: number, fy: number, scroll: number, t: number) {
  // Distant volcanic ridges with glowing lava falls
  const farS = 220
  const off1 = -((scroll * 0.15) % farS)
  for (let x = off1 - farS; x < W + farS; x += farS) {
    ctx.fillStyle = '#4a140c'
    ctx.beginPath()
    ctx.moveTo(x, fy)
    ctx.lineTo(x + 20, fy - 150)
    ctx.lineTo(x + 55, fy - 200)
    ctx.lineTo(x + 80, fy - 170)
    ctx.lineTo(x + 115, fy - 260)
    ctx.lineTo(x + 150, fy - 190)
    ctx.lineTo(x + 185, fy - 215)
    ctx.lineTo(x + 220, fy - 140)
    ctx.lineTo(x + 220, fy)
    ctx.fill()
    ctx.strokeStyle = '#9a3412'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + 20, fy - 150)
    ctx.lineTo(x + 55, fy - 200)
    ctx.lineTo(x + 80, fy - 170)
    ctx.lineTo(x + 115, fy - 260)
    ctx.lineTo(x + 150, fy - 190)
    ctx.stroke()
    const lx = x + 112
    const lg = ctx.createLinearGradient(0, fy - 250, 0, fy)
    lg.addColorStop(0, '#fde047')
    lg.addColorStop(0.5, '#f97316')
    lg.addColorStop(1, '#b91c1c')
    ctx.fillStyle = lg
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(lx - 5, fy - 248)
    ctx.quadraticCurveTo(lx - 8, fy - 120, lx - 7, fy)
    ctx.lineTo(lx + 7, fy)
    ctx.quadraticCurveTo(lx + 5, fy - 120, lx + 5, fy - 248)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#fef3c7'
    for (let i = 0; i < 3; i++) {
      const yy = fy - 240 + ((t * 90 + i * 80) % 240)
      ctx.fillRect(lx - 1.5 - (yy - (fy - 250)) * 0.03, yy, 3, 10)
    }
  }
  glow(ctx, W * 0.5, fy, W * 0.7, '#f97316', 0.22)
  // Mid basalt columns with glowing cracks
  const midS = 240
  const off2 = -((scroll * 0.55) % midS)
  for (let x = off2 - midS; x < W + midS; x += midS) {
    const g = ctx.createLinearGradient(x, 0, x + 34, 0)
    g.addColorStop(0, '#292524')
    g.addColorStop(0.4, '#44403c')
    g.addColorStop(1, '#1c1917')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(x, CEIL)
    ctx.lineTo(x + 34, CEIL)
    ctx.lineTo(x + 30, fy)
    ctx.lineTo(x + 4, fy)
    ctx.fill()
    ctx.strokeStyle = '#f97316'
    ctx.globalAlpha = 0.55 + Math.sin(t * 2.5 + x * 0.01) * 0.35
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + 17, CEIL + 30)
    for (let y = CEIL + 30, i = 0; y < fy - 10; y += 34, i++) ctx.lineTo(x + 12 + (i % 2) * 11, y + 34)
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}

export function drawLavaFloor(ctx: CanvasRenderingContext2D, W: number, H: number, fy: number, scroll: number, t: number) {
  const g = ctx.createLinearGradient(0, fy + 4, 0, H)
  g.addColorStop(0, '#fbbf24')
  g.addColorStop(0.3, '#ea580c')
  g.addColorStop(1, '#450a0a')
  ctx.fillStyle = g
  ctx.fillRect(0, fy + 6, W, H - fy - 6)
  ctx.fillStyle = '#1c1917'
  const o = -(scroll % 90)
  for (let x = o - 90; x < W + 90; x += 90) {
    ctx.beginPath()
    ctx.ellipse(x + 30, fy + 18, 22, 6, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#fef08a'
  for (let i = 0; i < 6; i++) {
    const k = (t * 0.7 + i * 0.37) % 1
    const bx = ((i * 97 - scroll) % W + W) % W
    ctx.globalAlpha = 1 - k
    ctx.beginPath()
    ctx.arc(bx, fy + 30 - k * 10, 2 + k * 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export function drawIceBack(ctx: CanvasRenderingContext2D, W: number, CEIL: number, fy: number, scroll: number, t: number) {
  // Aurora ribbon
  for (let band = 0; band < 2; band++) {
    ctx.strokeStyle = band ? '#a78bfa' : '#5eead4'
    ctx.globalAlpha = 0.16 + Math.sin(t * 0.7 + band) * 0.05
    ctx.lineWidth = 26 - band * 10
    ctx.beginPath()
    for (let x = -20; x <= W + 20; x += 20) {
      const y = CEIL + 70 + band * 24 + Math.sin(x * 0.012 + t * 0.6 + band * 1.7) * 26
      if (x === -20) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  // Far crystal spires
  const farS = 170
  const off1 = -((scroll * 0.18) % farS)
  for (let x = off1 - farS; x < W + farS; x += farS) {
    for (const [dx, h, wd] of [
      [20, 230, 28],
      [52, 160, 22],
      [104, 280, 34],
      [138, 140, 20],
    ]) {
      const cx = x + dx
      ctx.fillStyle = '#1e3a5f'
      ctx.beginPath()
      ctx.moveTo(cx - wd / 2, fy)
      ctx.lineTo(cx - wd / 2, fy - h + wd)
      ctx.lineTo(cx, fy - h)
      ctx.lineTo(cx + wd / 2, fy - h + wd)
      ctx.lineTo(cx + wd / 2, fy)
      ctx.fill()
      ctx.fillStyle = '#7dd3fc'
      ctx.globalAlpha = 0.18
      ctx.beginPath()
      ctx.moveTo(cx, fy - h)
      ctx.lineTo(cx + wd / 2, fy - h + wd)
      ctx.lineTo(cx + wd / 2, fy)
      ctx.lineTo(cx, fy)
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }
  // Mid frozen pillars with icicle girders
  const midS = 260
  const off2 = -((scroll * 0.55) % midS)
  for (let x = off2 - midS; x < W + midS; x += midS) {
    const g = ctx.createLinearGradient(x, 0, x + 28, 0)
    g.addColorStop(0, '#94a3b8')
    g.addColorStop(0.35, '#e0f2fe')
    g.addColorStop(1, '#475569')
    ctx.fillStyle = g
    ctx.globalAlpha = 0.28
    ctx.fillRect(x, CEIL, 28, fy - CEIL)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#bae6fd'
    ctx.fillRect(x + 28, fy - 128, 100, 6)
    for (let i = 0; i < 6; i++) {
      const ix = x + 34 + i * 16
      const L = 8 + ((i * 7) % 4) * 4
      ctx.beginPath()
      ctx.moveTo(ix - 4, fy - 122)
      ctx.lineTo(ix, fy - 122 + L)
      ctx.lineTo(ix + 4, fy - 122)
      ctx.fill()
    }
  }
}

export function drawIceTrim(ctx: CanvasRenderingContext2D, W: number, CEIL: number, fy: number, scroll: number) {
  // Icicles under the ceiling + snow drift on the floor
  ctx.fillStyle = '#e0f2fe'
  const o = -(scroll % 36)
  for (let x = o - 36, i = 0; x < W + 36; x += 36, i++) {
    const L = 7 + (((Math.floor(scroll / 36) + i) * 5) % 3) * 5
    ctx.beginPath()
    ctx.moveTo(x, CEIL)
    ctx.lineTo(x + 5, CEIL + L)
    ctx.lineTo(x + 10, CEIL)
    ctx.fill()
  }
  ctx.fillStyle = '#f0f9ff'
  ctx.beginPath()
  ctx.moveTo(0, fy + 4)
  const so = scroll % 120
  for (let x = -so; x <= W + 120; x += 30) ctx.quadraticCurveTo(x + 15, fy - 5, x + 30, fy + 3)
  ctx.lineTo(W + 120, fy + 10)
  ctx.lineTo(0, fy + 10)
  ctx.fill()
}

// ── Hazards ────────────────────────────────────────────────

export function drawMine(ctx: CanvasRenderingContext2D, m: Mine, y: number, t: number) {
  const c = m.cyc
  const charging = c < MINE_CHARGE
  const zapping = c >= MINE_CHARGE && c < MINE_ZAP
  // Telegraph: danger radius fills up while charging
  if (charging && c > 0.3) {
    const k = (c - 0.3) / (MINE_CHARGE - 0.3)
    ctx.strokeStyle = '#f43f5e'
    ctx.globalAlpha = 0.25 + k * 0.45
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    ctx.arc(m.x, y, MINE_R, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(m.x, y, MINE_R, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = '#f43f5e'
    ctx.globalAlpha = 0.06 + k * 0.1
    ctx.beginPath()
    ctx.arc(m.x, y, MINE_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  if (zapping) {
    const k = (c - MINE_CHARGE) / (MINE_ZAP - MINE_CHARGE)
    glow(ctx, m.x, y, MINE_R + 16, '#fb7185', 0.5 * (1 - k * 0.5))
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass ? '#fff1f2' : '#f43f5e'
      ctx.lineWidth = pass ? 1.5 : 4
      ctx.beginPath()
      for (let i = 0; i <= 18; i++) {
        const a = (i / 18) * Math.PI * 2
        const r = MINE_R - 4 + (Math.random() - 0.5) * 10
        if (i === 0) ctx.moveTo(m.x + Math.cos(a) * r, y + Math.sin(a) * r)
        else ctx.lineTo(m.x + Math.cos(a) * r, y + Math.sin(a) * r)
      }
      ctx.stroke()
    }
    ctx.strokeStyle = '#fecdd3'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(m.x + Math.cos(a) * 14, y + Math.sin(a) * 14)
      ctx.lineTo(m.x + Math.cos(a + 0.3) * 36, y + Math.sin(a + 0.3) * 36)
      ctx.lineTo(m.x + Math.cos(a) * (MINE_R - 4), y + Math.sin(a) * (MINE_R - 4))
      ctx.stroke()
    }
  }
  // Spikes
  const rot = t * 1.2 + m.bob
  ctx.fillStyle = '#64748b'
  for (let i = 0; i < 8; i++) {
    const a = rot + (i / 8) * Math.PI * 2
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    ctx.beginPath()
    ctx.moveTo(m.x + ca * 21, y + sa * 21)
    ctx.lineTo(m.x + Math.cos(a + 0.32) * 12, y + Math.sin(a + 0.32) * 12)
    ctx.lineTo(m.x + Math.cos(a - 0.32) * 12, y + Math.sin(a - 0.32) * 12)
    ctx.fill()
  }
  // Shell
  const g = ctx.createRadialGradient(m.x - 5, y - 5, 2, m.x, y, MINE_CORE)
  g.addColorStop(0, '#94a3b8')
  g.addColorStop(0.6, '#334155')
  g.addColorStop(1, '#0f172a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(m.x, y, MINE_CORE, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1e293b'
  ctx.lineWidth = 2
  ctx.stroke()
  // Eye lamp brightens as it charges
  const hot = charging ? c / MINE_CHARGE : zapping ? 1 : 0.15
  const blink = charging && c > 0.9 && Math.sin(t * 40) > 0
  ctx.fillStyle = blink ? '#fff' : hot > 0.6 ? '#fb7185' : '#9f1239'
  ctx.beginPath()
  ctx.arc(m.x, y, 4.5 + hot * 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.beginPath()
  ctx.ellipse(m.x - 5, y - 6, 3.5, 2, -0.6, 0, Math.PI * 2)
  ctx.fill()
}

export function drawCrusher(ctx: CanvasRenderingContext2D, c: Crusher, CEIL: number, fy: number, t: number) {
  const x0 = c.x - CRUSH_W / 2
  const full = c.depth
  const ext = full * c.k
  // Ghost telegraph of the slam zone
  if (c.k < 1) {
    const soon = c.cyc < 1.05 ? c.cyc / 1.05 : 1
    const gy = c.top ? CEIL : fy - full
    ctx.fillStyle = '#ef4444'
    ctx.globalAlpha = 0.07 + soon * 0.12
    ctx.fillRect(x0, gy, CRUSH_W, full)
    ctx.globalAlpha = 0.35 + soon * 0.4
    ctx.strokeStyle = '#f87171'
    ctx.lineWidth = 1.5
    ctx.setLineDash([7, 5])
    ctx.strokeRect(x0 + 1, gy + 1, CRUSH_W - 2, full - 2)
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }
  const base = c.top ? CEIL : fy
  const dir = c.top ? 1 : -1
  // Piston shaft
  ctx.fillStyle = '#475569'
  const shaftEnd = base + dir * Math.max(0, ext - 30)
  ctx.fillRect(c.x - 6, Math.min(base, shaftEnd), 12, Math.abs(shaftEnd - base))
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.fillRect(c.x - 4, Math.min(base, shaftEnd), 3, Math.abs(shaftEnd - base))
  // Housing at the mount
  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.roundRect(x0 - 4, c.top ? base - 2 : base - 14, CRUSH_W + 8, 16, 4)
  ctx.fill()
  // Warning lamp
  const urgent = c.cyc > 0.55 && c.cyc < 1.05
  const lampOn = urgent ? Math.sin(t * 36) > 0 : Math.sin(t * 6) > 0.4
  ctx.fillStyle = lampOn ? '#fde047' : '#78350f'
  ctx.beginPath()
  ctx.arc(c.x, c.top ? base + 6 : base - 6, 4, 0, Math.PI * 2)
  ctx.fill()
  if (lampOn && urgent) glow(ctx, c.x, c.top ? base + 6 : base - 6, 22, '#fde047', 0.45)
  // Crusher head
  const hy = c.top ? base + Math.max(14, ext) - 30 : base - Math.max(14, ext)
  const hg = ctx.createLinearGradient(x0, 0, x0 + CRUSH_W, 0)
  hg.addColorStop(0, '#6b7280')
  hg.addColorStop(0.35, '#d1d5db')
  hg.addColorStop(1, '#374151')
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.roundRect(x0, hy, CRUSH_W, 30, 5)
  ctx.fill()
  // Hazard stripes on the striking face
  ctx.save()
  ctx.beginPath()
  const sy = c.top ? hy + 20 : hy
  ctx.rect(x0, sy, CRUSH_W, 10)
  ctx.clip()
  ctx.fillStyle = '#facc15'
  ctx.fillRect(x0, sy, CRUSH_W, 10)
  ctx.fillStyle = '#111827'
  for (let i = -1; i < 6; i++) {
    ctx.beginPath()
    ctx.moveTo(x0 + i * 10, sy + 10)
    ctx.lineTo(x0 + i * 10 + 5, sy + 10)
    ctx.lineTo(x0 + i * 10 + 15, sy)
    ctx.lineTo(x0 + i * 10 + 10, sy)
    ctx.fill()
  }
  ctx.restore()
  // Teeth
  ctx.fillStyle = '#9ca3af'
  const ty = c.top ? hy + 30 : hy
  for (let i = 0; i < 4; i++) {
    const tx = x0 + 4 + i * 10
    ctx.beginPath()
    ctx.moveTo(tx, ty)
    ctx.lineTo(tx + 4, ty + dir * 6)
    ctx.lineTo(tx + 8, ty)
    ctx.fill()
  }
}

// ── Boss: the Sentinel ─────────────────────────────────────

export function drawBoss(ctx: CanvasRenderingContext2D, b: Boss, px: number, t: number) {
  const x = b.x
  const y = b.y + Math.sin(t * 3) * 3
  const tilt = b.state === 'down' ? b.downT * 0.7 : Math.sin(t * 1.4) * 0.04
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tilt)
  // Thruster flames
  for (const fx of [-22, 22]) {
    const L = 18 + Math.random() * 10
    ctx.fillStyle = '#f97316'
    ctx.beginPath()
    ctx.moveTo(fx - 7, 46)
    ctx.quadraticCurveTo(fx, 46 + L * 1.4, fx + 7, 46)
    ctx.fill()
    ctx.fillStyle = '#fde68a'
    ctx.beginPath()
    ctx.moveTo(fx - 3.5, 46)
    ctx.quadraticCurveTo(fx, 46 + L * 0.8, fx + 3.5, 46)
    ctx.fill()
    ctx.fillStyle = '#374151'
    ctx.beginPath()
    ctx.roundRect(fx - 9, 34, 18, 14, 4)
    ctx.fill()
  }
  // Cannon arm (left side, faces the player)
  const charging = b.atk === 'volley'
  const armAng = Math.atan2(b.aimY - y, px - x)
  ctx.save()
  ctx.translate(-36, 14)
  ctx.rotate(armAng)
  ctx.fillStyle = '#4b5563'
  ctx.beginPath()
  ctx.roundRect(-4, -9, 40, 18, 6)
  ctx.fill()
  ctx.fillStyle = '#9ca3af'
  ctx.fillRect(4, -9, 24, 3)
  ctx.fillStyle = '#1f2937'
  ctx.fillRect(30, -7, 10, 14)
  ctx.restore()
  // Hull
  const hull = ctx.createLinearGradient(-46, -50, 46, 50)
  hull.addColorStop(0, '#9f1239')
  hull.addColorStop(0.45, '#4c0519')
  hull.addColorStop(1, '#1c0a10')
  ctx.fillStyle = hull
  ctx.beginPath()
  ctx.moveTo(-30, -48)
  ctx.lineTo(30, -48)
  ctx.lineTo(48, -18)
  ctx.lineTo(42, 36)
  ctx.lineTo(-42, 36)
  ctx.lineTo(-48, -18)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#fb7185'
  ctx.globalAlpha = 0.55
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.globalAlpha = 1
  // Armor plates & rivets
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.beginPath()
  ctx.moveTo(-28, -44)
  ctx.lineTo(10, -44)
  ctx.lineTo(-6, -24)
  ctx.lineTo(-40, -20)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#fda4af'
  for (const [rx, ry] of [
    [-36, 26],
    [36, 26],
    [-38, -14],
    [38, -14],
  ]) {
    ctx.beginPath()
    ctx.arc(rx, ry, 2, 0, Math.PI * 2)
    ctx.fill()
  }
  // Grille
  ctx.fillStyle = '#1f0a10'
  ctx.beginPath()
  ctx.roundRect(-20, 16, 40, 12, 4)
  ctx.fill()
  ctx.strokeStyle = '#be123c'
  ctx.lineWidth = 1.5
  for (let i = -14; i <= 14; i += 7) {
    ctx.beginPath()
    ctx.moveTo(i, 18)
    ctx.lineTo(i, 26)
    ctx.stroke()
  }
  // Antenna
  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(14, -48)
  ctx.lineTo(20, -66)
  ctx.stroke()
  ctx.fillStyle = Math.sin(t * 8) > 0 ? '#f43f5e' : '#fecdd3'
  ctx.beginPath()
  ctx.arc(20, -67, 3.5, 0, Math.PI * 2)
  ctx.fill()
  // Big cyclops eye tracking the player
  const ey = -16
  ctx.fillStyle = '#0b0b10'
  ctx.beginPath()
  ctx.ellipse(-4, ey, 22, 17, 0, 0, Math.PI * 2)
  ctx.fill()
  const look = Math.max(-7, Math.min(7, (b.eyeY - y) * 0.05))
  const ix = -12
  const iy = ey + look
  const hot = charging ? 1 - b.charge / 0.8 : 0
  glow(ctx, ix, iy, 26 + hot * 14, '#f43f5e', 0.45 + hot * 0.35)
  ctx.fillStyle = hot > 0.5 && Math.sin(t * 40) > 0 ? '#fff' : '#f43f5e'
  ctx.beginPath()
  ctx.arc(ix, iy, 8 + hot * 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff1f2'
  ctx.beginPath()
  ctx.arc(ix - 2, iy - 3, 2.6, 0, Math.PI * 2)
  ctx.fill()
  // Angry brow plate
  ctx.fillStyle = '#881337'
  ctx.beginPath()
  ctx.moveTo(-30, ey - 18)
  ctx.lineTo(18, ey - 12)
  ctx.lineTo(18, ey - 7)
  ctx.lineTo(-30, ey - 11)
  ctx.closePath()
  ctx.fill()
  // Damage flash
  if (b.hurt > 0) {
    ctx.globalAlpha = Math.min(1, b.hurt * 3) * 0.7
    ctx.fillStyle = '#a5f3fc'
    ctx.beginPath()
    ctx.moveTo(-30, -48)
    ctx.lineTo(30, -48)
    ctx.lineTo(48, -18)
    ctx.lineTo(42, 36)
    ctx.lineTo(-42, 36)
    ctx.lineTo(-48, -18)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
  }
  ctx.restore()
  // Volley telegraph: aim line from the cannon
  if (charging) {
    const k = 1 - b.charge / 0.8
    ctx.strokeStyle = '#fb7185'
    ctx.globalAlpha = 0.2 + k * 0.5
    ctx.lineWidth = 2
    ctx.setLineDash([10, 8])
    ctx.beginPath()
    ctx.moveTo(x - 60, y + 14)
    ctx.lineTo(px, b.aimY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
    glow(ctx, x - 70, y + 14 + (b.aimY - y) * 0.05, 14 + k * 16, '#fb7185', 0.6)
  }
}

export function drawBossBar(ctx: CanvasRenderingContext2D, b: Boss, W: number, H: number) {
  const bw = Math.min(260, W * 0.62)
  const x = (W - bw) / 2
  const y = H - 28
  ctx.fillStyle = 'rgba(15,23,42,0.8)'
  ctx.beginPath()
  ctx.roundRect(x - 4, y - 4, bw + 8, 18, 9)
  ctx.fill()
  const k = Math.max(0, b.hp / 100)
  const g = ctx.createLinearGradient(x, 0, x + bw, 0)
  g.addColorStop(0, '#f43f5e')
  g.addColorStop(1, '#fb923c')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(x, y, bw * k, 10, 5)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = "800 9px 'Plus Jakarta Sans', system-ui, sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('SENTINEL', W / 2, y + 5)
}

export function drawOrb(ctx: CanvasRenderingContext2D, o: Orb, t: number) {
  ctx.fillStyle = 'rgba(244,63,94,0.35)'
  ctx.beginPath()
  ctx.moveTo(o.x, o.y - 7)
  ctx.lineTo(o.x - o.vx * 0.06, o.y - o.vy * 0.06)
  ctx.lineTo(o.x, o.y + 7)
  ctx.fill()
  glow(ctx, o.x, o.y, 22, '#f43f5e', 0.55)
  ctx.fillStyle = '#e11d48'
  ctx.beginPath()
  ctx.arc(o.x, o.y, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = Math.sin(t * 30) > 0 ? '#fff' : '#fecdd3'
  ctx.beginPath()
  ctx.arc(o.x, o.y, 4, 0, Math.PI * 2)
  ctx.fill()
}

// ── Collectibles ───────────────────────────────────────────

export function drawGem(ctx: CanvasRenderingContext2D, g: Gem, t: number) {
  const y = g.y + Math.sin(g.t * 3) * 4
  glow(ctx, g.x, y, 26, '#22d3ee', 0.4)
  ctx.save()
  ctx.translate(g.x, y)
  ctx.scale(0.75 + Math.abs(Math.cos(t * 2.4)) * 0.25, 1)
  ctx.fillStyle = '#0891b2'
  ctx.beginPath()
  ctx.moveTo(-11, -4)
  ctx.lineTo(-6, -10)
  ctx.lineTo(6, -10)
  ctx.lineTo(11, -4)
  ctx.lineTo(0, 12)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#67e8f9'
  ctx.beginPath()
  ctx.moveTo(-11, -4)
  ctx.lineTo(-6, -10)
  ctx.lineTo(0, -4)
  ctx.lineTo(0, 12)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#cffafe'
  ctx.beginPath()
  ctx.moveTo(-6, -10)
  ctx.lineTo(6, -10)
  ctx.lineTo(0, -4)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  const s = (t * 1.3 + g.x * 0.01) % 1
  if (s < 0.3) {
    const k = Math.sin((s / 0.3) * Math.PI)
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(g.x + 6, y - 9 - 5 * k)
    ctx.lineTo(g.x + 6, y - 9 + 5 * k)
    ctx.moveTo(g.x + 6 - 5 * k, y - 9)
    ctx.lineTo(g.x + 6 + 5 * k, y - 9)
    ctx.stroke()
  }
}

export function drawCell(ctx: CanvasRenderingContext2D, c: Cell, t: number) {
  const y = c.y + Math.sin(c.t * 4) * 6
  glow(ctx, c.x, y, 40, '#22d3ee', 0.5 + Math.sin(t * 8) * 0.15)
  ctx.save()
  ctx.translate(c.x, y)
  ctx.rotate(Math.sin(c.t * 2) * 0.25)
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.roundRect(-11, -16, 22, 32, 6)
  ctx.fill()
  ctx.strokeStyle = '#67e8f9'
  ctx.lineWidth = 2.5
  ctx.stroke()
  ctx.fillStyle = '#94a3b8'
  ctx.fillRect(-5, -20, 10, 4)
  ctx.fillStyle = '#22d3ee'
  ctx.beginPath()
  ctx.moveTo(2, -11)
  ctx.lineTo(-6, 2)
  ctx.lineTo(-1, 2)
  ctx.lineTo(-3, 11)
  ctx.lineTo(6, -2)
  ctx.lineTo(1, -2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function drawZapBolt(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, k: number) {
  ctx.globalAlpha = k
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass ? '#ecfeff' : '#22d3ee'
    ctx.lineWidth = pass ? 2 : 6
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    for (let i = 1; i < 10; i++) {
      const f = i / 10
      ctx.lineTo(ax + (bx - ax) * f + (Math.random() - 0.5) * 8, ay + (by - ay) * f + (Math.random() - 0.5) * 22)
    }
    ctx.lineTo(bx, by)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}
