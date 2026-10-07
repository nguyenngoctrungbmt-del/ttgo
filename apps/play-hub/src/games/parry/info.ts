import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'parry',
    title: 'Samurai Parry',
    blurb: 'Read the strike, parry on the beat, and cut down every challenger.',
    path: '/play/parry',
    accent: '#E11D48',
    eta: '1–4 min',
    tag: 'Action',
    tags: ['Action', 'Reflex', 'Rhythm', 'Focus'],
    icon: '⚔️',
    howTo: [
      'Foes walk up and wind up a strike — a ring shrinks around your blade.',
      'Tap as the ring closes: dead-on is a PERFECT counter. Too early and you stumble; red rings are feints.',
      'Foes soon come from both sides — tap that half. Ninjas throw stars, a Shogun comes every 10 kills.',
      'Spend coins on upgrades: extra hearts, a wider PERFECT window and bonus coins.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['kills', 10, 'run', 'Defeat 10 foes in one run', 30],
    ['perfects', 5, 'run', 'Land 5 perfect parries in one run', 30],
    ['kills', 100, 'total', 'Defeat 100 foes in total', 40],
    ['streak', 8, 'run', 'Chain 8 perfect parries', 50],
    ['bosses', 1, 'total', 'Defeat a Shogun', 50],
    ['score', 150, 'run', 'Score 150 in one run', 50],
    ['kills', 50, 'run', 'Defeat 50 foes in one run', 80],
    ['streak', 20, 'run', 'Chain 20 perfect parries', 80],
    ['perfects', 500, 'total', 'Land 500 perfect parries in total', 100],
  ],
  upgrades: [
    { id: 'heart', icon: '❤️', label: 'Iron Will', desc: '+1 max heart', max: 3, cost: 150 },
    { id: 'focus', icon: '🎯', label: 'Focus', desc: '+15% wider PERFECT window', max: 4, cost: 100 },
    { id: 'bounty', icon: '🪙', label: 'Bounty', desc: '+15% coins from each run', max: 5, cost: 80 },
  ],
}
