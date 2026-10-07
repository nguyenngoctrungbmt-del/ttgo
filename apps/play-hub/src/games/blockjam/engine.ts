/**
 * Block Jam rules + generator.
 * The generator starts from an empty board and plays the game backwards:
 * blocks enter through their colour's door and random-walk around. Every step
 * is reversible, so the reverse sequence solves the level.
 */

export type Side = 0 | 1 | 2 | 3 // 0 top, 1 right, 2 bottom, 3 left
export const SX = [0, 1, 0, -1]
export const SY = [-1, 0, 1, 0]

export type Door = { side: Side; at: number; len: number; color: number }

export type Block = {
  id: number
  cells: [number, number][] // offsets
  x: number
  y: number
  color: number
  /** Outer layer colour (-1 = none). Leaving through the outer colour's door peels it. */
  outer: number
  /** 0 free, 1 horizontal only, 2 vertical only */
  axis: 0 | 1 | 2
  ice: number
  locked: boolean
  key: boolean
  gone: boolean
}

export type LevelSpec = {
  n: number
  cols: number
  rows: number
  colors: number
  blocks: number
  rocks: number
  axis: number
  layered: number
  ice: number
  locks: number
  hard: boolean
  time: number
  intro?: string
}

export type Level = { spec: LevelSpec; blocks: Block[]; doors: Door[]; rocks: number[] }

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

const SHAPES: [number, number][][] = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
]

export function specFor(n: number): LevelSpec {
  const hard = n % 5 === 0
  const base: LevelSpec = { n, cols: 5, rows: 5, colors: 2, blocks: 3, rocks: 0, axis: 0, layered: 0, ice: 0, locks: 0, hard, time: 60 }
  const t = (s: LevelSpec): LevelSpec => ({ ...s, time: Math.round(20 + s.blocks * (hard ? 5 : 6.5) + s.layered * 4 + s.locks * 4) })
  switch (n) {
    case 1:
      return t({ ...base, intro: 'drag a block into its matching door' })
    case 2:
      return t({ ...base, cols: 5, rows: 6, colors: 3, blocks: 5, intro: 'blocks slide until they hit something' })
    case 3:
      return t({ ...base, cols: 6, rows: 6, colors: 3, blocks: 7, intro: 'big blocks need wide doors' })
    case 4:
      return t({ ...base, cols: 6, rows: 7, colors: 4, blocks: 8, axis: 2, intro: 'striped blocks slide one way only' })
    case 5:
      return t({ ...base, cols: 6, rows: 7, colors: 4, blocks: 10, axis: 2 })
  }
  const k = n - 5
  return t({
    ...base,
    cols: Math.min(7, 6 + Math.floor(k / 5)),
    rows: Math.min(8, 7 + Math.floor(k / 4)),
    colors: Math.min(6, 4 + Math.floor(k / 4)),
    blocks: Math.min(18, 9 + Math.floor(k * 0.8) + (hard ? 2 : 0)),
    rocks: n >= 6 ? Math.min(3, 1 + Math.floor(k / 5)) : 0,
    axis: Math.min(4, 1 + Math.floor(k / 3)),
    layered: n >= 6 ? Math.min(4, 1 + Math.floor((n - 6) / 3)) : 0,
    ice: n >= 7 ? Math.min(3, 1 + Math.floor((n - 7) / 4)) : 0,
    locks: n >= 8 ? Math.min(2, 1 + Math.floor((n - 8) / 6)) : 0,
    intro: n === 6 ? 'two-colour blocks peel at the outer door' : n === 7 ? 'frozen blocks thaw as others leave' : n === 8 ? 'free the key to open the lock' : undefined,
  })
}

export function absCells(b: { cells: [number, number][]; x: number; y: number }, dx = 0, dy = 0): [number, number][] {
  return b.cells.map(([cx, cy]) => [b.x + cx + dx, b.y + cy + dy])
}

export function occupancy(cols: number, rows: number, blocks: Block[], rocks: number[]): Int32Array {
  const occ = new Int32Array(cols * rows).fill(-1)
  for (const r of rocks) occ[r] = -2
  for (const b of blocks) {
    if (b.gone) continue
    for (const [x, y] of absCells(b)) if (x >= 0 && y >= 0 && x < cols && y < rows) occ[y * cols + x] = b.id
  }
  return occ
}

export function canStep(cols: number, rows: number, occ: Int32Array, b: Block, dx: number, dy: number) {
  for (const [x, y] of absCells(b, dx, dy)) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return false
    const o = occ[y * cols + x]
    if (o !== -1 && o !== b.id) return false
  }
  return true
}

