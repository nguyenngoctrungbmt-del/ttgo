import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { drawBlock, drawBomb, drawWild, label, styleOf, tierName } from './art'
import '../../shared/action/action.css'
import './dropmerge.css'

const meta = getGame('dropmerge')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Special = '' | 'bomb' | 'wild'
type Spawn = { e: number; special: Special }
type Block = { id: number; e: number; special: Special; col: number; row: number; vx: number; vy: number; fallV: number; pop: number; sq: number }
type Ghost = { x: number; y: number; tx: number; ty: number; t: number; e: number }
type Busy = 'ready' | 'fall' | 'resolve'

const COLS = 5
const ROWS = 7

type World = {
  grid: (Block | null)[][]
  nextId: number
  cur: Spawn
  next: Spawn
  hover: number | null
  busy: Busy
  queue: number[]
  stepT: number
  falling: Block | null
  combo: number
  score: number
  bestE: number
  minE: number
  clock: number
  timer: number
  hammers: number
  swaps: number
  hammerMode: boolean
  noRoom: boolean
  wildIn: number
  bombIn: number
  announced: Special[]
  frenzyT: number
  nextFrenzy: number
  ghosts: Ghost[]
  giftSwap: boolean
  idleT: number
  stats: { score: number; best: number; merges: number; combo: number; purges: number }
}

function emptyGrid(): (Block | null)[][] {
  return Array.from({ length: COLS }, () => Array.from({ length: ROWS + 1 }, () => null))
}

function freshWorld(): World {
  return {
    grid: emptyGrid(),
    nextId: 1,
    cur: { e: 1, special: '' },
    next: { e: 2, special: '' },
    hover: null,
    busy: 'ready',
    queue: [],
    stepT: 0,
    falling: null,
    combo: 0,
    score: 0,
    bestE: 1,
    minE: 1,
    clock: 0,
    timer: 99,
    hammers: 1,
    swaps: 2,
    hammerMode: false,
    noRoom: false,
    wildIn: 20,
    bombIn: 26,
    announced: [],
    frenzyT: 0,
    nextFrenzy: 90,
    ghosts: [],
    giftSwap: false,
    idleT: 0,
    stats: { score: 0, best: 2, merges: 0, combo: 0, purges: 0 },
  }
}

const spriteCache = new Map<string, HTMLCanvasElement>()
function blockSprite(e: number, c: number) {
  const px = Math.max(8, Math.round(c))
  const key = `${e}|${px}`
  const hit = spriteCache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const cv = document.createElement('canvas')
  cv.width = Math.ceil(px * dpr)
  cv.height = Math.ceil(px * dpr)
  const g = cv.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate(px / 2, px / 2)
  drawBlock(g, e, px)
  spriteCache.set(key, cv)
  if (spriteCache.size > 80) {
    const first = spriteCache.keys().next().value
    if (first) spriteCache.delete(first)
  }
  return cv
}

const SwapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
  </svg>
)
const HammerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4l6 6-3 3-6-6zM11 7l-8 8 3 3 8-8" />
  </svg>
)

