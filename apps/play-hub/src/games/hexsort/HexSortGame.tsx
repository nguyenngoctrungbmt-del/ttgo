import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, glow } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { HUES, drawMark, drawSlab, hexPath } from './art'
import { levelSpec, setupLevel, type HexLevelSpec } from './levels'
import { CLEAR_AT, buildCells, deal, genStack, boardTops, hasRoom, openLocks, resolveSync, topRun, type HexCell, type Rng } from './logic'
import '../../shared/action/action.css'
import './hexsort.css'

const meta = getGame('hexsort')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type Flight = { from: number; to: number; color: number; delay: number; t: number; started: boolean }
type Clear = { cell: number; color: number; n: number; t: number; popped: number }
type RState = 'scan' | 'land' | 'cleared'

const K = 0.72
const FLIGHT = 0.24
const SQ3 = Math.sqrt(3)

type World = {
  cells: HexCell[]
  offers: (number[] | null)[]
  drag: { slot: number; x: number; y: number } | null
  hover: number
  resolving: boolean
  rstate: RState
  queue: number[]
  wait: number
  target: number
  donors: number[]
  flights: Flight[]
  clears: Clear[]
  score: number
  level: number
  spec: HexLevelSpec
  rng: Rng
  moves: number
  usedHelp: boolean
  clearT: number
  prog: number
  goal: number
  colors: number
  combo: number
  hammers: number
  refreshes: number
  hammerMode: boolean
  noRoom: boolean
  refills: number
  clock: number
  coins: number
  idleT: number
  stats: { score: number; level: number; tiles: number; stacks: number; combo: number; biggest: number; levels: number; bosses: number }
}

function freshWorld(): World {
  const spec = levelSpec(9)
  return {
    cells: buildCells(),
    offers: [null, null, null],
    drag: null,
    hover: -1,
    resolving: false,
    rstate: 'scan',
    queue: [],
    wait: 0,
    target: -1,
    donors: [],
    flights: [],
    clears: [],
    score: 0,
    level: 1,
    spec,
    rng: { s: 1 },
    moves: 0,
    usedHelp: false,
    clearT: 0,
    prog: 0,
    goal: spec.goal,
    colors: spec.colors,
    combo: 0,
    hammers: 1,
    refreshes: 1,
    hammerMode: false,
    noRoom: false,
    refills: 0,
    clock: 0,
    coins: 0,
    idleT: 0.5,
    stats: { score: 0, level: 1, tiles: 0, stacks: 0, combo: 0, biggest: 0, levels: 0, bosses: 0 },
  }
}

const slabCache = new Map<string, HTMLCanvasElement>()
function slabSprite(color: number, s: number, th: number) {
  const key = `${color}|${s.toFixed(1)}|${th.toFixed(1)}`
  const hit = slabCache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const w = s * 2 + 4
  const h = s * 2 * K + th + 4
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * dpr)
  c.height = Math.ceil(h * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate(s + 2, s * K + 2)
  drawSlab(g, HUES[color], s, K, th)
  slabCache.set(key, c)
  if (slabCache.size > 60) {
    const first = slabCache.keys().next().value
    if (first) slabCache.delete(first)
  }
  return c
}

const HammerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4l6 6-3 3-6-6zM11 7l-8 8 3 3 8-8" />
  </svg>
)
const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4" />
  </svg>
)

