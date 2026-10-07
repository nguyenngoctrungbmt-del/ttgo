import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'
import './roads.css'

const meta = getGame('roads')

type Phase = 'idle' | 'play' | 'pick' | 'dying' | 'over'
type Tool = 'road' | 'motorway' | 'roundabout' | 'erase'
type Tile = { kind: 'grass' | 'water' | 'hill'; road: 0 | 1 | 2; round: boolean; b: number; tree: boolean }
type Building = { kind: 'house' | 'work'; color: number; x: number; y: number; idle: number; cars: number; pins: number; claimed: number; over: number; born: number; pinT: number }
type Car = { home: number; work: number; path: number[]; i: number; k: number; back: boolean; color: number }
type OfferId = 'roads' | 'bridge' | 'motorway' | 'roundabout' | 'cars' | 'calm'
type Offer = { id: OfferId; label: string; blurb: string }
const OFFERS: Offer[] = [
  { id: 'roads', label: '+20 Road Tiles', blurb: 'More asphalt for your network' },
  { id: 'bridge', label: '2 Bridges', blurb: 'Lay road across water' },
  { id: 'motorway', label: 'Motorway Kit', blurb: '10 motorway tiles: double speed, no jams' },
  { id: 'roundabout', label: '2 Roundabouts', blurb: 'Tap a junction: traffic flows freely' },
  { id: 'cars', label: 'Second Cars', blurb: 'Every house gets one more car' },
  { id: 'calm', label: 'Flexible Hours', blurb: 'Workplaces wait 25% longer' },
]

const COLS = 9
const ROWS = 13
const WEEK = 50
const PIN_CAP = 6
const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#a855f7', '#ec4899']
const DARK = ['#991b1b', '#1e3a8a', '#92400e', '#065f46', '#581c87', '#9d174d']

function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

type World = {
  tiles: Tile[]
  buildings: Building[]
  cars: Car[]
  roads: number
  bridges: number
  motorway: number
  rounds: number
  tool: Tool
  t: number
  week: number
  trips: number
  colors: number
  houseT: number
  workT: number
  dispatchT: number
  patience: number
  speed: number
  warnT: number
  rnd: () => number
  drag: { last: number } | null
  mapName: string
  stats: { trips: number; weeks: number; bridges: number; colors: number }
}

const idx = (x: number, y: number) => y * COLS + x
const tx = (i: number) => i % COLS
const ty = (i: number) => Math.floor(i / COLS)

function genMap(rnd: () => number): { tiles: Tile[]; name: string; bridges: number } {
  const tiles: Tile[] = []
  for (let i = 0; i < COLS * ROWS; i++) tiles.push({ kind: 'grass', road: 0, round: false, b: -1, tree: rnd() < 0.14 })
  const r = rnd()
  let name = 'Meadow'
  let bridges = 0
  if (r < 0.4) {
    name = 'Riverside'
    bridges = 3
    let x = 3 + Math.floor(rnd() * 3)
    for (let y = 0; y < ROWS; y++) {
      tiles[idx(x, y)].kind = 'water'
      if (rnd() < 0.3) {
        const nx = clamp(x + (rnd() < 0.5 ? -1 : 1), 2, COLS - 3)
        tiles[idx(nx, y)].kind = 'water'
        x = nx
      }
    }
  } else if (r < 0.7) {
    name = 'Lakes'
    bridges = 1
    for (let k = 0; k < 2; k++) {
      const cx = 1 + Math.floor(rnd() * (COLS - 2))
      const cy = k === 0 ? 2 + Math.floor(rnd() * 3) : 8 + Math.floor(rnd() * 3)
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (Math.hypot(x - cx, (y - cy) * 1.2) < 1.4) tiles[idx(x, y)].kind = 'water'
    }
  }
  // Hills
  const clusters = name === 'Meadow' ? 3 : 2
  for (let k = 0; k < clusters; k++) {
    const cx = Math.floor(rnd() * COLS)
    const cy = Math.floor(rnd() * ROWS)
    for (let n = 0; n < 4; n++) {
      const x = clamp(cx + Math.floor(rnd() * 3) - 1, 0, COLS - 1)
      const y = clamp(cy + Math.floor(rnd() * 3) - 1, 0, ROWS - 1)
      if (tiles[idx(x, y)].kind === 'grass') tiles[idx(x, y)].kind = 'hill'
    }
  }
  return { tiles, name, bridges }
}

function freshWorld(seed: number): World {
  const rnd = seeded(seed)
  const m = genMap(rnd)
  return {
    tiles: m.tiles,
    buildings: [],
    cars: [],
    roads: 24,
    bridges: m.bridges,
    motorway: 0,
    rounds: 0,
    tool: 'road',
    t: 0,
    week: 1,
    trips: 0,
    colors: 0,
    houseT: 6,
    workT: 0,
    dispatchT: 0,
    patience: 1,
    speed: 1,
    warnT: 0,
    rnd,
    drag: null,
    mapName: m.name,
    stats: { trips: 0, weeks: 1, bridges: 0, colors: 0 },
  }
}

