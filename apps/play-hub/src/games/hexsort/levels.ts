/**
 * Hexa Sort levels. Boards are written as 7 columns (left → right, each top → bottom,
 * lengths 4 5 6 7 6 5 4 — the radius-3 hexagon):
 *   '.' open hex   '-' no hex   '1'..'4' locked hex (opens after `locks[d]` tiles cleared)
 *   'a'..'z' open hex holding the preset stack `stacks[ch]` (colour letters, bottom → top)
 * Colour letters: R coral · Y sun · G mint · B sky · P grape · O tangerine · K pink · W snow.
 * Every authored level was verified clearable by a look-ahead bot (scratch lv7-hex-verify);
 * `par` = the bot's move count + slack, used for stars.
 */
import { COL_LEN, MAX_COLORS, type HexCell, type OfferSpec, rnd, type Rng } from './logic'

export type HexLevel = {
  name: string
  hint?: string
  cols: string[]
  stacks?: Record<string, string>
  locks?: Record<string, number>
  colors: number
  goal: number
  /** offer heights and how often stacks have 2/3 colour segments */
  h?: [number, number]
  p3?: number
  p2?: number
  bonusEvery?: number
  seed: number
  par: number
}

export type HexLevelSpec = HexLevel & { n: number; boss: boolean; offer: OfferSpec; authored: boolean }

export const COLOR_KEYS = 'RYGBPOKW'

const R2 = ['----', '-...-', '-....-', '-.....-', '-....-', '-...-', '----']
const FULL = ['....', '.....', '......', '.......', '......', '.....', '....']

