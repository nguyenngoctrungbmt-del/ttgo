/**
 * Hand-designed Sky Archer levels (1–30). Levels beyond the list are generated.
 *
 * Coordinates are fractions of the arena (x of width, y of height). Targets are
 * [x, y, radius px, swing amplitude px, swing speed]. Balloons rise from the ground:
 * `bal` = [seconds between spawns, rise speed px/s, x from, x to]. Birds: [seconds between, speed px/s].
 * `arrows` is the level's quiver (plus the Big Quiver upgrade and up to 5 left-over arrows).
 * Every level is cleared by the scripted bot in scratch/lv4/bot-archer.js (ballistic solver with
 * wind, moving-target lead and a friend-safety check) using well under its arrow budget.
 */

export type ArcherGoal = { balloons: number; birds: number; targets: number; apples: number }
export type ArcherLevel = {
  name: string
  tip?: string
  goal: ArcherGoal
  arrows: number
  wind: number
  sky: number
  bal: [number, number, number, number]
  birds?: [number, number]
  targets?: [number, number, number, number, number][]
  friend?: number
  /** Golden balloon chance. */
  golden?: number
  /** Balloon radius in px. */
  br?: number
  /** Golden stars (+3 arrows) drift by now and then. */
  stars?: boolean
}

const g = (balloons: number, birds = 0, targets = 0, apples = 0): ArcherGoal => ({ balloons, birds, targets, apples })

