/** Pinball Wizard table layout in table units (400 x 720, y down). */

export const TW = 400
export const TH = 720
export const BALL_R = 9

export type Seg = { ax: number; ay: number; bx: number; by: number; r: number }

function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
  }
  return out
}

function poly(pts: Array<[number, number]>, r = 2): Seg[] {
  const out: Seg[] = []
  for (let i = 1; i < pts.length; i++) out.push({ ax: pts[i - 1][0], ay: pts[i - 1][1], bx: pts[i][0], by: pts[i][1], r })
  return out
}

export const TOP_ARC = arc(200, 140, 188, 122, Math.PI, Math.PI * 2, 28)

export const OUTER: Array<[number, number]> = [[104, 618], [12, 540], [12, 140], ...TOP_ARC, [388, 700], [352, 700], [352, 236]]
export const RIGHT_GUIDE: Array<[number, number]> = [[352, 540], [260, 618]]
export const ORBIT_WALL: Array<[number, number]> = [[50, 452], [50, 215], [55, 182], [68, 152]]

export const WALLS: Seg[] = [
  ...poly(OUTER),
  ...poly(RIGHT_GUIDE),
  ...poly(ORBIT_WALL, 3),
  // top lane separators
  { ax: 151, ay: 58, bx: 151, by: 94, r: 4 },
  { ax: 213, ay: 58, bx: 213, by: 94, r: 4 },
]

export type Bumper = { x: number; y: number; r: number }
export const BUMPERS: Bumper[] = [
  { x: 135, y: 172, r: 20 },
  { x: 229, y: 172, r: 20 },
  { x: 182, y: 242, r: 20 },
]

export type Sling = { a: [number, number]; b: [number, number]; c: [number, number]; nx: number; ny: number }
function sling(a: [number, number], b: [number, number], c: [number, number], left: boolean): Sling {
  const dx = a[0] - c[0]
  const dy = a[1] - c[1]
  const l = Math.hypot(dx, dy)
  const nx = left ? -dy / l : dy / l
  const ny = left ? dx / l : -dx / l
  return { a, b, c, nx, ny }
}
export const SLINGS: Sling[] = [sling([54, 462], [54, 528], [98, 562], true), sling([310, 462], [310, 528], [266, 562], false)]

export type FlipperDef = { px: number; py: number; len: number; rest: number; up: number }
export const FLIPPERS: FlipperDef[] = [
  { px: 110, py: 630, len: 59, rest: 0.5, up: -0.45 },
  { px: 254, py: 630, len: 59, rest: Math.PI - 0.5, up: Math.PI + 0.45 },
]
export const FLIP_R0 = 9
export const FLIP_R1 = 5

export const TARGETS = [
  { x: 345, y: 300 },
  { x: 345, y: 334 },
  { x: 345, y: 368 },
]
export const TARGET_HALF = 13

export const LANES = [
  { x0: 92, x1: 151 },
  { x0: 151, x1: 213 },
  { x0: 213, x1: 272 },
]
export const LANE_Y = 80

export const SAUCER = { x: 182, y: 392, r: 13 }
export const GATE: Seg = { ax: 388, ay: 188, bx: 352, by: 216, r: 2 }
export const PLUNGER_X = 370
export const PLUNGER_Y = 690
export const SPINNER = { x0: 12, x1: 50, y: 330 }
export const LOOP_SENSOR_Y = 430

export type Neon = { wall: string; glow: string; accent: string; bg0: string; bg1: string }
export const NEONS: Neon[] = [
  { wall: '#a78bfa', glow: '#7c3aed', accent: '#f472b6', bg0: '#0b0420', bg1: '#1e0b3d' },
  { wall: '#22d3ee', glow: '#0891b2', accent: '#facc15', bg0: '#03121a', bg1: '#0c2a3a' },
  { wall: '#f472b6', glow: '#be185d', accent: '#4ade80', bg0: '#1a0414', bg1: '#3b0a2a' },
  { wall: '#fb923c', glow: '#c2410c', accent: '#38bdf8', bg0: '#1a0a02', bg1: '#3b1a06' },
]