export const LEVELS: HexLevel[] = [
  // ── 1–5: learn to stack ─────────────────────────────
  {
    name: 'First Drop',
    hint: 'drop a stack next to the same colour',
    cols: ['----', '-.a.-', '-....-', '-..b..-', '-....-', '-.c.-', '----'],
    stacks: { a: 'RRR', b: 'YYYY', c: 'RR' },
    colors: 2,
    goal: 20,
    h: [2, 4],
    p3: 0,
    p2: 0.2,
    bonusEvery: 0,
    seed: 101,
    par: 7,
  },
  {
    name: 'Three Shades',
    hint: 'ten of one colour on top burst',
    cols: R2,
    colors: 3,
    goal: 30,
    h: [2, 4],
    p3: 0,
    p2: 0.35,
    bonusEvery: 0,
    seed: 202,
    par: 13,
  },
  {
    name: 'Under the Top',
    hint: 'only the top colour slides — dig out what hides below',
    cols: ['----', '-.a.-', '-b...-', '-..c...-', '-...d-', '-.e.-', '----'],
    stacks: { a: 'YYRR', b: 'GGYY', c: 'RRRGG', d: 'YYRRR', e: 'GGGY' },
    colors: 3,
    goal: 40,
    h: [2, 5],
    p3: 0,
    p2: 0.5,
    bonusEvery: 0,
    seed: 303,
    par: 10,
  },
  {
    name: 'Chain Reaction',
    hint: 'one drop can flip two bursts in a row',
    cols: ['----', '-.a.-', '-.bc.-', '-..d..-', '-.ef.-', '-.g.-', '----'],
    stacks: { a: 'RRRR', b: 'GGGGG', c: 'RRRRR', d: 'YYYY', e: 'YYYYY', f: 'GGGG', g: 'RR' },
    colors: 3,
    goal: 50,
    h: [2, 5],
    p3: 0,
    p2: 0.45,
    bonusEvery: 6,
    seed: 404,
    par: 12,
  },
  {
    name: 'Crowded Pond',
    hint: 'boss: little room, plan every drop',
    cols: ['----', '-.a.-', '-.-..-', '-..b-..-', '-..-.-', '-.c.-', '----'],
    stacks: { a: 'GGRRR', b: 'YYYGG', c: 'RRYY' },
    colors: 3,
    goal: 70,
    h: [2, 5],
    p3: 0.1,
    p2: 0.55,
    bonusEvery: 5,
    seed: 505,
    par: 24,
  },
  // ── 6–10: locked hexes open as you clear ─────────────
  {
    name: 'New Ground',
    hint: 'locked hexes open as you clear tiles',
    cols: ['1111', '1...1', '1....1', '1.....1', '1....1', '1...1', '1111'],
    locks: { 1: 20 },
    colors: 4,
    goal: 60,
    h: [2, 5],
    p3: 0.05,
    p2: 0.45,
    bonusEvery: 5,
    seed: 606,
    par: 23,
  },
  {
    name: 'Twin Isles',
    hint: 'two islands joined by a narrow bridge',
    cols: ['....', '.....', '-....-', '---.---', '-....-', '.....', '....'],
    colors: 4,
    goal: 60,
    h: [2, 5],
    p3: 0.05,
    p2: 0.45,
    bonusEvery: 5,
    seed: 707,
    par: 26,
  },
  {
    name: 'Key Ring',
    hint: 'the heart of the ring unlocks last',
    cols: ['----', '-...-', '-.11.-', '-.121.-', '-.11.-', '-...-', '----'],
    locks: { 1: 20, 2: 40 },
    colors: 4,
    goal: 70,
    h: [2, 5],
    p3: 0.05,
    p2: 0.45,
    bonusEvery: 5,
    seed: 808,
    par: 33,
  },
  {
    name: 'Breather Bay',
    hint: 'plenty of room — go for combos',
    cols: FULL,
    colors: 4,
    goal: 60,
    h: [2, 5],
    p3: 0,
    p2: 0.4,
    bonusEvery: 4,
    seed: 909,
    par: 23,
  },
  {
    name: 'The Vault',
    hint: 'boss: three seals, five colours',
    cols: ['3333', '32.23', '3....3', '3.....3', '3....3', '32.23', '3333'],
    locks: { 2: 15, 3: 50 },
    colors: 5,
    goal: 120,
    h: [2, 5],
    p3: 0.1,
    p2: 0.5,
    bonusEvery: 5,
    seed: 1010,
    par: 47,
  },
  // ── 11–15: tall, striped offers ─────────────────────
  {
    name: 'Striped Seas',
    hint: 'offers come in three colours now',
    cols: R2,
    colors: 4,
    goal: 60,
    h: [3, 6],
    p3: 0.3,
    p2: 0.6,
    bonusEvery: 5,
    seed: 1111,
    par: 21,
  },
  {
    name: 'Coral Garden',
    cols: ['-..-', '.....', '..--..', '...-...', '..--..', '.....', '-..-'],
    colors: 5,
    goal: 80,
    h: [3, 6],
    p3: 0.25,
    p2: 0.6,
    bonusEvery: 5,
    seed: 1212,
    par: 29,
  },
  {
    name: 'Totem Poles',
    hint: 'tall mixed towers — peel them colour by colour',
    cols: ['----', '-a.b-', '-....-', '-c.d.e-', '-....-', '-f.g-', '----'],
    stacks: { a: 'RRGGYYB', b: 'BBYYRRG', c: 'GGBBRR', d: 'YYYRRRGG', e: 'BBGGYY', f: 'RRYYBB', g: 'GGRRBBY' },
    colors: 4,
    goal: 80,
    h: [2, 5],
    p3: 0.15,
    p2: 0.5,
    bonusEvery: 5,
    seed: 1313,
    par: 19,
  },
  {
    name: 'Lazy Lagoon',
    hint: 'a calmer board — breathe',
    cols: FULL,
    colors: 5,
    goal: 70,
    h: [2, 5],
    p3: 0.1,
    p2: 0.45,
    bonusEvery: 4,
    seed: 1414,
    par: 32,
  },
  {
    name: 'Riptide',
    hint: 'boss: stripes, seals and five colours',
    cols: ['1111', '1...1', '1.a..1', '1..-..1', '1..b.1', '1...1', '1111'],
    stacks: { a: 'PPPBBB', b: 'BBBPPP' },
    locks: { 1: 40 },
    colors: 5,
    goal: 160,
    h: [3, 6],
    p3: 0.3,
    p2: 0.6,
    bonusEvery: 6,
    seed: 1515,
    par: 46,
  },
  // ── 16–20: strange shapes ───────────────────────────
  {
    name: 'Starfish',
    cols: ['-..-', '-...-', '......', '...-...', '......', '-...-', '-..-'],
    colors: 5,
    goal: 80,
    h: [2, 6],
    p3: 0.2,
    p2: 0.55,
    bonusEvery: 5,
    seed: 1616,
    par: 30,
  },
  {
    name: 'Honey Comb',
    hint: 'holes everywhere — every neighbour counts',
    cols: ['.-..', '..-..', '.-..-.', '..-.-..', '.-..-.', '..-..', '..-.'],
    colors: 5,
    goal: 80,
    h: [2, 5],
    p3: 0.15,
    p2: 0.5,
    bonusEvery: 4,
    seed: 1717,
    par: 34,
  },
  {
    name: 'Hourglass',
    cols: ['....', '.....', '-....-', '--...--', '-....-', '.....', '....'],
    locks: {},
    colors: 5,
    goal: 90,
    h: [2, 6],
    p3: 0.2,
    p2: 0.55,
    bonusEvery: 5,
    seed: 1818,
    par: 37,
  },
  {
    name: 'Snow Drift',
    hint: 'a sixth colour: snow',
    cols: FULL,
    colors: 6,
    goal: 80,
    h: [2, 5],
    p3: 0.1,
    p2: 0.5,
    bonusEvery: 4,
    seed: 1919,
    par: 39,
  },
  {
    name: 'Maelstrom',
    hint: 'boss: the outer ring is sealed twice over',
    cols: ['2222', '2.1.2', '21..12', '2.....2', '21..12', '2.1.2', '2222'],
    locks: { 1: 15, 2: 60 },
    colors: 6,
    goal: 150,
    h: [2, 6],
    p3: 0.2,
    p2: 0.55,
    bonusEvery: 5,
    seed: 2020,
    par: 50,
  },
  // ── 21–25: buried treasure ──────────────────────────
  {
    name: 'Buried Treasure',
    hint: 'preset piles hide bonus colours',
    cols: ['....', '.a..b', '......', '..c.d..', '......', 'e..f.', '....'],
    stacks: { a: 'OOOOORRR', b: 'OOOOOBBB', c: 'GGGGGYY', d: 'GGGGGPP', e: 'KKKKKRR', f: 'KKKKKYY' },
    colors: 6,
    goal: 100,
    h: [2, 5],
    p3: 0.15,
    p2: 0.5,
    bonusEvery: 4,
    seed: 2121,
    par: 30,
  },
  {
    name: 'Pink Tide',
    cols: ['-..-', '.....', '......', '.......', '......', '.....', '-..-'],
    colors: 7,
    goal: 90,
    h: [2, 5],
    p3: 0.1,
    p2: 0.45,
    bonusEvery: 4,
    seed: 2222,
    par: 38,
  },
  {
    name: 'Crossroads',
    cols: ['-..-', '--.--', '......', '.......', '......', '--.--', '-..-'],
    colors: 6,
    goal: 90,
    h: [2, 5],
    p3: 0.15,
    p2: 0.5,
    bonusEvery: 4,
    seed: 2323,
    par: 42,
  },
  {
    name: 'Quiet Reef',
    hint: 'breather: big board, gentle offers',
    cols: FULL,
    colors: 6,
    goal: 80,
    h: [2, 4],
    p3: 0,
    p2: 0.35,
    bonusEvery: 3,
    seed: 2424,
    par: 41,
  },
  {
    name: 'Kraken',
    hint: 'boss: a towering kraken guards the core',
    cols: ['1111', '1...1', '1.ab.1', '1.cde.1', '1.fg.1', '1...1', '1111'],
    stacks: { a: 'RRRRBBB', b: 'BBBBGGG', c: 'GGGGRRR', d: 'PPPPPOOOO', e: 'OOOOPPP', f: 'YYYYKKK', g: 'KKKKYYY' },
    locks: { 1: 40 },
    colors: 7,
    goal: 200,
    h: [2, 6],
    p3: 0.25,
    p2: 0.6,
    bonusEvery: 5,
    seed: 2525,
    par: 50,
  },
  // ── 26–30: masters' tides ───────────────────────────
  {
    name: 'Lantern Cove',
    cols: ['....', '..-..', '..--..', '.-...-.', '..--..', '..-..', '....'],
    colors: 6,
    goal: 100,
    h: [2, 6],
    p3: 0.2,
    p2: 0.55,
    bonusEvery: 4,
    seed: 2626,
    par: 38,
  },
  {
    name: 'Rainbow Shelf',
    hint: 'all seven colours',
    cols: FULL,
    colors: 7,
    goal: 110,
    h: [2, 6],
    p3: 0.2,
    p2: 0.55,
    bonusEvery: 4,
    seed: 2727,
    par: 42,
  },
  {
    name: 'Sunken Steps',
    cols: ['3333', '22222', '1.11.1', '.......', '1.11.1', '22222', '3333'],
    locks: { 1: 10, 2: 35, 3: 70 },
    colors: 7,
    goal: 130,
    h: [2, 6],
    p3: 0.2,
    p2: 0.55,
    bonusEvery: 4,
    seed: 2828,
    par: 49,
  },
  {
    name: 'Calm Before',
    hint: 'breather before the final storm',
    cols: FULL,
    colors: 6,
    goal: 90,
    h: [2, 5],
    p3: 0.1,
    p2: 0.45,
    bonusEvery: 3,
    seed: 2929,
    par: 37,
  },
  {
    name: 'Leviathan',
    hint: 'boss: eight colours, sealed rings, buried piles',
    cols: ['2222', '2a..2', '1....1', '1..b..1', '1....1', '2..c2', '2222'],
    stacks: { a: 'WWWWWRRR', b: 'WWWWWBBBB', c: 'WWWWYYY' },
    locks: { 1: 30, 2: 90 },
    colors: 8,
    goal: 210,
    h: [2, 6],
    p3: 0.2,
    p2: 0.55,
    bonusEvery: 4,
    seed: 3030,
    par: 62,
  },
]

