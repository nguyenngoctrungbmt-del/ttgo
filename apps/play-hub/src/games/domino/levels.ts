/**
 * Domino Run hand-made levels. Each level ships with a known-good trail (`sol`: finger
 * strokes in board space) that scratch script `lv3-dm-verify` replays through the same
 * placement rules and chain simulation as the game — every level is proven clearable,
 * and gems + par are proven reachable together.
 */

export type P = { x: number; y: number }
export type Rect = { x: number; y: number; w: number; h: number }
export type Pool = { x: number; y: number; r: number }
export type Gate = { x1: number; y1: number; x2: number; y2: number; period: number; phase: number }
export type Button = { x: number; y: number; chain: (P & { a: number })[]; pressed: boolean }
export type Level = {
  start: P & { a: number }
  bells: P[]
  walls: Rect[]
  pools: Pool[]
  gates: Gate[]
  gems: P[]
  buttons: Button[]
  count: number
  par: number
  hint?: string
  name?: string
}
/** A finger stroke: the first point is where the finger goes down. */
export type Stroke = [number, number][]
export type Authored = Level & { sol: Stroke[] }

const SP = 18
const UP = -Math.PI / 2

const H = (x: number, y: number, w: number): Rect => ({ x, y, w, h: 14 })
const V = (x: number, y: number, h: number): Rect => ({ x, y, w: 14, h })

/** A pre-placed hidden chain laid along a polyline (spacing SP). */
function chainAlong(pts: [number, number][]): (P & { a: number })[] {
  const out: (P & { a: number })[] = []
  let carry = 0
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]
    const [bx, by] = pts[i + 1]
    const len = Math.hypot(bx - ax, by - ay)
    const a = Math.atan2(by - ay, bx - ax)
    let d = carry
    while (d <= len) {
      out.push({ x: ax + Math.cos(a) * d, y: ay + Math.sin(a) * d, a })
      d += SP
    }
    carry = d - len
  }
  return out
}

/** A walled pen around a bell; a button outside fires a hidden chain inside (opening at the bottom). */
function pen(bx: number, by: number, btn: P): { walls: Rect[]; bell: P; button: Button } {
  const walls: Rect[] = [H(bx - 70, by - 40, 140), V(bx - 70, by - 40, 132), V(bx + 56, by - 40, 132), H(bx - 70, by + 80, 140)]
  const chain = chainAlong([
    [bx, by + 66],
    [bx, by + 14],
  ])
  return { walls, bell: { x: bx, y: by - 8 }, button: { x: btn.x, y: btn.y, chain, pressed: false } }
}

type Opt = Partial<Omit<Authored, 'start' | 'bells' | 'sol' | 'count' | 'par'>>

function lv(start: [number, number, number?], bells: [number, number][], count: number, par: number, sol: Stroke[], o: Opt = {}): Authored {
  return {
    start: { x: start[0], y: start[1], a: start[2] ?? UP },
    bells: bells.map(([x, y]) => ({ x, y })),
    walls: o.walls ?? [],
    pools: o.pools ?? [],
    gates: o.gates ?? [],
    gems: o.gems ?? [],
    buttons: o.buttons ?? [],
    count,
    par,
    hint: o.hint,
    name: o.name,
    sol,
  }
}

function withPen(bx: number, by: number, btn: P, base: Authored): Authored {
  const p = pen(bx, by, btn)
  base.walls.push(...p.walls)
  base.bells.push(p.bell)
  base.buttons.push(p.button)
  return base
}

const gate = (x1: number, x2: number, y: number, period: number, phase = 0): Gate => ({ x1, y1: y + 7, x2, y2: y + 7, period, phase })
/** A full-width barrier at y with a gate from x1 to x2. */
const barrier = (x1: number, x2: number, y: number): Rect[] => [H(0, y, x1), H(x2, y, 360 - x2)]

