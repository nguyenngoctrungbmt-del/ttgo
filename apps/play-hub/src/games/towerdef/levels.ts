/**
 * Tower Rush levels: one map + an authored wave set each. Clearing the final wave clears the level.
 * Waves are written as tokens: g grunt · r runner · t tank · f flyer · h healer · B Ogre King,
 * e.g. 'g6 r3' = six grunts then three runners. `hp` scales enemy health for the level
 * (each later wave adds +9%); `gold`/`lives` are the starting purse and gate strength.
 * Every authored level was cleared by the scripted autopilot (scratch lv7-td-verify).
 */
import type { EnemyKind, TowerKind } from './art'
import type { MapDef } from './maps'

export type TdLevel = {
  map: MapDef
  hint?: string
  waves: string[]
  hp: number
  gold: number
  lives: number
  allow?: TowerKind[]
}

export type TdLevelSpec = TdLevel & { n: number; boss: boolean; authored: boolean; queue: EnemyKind[][] }

const AC: TowerKind[] = ['arrow', 'cannon']
const ACF: TowerKind[] = ['arrow', 'cannon', 'frost']

export const LEVELS: TdLevel[] = [
  // ── 1–5: the basics ────────────────────────────
  {
    map: { name: 'Green Vale', theme: 0, pts: [[-1, 1], [7, 1], [7, 4], [1, 4], [1, 7], [7, 7], [7, 10], [4, 10], [4, 13]] },
    hint: 'tap a stone pad and build Arrow towers',
    waves: ['g5', 'g7', 'g9', 'g6 g6'],
    hp: 0.8,
    gold: 150,
    lives: 20,
    allow: ['arrow'],
  },
  {
    map: { name: 'Meadow Bend', theme: 0, pts: [[4, -1], [4, 4], [1, 4], [1, 9], [6, 9], [6, 13]] },
    hint: 'cannons splash whole clumps',
    waves: ['g6', 'g10', 'g8 g6', 'g14', 'g10 g8'],
    hp: 0.9,
    gold: 160,
    lives: 20,
    allow: AC,
  },
  {
    map: { name: 'Long Road', theme: 0, pts: [[-1, 2], [7, 2], [7, 5], [1, 5], [1, 8], [7, 8], [7, 11], [-1, 11]] },
    hint: 'runners are fast — frost slows them down',
    waves: ['g8', 'r6', 'g6 r6', 'g10 r4', 'r12', 'g10 r10'],
    hp: 1,
    gold: 170,
    lives: 20,
    allow: ACF,
  },
  {
    map: { name: 'Twin Turns', theme: 0, pts: [[2, -1], [2, 4], [6, 4], [6, 8], [2, 8], [2, 13]] },
    hint: 'tanks are armored — cannons crack them; tesla chains through crowds',
    waves: ['g10', 't2 g6', 'r8 g6', 't3 r6', 'g12 t3', 'r10 t4'],
    hp: 1.05,
    gold: 200,
    lives: 20,
  },
  {
    map: { name: 'Ogre Ford', theme: 0, pts: [[-1, 6], [3, 6], [3, 2], [6, 2], [6, 10], [4, 10], [4, 13]] },
    hint: 'boss: the Ogre King storms a short road',
    waves: ['g10', 'r8 g6', 't3 g8', 'g12 r8', 't4 r8', 'g8 B h2'],
    hp: 1.1,
    gold: 260,
    lives: 20,
  },
  // ── 6–10: flyers & scarce pads ─────────────────
  {
    map: { name: 'Red Canyon', theme: 1, pts: [[1, -1], [1, 3], [7, 3], [7, 6], [4, 6], [4, 9], [1, 9], [1, 11], [7, 11], [7, 13]] },
    hint: 'flyers skip the path — and cannons cannot hit them',
    waves: ['g12', 'f4', 'g8 f4', 'r10 f4', 't4 g8', 'f8 r6', 'g10 t3 f6'],
    hp: 1.25,
    gold: 240,
    lives: 20,
  },
  {
    map: { name: 'Mesa Switchback', theme: 1, pts: [[9, 2], [1, 2], [1, 5], [7, 5], [7, 8], [1, 8], [1, 12], [9, 12]] },
    waves: ['g14', 'r12', 't4 g8', 'f8', 'g10 r10', 't5 f5', 'r14 t4'],
    hp: 1.2,
    gold: 250,
    lives: 20,
  },
  {
    map: { name: 'Sandstone Gate', theme: 1, pts: [[4, -1], [4, 2], [7, 2], [7, 10], [2, 10], [2, 13]], maxPads: 6 },
    hint: 'only six pads — upgrade instead of spreading out',
    waves: ['g12', 'r10 g4', 't4 g6', 'f6 g8', 'r12 t3', 'g14 f6'],
    hp: 1.35,
    gold: 280,
    lives: 20,
  },
  {
    map: { name: 'Dry River', theme: 1, pts: [[-1, 1], [7, 1], [7, 3], [1, 3], [1, 5], [7, 5], [7, 7], [1, 7], [1, 9], [7, 9], [7, 11], [-1, 11]] },
    hint: 'breather: the longest road in the realm',
    waves: ['g14', 'r14', 'g10 t4', 'f10', 'g16 r10', 't6 f6'],
    hp: 1.1,
    gold: 260,
    lives: 20,
  },
  {
    map: { name: 'Canyon King', theme: 1, pts: [[9, 6], [5, 6], [5, 1], [2, 1], [2, 11], [6, 11], [6, 13]] },
    hint: 'boss: the Ogre King returns with flyers overhead',
    waves: ['g14', 'r12 f4', 't5 g8', 'f8 r6', 'g12 t5', 'r12 f4', 'g8 B h3 f3'],
    hp: 1.15,
    gold: 460,
    lives: 20,
  },
  // ── 11–15: healers & restricted kits ───────────
  {
    map: { name: 'Frost Pass', theme: 2, pts: [[-1, 11], [2, 11], [2, 1], [5, 1], [5, 9], [7, 9], [7, 5], [9, 5]] },
    hint: 'healers mend the horde — focus them down',
    waves: ['g14', 'h3 g8', 'r12 h2', 't5 h3', 'f8 h3', 'g14 t4 h4', 'r14 f6 h3'],
    hp: 1.6,
    gold: 320,
    lives: 20,
  },
  {
    map: { name: 'Glacier Walk', theme: 2, pts: [[1, -1], [1, 10], [4, 10], [4, 2], [7, 2], [7, 13]] },
    waves: ['g16', 'r14', 't6 h2', 'f10 g6', 'g12 r12', 't6 f6 h3', 'r16 t5'],
    hp: 1.7,
    gold: 340,
    lives: 20,
  },
  {
    map: { name: 'Ice Shelf', theme: 2, pts: [[-1, 4], [3, 4], [3, 1], [7, 1], [7, 7], [2, 7], [2, 10], [9, 10]] },
    hint: 'no cannons here: arrows, frost and tesla only',
    waves: ['g16', 'r16', 't5 g8', 'f10 h3', 'g14 t5', 'r18 f6', 't6 h4 g10'],
    hp: 1.7,
    gold: 360,
    lives: 20,
    allow: ['arrow', 'frost', 'tesla'],
  },
  {
    map: { name: 'Snowfield', theme: 2, pts: [[-1, 1], [7, 1], [7, 4], [1, 4], [1, 7], [7, 7], [7, 10], [1, 10], [1, 13]] },
    hint: 'breather: a winding road and a full purse',
    waves: ['g16', 'r16', 't6 g8', 'f12', 'g16 r12', 't6 f8'],
    hp: 1.6,
    gold: 360,
    lives: 20,
  },
  {
    map: { name: 'Yeti Lair', theme: 2, pts: [[4, -1], [4, 5], [1, 5], [1, 8], [7, 8], [7, 13]] },
    hint: 'boss: a short pass, an angry king',
    waves: ['g16', 'r14 h2', 't6 g8', 'f12 r8', 'g16 t6 h3', 'r18 f8', 'g12 B h4 t3'],
    hp: 1.85,
    gold: 480,
    lives: 20,
  },
  // ── 16–20: tight purses ────────────────────────
  {
    map: { name: 'Verdant Loop', theme: 0, pts: [[-1, 10], [2, 10], [2, 2], [6, 2], [6, 10], [9, 10]] },
    hint: 'a thin purse — spend every coin wisely',
    waves: ['g14', 'r16', 't6 g10', 'f12 h3', 'g18 r12', 't7 f8 h3', 'r20 t6'],
    hp: 1.8,
    gold: 330,
    lives: 20,
  },
  {
    map: { name: 'Hill Fort', theme: 0, pts: [[9, 1], [2, 1], [2, 5], [6, 5], [6, 9], [2, 9], [2, 13]] },
    waves: ['g18', 'r16 h2', 't7 g8', 'f12 r8', 'g18 t6', 'r20 f8 h4', 't8 g14'],
    hp: 2.05,
    gold: 340,
    lives: 20,
  },
  {
    map: { name: 'Marsh Maze', theme: 0, pts: [[0, -1], [0, 3], [4, 3], [4, 6], [8, 6], [8, 10], [3, 10], [3, 13]], maxPads: 5 },
    hint: 'five pads only — make each tower count',
    waves: ['g16', 'r16', 't6 g8', 'f10 h3', 'g16 r12', 't7 f8'],
    hp: 2,
    gold: 440,
    lives: 20,
  },
  {
    map: { name: 'Orchard Path', theme: 0, pts: [[-1, 2], [6, 2], [6, 6], [2, 6], [2, 10], [9, 10]] },
    hint: 'breather: rest your gate',
    waves: ['g18', 'r18', 't6 g10', 'f12 h3', 'g18 r14'],
    hp: 1.8,
    gold: 420,
    lives: 20,
  },
  {
    map: { name: 'Warlord Ridge', theme: 1, pts: [[4, -1], [4, 7], [1, 7], [1, 13]] },
    hint: 'boss: almost no road — build fast and freeze it',
    waves: ['g16', 'r16 h3', 't7 g10', 'f14 r8', 'g18 t7 h4', 'r22 f10', 'g14 B h5 t4'],
    hp: 2.2,
    gold: 600,
    lives: 25,
  },
  // ── 21–25: armored swarms ──────────────────────
  {
    map: { name: 'Ember Steps', theme: 1, pts: [[-1, 1], [2, 1], [2, 4], [5, 4], [5, 7], [8, 7], [8, 13]] },
    waves: ['g20', 't8', 'r20 h3', 'f14 t4', 'g18 t8 h4', 'r22 f10', 't10 g16 h4'],
    hp: 2.35,
    gold: 560,
    lives: 20,
  },
  {
    map: { name: 'Lava Flow', theme: 1, pts: [[9, 3], [3, 3], [3, 6], [6, 6], [6, 9], [1, 9], [1, 13]] },
    waves: ['g20', 'r20 h3', 't8 g10', 'f16 r8', 'g20 t8 h4', 'r24 f12', 't10 h5 g14'],
    hp: 2.45,
    gold: 580,
    lives: 20,
  },
  {
    map: { name: 'Ashen Coil', theme: 1, pts: [[1, -1], [1, 2], [7, 2], [7, 6], [3, 6], [3, 10], [7, 10], [7, 13]] },
    hint: 'frost and tesla only — chain the swarm',
    waves: ['g20', 'r22', 't8 g10', 'f16 h3', 'g22 t6', 'r24 f10 h4'],
    hp: 2.35,
    gold: 620,
    lives: 20,
    allow: ['frost', 'tesla'],
  },
  {
    map: { name: 'Cinder Road', theme: 1, pts: [[9, 1], [1, 1], [1, 4], [7, 4], [7, 7], [1, 7], [1, 10], [7, 10], [7, 13]] },
    hint: 'breather: long road, big purse',
    waves: ['g20', 'r20', 't8 g12', 'f16 h3', 'g22 r16'],
    hp: 2.2,
    gold: 620,
    lives: 20,
  },
  {
    map: { name: 'Dragon Gate', theme: 1, pts: [[-1, 6], [4, 6], [4, 13]] },
    hint: 'boss: the shortest road of all',
    waves: ['g18', 'r18 h3', 't8 g10', 'f14 r10', 'g20 t8 h4', 'r24 f12', 'g16 B h6 t6'],
    hp: 2.5,
    gold: 820,
    lives: 25,
  },
  // ── 26–30: the frozen north ────────────────────
  {
    map: { name: 'Frozen Fang', theme: 2, pts: [[2, -1], [2, 3], [6, 3], [6, 6], [2, 6], [2, 9], [6, 9], [6, 13]] },
    waves: ['g22', 'r22 h3', 't9 g12', 'f18 r8', 'g24 t8 h5', 'r26 f12', 't12 h6 g16'],
    hp: 2.7,
    gold: 660,
    lives: 20,
  },
  {
    map: { name: 'Aurora Way', theme: 2, pts: [[7, -1], [7, 9], [4, 9], [4, 3], [1, 3], [1, 13]] },
    waves: ['g22', 'r20 h3', 't9 g10', 'f14 r8', 'g22 t8 h4', 'r18 f8', 't10 h5 g14'],
    hp: 2.6,
    gold: 800,
    lives: 20,
  },
  {
    map: { name: 'Crystal Cross', theme: 2, pts: [[-1, 3], [6, 3], [6, 9], [3, 9], [3, 13]], maxPads: 7 },
    hint: 'seven pads and every enemy type',
    waves: ['g22', 'r22 h3', 't9 g12', 'f16 h4', 'g24 t9', 'r26 f12 h5'],
    hp: 2.7,
    gold: 720,
    lives: 20,
  },
  {
    map: { name: 'Thaw', theme: 2, pts: [[1, -1], [1, 10], [3, 10], [3, 2], [5, 2], [5, 10], [7, 10], [7, 13]] },
    hint: 'breather before the last stand',
    waves: ['g24', 'r24', 't10 g12', 'f18 h4', 'g26 r18'],
    hp: 2.5,
    gold: 680,
    lives: 20,
  },
  {
    map: { name: 'Ogre Citadel', theme: 2, pts: [[-1, 2], [4, 2], [4, 6], [1, 6], [1, 10], [7, 10], [7, 13]] },
    hint: 'final boss: two Ogre Kings',
    waves: ['g24', 'r24 h4', 't10 g12', 'f18 r10', 'g26 t10 h5', 'r30 f14', 'g18 B t6 h6 B'],
    hp: 2.9,
    gold: 920,
    lives: 25,
  },
]

