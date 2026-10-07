import type { Mat } from './physics'

export type Spec = { x: number; y: number; hw?: number; hh?: number; r?: number; mat: Mat; hp: number }

export type LevelPlan = {
  specs: Spec[]
  earth: Spec | null
  ammo: number[]
  par: number
  boss: boolean
  guards: number
}

export const HP = { wood: 60, stone: 150, glass: 22, tnt: 18, king: 80 }

export type AmmoDef = { name: string; r: number; density: number; tip: string }

export const AMMO: AmmoDef[] = [
  { name: 'Boulder', r: 12, density: 3, tip: '' },
  { name: 'Split Shot', r: 11, density: 3, tip: 'tap mid-air to split in three' },
  { name: 'Iron Ball', r: 16, density: 5.5, tip: 'tap mid-air to slam down' },
  { name: 'Bomb', r: 13, density: 2.4, tip: 'tap mid-air to detonate' },
]

/** Level at which each ammo type first appears. */
export const UNLOCK = [1, 2, 6, 4]

const ZONE_L = 186
const ZONE_R = 374

type Ctx = { n: number; specs: Spec[]; guardHp: number; mats: Mat[]; guards: number; base: number }

function pick<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)]
}

function guard(c: Ctx, x: number, y: number) {
  c.specs.push({ x, y: y - 11, r: 11, mat: 'guard', hp: c.guardHp })
  c.guards++
}

function block(c: Ctx, x: number, y: number, hw: number, hh: number, mat: Mat) {
  c.specs.push({ x, y, hw, hh, mat, hp: HP[mat as keyof typeof HP] ?? 60 })
}

/** Pillars + planks, guards inside some floors. Returns roof y and centre x. */
function tower(c: Ctx, lx: number, wide: boolean): [number, number] {
  const half = wide ? 42 : 30
  const cx = lx + half
  const floors = Math.min(5, (c.n >= 3 ? 2 : 1) + Math.floor(Math.random() * Math.min(4, 1 + Math.floor(c.n / 3))))
  const mat = pick(c.mats)
  const gFloor = Math.floor(Math.random() * floors)
  let y = c.base
  for (let f = 0; f < floors; f++) {
    const pm = f === 0 && c.mats.includes('stone') && Math.random() < 0.4 ? 'stone' : mat
    block(c, cx - half + 6, y - 24, 6, 24, pm)
    block(c, cx + half - 6, y - 24, 6, 24, pm)
    if (f === gFloor || Math.random() < Math.min(0.6, 0.18 + c.n * 0.03)) {
      if (wide) {
        guard(c, cx - 13, y)
        if (c.n >= 4 && c.mats.includes('glass') && Math.random() < 0.5) block(c, cx + 14, y - 11, 11, 11, c.n >= 4 && Math.random() < 0.5 ? 'tnt' : 'glass')
        else guard(c, cx + 13, y)
      } else guard(c, cx, y)
    } else if (c.n >= 4 && Math.random() < 0.35) {
      block(c, cx, y - 11, 11, 11, 'tnt')
    }
    block(c, cx, y - 54, half, 6, Math.random() < 0.3 ? pick(c.mats) : mat)
    y -= 60
  }
  return [y, cx]
}

function stack(c: Ctx, lx: number): [number, number] {
  const rows = 3 + Math.floor(Math.random() * Math.min(4, 1 + c.n / 3))
  const cx = lx + 12
  let y = c.base
  for (let i = 0; i < rows; i++) {
    block(c, cx, y - 12, 12, 12, pick(c.mats))
    y -= 24
  }
  return [y, cx]
}

function pyramid(c: Ctx, lx: number, base: number): [number, number] {
  let y = c.base
  for (let row = 0; row < base; row++) {
    const cnt = base - row
    const x0 = lx + 12 + row * 12
    for (let i = 0; i < cnt; i++) block(c, x0 + i * 24, y - 12, 12, 12, row === base - 1 && c.mats.includes('glass') ? 'glass' : pick(c.mats))
    y -= 24
  }
  return [y, lx + base * 12]
}

