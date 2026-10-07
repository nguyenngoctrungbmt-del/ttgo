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
import { GOOD_COLOR, clearGoodCache, goodSprite } from './art'
import { AUTHORED } from './authored'
import { authoredLevel, canMove, hintMove, makeLevel, stateKey, type Item, type LevelDef, type Shelf } from './levels'
import '../../shared/action/action.css'
import './goodssort.css'

const meta = getGame('goodssort')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type Anim = { ox: number; oy: number; os: number; t: number; dur: number; delay: number }
type Pop = { x: number; y: number; ox: number; oy: number; t: number; type: number; s: number }
type Flyer = { x0: number; y0: number; x1: number; y1: number; t: number; dur: number; type: number; s: number }
type Coin = { x: number; y: number; t: number; delay: number }
type Drag = { shelf: number; slot: number; item: Item; x: number; y: number; sx: number; sy: number; moved: boolean }

type World = {
  lv: LevelDef
  n: number
  clears: number
  time: number
  timeMax: number
  freeze: number
  grace: number
  combo: number
  comboT: number
  score: number
  coins: number
  starsRun: number
  magnets: number
  shuffles: number
  freezes: number
  offset: number
  drag: Drag | null
  sel: { shelf: number; slot: number } | null
  hover: number
  stuck: boolean
  clearT: number
  stars: number
  tickAt: number
  demoT: number
  history: string[]
  stats: { score: number; level: number; triples: number; combo: number; stars: number }
}

const COMBO_WINDOW = 6

function freshWorld(): World {
  return {
    lv: { n: 0, cols: 3, rows: 1, moving: [], shelves: [], types: 0, items: 0, time: 60, hard: false },
    n: 0,
    clears: 0,
    time: 60,
    timeMax: 60,
    freeze: 0,
    grace: 0,
    combo: 0,
    comboT: 0,
    score: 0,
    coins: 0,
    starsRun: 0,
    magnets: 1,
    shuffles: 1,
    freezes: 1,
    offset: 0,
    drag: null,
    sel: null,
    hover: -1,
    stuck: false,
    clearT: 0,
    stars: 0,
    tickAt: 0,
    demoT: 1,
    history: [],
    stats: { score: 0, level: 1, triples: 0, combo: 0, stars: 0 },
  }
}

function easeOutBack(k: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2)
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
}

const MagnetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4v8a6 6 0 0 0 12 0V4" />
    <path d="M6 4h4v8a2 2 0 0 0 4 0V4h4" stroke="#fde047" />
  </svg>
)
const ShuffleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7h4c4 0 6 10 10 10h4M3 17h4c1.6 0 2.8-1.6 3.8-3.4M14 9.4C15 7.6 16.3 7 17 7h4M18 4l3 3-3 3M18 14l3 3-3 3" />
  </svg>
)
const FreezeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17M9 4l3 3 3-3M9 20l3-3 3 3" />
  </svg>
)

