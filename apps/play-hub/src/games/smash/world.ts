/** Glass Smash world: corridor obstacles generated room by room. Units are metres, camera looks down +z. */

export const HALF_W = 3
export const HALF_H = 2
export const ROOM_LEN = 150

export type Pane = {
  kind: 'glass' | 'bar' | 'gate'
  z: number
  x: number
  y: number
  hw: number
  hh: number
  rot: number
  rotV: number
  slideA: number
  slideF: number
  slidePh: number
  hp: number
  maxHp: number
  cracks: Array<{ x: number; y: number; seed: number }>
  broken: boolean
  room: number
}

export type Crystal = { x: number; y: number; z: number; r: number; taken: boolean; big: boolean; ph: number }

export type Palette = { fog: string; near: string; floor: string; ceil: string; line: string; glass: string; accent: string; dark: boolean }

export const PALETTES: Palette[] = [
  { fog: '#e0f7ff', near: '#7dd3fc', floor: '#bae6fd', ceil: '#e0f2fe', line: '#0284c7', glass: '#bae6fd', accent: '#0ea5e9', dark: false },
  { fog: '#fff1e6', near: '#fdba74', floor: '#fed7aa', ceil: '#ffedd5', line: '#c2410c', glass: '#fde68a', accent: '#f97316', dark: false },
  { fog: '#f0fdf4', near: '#86efac', floor: '#bbf7d0', ceil: '#dcfce7', line: '#15803d', glass: '#a7f3d0', accent: '#22c55e', dark: false },
  { fog: '#f5f3ff', near: '#c4b5fd', floor: '#ddd6fe', ceil: '#ede9fe', line: '#6d28d9', glass: '#e9d5ff', accent: '#8b5cf6', dark: false },
  { fog: '#0f172a', near: '#1e293b', floor: '#334155', ceil: '#1e293b', line: '#38bdf8', glass: '#7dd3fc', accent: '#22d3ee', dark: true },
  { fog: '#fdf2f8', near: '#f9a8d4', floor: '#fbcfe8', ceil: '#fce7f3', line: '#be185d', glass: '#fbcfe8', accent: '#ec4899', dark: false },
]

function rand(a: number, b: number) {
  return a + Math.random() * (b - a)
}

function pane(z: number, room: number, o: Partial<Pane>): Pane {
  return {
    kind: 'glass',
    z,
    x: 0,
    y: 0,
    hw: 1,
    hh: 1,
    rot: 0,
    rotV: 0,
    slideA: 0,
    slideF: 0,
    slidePh: 0,
    hp: 1,
    maxHp: 1,
    cracks: [],
    broken: false,
    room,
    ...o,
  }
}

type Out = { panes: Pane[]; crystals: Crystal[] }

function crystal(out: Out, x: number, y: number, z: number, big = false) {
  out.crystals.push({ x, y, z, r: big ? 0.32 : 0.22, taken: false, big, ph: Math.random() * 6 })
}

