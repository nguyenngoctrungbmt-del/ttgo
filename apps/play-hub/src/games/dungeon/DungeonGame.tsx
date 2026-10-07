import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, dist, glow, rand } from '../../shared/action/fx'
import { Stick, localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import {
  COLS,
  MON_R,
  ROWS,
  THEMES,
  drawBars,
  drawChest,
  drawHero,
  drawMonster,
  drawStairs,
  drawSwingArc,
  drawTorch,
  paintRoom,
  type MonKind,
} from './art'
import { levelSpec, parseWaves, roomSolid, type DungeonLevelSpec } from './levels'
import PerkIcon from './PerkIcon'
import '../../shared/action/action.css'
import './dungeon.css'

const meta = getGame('dungeon')

type Phase = 'idle' | 'play' | 'perk' | 'dying' | 'over'

type Mon = {
  id: number
  kind: MonKind
  x: number
  y: number
  kx: number
  ky: number
  hp: number
  max: number
  r: number
  speed: number
  t: number
  mode: number
  timer: number
  ax: number
  ay: number
  sx: number
  sy: number
  flash: number
  hue: number
  look: number
  fly: boolean
  boss: boolean
  spawnT: number
  count: number
  value: number
}

type Shot = { x: number; y: number; vx: number; vy: number; life: number; r: number; kind: 'arrow' | 'orb'; grazed: boolean }
type Wave = { x: number; y: number; vx: number; vy: number; life: number; dmg: number; hits: Set<number> }
type Teleg = { kind: 'circle' | 'line'; x: number; y: number; r: number; a: number; len: number; life: number; max: number }
type Decal = { x: number; y: number; r: number; color: string }

export type PerkId = 'dmg' | 'heart' | 'spin' | 'wave' | 'vamp' | 'speed' | 'rate' | 'reach'
type PerkDef = { id: PerkId; label: string; desc: string; max: number }
const PERKS: PerkDef[] = [
  { id: 'dmg', label: 'Sharpened Blade', desc: '+1 sword damage', max: 5 },
  { id: 'heart', label: 'Heart Container', desc: '+1 max heart and full heal', max: 4 },
  { id: 'spin', label: 'Whirlwind', desc: 'Every few swings becomes a spin attack', max: 3 },
  { id: 'wave', label: 'Wave Slash', desc: 'Swings launch a cutting wave', max: 3 },
  { id: 'vamp', label: 'Lifesteal', desc: 'Kills restore hearts over time', max: 3 },
  { id: 'speed', label: 'Swift Boots', desc: 'Move faster and roll more often', max: 3 },
  { id: 'rate', label: 'Quick Hands', desc: 'Swing 18% faster', max: 4 },
  { id: 'reach', label: 'Long Blade', desc: '+20% sword reach', max: 3 },
]

const LAYOUTS: [number, number, number][][] = [
  [],
  [[2, 3, 2], [6, 3, 2], [2, 8, 2], [6, 8, 2]],
  [[3, 5, 2], [5, 5, 2], [3, 7, 2], [5, 7, 2]],
  [[2, 4, 3], [3, 4, 3], [5, 7, 3], [6, 7, 3], [1, 9, 3]],
  [[4, 6, 2], [2, 2, 3], [6, 2, 3], [1, 6, 3], [7, 6, 3]],
  [[2, 5, 2], [6, 5, 2], [4, 8, 3], [3, 3, 3], [5, 3, 3]],
  [[1, 3, 3], [2, 3, 3], [6, 3, 3], [7, 3, 3], [3, 7, 2], [5, 7, 2]],
]
const TORCHES: [number, number][] = [[0.82, 3.5], [0.82, 8.5], [8.18, 3.5], [8.18, 8.5], [2.5, 0.8], [6.5, 0.8]]
const BOSSES: MonKind[] = ['kingslime', 'bonelord', 'blackknight']
const BOSS_NAME: Record<string, string> = { kingslime: 'Slime King', bonelord: 'Bone Lord', blackknight: 'Black Knight' }

type Room = {
  id: number
  solid: Uint8Array
  seed: number
  theme: number
  boss: boolean
  locked: boolean
  waves: MonKind[][]
  doorLift: number
  chest: { x: number; y: number; open: number } | null
  stairs: boolean
  chestAfter: boolean
}

type Hero = {
  x: number
  y: number
  aim: number
  hp: number
  maxHp: number
  inv: number
  walk: number
  swingCd: number
  swingT: number
  spin: boolean
  swings: number
  roll: number
  rollCd: number
  rdx: number
  rdy: number
  rollGrazed: boolean
  vampKills: number
  kx: number
  ky: number
}

type World = {
  demo: boolean
  spec: DungeonLevelSpec
  floorHits: number
  levels: number
  hero: Hero
  room: Room
  mons: Mon[]
  shots: Shot[]
  waves: Wave[]
  telegs: Teleg[]
  decals: Decal[]
  floor: number
  roomIdx: number
  trans: number
  transDir: 0 | 1 | -1
  perks: Record<PerkId, number>
  dmgMul: number
  id: number
  score: number
  roomId: number
  stats: { score: number; rooms: number; kills: number; floor: number; bosses: number; perks: number }
}

/** `boss` marks the floor's final (guardian) room. Without an authored layout: the demo room. */
function makeRoom(id: number, theme: number, boss: boolean, authored?: Uint8Array): Room {
  let solid = authored
  if (!solid) {
    solid = new Uint8Array(COLS * ROWS)
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) if (i === 0 || j === 0 || i === COLS - 1 || j === ROWS - 1) solid[j * COLS + i] = 1
    for (const [i, j, v] of LAYOUTS[1]) solid[j * COLS + i] = v
  }
  return {
    id,
    solid,
    seed: Math.random() * 100,
    theme: theme % THEMES.length,
    boss,
    locked: true,
    waves: [],
    doorLift: 0,
    chest: null,
    stairs: false,
    chestAfter: false,
  }
}

function freshHero(): Hero {
  return { x: 4.5, y: 10.6, aim: -Math.PI / 2, hp: 3, maxHp: 3, inv: 0, walk: 0, swingCd: 0, swingT: 0, spin: false, swings: 0, roll: 0, rollCd: 0, rdx: 0, rdy: -1, rollGrazed: false, vampKills: 0, kx: 0, ky: 0 }
}

function freshWorld(demo: boolean): World {
  return {
    demo,
    hero: freshHero(),
    spec: levelSpec(1),
    floorHits: 0,
    levels: 0,
    room: makeRoom(0, 0, false),
    mons: [],
    shots: [],
    waves: [],
    telegs: [],
    decals: [],
    floor: 1,
    roomIdx: 1,
    trans: 0,
    transDir: 0,
    perks: { dmg: 0, heart: 0, spin: 0, wave: 0, vamp: 0, speed: 0, rate: 0, reach: 0 },
    dmgMul: 1,
    id: 1,
    score: 0,
    roomId: 1,
    stats: { score: 0, rooms: 0, kills: 0, floor: 1, bosses: 0, perks: 0 },
  }
}

const SCORE: Record<MonKind, number> = { slime: 10, bigslime: 30, bat: 15, archer: 25, knight: 40, kingslime: 500, bonelord: 500, blackknight: 500 }

