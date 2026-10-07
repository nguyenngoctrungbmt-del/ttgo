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
import { ANIMALS, CHAINS, GEN, GEN_NAMES, GIFT, STAR, drawAnimal, drawBolt, itemSprite } from './art'
import '../../shared/action/action.css'
import './farmmerge.css'

const meta = getGame('farmmerge')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Item = { chain: number; tier: number; pop: number; pending: boolean; id: number; fly: { x: number; y: number; t: number } | null }
type Req = { c: number; t: number; done: boolean }
type Order = { animal: number; req: Req[]; reward: number; enter: number; leave: number; happy: number }
type MergeAnim = { chain: number; tier: number; x0: number; y0: number; dst: number; t: number; star: boolean }
type Event = { kind: 'rain' | 'market'; t: number; dur: number } | null

const COLS = 6
const ROWS = 6
const CELLS = COLS * ROWS
const DAY_SECS = 100

const isItem = (it: Item | null) => !!it && it.chain < GEN
const maxTier = (c: number) => CHAINS[c].items.length - 1

type World = {
  demo: boolean
  cells: (Item | null)[]
  orders: (Order | null)[]
  orderIn: number[]
  anims: MergeAnim[]
  day: number
  dayT: number
  filled: number
  goal: number
  met: boolean
  energy: number
  maxEnergy: number
  regen: number
  regenT: number
  score: number
  chains: number
  best: number
  seen: Set<string>
  combo: number
  lastMerge: number
  clock: number
  nextId: number
  selected: number
  event: Event
  eventDone: boolean
  demoT: number
  stats: { score: number; days: number; orders: number; merges: number; best: number }
}

function freshWorld(demo = false): World {
  return {
    demo,
    cells: Array.from({ length: CELLS }, () => null),
    orders: [null, null, null],
    orderIn: [0.4, 1.2, 2],
    anims: [],
    day: 1,
    dayT: DAY_SECS,
    filled: 0,
    goal: 3,
    met: false,
    energy: 30,
    maxEnergy: 30,
    regen: 2.5,
    regenT: 2.5,
    score: 0,
    chains: 2,
    best: 0,
    seen: new Set(['0|0', '1|0']),
    combo: 0,
    lastMerge: -9,
    clock: 0,
    nextId: 1,
    selected: -1,
    event: null,
    eventDone: false,
    demoT: 0,
    stats: { score: 0, days: 0, orders: 0, merges: 0, best: 1 },
  }
}

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

