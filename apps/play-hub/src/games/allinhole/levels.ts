/**
 * All in Hole levels. World: x in [0,1], y in [0,L]. The hole grows with the area it swallows:
 *   R = r0 + growth * sqrt(eatenArea)
 * The generator picks `growth` so that, eating objects smallest-first, every object fits
 * (r < R * FIT) by the time it is reached — the level is always clearable.
 */

export const L = 1.4
export const FIT = 0.9

export const KINDS = ['ball', 'cube', 'apple', 'orange', 'donut', 'dice', 'duck', 'gem', 'can', 'cookie', 'melon', 'block', 'bomb'] as const
export type Kind = (typeof KINDS)[number]

export type Obj = { id: number; kind: Kind; x: number; y: number; r: number; hue: number }
export type Wall = { x: number; y: number; w: number; h: number; move?: { ax: number; bx: number; speed: number } }
export type LevelDef = {
  n: number
  objs: Obj[]
  walls: Wall[]
  r0: number
  growth: number
  time: number
  hard: boolean
  biome: number
  tip?: string
  name?: string
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

export function isHard(n: number) {
  return n >= 5 && n % 5 === 0
}

type Spec = { count: number; kinds: Kind[]; sizes: [number, number][]; walls: 'none' | 'fence' | 'maze'; bombs: number; movers: number; tip?: string }

function specFor(n: number): Spec {
  const small: [number, number] = [0.021, 0.03]
  const mid: [number, number] = [0.035, 0.05]
  const big: [number, number] = [0.056, 0.074]
  const huge: [number, number] = [0.08, 0.095]
  if (n === 1) return { count: 24, kinds: ['ball', 'cube'], sizes: [small], walls: 'none', bombs: 0, movers: 0, tip: 'drag anywhere to steer the hole' }
  if (n === 2) return { count: 34, kinds: ['apple', 'orange', 'ball'], sizes: [small, small, mid], walls: 'none', bombs: 0, movers: 0, tip: 'eat small things first to grow' }
  if (n === 3) return { count: 40, kinds: ['dice', 'cube', 'donut'], sizes: [small, mid, mid], walls: 'fence', bombs: 0, movers: 0, tip: 'walls block the hole' }
  if (n === 4) return { count: 48, kinds: ['duck', 'ball', 'gem', 'can'], sizes: [small, small, mid, big], walls: 'fence', bombs: 0, movers: 0 }
  if (n === 6) return { count: 50, kinds: ['cookie', 'apple', 'orange', 'melon'], sizes: [small, mid, mid, big], walls: 'fence', bombs: 4, movers: 0, tip: 'avoid the bombs!' }
  if (n === 7) return { count: 54, kinds: ['block', 'dice', 'can', 'duck'], sizes: [small, mid, big], walls: 'none', bombs: 2, movers: 2, tip: 'moving platforms push things around' }
  const hard = isHard(n)
  const pool: Kind[] = ['ball', 'cube', 'apple', 'orange', 'donut', 'dice', 'duck', 'gem', 'can', 'cookie', 'melon', 'block']
  const kinds: Kind[] = []
  for (let i = 0; i < 4; i++) kinds.push(pool[(n * 5 + i * 3) % pool.length])
  return {
    count: Math.min(90, 44 + n * 3 + (hard ? 12 : 0)),
    kinds,
    sizes: n >= 10 ? [small, small, mid, big, huge] : [small, small, mid, big],
    walls: hard || n % 3 === 2 ? 'maze' : n % 3 === 0 ? 'fence' : 'none',
    bombs: n >= 6 ? Math.min(8, 2 + Math.floor(n / 4)) : 0,
    movers: n >= 7 && n % 2 === 1 ? Math.min(3, 1 + Math.floor(n / 9)) : 0,
  }
}

function wallsFor(kind: Spec['walls'], r: () => number): Wall[] {
  const t = 0.03
  if (kind === 'none') return []
  if (kind === 'fence') {
    const out: Wall[] = []
    const y1 = (0.35 + r() * 0.1) * (L / 1.25)
    const y2 = (0.8 + r() * 0.1) * (L / 1.25)
    if (r() < 0.5) out.push({ x: 0, y: y1, w: 0.62, h: t }, { x: 0.38, y: y2, w: 0.62, h: t })
    else out.push({ x: 0.38, y: y1, w: 0.62, h: t }, { x: 0, y: y2, w: 0.62, h: t })
    return out
  }
  // maze: three staggered fences + a centre post, gaps wide enough for any hole
  const ys = [0.3, 0.62, 0.94].map((y) => y * (L / 1.25))
  const out: Wall[] = []
  ys.forEach((y, i) => {
    const gapLeft = (i + Math.floor(r() * 2)) % 2 === 0
    out.push(gapLeft ? { x: 0.32, y, w: 0.68, h: t } : { x: 0, y, w: 0.68, h: t })
  })
  out.push({ x: 0.47, y: 0.08, w: t, h: 0.14 })
  return out
}

let uid = 1

function insideWall(x: number, y: number, rad: number, walls: Wall[]) {
  return walls.some((w) => x + rad > w.x - 0.01 && x - rad < w.x + w.w + 0.01 && y + rad > w.y - 0.01 && y - rad < w.y + w.h + 0.01)
}

export function makeLevel(n: number, seed: number, r0 = 0.054): LevelDef {
  const spec = specFor(n)
  const r = rng(seed * 48271 + n * 131)
  const walls = wallsFor(spec.walls, r)
  for (let i = 0; i < spec.movers; i++) {
    const y = 0.2 + ((i + 0.5) / spec.movers) * 0.85 + (r() - 0.5) * 0.05
    const w = 0.18
    walls.push({ x: 0.1, y, w, h: 0.035, move: { ax: 0.04, bx: 1 - w - 0.04, speed: 0.12 + r() * 0.08 } })
  }
  const objs: Obj[] = []
  const place = (kind: Kind, rad: number, cx: number, cy: number) => {
    for (let tries = 0; tries < 30; tries++) {
      const x = Math.min(1 - rad - 0.01, Math.max(rad + 0.01, cx + (tries ? (r() - 0.5) * 0.12 : 0)))
      const y = Math.min(L - rad - 0.01, Math.max(rad + 0.01, cy + (tries ? (r() - 0.5) * 0.12 : 0)))
      if (insideWall(x, y, rad, walls.filter((w) => !w.move))) continue
      if (objs.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + rad + 0.002)) continue
      // keep the hole's start spot clear
      if (Math.hypot(x - 0.5, y - (L - 0.12)) < 0.1) continue
      objs.push({ id: uid++, kind, x, y, r: rad, hue: Math.floor(r() * 4) })
      return true
    }
    return false
  }
  // clusters: neat piles of one kind
  let made = 0
  let guard = 0
  while (made < spec.count && guard++ < 400) {
    const kind = spec.kinds[Math.floor(r() * spec.kinds.length)]
    const band = spec.sizes[Math.floor(r() * spec.sizes.length)]
    const rad = band[0] + r() * (band[1] - band[0])
    const cx = 0.12 + r() * 0.76
    const cy = 0.1 + r() * (L - 0.3)
    const size = rad > 0.04 ? 1 + Math.floor(r() * 3) : 3 + Math.floor(r() * 7)
    const cols = Math.ceil(Math.sqrt(size))
    for (let k = 0; k < size && made < spec.count; k++) {
      const gx = (k % cols) - (cols - 1) / 2
      const gy = Math.floor(k / cols) - (cols - 1) / 2
      if (place(kind, rad, cx + gx * rad * 2.1, cy + gy * rad * 2.1)) made++
    }
  }
  for (let i = 0; i < spec.bombs; i++) place('bomb', 0.028, 0.1 + r() * 0.8, 0.1 + r() * (L - 0.35))
  // growth plan: smallest first must always fit
  const eat = objs.filter((o) => o.kind !== 'bomb').map((o) => o.r).sort((a, b) => a - b)
  let area = 0
  let need = 0.05
  for (const rad of eat) {
    if (rad >= r0 * FIT) need = Math.max(need, (rad / FIT - r0) / Math.sqrt(Math.max(area, 1e-6)))
    area += rad * rad
  }
  const growth = Math.min(1.2, Math.max(0.35, need * 1.12))
  const hard = isHard(n)
  const time = Math.round((eat.length * (hard ? 0.95 : 1.15) + 22 + (spec.walls === 'maze' ? 10 : 0)) / 5) * 5
  return { n, objs, walls, r0, growth, time, hard, biome: Math.floor((n - 1) / 3) % 4, tip: spec.tip }
}

