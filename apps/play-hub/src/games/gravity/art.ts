// Vector art for the long-run content: biomes, crushers, rockets, the Sentinel boss, phase cores.

export type BgKind = 'chev' | 'crystal' | 'storm'
export type Amb = { x: number; y: number; vx: number; vy: number; life: number; max: number; s: number; c: number }

function hash(i: number) {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return v - Math.floor(v)
}

// ── Biome backgrounds (drawn inside the corridor, before walls) ─────────

export function drawCrystalBg(ctx: CanvasRenderingContext2D, W: number, ceilY: number, floorY: number, cam: number, t: number) {
  const layers = [
    { par: 0.18, tile: 70, alpha: 0.2, maxH: 0.3, light: '#f9a8d4', dark: '#831843', seed: 1 },
    { par: 0.42, tile: 130, alpha: 0.32, maxH: 0.2, light: '#67e8f9', dark: '#164e63', seed: 7 },
  ]
  const span = floorY - ceilY
  for (const L of layers) {
    const off = cam * L.par
    const i0 = Math.floor(off / L.tile) - 1
    const i1 = Math.ceil((off + W) / L.tile) + 1
    ctx.globalAlpha = L.alpha
    for (let i = i0; i <= i1; i++) {
      for (const top of [true, false]) {
        const r = hash(i * 13 + L.seed + (top ? 0 : 5))
        if (r < 0.25) continue
        const x = i * L.tile - off + hash(i + L.seed * 3) * L.tile * 0.4
        const wd = L.tile * (0.35 + r * 0.35)
        const hg = span * L.maxH * (0.35 + r * 0.65)
        const by = top ? ceilY : floorY
        const tip = top ? ceilY + hg : floorY - hg
        // Main shard: lit left face, shaded right face
        ctx.fillStyle = L.light
        ctx.beginPath()
        ctx.moveTo(x, by)
        ctx.lineTo(x + wd * 0.5, tip)
        ctx.lineTo(x + wd * 0.45, by)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = L.dark
        ctx.beginPath()
        ctx.moveTo(x + wd * 0.45, by)
        ctx.lineTo(x + wd * 0.5, tip)
        ctx.lineTo(x + wd, by)
        ctx.closePath()
        ctx.fill()
        // Small side shard
        const h2 = hg * 0.5
        const tip2 = top ? ceilY + h2 : floorY - h2
        ctx.fillStyle = L.dark
        ctx.beginPath()
        ctx.moveTo(x + wd * 0.75, by)
        ctx.lineTo(x + wd * 1.05, tip2)
        ctx.lineTo(x + wd * 1.3, by)
        ctx.closePath()
        ctx.fill()
      }
    }
  }
  // Twinkling glints on the near layer
  ctx.globalAlpha = 1
  ctx.fillStyle = '#ffffff'
  const off = cam * 0.42
  const i0 = Math.floor(off / 130) - 1
  for (let i = i0; i < i0 + Math.ceil(W / 130) + 3; i++) {
    const k = Math.sin(t * 3 + i * 1.7)
    if (k < 0.6) continue
    const x = i * 130 - off + hash(i + 21) * 130 * 0.4 + 20
    const y = hash(i) < 0.5 ? ceilY + 18 : floorY - 18
    const s = (k - 0.6) * 9
    ctx.globalAlpha = (k - 0.6) * 2.2
    ctx.fillRect(x - s, y - 0.75, s * 2, 1.5)
    ctx.fillRect(x - 0.75, y - s, 1.5, s * 2)
  }
  ctx.globalAlpha = 1
}

