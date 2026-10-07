/**
 * Bubble Pop board rules (pure, no rendering): hex grid, aiming trace, snapping,
 * matching, specials and floating drops. Shared by the game and the scratch
 * verification bot (`lv3-bb-verify`) so authored levels are checked with the real rules.
 */
import type { Special } from './art'

export const COLS = 10
export const TOP = 54

export type Geo = { W: number; H: number; R: number; rowH: number; sx: number; sy: number; deathY: number; swapX: number; swapY: number }
export type Ball = { color: number; special?: Special }
export type Cell = { color: number; special?: Special; star?: boolean } | null
export type Board = {
  grid: Cell[][]
  parity: number
  /** Rows the ceiling has dropped (authored levels). */
  ceil: number
  /** Slide-in offset (px, ≤ 0) after a push or ceiling drop. */
  gridOff: number
}

export function makeGeo(W: number, H: number): Geo {
  const R = W / (COLS * 2)
  const rowH = R * Math.sqrt(3)
  const sy = H - Math.max(56, R * 3.2)
  return { W, H, R, rowH, sx: W / 2, sy, deathY: sy - R * 2.3, swapX: W / 2 - R * 4.4, swapY: sy + R * 0.6 }
}

export const odd = (b: Board, r: number) => ((r + b.parity) & 1) === 1
export const rowLen = (b: Board, r: number) => (odd(b, r) ? COLS - 1 : COLS)

/** Y of the ceiling's underside. */
export function ceilY(b: Board, geo: Geo, withOff = true) {
  return TOP + b.ceil * geo.rowH + (withOff ? b.gridOff : 0)
}

export function cellXY(b: Board, geo: Geo, r: number, c: number, withOff = true): [number, number] {
  const { R, rowH } = geo
  return [R + c * 2 * R + (odd(b, r) ? R : 0), ceilY(b, geo, withOff) + R + r * rowH]
}

export function cell(b: Board, r: number, c: number): Cell {
  const row = b.grid[r]
  return row ? (row[c] ?? null) : null
}

export function neighbors(b: Board, r: number, c: number): Array<[number, number]> {
  const out: Array<[number, number]> = [
    [r, c - 1],
    [r, c + 1],
  ]
  const o = odd(b, r)
  for (const rr of [r - 1, r + 1]) {
    if (o) out.push([rr, c], [rr, c + 1])
    else out.push([rr, c - 1], [rr, c])
  }
  return out.filter(([rr, cc]) => rr >= 0 && cc >= 0 && cc < rowLen(b, rr))
}

export function bubbleCount(b: Board) {
  let n = 0
  for (const row of b.grid) for (const c of row) if (c) n++
  return n
}

export function presentColors(b: Board, fallback: number): number[] {
  const set = new Set<number>()
  for (const row of b.grid) for (const c of row) if (c && !c.special) set.add(c.color)
  return set.size ? [...set] : [...Array(fallback).keys()]
}

export function lowestBottom(b: Board, geo: Geo) {
  for (let r = b.grid.length - 1; r >= 0; r--) {
    if (b.grid[r].some((c) => c)) return cellXY(b, geo, r, 0, false)[1] + geo.R
  }
  return ceilY(b, geo, false)
}

export function collides(b: Board, geo: Geo, x: number, y: number): boolean {
  const { R, rowH } = geo
  const rr = Math.round((y - ceilY(b, geo) - R) / rowH)
  const lim = (2 * R * 0.86) ** 2
  for (let r = Math.max(0, rr - 1); r <= rr + 1 && r < b.grid.length; r++) {
    const row = b.grid[r]
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue
      const [cx, cy] = cellXY(b, geo, r, c)
      if ((cx - x) ** 2 + (cy - y) ** 2 < lim) return true
    }
  }
  return false
}

/** Follow a shot from the cannon (wall bounces) until it touches the ceiling or a bubble. */
export function trace(b: Board, geo: Geo, a: number, maxLen: number, maxB: number) {
  const { W, R, sx, sy } = geo
  let x = sx + Math.cos(a) * R * 1.3
  let y = sy + Math.sin(a) * R * 1.3
  let dx = Math.cos(a)
  const dy = Math.sin(a)
  const pts: Array<[number, number]> = [[x, y]]
  let len = 0
  let bn = 0
  while (len < maxLen) {
    x += dx * 4
    y += dy * 4
    len += 4
    if (x < R) {
      x = 2 * R - x
      dx = -dx
      bn++
      pts.push([x, y])
    } else if (x > W - R) {
      x = 2 * (W - R) - x
      dx = -dx
      bn++
      pts.push([x, y])
    }
    if (bn > maxB) return { pts, x, y, land: false }
    if (y < ceilY(b, geo) + R || collides(b, geo, x, y)) {
      pts.push([x, y])
      return { pts, x, y, land: true }
    }
  }
  pts.push([x, y])
  return { pts, x, y, land: false }
}

