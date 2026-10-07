/** Vector planes, clouds and islands for Dogfight Ace. Planes face +x. */

export type PlaneStyle = 'player' | 'fighter' | 'hunter' | 'bomber' | 'ace'

const STYLE: Record<PlaneStyle, { wing: string; wingDark: string; body: string; trim: string; glass: string }> = {
  player: { wing: '#e2e8f0', wingDark: '#94a3b8', body: '#f8fafc', trim: '#2563eb', glass: '#38bdf8' },
  fighter: { wing: '#dc2626', wingDark: '#7f1d1d', body: '#ef4444', trim: '#fef2f2', glass: '#1e293b' },
  hunter: { wing: '#475569', wingDark: '#1e293b', body: '#64748b', trim: '#facc15', glass: '#fde68a' },
  bomber: { wing: '#65743a', wingDark: '#3f4a22', body: '#7c8b48', trim: '#e7e5e4', glass: '#7dd3fc' },
  ace: { wing: '#6d28d9', wingDark: '#2e1065', body: '#1f1235', trim: '#facc15', glass: '#f0abfc' },
}

function poly(ctx: CanvasRenderingContext2D, pts: number[], sy = 1) {
  ctx.beginPath()
  for (let i = 0; i < pts.length; i += 2) {
    if (i === 0) ctx.moveTo(pts[i], pts[i + 1] * sy)
    else ctx.lineTo(pts[i], pts[i + 1] * sy)
  }
  ctx.closePath()
  ctx.fill()
}

function ell(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2)
  ctx.fill()
}

const WING = [-3, -18, 6, -17, 9, 0, 6, 17, -3, 18, -6, 0]
const TAIL = [-15, -8, -11, -8, -10, 0, -11, 8, -15, 8, -14, 0]
const BOMBER_WING = [-6, -38, 6, -36, 10, 0, 6, 36, -6, 38, -9, 0]

