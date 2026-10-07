import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'changed',
    title: 'What Changed?',
    blurb: 'Study a cosy little scene, blink, and spot what is different.',
    path: '/play/changed',
    accent: '#0D9488',
    eta: '2–6 min',
    tag: 'Memory',
    tags: ['Memory', 'Observation', 'Brain'],
    icon: '🔍',
    howTo: [
      'Study the scene — a room, a park, an aquarium or a desk — until the eyes blink shut.',
      'When they open, something has changed: an object moved, vanished, appeared, changed colour or turned. Tap where it happened.',
      'A wrong tap costs a heart. Quick, perfect rounds build a streak multiplier. Later rounds hide 2–3 changes in busier scenes.',
      'Peek shows the original scene again; Hint marks one change. Upgrades add study time, hearts and power-ups.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 5, 'run', 'Reach level 5', 30],
    ['changes', 25, 'total', 'Spot 25 changes in total', 30],
    ['perfect', 8, 'total', 'Play 8 perfect rounds', 40],
    ['level', 10, 'run', 'Reach level 10', 50],
    ['streak', 5, 'run', 'Get a 5-round perfect streak', 50],
    ['changes', 250, 'total', 'Spot 250 changes in total', 50],
    ['level', 20, 'run', 'Reach level 20', 80],
    ['perfect', 150, 'total', 'Play 150 perfect rounds', 80],
    ['changes', 2000, 'total', 'Spot 2,000 changes in total', 100],
  ],
  levels: { authored: 40, bossEvery: 5 },
  upgrades: [
    { id: 'focus', icon: '⏳', label: 'Long Look', desc: '+0.5 s study time every round', max: 4, cost: 80 },
    { id: 'heart', icon: '❤️', label: 'Big Heart', desc: '+1 max heart', max: 3, cost: 150 },
    { id: 'kit', icon: '🔍', label: 'Detective Kit', desc: '+1 starting Peek and Hint', max: 4, cost: 70 },
  ],
}
