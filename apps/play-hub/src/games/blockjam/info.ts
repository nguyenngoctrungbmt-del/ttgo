import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'blockjam',
    title: 'Block Jam',
    blurb: 'Slide colour blocks out through their matching doors.',
    path: '/play/blockjam',
    accent: '#DB2777',
    eta: '2–5 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Trending', 'Brain'],
    trending: true,
    icon: '🧱',
    howTo: [
      'Drag a block to slide it around the board — it stops when it hits another block, a rock or the wall.',
      'Push a block into a wall door of the same colour (and symbol). If the door is wide enough, the block slides out.',
      'Clear every block before the timer runs out. Two-colour blocks peel at the outer door, striped blocks move one way only, frozen blocks thaw as others leave, locks open when the key block exits.',
      'Hammer smashes a block, Vacuum pulls out a whole colour, Freeze stops the clock. Upgrades add time, hammers and coins.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['blocks', 40, 'total', 'Clear 40 blocks', 30],
    ['stars3', 2, 'run', 'Get 3 stars on 2 levels in a run', 40],
    ['level', 8, 'run', 'Reach level 8', 50],
    ['blocks', 400, 'total', 'Clear 400 blocks', 50],
    ['hard', 2, 'total', 'Beat 2 hard levels', 50],
    ['level', 15, 'run', 'Reach level 15', 80],
    ['stars3', 40, 'total', 'Earn 3 stars on 40 levels', 80],
    ['blocks', 4000, 'total', 'Clear 4,000 blocks', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'time', icon: '⏱️', label: 'Extra Time', desc: '+10 s on every level', max: 3, cost: 120 },
    { id: 'hammer', icon: '🔨', label: 'Hammer Kit', desc: '+1 hammer at the start of a run', max: 3, cost: 80 },
    { id: 'bounty', icon: '🪙', label: 'Gold Bricks', desc: '+15% coins from each run', max: 5, cost: 90 },
  ],
}