export default function DropMergeGame() {
  const run = useActionRun('dropmerge')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const pointer = useRef<number | null>(null)
  const lastEvent = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, best: 1, hammers: 0, swaps: 0, hammerMode: false, frenzy: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, best: w.bestE, hammers: w.hammers, swaps: w.swaps, hammerMode: w.hammerMode, frenzy: Math.ceil(w.frenzyT) })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const top = 66
    const bottom = 76
    const cell = Math.floor(Math.min((W - 20) / COLS, (H - top - bottom - 8) / (ROWS + 1.35)))
    const gx = Math.round((W - cell * COLS) / 2)
    const gy = H - bottom - ROWS * cell
    return { W, H, cell, gx, gy, bottom }
  }

  function center(col: number, row: number) {
    const { cell, gx, gy } = geo()
    return { x: gx + (col + 0.5) * cell, y: gy + (ROWS - 1 - row + 0.5) * cell }
  }

  function height(col: number) {
    const g = world.current.grid[col]
    let h = 0
    while (h < ROWS && g[h]) h++
    return h
  }

  function canPlace(col: number, s: Spawn = world.current.cur) {
    const h = height(col)
    if (h < ROWS) return true
    if (s.special) return true
    const top = world.current.grid[col][ROWS - 1]
    return !!top && !top.special && top.e === s.e
  }

  function anyRoom() {
    for (let c = 0; c < COLS; c++) if (canPlace(c)) return true
    return false
  }

  function allBlocks(): Block[] {
    const out: Block[] = []
    for (const col of world.current.grid) for (const b of col) if (b) out.push(b)
    return out
  }

  function findBlock(id: number): Block | null {
    for (const col of world.current.grid) for (const b of col) if (b && b.id === id) return b
    return null
  }

  function enqueue(id: number) {
    const q = world.current.queue
    if (!q.includes(id)) q.push(id)
  }

  /** Gravity: compact every column; moved blocks get re-checked for merges. */
  function compact() {
    const w = world.current
    for (let c = 0; c < COLS; c++) {
      const col = w.grid[c]
      let wr = 0
      for (let r = 0; r <= ROWS; r++) {
        const b = col[r]
        if (!b) continue
        if (r !== wr) {
          col[wr] = b
          col[r] = null
          b.row = wr
          enqueue(b.id)
        }
        wr++
      }
    }
  }

  function limit() {
    const w = world.current
    return Math.max(4, 10 - (w.clock - 50) / 40) + run.level('calm') * 1.5
  }

  function roll(): Spawn {
    const w = world.current
    if (w.clock > 35) {
      w.wildIn -= 1
      if (w.wildIn <= 0) {
        w.wildIn = Math.round(rand(18, 26))
        announce('wild')
        return { e: w.minE, special: 'wild' }
      }
    }
    if (w.clock > 80) {
      w.bombIn -= 1
      if (w.bombIn <= 0) {
        w.bombIn = Math.round(rand(24, 32))
        announce('bomb')
        return { e: w.minE, special: 'bomb' }
      }
    }
    const span = clamp(w.bestE - w.minE - 2, 2, 5)
    let total = 0
    for (let i = 0; i <= span; i++) total += Math.pow(0.55, i)
    let q = Math.random() * total
    let i = 0
    for (; i < span; i++) {
      q -= Math.pow(0.55, i)
      if (q <= 0) break
    }
    return { e: w.minE + i, special: '' }
  }

  function announce(s: Special) {
    const w = world.current
    if (w.announced.includes(s)) return
    w.announced.push(s)
    setBanner({ key: Date.now() + 5, text: s === 'wild' ? 'NEW: Wild Block!' : 'NEW: Bomb Block!', sub: s === 'wild' ? 'copies its neighbour and merges' : 'blasts the blocks around it' })
    sfx.power()
  }

  // ── Actions ─────────────────────────────────────
  function dropInto(col: number) {
    const w = world.current
    const ph = phaseRef.current
    if ((ph !== 'play' && ph !== 'idle') || w.busy !== 'ready' || w.hammerMode) return
    if (!canPlace(col)) {
      const c = center(col, ROWS - 1)
      fx.text(c.x, c.y, 'FULL!', '#fca5a5', 18)
      fx.shake(4, 0.15)
      sfx.miss()
      haptic.error()
      return
    }
    const row = height(col)
    const b: Block = { id: w.nextId++, e: w.cur.e, special: w.cur.special, col, row, vx: col, vy: ROWS + 0.35, fallV: 10, pop: 0, sq: 0 }
    w.grid[col][row] = b
    w.falling = b
    w.busy = 'fall'
    w.cur = w.next
    w.next = roll()
    w.timer = limit()
    w.noRoom = false
    if (ph === 'play') {
      sfx.whoosh()
      haptic.light()
    }
  }

  function land(b: Block) {
    const w = world.current
    const c = center(b.col, b.row)
    const { cell } = geo()
    b.sq = 0.2
    w.falling = null
    w.busy = 'resolve'
    w.queue = []
    w.stepT = 0.03
    w.combo = 0
    w.giftSwap = false
    fx.burst(c.x, c.y + cell * 0.45, { count: 6, color: ['#e0f2fe', '#ffffff'], speed: 90, angle: -Math.PI / 2, spread: 2.4, gravity: 300, size: 2 })
    if (phaseRef.current === 'play') sfx.thud()
    if (b.special === 'bomb') {
      explode(b)
      return
    }
    if (b.special === 'wild') {
      const nbrs = neighbours(b)
      let pick = w.minE
      let bestN = -1
      for (const n of nbrs) {
        if (n.special) continue
        const cnt = nbrs.filter((m) => !m.special && m.e === n.e).length
        if (cnt > bestN || (cnt === bestN && n.e > pick)) {
          bestN = cnt
          pick = n.e
        }
      }
      b.special = ''
      b.e = pick
      b.pop = 1
      fx.burst(c.x, c.y, { count: 20, color: ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#a855f7'], speed: 200, gravity: 100 })
      if (phaseRef.current === 'play') sfx.power()
    }
    enqueue(b.id)
  }

  function neighbours(b: Block): Block[] {
    const g = world.current.grid
    const out: Block[] = []
    const add = (c: number, r: number) => {
      if (c < 0 || c >= COLS || r < 0 || r > ROWS) return
      const n = g[c][r]
      if (n) out.push(n)
    }
    add(b.col, b.row - 1)
    add(b.col - 1, b.row)
    add(b.col + 1, b.row)
    add(b.col, b.row + 1)
    return out
  }

  function explode(b: Block) {
    const w = world.current
    const { cell } = geo()
    const c = center(b.col, b.row)
    let n = 0
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const cc = b.col + dc
        const rr = b.row + dr
        if (cc < 0 || cc >= COLS || rr < 0 || rr > ROWS) continue
        const o = w.grid[cc][rr]
        if (!o) continue
        w.grid[cc][rr] = null
        if (o !== b) {
          n++
          w.score += Math.round(Math.pow(2, o.e) * 0.5)
          const oc = center(cc, rr)
          fx.burst(oc.x, oc.y, { count: 12, color: [styleOf(o.e).mid, styleOf(o.e).top], speed: 240, shape: 'square', size: 5, gravity: 600 })
        }
      }
    }
    fx.explode(c.x, c.y, 1.6)
    fx.ring(c.x, c.y, { color: '#fde047', maxR: cell * 1.8, life: 0.4, width: 5 })
    fx.text(c.x, c.y - cell * 0.6, n ? `BOOM! x${n}` : 'BOOM!', '#fde047', 20)
    fx.flash('#fff7ed', 0.16)
    fx.stop(0.08)
    if (phaseRef.current === 'play') {
      sfx.boom(0.8)
      haptic.heavy()
    }
    w.stats.score = w.score
    compact()
    pushHud()
  }

  /** One merge group per round so cascades read clearly. */
  function doRound(): boolean {
    const w = world.current
    const play = phaseRef.current === 'play'
    while (w.queue.length) {
      const b = findBlock(w.queue[0])
      if (!b || b.special) {
        w.queue.shift()
        continue
      }
      const same = neighbours(b).filter((n) => !n.special && n.e === b.e)
      if (!same.length) {
        w.queue.shift()
        continue
      }
      const { cell } = geo()
      for (const n of same) {
        w.ghosts.push({ x: n.col, y: n.row, tx: b.col, ty: b.row, t: 0, e: n.e })
        w.grid[n.col][n.row] = null
        const qi = w.queue.indexOf(n.id)
        if (qi >= 0) w.queue.splice(qi, 1)
      }
      b.e += same.length
      b.pop = 1
      w.combo += 1
      const gain = Math.round(Math.pow(2, b.e) * w.combo * (w.frenzyT > 0 ? 2 : 1))
      const c = center(b.col, b.row)
      const st = styleOf(b.e)
      if (play) {
        w.score += gain
        w.stats.merges += same.length
        w.stats.combo = Math.max(w.stats.combo, w.combo)
        w.stats.score = w.score
        fx.text(c.x, c.y - cell * 0.55, w.combo > 1 ? `+${gain} x${w.combo}` : `+${gain}`, w.combo > 2 ? '#fde047' : '#ffffff', 15 + Math.min(9, w.combo * 2))
        sfx.pop()
        sfx.score(Math.min(10, w.combo * 2 + same.length))
        if (same.length >= 2) sfx.match()
        if (w.combo >= 3) {
          sfx.combo()
          setBanner({ key: Date.now(), text: `CASCADE x${w.combo}`, sub: w.combo >= 5 ? 'unstoppable!' : undefined })
          if (w.combo >= 4 && !w.giftSwap) {
            w.giftSwap = true
            w.swaps += 1
            fx.text(c.x, c.y + cell * 0.4, '+1 SWAP', '#93c5fd', 15)
          }
        }
        if (b.e >= 9) {
          fx.shake(3 + (b.e - 8), 0.22)
          fx.stop(0.05)
          haptic.heavy()
        } else haptic.medium()
        if (b.e > w.bestE) newBest(b, c.x, c.y)
      }
      fx.ring(c.x, c.y, { color: st.top, maxR: cell * (0.8 + same.length * 0.25), life: 0.32, width: 3 })
      fx.burst(c.x, c.y, { count: 10 + same.length * 6, color: [st.mid, st.top, '#ffffff'], speed: 170 + same.length * 40, shape: 'spark', gravity: 80 })
      w.bestE = Math.max(w.bestE, b.e)
      compact()
      if (play) {
        run.update(w.stats)
        pushHud()
      }
      return true
    }
    return false
  }

  function newBest(b: Block, x: number, y: number) {
    const w = world.current
    w.bestE = b.e
    w.stats.best = Math.pow(2, b.e)
    if (b.e >= 6) {
      setBanner({ key: Date.now() + 1, text: `NEW: ${tierName(b.e)}!`, sub: `next: ${tierName(b.e + 1)}` })
      sfx.levelUp()
      fx.flash('#dbeafe', 0.12)
    } else fx.text(x, y - 40, label(b.e) + '!', '#bfdbfe', 18)
    if (b.e >= 7) {
      w.hammers += 1
      fx.text(x, y + 30, '+1 HAMMER', '#fdba74', 15)
    }
    if (b.e >= 9 && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'dropmerge', kind: 'tier', value: Math.pow(2, b.e) })
    }
  }

  function finishResolve() {
    const w = world.current
    const play = phaseRef.current === 'play'
    // Overflow guard: something left above the board.
    for (let c = 0; c < COLS; c++) {
      if (w.grid[c][ROWS]) {
        if (play) die()
        else resetIdle()
        return
      }
    }
    if (w.bestE >= w.minE + 8) {
      const old = w.minE
      w.minE += 1
      let n = 0
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const b = w.grid[c][r]
          if (b && !b.special && b.e < w.minE) {
            w.grid[c][r] = null
            n++
            const p = center(c, r)
            fx.burst(p.x, p.y, { count: 14, color: [styleOf(b.e).mid, '#ffffff'], speed: 200, gravity: 200 })
            fx.ring(p.x, p.y, { color: '#ffffff', maxR: 30, life: 0.3 })
          }
        }
      }
      if (w.cur.e < w.minE && !w.cur.special) w.cur.e = w.minE
      if (w.next.e < w.minE && !w.next.special) w.next.e = w.minE
      if (play) {
        w.stats.purges += 1
        w.score += n * 20
        w.stats.score = w.score
        setBanner({ key: Date.now() + 2, text: `${label(old)}s CLEARED!`, sub: `blocks now start at ${label(w.minE)}` })
        sfx.win()
        haptic.success()
        fx.flash('#ffffff', 0.15)
        run.update(w.stats)
      }
      compact()
      w.stepT = 0.35
      return
    }
    w.busy = 'ready'
    w.combo = 0
    if (!anyRoom()) {
      if (!play) {
        resetIdle()
        return
      }
      if (w.hammers + w.swaps > 0) {
        w.noRoom = true
        setBanner({ key: Date.now() + 3, text: 'NO ROOM!', sub: 'use a hammer or swap' })
        sfx.miss()
      } else die()
    }
    if (play) pushHud()
  }

  function swap() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.swaps <= 0 || w.busy !== 'ready') return
    const t = w.cur
    w.cur = w.next
    w.next = t
    w.swaps -= 1
    sfx.flip()
    haptic.light()
    if (!anyRoom()) {
      if (w.hammers + w.swaps <= 0) die()
    } else w.noRoom = false
    pushHud()
  }

  function toggleHammer() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.busy !== 'ready') return
    if (w.hammerMode) w.hammerMode = false
    else if (w.hammers > 0) w.hammerMode = true
    sfx.tap()
    pushHud()
  }

  function hammerAt(col: number, row: number) {
    const w = world.current
    const b = w.grid[col]?.[row]
    if (!b) return
    const { cell } = geo()
    const c = center(col, row)
    w.grid[col][row] = null
    w.hammers -= 1
    w.hammerMode = false
    fx.burst(c.x, c.y, { count: 22, color: [styleOf(b.e).mid, styleOf(b.e).top, '#ffffff'], speed: 260, shape: 'square', size: 5, gravity: 700 })
    fx.ring(c.x, c.y, { color: '#fdba74', maxR: cell, life: 0.3 })
    fx.text(c.x, c.y - 20, 'SMASH!', '#fdba74', 20)
    fx.shake(6, 0.18)
    fx.stop(0.06)
    sfx.clang()
    sfx.boom(0.3)
    haptic.heavy()
    w.queue = []
    compact()
    w.busy = 'resolve'
    w.stepT = 0.15
    w.combo = 0
    w.noRoom = false
    pushHud()
  }

  // ── Lifecycle ───────────────────────────────────
  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.hammers = 1 + run.level('hammer')
    w.cur = { e: 1, special: '' }
    w.next = { e: 2, special: '' }
    world.current = w
    fx.reset()
    spriteCache.clear()
    run.begin()
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'DROP MERGE', sub: 'tap a column to drop' })
    sfx.ready()
    pushHud()
  }

  function resetIdle() {
    const w = world.current
    for (const b of allBlocks()) {
      const c = center(b.col, b.row)
      fx.burst(c.x, c.y, { count: 4, color: [styleOf(b.e).mid], speed: 120 })
    }
    w.grid = emptyGrid()
    w.busy = 'ready'
    w.bestE = 1
    w.minE = 1
  }

  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    w.hammerMode = false
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.5)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    const { W, gy } = geo()
    fx.text(W / 2, gy + 30, 'NO ROOM LEFT!', '#fecaca', 26)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.score / 1000 + w.bestE * 1.5 + w.stats.purges * 2) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.bestE >= 9, stats: { ...w.stats }, coins }, revive)
      pushHud()
    }, 1200)
  }

  /** Revive: smash the smallest blocks (high tiers stay) and hand over a hammer. */
  function revive() {
    const w = world.current
    const blocks = allBlocks().sort((a, b) => a.e - b.e)
    const target = Math.max(10, Math.ceil(blocks.length * 0.4))
    for (let i = 0; i < Math.min(target, blocks.length); i++) {
      const b = blocks[i]
      w.grid[b.col][b.row] = null
      const c = center(b.col, b.row)
      fx.burst(c.x, c.y, { count: 10, color: [styleOf(b.e).mid, '#ffffff'], speed: 180, gravity: 300 })
    }
    for (let c = 0; c < COLS; c++) w.grid[c][ROWS] = null
    w.queue = []
    w.falling = null
    compact()
    w.queue = []
    w.busy = 'ready'
    w.hammers += 1
    w.noRoom = false
    w.timer = limit() + 3
    fx.ring(size.current.w / 2, size.current.h / 2, { color: '#93c5fd', maxR: 240, life: 0.6, width: 5 })
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'board cleared · +1 hammer' })
    setPhaseBoth('play')
    pushHud()
  }

  // ── Input ───────────────────────────────────────
  function cellAt(e: PointerEvent<HTMLDivElement>) {
    const p = localPoint(e, e.currentTarget)
    const { cell, gx, gy } = geo()
    const col = Math.floor((p.x - gx) / cell)
    const row = ROWS - 1 - Math.floor((p.y - gy) / cell)
    return { col: clamp(col, 0, COLS - 1), row, inside: col >= 0 && col < COLS && row >= 0 && row < ROWS }
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const w = world.current
    const c = cellAt(e)
    if (w.hammerMode) {
      if (c.inside) hammerAt(c.col, c.row)
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    pointer.current = e.pointerId
    w.hover = c.col
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId) return
    world.current.hover = cellAt(e).col
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId) return
    pointer.current = null
    const w = world.current
    const col = cellAt(e).col
    w.hover = null
    dropInto(col)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const w = world.current
      if (e.key >= '1' && e.key <= '5') dropInto(Number(e.key) - 1)
      else if (e.key === 'ArrowLeft') w.hover = clamp((w.hover ?? 2) - 1, 0, COLS - 1)
      else if (e.key === 'ArrowRight') w.hover = clamp((w.hover ?? 2) + 1, 0, COLS - 1)
      else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        dropInto(w.hover ?? 2)
      } else if (e.key === 's') swap()
      else if (e.key === 'h') toggleHammer()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Tick ────────────────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    let settled = true
    for (const b of allBlocks()) {
      b.vx += (b.col - b.vx) * Math.min(1, dt * 20)
      if (b.vy > b.row) {
        b.fallV += 75 * dt
        b.vy -= b.fallV * dt
        settled = false
        if (b.vy <= b.row) {
          b.vy = b.row
          if (b.fallV > 6 && b !== w.falling) b.sq = Math.min(0.16, b.fallV / 90)
          b.fallV = 0
        }
      } else b.vy = b.row
      b.pop = Math.max(0, b.pop - raw * 3.5)
      b.sq = Math.max(0, b.sq - raw * 1.8)
    }
    for (const g of w.ghosts) g.t += raw * 7
    if (w.ghosts.length) w.ghosts = w.ghosts.filter((g) => g.t < 1)

    if (w.busy === 'fall' && w.falling) {
      if (w.falling.vy <= w.falling.row) land(w.falling)
    } else if (w.busy === 'resolve' && dt > 0) {
      w.stepT -= dt
      if (w.stepT <= 0 && settled) {
        if (doRound()) w.stepT = 0.16
        else finishResolve()
      }
    }

    if (ph === 'play') {
      w.clock += dt
      if (w.clock >= w.nextFrenzy) {
        w.nextFrenzy += 75
        w.frenzyT = 15
        setBanner({ key: Date.now() + 4, text: 'GOLDEN HOUR!', sub: 'double points for 15s' })
        sfx.power()
      }
      if (w.frenzyT > 0) {
        const before = Math.ceil(w.frenzyT)
        w.frenzyT = Math.max(0, w.frenzyT - dt)
        if (Math.ceil(w.frenzyT) !== before) pushHud()
      }
      if (w.clock > 50 && w.busy === 'ready' && !w.noRoom && !w.hammerMode) {
        if (w.timer > 50) w.timer = limit()
        const before = w.timer
        w.timer -= dt
        if (w.timer < 3 && Math.ceil(before) !== Math.ceil(w.timer)) sfx.tick()
        if (w.timer <= 0) {
          const ok: number[] = []
          const merge: number[] = []
          for (let c = 0; c < COLS; c++) {
            if (!canPlace(c)) continue
            ok.push(c)
            const h = height(c)
            const top = h > 0 ? w.grid[c][h - 1] : null
            if (top && top.e === w.cur.e) merge.push(c)
          }
          const pool = merge.length ? merge : ok
          if (pool.length) {
            fx.text(size.current.w / 2, geo().gy - 40, 'AUTO DROP', '#fca5a5', 16)
            dropInto(pool[Math.floor(Math.random() * pool.length)])
          }
        }
      }
    } else if (ph === 'idle') {
      w.idleT -= raw
      if (w.idleT <= 0 && w.busy === 'ready') {
        w.idleT = 0.55
        const ok: number[] = []
        for (let c = 0; c < COLS; c++) if (canPlace(c)) ok.push(c)
        if (ok.length) dropInto(ok[Math.floor(Math.random() * ok.length)])
        else resetIdle()
      }
    }
  }

  // ── Render ──────────────────────────────────────
  function drawB(ctx: CanvasRenderingContext2D, e: number, special: Special, x: number, y: number, c: number, sx: number, sy: number, t: number, alpha = 1) {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(x, y + (c * (1 - sy)) / 2)
    ctx.scale(sx, sy)
    if (special === 'bomb') drawBomb(ctx, c, t)
    else if (special === 'wild') drawWild(ctx, c, t)
    else ctx.drawImage(blockSprite(e, c), -c / 2, -c / 2, c, c)
    ctx.restore()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    update(dt, raw)
    const { cell, gx, gy } = geo()

    // background: deep blue with parallax stars and drifting tiles
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, w.frenzyT > 0 ? '#3b2f0b' : '#0b1d4a')
    bg.addColorStop(1, '#1e3a8a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer ? 'rgba(191,219,254,0.8)' : 'rgba(191,219,254,0.4)'
      for (let i = 0; i < 18; i++) {
        const x = (i * 83 + layer * 41) % W
        const y = ((i * 137 + layer * 59) % H + t * (6 + layer * 10)) % H
        ctx.beginPath()
        ctx.arc(x, y, 0.8 + layer * 0.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 0.07
    for (let i = 0; i < 6; i++) {
      const s = 30 + i * 9
      const x = (i * 71 + Math.sin(t * 0.2 + i) * 20 + W) % W
      const y = (H - ((t * (5 + i) + i * 120) % (H + 80))) + 40
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(t * 0.1 + i)
      ctx.fillStyle = ['#60a5fa', '#a78bfa', '#34d399'][i % 3]
      ctx.beginPath()
      ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.25)
      ctx.fill()
      ctx.restore()
    }
    ctx.globalAlpha = 1

    fx.applyShake(ctx)
    // board frame
    ctx.fillStyle = 'rgba(2,6,23,0.55)'
    ctx.beginPath()
    ctx.roundRect(gx - 8, gy - 8, cell * COLS + 16, cell * ROWS + 16, 16)
    ctx.fill()
    ctx.strokeStyle = 'rgba(147,197,253,0.35)'
    ctx.lineWidth = 2
    ctx.stroke()
    for (let c = 0; c < COLS; c++) {
      const h = height(c)
      const hot = w.hover === c && ph === 'play'
      const dangerCol = h >= ROWS - 1
      ctx.fillStyle = hot ? (canPlace(c) ? 'rgba(96,165,250,0.28)' : 'rgba(239,68,68,0.3)') : dangerCol ? `rgba(239,68,68,${0.12 + Math.sin(t * 6) * 0.06})` : 'rgba(30,58,138,0.45)'
      ctx.beginPath()
      ctx.roundRect(gx + c * cell + 2, gy, cell - 4, cell * ROWS, 10)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(147,197,253,0.08)'
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      ctx.beginPath()
      ctx.arc(gx + (c + 0.5) * cell, gy + (r + 0.5) * cell, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // launcher + landing preview
    if (ph === 'play' || ph === 'idle') {
      const col = w.hover ?? 2
      const lc = center(col, ROWS)
      const ly = gy - cell * 0.62
      if (w.busy === 'ready' && !w.hammerMode) {
        if (ph === 'play') {
          const h = height(col)
          const tr = Math.min(h, ROWS - 1)
          const tc = center(col, tr)
          ctx.strokeStyle = 'rgba(255,255,255,0.4)'
          ctx.setLineDash([4, 6])
          ctx.lineDashOffset = -t * 30
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(lc.x, ly + cell * 0.45)
          ctx.lineTo(lc.x, tc.y - cell * 0.5)
          ctx.stroke()
          ctx.setLineDash([])
          if (h < ROWS) drawB(ctx, w.cur.e, w.cur.special, tc.x, tc.y, cell * 0.92, 1, 1, t, 0.22)
        }
        const bob = Math.sin(t * 4) * 2
        drawB(ctx, w.cur.e, w.cur.special, lc.x, ly + bob, cell * 0.86, 1, 1, t)
        if (ph === 'play' && w.clock > 50 && !w.noRoom) {
          const k = clamp(w.timer / limit(), 0, 1)
          ctx.strokeStyle = k < 0.3 ? '#f87171' : '#93c5fd'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(lc.x, ly + bob, cell * 0.58, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k)
          ctx.stroke()
        }
      }
    }

    // blocks
    for (const b of allBlocks()) {
      const p = center(b.vx, b.vy)
      const pop = b.pop > 0 ? 1 + Math.sin(b.pop * Math.PI) * 0.18 : 1
      drawB(ctx, b.e, b.special, gx + (b.vx + 0.5) * cell, p.y, cell * 0.92, (1 + b.sq) * pop, (1 - b.sq) * pop, t)
      if (w.hammerMode && b.vy < ROWS) {
        ctx.strokeStyle = `rgba(253,186,116,${0.6 + Math.sin(t * 10) * 0.3})`
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.roundRect(gx + b.vx * cell + 3, p.y - cell * 0.46, cell - 6, cell * 0.92, cell * 0.2)
        ctx.stroke()
      }
    }
    for (const g of w.ghosts) {
      const k = 1 - Math.pow(1 - Math.min(1, g.t), 3)
      const x = g.x + (g.tx - g.x) * k
      const y = g.y + (g.ty - g.y) * k
      const p = center(x, y)
      drawB(ctx, g.e, '', gx + (x + 0.5) * cell, p.y, cell * 0.92 * (1 - k * 0.35), 1, 1, t, 1 - k * 0.6)
    }

    fx.draw(ctx)
    ctx.restore()

    if (ph !== 'idle') {
      // next preview
      const nx = W - 40
      const ny = 36
      ctx.fillStyle = 'rgba(2,6,23,0.45)'
      ctx.beginPath()
      ctx.roundRect(nx - 24, ny - 24, 48, 48, 12)
      ctx.fill()
      ctx.strokeStyle = 'rgba(191,219,254,0.6)'
      ctx.lineWidth = 2
      ctx.stroke()
      drawB(ctx, w.next.e, w.next.special, nx, ny, 36, 1, 1, t)
      ctx.fillStyle = '#dbeafe'
      ctx.font = "800 9px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('NEXT', nx, ny + 27)

      // tier ladder
      const lx0 = 72
      const lx1 = W - 72
      const n = 8
      const first = Math.max(w.minE, w.bestE - 5)
      const step = (lx1 - lx0) / n
      const ly = H - 28
      const s = Math.min(24, step * 0.86)
      ctx.fillStyle = 'rgba(2,6,23,0.45)'
      ctx.beginPath()
      ctx.roundRect(lx0 - 6, ly - s / 2 - 6, lx1 - lx0 + 12, s + 12, 10)
      ctx.fill()
      for (let i = 0; i < n; i++) {
        const e = first + i
        const x = lx0 + step * (i + 0.5)
        const goal = e === w.bestE + 1
        ctx.globalAlpha = e <= w.bestE ? 1 : goal ? 0.8 : 0.25
        const pulse = goal ? 1 + Math.sin(t * 5) * 0.1 : 1
        ctx.drawImage(blockSprite(e, s), x - (s * pulse) / 2, ly - (s * pulse) / 2, s * pulse, s * pulse)
        if (goal) {
          ctx.globalAlpha = 1
          ctx.strokeStyle = '#fde047'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.roundRect(x - s / 2 - 3, ly - s / 2 - 3, s + 6, s + 6, 7)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      ctx.fillStyle = '#dbeafe'
      ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`next: ${tierName(w.bestE + 1)}`, (lx0 + lx1) / 2, ly - s / 2 - 8)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  // Dev-only probe for scripted end-to-end tests.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__dropmerge = () => {
      const w = world.current
      return {
        busy: w.busy,
        noRoom: w.noRoom,
        cur: w.cur.e,
        tops: w.grid.map((col, c) => {
          const h = height(c)
          return { h, e: h ? col[h - 1]?.e ?? -1 : -1 }
        }),
      }
    }
    return () => {
      delete win.__dropmerge
    }
  }, [])

  const won = hud.best >= 9
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena dm-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="dm-sub">Best: {label(hud.best)}</div>
                {hud.frenzy > 0 ? <span className="dm-pill">GOLDEN HOUR x2 · {hud.frenzy}s</span> : null}
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'dying' ? (
            <>
              <button type="button" className="dm-helper is-left" aria-label="Swap current and next block" disabled={hud.swaps <= 0} onPointerDown={(e) => e.stopPropagation()} onClick={swap}>
                <SwapIcon />
                <span className="dm-helper__n">{hud.swaps}</span>
              </button>
              <button
                type="button"
                className={`dm-helper is-right${hud.hammerMode ? ' is-on' : ''}`}
                aria-label="Hammer a block"
                disabled={hud.hammers <= 0 && !hud.hammerMode}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={toggleHammer}
              >
                <HammerIcon />
                <span className="dm-helper__n">{hud.hammers}</span>
              </button>
            </>
          ) : null}
          {hud.hammerMode && phase === 'play' ? <div className="dm-hint">Tap a block to smash it</div> : null}
          {banner && phase === 'play' ? (
            <div className="action-banner dm-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="dropmerge"
              icon={meta.icon}
              title={meta.title}
              hint="Tap a column to drop the block. Equal neighbours merge and cascade — keep the columns from overflowing."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Merge machine!' : 'Out of room'}
            subtitle={`Score ${hud.score} · best block ${label(hud.best)}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
