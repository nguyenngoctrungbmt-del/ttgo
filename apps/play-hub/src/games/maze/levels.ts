// Seeded maze levels. A recursive backtracker carves a perfect maze on the odd cells of an odd-sized
// grid (so start and exit are always connected), later levels knock out a few extra walls to add
// loops and decoy routes. par = BFS shortest path. Scratch cl-maze-check.mjs verifies 1–100.

export type Cell = 0 | 1 // 0 open, 1 wall
export type MazeLevel = { size: number; board: Cell[]; par: number }

function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function neighbors(index: number, size: number): number[] {
  const r = Math.floor(index / size)
  const c = index % size
  const list: number[] = []
  if (r > 0) list.push(index - size)
  if (r < size - 1) list.push(index + size)
  if (c > 0) list.push(index - 1)
  if (c < size - 1) list.push(index + 1)
  return list
}

/** Shortest path length from 0 to the last cell, or -1. */
export function shortest(board: Cell[], size: number): number {
  const goal = size * size - 1
  const dist = new Array<number>(board.length).fill(-1)
  dist[0] = 0
  const q = [0]
  for (let qi = 0; qi < q.length; qi += 1) {
    const cur = q[qi]
    if (cur === goal) return dist[cur]
    for (const n of neighbors(cur, size)) {
      if (board[n] === 0 && dist[n] < 0) {
        dist[n] = dist[cur] + 1
        q.push(n)
      }
    }
  }
  return -1
}

function sizeFor(n: number): number {
  const boss = n % 5 === 0 ? 2 : 0
  const base = n <= 4 ? 5 : n <= 10 ? 7 : n <= 18 ? 9 : n <= 27 ? 11 : n <= 38 ? 13 : 15
  return Math.min(base + boss, 17)
}

/** Level n (1-based), deterministic. */
export function mazeLevel(n: number): MazeLevel {
  const size = sizeFor(n)
  const rand = mulberry32(n * 6151 + 3)
  const board: Cell[] = Array.from({ length: size * size }, () => 1)
  const at = (r: number, c: number) => r * size + c
  const stack: [number, number][] = [[0, 0]]
  board[0] = 0
  while (stack.length) {
    const [r, c] = stack[stack.length - 1]
    const opts: [number, number][] = []
    for (const [dr, dc] of [
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ]) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nc >= 0 && nr < size && nc < size && board[at(nr, nc)] === 1) opts.push([nr, nc])
    }
    if (!opts.length) {
      stack.pop()
      continue
    }
    const [nr, nc] = opts[Math.floor(rand() * opts.length)]
    board[at((r + nr) / 2, (c + nc) / 2)] = 0
    board[at(nr, nc)] = 0
    stack.push([nr, nc])
  }
  // loops: open a few walls that sit between two corridors
  const loops = n <= 6 ? 0 : Math.min(1 + Math.floor(n / 8), 6)
  for (let k = 0, guard = 0; k < loops && guard < 500; guard += 1) {
    const r = Math.floor(rand() * size)
    const c = Math.floor(rand() * size)
    if (board[at(r, c)] === 0 || (r % 2 === 0) === (c % 2 === 0)) continue
    board[at(r, c)] = 0
    k += 1
  }
  return { size, board, par: shortest(board, size) }
}
