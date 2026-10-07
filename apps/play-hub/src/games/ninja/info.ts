import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'ninja',
    title: 'Rooftop Ninja',
    blurb: 'Sprint across rooftops — jump gaps, slash guards, deflect arrows.',
    path: '/play/ninja',
    accent: '#B91C1C',
    eta: '1–4 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Runner'],
    icon: '🥷',
    howTo: [
      'You run automatically. Tap the right side to jump — hold for a higher jump, tap again in the air to double jump.',
      'Tap the left side to slash. Slashing cuts down guards and deflects arrows back at archers.',
      'Stomp enemies from above. Running into one, spikes, or a gap ends the run.',
      'Grab coins and go far — the city speeds up and the sky changes every 500 m. Upgrades add a coin magnet and a shield.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-03',
  },
  missions: [
    ['distance', 300, 'run', 'Run 300 m in one run', 30],
    ['kills', 8, 'run', 'Defeat 8 enemies in one run', 30],
    ['coins', 100, 'total', 'Collect 100 coins in total', 40],
    ['distance', 800, 'run', 'Run 800 m in one run', 50],
    ['deflects', 5, 'total', 'Deflect 5 arrows', 50],
    ['stomps', 10, 'total', 'Stomp 10 enemies', 50],
    ['distance', 2000, 'run', 'Run 2,000 m in one run', 80],
    ['kills', 30, 'run', 'Defeat 30 enemies in one run', 80],
    ['coins', 1000, 'total', 'Collect 1,000 coins in total', 100],
  ],
  upgrades: [
    { id: 'magnet', icon: '🧲', label: 'Coin Magnet', desc: 'Pull in coins from farther away', max: 4, cost: 70 },
    { id: 'guard', icon: '🛡️', label: 'Shadow Guard', desc: 'Survive 1 hit per run per level', max: 3, cost: 150 },
    { id: 'bounty', icon: '🪙', label: 'Bounty', desc: '+15% coins from each run', max: 5, cost: 90 },
  ],
}
