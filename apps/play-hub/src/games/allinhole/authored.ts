import type { AuthoredLevel, Kind, Wall } from './levels'

/*
 * Hand-designed All in Hole levels. Table: x 0..1, y 0..1.4 (the hole starts bottom-centre).
 * Arc: 1–5 steering, growing, walls · 6–10 bombs and moving platforms · 11–15 mazes and patterns ·
 * 16–20 big items and timing · 21–25 mixed themes · 26–30 everything. Every 5th level is HARD.
 * Each level is verified by a bot simulation (eat-what-fits route through the walls within the time).
 */

type O = [Kind, number, number, number]
const XS = 0.02
const S = 0.026
const M = 0.038
const B = 0.055
const H = 0.075
const G = 0.09

const one = (k: Kind, r: number, x: number, y: number): O[] => [[k, r, x, y]]
/** cols × rows block centred on (cx, cy). */
function grid(k: Kind, r: number, cx: number, cy: number, cols: number, rows: number, gap = 0.008): O[] {
  const d = r * 2 + gap
  const out: O[] = []
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out.push([k, r, cx + (i - (cols - 1) / 2) * d, cy + (j - (rows - 1) / 2) * d])
  return out
}
function ring(k: Kind, r: number, cx: number, cy: number, R: number, count: number, a0 = 0): O[] {
  return Array.from({ length: count }, (_, i) => {
    const a = a0 + (i / count) * Math.PI * 2
    return [k, r, cx + Math.cos(a) * R, cy + Math.sin(a) * R] as O
  })
}
function line(k: Kind, r: number, x0: number, y0: number, x1: number, y1: number, count: number): O[] {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1)
    return [k, r, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t] as O
  })
}
/** Bowling-pin triangle pointing down. */
function tri(k: Kind, r: number, cx: number, cy: number, rows: number): O[] {
  const out: O[] = []
  const d = r * 2 + 0.008
  for (let j = 0; j < rows; j++) for (let i = 0; i <= j; i++) out.push([k, r, cx + (i - j / 2) * d, cy - (rows - 1 - j) * d * 0.87])
  return out
}
/** Spiral from outside in; sizes grow toward the centre. */
function spiral(k: Kind, cx: number, cy: number, count: number, r0: number, r1: number): O[] {
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1)
    const a = t * Math.PI * 3.4
    const R = 0.34 * (1 - t) + 0.13
    return [k, r0 + (r1 - r0) * t, cx + Math.cos(a) * R, cy + Math.sin(a) * R * 1.1] as O
  })
}
const bombs = (...pts: [number, number][]): O[] => pts.map(([x, y]) => ['bomb', 0.028, x, y] as O)

const T = 0.03
/** Fence from the left or right edge. */
const fence = (y: number, side: 'L' | 'R', len = 0.62): Wall => ({ x: side === 'L' ? 0 : 1 - len, y, w: len, h: T })
const post = (x: number, y: number, h = 0.14): Wall => ({ x, y, w: T, h })
const mover = (y: number, speed = 0.15): Wall => ({ x: 0.1, y, w: 0.18, h: 0.035, move: { ax: 0.04, bx: 0.78, speed } })

