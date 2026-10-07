/**
 * Bridge Builder levels: 32 hand-designed sites, then encore crossings with tighter budgets.
 * Every authored site ships with a known-good design recipe (`sol`) that scratch script
 * `lv3-br-verify` builds and drives through the real physics (strength 0.92×, no perks)
 * — the budget is then set from that design's cost so three stars are always reachable.
 */
import { MATS, type BuildBeam, type BuildNode, type Mat, type VehicleKind } from './physics'

export const GRID = 30
export const TOP_Y = 120
export const WATER = 480
export const WORLD_W = 360

export type Level = {
  n: number
  x0: number
  x1: number
  yL: number
  yR: number
  anchors: { x: number; y: number }[]
  pillar: { x: number; top: number } | null
  lane: { x0: number; x1: number; y0: number } | null
  vehicles: VehicleKind[]
  wind: number
  budget: number
  name?: string
  hint?: string
}

/** Known-good design recipe: road deck plus an optional truss under or over it. */
export type Truss = {
  /** Chord material; verticals and diagonals default to it. */
  mat: Mat
  vert?: Mat
  diag?: Mat
  /** Cross-brace every panel (both diagonals). */
  cross?: boolean
}
export type Recipe = {
  under?: Truss & { depth: 30 | 60 }
  over?: Truss & { h: 30 | 60 }
  /** Tie the truss ends to the lower cliff anchors. */
  ties?: boolean
  /** Extra struts from the lower cliff anchors up to the first deck joints. */
  brace?: Mat
  /** Brace the deck to the pillar. */
  pillar?: Mat
}

type Site = {
  name: string
  /** Gap in grid cells and left cliff edge column. */
  gap: number
  left?: number
  yL?: number
  yR?: number
  dropL?: boolean
  dropR?: boolean
  pillar?: boolean
  /** Ship lane: half-width in px around the gap centre and clearance below the deck. */
  lane?: { half: number; clear: number }
  vehicles: VehicleKind[]
  wind?: number
  budget: number
  sol: Recipe
  hint?: string
}


/**
 * Arc: 1–5 first spans and convoys · 6–10 uneven cliffs, heavy trucks, first pillar ·
 * 11–15 ship lanes (build shallow or above) · 16–20 wind · 21–25 buses and convoys ·
 * 26–32 everything, missing anchors, long spans. Every 5th site is a boss crossing.
 */
