/**
 * Tiny City levels: authored islands (terrain + building pool + score target).
 * Map rows (9×9): '-' sea · '.' grass · 'w' pond · 't' tree · 'r' rock.
 * The building deck is seeded per level, so every island plays out the same way; each
 * authored level was verified by a look-ahead bot (scratch lv7-city-verify) that reaches the
 * target, and `spare` (free tiles left at the target, for the third star) comes from that bot.
 */
import { MAX, canPlace, cityFromMap, dealFrom, preview, type BType } from './city'

export type CityLevel = {
  name: string
  hint?: string
  map: string[]
  pool: BType[]
  weights?: Partial<Record<BType, number>>
  target: number
  seed: number
  spare: number
}

export type CityLevelSpec = CityLevel & { n: number; boss: boolean; authored: boolean }

const HP: BType[] = ['house', 'park']
const T2: BType[] = ['house', 'park', 'shop', 'factory']
const T3: BType[] = ['house', 'park', 'shop', 'factory', 'fountain', 'school']
const T4: BType[] = ['house', 'park', 'shop', 'factory', 'fountain', 'school', 'windmill']
const T5: BType[] = ['house', 'park', 'shop', 'factory', 'fountain', 'school', 'windmill', 'tower']
const ALL: BType[] = ['house', 'park', 'shop', 'factory', 'fountain', 'school', 'windmill', 'tower', 'statue']

