import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { carSprite, clearCarCache, drawAnger, drawCone, drawGrandma } from './art'
import { DX, DY, cellsOf, drive, generate, occupancy, specFor, type Car, type Dir, type LevelSpec } from './engine'
import '../../shared/action/action.css'
import { LEVELS, authoredLevel } from './levels'
import './parkingjam.css'

const meta = getGame('parkingjam')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type VCar = {
  id: number
  px: number
  py: number
  ang: number
  state: 'park' | 'exit' | 'lift'
  path: number[]
  speed: number
  bump: number
  bumpDir: Dir
  shake: number
  angry: number
  puff: number
  lift: number
  skid: number
}
type Granny = { u: number; mode: 'waitOut' | 'in' | 'waitIn' | 'out'; t: number; step: number; alarm: number }
type Coin = { x: number; y: number; t: number; d: number }
type Undo = { id: number; x: number; y: number; anger: number }

type World = {
  level: number
  spec: LevelSpec
  cars: Car[]
  vis: VCar[]
  cones: number[]
  side: Dir
  cross: number
  granny: Granny
  anger: number
  cap: number
  time: number
  freeze: number
  bumps: number
  crane: number
  undo: number
  freezes: number
  craneMode: boolean
  undoStack: Undo[]
  score: number
  coins: number
  combo: number
  comboT: number
  failT: number
  failText: string
  clearT: number
  idleT: number
  flying: Coin[]
  skids: { x: number; y: number; a: number; life: number }[]
  stats: { score: number; level: number; cars: number; perfect: number; hard: number }
}

const BASE_ANGER = 3

function freshWorld(): World {
  return {
    level: 0,
    spec: specFor(2),
    cars: [],
    vis: [],
    cones: [],
    side: 0,
    cross: 0,
    granny: { u: 0, mode: 'waitOut', t: 2, step: 0, alarm: 0 },
    anger: 0,
    cap: BASE_ANGER,
    time: 60,
    freeze: 0,
    bumps: 0,
    crane: 1,
    undo: 2,
    freezes: 1,
    craneMode: false,
    undoStack: [],
    score: 0,
    coins: 0,
    combo: 0,
    comboT: 0,
    failT: 0,
    failText: '',
    clearT: 0,
    idleT: 1,
    flying: [],
    skids: [],
    stats: { score: 0, level: 1, cars: 0, perfect: 0, hard: 0 },
  }
}

const CraneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 21V5h14M4 5l5 5M18 5v5" />
    <path d="M15 10h6v3a3 3 0 0 1-6 0z" fill="currentColor" fillOpacity="0.3" />
    <path d="M2 21h8" />
  </svg>
)
const UndoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </svg>
)
const FreezeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M3.5 7l17 10M3.5 17l17-10M9 4l3 3 3-3M9 20l3-3 3 3" />
  </svg>
)

