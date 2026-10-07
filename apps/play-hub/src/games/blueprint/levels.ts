/**
 * Blueprint levels: 32 hand-designed plans with their own rules, then an endless
 * remix of the same plans with tighter clocks and a faster belt.
 * Every plan is checked by scratch script `lv3-bp-verify` (valid outline, palette,
 * life anchors, and a simulated player finishing with time to spare).
 */

export type Cell = [number, number]
export type LifeKind = 'smoke' | 'flag' | 'beam' | 'flame' | 'bob' | 'lights' | 'walker' | 'car' | 'birds'
export type Life = { k: LifeKind; x: number; y: number }
export type Plan = { name: string; rows: string[]; life: Life[] }

export type BpLevel = {
  n: number
  plan: Plan
  /** Pieces arrive rotated; tap to turn them. */
  rot: boolean
  /** Pieces carry a colour that must match the plan. */
  multi: boolean
  /** Seconds granted per cell (plus a flat base). */
  per: number
  /** Belt speed in px/s (before the Slow Belt upgrade). */
  speed: number
  /** Chance a belt piece is a decoy that fits nowhere useful. */
  decoy: number
  /** Pieces grow up to 5 cells. */
  big: boolean
  boss: boolean
  hint?: string
}

const P = (name: string, rows: string[], life: Life[] = []): Plan => ({ name, rows, life })

