import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'miner',
    title: 'Gold Claw',
    blurb: 'Drop the swinging claw, haul up gold and beat the clock.',
    path: '/play/miner',
    accent: '#B45309',
    eta: '3–10 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Timing', 'Casual'],
    icon: '⛏️',
    howTo: [
      'The claw swings like a pendulum — tap to drop it. Heavy gold and rocks reel in slowly; diamonds are light and pricey.',
      'Earn each mine’s money target before the timer ends (30 hand-built mines, then endless). Tap Next once it is met for a time bonus.',
      'TNT barrels blow up everything nearby. Moles wander and some carry diamonds. Mystery bags hide cash, dynamite or strength.',
      'Spend your cash at the Trading Post between levels: dynamite (blast a bad catch), strength tonic, lucky clover and more.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-03',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['diamonds', 5, 'total', 'Grab 5 diamonds', 30],
    ['money', 5000, 'total', 'Earn $5,000 in total', 40],
    ['level', 6, 'run', 'Reach level 6', 50],
    ['moles', 10, 'total', 'Catch 10 moles', 50],
    ['blasts', 10, 'total', 'Use 10 sticks of dynamite', 50],
    ['level', 12, 'run', 'Reach level 12', 80],
    ['diamonds', 100, 'total', 'Grab 100 diamonds', 80],
    ['money', 100000, 'total', 'Earn $100,000 in total', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'strong', icon: '💪', label: 'Strong Arms', desc: '+10% reel speed', max: 5, cost: 80 },
    { id: 'clock', icon: '⏱️', label: 'Overtime', desc: '+5 seconds every level', max: 4, cost: 100 },
    { id: 'kit', icon: '🧨', label: 'Demo Kit', desc: 'Start with +1 dynamite', max: 3, cost: 70 },
  ],
}