/** Door the block can leave through on this side (colour, width and a clear path), or null. */
export function exitDoor(cols: number, rows: number, occ: Int32Array, doors: Door[], b: Block, side: Side): Door | null {
  const col = b.outer >= 0 ? b.outer : b.color
  const cells = absCells(b)
  const along = side === 0 || side === 2 ? cells.map((c) => c[0]) : cells.map((c) => c[1])
  const lo = Math.min(...along)
  const hi = Math.max(...along)
  const door = doors.find((d) => d.side === side && d.color === col && lo >= d.at && hi < d.at + d.len)
  if (!door) return null
  // the block must slide all the way out: every cell's path inside the board must be clear
  const dx = SX[side]
  const dy = SY[side]
  for (const [x0, y0] of cells) {
    let x = x0 + dx
    let y = y0 + dy
    while (x >= 0 && y >= 0 && x < cols && y < rows) {
      const o = occ[y * cols + x]
      if (o !== -1 && o !== b.id) return null
      x += dx
      y += dy
    }
  }
  return door
}

// ── Generator ─────────────────────────────────────

function bounds(cells: [number, number][]) {
  let w = 0
  let h = 0
  for (const [x, y] of cells) {
    w = Math.max(w, x + 1)
    h = Math.max(h, y + 1)
  }
  return { w, h }
}

function rotate(cells: [number, number][], k: number): [number, number][] {
  let out = cells.map(([x, y]) => [x, y] as [number, number])
  for (let i = 0; i < k; i++) out = out.map(([x, y]) => [-y, x] as [number, number])
  const mx = Math.min(...out.map((c) => c[0]))
  const my = Math.min(...out.map((c) => c[1]))
  return out.map(([x, y]) => [x - mx, y - my] as [number, number])
}

function makeDoors(spec: LevelSpec, rng: Rng): Door[] {
  const { cols, rows } = spec
  const doors: Door[] = []
  const used: boolean[][] = [new Array(cols).fill(false), new Array(rows).fill(false), new Array(cols).fill(false), new Array(rows).fill(false)]
  const want = spec.colors + (spec.n >= 10 ? Math.min(2, Math.floor((spec.n - 8) / 6)) : 0)
  for (let k = 0, tries = 0; k < want && tries < 200; tries++) {
    const side = Math.floor(rng() * 4) as Side
    const span = side === 0 || side === 2 ? cols : rows
    const len = 1 + Math.floor(rng() * Math.min(3, span - 2)) + (rng() < 0.4 ? 1 : 0)
    const L = Math.min(len, 3, span - 2)
    const at = 1 + Math.floor(rng() * (span - 1 - L))
    let ok = true
    for (let i = at - 1; i <= at + L; i++) if (i >= 0 && i < span && used[side][i]) ok = false
    if (!ok) continue
    for (let i = at; i < at + L; i++) used[side][i] = true
    doors.push({ side, at, len: L, color: k % spec.colors })
    k++
  }
  return doors
}

type GenBlock = Block & { entry: number; last: number }

