import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'swing',
    title: 'Grapple Swing',
    blurb: 'Hook, swing, and fling yourself over lava and spinning saws.',
    path: '/play/swing',
    accent: '#EA580C',
    eta: '1–4 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Physics', 'Reflex'],
    icon: '🪝',
    howTo: [
      'Hold anywhere to fire your grapple at the glowing hook ahead. Release to let go and fly.',
      'Swing builds speed — let go on the up-swing at speed for a PERFECT launch boost.',
      'Grab gems along the arcs. Lava, spinning saws and leaping fireballs end the run.',
      'The cave changes every 250 m. Upgrades add grapple range, a gem magnet and a lava shield.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-03',
  },
  missions: [
    ['distance', 200, 'run', 'Swing 200 m in one run', 30],
    ['perfects', 3, 'run', 'Land 3 perfect launches in one run', 30],
    ['gems', 50, 'total', 'Collect 50 gems in total', 40],
    ['distance', 500, 'run', 'Swing 500 m in one run', 50],
    ['perfects', 10, 'run', 'Land 10 perfect launches in one run', 50],
    ['gems', 300, 'total', 'Collect 300 gems in total', 50],
    ['distance', 1200, 'run', 'Swing 1,200 m in one run', 80],
    ['perfects', 25, 'run', 'Land 25 perfect launches in one run', 80],
    ['gems', 1500, 'total', 'Collect 1,500 gems in total', 100],
  ],
  upgrades: [
    { id: 'range', icon: '🪝', label: 'Long Line', desc: '+12% grapple range', max: 4, cost: 90 },
    { id: 'magnet', icon: '🧲', label: 'Gem Magnet', desc: 'Pull nearby gems toward you', max: 4, cost: 80 },
    { id: 'shield', icon: '🛡️', label: 'Ember Shield', desc: 'Bounce off the lava once per run', max: 3, cost: 150 },
  ],
}
