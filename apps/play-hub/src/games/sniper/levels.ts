/**
 * Hand-designed Sniper Scope missions (levels 1–30). Levels beyond the list are generated.
 *
 * Platforms are the five scene rows: 0 = farthest (~600 m) … 4 = nearest (~120 m).
 * People are [platform, x] with x = 0..1 along that platform. `seed` fixes the scene layout.
 * `time` (s) and `ammo` (rounds, before the Extended Mag upgrade) are optional overrides.
 * Every mission is cleared by the scripted marksman in scratch/lv4/bot-sniper.js (drop/drift
 * compensation, target lead, civilian line-of-fire check) within its time and ammo.
 */

import type { Theme } from './scene'

export type SniperLevel = {
  name: string
  tip?: string
  theme: Theme
  seed: number
  objective: 'clear' | 'vip'
  wind: number
  hostiles: [number, number][]
  civilians?: [number, number][]
  snipers?: [number, number][]
  /** VIP walks along this platform (VIP missions). */
  vip?: number
  time?: number
  ammo?: number
}

export const SNIPER_LEVELS: SniperLevel[] = [
  // ── Rooftops: learn the scope ───────────────────────────────
  { name: 'Rooftop Warm-up', tip: 'drag to aim · hold STEADY · tap FIRE', theme: 'city', seed: 101, objective: 'clear', wind: 0, hostiles: [[4, 0.4], [3, 0.6]], civilians: [[4, 0.8]], time: 60 },
  { name: 'Red Caps Only', tip: 'hostiles wear red caps — spare the rest', theme: 'forest', seed: 202, objective: 'clear', wind: 0, hostiles: [[3, 0.2], [4, 0.7], [2, 0.5]], civilians: [[3, 0.6], [4, 0.3]] },
  { name: 'The Courier', tip: 'VIP mission — stop the man in the suit before he leaves', theme: 'harbor', seed: 303, objective: 'vip', wind: 0, vip: 2, hostiles: [[3, 0.4]], civilians: [[4, 0.5]] },
  { name: 'Glint', tip: 'a sniper glints before he fires — shoot him first', theme: 'city', seed: 404, objective: 'clear', wind: 0, hostiles: [[3, 0.3], [4, 0.6]], snipers: [[1, 0.5]], civilians: [[3, 0.7]] },
  { name: 'Rooftop Siege', tip: 'boss mission — clear six hostiles', theme: 'city', seed: 505, objective: 'clear', wind: 0, hostiles: [[4, 0.2], [4, 0.8], [3, 0.4], [2, 0.6], [1, 0.3], [3, 0.85]], civilians: [[4, 0.5], [2, 0.2]], snipers: [[0, 0.5]], time: 85 },
  // ── Pine Ridge: wind and drop ──────────────────────────────
  { name: 'Ridge Breeze', tip: 'wind pushes the bullet — use the side ticks', theme: 'forest', seed: 606, objective: 'clear', wind: 2, hostiles: [[2, 0.3], [3, 0.7], [1, 0.5]], civilians: [[2, 0.7]] },
  { name: 'Long Range', tip: 'far shots drop — hold over with the range ticks', theme: 'forest', seed: 707, objective: 'clear', wind: -1, hostiles: [[0, 0.4], [1, 0.6], [0, 0.8]], civilians: [[1, 0.2]], time: 70 },
  { name: 'Market Day', tip: 'breather — close targets in a busy street', theme: 'city', seed: 808, objective: 'clear', wind: 1, hostiles: [[4, 0.3], [3, 0.6], [4, 0.75]], civilians: [[4, 0.5], [3, 0.3], [3, 0.85]] },
  { name: 'Dockside Deal', tip: 'the VIP walks fast — lead your shot', theme: 'harbor', seed: 909, objective: 'vip', wind: -2, vip: 1, hostiles: [[2, 0.3], [3, 0.6]], civilians: [[1, 0.8], [3, 0.2]] },
  { name: 'Ridge Fortress', tip: 'boss mission — two snipers cover the ridge', theme: 'forest', seed: 1010, objective: 'clear', wind: 3, hostiles: [[3, 0.2], [3, 0.8], [2, 0.5], [1, 0.3], [4, 0.5], [2, 0.85]], snipers: [[0, 0.3], [1, 0.75]], civilians: [[4, 0.2], [2, 0.15]], time: 90 },
  // ── Night Harbor: low light ────────────────────────────────
  { name: 'Night Shift', tip: 'night optics — green tint, same rules', theme: 'harbor', seed: 1111, objective: 'clear', wind: 1, hostiles: [[3, 0.3], [2, 0.6], [4, 0.8], [1, 0.4]], civilians: [[3, 0.7], [4, 0.3]] },
  { name: 'Crowd Control', tip: 'civilians mingle with hostiles — wait for a clean shot', theme: 'city', seed: 1212, objective: 'clear', wind: 0, hostiles: [[3, 0.45], [4, 0.55], [2, 0.5]], civilians: [[3, 0.5], [4, 0.45], [2, 0.42], [4, 0.65]] },
  { name: 'Treeline', tip: 'targets hide behind trunks — catch them peeking', theme: 'forest', seed: 1313, objective: 'clear', wind: -3, hostiles: [[2, 0.2], [2, 0.7], [1, 0.5], [3, 0.4]], civilians: [[3, 0.8]] },
  { name: 'Quiet Pier', tip: 'breather — calm night, few guards', theme: 'harbor', seed: 1414, objective: 'clear', wind: 0, hostiles: [[3, 0.5], [4, 0.3], [2, 0.7]], civilians: [[4, 0.7]] },
  { name: 'Smuggler King', tip: 'boss mission — the VIP has a sniper escort', theme: 'harbor', seed: 1515, objective: 'vip', wind: 2, vip: 1, hostiles: [[2, 0.4], [3, 0.5], [0, 0.6]], snipers: [[0, 0.2]], civilians: [[3, 0.2], [4, 0.6]] },
  // ── Second tour ─────────────────────────────────────────────
  { name: 'Skyline', tip: 'two far rooftops, strong crosswind', theme: 'city', seed: 1616, objective: 'clear', wind: -4, hostiles: [[0, 0.3], [1, 0.6], [0, 0.7], [2, 0.4]], civilians: [[1, 0.2]], time: 80 },
  { name: 'Hunting Lodge', tip: 'snipers at both ends', theme: 'forest', seed: 1717, objective: 'clear', wind: 2, hostiles: [[3, 0.5], [2, 0.3]], snipers: [[0, 0.2], [1, 0.8]], civilians: [[3, 0.2]] },
  { name: 'Lantern Walk', tip: 'breather — a slow VIP', theme: 'harbor', seed: 1818, objective: 'vip', wind: 0, vip: 2, hostiles: [[3, 0.6]], civilians: [[2, 0.8], [4, 0.4]] },
  { name: 'Busy Plaza', tip: 'many civilians, three hostiles', theme: 'city', seed: 1919, objective: 'clear', wind: 1, hostiles: [[4, 0.35], [3, 0.7], [2, 0.2]], civilians: [[4, 0.2], [4, 0.55], [3, 0.4], [3, 0.85], [2, 0.6]] },
  { name: 'Ridge Ambush', tip: 'boss mission — eight hostiles and a sniper', theme: 'forest', seed: 2020, objective: 'clear', wind: -3, hostiles: [[4, 0.2], [4, 0.75], [3, 0.35], [3, 0.8], [2, 0.5], [1, 0.25], [1, 0.75], [0, 0.5]], snipers: [[1, 0.5]], civilians: [[3, 0.6], [2, 0.15]], time: 100 },
  // ── Third tour: remix ───────────────────────────────────────
  { name: 'Container Yard', tip: 'crates everywhere — patience', theme: 'harbor', seed: 2121, objective: 'clear', wind: 3, hostiles: [[2, 0.25], [3, 0.55], [1, 0.7], [4, 0.85]], civilians: [[2, 0.6], [4, 0.4]] },
  { name: 'Penthouse', tip: 'the VIP is far away — mind the drop', theme: 'city', seed: 2222, objective: 'vip', wind: -2, vip: 1, hostiles: [[1, 0.2], [2, 0.6], [3, 0.4]], civilians: [[2, 0.3], [3, 0.75]] },
  { name: 'Gale Ridge', tip: 'the strongest wind yet', theme: 'forest', seed: 2323, objective: 'clear', wind: 6, hostiles: [[2, 0.3], [3, 0.6], [1, 0.45]], civilians: [[3, 0.25]], time: 75 },
  { name: 'Calm Harbor', tip: 'breather — close range clean-up', theme: 'harbor', seed: 2424, objective: 'clear', wind: 0, hostiles: [[4, 0.3], [4, 0.7], [3, 0.5]], civilians: [[3, 0.2]] },
  { name: 'Downtown Showdown', tip: 'boss mission — three snipers over the city', theme: 'city', seed: 2525, objective: 'clear', wind: 2, hostiles: [[4, 0.3], [3, 0.6], [2, 0.4], [3, 0.15], [4, 0.85]], snipers: [[0, 0.3], [1, 0.6], [0, 0.85]], civilians: [[4, 0.55], [2, 0.75]], time: 100 },
  // ── Master missions ────────────────────────────────────────
  { name: 'Ghost Trail', tip: 'far VIP in a crosswind', theme: 'forest', seed: 2626, objective: 'vip', wind: 4, vip: 1, hostiles: [[2, 0.5], [0, 0.3]], civilians: [[1, 0.7], [3, 0.4]] },
  { name: 'Clean Sweep', tip: 'every hostile is far away', theme: 'harbor', seed: 2727, objective: 'clear', wind: -3, hostiles: [[0, 0.2], [0, 0.6], [1, 0.4], [1, 0.8], [2, 0.5]], civilians: [[1, 0.6]], time: 90 },
  { name: 'Sunset Stroll', tip: 'breather — easy pickings', theme: 'city', seed: 2828, objective: 'clear', wind: 1, hostiles: [[3, 0.3], [4, 0.6], [3, 0.8]], civilians: [[4, 0.3]] },
  { name: 'Sniper Duel', tip: 'four snipers, nowhere to hide', theme: 'forest', seed: 2929, objective: 'clear', wind: -2, hostiles: [[3, 0.5]], snipers: [[0, 0.25], [1, 0.7], [0, 0.75], [1, 0.25]], civilians: [[3, 0.2]], time: 90 },
  { name: 'The Kingpin', tip: 'final boss — guards, snipers and a fleeing VIP', theme: 'harbor', seed: 3030, objective: 'vip', wind: 3, vip: 2, hostiles: [[2, 0.3], [3, 0.5], [1, 0.6], [4, 0.4]], snipers: [[0, 0.4], [1, 0.2]], civilians: [[3, 0.75], [4, 0.2], [2, 0.8]] },
]

export const SNIPER_AUTHORED = SNIPER_LEVELS.length
