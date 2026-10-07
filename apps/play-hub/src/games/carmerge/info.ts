import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'carmerge',
    title: 'Car Merge',
    blurb: 'Merge buggies into rocket cars and race them to beat every season.',
    path: '/play/carmerge',
    accent: '#E11D48',
    eta: '3–10 min',
    tag: 'Merge',
    tags: ['Merge', 'Idle', 'Racing'],
    icon: '🏎️',
    howTo: [
      'Drag a car onto an identical one to merge it into a faster, pricier model: buggy, hatchback, sedan… up to the rocket car.',
      'Cars in the top row (pit lanes) race the oval and earn cash every lap. Drag cars between the garage and the pit lanes; drop one on Buy to sell it.',
      'Each 60-second season has a cash target — miss it and the run ends. Targets rise, new pit lanes open and every 5th season is a Grand Prix.',
      'Tap the track for nitro, catch golden cars for gifts, and ride sponsor rushes. Coins buy a pit crew, engine tuning and sponsor bonuses.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-04',
  },
  missions: [
    ['seasons', 3, 'run', 'Clear 3 seasons', 30],
    ['merges', 30, 'total', 'Merge 30 cars', 30],
    ['best', 5, 'run', 'Build a Muscle Car', 40],
    ['seasons', 6, 'run', 'Clear 6 seasons', 50],
    ['laps', 2000, 'total', 'Drive 2,000 laps', 50],
    ['best', 8, 'run', 'Build a Supercar', 50],
    ['seasons', 10, 'run', 'Clear 10 seasons', 80],
    ['golden', 30, 'total', 'Catch 30 golden cars', 80],
    ['best', 11, 'run', 'Build a Jet Car', 100],
  ],
  upgrades: [
    { id: 'pitcrew', icon: '🔧', label: 'Pit Crew', desc: 'Start with an extra Hatchback', max: 3, cost: 110 },
    { id: 'tuning', icon: '⚙️', label: 'Engine Tuning', desc: '+8% speed for every car', max: 4, cost: 90 },
    { id: 'sponsor', icon: '🪙', label: 'Sponsor', desc: '+15% coins from each run', max: 5, cost: 70 },
  ],
}
