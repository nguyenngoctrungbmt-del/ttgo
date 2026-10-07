/**
 * Bus Jam rules + constructive level generator.
 * The generator plays the level forward with the real rules (random reachable
 * passenger, colour chosen so the move is legal), so every level is solvable.
 */

export const SEATS = 3

export type Cell = {
  kind: 'empty' | 'wall' | 'p' | 'tunnel'
  color: number
  hidden: boolean
  /** Passengers that must leave the yard before this one thaws (0 = free). */
  frozen: number
  /** Index of the linked VIP partner cell, or -1. */
  pair: number
  /** Tunnel only: colours still inside, and the cell they step out into. */
  queue: number[]
  front: number
}

export type LBus = { id: number; color: number; assigned: number }

export type Logic = {
  queue: { id: number; color: number }[]
  stops: (LBus | null)[]
  bench: (number | null)[]
}

export type LevelSpec = {
  n: number
  cols: number
  rows: number
  colors: number
  buses: number
  walls: number
  hidden: number
  frozen: number
  tunnels: number
  pairs: number
  stops: number
  /** Bench seats the generator is allowed to use on its solution path. */
  slack: number
  /** Chance the generator parks a passenger on the bench. */
  park: number
  hard: boolean
  intro?: string
}

export type Level = {
  spec: LevelSpec
  cells: Cell[]
  buses: number[]
}

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
  const base: LevelSpec = { n, cols: 5, rows: 5, colors: 3, buses: 5, walls: 0, hidden: 0, frozen: 0, tunnels: 0, pairs: 0, stops: 1, slack: 0, park: 0, hard }
  switch (n) {
    case 1:
      return { ...base, cols: 4, rows: 3, colors: 2, buses: 3, intro: 'tap a passenger with a clear path' }
    case 2:
      return { ...base, cols: 5, rows: 4, colors: 3, buses: 5, walls: 1, intro: 'blocked passengers wait their turn' }
    case 3:
      return { ...base, cols: 5, rows: 5, colors: 3, buses: 6, walls: 2, slack: 3, park: 0.45, intro: 'wrong colour? they wait on the bench' }
    case 4:
      return { ...base, cols: 5, rows: 5, colors: 4, buses: 7, walls: 2, hidden: 5, slack: 3, park: 0.5, intro: 'mystery passengers reveal when reachable' }
    case 5:
      return { ...base, cols: 6, rows: 6, colors: 4, buses: 10, walls: 3, hidden: 4, slack: 4, park: 0.6 }
  }
  const k = n - 5
  return {
    ...base,
    cols: Math.min(7, 6 + (k >= 6 ? 1 : 0)),
    rows: Math.min(8, 6 + Math.floor(k / 5)),
    colors: Math.min(7, 4 + Math.floor(k / 4) + (hard ? 1 : 0)),
    buses: Math.min(17, 9 + Math.floor(k / 1.6) + (hard ? 2 : 0)),
    walls: 2 + (n % 3),
    hidden: Math.min(10, 3 + Math.floor(k / 2)),
    frozen: n >= 6 ? Math.min(4, 1 + Math.floor((n - 6) / 4)) : 0,
    stops: n >= 8 && n % 4 === 0 && !hard ? 2 : 1,
    tunnels: n >= 9 ? Math.min(2, 1 + Math.floor((n - 9) / 6)) : 0,
    pairs: n >= 11 ? Math.min(3, 1 + Math.floor((n - 11) / 5)) : 0,
    slack: 4,
    park: Math.min(0.72, 0.5 + k * 0.012 + (hard ? 0.12 : 0)),
    intro: n === 6 ? 'frozen passengers thaw as others leave' : n === 8 ? 'two buses at the stop' : n === 9 ? 'tunnels send out more passengers' : n === 11 ? 'VIP pairs travel together' : undefined,
  }
}

export function idx(spec: { cols: number }, c: number, r: number) {
  return r * spec.cols + c
}

export function neighbors(cols: number, rows: number, i: number): number[] {
  const c = i % cols
  const r = Math.floor(i / cols)
  const out: number[] = []
  if (r > 0) out.push(i - cols)
  if (c > 0) out.push(i - 1)
  if (c < cols - 1) out.push(i + 1)
  if (r < rows - 1) out.push(i + cols)
  return out
}

/** Empty cells connected to the exit (above row 0). */
export function openSet(cells: Cell[], cols: number, rows: number): Uint8Array {
  const seen = new Uint8Array(cells.length)
  const q: number[] = []
  for (let c = 0; c < cols; c++) {
    if (cells[c].kind === 'empty') {
      seen[c] = 1
      q.push(c)
    }
  }
  while (q.length) {
    const i = q.pop()!
    for (const j of neighbors(cols, rows, i)) {
      if (!seen[j] && cells[j].kind === 'empty') {
        seen[j] = 1
        q.push(j)
      }
    }
  }
  return seen
}

