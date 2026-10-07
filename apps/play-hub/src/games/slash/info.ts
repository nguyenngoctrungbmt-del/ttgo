import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'slash',
    title: 'Blade Slash',
    blurb: 'Swipe to slice flying fruit, chain combos, and dodge the bombs.',
    path: '/play/slash',
    accent: '#DC2626',
    eta: '1–3 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Quick'],
    icon: '🗡️',
    howTo: [
      'Swipe across the screen to slash fruit as it flies up.',
      'Slice 3+ fruit in one swipe for a combo bonus.',
      'Let a fruit fall and you lose a life. Slashing a bomb costs one too.',
      'Specials: ⭐ frenzy, ❄️ slow-mo, 💖 extra life. Hit the Golden Melon again and again. Upgrades add lives and luck.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-03',
  },
  missions: [
    ['sliced', 30, 'run', 'Slice 30 fruit in one run', 30],
    ['combo', 3, 'run', 'Land a 3-fruit combo', 30],
    ['sliced', 100, 'total', 'Slice 100 fruit in total', 40],
    ['score', 80, 'run', 'Score 80 in one run', 50],
    ['combo', 4, 'run', 'Land a 4-fruit combo', 50],
    ['specials', 5, 'total', 'Grab 5 specials (⭐ ❄️ 💖)', 50],
    ['score', 200, 'run', 'Score 200 in one run', 80],
    ['combo', 5, 'run', 'Land a 5-fruit combo', 80],
    ['sliced', 1000, 'total', 'Slice 1,000 fruit in total', 100],
  ],
  upgrades: [
    { id: 'vital', icon: '❤️', label: 'Thick Skin', desc: '+1 starting and max life', max: 3, cost: 140 },
    { id: 'lucky', icon: '⭐', label: 'Lucky Orchard', desc: '+30% chance of specials', max: 4, cost: 80 },
    { id: 'bounty', icon: '🪙', label: 'Bounty', desc: '+15% coins from each run', max: 5, cost: 90 },
  ],
}
