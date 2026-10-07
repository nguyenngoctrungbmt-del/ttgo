// Star Squadron authored stages: 20 hand-made formations, challenging stages and a mothership boss every 5th.
import type { Kind } from './art'

export type Entry = 'top' | 'side' | 'loop' | 'swoop'
export type BossAttack = 'burst' | 'spawn' | 'laser' | 'ring' | 'mines'

export type BossDef = {
  name: string
  hp: number
  hull: string
  glow: string
  /** Movement style. */
  move: 'sway' | 'figure8' | 'dash'
  attacks: BossAttack[]
  /** Seconds between attacks (shrinks a little as the boss is hurt). */
  every: number
  size: number
}

export type StageDef = {
  name: string
  sub: string
  type: 'normal' | 'challenge' | 'boss'
  /** Formation rows (top → bottom), 10 columns: B boss, F butterfly, b bee, w wasp, d drone, . empty. */
  grid: string[]
  entries: Entry[]
  /** Dive pressure multiplier (1 = default curve). */
  aggr: number
  /** Tractor beams allowed. */
  beam: boolean
  palette: number
  /** Challenging stages: which flyby path set and alien kinds per group. */
  chKinds?: Kind[]
  boss?: BossDef
}

const KIND: Record<string, Kind> = { B: 'boss', F: 'butterfly', b: 'bee', w: 'wasp', d: 'drone' }

export function gridSlots(grid: string[]) {
  const out: { kind: Kind; col: number; row: number }[] = []
  grid.forEach((line, row) => {
    for (let col = 0; col < Math.min(10, line.length); col++) {
      const k = KIND[line[col]]
      if (k) out.push({ kind: k, col, row })
    }
  })
  return out
}

export const BOSSES: Record<string, BossDef> = {
  queen: { name: 'HIVE QUEEN', hp: 50, hull: '#a21caf', glow: '#f0abfc', move: 'sway', attacks: ['burst', 'spawn', 'burst'], every: 2.4, size: 1 },
  saucer: { name: 'DREAD SAUCER', hp: 70, hull: '#0e7490', glow: '#67e8f9', move: 'figure8', attacks: ['laser', 'burst', 'ring'], every: 2.3, size: 1.1 },
  hive: { name: 'IRON HIVE', hp: 70, hull: '#57534e', glow: '#fb923c', move: 'dash', attacks: ['mines', 'spawn', 'ring', 'burst'], every: 2.3, size: 1.15 },
  emperor: { name: 'STAR EMPEROR', hp: 90, hull: '#b45309', glow: '#fde047', move: 'figure8', attacks: ['laser', 'ring', 'spawn', 'mines', 'burst'], every: 2.1, size: 1.25 },
}

