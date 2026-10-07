/** Maze generation for Dark Maze: perfect maze + loops, doors with reachable keys, traps and pickups. */

export const DX = [0, 1, 0, -1]
export const DY = [-1, 0, 1, 0]
/** Wall bits for N, E, S, W. */
export const BIT = [1, 2, 4, 8]

export type ItemKind = 'key' | 'oil' | 'gem' | 'trap'
export type Item = { kind: ItemKind; c: number; taken: boolean; hit: boolean }
export type Door = { a: number; b: number; open: boolean; anim: number }

export type Maze = {
  cols: number
  rows: number
  walls: Uint8Array
  start: number
  exit: number
  doors: Door[]
  items: Item[]
  /** Steps along the intended route (start → keys → exit). */
  route: number
}

export function neighbor(m: { cols: number; rows: number }, c: number, d: number): number {
  const x = (c % m.cols) + DX[d]
  const y = Math.floor(c / m.cols) + DY[d]
  if (x < 0 || y < 0 || x >= m.cols || y >= m.rows) return -1
  return y * m.cols + x
}

export function doorBetween(doors: Door[], a: number, b: number): Door | undefined {
  return doors.find((d) => (d.a === a && d.b === b) || (d.a === b && d.b === a))
}

/** BFS distances; `blocked` doors act as walls. */
export function bfs(m: Maze, from: number, blocked: Door[]): { dist: Int32Array; prev: Int32Array } {
  const n = m.cols * m.rows
  const dist = new Int32Array(n).fill(-1)
  const prev = new Int32Array(n).fill(-1)
  const q = [from]
  dist[from] = 0
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi]
    for (let d = 0; d < 4; d++) {
      if (m.walls[c] & BIT[d]) continue
      const nb = neighbor(m, c, d)
      if (nb < 0 || dist[nb] >= 0) continue
      if (blocked.length && doorBetween(blocked, c, nb)) continue
      dist[nb] = dist[c] + 1
      prev[nb] = c
      q.push(nb)
    }
  }
  return { dist, prev }
}

function pathTo(prev: Int32Array, to: number): number[] {
  const p: number[] = []
  for (let c = to; c >= 0; c = prev[c]) p.push(c)
  return p.reverse()
}

/** Hand-shaped layouts used by signature levels (default: random backtracker). */
export type Shape = 'random' | 'serpent' | 'spiral' | 'comb'

export type MazeOpts = { cols: number; rows: number; doors: number; traps: number; oils: number; gems: number; loops: number; shape?: Shape }

function open(m: Maze, a: number, b: number) {
  for (let d = 0; d < 4; d++) {
    if (neighbor(m, a, d) === b) {
      m.walls[a] &= ~BIT[d]
      m.walls[b] &= ~BIT[(d + 2) % 4]
    }
  }
}

/** Carves a non-random layout; returns false for 'random'. */
function carveShape(m: Maze, shape: Shape): boolean {
  const { cols, rows } = m
  const at = (x: number, y: number) => y * cols + x
  if (shape === 'serpent') {
    // Boustrophedon from the bottom row upward.
    for (let r = 0; r < rows; r++) {
      const y = rows - 1 - r
      for (let x = 0; x < cols - 1; x++) open(m, at(x, y), at(x + 1, y))
      const ex = r % 2 === 0 ? cols - 1 : 0
      if (y > 0) open(m, at(ex, y), at(ex, y - 1))
    }
    return true
  }
  if (shape === 'comb') {
    // Spine up the left wall, a long tooth to the right on every row.
    for (let y = 0; y < rows; y++) {
      if (y > 0) open(m, at(0, y), at(0, y - 1))
      for (let x = 0; x < cols - 1; x++) open(m, at(x, y), at(x + 1, y))
    }
    return true
  }
  if (shape === 'spiral') {
    // One corridor from the bottom-left corner, winding clockwise into the centre.
    let x0 = 0
    let y0 = 0
    let x1 = cols - 1
    let y1 = rows - 1
    const order: number[] = []
    while (x0 <= x1 && y0 <= y1) {
      for (let y = y1; y >= y0; y--) order.push(at(x0, y))
      for (let x = x0 + 1; x <= x1; x++) order.push(at(x, y0))
      if (x1 > x0) for (let y = y0 + 1; y <= y1; y++) order.push(at(x1, y))
      if (y1 > y0) for (let x = x1 - 1; x > x0; x--) order.push(at(x, y1))
      x0++
      y0++
      x1--
      y1--
    }
    for (let i = 1; i < order.length; i++) open(m, order[i - 1], order[i])
    return true
  }
  return false
}

