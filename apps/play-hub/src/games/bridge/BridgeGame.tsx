import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, glow } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { drawBeam, drawJoint, drawVehicle, star, wrench } from './art'
import {
  FRAME,
  MATS,
  buildSim,
  makeVehicle,
  stepSim,
  stressOf,
  type BuildBeam,
  type BuildNode,
  type Mat,
  type Seg,
  type Sim,
} from './physics'
import '../../shared/action/action.css'
import './bridge.css'
import { GRID, TOP_Y, WATER, WORLD_W, buildDesign, levelFor, recipeFor, type Level } from './levels'

const meta = getGame('bridge')

type Phase = 'idle' | 'build' | 'test' | 'pick' | 'dying' | 'over'

const WORLD_H = 600

type Build = { nodes: BuildNode[]; beams: BuildBeam[] }

type PerkId = 'cash' | 'bolts' | 'retry' | 'cheap'
type Perk = { id: PerkId; label: string; blurb: string }
const PERKS: Perk[] = [
  { id: 'cash', label: 'City Grant', blurb: '+25% budget for the next 3 bridges' },
  { id: 'bolts', label: 'Heavy Bolts', blurb: 'Beams 20% stronger for 3 bridges' },
  { id: 'retry', label: 'Spare Crew', blurb: '+1 retry' },
  { id: 'cheap', label: 'Bulk Discount', blurb: 'Materials 15% cheaper for 3 bridges' },
]

function freshBuild(l: Level): Build {
  return { nodes: l.anchors.map((a) => ({ x: a.x, y: a.y, anchor: true })), beams: [] }
}

/** Tutorial ghost: the level's verified design. */
function ghostBeams(l: Level): [number, number, number, number, Mat][] {
  const r = recipeFor(l.n)
  if (!r) return []
  const d = buildDesign(l, r)
  return d.beams.map((bm) => [d.nodes[bm.a].x, d.nodes[bm.a].y, d.nodes[bm.b].x, d.nodes[bm.b].y, bm.mat])
}

type World = {
  n: number
  lvl: Level
  build: Build
  undo: Build[]
  mat: Mat
  sim: Sim | null
  acc: number
  retries: number
  score: number
  stars: number
  cleared: number
  streak: number
  fails: number
  perks: { cash: number; bolts: number; cheap: number }
  winT: number
  lastStars: number
  resultT: number
  creakT: number
  drag: null | { from: number; x: number; y: number; ok: boolean; px: number; py: number }
  press: null | { x: number; y: number; beam: number; moved: boolean }
  stats: { level: number; stars: number; bridges: number; threestar: number; flawless: number }
}

function freshWorld(): World {
  const lvl = levelFor(1, 1)
  return {
    n: 1,
    lvl,
    build: freshBuild(lvl),
    undo: [],
    mat: 'road',
    sim: null,
    acc: 0,
    retries: 3,
    score: 0,
    stars: 0,
    cleared: 0,
    streak: 0,
    fails: 0,
    perks: { cash: 0, bolts: 0, cheap: 0 },
    winT: 0,
    lastStars: 0,
    resultT: 0,
    creakT: 0,
    drag: null,
    press: null,
    stats: { level: 1, stars: 0, bridges: 0, threestar: 0, flawless: 0 },
  }
}

function PerkIcon({ id }: { id: PerkId }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="rgba(0,0,0,0.25)" />
      {id === 'cash' && (
        <g>
          <rect x="8" y="13" width="24" height="14" rx="2" fill="#22c55e" />
          <circle cx="20" cy="20" r="4" fill="#bbf7d0" />
        </g>
      )}
      {id === 'bolts' && (
        <g fill="#cbd5e1">
          <polygon points="20,8 30,14 30,26 20,32 10,26 10,14" />
          <circle cx="20" cy="20" r="4.5" fill="#475569" />
        </g>
      )}
      {id === 'retry' && (
        <g fill="#fbbf24" transform="rotate(-40 20 20)">
          <rect x="18" y="16" width="4" height="16" />
          <circle cx="20" cy="13" r="6" />
          <rect x="18" y="6" width="4" height="6" fill="#78350f" />
        </g>
      )}
      {id === 'cheap' && <path d="M10 12 H24 L31 20 L24 28 H10 Z" fill="#f472b6" />}
    </svg>
  )
}

