/**
 * Number Merge levels: a 5×5 board (some cells may be blocked), preset tiles/stones, a goal tile and a
 * fixed piece sequence. Pure rules + a beam-search solver used to verify every authored level.
 */

export const N = 5

export type Cell = { kind: 'num' | 'stone'; v: number; cracks: number } | null
export type Piece = { kind: 'num' | 'joker' | 'bomb'; v: number }

export type LevelDef = {
  n: number
  name?: string
  tip?: string
  goal: number
  blocked: boolean[]
  start: Cell[]
  /** Spawn values, smallest first (weights 5/4/2/1). */
  pool: number[]
  seed: number
  /** Hand-written opening pieces ('2', 'J' joker, 'B' bomb); the seeded stream follows. */
  opening: Piece[]
  jokerEvery: number
  bombEvery: number
  /** Placements for 3 stars; up to 1.5× for 2 stars. */
  par: number
  hard: boolean
}

export type AuthoredLevel = {
  name: string
  goal: number
  /** 5 rows of 5 tokens: '.' empty, '#' blocked, 'S' stone, a number = tile. */
  board: string[]
  pool: number[]
  seed: number
  opening?: string
  jokerEvery?: number
  bombEvery?: number
  par: number
  tip?: string
}

export function isHard(n: number) {
  return n >= 5 && n % 5 === 0
}

export function nbrs(i: number) {
  const r = Math.floor(i / N)
  const c = i % N
  const out: number[] = []
  if (r > 0) out.push(i - N)
  if (r < N - 1) out.push(i + N)
  if (c > 0) out.push(i - 1)
  if (c < N - 1) out.push(i + 1)
  return out
}

export function component(grid: Cell[], start: number, v: number) {
  const seen = new Set<number>([start])
  const stack = [start]
  while (stack.length) {
    const i = stack.pop()!
    for (const j of nbrs(i)) {
      const t = grid[j]
      if (seen.has(j) || !t || t.kind !== 'num' || t.v !== v) continue
      seen.add(j)
      stack.push(j)
    }
  }
  return [...seen]
}

/** Value a joker takes when dropped on `cell`: the neighbour giving the biggest merge. */
export function jokerValue(grid: Cell[], cell: number, minV: number) {
  let best = 0
  let bestGain = 0
  for (const j of nbrs(cell)) {
    const t = grid[j]
    if (!t || t.kind !== 'num') continue
    const gain = t.v * Math.pow(2, component(grid, j, t.v).length)
    if (gain > bestGain) {
      bestGain = gain
      best = t.v
    }
  }
  return best || minV
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

/** The i-th piece of a level (0-based) — fixed for every play of the level. */
export function pieceAt(lv: LevelDef, i: number): Piece {
  if (i < lv.opening.length) return lv.opening[i]
  const k = i + 1
  if (lv.bombEvery && k % lv.bombEvery === 0) return { kind: 'bomb', v: 0 }
  if (lv.jokerEvery && k % lv.jokerEvery === 0) return { kind: 'joker', v: 0 }
  const r = rng(lv.seed * 9973 + i * 7919 + 1)
  r()
  const weights = [5, 4, 2, 1].slice(0, lv.pool.length)
  let x = r() * weights.reduce((a, b) => a + b, 0)
  for (let j = 0; j < weights.length; j++) {
    x -= weights[j]
    if (x <= 0) return { kind: 'num', v: lv.pool[j] }
  }
  return { kind: 'num', v: lv.pool[0] }
}

export type SimResult = { grid: Cell[]; best: number; merges: number; chain: number }

/** Plays one piece on `cell` and resolves the merge cascade (same rules as the game). */
export function simulate(grid0: Cell[], cell: number, pc: Piece, minV: number): SimResult {
  const grid = grid0.map((t) => (t ? { ...t } : null))
  let best = 0
  if (pc.kind === 'bomb') {
    const r = Math.floor(cell / N)
    const c = cell % N
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr
      const cc = c + dc
      if (rr >= 0 && cc >= 0 && rr < N && cc < N) grid[rr * N + cc] = null
    }
    return { grid, best, merges: 0, chain: 0 }
  }
  const v = pc.kind === 'joker' ? jokerValue(grid, cell, minV) : pc.v
  grid[cell] = { kind: 'num', v, cracks: 0 }
  let chain = 0
  for (let guard = 0; guard < 30; guard++) {
    const t = grid[cell]!
    const comp = component(grid, cell, t.v)
    if (comp.length < 2) break
    for (const i of comp) if (i !== cell) grid[i] = null
    t.v *= Math.pow(2, comp.length - 1)
    best = Math.max(best, t.v)
    chain++
    const touched = new Set<number>()
    for (const i of comp) for (const j of nbrs(i)) touched.add(j)
    touched.forEach((j) => {
      const s = grid[j]
      if (!s || s.kind !== 'stone') return
      s.cracks++
      if (s.cracks >= 2) grid[j] = null
    })
  }
  return { grid, best: Math.max(best, v), merges: chain, chain }
}

// ── Authored parsing ──────────────────────────────────────
function parsePiece(tok: string): Piece {
  if (tok === 'J') return { kind: 'joker', v: 0 }
  if (tok === 'B') return { kind: 'bomb', v: 0 }
  return { kind: 'num', v: Number(tok) }
}

