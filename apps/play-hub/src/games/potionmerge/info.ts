import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'potionmerge',
    title: 'Potion Shop',
    blurb: 'Merge herbs and crystals, brew magic potions and keep customers happy.',
    path: '/play/potionmerge',
    accent: '#7C3AED',
    eta: '3–10 min',
    tag: 'Merge',
    tags: ['Merge', 'Casual', 'Magic'],
    icon: '🧪',
    howTo: [
      'Ingredients appear on the table. Drag two identical ones together to merge them: leaf to sprig to herb bundle, shard to gem, and more.',
      'Drop two different ingredients into the cauldron to brew a potion — higher-tier ingredients brew stronger potions. Identical potions merge too.',
      'Customers ask for a potion or ingredient. Drag it to them before their patience runs out — three upset customers close the shop.',
      'Wisps upgrade any item, hourglasses freeze patience, VIPs pay triple. Feed clutter to the cat. Coins buy patience, faster ingredients and bonus coins.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-04',
  },
  missions: [
    ['served', 8, 'run', 'Serve 8 customers in a run', 30],
    ['merges', 40, 'total', 'Merge 40 items', 30],
    ['best', 4, 'run', 'Brew a Love Potion', 40],
    ['served', 25, 'run', 'Serve 25 customers in a run', 50],
    ['brews', 200, 'total', 'Brew 200 potions', 50],
    ['best', 7, 'run', 'Brew a Storm Tonic', 50],
    ['served', 50, 'run', 'Serve 50 customers in a run', 80],
    ['served', 600, 'total', 'Serve 600 customers', 80],
    ['best', 10, 'run', 'Brew a Rainbow Panacea', 100],
  ],
  upgrades: [
    { id: 'patience', icon: '⏳', label: 'Cozy Shop', desc: 'Customers wait 10% longer', max: 4, cost: 90 },
    { id: 'basket', icon: '🧺', label: 'Forager', desc: 'Ingredients appear 8% faster', max: 4, cost: 100 },
    { id: 'bounty', icon: '🪙', label: 'Gold Till', desc: '+15% coins from each run', max: 5, cost: 70 },
  ],
}
