/**
 * Arrow Escape rules + generator.
 * An arrow is a snake of cells (tail → head). Tapped, it slides head-first in
 * its facing; the body follows. It escapes when the ray from the head to the
 * edge is clear. Levels are built in reverse: each new arrow's ray must be
 * clear of every arrow placed before it, so removing newest-first always works.
 */

export type Dir = 0 | 1 | 2 | 3 // right, down, left, up
export const DX = [1, 0, -1, 0]
export const DY = [0, 1, 0, -1]

export type Arrow = { id: number; cells: number[]; dir: Dir; color: number; gone: boolean }

export type LevelSpec = {
  n: number
  cols: number
  rows: number
  fill: number
  maxLen: number
  stones: number
  hard: boolean
  intro?: string
}

export type Level = { spec: LevelSpec; arrows: Arrow[]; stones: number[] }

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
  const base: LevelSpec = { n, cols: 4, rows: 4, fill: 0.6, maxLen: 1, stones: 0, hard }
  switch (n) {
    case 1:
      return { ...base, intro: 'tap an arrow with a clear path' }
    case 2:
      return { ...base, cols: 5, rows: 5, fill: 0.75, intro: 'a blocked arrow costs a heart' }
    case 3:
      return { ...base, cols: 5, rows: 6, fill: 0.8, maxLen: 3, intro: 'long arrows follow their head' }
    case 4:
      return { ...base, cols: 6, rows: 6, fill: 0.85, maxLen: 4 }
    case 5:
      return { ...base, cols: 6, rows: 7, fill: 0.92, maxLen: 5 }
  }
  const k = n - 5
  return {
    ...base,
    cols: Math.min(9, 6 + Math.floor(k / 3)),
    rows: Math.min(11, 7 + Math.floor(k / 2.5)),
    fill: Math.min(0.97, 0.86 + k * 0.01 + (hard ? 0.05 : 0)),
    maxLen: Math.min(8, 4 + Math.floor(k / 3)),
    stones: n >= 8 ? Math.min(4, 1 + Math.floor((n - 8) / 4)) : 0,
    intro: n === 8 ? 'stones never move — go around them' : undefined,
  }
}

export function headOf(a: Arrow) {
  return a.cells[a.cells.length - 1]
}

/** Cells in front of the head up to the edge. */
export function rayOf(cols: number, rows: number, a: { cells: number[]; dir: Dir }): number[] {
  const h = a.cells[a.cells.length - 1]
  let x = h % cols
  let y = Math.floor(h / cols)
  const out: number[] = []
  for (;;) {
    x += DX[a.dir]
    y += DY[a.dir]
    if (x < 0 || y < 0 || x >= cols || y >= rows) return out
    out.push(y * cols + x)
  }
}

export function occupancy(cols: number, rows: number, arrows: Arrow[], stones: number[]) {
  const occ = new Int32Array(cols * rows).fill(-1)
  for (const s of stones) occ[s] = -2
  for (const a of arrows) if (!a.gone) for (const c of a.cells) occ[c] = a.id
  return occ
}

/** Steps the head can travel before hitting something (-1 = escapes). */
export function hitDistance(cols: number, rows: number, occ: Int32Array, a: Arrow): { steps: number; blocker: number } {
  const ray = rayOf(cols, rows, a)
  for (let i = 0; i < ray.length; i++) {
    const o = occ[ray[i]]
    if (o !== -1 && o !== a.id) return { steps: i, blocker: o }
  }
  return { steps: -1, blocker: -1 }
}

function tryGen(spec: LevelSpec, rng: Rng): Level {
  const { cols, rows } = spec
  const N = cols * rows
  const occ = new Int32Array(N).fill(-1)
  const stones: number[] = []
  while (stones.length < spec.stones) {
    const x = 1 + Math.floor(rng() * (cols - 2))
    const y = 1 + Math.floor(rng() * (rows - 2))
    const i = y * cols + x
    if (!stones.includes(i)) {
      stones.push(i)
      occ[i] = -2
    }
  }
  const arrows: Arrow[] = []
  const target = Math.floor((N - stones.length) * spec.fill)
  let filled = 0
  const nb = (i: number) => {
    const x = i % cols
    const y = Math.floor(i / cols)
    const out: number[] = []
    if (x > 0) out.push(i - 1)
    if (x < cols - 1) out.push(i + 1)
    if (y > 0) out.push(i - cols)
    if (y < rows - 1) out.push(i + cols)
    return out
  }
  // interior cells first so rays toward the rim stay open longer
  const edgeDist = (i: number) => Math.min(i % cols, cols - 1 - (i % cols), Math.floor(i / cols), rows - 1 - Math.floor(i / cols))
  for (let tries = 0; tries < N * 8 && filled < target; tries++) {
    const empty: number[] = []
    for (let i = 0; i < N; i++) if (occ[i] === -1) empty.push(i)
    if (!empty.length) break
    empty.sort((a, b) => edgeDist(b) - edgeDist(a) + (rng() - 0.5) * 3.2)
    const h = empty[Math.floor(rng() * Math.min(empty.length, 6))]
    const dirs = ([0, 1, 2, 3] as Dir[]).sort(() => rng() - 0.5)
    let made = false
    for (const d of dirs) {
      const ray = rayOf(cols, rows, { cells: [h], dir: d })
      if (ray.some((c) => occ[c] !== -1)) continue
      // body: first cell directly behind the head, then a random walk
      const cells = [h]
      const len = 1 + Math.floor(rng() * spec.maxLen)
      const behind = h - DX[d] - DY[d] * cols
      const bx = (h % cols) - DX[d]
      const by = Math.floor(h / cols) - DY[d]
      const raySet = new Set(ray)
      if (len > 1 && bx >= 0 && by >= 0 && bx < cols && by < rows && occ[behind] === -1) {
        cells.unshift(behind)
        while (cells.length < len) {
          const opts = nb(cells[0]).filter((c) => occ[c] === -1 && !cells.includes(c) && !raySet.has(c))
          if (!opts.length) break
          cells.unshift(opts[Math.floor(rng() * opts.length)])
        }
      }
      const id = arrows.length
      for (const c of cells) occ[c] = id
      arrows.push({ id, cells, dir: d, color: Math.floor(rng() * 6), gone: false })
      filled += cells.length
      made = true
      break
    }
    if (!made && rng() < 0.02) break
  }
  return { spec, arrows, stones }
}

export function generate(spec: LevelSpec, seed: number): Level {
  const rng = makeRng(seed)
  let best: Level | null = null
  for (let a = 0; a < 12; a++) {
    const lv = tryGen(spec, rng)
    const cells = lv.arrows.reduce((s, x) => s + x.cells.length, 0)
    const bc = best ? best.arrows.reduce((s, x) => s + x.cells.length, 0) : -1
    if (cells > bc) best = lv
    if (cells >= Math.floor((spec.cols * spec.rows - spec.stones) * spec.fill)) break
  }
  return best!
}
