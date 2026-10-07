import { useEffect, useRef, useState, type PointerEvent } from 'react'
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
import { drawStone, drawTile, drawWild, label, styleOf, tierName } from './art'
import '../../shared/action/action.css'
import './chainmerge.css'

const meta = getGame('chainmerge')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Kind = 'n' | 'stone' | 'wild'
type Tile = { id: number; e: number; kind: Kind; golden: boolean; vx: number; vy: number; fallV: number; pop: number }
type Cell = { c: number; r: number }
type Ghost = { x: number; y: number; tx: number; ty: number; t: number; e: number; kind: Kind }

const COLS = 5
const ROWS = 7

type World = {
  grid: (Tile | null)[][]
  nextId: number
  path: Cell[]
  busy: number
  ghosts: Ghost[]
  score: number
  bestE: number
  minE: number
  clock: number
  shuffles: number
  hammers: number
  hammerMode: boolean
  noMoves: boolean
  stonesOn: boolean
  wildOn: boolean
  nextLucky: number
  coins: number
  postCheck: boolean
  idleT: number
  stats: { score: number; best: number; chains: number; longest: number; stones: number }
}

function emptyGrid(): (Tile | null)[][] {
  return Array.from({ length: COLS }, () => Array.from({ length: ROWS }, () => null))
}

function freshWorld(): World {
  return {
    grid: emptyGrid(),
    nextId: 1,
    path: [],
    busy: 0,
    ghosts: [],
    score: 0,
    bestE: 3,
    minE: 1,
    clock: 0,
    shuffles: 1,
    hammers: 1,
    hammerMode: false,
    noMoves: false,
    stonesOn: false,
    wildOn: false,
    nextLucky: 150,
    coins: 0,
    postCheck: false,
    idleT: 1,
    stats: { score: 0, best: 8, chains: 0, longest: 0, stones: 0 },
  }
}

const spriteCache = new Map<string, HTMLCanvasElement>()
function tileSprite(e: number, d: number) {
  const px = Math.max(8, Math.round(d))
  const key = `${e}|${px}`
  const hit = spriteCache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const cv = document.createElement('canvas')
  const dim = Math.ceil(px * 1.15)
  cv.width = Math.ceil(dim * dpr)
  cv.height = Math.ceil(dim * dpr)
  const g = cv.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate(dim / 2, dim / 2)
  drawTile(g, e, px)
  spriteCache.set(key, cv)
  if (spriteCache.size > 80) {
    const first = spriteCache.keys().next().value
    if (first) spriteCache.delete(first)
  }
  return cv
}

const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7h4c4 0 6 10 10 10h4M3 17h4c1.6 0 2.8-1.6 3.8-3.4M13.2 9.4C14.2 7.6 15.4 7 17 7h4M18 4l3 3-3 3M18 14l3 3-3 3" />
  </svg>
)
const HammerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4l6 6-3 3-6-6zM11 7l-8 8 3 3 8-8" />
  </svg>
)

