import type { ActionInfo } from '../../data/actionKit'

export const INFO: ActionInfo = {
  meta: {
    id: 'beats',
    title: 'Beat Tapper',
    blurb: 'Tap four lanes to fresh synth tracks — every song a little faster.',
    path: '/play/beats',
    accent: '#A21CAF',
    eta: '3–10 min',
    tag: 'Action',
    tags: ['Action', 'Rhythm', 'Music', 'Reflex'],
    icon: '🥁',
    howTo: [
      'Tap a lane (or press D F J K) when its note reaches the glowing line. Keep holding long notes until their tail ends; tap both lanes for linked double notes.',
      'Timing scores Perfect, Great or Good. Chain hits for a combo multiplier up to ×4; Perfects fill the fever meter for double points.',
      'Misses drain your health bar — when it empties the show is over. Hits and song clears heal you.',
      'Songs are generated live and play back to back, faster each time, in new styles. Upgrades soften misses, widen timing and extend fever.',
    ],
    isNew: true,
    popularity: 88,
    addedAt: '2026-10-03',
  },
  missions: [
    ['songs', 1, 'run', 'Clear your first song', 30],
    ['combo', 30, 'run', 'Hit a 30-note combo', 30],
    ['perfects', 200, 'total', 'Land 200 Perfect hits', 40],
    ['songs', 3, 'run', 'Clear 3 songs in one run', 50],
    ['fevers', 10, 'total', 'Trigger Fever 10 times', 50],
    ['combo', 100, 'run', 'Hit a 100-note combo', 50],
    ['songs', 6, 'run', 'Clear 6 songs in one run', 80],
    ['perfects', 5000, 'total', 'Land 5,000 Perfect hits', 80],
    ['combo', 300, 'run', 'Hit a 300-note combo', 100],
  ],
  upgrades: [
    { id: 'heart', icon: '❤️', label: 'Thick Skin', desc: 'Misses drain 12% less health', max: 4, cost: 90 },
    { id: 'assist', icon: '🎯', label: 'Timing Assist', desc: 'Hit windows 10% wider', max: 3, cost: 120 },
    { id: 'fever', icon: '🔥', label: 'Fever Rush', desc: 'Fever lasts 1.5s longer, +5% coins', max: 4, cost: 80 },
  ],
}