export function drawStormBg(ctx: CanvasRenderingContext2D, W: number, ceilY: number, floorY: number, cam: number, t: number, bolt: number, boltX: number, boltSeed: number) {
  const span = floorY - ceilY
  // Reactor glow on the horizon
  const hz = ctx.createLinearGradient(0, floorY - span * 0.6, 0, floorY)
  hz.addColorStop(0, 'rgba(251,146,60,0)')
  hz.addColorStop(1, 'rgba(251,146,60,0.28)')
  ctx.fillStyle = hz
  ctx.fillRect(0, floorY - span * 0.6, W, span * 0.6)
  // Distant cooling towers with lit windows
  const off = cam * 0.25
  const tile = 170
  const i0 = Math.floor(off / tile) - 1
  for (let i = i0; i <= i0 + Math.ceil(W / tile) + 2; i++) {
    const r = hash(i * 3 + 2)
    const x = i * tile - off + r * 40
    const tw = 54 + r * 26
    const th = span * (0.32 + r * 0.22)
    const top = floorY - th
    ctx.fillStyle = 'rgba(12,8,6,0.75)'
    ctx.beginPath()
    ctx.moveTo(x, floorY)
    ctx.quadraticCurveTo(x + tw * 0.3, floorY - th * 0.55, x + tw * 0.15, top)
    ctx.lineTo(x + tw * 0.85, top)
    ctx.quadraticCurveTo(x + tw * 0.7, floorY - th * 0.55, x + tw, floorY)
    ctx.closePath()
    ctx.fill()
    // Rim light from the reactor glow
    ctx.strokeStyle = 'rgba(251,146,60,0.45)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x + tw * 0.15, top)
    ctx.quadraticCurveTo(x + tw * 0.3, floorY - th * 0.55, x, floorY)
    ctx.stroke()
    ctx.fillStyle = '#fb923c'
    ctx.globalAlpha = 0.55 + Math.sin(t * 2 + i) * 0.25
    ctx.fillRect(x + tw * 0.15, top + 3, tw * 0.7, 2)
    ctx.globalAlpha = 0.7
    for (let k = 0; k < 3; k++) {
      if (hash(i * 7 + k) < 0.4) continue
      ctx.fillRect(x + tw * (0.35 + k * 0.12), floorY - th * (0.25 + hash(i + k) * 0.3), 3, 4)
    }
    // Steam plume
    ctx.globalAlpha = 0.12
    ctx.fillStyle = '#fed7aa'
    for (let k = 0; k < 3; k++) {
      const py = top - 10 - k * 14 - ((t * 12 + i * 9) % 14)
      if (py < ceilY + 4) continue
      ctx.beginPath()
      ctx.arc(x + tw * 0.5 + k * 6, py, 10 + k * 5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  // Storm clouds rolling under the ceiling
  const coff = cam * 0.1 + t * 14
  const ct = 70
  const c0 = Math.floor(coff / ct) - 1
  ctx.fillStyle = 'rgba(30,24,40,0.85)'
  for (let i = c0; i <= c0 + Math.ceil(W / ct) + 2; i++) {
    const r = hash(i * 5 + 9)
    const x = i * ct - coff
    ctx.beginPath()
    ctx.ellipse(x, ceilY + 8 + r * 10, 40 + r * 20, 16 + r * 10, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(70,52,72,0.6)'
  for (let i = c0; i <= c0 + Math.ceil(W / ct) + 2; i++) {
    const r = hash(i * 5 + 9)
    ctx.beginPath()
    ctx.ellipse(i * ct - coff + 10, ceilY + 2 + r * 6, 26 + r * 12, 8, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // Lightning
  if (bolt > 0) {
    ctx.globalAlpha = Math.min(1, bolt * 7) * 0.18
    ctx.fillStyle = '#e0f2fe'
    ctx.fillRect(0, ceilY, W, span)
    ctx.globalAlpha = Math.min(1, bolt * 7)
    const pts: number[] = []
    let x = boltX
    const n = 8
    for (let k = 0; k <= n; k++) {
      pts.push(x, ceilY + (span * 0.7 * k) / n)
      x += (hash(boltSeed + k) - 0.5) * 34
    }
    for (const [lw, col] of [[5, 'rgba(147,197,253,0.6)'], [2, '#ffffff']] as const) {
      ctx.strokeStyle = col
      ctx.lineWidth = lw
      ctx.beginPath()
      ctx.moveTo(pts[0], pts[1])
      for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1])
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
}

export function drawAmbient(ctx: CanvasRenderingContext2D, kind: BgKind, amb: Amb[]) {
  if (kind === 'storm') {
    ctx.strokeStyle = '#bfdbfe'
    ctx.lineWidth = 1.3
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    for (const a of amb) {
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(a.x - a.vx * 0.025, a.y - a.vy * 0.025)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    return
  }
  for (const a of amb) {
    const k = Math.min(1, a.life / 0.6, (a.max - a.life) / 0.6)
    const col = a.c ? '#a5f3fc' : '#f9a8d4'
    ctx.globalAlpha = k * 0.25
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.arc(a.x, a.y, a.s * 2.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = k * 0.9
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(a.x, a.y, a.s * 0.8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── Checkpoint arch every 500 m ─────────────────────────────────────

export function drawCheckpoint(ctx: CanvasRenderingContext2D, x: number, ceilY: number, floorY: number, label: string, color: string, t: number) {
  ctx.globalAlpha = 0.14
  ctx.fillStyle = color
  ctx.fillRect(x - 10, ceilY, 20, floorY - ceilY)
  ctx.globalAlpha = 0.5
  ctx.fillRect(x - 1.5, ceilY, 3, floorY - ceilY)
  ctx.globalAlpha = 1
  for (const [y, s] of [[floorY, 1], [ceilY, -1]] as const) {
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(x - 2, y - s * 44, 4, s * 44)
    // Checkered flag waving
    const fy = y - s * 44
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        ctx.fillStyle = (r + c) % 2 ? '#0f172a' : '#ffffff'
        const cx = x + 2 + c * 6
        const cy = fy + s * r * 6 + Math.sin(t * 6 + c) * 1.5 * (c / 3)
        ctx.fillRect(cx, s === 1 ? cy : cy - 6, 6, 6)
      }
    }
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, fy, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#ffffff'
  ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x, (ceilY + floorY) / 2)
}

// ── Crusher piston ───────────────────────────────────────────────────

// ext = current extension in px from the surface; maxLen = slam reach; warn 0..1 blinking telegraph
export function drawCrusher(ctx: CanvasRenderingContext2D, x: number, sy: number, s: 1 | -1, ext: number, maxLen: number, warn: number, t: number) {
  ctx.save()
  ctx.translate(x, sy)
  ctx.scale(1, s)
  // Telegraph: the strike zone lights up before the slam
  if (warn > 0) {
    const on = Math.sin(t * 30) > 0
    ctx.fillStyle = on ? 'rgba(239,68,68,0.22)' : 'rgba(239,68,68,0.1)'
    ctx.fillRect(-24, -maxLen, 48, maxLen)
    ctx.strokeStyle = 'rgba(248,113,113,0.8)'
    ctx.setLineDash([6, 6])
    ctx.lineWidth = 2
    ctx.strokeRect(-24, -maxLen, 48, maxLen)
    ctx.setLineDash([])
  }
  // Housing in the wall
  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.roundRect(-28, -2, 56, 30, 5)
  ctx.fill()
  ctx.fillStyle = '#4b5563'
  for (const rx of [-21, 21]) {
    ctx.beginPath()
    ctx.arc(rx, 20, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }
  const lit = warn > 0 ? Math.sin(t * 30) > 0 : ext > 4
  ctx.fillStyle = lit ? '#f87171' : '#7f1d1d'
  ctx.beginPath()
  ctx.arc(0, 18, 4.5, 0, Math.PI * 2)
  ctx.fill()
  if (lit) {
    ctx.fillStyle = 'rgba(248,113,113,0.35)'
    ctx.beginPath()
    ctx.arc(0, 18, 9, 0, Math.PI * 2)
    ctx.fill()
  }
  // Shaft
  if (ext > 2) {
    const g = ctx.createLinearGradient(-8, 0, 8, 0)
    g.addColorStop(0, '#64748b')
    g.addColorStop(0.45, '#e2e8f0')
    g.addColorStop(1, '#475569')
    ctx.fillStyle = g
    ctx.fillRect(-8, -ext + 10, 16, ext - 8)
  }
  // Ram head with hazard stripes and teeth
  const hy = -ext
  const hg = ctx.createLinearGradient(0, hy, 0, hy + 16)
  hg.addColorStop(0, '#cbd5e1')
  hg.addColorStop(1, '#475569')
  ctx.fillStyle = hg
  ctx.beginPath()
  ctx.roundRect(-22, hy, 44, 16, 3)
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.rect(-22, hy + 4, 44, 8)
  ctx.clip()
  ctx.fillStyle = '#facc15'
  ctx.fillRect(-22, hy + 4, 44, 8)
  ctx.fillStyle = '#111827'
  for (let k = -30; k < 30; k += 10) {
    ctx.beginPath()
    ctx.moveTo(k, hy + 12)
    ctx.lineTo(k + 5, hy + 12)
    ctx.lineTo(k + 13, hy + 4)
    ctx.lineTo(k + 8, hy + 4)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  ctx.fillStyle = '#fca5a5'
  ctx.strokeStyle = '#b91c1c'
  ctx.lineWidth = 1.2
  for (let k = 0; k < 5; k++) {
    const bx = -22 + k * 8.8
    ctx.beginPath()
    ctx.moveTo(bx, hy)
    ctx.lineTo(bx + 4.4, hy - 6)
    ctx.lineTo(bx + 8.8, hy)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
}

// ── Homing rocket (flies right → left along one lane) ───────────────────

export function drawRocket(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  // Exhaust flame
  const fl = 14 + Math.sin(t * 50) * 4
  ctx.fillStyle = 'rgba(251,146,60,0.55)'
  ctx.beginPath()
  ctx.moveTo(15, -6)
  ctx.quadraticCurveTo(15 + fl * 1.6, 0, 15, 6)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.moveTo(15, -3.5)
  ctx.quadraticCurveTo(15 + fl, 0, 15, 3.5)
  ctx.fill()
  // Fins
  ctx.fillStyle = '#7f1d1d'
  ctx.beginPath()
  ctx.moveTo(6, -6)
  ctx.lineTo(16, -13)
  ctx.lineTo(16, -5)
  ctx.closePath()
  ctx.moveTo(6, 6)
  ctx.lineTo(16, 13)
  ctx.lineTo(16, 5)
  ctx.closePath()
  ctx.fill()
  // Body
  const g = ctx.createLinearGradient(0, -7, 0, 7)
  g.addColorStop(0, '#fca5a5')
  g.addColorStop(0.45, '#ef4444')
  g.addColorStop(1, '#7f1d1d')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-14, -7)
  ctx.lineTo(16, -7)
  ctx.lineTo(16, 7)
  ctx.lineTo(-14, 7)
  ctx.quadraticCurveTo(-27, 0, -14, -7)
  ctx.fill()
  ctx.strokeStyle = '#450a0a'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Stripe + window
  ctx.fillStyle = '#f8fafc'
  ctx.fillRect(2, -7, 4, 14)
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.arc(-6, -1, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.arc(-6.8, -1.8, 1.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fillRect(-12, -5, 10, 1.5)
  ctx.restore()
}

export function drawRocketWarn(ctx: CanvasRenderingContext2D, W: number, y: number, k: number, playerX: number, t: number) {
  const on = Math.sin(t * 22) > -0.2
  // Lane marker
  ctx.strokeStyle = `rgba(248,113,113,${0.25 + k * 0.45})`
  ctx.lineWidth = 2
  ctx.setLineDash([10, 8])
  ctx.lineDashOffset = -t * 120
  ctx.beginPath()
  ctx.moveTo(playerX, y)
  ctx.lineTo(W - 30, y)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineDashOffset = 0
  // Warning badge
  ctx.save()
  ctx.translate(W - 22, y)
  const sc = 1 + (on ? 0.1 : 0)
  ctx.scale(sc, sc)
  ctx.fillStyle = on ? '#ef4444' : '#991b1b'
  ctx.beginPath()
  ctx.moveTo(0, -15)
  ctx.lineTo(14, 11)
  ctx.lineTo(-14, 11)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#fee2e2'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(-1.6, -7, 3.2, 10)
  ctx.fillRect(-1.6, 5, 3.2, 3)
  ctx.restore()
  // Progress arc: how soon it fires
  ctx.strokeStyle = '#fde047'
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(W - 22, y, 22, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2)
  ctx.stroke()
}

// ── Sentinel boss ────────────────────────────────────────────────────

// aim: -1 = ceiling, 1 = floor; charge 0..1; hit flash 0..1
export function drawSentinel(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, aim: number, charge: number, hit: number) {
  ctx.save()
  ctx.translate(x, y)
  // Thruster flames (back side)
  for (const s of [-1, 1]) {
    const fl = 12 + Math.sin(t * 40 + s) * 4
    ctx.fillStyle = 'rgba(56,189,248,0.5)'
    ctx.beginPath()
    ctx.moveTo(32, s * 22 - 5)
    ctx.quadraticCurveTo(32 + fl * 1.5, s * 22, 32, s * 22 + 5)
    ctx.fill()
    ctx.fillStyle = '#374151'
    ctx.beginPath()
    ctx.roundRect(20, s * 22 - 7, 14, 14, 3)
    ctx.fill()
  }
  // Antenna spikes
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-6, -36)
  ctx.lineTo(-12, -50)
  ctx.moveTo(8, -36)
  ctx.lineTo(14, -48)
  ctx.stroke()
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(-12, -50, 3.5, 0, Math.PI * 2)
  ctx.arc(14, -48, 3, 0, Math.PI * 2)
  ctx.fill()
  // Hull
  const g = ctx.createRadialGradient(-10, -12, 4, 0, 0, 40)
  g.addColorStop(0, hit > 0 ? '#ffffff' : '#64748b')
  g.addColorStop(0.6, '#334155')
  g.addColorStop(1, '#0f172a')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, 38, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2.5
  ctx.stroke()
  // Armor plates
  ctx.fillStyle = '#1e293b'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.arc(0, 0, 38, s === -1 ? Math.PI * 1.15 : Math.PI * 0.15, s === -1 ? Math.PI * 1.85 : Math.PI * 0.85)
    ctx.arc(0, 0, 30, s === -1 ? Math.PI * 1.85 : Math.PI * 0.85, s === -1 ? Math.PI * 1.15 : Math.PI * 0.15, true)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = '#facc15'
  for (let k = 0; k < 4; k++) {
    const a = Math.PI * (1.25 + k * 0.17)
    ctx.beginPath()
    ctx.arc(Math.cos(a) * 34, Math.sin(a) * 34, 1.8, 0, Math.PI * 2)
    ctx.arc(Math.cos(a) * 34, -Math.sin(a) * 34, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  // Eye socket
  ctx.fillStyle = '#020617'
  ctx.beginPath()
  ctx.arc(-4, 0, 21, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f1f5f9'
  ctx.beginPath()
  ctx.arc(-4, 0, 17, 0, Math.PI * 2)
  ctx.fill()
  // Iris tracks the target lane, glows while charging
  const ix = -9
  const iy = aim * 6
  if (charge > 0) {
    ctx.fillStyle = `rgba(239,68,68,${0.25 + charge * 0.35})`
    ctx.beginPath()
    ctx.arc(ix, iy, 12 + charge * 5, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = charge > 0 ? '#f87171' : '#dc2626'
  ctx.beginPath()
  ctx.arc(ix, iy, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = charge > 0.7 ? '#ffffff' : '#450a0a'
  ctx.beginPath()
  ctx.arc(ix, iy, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.beginPath()
  ctx.arc(ix + 3, iy - 3, 2, 0, Math.PI * 2)
  ctx.fill()
  // Angry brow plate
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.moveTo(-28, -20)
  ctx.lineTo(16, -12)
  ctx.lineTo(16, -6)
  ctx.lineTo(-26, -13)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

export function drawBeam(ctx: CanvasRenderingContext2D, x0: number, y: number, half: number, charge: number, fire: number, t: number) {
  if (fire > 0) {
    ctx.fillStyle = 'rgba(239,68,68,0.45)'
    ctx.fillRect(0, y - half, x0, half * 2)
    ctx.fillStyle = '#f87171'
    ctx.fillRect(0, y - half * 0.55, x0, half * 1.1)
    ctx.fillStyle = '#ffffff'
    const j = Math.sin(t * 80) * 1.5
    ctx.fillRect(0, y - half * 0.2 + j, x0, half * 0.4)
    return
  }
  // Charging: lane fills in, a thin aiming line flickers
  ctx.fillStyle = `rgba(239,68,68,${0.06 + charge * 0.16})`
  ctx.fillRect(0, y - half, x0, half * 2)
  ctx.strokeStyle = `rgba(248,113,113,${0.4 + charge * 0.5})`
  ctx.lineWidth = 1 + charge * 2
  ctx.setLineDash([12, 6])
  ctx.lineDashOffset = t * 200
  ctx.beginPath()
  ctx.moveTo(0, y - half)
  ctx.lineTo(x0, y - half)
  ctx.moveTo(0, y + half)
  ctx.lineTo(x0, y + half)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.lineDashOffset = 0
}

// ── Phase core power-up ───────────────────────────────────────────────

export function drawPhaseCore(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save()
  ctx.translate(x, y + Math.sin(t * 4) * 3)
  // Orbit ring
  ctx.strokeStyle = 'rgba(196,181,253,0.7)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.ellipse(0, 0, 19, 7, t * 1.5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.rotate(t * 1.2)
  const g = ctx.createLinearGradient(-12, -12, 12, 12)
  g.addColorStop(0, '#e9d5ff')
  g.addColorStop(0.5, '#a78bfa')
  g.addColorStop(1, '#22d3ee')
  ctx.fillStyle = g
  ctx.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(0, -6)
  ctx.lineTo(4, 0)
  ctx.lineTo(0, 6)
  ctx.lineTo(-4, 0)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
