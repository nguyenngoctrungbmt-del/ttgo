/**
 * Dungeon Dash floors. Each floor is a level: a hand-placed sequence of rooms (layout + monster
 * waves) ending in a guardian room; every 5th floor's guardian is a boss.
 * Room layouts are the 7×11 interior: '.' floor · 'P' pillar · 'C' crate.
 * Waves: s slime · S big slime · b bat · a archer · k knight · K Slime King · L Bone Lord ·
 * N Black Knight (e.g. 's3 b2'); rooms may hold several waves separated by '|'.
 * Every authored floor was cleared by the dev autopilot (scratch lv7-sweep).
 */
import type { MonKind } from './art'

export type RoomDef = [layout: keyof typeof ROOMS, waves: string, chest?: 1]
export type DungeonLevel = { name: string; hint?: string; theme: number; hp: number; rooms: RoomDef[] }
export type DungeonLevelSpec = DungeonLevel & { n: number; boss: boolean; authored: boolean }

export const ROOMS = {
  open: ['.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......', '.......'],
  pillars4: ['.......', '.......', '.P...P.', '.......', '.......', '.......', '.......', '.P...P.', '.......', '.......', '.......'],
  centre: ['.......', '.......', '.......', '.......', '..P.P..', '.......', '..P.P..', '.......', '.......', '.......', '.......'],
  hall: ['.......', '.P...P.', '.......', '.P...P.', '.......', '.P...P.', '.......', '.P...P.', '.......', '.......', '.......'],
  cross: ['.......', '.......', '..P.P..', '.......', '.......', 'PP...PP', '.......', '.......', '..P.P..', '.......', '.......'],
  crates: ['.......', 'CC.....', '.......', '....CCC', '.......', '.......', 'CCC....', '.......', '.....CC', '.......', '.......'],
  ring: ['.......', '.......', '.CC.CC.', '.C...C.', '.C...C.', '.C...C.', '.CC.CC.', '.......', '.......', '.......', '.......'],
  gallery: ['.......', '.......', 'P.P.P.P', '.......', '.......', '.P.P.P.', '.......', '.......', 'P.P.P.P', '.......', '.......'],
  split: ['.......', '.......', '.......', 'PPP.PPP', '.......', '.......', '.......', 'PP...PP', '.......', '.......', '.......'],
  pockets: ['.......', '.C...C.', 'CC...CC', '.......', '.......', '...P...', '.......', '.......', 'CC...CC', '.C...C.', '.......'],
  crypt: ['.......', 'P.....P', '.......', '..C.C..', '.......', 'P.....P', '.......', '..C.C..', '.......', 'P.....P', '.......'],
  zigzag: ['.......', '.......', 'CCCC...', '.......', '.......', '...CCCC', '.......', '.......', 'CCCC...', '.......', '.......'],
  columns: ['.......', '.......', '.P.P.P.', '.......', '.P...P.', '.......', '.P.P.P.', '.......', '.......', '.......', '.......'],
  arena: ['.......', '.P...P.', '.......', '.......', '.......', '.......', '.......', '.......', '.......', '.P...P.', '.......'],
  throne: ['.......', '.......', '.P...P.', '.......', '.......', '.......', '.......', '.......', '.P...P.', '.......', '.......'],
} satisfies Record<string, string[]>

