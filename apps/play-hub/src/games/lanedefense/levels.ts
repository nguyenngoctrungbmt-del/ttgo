import type { MonKind } from './art'

/*
 * Hand-designed Lane Defense levels: five waves each, written as monster groups with lane patterns.
 * Arc: 1–4 one new defender per level, 5 the first Giant · 6–9 hoppers and flank attacks · 10 Giant +
 * cones · 11–14 brutes and runner storms · 15 twin Giants · 16–19 mixed pressure · 20 Giant + brutes ·
 * 21–24 heavy lanes · 25 twin Giants · 26–29 everything · 30 three Giants. Every 5th level is a boss level.
 * Every level is cleared by a scripted autopilot (dev hook `__lv2auto`) without lightning or mowers.
 */

export type Spawn = { kind: MonKind; lane: number; at: number }
export type LevelDef = { n: number; name?: string; tip?: string; waves: Spawn[][]; boss: boolean }

const LANES = 5
type Pattern = 'sweep' | 'zig' | 'mid' | 'flanks' | 'left' | 'right' | 'inner' | number[]
/** [kind, count, lane pattern, start offset s] */
type Group = [MonKind, number, Pattern, number?]

const PATTERNS: Record<Exclude<Pattern, number[]>, number[]> = {
  sweep: [0, 1, 2, 3, 4],
  zig: [0, 2, 4, 1, 3],
  mid: [2],
  flanks: [0, 4],
  left: [0, 1],
  right: [3, 4],
  inner: [1, 3, 2],
}

/** A wave lasting `dur` seconds; each group's monsters are spread evenly over it. */
function wave(dur: number, ...groups: Group[]): Spawn[] {
  const out: Spawn[] = []
  groups.forEach(([kind, count, pat, off = 0], gi) => {
    const lanes = Array.isArray(pat) ? pat : PATTERNS[pat]
    for (let i = 0; i < count; i++) {
      const at = count === 1 ? off || dur * 0.4 : off + ((dur - off) * i) / count
      out.push({ kind, lane: lanes[(i + gi) % lanes.length] % LANES, at })
    }
  })
  return out.sort((a, b) => a.at - b.at)
}
const boss = (lane = 2, at = 5): Group => ['boss', 1, [lane], at]

type Authored = { name: string; tip?: string; waves: Spawn[][] }

