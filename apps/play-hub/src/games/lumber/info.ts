import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'lumber',
    title: 'Lumber Chop',
    blurb: 'Chop left, chop right, dodge branches — and beat the clock.',
    path: '/play/lumber',
    accent: '#15803D',
    eta: '1–5 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Quick'],
    icon: '🪓',
    howTo: [
      'Tap the left or right half of the screen to jump to that side and chop the trunk.',
      'Never stand under a branch — a branch on your side, or one that drops onto you, ends the run.',
      'The timer drains faster every level; every chop refills it. Chop fast to get ON FIRE for double points.',
      'Golden logs pay big, Axe Fury smashes branches, Freeze stops the timer, iron logs need 2 chops. Upgrades add helmets, stamina and gold.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-03',
  },
  missions: [
    ['chops', 50, 'run', 'Chop 50 logs in one run', 30],
    ['golden', 5, 'total', 'Chop 5 golden logs', 30],
    ['chops', 500, 'total', 'Chop 500 logs in total', 40],
    ['chops', 150, 'run', 'Chop 150 logs in one run', 50],
    ['powerups', 15, 'total', 'Use 15 power-up logs', 50],
    ['level', 6, 'run', 'Reach level 6', 50],
    ['chops', 400, 'run', 'Chop 400 logs in one run', 80],
    ['golden', 150, 'total', 'Chop 150 golden logs', 80],
    ['chops', 10000, 'total', 'Chop 10,000 logs in total', 100],
  ],
  upgrades: [
    { id: 'stamina', icon: '⏳', label: 'Stamina', desc: 'Timer drains 8% slower', max: 4, cost: 80 },
    { id: 'helmet', icon: '⛑️', label: 'Hard Hat', desc: 'Survive 1 more branch hit per run', max: 3, cost: 140 },
    { id: 'golden', icon: '✨', label: 'Golden Touch', desc: 'More golden logs, +15% coins', max: 4, cost: 70 },
  ],
}
