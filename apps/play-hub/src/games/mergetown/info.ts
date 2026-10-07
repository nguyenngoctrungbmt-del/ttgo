import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'mergetown',
    title: 'Merge Town',
    blurb: 'Merge tents into castles and skyscrapers before the town fills up.',
    path: '/play/mergetown',
    accent: '#0D9488',
    eta: '3–10 min',
    tag: 'Building',
    tags: ['Building', 'Puzzle', 'Casual'],
    icon: '🏠',
    howTo: [
      'New buildings drop onto the board. Drag a building onto an identical one to merge it into the next tier: tent, hut, cottage, house, villa, tower, castle and beyond.',
      'Drag onto an empty plot to move. If a building drops when every plot is taken, the town is full and the run ends.',
      'Cranes upgrade any building one tier, bulldozers clear a plot. Storms shuffle a few buildings around. Quick merges build a combo.',
      'Big merges grow your town level: drops speed up and new seasons arrive. High tiers pay coins, which buy calmer skies, more cranes and bonus coins.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-04',
  },
  missions: [
    ['best', 5, 'run', 'Build a Villa', 30],
    ['merges', 50, 'total', 'Make 50 merges', 30],
    ['town', 3, 'run', 'Reach town level 3', 40],
    ['best', 7, 'run', 'Build a Castle', 50],
    ['merges', 500, 'total', 'Make 500 merges', 50],
    ['dozed', 30, 'total', 'Bulldoze 30 buildings', 50],
    ['best', 9, 'run', 'Build a Skyscraper', 80],
    ['town', 10, 'run', 'Reach town level 10', 80],
    ['merges', 5000, 'total', 'Make 5,000 merges', 100],
  ],
  upgrades: [
    { id: 'calm', icon: '🌤️', label: 'Calm Skies', desc: 'Buildings drop 6% slower', max: 4, cost: 90 },
    { id: 'crane', icon: '🏗️', label: 'Foreman', desc: 'Start with a crane; cranes come more often', max: 3, cost: 120 },
    { id: 'bounty', icon: '🪙', label: 'Mayor', desc: '+15% coins from each run', max: 5, cost: 70 },
  ],
}
