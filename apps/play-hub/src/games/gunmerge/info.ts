import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'gunmerge',
    title: 'Gun Merge',
    blurb: 'Merge pistols into railguns and hold the barricade against the horde.',
    path: '/play/gunmerge',
    accent: '#57534E',
    eta: '3–10 min',
    tag: 'Merge',
    tags: ['Merge', 'Strategy', 'Shooter'],
    icon: '🔫',
    howTo: [
      'Drag a gun onto an identical one to merge it into the next tier: pistol, revolver, SMG, shotgun, rifle… all the way to the railgun.',
      'Guns on the top row (the firing line) shoot the nearest zombie automatically. Drag guns to move or swap them; drop one on the Buy button to sell it.',
      'Kills pay cash: buy new guns, which get pricier. If the zombies smash the barricade, the run ends. Bosses arrive every 5 waves.',
      'Tap supply drops for free guns, repairs or airstrikes, and throw grenades in a pinch. Coins buy permanent upgrades: extra guns, tougher sandbags, bonus coins.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-04',
  },
  missions: [
    ['wave', 5, 'run', 'Reach wave 5', 30],
    ['merges', 30, 'total', 'Merge 30 guns', 30],
    ['best', 4, 'run', 'Build a Shotgun', 40],
    ['bosses', 3, 'total', 'Defeat 3 bosses', 50],
    ['kills', 1000, 'total', 'Kill 1,000 zombies', 50],
    ['best', 7, 'run', 'Build a Sniper', 50],
    ['wave', 20, 'run', 'Reach wave 20', 80],
    ['kills', 10000, 'total', 'Kill 10,000 zombies', 80],
    ['best', 9, 'run', 'Build a Rocket Launcher', 100],
  ],
  upgrades: [
    { id: 'armory', icon: '🔫', label: 'Armory', desc: 'Start with an extra Revolver', max: 3, cost: 110 },
    { id: 'sandbags', icon: '🧱', label: 'Sandbags', desc: '+25% barricade HP', max: 4, cost: 80 },
    { id: 'bounty', icon: '🪙', label: 'Bounty', desc: '+15% coins from each run', max: 5, cost: 70 },
  ],
}
