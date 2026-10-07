import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'gravity',
    title: 'Gravity Flip',
    blurb: 'Tap to flip gravity — run the floor and ceiling past saws and gaps.',
    path: '/play/gravity',
    accent: '#7C3AED',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Reflex', 'One-touch', 'Endless'],
    icon: '🔄',
    howTo: [
      'Your robot runs by itself. Tap anywhere to flip gravity and swoop between the floor and the ceiling.',
      'Avoid spikes, saws, drones, laser gates, crushers and rockets. If a gap opens under you, flip before you fall out.',
      'Flip at the last moment to dodge a hazard for a NEAR MISS; chain them for combo bonus orbs. Grab a Phase Core to smash through hazards.',
      'Speed ramps up, new hazards arrive every ~30 s and the zone changes every 500 m. Survive the Sentinel boss for big rewards. Upgrades add shields, a magnet and a gentler ramp.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['dist', 300, 'run', 'Run 300 m in one run', 30],
    ['orbs', 40, 'total', 'Collect 40 orbs', 30],
    ['flips', 200, 'total', 'Flip gravity 200 times', 40],
    ['dist', 1000, 'run', 'Run 1,000 m in one run', 50],
    ['near', 30, 'total', 'Get 30 near misses', 50],
    ['combo', 5, 'run', 'Reach a x5 near-miss combo', 50],
    ['dist', 2500, 'run', 'Run 2,500 m in one run', 80],
    ['orbs', 1500, 'total', 'Collect 1,500 orbs', 80],
    ['dist', 25000, 'total', 'Run 25,000 m in total', 100],
  ],
  upgrades: [
    { id: 'shield', icon: '🛡️', label: 'Bubble Shield', desc: 'Survive +1 hit per run', max: 3, cost: 150 },
    { id: 'magnet', icon: '🧲', label: 'Orb Magnet', desc: 'Pull in orbs from further away', max: 4, cost: 70 },
    { id: 'slow', icon: '🐢', label: 'Steady Pace', desc: 'Speed ramps up 10% slower', max: 3, cost: 110 },
  ],
}
