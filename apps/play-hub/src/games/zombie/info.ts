import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'zombie',
    title: 'Last Stand',
    blurb: 'Hold the barricade — headshot the horde before it breaks through.',
    path: '/play/zombie',
    accent: '#4D7C0F',
    eta: '2–6 min',
    tag: 'Action',
    tags: ['Action', 'Shooter', 'Reflex', 'Focus'],
    icon: '🧟',
    howTo: [
      'Tap a zombie to shoot it. Headshots kill instantly and score double.',
      'You have 8 rounds — it reloads automatically when empty, or tap the ammo bar to reload early.',
      'Runners, crawlers and brutes smash the wall; later spitters lob acid and bombers explode. Bosses every 5 waves.',
      'Tap dropped items: grenades clear the area, stopwatches slow time, wrenches repair the barricade.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-03',
  },
  missions: [
    ['kills', 25, 'run', 'Take down 25 zombies in one run', 30],
    ['headshots', 10, 'run', 'Land 10 headshots in one run', 30],
    ['kills', 200, 'total', 'Take down 200 zombies in total', 40],
    ['wave', 5, 'run', 'Reach wave 5', 50],
    ['hsStreak', 5, 'run', 'Chain 5 headshots in a row', 50],
    ['score', 2000, 'run', 'Score 2,000 in one run', 50],
    ['wave', 10, 'run', 'Reach wave 10', 80],
    ['headshots', 40, 'run', 'Land 40 headshots in one run', 80],
    ['kills', 2000, 'total', 'Take down 2,000 zombies in total', 100],
  ],
  upgrades: [
    { id: 'mag', icon: '🔫', label: 'Extended Mag', desc: '+2 rounds per magazine', max: 4, cost: 90 },
    { id: 'wall', icon: '🧱', label: 'Reinforced Wall', desc: '+20 max barricade', max: 4, cost: 110 },
    { id: 'lucky', icon: '🍀', label: 'Scavenger', desc: 'Zombies drop items more often', max: 4, cost: 80 },
  ],
}