const SITES: Site[] = [
  { name: 'Creek', gap: 3, vehicles: ['car'], budget: 770, sol: { under: { depth: 30, mat: 'wood' } }, hint: 'trace the ghost beams' },
  { name: 'Brook', gap: 4, vehicles: ['car'], budget: 1260, sol: { under: { depth: 30, mat: 'wood' }, ties: true }, hint: 'road for wheels, wood for support' },
  { name: 'Gully', gap: 4, vehicles: ['car'], budget: 1260, sol: { under: { depth: 30, mat: 'wood' }, ties: true }, hint: 'triangles are strong' },
  { name: 'Mill Race', gap: 5, vehicles: ['van'], budget: 2110, sol: { under: { depth: 30, mat: 'wood', cross: true }, ties: true, brace: 'wood' }, hint: 'a heavier van' },
  { name: 'Twin Cars', gap: 6, vehicles: ['car', 'car'], budget: 2520, sol: { under: { depth: 30, mat: 'wood', cross: true }, ties: true, brace: 'wood' }, hint: 'boss · a convoy of two' },
  { name: 'Step Down', gap: 5, yR: 330, vehicles: ['car'], budget: 2030, sol: { under: { depth: 30, mat: 'wood', cross: true }, ties: true, brace: 'wood' }, hint: 'the far bank sits lower' },
  { name: 'Ridge', gap: 6, yL: 270, vehicles: ['van'], budget: 3620, sol: { over: { h: 30, mat: 'steel', vert: 'wood' }, brace: 'wood' }, hint: 'downhill run' },
  { name: 'Quarry', gap: 6, vehicles: ['truck'], budget: 3690, sol: { under: { depth: 60, mat: 'wood', cross: true }, ties: true, brace: 'steel' }, hint: 'trucks need steel' },
  { name: 'Cut Bank', gap: 5, dropL: true, vehicles: ['van'], budget: 2330, sol: { over: { h: 30, mat: 'steel', vert: 'wood' } }, hint: 'no lower anchor on the left' },
  { name: 'Old Pier', gap: 7, pillar: true, vehicles: ['truck'], budget: 3750, sol: { under: { depth: 30, mat: 'wood', cross: true }, pillar: 'steel', brace: 'wood' }, hint: 'boss · lean on the pillar' },
  { name: 'Canal', gap: 5, lane: { half: 35, clear: 45 }, vehicles: ['car'], budget: 1520, sol: { under: { depth: 30, mat: 'wood' }, brace: 'wood' }, hint: 'keep the ship lane clear' },
  { name: 'Tall Mast', gap: 5, lane: { half: 50, clear: 15 }, vehicles: ['car'], budget: 1520, sol: { over: { h: 30, mat: 'wood' }, brace: 'wood' }, hint: 'tall ships — build above the road' },
  { name: 'Lock Gate', gap: 6, yR: 330, lane: { half: 35, clear: 45 }, vehicles: ['van'], budget: 3280, sol: { over: { h: 30, mat: 'steel', vert: 'wood' }, brace: 'wood' } },
  { name: 'Harbour', gap: 6, lane: { half: 65, clear: 15 }, vehicles: ['van'], budget: 2850, sol: { over: { h: 30, mat: 'steel', vert: 'wood' }, brace: 'wood' }, hint: 'an arch over the deck' },
  { name: 'Ferry Run', gap: 6, lane: { half: 50, clear: 15 }, vehicles: ['truck'], budget: 3650, sol: { over: { h: 30, mat: 'steel' }, brace: 'steel' }, hint: 'boss · a truck over the shipping lane' },
  { name: 'Breezy', gap: 5, vehicles: ['car'], wind: 80, budget: 1430, sol: { under: { depth: 30, mat: 'wood' }, ties: true }, hint: 'wind pushes the cars' },
  { name: 'Headwind', gap: 6, vehicles: ['van'], wind: -110, budget: 2660, sol: { under: { depth: 30, mat: 'wood', cross: true }, ties: true, brace: 'steel' }, hint: 'a headwind slows the van' },
  { name: 'Gusty Pier', gap: 7, pillar: true, vehicles: ['van', 'car'], wind: 120, budget: 2360, sol: { under: { depth: 30, mat: 'wood' }, ties: true, pillar: 'wood' } },
  { name: 'Gale', gap: 6, vehicles: ['truck'], wind: -140, budget: 3350, sol: { under: { depth: 60, mat: 'wood', cross: true }, ties: true, brace: 'steel' } },
  { name: 'Storm Front', gap: 8, pillar: true, vehicles: ['truck', 'car'], wind: 150, budget: 3920, sol: { under: { depth: 30, mat: 'wood', cross: true }, ties: true, pillar: 'steel', brace: 'wood' }, hint: 'boss · convoy in a storm' },
  { name: 'Bus Stop', gap: 5, vehicles: ['bus'], budget: 2290, sol: { under: { depth: 30, mat: 'wood', cross: true }, ties: true, brace: 'steel' }, hint: 'the bus is heavy' },
  { name: 'Delivery', gap: 6, vehicles: ['truck', 'car'], budget: 3350, sol: { under: { depth: 60, mat: 'wood', cross: true }, ties: true, brace: 'steel' } },
  { name: 'Rush Hour', gap: 6, vehicles: ['car', 'car', 'car'], budget: 2280, sol: { under: { depth: 30, mat: 'wood', cross: true }, ties: true, brace: 'wood' }, hint: 'three cars at once' },
  { name: 'Valley Vans', gap: 6, yL: 270, yR: 300, vehicles: ['van', 'van'], budget: 3650, sol: { over: { h: 30, mat: 'steel', vert: 'wood' }, brace: 'steel' } },
  { name: 'Grand Pier', gap: 9, pillar: true, vehicles: ['bus', 'car'], budget: 5850, sol: { under: { depth: 30, mat: 'wood', vert: 'steel', diag: 'steel' }, ties: true, pillar: 'steel', brace: 'steel' }, hint: 'boss · the widest gap yet' },
  { name: 'Picnic', gap: 4, vehicles: ['car'], budget: 1140, sol: { under: { depth: 30, mat: 'wood' }, ties: true }, hint: 'a breather' },
  { name: 'Ledges', gap: 5, dropL: true, dropR: true, vehicles: ['van'], budget: 2110, sol: { over: { h: 30, mat: 'steel', vert: 'wood' } }, hint: 'no lower anchors at all' },
  { name: 'Windy Canal', gap: 6, lane: { half: 35, clear: 45 }, vehicles: ['van'], wind: 120, budget: 2600, sol: { under: { depth: 30, mat: 'steel', vert: 'wood', diag: 'wood', cross: true }, ties: true } },
  { name: 'Long Haul', gap: 8, vehicles: ['van'], budget: 5940, sol: { under: { depth: 30, mat: 'steel' }, ties: true, over: { h: 30, mat: 'wood' } }, hint: 'no pillar — go deep' },
  { name: 'Iron Gorge', gap: 9, pillar: true, vehicles: ['bus', 'truck'], wind: -120, budget: 5850, sol: { under: { depth: 30, mat: 'wood', vert: 'steel', diag: 'steel' }, ties: true, pillar: 'steel', brace: 'steel' }, hint: 'boss · bus and truck in a gale' },
  { name: 'High Road', gap: 6, yL: 270, dropL: true, vehicles: ['van', 'car'], budget: 3340, sol: { over: { h: 30, mat: 'steel', vert: 'wood' }, brace: 'steel' } },
  { name: 'Grand Opening', gap: 9, pillar: true, vehicles: ['bus', 'truck', 'car'], budget: 5420, sol: { under: { depth: 60, mat: 'wood', cross: true }, ties: true, pillar: 'steel', brace: 'steel' }, hint: 'the grand opening' },
]

