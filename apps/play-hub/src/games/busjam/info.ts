import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'busjam',
    title: 'Bus Jam',
    blurb: 'Send each bus off with passengers of its colour — clear the queue.',
    path: '/play/busjam',
    accent: '#F59E0B',
    eta: '2–5 min',
    tag: 'Puzzle',
    tags: ['Puzzle', 'Trending', 'Brain'],
    trending: true,
    icon: '🚌',
    howTo: [
      'Tap a passenger with a clear path out of the crowd. Blocked passengers wait until the way opens up.',
      'Matching colours (and symbols) board the bus at the stop — 3 seats each. Full buses drive off and the next one pulls in.',
      'Wrong colour? They wait on the 5-seat bench and hop on when their bus comes. A full bench means you are out of space!',
      'VIP flies anyone out, Shuffle brings the right riders forward, Seat adds a bench seat. Watch for mystery, frozen, tunnel and VIP-pair passengers.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 3, 'run', 'Reach level 3', 30],
    ['riders', 150, 'total', 'Board 150 passengers', 30],
    ['buses', 12, 'run', 'Send off 12 buses in one run', 40],
    ['level', 8, 'run', 'Reach level 8', 50],
    ['perfect', 5, 'total', 'Clear 5 levels without the bench', 50],
    ['hard', 2, 'total', 'Beat 2 hard levels', 50],
    ['level', 16, 'run', 'Reach level 16', 80],
    ['riders', 4000, 'total', 'Board 4,000 passengers', 80],
    ['hard', 12, 'total', 'Beat 12 hard levels', 100],
  ],
  levels: { authored: 30, bossEvery: 5 },
  upgrades: [
    { id: 'vip', icon: '🚁', label: 'VIP Pass', desc: '+1 VIP pickup at the start of a run', max: 3, cost: 90 },
    { id: 'bench', icon: '🪑', label: 'Long Bench', desc: '+1 bench seat on every level', max: 2, cost: 160 },
    { id: 'bounty', icon: '🪙', label: 'Fare Box', desc: '+15% coins from each run', max: 5, cost: 80 },
  ],
}
