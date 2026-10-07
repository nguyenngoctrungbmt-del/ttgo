/** Tower Rush maps: grid layout, enemy paths, build pads and scenery. */

export const COLS = 9
export const ROWS = 13

export type Pt = { x: number; y: number }
export type Path = { pts: Pt[]; cum: number[]; len: number }
export type Deco = { cx: number; cy: number; kind: number; seed: number }
/** `maxPads` keeps only the best N build pads (authored scarcity). */
export type MapDef = { name: string; theme: 0 | 1 | 2; pts: [number, number][]; maxPads?: number }

export type MapData = {
  def: MapDef
  ground: Path
  air: Path
  pathCells: Set<number>
  pads: Pt[]
  decos: Deco[]
}

export const MAPS: MapDef[] = [
  {
    name: 'Green Vale',
    theme: 0,
    pts: [[-1, 1], [7, 1], [7, 4], [1, 4], [1, 7], [7, 7], [7, 10], [4, 10], [4, 13]],
  },
  {
    name: 'Red Canyon',
    theme: 1,
    pts: [[1, -1], [1, 3], [7, 3], [7, 6], [4, 6], [4, 9], [1, 9], [1, 11], [7, 11], [7, 13]],
  },
  {
    name: 'Frost Pass',
    theme: 2,
    pts: [[-1, 11], [2, 11], [2, 1], [5, 1], [5, 9], [7, 9], [7, 5], [9, 5]],
  },
]

function mulberry(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makePath(pts: Pt[]): Path {
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  return { pts, cum, len: cum[cum.length - 1] }
}

/** Position along a path at distance d (grid units) plus the heading. */
export function posAt(p: Path, d: number, out: { x: number; y: number; dx: number; dy: number }) {
  const { pts, cum } = p
  let i = 1
  while (i < pts.length - 1 && cum[i] < d) i++
  const a = pts[i - 1]
  const b = pts[i]
  const seg = cum[i] - cum[i - 1] || 1
  const k = Math.max(0, Math.min(1, (d - cum[i - 1]) / seg))
  out.x = a.x + (b.x - a.x) * k
  out.y = a.y + (b.y - a.y) * k
  out.dx = (b.x - a.x) / seg
  out.dy = (b.y - a.y) / seg
  return out
}

export const cellKey = (cx: number, cy: number) => cy * COLS + cx

export function buildMap(def: MapDef, index: number): MapData {
  const pts = def.pts.map(([x, y]) => ({ x, y }))
  const pathCells = new Set<number>()
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const n = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))
    for (let s = 0; s <= n; s++) {
      const x = Math.round(a.x + ((b.x - a.x) * s) / n)
      const y = Math.round(a.y + ((b.y - a.y) * s) / n)
      if (x >= 0 && x < COLS && y >= 0 && y < ROWS) pathCells.add(cellKey(x, y))
    }
  }
  const near = (cx: number, cy: number, r: number) => {
    let n = 0
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (pathCells.has(cellKey(cx + dx, cy + dy)) && cx + dx >= 0 && cx + dx < COLS) n++
    return n
  }
  const rng = mulberry(1234 + index * 977)
  const cands: { x: number; y: number; score: number }[] = []
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      if (pathCells.has(cellKey(cx, cy)) || near(cx, cy, 1) === 0) continue
      cands.push({ x: cx, y: cy, score: near(cx, cy, 2) + rng() * 1.5 })
    }
  }
  cands.sort((a, b) => b.score - a.score)
  const pads: Pt[] = []
  for (const c of cands) {
    if (pads.some((p) => Math.abs(p.x - c.x) <= 1 && Math.abs(p.y - c.y) <= 1)) continue
    pads.push({ x: c.x, y: c.y })
  }
  if (def.maxPads) pads.length = Math.min(pads.length, def.maxPads)
  const decos: Deco[] = []
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      if (pathCells.has(cellKey(cx, cy)) || pads.some((p) => p.x === cx && p.y === cy)) continue
      if (rng() < 0.42) decos.push({ cx, cy, kind: Math.floor(rng() * 4), seed: rng() })
    }
  }
  const first = pts[0]
  const last = pts[pts.length - 1]
  return { def, ground: makePath(pts), air: makePath([first, last]), pathCells, pads, decos }
}
