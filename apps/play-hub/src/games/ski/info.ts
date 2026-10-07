import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'ski',
    title: 'Slope Ski',
    blurb: 'Carve downhill, spin off ramps, and outrun the hungry yeti.',
    path: '/play/ski',
    accent: '#0284C7',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Sports', 'Arcade', 'Reflex'],
    icon: '⛷️',
    howTo: [
      'Touch and drag: your skis point toward your finger. Straight down is fastest, sideways scrubs speed.',
      'Pass between slalom flags for combo points. Hit ramps, then swipe left/right in the air to spin and tap to grab — land straight!',
      'Trees, rocks, cabins and other skiers cost a heart. Past 1,200 m the yeti hunts you — ski straight to outrun it.',
      'Collect coins for upgrades: Helmet (+1 heart), Race Wax (faster) and Stunt Pro (easier landings, more points).',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['distance', 600, 'run', 'Ski 600 m in one run', 30],
    ['gates', 20, 'total', 'Pass 20 slalom gates', 30],
    ['tricks', 8, 'total', 'Land 8 tricks in total', 40],
    ['distance', 1600, 'run', 'Ski 1,600 m in one run', 50],
    ['yeti', 1, 'total', 'Escape the yeti', 50],
    ['tricks', 5, 'run', 'Land 5 tricks in one run', 50],
    ['distance', 3500, 'run', 'Ski 3,500 m in one run', 80],
    ['yeti', 10, 'total', 'Escape the yeti 10 times', 80],
    ['gates', 1000, 'total', 'Pass 1,000 slalom gates', 100],
  ],
  upgrades: [
    { id: 'helmet', icon: '⛑️', label: 'Helmet', desc: '+1 heart at the start of every run', max: 2, cost: 150 },
    { id: 'wax', icon: '🎿', label: 'Race Wax', desc: '+5% top speed (outrun the yeti)', max: 4, cost: 90 },
    { id: 'stunt', icon: '🌀', label: 'Stunt Pro', desc: 'Wider landing window, +15% trick points', max: 3, cost: 80 },
  ],
}