export function generate(o: MazeOpts, rnd: () => number = Math.random): Maze {
  const { cols, rows } = o
  const n = cols * rows
  const walls = new Uint8Array(n).fill(15)
  const seen = new Uint8Array(n)
  const m: Maze = { cols, rows, walls, start: (rows - 1) * cols, exit: 0, doors: [], items: [], route: 0 }
  if (carveShape(m, o.shape ?? 'random')) seen.fill(1)
  // Recursive backtracker.
  const stack = seen[m.start] ? [] : [m.start]
  seen[m.start] = 1
  while (stack.length) {
    const c = stack[stack.length - 1]
    const opts: number[] = []
    for (let d = 0; d < 4; d++) {
      const nb = neighbor(m, c, d)
      if (nb >= 0 && !seen[nb]) opts.push(d)
    }
    if (!opts.length) {
      stack.pop()
      continue
    }
    const d = opts[Math.floor(rnd() * opts.length)]
    const nb = neighbor(m, c, d)
    walls[c] &= ~BIT[d]
    walls[nb] &= ~BIT[(d + 2) % 4]
    seen[nb] = 1
    stack.push(nb)
  }
  // A few loops so there is more than one way round.
  for (let i = 0; i < o.loops; i++) {
    const c = Math.floor(rnd() * n)
    const d = Math.floor(rnd() * 4)
    const nb = neighbor(m, c, d)
    if (nb < 0) continue
    walls[c] &= ~BIT[d]
    walls[nb] &= ~BIT[(d + 2) % 4]
  }
  // Exit: the farthest cell from the start.
  const base = bfs(m, m.start, [])
  let far = 0
  for (let c = 0; c < n; c++) if (base.dist[c] > base.dist[far]) far = c
  m.exit = far
  const main = pathTo(base.prev, far)
  const onMain = new Set(main)
  const used = new Set<number>([m.start, m.exit])
  // Doors on the main path, each with a key reachable before it (later doors stay shut).
  const doorCount = Math.min(o.doors, Math.floor(main.length / 6))
  for (let i = 0; i < doorCount; i++) {
    const at = Math.floor(main.length * ((i + 1) / (doorCount + 1)) + (rnd() - 0.5) * 2)
    const idx = Math.max(1, Math.min(main.length - 3, at))
    const a = main[idx]
    const b = main[idx + 1]
    if (!doorBetween(m.doors, a, b)) m.doors.push({ a, b, open: false, anim: 0 })
  }
  let route = 0
  let from = m.start
  const keyPaths = new Set<number>()
  for (let i = 0; i < m.doors.length; i++) {
    const shut = m.doors.slice(i)
    const reach = bfs(m, m.start, shut)
    let best = -1
    let bestScore = -1
    for (let c = 0; c < n; c++) {
      if (reach.dist[c] < 0 || used.has(c)) continue
      const dead = [0, 1, 2, 3].filter((d) => !(walls[c] & BIT[d])).length === 1
      const score = (onMain.has(c) ? 0 : 6) + (dead ? 4 : 0) + Math.min(reach.dist[c], 10) + rnd() * 3
      if (score > bestScore) {
        bestScore = score
        best = c
      }
    }
    if (best < 0) {
      m.doors.splice(i)
      break
    }
    used.add(best)
    m.items.push({ kind: 'key', c: best, taken: false, hit: false })
    const leg = bfs(m, from, shut)
    route += Math.max(0, leg.dist[best])
    for (const c of pathTo(leg.prev, best)) keyPaths.add(c)
    from = best
  }
  const last = bfs(m, from, [])
  route += Math.max(0, last.dist[m.exit])
  for (const c of pathTo(last.prev, m.exit)) keyPaths.add(c)
  m.route = Math.max(route, main.length - 1)
  // Side cells (off the main path) for traps and pickups.
  const side: number[] = []
  for (let c = 0; c < n; c++) if (!onMain.has(c) && !used.has(c) && !keyPaths.has(c)) side.push(c)
  // Prefer side cells right next to the main path: tempting wrong turns.
  const adj = (c: number) => [0, 1, 2, 3].some((d) => !(walls[c] & BIT[d]) && onMain.has(neighbor(m, c, d)))
  side.sort((p, q) => Number(adj(q)) - Number(adj(p)) + (rnd() - 0.5) * 0.9)
  const take = (k: number, kind: ItemKind) => {
    for (let i = 0; i < k && side.length; i++) {
      const c = side.shift()!
      used.add(c)
      m.items.push({ kind, c, taken: false, hit: false })
    }
  }
  take(o.traps, 'trap')
  // Pickups go deeper into branches.
  side.reverse()
  take(o.oils, 'oil')
  take(o.gems, 'gem')
  return m
}