export function authoredLevel(n: number, a: AuthoredLevel): LevelDef {
  const blocked: boolean[] = []
  const start: Cell[] = []
  for (const row of a.board) {
    for (const tok of row.trim().split(/\s+/)) {
      blocked.push(tok === '#')
      start.push(tok === 'S' ? { kind: 'stone', v: 0, cracks: 0 } : tok === '.' || tok === '#' ? null : { kind: 'num', v: Number(tok), cracks: 0 })
    }
  }
  return {
    n,
    name: a.name,
    tip: a.tip,
    goal: a.goal,
    blocked,
    start,
    pool: a.pool,
    seed: a.seed,
    opening: a.opening ? a.opening.trim().split(/\s+/).map(parsePiece) : [],
    jokerEvery: a.jokerEvery ?? 0,
    bombEvery: a.bombEvery ?? 0,
    par: a.par,
    hard: isHard(n),
  }
}

// ── Generator (levels beyond the authored set) ────────────
const SHAPES: number[][] = [
  [],
  [0, 4, 20, 24],
  [12],
  [0, 4, 20, 24, 12],
  [2, 22],
  [10, 14],
  [0, 1, 3, 4],
  [6, 8, 16, 18],
]

export function makeLevel(n: number, seed: number): LevelDef {
  const r = rng(seed * 31 + n * 977)
  const hard = isHard(n)
  const tier = Math.min(5, Math.floor((n - 31) / 6))
  const minV = Math.pow(2, Math.min(6, 2 + Math.floor(tier / 1.5)))
  const pool = [minV, minV * 2, minV * 4]
  const goal = minV * Math.pow(2, 6 + (hard ? 1 : 0) + (tier >= 3 ? 1 : 0))
  const blocked = Array.from({ length: N * N }, () => false)
  for (const i of SHAPES[Math.floor(r() * SHAPES.length)]) blocked[i] = true
  const start: Cell[] = Array.from({ length: N * N }, () => null)
  const free = () => start.map((_, i) => i).filter((i) => !blocked[i] && !start[i])
  const stones = Math.min(4, 1 + Math.floor(r() * (2 + tier / 2)) + (hard ? 1 : 0))
  for (let k = 0; k < stones; k++) {
    const f = free()
    start[f[Math.floor(r() * f.length)]] = { kind: 'stone', v: 0, cracks: 0 }
  }
  for (let k = 0; k < 3; k++) {
    const f = free()
    const i = f[Math.floor(r() * f.length)]
    if (!nbrs(i).some((j) => start[j]?.kind === 'num' && start[j]!.v === pool[k % 3])) start[i] = { kind: 'num', v: pool[k % 3], cracks: 0 }
  }
  return {
    n,
    goal,
    blocked,
    start,
    pool,
    seed: Math.floor(r() * 1e6),
    opening: [],
    jokerEvery: 9 + (n % 4),
    bombEvery: 17 + (n % 5),
    par: 34 + tier * 3 + (hard ? 6 : 0),
    hard,
  }
}

// ── Solver (verification + par) ───────────────────────────
function key(g: Cell[]) {
  let k = ''
  for (const t of g) k += t ? (t.kind === 'stone' ? 's' + t.cracks : t.v.toString(36)) + ',' : '.,'
  return k
}

function evalGrid(g: Cell[], lv: LevelDef) {
  let s = 0
  let empty = 0
  let max = 0
  for (let i = 0; i < g.length; i++) {
    const t = g[i]
    if (lv.blocked[i]) continue
    if (!t) {
      empty++
      continue
    }
    if (t.kind === 'stone') {
      s -= 1 + t.cracks * 0.5
      continue
    }
    max = Math.max(max, t.v)
    const q = t.v / lv.goal
    s += q * q * 300
    for (const j of nbrs(i)) {
      const o = g[j]
      if (!o || o.kind !== 'num') continue
      if (o.v === t.v) s += 1.5
      else if (o.v === t.v * 2 || o.v * 2 === t.v) s += 0.5
      else s -= 0.3
    }
  }
  return s + empty * 2 + Math.log2(Math.max(2, max)) * 3
}

/** Beam search: fewest placements found that make the goal tile, or -1. */
export function solve(lv: LevelDef, width = 120, maxMoves = 200) {
  const minV = lv.pool[0]
  let beam: Cell[][] = [lv.start.map((t) => (t ? { ...t } : null))]
  for (let m = 0; m < maxMoves; m++) {
    const pc = pieceAt(lv, m)
    const next: { g: Cell[]; s: number }[] = []
    const seen = new Set<string>()
    for (const g of beam) {
      for (let i = 0; i < N * N; i++) {
        if (lv.blocked[i] || g[i]) continue
        const res = simulate(g, i, pc, minV)
        if (res.best >= lv.goal) return m + 1
        const k = key(res.grid)
        if (seen.has(k)) continue
        seen.add(k)
        next.push({ g: res.grid, s: evalGrid(res.grid, lv) })
      }
    }
    if (!next.length) return -1
    next.sort((a, b) => b.s - a.s)
    beam = next.slice(0, width).map((x) => x.g)
  }
  return -1
}
