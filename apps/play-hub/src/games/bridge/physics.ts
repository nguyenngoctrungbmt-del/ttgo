/**
 * Bridge Builder truss physics: XPBD distance constraints with fixed
 * substeps (deterministic), wheel–segment contacts and beam breaking.
 * World units are logical px, y points down.
 */

export type Mat = 'road' | 'wood' | 'steel'

export type MatDef = { label: string; cost: number; strength: number; maxLen: number; mass: number; flex: number; color: string; dark: string }

export const MATS: Record<Mat, MatDef> = {
  road: { label: 'Road', cost: 2.0, strength: 6400, maxLen: 76, mass: 0.012, flex: 4e-6, color: '#a16207', dark: '#422006' },
  wood: { label: 'Wood', cost: 1.2, strength: 4600, maxLen: 76, mass: 0.008, flex: 5e-6, color: '#d6a46b', dark: '#7c4a21' },
  steel: { label: 'Steel', cost: 3.0, strength: 12000, maxLen: 108, mass: 0.013, flex: 2e-6, color: '#94a3b8', dark: '#334155' },
}

export const GRAVITY = 900
export const SUBSTEPS = 24
export const FRAME = 1 / 60
export const SETTLE = 0.6

export type P = { x: number; y: number; px: number; py: number; vx: number; vy: number; w: number; wet: boolean }
export type SimBeam = { a: number; b: number; rest: number; mat: Mat; broken: boolean; force: number; smooth: number; strength: number; compliance: number }
export type Seg = { ax: number; ay: number; bx: number; by: number }

export type VehicleKind = 'car' | 'van' | 'truck' | 'bus'
export type VehicleDef = { wb: number; h: number; r: number; wheelM: number; topM: number; speed: number; accel: number; color: string }
export const VEHICLES: Record<VehicleKind, VehicleDef> = {
  car: { wb: 26, h: 12, r: 7, wheelM: 1.1, topM: 0.7, speed: 95, accel: 760, color: '#ef4444' },
  van: { wb: 30, h: 16, r: 7.5, wheelM: 1.6, topM: 1.0, speed: 88, accel: 720, color: '#3b82f6' },
  truck: { wb: 40, h: 20, r: 9, wheelM: 2.6, topM: 1.8, speed: 78, accel: 680, color: '#f59e0b' },
  bus: { wb: 52, h: 22, r: 9, wheelM: 3.4, topM: 2.4, speed: 72, accel: 640, color: '#10b981' },
}

export type Vehicle = { kind: VehicleKind; def: VehicleDef; parts: [P, P, P]; rest: [number, number, number]; contact: [Seg | null, Seg | null]; segs: [Seg, Seg]; spin: number; delay: number; done: boolean; bestX: number; stillT: number }

export type Sim = {
  nodes: P[]
  fixed: boolean[]
  beams: SimBeam[]
  ground: Seg[]
  vehicles: Vehicle[]
  wind: number
  waterY: number
  finishX: number
  t: number
  result: null | 'win' | 'fail'
  reason: string
  /** Beam indices broken since the last read. */
  breaks: number[]
  /** Vehicle parts that splashed since the last read. */
  splashes: { x: number; y: number }[]
  strengthMul: number
  all: P[]
}

export type BuildNode = { x: number; y: number; anchor: boolean }
export type BuildBeam = { a: number; b: number; mat: Mat }

function particle(x: number, y: number, w: number): P {
  return { x, y, px: x, py: y, vx: 0, vy: 0, w, wet: false }
}

export function makeVehicle(kind: VehicleKind, x: number, groundY: number, delay = 0): Vehicle {
  const d = VEHICLES[kind]
  const rear = particle(x, groundY - d.r, 1 / d.wheelM)
  const front = particle(x + d.wb, groundY - d.r, 1 / d.wheelM)
  const top = particle(x + d.wb * 0.45, groundY - d.r - d.h, 1 / d.topM)
  const rest: [number, number, number] = [d.wb, Math.hypot(d.wb * 0.45, d.h), Math.hypot(d.wb * 0.55, d.h)]
  return { kind, def: d, parts: [rear, front, top], rest, contact: [null, null], segs: [{ ax: 0, ay: 0, bx: 0, by: 0 }, { ax: 0, ay: 0, bx: 0, by: 0 }], spin: 0, delay, done: false, bestX: x, stillT: 0 }
}

