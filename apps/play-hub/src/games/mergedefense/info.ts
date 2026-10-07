import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'mergedefense',
    title: 'Merge Defenders',
    blurb: 'Summon and merge archers, mages and cannons to hold the road.',
    path: '/play/mergedefense',
    accent: '#B91C1C',
    eta: '4–12 min',
    tag: 'Merge',
    tags: ['Merge', 'Strategy', 'Tower Defense', 'Action'],
    icon: '🛡️',
    howTo: [
      'Tap Summon to place a random tier 1 defender: Archer, Mage, Cannon, Frost or Storm. Each summon costs a little more; kills and cleared waves pay coins.',
      'Drag a defender onto an identical one (same type and tier) to merge them into a random defender one tier higher. Drag onto any other slot to move it.',
      'Monsters march along the road. Each one that reaches the castle costs a heart (bosses cost two) — lose them all and the run ends.',
      'Every 5th wave brings a mini-boss and every 10th a boss. Power buttons boost a whole unit type. Upgrades add hearts, starting coins and damage.',
    ],
    isNew: true,
    popularity: 89,
    addedAt: '2026-10-04',
  },
  missions: [
    ['wave', 5, 'run', 'Reach wave 5', 30],
    ['merges', 30, 'total', 'Merge 30 defenders in total', 30],
    ['tier', 3, 'run', 'Make a tier 3 defender', 40],
    ['bosses', 1, 'total', 'Defeat a boss', 50],
    ['tier', 5, 'run', 'Make a tier 5 defender', 50],
    ['kills', 2000, 'total', 'Defeat 2,000 monsters in total', 50],
    ['wave', 25, 'run', 'Reach wave 25', 80],
    ['bosses', 10, 'total', 'Defeat 10 bosses in total', 80],
    ['tier', 7, 'run', 'Make a tier 7 defender', 100],
  ],
  upgrades: [
    { id: 'lives', icon: '❤️', label: 'Castle Walls', desc: '+1 heart at the start of a run', max: 3, cost: 150 },
    { id: 'purse', icon: '🪙', label: 'War Chest', desc: '+25 starting coins', max: 4, cost: 70 },
    { id: 'power', icon: '⚔️', label: 'Sharpened Steel', desc: '+8% damage for every defender', max: 5, cost: 110 },
  ],
}
