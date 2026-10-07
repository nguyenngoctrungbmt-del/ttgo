import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'darkmaze',
    title: 'Dark Maze',
    blurb: 'Memorise the maze, then find the exit by lantern light alone.',
    path: '/play/darkmaze',
    accent: '#1E3A8A',
    eta: '3–8 min',
    tag: 'Memory',
    tags: ['Memory', 'Maze', 'Brain'],
    icon: '🔦',
    howTo: [
      'Study the lit maze, then the lights go out. Swipe, drag or tap toward a direction (or use arrow keys) to walk one cell at a time.',
      'Reach the glowing stairs before your lantern oil runs out — every step burns oil. Spike traps only show in the preview: step on one and you lose a heart.',
      'Grab the gold key to open locked doors and amber flasks to refill oil. Mazes grow bigger, darker and trickier as you go.',
      'Peek re-lights the whole map for a moment. Upgrades widen the lantern, add oil and give extra Peeks.',
    ],
    isNew: true,
    popularity: 86,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 4, 'run', 'Reach level 4', 30],
    ['mazes', 10, 'total', 'Escape 10 mazes in total', 30],
    ['keys', 5, 'total', 'Collect 5 keys', 40],
    ['level', 8, 'run', 'Reach level 8', 50],
    ['streak', 4, 'run', 'Escape 4 mazes in a row unhurt', 50],
    ['flasks', 25, 'total', 'Pick up 25 oil flasks', 50],
    ['level', 15, 'run', 'Reach level 15', 80],
    ['mazes', 150, 'total', 'Escape 150 mazes in total', 80],
    ['keys', 100, 'total', 'Collect 100 keys', 100],
  ],
  levels: { authored: 50, bossEvery: 5 },
  upgrades: [
    { id: 'lantern', icon: '🏮', label: 'Bright Lantern', desc: 'Bigger light radius in the dark', max: 4, cost: 90 },
    { id: 'flask', icon: '🛢️', label: 'Deep Flask', desc: '+15% oil in every maze', max: 4, cost: 80 },
    { id: 'peek', icon: '👁️', label: 'Owl Eyes', desc: '+1 starting Peek', max: 3, cost: 110 },
  ],
}