export const AUTHORED_COUNT = SITES.length

function siteLevel(n: number, s: Site, budgetMul: number): Level {
  const left = s.left ?? Math.floor((12 - s.gap) / 2)
  const x0 = left * GRID
  const x1 = (left + s.gap) * GRID
  const yL = s.yL ?? 300
  const yR = s.yR ?? 300
  const anchors = [
    { x: x0, y: yL },
    { x: x1, y: yR },
  ]
  if (!s.dropL) anchors.push({ x: x0, y: yL + 60 })
  if (!s.dropR) anchors.push({ x: x1, y: yR + 60 })
  const mid = (left + Math.floor(s.gap / 2)) * GRID
  const pillar = s.pillar ? { x: mid, top: 390 } : null
  if (pillar) anchors.push({ x: pillar.x, y: pillar.top })
  const lane = s.lane ? { x0: (x0 + x1) / 2 - s.lane.half, x1: (x0 + x1) / 2 + s.lane.half, y0: Math.max(yL, yR) + s.lane.clear } : null
  return { n, x0, x1, yL, yR, anchors, pillar, lane, vehicles: s.vehicles, wind: s.wind ?? 0, budget: Math.round((s.budget * budgetMul) / 10) * 10, name: s.name, hint: s.hint }
}

/**
 * Past the authored set the sites from 11 on come back as "encore" crossings with a
 * shrinking budget (never below the verified design's cost), so every level stays solvable.
 */
function encore(n: number) {
  const k = n - SITES.length - 1
  const span = SITES.length - 10
  return { site: 10 + (k % span), lap: Math.floor(k / span) + 1 }
}

export function levelFor(n: number, budgetMul: number): Level {
  if (n <= SITES.length) return siteLevel(n, SITES[n - 1], budgetMul)
  const { site, lap } = encore(n)
  const s = SITES[site]
  const l = siteLevel(n, s, budgetMul * Math.max(0.82, 1 - 0.06 * lap))
  return { ...l, name: `${s.name} ${'I'.repeat(Math.min(3, lap + 1))}`, hint: 'encore · tighter budget' }
}

export function recipeFor(n: number): Recipe | null {
  if (n <= SITES.length) return SITES[n - 1]?.sol ?? null
  return SITES[encore(n).site].sol
}

/** Deck height at column i (null where a 2-cell ramp skips the column). */
function deckAt(l: Level, i: number, cols: number): number | null {
  if (l.yL === l.yR) return l.yL
  const s = Math.floor(cols / 2) - 1
  if (i <= s) return l.yL
  if (i === s + 1) return null
  return l.yR
}

