/**
 * Screw Jam level model + generator.
 * Board coordinates are normalised: x in [0,1], y in [0,BH]. A screw is free when no attached plate
 * with a higher z covers its point. Levels are built with a witness removal order (top-down) that
 * is replayed against the toolbox queue + spare tray, so every level is provably solvable.
 */

export const BH = 1.12
export const SCREW_R = 0.045
const SPACING = 0.105

export type PlateKind = 'bar' | 'box' | 'disc'
export type Plate = {
  id: number
  kind: PlateKind
  x: number
  y: number
  hw: number
  hh: number
  ang: number
  z: number
  tint: number
  attached: boolean
}
export type Screw = { id: number; plate: number; x: number; y: number; color: number; ice: number; hidden: boolean }
export type LevelDef = {
  n: number
  plates: Plate[]
  screws: Screw[]
  boxes: number[]
  active: number
  colors: number
  hard: boolean
  tip?: string
  name?: string
}

function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

export function isHard(n: number) {
  return n >= 5 && n % 5 === 0
}

/** Signed distance from point to plate outline (negative inside). */
export function plateDist(p: Plate, x: number, y: number) {
  const dx0 = x - p.x
  const dy0 = y - p.y
  if (p.kind === 'disc') return Math.hypot(dx0, dy0) - p.hw
  const c = Math.cos(-p.ang)
  const s = Math.sin(-p.ang)
  const lx = dx0 * c - dy0 * s
  const ly = dx0 * s + dy0 * c
  const r = Math.min(p.hw, p.hh) * (p.kind === 'bar' ? 1 : 0.35)
  const qx = Math.abs(lx) - (p.hw - r)
  const qy = Math.abs(ly) - (p.hh - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

/** Is screw `s` covered by an attached plate above its own? */
export function covered(s: Screw, plates: Plate[], byId: Map<number, Plate>) {
  const own = byId.get(s.plate)!
  for (const p of plates) {
    if (!p.attached || p.z <= own.z) continue
    if (plateDist(p, s.x, s.y) < SCREW_R * 0.55) return true
  }
  return false
}

function holesFor(p: Plate, r: () => number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = []
  const c = Math.cos(p.ang)
  const s = Math.sin(p.ang)
  const at = (lx: number, ly: number) => out.push({ x: p.x + lx * c - ly * s, y: p.y + lx * s + ly * c })
  if (p.kind === 'bar') {
    const e = p.hw - p.hh
    at(-e, 0)
    at(e, 0)
    if (p.hw > 0.26 && r() < 0.5) at(0, 0)
  } else if (p.kind === 'box') {
    const ix = p.hw - 0.06
    const iy = p.hh - 0.06
    if (r() < 0.5) {
      at(-ix, -iy)
      at(ix, iy)
    } else {
      at(-ix, -iy)
      at(ix, -iy)
      at(-ix, iy)
      at(ix, iy)
    }
  } else {
    if (p.hw > 0.13 && r() < 0.6) {
      at(-p.hw * 0.5, 0)
      at(p.hw * 0.5, 0)
    } else at(0, 0)
  }
  return out
}

type Spec = { plates: number; screws: number; colors: number; swaps: number; margin: number; ice: number; hidden: number; tip?: string }

function specFor(n: number): Spec {
  if (n === 1) return { plates: 2, screws: 6, colors: 2, swaps: 0, margin: 4, ice: 0, hidden: 0, tip: 'tap a screw — it flies to its box' }
  if (n === 2) return { plates: 3, screws: 9, colors: 3, swaps: 0, margin: 4, ice: 0, hidden: 0, tip: 'plates on top block the screws below' }
  if (n === 3) return { plates: 4, screws: 12, colors: 3, swaps: 3, margin: 3, ice: 0, hidden: 0, tip: 'no matching box? it waits in the tray' }
  if (n === 4) return { plates: 5, screws: 15, colors: 4, swaps: 5, margin: 3, ice: 0, hidden: 0 }
  if (n === 6) return { plates: 6, screws: 18, colors: 4, swaps: 6, margin: 2, ice: 3, hidden: 0, tip: 'icy screws need two taps' }
  if (n === 8) return { plates: 7, screws: 21, colors: 5, swaps: 8, margin: 2, ice: 2, hidden: 4, tip: 'grey screws reveal their colour when uncovered' }
  const hard = isHard(n)
  const plates = Math.min(12, 4 + Math.floor(n / 2) + (hard ? 2 : 0))
  return {
    plates,
    screws: Math.min(39, Math.round((plates * 2.6) / 3) * 3),
    colors: Math.min(8, 3 + Math.floor(n / 3)),
    swaps: 6 + n + (hard ? 8 : 0),
    margin: hard ? 1 : 2,
    ice: n >= 6 ? Math.min(6, Math.floor(n / 4)) : 0,
    hidden: n >= 8 ? Math.min(8, Math.floor(n / 3)) : 0,
  }
}

/** Replays a removal order against the box queue and spare tray; returns peak tray use or -1 if it overflows. */
function replay(colorsInOrder: number[], boxes: number[], active: number, tray: number) {
  const queue = boxes.slice()
  const open: { c: number; n: number }[] = []
  while (open.length < active && queue.length) open.push({ c: queue.shift()!, n: 0 })
  const held: number[] = []
  let peak = 0
  const settle = () => {
    for (let guard = 0; guard < 50; guard++) {
      const full = open.findIndex((b) => b.n >= 3)
      if (full < 0) return
      if (queue.length) {
        open[full] = { c: queue.shift()!, n: 0 }
        for (let i = held.length - 1; i >= 0 && open[full].n < 3; i--) {
          if (held[i] === open[full].c) {
            held.splice(i, 1)
            open[full].n++
          }
        }
      } else open.splice(full, 1)
    }
  }
  for (const c of colorsInOrder) {
    const b = open.find((o) => o.c === c && o.n < 3)
    if (b) b.n++
    else {
      held.push(c)
      peak = Math.max(peak, held.length)
      if (held.length >= tray) return -1
    }
    settle()
  }
  return peak
}

let uid = 1

function build(n: number, spec: Spec, r: () => number, tray: number): LevelDef | null {
  const plates: Plate[] = []
  const holes: { x: number; y: number; plate: number }[] = []
  let tries = 0
  while (holes.length < spec.screws && tries++ < 400) {
    const kr = r()
    const kind: PlateKind = kr < 0.55 ? 'bar' : kr < 0.8 ? 'box' : 'disc'
    const angs = [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4, Math.PI / 6, -Math.PI / 6]
    const p: Plate = {
      id: uid++,
      kind,
      x: 0.2 + r() * 0.6,
      y: 0.18 + r() * (BH - 0.36),
      hw: kind === 'bar' ? 0.17 + r() * 0.17 : kind === 'box' ? 0.12 + r() * 0.07 : 0.09 + r() * 0.07,
      hh: kind === 'bar' ? 0.055 + r() * 0.012 : 0,
      ang: kind === 'disc' ? 0 : angs[Math.floor(r() * angs.length)],
      z: plates.length,
      tint: Math.floor(r() * 4),
      attached: true,
    }
    if (kind === 'box') p.hh = p.hw * (0.75 + r() * 0.35)
    if (kind === 'disc') p.hh = p.hw
    const hs = holesFor(p, r)
    // keep plate inside the board
    const ext = Math.max(p.hw, p.hh) + 0.01
    if (p.x - ext < 0.02 && p.kind !== 'bar') continue
    let ok = hs.every((h) => h.x > 0.06 && h.x < 0.94 && h.y > 0.06 && h.y < BH - 0.06)
    if (p.kind === 'bar') {
      const ex = Math.abs(Math.cos(p.ang)) * p.hw + Math.abs(Math.sin(p.ang)) * p.hh
      const ey = Math.abs(Math.sin(p.ang)) * p.hw + Math.abs(Math.cos(p.ang)) * p.hh
      ok = ok && p.x - ex > 0.01 && p.x + ex < 0.99 && p.y - ey > 0.01 && p.y + ey < BH - 0.01
    } else ok = ok && p.x - p.hw > 0.01 && p.x + p.hw < 0.99 && p.y - p.hh > 0.01 && p.y + p.hh < BH - 0.01
    ok = ok && hs.every((h) => holes.every((o) => Math.hypot(o.x - h.x, o.y - h.y) > SPACING))
    if (!ok) continue
    // prefer overlap with existing plates after the first
    if (plates.length && !plates.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < q.hw + p.hw) && r() < 0.7) continue
    plates.push(p)
    for (const h of hs) holes.push({ ...h, plate: p.id })
  }
  if (holes.length < 3) return null
  // trim to a multiple of 3 by removing holes from plates that keep at least one
  const want = Math.max(3, Math.floor(Math.min(holes.length, spec.screws) / 3) * 3)
  let excess = holes.length - want
  for (let i = holes.length - 1; i >= 0 && excess > 0; i--) {
    const pid = holes[i].plate
    if (holes.filter((h) => h.plate === pid).length > 1) {
      holes.splice(i, 1)
      excess--
    }
  }
  if (holes.length % 3 !== 0) return null
  const screws: Screw[] = holes.map((h) => ({ id: uid++, plate: h.plate, x: h.x, y: h.y, color: 0, ice: 0, hidden: false }))
  return colorize(n, plates, screws, spec, r, tray)
}

/** Colours screws along a random witness removal order, scrambled while the witness still fits the tray. */
function colorize(n: number, plates: Plate[], screws: Screw[], spec: Spec, r: () => number, tray: number): LevelDef | null {
  for (const p of plates) p.attached = true
  // witness order: random free screw each step
  const byId = new Map(plates.map((p) => [p.id, p]))
  const left = screws.slice()
  const order: Screw[] = []
  while (left.length) {
    const free = left.filter((s) => !covered(s, plates, byId))
    if (!free.length) return null
    const s = free[Math.floor(r() * free.length)]
    order.push(s)
    left.splice(left.indexOf(s), 1)
    const p = byId.get(s.plate)!
    if (!left.some((o) => o.plate === p.id)) p.attached = false
  }
  for (const p of plates) p.attached = true
  // colours: triples along the order, then local swaps that keep the witness valid
  const boxCount = order.length / 3
  const boxes: number[] = []
  for (let i = 0; i < boxCount; i++) {
    let c = Math.floor(r() * spec.colors)
    if (i < spec.colors) c = i
    boxes.push(c)
  }
  for (let i = boxes.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[boxes[i], boxes[j]] = [boxes[j], boxes[i]]
  }
  const seq = order.map((_, i) => boxes[Math.floor(i / 3)])
  const active = 2
  const safe = Math.max(2, tray - spec.margin)
  for (let k = 0; k < spec.swaps * 3; k++) {
    const i = Math.floor(r() * seq.length)
    const j = Math.min(seq.length - 1, Math.max(0, i + Math.floor((r() - 0.5) * 10)))
    if (seq[i] === seq[j]) continue
    ;[seq[i], seq[j]] = [seq[j], seq[i]]
    if (replay(seq, boxes, active, safe + 1) < 0) [seq[i], seq[j]] = [seq[j], seq[i]]
  }
  if (replay(seq, boxes, active, safe + 1) < 0) return null
  order.forEach((s, i) => (s.color = seq[i]))
  const pool = screws.slice()
  for (let i = 0; i < spec.ice && pool.length; i++) pool.splice(Math.floor(r() * pool.length), 1)[0].ice = 1
  const covers = screws.filter((s) => covered(s, plates, byId))
  for (let i = 0; i < spec.hidden && covers.length; i++) covers.splice(Math.floor(r() * covers.length), 1)[0].hidden = true
  return { n, plates, screws, boxes, active, colors: spec.colors, hard: isHard(n), tip: spec.tip }
}

export function makeLevel(n: number, seed: number, tray = 5): LevelDef {
  const spec = specFor(n)
  const r = rng(seed * 2654435761 + n * 97)
  for (let attempt = 0; attempt < 200; attempt++) {
    const lv = build(n, spec, r, tray)
    if (lv && lv.screws.length >= Math.min(spec.screws, 6)) return lv
  }
  // fallback: two uncovered bars
  const plates: Plate[] = [
    { id: uid++, kind: 'bar', x: 0.5, y: 0.35, hw: 0.3, hh: 0.06, ang: 0, z: 0, tint: 0, attached: true },
    { id: uid++, kind: 'bar', x: 0.5, y: 0.75, hw: 0.3, hh: 0.06, ang: 0, z: 1, tint: 1, attached: true },
  ]
  const screws: Screw[] = []
  for (const p of plates) for (const dx of [-0.24, 0, 0.24]) screws.push({ id: uid++, plate: p.id, x: p.x + dx, y: p.y, color: p.z, ice: 0, hidden: false })
  return { n, plates, screws, boxes: [0, 1], active: 2, colors: 2, hard: false }
}

// ── Authored levels ───────────────────────────────────────
/** Hand-placed plate: angles in degrees, `n` = number of screw holes. Later plates sit on top. */
export type APlate =
  | { k: 'bar'; x: number; y: number; hw: number; a: number; n: 2 | 3 }
  | { k: 'box'; x: number; y: number; hw: number; hh: number; a: number; n: 2 | 4 }
  | { k: 'disc'; x: number; y: number; hw: number; n: 1 | 2 }
export type AuthoredLevel = {
  name: string
  plates: APlate[]
  colors: number
  /** Scramble strength of the colour order (more = harder). */
  swaps: number
  /** Tray slots the witness solution keeps free (more = easier). */
  margin: number
  ice?: number
  hidden?: number
  tip?: string
}

export function authoredHoles(a: APlate, p: Plate) {
  const out: { x: number; y: number }[] = []
  const c = Math.cos(p.ang)
  const s = Math.sin(p.ang)
  const at = (lx: number, ly: number) => out.push({ x: p.x + lx * c - ly * s, y: p.y + lx * s + ly * c })
  if (a.k === 'bar') {
    const e = p.hw - p.hh
    at(-e, 0)
    if (a.n === 3) at(0, 0)
    at(e, 0)
  } else if (a.k === 'box') {
    const ix = p.hw - 0.06
    const iy = p.hh - 0.06
    at(-ix, -iy)
    if (a.n === 4) at(ix, -iy)
    if (a.n === 4) at(-ix, iy)
    at(ix, iy)
  } else if (a.n === 2) {
    at(-p.hw * 0.5, 0)
    at(p.hw * 0.5, 0)
  } else at(0, 0)
  return out
}

/** Builds an authored level. Holes closer than the screw spacing to an earlier hole are skipped. */
export function authoredLevel(n: number, a: AuthoredLevel, tray = 5): LevelDef {
  const plates: Plate[] = []
  const holes: { x: number; y: number; plate: number }[] = []
  a.plates.forEach((ap, i) => {
    const p: Plate = {
      id: uid++,
      kind: ap.k,
      x: ap.x,
      y: ap.y,
      hw: ap.hw,
      hh: ap.k === 'bar' ? 0.06 : ap.k === 'box' ? ap.hh : ap.hw,
      ang: ap.k === 'disc' ? 0 : (ap.a * Math.PI) / 180,
      z: i,
      tint: i % 4,
      attached: true,
    }
    plates.push(p)
    for (const h of authoredHoles(ap, p)) if (holes.every((o) => Math.hypot(o.x - h.x, o.y - h.y) >= SPACING * 0.98)) holes.push({ ...h, plate: p.id })
  })
  // trim to a multiple of 3 from the top plates down (keeping a hole on every plate)
  for (let i = holes.length - 1; i >= 0 && holes.length % 3; i--) {
    if (holes.filter((h) => h.plate === holes[i].plate).length > 1) holes.splice(i, 1)
  }
  const usedPlates = new Set(holes.map((h) => h.plate))
  const live = plates.filter((p) => usedPlates.has(p.id))
  const spec: Spec = { plates: live.length, screws: holes.length, colors: a.colors, swaps: a.swaps, margin: a.margin, ice: a.ice ?? 0, hidden: a.hidden ?? 0, tip: a.tip }
  const r = rng(n * 7919 + 17)
  for (let attempt = 0; attempt < 60; attempt++) {
    const screws: Screw[] = holes.map((h) => ({ id: uid++, plate: h.plate, x: h.x, y: h.y, color: 0, ice: 0, hidden: false }))
    const lv = colorize(n, live, screws, spec, r, tray)
    if (lv) return { ...lv, name: a.name }
  }
  return makeLevel(n, n, tray)
}