function bunker(c: Ctx, lx: number): [number, number] {
  const mat: Mat = c.mats.includes('stone') ? 'stone' : 'wood'
  block(c, lx + 12, c.base - 12, 12, 12, mat)
  block(c, lx + 60, c.base - 12, 12, 12, mat)
  guard(c, lx + 36, c.base)
  block(c, lx + 36, c.base - 30, 36, 6, mat)
  return [c.base - 36, lx + 36]
}

type Mod = { w: number; build: (c: Ctx, lx: number) => [number, number] }

const MODS: Record<string, Mod> = {
  tower: { w: 60, build: (c, lx) => tower(c, lx, false) },
  wide: { w: 84, build: (c, lx) => tower(c, lx, true) },
  stack: { w: 24, build: stack },
  pyr3: { w: 72, build: (c, lx) => pyramid(c, lx, 3) },
  pyr4: { w: 96, build: (c, lx) => pyramid(c, lx, 4) },
  bunker: { w: 72, build: bunker },
}

export function planLevel(n: number): LevelPlan {
  const boss = n % 5 === 0
  const mats: Mat[] = n <= 1 ? ['wood'] : n === 2 ? ['wood', 'glass'] : n < 8 ? ['wood', 'glass', 'stone'] : ['wood', 'glass', 'stone', 'stone']
  const c: Ctx = { n, specs: [], guardHp: 14 + Math.min(16, n), mats, guards: 0, base: 0 }
  let earth: Spec | null = null
  if (n >= 6 && Math.random() < 0.45) {
    const h = 36 + Math.random() * 46
    earth = { x: (ZONE_L + ZONE_R) / 2 + 4, y: -h / 2, hw: (ZONE_R - ZONE_L) / 2 + 8, hh: h / 2, mat: 'earth', hp: 1 }
    c.base = -h
  }

  const pool = n <= 1 ? ['tower'] : n <= 3 ? ['tower', 'tower', 'stack', 'pyr3', 'wide', 'pyr4'] : ['tower', 'wide', 'stack', 'pyr3', 'pyr4', 'bunker', 'tower']
  const target = n <= 1 ? 1 : n <= 3 ? 2 : boss ? 3 : 2 + (Math.random() < 0.55 ? 1 : 0)
  const chosen: Mod[] = []
  let width = 0
  const room = ZONE_R - ZONE_L
  for (let tries = 0; tries < 30 && chosen.length < target; tries++) {
    const m = MODS[pick(pool)]
    if (width + m.w + chosen.length * 10 <= room) {
      chosen.push(m)
      width += m.w
    }
  }
  const gaps = Math.max(0, room - width)
  const gap = chosen.length > 1 ? Math.min(34, gaps / chosen.length) : 0
  let x = ZONE_L + Math.random() * Math.max(0, gaps - gap * (chosen.length - 1))
  const tops: Array<[number, number]> = []
  for (const m of chosen) {
    tops.push(m.build(c, x))
    x += m.w + gap
  }
  // Roof occupants
  let tallest = 0
  tops.forEach((t, i) => {
    if (t[0] < tops[tallest][0]) tallest = i
  })
  tops.forEach(([y, cx], i) => {
    if (boss && i === tallest) {
      c.specs.push({ x: cx, y: y - 16, r: 16, mat: 'king', hp: HP.king + n * 2 })
      c.guards++
    } else if (Math.random() < 0.7 || c.guards === 0) guard(c, cx, y)
    else if (n >= 4) block(c, cx, y - 11, 11, 11, 'tnt')
  })

  const par = Math.max(1, chosen.length, Math.ceil(c.guards / 2)) + (boss ? 1 : 0)
  const shots = Math.min(7, par + 2 + (boss ? 1 : 0) + (n <= 2 ? 1 : 0))
  const unlocked = [1, 2, 3].filter((k) => UNLOCK[k] <= n)
  const ammo = new Array<number>(shots).fill(0)
  const fresh = unlocked.find((k) => UNLOCK[k] === n)
  if (fresh != null) ammo[0] = fresh
  const specials = unlocked.length ? Math.min(shots - 2, 1 + Math.floor(n / 6)) : 0
  for (let i = 0; i < specials; i++) ammo[1 + i * 2 < shots ? 1 + i * 2 : shots - 1] = pick(unlocked)
  if (boss && unlocked.includes(3)) ammo[shots - 1] = 3
  return { specs: c.specs, earth, ammo, par, boss, guards: c.guards }
}

