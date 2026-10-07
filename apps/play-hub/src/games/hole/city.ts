/** City generation for Black Hole: blocks, roads and everything that can be swallowed. */

export type Kind =
  | 'cone'
  | 'hydrant'
  | 'bin'
  | 'person'
  | 'lamp'
  | 'bush'
  | 'bench'
  | 'tree'
  | 'car'
  | 'kiosk'
  | 'fountain'
  | 'bus'
  | 'statue'
  | 'house'
  | 'shop'
  | 'tower'
  | 'sky'
  | 'monument'

export type Obj = {
  id: number
  kind: Kind
  x: number
  y: number
  /** Footprint (axis aligned before rotation). */
  w: number
  h: number
  rot: number
  /** Swallow size — must be below the hole radius. */
  size: number
  /** Building height for the faux-3D extrusion (0 = flat). */
  height: number
  color: string
  color2: string
  vx: number
  vy: number
  seed: number
  /** -1 = standing, 0..1 = falling progress. */
  fall: number
  fx: number
  fy: number
  owner: number
  jig: number
  alive: boolean
  /** Lane movers (cars, buses) wrap around the map. */
  lane: number
}

export type Theme = { name: string; grass: string; grass2: string; road: string; walk: string; plaza: string; tint: string | null; night: boolean; snow: boolean }

export const THEMES: Theme[] = [
  { name: 'Sunny Suburbs', grass: '#86c66b', grass2: '#76b75c', road: '#4b5563', walk: '#cbd5e1', plaza: '#e7d9c2', tint: null, night: false, snow: false },
  { name: 'Golden Hour', grass: '#9ac46a', grass2: '#88b45a', road: '#57534e', walk: '#e7d3bd', plaza: '#ecd3b0', tint: 'rgba(251,146,60,0.16)', night: false, snow: false },
  { name: 'Neon Night', grass: '#3f6b48', grass2: '#365f3f', road: '#334155', walk: '#94a3b8', plaza: '#a8a29e', tint: 'rgba(15,23,72,0.5)', night: true, snow: false },
  { name: 'Snow Day', grass: '#eef2f7', grass2: '#e2e8f0', road: '#64748b', walk: '#cbd5e1', plaza: '#dbe4ee', tint: 'rgba(191,219,254,0.12)', night: false, snow: true },
]

export const BLOCK = 330
export const ROAD = 72

const CAR_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#f8fafc', '#8b5cf6', '#ec4899', '#0ea5e9', '#1f2937']
const SHIRTS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#a855f7', '#ec4899', '#f97316', '#14b8a6']
const ROOFS = ['#b91c1c', '#9a3412', '#7c2d12', '#475569', '#1e40af', '#065f46']
const WALLS = ['#fde68a', '#fecaca', '#e0f2fe', '#f5f5f4', '#ddd6fe', '#d9f99d']

export type City = { objs: Obj[]; n: number; size: number; theme: Theme; potential: number; blocks: { x: number; y: number; type: BlockType }[] }
type BlockType = 'park' | 'houses' | 'plaza' | 'downtown' | 'core' | 'landmark'

let nextId = 1

function rnd(a: number, b: number) {
  return a + Math.random() * (b - a)
}
function pick<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)]
}

function make(kind: Kind, x: number, y: number, w: number, h: number, size: number, height = 0, color = '#fff', color2 = '#000', rot = 0): Obj {
  return { id: nextId++, kind, x, y, w, h, rot, size, height, color, color2, vx: 0, vy: 0, seed: Math.random(), fall: -1, fx: 0, fy: 0, owner: 0, jig: 0, alive: true, lane: -1 }
}

export function growth(size: number) {
  return size * size * 0.2
}

export function cityExtent(n: number) {
  return n * BLOCK + (n + 1) * ROAD
}

const BLOCK_CODE: Record<string, BlockType> = { P: 'park', H: 'houses', Z: 'plaza', D: 'downtown', C: 'core', L: 'landmark' }

