import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'dogfight',
    title: 'Dogfight Ace',
    blurb: 'Out-turn enemy fighters, dodge missiles and down the enemy aces.',
    path: '/play/dogfight',
    accent: '#64748B',
    eta: '3–8 min',
    tag: 'Action',
    tags: ['Action', 'Shooter', 'Planes', 'Arcade'],
    icon: '✈️',
    howTo: [
      'Drag anywhere to steer — your fighter always flies forward and its guns fire automatically at anything in front of the nose.',
      'Shoot down every enemy in the wave. Red arrows on the screen edge point to planes out of view.',
      'When MISSILE LOCK flashes, tap FLARE to break the lock, or turn hard to out-run the missile. Every 5th wave an enemy ace attacks.',
      'Pick an upgrade after each wave, grab wrenches to repair and flare crates to restock. Buy permanent upgrades between runs.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-03',
  },
  missions: [
    ['wave', 3, 'run', 'Reach wave 3', 30],
    ['kills', 40, 'total', 'Shoot down 40 planes in total', 30],
    ['evades', 3, 'total', 'Evade 3 enemy missiles', 40],
    ['wave', 6, 'run', 'Reach wave 6', 50],
    ['aces', 2, 'total', 'Shoot down 2 enemy aces', 50],
    ['kills', 30, 'run', 'Shoot down 30 planes in one run', 50],
    ['wave', 12, 'run', 'Reach wave 12', 80],
    ['kills', 1500, 'total', 'Shoot down 1,500 planes in total', 80],
    ['aces', 20, 'total', 'Shoot down 20 enemy aces', 100],
  ],
  upgrades: [
    { id: 'armor', icon: '🛡️', label: 'Armored Hull', desc: '+1 max hull point', max: 3, cost: 120 },
    { id: 'flares', icon: '🎆', label: 'Flare Racks', desc: '+1 flare every wave', max: 3, cost: 80 },
    { id: 'guns', icon: '🔫', label: 'Gun Tuning', desc: 'Guns fire 10% faster', max: 4, cost: 100 },
  ],
}
