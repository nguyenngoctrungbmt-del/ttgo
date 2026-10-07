import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'archer',
    title: 'Sky Archer',
    blurb: 'Draw, aim and loose — pop balloons, birds and bullseyes in combos.',
    path: '/play/archer',
    accent: '#0EA5E9',
    eta: '3–8 min',
    tag: 'Action',
    tags: ['Action', 'Archery', 'Precision', 'Levels'],
    icon: '🏹',
    howTo: [
      'Drag back anywhere to draw the bow — the dots preview the arrow path. Release to loose.',
      'Complete each level’s goal: pop balloons, shoot birds, hit bullseyes and knock apples off heads. Never hit your friend!',
      'Arrows are limited. Multi-pops, bullseyes, hit streaks and golden targets refill your quiver. Watch the wind flag.',
      '30 hand-built levels, then endless ones. Earn up to 3 stars by using few arrows. Upgrades add arrows, a longer aim guide and more coins.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-03',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['balloons', 50, 'total', 'Pop 50 balloons in total', 30],
    ['bullseyes', 3, 'total', 'Hit 3 bullseyes', 40],
    ['level', 7, 'run', 'Reach level 7', 50],
    ['combo', 3, 'run', 'Pop 3 balloons with one arrow', 50],
    ['apples', 5, 'total', 'Shoot 5 apples off a head', 50],
    ['level', 15, 'run', 'Reach level 15', 80],
    ['balloons', 2000, 'total', 'Pop 2,000 balloons in total', 80],
    ['stars', 150, 'total', 'Earn 150 level stars', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'quiver', icon: '🏹', label: 'Big Quiver', desc: '+2 arrows at the start of a run', max: 4, cost: 70 },
    { id: 'sight', icon: '🎯', label: 'Eagle Sight', desc: 'Longer aiming guide', max: 3, cost: 110 },
    { id: 'bounty', icon: '🪙', label: 'Bounty', desc: '+15% coins from each run', max: 5, cost: 80 },
  ],
}
