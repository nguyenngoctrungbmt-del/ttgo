import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'dropmerge',
    title: 'Drop Merge',
    blurb: 'Drop number blocks into columns and set off chain merges.',
    path: '/play/dropmerge',
    accent: '#2563EB',
    eta: '3–10 min',
    tag: 'Merge',
    tags: ['Merge', 'Numbers', 'Brain', 'Casual'],
    icon: '🔽',
    howTo: [
      'Tap (or drag and release over) a column to drop the block shown on top. The box in the corner shows the next one.',
      'A block merges with every equal neighbour below, left and right — two at once doubles twice. Merged blocks fall and cascade for bonus points.',
      'If no column can take the block, the run ends. After a while a timer auto-drops for you, and big blocks clear the lowest tier for good.',
      'Swap and Hammer helpers save tight spots; Wild and Bomb blocks join later. Upgrades add hammers, a calmer timer and bonus coins.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-04',
  },
  missions: [
    ['best', 128, 'run', 'Make a 128 block', 30],
    ['merges', 150, 'total', 'Merge 150 blocks in total', 30],
    ['combo', 3, 'run', 'Trigger a 3-step cascade', 40],
    ['best', 1024, 'run', 'Make a 1K block', 50],
    ['purges', 5, 'total', 'Clear 5 low tiers in total', 50],
    ['score', 30000, 'run', 'Score 30,000 in one run', 50],
    ['best', 4096, 'run', 'Make a 4K block', 80],
    ['merges', 5000, 'total', 'Merge 5,000 blocks in total', 80],
    ['combo', 6, 'run', 'Trigger a 6-step cascade', 100],
  ],
  upgrades: [
    { id: 'hammer', icon: '🔨', label: 'Toolbox', desc: '+1 Hammer at the start of a run', max: 4, cost: 80 },
    { id: 'calm', icon: '⏳', label: 'Steady Hands', desc: '+1.5 s on the auto-drop timer', max: 3, cost: 100 },
    { id: 'bounty', icon: '🪙', label: 'Jackpot', desc: '+15% coins from each run', max: 5, cost: 90 },
  ],
}
