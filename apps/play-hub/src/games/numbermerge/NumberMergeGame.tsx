import { useEffect, useRef, useState, type PointerEvent } from 'react'
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
import { drawBomb, drawJoker, drawStone, drawTile, hueFor, label } from './art'
import '../../shared/action/action.css'
import { AUTHORED } from './authored'
import { N, authoredLevel, component, jokerValue as ruleJoker, makeLevel, nbrs, pieceAt, type LevelDef } from './levels'
import './numbermerge.css'

const meta = getGame('numbermerge')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type Tile = { id: number; kind: 'num' | 'stone'; v: number; pop: number; cracks: number }
type Piece = { kind: 'num' | 'joker' | 'bomb'; v: number }
type Slide = { fromCell: number; toCell: number; v: number; t: number }
type Snap = { grid: (Tile | null)[]; cur: Piece; next: Piece; score: number; idx: number; moves: number }

let tid = 1

type World = {
  lv: LevelDef
  blocked: boolean[]
  idx: number
  moves: number
  reached: boolean
  clearT: number
  stars: number
  runClears: number
  grid: (Tile | null)[]
  cur: Piece
  next: Piece
  resolving: { cell: number; wait: number; chain: number } | null
  slides: Slide[]
  level: number
  goal: number
  minV: number
  score: number
  coins: number
  placed: number
  hammers: number
  swaps: number
  undos: number
  hammerMode: boolean
  snap: Snap | null
  full: boolean
  hover: number
  demoT: number
  stats: { score: number; level: number; best: number; merges: number; chain: number }
}

function loadGrid(lv: LevelDef): (Tile | null)[] {
  return lv.start.map((c) => (c ? { id: tid++, kind: c.kind, v: c.v, pop: 1, cracks: c.cracks } : null))
}

function freshWorld(): World {
  const lv = authoredLevel(4, AUTHORED[3])
  return {
    lv,
    blocked: lv.blocked,
    idx: 2,
    moves: 0,
    reached: false,
    clearT: 0,
    stars: 0,
    runClears: 0,
    grid: loadGrid(lv),
    cur: pieceAt(lv, 0),
    next: pieceAt(lv, 1),
    resolving: null,
    slides: [],
    level: 1,
    goal: 64,
    minV: 2,
    score: 0,
    coins: 0,
    placed: 0,
    hammers: 1,
    swaps: 1,
    undos: 1,
    hammerMode: false,
    snap: null,
    full: false,
    hover: -1,
    demoT: 1,
    stats: { score: 0, level: 1, best: 0, merges: 0, chain: 0 },
  }
}

const HammerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4l6 6-3 3-6-6zM11 7l-8 8 3 3 8-8" />
  </svg>
)
const SwapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4v14M7 18l-3-3M7 18l3-3M17 20V6M17 6l-3 3M17 6l3 3" />
  </svg>
)
const UndoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 14L4 9l5-5" />
    <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
  </svg>
)

