/**
 * Tiny sequential-impulse rigid body engine (Box2D-lite style) for Castle Crash.
 * Boxes + circles, persistent contacts with warm starting, Baumgarte bias,
 * per-body sleeping. World units, y grows downward.
 */

export type Mat = 'wood' | 'stone' | 'glass' | 'tnt' | 'guard' | 'king' | 'ammo' | 'ground' | 'earth'

export type Body = {
  id: number
  circle: boolean
  x: number
  y: number
  a: number
  vx: number
  vy: number
  w: number
  hw: number
  hh: number
  r: number
  m: number
  invM: number
  invI: number
  mu: number
  e: number
  isStatic: boolean
  awake: boolean
  sleepT: number
  contacts: number
  prevContacts: number
  mat: Mat
  hp: number
  maxHp: number
  /** Largest damage received this step (applied by the game). */
  hit: number
  /** Ammo kind index for projectiles. */
  kind: number
  dead: boolean
  flash: number
  seed: number
  /** World-space verts (x0,y0..x3,y3) then edge normals, boxes only. */
  geo: Float64Array
  minX: number
  minY: number
  maxX: number
  maxY: number
}

type Contact = {
  x: number
  y: number
  sep: number
  pn: number
  pt: number
  rax: number
  ray: number
  rbx: number
  rby: number
  mn: number
  mt: number
  bias: number
}

type Arb = { a: Body; b: Body; nx: number; ny: number; cs: Contact[]; mu: number; e: number; stamp: number }

export type Impact = { x: number; y: number; speed: number; a: Mat; b: Mat }

const SLOP = 0.6
const BAUMGARTE = 0.2
const MARGIN = 1
const ITER = 10
const IMPACT_MIN = 140
const WAKE_SPEED = 26

const DENSITY: Record<Mat, number> = { wood: 1, stone: 2.4, glass: 0.7, tnt: 0.9, guard: 0.9, king: 1.1, ammo: 3, ground: 0, earth: 0 }
const FRICTION: Record<Mat, number> = { wood: 0.7, stone: 0.8, glass: 0.35, tnt: 0.7, guard: 0.6, king: 0.6, ammo: 0.5, ground: 0.9, earth: 0.9 }
const BOUNCE: Record<Mat, number> = { wood: 0.08, stone: 0.05, glass: 0.1, tnt: 0.08, guard: 0.25, king: 0.2, ammo: 0.25, ground: 0.1, earth: 0.1 }

// Scratch manifold (single-threaded, reused every collide call)
const M = { nx: 0, ny: 0, n: 0, px: [0, 0], py: [0, 0], sep: [0, 0] }