function tryGen(spec: LevelSpec, rng: Rng): Level | null {
  const { cols, rows } = spec
  const doors = makeDoors(spec, rng)
  if (new Set(doors.map((d) => d.color)).size < spec.colors) return null
  const rocks: number[] = []
  for (let t = 0; rocks.length < spec.rocks && t < 50; t++) {
    const x = 1 + Math.floor(rng() * (cols - 2))
    const y = 1 + Math.floor(rng() * (rows - 2))
    if (!rocks.includes(y * cols + x)) rocks.push(y * cols + x)
  }
  const blocks: GenBlock[] = []
  let clock = 0
  let axisLeft = spec.axis
  let layersLeft = spec.layered
  const walk = (b: GenBlock, steps: number) => {
    for (let s = 0; s < steps; s++) {
      const occ = occupancy(cols, rows, blocks, rocks)
      const dirs = [0, 1, 2, 3].filter((d) => (b.axis === 1 ? d === 1 || d === 3 : b.axis === 2 ? d === 0 || d === 2 : true))
      const d = dirs[Math.floor(rng() * dirs.length)]
      if (canStep(cols, rows, occ, b, SX[d], SY[d])) {
        b.x += SX[d]
        b.y += SY[d]
        b.last = clock++
      }
    }
  }
  const tryWrap = () => {
    const order = [...blocks].sort(() => rng() - 0.5)
    for (const cand of order) {
      if (cand.outer >= 0 || cand.axis) continue
      for (const d of doors) {
        if (d.color === cand.color) continue
        const sx = cand.x
        const sy = cand.y
        const sl = cand.last
        const tick = clock
        const step = (dx: number, dy: number) => {
          const occ = occupancy(cols, rows, blocks, rocks)
          if (!canStep(cols, rows, occ, cand, dx, dy)) return false
          cand.x += dx
          cand.y += dy
          cand.last = clock++
          return true
        }
        for (let s = 0; s < 10 && step(SX[d.side], SY[d.side]); s++);
        // slide along the wall toward the door span
        const horiz = d.side === 0 || d.side === 2
        for (let s = 0; s < 10; s++) {
          const along = absCells(cand).map((c) => (horiz ? c[0] : c[1]))
          const lo = Math.min(...along)
          const hi = Math.max(...along)
          if (lo >= d.at && hi < d.at + d.len) break
          const dir = lo < d.at ? 1 : -1
          if (!step(horiz ? dir : 0, horiz ? 0 : dir)) break
        }
        const occ = occupancy(cols, rows, blocks, rocks)
        if (exitDoor(cols, rows, occ, [d], { ...cand, outer: d.color }, d.side)) {
          cand.outer = d.color
          cand.last = clock++
          return true
        }
        // retrace: every step was reversible, so jumping back is the same as walking back
        cand.x = sx
        cand.y = sy
        cand.last = sl
        clock = Math.max(clock, tick)
      }
    }
    return false
  }
  for (let tries = 0; tries < spec.blocks * 12 && blocks.length < spec.blocks; tries++) {
    const door = doors[Math.floor(rng() * doors.length)]
    const shapeMax = spec.n <= 1 ? 3 : spec.n <= 2 ? 4 : SHAPES.length
    const cells = rotate(SHAPES[Math.floor(rng() * shapeMax)], Math.floor(rng() * 4))
    const { w, h } = bounds(cells)
    const horizDoor = door.side === 0 || door.side === 2
    const ext = horizDoor ? w : h
    if (ext > door.len) continue
    const off = door.at + Math.floor(rng() * (door.len - ext + 1))
    // start fully outside, then slide in through the door
    const depth = horizDoor ? h : w
    let x = 0
    let y = 0
    if (door.side === 0) [x, y] = [off, -depth]
    else if (door.side === 2) [x, y] = [off, rows]
    else if (door.side === 3) [x, y] = [-depth, off]
    else [x, y] = [cols, off]
    const axis: 0 | 1 | 2 = axisLeft > 0 && rng() < 0.4 ? (horizDoor ? 2 : 1) : 0
    const b: GenBlock = { id: blocks.length, cells, x, y, color: door.color, outer: -1, axis, ice: 0, locked: false, key: false, gone: false, entry: 0, last: 0 }
    const inward: Side = ((door.side + 2) % 4) as Side
    const occ = occupancy(cols, rows, blocks, rocks)
    let ok = true
    for (let s = 0; s < depth; s++) {
      b.x += SX[inward]
      b.y += SY[inward]
      for (const [cx, cy] of absCells(b)) {
        if (cx >= 0 && cy >= 0 && cx < cols && cy < rows && occ[cy * cols + cx] !== -1) ok = false
      }
      if (!ok) break
    }
    if (!ok) continue
    b.entry = clock++
    b.last = b.entry
    blocks.push(b)
    if (axis) axisLeft--
    // push it deeper and shuffle everyone a little
    const deeper = Math.floor(rng() * (horizDoor ? rows : cols))
    for (let s = 0; s < deeper; s++) {
      const o2 = occupancy(cols, rows, blocks, rocks)
      if (canStep(cols, rows, o2, b, SX[inward], SY[inward])) {
        b.x += SX[inward]
        b.y += SY[inward]
        b.last = clock++
      } else break
    }
    for (let m = 0; m < 6; m++) walk(blocks[Math.floor(rng() * blocks.length)], 2)
    // wrap a block in an outer layer: steer it flush to another colour's door first
    if (layersLeft > 0 && rng() < 0.7 && tryWrap()) layersLeft--
  }
  for (let t = 0; t < 6 && layersLeft > 0; t++) if (tryWrap()) layersLeft--
  if (blocks.length < Math.max(2, spec.blocks - 2)) return null
  // frozen: forward, a block waits for blocks that entered after its last move
  const n = blocks.length
  const after = (b: GenBlock) => blocks.filter((o) => o.entry > b.last).length
  const iceCand = blocks.filter((b) => after(b) >= 2 && b.outer < 0)
  for (let k = 0; k < spec.ice && iceCand.length; k++) {
    const b = iceCand.splice(Math.floor(rng() * iceCand.length), 1)[0]
    b.ice = Math.max(1, Math.min(after(b), 2 + Math.floor(rng() * 3)))
  }
  // locks: the key block must have entered after the locked block's last move
  for (let k = 0; k < spec.locks; k++) {
    const pairs: [GenBlock, GenBlock][] = []
    for (const L of blocks) {
      if (L.locked || L.ice || L.key) continue
      for (const K of blocks) if (K !== L && !K.locked && !K.key && K.entry > L.last) pairs.push([L, K])
    }
    if (!pairs.length) break
    const [L, K] = pairs[Math.floor(rng() * pairs.length)]
    L.locked = true
    K.key = true
  }
  void n
  return { spec, blocks: blocks.map(({ entry: _e, last: _l, ...b }) => b), doors, rocks }
}

export function generate(spec: LevelSpec, seed: number): Level {
  const rng = makeRng(seed)
  let best: Level | null = null
  for (let a = 0; a < 40; a++) {
    const lv = tryGen(spec, rng)
    if (lv && (!best || lv.blocks.length > best.blocks.length)) best = lv
    if (best && best.blocks.length >= spec.blocks) break
  }
  if (best) return best
  return tryGen({ ...spec, rocks: 0, colors: 2, blocks: 3 }, rng) ?? { spec, blocks: [], doors: [], rocks: [] }
}
