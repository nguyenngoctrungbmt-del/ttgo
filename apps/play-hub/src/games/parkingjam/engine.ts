/**
 * Parking Jam rules + generator.
 * Levels are built by reverse insertion: each new car must have a clear way out
 * (in its facing direction) past every car placed before it, so driving the cars
 * out newest-first always works with plain taps.
 */

export type Dir = 0 | 1 | 2 | 3 // 0 right, 1 down, 2 left, 3 up
export const DX = [1, 0, -1, 0]
export const DY = [0, 1, 0, -1]

export type Car = {
  id: number
  x: number
  y: number
  len: number
  /** Facing; the car's axis is horizontal for 0/2 and vertical for 1/3. */
  dir: Dir
  color: number
  /** Cars that must leave before this one thaws (0 = free). */
  ice: number
  gone: boolean
}

export type LevelSpec = {
  n: number
  cols: number
  rows: number
  cars: number
  trucks: number
  cones: number
  ice: number
  grandma: boolean
  hard: boolean
  time: number
  intro?: string
}

export type Level = { spec: LevelSpec; cars: Car[]; cones: number[]; side: Dir; cross: number }

export type Rng = () => number

export function makeRng(seed: number): Rng {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

export function specFor(n: number): LevelSpec {
  const hard = n % 5 === 0
  const base: LevelSpec = { n, cols: 5, rows: 5, cars: 6, trucks: 0, cones: 0, ice: 0, grandma: false, hard, time: 60 }
  const fix = (s: LevelSpec): LevelSpec => ({ ...s, time: Math.round(22 + s.cars * 3.4 + (s.grandma ? 10 : 0)) })
  switch (n) {
    case 1:
      return fix({ ...base, cols: 4, rows: 5, cars: 4, intro: 'tap a car to drive it out' })
    case 2:
      return fix({ ...base, cols: 5, rows: 5, cars: 7, intro: 'blocked cars bump — the driver gets angry' })
    case 3:
      return fix({ ...base, cols: 5, rows: 6, cars: 9, intro: 'swipe a car to drive it in reverse' })
    case 4:
      return fix({ ...base, cols: 6, rows: 6, cars: 10, trucks: 2, intro: 'trucks are long — plan their way out' })
    case 5:
      return fix({ ...base, cols: 6, rows: 7, cars: 14, trucks: 2, cones: 2 })
  }
  const k = n - 5
  return fix({
    ...base,
    cols: Math.min(8, 6 + Math.floor(k / 4)),
    rows: Math.min(10, 7 + Math.floor(k / 3)),
    cars: Math.min(30, 13 + Math.floor(k * 1.1) + (hard ? 3 : 0)),
    trucks: Math.min(6, 2 + Math.floor(k / 3)),
    cones: Math.min(5, 1 + Math.floor(k / 3)),
    grandma: n >= 7,
    ice: n >= 9 ? Math.min(4, 1 + Math.floor((n - 9) / 4)) : 0,
    intro: n === 7 ? 'wait for grandma to cross!' : n === 9 ? 'iced cars thaw as others leave' : n === 6 ? 'cones never move' : undefined,
  })
}

/** Cells a car covers, back to front. */
export function cellsOf(c: { x: number; y: number; len: number; dir: Dir }): [number, number][] {
  const out: [number, number][] = []
  // (x, y) is the rear cell; the car extends toward its facing
  for (let k = 0; k < c.len; k++) out.push([c.x + DX[c.dir] * k, c.y + DY[c.dir] * k])
  return out
}

export function occupancy(cols: number, rows: number, cars: Car[], cones: number[], skip = -1): Int32Array {
  const occ = new Int32Array(cols * rows).fill(-1)
  for (const i of cones) occ[i] = -2
  for (const c of cars) {
    if (c.gone || c.id === skip) continue
    for (const [x, y] of cellsOf(c)) occ[y * cols + x] = c.id
  }
  return occ
}

export type Drive = { exits: boolean; steps: number; blocker: number; edge: boolean }

/**
 * Drive car in direction d (must be along its axis). Returns how many cells it
 * moves and whether it leaves the lot; blocker = car id (-2 cone, -1 none).
 */
export function drive(cols: number, rows: number, occ: Int32Array, c: Car, d: Dir): Drive {
  const cells = cellsOf(c)
  // leading cell in direction d
  const lead = d === c.dir ? cells[cells.length - 1] : cells[0]
  let x = lead[0]
  let y = lead[1]
  let steps = 0
  for (;;) {
    x += DX[d]
    y += DY[d]
    if (x < 0 || y < 0 || x >= cols || y >= rows) return { exits: true, steps, blocker: -1, edge: true }
    const o = occ[y * cols + x]
    if (o !== -1 && o !== c.id) return { exits: false, steps, blocker: o, edge: false }
    steps++
  }
}

function fits(cols: number, rows: number, occ: Int32Array, c: Car) {
  for (const [x, y] of cellsOf(c)) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return false
    if (occ[y * cols + x] !== -1) return false
  }
  return true
}

