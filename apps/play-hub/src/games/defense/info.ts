import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'defense',
    title: 'City Shield',
    blurb: 'Intercept falling missiles and set off chain-reaction blasts.',
    path: '/play/defense',
    accent: '#7C3AED',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Strategy', 'Reflex'],
    icon: '🛡️',
    howTo: [
      'Tap the sky to fire an interceptor from the nearest battery. It explodes where you tapped.',
      'Missiles caught in a blast explode too — chain them for big points. Lose every city and the run ends.',
      'Batteries hold 10 shots per wave. Shoot supply crates for ammo; beware MIRVs, bombers and smart bombs.',
      'Every 5th wave a mothership attacks — hit it 3 times. Upgrades add ammo, blast size and shields.',
    ],
    isNew: true,
    popularity: 85,
    addedAt: '2026-10-03',
  },
  missions: [
    ['kills', 30, 'run', 'Destroy 30 missiles in one run', 30],
    ['wave', 3, 'run', 'Reach wave 3', 30],
    ['kills', 200, 'total', 'Destroy 200 missiles in total', 40],
    ['chain', 4, 'run', 'Set off a 4-missile chain', 50],
    ['wave', 6, 'run', 'Reach wave 6', 50],
    ['perfect', 3, 'total', 'Finish 3 waves without losing a city', 50],
    ['chain', 8, 'run', 'Set off an 8-missile chain', 80],
    ['wave', 10, 'run', 'Reach wave 10', 80],
    ['kills', 2000, 'total', 'Destroy 2,000 missiles in total', 100],
  ],
  upgrades: [
    { id: 'ammo', icon: '🚀', label: 'Deep Magazines', desc: '+2 shots per battery each wave', max: 4, cost: 90 },
    { id: 'blast', icon: '💥', label: 'Bigger Warheads', desc: '+10% interceptor blast radius', max: 4, cost: 110 },
    { id: 'shield', icon: '🛡️', label: 'Shield Dome', desc: 'Absorb 1 city hit per run', max: 3, cost: 150 },
  ],
}