/** Draw a plane. `roll` (-1..1) squashes the span and shades the low wing. */
export function drawPlane(
  ctx: CanvasRenderingContext2D,
  style: PlaneStyle,
  x: number,
  y: number,
  a: number,
  roll: number,
  t: number,
  flash: boolean,
  shadow = false,
) {
  const st = STYLE[style]
  const c = (col: string) => (shadow ? 'rgba(15,23,42,0.28)' : flash ? '#ffffff' : col)
  const sy = 1 - Math.abs(roll) * 0.45
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  ctx.scale(1.25, 1.25)
  if (style === 'bomber') {
    ctx.fillStyle = c(st.wing)
    poly(ctx, BOMBER_WING, sy)
    if (!shadow) {
      ctx.fillStyle = c(st.wingDark)
      ctx.fillRect(-6, roll > 0 ? 0 : -36 * sy, 4, 36 * sy)
      for (const ey of [-24, -12, 12, 24]) {
        ctx.fillStyle = c('#3f3f46')
        ell(ctx, 8, ey * sy, 6, 3)
        ctx.strokeStyle = 'rgba(226,232,240,0.45)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.ellipse(14, ey * sy, 1.2, 5, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.fillStyle = c(st.wing)
    poly(ctx, [-26, -12, -20, -12, -18, 0, -20, 12, -26, 12, -24, 0], sy)
    ctx.fillStyle = c(st.body)
    ell(ctx, -2, 0, 28, 6)
    if (!shadow) {
      ctx.fillStyle = c(st.glass)
      ell(ctx, 20, 0, 5, 3.5)
      ctx.fillStyle = c(st.trim)
      ell(ctx, -4, -22 * sy, 4, 4 * sy)
      ell(ctx, -4, 22 * sy, 4, 4 * sy)
      ctx.fillStyle = c('#1f2937')
      ell(ctx, -4, -22 * sy, 2, 2 * sy)
      ell(ctx, -4, 22 * sy, 2, 2 * sy)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ell(ctx, 2, -2, 20, 1.5)
    }
    ctx.restore()
    return
  }
  const scale = style === 'ace' ? 1.15 : 1
  ctx.scale(scale, scale)
  // Wings
  ctx.fillStyle = c(st.wing)
  poly(ctx, WING, sy)
  if (!shadow) {
    // Low wing shading
    ctx.fillStyle = c(st.wingDark)
    if (roll > 0.05) poly(ctx, [-3, 0, 9, 0, 6, 17, -3, 18, -6, 0], sy)
    else if (roll < -0.05) poly(ctx, [-3, 0, 9, 0, 6, -17, -3, -18, -6, 0], sy)
    ctx.fillStyle = c(st.trim)
    if (style === 'player') {
      for (const sd of [-1, 1]) {
        ell(ctx, 1, sd * 11 * sy, 3.6, 3.6 * sy)
        ctx.fillStyle = c('#ffffff')
        ell(ctx, 1, sd * 11 * sy, 2.2, 2.2 * sy)
        ctx.fillStyle = c('#dc2626')
        ell(ctx, 1, sd * 11 * sy, 1, 1 * sy)
        ctx.fillStyle = c(st.trim)
      }
    } else if (style === 'ace') {
      ctx.fillRect(-1, -17 * sy, 3, 34 * sy)
    } else {
      for (const sd of [-1, 1]) ell(ctx, 1, sd * 11 * sy, 3, 3 * sy)
    }
  }
  ctx.fillStyle = c(st.wing)
  poly(ctx, TAIL, sy)
  // Fuselage
  ctx.fillStyle = c(st.body)
  ctx.beginPath()
  ctx.moveTo(style === 'ace' ? 19 : 16, 0)
  ctx.quadraticCurveTo(10, -4.5, -4, -3.5)
  ctx.lineTo(-15, -1.5)
  ctx.lineTo(-15, 1.5)
  ctx.lineTo(-4, 3.5)
  ctx.quadraticCurveTo(10, 4.5, style === 'ace' ? 19 : 16, 0)
  ctx.fill()
  if (!shadow) {
    ctx.fillStyle = c(st.glass)
    ell(ctx, 3, 0, 4.5, 2.4)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ell(ctx, 4, -0.8, 1.6, 0.8)
    ctx.fillStyle = c(st.trim)
    ctx.fillRect(-13, -1, 5, 2)
    if (style !== 'hunter') {
      // Propeller blur
      ctx.strokeStyle = 'rgba(226,232,240,0.55)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.ellipse(17, 0, 1.3, 8, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      const pa = t * 50
      ctx.beginPath()
      ctx.moveTo(17, Math.sin(pa) * 8)
      ctx.lineTo(17, -Math.sin(pa) * 8)
      ctx.stroke()
    } else {
      // Jet exhaust
      ctx.fillStyle = 'rgba(251,146,60,0.8)'
      ell(ctx, -17 - Math.sin(t * 40), 0, 3 + Math.sin(t * 30), 1.6)
    }
  }
  ctx.restore()
}

// ── Cached scenery sprites ───────────────────
const sprites = new Map<string, HTMLCanvasElement>()

function makeCanvas(w: number, h: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * dpr)
  c.height = Math.ceil(h * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  return { c, g }
}

function seeded(seed: number) {
  let s = seed * 9301 + 49297
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export const CLOUD_SIZE = 180

export function cloudSprite(v: number, storm = false): HTMLCanvasElement {
  const key = `cloud${v}${storm ? 's' : ''}`
  const hit = sprites.get(key)
  if (hit) return hit
  const S = CLOUD_SIZE
  const { c, g } = makeCanvas(S, S)
  const r = seeded(v + 3)
  const puffs = Array.from({ length: 7 }, () => ({ x: S * (0.25 + r() * 0.5), y: S * (0.3 + r() * 0.4), r: S * (0.12 + r() * 0.14) }))
  // Shadowed underside first, then highlights.
  for (const p of puffs) {
    g.fillStyle = storm ? 'rgba(30,41,59,0.95)' : 'rgba(203,213,225,0.95)'
    g.beginPath()
    g.arc(p.x + 3, p.y + 5, p.r, 0, Math.PI * 2)
    g.fill()
  }
  for (const p of puffs) {
    const gr = g.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.4, p.r * 0.1, p.x, p.y, p.r)
    gr.addColorStop(0, storm ? '#94a3b8' : '#ffffff')
    gr.addColorStop(1, storm ? '#475569' : '#e2e8f0')
    g.fillStyle = gr
    g.beginPath()
    g.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    g.fill()
  }
  sprites.set(key, c)
  return c
}

export const ISLAND_SIZE = 260

export function islandSprite(v: number): HTMLCanvasElement {
  const key = `isle${v}`
  const hit = sprites.get(key)
  if (hit) return hit
  const S = ISLAND_SIZE
  const { c, g } = makeCanvas(S, S)
  const r = seeded(v * 7 + 11)
  const n = 14
  const radii = Array.from({ length: n }, () => 0.7 + r() * 0.35)
  const shape = (scale: number) => {
    g.beginPath()
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      const rr = radii[i % n] * S * 0.34 * scale
      const x = S / 2 + Math.cos(a) * rr
      const y = S / 2 + Math.sin(a) * rr * 0.8
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.closePath()
    g.fill()
  }
  g.fillStyle = 'rgba(94,234,212,0.35)'
  shape(1.25)
  g.fillStyle = '#fde68a'
  shape(1.04)
  g.fillStyle = '#4d7c0f'
  shape(0.9)
  g.fillStyle = '#65a30d'
  shape(0.7)
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2
    const d = r() * S * 0.2
    const x = S / 2 + Math.cos(a) * d
    const y = S / 2 + Math.sin(a) * d * 0.8
    g.fillStyle = '#365314'
    g.beginPath()
    g.arc(x + 2, y + 2, 7, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#84cc16'
    g.beginPath()
    g.arc(x, y, 7, 0, Math.PI * 2)
    g.fill()
  }
  sprites.set(key, c)
  return c
}

export function hash2(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

export const MESA_SIZE = 220

/** Desert mesa seen from above: layered sandstone plateau with a cast shadow. */
export function mesaSprite(v: number): HTMLCanvasElement {
  const key = `mesa${v}`
  const hit = sprites.get(key)
  if (hit) return hit
  const S = MESA_SIZE
  const { c, g } = makeCanvas(S, S)
  const r = seeded(v * 13 + 5)
  const n = 11
  const radii = Array.from({ length: n }, () => 0.65 + r() * 0.4)
  const shape = (scale: number, dx: number, dy: number) => {
    g.beginPath()
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      const rr = radii[i % n] * S * 0.3 * scale
      const x = S / 2 + dx + Math.cos(a) * rr
      const y = S / 2 + dy + Math.sin(a) * rr * 0.75
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.closePath()
    g.fill()
  }
  g.fillStyle = 'rgba(120,53,15,0.35)'
  shape(1.05, 16, 18)
  g.fillStyle = '#9a3412'
  shape(1, 6, 8)
  g.fillStyle = '#c2410c'
  shape(0.95, 0, 0)
  g.fillStyle = '#ea8a4a'
  shape(0.78, -3, -3)
  g.fillStyle = '#f4b07a'
  shape(0.5, -6, -6)
  // erosion lines
  g.strokeStyle = 'rgba(124,45,18,0.45)'
  g.lineWidth = 2
  for (let i = 0; i < 4; i++) {
    const a = r() * Math.PI * 2
    g.beginPath()
    g.moveTo(S / 2 + Math.cos(a) * S * 0.08, S / 2 + Math.sin(a) * S * 0.06)
    g.lineTo(S / 2 + Math.cos(a) * S * 0.26, S / 2 + Math.sin(a) * S * 0.2)
    g.stroke()
  }
  sprites.set(key, c)
  return c
}

export const FLOE_SIZE = 200

/** Arctic ice floe / iceberg with a turquoise underwater skirt. */
export function floeSprite(v: number): HTMLCanvasElement {
  const key = `floe${v}`
  const hit = sprites.get(key)
  if (hit) return hit
  const S = FLOE_SIZE
  const { c, g } = makeCanvas(S, S)
  const r = seeded(v * 17 + 3)
  const n = 8
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + r() * 0.4
    const rr = S * (0.2 + r() * 0.18)
    return [Math.cos(a) * rr, Math.sin(a) * rr * 0.8]
  })
  const shape = (scale: number, dx: number, dy: number) => {
    g.beginPath()
    pts.forEach(([x, y], i) => {
      if (i === 0) g.moveTo(S / 2 + dx + x * scale, S / 2 + dy + y * scale)
      else g.lineTo(S / 2 + dx + x * scale, S / 2 + dy + y * scale)
    })
    g.closePath()
    g.fill()
  }
  g.fillStyle = 'rgba(103,232,249,0.3)'
  shape(1.25, 4, 6)
  g.fillStyle = '#93c5fd'
  shape(1.02, 3, 4)
  const gr = g.createLinearGradient(0, S * 0.2, S, S * 0.8)
  gr.addColorStop(0, '#ffffff')
  gr.addColorStop(1, '#dbeafe')
  g.fillStyle = gr
  shape(0.95, 0, 0)
  g.fillStyle = 'rgba(191,219,254,0.8)'
  shape(0.5, 6, 5)
  g.strokeStyle = 'rgba(148,163,184,0.6)'
  g.lineWidth = 1.5
  g.beginPath()
  g.moveTo(S / 2 + pts[0][0] * 0.4, S / 2 + pts[0][1] * 0.4)
  g.lineTo(S / 2, S / 2)
  g.lineTo(S / 2 + pts[4][0] * 0.6, S / 2 + pts[4][1] * 0.6)
  g.stroke()
  sprites.set(key, c)
  return c
}

/** Kamikaze drone (faces +x). `tele` 0..1 while locking on, `dashing` lights the burner. */
export function drawKamikaze(ctx: CanvasRenderingContext2D, x: number, y: number, a: number, t: number, tele: number, dashing: boolean, flash: boolean, shadow = false) {
  const c = (col: string) => (shadow ? 'rgba(15,23,42,0.28)' : flash ? '#ffffff' : col)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  ctx.scale(1.55, 1.55)
  if (!shadow && (dashing || tele > 0)) {
    const len = dashing ? 22 + Math.sin(t * 50) * 4 : 6 + tele * 6
    ctx.fillStyle = 'rgba(251,146,60,0.85)'
    ctx.beginPath()
    ctx.moveTo(-10, -3.5)
    ctx.quadraticCurveTo(-10 - len, 0, -10, 3.5)
    ctx.fill()
    ctx.fillStyle = '#fef3c7'
    ctx.beginPath()
    ctx.moveTo(-10, -1.6)
    ctx.quadraticCurveTo(-10 - len * 0.5, 0, -10, 1.6)
    ctx.fill()
  }
  // delta wing
  ctx.fillStyle = c('#9a3412')
  ctx.beginPath()
  ctx.moveTo(10, 0)
  ctx.lineTo(-10, -15)
  ctx.lineTo(-6, 0)
  ctx.lineTo(-10, 15)
  ctx.closePath()
  ctx.fill()
  if (!shadow) {
    ctx.strokeStyle = flash ? '#ffffff' : '#fff7ed'
    ctx.lineWidth = 1.2
    ctx.lineJoin = 'round'
    ctx.stroke()
  }
  if (!shadow) {
    ctx.fillStyle = c('#f97316')
    ctx.beginPath()
    ctx.moveTo(8, 0)
    ctx.lineTo(-8, -12)
    ctx.lineTo(-5, 0)
    ctx.closePath()
    ctx.fill()
    // hazard stripes
    ctx.strokeStyle = c('#fde047')
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-6, -9)
    ctx.lineTo(-2, -5)
    ctx.moveTo(-6, 9)
    ctx.lineTo(-2, 5)
    ctx.stroke()
  }
  // body pod
  ctx.fillStyle = c('#292524')
  ctx.beginPath()
  ctx.ellipse(1, 0, 11, 3.6, 0, 0, Math.PI * 2)
  ctx.fill()
  if (!shadow) {
    // warhead eye
    const on = tele > 0 ? Math.floor(t * 20) % 2 === 0 : Math.sin(t * 5) > 0
    ctx.fillStyle = on ? '#ef4444' : '#7f1d1d'
    ctx.beginPath()
    ctx.arc(9, 0, 2.6 + tele * 1.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath()
    ctx.arc(8.4, -0.8, 0.9, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export const ZEP_LEN = 92
export const ZEP_WID = 28
export const ZEP_TURRETS: [number, number][] = [
  [42, -16],
  [42, 16],
  [-28, -18],
  [-28, 18],
]

/** Leviathan airship boss seen from above (faces +x). `charges` 0..1 per turret. */
export function drawZeppelin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  a: number,
  t: number,
  flash: boolean,
  charges: number[],
  aimA: number,
  hp: number,
  shadow = false,
) {
  const c = (col: string) => (shadow ? 'rgba(15,23,42,0.28)' : flash ? '#ffffff' : col)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(a)
  // tail fins
  ctx.fillStyle = c('#7f1d1d')
  ctx.beginPath()
  ctx.moveTo(-70, 0)
  ctx.lineTo(-104, -28)
  ctx.lineTo(-94, 0)
  ctx.lineTo(-104, 28)
  ctx.closePath()
  ctx.fill()
  // engine pods on outriggers
  for (const sd of [-1, 1]) {
    ctx.fillStyle = c('#57534e')
    ctx.fillRect(-14, sd > 0 ? 22 : -32, 6, 10)
    ctx.fillStyle = c('#44403c')
    ctx.beginPath()
    ctx.ellipse(-10, sd * 36, 14, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    if (!shadow) {
      ctx.strokeStyle = 'rgba(226,232,240,0.55)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.ellipse(5, sd * 36, 1.4, 8, 0, 0, Math.PI * 2)
      ctx.stroke()
      const pa = t * 40 + sd
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.moveTo(5, sd * 36 + Math.sin(pa) * 8)
      ctx.lineTo(5, sd * 36 - Math.sin(pa) * 8)
      ctx.stroke()
    }
  }
  // envelope
  if (shadow || flash) ctx.fillStyle = c('#a8a29e')
  else {
    const g = ctx.createLinearGradient(0, -ZEP_WID, 0, ZEP_WID)
    g.addColorStop(0, '#e7e5e4')
    g.addColorStop(0.45, '#a8a29e')
    g.addColorStop(1, '#57534e')
    ctx.fillStyle = g
  }
  ctx.beginPath()
  ctx.ellipse(0, 0, ZEP_LEN, ZEP_WID, 0, 0, Math.PI * 2)
  ctx.fill()
  if (!shadow) {
    ctx.strokeStyle = 'rgba(41,37,36,0.45)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    for (let i = -3; i <= 3; i++) {
      const rx = i * 24
      const ry = ZEP_WID * Math.sqrt(Math.max(0, 1 - (rx / ZEP_LEN) ** 2))
      ctx.moveTo(rx, -ry)
      ctx.quadraticCurveTo(rx + 5, 0, rx, ry)
    }
    ctx.stroke()
    // red identification band + highlight
    ctx.fillStyle = c('#b91c1c')
    ctx.fillRect(58, -ZEP_WID * 0.62, 8, ZEP_WID * 1.24)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.ellipse(-4, -ZEP_WID * 0.5, ZEP_LEN * 0.72, 3.6, 0, 0, Math.PI * 2)
    ctx.fill()
    // gondola on the spine
    ctx.fillStyle = c('#292524')
    ctx.beginPath()
    ctx.roundRect(-18, -6, 44, 12, 6)
    ctx.fill()
    ctx.fillStyle = '#fde68a'
    for (let i = 0; i < 5; i++) ctx.fillRect(-12 + i * 8, -2, 4, 4)
    if (hp < 0.5) {
      ctx.fillStyle = 'rgba(28,25,23,0.55)'
      ctx.beginPath()
      ctx.arc(-40, 8, 9, 0, Math.PI * 2)
      ctx.arc(20, -14, 7, 0, Math.PI * 2)
      ctx.fill()
    }
    // turrets: glow red while charging
    ZEP_TURRETS.forEach(([tx, ty], i) => {
      const ch = charges[i] ?? 0
      ctx.fillStyle = ch > 0 ? (Math.floor(t * 16) % 2 ? '#ef4444' : '#fca5a5') : '#3f3f46'
      ctx.beginPath()
      ctx.arc(tx, ty, 6.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#18181b'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(tx + Math.cos(aimA - a) * 12, ty + Math.sin(aimA - a) * 12)
      ctx.stroke()
    })
  }
  ctx.restore()
}
