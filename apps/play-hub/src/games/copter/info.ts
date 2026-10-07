import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'copter',
    title: 'Copter Cave',
    blurb: 'Hold to rise, release to dip through ice, lava and crystal caves.',
    path: '/play/copter',
    accent: '#0D9488',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'One-touch', 'Endless'],
    icon: '🚁',
    howTo: [
      'Hold anywhere to lift the helicopter; release to dip. Momentum matters, so feather your touch.',
      'Do not touch the cave walls, floating rocks, crusher pillars, bats or falling stalactites (they shake before they drop).',
      'Fuel drains as you fly. Grab green fuel cans to refill and gems for bonus coins.',
      'The cave narrows and a new biome begins every 600 m. Upgrades give a bigger tank, armor and a gem magnet.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-03',
  },
  missions: [
    ['dist', 300, 'run', 'Fly 300 m in one run', 30],
    ['gems', 50, 'total', 'Collect 50 gems', 30],
    ['fuel', 5, 'total', 'Pick up 5 fuel cans', 40],
    ['dist', 800, 'run', 'Fly 800 m in one run', 50],
    ['close', 15, 'total', 'Get 15 close calls', 50],
    ['gems', 60, 'run', 'Collect 60 gems in one run', 50],
    ['biome', 4, 'run', 'Reach the Crystal Cave', 80],
    ['gems', 1500, 'total', 'Collect 1,500 gems', 80],
    ['dist', 20000, 'total', 'Fly 20,000 m in total', 100],
  ],
  upgrades: [
    { id: 'tank', icon: '⛽', label: 'Big Tank', desc: 'Fuel drains 12% slower', max: 4, cost: 80 },
    { id: 'armor', icon: '🛡️', label: 'Rotor Armor', desc: 'Survive +1 crash per run', max: 3, cost: 150 },
    { id: 'magnet', icon: '💎', label: 'Gem Magnet', desc: 'Pull in gems from further away', max: 4, cost: 70 },
  ],
}
