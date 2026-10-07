/**
 * Paint Wars levels: authored arenas (size, stone walls, start spots) and rival line-ups.
 * Positions are fractions of the arena (0..1). Walls are solid for everyone and can't be painted.
 * Every authored arena was cleared by the dev autopilot (scratch lv7-sweep), and `par`
 * (seconds, for the time star) is derived from those runs.
 */

export type Pers = 'timid' | 'builder' | 'hunter' | 'king'
export type RivalDef = { pers: Pers; x: number; y: number; rad?: number; name?: string }
export type Wall = { k: 'rect'; x: number; y: number; w: number; h: number } | { k: 'disc'; x: number; y: number; r: number }

export type PaintLevel = {
  name: string
  hint?: string
  G: number
  target: number
  rivals: RivalDef[]
  walls?: Wall[]
  start?: [number, number]
  /** seconds until the first arena event (rain / hunters / newcomer); 0 = none */
  events?: number
  board?: number
  par: number
}

export type PaintLevelSpec = PaintLevel & { n: number; boss: boolean; authored: boolean }

const rect = (x: number, y: number, w: number, h: number): Wall => ({ k: 'rect', x, y, w, h })
const disc = (x: number, y: number, r: number): Wall => ({ k: 'disc', x, y, r })
const T = (x: number, y: number): RivalDef => ({ pers: 'timid', x, y })
const B = (x: number, y: number): RivalDef => ({ pers: 'builder', x, y })
const H = (x: number, y: number): RivalDef => ({ pers: 'hunter', x, y })
const K = (x: number, y: number, name?: string): RivalDef => ({ pers: 'king', x, y, rad: 6, name })

/** A wall line with gaps: horizontal when w > h. */
function gappedLine(x: number, y: number, len: number, horiz: boolean, gaps: number[], gapLen = 6): Wall[] {
  const out: Wall[] = []
  let cur = 0
  for (const g of [...gaps, len].sort((a, b) => a - b)) {
    const seg = g - cur
    if (seg > 0) out.push(horiz ? rect(x + cur, y, seg, 2) : rect(x, y + cur, 2, seg))
    cur = g + gapLen
  }
  return out
}

