import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'numbermerge',
    title: 'Number Merge',
    blurb: 'Place number blocks — equal neighbours merge and grow.',
    path: '/play/numbermerge',
    accent: '#4F46E5',
    eta: '3–10 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Trending', 'Brain'],
    trending: true,
    icon: '🔢',
    howTo: [
      'Tap an empty cell to place the current block. The small block on the right comes next.',
      'Connected equal blocks merge into the one you placed and double for every extra block — merges can chain.',
      'Make the goal tile to clear the level — fewer placements earn more stars. Dark cells are blocked; a full board with no merge ends the run.',
      'Stones crack when merges happen next to them. Rainbow jokers copy the best neighbour, bombs blast a 3×3. Hammer, Swap and Undo help — upgrades add more.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-04',
  },
  missions: [
    ['best', 128, 'run', 'Make a 128 tile', 30],
    ['merges', 200, 'total', 'Merge 200 times in total', 30],
    ['chain', 3, 'run', 'Cascade a 3-step chain', 40],
    ['best', 512, 'run', 'Make a 512 tile', 50],
    ['level', 5, 'run', 'Reach level 5', 50],
    ['merges', 3000, 'total', 'Merge 3,000 times in total', 50],
    ['best', 4096, 'run', 'Make a 4K tile', 80],
    ['chain', 6, 'run', 'Cascade a 6-step chain', 80],
    ['merges', 15000, 'total', 'Merge 15,000 times in total', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'hammer', icon: '🔨', label: 'Hammer Kit', desc: '+1 Hammer at the start of a run', max: 4, cost: 80 },
    { id: 'swap', icon: '🔄', label: 'Quick Swap', desc: '+1 Swap at the start of a run', max: 4, cost: 70 },
    { id: 'bounty', icon: '🪙', label: 'Number Cruncher', desc: '+15% coins from each run', max: 5, cost: 100 },
  ],
}
