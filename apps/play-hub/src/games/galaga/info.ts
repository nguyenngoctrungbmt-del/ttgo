import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'galaga',
    title: 'Star Squadron',
    blurb: 'Blast diving alien swarms and rescue captured fighters.',
    path: '/play/galaga',
    accent: '#1D4ED8',
    eta: '3–8 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Shooter', 'Retro'],
    icon: '👾',
    howTo: [
      'Drag anywhere to slide your fighter left and right — it fires automatically.',
      'Aliens swoop into formation, then peel off in diving attacks. Dodge their shots and clear every alien to finish the stage.',
      'Boss aliens can catch your fighter in a tractor beam. Shoot the captor to free it and fly a double-firepower twin ship.',
      '20 hand-made stages: new formations, Challenging Stages and a mothership boss every 5th. Stars: clear, lose no fighter, 50%+ hit ratio. Grab capsules for rapid fire, spread and shields.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-03',
  },
  missions: [
    ['stage', 3, 'run', 'Reach stage 3', 30],
    ['kills', 150, 'total', 'Destroy 150 aliens in total', 30],
    ['rescues', 1, 'total', 'Rescue a captured fighter', 40],
    ['stage', 6, 'run', 'Reach stage 6', 50],
    ['bosses', 30, 'total', 'Destroy 30 boss aliens', 50],
    ['chHits', 30, 'run', 'Hit 30 in a Challenging Stage', 50],
    ['stage', 12, 'run', 'Reach stage 12', 80],
    ['kills', 3000, 'total', 'Destroy 3,000 aliens in total', 80],
    ['score', 60000, 'run', 'Score 60,000 in one run', 100],
  ],
  levels: { authored: 20, bossEvery: 5 },
  upgrades: [
    { id: 'reserve', icon: '🚀', label: 'Reserve Wing', desc: '+1 spare fighter per run', max: 3, cost: 150 },
    { id: 'cannon', icon: '🔫', label: 'Hot Cannons', desc: 'Auto-fire 12% faster', max: 4, cost: 90 },
    { id: 'salvage', icon: '🧲', label: 'Salvage', desc: 'More capsules, power-ups last longer', max: 4, cost: 80 },
  ],
}