export default function ChainMergeGame() {
  const run = useActionRun('chainmerge')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const pointer = useRef<number | null>(null)
  const lastEvent = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, best: 3, shuffles: 0, hammers: 0, hammerMode: false, noMoves: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, best: w.bestE, shuffles: w.shuffles, hammers: w.hammers, hammerMode: w.hammerMode, noMoves: w.noMoves })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const top = 112
    const bottom = 80
    const cell = Math.floor(Math.min((W - 16) / COLS, (H - top - bottom) / ROWS))
    const gx = Math.round((W - cell * COLS) / 2)
    const gy = Math.round(top + (H - top - bottom - cell * ROWS) / 2)
    return { W, H, cell, gx, gy }
  }

  function center(c: number, r: number) {
    const { cell, gx, gy } = geo()
    return { x: gx + (c + 0.5) * cell, y: gy + (r + 0.5) * cell }
  }

  function spawn(): Tile {
    const w = world.current
    const t: Tile = { id: w.nextId++, e: w.minE, kind: 'n', golden: false, vx: 0, vy: 0, fallV: 0, pop: 0 }
    if (w.stonesOn && Math.random() < Math.min(0.12, 0.035 + (w.clock - 60) / 1600)) {
      t.kind = 'stone'
      return t
    }
    if (w.wildOn && Math.random() < 0.025) {
      t.kind = 'wild'
      return t
    }
    const span = clamp(w.bestE - w.minE - 3, 2, 5)
    let total = 0
    for (let i = 0; i <= span; i++) total += Math.pow(0.5, i)
    let q = Math.random() * total
    let i = 0
    for (; i < span; i++) {
      q -= Math.pow(0.5, i)
      if (q <= 0) break
    }
    t.e = w.minE + i
    t.golden = w.clock > 30 && Math.random() < 0.03
    return t
  }

  function fillBoard() {
    const w = world.current
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const t = spawn()
        t.vx = c
        t.vy = r - ROWS - 1 - Math.random() * 0.5
        w.grid[c][r] = t
      }
    }
    if (!hasMove()) shuffleTiles(false)
  }

  function hasMove() {
    const g = world.current.grid
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const a = g[c][r]
        if (!a || a.kind === 'stone') continue
        for (let dc = -1; dc <= 1; dc++) {
          for (let dr = -1; dr <= 1; dr++) {
            if (!dc && !dr) continue
            const b = g[c + dc]?.[r + dr]
            if (!b || b.kind === 'stone') continue
            if (a.kind === 'wild' || b.kind === 'wild' || a.e === b.e) return true
          }
        }
      }
    }
    return false
  }

  /** Effective values along the path (wild tiles copy the previous tile). */
  function pathEffs(path: Cell[]) {
    const g = world.current.grid
    const out: number[] = []
    for (let i = 0; i < path.length; i++) {
      const t = g[path[i].c][path[i].r]!
      out.push(t.kind === 'wild' ? (i ? out[i - 1] : 0) : t.e)
    }
    return out
  }

  function canExtend(c: number, r: number) {
    const w = world.current
    const p = w.path
    const last = p[p.length - 1]
    if (Math.abs(last.c - c) > 1 || Math.abs(last.r - r) > 1) return false
    if (p.some((q) => q.c === c && q.r === r)) return false
    const t = w.grid[c][r]
    if (!t || t.kind === 'stone') return false
    if (t.kind === 'wild') return true
    const effs = pathEffs(p)
    const prev = effs[effs.length - 1]
    if (p.length === 1) return t.e === prev
    return t.e === prev || t.e === prev + 1
  }

  function resultOf(path: Cell[]) {
    const effs = pathEffs(path)
    let sum = 0
    for (const e of effs) sum += Math.pow(2, e)
    return Math.floor(Math.log2(sum) + 1e-9)
  }

  function gravity() {
    const w = world.current
    for (let c = 0; c < COLS; c++) {
      const col = w.grid[c]
      const keep: Tile[] = []
      for (let r = ROWS - 1; r >= 0; r--) if (col[r]) keep.push(col[r]!)
      let k = 0
      for (let r = ROWS - 1; r >= 0; r--) {
        if (k < keep.length) col[r] = keep[k++]
        else {
          const t = spawn()
          t.vx = c
          t.vy = -1 - (ROWS - 1 - r - keep.length) * 1.05 - 0.3
          col[r] = t
        }
      }
    }
  }

  // ── Actions ─────────────────────────────────────
  function commit() {
    const w = world.current
    const path = w.path
    w.path = []
    if (path.length < 2) return
    const play = phaseRef.current === 'play'
    const effs = pathEffs(path)
    const res = resultOf(path)
    const last = path[path.length - 1]
    const lt = w.grid[last.c][last.r]!
    let golden = 0
    path.forEach((p, i) => {
      const t = w.grid[p.c][p.r]!
      if (t.golden) golden++
      if (i === path.length - 1) return
      w.ghosts.push({ x: p.c, y: p.r, tx: last.c, ty: last.r, t: -i * 0.06, e: effs[i], kind: t.kind })
      w.grid[p.c][p.r] = null
    })
    lt.e = res
    lt.kind = 'n'
    lt.golden = false
    lt.pop = 1
    const { cell } = geo()
    const cpt = center(last.c, last.r)
    const st = styleOf(res)
    const len = path.length
    const gain = Math.round(Math.pow(2, res) * (1 + Math.max(0, len - 3) * 0.25) * (golden ? 2 : 1))
    // break stones next to the result
    let broke = 0
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const s = w.grid[last.c + dc]?.[last.r + dr]
      if (s && s.kind === 'stone') {
        w.grid[last.c + dc][last.r + dr] = null
        broke++
        const sp = center(last.c + dc, last.r + dr)
        fx.burst(sp.x, sp.y, { count: 16, color: ['#a8a29e', '#57534e', '#d6d3d1'], speed: 240, shape: 'square', size: 5, gravity: 700 })
      }
    }
    fx.burst(cpt.x, cpt.y, { count: 12 + len * 3, color: [st.mid, st.hi, '#ffffff'], speed: 150 + len * 22, shape: 'spark', gravity: 60 })
    fx.burst(cpt.x, cpt.y, { count: 8 + len, color: [st.mid, st.lo], speed: 120, gravity: 300, size: 4 })
    fx.ring(cpt.x, cpt.y, { color: st.hi, maxR: cell * (0.8 + len * 0.08), life: 0.35, width: 3 })
    if (play) {
      w.score += gain + broke * 25
      w.stats.score = w.score
      w.stats.chains += 1
      w.stats.longest = Math.max(w.stats.longest, len)
      w.stats.stones += broke
      fx.text(cpt.x, cpt.y - cell * 0.6, `+${gain}`, len >= 5 ? '#fde047' : '#ffffff', 16 + Math.min(10, len))
      if (broke) fx.text(cpt.x, cpt.y + cell * 0.55, broke > 1 ? `${broke} STONES!` : 'STONE!', '#e7e5e4', 14)
      if (golden) {
        w.coins += golden
        fx.text(cpt.x, cpt.y - cell, `GOLD x2 +${golden} coin`, '#fde047', 15)
        fx.burst(cpt.x, cpt.y, { count: 14, color: ['#fde047', '#fbbf24'], speed: 220, shape: 'square', size: 4, gravity: 400 })
      }
      sfx.pop()
      if (len >= 4) sfx.match()
      if (len >= 6) {
        sfx.combo()
        setBanner({ key: Date.now(), text: len >= 9 ? `MEGA CHAIN x${len}!` : `CHAIN x${len}!` })
        fx.shake(3 + len * 0.4, 0.2)
        fx.stop(0.05)
      }
      if (broke) sfx.thud()
      haptic.medium()
      if (res > w.bestE) newBest(res, cpt.x, cpt.y)
      run.update(w.stats)
      pushHud()
    } else if (res > w.bestE) w.bestE = res
    gravity()
    w.busy = 0.32
    w.postCheck = true
  }

  function newBest(e: number, x: number, y: number) {
    const w = world.current
    w.bestE = e
    w.stats.best = Math.pow(2, e)
    if (e >= 6) {
      setBanner({ key: Date.now() + 1, text: `NEW: ${tierName(e)}!`, sub: `next: ${tierName(e + 1)}` })
      sfx.levelUp()
      fx.flash('#f5d0fe', 0.12)
      if (e >= 8 && e % 2 === 0) {
        w.shuffles += 1
        fx.text(x, y + 34, '+1 SHUFFLE', '#c4b5fd', 15)
      } else if (e >= 9) {
        w.hammers += 1
        fx.text(x, y + 34, '+1 HAMMER', '#fdba74', 15)
      }
    } else fx.text(x, y - 40, `${label(e)}!`, '#f5d0fe', 18)
    if (e >= 10 && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'chainmerge', kind: 'tier', value: Math.pow(2, e) })
    }
  }

  /** After the board settles: purge the lowest tier when the top grows, then check for moves. */
  function settle() {
    const w = world.current
    const play = phaseRef.current === 'play'
    if (w.bestE >= w.minE + 9) {
      const old = w.minE
      w.minE += 1
      let n = 0
      for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
          const t = w.grid[c][r]
          if (t && t.kind === 'n' && t.e < w.minE) {
            w.grid[c][r] = null
            n++
            const p = center(c, r)
            fx.burst(p.x, p.y, { count: 12, color: [styleOf(t.e).mid, '#ffffff'], speed: 200, gravity: 150 })
          }
        }
      }
      if (play) {
        w.score += n * 15
        setBanner({ key: Date.now() + 2, text: `${label(old)}s REMOVED!`, sub: `tiles now start at ${label(w.minE)}` })
        sfx.win()
        haptic.success()
      }
      gravity()
      w.busy = 0.4
      w.postCheck = true
      return
    }
    if (!hasMove()) {
      if (!play) {
        shuffleTiles(false)
        return
      }
      if (w.shuffles + w.hammers > 0) {
        w.noMoves = true
        setBanner({ key: Date.now() + 3, text: 'NO MOVES!', sub: 'shuffle or hammer' })
        sfx.miss()
      } else die()
    } else w.noMoves = false
    if (play) pushHud()
  }

  function shuffleTiles(useCharge: boolean) {
    const w = world.current
    if (useCharge) {
      if (phaseRef.current !== 'play' || w.shuffles <= 0 || w.busy > 0) return
      w.shuffles -= 1
    }
    const cells: Cell[] = []
    const tiles: Tile[] = []
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const t = w.grid[c][r]
      if (t && t.kind !== 'stone') {
        cells.push({ c, r })
        tiles.push(t)
      }
    }
    for (let attempt = 0; attempt < 30; attempt++) {
      for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[tiles[i], tiles[j]] = [tiles[j], tiles[i]]
      }
      cells.forEach((p, i) => (w.grid[p.c][p.r] = tiles[i]))
      if (hasMove()) break
      if (attempt === 29 && cells.length >= 2) {
        // Guarantee a pair: copy a neighbour's value.
        const a = w.grid[cells[0].c][cells[0].r]!
        const nb = cells.find((p) => p !== cells[0] && Math.abs(p.c - cells[0].c) <= 1 && Math.abs(p.r - cells[0].r) <= 1)
        if (nb) w.grid[nb.c][nb.r]!.e = a.kind === 'n' ? a.e : w.minE
      }
    }
    if (useCharge) {
      w.noMoves = false
      sfx.whoosh()
      sfx.flip()
      haptic.medium()
      fx.flash('#c4b5fd', 0.12)
      w.busy = 0.35
      w.postCheck = true
      pushHud()
    }
  }

  function toggleHammer() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.busy > 0) return
    if (w.hammerMode) w.hammerMode = false
    else if (w.hammers > 0) w.hammerMode = true
    sfx.tap()
    pushHud()
  }

  function hammerAt(c: number, r: number) {
    const w = world.current
    const t = w.grid[c][r]
    if (!t) return
    const p = center(c, r)
    const { cell } = geo()
    w.grid[c][r] = null
    w.hammers -= 1
    w.hammerMode = false
    w.noMoves = false
    const cols = t.kind === 'stone' ? ['#a8a29e', '#57534e'] : [styleOf(t.e).mid, styleOf(t.e).hi]
    fx.burst(p.x, p.y, { count: 22, color: cols, speed: 260, shape: 'square', size: 5, gravity: 700 })
    fx.ring(p.x, p.y, { color: '#fdba74', maxR: cell, life: 0.3 })
    fx.text(p.x, p.y - 20, 'SMASH!', '#fdba74', 20)
    fx.shake(6, 0.18)
    fx.stop(0.06)
    sfx.clang()
    haptic.heavy()
    if (t.kind === 'stone') w.stats.stones += 1
    gravity()
    w.busy = 0.32
    w.postCheck = true
    run.update(w.stats)
    pushHud()
  }

  // ── Lifecycle ───────────────────────────────────
  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.shuffles = 1 + run.level('shuffle')
    w.hammers = 1 + run.level('hammer')
    world.current = w
    fillBoard()
    w.busy = 0.6
    fx.reset()
    spriteCache.clear()
    run.begin()
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'CHAIN LINK', sub: 'drag through matching tiles' })
    sfx.ready()
    pushHud()
  }

  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    w.hammerMode = false
    w.path = []
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(10, 0.45)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    const { W, gy } = geo()
    fx.text(W / 2, gy + 40, 'NO MOVES LEFT!', '#fecaca', 26)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.score / 2000 + w.bestE * 1.5 + w.coins) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.bestE >= 11, stats: { ...w.stats }, coins }, revive)
      pushHud()
    }, 1200)
  }

  /** Revive: crush stones and the two smallest tiers, keep big tiles, +1 shuffle. */
  function revive() {
    const w = world.current
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const t = w.grid[c][r]
      if (t && (t.kind === 'stone' || t.e <= w.minE + 1)) {
        const p = center(c, r)
        fx.burst(p.x, p.y, { count: 10, color: t.kind === 'stone' ? ['#a8a29e'] : [styleOf(t.e).mid], speed: 180, gravity: 300 })
        w.grid[c][r] = null
      }
    }
    const stones = w.stonesOn
    w.stonesOn = false
    gravity()
    w.stonesOn = stones
    if (!hasMove()) shuffleTiles(false)
    w.shuffles += 1
    w.noMoves = false
    w.busy = 0.4
    w.postCheck = true
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'board refreshed · +1 shuffle' })
    setPhaseBoth('play')
    pushHud()
  }

  // ── Input ───────────────────────────────────────
  function cellAt(e: PointerEvent<HTMLDivElement>, strict: boolean): Cell | null {
    const p = localPoint(e, e.currentTarget)
    const { cell, gx, gy } = geo()
    const c = Math.floor((p.x - gx) / cell)
    const r = Math.floor((p.y - gy) / cell)
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null
    if (strict) {
      const cc = center(c, r)
      if (Math.hypot(p.x - cc.x, p.y - cc.y) > cell * 0.44) return null
    }
    return { c, r }
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.busy > 0) return
    const cell = cellAt(e, false)
    if (!cell) return
    if (w.hammerMode) {
      hammerAt(cell.c, cell.r)
      return
    }
    const t = w.grid[cell.c][cell.r]
    if (!t || t.kind !== 'n') return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointer.current = e.pointerId
    w.path = [cell]
    t.pop = 0.4
    sfx.tap()
    haptic.light()
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId) return
    const w = world.current
    const cell = cellAt(e, true)
    if (!cell || !w.path.length) return
    const p = w.path
    const last = p[p.length - 1]
    if (last.c === cell.c && last.r === cell.r) return
    if (p.length >= 2 && p[p.length - 2].c === cell.c && p[p.length - 2].r === cell.r) {
      p.pop()
      sfx.move()
      return
    }
    if (canExtend(cell.c, cell.r)) {
      p.push(cell)
      const t = w.grid[cell.c][cell.r]!
      t.pop = 0.5
      sfx.score(Math.min(10, p.length - 1))
      haptic.light()
    }
  }

  function onUp(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId) return
    pointer.current = null
    commit()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 's') shuffleTiles(true)
      else if (e.key === 'h') toggleHammer()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Tick ────────────────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const t = w.grid[c][r]
      if (!t) continue
      t.vx += (c - t.vx) * Math.min(1, dt * 14)
      if (t.vy < r) {
        t.fallV += 60 * dt
        t.vy = Math.min(r, t.vy + t.fallV * dt)
        if (t.vy >= r) t.fallV = 0
      } else if (t.vy > r) t.vy += (r - t.vy) * Math.min(1, dt * 14)
      t.pop = Math.max(0, t.pop - raw * 3)
    }
    for (const g of w.ghosts) g.t += raw * 6
    if (w.ghosts.length) w.ghosts = w.ghosts.filter((g) => g.t < 1)

    if (w.busy > 0) {
      w.busy -= dt
      if (w.busy <= 0 && w.postCheck) {
        w.postCheck = false
        settle()
      }
    }

    if (ph === 'play') {
      w.clock += dt
      if (!w.stonesOn && w.clock >= 60) {
        w.stonesOn = true
        setBanner({ key: Date.now() + 5, text: 'NEW: Stones!', sub: 'merge next to them to break them' })
        sfx.power()
      }
      if (!w.wildOn && w.clock >= 100) {
        w.wildOn = true
        setBanner({ key: Date.now() + 6, text: 'NEW: Star Tile!', sub: 'joins any chain' })
        sfx.power()
      }
      if (w.clock >= w.nextLucky) {
        w.nextLucky += 90
        const cand: Tile[] = []
        for (const col of w.grid) for (const t of col) if (t && t.kind === 'n' && t.e <= w.minE + 2) cand.push(t)
        for (let i = 0; i < 2 && cand.length; i++) {
          const t = cand.splice(Math.floor(Math.random() * cand.length), 1)[0]
          t.kind = 'wild'
          t.pop = 1
        }
        setBanner({ key: Date.now() + 7, text: 'LUCKY STARS!', sub: 'two star tiles appeared' })
        sfx.power()
        haptic.success()
        w.noMoves = false
        pushHud()
      }
    } else if (ph === 'idle') {
      // Attract mode: the board plays itself.
      w.idleT -= raw
      if (!w.grid[0][0]) fillBoard()
      if (w.idleT <= 0 && w.busy <= 0) {
        if (w.path.length) {
          commit()
          w.idleT = 1.1
        } else {
          w.idleT = 0.7
          const starts: Cell[] = []
          for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (w.grid[c][r]?.kind === 'n') starts.push({ c, r })
          for (let tries = 0; tries < 12 && starts.length; tries++) {
            const s = starts[Math.floor(Math.random() * starts.length)]
            w.path = [s]
            for (let step = 0; step < 5; step++) {
              const last = w.path[w.path.length - 1]
              let added = false
              for (let dc = -1; dc <= 1 && !added; dc++) for (let dr = -1; dr <= 1 && !added; dr++) {
                const c = last.c + dc
                const r = last.r + dr
                if (c < 0 || c >= COLS || r < 0 || r >= ROWS) continue
                if (canExtend(c, r)) {
                  w.path.push({ c, r })
                  added = true
                }
              }
              if (!added) break
            }
            if (w.path.length >= 2) break
            w.path = []
          }
        }
      }
    }
  }

  // ── Render ──────────────────────────────────────
  function drawT(ctx: CanvasRenderingContext2D, t: { e: number; kind: Kind; golden: boolean }, x: number, y: number, d: number, sc: number, time: number, alpha = 1) {
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(x, y)
    ctx.scale(sc, sc)
    if (t.kind === 'stone') drawStone(ctx, d, 0)
    else if (t.kind === 'wild') drawWild(ctx, d, time)
    else {
      const spr = tileSprite(t.e, d)
      const dim = Math.ceil(Math.max(8, Math.round(d)) * 1.15)
      const k = d / Math.max(8, Math.round(d))
      ctx.drawImage(spr, (-dim / 2) * k, (-dim / 2) * k, dim * k, dim * k)
      if (t.golden) {
        ctx.strokeStyle = `rgba(253,224,71,${0.75 + Math.sin(time * 6) * 0.25})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(0, 0, d * 0.5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.rotate(time * 2)
        ctx.fillStyle = '#fef08a'
        ctx.beginPath()
        ctx.arc(d * 0.47, 0, 2.5, 0, Math.PI * 2)
        ctx.arc(-d * 0.47, 0, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    update(dt, raw)
    const { cell, gx, gy } = geo()

    // cosmic background with parallax stars and drifting links
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#2e1065')
    bg.addColorStop(0.55, '#4c1d95')
    bg.addColorStop(1, '#1e1b4b')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    glow(ctx, W * 0.2, H * 0.25, W * 0.6, '#c026d3', 0.25)
    glow(ctx, W * 0.85, H * 0.75, W * 0.6, '#2563eb', 0.2)
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < 16; i++) {
        const x = (i * 97 + layer * 37 + t * (3 + layer * 6)) % W
        const y = (i * 151 + layer * 71) % H
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 2 + i + layer)
        ctx.fillStyle = '#f5d0fe'
        ctx.beginPath()
        ctx.arc(x, y, 0.8 + layer, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 0.08
    ctx.strokeStyle = '#e9d5ff'
    ctx.lineWidth = 5
    for (let i = 0; i < 4; i++) {
      const x = (i * 113 + t * 6) % (W + 60) - 30
      const y = H * (0.15 + i * 0.22) + Math.sin(t * 0.4 + i) * 12
      ctx.beginPath()
      ctx.ellipse(x, y, 18, 10, 0.5, 0, Math.PI * 2)
      ctx.ellipse(x + 22, y + 10, 18, 10, 0.5, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    fx.applyShake(ctx)
    // board
    ctx.fillStyle = 'rgba(15,5,40,0.5)'
    ctx.beginPath()
    ctx.roundRect(gx - 8, gy - 8, cell * COLS + 16, cell * ROWS + 16, 18)
    ctx.fill()
    ctx.strokeStyle = w.noMoves ? `rgba(248,113,113,${0.6 + Math.sin(t * 8) * 0.3})` : 'rgba(216,180,254,0.35)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = 'rgba(167,139,250,0.12)'
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      ctx.beginPath()
      ctx.arc(gx + (c + 0.5) * cell, gy + (r + 0.5) * cell, cell * 0.42, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.save()
    ctx.beginPath()
    ctx.rect(gx - 8, gy - 8, cell * COLS + 16, cell * ROWS + 16)
    ctx.clip()

    // path line under tiles
    const path = w.path
    const res = path.length >= 2 ? resultOf(path) : 0
    if (path.length >= 2) {
      const st = styleOf(res)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (const [lw, col, a] of [[cell * 0.34, st.mid, 0.35], [cell * 0.16, st.hi, 0.95]] as const) {
        ctx.globalAlpha = a
        ctx.strokeStyle = col
        ctx.lineWidth = lw
        ctx.beginPath()
        path.forEach((p, i) => {
          const q = center(p.c, p.r)
          if (i === 0) ctx.moveTo(q.x, q.y)
          else ctx.lineTo(q.x, q.y)
        })
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    const d = cell * 0.88
    const inPath = (c: number, r: number) => path.some((p) => p.c === c && p.r === r)
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
      const tl = w.grid[c][r]
      if (!tl) continue
      const x = gx + (tl.vx + 0.5) * cell
      const y = gy + (tl.vy + 0.5) * cell
      if (y < gy - cell) continue
      const sel = inPath(c, r)
      const sc = (sel ? 1.08 : 1) * (tl.pop > 0 ? 1 + Math.sin(tl.pop * Math.PI) * 0.16 : 1)
      if (sel) glow(ctx, x, y, cell * 0.7, styleOf(res || tl.e).hi, 0.5)
      drawT(ctx, tl, x, y, d, sc, t, w.noMoves && tl.kind === 'n' ? 0.75 : 1)
      if (w.hammerMode) {
        ctx.strokeStyle = `rgba(253,186,116,${0.6 + Math.sin(t * 10) * 0.3})`
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(x, y, d * 0.52, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    for (const g of w.ghosts) {
      if (g.t < 0) {
        const p = center(g.x, g.y)
        drawT(ctx, { e: g.e, kind: g.kind === 'wild' ? 'wild' : 'n', golden: false }, p.x, p.y, d, 1, t)
        continue
      }
      const k = 1 - Math.pow(1 - Math.min(1, g.t), 3)
      const p = center(g.x + (g.tx - g.x) * k, g.y + (g.ty - g.y) * k)
      drawT(ctx, { e: g.e, kind: g.kind === 'wild' ? 'wild' : 'n', golden: false }, p.x, p.y, d, 1 - k * 0.4, t, 1 - k * 0.5)
    }
    // node dots on the path
    if (path.length >= 1) {
      ctx.fillStyle = '#ffffff'
      for (const p of path) {
        const q = center(p.c, p.r)
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.arc(q.x, q.y - d * 0.36, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    ctx.restore()

    fx.draw(ctx)
    ctx.restore()

    if (ph !== 'idle') {
      // chain preview bubble
      const py = gy - 34
      if (path.length >= 2) {
        const sum = pathEffs(path).reduce((s, e) => s + Math.pow(2, e), 0)
        ctx.fillStyle = 'rgba(15,5,40,0.6)'
        ctx.beginPath()
        ctx.roundRect(W / 2 - 92, py - 20, 184, 40, 20)
        ctx.fill()
        ctx.fillStyle = '#f5d0fe'
        ctx.font = "800 14px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'right'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${path.length} tiles · ${sum} →`, W / 2 + 40, py)
        drawT(ctx, { e: res, kind: 'n', golden: false }, W / 2 + 66, py, 34, 1 + Math.sin(t * 8) * 0.04, t)
      } else {
        ctx.fillStyle = 'rgba(245,208,254,0.8)'
        ctx.font = "700 12px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(w.hammerMode ? 'tap a tile to smash it' : w.noMoves ? 'no moves — shuffle or hammer!' : 'link equal tiles · step up to the double', W / 2, py)
      }

      // ladder
      const lx0 = 74
      const lx1 = W - 74
      const n = 7
      const first = Math.max(w.minE, w.bestE - 4)
      const step = (lx1 - lx0) / n
      const ly = H - 30
      const s = Math.min(26, step * 0.9)
      ctx.fillStyle = 'rgba(15,5,40,0.5)'
      ctx.beginPath()
      ctx.roundRect(lx0 - 6, ly - s / 2 - 6, lx1 - lx0 + 12, s + 12, s / 2 + 6)
      ctx.fill()
      for (let i = 0; i < n; i++) {
        const e = first + i
        const x = lx0 + step * (i + 0.5)
        const goal = e === w.bestE + 1
        const a = e <= w.bestE ? 1 : goal ? 0.85 : 0.25
        drawT(ctx, { e, kind: 'n', golden: false }, x, ly, s, goal ? 1 + Math.sin(t * 5) * 0.1 : 1, t, a)
        if (goal) {
          ctx.strokeStyle = '#fde047'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(x, ly, s / 2 + 3, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      ctx.fillStyle = '#f5d0fe'
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
    win.__chainmerge = () => {
      const w = world.current
      return { busy: w.busy, noMoves: w.noMoves, grid: w.grid.map((col) => col.map((t) => (t ? (t.kind === 'n' ? t.e : t.kind) : null))) }
    }
    win.__chainmergeStuck = () => {
      const w = world.current
      for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
        const t = w.grid[c][r]
        if (t) {
          t.kind = 'n'
          t.e = w.minE + ((c + 3 * r) % 5)
        }
      }
      w.busy = 0.05
      w.postCheck = true
    }
    return () => {
      delete win.__chainmerge
      delete win.__chainmergeStuck
    }
  }, [])

  const won = hud.best >= 11
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena cl-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="cl-sub">Best: {label(hud.best)}</div>
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'dying' ? (
            <>
              <button
                type="button"
                className={`cl-helper is-left${hud.noMoves && hud.shuffles > 0 ? ' is-pulse' : ''}`}
                aria-label="Shuffle the board"
                disabled={hud.shuffles <= 0}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => shuffleTiles(true)}
              >
                <ShuffleIcon />
                <span className="cl-helper__n">{hud.shuffles}</span>
              </button>
              <button
                type="button"
                className={`cl-helper is-right${hud.hammerMode ? ' is-on' : ''}`}
                aria-label="Hammer a tile"
                disabled={hud.hammers <= 0 && !hud.hammerMode}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={toggleHammer}
              >
                <HammerIcon />
                <span className="cl-helper__n">{hud.hammers}</span>
              </button>
            </>
          ) : null}
          {banner && phase === 'play' ? (
            <div className="action-banner cl-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="chainmerge"
              icon={meta.icon}
              title={meta.title}
              hint="Drag through touching tiles of the same number — you may step up to its double. Release to merge them all."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Chain legend!' : 'No moves left'}
            subtitle={`Score ${hud.score} · best tile ${label(hud.best)}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}