// ── Hand-designed castles ─────────────────────────────────────
// Every castle is checked by scratch script `lv3-ct-verify`: a search bot replays the real
// physics and damage rules and must topple every guard within the level's shots.

/** Tower floor: [material w|s|g][occupant G guard · T tnt · X glass box · . empty] (+ right occupant on wide towers). */
type Floor = string
type Top = 'G' | 'K' | 'T' | '.'
type Part =
  | { t: 'tower'; x: number; floors: Floor[]; wide?: boolean; top?: Top }
  | { t: 'stack'; x: number; mats: string; top?: Top }
  | { t: 'pyr'; x: number; base: 3 | 4; mats: string; top?: Top }
  | { t: 'bunker'; x: number; mat: 'w' | 's' }
  | { t: 'guard'; x: number }

export type CastleDef = { name: string; hint?: string; earth?: number; parts: Part[]; ammo: string; par: number }

const MAT_OF: Record<string, Mat> = { w: 'wood', s: 'stone', g: 'glass', t: 'tnt' }

export function buildCastle(n: number, def: CastleDef): LevelPlan {
  const c: Ctx = { n, specs: [], guardHp: 14 + Math.min(16, n), mats: [], guards: 0, base: 0 }
  let earth: Spec | null = null
  if (def.earth) {
    const h = def.earth
    earth = { x: (ZONE_L + ZONE_R) / 2 + 4, y: -h / 2, hw: (ZONE_R - ZONE_L) / 2 + 8, hh: h / 2, mat: 'earth', hp: 1 }
    c.base = -h
  }
  const occupant = (ch: string, x: number, y: number) => {
    if (ch === 'G') guard(c, x, y)
    else if (ch === 'T') block(c, x, y - 11, 11, 11, 'tnt')
    else if (ch === 'X') block(c, x, y - 11, 11, 11, 'glass')
  }
  const top = (t: Top | undefined, x: number, y: number) => {
    if (t === 'K') {
      c.specs.push({ x, y: y - 16, r: 16, mat: 'king', hp: HP.king + n * 2 })
      c.guards++
    } else if (t && t !== '.') occupant(t, x, y)
  }
  for (const p of def.parts) {
    if (p.t === 'tower') {
      const half = p.wide ? 42 : 30
      const cx = p.x + half
      let y = c.base
      for (const f of p.floors) {
        const m = MAT_OF[f[0]]
        block(c, cx - half + 6, y - 24, 6, 24, m)
        block(c, cx + half - 6, y - 24, 6, 24, m)
        if (p.wide && f[1] !== '.') {
          occupant(f[1], cx - 13, y)
          occupant(f[2] ?? f[1], cx + 13, y)
        } else occupant(f[1], cx, y)
        block(c, cx, y - 54, half, 6, m)
        y -= 60
      }
      top(p.top, cx, y)
    } else if (p.t === 'stack') {
      let y = c.base
      for (const ch of p.mats) {
        block(c, p.x + 12, y - 12, 12, 12, MAT_OF[ch])
        y -= 24
      }
      top(p.top, p.x + 12, y)
    } else if (p.t === 'pyr') {
      let y = c.base
      for (let row = 0; row < p.base; row++) {
        const cnt = p.base - row
        const x0 = p.x + 12 + row * 12
        for (let i = 0; i < cnt; i++) block(c, x0 + i * 24, y - 12, 12, 12, MAT_OF[p.mats[row] ?? 'w'])
        y -= 24
      }
      top(p.top, p.x + p.base * 12, y)
    } else if (p.t === 'bunker') {
      const m = MAT_OF[p.mat]
      block(c, p.x + 12, c.base - 12, 12, 12, m)
      block(c, p.x + 60, c.base - 12, 12, 12, m)
      guard(c, p.x + 36, c.base)
      block(c, p.x + 36, c.base - 30, 36, 6, m)
    } else guard(c, p.x, c.base)
  }
  const ammo = def.ammo.split('').map(Number)
  return { specs: c.specs, earth, ammo, par: def.par, boss: n % 5 === 0, guards: c.guards }
}

