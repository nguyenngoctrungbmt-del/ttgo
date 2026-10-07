/** Tiny City rules: grid, terrain, buildings and neighbour scoring. Pure logic. */

export type BType = 'house' | 'park' | 'shop' | 'factory' | 'fountain' | 'school' | 'windmill' | 'tower' | 'statue'
export type Terrain = 'tree' | 'water' | 'rock'
export type Cell = { b: BType | null; t: Terrain | null; at: number }

export const MAX = 9

export type BDef = { label: string; rule: string; weight: number; unlock: number }
export const BUILDINGS: Record<BType, BDef> = {
  house: { label: 'House', rule: 'Loves parks & water, hates factories', weight: 30, unlock: 1 },
  park: { label: 'Park', rule: 'Loves houses & trees', weight: 18, unlock: 1 },
  shop: { label: 'Shop', rule: 'Needs houses nearby, no rival shops', weight: 13, unlock: 2 },
  factory: { label: 'Factory', rule: 'Loves factories & rocks', weight: 11, unlock: 2 },
  fountain: { label: 'Fountain', rule: '+2 for every neighbour around it', weight: 7, unlock: 3 },
  school: { label: 'School', rule: '+2 per house within 2 tiles', weight: 6, unlock: 4 },
  windmill: { label: 'Windmill', rule: 'Loves water & open space', weight: 7, unlock: 5 },
  tower: { label: 'Tower', rule: 'Loves houses & parks, no towers', weight: 6, unlock: 6 },
  statue: { label: 'Statue', rule: 'Big score if alone; parks help', weight: 3, unlock: 7 },
}
export const ORDER: BType[] = ['house', 'park', 'shop', 'factory', 'fountain', 'school', 'windmill', 'tower', 'statue']

export type Region = { x0: number; y0: number; w: number; h: number }

/** Land grows one edge at a time, keeping the town centred. */
export const EXPANSIONS: Region[] = [
  { x0: 2, y0: 2, w: 5, h: 5 },
  { x0: 2, y0: 2, w: 6, h: 5 },
  { x0: 2, y0: 2, w: 6, h: 6 },
  { x0: 1, y0: 2, w: 7, h: 6 },
  { x0: 1, y0: 1, w: 7, h: 7 },
  { x0: 1, y0: 1, w: 8, h: 7 },
  { x0: 1, y0: 1, w: 8, h: 8 },
  { x0: 0, y0: 1, w: 9, h: 8 },
  { x0: 0, y0: 0, w: 9, h: 9 },
]

/** `mask` (authored islands) overrides the growing rectangle used by the attract demo. */
export type City = { cells: Cell[][]; land: number; mask?: boolean[][] }

export function inLand(c: City, x: number, y: number) {
  if (c.mask) return !!c.mask[y]?.[x]
  const r = EXPANSIONS[Math.min(c.land, EXPANSIONS.length - 1)]
  return x >= r.x0 && y >= r.y0 && x < r.x0 + r.w && y < r.y0 + r.h
}

export function newCity(rnd: () => number): City {
  const cells: Cell[][] = []
  for (let y = 0; y < MAX; y++) {
    const row: Cell[] = []
    for (let x = 0; x < MAX; x++) row.push({ b: null, t: null, at: 0 })
    cells.push(row)
  }
  // Scatter terrain: a pond, some trees and rocks (fewer near the centre start)
  const c: City = { cells, land: 0 }
  const pond = { x: Math.floor(rnd() * 3) + (rnd() < 0.5 ? 0 : 6), y: Math.floor(rnd() * 9) }
  for (let y = 0; y < MAX; y++) {
    for (let x = 0; x < MAX; x++) {
      const d = Math.hypot(x - pond.x, y - pond.y)
      const centre = x >= 2 && x <= 6 && y >= 2 && y <= 6
      const r = rnd()
      if (d < 1.3) cells[y][x].t = 'water'
      else if (r < (centre ? 0.07 : 0.13)) cells[y][x].t = 'tree'
      else if (r < (centre ? 0.09 : 0.18)) cells[y][x].t = 'rock'
    }
  }
  // A small pond inside the starting land
  const sx = 2 + Math.floor(rnd() * 5)
  const sy = rnd() < 0.5 ? 2 : 6
  cells[sy][sx].t = 'water'
  return c
}

