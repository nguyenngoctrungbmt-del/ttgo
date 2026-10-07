import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'sumo',
    title: 'Sumo Push',
    blurb: 'Shove, charge and sidestep rivals out of a shrinking sumo ring.',
    path: '/play/sumo',
    accent: '#BE123C',
    eta: '3–7 min',
    tag: 'Action',
    tags: ['Action', 'Sports', 'Versus', 'Physics'],
    icon: '🤼',
    howTo: [
      'Drag anywhere to move your wrestler. Hold your finger still to build a charge, release to dash at your rival.',
      'Push your rival out of the ring to win the bout — best of 3 wins the match. The ring shrinks the longer a bout lasts.',
      'Rivals have weight and tricks: pushers, heavyweights, chargers that glow before dashing, and sidesteppers that dodge your charge.',
      '20 rivals in 8 venues — every 5th is a Yokozuna with a signature move. Stars: win, 2–0 sweep, a charge win. Replay beaten rivals from the map.',
    ],
    isNew: true,
    popularity: 86,
    addedAt: '2026-10-03',
  },
  missions: [
    ['bouts', 3, 'total', 'Win 3 bouts', 30],
    ['stage', 2, 'run', 'Beat your first rival', 30],
    ['charges', 5, 'total', 'Win 5 bouts with a charge', 40],
    ['stage', 4, 'run', 'Reach the 4th rival', 50],
    ['sweeps', 5, 'total', 'Win 5 matches 2–0', 50],
    ['bouts', 40, 'total', 'Win 40 bouts in total', 50],
    ['bosses', 1, 'total', 'Defeat the Yokozuna', 80],
    ['stage', 10, 'run', 'Reach the 10th rival', 80],
    ['bouts', 300, 'total', 'Win 300 bouts in total', 100],
  ],
  levels: { authored: 20, bossEvery: 5 },
  upgrades: [
    { id: 'mass', icon: '🍙', label: 'Heavyweight', desc: '+10% body mass — harder to shove', max: 4, cost: 90 },
    { id: 'dash', icon: '⚡', label: 'Thunder Charge', desc: 'Charge fills faster and hits 15% harder', max: 4, cost: 80 },
    { id: 'grip', icon: '🦶', label: 'Iron Feet', desc: 'Dig in harder at the edge of the ring', max: 3, cost: 120 },
  ],
}