export const AUTHORED: Authored[] = [
  // 1–5
  { name: 'Front Lawn', tip: 'tap a card, then a tile', waves: [wave(12, ['blob', 2, 'mid']), wave(14, ['blob', 3, 'zig']), wave(16, ['blob', 4, 'sweep']), wave(16, ['blob', 5, 'zig']), wave(12, ['blob', 7, 'sweep'])] },
  { name: 'Rock Solid', tip: 'Rock Nut blocks the way', waves: [wave(14, ['blob', 4, 'zig']), wave(16, ['blob', 5, 'sweep']), wave(16, ['blob', 6, 'zig']), wave(16, ['blob', 7, 'sweep']), wave(12, ['blob', 10, 'sweep'])] },
  { name: 'Cone Heads', tip: 'Boom Berry blasts a 3×3 area', waves: [wave(16, ['blob', 5, 'sweep'], ['cone', 1, 'mid', 6]), wave(16, ['blob', 6, 'zig'], ['cone', 1, 'flanks', 4]), wave(16, ['blob', 6, 'sweep'], ['cone', 2, 'inner', 3]), wave(16, ['blob', 7, 'zig'], ['cone', 2, 'sweep', 2]), wave(12, ['blob', 9, 'sweep'], ['cone', 3, 'zig', 2])] },
  { name: 'Speed Trap', tip: 'Frost Pod slows monsters', waves: [wave(16, ['blob', 6, 'sweep'], ['runner', 1, 'mid', 8]), wave(16, ['blob', 5, 'zig'], ['runner', 2, 'flanks', 6], ['cone', 2, 'inner', 3]), wave(16, ['cone', 4, 'sweep'], ['runner', 3, 'zig', 4]), wave(16, ['blob', 8, 'sweep'], ['runner', 3, 'inner', 2], ['cone', 2, 'flanks', 5]), wave(12, ['blob', 8, 'zig'], ['cone', 4, 'sweep', 2], ['runner', 4, 'sweep', 4])] },
  { name: 'The Giant', tip: 'a Giant smashes anything in its way!', waves: [wave(16, ['blob', 6, 'sweep'], ['cone', 2, 'flanks', 4]), wave(16, ['cone', 4, 'zig'], ['runner', 3, 'sweep', 3]), wave(16, ['blob', 8, 'sweep'], ['cone', 3, 'inner', 2]), wave(16, ['cone', 5, 'sweep'], ['runner', 4, 'zig', 4]), wave(14, ['blob', 6, 'sweep'], ['cone', 3, 'flanks', 3], boss(2, 4))] },
  // 6–10
  { name: 'Calm Morning', waves: [wave(16, ['blob', 6, 'zig']), wave(16, ['blob', 6, 'sweep'], ['cone', 2, 'mid', 4]), wave(16, ['cone', 4, 'sweep']), wave(16, ['blob', 8, 'zig'], ['runner', 3, 'flanks', 4]), wave(12, ['blob', 8, 'sweep'], ['cone', 5, 'zig', 2])] },
  { name: 'Flank Attack', tip: 'watch the outside lanes', waves: [wave(16, ['blob', 6, 'flanks'], ['cone', 2, 'flanks', 5]), wave(16, ['cone', 4, 'flanks'], ['runner', 2, 'flanks', 6]), wave(16, ['blob', 8, 'sweep'], ['cone', 4, 'flanks', 3]), wave(16, ['cone', 6, 'flanks'], ['runner', 4, 'inner', 4]), wave(12, ['blob', 8, 'flanks'], ['cone', 6, 'sweep', 2], ['runner', 3, 'flanks', 5])] },
  { name: 'Hop Along', tip: 'hoppers jump over the first defender', waves: [wave(16, ['blob', 6, 'sweep'], ['hopper', 1, 'mid', 6]), wave(16, ['cone', 4, 'zig'], ['hopper', 2, 'flanks', 5]), wave(16, ['blob', 6, 'sweep'], ['hopper', 3, 'inner', 3], ['cone', 2, 'flanks', 6]), wave(16, ['cone', 5, 'sweep'], ['hopper', 4, 'zig', 3]), wave(12, ['blob', 8, 'sweep'], ['cone', 4, 'zig', 2], ['hopper', 5, 'sweep', 3])] },
  { name: 'Center Rush', tip: 'the middle lane is under siege', waves: [wave(16, ['blob', 6, 'mid'], ['cone', 2, 'mid', 6]), wave(16, ['cone', 4, [1, 2, 3]], ['runner', 3, 'mid', 5]), wave(16, ['blob', 6, 'sweep'], ['cone', 4, 'mid', 3], ['hopper', 2, [1, 3], 6]), wave(16, ['cone', 6, [1, 2, 3]], ['runner', 4, 'mid', 3]), wave(12, ['blob', 8, 'sweep'], ['cone', 6, [1, 2, 3], 2], ['hopper', 3, 'mid', 4])] },
  { name: 'Giant Returns', waves: [wave(16, ['blob', 6, 'sweep'], ['cone', 4, 'zig', 3]), wave(16, ['cone', 5, 'sweep'], ['hopper', 3, 'flanks', 4]), wave(16, ['blob', 8, 'zig'], ['runner', 4, 'sweep', 3], ['cone', 3, 'inner', 5]), wave(16, ['cone', 6, 'sweep'], ['hopper', 4, 'zig', 3]), wave(14, ['cone', 6, 'sweep'], ['runner', 4, 'flanks', 3], boss(1, 4))] },
  // 11–15
  { name: 'Sunny Break', waves: [wave(16, ['blob', 8, 'sweep']), wave(16, ['cone', 4, 'zig'], ['runner', 2, 'mid', 6]), wave(16, ['blob', 6, 'sweep'], ['hopper', 3, 'zig', 3]), wave(16, ['cone', 6, 'sweep']), wave(12, ['blob', 10, 'sweep'], ['cone', 4, 'zig', 3])] },
  { name: 'Brute Force', tip: 'brutes take a beating — stack your peas', waves: [wave(16, ['blob', 6, 'sweep'], ['brute', 1, 'mid', 6]), wave(16, ['cone', 4, 'zig'], ['brute', 2, 'flanks', 5]), wave(16, ['blob', 6, 'sweep'], ['cone', 3, 'inner', 3], ['brute', 2, [1, 3], 7]), wave(16, ['cone', 5, 'sweep'], ['hopper', 3, 'zig', 3], ['brute', 2, 'sweep', 6]), wave(12, ['blob', 8, 'sweep'], ['cone', 4, 'zig', 2], ['brute', 3, 'zig', 4])] },
  { name: 'Runner Storm', tip: 'fast and many — freeze them', waves: [wave(16, ['runner', 6, 'sweep']), wave(16, ['runner', 7, 'zig'], ['cone', 2, 'mid', 6]), wave(16, ['runner', 8, 'sweep'], ['hopper', 2, 'flanks', 4]), wave(16, ['runner', 8, 'zig'], ['cone', 4, 'sweep', 3]), wave(12, ['runner', 10, 'sweep'], ['cone', 5, 'zig', 2], ['brute', 1, 'mid', 6])] },
  { name: 'Zigzag March', waves: [wave(16, ['cone', 5, 'zig'], ['blob', 4, 'zig', 2]), wave(16, ['hopper', 4, 'zig'], ['cone', 3, 'zig', 3]), wave(16, ['cone', 6, 'zig'], ['brute', 2, 'zig', 6]), wave(16, ['runner', 6, 'zig'], ['hopper', 4, 'zig', 3], ['cone', 3, 'zig', 5]), wave(12, ['cone', 7, 'zig'], ['brute', 3, 'zig', 3], ['runner', 5, 'zig', 4])] },
  { name: 'Twin Giants', tip: 'two Giants at once!', waves: [wave(16, ['cone', 5, 'sweep'], ['runner', 3, 'zig', 4]), wave(16, ['cone', 5, 'zig'], ['hopper', 4, 'sweep', 3]), wave(16, ['blob', 8, 'sweep'], ['brute', 2, 'flanks', 5], ['cone', 3, 'inner', 3]), wave(16, ['cone', 6, 'sweep'], ['hopper', 4, 'zig', 3], ['runner', 3, 'flanks', 6]), wave(16, ['cone', 6, 'sweep'], ['runner', 4, 'zig', 3], boss(1, 4), boss(3, 9))] },
  // 16–20
  { name: 'Garden Party', waves: [wave(16, ['blob', 8, 'sweep'], ['cone', 3, 'zig', 3]), wave(16, ['cone', 5, 'sweep'], ['runner', 3, 'zig', 4]), wave(16, ['hopper', 5, 'sweep'], ['cone', 3, 'inner', 3]), wave(16, ['cone', 6, 'zig'], ['brute', 2, 'flanks', 6]), wave(12, ['blob', 10, 'sweep'], ['cone', 5, 'zig', 2], ['hopper', 3, 'inner', 4])] },
  { name: 'Hop Scotch', waves: [wave(16, ['hopper', 6, 'sweep']), wave(16, ['hopper', 6, 'zig'], ['cone', 3, 'mid', 4]), wave(16, ['hopper', 7, 'sweep'], ['brute', 2, [1, 3], 5]), wave(16, ['hopper', 7, 'zig'], ['runner', 4, 'sweep', 3]), wave(12, ['hopper', 9, 'sweep'], ['cone', 5, 'zig', 2], ['brute', 2, 'flanks', 5])] },
  { name: 'Heavy Hitters', waves: [wave(16, ['brute', 2, 'flanks'], ['blob', 6, 'sweep', 2]), wave(16, ['brute', 3, 'zig'], ['cone', 4, 'sweep', 2]), wave(16, ['brute', 3, 'inner'], ['hopper', 4, 'zig', 3]), wave(16, ['brute', 4, 'sweep'], ['runner', 4, 'zig', 3]), wave(12, ['brute', 4, 'zig'], ['cone', 6, 'sweep', 2], ['runner', 4, 'flanks', 4])] },
  { name: 'Night Shift', waves: [wave(16, ['cone', 6, 'sweep'], ['runner', 4, 'zig', 3]), wave(16, ['cone', 6, 'zig'], ['hopper', 4, 'sweep', 3]), wave(16, ['brute', 3, 'sweep'], ['cone', 4, 'zig', 3], ['runner', 3, 'flanks', 5]), wave(16, ['cone', 7, 'sweep'], ['hopper', 5, 'zig', 3]), wave(12, ['cone', 8, 'sweep'], ['brute', 3, 'zig', 3], ['runner', 5, 'sweep', 4])] },
  { name: 'Giant & Brutes', waves: [wave(16, ['cone', 6, 'sweep'], ['brute', 2, 'flanks', 5]), wave(16, ['hopper', 6, 'zig'], ['cone', 4, 'sweep', 3]), wave(16, ['brute', 3, 'zig'], ['runner', 5, 'sweep', 3]), wave(16, ['cone', 7, 'sweep'], ['hopper', 4, 'zig', 3], ['brute', 2, [1, 3], 6]), wave(16, ['cone', 6, 'sweep'], ['brute', 3, 'zig', 3], boss(2, 5))] },
  // 21–25
  { name: 'Quiet Before', waves: [wave(16, ['blob', 10, 'sweep']), wave(16, ['cone', 6, 'zig']), wave(16, ['hopper', 5, 'sweep'], ['runner', 4, 'zig', 3]), wave(16, ['cone', 7, 'sweep'], ['brute', 2, 'mid', 6]), wave(12, ['cone', 8, 'sweep'], ['hopper', 4, 'zig', 3])] },
  { name: 'Left Hook', waves: [wave(16, ['cone', 6, 'left'], ['blob', 4, 'right', 3]), wave(16, ['brute', 2, 'left'], ['runner', 5, [0, 1, 2], 2]), wave(16, ['hopper', 6, 'left'], ['cone', 4, 'right', 3]), wave(16, ['brute', 3, [0, 1, 2]], ['cone', 5, 'sweep', 2]), wave(12, ['cone', 7, 'left'], ['brute', 3, 'sweep', 3], ['runner', 5, 'right', 4])] },
  { name: 'Right Cross', waves: [wave(16, ['cone', 6, 'right'], ['blob', 4, 'left', 3]), wave(16, ['brute', 2, 'right'], ['runner', 5, [2, 3, 4], 2]), wave(16, ['hopper', 6, 'right'], ['cone', 4, 'left', 3]), wave(16, ['brute', 3, [2, 3, 4]], ['cone', 5, 'sweep', 2]), wave(12, ['cone', 7, 'right'], ['brute', 3, 'sweep', 3], ['runner', 5, 'left', 4])] },
  { name: 'Stampede', waves: [wave(14, ['runner', 8, 'sweep'], ['hopper', 3, 'zig', 3]), wave(14, ['runner', 8, 'zig'], ['cone', 4, 'sweep', 2]), wave(14, ['hopper', 7, 'sweep'], ['brute', 2, 'flanks', 4]), wave(14, ['runner', 9, 'sweep'], ['cone', 5, 'zig', 2], ['brute', 2, [1, 3], 6]), wave(12, ['runner', 10, 'zig'], ['hopper', 6, 'sweep', 2], ['brute', 3, 'zig', 4])] },
  { name: 'Giant Duo', waves: [wave(16, ['cone', 7, 'sweep'], ['runner', 4, 'zig', 3]), wave(16, ['brute', 3, 'zig'], ['hopper', 5, 'sweep', 3]), wave(16, ['cone', 7, 'zig'], ['brute', 3, 'inner', 4]), wave(16, ['hopper', 6, 'sweep'], ['runner', 5, 'zig', 3], ['cone', 4, 'flanks', 5]), wave(16, ['cone', 6, 'sweep'], ['brute', 2, 'flanks', 4], boss(1, 4), boss(3, 10))] },
  // 26–30
  { name: 'Second Wind', waves: [wave(16, ['blob', 10, 'sweep'], ['cone', 3, 'zig', 3]), wave(16, ['cone', 6, 'sweep'], ['runner', 4, 'zig', 3]), wave(16, ['hopper', 6, 'zig'], ['brute', 2, 'mid', 5]), wave(16, ['cone', 7, 'sweep'], ['runner', 5, 'flanks', 3]), wave(12, ['cone', 8, 'zig'], ['hopper', 5, 'sweep', 3], ['brute', 2, 'flanks', 5])] },
  { name: 'Siege', waves: [wave(16, ['brute', 3, 'sweep'], ['cone', 5, 'zig', 2]), wave(16, ['brute', 3, 'zig'], ['hopper', 5, 'sweep', 3]), wave(16, ['brute', 4, 'sweep'], ['runner', 5, 'zig', 3]), wave(16, ['brute', 4, 'zig'], ['cone', 6, 'sweep', 2]), wave(12, ['brute', 5, 'sweep'], ['cone', 6, 'zig', 2], ['hopper', 4, 'flanks', 4])] },
  { name: 'Chaos Garden', waves: [wave(15, ['cone', 6, 'zig'], ['hopper', 4, 'sweep', 2], ['runner', 4, 'flanks', 4]), wave(15, ['brute', 3, 'sweep'], ['runner', 6, 'zig', 2]), wave(15, ['hopper', 7, 'zig'], ['cone', 5, 'sweep', 2], ['brute', 2, 'mid', 6]), wave(15, ['cone', 8, 'sweep'], ['runner', 6, 'zig', 3], ['brute', 2, 'flanks', 5]), wave(12, ['cone', 8, 'zig'], ['hopper', 6, 'sweep', 2], ['brute', 3, 'zig', 4], ['runner', 5, 'sweep', 5])] },
  { name: 'Last Stand', waves: [wave(16, ['cone', 8, 'sweep'], ['brute', 2, 'flanks', 4]), wave(16, ['hopper', 7, 'sweep'], ['runner', 5, 'zig', 3]), wave(16, ['brute', 4, 'zig'], ['cone', 6, 'sweep', 2]), wave(16, ['cone', 8, 'zig'], ['hopper', 6, 'sweep', 3], ['brute', 3, 'inner', 5]), wave(12, ['cone', 9, 'sweep'], ['brute', 4, 'zig', 3], ['runner', 6, 'sweep', 4])] },
  { name: 'Giant King', tip: 'three Giants — hold the line!', waves: [wave(16, ['cone', 8, 'sweep'], ['runner', 5, 'zig', 3]), wave(16, ['brute', 3, 'sweep'], ['hopper', 6, 'zig', 3]), wave(16, ['cone', 8, 'zig'], ['brute', 3, 'inner', 4], ['runner', 4, 'flanks', 5]), wave(16, ['hopper', 7, 'sweep'], ['cone', 6, 'zig', 3], ['brute', 3, 'flanks', 5]), wave(18, ['cone', 7, 'sweep'], ['brute', 2, 'flanks', 4], boss(0, 4), boss(2, 9), boss(4, 14))] },
]

/** Share of each written wave that marches (early levels are thinned so the economy can grow). */
/** Tuned per level with the autopilot sweep. */
const DENSITY = [1, 0.31, 0.31, 0.32, 0.32, 0.32, 0.33, 0.31, 0.34, 0.28, 0.34, 0.35, 0.35, 0.28, 0.33, 0.28, 0.21, 0.35, 0.32, 0.33, 0.25, 0.28, 0.27, 0.2, 0.19, 0.22, 0.27, 0.13, 0.12, 0.12]

export function density(n: number) {
  return DENSITY[n - 1] ?? 1
}

export function authoredLevel(n: number): LevelDef {
  const a = AUTHORED[n - 1]
  const d = density(n)
  const thin = (w: Spawn[]) => w.filter((s, i) => s.kind === 'boss' || Math.floor((i + 1) * d) > Math.floor(i * d)).map((s) => ({ ...s }))
  return { n, name: a.name, tip: a.tip, waves: a.waves.map(thin), boss: n % 5 === 0 }
}
