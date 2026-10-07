import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'racer',
    title: 'Neon Racer',
    blurb: 'Weave through night traffic, skim cars for nitro, outrun the cops.',
    path: '/play/racer',
    accent: '#2563EB',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Racing', 'Arcade', 'Reflex'],
    icon: '🚗',
    howTo: [
      'Drag left or right anywhere to steer (arrow keys on desktop). Your car speeds up the farther you go.',
      'Pass cars as close as you can: near misses build a combo and fill the NITRO ring — tap it to boost and smash through traffic.',
      'Watch blinkers, road works, oil slicks and police chases; crashing costs armor, and with no armor left the run ends.',
      'Grab coins, nitro cans, armor and magnets. Spend coins on Armor, Turbo Tank and Coin Magnet upgrades.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-03',
  },
  missions: [
    ['distance', 800, 'run', 'Drive 800 m in one run', 30],
    ['nearmiss', 25, 'total', 'Get 25 near misses', 30],
    ['coins', 100, 'total', 'Collect 100 coins in total', 40],
    ['distance', 2500, 'run', 'Drive 2,500 m in one run', 50],
    ['police', 1, 'total', 'Escape a police chase', 50],
    ['nearmiss', 30, 'run', 'Get 30 near misses in one run', 50],
    ['distance', 5000, 'run', 'Drive 5,000 m in one run', 80],
    ['police', 10, 'total', 'Escape 10 police chases', 80],
    ['distance', 100000, 'total', 'Drive 100 km in total', 100],
  ],
  upgrades: [
    { id: 'armor', icon: '🛡️', label: 'Armor Plating', desc: '+1 armor (survive one more crash)', max: 3, cost: 150 },
    { id: 'turbo', icon: '⚡', label: 'Turbo Tank', desc: 'Start with +30% nitro; boosts last 15% longer', max: 4, cost: 90 },
    { id: 'magnet', icon: '🧲', label: 'Coin Magnet', desc: 'Wider coin pull and +10% coins per run', max: 5, cost: 70 },
  ],
}
