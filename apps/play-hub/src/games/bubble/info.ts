import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'bubble',
    title: 'Bubble Blast',
    blurb: 'Bank shots off the walls, pop trios and drop whole clusters.',
    path: '/play/bubble',
    accent: '#06B6D4',
    eta: '3–10 min',
    tag: 'Action',
    tags: ['Action', 'Puzzle', 'Aim', 'Casual'],
    icon: '🫧',
    howTo: [
      'Drag to aim — the dotted guide bounces off the walls — and release to shoot. Tap the dish on the left to swap bubbles.',
      'Connect 3 or more of one colour to pop them. Anything left hanging falls. Clear the whole board within the shots to win the level.',
      '32 hand-drawn boards, a boss board every 5th. On some boards the ceiling drops every few shots (watch the pips); crossing the red line ends the run.',
      'Pops fill the fever ring for rainbow, bomb and lightning bubbles; stars give extra fever. Upgrades extend the guide, speed up fever and slow the pushes.',
    ],
    isNew: true,
    popularity: 91,
    addedAt: '2026-10-03',
  },
  missions: [
    ['popped', 150, 'total', 'Pop 150 bubbles', 30],
    ['level', 3, 'run', 'Reach level 3', 30],
    ['dropped', 60, 'total', 'Drop 60 bubbles', 40],
    ['level', 6, 'run', 'Reach level 6', 50],
    ['combo', 6, 'run', 'Pop on 6 shots in a row', 50],
    ['specials', 20, 'total', 'Use 20 special bubbles', 50],
    ['level', 12, 'run', 'Reach level 12', 80],
    ['dropped', 1500, 'total', 'Drop 1,500 bubbles', 80],
    ['popped', 8000, 'total', 'Pop 8,000 bubbles in total', 100],
  ],
  levels: { authored: 32, bossEvery: 5 },
  upgrades: [
    { id: 'sight', icon: '🎯', label: 'Laser Sight', desc: 'Longer guide with more bounces; landing ghost at Lv 2', max: 3, cost: 80 },
    { id: 'fever', icon: '🔥', label: 'Hot Streak', desc: 'Fever ring fills 20% faster', max: 4, cost: 90 },
    { id: 'breather', icon: '⏳', label: 'Breather', desc: '+1 shot before each ceiling drop', max: 3, cost: 130 },
  ],
}
