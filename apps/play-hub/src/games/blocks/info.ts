import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'blocks',
    title: 'Block Blitz',
    blurb: 'Slide, spin and slam glossy blocks — chain combos as speed climbs.',
    path: '/play/blocks',
    accent: '#2563EB',
    eta: '3–10 min',
    tag: 'Action',
    tags: ['Action', 'Puzzle', 'Classic', 'Endless'],
    icon: '🟦',
    howTo: [
      'Drag left/right to slide the piece, tap to rotate (tap the far left edge to rotate back), flick down to slam it, flick up or tap HOLD to save it.',
      'Fill a whole row to clear it. Clear 4 at once for a QUAD, chain clears for combos, and land back-to-back quads or T-spins for ×1.5.',
      'Every 10 lines the level rises: pieces fall faster and the theme changes. Watch for rising garbage — the stack must not reach the top.',
      'Gems in blocks pay bonus points and coins. Tap BOMB to blast the bottom 3 rows. Upgrades slow gravity, add bombs and find more gems.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-03',
  },
  missions: [
    ['lines', 10, 'run', 'Clear 10 lines in one run', 30],
    ['level', 3, 'run', 'Reach level 3', 30],
    ['lines', 100, 'total', 'Clear 100 lines in total', 40],
    ['quads', 3, 'total', 'Clear 3 QUADs (4 lines)', 50],
    ['level', 6, 'run', 'Reach level 6', 50],
    ['combo', 4, 'run', 'Chain a 4× combo', 50],
    ['level', 10, 'run', 'Reach level 10', 80],
    ['gems', 100, 'total', 'Collect 100 gems in total', 80],
    ['lines', 1500, 'total', 'Clear 1,500 lines in total', 100],
  ],
  upgrades: [
    { id: 'calm', icon: '🐢', label: 'Calm Gravity', desc: 'Pieces fall 10% slower', max: 4, cost: 90 },
    { id: 'bomb', icon: '💣', label: 'Line Bomb', desc: 'Start each run with +1 bomb', max: 3, cost: 120 },
    { id: 'gems', icon: '💎', label: 'Gem Finder', desc: '+5% gem chance, +15% coins', max: 4, cost: 70 },
  ],
}
