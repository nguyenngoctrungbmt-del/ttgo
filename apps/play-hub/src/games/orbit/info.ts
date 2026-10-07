import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'orbit',
    title: 'Orbit Guard',
    blurb: 'Swing a shield around your planet and smash incoming meteors.',
    path: '/play/orbit',
    accent: '#0284C7',
    eta: '1–4 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Space'],
    icon: '🪐',
    howTo: [
      'Drag anywhere — the shield swings to face your finger around the planet.',
      'Block meteors before they hit. Red ones are fast, purple ones take two hits, gold ones split.',
      'Green ✚ healers restore a heart — let them through instead of blocking them.',
      'Chain blocks for a multiplier; every 20 combo triggers Overdrive. Meteor showers hit from the red arc. Upgrades widen the shield.',
    ],
    isNew: true,
    popularity: 86,
    addedAt: '2026-10-03',
  },
  missions: [
    ['blocks', 40, 'run', 'Block 40 meteors in one run', 30],
    ['combo', 15, 'run', 'Reach a 15 combo', 30],
    ['blocks', 300, 'total', 'Block 300 meteors in total', 40],
    ['time', 90, 'run', 'Survive 90 seconds', 50],
    ['combo', 30, 'run', 'Reach a 30 combo', 50],
    ['score', 1500, 'run', 'Score 1,500 in one run', 50],
    ['time', 180, 'run', 'Survive 3 minutes', 80],
    ['combo', 60, 'run', 'Reach a 60 combo', 80],
    ['blocks', 3000, 'total', 'Block 3,000 meteors in total', 100],
  ],
  upgrades: [
    { id: 'core', icon: '❤️', label: 'Planet Core', desc: '+1 max HP for the planet', max: 3, cost: 130 },
    { id: 'wide', icon: '🛡️', label: 'Wide Shield', desc: 'Shield arc 8% wider', max: 4, cost: 90 },
    { id: 'surge', icon: '⚡', label: 'Long Overdrive', desc: 'Overdrive lasts 1.5 s longer', max: 4, cost: 70 },
  ],
}
