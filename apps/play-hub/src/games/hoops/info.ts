import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'hoops',
    title: 'Basket Flick',
    blurb: 'Flick swishes into a sliding hoop and catch fire before time runs out.',
    path: '/play/hoops',
    accent: '#EA580C',
    eta: '2–5 min',
    tag: 'Action',
    tags: ['Action', 'Sports', 'Arcade', 'Skill'],
    icon: '🏀',
    howTo: [
      'Swipe up from the ball to shoot: the direction aims, the swipe length sets the power.',
      'Every basket adds time to the clock. Swishes (no rim) add more — the run ends when time hits zero.',
      'Three swishes in a row sets you ON FIRE for double points. Gold balls are worth triple.',
      'Each level the hoop gets trickier: it slides, bobs, shrinks and the wind picks up. Upgrades add time, aim guides and longer fire.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-03',
  },
  missions: [
    ['baskets', 10, 'run', 'Score 10 baskets in one game', 30],
    ['swishes', 10, 'total', 'Hit 10 swishes', 30],
    ['baskets', 100, 'total', 'Score 100 baskets in total', 40],
    ['level', 5, 'run', 'Reach level 5', 50],
    ['fires', 3, 'total', 'Catch fire 3 times', 50],
    ['streak', 10, 'run', 'Score 10 baskets in a row', 50],
    ['baskets', 40, 'run', 'Score 40 baskets in one game', 80],
    ['swishes', 300, 'total', 'Hit 300 swishes in total', 80],
    ['baskets', 2000, 'total', 'Score 2,000 baskets in total', 100],
  ],
  upgrades: [
    { id: 'clock', icon: '⏱️', label: 'Overtime', desc: '+4 s on the starting clock', max: 4, cost: 80 },
    { id: 'guide', icon: '🎯', label: 'Aim Guide', desc: 'Longer trajectory preview while aiming', max: 3, cost: 120 },
    { id: 'hot', icon: '🔥', label: 'Hot Hand', desc: 'Fire mode lasts 3 s longer', max: 3, cost: 100 },
  ],
}
