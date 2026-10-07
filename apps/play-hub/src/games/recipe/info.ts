import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'recipe',
    title: 'Recipe Rush',
    blurb: 'Remember each order, then build it exactly right.',
    path: '/play/recipe',
    accent: '#B45309',
    eta: '2–5 min',
    tag: 'Memory',
    tags: ['Memory', 'Cooking', 'Brain'],
    icon: '🍔',
    howTo: [
      'A customer shows their order ticket for a moment — memorise every ingredient and its order, then it flips over.',
      'Tap the ingredient trays in the same order to build the dish. Fast, perfect orders earn bigger tips.',
      'A wrong ingredient or an empty patience bar costs a heart. Watch for NO requests, x2 helpings and combo orders.',
      'Tap the ticket button to peek once more. Drinks, hot dogs and sundaes unlock as you go — every 5th level is Rush Hour.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 4, 'run', 'Reach level 4', 30],
    ['orders', 15, 'total', 'Serve 15 orders', 30],
    ['perfect', 5, 'run', 'Serve 5 perfect orders in a run', 40],
    ['level', 10, 'run', 'Reach level 10', 50],
    ['rush', 3, 'total', 'Survive 3 rush hours', 50],
    ['orders', 150, 'total', 'Serve 150 orders', 50],
    ['level', 20, 'run', 'Reach level 20', 80],
    ['tips', 500, 'run', 'Earn 500 tips in one run', 80],
    ['orders', 800, 'total', 'Serve 800 orders', 100],
  ],
  levels: { authored: 50, bossEvery: 5 },
  upgrades: [
    { id: 'memo', icon: '🧾', label: 'Sharp Memory', desc: '+15% time to read each ticket', max: 4, cost: 80 },
    { id: 'peek', icon: '👀', label: 'Order Peek', desc: 'Start each run with +1 ticket peek', max: 3, cost: 70 },
    { id: 'tips', icon: '🪙', label: 'Big Tipper', desc: '+15% coins from each run', max: 5, cost: 90 },
  ],
}
