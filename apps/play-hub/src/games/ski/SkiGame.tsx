import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import {
  blit,
  blitBase,
  cabinSprite,
  coinSprite,
  drawFlag,
  drawSkier,
  drawYeti,
  iceSprite,
  mogulSprite,
  rampSprite,
  rockSprite,
  stumpSprite,
  treeSprite,
} from './art'
import { drawAurora, drawAvalanche, drawBlizzard, drawBoost, drawCheckpoint, drawCrevasse, drawGroundLayer, drawRollWarn, drawSnowball } from './content'
import '../../shared/action/action.css'
import './ski.css'

const meta = getGame('ski')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type ObKind = 'tree' | 'bigtree' | 'rock' | 'stump' | 'ramp' | 'mogul' | 'ice' | 'cabin' | 'coin' | 'tower' | 'crevasse' | 'boost'

const PXM = 20
const BEST_KEY = 'todaypuzzle.ski.bestDist'
const TAU = Math.PI * 2

type Ob = { kind: ObKind; x: number; y: number; r: number; hit: boolean; shake: number; open?: boolean }
type Gate = { x: number; y: number; half: number; color: string; done: boolean; course: number; last: boolean }
type Npc = { kind: 'skier' | 'boarder'; x: number; y: number; ang: number; v: number; t: number; jacket: string; pants: string; hat: string; crashed: number }
type Biome = {
  name: string
  snowTop: string
  snowBot: string
  streak: string
  treeDark: string
  treeMid: string
  tint?: string
  night: boolean
  trees: number
  ice: number
  amb?: 'aurora' | 'blizzard'
  crev?: number
  sub?: string
  flake?: string
}

const BIOMES: Biome[] = [
  { name: 'Bluebird Slope', snowTop: '#f8fbff', snowBot: '#e3eefb', streak: 'rgba(120,160,220,0.18)', treeDark: '#1f5135', treeMid: '#2f7048', night: false, trees: 1, ice: 0 },
  { name: 'Pine Forest', snowTop: '#f1f7fd', snowBot: '#dbe8f6', streak: 'rgba(110,150,210,0.2)', treeDark: '#173f2a', treeMid: '#25613e', night: false, trees: 1.6, ice: 0 },
  { name: 'Sunset Run', snowTop: '#fff1ea', snowBot: '#f6d9e6', streak: 'rgba(220,130,160,0.2)', treeDark: '#3b2a4a', treeMid: '#5b3f66', tint: 'rgba(251,146,60,0.08)', night: false, trees: 1.2, ice: 0.3 },
  { name: 'Blizzard Pass', snowTop: '#eef2f7', snowBot: '#d3dbe6', streak: 'rgba(148,163,184,0.32)', treeDark: '#2b3a48', treeMid: '#405569', tint: 'rgba(226,232,240,0.1)', night: false, trees: 0.9, ice: 0.5, amb: 'blizzard', crev: 1.3, sub: 'gusts push you sideways' },
  { name: 'Night Slope', snowTop: '#c7d4ef', snowBot: '#9fb2da', streak: 'rgba(40,60,120,0.25)', treeDark: '#0f2a2a', treeMid: '#18413d', night: true, trees: 1.2, ice: 0.4 },
  { name: 'Glacier', snowTop: '#effaff', snowBot: '#cfeefc', streak: 'rgba(56,189,248,0.22)', treeDark: '#1e3a4a', treeMid: '#2a5468', night: false, trees: 0.7, ice: 1, crev: 1.6 },
  { name: 'Aurora Ridge', snowTop: '#c4cdf2', snowBot: '#93a3db', streak: 'rgba(52,211,153,0.25)', treeDark: '#0b2530', treeMid: '#134440', night: true, trees: 1, ice: 0.6, amb: 'aurora', crev: 1, sub: 'the sky is on fire', flake: '#a7f3d0' },
]
const NPC_COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#a855f7', '#ec4899', '#14b8a6']

type Skier = {
  x: number
  y: number
  ang: number
  target: number
  v: number
  air: number
  airMax: number
  airH: number
  spin: number
  grab: number
  grabs: number
  touched: boolean
  hop: boolean
  crash: number
  inv: number
  lives: number
  ice: boolean
  boost: number
}

type Yeti = { x: number; y: number; t: number; dur: number; leaving: boolean; munch: number }
/** Rolling snowball: `warn` > 0 while telegraphing at the slope edge. */
type Roller = { x: number; y: number; vx: number; vy: number; r: number; roll: number; warn: number; side: number; near: boolean; jit: number }
type Avalanche = { warn: number; t: number; dur: number; front: number; buried: number; hold: number; leaving: boolean }

const ROLL_FROM = 1000
const CREV_FROM = 2000
const BOOST_FROM = 600
const AVA_FIRST = 2800
const AVA_GAP = 2400
const MAX_ROLLERS = 3

