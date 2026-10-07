import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'screwjam',
    title: 'Screw Jam',
    blurb: 'Unscrew bolts into matching boxes and free every plate.',
    path: '/play/screwjam',
    accent: '#64748B',
    eta: '2–5 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Trending', 'Brain'],
    trending: true,
    icon: '🔩',
    howTo: [
      'Tap a screw that no plate is covering. It spins out and flies to the toolbox of its colour and symbol.',
      'No open box for that colour? It waits in the spare tray. A full box leaves and the next one pulls matching screws from the tray.',
      'Plates fall away once their last screw is out. If the tray fills up, you are out of space — plan ahead!',
      'Icy screws need two taps; grey screws show their colour once uncovered. Extra Slot, Drill and Magnet boosters help — upgrades add more.',
    ],
    isNew: true,
    popularity: 90,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['screws', 150, 'total', 'Unscrew 150 screws in total', 30],
    ['plates', 15, 'run', 'Drop 15 plates in one run', 40],
    ['level', 7, 'run', 'Reach level 7', 50],
    ['perfect', 3, 'run', 'Clear 3 levels with 3 stars', 50],
    ['screws', 1500, 'total', 'Unscrew 1,500 screws in total', 50],
    ['level', 12, 'run', 'Reach level 12', 80],
    ['plates', 1000, 'total', 'Drop 1,000 plates in total', 80],
    ['perfect', 8, 'run', 'Clear 8 levels with 3 stars', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'tray', icon: '🧰', label: 'Bigger Tray', desc: '+1 spare tray slot on every level', max: 3, cost: 150 },
    { id: 'drill', icon: '🪛', label: 'Power Drill', desc: '+1 Drill at the start of a run', max: 4, cost: 90 },
    { id: 'bounty', icon: '🪙', label: 'Repair Fees', desc: '+15% coins from each run', max: 5, cost: 100 },
  ],
}
