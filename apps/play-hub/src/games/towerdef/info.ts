import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'towerdef',
    title: 'Tower Rush',
    blurb: 'Build and upgrade towers to hold the gate against endless waves.',
    path: '/play/towerdef',
    accent: '#4D7C0F',
    eta: '4–12 min',
    tag: 'Action',
    tags: ['Action', 'Strategy', 'Defense', 'Endless'],
    icon: '🗼',
    howTo: [
      'Tap a stone pad and pick a tower: Arrow (fast), Cannon (splash), Frost (slows) or Tesla (chain lightning).',
      'Tap a tower to upgrade it through 3 tiers or sell it. Kills and cleared waves earn gold.',
      'Enemies that reach your gate cost lives: runners are fast, tanks are armored, flyers skip the path and healers mend the horde.',
      'Survive every wave of a map to clear its level — no leaks earns 3 stars. 30 hand-built maps add new foes, scarce pads and limited tower kits, with an Ogre King boss every 5th level.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['wave', 5, 'run', 'Reach wave 5', 30],
    ['towers', 12, 'total', 'Build 12 towers', 30],
    ['kills', 300, 'total', 'Defeat 300 enemies in total', 40],
    ['bosses', 1, 'total', 'Defeat the Ogre King', 50],
    ['wave', 12, 'run', 'Reach wave 12', 50],
    ['tier3', 3, 'total', 'Max out 3 towers', 50],
    ['wave', 25, 'run', 'Reach wave 25', 80],
    ['bosses', 5, 'total', 'Defeat 5 bosses in total', 80],
    ['kills', 5000, 'total', 'Defeat 5,000 enemies in total', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'treasury', icon: '💰', label: 'Treasury', desc: '+40 starting gold', max: 5, cost: 70 },
    { id: 'walls', icon: '🏰', label: 'Thick Walls', desc: '+3 lives at the gate', max: 4, cost: 80 },
    { id: 'masonry', icon: '⚒️', label: 'Masonry', desc: '+8% damage for every tower', max: 5, cost: 120 },
  ],
}
