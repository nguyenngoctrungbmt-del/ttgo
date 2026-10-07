import type { APlate, AuthoredLevel } from './levels'

/*
 * Hand-designed Screw Jam levels. Board: x 0..1, y 0..1.12; later plates sit on top.
 * Plates are written by their screw-hole positions: seg() = bar with holes at both ends,
 * rect() = box with holes at its corners, disc() = round plate.
 * Arc: 1–5 basics (blocking, the spare tray), 6–10 icy screws, 11–15 hidden grey screws,
 * 16–20 deep stacks, 21–25 ice + hidden mixed, 26–30 picture puzzles with every twist.
 * Every 5th level is a HARD level; the level after it is a breather.
 * Colours are scrambled from a witness removal order that fits a 5-slot tray (verified by script).
 */

const R2D = 180 / Math.PI
/** Bar whose end screws sit exactly at (x0,y0) and (x1,y1); n = 3 adds a middle screw. */
function seg(x0: number, y0: number, x1: number, y1: number, n: 2 | 3 = 2): APlate {
  return { k: 'bar', x: (x0 + x1) / 2, y: (y0 + y1) / 2, hw: Math.hypot(x1 - x0, y1 - y0) / 2 + 0.06, a: Math.atan2(y1 - y0, x1 - x0) * R2D, n }
}
/** Box whose corner screws sit at x0/x1, y0/y1 (n = 2: top-left + bottom-right only). */
function rect(x0: number, y0: number, x1: number, y1: number, n: 2 | 4 = 4): APlate {
  return { k: 'box', x: (x0 + x1) / 2, y: (y0 + y1) / 2, hw: (x1 - x0) / 2 + 0.06, hh: (y1 - y0) / 2 + 0.06, a: 0, n }
}
const disc = (x: number, y: number, r: number, n: 1 | 2 = 1): APlate => ({ k: 'disc', x, y, hw: r, n })

/** Horizontal bars through every hole row, then vertical bars on top pinning every hole. */
function weave(xs: number[], ys: number[], reach = 0.14): APlate[] {
  const n = xs.length === 3 ? 3 : 2
  const out: APlate[] = ys.map((y) => seg(xs[0], y, xs[xs.length - 1], y, n))
  for (const x of xs) out.push(seg(x, ys[0] - reach, x, ys[ys.length - 1] + reach))
  return out
}
/** k boxes stepping down-right; each one pins the bottom-right screw of the one before. */
function stairs(x0: number, y0: number, k: number, dx = 0.1, dy = 0.17): APlate[] {
  return Array.from({ length: k }, (_, i) => rect(x0 + dx * i, y0 + dy * i, x0 + dx * i + 0.2, y0 + dy * i + 0.12))
}
/** A box lid held down by an X of two bars across its corners. */
function lid(cx: number, cy: number): APlate[] {
  return [rect(cx - 0.14, cy - 0.1, cx + 0.14, cy + 0.1), seg(cx - 0.21, cy - 0.21, cx + 0.21, cy + 0.21), seg(cx - 0.21, cy + 0.21, cx + 0.21, cy - 0.21)]
}
/** Ring of k two-screw discs, each pinned by a spoke bar through the centre. */
function web(cx: number, cy: number, R: number, k: 4 | 6, a0 = -90, ext = 0.16): APlate[] {
  const out: APlate[] = []
  for (let i = 0; i < k; i++) {
    const a = (a0 + (360 * i) / k) / R2D
    out.push(disc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 0.11, 2))
  }
  for (let i = 0; i < k / 2; i++) {
    const a = (a0 + (360 * i) / k) / R2D
    const e = R + ext
    out.push(seg(cx - Math.cos(a) * e, cy - Math.sin(a) * e, cx + Math.cos(a) * e, cy + Math.sin(a) * e))
  }
  return out
}

