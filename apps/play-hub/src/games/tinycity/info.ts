import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'tinycity',
    title: 'Tiny City',
    blurb: 'Place buildings where the neighbours love them and grow a town.',
    path: '/play/tinycity',
    accent: '#16A34A',
    eta: '4–8 min',
    tag: 'Building',
    tags: ['Building', 'Puzzle', 'Strategy'],
    icon: '🏘️',
    howTo: [
      'Drag or tap on the island to place the building shown at the bottom; a live preview shows the points before you let go.',
      'Neighbours matter: houses love parks and water but hate factories, shops need houses, factories like each other. Green and red tiles show who gains or loses.',
      'Reach the island target score to clear the level and pick a bonus. Run out of free tiles first and the run ends. Spare tiles and no tools earn stars.',
      '30 hand-made islands introduce new buildings and terrain, with a boss island every 5th level. Swap, Undo, Bulldozer and Architect help in a pinch.',
    ],
    isNew: true,
    popularity: 86,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 4, 'run', 'Reach town level 4', 30],
    ['buildings', 60, 'total', 'Place 60 buildings', 30],
    ['score', 150, 'run', 'Score 150 in one town', 40],
    ['level', 7, 'run', 'Reach town level 7', 50],
    ['bigplay', 14, 'run', 'Score +14 with one building', 50],
    ['parks', 80, 'total', 'Build 80 parks', 50],
    ['level', 9, 'run', 'Reach town level 9', 80],
    ['score', 450, 'run', 'Score 450 in one town', 80],
    ['buildings', 2000, 'total', 'Place 2,000 buildings', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'land', icon: '🏝️', label: 'Bigger Island', desc: 'Start with an extra strip of land', max: 3, cost: 150 },
    { id: 'undo', icon: '↩️', label: 'Town Planner', desc: '+1 undo per run', max: 3, cost: 90 },
    { id: 'swap', icon: '🔄', label: 'Supplier Deals', desc: '+1 swap per run', max: 4, cost: 70 },
  ],
}
