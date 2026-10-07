import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'spinner',
    title: 'Spin Tops',
    blurb: 'Steer your battle top, clash for sparks and knock rivals out of the bowl.',
    path: '/play/spinner',
    accent: '#9D174D',
    eta: '3–10 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Battle', 'Physics'],
    icon: '🪀',
    howTo: [
      'Drag anywhere (or WASD / arrows) to steer your top around the bowl.',
      'Ram rivals to drain their spin and knock them over the rim. Last top spinning wins the match.',
      'Every clash and every second drains your own spin — stay away from the edge and grab cyan spin orbs.',
      'Use DASH (J) and SHIELD (K) when the meter fills. 20 authored matches across 6 bowls (lava burns spin!) with a boss every 5th. Stars: win, half spin left, under 45 s.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['wins', 2, 'run', 'Win 2 matches in one run', 30],
    ['ringouts', 5, 'total', 'Ring out 5 tops', 30],
    ['clashes', 100, 'total', 'Land 100 clashes in total', 40],
    ['wins', 5, 'run', 'Win 5 matches in one run', 50],
    ['bosses', 1, 'total', 'Defeat a boss top', 50],
    ['ringouts', 40, 'total', 'Ring out 40 tops in total', 50],
    ['wins', 12, 'run', 'Win 12 matches in one run', 80],
    ['bosses', 5, 'total', 'Defeat 5 boss tops', 80],
    ['ringouts', 300, 'total', 'Ring out 300 tops in total', 100],
  ],
  levels: { authored: 20, bossEvery: 5 },
  upgrades: [
    { id: 'spin', icon: '🌀', label: 'Iron Core', desc: '+10% max spin', max: 5, cost: 80 },
    { id: 'weight', icon: '⚖️', label: 'Heavy Base', desc: '+8% weight — less knockback', max: 4, cost: 90 },
    { id: 'charge', icon: '⚡', label: 'Quick Charge', desc: 'Special meter fills 20% faster', max: 4, cost: 70 },
  ],
}
