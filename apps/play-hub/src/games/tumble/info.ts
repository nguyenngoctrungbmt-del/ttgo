import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'tumble',
    title: 'Tumble Tower',
    blurb: 'Slide blocks out of the tower and stack them higher.',
    path: '/play/tumble',
    accent: '#A16207',
    eta: '3–7 min',
    tag: 'Building',
    tags: ['Building', 'Physics', 'Focus'],
    icon: '🪵',
    howTo: [
      'Press a block and drag to slide it out of the tower. You can’t take from the top two layers.',
      'Loose blocks glide; snug ones must be pulled slowly. Load-bearing blocks flash red: pull one and the tower falls.',
      'The block then hovers over the top. Tap to drop it on a free slot; PERFECT drops chain combos, sloppy ones make the tower sway.',
      'Tremors, cracked and golden blocks appear as you climb. Glue, X-ray and Slow-mo power-ups drop every 5 moves.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-04',
  },
  missions: [
    ['moves', 10, 'run', 'Stack 10 blocks in one run', 30],
    ['perfects', 10, 'total', 'Land 10 perfect drops', 30],
    ['moves', 100, 'total', 'Stack 100 blocks in total', 40],
    ['height', 18, 'run', 'Grow the tower to 18 layers', 50],
    ['golds', 5, 'total', 'Pull 5 golden blocks', 50],
    ['combo', 5, 'run', 'Chain 5 perfect drops', 50],
    ['height', 25, 'run', 'Grow the tower to 25 layers', 80],
    ['moves', 60, 'run', 'Stack 60 blocks in one run', 80],
    ['moves', 2000, 'total', 'Stack 2,000 blocks in total', 100],
  ],
  upgrades: [
    { id: 'hands', icon: '✋', label: 'Steady Hands', desc: '10% less wobble when pulling', max: 4, cost: 100 },
    { id: 'glue', icon: '🧴', label: 'Glue Stock', desc: '+1 glue per run', max: 3, cost: 130 },
    { id: 'eye', icon: '🪵', label: 'Sanded Blocks', desc: 'Blocks start 10% looser', max: 4, cost: 80 },
  ],
}
