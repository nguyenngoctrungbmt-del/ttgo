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
import { useProgressStore } from '../../store/progressStore'
import { BIOMES, CAR_COLORS, drawCar, drawCoin, drawEagle, drawFrog, drawLily, drawLog, drawObstacle, drawTrain, shade } from './art'
import { drawAmbient, drawEdgeWarn, drawRushTint, drawShieldAura, drawShieldPickup, drawSnake, drawVent } from './art2'
import '../../shared/action/action.css'

const meta = getGame('hopper')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type LaneType = 'grass' | 'road' | 'river' | 'rail'
type Car = { x: number; len: number; color: string; kind: 'car' | 'truck' | 'bus' }
type Log = { x: number; len: number }
type Lane = {
  r: number
  type: LaneType
  biome: number
  obst: number[]
  coins: boolean[]
  dir: 1 | -1
  speed: number
  cars: Car[]
  logs: Log[]
  lily: boolean[] | null
  spawnT: number
  gapMin: number
  gapMax: number
  trainT: number
  trainX: number | null
  warnTick: number
  /** lava vents on grass cells (from row 110) */
  vent: boolean[] | null
  ventPh: number
  /** coral snake slithering along a grass lane (from row 70) */
  snake: Snake | null
  /** column of a shield pickup, -1 if none */
  shield: number
  /** part of a Gold Rush stretch */
  rush: boolean
}
type Snake = { x: number; wait: number; speed: number; len: number }
type Death = '' | 'splat' | 'drown' | 'eagle' | 'train' | 'burn' | 'bite'
type Player = {
  x: number
  r: number
  fx: number
  fr: number
  tx: number
  tr: number
  hop: number
  face: number
  log: Log | null
  logOff: number
  squash: number
  queued: number
  blink: number
}

const COLS = 9
const C = 40
const HOP_TIME = 0.13
const TRAIN_LEN = 7.5
const TRAIN_SPEED = 24
// dir index: 0 up, 1 right, 2 down, 3 left
const DX = [0, 1, 0, -1]
const DR = [1, 0, -1, 0]
// New content thresholds (rows)
const SHIELD_ROW = 50
const SNAKE_ROW = 70
const VENT_ROW = 110
const RUSH_START = 90
const RUSH_EVERY = 120
const RUSH_LEN = 12
// Lava vent cycle (s): dormant → warning (VENT_WARN..VENT_ERUPT) → eruption (VENT_ERUPT..VENT_P)
const VENT_P = 3.6
const VENT_WARN = 1.9
const VENT_ERUPT = 2.8

function ventPhase(l: Lane, time: number) {
  return (((time + l.ventPh) % VENT_P) + VENT_P) % VENT_P
}

type World = {
  lanes: Lane[]
  p: Player
  camRow: number
  time: number
  maxRow: number
  coins: number
  pc: number
  hazardRun: number
  lastRiverDir: 1 | -1
  dead: Death
  deadT: number
  invuln: number
  eagleX: number
  best: number
  bestShown: boolean
  idleHop: number
  stats: { rows: number; coins: number; roads: number; rivers: number; rails: number }
  shield: boolean
  rushFrom: number
  rushTo: number
  rushCoins: number
  rushStage: number
  /** first row where each new hazard was announced */
  seen: { snake: boolean; vent: boolean; shield: boolean }
}

function freshPlayer(): Player {
  return { x: 4, r: 1, fx: 4, fr: 1, tx: 4, tr: 1, hop: 1, face: 0, log: null, logOff: 0, squash: 0, queued: -1, blink: 2 }
}

function freshWorld(): World {
  return {
    lanes: [],
    p: freshPlayer(),
    camRow: 0,
    time: 0,
    maxRow: 1,
    coins: 0,
    pc: 4,
    hazardRun: 0,
    lastRiverDir: 1,
    dead: '',
    deadT: 0,
    invuln: 0,
    eagleX: 4,
    best: 0,
    bestShown: false,
    idleHop: 1.5,
    stats: { rows: 0, coins: 0, roads: 0, rivers: 0, rails: 0 },
    shield: false,
    rushFrom: -1,
    rushTo: -1,
    rushCoins: 0,
    rushStage: 0,
    seen: { snake: false, vent: false, shield: false },
  }
}

