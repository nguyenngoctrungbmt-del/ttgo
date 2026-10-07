import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'bmx',
    title: 'Hill Rider',
    blurb: 'Throttle over wild hills, flip in the air, and never run dry.',
    path: '/play/bmx',
    accent: '#CA8A04',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Physics', 'Racing', 'Skill'],
    icon: '🚵',
    howTo: [
      'Hold the right side for gas and the left side to brake (arrow keys on desktop).',
      'In the air, gas tilts you back and brake tilts you forward — spin all the way around for backflips and frontflips.',
      'Land on your wheels: if your head hits the ground you crash. Grab red fuel cans before the tank runs dry.',
      'Ride on to the Moon, Frozen Peaks and Lava Badlands: dodge rockfalls and fire vents, grab blue nitro, beat rival Blaze in races. Upgrade Fuel Tank, Engine and Helmet with coins.',
    ],
    isNew: true,
    popularity: 91,
    addedAt: '2026-10-03',
  },
  missions: [
    ['distance', 400, 'run', 'Ride 400 m in one run', 30],
    ['flips', 3, 'total', 'Land 3 flips', 30],
    ['coins', 250, 'total', 'Collect 250 coins in total', 40],
    ['distance', 1200, 'run', 'Ride 1,200 m in one run', 50],
    ['flips', 3, 'run', 'Land 3 flips in one run', 50],
    ['moon', 1, 'total', 'Reach the Moon', 50],
    ['distance', 3000, 'run', 'Ride 3,000 m in one run', 80],
    ['flips', 100, 'total', 'Land 100 flips in total', 80],
    ['distance', 50000, 'total', 'Ride 50 km in total', 100],
  ],
  upgrades: [
    { id: 'tank', icon: '⛽', label: 'Fuel Tank', desc: 'Fuel lasts 20% longer', max: 4, cost: 90 },
    { id: 'engine', icon: '⚙️', label: 'Engine', desc: '+8% power and top speed', max: 4, cost: 100 },
    { id: 'helmet', icon: '⛑️', label: 'Helmet', desc: 'Survive 1 head crash per run', max: 2, cost: 150 },
  ],
}