export const LEVELS: PaintLevel[] = [
  // ── 1–5: learn the loop ─────────────────────────
  { name: 'Blank Canvas', hint: 'loop out and come home to claim the inside', G: 40, target: 16, rivals: [T(0.2, 0.2)], board: 0, par: 60 },
  { name: 'Two Brushes', hint: 'run over a rival trail to knock them out', G: 44, target: 18, rivals: [T(0.2, 0.25), B(0.8, 0.75)], board: 1, par: 70 },
  {
    name: 'Pillars',
    hint: 'stone blocks stop everyone — and can never be painted',
    G: 46,
    target: 20,
    rivals: [T(0.18, 0.8), B(0.82, 0.2)],
    walls: [rect(10, 10, 4, 4), rect(32, 10, 4, 4), rect(10, 32, 4, 4), rect(32, 32, 4, 4)],
    board: 2,
    par: 80,
  },
  { name: "Hunter's Gallery", hint: 'hunters chase trails — keep loops short', G: 48, target: 22, rivals: [T(0.2, 0.2), H(0.8, 0.8), B(0.2, 0.8)], board: 3, par: 90 },
  {
    name: "King Splat's Court",
    hint: 'boss: the King sits on a huge base — cut his trail for +1000',
    G: 52,
    target: 24,
    rivals: [K(0.25, 0.25), T(0.78, 0.78)],
    walls: [rect(24, 4, 4, 6), rect(24, 42, 4, 6)],
    start: [0.7, 0.62],
    board: 4,
    par: 110,
  },
  // ── 6–10: walls and events ──────────────────────
  {
    name: 'Split Canvas',
    hint: 'a wall splits the room — use the gaps',
    G: 54,
    target: 22,
    rivals: [B(0.2, 0.3), T(0.78, 0.25), B(0.75, 0.8)],
    walls: gappedLine(26, 0, 54, false, [12, 36]),
    start: [0.3, 0.7],
    board: 0,
    par: 100,
  },
  { name: 'Paint Rain', hint: 'events start early: bombs rain from the sky', G: 56, target: 26, rivals: [B(0.2, 0.2), T(0.8, 0.2), B(0.8, 0.8)], events: 12, board: 1, par: 100 },
  {
    name: 'Maze Studio',
    G: 58,
    target: 24,
    rivals: [B(0.15, 0.15), H(0.85, 0.85), T(0.85, 0.15)],
    walls: [rect(8, 18, 18, 2), rect(32, 18, 18, 2), rect(8, 38, 18, 2), rect(32, 38, 18, 2), rect(28, 24, 2, 10)],
    start: [0.2, 0.5],
    board: 2,
    par: 110,
  },
  { name: 'Breather Meadow', hint: 'breather: two shy rivals and room to roam', G: 56, target: 22, rivals: [T(0.2, 0.2), T(0.8, 0.8)], board: 3, par: 90 },
  {
    name: 'Royal Gallery',
    hint: 'boss: the King brings a hunter bodyguard',
    G: 62,
    target: 23,
    rivals: [K(0.25, 0.75), H(0.75, 0.25), B(0.25, 0.25)],
    walls: [disc(31, 31, 4)],
    start: [0.72, 0.72],
    events: 30,
    board: 4,
    par: 140,
  },
  // ── 11–15: crowds and rooms ─────────────────────
  { name: 'Crowded Room', hint: 'five rivals — watch every side', G: 60, target: 21, rivals: [B(0.15, 0.15), T(0.85, 0.15), B(0.15, 0.85), T(0.85, 0.85), H(0.5, 0.15)], events: 35, board: 0, par: 120 },
  {
    name: 'Four Rooms',
    hint: 'claim a room, then push through the doorways',
    G: 62,
    target: 23,
    rivals: [B(0.2, 0.2), H(0.8, 0.2), B(0.8, 0.8)],
    walls: [...gappedLine(30, 0, 62, false, [12, 44]), ...gappedLine(0, 30, 62, true, [12, 44])],
    start: [0.22, 0.75],
    events: 35,
    board: 1,
    par: 130,
  },
  {
    name: 'Island Hop',
    G: 64,
    target: 21,
    rivals: [B(0.15, 0.5), T(0.85, 0.5), B(0.5, 0.12), B(0.5, 0.88)],
    walls: [disc(18, 18, 5), disc(46, 18, 5), disc(18, 46, 5), disc(46, 46, 5)],
    events: 35,
    board: 2,
    par: 130,
  },
  { name: 'Rest Stop', hint: 'breather: take your time', G: 60, target: 19, rivals: [T(0.2, 0.2), T(0.8, 0.2), B(0.5, 0.85)], board: 3, par: 100 },
  {
    name: "King's Moat",
    hint: 'boss: the King hides inside a walled moat',
    G: 66,
    target: 25,
    rivals: [K(0.5, 0.5), H(0.15, 0.85), B(0.85, 0.15)],
    walls: [...gappedLine(18, 18, 30, true, [12]), ...gappedLine(18, 46, 30, true, [12]), ...gappedLine(18, 18, 30, false, [12]), ...gappedLine(46, 18, 30, false, [12])],
    start: [0.15, 0.2],
    events: 30,
    board: 4,
    par: 150,
  },
  // ── 16–20: hunters everywhere ───────────────────
  { name: 'Hunt Season', hint: 'hunters everywhere — short loops only', G: 66, target: 23, rivals: [H(0.15, 0.15), H(0.85, 0.15), H(0.15, 0.85), B(0.85, 0.85)], events: 35, board: 0, par: 140 },
  {
    name: 'Spiral Studio',
    G: 68,
    target: 25,
    rivals: [B(0.12, 0.12), H(0.88, 0.88), T(0.88, 0.12), B(0.12, 0.88)],
    walls: [rect(10, 10, 40, 2), rect(48, 10, 2, 40), rect(18, 48, 32, 2), rect(18, 18, 2, 30), rect(18, 18, 22, 2)],
    start: [0.5, 0.5],
    events: 35,
    board: 1,
    par: 150,
  },
  {
    name: 'Pillar Forest',
    G: 70,
    target: 21,
    rivals: [B(0.15, 0.15), B(0.85, 0.15), B(0.15, 0.85), T(0.85, 0.85)],
    walls: [10, 25, 40, 55].flatMap((x) => [10, 25, 40, 55].map((y) => rect(x + 2, y + 2, 3, 3))),
    events: 35,
    board: 2,
    par: 150,
  },
  { name: 'Calm Canvas', hint: 'breather: gentle rivals', G: 64, target: 21, rivals: [T(0.15, 0.15), T(0.85, 0.85), B(0.85, 0.15)], board: 3, par: 120 },
  {
    name: 'Twin Crowns',
    hint: 'boss: the King and the Queen rule together',
    G: 72,
    target: 23,
    rivals: [K(0.22, 0.22), K(0.78, 0.78, 'Queen Blot'), B(0.78, 0.22)],
    walls: [disc(36, 36, 5)],
    start: [0.25, 0.75],
    events: 30,
    board: 4,
    par: 170,
  },
  // ── 21–25: big canvases ─────────────────────────
  { name: 'Big Canvas', G: 76, target: 21, rivals: [B(0.15, 0.15), B(0.85, 0.15), B(0.15, 0.85), H(0.85, 0.85)], events: 35, board: 0, par: 160 },
  {
    name: 'Corridors',
    hint: 'long halls — rivals come straight at you',
    G: 76,
    target: 25,
    rivals: [H(0.1, 0.1), B(0.9, 0.4), H(0.1, 0.65), B(0.9, 0.9)],
    walls: [...gappedLine(0, 18, 76, true, [60]), ...gappedLine(0, 38, 76, true, [8]), ...gappedLine(0, 57, 76, true, [60])],
    start: [0.5, 0.36],
    events: 35,
    board: 1,
    par: 170,
  },
  { name: 'Hunter Pack', hint: 'a hunter pack on the prowl', G: 78, target: 21, rivals: [B(0.12, 0.12), H(0.88, 0.12), B(0.12, 0.88), B(0.88, 0.88)], events: 30, board: 2, par: 170 },
  { name: 'Sunday Sketch', hint: 'breather: wide and quiet', G: 72, target: 21, rivals: [T(0.15, 0.15), T(0.85, 0.15), B(0.5, 0.88)], board: 3, par: 140 },
  {
    name: "King's Fortress",
    hint: 'boss: break into the fortress and topple the King',
    G: 80,
    target: 27,
    rivals: [K(0.5, 0.5), H(0.15, 0.15), H(0.85, 0.85), B(0.85, 0.15)],
    walls: [...gappedLine(26, 26, 30, true, [12]), ...gappedLine(26, 54, 30, true, [12]), ...gappedLine(26, 26, 30, false, [12]), ...gappedLine(54, 26, 30, false, [12])],
    start: [0.15, 0.8],
    events: 30,
    board: 4,
    par: 190,
  },
  // ── 26–30: master galleries ─────────────────────
  { name: 'Gallery Wing', G: 82, target: 23, rivals: [B(0.12, 0.12), B(0.88, 0.12), B(0.12, 0.88), H(0.88, 0.88)], events: 30, board: 0, par: 190 },
  {
    name: 'Checkerboard',
    G: 84,
    target: 23,
    rivals: [B(0.12, 0.12), B(0.88, 0.12), B(0.12, 0.88), H(0.88, 0.88)],
    walls: [12, 30, 48, 66].flatMap((x, i) => [12, 30, 48, 66].filter((_, j) => (i + j) % 2 === 0).map((y) => rect(x, y, 6, 6))),
    start: [0.5, 0.42],
    events: 30,
    board: 1,
    par: 190,
  },
  { name: 'Storm Studio', hint: 'events every few seconds — chaos!', G: 84, target: 23, rivals: [B(0.15, 0.15), B(0.85, 0.15), B(0.15, 0.85), H(0.85, 0.85)], events: 10, board: 2, par: 190 },
  { name: 'Last Light', hint: 'breather before the masterpiece', G: 78, target: 23, rivals: [T(0.15, 0.15), T(0.85, 0.85), B(0.85, 0.15), B(0.15, 0.85)], board: 3, par: 160 },
  {
    name: 'Grand Masterpiece',
    hint: 'final boss: two crowns and their hunters',
    G: 90,
    target: 25,
    rivals: [K(0.2, 0.2), K(0.8, 0.8, 'Queen Blot'), B(0.8, 0.2), H(0.2, 0.8)],
    walls: [disc(45, 45, 6), rect(43, 10, 4, 14), rect(43, 66, 4, 14)],
    start: [0.3, 0.55],
    events: 30,
    board: 4,
    par: 230,
  },
]