function at(c: City, x: number, y: number): Cell | null {
  if (x < 0 || y < 0 || x >= MAX || y >= MAX) return null
  if (!inLand(c, x, y)) return null
  return c.cells[y][x]
}

const N4 = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]
const N8 = [...N4, [1, 1], [1, -1], [-1, 1], [-1, -1]]

function count(c: City, x: number, y: number, dirs: number[][], pred: (cell: Cell) => boolean) {
  let n = 0
  for (const [dx, dy] of dirs) {
    const cell = at(c, x + dx, y + dy)
    if (cell && pred(cell)) n++
  }
  return n
}

function within(c: City, x: number, y: number, r: number, pred: (cell: Cell) => boolean) {
  let n = 0
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (!dx && !dy) continue
      const cell = at(c, x + dx, y + dy)
      if (cell && pred(cell)) n++
    }
  }
  return n
}

const is = (b: BType) => (cell: Cell) => cell.b === b
const ter = (t: Terrain) => (cell: Cell) => cell.t === t

/** Score of the building standing at x,y (with type b). */
export function scoreAt(c: City, x: number, y: number, b: BType): number {
  switch (b) {
    case 'house':
      return 1 + 2 * count(c, x, y, N4, is('park')) + count(c, x, y, N4, is('house')) - 3 * count(c, x, y, N4, is('factory')) + 2 * count(c, x, y, N4, ter('water')) + count(c, x, y, N4, ter('tree'))
    case 'park':
      return 1 + count(c, x, y, N4, is('house')) + 2 * count(c, x, y, N4, ter('tree')) + count(c, x, y, N4, ter('water')) - 2 * count(c, x, y, N4, is('factory'))
    case 'shop':
      return 2 * count(c, x, y, N8, (k) => k.b === 'house' || k.b === 'tower') - 3 * count(c, x, y, N4, is('shop')) + count(c, x, y, N4, is('factory'))
    case 'factory':
      return 3 + 2 * count(c, x, y, N4, is('factory')) + 2 * count(c, x, y, N4, ter('rock'))
    case 'fountain':
      return 1 + 2 * count(c, x, y, N8, (k) => k.b === 'house' || k.b === 'park' || k.b === 'shop' || k.b === 'school' || k.b === 'tower' || k.b === 'statue')
    case 'school':
      return 2 * within(c, x, y, 2, is('house')) - 3 * count(c, x, y, N8, is('factory')) - 5 * within(c, x, y, 2, is('school'))
    case 'windmill':
      return 2 + 3 * count(c, x, y, N4, ter('water')) + count(c, x, y, N4, (k) => !k.b && !k.t) - 2 * count(c, x, y, N4, is('house'))
    case 'tower':
      return 2 + 3 * count(c, x, y, N4, is('house')) + 2 * count(c, x, y, N4, is('park')) - 2 * count(c, x, y, N4, is('factory')) - 3 * count(c, x, y, N4, is('tower'))
    case 'statue':
      return (within(c, x, y, 2, is('statue')) ? 0 : 6) + 2 * count(c, x, y, N4, is('park')) + count(c, x, y, N8, is('fountain'))
  }
}

export function total(c: City): number {
  let s = 0
  for (let y = 0; y < MAX; y++) for (let x = 0; x < MAX; x++) {
    const b = c.cells[y][x].b
    if (b && inLand(c, x, y)) s += scoreAt(c, x, y, b)
  }
  return s
}

export function canPlace(c: City, x: number, y: number) {
  const cell = at(c, x, y)
  return !!cell && !cell.b && !cell.t
}

export type Preview = { delta: number; self: number; changes: { x: number; y: number; d: number }[] }