function OfferIcon({ id }: { id: OfferId | Tool }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      {(id === 'roads' || id === 'road') && (
        <g>
          <rect x="4" y="2" width="20" height="24" rx="3" fill="#475569" />
          <path d="M14 4 V8 M14 12 V16 M14 20 V24" stroke="#fde68a" strokeWidth="2" />
        </g>
      )}
      {id === 'bridge' && (
        <g>
          <rect x="0" y="16" width="28" height="10" fill="#38bdf8" />
          <path d="M2 14 H26 V18 H2 Z" fill="#a16207" />
          <path d="M4 18 Q14 6 24 18" stroke="#e5e7eb" strokeWidth="2" fill="none" />
        </g>
      )}
      {id === 'motorway' && (
        <g>
          <rect x="2" y="2" width="24" height="24" rx="3" fill="#1e3a8a" />
          <path d="M10 4 V24 M18 4 V24" stroke="#ffffff" strokeWidth="1.6" strokeDasharray="3 3" />
          <path d="M14 7 L19 13 H9 Z" fill="#fde047" />
        </g>
      )}
      {id === 'roundabout' && (
        <g>
          <circle cx="14" cy="14" r="11" fill="#475569" />
          <circle cx="14" cy="14" r="5" fill="#4ade80" />
          <path d="M14 3 A11 11 0 0 1 25 14" stroke="#fde68a" strokeWidth="1.6" fill="none" />
        </g>
      )}
      {id === 'cars' && (
        <g>
          <rect x="4" y="10" width="20" height="9" rx="3" fill="#ef4444" />
          <rect x="8" y="6" width="11" height="6" rx="2" fill="#ef4444" />
          <circle cx="9" cy="20" r="2.6" fill="#111827" />
          <circle cx="19" cy="20" r="2.6" fill="#111827" />
        </g>
      )}
      {id === 'calm' && (
        <g>
          <circle cx="14" cy="14" r="11" fill="none" stroke="#a5f3fc" strokeWidth="3" />
          <path d="M14 7 V14 L19 17" stroke="#a5f3fc" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      )}
      {id === 'erase' && (
        <g>
          <path d="M6 18 L16 6 L24 13 L14 24 H8 Z" fill="#f9a8d4" />
          <path d="M6 18 L11 24" stroke="#831843" strokeWidth="2" />
        </g>
      )}
    </svg>
  )
}

