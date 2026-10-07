import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'bowduel',
    title: 'Bow Duel',
    blurb: 'Out-aim a ladder of rival archers across windy hills.',
    path: '/play/bowduel',
    accent: '#0F766E',
    eta: '3–8 min',
    tag: 'Action',
    tags: ['Action', 'Aim', 'Duel', 'Strategy'],
    icon: '🪶',
    howTo: [
      'Drag back anywhere to set angle and power, then release to shoot. The dots only show the start of the arc.',
      'Take turns with your rival. Headshots deal double damage, legs less — watch the wind gauge before every shot.',
      '20 rivals on 8 battlefields — healers, dodgers, wind callers — and a champion every 5th. Stars: win, take ≤1 hit, win in ≤4 shots.',
      'After each win pick a reward: new weapons (axe, javelin) or perks. Upgrades add HP, damage and a longer aim guide.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-03',
  },
  missions: [
    ['wins', 2, 'run', 'Win 2 duels in one run', 30],
    ['headshots', 5, 'total', 'Land 5 headshots', 30],
    ['wins', 10, 'total', 'Win 10 duels in total', 40],
    ['wins', 5, 'run', 'Win 5 duels in one run', 50],
    ['headshots', 3, 'run', 'Land 3 headshots in one run', 50],
    ['bosses', 1, 'total', 'Defeat a champion', 50],
    ['wins', 10, 'run', 'Win 10 duels in one run', 80],
    ['headshots', 150, 'total', 'Land 150 headshots', 80],
    ['wins', 150, 'total', 'Win 150 duels in total', 100],
  ],
  levels: { authored: 20, bossEvery: 5 },
  upgrades: [
    { id: 'hp', icon: '❤️', label: 'Tough Skin', desc: '+15 max HP every run', max: 4, cost: 110 },
    { id: 'dmg', icon: '🎯', label: 'Broadheads', desc: '+8% damage on every hit', max: 5, cost: 90 },
    { id: 'aim', icon: '🦅', label: 'Long Sight', desc: 'Longer dotted aim guide', max: 3, cost: 70 },
  ],
}
