import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'catapult',
    title: 'Castle Crash',
    blurb: 'Fling boulders, topple towers and knock out every guard.',
    path: '/play/catapult',
    accent: '#A16207',
    eta: '3–8 min',
    tag: 'Action',
    tags: ['Action', 'Physics', 'Aim', 'Puzzle'],
    icon: '🪨',
    howTo: [
      'Drag back from anywhere and release to fling a boulder — the dotted arc shows your launch.',
      'Knock out every goblin guard to clear the level. Spare shots earn bonus points and stars.',
      '32 hand-built castles: glass shatters, wood splinters, stone takes a beating, red crates explode. Every 5th castle a king hides on top.',
      'New ammo unlocks as you go: tap mid-air to split, slam or detonate. Upgrades add reserve shots, power and a longer aim guide.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-03',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['guards', 25, 'total', 'Knock out 25 guards', 30],
    ['blocks', 150, 'total', 'Smash 150 blocks in total', 40],
    ['level', 7, 'run', 'Reach level 7', 50],
    ['stars3', 5, 'total', 'Earn 3 stars on 5 levels', 50],
    ['bosses', 1, 'total', 'Topple a castle king', 50],
    ['level', 15, 'run', 'Reach level 15', 80],
    ['guards', 600, 'total', 'Knock out 600 guards', 80],
    ['blocks', 4000, 'total', 'Smash 4,000 blocks in total', 100],
  ],
  levels: { authored: 32, bossEvery: 5 },
  upgrades: [
    { id: 'reserve', icon: '🪨', label: 'Reserve Pile', desc: '+1 spare boulder when a level runs dry', max: 3, cost: 140 },
    { id: 'power', icon: '💥', label: 'Heavy Hitter', desc: '+15% impact and blast damage', max: 4, cost: 90 },
    { id: 'scope', icon: '🎯', label: 'Eagle Eye', desc: 'Longer dotted aim guide', max: 3, cost: 70 },
  ],
}