/** Build a city for `level`; `layout` (hand-designed grid rows + theme) overrides the random blocks. */
export function genCity(level: number, layout?: { grid: string[]; theme: number }): City {
  const n = layout ? layout.grid.length : Math.min(7, 2 + Math.ceil(level * 0.6))
  const size = cityExtent(n)
  const theme = THEMES[layout ? layout.theme % THEMES.length : (level - 1) % THEMES.length]
  const objs: Obj[] = []
  const blocks: City['blocks'] = []
  const pool: BlockType[] = level <= 1 ? ['park', 'houses', 'houses'] : level === 2 ? ['park', 'houses', 'plaza', 'downtown'] : level === 3 ? ['park', 'houses', 'plaza', 'downtown', 'downtown'] : ['park', 'houses', 'plaza', 'downtown', 'core', 'core']
  const mid = Math.floor(n / 2)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const bx = ROAD + i * (BLOCK + ROAD)
      const by = ROAD + j * (BLOCK + ROAD)
      let type = pick(pool)
      if (layout) type = BLOCK_CODE[layout.grid[j][i]] ?? 'park'
      else {
        if (level >= 5 && level % 5 === 0 && i === mid && j === mid) type = 'landmark'
        // Keep the player's start block gentle.
        if (i === mid && j === mid && type !== 'landmark') type = level <= 1 ? 'park' : type === 'core' ? 'downtown' : type
      }
      blocks.push({ x: bx, y: by, type })
      fillBlock(objs, bx, by, type, level)
    }
  }
  // Road furniture and traffic.
  for (let k = 0; k <= n; k++) {
    const c = k * (BLOCK + ROAD) + ROAD / 2
    for (const horiz of [true, false]) {
      for (const dir of [-1, 1]) {
        const cars = 1 + (Math.random() < 0.6 ? 1 : 0)
        for (let q = 0; q < cars; q++) {
          const along = rnd(0, size)
          const lanePos = c + dir * ROAD * 0.22
          const bus = level >= 2 && Math.random() < 0.18
          const len = bus ? 58 : 34
          const wid = bus ? 22 : 18
          const o = make(bus ? 'bus' : 'car', horiz ? along : lanePos, horiz ? lanePos : along, len, wid, bus ? 30 : 17, bus ? 14 : 8, bus ? '#facc15' : pick(CAR_COLORS), '#0f172a', horiz ? (dir > 0 ? 0 : Math.PI) : dir > 0 ? Math.PI / 2 : -Math.PI / 2)
          const sp = rnd(45, 75) * dir
          o.vx = horiz ? sp : 0
          o.vy = horiz ? 0 : sp
          o.lane = k
          objs.push(o)
        }
      }
      for (let q = 0; q < 2; q++) {
        const along = rnd(ROAD, size - ROAD)
        const off = rnd(-ROAD * 0.3, ROAD * 0.3)
        objs.push(make('cone', horiz ? along : c + off, horiz ? c + off : along, 9, 9, 4.5, 0, '#f97316', '#fff'))
      }
    }
  }
  const potential = objs.reduce((s, o) => s + growth(o.size), 0)
  return { objs, n, size, theme, potential, blocks }
}

