import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'chainmerge',
    title: 'Chain Link',
    blurb: 'Swipe chains of equal gems — they fuse into one bigger number.',
    path: '/play/chainmerge',
    accent: '#9333EA',
    eta: '3–10 min',
    tag: 'Merge',
    tags: ['Merge', 'Numbers', 'Brain', 'Relaxing'],
    icon: '🔗',
    howTo: [
      'Drag through touching tiles (diagonals too) that show the same number. After two equal tiles you may step up to the double, then keep going.',
      'Release to fuse the whole chain into the last tile: the sum becomes the biggest power of two it reaches. Long chains score bonus points.',
      'Tiles fall and refill from the top. When no two touching tiles match, you are out of moves and the run ends.',
      'Shuffle and Hammer save stuck boards. Stones block the board until a merge breaks them; star tiles join any chain; golden tiles pay coins.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-04',
  },
  missions: [
    ['best', 256, 'run', 'Make a 256 tile', 30],
    ['chains', 60, 'total', 'Merge 60 chains in total', 30],
    ['longest', 6, 'run', 'Link a chain of 6 tiles', 40],
    ['best', 2048, 'run', 'Make a 2048 tile', 50],
    ['stones', 25, 'total', 'Break 25 stones in total', 50],
    ['score', 50000, 'run', 'Score 50,000 in one run', 50],
    ['best', 16384, 'run', 'Make a 16K tile', 80],
    ['chains', 3000, 'total', 'Merge 3,000 chains in total', 80],
    ['longest', 12, 'run', 'Link a chain of 12 tiles', 100],
  ],
  upgrades: [
    { id: 'shuffle', icon: '🔀', label: 'Lucky Shuffle', desc: '+1 Shuffle at the start of a run', max: 3, cost: 110 },
    { id: 'hammer', icon: '🔨', label: 'Gem Hammer', desc: '+1 Hammer at the start of a run', max: 4, cost: 70 },
    { id: 'bounty', icon: '🪙', label: 'Treasure', desc: '+15% coins from each run', max: 5, cost: 90 },
  ],
}
