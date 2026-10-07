import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import {
  BOSS_EYES,
  BOSS_SIZE,
  VSIZE,
  barrelSprite,
  barrierSprite,
  beamSprite,
  blit,
  bossSprite,
  coinSprite,
  coneSprite,
  crateSprite,
  glowSprite,
  oilSprite,
  pickupSprite,
  rockSprite,
  vehicleSprite,
  type PickKind,
  type VKind,
} from './art'
import '../../shared/action/action.css'
import './racer.css'

const meta = getGame('racer')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type EventKind = 'convoy' | 'construction' | 'oil' | 'police'

const PXM = 14
const LANES = 4
const BEST_KEY = 'todaypuzzle.racer.bestDist'

type Vehicle = {
  kind: VKind
  color: string
  x: number
  y: number
  w: number
  h: number
  speed: number
  lane: number
  tx: number
  blink: number
  blinkT: number
  thinkT: number
  side: number
  passed: boolean
  knocked: boolean
  vx: number
  vy: number
  rot: number
  vr: number
  life: number
  police: boolean
  parked: boolean
  wrong: boolean
}

type ObKind = 'cone' | 'barrier' | 'oil' | 'arrow' | 'gap' | 'rock' | 'barrel' | 'crate'
type Obstacle = {
  kind: ObKind
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  rot: number
  vr: number
  knocked: boolean
  rowEnd?: boolean
  /** fraction of road scroll applied (rolling hazards drift slower than the road) */
  slide?: number
  ph?: number
  v?: number
}
type Pickup = { kind: PickKind | 'coin'; x: number; y: number; taken: boolean; t: number }
type Warn = { lane: number; t: number }

// Late-run hazards, each telegraphed before it spawns.
type HzKind = 'rock' | 'wrong' | 'barrel'
type Hz = { kind: HzKind; lane: number; side: number; t: number; t0: number; beep: number }
const HZ_ORDER: HzKind[] = ['rock', 'wrong', 'barrel']
const HZ_UNLOCK: Record<HzKind, number> = { rock: 2200, wrong: 4600, barrel: 6600 }
const HZ_LABEL: Record<HzKind, [string, string]> = {
  rock: ['ROCKFALL', 'red targets mark where they land'],
  wrong: ['WRONG WAY', 'headlights ahead · change lanes!'],
  barrel: ['BARRELS', 'time your pass across the road'],
}

type Boss = {
  x: number
  y: number
  lane: number
  hp: number
  state: 'enter' | 'fight' | 'leave' | 'dead'
  t: number
  time: number
  moveT: number
  blink: number
  dropT: number
  warnLane: number
  warnT: number
  hitT: number
  empT: number
}
const BOSS_FIRST = 3500
const BOSS_EVERY = 4500
const BOSS_HP = 3

type Amb = { x: number; y: number; s: number; ph: number }
type Zap = { x0: number; y0: number; x1: number; y1: number; t: number }

type Biome = {
  name: string
  night: boolean
  side: string
  side2: string
  road: string
  edge: string
  edge2: string
  dash: string
  props: 'city' | 'desert' | 'docks' | 'forest' | 'snow' | 'coast' | 'volcano'
  cols: string[]
  lights: string[]
  tint?: string
  amb?: 'snow' | 'rain' | 'ember'
}

const BIOMES: Biome[] = [
  { name: 'Neon City', night: true, side: '#0b0820', side2: '#140f30', road: '#17182b', edge: '#f0abfc', edge2: '#22d3ee', dash: 'rgba(226,232,240,0.5)', props: 'city', cols: ['#1e1b4b', '#2e1065', '#172554'], lights: ['#f472b6', '#22d3ee', '#a78bfa', '#facc15'] },
  { name: 'Sunset Strip', night: false, side: '#3b1530', side2: '#4c1d3d', road: '#2b2235', edge: '#fb923c', edge2: '#f472b6', dash: 'rgba(254,215,170,0.6)', props: 'city', cols: ['#581c45', '#6b2149', '#7c2d4a'], lights: ['#fdba74', '#fde68a', '#fb7185'], tint: 'rgba(251,146,60,0.10)' },
  { name: 'Desert Run', night: false, side: '#d19a55', side2: '#c08443', road: '#4a4d57', edge: '#fde047', edge2: '#f8fafc', dash: 'rgba(248,250,252,0.75)', props: 'desert', cols: ['#9a5b2c', '#7c4a24', '#b06c36'], lights: ['#4d7c0f', '#65a30d'] },
  { name: 'Midnight Docks', night: true, side: '#05131d', side2: '#0a1d2b', road: '#111c27', edge: '#38bdf8', edge2: '#34d399', dash: 'rgba(186,230,253,0.5)', props: 'docks', cols: ['#0f766e', '#b45309', '#1d4ed8', '#be123c'], lights: ['#fde68a', '#7dd3fc'] },
  { name: 'Pine Pass', night: false, side: '#1f4d2b', side2: '#245a32', road: '#3a3f47', edge: '#f8fafc', edge2: '#fde047', dash: 'rgba(248,250,252,0.7)', props: 'forest', cols: ['#14532d', '#166534', '#15803d'], lights: ['#bbf7d0'] },
  // Late-run biomes (5 km+)
  { name: 'Frost Highway', night: false, side: '#dbe7f3', side2: '#c3d4e6', road: '#46505e', edge: '#e0f2fe', edge2: '#7dd3fc', dash: 'rgba(255,255,255,0.75)', props: 'snow', cols: ['#14532d', '#1e3a2f', '#166534'], lights: ['#ffffff'], tint: 'rgba(186,230,253,0.08)', amb: 'snow' },
  { name: 'Storm Coast', night: true, side: '#161e25', side2: '#0b2a3d', road: '#141c25', edge: '#7dd3fc', edge2: '#fde68a', dash: 'rgba(226,232,240,0.5)', props: 'coast', cols: ['#2a333d', '#343f4a', '#1f272f'], lights: ['#fde68a'], tint: 'rgba(56,189,248,0.06)', amb: 'rain' },
  { name: 'Volcano Pass', night: true, side: '#1a0e0c', side2: '#2a1510', road: '#211a1a', edge: '#fb923c', edge2: '#ef4444', dash: 'rgba(254,215,170,0.45)', props: 'volcano', cols: ['#2c1b16', '#38221c', '#221512'], lights: ['#f97316', '#fde047'], tint: 'rgba(239,68,68,0.07)', amb: 'ember' },
]

const CAR_COLORS = ['#ef4444', '#3b82f6', '#a3e635', '#f59e0b', '#e2e8f0', '#8b5cf6', '#14b8a6', '#f43f5e', '#64748b']
const BIG_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ea580c', '#7c3aed']

const UNLOCK: Record<EventKind, number> = { convoy: 350, construction: 750, oil: 1150, police: 1550 }
const EVENT_LABEL: Record<EventKind, [string, string]> = {
  convoy: ['HEAVY TRAFFIC', 'trucks change lanes — watch blinkers'],
  construction: ['ROAD WORKS', 'lanes closing ahead'],
  oil: ['OIL SPILL', 'slicks make you spin'],
  police: ['POLICE CHASE', 'dodge the cruisers · find the gap'],
}

type Player = {
  x: number
  tx: number
  vx: number
  w: number
  h: number
  shields: number
  inv: number
  spin: number
  spinDir: number
  slow: number
  nitro: number
  nitroT: number
  magnetT: number
  rot: number
}