function fillBlock(objs: Obj[], bx: number, by: number, type: BlockType, level: number) {
  const placed: { x: number; y: number; r: number }[] = []
  const free = (x: number, y: number, r: number) => placed.every((p) => Math.hypot(p.x - x, p.y - y) > p.r + r + 4)
  const add = (o: Obj, r = o.size) => {
    placed.push({ x: o.x, y: o.y, r })
    objs.push(o)
  }
  const tryPlace = (r: number, margin: number, f: (x: number, y: number) => Obj) => {
    for (let k = 0; k < 30; k++) {
      const x = rnd(bx + margin + r, bx + BLOCK - margin - r)
      const y = rnd(by + margin + r, by + BLOCK - margin - r)
      if (free(x, y, r)) {
        add(f(x, y), r)
        return true
      }
    }
    return false
  }
  // Sidewalk ring furniture.
  for (let k = 0; k < 6; k++) {
    const side = k % 4
    const t = rnd(0.1, 0.9)
    const x = side === 0 ? bx + BLOCK * t : side === 1 ? bx + BLOCK - 8 : side === 2 ? bx + BLOCK * t : bx + 8
    const y = side === 0 ? by + 8 : side === 1 ? by + BLOCK * t : side === 2 ? by + BLOCK - 8 : by + BLOCK * t
    const kind = pick<Kind>(['lamp', 'hydrant', 'bin', 'lamp'])
    if (kind === 'lamp') add(make('lamp', x, y, 10, 10, 5.5, 0, '#334155', '#fde68a'))
    else if (kind === 'hydrant') add(make('hydrant', x, y, 10, 10, 5, 0, '#dc2626', '#fca5a5'))
    else add(make('bin', x, y, 12, 12, 6, 0, '#166534', '#4ade80'))
  }
  const people = (count: number) => {
    for (let k = 0; k < count; k++) tryPlace(6, 14, (x, y) => make('person', x, y, 12, 12, 5.5, 0, pick(SHIRTS), pick(['#fcd34d', '#a16207', '#f5d0a9', '#78350f'])))
  }
  if (type === 'park') {
    tryPlace(30, 90, (x, y) => make('fountain', x, y, 60, 60, 28, 0, '#94a3b8', '#38bdf8'))
    for (let k = 0; k < 9; k++) tryPlace(16, 22, (x, y) => {
      const s = rnd(12, 17)
      return make('tree', x, y, s * 2, s * 2, s, 0, pick(['#22c55e', '#16a34a', '#15803d', '#4d7c0f']), '#14532d', rnd(0, 6))
    })
    for (let k = 0; k < 6; k++) tryPlace(9, 20, (x, y) => make('bush', x, y, 18, 18, 8, 0, '#4ade80', '#166534'))
    for (let k = 0; k < 4; k++) tryPlace(11, 24, (x, y) => make('bench', x, y, 22, 9, 10, 0, '#92400e', '#78350f', pick([0, Math.PI / 2])))
    people(5)
  } else if (type === 'houses') {
    const slots = [
      [0.27, 0.27],
      [0.73, 0.27],
      [0.27, 0.73],
      [0.73, 0.73],
    ]
    for (const [sx, sy] of slots) {
      const s = rnd(52, 64)
      const o = make('house', bx + BLOCK * sx + rnd(-10, 10), by + BLOCK * sy + rnd(-10, 10), s, s * rnd(0.8, 1), s * 0.68, rnd(22, 30), pick(ROOFS), pick(WALLS))
      add(o, s * 0.72)
    }
    for (let k = 0; k < 5; k++) tryPlace(14, 20, (x, y) => {
      const s = rnd(11, 15)
      return make('tree', x, y, s * 2, s * 2, s, 0, pick(['#22c55e', '#16a34a', '#65a30d']), '#14532d', rnd(0, 6))
    })
    for (let k = 0; k < 2; k++) tryPlace(18, 20, (x, y) => make('car', x, y, 34, 18, 17, 8, pick(CAR_COLORS), '#0f172a', pick([0, Math.PI / 2])))
    for (let k = 0; k < 4; k++) tryPlace(9, 18, (x, y) => make('bush', x, y, 18, 18, 8, 0, '#4ade80', '#166534'))
    people(3)
  } else if (type === 'plaza') {
    tryPlace(36, 110, (x, y) => make('statue', x, y, 50, 50, 34, 26, '#a8a29e', '#b45309'))
    for (let k = 0; k < 3; k++) tryPlace(20, 30, (x, y) => make('kiosk', x, y, 32, 32, 20, 18, pick(['#ef4444', '#3b82f6', '#22c55e', '#f59e0b']), '#fff7ed'))
    for (let k = 0; k < 6; k++) tryPlace(11, 20, (x, y) => make('bench', x, y, 22, 9, 10, 0, '#92400e', '#78350f', pick([0, Math.PI / 2])))
    for (let k = 0; k < 6; k++) tryPlace(6, 16, (x, y) => make('cone', x, y, 9, 9, 4.5, 0, '#f97316', '#fff'))
    for (let k = 0; k < 4; k++) tryPlace(14, 20, (x, y) => make('tree', x, y, 26, 26, 13, 0, '#22c55e', '#14532d', rnd(0, 6)))
    people(10)
  } else if (type === 'downtown' || type === 'core') {
    const big = type === 'core' && level >= 4
    if (big) {
      const s = rnd(140, 165)
      add(make('sky', bx + BLOCK / 2 + rnd(-30, 30), by + BLOCK / 2 + rnd(-30, 30), s, s, s * 0.7, rnd(150, 190), pick(['#38bdf8', '#818cf8', '#2dd4bf']), '#0f172a'), s * 0.75)
    } else if (level >= 3) {
      const s = rnd(110, 125)
      add(make('tower', bx + BLOCK * 0.36 + rnd(-10, 10), by + BLOCK * 0.36 + rnd(-10, 10), s, s, s * 0.65, rnd(80, 110), pick(['#94a3b8', '#a5b4fc', '#fda4af', '#fcd34d']), '#1e293b'), s * 0.72)
    }
    const shops = big ? 2 : 3
    for (let k = 0; k < shops; k++) tryPlace(48, 18, (x, y) => {
      const w = rnd(76, 92)
      return make('shop', x, y, w, w * rnd(0.7, 0.85), w * 0.6, rnd(32, 44), pick(['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#c084fc']), pick(WALLS))
    })
    for (let k = 0; k < 2; k++) tryPlace(20, 22, (x, y) => make('kiosk', x, y, 32, 32, 20, 18, pick(['#ef4444', '#3b82f6', '#22c55e']), '#fff7ed'))
    for (let k = 0; k < 3; k++) tryPlace(18, 18, (x, y) => make('car', x, y, 34, 18, 17, 8, pick(CAR_COLORS), '#0f172a', pick([0, Math.PI / 2])))
    for (let k = 0; k < 3; k++) tryPlace(7, 16, (x, y) => make('cone', x, y, 9, 9, 4.5, 0, '#f97316', '#fff'))
    people(6)
  } else {
    // Landmark: one colossal monument ringed by gardens.
    add(make('monument', bx + BLOCK / 2, by + BLOCK / 2, 190, 190, 140, 240, '#fbbf24', '#78350f'), 130)
    for (let k = 0; k < 10; k++) tryPlace(14, 12, (x, y) => make('tree', x, y, 28, 28, 14, 0, '#16a34a', '#14532d', rnd(0, 6)))
    people(8)
  }
}