export const LEVELS: DungeonLevel[] = [
  // ── Stone Halls: learn to fight ────────────────
  { name: 'The Gate', hint: 'drag to move — your sword swings by itself', theme: 0, hp: 1, rooms: [['open', 's3'], ['pillars4', 's4', 1], ['hall', 's3|s3']] },
  { name: 'Bat Belfry', hint: 'bats swoop in fast — roll through them', theme: 0, hp: 1.1, rooms: [['open', 's3 b1'], ['pillars4', 'b3', 1], ['centre', 's3 b2'], ['cross', 's3|b3']] },
  { name: 'Archer Gallery', hint: 'archers aim a red line before they shoot', theme: 0, hp: 1.1, rooms: [['gallery', 's3 a1'], ['crates', 'a1 b2', 1], ['hall', 's3 a1'], ['columns', 'a2 s2|b2']] },
  { name: 'Knight Watch', hint: 'knights wind up a heavy swing — dodge, then strike', theme: 0, hp: 1.15, rooms: [['open', 'k1 s2'], ['pillars4', 'a1 b2', 1], ['split', 'k1 s2'], ['cross', 'k1 b2|a1 s3']] },
  { name: 'Slime King', hint: 'boss: the Slime King leaps — watch the shadow', theme: 0, hp: 1.35, rooms: [['centre', 's4 b2'], ['crates', 'a2 k1', 1], ['hall', 's3 b2 a1'], ['arena', 'K']] },
  // ── Mossy Depths: big slimes & swarms ──────────
  { name: 'Mossy Steps', hint: 'big slimes split the room — keep moving', theme: 1, hp: 1.5, rooms: [['open', 'S1 s2'], ['pockets', 'b4', 1], ['ring', 'S1 a1 s2'], ['cross', 'S2|b3 s2']] },
  { name: 'Root Cellar', theme: 1, hp: 1.6, rooms: [['crates', 's4 b2'], ['zigzag', 'a2 S1', 1], ['columns', 'k1 b3'], ['gallery', 'S1 a2|k1 s3']] },
  { name: 'Swarm Den', hint: 'bat swarms — spin and wave perks shine here', theme: 1, hp: 1.6, rooms: [['open', 'b5'], ['hall', 's4 b3', 1], ['pillars4', 'b4 a1'], ['arena', 'b4|b4 s2']] },
  { name: 'Quiet Grotto', hint: 'breather: catch your breath', theme: 1, hp: 1.5, rooms: [['open', 's4'], ['centre', 'b3 s2', 1], ['throne', 'S1 s3']] },
  { name: 'Bone Lord', hint: 'boss: the Bone Lord hurls cursed orbs', theme: 1, hp: 1.8, rooms: [['crypt', 's4 a2'], ['ring', 'S1 b3', 1], ['split', 'k1 a2 b2'], ['throne', 'L|b3']] },
  // ── Ember Forge: knights & archers ─────────────
  { name: 'Forge Gate', theme: 2, hp: 2, rooms: [['open', 'k2 s2'], ['crates', 'a3 b2', 1], ['hall', 'k1 S1 a1'], ['columns', 'k2 a1|a2 b3']] },
  { name: 'Arrow Alley', hint: 'archer crossfire — use pillars as cover', theme: 2, hp: 2.1, rooms: [['gallery', 'a3 s2'], ['split', 'a3 b2', 1], ['pillars4', 'a2 k1 s2'], ['hall', 'a4|k1 a2']] },
  { name: 'Anvil Hall', theme: 2, hp: 2.2, rooms: [['cross', 'k2 b2'], ['zigzag', 'S2 a1', 1], ['ring', 'k2 a2'], ['open', 's4 b3'], ['arena', 'k2 S1|a3 b2']] },
  { name: 'Cooling Pools', hint: 'breather: gentle foes, a chest early', theme: 2, hp: 2, rooms: [['open', 's4 b2', 1], ['centre', 'S1 a1'], ['throne', 'k1 s3']] },
  { name: 'Black Knight', hint: 'boss: the Black Knight charges in a line', theme: 2, hp: 2.4, rooms: [['crates', 'k2 a2'], ['hall', 'S2 b3', 1], ['columns', 'a3 k1 s2'], ['split', 'k2 b3'], ['arena', 'N|a2']] },
  // ── Bone Crypt: everything at once ─────────────
  { name: 'Crypt Door', theme: 3, hp: 2.6, rooms: [['crypt', 's5 b2'], ['pockets', 'a3 k1', 1], ['gallery', 'S2 b3'], ['open', 'k2 a2'], ['cross', 'S1 k1 a2|b4']] },
  { name: 'Ossuary', theme: 3, hp: 2.7, rooms: [['columns', 'b5 a1'], ['zigzag', 'k2 s3', 1], ['ring', 'a3 S1'], ['crates', 'k2 b3'], ['throne', 'k2 a2|S2 b2']] },
  { name: 'Hall of Echoes', hint: 'long rooms, many waves', theme: 3, hp: 2.7, rooms: [['hall', 's4|b4'], ['split', 'a3|k2', 1], ['gallery', 'S2|a2 b3'], ['arena', 'k2 a2|S1 b3 s2']] },
  { name: 'Candle Rest', hint: 'breather: a quiet chapel', theme: 3, hp: 2.5, rooms: [['open', 's5', 1], ['centre', 'b4 a1'], ['throne', 'S2 s2']] },
  { name: 'Twin Thrones', hint: 'boss: the Slime King returns with the Bone Lord', theme: 3, hp: 2.9, rooms: [['crypt', 'k2 a2 b2'], ['pockets', 'S2 a2', 1], ['columns', 'k3 b2'], ['split', 'a4 s3'], ['arena', 'K|L']] },
  // ── Deep Halls: elite squads ───────────────────
  { name: 'Deep Halls', theme: 0, hp: 3.1, rooms: [['hall', 'k3 a2'], ['crates', 'S2 b4', 1], ['gallery', 'a4 k1'], ['open', 'k2 S1 b3'], ['cross', 'k3 a2|b5']] },
  { name: 'Pillar Maze', hint: 'tight lanes — roll carefully', theme: 0, hp: 3.2, rooms: [['pockets', 'k2 b3'], ['zigzag', 'a4 s3', 1], ['cross', 'S2 k2'], ['columns', 'a3 b4'], ['split', 'k3 a3|S2']] },
  { name: 'Iron Guard', hint: 'knight squads march in formation', theme: 2, hp: 3.3, rooms: [['open', 'k4'], ['hall', 'k2 a3', 1], ['ring', 'k3 b3'], ['gallery', 'S2 k2'], ['arena', 'k3 a2|k3']] },
  { name: 'Lantern Walk', hint: 'breather: lighter rooms', theme: 1, hp: 3, rooms: [['open', 's5 b2', 1], ['centre', 'a2 S1'], ['throne', 'k2 s3']] },
  { name: 'Knight Commander', hint: 'boss: the Black Knight leads a knight guard', theme: 2, hp: 3.4, rooms: [['crates', 'k3 a2'], ['hall', 'S2 b4', 1], ['split', 'a4 k2'], ['columns', 'k3 b3'], ['arena', 'N k2|k2 a2']] },
  // ── The Abyss: the final descent ───────────────
  { name: 'Abyss Rim', theme: 3, hp: 3.6, rooms: [['crypt', 'k3 a3'], ['pockets', 'S3 b3', 1], ['gallery', 'a5 k1'], ['cross', 'k3 S1 b3'], ['throne', 'k3 a3|S2 b4']] },
  { name: 'Ember Abyss', theme: 2, hp: 3.7, rooms: [['zigzag', 'k3 b4'], ['ring', 'a4 S2', 1], ['hall', 'k4 a2'], ['open', 'S3 b4'], ['arena', 'k3 a3|k2 S2']] },
  { name: 'Moss Abyss', theme: 1, hp: 3.8, rooms: [['columns', 'S3 a2'], ['split', 'k3 b4', 1], ['crates', 'a5 s4'], ['gallery', 'k4 b3'], ['cross', 'S3 k2|a4 b4']] },
  { name: 'Last Sanctuary', hint: 'breather before the bottom', theme: 0, hp: 3.5, rooms: [['open', 's6 b3', 1], ['centre', 'a3 k1'], ['throne', 'S2 k2']] },
  { name: 'The Bottom', hint: 'final boss: all three guardians, one after another', theme: 3, hp: 3.9, rooms: [['crypt', 'k3 a3 b2'], ['hall', 'S3 b4', 1], ['split', 'a4 k3'], ['columns', 'k3 S2', 1], ['arena', 'K|L|N']] },
]

