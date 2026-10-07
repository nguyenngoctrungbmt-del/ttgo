import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'roads',
    title: 'Road Rush',
    blurb: 'Draw roads so every car gets to work on time.',
    path: '/play/roads',
    accent: '#475569',
    eta: '4–8 min',
    tag: 'Building',
    tags: ['Building', 'Strategy', 'Puzzle'],
    icon: '🛣️',
    howTo: [
      'Drag across the grid to lay road tiles. Houses send their cars along roads to the workplace of the same colour.',
      'Workplaces collect demand pins. More than six waiting starts a red timer; if it fills, the run ends.',
      'Road tiles are limited: plan short routes and avoid jams, since busy junctions slow cars down. Erase gives tiles back.',
      'Every week brings new houses, colours and an upgrade: bridges for water, motorways, roundabouts, extra cars. Upgrades add tiles, patience and speed.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-04',
  },
  missions: [
    ['trips', 50, 'run', 'Complete 50 trips in one run', 30],
    ['weeks', 3, 'run', 'Reach week 3', 30],
    ['trips', 500, 'total', 'Complete 500 trips in total', 40],
    ['weeks', 6, 'run', 'Reach week 6', 50],
    ['trips', 250, 'run', 'Complete 250 trips in one run', 50],
    ['bridges', 12, 'total', 'Build 12 bridges', 50],
    ['weeks', 9, 'run', 'Reach week 9', 80],
    ['colors', 5, 'run', 'Serve 5 colours in one run', 80],
    ['trips', 10000, 'total', 'Complete 10,000 trips in total', 100],
  ],
  upgrades: [
    { id: 'tiles', icon: '🛣️', label: 'Road Budget', desc: '+6 starting road tiles', max: 4, cost: 80 },
    { id: 'patience', icon: '⏳', label: 'Patient Bosses', desc: 'Workplaces wait 15% longer', max: 4, cost: 110 },
    { id: 'speed', icon: '🚗', label: 'Zippy Cars', desc: 'Cars drive 6% faster', max: 4, cost: 100 },
  ],
}
