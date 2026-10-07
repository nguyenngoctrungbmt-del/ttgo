import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, dist, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { drawAlien, drawCapsule, drawFighter, drawMothership, type Kind, type PowerKind } from './art'
import { AUTHORED, STAGES, generatedBoss, gridSlots, type BossDef, type Entry, type StageDef } from './levels'
import '../../shared/action/action.css'
import './galaga.css'

const meta = getGame('galaga')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type EState = 'wait' | 'enter' | 'join' | 'form' | 'dive' | 'beam' | 'escort' | 'return' | 'flyby'

type Enemy = {
  id: number
  kind: Kind
  hp: number
  col: number
  row: number
  x: number
  y: number
  a: number
  state: EState
  path: number[]
  lens: number[]
  s: number
  seg: number
  delay: number
  speed: number
  t: number
  turn: number
  shots: number
  fireAt: number
  flash: number
  captive: boolean
  beam: boolean
  leader: number
  ox: number
  oy: number
}

type Shot = { x: number; y: number; vx: number; vy: number }
type Capsule = { x: number; y: number; kind: PowerKind; t: number }
type Star = { x: number; y: number; z: number; c: string; tw: number }
type Ship = {
  x: number
  tx: number
  alive: boolean
  inv: number
  respawn: number
  dual: boolean
  shield: boolean
  fire: number
  /** Being pulled up by a tractor beam. */
  capturedBy: number
  capT: number
  capX: number
  capY: number
}
type Rescue = { x: number; y: number; t: number }
type Mothership = {
  def: BossDef
  x: number
  y: number
  hp: number
  max: number
  t: number
  atkT: number
  atkI: number
  /** Laser: warn (thin line) then fire (deadly column) at a locked x. */
  laser: { x: number; t: number; fire: boolean } | null
  flash: number
  spawned: number
}
type Mine = { x: number; y: number; vy: number; t: number }

type World = {
  stage: number
  def: StageDef
  boss: Mothership | null
  mines: Mine[]
  livesAtStart: number
  lostShip: boolean
  lastStars: number
  challenge: boolean
  ship: Ship
  enemies: Enemy[]
  shots: Shot[]
  bombs: Shot[]
  caps: Capsule[]
  rescue: Rescue | null
  stars: Star[]
  lives: number
  score: number
  id: number
  stageT: number
  spawnLeft: number
  clearT: number
  diveT: number
  fT: number
  blend: number
  chain: number
  chainT: number
  rapid: number
  spread: number
  fired: number
  hits: number
  chHits: number
  chTotal: number
  lastMilestone: number
  stats: { score: number; stage: number; kills: number; bosses: number; rescues: number; chHits: number }
}

// Paths in normalised screen space (x * W, y * H).
const ENTRY_TOP = [[0.56, -0.06], [0.56, 0.12], [0.44, 0.34], [0.22, 0.5], [0.12, 0.62], [0.2, 0.72], [0.34, 0.66], [0.38, 0.5], [0.32, 0.36]]
const ENTRY_SIDE = [[-0.08, 0.8], [0.12, 0.72], [0.34, 0.62], [0.5, 0.48], [0.52, 0.34], [0.4, 0.27], [0.3, 0.35], [0.36, 0.45], [0.44, 0.38]]
const ENTRY_LOOP = [[0.5, -0.06], [0.5, 0.2], [0.72, 0.42], [0.55, 0.62], [0.3, 0.5], [0.36, 0.3], [0.5, 0.26]]
const ENTRY_SWOOP = [[1.08, 0.12], [0.8, 0.22], [0.55, 0.52], [0.28, 0.6], [0.14, 0.45], [0.3, 0.3], [0.42, 0.32]]
const ENTRIES: Record<Entry, number[][]> = { top: ENTRY_TOP, side: ENTRY_SIDE, loop: ENTRY_LOOP, swoop: ENTRY_SWOOP }
const CH_PATHS = [
  [[-0.08, 0.3], [0.3, 0.35], [0.6, 0.55], [0.5, 0.75], [0.3, 0.65], [0.45, 0.45], [0.8, 0.4], [1.12, 0.5]],
  [[0.3, -0.06], [0.35, 0.3], [0.65, 0.45], [0.8, 0.3], [0.65, 0.15], [0.5, 0.35], [0.55, 0.7], [0.7, 1.08]],
  [[-0.08, 0.85], [0.25, 0.6], [0.5, 0.5], [0.75, 0.6], [0.75, 0.8], [0.5, 0.85], [0.3, 0.6], [0.4, 0.3], [0.6, 0.15], [1.12, 0.1]],
  [[0.5, -0.06], [0.5, 0.25], [0.3, 0.45], [0.5, 0.6], [0.7, 0.45], [0.5, 0.3], [0.2, 0.2], [-0.12, 0.3]],
]
const PALETTES = [
  ['#0b1030', '#030512', '#3b82f6'],
  ['#1e0b33', '#05030f', '#a855f7'],
  ['#071f2a', '#02070c', '#06b6d4'],
  ['#2a0b16', '#0d0306', '#f43f5e'],
  ['#0d2414', '#020a05', '#22c55e'],
  ['#2a1a06', '#0c0702', '#f59e0b'],
]
const POINTS: Record<Kind, [number, number]> = {
  bee: [50, 100],
  butterfly: [80, 160],
  boss: [150, 400],
  wasp: [70, 140],
  drone: [120, 240],
}
const SHIP_HALF = 14

function angDiff(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

function buildPath(pts: number[][], W: number, H: number, mirror: boolean) {
  const P = pts.map(([x, y]) => [(mirror ? 1 - x : x) * W, y * H])
  const path: number[] = []
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)]
    const p1 = P[i]
    const p2 = P[i + 1]
    const p3 = P[Math.min(P.length - 1, i + 2)]
    for (let k = 0; k < 10; k++) {
      const t = k / 10
      const t2 = t * t
      const t3 = t2 * t
      for (let d = 0; d < 2; d++) {
        path.push(0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3))
      }
    }
  }
  const last = P[P.length - 1]
  path.push(last[0], last[1])
  const lens = [0]
  for (let i = 2; i < path.length; i += 2) lens.push(lens[lens.length - 1] + Math.hypot(path[i] - path[i - 2], path[i + 1] - path[i - 1]))
  return { path, lens }
}

function makeStars(W: number, H: number): Star[] {
  const cols = ['#ffffff', '#bfdbfe', '#fde68a', '#fbcfe8', '#a5f3fc']
  return Array.from({ length: 90 }, () => ({ x: rand(0, W), y: rand(0, H), z: Math.random(), c: cols[Math.floor(Math.random() * cols.length)], tw: rand(0, 6) }))
}

function freshWorld(W: number, H: number): World {
  return {
    stage: 0,
    def: STAGES[0],
    boss: null,
    mines: [],
    livesAtStart: 3,
    lostShip: false,
    lastStars: 0,
    challenge: false,
    ship: { x: W / 2, tx: W / 2, alive: true, inv: 0, respawn: 0, dual: false, shield: false, fire: 0, capturedBy: 0, capT: 0, capX: 0, capY: 0 },
    enemies: [],
    shots: [],
    bombs: [],
    caps: [],
    rescue: null,
    stars: makeStars(W, H),
    lives: 3,
    score: 0,
    id: 1,
    stageT: 0,
    spawnLeft: 0,
    clearT: 0,
    diveT: 0,
    fT: 0,
    blend: 0,
    chain: 0,
    chainT: 0,
    rapid: 0,
    spread: 0,
    fired: 0,
    hits: 0,
    chHits: 0,
    chTotal: 0,
    lastMilestone: 0,
    stats: { score: 0, stage: 0, kills: 0, bosses: 0, rescues: 0, chHits: 0 },
  }
}