type World = {
  sk: Skier
  obs: Ob[]
  gates: Gate[]
  npcs: Npc[]
  yeti: Yeti | null
  yetiWarn: number
  yetiNext: number
  chases: number
  genY: number
  featY: number
  course: number
  courseHits: Map<number, number>
  npcT: number
  camX: number
  camY: number
  tracks: number[]
  combo: number
  bonus: number
  coinsGot: number
  biome: number
  milestone: number
  bestDist: number
  bestPassed: boolean
  hudT: number
  lastTrack: number
  slopeHalf: number
  flakes: { x: number; y: number; z: number }[]
  rollers: Roller[]
  rollT: number
  ava: Avalanche | null
  avaNext: number
  rush: number
  wind: number
  windGoal: number
  windT: number
  intro: Set<string>
  stats: { score: number; distance: number; gates: number; tricks: number; yeti: number }
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function freshWorld(W: number): World {
  const flakes = []
  for (let i = 0; i < 40; i++) flakes.push({ x: Math.random() * 400, y: Math.random() * 700, z: rand(0.4, 1) })
  return {
    sk: { x: 0, y: 0, ang: 0, target: 0, v: 120, air: 0, airMax: 0, airH: 0, spin: 0, grab: 0, grabs: 0, touched: false, hop: false, crash: 0, inv: 0, lives: 3, ice: false, boost: 0 },
    obs: [],
    gates: [],
    npcs: [],
    yeti: null,
    yetiWarn: 0,
    yetiNext: 1200,
    chases: 0,
    genY: 200,
    featY: 700,
    course: 0,
    courseHits: new Map(),
    npcT: 4,
    camX: 0,
    camY: 0,
    tracks: [],
    combo: 0,
    bonus: 0,
    coinsGot: 0,
    biome: 0,
    milestone: 250,
    bestDist: readBest(),
    bestPassed: false,
    hudT: 0,
    lastTrack: 0,
    slopeHalf: Math.max(300, W * 0.8),
    flakes,
    rollers: [],
    rollT: 2,
    ava: null,
    avaNext: AVA_FIRST,
    rush: 0,
    wind: 0,
    windGoal: 0,
    windT: 3,
    intro: new Set(),
    stats: { score: 0, distance: 0, gates: 0, tricks: 0, yeti: 0 },
  }
}

/** Crevasses stay a hairline crack until the skier is close, then split open. */
function crevOpen(o: Ob, skY: number) {
  return clamp((300 - (o.y - skY)) / 150, 0, 1)
}

function hash(n: number) {
  const s = Math.sin(n * 91.7 + 13.3) * 43758.5453
  return s - Math.floor(s)
}

export default function SkiGame() {
  const run = useActionRun('ski')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 620 })
  const world = useRef<World>(freshWorld(360))
  const phaseRef = useRef<Phase>('idle')
  const ptr = useRef<{ id: number; x: number; y: number; lastX: number } | null>(null)
  const keys = useRef({ left: false, right: false })
  const bannerLock = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, dist: 0, lives: 3, combo: 0, kmh: 0, yeti: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  function say(text: string, sub?: string, low = false) {
    // low-priority banners (distance milestones) never cover an event banner
    const now = performance.now()
    if (low && now < bannerLock.current) return
    if (!low) bannerLock.current = now + 1600
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function skierScreenY() {
    return size.current.h * 0.3
  }
  function toScreen(x: number, y: number) {
    const w = world.current
    return { x: size.current.w / 2 + (x - w.camX), y: y - w.camY }
  }

  function topSpeed() {
    const w = world.current
    return (330 + Math.min(260, (w.sk.y / PXM) * 0.12)) * (1 + run.level('wax') * 0.05) * (w.sk.boost > 0 ? 1.25 : 1)
  }

  function start() {
    void unlockAudio()
    const w = freshWorld(size.current.w)
    w.sk.lives = 3 + run.level('helmet')
    world.current = w
    fx.reset()
    ptr.current = null
    run.begin()
    setPhaseBoth('play')
    say('DROP IN!', 'drag to steer · ramps launch you')
    sfx.ready()
    pushHud()
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.stats.score, dist: Math.floor(w.sk.y / PXM), lives: w.sk.lives, combo: w.combo, kmh: Math.round(w.sk.v * 0.18), yeti: !!w.yeti && !w.yeti.leaving })
  }

  function addOb(kind: ObKind, x: number, y: number, size?: number) {
    const r = size !== undefined ? size : kind === 'tree' ? 10 : kind === 'bigtree' ? 13 : kind === 'rock' ? 15 : kind === 'stump' ? 8 : kind === 'cabin' ? 28 : kind === 'tower' ? 9 : kind === 'ramp' ? 28 : kind === 'mogul' ? 15 : kind === 'ice' ? 40 : 12
    world.current.obs.push({ kind, x, y, r, hit: false, shake: 0 })
  }

  function clearArea(x0: number, x1: number, y0: number, y1: number) {
    const w = world.current
    w.obs = w.obs.filter((o) => !(o.x > x0 && o.x < x1 && o.y > y0 && o.y < y1 && o.kind !== 'coin'))
  }

  function spawnRow(y: number) {
    const w = world.current
    const d = y / PXM
    const b = BIOMES[biomeAt(d)]
    const B = w.slopeHalf
    const density = (0.9 + Math.min(1.7, d / 700)) * b.trees
    let n = Math.floor(density) + (Math.random() < density % 1 ? 1 : 0)
    if (d < 40) n = 0
    if (w.rush > 0) n = Math.floor(n / 2)
    for (let i = 0; i < n; i++) {
      const x = rand(-B + 20, B - 20)
      const r = Math.random()
      if (r < 0.55) addOb(Math.random() < 0.3 ? 'bigtree' : 'tree', x, y + rand(-20, 20))
      else if (r < 0.72) addOb('rock', x, y)
      else if (r < 0.82) addOb('stump', x, y)
      else if (r < 0.9 && d > 300) addOb('mogul', x, y)
      else if (r < 0.9 + 0.08 * b.ice && d > 600) addOb('ice', x, y)
    }
    if (Math.random() < 0.012 && d > 200) addOb('cabin', rand(-B + 60, B - 60), y)
    // crevasses: rarer at first, more on icy biomes; never wider than a steerable gap
    if (d > CREV_FROM && w.ava === null) {
      const pc = Math.min(0.09, 0.03 + (d - CREV_FROM) / 60000) * (b.crev ?? 0.6)
      if (Math.random() < pc) {
        const half = rand(42, 70)
        const cx = rand(-B + half + 30, B - half - 30)
        w.obs = w.obs.filter((o) => !(o.kind !== 'coin' && Math.abs(o.x - cx) < half + 20 && Math.abs(o.y - y) < 40))
        addOb('crevasse', cx, y, half)
      }
    }
    if (d > BOOST_FROM && Math.random() < 0.007) addOb('boost', rand(-B + 40, B - 40), y)
    // gold rush: coin ribbons everywhere
    if (w.rush > 0) {
      const cx = clamp(w.sk.x + Math.sin(y * 0.004) * 120, -B + 30, B - 30)
      for (const off of [-50, 50]) addOb('coin', cx + off, y)
    }
    // chairlift towers on a fixed line
    if (Math.floor(y / 384) !== Math.floor((y - 64) / 384)) {
      const lx = B * 0.55
      w.obs = w.obs.filter((o) => !(Math.abs(o.x - lx) < 30 && Math.abs(o.y - y) < 40))
      addOb('tower', lx, y)
    }
  }

  function biomeAt(d: number) {
    return Math.floor(d / 800) % BIOMES.length
  }

  function placeFeature(y: number) {
    const w = world.current
    const d = y / PXM
    const B = w.slopeHalf
    const r = Math.random()
    const cx = clamp(w.sk.x + rand(-140, 140), -B + 100, B - 100)
    if (r < 0.32) {
      // slalom course: alternating gates
      w.course += 1
      const n = 5
      clearArea(cx - 150, cx + 150, y - 40, y + n * 170 + 40)
      for (let i = 0; i < n; i++) {
        const gx = cx + (i % 2 ? 60 : -60)
        w.gates.push({ x: gx, y: y + i * 170, half: Math.max(30, 44 - d / 200), color: i % 2 ? '#2563eb' : '#ef4444', done: false, course: w.course, last: i === n - 1 })
      }
      w.featY = y + n * 170 + rand(250, 500)
    } else if (r < 0.62 && d > 120) {
      // ramp with a coin arc over the landing
      clearArea(cx - 90, cx + 90, y - 140, y + 420)
      addOb('ramp', cx, y)
      for (let i = 0; i < 6; i++) addOb('coin', cx, y + 60 + i * 50)
      w.featY = y + rand(600, 900)
    } else if (r < 0.75 && d > 500) {
      clearArea(cx - 160, cx + 160, y - 20, y + 360)
      for (let i = 0; i < 14; i++) addOb('mogul', cx + rand(-150, 150), y + rand(0, 340))
      w.featY = y + rand(600, 900)
    } else {
      clearArea(cx - 30, cx + 30, y - 20, y + 340)
      const sway = rand(-1, 1)
      for (let i = 0; i < 8; i++) addOb('coin', cx + Math.sin(i * 0.6) * 40 * sway, y + i * 42)
      w.featY = y + rand(450, 750)
    }
    w.obs.sort((a, b) => a.y - b.y)
    w.gates.sort((a, b) => a.y - b.y)
  }

  function generate() {
    const w = world.current
    const H = size.current.h
    while (w.genY < w.camY + H + 360) {
      w.genY += 64
      if (w.genY >= w.featY) placeFeature(w.genY)
      else spawnRow(w.genY)
    }
    const cut = w.camY - 120
    if (w.obs.length && w.obs[0].y < cut) w.obs = w.obs.filter((o) => o.y > cut)
    if (w.gates.length && w.gates[0].y < cut - 200) w.gates = w.gates.filter((g) => g.y > cut - 200)
  }

  function crash(reason: string) {
    const w = world.current
    const sk = w.sk
    if (sk.crash > 0 || sk.inv > 0) return
    const sp = toScreen(sk.x, sk.y)
    sk.crash = 1.1
    sk.air = 0
    sk.spin = 0
    sk.v = 0
    sk.lives -= 1
    w.combo = 0
    w.tracks.push(NaN, NaN)
    fx.burst(sp.x, sp.y, { count: 26, color: ['#ffffff', '#e0f2fe', '#bae6fd'], speed: 260, size: 4, gravity: 300 })
    fx.text(sp.x, sp.y - 40, reason, '#dc2626', 20)
    fx.shake(10, 0.35)
    fx.stop(0.08)
    fx.flash('#ef4444', 0.22)
    sfx.thud()
    sfx.hurt()
    haptic.heavy()
    pushHud()
    if (sk.lives <= 0) die(false)
  }

  function die(eaten: boolean) {
    const w = world.current
    setPhaseBoth('dying')
    fx.slowmo(1, 0.35)
    fx.shake(14, 0.5)
    sfx.lose()
    haptic.error()
    if (eaten) {
      sfx.boom(0.7)
      fx.flash('#ef4444', 0.35)
    }
    w.stats.score = Math.floor(w.sk.y / PXM) + w.bonus
    pushHud()
    const dist = Math.floor(w.sk.y / PXM)
    if (dist > w.bestDist) {
      try {
        localStorage.setItem(BEST_KEY, String(dist))
      } catch {
        // storage unavailable
      }
    }
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.coinsGot + dist / 120 + w.stats.yeti * 6)
      run.end({ score: w.stats.score, cleared: dist >= 1200, stats: { ...w.stats }, coins }, revive)
    }, 1200)
  }

  function revive() {
    const w = world.current
    const sk = w.sk
    sk.lives = Math.max(1, sk.lives)
    sk.crash = 0
    sk.air = 0
    sk.spin = 0
    sk.inv = 2.5
    sk.v = 160
    sk.ang = 0
    if (w.yeti) {
      w.yeti = null
      w.yetiNext = sk.y / PXM + 500
    }
    const B = 120
    w.obs = w.obs.filter((o) => o.kind === 'coin' || !(Math.abs(o.x - sk.x) < B && o.y > sk.y - 60 && o.y < sk.y + 360))
    w.npcs = w.npcs.filter((n) => Math.abs(n.y - sk.y) > 300)
    w.rollers = []
    w.rollT = 4
    if (w.ava && !w.ava.leaving) {
      w.ava.front = Math.min(w.ava.front, sk.y - 420)
      w.ava.hold = 2.5
    }
    const sp = toScreen(sk.x, sk.y)
    fx.ring(sp.x, sp.y, { color: '#fde047', maxR: 100, life: 0.6, width: 5 })
    say('REVIVED!', 'back on your skis')
    pushHud()
    setPhaseBoth('play')
  }

  function spawnRoller() {
    const w = world.current
    const { w: W, h: H } = size.current
    const sk = w.sk
    const side = Math.random() < 0.5 ? -1 : 1
    const r = rand(21, 26)
    w.rollers.push({
      x: w.camX + side * (W / 2 + r + 12),
      y: sk.y + H * 0.4,
      vx: -side * rand(180, 230),
      vy: Math.max(90, sk.v * rand(0.45, 0.65)),
      r,
      roll: 0,
      warn: 1.35,
      side,
      near: false,
      jit: rand(-50, 40),
    })
    sfx.tick()
  }

  function startAvalanche() {
    const w = world.current
    const dist = w.sk.y / PXM
    w.ava = { warn: 2.2, t: 0, dur: 16, front: w.camY - 300, buried: 0, hold: 0, leaving: false }
    w.rollers = []
    w.yetiNext = Math.max(w.yetiNext, dist + 1100)
    say('AVALANCHE!', 'point your skis downhill and run')
    // ominous sting: rumble, falling tone, second rumble
    sfx.boom(1)
    window.setTimeout(() => sfx.lose(), 200)
    window.setTimeout(() => sfx.boom(0.5), 520)
    haptic.heavy()
    fx.shake(10, 0.9)
  }

  function finishAvalanche() {
    const w = world.current
    const av = w.ava
    if (!av) return
    av.leaving = true
    const dist = w.sk.y / PXM
    w.avaNext = dist + AVA_GAP
    const pts = av.buried ? 400 : 800
    w.bonus += pts
    w.coinsGot += av.buried ? 5 : 10
    w.rush = 9
    say('OUTRUN!', `avalanche survived · +${pts} · GOLD RUSH`)
    sfx.win()
    window.setTimeout(() => sfx.combo(), 260)
    haptic.success()
    const sp = toScreen(w.sk.x, w.sk.y)
    fx.burst(sp.x, sp.y, { count: 36, color: ['#fde047', '#facc15', '#ffffff', '#fef3c7'], speed: 300 })
    fx.ring(sp.x, sp.y, { color: '#fde047', maxR: 140, life: 0.7, width: 6 })
    if (performance.now() - w.lastTrack > 30000) {
      w.lastTrack = performance.now()
      void trackEvent('action_milestone', { game_id: 'ski', kind: 'avalanche', value: Math.floor(dist) })
    }
  }

  /** Dev helper: teleport down the mountain to `m` metres with a clean slope around the skier. */
  function jumpTo(m: number) {
    const w = world.current
    const y = m * PXM
    w.sk.y = y
    w.sk.inv = Math.max(w.sk.inv, 2)
    w.camY = y - skierScreenY()
    w.genY = y + 40
    w.featY = y + 900
    w.obs = []
    w.gates = []
    w.npcs = []
    w.rollers = []
    w.tracks = []
    w.yeti = null
    w.yetiWarn = 0
    w.yetiNext = Math.max(w.yetiNext, m + 500)
    w.avaNext = Math.max(w.avaNext, m + 700)
    w.milestone = Math.floor(m / 250) * 250 + 250
  }

  function land() {
    const w = world.current
    const sk = w.sk
    const sp = toScreen(sk.x, sk.y)
    if (sk.hop) {
      sk.hop = false
      fx.burst(sp.x, sp.y, { count: 6, color: ['#ffffff', '#e0f2fe'], speed: 100, gravity: 200 })
      return
    }
    const rot = ((sk.spin % TAU) + TAU) % TAU
    const dev = Math.min(rot, TAU - rot)
    const tol = 0.75 + run.level('stunt') * 0.12
    const turns = Math.round(Math.abs(sk.spin) / TAU)
    if (dev > tol) {
      sk.spin = 0
      crash('WIPEOUT!')
      return
    }
    const trick = turns > 0 || sk.grabs > 0
    w.combo += 1
    const base = 60 + turns * 260 + sk.grabs * 80
    const pts = Math.round(base * (1 + run.level('stunt') * 0.15) * Math.min(6, w.combo))
    w.bonus += pts
    if (trick) w.stats.tricks += 1
    const name = turns > 0 ? `${turns * 360}${sk.grabs ? ' GRAB' : ''}!` : sk.grabs ? 'GRAB!' : 'CLEAN LANDING'
    fx.text(sp.x, sp.y - 50, `${name} +${pts}`, trick ? '#f59e0b' : '#0369a1', trick ? 22 : 16)
    fx.burst(sp.x, sp.y, { count: trick ? 26 : 12, color: ['#ffffff', '#bae6fd', '#fde047'], speed: 220, gravity: 250 })
    fx.ring(sp.x, sp.y, { color: trick ? '#fde047' : '#ffffff', maxR: 50, life: 0.35 })
    fx.shake(3, 0.12)
    if (trick) {
      sfx.combo()
      haptic.success()
      if (turns >= 2) {
        say(`${turns * 360}!`, 'huge spin')
        fx.slowmo(0.25, 0.5)
      }
    } else {
      sfx.thud()
      haptic.light()
    }
    sk.spin = 0
    sk.grabs = 0
    sk.v *= 1.05
    w.tracks.push(NaN, NaN)
    run.update(w.stats)
  }

  function update(dt: number, raw: number, t: number) {
    const w = world.current
    const sk = w.sk
    const { w: W, h: H } = size.current
    const ph = phaseRef.current
    const live = ph === 'play'
    const demo = ph === 'idle'
    w.slopeHalf = Math.max(300, W * 0.8)
    const B = w.slopeHalf
    const prevY = sk.y
    const vTop = topSpeed()
    const vBase = vTop / (sk.boost > 0 ? 1.25 : 1)

    // Steering: skis point toward the finger.
    if (live && sk.crash <= 0) {
      const p = ptr.current
      if (sk.air <= 0) {
        if (p) {
          const sp = toScreen(sk.x, sk.y)
          const dx = p.x - sp.x
          const dy = Math.max(36, p.y - sp.y)
          sk.target = clamp(Math.atan2(dx, dy) * 1.25, -1.45, 1.45)
        }
        const kx = (keys.current.right ? 1 : 0) - (keys.current.left ? 1 : 0)
        if (kx) sk.target = clamp(sk.target + kx * 3 * dt, -1.45, 1.45)
      } else {
        const kx = (keys.current.right ? 1 : 0) - (keys.current.left ? 1 : 0)
        if (kx) {
          sk.spin += kx * 9 * dt
          sk.touched = true
        }
        if (!p && !kx && !sk.hop) {
          // assist: settle into the nearest full rotation
          const nearest = Math.round(sk.spin / TAU) * TAU
          sk.spin = approach(sk.spin, nearest, sk.touched ? 3 : 6, dt)
        }
      }
    } else if (demo) {
      // attract: weave gently, dodge whatever is ahead
      let avoid = 0
      for (const o of w.obs) {
        if (o.kind === 'coin' || o.kind === 'mogul' || o.kind === 'ice' || o.kind === 'ramp') continue
        const ahead = o.y - sk.y
        if (ahead > 0 && ahead < 200 && Math.abs(o.x - sk.x) < 50) avoid += o.x > sk.x ? -1 : 1
      }
      sk.target = avoid ? clamp(avoid * 0.9, -1.1, 1.1) : Math.sin(t * 0.8) * 0.5 - sk.x * 0.002
    }

    if (sk.crash > 0) {
      sk.crash -= dt
      if (sk.crash <= 0 && live) {
        sk.inv = 1.5
        sk.ang = 0
        sk.target = 0
        sk.v = 80
      }
    } else if (ph === 'dying' || ph === 'over') {
      sk.v = approach(sk.v, 0, 3, dt)
    } else {
      if (!sk.ice && sk.air <= 0) sk.ang = approach(sk.ang, sk.target, 9, dt)
      // Speed: straight down is fast, traversing scrubs speed.
      const c = Math.cos(sk.ang)
      const vmax = 40 + (vTop - 40) * Math.pow(Math.max(0, c), 1.4)
      if (sk.air > 0) {
        /* keep momentum in the air */
      } else if (sk.v < vmax) sk.v = approach(sk.v, vmax, sk.ice ? 1.6 : 0.9, dt)
      else sk.v = approach(sk.v, vmax, 2.2, dt)
    }

    if (sk.crash <= 0) {
      sk.x += Math.sin(sk.ang) * sk.v * dt
      sk.y += Math.cos(sk.ang) * sk.v * dt
      if (live && sk.air <= 0) sk.x = clamp(sk.x + w.wind * 60 * dt, -B + 15, B - 15)
    }
    sk.inv = Math.max(0, sk.inv - dt)
    if (sk.boost > 0) {
      sk.boost = Math.max(0, sk.boost - dt)
      if (live && sk.boost === 0) {
        fx.text(toScreen(sk.x, sk.y).x, skierScreenY() - 50, 'turbo over', '#0e7490', 14)
        sfx.whoosh()
      }
    }
    // blizzard gusts: wind ramps in gradually so the streaks telegraph each gust
    const curB = BIOMES[w.biome]
    if (live && curB.amb === 'blizzard') {
      w.windT -= dt
      if (w.windT <= 0) {
        w.windT = rand(3.5, 6)
        w.windGoal = w.windGoal !== 0 && Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1) * rand(0.6, 1)
      }
    } else w.windGoal = 0
    w.wind = approach(w.wind, w.windGoal, 0.7, dt)
    // fences at the slope edges
    if (Math.abs(sk.x) > B - 14) {
      sk.x = Math.sign(sk.x) * (B - 14)
      sk.ang *= -0.4
      sk.target = sk.ang
      sk.v *= 0.8
      if (live) {
        const sp = toScreen(sk.x, sk.y)
        fx.burst(sp.x, sp.y, { count: 8, color: ['#f97316', '#ffffff'], speed: 160 })
        sfx.thud()
      }
    }

    // air time
    if (sk.air > 0) {
      sk.air -= dt
      if (sk.grab > 0) sk.grab -= dt
      if (sk.air <= 0) {
        sk.air = 0
        if (live) land()
      }
    }
    const z = sk.air > 0 ? Math.sin((1 - sk.air / sk.airMax) * Math.PI) * sk.airH : 0

    // camera
    w.camX = approach(w.camX, clamp(sk.x, -B + W / 2 - 20, B - W / 2 + 20), 3, raw)
    w.camY = sk.y - skierScreenY()
    generate()

    // tracks & spray
    if (sk.air <= 0 && sk.crash <= 0) {
      const n = w.tracks.length
      if (n < 2 || Number.isNaN(w.tracks[n - 2]) || Math.abs(w.tracks[n - 1] - sk.y) > 8) w.tracks.push(sk.x, sk.y)
      if (w.tracks.length > 600) w.tracks.splice(0, w.tracks.length - 600)
      const carve = Math.abs(sk.ang - sk.target) + Math.abs(sk.ang) * 0.4
      if (sk.v > 140 && carve > 0.35 && Math.random() < 0.7) {
        const sp = toScreen(sk.x, sk.y)
        const side = Math.sign(sk.ang) || 1
        fx.burst(sp.x + side * 6, sp.y + 4, { count: 2, color: ['#ffffff', '#e0f2fe', '#bae6fd'], speed: 150, angle: Math.PI / 2 + side * 1.3, spread: 0.8, size: 3, life: 0.45, gravity: 220 })
      }
    }

    // biome & milestones
    const dist = sk.y / PXM
    if (live) {
      const bi = biomeAt(dist)
      if (bi !== w.biome) {
        w.biome = bi
        const nb = BIOMES[bi]
        say(nb.name.toUpperCase(), nb.sub ? `${Math.floor(dist)} m · ${nb.sub}` : `${Math.floor(dist)} m`)
        sfx.levelUp()
      }
      if (dist > CREV_FROM && !w.intro.has('crev')) {
        w.intro.add('crev')
        say('CREVASSES!', 'cracks split open as you near — go around')
        sfx.clang()
      }
      if (w.rush > 0) {
        w.rush = Math.max(0, w.rush - dt)
        if (w.rush === 0) fx.text(toScreen(sk.x, sk.y).x, skierScreenY() + 60, 'gold rush over', '#a16207', 15)
      }
      if (dist >= w.milestone) {
        const sp = toScreen(sk.x, sk.y)
        fx.text(sp.x, sp.y + 60, `${w.milestone} m`, '#1d4ed8', 20)
        sfx.score(4)
        if (w.milestone % 500 === 0) say(`${w.milestone} M`, undefined, true)
        if (w.milestone % 1000 === 0 && performance.now() - w.lastTrack > 30000) {
          w.lastTrack = performance.now()
          void trackEvent('action_milestone', { game_id: 'ski', kind: 'distance', value: w.milestone })
        }
        w.milestone += 250
      }
      if (!w.bestPassed && w.bestDist > 150 && dist > w.bestDist) {
        w.bestPassed = true
        const sp = toScreen(sk.x, sk.y)
        fx.text(sp.x, sp.y + 80, 'NEW BEST!', '#ca8a04', 24)
        sfx.win()
        haptic.success()
      }
    } else if (demo) w.biome = 0

    // Collisions with obstacles
    sk.ice = false
    for (const o of w.obs) {
      if (o.hit && o.kind !== 'mogul' && o.kind !== 'ice') {
        o.shake = Math.max(0, o.shake - raw)
        continue
      }
      o.shake = Math.max(0, o.shake - raw)
      const dy = o.y - sk.y
      if (dy < -60 || dy > 60) continue
      const dx = o.x - sk.x
      if (o.kind === 'ice') {
        if (Math.abs(dx) < 42 && Math.abs(dy) < 18 && sk.air <= 0) sk.ice = true
        continue
      }
      if (o.kind === 'crevasse') {
        if (!live || sk.crash > 0 || sk.air > 0) continue
        if (Math.abs(dx) < o.r - 5 && Math.abs(dy) < 7 && crevOpen(o, sk.y) > 0.5) {
          if (sk.boost > 0 || sk.inv > 0) continue
          o.hit = true
          crash('CREVASSE!')
          if (phaseRef.current !== 'play') return
        }
        continue
      }
      const hitR = o.r + 7
      if (dx * dx + dy * dy > hitR * hitR) continue
      if (o.kind === 'coin') {
        if (!live) continue
        o.hit = true
        w.coinsGot += w.rush > 0 ? 0.25 : 1
        w.bonus += w.rush > 0 ? 20 : 10
        const sp = toScreen(o.x, o.y)
        fx.burst(sp.x, sp.y - z, { count: 6, color: ['#fde047', '#facc15', '#fff7ed'], speed: 120, gravity: 0 })
        sfx.pop()
        continue
      }
      if (o.kind === 'boost') {
        if (!live || sk.crash > 0) continue
        o.hit = true
        sk.boost = 5
        const sp = toScreen(o.x, o.y)
        fx.ring(sp.x, sp.y, { color: '#22d3ee', maxR: 90, life: 0.5, width: 5 })
        fx.burst(sp.x, sp.y, { count: 18, color: ['#67e8f9', '#ecfeff', '#fde047'], speed: 220, gravity: 0 })
        fx.flash('#67e8f9', 0.15)
        say('TURBO!', 'faster · smash through anything')
        sfx.power()
        haptic.medium()
        continue
      }
      if (sk.crash > 0 || (sk.air > 0 && z > 6)) continue
      if (o.kind === 'ramp') {
        if (sk.air <= 0 && Math.abs(dx) < 30 && dy < 8 && dy > -16) {
          o.hit = true
          sk.airMax = 0.75 + sk.v / 650
          sk.air = sk.airMax
          sk.airH = 34 + sk.v / 9
          sk.hop = false
          sk.spin = 0
          sk.grabs = 0
          sk.touched = false
          w.tracks.push(NaN, NaN)
          if (live) {
            sfx.whoosh()
            haptic.medium()
            const sp = toScreen(sk.x, sk.y)
            fx.burst(sp.x, sp.y, { count: 12, color: ['#ffffff', '#bae6fd'], speed: 160, angle: Math.PI / 2, spread: 1.6 })
            fx.text(sp.x, sp.y - 60, 'AIR! swipe to spin', '#0369a1', 15)
          }
        }
        continue
      }
      if (o.kind === 'mogul') {
        if (sk.air <= 0 && !o.hit) {
          o.hit = true
          sk.airMax = 0.28
          sk.air = 0.28
          sk.airH = 10
          sk.hop = true
          sk.v *= 0.95
          if (live) sfx.tap()
        }
        continue
      }
      if (sk.boost > 0 && live) {
        // turbo smash: obstacles shatter instead of costing a heart
        const sp = toScreen(o.x, o.y)
        const wood = o.kind === 'tree' || o.kind === 'bigtree' || o.kind === 'stump' || o.kind === 'cabin'
        fx.burst(sp.x, sp.y - 16, { count: 16, color: wood ? ['#ffffff', curB.treeMid, '#7c4a21'] : ['#ffffff', '#94a3b8', '#475569'], speed: 240, shape: 'square', gravity: 320 })
        fx.text(sp.x, sp.y - 40, 'SMASH +25', '#0891b2', 15)
        fx.shake(4, 0.12)
        sfx.hit()
        w.bonus += 25
        o.hit = true
        if (o.kind === 'tree' || o.kind === 'bigtree') o.kind = 'stump'
        else o.kind = 'coin' // a spent coin is invisible and inert
        continue
      }
      if (sk.inv > 0 || demo) {
        if (demo) sk.target = dx > 0 ? -1 : 1
        continue
      }
      if (!live) continue
      o.hit = true
      o.shake = 0.5
      crash(o.kind === 'rock' ? 'ROCK!' : o.kind === 'stump' ? 'STUMP!' : o.kind === 'cabin' ? 'CABIN!' : 'TREE!')
      if (phaseRef.current !== 'play') return
    }

    // slalom gates
    if (live) {
      for (const g of w.gates) {
        if (g.done) continue
        if (prevY < g.y && sk.y >= g.y) {
          g.done = true
          const sp = toScreen(sk.x, sk.y)
          if (Math.abs(sk.x - g.x) < g.half) {
            w.combo += 1
            const pts = 40 * Math.min(8, w.combo)
            w.bonus += pts
            w.stats.gates += 1
            w.courseHits.set(g.course, (w.courseHits.get(g.course) ?? 0) + 1)
            fx.text(sp.x, sp.y - 40, `GATE +${pts}`, g.color === '#ef4444' ? '#dc2626' : '#1d4ed8', 17)
            fx.ring(toScreen(g.x, g.y).x, sp.y, { color: g.color, maxR: 40 })
            sfx.score(w.combo)
            haptic.light()
            if (g.last && w.courseHits.get(g.course) === 5) {
              w.bonus += 300
              say('SLALOM CLEAR!', '+300')
              sfx.win()
              fx.burst(sp.x, sp.y, { count: 30, color: ['#ef4444', '#2563eb', '#fde047', '#ffffff'], speed: 280 })
            }
          } else {
            w.combo = 0
            fx.text(toScreen(g.x, g.y).x, sp.y - 30, 'MISSED', '#64748b', 14)
            sfx.miss()
          }
          run.update(w.stats)
        }
      }
    }

    // NPC skiers & boarders
    if (live && dist > 450) {
      w.npcT -= dt
      if (w.npcT <= 0) {
        w.npcT = rand(2.5, 4.5) - Math.min(1.5, dist / 3000)
        const boarder = dist > 1100 && Math.random() < 0.45
        w.npcs.push({
          kind: boarder ? 'boarder' : 'skier',
          x: clamp(sk.x + rand(-W * 0.6, W * 0.6), -B + 30, B - 30),
          y: w.camY + H + 40,
          ang: 0,
          v: boarder ? rand(170, 220) : rand(120, 170),
          t: rand(0, 6),
          jacket: NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)],
          pants: '#1e293b',
          hat: NPC_COLORS[Math.floor(Math.random() * NPC_COLORS.length)],
          crashed: 0,
        })
      }
    }
    for (const n of w.npcs) {
      n.t += dt
      if (n.crashed > 0) {
        n.crashed -= dt
        continue
      }
      n.ang = Math.sin(n.t * (n.kind === 'boarder' ? 1.4 : 1)) * (n.kind === 'boarder' ? 1.0 : 0.6)
      n.x += Math.sin(n.ang) * n.v * dt
      n.y += Math.cos(n.ang) * n.v * dt
      n.x = clamp(n.x, -B + 20, B - 20)
      if (live && sk.crash <= 0 && sk.inv <= 0 && sk.boost <= 0 && !(sk.air > 0 && z > 6)) {
        const dx = n.x - sk.x
        const dy = n.y - sk.y
        if (dx * dx + dy * dy < 18 * 18) {
          n.crashed = 99
          crash(n.kind === 'boarder' ? 'BOARDER!' : 'SKIER!')
          if (phaseRef.current !== 'play') return
        }
      }
    }
    w.npcs = w.npcs.filter((n) => n.y > w.camY - 100)

    // Yeti chase
    if (live && !w.yeti && !w.ava && w.yetiWarn <= 0 && dist >= w.yetiNext) {
      w.yetiWarn = 1.6
      say('YETI!', 'ski straight down to outrun it')
      sfx.boom(0.5)
      sfx.hurt()
      haptic.heavy()
      fx.shake(8, 0.6)
    }
    if (w.yetiWarn > 0) {
      w.yetiWarn -= dt
      if (w.yetiWarn <= 0 && live) w.yeti = { x: sk.x + rand(-60, 60), y: sk.y - H * 0.45, t: 0, dur: 22 + w.chases * 2, leaving: false, munch: 0 }
    }
    const y = w.yeti
    if (y) {
      y.t += dt
      const dx = sk.x - y.x
      const dy = sk.y - y.y
      const d = Math.hypot(dx, dy) || 1
      if (!y.leaving) {
        let v = vBase * (0.86 + Math.min(0.08, w.chases * 0.02))
        if (d > 380) v *= 1.5
        else if (d > 260) v *= 1.15
        if (ph !== 'play') v = 0
        y.x += (dx / d) * v * dt
        y.y += (dy / d) * v * dt
        // yeti flattens trees in its way
        for (const o of w.obs) {
          if ((o.kind === 'tree' || o.kind === 'bigtree' || o.kind === 'stump') && !o.hit && Math.abs(o.x - y.x) < 22 && Math.abs(o.y - y.y) < 22) {
            o.hit = true
            o.kind = 'stump'
            const sp = toScreen(o.x, o.y)
            fx.burst(sp.x, sp.y - 20, { count: 16, color: ['#ffffff', '#1f5135', '#7c4a21'], speed: 200, shape: 'square', gravity: 300 })
            sfx.thud()
          }
        }
        if (live && d < 24 && !(sk.air > 0 && z > 10) && sk.inv <= 0) {
          y.munch = 1
          sk.lives = 0
          sk.crash = 99
          const sp = toScreen(sk.x, sk.y)
          fx.burst(sp.x, sp.y, { count: 30, color: ['#ffffff', '#ef4444', '#e0f2fe'], speed: 280 })
          fx.text(sp.x, sp.y - 50, 'CAUGHT!', '#ef4444', 26)
          pushHud()
          die(true)
          return
        }
        if (y.t > y.dur && live) {
          y.leaving = true
          w.chases += 1
          w.stats.yeti += 1
          w.bonus += 500
          w.yetiNext = dist + rand(800, 1000)
          say('ESCAPED!', 'the yeti gives up · +500')
          sfx.win()
          haptic.success()
          if (performance.now() - w.lastTrack > 30000) {
            w.lastTrack = performance.now()
            void trackEvent('action_milestone', { game_id: 'ski', kind: 'yeti', value: w.stats.yeti })
          }
          run.update(w.stats)
        }
      } else {
        y.y -= 60 * dt
        if (y.y < w.camY - 200) w.yeti = null
      }
      if (y.munch > 0) y.munch = Math.max(0, y.munch - raw)
    }

    // crevasses crack open with a crunch as you approach
    if (live) {
      for (const o of w.obs) {
        if (o.kind !== 'crevasse' || o.open) continue
        if (o.y - sk.y > 285) break
        o.open = true
        const sp = toScreen(o.x, o.y)
        fx.burst(sp.x, sp.y, { count: 12, color: ['#e0f2fe', '#7dd3fc', '#ffffff'], speed: 140, shape: 'square', gravity: 200 })
        fx.shake(2, 0.15)
        sfx.clang()
      }
    }

    // Rolling snowballs: telegraphed at the edge, then cross the slope ahead of you
    if (live && dist > ROLL_FROM && !w.ava && w.rollers.length < MAX_ROLLERS) {
      w.rollT -= dt
      if (w.rollT <= 0) {
        if (!w.intro.has('roll')) {
          w.intro.add('roll')
          say('SNOWBALLS!', 'red arrows warn where they roll')
        }
        w.rollT = Math.max(3.5, rand(8, 12) - (dist - ROLL_FROM) / 900)
        spawnRoller()
      }
    }
    for (const r of w.rollers) {
      if (r.warn > 0) {
        r.warn -= dt
        // aim so the ball crosses the skier's line roughly as it reaches the centre
        r.x = w.camX + r.side * (W / 2 + r.r + 12)
        const T = (W / 2 + r.r + 12) / Math.abs(r.vx)
        r.y = sk.y + clamp((Math.cos(sk.ang) * sk.v - r.vy) * T + r.jit, 50, H * 0.6)
        if (r.warn <= 0 && live) sfx.whoosh()
        continue
      }
      r.x += r.vx * dt
      r.y += r.vy * dt
      r.roll += (r.vx * dt) / r.r
      r.r = Math.min(32, r.r + dt * 1.5)
      // it plows through small trees and stumps
      for (const o of w.obs) {
        if (o.hit || Math.abs(o.y - r.y) > r.r + 8) continue
        if ((o.kind === 'tree' || o.kind === 'stump') && Math.abs(o.x - r.x) < r.r + 6) {
          o.hit = true
          o.kind = 'coin'
          const sp = toScreen(o.x, o.y)
          fx.burst(sp.x, sp.y - 14, { count: 10, color: ['#ffffff', curB.treeMid, '#7c4a21'], speed: 180, shape: 'square', gravity: 300 })
        }
      }
      if (!live || sk.crash > 0) continue
      const dx = r.x - sk.x
      const dy = r.y - sk.y
      const dd = Math.hypot(dx, dy)
      if (dd < r.r * 0.85 + 8 && !(sk.air > 0 && z > 8)) {
        const sp = toScreen(r.x, r.y)
        r.x = 1e9
        fx.burst(sp.x, sp.y - r.r, { count: 30, color: ['#ffffff', '#e2e8f0', '#94a3b8'], speed: 280, gravity: 260 })
        if (sk.boost > 0) {
          w.bonus += 150
          fx.text(sp.x, sp.y - 50, 'SNOWBALL SMASH +150', '#0891b2', 17)
          sfx.boom(0.4)
          fx.shake(6, 0.2)
        } else if (sk.inv <= 0) {
          crash('SNOWBALL!')
          if (phaseRef.current !== 'play') return
        }
      } else if (!r.near && dd < r.r + 36) {
        r.near = true
        if (sk.inv <= 0 && sk.boost <= 0) {
          w.bonus += 50
          fx.text(toScreen(sk.x, sk.y).x, skierScreenY() - 46, 'CLOSE CALL +50', '#f59e0b', 15)
          sfx.score(2)
        }
      }
    }
    w.rollers = w.rollers.filter((r) => r.warn > 0 || (Math.abs(r.x - w.camX) < W / 2 + 120 && r.y > w.camY - 120 && r.y < w.camY + H + 240))

    // Avalanche event: a snow wall chases you for a while, then a gold rush pays out
    if (live && !w.ava && !w.yeti && w.yetiWarn <= 0 && dist >= w.avaNext) startAvalanche()
    const av = w.ava
    if (av) {
      if (av.leaving) {
        av.front -= 500 * dt
        if (av.front < w.camY - 400) w.ava = null
      } else if (av.warn > 0) {
        av.warn -= dt
        av.front = w.camY - 260
        if (live && Math.random() < 0.3) fx.shake(3, 0.15)
      } else {
        av.t += dt
        av.hold = Math.max(0, av.hold - dt)
        const gap = sk.y - av.front
        // rubber band: the front hovers just inside the top of the screen and gains whenever you slow down
        const near = skierScreenY() - 100
        const skVy = Math.cos(sk.ang) * sk.v
        let v = vBase * 0.88
        if (gap > near + 50) v = Math.max(vBase, skVy + 320)
        else if (gap > near) v = Math.max(vBase * 0.95, skVy)
        if (ph !== 'play' || av.hold > 0) v = 0
        av.front += v * dt
        // snow swallows what it passes
        for (const o of w.obs) {
          if (o.y > av.front) break
          if (o.kind !== 'coin' || !o.hit) {
            o.hit = true
            o.kind = 'coin'
          }
        }
        if (live && av.front > sk.y - 8 && sk.inv <= 0 && sk.crash <= 0) {
          av.buried += 1
          av.hold = 2.4
          av.front = sk.y - 320
          crash('BURIED!')
          if (phaseRef.current !== 'play') return
        }
        if (live && av.t >= av.dur) finishAvalanche()
      }
    }

    // snowfall
    for (const f of w.flakes) {
      f.y += (30 + f.z * 40) * raw - (sk.y - prevY) * f.z * 0.6
      f.x += Math.sin(t + f.z * 10) * 12 * raw - (Math.sin(sk.ang) * sk.v * raw) * f.z * 0.3 + w.wind * 320 * f.z * raw
      if (f.y < -10) f.y += H + 20
      if (f.y > H + 10) f.y -= H + 20
      if (f.x < -10) f.x += W + 20
      if (f.x > W + 10) f.x -= W + 20
    }

    if (live) {
      w.stats.distance = Math.floor(dist)
      w.stats.score = Math.floor(dist) + w.bonus
      w.hudT -= raw
      if (w.hudT <= 0) {
        w.hudT = 0.1
        pushHud()
        run.update(w.stats)
      }
    }
  }

  // ── Drawing ───────────────────────────────────────────
  function drawObstacle(ctx: CanvasRenderingContext2D, o: Ob, b: Biome) {
    const { x, y } = toScreen(o.x, o.y)
    const sx = o.shake > 0 ? Math.sin(o.shake * 60) * 3 : 0
    switch (o.kind) {
      case 'tree':
        blitBase(ctx, treeSprite(b.treeDark, b.treeMid, 1), x + sx, y + 4, 40, 64)
        break
      case 'bigtree':
        blitBase(ctx, treeSprite(b.treeDark, b.treeMid, 1.35), x + sx, y + 5, 54, 86)
        break
      case 'rock':
        blitBase(ctx, rockSprite(), x, y + 6, 40, 26)
        break
      case 'stump':
        blitBase(ctx, stumpSprite(), x, y + 4, 24, 18)
        break
      case 'tower':
        ctx.fillStyle = 'rgba(70,100,150,0.25)'
        ctx.beginPath()
        ctx.ellipse(x + 10, y + 2, 14, 4, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#64748b'
        ctx.fillRect(x - 4, y - 70, 8, 72)
        ctx.fillStyle = '#94a3b8'
        ctx.fillRect(x - 2, y - 70, 3, 72)
        ctx.fillStyle = '#475569'
        ctx.fillRect(x - 22, y - 74, 44, 6)
        ctx.fillStyle = '#facc15'
        ctx.fillRect(x - 4, y - 12, 8, 4)
        break
      case 'cabin':
        blitBase(ctx, cabinSprite(), x, y + 16, 70, 60)
        break
      case 'coin':
        if (!o.hit) blit(ctx, coinSprite(), x, y - 6 + Math.sin(o.y * 0.05 + performance.now() / 200) * 2, 20, 20)
        break
      case 'boost':
        if (!o.hit) drawBoost(ctx, x, y, performance.now() / 1000)
        break
      default:
        break
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    update(dt, raw, t)
    const sk = w.sk
    const b = BIOMES[w.biome]

    // snow
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, b.snowTop)
    bg.addColorStop(1, b.snowBot)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    fx.applyShake(ctx)
    // wind streaks in the snow (world space)
    ctx.strokeStyle = b.streak
    ctx.lineWidth = 2
    const row0 = Math.floor(w.camY / 50)
    for (let r = row0; r < row0 + Math.ceil(H / 50) + 2; r++) {
      const hx = hash(r) * 2 - 1
      const sp = toScreen(hx * w.slopeHalf, r * 50)
      ctx.beginPath()
      ctx.moveTo(sp.x - 40, sp.y)
      ctx.quadraticCurveTo(sp.x, sp.y - 4, sp.x + 40 + hash(r + 7) * 40, sp.y + 2)
      ctx.stroke()
    }
    if (b.amb) drawGroundLayer(ctx, b.amb, W, H, w.camY, w.camX, t)
    // slope edges: fences + deep forest
    for (const side of [-1, 1]) {
      const ex = toScreen(side * w.slopeHalf, 0).x
      ctx.fillStyle = b.treeDark
      ctx.globalAlpha = 0.18
      if (side < 0) ctx.fillRect(0, 0, Math.max(0, ex), H)
      else ctx.fillRect(ex, 0, W - ex, H)
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#f97316'
      ctx.lineWidth = 3
      ctx.setLineDash([10, 8])
      ctx.lineDashOffset = w.camY
      ctx.beginPath()
      ctx.moveTo(ex, 0)
      ctx.lineTo(ex, H)
      ctx.stroke()
      ctx.setLineDash([])
      const off = -(w.camY % 70)
      for (let yy = off; yy < H + 70; yy += 70) blitBase(ctx, treeSprite(b.treeDark, b.treeMid, 1.2), ex + side * 34, yy, 48, 77)
    }

    // personal best line
    if (w.bestDist > 150 && phaseRef.current !== 'idle') {
      const by = toScreen(0, w.bestDist * PXM).y
      if (by > -20 && by < H + 20) {
        ctx.strokeStyle = '#eab308'
        ctx.lineWidth = 3
        ctx.setLineDash([12, 8])
        ctx.beginPath()
        ctx.moveTo(0, by)
        ctx.lineTo(W, by)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#a16207'
        ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'left'
        ctx.fillText('BEST', 8, by - 6)
      }
    }
    // checkpoint arches every 500 m
    if (phaseRef.current !== 'idle') {
      const step = 500 * PXM
      for (let cy = Math.max(step, Math.ceil((w.camY - 20) / step) * step); cy < w.camY + H + 80; cy += step) {
        drawCheckpoint(ctx, cy - w.camY, W, `${cy / PXM} m`, t)
      }
    }

    // ski tracks
    ctx.strokeStyle = 'rgba(100,130,180,0.35)'
    ctx.lineWidth = 2
    ctx.beginPath()
    const tr = w.tracks
    for (const off of [-4, 4]) {
      let pen = false
      for (let i = 0; i < tr.length; i += 2) {
        if (Number.isNaN(tr[i])) {
          pen = false
          continue
        }
        const sp = toScreen(tr[i] + off, tr[i + 1])
        if (sp.y < -20) {
          pen = false
          continue
        }
        if (!pen) ctx.moveTo(sp.x, sp.y)
        else ctx.lineTo(sp.x, sp.y)
        pen = true
      }
      const sp = toScreen(sk.x + off, sk.y)
      if (pen && sk.air <= 0 && sk.crash <= 0) ctx.lineTo(sp.x, sp.y)
    }
    ctx.stroke()

    // flat ground features
    for (const o of w.obs) {
      const sp = toScreen(o.x, o.y)
      if (sp.y < -60 || sp.y > H + 60) continue
      if (o.kind === 'ice') blit(ctx, iceSprite(), sp.x, sp.y, 90, 44)
      else if (o.kind === 'mogul') blit(ctx, mogulSprite(), sp.x, sp.y, 36, 18)
      else if (o.kind === 'ramp') blit(ctx, rampSprite(), sp.x, sp.y, 64, 30)
      else if (o.kind === 'crevasse') drawCrevasse(ctx, sp.x, sp.y, o.r, crevOpen(o, sk.y), o.x)
    }
    // slalom gates
    for (const g of w.gates) {
      const sp = toScreen(g.x, g.y)
      if (sp.y < -40 || sp.y > H + 40) continue
      if (!g.done) {
        ctx.strokeStyle = g.color
        ctx.globalAlpha = 0.25
        ctx.lineWidth = 2
        ctx.setLineDash([4, 6])
        ctx.beginPath()
        ctx.moveTo(sp.x - g.half, sp.y)
        ctx.lineTo(sp.x + g.half, sp.y)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
      }
      drawFlag(ctx, sp.x - g.half, sp.y, g.color, t, -1)
      drawFlag(ctx, sp.x + g.half, sp.y, g.color, t, 1)
    }

    // depth-sorted actors and standing obstacles
    type Actor = { y: number; draw: () => void }
    const actors: Actor[] = []
    const z = sk.air > 0 ? Math.sin((1 - sk.air / sk.airMax) * Math.PI) * sk.airH : 0
    const ssp = toScreen(sk.x, sk.y)
    if (phaseRef.current !== 'over' || sk.crash < 50) {
      actors.push({
        y: sk.y,
        draw: () => {
          // shadow
          ctx.fillStyle = 'rgba(70,100,150,0.28)'
          ctx.beginPath()
          ctx.ellipse(ssp.x + z * 0.4, ssp.y + 4, 14 - z * 0.08, 5 - z * 0.03, 0, 0, Math.PI * 2)
          ctx.fill()
          if (sk.crash > 50) return
          if (sk.boost > 0) {
            const k = Math.min(1, sk.boost)
            glow(ctx, ssp.x, ssp.y - z - 12, 46, '#22d3ee', 0.45 * k)
            ctx.strokeStyle = `rgba(103,232,249,${0.7 * k})`
            ctx.lineWidth = 2
            ctx.beginPath()
            for (let i = 0; i < 4; i++) {
              const ox = (i - 1.5) * 7
              ctx.moveTo(ssp.x + ox, ssp.y - z - 30 - ((t * 300 + i * 13) % 26))
              ctx.lineTo(ssp.x + ox, ssp.y - z - 52 - ((t * 300 + i * 13) % 26))
            }
            ctx.stroke()
          }
          const blink = sk.inv > 0 && sk.inv < 50 && sk.boost <= 0 && Math.floor(t * 12) % 2 === 0
          if (blink) return
          drawSkier(ctx, ssp.x, ssp.y - z, sk.ang, t, {
            jacket: '#0ea5e9',
            pants: '#1e3a8a',
            hat: '#f43f5e',
            spin: sk.air > 0 && !sk.hop ? sk.spin : 0,
            grab: sk.grab > 0,
            crashed: sk.crash > 0,
            scale: 1.2 + z / 140,
          })
        },
      })
    }
    for (const n of w.npcs) {
      const sp = toScreen(n.x, n.y)
      if (sp.y < -50 || sp.y > H + 50) continue
      actors.push({
        y: n.y,
        draw: () => {
          ctx.fillStyle = 'rgba(70,100,150,0.25)'
          ctx.beginPath()
          ctx.ellipse(sp.x, sp.y + 4, 12, 4, 0, 0, Math.PI * 2)
          ctx.fill()
          if (n.kind === 'boarder' && n.crashed <= 0) {
            ctx.save()
            ctx.translate(sp.x, sp.y + 4)
            ctx.rotate(n.ang * 0.6 + Math.PI / 2)
            ctx.fillStyle = n.hat
            ctx.beginPath()
            ctx.roundRect(-16, -4, 32, 8, 4)
            ctx.fill()
            ctx.restore()
          }
          drawSkier(ctx, sp.x, sp.y, n.kind === 'boarder' ? 1.4 : n.ang, t + n.t, { jacket: n.jacket, pants: n.pants, hat: n.hat, crashed: n.crashed > 0, scale: 1.15 })
        },
      })
    }
    const yt = w.yeti
    if (yt) {
      const sp = toScreen(yt.x, yt.y)
      actors.push({ y: yt.y, draw: () => drawYeti(ctx, sp.x, sp.y, t, !yt.leaving, yt.munch) })
    }
    for (const r of w.rollers) {
      if (r.warn > 0) continue
      const sp = toScreen(r.x, r.y)
      if (sp.y < -60 || sp.y > H + 60) continue
      actors.push({ y: r.y, draw: () => drawSnowball(ctx, sp.x, sp.y, r.r, r.roll) })
    }
    actors.sort((a, b2) => a.y - b2.y)
    let ai = 0
    for (const o of w.obs) {
      if (o.kind === 'ice' || o.kind === 'mogul' || o.kind === 'ramp' || o.kind === 'crevasse') continue
      while (ai < actors.length && actors[ai].y < o.y) actors[ai++].draw()
      const sp = toScreen(o.x, o.y)
      if (sp.y < -20 || sp.y > H + 100) continue
      drawObstacle(ctx, o, b)
    }
    while (ai < actors.length) actors[ai++].draw()

    // chairlift cables and chairs overhead
    const lx = toScreen(w.slopeHalf * 0.55, 0).x
    if (lx > -40 && lx < W + 40) {
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(lx - 20, 0)
      ctx.lineTo(lx - 20, H)
      ctx.moveTo(lx + 20, 0)
      ctx.lineTo(lx + 20, H)
      ctx.stroke()
      const spacing = 96
      for (const [side, dir] of [
        [-20, 1],
        [20, -1],
      ] as const) {
        const phase = (w.camY + t * 50 * dir) % spacing
        for (let yy = -phase - spacing; yy < H + spacing; yy += spacing) {
          const cy = yy - 40
          ctx.strokeStyle = '#475569'
          ctx.beginPath()
          ctx.moveTo(lx + side, cy - 14)
          ctx.lineTo(lx + side, cy)
          ctx.stroke()
          ctx.fillStyle = '#1e293b'
          ctx.fillRect(lx + side - 9, cy, 18, 6)
          const seed = Math.floor((yy + w.camY) / spacing) + side
          ctx.fillStyle = NPC_COLORS[Math.abs(seed) % NPC_COLORS.length]
          ctx.beginPath()
          ctx.arc(lx + side - 4, cy - 1, 3.5, 0, Math.PI * 2)
          ctx.fill()
          if (seed % 2 === 0) {
            ctx.fillStyle = NPC_COLORS[Math.abs(seed + 3) % NPC_COLORS.length]
            ctx.beginPath()
            ctx.arc(lx + side + 4, cy - 1, 3.5, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
    }

    // yeti indicator when off-screen above
    if (yt && !yt.leaving) {
      const sp = toScreen(yt.x, yt.y)
      if (sp.y < 0) {
        const ix = clamp(sp.x, 24, W - 24)
        const pulse = 0.6 + Math.sin(t * 10) * 0.4
        ctx.globalAlpha = pulse
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.moveTo(ix, 64)
        ctx.lineTo(ix - 14, 86)
        ctx.lineTo(ix + 14, 86)
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.fillStyle = '#b91c1c'
        ctx.fillText(`${Math.max(0, Math.round(-sp.y / PXM + skierScreenY() / PXM))} m`, ix, 100)
      }
    }

    // snowball telegraphs
    const skVy = Math.cos(sk.ang) * sk.v
    for (const r of w.rollers) {
      if (r.warn <= 0) continue
      const sp = toScreen(r.x, r.y)
      const dvy = r.vy - skVy
      const len = Math.hypot(r.vx, dvy) || 1
      drawRollWarn(ctx, r.side < 0 ? 0 : W, sp.y, r.vx / len, dvy / len, r.side, 1 - r.warn / 1.35, t, W)
    }
    // avalanche wall
    const av = w.ava
    if (av) {
      if (av.warn > 0 && !av.leaving) {
        const k = 0.5 + Math.sin(t * 12) * 0.5
        const g = ctx.createLinearGradient(0, 0, 0, 90)
        g.addColorStop(0, `rgba(239,68,68,${0.25 + 0.25 * k})`)
        g.addColorStop(1, 'rgba(239,68,68,0)')
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, 90)
      }
      drawAvalanche(ctx, av.front - w.camY, W, t)
      if (!av.leaving && av.warn <= 0) {
        // survival timer bar under the snow
        const k = clamp(1 - av.t / av.dur, 0, 1)
        const bw = Math.min(220, W * 0.6)
        ctx.fillStyle = 'rgba(15,23,42,0.35)'
        ctx.beginPath()
        ctx.roundRect(W / 2 - bw / 2, 78, bw, 8, 4)
        ctx.fill()
        ctx.fillStyle = '#38bdf8'
        ctx.beginPath()
        ctx.roundRect(W / 2 - bw / 2, 78, bw * k, 8, 4)
        ctx.fill()
      }
    }

    fx.draw(ctx)
    ctx.restore()

    // snowfall
    ctx.fillStyle = b.flake ?? '#ffffff'
    for (const f of w.flakes) {
      ctx.globalAlpha = 0.5 + f.z * 0.5
      ctx.beginPath()
      ctx.arc(f.x, f.y, 1 + f.z * 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (b.tint) {
      ctx.fillStyle = b.tint
      ctx.fillRect(0, 0, W, H)
    }
    if (b.night) {
      const g = ctx.createRadialGradient(ssp.x, ssp.y + 80, 60, ssp.x, ssp.y + 80, Math.max(W, H) * 0.8)
      g.addColorStop(0, 'rgba(10,15,40,0)')
      g.addColorStop(1, 'rgba(10,15,40,0.6)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      glow(ctx, ssp.x, ssp.y + 40, 120, '#fef3c7', 0.18)
    }
    if (b.amb === 'aurora') drawAurora(ctx, W, H, t, w.camY)
    else if (b.amb === 'blizzard') {
      drawBlizzard(ctx, W, H, t, w.wind)
      if (Math.abs(w.wind) > 0.25 && phaseRef.current === 'play') {
        // gust indicator
        const dir = Math.sign(w.wind)
        const cx = W / 2
        ctx.globalAlpha = clamp(Math.abs(w.wind), 0, 1)
        ctx.fillStyle = 'rgba(15,42,74,0.75)'
        ctx.beginPath()
        ctx.roundRect(cx - 44, 92, 88, 22, 11)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.fillText('WIND', cx - dir * 12, 107)
        ctx.beginPath()
        ctx.moveTo(cx + dir * 34, 103)
        ctx.lineTo(cx + dir * 22, 97)
        ctx.lineTo(cx + dir * 22, 109)
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
    if (w.rush > 0) {
      const k = Math.min(1, w.rush / 1.5)
      const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75)
      g.addColorStop(0, 'rgba(250,204,21,0)')
      g.addColorStop(1, `rgba(250,204,21,${0.35 * k})`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = `rgba(161,98,7,${0.85 * k})`
      ctx.font = "900 14px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.fillText(`GOLD RUSH ${Math.ceil(w.rush)}`, W / 2, 134)
    }
    // red vignette while the yeti is close
    if (yt && !yt.leaving) {
      const d = Math.hypot(yt.x - sk.x, yt.y - sk.y)
      const k = clamp(1 - d / 300, 0, 1)
      if (k > 0) {
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75)
        g.addColorStop(0, 'rgba(239,68,68,0)')
        g.addColorStop(1, `rgba(239,68,68,${0.35 * k})`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
      }
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
        grab()
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

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as { __en2ski?: unknown }
    win.__en2ski = {
      skip: (m: number) => jumpTo(m),
      biome: (i: number) => jumpTo(i * 800 + 30),
      god: (s = 60) => {
        world.current.sk.inv = s
      },
      event: (kind: string) => {
        const w = world.current
        const sk = w.sk
        if (kind === 'snowball') spawnRoller()
        else if (kind === 'crevasse') {
          w.obs.push({ kind: 'crevasse', x: sk.x, y: sk.y + 380, r: 62, hit: false, shake: 0 })
          w.obs.sort((a, b) => a.y - b.y)
        } else if (kind === 'boost') {
          w.obs.push({ kind: 'boost', x: sk.x, y: sk.y + 260, r: 12, hit: false, shake: 0 })
          w.obs.sort((a, b) => a.y - b.y)
        } else if (kind === 'avalanche') {
          w.yeti = null
          w.yetiWarn = 0
          startAvalanche()
        } else if (kind === 'avalanche-end' && w.ava) w.ava.t = w.ava.dur
        else if (kind === 'yeti') w.yetiNext = sk.y / PXM
      },
    }
    return () => {
      delete win.__en2ski
    }
  }, [])

  function grab() {
    const sk = world.current.sk
    if (phaseRef.current !== 'play' || sk.air <= 0.15 || sk.hop || sk.grabs >= 2 || sk.grab > 0) return
    sk.grab = 0.35
    sk.grabs += 1
    sfx.tap()
    haptic.light()
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = localPoint(e, e.currentTarget)
    ptr.current = { id: e.pointerId, x: pt.x, y: pt.y, lastX: pt.x }
    grab()
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const p = ptr.current
    if (!p || p.id !== e.pointerId) return
    const pt = localPoint(e, e.currentTarget)
    const sk = world.current.sk
    if (sk.air > 0 && !sk.hop && phaseRef.current === 'play') {
      sk.spin += (pt.x - p.lastX) * 0.035
      sk.touched = true
    }
    p.lastX = pt.x
    p.x = pt.x
    p.y = pt.y
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    if (ptr.current?.id === e.pointerId) ptr.current = null
  }

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena ski-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud ski-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  {hud.dist} m · {hud.kmh} km/h
                </div>
              </div>
              <div className="action-hud__right">
                <span className="ski-lives">
                  {Array.from({ length: Math.max(0, hud.lives) }, (_, i) => (
                    <i key={i} />
                  ))}
                </span>
                {hud.combo > 1 ? <span className="action-hud__small ski-combo">Combo x{hud.combo}</span> : null}
                {hud.yeti ? <span className="action-hud__small ski-yeti">YETI!</span> : null}
              </div>
            </div>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner ski-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle game="ski" icon={meta.icon} title={meta.title} hint="Touch and drag — your skis point toward your finger. Hit ramps, swipe to spin, and outrun the yeti." onPlay={start} />
          )}
          <ActionResult
            run={run}
            title={hud.dist >= 1200 ? 'Mountain master!' : 'Wipeout!'}
            subtitle={`Score ${hud.score} · ${hud.dist} m`}
            celebrate={hud.dist >= 1200}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