export function reachable(cells: Cell[], cols: number, rows: number, i: number, open?: Uint8Array): boolean {
  if (cells[i].kind !== 'p') return false
  if (i < cols) return true
  const o = open ?? openSet(cells, cols, rows)
  return neighbors(cols, rows, i).some((j) => o[j])
}

/** Walk path (cell indices) from i to the top row through empty cells, i included. */
export function pathOut(cells: Cell[], cols: number, rows: number, i: number): number[] {
  if (i < cols) return [i]
  const prev = new Int32Array(cells.length).fill(-2)
  const q: number[] = [i]
  prev[i] = -1
  let end = -1
  while (q.length) {
    const a = q.shift()!
    if (a < cols && a !== i) {
      end = a
      break
    }
    for (const j of neighbors(cols, rows, a)) {
      if (prev[j] === -2 && cells[j].kind === 'empty') {
        prev[j] = a
        q.push(j)
      }
    }
  }
  if (end < 0) return [i]
  const path: number[] = []
  for (let a = end; a !== -1; a = prev[a]) path.push(a)
  return path.reverse()
}

// ── Rules ─────────────────────────────────────────

export type PlaceResult = { kind: 'bus'; busId: number; slot: number; seat: number } | { kind: 'bench'; seat: number } | null

export function newLogic(buses: number[], stops: number, benchCap: number): Logic {
  const L: Logic = { queue: buses.map((color, id) => ({ id, color })), stops: [], bench: Array.from({ length: benchCap }, () => null) }
  for (let s = 0; s < stops; s++) L.stops.push(pull(L))
  return L
}

function pull(L: Logic): LBus | null {
  const b = L.queue.shift()
  return b ? { id: b.id, color: b.color, assigned: 0 } : null
}

export function freeSeatsFor(L: Logic, color: number) {
  let n = 0
  for (const b of L.stops) if (b && b.color === color) n += SEATS - b.assigned
  return n
}

export function benchFree(L: Logic) {
  return L.bench.reduce<number>((n, s) => n + (s == null ? 1 : 0), 0)
}

/** Room for a passenger (or a pair) of this colour right now. */
export function room(L: Logic, color: number) {
  return freeSeatsFor(L, color) + benchFree(L)
}

export type Board = { from: 'bench'; seat: number; busId: number; slot: number; busSeat: number }
export type Event = { kind: 'full'; busId: number; slot: number } | { kind: 'arrive'; busId: number; slot: number; color: number } | Board

/**
 * Seat a passenger of `color`: matching bus at the stop first, else the bench.
 * Full buses leave and the next one arrives; waiting bench passengers hop on.
 */
export function place(L: Logic, color: number, events: Event[]): PlaceResult {
  for (let s = 0; s < L.stops.length; s++) {
    const b = L.stops[s]
    if (b && b.color === color && b.assigned < SEATS) {
      const seat = b.assigned++
      if (b.assigned >= SEATS) cycle(L, s, events)
      return { kind: 'bus', busId: b.id, slot: s, seat }
    }
  }
  const seat = L.bench.findIndex((x) => x == null)
  if (seat < 0) return null
  L.bench[seat] = color
  return { kind: 'bench', seat }
}

function cycle(L: Logic, s: number, events: Event[]) {
  const old = L.stops[s]!
  events.push({ kind: 'full', busId: old.id, slot: s })
  const nb = pull(L)
  L.stops[s] = nb
  if (!nb) return
  events.push({ kind: 'arrive', busId: nb.id, slot: s, color: nb.color })
  for (let i = 0; i < L.bench.length && nb.assigned < SEATS; i++) {
    if (L.bench[i] === nb.color) {
      L.bench[i] = null
      const busSeat = nb.assigned++
      events.push({ from: 'bench', seat: i, busId: nb.id, slot: s, busSeat })
    }
  }
  if (nb.assigned >= SEATS) cycle(L, s, events)
}

/** Tunnels push their next passenger out when the cell in front is empty. */
export function spawnTunnels(cells: Cell[], onSpawn?: (tunnel: number, cell: number) => void) {
  cells.forEach((t, ti) => {
    if (t.kind !== 'tunnel' || !t.queue.length) return
    const f = cells[t.front]
    if (f.kind !== 'empty') return
    f.kind = 'p'
    f.color = t.queue.shift()!
    f.hidden = false
    f.frozen = 0
    f.pair = -1
    onSpawn?.(ti, t.front)
  })
}

