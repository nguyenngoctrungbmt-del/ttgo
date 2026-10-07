import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'pinball',
    title: 'Pinball Wizard',
    blurb: 'Flip, loop and chase multiball on a glowing neon table.',
    path: '/play/pinball',
    accent: '#7C3AED',
    eta: '3–10 min',
    tag: 'Action',
    tags: ['Action', 'Arcade', 'Reflex', 'Classic'],
    icon: '🎱',
    howTo: [
      'Pull down anywhere (or hold) to charge the plunger, release to launch. Hold the left or right half of the screen to flip.',
      'Bumpers, slingshots, the spinner, the left loop and the top lanes all score. Lighting all 3 lanes raises your bonus multiplier.',
      'Drop all 3 targets to light the lock, then sink the saucer for multiball. Finish 6 table missions for Wizard Mode.',
      'Draining the last ball ends the game — the ball saver gives a free relaunch right after each launch. Upgrades add balls, saver time and multiplier.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['score', 20000, 'run', 'Score 20,000 in one game', 30],
    ['bumpers', 100, 'total', 'Hit bumpers 100 times', 30],
    ['loops', 5, 'total', 'Make 5 loops', 40],
    ['score', 100000, 'run', 'Score 100,000 in one game', 50],
    ['multiball', 1, 'total', 'Start a multiball', 50],
    ['tableMissions', 3, 'run', 'Finish 3 table missions in a game', 50],
    ['score', 500000, 'run', 'Score 500,000 in one game', 80],
    ['wizard', 1, 'total', 'Reach Wizard Mode', 80],
    ['loops', 200, 'total', 'Make 200 loops in total', 100],
  ],
  upgrades: [
    { id: 'balls', icon: '⚪', label: 'Extra Ball', desc: '+1 ball every game', max: 3, cost: 160 },
    { id: 'saver', icon: '🛟', label: 'Ball Saver', desc: '+3 s of ball saver after each launch', max: 3, cost: 90 },
    { id: 'mult', icon: '✖️', label: 'Hot Start', desc: 'Start with +1 bonus multiplier', max: 3, cost: 110 },
  ],
}
