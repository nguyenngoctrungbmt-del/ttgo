import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'mech',
    title: 'Mech Survivor',
    blurb: 'Survive 10 minutes of swarms while your auto-weapons level and evolve.',
    path: '/play/mech',
    accent: '#475569',
    eta: '5–12 min',
    tag: 'Action',
    tags: ['Action', 'Survivor', 'Roguelite', 'Endless'],
    icon: '🤖',
    howTo: [
      'Drag anywhere (or WASD / arrows) to walk your mech. Weapons aim and fire on their own.',
      'Collect XP gems to level up, then pick a new weapon, a weapon level or a passive part.',
      'A max-level weapon plus its matching part evolves when you open a chest — elites drop chests every minute.',
      'Dodge mortar circles, tesla beams and meteor showers. Bosses arrive at 5:00 and 10:00 — beat the Overlord to win, then try endless mode and the Colossus.',
    ],
    isNew: true,
    popularity: 92,
    addedAt: '2026-10-03',
  },
  missions: [
    ['time', 180, 'run', 'Survive 3 minutes', 30],
    ['kills', 500, 'total', 'Destroy 500 enemies in total', 30],
    ['level', 10, 'run', 'Reach mech level 10', 40],
    ['bosses', 1, 'total', 'Defeat the 5-minute Warden', 50],
    ['evolutions', 1, 'total', 'Evolve a weapon', 50],
    ['kills', 1000, 'run', 'Destroy 1,000 enemies in a run', 50],
    ['wins', 1, 'total', 'Survive all 10 minutes', 80],
    ['evolutions', 10, 'total', 'Evolve 10 weapons in total', 80],
    ['kills', 30000, 'total', 'Destroy 30,000 enemies in total', 100],
  ],
  upgrades: [
    { id: 'armor', icon: '🛡️', label: 'Reinforced Hull', desc: '+15 max hull HP', max: 5, cost: 80 },
    { id: 'power', icon: '💥', label: 'Power Core', desc: '+8% weapon damage', max: 5, cost: 100 },
    { id: 'magnet', icon: '🧲', label: 'Tractor Beam', desc: '+20% gem pickup radius', max: 4, cost: 60 },
  ],
}