export default function GoodsSortGame() {
  const run = useActionRun('goodssort')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const anims = useRef(new Map<number, Anim>()).current
  const pops = useRef<Pop[]>([])
  const flyers = useRef<Flyer[]>([])
  const coinsFx = useRef<Coin[]>([])
  const pointer = useRef<number | null>(null)
  const lastEvent = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hard: false, magnets: 0, shuffles: 0, freezes: 0, stuck: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.n, hard: w.lv.hard, magnets: w.magnets, shuffles: w.shuffles, freezes: w.freezes, stuck: w.stuck })
  }

  // ── Geometry ──────────────────────────────────
  function geo() {
    const { w: W, h: H } = size.current
    const lv = world.current.lv
    const top = 104
    const bottom = H - 84
    const padX = 8
    const sw = (W - padX * 2) / lv.cols
    const slotW = (sw - 14) / 3
    const s0 = Math.min(64, slotW * 1.45)
    const sh = Math.min(s0 * 1.95, (bottom - top) / lv.rows)
    const y0 = top + (bottom - top - sh * lv.rows) / 2
    const s = Math.min(s0, sh * 0.54)
    return { W, H, top, bottom, padX, sw, sh, y0, slotW, s }
  }

  /** Screen rect(s) of a shelf; moving rows wrap and may return two copies. */
  function shelfXs(sh: Shelf): number[] {
    const { W, padX, sw } = geo()
    const lv = world.current.lv
    if (!lv.moving.includes(sh.row)) return [padX + sh.slot * sw]
    const count = lv.shelves.filter((s) => s.row === sh.row).length
    const L = count * sw
    const x = (((sh.slot * sw + world.current.offset) % L) + L) % L
    const out = [padX + x]
    if (padX + x + sw > W - padX) out.push(padX + x - L)
    return out
  }

  function shelfY(sh: Shelf) {
    const { y0, sh: h } = geo()
    return y0 + sh.row * h
  }

  /** Main (most visible) x of a shelf. */
  function shelfX(sh: Shelf) {
    const { W } = geo()
    const xs = shelfXs(sh)
    if (xs.length === 1) return xs[0]
    const { sw } = geo()
    const vis = (x: number) => Math.min(x + sw, W) - Math.max(x, 0)
    return vis(xs[0]) >= vis(xs[1]) ? xs[0] : xs[1]
  }

  function slotPos(si: number, k: number, layer = 0) {
    const { sh, slotW } = geo()
    const shelf = world.current.lv.shelves[si]
    const x = shelfX(shelf) + 7 + slotW * (k + 0.5)
    const y = shelfY(shelf) + sh * (layer === 0 ? 0.84 : 0.6)
    return { x, y }
  }

  function hitShelf(px: number, py: number) {
    const { sw, sh } = geo()
    const lv = world.current.lv
    for (let i = 0; i < lv.shelves.length; i++) {
      const s = lv.shelves[i]
      const y = shelfY(s)
      if (py < y || py > y + sh) continue
      for (const x of shelfXs(s)) if (px >= x && px <= x + sw) return { shelf: i, x }
    }
    return null
  }

  // ── Level flow ────────────────────────────────
  function loadLevel(n: number) {
    const w = world.current
    w.n = n
    w.lv = n <= AUTHORED.length ? authoredLevel(n, AUTHORED[n - 1]) : makeLevel(n, Math.floor(Math.random() * 1e9))
    w.clears = 0
    w.timeMax = w.lv.time + run.level('clock') * 8
    w.time = w.timeMax
    w.freeze = 0
    w.grace = 1.2
    w.combo = 0
    w.comboT = 0
    w.offset = 0
    w.stuck = false
    w.sel = null
    w.drag = null
    w.stats.level = n
    w.history = []
    anims.clear()
    pops.current = []
    // goods drop onto the shelves
    w.lv.shelves.forEach((sh, si) => {
      sh.layers[0].forEach((it, k) => {
        if (it) anims.set(it.id, { ox: 0, oy: -40 - sh.row * 10, os: 0.4, t: 0, dur: 0.35, delay: si * 0.03 + k * 0.02 })
      })
    })
    if (phaseRef.current !== 'idle') {
      const tip = w.lv.tip
      const name = w.lv.name ? `${w.lv.name} · ` : ''
      setBanner({ key: Date.now(), text: w.lv.hard ? `LEVEL ${n} · HARD` : `LEVEL ${n}`, sub: `${name}${tip ?? `${w.lv.items} goods · ${w.timeMax}s`}` })
      if (w.lv.hard) sfx.boom(0.3)
      else sfx.ready()
      if (n % 5 === 0 && performance.now() - lastEvent.current > 30000) {
        lastEvent.current = performance.now()
        void trackEvent('action_milestone', { game_id: 'goodssort', kind: 'level', value: n })
      }
      run.update(w.stats)
    }
    pushHud()
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.magnets = 1 + run.level('magnet')
    world.current = w
    fx.reset()
    flyers.current = []
    coinsFx.current = []
    clearGoodCache()
    run.begin()
    setPhaseBoth('play')
    loadLevel(Math.max(1, level))
  }

  function remaining() {
    return world.current.lv.shelves.reduce((a, s) => a + s.layers.reduce((b, l) => b + l.filter(Boolean).length, 0), 0)
  }

  function levelClear() {
    const w = world.current
    const frac = w.time / w.timeMax
    // Stars by time left: 45%+ = 3, 20%+ = 2, else 1.
    const stars = frac >= 0.45 ? 3 : frac >= 0.2 ? 2 : 1
    w.stars = stars
    run.completeLevel(w.n, stars)
    w.starsRun += stars
    w.stats.stars = w.starsRun
    const bonus = Math.round(w.time) * 2 + stars * 50 + (w.lv.hard ? 150 : 0)
    w.score += bonus
    w.stats.score = w.score
    const gain = 2 + stars + (w.lv.hard ? 3 : 0)
    w.coins += gain
    w.clearT = 2.1
    w.drag = null
    w.sel = null
    setPhaseBoth('clear')
    const { W, H } = geo()
    for (let i = 0; i < 5; i++) fx.burst(rand(W * 0.15, W * 0.85), rand(H * 0.25, H * 0.45), { count: 18, color: ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#ffffff'], speed: 320, shape: 'square', size: 5, gravity: 380, life: 1.1 })
    for (let i = 0; i < Math.min(10, gain); i++) coinsFx.current.push({ x: W / 2 + rand(-40, 40), y: H * 0.5 + rand(-20, 20), t: 0, delay: 0.5 + i * 0.07 })
    fx.flash('#fef9c3', 0.18)
    sfx.win()
    haptic.success()
    setBanner({ key: Date.now(), text: `LEVEL ${w.n} CLEAR!`, sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · +${bonus} · +${gain} coins` })
    // reward boosters every 3 levels
    if (w.n % 3 === 0) {
      const r = w.n % 9 === 0 ? 'freeze' : w.n % 6 === 0 ? 'shuffle' : 'magnet'
      if (r === 'magnet') w.magnets += 1
      else if (r === 'shuffle') w.shuffles += 1
      else w.freezes += 1
      fx.text(W / 2, H * 0.62, `+1 ${r.toUpperCase()}`, '#fde047', 18)
    }
    run.update(w.stats)
    pushHud()
  }

  // ── Moves ─────────────────────────────────────
  function frozen(it: Item) {
    return it.thaw > world.current.clears
  }

  function locked(sh: Shelf) {
    return sh.lockAt > world.current.clears
  }

  function settleShelf(si: number, delay: number) {
    const w = world.current
    const sh = w.lv.shelves[si]
    const { sh: hgt } = geo()
    for (let guard = 0; guard < 6; guard++) {
      const f = sh.layers[0]
      if (f[0] && f[1] && f[2] && f[0].t === f[1].t && f[1].t === f[2].t) {
        clearTriple(si, delay)
        continue
      }
      if (f.every((x) => !x) && sh.layers.length > 1) {
        sh.layers.shift()
        sh.layers[0].forEach((it) => {
          if (it) anims.set(it.id, { ox: 0, oy: -hgt * 0.24, os: 0.8, t: 0, dur: 0.32, delay: delay + 0.18 })
        })
        if (phaseRef.current === 'play') sfx.whoosh()
        continue
      }
      return
    }
  }

  function clearTriple(si: number, delay: number) {
    const w = world.current
    const sh = w.lv.shelves[si]
    const f = sh.layers[0]
    const { s } = geo()
    const type = f[0]!.t
    for (let k = 0; k < 3; k++) {
      const it = f[k]!
      const p = slotPos(si, k)
      const a = anims.get(it.id)
      let ox = 0
      let oy = 0
      if (a) {
        const e = easeOutBack(clamp((a.t - a.delay) / a.dur, 0, 1))
        ox = a.ox * (1 - e)
        oy = a.oy * (1 - e)
      }
      pops.current.push({ x: p.x, y: p.y, ox, oy, t: -delay - 0.12, type, s })
      anims.delete(it.id)
      f[k] = null
    }
    const before = w.clears
    w.clears += 1
    if (phaseRef.current !== 'play') return
    w.combo = w.comboT > 0 ? w.combo + 1 : 1
    w.comboT = COMBO_WINDOW
    const gain = 30 * w.combo
    w.score += gain
    w.stats.score = w.score
    w.stats.triples += 1
    w.stats.combo = Math.max(w.stats.combo, w.combo)
    if (w.combo >= 3) w.time = Math.min(w.timeMax, w.time + 1)
    const p = slotPos(si, 1)
    window.setTimeout(() => {
      fx.text(p.x, p.y - s * 1.2, w.combo > 1 ? `+${gain} x${w.combo}` : `+${gain}`, w.combo > 1 ? '#fde047' : '#ffffff', 16 + Math.min(10, w.combo * 2))
    }, 150)
    if (w.combo >= 2) sfx.combo()
    if (w.combo === 5 || w.combo === 10 || w.combo === 15) setBanner({ key: Date.now(), text: `COMBO x${w.combo}!`, sub: w.combo >= 10 ? 'unstoppable' : 'keep it up' })
    // thaw & unlock feedback
    for (let i = 0; i < w.lv.shelves.length; i++) {
      const o = w.lv.shelves[i]
      if (o.lockAt > before && o.lockAt <= w.clears) {
        const x = shelfX(o) + geo().sw / 2
        const y = shelfY(o) + geo().sh / 2
        fx.burst(x, y, { count: 22, color: ['#fde047', '#94a3b8', '#ffffff'], speed: 260, shape: 'square', size: 4, gravity: 500 })
        fx.ring(x, y, { color: '#fde047', maxR: 60, life: 0.45 })
        fx.text(x, y - 20, 'UNLOCKED!', '#fde047', 16)
        sfx.clang()
      }
      o.layers[0].forEach((it, k) => {
        if (it && it.thaw > before && it.thaw <= w.clears) {
          const q = slotPos(i, k)
          fx.burst(q.x, q.y - s * 0.5, { count: 12, color: ['#e0f2fe', '#7dd3fc', '#ffffff'], speed: 200, shape: 'square', size: 3.5, gravity: 400 })
          sfx.tick()
        }
      })
    }
    run.update(w.stats)
  }

  function doMove(a: number, i: number, b: number, j: number, from?: { x: number; y: number }) {
    const w = world.current
    const A = w.lv.shelves[a]
    const B = w.lv.shelves[b]
    const it = A.layers[0][i]
    if (!it || B.layers[0][j]) return
    w.history.push(stateKey(w.lv.shelves, w.clears))
    if (w.history.length > 12) w.history.shift()
    const src = from ?? slotPos(a, i)
    A.layers[0][i] = null
    B.layers[0][j] = it
    const dst = slotPos(b, j)
    anims.set(it.id, { ox: src.x - dst.x, oy: src.y - dst.y, os: from ? 1.15 : 1, t: 0, dur: from ? 0.16 : 0.26, delay: 0 })
    const play = phaseRef.current === 'play'
    if (play) {
      sfx.tap()
      haptic.light()
    }
    settleShelf(b, from ? 0.16 : 0.26)
    settleShelf(a, 0)
    if (!play) return
    w.stuck = false
    if (remaining() === 0) {
      window.setTimeout(() => {
        if (phaseRef.current === 'play') levelClear()
      }, 450)
    } else checkStuck()
    pushHud()
  }

  function checkStuck() {
    const w = world.current
    if (canMove(w.lv.shelves, w.clears)) return
    w.stuck = true
    sfx.miss()
    if (w.magnets > 0 || w.shuffles > 0) {
      setBanner({ key: Date.now(), text: 'OUT OF SPACE!', sub: w.magnets > 0 ? 'use the magnet' : 'try a shuffle' })
      pushHud()
    } else die('OUT OF SPACE!')
  }

  // ── Boosters ──────────────────────────────────
  /** Pulls three of one kind off the shelves (front first) and pops them. */
  function magnetPull(): boolean {
    const w = world.current
    const counts = new Map<number, number>()
    w.lv.shelves.forEach((sh) => sh.layers.forEach((l, li) => l.forEach((it) => it && counts.set(it.t, (counts.get(it.t) ?? 0) + (li === 0 ? 10 : 1)))))
    let best = -1
    let bestScore = -1
    counts.forEach((v, t) => {
      if (v > bestScore) {
        bestScore = v
        best = t
      }
    })
    if (best < 0) return false
    const { W, H, s } = geo()
    const cx = W / 2
    const cy = H * 0.45
    let taken = 0
    const touched = new Set<number>()
    for (let li = 0; li < 6 && taken < 3; li++) {
      w.lv.shelves.forEach((sh, si) => {
        const l = sh.layers[li]
        if (!l) return
        l.forEach((it, k) => {
          if (taken >= 3 || !it || it.t !== best) return
          const p = slotPos(si, k, li === 0 ? 0 : 1)
          flyers.current.push({ x0: p.x, y0: p.y - s / 2, x1: cx + (taken - 1) * s * 1.1, y1: cy, t: -taken * 0.06, dur: 0.45, type: it.t, s })
          l[k] = null
          anims.delete(it.id)
          taken++
          touched.add(si)
        })
      })
    }
    // drop emptied back layers
    for (const sh of w.lv.shelves) sh.layers = sh.layers.filter((l, i) => i === 0 || l.some(Boolean))
    touched.forEach((si) => settleShelf(si, 0))
    w.clears += 1
    w.stats.triples += 1
    w.score += 30
    w.stats.score = w.score
    window.setTimeout(() => {
      fx.burst(cx, cy, { count: 30, color: [GOOD_COLOR[best], '#ffffff', '#fde047'], speed: 320, gravity: 200 })
      fx.ring(cx, cy, { color: '#fde047', maxR: 80, life: 0.45, width: 5 })
      sfx.match()
      sfx.boom(0.3)
      haptic.medium()
    }, 560)
    return true
  }

  function boostMagnet() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.magnets <= 0) return
    if (!magnetPull()) return
    w.magnets -= 1
    w.stuck = false
    sfx.power()
    run.update(w.stats)
    if (remaining() === 0) window.setTimeout(() => phaseRef.current === 'play' && levelClear(), 900)
    else window.setTimeout(() => phaseRef.current === 'play' && checkStuck(), 700)
    pushHud()
  }

  function boostShuffle() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.shuffles <= 0) return
    w.shuffles -= 1
    const slots: [number, number][] = []
    const items: Item[] = []
    w.lv.shelves.forEach((sh, si) => {
      if (locked(sh)) return
      sh.layers[0].forEach((it, k) => {
        if (it && frozen(it)) return
        slots.push([si, k])
        if (it) items.push(it)
      })
    })
    const old = new Map<number, { x: number; y: number }>()
    for (const [si, k] of slots) {
      const it = w.lv.shelves[si].layers[0][k]
      if (it) old.set(it.id, slotPos(si, k))
      w.lv.shelves[si].layers[0][k] = null
    }
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[slots[i], slots[j]] = [slots[j], slots[i]]
    }
    // pair goods up where possible: sort by type so equal goods land on the same shelf
    const sortedSlots = slots.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1])
    items.sort((p, q) => p.t - q.t)
    const pick = Math.random() < 0.5 ? sortedSlots : slots
    items.forEach((it, i) => {
      const [si, k] = pick[i]
      w.lv.shelves[si].layers[0][k] = it
      const o = old.get(it.id)!
      const p = slotPos(si, k)
      anims.set(it.id, { ox: o.x - p.x, oy: o.y - p.y, os: 0.6, t: 0, dur: 0.4, delay: Math.random() * 0.1 })
    })
    for (let si = 0; si < w.lv.shelves.length; si++) settleShelf(si, 0.4)
    w.stuck = false
    sfx.whoosh()
    sfx.flip()
    haptic.medium()
    if (remaining() === 0) window.setTimeout(() => phaseRef.current === 'play' && levelClear(), 900)
    else window.setTimeout(() => phaseRef.current === 'play' && checkStuck(), 600)
    pushHud()
  }

  function boostFreeze() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.freezes <= 0 || w.freeze > 0) return
    w.freezes -= 1
    w.freeze = 10
    fx.flash('#bae6fd', 0.25)
    sfx.power()
    haptic.medium()
    setBanner({ key: Date.now(), text: 'TIME FROZEN', sub: '10 seconds' })
    pushHud()
  }

  // ── Fail / revive ─────────────────────────────
  function die(why: string) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    w.drag = null
    w.sel = null
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.3)
    fx.shake(10, 0.4)
    fx.slowmo(1, 0.3)
    fx.stop(0.1)
    sfx.lose()
    haptic.error()
    const { W, H } = geo()
    fx.text(W / 2, H * 0.45, why, '#fecaca', 28)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.coins + w.n * 2 + w.stats.triples / 6) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.starsRun > 0 && w.n >= 5, stats: { ...w.stats }, coins }, revive)
      pushHud()
    }, 1100)
  }

  /** Revive: +30 s on the clock, a free magnet pull and a short grace. */
  function revive() {
    const w = world.current
    w.time = Math.min(w.timeMax + 30, Math.max(w.time, 0) + 30)
    w.timeMax = Math.max(w.timeMax, w.time)
    w.grace = 2
    w.stuck = false
    setPhaseBoth('play')
    magnetPull()
    w.shuffles += 1
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: '+30s · free magnet · +1 shuffle' })
    window.setTimeout(() => {
      if (phaseRef.current !== 'play') return
      if (remaining() === 0) levelClear()
      else checkStuck()
    }, 800)
    pushHud()
  }

  // ── Input ─────────────────────────────────────
  function slotAt(si: number, px: number, py: number) {
    const { slotW, s, sh: hgt } = geo()
    const shelf = world.current.lv.shelves[si]
    const y = shelfY(shelf)
    if (py < y + hgt * 0.84 - s * 1.25 || py > y + hgt) return -1
    for (const x of shelfXs(shelf)) {
      const k = Math.floor((px - x - 7) / slotW)
      if (k >= 0 && k < 3) return k
    }
    return -1
  }

  function emptySlotNear(si: number, px: number) {
    const shelf = world.current.lv.shelves[si]
    const f = shelf.layers[0]
    let best = -1
    let bd = Infinity
    for (let k = 0; k < 3; k++) {
      if (f[k]) continue
      const d = Math.abs(slotPos(si, k).x - px)
      if (d < bd) {
        bd = d
        best = k
      }
    }
    return best
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.drag) return
    const p = localPoint(e, e.currentTarget)
    const hit = hitShelf(p.x, p.y)
    if (!hit) {
      w.sel = null
      return
    }
    const sh = w.lv.shelves[hit.shelf]
    if (locked(sh)) {
      fx.text(p.x, p.y - 20, `${sh.lockAt - w.clears} more clears`, '#fde047', 14)
      sfx.clang()
      return
    }
    // tap-to-place for a selected good
    if (w.sel && w.sel.shelf !== hit.shelf) {
      const j = emptySlotNear(hit.shelf, p.x)
      if (j >= 0) {
        const sel = w.sel
        w.sel = null
        doMove(sel.shelf, sel.slot, hit.shelf, j)
        return
      }
    }
    const k = slotAt(hit.shelf, p.x, p.y)
    const it = k >= 0 ? sh.layers[0][k] : null
    if (!it) {
      w.sel = null
      return
    }
    if (frozen(it)) {
      fx.text(p.x, p.y - 20, 'FROZEN', '#7dd3fc', 14)
      sfx.tick()
      haptic.light()
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    pointer.current = e.pointerId
    w.drag = { shelf: hit.shelf, slot: k, item: it, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }
    sfx.tick()
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId) return
    const w = world.current
    if (!w.drag) return
    const p = localPoint(e, e.currentTarget)
    w.drag.x = p.x
    w.drag.y = p.y
    if (Math.hypot(p.x - w.drag.sx, p.y - w.drag.sy) > 10) w.drag.moved = true
    const hit = hitShelf(p.x, p.y - 20)
    const h = hit && hit.shelf !== w.drag.shelf && !locked(w.lv.shelves[hit.shelf]) && w.lv.shelves[hit.shelf].layers[0].some((x) => !x) ? hit.shelf : -1
    if (h !== w.hover && h >= 0) sfx.move()
    w.hover = h
  }

  function onUp(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId) return
    pointer.current = null
    const w = world.current
    const d = w.drag
    if (!d) return
    w.drag = null
    w.hover = -1
    if (phaseRef.current !== 'play') return
    const { s } = geo()
    if (!d.moved) {
      w.sel = w.sel && w.sel.shelf === d.shelf && w.sel.slot === d.slot ? null : { shelf: d.shelf, slot: d.slot }
      return
    }
    w.sel = null
    const hit = hitShelf(d.x, d.y - 20)
    if (hit && hit.shelf !== d.shelf && !locked(w.lv.shelves[hit.shelf]) && w.lv.shelves[d.shelf].layers[0][d.slot] === d.item) {
      const j = emptySlotNear(hit.shelf, d.x)
      if (j >= 0) {
        doMove(d.shelf, d.slot, hit.shelf, j, { x: d.x, y: d.y - s * 0.6 + s / 2 })
        return
      }
    }
    // snap back
    const p = slotPos(d.shelf, d.slot)
    anims.set(d.item.id, { ox: d.x - p.x, oy: d.y - s * 0.1 - p.y, os: 1.15, t: 0, dur: 0.25, delay: 0 })
    sfx.miss()
    haptic.light()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'm') boostMagnet()
      else if (e.key === 's') boostShuffle()
      else if (e.key === 'f') boostFreeze()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Tick ──────────────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    for (const a of anims.values()) a.t += dt
    for (const [id, a] of anims) if (a.t > a.delay + a.dur) anims.delete(id)
    const { s } = geo()
    for (const p of pops.current) {
      const before = p.t
      p.t += dt
      if (before < 0.22 && p.t >= 0.22) {
        fx.burst(p.x, p.y - s / 2, { count: 10, color: [GOOD_COLOR[p.type], '#ffffff', '#fde047'], speed: 230, gravity: 320, size: 3 })
        fx.burst(p.x, p.y - s / 2, { count: 4, color: ['#fde047', '#ffffff'], speed: 160, shape: 'spark', gravity: 0 })
        if (ph === 'play' || ph === 'clear') {
          sfx.pop()
          fx.shake(2.5, 0.12)
        }
      }
    }
    if (pops.current.length) {
      const was = pops.current.length
      pops.current = pops.current.filter((p) => p.t < 0.32)
      if (was !== pops.current.length && (ph === 'play' || ph === 'clear')) {
        sfx.match()
        haptic.medium()
      }
    }
    for (const f of flyers.current) f.t += dt
    flyers.current = flyers.current.filter((f) => f.t < f.dur + 0.15)
    for (const c of coinsFx.current) c.t += raw
    coinsFx.current = coinsFx.current.filter((c) => {
      if (c.t >= c.delay + 0.55) {
        if (ph !== 'idle') sfx.score(2)
        return false
      }
      return true
    })

    const lv = w.lv
    if (lv.moving.length) w.offset += dt * (ph === 'idle' ? 14 : 16 + Math.min(14, w.n))

    if (ph === 'play') {
      if (w.comboT > 0) {
        w.comboT -= dt
        if (w.comboT <= 0) w.combo = 0
      }
      if (w.grace > 0) w.grace -= dt
      else if (w.freeze > 0) w.freeze = Math.max(0, w.freeze - dt)
      else {
        w.time -= dt
        if (w.time <= 10 && w.time > 0 && Math.ceil(w.time) !== w.tickAt) {
          w.tickAt = Math.ceil(w.time)
          sfx.tick()
        }
        if (w.time <= 0) {
          w.time = 0
          die('TIME UP!')
        }
      }
    } else if (ph === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0) {
        setPhaseBoth('play')
        loadLevel(w.n + 1)
      }
    } else if (ph === 'idle') {
      w.demoT -= raw
      if (w.demoT <= 0) {
        w.demoT = 0.9
        if (remaining() === 0) {
          w.lv = makeLevel(3 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 1e6))
          w.clears = 0
          anims.clear()
        } else {
          const m = hintMove(lv.shelves, w.clears, w.history)
          if (m) doMove(m.a, m.i, m.b, m.j)
          else {
            w.lv = makeLevel(3, Math.floor(Math.random() * 1e6))
            w.clears = 0
          }
        }
      }
    }
  }

  // ── Render ────────────────────────────────────
  function drawItem(ctx: CanvasRenderingContext2D, it: Item, x: number, y: number, s: number, scale = 1, dim = false) {
    const spr = goodSprite(it.t, s, dim)
    const d = s * 1.2 * scale
    ctx.drawImage(spr, x - d / 2, y - s * scale * 0.5 - d / 2, d, d)
    if (it.thaw > world.current.clears) {
      const left = it.thaw - world.current.clears
      const bw = s * 0.9 * scale
      const bh = s * 1.05 * scale
      ctx.fillStyle = dim ? 'rgba(125,211,252,0.35)' : 'rgba(186,230,253,0.55)'
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(x - bw / 2, y - bh, bw, bh, s * 0.14)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.beginPath()
      ctx.moveTo(x - bw * 0.35, y - bh * 0.85)
      ctx.lineTo(x - bw * 0.15, y - bh * 0.85)
      ctx.lineTo(x - bw * 0.35, y - bh * 0.4)
      ctx.closePath()
      ctx.fill()
      if (!dim) {
        ctx.fillStyle = '#0369a1'
        ctx.beginPath()
        ctx.arc(x + bw * 0.32, y - bh * 0.85, s * 0.17, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = `900 ${Math.round(s * 0.24)}px 'Plus Jakarta Sans', system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(left), x + bw * 0.32, y - bh * 0.85 + 0.5)
      }
    }
  }

  function drawShelf(ctx: CanvasRenderingContext2D, si: number, x: number, t: number) {
    const w = world.current
    const sh = w.lv.shelves[si]
    const { sw, sh: hgt, slotW, s } = geo()
    const y = shelfY(sh)
    const isLocked = locked(sh)
    const hot = w.hover === si
    // cabinet
    const bx = x + 3
    const bw = sw - 6
    const back = ctx.createLinearGradient(0, y, 0, y + hgt)
    back.addColorStop(0, '#6d3b1c')
    back.addColorStop(1, '#3f1f0d')
    ctx.fillStyle = back
    ctx.beginPath()
    ctx.roundRect(bx, y + 4, bw, hgt * 0.84, 8)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(bx + 4, y + 8, bw - 8, hgt * 0.06)
    if (hot) {
      ctx.fillStyle = 'rgba(253,224,71,0.22)'
      ctx.beginPath()
      ctx.roundRect(bx, y + 4, bw, hgt * 0.84, 8)
      ctx.fill()
    }
    // back layer (dimmed, raised)
    const back1 = sh.layers[1]
    if (back1) {
      back1.forEach((it, k) => {
        if (it) drawItem(ctx, it, x + 7 + slotW * (k + 0.5), y + hgt * 0.6, s, 0.8, true)
      })
      // depth pips for further layers
      const extra = sh.layers.length - 1
      for (let i = 0; i < Math.min(extra, 5); i++) {
        ctx.fillStyle = '#fde68a'
        ctx.beginPath()
        ctx.arc(bx + bw - 8 - i * 7, y + 11, 2.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // shelf board
    const by = y + hgt * 0.84
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(bx + 2, by - 3, bw - 4, 4)
    // front items
    const drag = w.drag
    sh.layers[0].forEach((it, k) => {
      if (!it || (drag && drag.item === it)) return
      let px = x + 7 + slotW * (k + 0.5)
      let py = by
      let sc = 1
      const a = anims.get(it.id)
      if (a) {
        const e = easeOutBack(clamp((a.t - a.delay) / a.dur, 0, 1))
        px += a.ox * (1 - e)
        py += a.oy * (1 - e)
        sc = a.os + (1 - a.os) * e
      }
      const selected = w.sel && w.sel.shelf === si && w.sel.slot === k
      if (selected) {
        py -= 6 + Math.sin(t * 8) * 2
        glow(ctx, px, py - s / 2, s * 0.9, '#fde047', 0.55)
      }
      drawItem(ctx, it, px, py, s, sc)
    })
    // plank lip
    const lip = ctx.createLinearGradient(0, by, 0, by + hgt * 0.1)
    lip.addColorStop(0, '#fcd34d')
    lip.addColorStop(0.3, '#f59e0b')
    lip.addColorStop(1, '#b45309')
    ctx.fillStyle = lip
    ctx.beginPath()
    ctx.roundRect(x + 1, by, sw - 2, hgt * 0.1, 4)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillRect(x + 4, by + 1, sw - 8, 1.5)
    // price tags
    ctx.fillStyle = 'rgba(120,53,15,0.5)'
    for (let k = 0; k < 3; k++) ctx.fillRect(x + 7 + slotW * (k + 0.5) - 4, by + hgt * 0.04, 8, hgt * 0.035)
    if (isLocked) {
      ctx.fillStyle = 'rgba(30,27,75,0.55)'
      ctx.beginPath()
      ctx.roundRect(bx, y + 4, bw, hgt * 0.94, 8)
      ctx.fill()
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 3
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(bx + 4, y + 10)
      ctx.lineTo(bx + bw - 4, y + hgt * 0.86)
      ctx.moveTo(bx + bw - 4, y + 10)
      ctx.lineTo(bx + 4, y + hgt * 0.86)
      ctx.stroke()
      ctx.setLineDash([])
      const cx = x + sw / 2
      const cy = y + hgt * 0.48
      const r = Math.min(18, hgt * 0.17)
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = r * 0.3
      ctx.beginPath()
      ctx.arc(cx, cy - r * 0.4, r * 0.6, Math.PI, 0)
      ctx.stroke()
      const lg = ctx.createLinearGradient(0, cy - r * 0.4, 0, cy + r)
      lg.addColorStop(0, '#fde047')
      lg.addColorStop(1, '#ca8a04')
      ctx.fillStyle = lg
      ctx.beginPath()
      ctx.roundRect(cx - r, cy - r * 0.4, r * 2, r * 1.5, r * 0.3)
      ctx.fill()
      ctx.fillStyle = '#713f12'
      ctx.font = `900 ${Math.round(r * 0.95)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(sh.lockAt - w.clears), cx, cy + r * 0.35)
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    update(dt, raw)
    const g = geo()

    // store backdrop: lilac wall with soft tiles and lamps
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, w.lv.hard && ph !== 'idle' ? '#7f1d1d' : '#6d28d9')
    bg.addColorStop(0.55, w.lv.hard && ph !== 'idle' ? '#581c87' : '#5b21b6')
    bg.addColorStop(1, '#2e1065')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    for (let yy = 0; yy < H; yy += 28) for (let xx = (yy / 28) % 2 ? 14 : 0; xx < W; xx += 28) ctx.fillRect(xx, yy, 14, 14)
    for (let i = 0; i < 3; i++) glow(ctx, W * (0.2 + i * 0.3), g.top - 10, W * 0.3, '#fef3c7', 0.13 + Math.sin(t * 1.3 + i) * 0.02)

    fx.applyShake(ctx)
    // shelves (moving rows clipped to the board)
    const lv = w.lv
    for (let si = 0; si < lv.shelves.length; si++) {
      const sh = lv.shelves[si]
      const xs = shelfXs(sh)
      const moving = lv.moving.includes(sh.row)
      if (moving) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(g.padX - 2, shelfY(sh) - 4, W - g.padX * 2 + 4, g.sh + 8)
        ctx.clip()
      }
      for (const x of xs) drawShelf(ctx, si, x, t)
      if (moving) ctx.restore()
    }
    // conveyor arrows for moving rows
    for (const row of lv.moving) {
      const y = g.y0 + row * g.sh + g.sh * 0.97
      ctx.fillStyle = 'rgba(253,224,71,0.5)'
      for (let i = 0; i < 8; i++) {
        const x = ((i * W) / 8 + w.offset) % W
        ctx.beginPath()
        ctx.moveTo(x, y - 3)
        ctx.lineTo(x + 6, y)
        ctx.lineTo(x, y + 3)
        ctx.fill()
      }
    }
    // clearing goods: squash then pop
    for (const p of pops.current) {
      const k = Math.max(0, p.t)
      const e = easeOutBack(clamp(k / 0.14, 0, 1))
      const x = p.x + p.ox * (1 - e)
      const y = p.y + p.oy * (1 - e) - Math.max(0, k - 0.08) * 60
      const sc = k < 0.14 ? 1 + k * 1.5 : 1.2 - (k - 0.14) * 4
      if (sc <= 0) continue
      if (k > 0.05) glow(ctx, x, y - p.s / 2, p.s * 1.1, '#fde047', 0.5)
      const spr = goodSprite(p.type, p.s)
      const d = p.s * 1.2 * sc
      ctx.drawImage(spr, x - d / 2, y - p.s * sc * 0.5 - d / 2, d, d)
    }
    // magnet flyers
    for (const f of flyers.current) {
      const k = clamp(f.t / f.dur, 0, 1)
      const e = k * k * (3 - 2 * k)
      const x = f.x0 + (f.x1 - f.x0) * e
      const y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * 60
      const sc = f.t > f.dur ? 1.3 - (f.t - f.dur) * 8 : 1 + k * 0.3
      if (sc <= 0) continue
      const spr = goodSprite(f.type, f.s)
      const d = f.s * 1.2 * sc
      ctx.drawImage(spr, x - d / 2, y - d / 2, d, d)
    }
    // dragged good
    if (w.drag) {
      const d = w.drag
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(d.x, d.y + 6, g.s * 0.4, g.s * 0.1, 0, 0, Math.PI * 2)
      ctx.fill()
      drawItem(ctx, d.item, d.x, d.y - g.s * 0.6 + g.s / 2, g.s, 1.15)
    }
    fx.draw(ctx)
    ctx.restore()

    if (ph !== 'idle') {
      // timer bar
      const bx = 14
      const by = 78
      const bw = W - 28
      const frac = clamp(w.time / w.timeMax, 0, 1)
      ctx.fillStyle = 'rgba(15,5,40,0.55)'
      ctx.beginPath()
      ctx.roundRect(bx, by, bw, 14, 7)
      ctx.fill()
      const low = w.time < 10
      ctx.fillStyle = w.freeze > 0 ? '#7dd3fc' : low ? (Math.sin(t * 12) > 0 ? '#ef4444' : '#f87171') : frac > 0.45 ? '#4ade80' : frac > 0.2 ? '#facc15' : '#fb923c'
      ctx.beginPath()
      ctx.roundRect(bx, by, Math.max(14, bw * frac), 14, 7)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillRect(bx + 6, by + 2, Math.max(0, bw * frac - 12), 3)
      // star thresholds
      for (const th of [0.2, 0.45]) {
        const sx = bx + bw * th
        ctx.fillStyle = frac >= th ? '#fde047' : 'rgba(255,255,255,0.4)'
        starPath(ctx, sx, by + 7, 6)
        ctx.fill()
      }
      ctx.font = "900 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      const secs = Math.ceil(w.time)
      ctx.fillText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, bx + bw - 6, by + 7.5)
      // combo meter
      if (w.combo >= 2 && w.comboT > 0) {
        const cx = W / 2
        const cy = by + 26
        ctx.font = `900 ${14 + Math.min(8, w.combo)}px 'Plus Jakarta Sans', system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.lineWidth = 4
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'
        ctx.strokeText(`COMBO x${w.combo}`, cx, cy)
        ctx.fillStyle = '#fde047'
        ctx.fillText(`COMBO x${w.combo}`, cx, cy)
        ctx.fillStyle = 'rgba(253,224,71,0.8)'
        ctx.fillRect(cx - 40, cy + 10, 80 * (w.comboT / COMBO_WINDOW), 3)
      }
      if (w.freeze > 0) {
        ctx.fillStyle = `rgba(186,230,253,${0.12 + Math.sin(t * 4) * 0.04})`
        ctx.fillRect(0, 0, W, H)
      }
    }
    // level clear stars
    if (ph === 'clear') {
      const k = 2.1 - w.clearT
      for (let i = 0; i < 3; i++) {
        const appear = k - 0.25 - i * 0.18
        if (appear < 0) continue
        const sc = easeOutBack(clamp(appear / 0.3, 0, 1))
        const x = W / 2 + (i - 1) * 62
        const y = H * 0.28 - (i === 1 ? 14 : 0)
        const on = i < w.stars
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        starPath(ctx, x + 2, y + 4, 26 * sc)
        ctx.fill()
        const sg = ctx.createLinearGradient(0, y - 26, 0, y + 26)
        sg.addColorStop(0, on ? '#fef08a' : '#64748b')
        sg.addColorStop(1, on ? '#f59e0b' : '#334155')
        ctx.fillStyle = sg
        starPath(ctx, x, y, 26 * sc)
        ctx.fill()
        ctx.strokeStyle = on ? '#fff7ed' : '#94a3b8'
        ctx.lineWidth = 2.5
        ctx.stroke()
      }
    }
    // coins flying to the counter
    for (const c of coinsFx.current) {
      const k = clamp((c.t - c.delay) / 0.55, 0, 1)
      const e = k * k
      const x = c.x + (W - 30 - c.x) * e
      const y = c.y + (30 - c.y) * e - Math.sin(k * Math.PI) * 40
      ctx.fillStyle = '#ca8a04'
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(x - 1, y - 1, 6.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fef9c3'
      ctx.fillRect(x - 3, y - 4, 2, 6)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  // Dev-only hooks for scripted tests.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__t2fail = () => {
      if (phaseRef.current === 'play') world.current.time = 0.01
    }
    win.__t2level = (n: number) => {
      if (phaseRef.current === 'play') loadLevel(n)
    }
    win.__goodssort = () => {
      const w = world.current
      const m = hintMove(w.lv.shelves, w.clears, w.history)
      if (!m) return null
      return { from: slotPos(m.a, m.i), to: slotPos(m.b, m.j), s: geo().s, solved: m.solved, mv: [m.a, m.i, m.b, m.j] }
    }
    return () => {
      delete win.__t2fail
      delete win.__goodssort
      delete win.__t2level
    }
  }, [])

  const won = hud.level >= 5
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena gs-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="gs-sub">
                  Level {hud.level}
                  {hud.hard ? <span className="gs-hard">HARD</span> : null}
                </div>
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'clear' || phase === 'dying' ? (
            <div className="gs-boosters">
              <button type="button" className={`gs-boost${hud.stuck && hud.magnets > 0 ? ' is-hot' : ''}`} aria-label="Magnet" disabled={hud.magnets <= 0} onPointerDown={stop} onClick={boostMagnet}>
                <MagnetIcon />
                <span className="gs-boost__n">{hud.magnets}</span>
              </button>
              <button type="button" className={`gs-boost${hud.stuck && hud.magnets <= 0 && hud.shuffles > 0 ? ' is-hot' : ''}`} aria-label="Shuffle" disabled={hud.shuffles <= 0} onPointerDown={stop} onClick={boostShuffle}>
                <ShuffleIcon />
                <span className="gs-boost__n">{hud.shuffles}</span>
              </button>
              <button type="button" className="gs-boost" aria-label="Freeze time" disabled={hud.freezes <= 0} onPointerDown={stop} onClick={boostFreeze}>
                <FreezeIcon />
                <span className="gs-boost__n">{hud.freezes}</span>
              </button>
            </div>
          ) : null}
          {banner && (phase === 'play' || phase === 'clear') ? (
            <div className="action-banner gs-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="goodssort"
              icon={meta.icon}
              title={meta.title}
              hint="Drag goods between shelves. Three of a kind on one shelf pop — clear the store before time runs out."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Store sorted!' : 'Out of time'}
            subtitle={`Score ${hud.score} · reached level ${hud.level}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