export function snapCell(b: Board, geo: Geo, x: number, y: number): [number, number] {
  const { R, rowH } = geo
  const r0 = Math.max(0, Math.round((y - ceilY(b, geo) - R) / rowH))
  let best: [number, number] = [r0, 0]
  let bd = Infinity
  for (let r = Math.max(0, r0 - 1); r <= r0 + 1; r++) {
    for (let c = 0; c < rowLen(b, r); c++) {
      if (cell(b, r, c)) continue
      // Must touch the ceiling or an existing bubble
      if (r > 0 && !neighbors(b, r, c).some(([nr, nc]) => cell(b, nr, nc))) continue
      const [cx, cy] = cellXY(b, geo, r, c)
      const d = (cx - x) ** 2 + (cy - y) ** 2
      if (d < bd) {
        bd = d
        best = [r, c]
      }
    }
  }
  return best
}

export function flood(b: Board, r: number, c: number, color: number): Array<[number, number]> {
  const seen = new Set<string>([`${r},${c}`])
  const out: Array<[number, number]> = [[r, c]]
  for (let i = 0; i < out.length; i++) {
    for (const [nr, nc] of neighbors(b, out[i][0], out[i][1])) {
      const k = `${nr},${nc}`
      if (seen.has(k)) continue
      const n = cell(b, nr, nc)
      if (n && !n.special && n.color === color) {
        seen.add(k)
        out.push([nr, nc])
      }
    }
  }
  return out
}

export type Popped = { r: number; c: number; x: number; y: number; cell: NonNullable<Cell>; delay: number }

/** Remove everything not connected to the ceiling. Returns the removed bubbles. */
export function dropFloating(b: Board, geo: Geo): Popped[] {
  const seen = new Set<string>()
  const queue: Array<[number, number]> = []
  if (b.grid[0]) b.grid[0].forEach((x, c) => x && (seen.add(`0,${c}`), queue.push([0, c])))
  for (let i = 0; i < queue.length; i++) {
    for (const [nr, nc] of neighbors(b, queue[i][0], queue[i][1])) {
      const k = `${nr},${nc}`
      if (!seen.has(k) && cell(b, nr, nc)) {
        seen.add(k)
        queue.push([nr, nc])
      }
    }
  }
  const out: Popped[] = []
  b.grid.forEach((row, r) =>
    row.forEach((x, c) => {
      if (!x || seen.has(`${r},${c}`)) return
      const [px, py] = cellXY(b, geo, r, c)
      out.push({ r, c, x: px, y: py, cell: x, delay: 0 })
      row[c] = null
    }),
  )
  while (b.grid.length && !b.grid[b.grid.length - 1].some((x) => x)) b.grid.pop()
  return out
}

export type Landing = { r: number; c: number; cx: number; cy: number; popped: Popped[]; dropped: Popped[] }

/** Land a ball at (x, y): snap, resolve specials and matches, then drop floating bubbles. */
export function place(b: Board, geo: Geo, ball: Ball, x: number, y: number): Landing {
  const { R } = geo
  const [r, c] = snapCell(b, geo, x, y)
  while (b.grid.length <= r) b.grid.push(new Array(rowLen(b, b.grid.length)).fill(null))
  b.grid[r][c] = { color: ball.color, special: ball.special }
  const [cx, cy] = cellXY(b, geo, r, c)
  const popped: Popped[] = []
  const popAt = (rr: number, cc: number, delay: number) => {
    const x0 = cell(b, rr, cc)
    if (!x0) return
    const [px, py] = cellXY(b, geo, rr, cc)
    b.grid[rr][cc] = null
    popped.push({ r: rr, c: cc, x: px, y: py, cell: x0, delay })
  }
  if (ball.special === 'bomb') {
    const lim = (2 * R * 2.15) ** 2
    b.grid.forEach((row, rr) =>
      row.forEach((x0, cc) => {
        if (!x0) return
        const [bx, by] = cellXY(b, geo, rr, cc)
        const d = (bx - cx) ** 2 + (by - cy) ** 2
        if (d < lim) popAt(rr, cc, Math.sqrt(d) / 900)
      }),
    )
  } else if (ball.special === 'bolt') {
    const row = b.grid[r]
    for (let cc = 0; cc < row.length; cc++) if (row[cc]) popAt(r, cc, Math.abs(cc - c) * 0.025)
  } else if (ball.special === 'rainbow') {
    // Rainbow: becomes whichever neighbour colour makes the biggest group.
    let bestC = ball.color
    let bestN = 0
    const seen = new Set<number>()
    for (const [nr, nc] of neighbors(b, r, c)) {
      const n = cell(b, nr, nc)
      if (!n || n.special || seen.has(n.color)) continue
      seen.add(n.color)
      b.grid[r][c] = { color: n.color }
      const size = flood(b, r, c, n.color).length
      if (size > bestN) {
        bestN = size
        bestC = n.color
      }
    }
    b.grid[r][c] = { color: bestC }
  }
  const placed = cell(b, r, c)
  if (placed && !placed.special) {
    const group = flood(b, r, c, placed.color)
    if (group.length >= 3) {
      for (const [gr, gc] of group) {
        const [bx, by] = cellXY(b, geo, gr, gc)
        popAt(gr, gc, Math.hypot(bx - cx, by - cy) / 700)
      }
    }
  }
  if (placed?.special) {
    b.grid[r][c] = null
  }
  const dropped = dropFloating(b, geo)
  return { r, c, cx, cy, popped, dropped }
}

/** Seeded RNG (mulberry32) so a level deals the same bubbles on every attempt. */
export function seededRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
