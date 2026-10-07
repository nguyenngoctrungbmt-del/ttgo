import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'tank',
    title: 'Tank Arena',
    blurb: 'Drive, auto-fire, and survive waves of slimes and bosses.',
    path: '/play/tank',
    accent: '#65A30D',
    eta: '3–8 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Strategy'],
    icon: '🪖',
    howTo: [
      'Touch and drag anywhere to drive. Your turret aims at the nearest enemy and fires on its own.',
      'Slimes chase you: runners are fast, brutes are tanky, spitters shoot from range, splitters divide in two.',
      'Clear a wave to pick an upgrade — heavier shells, twin barrels, piercing, explosive rounds and more.',
      'Every 5th wave brings a crowned boss — dodge its ring volley when it swells. Coins buy permanent armor, loader and repair upgrades.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-03',
  },
  missions: [
    ['kills', 50, 'run', 'Destroy 50 enemies in one run', 30],
    ['wave', 4, 'run', 'Reach wave 4', 30],
    ['kills', 300, 'total', 'Destroy 300 enemies in total', 40],
    ['bosses', 1, 'total', 'Defeat a boss', 50],
    ['wave', 7, 'run', 'Reach wave 7', 50],
    ['score', 3000, 'run', 'Score 3,000 in one run', 50],
    ['wave', 11, 'run', 'Reach wave 11', 80],
    ['bosses', 5, 'total', 'Defeat 5 bosses in total', 80],
    ['kills', 3000, 'total', 'Destroy 3,000 enemies in total', 100],
  ],
  upgrades: [
    { id: 'plating', icon: '🛡️', label: 'Plating', desc: '+1 max HP at the start of each run', max: 4, cost: 120 },
    { id: 'loader', icon: '⚙️', label: 'Quick Loader', desc: '+10% base fire rate', max: 5, cost: 80 },
    { id: 'repair', icon: '🔧', label: 'Repair Kit', desc: 'Heal 1 HP every few waves (more often per level)', max: 3, cost: 110 },
  ],
}
