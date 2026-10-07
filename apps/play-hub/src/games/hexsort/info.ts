import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'hexsort',
    title: 'Hexa Sort',
    blurb: 'Stack hex tiles so matching colours flip together and burst.',
    path: '/play/hexsort',
    accent: '#0891B2',
    eta: '3–10 min',
    tag: 'Merge',
    tags: ['Merge', 'Sorting', 'Relaxing', 'Brain'],
    icon: '🔷',
    howTo: [
      'Drag one of the three offered stacks onto an empty hex. New stacks arrive when all three are placed.',
      'Neighbouring stacks with the same top colour flip their tiles together. Ten or more of one colour on top clear in a burst — chains clear more.',
      'Clear the tile goal to beat a level — fewer moves earn more stars. If every hex is filled, the board is full and the run ends.',
      '30 hand-built boards add locked hexes, odd shapes, buried piles and new colours, with a boss board every 5th level. Hammer smashes a stack, Refresh swaps the offer.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['tiles', 300, 'total', 'Clear 300 tiles in total', 30],
    ['stacks', 10, 'run', 'Clear 10 stacks in one run', 40],
    ['level', 7, 'run', 'Reach level 7', 50],
    ['combo', 2, 'run', 'Clear 2 stacks with one move', 50],
    ['tiles', 3000, 'total', 'Clear 3,000 tiles in total', 50],
    ['level', 12, 'run', 'Reach level 12', 80],
    ['stacks', 800, 'total', 'Clear 800 stacks in total', 80],
    ['biggest', 15, 'run', 'Clear a 15-tile stack at once', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'hammer', icon: '🔨', label: 'Hammer Kit', desc: '+1 Hammer at the start of a run', max: 4, cost: 80 },
    { id: 'space', icon: '⬡', label: 'More Space', desc: '+1 open hex on the starting board', max: 3, cost: 140 },
    { id: 'bounty', icon: '🪙', label: 'Tip Jar', desc: '+15% coins from each run', max: 5, cost: 90 },
  ],
}