export function buildSim(
  nodes: BuildNode[],
  beams: BuildBeam[],
  ground: Seg[],
  vehicles: Vehicle[],
  opts: { wind: number; waterY: number; finishX: number; strengthMul: number },
): Sim {
  const mass = nodes.map(() => 0.06)
  for (const b of beams) {
    const A = nodes[b.a]
    const B = nodes[b.b]
    const m = Math.hypot(A.x - B.x, A.y - B.y) * MATS[b.mat].mass
    mass[b.a] += m / 2
    mass[b.b] += m / 2
  }
  return {
    nodes: nodes.map((n, i) => particle(n.x, n.y, n.anchor ? 0 : 1 / mass[i])),
    fixed: nodes.map((n) => n.anchor),
    beams: beams.map((b) => {
      const A = nodes[b.a]
      const B = nodes[b.b]
      return { a: b.a, b: b.b, rest: Math.hypot(A.x - B.x, A.y - B.y), mat: b.mat, broken: false, force: 0, smooth: 0, strength: MATS[b.mat].strength * opts.strengthMul, compliance: MATS[b.mat].flex * Math.hypot(A.x - B.x, A.y - B.y) }
    }),
    ground,
    vehicles,
    wind: opts.wind,
    waterY: opts.waterY,
    finishX: opts.finishX,
    t: 0,
    result: null,
    reason: '',
    breaks: [],
    splashes: [],
    strengthMul: opts.strengthMul,
    all: [],
  }
}

function solveDist(a: P, b: P, rest: number, compliance: number, h: number): number {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const len = Math.hypot(dx, dy)
  if (len < 1e-6) return 0
  const wsum = a.w + b.w
  if (wsum === 0) return 0
  const C = len - rest
  const alpha = compliance / (h * h)
  const dl = -C / (wsum + alpha)
  const nx = dx / len
  const ny = dy / len
  a.x += a.w * dl * nx
  a.y += a.w * dl * ny
  b.x -= b.w * dl * nx
  b.y -= b.w * dl * ny
  return dl
}

/** Push a wheel out of a segment whose ends may be dynamic particles. */
function contact(wh: P, r: number, a: P | null, b: P | null, seg: Seg): boolean {
  const ex = seg.bx - seg.ax
  const ey = seg.by - seg.ay
  const l2 = ex * ex + ey * ey
  if (l2 < 1e-6) return false
  let t = ((wh.x - seg.ax) * ex + (wh.y - seg.ay) * ey) / l2
  t = t < 0 ? 0 : t > 1 ? 1 : t
  const cx = seg.ax + ex * t
  const cy = seg.ay + ey * t
  const dx = wh.x - cx
  const dy = wh.y - cy
  const d = Math.hypot(dx, dy)
  if (d >= r || d < 1e-6) return false
  // Only collide from the top side of the deck.
  const len = Math.sqrt(l2)
  let ux = ey / len
  let uy = -ex / len
  if (uy > 0) {
    ux = -ux
    uy = -uy
  }
  if (dx * ux + dy * uy < -0.5) return false
  const nx = dx / d
  const ny = dy / d
  const pen = r - d
  const wa = a ? a.w * (1 - t) * (1 - t) : 0
  const wb = b ? b.w * t * t : 0
  const wsum = wh.w + wa + wb
  if (wsum === 0) return false
  const k = pen / wsum
  wh.x += wh.w * k * nx
  wh.y += wh.w * k * ny
  if (a) {
    a.x -= a.w * (1 - t) * k * nx
    a.y -= a.w * (1 - t) * k * ny
  }
  if (b) {
    b.x -= b.w * t * k * nx
    b.y -= b.w * t * k * ny
  }
  return true
}

const tmp: Seg = { ax: 0, ay: 0, bx: 0, by: 0 }

