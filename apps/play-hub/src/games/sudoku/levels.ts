// Seeded sudoku levels: 4×4 → 6×6 → 9×9. Holes are dug one at a time and a hole is only kept
// when the puzzle still has exactly one solution (checked by a backtracking counter), so every
// level is unique by construction. Scratch cl-sudoku-check.mjs re-verifies levels 1–80.

export type SudokuLevel = {
  size: number
  boxR: number
  boxC: number
  puzzle: number[]
  solution: number[]
}

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export type Geo = { size: number; boxR: number; boxC: number; peers: number[][] }

function geometry(size: number, boxR: number, boxC: number): Geo {
  const peers: number[][] = []
  for (let i = 0; i < size * size; i += 1) {
    const r = Math.floor(i / size)
    const c = i % size
    const set = new Set<number>()
    for (let k = 0; k < size; k += 1) {
      set.add(r * size + k)
      set.add(k * size + c)
    }
    const br = Math.floor(r / boxR) * boxR
    const bc = Math.floor(c / boxC) * boxC
    for (let rr = br; rr < br + boxR; rr += 1) for (let cc = bc; cc < bc + boxC; cc += 1) set.add(rr * size + cc)
    set.delete(i)
    peers.push([...set])
  }
  return { size, boxR, boxC, peers }
}

function candidates(g: Geo, board: number[], i: number): number[] {
  const used = new Set<number>()
  for (const p of g.peers[i]) if (board[p]) used.add(board[p])
  const out: number[] = []
  for (let d = 1; d <= g.size; d += 1) if (!used.has(d)) out.push(d)
  return out
}

/** Counts solutions up to `limit` (most-constrained cell first). */
export function countSolutions(g: Geo, board: number[], limit = 2): number {
  let best = -1
  let bestCands: number[] = []
  for (let i = 0; i < board.length; i += 1) {
    if (board[i]) continue
    const c = candidates(g, board, i)
    if (!c.length) return 0
    if (best < 0 || c.length < bestCands.length) {
      best = i
      bestCands = c
      if (c.length === 1) break
    }
  }
  if (best < 0) return 1
  let total = 0
  for (const d of bestCands) {
    board[best] = d
    total += countSolutions(g, board, limit - total)
    board[best] = 0
    if (total >= limit) break
  }
  return total
}

function fill(g: Geo, board: number[], rand: () => number): boolean {
  const i = board.indexOf(0)
  if (i < 0) return true
  for (const d of shuffle(candidates(g, board, i), rand)) {
    board[i] = d
    if (fill(g, board, rand)) return true
  }
  board[i] = 0
  return false
}

function spec(n: number): { size: number; boxR: number; boxC: number; holes: number } {
  const boss = n % 5 === 0 ? 1 : 0
  if (n <= 8) return { size: 4, boxR: 2, boxC: 2, holes: Math.min(6 + n + boss, 11) }
  if (n <= 20) return { size: 6, boxR: 2, boxC: 3, holes: Math.min(14 + (n - 9) + boss * 2, 24) }
  return { size: 9, boxR: 3, boxC: 3, holes: Math.min(36 + Math.floor((n - 21) * 0.6) + boss * 3, 54) }
}

export const geoFor = (lv: SudokuLevel): Geo => geometry(lv.size, lv.boxR, lv.boxC)

const cache = new Map<number, SudokuLevel>()

/** Level n (1-based), deterministic. */
export function sudokuLevel(n: number): SudokuLevel {
  const hit = cache.get(n)
  if (hit) return hit
  const { size, boxR, boxC, holes } = spec(n)
  const g = geometry(size, boxR, boxC)
  const rand = mulberry32(n * 4099 + 7)
  const solution = Array.from({ length: size * size }, () => 0)
  fill(g, solution, rand)
  const puzzle = [...solution]
  let dug = 0
  for (const i of shuffle(Array.from({ length: size * size }, (_, k) => k), rand)) {
    if (dug >= holes) break
    const keep = puzzle[i]
    puzzle[i] = 0
    if (countSolutions(g, [...puzzle]) === 1) dug += 1
    else puzzle[i] = keep
  }
  const lv = { size, boxR, boxC, puzzle, solution }
  cache.set(n, lv)
  return lv
}
