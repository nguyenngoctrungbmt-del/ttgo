import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'sandcastle',
    title: 'Sandcastle',
    blurb: 'Raise towers, dig moats and outlast every bigger tide.',
    path: '/play/sandcastle',
    accent: '#EAB308',
    eta: '3–8 min',
    tag: 'Building',
    tags: ['Building', 'Strategy', 'Casual'],
    icon: '🏖️',
    howTo: [
      'Drag a piece from the tray onto the beach (or tap a piece, then tap a column). Sand stacks where you drop it, but loose sand slumps off a column more than 4 above its neighbours.',
      'When the tide meter fills, a wave rolls in from the sea and erodes sand from the bottom up. Your tallest tower must reach the goal line or you lose a heart.',
      'Packed walls soak up wave power, moats (shovel) swallow water and stop crabs, wet buckets harden a whole column. Shells and flags that survive pay bonus points.',
      'Tap seagulls before they steal decorations and flip crabs before they pinch your walls. Every 5th tide is a rogue wave. Coins buy stronger sand, bigger buckets and bonus coins.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-04',
  },
  missions: [
    ['tide', 3, 'run', 'Survive 3 tides', 30],
    ['height', 5, 'run', 'Build a tower 5 high', 30],
    ['blocks', 150, 'total', 'Place 150 sand blocks', 40],
    ['tide', 6, 'run', 'Survive 6 tides', 50],
    ['shells', 25, 'total', 'Save shells from 25 waves', 50],
    ['critters', 20, 'total', 'Shoo 20 gulls or crabs', 50],
    ['tide', 11, 'run', 'Survive 11 tides', 80],
    ['height', 11, 'run', 'Build a tower 11 high', 80],
    ['blocks', 2500, 'total', 'Place 2,500 sand blocks', 100],
  ],
  upgrades: [
    { id: 'pack', icon: '🧱', label: 'Packed Sand', desc: 'Walls take +1 more wave hit', max: 3, cost: 120 },
    { id: 'bucket', icon: '🪣', label: 'Big Bucket', desc: '+1 piece every tide', max: 4, cost: 90 },
    { id: 'bounty', icon: '🪙', label: 'Beachcomber', desc: '+15% coins from each run', max: 5, cost: 70 },
  ],
}
