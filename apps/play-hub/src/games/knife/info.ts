import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'knife',
    title: 'Knife Toss',
    blurb: 'Throw knives into a spinning target — just never hit another blade.',
    path: '/play/knife',
    accent: '#B45309',
    eta: '1–4 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Quick'],
    icon: '🔪',
    howTo: [
      'Tap to throw a knife straight up into the spinning target.',
      'Stick every knife to clear the stage — the target bursts apart. Hitting a knife already stuck ends the run.',
      'Slice 🍎 apples on the rim for bonus points.',
      'Spin patterns get trickier, and every 5th stage is a boss target with surges and reversals.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-03',
  },
  missions: [
    ['stage', 4, 'run', 'Reach stage 4', 30],
    ['apples', 10, 'total', 'Slice 10 apples', 30],
    ['knives', 100, 'total', 'Stick 100 knives in total', 40],
    ['bosses', 1, 'total', 'Beat a boss target', 50],
    ['stage', 8, 'run', 'Reach stage 8', 50],
    ['apples', 50, 'total', 'Slice 50 apples', 50],
    ['stage', 15, 'run', 'Reach stage 15', 80],
    ['bosses', 3, 'total', 'Beat 3 boss targets', 80],
    ['knives', 1000, 'total', 'Stick 1,000 knives in total', 100],
  ],
  levels: { authored: 0, bossEvery: 5 },
  upgrades: [
    { id: 'guard', icon: '🛡️', label: 'Guardian', desc: 'Forgive 1 knife collision per run', max: 3, cost: 150 },
    { id: 'orchard', icon: '🍎', label: 'Orchard', desc: 'More apples on every target', max: 4, cost: 70 },
    { id: 'bounty', icon: '🪙', label: 'Bounty', desc: '+15% coins from each run', max: 5, cost: 90 },
  ],
}
