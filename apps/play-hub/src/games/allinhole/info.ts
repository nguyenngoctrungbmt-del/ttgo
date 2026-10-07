import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'allinhole',
    title: 'All in Hole',
    blurb: 'Steer the hole and swallow every last item in the level.',
    path: '/play/allinhole',
    accent: '#1E293B',
    eta: '2–5 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Trending', 'Brain'],
    trending: true,
    icon: '🕳️',
    howTo: [
      'Drag anywhere (or use the arrow keys) to slide the hole across the table.',
      'Anything smaller than the hole tips in. The hole grows as it eats — swallow 100% before time runs out. Faster clears earn more stars.',
      'Walls block the hole, moving platforms shove things around, and swallowing a bomb costs 6 seconds.',
      'Magnet pulls nearby items in, Mega Hole grows it for a moment, Freeze stops the clock. Upgrades give a bigger hole and more time.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['eaten', 300, 'total', 'Swallow 300 items in total', 30],
    ['stars', 6, 'run', 'Earn 6 stars in one run', 40],
    ['level', 7, 'run', 'Reach level 7', 50],
    ['streak', 30, 'run', 'Swallow 30 in one streak', 50],
    ['eaten', 3000, 'total', 'Swallow 3,000 items in total', 50],
    ['level', 12, 'run', 'Reach level 12', 80],
    ['stars', 30, 'run', 'Earn 30 stars in one run', 80],
    ['eaten', 15000, 'total', 'Swallow 15,000 items in total', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'size', icon: '⭕', label: 'Wide Mouth', desc: '+6% starting hole size', max: 5, cost: 110 },
    { id: 'time', icon: '⏱️', label: 'Extra Time', desc: '+5 seconds on every level', max: 5, cost: 80 },
    { id: 'bounty', icon: '🪙', label: 'Lost & Found', desc: '+15% coins from each run', max: 5, cost: 100 },
  ],
}