export default function BridgeGame() {
  const run = useActionRun('bridge')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const fx = useRef(new Fx()).current
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const view = useRef({ s: 1, offX: 0, offY: 0 })
  const lastEvent = useRef(0)
  const demo = useRef<{ build: Build; lvl: Level; sim: Sim | null; acc: number; t: number }>({ build: { nodes: [], beams: [] }, lvl: levelFor(1, 1), sim: null, acc: 0, t: 0 })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ n: 1, score: 0, left: 0, budget: 1, retries: 3, mat: 'road' as Mat, stars: 0, canUndo: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [choices, setChoices] = useState<Perk[]>([])

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function say(text: string, sub?: string) {
    setBanner({ key: performance.now(), text, sub })
  }

  // ── Economy ──────────────────────────────────────────
  function costMul(w: World) {
    return w.perks.cheap > 0 ? 0.85 : 1
  }
  function budgetOf(w: World) {
    return Math.round(w.lvl.budget * (w.perks.cash > 0 ? 1.25 : 1))
  }
  function beamCost(w: World, ax: number, ay: number, bx: number, by: number, mat: Mat) {
    return Math.round(Math.hypot(bx - ax, by - ay) * MATS[mat].cost * costMul(w))
  }
  function spent(w: World) {
    let s = 0
    for (const b of w.build.beams) {
      const A = w.build.nodes[b.a]
      const B = w.build.nodes[b.b]
      s += beamCost(w, A.x, A.y, B.x, B.y, b.mat)
    }
    return s
  }

  function pushHud() {
    const w = world.current
    const budget = budgetOf(w)
    setHud({ n: w.n, score: w.score, left: budget - spent(w), budget, retries: w.retries, mat: w.mat, stars: w.stars, canUndo: w.undo.length > 0 })
  }

  // ── Geometry helpers ─────────────────────────────────
  function rockAt(l: Level, x: number, y: number) {
    if (x < l.x0 - 0.5 && y > l.yL + 0.5) return true
    if (x > l.x1 + 0.5 && y > l.yR + 0.5) return true
    if (l.pillar && Math.abs(x - l.pillar.x) < 11 && y > l.pillar.top + 0.5) return true
    return y > WATER - 6
  }
  function laneAt(l: Level, x: number, y: number) {
    return !!l.lane && x > l.lane.x0 && x < l.lane.x1 && y > l.lane.y0
  }
  function pointOk(l: Level, x: number, y: number) {
    return x >= -0.5 && x <= WORLD_W + 0.5 && y >= TOP_Y && !rockAt(l, x, y) && !laneAt(l, x, y)
  }
  function segOk(l: Level, ax: number, ay: number, bx: number, by: number) {
    for (let k = 1; k < 10; k++) {
      const x = ax + ((bx - ax) * k) / 10
      const y = ay + ((by - ay) * k) / 10
      if (rockAt(l, x, y) || laneAt(l, x, y)) return false
    }
    return true
  }
  function nodeAt(b: Build, x: number, y: number) {
    return b.nodes.findIndex((n) => Math.abs(n.x - x) < 0.5 && Math.abs(n.y - y) < 0.5)
  }
  function ground(l: Level): Seg[] {
    return [
      { ax: -600, ay: l.yL, bx: l.x0, by: l.yL },
      { ax: l.x1, ay: l.yR, bx: 900, by: l.yR },
    ]
  }

  function toWorld(e: { clientX: number; clientY: number }) {
    const el = arenaRef.current
    if (!el) return { x: 0, y: 0 }
    const p = localPoint(e, el)
    const { s, offX, offY } = view.current
    return { x: p.x / s - offX, y: p.y / s - offY }
  }

  /** Snap a drag target to the best reachable grid point. */
  function snapTarget(w: World, from: BuildNode, wx: number, wy: number) {
    const maxLen = MATS[w.mat].maxLen
    let tx = wx
    let ty = wy
    const d = Math.hypot(wx - from.x, wy - from.y)
    if (d > maxLen) {
      tx = from.x + ((wx - from.x) / d) * maxLen
      ty = from.y + ((wy - from.y) / d) * maxLen
    }
    let best = { x: from.x, y: from.y }
    let bd = Infinity
    const gx = Math.round(tx / GRID)
    const gy = Math.round(ty / GRID)
    for (let i = gx - 1; i <= gx + 1; i++) {
      for (let j = gy - 1; j <= gy + 1; j++) {
        const x = i * GRID
        const y = j * GRID
        if (Math.hypot(x - from.x, y - from.y) > maxLen + 0.5) continue
        const dd = Math.hypot(x - tx, y - ty)
        if (dd < bd) {
          bd = dd
          best = { x, y }
        }
      }
    }
    return best
  }

  function dragValid(w: World, from: number, x: number, y: number) {
    const b = w.build
    const A = b.nodes[from]
    if (A.x === x && A.y === y) return false
    const ti = nodeAt(b, x, y)
    if (ti < 0 && !pointOk(w.lvl, x, y)) return false
    if (!segOk(w.lvl, A.x, A.y, x, y)) return false
    if (ti >= 0 && b.beams.some((bm) => (bm.a === from && bm.b === ti) || (bm.b === from && bm.a === ti))) return false
    const cost = beamCost(w, A.x, A.y, x, y, w.mat)
    return cost <= budgetOf(w) - spent(w)
  }

  // ── Run lifecycle ────────────────────────────────────
  function strengthMul(w: World) {
    return (1 + run.level('strong') * 0.06) * (w.perks.bolts > 0 ? 1.2 : 1)
  }

  function loadLevel(w: World, n: number) {
    w.n = n
    w.lvl = levelFor(n, 1 + run.level('budget') * 0.06)
    w.build = freshBuild(w.lvl)
    w.undo = []
    w.sim = null
    w.mat = 'road'
    w.stats.level = n
    const l = w.lvl
    const notes: string[] = []
    if (l.vehicles.length > 1) notes.push('convoy')
    else if (l.vehicles[0] !== 'car') notes.push(`${l.vehicles[0]} incoming`)
    if (l.wind) notes.push('strong wind')
    if (l.lane) notes.push('keep the ship lane clear')
    if (l.pillar) notes.push('use the pillar')
    const boss = n % 5 === 0
    const sub = [l.name, l.hint ?? notes.join(' · ')].filter(Boolean).join(' · ')
    say(boss ? `BOSS · LEVEL ${n}` : `LEVEL ${n}`, sub || undefined)
    sfx.ready()
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.retries = 3 + run.level('retry')
    world.current = w
    fx.reset()
    run.begin()
    loadLevel(w, Math.max(1, level))
    setPhaseBoth('build')
    pushHud()
    run.update(w.stats)
  }

  function snapshot(b: Build): Build {
    return { nodes: b.nodes.map((n) => ({ ...n })), beams: b.beams.map((bm) => ({ ...bm })) }
  }

  function addBeam(w: World, from: number, x: number, y: number) {
    const b = w.build
    w.undo.push(snapshot(b))
    if (w.undo.length > 60) w.undo.shift()
    let ti = nodeAt(b, x, y)
    if (ti < 0) {
      b.nodes.push({ x, y, anchor: false })
      ti = b.nodes.length - 1
    }
    b.beams.push({ a: from, b: ti, mat: w.mat })
    const A = b.nodes[from]
    const cost = beamCost(w, A.x, A.y, x, y, w.mat)
    const col = MATS[w.mat].color
    fx.burst(x, y, { count: 8, color: [col, '#ffffff', '#e7e5e4'], speed: 110, size: 3, gravity: 200 })
    fx.burst((A.x + x) / 2, (A.y + y) / 2, { count: 5, color: ['#fde047', '#ffffff'], speed: 60, size: 2, shape: 'spark', gravity: 0 })
    fx.ring(x, y, { color: '#fde047', maxR: 14, life: 0.25, width: 2 })
    fx.text((A.x + x) / 2, (A.y + y) / 2 - 12, `-$${cost}`, '#fecaca', 12)
    sfx.thud()
    haptic.light()
    pushHud()
  }

  function removeBeam(w: World, i: number) {
    const b = w.build
    w.undo.push(snapshot(b))
    const bm = b.beams[i]
    const A = b.nodes[bm.a]
    const B = b.nodes[bm.b]
    fx.burst((A.x + B.x) / 2, (A.y + B.y) / 2, { count: 10, color: [MATS[bm.mat].color, MATS[bm.mat].dark], speed: 120, shape: 'square', size: 3, gravity: 500 })
    b.beams.splice(i, 1)
    pruneNodes(b)
    sfx.pop()
    haptic.light()
    pushHud()
  }

  function pruneNodes(b: Build) {
    for (let i = b.nodes.length - 1; i >= 0; i--) {
      if (b.nodes[i].anchor) continue
      if (b.beams.some((bm) => bm.a === i || bm.b === i)) continue
      b.nodes.splice(i, 1)
      for (const bm of b.beams) {
        if (bm.a > i) bm.a -= 1
        if (bm.b > i) bm.b -= 1
      }
    }
  }

  function undo() {
    const w = world.current
    if (phaseRef.current !== 'build') return
    const prev = w.undo.pop()
    if (!prev) return
    w.build = prev
    sfx.move()
    pushHud()
  }

  function pickMat(m: Mat) {
    world.current.mat = m
    sfx.tap()
    pushHud()
  }

  function makeVehicles(l: Level) {
    return l.vehicles.map((k, i) => makeVehicle(k, l.x0 - 62 - i * 64, l.yL, 0.6 + i * 1.1))
  }

  function go() {
    const w = world.current
    if (phaseRef.current === 'test' && !w.sim?.result) {
      // Stop the test and go back to building
      w.sim = null
      setPhaseBoth('build')
      sfx.move()
      return
    }
    if (phaseRef.current !== 'build') return
    if (!w.build.beams.some((b) => b.mat === 'road')) {
      say('NO ROAD!', 'build road beams for the wheels')
      sfx.miss()
      return
    }
    const l = w.lvl
    w.sim = buildSim(w.build.nodes, w.build.beams, ground(l), makeVehicles(l), { wind: l.wind, waterY: WATER, finishX: l.x1 + 46, strengthMul: strengthMul(w) })
    w.acc = 0
    w.resultT = 0
    setPhaseBoth('test')
    sfx.whoosh()
    haptic.medium()
  }

  function onWin(w: World) {
    const budget = budgetOf(w)
    const left = budget - spent(w)
    const frac = left / budget
    const stars = frac >= 0.3 ? 3 : frac >= 0.12 ? 2 : 1
    w.lastStars = stars
    w.winT = 0
    w.stars += stars
    w.cleared += 1
    w.streak += 1
    const gain = 100 + w.n * 20 + stars * 50 + Math.floor(left / 10)
    w.score += gain
    w.stats.stars += stars
    w.stats.bridges += 1
    if (stars === 3) w.stats.threestar += 1
    w.stats.flawless = Math.max(w.stats.flawless, w.streak)
    const saved = run.completeLevel(w.n, stars)
    run.update({ ...w.stats, score: w.score })
    const l = w.lvl
    fx.burst(l.x1 + 46, l.yR - 30, { count: 40, color: ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#ffffff'], speed: 320, shape: 'square', size: 4, gravity: 400 })
    fx.text((l.x0 + l.x1) / 2, Math.min(l.yL, l.yR) - 70, `+${gain}`, '#fde047', 24)
    sfx.win()
    haptic.success()
    say(stars === 3 ? 'PERFECT BUILD!' : 'BRIDGE OPEN!', `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}${saved.improved && !saved.firstClear ? ' · new best' : ''}`)
    for (const k of ['cash', 'bolts', 'cheap'] as const) if (w.perks[k] > 0) w.perks[k] -= 1
    if (saved.firstClear && w.n % 5 === 0) {
      const now = performance.now()
      if (now - lastEvent.current > 30000) {
        lastEvent.current = now
        void trackEvent('action_milestone', { game_id: 'bridge', kind: 'level', value: w.n })
      }
    }
    pushHud()
    window.setTimeout(() => {
      if (phaseRef.current !== 'test' || world.current !== w) return
      if (w.n % 4 === 0) {
        setChoices([...PERKS].sort(() => Math.random() - 0.5).slice(0, 3))
        setPhaseBoth('pick')
      } else nextLevel()
    }, 2600)
  }

  function nextLevel() {
    const w = world.current
    loadLevel(w, w.n + 1)
    setPhaseBoth('build')
    run.update({ ...w.stats, score: w.score })
    pushHud()
  }

  function choose(p: Perk) {
    const w = world.current
    if (p.id === 'retry') w.retries += 1
    else w.perks[p.id] = 3
    sfx.power()
    haptic.success()
    nextLevel()
  }

  function onFail(w: World, reason: string) {
    w.streak = 0
    w.fails += 1
    fx.slowmo(0.8, 0.35)
    fx.shake(8, 0.35)
    sfx.lose()
    haptic.error()
    const free = w.n <= 2
    if (!free) w.retries -= 1
    say(free ? 'TRY AGAIN' : w.retries > 0 ? 'COLLAPSE!' : 'NO RETRIES', reason + (free ? ' · free retry' : ''))
    pushHud()
    window.setTimeout(() => {
      if (phaseRef.current !== 'test' || world.current !== w) return
      if (w.retries <= 0) die()
      else {
        w.sim = null
        setPhaseBoth('build')
      }
    }, 1900)
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.cleared * 3 + w.stars) * 1)
      run.end({ score: w.score, cleared: w.cleared >= 5, stats: { ...w.stats }, coins }, revive)
    }, 700)
  }

  /** Ad revive: two more retries, the bridge design is kept for editing. */
  function revive() {
    const w = world.current
    w.retries = 2
    w.sim = null
    say('REVIVED!', 'fix your bridge and try again')
    pushHud()
    setPhaseBoth('build')
  }

  // ── Input ────────────────────────────────────────────
  function onDown(e: React.PointerEvent) {
    const w = world.current
    if (phaseRef.current !== 'build') return
    const p = toWorld(e)
    const b = w.build
    let best = -1
    let bd = 20
    b.nodes.forEach((n, i) => {
      const d = Math.hypot(n.x - p.x, n.y - p.y)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    if (best >= 0) {
      w.drag = { from: best, x: b.nodes[best].x, y: b.nodes[best].y, ok: false, px: p.x, py: p.y }
      sfx.tick()
      return
    }
    let beam = -1
    let bb = 10
    b.beams.forEach((bm, i) => {
      const A = b.nodes[bm.a]
      const B = b.nodes[bm.b]
      const ex = B.x - A.x
      const ey = B.y - A.y
      const t = clamp(((p.x - A.x) * ex + (p.y - A.y) * ey) / (ex * ex + ey * ey), 0, 1)
      const d = Math.hypot(A.x + ex * t - p.x, A.y + ey * t - p.y)
      if (d < bb) {
        bb = d
        beam = i
      }
    })
    w.press = { x: p.x, y: p.y, beam, moved: false }
  }

  function onMove(e: React.PointerEvent) {
    const w = world.current
    if (!w.drag && !w.press) return
    const p = toWorld(e)
    if (w.drag) {
      const from = w.build.nodes[w.drag.from]
      const t = snapTarget(w, from, p.x, p.y)
      if (t.x !== w.drag.x || t.y !== w.drag.y) sfx.tick()
      w.drag.x = t.x
      w.drag.y = t.y
      w.drag.px = p.x
      w.drag.py = p.y
      w.drag.ok = dragValid(w, w.drag.from, t.x, t.y)
    } else if (w.press && Math.hypot(p.x - w.press.x, p.y - w.press.y) > 8) w.press.moved = true
  }

  function onUp() {
    const w = world.current
    if (w.drag) {
      const d = w.drag
      w.drag = null
      if (phaseRef.current === 'build' && dragValid(w, d.from, d.x, d.y)) addBeam(w, d.from, d.x, d.y)
      else if (d.x !== w.build.nodes[d.from]?.x || d.y !== w.build.nodes[d.from]?.y) {
        sfx.miss()
        const A = w.build.nodes[d.from]
        if (A && beamCost(w, A.x, A.y, d.x, d.y, w.mat) > budgetOf(w) - spent(w)) say('OVER BUDGET')
      }
    } else if (w.press) {
      if (!w.press.moved && w.press.beam >= 0 && phaseRef.current === 'build') removeBeam(w, w.press.beam)
      w.press = null
    }
  }

  // Dev-only bot hook: build the level's verified design and press GO.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__lv3br = {
      state: () => ({ n: world.current.n, phase: phaseRef.current, result: world.current.sim?.result ?? null }),
      solve: () => {
        const w = world.current
        if (phaseRef.current === 'pick') {
          choose(PERKS[0])
          return true
        }
        if (phaseRef.current !== 'build') return false
        const r = recipeFor(w.n)
        if (r && !w.build.beams.length) {
          w.build = buildDesign(w.lvl, r)
          pushHud()
        }
        go()
        return true
      },
    }
    return () => {
      delete win.__lv3br
    }
  })

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (phaseRef.current !== 'build' && phaseRef.current !== 'test') return
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        go()
      } else if (e.key === 'z' || e.key === 'Backspace') undo()
      else if (e.key === '1') pickMat('road')
      else if (e.key === '2') pickMat('wood')
      else if (e.key === '3') pickMat('steel')
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation tick ──────────────────────────────────
  function tickSim(sim: Sim, dt: number, w: World | null) {
    let acc = (w ? w.acc : demo.current.acc) + dt
    let steps = 0
    while (acc >= FRAME && steps < 4) {
      stepSim(sim)
      acc -= FRAME
      steps++
    }
    if (acc > FRAME) acc = 0
    if (w) w.acc = acc
    else demo.current.acc = acc
    const live = !!w
    for (const i of sim.breaks) {
      const b = sim.beams[i]
      const A = sim.nodes[b.a]
      const B = sim.nodes[b.b]
      const m = MATS[b.mat]
      const mx = (A.x + B.x) / 2
      const my = (A.y + B.y) / 2
      fx.burst(mx, my, { count: 14, color: b.mat === 'steel' ? ['#fde047', '#ffffff', '#94a3b8'] : [m.color, m.dark, '#e7e5e4'], speed: 200, shape: b.mat === 'steel' ? 'spark' : 'square', size: 3.5, gravity: 600 })
      if (live) {
        if (b.mat === 'steel') sfx.clang()
        else sfx.hit()
        fx.shake(5, 0.2)
        fx.stop(0.05)
        haptic.medium()
        fx.text(mx, my - 14, 'SNAP!', '#fca5a5', 14)
      }
    }
    sim.breaks.length = 0
    for (const s of sim.splashes) {
      fx.burst(s.x, s.y, { count: 22, color: ['#bfdbfe', '#60a5fa', '#ffffff'], speed: 260, angle: -Math.PI / 2, spread: 1.4, gravity: 700, size: 3 })
      fx.ring(s.x, s.y, { color: '#e0f2fe', maxR: 30, life: 0.5, width: 2 })
      if (live) sfx.boom(0.25)
    }
    sim.splashes.length = 0
  }

  // ── Drawing ──────────────────────────────────────────
  function drawScene(ctx: CanvasRenderingContext2D, l: Level, t: number, theme: number) {
    // far hills
    ctx.fillStyle = ['#86b98c', '#c48a6a', '#3b4b6b', '#9fb6a0'][theme]
    ctx.beginPath()
    ctx.moveTo(-200, 340)
    for (let x = -200; x <= 560; x += 40) ctx.lineTo(x, 300 - Math.sin(x * 0.02 + 1) * 30 - Math.sin(x * 0.051) * 16)
    ctx.lineTo(560, 480)
    ctx.lineTo(-200, 480)
    ctx.fill()
    // Canyon depth haze below the horizon
    const haze = ctx.createLinearGradient(0, 330, 0, WATER)
    haze.addColorStop(0, 'rgba(40,24,10,0)')
    haze.addColorStop(1, 'rgba(40,24,10,0.55)')
    ctx.fillStyle = haze
    ctx.fillRect(-300, 330, 960, WATER - 330)
    ctx.strokeStyle = 'rgba(40,24,10,0.18)'
    ctx.lineWidth = 3
    for (let k = 0; k < 5; k++) {
      ctx.beginPath()
      ctx.moveTo(-300, 380 + k * 22)
      for (let x = -300; x < 660; x += 30) ctx.lineTo(x, 380 + k * 22 + Math.sin(x * 0.04 + k) * 4)
      ctx.stroke()
    }
    // water
    const wg = ctx.createLinearGradient(0, WATER, 0, WORLD_H + 200)
    wg.addColorStop(0, ['#38bdf8', '#f59e8b', '#1e3a8a', '#5eead4'][theme])
    wg.addColorStop(1, ['#0c4a6e', '#7c2d12', '#0b1028', '#115e59'][theme])
    ctx.fillStyle = wg
    ctx.fillRect(-300, WATER, 960, 400)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1.5
    for (let r = 0; r < 4; r++) {
      ctx.beginPath()
      const y = WATER + 8 + r * 22
      for (let x = -300; x < 660; x += 12) {
        const yy = y + Math.sin(x * 0.08 + t * 2 + r) * 2
        if (x === -300) ctx.moveTo(x, yy)
        else ctx.lineTo(x, yy)
      }
      ctx.stroke()
    }
    // lane boat
    if (l.lane) {
      const bx = ((t * 18) % 520) - 80
      ctx.fillStyle = '#f8fafc'
      ctx.beginPath()
      ctx.moveTo(bx + 4, WATER - 6)
      ctx.lineTo(bx + 4, l.lane.y0 + 6)
      ctx.lineTo(bx + 30, WATER - 10)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#7c2d12'
      ctx.fillRect(bx + 3, l.lane.y0 + 4, 2, WATER - l.lane.y0 - 4)
      ctx.fillStyle = '#b91c1c'
      ctx.beginPath()
      ctx.moveTo(bx - 14, WATER - 6)
      ctx.lineTo(bx + 36, WATER - 6)
      ctx.lineTo(bx + 28, WATER + 4)
      ctx.lineTo(bx - 8, WATER + 4)
      ctx.closePath()
      ctx.fill()
    }
    // cliffs
    const cliff = (x0: number, x1: number, top: number, left: boolean) => {
      const g = ctx.createLinearGradient(0, top, 0, WORLD_H)
      g.addColorStop(0, '#a16207')
      g.addColorStop(0.3, '#78350f')
      g.addColorStop(1, '#451a03')
      ctx.fillStyle = g
      const outer = left ? x0 : x1
      const face = left ? x1 : x0
      ctx.beginPath()
      ctx.moveTo(outer, top)
      for (let y = top; y <= WORLD_H + 200; y += 20) ctx.lineTo(face + (left ? 1 : -1) * (Math.sin(y * 0.3) * 3 - 2), y)
      ctx.lineTo(outer, WORLD_H + 200)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      for (let k = 0; k < 14; k++) {
        const rx = face + (left ? -1 : 1) * (10 + ((k * 37) % 90))
        const ry = top + 24 + ((k * 53) % 170)
        ctx.beginPath()
        ctx.ellipse(rx, ry, 6 + (k % 3) * 3, 3 + (k % 2) * 2, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'
      ctx.lineWidth = 2
      for (let k = 1; k < 6; k++) {
        ctx.beginPath()
        ctx.moveTo(x0, top + k * 34)
        ctx.lineTo(x1, top + k * 34 + (left ? 6 : -6))
        ctx.stroke()
      }
      ctx.fillStyle = '#4d7c0f'
      ctx.fillRect(x0, top - 3, x1 - x0, 7)
      ctx.fillStyle = '#84cc16'
      ctx.fillRect(x0, top - 4, x1 - x0, 3)
    }
    cliff(-300, l.x0, l.yL, true)
    cliff(l.x1, 660, l.yR, false)
    // trees on the cliffs
    for (const [tx, ty] of [
      [l.x0 - 26, l.yL],
      [l.x0 - 70, l.yL],
      [l.x1 + 80, l.yR],
      [l.x1 + 120, l.yR],
    ]) {
      if (tx < -10 || tx > WORLD_W + 10) continue
      const sw = Math.sin(t * 1.5 + tx) * 1.2
      ctx.fillStyle = '#713f12'
      ctx.fillRect(tx - 2, ty - 18, 4, 16)
      ctx.fillStyle = '#15803d'
      ctx.beginPath()
      ctx.moveTo(tx + sw, ty - 44)
      ctx.lineTo(tx + 12, ty - 14)
      ctx.lineTo(tx - 12, ty - 14)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.moveTo(tx + sw, ty - 44)
      ctx.lineTo(tx + 4, ty - 22)
      ctx.lineTo(tx - 9, ty - 18)
      ctx.closePath()
      ctx.fill()
    }
    // pillar
    if (l.pillar) {
      const g = ctx.createLinearGradient(l.pillar.x - 11, 0, l.pillar.x + 11, 0)
      g.addColorStop(0, '#d1d5db')
      g.addColorStop(1, '#6b7280')
      ctx.fillStyle = g
      ctx.fillRect(l.pillar.x - 11, l.pillar.top, 22, WORLD_H + 200)
      ctx.fillStyle = '#9ca3af'
      ctx.fillRect(l.pillar.x - 14, l.pillar.top - 2, 28, 6)
    }
    // ship lane
    if (l.lane) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(l.lane.x0, l.lane.y0, l.lane.x1 - l.lane.x0, WATER - l.lane.y0)
      ctx.clip()
      ctx.fillStyle = 'rgba(239,68,68,0.12)'
      ctx.fillRect(l.lane.x0, l.lane.y0, l.lane.x1 - l.lane.x0, WATER - l.lane.y0)
      ctx.strokeStyle = 'rgba(239,68,68,0.45)'
      ctx.lineWidth = 2
      for (let k = -200; k < 200; k += 12) {
        ctx.beginPath()
        ctx.moveTo(l.lane.x0 + k, l.lane.y0)
        ctx.lineTo(l.lane.x0 + k + 120, l.lane.y0 + 120)
        ctx.stroke()
      }
      ctx.restore()
      ctx.strokeStyle = '#ef4444'
      ctx.setLineDash([6, 4])
      ctx.strokeRect(l.lane.x0, l.lane.y0, l.lane.x1 - l.lane.x0, WATER - l.lane.y0)
      ctx.setLineDash([])
    }
    // finish flag
    const fxp = l.x1 + 46
    ctx.fillStyle = '#e5e7eb'
    ctx.fillRect(fxp, l.yR - 40, 2, 40)
    const wave = Math.sin(t * 6) * 2
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(fxp + 2, l.yR - 40)
    ctx.quadraticCurveTo(fxp + 10, l.yR - 42 + wave, fxp + 18, l.yR - 38)
    ctx.lineTo(fxp + 18, l.yR - 28)
    ctx.quadraticCurveTo(fxp + 10, l.yR - 31 + wave, fxp + 2, l.yR - 28)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#111827'
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) ctx.fillRect(fxp + 2 + i * 4, l.yR - 39 + j * 3.6 + wave * 0.3, 4, 3.6)
  }

  function drawStructure(ctx: CanvasRenderingContext2D, b: Build, sim: Sim | null, hot: number) {
    const pos = (i: number) => (sim ? sim.nodes[i] : b.nodes[i])
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < b.beams.length; i++) {
        const bm = b.beams[i]
        if ((bm.mat === 'road') !== (pass === 1)) continue
        const sb = sim?.beams[i]
        if (sb?.broken) continue
        const A = pos(bm.a)
        const B = pos(bm.b)
        drawBeam(ctx, A.x, A.y, B.x, B.y, bm.mat, sb ? stressOf(sb) : null)
      }
    }
    for (let i = 0; i < b.nodes.length; i++) {
      const p = pos(i)
      drawJoint(ctx, p.x, p.y, b.nodes[i].anchor, i === hot)
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    const ph = phaseRef.current
    const w = world.current
    // Camera frames the gap so joints stay finger-sized
    const fl = ph === 'idle' ? demo.current.lvl : w.lvl
    const bx0 = fl.x0 - 78
    const bw = fl.x1 + 78 - bx0
    const by0 = Math.min(fl.yL, fl.yR) - 130
    const bh = WATER + 24 - by0
    const topPad = 64
    const botPad = 70
    const s = Math.min(W / bw, (H - topPad - botPad) / bh)
    const offX = (W / s - bw) / 2 - bx0
    const offY = topPad / s + ((H - topPad - botPad) / s - bh) / 2 - by0
    view.current = { s, offX, offY }
    const dt = ph === 'pick' ? 0 : fx.step(raw)
    if (ph === 'pick') fx.step(0)

    let lvl = w.lvl
    let build = w.build
    let sim = w.sim
    if (ph === 'idle') {
      const d = demo.current
      if (d.sim?.result) d.t += raw
      if (!d.sim || d.t > 2) {
        d.lvl = levelFor(1, 1)
        const b = freshBuild(d.lvl)
        for (const [ax, ay, bx, by, m] of ghostBeams(d.lvl)) {
          let ia = nodeAt(b, ax, ay)
          if (ia < 0) {
            b.nodes.push({ x: ax, y: ay, anchor: false })
            ia = b.nodes.length - 1
          }
          let ib = nodeAt(b, bx, by)
          if (ib < 0) {
            b.nodes.push({ x: bx, y: by, anchor: false })
            ib = b.nodes.length - 1
          }
          b.beams.push({ a: ia, b: ib, mat: m })
        }
        d.build = b
        d.sim = buildSim(b.nodes, b.beams, ground(d.lvl), makeVehicles(d.lvl), { wind: 0, waterY: WATER, finishX: d.lvl.x1 + 120, strengthMul: 1 })
        d.t = 0
      }
      if (d.sim) tickSim(d.sim, dt, null)
      lvl = d.lvl
      build = d.build
      sim = d.sim
    } else if (ph === 'test' && sim) {
      tickSim(sim, dt, w)
      // creak warning
      w.creakT -= raw
      if (w.creakT <= 0 && sim.beams.some((b) => !b.broken && stressOf(b) > 0.85)) {
        w.creakT = 0.35
        sfx.tick()
      }
      if (sim.result && w.resultT === 0) {
        w.resultT = 1
        if (sim.result === 'win') onWin(w)
        else onFail(w, sim.reason)
      }
    }
    if (w.winT < 3) w.winT += raw

    // ── Draw ──
    const theme = ph === 'idle' ? 0 : Math.floor((w.n - 1) / 5) % 4
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    const tops = ['#60a5fa', '#f97316', '#0f172a', '#a78bfa']
    const bots = ['#e0f2fe', '#fde68a', '#312e81', '#fbcfe8']
    sky.addColorStop(0, tops[theme])
    sky.addColorStop(1, bots[theme])
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)

    ctx.save()
    ctx.scale(s, s)
    ctx.translate(offX, offY)
    // sun / moon + clouds
    if (theme === 2) {
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 40; i++) ctx.fillRect((i * 83.1) % 420 - 30, (i * 41.7) % 260 - offY * 0.2, 1.4, 1.4)
      ctx.fillStyle = '#f1f5f9'
      ctx.beginPath()
      ctx.arc(290, 120, 16, 0, Math.PI * 2)
      ctx.fill()
    } else {
      glow(ctx, 290, 130, 70, theme === 1 ? '#fb923c' : '#fef9c3', 0.5)
      ctx.fillStyle = theme === 1 ? '#fdba74' : '#fef9c3'
      ctx.beginPath()
      ctx.arc(290, 130, 20, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    for (let i = 0; i < 4; i++) {
      const cx = ((t * (6 + i * 2) + i * 120) % 520) - 80
      const cy = 150 + i * 34
      ctx.beginPath()
      ctx.ellipse(cx, cy, 30, 10, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 16, cy - 7, 18, 10, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    fx.applyShake(ctx)
    drawScene(ctx, lvl, t, theme)

    // wind streaks
    if (lvl.wind && ph !== 'idle') {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      ctx.lineWidth = 1.4
      const dir = Math.sign(lvl.wind)
      for (let i = 0; i < 10; i++) {
        const y = 150 + ((i * 37.3) % 300)
        const x = ((t * 160 + i * 97) % 460) - 50
        const xx = dir > 0 ? x : WORLD_W - x
        ctx.beginPath()
        ctx.moveTo(xx, y)
        ctx.lineTo(xx - dir * 26, y)
        ctx.stroke()
      }
    }

    // grid + ghost (build mode)
    if (ph === 'build') {
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      for (let x = 0; x <= WORLD_W; x += GRID) {
        for (let y = TOP_Y; y < WATER; y += GRID) {
          if (!pointOk(lvl, x, y)) continue
          ctx.fillRect(x - 1, y - 1, 2, 2)
        }
      }
      if (w.n <= 2) {
        ctx.setLineDash([4, 5])
        ctx.lineWidth = 2
        for (const [ax, ay, bx, by, m] of ghostBeams(lvl)) {
          ctx.strokeStyle = m === 'road' ? 'rgba(254,240,138,0.75)' : 'rgba(255,255,255,0.55)'
          ctx.beginPath()
          ctx.moveTo(ax, ay)
          ctx.lineTo(bx, by)
          ctx.stroke()
        }
        ctx.setLineDash([])
      }
      // waiting vehicles
      for (const v of makeVehicles(lvl)) drawVehicle(ctx, v, 0)
    }

    drawStructure(ctx, build, sim, w.drag ? w.drag.from : -1)
    if (sim) for (const v of sim.vehicles) drawVehicle(ctx, v, t)

    // drag preview
    if (ph === 'build' && w.drag) {
      const A = build.nodes[w.drag.from]
      const m = MATS[w.mat]
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(A.x, A.y, m.maxLen, 0, Math.PI * 2)
      ctx.stroke()
      if (w.drag.x !== A.x || w.drag.y !== A.y) {
        drawBeam(ctx, A.x, A.y, w.drag.x, w.drag.y, w.mat, null, w.drag.ok ? 0.85 : 0.4)
        if (!w.drag.ok) {
          ctx.strokeStyle = '#ef4444'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(A.x, A.y)
          ctx.lineTo(w.drag.x, w.drag.y)
          ctx.stroke()
        }
        drawJoint(ctx, w.drag.x, w.drag.y, false, true)
        const cost = beamCost(w, A.x, A.y, w.drag.x, w.drag.y, w.mat)
        ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillText(`$${cost}`, w.drag.x + 1, w.drag.y - 13)
        ctx.fillStyle = w.drag.ok ? '#fde68a' : '#fca5a5'
        ctx.fillText(`$${cost}`, w.drag.x, w.drag.y - 14)
      }
    }

    // water surface over sunken things
    ctx.fillStyle = 'rgba(14,116,144,0.35)'
    ctx.fillRect(-300, WATER + 2, 960, 300)

    fx.draw(ctx)
    ctx.restore()
    ctx.restore()

    // stars popup after a win (screen space)
    if (ph === 'test' && sim?.result === 'win') {
      for (let i = 0; i < 3; i++) {
        const k = clamp((w.winT - 0.3 - i * 0.22) * 4, 0, 1)
        if (k <= 0) continue
        const pop = k < 1 ? 1.4 - k * 0.4 : 1
        const on = i < w.lastStars
        star(ctx, W / 2 + (i - 1) * 54, H * 0.3 + (i === 1 ? -14 : 0), 22 * pop, on ? '#facc15' : 'rgba(255,255,255,0.3)')
      }
    }
    // retries
    if (ph !== 'idle') for (let i = 0; i < Math.min(6, Math.max(w.retries, 0)); i++) wrench(ctx, 22 + i * 18, 92, true)
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const left = hud.left
  const showBar = phase === 'build' || phase === 'test'
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div ref={arenaRef} className="action-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Level {hud.n} · {hud.stars} stars
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__score" style={{ fontSize: '1.3rem', color: left < hud.budget * 0.15 ? '#fca5a5' : '#fde68a' }}>
                  ${left}
                </span>
                <div className="bridge-budget">
                  <span style={{ width: `${clamp(left / hud.budget, 0, 1) * 100}%` }} />
                  <b style={{ left: '30%' }} />
                  <b style={{ left: '12%' }} />
                </div>
              </div>
            </div>
          )}
          {phase === 'build' && <div className="bridge-hint">Drag from a joint to build · tap a beam to remove</div>}
          {showBar && (
            <div className="bridge-bar" onPointerDown={(e) => e.stopPropagation()}>
              {(['road', 'wood', 'steel'] as Mat[]).map((m) => (
                <button key={m} type="button" className={`bridge-mat${hud.mat === m ? ' is-on' : ''}`} disabled={phase !== 'build'} onClick={() => pickMat(m)}>
                  <i style={{ background: MATS[m].color }} />
                  {MATS[m].label}
                  <small>${Math.round(MATS[m].cost * GRID)}/m</small>
                </button>
              ))}
              <button type="button" className="bridge-tool" aria-label="Undo" disabled={phase !== 'build' || !hud.canUndo} onClick={undo}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 7 L4 12 L9 17 M4 12 H15 A5 5 0 0 1 15 22" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" className={`bridge-go${phase === 'test' ? ' is-stop' : ''}`} onClick={go}>
                {phase === 'test' ? 'EDIT' : 'GO'}
              </button>
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
            <div className="bridge-pick" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Level {hud.n} done!</h3>
              <p>Pick a site perk</p>
              <div className="bridge-pick__list">
                {choices.map((p) => (
                  <button key={p.id} type="button" className="bridge-pick__card" onClick={() => choose(p)}>
                    <PerkIcon id={p.id} />
                    <strong>{p.label}</strong>
                    <span>{p.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === 'idle' && (
            <ActionIdle
              game="bridge"
              icon={meta.icon}
              title={meta.title}
              hint="Drag between joints to build a bridge, then press GO and watch the traffic cross."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.n > 5 ? 'Master engineer!' : 'Bridge closed'}
            subtitle={`Score ${hud.score} · Level ${hud.n} · ${hud.stars} stars`}
            celebrate={hud.n > 5}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