export default function RoadsGame() {
  const run = useActionRun('roads')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const fx = useRef(new Fx()).current
  const world = useRef<World>(freshWorld(11))
  const phaseRef = useRef<Phase>('idle')
  const size = useRef({ W: 360, H: 600 })
  const lastEvent = useRef(0)
  const occ = useRef<Map<number, number>>(new Map())

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ trips: 0, week: 1, prog: 0, roads: 24, bridges: 0, motorway: 0, rounds: 0, tool: 'road' as Tool })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  function say(text: string, sub?: string) {
    setBanner({ key: performance.now(), text, sub })
  }
  function pushHud() {
    const w = world.current
    setHud({ trips: w.trips, week: w.week, prog: (w.t % WEEK) / WEEK, roads: w.roads, bridges: w.bridges, motorway: w.motorway, rounds: w.rounds, tool: w.tool })
  }

  // ── Geometry ─────────────────────────────────────────
  function layout() {
    const { W, H } = size.current
    const top = 66
    const bot = 74
    const ts = Math.floor(Math.min(W / COLS, (H - top - bot) / ROWS))
    const ox = Math.floor((W - ts * COLS) / 2)
    const oy = Math.floor(top + (H - top - bot - ts * ROWS) / 2)
    return { ts, ox, oy }
  }
  function center(i: number) {
    const { ts, ox, oy } = layout()
    return { x: ox + (tx(i) + 0.5) * ts, y: oy + (ty(i) + 0.5) * ts }
  }
  function tileAt(px: number, py: number) {
    const { ts, ox, oy } = layout()
    const x = Math.floor((px - ox) / ts)
    const y = Math.floor((py - oy) / ts)
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return -1
    return idx(x, y)
  }
  function neighbors(i: number) {
    const x = tx(i)
    const y = ty(i)
    const out: number[] = []
    if (x > 0) out.push(i - 1)
    if (x < COLS - 1) out.push(i + 1)
    if (y > 0) out.push(i - COLS)
    if (y < ROWS - 1) out.push(i + COLS)
    return out
  }

  /** BFS over road tiles from building a to building b; returns tile path incl. both ends. */
  function findPath(w: World, from: number, to: number): number[] | null {
    if (from === to) return [from]
    const prev = new Int16Array(COLS * ROWS).fill(-1)
    const q = [from]
    prev[from] = from
    while (q.length) {
      const c = q.shift() as number
      for (const n of neighbors(c)) {
        if (prev[n] !== -1) continue
        if (n === to) {
          prev[n] = c
          const path = [n]
          let k = c
          while (k !== from) {
            path.push(k)
            k = prev[k]
          }
          path.push(from)
          return path.reverse()
        }
        if (w.tiles[n].road === 0) continue
        prev[n] = c
        q.push(n)
      }
    }
    return null
  }

  // ── Spawning ─────────────────────────────────────────
  function freeSpot(w: World, nearX: number, nearY: number, radius: number) {
    for (let tries = 0; tries < 80; tries++) {
      const r = radius + tries * 0.05
      const x = Math.round(nearX + rand(-r, r))
      const y = Math.round(nearY + rand(-r, r))
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue
      const t = w.tiles[idx(x, y)]
      if (t.kind !== 'grass' || t.road || t.b >= 0) continue
      if (neighbors(idx(x, y)).some((n) => w.tiles[n].b >= 0)) continue
      return idx(x, y)
    }
    return -1
  }

  function addBuilding(w: World, kind: 'house' | 'work', color: number, i: number) {
    const b: Building = { kind, color, x: tx(i), y: ty(i), idle: kind === 'house' ? 2 : 0, cars: kind === 'house' ? 2 : 0, pins: 0, claimed: 0, over: 0, born: w.t, pinT: rand(2, 5) }
    w.tiles[i].b = w.buildings.length
    w.tiles[i].tree = false
    w.buildings.push(b)
    const c = center(i)
    fx.burst(c.x, c.y, { count: 12, color: [COLORS[color], '#ffffff'], speed: 120, size: 3, gravity: 100 })
    fx.ring(c.x, c.y, { color: COLORS[color], maxR: 22, life: 0.4 })
    if (phaseRef.current === 'play') sfx.pop()
    return b
  }

  function spawnWork(w: World, color: number) {
    const cx = 1 + w.rnd() * (COLS - 2)
    const cy = 1 + w.rnd() * (ROWS - 2)
    const i = freeSpot(w, cx, cy, 2.5)
    if (i < 0) return
    addBuilding(w, 'work', color, i)
    if (color >= w.colors) {
      w.colors = color + 1
      w.stats.colors = w.colors
    }
    // a couple of houses for it right away
    for (let k = 0; k < 2; k++) {
      const h = freeSpot(w, tx(i), ty(i), 3)
      if (h >= 0) addBuilding(w, 'house', color, h)
    }
  }

  function spawnHouse(w: World) {
    const works = w.buildings.filter((b) => b.kind === 'work')
    if (!works.length) return
    // Busiest workplaces get new homes first
    works.sort((a, b) => b.pins - a.pins + rand(-1.5, 1.5))
    const target = works[0]
    const far = 2.5 + Math.min(3.5, w.week * 0.5)
    const i = freeSpot(w, target.x, target.y, far)
    if (i >= 0) addBuilding(w, 'house', target.color, i)
  }

  // ── Run ──────────────────────────────────────────────
  function start() {
    void unlockAudio()
    const w = freshWorld(Math.floor(Math.random() * 1e9))
    w.roads += run.level('tiles') * 6
    w.patience = 1 + run.level('patience') * 0.15
    w.speed = 1 + run.level('speed') * 0.06
    world.current = w
    fx.reset()
    run.begin()
    spawnWork(w, 0)
    setPhaseBoth('play')
    pushHud()
    say('WEEK 1', `${w.mapName} · connect homes to work`)
    sfx.ready()
  }

  function weekEnd(w: World) {
    w.week += 1
    w.stats.weeks = w.week
    w.roads += 10
    say(`WEEK ${w.week}`, '+10 road tiles')
    sfx.levelUp()
    haptic.success()
    const pool = [...OFFERS].sort(() => Math.random() - 0.5)
    setOffers(pool.slice(0, 3))
    setPhaseBoth('pick')
    if (w.week % 3 === 0) {
      const now = performance.now()
      if (now - lastEvent.current > 30000) {
        lastEvent.current = now
        void trackEvent('action_milestone', { game_id: 'roads', kind: 'week', value: w.week })
      }
    }
    run.update({ ...w.stats, score: w.trips })
    pushHud()
  }

  function choose(o: Offer) {
    const w = world.current
    if (o.id === 'roads') w.roads += 20
    else if (o.id === 'bridge') w.bridges += 2
    else if (o.id === 'motorway') w.motorway += 10
    else if (o.id === 'roundabout') w.rounds += 2
    else if (o.id === 'cars') {
      for (const b of w.buildings) {
        if (b.kind !== 'house') continue
        b.cars += 1
        b.idle += 1
      }
    } else w.patience *= 1.25
    // New colour or extra workplace for the new week
    const newColor = [2, 3, 5, 7, 9].indexOf(w.week)
    if (newColor >= 0 && w.colors < COLORS.length) spawnWork(w, w.colors)
    else if (w.week >= 3) spawnWork(w, Math.floor(w.rnd() * w.colors))
    sfx.power()
    setPhaseBoth('play')
    pushHud()
  }

  function die(b: Building) {
    const w = world.current
    setPhaseBoth('dying')
    const c = center(idx(b.x, b.y))
    fx.flash('#ef4444', 0.3)
    fx.ring(c.x, c.y, { color: '#ef4444', maxR: 80, life: 0.8, width: 5 })
    fx.shake(10, 0.5)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    say('GRIDLOCK!', 'a workplace waited too long')
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.trips / 12 + w.week * 2)
      run.end({ score: w.trips, cleared: w.week >= 4, stats: { ...w.stats }, coins }, revive)
    }, 1500)
  }

  /** Ad revive: the jam clears and the council sends extra road tiles. */
  function revive() {
    const w = world.current
    for (const b of w.buildings) {
      if (b.kind !== 'work') continue
      if (b.over >= 0.95) {
        b.pins = Math.min(b.pins, 2)
        b.claimed = Math.min(b.claimed, b.pins)
      }
      b.over *= 0.3
    }
    w.roads += 10
    say('REVIVED!', 'jam cleared · +10 roads')
    pushHud()
    setPhaseBoth('play')
  }

  // ── Building roads ───────────────────────────────────
  function buildable(w: World, i: number) {
    const t = w.tiles[i]
    return t.b < 0 && t.kind !== 'hill'
  }

  function paint(w: World, i: number) {
    const t = w.tiles[i]
    const c = center(i)
    if (w.tool === 'erase') {
      if (!t.road) return
      if (t.road === 2) w.motorway += 1
      else if (t.kind === 'water') w.bridges += 1
      else w.roads += 1
      if (t.round) {
        w.rounds += 1
        t.round = false
      }
      t.road = 0
      fx.burst(c.x, c.y, { count: 6, color: ['#94a3b8', '#e2e8f0'], speed: 80, size: 3, gravity: 0 })
      sfx.move()
      reroute(w)
      return
    }
    if (w.tool === 'roundabout') {
      if (t.road && !t.round && w.rounds > 0 && t.kind !== 'water') {
        t.round = true
        w.rounds -= 1
        fx.ring(c.x, c.y, { color: '#4ade80', maxR: 18, life: 0.35 })
        sfx.thud()
        haptic.light()
      }
      return
    }
    if (!buildable(w, i)) return
    if (w.tool === 'motorway') {
      if (t.road === 2 || w.motorway <= 0 || t.kind === 'water') return
      if (t.road === 1) w.roads += 1
      t.road = 2
      w.motorway -= 1
    } else {
      if (t.road) return
      if (t.kind === 'water') {
        if (w.bridges <= 0) {
          fx.text(c.x, c.y - 10, 'NEED BRIDGE', '#fca5a5', 11)
          sfx.miss()
          return
        }
        w.bridges -= 1
        w.stats.bridges += 1
      } else {
        if (w.roads <= 0) {
          fx.text(c.x, c.y - 10, 'NO ROADS', '#fca5a5', 11)
          sfx.miss()
          return
        }
        w.roads -= 1
      }
      t.road = 1
    }
    t.tree = false
    fx.burst(c.x, c.y, { count: 5, color: ['#e2e8f0', '#fde68a'], speed: 60, size: 2.5, gravity: 0 })
    sfx.tick()
  }

  function reroute(w: World) {
    for (const car of w.cars) {
      const cur = car.path[Math.min(car.i, car.path.length - 1)]
      const dest = car.back ? idx(w.buildings[car.home].x, w.buildings[car.home].y) : idx(w.buildings[car.work].x, w.buildings[car.work].y)
      if (car.path.slice(car.i + 1, -1).every((p) => w.tiles[p].road)) continue
      const np = findPath(w, cur, dest)
      if (np) {
        car.path = np
        car.i = 0
        car.k = 0
      } else {
        car.path = []
      }
    }
  }

  function drawLine(w: World, from: number, to: number) {
    // 4-connected steps between two tiles
    let x = tx(from)
    let y = ty(from)
    const ex = tx(to)
    const ey = ty(to)
    let guard = 0
    while ((x !== ex || y !== ey) && guard++ < 30) {
      if (Math.abs(ex - x) >= Math.abs(ey - y)) x += Math.sign(ex - x)
      else y += Math.sign(ey - y)
      paint(w, idx(x, y))
    }
  }

  function onDown(e: React.PointerEvent) {
    if (phaseRef.current !== 'play') return
    const el = arenaRef.current
    if (!el) return
    const p = localPoint(e, el)
    const i = tileAt(p.x, p.y)
    if (i < 0) return
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    const w = world.current
    w.drag = { last: i }
    paint(w, i)
    pushHud()
  }
  function onMove(e: React.PointerEvent) {
    const w = world.current
    if (!w.drag || phaseRef.current !== 'play') return
    const el = arenaRef.current
    if (!el) return
    const p = localPoint(e, el)
    const i = tileAt(p.x, p.y)
    if (i < 0 || i === w.drag.last) return
    drawLine(w, w.drag.last, i)
    w.drag.last = i
    pushHud()
  }
  function onUp() {
    const w = world.current
    if (!w.drag) return
    w.drag = null
    reroute(w)
    haptic.light()
    pushHud()
  }

  function setTool(t: Tool) {
    world.current.tool = t
    sfx.tap()
    pushHud()
  }

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (phaseRef.current !== 'play') return
      if (e.key === '1') setTool('road')
      else if (e.key === 'e') setTool('erase')
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  // ── Simulation ───────────────────────────────────────
  function step(w: World, dt: number, live: boolean) {
    const prevWeek = Math.floor(w.t / WEEK)
    w.t += dt
    if (live && Math.floor(w.t / WEEK) > prevWeek) {
      weekEnd(w)
      return
    }
    // Spawns
    w.houseT -= dt
    if (w.houseT <= 0) {
      w.houseT = Math.max(5, 9 - w.week * 0.5) * rand(0.8, 1.2)
      if (w.buildings.length < 46) spawnHouse(w)
    }
    if (live) {
      w.workT += dt
      if (w.workT > WEEK * 0.55 && w.week >= 4 && w.week % 2 === 0) {
        w.workT = -WEEK
        spawnWork(w, Math.floor(w.rnd() * w.colors))
      }
    }
    // Demand
    const mins = w.t / 60
    let worst: Building | null = null
    for (const b of w.buildings) {
      if (b.kind !== 'work') continue
      b.pinT -= dt
      if (b.pinT <= 0) {
        // Demand grows with time and with the homes of this colour
        const homes = w.buildings.filter((h) => h.kind === 'house' && h.color === b.color).length
        const works = w.buildings.filter((h) => h.kind === 'work' && h.color === b.color).length
        const base = Math.max(2.4, 7.5 - mins * 0.8)
        b.pinT = (base / (0.6 + (0.28 * homes) / works)) * rand(0.75, 1.25)
        b.pins += 1
      }
      if (b.pins > PIN_CAP) b.over += dt / (24 * w.patience)
      else b.over = Math.max(0, b.over - dt / 12)
      if (!worst || b.over > worst.over) worst = b
    }
    if (live && worst && worst.over > 0) {
      w.warnT -= dt
      if (w.warnT <= 0) {
        w.warnT = worst.over > 0.6 ? 0.35 : 0.8
        sfx.tick()
        if (worst.over > 0.6) haptic.light()
      }
    }
    if (live && worst && worst.over >= 1) {
      die(worst)
      return
    }
    // Dispatch
    w.dispatchT -= dt
    if (w.dispatchT <= 0) {
      w.dispatchT = 0.25
      for (let wi = 0; wi < w.buildings.length; wi++) {
        const wk = w.buildings[wi]
        if (wk.kind !== 'work' || wk.pins <= wk.claimed) continue
        let best: number[] | null = null
        let bh = -1
        for (let hi = 0; hi < w.buildings.length; hi++) {
          const h = w.buildings[hi]
          if (h.kind !== 'house' || h.color !== wk.color || h.idle <= 0) continue
          const p = findPath(w, idx(h.x, h.y), idx(wk.x, wk.y))
          if (p && (!best || p.length < best.length)) {
            best = p
            bh = hi
          }
        }
        if (best && bh >= 0) {
          w.buildings[bh].idle -= 1
          wk.claimed += 1
          w.cars.push({ home: bh, work: wi, path: best, i: 0, k: 0, back: false, color: wk.color })
        }
      }
    }
    // Traffic: occupancy per tile
    const o = occ.current
    o.clear()
    for (const c of w.cars) {
      const tIdx = c.path[c.i]
      if (tIdx != null) o.set(tIdx, (o.get(tIdx) ?? 0) + 1)
    }
    for (const c of w.cars) {
      if (c.path.length < 2) {
        // Stranded: head home
        const h = w.buildings[c.home]
        if (!c.back) w.buildings[c.work].claimed = Math.max(0, w.buildings[c.work].claimed - 1)
        h.idle += 1
        c.home = -1
        continue
      }
      const cur = c.path[c.i]
      const tile = w.tiles[cur]
      const n = o.get(cur) ?? 1
      let sp = 2.3 * w.speed
      if (tile.road === 2) sp *= 2
      else if (!tile.round) sp /= 1 + 0.45 * Math.max(0, n - 1)
      c.k += sp * dt
      while (c.k >= 1 && c.home >= 0) {
        c.k -= 1
        c.i += 1
        if (c.i >= c.path.length - 1) {
          c.i = c.path.length - 1
          if (!c.back) {
            const wk = w.buildings[c.work]
            wk.pins = Math.max(0, wk.pins - 1)
            wk.claimed = Math.max(0, wk.claimed - 1)
            w.trips += 1
            w.stats.trips = w.trips
            if (live) {
              const p = center(idx(wk.x, wk.y))
              fx.text(p.x, p.y - 14, '+1', COLORS[wk.color], 13)
              fx.burst(p.x, p.y, { count: 5, color: [COLORS[wk.color], '#ffffff'], speed: 70, size: 2.5, gravity: 0 })
              if (w.trips % 25 === 0) {
                sfx.combo()
                fx.text(p.x, p.y - 30, `${w.trips} TRIPS`, '#fde047', 16)
              } else sfx.score(Math.min(6, w.trips % 7))
              if (w.trips % 5 === 0) run.update({ ...w.stats, score: w.trips })
            }
            const back = findPath(w, c.path[c.path.length - 1], idx(w.buildings[c.home].x, w.buildings[c.home].y))
            c.back = true
            c.path = back ?? []
            c.i = 0
            c.k = 0
            if (!back) break
          } else {
            w.buildings[c.home].idle += 1
            c.home = -1
          }
        }
      }
    }
    w.cars = w.cars.filter((c) => c.home >= 0)
  }

  // ── Drawing ──────────────────────────────────────────
  function drawHouse(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: number, pop: number) {
    const k = s * (0.32 + 0.06 * pop)
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(x - k + 2, y - k * 0.4 + 3, k * 2, k * 1.4)
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(x - k, y - k * 0.4, k * 2, k * 1.4)
    ctx.fillStyle = COLORS[col]
    ctx.beginPath()
    ctx.moveTo(x - k * 1.2, y - k * 0.3)
    ctx.lineTo(x, y - k * 1.3)
    ctx.lineTo(x + k * 1.2, y - k * 0.3)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = DARK[col]
    ctx.fillRect(x - k * 0.25, y + k * 0.35, k * 0.5, k * 0.65)
  }

  function drawWork(ctx: CanvasRenderingContext2D, w: World, b: Building, x: number, y: number, s: number, t: number) {
    const k = s * 0.44
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.beginPath()
    ctx.roundRect(x - k + 3, y - k + 4, k * 2, k * 2, 6)
    ctx.fill()
    const g = ctx.createLinearGradient(0, y - k, 0, y + k)
    g.addColorStop(0, COLORS[b.color])
    g.addColorStop(1, DARK[b.color])
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(x - k, y - k, k * 2, k * 2, 6)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) ctx.fillRect(x - k * 0.7 + c * k * 0.5, y - k * 0.6 + r * k * 0.5, k * 0.3, k * 0.28)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(x - k, y - k, k * 2, k * 0.25)
    // demand pins around the top
    const shown = Math.min(b.pins, 10)
    for (let i = 0; i < shown; i++) {
      const a = -Math.PI / 2 + (i - (shown - 1) / 2) * 0.42
      const px = x + Math.cos(a) * k * 1.45
      const py = y + Math.sin(a) * k * 1.45
      ctx.fillStyle = i < PIN_CAP ? '#ffffff' : '#fecaca'
      ctx.beginPath()
      ctx.arc(px, py, s * 0.09, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = i < PIN_CAP ? COLORS[b.color] : '#ef4444'
      ctx.beginPath()
      ctx.arc(px, py, s * 0.055, 0, Math.PI * 2)
      ctx.fill()
    }
    if (b.over > 0) {
      const pulse = 0.6 + 0.4 * Math.sin(t * (6 + b.over * 10))
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.arc(x, y, k * 1.75, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = `rgba(239,68,68,${pulse})`
      ctx.beginPath()
      ctx.arc(x, y, k * 1.75, -Math.PI / 2, -Math.PI / 2 + b.over * Math.PI * 2)
      ctx.stroke()
      glow(ctx, x, y, k * 2.6, '#ef4444', 0.25 * b.over * pulse)
    }
    void w
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { W, H }
    const w = world.current
    const ph = phaseRef.current
    const dt = ph === 'pick' ? 0 : fx.step(raw)
    if (ph === 'pick') fx.step(0)

    if (ph === 'idle') {
      // Attract mode: a tiny self-running town
      if (!w.buildings.length) {
        spawnWork(w, 0)
        spawnWork(w, 1)
        for (let y = 2; y < ROWS - 2; y++) for (let x = 1; x < COLS - 1; x++) {
          const tl = w.tiles[idx(x, y)]
          if ((x === 4 || y === 6 || y === 3 || y === 9) && tl.b < 0 && tl.kind !== 'hill') tl.road = 1
        }
        for (const b of w.buildings) {
          for (const n of neighbors(idx(b.x, b.y))) if (w.tiles[n].b < 0 && w.tiles[n].kind !== 'hill') w.tiles[n].road = 1
        }
      }
      step(w, dt, false)
      for (const b of w.buildings) b.over = 0
    } else if (ph === 'play') {
      step(w, dt, true)
      if (Math.floor(t * 4) !== Math.floor((t - raw) * 4)) pushHud()
    }

    const { ts, ox, oy } = layout()
    // ground
    ctx.fillStyle = '#365314'
    ctx.fillRect(0, 0, W, H)
    fx.applyShake(ctx)
    ctx.fillStyle = '#a3d977'
    ctx.fillRect(ox, oy, ts * COLS, ts * ROWS)
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = ox + tx(i) * ts
      const y = oy + ty(i) * ts
      const tile = w.tiles[i]
      if ((tx(i) + ty(i)) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)'
        ctx.fillRect(x, y, ts, ts)
      }
      if (tile.kind === 'water') {
        ctx.fillStyle = '#38bdf8'
        ctx.fillRect(x, y, ts + 0.5, ts + 0.5)
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 1.2
        const k = Math.sin(t * 2 + i) * ts * 0.08
        ctx.beginPath()
        ctx.moveTo(x + ts * 0.2 + k, y + ts * 0.4)
        ctx.lineTo(x + ts * 0.45 + k, y + ts * 0.4)
        ctx.moveTo(x + ts * 0.55 - k, y + ts * 0.7)
        ctx.lineTo(x + ts * 0.8 - k, y + ts * 0.7)
        ctx.stroke()
      } else if (tile.kind === 'hill') {
        ctx.fillStyle = '#84a35a'
        ctx.fillRect(x, y, ts, ts)
        ctx.fillStyle = '#78716c'
        ctx.beginPath()
        ctx.moveTo(x + ts * 0.1, y + ts * 0.85)
        ctx.lineTo(x + ts * 0.45, y + ts * 0.2)
        ctx.lineTo(x + ts * 0.8, y + ts * 0.85)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#f5f5f4'
        ctx.beginPath()
        ctx.moveTo(x + ts * 0.36, y + ts * 0.37)
        ctx.lineTo(x + ts * 0.45, y + ts * 0.2)
        ctx.lineTo(x + ts * 0.54, y + ts * 0.37)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#57534e'
        ctx.beginPath()
        ctx.moveTo(x + ts * 0.5, y + ts * 0.9)
        ctx.lineTo(x + ts * 0.72, y + ts * 0.5)
        ctx.lineTo(x + ts * 0.95, y + ts * 0.9)
        ctx.closePath()
        ctx.fill()
      } else if (tile.tree && !tile.road && tile.b < 0) {
        ctx.fillStyle = '#4d7c0f'
        ctx.beginPath()
        ctx.arc(x + ts * 0.35, y + ts * 0.45, ts * 0.17, 0, Math.PI * 2)
        ctx.arc(x + ts * 0.6, y + ts * 0.6, ts * 0.14, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#65a30d'
        ctx.beginPath()
        ctx.arc(x + ts * 0.31, y + ts * 0.4, ts * 0.08, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // roads: connections to neighbours
    const rw = ts * 0.5
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < COLS * ROWS; i++) {
        const tile = w.tiles[i]
        if (!tile.road) continue
        const c = center(i)
        const col = pass === 0 ? (tile.kind === 'water' ? '#a16207' : '#1f2937') : tile.road === 2 ? '#1e3a8a' : '#64748b'
        const width = pass === 0 ? rw + 4 : rw
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.arc(c.x, c.y, width / 2, 0, Math.PI * 2)
        ctx.fill()
        for (const n of neighbors(i)) {
          const nt = w.tiles[n]
          if (!nt.road && nt.b < 0) continue
          const d = center(n)
          const mx = (c.x + d.x) / 2
          const my = (c.y + d.y) / 2
          if (c.x === d.x) ctx.fillRect(c.x - width / 2, Math.min(c.y, my), width, Math.abs(my - c.y))
          else ctx.fillRect(Math.min(c.x, mx), c.y - width / 2, Math.abs(mx - c.x), width)
        }
        if (pass === 1) {
          if (tile.round) {
            ctx.fillStyle = '#4ade80'
            ctx.beginPath()
            ctx.arc(c.x, c.y, rw * 0.28, 0, Math.PI * 2)
            ctx.fill()
          } else if (tile.road === 2) {
            ctx.strokeStyle = 'rgba(255,255,255,0.7)'
            ctx.lineWidth = 1
            ctx.setLineDash([3, 3])
            ctx.beginPath()
            ctx.arc(c.x, c.y, rw * 0.2, 0, Math.PI * 2)
            ctx.stroke()
            ctx.setLineDash([])
          }
        }
      }
    }
    // buildings
    for (const b of w.buildings) {
      const c = center(idx(b.x, b.y))
      const age = w.t - b.born
      const pop = age < 0.4 ? Math.sin((age / 0.4) * Math.PI) : 0
      if (b.kind === 'house') {
        drawHouse(ctx, c.x, c.y, ts, b.color, pop)
        for (let k = 0; k < b.idle && k < 3; k++) {
          ctx.fillStyle = COLORS[b.color]
          ctx.fillRect(c.x - ts * 0.38 + k * ts * 0.14, c.y + ts * 0.36, ts * 0.1, ts * 0.06)
        }
      } else drawWork(ctx, w, b, c.x, c.y, ts * (1 + pop * 0.1), t)
    }
    // cars
    for (const car of w.cars) {
      if (car.path.length < 2) continue
      const a = center(car.path[car.i])
      const bIdx = car.path[Math.min(car.i + 1, car.path.length - 1)]
      const b = center(bIdx)
      const k = Math.min(1, car.k)
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      const nx = -dy / len
      const ny = dx / len
      const lane = ts * 0.11
      const x = a.x + dx * k + nx * lane
      const y = a.y + dy * k + ny * lane
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(Math.atan2(dy, dx))
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillRect(-ts * 0.15 + 1, -ts * 0.08 + 2, ts * 0.3, ts * 0.16)
      ctx.fillStyle = COLORS[car.color]
      ctx.beginPath()
      ctx.roundRect(-ts * 0.15, -ts * 0.08, ts * 0.3, ts * 0.16, 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillRect(ts * 0.02, -ts * 0.055, ts * 0.06, ts * 0.11)
      ctx.fillStyle = '#fef08a'
      ctx.fillRect(ts * 0.13, -ts * 0.07, ts * 0.025, ts * 0.04)
      ctx.fillRect(ts * 0.13, ts * 0.03, ts * 0.025, ts * 0.04)
      ctx.restore()
    }
    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const tools: { id: Tool; label: string; n: number | null }[] = [
    { id: 'road', label: 'Road', n: hud.roads },
    { id: 'motorway', label: 'Motorway', n: hud.motorway },
    { id: 'roundabout', label: 'Roundabout', n: hud.rounds },
    { id: 'erase', label: 'Erase', n: null },
  ]
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div ref={arenaRef} className="action-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.trips}</div>
                <div className="action-hud__small">trips</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">
                  Week {hud.week} · {hud.bridges} bridges
                </span>
                <div className="roads-week">
                  <span style={{ width: `${hud.prog * 100}%` }} />
                </div>
              </div>
            </div>
          )}
          {(phase === 'play' || phase === 'pick') && (
            <div className="roads-bar" onPointerDown={(e) => e.stopPropagation()}>
              {tools.map((tl) =>
                tl.id !== 'road' && tl.id !== 'erase' && !tl.n ? null : (
                  <button key={tl.id} type="button" className={`roads-tool${hud.tool === tl.id ? ' is-on' : ''}`} onClick={() => setTool(tl.id)}>
                    <OfferIcon id={tl.id} />
                    {tl.label}
                    {tl.n != null ? <b>{tl.n}</b> : null}
                  </button>
                ),
              )}
            </div>
          )}
          {banner && phase !== 'idle' && phase !== 'over' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'pick' && (
            <div className="roads-pick" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Week {hud.week}</h3>
              <p>The town is growing. Pick an upgrade</p>
              <div className="roads-pick__list">
                {offers.map((o) => (
                  <button key={o.id} type="button" className="roads-pick__card" onClick={() => choose(o)}>
                    <OfferIcon id={o.id} />
                    <strong>{o.label}</strong>
                    <span>{o.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === 'idle' && (
            <ActionIdle
              game="roads"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to draw roads linking each house to the workplace of its colour. Don't let a workplace wait too long."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.week >= 4 ? 'Traffic tamer!' : 'Gridlock'}
            subtitle={`${hud.trips} trips · Week ${hud.week}`}
            celebrate={hud.week >= 4}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
