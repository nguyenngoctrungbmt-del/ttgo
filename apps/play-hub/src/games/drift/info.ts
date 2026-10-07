import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'drift',
    title: 'Drift King',
    blurb: 'One-touch drifting: hold into the bend, hit apex gates, stay on track.',
    path: '/play/drift',
    accent: '#E11D48',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Racing', 'One-touch', 'Skill'],
    icon: '🏁',
    howTo: [
      'Your car drives itself. Hold anywhere to drift into the next bend, release to straighten out.',
      'Drift through the glowing apex gates to raise your multiplier — drift points bank when you straighten.',
      'Rumble strips reset your multiplier and leaving the track is a crash. Later come cones, oil, rolling barrels and spark mines — grab nitro to smash through.',
      'Checkpoints speed you up and change scenery; overtake rival ghosts for +500 and survive Drift Frenzy for big bonuses. Upgrades: Wide Track, Tow Truck, Head Start.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-03',
  },
  missions: [
    ['corners', 10, 'run', 'Clear 10 corners in one run', 30],
    ['gates', 15, 'total', 'Drift through 15 apex gates', 30],
    ['checkpoints', 8, 'total', 'Pass 8 checkpoints in total', 40],
    ['corners', 30, 'run', 'Clear 30 corners in one run', 50],
    ['mult', 6, 'run', 'Reach a x6 multiplier', 50],
    ['overtakes', 3, 'total', 'Overtake 3 rival ghosts', 50],
    ['corners', 60, 'run', 'Clear 60 corners in one run', 80],
    ['score', 25000, 'run', 'Score 25,000 in one run', 80],
    ['gates', 1000, 'total', 'Drift through 1,000 gates', 100],
  ],
  upgrades: [
    { id: 'wide', icon: '🛣️', label: 'Wide Track', desc: 'Track is 6% wider per level', max: 4, cost: 90 },
    { id: 'tow', icon: '🚚', label: 'Tow Truck', desc: 'Get towed back after 1 crash per run', max: 2, cost: 150 },
    { id: 'mult', icon: '✖️', label: 'Head Start', desc: 'Start every run with +1 multiplier', max: 4, cost: 80 },
  ],
}