export const LEVELS: CityLevel[] = [
  // ── 1–5: houses & parks ─────────────────────────
  {
    name: 'First Street',
    hint: 'houses love parks and the pond',
    map: ['---------', '---------', '--.....--', '--.t.w.--', '--.....--', '--..t..--', '---------', '---------', '---------'],
    pool: HP,
    target: 21,
    seed: 11,
    spare: 6,
  },
  {
    name: 'Pond Row',
    hint: 'water next to a house is worth +2',
    map: ['---------', '---------', '-.......-', '-..www..-', '-.......-', '-.t...t.-', '---------', '---------', '---------'],
    pool: HP,
    target: 35,
    seed: 22,
    spare: 8,
  },
  {
    name: 'Orchard',
    hint: 'parks love trees — +2 each',
    map: ['---------', '--.....--', '--.t.t.--', '--.....--', '--.t.t.--', '--.....--', '--..w..--', '---------', '---------'],
    pool: HP,
    target: 46,
    seed: 33,
    spare: 8,
  },
  {
    name: 'Lagoon Ring',
    map: ['---------', '-.......-', '-.......-', '-..www..-', '-..www..-', '-..www..-', '-.......-', '-.......-', '---------'],
    pool: HP,
    target: 84,
    seed: 44,
    spare: 12,
  },
  {
    name: 'Crowded Cove',
    hint: 'boss: few tiles, big target',
    map: ['---------', '---------', '--..t..--', '-.......-', '-t.w.w.t-', '-.......-', '--..t..--', '---------', '---------'],
    pool: HP,
    target: 76,
    seed: 55,
    spare: 5,
  },
  // ── 6–10: shops and factories ───────────────────
  {
    name: 'Market Day',
    hint: 'shops need houses around them',
    map: ['---------', '--.....--', '-.......-', '-...w...-', '-.......-', '-.......-', '--.....--', '---------', '---------'],
    pool: ['house', 'park', 'shop'],
    target: 82,
    seed: 66,
    spare: 10,
  },
  {
    name: 'Quarry Hill',
    hint: 'factories love rocks and each other — keep them away from homes',
    map: ['---------', '-rr......', '-r.......', '-........', '-....w...', '-........', '-.....t..', '---------', '---------'],
    pool: T2,
    target: 98,
    seed: 77,
    spare: 12,
  },
  {
    name: 'Two Towns',
    hint: 'two islands — one for homes, one for industry',
    map: ['---------', '-....----', '-.w..----', '-....-r.r', '-.t..-...', '-....-r..', '-----r...', '---------', '---------'],
    pool: T2,
    target: 70,
    seed: 88,
    spare: 6,
  },
  {
    name: 'Sunny Meadow',
    hint: 'breather: wide open land',
    map: ['---------', '-.......-', '-.......-', '-..t....-', '-.......-', '-....w..-', '-.......-', '---------', '---------'],
    pool: T2,
    target: 92,
    seed: 99,
    spare: 11,
  },
  {
    name: 'Iron Bay',
    hint: 'boss: a rocky harbour with little room',
    map: ['---------', '-r..r..r-', '-.......-', '-..www..-', '-.......-', '-r.....r-', '--r...r--', '---------', '---------'],
    pool: T2,
    target: 112,
    seed: 110,
    spare: 3,
  },
  // ── 11–15: fountains and schools ────────────────
  {
    name: 'Fountain Square',
    hint: 'fountains score +2 for every building around them',
    map: ['---------', '--.....--', '-.......-', '-.......-', '-...t...-', '-.......-', '-.......-', '--.....--', '---------'],
    pool: ['house', 'park', 'shop', 'fountain'],
    target: 134,
    seed: 121,
    spare: 10,
  },
  {
    name: 'School Hill',
    hint: 'schools love houses within two tiles',
    map: ['---------', '-........', '-.t......', '-........', '-....w...', '-........', '-......t.', '-........', '---------'],
    pool: ['house', 'park', 'school', 'fountain'],
    target: 188,
    seed: 132,
    spare: 12,
  },
  {
    name: 'Canal Town',
    map: ['---------', '-...w...-', '-...w...-', '-...w...-', '-.wwwww.-', '-...w...-', '-...w...-', '-...w...-', '---------'],
    pool: T3,
    target: 120,
    seed: 143,
    spare: 8,
  },
  {
    name: 'Garden Isle',
    hint: 'breather: trees everywhere for parks',
    map: ['---------', '--t...t--', '-.......-', '-t..t..t-', '-.......-', '-t..t..t-', '-.......-', '--t...t--', '---------'],
    pool: T3,
    target: 106,
    seed: 154,
    spare: 8,
  },
  {
    name: 'Old Harbour',
    hint: 'boss: rocks to the north, water to the south',
    map: ['-rrr-----', '-r.....r-', '-.......-', '-.......-', '-.......-', '-...t...-', '-..www..-', '--wwwww--', '---------'],
    pool: T3,
    target: 151,
    seed: 165,
    spare: 4,
  },
  // ── 16–20: windmills ────────────────────────────
  {
    name: 'Windy Shore',
    hint: 'windmills love water and open space, not houses',
    map: ['---------', '-www.....', '-w.......', '-w.......', '-w...t...', '-w.......', '-w.......', '-www.....', '---------'],
    pool: ['house', 'park', 'windmill', 'fountain'],
    target: 143,
    seed: 176,
    spare: 10,
  },
  {
    name: 'Polder',
    map: ['---------', '-.w.w.w.-', '-.......-', '-w.....w-', '-.......-', '-w.....w-', '-.......-', '-.w.w.w.-', '---------'],
    pool: T4,
    target: 139,
    seed: 187,
    spare: 9,
  },
  {
    name: 'Crescent',
    hint: 'a moon-shaped island hugging a bay',
    map: ['---......', '--.......', '-...-----', '-..------', '-..------', '-...-----', '--.......', '---......', '---------'],
    pool: T4,
    target: 103,
    seed: 198,
    spare: 7,
  },
  {
    name: 'Mill Valley',
    hint: 'breather: plenty of water and room',
    map: ['---------', '-...w...-', '-.......-', '-w.....w-', '-.......-', '-.......-', '-...w...-', '-.......-', '---------'],
    pool: T4,
    target: 128,
    seed: 209,
    spare: 12,
  },
  {
    name: 'Stormy Point',
    hint: 'boss: jagged rocks and a tiny pond',
    map: ['---------', '-r..r..r-', '-.......-', '-..r.r..-', '-...w...-', '-..r.r..-', '-.......-', '-r..r..r-', '---------'],
    pool: T4,
    target: 141,
    seed: 220,
    spare: 5,
  },
  // ── 21–25: towers ───────────────────────────────
  {
    name: 'High Rise',
    hint: 'towers love houses and parks — but never another tower',
    map: ['---------', '-.......-', '-.......-', '-.......-', '-...w...-', '-.......-', '-.......-', '-.......-', '---------'],
    pool: ['house', 'park', 'tower', 'fountain', 'shop'],
    target: 184,
    seed: 231,
    spare: 9,
  },
  {
    name: 'Archipelago',
    hint: 'four little islands',
    map: ['---------', '-...-...-', '-.w.-.t.-', '-...-...-', '---------', '-...-...-', '-.t.-.w.-', '-...-...-', '---------'],
    pool: T5,
    target: 88,
    seed: 242,
    spare: 5,
  },
  {
    name: 'Riverside',
    map: ['---------', 'w........', '.w.......', '..w......', '...w.....', '....w....', '.....w...', '......w..', '---------'],
    pool: T5,
    target: 215,
    seed: 253,
    spare: 11,
  },
  {
    name: 'Green Belt',
    hint: 'breather: a park lover\'s paradise',
    map: ['---------', '-t.....t-', '-.......-', '-..t.t..-', '-...w...-', '-..t.t..-', '-.......-', '-t.....t-', '---------'],
    pool: T5,
    target: 123,
    seed: 264,
    spare: 9,
  },
  {
    name: 'Metropolis',
    hint: 'boss: the big city on a small rock',
    map: ['---------', '--.....--', '-.......-', '-..r.r..-', '-...w...-', '-..r.r..-', '-.......-', '--.....--', '---------'],
    pool: T5,
    target: 168,
    seed: 275,
    spare: 5,
  },
  // ── 26–30: statues and the grand finale ─────────
  {
    name: 'Sculpture Park',
    hint: 'statues score big alone — parks around them help',
    map: ['---------', '-.......-', '-.t...t.-', '-.......-', '-...w...-', '-.......-', '-.t...t.-', '-.......-', '---------'],
    pool: ['house', 'park', 'statue', 'fountain', 'tower'],
    target: 178,
    seed: 286,
    spare: 8,
  },
  {
    name: 'Volcano Isle',
    map: ['---------', '---...---', '--.....--', '-..rrr..-', '-..r.r..-', '-..rrr..-', '--.....--', '---...---', '---------'],
    pool: ALL,
    target: 120,
    seed: 297,
    spare: 3,
  },
  {
    name: 'Twin Lakes',
    map: ['---------', '-.......-', '-.ww....-', '-.ww....-', '-.......-', '-....ww.-', '-....ww.-', '-.......-', '---------'],
    pool: ALL,
    target: 168,
    seed: 308,
    spare: 6,
  },
  {
    name: 'Seaside Stroll',
    hint: 'breather before the capital',
    map: ['---------', '-.......-', '-.t...t.-', '-.......-', '-.......-', '-...w...-', '-.......-', '-.......-', '---------'],
    pool: ALL,
    target: 142,
    seed: 319,
    spare: 10,
  },
  {
    name: 'Grand Capital',
    hint: 'boss: the whole island, every building',
    map: ['r-------r', '-.......-', '-.......-', '-.......-', '-...w...-', '-.......-', '-.......-', '-.......-', 'r-------r'],
    pool: ALL,
    target: 231,
    seed: 330,
    spare: 5,
  },
]

