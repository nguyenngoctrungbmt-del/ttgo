import { useRef, useState } from 'react'
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
import { CRANE, DOZER, ROCK, SEASONS, TIER_NAMES, buildingSprite, plotSprite } from './art'
import '../../shared/action/action.css'
import './mergetown.css'

const meta = getGame('mergetown')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Piece = { tier: number; pop: number; drop: number; id: number }
type Walker = { x: number; y: number; tx: number; ty: number; c: string; t: number }
type Storm = { t: number; dur: number; swapped: boolean }

const COLS = 5
const ROWS = 6
const MAX_TIER = 9

type World = {
  grid: (Piece | null)[]
  next: number
  dropT: number
  dropMax: number
  town: number
  xp: number
  xpPrev: number
  xpNext: number
  score: number
  combo: number
  lastMerge: number
  clock: number
  coins: number
  stormIn: number
  storm: Storm | null
  walkers: Walker[]
  nextId: number
  danger: number
  stats: { score: number; best: number; merges: number; town: number; dozed: number }
}

function freshWorld(): World {
  return {
    grid: Array.from({ length: COLS * ROWS }, () => null),
    next: 0,
    dropT: 2,
    dropMax: 2.5,
    town: 1,
    xp: 0,
    xpPrev: 0,
    xpNext: 220,
    score: 0,
    combo: 0,
    lastMerge: -9,
    clock: 0,
    coins: 0,
    stormIn: 999,
    storm: null,
    walkers: [],
    nextId: 1,
    danger: 0,
    stats: { score: 0, best: 1, merges: 0, town: 1, dozed: 0 },
  }
}

const WALKER_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#a855f7', '#10b981', '#ec4899']