export const AUTHORED = LEVELS.length

function offerOf(l: HexLevel): OfferSpec {
  return { colors: l.colors, hMin: l.h?.[0] ?? 2, hMax: l.h?.[1] ?? 5, p3: l.p3 ?? 0.15, p2: l.p2 ?? 0.5, bonusEvery: l.bonusEvery ?? 5 }
}

const NAMES = ['Deep Current', 'Glass Shoals', 'Tidal Loom', 'Moon Pool', 'Azure Fold', 'Pearl Bank', 'Drift Line', 'Salt Mirror']

/** Endless levels past the authored set: seeded boards whose difficulty grows with n. */
function generated(n: number): HexLevel {
  const g: Rng = { s: n * 7919 + 13 }
  const k = n - AUTHORED
  const colors = Math.min(MAX_COLORS, 6 + Math.floor(k / 6))
  const cols = FULL.map((c) => c.split(''))
  // a few holes (never more than 6) and a sealed outer ring every other level
  const holes = Math.min(6, 2 + Math.floor(k / 5))
  for (let i = 0; i < holes; i++) {
    const q = Math.floor(rnd(g) * 7)
    const r = Math.floor(rnd(g) * COL_LEN[q])
    cols[q][r] = '-'
  }
  const sealed = k % 2 === 1
  if (sealed) {
    for (let q = 0; q < 7; q++) {
      for (let r = 0; r < COL_LEN[q]; r++) {
        const edge = q === 0 || q === 6 || r === 0 || r === COL_LEN[q] - 1
        if (edge && cols[q][r] === '.') cols[q][r] = '1'
      }
    }
  }
  const goal = Math.min(220, 100 + k * 4)
  return {
    name: NAMES[n % NAMES.length],
    cols: cols.map((c) => c.join('')),
    locks: sealed ? { 1: 30 + Math.min(40, k) } : {},
    colors,
    goal,
    h: [2, 6],
    p3: Math.min(0.3, 0.15 + k * 0.005),
    p2: 0.55,
    bonusEvery: 4,
    seed: n * 101,
    par: Math.round(goal / 2.1),
  }
}

