import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'fruitmerge',
    title: 'Fruit Drop',
    blurb: 'Drop cute fruit in the jar — two alike merge into a bigger one!',
    path: '/play/fruitmerge',
    accent: '#16A34A',
    eta: '3–10 min',
    tag: 'Merge',
    tags: ['Merge', 'Physics', 'Casual', 'Brain'],
    icon: '🍉',
    howTo: [
      'Drag to move the claw, release to drop the fruit. The bubble shows what comes next.',
      'Two identical fruits that touch merge into the next one: cherry, strawberry, grape, orange… all the way to a Golden Melon. Quick chains build combos.',
      'If fruit stays above the red line for two seconds, the jar overflows and the run ends.',
      'Swap and Pop helpers save tight spots; later Rainbow Drops, Bombs, Shrink Potions, golden fruit and Frenzy bonuses appear. Upgrades widen the jar and add swaps.',
    ],
    isNew: true,
    popularity: 91,
    addedAt: '2026-10-04',
  },
  missions: [
    ['best', 5, 'run', 'Grow an Apple', 30],
    ['merges', 100, 'total', 'Merge 100 fruits in total', 30],
    ['score', 1500, 'run', 'Score 1,500 in one run', 40],
    ['best', 8, 'run', 'Grow a Pineapple', 50],
    ['combo', 6, 'run', 'Hit a 6x merge combo', 50],
    ['specials', 20, 'total', 'Use 20 specials or helpers', 50],
    ['best', 10, 'run', 'Grow a Watermelon', 80],
    ['merges', 3000, 'total', 'Merge 3,000 fruits in total', 80],
    ['golden', 1, 'total', 'Grow a Golden Melon', 100],
  ],
  upgrades: [
    { id: 'jar', icon: '🫙', label: 'Big Jar', desc: '+7% jar width for more room', max: 3, cost: 150 },
    { id: 'swap', icon: '🔄', label: 'Juggler', desc: '+1 Swap helper at the start of a run', max: 4, cost: 70 },
    { id: 'bounty', icon: '🪙', label: 'Market Day', desc: '+15% coins from each run', max: 5, cost: 90 },
  ],
}
