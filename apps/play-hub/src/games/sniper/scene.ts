/** Procedural vector scenes and characters for Sniper Scope. Coordinates are full-view pixels. */

export type Theme = 'city' | 'forest' | 'harbor'

export type Op =
  | { k: 'grad'; x: number; y: number; w: number; h: number; stops: string[] }
  | { k: 'rect'; x: number; y: number; w: number; h: number; c: string; solid?: boolean; r?: number }
  | { k: 'poly'; pts: number[]; c: string; solid?: boolean; bb: number[] }
  | { k: 'circ'; x: number; y: number; r: number; c: string; a?: number }
  | { k: 'glow'; x: number; y: number; r: number; c: string; a: number }
  | { k: 'win'; x: number; y: number; w: number; h: number; cols: number; rows: number; lit: string; dark: string; seed: number }
  | { k: 'line'; pts: number[]; c: string; w: number }
  | { k: 'people'; plat: number }

export type Platform = { y: number; x0: number; x1: number; s: number; dist: number; covers: Cover[] }
export type Cover = { x: number; w: number; h: number }
export type Scene = { theme: Theme; ops: Op[]; plats: Platform[]; W: number; H: number }

export const PERSON_H = 22

export function rng(seed: number) {
  let s = (seed * 2654435761) >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 100000) / 100000
  }
}

export function themeFor(level: number): Theme {
  return (['city', 'forest', 'harbor'] as Theme[])[(level - 1) % 3]
}

export const THEME_NAME: Record<Theme, string> = { city: 'City Rooftops', forest: 'Pine Ridge', harbor: 'Night Harbor' }

function bboxOf(pts: number[]) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (let i = 0; i < pts.length; i += 2) {
    x0 = Math.min(x0, pts[i])
    x1 = Math.max(x1, pts[i])
    y0 = Math.min(y0, pts[i + 1])
    y1 = Math.max(y1, pts[i + 1])
  }
  return [x0, y0, x1, y1]
}

