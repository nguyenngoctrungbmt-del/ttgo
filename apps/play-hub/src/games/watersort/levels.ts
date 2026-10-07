// Seeded water-sort levels. Each candidate shuffle is run through a DFS solver; unsolvable or
// too-hard-to-prove shuffles are skipped (next attempt seed), so every level shipped is solvable.
// The solver's move count becomes the level's par. Scratch cl-water-check.mjs verifies 1–80.

export const CAP = 4

export type Tube = number[] // bottom → top, color indices

export function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleSeeded<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function levelSpec(level: number): { colors: number; empties: number } {
  if (level <= 4) return { colors: 3, empties: 2 }
  if (level <= 10) return { colors: 4, empties: 2 }
  if (level <= 18) return { colors: 5, empties: 2 }
  if (level <= 28) return { colors: 6, empties: 2 }
  if (level <= 38) return { colors: 7, empties: 2 }
  return { colors: 8, empties: 2 }
}

export function topRun(tube: Tube): { color: number; count: number } | null {
  if (!tube.length) return null
  const color = tube[tube.length - 1]
  let count = 1
  for (let i = tube.length - 2; i >= 0; i -= 1) {
    if (tube[i] !== color) break
    count += 1
  }
  return { color, count }
}

export function canPour(from: Tube, to: Tube): boolean {
  if (!from.length || from === to) return false
  if (to.length >= CAP) return false
  const run = topRun(from)
  if (!run) return false
  if (!to.length) return true
  return to[to.length - 1] === run.color
}

export function pour(from: Tube, to: Tube): { from: Tube; to: Tube; moved: number; color: number } {
  const run = topRun(from)!
  const space = CAP - to.length
  const moved = Math.min(run.count, space)
  const nextFrom = from.slice(0, from.length - moved)
  const nextTo = [...to, ...Array.from({ length: moved }, () => run.color)]
  return { from: nextFrom, to: nextTo, moved, color: run.color }
}

export function isSolved(tubes: Tube[]): boolean {
  return tubes.every((t) => t.length === 0 || (t.length === CAP && t.every((c) => c === t[0])))
}

const keyOf = (tubes: Tube[]) =>
  tubes
    .map((t) => t.join(''))
    .sort()
    .join('|')

/** DFS solver. Returns the pours [from, to] of the found solution, or null (unsolvable / over budget). */
export function solvePath(start: Tube[], budget = 60000): [number, number][] | null {
  const seen = new Set<string>()
  let nodes = 0
  const path: [number, number][] = []
  function dfs(tubes: Tube[]): boolean {
    if (isSolved(tubes)) return true
    if (++nodes > budget) return false
    const k = keyOf(tubes)
    if (seen.has(k)) return false
    seen.add(k)
    const moves: { i: number; j: number; score: number }[] = []
    for (let i = 0; i < tubes.length; i += 1) {
      const a = tubes[i]
      if (!a.length) continue
      const run = topRun(a)!
      // a finished tube never needs to move
      if (a.length === CAP && run.count === CAP) continue
      let emptyTried = false
      for (let j = 0; j < tubes.length; j += 1) {
        if (i === j || !canPour(a, tubes[j])) continue
        const b = tubes[j]
        if (!b.length) {
          // pouring a whole single-colour tube into an empty one is pointless
          if (run.count === a.length || emptyTried) continue
          emptyTried = true
          moves.push({ i, j, score: 1 })
        } else {
          const fits = CAP - b.length >= run.count
          moves.push({ i, j, score: fits ? (run.count === a.length ? 4 : 3) : 2 })
        }
      }
    }
    moves.sort((x, y) => y.score - x.score)
    for (const m of moves) {
      const res = pour(tubes[m.i], tubes[m.j])
      const next = tubes.map((t, idx) => (idx === m.i ? res.from : idx === m.j ? res.to : t))
      path.push([m.i, m.j])
      if (dfs(next)) return true
      path.pop()
    }
    return false
  }
  return dfs(start) ? path : null
}

export type WaterLevel = { tubes: Tube[]; par: number }

const cache = new Map<number, WaterLevel>()

/** Level n (1-based): first seeded shuffle the solver proves solvable. */
export function makeLevel(level: number): WaterLevel {
  const hit = cache.get(level)
  if (hit) return hit
  const { colors, empties } = levelSpec(level)
  for (let attempt = 0; ; attempt += 1) {
    const rand = mulberry32(level * 9973 + attempt * 131 + 42)
    const pool: number[] = []
    for (let c = 0; c < colors; c += 1) for (let k = 0; k < CAP; k += 1) pool.push(c)
    const shuffled = shuffleSeeded(pool, rand)
    const tubes: Tube[] = []
    for (let i = 0; i < colors; i += 1) tubes.push(shuffled.slice(i * CAP, i * CAP + CAP))
    for (let e = 0; e < empties; e += 1) tubes.push([])
    if (isSolved(tubes)) continue
    const sol = solvePath(tubes)
    if (!sol) continue
    const lv = { tubes, par: sol.length }
    cache.set(level, lv)
    return lv
  }
}
