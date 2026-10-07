import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'arrowescape',
    title: 'Arrow Escape',
    blurb: 'Tap arrows to fly them off the grid — don\'t let them collide.',
    path: '/play/arrowescape',
    accent: '#0D9488',
    eta: '2–5 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Trending', 'Brain'],
    trending: true,
    icon: '➡️',
    howTo: [
      'Tap an arrow to launch it the way its head points. Long arrows slither after their head like a snake.',
      'If nothing is in front of the head, the arrow flies off the grid. If something blocks it, it bumps back and you lose a heart.',
      'Clear every arrow to finish the level. You have 3 hearts per level — every 5th level is a packed hard grid, and stones never move.',
      'Hint lights up a safe arrow, Hammer smashes one, Shield absorbs the next bump. Upgrades add hearts, hints and coins.',
    ],
    isNew: true,
    popularity: 86,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['arrows', 150, 'total', 'Launch 150 arrows to freedom', 30],
    ['flawless', 1, 'run', 'Clear a level without a bump', 40],
    ['level', 8, 'run', 'Reach level 8', 50],
    ['hard', 2, 'total', 'Beat 2 hard levels', 50],
    ['arrows', 1500, 'total', 'Free 1,500 arrows in total', 50],
    ['level', 15, 'run', 'Reach level 15', 80],
    ['flawless', 25, 'total', 'Clear 25 levels without a bump', 80],
    ['arrows', 6000, 'total', 'Free 6,000 arrows in total', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'heart', icon: '❤️', label: 'Extra Heart', desc: '+1 heart on every level', max: 2, cost: 160 },
    { id: 'hint', icon: '💡', label: 'Bright Idea', desc: '+1 hint at the start of a run', max: 3, cost: 70 },
    { id: 'bounty', icon: '🪙', label: 'Quiver Gold', desc: '+15% coins from each run', max: 5, cost: 90 },
  ],
}