export function generate(spec: LevelSpec, seed: number): Level {
  const rng = makeRng(seed)
  let best: Level | null = null
  for (let attempt = 0; attempt < 30; attempt++) {
    const lv = tryGen(spec, rng)
    if (!best || lv.cars.length > best.cars.length) best = lv
    if (lv.cars.length >= spec.cars) break
  }
  return best!
}

function tryGen(spec: LevelSpec, rng: Rng): Level {
  const { cols, rows } = spec
  const cones: number[] = []
  while (cones.length < spec.cones) {
    const x = 1 + Math.floor(rng() * (cols - 2))
    const y = 1 + Math.floor(rng() * (rows - 2))
    const i = y * cols + x
    if (!cones.includes(i)) cones.push(i)
  }
  const cars: Car[] = []
  let trucks = 0
  let colorSeq = Math.floor(rng() * 8)
  for (let tries = 0; tries < 900 && cars.length < spec.cars; tries++) {
    const occ = occupancy(cols, rows, cars, cones)
    // sample several candidates, keep the one that blocks the most existing exits
    let pick: Car | null = null
    let pickScore = -1
    for (let s = 0; s < 30; s++) {
      const len = trucks < spec.trucks && rng() < 0.35 ? 3 : 2
      const dir = Math.floor(rng() * 4) as Dir
      const c: Car = { id: cars.length, x: Math.floor(rng() * cols), y: Math.floor(rng() * rows), len, dir, color: 0, ice: 0, gone: false }
      if (!fits(cols, rows, occ, c)) continue
      if (!drive(cols, rows, occ, c, dir).exits) continue
      // how many earlier cars does it block (in their facing)?
      const occ2 = occupancy(cols, rows, [...cars, c], cones)
      let score = 0
      for (const o of cars) if (!drive(cols, rows, occ2, o, o.dir).exits) score++
      score = score * 2 + rng() * 1.5
      if (score > pickScore) {
        pickScore = score
        pick = c
      }
    }
    if (!pick) continue
    if (pick.len === 3) trucks++
    pick.color = colorSeq++ % 8
    cars.push(pick)
  }
  // ice: solution removes cars newest-first, so car k leaves after (n-1-k) others
  const n = cars.length
  const iceCand = cars.filter((c) => n - 1 - c.id >= 3)
  for (let k = 0; k < spec.ice && iceCand.length; k++) {
    const c = iceCand.splice(Math.floor(rng() * iceCand.length), 1)[0]
    c.ice = Math.max(2, Math.min(n - 1 - c.id, 3 + Math.floor(rng() * 6)))
  }
  const side = Math.floor(rng() * 4) as Dir
  const span = side === 0 || side === 2 ? rows : cols
  const cross = Math.floor(rng() * Math.max(1, span - 1))
  return { spec, cars, cones, side, cross }
}
