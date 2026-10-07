import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'fisher',
    title: 'Deep Fisher',
    blurb: 'Dodge fish going down, hook them coming up, shoot them sky-high.',
    path: '/play/fisher',
    accent: '#1E40AF',
    eta: '3–10 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Casual', 'Reflex'],
    icon: '🎣',
    howTo: [
      'Drag left and right to steer the lure. On the way down, dodge fish — touching one starts the reel-up early.',
      'On the way up, steer into as many fish as your hook holds. Red-glowing mines, puffers and eels cut your line and cost a life.',
      'At the surface your catch flies into the air: tap to shoot each fish for cash. Shooting jellyfish costs money.',
      'Spend cash in the Tackle Shop between dives: longer line, bigger hook, bumper lure, wider shot. Deeper zones hold rarer fish.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-03',
  },
  missions: [
    ['depth', 100, 'run', 'Reach 100 m deep', 30],
    ['fish', 50, 'total', 'Shoot 50 fish', 30],
    ['money', 1000, 'total', 'Earn $1,000 in total', 40],
    ['depth', 300, 'run', 'Reach 300 m deep', 50],
    ['dives', 8, 'run', 'Make 8 dives in one run', 50],
    ['fish', 500, 'total', 'Shoot 500 fish in total', 50],
    ['depth', 700, 'run', 'Reach the 700 m trench', 80],
    ['golden', 5, 'total', 'Shoot 5 golden fish', 80],
    ['money', 50000, 'total', 'Earn $50,000 in total', 100],
  ],
  upgrades: [
    { id: 'line', icon: '🧵', label: 'Long Line', desc: '+30 m starting line', max: 5, cost: 80 },
    { id: 'spare', icon: '🪝', label: 'Spare Lines', desc: '+1 life (line) per run', max: 3, cost: 150 },
    { id: 'bounty', icon: '💰', label: 'Fish Market', desc: '+10% cash per fish', max: 5, cost: 90 },
  ],
}
