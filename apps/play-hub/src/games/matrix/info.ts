import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'matrix',
    title: 'Grid Recall',
    blurb: 'Memorise the lit tiles, then tap them back as the grid grows.',
    path: '/play/matrix',
    accent: '#7C3AED',
    eta: '2–6 min',
    tag: 'Memory',
    tags: ['Memory', 'Brain', 'Focus'],
    icon: '🧠',
    howTo: [
      'Watch the grid: some tiles flip up for a moment. Then they flip back — tap every one you saw.',
      'A wrong tile costs a heart. Lose all hearts and the run ends. Perfect rounds build a streak multiplier.',
      'The grid grows from 3×3 to 7×7. New twists appear: tiles in order, red decoys to ignore, and a grid that rotates.',
      'Use Peek to re-show the tiles and Hint to reveal one. Upgrades give a longer preview, extra hearts and more power-ups.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 5, 'run', 'Reach level 5', 30],
    ['tiles', 100, 'total', 'Recall 100 tiles in total', 30],
    ['perfect', 10, 'total', 'Play 10 perfect rounds', 40],
    ['level', 10, 'run', 'Reach level 10', 50],
    ['streak', 5, 'run', 'Get a 5-round perfect streak', 50],
    ['ordered', 15, 'total', 'Clear 15 in-order rounds', 50],
    ['level', 20, 'run', 'Reach level 20', 80],
    ['perfect', 150, 'total', 'Play 150 perfect rounds', 80],
    ['tiles', 3000, 'total', 'Recall 3,000 tiles in total', 100],
  ],
  levels: { authored: 60, bossEvery: 5 },
  upgrades: [
    { id: 'focus', icon: '👁️', label: 'Focus', desc: '+0.3 s to every memorise phase', max: 4, cost: 80 },
    { id: 'heart', icon: '❤️', label: 'Big Heart', desc: '+1 max heart', max: 3, cost: 150 },
    { id: 'kit', icon: '🔍', label: 'Toolkit', desc: '+1 starting Peek and Hint', max: 4, cost: 70 },
  ],
}
