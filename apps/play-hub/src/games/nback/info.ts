import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'nback',
    title: 'N-Back Flash',
    blurb: 'Is this the same as N steps back? Train your working memory.',
    path: '/play/nback',
    accent: '#DB2777',
    eta: '2–6 min',
    tag: 'Memory',
    tags: ['Memory', 'Brain', 'Focus'],
    icon: '🔁',
    howTo: [
      'Shapes (or lit squares) flash one at a time. Tap MATCH (or press Space) when the current one is the same as the one N steps back.',
      'Start with 1-back, then 2-back and 3-back. Later levels use grid positions, then shape and position at once with two buttons (Space / L).',
      'A wrong MATCH or a missed match costs a heart. Accuracy decides your score and stars; hit streaks build a combo.',
      'The history strip helps early and fades as you improve. Peek shows it again and Slow calms the stream. Upgrades add hearts and slow every level.',
    ],
    isNew: true,
    popularity: 84,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 4, 'run', 'Reach level 4', 30],
    ['hits', 30, 'total', 'Catch 30 matches in total', 30],
    ['perfect', 1, 'total', 'Finish a level with 100%', 40],
    ['level', 8, 'run', 'Reach level 8', 50],
    ['nback', 2, 'run', 'Clear a 2-back level', 50],
    ['combo', 10, 'run', 'Catch 10 matches in a row', 50],
    ['level', 15, 'run', 'Reach level 15', 80],
    ['nback', 3, 'run', 'Clear a 3-back level', 80],
    ['hits', 2000, 'total', 'Catch 2,000 matches in total', 100],
  ],
  levels: { authored: 40, bossEvery: 5 },
  upgrades: [
    { id: 'calm', icon: '🧘', label: 'Calm Mind', desc: 'The stream runs 7% slower', max: 4, cost: 90 },
    { id: 'heart', icon: '❤️', label: 'Big Heart', desc: '+1 max heart', max: 3, cost: 150 },
    { id: 'kit', icon: '🧠', label: 'Focus Kit', desc: '+1 starting Peek and Slow', max: 4, cost: 70 },
  ],
}