export default function HexSortGame() {
  const run = useActionRun('hexsort')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const pointer = useRef<number | null>(null)
  const lastEvent = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, prog: 0, goal: 40, hammers: 0, refreshes: 0, hammerMode: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.level, prog: w.prog, goal: w.goal, hammers: w.hammers, refreshes: w.refreshes, hammerMode: w.hammerMode })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const top = 96
    const tray = 118
    const s = Math.min((W - 18) / 11, (H - top - tray - 30) / (7 * SQ3 * K + 1.2))
    const th = s * 0.2
    const cx = W / 2
    const cy = top + 14 + (H - top - tray - 14) / 2
    return { W, H, s, th, cx, cy, trayY: H - 58 }
  }

  function cellXY(c: HexCell) {
    const { s, cx, cy } = geo()
    return { x: cx + s * 1.5 * c.q, y: cy + s * SQ3 * (c.r + c.q / 2) * K }
  }

  function slotXY(i: number) {
    const { W, trayY } = geo()
    return { x: W * (0.22 + i * 0.28), y: trayY }
  }

  function refill() {
    const w = world.current
    w.refills += 1
    const d = deal(w.rng, w.spec.offer, w.cells, w.refills)
    w.offers = d.offers
    if (d.bonus && phaseRef.current === 'play') {
      const { W, trayY } = geo()
      fx.text(W / 2, trayY - 60, 'BONUS STACK!', '#fde047', 16)
    }
  }

  /** Locked hexes open once enough tiles have been cleared on this level. */
  function checkLocks() {
    const w = world.current
    const opened = openLocks(w.cells, w.prog)
    for (const i of opened) {
      const c = w.cells[i]
      c.pop = 1
      if (phaseRef.current === 'play') {
        const p = cellXY(c)
        fx.burst(p.x, p.y, { count: 12, color: ['#fde047', '#ffffff', '#67e8f9'], speed: 160, gravity: 100 })
        fx.ring(p.x, p.y, { color: '#67e8f9', maxR: 30, life: 0.4 })
      }
    }
    if (opened.length && phaseRef.current === 'play') {
      sfx.power()
      setBanner({ key: Date.now() + 2, text: 'HEXES UNLOCKED', sub: `+${opened.length} space` })
    }
  }

  // ── Resolution ──────────────────────────────────
  function startResolve(idx: number) {
    const w = world.current
    w.queue = [idx]
    w.resolving = true
    w.rstate = 'scan'
    w.wait = 0.05
    w.combo = 0
  }

  function scan() {
    const w = world.current
    let guard = 0
    while (w.queue.length && guard++ < 200) {
      const xi = w.queue.shift()!
      const X = w.cells[xi]
      if (!X.stack.length) continue
      const c = X.stack[X.stack.length - 1]
      const nbrs = X.nb.filter((i) => w.cells[i].open && w.cells[i].stack.length && w.cells[i].stack[w.cells[i].stack.length - 1] === c)
      if (!nbrs.length) continue
      const cluster = [xi, ...nbrs]
      let T = xi
      for (const i of cluster) if (topRun(w.cells[i].stack) > topRun(w.cells[T].stack)) T = i
      let d = 0
      const donors = cluster.filter((i) => i !== T)
      for (const di of donors) {
        const D = w.cells[di]
        const n = topRun(D.stack)
        for (let k = 0; k < n; k++) {
          D.stack.pop()
          w.cells[T].stack.push(c)
          w.flights.push({ from: di, to: T, color: c, delay: d, t: 0, started: false })
          d += 0.05
        }
      }
      w.target = T
      w.donors = donors
      w.wait = d + FLIGHT + 0.04
      w.rstate = 'land'
      return
    }
    finishResolve()
  }

  function land() {
    const w = world.current
    const T = w.cells[w.target]
    const n = topRun(T.stack)
    if (n >= CLEAR_AT) {
      const color = T.stack[T.stack.length - 1]
      T.stack.splice(T.stack.length - n, n)
      w.clears.push({ cell: w.target, color, n, t: 0, popped: 0 })
      w.combo += 1
      if (phaseRef.current === 'play') {
        const gain = n * 10 * w.combo
        w.score += gain
        w.prog += n
        w.stats.score = w.score
        w.stats.tiles += n
        w.stats.stacks += 1
        w.stats.combo = Math.max(w.stats.combo, w.combo)
        w.stats.biggest = Math.max(w.stats.biggest, n)
        const p = cellXY(T)
        fx.text(p.x, p.y - 70, w.combo > 1 ? `+${gain} x${w.combo}` : `+${gain}`, w.combo > 1 ? '#fde047' : '#ffffff', 18 + Math.min(8, w.combo * 2))
        if (w.combo >= 2) {
          setBanner({ key: Date.now(), text: w.combo === 2 ? 'DOUBLE CLEAR!' : w.combo === 3 ? 'TRIPLE CLEAR!' : `CLEAR x${w.combo}!` })
          sfx.combo()
        }
        run.update(w.stats)
        pushHud()
      }
      w.wait = n * 0.035 + 0.3
      w.rstate = 'cleared'
    } else {
      for (const i of [w.target, ...w.donors]) w.queue.push(i)
      w.rstate = 'scan'
      w.wait = 0.02
    }
  }

  function finishResolve() {
    const w = world.current
    w.resolving = false
    const play = phaseRef.current === 'play'
    if (play) {
      checkLocks()
      if (w.prog >= w.goal) {
        levelClear()
        return
      }
    }
    if (w.offers.every((o) => !o)) refill()
    if (!hasRoom(w.cells)) {
      if (!play) resetIdle()
      else if (w.hammers > 0) {
        w.noRoom = true
        setBanner({ key: Date.now() + 3, text: 'BOARD FULL!', sub: 'smash a stack with the hammer' })
        sfx.miss()
        pushHud()
      } else die()
    }
  }

  /** Stars: clear = 1, within par moves = +1, within par and no hammer/refresh = +1 (else within 1.5× par = +1). */
  function starsFor(w: World) {
    const par = w.spec.par
    if (w.moves <= par) return w.usedHelp ? 2 : 3
    return w.moves <= Math.round(par * 1.5) ? 2 : 1
  }

  function levelClear() {
    const w = world.current
    const stars = starsFor(w)
    const res = run.completeLevel(w.level, stars)
    const bonus = (w.spec.boss ? 300 : 100) + stars * 50
    w.score += bonus
    w.stats.score = w.score
    w.stats.levels += 1
    if (w.spec.boss) w.stats.bosses += 1
    w.coins += w.spec.boss ? 6 : 2
    w.hammerMode = false
    w.drag = null
    w.clearT = 1.9
    setPhaseBoth('clear')
    setBanner({ key: Date.now() + 1, text: w.spec.boss ? 'BOSS BOARD CLEAR!' : `LEVEL ${w.level} CLEAR!`, sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${w.moves} moves · +${bonus}` })
    sfx.win()
    sfx.levelUp()
    haptic.success()
    fx.flash('#cffafe', 0.2)
    const { cx, cy } = geo()
    fx.burst(cx, cy, { count: 40, color: ['#fde047', '#ffffff', '#67e8f9', '#f472b6'], speed: 320, shape: 'spark', gravity: 120 })
    fx.ring(cx, cy, { color: '#fde047', maxR: 160, life: 0.6, width: 6 })
    if (res.firstClear && w.level % 5 === 0 && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'hexsort', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  /** Lay out level n (authored board or generated past the authored set). */
  function loadLevel(n: number, demo = false) {
    const w = world.current
    const spec = levelSpec(n)
    w.spec = spec
    w.level = n
    w.cells = buildCells()
    setupLevel(w.cells, spec, demo ? 0 : run.level('space'))
    w.rng = { s: demo ? Math.floor(Math.random() * 1e9) : spec.seed >>> 0 }
    w.refills = 0
    w.offers = [null, null, null]
    w.prog = 0
    w.goal = spec.goal
    w.colors = spec.colors
    w.moves = 0
    w.usedHelp = false
    w.noRoom = false
    w.hammerMode = false
    w.queue = []
    w.flights = []
    w.clears = []
    w.resolving = false
    if (!demo) {
      w.hammers = Math.max(w.hammers, 1 + run.level('hammer'))
      w.refreshes = Math.max(w.refreshes, 1)
      w.stats.level = Math.max(w.stats.level, n)
    }
    for (const c of w.cells) if (c.open) c.pop = 0.6
    refill()
  }

  // ── Actions ─────────────────────────────────────
  function place(slot: number, ci: number) {
    const w = world.current
    const st = w.offers[slot]
    const cell = w.cells[ci]
    if (!st || !cell || !cell.open || cell.stack.length) return false
    cell.stack = [...st]
    cell.pop = 1
    w.offers[slot] = null
    if (phaseRef.current === 'play') w.moves += 1
    const p = cellXY(cell)
    fx.burst(p.x, p.y, { count: 8, color: ['#ffffff', '#a5f3fc'], speed: 110, gravity: 200, size: 2 })
    if (phaseRef.current === 'play') {
      sfx.thud()
      haptic.light()
    }
    startResolve(ci)
    return true
  }

  function toggleHammer() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.resolving) return
    if (w.hammerMode) w.hammerMode = false
    else if (w.hammers > 0) w.hammerMode = true
    sfx.tap()
    pushHud()
  }

  function hammerAt(ci: number) {
    const w = world.current
    const cell = w.cells[ci]
    if (!cell.stack.length) return
    const p = cellXY(cell)
    const { th } = geo()
    cell.stack.forEach((c, i) => fx.burst(p.x, p.y - i * th, { count: 3, color: [HUES[c].top, HUES[c].side], speed: 220, shape: 'square', size: 5, gravity: 700 }))
    cell.stack = []
    w.hammers -= 1
    w.usedHelp = true
    w.hammerMode = false
    w.noRoom = false
    fx.ring(p.x, p.y, { color: '#fdba74', maxR: 50, life: 0.35 })
    fx.text(p.x, p.y - 40, 'SMASH!', '#fdba74', 20)
    fx.shake(6, 0.2)
    fx.stop(0.06)
    sfx.clang()
    haptic.heavy()
    pushHud()
  }

  function refreshOffers() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.refreshes <= 0 || w.resolving) return
    w.refreshes -= 1
    w.usedHelp = true
    const tops = boardTops(w.cells)
    w.offers = [genStack(w.rng, w.spec.offer, tops), genStack(w.rng, w.spec.offer, tops), genStack(w.rng, w.spec.offer, tops)]
    sfx.whoosh()
    sfx.flip()
    haptic.light()
    pushHud()
  }

  // ── Lifecycle ───────────────────────────────────
  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.hammers = 1 + run.level('hammer')
    world.current = w
    loadLevel(Math.max(1, level))
    fx.reset()
    slabCache.clear()
    run.begin()
    setPhaseBoth('play')
    announce()
    sfx.ready()
    pushHud()
  }

  function announce() {
    const w = world.current
    const sp = w.spec
    const what = sp.hint ?? `clear ${sp.goal} tiles · ${sp.colors} colours`
    setBanner({ key: Date.now(), text: sp.boss ? `BOSS · ${sp.name}` : `LEVEL ${sp.n} · ${sp.name}`, sub: what })
  }

  function nextLevel() {
    const w = world.current
    loadLevel(w.level + 1)
    setPhaseBoth('play')
    announce()
    sfx.ready()
    pushHud()
  }

  function resetIdle() {
    loadLevel(9, true)
  }

  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    w.hammerMode = false
    w.drag = null
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(10, 0.45)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    const { W, cy } = geo()
    fx.text(W / 2, cy, 'BOARD FULL!', '#fecaca', 26)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.score / 250 + w.stats.levels * 3 + w.coins) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.stats.levels >= 1, stats: { ...w.stats }, coins }, revive)
      pushHud()
    }, 1200)
  }

  /** Revive: clear the messiest stacks (most colour changes) and hand back a hammer. */
  function revive() {
    const w = world.current
    const { th } = geo()
    const segs = (s: number[]) => s.reduce((n, c, i) => n + (i && s[i - 1] !== c ? 1 : 0), 1)
    const filled = w.cells.filter((c) => c.stack.length).sort((a, b) => segs(b.stack) - segs(a.stack) || b.stack.length - a.stack.length)
    const n = Math.max(6, Math.ceil(filled.length * 0.4))
    for (const c of filled.slice(0, n)) {
      const p = cellXY(c)
      c.stack.forEach((col, i) => i % 2 === 0 && fx.burst(p.x, p.y - i * th, { count: 3, color: [HUES[col].top], speed: 160, gravity: 300 }))
      c.stack = []
    }
    w.hammers += 1
    w.noRoom = false
    w.resolving = false
    w.flights = []
    if (w.offers.every((o) => !o)) refill()
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'messy stacks cleared · +1 hammer' })
    setPhaseBoth('play')
    pushHud()
  }

  // ── Input ───────────────────────────────────────
  function nearestCell(x: number, y: number, empty: boolean) {
    const w = world.current
    const { s } = geo()
    let best = -1
    let bd = s * 1.1
    w.cells.forEach((c, i) => {
      if (!c.open || (empty && c.stack.length)) return
      const p = cellXY(c)
      const d = Math.hypot(p.x - x, (p.y - y) / K)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    return best
  }

  const LIFT = 64

  function onDown(e: PointerEvent<HTMLDivElement>) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    if (w.hammerMode) {
      const ci = nearestCell(p.x, p.y, false)
      if (ci >= 0) hammerAt(ci)
      return
    }
    for (let i = 0; i < 3; i++) {
      if (!w.offers[i]) continue
      const sp = slotXY(i)
      if (Math.abs(p.x - sp.x) < 50 && Math.abs(p.y - (sp.y - 20)) < 60) {
        e.currentTarget.setPointerCapture(e.pointerId)
        pointer.current = e.pointerId
        w.drag = { slot: i, x: p.x, y: p.y }
        sfx.tap()
        haptic.light()
        return
      }
    }
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId) return
    const w = world.current
    if (!w.drag) return
    const p = localPoint(e, e.currentTarget)
    w.drag.x = p.x
    w.drag.y = p.y
    const h = nearestCell(p.x, p.y - LIFT, true)
    if (h !== w.hover && h >= 0) sfx.tick()
    w.hover = h
  }

  function onUp(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId) return
    pointer.current = null
    const w = world.current
    if (!w.drag) return
    const ci = w.hover
    const slot = w.drag.slot
    w.drag = null
    w.hover = -1
    if (ci >= 0 && !w.resolving) place(slot, ci)
    else sfx.move()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'h') toggleHammer()
      else if (e.key === 'r') refreshOffers()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Tick ────────────────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    const { th } = geo()
    let idx = 0
    for (const f of w.flights) {
      if (f.delay > 0) {
        f.delay -= dt
        continue
      }
      if (!f.started) {
        f.started = true
        if (ph === 'play') sfx.score(Math.min(10, idx))
      }
      idx++
      f.t += dt / FLIGHT
      if (f.t >= 1) {
        const tc = w.cells[f.to]
        tc.pop = Math.max(tc.pop, 0.35)
      }
    }
    if (w.flights.length) w.flights = w.flights.filter((f) => f.t < 1)
    for (const c of w.clears) {
      c.t += dt
      const target = Math.min(c.n, Math.floor(c.t / 0.035))
      const cell = w.cells[c.cell]
      const p = cellXY(cell)
      while (c.popped < target) {
        c.popped++
        const y = p.y - (cell.stack.length + c.n - c.popped) * th
        fx.burst(p.x, y, { count: 5, color: [HUES[c.color].top, HUES[c.color].mark, '#ffffff'], speed: 200, gravity: 250, size: 3 })
        if (c.popped % 3 === 0 && ph === 'play') sfx.pop()
        if (c.popped === c.n) {
          fx.ring(p.x, p.y - cell.stack.length * th, { color: HUES[c.color].top, maxR: 70, life: 0.45, width: 5 })
          fx.burst(p.x, p.y - cell.stack.length * th, { count: 24, color: [HUES[c.color].top, '#ffffff'], speed: 320, shape: 'spark', gravity: 80 })
          if (ph === 'play') {
            fx.shake(4 + Math.min(6, c.n - 10), 0.2)
            fx.stop(0.05)
            sfx.boom(0.35)
            sfx.match()
            haptic.heavy()
          }
        }
      }
    }
    if (w.clears.length) w.clears = w.clears.filter((c) => c.t < c.n * 0.035 + 0.35)
    for (const c of w.cells) c.pop = Math.max(0, c.pop - raw * 3)

    if (w.resolving && dt > 0) {
      w.wait -= dt
      if (w.wait <= 0) {
        if (w.rstate === 'scan') scan()
        else if (w.rstate === 'land') land()
        else {
          const T = w.cells[w.target]
          for (const i of [w.target, ...w.donors, ...T.nb]) w.queue.push(i)
          w.rstate = 'scan'
          w.wait = 0.02
        }
      }
    }

    if (ph === 'play') w.clock += dt
    else if (ph === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0 && !w.flights.length && !w.clears.length) nextLevel()
    }
    else if (ph === 'idle') {
      if (!w.cells.some((c) => c.open)) resetIdle()
      w.idleT -= raw
      if (w.idleT <= 0 && !w.resolving) {
        w.idleT = 1.1
        const slot = w.offers.findIndex((o) => o)
        const free = w.cells.map((c, i) => (c.open && !c.stack.length ? i : -1)).filter((i) => i >= 0)
        if (slot >= 0 && free.length) {
          // prefer a cell whose neighbour top matches
          const st = w.offers[slot]!
          const top = st[st.length - 1]
          const good = free.filter((i) => w.cells[i].nb.some((n) => w.cells[n].stack[w.cells[n].stack.length - 1] === top))
          const pool = good.length ? good : free
          place(slot, pool[Math.floor(Math.random() * pool.length)])
        }
      }
    }
  }

  // ── Render ──────────────────────────────────────
  function drawStack(ctx: CanvasRenderingContext2D, x: number, y: number, stack: number[], s: number, th: number, alpha = 1, showCount = false) {
    if (!stack.length) return
    ctx.globalAlpha = alpha
    for (let i = 0; i < stack.length; i++) {
      const spr = slabSprite(stack[i], s, th)
      ctx.drawImage(spr, x - s - 2, y - i * th - s * K - 2, s * 2 + 4, s * 2 * K + th + 4)
    }
    const topY = y - (stack.length - 1) * th
    ctx.save()
    ctx.translate(x, topY)
    drawMark(ctx, stack[stack.length - 1], s, K)
    ctx.restore()
    if (showCount) {
      const n = topRun(stack)
      if (n >= 4) {
        ctx.font = `900 ${Math.round(s * 0.42)}px 'Plus Jakarta Sans', system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'
        const label = `${n}/${CLEAR_AT}`
        ctx.strokeText(label, x, topY - s * 0.62)
        ctx.fillStyle = n >= 8 ? '#fde047' : '#ffffff'
        ctx.fillText(label, x, topY - s * 0.62)
      }
    }
    ctx.globalAlpha = 1
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    update(dt, raw)
    const { s, th, cx, cy, trayY } = geo()

    // background: teal lagoon with drifting bubbles
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#083344')
    bg.addColorStop(0.6, '#155e75')
    bg.addColorStop(1, '#0e7490')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    glow(ctx, cx, cy, W * 0.75, '#22d3ee', 0.18)
    for (let i = 0; i < 14; i++) {
      const x = (i * 71 + Math.sin(t * 0.5 + i) * 14) % W
      const y = H - ((t * (10 + (i % 4) * 6) + i * 97) % (H + 40)) + 20
      ctx.strokeStyle = 'rgba(165,243,252,0.25)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(x, y, 2 + (i % 4) * 1.5, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 0.06
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#a5f3fc'
      hexPath(ctx, (i * 97 + t * 4) % (W + 80) - 40, H * (0.12 + i * 0.2), 30 + i * 6, 1)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    fx.applyShake(ctx)
    // board plate: one slab per hex so shaped boards read clearly
    ctx.fillStyle = 'rgba(8,47,73,0.6)'
    for (const c of w.cells) {
      if (!c.open && !c.lock) continue
      const p = cellXY(c)
      hexPath(ctx, p.x, p.y + th * 1.2, s * 1.08, K)
      ctx.fill()
    }

    // compute visible stacks
    const order = w.cells.map((c, i) => ({ c, i, p: cellXY(c) })).sort((a, b) => a.p.y - b.p.y)
    const vis = (i: number) => {
      const c = w.cells[i]
      let st = c.stack
      let incoming = 0
      const outgoing: number[] = []
      for (const f of w.flights) {
        if (f.to === i) incoming++
        if (f.from === i && !f.started) outgoing.push(f.color)
      }
      if (incoming) st = st.slice(0, Math.max(0, st.length - incoming))
      if (outgoing.length) st = st.concat(outgoing)
      for (const cl of w.clears) if (cl.cell === i && cl.popped < cl.n) st = st.concat(Array.from({ length: cl.n - cl.popped }, () => cl.color))
      return st
    }
    // cell bases
    for (const { c, i, p } of order) {
      if (!c.open && !c.lock) continue
      if (!c.open) {
        ctx.fillStyle = 'rgba(2,6,23,0.35)'
        hexPath(ctx, p.x, p.y, s * 0.9, K)
        ctx.fill()
        ctx.strokeStyle = 'rgba(103,232,249,0.15)'
        ctx.lineWidth = 1
        ctx.stroke()
        // padlock
        ctx.fillStyle = 'rgba(165,243,252,0.35)'
        ctx.fillRect(p.x - s * 0.18, p.y - s * 0.05, s * 0.36, s * 0.26)
        ctx.strokeStyle = 'rgba(165,243,252,0.35)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(p.x, p.y - s * 0.05, s * 0.12, Math.PI, 0)
        ctx.stroke()
        if (ph !== 'idle') {
          ctx.font = `900 ${Math.round(s * 0.3)}px 'Plus Jakarta Sans', system-ui, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = '#a5f3fc'
          ctx.fillText(String(Math.max(0, c.lock - w.prog)), p.x, p.y + s * 0.38)
        }
        continue
      }
      const hot = i === w.hover
      const pop = c.pop > 0 && !c.stack.length ? 1 + Math.sin(c.pop * Math.PI) * 0.12 : 1
      ctx.fillStyle = hot ? 'rgba(253,224,71,0.55)' : 'rgba(6,78,99,0.9)'
      hexPath(ctx, p.x, p.y + th * 0.5, s * 0.92 * pop, K)
      ctx.fill()
      ctx.strokeStyle = hot ? '#fde047' : 'rgba(103,232,249,0.4)'
      ctx.lineWidth = hot ? 2.5 : 1.2
      ctx.stroke()
    }
    // stacks back to front
    const visLen: number[] = []
    for (const { c, i, p } of order) {
      if (!c.open) continue
      const st = vis(i)
      visLen[i] = st.length
      const bump = c.pop > 0 && c.stack.length ? Math.sin(c.pop * Math.PI) * 4 : 0
      if (w.hammerMode && st.length) glow(ctx, p.x, p.y - st.length * th * 0.5, s * 1.4, '#fb923c', 0.35 + Math.sin(t * 10) * 0.1)
      drawStack(ctx, p.x, p.y - bump, st, s * 0.9, th, 1, ph === 'play')
    }
    // flights
    for (const f of w.flights) {
      if (!f.started) continue
      const a = cellXY(w.cells[f.from])
      const b = cellXY(w.cells[f.to])
      const k = Math.min(1, f.t)
      const e = k * k * (3 - 2 * k)
      const fromH = (visLen[f.from] ?? 0) * th
      const toH = (visLen[f.to] ?? 0) * th
      const x = a.x + (b.x - a.x) * e
      const y = a.y - fromH + (b.y - toH - (a.y - fromH)) * e - Math.sin(k * Math.PI) * s * 1.4
      const flip = Math.cos(k * Math.PI)
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(1, Math.max(0.15, Math.abs(flip)))
      const spr = slabSprite(f.color, s * 0.9, th)
      ctx.drawImage(spr, -s * 0.9 - 2, -s * 0.9 * K - 2, s * 1.8 + 4, s * 1.8 * K + th + 4)
      ctx.restore()
    }

    // tray
    if (ph !== 'idle') {
      ctx.fillStyle = 'rgba(8,47,73,0.6)'
      ctx.beginPath()
      ctx.roundRect(10, trayY - 62, W - 20, 104, 18)
      ctx.fill()
      ctx.strokeStyle = 'rgba(103,232,249,0.3)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    for (let i = 0; i < 3; i++) {
      const o = w.offers[i]
      if (!o || (w.drag && w.drag.slot === i)) continue
      const sp = slotXY(i)
      const bob = Math.sin(t * 2.5 + i) * 2
      drawStack(ctx, sp.x, sp.y + 4 + bob, o, s * 0.85, th, ph === 'idle' ? 0 : 1)
    }
    if (w.drag) {
      const o = w.offers[w.drag.slot]
      if (o) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        hexPath(ctx, w.drag.x, w.drag.y - LIFT + th, s * 0.85, K)
        ctx.fill()
        drawStack(ctx, w.drag.x, w.drag.y - LIFT - 10, o, s * 0.9, th)
      }
    }

    fx.draw(ctx)
    ctx.restore()

    if (ph !== 'idle') {
      // level progress bar
      const bw = Math.min(170, W * 0.42)
      const bx = 14
      const by = 82
      ctx.fillStyle = 'rgba(2,6,23,0.45)'
      ctx.beginPath()
      ctx.roundRect(bx, by, bw, 8, 4)
      ctx.fill()
      ctx.fillStyle = '#67e8f9'
      ctx.beginPath()
      ctx.roundRect(bx, by, Math.max(8, bw * Math.min(1, w.prog / w.goal)), 8, 4)
      ctx.fill()
      // colour ladder
      const lx = W - 14 - HUES.length * 17
      const ly = 88
      for (let i = 0; i < HUES.length; i++) {
        const x = lx + i * 17 + 8
        const on = i < w.colors
        ctx.globalAlpha = on ? 1 : 0.3
        ctx.fillStyle = on ? HUES[i].top : '#334155'
        hexPath(ctx, x, ly, 7, 0.85)
        ctx.fill()
        if (on) {
          ctx.save()
          ctx.translate(x, ly)
          drawMark(ctx, i, 7, 0.85)
          ctx.restore()
        }
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = '#cffafe'
      ctx.font = "800 9px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${w.spec.boss ? 'BOSS · ' : ''}${w.spec.name} · ${w.moves} moves (par ${w.spec.par})`, W - 14, ly - 9)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  // Dev-only probe for scripted end-to-end tests.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__hexsort = () => {
      const w = world.current
      return {
        resolving: w.resolving,
        noRoom: w.noRoom,
        offers: w.offers.map((o, i) => (o ? slotXY(i) : null)),
        empty: w.cells.filter((c) => c.open && !c.stack.length).map((c) => cellXY(c)),
      }
    }
    win.__hexsortFill = () => {
      const w = world.current
      for (const c of w.cells) if (c.open && !c.stack.length) c.stack = [Math.floor(Math.random() * w.colors), (Math.floor(Math.random() * w.colors) + 1) % w.colors]
      w.queue = []
      w.resolving = true
      w.rstate = 'scan'
      w.wait = 0.05
    }
    // Greedy one-ply bot move (same heuristic as the level verifier) as a drag from tray to hex.
    win.__hexsortBot = () => {
      const w = world.current
      if (phaseRef.current !== 'play' || w.resolving || w.flights.length) return null
      let best: { slot: number; ci: number; v: number } | null = null
      w.offers.forEach((o, slot) => {
        if (!o) return
        w.cells.forEach((c, ci) => {
          if (!c.open || c.stack.length) return
          const cells = w.cells.map((x) => ({ ...x, stack: x.stack.slice() }))
          cells[ci].stack = o.slice()
          const r = resolveSync(cells, ci)
          let v = (w.prog + r.tiles) * 10
          for (const x of cells) {
            if (!x.open) continue
            if (!x.stack.length) v += 7
            else v += topRun(x.stack) * 0.6 - x.stack.reduce((n, col, i) => n + (i && x.stack[i - 1] !== col ? 1 : 0), 1) * 2.5
          }
          if (!best || v > best.v) best = { slot, ci, v }
        })
      })
      if (!best) return null
      const b: { slot: number; ci: number } = best
      const from = slotXY(b.slot)
      const to = cellXY(w.cells[b.ci])
      return { from: { x: from.x, y: from.y - 20 }, to: { x: to.x, y: to.y + LIFT } }
    }
    return () => {
      delete win.__hexsort
      delete win.__hexsortBot
      delete win.__hexsortFill
    }
  }, [])

  const won = world.current.stats.levels > 0
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena hx-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="hx-sub">
                  Level {hud.level} · {Math.min(hud.prog, hud.goal)}/{hud.goal} tiles
                </div>
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'dying' ? (
            <div className="hx-helpers">
              <button type="button" className="hx-helper" aria-label="New stacks" disabled={hud.refreshes <= 0} onPointerDown={(e) => e.stopPropagation()} onClick={refreshOffers}>
                <RefreshIcon />
                <span className="hx-helper__n">{hud.refreshes}</span>
              </button>
              <button
                type="button"
                className={`hx-helper${hud.hammerMode ? ' is-on' : ''}`}
                aria-label="Hammer a stack"
                disabled={hud.hammers <= 0 && !hud.hammerMode}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={toggleHammer}
              >
                <HammerIcon />
                <span className="hx-helper__n">{hud.hammers}</span>
              </button>
            </div>
          ) : null}
          {hud.hammerMode && phase === 'play' ? <div className="hx-hint">Tap a stack to smash it</div> : null}
          {banner && (phase === 'play' || phase === 'clear') ? (
            <div className="action-banner hx-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="hexsort"
              icon={meta.icon}
              title={meta.title}
              hint="Drag stacks onto the board. Matching colours slide together — 10 of one colour burst. Clear the tile goal to beat each level."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Hex master!' : 'Board full'}
            subtitle={`Score ${hud.score} · level ${hud.level}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