export const AUTHORED = LEVELS.length

const KIND: Record<string, EnemyKind> = { g: 'grunt', r: 'runner', t: 'tank', f: 'flyer', h: 'healer', B: 'boss' }

export function parseWave(s: string): EnemyKind[] {
  const out: EnemyKind[] = []
  for (const tok of s.trim().split(/\s+/)) {
    const k = KIND[tok[0]]
    if (!k) continue
    const n = tok.length > 1 ? Number(tok.slice(1)) : 1
    for (let i = 0; i < n; i++) out.push(k)
  }
  return out
}

/** Endless levels: authored maps cycle with generated wave sets that keep growing. */
function generated(n: number): TdLevel {
  const k = n - AUTHORED
  const src = LEVELS[(n * 7) % AUTHORED]
  const boss = n % 5 === 0
  const c = 22 + k
  const waves = [`g${c}`, `r${c} h4`, `t${10 + (k >> 1)} g${c >> 1}`, `f${18 + (k >> 1)} r10`, `g${c} t${10 + (k >> 1)} h5`, `r${c + 6} f14`]
  waves.push(boss ? `g${c - 6} B h6 t6` : `t${12 + (k >> 1)} h6 g${c - 4}`)
  return {
    map: { ...src.map, name: `${src.map.name} ${toRoman(2 + Math.floor(k / AUTHORED))}`, maxPads: undefined },
    waves,
    hp: 2.9 * Math.pow(1.04, k),
    gold: boss ? 940 + k * 15 : 700 + k * 15,
    lives: 20,
  }
}

function toRoman(n: number) {
  return ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][Math.min(10, n)] ?? 'X'
}

export function levelSpec(n: number): TdLevelSpec {
  const authored = n <= AUTHORED
  const l = authored ? LEVELS[n - 1] : generated(n)
  return { ...l, n, boss: n % 5 === 0, authored, queue: l.waves.map(parseWave) }
}
