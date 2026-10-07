import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'domino',
    title: 'Domino Build',
    blurb: 'Draw a domino trail, tap GO and watch the chain ring every bell.',
    path: '/play/domino',
    accent: '#BE185D',
    eta: '3–8 min',
    tag: 'Building',
    tags: ['Building', 'Puzzle', 'Casual'],
    icon: '🎳',
    howTo: [
      'Drag your finger from the start pad to lay a trail of dominoes. Start a new line from any domino to split the chain into two branches.',
      'Tap GO: the dominoes topple one after another. Ring every bell before the chain stops to clear the level.',
      'Walls and water block your trail, red gates open and close on a rhythm, and buttons fire hidden chains. Gems and a short trail earn extra stars.',
      '32 hand-built tables, a boss table every 5th. A broken chain costs a heart but your trail stays so you can fix it (Undo removes the last stroke).',
    ],
    isNew: true,
    popularity: 86,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 3, 'run', 'Clear 3 levels in a run', 30],
    ['bells', 10, 'total', 'Ring 10 bells', 30],
    ['toppled', 300, 'total', 'Topple 300 dominoes', 40],
    ['level', 7, 'run', 'Clear 7 levels in a run', 50],
    ['stars', 40, 'total', 'Earn 40 stars', 50],
    ['gems', 25, 'total', 'Collect 25 gems', 50],
    ['level', 15, 'run', 'Clear 15 levels in a run', 80],
    ['perfect', 20, 'total', 'Clear 20 levels with 3 stars', 80],
    ['toppled', 6000, 'total', 'Topple 6,000 dominoes', 100],
  ],
  levels: { authored: 32, bossEvery: 5 },
  upgrades: [
    { id: 'extra', icon: '📦', label: 'Big Box', desc: '+3 dominoes on every level', max: 4, cost: 80 },
    { id: 'heart', icon: '❤️', label: 'Steady Hand', desc: '+1 heart per run', max: 3, cost: 150 },
    { id: 'bounty', icon: '🪙', label: 'Showman', desc: '+15% coins from each run', max: 5, cost: 70 },
  ],
}
