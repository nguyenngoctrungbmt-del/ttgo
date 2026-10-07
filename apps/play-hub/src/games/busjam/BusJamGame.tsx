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
import { HUES, clearArtCache, drawBus, drawPlanter, drawTunnel, personSprite, symbolPath } from './art'
import {
  SEATS,
  benchFree,
  generate,
  newLogic,
  openSet,
  pathOut,
  place,
  reachable,
  room,
  spawnTunnels,
  specFor,
  type Cell,
  type Event,
  type LevelSpec,
  type Logic,
  type PlaceResult,
} from './engine'
import '../../shared/action/action.css'
import { LEVELS, authoredLevel } from './levels'
import './busjam.css'

const meta = getGame('busjam')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type Dest = { kind: 'bench'; seat: number } | { kind: 'bus'; busId: number; slot: number }
type Person = {
  id: number
  color: number
  look: number
  x: number
  y: number
  mode: 'grid' | 'walk' | 'bench' | 'curb' | 'gone'
  path: number[]
  dest: Dest | null
  pop: number
  shake: number
  arc: number
  travel: number
  dist: number
}
type VBus = { id: number; color: number; slot: number; x: number; y: number; vx: number; state: 'queue' | 'arrive' | 'stop' | 'leave'; seated: [number, number][]; wait: number; rot: number; puff: number; squash: number }
type Coin = { x: number; y: number; t: number; d: number }

type World = {
  level: number
  spec: LevelSpec
  cells: Cell[]
  L: Logic
  persons: Person[]
  cellP: Int32Array
  buses: VBus[]
  departed: number
  benchPeak: number
  score: number
  coins: number
  combo: number
  comboT: number
  vip: number
  shuffle: number
  seat: number
  vipMode: boolean
  stuck: boolean
  failT: number
  clearT: number
  idleT: number
  benchShake: number
  nextId: number
  flying: Coin[]
  stats: { score: number; level: number; riders: number; buses: number; perfect: number; hard: number }
}

const BENCH = 5
const MAX_BENCH = 8

function freshWorld(): World {
  const spec = specFor(2)
  return {
    level: 0,
    spec,
    cells: [],
    L: newLogic([], 1, BENCH),
    persons: [],
    cellP: new Int32Array(0),
    buses: [],
    departed: 0,
    benchPeak: 0,
    score: 0,
    coins: 0,
    combo: 0,
    comboT: 0,
    vip: 1,
    shuffle: 1,
    seat: 1,
    vipMode: false,
    stuck: false,
    failT: 0,
    clearT: 0,
    idleT: 1,
    benchShake: 0,
    nextId: 1,
    flying: [],
    stats: { score: 0, level: 1, riders: 0, buses: 0, perfect: 0, hard: 0 },
  }
}

const VipIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5h18M12 5v3" />
    <path d="M6 13a6 5 0 0 1 12 0v2H6z" fill="currentColor" fillOpacity="0.25" />
    <path d="M9 18l-1 2M15 18l1 2M6 15h12" />
  </svg>
)
const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7h4l10 10h4M17 21l4-4-4-4M3 17h4l3-3M14 10l3-3h4M17 3l4 4-4 4" />
  </svg>
)
const SeatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12h16M5 12v6M19 12v6M6 12V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" />
    <path d="M12 1v4M10 3h4" />
  </svg>
)

