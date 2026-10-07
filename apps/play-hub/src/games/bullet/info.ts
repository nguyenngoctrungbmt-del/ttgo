import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'bullet',
    title: 'Bullet Storm',
    blurb: 'Weave through dazzling bullet storms, graze for points, slay bosses.',
    path: '/play/bullet',
    accent: '#C026D3',
    eta: '3–8 min',
    tag: 'Action',
    tags: ['Action', 'Shooter', 'Bullet hell', 'Skill'],
    icon: '💠',
    howTo: [
      'Drag anywhere to fly — the ship follows your finger’s movement and fires automatically. Only the tiny glowing core can be hit.',
      '20 scripted stages, each ending in a boss — a grand boss every 5th with walls, webs, heartbeat rings and lasers. Stars: clear, no miss, break every phase in time.',
      'Bullets that brush past the core are grazes — they score points and every 50 grazes earns a bomb. Tap BOMB to wipe the screen in a pinch.',
      'Collect red P chips to raise your power level and blue chips for points. Fly near the top to vacuum up every item.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['stage', 2, 'run', 'Reach stage 2', 30],
    ['grazes', 150, 'total', 'Graze 150 bullets in total', 30],
    ['bosses', 1, 'total', 'Defeat a boss', 40],
    ['grazes', 120, 'run', 'Graze 120 bullets in one run', 50],
    ['stage', 4, 'run', 'Reach stage 4', 50],
    ['bosses', 10, 'total', 'Defeat 10 bosses', 50],
    ['stage', 7, 'run', 'Reach stage 7', 80],
    ['grazes', 10000, 'total', 'Graze 10,000 bullets in total', 80],
    ['score', 1000000, 'run', 'Score 1,000,000 in one run', 100],
  ],
  levels: { authored: 20, bossEvery: 5 },
  upgrades: [
    { id: 'bombs', icon: '💣', label: 'Bomb Bay', desc: '+1 bomb at the start and after each loss', max: 3, cost: 100 },
    { id: 'power', icon: '⚡', label: 'Overcharge', desc: 'Start with +1 power level', max: 3, cost: 130 },
    { id: 'magnet', icon: '🧲', label: 'Item Magnet', desc: 'Bigger pickup radius, lower vacuum line', max: 4, cost: 70 },
  ],
}