function updateGeo(b: Body) {
  if (b.circle) {
    b.minX = b.x - b.r
    b.maxX = b.x + b.r
    b.minY = b.y - b.r
    b.maxY = b.y + b.r
    return
  }
  const c = Math.cos(b.a)
  const s = Math.sin(b.a)
  const g = b.geo
  const lx = [-b.hw, b.hw, b.hw, -b.hw]
  const ly = [-b.hh, -b.hh, b.hh, b.hh]
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (let i = 0; i < 4; i++) {
    const x = b.x + lx[i] * c - ly[i] * s
    const y = b.y + lx[i] * s + ly[i] * c
    g[i * 2] = x
    g[i * 2 + 1] = y
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  // Edge normals: top, right, bottom, left (local (0,-1),(1,0),(0,1),(-1,0))
  g[8] = s
  g[9] = -c
  g[10] = c
  g[11] = s
  g[12] = -s
  g[13] = c
  g[14] = -c
  g[15] = -s
  b.minX = minX
  b.minY = minY
  b.maxX = maxX
  b.maxY = maxY
}

function maxSeparation(A: Body, B: Body): [number, number] {
  const ga = A.geo
  const gb = B.geo
  let best = -Infinity
  let idx = 0
  for (let i = 0; i < 4; i++) {
    const nx = ga[8 + i * 2]
    const ny = ga[9 + i * 2]
    const vx = ga[i * 2]
    const vy = ga[i * 2 + 1]
    let mn = Infinity
    for (let j = 0; j < 4; j++) {
      const d = (gb[j * 2] - vx) * nx + (gb[j * 2 + 1] - vy) * ny
      if (d < mn) mn = d
    }
    if (mn > best) {
      best = mn
      idx = i
    }
  }
  return [best, idx]
}

function collideBoxes(A: Body, B: Body): boolean {
  const [sepA, edgeA] = maxSeparation(A, B)
  if (sepA > MARGIN) return false
  const [sepB, edgeB] = maxSeparation(B, A)
  if (sepB > MARGIN) return false
  let ref = A
  let inc = B
  let edge = edgeA
  let flip = false
  if (sepB > sepA + 0.05) {
    ref = B
    inc = A
    edge = edgeB
    flip = true
  }
  const gr = ref.geo
  const gi = inc.geo
  const nx = gr[8 + edge * 2]
  const ny = gr[9 + edge * 2]
  // Incident edge: most anti-parallel normal
  let i1 = 0
  let mnDot = Infinity
  for (let i = 0; i < 4; i++) {
    const d = gi[8 + i * 2] * nx + gi[9 + i * 2] * ny
    if (d < mnDot) {
      mnDot = d
      i1 = i
    }
  }
  const i2 = (i1 + 1) % 4
  let c0x = gi[i1 * 2]
  let c0y = gi[i1 * 2 + 1]
  let c1x = gi[i2 * 2]
  let c1y = gi[i2 * 2 + 1]
  const e2 = (edge + 1) % 4
  const v1x = gr[edge * 2]
  const v1y = gr[edge * 2 + 1]
  const v2x = gr[e2 * 2]
  const v2y = gr[e2 * 2 + 1]
  let tx = v2x - v1x
  let ty = v2y - v1y
  const tl = Math.hypot(tx, ty) || 1
  tx /= tl
  ty /= tl
  // Clip against side planes
  const clips: Array<[number, number, number]> = [
    [-tx, -ty, -(tx * v1x + ty * v1y)],
    [tx, ty, tx * v2x + ty * v2y],
  ]
  for (const [px, py, off] of clips) {
    const d0 = px * c0x + py * c0y - off
    const d1 = px * c1x + py * c1y - off
    if (d0 > 0 && d1 > 0) return false
    if (d0 > 0) {
      const k = d0 / (d0 - d1)
      c0x += (c1x - c0x) * k
      c0y += (c1y - c0y) * k
    } else if (d1 > 0) {
      const k = d1 / (d1 - d0)
      c1x += (c0x - c1x) * k
      c1y += (c0y - c1y) * k
    }
  }
  const front = nx * v1x + ny * v1y
  M.n = 0
  const s0 = nx * c0x + ny * c0y - front
  const s1 = nx * c1x + ny * c1y - front
  if (s0 <= MARGIN) {
    M.px[M.n] = c0x
    M.py[M.n] = c0y
    M.sep[M.n] = s0
    M.n++
  }
  if (s1 <= MARGIN) {
    M.px[M.n] = c1x
    M.py[M.n] = c1y
    M.sep[M.n] = s1
    M.n++
  }
  M.nx = flip ? -nx : nx
  M.ny = flip ? -ny : ny
  return M.n > 0
}

/** Box A vs circle B, normal from A to B. */
function collideBoxCircle(A: Body, B: Body): boolean {
  const c = Math.cos(A.a)
  const s = Math.sin(A.a)
  const dx = B.x - A.x
  const dy = B.y - A.y
  const lx = dx * c + dy * s
  const ly = -dx * s + dy * c
  let nlx: number
  let nly: number
  let plx: number
  let ply: number
  let sep: number
  if (Math.abs(lx) <= A.hw && Math.abs(ly) <= A.hh) {
    const ex = A.hw - Math.abs(lx)
    const ey = A.hh - Math.abs(ly)
    if (ex < ey) {
      nlx = lx < 0 ? -1 : 1
      nly = 0
      plx = nlx * A.hw
      ply = ly
      sep = -ex - B.r
    } else {
      nlx = 0
      nly = ly < 0 ? -1 : 1
      plx = lx
      ply = nly * A.hh
      sep = -ey - B.r
    }
  } else {
    plx = Math.max(-A.hw, Math.min(A.hw, lx))
    ply = Math.max(-A.hh, Math.min(A.hh, ly))
    const ddx = lx - plx
    const ddy = ly - ply
    const d = Math.hypot(ddx, ddy)
    if (d - B.r > MARGIN || d < 1e-6) return false
    nlx = ddx / d
    nly = ddy / d
    sep = d - B.r
  }
  M.nx = nlx * c - nly * s
  M.ny = nlx * s + nly * c
  M.px[0] = A.x + plx * c - ply * s
  M.py[0] = A.y + plx * s + ply * c
  M.sep[0] = sep
  M.n = 1
  return true
}

function collideCircles(A: Body, B: Body): boolean {
  const dx = B.x - A.x
  const dy = B.y - A.y
  const d = Math.hypot(dx, dy)
  const sep = d - A.r - B.r
  if (sep > MARGIN) return false
  const nx = d > 1e-6 ? dx / d : 0
  const ny = d > 1e-6 ? dy / d : 1
  M.nx = nx
  M.ny = ny
  M.px[0] = A.x + nx * A.r
  M.py[0] = A.y + ny * A.r
  M.sep[0] = sep
  M.n = 1
  return true
}

function collide(A: Body, B: Body): boolean {
  if (!A.circle && !B.circle) return collideBoxes(A, B)
  if (!A.circle && B.circle) return collideBoxCircle(A, B)
  if (A.circle && B.circle) return collideCircles(A, B)
  const ok = collideBoxCircle(B, A)
  if (ok) {
    M.nx = -M.nx
    M.ny = -M.ny
  }
  return ok
}

export class World {
  bodies: Body[] = []
  arbs = new Map<number, Arb>()
  gravity = 900
  /** Damage multiplier when an ammo body hits something. */
  ammoPower = 1
  impacts: Impact[] = []
  private nextId = 1
  private stamp = 0

  clear() {
    this.bodies = []
    this.arbs.clear()
    this.impacts = []
  }

  add(opts: { x: number; y: number; hw?: number; hh?: number; r?: number; a?: number; mat: Mat; isStatic?: boolean; hp?: number; awake?: boolean; kind?: number; density?: number }): Body {
    const circle = opts.r != null
    const isStatic = !!opts.isStatic
    const hw = opts.hw ?? 0
    const hh = opts.hh ?? 0
    const r = opts.r ?? 0
    const dens = opts.density ?? DENSITY[opts.mat]
    const area = circle ? Math.PI * r * r : hw * hh * 4
    const m = isStatic ? 0 : Math.max(1, area * dens)
    const I = isStatic ? 0 : circle ? 0.5 * m * r * r : (m * (4 * hw * hw + 4 * hh * hh)) / 12
    const b: Body = {
      id: this.nextId++,
      circle,
      x: opts.x,
      y: opts.y,
      a: opts.a ?? 0,
      vx: 0,
      vy: 0,
      w: 0,
      hw,
      hh,
      r,
      m,
      invM: isStatic ? 0 : 1 / m,
      invI: isStatic ? 0 : 1 / I,
      mu: FRICTION[opts.mat],
      e: BOUNCE[opts.mat],
      isStatic,
      awake: !isStatic && (opts.awake ?? true),
      sleepT: 0,
      contacts: 0,
      prevContacts: 0,
      mat: opts.mat,
      hp: opts.hp ?? 1,
      maxHp: opts.hp ?? 1,
      hit: 0,
      kind: opts.kind ?? 0,
      dead: false,
      flash: 0,
      seed: Math.random() * 1000,
      geo: new Float64Array(16),
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    }
    updateGeo(b)
    this.bodies.push(b)
    return b
  }

  remove(b: Body) {
    b.dead = true
    this.bodies = this.bodies.filter((o) => o !== b)
    for (const [k, arb] of this.arbs) if (arb.a === b || arb.b === b) this.arbs.delete(k)
  }

  wake(b: Body) {
    if (b.isStatic || b.awake) return
    b.awake = true
    b.sleepT = 0
  }

  /** Wake every dynamic body near a point. */
  wakeArea(x: number, y: number, r: number) {
    for (const b of this.bodies) {
      if (b.isStatic) continue
      if (b.maxX < x - r || b.minX > x + r || b.maxY < y - r || b.minY > y + r) continue
      this.wake(b)
    }
  }

  step(dt: number) {
    const B = this.bodies
    const g = this.gravity
    this.stamp++
    for (const b of B) {
      b.prevContacts = b.contacts
      b.contacts = 0
      b.hit = 0
      if (b.awake) {
        b.vy += g * dt
        // Circles roll to a stop only while touching something; free flight stays ballistic.
        const touching = b.prevContacts > 0
        const ld = b.circle ? (touching ? 0.7 : 0) : 0.04
        const ad = b.circle ? (touching ? 1.6 : 0.2) : 0.25
        b.vx /= 1 + dt * ld
        b.vy /= 1 + dt * ld * 0.2
        b.w /= 1 + dt * ad
      }
      updateGeo(b)
    }

    const n = B.length
    for (let i = 0; i < n; i++) {
      const a = B[i]
      for (let j = i + 1; j < n; j++) {
        const b = B[j]
        if (a.isStatic && b.isStatic) continue
        if (a.maxX + MARGIN < b.minX || b.maxX + MARGIN < a.minX || a.maxY + MARGIN < b.minY || b.maxY + MARGIN < a.minY) continue
        const first = a.id < b.id ? a : b
        const second = first === a ? b : a
        if (!collide(first, second)) continue
        a.contacts++
        b.contacts++
        if (!a.awake && !b.awake) continue
        // A fast awake body knocks a sleeper awake; a slow one leans on it as if static.
        if (!a.isStatic && !a.awake && b.awake && b.vx * b.vx + b.vy * b.vy > WAKE_SPEED * WAKE_SPEED) this.wake(a)
        if (!b.isStatic && !b.awake && a.awake && a.vx * a.vx + a.vy * a.vy > WAKE_SPEED * WAKE_SPEED) this.wake(b)
        const key = first.id * 65536 + second.id
        let arb = this.arbs.get(key)
        if (!arb) {
          arb = { a: first, b: second, nx: 0, ny: 0, cs: [], mu: Math.sqrt(first.mu * second.mu), e: Math.max(first.e, second.e), stamp: 0 }
          this.arbs.set(key, arb)
        }
        const old = arb.cs
        const cs: Contact[] = []
        for (let k = 0; k < M.n; k++) {
          const c: Contact = { x: M.px[k], y: M.py[k], sep: M.sep[k], pn: 0, pt: 0, rax: 0, ray: 0, rbx: 0, rby: 0, mn: 0, mt: 0, bias: 0 }
          for (const o of old) {
            if ((o.x - c.x) ** 2 + (o.y - c.y) ** 2 < 9) {
              c.pn = o.pn
              c.pt = o.pt
              break
            }
          }
          cs.push(c)
        }
        arb.cs = cs
        arb.nx = M.nx
        arb.ny = M.ny
        arb.stamp = this.stamp
      }
    }
    for (const [k, arb] of this.arbs) if (arb.stamp !== this.stamp) this.arbs.delete(k)

    // Sleepers that lost a support wake up
    for (const b of B) {
      if (!b.isStatic && !b.awake && (b.contacts < b.prevContacts || b.contacts === 0)) this.wake(b)
    }

    const invDt = 1 / dt
    this.impacts.length = 0
    for (const arb of this.arbs.values()) this.preStep(arb, invDt)
    for (let it = 0; it < ITER; it++) for (const arb of this.arbs.values()) this.applyImpulse(arb)

    for (const b of B) {
      if (!b.awake) continue
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.a += b.w * dt
      const sp = b.vx * b.vx + b.vy * b.vy
      if (sp < 64 && Math.abs(b.w) < 0.2) {
        b.sleepT += dt
        if (b.sleepT > 0.5 && b.mat !== 'ammo') {
          b.awake = false
          b.vx = 0
          b.vy = 0
          b.w = 0
        }
      } else b.sleepT = 0
    }
  }

  private preStep(arb: Arb, invDt: number) {
    const a = arb.a
    const b = arb.b
    const ima = a.awake ? a.invM : 0
    const imb = b.awake ? b.invM : 0
    const iia = a.awake ? a.invI : 0
    const iib = b.awake ? b.invI : 0
    const nx = arb.nx
    const ny = arb.ny
    const tx = ny
    const ty = -nx
    for (const c of arb.cs) {
      c.rax = c.x - a.x
      c.ray = c.y - a.y
      c.rbx = c.x - b.x
      c.rby = c.y - b.y
      const rna = c.rax * ny - c.ray * nx
      const rnb = c.rbx * ny - c.rby * nx
      c.mn = 1 / (ima + imb + iia * rna * rna + iib * rnb * rnb || 1)
      const rta = c.rax * ty - c.ray * tx
      const rtb = c.rbx * ty - c.rby * tx
      c.mt = 1 / (ima + imb + iia * rta * rta + iib * rtb * rtb || 1)
      const dvx = b.vx - b.w * c.rby - a.vx + a.w * c.ray
      const dvy = b.vy + b.w * c.rbx - a.vy - a.w * c.rax
      const vn = dvx * nx + dvy * ny
      c.bias = Math.min(300, -BAUMGARTE * invDt * Math.min(0, c.sep + SLOP))
      // Bounce only on fresh impacts; warm-started contacts already carry the support impulse.
      if (vn < -100 && c.pn === 0) c.bias = Math.max(c.bias, -arb.e * vn)
      if (vn < -IMPACT_MIN) {
        const s = -vn - IMPACT_MIN
        this.recordHit(a, b, s)
        this.recordHit(b, a, s)
        if (this.impacts.length < 6) this.impacts.push({ x: c.x, y: c.y, speed: -vn, a: a.mat, b: b.mat })
      }
      // Warm start
      const px = c.pn * nx + c.pt * tx
      const py = c.pn * ny + c.pt * ty
      a.vx -= ima * px
      a.vy -= ima * py
      a.w -= iia * (c.rax * py - c.ray * px)
      b.vx += imb * px
      b.vy += imb * py
      b.w += iib * (c.rbx * py - c.rby * px)
    }
  }

  private recordHit(self: Body, other: Body, s: number) {
    if (self.isStatic) return
    const ratio = other.isStatic ? 3 : Math.max(0.25, Math.min(3, other.m / self.m))
    const pow = other.mat === 'ammo' ? this.ammoPower : 1
    const d = s * 0.18 * Math.pow(ratio, 0.6) * pow
    if (d > self.hit) self.hit = d
  }

  private applyImpulse(arb: Arb) {
    const a = arb.a
    const b = arb.b
    const ima = a.awake ? a.invM : 0
    const imb = b.awake ? b.invM : 0
    const iia = a.awake ? a.invI : 0
    const iib = b.awake ? b.invI : 0
    const nx = arb.nx
    const ny = arb.ny
    const tx = ny
    const ty = -nx
    for (const c of arb.cs) {
      let dvx = b.vx - b.w * c.rby - a.vx + a.w * c.ray
      let dvy = b.vy + b.w * c.rbx - a.vy - a.w * c.rax
      const vn = dvx * nx + dvy * ny
      let dpn = c.mn * (-vn + c.bias)
      const pn0 = c.pn
      c.pn = Math.max(pn0 + dpn, 0)
      dpn = c.pn - pn0
      let px = dpn * nx
      let py = dpn * ny
      a.vx -= ima * px
      a.vy -= ima * py
      a.w -= iia * (c.rax * py - c.ray * px)
      b.vx += imb * px
      b.vy += imb * py
      b.w += iib * (c.rbx * py - c.rby * px)

      dvx = b.vx - b.w * c.rby - a.vx + a.w * c.ray
      dvy = b.vy + b.w * c.rbx - a.vy - a.w * c.rax
      const vt = dvx * tx + dvy * ty
      let dpt = c.mt * -vt
      const maxPt = arb.mu * c.pn
      const pt0 = c.pt
      c.pt = Math.max(-maxPt, Math.min(maxPt, pt0 + dpt))
      dpt = c.pt - pt0
      px = dpt * tx
      py = dpt * ty
      a.vx -= ima * px
      a.vy -= ima * py
      a.w -= iia * (c.rax * py - c.ray * px)
      b.vx += imb * px
      b.vy += imb * py
      b.w += iib * (c.rbx * py - c.rby * px)
    }
  }
}