/** Score change if b is placed at x,y, with each affected neighbour's change. */
export function preview(c: City, x: number, y: number, b: BType): Preview {
  const before: number[] = []
  const pts: [number, number][] = []
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (!dx && !dy) continue
      const cell = at(c, x + dx, y + dy)
      if (cell?.b) {
        pts.push([x + dx, y + dy])
        before.push(scoreAt(c, x + dx, y + dy, cell.b))
      }
    }
  }
  const cell = c.cells[y][x]
  cell.b = b
  const self = scoreAt(c, x, y, b)
  const changes: Preview['changes'] = []
  let delta = self
  pts.forEach(([px, py], i) => {
    const d = scoreAt(c, px, py, c.cells[py][px].b as BType) - before[i]
    if (d) changes.push({ x: px, y: py, d })
    delta += d
  })
  cell.b = null
  return { delta, self, changes }
}

export function freeTiles(c: City) {
  let n = 0
  for (let y = 0; y < MAX; y++) for (let x = 0; x < MAX; x++) if (canPlace(c, x, y)) n++
  return n
}

/** Score needed to reach the next level (cumulative). */
export function targetFor(level: number) {
  return Math.round(14 + (level - 1) * 16 + (level - 1) * (level - 1) * 5)
}

export function dealOne(level: number, rnd: () => number, extra: Partial<Record<BType, number>> = {}): BType {
  const pool = ORDER.filter((b) => BUILDINGS[b].unlock <= level)
  const ws = pool.map((b) => BUILDINGS[b].weight * (1 + (extra[b] ?? 0)))
  let r = rnd() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < pool.length; i++) {
    r -= ws[i]
    if (r <= 0) return pool[i]
  }
  return pool[0]
}

/** Bounding box of the land (for the camera and island drawing). */
export function landBox(c: City): Region {
  if (!c.mask) return EXPANSIONS[Math.min(c.land, EXPANSIONS.length - 1)]
  let x0 = MAX
  let y0 = MAX
  let x1 = -1
  let y1 = -1
  for (let y = 0; y < MAX; y++) for (let x = 0; x < MAX; x++) {
    if (!c.mask[y][x]) continue
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  }
  if (x1 < 0) return EXPANSIONS[0]
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

/**
 * Build an authored island. Rows of 9 chars: '-' sea, '.' grass, 'w' pond, 't' tree, 'r' rock.
 * `extra` adds that many grass tiles on the shore (Bigger Island upgrade) — only ever more room.
 */
export function cityFromMap(rows: string[], extra = 0): City {
  const cells: Cell[][] = []
  const mask: boolean[][] = []
  for (let y = 0; y < MAX; y++) {
    const row: Cell[] = []
    const m: boolean[] = []
    for (let x = 0; x < MAX; x++) {
      const ch = rows[y]?.[x] ?? '-'
      const land = ch !== '-' && ch !== ' '
      m.push(land)
      row.push({ b: null, t: ch === 'w' ? 'water' : ch === 't' ? 'tree' : ch === 'r' ? 'rock' : null, at: 0 })
    }
    cells.push(row)
    mask.push(m)
  }
  const c: City = { cells, land: 0, mask }
  growShore(c, extra)
  return c
}

/** Turn `n` sea tiles that touch the most land into grass. */
export function growShore(c: City, n: number) {
  const mask = c.mask
  if (!mask) return []
  const added: [number, number][] = []
  for (let k = 0; k < n; k++) {
    let best: [number, number] | null = null
    let bestN = 0
    for (let y = 0; y < MAX; y++) for (let x = 0; x < MAX; x++) {
      if (mask[y][x]) continue
      let n = 0
      for (const [dx, dy] of N4) if (mask[y + dy]?.[x + dx]) n++
      if (n > bestN) {
        bestN = n
        best = [x, y]
      }
    }
    if (!best) break
    mask[best[1]][best[0]] = true
    c.cells[best[1]][best[0]] = { b: null, t: null, at: 0 }
    added.push(best)
  }
  return added
}

/** Next building from a level's pool (weights from BUILDINGS unless overridden). */
export function dealFrom(pool: BType[], rnd: () => number, weights?: Partial<Record<BType, number>>): BType {
  const ws = pool.map((b) => weights?.[b] ?? BUILDINGS[b].weight)
  let r = rnd() * ws.reduce((a, b) => a + b, 0)
  for (let i = 0; i < pool.length; i++) {
    r -= ws[i]
    if (r <= 0) return pool[i]
  }
  return pool[0]
}
