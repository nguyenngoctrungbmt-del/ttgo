import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'bouncy',
    title: 'Bounce Up',
    blurb: 'Bounce from meadow to outer space on springs, hats and jetpacks.',
    path: '/play/bouncy',
    accent: '#F59E0B',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Climber', 'Endless'],
    icon: '🦘',
    howTo: [
      'You bounce automatically. Drag left or right (or hold a side of the screen) to steer; the screen wraps around.',
      'Climb as high as you can. Brown platforms crumble, blue ones move, white ones vanish after one bounce. Falling off the bottom ends the run.',
      'Stomp monsters from above or tap to shoot them; touching them from below hurts. Spiky ones can only be shot.',
      'Springs, trampolines, propeller hats, jetpacks and shields boost you. Upgrades give a rocket start, shields and more power-ups.',
    ],
    isNew: true,
    popularity: 91,
    addedAt: '2026-10-03',
  },
  missions: [
    ['height', 500, 'run', 'Climb 500 m in one run', 30],
    ['springs', 15, 'total', 'Bounce on 15 springs', 30],
    ['kills', 5, 'total', 'Defeat 5 monsters', 40],
    ['height', 1500, 'run', 'Climb 1,500 m in one run', 50],
    ['powerups', 15, 'total', 'Use 15 power-ups', 50],
    ['stomps', 30, 'total', 'Stomp 30 monsters', 50],
    ['height', 4500, 'run', 'Reach outer space (4,500 m)', 80],
    ['kills', 200, 'total', 'Defeat 200 monsters', 80],
    ['height', 50000, 'total', 'Climb 50,000 m in total', 100],
  ],
  upgrades: [
    { id: 'boost', icon: '🚀', label: 'Rocket Start', desc: 'Start with a jetpack (+1 s per level)', max: 4, cost: 100 },
    { id: 'shield', icon: '🛡️', label: 'Bubble Shield', desc: 'Start with +1 shield bubble', max: 3, cost: 140 },
    { id: 'luck', icon: '🍀', label: 'Lucky Finds', desc: '+20% springs and power-ups', max: 4, cost: 80 },
  ],
}
