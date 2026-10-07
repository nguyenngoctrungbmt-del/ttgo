import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'helix',
    title: 'Helix Drop',
    blurb: 'Spin the tower, drop through gaps and smash rings as a fireball.',
    path: '/play/helix',
    accent: '#DB2777',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Casual', 'Endless'],
    icon: '🌀',
    howTo: [
      'Drag left or right to spin the tower. The ball bounces on its own — line up a gap to drop through.',
      'Reach the golden pad to clear the level: 30 hand-built towers, then endless ones. Stars: clear it, take no red hit, grab every gem.',
      'Red segments are deadly. Later rings spin by themselves and some red blinks on and off — watch the flicker.',
      'Fall through 3 rings in a row to become a fireball that smashes the next ring, even red. Collect gems; upgrades add shields and bigger smashes.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-03',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['rings', 100, 'total', 'Drop through 100 rings', 30],
    ['smashes', 10, 'total', 'Smash 10 rings as a fireball', 40],
    ['level', 6, 'run', 'Reach level 6', 50],
    ['gems', 50, 'total', 'Collect 50 gems', 50],
    ['rings', 120, 'run', 'Pass 120 rings in one run', 50],
    ['level', 11, 'run', 'Reach level 11', 80],
    ['smashes', 250, 'total', 'Smash 250 rings as a fireball', 80],
    ['rings', 5000, 'total', 'Drop through 5,000 rings', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'shield', icon: '🛡️', label: 'Bubble Shield', desc: 'Survive 1 more red hit per run', max: 3, cost: 140 },
    { id: 'blaze', icon: '🔥', label: 'Blaze', desc: 'Fireball smashes +1 extra ring', max: 3, cost: 100 },
    { id: 'gems', icon: '💎', label: 'Gem Hunter', desc: 'More gems, +15% coins', max: 4, cost: 70 },
  ],
}