export const PLANS = {
  crate: P('Crate', ['BBB', 'BBB', 'BBB']),
  sign: P('Signpost', ['YYYY', 'YYYY', '.T..', '.T..'], [{ k: 'birds', x: 2, y: 0 }]),
  tent: P('Tent', ['...R...', '..RRR..', '.RRDRR.', 'RRRDRRR'], [{ k: 'flag', x: 3, y: 0 }]),
  hut: P('Hut', ['..RR..', '.RRRR.', 'RRRRRR', '.BBDB.', '.BWDB.'], [{ k: 'lights', x: 0, y: 0 }]),
  house: P('House', ['...RR.C.', '..RRRRC.', '.RRRRRR.', 'RRRRRRRR', '.BWBBWB.', '.BBBDBB.', '.BWBDBB.'], [
    { k: 'smoke', x: 6, y: 0 },
    { k: 'lights', x: 0, y: 0 },
    { k: 'walker', x: 4, y: 7 },
  ]),
  mushroom: P('Mushroom', ['.RRRR.', 'RRLRRR', 'RRRRLR', '..LL..', '..LL..'], [{ k: 'birds', x: 3, y: 0 }]),
  tree: P('Apple Tree', ['..GGG..', '.GGYGG.', 'GGGGGYG', 'GYGGGGG', '.GGGGG.', '...T...', '...T...', '..TTT..'], [{ k: 'birds', x: 3, y: 0 }]),
  snowman: P('Snowman', ['..TT..', '.TTTT.', '..LL..', '.LLLL.', 'LLLLLL', 'LLLLLL', '.LLLL.'], [{ k: 'birds', x: 2, y: 0 }]),
  sailboat: P('Sailboat', ['....M....', '...LML...', '..LLMLL..', '.LLLMLLL.', '....M....', 'HHHHHHHHH', '.HHWHWHH.', '..HHHHH..'], [
    { k: 'bob', x: 0, y: 0 },
    { k: 'flag', x: 4, y: 0 },
  ]),
  castle: P('Castle', ['S.S....S.S', 'SSS.SS.SSS', 'SWSSSSSSWS', 'SSSSWWSSSS', 'SSSSDDSSSS', 'SSSSDDSSSS'], [
    { k: 'flag', x: 1, y: 0 },
    { k: 'flag', x: 8, y: 0 },
    { k: 'flag', x: 4.5, y: 1 },
    { k: 'lights', x: 0, y: 0 },
    { k: 'walker', x: 5, y: 6 },
  ]),
  flower: P('Flower', ['.Y.Y.', 'YYYYY', '.YYY.', '..G..', 'G.G.G', '.GGG.', '..G..'], [{ k: 'birds', x: 2, y: 0 }]),
  rocket: P('Rocket', ['..RR..', '.RMMR.', '.MWWM.', '.MWWM.', '.MMMM.', 'RMMMMR', 'RMMMMR', 'R.YY.R'], [{ k: 'flame', x: 3, y: 8 }]),
  windmill: P('Windmill', ['L.....L', '.L...L.', '..LRL..', '..RBR..', '.BBWBB.', '.BBBBB.', '.BBDBB.', 'SSSSSSS'], [
    { k: 'smoke', x: 3, y: 2 },
    { k: 'lights', x: 0, y: 0 },
  ]),
  lighthouse: P('Lighthouse', ['.RRR.', '.WWW.', 'MMMMM', '.RRR.', '.LLL.', '.RRR.', '.LLL.', '.RRR.', 'SSSSS'], [{ k: 'beam', x: 2.5, y: 1.5 }]),
  steamship: P('Steamship', ['..C...C...', '..C...C...', '.MMMMMMMM.', '.MWMWMWMM.', 'HHHHHHHHHH', '.HHHHHHHH.', '..HHHHHH..'], [
    { k: 'smoke', x: 2, y: 0 },
    { k: 'smoke', x: 6, y: 0 },
    { k: 'bob', x: 0, y: 0 },
    { k: 'lights', x: 0, y: 0 },
  ]),
  heart: P('Heart', ['.RR.RR.', 'RLRRRRR', 'RRRRRRR', 'RRRRRRR', '.RRRRR.', '..RRR..', '...R...'], [{ k: 'birds', x: 3, y: 0 }]),
  bridge: P('Bridge', ['S........S', 'SS......SS', 'MMMMMMMMMM', 'S.M.MM.M.S', 'S........S'], [
    { k: 'car', x: 0, y: 2 },
    { k: 'flag', x: 0, y: 0 },
    { k: 'flag', x: 9, y: 0 },
  ]),
  tower: P('Tower Block', ['..MM..', '.BWWB.', '.BWWB.', '.BWWB.', '.BWWB.', '.BWWB.', '.BWWB.', 'BBDDBB'], [
    { k: 'lights', x: 0, y: 0 },
    { k: 'flag', x: 2.5, y: 0 },
    { k: 'walker', x: 3, y: 8 },
  ]),
  cactus: P('Cactus', ['..G...', '..GG.G', 'G.GG.G', 'GGGGGG', '..GG..', '.HHHH.', '..HH..'], [{ k: 'birds', x: 3, y: 0 }]),
  car: P('Roadster', ['..RRRR...', '.RWWRWR..', 'RRRRRRRRR', 'RRRRRRRRR', '.MM...MM.'], [{ k: 'lights', x: 0, y: 0 }]),
  palace: P('Palace', ['Y...YY...Y', 'R..RRRR..R', 'S.SSSSSS.S', 'SSWSSSSWSS', 'SSSSWWSSSS', 'SWSSDDSSWS', 'SSSSDDSSSS'], [
    { k: 'flag', x: 0, y: 0 },
    { k: 'flag', x: 9, y: 0 },
    { k: 'lights', x: 0, y: 0 },
    { k: 'walker', x: 5, y: 7 },
    { k: 'birds', x: 5, y: 0 },
  ]),
  robot: P('Robot', ['..YY..', '.MMMM.', '.WMMW.', '.MRRM.', 'MMMMMM', 'M.MM.M', '..MM..', '.M..M.'], [{ k: 'lights', x: 0, y: 0 }]),
  pagoda: P('Pagoda', ['....Y....', '..RRRRR..', 'RRRRRRRRR', '..BWBWB..', '.RRRRRRR.', 'RRRRRRRRR', '..BWDWB..', '.SSSSSSS.'], [
    { k: 'lights', x: 0, y: 0 },
    { k: 'birds', x: 4, y: 0 },
    { k: 'flag', x: 4, y: 0 },
  ]),
  balloon: P('Balloon', ['..RRRR..', '.RRYYRR.', 'RRYYYYRR', 'RRRYYRRR', '.RRRRRR.', '..RRRR..', '...TT...', '...HH...'], [
    { k: 'flame', x: 3.5, y: 6 },
    { k: 'birds', x: 6, y: 1 },
  ]),
  clocktower: P('Clock Tower', ['....YY....', '...SSSS...', '...SWWS...', '...SSSS...', 'S..SWWS..S', 'SSSSSSSSSS', 'SWSSWWSSWS', 'SSSSDDSSSS', 'SSSSDDSSSS'], [
    { k: 'flag', x: 4.5, y: 0 },
    { k: 'lights', x: 0, y: 0 },
    { k: 'walker', x: 5, y: 9 },
    { k: 'birds', x: 5, y: 1 },
  ]),
  pyramid: P('Pyramid', ['.....Y.....', '....HHH....', '...HHHHH...', '..HHHHHHH..', '.HHHHHHHHH.', 'HHHHHDHHHHH'], [{ k: 'birds', x: 5, y: 0 }]),
  train: P('Steam Train', ['.CC........', '.CC...MMMM.', 'RRRRRRMWWM.', 'RRRRRRMMMM.', 'RRRRRRRRRRR', '.SS.SS..SS.'], [
    { k: 'smoke', x: 1.5, y: 0 },
    { k: 'lights', x: 0, y: 0 },
  ]),
  owl: P('Owl', ['H......H', 'HHHHHHHH', 'HWWHHWWH', 'HWWHHWWH', 'HHHYYHHH', 'HHHHHHHH', '.HHLLHH.', '..HHHH..', '..Y..Y..'], [{ k: 'lights', x: 0, y: 0 }]),
  station: P('Space Station', ['....R....', 'LLL.M.LLL', 'LLLMMMLLL', 'LLLMWMLLL', 'LLLMMMLLL', 'LLL.M.LLL', '....M....'], [
    { k: 'lights', x: 0, y: 0 },
    { k: 'flame', x: 4, y: 7 },
  ]),
  grand: P('Grand Palace', ['Y....Y....Y', 'R...RRR...R', 'S..SSSSS..S', 'S.SSSSSSS.S', 'SSSWSSSWSSS', 'SWSSWSWSSWS', 'SSSSSDSSSSS', 'SWSSSDSSSWS'], [
    { k: 'flag', x: 0, y: 0 },
    { k: 'flag', x: 10, y: 0 },
    { k: 'flag', x: 5, y: 0 },
    { k: 'lights', x: 0, y: 0 },
    { k: 'walker', x: 5, y: 8 },
    { k: 'birds', x: 5, y: 0 },
  ]),
  submarine: P('Submarine', ['....M.....', '...YYY....', '.YYYYYYYY.', 'YYWYYWYYWY', 'YYYYYYYYYY', '.YYYYYYYY.'], [
    { k: 'bob', x: 0, y: 0 },
    { k: 'lights', x: 0, y: 0 },
  ]),
  skyline: P('Skyline', ['..M.......', '.BB....SS.', '.BB.M..SS.', '.BBMMM.SS.', 'MBBMWMSSSM', 'MWBMMMSWSM', 'MBBMWMSSSM', 'MBBMMMSWSM'], [
    { k: 'lights', x: 0, y: 0 },
    { k: 'birds', x: 6, y: 0 },
  ]),
}