const T = (x: number, floors: Floor[], top: Top = 'G', wide = false): Part => ({ t: 'tower', x, floors, top, wide })
const St = (x: number, mats: string, top: Top = '.'): Part => ({ t: 'stack', x, mats, top })
const Py = (x: number, base: 3 | 4, mats: string, top: Top = 'G'): Part => ({ t: 'pyr', x, base, mats, top })
const Bk = (x: number, mat: 'w' | 's'): Part => ({ t: 'bunker', x, mat })
const Gd = (x: number): Part => ({ t: 'guard', x })

/**
 * Arc: 1–5 aim, split shot, glass, TNT + bomb · 6–10 iron ball, stone, hills, bunkers ·
 * 11–15 chain reactions and tall spires · 16–20 fortresses · 21–25 trick shots on few
 * boulders · 26–32 everything. Every 5th castle hides a king.
 */
export const CASTLES: CastleDef[] = [
  { name: 'First Siege', hint: 'drag back and release', parts: [T(250, ['w.'])], ammo: '0000', par: 2 },
  { name: 'Twin Towers', parts: [T(200, ['wG'], '.'), T(300, ['w.'])], ammo: '1000', par: 2 },
  { name: 'Glass House', hint: 'glass shatters easily', parts: [Py(210, 3, 'wwg'), T(310, ['gG'])], ammo: '0010', par: 3 },
  { name: 'Powder Keg', hint: 'hit the TNT', parts: [T(200, ['wT', 'wG']), St(320, 'ww', 'G')], ammo: '3000', par: 2 },
  { name: 'Royal Keep', hint: 'topple the king', parts: [T(220, ['wG', 'wG'], 'K', true), T(320, ['sT'])], ammo: '00310', par: 3 },
  { name: 'Iron Rain', hint: 'tap the iron ball to slam down', parts: [Bk(220, 's'), T(310, ['wG'])], ammo: '2000', par: 2 },
  { name: 'Stone Wall', parts: [St(196, 'sss'), T(250, ['wG', 'w.']), Gd(345)], ammo: '00130', par: 3 },
  { name: 'Hilltop', earth: 50, parts: [T(210, ['wG']), Py(290, 3, 'wws')], ammo: '0012', par: 2 },
  { name: 'Barracks', hint: 'bunkers need weight', parts: [Bk(196, 'w'), Bk(286, 's')], ammo: '0230', par: 3 },
  { name: 'Citadel', parts: [T(186, ['sG', 'wT']), T(258, ['sG', 'wG', 'w.'], 'K', true)], ammo: '00213', par: 3 },
  { name: 'Chain Reaction', hint: 'one spark is enough', parts: [T(196, ['wT'], 'T'), T(262, ['wT']), T(326, ['wG'])], ammo: '000', par: 2 },
  { name: 'Glass Spire', parts: [T(250, ['gG', 'gG', 'g.'])], ammo: '000', par: 1 },
  { name: 'Twin Keeps', earth: 40, parts: [T(196, ['sG', 's.']), T(306, ['sG', 's.'])], ammo: '00223', par: 3 },
  { name: 'Pyramid', parts: [Py(206, 4, 'swwg'), Gd(340)], ammo: '0013', par: 2 },
  { name: 'Thunder Hold', parts: [T(186, ['wT', 'wT']), T(252, ['sG', 'sT', 'w.'], 'K', true), St(346, 'ss', 'G')], ammo: '001233', par: 4 },
  { name: 'Bunker Line', parts: [Bk(190, 's'), Bk(270, 's'), St(350, 'w', 'G')], ammo: '00223', par: 4 },
  { name: 'High Rise', hint: 'the taller they are…', parts: [T(240, ['wG', 'w.', 'wG', 'w.'])], ammo: '0012', par: 2 },
  { name: 'Moat Keep', earth: 70, parts: [T(216, ['wG']), T(300, ['wT'])], ammo: '0030', par: 3 },
  { name: 'Fortress', parts: [T(190, ['sG', 'sG'], 'G', true), T(300, ['wT', 'wG'])], ammo: '00232', par: 3 },
  { name: 'Iron Throne', parts: [St(186, 'sss'), T(222, ['sG', 'sT', 'sG'], 'K', true), T(316, ['wG', 'wG'])], ammo: '0012233', par: 5 },
  { name: 'Sharpshooter', hint: 'lob it over the wall', parts: [St(270, 'sssss'), T(316, ['wG'])], ammo: '000', par: 2 },
  { name: 'Glass Garden', parts: [Py(196, 3, 'ggg'), Py(290, 3, 'ggg')], ammo: '01', par: 2 },
  { name: 'Demolition', hint: 'start the dominoes', parts: [T(190, ['wT'], '.'), T(252, ['wG', 'wG']), T(316, ['wG'])], ammo: '0000', par: 3 },
  { name: 'Last Stand', parts: [Bk(230, 's'), St(330, 'sss', 'G')], ammo: '02', par: 2 },
  { name: 'Glass Palace', parts: [T(196, ['gG', 'gG', 'gT'], 'K', true), T(300, ['gG', 'g.'])], ammo: '00113', par: 3 },
  { name: 'Lookout', hint: 'a breather', parts: [T(236, ['wG']), St(320, 'ww', 'G')], ammo: '0010', par: 2 },
  { name: 'Hill Fort', earth: 60, parts: [T(206, ['sG', 'wG'], 'G', true), St(330, 'ss', 'G')], ammo: '00223', par: 3 },
  { name: 'Powder Row', parts: [T(186, ['wT', 'wT'], 'T'), T(254, ['sG', 'sG']), T(320, ['wG'])], ammo: '0033', par: 3 },
  { name: 'Watchtowers', parts: [T(186, ['wG', 'w.']), T(250, ['wG', 'w.']), T(314, ['wG', 'w.'])], ammo: '00111', par: 4 },
  { name: 'Kings Bastion', earth: 40, parts: [St(186, 'sss'), T(216, ['sG', 'sT', 'sG', 'w.'], 'K', true), T(312, ['sG', 'wT'])], ammo: '00012233', par: 6 },
  { name: 'Siege Engine', parts: [Py(190, 4, 'sswg'), T(300, ['wT', 'wG'])], ammo: '00123', par: 3 },
  { name: 'Grand Finale', parts: [T(186, ['sG', 'wT', 'sG'], 'G', true), T(282, ['sG', 'sT', 'sG'], 'K', true)], ammo: '0012233', par: 5 },
]

/** Authored castle for n up to CASTLES.length, then the random generator. */
export function planFor(n: number): LevelPlan & { name?: string; hint?: string } {
  const def = CASTLES[n - 1]
  if (def) return { ...buildCastle(n, def), name: def.name, hint: def.hint }
  return planLevel(n)
}
