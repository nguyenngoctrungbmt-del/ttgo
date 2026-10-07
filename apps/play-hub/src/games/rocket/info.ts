import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'rocket',
    title: 'Rocket Builder',
    blurb: 'Bolt together a rocket, launch, dodge the sky and reach the Moon.',
    path: '/play/rocket',
    accent: '#7C3AED',
    eta: '4–10 min',
    tag: 'Building',
    tags: ['Building', 'Arcade', 'Strategy'],
    icon: '🚀',
    howTo: [
      'In the hangar, tap or drag parts onto your rocket: engines, fuel tanks, nose cones, fins and side boosters. Watch the thrust, fuel and stability meters.',
      'Launch and drag left or right to steer. Dodge birds, planes, balloons, satellites and meteors; grab coins and fuel cans.',
      'When the boosters run dry, tap STAGE to drop them. Dropping right on time is a perfect staging bonus.',
      'Each flight has a target altitude: miss it and you lose a heart. Cash from every flight buys better parts. Coins buy seed funding, a tougher hull and bonus coins.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-04',
  },
  missions: [
    ['alt', 1000, 'run', 'Reach 1 km', 30],
    ['flights', 3, 'run', 'Hit 3 flight targets in a run', 30],
    ['coins', 100, 'total', 'Collect 100 coins in flight', 40],
    ['alt', 25000, 'run', 'Reach the stratosphere (25 km)', 50],
    ['staging', 10, 'total', 'Make 10 perfect stagings', 50],
    ['flights', 25, 'total', 'Hit 25 flight targets', 50],
    ['alt', 100000, 'run', 'Reach orbit (100 km)', 80],
    ['coins', 2000, 'total', 'Collect 2,000 coins in flight', 80],
    ['alt', 300000, 'run', 'Fly to the Moon (300 km)', 100],
  ],
  upgrades: [
    { id: 'seed', icon: '💵', label: 'Seed Funding', desc: '+40 starting cash per run', max: 4, cost: 100 },
    { id: 'hull', icon: '🛡️', label: 'Tough Hull', desc: '+1 hit your rocket can take', max: 3, cost: 130 },
    { id: 'bounty', icon: '🪙', label: 'Sponsors', desc: '+15% coins from each run', max: 5, cost: 70 },
  ],
}
