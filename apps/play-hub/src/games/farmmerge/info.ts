import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'farmmerge',
    title: 'Farm Merge',
    blurb: 'Grow, merge and bake your way through busy farm days.',
    path: '/play/farmmerge',
    accent: '#65A30D',
    eta: '4–10 min',
    tag: 'Merge',
    tags: ['Merge', 'Casual', 'Strategy'],
    icon: '🌾',
    howTo: [
      'Tap a generator (seed bag, chicken coop, apple tree, flower pot) to spend 1 energy and grow an item. Energy refills over time.',
      'Drag two identical items together to merge them: seed, sprout, wheat… bread, cake. Drag anything to the bin to clear space.',
      'Animals post orders at the top — drag the right item onto a card to deliver it. Fill the day’s order goal before sunset or the run ends.',
      'Orders refund energy and can drop gift boxes and wild stars (upgrade any item). New generators, rain and market rushes arrive on later days.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-04',
  },
  missions: [
    ['days', 2, 'run', 'Finish day 2', 30],
    ['merges', 40, 'total', 'Merge 40 items', 30],
    ['orders', 10, 'total', 'Fill 10 orders', 40],
    ['days', 4, 'run', 'Finish day 4', 50],
    ['best', 7, 'run', 'Bake Bread', 50],
    ['orders', 100, 'total', 'Fill 100 orders', 50],
    ['days', 7, 'run', 'Finish day 7', 80],
    ['merges', 3000, 'total', 'Merge 3,000 items', 80],
    ['best', 9, 'run', 'Bake a Grand Cake', 100],
  ],
  upgrades: [
    { id: 'energy', icon: '⚡', label: 'Big Barn', desc: '+5 max energy', max: 4, cost: 80 },
    { id: 'regen', icon: '☀️', label: 'Sunny Days', desc: 'Energy refills 10% faster', max: 4, cost: 100 },
    { id: 'bounty', icon: '🪙', label: 'Market Stall', desc: '+15% coins from each run', max: 5, cost: 70 },
  ],
}
