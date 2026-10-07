import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'faces',
    title: 'Face Names',
    blurb: 'Meet the characters, remember their names, call them out.',
    path: '/play/faces',
    accent: '#CA8A04',
    eta: '2–5 min',
    tag: 'Memory',
    tags: ['Memory', 'Brain', 'People'],
    icon: '🙂',
    howTo: [
      'Guests step into the spotlight one by one and say their name — tap to meet the next one.',
      'Then find them: tap the guest who was named, or pick the right name, job or favourite colour for a face.',
      'Wrong answers cost a heart. Strangers and look-alikes join the line-up, and guests from earlier levels come back.',
      'Use a Name Badge hint to reveal tags or remove two wrong answers. Every 5th level is a Reunion bonus round.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 4, 'run', 'Reach level 4', 30],
    ['names', 30, 'total', 'Recall 30 guests', 30],
    ['streak', 6, 'run', 'Get a 6-answer streak', 40],
    ['level', 10, 'run', 'Reach level 10', 50],
    ['returning', 15, 'total', 'Recognise 15 returning guests', 50],
    ['names', 300, 'total', 'Recall 300 guests', 50],
    ['level', 20, 'run', 'Reach level 20', 80],
    ['reunion', 5, 'total', 'Ace 5 Reunion rounds', 80],
    ['names', 1500, 'total', 'Recall 1,500 guests', 100],
  ],
  levels: { authored: 40, bossEvery: 5 },
  upgrades: [
    { id: 'study', icon: '⏳', label: 'Good Look', desc: '+15% time to meet each guest', max: 4, cost: 80 },
    { id: 'badge', icon: '🏷️', label: 'Name Badges', desc: 'Start each run with +1 hint', max: 3, cost: 70 },
    { id: 'heart', icon: '❤️', label: 'Big Heart', desc: '+1 max heart', max: 3, cost: 150 },
  ],
}