export function levelSpec(n: number): HexLevelSpec {
  const authored = n <= AUTHORED
  const l = authored ? LEVELS[n - 1] : generated(n)
  return { ...l, n, boss: n % 5 === 0, offer: offerOf(l), authored }
}

/** Parse a stack string into colour indices. */
export function parseStack(s: string) {
  return s.split('').map((ch) => Math.max(0, COLOR_KEYS.indexOf(ch)))
}

/**
 * Lay a level out on fresh cells. `extra` opens that many void hexes next to the board
 * (the More Space upgrade) — extra room never breaks a verified solution.
 */
export function setupLevel(cells: HexCell[], spec: HexLevelSpec, extra = 0) {
  let i = 0
  for (let q = 0; q < 7; q++) {
    const col = spec.cols[q] ?? ''
    for (let r = 0; r < COL_LEN[q]; r++) {
      const ch = col[r] ?? '-'
      const c = cells[i++]
      c.stack = []
      c.lock = 0
      c.open = false
      if (ch === '.') c.open = true
      else if (ch >= '1' && ch <= '9') c.lock = Math.max(1, spec.locks?.[ch] ?? 20)
      else if (ch >= 'a' && ch <= 'z') {
        c.open = true
        c.stack = parseStack(spec.stacks?.[ch] ?? '')
      }
    }
  }
  for (let k = 0; k < extra; k++) {
    const cand = cells.find((c) => !c.open && !c.lock && c.nb.some((j) => cells[j].open))
    if (!cand) break
    cand.open = true
  }
}