export const AUTHORED: AuthoredLevel[] = [
  // ── 1–5: steering, growing, walls ──
  {
    name: 'Snack Time', biome: 0, tip: 'drag anywhere to steer the hole',
    objs: [...grid('apple', S, 0.5, 0.5, 5, 3), ...line('ball', XS, 0.18, 0.92, 0.82, 0.92, 7), ...grid('cube', S, 0.5, 0.2, 3, 1)],
  },
  {
    name: 'Fruit Bowl', biome: 0, tip: 'eat small things first to grow',
    objs: [...grid('apple', XS, 0.5, 1.02, 4, 2), ...ring('orange', S, 0.5, 0.55, 0.22, 12), ...grid('cookie', XS, 0.5, 0.55, 3, 3), ...one('melon', B, 0.5, 0.18)],
  },
  {
    name: 'Garden Path', biome: 1, tip: 'walls block the hole — go around',
    walls: [fence(0.95, 'L'), fence(0.5, 'R')],
    objs: [...grid('duck', S, 0.5, 1.12, 6, 1), ...grid('apple', S, 0.25, 0.75, 3, 3), ...grid('orange', M, 0.7, 0.75, 2, 2), ...grid('melon', M, 0.3, 0.28, 3, 2), ...one('melon', B, 0.75, 0.22)],
  },
  {
    name: 'Toy Box', biome: 2,
    objs: [...grid('dice', S, 0.3, 0.95, 4, 3), ...ring('ball', XS, 0.72, 0.95, 0.1, 9), ...line('duck', M, 0.15, 0.55, 0.85, 0.55, 6), ...grid('block', B, 0.5, 0.22, 3, 1, 0.03)],
  },
  {
    name: 'Picnic Rush', biome: 1,
    walls: [fence(1.05, 'R'), fence(0.72, 'L'), fence(0.4, 'R'), post(0.5, 0.08)],
    objs: [
      ...grid('apple', S, 0.3, 1.2, 4, 2), ...grid('cookie', S, 0.7, 0.88, 4, 2), ...grid('orange', M, 0.32, 0.88, 3, 1),
      ...grid('donut', M, 0.7, 0.56, 3, 2), ...line('melon', B, 0.2, 0.25, 0.4, 0.25, 2), ...grid('can', M, 0.75, 0.2, 2, 2), ...one('melon', H, 0.25, 0.56),
    ],
  },
  // ── 6–10: bombs and moving platforms ──
  {
    name: 'Minefield', biome: 3, tip: 'avoid the bombs!',
    objs: [...grid('gem', S, 0.5, 1.0, 5, 2, 0.05), ...bombs([0.3, 0.8], [0.7, 0.8], [0.5, 0.62]), ...grid('ball', S, 0.3, 0.55, 2, 3), ...grid('ball', S, 0.7, 0.55, 2, 3), ...grid('can', M, 0.5, 0.25, 4, 1, 0.04)],
  },
  {
    name: 'Conveyor Café', biome: 0, tip: 'moving platforms push things around',
    walls: [mover(0.82, 0.14), mover(0.45, 0.18)],
    objs: [...grid('cookie', S, 0.5, 1.08, 6, 2), ...grid('donut', S, 0.5, 0.64, 5, 2), ...grid('apple', M, 0.5, 0.25, 4, 2), ...one('melon', B, 0.5, 0.08)],
  },
  {
    name: 'Candy Spiral', biome: 0, tip: 'follow the spiral inward',
    objs: [...spiral('cookie', 0.5, 0.62, 18, XS, M), ...one('donut', B, 0.5, 0.62), ...line('ball', XS, 0.3, 1.1, 0.7, 1.1, 5)],
  },
  {
    name: 'Checkerboard', biome: 2,
    objs: [
      ...[0, 1, 2, 3, 4].flatMap((j) => [0, 1, 2, 3, 4].map((i) => [(i + j) % 2 ? 'dice' : 'cube', S, 0.2 + i * 0.15, 0.3 + j * 0.15] as O)),
      ...bombs([0.275, 0.375], [0.575, 0.525], [0.425, 0.825], [0.725, 0.675]),
      ...grid('block', B, 0.5, 1.1, 3, 1, 0.08),
    ],
  },
  {
    name: 'Beach Party', biome: 3,
    walls: [mover(0.95, 0.16), mover(0.5, 0.2)],
    objs: [
      ...grid('ball', S, 0.5, 1.15, 7, 1), ...grid('can', S, 0.25, 0.75, 3, 3), ...grid('can', S, 0.75, 0.75, 3, 3), ...ring('gem', S, 0.5, 0.75, 0.1, 6),
      ...line('melon', M, 0.2, 0.32, 0.8, 0.32, 5), ...line('melon', B, 0.25, 0.14, 0.75, 0.14, 3), ...one('melon', H, 0.5, 0.58),
      ...bombs([0.12, 0.95], [0.88, 0.6], [0.4, 0.45]),
    ],
  },
  // ── 11–15: mazes and patterns ──
  {
    name: 'Zen Garden', biome: 1,
    objs: [...ring('gem', XS, 0.5, 0.6, 0.12, 10), ...ring('gem', S, 0.5, 0.6, 0.22, 16), ...ring('orange', M, 0.5, 0.6, 0.34, 14), ...one('melon', B, 0.5, 0.6), ...grid('apple', XS, 0.5, 1.12, 5, 1)],
  },
  {
    name: 'Corridors', biome: 2, tip: 'sweep each corridor',
    walls: [fence(1.02, 'L', 0.7), fence(0.72, 'R', 0.7), fence(0.42, 'L', 0.7)],
    objs: [...line('duck', S, 0.12, 1.16, 0.88, 1.16, 9), ...line('dice', S, 0.12, 0.88, 0.88, 0.88, 9), ...line('can', M, 0.12, 0.58, 0.88, 0.58, 7), ...line('block', M, 0.14, 0.24, 0.86, 0.24, 6), ...line('block', B, 0.25, 0.1, 0.75, 0.1, 3)],
  },
  {
    name: 'Bowling Alley', biome: 2, tip: 'strike!',
    objs: [...line('ball', S, 0.5, 1.15, 0.5, 0.8, 6), ...tri('can', M, 0.5, 0.48, 4), ...grid('ball', M, 0.15, 0.6, 1, 4), ...grid('ball', M, 0.85, 0.6, 1, 4), ...one('ball', B, 0.5, 0.12)],
  },
  {
    name: 'Bakery', biome: 0,
    walls: [post(0.33, 0.55, 0.3), post(0.66, 0.55, 0.3)],
    objs: [...grid('cookie', S, 0.17, 0.7, 2, 5), ...grid('donut', S, 0.5, 0.7, 3, 5), ...grid('cookie', S, 0.83, 0.7, 2, 5), ...bombs([0.5, 1.05], [0.2, 0.35], [0.8, 0.35]), ...line('donut', B, 0.25, 0.2, 0.75, 0.2, 3), ...grid('apple', XS, 0.5, 1.18, 6, 1)],
  },
  {
    name: 'Big Appetite', biome: 1,
    walls: [fence(1.0, 'R', 0.66), fence(0.66, 'L', 0.66), fence(0.33, 'R', 0.66)],
    objs: [
      ...grid('apple', S, 0.3, 1.15, 5, 2), ...grid('orange', M, 0.7, 0.83, 4, 2), ...grid('duck', M, 0.3, 0.83, 2, 2),
      ...grid('melon', B, 0.4, 0.5, 4, 1, 0.02), ...one('melon', H, 0.82, 0.5), ...grid('block', B, 0.65, 0.18, 2, 1, 0.03), ...one('melon', G, 0.2, 0.17),
      ...bombs([0.85, 1.18], [0.12, 0.5], [0.9, 0.62]),
    ],
  },
  // ── 16–20: big items and timing ──
  {
    name: 'Sandcastle', biome: 3,
    objs: [...grid('block', S, 0.5, 0.95, 8, 2), ...grid('block', M, 0.5, 0.68, 5, 2), ...grid('block', B, 0.5, 0.42, 3, 1, 0.01), ...grid('block', B, 0.3, 0.22, 1, 1), ...grid('block', B, 0.7, 0.22, 1, 1), ...one('block', H, 0.5, 0.2)],
  },
  {
    name: 'Duck Pond', biome: 1,
    walls: [mover(0.3, 0.12)],
    objs: [...ring('duck', S, 0.5, 0.72, 0.16, 10), ...ring('duck', M, 0.5, 0.72, 0.3, 14), ...grid('ball', S, 0.5, 0.72, 2, 2), ...line('duck', B, 0.2, 0.18, 0.8, 0.18, 4), ...grid('apple', XS, 0.5, 1.1, 5, 1)],
  },
  {
    name: 'Dice Tower', biome: 2,
    walls: [fence(0.86, 'L', 0.4), fence(0.86, 'R', 0.4)],
    objs: [...grid('dice', XS, 0.5, 1.12, 8, 2), ...grid('dice', S, 0.5, 0.7, 4, 3), ...grid('dice', M, 0.5, 0.42, 3, 2), ...grid('dice', B, 0.5, 0.16, 2, 1, 0.02), ...line('cube', S, 0.12, 0.6, 0.12, 0.3, 4), ...line('cube', S, 0.88, 0.6, 0.88, 0.3, 4)],
  },
  {
    name: 'Melon Patch', biome: 1,
    objs: [...grid('apple', S, 0.5, 1.12, 7, 2), ...grid('melon', M, 0.5, 0.75, 5, 2, 0.05), ...grid('melon', B, 0.5, 0.42, 3, 2, 0.06), ...one('melon', H, 0.5, 0.14), ...bombs([0.2, 0.6], [0.8, 0.6], [0.5, 0.62], [0.15, 0.25], [0.85, 0.25])],
  },
  {
    name: 'Food Court', biome: 2,
    walls: [fence(1.04, 'R', 0.6), mover(0.78, 0.18), fence(0.52, 'L', 0.6), fence(0.28, 'R', 0.5)],
    objs: [
      ...grid('cookie', S, 0.24, 1.16, 5, 2), ...grid('donut', S, 0.7, 0.92, 5, 2), ...grid('can', M, 0.3, 0.92, 3, 1), ...grid('apple', M, 0.5, 0.64, 6, 1),
      ...grid('melon', B, 0.75, 0.4, 3, 1, 0.02), ...grid('block', B, 0.25, 0.4, 2, 1, 0.02), ...one('melon', H, 0.22, 0.15), ...one('block', H, 0.6, 0.14),
      ...bombs([0.9, 1.16], [0.5, 0.92], [0.93, 0.62], [0.88, 0.15]),
    ],
  },
  // ── 21–25: mixed themes ──
  {
    name: 'Tidepool', biome: 3,
    objs: [...ring('gem', XS, 0.3, 0.9, 0.08, 7), ...ring('gem', XS, 0.7, 0.9, 0.08, 7), ...ring('ball', S, 0.5, 0.5, 0.2, 12), ...grid('can', M, 0.5, 0.5, 2, 2), ...line('melon', B, 0.25, 0.16, 0.75, 0.16, 3)],
  },
  {
    name: 'Cookie Jar', biome: 0, tip: 'get inside the jar',
    walls: [post(0.22, 0.3, 0.6), post(0.75, 0.3, 0.6), { x: 0.22, y: 0.88, w: 0.2, h: T }, { x: 0.58, y: 0.88, w: 0.2, h: T }],
    objs: [...grid('cookie', S, 0.49, 0.6, 5, 7), ...grid('cookie', M, 0.1, 0.6, 1, 5), ...grid('cookie', M, 0.9, 0.6, 1, 5), ...grid('apple', S, 0.5, 1.12, 6, 1), ...one('donut', B, 0.5, 0.15)],
  },
  {
    name: 'Highway', biome: 2,
    walls: [mover(1.0, 0.2), mover(0.72, 0.26), mover(0.44, 0.22)],
    objs: [...line('can', S, 0.12, 1.15, 0.88, 1.15, 8), ...line('can', S, 0.12, 0.86, 0.88, 0.86, 8), ...line('duck', M, 0.12, 0.58, 0.88, 0.58, 7), ...line('block', B, 0.15, 0.25, 0.85, 0.25, 5), ...one('block', H, 0.5, 0.1)],
  },
  {
    name: 'Treasure Map', biome: 3, tip: 'X marks the spot',
    objs: [...line('gem', S, 0.15, 0.3, 0.85, 1.0, 11).filter((o) => Math.abs(o[2] - 0.5) > 0.06), ...line('gem', S, 0.85, 0.3, 0.15, 1.0, 11).filter((o) => Math.abs(o[2] - 0.5) > 0.06), ...one('gem', B, 0.5, 0.65), ...bombs([0.5, 0.45], [0.5, 0.88], [0.3, 0.65], [0.7, 0.65]), ...grid('ball', XS, 0.5, 1.1, 5, 1)],
  },
  {
    name: 'Kitchen Sink', biome: 0,
    walls: [fence(1.04, 'L', 0.6), mover(0.8, 0.2), fence(0.55, 'R', 0.62), post(0.3, 0.12, 0.2)],
    objs: [
      ...grid('apple', S, 0.74, 1.14, 4, 2), ...grid('cookie', S, 0.82, 0.92, 2, 3), ...grid('orange', M, 0.4, 0.7, 5, 2), ...grid('donut', M, 0.15, 0.88, 1, 3),
      ...grid('can', M, 0.2, 0.42, 3, 2), ...line('melon', B, 0.55, 0.38, 0.85, 0.38, 3), ...one('melon', H, 0.15, 0.15), ...one('block', H, 0.5, 0.18), ...one('melon', G, 0.8, 0.16),
      ...bombs([0.32, 0.9], [0.6, 0.95], [0.95, 0.47], [0.92, 0.28]),
    ],
  },
  // ── 26–30: everything ──
  {
    name: 'Garden Party', biome: 1,
    objs: [...grid('apple', S, 0.3, 1.0, 4, 4), ...grid('orange', S, 0.7, 1.0, 4, 4), ...ring('duck', M, 0.5, 0.45, 0.2, 10), ...one('melon', B, 0.5, 0.45)],
  },
  {
    name: 'Labyrinth', biome: 2,
    walls: [fence(1.1, 'R', 0.75), fence(0.88, 'L', 0.75), fence(0.66, 'R', 0.75), fence(0.44, 'L', 0.75), fence(0.22, 'R', 0.75)],
    objs: [
      ...line('dice', S, 0.12, 1.24, 0.38, 1.24, 4), ...line('cube', S, 0.15, 0.99, 0.85, 0.99, 9), ...line('dice', S, 0.15, 0.77, 0.85, 0.77, 9),
      ...line('can', M, 0.15, 0.55, 0.85, 0.55, 7), ...line('block', M, 0.15, 0.33, 0.85, 0.33, 7), ...line('block', B, 0.2, 0.1, 0.8, 0.1, 4),
    ],
  },
  {
    name: 'Storm Beach', biome: 3,
    walls: [mover(0.9, 0.24), mover(0.55, 0.28)],
    objs: [
      ...grid('ball', S, 0.5, 1.08, 8, 2), ...grid('gem', S, 0.5, 0.72, 6, 2), ...grid('can', M, 0.5, 0.36, 5, 2), ...line('melon', B, 0.2, 0.12, 0.8, 0.12, 4),
      ...bombs([0.15, 0.95], [0.4, 0.92], [0.65, 0.95], [0.88, 0.9], [0.25, 0.55], [0.75, 0.55]),
    ],
  },
  {
    name: 'Feast', biome: 0, tip: 'save the giants for last',
    objs: [...grid('cookie', XS, 0.5, 1.12, 10, 2), ...grid('apple', S, 0.5, 0.92, 7, 2), ...grid('orange', M, 0.5, 0.66, 5, 2), ...grid('melon', B, 0.5, 0.4, 4, 1, 0.03), ...line('melon', H, 0.2, 0.16, 0.8, 0.16, 3)],
  },
  {
    name: 'Grand Buffet', biome: 2, tip: 'the grand buffet — eat everything!',
    walls: [fence(1.06, 'R', 0.6), mover(0.86, 0.22), fence(0.64, 'L', 0.6), mover(0.44, 0.26)],
    objs: [
      ...grid('cookie', S, 0.22, 1.2, 5, 2), ...grid('apple', S, 0.75, 0.97, 4, 2), ...grid('donut', M, 0.3, 0.97, 4, 1), ...grid('orange', M, 0.68, 0.74, 5, 1),
      ...grid('can', M, 0.25, 0.54, 4, 1), ...grid('melon', B, 0.75, 0.54, 3, 1, 0.02), ...line('block', B, 0.15, 0.32, 0.85, 0.32, 5),
      ...one('melon', H, 0.2, 0.14), ...one('block', H, 0.8, 0.14), ...one('melon', G, 0.5, 0.15),
      ...bombs([0.92, 1.24], [0.08, 0.8], [0.93, 0.74], [0.5, 0.42], [0.06, 0.5]),
    ],
  },
]
