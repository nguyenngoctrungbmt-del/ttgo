import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'jetpack',
    title: 'Jetpack Rush',
    blurb: 'Hold to blast through zappers, homing missiles and lasers.',
    path: '/play/jetpack',
    accent: '#F97316',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Endless', 'One-touch'],
    icon: '🧑‍🚀',
    howTo: [
      'Hold anywhere to fire the jetpack and rise; release to fall. Fly as far as you can.',
      'Avoid electric zappers, missiles (watch the red warning on the right) and wall lasers that charge before they fire.',
      'Grab coins and power-ups: shield bubble, coin magnet and rocket boost that smashes through zappers.',
      'New hazards appear every 30 s and the zone changes every 500 m. Spend coins on permanent upgrades.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-03',
  },
  missions: [
    ['dist', 300, 'run', 'Fly 300 m in one run', 30],
    ['coins', 150, 'total', 'Collect 150 coins in total', 30],
    ['powerups', 3, 'total', 'Grab 3 power-ups', 40],
    ['dist', 1000, 'run', 'Fly 1,000 m in one run', 50],
    ['missiles', 30, 'total', 'Dodge 30 missiles', 50],
    ['close', 10, 'run', 'Get 10 close calls in one run', 50],
    ['dist', 2500, 'run', 'Fly 2,500 m in one run', 80],
    ['coins', 3000, 'total', 'Collect 3,000 coins in total', 80],
    ['dist', 25000, 'total', 'Fly 25,000 m in total', 100],
  ],
  upgrades: [
    { id: 'shield', icon: '🛡️', label: 'Spare Shield', desc: 'Start each run with +1 shield bubble', max: 3, cost: 140 },
    { id: 'magnet', icon: '🧲', label: 'Coin Magnet', desc: 'Wider coin pickup, magnet lasts +2 s', max: 4, cost: 80 },
    { id: 'boost', icon: '🚀', label: 'Head Start', desc: 'Rocket through the first +100 m', max: 4, cost: 100 },
  ],
}
