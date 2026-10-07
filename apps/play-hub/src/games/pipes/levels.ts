// Pipe levels: 16 hand-made maps, then seeded random self-avoiding paths (endless).
// Every board is a scrambled copy of a known solution path, so it is always solvable;
// scratch cl-pipes-check.mjs validates paths (in-bounds, adjacent steps, no repeats) for levels 1–120.

export type MapDef = { name: string; size: number; path: [number, number][] }

export function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Handcrafted solution paths — scrambled on load. */
export const MAPS: MapDef[] = [
  {
    name: 'Warm-up',
    size: 4,
    path: [
      [0, 0], [0, 1], [0, 2], [0, 3],
      [1, 3], [2, 3], [3, 3],
    ],
  },
  {
    name: 'Corner run',
    size: 4,
    path: [
      [0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3],
    ],
  },
  {
    name: 'S-bend',
    size: 4,
    path: [
      [0, 0], [0, 1], [1, 1], [2, 1], [2, 2], [2, 3], [3, 3],
    ],
  },
  {
    name: 'Spiral',
    size: 4,
    path: [
      [0, 0], [0, 1], [0, 2], [0, 3],
      [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0],
      [2, 0], [1, 0], [1, 1], [1, 2], [2, 2], [2, 1],
    ],
  },
  {
    name: 'Zigzag',
    size: 5,
    path: [
      [0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [2, 3], [3, 3], [3, 4], [4, 4],
    ],
  },
  {
    name: 'Snake',
    size: 5,
    path: [
      [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
      [1, 4], [1, 3], [1, 2], [1, 1], [1, 0],
      [2, 0], [3, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4],
    ],
  },
  {
    name: 'Loop-ish',
    size: 5,
    path: [
      [0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
      [4, 1], [4, 2], [3, 2], [2, 2], [2, 3], [2, 4], [3, 4], [4, 4],
    ],
  },
  {
    name: 'Cross town',
    size: 5,
    path: [
      [0, 0], [1, 0], [1, 1], [1, 2], [0, 2], [0, 3], [0, 4],
      [1, 4], [2, 4], [2, 3], [2, 2], [3, 2], [4, 2], [4, 3], [4, 4],
    ],
  },
  {
    name: 'Meander',
    size: 5,
    path: [
      [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [1, 2], [1, 3], [1, 4],
      [2, 4], [3, 4], [3, 3], [3, 2], [4, 2], [4, 1], [4, 0],
    ],
  },
  {
    name: 'Grid walk',
    size: 6,
    path: [
      [0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [3, 0],
      [4, 0], [4, 1], [4, 2], [4, 3], [3, 3], [2, 3], [1, 3], [0, 3],
      [0, 4], [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5],
    ],
  },
  {
    name: 'River',
    size: 6,
    path: [
      [0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 3],
      [0, 4], [1, 4], [2, 4], [3, 4], [3, 3], [3, 2], [4, 2], [5, 2],
      [5, 3], [5, 4], [5, 5],
    ],
  },
  {
    name: 'Fold',
    size: 6,
    path: [
      [0, 5], [0, 4], [0, 3], [0, 2], [0, 1], [0, 0],
      [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5],
      [3, 5], [4, 5], [4, 4], [4, 3], [4, 2], [4, 1], [4, 0],
      [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5],
    ],
  },
  {
    name: 'Labyrinth',
    size: 6,
    path: [
      [0, 0], [1, 0], [1, 1], [1, 2], [0, 2], [0, 3], [0, 4], [1, 4],
      [2, 4], [2, 3], [2, 2], [3, 2], [4, 2], [4, 1], [4, 0], [5, 0],
      [5, 1], [5, 2], [5, 3], [5, 4], [4, 4], [3, 4], [3, 5], [4, 5], [5, 5],
    ],
  },
  {
    name: 'Long haul',
    size: 7,
    path: [
      [0, 0], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [2, 2], [2, 1], [2, 0],
      [3, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [3, 4], [2, 4], [1, 4],
      [0, 4], [0, 5], [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6],
    ],
  },
  {
    name: 'Coil',
    size: 7,
    path: [
      [3, 0], [2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6],
      [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [6, 5], [6, 4], [6, 3],
      [6, 2], [6, 1], [6, 0], [5, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4],
      [5, 4], [5, 3], [5, 2], [5, 1],
    ],
  },
  {
    name: 'Finale',
    size: 7,
    path: [
      [0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1], [0, 2], [0, 3], [1, 3], [2, 3],
      [3, 3], [3, 2], [3, 1], [3, 0], [4, 0], [5, 0], [6, 0], [6, 1], [6, 2], [5, 2],
      [4, 2], [4, 3], [4, 4], [5, 4], [6, 4], [6, 5], [6, 6], [5, 6], [4, 6], [3, 6],
      [2, 6], [1, 6], [0, 6], [0, 5], [0, 4], [1, 4], [2, 4], [2, 5], [3, 5], [3, 4],
    ],
  },
]

const NAMES = ['Canal', 'Aqueduct', 'Sewer run', 'Reservoir', 'Pump house', 'Overflow', 'Cistern', 'Waterworks', 'Delta', 'Floodgate']

/** Random self-avoiding walk that prefers squeezed cells (Warnsdorff), so it snakes through the grid. */
function randomPath(size: number, minLen: number, rand: () => number): [number, number][] {
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ]
  let best: [number, number][] = []
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const seen = new Set<number>()
    const edge = Math.floor(rand() * size)
    let cur: [number, number] = rand() < 0.5 ? [0, edge] : [edge, 0]
    const path: [number, number][] = [cur]
    seen.add(cur[0] * size + cur[1])
    for (;;) {
      const opts: { cell: [number, number]; free: number }[] = []
      for (const [dr, dc] of dirs) {
        const r = cur[0] + dr
        const c = cur[1] + dc
        if (r < 0 || c < 0 || r >= size || c >= size || seen.has(r * size + c)) continue
        let free = 0
        for (const [er, ec] of dirs) {
          const rr = r + er
          const cc = c + ec
          if (rr >= 0 && cc >= 0 && rr < size && cc < size && !seen.has(rr * size + cc)) free += 1
        }
        opts.push({ cell: [r, c], free })
      }
      if (!opts.length) break
      opts.sort((a, b) => a.free - b.free + (rand() - 0.5) * 2.2)
      cur = opts[0].cell
      seen.add(cur[0] * size + cur[1])
      path.push(cur)
    }
    if (path.length >= minLen) return path
    if (path.length > best.length) best = path
  }
  return best
}

/** Level n (1-based). */
export function mapAt(n: number): MapDef {
  if (n <= MAPS.length) return MAPS[n - 1]
  const k = n - MAPS.length
  const size = k <= 8 ? 6 : k <= 22 ? 7 : 8
  const boss = n % 5 === 0
  const cover = Math.min(0.85, 0.5 + k * 0.012 + (boss ? 0.12 : 0))
  const rand = mulberry32(n * 7717 + 13)
  const want = Math.round(size * size * cover)
  const path = randomPath(size, want, rand).slice(0, want)
  return { name: `${NAMES[(k - 1) % NAMES.length]} ${Math.floor((k - 1) / NAMES.length) + 1}`, size, path }
}

/** Bitmask openings: N=1 E=2 S=4 W=8 */
export type Mask = number

export const N = 1
export const E = 2
export const S = 4
export const W = 8

/** Only straight + elbow pieces (no ✚ / T). */
const STRAIGHT: Mask = N | S
const ELBOW: Mask = N | E
const PIPE_POOL: Mask[] = [STRAIGHT, ELBOW]

export function rotate(mask: Mask, turns: number): Mask {
  let m = mask
  for (let i = 0; i < ((turns % 4) + 4) % 4; i += 1) {
    const next =
      (m & N ? E : 0) | (m & E ? S : 0) | (m & S ? W : 0) | (m & W ? N : 0)
    m = next
  }
  return m
}

function opposite(dir: number): number {
  if (dir === N) return S
  if (dir === S) return N
  if (dir === E) return W
  return E
}

function delta(dir: number): [number, number] {
  if (dir === N) return [-1, 0]
  if (dir === S) return [1, 0]
  if (dir === E) return [0, 1]
  return [0, -1]
}

export type Cell = { base: Mask; rot: number; kind: 'pipe' | 'start' | 'end' }
export type Board = { cells: Cell[]; start: number; end: number; size: number }

function idx(size: number, r: number, c: number): number {
  return r * size + c
}

function maskAlongPath(size: number, path: number[], i: number): Mask {
  const cur = path[i]
  const cr = Math.floor(cur / size)
  const cc = cur % size
  let mask = 0

  if (i === 0 && path.length > 1) {
    const next = path[1]
    const nr = Math.floor(next / size)
    const nc = next % size
    if (nr < cr) return N
    if (nr > cr) return S
    if (nc < cc) return W
    return E
  }

  if (i === path.length - 1 && path.length > 1) {
    const prev = path[path.length - 2]
    const pr = Math.floor(prev / size)
    const pc = prev % size
    if (pr < cr) return N
    if (pr > cr) return S
    if (pc < cc) return W
    return E
  }

  if (i > 0) {
    const prev = path[i - 1]
    const pr = Math.floor(prev / size)
    const pc = prev % size
    if (pr < cr) mask |= N
    if (pr > cr) mask |= S
    if (pc < cc) mask |= W
    if (pc > cc) mask |= E
  }
  if (i < path.length - 1) {
    const next = path[i + 1]
    const nr = Math.floor(next / size)
    const nc = next % size
    if (nr < cr) mask |= N
    if (nr > cr) mask |= S
    if (nc < cc) mask |= W
    if (nc > cc) mask |= E
  }
  return mask
}

/** Seeded scramble; never returns an already-connected board. */
function scramble(board: Board, rand: () => number): Board {
  for (;;) {
    const next = { ...board, cells: board.cells.map((cell) => ({ ...cell, rot: Math.floor(rand() * 4) })) }
    if (!flows(next.cells, next.size, next.start).has(next.end)) return next
  }
}

export function boardFromMap(map: MapDef, seed: number): Board {
  const rand = mulberry32(seed)
  const { size, path: coords } = map
  const total = size * size
  const path = coords.map(([r, c]) => idx(size, r, c))
  const visited = new Set(path)
  const cells: Cell[] = Array.from({ length: total }, () => ({
    base: STRAIGHT,
    rot: 0,
    kind: 'pipe' as const,
  }))

  for (let i = 0; i < path.length; i += 1) {
    const cur = path[i]
    cells[cur] = {
      base: maskAlongPath(size, path, i),
      rot: 0,
      kind: i === 0 ? 'start' : i === path.length - 1 ? 'end' : 'pipe',
    }
  }

  for (let i = 0; i < total; i += 1) {
    if (visited.has(i)) continue
    cells[i] = {
      base: PIPE_POOL[Math.floor(rand() * PIPE_POOL.length)],
      rot: 0,
      kind: 'pipe',
    }
  }

  return scramble({ cells, start: path[0], end: path[path.length - 1], size }, rand)
}

export function openings(cell: Cell): Mask {
  return rotate(cell.base, cell.rot)
}

export function flows(cells: Cell[], size: number, start: number): Set<number> {
  const lit = new Set<number>()
  const q = [start]
  lit.add(start)
  while (q.length) {
    const cur = q.shift()!
    const mask = openings(cells[cur])
    const r = Math.floor(cur / size)
    const c = cur % size
    for (const dir of [N, E, S, W]) {
      if (!(mask & dir)) continue
      const [dr, dc] = delta(dir)
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue
      const ni = nr * size + nc
      const other = openings(cells[ni])
      if (!(other & opposite(dir))) continue
      if (lit.has(ni)) continue
      lit.add(ni)
      q.push(ni)
    }
  }
  return lit
}


/** Clockwise taps needed to turn every cell of the intended path back into place. */
export function parFor(board: Board, map: MapDef): number {
  let taps = 0
  for (const [r, c] of map.path) {
    const cell = board.cells[r * map.size + c]
    const straight = cell.base === (N | S) || cell.base === (E | W)
    taps += straight ? (2 - (cell.rot % 2)) % 2 : (4 - cell.rot) % 4
  }
  return taps
}
