import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'bridge',
    title: 'Bridge Builder',
    blurb: 'Lay beams across the gap so the traffic makes it over.',
    path: '/play/bridge',
    accent: '#0369A1',
    eta: '3–8 min',
    tag: 'Building',
    tags: ['Building', 'Physics', 'Brain'],
    icon: '🌉',
    howTo: [
      'Drag from a red anchor or a joint to place a beam; tap a beam to remove it. Road carries wheels, wood and steel hold it up.',
      'Press GO: the bridge settles, then traffic drives across. Beams glow green to red under load and snap when overloaded.',
      'Get every vehicle to the flag. Spend less of the budget for more stars; a collapse costs a retry.',
      '32 hand-made sites: cliffs, ship lanes, wind, trucks and buses, a boss crossing every 5th. Pick a site perk every 4 levels.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 4, 'run', 'Reach level 4', 30],
    ['stars', 15, 'total', 'Earn 15 stars', 30],
    ['bridges', 10, 'total', 'Open 10 bridges', 40],
    ['level', 10, 'run', 'Reach level 10', 50],
    ['threestar', 10, 'total', 'Build 10 three-star bridges', 50],
    ['flawless', 6, 'run', 'Open 6 bridges in a row, no fails', 50],
    ['level', 18, 'run', 'Reach level 18', 80],
    ['stars', 250, 'total', 'Earn 250 stars', 80],
    ['bridges', 150, 'total', 'Open 150 bridges', 100],
  ],
  levels: { authored: 32, bossEvery: 5 },
  upgrades: [
    { id: 'budget', icon: '💰', label: 'City Funding', desc: '+6% budget on every level', max: 5, cost: 90 },
    { id: 'strong', icon: '🔩', label: 'Tough Materials', desc: 'All beams 6% stronger', max: 4, cost: 110 },
    { id: 'retry', icon: '🔧', label: 'Spare Crew', desc: '+1 retry per run', max: 3, cost: 140 },
  ],
}
