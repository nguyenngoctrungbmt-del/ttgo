/**
 * Signature levels for Dark Maze: hand-picked layouts, seeds and rule mixes blended into the
 * endless generator. Levels not listed here use `config()` with a random maze.
 * Every 5th level is a boss vault. Validated by the lv5 maze checker (exit + keys reachable).
 */
import type { Shape } from './maze'

export type MazeSig = {
  name: string
  sub: string
  boss?: boolean
  shape?: Shape
  /** Fixed seed so the layout is the same for every player. */
  seed: number
  cols?: number
  rows?: number
  doors?: number
  traps?: number
  oils?: number
  gems?: number
  loops?: number
  /** Multipliers on the generator's lantern radius, preview time and oil slack. */
  light?: number
  memo?: number
  slack?: number
}

export const SIGNATURE: Record<number, MazeSig> = {
  1: { name: 'First Steps', sub: 'memorise the way out', seed: 101, cols: 4, rows: 5, loops: 0 },
  2: { name: 'The Serpent', sub: 'one long winding hall', shape: 'serpent', seed: 202, cols: 4, rows: 5, memo: 0.9 },
  4: { name: 'The Comb', sub: 'only one tooth leads out', shape: 'comb', seed: 404, cols: 5, rows: 6, doors: 1 },
  5: { name: 'Boss · Spiral Hoard', sub: 'grab every gem on the way in', boss: true, shape: 'spiral', seed: 505, cols: 5, rows: 6, gems: 4, loops: 5 },
  7: { name: 'Lamp Oil Lane', sub: 'flasks hide in the side halls', seed: 707, oils: 3, slack: 0.85 },
  8: { name: 'Bed of Nails', sub: 'more spikes than usual', seed: 808, traps: 5, memo: 1.15 },
  10: { name: 'Boss · The Coiled Vault', sub: 'a locked spiral full of spikes', boss: true, shape: 'spiral', seed: 1010, cols: 6, rows: 7, doors: 1, traps: 3, gems: 3, loops: 7 },
  12: { name: 'Twin Keys', sub: 'two locks, one after another', seed: 1212, doors: 2, traps: 2 },
  13: { name: 'Snake Pit', sub: 'the serpent bites back', shape: 'serpent', seed: 1313, cols: 6, rows: 8, loops: 4, traps: 4, doors: 1 },
  15: { name: 'Boss · Comb of Spikes', sub: 'every tooth but one is a trap', boss: true, shape: 'comb', seed: 1515, cols: 6, rows: 9, doors: 2, traps: 6, gems: 3, loops: 2 },
  16: { name: 'Breather', sub: 'a calm little maze', seed: 1616, cols: 5, rows: 6, traps: 1, doors: 1, memo: 1.2 },
  18: { name: 'Candle Stub', sub: 'tiny lantern · bigger preview', seed: 1818, light: 0.75, memo: 1.3 },
  20: { name: 'Boss · The Labyrinth', sub: 'big, braided and dark', boss: true, seed: 2020, cols: 8, rows: 11, doors: 2, traps: 6, oils: 2, gems: 3, loops: 8 },
  22: { name: 'Braided Halls', sub: 'many loops · many ways round', seed: 2222, loops: 14, traps: 6 },
  24: { name: 'Long Serpent', sub: 'a winding hall with shortcuts', shape: 'serpent', seed: 2424, cols: 7, rows: 10, loops: 6, traps: 5, doors: 2, oils: 2 },
  25: { name: 'Boss · Whirlpool', sub: 'a great spiral with hidden shortcuts', boss: true, shape: 'spiral', seed: 2525, cols: 8, rows: 10, loops: 11, doors: 2, traps: 5, gems: 4, oils: 2 },
  27: { name: 'Quick Glance', sub: 'short preview · wide lantern', seed: 2727, memo: 0.8, light: 1.3 },
  30: { name: 'Boss · Key Keeper', sub: 'three locked doors', boss: true, seed: 3030, cols: 8, rows: 12, doors: 3, traps: 6, oils: 2, gems: 3, loops: 4 },
  31: { name: 'Breather', sub: 'catch your breath', seed: 3131, cols: 6, rows: 8, traps: 2, doors: 1, memo: 1.2 },
  33: { name: 'Minefield', sub: 'spikes everywhere · take it slow', seed: 3333, traps: 9, memo: 1.2 },
  35: { name: 'Boss · Grand Comb', sub: 'long teeth, two locks, little oil', boss: true, shape: 'comb', seed: 3535, cols: 9, rows: 12, doors: 2, traps: 7, gems: 3, oils: 2, loops: 4, slack: 0.9 },
  38: { name: 'Ember Light', sub: 'the lantern barely glows', seed: 3838, light: 0.7, memo: 1.25, traps: 6 },
  40: { name: 'Boss · Heart of the Dark', sub: 'the deepest vault', boss: true, shape: 'spiral', seed: 4040, cols: 9, rows: 13, loops: 9, doors: 3, traps: 7, gems: 5, oils: 3 },
  45: { name: 'Boss · Endless Serpent', sub: 'the longest hall of all', boss: true, shape: 'serpent', seed: 4545, cols: 9, rows: 13, loops: 10, doors: 3, traps: 7, gems: 4, oils: 3 },
  50: { name: 'Boss · The Minotaur', sub: 'the final labyrinth', boss: true, seed: 5050, cols: 9, rows: 13, loops: 6, doors: 3, traps: 8, gems: 5, oils: 3, light: 0.85 },
}

export const AUTHORED = 50

/** Small deterministic RNG (mulberry32). */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Generator settings for level L (signature levels override them). */
export function config(L: number, flaskLvl: number) {
  const bonus = L % 5 === 0
  const cols = Math.min(9, 4 + Math.floor(L / 2.5))
  const rows = Math.min(13, cols + 1 + Math.floor(L / 4))
  const base = {
    bonus,
    cols,
    rows,
    doors: bonus ? 0 : L >= 11 ? 2 : L >= 3 ? 1 : 0,
    traps: bonus ? 0 : L >= 5 ? Math.min(7, 1 + Math.floor((L - 3) / 2)) : 0,
    oils: L >= 7 ? 1 + Math.floor(L / 8) : bonus ? 1 : 0,
    gems: bonus ? 5 : 0,
    loops: Math.floor(cols * rows * (L >= 6 ? 0.06 : 0.03)),
    slack: (bonus ? 2.4 : Math.max(1.35, 2.1 - L * 0.045)) * (1 + flaskLvl * 0.15),
    shape: 'random' as Shape,
    light: 1,
    memo: 1,
    sig: null as MazeSig | null,
  }
  const s = SIGNATURE[L]
  if (!s) return base
  return {
    ...base,
    bonus: !!s.boss && (s.gems ?? 0) > 0,
    cols: s.cols ?? base.cols,
    rows: s.rows ?? base.rows,
    doors: s.doors ?? (s.boss ? 1 : base.doors),
    traps: s.traps ?? (s.boss ? base.traps || 2 : base.traps),
    oils: s.oils ?? base.oils,
    gems: s.gems ?? 0,
    loops: s.loops ?? base.loops,
    // Boss vaults use the normal oil budget (not the relaxed treasure-run one), plus a little extra.
    slack: (s.boss ? Math.max(1.35, 2.1 - L * 0.045) * (1 + flaskLvl * 0.15) * 1.15 : base.slack) * (s.slack ?? 1),
    shape: s.shape ?? 'random',
    light: s.light ?? 1,
    memo: (s.memo ?? 1) * (s.boss ? 1.1 : 1),
    sig: s,
  }
}