export default function BusJamGame() {
  const run = useActionRun('busjam')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 620 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const lastEvent = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hard: false, coins: 0, vip: 0, shuffle: 0, seat: 0, vipMode: false, left: 0, total: 0, stuck: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string; stars?: number; hard?: boolean } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    const total = w.spec.buses
    const left = w.L.queue.length + w.L.stops.filter((b) => b).length
    setHud({ score: w.score, level: w.level, hard: w.spec.hard, coins: w.coins, vip: w.vip, shuffle: w.shuffle, seat: w.seat, vipMode: w.vipMode, left, total, stuck: w.stuck })
  }

  const playing = () => phaseRef.current === 'play'

  // ── Geometry ────────────────────────────────────
  function geo() {
    const { w: W, h: H } = size.current
    const w = world.current
    const { cols, rows, stops } = w.spec
    const roadTop = 66
    const busW = stops === 2 ? Math.min(136, W * 0.42) : Math.min(156, W * 0.46)
    const busH = busW * 0.47
    const laneY = roadTop + busH * 0.62
    const stopY = laneY + busH * 0.42
    const roadBot = stopY + 8
    const n = w.L.bench.length
    const seatW = Math.min(50, (W - 20) / Math.max(5, n))
    const benchY = roadBot + 16 + seatW * 0.8
    const yardTop = benchY + 18
    const yardBot = H - 82
    const cell = Math.min(62, (W - 20) / cols, (yardBot - yardTop) / rows)
    const gx = (W - cell * cols) / 2
    const gy = yardTop + Math.min(10, Math.max(0, yardBot - yardTop - cell * rows) * 0.3)
    const ps = Math.min(cell, seatW * 1.06)
    return { W, H, roadTop, busW, busH, laneY, stopY, roadBot, seatW, benchY, yardTop, yardBot, cell, gx, gy, ps }
  }

  function stopX(slot: number) {
    const { W } = geo()
    return world.current.spec.stops === 2 ? W * (slot === 0 ? 0.27 : 0.73) : W * 0.5
  }

  function cellXY(i: number) {
    const { cell, gx, gy } = geo()
    const c = i % world.current.spec.cols
    const r = Math.floor(i / world.current.spec.cols)
    return { x: gx + (c + 0.5) * cell, y: gy + (r + 0.5) * cell }
  }

  function feet(i: number) {
    const p = cellXY(i)
    return { x: p.x, y: p.y + geo().cell * 0.3 }
  }

  function seatXY(i: number) {
    const { W, seatW, benchY } = geo()
    const n = world.current.L.bench.length
    return { x: W / 2 + (i - (n - 1) / 2) * seatW, y: benchY }
  }

  function doorXY(slot: number) {
    const { busW, roadBot } = geo()
    return { x: stopX(slot) + busW * 0.23, y: roadBot + 6 }
  }

  // ── Level setup ────────────────────────────────
  function newPerson(color: number, x: number, y: number): Person {
    const w = world.current
    return { id: w.nextId++, color, look: Math.floor(Math.random() * 9), x, y, mode: 'grid', path: [], dest: null, pop: 0, shake: 0, arc: 0, travel: 0, dist: 0 }
  }

  function loadLevel(n: number) {
    const w = world.current
    const lv = authoredLevel(n) ?? generate(specFor(n), Math.floor(Math.random() * 1e9))
    const spec = lv.spec
    w.level = n
    w.spec = spec
    w.cells = lv.cells
    const bench = phaseRef.current === 'idle' ? BENCH : BENCH + run.level('bench')
    w.L = newLogic(lv.buses, spec.stops, bench)
    w.persons = []
    w.cellP = new Int32Array(lv.cells.length).fill(-1)
    w.buses = []
    w.benchPeak = 0
    w.stuck = false
    w.vipMode = false
    w.failT = 0
    w.L.stops.forEach((b, s) => b && w.buses.push(makeBus(b.id, b.color, s)))
    lv.cells.forEach((c, i) => {
      if (c.kind !== 'p') return
      const f = feet(i)
      const p = newPerson(c.color, f.x, f.y)
      w.persons.push(p)
      w.cellP[i] = w.persons.length - 1
    })
    spawnTunnels(w.cells, onSpawn)
  }

  function makeBus(id: number, color: number, slot: number): VBus {
    const { busW, laneY } = geo()
    return { id, color, slot, x: -busW * 0.7, y: laneY, vx: 0, state: 'queue', seated: [], wait: 0, rot: 0, puff: 0, squash: 0 }
  }

  function onSpawn(tunnel: number, cell: number) {
    const w = world.current
    const t = cellXY(tunnel)
    const p = newPerson(w.cells[cell].color, t.x, t.y + geo().cell * 0.3)
    const f = feet(cell)
    p.mode = 'walk'
    p.path = [f.x, f.y]
    p.pop = 1
    w.persons.push(p)
    w.cellP[cell] = w.persons.length - 1
  }

  // ── Rules glue ─────────────────────────────────
  function handleEvents(events: Event[]) {
    const w = world.current
    for (const e of events) {
      if ('from' in e) {
        // bench passenger hops on the arriving bus
        const p = w.persons.find((q) => (q.mode === 'bench' || (q.mode === 'walk' && q.dest?.kind === 'bench')) && q.dest?.kind === 'bench' && q.dest.seat === e.seat)
        if (p) {
          const d = doorXY(e.slot)
          p.dest = { kind: 'bus', busId: e.busId, slot: e.slot }
          if (p.mode === 'bench') {
            p.mode = 'walk'
            p.path = [p.x, p.y + 10, d.x, d.y]
          } else p.path.push(d.x, d.y)
        }
      } else if (e.kind === 'arrive') {
        w.buses.push(makeBus(e.busId, e.color, e.slot))
      }
    }
  }

  function setDest(p: Person, r: PlaceResult) {
    if (!r) return
    if (r.kind === 'bench') {
      const s = seatXY(r.seat)
      p.dest = { kind: 'bench', seat: r.seat }
      p.path.push(s.x, s.y)
    } else {
      const d = doorXY(r.slot)
      p.dest = { kind: 'bus', busId: r.busId, slot: r.slot }
      p.path.push(d.x, d.y)
    }
  }

  function canMove() {
    const w = world.current
    const { cols, rows } = w.spec
    const open = openSet(w.cells, cols, rows)
    for (let i = 0; i < w.cells.length; i++) {
      const c = w.cells[i]
      if (c.kind !== 'p' || c.frozen > 0 || !reachable(w.cells, cols, rows, i, open)) continue
      if (room(w.L, c.color) >= (c.pair >= 0 ? 2 : 1)) return true
    }
    return false
  }

  function yardLeft() {
    return world.current.cells.some((c) => c.kind === 'p' || (c.kind === 'tunnel' && c.queue.length > 0))
  }

  /** Send the passenger in cell i (and a VIP partner) to a bus or the bench. */
  function send(i: number, vip: boolean) {
    const w = world.current
    const c = w.cells[i]
    const group = c.pair >= 0 && w.cells[c.pair].kind === 'p' ? [i, c.pair] : [i]
    const color = c.color
    for (const g of group) {
      const cg = w.cells[g]
      const pid = w.cellP[g]
      const p = w.persons[pid]
      const route = vip ? [g] : pathOut(w.cells, w.spec.cols, w.spec.rows, g)
      cg.kind = 'empty'
      cg.pair = -1
      cg.frozen = 0
      cg.hidden = false
      w.cellP[g] = -1
      const events: Event[] = []
      const r = place(w.L, color, events)
      p.mode = 'walk'
      p.path = []
      p.arc = vip ? 1 : 0
      p.travel = 0
      if (!vip) {
        for (const k of route.slice(1)) {
          const f = feet(k)
          p.path.push(f.x, f.y)
        }
        const top = feet(route[route.length - 1])
        p.path.push(top.x, geo().yardTop - 6)
      }
      setDest(p, r)
      handleEvents(events)
      p.dist = pathLen(p)
      w.departed += 1
      if (playing()) {
        w.score += 10
        w.stats.riders += 1
      }
    }
    // thaw frozen passengers
    for (let k = 0; k < w.cells.length; k++) {
      const ck = w.cells[k]
      if (ck.kind === 'p' && ck.frozen > 0) {
        ck.frozen = Math.max(0, ck.frozen - group.length)
        if (ck.frozen === 0) {
          const f = cellXY(k)
          fx.burst(f.x, f.y, { count: 16, color: ['#e0f2fe', '#7dd3fc', '#ffffff'], speed: 200, shape: 'square', size: 4, gravity: 400 })
          if (playing()) sfx.clang()
          const p = w.persons[w.cellP[k]]
          if (p) p.pop = 1
        }
      }
    }
    spawnTunnels(w.cells, onSpawn)
    revealHidden()
    const used = w.L.bench.length - benchFree(w.L)
    w.benchPeak = Math.max(w.benchPeak, used)
    if (playing()) {
      sfx.pop()
      haptic.light()
      w.stats.score = w.score
      run.update(w.stats)
      checkStuck()
      pushHud()
    }
  }

  function pathLen(p: Person) {
    let d = 0
    let x = p.x
    let y = p.y
    for (let k = 0; k < p.path.length; k += 2) {
      d += Math.hypot(p.path[k] - x, p.path[k + 1] - y)
      x = p.path[k]
      y = p.path[k + 1]
    }
    return d
  }

  function revealHidden() {
    const w = world.current
    const { cols, rows } = w.spec
    const open = openSet(w.cells, cols, rows)
    w.cells.forEach((c, i) => {
      if (c.kind === 'p' && c.hidden && reachable(w.cells, cols, rows, i, open)) {
        c.hidden = false
        const p = w.persons[w.cellP[i]]
        if (p) p.pop = 1
        const f = cellXY(i)
        fx.burst(f.x, f.y, { count: 10, color: [HUES[c.color].base, '#ffffff'], speed: 140, gravity: 120 })
        if (playing()) sfx.flip()
      }
    })
  }

  function checkStuck() {
    const w = world.current
    if (!yardLeft() || canMove()) {
      w.stuck = false
      return
    }
    const vipHelps = w.vip > 0 && w.cells.some((c) => c.kind === 'p' && room(w.L, c.color) >= (c.pair >= 0 ? 2 : 1))
    const open = openSet(w.cells, w.spec.cols, w.spec.rows)
    const needed = (col: number) => w.L.stops.some((b) => b && b.color === col && b.assigned < SEATS)
    const shuffleHelps =
      w.shuffle > 0 &&
      w.cells.some((c) => c.kind === 'p' && c.pair < 0 && needed(c.color)) &&
      w.cells.some((c, i) => c.kind === 'p' && c.pair < 0 && c.frozen === 0 && reachable(w.cells, w.spec.cols, w.spec.rows, i, open))
    if (vipHelps || shuffleHelps || (w.seat > 0 && w.L.bench.length < MAX_BENCH)) {
      if (!w.stuck) {
        w.stuck = true
        setBanner({ key: Date.now(), text: 'OUT OF SPACE!', sub: 'use a booster', hard: true })
        sfx.miss()
        haptic.error()
        w.benchShake = 0.6
      }
      return
    }
    w.failT = 0.9
    setPhaseBoth('dying')
    setBanner({ key: Date.now(), text: 'OUT OF SPACE!', hard: true })
    w.benchShake = 0.8
    fx.flash('#ef4444', 0.3)
    fx.shake(8, 0.35)
    fx.slowmo(0.8, 0.4)
    sfx.lose()
    haptic.error()
  }

  // ── Player actions ─────────────────────────────
  function tapCell(i: number) {
    const w = world.current
    const c = w.cells[i]
    if (!c || c.kind !== 'p') return
    const p = w.persons[w.cellP[i]]
    const f = cellXY(i)
    const need = c.pair >= 0 ? 2 : 1
    if (w.vipMode) {
      if (room(w.L, c.color) < need) {
        bumpBench()
        return
      }
      w.vip -= 1
      w.vipMode = false
      fx.ring(f.x, f.y, { color: '#fde047', maxR: 40, life: 0.4 })
      fx.text(f.x, f.y - 30, 'VIP!', '#fde047', 18)
      sfx.power()
      send(i, true)
      return
    }
    if (c.frozen > 0) {
      if (p) p.shake = 0.3
      fx.text(f.x, f.y - 26, `frozen ${c.frozen}`, '#bae6fd', 14)
      sfx.clang()
      haptic.light()
      return
    }
    if (!reachable(w.cells, w.spec.cols, w.spec.rows, i)) {
      if (p) p.shake = 0.35
      sfx.miss()
      haptic.light()
      return
    }
    if (room(w.L, c.color) < need) {
      bumpBench()
      return
    }
    send(i, false)
  }

  function bumpBench() {
    const w = world.current
    w.benchShake = 0.45
    const { W, benchY } = geo()
    fx.text(W / 2, benchY - 40, 'Bench full!', '#fecaca', 18)
    sfx.miss()
    haptic.medium()
  }

  function toggleVip() {
    const w = world.current
    if (!playing()) return
    if (w.vipMode) w.vipMode = false
    else if (w.vip > 0) w.vipMode = true
    sfx.tap()
    pushHud()
  }

  function useShuffle() {
    const w = world.current
    if (!playing() || w.shuffle <= 0) return
    const { cols, rows } = w.spec
    const open = openSet(w.cells, cols, rows)
    const idxs = w.cells.map((c, i) => (c.kind === 'p' && c.pair < 0 ? i : -1)).filter((i) => i >= 0)
    if (idxs.length < 2) return
    w.shuffle -= 1
    const pool = idxs.map((i) => w.cells[i].color)
    // riders for the waiting buses step to the front
    const want: number[] = []
    for (const b of w.L.stops) if (b) for (let k = b.assigned; k < SEATS; k++) want.push(b.color)
    const front = idxs.filter((i) => w.cells[i].frozen === 0 && reachable(w.cells, cols, rows, i, open)).sort(() => Math.random() - 0.5)
    const back = idxs.filter((i) => !front.includes(i)).sort((a, b) => a - b)
    const orderI = [...front, ...back]
    const out: number[] = []
    for (const c of want) {
      const k = pool.indexOf(c)
      if (k >= 0) out.push(pool.splice(k, 1)[0])
    }
    pool.sort(() => Math.random() - 0.5)
    out.push(...pool)
    orderI.forEach((i, k) => {
      w.cells[i].color = out[k]
      const p = w.persons[w.cellP[i]]
      if (p) {
        p.color = out[k]
        p.pop = 1
      }
      const f = cellXY(i)
      fx.burst(f.x, f.y, { count: 4, color: [HUES[out[k]].base, '#ffffff'], speed: 120, gravity: 100 })
    })
    sfx.whoosh()
    sfx.flip()
    haptic.medium()
    checkStuck()
    pushHud()
  }

  function useSeat() {
    const w = world.current
    if (!playing() || w.seat <= 0 || w.L.bench.length >= MAX_BENCH) return
    w.seat -= 1
    w.L.bench.push(null)
    relayoutBench()
    const s = seatXY(w.L.bench.length - 1)
    fx.ring(s.x, s.y - 10, { color: '#7dd3fc', maxR: 40, life: 0.4 })
    fx.text(s.x, s.y - 40, '+1 SEAT', '#7dd3fc', 16)
    sfx.power()
    haptic.medium()
    checkStuck()
    pushHud()
  }

  /** Bench grew: slide seated passengers to their new seat positions. */
  function relayoutBench() {
    const w = world.current
    for (const p of w.persons) {
      if (p.dest?.kind !== 'bench') continue
      const s = seatXY(p.dest.seat)
      if (p.mode === 'bench') {
        p.mode = 'walk'
        p.path = [s.x, s.y]
        p.arc = 0
        p.dist = pathLen(p)
        p.travel = 0
      } else if (p.mode === 'walk' && p.path.length >= 2) {
        p.path[p.path.length - 2] = s.x
        p.path[p.path.length - 1] = s.y
      }
    }
  }

  // ── Lifecycle ──────────────────────────────────
  function start(level?: number) {
    void unlockAudio()
    const first = typeof level === 'number' && level >= 1 ? Math.floor(level) : run.nextLevel
    const w = freshWorld()
    w.vip = 1 + run.level('vip')
    w.shuffle = 1
    w.seat = 1
    world.current = w
    fx.reset()
    clearArtCache()
    setPhaseBoth('play')
    run.begin()
    beginLevel(first)
  }

  function beginLevel(n: number) {
    const w = world.current
    loadLevel(n)
    w.stats.level = n
    const spec = w.spec
    setBanner({ key: Date.now(), text: spec.hard ? 'HARD LEVEL' : `LEVEL ${n}`, sub: [LEVELS[n - 1]?.name, spec.intro ?? (spec.hard ? 'stay sharp' : `${spec.buses} buses`)].filter(Boolean).join(' · '), hard: spec.hard })
    if (spec.hard) sfx.boom(0.3)
    else sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function levelClear() {
    const w = world.current
    const cap = w.L.bench.length
    // Stars: bench peak 0–1 = 3, up to half the bench = 2, otherwise 1.
    const stars = w.benchPeak <= 1 ? 3 : w.benchPeak <= Math.ceil(cap / 2) ? 2 : 1
    run.completeLevel(w.level, stars)
    const bonus = 100 + stars * 50 + (w.spec.hard ? 200 : 0)
    w.score += bonus
    w.coins += 2 + stars + (w.spec.hard ? 5 : 0)
    if (w.benchPeak === 0) w.stats.perfect += 1
    if (w.spec.hard) w.stats.hard += 1
    w.stats.score = w.score
    let gift = ''
    if (w.spec.hard) {
      w.vip += 1
      gift = ' · +1 VIP'
    } else if (w.level % 3 === 0) {
      if (Math.random() < 0.5) {
        w.shuffle += 1
        gift = ' · +1 shuffle'
      } else {
        w.seat += 1
        gift = ' · +1 seat'
      }
    }
    setPhaseBoth('clear')
    w.clearT = 1.9
    const { W, H } = geo()
    for (let k = 0; k < 4; k++) fx.burst(W * (0.2 + k * 0.2), H * 0.35, { count: 18, color: ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#ffffff'], speed: 360, shape: 'square', size: 5, gravity: 420, life: 1.1 })
    for (let k = 0; k < 2 + stars * 2; k++) w.flying.push({ x: W / 2 + rand(-40, 40), y: H * 0.45 + rand(-20, 20), t: 0, d: 0.5 + k * 0.08 })
    fx.flash('#fef9c3', 0.2)
    sfx.win()
    haptic.success()
    setBanner({ key: Date.now(), text: w.spec.hard ? 'HARD LEVEL BEATEN!' : `LEVEL ${w.level} CLEAR!`, sub: `+${bonus}${gift}`, stars })
    if ((w.level % 5 === 0 || w.spec.hard) && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'busjam', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  function die() {
    const w = world.current
    setPhaseBoth('over')
    const coins = Math.round((w.coins + w.level) * (1 + run.level('bounty') * 0.15))
    run.end({ score: w.score, cleared: w.level >= 5, stats: { ...w.stats }, coins }, revive)
    pushHud()
  }

  /** Revive: two extra bench seats and a VIP pickup. */
  function revive() {
    const w = world.current
    for (let k = 0; k < 2 && w.L.bench.length < MAX_BENCH + 2; k++) w.L.bench.push(null)
    relayoutBench()
    w.vip += 1
    w.stuck = false
    w.failT = 0
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: '+2 bench seats · +1 VIP' })
    const { W, benchY } = geo()
    fx.ring(W / 2, benchY - 10, { color: '#fde047', maxR: 120, life: 0.6 })
    checkStuck()
    pushHud()
  }

  // ── Input ──────────────────────────────────────
  function cellAt(x: number, y: number) {
    const w = world.current
    const { cell, gx, gy } = geo()
    const c = Math.floor((x - gx) / cell)
    const r = Math.floor((y - gy) / cell)
    if (c < 0 || r < 0 || c >= w.spec.cols || r >= w.spec.rows) return -1
    return r * w.spec.cols + c
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (!playing()) return
    const p = localPoint(e, e.currentTarget)
    const i = cellAt(p.x, p.y)
    if (i >= 0) tapCell(i)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'v') toggleVip()
      else if (e.key === 's') useShuffle()
      else if (e.key === 'b') useSeat()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Tick ───────────────────────────────────────
  function update(dt: number, raw: number, t: number) {
    const w = world.current
    const ph = phaseRef.current
    const g = geo()
    if (ph === 'idle') {
      if (!w.cells.length) loadLevel(2)
      w.idleT -= raw
      if (w.idleT <= 0) {
        w.idleT = 0.75
        const { cols, rows } = w.spec
        const open = openSet(w.cells, cols, rows)
        const cand: number[] = []
        w.cells.forEach((c, i) => c.kind === 'p' && c.frozen === 0 && reachable(w.cells, cols, rows, i, open) && room(w.L, c.color) >= (c.pair >= 0 ? 2 : 1) && cand.push(i))
        const match = cand.filter((i) => w.L.stops.some((b) => b && b.color === w.cells[i].color && b.assigned < SEATS))
        const pool = match.length ? match : benchFree(w.L) > 2 ? cand : []
        if (pool.length) send(pool[Math.floor(Math.random() * pool.length)], false)
        else if (!w.buses.length || !yardLeft()) loadLevel(2)
      }
    }
    const speed = Math.max(300, g.cell * 9)
    for (const p of w.persons) {
      p.pop = Math.max(0, p.pop - raw * 3)
      p.shake = Math.max(0, p.shake - raw)
      if (p.mode === 'walk') {
        let step = speed * (p.arc ? 1.25 : 1) * dt
        while (step > 0 && p.path.length) {
          const dx = p.path[0] - p.x
          const dy = p.path[1] - p.y
          const d = Math.hypot(dx, dy)
          if (d <= step) {
            p.x = p.path[0]
            p.y = p.path[1]
            p.path.splice(0, 2)
            step -= d
            p.travel += d
          } else {
            p.x += (dx / d) * step
            p.y += (dy / d) * step
            p.travel += step
            step = 0
          }
        }
        if (!p.path.length) {
          p.arc = 0
          if (!p.dest) p.mode = 'grid'
          else if (p.dest.kind === 'bench') {
            p.mode = 'bench'
            p.pop = 0.6
            if (ph === 'play') sfx.tap()
          } else p.mode = 'curb'
        }
      }
      if (p.mode === 'curb' && p.dest?.kind === 'bus') {
        const id = p.dest.busId
        const bus = w.buses.find((b) => b.id === id)
        if (bus && bus.state === 'stop') {
          bus.seated.push([p.look, p.color])
          bus.squash = 1
          p.mode = 'gone'
          fx.burst(p.x, p.y - 16, { count: 6, color: [HUES[p.color].base, '#ffffff'], speed: 110, gravity: 200, size: 2.5 })
          if (ph === 'play' || ph === 'clear') sfx.score(bus.seated.length)
        }
      }
    }
    // keep resting passengers glued to their spots (handles resizes)
    const cols = w.spec.cols
    for (let i = 0; i < w.cells.length; i++) {
      if (w.cellP[i] < 0) continue
      const p = w.persons[w.cellP[i]]
      if (p && p.mode === 'grid' && w.cells[i].kind === 'p') {
        p.x = g.gx + ((i % cols) + 0.5) * g.cell
        p.y = g.gy + (Math.floor(i / cols) + 0.8) * g.cell
      }
    }
    for (const p of w.persons) {
      if (p.mode === 'bench' && p.dest?.kind === 'bench') {
        const s = seatXY(p.dest.seat)
        p.x = s.x
        p.y = s.y
      }
    }
    // buses
    for (let s = 0; s < w.spec.stops; s++) {
      const front = w.buses.find((b) => b.slot === s && b.state !== 'leave')
      if (front && front.state === 'queue') front.state = 'arrive'
    }
    for (const b of w.buses) {
      b.squash = Math.max(0, b.squash - raw * 4)
      if (b.state === 'arrive') {
        const tx = stopX(b.slot)
        const before = b.x
        b.x = tx + (b.x - tx) * Math.exp(-5.5 * dt)
        if (tx - b.x < g.busW * 0.8) b.y += (g.stopY - b.y) * (1 - Math.exp(-8 * dt))
        b.rot += (b.x - before) / (g.busW * 0.075)
        if (Math.abs(tx - b.x) < 0.6) {
          b.x = tx
          b.y = g.stopY
          b.state = 'stop'
          b.squash = 1
          if (ph === 'play') sfx.tap()
        }
      } else if (b.state === 'stop') {
        if (b.seated.length >= SEATS) {
          b.wait += dt
          if (b.wait > 0.3) {
            b.state = 'leave'
            onDepart(b)
          }
        }
      } else if (b.state === 'leave') {
        b.vx += 900 * dt
        b.x += b.vx * dt
        b.rot += (b.vx * dt) / (g.busW * 0.075)
        b.y += (g.laneY - b.y) * (1 - Math.exp(-6 * dt))
        b.puff -= dt
        if (b.puff <= 0) {
          b.puff = 0.05
          fx.burst(b.x - g.busW * 0.5, b.y - 6, { count: 2, color: ['#cbd5e1', '#94a3b8', '#e2e8f0'], speed: 50, size: 5, gravity: -60, drag: 3, life: 0.6, angle: Math.PI, spread: 0.8 })
        }
      }
    }
    if (w.buses.length) w.buses = w.buses.filter((b) => b.x - g.busW * 0.6 < g.W + 10)
    w.comboT = Math.max(0, w.comboT - dt)
    if (w.comboT === 0) w.combo = 0
    w.benchShake = Math.max(0, w.benchShake - raw)

    // coins flying to the counter
    for (const c of w.flying) c.t += raw
    const arrived = w.flying.filter((c) => c.t >= c.d + 0.55)
    if (arrived.length) {
      w.flying = w.flying.filter((c) => c.t < c.d + 0.55)
      sfx.tick()
    }

    if (ph === 'play') {
      if (!yardLeft() && !w.L.queue.length && w.L.stops.every((b) => !b) && !w.buses.length && w.persons.every((p) => p.mode === 'gone')) levelClear()
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
    void t
  }

  function onDepart(b: VBus) {
    const w = world.current
    const ph = phaseRef.current
    if (ph !== 'play' && ph !== 'clear') return
    w.combo = w.comboT > 0 ? w.combo + 1 : 1
    w.comboT = 3
    const gain = 30 * w.combo
    w.score += gain
    w.stats.buses += 1
    w.stats.score = w.score
    const { stopY, busH } = geo()
    fx.text(b.x, stopY - busH - 14, w.combo > 1 ? `+${gain} x${w.combo}` : `+${gain}`, w.combo > 1 ? '#fde047' : '#ffffff', 18 + Math.min(8, w.combo * 2))
    fx.burst(b.x, stopY - busH * 0.5, { count: 14, color: [HUES[b.color].base, HUES[b.color].light, '#ffffff'], speed: 220, gravity: 300 })
    if (w.combo >= 2) sfx.combo()
    sfx.whoosh()
    haptic.medium()
    run.update(w.stats)
    pushHud()
  }

  // ── Render ─────────────────────────────────────
  function drawScenery(ctx: CanvasRenderingContext2D, t: number) {
    const g = geo()
    const { W, H } = g
    // sky + skyline
    const sky = ctx.createLinearGradient(0, 0, 0, g.roadTop)
    sky.addColorStop(0, '#38bdf8')
    sky.addColorStop(1, '#bae6fd')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, g.roadTop + 4)
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    for (let k = 0; k < 3; k++) {
      const cx = ((t * 8 + k * 160) % (W + 120)) - 60
      ctx.beginPath()
      ctx.ellipse(cx, 14 + k * 9, 26, 7, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 18, 11 + k * 9, 16, 7, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    const blds: [number, number, string][] = [[0, 30, '#818cf8'], [0.12, 42, '#a78bfa'], [0.26, 24, '#60a5fa'], [0.37, 36, '#f472b6'], [0.5, 28, '#fb923c'], [0.62, 44, '#34d399'], [0.76, 30, '#818cf8'], [0.88, 38, '#f59e0b']]
    for (const [fx0, hgt, col] of blds) {
      const bx = fx0 * W
      const bw = W * 0.13
      ctx.fillStyle = col
      ctx.fillRect(bx, g.roadTop - hgt, bw, hgt + 4)
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      for (let wy = g.roadTop - hgt + 6; wy < g.roadTop - 6; wy += 9) for (let wx = bx + 5; wx < bx + bw - 6; wx += 9) ctx.fillRect(wx, wy, 4, 4)
    }
    // road
    ctx.fillStyle = '#475569'
    ctx.fillRect(0, g.roadTop, W, g.roadBot - g.roadTop)
    ctx.fillStyle = '#334155'
    ctx.fillRect(0, g.roadTop, W, 4)
    ctx.strokeStyle = 'rgba(254,240,138,0.8)'
    ctx.lineWidth = 3
    ctx.setLineDash([18, 14])
    ctx.beginPath()
    ctx.moveTo(0, (g.laneY + g.stopY) / 2 - g.busH * 0.18)
    ctx.lineTo(W, (g.laneY + g.stopY) / 2 - g.busH * 0.18)
    ctx.stroke()
    ctx.setLineDash([])
    // bus stop bays
    for (let s = 0; s < world.current.spec.stops; s++) {
      const x = stopX(s)
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'
      ctx.lineWidth = 2
      ctx.strokeRect(x - g.busW * 0.55, g.stopY - g.busH * 0.42, g.busW * 1.1, g.busH * 0.42 + 6)
    }
    // sidewalk
    const sw = ctx.createLinearGradient(0, g.roadBot, 0, g.yardTop)
    sw.addColorStop(0, '#e2e8f0')
    sw.addColorStop(1, '#cbd5e1')
    ctx.fillStyle = sw
    ctx.fillRect(0, g.roadBot, W, g.yardTop - g.roadBot)
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(0, g.roadBot, W, 3)
    // yard plaza
    const yd = ctx.createLinearGradient(0, g.yardTop, 0, H)
    yd.addColorStop(0, '#fde68a')
    yd.addColorStop(1, '#f59e0b')
    ctx.fillStyle = yd
    ctx.fillRect(0, g.yardTop, W, H - g.yardTop)
    ctx.strokeStyle = 'rgba(146,64,14,0.12)'
    ctx.lineWidth = 1
    for (let y = g.yardTop + 22; y < H; y += 22) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
  }

  function drawBench(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const g = geo()
    const n = w.L.bench.length
    const free = benchFree(w.L)
    const shake = w.benchShake > 0 ? Math.sin(t * 60) * 5 * Math.min(1, w.benchShake * 2) : 0
    const x0 = seatXY(0).x - g.seatW / 2 - 6 + shake
    const x1 = seatXY(n - 1).x + g.seatW / 2 + 6 + shake
    const danger = phaseRef.current !== 'idle' && free <= 1 && yardLeft()
    if (danger) glow(ctx, (x0 + x1) / 2, g.benchY - g.seatW * 0.4, (x1 - x0) * 0.6, '#ef4444', 0.25 + Math.sin(t * 8) * 0.1)
    // backrest + seat planks
    ctx.fillStyle = '#92400e'
    ctx.beginPath()
    ctx.roundRect(x0, g.benchY - g.seatW * 0.95, x1 - x0, g.seatW * 0.3, 6)
    ctx.fill()
    ctx.fillStyle = '#b45309'
    ctx.beginPath()
    ctx.roundRect(x0, g.benchY - g.seatW * 0.4, x1 - x0, g.seatW * 0.32, 6)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(x0 + 4, g.benchY - g.seatW * 0.38, x1 - x0 - 8, 3)
    for (let i = 0; i < n; i++) {
      const s = seatXY(i)
      ctx.fillStyle = w.L.bench[i] == null ? (danger ? 'rgba(254,202,202,0.9)' : 'rgba(255,237,213,0.85)') : 'rgba(120,53,15,0.5)'
      ctx.beginPath()
      ctx.roundRect(s.x - g.seatW * 0.38 + shake, g.benchY - g.seatW * 0.36, g.seatW * 0.76, g.seatW * 0.22, 4)
      ctx.fill()
    }
    ctx.fillStyle = '#44403c'
    ctx.fillRect(x0 + 6, g.benchY - g.seatW * 0.1, 5, g.seatW * 0.2)
    ctx.fillRect(x1 - 11, g.benchY - g.seatW * 0.1, 5, g.seatW * 0.2)
    // bus stop sign
    const sx = Math.min(g.W - 14, x1 + 14)
    ctx.fillStyle = '#64748b'
    ctx.fillRect(sx - 1.5, g.roadBot + 2, 3, g.benchY - g.roadBot)
    ctx.fillStyle = '#16a34a'
    ctx.beginPath()
    ctx.arc(sx, g.roadBot + 8, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.fillRect(sx - 4, g.roadBot + 6, 8, 4)
  }

  function drawYard(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const g = geo()
    const { cols, rows } = w.spec
    const open = openSet(w.cells, cols, rows)
    // gate line
    ctx.fillStyle = '#ffffff'
    for (let c = 0; c < cols; c++) {
      const x = g.gx + c * g.cell
      for (let k = 0; k < 4; k++) ctx.fillRect(x + 4 + k * (g.cell / 4), g.gy - 9, g.cell / 8, 6)
    }
    // tiles
    for (let i = 0; i < w.cells.length; i++) {
      const c = w.cells[i]
      const p = cellXY(i)
      ctx.fillStyle = c.kind === 'wall' ? 'rgba(120,53,15,0.22)' : (i + Math.floor(i / cols)) % 2 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.16)'
      ctx.beginPath()
      ctx.roundRect(p.x - g.cell * 0.46, p.y - g.cell * 0.46, g.cell * 0.92, g.cell * 0.92, g.cell * 0.16)
      ctx.fill()
    }
    // pair ropes under passengers
    for (let i = 0; i < w.cells.length; i++) {
      const c = w.cells[i]
      if (c.kind !== 'p' || c.pair < i) continue
      const a = w.persons[w.cellP[i]]
      const b = w.persons[w.cellP[c.pair]]
      if (!a || !b) continue
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(a.x, a.y - g.cell * 0.35)
      ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 - g.cell * 0.15, b.x, b.y - g.cell * 0.35)
      ctx.stroke()
    }
    for (let i = 0; i < w.cells.length; i++) {
      const c = w.cells[i]
      const p = cellXY(i)
      if (c.kind === 'wall') drawPlanter(ctx, p.x, p.y + g.cell * 0.14, g.cell)
      else if (c.kind === 'tunnel') {
        const f = cellXY(c.front)
        drawTunnel(ctx, p.x, p.y, g.cell, Math.sign(f.x - p.x), Math.sign(f.y - p.y), c.queue.length, c.queue.length ? c.queue[0] : -1)
      }
    }
    // passengers standing in the yard
    for (let i = 0; i < w.cells.length; i++) {
      const c = w.cells[i]
      if (c.kind !== 'p') continue
      const p = w.persons[w.cellP[i]]
      if (!p || p.mode !== 'grid') continue
      const free = c.frozen === 0 && reachable(w.cells, cols, rows, i, open)
      if (w.vipMode && room(w.L, c.color) >= (c.pair >= 0 ? 2 : 1)) glow(ctx, p.x, p.y - g.ps * 0.4, g.ps * 0.7, '#fde047', 0.45 + Math.sin(t * 8) * 0.15)
      drawPersonAt(ctx, p, g.ps, c.hidden, free ? 1 : 0.72, t, free && phaseRef.current !== 'idle')
      if (c.pair >= 0) drawCrown(ctx, p.x, p.y - g.ps * 0.95, g.ps)
      if (c.frozen > 0) drawIce(ctx, p.x, p.y, g.ps, c.frozen)
    }
  }

  function drawPersonAt(ctx: CanvasRenderingContext2D, p: Person, s: number, mystery: boolean, alpha: number, t: number, bounce: boolean) {
    const spr = personSprite(p.color, p.look, s, mystery)
    let x = p.x
    let y = p.y
    let sx = 1
    let sy = 1
    if (p.shake > 0) x += Math.sin(p.shake * 60) * 4
    if (p.mode === 'walk') {
      y -= Math.abs(Math.sin(p.travel * 0.09)) * 3
      if (p.arc && p.dist > 0) y -= Math.sin(Math.min(1, p.travel / p.dist) * Math.PI) * s * 1.6
    } else if (bounce) y -= Math.max(0, Math.sin(t * 5 + p.id)) * 1.6
    if (p.pop > 0) {
      const k = Math.sin(p.pop * Math.PI)
      sx = 1 + k * 0.18
      sy = 1 - k * 0.12
    }
    ctx.globalAlpha = alpha
    if (sx !== 1) {
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(sx, sy)
      ctx.drawImage(spr, -s * 0.5, -s * 0.9, s, s)
      ctx.restore()
    } else ctx.drawImage(spr, x - s * 0.5, y - s * 0.9, s, s)
    ctx.globalAlpha = 1
  }

  function drawCrown(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
    const r = s * 0.14
    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.moveTo(x - r, y + r * 0.5)
    ctx.lineTo(x - r, y - r * 0.4)
    ctx.lineTo(x - r * 0.5, y + r * 0.05)
    ctx.lineTo(x, y - r * 0.7)
    ctx.lineTo(x + r * 0.5, y + r * 0.05)
    ctx.lineTo(x + r, y - r * 0.4)
    ctx.lineTo(x + r, y + r * 0.5)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }

  function drawIce(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, n: number) {
    ctx.fillStyle = 'rgba(186,230,253,0.55)'
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x - s * 0.4, y - s * 0.86, s * 0.8, s * 0.9, s * 0.14)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.beginPath()
    ctx.moveTo(x - s * 0.3, y - s * 0.78)
    ctx.lineTo(x - s * 0.18, y - s * 0.78)
    ctx.lineTo(x - s * 0.32, y - s * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.font = `900 ${Math.round(s * 0.3)}px 'Plus Jakarta Sans', system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 3
    ctx.strokeStyle = '#0c4a6e'
    ctx.strokeText(String(n), x, y - s * 0.42)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(String(n), x, y - s * 0.42)
  }

  function drawQueue(ctx: CanvasRenderingContext2D) {
    const w = world.current
    const { W } = geo()
    const next = w.L.queue.slice(0, 4)
    if (!next.length) return
    const x0 = W - 14 - next.length * 30 + 6
    ctx.fillStyle = 'rgba(15,23,42,0.45)'
    ctx.beginPath()
    ctx.roundRect(x0 - 40, 36, next.length * 30 + 46, 26, 13)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('NEXT', x0 - 32, 49)
    next.forEach((b, k) => {
      const x = x0 + k * 30 + 12
      const hue = HUES[b.color]
      ctx.fillStyle = hue.base
      ctx.beginPath()
      ctx.roundRect(x - 12, 41, 24, 16, 4)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.95)'
      symbolPath(ctx, hue.sym, x, 49, 4.5)
      ctx.fill()
    })
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    update(dt, raw, t)
    const g = geo()
    drawScenery(ctx, t)
    fx.applyShake(ctx)
    // buses (through lane first)
    const order = [...w.buses].sort((a, b) => a.y - b.y)
    for (const b of order) {
      const heads = b.seated
      const sq = Math.sin(b.squash * Math.PI) * 0.04
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.scale(1 + sq, 1 - sq)
      drawBus(ctx, 0, 0, g.busW, b.color, heads, SEATS, t, b.state === 'leave', b.rot)
      ctx.restore()
    }
    drawBench(ctx, t)
    drawYard(ctx, t)
    // passengers on the move / bench / curb, sorted by y
    const movers = w.persons.filter((p) => p.mode === 'walk' || p.mode === 'bench' || p.mode === 'curb').sort((a, b) => a.y - b.y)
    for (const p of movers) drawPersonAt(ctx, p, g.ps, false, 1, t, false)
    fx.draw(ctx)
    ctx.restore()
    if (phaseRef.current !== 'idle') drawQueue(ctx)
    // coins flying to the counter
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

  // Dev-only probe for scripted tests.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__busjamLevel = (n: number) => beginLevel(n)
    win.__busjam = () => {
      const w = world.current
      const { cols, rows } = w.spec
      const open = openSet(w.cells, cols, rows)
      const out: { x: number; y: number; match: boolean }[] = []
      w.cells.forEach((c, i) => {
        if (c.kind !== 'p') return
        if (w.vipMode) {
          if (room(w.L, c.color) >= (c.pair >= 0 ? 2 : 1)) out.push({ ...cellXY(i), match: true })
          return
        }
        if (c.frozen > 0 || !reachable(w.cells, cols, rows, i, open)) return
        const p = cellXY(i)
        out.push({ x: p.x, y: p.y, match: w.L.stops.some((b) => b && b.color === c.color && b.assigned < SEATS) })
      })
      const dbg = {
        people: w.persons.filter((p) => p.mode !== 'gone' && p.mode !== 'grid').map((p) => `${p.mode}:${JSON.stringify(p.dest)}:${p.path.length}`),
        buses: w.buses.map((b) => `${b.id}:${b.state}:${b.seated.length}:${Math.round(b.x)}`),
        stops: w.L.stops.map((b) => (b ? `${b.id}:${b.assigned}` : '-')),
        queue: w.L.queue.length,
      }
      return { phase: phaseRef.current, level: w.level, bench: w.L.bench.length - benchFree(w.L), cap: w.L.bench.length, out, dbg }
    }
    return () => {
      delete win.__busjam
      delete win.__busjamLevel
    }
  }, [])

  const won = hud.level >= 5
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena bj-arena" onPointerDown={onDown}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="bj-hud-level">
                  Lv {hud.level}
                  {hud.hard ? <span className="bj-hard">HARD</span> : null}
                </div>
                <div className="bj-sub">
                  {hud.score} pts · {hud.left} buses
                </div>
              </div>
              <div className="action-hud__right">
                <span className="bj-coins">
                  <i />
                  {hud.coins}
                </span>
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'clear' || phase === 'dying' ? (
            <div className={`bj-boosters${hud.stuck ? ' is-stuck' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" className={`bj-boost tp-boost${hud.vipMode ? ' is-on' : ''}`} aria-label="VIP pickup" disabled={hud.vip <= 0 && !hud.vipMode} onClick={toggleVip}>
                <VipIcon />
                VIP
                <span className="bj-boost__n">{hud.vip}</span>
              </button>
              <button type="button" className="bj-boost tp-boost" aria-label="Shuffle the crowd" disabled={hud.shuffle <= 0} onClick={useShuffle}>
                <ShuffleIcon />
                Shuffle
                <span className="bj-boost__n">{hud.shuffle}</span>
              </button>
              <button type="button" className="bj-boost tp-boost" aria-label="Extra bench seat" disabled={hud.seat <= 0} onClick={useSeat}>
                <SeatIcon />
                Seat
                <span className="bj-boost__n">{hud.seat}</span>
              </button>
            </div>
          ) : null}
          {hud.vipMode && phase === 'play' ? <div className="bj-hint">Tap any passenger to fly them out</div> : null}
          {banner && phase !== 'idle' && phase !== 'over' ? (
            <div className={`action-banner bj-banner${banner.hard ? ' is-hard' : ''}`} key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.stars ? <span className="bj-stars">{'★'.repeat(banner.stars) + '☆'.repeat(3 - banner.stars)}</span> : null}
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="busjam"
              icon={meta.icon}
              title={meta.title}
              hint="Tap passengers with a clear path out. Matching colours board the bus — the rest wait on a 5-seat bench."
              onPlay={(lv) => start(lv)}
            />
          )}
          <ActionResult run={run} title={won ? 'Rush hour hero!' : 'Out of space'} subtitle={`Score ${hud.score} · reached level ${hud.level}`} celebrate={won} onPlayAgain={() => start()} />
        </div>
      </div>
    </GameShell>
  )
}