export const AUTHORED: AuthoredLevel[] = [
  // ── 1–5: basics ──
  { name: 'First Turn', colors: 2, swaps: 0, margin: 4, tip: 'tap a screw — it flies to its box', plates: [seg(0.2, 0.35, 0.8, 0.35, 3), seg(0.2, 0.75, 0.8, 0.75, 3)] },
  {
    name: 'Crossing', colors: 3, swaps: 0, margin: 4, tip: 'plates on top block the screws below',
    plates: [seg(0.24, 0.56, 0.76, 0.56, 3), disc(0.2, 0.2, 0.12, 2), disc(0.8, 0.92, 0.12, 2), seg(0.5, 0.3, 0.5, 0.82)],
  },
  {
    name: 'Spare Tray', colors: 3, swaps: 3, margin: 3, tip: 'no matching box? it waits in the tray',
    plates: [...lid(0.5, 0.6), disc(0.2, 0.15, 0.11, 2), disc(0.8, 0.15, 0.11, 2)],
  },
  {
    name: 'Weave', colors: 4, swaps: 5, margin: 3, tip: 'free the top layer first',
    plates: [...weave([0.24, 0.76], [0.3, 0.56, 0.82]), disc(0.5, 0.56, 0.12, 2)],
  },
  {
    name: 'Gearbox', colors: 5, swaps: 9, margin: 2,
    plates: [
      rect(0.2, 0.2, 0.38, 0.36), rect(0.62, 0.2, 0.8, 0.36), rect(0.2, 0.76, 0.38, 0.92), rect(0.62, 0.76, 0.8, 0.92),
      disc(0.5, 0.56, 0.25, 2), seg(0.08, 0.2, 0.92, 0.2, 3), seg(0.08, 0.92, 0.92, 0.92, 3),
    ],
  },
  // ── 6–10: icy screws ──
  {
    name: 'Ice Rink', colors: 4, swaps: 4, margin: 3, ice: 3, tip: 'icy screws need two taps',
    plates: [seg(0.22, 0.3, 0.78, 0.3, 3), seg(0.22, 0.56, 0.78, 0.56, 3), seg(0.22, 0.82, 0.78, 0.82, 3), seg(0.5, 0.16, 0.5, 0.96), disc(0.86, 1.0, 0.07)],
  },
  {
    name: 'Window Frame', colors: 4, swaps: 6, margin: 3, ice: 3,
    plates: [
      rect(0.2, 0.22, 0.38, 0.4), rect(0.62, 0.22, 0.8, 0.4), rect(0.2, 0.72, 0.38, 0.9), rect(0.62, 0.72, 0.8, 0.9),
      seg(0.38, 0.1, 0.38, 1.02), seg(0.62, 0.1, 0.62, 1.02), seg(0.08, 0.56, 0.92, 0.56, 3), disc(0.5, 0.3, 0.08),
    ],
  },
  {
    name: 'Pinwheel', colors: 5, swaps: 7, margin: 3, ice: 3,
    plates: [seg(0.16, 0.3, 0.66, 0.3), seg(0.6, 0.16, 0.6, 0.66), seg(0.84, 0.82, 0.34, 0.82), seg(0.4, 0.96, 0.4, 0.46), disc(0.5, 0.56, 0.17), disc(0.86, 0.12, 0.08), disc(0.14, 1.0, 0.08), disc(0.86, 1.0, 0.08)],
  },
  {
    name: 'Staircase', colors: 5, swaps: 8, margin: 2, ice: 2, tip: 'each step pins the one below',
    plates: stairs(0.12, 0.08, 6),
  },
  {
    name: 'Clocktower', colors: 6, swaps: 12, margin: 2, ice: 5,
    plates: [
      seg(0.3, 0.14, 0.3, 1.02, 3), seg(0.7, 0.14, 0.7, 1.02, 3),
      seg(0.14, 0.14, 0.86, 0.14, 3), seg(0.14, 0.58, 0.86, 0.58, 3), seg(0.14, 1.02, 0.86, 1.02, 3),
      disc(0.5, 0.36, 0.24, 2), disc(0.1, 0.8, 0.07), disc(0.9, 0.8, 0.07),
    ],
  },
  // ── 11–15: hidden grey screws ──
  {
    name: 'Fog', colors: 4, swaps: 4, margin: 3, hidden: 3, tip: 'grey screws reveal their colour when uncovered',
    plates: [seg(0.3, 0.22, 0.3, 0.9, 3), seg(0.7, 0.22, 0.7, 0.9, 3), seg(0.14, 0.22, 0.86, 0.22), seg(0.14, 0.9, 0.86, 0.9), disc(0.5, 0.56, 0.26), disc(0.5, 1.04, 0.06)],
  },
  {
    name: 'Bridge', colors: 5, swaps: 7, margin: 3, hidden: 4, ice: 1,
    plates: [
      seg(0.22, 0.28, 0.22, 1.0, 3), seg(0.78, 0.28, 0.78, 1.0, 3), seg(0.5, 0.5, 0.5, 1.0),
      seg(0.1, 0.28, 0.9, 0.28, 3), seg(0.12, 0.86, 0.36, 0.5), seg(0.88, 0.86, 0.64, 0.5),
    ],
  },
  { name: 'Spiderweb', colors: 5, swaps: 8, margin: 2, hidden: 5, plates: web(0.5, 0.56, 0.32, 6) },
  {
    name: 'Twin Lids', colors: 6, swaps: 9, margin: 2, hidden: 4, ice: 2,
    plates: [...lid(0.5, 0.3), ...lid(0.5, 0.84), disc(0.12, 0.56, 0.07), disc(0.88, 0.56, 0.07), seg(0.3, 0.57, 0.7, 0.57)],
  },
  {
    name: 'Vault Door', colors: 6, swaps: 14, margin: 1, hidden: 5, ice: 3,
    plates: [...web(0.5, 0.56, 0.3, 4, -45), rect(0.1, 0.1, 0.3, 0.2, 2), rect(0.7, 0.1, 0.9, 0.2, 2), rect(0.1, 0.92, 0.3, 1.02, 2), rect(0.7, 0.92, 0.9, 1.02, 2), disc(0.5, 0.56, 0.16, 2)],
  },
  // ── 16–20: deep stacks ──
  { name: 'Scaffold', colors: 5, swaps: 6, margin: 3, plates: weave([0.18, 0.5, 0.82], [0.28, 0.56, 0.84]) },
  {
    name: 'Kite', colors: 6, swaps: 9, margin: 2, ice: 2, hidden: 2,
    plates: [
      seg(0.36, 0.42, 0.64, 0.42), { k: 'box', x: 0.5, y: 0.5, hw: 0.22, hh: 0.22, a: 45, n: 4 },
      seg(0.5, 0.12, 0.5, 0.88), seg(0.12, 0.5, 0.88, 0.5), disc(0.5, 0.5, 0.07),
      disc(0.42, 0.98, 0.05), disc(0.55, 1.04, 0.05), disc(0.66, 0.96, 0.05), disc(0.78, 1.03, 0.05),
    ],
  },
  {
    name: 'Bookshelf', colors: 6, swaps: 10, margin: 2, ice: 3, tip: 'shelves pin the books — top shelf first',
    plates: [
      ...[0.2, 0.35, 0.5, 0.65, 0.8].map((x) => seg(x, 0.24, x, 0.5)),
      ...[0.275, 0.425, 0.575, 0.725].map((x) => seg(x, 0.66, x, 0.92)),
      seg(0.06, 0.5, 0.94, 0.5), seg(0.06, 0.92, 0.94, 0.92), seg(0.06, 0.24, 0.94, 0.24),
    ],
  },
  { name: 'Lattice', colors: 6, swaps: 11, margin: 2, hidden: 3, plates: [seg(0.2, 0.2, 0.2, 0.92, 3), seg(0.5, 0.2, 0.5, 0.92, 3), seg(0.8, 0.2, 0.8, 0.92, 3), seg(0.08, 0.2, 0.92, 0.2), seg(0.08, 0.56, 0.92, 0.56), seg(0.08, 0.92, 0.92, 0.92), disc(0.35, 0.38, 0.07), disc(0.65, 0.74, 0.07), disc(0.35, 0.74, 0.07)] },
  {
    name: 'Engine Block', colors: 7, swaps: 15, margin: 1, ice: 4, hidden: 4,
    plates: [...lid(0.5, 0.28), ...weave([0.16, 0.5, 0.84], [0.66, 0.92], 0.13), disc(0.1, 0.3, 0.07)],
  },
  // ── 21–25: ice + hidden ──
  { name: 'Snowflake', colors: 5, swaps: 6, margin: 3, ice: 6, plates: [...web(0.5, 0.56, 0.28, 6, 0), disc(0.5, 0.56, 0.08)] },
  {
    name: 'Crossroads', colors: 6, swaps: 10, margin: 2, ice: 3, hidden: 4,
    plates: [...lid(0.27, 0.28), ...lid(0.73, 0.84), rect(0.62, 0.16, 0.86, 0.4), rect(0.14, 0.72, 0.38, 0.96, 2), seg(0.5, 0.2, 0.5, 0.92)],
  },
  {
    name: 'Chain Links', colors: 6, swaps: 10, margin: 2, hidden: 4, ice: 2, tip: 'work down the chain',
    plates: [...[0, 1, 2, 3, 4, 5].map((i) => disc(0.15 + i * 0.1, 0.14 + i * 0.15, 0.15, 2)), disc(0.8, 0.2, 0.12, 2), disc(0.2, 0.9, 0.08)],
  },
  {
    name: 'Mosaic', colors: 7, swaps: 12, margin: 2, ice: 3, hidden: 5,
    plates: [...weave([0.16, 0.5, 0.84], [0.2, 0.44]), ...stairs(0.6, 0.66, 2), rect(0.14, 0.72, 0.38, 0.96)],
  },
  {
    name: 'Robot', colors: 7, swaps: 16, margin: 1, ice: 4, hidden: 6, tip: 'take the robot apart!',
    plates: [
      rect(0.32, 0.5, 0.68, 0.86), // body
      rect(0.36, 0.12, 0.64, 0.36), // head
      seg(0.14, 0.62, 0.08, 0.86), seg(0.86, 0.62, 0.92, 0.86), // arms
      seg(0.42, 0.8, 0.42, 1.04), seg(0.58, 0.8, 0.58, 1.04), // legs
      seg(0.2, 0.86, 0.8, 0.86), // belt
      seg(0.14, 0.5, 0.86, 0.5), // shoulders
      seg(0.5, 0.4, 0.5, 0.56), // neck
      disc(0.44, 0.24, 0.05), disc(0.56, 0.24, 0.05), // eyes
    ],
  },
  // ── 26–30: picture puzzles with every twist ──
  {
    name: 'Rocket', colors: 5, swaps: 6, margin: 3, ice: 2, hidden: 2,
    plates: [rect(0.38, 0.3, 0.62, 0.86), seg(0.5, 0.08, 0.5, 0.3), seg(0.22, 1.0, 0.38, 0.72), seg(0.78, 1.0, 0.62, 0.72), disc(0.5, 0.52, 0.1, 1), seg(0.3, 0.86, 0.7, 0.86, 3)],
  },
  {
    name: 'Fortress', colors: 7, swaps: 12, margin: 2, ice: 4, hidden: 4,
    plates: [
      disc(0.2, 0.24, 0.11, 2), disc(0.5, 0.24, 0.11, 2), disc(0.8, 0.24, 0.11, 2), seg(0.06, 0.3, 0.94, 0.3),
      rect(0.2, 0.6, 0.8, 1.0), rect(0.42, 0.76, 0.58, 1.0, 2), seg(0.08, 0.6, 0.92, 0.6), seg(0.08, 1.0, 0.92, 1.0),
    ],
  },
  {
    name: 'Tangle', colors: 7, swaps: 14, margin: 2, ice: 4, hidden: 5,
    plates: [...[0.2, 0.45, 0.7, 0.95].map((y) => seg(0.15, y, 0.85, y)), seg(0.15, 0.33, 0.15, 0.82), seg(0.85, 0.33, 0.85, 0.82), seg(0.08, 0.1, 0.92, 0.98), seg(0.92, 0.1, 0.08, 0.98), disc(0.5, 0.3, 0.06), disc(0.5, 0.8, 0.06)],
  },
  {
    name: 'Ferris Wheel', colors: 8, swaps: 14, margin: 2, ice: 4, hidden: 6,
    plates: [seg(0.42, 0.62, 0.24, 1.02), seg(0.58, 0.62, 0.76, 1.02), ...web(0.5, 0.48, 0.28, 6, -90, 0.14), disc(0.5, 0.48, 0.07)],
  },
  {
    name: 'Grand Machine', colors: 8, swaps: 20, margin: 1, ice: 6, hidden: 8, tip: 'the final machine — good luck!',
    plates: [...stairs(0.06, 0.08, 3), ...lid(0.72, 0.28), ...weave([0.16, 0.5, 0.84], [0.72, 0.94], 0.12), disc(0.33, 0.83, 0.06)],
  },
]
