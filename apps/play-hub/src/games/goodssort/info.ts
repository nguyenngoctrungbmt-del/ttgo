import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'goodssort',
    title: 'Goods Sort',
    blurb: 'Match three goods on a shelf to clear the store.',
    path: '/play/goodssort',
    accent: '#7C3AED',
    eta: '2–5 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Trending', 'Brain'],
    trending: true,
    icon: '📦',
    howTo: [
      'Drag a good (or tap it, then tap a shelf) into an empty slot on another shelf.',
      'Three identical goods on one shelf pop. When a shelf front empties, the goods behind slide forward.',
      'Clear every shelf before the timer runs out — no free slot left means you are out of space. Quick clears build combos.',
      'Locked shelves open after enough clears; frozen goods thaw as you clear. Magnet, Shuffle and Freeze boosters help — upgrades add more.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['triples', 60, 'total', 'Pop 60 triples in total', 30],
    ['combo', 3, 'run', 'Hit a x3 combo', 40],
    ['level', 7, 'run', 'Reach level 7', 50],
    ['stars', 15, 'run', 'Earn 15 stars in one run', 50],
    ['triples', 800, 'total', 'Pop 800 triples in total', 50],
    ['level', 12, 'run', 'Reach level 12', 80],
    ['combo', 10, 'run', 'Hit a x10 combo', 80],
    ['triples', 4000, 'total', 'Pop 4,000 triples in total', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'magnet', icon: '🧲', label: 'Magnet Kit', desc: '+1 Magnet at the start of a run', max: 4, cost: 90 },
    { id: 'clock', icon: '⏱️', label: 'Long Hours', desc: '+8 seconds on every level timer', max: 5, cost: 70 },
    { id: 'bounty', icon: '🪙', label: 'Shop Profits', desc: '+15% coins from each run', max: 5, cost: 100 },
  ],
}
