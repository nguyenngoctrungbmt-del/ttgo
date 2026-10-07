import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'planetmerge',
    title: 'Planet Merge',
    blurb: 'Fling space rocks into a gravity well and merge them into suns.',
    path: '/play/planetmerge',
    accent: '#4338CA',
    eta: '3–10 min',
    tag: 'Merge',
    tags: ['Merge', 'Physics', 'Casual'],
    icon: '🪐',
    howTo: [
      'Drag around the rim to aim, release to fling the next body toward the gravity well at the centre.',
      'Two identical bodies that touch merge into the next one: dust, pebble, asteroid, moon, Mars, Earth… up to a sun and a black hole.',
      'Keep the pile inside the dashed ring — a body poking out for 2 seconds ends the run. Meteor showers add surprise rocks.',
      'Merges fill the stardust meter for a rainbow Nebula (merges with anything) or a Pulsar (blasts small rocks). Golden bodies score triple.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-04',
  },
  missions: [
    ['best', 6, 'run', 'Form an Earth', 30],
    ['merges', 60, 'total', 'Merge 60 bodies', 30],
    ['score', 2500, 'run', 'Score 2,500 in one run', 40],
    ['best', 8, 'run', 'Form a Saturn', 50],
    ['merges', 600, 'total', 'Merge 600 bodies', 50],
    ['score', 12000, 'run', 'Score 12,000 in one run', 50],
    ['best', 10, 'run', 'Ignite a Sun', 80],
    ['merges', 4000, 'total', 'Merge 4,000 bodies', 80],
    ['best', 11, 'run', 'Create a Black Hole', 100],
  ],
  upgrades: [
    { id: 'ring', icon: '⭕', label: 'Wide Orbit', desc: 'Danger ring 3% larger', max: 4, cost: 100 },
    { id: 'pulsar', icon: '💫', label: 'Pulsar Pack', desc: 'Start with a Pulsar blast', max: 3, cost: 90 },
    { id: 'bounty', icon: '🪙', label: 'Star Bounty', desc: '+15% coins from each run', max: 5, cost: 70 },
  ],
}
