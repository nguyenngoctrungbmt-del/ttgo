import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'blueprint',
    title: 'Blueprint',
    blurb: 'Fill the blueprint with pieces off the belt before time runs out.',
    path: '/play/blueprint',
    accent: '#2563EB',
    eta: '3–8 min',
    tag: 'Building',
    tags: ['Building', 'Puzzle', 'Focus'],
    icon: '📐',
    howTo: [
      'Drag pieces off the conveyor belt and drop them on the blueprint. They snap into place when every cell fits.',
      'Fill the whole outline before the timer ends. A wrong drop costs 3 seconds; quick clean placements build a combo.',
      'From blueprint 6 tap a piece to rotate it; from blueprint 11 colours must match the plan, and big pieces arrive at 21. Gold stars fit anywhere, clocks add time.',
      '32 hand-drawn plans, a big build every 5th. Finish fast with no mistakes for 3 stars; replay any plan from the level map.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 3, 'run', 'Finish 3 blueprints in a run', 30],
    ['pieces', 60, 'total', 'Place 60 pieces', 30],
    ['stars', 12, 'total', 'Earn 12 stars', 40],
    ['level', 6, 'run', 'Finish 6 blueprints in a run', 50],
    ['flawless', 5, 'total', 'Finish 5 builds with no mistakes', 50],
    ['combo', 6, 'run', 'Reach a x6 placement combo', 50],
    ['level', 12, 'run', 'Finish 12 blueprints in a run', 80],
    ['stars', 150, 'total', 'Earn 150 stars', 80],
    ['pieces', 2000, 'total', 'Place 2,000 pieces', 100],
  ],
  levels: { authored: 32, bossEvery: 5 },
  upgrades: [
    { id: 'time', icon: '⏱️', label: 'Overtime', desc: '+4 seconds on every blueprint', max: 4, cost: 90 },
    { id: 'belt', icon: '🐢', label: 'Slow Belt', desc: 'Conveyor runs 8% slower', max: 3, cost: 110 },
    { id: 'bounty', icon: '🪙', label: 'Contractor', desc: '+15% coins from each run', max: 5, cost: 70 },
  ],
}