export default function FarmMergeGame() {
  const run = useActionRun('farmmerge')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(true))
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ pid: number; idx: number; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null)
  const lastEvent = useRef(0)
  const lastNote = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ day: 1, time: DAY_SECS, score: 0, filled: 0, goal: 3, combo: 0, days: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ day: w.day, time: Math.max(0, Math.ceil(w.dayT)), score: w.score, filled: w.filled, goal: w.goal, combo: w.combo, days: w.stats.days })
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const barH = 66
    const oy = 54
    const oh = 84
    const top = oy + oh + 10
    const cs = Math.floor(Math.min((W - 14) / COLS, (H - top - barH - 6) / ROWS))
    const bx = Math.round((W - cs * COLS) / 2)
    const by = top
    return { W, H, barH, oy, oh, cs, bx, by }
  }

  function cellXY(i: number) {
    const { cs, bx, by } = geo()
    return { x: bx + (i % COLS) * cs, y: by + Math.floor(i / COLS) * cs }
  }

  function cellAt(x: number, y: number) {
    const { cs, bx, by } = geo()
    const c = Math.floor((x - bx) / cs)
    const r = Math.floor((y - by) / cs)
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return -1
    return r * COLS + c
  }

  function orderRect(i: number) {
    const { W, oy, oh } = geo()
    const cw = (W - 16 - 12) / 3
    return { x: 8 + i * (cw + 6), y: oy, w: cw, h: oh }
  }

  function bar() {
    const { W, H, barH } = geo()
    const y = H - barH + 8
    const h = barH - 14
    return {
      energy: { x: 8, y, w: W * 0.36, h },
      info: { x: 8 + W * 0.36 + 6, y, w: W - 16 - W * 0.36 - 6 - 62, h },
      trash: { x: W - 8 - 56, y, w: 56, h },
    }
  }

  function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
  }

  function note(x: number, y: number, text: string) {
    if (performance.now() - lastNote.current < 800) return
    lastNote.current = performance.now()
    fx.text(x, y, text, '#fecaca', 13)
  }

  function newItem(chain: number, tier: number): Item {
    return { chain, tier, pop: 1, pending: false, id: world.current.nextId++, fly: null }
  }

  function nearestEmpty(from: number) {
    const w = world.current
    const fc = from % COLS
    const fr = Math.floor(from / COLS)
    let best = -1
    let bd = 1e9
    for (let i = 0; i < CELLS; i++) {
      if (w.cells[i]) continue
      const d = Math.hypot((i % COLS) - fc, Math.floor(i / COLS) - fr) + Math.random() * 0.01
      if (d < bd) {
        bd = d
        best = i
      }
    }
    return best
  }

  function spawnFrom(src: number, chain: number, tier: number) {
    const w = world.current
    const i = nearestEmpty(src)
    if (i < 0) return -1
    const { cs } = geo()
    const s = cellXY(src)
    const it = newItem(chain, tier)
    it.fly = { x: s.x + cs / 2, y: s.y + cs / 2, t: 0 }
    w.cells[i] = it
    return i
  }

  // ── Orders ──────────────────────────────────────────

  function makeOrder(): Order {
    const w = world.current
    const d = w.day
    const hi = 1 + Math.floor(d * 0.75)
    const n = d >= 3 && Math.random() < 0.35 ? 2 : 1
    const req: Req[] = []
    for (let k = 0; k < n; k++) {
      const c = Math.floor(Math.random() * w.chains)
      const top = Math.min(maxTier(c) - 1, hi)
      const lo = Math.max(1, top - 2)
      let t = Math.floor(rand(lo, top + 1))
      if (n === 2) t = Math.max(1, t - 1)
      if (req.some((r) => r.c === c && r.t === t)) t = Math.max(1, t - 1)
      req.push({ c, t, done: false })
    }
    const value = req.reduce((s, r) => s + Math.pow(2, r.t), 0)
    return { animal: Math.floor(Math.random() * ANIMALS.length), req, reward: value * 10, enter: 0, leave: -1, happy: 0 }
  }

  function tryDeliver(idx: number, oi: number) {
    const w = world.current
    const o = w.orders[oi]
    const it = w.cells[idx]
    if (!o || !it || o.leave >= 0 || !isItem(it)) return false
    const r = o.req.find((q) => !q.done && q.c === it.chain && q.t === it.tier)
    if (!r) return false
    r.done = true
    w.cells[idx] = null
    if (w.selected === idx) w.selected = -1
    const rc = orderRect(oi)
    fx.burst(rc.x + rc.w / 2, rc.y + rc.h / 2, { count: 12, color: ['#86efac', '#ffffff', '#fde047'], speed: 140, shape: 'spark', gravity: 100 })
    sfx.match()
    haptic.light()
    o.happy = 1
    if (o.req.every((q) => q.done)) completeOrder(oi)
    pushHud()
    return true
  }

  function completeOrder(oi: number) {
    const w = world.current
    const o = w.orders[oi]!
    o.leave = 0
    const mult = w.event?.kind === 'market' ? 2 : 1
    const pts = o.reward * mult
    w.score += pts
    w.filled += 1
    w.stats.orders += 1
    w.stats.score = w.score
    const value = o.req.reduce((s, r) => s + Math.pow(2, r.t), 0)
    const bonus = Math.ceil(value * 0.2)
    w.energy = Math.min(w.maxEnergy + 20, w.energy + bonus)
    const rc = orderRect(oi)
    const cx = rc.x + rc.w / 2
    const cy = rc.y + rc.h / 2
    fx.burst(cx, cy, { count: 26, color: ['#fde047', '#facc15', '#ffffff', '#86efac'], speed: 220, shape: 'spark', gravity: 200 })
    fx.ring(cx, cy, { color: '#fde047', maxR: rc.w * 0.7, life: 0.4, width: 4 })
    fx.text(cx, cy + 10, `+${pts}`, '#fde047', 18)
    fx.text(cx, cy + 30, `+${bonus} energy`, '#fef08a', 12)
    fx.stop(0.05)
    sfx.win()
    haptic.success()
    // occasional gifts
    const r = Math.random()
    if (r < 0.2) {
      const i = nearestEmpty(Math.floor(CELLS / 2))
      if (i >= 0) {
        w.cells[i] = newItem(r < 0.06 ? STAR : GIFT, 0)
        w.cells[i]!.fly = { x: cx, y: cy, t: 0 }
        fx.text(cx, cy - 18, r < 0.06 ? 'Wild star!' : 'Gift box!', '#bfdbfe', 13)
      }
    }
    if (!w.met && w.filled >= w.goal) {
      w.met = true
      showBanner('GOAL MET!', 'keep filling orders for bonus points')
      fx.flash('#bbf7d0', 0.15)
    }
    run.update(w.stats)
  }

  // ── Run lifecycle ───────────────────────────────────

  function start() {
    void unlockAudio()
    const w = freshWorld(false)
    world.current = w
    fx.reset()
    lastEvent.current = 0
    w.maxEnergy = 30 + run.level('energy') * 5
    w.energy = w.maxEnergy
    w.regen = 2.5 / (1 + run.level('regen') * 0.1)
    w.regenT = w.regen
    w.cells[2 * COLS + 1] = newItem(GEN + 0, 0)
    w.cells[3 * COLS + 4] = newItem(GEN + 1, 0)
    w.cells[2 * COLS + 2] = newItem(0, 0)
    w.cells[2 * COLS + 3] = newItem(0, 0)
    w.cells[4 * COLS + 4] = newItem(1, 0)
    w.goal = 3
    run.begin()
    setPhaseBoth('play')
    showBanner('DAY 1', 'tap the seed bag to plant')
    sfx.ready()
    pushHud()
  }

  function placeGenerator(kind: number) {
    const w = world.current
    const i = nearestEmpty(CELLS - 1 - kind * 5)
    if (i < 0) return false
    w.cells[i] = newItem(GEN + kind, 0)
    const { cs } = geo()
    const s = cellXY(i)
    fx.ring(s.x + cs / 2, s.y + cs / 2, { color: '#fde047', maxR: cs, life: 0.6, width: 4 })
    fx.burst(s.x + cs / 2, s.y + cs / 2, { count: 20, color: ['#fde047', '#86efac', '#ffffff'], speed: 160, shape: 'spark', gravity: 100 })
    return true
  }

  function nextDay() {
    const w = world.current
    w.stats.days += 1
    w.day += 1
    w.dayT = DAY_SECS
    w.filled = 0
    w.goal = 1 + w.day * 2
    w.met = false
    w.event = null
    w.eventDone = false
    w.energy = Math.min(w.maxEnergy + 20, w.energy + 10)
    let sub = `fill ${w.goal} orders · +10 energy`
    if (w.day === 2 && w.chains < 3) {
      w.chains = 3
      placeGenerator(2)
      sub = 'new: Apple Tree!'
    } else if (w.day === 3 && w.chains < 4) {
      w.chains = 4
      placeGenerator(3)
      sub = 'new: Flower Pot!'
    }
    showBanner(`DAY ${w.day}`, sub)
    sfx.levelUp()
    haptic.success()
    if (w.day % 3 === 0 && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'farmmerge', kind: 'day', value: w.day })
    }
    run.update(w.stats)
    pushHud()
  }

  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.3)
    fx.shake(8, 0.4)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    const { W, by, cs } = geo()
    fx.text(W / 2, by + cs * 3, 'THE DAY IS OVER', '#fecaca', 22)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.stats.days * 5 + Math.min(60, w.stats.orders) * 0.3 + w.best + 2) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.stats.days >= 2, stats: { ...w.stats }, coins }, revive)
    }, 1100)
  }

  /** Revive: 40 more seconds, +15 energy and the six smallest items cleared if the board is crowded. */
  function revive() {
    const w = world.current
    w.dayT = 40
    w.energy = Math.min(w.maxEnergy + 20, w.energy + 15)
    const used = w.cells.filter(Boolean).length
    if (used > CELLS - 6) {
      const small = w.cells
        .map((it, i) => ({ it, i }))
        .filter((o) => isItem(o.it))
        .sort((a, b) => a.it!.tier - b.it!.tier)
        .slice(0, 6)
      const { cs } = geo()
      for (const o of small) {
        const s = cellXY(o.i)
        fx.burst(s.x + cs / 2, s.y + cs / 2, { count: 8, color: ['#86efac', '#ffffff'], speed: 120, gravity: 200 })
        w.cells[o.i] = null
      }
    }
    showBanner('REVIVED!', '+40 seconds · +15 energy')
    pushHud()
    setPhaseBoth('play')
  }

  // ── Merging ─────────────────────────────────────────

  function finishMerge(a: MergeAnim) {
    const w = world.current
    const it = w.cells[a.dst]
    if (!it) return
    it.pending = false
    it.chain = a.chain
    it.tier = Math.min(maxTier(a.chain), a.tier + 1)
    it.pop = 1
    const { cs } = geo()
    const s = cellXY(a.dst)
    const cx = s.x + cs / 2
    const cy = s.y + cs / 2
    w.combo = w.clock - w.lastMerge < 1.8 ? w.combo + 1 : 1
    w.lastMerge = w.clock
    w.stats.merges += 1
    const col = CHAINS[a.chain].color
    fx.burst(cx, cy, { count: 12 + it.tier * 3, color: [col, '#ffffff', '#fde047', '#86efac'], speed: 150 + it.tier * 15, shape: 'spark', gravity: 120 })
    fx.burst(cx, cy, { count: 6, color: ['#bbf7d0', '#ffffff'], speed: 70, size: 4, gravity: -20 })
    fx.ring(cx, cy, { color: col, maxR: cs * (0.7 + it.tier * 0.05), life: 0.36, width: 4 })
    fx.ring(cx, cy, { color: '#ffffff', maxR: cs * 0.42, life: 0.22, width: 2 })
    fx.stop(0.03 + Math.min(0.05, it.tier * 0.006))
    fx.shake(1.5 + it.tier * 0.4, 0.14)
    fx.text(cx, cy - cs * 0.5, w.combo > 1 ? `${CHAINS[a.chain].items[it.tier]} x${w.combo}` : CHAINS[a.chain].items[it.tier], w.combo > 2 ? '#fde047' : '#ffffff', 12 + Math.min(5, it.tier))
    sfx.pop()
    sfx.score(Math.min(12, w.combo + it.tier))
    if (w.combo >= 3) {
      sfx.combo()
      if (w.combo === 3 || w.combo % 5 === 0) showBanner(`COMBO x${w.combo}!`, 'green thumb')
    }
    haptic.medium()
    w.score += 5 * Math.pow(2, it.tier)
    w.stats.score = w.score
    if (a.chain === 0 && it.tier + 1 > w.stats.best) w.stats.best = it.tier + 1
    w.best = Math.max(w.best, it.tier)
    const key = `${a.chain}|${it.tier}`
    if (!w.seen.has(key)) {
      w.seen.add(key)
      if (it.tier >= 2) {
        showBanner(`NEW: ${CHAINS[a.chain].items[it.tier].toUpperCase()}!`, it.tier >= maxTier(a.chain) ? 'top of the chain' : `next: ${CHAINS[a.chain].items[it.tier + 1]}`)
        sfx.levelUp()
      }
    }
    w.selected = a.dst
    run.update(w.stats)
    pushHud()
  }

  function tapCell(i: number) {
    const w = world.current
    const it = w.cells[i]
    if (!it) return
    const { cs } = geo()
    const s = cellXY(i)
    if (it.chain >= GEN && it.chain < STAR) {
      if (w.energy < 1) {
        note(s.x + cs / 2, s.y, 'Out of energy — wait a moment')
        sfx.miss()
        return
      }
      const kind = it.chain - GEN
      const n = w.event?.kind === 'rain' ? 2 : 1
      let made = 0
      for (let k = 0; k < n; k++) {
        const tier = Math.random() < 0.15 ? 1 : 0
        if (spawnFrom(i, kind, tier) >= 0) made += 1
      }
      if (!made) {
        note(s.x + cs / 2, s.y, 'Board full — merge or deliver!')
        sfx.miss()
        return
      }
      w.energy -= 1
      it.pop = 0.7
      fx.burst(s.x + cs / 2, s.y + cs / 2, { count: 6, color: ['#fde68a', '#86efac'], speed: 90, gravity: 200 })
      sfx.tap()
      haptic.light()
    } else if (it.chain === GIFT) {
      w.cells[i] = null
      fx.burst(s.x + cs / 2, s.y + cs / 2, { count: 24, color: ['#60a5fa', '#facc15', '#ffffff'], speed: 200, shape: 'square', gravity: 300 })
      sfx.power()
      haptic.success()
      for (let k = 0; k < 3; k++) spawnFrom(i, Math.floor(Math.random() * w.chains), Math.random() < 0.4 ? 1 : Math.random() < 0.3 ? 2 : 0)
    } else {
      w.selected = i
      it.pop = 0.4
      sfx.tap()
    }
  }

  // ── Input ───────────────────────────────────────────

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const el = e.currentTarget
    const { x, y } = localPoint(e, el)
    const w = world.current
    const i = cellAt(x, y)
    if (i < 0 || !w.cells[i] || w.cells[i]!.pending || w.cells[i]!.fly) return
    el.setPointerCapture(e.pointerId)
    drag.current = { pid: e.pointerId, idx: i, x, y, sx: x, sy: y, moved: false }
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
    const src = w.cells[d.idx]
    if (!src || src.pending) return
    if (!d.moved) return tapCell(d.idx)
    const { cs } = geo()
    // deliver to an order
    for (let oi = 0; oi < 3; oi++) {
      if (inRect(d.x, d.y, orderRect(oi))) {
        if (!tryDeliver(d.idx, oi)) {
          note(d.x, d.y + 20, isItem(src) ? 'Not on this order' : 'Customers want goods')
          sfx.miss()
        }
        return
      }
    }
    if (inRect(d.x, d.y, bar().trash)) {
      if (src.chain >= GEN && src.chain < STAR) {
        note(d.x, d.y - 20, "Can't sell a generator")
        sfx.miss()
        return
      }
      w.cells[d.idx] = null
      if (w.selected === d.idx) w.selected = -1
      const t = bar().trash
      fx.burst(t.x + t.w / 2, t.y + t.h / 2, { count: 10, color: ['#a8a29e', '#78716c'], speed: 120, shape: 'square', gravity: 300 })
      sfx.thud()
      return
    }
    const dst = cellAt(d.x, d.y)
    if (dst < 0 || dst === d.idx) return
    const tgt = w.cells[dst]
    if (!tgt) {
      w.cells[dst] = src
      w.cells[d.idx] = null
      src.pop = 0.5
      if (w.selected === d.idx) w.selected = dst
      sfx.move()
      return
    }
    if (tgt.pending || tgt.fly) return
    const srcItem = isItem(src)
    const tgtItem = isItem(tgt)
    const starOn = src.chain === STAR && tgtItem && tgt.tier < maxTier(tgt.chain)
    const onStar = tgt.chain === STAR && srcItem && src.tier < maxTier(src.chain)
    if ((srcItem && tgtItem && src.chain === tgt.chain && src.tier === tgt.tier && src.tier < maxTier(src.chain)) || starOn || onStar) {
      const base = starOn ? tgt : src
      w.cells[d.idx] = null
      tgt.pending = true
      w.anims.push({ chain: base.chain, tier: base.tier, x0: d.x, y0: d.y - cs * 0.2, dst, t: 0, star: starOn || onStar })
      sfx.whoosh()
      return
    }
    if (srcItem && tgtItem && src.chain === tgt.chain && src.tier === tgt.tier) {
      note(d.x, d.y - 20, 'Already the best!')
    }
    w.cells[dst] = src
    w.cells[d.idx] = tgt
    src.pop = 0.5
    tgt.pop = 0.5
    sfx.flip()
  }

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__farmmerge = world
  }, [world])

  // ── Frame ───────────────────────────────────────────

  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    w.clock += dt
    for (const a of w.anims) a.t += raw
    const done = w.anims.filter((a) => a.t >= 0.12)
    w.anims = w.anims.filter((a) => a.t < 0.12)
    for (const a of done) finishMerge(a)
    for (const it of w.cells) {
      if (!it) continue
      it.pop = Math.max(0, it.pop - raw * 3)
      if (it.fly) {
        it.fly.t += raw / 0.28
        if (it.fly.t >= 1) {
          it.fly = null
          it.pop = 0.7
        }
      }
    }
    for (let oi = 0; oi < 3; oi++) {
      const o = w.orders[oi]
      if (o) {
        o.enter = Math.min(1, o.enter + raw * 3)
        o.happy = Math.max(0, o.happy - raw * 1.5)
        if (o.leave >= 0) {
          o.leave += raw
          if (o.leave > 1.1) {
            w.orders[oi] = null
            w.orderIn[oi] = 0.8
          }
        }
      } else if (ph === 'play' || (ph === 'idle' && w.demo)) {
        w.orderIn[oi] -= raw
        if (w.orderIn[oi] <= 0) {
          w.orders[oi] = makeOrder()
          if (ph === 'play') sfx.ready()
        }
      }
    }
    if (ph === 'idle' && w.demo) {
      w.demoT -= raw
      if (w.demoT <= 0) {
        w.demoT = 1.1
        const gens = w.cells.map((it, i) => (it && it.chain >= GEN && it.chain < STAR ? i : -1)).filter((i) => i >= 0)
        if (gens.length) {
          const g = gens[Math.floor(Math.random() * gens.length)]
          if (spawnFrom(g, w.cells[g]!.chain - GEN, 0) < 0) w.cells = w.cells.map((it) => (it && !isItem(it) ? it : null))
        }
      }
      return
    }
    if (ph !== 'play') return

    // energy refill
    if (w.energy < w.maxEnergy) {
      w.regenT -= dt
      if (w.regenT <= 0) {
        w.regenT = w.regen
        w.energy += 1
      }
    } else w.regenT = w.regen
    // events from day 2
    if (w.event) {
      w.event.t += dt
      if (w.event.t >= w.event.dur) w.event = null
    } else if (w.day >= 2 && !w.eventDone && w.dayT < 60) {
      w.eventDone = true
      if (Math.random() < 0.7) {
        const kind = Math.random() < 0.5 ? 'rain' : 'market'
        w.event = { kind, t: 0, dur: kind === 'rain' ? 12 : 15 }
        showBanner(kind === 'rain' ? 'SPRING RAIN!' : 'MARKET RUSH!', kind === 'rain' ? 'generators drop double' : 'orders pay x2')
        sfx.power()
      }
    }
    // day clock
    w.dayT -= dt
    const sec = Math.ceil(w.dayT)
    if (w.dayT <= 10 && !w.met && sec !== Math.ceil(w.dayT + dt)) sfx.tick()
    if (w.dayT <= 0) {
      w.dayT = 0
      if (w.met) nextDay()
      else die()
      return
    }
    if (w.combo > 0 && w.clock - w.lastMerge > 1.8) w.combo = 0
    if (Math.floor(w.clock * 4) !== Math.floor((w.clock - dt) * 4)) pushHud()
  }

  function drawItemAt(ctx: CanvasRenderingContext2D, it: { chain: number; tier: number }, x: number, y: number, size: number) {
    ctx.drawImage(itemSprite(it.chain, it.tier, size), x - size / 2, y - size / 2, size, size)
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const ph = phaseRef.current
    const dt = fx.step(raw)
    const { cs, bx, by, barH } = geo()

    if (ph === 'idle' && w.demo && !w.cells.some(Boolean)) {
      w.chains = 4
      ;[0, 1, 2, 3].forEach((k, i) => (w.cells[[7, 10, 25, 28][i]] = newItem(GEN + k, 0)))
      ;[[0, 3], [1, 2], [2, 4], [3, 3], [0, 6], [0, 7]].forEach(([c, tier], i) => (w.cells[[14, 15, 20, 21, 32, 33][i]] = newItem(c, tier)))
    }
    update(dt, raw)

    // sky with the sun travelling across the day
    const dayK = ph === 'idle' ? 0.35 : 1 - w.dayT / DAY_SECS
    const dusk = clamp((dayK - 0.7) / 0.3, 0, 1)
    const sky = ctx.createLinearGradient(0, 0, 0, by)
    sky.addColorStop(0, dusk > 0 ? `rgb(${Math.round(125 + dusk * 124)},${Math.round(211 - dusk * 80)},${Math.round(252 - dusk * 120)})` : '#7dd3fc')
    sky.addColorStop(1, '#e0f2fe')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, by)
    const sunX = W * (0.08 + dayK * 0.84)
    const sunY = 30 + Math.sin(dayK * Math.PI) * -12 + 16
    glow(ctx, sunX, sunY, 46, '#fde047', 0.5)
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(sunX, sunY, 13, 0, Math.PI * 2)
    ctx.fill()
    // hills + barn
    ctx.fillStyle = '#86efac'
    ctx.beginPath()
    ctx.moveTo(0, by)
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, by - 26 - Math.sin(x * 0.018 + 1) * 12)
    ctx.lineTo(W, by)
    ctx.fill()
    // ground under the board
    const gr = ctx.createLinearGradient(0, by - 8, 0, H)
    gr.addColorStop(0, '#65a30d')
    gr.addColorStop(1, '#3f6212')
    ctx.fillStyle = gr
    ctx.fillRect(0, by - 8, W, H - by + 8)

    fx.applyShake(ctx)
    // board: tilled soil plots
    ctx.fillStyle = '#7c4a21'
    ctx.beginPath()
    ctx.roundRect(bx - 5, by - 5, cs * COLS + 10, cs * ROWS + 10, 12)
    ctx.fill()
    for (let i = 0; i < CELLS; i++) {
      const s = cellXY(i)
      const odd = (i % COLS + Math.floor(i / COLS)) % 2
      ctx.fillStyle = odd ? '#a3e635' : '#84cc16'
      ctx.beginPath()
      ctx.roundRect(s.x + 2, s.y + 2, cs - 4, cs - 4, 8)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(s.x + 6, s.y + 5, cs - 12, 3)
    }
    // fence posts
    ctx.fillStyle = '#fef3c7'
    for (let x = bx - 5; x <= bx + cs * COLS + 5; x += cs) {
      ctx.beginPath()
      ctx.roundRect(x - 3, by - 12, 6, 12, 2)
      ctx.fill()
    }

    const d = drag.current
    const dragged = d && d.moved ? w.cells[d.idx] : null
    // which board items are wanted by customers
    const wanted = new Set<string>()
    for (const o of w.orders) if (o && o.leave < 0) for (const r of o.req) if (!r.done) wanted.add(`${r.c}|${r.t}`)
    for (let i = 0; i < CELLS; i++) {
      const it = w.cells[i]
      if (!it || (d && d.moved && d.idx === i)) continue
      const s = cellXY(i)
      let x = s.x + cs / 2
      let y = s.y + cs / 2
      if (it.fly) {
        const q = it.fly.t
        x = it.fly.x + (x - it.fly.x) * q
        y = it.fly.y + (y - it.fly.y) * q - Math.sin(q * Math.PI) * cs * 0.8
      }
      if (dragged && isItem(dragged) && isItem(it) && it.chain === dragged.chain && it.tier === dragged.tier && it.tier < maxTier(it.chain)) glow(ctx, x, y, cs * 0.7, '#fde047', 0.4 + Math.sin(t * 8) * 0.15)
      if (i === w.selected && !it.fly) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(s.x + 3, s.y + 3, cs - 6, cs - 6, 8)
        ctx.stroke()
      }
      if (it.chain >= GEN && it.chain < STAR) {
        ctx.fillStyle = 'rgba(253,224,71,0.35)'
        ctx.beginPath()
        ctx.roundRect(s.x + 3, s.y + 3, cs - 6, cs - 6, 8)
        ctx.fill()
      }
      if (it.chain === STAR || it.chain === GIFT) glow(ctx, x, y, cs * 0.6, it.chain === STAR ? '#f0abfc' : '#93c5fd', 0.4 + Math.sin(t * 6) * 0.15)
      const pop = it.pop
      const bounce = it.chain >= GEN && it.chain < STAR ? Math.sin(t * 3 + i) * 0.03 : 0
      const sz = cs * (0.86 + bounce + pop * 0.28 - (pop > 0.75 ? (pop - 0.75) * 0.8 : 0))
      drawItemAt(ctx, it, x, y, sz)
      if (isItem(it) && wanted.has(`${it.chain}|${it.tier}`) && !it.fly) {
        ctx.fillStyle = '#16a34a'
        ctx.beginPath()
        ctx.arc(s.x + cs - 10, s.y + 10, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(s.x + cs - 13, s.y + 10)
        ctx.lineTo(s.x + cs - 10.5, s.y + 12.5)
        ctx.lineTo(s.x + cs - 6.5, s.y + 7.5)
        ctx.stroke()
      }
    }
    if (d && d.moved) {
      const dst = cellAt(d.x, d.y)
      if (dst >= 0 && dst !== d.idx) {
        const s = cellXY(dst)
        ctx.strokeStyle = '#fef08a'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(s.x + 3, s.y + 3, cs - 6, cs - 6, 8)
        ctx.stroke()
      }
    }
    for (const a of w.anims) {
      const s = cellXY(a.dst)
      const q = Math.min(1, a.t / 0.12)
      drawItemAt(ctx, a.star ? { chain: STAR, tier: 0 } : a, a.x0 + (s.x + cs / 2 - a.x0) * q, a.y0 + (s.y + cs / 2 - a.y0) * q, cs * (1 - q * 0.2))
    }

    // orders
    for (let oi = 0; oi < 3; oi++) {
      const o = w.orders[oi]
      const rc = orderRect(oi)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.roundRect(rc.x, rc.y, rc.w, rc.h, 12)
      ctx.fill()
      if (!o) continue
      const slide = (1 - o.enter) * -rc.h * 1.4 + (o.leave >= 0 ? -o.leave * o.leave * rc.h * 1.6 : 0)
      const hover = dragged && isItem(dragged) && inRect(d!.x, d!.y, rc)
      const can = dragged && isItem(dragged) && o.req.some((r) => !r.done && r.c === dragged.chain && r.t === dragged.tier)
      ctx.save()
      ctx.translate(0, slide)
      ctx.fillStyle = o.leave >= 0 ? '#dcfce7' : '#fffbeb'
      ctx.strokeStyle = can ? '#16a34a' : '#b45309'
      ctx.lineWidth = can || hover ? 3 : 2
      ctx.beginPath()
      ctx.roundRect(rc.x, rc.y, rc.w, rc.h, 12)
      ctx.fill()
      ctx.stroke()
      drawAnimal(ctx, o.animal, rc.x + 20, rc.y + 22, 15, o.happy + (o.leave >= 0 ? 1 : 0), t)
      const n = o.req.length
      const isz = Math.min(rc.w / (n + 0.4), rc.h * 0.56)
      for (let k = 0; k < n; k++) {
        const r = o.req[k]
        const ix = rc.x + rc.w / 2 + (k - (n - 1) / 2) * isz * 0.95 + (n === 1 ? 8 : 4)
        const iy = rc.y + rc.h * 0.56
        ctx.globalAlpha = r.done ? 0.35 : 1
        drawItemAt(ctx, { chain: r.c, tier: r.t }, ix, iy, isz)
        ctx.globalAlpha = 1
        if (r.done) {
          ctx.strokeStyle = '#16a34a'
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.moveTo(ix - 8, iy)
          ctx.lineTo(ix - 2, iy + 6)
          ctx.lineTo(ix + 9, iy - 7)
          ctx.stroke()
        }
      }
      ctx.fillStyle = '#92400e'
      ctx.font = `900 11px ${FONT}`
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(`+${o.reward * (w.event?.kind === 'market' ? 2 : 1)}`, rc.x + rc.w - 7, rc.y + 13)
      ctx.restore()
    }
    // rain
    if (w.event?.kind === 'rain') {
      ctx.strokeStyle = 'rgba(191,219,254,0.6)'
      ctx.lineWidth = 1.3
      ctx.beginPath()
      for (let i = 0; i < 40; i++) {
        const rx = (i * 61 + t * 90) % W
        const ry = (i * 89 + t * 480) % H
        ctx.moveTo(rx, ry)
        ctx.lineTo(rx - 3, ry + 10)
      }
      ctx.stroke()
    }
    // dragged item on top
    if (d && d.moved) {
      const it = w.cells[d.idx]
      if (it) drawItemAt(ctx, it, d.x, d.y - cs * 0.25 + Math.sin(t * 12) * 1.5, cs * 1.08)
    }
    fx.draw(ctx)
    ctx.restore()

    // bottom bar
    if (ph !== 'idle') {
      const b = bar()
      ctx.fillStyle = 'rgba(20,83,45,0.85)'
      ctx.fillRect(0, H - barH, W, barH)
      // energy
      const e = b.energy
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.roundRect(e.x, e.y, e.w, e.h, 12)
      ctx.fill()
      drawBolt(ctx, e.x + 18, e.y + e.h / 2, 13)
      const ek = clamp(w.energy / w.maxEnergy, 0, 1)
      const ex = e.x + 34
      const ew = e.w - 42
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.roundRect(ex, e.y + e.h * 0.56, ew, 8, 4)
      ctx.fill()
      ctx.fillStyle = w.energy < 3 ? '#f87171' : '#fde047'
      ctx.beginPath()
      ctx.roundRect(ex, e.y + e.h * 0.56, Math.max(8, ew * ek), 8, 4)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = `900 13px ${FONT}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${Math.floor(w.energy)}/${w.maxEnergy}`, ex, e.y + e.h * 0.3)
      if (w.energy < w.maxEnergy) {
        ctx.font = `700 9px ${FONT}`
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.textAlign = 'right'
        ctx.fillText(`+1 in ${Math.ceil(w.regenT)}s`, e.x + e.w - 6, e.y + e.h * 0.3)
      }
      // info: chain of the selected item
      const inf = b.info
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.roundRect(inf.x, inf.y, inf.w, inf.h, 12)
      ctx.fill()
      const sel = w.selected >= 0 ? w.cells[w.selected] : null
      ctx.textAlign = 'center'
      if (sel && isItem(sel)) {
        const items = CHAINS[sel.chain].items
        const n = items.length
        const step = (inf.w - 8) / n
        const isz = Math.min(step * 1.05, inf.h * 0.62)
        for (let k = 0; k < n; k++) {
          const ix = inf.x + 4 + step * (k + 0.5)
          const iy = inf.y + inf.h * 0.4
          const known = w.seen.has(`${sel.chain}|${k}`)
          if (k === sel.tier) {
            ctx.fillStyle = 'rgba(255,255,255,0.35)'
            ctx.beginPath()
            ctx.arc(ix, iy, isz * 0.55, 0, Math.PI * 2)
            ctx.fill()
          }
          ctx.globalAlpha = known ? 1 : 0.3
          drawItemAt(ctx, { chain: sel.chain, tier: k }, ix, iy, isz)
          ctx.globalAlpha = 1
        }
        ctx.fillStyle = '#ffffff'
        ctx.font = `800 9px ${FONT}`
        ctx.fillText(sel.tier < n - 1 ? `${items[sel.tier]} → next: ${items[sel.tier + 1]}` : `${items[sel.tier]} · top of the chain`, inf.x + inf.w / 2, inf.y + inf.h - 7)
      } else {
        ctx.fillStyle = '#ffffff'
        ctx.font = `800 11px ${FONT}`
        const gen = sel && sel.chain >= GEN && sel.chain < STAR ? GEN_NAMES[sel.chain - GEN] : null
        ctx.fillText(gen ? `${gen}: tap to grow (1 energy)` : sel?.chain === STAR ? 'Wild star: drop on any item to upgrade' : 'Tap generators · merge · deliver', inf.x + inf.w / 2, inf.y + inf.h / 2)
      }
      // trash
      const tr = b.trash
      const overTrash = !!(d && d.moved && inRect(d.x, d.y, tr))
      ctx.fillStyle = overTrash ? 'rgba(239,68,68,0.6)' : 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.roundRect(tr.x, tr.y, tr.w, tr.h, 12)
      ctx.fill()
      const tx = tr.x + tr.w / 2
      const ty = tr.y + tr.h / 2
      ctx.fillStyle = '#d6d3d1'
      ctx.strokeStyle = '#44403c'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(tx - 11, ty - 8)
      ctx.lineTo(tx + 11, ty - 8)
      ctx.lineTo(tx + 8, ty + 14)
      ctx.lineTo(tx - 8, ty + 14)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.roundRect(tx - 14, ty - 14 - (overTrash ? 4 : 0), 28, 5, 2)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = '#78716c'
      ctx.beginPath()
      for (const ox of [-4, 0, 4]) {
        ctx.moveTo(tx + ox, ty - 3)
        ctx.lineTo(tx + ox, ty + 10)
      }
      ctx.stroke()
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const won = hud.days >= 2
  const mm = Math.floor(hud.time / 60)
  const ss = String(hud.time % 60).padStart(2, '0')
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena farmmerge-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud farmmerge-hud">
              <div>
                <div className={`action-hud__score${hud.time <= 10 && hud.filled < hud.goal ? ' farmmerge-low' : ''}`}>
                  {mm}:{ss}
                </div>
                <div className="action-hud__small">Day {hud.day}</div>
              </div>
              <div className="action-hud__right">
                <span className={`farmmerge-goal${hud.filled >= hud.goal ? ' is-met' : ''}`}>
                  Orders {hud.filled}/{hud.goal}
                </span>
                <span className="action-hud__small">
                  {hud.score} pts{hud.combo > 1 ? ` · x${hud.combo}` : ''}
                </span>
              </div>
            </div>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner farmmerge-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="farmmerge"
              icon={meta.icon}
              title={meta.title}
              hint="Tap generators to grow items, merge matching ones and drag goods to the animals' orders. Fill the day's goal before sunset!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Farm hero!' : 'Sunset'}
            subtitle={`${hud.score} pts · ${hud.days} day${hud.days === 1 ? '' : 's'} completed`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