export const AUTHORED = LEVELS.length

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

const NAMES = ['Open Studio', 'Mural Hall', 'Ink Yard', 'Color Field', 'Splash Court', 'Easel Row']

/** Endless arenas past the authored set: seeded pillars, more rivals, kings every 5th. */
function generated(n: number): PaintLevel {
  const r = seeded(n * 4111 + 3)
  const k = n - AUTHORED
  const G = 80 + (k % 3) * 6
  const walls: Wall[] = []
  const nw = 3 + (k % 4)
  for (let i = 0; i < nw; i++) {
    const x = Math.floor(8 + r() * (G - 20))
    const y = Math.floor(8 + r() * (G - 20))
    if (Math.abs(x - G / 2) < 8 && Math.abs(y - G / 2) < 8) continue
    walls.push(r() < 0.5 ? rect(x, y, 3 + Math.floor(r() * 8), 3) : disc(x, y, 2 + Math.floor(r() * 3)))
  }
  const corners: [number, number][] = [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85], [0.5, 0.12], [0.5, 0.88]]
  const rivals: RivalDef[] = corners.slice(0, Math.min(6, 4 + Math.floor(k / 4))).map(([x, y], i) => ({ pers: i % 2 ? 'hunter' : 'builder', x, y }))
  if (n % 5 === 0) rivals[0] = K(0.2, 0.2)
  return { name: NAMES[n % NAMES.length], G, target: Math.min(34, 28 + Math.floor(k / 3)), rivals, walls, events: 30, board: n % 5, par: 200 }
}

