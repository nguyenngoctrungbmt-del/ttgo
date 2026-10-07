/** Scene generation for Spot the Change: a scene plus its changed twin. */
import { rand } from '../../shared/action/fx'
import { shuffle } from '../matrix/memkit'
import { COLORS, FLIPPABLE, THEME_KINDS, TILTABLE, luminance, type Kind, type Theme } from './art'

export type ChangeType = 'move' | 'vanish' | 'appear' | 'color' | 'turn'

export type Obj = { id: number; kind: Kind; cx: number; cy: number; s: number; color: string; rot: number; flip: number }
export type Change = { type: ChangeType; id: number; pts: { cx: number; cy: number }[]; found: boolean; t: number }

/** Overrides used by signature levels. */
export type SceneOpts = {
  objs?: number
  changes?: number
  types?: ChangeType[]
  kinds?: Kind[]
  colors?: string[]
}

export function makeObj(id: number, kind: Kind, cell: number, cols: number, colors: string[] = COLORS): Obj {
  return {
    id,
    kind,
    cx: (cell % cols) + 0.5 + rand(-0.13, 0.13),
    cy: Math.floor(cell / cols) + 0.5 + rand(-0.13, 0.13),
    s: rand(0.74, 0.9),
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: rand(-0.12, 0.12),
    flip: Math.random() < 0.5 ? 1 : -1,
  }
}

export function cellOf(o: { cx: number; cy: number }, cols: number) {
  return Math.floor(o.cy) * cols + Math.floor(o.cx)
}

/** Builds a scene plus its changed twin. */
export function genScene(L: number, cols: number, rows: number, theme: Theme, bonus: boolean, so: SceneOpts = {}) {
  const cells = cols * rows
  const nObj = Math.min(cells - 3, so.objs ?? 4 + Math.floor(L * 0.6))
  const pal = so.colors ?? COLORS
  const order = shuffle(Array.from({ length: cells }, (_, i) => i))
  const kinds = so.kinds ?? THEME_KINDS[theme]
  let nextId = 0
  const before: Obj[] = order.slice(0, nObj).map((c) => makeObj(nextId++, kinds[Math.floor(Math.random() * kinds.length)], c, cols, pal))
  const after: Obj[] = before.map((o) => ({ ...o }))
  const free = order.slice(nObj)
  const allowed: ChangeType[] = so.types ? [...so.types] : ['vanish', 'appear']
  if (!so.types && L >= 3) allowed.push('move')
  if (!so.types && L >= 5) allowed.push('color')
  if (!so.types && L >= 7) allowed.push('turn')
  const n = so.changes ?? Math.min(3, (L >= 15 ? 3 : L >= 9 ? 2 : 1) + (bonus ? 1 : 0))
  const changes: Change[] = []
  const touched = new Set<number>()
  let guard = 0
  while (changes.length < n && guard++ < 120) {
    // Newest mechanic shows up more often right after it unlocks.
    const type = Math.random() < 0.35 ? allowed[allowed.length - 1] : allowed[Math.floor(Math.random() * allowed.length)]
    const pool = after.filter((o) => !touched.has(o.id) && o.id < nObj)
    if (!pool.length) break
    const o = pool[Math.floor(Math.random() * pool.length)]
    if (type === 'vanish') {
      after.splice(after.indexOf(o), 1)
      changes.push({ type, id: o.id, pts: [{ cx: o.cx, cy: o.cy }], found: false, t: 0 })
      touched.add(o.id)
    } else if (type === 'appear') {
      if (!free.length) continue
      const c = free.shift()!
      const no = makeObj(nextId++, kinds[Math.floor(Math.random() * kinds.length)], c, cols, pal)
      after.push(no)
      touched.add(no.id)
      changes.push({ type, id: no.id, pts: [{ cx: no.cx, cy: no.cy }], found: false, t: 0 })
    } else if (type === 'move') {
      if (!free.length) continue
      const oc = cellOf(o, cols)
      const ox = oc % cols
      const oy = Math.floor(oc / cols)
      // Prefer a nearby free cell so the move is a "nudge", not a teleport.
      free.sort((a, b) => Math.hypot((a % cols) - ox, Math.floor(a / cols) - oy) - Math.hypot((b % cols) - ox, Math.floor(b / cols) - oy))
      const c = free.shift()!
      const from = { cx: o.cx, cy: o.cy }
      o.cx = (c % cols) + 0.5 + rand(-0.1, 0.1)
      o.cy = Math.floor(c / cols) + 0.5 + rand(-0.1, 0.1)
      touched.add(o.id)
      changes.push({ type, id: o.id, pts: [{ cx: o.cx, cy: o.cy }, from], found: false, t: 0 })
    } else if (type === 'color') {
      const l0 = luminance(o.color)
      const opts = pal.filter((c) => c !== o.color && Math.abs(luminance(c) - l0) > 0.2)
      if (!opts.length) continue
      o.color = opts[Math.floor(Math.random() * opts.length)]
      touched.add(o.id)
      changes.push({ type, id: o.id, pts: [{ cx: o.cx, cy: o.cy }], found: false, t: 0 })
    } else {
      if (FLIPPABLE.has(o.kind)) o.flip *= -1
      else if (TILTABLE.has(o.kind)) o.rot += Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2
      else continue
      touched.add(o.id)
      changes.push({ type, id: o.id, pts: [{ cx: o.cx, cy: o.cy }], found: false, t: 0 })
    }
  }
  return { before, after, changes }
}