// ── Authored levels ───────────────────────────────────────
export type AuthoredLevel = {
  name: string
  biome: number
  /** Objects as [kind, radius, x, y]; bombs use kind 'bomb'. */
  objs: [Kind, number, number, number][]
  walls?: Wall[]
  /** Seconds; defaults to the generator's formula. */
  time?: number
  tip?: string
}

/** Smallest-first growth rate that lets the hole fit every object in turn. */
export function growthFor(objs: { kind: Kind; r: number }[], r0: number) {
  const eat = objs.filter((o) => o.kind !== 'bomb').map((o) => o.r).sort((a, b) => a - b)
  let area = 0
  let need = 0.05
  for (const rad of eat) {
    if (rad >= r0 * FIT) need = Math.max(need, (rad / FIT - r0) / Math.sqrt(Math.max(area, 1e-6)))
    area += rad * rad
  }
  return Math.min(1.2, Math.max(0.35, need * 1.12))
}

export function authoredLevel(n: number, a: AuthoredLevel, r0 = 0.054): LevelDef {
  const objs: Obj[] = a.objs.map(([kind, r, x, y], i) => ({ id: uid++, kind, x, y, r, hue: i % 4 }))
  const walls = (a.walls ?? []).map((w) => ({ ...w, move: w.move ? { ...w.move } : undefined }))
  const hard = isHard(n)
  const count = objs.filter((o) => o.kind !== 'bomb').length
  const maze = walls.filter((w) => !w.move).length >= 3
  const time = a.time ?? Math.round((count * (hard ? 0.95 : 1.15) + 22 + (maze ? 10 : 0)) / 5) * 5
  // growth is planned for the base hole so upgrades only make levels easier
  return { n, objs, walls, r0, growth: growthFor(objs, 0.054), time, hard, biome: a.biome, tip: a.tip, name: a.name }
}
