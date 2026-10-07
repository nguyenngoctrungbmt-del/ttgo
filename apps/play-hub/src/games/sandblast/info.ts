import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'sandblast',
    title: 'Sand Blast',
    blurb: 'Drop sand blocks and bridge a colour from wall to wall.',
    path: '/play/sandblast',
    accent: '#D97706',
    eta: '2–5 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Trending', 'Brain'],
    trending: true,
    icon: '🏜️',
    howTo: [
      'Drag to slide the falling block, tap to rotate it, swipe down to drop it. On landing it crumbles into sand that trickles and piles up.',
      'Connect one colour of sand from the left wall to the right wall — the whole bridge flashes and blasts away. Chains score extra.',
      'Build the target number of bridges to clear the level. If the sand piles past the red line, it overflows and the run ends.',
      'Bomb blows a crater, Rainbow sand matches any colour, Swap trades for the next block. Grey stones never clear. Upgrades add bombs, calmer sand and coins.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['bridges', 10, 'total', 'Blast 10 sand bridges', 30],
    ['combo', 2, 'run', 'Chain 2 bridges in a row', 40],
    ['level', 8, 'run', 'Reach level 8', 50],
    ['bridges', 100, 'total', 'Blast 100 sand bridges', 50],
    ['hard', 2, 'total', 'Beat 2 hard levels', 50],
    ['level', 15, 'run', 'Reach level 15', 80],
    ['grains', 200000, 'total', 'Clear 200,000 grains of sand', 80],
    ['combo', 4, 'run', 'Chain 4 bridges in a row', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'bomb', icon: '💣', label: 'Demolition', desc: '+1 bomb at the start of a run', max: 3, cost: 90 },
    { id: 'slow', icon: '🌬️', label: 'Calm Winds', desc: 'Blocks fall 8% slower', max: 3, cost: 110 },
    { id: 'bounty', icon: '🪙', label: 'Gold Dust', desc: '+15% coins from each run', max: 5, cost: 90 },
  ],
}