export default function HopperGame() {
  const run = useActionRun('hopper')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const ptr = useRef<{ id: number; x: number; y: number } | null>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, coins: 0, biome: 0, shield: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  const live = () => phaseRef.current === 'play'
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }
  function pushHud() {
    const w = world.current
    setHud({ score: w.maxRow - 1, coins: w.coins, biome: Math.floor(Math.max(0, w.maxRow) / 40) % BIOMES.length, shield: w.shield })
  }

  function view() {
    const { w: W, h: H } = size.current
    const S = W / (COLS * C)
    return { W, H, S, VW: COLS * C, VH: H / S }
  }
  function rowY(r: number) {
    return view().VH - (r - world.current.camRow + 2.2) * C
  }
  function colX(c: number) {
    return (c + 0.5) * C
  }
  function scr(c: number, r: number) {
    const v = view()
    return { x: colX(c) * v.S, y: rowY(r) * v.S }
  }

  // ── World generation ──────────────────────────────────

  function lane(r: number): Lane | undefined {
    const w = world.current
    const first = w.lanes[0]
    if (!first) return undefined
    return w.lanes[r - first.r]
  }

  function stepLane(l: Lane, dt: number) {
    const sn = l.snake
    if (sn && l.type === 'grass') {
      if (sn.wait > 0) sn.wait -= dt
      else {
        sn.x += l.dir * sn.speed * dt
        if (sn.x < -sn.len - 1 || sn.x > COLS + sn.len + 1) {
          sn.x = l.dir > 0 ? -0.6 : COLS - 0.4
          sn.wait = rand(1.4, 2.8)
        }
      }
    }
    if (l.type === 'road' || (l.type === 'river' && !l.lily)) {
      const list: { x: number; len: number }[] = l.type === 'road' ? l.cars : l.logs
      for (const o of list) o.x += l.dir * l.speed * dt
      for (let i = list.length - 1; i >= 0; i--) if (list[i].x < -4 || list[i].x > COLS + 3) list.splice(i, 1)
      l.spawnT -= dt
      if (l.spawnT <= 0) {
        let len: number
        if (l.type === 'road') {
          const truck = Math.random() < Math.min(0.4, l.r * 0.004)
          const bus = !truck && l.r > 80 && Math.random() < 0.15
          len = truck ? 2.4 : bus ? 3 : 1.3
          l.cars.push({ x: l.dir > 0 ? -1 - len / 2 : COLS + len / 2, len, color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], kind: truck ? 'truck' : bus ? 'bus' : 'car' })
        } else {
          len = l.r > 110 ? 2 + Math.floor(Math.random() * 2) : 2 + Math.floor(Math.random() * 3)
          l.logs.push({ x: l.dir > 0 ? -1 - len / 2 : COLS + len / 2, len })
        }
        l.spawnT = (len + rand(l.gapMin, l.gapMax)) / l.speed
      }
    } else if (l.type === 'rail') {
      if (l.trainX == null) {
        l.trainT -= dt
        if (l.trainT <= 0) l.trainX = l.dir > 0 ? -TRAIN_LEN : COLS + TRAIN_LEN
      } else {
        l.trainX += l.dir * TRAIN_SPEED * dt
        if (l.trainX < -TRAIN_LEN - 2 || l.trainX > COLS + TRAIN_LEN + 2) {
          l.trainX = null
          l.trainT = rand(3.5, 7.5)
        }
      }
    }
  }

  function genLane(r: number): Lane {
    const w = world.current
    const biome = Math.floor(Math.max(0, r) / 40) % BIOMES.length
    const prevPc = w.pc
    if (Math.random() < 0.55) w.pc = clamp(w.pc + (Math.random() < 0.5 ? -1 : 1), 1, COLS - 2)
    let type: LaneType = 'grass'
    if (r >= 4 && r % 40 !== 0) {
      const maxRun = r < 60 ? 3 : r < 150 ? 4 : 5
      if (w.hazardRun < maxRun) {
        const roll = Math.random()
        const pGrass = Math.max(0.2, 0.36 - r * 0.0008)
        const pRiver = r >= 12 ? 0.24 : 0
        const pRail = r >= 25 ? 0.12 : 0
        if (roll < pGrass) type = 'grass'
        else if (roll < pGrass + pRiver) type = 'river'
        else if (roll < pGrass + pRiver + pRail) type = 'rail'
        else type = 'road'
      }
    }
    w.hazardRun = type === 'grass' ? 0 : w.hazardRun + 1
    const l: Lane = {
      r,
      type,
      biome,
      obst: new Array(COLS).fill(0),
      coins: new Array(COLS).fill(false),
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: 1,
      cars: [],
      logs: [],
      lily: null,
      spawnT: 0,
      gapMin: 2,
      gapMax: 4,
      trainT: rand(2, 6),
      trainX: null,
      warnTick: 0,
      vent: null,
      ventPh: rand(0, VENT_P),
      snake: null,
      shield: -1,
      rush: false,
    }
    // Gold Rush: a golden stretch of lanes packed with coins (no snakes/vents, calmer traffic).
    if (r >= RUSH_START && (r - RUSH_START) % RUSH_EVERY === 0) {
      w.rushFrom = r
      w.rushTo = r + RUSH_LEN
    }
    l.rush = r >= w.rushFrom && r < w.rushTo && w.rushFrom >= 0
    if (type === 'grass') {
      const snakeP = r < SNAKE_ROW || l.rush || r % 40 === 0 ? 0 : Math.min(0.32, 0.16 + (r - SNAKE_ROW) * 0.001)
      if (Math.random() < snakeP) {
        // Snake lanes are open meadow so the frog can always step aside.
        l.snake = { x: rand(0, COLS), wait: 0, speed: Math.min(2.6, rand(1.3, 1.9) + (r - SNAKE_ROW) * 0.002), len: 1.7 }
      } else {
        for (let c = 0; c < COLS; c++) {
          if (r >= 0 && (c === prevPc || c === w.pc)) continue
          const p = r < 0 ? 1 : r < 4 ? (c === 0 || c === COLS - 1 ? 0.7 : 0) : 0.26
          if (Math.random() < p) l.obst[c] = Math.random() < 0.2 ? 2 : 1
        }
        // Lava vents never sit on the guaranteed path columns.
        const ventP = r < VENT_ROW || l.rush || r % 40 === 0 ? 0 : Math.min(0.45, 0.25 + (r - VENT_ROW) * 0.0015)
        if (Math.random() < ventP) {
          l.vent = new Array(COLS).fill(false)
          const n = r > 200 ? 3 : 2
          for (let i = 0; i < n; i++) {
            const c = Math.floor(Math.random() * COLS)
            if (c !== prevPc && c !== w.pc && !l.obst[c]) l.vent[c] = true
          }
        }
      }
      const coinP = (r % 40 === 0 && r > 0) ? 1 : l.rush ? 0.5 : r >= 3 ? 0.07 + run.level('luck') * 0.03 : 0
      for (let c = 0; c < COLS; c++) if (!l.obst[c] && !l.vent?.[c] && Math.random() < coinP) l.coins[c] = true
      if (r >= SHIELD_ROW && !l.rush && Math.random() < 0.035) {
        const c = Math.floor(Math.random() * COLS)
        if (!l.obst[c] && !l.vent?.[c]) {
          l.shield = c
          l.coins[c] = false
        }
      }
    } else if (type === 'road') {
      l.speed = Math.min(4.6, rand(1.2, 2.1) + r * 0.012) * (l.rush ? 0.75 : 1)
      l.gapMin = Math.max(1.6, 3 - r * 0.006) + (l.rush ? 0.8 : 0)
      l.gapMax = l.gapMin + 3
      if (l.rush) {
        for (let i = 0; i < 3; i++) l.coins[Math.floor(Math.random() * COLS)] = true
      } else if (Math.random() < 0.06 + run.level('luck') * 0.02) l.coins[Math.floor(Math.random() * COLS)] = true
    } else if (type === 'river') {
      if (r >= 45 && Math.random() < 0.3) {
        l.lily = new Array(COLS).fill(false)
        l.lily[prevPc] = true
        l.lily[w.pc] = true
        for (let i = 0; i < 2; i++) l.lily[Math.floor(Math.random() * COLS)] = true
      } else {
        l.dir = w.lastRiverDir === 1 ? -1 : 1
        w.lastRiverDir = l.dir
        l.speed = Math.min(2.6, rand(0.8, 1.4) + r * 0.005)
        l.gapMin = 1.1
        l.gapMax = r > 100 ? 3 : 2.4
      }
    } else {
      l.trainT = rand(2.5, 6)
    }
    for (let i = 0; i < 80; i++) stepLane(l, 0.15)
    if (type === 'rail') {
      l.trainX = null
      l.trainT = rand(2.5, 6)
    }
    return l
  }

  function ensureLanes() {
    const w = world.current
    const v = view()
    const top = Math.ceil(w.camRow + v.VH / C + 2)
    let last = w.lanes.length ? w.lanes[w.lanes.length - 1].r : Math.floor(w.camRow) - 4
    while (last < top) {
      last += 1
      w.lanes.push(genLane(last))
    }
    while (w.lanes.length && w.lanes[0].r < Math.floor(w.camRow) - 5) w.lanes.shift()
  }

  function buildWorld() {
    const w = world.current
    w.lanes = []
    w.pc = 4
    w.hazardRun = 0
    ensureLanes()
  }

  // ── Lifecycle ─────────────────────────────────────────

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.best = useProgressStore.getState().games.hopper?.bestScore ?? 0
    world.current = w
    buildWorld()
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    pushHud()
    run.update(w.stats)
    say('HOP!', 'tap to hop · swipe to turn')
    sfx.ready()
  }

  function die(kind: Death) {
    const w = world.current
    if (!live()) return
    w.dead = kind
    w.deadT = 0
    setPhaseBoth('dying')
    const p = w.p
    const at = scr(p.x, p.r)
    if (kind === 'burn') {
      fx.burst(at.x, at.y, { count: 26, color: ['#fde047', '#f97316', '#dc2626', '#44403c'], speed: 280, gravity: -120 })
      fx.flash('#f97316', 0.4)
      fx.shake(12, 0.4)
      fx.stop(0.1)
      sfx.boom(0.4)
    } else if (kind === 'bite') {
      fx.burst(at.x, at.y, { count: 20, color: ['#4ade80', '#dc2626', '#facc15'], speed: 260, gravity: 500 })
      fx.flash('#ef4444', 0.3)
      fx.shake(9, 0.35)
      fx.stop(0.1)
      sfx.hurt()
    } else if (kind === 'splat' || kind === 'train') {
      fx.burst(at.x, at.y, { count: 22, color: ['#4ade80', '#16a34a', '#ffffff'], speed: 300, gravity: 500 })
      fx.flash('#ef4444', 0.35)
      fx.shake(kind === 'train' ? 16 : 11, 0.4)
      fx.stop(0.12)
      sfx.hurt()
      if (kind === 'train') sfx.boom(0.6)
    } else if (kind === 'drown') {
      fx.burst(at.x, at.y, { count: 22, color: ['#e0f2fe', '#7dd3fc', '#ffffff'], speed: 220, gravity: 500, angle: -Math.PI / 2, spread: 2 })
      fx.ring(at.x, at.y, { color: '#e0f2fe', maxR: 40, life: 0.5 })
      fx.flash('#0ea5e9', 0.25)
      sfx.boom(0.25)
    } else {
      w.eagleX = p.x
      sfx.whoosh()
      fx.flash('#1c1917', 0.2)
    }
    fx.slowmo(0.7, 0.4)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.coins + w.stats.rows / 10) * (1 + run.level('luck') * 0.15))
      run.end({ score: w.maxRow - 1, cleared: w.maxRow - 1 >= 100, stats: { ...w.stats }, coins }, revive)
    }, kind === 'eagle' ? 1500 : 1150)
  }

  /** A lethal hit: pops the bubble shield if the frog has one, otherwise dies. */
  function hurt(kind: Death) {
    const w = world.current
    if (!w.shield) {
      die(kind)
      return
    }
    w.shield = false
    w.invuln = 1.4
    const p = w.p
    const at = scr(p.hop < 1 ? p.fx + (p.tx - p.fx) * p.hop : p.x, p.hop < 0.5 ? p.fr : p.tr)
    fx.ring(at.x, at.y, { color: '#a5f3fc', maxR: 80, life: 0.5, width: 5 })
    fx.burst(at.x, at.y, { count: 18, color: ['#a5f3fc', '#ffffff', '#67e8f9'], speed: 260, shape: 'spark' })
    fx.shake(7, 0.25)
    fx.stop(0.06)
    fx.text(at.x, at.y - 30, 'SHIELD POP!', '#a5f3fc', 18)
    sfx.clang()
    haptic.medium()
    pushHud()
  }

  /** Ad revive: a safe patch of grass under the frog, hazards nearby cleared, camera pulled back. */
  function revive() {
    const w = world.current
    const p = w.p
    p.x = clamp(Math.round(p.x), 0, COLS - 1)
    p.hop = 1
    p.log = null
    p.fx = p.tx = p.x
    p.fr = p.tr = p.r
    const l = lane(p.r)
    if (l && (l.type !== 'grass' || l.obst[p.x])) {
      l.type = 'grass'
      l.obst = l.obst.map(() => 0)
      l.lily = null
      l.cars = []
      l.logs = []
    }
    if (l) {
      l.vent = null
      l.snake = null
    }
    for (let r = p.r - 1; r <= p.r + 2; r++) {
      const n = lane(r)
      if (!n) continue
      n.cars = n.cars.filter((c) => Math.abs(c.x - p.x) > 4)
      n.vent = null
      if (n.snake) {
        n.snake.x = n.dir > 0 ? -0.6 : COLS - 0.4
        n.snake.wait = 3
      }
      if (n.type === 'rail') {
        n.trainX = null
        n.trainT = 4
      }
    }
    w.camRow = Math.min(w.camRow, p.r - 3)
    w.dead = ''
    w.invuln = 2
    const at = scr(p.x, p.r)
    fx.ring(at.x, at.y, { color: '#fde047', maxR: 70, life: 0.6, width: 5 })
    say('REVIVED!', 'safe ground')
    setPhaseBoth('play')
    pushHud()
  }

  // ── Movement ──────────────────────────────────────────

  function hop(dir: number) {
    const w = world.current
    const p = w.p
    if (!live()) return
    if (p.hop < 1) {
      p.queued = dir
      return
    }
    p.face = dir
    const tx = p.x + DX[dir]
    const tr = p.r + DR[dir]
    const rc = Math.round(tx)
    const target = lane(tr)
    const blocked = rc < 0 || rc > COLS - 1 || !target || (target.type === 'grass' && target.obst[rc] > 0) || tr < Math.floor(w.camRow) - 2
    if (blocked) {
      p.squash = 1
      sfx.tick()
      return
    }
    p.fx = p.x
    p.fr = p.r
    p.tx = target.type === 'river' && !target.lily ? tx : rc
    p.tr = tr
    p.hop = 0
    p.log = null
    p.squash = 0.6
    sfx.move()
    haptic.light()
  }

  function land() {
    const w = world.current
    const p = w.p
    p.x = p.tx
    p.r = p.tr
    p.squash = 1
    const l = lane(p.r)
    if (!l) return
    const at = scr(p.x, p.r)
    if (l.type === 'river') {
      if (l.lily) {
        const c = clamp(Math.round(p.x), 0, COLS - 1)
        if (!l.lily[c]) {
          die('drown')
          return
        }
        p.x = c
        fx.ring(at.x, at.y, { color: '#bbf7d0', maxR: 22, life: 0.3 })
      } else {
        const log = l.logs.find((g) => Math.abs(g.x - p.x) <= g.len / 2 + 0.05)
        if (!log) {
          die('drown')
          return
        }
        const rel = p.x - (log.x - log.len / 2)
        const cell = clamp(Math.floor(rel), 0, Math.ceil(log.len) - 1)
        p.log = log
        p.logOff = Math.min(cell + 0.5, log.len - 0.5) - log.len / 2
        fx.burst(at.x, at.y + 6, { count: 5, color: ['#e0f2fe', '#ffffff'], speed: 90, gravity: 300 })
      }
    } else {
      p.x = clamp(Math.round(p.x), 0, COLS - 1)
      fx.burst(at.x, at.y + 8, { count: 4, color: [shade(BIOMES[l.biome].grassA, 0.8), '#ffffff'], speed: 70, gravity: 300, size: 2 })
    }
    // Coins (with magnet radius)
    const mag = run.level('magnet')
    for (let r = p.r - mag; r <= p.r + mag; r++) {
      const n = lane(r)
      if (!n) continue
      for (let c = Math.max(0, Math.round(p.x) - mag); c <= Math.min(COLS - 1, Math.round(p.x) + mag); c++) {
        if (!n.coins[c]) continue
        n.coins[c] = false
        w.coins += 1
        w.stats.coins = w.coins
        const cp = scr(c, r)
        fx.burst(cp.x, cp.y - 10, { count: 10, color: ['#fde047', '#fef9c3', '#f59e0b'], speed: 180, shape: 'spark', gravity: 200 })
        fx.text(cp.x, cp.y - 24, '+1', '#fde047', 16)
        sfx.pop()
        haptic.light()
      }
    }
    if (l.shield >= 0 && Math.round(p.x) === l.shield && l.type === 'grass') {
      l.shield = -1
      const fresh = !w.shield
      w.shield = true
      fx.ring(at.x, at.y - 10, { color: '#67e8f9', maxR: 60, life: 0.5, width: 4 })
      fx.burst(at.x, at.y - 10, { count: 14, color: ['#a5f3fc', '#ffffff', '#22d3ee'], speed: 200, shape: 'spark' })
      fx.text(at.x, at.y - 30, fresh ? 'SHIELD!' : '+5', '#67e8f9', 18)
      if (!fresh) w.coins += 5
      sfx.power()
      haptic.medium()
      if (!w.seen.shield) {
        w.seen.shield = true
        say('BUBBLE SHIELD', 'blocks one hit')
      }
    }
    if (p.r > w.maxRow) {
      const prev = lane(p.r - 1)
      w.maxRow = p.r
      w.stats.rows = w.maxRow - 1
      if (prev?.type === 'road') w.stats.roads += 1
      else if (prev?.type === 'river') w.stats.rivers += 1
      else if (prev?.type === 'rail') w.stats.rails += 1
      const score = w.maxRow - 1
      // Gold Rush start / finish
      if (l.rush && w.rushStage === 0 && p.r >= w.rushFrom) {
        w.rushStage = 1
        w.rushCoins = w.coins
        say('GOLD RUSH!', 'golden lanes · grab every coin')
        sfx.levelUp()
        window.setTimeout(() => sfx.power(), 180)
        fx.flash('#fde047', 0.3)
        haptic.success()
      } else if (w.rushStage === 1 && p.r >= w.rushTo) {
        w.rushStage = 0
        const got = w.coins - w.rushCoins
        const bonus = 5 + Math.round(got * 0.5)
        w.coins += bonus
        w.stats.coins = w.coins
        say('RUSH CLEAR!', `${got} coins · +${bonus} bonus`)
        sfx.win()
        haptic.success()
        fx.burst(at.x, at.y - 10, { count: 30, color: ['#fde047', '#fef9c3', '#f59e0b'], speed: 320, shape: 'spark', gravity: 200 })
        void trackEvent('action_milestone', { game_id: 'hopper', kind: 'rush', value: score })
      }
      // First-sight hazard intros
      for (let r = p.r + 1; r <= p.r + 4; r++) {
        const n = lane(r)
        if (!n) continue
        if (n.snake && !w.seen.snake) {
          w.seen.snake = true
          say('SNAKES!', 'watch the grass — red arrow = incoming')
          sfx.whoosh()
        } else if (n.vent && !w.seen.vent) {
          w.seen.vent = true
          say('LAVA VENTS!', 'they rumble before they blow')
          sfx.boom(0.2)
        }
      }
      if (!l.rush && score > 0 && score % 40 === 0) {
        const b = BIOMES[Math.floor(score / 40) % BIOMES.length]
        say(b.name.toUpperCase(), `${score} rows · bonus coins ahead`)
        sfx.levelUp()
        haptic.success()
      } else if (!l.rush && score > 0 && score % 25 === 0) {
        say(`${score} ROWS!`)
        sfx.combo()
      }
      if (score > 0 && score % 50 === 0) void trackEvent('action_milestone', { game_id: 'hopper', kind: 'rows', value: score })
      if (!w.bestShown && w.best > 0 && score > w.best) {
        w.bestShown = true
        say('NEW BEST!', 'keep hopping')
        sfx.mission()
      }
    }
    run.update(w.stats)
    pushHud()
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!live()) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    ptr.current = { id: e.pointerId, x: p.x, y: p.y }
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const s = ptr.current
    if (!s || s.id !== e.pointerId) return
    ptr.current = null
    const p = localPoint(e, e.currentTarget)
    const dx = p.x - s.x
    const dy = p.y - s.y
    if (Math.hypot(dx, dy) < 22) hop(0)
    else if (Math.abs(dx) > Math.abs(dy)) hop(dx > 0 ? 1 : 3)
    else hop(dy < 0 ? 0 : 2)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (!live()) return
      const map: Record<string, number> = { ArrowUp: 0, w: 0, ' ': 0, ArrowRight: 1, d: 1, ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3 }
      const d = map[e.key]
      if (d == null) return
      e.preventDefault()
      hop(d)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // Dev-only skip hook for screenshots: __en2hopper.skip(rows), .shield()
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const hook = {
      skip(rows: number) {
        const w = world.current
        const R = Math.max(2, w.maxRow + rows)
        const k = R - RUSH_START
        w.rushFrom = k >= 0 && k % RUSH_EVERY < RUSH_LEN ? R - (k % RUSH_EVERY) : -1
        w.rushTo = w.rushFrom >= 0 ? w.rushFrom + RUSH_LEN : -1
        w.lanes = []
        w.camRow = R - 4
        w.pc = 4
        w.hazardRun = 0
        const p = w.p
        p.r = p.fr = p.tr = R
        p.x = p.fx = p.tx = 4
        p.hop = 1
        p.log = null
        w.maxRow = R
        w.stats.rows = R - 1
        w.invuln = 1
        ensureLanes()
        const l = lane(R)
        if (l) {
          l.type = 'grass'
          l.obst = l.obst.map(() => 0)
          l.vent = null
          l.snake = null
          l.lily = null
          l.cars = []
          l.logs = []
        }
        pushHud()
      },
      shield() {
        world.current.shield = true
        pushHud()
      },
      /** put erupting-soon vents on the frog's row (away from the frog) */
      vents() {
        const w = world.current
        const l = lane(w.p.r)
        if (!l) return
        l.vent = l.obst.map((o, c) => !o && Math.abs(c - w.p.x) >= 2 && c % 2 === 0)
        l.ventPh = VENT_WARN - 0.2 - (w.time % VENT_P)
      },
    }
    ;(window as unknown as { __en2hopper?: typeof hook }).__en2hopper = hook
    return () => {
      delete (window as unknown as { __en2hopper?: typeof hook }).__en2hopper
    }
  }, [])

  // ── Simulation ────────────────────────────────────────

  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    const p = w.p
    w.time += dt
    if (!w.lanes.length) buildWorld()
    for (const l of w.lanes) stepLane(l, dt)
    p.squash = Math.max(0, p.squash - raw * 6)
    p.blink -= raw
    if (p.blink < -0.12) p.blink = rand(1.5, 4)

    if (ph === 'idle') {
      // Attract mode: hop around the starting meadow.
      w.idleHop -= raw
      if (p.hop < 1) {
        p.hop = Math.min(1, p.hop + raw / HOP_TIME)
        p.x = p.fx + (p.tx - p.fx) * p.hop
        if (p.hop >= 1) p.squash = 1
      } else if (w.idleHop <= 0) {
        w.idleHop = rand(0.8, 1.6)
        const dir = Math.random() < 0.5 ? 1 : 3
        const tx = p.x + DX[dir]
        if (tx >= 2 && tx <= 6) {
          p.face = dir
          p.fx = p.x
          p.tx = tx
          p.fr = p.tr = p.r
          p.hop = 0
        }
      }
      return
    }
    if (ph === 'dying' || ph === 'over') {
      w.deadT += raw
      if (p.log) p.x = p.log.x + p.logOff
      return
    }

    w.invuln = Math.max(0, w.invuln - dt)
    // Hop progress
    if (p.hop < 1) {
      p.hop = Math.min(1, p.hop + dt / HOP_TIME)
      if (p.hop >= 1) {
        land()
        if (!live()) return
        if (p.queued >= 0) {
          const q = p.queued
          p.queued = -1
          hop(q)
        }
      }
    }
    if (p.log && p.hop >= 1) {
      p.x = p.log.x + p.logOff
      if (p.x < -0.45 || p.x > COLS - 0.55) {
        die('drown')
        return
      }
    }
    // Hazards
    const curR = p.hop < 0.5 ? p.fr : p.tr
    const curX = p.hop < 1 ? p.fx + (p.tx - p.fx) * p.hop : p.x
    const l = lane(curR)
    if (l && w.invuln <= 0) {
      if (l.type === 'road') {
        for (const c of l.cars) {
          if (Math.abs(c.x - curX) < c.len / 2 + 0.28) {
            hurt('splat')
            return
          }
        }
      } else if (l.type === 'rail' && l.trainX != null && Math.abs(l.trainX - curX) < TRAIN_LEN / 2 + 0.3) {
        hurt('train')
        return
      } else if (l.type === 'grass') {
        const sn = l.snake
        if (sn && sn.wait <= 0 && Math.abs(sn.x - l.dir * sn.len * 0.45 - curX) < sn.len / 2 + 0.22) {
          hurt('bite')
          return
        }
        if (l.vent && ventPhase(l, w.time) >= VENT_ERUPT + 0.08 && p.hop > 0.35) {
          const c = Math.round(curX)
          if (l.vent[c] && Math.abs(c - curX) < 0.4) {
            hurt('burn')
            return
          }
        }
      }
    }
    // Hiss / rumble cues for hazards right next to the frog
    for (let r = p.r; r <= p.r + 1; r++) {
      const n = lane(r)
      if (!n?.vent) continue
      const ph = ventPhase(n, w.time)
      if (ph >= VENT_WARN && ph < VENT_ERUPT) {
        n.warnTick -= raw
        if (n.warnTick <= 0) {
          n.warnTick = 0.35
          sfx.tick()
        }
      } else if (ph >= VENT_ERUPT && ph - raw < VENT_ERUPT) {
        sfx.whoosh()
        fx.shake(3, 0.15)
      }
    }
    // Rail warning bells for nearby tracks
    for (let r = p.r - 1; r <= p.r + 3; r++) {
      const n = lane(r)
      if (n?.type !== 'rail' || n.trainX != null || n.trainT > 1.4) continue
      n.warnTick -= raw
      if (n.warnTick <= 0) {
        n.warnTick = 0.28
        sfx.tick()
      }
    }

    // Camera: creeps forward, catches up when the frog runs ahead.
    const t = w.time
    const auto = t < 3 ? 0 : Math.min(0.75, 0.24 + w.maxRow * 0.0035) * (1 - run.level('slow') * 0.1)
    w.camRow += auto * dt
    const ahead = p.r - 4.2
    if (ahead > w.camRow) w.camRow = approach(w.camRow, ahead, 3.2, dt)
    if (p.r < w.camRow - 1.1 && w.invuln <= 0) {
      die('eagle')
      return
    }
    ensureLanes()
  }

  // ── Drawing ───────────────────────────────────────────

  function drawGround(ctx: CanvasRenderingContext2D, l: Lane, y: number, t: number) {
    const b = BIOMES[l.biome]
    const top = y - C / 2
    if (l.type === 'grass') {
      for (let c = 0; c < COLS; c++) {
        ctx.fillStyle = (c + l.r) % 2 ? b.grassA : b.grassB
        ctx.fillRect(c * C, top, C + 0.5, C + 0.5)
      }
      ctx.fillStyle = 'rgba(0,0,0,0.06)'
      ctx.fillRect(0, top + C - 3, COLS * C, 3)
    } else if (l.type === 'road') {
      ctx.fillStyle = b.road
      ctx.fillRect(0, top, COLS * C, C + 0.5)
      const below = lane(l.r - 1)
      if (below?.type === 'road') {
        ctx.fillStyle = b.roadLine
        ctx.globalAlpha = 0.7
        for (let x = 6; x < COLS * C; x += 36) ctx.fillRect(x, top + C - 2, 18, 3)
        ctx.globalAlpha = 1
      } else {
        ctx.fillStyle = shade(b.road, 1.4)
        ctx.fillRect(0, top + C - 4, COLS * C, 4)
      }
      const above = lane(l.r + 1)
      if (above?.type !== 'road') {
        ctx.fillStyle = shade(b.road, 1.4)
        ctx.fillRect(0, top, COLS * C, 3)
      }
    } else if (l.type === 'river') {
      const g = ctx.createLinearGradient(0, top, 0, top + C)
      g.addColorStop(0, b.waterDeep)
      g.addColorStop(1, b.water)
      ctx.fillStyle = g
      ctx.fillRect(0, top, COLS * C, C + 0.5)
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'
      ctx.lineWidth = 2
      ctx.beginPath()
      const flow = (l.lily ? t * 0.3 : t * l.speed * l.dir) * C
      for (let i = 0; i < 6; i++) {
        const x = (((i * 71 + flow) % (COLS * C + 40)) + COLS * C + 40) % (COLS * C + 40) - 20
        const yy = top + 8 + ((i * 13) % (C - 16))
        ctx.moveTo(x, yy)
        ctx.quadraticCurveTo(x + 6, yy - 3, x + 12, yy)
      }
      ctx.stroke()
      if (l.lily) for (let c = 0; c < COLS; c++) if (l.lily[c]) drawLily(ctx, colX(c), y, C, t)
    } else {
      ctx.fillStyle = b.gravel
      ctx.fillRect(0, top, COLS * C, C + 0.5)
      ctx.fillStyle = '#78350f'
      for (let x = 2; x < COLS * C; x += 14) ctx.fillRect(x, top + 6, 7, C - 12)
      ctx.fillStyle = '#94a3b8'
      ctx.fillRect(0, top + 11, COLS * C, 3)
      ctx.fillRect(0, top + C - 14, COLS * C, 3)
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(0, top + 11, COLS * C, 1)
      ctx.fillRect(0, top + C - 14, COLS * C, 1)
    }
    if (l.rush) drawRushTint(ctx, top, COLS * C, C, t, l.r)
  }

  function drawObjects(ctx: CanvasRenderingContext2D, l: Lane, y: number, t: number) {
    const b = BIOMES[l.biome]
    if (l.type === 'grass') {
      const vph = l.vent ? ventPhase(l, world.current.time) : 0
      const warn = vph >= VENT_WARN && vph < VENT_ERUPT ? (vph - VENT_WARN) / (VENT_ERUPT - VENT_WARN) : 0
      const erupt = vph >= VENT_ERUPT ? (vph - VENT_ERUPT) / (VENT_P - VENT_ERUPT) : -1
      for (let c = 0; c < COLS; c++) {
        if (l.vent?.[c]) drawVent(ctx, colX(c), y, C, t, warn, erupt)
        if (l.obst[c]) drawObstacle(ctx, b, l.obst[c], colX(c), y, C, t)
        else if (l.shield === c) drawShieldPickup(ctx, colX(c), y, C, t)
        else if (l.coins[c]) drawCoin(ctx, colX(c), y, C, t)
      }
      const sn = l.snake
      if (sn) {
        if (sn.wait > 0) {
          if (sn.wait < 1) drawEdgeWarn(ctx, l.dir > 0 ? C * 0.2 : COLS * C - C * 0.2, y, l.dir, C, t)
        } else drawSnake(ctx, colX(sn.x), y, l.dir, sn.len, C, t)
      }
    } else if (l.type === 'road') {
      for (let c = 0; c < COLS; c++) if (l.coins[c]) drawCoin(ctx, colX(c), y, C, t)
      for (const car of l.cars) drawCar(ctx, colX(car.x), y, car.len, l.dir, car.color, car.kind, C, t)
    } else if (l.type === 'river' && !l.lily) {
      for (const g of l.logs) drawLog(ctx, colX(g.x), y, g.len, C)
    } else if (l.type === 'rail') {
      const warn = l.trainX == null && l.trainT < 1.4
      // Signal post on the left edge
      const sx = 8
      ctx.fillStyle = '#334155'
      ctx.fillRect(sx - 2, y - C * 0.9, 4, C * 0.9)
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.roundRect(sx - 7, y - C * 1.15, 14, 12, 3)
      ctx.fill()
      const on = (warn || l.trainX != null) && Math.floor(t * 8) % 2 === 0
      ctx.fillStyle = on ? '#ef4444' : '#7f1d1d'
      ctx.beginPath()
      ctx.arc(sx, y - C * 1.15 + 6, 4, 0, Math.PI * 2)
      ctx.fill()
      if (on) {
        ctx.fillStyle = 'rgba(239,68,68,0.25)'
        ctx.fillRect(0, y - C / 2, COLS * C, C)
      }
      if (l.trainX != null) drawTrain(ctx, colX(l.trainX), y, TRAIN_LEN, l.dir, C)
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    update(dt, raw)
    const v = view()
    const p = w.p
    const curB = BIOMES[Math.floor(Math.max(0, w.maxRow) / 40) % BIOMES.length]

    ctx.fillStyle = curB.grassB
    ctx.fillRect(0, 0, W, H)

    fx.applyShake(ctx)
    ctx.save()
    ctx.scale(v.S, v.S)

    const bottom = Math.floor(w.camRow) - 3
    const top = Math.ceil(w.camRow + v.VH / C + 1)
    for (let r = top; r >= bottom; r--) {
      const l = lane(r)
      if (l) drawGround(ctx, l, rowY(r), t)
    }
    // Player visual position
    const hopK = p.hop
    const vx = p.hop < 1 ? p.fx + (p.tx - p.fx) * hopK : p.x
    const vr = p.hop < 1 ? p.fr + (p.tr - p.fr) * hopK : p.r
    const z = p.hop < 1 ? Math.sin(hopK * Math.PI) * C * 0.45 : 0
    const playerRow = Math.round(vr)
    for (let r = top; r >= bottom; r--) {
      const l = lane(r)
      if (l) drawObjects(ctx, l, rowY(r), t)
      if (r === playerRow && w.dead !== 'eagle') {
        const px = colX(vx)
        const py = rowY(vr)
        let flat = 0
        if (w.dead === 'splat' || w.dead === 'train') flat = Math.min(0.9, w.deadT * 8)
        if (w.dead === 'drown') {
          ctx.globalAlpha = Math.max(0, 1 - w.deadT * 2)
        }
        if (w.invuln > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.45
        drawFrog(ctx, px, py + (w.dead === 'drown' ? w.deadT * 20 : 0), C, { z, squash: p.squash, face: p.face, blink: p.blink < 0, flat })
        ctx.globalAlpha = 1
        if (w.shield && !w.dead) drawShieldAura(ctx, px + C * 0.05, py - z - C * 0.15, C, t)
      }
    }
    // Eagle swoop
    if (w.dead === 'eagle') {
      const k = Math.min(1, w.deadT / 0.5)
      const px = colX(w.eagleX)
      const py = rowY(p.r)
      const ey = k < 1 ? -C * 2 + (py + C * 2) * k : py - (w.deadT - 0.5) * C * 10
      if (k >= 1) drawFrog(ctx, px, ey + C * 0.5, C, { z: 0, squash: 0, face: 2, blink: true, flat: 0 })
      drawEagle(ctx, px, ey, C, t, 1.3)
    } else if (live()) {
      // Eagle shadow warning when the frog lags behind the camera.
      const lag = w.camRow - p.r
      if (lag > -0.4) {
        const a = Math.min(1, (lag + 0.4) / 0.9)
        ctx.globalAlpha = a * 0.35
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.ellipse(colX(p.x), v.VH - 10, C * 1.2 * a, C * 0.3, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
    // Far-distance haze for depth
    const haze = ctx.createLinearGradient(0, 0, 0, C * 3)
    haze.addColorStop(0, curB.sky)
    haze.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.globalAlpha = 0.7
    ctx.fillStyle = haze
    ctx.fillRect(0, 0, v.VW, C * 3)
    ctx.globalAlpha = 1
    ctx.restore()
    drawAmbient(ctx, curB.ambient, W, H, t)

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  {BIOMES[hud.biome].name}
                  {hud.shield ? <span style={{ color: '#67e8f9', marginLeft: 6 }}>· shield</span> : null}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__score" style={{ fontSize: '1.3rem', color: '#fde047' }}>
                  {hud.coins}
                </span>
                <span className="action-hud__small">coins</span>
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
              game="hopper"
              icon={meta.icon}
              title={meta.title}
              hint="Tap to hop forward, swipe to turn. Dodge traffic, ride logs, and never dawdle — the eagle is watching."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.score >= 100 ? 'Road legend!' : 'Squashed!'}
            subtitle={`${hud.score} rows · ${hud.coins} coins`}
            celebrate={hud.score >= 100}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