export const ARCHER_LEVELS: ArcherLevel[] = [
  // ── Meadow: learn the bow ──────────────────────────────────
  { name: 'Practice Range', tip: 'drag back, aim with the dots, release', goal: g(5), arrows: 10, wind: 0, sky: 0, bal: [1.2, 40, 0.5, 0.9], br: 17 },
  { name: 'Bullseye', tip: 'the centre ring gives an arrow back', goal: g(3, 0, 2), arrows: 10, wind: 0, sky: 0, bal: [1.3, 45, 0.45, 0.9], targets: [[0.62, 0.6, 22, 0, 0], [0.85, 0.5, 20, 0, 0]] },
  { name: 'Birdwatch', tip: 'lead the birds — shoot where they will be', goal: g(4, 2), arrows: 12, wind: 0, sky: 0, bal: [1.2, 50, 0.45, 0.9], birds: [2.6, 80] },
  { name: 'William Tell', tip: 'hit the apple, never your friend', goal: g(3, 0, 1, 1), arrows: 10, wind: 0, sky: 0, bal: [1.3, 50, 0.4, 0.75], targets: [[0.6, 0.55, 20, 0, 0]], friend: 0.85 },
  { name: 'Balloon Festival', tip: 'boss — pop 18, line them up for multi-pops', goal: g(18), arrows: 22, wind: 0, sky: 0, bal: [0.32, 55, 0.4, 0.95], golden: 0.12, stars: true },
  // ── Breezy hills: wind ─────────────────────────────────────
  { name: 'First Breeze', tip: 'wind pushes arrows — watch the flag', goal: g(5, 0, 1), arrows: 11, wind: 1, sky: 0, bal: [1.1, 55, 0.45, 0.9], targets: [[0.7, 0.58, 20, 0, 0]] },
  { name: 'Swing Time', tip: 'targets on ropes swing up and down', goal: g(3, 0, 2), arrows: 11, wind: 0.6, sky: 0, bal: [1.2, 55, 0.45, 0.9], targets: [[0.62, 0.38, 19, 45, 1], [0.84, 0.45, 19, 55, 1.3]] },
  { name: 'Lazy Floaters', tip: 'breather — slow balloons, gentle wind', goal: g(8), arrows: 12, wind: -0.5, sky: 0, bal: [0.8, 35, 0.4, 0.95], br: 17, golden: 0.08 },
  { name: 'Crosswind', tip: 'headwind — aim further right', goal: g(5, 2), arrows: 13, wind: -1.8, sky: 0, bal: [1.1, 55, 0.45, 0.95], birds: [2.8, 85] },
  { name: 'Sky Circus', tip: 'boss — targets, birds and an apple', goal: g(4, 2, 2, 1), arrows: 17, wind: 1.2, sky: 0, bal: [1.2, 60, 0.4, 0.75], birds: [2.6, 90], targets: [[0.58, 0.4, 18, 50, 1.1], [0.72, 0.3, 17, 40, 1.4]], friend: 0.87, stars: true },
  // ── Golden afternoon ────────────────────────────────────────
  { name: 'Long Shot', tip: 'far targets need a full draw', goal: g(3, 0, 2), arrows: 10, wind: 0.4, sky: 1, bal: [1.3, 55, 0.5, 0.9], targets: [[0.9, 0.42, 16, 0, 0], [0.92, 0.66, 16, 0, 0]] },
  { name: 'Flock', tip: 'a whole flock — one arrow can drop two', goal: g(3, 4), arrows: 13, wind: 0.8, sky: 1, bal: [1.4, 55, 0.5, 0.9], birds: [1.6, 85] },
  { name: 'Gale', tip: 'strong tailwind carries everything', goal: g(8), arrows: 13, wind: 2.4, sky: 1, bal: [0.85, 60, 0.35, 0.8] },
  { name: 'Picnic', tip: 'breather — easy pops and a gold star', goal: g(6, 0, 1), arrows: 12, wind: 0, sky: 1, bal: [0.9, 45, 0.45, 0.95], targets: [[0.66, 0.6, 22, 0, 0]], br: 17, stars: true, golden: 0.08 },
  { name: 'Storm Festival', tip: 'boss — a balloon rush in a headwind', goal: g(20), arrows: 24, wind: -2, sky: 1, bal: [0.3, 65, 0.45, 0.98], golden: 0.12, stars: true },
  // ── Dusk ───────────────────────────────────────────────────
  { name: 'Apple Twice', tip: 'the apple regrows — hit it twice', goal: g(2, 0, 0, 2), arrows: 10, wind: 0.5, sky: 2, bal: [1.4, 55, 0.4, 0.7], friend: 0.82 },
  { name: 'Pendulum', tip: 'three swinging targets', goal: g(2, 0, 3), arrows: 12, wind: -0.8, sky: 2, bal: [1.4, 55, 0.4, 0.9], targets: [[0.55, 0.35, 17, 60, 1.2], [0.72, 0.42, 17, 50, 1.6], [0.88, 0.3, 16, 40, 2]] },
  { name: 'Quick Birds', tip: 'faster birds — lead them more', goal: g(3, 3), arrows: 13, wind: 0, sky: 2, bal: [1.3, 60, 0.45, 0.9], birds: [2, 120] },
  { name: 'Evening Breeze', tip: 'breather — balloons drift in a soft wind', goal: g(9), arrows: 13, wind: 0.8, sky: 2, bal: [0.7, 45, 0.4, 0.9], golden: 0.08 },
  { name: 'Twilight Show', tip: 'boss — everything moves', goal: g(5, 3, 2, 1), arrows: 19, wind: -1.4, sky: 2, bal: [1, 65, 0.4, 0.75], birds: [2.2, 100], targets: [[0.6, 0.38, 16, 55, 1.4], [0.72, 0.28, 16, 45, 1.8]], friend: 0.88, stars: true },
  // ── Starry night ───────────────────────────────────────────
  { name: 'Night Owls', tip: 'birds at night are hard to see', goal: g(3, 3), arrows: 13, wind: 0.6, sky: 3, bal: [1.3, 60, 0.45, 0.9], birds: [2.2, 100] },
  { name: 'Lantern Rise', tip: 'small fast balloons', goal: g(8), arrows: 14, wind: -1, sky: 3, bal: [0.8, 75, 0.4, 0.95], br: 12, golden: 0.06 },
  { name: 'Moon Targets', tip: 'swinging targets in a crosswind', goal: g(2, 0, 3), arrows: 12, wind: 1.6, sky: 3, bal: [1.4, 60, 0.4, 0.9], targets: [[0.58, 0.32, 16, 50, 1.3], [0.74, 0.5, 16, 40, 1.7], [0.9, 0.36, 15, 55, 1.1]] },
  { name: 'Star Shower', tip: 'breather — golden stars refill your quiver', goal: g(7, 1), arrows: 12, wind: 0, sky: 3, bal: [0.9, 50, 0.45, 0.95], birds: [3.5, 80], golden: 0.1, stars: true },
  { name: 'Midnight Gauntlet', tip: 'boss — rush, wind and a friend in the way', goal: g(16, 0, 0, 1), arrows: 24, wind: 1.8, sky: 3, bal: [0.34, 70, 0.4, 0.75], friend: 0.88, golden: 0.12, stars: true },
  // ── Masters: everything remixed ─────────────────────────────
  { name: 'Sniper Ridge', tip: 'tiny far targets, no wind', goal: g(2, 0, 3), arrows: 11, wind: 0, sky: 0, bal: [1.5, 60, 0.5, 0.9], targets: [[0.88, 0.3, 13, 0, 0], [0.92, 0.5, 13, 0, 0], [0.7, 0.24, 13, 0, 0]] },
  { name: 'Hurricane', tip: 'the strongest wind yet', goal: g(6, 2), arrows: 15, wind: -3, sky: 1, bal: [0.9, 65, 0.5, 0.98], birds: [2.6, 95] },
  { name: 'Orchard', tip: 'apples and targets side by side', goal: g(3, 0, 2, 2), arrows: 13, wind: 0.9, sky: 2, bal: [1.3, 60, 0.4, 0.7], targets: [[0.6, 0.45, 17, 35, 1.2], [0.7, 0.62, 17, 0, 0]], friend: 0.86 },
  { name: 'Carnival', tip: 'breather — big balloons and golden luck', goal: g(10), arrows: 14, wind: 0.5, sky: 0, bal: [0.6, 50, 0.4, 0.95], br: 17, golden: 0.14, stars: true },
  { name: 'Grand Finale', tip: 'final boss — prove you are the sky archer', goal: g(10, 4, 3, 1), arrows: 30, wind: -1.6, sky: 3, bal: [0.6, 70, 0.4, 0.76], birds: [1.8, 110], targets: [[0.58, 0.36, 15, 55, 1.5], [0.7, 0.26, 15, 45, 1.9], [0.62, 0.6, 15, 0, 0]], friend: 0.88, golden: 0.08, stars: true },
]

export const ARCHER_AUTHORED = ARCHER_LEVELS.length
