import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'lanedefense',
    title: 'Lane Defense',
    blurb: 'Plant defenders in five lanes and stop the march.',
    path: '/play/lanedefense',
    accent: '#15803D',
    eta: '3–10 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Trending', 'Strategy'],
    trending: true,
    icon: '🏰',
    howTo: [
      'Tap a defender card (or drag it) and then a lawn tile to plant it. Tap glowing energy orbs to collect them.',
      'Glow Blooms make energy, Pea Pods shoot up their lane, Rock Nuts block, Boom Berries blast a 3×3 area and Frost Pods slow monsters.',
      'Monsters march down the lanes. A mower saves each lane once — if a monster gets past it, the run ends. Each level ends with a huge final wave; every 5th level brings Giant bosses.',
      'Shovel digs up a defender for half its cost; Lightning zaps every monster. Upgrades add starting energy, damage and coins.',
    ],
    isNew: true,
    popularity: 91,
    addedAt: '2026-10-04',
  },
  missions: [
    ['wave', 5, 'run', 'Survive 5 waves', 30],
    ['kills', 150, 'total', 'Defeat 150 monsters in total', 30],
    ['level', 3, 'run', 'Reach level 3', 40],
    ['wave', 15, 'run', 'Survive 15 waves', 50],
    ['bosses', 1, 'run', 'Defeat a Giant boss', 50],
    ['kills', 2000, 'total', 'Defeat 2,000 monsters in total', 50],
    ['wave', 30, 'run', 'Survive 30 waves', 80],
    ['bosses', 3, 'run', 'Defeat 3 Giants in one run', 80],
    ['kills', 10000, 'total', 'Defeat 10,000 monsters in total', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'energy', icon: '☀️', label: 'Morning Sun', desc: '+25 starting energy each level', max: 4, cost: 90 },
    { id: 'power', icon: '🌱', label: 'Strong Roots', desc: '+10% damage for all defenders', max: 5, cost: 120 },
    { id: 'bounty', icon: '🪙', label: 'Garden Market', desc: '+15% coins from each run', max: 5, cost: 100 },
  ],
}
