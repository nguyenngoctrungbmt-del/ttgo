import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'asteroids',
    title: 'Rock Blaster',
    blurb: 'Fly through an asteroid field, shatter rocks, and outgun UFOs.',
    path: '/play/asteroids',
    accent: '#4F46E5',
    eta: '2–5 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Space'],
    icon: '☄️',
    howTo: [
      'Touch and drag anywhere — the ship turns and thrusts toward your drag. It fires on its own.',
      'Big rocks split into smaller, faster rocks. Small rocks are worth the most.',
      'From wave 2, UFOs fly by and shoot back. Down them for +300 and a power-up.',
      'Power-ups: 🔱 triple shot, ⚡ rapid fire, 🛡️ shield. Crystal rocks drop two. From wave 4, dodge comets along the red warning lines.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['rocks', 40, 'run', 'Destroy 40 rocks in one run', 30],
    ['wave', 3, 'run', 'Reach wave 3', 30],
    ['rocks', 200, 'total', 'Destroy 200 rocks in total', 40],
    ['score', 1500, 'run', 'Score 1,500 in one run', 50],
    ['wave', 5, 'run', 'Reach wave 5', 50],
    ['ufos', 3, 'total', 'Shoot down 3 UFOs', 50],
    ['score', 4000, 'run', 'Score 4,000 in one run', 80],
    ['wave', 8, 'run', 'Reach wave 8', 80],
    ['rocks', 1500, 'total', 'Destroy 1,500 rocks in total', 100],
  ],
  upgrades: [
    { id: 'hull', icon: '🚀', label: 'Spare Ships', desc: '+1 ship at the start of each run', max: 3, cost: 150 },
    { id: 'cannon', icon: '🔫', label: 'Overclock', desc: '+12% fire rate', max: 4, cost: 90 },
    { id: 'surge', icon: '🔋', label: 'Power Cells', desc: 'Power-ups last 25% longer and drop more', max: 4, cost: 75 },
  ],
}
