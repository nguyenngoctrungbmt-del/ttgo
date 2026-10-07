import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'melody',
    title: 'Melody Keys',
    blurb: 'Listen to the tune, then play it back on the keys.',
    path: '/play/melody',
    accent: '#4F46E5',
    eta: '2–5 min',
    tag: 'Memory',
    tags: ['Memory', 'Music', 'Brain'],
    icon: '🎹',
    howTo: [
      'The songbird sings a short tune while the xylophone keys light up — each key has its own colour and symbol.',
      'Tap the keys to play the tune back in the same order. Finish it with no mistakes for a perfect streak.',
      'A wrong key costs a heart and the tune plays again. Tunes grow longer and faster, with repeats, rhythm and more keys.',
      'Tap the replay button to hear it again. Every 5th level is an Echo bonus — later, play backwards or follow shuffled keys.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 4, 'run', 'Reach level 4', 30],
    ['notes', 100, 'total', 'Play 100 correct notes', 30],
    ['streak', 3, 'run', 'Play 3 perfect tunes in a row', 40],
    ['level', 10, 'run', 'Reach level 10', 50],
    ['echo', 8, 'run', 'Echo 8 notes in a bonus round', 50],
    ['notes', 1000, 'total', 'Play 1,000 correct notes', 50],
    ['level', 20, 'run', 'Reach level 20', 80],
    ['streak', 10, 'run', 'Play 10 perfect tunes in a row', 80],
    ['notes', 5000, 'total', 'Play 5,000 correct notes', 100],
  ],
  levels: { authored: 40, bossEvery: 5 },
  upgrades: [
    { id: 'tempo', icon: '🐢', label: 'Easy Tempo', desc: 'Tunes play 8% slower', max: 4, cost: 80 },
    { id: 'ear', icon: '👂', label: 'Good Ear', desc: 'Start each run with +1 replay', max: 3, cost: 70 },
    { id: 'guide', icon: '✨', label: 'Guide Light', desc: 'One more opening note glows as a hint', max: 3, cost: 120 },
  ],
}