export default function MergeTownGame() {
  const run = useActionRun('mergetown')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ pid: number; idx: number; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null)
  const lastMilestone = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, town: 1, coins: 0, best: 1, combo: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, town: w.town, coins: w.coins, best: w.stats.best, combo: w.combo })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const top = 112
    const avail = H - top - 12
    const cs = Math.floor(Math.min((W - 20) / COLS, avail / ROWS))
    const gx = Math.round((W - cs * COLS) / 2)
    const gy = Math.round(top + (avail - cs * ROWS) / 2)
    return { W, H, cs, gx, gy }
  }

  function cellXY(i: number) {
    const { cs, gx, gy } = geo()
    return { x: gx + (i % COLS) * cs, y: gy + Math.floor(i / COLS) * cs }
  }

  function season(town: number) {
    return SEASONS[Math.floor((town - 1) / 2) % SEASONS.length]
  }

  function rollNext(): number {
    const w = world.current
    const r = Math.random()
    if (r < 0.035 + run.level('crane') * 0.015) return CRANE
    if (r < 0.09 + run.level('crane') * 0.015) return DOZER
    if (w.town >= 4 && Math.random() < Math.min(0.15, 0.06 + w.town * 0.006)) return ROCK
    const q = Math.random()
    if (w.town >= 5) return q < 0.55 ? 0 : q < 0.9 ? 1 : 2
    return q < 0.68 ? 0 : q < 0.95 ? 1 : 2
  }

  function computeDropMax() {
    const w = world.current
    w.dropMax = Math.max(1.1, 2.5 * Math.pow(0.95, w.town - 1)) * (1 + run.level('calm') * 0.06)
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    world.current = w
    fx.reset()
    lastMilestone.current = 0
    computeDropMax()
    const seeds = [0, 0, 1, 0]
    for (const t of seeds) placeRandom(t, false)
    if (run.level('crane') > 0) placeRandom(CRANE, false)
    w.next = rollNext()
    w.dropT = 3
    run.begin()
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'BUILD YOUR TOWN', sub: 'drag matching buildings together' })
    sfx.ready()
    pushHud()
  }

  function empties() {
    const out: number[] = []
    world.current.grid.forEach((p, i) => {
      if (!p) out.push(i)
    })
    return out
  }

  function placeRandom(tier: number, anim = true) {
    const w = world.current
    const e = empties()
    if (!e.length) return -1
    const i = e[Math.floor(Math.random() * e.length)]
    w.grid[i] = { tier, pop: 0, drop: anim ? 1 : 0, id: w.nextId++ }
    return i
  }

  function dropNext() {
    const w = world.current
    const e = empties()
    if (!e.length) {
      die()
      return
    }
    const count = 1 + (w.town >= 3 ? 1 : 0) + (w.town >= 7 ? 1 : 0) + (w.town >= 12 ? 1 : 0)
    for (let k = 0; k < count; k++) {
      if (!empties().length) break
      placeRandom(k === 0 ? w.next : rollNext())
    }
    w.next = rollNext()
    w.dropT = w.dropMax
    sfx.whoosh()
  }

  function gainXp(v: number) {
    const w = world.current
    w.xp += v
    while (w.xp >= w.xpNext) {
      w.town += 1
      w.xpPrev = w.xpNext
      w.xpNext = Math.round(w.xpNext + 220 * Math.pow(w.town, 1.45))
      w.stats.town = w.town
      computeDropMax()
      const newSeason = (w.town - 1) % 2 === 0
      const gift = w.town % 3 === 0 ? CRANE : DOZER
      const gi = placeRandom(gift)
      setBanner({ key: Date.now(), text: `TOWN LEVEL ${w.town}`, sub: newSeason ? season(w.town).name : gi >= 0 ? `gift: ${gift === CRANE ? 'crane' : 'bulldozer'}` : 'drops speed up' })
      if (w.town === 3) w.stormIn = 12
      sfx.levelUp()
      haptic.success()
      fx.flash('#fef08a', 0.15)
      if (w.town - lastMilestone.current >= 5 && w.town % 5 === 0) {
        lastMilestone.current = w.town
        void trackEvent('action_milestone', { game_id: 'mergetown', kind: 'town', value: w.town })
      }
    }
  }

  function mergeAt(src: number, dst: number) {
    const w = world.current
    const a = w.grid[src]!
    const b = w.grid[dst]!
    const { cs } = geo()
    const c = cellXY(dst)
    const cx = c.x + cs / 2
    const cy = c.y + cs / 2
    let newTier = b.tier + 1
    if (a.tier === CRANE) newTier = b.tier + 1
    w.grid[src] = null
    b.tier = Math.min(MAX_TIER, newTier)
    b.pop = 1
    w.combo = w.clock - w.lastMerge < 2.2 ? w.combo + 1 : 1
    w.lastMerge = w.clock
    const mult = Math.min(3, 1 + (w.combo - 1) * 0.25)
    const base = 10 * Math.pow(2, b.tier)
    const gain = Math.round(base * mult)
    w.score += gain
    w.stats.score = w.score
    w.stats.merges += 1
    const isNewBest = b.tier + 1 > w.stats.best
    w.stats.best = Math.max(w.stats.best, b.tier + 1)
    const big = b.tier >= 4
    fx.burst(cx, cy, { count: 12 + b.tier * 3, color: ['#fde047', '#ffffff', '#86efac', '#7dd3fc'], speed: 160 + b.tier * 20, shape: 'spark', gravity: 120 })
    fx.ring(cx, cy, { color: '#fef08a', maxR: cs * (0.7 + b.tier * 0.06), life: 0.35, width: 3 })
    fx.text(cx, cy - cs * 0.5, w.combo > 1 ? `+${gain} x${w.combo}` : `+${gain}`, w.combo > 2 ? '#fde047' : '#ffffff', 15 + Math.min(8, b.tier))
    if (isNewBest && b.tier >= 2) {
      fx.text(cx, cy - cs, TIER_NAMES[b.tier].toUpperCase() + '!', '#a7f3d0', 18)
      if (b.tier >= 4) setBanner({ key: Date.now(), text: `${TIER_NAMES[b.tier].toUpperCase()}!`, sub: 'new building unlocked' })
    }
    if (big) {
      const coin = b.tier - 2
      w.coins += coin
      fx.burst(cx, cy, { count: 6 + coin * 2, color: ['#facc15', '#fde047', '#ca8a04'], speed: 220, shape: 'square', size: 4, gravity: 500 })
      fx.text(cx, cy + cs * 0.3, `+${coin} coin${coin > 1 ? 's' : ''}`, '#facc15', 14)
      fx.shake(2 + b.tier * 0.6, 0.2)
      fx.stop(0.04)
      sfx.combo()
    }
    sfx.pop()
    sfx.score(Math.min(10, w.combo + b.tier))
    haptic.medium()
    gainXp(base)
    run.update(w.stats)
    pushHud()
  }

  function dozeAt(src: number, dst: number) {
    const w = world.current
    const { cs } = geo()
    const c = cellXY(dst)
    const t = w.grid[dst]!
    w.grid[src] = null
    w.grid[dst] = null
    w.stats.dozed += 1
    w.score += 5
    fx.burst(c.x + cs / 2, c.y + cs * 0.7, { count: 22, color: ['#a8a29e', '#78716c', '#d6d3d1', '#facc15'], speed: 200, shape: 'square', size: 5, gravity: 600 })
    fx.text(c.x + cs / 2, c.y, t.tier <= MAX_TIER ? `${TIER_NAMES[t.tier]} cleared` : 'Cleared', '#e7e5e4', 14)
    fx.shake(5, 0.2)
    sfx.boom(0.3)
    haptic.heavy()
    run.update(w.stats)
    pushHud()
  }

  function clearRocks(src: number, dst: number) {
    const w = world.current
    const { cs } = geo()
    for (const i of [src, dst]) {
      const c = cellXY(i)
      fx.burst(c.x + cs / 2, c.y + cs * 0.6, { count: 14, color: ['#a8a29e', '#d6d3d1', '#57534e'], speed: 190, shape: 'square', size: 5, gravity: 600 })
      w.grid[i] = null
    }
    w.score += 40
    w.stats.score = w.score
    const c = cellXY(dst)
    fx.text(c.x + cs / 2, c.y, 'RUBBLE CLEARED +40', '#e7e5e4', 14)
    fx.shake(4, 0.15)
    sfx.boom(0.2)
    haptic.medium()
    run.update(w.stats)
    pushHud()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.5)
    fx.slowmo(1, 0.3)
    fx.stop(0.12)
    sfx.lose()
    haptic.error()
    const { W, H } = geo()
    fx.text(W / 2, H / 2, 'TOWN FULL!', '#fecaca', 26)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.coins + w.town * 2 + Math.floor(w.score / 1500)) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.stats.best >= 6, stats: { ...w.stats }, coins }, revive)
    }, 1200)
  }

  /** Revive: bulldoze the six smallest buildings and give a breather. */
  function revive() {
    const w = world.current
    const { cs } = geo()
    const order = w.grid
      .map((p, i) => ({ p, i }))
      .filter((o) => o.p && (o.p.tier <= MAX_TIER || o.p.tier === ROCK))
      .sort((a, b) => (a.p!.tier === ROCK ? -1 : a.p!.tier) - (b.p!.tier === ROCK ? -1 : b.p!.tier))
      .slice(0, 6)
    for (const o of order) {
      const c = cellXY(o.i)
      fx.burst(c.x + cs / 2, c.y + cs / 2, { count: 10, color: ['#a8a29e', '#facc15'], speed: 160, shape: 'square', gravity: 500 })
      w.grid[o.i] = null
    }
    w.dropT = w.dropMax * 2.5
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'six plots cleared' })
    pushHud()
    setPhaseBoth('play')
  }

  // ── Input ─────────────────────────────────────────────

  function cellAt(x: number, y: number) {
    const { cs, gx, gy } = geo()
    const c = Math.floor((x - gx) / cs)
    const r = Math.floor((y - gy) / cs)
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return -1
    return r * COLS + c
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const el = e.currentTarget
    const { x, y } = localPoint(e, el)
    const i = cellAt(x, y)
    const w = world.current
    if (i < 0 || !w.grid[i] || w.grid[i]!.drop > 0.3) return
    el.setPointerCapture(e.pointerId)
    drag.current = { pid: e.pointerId, idx: i, x, y, sx: x, sy: y, moved: false }
    sfx.tap()
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.pid !== e.pointerId) return
    const { x, y } = localPoint(e, e.currentTarget)
    d.x = x
    d.y = y
    if (Math.hypot(x - d.sx, y - d.sy) > 8) d.moved = true
  }

  function onUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.pid !== e.pointerId) return
    drag.current = null
    const w = world.current
    if (phaseRef.current !== 'play') return
    const src = w.grid[d.idx]
    if (!src) return
    const { cs } = geo()
    if (!d.moved) {
      const c = cellXY(d.idx)
      const name = src.tier === CRANE ? 'Crane: drop on a building to upgrade' : src.tier === DOZER ? 'Bulldozer: drop on a plot to clear' : src.tier === ROCK ? 'Rubble: pair two to clear' : TIER_NAMES[src.tier]
      fx.text(c.x + cs / 2, c.y - 6, name, '#ffffff', 13)
      return
    }
    const dst = cellAt(d.x, d.y - cs * 0.25)
    if (dst < 0 || dst === d.idx) return
    const tgt = w.grid[dst]
    if (!tgt) {
      w.grid[dst] = src
      w.grid[d.idx] = null
      src.pop = 0.5
      sfx.move()
      return
    }
    if (tgt.drop > 0.3) return
    if (src.tier === DOZER && tgt.tier !== DOZER) return dozeAt(d.idx, dst)
    if (src.tier === ROCK && tgt.tier === ROCK) return clearRocks(d.idx, dst)
    if (src.tier === CRANE && tgt.tier < MAX_TIER) return mergeAt(d.idx, dst)
    if (src.tier === tgt.tier && src.tier < MAX_TIER) return mergeAt(d.idx, dst)
    // no match: wobble back
    tgt.pop = 0.4
    fx.text(cellXY(dst).x + cs / 2, cellXY(dst).y, src.tier === tgt.tier ? 'Max tier' : 'No match', '#fecaca', 13)
    sfx.miss()
  }

  // ── Frame ─────────────────────────────────────────────

  function updateWalkers(dt: number) {
    const w = world.current
    const { cs, gx, gy } = geo()
    let sum = 0
    for (const p of w.grid) if (p && p.tier <= MAX_TIER) sum += p.tier
    const want = Math.min(12, Math.floor(sum / 4))
    while (w.walkers.length < want) {
      const c = Math.floor(Math.random() * (COLS + 1))
      const r = Math.floor(Math.random() * (ROWS + 1))
      const x = gx + c * cs
      const y = gy + r * cs
      w.walkers.push({ x, y, tx: x, ty: y, c: WALKER_COLORS[w.walkers.length % WALKER_COLORS.length], t: rand(0, 5) })
    }
    if (w.walkers.length > want) w.walkers.length = want
    for (const k of w.walkers) {
      k.t += dt
      const dx = k.tx - k.x
      const dy = k.ty - k.y
      const l = Math.hypot(dx, dy)
      if (l < 1) {
        const c = Math.round((k.x - gx) / cs)
        const r = Math.round((k.y - gy) / cs)
        const opts: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        const [oc, or] = opts[Math.floor(Math.random() * 4)]
        const nc = clamp(c + oc, 0, COLS)
        const nr = clamp(r + or, 0, ROWS)
        k.tx = gx + nc * cs
        k.ty = gy + nr * cs
      } else {
        const sp = 22 * dt
        k.x += (dx / l) * Math.min(sp, l)
        k.y += (dy / l) * Math.min(sp, l)
      }
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const { cs, gx, gy } = geo()

    if (ph === 'idle' && w.grid.every((p) => !p)) {
      const demo = [0, 1, 2, 3, 0, 4, 1, 5, 2, 6, 3, 7]
      demo.forEach((tier, k) => {
        w.grid[(k * 7 + 3) % (COLS * ROWS)] = { tier, pop: 0, drop: 0, id: k }
      })
    }

    if (ph === 'play') {
      w.clock += dt
      w.dropT -= dt
      const e = empties().length
      w.danger = e <= 3 ? 1 : 0
      if (w.danger && Math.floor(w.dropT * 2) !== Math.floor((w.dropT + dt) * 2)) sfx.tick()
      if (w.dropT <= 0) dropNext()
      if (w.combo > 0 && w.clock - w.lastMerge > 2.2) {
        w.combo = 0
        pushHud()
      }
      // storms from town level 3
      if (w.town >= 3) {
        w.stormIn -= dt
        if (!w.storm && w.stormIn <= 0) {
          w.storm = { t: 0, dur: 4.5, swapped: false }
          w.stormIn = rand(35, 50)
          setBanner({ key: Date.now(), text: 'STORM!', sub: 'buildings will be shuffled' })
          sfx.boom(0.25)
        }
      }
    }
    if (w.storm) {
      w.storm.t += dt
      if (!w.storm.swapped && w.storm.t > 2.6) {
        w.storm.swapped = true
        const occ = w.grid.map((p, i) => (p ? i : -1)).filter((i) => i >= 0)
        for (let k = 0; k < 4 && occ.length; k++) {
          const a = occ[Math.floor(Math.random() * occ.length)]
          const b = Math.floor(Math.random() * w.grid.length)
          const tmp = w.grid[a]
          w.grid[a] = w.grid[b]
          w.grid[b] = tmp
          if (w.grid[a]) w.grid[a]!.pop = 0.8
          if (w.grid[b]) w.grid[b]!.pop = 0.8
        }
        fx.flash('#e0f2fe', 0.2)
        fx.shake(6, 0.3)
        sfx.whoosh()
        haptic.medium()
      }
      if (w.storm.t >= w.storm.dur) w.storm = null
    }
    for (const p of w.grid) {
      if (!p) continue
      if (p.pop > 0) p.pop = Math.max(0, p.pop - raw * 3)
      if (p.drop > 0) {
        const before = p.drop
        p.drop = Math.max(0, p.drop - raw * 2.6)
        if (before > 0 && p.drop === 0) {
          p.pop = 0.7
          const i = w.grid.indexOf(p)
          const c = cellXY(i)
          fx.burst(c.x + cs / 2, c.y + cs * 0.85, { count: 8, color: ['#e7e5e4', '#d6d3d1'], speed: 90, angle: -Math.PI / 2, spread: 2.8, gravity: 200 })
          if (ph === 'play') sfx.thud()
        }
      }
    }
    updateWalkers(raw)

    // ── Draw ─────────────────────────────────────────
    const sz = season(w.town)
    const night = sz.name === 'Night City'
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, night ? '#0f172a' : sz.sky)
    bg.addColorStop(1, night ? '#312e81' : '#ffffff')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // distant hills
    ctx.fillStyle = sz.grassDark
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.moveTo(0, gy - 6)
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, gy - 24 - Math.sin(x * 0.02 + 1) * 14)
    ctx.lineTo(W, gy)
    ctx.lineTo(0, gy)
    ctx.fill()
    ctx.globalAlpha = 1

    // darker band behind the HUD for contrast
    const band = ctx.createLinearGradient(0, 0, 0, 112)
    band.addColorStop(0, 'rgba(15,23,42,0.55)')
    band.addColorStop(1, 'rgba(15,23,42,0)')
    ctx.fillStyle = band
    ctx.fillRect(0, 0, W, 112)

    fx.applyShake(ctx)
    // board: roads + plots
    ctx.fillStyle = sz.road
    ctx.beginPath()
    ctx.roundRect(gx - 6, gy - 6, cs * COLS + 12, cs * ROWS + 12, 14)
    ctx.fill()
    if (w.danger && ph === 'play') {
      ctx.strokeStyle = `rgba(239,68,68,${0.5 + Math.sin(t * 10) * 0.4})`
      ctx.lineWidth = 4
      ctx.stroke()
    }
    for (let i = 0; i < COLS * ROWS; i++) {
      const c = cellXY(i)
      ctx.drawImage(plotSprite(Math.floor((w.town - 1) / 2), cs), c.x, c.y, cs, cs)
    }
    // drag target highlight
    const d = drag.current
    if (d && d.moved) {
      const dst = cellAt(d.x, d.y - cs * 0.25)
      const src = w.grid[d.idx]
      if (dst >= 0 && dst !== d.idx && src) {
        const tgt = w.grid[dst]
        const ok = !tgt || (src.tier === DOZER && tgt.tier !== DOZER) || (src.tier === CRANE && tgt.tier < MAX_TIER) || (src.tier === tgt.tier && (src.tier < MAX_TIER || src.tier === ROCK))
        const c = cellXY(dst)
        ctx.fillStyle = ok ? (tgt ? 'rgba(253,224,71,0.55)' : 'rgba(255,255,255,0.35)') : 'rgba(239,68,68,0.35)'
        ctx.beginPath()
        ctx.roundRect(c.x + 3, c.y + 3, cs - 6, cs - 6, 8)
        ctx.fill()
      }
      // matching plots glow while dragging
      if (src && (src.tier <= MAX_TIER || src.tier === ROCK)) {
        for (let i = 0; i < w.grid.length; i++) {
          const p = w.grid[i]
          if (i === d.idx || !p || p.tier !== src.tier || p.tier === MAX_TIER) continue
          const c = cellXY(i)
          glow(ctx, c.x + cs / 2, c.y + cs / 2, cs * 0.7, '#fde047', 0.35 + Math.sin(t * 8) * 0.12)
        }
      }
    }
    // buildings
    for (let i = 0; i < w.grid.length; i++) {
      const p = w.grid[i]
      if (!p || (d && d.moved && d.idx === i)) continue
      const c = cellXY(i)
      const sx = 1 + p.pop * 0.22
      const sy = 1 - p.pop * 0.12 + (p.pop > 0.5 ? (p.pop - 0.5) * 0.4 : 0)
      const s = cs * 0.98
      const yo = -p.drop * p.drop * (c.y + cs + 30)
      if (p.drop > 0) {
        ctx.fillStyle = `rgba(0,0,0,${0.25 * (1 - p.drop)})`
        ctx.beginPath()
        ctx.ellipse(c.x + cs / 2, c.y + cs * 0.88, cs * 0.35 * (1 - p.drop * 0.6), cs * 0.07, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      if (p.tier >= 8 && p.tier <= MAX_TIER) glow(ctx, c.x + cs / 2, c.y + cs / 2, cs * 0.8, '#fde047', 0.18 + Math.sin(t * 3 + i) * 0.06)
      else if (p.tier === CRANE || p.tier === DOZER) glow(ctx, c.x + cs / 2, c.y + cs / 2, cs * 0.6, '#67e8f9', 0.3 + Math.sin(t * 5 + i) * 0.12)
      ctx.save()
      ctx.translate(c.x + cs / 2, c.y + cs * 0.92 + yo)
      ctx.scale(sx, sy)
      ctx.drawImage(buildingSprite(p.tier, s), -s / 2, -s * 0.92, s, s)
      ctx.restore()
      if (night && p.tier >= 2 && p.tier <= MAX_TIER) glow(ctx, c.x + cs / 2, c.y + cs * 0.6, cs * 0.45, '#fde68a', 0.18)
    }
    // residents
    for (const k of w.walkers) {
      const bob = Math.abs(Math.sin(k.t * 9)) * 1.5
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(k.x, k.y + 2, 3, 1.2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = k.c
      ctx.fillRect(k.x - 2, k.y - 6 - bob, 4, 6)
      ctx.fillStyle = '#fde68a'
      ctx.beginPath()
      ctx.arc(k.x, k.y - 8 - bob, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
    // dragged building
    if (d && d.moved) {
      const p = w.grid[d.idx]
      if (p) {
        const s = cs * 1.12
        ctx.globalAlpha = 0.3
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.ellipse(d.x + 6, d.y + cs * 0.15, cs * 0.35, cs * 0.08, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.drawImage(buildingSprite(p.tier, s), d.x - s / 2, d.y - s * 0.95 - cs * 0.1 + Math.sin(t * 10) * 1.5, s, s)
      }
    }
    // storm cloud
    if (w.storm) {
      const k = w.storm.t / w.storm.dur
      const cx = -80 + (W + 160) * k
      const cy = gy + cs * 1.2
      ctx.globalAlpha = 0.85
      ctx.fillStyle = '#475569'
      for (const [ox, oy, r] of [[0, 0, 34], [-30, 8, 24], [30, 6, 26], [12, -16, 24]] as const) {
        ctx.beginPath()
        ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      ctx.strokeStyle = 'rgba(186,230,253,0.7)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < 14; i++) {
        const rx = cx - 50 + ((i * 37 + t * 200) % 100)
        const ry = cy + 20 + ((i * 53 + t * 400) % (cs * ROWS))
        ctx.moveTo(rx, ry)
        ctx.lineTo(rx - 3, ry + 9)
      }
      ctx.stroke()
      if (Math.sin(t * 13) > 0.97) {
        ctx.strokeStyle = '#fef08a'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(cx, cy + 20)
        ctx.lineTo(cx - 8, cy + 50)
        ctx.lineTo(cx + 4, cy + 52)
        ctx.lineTo(cx - 6, cy + 90)
        ctx.stroke()
      }
    }
    fx.draw(ctx)
    ctx.restore()

    // top strip: next drop + town xp
    if (ph !== 'idle') {
      const nx = W / 2
      const ny = 60
      const k = clamp(w.dropT / w.dropMax, 0, 1)
      ctx.fillStyle = 'rgba(15,23,42,0.45)'
      ctx.beginPath()
      ctx.arc(nx, ny, 25, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = w.danger ? '#ef4444' : '#fde047'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(nx, ny, 25, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k)
      ctx.stroke()
      ctx.drawImage(buildingSprite(w.next, 38), nx - 19, ny - 21, 38, 38)
      ctx.fillStyle = '#fff'
      ctx.font = "800 9px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('NEXT', nx, ny + 28)
      // xp bar
      const bw = W - 28
      const prog = clamp((w.xp - w.xpPrev) / Math.max(1, w.xpNext - w.xpPrev), 0, 1)
      ctx.fillStyle = 'rgba(15,23,42,0.35)'
      ctx.beginPath()
      ctx.roundRect(14, 98, bw, 7, 4)
      ctx.fill()
      ctx.fillStyle = '#34d399'
      ctx.beginPath()
      ctx.roundRect(14, 98, Math.max(7, bw * prog), 7, 4)
      ctx.fill()
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const won = hud.best >= 6
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena mergetown-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud mergetown-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Town Lv {hud.town}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">Coins {hud.coins}</span>
                {hud.combo > 1 ? <span className="mergetown-combo">x{hud.combo}</span> : null}
              </div>
            </div>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner mergetown-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="mergetown"
              icon={meta.icon}
              title={meta.title}
              hint="Drag a building onto an identical one to merge it. Keep plots free — when the town is full, it's over."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Grand mayor!' : 'Town full'}
            subtitle={`Score ${hud.score} · Town level ${hud.town} · best: ${TIER_NAMES[Math.max(0, hud.best - 1)]}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