export default function ParkingJamGame() {
  const run = useActionRun('parkingjam')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 620 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const lastEvent = useRef(0)
  const press = useRef<{ id: number; x: number; y: number; car: number } | null>(null)
  const secRef = useRef(-1)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hard: false, coins: 0, time: 60, frozen: false, crane: 0, undo: 0, freezes: 0, craneMode: false, left: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string; stars?: number; hard?: boolean } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({
      score: w.score,
      level: w.level,
      hard: w.spec.hard,
      coins: w.coins,
      time: Math.ceil(w.time),
      frozen: w.freeze > 0,
      crane: w.crane,
      undo: w.undo,
      freezes: w.freezes,
      craneMode: w.craneMode,
      left: w.cars.filter((c) => !c.gone).length,
    })
  }

  const playing = () => phaseRef.current === 'play'

  // ── Geometry ────────────────────────────────────
  function geo() {
    const { w: W, h: H } = size.current
    const { cols, rows } = world.current.spec
    const R = 34
    const top = 74
    const bottom = H - 84
    const cell = Math.min(52, (W - 2 * R - 12) / cols, (bottom - top - 2 * R) / rows)
    const lw = cell * cols
    const lh = cell * rows
    const lx = (W - lw) / 2
    const ly = top + R + Math.max(0, (bottom - top - 2 * R - lh) / 2)
    return { W, H, R, cell, lw, lh, lx, ly, rl: lx - R / 2, rr: lx + lw + R / 2, rt: ly - R / 2, rb: ly + lh + R / 2 }
  }

  function carCenter(c: { x: number; y: number; len: number; dir: Dir }) {
    const { cell, lx, ly } = geo()
    const fx0 = c.x + DX[c.dir] * (c.len - 1)
    const fy0 = c.y + DY[c.dir] * (c.len - 1)
    return { x: lx + ((c.x + fx0) / 2 + 0.5) * cell, y: ly + ((c.y + fy0) / 2 + 0.5) * cell }
  }

  // ── Grandma ─────────────────────────────────────
  function grannyXY() {
    const w = world.current
    const g = geo()
    const a = w.cross + 1 // crosswalk centre between edge cells cross & cross+1
    const u = w.granny.u
    switch (w.side) {
      case 0:
        return { x: g.lx + g.lw + 4 + u * (g.R - 8), y: g.ly + a * g.cell }
      case 2:
        return { x: g.lx - 4 - u * (g.R - 8), y: g.ly + a * g.cell }
      case 1:
        return { x: g.lx + a * g.cell, y: g.ly + g.lh + 6 + u * (g.R - 8) }
      default:
        return { x: g.lx + a * g.cell, y: g.ly - 4 - u * (g.R - 10) }
    }
  }

  const grannyOnRoad = () => {
    const w = world.current
    return w.spec.grandma && (w.granny.mode === 'in' || w.granny.mode === 'out')
  }

  /** Would a car leaving through this side lane hit grandma? */
  function grannyBlocks(c: Car, d: Dir) {
    const w = world.current
    if (!grannyOnRoad() || d !== w.side) return false
    const lane = d === 0 || d === 2 ? c.y : c.x
    return lane === w.cross || lane === w.cross + 1
  }

  // ── Level setup ────────────────────────────────
  function makeVis(c: Car): VCar {
    const p = carCenter(c)
    return { id: c.id, px: p.x, py: p.y, ang: (c.dir * Math.PI) / 2, state: 'park', path: [], speed: 0, bump: 0, bumpDir: c.dir, shake: 0, angry: 0, puff: 0, lift: 0, skid: 0 }
  }

  function loadLevel(n: number) {
    const w = world.current
    const lv = authoredLevel(n) ?? generate(specFor(n), Math.floor(Math.random() * 1e9))
    const spec = lv.spec
    w.level = n
    w.spec = spec
    w.cars = lv.cars
    w.cones = lv.cones
    w.side = lv.side
    w.cross = lv.cross
    w.vis = lv.cars.map(makeVis)
    w.granny = { u: 0, mode: 'waitOut', t: 1.5, step: 0, alarm: 0 }
    w.anger = 0
    w.bumps = 0
    w.time = spec.time
    w.freeze = 0
    w.craneMode = false
    w.undoStack = []
    w.failT = 0
  }

  // ── Actions ─────────────────────────────────────
  function exitRoute(d: Dir, v: VCar) {
    const g = geo()
    const pts: number[] = []
    let ex = v.px
    let ey = v.py
    if (d === 0) ex = g.rr
    else if (d === 2) ex = g.rl
    else if (d === 1) ey = g.rb
    else ey = g.rt
    pts.push(ex, ey)
    if (d === 0) pts.push(g.rr, g.rt, g.rl, g.rt)
    else if (d === 1) pts.push(g.rl, g.rb, g.rl, g.rt)
    else if (d === 2) pts.push(g.rl, g.rt)
    else pts.push(g.rl, g.rt)
    pts.push(-80, g.rt)
    return pts
  }

  function thaw() {
    const w = world.current
    for (const c of w.cars) {
      if (c.gone || c.ice <= 0) continue
      c.ice -= 1
      if (c.ice === 0) {
        const v = w.vis[c.id]
        fx.burst(v.px, v.py, { count: 18, color: ['#e0f2fe', '#7dd3fc', '#ffffff'], speed: 220, shape: 'square', size: 4, gravity: 300 })
        if (playing()) sfx.clang()
      }
    }
  }

  function leave(c: Car, d: Dir, lifted: boolean) {
    const w = world.current
    const v = w.vis[c.id]
    c.gone = true
    if (lifted) {
      v.state = 'lift'
      v.lift = 0
    } else {
      v.state = 'exit'
      v.path = exitRoute(d, v)
      v.speed = 260
      v.ang = (d * Math.PI) / 2
    }
    thaw()
    if (!playing()) return
    w.combo = w.comboT > 0 ? w.combo + 1 : 1
    w.comboT = 1.6
    const gain = 10 * Math.min(5, w.combo)
    w.score += gain
    w.stats.cars += 1
    w.stats.score = w.score
    fx.text(v.px, v.py - 18, w.combo > 1 ? `+${gain} x${w.combo}` : `+${gain}`, w.combo > 1 ? '#fde047' : '#ffffff', 16 + Math.min(6, w.combo))
    sfx.whoosh()
    sfx.score(Math.min(8, w.combo))
    haptic.light()
    run.update(w.stats)
    pushHud()
  }

  function tryDrive(id: number, d: Dir) {
    const w = world.current
    const c = w.cars[id]
    const v = w.vis[id]
    if (!c || c.gone || v.state !== 'park') return
    if (c.ice > 0) {
      v.shake = 0.35
      fx.text(v.px, v.py - 20, `iced ${c.ice}`, '#bae6fd', 14)
      if (playing()) {
        sfx.clang()
        haptic.light()
      }
      return
    }
    const g = geo()
    const occ = occupancy(w.spec.cols, w.spec.rows, w.cars, w.cones)
    const r = drive(w.spec.cols, w.spec.rows, occ, c, d)
    if (r.exits && !grannyBlocks(c, d)) {
      // slide to the edge first so the drive-off looks continuous
      c.x += DX[d] * r.steps
      c.y += DY[d] * r.steps
      leave(c, d, false)
      return
    }
    // bump: roll up to the obstacle (or the crosswalk) and stop there
    if (playing()) w.undoStack.push({ id, x: c.x, y: c.y, anger: w.anger })
    c.x += DX[d] * r.steps
    c.y += DY[d] * r.steps
    v.bump = 1
    v.bumpDir = d
    v.angry = 2.2
    v.skid = r.steps > 0 ? 1 : 0
    const p = carCenter(c)
    const hx = p.x + DX[d] * ((c.len * g.cell) / 2)
    const hy = p.y + DY[d] * ((c.len * g.cell) / 2)
    if (r.blocker >= 0) {
      const bv = w.vis[r.blocker]
      if (bv) {
        bv.shake = 0.4
        bv.angry = 1.6
      }
    }
    if (!playing()) return
    w.anger += 1
    w.bumps += 1
    const granny = r.exits
    fx.burst(hx, hy, { count: 12, color: ['#fde047', '#ffffff', '#fb923c'], speed: 200, shape: 'spark', gravity: 0 })
    fx.ring(hx, hy, { color: '#fde047', maxR: 26, life: 0.25 })
    fx.text(p.x, p.y - 26, granny ? 'Grandma!' : 'HONK!', granny ? '#fde047' : '#fecaca', 16)
    if (granny) w.granny.alarm = 1.5
    fx.shake(5, 0.2)
    fx.stop(0.05)
    sfx.miss()
    sfx.thud()
    haptic.medium()
    if (w.anger >= w.cap) fail('TRAFFIC JAM!')
    pushHud()
  }

  function fail(text: string) {
    const w = world.current
    if (!playing()) return
    w.failT = 1
    w.failText = text
    setPhaseBoth('dying')
    setBanner({ key: Date.now(), text, hard: true })
    for (const v of w.vis) v.angry = 3
    fx.flash('#ef4444', 0.3)
    fx.shake(10, 0.4)
    fx.slowmo(0.8, 0.4)
    sfx.lose()
    haptic.error()
  }

  function die() {
    const w = world.current
    setPhaseBoth('over')
    const coins = Math.round((w.coins + w.level) * (1 + run.level('bounty') * 0.15))
    run.end({ score: w.score, cleared: w.level >= 5, stats: { ...w.stats }, coins }, revive)
    pushHud()
  }

  /** Revive: drivers calm down and the clock gets extra time. */
  function revive() {
    const w = world.current
    w.anger = 0
    w.time = Math.max(w.time, 0) + 25
    w.failT = 0
    for (const v of w.vis) v.angry = 0
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'drivers calm · +25 s' })
    const g = geo()
    fx.ring(g.W / 2, g.ly + g.lh / 2, { color: '#86efac', maxR: 160, life: 0.6 })
    pushHud()
  }

  function toggleCrane() {
    const w = world.current
    if (!playing()) return
    if (w.craneMode) w.craneMode = false
    else if (w.crane > 0) w.craneMode = true
    sfx.tap()
    pushHud()
  }

  function useUndo() {
    const w = world.current
    if (!playing() || w.undo <= 0) return
    const u = w.undoStack.pop()
    if (!u) {
      fx.text(geo().W / 2, geo().ly - 30, 'Nothing to undo', '#e2e8f0', 14)
      return
    }
    const c = w.cars[u.id]
    if (c.gone) return
    // only if the old spot is still free
    const occ = occupancy(w.spec.cols, w.spec.rows, w.cars, w.cones, c.id)
    const free = cellsOf({ ...c, x: u.x, y: u.y }).every(([x, y]) => occ[y * w.spec.cols + x] === -1)
    if (!free) {
      fx.text(geo().W / 2, geo().ly - 30, 'Spot taken', '#fecaca', 14)
      return
    }
    w.undo -= 1
    c.x = u.x
    c.y = u.y
    w.anger = Math.min(w.anger, u.anger)
    w.bumps = Math.max(0, w.bumps - 1)
    const v = w.vis[c.id]
    v.angry = 0
    fx.ring(v.px, v.py, { color: '#a5f3fc', maxR: 34, life: 0.35 })
    sfx.flip()
    haptic.light()
    pushHud()
  }

  function useFreeze() {
    const w = world.current
    if (!playing() || w.freezes <= 0) return
    w.freezes -= 1
    w.freeze = 10
    fx.flash('#bae6fd', 0.25)
    sfx.power()
    haptic.medium()
    setBanner({ key: Date.now(), text: 'TIME FROZEN', sub: '10 seconds' })
    pushHud()
  }

  // ── Lifecycle ──────────────────────────────────
  function start(level?: number) {
    void unlockAudio()
    const first = typeof level === 'number' && level >= 1 ? Math.floor(level) : run.nextLevel
    const w = freshWorld()
    w.crane = 1 + run.level('crane')
    w.cap = BASE_ANGER + run.level('calm')
    world.current = w
    fx.reset()
    clearCarCache()
    setPhaseBoth('play')
    run.begin()
    beginLevel(first)
  }

  function beginLevel(n: number) {
    const w = world.current
    loadLevel(n)
    w.stats.level = n
    const spec = w.spec
    setBanner({ key: Date.now(), text: spec.hard ? 'HARD LEVEL' : `LEVEL ${n}`, sub: [LEVELS[n - 1]?.name, spec.intro ?? (spec.hard ? 'packed lot' : `${w.cars.length} cars`)].filter(Boolean).join(' · '), hard: spec.hard })
    if (spec.hard) sfx.boom(0.3)
    else sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function levelClear() {
    const w = world.current
    // Stars: no bumps = 3, one bump = 2, otherwise 1.
    const stars = w.bumps === 0 ? 3 : w.bumps <= 1 ? 2 : 1
    run.completeLevel(w.level, stars)
    const timeBonus = Math.round(w.time) * 2
    const bonus = 100 + stars * 50 + timeBonus + (w.spec.hard ? 200 : 0)
    w.score += bonus
    w.coins += 2 + stars + (w.spec.hard ? 5 : 0)
    if (w.bumps === 0) w.stats.perfect += 1
    if (w.spec.hard) w.stats.hard += 1
    w.stats.score = w.score
    let gift = ''
    if (w.spec.hard) {
      w.crane += 1
      gift = ' · +1 tow'
    } else if (w.level % 3 === 0) {
      if (Math.random() < 0.5) {
        w.undo += 1
        gift = ' · +1 undo'
      } else {
        w.freezes += 1
        gift = ' · +1 freeze'
      }
    }
    setPhaseBoth('clear')
    w.clearT = 1.9
    const g = geo()
    for (let k = 0; k < 4; k++) fx.burst(g.W * (0.2 + k * 0.2), g.H * 0.4, { count: 18, color: ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#ffffff'], speed: 360, shape: 'square', size: 5, gravity: 420, life: 1.1 })
    for (let k = 0; k < 2 + stars * 2; k++) w.flying.push({ x: g.W / 2 + rand(-40, 40), y: g.H * 0.45 + rand(-20, 20), t: 0, d: 0.5 + k * 0.08 })
    fx.flash('#fef9c3', 0.2)
    sfx.win()
    haptic.success()
    setBanner({ key: Date.now(), text: w.spec.hard ? 'HARD LEVEL BEATEN!' : `LEVEL ${w.level} CLEAR!`, sub: `+${bonus}${gift}`, stars })
    if ((w.level % 5 === 0 || w.spec.hard) && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'parkingjam', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  // ── Input ──────────────────────────────────────
  function carAt(x: number, y: number) {
    const w = world.current
    const g = geo()
    const cx = Math.floor((x - g.lx) / g.cell)
    const cy = Math.floor((y - g.ly) / g.cell)
    if (cx < 0 || cy < 0 || cx >= w.spec.cols || cy >= w.spec.rows) return -1
    const occ = occupancy(w.spec.cols, w.spec.rows, w.cars, w.cones)
    const o = occ[cy * w.spec.cols + cx]
    return o >= 0 ? o : -1
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (!playing()) return
    const p = localPoint(e, e.currentTarget)
    const id = carAt(p.x, p.y)
    if (id < 0) return
    const w = world.current
    if (w.craneMode) {
      const c = w.cars[id]
      w.crane -= 1
      w.craneMode = false
      const v = w.vis[id]
      fx.text(v.px, v.py - 24, 'TOWED!', '#fde047', 18)
      fx.ring(v.px, v.py, { color: '#fde047', maxR: 40, life: 0.4 })
      sfx.power()
      leave(c, c.dir, true)
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    press.current = { id: e.pointerId, x: p.x, y: p.y, car: id }
    world.current.vis[id].bump = Math.max(world.current.vis[id].bump, 0.25)
  }

  function onUp(e: PointerEvent<HTMLDivElement>) {
    const pr = press.current
    if (!pr || pr.id !== e.pointerId) return
    press.current = null
    if (!playing()) return
    const p = localPoint(e, e.currentTarget)
    const c = world.current.cars[pr.car]
    if (!c) return
    const dx = p.x - pr.x
    const dy = p.y - pr.y
    let d: Dir = c.dir
    if (Math.hypot(dx, dy) > 18) {
      const horiz = c.dir === 0 || c.dir === 2
      if (horiz && Math.abs(dx) >= Math.abs(dy) * 0.6) d = dx > 0 ? 0 : 2
      else if (!horiz && Math.abs(dy) >= Math.abs(dx) * 0.6) d = dy > 0 ? 1 : 3
    }
    tryDrive(pr.car, d)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 't') toggleCrane()
      else if (e.key === 'u') useUndo()
      else if (e.key === 'f') useFreeze()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Tick ───────────────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    const g = geo()
    if (ph === 'idle') {
      if (!w.cars.length) loadLevel(3)
      w.idleT -= raw
      if (w.idleT <= 0) {
        w.idleT = 0.9
        const occ = occupancy(w.spec.cols, w.spec.rows, w.cars, w.cones)
        const ok = w.cars.filter((c) => !c.gone && c.ice === 0 && drive(w.spec.cols, w.spec.rows, occ, c, c.dir).exits)
        const pick = ok[Math.floor(Math.random() * ok.length)]
        if (pick) tryDrive(pick.id, pick.dir)
        else if (w.vis.every((v) => v.state === 'park' || v.path.length === 0)) loadLevel(3)
      }
    }
    // grandma
    if (w.spec.grandma) {
      const gr = w.granny
      gr.alarm = Math.max(0, gr.alarm - raw)
      gr.t -= dt
      const cross = 2.4
      if (gr.mode === 'in' || gr.mode === 'out') {
        gr.step += dt * 9
        gr.u += (gr.mode === 'in' ? 1 : -1) * (dt / cross)
        if (gr.mode === 'in' && gr.u >= 1) {
          gr.u = 1
          gr.mode = 'waitIn'
          gr.t = 2.4
        } else if (gr.mode === 'out' && gr.u <= 0) {
          gr.u = 0
          gr.mode = 'waitOut'
          gr.t = 3
        }
      } else if (gr.t <= 0) gr.mode = gr.mode === 'waitOut' ? 'in' : 'out'
    }
    const gp = w.spec.grandma ? grannyXY() : null
    for (const c of w.cars) {
      const v = w.vis[c.id]
      v.bump = Math.max(0, v.bump - raw * 3)
      v.shake = Math.max(0, v.shake - raw)
      v.angry = Math.max(0, v.angry - raw)
      if (v.state === 'park') {
        const p = carCenter(c)
        const k = 1 - Math.exp(-16 * dt)
        const before = Math.hypot(p.x - v.px, p.y - v.py)
        v.px += (p.x - v.px) * k
        v.py += (p.y - v.py) * k
        if (v.skid > 0 && before > 2 && Math.random() < 0.5) w.skids.push({ x: v.px, y: v.py, a: (c.dir * Math.PI) / 2, life: 1.2 })
        if (before < 1.5) v.skid = 0
      } else if (v.state === 'exit') {
        let blocked = false
        if (gp && grannyOnRoad() && Math.hypot(gp.x - v.px, gp.y - v.py) < g.R * 0.9) blocked = true
        v.speed = blocked ? 0 : Math.min(820, v.speed + 1500 * dt)
        let step = v.speed * dt
        while (step > 0 && v.path.length) {
          const dx = v.path[0] - v.px
          const dy = v.path[1] - v.py
          const d = Math.hypot(dx, dy)
          if (d > 0.5) {
            const target = Math.atan2(dy, dx)
            let da = target - v.ang
            while (da > Math.PI) da -= Math.PI * 2
            while (da < -Math.PI) da += Math.PI * 2
            v.ang += da * Math.min(1, dt * 14)
          }
          if (d <= step) {
            v.px = v.path[0]
            v.py = v.path[1]
            v.path.splice(0, 2)
            step -= d
          } else {
            v.px += (dx / d) * step
            v.py += (dy / d) * step
            step = 0
          }
        }
        v.puff -= dt
        if (v.puff <= 0 && v.speed > 0) {
          v.puff = 0.06
          const len = c.len * g.cell * 0.5
          fx.burst(v.px - Math.cos(v.ang) * len, v.py - Math.sin(v.ang) * len, { count: 1, color: ['#cbd5e1', '#94a3b8'], speed: 40, size: 4, gravity: -30, drag: 3, life: 0.5 })
        }
      } else if (v.state === 'lift') {
        v.lift += dt
        v.py -= v.lift * 900 * dt
        v.ang += dt * 3
      }
    }
    for (const s of w.skids) s.life -= raw
    if (w.skids.length) w.skids = w.skids.filter((s) => s.life > 0)
    w.comboT = Math.max(0, w.comboT - dt)
    for (const c of w.flying) c.t += raw
    const arrived = w.flying.filter((c) => c.t >= c.d + 0.55)
    if (arrived.length) {
      w.flying = w.flying.filter((c) => c.t < c.d + 0.55)
      sfx.tick()
    }

    if (ph === 'play') {
      if (w.freeze > 0) w.freeze = Math.max(0, w.freeze - dt)
      else w.time = Math.max(0, w.time - dt)
      const sec = Math.ceil(w.time)
      if (sec !== secRef.current) {
        secRef.current = sec
        if (sec <= 10 && sec > 0 && w.freeze <= 0) sfx.tick()
        pushHud()
      }
      if (w.time <= 0) fail("TIME'S UP!")
      else if (w.cars.every((c) => c.gone) && w.vis.every((v) => v.state === 'park' || v.px < -60 || v.py < -80)) levelClear()
    } else if (ph === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0) {
        setPhaseBoth('play')
        beginLevel(w.level + 1)
      }
    } else if (ph === 'dying') {
      w.failT -= raw
      if (w.failT <= 0 && w.failT > -1) {
        w.failT = -5
        die()
      }
    }
  }

  // ── Render ─────────────────────────────────────
  function drawLot(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const g = geo()
    const { W, H } = g
    // grass + trees
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#4ade80')
    bg.addColorStop(1, '#15803d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    for (let k = 0; k < 40; k++) ctx.fillRect((k * 97) % W, (k * 53) % H, 3, 6)
    // road ring
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.roundRect(g.lx - g.R - 6, g.ly - g.R - 6, g.lw + 2 * g.R + 12, g.lh + 2 * g.R + 12, 18)
    ctx.fill()
    ctx.fillStyle = '#475569'
    ctx.beginPath()
    ctx.roundRect(g.lx - g.R, g.ly - g.R, g.lw + 2 * g.R, g.lh + 2 * g.R, 14)
    ctx.fill()
    // exit lane to the left
    ctx.fillRect(-10, g.rt - g.R / 2, g.lx, g.R)
    ctx.strokeStyle = 'rgba(254,240,138,0.75)'
    ctx.lineWidth = 2
    ctx.setLineDash([10, 9])
    ctx.beginPath()
    ctx.roundRect(g.rl, g.rt, g.rr - g.rl, g.rb - g.rt, 8)
    ctx.moveTo(g.rl, g.rt)
    ctx.lineTo(0, g.rt)
    ctx.stroke()
    ctx.setLineDash([])
    // exit sign
    ctx.fillStyle = '#16a34a'
    ctx.beginPath()
    ctx.roundRect(4, g.rt - g.R / 2 - 22, 40, 18, 4)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = "900 10px 'Plus Jakarta Sans', system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('EXIT', 24, g.rt - g.R / 2 - 13)
    // asphalt lot
    ctx.fillStyle = '#334155'
    ctx.fillRect(g.lx, g.ly, g.lw, g.lh)
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'
    ctx.lineWidth = 1.5
    for (let x = 1; x < w.spec.cols; x++) {
      ctx.beginPath()
      ctx.moveTo(g.lx + x * g.cell, g.ly + 4)
      ctx.lineTo(g.lx + x * g.cell, g.ly + g.lh - 4)
      ctx.stroke()
    }
    for (let y = 1; y < w.spec.rows; y++) {
      ctx.beginPath()
      ctx.setLineDash([g.cell * 0.3, g.cell * 0.7])
      ctx.moveTo(g.lx, g.ly + y * g.cell)
      ctx.lineTo(g.lx + g.lw, g.ly + y * g.cell)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.strokeStyle = '#facc15'
    ctx.lineWidth = 3
    ctx.strokeRect(g.lx, g.ly, g.lw, g.lh)
    // skid marks
    for (const s of w.skids) {
      ctx.globalAlpha = Math.min(0.5, s.life * 0.5)
      ctx.fillStyle = '#0f172a'
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.rotate(s.a)
      ctx.fillRect(-3, -g.cell * 0.3, 6, 3)
      ctx.fillRect(-3, g.cell * 0.27, 6, 3)
      ctx.restore()
    }
    ctx.globalAlpha = 1
    // crosswalk
    if (w.spec.grandma) {
      const a = w.cross + 1
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      for (let k = -3; k <= 3; k++) {
        const o = k * (g.cell * 0.28)
        if (w.side === 0) ctx.fillRect(g.lx + g.lw + 3, g.ly + a * g.cell + o - 3, g.R - 6, 6)
        else if (w.side === 2) ctx.fillRect(g.lx - g.R + 3, g.ly + a * g.cell + o - 3, g.R - 6, 6)
        else if (w.side === 1) ctx.fillRect(g.lx + a * g.cell + o - 3, g.ly + g.lh + 3, 6, g.R - 6)
        else ctx.fillRect(g.lx + a * g.cell + o - 3, g.ly - g.R + 3, 6, g.R - 6)
      }
      if (grannyOnRoad()) {
        // warn on the two edge cells
        ctx.fillStyle = `rgba(250,204,21,${0.25 + Math.sin(t * 8) * 0.12})`
        for (const k of [w.cross, w.cross + 1]) {
          if (w.side === 0) ctx.fillRect(g.lx + g.lw - g.cell * 0.3, g.ly + k * g.cell, g.cell * 0.3, g.cell)
          else if (w.side === 2) ctx.fillRect(g.lx, g.ly + k * g.cell, g.cell * 0.3, g.cell)
          else if (w.side === 1) ctx.fillRect(g.lx + k * g.cell, g.ly + g.lh - g.cell * 0.3, g.cell, g.cell * 0.3)
          else ctx.fillRect(g.lx + k * g.cell, g.ly, g.cell, g.cell * 0.3)
        }
      }
    }
    // trees at corners
    const trees: [number, number][] = [[g.lx - g.R - 18, g.ly + g.lh * 0.5], [g.lx + g.lw + g.R + 18, g.ly + g.lh * 0.25], [g.lx + g.lw + g.R + 16, g.ly + g.lh * 0.8], [W * 0.5, g.ly + g.lh + g.R + 22]]
    for (const [x, y] of trees) {
      if (x < -10 || x > W + 10 || y > H - 70) continue
      ctx.fillStyle = 'rgba(2,6,23,0.25)'
      ctx.beginPath()
      ctx.arc(x + 4, y + 5, 16, 0, Math.PI * 2)
      ctx.fill()
      const gr = ctx.createRadialGradient(x - 5, y - 6, 2, x, y, 17)
      gr.addColorStop(0, '#86efac')
      gr.addColorStop(1, '#166534')
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.arc(x, y, 16, 0, Math.PI * 2)
      ctx.fill()
    }
    for (const i of w.cones) drawCone(ctx, g.lx + ((i % w.spec.cols) + 0.5) * g.cell, g.ly + (Math.floor(i / w.spec.cols) + 0.5) * g.cell, g.cell)
  }

  function drawCars(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const g = geo()
    const occ = phaseRef.current === 'play' ? occupancy(w.spec.cols, w.spec.rows, w.cars, w.cones) : null
    const order = [...w.cars].sort((a, b) => Number(w.vis[a.id].state !== 'park') - Number(w.vis[b.id].state !== 'park'))
    for (const c of order) {
      const v = w.vis[c.id]
      if (v.state !== 'park' && (v.px < -70 || v.py < -90)) continue
      const L = c.len * g.cell - 8
      const B = g.cell - 12
      const spr = carSprite(c.color, L, B, c.len >= 3)
      let x = v.px
      let y = v.py
      if (v.bump > 0) {
        const k = Math.sin(v.bump * Math.PI) * 5
        x += DX[v.bumpDir] * k
        y += DY[v.bumpDir] * k
      }
      if (v.shake > 0) {
        x += Math.sin(t * 70) * 3 * v.shake
        y += Math.cos(t * 63) * 2 * v.shake
      }
      const lift = v.state === 'lift' ? 1 + Math.min(0.5, v.lift) : 1
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(v.ang)
      ctx.scale(lift, lift)
      ctx.drawImage(spr, -(L + 8) / 2, -(B + 10) / 2, L + 8, B + 10)
      if (c.ice > 0) {
        ctx.fillStyle = 'rgba(186,230,253,0.6)'
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(-L / 2 - 2, -B / 2 - 2, L + 4, B + 4, 6)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.beginPath()
        ctx.moveTo(-L * 0.3, -B / 2)
        ctx.lineTo(-L * 0.15, -B / 2)
        ctx.lineTo(-L * 0.35, B / 2)
        ctx.lineTo(-L * 0.45, B / 2)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
      if (c.ice > 0) {
        ctx.font = `900 ${Math.round(g.cell * 0.38)}px 'Plus Jakarta Sans', system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineWidth = 3
        ctx.strokeStyle = '#0c4a6e'
        ctx.strokeText(String(c.ice), x, y)
        ctx.fillStyle = '#ffffff'
        ctx.fillText(String(c.ice), x, y)
      }
      if (v.angry > 0 && v.state === 'park') {
        drawAnger(ctx, x + g.cell * 0.2, y - g.cell * 0.3, g.cell * 0.2 * (1 + Math.sin(t * 12) * 0.1))
        if (Math.random() < 0.08) fx.burst(x, y - 6, { count: 1, color: ['#e2e8f0'], speed: 40, size: 4, gravity: -60, life: 0.5 })
      }
      // direction arrow on parked free cars (subtle hint of the facing)
      if (v.state === 'park' && c.ice === 0 && occ) {
        const fx0 = x + Math.cos(v.ang) * (L / 2 + 1)
        const fy0 = y + Math.sin(v.ang) * (L / 2 + 1)
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.beginPath()
        ctx.moveTo(fx0 + Math.cos(v.ang) * 5, fy0 + Math.sin(v.ang) * 5)
        ctx.lineTo(fx0 + Math.cos(v.ang + 2.3) * 4, fy0 + Math.sin(v.ang + 2.3) * 4)
        ctx.lineTo(fx0 + Math.cos(v.ang - 2.3) * 4, fy0 + Math.sin(v.ang - 2.3) * 4)
        ctx.closePath()
        ctx.fill()
      }
    }
  }

  function drawMood(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const g = geo()
    const n = w.cap
    const size = 18
    const x0 = g.W / 2 - ((n - 1) * (size + 6)) / 2
    const y = 52
    for (let k = 0; k < n; k++) {
      const x = x0 + k * (size + 6)
      const mad = k < w.anger
      const pulse = mad && k === w.anger - 1 ? 1 + Math.max(0, Math.sin(t * 10)) * 0.12 : 1
      const r = (size / 2) * pulse
      const gr = ctx.createRadialGradient(x - 3, y - 3, 1, x, y, r)
      gr.addColorStop(0, mad ? '#fca5a5' : '#fef08a')
      gr.addColorStop(1, mad ? '#dc2626' : '#eab308')
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#1f2937'
      ctx.beginPath()
      ctx.arc(x - r * 0.35, y - r * 0.1, r * 0.12, 0, Math.PI * 2)
      ctx.arc(x + r * 0.35, y - r * 0.1, r * 0.12, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      if (mad) {
        ctx.arc(x, y + r * 0.5, r * 0.3, Math.PI * 1.15, Math.PI * 1.85)
        ctx.moveTo(x - r * 0.6, y - r * 0.45)
        ctx.lineTo(x - r * 0.15, y - r * 0.3)
        ctx.moveTo(x + r * 0.6, y - r * 0.45)
        ctx.lineTo(x + r * 0.15, y - r * 0.3)
      } else ctx.arc(x, y + r * 0.1, r * 0.35, 0.3, Math.PI - 0.3)
      ctx.stroke()
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    update(dt, raw)
    fx.applyShake(ctx)
    drawLot(ctx, t)
    drawCars(ctx, t)
    if (w.spec.grandma) {
      const p = grannyXY()
      const g = geo()
      drawGrandma(ctx, p.x, p.y + g.cell * 0.25, g.cell * 0.8, w.granny.step, w.granny.alarm > 0 || grannyOnRoad())
    }
    if (w.craneMode) {
      for (const c of w.cars) {
        if (c.gone) continue
        const v = w.vis[c.id]
        glow(ctx, v.px, v.py, geo().cell * 0.9, '#fde047', 0.35 + Math.sin(t * 8) * 0.12)
      }
    }
    fx.draw(ctx)
    ctx.restore()
    if (phaseRef.current !== 'idle') drawMood(ctx, t)
    for (const c of w.flying) {
      if (c.t < c.d) continue
      const k = Math.min(1, (c.t - c.d) / 0.55)
      const e = k * k
      const x = c.x + (W - 40 - c.x) * e
      const y = c.y + (20 - c.y) * e - Math.sin(k * Math.PI) * 60
      ctx.fillStyle = '#eab308'
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(x - 2, y - 2, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__parkingjamLevel = (n: number) => beginLevel(n)
    win.__parkingjam = () => {
      const w = world.current
      const occ = occupancy(w.spec.cols, w.spec.rows, w.cars, w.cones)
      const out = w.cars
        .filter((c) => !c.gone && w.vis[c.id].state === 'park')
        .map((c) => {
          const p = carCenter(c)
          return { x: p.x, y: p.y, match: c.ice === 0 && drive(w.spec.cols, w.spec.rows, occ, c, c.dir).exits && !grannyBlocks(c, c.dir) }
        })
      return { phase: phaseRef.current, level: w.level, anger: w.anger, time: Math.round(w.time), out }
    }
    return () => {
      delete win.__parkingjam
      delete win.__parkingjamLevel
    }
  }, [])

  const won = hud.level >= 5
  const mm = Math.floor(Math.max(0, hud.time) / 60)
  const ss = String(Math.max(0, hud.time) % 60).padStart(2, '0')
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena pj-arena" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (press.current = null)}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="pj-hud-level">
                  Lv {hud.level}
                  {hud.hard ? <span className="pj-hard">HARD</span> : null}
                </div>
                <div className="pj-sub">
                  {hud.score} pts · {hud.left} cars
                </div>
              </div>
              <div className="action-hud__right">
                <span className="pj-coins">
                  <i />
                  {hud.coins}
                </span>
                <span className={`pj-timer${hud.frozen ? ' is-frozen' : hud.time <= 10 ? ' is-low' : ''}`}>
                  {mm}:{ss}
                </span>
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'clear' || phase === 'dying' ? (
            <div className="pj-boosters" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" className={`pj-boost tp-boost${hud.craneMode ? ' is-on' : ''}`} aria-label="Tow truck" disabled={hud.crane <= 0 && !hud.craneMode} onClick={toggleCrane}>
                <CraneIcon />
                Tow
                <span className="pj-boost__n">{hud.crane}</span>
              </button>
              <button type="button" className="pj-boost tp-boost" aria-label="Undo bump" disabled={hud.undo <= 0} onClick={useUndo}>
                <UndoIcon />
                Undo
                <span className="pj-boost__n">{hud.undo}</span>
              </button>
              <button type="button" className="pj-boost tp-boost" aria-label="Freeze time" disabled={hud.freezes <= 0} onClick={useFreeze}>
                <FreezeIcon />
                Freeze
                <span className="pj-boost__n">{hud.freezes}</span>
              </button>
            </div>
          ) : null}
          {hud.craneMode && phase === 'play' ? <div className="pj-hint">Tap any car to tow it away</div> : null}
          {banner && phase !== 'idle' && phase !== 'over' ? (
            <div className={`action-banner pj-banner${banner.hard ? ' is-hard' : ''}`} key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.stars ? <span className="pj-stars">{'★'.repeat(banner.stars) + '☆'.repeat(3 - banner.stars)}</span> : null}
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="parkingjam"
              icon={meta.icon}
              title={meta.title}
              hint="Tap a car to drive it forward, swipe to reverse. Clear the lot — but every bump makes the drivers angrier."
              onPlay={(lv) => start(lv)}
            />
          )}
          <ActionResult run={run} title={won ? 'Lot cleared, champ!' : 'Gridlock!'} subtitle={`Score ${hud.score} · reached level ${hud.level}`} celebrate={won} onPlayAgain={() => start()} />
        </div>
      </div>
    </GameShell>
  )
}