export function levelSpec(n: number): PaintLevelSpec {
  const authored = n <= AUTHORED
  const l = authored ? LEVELS[n - 1] : generated(n)
  return { ...l, n, boss: n % 5 === 0, authored }
}

/** Rasterise walls into a G×G mask (1 = stone). The player's start area is always kept clear. */
export function wallMask(l: PaintLevel): Uint8Array {
  const G = l.G
  const m = new Uint8Array(G * G)
  for (const w of l.walls ?? []) {
    if (w.k === 'rect') {
      for (let y = w.y; y < w.y + w.h; y++) for (let x = w.x; x < w.x + w.w; x++) if (x >= 0 && y >= 0 && x < G && y < G) m[y * G + x] = 1
    } else {
      for (let y = Math.floor(w.y - w.r); y <= w.y + w.r; y++)
        for (let x = Math.floor(w.x - w.r); x <= w.x + w.r; x++) if (x >= 0 && y >= 0 && x < G && y < G && (x - w.x) ** 2 + (y - w.y) ** 2 <= w.r * w.r) m[y * G + x] = 1
    }
  }
  const [sx, sy] = l.start ?? [0.5, 0.5]
  const cx = Math.floor(G * sx)
  const cy = Math.floor(G * sy)
  for (let y = cy - 7; y <= cy + 7; y++) for (let x = cx - 7; x <= cx + 7; x++) if (x >= 0 && y >= 0 && x < G && y < G) m[y * G + x] = 0
  return m
}
