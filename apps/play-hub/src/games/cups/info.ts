import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'cups',
    title: 'Cup Shuffle',
    blurb: 'Keep your eye on the ball as the cups whirl faster and faster.',
    path: '/play/cups',
    accent: '#DC2626',
    eta: '2–6 min',
    tag: 'Memory',
    tags: ['Memory', 'Focus', 'Carnival'],
    icon: '🥤',
    howTo: [
      'Watch which cup hides the gold star ball. The cups drop and the host shuffles them — follow the ball, then tap its cup (or press 1–6).',
      'A wrong cup costs a heart; lose them all and the show is over. Perfect rounds build a streak multiplier.',
      'More cups, faster swaps, two or three balls to track, grey fake balls to avoid and cups that hop up to fool you.',
      'Slow-mo slows the current shuffle; X-ray shows through the cups for a moment. Upgrades slow every shuffle and add hearts.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 5, 'run', 'Reach level 5', 30],
    ['balls', 30, 'total', 'Find 30 balls in total', 30],
    ['perfect', 10, 'total', 'Play 10 perfect rounds', 40],
    ['level', 10, 'run', 'Reach level 10', 50],
    ['streak', 6, 'run', 'Get a 6-round perfect streak', 50],
    ['bonus', 5, 'total', 'Win 5 bonus rounds', 50],
    ['level', 20, 'run', 'Reach level 20', 80],
    ['perfect', 200, 'total', 'Play 200 perfect rounds', 80],
    ['balls', 1000, 'total', 'Find 1,000 balls in total', 100],
  ],
  levels: { authored: 60, bossEvery: 5 },
  upgrades: [
    { id: 'eye', icon: '👁️', label: 'Sharp Eye', desc: 'Every shuffle runs 7% slower', max: 4, cost: 90 },
    { id: 'heart', icon: '❤️', label: 'Big Heart', desc: '+1 max heart', max: 3, cost: 150 },
    { id: 'kit', icon: '🎩', label: 'Magic Kit', desc: '+1 starting Slow-mo and X-ray', max: 4, cost: 70 },
  ],
}