type World = {
  p: Player
  vehicles: Vehicle[]
  obs: Obstacle[]
  picks: Pickup[]
  warns: Warn[]
  d: number
  speed: number
  scroll: number
  spawnT: number
  coinD: number
  pickD: number
  biome: number
  ev: EventKind | null
  evLeft: number
  evT: number
  evData: { closed: number[]; coneD: number; barD: number; startD: number; gap: number; blockSpawned: boolean; pursueT: number }
  nextEv: number
  seen: Set<EventKind>
  combo: number
  comboT: number
  bonus: number
  milestone: number
  lastTrack: number
  bestDist: number
  bestPassed: boolean
  hudT: number
  ghost: { x: number; y: number; rot: number }[]
  hz: Hz[]
  hzD: number
  hzSeen: Set<HzKind>
  boss: Boss | null
  nextBoss: number
  bossN: number
  amb: Amb[]
  boltT: number
  bolt: { t: number; pts: number[] }
  zaps: Zap[]
  stats: { score: number; distance: number; nearmiss: number; coins: number; police: number; nitros: number; bosses: number }
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function freshWorld(W: number): World {
  return {
    p: { x: W / 2, tx: W / 2, vx: 0, w: VSIZE.player[0], h: VSIZE.player[1], shields: 1, inv: 0, spin: 0, spinDir: 1, slow: 1, nitro: 0, nitroT: 0, magnetT: 0, rot: 0 },
    vehicles: [],
    obs: [],
    picks: [],
    warns: [],
    d: 0,
    speed: 22,
    scroll: 0,
    spawnT: 1,
    coinD: 60,
    pickD: 260,
    biome: 0,
    ev: null,
    evLeft: 0,
    evT: 0,
    evData: { closed: [], coneD: 0, barD: 0, startD: 0, gap: 0, blockSpawned: false, pursueT: 0 },
    nextEv: UNLOCK.convoy,
    seen: new Set(),
    combo: 0,
    comboT: 0,
    bonus: 0,
    milestone: 500,
    lastTrack: 0,
    bestDist: readBest(),
    bestPassed: false,
    hudT: 0,
    ghost: [],
    hz: [],
    hzD: HZ_UNLOCK.rock,
    hzSeen: new Set(),
    boss: null,
    nextBoss: BOSS_FIRST,
    bossN: 0,
    amb: Array.from({ length: 64 }, () => ({ x: Math.random() * W, y: Math.random() * 800, s: Math.random(), ph: Math.random() * 6.28 })),
    boltT: 3,
    bolt: { t: 0, pts: [] },
    zaps: [],
    stats: { score: 0, distance: 0, nearmiss: 0, coins: 0, police: 0, nitros: 0, bosses: 0 },
  }
}

function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export default function RacerGame() {
  const run = useActionRun('racer')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 620 })
  const world = useRef<World>(freshWorld(360))
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ id: number; x0: number; tx0: number } | null>(null)
  const keys = useRef({ left: false, right: false })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, dist: 0, kmh: 0, shields: 1, nitro: 0, on: false, combo: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const roadW = Math.min(W - 40, 360)
    const laneW = roadW / LANES
    const left = W / 2 - roadW / 2
    return { W, H, roadW, laneW, left, right: left + roadW, py: H * 0.76 }
  }

  function laneX(i: number) {
    const g = geo()
    return g.left + g.laneW * (i + 0.5)
  }

  function laneOf(x: number) {
    const g = geo()
    return clamp(Math.floor((x - g.left) / g.laneW), 0, LANES - 1)
  }

  function start() {
    void unlockAudio()
    const w = freshWorld(size.current.w)
    w.p.shields = 1 + run.level('armor')
    w.p.nitro = Math.min(1, run.level('turbo') * 0.3)
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    say('GO!', 'drag to steer · near misses fill nitro')
    sfx.ready()
    pushHud()
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.stats.score, dist: Math.floor(w.d), kmh: Math.round(w.speed * 4.2), shields: w.p.shields, nitro: w.p.nitro, on: w.p.nitroT > 0, combo: w.combo })
  }

  function score() {
    const w = world.current
    w.stats.score = Math.floor(w.d) + w.bonus
    w.stats.distance = Math.floor(w.d)
    return w.stats.score
  }

  function nitroDuration() {
    return 3.2 * (1 + run.level('turbo') * 0.15)
  }

  function fireNitro() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.p.nitroT > 0 || w.p.nitro < 0.25) return
    w.p.nitroT = nitroDuration() * w.p.nitro
    w.p.nitro = 0
    w.stats.nitros += 1
    run.update(w.stats)
    fx.shake(6, 0.3)
    fx.flash('#22d3ee', 0.18)
    fx.ring(w.p.x, geo().py, { color: '#22d3ee', maxR: 90, life: 0.45, width: 5 })
    sfx.whoosh()
    sfx.power()
    haptic.medium()
    say('NITRO!')
    pushHud()
  }

  function makeVehicle(kind: VKind, lane: number, y: number, speed: number): Vehicle {
    const [vw, vh] = VSIZE[kind]
    const color = kind === 'taxi' ? '#facc15' : kind === 'police' ? '#111827' : kind === 'truck' || kind === 'bus' ? BIG_COLORS[Math.floor(Math.random() * BIG_COLORS.length)] : CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
    const x = laneX(lane)
    return { kind, color, x, y, w: vw, h: vh, speed, lane, tx: x, blink: 0, blinkT: 0, thinkT: rand(1, 3), side: -1, passed: false, knocked: false, vx: 0, vy: 0, rot: 0, vr: 0, life: 1.4, police: kind === 'police', parked: false, wrong: kind === 'wrong' }
  }

  function laneFree(lane: number, y: number, gap: number, ignore?: Vehicle) {
    const w = world.current
    const x = laneX(lane)
    for (const v of w.vehicles) {
      if (v === ignore || v.knocked) continue
      if (Math.abs(v.x - x) < 30 && Math.abs(v.y - y) < gap + v.h / 2) return false
      if (Math.abs(v.tx - x) < 30 && Math.abs(v.y - y) < gap + v.h / 2) return false
    }
    for (const o of w.obs) {
      if ((o.kind === 'barrier' || o.kind === 'oil' || o.kind === 'rock' || o.kind === 'crate') && Math.abs(o.x - x) < 40 && Math.abs(o.y - y) < gap) return false
    }
    return true
  }

  function spawnTraffic() {
    const w = world.current
    const d = w.d
    const closed = w.ev === 'construction' ? w.evData.closed : []
    const bl: number[] = w.boss && w.boss.state !== 'dead' ? [w.boss.lane, laneOf(w.boss.x)] : []
    for (const h of w.hz) if (h.kind === 'wrong') bl.push(h.lane)
    const open = [0, 1, 2, 3].filter((l) => !closed.includes(l) && !bl.includes(l))
    // Keep at least one lane clear in the upcoming band.
    const busy = new Set<number>()
    for (const v of w.vehicles) if (!v.knocked && v.y < 140 && v.y > -360) busy.add(laneOf(v.x))
    const cand = open.filter((l) => !busy.has(l))
    if (cand.length <= 1 || busy.size + closed.length >= 3) return
    const lane = cand[Math.floor(Math.random() * cand.length)]
    const r = Math.random()
    const heavy = w.ev === 'convoy' ? 0.55 : d < 300 ? 0.05 : 0.18
    let kind: VKind = 'car'
    if (r < heavy) kind = Math.random() < 0.55 ? 'truck' : 'bus'
    else if (r < heavy + 0.12) kind = 'van'
    else if (r < heavy + 0.22) kind = 'taxi'
    else if (r < heavy + 0.32 && d > 500) kind = 'sport'
    const [, vh] = VSIZE[kind]
    if (!laneFree(lane, -vh / 2 - 20, 110)) return
    const base = w.speed
    const sp = kind === 'truck' || kind === 'bus' ? base * rand(0.38, 0.48) : kind === 'sport' ? base * rand(0.62, 0.72) : base * rand(0.45, 0.6)
    const v = makeVehicle(kind, lane, -vh / 2 - 20, sp)
    v.thinkT = rand(0.6, 2.5)
    w.vehicles.push(v)
  }

  function startEvent(kind: EventKind) {
    const w = world.current
    const fresh = !w.seen.has(kind)
    w.seen.add(kind)
    w.ev = kind
    w.evT = 0
    w.evData = { closed: [], coneD: 0, barD: 60, startD: w.d, gap: 0, blockSpawned: false, pursueT: 2.5 }
    if (kind === 'convoy') w.evLeft = 380
    else if (kind === 'oil') w.evLeft = 320
    else if (kind === 'construction') {
      w.evLeft = 420
      const two = w.d > 2200 && Math.random() < 0.5
      const leftSide = Math.random() < 0.5
      w.evData.closed = two ? (leftSide ? [0, 1] : [2, 3]) : leftSide ? [0] : [3]
      // Painted warning chevrons first, then cones.
      for (const l of w.evData.closed) w.obs.push({ kind: 'arrow', x: laneX(l), y: -80, w: 40, h: 60, vx: 0, vy: 0, rot: 0, vr: 0, knocked: false })
      for (const v of w.vehicles) {
        if (!v.knocked && v.y < geo().py - 100 && w.evData.closed.includes(laneOf(v.tx))) {
          const target = w.evData.closed.includes(0) ? Math.max(...w.evData.closed) + 1 : Math.min(...w.evData.closed) - 1
          v.lane = target
          v.blink = target > laneOf(v.x) ? 1 : -1
          v.blinkT = 0.8
        }
      }
    } else if (kind === 'police') w.evLeft = 99999
    const [title, sub] = EVENT_LABEL[kind]
    say(fresh ? `NEW: ${title}` : title, sub)
    if (kind === 'police') {
      sfx.boom(0.3)
      fx.flash('#3b82f6', 0.2)
    } else sfx.levelUp()
    haptic.medium()
  }

  function endEvent() {
    const w = world.current
    w.ev = null
    w.nextEv = w.d + rand(240, 380)
  }

  function chooseEvent() {
    const w = world.current
    const order: EventKind[] = ['convoy', 'construction', 'oil', 'police']
    const unlocked = order.filter((k) => w.d >= UNLOCK[k])
    const fresh = unlocked.find((k) => !w.seen.has(k))
    if (fresh) return fresh
    const pool: EventKind[] = [...unlocked, 'police']
    return pool[Math.floor(Math.random() * pool.length)]
  }

  // ── Late-run hazards ──────────────────────────────────
  function queueHazard(kind: HzKind, fresh: boolean) {
    const w = world.current
    const pl = laneOf(w.p.x)
    if (kind === 'rock') {
      const n = w.d > 5000 && Math.random() < 0.45 ? 2 : 1
      const lanes = [0, 1, 2, 3].sort(() => Math.random() - 0.5)
      if (Math.random() < 0.6) lanes.unshift(pl)
      const used: number[] = []
      for (const l of lanes) {
        if (used.length >= n) break
        if (!used.includes(l)) used.push(l)
      }
      used.forEach((l, i) => w.hz.push({ kind, lane: l, side: 0, t: 1.15 + i * 0.4, t0: 1.15 + i * 0.4, beep: 0 }))
    } else if (kind === 'wrong') {
      const g = geo()
      const free = (l: number) => !w.vehicles.some((v) => !v.knocked && Math.abs(v.x - laneX(l)) < 34 && v.y < g.py && v.y > -300)
      const opts = [0, 1, 2, 3].filter(free)
      const lane = opts.includes(pl) && Math.random() < 0.65 ? pl : opts[Math.floor(Math.random() * opts.length)]
      if (lane === undefined) return
      w.hz.push({ kind, lane, side: 0, t: 1.5, t0: 1.5, beep: 0 })
    } else {
      const side = Math.random() < 0.5 ? -1 : 1
      const n = w.d > 9000 && Math.random() < 0.5 ? 2 : 1
      for (let i = 0; i < n; i++) w.hz.push({ kind, lane: 0, side, t: 1.05 + i * 0.7, t0: 1.05 + i * 0.7, beep: 0 })
    }
    w.hzSeen.add(kind)
    if (fresh) {
      const [title, sub] = HZ_LABEL[kind]
      say(`NEW: ${title}`, sub)
      sfx.levelUp()
      haptic.medium()
    }
  }

  function spawnHazard(h: Hz) {
    const w = world.current
    const g = geo()
    const y = g.H * 0.2
    if (h.kind === 'rock') {
      w.obs.push({ kind: 'rock', x: laneX(h.lane) + rand(-6, 6), y, w: 30, h: 28, vx: 0, vy: 0, rot: rand(-0.5, 0.5), vr: 0, knocked: false, slide: 0.55, v: Math.floor(Math.random() * 4) })
      fx.burst(laneX(h.lane), y + 6, { count: 14, color: ['#78716c', '#a8a29e', '#d6d3d1'], speed: 180, shape: 'square', size: 4, gravity: 260 })
      fx.ring(laneX(h.lane), y, { color: '#a8a29e', maxR: 40, life: 0.3 })
      for (const v of w.vehicles) {
        // a car caught under the rock gets flattened aside
        if (v.knocked || v.parked || Math.abs(v.x - laneX(h.lane)) > v.w / 2 + 14 || Math.abs(v.y - y) > v.h / 2 + 14) continue
        v.knocked = true
        v.vx = (Math.random() < 0.5 ? -1 : 1) * rand(160, 240)
        v.vy = -60
        v.vr = rand(-6, 6)
        fx.explode(v.x, v.y, 0.6)
      }
      fx.shake(5, 0.2)
      sfx.thud()
      haptic.light()
    } else if (h.kind === 'wrong') {
      const v = makeVehicle('wrong', h.lane, -80, -rand(13, 17))
      v.color = ['#7f1d1d', '#78350f', '#3f3f46'][Math.floor(Math.random() * 3)]
      v.rot = Math.PI
      w.vehicles.push(v)
      sfx.whoosh()
    } else {
      const x = h.side < 0 ? g.left - 12 : g.right + 12
      w.obs.push({ kind: 'barrel', x, y, w: 30, h: 42, vx: -h.side * (g.roadW / 1.75), vy: 0, rot: 0, vr: 0, knocked: false, slide: 0.42, ph: 0 })
      sfx.thud()
    }
  }

  // ── Boss: the Iron Hauler ─────────────────────────────
  function bossSting() {
    sfx.boom(0.55)
    window.setTimeout(() => sfx.clang(), 200)
    window.setTimeout(() => sfx.clang(), 360)
    window.setTimeout(() => sfx.levelUp(), 560)
  }

  function startBoss() {
    const w = world.current
    w.bossN += 1
    w.boss = { x: laneX(1 + Math.floor(Math.random() * 2)), y: -BOSS_SIZE[1], lane: 1, hp: BOSS_HP, state: 'enter', t: 0, time: 34, moveT: 1.2, blink: 0, dropT: 1.6, warnLane: -1, warnT: 0, hitT: 0, empT: 1.2 }
    w.boss.lane = laneOf(w.boss.x)
    w.hz = []
    say(w.bossN === 1 ? 'BOSS FIGHT!' : `BOSS MK ${w.bossN}`, 'Iron Hauler · grab EMP bolts to zap it')
    fx.flash('#f97316', 0.25)
    fx.shake(8, 0.5)
    bossSting()
    haptic.heavy()
  }

  function bossDone() {
    const w = world.current
    w.boss = null
    w.nextBoss = w.d + BOSS_EVERY
    w.nextEv = Math.max(w.nextEv, w.d + 200)
    w.hzD = Math.max(w.hzD, 120)
  }

  function hitBoss() {
    const w = world.current
    const b = w.boss
    const g = geo()
    if (!b || b.state !== 'fight') return
    w.zaps.push({ x0: w.p.x, y0: g.py - 20, x1: b.x, y1: b.y, t: 0.4 })
    b.hp -= 1
    b.hitT = 0.3
    fx.explode(b.x + rand(-14, 14), b.y + rand(-30, 30), 0.7, ['#a78bfa', '#c4b5fd', '#ffffff', '#22d3ee'])
    fx.text(b.x, b.y + BOSS_SIZE[1] / 2 + 20, b.hp > 0 ? 'ZAP!' : 'OVERLOAD!', '#c4b5fd', 22)
    fx.shake(9, 0.3)
    fx.stop(0.06)
    sfx.hit()
    sfx.boom(0.4)
    haptic.heavy()
    if (b.hp > 0) return
    // Defeated
    b.state = 'dead'
    b.t = 0
    w.stats.bosses += 1
    const reward = 1000 + 250 * (w.bossN - 1)
    w.bonus += reward
    w.p.shields = Math.min(5, w.p.shields + 1)
    w.p.nitro = 1
    for (let i = 0; i < 16; i++) {
      const l = i % LANES
      w.picks.push({ kind: 'coin', x: laneX(l), y: b.y + 40 - Math.floor(i / LANES) * 46, taken: false, t: i * 0.2 })
    }
    fx.explode(b.x, b.y, 2)
    fx.burst(b.x, b.y, { count: 40, color: ['#fde047', '#fb923c', '#a78bfa', '#ffffff'], speed: 420, shape: 'square', size: 5, gravity: 200 })
    fx.ring(b.x, b.y, { color: '#fde047', maxR: 160, life: 0.6, width: 6 })
    fx.flash('#ffffff', 0.4)
    fx.slowmo(0.8, 0.35)
    fx.shake(18, 0.6)
    say('WRECKED IT!', `+${reward} · armor +1 · full nitro`)
    sfx.boom(1)
    window.setTimeout(() => sfx.win(), 250)
    haptic.success()
    run.update(w.stats)
    if (performance.now() - w.lastTrack > 30000) {
      w.lastTrack = performance.now()
      void trackEvent('action_milestone', { game_id: 'racer', kind: 'boss', value: w.stats.bosses })
    }
    pushHud()
  }

  function shockwave(x: number, y: number) {
    const w = world.current
    let n = 0
    for (const v of w.vehicles) {
      if (v.knocked || v.parked || Math.hypot(v.x - x, v.y - y) > 260) continue
      v.knocked = true
      v.vx = (v.x >= x ? 1 : -1) * rand(220, 360)
      v.vy = -rand(200, 380)
      v.vr = rand(-7, 7)
      n++
    }
    for (const o of w.obs) {
      if (o.knocked || o.kind === 'arrow' || o.kind === 'gap' || o.kind === 'oil' || Math.hypot(o.x - x, o.y - y) > 260) continue
      o.knocked = true
      o.vx = (o.x >= x ? 1 : -1) * rand(200, 320)
      o.vy = -rand(200, 360)
      o.vr = rand(-9, 9)
      n++
    }
    w.bonus += n * 30
    fx.ring(x, y, { color: '#a78bfa', maxR: 260, life: 0.5, width: 6 })
    fx.ring(x, y, { color: '#e9d5ff', maxR: 160, life: 0.35, width: 3 })
    fx.text(x, y - 70, n ? `SHOCKWAVE +${n * 30}` : 'SHOCKWAVE', '#c4b5fd', 20)
    fx.flash('#a78bfa', 0.2)
    fx.shake(8, 0.3)
    sfx.boom(0.5)
    haptic.heavy()
  }

  function hurt(v: Vehicle | null, ox: number) {
    const w = world.current
    const p = w.p
    const { py } = geo()
    if (p.shields > 0) {
      p.shields -= 1
      p.inv = 1.8
      p.slow = 0.55
      if (v) {
        v.knocked = true
        v.vx = (v.x - p.x >= 0 ? 1 : -1) * rand(180, 260)
        v.vy = -120
        v.vr = rand(-5, 5)
      }
      w.combo = 0
      fx.burst(ox, py - p.h / 2, { count: 22, color: ['#fde047', '#fb923c', '#ffffff'], speed: 320, shape: 'spark', gravity: 200 })
      fx.ring(p.x, py, { color: '#93c5fd', maxR: 60, life: 0.4 })
      fx.text(p.x, py - 60, p.shields > 0 ? 'ARMOR -1' : 'LAST ARMOR!', '#fca5a5', 20)
      fx.flash('#ef4444', 0.25)
      fx.shake(10, 0.35)
      fx.stop(0.08)
      sfx.hurt()
      sfx.clang()
      haptic.heavy()
      pushHud()
      return
    }
    die(ox)
  }

  function die(ox: number) {
    const w = world.current
    const { py } = geo()
    setPhaseBoth('dying')
    w.p.spin = 2
    w.p.spinDir = ox > w.p.x ? -1 : 1
    fx.explode(w.p.x, py, 1.8)
    fx.burst(w.p.x, py, { count: 30, color: ['#22d3ee', '#f0abfc', '#ffffff'], speed: 380, shape: 'square', size: 5, gravity: 300 })
    fx.flash('#ef4444', 0.35)
    fx.stop(0.15)
    fx.shake(16, 0.5)
    fx.slowmo(1.1, 0.3)
    sfx.boom(1)
    sfx.lose()
    haptic.error()
    const finalScore = score()
    pushHud()
    if (w.d > w.bestDist) {
      try {
        localStorage.setItem(BEST_KEY, String(Math.floor(w.d)))
      } catch {
        // storage unavailable
      }
    }
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.stats.coins + Math.floor(w.d / 200) + w.stats.police * 5 + w.stats.bosses * 10) * (1 + run.level('magnet') * 0.1))
      run.end({ score: finalScore, cleared: w.d >= 1500, stats: { ...w.stats }, coins }, revive)
    }, 1150)
  }

  function revive() {
    const w = world.current
    const { py } = geo()
    w.p.shields = Math.max(1, w.p.shields)
    w.p.inv = 2.5
    w.p.spin = 0
    w.p.rot = 0
    w.p.slow = 0.6
    w.p.nitro = Math.max(w.p.nitro, 0.5)
    w.vehicles = w.vehicles.filter((v) => v.y < py - 320 || v.y > py + 140)
    w.obs = w.obs.filter((o) => o.kind === 'arrow' || o.y < py - 320 || o.y > py + 140)
    w.warns = []
    w.hz = []
    fx.ring(w.p.x, py, { color: '#fde047', maxR: 110, life: 0.6, width: 5 })
    say('REVIVED!', 'armor restored')
    pushHud()
    setPhaseBoth('play')
  }

  function nearMiss(v: Vehicle) {
    const w = world.current
    const { py } = geo()
    w.combo = w.comboT > 0 ? w.combo + 1 : 1
    w.comboT = 2.6
    const pts = 25 * Math.min(8, w.combo)
    w.bonus += pts
    w.stats.nearmiss += 1
    if (w.p.nitroT <= 0) w.p.nitro = Math.min(1, w.p.nitro + 0.13 + Math.min(0.1, w.combo * 0.015))
    const sx = (v.x + w.p.x) / 2
    fx.burst(sx, py, { count: 10, color: ['#22d3ee', '#a5f3fc', '#ffffff'], speed: 200, shape: 'spark', gravity: 0 })
    fx.text(w.p.x, py - 70, w.combo > 1 ? `CLOSE x${w.combo}  +${pts}` : `CLOSE! +${pts}`, w.combo > 3 ? '#f0abfc' : '#a5f3fc', 17 + Math.min(8, w.combo))
    sfx.score(w.combo)
    haptic.light()
    if (w.combo > 0 && w.combo % 5 === 0) {
      sfx.combo()
      say(`${w.combo} COMBO!`)
    }
    run.update(w.stats)
  }

  function collect(pk: Pickup) {
    const w = world.current
    const { py } = geo()
    pk.taken = true
    if (pk.kind === 'coin') {
      w.stats.coins += 1
      w.bonus += 5
      fx.burst(pk.x, pk.y, { count: 6, color: ['#fde047', '#facc15', '#fff7ed'], speed: 140, gravity: 0 })
      sfx.pop()
    } else if (pk.kind === 'nitro') {
      w.p.nitro = Math.min(1, w.p.nitro + 0.5)
      fx.text(pk.x, py - 70, 'NITRO +50%', '#67e8f9', 18)
      fx.ring(pk.x, pk.y, { color: '#22d3ee', maxR: 50 })
      sfx.power()
      haptic.medium()
    } else if (pk.kind === 'shield') {
      w.p.shields = Math.min(5, w.p.shields + 1)
      fx.text(pk.x, py - 70, 'ARMOR +1', '#93c5fd', 18)
      fx.ring(pk.x, pk.y, { color: '#60a5fa', maxR: 50 })
      sfx.power()
      haptic.medium()
    } else if (pk.kind === 'emp') {
      fx.burst(pk.x, pk.y, { count: 12, color: ['#a78bfa', '#e9d5ff', '#ffffff'], speed: 220, shape: 'spark', gravity: 0 })
      sfx.power()
      if (w.boss && w.boss.state === 'fight') hitBoss()
      else shockwave(w.p.x, py)
    } else {
      w.p.magnetT = 9
      fx.text(pk.x, py - 70, 'MAGNET', '#f9a8d4', 18)
      fx.ring(pk.x, pk.y, { color: '#f472b6', maxR: 50 })
      sfx.power()
      haptic.medium()
    }
    run.update(w.stats)
  }

  function update(dt: number, raw: number) {
    const w = world.current
    const p = w.p
    const g = geo()
    const ph = phaseRef.current
    const live = ph === 'play'
    const demo = ph === 'idle'

    // Speed curve: gentle start, ramps over the first few km.
    const base = 22 + Math.min(30, w.d / 150)
    if (p.nitroT > 0) p.nitroT = Math.max(0, p.nitroT - dt)
    p.slow = approach(p.slow, 1, 1.2, dt)
    const target = ph === 'dying' || ph === 'over' ? 0 : base * (p.nitroT > 0 ? 1.55 : 1) * p.slow
    w.speed = approach(w.speed, target, ph === 'dying' ? 2.5 : 3, dt)
    const dy = w.speed * PXM * dt
    w.scroll += dy
    if (live) w.d += w.speed * dt
    if (demo) w.d = (w.d + w.speed * dt * 0.2) % 300

    // Player steering
    if (live) {
      const kx = (keys.current.right ? 1 : 0) - (keys.current.left ? 1 : 0)
      if (kx) p.tx += kx * 420 * dt
    } else if (demo) {
      // Autopilot: pick the lane with the most room ahead.
      let best = laneOf(p.x)
      let bestRoom = -1
      for (let l = 0; l < LANES; l++) {
        let room = 900
        for (const v of w.vehicles) if (Math.abs(v.x - laneX(l)) < 34 && v.y < g.py + 40) room = Math.min(room, g.py - v.y)
        room -= Math.abs(l - laneOf(p.x)) * 40
        if (room > bestRoom) {
          bestRoom = room
          best = l
        }
      }
      p.tx = laneX(best)
    }
    p.tx = clamp(p.tx, g.left + p.w / 2 + 2, g.right - p.w / 2 - 2)
    if (p.spin > 0) {
      p.spin = Math.max(0, p.spin - dt)
      p.rot += p.spinDir * 9 * dt
      p.x += p.spinDir * 60 * dt
      p.x = clamp(p.x, g.left + p.w / 2, g.right - p.w / 2)
      p.tx = p.x
      if (p.spin === 0 && ph === 'play') p.rot = 0
    } else {
      const nx = approach(p.x, p.tx, 12, dt)
      p.vx = dt > 0 ? (nx - p.x) / dt : 0
      p.x = nx
      p.rot = approach(p.rot, clamp(p.vx * 0.0016, -0.32, 0.32), 14, dt)
    }
    p.inv = Math.max(0, p.inv - dt)
    p.magnetT = Math.max(0, p.magnetT - dt)
    w.comboT = Math.max(0, w.comboT - dt)
    if (w.comboT === 0) w.combo = 0

    // Biomes rotate every 1000 m
    if (live) {
      const bi = Math.floor(w.d / 1000) % BIOMES.length
      if (bi !== w.biome) {
        w.biome = bi
        say(BIOMES[bi].name.toUpperCase(), `${Math.floor(w.d / 1000)} km`)
        fx.flash('#ffffff', 0.3)
        sfx.levelUp()
      }
      if (w.d >= w.milestone) {
        if (w.milestone % 1000 !== 0) say(`${w.milestone} M`)
        fx.text(p.x, g.py - 90, `${w.milestone} m`, '#fde68a', 22)
        sfx.combo()
        if (w.milestone % 1000 === 0 && performance.now() - w.lastTrack > 30000) {
          w.lastTrack = performance.now()
          void trackEvent('action_milestone', { game_id: 'racer', kind: 'distance', value: w.milestone })
        }
        w.milestone += 500
      }
      if (!w.bestPassed && w.bestDist > 200 && w.d > w.bestDist) {
        w.bestPassed = true
        fx.text(p.x, g.py - 120, 'NEW BEST!', '#fde047', 26)
        fx.burst(p.x, g.py - 60, { count: 30, color: ['#fde047', '#f0abfc', '#22d3ee'], speed: 300 })
        sfx.win()
        haptic.success()
      }
    }

    // Events
    if (live) {
      if (!w.ev && !w.boss && w.d >= w.nextBoss) startBoss()
      if (!w.ev && !w.boss && w.d >= w.nextEv) startEvent(chooseEvent())
      if (w.ev) {
        w.evT += dt
        const ed = w.evData
        if (w.ev !== 'police') {
          w.evLeft -= w.speed * dt
          if (w.evLeft <= 0) endEvent()
        }
        if (w.ev === 'construction') {
          const side = ed.closed.includes(0) ? 1 : -1
          const edgeLane = side === 1 ? Math.max(...ed.closed) : Math.min(...ed.closed)
          const bx = laneX(edgeLane) + side * g.laneW * 0.5
          ed.coneD -= w.speed * dt
          const along = w.d - ed.startD
          if (ed.coneD <= 0 && w.evLeft > 30 && along > 8) {
            ed.coneD = 3
            // taper in from the road edge over the first stretch
            const k = clamp((along - 8) / 40, 0, 1)
            const edgeX = side === 1 ? g.left + 10 : g.right - 10
            const cx = edgeX + (bx - edgeX) * k
            w.obs.push({ kind: 'cone', x: cx, y: -20, w: 16, h: 16, vx: 0, vy: 0, rot: 0, vr: 0, knocked: false })
          }
          ed.barD -= w.speed * dt
          if (ed.barD <= 0 && w.evLeft > 60) {
            ed.barD = rand(40, 70)
            const l = ed.closed[Math.floor(Math.random() * ed.closed.length)]
            w.obs.push({ kind: 'barrier', x: laneX(l), y: -30, w: g.laneW - 14, h: 14, vx: 0, vy: 0, rot: 0, vr: 0, knocked: false })
          }
        } else if (w.ev === 'oil') {
          ed.barD -= w.speed * dt
          if (ed.barD <= 0) {
            ed.barD = rand(28, 45)
            const l = Math.floor(Math.random() * LANES)
            if (laneFree(l, -40, 90)) w.obs.push({ kind: 'oil', x: laneX(l) + rand(-12, 12), y: -40, w: 52, h: 30, vx: 0, vy: 0, rot: 0, vr: 0, knocked: false })
          }
        } else if (w.ev === 'police') {
          const chaseLen = 20
          if (w.evT < chaseLen) {
            ed.pursueT -= dt
            if (ed.pursueT <= 0) {
              ed.pursueT = rand(1.8, 2.8) - Math.min(0.8, w.d / 8000)
              w.warns.push({ lane: laneOf(p.x), t: 1.1 })
              sfx.tick()
            }
          } else if (!ed.blockSpawned) {
            // Roadblock with exactly one gap lane.
            ed.blockSpawned = true
            ed.gap = Math.floor(Math.random() * LANES)
            w.vehicles = w.vehicles.filter((v) => !(laneOf(v.x) === ed.gap && v.y < 60 && v.y > -400))
            for (let l = 0; l < LANES; l++) {
              if (l === ed.gap) {
                w.obs.push({ kind: 'gap', x: laneX(l), y: -60, w: 40, h: 60, vx: 0, vy: 0, rot: 0, vr: 0, knocked: false, rowEnd: true })
              } else if ((l + ed.gap) % 2 === 0) {
                const pc = makeVehicle('police', l, -60, 0)
                pc.parked = true
                pc.rot = Math.PI / 2
                pc.w = VSIZE.police[1]
                pc.h = VSIZE.police[0]
                pc.passed = true
                w.vehicles.push(pc)
              } else {
                w.obs.push({ kind: 'barrier', x: laneX(l), y: -60, w: g.laneW - 8, h: 14, vx: 0, vy: 0, rot: 0, vr: 0, knocked: false })
              }
            }
            say('ROADBLOCK!', 'find the gap')
            sfx.boom(0.4)
          }
        }
      }
    }

    // Late-run hazards: scheduled in the quiet gaps between events
    if (live && !w.boss && (!w.ev || w.ev === 'convoy' || w.ev === 'oil')) {
      w.hzD -= w.speed * dt
      if (w.hzD <= 0) {
        const kinds = HZ_ORDER.filter((k) => w.d >= HZ_UNLOCK[k])
        if (kinds.length) {
          const fresh = kinds.find((k) => !w.hzSeen.has(k))
          let kind = fresh ?? kinds[Math.floor(Math.random() * kinds.length)]
          if (!fresh && BIOMES[w.biome].props === 'volcano' && Math.random() < 0.4) kind = 'rock'
          queueHazard(kind, !!fresh)
        }
        w.hzD = rand(150, 230) - Math.min(70, Math.max(0, w.d - 2200) / 150)
      }
    }
    for (const h of w.hz) {
      h.t -= dt
      const k = Math.floor(h.t * 6)
      if (live && k !== h.beep && h.t > 0) {
        h.beep = k
        if (k % 2 === 0) sfx.tick()
      }
      if (h.t <= 0 && live) spawnHazard(h)
    }
    w.hz = w.hz.filter((h) => h.t > 0)

    // Boss
    const b = w.boss
    if (b) {
      const by = g.H * 0.27
      b.t += dt
      b.hitT = Math.max(0, b.hitT - dt)
      if (b.state === 'enter') {
        b.y = approach(b.y, by, 2.2, dt)
        b.x = approach(b.x, laneX(b.lane), 4, dt)
        if (Math.abs(b.y - by) < 3) b.state = 'fight'
      } else if (b.state === 'fight') {
        if (live) b.time -= dt
        b.y = by + Math.sin(b.t * 1.7) * 6
        b.moveT -= dt
        if (b.moveT <= 0 && b.warnT <= 0) {
          b.moveT = rand(1.6, 2.6) * (b.hp === 1 ? 0.75 : 1)
          const pl = laneOf(p.x)
          let nl = Math.random() < 0.6 ? pl : Math.floor(Math.random() * LANES)
          if (nl === b.lane) nl = clamp(b.lane + (Math.random() < 0.5 ? -1 : 1), 0, LANES - 1)
          b.blink = nl > b.lane ? 1 : -1
          b.lane = nl
        }
        b.x = approach(b.x, laneX(b.lane), 3.2, dt)
        if (Math.abs(b.x - laneX(b.lane)) < 3) b.blink = 0
        b.dropT -= dt
        if (b.dropT <= 0 && b.warnT <= 0 && Math.abs(b.x - laneX(b.lane)) < 6 && live) {
          b.warnLane = b.lane
          b.warnT = 1
          sfx.tick()
        }
        if (b.warnT > 0) {
          b.warnT -= dt
          if (b.warnT <= 0 && live) {
            const lanes = [b.warnLane]
            if (b.hp === 1) lanes.push(b.warnLane === 0 ? 1 : b.warnLane === LANES - 1 ? LANES - 2 : b.warnLane + (Math.random() < 0.5 ? -1 : 1))
            for (const l of lanes) w.obs.push({ kind: 'crate', x: laneX(l), y: b.y + BOSS_SIZE[1] / 2 + 16, w: 30, h: 30, vx: 0, vy: 0, rot: rand(-0.2, 0.2), vr: 0, knocked: false, slide: 0.45 })
            fx.burst(b.x, b.y + BOSS_SIZE[1] / 2, { count: 10, color: ['#fbbf24', '#78350f', '#ffffff'], speed: 160, shape: 'square', gravity: 200 })
            fx.shake(4, 0.15)
            sfx.thud()
            b.dropT = b.hp === BOSS_HP ? rand(1.4, 2) : rand(1, 1.5)
          }
        }
        b.empT -= dt
        if (b.empT <= 0 && live) {
          b.empT = rand(3.2, 4.2)
          const opts = [0, 1, 2, 3].filter((l) => l !== b.lane && l !== laneOf(b.x))
          const l = opts[Math.floor(Math.random() * opts.length)]
          w.picks.push({ kind: 'emp', x: laneX(l), y: b.y + BOSS_SIZE[1] / 2 + 30, taken: false, t: 0 })
        }
        if (b.time <= 0) {
          b.state = 'leave'
          w.bonus += 200
          say('IT GOT AWAY!', '+200 · zap it faster next time')
          sfx.whoosh()
        }
        // exhaust smoke when damaged
        if (b.hp < BOSS_HP && Math.random() < 0.25 * (BOSS_HP - b.hp)) fx.burst(b.x + rand(-20, 20), b.y - BOSS_SIZE[1] * 0.2, { count: 1, color: ['#3f3f46', '#52525b', '#71717a'], speed: 40, size: 7, life: 0.8, gravity: -30 })
      } else if (b.state === 'leave') {
        b.y -= 420 * dt
        if (b.y < -BOSS_SIZE[1]) bossDone()
      } else {
        b.y += dy * 0.35
        if (Math.random() < 0.5) fx.burst(b.x + rand(-24, 24), b.y + rand(-50, 50), { count: 1, color: ['#fb923c', '#fde047', '#3f3f46'], speed: 80, size: 6, life: 0.6, gravity: -40 })
        if (b.t > 1.4) bossDone()
      }
    }
    for (const z of w.zaps) z.t -= dt
    w.zaps = w.zaps.filter((z) => z.t > 0)

    // Police warnings spawn pursuers from behind
    for (const wn of w.warns) {
      wn.t -= dt
      if (wn.t <= 0 && live) {
        const v = makeVehicle('police', wn.lane, g.H + 60, w.speed + 9)
        v.side = 1
        w.vehicles.push(v)
        sfx.whoosh()
      }
    }
    w.warns = w.warns.filter((wn) => wn.t > 0)

    // Traffic spawn
    w.spawnT -= dt
    if (w.spawnT <= 0 && ph !== 'dying') {
      const quiet = w.ev === 'police' && w.evT > 17 && !w.evData.blockSpawned
      if (!quiet) spawnTraffic()
      const rate = demo ? 1.1 : clamp(1.5 - w.d / 2600, 0.42, 1.5) * (w.ev === 'convoy' ? 0.8 : 1)
      w.spawnT = rate * rand(0.75, 1.25)
    }

    // Coins & pickups
    if (live) {
      w.coinD -= w.speed * dt
      if (w.coinD <= 0) {
        w.coinD = rand(70, 120)
        const l = Math.floor(Math.random() * LANES)
        const closed = w.ev === 'construction' ? w.evData.closed : []
        if (!closed.includes(l) && laneFree(l, -150, 160)) for (let i = 0; i < 6; i++) w.picks.push({ kind: 'coin', x: laneX(l), y: -30 - i * 44, taken: false, t: i * 0.3 })
      }
      w.pickD -= w.speed * dt
      if (w.pickD <= 0) {
        w.pickD = rand(220, 340)
        const r = Math.random()
        const kind: PickKind = r < 0.5 ? 'nitro' : r < 0.72 ? 'magnet' : r < 0.88 || w.d < 2000 ? 'shield' : 'emp'
        const l = Math.floor(Math.random() * LANES)
        if (laneFree(l, -40, 100)) w.picks.push({ kind, x: laneX(l), y: -40, taken: false, t: 0 })
      }
    }

    // Vehicles
    for (const v of w.vehicles) {
      if (v.knocked) {
        v.x += v.vx * dt
        v.y += v.vy * dt + dy
        v.vx *= 1 - 1.5 * dt
        v.vy *= 1 - 1.5 * dt
        v.rot += v.vr * dt
        v.life -= dt
        continue
      }
      const prevY = v.y
      v.y += dy - v.speed * PXM * dt
      if (v.police && !v.parked) {
        // Pursuers steer toward the player until they pass.
        if (v.y > g.py - 40) v.tx = approach(v.tx, p.x, 1.6, dt)
        v.x = approach(v.x, v.tx, 4, dt)
      } else if (!v.parked && !v.wrong) {
        v.thinkT -= dt
        if (v.blinkT > 0) {
          v.blinkT -= dt
          if (v.blinkT <= 0) v.tx = laneX(v.lane)
        } else if (v.thinkT <= 0) {
          v.thinkT = rand(1.5, 4)
          const chance = w.ev === 'convoy' ? 0.55 : clamp(w.d / 4000, 0.05, 0.4)
          if (Math.random() < chance && v.y > -40 && v.y < g.py - 120) {
            const dir = Math.random() < 0.5 ? -1 : 1
            const nl = v.lane + dir
            const closed = w.ev === 'construction' ? w.evData.closed : []
            if (nl >= 0 && nl < LANES && !closed.includes(nl) && laneFree(nl, v.y, 120, v)) {
              v.lane = nl
              v.blink = dir
              v.blinkT = 1.0
            }
          }
        }
        v.x = approach(v.x, v.tx, 2.2, dt)
        if (Math.abs(v.x - v.tx) < 2 && v.blinkT <= 0) v.blink = 0
      }
      // Near-miss: detect the moment a vehicle crosses the player's line.
      const before = prevY < g.py ? -1 : 1
      const after = v.y < g.py ? -1 : 1
      if (live && before !== after && !v.passed && !v.parked) {
        v.passed = true
        const gap = Math.abs(v.x - p.x) - (v.w + p.w) / 2
        if (gap > -3 && gap < 26 && p.spin <= 0) nearMiss(v)
      }
    }
    // Wrong-way drivers wreck any traffic they meet head-on.
    for (const a of w.vehicles) {
      if (!a.wrong || a.knocked) continue
      for (const c of w.vehicles) {
        if (c === a || c.knocked || Math.abs(c.x - a.x) > (c.w + a.w) / 2 - 6 || Math.abs(c.y - a.y) > (c.h + a.h) / 2 - 4) continue
        for (const [v, s] of [[a, -1], [c, 1]] as const) {
          v.knocked = true
          v.vx = (v.x >= p.x ? 1 : -1) * rand(120, 220) + s * 30
          v.vy = s * rand(80, 160)
          v.vr = rand(-6, 6)
        }
        if (a.y > -20) {
          fx.explode((a.x + c.x) / 2, (a.y + c.y) / 2, 0.8)
          fx.shake(6, 0.25)
          sfx.boom(0.4)
        }
        break
      }
    }
    // Simple car-following so traffic doesn't overlap.
    for (const a of w.vehicles) {
      if (a.knocked || a.parked || a.police || a.wrong) continue
      for (const b of w.vehicles) {
        if (a === b || b.knocked || b.police || b.wrong) continue
        if (Math.abs(a.x - b.x) < 30 && a.y > b.y && a.y - b.y < (a.h + b.h) / 2 + 24) a.speed = Math.min(a.speed, b.speed)
      }
    }
    w.vehicles = w.vehicles.filter((v) => (v.knocked ? v.life > 0 : v.y < g.H + 200 && v.y > -500))

    // Obstacles
    for (const o of w.obs) {
      if (o.knocked) {
        o.x += o.vx * dt
        o.y += o.vy * dt + dy
        o.rot += o.vr * dt
        o.vx *= 1 - 2 * dt
        o.vy *= 1 - 2 * dt
      } else {
        o.y += dy * (o.slide ?? 1)
        if (o.kind === 'barrel') {
          o.x += o.vx * dt
          o.ph = (o.ph ?? 0) + o.vx * dt
          // barrels burst against traffic instead of rolling through it
          for (const v of w.vehicles) {
            if (v.knocked || Math.abs(v.x - o.x) > (v.w + o.w) / 2 - 4 || Math.abs(v.y - o.y) > (v.h + o.h) / 2 - 6) continue
            o.knocked = true
            o.vx *= -0.3
            o.vy = -180
            o.vr = rand(-8, 8)
            fx.burst(o.x, o.y, { count: 10, color: ['#ef4444', '#fde047', '#1f2937'], speed: 180, shape: 'square', gravity: 240 })
            if (o.y > 0) sfx.thud()
            break
          }
        }
      }
      if (live && o.rowEnd && o.y > g.py + 40) {
        o.rowEnd = false
        w.stats.police += 1
        w.bonus += 300
        fx.text(p.x, g.py - 90, 'ESCAPED! +300', '#86efac', 24)
        fx.burst(p.x, g.py - 40, { count: 30, color: ['#86efac', '#22d3ee', '#ffffff'], speed: 320 })
        say('ESCAPED!', '+300')
        sfx.win()
        haptic.success()
        if (performance.now() - w.lastTrack > 30000) {
          w.lastTrack = performance.now()
          void trackEvent('action_milestone', { game_id: 'racer', kind: 'police', value: w.stats.police })
        }
        run.update(w.stats)
        endEvent()
      }
    }
    w.obs = w.obs.filter((o) => o.y < g.H + 120 && o.y > -200 && (o.kind !== 'barrel' || o.knocked || (o.x > g.left - 30 && o.x < g.right + 30)))

    // Pickups (magnet pull)
    const magR = 30 + run.level('magnet') * 14 + (p.magnetT > 0 ? 150 : 0)
    for (const pk of w.picks) {
      pk.y += dy
      pk.t += raw
      if (live && pk.kind === 'coin' && !pk.taken) {
        const ddx = p.x - pk.x
        const ddy = g.py - pk.y
        const dd = Math.hypot(ddx, ddy)
        if (dd < magR && dd > 1) {
          const pull = 700 * dt
          pk.x += (ddx / dd) * Math.min(dd, pull)
          pk.y += (ddy / dd) * Math.min(dd, pull)
        }
      }
    }

    if (!live) return
    // Collisions
    const hw = p.w / 2 - 3
    const hh = p.h / 2 - 5
    for (const v of w.vehicles) {
      if (v.knocked) continue
      if (Math.abs(v.x - p.x) < v.w / 2 + hw && Math.abs(v.y - g.py) < v.h / 2 + hh) {
        if (p.nitroT > 0) {
          v.knocked = true
          v.vx = (v.x >= p.x ? 1 : -1) * rand(260, 420)
          v.vy = -rand(300, 500)
          v.vr = rand(-8, 8)
          w.bonus += 50
          fx.explode(v.x, v.y, 0.8, ['#22d3ee', '#f0abfc', '#ffffff', '#fde047'])
          fx.text(v.x, v.y - 30, 'SMASH +50', '#f0abfc', 18)
          fx.stop(0.04)
          sfx.hit()
          haptic.medium()
        } else if (p.inv <= 0) {
          hurt(v, v.x)
          if (phaseRef.current !== 'play') return
        }
      }
    }
    for (const o of w.obs) {
      if (o.knocked || o.kind === 'arrow' || o.kind === 'gap') continue
      if (Math.abs(o.x - p.x) < o.w / 2 + hw - 4 && Math.abs(o.y - g.py) < o.h / 2 + hh) {
        if (o.kind === 'oil') {
          if (p.spin <= 0 && p.nitroT <= 0) {
            p.spin = 0.75
            p.spinDir = Math.random() < 0.5 ? -1 : 1
            p.slow = 0.7
            w.combo = 0
            fx.text(p.x, g.py - 60, 'SPIN OUT!', '#c4b5fd', 18)
            fx.burst(p.x, g.py, { count: 14, color: ['#1e1b4b', '#a855f7', '#22d3ee'], speed: 160 })
            sfx.miss()
            haptic.medium()
          }
          o.knocked = true
          o.vx = 0
          o.vy = 0
          o.vr = 0
        } else if (o.kind === 'cone') {
          o.knocked = true
          o.vx = (o.x >= p.x ? 1 : -1) * rand(150, 260)
          o.vy = -rand(200, 360)
          o.vr = rand(-12, 12)
          p.slow = Math.min(p.slow, 0.88)
          fx.burst(o.x, o.y, { count: 6, color: ['#f97316', '#fdba74'], speed: 140, shape: 'square' })
          sfx.thud()
        } else {
          o.knocked = true
          o.vx = (o.x >= p.x ? 1 : -1) * 200
          o.vy = -260
          o.vr = rand(-6, 6)
          if (p.nitroT > 0) {
            w.bonus += 50
            fx.explode(o.x, o.y, 0.7, o.kind === 'rock' ? ['#a8a29e', '#78716c', '#fde047', '#ffffff'] : undefined)
            fx.text(o.x, o.y - 24, 'SMASH +50', '#f0abfc', 16)
            sfx.hit()
          } else if (p.inv <= 0) {
            hurt(null, o.x)
            if (phaseRef.current !== 'play') return
          }
        }
      }
    }
    for (const pk of w.picks) {
      if (pk.taken) continue
      if (Math.abs(pk.x - p.x) < p.w / 2 + 10 && Math.abs(pk.y - g.py) < p.h / 2 + 10) collect(pk)
    }
    w.picks = w.picks.filter((pk) => !pk.taken && pk.y < g.H + 40)

    // Nitro trail particles
    if (p.nitroT > 0 && Math.random() < 0.8) {
      fx.burst(p.x + rand(-8, 8), g.py + p.h / 2, { count: 1, color: ['#22d3ee', '#f0abfc', '#ffffff'], speed: 160, angle: Math.PI / 2, spread: 0.4, life: 0.35, gravity: 0, shape: 'spark' })
    }
    if (p.spin > 0 && Math.random() < 0.6) fx.burst(p.x, g.py + 20, { count: 1, color: ['#94a3b8', '#cbd5e1'], speed: 60, size: 6, life: 0.6, gravity: -20 })

    score()
    w.hudT -= raw
    if (w.hudT <= 0) {
      w.hudT = 0.1
      pushHud()
    }
  }

  // ── Drawing ───────────────────────────────────────────
  function drawRoadside(ctx: CanvasRenderingContext2D, b: Biome, t: number) {
    const w = world.current
    const g = geo()
    ctx.fillStyle = b.side
    ctx.fillRect(0, 0, g.W, g.H)
    if (b.props === 'coast' && g.left > 8) {
      const sea = ctx.createLinearGradient(0, 0, g.left, 0)
      sea.addColorStop(0, '#04131f')
      sea.addColorStop(1, b.side2)
      ctx.fillStyle = sea
      ctx.fillRect(0, 0, g.left - 4, g.H)
    } else if (b.props === 'snow') {
      ctx.fillStyle = b.side2
      for (const x of [g.left - 14, g.right + 4]) ctx.fillRect(x, 0, 10, g.H)
    }
    const SEG = 120
    const off = w.scroll % SEG
    const base = Math.floor(w.scroll / SEG)
    for (let i = -1; i <= Math.ceil(g.H / SEG) + 1; i++) {
      const y = i * SEG + off - SEG
      const k = base - i
      for (const side of [0, 1]) {
        const x0 = side === 0 ? 0 : g.right + 4
        const sw = side === 0 ? g.left - 4 : g.W - g.right - 4
        if (sw <= 2) continue
        const h1 = hash(k * 2 + side)
        const h2 = hash(k * 7 + side * 3)
        const col = b.cols[Math.floor(h1 * b.cols.length)]
        if (b.props === 'city' || b.props === 'docks') {
          // rooftops / containers
          const bh = SEG * (0.55 + h2 * 0.35)
          ctx.fillStyle = col
          ctx.fillRect(x0 + 2, y + 6, sw - 4, bh)
          ctx.fillStyle = 'rgba(255,255,255,0.08)'
          ctx.fillRect(x0 + 2, y + 6, sw - 4, 3)
          if (b.props === 'docks') {
            ctx.fillStyle = 'rgba(0,0,0,0.22)'
            for (let s = x0 + 6; s < x0 + sw - 4; s += 5) ctx.fillRect(s, y + 8, 2, bh - 4)
          } else {
            for (let wy = y + 14; wy < y + bh; wy += 12) {
              for (let wx = x0 + 6; wx < x0 + sw - 8; wx += 9) {
                if (hash(wx * 3.1 + wy * 1.7 + k) < 0.55) continue
                ctx.fillStyle = b.lights[Math.floor(hash(wx + wy + k) * b.lights.length)]
                ctx.globalAlpha = b.night ? 0.85 : 0.45
                ctx.fillRect(wx, wy, 4, 5)
              }
            }
            ctx.globalAlpha = 1
          }
        } else if (b.props === 'desert') {
          if (h2 < 0.5) {
            ctx.fillStyle = col
            ctx.beginPath()
            ctx.ellipse(x0 + sw * h1, y + 50, 10 + h2 * 14, 7 + h2 * 8, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = 'rgba(255,255,255,0.15)'
            ctx.beginPath()
            ctx.ellipse(x0 + sw * h1 - 3, y + 46, 5, 3, 0, 0, Math.PI * 2)
            ctx.fill()
          } else {
            // cactus from above: star of arms
            const cx = x0 + sw * (0.3 + h1 * 0.4)
            ctx.fillStyle = b.lights[0]
            ctx.beginPath()
            ctx.arc(cx, y + 60, 7, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillRect(cx - 12, y + 57, 24, 6)
            ctx.fillStyle = b.lights[1]
            ctx.beginPath()
            ctx.arc(cx - 1, y + 59, 3, 0, Math.PI * 2)
            ctx.fill()
          }
        } else if (b.props === 'snow') {
          const cx = x0 + sw * (0.25 + h1 * 0.5)
          if (h2 < 0.3) {
            // snow drift
            ctx.fillStyle = 'rgba(100,140,190,0.35)'
            ctx.beginPath()
            ctx.ellipse(cx + 3, y + 64, 18, 9, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#f8fbff'
            ctx.beginPath()
            ctx.ellipse(cx, y + 60, 18, 9, 0, 0, Math.PI * 2)
            ctx.fill()
          } else {
            // snow-capped pine
            const r = 12 + h2 * 10
            ctx.fillStyle = 'rgba(70,100,140,0.3)'
            ctx.beginPath()
            ctx.arc(cx + 5, y + 66, r, 0, Math.PI * 2)
            ctx.fill()
            for (const [rk, fill] of [[1, col], [0.62, '#e2ecf6'], [0.3, '#ffffff']] as const) {
              ctx.fillStyle = fill
              ctx.beginPath()
              for (let a = 0; a < 10; a++) {
                const r2 = (a % 2 ? r * 0.6 : r) * rk
                const ang = (a / 10) * Math.PI * 2 + h1
                ctx.lineTo(cx + Math.cos(ang) * r2 - (1 - rk) * 3, y + 60 + Math.sin(ang) * r2 - (1 - rk) * 3)
              }
              ctx.fill()
            }
          }
        } else if (b.props === 'coast') {
          if (side === 0) {
            // sea: foam crests rolling in toward the road
            ctx.strokeStyle = 'rgba(186,230,253,0.35)'
            ctx.lineWidth = 2
            for (let j = 0; j < 3; j++) {
              const yy = y + 20 + j * 38 + h1 * 10
              ctx.beginPath()
              ctx.moveTo(x0, yy)
              ctx.quadraticCurveTo(x0 + sw * 0.4, yy - 8, x0 + sw * (0.7 + h2 * 0.25), yy + 2)
              ctx.stroke()
            }
            ctx.fillStyle = 'rgba(241,245,249,0.5)'
            ctx.fillRect(x0 + sw - 6, y, 6, SEG)
          } else {
            // basalt cliff blocks
            const cx = x0 + sw * (0.2 + h1 * 0.5)
            ctx.fillStyle = 'rgba(0,0,0,0.35)'
            ctx.beginPath()
            ctx.moveTo(cx - 12, y + 40)
            ctx.lineTo(cx + 18, y + 34)
            ctx.lineTo(cx + 26, y + 70)
            ctx.lineTo(cx - 6, y + 80)
            ctx.fill()
            ctx.fillStyle = col
            ctx.beginPath()
            ctx.moveTo(cx - 16, y + 36)
            ctx.lineTo(cx + 14, y + 28)
            ctx.lineTo(cx + 22, y + 62)
            ctx.lineTo(cx - 10, y + 74)
            ctx.closePath()
            ctx.fill()
            ctx.fillStyle = 'rgba(255,255,255,0.08)'
            ctx.beginPath()
            ctx.moveTo(cx - 16, y + 36)
            ctx.lineTo(cx + 14, y + 28)
            ctx.lineTo(cx + 4, y + 44)
            ctx.closePath()
            ctx.fill()
            if (k % 5 === 0) {
              // lighthouse with a sweeping beam
              const lx = x0 + sw * 0.55
              blit(ctx, glowSprite('rgba(253,230,138,0.45)', 50), lx, y + 92, 100, 100)
              ctx.fillStyle = '#e5e7eb'
              ctx.beginPath()
              ctx.arc(lx, y + 92, 8, 0, Math.PI * 2)
              ctx.fill()
              ctx.fillStyle = '#dc2626'
              ctx.beginPath()
              ctx.arc(lx, y + 92, 5, 0, Math.PI * 2)
              ctx.fill()
              ctx.fillStyle = '#fef9c3'
              ctx.beginPath()
              ctx.arc(lx, y + 92, 2.5, 0, Math.PI * 2)
              ctx.fill()
            }
          }
        } else if (b.props === 'volcano') {
          const cx = x0 + sw * (0.25 + h1 * 0.5)
          if (h2 < 0.45) {
            // lava pool
            const pulse = 0.75 + Math.sin(t * 3 + k) * 0.25
            blit(ctx, glowSprite('rgba(249,115,22,0.5)', 40), cx, y + 60, 80 * pulse, 80 * pulse)
            ctx.fillStyle = '#c2410c'
            ctx.beginPath()
            ctx.ellipse(cx, y + 60, 15, 10, h1, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#fb923c'
            ctx.beginPath()
            ctx.ellipse(cx - 1, y + 59, 10, 6, h1, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#fde047'
            ctx.beginPath()
            ctx.ellipse(cx - 3, y + 58, 4, 2.5, h1, 0, Math.PI * 2)
            ctx.fill()
          } else {
            // basalt rock with glowing crack
            ctx.fillStyle = col
            ctx.beginPath()
            ctx.moveTo(cx - 14, y + 50)
            ctx.lineTo(cx + 2, y + 38)
            ctx.lineTo(cx + 16, y + 52)
            ctx.lineTo(cx + 8, y + 70)
            ctx.lineTo(cx - 10, y + 68)
            ctx.closePath()
            ctx.fill()
            ctx.strokeStyle = '#f97316'
            ctx.globalAlpha = 0.6 + Math.sin(t * 4 + k * 2) * 0.3
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(cx - 8, y + 52)
            ctx.lineTo(cx, y + 56)
            ctx.lineTo(cx + 4, y + 50)
            ctx.lineTo(cx + 10, y + 60)
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        } else {
          // pine canopy
          const cx = x0 + sw * (0.25 + h1 * 0.5)
          const r = 12 + h2 * 10
          ctx.fillStyle = 'rgba(0,0,0,0.25)'
          ctx.beginPath()
          ctx.arc(cx + 4, y + 60 + 5, r, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = col
          ctx.beginPath()
          for (let a = 0; a < 8; a++) {
            const rr = a % 2 ? r * 0.65 : r
            const ang = (a / 8) * Math.PI * 2
            ctx.lineTo(cx + Math.cos(ang) * rr, y + 60 + Math.sin(ang) * rr)
          }
          ctx.fill()
          ctx.fillStyle = b.lights[0]
          ctx.globalAlpha = 0.35
          ctx.beginPath()
          ctx.arc(cx - r * 0.25, y + 60 - r * 0.25, r * 0.35, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      }
      // streetlights with light pools at night
      if (k % 2 === 0) {
        for (const lx of [g.left - 6, g.right + 6]) {
          if (b.night) blit(ctx, glowSprite('rgba(254,240,138,0.35)', 60), lx + (lx < g.W / 2 ? 30 : -30), y + 20, 120, 120)
          ctx.fillStyle = '#334155'
          ctx.fillRect(lx - 3, y + 16, 6, 6)
          ctx.fillStyle = b.night ? '#fef9c3' : '#94a3b8'
          ctx.beginPath()
          ctx.arc(lx + (lx < g.W / 2 ? 10 : -10), y + 20, 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    void t
  }

  function drawRoad(ctx: CanvasRenderingContext2D, b: Biome, t: number) {
    const w = world.current
    const g = geo()
    ctx.fillStyle = b.road
    ctx.fillRect(g.left, 0, g.roadW, g.H)
    // asphalt texture streaks
    ctx.fillStyle = 'rgba(255,255,255,0.025)'
    const tOff = w.scroll % 90
    for (let y = -90 + tOff; y < g.H; y += 90) {
      ctx.fillRect(g.left + g.roadW * 0.15, y, 3, 40)
      ctx.fillRect(g.left + g.roadW * 0.62, y + 45, 4, 30)
    }
    // biome road surface: blown snow, rain puddles, glowing lava cracks
    if (b.props === 'snow' || b.props === 'coast' || b.props === 'volcano') {
      const SEG = 150
      const so = w.scroll % SEG
      const sb = Math.floor(w.scroll / SEG)
      for (let i = -1; i <= Math.ceil(g.H / SEG); i++) {
        const y = i * SEG + so
        const k = sb - i
        const x = g.left + 14 + hash(k * 3.7) * (g.roadW - 28)
        const h2 = hash(k * 9.1)
        if (b.props === 'snow') {
          ctx.fillStyle = 'rgba(241,245,249,0.22)'
          ctx.beginPath()
          ctx.ellipse(x, y, 26 + h2 * 22, 6 + h2 * 4, -0.15, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = 'rgba(241,245,249,0.14)'
          ctx.beginPath()
          ctx.ellipse(x + 30, y + 40, 18, 4, -0.2, 0, Math.PI * 2)
          ctx.fill()
        } else if (b.props === 'coast') {
          ctx.fillStyle = 'rgba(56,189,248,0.12)'
          ctx.beginPath()
          ctx.ellipse(x, y, 20 + h2 * 16, 7 + h2 * 4, 0, 0, Math.PI * 2)
          ctx.fill()
          const rp = (t * 1.6 + h2) % 1
          ctx.strokeStyle = `rgba(186,230,253,${0.35 * (1 - rp)})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.ellipse(x + 4, y, 4 + rp * 12, 2 + rp * 4, 0, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          ctx.strokeStyle = '#f97316'
          ctx.globalAlpha = 0.35 + Math.sin(t * 3 + k) * 0.2
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(x - 18, y - 6)
          ctx.lineTo(x - 6, y + 2)
          ctx.lineTo(x + 2, y - 4)
          ctx.lineTo(x + 16, y + 6)
          ctx.moveTo(x + 2, y - 4)
          ctx.lineTo(x + 6, y - 14)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }
    }
    // lane dashes
    const dashOff = w.scroll % 64
    ctx.fillStyle = b.dash
    for (let l = 1; l < LANES; l++) {
      const x = g.left + g.laneW * l - 1.5
      for (let y = -64 + dashOff; y < g.H; y += 64) ctx.fillRect(x, y, 3, 32)
    }
    // glowing edges
    for (const [x, col] of [
      [g.left + 3, b.edge],
      [g.right - 3, b.edge2],
    ] as const) {
      ctx.strokeStyle = col
      ctx.globalAlpha = b.night ? 0.25 : 0.15
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, g.H)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, g.H)
      ctx.stroke()
    }
    // Personal best line
    if (w.bestDist > 200 && phaseRef.current !== 'idle') {
      const by = g.py - (w.bestDist - w.d) * PXM
      if (by > -20 && by < g.H + 20) {
        for (let i = 0; i < 16; i++) {
          ctx.fillStyle = i % 2 ? '#fde047' : '#111827'
          ctx.fillRect(g.left + (g.roadW / 16) * i, by - 5, g.roadW / 16 + 0.5, 10)
        }
        ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'left'
        ctx.fillStyle = '#fde047'
        ctx.fillText('BEST', g.left + 6, by - 12)
      }
    }
    // Kilometre gates: painted line + bunting on the edge posts
    if (phaseRef.current !== 'idle') {
      const km = Math.floor((w.d + g.py / PXM) / 1000) * 1000
      const ky = g.py - (km - w.d) * PXM
      if (km >= 1000 && ky > -40 && ky < g.H + 40) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.fillRect(g.left, ky - 2, g.roadW, 4)
        ctx.font = "900 26px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.globalAlpha = 0.55
        ctx.fillText(`${km / 1000} KM`, g.W / 2, ky + 30)
        ctx.globalAlpha = 1
        ctx.strokeStyle = 'rgba(15,23,42,0.6)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(g.left - 6, ky)
        ctx.quadraticCurveTo(g.W / 2, ky + 16, g.right + 6, ky)
        ctx.stroke()
        for (let i = 0; i < 14; i++) {
          const u = (i + 0.5) / 14
          const fx0 = g.left - 6 + (g.roadW + 12) * u
          const fy = ky + 16 * 4 * u * (1 - u) * 0.5 + Math.sin(t * 6 + i) * 1.2
          ctx.fillStyle = i % 2 ? b.edge : b.edge2
          ctx.beginPath()
          ctx.moveTo(fx0 - 6, fy)
          ctx.lineTo(fx0 + 6, fy)
          ctx.lineTo(fx0, fy + 11)
          ctx.closePath()
          ctx.fill()
        }
        for (const x of [g.left - 6, g.right + 6]) {
          ctx.fillStyle = '#0f172a'
          ctx.beginPath()
          ctx.arc(x, ky, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#e2e8f0'
          ctx.beginPath()
          ctx.arc(x - 1, ky - 1, 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    if (b.props === 'snow') {
      // packed snow along the shoulders
      ctx.fillStyle = 'rgba(241,245,249,0.55)'
      ctx.fillRect(g.left, 0, 7, g.H)
      ctx.fillRect(g.right - 7, 0, 7, g.H)
    }
  }

  function drawVehicle(ctx: CanvasRenderingContext2D, v: Vehicle, t: number, night: boolean) {
    const kind = v.kind
    const [bw, bh] = VSIZE[kind]
    const alpha = v.knocked ? Math.min(1, v.life * 1.5) : 1
    ctx.globalAlpha = alpha
    if (v.wrong && !v.knocked) {
      // oncoming headlights blaze down the lane (always, so it reads in daylight too)
      ctx.globalAlpha = night ? 1 : 0.7
      blit(ctx, beamSprite(), v.x, v.y + bh / 2 + 82, 90, 170, Math.PI)
      ctx.globalAlpha = alpha
    } else if (night && !v.knocked && !v.parked) blit(ctx, beamSprite(), v.x, v.y - bh / 2 - 82, 90, 170)
    const rot = v.rot + (v.parked ? 0 : (v.tx - v.x) * 0.004)
    blit(ctx, vehicleSprite(kind, v.color), v.x, v.y, bw, bh, rot)
    // blinkers
    if (v.blink && Math.floor(t * 4) % 2 === 0) {
      const sx = v.x + v.blink * (bw / 2 - 2)
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.arc(sx, v.y - bh / 2 + 4, 3.5, 0, Math.PI * 2)
      ctx.arc(sx, v.y + bh / 2 - 4, 3.5, 0, Math.PI * 2)
      ctx.fill()
      blit(ctx, glowSprite('rgba(251,191,36,0.8)', 14), sx, v.y - bh / 2 + 4, 28, 28)
      blit(ctx, glowSprite('rgba(251,191,36,0.8)', 14), sx, v.y + bh / 2 - 4, 28, 28)
    }
    if (v.police) {
      const on = Math.floor(t * 7) % 2 === 0
      ctx.save()
      ctx.translate(v.x, v.y)
      ctx.rotate(v.rot)
      ctx.fillStyle = on ? '#ef4444' : '#7f1d1d'
      ctx.fillRect(-bw * 0.36, bh * 0.02, bw * 0.36, 6)
      ctx.fillStyle = on ? '#1e3a8a' : '#3b82f6'
      ctx.fillRect(0, bh * 0.02, bw * 0.36, 6)
      ctx.restore()
      blit(ctx, glowSprite(on ? 'rgba(239,68,68,0.6)' : 'rgba(59,130,246,0.6)', 40), v.x, v.y, 80, 80)
    } else if (v.wrong && !v.knocked) {
      // flashing hazards + bright headlights at the (downward) nose
      const on = Math.floor(t * 6) % 2 === 0
      for (const s of [-1, 1]) {
        blit(ctx, glowSprite('rgba(254,249,195,0.9)', 14), v.x + s * (bw / 2 - 7), v.y + bh / 2 - 2, 28, 28)
        if (on) blit(ctx, glowSprite('rgba(251,146,60,0.85)', 12), v.x + s * (bw / 2 - 2), v.y, 24, 24)
      }
    } else if (night && !v.knocked) {
      blit(ctx, glowSprite('rgba(239,68,68,0.55)', 10), v.x - bw / 2 + 7, v.y + bh / 2 - 2, 20, 20)
      blit(ctx, glowSprite('rgba(239,68,68,0.55)', 10), v.x + bw / 2 - 7, v.y + bh / 2 - 2, 20, 20)
    }
    ctx.globalAlpha = 1
  }

  function drawPlayer(ctx: CanvasRenderingContext2D, t: number, night: boolean) {
    const w = world.current
    const p = w.p
    const g = geo()
    if (phaseRef.current === 'over') return
    const blink = p.inv > 0 && Math.floor(t * 12) % 2 === 0
    // motion-blur ghosts while boosting
    if (p.nitroT > 0) {
      for (let i = 3; i >= 1; i--) {
        ctx.globalAlpha = 0.12 * (4 - i)
        blit(ctx, vehicleSprite('player', '#06b6d4'), p.x - p.vx * 0.012 * i, g.py + i * 16, p.w, p.h, p.rot)
      }
      ctx.globalAlpha = 1
      const fl = 18 + Math.random() * 16
      for (const s of [-8, 8]) {
        ctx.fillStyle = '#f0abfc'
        ctx.beginPath()
        ctx.moveTo(p.x + s - 5, g.py + p.h / 2 - 2)
        ctx.lineTo(p.x + s + 5, g.py + p.h / 2 - 2)
        ctx.lineTo(p.x + s, g.py + p.h / 2 + fl)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(p.x + s - 2.5, g.py + p.h / 2 - 2)
        ctx.lineTo(p.x + s + 2.5, g.py + p.h / 2 - 2)
        ctx.lineTo(p.x + s, g.py + p.h / 2 + fl * 0.5)
        ctx.fill()
      }
    }
    if (night) blit(ctx, beamSprite(), p.x, g.py - p.h / 2 - 82, 90, 170)
    blit(ctx, glowSprite(p.nitroT > 0 ? 'rgba(240,171,252,0.65)' : 'rgba(34,211,238,0.45)', 46), p.x, g.py + 4, 92, 92)
    if (!blink) blit(ctx, vehicleSprite('player', '#06b6d4'), p.x, g.py, p.w, p.h, p.rot)
    // armor bubble
    if (p.shields > 0 && phaseRef.current === 'play') {
      ctx.strokeStyle = 'rgba(147,197,253,0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(p.x, g.py, p.w * 0.85, p.h * 0.66, p.rot, 0, Math.PI * 2)
      ctx.stroke()
    }
    // magnet aura
    if (p.magnetT > 0) {
      ctx.strokeStyle = 'rgba(244,114,182,0.4)'
      ctx.setLineDash([6, 8])
      ctx.lineDashOffset = -t * 40
      ctx.beginPath()
      ctx.arc(p.x, g.py, 70 + Math.sin(t * 6) * 4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  function drawBarrel(ctx: CanvasRenderingContext2D, o: Obstacle) {
    ctx.save()
    ctx.translate(o.x, o.y)
    ctx.scale(1.25, 1.25)
    if (o.knocked) {
      blit(ctx, barrelSprite(), 0, 0, 26, 36, o.rot)
      ctx.restore()
      return
    }
    blit(ctx, barrelSprite(), 0, 0, 26, 36)
    // rolling hazard stripes wrap around the drum
    ctx.beginPath()
    ctx.roundRect(-13, -15, 26, 30, 4)
    ctx.clip()
    for (let i = 0; i < 2; i++) {
      const u = ((((o.ph ?? 0) / 16 + i) % 2) + 2) % 2 // 0..2 around the drum
      if (u > 1) continue
      const sx = -13 + u * 26
      ctx.globalAlpha = Math.sin(u * Math.PI) * 0.95
      ctx.fillStyle = '#fde047'
      ctx.fillRect(sx - 3, -15, 6, 30)
      ctx.fillStyle = '#111827'
      ctx.fillRect(sx - 3, -3, 6, 6)
    }
    ctx.restore()
    ctx.globalAlpha = 1
  }

  function drawBoss(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const b = w.boss
    if (!b) return
    const g = geo()
    const [bw, bh] = BOSS_SIZE
    // drop telegraph: lane glows red from the rear door down to the player row
    if (b.warnT > 0 && b.state === 'fight') {
      const x = laneX(b.warnLane)
      const k = 1 - b.warnT
      const top = b.y + bh / 2
      const grd = ctx.createLinearGradient(0, top, 0, g.py + 60)
      grd.addColorStop(0, 'rgba(239,68,68,0.45)')
      grd.addColorStop(1, 'rgba(239,68,68,0)')
      ctx.fillStyle = grd
      ctx.fillRect(x - g.laneW / 2 + 3, top, g.laneW - 6, g.py + 60 - top)
      ctx.strokeStyle = '#f87171'
      ctx.lineWidth = 4
      ctx.globalAlpha = 0.5 + Math.sin(t * 20) * 0.4
      for (let i = 0; i < 3; i++) {
        const yy = top + 30 + i * 22 + k * 20
        ctx.beginPath()
        ctx.moveTo(x - 12, yy - 6)
        ctx.lineTo(x, yy + 5)
        ctx.lineTo(x + 12, yy - 6)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    const fade = b.state === 'dead' ? Math.max(0, 1 - b.t / 1.4) : 1
    ctx.globalAlpha = fade
    const sway = (b.x - laneX(b.lane)) * -0.0015 + (b.state === 'dead' ? b.t * 0.6 : 0)
    blit(ctx, bossSprite(), b.x, b.y, bw, bh, sway)
    if (b.hitT > 0 && Math.floor(b.hitT * 30) % 2 === 0) {
      ctx.globalAlpha = 0.5 * fade
      blit(ctx, glowSprite('rgba(196,181,253,0.9)', 60), b.x, b.y, bw * 1.8, bh * 1.2)
      ctx.globalAlpha = fade
    }
    // glowing eyes, tail lights, rear door when about to drop
    const eyeCol = b.hitT > 0 ? 'rgba(255,255,255,0.95)' : b.hp === 1 ? 'rgba(250,204,21,0.9)' : 'rgba(239,68,68,0.9)'
    for (const [ex, ey] of BOSS_EYES) {
      const c = Math.cos(sway)
      const s = Math.sin(sway)
      blit(ctx, glowSprite(eyeCol, 12), b.x + ex * c - ey * s, b.y + ex * s + ey * c, 24 + Math.sin(t * 8) * 3, 24 + Math.sin(t * 8) * 3)
    }
    const brake = b.warnT > 0 && Math.floor(t * 10) % 2 === 0
    for (const s of [-1, 1]) blit(ctx, glowSprite(brake ? 'rgba(254,202,202,0.95)' : 'rgba(239,68,68,0.75)', 14), b.x + s * (bw / 2 - 8), b.y + bh / 2 - 4, 28, 28)
    if (b.blink && Math.floor(t * 4) % 2 === 0) blit(ctx, glowSprite('rgba(251,191,36,0.9)', 14), b.x + b.blink * (bw / 2), b.y + bh / 2 - 10, 28, 28)
    ctx.globalAlpha = 1
    // HP pips + timer bar beside the rig
    if (b.state === 'fight' || b.state === 'enter') {
      const px = b.x - 30
      const py = b.y - bh / 2 - 18
      for (let i = 0; i < BOSS_HP; i++) {
        ctx.fillStyle = i < b.hp ? '#ef4444' : 'rgba(255,255,255,0.18)'
        ctx.beginPath()
        ctx.roundRect(px + i * 21, py, 18, 7, 3)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fillRect(px, py + 10, 60, 3)
      ctx.fillStyle = '#fde68a'
      ctx.fillRect(px, py + 10, 60 * clamp(b.time / 34, 0, 1), 3)
    }
  }

  function drawHazardWarnings(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const g = geo()
    for (const h of w.hz) {
      const k = clamp(1 - h.t / h.t0, 0, 1)
      const flash = Math.floor(t * 10) % 2 === 0
      if (h.kind === 'rock') {
        const x = laneX(h.lane)
        const y = g.H * 0.2
        // growing shadow + shrinking reticle, then the rock drops in
        ctx.fillStyle = `rgba(0,0,0,${0.15 + k * 0.3})`
        ctx.beginPath()
        ctx.ellipse(x + 3, y + 5, 8 + k * 12, 5 + k * 8, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = flash ? '#ef4444' : '#fca5a5'
        ctx.lineWidth = 3
        const r = 34 - k * 14
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(x - r - 6, y)
        ctx.lineTo(x - r + 6, y)
        ctx.moveTo(x + r - 6, y)
        ctx.lineTo(x + r + 6, y)
        ctx.moveTo(x, y - r - 6)
        ctx.lineTo(x, y - r + 6)
        ctx.moveTo(x, y + r - 6)
        ctx.lineTo(x, y + r + 6)
        ctx.stroke()
        if (h.t < 0.35) {
          const f = h.t / 0.35
          blit(ctx, rockSprite(h.lane % 4), x, y - f * 120, 36 * (1 + f * 0.8), 34 * (1 + f * 0.8), f * 3)
        }
      } else if (h.kind === 'wrong') {
        const x = laneX(h.lane)
        // headlights rushing toward the top edge + danger lane
        const grd = ctx.createLinearGradient(0, 0, 0, g.py)
        grd.addColorStop(0, `rgba(254,249,195,${0.25 + k * 0.25})`)
        grd.addColorStop(1, 'rgba(254,249,195,0)')
        ctx.fillStyle = grd
        ctx.fillRect(x - g.laneW / 2 + 4, 0, g.laneW - 8, g.py)
        for (const s of [-1, 1]) blit(ctx, glowSprite('rgba(254,249,195,0.95)', 20), x + s * 11, 6, 30 + k * 30, 30 + k * 30)
        drawTriangle(ctx, x, 96, flash ? '#ef4444' : '#f97316')
      } else {
        const y = g.H * 0.2
        const sx = h.side < 0 ? g.left : g.right
        // dashed track across the road + arrow at the entry side
        ctx.strokeStyle = flash ? '#ef4444' : '#fca5a5'
        ctx.globalAlpha = 0.5 + k * 0.4
        ctx.lineWidth = 3
        ctx.setLineDash([10, 8])
        ctx.lineDashOffset = h.side * t * 60
        ctx.beginPath()
        ctx.moveTo(g.left + 4, y)
        ctx.lineTo(g.right - 4, y)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
        ctx.fillStyle = flash ? '#ef4444' : '#f97316'
        ctx.beginPath()
        ctx.moveTo(sx - h.side * 26, y)
        ctx.lineTo(sx - h.side * 4, y - 13)
        ctx.lineTo(sx - h.side * 4, y + 13)
        ctx.closePath()
        ctx.fill()
      }
    }
  }

  function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, col: string) {
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.moveTo(x, y - 15)
    ctx.lineTo(x + 16, y + 12)
    ctx.lineTo(x - 16, y + 12)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - 2, y - 6, 4, 10)
    ctx.fillRect(x - 2, y + 6, 4, 3.5)
  }

  function drawAmbient(ctx: CanvasRenderingContext2D, b: Biome, raw: number, t: number) {
    const w = world.current
    const g = geo()
    if (!b.amb) return
    const dy = w.speed * PXM * raw
    const n = b.amb === 'snow' ? 64 : b.amb === 'rain' ? 56 : 34
    for (let i = 0; i < n; i++) {
      const a = w.amb[i]
      if (b.amb === 'snow') {
        a.y += raw * (50 + a.s * 70) + dy * 0.25
        a.x += Math.sin(t * 1.4 + a.ph) * 22 * raw
      } else if (b.amb === 'rain') {
        a.y += raw * 900 + dy * 0.3
        a.x -= raw * 140
      } else {
        a.y += dy * 0.3 - raw * (50 + a.s * 60)
        a.x += Math.sin(t * 2 + a.ph) * 26 * raw
      }
      if (a.y > g.H + 10) {
        a.y = -10
        a.x = Math.random() * g.W
      } else if (a.y < -12) {
        a.y = g.H + 8
        a.x = Math.random() * g.W
      }
      if (a.x < -10) a.x = g.W + 8
      else if (a.x > g.W + 10) a.x = -8
    }
    if (b.amb === 'snow') {
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < n; i++) {
        const a = w.amb[i]
        ctx.globalAlpha = 0.5 + a.s * 0.45
        ctx.beginPath()
        ctx.arc(a.x, a.y, 1.2 + a.s * 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (b.amb === 'rain') {
      ctx.strokeStyle = '#bae6fd'
      ctx.lineWidth = 1.2
      ctx.globalAlpha = 0.35
      ctx.beginPath()
      for (let i = 0; i < n; i++) {
        const a = w.amb[i]
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(a.x - 3, a.y + 14 + a.s * 8)
      }
      ctx.stroke()
      // lightning over the sea
      w.boltT -= raw
      if (w.boltT <= 0) {
        w.boltT = rand(4.5, 8)
        w.bolt.t = 0.28
        const pts: number[] = []
        let x = rand(0, Math.max(30, g.left))
        for (let y = 0; y <= g.H * 0.45; y += g.H * 0.075) {
          pts.push(x, y)
          x += rand(-18, 18)
        }
        w.bolt.pts = pts
        if (phaseRef.current === 'play') {
          fx.flash('#e0f2fe', 0.16)
          sfx.boom(0.12)
        }
      }
      if (w.bolt.t > 0) {
        w.bolt.t -= raw
        for (const [lw, col] of [[6, 'rgba(167,139,250,0.5)'], [2.5, '#ffffff']] as const) {
          ctx.globalAlpha = Math.min(1, w.bolt.t * 6)
          ctx.strokeStyle = col
          ctx.lineWidth = lw
          ctx.beginPath()
          for (let i = 0; i < w.bolt.pts.length; i += 2) ctx.lineTo(w.bolt.pts[i], w.bolt.pts[i + 1])
          ctx.stroke()
        }
      }
    } else {
      for (let i = 0; i < n; i++) {
        const a = w.amb[i]
        ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 5 + a.ph)
        ctx.fillStyle = a.s > 0.6 ? '#fde047' : '#fb923c'
        ctx.fillRect(a.x - 1.5, a.y - 1.5, 2 + a.s * 2, 2 + a.s * 2)
        if (a.s > 0.75) blit(ctx, glowSprite('rgba(249,115,22,0.5)', 8), a.x, a.y, 16, 16)
      }
    }
    ctx.globalAlpha = 1
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    update(dt, raw)
    const g = geo()
    const b = BIOMES[w.biome]

    fx.applyShake(ctx)
    drawRoadside(ctx, b, t)
    drawRoad(ctx, b, t)

    // painted / ground obstacles first
    for (const o of w.obs) {
      if (o.kind === 'oil') {
        ctx.globalAlpha = o.knocked ? 0.6 : 1
        blit(ctx, oilSprite(), o.x, o.y, 64, 40)
        ctx.globalAlpha = 1
      } else if (o.kind === 'arrow' || o.kind === 'gap') {
        const col = o.kind === 'gap' ? '#4ade80' : '#fb923c'
        const pulse = 0.55 + Math.sin(t * 8) * 0.35
        ctx.strokeStyle = col
        ctx.globalAlpha = pulse
        ctx.lineWidth = 5
        for (let i = 0; i < 3; i++) {
          const yy = o.y + 26 - i * 20
          ctx.beginPath()
          if (o.kind === 'gap') {
            ctx.moveTo(o.x - 14, yy + 8)
            ctx.lineTo(o.x, yy - 6)
            ctx.lineTo(o.x + 14, yy + 8)
          } else {
            ctx.moveTo(o.x - 14, yy - 8)
            ctx.lineTo(o.x, yy + 6)
            ctx.lineTo(o.x + 14, yy - 8)
          }
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
    }
    for (const pk of w.picks) {
      const bob = Math.sin(pk.t * 5) * 2
      if (pk.kind === 'coin') {
        const sx = Math.abs(Math.cos(pk.t * 4))
        ctx.save()
        ctx.translate(pk.x, pk.y + bob)
        ctx.scale(0.35 + sx * 0.65, 1)
        blit(ctx, coinSprite(), 0, 0, 22, 22)
        ctx.restore()
      } else blit(ctx, pickupSprite(pk.kind), pk.x, pk.y + bob, 30 + Math.sin(pk.t * 6) * 2, 30 + Math.sin(pk.t * 6) * 2)
    }
    for (const v of w.vehicles) drawVehicle(ctx, v, t, b.night)
    for (const o of w.obs) {
      if (o.kind === 'cone') blit(ctx, coneSprite(), o.x, o.y, 18, 18, o.rot)
      else if (o.kind === 'barrier') blit(ctx, barrierSprite(Math.round(o.w)), o.x, o.y, Math.round(o.w), 16, o.rot)
      else if (o.kind === 'rock') blit(ctx, rockSprite(o.v ?? 0), o.x, o.y, 36, 34, o.rot)
      else if (o.kind === 'crate') blit(ctx, crateSprite(), o.x, o.y, 32, 32, o.rot)
      else if (o.kind === 'barrel') drawBarrel(ctx, o)
    }
    drawBoss(ctx, t)
    drawPlayer(ctx, t, b.night)
    drawHazardWarnings(ctx, t)
    for (const z of w.zaps) {
      // jagged EMP bolt from the player to the boss
      ctx.strokeStyle = z.t > 0.2 ? '#f5f3ff' : '#a78bfa'
      ctx.lineWidth = 2 + z.t * 8
      ctx.globalAlpha = Math.min(1, z.t * 4)
      ctx.beginPath()
      ctx.moveTo(z.x0, z.y0)
      for (let i = 1; i < 8; i++) {
        const u = i / 8
        ctx.lineTo(z.x0 + (z.x1 - z.x0) * u + rand(-14, 14), z.y0 + (z.y1 - z.y0) * u)
      }
      ctx.lineTo(z.x1, z.y1)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // police warnings from behind
    for (const wn of w.warns) {
      const x = laneX(wn.lane)
      const on = Math.floor(wn.t * 10) % 2 === 0
      ctx.fillStyle = on ? '#ef4444' : '#3b82f6'
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.moveTo(x, H - 46)
      ctx.lineTo(x - 16, H - 22)
      ctx.lineTo(x + 16, H - 22)
      ctx.closePath()
      ctx.fill()
      blit(ctx, glowSprite(on ? 'rgba(239,68,68,0.6)' : 'rgba(59,130,246,0.6)', 40), x, H - 30, 80, 80)
      ctx.globalAlpha = 1
    }
    // helicopter searchlight during the chase
    if (w.ev === 'police' && phaseRef.current === 'play') {
      const sx = w.p.x + Math.sin(t * 1.3) * 26
      blit(ctx, glowSprite('rgba(255,255,255,0.22)', 80), sx, g.py - 10, 160, 160)
    }

    // speed lines when fast
    const fast = clamp((w.speed - 34) / 30, 0, 1) + (w.p.nitroT > 0 ? 0.8 : 0)
    if (fast > 0.05) {
      ctx.strokeStyle = w.p.nitroT > 0 ? '#a5f3fc' : '#ffffff'
      ctx.lineWidth = 1.5
      for (let i = 0; i < 10 * fast; i++) {
        const x = Math.random() * W
        const y = Math.random() * H
        ctx.globalAlpha = 0.12 + Math.random() * 0.2
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + 40 + fast * 60)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    fx.draw(ctx)
    drawAmbient(ctx, b, raw, t)
    ctx.restore()
    if (b.tint) {
      ctx.fillStyle = b.tint
      ctx.fillRect(0, 0, W, H)
    }
    if (b.night) {
      const vg = ctx.createRadialGradient(W / 2, H * 0.6, H * 0.25, W / 2, H * 0.55, H * 0.8)
      vg.addColorStop(0, 'rgba(0,0,0,0)')
      vg.addColorStop(1, 'rgba(0,0,10,0.5)')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, W, H)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.left = true
      else if (e.key === 'ArrowRight' || e.key === 'd') keys.current.right = true
      else if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        fireNitro()
      }
    }
    function up(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.left = false
      else if (e.key === 'ArrowRight' || e.key === 'd') keys.current.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // Dev-only jump-ahead hooks for screenshots: window.__en2racer
  const dbg = useRef({ skip: (m: number) => void m, biome: (i: number) => void i, event: (k: string) => void k })
  dbg.current = {
    skip(m: number) {
      const w = world.current
      if (phaseRef.current !== 'play') return
      w.d = m
      w.milestone = Math.floor(m / 500) * 500 + 500
      w.bestPassed = true
      w.nextEv = Math.max(w.nextEv, m + 250)
      w.nextBoss = Math.max(w.nextBoss, m + 400)
      w.hzD = 200
      w.p.shields = 5
    },
    biome(i: number) {
      dbg.current.skip(i * 1000 + 30)
    },
    event(k: string) {
      const w = world.current
      if (phaseRef.current !== 'play') return
      if (k === 'boss') {
        w.ev = null
        startBoss()
      } else if (k === 'rock' || k === 'wrong' || k === 'barrel') queueHazard(k, !w.hzSeen.has(k))
      else if (k === 'emp') w.picks.push({ kind: 'emp', x: laneX(laneOf(w.p.x)), y: geo().py - 260, taken: false, t: 0 })
      else if (k === 'zap') hitBoss()
      else if (k === 'armor') w.p.shields = 5
      else if (k in UNLOCK) startEvent(k as EventKind)
    },
  }
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__en2racer = {
      skip: (m: number) => dbg.current.skip(m),
      biome: (i: number) => dbg.current.biome(i),
      event: (k: string) => dbg.current.event(k),
    }
    return () => {
      delete win.__en2racer
    }
  }, [])

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = localPoint(e, e.currentTarget)
    drag.current = { id: e.pointerId, x0: pt.x, tx0: world.current.p.tx }
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const pt = localPoint(e, e.currentTarget)
    world.current.p.tx = d.tx0 + (pt.x - d.x0) * 1.35
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null
  }

  const ready = hud.nitro >= 0.25
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">{hud.dist} m</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">{hud.kmh} km/h</span>
                <span className="racer-pips">{Array.from({ length: hud.shields }, (_, i) => <i key={i} />)}</span>
                {hud.combo > 1 ? <span className="action-hud__small racer-combo">Combo x{hud.combo}</span> : null}
              </div>
            </div>
          )}
          {phase === 'play' && (
            <button
              type="button"
              className={`racer-nitro${hud.on ? ' is-on' : ready ? ' is-ready' : ''}`}
              style={{ ['--k' as string]: hud.on ? 1 : hud.nitro }}
              onPointerDown={(e) => {
                e.stopPropagation()
                fireNitro()
              }}
            >
              <span>NITRO</span>
            </button>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle game="racer" icon={meta.icon} title={meta.title} hint="Drag to steer through traffic. Shave past cars to fill nitro, then hit NITRO to smash through." onPlay={start} />
          )}
          <ActionResult
            run={run}
            title={hud.dist >= 1500 ? 'Road legend!' : 'Wrecked!'}
            subtitle={`Score ${hud.score} · ${hud.dist} m`}
            celebrate={hud.dist >= 1500}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
