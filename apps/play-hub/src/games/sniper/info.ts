import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'sniper',
    title: 'Sniper Scope',
    blurb: 'Scope in, read the wind and drop, and land the perfect shot.',
    path: '/play/sniper',
    accent: '#374151',
    eta: '3–8 min',
    tag: 'Action',
    tags: ['Action', 'Shooter', 'Precision', 'Levels'],
    icon: '🔭',
    howTo: [
      'Drag anywhere to move the scope, then tap FIRE. Hold STEADY to calm the sway — it drains your breath meter.',
      'Hostiles wear red caps and carry rifles. Never hit civilians. Targets walk, duck behind cover and peek out.',
      'Far shots drop and drift: read the range in the scope, hold over with the matching tick (300–600 m) and lean into the wind. Bullets take time to arrive.',
      '30 hand-built missions, then endless ones. Beat the timer and ammo, kill snipers fast when they glint. Stars for accuracy and headshots.',
    ],
    isNew: true,
    popularity: 86,
    addedAt: '2026-10-03',
  },
  missions: [
    ['levels', 3, 'run', 'Clear 3 levels in one run', 30],
    ['headshots', 10, 'total', 'Land 10 headshots', 30],
    ['kills', 30, 'total', 'Eliminate 30 hostiles', 40],
    ['levels', 6, 'run', 'Clear 6 levels in one run', 50],
    ['stars', 30, 'total', 'Earn 30 stars in total', 50],
    ['longshot', 450, 'run', 'Land a 450 m kill', 50],
    ['levels', 12, 'run', 'Clear 12 levels in one run', 80],
    ['headshots', 500, 'total', 'Land 500 headshots', 80],
    ['stars', 300, 'total', 'Earn 300 stars in total', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'steady', icon: '🫁', label: 'Steady Hands', desc: '-15% scope sway, +20% breath', max: 4, cost: 80 },
    { id: 'optics', icon: '🔭', label: 'Ballistic Optics', desc: 'Impact marker: drop, then wind, then zoom', max: 3, cost: 140 },
    { id: 'mag', icon: '🧰', label: 'Extended Mag', desc: '+1 spare round every level', max: 4, cost: 90 },
  ],
}
