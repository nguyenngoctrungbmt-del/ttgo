/**
 * Hand-designed Gold Claw mines (levels 1–30). Levels beyond the list are generated.
 *
 * Items are [kind, x, y]: x is 0..1 across the screen, y is 0..1 from the top of the
 * dig area to the bottom. Kinds: gS gM gL gX gold (small → huge), rS rL rocks, dm diamond,
 * bag mystery bag, tnt barrel, bone. Moles are [x, y, carriesDiamond].
 * `target` is the money to earn during the level. Every level is checked by
 * scratch/lv4-miner-verify.mjs: a greedy claw bot that models swing timing, blocking,
 * reel weights and ignores bags/moles must out-earn the target by ≥ 25 % on several screen sizes.
 */

export type MinerKind = 'gS' | 'gM' | 'gL' | 'gX' | 'rS' | 'rL' | 'dm' | 'bag' | 'tnt' | 'bone'
export type MinerLevel = {
  name: string
  tip?: string
  target: number
  /** Mine theme index (Sunny Hills, Copper Canyon, Crystal Cavern, Lava Depths). */
  mine: number
  items: [MinerKind, number, number][]
  moles?: [number, number, boolean][]
}

export const MINER_LEVELS: MinerLevel[] = [
  // ── Sunny Hills: learn the claw ─────────────────────────────
  {
    name: 'First Nuggets',
    tip: 'tap when the claw points at gold',
    target: 450,
    mine: 0,
    items: [
      ['gM', 0.5, 0.12], ['gM', 0.25, 0.22], ['gM', 0.75, 0.22], ['gL', 0.5, 0.45], ['gS', 0.15, 0.4], ['gS', 0.85, 0.4],
      ['rS', 0.32, 0.55], ['rS', 0.68, 0.55], ['gL', 0.2, 0.75], ['gL', 0.8, 0.75], ['gS', 0.5, 0.8],
    ],
  },
  {
    name: 'Rock Garden',
    tip: 'rocks are heavy and worthless — aim around them',
    target: 500,
    mine: 0,
    items: [
      ['rL', 0.5, 0.12], ['rS', 0.3, 0.1], ['rS', 0.7, 0.1], ['gM', 0.5, 0.33], ['gM', 0.2, 0.3], ['gM', 0.8, 0.3],
      ['rL', 0.35, 0.48], ['rL', 0.65, 0.48], ['gL', 0.5, 0.62], ['gS', 0.1, 0.55], ['gS', 0.9, 0.55],
      ['gL', 0.18, 0.82], ['gL', 0.82, 0.82], ['rS', 0.5, 0.9],
    ],
  },
  {
    name: 'Deep Pockets',
    tip: 'big gold sits deep and reels in slowly',
    target: 650,
    mine: 0,
    items: [
      ['gS', 0.2, 0.08], ['gS', 0.4, 0.1], ['gS', 0.6, 0.1], ['gS', 0.8, 0.08], ['rS', 0.5, 0.25], ['gM', 0.3, 0.32], ['gM', 0.7, 0.32],
      ['rL', 0.12, 0.45], ['rL', 0.88, 0.45], ['gX', 0.5, 0.62], ['gL', 0.2, 0.8], ['gL', 0.8, 0.8], ['gM', 0.5, 0.92],
    ],
  },
  {
    name: 'Mystery Bags',
    tip: 'bags hide cash, dynamite, time or strength',
    target: 600,
    mine: 0,
    items: [
      ['bag', 0.3, 0.15], ['bag', 0.7, 0.15], ['gM', 0.5, 0.2], ['rS', 0.15, 0.3], ['rS', 0.85, 0.3], ['gL', 0.3, 0.45], ['gL', 0.7, 0.45],
      ['bag', 0.5, 0.55], ['rL', 0.5, 0.72], ['gM', 0.15, 0.7], ['gM', 0.85, 0.7], ['gL', 0.35, 0.88], ['gL', 0.65, 0.88],
    ],
  },
  {
    name: 'The Mother Lode',
    tip: 'boss mine — the huge nugget is worth the wait',
    target: 1150,
    mine: 0,
    items: [
      ['rL', 0.5, 0.15], ['rS', 0.32, 0.18], ['rS', 0.68, 0.18], ['gM', 0.15, 0.15], ['gM', 0.85, 0.15], ['rL', 0.4, 0.35], ['rL', 0.6, 0.35],
      ['gL', 0.15, 0.4], ['gL', 0.85, 0.4], ['gX', 0.5, 0.58], ['gX', 0.2, 0.78], ['gX', 0.8, 0.78], ['gM', 0.5, 0.88], ['bag', 0.5, 0.04],
    ],
  },
  // ── Copper Canyon: TNT and diamonds ─────────────────────────
  {
    name: 'Handle With Care',
    tip: 'TNT blows up everything nearby — even gold',
    target: 950,
    mine: 1,
    items: [
      ['tnt', 0.5, 0.2], ['gM', 0.38, 0.18], ['gM', 0.62, 0.18], ['gL', 0.15, 0.3], ['gL', 0.85, 0.3], ['rS', 0.5, 0.4],
      ['gL', 0.3, 0.55], ['gL', 0.7, 0.55], ['tnt', 0.5, 0.65], ['gM', 0.38, 0.7], ['gM', 0.62, 0.7], ['gL', 0.15, 0.85], ['gL', 0.85, 0.85],
    ],
  },
  {
    name: 'Diamond Dust',
    tip: 'diamonds are tiny, light and worth $600',
    target: 1250,
    mine: 1,
    items: [
      ['rS', 0.25, 0.15], ['rS', 0.5, 0.18], ['rS', 0.75, 0.15], ['gM', 0.12, 0.28], ['gM', 0.88, 0.28], ['rL', 0.35, 0.42], ['rL', 0.65, 0.42],
      ['dm', 0.5, 0.5], ['gL', 0.2, 0.62], ['gL', 0.8, 0.62], ['dm', 0.3, 0.85], ['dm', 0.7, 0.85], ['gM', 0.5, 0.78],
    ],
  },
  {
    name: 'Nugget Field',
    tip: 'breather — scoop up the small stuff',
    target: 700,
    mine: 1,
    items: [
      ['gS', 0.15, 0.1], ['gS', 0.35, 0.08], ['gS', 0.65, 0.08], ['gS', 0.85, 0.1], ['gM', 0.25, 0.25], ['gM', 0.5, 0.22], ['gM', 0.75, 0.25],
      ['gS', 0.1, 0.4], ['gM', 0.38, 0.42], ['gM', 0.62, 0.42], ['gS', 0.9, 0.4], ['gL', 0.25, 0.65], ['gL', 0.75, 0.65], ['gM', 0.5, 0.62],
      ['bag', 0.5, 0.85], ['gM', 0.15, 0.88], ['gM', 0.85, 0.88],
    ],
  },
  {
    name: 'Chain Reaction',
    tip: 'blow the rock wall with its own TNT',
    target: 1350,
    mine: 1,
    items: [
      ['rL', 0.2, 0.25], ['rL', 0.4, 0.25], ['rL', 0.6, 0.25], ['rL', 0.8, 0.25], ['tnt', 0.5, 0.12], ['rS', 0.3, 0.12], ['rS', 0.7, 0.12],
      ['gL', 0.25, 0.5], ['gL', 0.5, 0.48], ['gL', 0.75, 0.5], ['dm', 0.12, 0.62], ['dm', 0.88, 0.62], ['gX', 0.5, 0.75], ['gM', 0.2, 0.85], ['gM', 0.8, 0.85],
    ],
  },
  {
    name: 'Canyon Vault',
    tip: 'boss mine — diamonds behind the wall',
    target: 1700,
    mine: 1,
    items: [
      ['rS', 0.1, 0.32], ['rL', 0.26, 0.32], ['rL', 0.5, 0.3], ['rL', 0.74, 0.32], ['rS', 0.9, 0.32], ['tnt', 0.38, 0.18], ['tnt', 0.62, 0.18],
      ['gM', 0.15, 0.12], ['gM', 0.85, 0.12], ['dm', 0.35, 0.55], ['dm', 0.65, 0.55], ['dm', 0.5, 0.7], ['gX', 0.2, 0.75], ['gX', 0.8, 0.75], ['gL', 0.5, 0.9],
    ],
  },
  // ── Crystal Cavern: moles ───────────────────────────────────
  {
    name: 'Mole Patrol',
    tip: 'moles wander — catch the ones carrying diamonds',
    target: 900,
    mine: 2,
    items: [
      ['gM', 0.2, 0.1], ['gM', 0.8, 0.1], ['rS', 0.5, 0.12], ['gL', 0.3, 0.42], ['gL', 0.7, 0.42], ['rL', 0.5, 0.55],
      ['gL', 0.15, 0.8], ['gL', 0.85, 0.8], ['dm', 0.5, 0.88], ['bag', 0.5, 0.3],
    ],
    moles: [[0.3, 0.25, false], [0.7, 0.62, true], [0.4, 0.72, false]],
  },
  {
    name: 'Diamond Moles',
    tip: 'three moles hold diamonds',
    target: 1000,
    mine: 2,
    items: [
      ['rL', 0.3, 0.15], ['rL', 0.7, 0.15], ['gM', 0.5, 0.1], ['gL', 0.15, 0.5], ['gL', 0.85, 0.5], ['rS', 0.5, 0.42], ['gL', 0.5, 0.88], ['gM', 0.2, 0.9], ['gM', 0.8, 0.9],
    ],
    moles: [[0.35, 0.3, true], [0.6, 0.58, true], [0.4, 0.74, true], [0.7, 0.3, false]],
  },
  {
    name: 'Crystal Columns',
    tip: 'aim down the gaps between the columns',
    target: 1500,
    mine: 2,
    items: [
      ['rS', 0.2, 0.1], ['rS', 0.2, 0.26], ['rS', 0.2, 0.42], ['rS', 0.8, 0.1], ['rS', 0.8, 0.26], ['rS', 0.8, 0.42], ['rL', 0.5, 0.2],
      ['gL', 0.35, 0.35], ['gL', 0.65, 0.35], ['dm', 0.5, 0.48], ['gX', 0.2, 0.7], ['gX', 0.8, 0.7], ['gM', 0.5, 0.72], ['dm', 0.5, 0.92],
    ],
  },
  {
    name: 'Easy Street',
    tip: 'breather — bags and gold everywhere',
    target: 1050,
    mine: 2,
    items: [
      ['gM', 0.2, 0.08], ['gM', 0.5, 0.06], ['gM', 0.8, 0.08], ['bag', 0.35, 0.22], ['bag', 0.65, 0.22], ['gL', 0.15, 0.35], ['gL', 0.85, 0.35],
      ['gL', 0.5, 0.42], ['gM', 0.3, 0.6], ['gM', 0.7, 0.6], ['gL', 0.2, 0.82], ['gL', 0.8, 0.82], ['dm', 0.5, 0.75],
    ],
    moles: [[0.5, 0.92, false]],
  },
  {
    name: "Mole King's Hoard",
    tip: 'boss mine — a mole army guards the vault',
    target: 1700,
    mine: 2,
    items: [
      ['tnt', 0.5, 0.32], ['rL', 0.3, 0.12], ['rL', 0.7, 0.12], ['gL', 0.12, 0.2], ['gL', 0.88, 0.2], ['gX', 0.5, 0.55],
      ['dm', 0.2, 0.62], ['dm', 0.8, 0.62], ['gX', 0.3, 0.86], ['gX', 0.7, 0.86], ['bag', 0.5, 0.08],
    ],
    moles: [[0.3, 0.38, true], [0.7, 0.38, false], [0.4, 0.72, true], [0.6, 0.74, false], [0.5, 0.96, true]],
  },
  // ── Lava Depths: heavy and deep ────────────────────────────
  {
    name: 'Hot Rocks',
    tip: 'the gold sits under a crust of rock',
    target: 1750,
    mine: 3,
    items: [
      ['rL', 0.15, 0.22], ['rL', 0.38, 0.2], ['rL', 0.62, 0.2], ['rL', 0.85, 0.22], ['gM', 0.27, 0.08], ['gM', 0.73, 0.08],
      ['gX', 0.25, 0.48], ['gX', 0.75, 0.48], ['dm', 0.5, 0.42], ['gL', 0.5, 0.65], ['gL', 0.15, 0.8], ['gL', 0.85, 0.8], ['dm', 0.5, 0.9],
    ],
  },
  {
    name: 'Fuse Box',
    tip: 'TNT next to rocks clears a path — next to gold it costs you',
    target: 1750,
    mine: 3,
    items: [
      ['tnt', 0.25, 0.18], ['rL', 0.13, 0.2], ['rL', 0.38, 0.22], ['tnt', 0.75, 0.18], ['gL', 0.6, 0.24], ['gL', 0.9, 0.26],
      ['gX', 0.25, 0.45], ['dm', 0.5, 0.35], ['gL', 0.75, 0.45], ['rS', 0.5, 0.55], ['gX', 0.5, 0.75], ['gL', 0.15, 0.82], ['dm', 0.85, 0.85],
    ],
  },
  {
    name: 'Bone Yard',
    tip: 'breather — old bones and loose gold',
    target: 900,
    mine: 3,
    items: [
      ['bone', 0.2, 0.15], ['bone', 0.8, 0.15], ['gM', 0.5, 0.1], ['gL', 0.3, 0.32], ['gL', 0.7, 0.32], ['bone', 0.5, 0.45],
      ['gM', 0.15, 0.5], ['gM', 0.85, 0.5], ['gL', 0.35, 0.68], ['gL', 0.65, 0.68], ['bag', 0.5, 0.82], ['gL', 0.15, 0.88], ['gL', 0.85, 0.88],
    ],
  },
  {
    name: 'Needle Eye',
    tip: 'a single narrow gap leads to the diamonds',
    target: 1850,
    mine: 3,
    items: [
      ['rL', 0.12, 0.35], ['rL', 0.3, 0.35], ['rS', 0.44, 0.33], ['rS', 0.56, 0.33], ['rL', 0.7, 0.35], ['rL', 0.88, 0.35],
      ['gL', 0.2, 0.12], ['gL', 0.8, 0.12], ['gM', 0.5, 0.15], ['dm', 0.5, 0.55], ['dm', 0.45, 0.72], ['dm', 0.55, 0.88], ['gX', 0.2, 0.7], ['gX', 0.8, 0.7],
    ],
  },
  {
    name: 'Magma Chamber',
    tip: 'boss mine — huge nuggets, short fuses',
    target: 2700,
    mine: 3,
    items: [
      ['tnt', 0.3, 0.25], ['tnt', 0.7, 0.25], ['rS', 0.5, 0.15], ['gL', 0.12, 0.1], ['gL', 0.88, 0.1], ['gX', 0.5, 0.42],
      ['gX', 0.18, 0.55], ['gX', 0.82, 0.55], ['dm', 0.5, 0.62], ['gX', 0.35, 0.82], ['gX', 0.65, 0.82], ['dm', 0.1, 0.9], ['dm', 0.9, 0.9],
    ],
    moles: [[0.5, 0.72, true]],
  },
  // ── Second tour: remixes ───────────────────────────────────
  {
    name: 'Sunny Return',
    tip: 'pick the best value per second',
    target: 1800,
    mine: 0,
    items: [
      ['gS', 0.1, 0.06], ['gS', 0.3, 0.05], ['gS', 0.7, 0.05], ['gS', 0.9, 0.06], ['rS', 0.5, 0.14], ['gL', 0.2, 0.3], ['gL', 0.8, 0.3],
      ['dm', 0.5, 0.36], ['rL', 0.35, 0.52], ['rL', 0.65, 0.52], ['gX', 0.5, 0.68], ['gX', 0.15, 0.82], ['gX', 0.85, 0.82], ['dm', 0.5, 0.94],
    ],
  },
  {
    name: 'Powder Keg',
    tip: 'a ring of TNT around the treasure',
    target: 1650,
    mine: 1,
    items: [
      ['tnt', 0.38, 0.4], ['tnt', 0.62, 0.4], ['tnt', 0.5, 0.25], ['gX', 0.5, 0.52], ['dm', 0.5, 0.38], ['gL', 0.15, 0.15], ['gL', 0.85, 0.15],
      ['gL', 0.12, 0.55], ['gL', 0.88, 0.55], ['gX', 0.25, 0.8], ['gX', 0.75, 0.8], ['dm', 0.5, 0.9],
    ],
  },
  {
    name: 'Burrows',
    tip: 'moles slip between the rocks',
    target: 1850,
    mine: 2,
    items: [
      ['rS', 0.15, 0.3], ['rS', 0.38, 0.3], ['rS', 0.62, 0.3], ['rS', 0.85, 0.3], ['rS', 0.25, 0.62], ['rS', 0.5, 0.62], ['rS', 0.75, 0.62],
      ['gL', 0.3, 0.12], ['gL', 0.7, 0.12], ['gX', 0.5, 0.46], ['dm', 0.12, 0.48], ['dm', 0.88, 0.48], ['gX', 0.3, 0.86], ['gX', 0.7, 0.86],
    ],
    moles: [[0.3, 0.46, true], [0.7, 0.75, true], [0.5, 0.92, false]],
  },
  {
    name: 'Gold Rain',
    tip: 'breather — a sky full of nuggets',
    target: 1300,
    mine: 3,
    items: [
      ['gM', 0.1, 0.08], ['gM', 0.3, 0.1], ['gM', 0.5, 0.08], ['gM', 0.7, 0.1], ['gM', 0.9, 0.08], ['gL', 0.2, 0.3], ['gL', 0.5, 0.32], ['gL', 0.8, 0.3],
      ['gM', 0.35, 0.52], ['gM', 0.65, 0.52], ['gL', 0.15, 0.6], ['gL', 0.85, 0.6], ['bag', 0.5, 0.7], ['gL', 0.35, 0.88], ['gL', 0.65, 0.88],
    ],
  },
  {
    name: 'Fort Knox',
    tip: 'boss mine — break in through the side',
    target: 2150,
    mine: 1,
    items: [
      ['rL', 0.3, 0.3], ['rL', 0.5, 0.28], ['rL', 0.7, 0.3], ['rS', 0.22, 0.48], ['rS', 0.78, 0.48], ['rL', 0.3, 0.68], ['rL', 0.7, 0.68],
      ['gX', 0.5, 0.5], ['dm', 0.42, 0.66], ['dm', 0.58, 0.66], ['gX', 0.5, 0.85], ['gL', 0.12, 0.2], ['gL', 0.88, 0.2],
      ['gX', 0.12, 0.72], ['gX', 0.88, 0.72], ['tnt', 0.5, 0.12],
    ],
  },
  // ── Master mines ────────────────────────────────────────────
  {
    name: 'Deep Diamonds',
    tip: 'everything good is at the bottom',
    target: 1950,
    mine: 2,
    items: [
      ['rS', 0.2, 0.1], ['rS', 0.4, 0.12], ['rS', 0.6, 0.12], ['rS', 0.8, 0.1], ['rL', 0.3, 0.35], ['rL', 0.7, 0.35], ['bone', 0.5, 0.3],
      ['gL', 0.12, 0.55], ['gL', 0.88, 0.55], ['dm', 0.3, 0.88], ['dm', 0.5, 0.9], ['dm', 0.7, 0.88], ['gX', 0.5, 0.65], ['gL', 0.15, 0.78], ['gL', 0.85, 0.78],
    ],
  },
  {
    name: 'Scatter Shot',
    tip: 'small targets everywhere — precise taps pay',
    target: 2050,
    mine: 3,
    items: [
      ['dm', 0.15, 0.2], ['dm', 0.85, 0.2], ['gS', 0.3, 0.12], ['gS', 0.7, 0.12], ['gS', 0.5, 0.2], ['rS', 0.4, 0.35], ['rS', 0.6, 0.35],
      ['gM', 0.2, 0.45], ['gM', 0.8, 0.45], ['dm', 0.5, 0.5], ['gM', 0.35, 0.68], ['gM', 0.65, 0.68], ['gL', 0.15, 0.85], ['gL', 0.85, 0.85], ['dm', 0.5, 0.86],
    ],
  },
  {
    name: 'Lucky Bags',
    tip: 'breather — gamble on the bags',
    target: 1050,
    mine: 0,
    items: [
      ['bag', 0.2, 0.12], ['bag', 0.5, 0.1], ['bag', 0.8, 0.12], ['gL', 0.3, 0.3], ['gL', 0.7, 0.3], ['gM', 0.5, 0.4], ['bag', 0.15, 0.5], ['bag', 0.85, 0.5],
      ['gX', 0.5, 0.62], ['gL', 0.25, 0.8], ['gL', 0.75, 0.8], ['dm', 0.5, 0.9],
    ],
  },
  {
    name: 'Fault Line',
    tip: 'a diagonal crack of rock splits the mine',
    target: 1900,
    mine: 1,
    items: [
      ['rL', 0.12, 0.15], ['rS', 0.28, 0.25], ['rL', 0.42, 0.38], ['rS', 0.56, 0.48], ['rL', 0.7, 0.6], ['rS', 0.86, 0.72],
      ['gX', 0.75, 0.25], ['dm', 0.88, 0.4], ['gL', 0.55, 0.15], ['gX', 0.2, 0.55], ['dm', 0.12, 0.78], ['gX', 0.4, 0.82], ['gL', 0.6, 0.9],
    ],
    moles: [[0.3, 0.7, true]],
  },
  {
    name: 'The Dragon Hoard',
    tip: 'final boss mine — everything at once',
    target: 2950,
    mine: 3,
    items: [
      ['tnt', 0.5, 0.2], ['rL', 0.3, 0.2], ['rL', 0.7, 0.2], ['gL', 0.1, 0.12], ['gL', 0.9, 0.12], ['rS', 0.5, 0.36],
      ['gX', 0.25, 0.45], ['gX', 0.75, 0.45], ['dm', 0.5, 0.5], ['tnt', 0.5, 0.68], ['gX', 0.15, 0.75], ['gX', 0.85, 0.75],
      ['dm', 0.35, 0.82], ['dm', 0.65, 0.82], ['gX', 0.5, 0.9], ['bag', 0.5, 0.06],
    ],
    moles: [[0.3, 0.6, true], [0.7, 0.6, true]],
  },
]

export const MINER_AUTHORED = MINER_LEVELS.length
