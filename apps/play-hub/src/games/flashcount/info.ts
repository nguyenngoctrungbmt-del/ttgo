import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'flashcount',
    title: 'Flash Count',
    blurb: 'Objects flash for a moment — how many of each did you see?',
    path: '/play/flashcount',
    accent: '#EA580C',
    eta: '2–5 min',
    tag: 'Memory',
    tags: ['Memory', 'Brain', 'Focus'],
    icon: '🔢',
    howTo: [
      'A burst of apples, stars, gems, critters and more flashes on the table — count each kind before the curtain drops.',
      'Answer "how many?" (or "which was most?") by tapping a big answer button before the timer runs out.',
      'Wrong answers cost a heart; lose all 3 and the show is over. Streaks raise your score multiplier and earn Peeks.',
      'Tap the eye to peek once more. Objects start moving, overlapping and arriving late — every 5th level is a bonus round.',
    ],
    isNew: true,
    popularity: 86,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 4, 'run', 'Reach level 4', 30],
    ['correct', 25, 'total', 'Answer 25 questions right', 30],
    ['streak', 5, 'run', 'Get a 5-answer streak', 40],
    ['level', 10, 'run', 'Reach level 10', 50],
    ['most', 10, 'total', 'Spot the "most" kind 10 times', 50],
    ['correct', 250, 'total', 'Answer 250 questions right', 50],
    ['level', 20, 'run', 'Reach level 20', 80],
    ['streak', 20, 'run', 'Get a 20-answer streak', 80],
    ['correct', 1000, 'total', 'Answer 1,000 questions right', 100],
  ],
  levels: { authored: 40, bossEvery: 5 },
  upgrades: [
    { id: 'focus', icon: '⏳', label: 'Long Look', desc: '+15% flash time on every level', max: 4, cost: 80 },
    { id: 'peek', icon: '👁️', label: 'Third Eye', desc: 'Start each run with +1 Peek', max: 3, cost: 70 },
    { id: 'charm', icon: '🛡️', label: 'Lucky Charm', desc: '+1 shield that forgives a wrong answer', max: 3, cost: 140 },
  ],
}