function substep(s: Sim, h: number) {
  // Drive along the contact tangent
  for (const v of s.vehicles) {
    if (v.delay > 0) continue
    for (let i = 0; i < 2; i++) {
      const seg = v.contact[i]
      const wh = v.parts[i]
      if (!seg) continue
      let tx = seg.bx - seg.ax
      let ty = seg.by - seg.ay
      const l = Math.hypot(tx, ty)
      if (l < 1e-6) continue
      tx /= l
      ty /= l
      if (tx < 0) {
        tx = -tx
        ty = -ty
      }
      const vt = wh.vx * tx + wh.vy * ty
      if (vt < v.def.speed) {
        const dv = Math.min(v.def.accel * h, v.def.speed - vt)
        wh.vx += tx * dv
        wh.vy += ty * dv
      }
    }
  }
  const all = s.all
  all.length = 0
  for (let i = 0; i < s.nodes.length; i++) if (!s.fixed[i]) all.push(s.nodes[i])
  const nNodes = all.length
  for (const v of s.vehicles) if (v.delay <= 0) all.push(...v.parts)
  for (let i = 0; i < all.length; i++) {
    const p = all[i]
    p.vy += GRAVITY * h
    // Wind pushes vehicles (big side area) harder than thin beams
    p.vx += s.wind * h * (i < nNodes ? 0.3 : 1)
    p.px = p.x
    p.py = p.y
    p.x += p.vx * h
    p.y += p.vy * h
  }

  const ih2 = 1 / (h * h)
  // Settle the structure under its own weight before traffic arrives
  const damp = s.t < SETTLE ? 0.994 : 0.9997
  for (const b of s.beams) {
    if (b.broken) continue
    const dl = solveDist(s.nodes[b.a], s.nodes[b.b], b.rest, b.compliance, h)
    const f = Math.abs(dl) * ih2
    b.force = f
    b.smooth += (f - b.smooth) * 0.02
  }
  for (const v of s.vehicles) {
    if (v.delay > 0) continue
    const [r, f, t] = v.parts
    for (let k = 0; k < 2; k++) {
      solveDist(r, f, v.rest[0], 0, h)
      solveDist(r, t, v.rest[1], 0, h)
      solveDist(f, t, v.rest[2], 0, h)
    }
  }

  // Wheel contacts with the road deck and the cliff tops
  for (const v of s.vehicles) {
    if (v.delay > 0) continue
    for (let i = 0; i < 2; i++) {
      const wh = v.parts[i]
      const store = v.segs[i]
      let hit = false
      for (const b of s.beams) {
        if (b.broken || b.mat !== 'road') continue
        const A = s.nodes[b.a]
        const B = s.nodes[b.b]
        tmp.ax = A.x
        tmp.ay = A.y
        tmp.bx = B.x
        tmp.by = B.y
        if (contact(wh, v.def.r, s.fixed[b.a] ? null : A, s.fixed[b.b] ? null : B, tmp)) {
          hit = true
          store.ax = tmp.ax
          store.ay = tmp.ay
          store.bx = tmp.bx
          store.by = tmp.by
        }
      }
      for (const g of s.ground) {
        if (contact(wh, v.def.r, null, null, g)) {
          hit = true
          store.ax = g.ax
          store.ay = g.ay
          store.bx = g.bx
          store.by = g.by
        }
      }
      v.contact[i] = hit ? store : null
    }
  }

  for (const p of all) {
    p.vx = (p.x - p.px) / h
    p.vy = (p.y - p.py) / h
    p.vx *= damp
    p.vy *= damp
  }

  for (let i = 0; i < s.beams.length; i++) {
    const b = s.beams[i]
    if (!b.broken && b.smooth > b.strength) {
      b.broken = true
      s.breaks.push(i)
    }
  }
}

/** Advance one fixed frame (1/60 s). */
export function stepSim(s: Sim) {
  const h = FRAME / SUBSTEPS
  for (let i = 0; i < SUBSTEPS; i++) substep(s, h)
  s.t += FRAME
  for (const v of s.vehicles) {
    if (v.delay > 0) {
      v.delay -= FRAME
      continue
    }
    const [r, f] = v.parts
    v.spin += ((r.vx + f.vx) / 2) * FRAME / v.def.r
    if (!v.done && r.x > s.finishX) v.done = true
    for (const p of v.parts) {
      if (p.y > s.waterY && !p.wet) {
        p.wet = true
        s.splashes.push({ x: p.x, y: s.waterY })
        p.vx *= 0.3
        p.vy *= 0.3
      }
    }
    if (v.done) continue
    if (r.x > v.bestX + 2) {
      v.bestX = r.x
      v.stillT = 0
    } else v.stillT += FRAME
  }
  // Sunken parts float slowly
  for (const v of s.vehicles) {
    for (const p of v.parts) {
      if (p.y > s.waterY) {
        p.vy *= 0.9
        p.vx *= 0.95
      }
    }
  }
  for (const p of s.nodes) {
    if (p.y > s.waterY) {
      p.vy *= 0.92
      p.vx *= 0.92
    }
  }
  if (s.result) return
  if (s.vehicles.some((v) => v.parts.some((p) => p.y > s.waterY))) {
    s.result = 'fail'
    s.reason = 'Splash! The vehicle fell in'
  } else if (s.vehicles.every((v) => v.done)) {
    s.result = 'win'
  } else if (s.vehicles.some((v) => v.delay <= 0 && v.stillT > 3)) {
    s.result = 'fail'
    s.reason = 'The vehicle got stuck'
  } else if (s.t > 30) {
    s.result = 'fail'
    s.reason = 'Out of time'
  }
}

/** Load ratio 0..1+ for colouring beams. */
export function stressOf(b: SimBeam) {
  return b.smooth / b.strength
}
