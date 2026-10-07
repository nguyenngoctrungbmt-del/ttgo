import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'hopper',
    title: 'Road Hopper',
    blurb: 'Hop across roads, rivers and rails — and never stop moving.',
    path: '/play/hopper',
    accent: '#65A30D',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Endless', 'Casual'],
    icon: '🐸',
    howTo: [
      'Tap to hop forward. Swipe left, right or down to hop that way. Trees and rocks block your path.',
      'Cars, trucks and trains squash you — trains are fast, so watch for the flashing red signal. In rivers, land on logs or lily pads.',
      'The camera keeps creeping forward. Lag behind and the eagle snatches you, and logs that drift off-screen take you with them.',
      'Score = furthest row. Every 40 rows brings a new biome; later come snakes, lava vents, bubble shields and Gold Rush lanes full of coins. Upgrades slow the camera, magnet coins and add luck.',
    ],
    isNew: true,
    popularity: 91,
    addedAt: '2026-10-03',
  },
  missions: [
    ['rows', 30, 'run', 'Hop 30 rows in one run', 30],
    ['coins', 20, 'total', 'Collect 20 coins', 30],
    ['roads', 50, 'total', 'Cross 50 road lanes', 40],
    ['rows', 100, 'run', 'Hop 100 rows in one run', 50],
    ['rivers', 60, 'total', 'Cross 60 river lanes', 50],
    ['coins', 200, 'total', 'Collect 200 coins', 50],
    ['rows', 220, 'run', 'Hop 220 rows in one run', 80],
    ['rails', 150, 'total', 'Cross 150 rail tracks', 80],
    ['rows', 10000, 'total', 'Hop 10,000 rows in total', 100],
  ],
  upgrades: [
    { id: 'slow', icon: '🦅', label: 'Lazy Eagle', desc: 'Camera creeps 10% slower', max: 3, cost: 110 },
    { id: 'magnet', icon: '🧲', label: 'Coin Magnet', desc: 'Grab coins 1 tile further away', max: 3, cost: 120 },
    { id: 'luck', icon: '🍀', label: 'Lucky Hop', desc: 'More coins on the road, +15% coins', max: 4, cost: 70 },
  ],
}