// Curve: teach 1–4, boss 5, breather 6, new alien type every few stages, challenging stage on 3/8/13/18.
export const STAGES: StageDef[] = [
  { name: 'First Contact', sub: 'drag to move · auto-fire', type: 'normal', grid: ['...BBBB...', '..FFFFFF..', '..bbbbbb..', '...bbbb...'], entries: ['top', 'side'], aggr: 0.7, beam: false, palette: 0 },
  { name: 'Tractor Beam', sub: 'boss aliens can capture you — shoot them to free your twin', type: 'normal', grid: ['...BBBB...', '.FFFFFFFF.', '.bbbbbbbb.', 'bbbbbbbbbb'], entries: ['top', 'side', 'top'], aggr: 0.85, beam: true, palette: 0 },
  { name: 'Bonus Run', sub: 'challenging stage · shoot all 40', type: 'challenge', grid: [], entries: [], aggr: 1, beam: false, palette: 2, chKinds: ['bee', 'butterfly', 'bee', 'butterfly', 'boss'] },
  { name: 'Wasp Nest', sub: 'new: wasps fire three-way spreads', type: 'normal', grid: ['...BBBB...', '.FFFFFFFF.', 'wbwbwbwbwb', 'bwbwbwbwbw'], entries: ['side', 'loop', 'top'], aggr: 0.95, beam: true, palette: 1 },
  { name: 'Hive Queen', sub: 'BOSS · dodge her bursts, shoot down her drones', type: 'boss', grid: ['..FF..FF..', '.bbbbbbbb.'], entries: ['top', 'side'], aggr: 0.8, beam: false, palette: 3, boss: BOSSES.queen },
  { name: 'Butterfly Garden', sub: 'a breather — chain your hits', type: 'normal', grid: ['..FFFFFF..', '.FFFFFFFF.', '..bbbbbb..'], entries: ['swoop', 'swoop'], aggr: 0.75, beam: false, palette: 4 },
  { name: 'Armored', sub: 'new: drones take two hits', type: 'normal', grid: ['...BBBB...', '..dFdFdF..', '..FdFdFd..', '.bbbbbbbb.'], entries: ['top', 'loop', 'side', 'top'], aggr: 0.9, beam: true, palette: 2 },
  { name: 'Spiral Dance', sub: 'challenging stage · loops and swirls', type: 'challenge', grid: [], entries: [], aggr: 1, beam: false, palette: 5, chKinds: ['wasp', 'butterfly', 'drone', 'bee', 'boss'] },
  { name: 'Pincer', sub: 'they come from both flanks', type: 'normal', grid: ['B.B....B.B', 'FFF....FFF', 'wwww..wwww', 'bbbbbbbbbb'], entries: ['side', 'side', 'swoop'], aggr: 1.05, beam: true, palette: 1 },
  { name: 'Dread Saucer', sub: 'BOSS · red line = laser incoming, move!', type: 'boss', grid: ['.w.w..w.w.', 'bbbbbbbbbb'], entries: ['loop', 'top'], aggr: 0.85, beam: false, palette: 2, boss: BOSSES.saucer },
  { name: 'Calm Orbit', sub: 'a breather — grab the capsules', type: 'normal', grid: ['...BBBB...', '..FFFFFF..', '..bbbbbb..'], entries: ['top', 'swoop'], aggr: 0.8, beam: true, palette: 0 },
  { name: 'Diamond', sub: 'a diamond of steel', type: 'normal', grid: ['....BB....', '...dFFd...', '..wFFFFw..', '.bbbbbbbb.', '..bbbbbb..'], entries: ['loop', 'top', 'side'], aggr: 1.1, beam: true, palette: 4 },
  { name: 'Meteor Lane', sub: 'challenging stage · faster flybys', type: 'challenge', grid: [], entries: [], aggr: 1, beam: false, palette: 3, chKinds: ['drone', 'wasp', 'boss', 'butterfly', 'wasp'] },
  { name: 'Wall of Wasps', sub: 'spread shots everywhere — keep moving', type: 'normal', grid: ['...BBBB...', 'wwwwwwwwww', 'wwwwwwwwww', '.bbbbbbbb.'], entries: ['top', 'side', 'loop'], aggr: 1.15, beam: true, palette: 5 },
  { name: 'Iron Hive', sub: 'BOSS · mines burst into shrapnel', type: 'boss', grid: ['.d.d..d.d.', '.bbbbbbbb.'], entries: ['side', 'swoop'], aggr: 0.9, beam: false, palette: 5, boss: BOSSES.hive },
  { name: 'Starfield', sub: 'a breather among the stars', type: 'normal', grid: ['..B....B..', '.FF.FF.FF.', 'bb.bb.bb.b'], entries: ['swoop', 'top'], aggr: 0.85, beam: true, palette: 0 },
  { name: 'Checkerboard', sub: 'drones and wasps interlocked', type: 'normal', grid: ['.B.B.B.B..', 'd.d.d.d.d.', '.w.w.w.w.w', 'bbbbbbbbbb', 'bbbbbbbbbb'], entries: ['loop', 'side', 'top', 'swoop'], aggr: 1.2, beam: true, palette: 1 },
  { name: 'Gauntlet', sub: 'challenging stage · the fastest flybys', type: 'challenge', grid: [], entries: [], aggr: 1, beam: false, palette: 2, chKinds: ['boss', 'drone', 'wasp', 'drone', 'boss'] },
  { name: 'Full Armada', sub: 'everything they have left', type: 'normal', grid: ['..BBBBBB..', '.dFFFFFFd.', '.wFFFFFFw.', '.bbwbbwbb.'], entries: ['top', 'side', 'loop', 'swoop'], aggr: 1, beam: true, palette: 3 },
  { name: 'Star Emperor', sub: 'GRAND BOSS · lasers, rings, mines and drones', type: 'boss', grid: ['.d.F..F.d.', 'wbwbwbwbwb'], entries: ['loop', 'side'], aggr: 0.9, beam: false, palette: 3, boss: BOSSES.emperor },
]

export const AUTHORED = STAGES.length

/** A boss for generated stages past the authored set (scaled HP, capped). */
export function generatedBoss(stage: number): BossDef {
  const list = [BOSSES.queen, BOSSES.saucer, BOSSES.hive, BOSSES.emperor]
  const b = list[Math.floor(stage / 5) % list.length]
  return { ...b, hp: Math.round(b.hp * Math.min(1.8, 1 + (stage - AUTHORED) * 0.03)) }
}