// ── Generator ─────────────────────────────────────

function emptyCell(): Cell {
  return { kind: 'empty', color: -1, hidden: false, frozen: 0, pair: -1, queue: [], front: -1 }
}

function busOrder(spec: LevelSpec, rng: Rng): number[] {
  const out: number[] = []
  for (let i = 0; i < spec.buses; i++) {
    let c = i < spec.colors ? i : Math.floor(rng() * spec.colors)
    if (i >= 2 && out[i - 1] === c && out[i - 2] === c) c = (c + 1) % spec.colors
    out.push(c)
  }
  // shuffle the first `colors` so the intro order is not always 0,1,2
  for (let i = Math.min(spec.colors, out.length) - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function tryGenerate(spec: LevelSpec, rng: Rng): Level | null {
  const { cols, rows } = spec
  const N = cols * rows
  const cells: Cell[] = Array.from({ length: N }, emptyCell)
  const buses = busOrder(spec, rng)
  const total = buses.length * SEATS

  // walls (never on the top row), keeping every open cell connected to the exit
  for (let k = 0, tries = 0; k < spec.walls && tries < 60; tries++) {
    const i = cols + Math.floor(rng() * (N - cols))
    if (cells[i].kind !== 'empty') continue
    cells[i].kind = 'wall'
    const o = openSet(cells, cols, rows)
    if (cells.some((c, j) => c.kind === 'empty' && !o[j])) cells[i].kind = 'empty'
    else k++
  }
  // tunnels on the side / bottom edge pointing inward
  const tunnelCells: number[] = []
  for (let k = 0, tries = 0; k < spec.tunnels && tries < 80; tries++) {
    const i = cols * 2 + Math.floor(rng() * (N - cols * 2))
    const c = i % cols
    const r = Math.floor(i / cols)
    if (cells[i].kind !== 'empty') continue
    let front = -1
    if (c === 0) front = i + 1
    else if (c === cols - 1) front = i - 1
    else if (r === rows - 1) front = i - cols
    if (front < 0 || cells[front].kind !== 'empty' || tunnelCells.some((t) => cells[t].front === front)) continue
    cells[i].kind = 'tunnel'
    cells[i].front = front
    const o = openSet(cells, cols, rows)
    if (cells.some((cc, j) => cc.kind === 'empty' && !o[j])) {
      cells[i].kind = 'empty'
      continue
    }
    tunnelCells.push(i)
    k++
  }
  const inTunnels = tunnelCells.length ? Math.min(3 + Math.floor(spec.n / 10), Math.floor(total / 6)) : 0
  const tunnelLoad = tunnelCells.map((_, k) => Math.floor(inTunnels / tunnelCells.length) + (k < inTunnels % tunnelCells.length ? 1 : 0))
  const gridCount = total - tunnelLoad.reduce((a, b) => a + b, 0)
  const free = cells.map((c, i) => (c.kind === 'empty' ? i : -1)).filter((i) => i >= 0)
  if (free.length < gridCount) return null
  // leave a few gaps, preferring deeper rows so the top row stays packed
  const gaps = free.length - gridCount
  const order = [...free].sort((a, b) => Math.floor(b / cols) - Math.floor(a / cols) + (rng() - 0.5) * 3)
  const holes = new Set(order.slice(0, gaps))
  for (const i of free) if (!holes.has(i)) cells[i].kind = 'p'
  // a tunnel front must start empty or occupied; both fine

  // forward-simulate a solution, assigning colours on the way
  const sim = cells.map((c) => ({ ...c, queue: [] as number[] }))
  const tunnelLeft = tunnelLoad.slice()
  const assigned = new Int32Array(N).fill(-1)
  const pickIndex = new Int32Array(N).fill(-1)
  const quota = new Array(spec.colors).fill(0)
  for (const b of buses) quota[b] += SEATS
  const L = newLogic(buses, spec.stops, spec.slack)
  const spawnOrder: number[][] = tunnelCells.map(() => [])
  const pairsWanted = spec.pairs
  let pairsMade = 0
  const pairOf = new Int32Array(N).fill(-1)
  let picks = 0
  const spawn = () => {
    tunnelCells.forEach((t, k) => {
      const f = sim[sim[t].front]
      if (tunnelLeft[k] > 0 && f.kind === 'empty') {
        f.kind = 'p'
        f.color = -1
        tunnelLeft[k]--
        spawnOrder[k].push(-1)
        ;(f as Cell & { fromTunnel?: number }).fromTunnel = k
      }
    })
  }
  spawn()
  const ev: Event[] = []
  let guard = 0
  while (guard++ < 2000) {
    const open = openSet(sim, cols, rows)
    const cand: number[] = []
    for (let i = 0; i < N; i++) if (sim[i].kind === 'p' && sim[i].color === -1 && reachable(sim, cols, rows, i, open)) cand.push(i)
    if (!cand.length) break
    const i = cand[Math.floor(rng() * cand.length)]
    // colour choice
    const busColors = L.stops.filter((b): b is LBus => !!b && b.assigned < SEATS).map((b) => b.color)
    const matchOk = busColors.filter((c) => quota[c] > 0)
    const parkOk: number[] = []
    if (benchFree(L) > 0) for (let c = 0; c < spec.colors; c++) if (quota[c] > 0 && !busColors.includes(c)) parkOk.push(c)
    let color: number
    if (parkOk.length && (rng() < spec.park || !matchOk.length)) color = parkOk[Math.floor(rng() * parkOk.length)]
    else if (matchOk.length) color = matchOk[Math.floor(rng() * matchOk.length)]
    else return null
    // maybe make a VIP pair with a neighbour that becomes reachable once i leaves
    let mate = -1
    const fromTunnel = (c: Cell) => (c as Cell & { fromTunnel?: number }).fromTunnel != null
    if (pairsMade < pairsWanted && picks > 2 && quota[color] >= 2 && room(L, color) >= 2 && !fromTunnel(sim[i]) && rng() < 0.5) {
      const nb = neighbors(cols, rows, i).filter((j) => sim[j].kind === 'p' && sim[j].color === -1 && !fromTunnel(sim[j]))
      if (nb.length) mate = nb[Math.floor(rng() * nb.length)]
    }
    for (const who of mate >= 0 ? [i, mate] : [i]) {
      sim[who].color = color
      quota[color]--
      const r = place(L, color, ev)
      if (!r) return null
      const k = (sim[who] as Cell & { fromTunnel?: number }).fromTunnel
      if (k != null) spawnOrder[k][spawnOrder[k].indexOf(-1)] = color
      else {
        assigned[who] = color
        pickIndex[who] = picks
      }
      picks++
      sim[who].kind = 'empty'
      sim[who].color = -1
      ;(sim[who] as Cell & { fromTunnel?: number }).fromTunnel = undefined
    }
    if (mate >= 0) {
      pairOf[i] = mate
      pairOf[mate] = i
      pairsMade++
    }
    spawn()
  }
  if (quota.some((q) => q !== 0)) return null
  if (L.queue.length || L.stops.some((b) => b && b.assigned > 0)) return null

  // write colours back
  for (let i = 0; i < N; i++) {
    if (cells[i].kind === 'p') {
      if (assigned[i] < 0) return null
      cells[i].color = assigned[i]
      cells[i].pair = pairOf[i]
    }
  }
  tunnelCells.forEach((t, k) => (cells[t].queue = spawnOrder[k]))
  // pairs must not have a tunnel-spawned partner (handled) and both on grid
  // hidden: anything not reachable at the start
  const open0 = openSet(cells, cols, rows)
  const hidCand = cells.map((c, i) => (c.kind === 'p' && !reachable(cells, cols, rows, i, open0) && c.pair < 0 ? i : -1)).filter((i) => i >= 0)
  for (let k = 0; k < spec.hidden && hidCand.length; k++) cells[hidCand.splice(Math.floor(rng() * hidCand.length), 1)[0]].hidden = true
  // frozen: thaw count never exceeds how many left before it on the solution path
  const frCand = cells.map((c, i) => (c.kind === 'p' && pickIndex[i] >= 4 && c.pair < 0 && !c.hidden ? i : -1)).filter((i) => i >= 0)
  for (let k = 0; k < spec.frozen && frCand.length; k++) {
    const i = frCand.splice(Math.floor(rng() * frCand.length), 1)[0]
    cells[i].frozen = Math.max(2, Math.min(pickIndex[i], 3 + Math.floor(rng() * 6)))
    if (cells[i].frozen > pickIndex[i]) cells[i].frozen = 0
  }
  return { spec, cells, buses }
}

export function generate(spec: LevelSpec, seed: number): Level {
  const rng = makeRng(seed)
  for (let a = 0; a < 200; a++) {
    const lv = tryGenerate(spec, rng)
    if (lv) return lv
  }
  // fallback: drop the fancy bits
  for (let a = 0; a < 200; a++) {
    const lv = tryGenerate({ ...spec, tunnels: 0, pairs: 0, walls: 0 }, rng)
    if (lv) return lv
  }
  return tryGenerate({ ...spec, tunnels: 0, pairs: 0, walls: 0, park: 0, slack: 0 }, rng)!
}