function mix(a: string, b: string, k: number) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const r = Math.round(((pa >> 16) & 255) * (1 - k) + ((pb >> 16) & 255) * k)
  const g = Math.round(((pa >> 8) & 255) * (1 - k) + ((pb >> 8) & 255) * k)
  const bl = Math.round((pa & 255) * (1 - k) + (pb & 255) * k)
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`
}

export function buildScene(theme: Theme, seed: number, W: number, H: number): Scene {
  const r = rng(seed)
  const ops: Op[] = []
  const plats: Platform[] = []
  const rows = [0.34, 0.45, 0.56, 0.69, 0.83]
  const haze = theme === 'city' ? '#c4b5fd' : theme === 'forest' ? '#bae6fd' : '#1e3a8a'

  // Sky + far layer
  if (theme === 'city') {
    ops.push({ k: 'grad', x: 0, y: 0, w: W, h: H, stops: ['#312e81', '#a21caf', '#fb923c'] })
    ops.push({ k: 'glow', x: W * 0.7, y: H * 0.36, r: W * 0.45, c: '#fde68a', a: 0.45 })
    ops.push({ k: 'circ', x: W * 0.7, y: H * 0.36, r: W * 0.09, c: '#fef3c7' })
    for (let i = 0; i < 16; i++) {
      const w = W * (0.05 + r() * 0.07)
      const x = (i / 16) * W * 1.05 - W * 0.03
      const y = H * (0.22 + r() * 0.14)
      ops.push({ k: 'rect', x, y, w, h: H - y, c: '#4c1d95' })
      ops.push({ k: 'win', x: x + 3, y: y + 4, w: w - 6, h: H * 0.3, cols: 3, rows: 8, lit: 'rgba(253,230,138,0.55)', dark: 'rgba(0,0,0,0)', seed: i * 7 + seed })
    }
  } else if (theme === 'forest') {
    ops.push({ k: 'grad', x: 0, y: 0, w: W, h: H, stops: ['#38bdf8', '#bae6fd', '#ecfeff'] })
    ops.push({ k: 'glow', x: W * 0.2, y: H * 0.15, r: W * 0.35, c: '#fef9c3', a: 0.6 })
    ops.push({ k: 'circ', x: W * 0.2, y: H * 0.15, r: W * 0.06, c: '#fffbeb' })
    const m: number[] = [0, H]
    for (let i = 0; i <= 8; i++) m.push((i / 8) * W, H * (0.2 + (i % 2 ? 0.02 : 0.1) + r() * 0.06))
    m.push(W, H)
    ops.push({ k: 'poly', pts: m, c: '#93c5fd', bb: bboxOf(m) })
    const m2: number[] = [0, H]
    for (let i = 0; i <= 10; i++) m2.push((i / 10) * W, H * (0.28 + (i % 2 ? 0.0 : 0.06) + r() * 0.04))
    m2.push(W, H)
    ops.push({ k: 'poly', pts: m2, c: '#60a5fa', bb: bboxOf(m2) })
  } else {
    ops.push({ k: 'grad', x: 0, y: 0, w: W, h: H, stops: ['#020617', '#0f172a', '#1e3a8a'] })
    for (let i = 0; i < 40; i++) ops.push({ k: 'circ', x: r() * W, y: r() * H * 0.35, r: 0.5 + r(), c: '#e0f2fe', a: 0.4 + r() * 0.5 })
    ops.push({ k: 'glow', x: W * 0.8, y: H * 0.12, r: W * 0.25, c: '#e0f2fe', a: 0.3 })
    ops.push({ k: 'circ', x: W * 0.8, y: H * 0.12, r: W * 0.05, c: '#f1f5f9' })
    for (let i = 0; i < 3; i++) {
      const cx = W * (0.15 + i * 0.33 + r() * 0.08)
      const top = H * (0.12 + r() * 0.06)
      ops.push({ k: 'line', pts: [cx, H * 0.4, cx, top, cx + W * 0.16, top, cx - W * 0.05, top], c: '#1e293b', w: 3 })
      ops.push({ k: 'line', pts: [cx, top, cx + W * 0.1, top + 20], c: '#1e293b', w: 1.5 })
    }
    ops.push({ k: 'rect', x: 0, y: H * 0.36, w: W, h: H, c: '#0b1a3a' })
  }

  rows.forEach((f, i) => {
    const y = H * (f + (r() - 0.5) * 0.03)
    const s = 0.62 + (i / (rows.length - 1)) * 0.6
    const dist = Math.round(640 - (i / (rows.length - 1)) * 520 + (r() - 0.5) * 30)
    const wide = W * (0.4 + r() * 0.3)
    const x0 = i % 2 === 0 ? -10 + r() * W * 0.15 : W - wide - r() * W * 0.15
    const x1 = Math.min(W + 10, x0 + wide)
    const depth = 1 - i / (rows.length - 1)
    const covers: Cover[] = []
    const nC = 1 + Math.floor(r() * 2.5)
    for (let k = 0; k < nC; k++) {
      const cx = x0 + (x1 - x0) * ((k + 0.5) / nC + (r() - 0.5) * 0.15)
      const tall = r() < 0.3
      covers.push({ x: cx, w: PERSON_H * s * (tall ? 0.9 : 0.85 + r() * 0.4), h: PERSON_H * s * (tall ? 1.15 : 0.5) })
    }
    plats.push({ y, x0, x1, s, dist, covers })

    // Facade under the platform (drawn before this platform's people).
    if (theme === 'city') {
      const base = mix('#1e1b4b', haze, depth * 0.45)
      ops.push({ k: 'rect', x: x0, y, w: x1 - x0, h: H - y, c: base, solid: true })
      ops.push({ k: 'rect', x: x0 - 2, y: y - 2, w: x1 - x0 + 4, h: 4, c: mix('#4338ca', haze, depth * 0.3) })
      const cols = Math.max(3, Math.floor((x1 - x0) / (10 * s)))
      ops.push({ k: 'win', x: x0 + 5 * s, y: y + 8 * s, w: x1 - x0 - 10 * s, h: H - y, cols, rows: Math.floor((H - y) / (12 * s)), lit: '#fde68a', dark: mix('#312e81', haze, depth * 0.3), seed: seed + i * 31 })
    } else if (theme === 'forest') {
      const base = mix('#166534', haze, depth * 0.5)
      ops.push({ k: 'rect', x: x0, y, w: x1 - x0, h: H - y, c: base, solid: true, r: 14 * s })
      ops.push({ k: 'rect', x: x0 + 4, y: y + 2, w: x1 - x0 - 8, h: 3 * s, c: mix('#4ade80', haze, depth * 0.4) })
      for (let k = 0; k < 5; k++) {
        const tx = x0 + (x1 - x0) * r()
        ops.push({ k: 'circ', x: tx, y: y + (H - y) * (0.3 + r() * 0.5), r: 4 * s + r() * 5 * s, c: mix('#14532d', haze, depth * 0.4) })
      }
    } else {
      const palette = ['#b91c1c', '#1d4ed8', '#15803d', '#c2410c', '#0e7490']
      let cx = x0
      while (cx < x1) {
        const cw = Math.min(x1 - cx, 46 * s + r() * 20 * s)
        const col = mix(palette[Math.floor(r() * palette.length)], '#0b1a3a', 0.35 + depth * 0.35)
        ops.push({ k: 'rect', x: cx, y, w: cw - 1, h: H - y, c: col, solid: true })
        for (let rx = cx + 3; rx < cx + cw - 3; rx += 4 * s) ops.push({ k: 'rect', x: rx, y: y + 2, w: 1, h: 13 * s, c: 'rgba(0,0,0,0.25)' })
        ops.push({ k: 'rect', x: cx, y: y + 15 * s, w: cw - 1, h: 1.5, c: 'rgba(0,0,0,0.35)' })
        cx += cw
      }
    }
    ops.push({ k: 'people', plat: i })
    // Covers (drawn after this platform's people).
    for (const c of covers) {
      const cx = c.x - c.w / 2
      const cy = y - c.h
      if (theme === 'city') {
        if (c.h > PERSON_H * s) {
          ops.push({ k: 'rect', x: cx, y: cy, w: c.w, h: c.h, c: mix('#475569', haze, depth * 0.35), solid: true })
          ops.push({ k: 'rect', x: cx + c.w * 0.3, y: cy + c.h * 0.35, w: c.w * 0.4, h: c.h * 0.65, c: mix('#1e293b', haze, depth * 0.3) })
          ops.push({ k: 'rect', x: cx - 1, y: cy - 2, w: c.w + 2, h: 2.5, c: mix('#94a3b8', haze, depth * 0.3) })
        } else {
          ops.push({ k: 'rect', x: cx, y: cy, w: c.w, h: c.h, c: mix('#94a3b8', haze, depth * 0.35), solid: true })
          for (let k = 1; k < 4; k++) ops.push({ k: 'rect', x: cx + 2, y: cy + (c.h * k) / 4, w: c.w - 4, h: 1, c: 'rgba(30,41,59,0.5)' })
          ops.push({ k: 'circ', x: cx + c.w * 0.72, y: cy + c.h * 0.5, r: c.h * 0.3, c: mix('#334155', haze, depth * 0.3) })
        }
      } else if (theme === 'forest') {
        if (c.h > PERSON_H * s) {
          // Pine tree: trunk is solid cover, foliage above.
          const th = c.h
          ops.push({ k: 'rect', x: c.x - c.w * 0.18, y: y - th, w: c.w * 0.36, h: th, c: mix('#78350f', haze, depth * 0.35), solid: true })
          for (let k = 0; k < 3; k++) {
            const fy = y - th - k * th * 0.35
            const fw = c.w * (1.4 - k * 0.3)
            const pts = [c.x - fw, fy + th * 0.15, c.x, fy - th * 0.55, c.x + fw, fy + th * 0.15]
            ops.push({ k: 'poly', pts, c: mix(k % 2 ? '#15803d' : '#166534', haze, depth * 0.4), bb: bboxOf(pts) })
          }
        } else {
          const pts = [cx, y, cx + c.w * 0.1, cy + c.h * 0.3, cx + c.w * 0.4, cy, cx + c.w * 0.8, cy + c.h * 0.15, cx + c.w, y]
          ops.push({ k: 'poly', pts, c: mix('#78716c', haze, depth * 0.4), solid: true, bb: bboxOf(pts) })
          ops.push({ k: 'rect', x: cx + c.w * 0.3, y: cy + c.h * 0.15, w: c.w * 0.3, h: 2, c: 'rgba(255,255,255,0.25)' })
        }
      } else {
        if (c.h > PERSON_H * s) {
          ops.push({ k: 'rect', x: c.x - 1.5, y: y - c.h * 1.6, w: 3, h: c.h * 1.6, c: '#334155' })
          ops.push({ k: 'glow', x: c.x, y: y - c.h * 1.6, r: c.h * 1.4, c: '#fde68a', a: 0.35 })
          ops.push({ k: 'circ', x: c.x, y: y - c.h * 1.6, r: 2.5 * s, c: '#fef9c3' })
          ops.push({ k: 'rect', x: cx, y: cy, w: c.w, h: c.h, c: mix('#a16207', '#0b1a3a', depth * 0.4), solid: true })
          ops.push({ k: 'line', pts: [cx, cy, cx + c.w, y, cx, y, cx + c.w, cy], c: 'rgba(0,0,0,0.3)', w: 1 })
        } else {
          ops.push({ k: 'rect', x: cx, y: cy, w: c.w * 0.45, h: c.h, c: mix('#475569', '#0b1a3a', depth * 0.3), solid: true, r: 2 })
          ops.push({ k: 'rect', x: cx + c.w * 0.5, y: cy, w: c.w * 0.45, h: c.h, c: mix('#b45309', '#0b1a3a', depth * 0.3), solid: true, r: 2 })
        }
      }
    }
  })
  if (theme === 'harbor') {
    ops.push({ k: 'rect', x: 0, y: H * 0.94, w: W, h: H * 0.06, c: '#0c4a6e' })
    for (let i = 0; i < 12; i++) ops.push({ k: 'rect', x: r() * W, y: H * (0.95 + r() * 0.04), w: 8 + r() * 14, h: 1, c: 'rgba(253,230,138,0.4)' })
  }
  return { theme, ops, plats, W, H }
}

function inView(op: Op, v: number[] | null) {
  if (!v) return true
  let x0 = 0
  let y0 = 0
  let x1 = 0
  let y1 = 0
  switch (op.k) {
    case 'grad':
    case 'rect':
    case 'win':
      x0 = op.x
      y0 = op.y
      x1 = op.x + op.w
      y1 = op.y + op.h
      break
    case 'poly':
      ;[x0, y0, x1, y1] = op.bb
      break
    case 'circ':
    case 'glow':
      x0 = op.x - op.r
      x1 = op.x + op.r
      y0 = op.y - op.r
      y1 = op.y + op.r
      break
    default:
      return true
  }
  return !(x1 < v[0] || x0 > v[2] || y1 < v[1] || y0 > v[3])
}

/** Draw the scene; `drawPeople(plat)` is called at each people layer. `view` culls ops outside [x0,y0,x1,y1]. */
export function drawScene(ctx: CanvasRenderingContext2D, sc: Scene, view: number[] | null, drawPeople: (plat: number) => void) {
  for (const op of sc.ops) {
    if (op.k === 'people') {
      drawPeople(op.plat)
      continue
    }
    if (!inView(op, view)) continue
    switch (op.k) {
      case 'grad': {
        const g = ctx.createLinearGradient(0, op.y, 0, op.y + op.h)
        op.stops.forEach((c, i) => g.addColorStop(i / (op.stops.length - 1), c))
        ctx.fillStyle = g
        ctx.fillRect(op.x, op.y, op.w, op.h)
        break
      }
      case 'rect':
        ctx.fillStyle = op.c
        if (op.r) {
          ctx.beginPath()
          ctx.roundRect(op.x, op.y, op.w, op.h, [op.r, op.r, 0, 0])
          ctx.fill()
        } else ctx.fillRect(op.x, op.y, op.w, op.h)
        break
      case 'poly':
        ctx.fillStyle = op.c
        ctx.beginPath()
        for (let i = 0; i < op.pts.length; i += 2) {
          if (i === 0) ctx.moveTo(op.pts[i], op.pts[i + 1])
          else ctx.lineTo(op.pts[i], op.pts[i + 1])
        }
        ctx.closePath()
        ctx.fill()
        break
      case 'circ':
        ctx.globalAlpha = op.a ?? 1
        ctx.fillStyle = op.c
        ctx.beginPath()
        ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        break
      case 'glow': {
        const g = ctx.createRadialGradient(op.x, op.y, 0, op.x, op.y, op.r)
        g.addColorStop(0, op.c)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.globalAlpha = op.a
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(op.x, op.y, op.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        break
      }
      case 'win': {
        const cw = op.w / op.cols
        const rh = op.h / op.rows
        const skipDark = op.dark === 'rgba(0,0,0,0)'
        // Two batched paths (lit / dark) instead of one fillRect per window.
        for (const wantLit of skipDark ? [true] : [false, true]) {
          let s = op.seed
          ctx.beginPath()
          for (let rr = 0; rr < op.rows; rr++) {
            for (let cc = 0; cc < op.cols; cc++) {
              s = (s * 16807) % 2147483647
              if ((s % 5 === 0) !== wantLit) continue
              ctx.rect(op.x + cc * cw + cw * 0.2, op.y + rr * rh, cw * 0.6, rh * 0.55)
            }
          }
          ctx.fillStyle = wantLit ? op.lit : op.dark
          ctx.fill()
        }
        break
      }
      case 'line':
        ctx.strokeStyle = op.c
        ctx.lineWidth = op.w
        ctx.beginPath()
        for (let i = 0; i < op.pts.length; i += 2) {
          if (i === 0) ctx.moveTo(op.pts[i], op.pts[i + 1])
          else ctx.lineTo(op.pts[i], op.pts[i + 1])
        }
        ctx.stroke()
        break
    }
  }
}

/** Ray-cast a shot at (x, y) through the layers from nearest to farthest. */
export function hitTest<T>(sc: Scene, x: number, y: number, testPeople: (plat: number) => T | null): { person: T } | { solid: true } | null {
  for (let i = sc.ops.length - 1; i >= 0; i--) {
    const op = sc.ops[i]
    if (op.k === 'people') {
      const hit = testPeople(op.plat)
      if (hit) return { person: hit }
    } else if (op.k === 'rect' && op.solid && x >= op.x && x <= op.x + op.w && y >= op.y && y <= op.y + op.h) return { solid: true }
    else if (op.k === 'poly' && op.solid && x >= op.bb[0] && x <= op.bb[2] && y >= op.bb[1] && y <= op.bb[3]) return { solid: true }
  }
  return null
}

export type PKind = 'hostile' | 'civilian' | 'vip' | 'sniper'

/** Draw a person standing on (x, y) at scale s. `crouch` 0..1, `fall` 0..1 (dead), `walk` phase. */
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  kind: PKind,
  x: number,
  y: number,
  s: number,
  dir: number,
  walk: number,
  crouch: number,
  fall: number,
  shirt: string,
  night: boolean,
  t: number,
) {
  const h = PERSON_H * s
  ctx.save()
  ctx.translate(x, y)
  if (fall > 0) ctx.rotate(dir * fall * 1.45)
  if (kind === 'sniper') {
    // Prone shooter with rifle.
    ctx.scale(dir, 1)
    ctx.fillStyle = night ? '#1f2937' : '#3f6212'
    ctx.beginPath()
    ctx.roundRect(-h * 0.5, -h * 0.16, h * 0.7, h * 0.16, h * 0.06)
    ctx.fill()
    ctx.fillStyle = '#d6a77a'
    ctx.beginPath()
    ctx.arc(h * 0.26, -h * 0.14, h * 0.09, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#365314'
    ctx.beginPath()
    ctx.arc(h * 0.26, -h * 0.18, h * 0.09, Math.PI, 0)
    ctx.fill()
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = Math.max(1, h * 0.05)
    ctx.beginPath()
    ctx.moveTo(h * 0.1, -h * 0.12)
    ctx.lineTo(h * 0.75, -h * 0.13)
    ctx.stroke()
    ctx.restore()
    return
  }
  const hh = h * (1 - crouch * 0.5)
  const legH = h * 0.42 * (1 - crouch * 0.55)
  const pants = kind === 'hostile' ? '#1f2937' : kind === 'vip' ? '#111827' : '#334155'
  const stride = fall > 0 ? 0 : Math.sin(walk) * h * 0.12
  ctx.strokeStyle = pants
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1, h * 0.11)
  ctx.beginPath()
  ctx.moveTo(-h * 0.05, -legH)
  ctx.lineTo(-h * 0.05 + stride, 0)
  ctx.moveTo(h * 0.05, -legH)
  ctx.lineTo(h * 0.05 - stride, 0)
  ctx.stroke()
  // Torso
  const torsoTop = -hh + h * 0.24
  ctx.fillStyle = night ? mixDark(shirt) : shirt
  ctx.beginPath()
  ctx.roundRect(-h * 0.15, torsoTop, h * 0.3, -legH - torsoTop + h * 0.02, h * 0.07)
  ctx.fill()
  if (kind === 'vip') {
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(-h * 0.03, torsoTop + h * 0.02, h * 0.06, h * 0.14)
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(-h * 0.015, torsoTop + h * 0.04, h * 0.03, h * 0.1)
  }
  // Arms
  ctx.strokeStyle = night ? mixDark(shirt) : shirt
  ctx.lineWidth = Math.max(1, h * 0.08)
  const sw = fall > 0 ? 0 : Math.sin(walk + Math.PI) * h * 0.08
  ctx.beginPath()
  ctx.moveTo(-h * 0.12, torsoTop + h * 0.05)
  ctx.lineTo(-h * 0.16 + sw, torsoTop + h * 0.3)
  ctx.moveTo(h * 0.12, torsoTop + h * 0.05)
  ctx.lineTo(h * 0.16 - sw, torsoTop + h * 0.3)
  ctx.stroke()
  if (kind === 'hostile') {
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = Math.max(1, h * 0.06)
    ctx.beginPath()
    ctx.moveTo(dir * -h * 0.1, torsoTop + h * 0.28)
    ctx.lineTo(dir * h * 0.32, torsoTop + h * 0.04)
    ctx.stroke()
  } else if (kind === 'vip') {
    ctx.fillStyle = '#78350f'
    ctx.fillRect(dir * h * 0.12, torsoTop + h * 0.28, dir * h * 0.16, h * 0.12)
  }
  // Head
  const hy = -hh + h * 0.12
  ctx.fillStyle = '#e0ac80'
  ctx.beginPath()
  ctx.arc(0, hy, h * 0.12, 0, Math.PI * 2)
  ctx.fill()
  if (kind === 'hostile') {
    ctx.fillStyle = '#b91c1c'
    ctx.beginPath()
    ctx.ellipse(-dir * h * 0.02, hy - h * 0.07, h * 0.14, h * 0.06, -dir * 0.3, 0, Math.PI * 2)
    ctx.fill()
  } else if (kind === 'vip') {
    ctx.fillStyle = '#111827'
    ctx.fillRect(-h * 0.1, hy - h * 0.02, h * 0.2, h * 0.05)
    ctx.beginPath()
    ctx.arc(0, hy - h * 0.06, h * 0.11, Math.PI, 0)
    ctx.fill()
  } else {
    ctx.fillStyle = '#422006'
    ctx.beginPath()
    ctx.arc(0, hy - h * 0.04, h * 0.12, Math.PI, 0)
    ctx.fill()
  }
  // Eye dot facing direction
  ctx.fillStyle = '#111827'
  ctx.fillRect(dir * h * 0.05 - h * 0.015, hy - h * 0.01, h * 0.03, h * 0.03)
  void t
  ctx.restore()
}

function mixDark(c: string) {
  return mix(c, '#0b1a3a', 0.35)
}
