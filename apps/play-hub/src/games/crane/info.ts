import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'crane',
    title: 'Crane Tower',
    blurb: 'Drop swinging floors from the crane and build the tallest tower.',
    path: '/play/crane',
    accent: '#F59E0B',
    eta: '2–6 min',
    tag: 'Building',
    tags: ['Building', 'Timing', 'Arcade'],
    icon: '🏗️',
    howTo: [
      'Tap anywhere to drop the floor swinging from the crane onto your tower.',
      'Overhangs get trimmed off and make the tower sway; PERFECT drops keep the width, chain combos and move more residents in.',
      'A missed floor costs a hard hat. Lose them all, or let the SWAY meter fill, and the tower topples.',
      'Watch for wind gusts, heavy concrete and a drifting trolley. Pick a site perk every 10 floors; gardens calm the tower.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-04',
  },
  missions: [
    ['floors', 10, 'run', 'Build a 10-floor tower', 30],
    ['perfects', 15, 'total', 'Land 15 perfect drops', 30],
    ['residents', 300, 'total', 'House 300 residents', 40],
    ['floors', 25, 'run', 'Build a 25-floor tower', 50],
    ['combo', 6, 'run', 'Chain 6 perfect drops', 50],
    ['gardens', 6, 'total', 'Place 6 rooftop gardens', 50],
    ['floors', 50, 'run', 'Reach the night sky: 50 floors', 80],
    ['combo', 12, 'run', 'Chain 12 perfect drops', 80],
    ['residents', 6000, 'total', 'House 6,000 residents', 100],
  ],
  upgrades: [
    { id: 'steady', icon: '🧲', label: 'Steady Crane', desc: 'Smaller swing and 10% less sway per level', max: 4, cost: 90 },
    { id: 'hats', icon: '⛑️', label: 'Hard Hats', desc: '+1 hard hat (missed floor) per run', max: 3, cost: 140 },
    { id: 'guide', icon: '📐', label: 'Laser Guide', desc: 'Wider PERFECT window', max: 4, cost: 80 },
  ],
}
