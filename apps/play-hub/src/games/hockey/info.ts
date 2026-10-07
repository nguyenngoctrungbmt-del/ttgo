import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'hockey',
    title: 'Air Hockey',
    blurb: 'Smash the puck past 20 rivals on a glowing tournament ladder.',
    path: '/play/hockey',
    accent: '#0369A1',
    eta: '3–8 min',
    tag: 'Action',
    tags: ['Action', 'Sports', 'Arcade', 'Versus'],
    icon: '🏒',
    howTo: [
      'Drag to move your mallet around your half of the table and smash the puck into the top goal.',
      'First to 7 wins. Beat a rival to unlock the next and pick a perk. Stars: win, concede ≤3, concede ≤1. Replay any beaten rival from the map.',
      'Each rival is a level with its own table: ice, bumpers, drifting air. Every 5th is a champion with a signature trick — starting with Omega.',
      'Knock the puck over power-ups: big mallet, split puck or freeze your rival. Upgrades add head starts and more drops.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-03',
  },
  missions: [
    ['goals', 7, 'run', 'Score 7 goals in one run', 30],
    ['wins', 1, 'total', 'Win your first match', 30],
    ['goals', 50, 'total', 'Score 50 goals in total', 40],
    ['stage', 4, 'run', 'Reach the 4th rival', 50],
    ['powerups', 20, 'total', 'Grab 20 power-ups', 50],
    ['wins', 10, 'total', 'Win 10 matches in total', 50],
    ['bosses', 1, 'total', 'Defeat the boss Omega', 80],
    ['shutouts', 1, 'total', 'Win a match 7–0', 80],
    ['goals', 500, 'total', 'Score 500 goals in total', 100],
  ],
  levels: { authored: 20, bossEvery: 5 },
  upgrades: [
    { id: 'head', icon: '🏁', label: 'Head Start', desc: 'Start every match 1 goal up', max: 3, cost: 150 },
    { id: 'mallet', icon: '🔵', label: 'Wide Mallet', desc: '+8% mallet size', max: 4, cost: 90 },
    { id: 'drops', icon: '⚡', label: 'Power Drops', desc: 'Power-ups appear more often and last longer', max: 4, cost: 70 },
  ],
}
