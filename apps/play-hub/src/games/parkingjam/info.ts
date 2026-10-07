import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'parkingjam',
    title: 'Parking Jam',
    blurb: 'Slide every car out of the packed lot without a crash.',
    path: '/play/parkingjam',
    accent: '#2563EB',
    eta: '2–5 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Trending', 'Brain'],
    trending: true,
    icon: '🚗',
    howTo: [
      'Tap a car to drive it forward, or swipe along it to reverse. A clear path means it drives off to the exit.',
      'Blocked cars roll up to whatever is in the way, bump it and honk. Every bump angers the drivers — a full anger meter jams the lot.',
      'Clear the lot before the clock runs out. Watch for trucks, cones, iced cars that thaw as others leave, and grandma on the crosswalk.',
      'Tow lifts any car out, Undo backs up the last bump, Freeze stops the clock. Upgrades add tows, patience and coins.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['cars', 60, 'total', 'Drive out 60 cars', 30],
    ['perfect', 1, 'run', 'Clear a level without a bump', 40],
    ['level', 8, 'run', 'Reach level 8', 50],
    ['cars', 600, 'total', 'Drive out 600 cars', 50],
    ['hard', 2, 'total', 'Beat 2 hard levels', 50],
    ['level', 15, 'run', 'Reach level 15', 80],
    ['perfect', 30, 'total', 'Clear 30 levels without a bump', 80],
    ['cars', 5000, 'total', 'Drive out 5,000 cars', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'crane', icon: '🏗️', label: 'Tow Service', desc: '+1 tow truck at the start of a run', max: 3, cost: 90 },
    { id: 'calm', icon: '😌', label: 'Patience', desc: '+1 bump allowed before the jam', max: 3, cost: 120 },
    { id: 'bounty', icon: '🪙', label: 'Valet Tips', desc: '+15% coins from each run', max: 5, cost: 80 },
  ],
}