export const AUTHORED = LEVELS.length

/** LCG used for the building deck (one number of state). */
export function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const NAMES = ['Coral Key', 'Pine Isle', 'Breeze Bay', 'Amber Atoll', 'Misty Reach', 'Lantern Rock', 'Gull Point', 'Sunset Shoal']

/** Endless islands past the authored set: seeded terrain, growing targets. */
function generated(n: number): CityLevel {
  const rnd = seeded(n * 9973 + 7)
  const rows: string[][] = []
  for (let y = 0; y < 9; y++) {
    const row: string[] = []
    for (let x = 0; x < 9; x++) {
      const edge = x === 0 || y === 0 || x === 8 || y === 8
      const r = rnd()
      row.push(edge ? (r < 0.12 && x > 0 && y > 0 && x < 8 && y < 8 ? '.' : '-') : r < 0.07 ? 't' : r < 0.12 ? 'r' : r < 0.16 ? 'w' : '.')
    }
    rows.push(row)
  }
  const k = n - AUTHORED
  const l: CityLevel = { name: NAMES[n % NAMES.length], map: rows.map((r) => r.join('')), pool: ALL, target: 0, seed: n * 131, spare: 3 }
  // Calibrate against a greedy builder so every generated island is reachable.
  const best = greedyBest(l)
  l.target = Math.max(40, Math.round(best * Math.min(0.9, 0.72 + k * 0.01)))
  return l
}

/** Final score of a builder that always takes the best spot for the next building. */
export function greedyBest(l: CityLevel) {
  const c = cityFromMap(l.map)
  const rnd = seeded(l.seed)
  let score = 0
  for (;;) {
    const b = dealFrom(l.pool, rnd, l.weights)
    let best: [number, number, number] | null = null
    for (let y = 0; y < MAX; y++) for (let x = 0; x < MAX; x++) {
      if (!canPlace(c, x, y)) continue
      const d = preview(c, x, y, b).delta
      if (!best || d > best[2]) best = [x, y, d]
    }
    if (!best) return score
    c.cells[best[1]][best[0]].b = b
    score += best[2]
  }
}

export function levelSpec(n: number): CityLevelSpec {
  const authored = n <= AUTHORED
  const l = authored ? LEVELS[n - 1] : generated(n)
  return { ...l, n, boss: n % 5 === 0, authored }
}