const PATTERNS: Array<{ min: number; w: number; make: (o: Out, z: number, room: number) => void }> = [
  {
    // single pane dead centre
    min: 1,
    w: 3,
    make: (o, z, room) => {
      o.panes.push(pane(z, room, { hw: rand(0.9, 1.4), hh: rand(0.8, 1.2), y: rand(-0.3, 0.3) }))
      if (Math.random() < 0.6) crystal(o, rand(-2, 2), rand(0.6, 1.4), z + 3)
    },
  },
  {
    // two side panes, open middle: free targets + a crystal
    min: 1,
    w: 2,
    make: (o, z, room) => {
      o.panes.push(pane(z, room, { x: -1.9, hw: 1, hh: 1.6 }))
      o.panes.push(pane(z + 1.5, room, { x: 1.9, hw: 1, hh: 1.6 }))
      crystal(o, 0, rand(-0.8, 0.8), z + 6, Math.random() < 0.3)
    },
  },
  {
    // full glass wall
    min: 1,
    w: 2,
    make: (o, z, room) => {
      o.panes.push(pane(z, room, { hw: HALF_W, hh: HALF_H }))
    },
  },
  {
    // pillars with a crystal between
    min: 1,
    w: 2,
    make: (o, z, room) => {
      o.panes.push(pane(z, room, { kind: 'bar', x: -2.4, hw: 0.4, hh: HALF_H }))
      o.panes.push(pane(z, room, { kind: 'bar', x: 2.4, hw: 0.4, hh: HALF_H }))
      crystal(o, rand(-1, 1), rand(-1, 1), z + 0.5, Math.random() < 0.4)
    },
  },
  {
    // metal frame with a window of glass
    min: 2,
    w: 3,
    make: (o, z, room) => {
      o.panes.push(pane(z, room, { kind: 'bar', y: 1.55, hw: HALF_W, hh: 0.45 }))
      o.panes.push(pane(z, room, { kind: 'bar', y: -1.55, hw: HALF_W, hh: 0.45 }))
      o.panes.push(pane(z, room, { kind: 'bar', x: -2.3, hw: 0.7, hh: 1.1 }))
      o.panes.push(pane(z, room, { kind: 'bar', x: 2.3, hw: 0.7, hh: 1.1 }))
      o.panes.push(pane(z + 0.05, room, { hw: 1.6, hh: 1.1 }))
    },
  },
  {
    // thick tinted glass, takes two hits
    min: 2,
    w: 2,
    make: (o, z, room) => {
      const hp = room >= 6 ? 3 : 2
      o.panes.push(pane(z, room, { hw: rand(1.2, 1.8), hh: rand(1, 1.5), hp, maxHp: hp }))
      if (Math.random() < 0.5) crystal(o, rand(-2.2, 2.2), -1.4, z - 3)
    },
  },
  {
    // sliding door
    min: 3,
    w: 2,
    make: (o, z, room) => {
      o.panes.push(pane(z, room, { hw: 1.2, hh: HALF_H, slideA: 1.8, slideF: rand(0.9, 1.6), slidePh: rand(0, 6) }))
      crystal(o, rand(-2, 2), 1.4, z + 4)
    },
  },
  {
    // grid of small panes in a frame
    min: 3,
    w: 2,
    make: (o, z, room) => {
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) o.panes.push(pane(z + (i + j) * 0.02, room, { x: i * 1.95, y: j * 1.32, hw: 0.92, hh: 0.62 }))
    },
  },
  {
    // spinning glass cross
    min: 4,
    w: 2,
    make: (o, z, room) => {
      const v = rand(0.8, 1.5) * (Math.random() < 0.5 ? -1 : 1)
      o.panes.push(pane(z, room, { hw: 2.6, hh: 0.28, rotV: v }))
      o.panes.push(pane(z + 0.05, room, { hw: 2.6, hh: 0.28, rot: Math.PI / 2, rotV: v }))
    },
  },
  {
    // spinning metal bar off-centre + centre glass
    min: 5,
    w: 2,
    make: (o, z, room) => {
      o.panes.push(pane(z - 1.5, room, { kind: 'bar', x: 0, y: 1.6, hw: 1.2, hh: 0.16, rotV: 1.4 }))
      o.panes.push(pane(z, room, { hw: 1.1, hh: 1.1, slideA: 0.8, slideF: 1.1 }))
    },
  },
]

export function genRoom(room: number, startZ: number): Out {
  const out: Out = { panes: [], crystals: [] }
  const pool = PATTERNS.filter((p) => p.min <= room)
  const total = pool.reduce((s, p) => s + p.w, 0)
  let z = startZ + 16
  const gap = Math.max(7.5, 12 - room * 0.45)
  while (z < startZ + ROOM_LEN - 10) {
    let r = Math.random() * total
    const p = pool.find((q) => (r -= q.w) < 0) ?? pool[0]
    p.make(out, z, room)
    if (room <= 2 && Math.random() < 0.5) crystal(out, rand(-2.2, 2.2), rand(-1.4, 1.4), z + gap / 2)
    z += gap * rand(0.85, 1.15)
  }
  const hp = Math.min(5, 2 + Math.floor(room / 2))
  out.panes.push(pane(startZ + ROOM_LEN, room, { kind: 'gate', hw: HALF_W, hh: HALF_H, hp, maxHp: hp }))
  return out
}

export function paneState(p: Pane, t: number) {
  return { x: p.x + (p.slideA ? Math.sin(t * p.slideF + p.slidePh) * p.slideA : 0), a: p.rot + p.rotV * t }
}

/** Is world point (X, Y) inside the pane at time t (with margin m)? */
export function paneContains(p: Pane, t: number, X: number, Y: number, m: number) {
  const { x, a } = paneState(p, t)
  const dx = X - x
  const dy = Y - p.y
  const c = Math.cos(-a)
  const s = Math.sin(-a)
  const lx = dx * c - dy * s
  const ly = dx * s + dy * c
  return Math.abs(lx) < p.hw + m && Math.abs(ly) < p.hh + m ? { lx, ly } : null
}