export const LEVELS: Authored[] = [
  // ── 1–5: basics ──
  lv([180, 480], [[180, 130]], 31, 24, [[[180, 470], [180, 140]]], { gems: [{ x: 180, y: 300 }], hint: 'drag up from the pad, then GO', name: 'First Push' }),
  lv([70, 480], [[290, 110]], 44, 35, [[[70, 470], [70, 420], [150, 370], [290, 340], [300, 250], [290, 140]]], {
    walls: [H(30, 290, 220)],
    gems: [{ x: 300, y: 300 }],
    hint: 'curve around the wall',
    name: 'Detour',
  }),
  lv([180, 480], [[80, 130], [280, 130]], 48, 38, [[[180, 470], [180, 300]], [[180, 306], [120, 230], [80, 150]], [[180, 306], [240, 230], [280, 150]]], {
    gems: [{ x: 180, y: 360 }],
    hint: 'start a line from any domino to split',
    name: 'Fork',
  }),
  lv([180, 480], [[180, 100]], 67, 53, [[[180, 470], [180, 410]], [[180, 412], [100, 360], [80, 290], [110, 200], [170, 120]], [[180, 412], [260, 360], [280, 290], [250, 200], [195, 125]]], {
    pools: [{ x: 180, y: 290, r: 70 }],
    gems: [{ x: 80, y: 290 }, { x: 280, y: 290 }],
    hint: 'dominoes sink in water — both gems need two paths',
    name: 'Lagoon',
  }),
  lv([180, 480], [[80, 110], [280, 110]], 45, 36, [[[180, 470], [180, 220]], [[180, 222], [120, 170], [85, 125]], [[180, 222], [240, 170], [275, 125]]], {
    walls: barrier(150, 210, 300),
    gates: [gate(150, 210, 300, 2.6)],
    gems: [{ x: 180, y: 250 }],
    hint: 'press GO so the chain meets an open gate',
    name: 'The Gate',
  }),
  // ── 6–10: buttons, mazes ──
  withPen(180, 120, { x: 300, y: 330 }, lv([80, 480], [], 26, 21, [[[80, 470], [80, 440], [200, 390], [290, 340]]], { gems: [{ x: 160, y: 410 }], hint: 'hit the button to fire the hidden chain', name: 'Doorbell' })),
  lv([60, 480], [[180, 70]], 99, 78, [[[60, 470], [60, 445], [180, 440], [310, 430], [315, 340], [200, 330], [50, 320], [50, 220], [200, 210], [310, 200], [310, 110], [200, 75]]], {
    walls: [H(0, 380, 260), H(100, 265, 260), H(0, 150, 260)],
    gems: [{ x: 50, y: 270 }, { x: 310, y: 160 }],
    name: 'Switchback',
  }),
  lv([180, 480], [[180, 100]], 33, 26, [[[180, 470], [180, 110]]], {
    pools: [{ x: 110, y: 290, r: 52 }, { x: 250, y: 290, r: 52 }],
    gems: [{ x: 180, y: 380 }],
    hint: 'thread the channel',
    name: 'Narrows',
  }),
  lv([180, 480], [[180, 365]], 45, 36, [[[180, 470], [150, 452], [60, 452], [50, 330], [80, 260], [150, 240], [180, 270], [180, 350]]], {
    walls: [V(110, 320, 110), V(236, 320, 110), H(110, 416, 140)],
    gems: [{ x: 60, y: 330 }],
    hint: 'some bells need to be hit from above',
    name: 'Cup',
  }),
  withPen(100, 130, { x: 290, y: 330 }, lv([180, 480], [[290, 100]], 44, 35, [[[180, 470], [180, 400]], [[180, 408], [240, 370], [285, 345]], [[180, 408], [180, 330], [230, 200], [270, 130], [286, 113]]], {
    gems: [{ x: 225, y: 250 }],
    hint: 'two bells, one behind walls',
    name: 'Bell Tower',
  })),
  // ── 11–15: timing ──
  lv([180, 480], [[180, 100]], 42, 33, [[[180, 470], [180, 410], [120, 360], [120, 300], [240, 250], [240, 190], [190, 120]]], {
    walls: [...barrier(90, 150, 330), ...barrier(210, 270, 210)],
    gates: [gate(90, 150, 330, 2.4, 0), gate(210, 270, 210, 3.0, 1.1)],
    gems: [{ x: 180, y: 270 }],
    hint: 'two gates, two rhythms',
    name: 'Double Time',
  }),
  lv([60, 480], [[60, 90], [300, 90]], 54, 43, [[[60, 470], [60, 420], [180, 360], [180, 140]], [[180, 146], [120, 110], [75, 95]], [[180, 146], [240, 110], [285, 95]]], {
    walls: [...barrier(150, 210, 280), H(0, 150, 130), H(230, 150, 130)],
    gates: [gate(150, 210, 280, 2.2, 0.4)],
    gems: [{ x: 120, y: 400 }],
    name: 'Crossroads',
  }),
  lv([180, 480], [[180, 80]], 52, 41, [[[180, 470], [180, 440], [90, 400], [90, 330], [270, 270], [270, 200], [180, 160], [180, 90]]], {
    pools: [{ x: 230, y: 390, r: 40 }, { x: 130, y: 250, r: 40 }, { x: 260, y: 130, r: 34 }],
    gems: [{ x: 290, y: 240 }, { x: 90, y: 370 }],
    name: 'Stepping Stones',
  }),
  withPen(260, 140, { x: 80, y: 260 }, lv([180, 480], [], 25, 20, [[[180, 470], [180, 340], [80, 300], [80, 275]]], {
    walls: [...barrier(150, 210, 380)],
    gates: [gate(150, 210, 380, 2.0, 0.7)],
    gems: [{ x: 130, y: 320 }],
    hint: 'gate, then button',
    name: 'Night Bell',
  })),
  lv([180, 480], [[60, 80], [180, 80], [300, 80]], 67, 53, [[[180, 470], [180, 260]], [[180, 262], [110, 200], [65, 100]], [[180, 262], [250, 200], [295, 100]], [[180, 262], [180, 95]]], {
    walls: [...barrier(150, 210, 340), V(110, 120, 60), V(236, 120, 60)],
    gates: [gate(150, 210, 340, 2.8, 0.3)],
    gems: [{ x: 120, y: 205 }, { x: 240, y: 205 }],
    hint: 'three bells — split three ways',
    name: 'Carillon',
  }),
  // ── 16–20: gems & water ──
  lv([60, 480], [[300, 80]], 44, 35, [[[60, 470], [60, 380], [150, 330], [200, 250], [300, 200], [300, 90]]], {
    pools: [{ x: 230, y: 390, r: 60 }, { x: 90, y: 200, r: 50 }],
    gems: [{ x: 60, y: 400 }, { x: 250, y: 230 }],
    name: 'Marsh',
  }),
  lv([180, 480], [[180, 90]], 60, 47, [[[180, 470], [180, 400]], [[180, 400], [100, 380], [40, 300]], [[180, 400], [260, 380], [320, 300], [300, 220], [200, 160], [185, 105]]], {
    walls: [H(60, 250, 240)],
    gems: [{ x: 40, y: 280 }, { x: 320, y: 280 }],
    hint: 'gems on both sides',
    name: 'Wings',
  }),
  lv([300, 480], [[60, 90]], 48, 38, [[[300, 470], [300, 380], [200, 340], [100, 340], [60, 260], [100, 190], [60, 100]]], {
    pools: [{ x: 160, y: 440, r: 46 }, { x: 200, y: 230, r: 56 }],
    walls: [V(0, 150, 14)],
    gems: [{ x: 150, y: 345 }, { x: 95, y: 190 }],
    name: 'Riverbend',
  }),
  lv([180, 480], [[180, 250]], 51, 40, [[[180, 470], [180, 450], [300, 420], [320, 280], [300, 160], [220, 140], [180, 200], [180, 240]]], {
    walls: [V(110, 200, 200), V(236, 200, 200), H(110, 386, 140)],
    gems: [{ x: 320, y: 300 }, { x: 260, y: 140 }],
    hint: 'over the top',
    name: 'Well',
  }),
  withPen(260, 120, { x: 60, y: 300 }, lv([180, 480], [[60, 100]], 45, 36, [[[180, 470], [180, 380]], [[180, 390], [150, 388], [100, 340], [70, 315]], [[180, 390], [180, 300], [140, 200], [80, 130]]], {
    pools: [{ x: 290, y: 360, r: 50 }],
    gems: [{ x: 160, y: 250 }, { x: 120, y: 345 }],
    hint: 'button, bell and gems',
    name: 'Belfry',
  })),
  // ── 21–25: tight boxes ──
  lv([60, 480], [[300, 100]], 30, 25, [[[60, 470], [160, 330], [300, 110]]], {
    gems: [{ x: 180, y: 300 }],
    hint: 'only a few dominoes — go straight',
    name: 'Shortcut',
  }),
  lv([180, 480], [[60, 120], [300, 120]], 39, 33, [[[180, 470], [180, 300]], [[180, 302], [100, 220], [65, 140]], [[180, 302], [260, 220], [295, 140]]], {
    walls: [H(140, 200, 80)],
    gems: [{ x: 180, y: 330 }],
    name: 'Tight Fork',
  }),
  lv([60, 480], [[300, 90]], 34, 28, [[[60, 470], [60, 400], [180, 330], [180, 200], [300, 100]]], {
    walls: [...barrier(150, 210, 260)],
    gates: [gate(150, 210, 260, 2.4, 0.5)],
    gems: [{ x: 120, y: 360 }],
    name: 'Rush Hour',
  }),
  withPen(180, 120, { x: 180, y: 360 }, lv([180, 480], [], 8, 6, [[[180, 470], [180, 375]]], {
    gems: [{ x: 180, y: 420 }],
    hint: 'sometimes less is more',
    name: 'Snap',
  })),
  lv([180, 480], [[60, 90], [300, 90], [180, 200]], 53, 45, [[[180, 470], [180, 330]], [[180, 332], [80, 280], [60, 100]], [[180, 332], [280, 280], [300, 100]], [[180, 332], [180, 215]]], {
    walls: [H(0, 400, 120), H(240, 400, 120)],
    pools: [{ x: 180, y: 130, r: 34 }],
    gems: [{ x: 70, y: 200 }, { x: 290, y: 200 }],
    hint: 'three bells, tight budget',
    name: 'Trident',
  }),
  // ── 26–32: everything ──
  lv([180, 480], [[180, 90]], 44, 35, [[[180, 470], [180, 420], [80, 380], [80, 250], [180, 200], [180, 100]]], {
    walls: [H(130, 300, 230)],
    gems: [{ x: 80, y: 300 }],
    name: 'Breather',
  }),
  withPen(260, 140, { x: 100, y: 120 }, lv([60, 480], [], 38, 30, [[[60, 470], [60, 420], [160, 370], [160, 200], [110, 135]]], {
    walls: [...barrier(130, 190, 330)],
    gates: [gate(130, 190, 330, 2.2, 0.9)],
    pools: [{ x: 260, y: 400, r: 44 }],
    gems: [{ x: 160, y: 250 }],
    name: 'Sentry',
  })),
  lv([180, 480], [[60, 80], [300, 80]], 57, 45, [[[180, 470], [180, 380], [120, 320], [120, 240]], [[120, 242], [70, 180], [60, 95]], [[120, 242], [200, 200], [280, 150], [295, 95]]], {
    walls: [...barrier(90, 150, 290)],
    gates: [gate(90, 150, 290, 2.6, 1.3)],
    pools: [{ x: 270, y: 380, r: 50 }, { x: 180, y: 110, r: 30 }],
    gems: [{ x: 200, y: 200 }, { x: 60, y: 160 }],
    name: 'Twin Spires',
  }),
  lv([60, 480], [[300, 300]], 65, 52, [[[60, 470], [60, 120], [200, 80], [300, 150], [300, 280]]], {
    walls: [V(140, 140, 340), V(220, 200, 320)],
    gems: [{ x: 60, y: 200 }, { x: 300, y: 200 }],
    hint: 'the long way round',
    name: 'Hairpin',
  }),
  withPen(100, 120, { x: 300, y: 380 }, withPen(260, 120, { x: 60, y: 380 }, lv([180, 480], [], 25, 20, [[[180, 470], [180, 440]], [[180, 440], [100, 400], [70, 385]], [[180, 440], [260, 400], [290, 385]]], {
    gems: [{ x: 125, y: 410 }],
    hint: 'two buttons, two pens',
    name: 'Twin Pens',
  }))),
  lv([180, 480], [[180, 80]], 60, 47, [[[180, 470], [180, 430], [60, 400], [60, 300], [180, 260], [300, 220], [300, 140], [195, 95]]], {
    walls: [...barrier(30, 90, 340), ...barrier(270, 330, 190)],
    gates: [gate(30, 90, 340, 2.2, 0.2), gate(270, 330, 190, 2.6, 1.7)],
    gems: [{ x: 180, y: 265 }],
    name: 'Clockwork',
  }),
  withPen(180, 120, { x: 180, y: 300 }, lv([60, 480], [[60, 90], [300, 90]], 70, 55, [[[60, 470], [60, 400]], [[60, 400], [40, 250], [60, 105]], [[60, 400], [180, 340], [300, 280], [300, 105]], [[180, 340], [180, 318]]], {
    pools: [{ x: 300, y: 430, r: 40 }],
    gems: [{ x: 40, y: 250 }, { x: 310, y: 200 }],
    hint: 'the grand finale',
    name: 'Grand Chime',
  })),
]
