/**
 * Signature levels for Flash Count: themed tables with a fixed cast, curated counts, chosen twists
 * and question mixes, blended into the endless generator. Every 5th level is a boss table
 * (hearts at stake). Checked by the lv5 validator (answers match the table, "most" is unique).
 */
import type { Kind } from './art'

// 0 apples · 1 stars · 2 gems · 3 critters · 4 fish · 5 mushrooms · 6 balloons · 7 moons
export type CountSig = {
  name: string
  sub: string
  boss?: boolean
  kinds: Kind[]
  /** Fixed count per kind (same order as `kinds`); otherwise `total` is spread randomly. */
  counts?: number[]
  total?: number
  /** 'missing' asks about a kind that is NOT on the table (answer 0). */
  qs: ('count' | 'most' | 'total' | 'missing')[]
  moving?: boolean
  sized?: boolean
  cluster?: boolean
  late?: boolean
  /** Multiplier on the flash time. */
  flash?: number
}

export const SIGNATURE: Record<number, CountSig> = {
  1: { name: 'Apple Orchard', sub: 'how many apples?', kinds: [0], counts: [3], qs: ['count'], moving: false, sized: false, cluster: false, late: false, flash: 1.15 },
  2: { name: 'Night Sky', sub: 'stars and moons', kinds: [1, 7], counts: [4, 2], qs: ['count'], moving: false, sized: false, cluster: false, late: false },
  3: { name: 'Treasure Chest', sub: 'count the gems', kinds: [2, 1], counts: [3, 5], qs: ['count'], moving: false, sized: false, cluster: false, late: false },
  4: { name: 'Pond Life', sub: 'fish and frogs', kinds: [4, 3, 5], counts: [4, 3, 2], qs: ['count'], moving: false, sized: false, cluster: false, late: false },
  5: { name: 'Boss · Balloon Festival', sub: 'they float away · two questions', boss: true, kinds: [6, 1, 0], counts: [5, 3, 2], qs: ['count', 'count'], moving: true, sized: false, cluster: false, late: false, flash: 1.1 },
  6: { name: 'Mushroom Patch', sub: 'a calm breather', kinds: [5, 3], counts: [3, 4], qs: ['count'], moving: false, sized: false, cluster: false, late: false },
  7: { name: 'Shooting Stars', sub: 'stars on the move', kinds: [1, 7, 2], counts: [5, 3, 2], qs: ['count', 'count'], moving: true, sized: false, cluster: false, late: false },
  8: { name: 'Fish Market', sub: 'fish, apples and a trick', kinds: [4, 0, 2], counts: [4, 3, 3], qs: ['count', 'missing'], moving: false, sized: false, cluster: false, late: false },
  10: { name: 'Boss · Starry Night', sub: 'big and small · which was most?', boss: true, kinds: [1, 7, 2, 6], counts: [6, 3, 2, 3], qs: ['count', 'most'], moving: true, sized: true, cluster: false, late: false, flash: 1.1 },
  11: { name: 'Quiet Pond', sub: 'a breather', kinds: [4, 3], counts: [4, 3], qs: ['count', 'count'], moving: false, sized: false, cluster: false, late: false, flash: 1.1 },
  12: { name: 'Critter Crowd', sub: 'they huddle together', kinds: [3, 5, 0], counts: [7, 3, 4], qs: ['count', 'most'], moving: false, sized: true, cluster: true, late: false },
  13: { name: 'Fruit Bowl', sub: 'apples, apples everywhere', kinds: [0, 6, 4, 1], counts: [8, 2, 3, 2], qs: ['count', 'missing'], moving: false, sized: true, cluster: true, late: false },
  15: { name: 'Boss · Carnival', sub: 'five kinds, three questions', boss: true, kinds: [6, 1, 0, 3, 4], counts: [5, 3, 4, 2, 3], qs: ['count', 'count', 'most'], moving: true, sized: true, cluster: false, late: false, flash: 1.1 },
  17: { name: 'Gem Rush', sub: 'count every single thing', kinds: [2, 1, 7], counts: [6, 4, 5], qs: ['total'], moving: true, sized: false, cluster: false, late: false },
  18: { name: 'Hide and Seek', sub: 'some arrive late, some leave', kinds: [3, 5, 4], counts: [5, 4, 3], qs: ['count', 'count'], moving: false, sized: false, cluster: false, late: true },
  20: { name: 'Boss · Midnight Parade', sub: 'moving, late and crowded', boss: true, kinds: [7, 1, 6, 3, 2], counts: [6, 4, 3, 2, 5], qs: ['count', 'most', 'count'], moving: true, sized: true, cluster: true, late: true, flash: 1.1 },
  22: { name: 'Lookalikes', sub: 'stars and gems, all sizes', kinds: [1, 2], counts: [9, 7], qs: ['count', 'count'], moving: true, sized: true, cluster: false, late: false },
  23: { name: 'Sunny Orchard', sub: 'a breather', kinds: [0, 6], counts: [5, 4], qs: ['count'], moving: false, sized: false, cluster: false, late: false },
  25: { name: 'Boss · The Big Count', sub: 'how many in total?', boss: true, kinds: [0, 1, 2, 4], counts: [6, 5, 7, 4], qs: ['total', 'most'], moving: false, sized: true, cluster: false, late: false, flash: 1.15 },
  28: { name: 'Swarm', sub: 'a moving huddle', kinds: [3, 4, 5, 0], counts: [8, 5, 4, 3], qs: ['count', 'count', 'missing'], moving: true, sized: true, cluster: true, late: false },
  30: { name: 'Boss · Grand Bazaar', sub: 'six stalls, three questions', boss: true, kinds: [0, 2, 4, 5, 6, 7], counts: [4, 3, 5, 2, 6, 3], qs: ['most', 'count', 'count'], moving: true, sized: true, cluster: false, late: false, flash: 1.1 },
  33: { name: 'Vanishing Moons', sub: 'they come and go', kinds: [7, 1, 2], counts: [7, 5, 6], qs: ['count', 'count', 'most'], moving: true, sized: true, cluster: false, late: true },
  35: { name: 'Boss · Starfall', sub: 'everything at once', boss: true, kinds: [1, 7, 2, 6, 3], counts: [7, 4, 5, 3, 3], qs: ['count', 'most', 'count'], moving: true, sized: true, cluster: true, late: true, flash: 1.1 },
  40: { name: 'Boss · Infinity Table', sub: 'all eight kinds', boss: true, kinds: [0, 1, 2, 3, 4, 5, 6, 7], counts: [4, 3, 2, 5, 3, 2, 6, 2], qs: ['count', 'count', 'most'], moving: true, sized: true, cluster: false, late: false, flash: 1.15 },
}

export const AUTHORED = 40
