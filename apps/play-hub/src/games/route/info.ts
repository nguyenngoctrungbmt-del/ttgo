import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'route',
    title: 'Route Recall',
    blurb: 'Memorise the directions, then drive the route turn by turn.',
    path: '/play/route',
    accent: '#0284C7',
    eta: '2–5 min',
    tag: 'Memory',
    tags: ['Memory', 'Driving', 'Brain'],
    icon: '🚕',
    howTo: [
      'Study the turn-by-turn directions before your fare starts — tap to start driving early.',
      'The taxi drives itself. Before each junction tap LEFT, AHEAD or RIGHT; it waits for you, so take your time.',
      'A wrong turn costs a heart and replays the remaining directions. Later fares use landmarks: "Left at the Cafe".',
      'Tap the GPS pin to peek at the route. Fast fares earn a speed bonus, and every 5th fare is a VIP ride.',
    ],
    isNew: true,
    popularity: 87,
    addedAt: '2026-10-04',
  },
  missions: [
    ['level', 4, 'run', 'Reach fare 4', 30],
    ['turns', 40, 'total', 'Make 40 correct turns', 30],
    ['perfect', 3, 'run', 'Drive 3 perfect fares in a run', 40],
    ['level', 10, 'run', 'Reach fare 10', 50],
    ['speed', 10, 'total', 'Earn 10 speed bonuses', 50],
    ['turns', 400, 'total', 'Make 400 correct turns', 50],
    ['level', 20, 'run', 'Reach fare 20', 80],
    ['perfect', 12, 'run', 'Drive 12 perfect fares in a run', 80],
    ['turns', 2000, 'total', 'Make 2,000 correct turns', 100],
  ],
  levels: { authored: 50, bossEvery: 5 },
  upgrades: [
    { id: 'study', icon: '🗺️', label: 'Route Planner', desc: '+15% time to study directions', max: 4, cost: 80 },
    { id: 'gps', icon: '📍', label: 'GPS Peek', desc: 'Start each run with +1 route peek', max: 3, cost: 70 },
    { id: 'tire', icon: '🛞', label: 'Spare Tire', desc: '+1 wrong turn forgiven per run', max: 3, cost: 140 },
  ],
}