function neonPath(g: CanvasRenderingContext2D, pts: Array<[number, number]>, color: string, glowColor: string, w: number) {
  g.lineJoin = 'round'
  g.lineCap = 'round'
  for (const [lw, a, c] of [[w * 4, 0.18, glowColor], [w * 2, 0.35, glowColor], [w, 1, color]] as const) {
    g.globalAlpha = a
    g.strokeStyle = c
    g.lineWidth = lw
    g.beginPath()
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.stroke()
  }
  g.globalAlpha = 1
}

/** Static table art in table units (caller scales). */
export function paintTable(g: CanvasRenderingContext2D, n: Neon) {
  // playfield
  const bg = g.createLinearGradient(0, 0, 0, TH)
  bg.addColorStop(0, n.bg1)
  bg.addColorStop(1, n.bg0)
  g.fillStyle = bg
  g.beginPath()
  g.moveTo(12, 720)
  OUTER.slice(1, OUTER.length - 3).forEach(([x, y]) => g.lineTo(x, y))
  g.lineTo(388, 720)
  g.closePath()
  g.fill()
  // grid
  g.strokeStyle = 'rgba(255,255,255,0.04)'
  g.lineWidth = 1
  g.beginPath()
  for (let x = 20; x < 400; x += 24) {
    g.moveTo(x, 0)
    g.lineTo(x, 720)
  }
  for (let y = 20; y < 720; y += 24) {
    g.moveTo(0, y)
    g.lineTo(400, y)
  }
  g.stroke()
  // emblem: wizard hat + stars in the centre
  g.save()
  g.translate(182, 500)
  g.globalAlpha = 0.22
  g.fillStyle = n.wall
  g.beginPath()
  g.moveTo(-46, 22)
  g.lineTo(46, 22)
  g.lineTo(14, 8)
  g.lineTo(-8, -58)
  g.lineTo(-16, 8)
  g.closePath()
  g.fill()
  g.fillStyle = n.accent
  for (const [x, y, r] of [[-30, -40, 6], [32, -30, 4], [0, -20, 3], [40, 4, 3]] as const) {
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const rr = i % 2 ? r * 0.45 : r
      if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
      else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    }
    g.closePath()
    g.fill()
  }
  g.globalAlpha = 1
  g.restore()
  // arrow inserts toward loop and targets
  g.fillStyle = n.accent
  g.globalAlpha = 0.25
  for (const [x, y, a] of [[82, 430, -2.1], [300, 330, 0], [182, 340, -Math.PI / 2]] as const) {
    g.save()
    g.translate(x, y)
    g.rotate(a)
    g.beginPath()
    g.moveTo(14, 0)
    g.lineTo(-8, -9)
    g.lineTo(-4, 0)
    g.lineTo(-8, 9)
    g.closePath()
    g.fill()
    g.restore()
  }
  g.globalAlpha = 1
  // plunger lane floor
  g.fillStyle = 'rgba(0,0,0,0.35)'
  g.fillRect(352, 236, 36, 464)
  // walls
  neonPath(g, OUTER, n.wall, n.glow, 3)
  neonPath(g, RIGHT_GUIDE, n.wall, n.glow, 3)
  neonPath(g, ORBIT_WALL, n.wall, n.glow, 4)
  neonPath(g, [[151, 58], [151, 94]], n.accent, n.glow, 6)
  neonPath(g, [[213, 58], [213, 94]], n.accent, n.glow, 6)
  neonPath(g, [[GATE.ax, GATE.ay], [GATE.bx, GATE.by]], '#e2e8f0', n.glow, 2)
  // saucer ring
  g.strokeStyle = n.accent
  g.lineWidth = 2
  g.beginPath()
  g.arc(SAUCER.x, SAUCER.y, SAUCER.r + 4, 0, Math.PI * 2)
  g.stroke()
  g.fillStyle = '#000'
  g.beginPath()
  g.arc(SAUCER.x, SAUCER.y, SAUCER.r, 0, Math.PI * 2)
  g.fill()
  // drain apron
  g.fillStyle = 'rgba(0,0,0,0.45)'
  g.beginPath()
  g.moveTo(12, 720)
  g.lineTo(12, 540)
  g.lineTo(104, 618)
  g.lineTo(104, 720)
  g.closePath()
  g.moveTo(352, 720)
  g.lineTo(352, 540)
  g.lineTo(260, 618)
  g.lineTo(260, 720)
  g.closePath()
  g.fill()
}
