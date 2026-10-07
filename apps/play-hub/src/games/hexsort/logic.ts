/** Hexa Sort rules shared by the game and the level verifier. Pure logic, no DOM. */

export const CLEAR_AT = 10
export const MAX_COLORS = 8

export type HexCell = { q: number; r: number; ring: number; open: boolean; lock: number; stack: number[]; pop: number; nb: number[] }

/** Cells of the radius-3 board in column order (q = -3..3, r top to bottom). */
export function buildCells(): HexCell[] {
  const cells: HexCell[] = []
  for (let q = -3; q <= 3; q++) {
    for (let r = Math.max(-3, -3 - q); r <= Math.min(3, 3 - q); r++) {
      const s = -q - r
      cells.push({ q, r, ring: Math.max(Math.abs(q), Math.abs(r), Math.abs(s)), open: false, lock: 0, stack: [], pop: 0, nb: [] })
    }
  }
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]]
  cells.forEach((c) => {
    c.nb = dirs.map(([dq, dr]) => cells.findIndex((o) => o.q === c.q + dq && o.r === c.r + dr)).filter((i) => i >= 0)
  })
  return cells
}

export const COL_LEN = [4, 5, 6, 7, 6, 5, 4]

export function topRun(stack: number[]) {
  if (!stack.length) return 0
  const c = stack[stack.length - 1]
  let n = 0
  for (let i = stack.length - 1; i >= 0 && stack[i] === c; i--) n++
  return n
}

/** Small seedable RNG whose whole state is one number (easy to copy in a search). */
export type Rng = { s: number }
export function rnd(g: Rng) {
  g.s = (g.s + 0x6d2b79f5) >>> 0
  let t = g.s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export type OfferSpec = { colors: number; hMin: number; hMax: number; p3: number; p2: number; bonusEvery: number }

/** One offered stack: 1–3 colour segments, the top often matching a board top. */
export function genStack(g: Rng, o: OfferSpec, tops: number[]): number[] {
  const h = Math.round(o.hMin + rnd(g) * (o.hMax - o.hMin))
  const segs = rnd(g) < o.p3 ? 3 : rnd(g) < o.p2 ? 2 : 1
  const out: number[] = []
  let prev = -1
  for (let sgi = 0; sgi < segs; sgi++) {
    let col = Math.floor(rnd(g) * o.colors)
    if (sgi === segs - 1 && tops.length && rnd(g) < 0.4) col = tops[Math.floor(rnd(g) * tops.length)]
    if (col === prev) col = (col + 1 + Math.floor(rnd(g) * (o.colors - 1))) % o.colors
    const n = sgi === segs - 1 ? Math.max(1, h - out.length) : Math.max(1, Math.round(h / segs))
    for (let i = 0; i < n; i++) out.push(col)
    prev = col
  }
  return out.slice(0, 9)
}

export function boardTops(cells: HexCell[]) {
  const tops: number[] = []
  for (const c of cells) if (c.open && c.stack.length) tops.push(c.stack[c.stack.length - 1])
  return tops
}

/** Deal three new offers; every `bonusEvery`-th deal one is a tall single-colour bonus stack. */
export function deal(g: Rng, o: OfferSpec, cells: HexCell[], refills: number): { offers: number[][]; bonus: boolean } {
  const tops = boardTops(cells)
  const offers = [genStack(g, o, tops), genStack(g, o, tops), genStack(g, o, tops)]
  let bonus = false
  if (o.bonusEvery > 0 && refills % o.bonusEvery === 0) {
    const c = Math.floor(rnd(g) * o.colors)
    offers[Math.floor(rnd(g) * 3)] = Array.from({ length: 7 }, () => c)
    bonus = true
  }
  return { offers, bonus }
}

/**
 * Resolve a placement instantly (same order as the animated game):
 * the cluster around a stack merges into the stack with the longest top run;
 * runs of CLEAR_AT+ clear and their neighbours re-check.
 */
export function resolveSync(cells: HexCell[], start: number): { tiles: number; clears: number; biggest: number } {
  const queue = [start]
  let tiles = 0
  let clears = 0
  let biggest = 0
  let guard = 0
  while (queue.length && guard++ < 400) {
    const xi = queue.shift()!
    const X = cells[xi]
    if (!X.stack.length) continue
    const c = X.stack[X.stack.length - 1]
    const nbrs = X.nb.filter((i) => cells[i].open && cells[i].stack.length && cells[i].stack[cells[i].stack.length - 1] === c)
    if (!nbrs.length) continue
    const cluster = [xi, ...nbrs]
    let T = xi
    for (const i of cluster) if (topRun(cells[i].stack) > topRun(cells[T].stack)) T = i
    const donors = cluster.filter((i) => i !== T)
    for (const di of donors) {
      const D = cells[di]
      const n = topRun(D.stack)
      for (let k = 0; k < n; k++) {
        D.stack.pop()
        cells[T].stack.push(c)
      }
    }
    const n = topRun(cells[T].stack)
    if (n >= CLEAR_AT) {
      cells[T].stack.splice(cells[T].stack.length - n, n)
      tiles += n
      clears += 1
      biggest = Math.max(biggest, n)
      queue.push(T, ...donors, ...cells[T].nb)
    } else queue.push(T, ...donors)
  }
  return { tiles, clears, biggest }
}

/** Open locked cells whose threshold has been reached; returns the cells opened. */
export function openLocks(cells: HexCell[], cleared: number): number[] {
  const out: number[] = []
  cells.forEach((c, i) => {
    if (!c.open && c.lock > 0 && cleared >= c.lock) {
      c.open = true
      c.lock = 0
      out.push(i)
    }
  })
  return out
}

export function hasRoom(cells: HexCell[]) {
  return cells.some((c) => c.open && !c.stack.length)
}
