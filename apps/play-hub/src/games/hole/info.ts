import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'hole',
    title: 'Black Hole',
    blurb: 'Swallow the city piece by piece — cones, cars, then skyscrapers.',
    path: '/play/hole',
    accent: '#4338CA',
    eta: '3–10 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'IO', 'Casual'],
    icon: '🕳️',
    howTo: [
      'Drag anywhere (or use the arrow keys) to slide your hole around the city.',
      'Anything smaller than the hole falls in and makes it grow. Reach the target size before the clock runs out — 30 hand-built cities, then endless.',
      'From level 3 rival holes roam the city — swallow them when you are bigger, flee when they are red.',
      'Grab clocks (+time), vortexes (pull) and boosts (speed). Upgrades give a bigger start, more time and speed.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-03',
  },
  missions: [
    ['level', 2, 'run', 'Clear level 2', 30],
    ['swallowed', 300, 'total', 'Swallow 300 objects in total', 30],
    ['cars', 25, 'total', 'Swallow 25 cars', 40],
    ['level', 4, 'run', 'Clear level 4', 50],
    ['rivals', 1, 'total', 'Swallow a rival hole', 50],
    ['stars', 15, 'total', 'Earn 15 stars in total', 50],
    ['level', 8, 'run', 'Clear level 8', 80],
    ['towers', 30, 'total', 'Swallow 30 towers', 80],
    ['swallowed', 10000, 'total', 'Swallow 10,000 objects in total', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'size', icon: '⚫', label: 'Wide Mouth', desc: '+3 starting hole size', max: 4, cost: 90 },
    { id: 'time', icon: '⏱️', label: 'Overtime', desc: '+5 s on every round clock', max: 4, cost: 80 },
    { id: 'speed', icon: '💨', label: 'Slick Rim', desc: '+8% movement speed', max: 4, cost: 70 },
  ],
}
