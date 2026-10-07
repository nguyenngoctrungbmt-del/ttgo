import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'goalie',
    title: 'Goal Keeper',
    blurb: 'Dive, parry and catch curlers, dippers and rockets in goal.',
    path: '/play/goalie',
    accent: '#16A34A',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Sports', 'Reflex', 'Arcade'],
    icon: '🧤',
    howTo: [
      'Drag anywhere to move your gloves — tap inside the goal to snap them there. The keeper dives on his own.',
      'Watch the striker and the shrinking target ring, then get your gloves on the ball. Dead-centre stops are clean catches.',
      'Every goal you concede costs a life. Strikers learn curlers, dippers, power shots, knuckle balls, fake-outs and double balls.',
      'Saves build a streak multiplier and fill FOCUS — tap it for slow motion. Upgrades add lives, bigger gloves and sharper reads.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['saves', 10, 'run', 'Make 10 saves in one game', 30],
    ['catches', 5, 'total', 'Catch 5 shots cleanly', 30],
    ['saves', 100, 'total', 'Make 100 saves in total', 40],
    ['round', 5, 'run', 'Reach round 5', 50],
    ['streak', 12, 'run', 'Save 12 shots in a row', 50],
    ['legends', 1, 'total', 'Beat a legend striker', 50],
    ['round', 10, 'run', 'Reach round 10', 80],
    ['catches', 150, 'total', 'Catch 150 shots in total', 80],
    ['saves', 1500, 'total', 'Make 1,500 saves in total', 100],
  ],
  upgrades: [
    { id: 'iron', icon: '❤️', label: 'Iron Wall', desc: '+1 life every game', max: 3, cost: 150 },
    { id: 'reach', icon: '🧤', label: 'Big Gloves', desc: '+12% save radius', max: 4, cost: 90 },
    { id: 'eyes', icon: '👁️', label: 'Sharp Eyes', desc: 'Target ring shows earlier, FOCUS starts charged', max: 4, cost: 70 },
  ],
}
