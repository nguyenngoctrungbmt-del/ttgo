import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'paint',
    title: 'Paint Wars',
    blurb: 'Loop out, paint the map and cut rival trails before they cut yours.',
    path: '/play/paint',
    accent: '#F43F5E',
    eta: '3–10 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'IO', 'Strategy'],
    icon: '🖌️',
    howTo: [
      'Swipe (or use the arrow keys) to turn. Leaving your land draws a trail behind you.',
      'Return to your land to close the loop — everything inside becomes yours. Own the target % to clear the level.',
      'Run over a rival trail to knock them out. If anyone touches your trail — or you cross it yourself — you are out.',
      '30 hand-made arenas add stone walls, hunters and events, with a King boss every 5th level. Fast clears and cutting a rival earn stars. Grab bombs, shields and speed boots.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['level', 2, 'run', 'Clear level 2', 30],
    ['kills', 1, 'run', "Cut a rival's trail", 30],
    ['tiles', 2000, 'total', 'Claim 2,000 tiles in total', 40],
    ['level', 4, 'run', 'Clear level 4', 50],
    ['kills', 4, 'run', 'Cut 4 rivals in one run', 50],
    ['percent', 35, 'run', 'Own 35% of a map', 50],
    ['level', 8, 'run', 'Clear level 8', 80],
    ['kings', 3, 'total', 'Topple 3 King rivals', 80],
    ['tiles', 100000, 'total', 'Claim 100,000 tiles in total', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'base', icon: '🏠', label: 'Big Base', desc: 'Start every level with more land', max: 3, cost: 90 },
    { id: 'speed', icon: '👟', label: 'Quick Brush', desc: '+6% movement speed', max: 4, cost: 80 },
    { id: 'shield', icon: '🛡️', label: 'Guard Coat', desc: '+1 trail shield at each level start', max: 3, cost: 140 },
  ],
}