export default function DungeonGame() {
  const run = useActionRun('dungeon')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const stick = useRef(new Stick(52)).current
  const keys = useRef(new Set<string>()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(true))
  const phaseRef = useRef<Phase>('idle')
  const roomCache = useRef<{ key: string; canvas: HTMLCanvasElement | null }>({ key: '', canvas: null })
  const lightRef = useRef<HTMLCanvasElement | null>(null)
  const attackQueued = useRef(false)
  const auto = useRef({ on: false, turbo: 1 })
  const choicesRef = useRef<PerkDef[]>([])

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, hp: 3, max: 3, floor: 1, room: 1, rooms: 4 })
  const [boss, setBoss] = useState<{ pct: number; name: string } | null>(null)
  const [choices, setChoices] = useState<PerkDef[]>([])
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [rollReady, setRollReady] = useState(true)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, hp: w.hero.hp, max: w.hero.maxHp, floor: w.floor, room: w.roomIdx, rooms: w.spec.rooms.length })
  }

  function layout() {
    const { w: W, h: H } = size.current
    const top = 46
    const ts = Math.floor(Math.min(W / COLS, (H - top) / ROWS))
    const ox = Math.floor((W - ts * COLS) / 2)
    const oy = Math.floor(top + (H - top - ts * ROWS) / 2)
    return { ts, ox, oy }
  }

  const reach = () => 1.2 * (1 + world.current.perks.reach * 0.2)
  const swordDmg = () => (2 + world.current.perks.dmg) * world.current.dmgMul

  // ── Lifecycle ─────────────────────────────────────────────
  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld(false)
    w.hero.maxHp = 3 + run.level('vigor')
    w.hero.hp = w.hero.maxHp
    w.dmgMul = 1 + run.level('whet') * 0.25
    for (let i = 0; i < run.level('scout'); i++) {
      const pool = PERKS.filter((p) => p.id !== 'heart' && w.perks[p.id] < p.max)
      const p = pool[Math.floor(Math.random() * pool.length)]
      w.perks[p.id] += 1
    }
    // Starting deeper: a veteran kit worth the chests of the floors skipped (2 per floor).
    const floor = Math.max(1, level)
    const veteran = Math.min(26, (floor - 1) * 2)
    for (let i = 0; i < veteran; i++) {
      const pool = PERKS.filter((p) => w.perks[p.id] < p.max)
      if (!pool.length) break
      const p = pool[Math.floor(Math.random() * pool.length)]
      w.perks[p.id] += 1
      if (p.id === 'heart') w.hero.maxHp += 1
    }
    w.hero.hp = w.hero.maxHp
    w.floor = floor
    w.stats.floor = floor
    w.spec = levelSpec(floor)
    world.current = w
    fx.reset()
    keys.clear()
    setBoss(null)
    run.begin()
    setPhaseBoth('play')
    enterRoom()
    pushHud()
    const starting = PERKS.filter((p) => w.perks[p.id] > 0).map((p) => p.label)
    announceFloor(veteran > 0 ? `veteran kit: ${veteran} perks` : starting.length ? starting.join(' · ') : undefined)
    sfx.ready()
  }

  function announceFloor(extra?: string) {
    const w = world.current
    const sp = w.spec
    setBanner({ key: Date.now(), text: sp.boss ? `BOSS FLOOR ${sp.n}` : `FLOOR ${sp.n} · ${sp.name}`, sub: extra ?? sp.hint ?? THEMES[sp.theme % THEMES.length].name })
  }

  function enterRoom() {
    const w = world.current
    const sp = w.spec
    const def = sp.rooms[Math.min(w.roomIdx, sp.rooms.length) - 1]
    const isFinal = w.roomIdx >= sp.rooms.length
    w.room = makeRoom(w.roomId++, sp.theme, isFinal, roomSolid(def[0], COLS, ROWS))
    w.room.chestAfter = !!def[2] || isFinal
    w.mons = []
    w.shots = []
    w.waves = []
    w.telegs = []
    w.decals = []
    w.hero.x = 4.5
    w.hero.y = 10.6
    w.hero.aim = -Math.PI / 2
    w.room.waves = parseWaves(def[1])
    spawnWave()
    if (isFinal) {
      const bossKind = w.room.waves.flat().concat(w.mons.map((m) => m.kind)).find((k) => BOSSES.includes(k))
      if (bossKind) {
        setBanner({ key: Date.now(), text: BOSS_NAME[bossKind].toUpperCase(), sub: `floor ${w.floor} boss` })
        sfx.boom(0.6)
        haptic.heavy()
      } else {
        setBanner({ key: Date.now(), text: 'GUARDIAN ROOM', sub: 'clear it to find the stairs' })
        sfx.ready()
      }
    }
    pushHud()
  }

  function spawnWave() {
    const w = world.current
    const list = w.room.waves.shift()
    if (!list) return
    for (const k of list) {
      let x = 4.5
      let y = 4
      for (let tries = 0; tries < 30; tries++) {
        x = rand(1.6, COLS - 1.6)
        y = rand(1.6, ROWS - 4)
        if (!solidAt(x, y) && dist(x, y, w.hero.x, w.hero.y) > 3.5) break
      }
      if (MON_R[k] > 0.6) {
        x = 4.5 + (list.indexOf(k) % 3) * 0.9 - 0.9
        y = 4
        if (solidAt(x, y)) x = 4.5
      }
      spawnMon(k, x, y, 0.9)
    }
  }

  function spawnMon(kind: MonKind, x: number, y: number, spawnT: number) {
    const w = world.current
    const f = w.demo ? 1 : w.spec.hp
    const base: Record<MonKind, [hp: number, speed: number]> = {
      slime: [4, 2.6],
      bigslime: [10, 2.0],
      bat: [2, 2.3],
      archer: [5, 1.4],
      knight: [12, 1.0],
      kingslime: [70, 2.2],
      bonelord: [60, 0.8],
      blackknight: [80, 1.15],
    }
    const [hp0, speed] = base[kind]
    const isBoss = BOSSES.includes(kind)
    const hp = Math.round(hp0 * (isBoss ? (w.demo ? 1 : 0.6 + w.spec.hp * 0.8) : f))
    w.mons.push({
      id: w.id++,
      kind,
      x,
      y,
      kx: 0,
      ky: 0,
      hp,
      max: hp,
      r: MON_R[kind],
      speed: speed * (1 + Math.min(0.3, (w.floor - 1) * 0.05)),
      t: rand(0, 5),
      mode: 0,
      timer: rand(0.4, 1.2) + (isBoss ? 0.8 : 0),
      ax: 0,
      ay: 0,
      sx: x,
      sy: y,
      flash: 0,
      hue: kind === 'bigslime' ? rand(0, 30) : rand(90, 150),
      look: Math.PI / 2,
      fly: kind === 'bat' || kind === 'bonelord',
      boss: isBoss,
      spawnT,
      count: 0,
      value: SCORE[kind] * (isBoss ? w.floor : 1),
    })
    if (isBoss) setBoss({ pct: 1, name: BOSS_NAME[kind] })
    if (spawnT > 0) w.telegs.push({ kind: 'circle', x, y, r: MON_R[kind] + 0.25, a: 0, len: 0, life: spawnT, max: spawnT })
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.4)
    fx.stop(0.15)
    fx.shake(14, 0.5)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.stats.rooms * 1.2 + w.stats.kills / 8 + w.stats.bosses * 8 + w.levels * 3)
      run.end({ score: w.score, cleared: w.levels >= 1, stats: { ...w.stats }, coins }, revive)
    }, 1100)
  }

  function revive() {
    const w = world.current
    const h = w.hero
    h.hp = h.maxHp
    h.inv = 2.5
    const { ts, ox, oy } = layout()
    for (const m of w.mons) {
      if (!m.boss && dist(m.x, m.y, h.x, h.y) < 3.5) {
        m.hp = 0
        fx.burst(ox + m.x * ts, oy + m.y * ts, { count: 10, color: ['#fde047', '#fff'], speed: 160 })
      } else if (m.boss) {
        const a = Math.atan2(m.y - h.y, m.x - h.x)
        m.kx += Math.cos(a) * 6
        m.ky += Math.sin(a) * 6
        m.mode = 0
        m.timer = 2
      }
    }
    w.mons = w.mons.filter((m) => m.hp > 0)
    w.shots = []
    w.telegs = []
    fx.ring(ox + h.x * ts, oy + h.y * ts, { color: '#fde047', maxR: ts * 4, life: 0.6, width: 6 })
    fx.flash('#fde047', 0.3)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'full hearts' })
    setPhaseBoth('play')
    pushHud()
  }

  // ── Collision helpers ─────────────────────────────────────
  function solidAt(x: number, y: number) {
    const i = Math.floor(x)
    const j = Math.floor(y)
    if (i < 0 || j < 0 || i >= COLS || j >= ROWS) return true
    const s = world.current.room.solid[j * COLS + i]
    if (s === 1 && i === 4 && j === 0 && world.current.room.doorLift > 0.9) return false
    return s !== 0
  }

  function blocked(x: number, y: number, r: number) {
    return solidAt(x - r, y - r) || solidAt(x + r, y - r) || solidAt(x - r, y + r) || solidAt(x + r, y + r)
  }

  function moveEnt(e: { x: number; y: number }, dx: number, dy: number, r: number, fly = false) {
    if (fly) {
      e.x = clamp(e.x + dx, 1 + r, COLS - 1 - r)
      e.y = clamp(e.y + dy, 1 + r, ROWS - 1 - r)
      return true
    }
    let ok = true
    if (!blocked(e.x + dx, e.y, r)) e.x += dx
    else ok = false
    if (!blocked(e.x, e.y + dy, r)) e.y += dy
    else ok = false
    return ok
  }

  /** Move toward a heading, fanning out around obstacles instead of sticking. */
  function chase(m: Mon, a: number, s: number) {
    const side = m.id % 2 ? 1 : -1
    for (const off of [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8]) {
      const aa = a + off * side
      const nx = m.x + Math.cos(aa) * s
      const ny = m.y + Math.sin(aa) * s
      if (!blocked(nx, ny, m.r * 0.75)) {
        m.x = nx
        m.y = ny
        return off === 0
      }
    }
    return false
  }

  // ── Combat ────────────────────────────────────────────────
  function px(x: number) {
    const { ts, ox } = layout()
    return ox + x * ts
  }
  function py(y: number) {
    const { ts, oy } = layout()
    return oy + y * ts
  }

  function swing(target: Mon | null) {
    const w = world.current
    const h = w.hero
    if (h.swingCd > 0 || h.roll > 0) return
    if (target) h.aim = Math.atan2(target.y - h.y, target.x - h.x)
    h.swings += 1
    const sp = w.perks.spin
    h.spin = sp > 0 && h.swings % (5 - sp) === 0
    const rate = 1 + w.perks.rate * 0.18
    h.swingCd = 0.42 / rate
    h.swingT = 0.2
    const R = reach() * (h.spin ? 1.15 : 1)
    const dmg = swordDmg() * (h.spin ? 1.3 : 1)
    let hits = 0
    for (const m of w.mons) {
      if (m.hp <= 0 || m.spawnT > 0) continue
      const d = dist(m.x, m.y, h.x, h.y)
      if (d > R + m.r) continue
      if (!h.spin) {
        let da = Math.atan2(m.y - h.y, m.x - h.x) - h.aim
        while (da > Math.PI) da -= Math.PI * 2
        while (da < -Math.PI) da += Math.PI * 2
        if (Math.abs(da) > 1.25 && d > m.r + 0.3) continue
      }
      hitMon(m, dmg, Math.atan2(m.y - h.y, m.x - h.x))
      hits++
    }
    if (w.perks.wave > 0) {
      const lvl = w.perks.wave
      w.waves.push({ x: h.x, y: h.y, vx: Math.cos(h.aim) * 7, vy: Math.sin(h.aim) * 7, life: 0.35 + lvl * 0.1, dmg: swordDmg() * (0.4 + lvl * 0.2), hits: new Set() })
    }
    if (w.demo) return
    if (h.spin) {
      sfx.whoosh()
      fx.ring(px(h.x), py(h.y), { color: '#7dd3fc', maxR: R * layout().ts, life: 0.25 })
    }
    sfx.slash()
    if (hits > 0) {
      fx.stop(hits > 1 ? 0.06 : 0.035)
      haptic.light()
    }
  }

  function hitMon(m: Mon, dmg: number, a: number) {
    const w = world.current
    const stunned = m.kind === 'blackknight' && m.mode === 4
    m.hp -= dmg * (stunned ? 1.5 : 1)
    m.flash = 0.1
    const kb = m.boss ? 0.6 : m.kind === 'knight' || m.kind === 'bigslime' ? 2.5 : 5
    m.kx += Math.cos(a) * kb
    m.ky += Math.sin(a) * kb
    if (m.kind === 'knight' && m.mode === 1 && !w.demo) {
      // interrupting a windup staggers the knight
      m.mode = 3
      m.timer = 0.6
    }
    if (m.kind === 'bat') m.mode = 2
    const col = m.kind.includes('slime') ? `hsl(${m.hue},70%,55%)` : m.kind === 'bat' ? '#a78bfa' : '#e7e5e4'
    fx.burst(px(m.x), py(m.y), { count: 7, color: [col, '#fff'], speed: 200, angle: a, spread: 1.4, size: 3, gravity: 0 })
    if (!w.demo) {
      fx.text(px(m.x), py(m.y) - layout().ts * 0.5, `${Math.round(dmg * (stunned ? 1.5 : 1))}`, stunned ? '#fde047' : '#fff', 13)
      sfx.hit()
    }
    if (m.hp <= 0) killMon(m)
    else if (m.boss) setBoss({ pct: Math.max(0, m.hp / m.max), name: BOSS_NAME[m.kind] })
  }

  function killMon(m: Mon) {
    const w = world.current
    const { ts } = layout()
    const col = m.kind.includes('slime') ? `hsl(${m.hue},70%,50%)` : m.kind === 'bat' ? '#7c3aed' : m.kind === 'knight' || m.kind === 'blackknight' ? '#6b7280' : '#e7e5e4'
    fx.burst(px(m.x), py(m.y), { count: m.boss ? 50 : 16, color: [col, '#ffffff', '#fde047'], speed: m.boss ? 340 : 220, size: 3.5, gravity: 0, drag: 3 })
    fx.ring(px(m.x), py(m.y), { color: col, maxR: ts * m.r * 2.6, life: 0.3 })
    if (m.kind.includes('slime')) w.decals.push({ x: m.x, y: m.y, r: m.r * 1.3, color: col })
    if (w.decals.length > 30) w.decals.shift()
    if (m.kind === 'bigslime') {
      for (const s of [-1, 1]) spawnMon('slime', clamp(m.x + s * 0.4, 1.4, COLS - 1.4), m.y, 0)
    }
    if (w.demo) return
    w.score += m.value
    w.stats.kills += 1
    w.stats.score = w.score
    fx.text(px(m.x), py(m.y) - ts * 0.6, `+${m.value}`, '#fde047', m.boss ? 26 : 14)
    fx.shake(m.boss ? 14 : 3, m.boss ? 0.5 : 0.12)
    const h = w.hero
    if (w.perks.vamp > 0) {
      h.vampKills += 1
      const need = [8, 6, 4][w.perks.vamp - 1]
      if (h.vampKills >= need && h.hp < h.maxHp) {
        h.vampKills = 0
        h.hp += 1
        fx.text(px(h.x), py(h.y) - ts, '+1 heart', '#f87171', 16)
        sfx.power()
        pushHud()
      }
    }
    if (m.boss) {
      w.stats.bosses += 1
      fx.explode(px(m.x), py(m.y), 2.6)
      fx.flash('#fff', 0.35)
      fx.stop(0.25)
      fx.slowmo(1.2, 0.3)
      sfx.boom(1)
      sfx.win()
      haptic.heavy()
      setBoss(null)
      // Minions vanish with their master.
      for (const o of w.mons) if (o !== m && o.hp > 0) {
        o.hp = 0
        fx.burst(px(o.x), py(o.y), { count: 8, color: ['#fff', '#c4b5fd'], speed: 150 })
      }
      setBanner({ key: Date.now(), text: 'BOSS SLAIN!', sub: `+${m.value}` })
      void trackEvent('action_milestone', { game_id: 'dungeon', kind: 'boss', value: w.floor })
    } else {
      sfx.pop()
      haptic.medium()
    }
    run.update(w.stats)
    pushHud()
  }

  function hurtHero(fromX: number, fromY: number) {
    const w = world.current
    const h = w.hero
    if (w.demo || h.inv > 0 || h.roll > 0 || phaseRef.current !== 'play') return
    h.hp -= 1
    w.floorHits += 1
    h.inv = 1.3
    const a = Math.atan2(h.y - fromY, h.x - fromX)
    h.kx += Math.cos(a) * 7
    h.ky += Math.sin(a) * 7
    fx.flash('#ef4444', 0.25)
    fx.shake(10, 0.3)
    fx.stop(0.09)
    fx.burst(px(h.x), py(h.y), { count: 14, color: ['#ef4444', '#fca5a5', '#fff'], speed: 220, shape: 'spark' })
    sfx.hurt()
    haptic.heavy()
    pushHud()
    if (h.hp <= 0) die()
  }

  function roll() {
    const w = world.current
    const h = w.hero
    if (phaseRef.current !== 'play' || h.rollCd > 0 || h.roll > 0 || w.transDir !== 0) return
    const v = moveVec()
    const a = v.mag > 0.1 ? Math.atan2(v.y, v.x) : h.aim
    h.rdx = Math.cos(a)
    h.rdy = Math.sin(a)
    h.roll = 0.26
    h.rollGrazed = false
    h.rollCd = 0.75 * (1 - w.perks.speed * 0.15)
    setRollReady(false)
    fx.burst(px(h.x), py(h.y) + layout().ts * 0.25, { count: 8, color: ['#a8a29e', '#78716c'], speed: 90, size: 4, life: 0.4, gravity: -20 })
    sfx.whoosh()
    haptic.light()
  }

  function moveVec() {
    const v = stick.vec()
    let x = v.x
    let y = v.y
    if (keys.has('a') || keys.has('arrowleft')) x -= 1
    if (keys.has('d') || keys.has('arrowright')) x += 1
    if (keys.has('w') || keys.has('arrowup')) y -= 1
    if (keys.has('s') || keys.has('arrowdown')) y += 1
    const m = Math.hypot(x, y)
    if (m > 1) {
      x /= m
      y /= m
    }
    return { x, y, mag: Math.min(1, m) }
  }

  function openChest() {
    const w = world.current
    const c = w.room.chest
    if (!c || c.open > 0) return
    c.open = 0.01
    fx.burst(px(c.x), py(c.y), { count: 30, color: ['#fde047', '#fbbf24', '#fff'], speed: 260, shape: 'spark' })
    fx.ring(px(c.x), py(c.y), { color: '#fde047', maxR: layout().ts * 2 })
    sfx.power()
    haptic.success()
    const pool = PERKS.filter((p) => w.perks[p.id] < p.max)
    const picks: PerkDef[] = []
    while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    setChoices(picks)
    choicesRef.current = picks
    window.setTimeout(() => {
      if (phaseRef.current === 'play') setPhaseBoth('perk')
    }, 350)
  }

  function choosePerk(p: PerkDef) {
    const w = world.current
    w.perks[p.id] += 1
    w.stats.perks += 1
    if (p.id === 'heart') {
      w.hero.maxHp += 1
      w.hero.hp = w.hero.maxHp
    }
    sfx.levelUp()
    haptic.success()
    setChoices([])
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: p.label.toUpperCase(), sub: `level ${w.perks[p.id]}` })
    run.update(w.stats)
    pushHud()
  }

  function chestSpot() {
    for (const [x, y] of [[4.5, 6.5], [4.5, 5.5], [3.5, 6.5], [5.5, 6.5], [4.5, 7.5], [3.5, 5.5]]) {
      if (!solidAt(x, y)) return { x, y, open: 0 }
    }
    return { x: 4.5, y: 9.5, open: 0 }
  }

  function roomCleared() {
    const w = world.current
    const r = w.room
    r.locked = false
    if (w.demo) return
    w.stats.rooms += 1
    w.score += 50
    w.stats.score = w.score
    if (r.chestAfter) r.chest = chestSpot()
    if (r.boss) {
      r.stairs = true
      floorClear()
    }
    if (!r.boss) setBanner({ key: Date.now(), text: 'ROOM CLEAR', sub: r.chest ? 'a chest appears' : 'the door opens' })
    sfx.clang()
    sfx.score(w.roomIdx)
    haptic.success()
    run.update(w.stats)
    pushHud()
  }

  /** Stars: clear = 1, took 3 hits or fewer on the floor = +1, took at most 1 hit = +1. */
  function floorClear() {
    const w = world.current
    const stars = w.floorHits <= 1 ? 3 : w.floorHits <= 3 ? 2 : 1
    const res = run.completeLevel(w.floor, stars)
    w.levels += 1
    const bonus = w.spec.boss ? 300 : 100
    w.score += bonus
    w.stats.score = w.score
    setBanner({ key: Date.now(), text: w.spec.boss ? 'BOSS FLOOR CLEAR!' : `FLOOR ${w.floor} CLEAR!`, sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${w.floorHits} hits taken · +${bonus}` })
    sfx.win()
    if (res.firstClear && w.floor % 5 === 0) void trackEvent('action_milestone', { game_id: 'dungeon', kind: 'floor', value: w.floor })
  }

  function goNext() {
    const w = world.current
    if (w.transDir !== 0) return
    w.transDir = 1
    w.trans = 0
    sfx.move()
  }

  function advance() {
    const w = world.current
    if (w.room.boss) {
      w.floor += 1
      w.roomIdx = 1
      w.stats.floor = w.floor
      w.spec = levelSpec(w.floor)
      w.floorHits = 0
      w.hero.hp = Math.min(w.hero.maxHp, w.hero.hp + 1)
      enterRoom()
      announceFloor(`${w.spec.hint ?? THEMES[w.spec.theme % THEMES.length].name} · +1 heart`)
      sfx.levelUp()
    } else {
      w.roomIdx += 1
      enterRoom()
    }
    run.update(w.stats)
    pushHud()
  }

  // ── Input ─────────────────────────────────────────────────
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    stick.down(e.pointerId, p.x, p.y)
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = localPoint(e, e.currentTarget)
    stick.move(e.pointerId, p.x, p.y)
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    stick.up(e.pointerId)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const k = e.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault()
      if (k === ' ' || k === 'j') attackQueued.current = true
      else if (k === 'shift' || k === 'k') roll()
      else keys.add(k)
    }
    function up(e: KeyboardEvent) {
      keys.delete(e.key.toLowerCase())
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ── Dev autopilot (level verification) ────────────────────
  /** BFS over free tiles: the centre of the next tile toward (tx, ty). */
  function navStep(tx: number, ty: number) {
    const w = world.current
    const h = w.hero
    const si = Math.floor(h.x)
    const sj = Math.floor(h.y)
    const ti = Math.floor(tx)
    const tj = Math.floor(ty)
    if (si === ti && sj === tj) return { x: tx, y: ty }
    const prev = new Int16Array(COLS * ROWS).fill(-1)
    const q = [sj * COLS + si]
    prev[q[0]] = q[0]
    while (q.length) {
      const c = q.shift()!
      if (c === tj * COLS + ti) break
      const ci = c % COLS
      const cj = (c - ci) / COLS
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = ci + di
        const nj = cj + dj
        if (ni < 0 || nj < 0 || ni >= COLS || nj >= ROWS) continue
        const k = nj * COLS + ni
        if (prev[k] >= 0 || (solidAt(ni + 0.5, nj + 0.5) && k !== tj * COLS + ti)) continue
        prev[k] = c
        q.push(k)
      }
    }
    let c = tj * COLS + ti
    if (prev[c] < 0) return { x: tx, y: ty }
    while (prev[c] !== sj * COLS + si && prev[c] !== c) c = prev[c]
    return { x: (c % COLS) + 0.5, y: Math.floor(c / COLS) + 0.5 }
  }

  function autoMove() {
    const w = world.current
    const h = w.hero
    // Dodge: roll away from shots and telegraphed attacks that cover the hero.
    let threat: { x: number; y: number } | null = null
    for (const s2 of w.shots) if (dist(s2.x, s2.y, h.x, h.y) < 1.3 && (s2.vx * (h.x - s2.x) + s2.vy * (h.y - s2.y)) > 0) threat = { x: s2.x, y: s2.y }
    for (const t of w.telegs) {
      if (t.life > t.max * 0.6) continue
      if (t.kind === 'circle' && t.r >= 1.2 && dist(t.x, t.y, h.x, h.y) < t.r + 0.3) threat = { x: t.x, y: t.y }
      if (t.kind === 'line') {
        const dx = Math.cos(t.a)
        const dy = Math.sin(t.a)
        const along = (h.x - t.x) * dx + (h.y - t.y) * dy
        const off = Math.abs((h.x - t.x) * dy - (h.y - t.y) * dx)
        if (along > 0 && along < t.len && off < Math.max(0.6, t.r + 0.4)) threat = { x: h.x - dy, y: h.y + dx }
      }
    }
    if (threat && h.rollCd <= 0 && h.roll <= 0) {
      const a = Math.atan2(h.y - threat.y, h.x - threat.x)
      h.rdx = Math.cos(a)
      h.rdy = Math.sin(a)
      h.roll = 0.26
      h.rollGrazed = false
      h.rollCd = 0.75 * (1 - w.perks.speed * 0.15)
    }
    let tx = 4.5
    let ty = 0.5
    let near: Mon | null = null
    let best = 99
    for (const m of w.mons) {
      const d = dist(m.x, m.y, h.x, h.y)
      if (d < best) {
        best = d
        near = m
      }
    }
    const r = w.room
    if (near) {
      // Hit and run: close in when the sword is ready, back off while it recovers.
      let ax = 0
      let ay = 0
      for (const m of w.mons) {
        const d = dist(m.x, m.y, h.x, h.y)
        if (d < 2.4 && m.spawnT <= 0) {
          ax += (h.x - m.x) / (d * d + 0.05)
          ay += (h.y - m.y) / (d * d + 0.05)
        }
      }
      const pressed = Math.hypot(ax, ay) > 0.01
      if (pressed && h.rollCd <= 0 && h.roll <= 0 && h.inv <= 0 && best < near.r + 0.55) {
        const a = Math.atan2(ay, ax)
        h.rdx = Math.cos(a)
        h.rdy = Math.sin(a)
        h.roll = 0.26
        h.rollGrazed = false
        h.rollCd = 0.75 * (1 - w.perks.speed * 0.15)
      }
      if (h.swingCd > 0.1 && pressed) {
        const a = Math.atan2(ay, ax)
        return { x: Math.cos(a), y: Math.sin(a), mag: 1 }
      }
      if (best < reach() * 0.8 + near.r) return { x: 0, y: 0, mag: 0 }
      tx = near.x
      ty = near.y
    } else if (r.chest && r.chest.open <= 0) {
      tx = r.chest.x
      ty = r.chest.y
    } else if (r.doorLift < 1) return { x: 0, y: 0, mag: 0 }
    if (solidAt(tx, ty)) {
      // Target hugs an obstacle: walk to the free tile beside it that is closest.
      let bx = tx
      let by = ty
      let bd = 99
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const cx = Math.floor(tx) + di + 0.5
        const cy = Math.floor(ty) + dj + 0.5
        if (solidAt(cx, cy)) continue
        const d = dist(cx, cy, tx, ty)
        if (d < bd) {
          bd = d
          bx = cx
          by = cy
        }
      }
      tx = bx
      ty = by
    }
    const n = navStep(tx, ty)
    const a = Math.atan2(n.y - h.y, n.x - h.x)
    return { x: Math.cos(a), y: Math.sin(a), mag: 1 }
  }

  // ── Monster AI ────────────────────────────────────────────
  function think(m: Mon, dt: number) {
    const w = world.current
    const h = w.hero
    const dx = h.x - m.x
    const dy = h.y - m.y
    const d = Math.hypot(dx, dy) || 1
    const toA = Math.atan2(dy, dx)
    m.timer -= dt
    const enraged = m.boss && m.hp < m.max * 0.5
    switch (m.kind) {
      case 'slime':
      case 'bigslime': {
        if (m.mode === 0) {
          m.look = toA
          if (m.timer <= 0) {
            m.mode = 1
            m.timer = 0.42
            m.ax = Math.cos(toA)
            m.ay = Math.sin(toA)
          }
        } else {
          chase(m, Math.atan2(m.ay, m.ax), m.speed * dt)
          if (m.timer <= 0) {
            m.mode = 0
            m.timer = rand(0.5, 0.9)
          }
        }
        break
      }
      case 'bat': {
        if (m.mode === 2) {
          // retreat after hitting/being hit
          moveEnt(m, -Math.cos(toA) * m.speed * 1.2 * dt, -Math.sin(toA) * m.speed * 1.2 * dt, m.r, true)
          if (m.timer <= 0 || m.timer > 1) m.timer = 0.6
          if (m.timer < 0.05) m.mode = 0
        } else {
          const wob = Math.sin(m.t * 4) * 0.9
          const a = toA + wob
          moveEnt(m, Math.cos(a) * m.speed * dt, Math.sin(a) * m.speed * dt, m.r, true)
        }
        m.look = toA
        break
      }
      case 'archer': {
        m.look = toA
        if (m.mode === 0) {
          let mx = 0
          let my = 0
          if (d < 3.2) {
            mx = -dx / d
            my = -dy / d
          } else if (d > 5.5) {
            mx = dx / d
            my = dy / d
          } else {
            mx = -dy / d * 0.6
            my = dx / d * 0.6
          }
          if (!moveEnt(m, mx * m.speed * dt, my * m.speed * dt, m.r * 0.8)) m.t += 1
          if (m.timer <= 0 && !w.demo) {
            m.mode = 1
            m.timer = 0.75
            w.telegs.push({ kind: 'line', x: m.x, y: m.y, r: 0, a: toA, len: 9, life: 0.75, max: 0.75 })
          }
        } else {
          for (const t of w.telegs) if (t.kind === 'line' && t.life > 0 && dist(t.x, t.y, m.x, m.y) < 0.6) {
            t.x = m.x
            t.y = m.y
            t.a = toA
          }
          if (m.timer <= 0) {
            m.mode = 0
            m.timer = rand(2.0, 2.8) - Math.min(0.8, (w.floor - 1) * 0.15)
            w.shots.push({ x: m.x, y: m.y, vx: Math.cos(toA) * 6.5, vy: Math.sin(toA) * 6.5, life: 3, r: 0.12, kind: 'arrow', grazed: false })
            sfx.shoot()
          }
        }
        m.sx = m.x
        m.sy = m.y
        break
      }
      case 'knight': {
        if (m.mode === 0) {
          m.look = toA
          chase(m, toA, m.speed * dt)
          if (d < 2.3 && m.timer <= 0 && !w.demo) {
            m.mode = 1
            m.timer = 0.65
            m.ax = Math.cos(toA)
            m.ay = Math.sin(toA)
            w.telegs.push({ kind: 'line', x: m.x, y: m.y, r: 0.5, a: toA, len: 2.6, life: 0.65, max: 0.65 })
            sfx.tick()
          }
        } else if (m.mode === 1) {
          if (m.timer <= 0) {
            m.mode = 2
            m.timer = 0.28
            sfx.whoosh()
          }
        } else if (m.mode === 2) {
          moveEnt(m, m.ax * 8 * dt, m.ay * 8 * dt, m.r * 0.8)
          if (d < m.r + 0.45) hurtHero(m.x, m.y)
          if (m.timer <= 0) {
            m.mode = 3
            m.timer = 0.7
          }
        } else if (m.timer <= 0) {
          m.mode = 0
          m.timer = rand(0.8, 1.4)
        }
        break
      }
      case 'kingslime': {
        // mode 0 rest, 1 airborne hop, 2 summon pause
        if (m.mode === 0) {
          m.look = toA
          if (m.timer <= 0) {
            if (m.count >= 3) {
              m.count = 0
              m.mode = 2
              m.timer = 0.8
              const n = enraged ? 3 : 2
              for (let i = 0; i < n; i++) spawnMon('slime', clamp(m.x + rand(-1.5, 1.5), 1.5, COLS - 1.5), clamp(m.y + rand(0.5, 1.5), 1.5, ROWS - 2), 0.6)
              fx.ring(px(m.x), py(m.y), { color: '#c084fc', maxR: layout().ts * 2 })
              sfx.pop()
            } else {
              m.mode = 1
              m.timer = enraged ? 0.6 : 0.8
              m.sx = m.x
              m.sy = m.y
              m.ax = clamp(h.x, 2, COLS - 2)
              m.ay = clamp(h.y, 2, ROWS - 2)
              w.telegs.push({ kind: 'circle', x: m.ax, y: m.ay, r: 1.6, a: 0, len: 0, life: m.timer, max: m.timer })
              m.count += 1
            }
          }
        } else if (m.mode === 1) {
          const dur = enraged ? 0.6 : 0.8
          const k = 1 - Math.max(0, m.timer) / dur
          m.x = m.sx + (m.ax - m.sx) * k
          m.y = m.sy + (m.ay - m.sy) * k
          if (m.timer <= 0) {
            m.mode = 0
            m.timer = enraged ? 0.35 : 0.6
            fx.ring(px(m.x), py(m.y), { color: '#e9d5ff', maxR: layout().ts * 1.8, life: 0.4, width: 5 })
            fx.burst(px(m.x), py(m.y) + layout().ts * 0.6, { count: 18, color: ['#a855f7', '#e9d5ff'], speed: 220, gravity: 300 })
            fx.shake(9, 0.25)
            sfx.thud()
            haptic.medium()
            if (dist(h.x, h.y, m.x, m.y) < 1.7) hurtHero(m.x, m.y)
          }
        } else if (m.timer <= 0) {
          m.mode = 0
          m.timer = 0.5
        }
        break
      }
      case 'bonelord': {
        m.look = toA
        // drift toward a waypoint
        if (dist(m.x, m.y, m.sx, m.sy) < 0.3 || m.sx === m.x) {
          m.sx = rand(2, COLS - 2)
          m.sy = rand(2, 6)
        }
        const wa = Math.atan2(m.sy - m.y, m.sx - m.x)
        if (m.mode === 0) moveEnt(m, Math.cos(wa) * m.speed * dt, Math.sin(wa) * m.speed * dt, m.r, true)
        if (m.mode === 0 && m.timer <= 0) {
          m.mode = 1
          m.timer = 0.75
          m.count += 1
          sfx.tick()
        } else if (m.mode === 1 && m.timer <= 0) {
          const pattern = m.count % 3
          if (pattern === 0) {
            const n = enraged ? 3 : 2
            for (let i = 0; i < n; i++) spawnMon(i % 2 ? 'archer' : 'bat', rand(2, COLS - 2), rand(3, 8), 0.7)
          } else if (pattern === 1) {
            const n = enraged ? 16 : 12
            const off = rand(0, 1)
            for (let i = 0; i < n; i++) {
              const a = ((i + off) / n) * Math.PI * 2
              w.shots.push({ x: m.x, y: m.y, vx: Math.cos(a) * 3.2, vy: Math.sin(a) * 3.2, life: 4, r: 0.16, kind: 'orb', grazed: false })
            }
          } else {
            for (let i = -2; i <= 2; i++) {
              const a = toA + i * 0.22
              w.shots.push({ x: m.x, y: m.y, vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5, life: 4, r: 0.16, kind: 'orb', grazed: false })
            }
          }
          fx.ring(px(m.x), py(m.y), { color: '#c084fc', maxR: layout().ts * 1.4 })
          sfx.boom(0.25)
          m.mode = 0
          m.timer = enraged ? 1.5 : 2.2
        }
        break
      }
      case 'blackknight': {
        // 0 walk, 1 charge windup, 2 charging, 3 spin windup, 4 stunned
        if (m.mode === 0) {
          m.look = toA
          chase(m, toA, m.speed * dt)
          if (m.timer <= 0) {
            m.count += 1
            if (m.count % 2 === 1) {
              m.mode = 1
              m.timer = enraged ? 0.6 : 0.85
              m.ax = Math.cos(toA)
              m.ay = Math.sin(toA)
              w.telegs.push({ kind: 'line', x: m.x, y: m.y, r: 0.7, a: toA, len: 12, life: m.timer, max: m.timer })
            } else {
              m.mode = 3
              m.timer = 0.75
              w.telegs.push({ kind: 'circle', x: m.x, y: m.y, r: 2.0, a: 0, len: 0, life: 0.75, max: 0.75 })
            }
            sfx.tick()
          }
        } else if (m.mode === 1) {
          if (m.timer <= 0) {
            m.mode = 2
            m.timer = 2
            sfx.whoosh()
          }
        } else if (m.mode === 2) {
          const ok = moveEnt(m, m.ax * 9 * dt, m.ay * 9 * dt, m.r * 0.7)
          if (d < m.r + 0.4) hurtHero(m.x, m.y)
          if (!ok || m.timer <= 0) {
            m.mode = 4
            m.timer = enraged ? 1.0 : 1.4
            fx.shake(12, 0.35)
            fx.burst(px(m.x + m.ax * m.r), py(m.y + m.ay * m.r), { count: 20, color: ['#a8a29e', '#fde047'], speed: 240, shape: 'spark' })
            sfx.boom(0.5)
            haptic.medium()
          }
        } else if (m.mode === 3) {
          if (m.timer <= 0) {
            m.mode = 0
            m.timer = enraged ? 1.0 : 1.5
            fx.ring(px(m.x), py(m.y), { color: '#ef4444', maxR: layout().ts * 2, life: 0.3, width: 6 })
            sfx.slash()
            fx.shake(6, 0.2)
            if (d < 2.0) hurtHero(m.x, m.y)
          }
        } else if (m.timer <= 0) {
          m.mode = 0
          m.timer = 1
        }
        break
      }
    }
  }

  // ── Simulation ────────────────────────────────────────────
  function step(dt: number, raw: number) {
    const w = world.current
    const h = w.hero
    const ph = phaseRef.current
    const live = ph === 'play'

    // Room transition fade
    if (w.transDir !== 0) {
      w.trans += raw * 3.2 * w.transDir
      if (w.transDir === 1 && w.trans >= 1) {
        w.trans = 1
        w.transDir = -1
        advance()
      } else if (w.transDir === -1 && w.trans <= 0) {
        w.trans = 0
        w.transDir = 0
      }
    }

    // Hero
    h.inv = Math.max(0, h.inv - dt)
    h.swingCd = Math.max(0, h.swingCd - dt)
    h.swingT = Math.max(0, h.swingT - dt)
    if (h.rollCd > 0) {
      h.rollCd -= dt
      if (h.rollCd <= 0 && !w.demo) setRollReady(true)
    }
    const spd = 3.1 * (1 + w.perks.speed * 0.12)
    let v = { x: 0, y: 0, mag: 0 }
    if (w.demo) {
      let near: Mon | null = null
      let best = 99
      for (const m of w.mons) {
        const dd = dist(m.x, m.y, h.x, h.y)
        if (dd < best) {
          best = dd
          near = m
        }
      }
      if (near && best > 1.0) {
        const a = Math.atan2(near.y - h.y, near.x - h.x)
        v = { x: Math.cos(a) * 0.7, y: Math.sin(a) * 0.7, mag: 0.7 }
      }
      if (w.mons.length === 0) {
        for (let i = 0; i < 3; i++) spawnMon(i === 2 ? 'bat' : 'slime', rand(2, 7), rand(2, 6), 0.8)
      }
    } else if (live && w.transDir === 0) v = auto.current.on ? autoMove() : moveVec()
    if (h.roll > 0) {
      h.roll -= dt
      moveEnt(h, h.rdx * 9.5 * dt, h.rdy * 9.5 * dt, 0.26)
      if (Math.random() < 0.6) fx.burst(px(h.x), py(h.y), { count: 1, color: '#93c5fd', speed: 20, size: 5, life: 0.25, gravity: 0 })
    } else if (v.mag > 0.05) {
      moveEnt(h, v.x * spd * dt, v.y * spd * dt, 0.26)
      h.walk += dt * v.mag
      if (h.swingT <= 0) h.aim = Math.atan2(v.y, v.x)
    }
    if (h.kx || h.ky) {
      moveEnt(h, h.kx * dt, h.ky * dt, 0.26)
      const k = Math.exp(-10 * dt)
      h.kx *= k
      h.ky *= k
      if (Math.abs(h.kx) + Math.abs(h.ky) < 0.05) h.kx = h.ky = 0
    }

    // Auto-swing at the nearest monster in reach
    if ((live || w.demo) && w.transDir === 0) {
      let target: Mon | null = null
      let best = reach() * 1.05
      for (const m of w.mons) {
        if (m.spawnT > 0 || m.hp <= 0) continue
        const dd = dist(m.x, m.y, h.x, h.y) - m.r
        if (dd < best) {
          best = dd
          target = m
        }
      }
      if (attackQueued.current) {
        attackQueued.current = false
        if (!target) {
          for (const m of w.mons) if (m.spawnT <= 0 && dist(m.x, m.y, h.x, h.y) < reach() * 2.2) target = m
        }
        swing(target)
      } else if (target) swing(target)
    }

    // Monsters
    for (const m of w.mons) {
      m.t += dt
      m.flash = Math.max(0, m.flash - dt)
      if (m.spawnT > 0) {
        m.spawnT -= dt
        if (m.spawnT <= 0) fx.burst(px(m.x), py(m.y), { count: 10, color: ['#c084fc', '#f0abfc'], speed: 140 })
        continue
      }
      if (live || w.demo) think(m, dt)
      if (m.kx || m.ky) {
        moveEnt(m, m.kx * dt, m.ky * dt, m.r * 0.8, m.fly)
        const k = Math.exp(-9 * dt)
        m.kx *= k
        m.ky *= k
      }
      if (live && !(m.kind === 'archer' || m.kind === 'bonelord') && !(m.kind === 'kingslime' && m.mode === 1)) {
        if (dist(m.x, m.y, h.x, h.y) < m.r + 0.24) {
          hurtHero(m.x, m.y)
          if (m.kind === 'bat') m.mode = 2
        }
      }
    }
    // Soft separation
    const ms = w.mons
    for (let i = 0; i < ms.length; i++) {
      for (let j = i + 1; j < ms.length; j++) {
        const a = ms[i]
        const b = ms[j]
        const ddx = b.x - a.x
        const ddy = b.y - a.y
        const min = (a.r + b.r) * 0.9
        const d2 = ddx * ddx + ddy * ddy
        if (d2 > 0.0001 && d2 < min * min) {
          const d = Math.sqrt(d2)
          const push = (min - d) / 2
          const wa = a.boss ? 0.05 : 1
          const wb = b.boss ? 0.05 : 1
          moveEnt(a, (-ddx / d) * push * wa, (-ddy / d) * push * wa, a.r * 0.8, a.fly)
          moveEnt(b, (ddx / d) * push * wb, (ddy / d) * push * wb, b.r * 0.8, b.fly)
        }
      }
    }
    w.mons = w.mons.filter((m) => m.hp > 0)

    // Shots
    for (const s of w.shots) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.life -= dt
      if (solidAt(s.x, s.y)) {
        s.life = 0
        fx.burst(px(s.x), py(s.y), { count: 4, color: s.kind === 'orb' ? '#c084fc' : '#d6d3d1', speed: 80, size: 2 })
        continue
      }
      const d = dist(s.x, s.y, h.x, h.y)
      if (live && d < s.r + 0.22) {
        if (h.roll > 0 || h.inv > 0) {
          if (h.roll > 0 && !h.rollGrazed) {
            h.rollGrazed = true
            w.score += 25
            fx.text(px(h.x), py(h.y) - layout().ts, 'DODGE! +25', '#7dd3fc', 15)
            sfx.score(3)
          }
          continue
        }
        s.life = 0
        hurtHero(s.x, s.y)
      }
    }
    w.shots = w.shots.filter((s) => s.life > 0)

    // Player waves
    for (const wv of w.waves) {
      wv.x += wv.vx * dt
      wv.y += wv.vy * dt
      wv.life -= dt
      if (solidAt(wv.x, wv.y)) wv.life = 0
      for (const m of w.mons) {
        if (m.hp <= 0 || m.spawnT > 0 || wv.hits.has(m.id)) continue
        if (dist(m.x, m.y, wv.x, wv.y) < m.r + 0.3) {
          wv.hits.add(m.id)
          hitMon(m, wv.dmg, Math.atan2(wv.vy, wv.vx))
        }
      }
    }
    w.waves = w.waves.filter((x) => x.life > 0)
    w.mons = w.mons.filter((m) => m.hp > 0)
    for (const t of w.telegs) t.life -= dt
    w.telegs = w.telegs.filter((t) => t.life > 0)

    // Room state
    const r = w.room
    if (w.demo) return
    if (live && r.locked && w.mons.length === 0) {
      if (r.waves.length) {
        spawnWave()
        setBanner({ key: Date.now(), text: 'MORE INCOMING!' })
        sfx.ready()
      } else roomCleared()
    }
    if (!r.locked && r.doorLift < 1) {
      r.doorLift = Math.min(1, r.doorLift + raw * 2)
      if (r.doorLift >= 1) sfx.thud()
    }
    if (r.chest) {
      if (r.chest.open > 0) r.chest.open = Math.min(1, r.chest.open + raw * 3)
      else if (live && dist(h.x, h.y, r.chest.x, r.chest.y) < 0.75) openChest()
    }
    if (live && r.doorLift >= 1 && h.y < 1.05 && Math.abs(h.x - 4.5) < 0.6) goNext()
    if (live && boss) {
      const b = w.mons.find((m) => m.boss)
      if (b && Math.abs(b.hp / b.max - boss.pct) > 0.01) setBoss({ pct: b.hp / b.max, name: boss.name })
    }
  }

  // ── Render ────────────────────────────────────────────────
  function frame({ ctx, w: W, h: H, raw, t: time }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const ph = phaseRef.current
    const dt = ph === 'perk' ? 0 : fx.step(raw)
    if (ph === 'perk') fx.step(0)
    if (ph === 'perk' && auto.current.on && choicesRef.current.length) {
      const pick = choicesRef.current[0]
      choicesRef.current = []
      choosePerk(pick)
    }
    if (ph === 'idle' || ph === 'play' || ph === 'dying') for (let k = 0; k < auto.current.turbo; k++) step(dt, raw)
    const { ts, ox, oy } = layout()
    const theme = THEMES[w.room.theme]
    const h = w.hero

    const key = `${W}x${H}:${w.room.id}:${ts}`
    if (roomCache.current.key !== key) {
      const c = roomCache.current.canvas ?? document.createElement('canvas')
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      c.width = Math.round(W * dpr)
      c.height = Math.round(H * dpr)
      const g = c.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintRoom(g, w.room.solid, theme, W, H, ts, ox, oy, w.room.seed)
      roomCache.current = { key, canvas: c }
    }
    fx.applyShake(ctx)
    ctx.drawImage(roomCache.current.canvas!, 0, 0, W, H)
    const X = (x: number) => ox + x * ts
    const Y = (y: number) => oy + y * ts

    // Decals
    for (const d of w.decals) {
      ctx.globalAlpha = 0.35
      ctx.fillStyle = d.color
      ctx.beginPath()
      ctx.ellipse(X(d.x), Y(d.y) + ts * 0.2, d.r * ts, d.r * ts * 0.5, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Door bars / stairs
    if (w.room.stairs && w.room.doorLift > 0) drawStairs(ctx, X(4.5), Y(0.5), ts, time)
    else drawBars(ctx, X(4), Y(0), ts, w.room.doorLift)
    for (let i = 0; i < TORCHES.length; i++) drawTorch(ctx, X(TORCHES[i][0]), Y(TORCHES[i][1]), ts, time, i)

    if (w.room.chest) drawChest(ctx, X(w.room.chest.x), Y(w.room.chest.y), ts, w.room.chest.open, time)

    // Telegraphs on the floor
    for (const t of w.telegs) {
      const k = 1 - t.life / t.max
      if (t.kind === 'circle') {
        const spawn = t.r < 1.2
        ctx.globalAlpha = 0.25 + k * 0.35
        ctx.fillStyle = spawn ? '#a855f7' : '#ef4444'
        ctx.beginPath()
        ctx.arc(X(t.x), Y(t.y), t.r * ts * (spawn ? 1 : k), 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 0.8
        ctx.strokeStyle = spawn ? '#e9d5ff' : '#fca5a5'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(X(t.x), Y(t.y), t.r * ts, 0, Math.PI * 2)
        ctx.stroke()
      } else {
        ctx.save()
        ctx.translate(X(t.x), Y(t.y))
        ctx.rotate(t.a)
        ctx.globalAlpha = 0.2 + k * 0.4
        ctx.fillStyle = '#ef4444'
        const wdt = Math.max(0.08, t.r) * ts
        ctx.fillRect(0, -wdt / 2, t.len * ts, wdt)
        ctx.globalAlpha = 0.9
        ctx.fillStyle = '#fca5a5'
        ctx.fillRect(0, -1, t.len * ts * k, 2)
        ctx.restore()
      }
      ctx.globalAlpha = 1
    }

    // Entities sorted by y
    const ents: { y: number; draw: () => void }[] = []
    for (const m of w.mons) {
      if (m.spawnT > 0) continue
      ents.push({
        y: m.y + (m.fly ? 0.5 : 0),
        draw: () => {
          let state = 0
          if (m.kind === 'slime' || m.kind === 'bigslime') state = m.mode === 1 ? Math.sin((1 - m.timer / 0.42) * Math.PI) * 0.5 : 0
          else if (m.kind === 'kingslime') state = m.mode === 1 ? Math.sin((1 - Math.max(0, m.timer) / (m.hp < m.max * 0.5 ? 0.6 : 0.8)) * Math.PI) * 1.2 : 0
          else if (m.kind === 'archer') state = m.mode === 1 ? 1 - m.timer / 0.75 : 0
          else if (m.kind === 'bonelord') state = m.mode === 1 ? 1 : 0
          else if (m.kind === 'knight') state = m.mode === 1 ? 1 : m.mode === 2 ? 2 : 0
          else if (m.kind === 'blackknight') state = m.mode === 1 || m.mode === 3 ? 1 : m.mode === 2 ? 2 : 0
          drawMonster(ctx, m.kind, X(m.x), Y(m.y), ts * 1.15, m.t, m.look, m.flash > 0, state, m.hue)
          if (m.kind === 'blackknight' && m.mode === 4) {
            for (let i = 0; i < 3; i++) {
              const a = time * 5 + (i / 3) * Math.PI * 2
              ctx.fillStyle = '#fde047'
              ctx.beginPath()
              ctx.arc(X(m.x) + Math.cos(a) * ts * 0.5, Y(m.y) - ts * 1.1 + Math.sin(a) * ts * 0.15, 3, 0, Math.PI * 2)
              ctx.fill()
            }
          }
          if (!m.boss && m.hp < m.max) {
            const bw = ts * m.r * 2
            const by = Y(m.y) - ts * (m.r + 0.45)
            ctx.fillStyle = 'rgba(0,0,0,0.6)'
            ctx.fillRect(X(m.x) - bw / 2, by, bw, 4)
            ctx.fillStyle = '#ef4444'
            ctx.fillRect(X(m.x) - bw / 2 + 0.5, by + 0.5, (bw - 1) * Math.max(0, m.hp / m.max), 3)
          }
        },
      })
    }
    const showHero = ph !== 'over' || h.hp > 0
    if (showHero) {
      ents.push({
        y: h.y,
        draw: () => {
          if (h.inv > 0 && Math.floor(time * 16) % 2 === 0 && h.roll <= 0) return
          const sk = h.swingT > 0 ? 1 - h.swingT / 0.2 : 0
          drawHero(ctx, X(h.x), Y(h.y), ts * 1.2, h.aim, h.walk, sk, h.spin, false, h.roll > 0 ? 1 - h.roll / 0.26 : 0)
        },
      })
    }
    ents.sort((a, b) => a.y - b.y)
    for (const e of ents) e.draw()

    if (h.swingT > 0) drawSwingArc(ctx, X(h.x), Y(h.y), reach() * ts * (h.spin ? 1.15 : 1), h.aim, h.swingT / 0.2, h.spin)

    // Waves and shots
    for (const wv of w.waves) {
      const a = Math.atan2(wv.vy, wv.vx)
      ctx.save()
      ctx.translate(X(wv.x), Y(wv.y))
      ctx.rotate(a)
      ctx.globalAlpha = Math.min(1, wv.life * 4)
      ctx.fillStyle = '#bae6fd'
      ctx.beginPath()
      ctx.arc(0, 0, ts * 0.45, -1.1, 1.1)
      ctx.arc(-ts * 0.15, 0, ts * 0.38, 1.0, -1.0, true)
      ctx.fill()
      ctx.restore()
    }
    ctx.globalAlpha = 1
    for (const s of w.shots) {
      if (s.kind === 'arrow') {
        const a = Math.atan2(s.vy, s.vx)
        ctx.save()
        ctx.translate(X(s.x), Y(s.y))
        ctx.rotate(a)
        ctx.strokeStyle = '#d6d3d1'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-ts * 0.3, 0)
        ctx.lineTo(ts * 0.15, 0)
        ctx.stroke()
        ctx.fillStyle = '#f87171'
        ctx.beginPath()
        ctx.moveTo(ts * 0.25, 0)
        ctx.lineTo(ts * 0.12, -4)
        ctx.lineTo(ts * 0.12, 4)
        ctx.fill()
        ctx.restore()
      } else {
        glow(ctx, X(s.x), Y(s.y), ts * 0.4, '#c084fc', 0.7)
        ctx.fillStyle = '#f5d0fe'
        ctx.beginPath()
        ctx.arc(X(s.x), Y(s.y), ts * s.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Lighting: darkness with holes around torches and the hero.
    let lc = lightRef.current
    const lw = Math.ceil(W / 2)
    const lh = Math.ceil(H / 2)
    if (!lc) {
      lc = document.createElement('canvas')
      lightRef.current = lc
    }
    if (lc.width !== lw || lc.height !== lh) {
      lc.width = lw
      lc.height = lh
    }
    const l = lc.getContext('2d')!
    l.globalCompositeOperation = 'source-over'
    l.clearRect(0, 0, lw, lh)
    l.fillStyle = `${theme.dark}${Math.min(0.84, 0.7 + w.floor * 0.03)})`
    l.fillRect(0, 0, lw, lh)
    l.globalCompositeOperation = 'destination-out'
    const hole = (x: number, y: number, r: number, a = 1) => {
      const g = l.createRadialGradient(x / 2, y / 2, 0, x / 2, y / 2, r / 2)
      g.addColorStop(0, `rgba(0,0,0,${a})`)
      g.addColorStop(0.55, `rgba(0,0,0,${a * 0.75})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      l.fillStyle = g
      l.beginPath()
      l.arc(x / 2, y / 2, r / 2, 0, Math.PI * 2)
      l.fill()
    }
    hole(X(h.x), Y(h.y), ts * 3.6)
    for (let i = 0; i < TORCHES.length; i++) {
      const f = 1 + Math.sin(time * 9 + i * 3) * 0.06
      hole(X(TORCHES[i][0]), Y(TORCHES[i][1]), ts * 2.8 * f, 0.95)
    }
    if (w.room.chest) hole(X(w.room.chest.x), Y(w.room.chest.y), ts * 2, 0.8)
    for (const s of w.shots) if (s.kind === 'orb') hole(X(s.x), Y(s.y), ts * 1.2, 0.6)
    ctx.drawImage(lc, 0, 0, W, H)
    for (let i = 0; i < TORCHES.length; i++) glow(ctx, X(TORCHES[i][0]), Y(TORCHES[i][1]) - ts * 0.2, ts * 1.1, '#fb923c', 0.22)

    // Danger telegraph lines stay readable above darkness.
    for (const t of w.telegs) {
      if (t.kind !== 'line') continue
      ctx.save()
      ctx.translate(X(t.x), Y(t.y))
      ctx.rotate(t.a)
      ctx.globalAlpha = 0.6
      ctx.strokeStyle = '#f87171'
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 6])
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(t.len * ts, 0)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
    ctx.globalAlpha = 1

    fx.draw(ctx)
    ctx.restore()
    if (ph === 'play') stick.draw(ctx)
    if (w.trans > 0) {
      ctx.fillStyle = `rgba(0,0,0,${w.trans})`
      ctx.fillRect(0, 0, W, H)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  // Dev-only probes: autopilot + time skip for scripted floor verification.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__dungeonAuto = (on: boolean, speed = 3) => {
      auto.current = { on, turbo: on ? speed : 1 }
    }
    win.__dungeonState = () => {
      const w = world.current
      return { floor: w.floor, room: w.roomIdx, rooms: w.spec.rooms.length, hp: w.hero.hp, max: w.hero.maxHp, hits: w.floorHits, mons: w.mons.length, phase: phaseRef.current, hero: [w.hero.x, w.hero.y].map((v) => +v.toFixed(2)), m: w.mons.map((m) => [m.kind, +m.x.toFixed(2), +m.y.toFixed(2), m.hp, +m.spawnT.toFixed(2)]), cd: +w.hero.swingCd.toFixed(2) }
    }
    return () => {
      delete win.__dungeonAuto
      delete win.__dungeonState
    }
  }, [])

  const hearts = []
  for (let i = 0; i < hud.max; i++) hearts.push(<i key={i} className={`dd-heart${i < hud.hp ? '' : ' is-empty'}`} />)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div
          className="action-arena dd-arena"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Floor {hud.floor} · Room {hud.room}/{hud.rooms}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="dd-hearts">{hearts}</span>
              </div>
            </div>
          )}
          {boss && phase === 'play' ? (
            <div className="dd-bossbar" aria-label="Boss health">
              <b>{boss.name}</b>
              <div>
                <span style={{ width: `${Math.round(boss.pct * 100)}%` }} />
              </div>
            </div>
          ) : null}
          {phase === 'play' && (
            <div className="dd-btns">
              <button
                type="button"
                className={`action-btn dd-btn${rollReady ? '' : ' is-cool'}`}
                aria-label="Dodge roll"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  roll()
                }}
              >
                <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
                  <path d="M6 22 Q10 8 24 9" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
                  <path d="M20 4 L26 9 L20 13" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M5 27 H17" stroke="#93c5fd" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                className="action-btn dd-btn dd-btn--atk"
                aria-label="Attack"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  attackQueued.current = true
                }}
              >
                <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
                  <path d="M24 4 L28 4 L28 8 L13 23 L9 19 Z" fill="#e2e8f0" />
                  <path d="M7 17 L15 25" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" />
                  <path d="M10 22 L5 27" stroke="#92400e" strokeWidth="3.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'perk' && (
            <div className="dd-perk" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Treasure!</h3>
              <p>Choose one blessing</p>
              <div className="dd-perk__list">
                {choices.map((p) => (
                  <button key={p.id} type="button" className="dd-perk__card" onClick={() => choosePerk(p)}>
                    <span className="dd-perk__icon">
                      <PerkIcon id={p.id} />
                    </span>
                    <strong>
                      {p.label}
                      {world.current.perks[p.id] > 0 ? <em> Lv {world.current.perks[p.id] + 1}</em> : null}
                    </strong>
                    <span>{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === 'idle' && (
            <ActionIdle
              game="dungeon"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to move — your sword swings at anything close. Roll through attacks and clear every room to beat the floor. Bosses wait on every 5th floor."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={world.current.levels > 0 ? 'Deep delver!' : 'Fallen in the dark'}
            subtitle={`Score ${hud.score} · Floor ${hud.floor} · Room ${hud.room}`}
            celebrate={world.current.levels > 0}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