type Spec = Omit<BpLevel, 'n' | 'boss' | 'big'> & { big?: boolean }

const L = (plan: Plan, rot: boolean, multi: boolean, per: number, speed: number, decoy: number, hint?: string, big = false): Spec => ({ plan, rot, multi, per, speed, decoy, hint, big })

/**
 * Arc: 1–5 drag & drop basics · 6–10 rotation · 11–15 colour matching · 16–20 decoys
 * on a fast belt · 21–25 big pieces · 26–32 everything at once. Every 5th is a big build.
 */
const AUTHORED: Spec[] = [
  L(PLANS.crate, false, false, 2.4, 34, 0, 'drag pieces onto the plan'),
  L(PLANS.sign, false, false, 2.1, 36, 0, 'fill every cell'),
  L(PLANS.tent, false, false, 1.9, 40, 0.05, 'odd pieces? let them pass'),
  L(PLANS.hut, false, false, 1.8, 44, 0.06),
  L(PLANS.house, false, false, 1.6, 46, 0.08, 'big build — keep the combo going'),
  L(PLANS.mushroom, true, false, 1.9, 42, 0.04, 'tap a piece to rotate it'),
  L(PLANS.tree, true, false, 1.65, 46, 0.06),
  L(PLANS.snowman, true, false, 1.6, 48, 0.08),
  L(PLANS.sailboat, true, false, 1.5, 50, 0.08, 'gold stars fit anywhere'),
  L(PLANS.castle, true, false, 1.4, 52, 0.1, 'castle walls — fill the gaps first'),
  L(PLANS.flower, false, true, 2.0, 44, 0.05, 'colours must match the plan'),
  L(PLANS.rocket, false, true, 1.75, 48, 0.08),
  L(PLANS.cactus, true, true, 1.75, 48, 0.08, 'colour + rotation'),
  L(PLANS.lighthouse, true, true, 1.65, 52, 0.1),
  L(PLANS.steamship, true, true, 1.5, 54, 0.1, 'full steam ahead'),
  L(PLANS.windmill, true, true, 1.6, 56, 0.14, 'decoys everywhere — be picky'),
  L(PLANS.heart, true, true, 1.6, 58, 0.16),
  L(PLANS.bridge, true, true, 1.7, 60, 0.18, 'thin spans — tiny pieces only'),
  L(PLANS.tower, true, true, 1.45, 62, 0.18),
  L(PLANS.palace, true, true, 1.35, 62, 0.2, 'the palace — a long build'),
  L(PLANS.car, true, true, 1.5, 56, 0.12, 'big pieces arrive', true),
  L(PLANS.robot, true, true, 1.45, 58, 0.14, undefined, true),
  L(PLANS.pagoda, true, true, 1.35, 60, 0.15, undefined, true),
  L(PLANS.balloon, true, true, 1.35, 62, 0.16, 'fill the colours in rings', true),
  L(PLANS.clocktower, true, true, 1.3, 64, 0.18, 'race the clock tower', true),
  L(PLANS.pyramid, true, false, 1.3, 62, 0.12, 'one colour — breathe', true),
  L(PLANS.train, true, true, 1.3, 64, 0.18, undefined, true),
  L(PLANS.owl, true, true, 1.25, 66, 0.2, undefined, true),
  L(PLANS.station, true, true, 1.3, 68, 0.2, 'symmetry helps', true),
  L(PLANS.grand, true, true, 1.2, 70, 0.22, 'the grand palace', true),
  L(PLANS.submarine, true, true, 1.25, 70, 0.2, undefined, true),
  L(PLANS.skyline, true, true, 1.2, 72, 0.22, 'the whole city', true),
]

export const AUTHORED_COUNT = AUTHORED.length

/** Level n (1-based). Past the authored set the plans repeat with a tighter clock and faster belt. */
export function levelFor(n: number): BpLevel {
  const boss = n % 5 === 0
  if (n <= AUTHORED.length) {
    const s = AUTHORED[n - 1]
    return { ...s, n, boss, big: s.big ?? false }
  }
  const k = n - AUTHORED.length - 1
  const s = AUTHORED[5 + (k % (AUTHORED.length - 5))]
  const lap = Math.floor(k / (AUTHORED.length - 5)) + 1
  const breather = n % 5 === 1
  return {
    n,
    plan: s.plan,
    rot: true,
    multi: true,
    per: Math.max(0.95, s.per - 0.1 - lap * 0.05 + (breather ? 0.2 : 0)),
    speed: Math.min(96, s.speed + 6 + lap * 4),
    decoy: Math.min(0.3, s.decoy + 0.04 + lap * 0.02),
    big: true,
    boss,
  }
}

export function planCells(plan: Plan) {
  let n = 0
  for (const r of plan.rows) for (const ch of r) if (ch !== '.') n++
  return n
}
