import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'smash',
    title: 'Glass Smash',
    blurb: 'Fly down a glass corridor, smashing panes to keep moving.',
    path: '/play/smash',
    accent: '#38BDF8',
    eta: '2–8 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Aim', 'Reflex'],
    icon: '🪟',
    howTo: [
      'You fly forward on your own. Tap anywhere to throw a ball at that spot — every throw costs 1 ball.',
      'Smash any glass in your path. Flying into glass costs 10 balls; metal frames just block your throws.',
      'Hit the blue crystals for +3 balls (big ones +5). Chain hits without missing to throw 2, 3 or 4 balls at once.',
      'Break the gate at the end of each room to move on — rooms get faster and trickier. Run out of balls and the run ends.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-03',
  },
  missions: [
    ['distance', 300, 'run', 'Fly 300 m in one run', 30],
    ['glass', 100, 'total', 'Shatter 100 panes', 30],
    ['crystals', 30, 'total', 'Collect 30 crystals', 40],
    ['rooms', 5, 'run', 'Reach room 5', 50],
    ['streak', 15, 'run', 'Hit a 15-hit streak', 50],
    ['distance', 1000, 'run', 'Fly 1,000 m in one run', 50],
    ['rooms', 12, 'run', 'Reach room 12', 80],
    ['glass', 3000, 'total', 'Shatter 3,000 panes', 80],
    ['crystals', 1000, 'total', 'Collect 1,000 crystals', 100],
  ],
  upgrades: [
    { id: 'balls', icon: '⚪', label: 'Deep Pockets', desc: '+5 balls at the start of every run', max: 4, cost: 80 },
    { id: 'crystal', icon: '💎', label: 'Crystal Lens', desc: 'Crystals give +1 extra ball', max: 3, cost: 120 },
    { id: 'shield', icon: '🛡️', label: 'Safety Glass', desc: 'Crashes cost 2 fewer balls', max: 3, cost: 100 },
  ],
}
