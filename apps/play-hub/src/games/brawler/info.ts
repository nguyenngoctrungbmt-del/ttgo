import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'brawler',
    title: 'Street Brawler',
    blurb: 'Punch left, punch right, chain combos and clean up the streets.',
    path: '/play/brawler',
    accent: '#DC2626',
    eta: '2–8 min',
    tag: 'Action',
    tags: ['Action', 'Fighting', 'Rhythm', 'Reflex'],
    icon: '🥊',
    howTo: [
      'Thugs come from both sides. Tap the left or right half to punch that way when they are in range — punching air makes you stagger and drops your combo.',
      'Blockers need two hits. Swipe up to uppercut jumpers out of the air; swipe down to duck thrown knives and heavy punches.',
      'Red marks warn that a thug is about to swing — hit first or duck. Chain hits for a combo multiplier.',
      'Hits fill your special meter: tap SUPER to smash everyone on screen. Beat the gang boss to move to the next street.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['ko', 30, 'run', 'KO 30 thugs in one run', 30],
    ['combo', 15, 'run', 'Land a 15-hit combo', 30],
    ['ko', 200, 'total', 'KO 200 thugs in total', 40],
    ['bosses', 1, 'total', 'Defeat a gang boss', 50],
    ['uppercuts', 40, 'total', 'Land 40 uppercuts', 50],
    ['wave', 8, 'run', 'Reach wave 8', 50],
    ['combo', 60, 'run', 'Land a 60-hit combo', 80],
    ['bosses', 8, 'total', 'Defeat 8 gang bosses in total', 80],
    ['ko', 4000, 'total', 'KO 4,000 thugs in total', 100],
  ],
  upgrades: [
    { id: 'grit', icon: '💪', label: 'Grit', desc: '+1 max health', max: 3, cost: 140 },
    { id: 'reach', icon: '🥊', label: 'Long Arms', desc: '+8% punch reach', max: 4, cost: 90 },
    { id: 'fury', icon: '🔥', label: 'Fury', desc: 'Start with +25% special meter', max: 4, cost: 80 },
  ],
}