export default function NumberMergeGame() {
  const run = useActionRun('numbermerge')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const lastEvent = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, goal: 64, hard: false, hammers: 0, swaps: 0, undos: 0, hammerMode: false, full: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.level, goal: w.goal, hard: w.lv.hard, hammers: w.hammers, swaps: w.swaps, undos: w.undos, hammerMode: w.hammerMode, full: w.full })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const top = 116
    const tray = 196
    const cell = Math.min((W - 28) / N, (H - top - tray) / N, 84)
    const bx = (W - cell * N) / 2
    const by = top + Math.max(0, (H - top - tray - cell * N) / 3)
    const curY = Math.min(by + cell * N + 42, H - 74 - cell * 1.05 - 8)
    return { W, H, cell, bx, by, pad: cell * 0.07, curY }
  }

  function cellXY(i: number) {
    const { cell, bx, by } = geo()
    return { x: bx + (i % N) * cell, y: by + Math.floor(i / N) * cell }
  }

  // ── Pieces ────────────────────────────────────
  function spawn(): Piece {
    const w = world.current
    w.placed++
    return pieceAt(w.lv, w.idx++)
  }

  function jokerValue(cell: number) {
    const w = world.current
    return ruleJoker(w.grid, cell, w.minV)
  }

  // ── Flow ──────────────────────────────────────
  function loadLevel(n: number) {
    const w = world.current
    const lv = n <= AUTHORED.length ? authoredLevel(n, AUTHORED[n - 1]) : makeLevel(n, Math.floor(Math.random() * 1e9))
    w.lv = lv
    w.level = n
    w.goal = lv.goal
    w.minV = lv.pool[0]
    w.blocked = lv.blocked
    w.grid = loadGrid(lv)
    w.idx = 0
    w.cur = spawn()
    w.next = spawn()
    w.moves = 0
    w.reached = false
    w.resolving = null
    w.slides = []
    w.snap = null
    w.full = false
    w.hammerMode = false
    w.stats.level = n
    if (phaseRef.current !== 'idle') {
      const name = lv.name ? `${lv.name} · ` : ''
      setBanner({ key: Date.now(), text: lv.hard ? `LEVEL ${n} · HARD` : `LEVEL ${n}`, sub: `${name}${lv.tip ?? `make a ${label(lv.goal)} tile`}` })
      if (lv.hard) sfx.boom(0.3)
      else sfx.ready()
      run.update(w.stats)
    }
    pushHud()
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.hammers = 1 + run.level('hammer')
    w.swaps = 1 + run.level('swap')
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    loadLevel(Math.max(1, level))
  }

  function place(cell: number) {
    const w = world.current
    if (w.resolving || w.grid[cell] || w.blocked[cell] || w.reached) return
    const play = phaseRef.current === 'play'
    w.snap = { grid: w.grid.map((t) => (t ? { ...t } : null)), cur: { ...w.cur }, next: { ...w.next }, score: w.score, idx: w.idx, moves: w.moves }
    if (play) w.moves += 1
    const p = cellXY(cell)
    const { cell: cs } = geo()
    const cx = p.x + cs / 2
    const cy = p.y + cs / 2
    w.full = false
    if (w.cur.kind === 'bomb') {
      const r = Math.floor(cell / N)
      const c = cell % N
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr
        const cc = c + dc
        if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue
        const j = rr * N + cc
        const t = w.grid[j]
        if (!t) continue
        const q = cellXY(j)
        const col = t.kind === 'stone' ? '#a8a29e' : hueFor(t.v)[1]
        fx.burst(q.x + cs / 2, q.y + cs / 2, { count: 12, color: [col, '#ffffff'], speed: 260, shape: 'square', size: 5, gravity: 500 })
        if (play && t.kind === 'num') w.score += t.v
        w.grid[j] = null
      }
      fx.explode(cx, cy, 1.4)
      fx.flash('#fde68a', 0.15)
      if (play) {
        sfx.boom(0.8)
        haptic.heavy()
      }
      w.cur = w.next
      w.next = spawn()
      w.stats.score = w.score
      pushHud()
      return
    }
    const v = w.cur.kind === 'joker' ? jokerValue(cell) : w.cur.v
    if (w.cur.kind === 'joker') fx.burst(cx, cy, { count: 20, color: ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#c084fc'], speed: 240, gravity: 100 })
    w.grid[cell] = { id: tid++, kind: 'num', v, pop: 1, cracks: 0 }
    w.cur = w.next
    w.next = spawn()
    w.resolving = { cell, wait: 0.12, chain: 0 }
    fx.burst(cx, cy, { count: 6, color: ['#ffffff', hueFor(v)[0]], speed: 100, gravity: 200, size: 2 })
    if (play) {
      sfx.thud()
      haptic.light()
    }
    pushHud()
  }

  function step() {
    const w = world.current
    const R = w.resolving!
    const t = w.grid[R.cell]
    const play = phaseRef.current === 'play'
    if (!t || t.kind !== 'num') {
      finish()
      return
    }
    const comp = component(w.grid, R.cell, t.v)
    if (comp.length < 2) {
      finish()
      return
    }
    const { cell: cs } = geo()
    const others = comp.filter((i) => i !== R.cell)
    for (const i of others) {
      w.slides.push({ fromCell: i, toCell: R.cell, v: t.v, t: 0 })
      w.grid[i] = null
    }
    const nv = t.v * Math.pow(2, comp.length - 1)
    t.v = nv
    t.pop = 1
    R.chain++
    // stones next to the merge crack and break
    const touched = new Set<number>()
    for (const i of comp) for (const j of nbrs(i)) touched.add(j)
    touched.forEach((j) => {
      const s = w.grid[j]
      if (!s || s.kind !== 'stone') return
      s.cracks++
      s.pop = 1
      const q = cellXY(j)
      fx.burst(q.x + cs / 2, q.y + cs / 2, { count: 10, color: ['#a8a29e', '#d6d3d1', '#57534e'], speed: 220, shape: 'square', size: 4, gravity: 600 })
      if (s.cracks >= 2) {
        w.grid[j] = null
        if (play) {
          sfx.clang()
          fx.text(q.x + cs / 2, q.y + cs / 2, 'CRACK!', '#e7e5e4', 14)
        }
      }
    })
    const p = cellXY(R.cell)
    const cx = p.x + cs / 2
    const cy = p.y + cs / 2
    window.setTimeout(() => {
      fx.burst(cx, cy, { count: 14 + R.chain * 4, color: [hueFor(nv)[0], hueFor(nv)[1], '#ffffff'], speed: 220 + R.chain * 30, gravity: 200, size: 3 })
      fx.ring(cx, cy, { color: hueFor(nv)[0], maxR: cs * (0.8 + R.chain * 0.15), life: 0.35, width: 4 })
    }, 130)
    if (play) {
      w.score += nv * R.chain
      w.stats.score = w.score
      w.stats.merges += 1
      w.stats.chain = Math.max(w.stats.chain, R.chain)
      w.stats.best = Math.max(w.stats.best, nv)
      sfx.score(Math.min(10, R.chain * 2))
      if (R.chain >= 2) {
        sfx.combo()
        fx.text(cx, cy - cs * 0.7, `CHAIN x${R.chain}`, '#fde047', 16 + R.chain * 2)
        fx.shake(2 + R.chain, 0.15)
      } else fx.text(cx, cy - cs * 0.6, `+${label(nv)}`, '#ffffff', 16)
      if (R.chain >= 4) setBanner({ key: Date.now(), text: R.chain >= 6 ? 'MEGA CHAIN!' : 'GREAT CHAIN!', sub: `x${R.chain}` })
      haptic.medium()
      fx.stop(0.03 + Math.min(0.08, R.chain * 0.015))
      run.update(w.stats)
      if (nv >= w.goal) w.reached = true
    }
    R.wait = 0.26
    pushHud()
  }

  function finish() {
    const w = world.current
    w.resolving = null
    if (w.reached && phaseRef.current === 'play') {
      levelClear()
      return
    }
    if (w.grid.some((t, i) => !t && !w.blocked[i])) return
    if (phaseRef.current !== 'play') {
      // attract mode: clear and keep going
      w.grid = w.grid.map(() => null)
      return
    }
    w.full = true
    if (w.hammers > 0 || w.undos > 0) {
      setBanner({ key: Date.now(), text: 'BOARD FULL!', sub: w.hammers > 0 ? 'smash a tile with the hammer' : 'undo your last move' })
      sfx.miss()
      pushHud()
    } else die()
  }

  function levelClear() {
    const w = world.current
    const lv = w.lv
    // Stars by placements: par or fewer = 3, up to 1.5× par = 2, else 1.
    const stars = w.moves <= lv.par ? 3 : w.moves <= Math.ceil(lv.par * 1.5) ? 2 : 1
    w.stars = stars
    w.runClears += 1
    run.completeLevel(w.level, stars)
    const bonus = 100 + stars * 50 + (lv.hard ? 150 : 0)
    w.score += bonus
    w.stats.score = w.score
    w.coins += 3 + stars + (lv.hard ? 3 : 0)
    if (w.level % 2 === 0) w.hammers += 1
    else w.undos += 1
    w.hammerMode = false
    w.clearT = 2.3
    setPhaseBoth('clear')
    const stars3 = '★'.repeat(stars) + '☆'.repeat(3 - stars)
    setBanner({ key: Date.now() + 1, text: lv.hard ? 'HARD LEVEL CLEAR!' : `LEVEL ${w.level} CLEAR!`, sub: `${stars3} · ${w.moves} moves (par ${lv.par}) · +${bonus}` })
    const { W, H } = geo()
    for (let i = 0; i < 4; i++) fx.burst(rand(W * 0.15, W * 0.85), rand(H * 0.2, H * 0.4), { count: 16, color: ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#ffffff'], speed: 300, shape: 'square', size: 5, gravity: 380, life: 1.1 })
    fx.flash('#e0e7ff', 0.18)
    sfx.levelUp()
    haptic.success()
    if (w.level % 5 === 0 && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'numbermerge', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  // ── Boosters ──────────────────────────────────
  function toggleHammer() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.resolving) return
    if (w.hammerMode) w.hammerMode = false
    else if (w.hammers > 0) w.hammerMode = true
    sfx.tap()
    pushHud()
  }

  function hammerAt(i: number) {
    const w = world.current
    const t = w.grid[i]
    if (!t) return
    const q = cellXY(i)
    const { cell: cs } = geo()
    const col = t.kind === 'stone' ? '#a8a29e' : hueFor(t.v)[1]
    fx.burst(q.x + cs / 2, q.y + cs / 2, { count: 22, color: [col, '#ffffff'], speed: 280, shape: 'square', size: 5, gravity: 600 })
    fx.ring(q.x + cs / 2, q.y + cs / 2, { color: '#fdba74', maxR: cs, life: 0.35 })
    fx.text(q.x + cs / 2, q.y, 'SMASH!', '#fdba74', 18)
    w.grid[i] = null
    w.hammers -= 1
    w.hammerMode = false
    w.full = false
    w.snap = null
    fx.shake(6, 0.2)
    fx.stop(0.06)
    sfx.clang()
    haptic.heavy()
    pushHud()
  }

  function boostSwap() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.swaps <= 0 || w.resolving) return
    w.swaps -= 1
    const c = w.cur
    w.cur = w.next
    w.next = c
    sfx.flip()
    sfx.whoosh()
    haptic.light()
    pushHud()
  }

  function boostUndo() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.undos <= 0 || w.resolving || !w.snap) return
    w.undos -= 1
    w.grid = w.snap.grid
    w.cur = w.snap.cur
    w.next = w.snap.next
    w.idx = w.snap.idx
    w.moves = w.snap.moves
    w.score = w.snap.score
    w.stats.score = w.score
    w.snap = null
    w.full = false
    w.slides = []
    fx.flash('#c7d2fe', 0.15)
    sfx.whoosh()
    haptic.medium()
    pushHud()
  }

  // ── Fail / revive ─────────────────────────────
  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    w.hammerMode = false
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.3)
    fx.shake(10, 0.4)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    const { W, by, cell } = geo()
    fx.text(W / 2, by + cell * 2.5, 'BOARD FULL!', '#fecaca', 28)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.coins + w.level * 2 + Math.log2(Math.max(2, w.stats.best)) * 1.5) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.runClears > 0 && w.level >= 4, stats: { ...w.stats }, coins }, revive)
      pushHud()
    }, 1100)
  }

  /** Revive: the eight smallest tiles (and stones) shatter, plus a free hammer. */
  function revive() {
    const w = world.current
    const { cell: cs } = geo()
    const idx = w.grid
      .map((t, i) => ({ t, i }))
      .filter((o) => o.t)
      .sort((a, b) => (a.t!.kind === 'stone' ? -1 : a.t!.v) - (b.t!.kind === 'stone' ? -1 : b.t!.v))
      .slice(0, 8)
    for (const { t, i } of idx) {
      const q = cellXY(i)
      fx.burst(q.x + cs / 2, q.y + cs / 2, { count: 10, color: [t!.kind === 'stone' ? '#a8a29e' : hueFor(t!.v)[0], '#ffffff'], speed: 220, gravity: 300 })
      w.grid[i] = null
    }
    w.hammers += 1
    w.full = false
    w.resolving = null
    w.snap = null
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'small tiles cleared · +1 hammer' })
    setPhaseBoth('play')
    pushHud()
  }

  // ── Input ─────────────────────────────────────
  function cellAt(x: number, y: number) {
    const { cell, bx, by } = geo()
    const c = Math.floor((x - bx) / cell)
    const r = Math.floor((y - by) / cell)
    if (c < 0 || r < 0 || c >= N || r >= N) return -1
    return r * N + c
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    const i = cellAt(p.x, p.y)
    if (i < 0) return
    if (w.hammerMode) {
      if (w.grid[i]) hammerAt(i)
      return
    }
    if (w.blocked[i]) return
    if (w.grid[i]) {
      const q = cellXY(i)
      const { cell } = geo()
      fx.ring(q.x + cell / 2, q.y + cell / 2, { color: '#f87171', maxR: cell * 0.5, life: 0.25 })
      sfx.tick()
      return
    }
    place(i)
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const p = localPoint(e, e.currentTarget)
    world.current.hover = cellAt(p.x, p.y)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'h') toggleHammer()
      else if (e.key === 's') boostSwap()
      else if (e.key === 'u' || e.key === 'z') boostUndo()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  /** Greedy best cell for the current piece (used by attract mode and the dev bot). */
  function bestCell() {
    const w = world.current
    let best = -1
    let score = -Infinity
    for (let i = 0; i < N * N; i++) {
      if (w.grid[i] || w.blocked[i]) continue
      const v = w.cur.kind === 'joker' ? jokerValue(i) : w.cur.v
      let s = Math.random() * 0.5
      if (w.cur.kind === 'bomb') {
        s += nbrs(i).filter((j) => w.grid[j]).length
      } else {
        // simulate the full cascade
        const g = w.grid.slice()
        g[i] = { id: 0, kind: 'num', v, pop: 0, cracks: 0 }
        let cv = v
        for (let k = 0; k < 12; k++) {
          const comp = component(g, i, cv)
          if (comp.length < 2) break
          for (const j of comp) if (j !== i) g[j] = null
          cv *= 2 ** (comp.length - 1)
          g[i] = { id: 0, kind: 'num', v: cv, pop: 0, cracks: 0 }
          s += 10 + Math.log2(cv)
        }
        // keep the board tidy: prefer edges and neighbours of double value
        if (nbrs(i).some((j) => w.grid[j]?.v === v * 2)) s += 3
        s += nbrs(i).length < 4 ? 1 : 0
      }
      if (s > score) {
        score = s
        best = i
      }
    }
    return best
  }

  // ── Tick ──────────────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    for (const t of w.grid) if (t && t.pop > 0) t.pop = Math.max(0, t.pop - raw * 4)
    for (const s of w.slides) s.t += dt / 0.14
    if (w.slides.length) w.slides = w.slides.filter((s) => s.t < 1)
    if (w.resolving && dt > 0) {
      w.resolving.wait -= dt
      if (w.resolving.wait <= 0) step()
    }
    if (phaseRef.current === 'idle') {
      w.demoT -= raw
      if (w.demoT <= 0 && !w.resolving) {
        w.demoT = 0.7
        const i = bestCell()
        if (i >= 0) place(i)
      }
    } else if (phaseRef.current === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0) {
        setPhaseBoth('play')
        loadLevel(w.level + 1)
      }
    }
  }

  // ── Render ────────────────────────────────────
  function drawPiece(ctx: CanvasRenderingContext2D, pc: Piece, x: number, y: number, s: number, t: number) {
    if (pc.kind === 'joker') drawJoker(ctx, x, y, s, t)
    else if (pc.kind === 'bomb') drawBomb(ctx, x, y, s, t)
    else drawTile(ctx, x, y, s, pc.v)
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    update(dt, raw)
    const { cell, bx, by, pad, curY } = geo()
    const hard = w.lv.hard && ph !== 'idle'

    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, hard ? '#4c0519' : '#312e81')
    bg.addColorStop(1, hard ? '#1e1b4b' : '#1e1b4b')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // floating number dust
    ctx.font = "900 22px 'Plus Jakarta Sans', system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < 10; i++) {
      const x = (i * 67 + Math.sin(t * 0.4 + i) * 20) % W
      const y = H - ((t * (8 + (i % 3) * 5) + i * 120) % (H + 60)) + 30
      ctx.fillStyle = 'rgba(199,210,254,0.07)'
      ctx.fillText(String(2 ** ((i % 6) + 1)), x, y)
    }
    glow(ctx, W / 2, by + cell * 2.5, W * 0.8, '#818cf8', 0.18)

    fx.applyShake(ctx)
    // board
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.roundRect(bx - 10, by - 6, cell * N + 20, cell * N + 20, 20)
    ctx.fill()
    ctx.fillStyle = '#1e1b4b'
    ctx.beginPath()
    ctx.roundRect(bx - 10, by - 10, cell * N + 20, cell * N + 20, 20)
    ctx.fill()
    ctx.strokeStyle = 'rgba(165,180,252,0.35)'
    ctx.lineWidth = 2
    ctx.stroke()
    const s = cell - pad * 2
    for (let i = 0; i < N * N; i++) {
      const p = cellXY(i)
      if (w.blocked[i]) {
        // blocked cell: a sunken, hatched hole
        ctx.fillStyle = 'rgba(8,6,30,0.85)'
        ctx.beginPath()
        ctx.roundRect(p.x + pad, p.y + pad, s, s, s * 0.2)
        ctx.fill()
        ctx.save()
        ctx.clip()
        ctx.strokeStyle = 'rgba(129,140,248,0.16)'
        ctx.lineWidth = 3
        for (let k = -s; k < s * 2; k += s / 4) {
          ctx.beginPath()
          ctx.moveTo(p.x + pad + k, p.y + pad)
          ctx.lineTo(p.x + pad + k - s, p.y + pad + s)
          ctx.stroke()
        }
        ctx.restore()
        continue
      }
      const hot = ph === 'play' && i === w.hover && !w.grid[i] && !w.hammerMode && !w.resolving
      ctx.fillStyle = hot ? 'rgba(165,180,252,0.35)' : 'rgba(49,46,129,0.75)'
      ctx.beginPath()
      ctx.roundRect(p.x + pad, p.y + pad, s, s, s * 0.2)
      ctx.fill()
      if (hot) {
        ctx.globalAlpha = 0.35
        drawPiece(ctx, w.cur, p.x + pad, p.y + pad, s, t)
        ctx.globalAlpha = 1
      }
    }
    // tiles
    for (let i = 0; i < N * N; i++) {
      const tile = w.grid[i]
      if (!tile) continue
      const p = cellXY(i)
      const k = tile.pop
      const sc = 1 + Math.sin(k * Math.PI) * 0.18
      const ss = s * sc
      const x = p.x + pad + (s - ss) / 2
      const y = p.y + pad + (s - ss) / 2
      if (w.hammerMode) glow(ctx, p.x + cell / 2, p.y + cell / 2, cell * 0.8, '#fb923c', 0.3 + Math.sin(t * 10) * 0.1)
      if (tile.kind === 'stone') drawStone(ctx, x, y, ss, tile.cracks)
      else {
        if (tile.v >= 1024) glow(ctx, p.x + cell / 2, p.y + cell / 2, cell * 0.9, hueFor(tile.v)[0], 0.35 + Math.sin(t * 3) * 0.1)
        drawTile(ctx, x, y, ss, tile.v)
      }
    }
    // sliding merges
    for (const sl of w.slides) {
      const a = cellXY(sl.fromCell)
      const b = cellXY(sl.toCell)
      const e = sl.t * sl.t
      const sc = 1 - e * 0.4
      const ss = s * sc
      const x = a.x + (b.x - a.x) * e + pad + (s - ss) / 2
      const y = a.y + (b.y - a.y) * e + pad + (s - ss) / 2
      ctx.globalAlpha = 1 - e * 0.5
      drawTile(ctx, x, y, ss, sl.v)
      ctx.globalAlpha = 1
    }

    // current + next piece
    if (ph !== 'idle') {
      const cs = cell * 1.05
      const cx = W / 2 - cs / 2
      const bob = Math.sin(t * 3) * 3
      ctx.fillStyle = 'rgba(15,12,50,0.55)'
      ctx.beginPath()
      ctx.roundRect(W / 2 - cs * 0.8, curY - 12, cs * 1.6, cs + 20, 18)
      ctx.fill()
      glow(ctx, W / 2, curY + cs / 2, cs, '#a5b4fc', 0.25)
      drawPiece(ctx, w.cur, cx, curY + bob - 4, cs, t)
      const ns = cell * 0.62
      const nx = W / 2 + cs * 0.95
      ctx.fillStyle = 'rgba(199,210,254,0.85)'
      ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.fillText('NEXT', nx + ns / 2, curY + 2)
      ctx.globalAlpha = 0.9
      drawPiece(ctx, w.next, nx, curY + 12, ns, t)
      ctx.globalAlpha = 1
      ctx.fillText('NOW', W / 2, curY - 20)
    }
    fx.draw(ctx)
    ctx.restore()

    if (ph !== 'idle') {
      // goal ladder
      const best = Math.max(w.stats.best, ...w.grid.map((tt) => (tt && tt.kind === 'num' ? tt.v : 0)))
      const frac = clamp(Math.log2(Math.max(2, best)) / Math.log2(w.goal), 0, 1)
      const gx = 14
      const gy = 82
      const gw = W - 28
      ctx.fillStyle = 'rgba(15,12,50,0.6)'
      ctx.beginPath()
      ctx.roundRect(gx, gy, gw, 12, 6)
      ctx.fill()
      const b = hueFor(w.goal)[1]
      const gg = ctx.createLinearGradient(gx, 0, gx + gw, 0)
      gg.addColorStop(0, '#818cf8')
      gg.addColorStop(1, b)
      ctx.fillStyle = gg
      ctx.beginPath()
      ctx.roundRect(gx, gy, Math.max(12, gw * frac), 12, 6)
      ctx.fill()
      ctx.font = "900 10px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      ctx.fillText(`GOAL ${label(w.goal)}`, gx + gw - 6, gy + 6.5)
      ctx.textAlign = 'left'
      const par = w.lv.par
      ctx.fillStyle = w.moves <= par ? '#fde047' : w.moves <= Math.ceil(par * 1.5) ? '#e2e8f0' : '#fca5a5'
      const st = w.moves <= par ? '★★★' : w.moves <= Math.ceil(par * 1.5) ? '★★' : '★'
      ctx.fillText(`${st}  moves ${w.moves} / par ${par}`, gx + 6, gy + 6.5)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__t2fail = () => {
      const w = world.current
      if (phaseRef.current !== 'play' || w.resolving) return
      w.hammers = 0
      w.undos = 0
      for (let i = 0; i < N * N; i++) if (!w.grid[i]) w.grid[i] = { id: tid++, kind: 'num', v: 2 ** (1 + ((i * 7) % 9)), pop: 1, cracks: 0 }
      finish()
    }
    win.__t2level = (n: number) => {
      if (phaseRef.current !== 'play') return
      loadLevel(n)
    }
    win.__numbermerge = () => {
      const w = world.current
      if (phaseRef.current !== 'play' || w.resolving) return null
      const i = bestCell()
      if (i < 0) return null
      const p = cellXY(i)
      const { cell } = geo()
      return { tap: { x: p.x + cell / 2, y: p.y + cell / 2 } }
    }
    return () => {
      delete win.__t2fail
      delete win.__t2level
      delete win.__numbermerge
    }
  }, [])

  const won = hud.level >= 4
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena nm-arena" onPointerDown={onDown} onPointerMove={onMove}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="nm-sub">
                  Level {hud.level}
                  {hud.hard ? <span className="nm-hard">HARD</span> : null}
                </div>
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'dying' ? (
            <div className="nm-boosters">
              <button type="button" className={`nm-boost${hud.hammerMode ? ' is-on' : ''}${hud.full && hud.hammers > 0 ? ' is-hot' : ''}`} aria-label="Hammer" disabled={hud.hammers <= 0 && !hud.hammerMode} onPointerDown={stop} onClick={toggleHammer}>
                <HammerIcon />
                <span className="nm-boost__n">{hud.hammers}</span>
              </button>
              <button type="button" className="nm-boost" aria-label="Swap with next" disabled={hud.swaps <= 0} onPointerDown={stop} onClick={boostSwap}>
                <SwapIcon />
                <span className="nm-boost__n">{hud.swaps}</span>
              </button>
              <button type="button" className={`nm-boost${hud.full && hud.hammers <= 0 && hud.undos > 0 ? ' is-hot' : ''}`} aria-label="Undo" disabled={hud.undos <= 0} onPointerDown={stop} onClick={boostUndo}>
                <UndoIcon />
                <span className="nm-boost__n">{hud.undos}</span>
              </button>
            </div>
          ) : null}
          {hud.hammerMode && phase === 'play' ? <div className="nm-hint">Tap a tile to smash it</div> : null}
          {banner && (phase === 'play' || phase === 'clear') ? (
            <div className="action-banner nm-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="numbermerge"
              icon={meta.icon}
              title={meta.title}
              hint="Tap a cell to place the block. Equal neighbours merge and double — chain merges for big numbers!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Number wizard!' : 'Board full'}
            subtitle={`Score ${hud.score} · level ${hud.level}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
