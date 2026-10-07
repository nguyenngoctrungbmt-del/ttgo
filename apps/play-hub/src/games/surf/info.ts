import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'surf',
    title: 'Wave Surfer',
    blurb: 'Pump the wave face, flip off the lip, and outrun the closing curl.',
    path: '/play/surf',
    accent: '#0891B2',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Sports', 'One-touch', 'Arcade'],
    icon: '🏄',
    howTo: [
      'Hold to carve up the wave face, release to drop. Dropping down the face builds speed — pump up and down to go faster.',
      'Hit the lip with speed to launch. Hold in the air to flip, let go to straighten, and land upright for big points.',
      'The breaking curl chases you — if it catches you, the run ends. Rocks, buoys, surfers, sharks, gulls and, further out, whirlpools, jet-skis, diving pelicans and the Kraken cost a board.',
      'Ride just ahead of the curl for a BARREL bonus. Grab coins, pearls, shields, turbo, magnets and stars; upgrade Spare Board, Pro Fins and Grip Wax.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['distance', 500, 'run', 'Surf 500 m in one run', 30],
    ['tricks', 5, 'total', 'Land 5 flips in total', 30],
    ['coins', 100, 'total', 'Collect 100 coins in total', 40],
    ['distance', 1500, 'run', 'Surf 1,500 m in one run', 50],
    ['barrels', 3, 'total', 'Ride 3 barrels', 50],
    ['tricks', 5, 'run', 'Land 5 flips in one run', 50],
    ['distance', 3500, 'run', 'Surf 3,500 m in one run', 80],
    ['barrels', 30, 'total', 'Ride 30 barrels in total', 80],
    ['tricks', 500, 'total', 'Land 500 flips in total', 100],
  ],
  upgrades: [
    { id: 'board', icon: '🏄', label: 'Spare Board', desc: '+1 board (survive one more wipeout)', max: 2, cost: 150 },
    { id: 'fins', icon: '🦈', label: 'Pro Fins', desc: '+6% speed and pumping power', max: 4, cost: 90 },
    { id: 'wax', icon: '🧴', label: 'Grip Wax', desc: 'Easier landings, +15% trick points', max: 3, cost: 80 },
  ],
}
