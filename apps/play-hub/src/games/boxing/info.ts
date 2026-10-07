import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'boxing',
    title: 'Boxing Champ',
    blurb: 'Read the wind-up, dodge, counter — and knock out the champ.',
    path: '/play/boxing',
    accent: '#B91C1C',
    eta: '3–8 min',
    tag: 'Action',
    tags: ['Action', 'Sports', 'Reflex', 'Versus'],
    icon: '🥊',
    howTo: [
      'Tap the left or right half to jab. Swipe left/right to dodge, swipe down to duck, swipe up for an uppercut.',
      'Watch the glowing wind-up: dodge hooks to the other side or duck them; uppercuts and haymakers must be side-stepped.',
      'Dodged punches leave your rival open — pile on hits until he is dazed, then uppercut. Last-moment dodges earn star punches.',
      'Three knockdowns wins the bout. 20 boxers in 9 venues; every 5th is a title champ — a crackling straight must be ducked. Stars: KO, no knockdowns, half health left.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-03',
  },
  missions: [
    ['knockdowns', 1, 'run', 'Knock down a rival', 30],
    ['perfects', 10, 'total', 'Land 10 perfect dodges', 30],
    ['kos', 3, 'total', 'Win 3 bouts by KO', 40],
    ['stage', 4, 'run', 'Reach the 4th rival', 50],
    ['stars', 15, 'total', 'Land 15 star punches', 50],
    ['knockdowns', 25, 'total', 'Score 25 knockdowns in total', 50],
    ['stage', 7, 'run', 'Fight the champion', 80],
    ['belts', 1, 'total', 'Win the championship belt', 80],
    ['kos', 50, 'total', 'Win 50 bouts by KO', 100],
  ],
  levels: { authored: 20, bossEvery: 5 },
  upgrades: [
    { id: 'chin', icon: '💪', label: 'Iron Chin', desc: '+15% max health', max: 4, cost: 90 },
    { id: 'lungs', icon: '🫁', label: 'Big Lungs', desc: '+2 stamina and faster recovery', max: 3, cost: 80 },
    { id: 'star', icon: '⭐', label: 'Star Power', desc: 'Start every bout with +1 star punch', max: 3, cost: 140 },
  ],
}
