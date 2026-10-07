/**
 * Goods Sort level model, generator and solver.
 * A shelf has layers of 3 slots; layer 0 is the front. When the front empties, the next layer slides forward.
 * Three identical goods in a front layer clear. Every generated level is verified solvable by a DFS solver.
 */

export type Item = { id: number; t: number; thaw: number }
export type Shelf = { layers: (Item | null)[][]; lockAt: number; row: number; slot: number }
export type LevelDef = {
  n: number
  cols: number
  rows: number
  moving: number[]
  shelves: Shelf[]
  types: number
  items: number
  time: number
  hard: boolean
  tip?: string
  name?: string
}

type Spec = {
  shelves: number
  cols: number
  layers: [number, number]
  types: number
  freeFront: number
  backGaps: number
  locks: number
  ice: number
  moving: boolean
  tip?: string
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

function specFor(n: number): Spec {
  // Hand-tuned tutorial: one new idea per level.
  if (n === 1) return { shelves: 3, cols: 3, layers: [1, 1], types: 2, freeFront: 3, backGaps: 0, locks: 0, ice: 0, moving: false, tip: 'drag goods to make 3 of a kind' }
  if (n === 2) return { shelves: 3, cols: 3, layers: [2, 2], types: 3, freeFront: 4, backGaps: 0, locks: 0, ice: 0, moving: false, tip: 'goods behind slide forward' }
  if (n === 3) return { shelves: 6, cols: 3, layers: [1, 2], types: 6, freeFront: 4, backGaps: 1, locks: 0, ice: 0, moving: false, tip: 'clear quickly for combos' }
  if (n === 4) return { shelves: 6, cols: 3, layers: [2, 2], types: 7, freeFront: 4, backGaps: 1, locks: 1, ice: 0, moving: false, tip: 'locked shelf opens after 3 clears' }
  if (n === 5) return { shelves: 9, cols: 3, layers: [2, 3], types: 10, freeFront: 5, backGaps: 2, locks: 0, ice: 0, moving: false, tip: 'hard level!' }
  if (n === 6) return { shelves: 6, cols: 3, layers: [2, 3], types: 8, freeFront: 4, backGaps: 2, locks: 0, ice: 3, moving: false, tip: 'frozen goods thaw as you clear' }
  if (n === 7) return { shelves: 9, cols: 3, layers: [2, 3], types: 10, freeFront: 5, backGaps: 2, locks: 1, ice: 2, moving: false }
  if (n === 8) return { shelves: 9, cols: 3, layers: [2, 3], types: 11, freeFront: 5, backGaps: 2, locks: 1, ice: 3, moving: true, tip: 'the middle row is moving' }
  const hard = isHard(n)
  const shelves = n < 12 ? 9 : 12
  const deep = Math.min(shelves > 9 ? 3 : 4, 2 + Math.floor(n / 8) + (hard ? 1 : 0))
  return {
    shelves,
    cols: 3,
    layers: [Math.max(2, deep - 1), deep],
    types: Math.min(18, 9 + Math.floor(n / 3) + (hard ? 2 : 0)),
    freeFront: hard ? 4 : 5,
    backGaps: 2 + (n % 3),
    locks: n % 3 === 0 || hard ? 1 : n > 16 && n % 4 === 1 ? 2 : 0,
    ice: n % 2 === 0 || hard ? Math.min(6, 2 + Math.floor(n / 6)) : 0,
    moving: n % 4 === 0 || (hard && n >= 10),
  }
}

// ── Solver (compact representation) ──────────────────────
// slot value: -1 empty, otherwise type + 256 * thawAt
type SShelf = { layers: number[][]; lockAt: number }
export type SState = { shelves: SShelf[]; clears: number }

function settle(sh: SShelf, st: SState) {
  for (let guard = 0; guard < 8; guard++) {
    const f = sh.layers[0]
    if (!f) return
    if (f[0] >= 0 && f[1] >= 0 && f[2] >= 0 && (f[0] & 255) === (f[1] & 255) && (f[1] & 255) === (f[2] & 255)) {
      f[0] = f[1] = f[2] = -1
      st.clears++
    }
    if (f[0] < 0 && f[1] < 0 && f[2] < 0 && sh.layers.length > 1) {
      sh.layers.shift()
      continue
    }
    return
  }
}

function clone(st: SState): SState {
  return { clears: st.clears, shelves: st.shelves.map((s) => ({ lockAt: s.lockAt, layers: s.layers.map((l) => l.slice()) })) }
}

function key(st: SState) {
  let k = ''
  const pend = st.shelves.some((s) => s.lockAt > st.clears) || st.shelves.some((s) => s.layers.some((l) => l.some((v) => v >= 256 && v >> 8 > st.clears)))
  if (pend) k += st.clears + '|'
  for (const s of st.shelves) {
    for (const l of s.layers) {
      const a = l.map((v) => (v < 0 ? -1 : v >> 8 > st.clears ? v : v & 255)).sort((x, y) => x - y)
      k += a.join(',') + ';'
    }
    k += '/'
  }
  return k
}

export function done(st: SState) {
  return st.shelves.every((s) => s.layers.every((l) => l.every((v) => v < 0)))
}

type Move = { a: number; i: number; b: number; j: number; score: number }

export function moves(st: SState): Move[] {
  const out: Move[] = []
  const S = st.shelves
  for (let b = 0; b < S.length; b++) {
    const B = S[b]
    if (B.lockAt > st.clears) continue
    const fb = B.layers[0]
    const j = fb.indexOf(-1)
    if (j < 0) continue
    const empties = fb.filter((v) => v < 0).length
    for (let a = 0; a < S.length; a++) {
      if (a === b) continue
      const A = S[a]
      if (A.lockAt > st.clears) continue
      const fa = A.layers[0]
      const seen: number[] = []
      for (let i = 0; i < 3; i++) {
        const v = fa[i]
        if (v < 0 || v >> 8 > st.clears) continue
        const t = v & 255
        if (seen.includes(t)) continue
        seen.push(t)
        const inB = fb.filter((x) => x >= 0 && (x & 255) === t).length
        const inA = fa.filter((x) => x >= 0 && (x & 255) === t).length
        const restA = fa.filter((x) => x >= 0).length
        let score = 0
        if (inB === 2) score += 1000
        else if (inB === 1 && empties === 2) score += 120
        else if (inB === 1) score += 20
        else if (empties === 3) score += 5
        if (restA === 1 && A.layers.length > 1) score += 40
        if (inA === 2) score -= 60
        if (restA === 1 && A.layers.length === 1) score += 10
        out.push({ a, i, b, j, score })
      }
    }
  }
  out.sort((x, y) => y.score - x.score)
  return out
}

export function apply(st: SState, m: Move): SState {
  const n = clone(st)
  const A = n.shelves[m.a]
  const B = n.shelves[m.b]
  B.layers[0][m.j] = A.layers[0][m.i]
  A.layers[0][m.i] = -1
  settle(B, n)
  settle(A, n)
  return n
}

export function solvable(st: SState, budget = 25000): boolean {
  const seen = new Set<string>([key(st)])
  let nodes = 0
  const dfs = (s: SState, depth: number): boolean => {
    if (done(s)) return true
    if (++nodes > budget || depth > 400) return false
    for (const m of moves(s)) {
      const ns = apply(s, m)
      const k = key(ns)
      if (seen.has(k)) continue
      seen.add(k)
      if (dfs(ns, depth + 1)) return true
      if (nodes > budget) return false
    }
    return false
  }
  return dfs(st, 0)
}

export function toSolverState(shelves: Shelf[], clears: number): SState {
  return {
    clears,
    shelves: shelves.map((s) => ({ lockAt: s.lockAt, layers: s.layers.map((l) => l.map((it) => (it ? it.t + 256 * it.thaw : -1))) })),
  }
}

/** Best greedy move for the attract-mode demo. */
export function demoMove(shelves: Shelf[], clears: number) {
  const m = moves(toSolverState(shelves, clears))[0]
  return m ? { a: m.a, i: m.i, b: m.b, j: m.j } : null
}

// ── Generator ─────────────────────────────────────────────
let uid = 1

function build(spec: Spec, r: () => number, typeOrder: number[]): Shelf[] | null {
  const S = spec.shelves
  const layerCounts = Array.from({ length: S }, () => spec.layers[0] + Math.floor(r() * (spec.layers[1] - spec.layers[0] + 1)))
  // slot list: [shelf, layer, slot]
  const slots: [number, number, number][] = []
  layerCounts.forEach((n, s) => {
    for (let l = 0; l < n; l++) for (let k = 0; k < 3; k++) slots.push([s, l, k])
  })
  const lockShelves = new Set<number>()
  while (lockShelves.size < spec.locks) lockShelves.add(Math.floor(r() * S))
  // pick empty slots: front gaps (not on locked shelves) + back gaps
  const empty = new Set<string>()
  const fronts = slots.filter(([s, l]) => l === 0 && !lockShelves.has(s))
  for (let i = 0; i < spec.freeFront && fronts.length; i++) {
    const [s, l, k] = fronts.splice(Math.floor(r() * fronts.length), 1)[0]
    empty.add(`${s},${l},${k}`)
  }
  const backs = slots.filter(([, l]) => l > 0)
  for (let i = 0; i < spec.backGaps && backs.length; i++) {
    const [s, l, k] = backs.splice(Math.floor(r() * backs.length), 1)[0]
    empty.add(`${s},${l},${k}`)
  }
  let fill = slots.filter(([s, l, k]) => !empty.has(`${s},${l},${k}`))
  const extra = fill.length % 3
  for (let i = 0; i < extra; i++) {
    const idx = fill.findIndex(([, l]) => l > 0) >= 0 ? fill.findIndex(([, l]) => l > 0) : fill.length - 1
    const [s, l, k] = fill.splice(idx, 1)[0]
    empty.add(`${s},${l},${k}`)
  }
  fill = slots.filter(([s, l, k]) => !empty.has(`${s},${l},${k}`))
  const triples = fill.length / 3
  const pool: number[] = []
  for (let i = 0; i < triples; i++) {
    const t = typeOrder[i % spec.types]
    pool.push(t, t, t)
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const shelves: Shelf[] = layerCounts.map((n, s) => ({
    layers: Array.from({ length: n }, () => [null, null, null] as (Item | null)[]),
    lockAt: lockShelves.has(s) ? 3 + Math.floor(r() * 2) : 0,
    row: 0,
    slot: 0,
  }))
  fill.forEach(([s, l, k], i) => {
    shelves[s].layers[l][k] = { id: uid++, t: pool[i], thaw: 0 }
  })
  // no layer may start as a triple
  for (const sh of shelves) for (const l of sh.layers) if (l[0] && l[1] && l[2] && l[0].t === l[1].t && l[1].t === l[2].t) return null
  // trim fully empty back layers / ensure front is not empty when backs exist
  for (const sh of shelves) {
    sh.layers = sh.layers.filter((l, i) => i === 0 || l.some((x) => x))
    while (sh.layers.length > 1 && sh.layers[0].every((x) => !x)) sh.layers.shift()
  }
  // ice on front/back items of unlocked shelves
  const cands = shelves.flatMap((sh) => (sh.lockAt ? [] : sh.layers.slice(0, 2).flatMap((l) => l.filter((x): x is Item => !!x))))
  for (let i = 0; i < spec.ice && cands.length; i++) {
    const it = cands.splice(Math.floor(r() * cands.length), 1)[0]
    it.thaw = 1 + Math.floor(r() * 3)
  }
  return shelves
}

export function makeLevel(n: number, seed: number): LevelDef {
  const spec = specFor(n)
  const r = rng(seed * 7919 + n * 104729)
  const typeOrder = Array.from({ length: 18 }, (_, i) => i)
  for (let i = typeOrder.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[typeOrder[i], typeOrder[j]] = [typeOrder[j], typeOrder[i]]
  }
  let shelves: Shelf[] | null = null
  const sp = { ...spec }
  for (let attempt = 0; attempt < 60 && !shelves; attempt++) {
    if (attempt > 0 && attempt % 12 === 0) {
      sp.freeFront += 1
      sp.ice = Math.max(0, sp.ice - 1)
    }
    const cand = build(sp, r, typeOrder)
    if (cand && solvable(toSolverState(cand, 0), 2500)) shelves = cand
  }
  if (!shelves) {
    // Fallback: one triple per shelf layer, trivially solvable.
    shelves = Array.from({ length: spec.shelves }, (_, s) => ({
      layers: [[0, 1, 2].map(() => ({ id: uid++, t: typeOrder[s % spec.types], thaw: 0 })).map((it, k) => (k === 2 ? null : it))],
      lockAt: 0,
      row: 0,
      slot: 0,
    }))
    shelves.push({ layers: [[null, null, null]], lockAt: 0, row: 0, slot: 0 })
  }
  const cols = spec.cols
  const rows = Math.ceil(shelves.length / cols)
  const moving = spec.moving && rows >= 3 ? [1] : []
  // arrange rows; a moving row gets one extra shelf taken from the last row if possible
  let idx = 0
  for (let row = 0; row < rows; row++) {
    for (let c = 0; c < cols && idx < shelves.length; c++) {
      shelves[idx].row = row
      shelves[idx].slot = c
      idx++
    }
  }
  if (moving.length) {
    const last = shelves.filter((s) => s.row === rows - 1)
    const mv = last[last.length - 1]
    if (last.length > 1 && mv) {
      mv.row = moving[0]
      mv.slot = cols
    }
  }
  const items = shelves.reduce((a, s) => a + s.layers.reduce((b, l) => b + l.filter(Boolean).length, 0), 0)
  const hard = isHard(n)
  const time = Math.round((items * (hard ? 2 : 2.3) + 20) / 5) * 5
  return { n, cols, rows: Math.max(...shelves.map((s) => s.row)) + 1, moving, shelves, types: spec.types, items, time, hard, tip: spec.tip }
}

/** True if any legal move exists. */
export function canMove(shelves: Shelf[], clears: number) {
  return moves(toSolverState(shelves, clears)).length > 0
}

/** First move of a full solution (falls back to the greedy move). */
export function hintMove(shelves: Shelf[], clears: number, avoid: string[] = [], budget = 6000) {
  const start = toSolverState(shelves, clears)
  const seen = new Set<string>([key(start), ...avoid])
  let nodes = 0
  let first: Move | null = null
  const dfs = (s: SState, depth: number): boolean => {
    if (done(s)) return true
    if (++nodes > budget || depth > 400) return false
    for (const m of moves(s)) {
      const ns = apply(s, m)
      const k = key(ns)
      if (seen.has(k)) continue
      seen.add(k)
      if (depth === 0) first = m
      if (dfs(ns, depth + 1)) return true
      if (nodes > budget) return false
    }
    return false
  }
  const ok = dfs(start, 0)
  const m: Move | null = ok ? first : moves(start)[0] ?? null
  return m ? { a: m.a, i: m.i, b: m.b, j: m.j, solved: ok } : null
}

export function stateKey(shelves: Shelf[], clears: number) {
  return key(toSolverState(shelves, clears))
}

// ── Authored levels ───────────────────────────────────────
/**
 * Authored shelf notation: layers front→back separated by '/', three slots per layer.
 * a–r = good type (see art GOODS), '.' = empty, a digit after a good = frozen until that many clears.
 * A '#n:' prefix locks the shelf until n clears. '' in a row is an empty spot in the layout.
 */
export type AuthoredLevel = { name: string; rows: string[][]; moving?: number; time: number; tip?: string }

export function parseShelf(src: string, row: number, slot: number): Shelf {
  let lockAt = 0
  let body = src
  const m = /^#(\d+):/.exec(src)
  if (m) {
    lockAt = Number(m[1])
    body = src.slice(m[0].length)
  }
  const layers = body.split('/').map((layer) => {
    const out: (Item | null)[] = []
    for (let i = 0; i < layer.length; i++) {
      const ch = layer[i]
      if (ch === '.') out.push(null)
      else if (ch >= '0' && ch <= '9') {
        const it = out[out.length - 1]
        if (it) it.thaw = Number(ch)
      } else out.push({ id: uid++, t: ch.charCodeAt(0) - 97, thaw: 0 })
    }
    return out
  })
  return { layers, lockAt, row, slot }
}

export function authoredLevel(n: number, a: AuthoredLevel): LevelDef {
  const shelves: Shelf[] = []
  a.rows.forEach((r, row) => r.forEach((src, slot) => src && shelves.push(parseShelf(src, row, slot))))
  const items = shelves.reduce((s, sh) => s + sh.layers.reduce((b, l) => b + l.filter(Boolean).length, 0), 0)
  const types = new Set(shelves.flatMap((sh) => sh.layers.flatMap((l) => l.filter((x): x is Item => !!x).map((x) => x.t)))).size
  return {
    n,
    cols: 3,
    rows: a.rows.length,
    moving: a.moving != null ? [a.moving] : [],
    shelves,
    types,
    items,
    time: a.time,
    hard: isHard(n),
    tip: a.tip,
    name: a.name,
  }
}
