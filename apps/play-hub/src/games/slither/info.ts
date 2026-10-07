import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'slither',
    title: 'Slither Arena',
    blurb: 'Grow a glowing worm, cut off rivals and feast on what they drop.',
    path: '/play/slither',
    accent: '#22C55E',
    eta: '3–10 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'IO', 'Endless'],
    icon: '🐛',
    howTo: [
      'Touch and drag anywhere to steer. Hold BOOST (or Space) to speed up — boosting burns length.',
      'Eat glowing pellets to grow. Rivals that crash into your body burst into food — swallow it!',
      'Never touch another worm with your head and stay away from the red arena wall.',
      'Grab power orbs (magnet, turbo, double, ghost) and hunt giant Titan worms. Upgrades add length and pull.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-03',
  },
  missions: [
    ['length', 150, 'run', 'Grow to length 150', 30],
    ['kills', 1, 'run', 'Cut off a rival worm', 30],
    ['food', 1000, 'total', 'Eat 1,000 pellets in total', 40],
    ['length', 500, 'run', 'Grow to length 500', 50],
    ['kills', 5, 'run', 'Cut off 5 worms in one run', 50],
    ['top', 1, 'total', 'Reach #1 on the leaderboard', 50],
    ['length', 1500, 'run', 'Grow to length 1,500', 80],
    ['titans', 3, 'total', 'Take down 3 Titan worms', 80],
    ['kills', 200, 'total', 'Cut off 200 worms in total', 100],
  ],
  upgrades: [
    { id: 'start', icon: '🐍', label: 'Head Start', desc: '+20 starting length', max: 4, cost: 80 },
    { id: 'magnet', icon: '🧲', label: 'Magnet Lips', desc: '+30% pellet pull radius', max: 4, cost: 70 },
    { id: 'turbo', icon: '⚡', label: 'Lean Boost', desc: 'Boosting burns 15% less length', max: 4, cost: 100 },
  ],
}