export const AUTHORED = LEVELS.length

const KIND: Record<string, MonKind> = { s: 'slime', S: 'bigslime', b: 'bat', a: 'archer', k: 'knight', K: 'kingslime', L: 'bonelord', N: 'blackknight' }

export function parseWaves(s: string): MonKind[][] {
  return s.split('|').map((w) => {
    const out: MonKind[] = []
    for (const tok of w.trim().split(/\s+/)) {
      const k = KIND[tok[0]]
      if (!k) continue
      const n = tok.length > 1 ? Number(tok.slice(1)) : 1
      for (let i = 0; i < n; i++) out.push(k)
    }
    return out
  })
}

/** Room interior → full 9×13 solid map (walls added around). */
export function roomSolid(key: keyof typeof ROOMS, cols: number, rows: number): Uint8Array {
  const solid = new Uint8Array(cols * rows)
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) if (i === 0 || j === 0 || i === cols - 1 || j === rows - 1) solid[j * cols + i] = 1
  const map = ROOMS[key]
  for (let j = 0; j < map.length; j++) for (let i = 0; i < map[j].length; i++) {
    const ch = map[j][i]
    if (ch === 'P') solid[(j + 1) * cols + i + 1] = 2
    else if (ch === 'C') solid[(j + 1) * cols + i + 1] = 3
  }
  return solid
}

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const NAMES = ['Sunken Vault', 'Hollow Keep', 'Ashen Stair', 'Gloom Cellar', 'Rune Hall', 'Shadow Well']
const KEYS = Object.keys(ROOMS) as (keyof typeof ROOMS)[]

/** Endless floors past the authored set: seeded rooms, a boss every 5th floor. */
function generated(n: number): DungeonLevel {
  const r = seeded(n * 6007 + 11)
  const k = n - AUTHORED
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]
  const squads = ['k3 a3', 'S3 b4', 'a5 k2', 'k4 b3', 'S2 k2 a2', 'b6 a2', 'k3 S2']
  const rooms: RoomDef[] = []
  for (let i = 0; i < 4; i++) rooms.push([pick(KEYS.filter((x) => x !== 'arena' && x !== 'throne')), `${pick(squads)}${i % 2 ? `|${pick(squads)}` : ''}`, i === 1 ? 1 : undefined] as RoomDef)
  const boss = n % 5 === 0
  rooms.push(['arena', boss ? pick(['K|N', 'L|K', 'N|L', 'K|L|N']) : `${pick(squads)}|${pick(squads)}`])
  return { name: NAMES[n % NAMES.length], theme: n % 4, hp: 3.9 * Math.pow(1.04, k), rooms }
}

export function levelSpec(n: number): DungeonLevelSpec {
  const authored = n <= AUTHORED
  const l = authored ? LEVELS[n - 1] : generated(n)
  return { ...l, n, boss: n % 5 === 0, authored }
}