export default function GalagaGame() {
  const run = useActionRun('galaga')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(360, 600))
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ id: number; x: number } | null>(null)
  const keys = useRef({ l: false, r: false })
  const devAuto = useRef(false)
  const devSpeed = useRef(1)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    // Test hook for headless bots: dodge-and-aim autopilot, fast-forward, state readout.
    const hook = {
      auto: (on: boolean) => (devAuto.current = on),
      speed: (n: number) => (devSpeed.current = Math.max(1, Math.min(8, Math.round(n)))),
      state: () => {
        const w = world.current
        return { phase: phaseRef.current, stage: w.stage, name: w.def.name, enemies: w.enemies.length, boss: w.boss ? w.boss.hp : 0, lives: w.lives }
      },
    }
    ;(window as unknown as { __lv6galaga?: typeof hook }).__lv6galaga = hook
  }, [])

  /** DEV-only pilot: chase the nearest target column while steering clear of bombs, divers and lasers. */
  function autoPilot() {
    const w = world.current
    const s = w.ship
    const W = size.current.w
    const sy = shipY()
    let want = W / 2
    let best = 1e9
    for (const e of w.enemies) {
      if (e.state === 'wait') continue
      const d = Math.abs(e.x - s.x) + (e.state === 'form' ? 0 : 60)
      if (d < best) {
        best = d
        want = e.x
      }
    }
    if (w.boss) want = w.boss.x
    let bx = s.x
    let bc = 1e9
    for (let x = 22; x <= W - 22; x += 8) {
      let c = Math.abs(x - want) * 0.02 + Math.abs(x - s.x) * 0.004
      for (const b of w.bombs) {
        if (b.vy <= 0 || b.y > sy + 10 || b.y < sy - 220) continue
        const tt = (sy - b.y) / b.vy
        const px = b.x + b.vx * tt
        if (Math.abs(px - x) < 26) c += 12 / (0.3 + tt)
      }
      for (const e of w.enemies) {
        if (e.state === 'form' || e.state === 'wait' || e.y < sy - 200 || e.y > sy + 20) continue
        if (Math.abs(e.x - x) < 34) c += 8
      }
      if (w.boss?.laser && Math.abs(w.boss.laser.x - x) < 44) c += 40
      if (c < bc) {
        bc = c
        bx = x
      }
    }
    return bx
  }

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, stage: 1, chain: 0, rapid: false, spread: false, shield: false, dual: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, stage: Math.max(1, w.stage), chain: w.chain, rapid: w.rapid > 0, spread: w.spread > 0, shield: w.ship.shield, dual: w.ship.dual })
  }

  function show(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  const shipY = () => size.current.h - 74
  const spacing = () => Math.min(34, size.current.w / 11.2)

  function slotPos(col: number, row: number) {
    const w = world.current
    const W = size.current.w
    const sp = spacing()
    const sway = Math.sin(w.fT * 0.7) * W * 0.06 * (1 - w.blend)
    const breathe = 1 + Math.sin(w.fT * 1.5) * 0.07 * w.blend
    return { x: W / 2 + sway + (col - 4.5) * sp * breathe, y: (w.def.type === 'boss' ? 172 : 98) + row * sp * 0.84 * breathe }
  }

  function start(level: number = run.nextLevel) {
    void unlockAudio()
    const { w: W, h: H } = size.current
    const w = freshWorld(W, H)
    // Each stage is a level: the map replays beaten stages, Play continues at the next one.
    w.stage = Math.max(1, typeof level === 'number' && level > 0 ? Math.floor(level) : run.nextLevel) - 1
    w.lives = 3 + run.level('reserve')
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    nextStage()
  }

  function nextStage() {
    const w = world.current
    const { w: W, h: H } = size.current
    w.stage += 1
    w.stats.stage = w.stage
    const def = stageDef(w.stage)
    w.def = def
    w.challenge = def.type === 'challenge'
    w.stageT = 0
    w.diveT = 2.5
    w.blend = 0
    w.fired = 0
    w.hits = 0
    w.chHits = 0
    w.livesAtStart = w.lives
    w.lostShip = false
    w.enemies = []
    w.bombs = []
    w.boss = null
    const sp = Math.max(240, H * 0.48)
    const spawn = (kind: Kind, pts: number[][], mirror: boolean, delay: number, col: number, row: number, flyby: boolean) => {
      const { path, lens } = buildPath(pts, W, H, mirror)
      w.enemies.push({
        id: w.id++, kind, hp: kind === 'boss' || kind === 'drone' ? 2 : 1, col, row,
        x: path[0], y: path[1], a: Math.PI / 2, state: 'wait', path, lens, s: 0, seg: 0, delay,
        speed: sp * (flyby ? 1.15 + Math.min(0.25, w.stage * 0.012) : 1), t: 0, turn: 1, shots: 0, fireAt: 0, flash: 0, captive: false, beam: false, leader: 0, ox: 0, oy: 0,
      })
    }
    if (w.challenge) {
      const kinds: Kind[] = def.chKinds ?? ['bee', 'butterfly', 'wasp', 'drone', 'boss']
      for (let g = 0; g < 5; g++) {
        const pts = CH_PATHS[(g + w.stage) % CH_PATHS.length]
        const kind = kinds[g % kinds.length]
        for (let i = 0; i < 8; i++) {
          const pair = g % 2 === 1
          spawn(kind, pts, pair && i % 2 === 1, 1.6 + g * 2.6 + (pair ? Math.floor(i / 2) * 0.22 : i * 0.16), 0, 0, true)
        }
      }
      w.chTotal = 40
      for (const e of w.enemies) e.hp = 1
      sfx.levelUp()
    } else {
      // Authored formation: slots fly in groups of 8 along the stage's entry paths.
      const slots = gridSlots(def.grid)
      const base = 1.4
      for (let i = 0; i < slots.length; i++) {
        const g = Math.floor(i / 8)
        const k = i % 8
        const sl = slots[i]
        const entry = def.entries[g % Math.max(1, def.entries.length)] ?? 'top'
        spawn(sl.kind, ENTRIES[entry], g % 2 === 1, base + g * 2.4 + k * 0.16, sl.col, sl.row, false)
      }
      if (def.type === 'boss' && def.boss) {
        const b = def.boss
        w.boss = { def: b, x: W / 2, y: -90, hp: b.hp, max: b.hp, t: 0, atkT: 3.2, atkI: 0, laser: null, flash: 0, spawned: 0 }
        sfx.boom(0.5)
      } else sfx.ready()
    }
    show(`${def.type === 'boss' ? '👾 ' : ''}STAGE ${w.stage} · ${def.name.toUpperCase()}`, def.sub)
    w.spawnLeft = w.enemies.length
    pushHud()
    run.update(w.stats)
    if (w.stage > 1 && w.stage % 5 === 0 && w.stage !== w.lastMilestone) {
      w.lastMilestone = w.stage
      void trackEvent('action_milestone', { game_id: 'galaga', kind: 'stage', value: w.stage })
    }
  }

  /** Authored stages first; past them a generated stage keeps the old escalating recipe. */
  function stageDef(stage: number): StageDef {
    if (stage <= AUTHORED) return STAGES[stage - 1]
    if (stage % 5 === 0) {
      const tpl = STAGES[(Math.floor(stage / 5) % 4) * 5 + 4]
      return { ...tpl, boss: generatedBoss(stage) }
    }
    if (stage % 5 === 3) return { ...STAGES[[2, 7, 12, 17][stage % 4]], name: 'Challenge' }
    const wasp = Math.min(0.5, 0.2 + stage * 0.02)
    const drone = Math.min(0.5, 0.15 + stage * 0.015)
    const row = (n: number, k: 'b' | 'F') =>
      Array.from({ length: 10 }, (_, i) => (i < (10 - n) / 2 || i >= (10 + n) / 2 ? '.' : k === 'b' ? (Math.random() < wasp ? 'w' : 'b') : Math.random() < drone ? 'd' : 'F')).join('')
    return {
      name: 'Deep Space',
      sub: `sector ${stage}`,
      type: 'normal',
      grid: ['...BBBB...', row(8, 'F'), row(8, 'F'), row(10, 'b'), row(10, 'b')],
      entries: ['top', 'side', 'loop', 'swoop', 'side'],
      aggr: Math.min(1.35, 1 + (stage - AUTHORED) * 0.02),
      beam: true,
      palette: stage % PALETTES.length,
    }
  }

  function addScore(n: number, x: number, y: number, color = '#fef08a', big = false) {
    const w = world.current
    w.score += n
    w.stats.score = w.score
    fx.text(x, y, `${n}`, color, big ? 24 : 14)
  }

  function killEnemy(e: Enemy, byPlayer: boolean) {
    const w = world.current
    e.hp = 0
    const diving = e.state === 'dive' || e.state === 'beam' || e.state === 'escort' || e.state === 'return'
    const colors: Record<Kind, string[]> = {
      bee: ['#fde047', '#60a5fa', '#ffffff'],
      butterfly: ['#ef4444', '#3b82f6', '#ffffff'],
      boss: ['#22c55e', '#a855f7', '#fde047'],
      wasp: ['#fb923c', '#fef3c7', '#7c2d12'],
      drone: ['#94a3b8', '#22d3ee', '#e2e8f0'],
    }
    fx.burst(e.x, e.y, { count: e.kind === 'boss' ? 26 : 16, color: colors[e.kind], speed: 260, size: 3, gravity: 0, drag: 2.4, shape: 'spark' })
    fx.burst(e.x, e.y, { count: 6, color: colors[e.kind], speed: 120, size: 4, gravity: 0, shape: 'square' })
    fx.ring(e.x, e.y, { color: colors[e.kind][0], maxR: e.kind === 'boss' ? 40 : 26, life: 0.3 })
    if (!byPlayer) return
    w.stats.kills += 1
    w.hits += 1
    w.chainT = 1.1
    w.chain = Math.min(30, w.chain + 1)
    let pts = POINTS[e.kind][diving ? 1 : 0]
    if (w.challenge) {
      pts = 100
      w.chHits += 1
      w.stats.chHits = Math.max(w.stats.chHits, w.chHits)
    }
    if (e.kind === 'boss') {
      w.stats.bosses += 1
      if (e.captive) {
        pts += 1000
        w.rescue = { x: e.x - Math.cos(e.a) * 24, y: e.y - Math.sin(e.a) * 24, t: 0 }
        show('FIGHTER FREED!', 'catch the twin')
        sfx.power()
      }
      fx.shake(5, 0.18)
      fx.stop(0.05)
      sfx.boom(0.45)
      haptic.medium()
    } else {
      fx.shake(diving ? 2.5 : 1.5, 0.1)
      if (diving) fx.stop(0.025)
      sfx.score(Math.min(10, w.chain))
      haptic.light()
    }
    const bonus = w.chain >= 3 ? w.chain * 10 : 0
    addScore(pts + bonus, e.x, e.y - 14, diving ? '#fde68a' : '#fef9c3', pts >= 400)
    if (w.chain > 0 && w.chain % 10 === 0) {
      fx.text(e.x, e.y - 36, `CHAIN ${w.chain}!`, '#f0abfc', 20)
      sfx.combo()
    }
    // Capsule drops.
    const dropChance = (w.challenge ? 0 : 0.045) * (1 + run.level('salvage') * 0.3) + (e.kind === 'boss' ? 0.08 : 0)
    if (Math.random() < dropChance && w.caps.length < 3) {
      const roll = Math.random()
      const kind: PowerKind = roll < 0.4 ? 'rapid' : roll < 0.75 ? 'spread' : 'shield'
      w.caps.push({ x: e.x, y: e.y, kind, t: 0 })
    }
    run.update(w.stats)
    pushHud()
  }

  function loseShip(x: number, y: number) {
    const w = world.current
    const s = w.ship
    fx.explode(x, y, 1.6, ['#ffffff', '#fde047', '#f87171', '#60a5fa'])
    fx.flash('#ef4444', 0.25)
    fx.stop(0.12)
    sfx.boom(0.9)
    sfx.hurt()
    haptic.heavy()
    s.alive = false
    s.dual = false
    s.shield = false
    w.lostShip = true
    w.rapid = 0
    w.spread = 0
    w.chain = 0
    w.lives -= 1
    pushHud()
    if (w.lives <= 0) {
      die()
      return
    }
    s.respawn = 1.8
  }

  function hitShip(hx: number) {
    const w = world.current
    const s = w.ship
    if (!s.alive || s.inv > 0 || s.capturedBy) return
    if (s.shield) {
      s.shield = false
      s.inv = 1
      fx.ring(s.x, shipY(), { color: '#86efac', maxR: 54, life: 0.4, width: 5 })
      fx.burst(s.x, shipY(), { count: 18, color: ['#86efac', '#ffffff'], speed: 240, gravity: 0, shape: 'spark' })
      sfx.clang()
      haptic.medium()
      pushHud()
      return
    }
    if (s.dual) {
      const left = hx < s.x
      const px = s.x + (left ? -SHIP_HALF : SHIP_HALF)
      fx.explode(px, shipY(), 1.1)
      sfx.boom(0.6)
      sfx.hurt()
      fx.flash('#ef4444', 0.18)
      fx.stop(0.08)
      haptic.heavy()
      s.dual = false
      s.x += left ? SHIP_HALF : -SHIP_HALF
      s.tx = s.x
      s.inv = 1.2
      fx.text(s.x, shipY() - 40, 'TWIN LOST', '#fca5a5', 16)
      pushHud()
      return
    }
    loseShip(s.x, shipY())
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.slowmo(1, 0.3)
    fx.shake(12, 0.5)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.stage * 3 + w.stats.kills * 0.15 + w.stats.rescues * 5)
      run.end({ score: w.score, cleared: w.stage >= 4, stats: { ...w.stats }, coins }, revive)
    }, 1100)
  }

  function revive() {
    const w = world.current
    const { w: W } = size.current
    const s = w.ship
    w.lives = 2
    s.alive = true
    s.respawn = 0
    s.capturedBy = 0
    s.x = W / 2
    s.tx = W / 2
    s.inv = 2.5
    s.shield = true
    for (const b of w.bombs) fx.burst(b.x, b.y, { count: 3, color: '#fca5a5', speed: 80, gravity: 0 })
    w.bombs = []
    w.mines = []
    if (w.boss) {
      w.boss.laser = null
      w.boss.atkT = Math.max(w.boss.atkT, 2.5)
    }
    for (const e of w.enemies) {
      if ((e.state === 'dive' || e.state === 'beam' || e.state === 'escort') && e.y > size.current.h * 0.45) killEnemy(e, false)
    }
    w.enemies = w.enemies.filter((e) => e.hp > 0)
    fx.ring(s.x, shipY(), { color: '#fde047', maxR: 90, life: 0.6, width: 5 })
    show('REVIVED!')
    pushHud()
    setPhaseBoth('play')
  }

  function fire() {
    const w = world.current
    const s = w.ship
    const y = shipY() - 18
    const xs = s.dual ? [s.x - SHIP_HALF, s.x + SHIP_HALF] : [s.x]
    if (w.shots.length > 40) return
    for (const x of xs) {
      w.shots.push({ x, y, vx: 0, vy: -720 })
      if (w.spread > 0) {
        w.shots.push({ x, y, vx: -170, vy: -690 })
        w.shots.push({ x, y, vx: 170, vy: -690 })
      }
    }
    w.fired += xs.length
    sfx.shoot()
  }

  function enemyShoot(e: Enemy, spread: boolean) {
    const w = world.current
    const sp = Math.min(150 + w.stage * 14, 330)
    const tx = w.ship.x + rand(-30, 30)
    const a = Math.atan2(shipY() - e.y, tx - e.x)
    const aa = clamp(a, Math.PI * 0.2, Math.PI * 0.8)
    const list = spread ? [-0.28, 0, 0.28] : [0]
    for (const o of list) w.bombs.push({ x: e.x, y: e.y + 8, vx: Math.cos(aa + o) * sp, vy: Math.sin(aa + o) * sp })
  }

  function startDive(e: Enemy, beam: boolean) {
    const w = world.current
    const W = size.current.w
    e.state = 'dive'
    e.t = 0
    e.a = -Math.PI / 2
    e.turn = e.x < W / 2 ? -1 : 1
    e.beam = beam
    e.shots = beam ? 0 : w.stage <= 1 ? (Math.random() < 0.5 ? 1 : 0) : Math.min(1 + Math.floor(w.stage / 3), 4)
    e.fireAt = size.current.h * rand(0.3, 0.42)
    e.speed = Math.min(size.current.h * 0.34 + w.stage * 9, size.current.h * 0.58)
    if (beam) {
      e.ox = clamp(w.ship.x + (Math.random() < 0.5 ? -1 : 1) * rand(60, 100), 40, W - 40)
      sfx.whoosh()
    }
  }

  function scheduleDives(dt: number) {
    const w = world.current
    const s = w.ship
    if (!s.alive || s.capturedBy) return
    const formed = w.enemies.filter((e) => e.state === 'form')
    const busy = w.enemies.filter((e) => e.state === 'dive' || e.state === 'beam' || e.state === 'escort').length
    const entering = w.enemies.some((e) => e.state === 'wait' || e.state === 'enter')
    if (formed.length === 0) return
    const fewLeft = w.enemies.length <= 5 && !entering
    w.diveT -= dt * (fewLeft ? 2.2 : entering ? 0.4 : 1)
    const maxBusy = fewLeft ? 5 : Math.min(2 + Math.floor(w.stage / 2), 7)
    if (w.diveT > 0 || busy >= maxBusy) return
    w.diveT = (Math.max(0.7, 3 - w.stage * 0.2) * rand(0.7, 1.2)) / w.def.aggr
    const e = formed[Math.floor(Math.random() * formed.length)]
    if (e.kind === 'boss') {
      const beamBusy = w.enemies.some((o) => o.captive || o.state === 'beam' || (o.state === 'dive' && o.beam))
      if (w.def.beam && !beamBusy && !s.dual && !w.rescue && Math.random() < 0.45) {
        startDive(e, true)
        return
      }
      startDive(e, false)
      // Up to two butterflies escort the boss.
      const escorts = formed.filter((o) => (o.kind === 'butterfly' || o.kind === 'drone') && o.row === 1 && Math.abs(o.col - e.col) <= 2).slice(0, 2)
      escorts.forEach((o, i) => {
        o.state = 'escort'
        o.leader = e.id
        o.ox = i === 0 ? -22 : 22
        o.oy = -18
        o.shots = e.shots
        o.fireAt = e.fireAt + 20
      })
      return
    }
    startDive(e, false)
    // Later stages: dive in pairs.
    if (w.stage >= 3 && Math.random() < 0.35) {
      const mate = formed.find((o) => o !== e && o.kind === e.kind && Math.abs(o.col - e.col) === 1 && o.row === e.row)
      if (mate) startDive(mate, false)
    }
  }

  function updateEnemies(dt: number) {
    const w = world.current
    const { w: W, h: H } = size.current
    const s = w.ship
    const sy = shipY()
    for (const e of w.enemies) {
      if (e.hp <= 0) continue
      e.flash = Math.max(0, e.flash - dt)
      const slot = slotPos(e.col, e.row)
      switch (e.state) {
        case 'wait':
          e.delay -= dt
          if (e.delay <= 0) e.state = w.challenge ? 'flyby' : 'enter'
          break
        case 'enter':
        case 'flyby': {
          e.s += e.speed * dt
          const n = e.lens.length
          while (e.seg < n - 2 && e.lens[e.seg + 1] < e.s) e.seg++
          if (e.s >= e.lens[n - 1]) {
            if (e.state === 'flyby') {
              e.hp = 0
              break
            }
            e.state = 'join'
            break
          }
          const i = e.seg * 2
          const segLen = e.lens[e.seg + 1] - e.lens[e.seg] || 1
          const k = (e.s - e.lens[e.seg]) / segLen
          const dx = e.path[i + 2] - e.path[i]
          const dy = e.path[i + 3] - e.path[i + 1]
          e.x = e.path[i] + dx * k
          e.y = e.path[i + 1] + dy * k
          e.a = Math.atan2(dy, dx)
          // Some entering aliens take a pot-shot on later stages.
          if (e.state === 'enter' && w.stage >= 3 && e.y > H * 0.3 && e.y < H * 0.5 && Math.random() < 0.004 * w.stage) enemyShoot(e, false)
          break
        }
        case 'join':
        case 'return': {
          const dx = slot.x - e.x
          const dy = slot.y - e.y
          const d = Math.hypot(dx, dy)
          const sp = e.state === 'join' ? 320 : 240
          if (d < sp * dt + 1) {
            e.x = slot.x
            e.y = slot.y
            e.state = 'form'
          } else {
            const da = Math.atan2(dy, dx)
            e.a += angDiff(e.a, da) * Math.min(1, dt * 8)
            e.x += (dx / d) * sp * dt
            e.y += (dy / d) * sp * dt
          }
          break
        }
        case 'form':
          e.x = slot.x
          e.y = slot.y
          e.a += angDiff(e.a, Math.PI / 2) * Math.min(1, dt * 8)
          if (w.stage >= 5 && s.alive && Math.random() < 0.0009 * w.stage * dt * 60 && w.bombs.length < 24) enemyShoot(e, false)
          break
        case 'dive': {
          e.t += dt
          if (e.t < 0.7) {
            e.a += e.turn * 4.6 * dt
          } else {
            const tx = e.beam ? e.ox : s.x + Math.sin(e.t * 2.2 + e.id) * W * (w.enemies.length <= 4 ? 0.07 : 0.2)
            const ty = e.beam ? H * 0.5 : H + 80
            const da = Math.atan2(ty - e.y, tx - e.x)
            const rate = 2.6
            e.a += clamp(angDiff(e.a, da), -rate * dt, rate * dt)
            if (e.beam && (Math.hypot(tx - e.x, ty - e.y) < 14 || e.y > ty)) {
              e.state = 'beam'
              e.t = 0
              e.x = tx
              break
            }
          }
          e.x += Math.cos(e.a) * e.speed * dt
          e.y += Math.sin(e.a) * e.speed * dt
          if (e.shots > 0 && e.y > e.fireAt && s.alive) {
            enemyShoot(e, e.kind === 'wasp')
            e.shots -= 1
            e.fireAt += 46
            sfx.tick()
          }
          if (e.y > H + 30 || e.x < -60 || e.x > W + 60) {
            e.y = -30
            e.x = slot.x
            e.a = Math.PI / 2
            e.state = 'return'
            e.beam = false
          }
          break
        }
        case 'escort': {
          const L = w.enemies.find((o) => o.id === e.leader && o.hp > 0)
          if (!L || L.state === 'return' || L.state === 'form') {
            if (L && L.state === 'return') {
              e.state = 'return'
              e.y = -30 + e.oy
              e.x = L.x + e.ox
            } else {
              e.state = 'dive'
              e.t = 0.8
              e.speed = L ? L.speed : Math.min(H * 0.34 + w.stage * 9, H * 0.58)
            }
            break
          }
          const c = Math.cos(L.a - Math.PI / 2)
          const sn = Math.sin(L.a - Math.PI / 2)
          e.x = L.x + e.ox * c - e.oy * sn
          e.y = L.y + e.ox * sn + e.oy * c
          e.a = L.a
          if (e.shots > 0 && e.y > e.fireAt && s.alive) {
            enemyShoot(e, false)
            e.shots -= 1
            e.fireAt += 52
          }
          break
        }
        case 'beam': {
          e.t += dt
          e.a = Math.PI / 2
          if (e.t > 0.8 && e.t < 3.4 && !s.capturedBy && s.alive) e.x += clamp(s.x - e.x, -1, 1) * 38 * dt
          if (e.t > 0.8 && e.t < 3.4 && s.alive && !s.capturedBy && s.inv <= 0 && !s.dual) {
            const half = 14 + (sy - e.y) * 0.18
            if (Math.abs(s.x - e.x) < half) {
              s.capturedBy = e.id
              s.capT = 0
              s.capX = s.x
              s.capY = sy
              fx.flash('#a78bfa', 0.25)
              sfx.whoosh()
              haptic.heavy()
              show('CAPTURED!', 'shoot the boss to free it')
            }
          }
          if (s.capturedBy === e.id) {
            e.t = Math.min(e.t, 3)
            if (s.capT > 1.5) {
              s.capturedBy = 0
              e.captive = true
              e.state = 'return'
              e.a = -Math.PI / 2
              e.y -= 1
              loseShip2(e)
            }
          } else if (e.t > 3.6) {
            e.state = 'dive'
            e.beam = false
            e.t = 0.8
          }
          if (e.t > 0.8 && e.t < 3.4 && Math.floor(e.t * 6) !== Math.floor((e.t - dt) * 6)) sfx.tick()
          break
        }
      }
      // Body collision with the fighter.
      if (s.alive && !s.capturedBy && s.inv <= 0 && e.hp > 0 && e.state !== 'form' && e.state !== 'wait' && phaseRef.current === 'play') {
        const xs = s.dual ? [s.x - SHIP_HALF, s.x + SHIP_HALF] : [s.x]
        for (const hx of xs) {
          if (dist(hx, sy, e.x, e.y) < 20) {
            killEnemy(e, true)
            hitShip(hx)
            break
          }
        }
      }
    }
    w.enemies = w.enemies.filter((e) => e.hp > 0)
  }

  /** The beam finished pulling the fighter in — the ship is lost but can be rescued. */
  function loseShip2(boss: Enemy) {
    const w = world.current
    const s = w.ship
    s.alive = false
    w.lostShip = true
    w.lives -= 1
    w.chain = 0
    fx.ring(boss.x, boss.y, { color: '#c4b5fd', maxR: 50, life: 0.4 })
    sfx.hurt()
    pushHud()
    if (w.lives <= 0) {
      die()
      return
    }
    s.respawn = 1.6
  }

  // ── Mothership boss ─────────────────────────────

  function updateBoss(b: Mothership, dt: number) {
    const w = world.current
    const { w: W, h: H } = size.current
    const s = w.ship
    const sy = shipY()
    b.t += dt
    b.flash = Math.max(0, b.flash - dt)
    const ty = H * 0.2
    if (b.y < ty) b.y = Math.min(ty, b.y + 90 * dt)
    // Movement styles
    const m = b.def.move
    const amp = W * 0.3
    if (m === 'sway') b.x = W / 2 + Math.sin(b.t * 0.55) * amp
    else if (m === 'figure8') {
      b.x = W / 2 + Math.sin(b.t * 0.5) * amp
      if (b.y >= ty) b.y = ty + Math.sin(b.t * 1.0) * H * 0.04
    } else {
      // Dash: hold, then glide quickly to a new spot.
      const seg = Math.floor(b.t / 2.6)
      const k = Math.min(1, (b.t % 2.6) / 0.6)
      const from = W / 2 + Math.sin(seg * 2.1) * amp
      const to = W / 2 + Math.sin((seg + 1) * 2.1) * amp
      b.x = from + (to - from) * (k * k * (3 - 2 * k))
    }
    if (b.y < ty - 1 || phaseRef.current !== 'play') return
    // Laser: warn then fire at the locked column.
    if (b.laser) {
      const L = b.laser
      L.t += dt
      if (!L.fire && L.t > 1.05) {
        L.fire = true
        L.t = 0
        fx.shake(6, 0.3)
        sfx.boom(0.5)
      } else if (L.fire && L.t > 0.9) b.laser = null
      if (b.laser && L.fire && s.alive && !s.capturedBy && s.inv <= 0) {
        const xs = s.dual ? [s.x - SHIP_HALF, s.x + SHIP_HALF] : [s.x]
        for (const hx of xs) {
          if (Math.abs(hx - L.x) < 16) {
            hitShip(hx)
            break
          }
        }
      }
    }
    const hurt = 1 - b.hp / b.max
    b.atkT -= dt * (1 + hurt * 0.45)
    if (b.atkT > 0 || !s.alive) return
    b.atkT = b.def.every
    const atk = b.def.attacks[b.atkI++ % b.def.attacks.length]
    const cx = b.x
    const cy = b.y + 28 * b.def.size
    const sp = Math.min(170 + w.stage * 6, 300)
    if (atk === 'burst') {
      const a0 = Math.atan2(sy - cy, s.x - cx)
      for (const o of [-0.36, -0.18, 0, 0.18, 0.36]) w.bombs.push({ x: cx, y: cy, vx: Math.cos(a0 + o) * sp, vy: Math.sin(a0 + o) * sp })
      sfx.shoot()
    } else if (atk === 'ring') {
      const n = 14
      const off = b.t
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * Math.PI * 2
        if (Math.sin(a) < -0.2) continue
        w.bombs.push({ x: cx, y: cy, vx: Math.cos(a) * sp * 0.8, vy: Math.sin(a) * sp * 0.8 })
      }
      fx.ring(cx, cy, { color: b.def.glow, maxR: 50, life: 0.35 })
      sfx.pop()
    } else if (atk === 'laser') {
      b.laser = { x: clamp(s.x, 20, W - 20), t: 0, fire: false }
      sfx.power()
    } else if (atk === 'mines') {
      for (const o of [-0.25, 0.25]) w.mines.push({ x: clamp(cx + o * W * 0.6, 20, W - 20), y: cy, vy: 70 + Math.random() * 30, t: 0 })
      sfx.tick()
    } else if (atk === 'spawn' && w.enemies.length < 8) {
      // Launch a pair of kamikaze aliens straight at the fighter.
      for (const sd of [-1, 1]) {
        const { path, lens } = buildPath([[0.5, 0.15], [0.5, 0.16]], W, H, false)
        w.enemies.push({
          id: w.id++,
          kind: b.spawned % 2 ? 'wasp' : 'bee',
          hp: 1,
          col: sd < 0 ? 2 : 7,
          row: 4,
          x: cx + sd * 30,
          y: cy,
          a: Math.PI / 2,
          state: 'dive',
          path,
          lens,
          s: 0,
          seg: 0,
          delay: 0,
          speed: Math.min(H * 0.36 + w.stage * 6, H * 0.55),
          t: 0.75,
          turn: sd,
          shots: 1,
          fireAt: H * 0.4,
          flash: 0,
          captive: false,
          beam: false,
          leader: 0,
          ox: 0,
          oy: 0,
        })
        b.spawned++
      }
      fx.burst(cx, cy, { count: 14, color: [b.def.glow, '#ffffff'], speed: 160, gravity: 0, shape: 'spark' })
      sfx.whoosh()
    }
  }

  function hitBoss(b: Mothership, x: number, y: number) {
    const w = world.current
    b.hp -= 1
    b.flash = 0.06
    w.hits += 1
    fx.burst(x, y, { count: 5, color: ['#ffffff', b.def.glow], speed: 140, gravity: 0, shape: 'spark' })
    if (Math.random() < 0.3) sfx.hit()
    if (b.hp > 0) return
    // Boss destroyed: chain of explosions, big score and a capsule.
    const k = b.def.size
    for (let i = 0; i < 6; i++) fx.explode(b.x + rand(-40, 40) * k, b.y + rand(-16, 16) * k, 1.2, [b.def.glow, '#ffffff', '#fde047', b.def.hull])
    fx.flash('#ffffff', 0.35)
    fx.shake(14, 0.6)
    fx.slowmo(0.9, 0.3)
    fx.stop(0.15)
    sfx.boom(1)
    sfx.win()
    haptic.success()
    addScore(5000 + w.stage * 200, b.x, b.y, '#fde047', true)
    w.stats.bosses += 1
    w.caps.push({ x: b.x, y: b.y, kind: Math.random() < 0.5 ? 'spread' : 'shield', t: 0 })
    w.boss = null
    w.mines = []
    void trackEvent('action_milestone', { game_id: 'galaga', kind: 'boss', value: w.stage })
    run.update(w.stats)
    pushHud()
  }

  function updateMines(dt: number) {
    const w = world.current
    const H = size.current.h
    for (const m of w.mines) {
      m.t += dt
      m.y += m.vy * dt
      if (m.y > H * 0.58 || m.t > 4) {
        // Shrapnel burst
        m.t = 99
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.3
          w.bombs.push({ x: m.x, y: m.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140 })
        }
        fx.burst(m.x, m.y, { count: 12, color: ['#fb923c', '#fde047'], speed: 160, gravity: 0, shape: 'spark' })
        sfx.pop()
      }
    }
    w.mines = w.mines.filter((m) => m.t < 99)
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, x: localPoint(e, e.currentTarget).x }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const x = localPoint(e, e.currentTarget).x
    const s = world.current.ship
    s.tx = clamp(s.tx + (x - d.x) * 1.25, 22, size.current.w - 22)
    d.x = x
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null
  }

  useEffect(() => {
    function key(e: KeyboardEvent, down: boolean) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.l = down
      else if (e.key === 'ArrowRight' || e.key === 'd') keys.current.r = down
      else return
      e.preventDefault()
    }
    const kd = (e: KeyboardEvent) => key(e, true)
    const ku = (e: KeyboardEvent) => key(e, false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])

  function simulate(raw: number) {
    const { w: W, h: H } = size.current
    const w = world.current
    const s = w.ship
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const sy = shipY()
    const playing = ph === 'play'

    w.fT += dt
    const allIn = !w.enemies.some((e) => e.state === 'wait' || e.state === 'enter' || e.state === 'join')
    w.blend = clamp(w.blend + (allIn && !w.challenge ? dt : -dt) * 0.8, 0, 1)

    // Stars scroll faster between stages.
    const warp = w.clearT > 0 ? 4 : 1
    for (const st of w.stars) {
      st.y += (16 + st.z * 70) * warp * raw
      if (st.y > H) {
        st.y -= H
        st.x = rand(0, W)
      }
    }

    if (playing || ph === 'dying') {
      w.stageT += dt
      // Ship movement
      if (import.meta.env.DEV && devAuto.current && s.alive && !s.capturedBy) s.tx = autoPilot()
      if (s.alive && !s.capturedBy) {
        if (keys.current.l) s.tx = clamp(s.tx - 340 * dt, 22, W - 22)
        if (keys.current.r) s.tx = clamp(s.tx + 340 * dt, 22, W - 22)
        const lim = s.dual ? 22 + SHIP_HALF : 22
        s.tx = clamp(s.tx, lim, W - lim)
        s.x += (s.tx - s.x) * Math.min(1, dt * 18)
      }
      s.inv = Math.max(0, s.inv - dt)
      if (!s.alive && s.respawn > 0 && playing) {
        s.respawn -= dt
        if (s.respawn <= 0) {
          s.alive = true
          s.x = W / 2
          s.tx = W / 2
          s.inv = 2.2
          fx.ring(s.x, sy, { color: '#93c5fd', maxR: 60, life: 0.5 })
          sfx.ready()
        }
      }
      if (s.capturedBy) {
        s.capT += dt
        const boss = w.enemies.find((e) => e.id === s.capturedBy)
        if (!boss) {
          // Captor destroyed mid-pull: fall back to position.
          s.capturedBy = 0
          s.inv = 1.5
        } else {
          const k = Math.min(1, s.capT / 1.5)
          s.capX = s.x + (boss.x - s.x) * k
          s.capY = sy + (boss.y - 24 - sy) * k
        }
      }

      // Firing
      if (s.alive && !s.capturedBy && playing && w.clearT <= 0) {
        s.fire -= dt
        if (s.fire <= 0) {
          fire()
          s.fire = (0.24 / (1 + run.level('cannon') * 0.12)) * (w.rapid > 0 ? 0.55 : 1)
        }
      }
      w.rapid = Math.max(0, w.rapid - dt)
      w.spread = Math.max(0, w.spread - dt)
      if (w.chainT > 0) {
        w.chainT -= dt
        if (w.chainT <= 0 && w.chain > 0) {
          w.chain = 0
          pushHud()
        }
      }

      if (playing) scheduleDives(dt)
      updateEnemies(dt)
      if (w.boss) updateBoss(w.boss, dt)
      updateMines(dt)

      // Player shots
      for (const b of w.shots) {
        b.x += b.vx * dt
        b.y += b.vy * dt
        if (b.y < -20) {
          b.y = -999
          continue
        }
        const mb = w.boss
        if (mb && mb.y > 0) {
          const k = mb.def.size
          const nx = (b.x - mb.x) / (48 * k)
          const ny = (b.y - mb.y - 2 * k) / (24 * k)
          if (nx * nx + ny * ny < 1) {
            hitBoss(mb, b.x, b.y)
            b.y = -999
            continue
          }
        }
        for (const e of w.enemies) {
          if (e.hp <= 0 || e.state === 'wait') continue
          // Captive fighter above a boss can be shot (and lost).
          if (e.captive) {
            const cx = e.x - Math.cos(e.a) * 24
            const cy = e.y - Math.sin(e.a) * 24
            if (dist(b.x, b.y, cx, cy) < 11) {
              e.captive = false
              b.y = -999
              fx.explode(cx, cy, 0.8, ['#fca5a5', '#ffffff', '#f87171'])
              fx.text(cx, cy - 16, 'FIGHTER LOST', '#fca5a5', 14)
              sfx.boom(0.4)
              break
            }
          }
          const r = e.kind === 'boss' ? 15 : 12
          if (Math.abs(b.x - e.x) < r && Math.abs(b.y - e.y) < r + 4) {
            b.y = -999
            e.hp -= 1
            e.flash = 0.08
            if (e.hp <= 0) killEnemy(e, true)
            else {
              fx.burst(b.x, b.y, { count: 6, color: ['#ffffff', '#c4b5fd'], speed: 140, gravity: 0, shape: 'spark' })
              sfx.hit()
              haptic.light()
            }
            break
          }
        }
      }
      w.shots = w.shots.filter((b) => b.y > -100)
      w.enemies = w.enemies.filter((e) => e.hp > 0)

      // Enemy shots
      for (const b of w.bombs) {
        b.x += b.vx * dt
        b.y += b.vy * dt
        if (s.alive && playing && !s.capturedBy && s.inv <= 0) {
          const xs = s.dual ? [s.x - SHIP_HALF, s.x + SHIP_HALF] : [s.x]
          for (const hx of xs) {
            if (Math.abs(b.x - hx) < 7 && Math.abs(b.y - (sy + 2)) < 11) {
              b.y = H + 999
              hitShip(hx)
              break
            }
          }
        }
      }
      w.bombs = w.bombs.filter((b) => b.y < H + 20 && b.x > -20 && b.x < W + 20)

      // Capsules
      for (const c of w.caps) {
        c.t += dt
        c.y += 95 * dt
        if (s.alive && !s.capturedBy && Math.abs(c.x - s.x) < (s.dual ? 34 : 24) && Math.abs(c.y - sy) < 24) {
          c.y = H + 999
          const dur = 10 + run.level('salvage') * 2
          if (c.kind === 'rapid') w.rapid = dur
          else if (c.kind === 'spread') w.spread = dur
          else s.shield = true
          const label = c.kind === 'rapid' ? 'RAPID FIRE' : c.kind === 'spread' ? 'SPREAD SHOT' : 'SHIELD'
          fx.text(s.x, sy - 40, label, c.kind === 'rapid' ? '#fde047' : c.kind === 'spread' ? '#67e8f9' : '#86efac', 18)
          fx.ring(s.x, sy, { color: '#ffffff', maxR: 44, life: 0.35 })
          sfx.power()
          haptic.success()
          pushHud()
        }
      }
      w.caps = w.caps.filter((c) => c.y < H + 30)

      // Rescue docking
      if (w.rescue) {
        const r = w.rescue
        r.t += dt
        const tx = s.alive ? s.x + SHIP_HALF : W / 2
        const dx = tx - r.x
        const dy = sy - r.y
        const d = Math.hypot(dx, dy)
        const sp = 260
        if (d < sp * dt + 2 && r.t > 0.8) {
          w.rescue = null
          w.stats.rescues += 1
          if (s.alive && !s.dual && !s.capturedBy) {
            s.dual = true
            s.x -= 0
            s.tx = clamp(s.x, 22 + SHIP_HALF, W - 22 - SHIP_HALF)
            show('DUAL FIGHTER!', 'double firepower')
          } else {
            w.lives += 1
            fx.text(W / 2, sy - 40, '+1 FIGHTER', '#86efac', 20)
          }
          fx.ring(tx, sy, { color: '#f9a8d4', maxR: 60, life: 0.5, width: 5 })
          fx.burst(tx, sy, { count: 22, color: ['#f9a8d4', '#ffffff', '#93c5fd'], speed: 220, gravity: 0, shape: 'spark' })
          sfx.levelUp()
          haptic.success()
          run.update(w.stats)
          pushHud()
        } else if (r.t > 0.8) {
          r.x += (dx / d) * sp * dt
          r.y += (dy / d) * sp * dt
        } else {
          r.y += 30 * dt
        }
      }

      // Stage flow
      if (playing && w.clearT <= 0 && w.enemies.length === 0 && !w.boss && w.stage > 0) {
        w.clearT = 2.6
        // Stars — challenge: finish = 1, 30+ hits = 2, perfect = 3. Otherwise: clear = 1,
        // no fighter lost this stage = +1, hit ratio 50%+ = +1.
        const ratio = w.fired ? w.hits / w.fired : 0
        const stars = w.challenge ? 1 + (w.chHits >= 30 ? 1 : 0) + (w.chHits === w.chTotal ? 1 : 0) : 1 + (w.lostShip ? 0 : 1) + (ratio >= 0.5 ? 1 : 0)
        w.lastStars = stars
        run.completeLevel(w.stage, stars)
        const starTxt = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`
        if (w.challenge) {
          const bonus = w.chHits === w.chTotal ? 10000 : w.chHits * 100
          w.score += bonus
          w.stats.score = w.score
          show(w.chHits === w.chTotal ? 'PERFECT!' : `${w.chHits} HITS`, `${starTxt}  bonus ${bonus}`)
          if (w.chHits === w.chTotal) {
            fx.flash('#fde047', 0.3)
            void trackEvent('action_milestone', { game_id: 'galaga', kind: 'perfect', value: w.stage })
          }
          sfx.win()
        } else {
          const bonus = w.stage * 100
          w.score += bonus
          w.stats.score = w.score
          show(w.def.type === 'boss' ? 'BOSS DOWN!' : 'STAGE CLEAR', `${starTxt}  hit ratio ${Math.round(ratio * 100)}% · +${bonus}`)
          sfx.win()
        }
        haptic.success()
        run.update(w.stats)
        pushHud()
      }
      if (w.clearT > 0) {
        w.clearT -= dt
        if (w.clearT <= 0 && playing) nextStage()
      }
    }

  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    if (size.current.w !== W || size.current.h !== H) {
      size.current = { w: W, h: H }
      if (phaseRef.current === 'idle') world.current = freshWorld(W, H)
    }
    const reps = import.meta.env.DEV ? devSpeed.current : 1
    for (let k = 0; k < reps; k++) simulate(raw)
    const w = world.current
    const s = w.ship
    const ph = phaseRef.current
    const sy = shipY()
    const warp = w.clearT > 0 ? 4 : 1

    // ── Draw ─────────────────────────────────────
    const pal = PALETTES[(ph === 'idle' ? 0 : w.def.palette) % PALETTES.length]
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, pal[0])
    bg.addColorStop(1, pal[1])
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    glow(ctx, W * 0.75, H * 0.22, W * 0.6, pal[2], 0.13)
    glow(ctx, W * 0.15, H * 0.7, W * 0.5, '#ec4899', 0.07)
    for (const st of w.stars) {
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * 2 + st.tw))
      ctx.globalAlpha = (0.25 + st.z * 0.75) * tw
      ctx.fillStyle = st.c
      const len = warp > 1 ? 2 + st.z * 14 : 0
      if (len) ctx.fillRect(st.x, st.y - len, 1.2, len)
      else ctx.fillRect(st.x, st.y, 1 + st.z * 1.4, 1 + st.z * 1.4)
    }
    ctx.globalAlpha = 1

    fx.applyShake(ctx)

    if (ph === 'idle') {
      // Attract mode: a flapping formation over a patrolling fighter.
      const sp = spacing()
      const kinds: Kind[] = ['boss', 'butterfly', 'bee']
      for (let r = 0; r < 3; r++) {
        const n = r === 0 ? 4 : 8
        for (let c = 0; c < n; c++) {
          const x = W / 2 + (c - (n - 1) / 2) * sp * 1.05 + Math.sin(t * 0.8) * 20
          const y = H * 0.2 + r * sp * 0.95 + Math.sin(t * 2 + c) * 2
          drawAlien(ctx, kinds[r], x, y, 0, t * 6 + c, false, false)
        }
      }
      const px = W / 2 + Math.sin(t * 0.9) * W * 0.3
      drawFighter(ctx, px, sy, 1, false, t)
      if (Math.floor(t * 4) !== Math.floor((t - raw) * 4)) w.shots.push({ x: px, y: sy - 18, vx: 0, vy: -600 })
      for (const b of w.shots) b.y += b.vy * raw
      w.shots = w.shots.filter((b) => b.y > H * 0.15)
    }

    // Tractor beams
    for (const e of w.enemies) {
      if (e.state !== 'beam') continue
      const len = sy + 30 - e.y
      if (e.t < 0.8) {
        if (Math.floor(e.t * 14) % 2 === 0) {
          ctx.strokeStyle = 'rgba(196,181,253,0.7)'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(e.x - 8, e.y + 12)
          ctx.lineTo(e.x - 14 - len * 0.18, e.y + len)
          ctx.moveTo(e.x + 8, e.y + 12)
          ctx.lineTo(e.x + 14 + len * 0.18, e.y + len)
          ctx.stroke()
        }
      } else if (e.t < 3.4 || s.capturedBy === e.id) {
        const grow = Math.min(1, (e.t - 0.8) * 3)
        const L = len * grow
        const g = ctx.createLinearGradient(0, e.y, 0, e.y + L)
        g.addColorStop(0, 'rgba(167,139,250,0.75)')
        g.addColorStop(1, 'rgba(56,189,248,0.25)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(e.x - 8, e.y + 10)
        ctx.lineTo(e.x + 8, e.y + 10)
        ctx.lineTo(e.x + 14 + L * 0.18, e.y + L)
        ctx.lineTo(e.x - 14 - L * 0.18, e.y + L)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(224,231,255,0.65)'
        ctx.lineWidth = 2
        for (let k = 0; k < 6; k++) {
          const yy = ((t * 120 + k * (L / 6)) % L) + e.y + 10
          const half = 8 + (yy - e.y) * 0.18
          ctx.beginPath()
          ctx.ellipse(e.x, yy, half, 3, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    // Mothership, its laser and mines
    const mb = w.boss
    if (mb) {
      if (mb.laser) {
        const L = mb.laser
        if (!L.fire) {
          ctx.strokeStyle = `rgba(239,68,68,${Math.floor(L.t * 12) % 2 ? 0.9 : 0.4})`
          ctx.lineWidth = 2
          ctx.setLineDash([8, 6])
          ctx.beginPath()
          ctx.moveTo(L.x, mb.y + 30)
          ctx.lineTo(L.x, H)
          ctx.stroke()
          ctx.setLineDash([])
        } else {
          const k = Math.min(1, L.t * 8) * Math.min(1, (0.9 - L.t) * 6)
          glow(ctx, L.x, sy, 60, '#f87171', 0.5 * k)
          ctx.fillStyle = `rgba(248,113,113,${0.55 * k})`
          ctx.fillRect(L.x - 16, mb.y + 26, 32, H)
          ctx.fillStyle = `rgba(255,255,255,${0.9 * k})`
          ctx.fillRect(L.x - 5, mb.y + 26, 10, H)
        }
      }
      drawMothership(ctx, mb.x, mb.y, mb.def.size, mb.def.hull, mb.def.glow, t, mb.flash > 0, 1 - mb.hp / mb.max)
    }
    for (const m of w.mines) {
      const pulse = 0.6 + Math.sin(m.t * 12) * 0.4
      glow(ctx, m.x, m.y, 18, '#fb923c', 0.35 * pulse)
      ctx.fillStyle = '#292524'
      ctx.beginPath()
      ctx.arc(m.x, m.y, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fb923c'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + m.t * 2
        ctx.moveTo(m.x + Math.cos(a) * 7, m.y + Math.sin(a) * 7)
        ctx.lineTo(m.x + Math.cos(a) * 11, m.y + Math.sin(a) * 11)
      }
      ctx.stroke()
      ctx.fillStyle = `rgba(253,224,71,${pulse})`
      ctx.beginPath()
      ctx.arc(m.x, m.y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Enemies
    for (const e of w.enemies) {
      if (e.state === 'wait') continue
      const moving = e.state !== 'form'
      drawAlien(ctx, e.kind, e.x, e.y, e.a - Math.PI / 2, (moving ? 14 : 7) * w.fT + e.id, e.kind === 'boss' ? e.hp < 2 : e.kind === 'drone' && e.hp < 2, e.flash > 0)
      if (e.captive) drawFighter(ctx, e.x - Math.cos(e.a) * 24, e.y - Math.sin(e.a) * 24, 0.85, true, t, e.a - Math.PI / 2 + Math.PI)
    }

    // Capsules
    for (const c of w.caps) drawCapsule(ctx, c.x, c.y, c.kind, c.t)

    // Enemy shots
    for (const b of w.bombs) {
      const a = Math.atan2(b.vy, b.vx)
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(a)
      ctx.fillStyle = 'rgba(248,113,113,0.35)'
      ctx.beginPath()
      ctx.ellipse(-3, 0, 9, 4.5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f87171'
      ctx.beginPath()
      ctx.moveTo(6, 0)
      ctx.lineTo(0, -3)
      ctx.lineTo(-6, 0)
      ctx.lineTo(0, 3)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fff7ed'
      ctx.fillRect(-2, -1, 5, 2)
      ctx.restore()
    }

    // Player shots
    ctx.lineCap = 'round'
    for (const b of w.shots) {
      ctx.strokeStyle = 'rgba(103,232,249,0.35)'
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(b.x, b.y)
      ctx.lineTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018)
      ctx.stroke()
      ctx.strokeStyle = '#ecfeff'
      ctx.lineWidth = 2.4
      ctx.stroke()
    }

    // Rescue fighter
    if (w.rescue) drawFighter(ctx, w.rescue.x, w.rescue.y, 1, false, t, w.rescue.t < 0.8 ? w.rescue.t * 8 : 0)

    // Player fighter
    if (ph !== 'idle' && s.alive && !(s.inv > 0 && Math.floor(t * 14) % 2 === 0)) {
      if (s.capturedBy) {
        drawFighter(ctx, s.capX, s.capY, 1 - Math.min(0.15, s.capT * 0.1), false, t, s.capT * 9)
      } else {
        const tilt = clamp((s.tx - s.x) * 0.02, -0.35, 0.35)
        if (s.dual) {
          drawFighter(ctx, s.x - SHIP_HALF, sy, 1, false, t, 0, tilt)
          drawFighter(ctx, s.x + SHIP_HALF, sy, 1, false, t, 0, tilt)
        } else drawFighter(ctx, s.x, sy, 1, false, t, 0, tilt)
        if (s.shield) {
          ctx.strokeStyle = `rgba(134,239,172,${0.5 + Math.sin(t * 6) * 0.2})`
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.arc(s.x, sy, s.dual ? 34 : 24, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
    }

    fx.draw(ctx)
    ctx.restore()

    // Boss health bar
    if (mb && ph !== 'idle') {
      const bw = W * 0.6
      const bx = (W - bw) / 2
      const by = 70
      ctx.fillStyle = 'rgba(15,23,42,0.7)'
      ctx.beginPath()
      ctx.roundRect(bx - 2, by - 2, bw + 4, 10, 5)
      ctx.fill()
      ctx.fillStyle = mb.def.glow
      ctx.beginPath()
      ctx.roundRect(bx, by, bw * Math.max(0, mb.hp / mb.max), 6, 3)
      ctx.fill()
      ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.fillStyle = '#e2e8f0'
      ctx.fillText(mb.def.name, W / 2, by - 5)
    }
    // Reserve fighters
    if (ph !== 'idle') {
      for (let i = 0; i < Math.min(6, w.lives - (s.alive ? 1 : 0)); i++) drawFighter(ctx, 18 + i * 22, H - 20, 0.6, false, 0, 0, 0, false)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Level {hud.stage}</div>
                {hud.chain >= 3 ? <div className="galaga-chain">Chain ×{hud.chain}</div> : null}
              </div>
              <div className="action-hud__right galaga-chips">
                {hud.dual ? <span className="galaga-chip galaga-chip--dual">TWIN</span> : null}
                {hud.rapid ? <span className="galaga-chip galaga-chip--rapid">RAPID</span> : null}
                {hud.spread ? <span className="galaga-chip galaga-chip--spread">SPREAD</span> : null}
                {hud.shield ? <span className="galaga-chip galaga-chip--shield">SHIELD</span> : null}
              </div>
            </div>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="galaga"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to slide your fighter. It fires on its own — clear the swarm, dodge the divers and free captured ships."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.stage >= 4 ? 'Ace pilot!' : 'Squadron down'}
            subtitle={`Score ${hud.score} · Level ${hud.stage}`}
            celebrate={hud.stage >= 4}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
