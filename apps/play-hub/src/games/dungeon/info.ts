import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'dungeon',
    title: 'Dungeon Dash',
    blurb: 'Slash through torch-lit rooms, grab perks and topple floor bosses.',
    path: '/play/dungeon',
    accent: '#57534E',
    eta: '3–10 min',
    tag: 'Action',
    tags: ['Action', 'Roguelike', 'Adventure', 'Reflex'],
    icon: '🏰',
    howTo: [
      'Drag anywhere to move. Your sword swings automatically at nearby monsters — or tap the sword button to strike.',
      'Tap the roll button to dodge with a burst of invincibility. Watch for red warnings: archers aim, knights wind up, bosses charge.',
      'Doors lock until a room is clear. Each floor is a level of hand-built rooms ending in a guardian room — every 5th floor holds a boss. Fewer hits earn more stars.',
      'Open chests to pick 1 of 3 perks: more damage, extra hearts, spin attacks, wave slashes, lifesteal and more.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-03',
  },
  missions: [
    ['rooms', 5, 'run', 'Clear 5 rooms in one run', 30],
    ['kills', 100, 'total', 'Defeat 100 monsters', 30],
    ['bosses', 1, 'total', 'Defeat a floor boss', 40],
    ['floor', 3, 'run', 'Reach floor 3', 50],
    ['perks', 20, 'total', 'Collect 20 perks', 50],
    ['kills', 60, 'run', 'Defeat 60 monsters in one run', 50],
    ['floor', 6, 'run', 'Reach floor 6', 80],
    ['bosses', 10, 'total', 'Defeat 10 bosses in total', 80],
    ['kills', 3000, 'total', 'Defeat 3,000 monsters in total', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'vigor', icon: '❤️', label: 'Vigor', desc: '+1 max heart', max: 3, cost: 150 },
    { id: 'whet', icon: '⚔️', label: 'Whetstone', desc: '+25% sword damage', max: 4, cost: 100 },
    { id: 'scout', icon: '🎁', label: 'Relic Hunter', desc: 'Start each run with +1 random perk', max: 3, cost: 140 },
  ],
}
