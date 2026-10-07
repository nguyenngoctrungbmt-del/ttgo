import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'pulse',
    title: 'Pulse Dash',
    blurb: 'Auto-run to the beat — jump spikes, hit orbs and flip gravity.',
    path: '/play/pulse',
    accent: '#9333EA',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Rhythm', 'Reflex', 'Endless'],
    icon: '🟪',
    howTo: [
      'Your cube runs by itself. Tap or hold to jump; holding keeps jumping as soon as you land.',
      'Spikes and the sides of blocks are deadly — land on top of blocks. Falling into a gap ends the run.',
      'Yellow pads launch you high, tap yellow orbs in mid-air to jump again, portals flip gravity or turn you into a ship (hold to rise).',
      '30 hand-built stages teach and remix each mechanic (a boss stage every 5th), then an endless remix. Stars: clear, no Guardian save, every gem.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-03',
  },
  missions: [
    ['stage', 2, 'run', 'Reach stage 2', 30],
    ['gems', 30, 'total', 'Collect 30 gems', 30],
    ['jumps', 300, 'total', 'Jump 300 times', 40],
    ['stage', 4, 'run', 'Reach stage 4', 50],
    ['orbs', 40, 'total', 'Hit 40 jump orbs', 50],
    ['ship', 3, 'total', 'Clear 3 ship sections', 50],
    ['stage', 7, 'run', 'Reach stage 7', 80],
    ['gems', 600, 'total', 'Collect 600 gems', 80],
    ['dist', 20000, 'total', 'Dash 20,000 tiles in total', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'guard', icon: '🛡️', label: 'Guardian', desc: 'Survive +1 crash per run', max: 3, cost: 150 },
    { id: 'magnet', icon: '💎', label: 'Gem Magnet', desc: 'Grab gems from further away', max: 4, cost: 70 },
    { id: 'bounty', icon: '🪙', label: 'Bounty', desc: '+20% coins from each run', max: 5, cost: 90 },
  ],
}