/** Build a recipe into joints and beams (anchors first, in level order). */
export function buildDesign(l: Level, r: Recipe): { nodes: BuildNode[]; beams: BuildBeam[] } {
  const nodes: BuildNode[] = l.anchors.map((a) => ({ x: a.x, y: a.y, anchor: true }))
  const beams: BuildBeam[] = []
  const node = (x: number, y: number) => {
    let i = nodes.findIndex((p) => p.x === x && p.y === y)
    if (i < 0) {
      nodes.push({ x, y, anchor: false })
      i = nodes.length - 1
    }
    return i
  }
  const beam = (ax: number, ay: number, bx: number, by: number, mat: Mat) => {
    const a = node(ax, ay)
    const b = node(bx, by)
    if (a === b || beams.some((m) => (m.a === a && m.b === b) || (m.a === b && m.b === a))) return
    beams.push({ a, b, mat })
  }
  const cols = (l.x1 - l.x0) / GRID
  const X = (i: number) => l.x0 + i * GRID
  const deck: (number | null)[] = Array.from({ length: cols + 1 }, (_, i) => deckAt(l, i, cols))
  let prev = 0
  for (let i = 1; i <= cols; i++) {
    const y = deck[i]
    if (y == null) continue
    beam(X(prev), deck[prev]!, X(i), y, 'road')
    prev = i
  }
  const dy = (i: number) => deck[i] ?? Math.max(l.yL, l.yR)
  if (r.under) {
    const yB = Math.max(l.yL, l.yR) + r.under.depth
    const m = r.under.mat
    const mv = r.under.vert ?? m
    const md = r.under.diag ?? m
    for (let i = 1; i < cols; i++) {
      if (deck[i] != null) beam(X(i), deck[i]!, X(i), yB, mv)
      if (i < cols - 1) beam(X(i), yB, X(i + 1), yB, m)
    }
    const half = cols / 2
    for (let i = 0; i < cols; i++) {
      // Pratt diagonals lean toward the middle; cross-bracing adds the other one too.
      const a = i < half || r.under.cross
      const b = i >= half || r.under.cross
      if (a && i + 1 < cols && deck[i] != null) beam(X(i), deck[i]!, X(i + 1), yB, md)
      if (b && i >= 1 && deck[i + 1] != null) beam(X(i + 1), deck[i + 1]!, X(i), yB, md)
    }
    // Ramp column: brace the skipped chord node to both neighbouring deck joints.
    for (let i = 1; i < cols; i++) {
      if (deck[i] != null) continue
      beam(X(i - 1), dy(i - 1), X(i), yB, md)
      beam(X(i + 1), dy(i + 1), X(i), yB, md)
    }
    if (r.ties) {
      if (l.anchors.some((a) => a.x === l.x0 && a.y === l.yL + 60)) beam(l.x0, l.yL + 60, X(1), yB, m)
      if (l.anchors.some((a) => a.x === l.x1 && a.y === l.yR + 60)) beam(l.x1, l.yR + 60, X(cols - 1), yB, m)
    }
    if (l.pillar && r.pillar) {
      const px = l.pillar.x
      beam(px, l.pillar.top, px, yB, r.pillar)
      beam(px, l.pillar.top, px - GRID, yB, r.pillar)
      beam(px, l.pillar.top, px + GRID, yB, r.pillar)
    }
  }
  if (r.brace) {
    const lowL = l.anchors.some((a) => a.x === l.x0 && a.y === l.yL + 60)
    const lowR = l.anchors.some((a) => a.x === l.x1 && a.y === l.yR + 60)
    if (lowL && deck[1] != null) beam(l.x0, l.yL + 60, X(1), deck[1]!, r.brace)
    if (lowR && deck[cols - 1] != null) beam(l.x1, l.yR + 60, X(cols - 1), deck[cols - 1]!, r.brace)
  }
  if (r.over) {
    const yT = Math.min(l.yL, l.yR) - r.over.h
    const m = r.over.mat
    const mv = r.over.vert ?? m
    const md = r.over.diag ?? m
    for (let i = 1; i < cols; i++) {
      if (deck[i] != null) beam(X(i), deck[i]!, X(i), yT, mv)
      if (i < cols - 1) beam(X(i), yT, X(i + 1), yT, m)
    }
    beam(X(0), dy(0), X(1), yT, md)
    beam(X(cols), dy(cols), X(cols - 1), yT, md)
    const half = cols / 2
    for (let i = 1; i < cols - 1; i++) {
      const a = i < half || r.over.cross
      const b = i >= half || r.over.cross
      if (a && deck[i + 1] != null) beam(X(i), yT, X(i + 1), deck[i + 1]!, md)
      if (b && deck[i] != null) beam(X(i + 1), yT, X(i), deck[i]!, md)
    }
    for (let i = 1; i < cols; i++) {
      if (deck[i] != null) continue
      beam(X(i - 1), dy(i - 1), X(i), yT, md)
      beam(X(i + 1), dy(i + 1), X(i), yT, md)
    }
  }
  return { nodes, beams }
}

export function designCost(d: { nodes: BuildNode[]; beams: BuildBeam[] }) {
  let s = 0
  for (const b of d.beams) {
    const A = d.nodes[b.a]
    const B = d.nodes[b.b]
    s += Math.round(Math.hypot(B.x - A.x, B.y - A.y) * MATS[b.mat].cost)
  }
  return s
}
