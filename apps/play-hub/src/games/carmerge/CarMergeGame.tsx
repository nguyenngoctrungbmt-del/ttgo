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
import { CAR_NAMES, MAX_TIER, TIER_COLORS, carSprite, drawFlame, trackPoint, trackSprite, type TrackGeo } from './art'
import '../../shared/action/action.css'
import './carmerge.css'

const meta = getGame('carmerge')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Car = { tier: number; pop: number; s: number; lapFlash: number; pending: boolean; id: number }
type MergeAnim = { tier: number; x0: number; y0: number; dst: number; t: number }
type Coin = { x: number; y: number; vx: number; vy: number; t: number }
type Golden = { s: number; lane: number; t: number }
type Weather = { kind: 'rain' | 'sponsor'; t: number; dur: number } | null

const PITS = 5
const GC = 5
const GR = 2
const SLOTS = PITS + GC * GR
const SEASON_SECS = 60
const LAP_SECS = 7

const lapValue = (t: number) => 4 * Math.pow(2.15, t)
const lapSpeed = (t: number) => 1 + 0.15 * t

function seasonTarget(s: number) {
  const k = s - 1
  return Math.round((250 * Math.pow(1.7, k) + 1200 * k) * (s % 5 === 0 ? 1.2 : 1))
}

type World = {
  demo: boolean
  slots: (Car | null)[]
  pits: number
  anims: MergeAnim[]
  coins: Coin[]
  golden: Golden | null
  goldenIn: number
  weather: Weather
  weatherDone: boolean
  season: number
  seasonT: number
  earned: number
  target: number
  hit: boolean
  cash: number
  total: number
  buys: number
  boost: number
  best: number
  seen: boolean[]
  combo: number
  lastMerge: number
  clock: number
  nextId: number
  lapSfx: number
  speedBonus: number
  stats: { score: number; seasons: number; laps: number; best: number; merges: number; golden: number }
}

function freshWorld(demo = false): World {
  return {
    demo,
    slots: Array.from({ length: SLOTS }, () => null),
    pits: 3,
    anims: [],
    coins: [],
    golden: null,
    goldenIn: 30,
    weather: null,
    weatherDone: false,
    season: 1,
    seasonT: SEASON_SECS,
    earned: 0,
    target: seasonTarget(1),
    hit: false,
    cash: 15,
    total: 0,
    buys: 0,
    boost: 0,
    best: 0,
    seen: Array.from({ length: MAX_TIER + 1 }, (_, i) => i === 0),
    combo: 0,
    lastMerge: -9,
    clock: 0,
    nextId: 1,
    lapSfx: 0,
    speedBonus: 1,
    stats: { score: 0, seasons: 0, laps: 0, best: 1, merges: 0, golden: 0 },
  }
}

function fmt(n: number) {
  if (n < 10000) return String(Math.floor(n))
  if (n < 1e6) return `${(n / 1000).toFixed(n < 1e5 ? 1 : 0)}K`
  if (n < 1e9) return `${(n / 1e6).toFixed(1)}M`
  return `${(n / 1e9).toFixed(1)}B`
}

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

export default function CarMergeGame() {
  const run = useActionRun('carmerge')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(true))
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ pid: number; idx: number; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null)
  const lastEvent = useRef(0)
  const lastNote = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ season: 1, time: SEASON_SECS, cash: 0, combo: 0, total: 0, seasons: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ season: w.season, time: Math.max(0, Math.ceil(w.seasonT)), cash: w.cash, combo: w.combo, total: w.total, seasons: w.stats.seasons })
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const barH = 62
    const cs = Math.floor(Math.min((W - 20) / GC, (H - barH - 300) / 3.6, 72))
    const gx = Math.round((W - cs * GC) / 2)
    const gridY = H - barH - cs * GR - 4
    const pitY = gridY - cs - 14
    const trackH = pitY - 14
    const band = clamp(trackH * 0.22, 48, 70)
    const R = Math.max(30, Math.min((trackH - 58 - band) / 2, W * 0.22))
    const T: TrackGeo = { cx: W / 2, cy: 52 + band / 2 + R, half: Math.max(8, W / 2 - 14 - R - band / 2), R, band }
    return { W, H, barH, cs, gx, gridY, pitY, trackH, T }
  }

  function slotXY(i: number) {
    const { cs, gx, gridY, pitY } = geo()
    if (i < PITS) return { x: gx + i * cs, y: pitY }
    const j = i - PITS
    return { x: gx + (j % GC) * cs, y: gridY + Math.floor(j / GC) * cs }
  }

  function slotAt(x: number, y: number) {
    const { cs } = geo()
    for (let i = 0; i < SLOTS; i++) {
      const s = slotXY(i)
      if (x >= s.x && x < s.x + cs && y >= s.y && y < s.y + cs) return i
    }
    return -1
  }

  function buttons() {
    const { W, H, barH, gx, cs } = geo()
    const y = H - barH + 6
    const h = barH - 12
    const total = cs * GC
    const buyW = Math.round(total * 0.42)
    const nitroW = Math.round(total * 0.26)
    return {
      buy: { x: gx, y, w: buyW, h },
      next: { x: gx + buyW + 6, y, w: total - buyW - nitroW - 12, h },
      nitro: { x: Math.min(W - 10, gx + total) - nitroW, y, w: nitroW, h },
    }
  }

  function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
  }

  function laneOf(i: number) {
    const { T } = geo()
    return (i - 2) * (T.band / 5.4)
  }

  // ── Economy ─────────────────────────────────────────

  function shopTier() {
    return Math.max(0, world.current.best - 4)
  }

  function buyCost() {
    return Math.round(15 * Math.pow(1.07, world.current.buys) * Math.pow(2, shopTier()))
  }

  function sellValue(tier: number) {
    return Math.max(1, Math.round(0.4 * 15 * Math.pow(2, tier) * Math.pow(1.07, world.current.buys * 0.5)))
  }

  function incomeRate() {
    const w = world.current
    let r = 0
    for (let i = 0; i < w.pits; i++) {
      const c = w.slots[i]
      if (c) r += (lapValue(c.tier) * lapSpeed(c.tier) * w.speedBonus) / LAP_SECS
    }
    return r
  }

  function newCar(tier: number): Car {
    return { tier, pop: 1, s: 0, lapFlash: 0, pending: false, id: world.current.nextId++ }
  }

  function emptyGarage() {
    const w = world.current
    const out: number[] = []
    for (let i = PITS; i < SLOTS; i++) if (!w.slots[i]) out.push(i)
    return out
  }

  function placeCar(tier: number) {
    const w = world.current
    let idx = -1
    for (let i = 0; i < w.pits && idx < 0; i++) if (!w.slots[i]) idx = i
    if (idx < 0) {
      const e = emptyGarage()
      if (e.length) idx = e[0]
    }
    if (idx < 0) return -1
    w.slots[idx] = newCar(tier)
    return idx
  }

  function note(x: number, y: number, text: string) {
    if (performance.now() - lastNote.current < 900) return
    lastNote.current = performance.now()
    fx.text(x, y, text, '#fecaca', 13)
  }

  function buy() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    const cost = buyCost()
    const b = buttons().buy
    if (w.cash < cost) {
      note(b.x + b.w / 2, b.y - 8, 'Not enough cash')
      sfx.miss()
      return
    }
    const idx = placeCar(shopTier())
    if (idx < 0) {
      note(b.x + b.w / 2, b.y - 8, 'Garage full — merge!')
      sfx.miss()
      return
    }
    w.cash -= cost
    w.buys += 1
    const { cs } = geo()
    const s = slotXY(idx)
    fx.burst(s.x + cs / 2, s.y + cs / 2, { count: 10, color: ['#fde047', '#ffffff', '#86efac'], speed: 140, shape: 'spark', gravity: 100 })
    fx.ring(s.x + cs / 2, s.y + cs / 2, { color: '#86efac', maxR: cs * 0.6, life: 0.3 })
    sfx.pop()
    haptic.light()
    pushHud()
  }

  function sell(idx: number) {
    const w = world.current
    const c = w.slots[idx]
    if (!c || w.slots.filter(Boolean).length <= 1) {
      sfx.miss()
      return
    }
    const v = sellValue(c.tier)
    w.slots[idx] = null
    w.cash += v
    const b = buttons().buy
    fx.text(b.x + b.w / 2, b.y - 10, `SOLD +$${fmt(v)}`, '#86efac', 15)
    fx.burst(b.x + b.w / 2, b.y + b.h / 2, { count: 10, color: ['#22c55e', '#86efac', '#fde047'], speed: 160, shape: 'square', gravity: 300 })
    sfx.score(2)
    haptic.medium()
    pushHud()
  }

  function nitro(x?: number, y?: number) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    w.boost = Math.min(1, w.boost + 0.14)
    if (x != null && y != null) {
      fx.ring(x, y, { color: '#38bdf8', maxR: 26, life: 0.25, width: 3 })
      fx.burst(x, y, { count: 4, color: ['#7dd3fc', '#ffffff'], speed: 120, shape: 'spark', gravity: 0 })
    }
    if (w.boost > 0.95 && Math.random() < 0.15) {
      const { T } = geo()
      fx.text(T.cx, T.cy, 'MAX NITRO!', '#7dd3fc', 16)
    }
    sfx.tap()
    haptic.light()
  }

  // ── Run lifecycle ───────────────────────────────────

  function start() {
    void unlockAudio()
    const w = freshWorld(false)
    world.current = w
    fx.reset()
    lastEvent.current = 0
    w.speedBonus = 1 + run.level('tuning') * 0.08
    w.slots[0] = newCar(0)
    w.slots[1] = newCar(0)
    w.slots[1]!.s = 0.5
    w.slots[PITS + 2] = newCar(0)
    const extra = run.level('pitcrew')
    for (let i = 0; i < extra; i++) w.slots[PITS + 6 + i] = newCar(1)
    if (extra > 0) {
      w.best = 1
      w.seen[1] = true
      w.stats.best = 2
    }
    run.begin()
    setPhaseBoth('play')
    showBanner('SEASON 1', `earn $${fmt(w.target)} in 60s`)
    sfx.ready()
    pushHud()
  }

  function nextSeason() {
    const w = world.current
    w.stats.seasons += 1
    const overflow = Math.max(0, w.earned - w.target)
    const bonus = Math.round(w.target * 0.1)
    w.cash += bonus
    w.season += 1
    w.seasonT = SEASON_SECS
    w.earned = 0
    w.target = seasonTarget(w.season)
    w.hit = false
    w.weather = null
    w.weatherDone = false
    w.total += Math.round(overflow * 0.5)
    w.stats.score = Math.round(w.total)
    let sub = `target $${fmt(w.target)} · bonus +$${fmt(bonus)}`
    if ((w.season === 3 || w.season === 5) && w.pits < PITS) {
      w.pits += 1
      sub = 'new pit lane unlocked!'
      const { cs } = geo()
      const s = slotXY(w.pits - 1)
      fx.ring(s.x + cs / 2, s.y + cs / 2, { color: '#fde047', maxR: cs, life: 0.6, width: 4 })
    }
    showBanner(w.season % 5 === 0 ? `GRAND PRIX · SEASON ${w.season}` : `SEASON ${w.season}`, w.season % 5 === 0 ? 'laps pay x1.5' : sub)
    sfx.levelUp()
    haptic.success()
    fx.flash('#fef9c3', 0.15)
    if (w.season % 5 === 0 && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'carmerge', kind: 'season', value: w.season })
    }
    run.update(w.stats)
    pushHud()
  }

  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(8, 0.4)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    const { T } = geo()
    fx.text(T.cx, T.cy, 'SEASON FAILED', '#fecaca', 24)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.stats.seasons * 3 + w.best * 1.5 + w.stats.golden + 2) * (1 + run.level('sponsor') * 0.15))
      run.end({ score: Math.round(w.total), cleared: w.stats.seasons >= 3, stats: { ...w.stats, score: Math.round(w.total) }, coins }, revive)
    }, 1100)
  }

  /** Revive: the season clock gets 30 more seconds plus a full nitro tank. */
  function revive() {
    const w = world.current
    w.seasonT = 30
    w.boost = 1
    showBanner('REVIVED!', '+30 seconds on the clock')
    pushHud()
    setPhaseBoth('play')
  }

  // ── Merging ─────────────────────────────────────────

  function revealTier(tier: number) {
    const w = world.current
    w.seen[tier] = true
    if (tier >= 2) {
      showBanner(`NEW: ${CAR_NAMES[tier].toUpperCase()}!`, tier === MAX_TIER ? 'fastest thing on wheels' : `next: ${CAR_NAMES[Math.min(MAX_TIER, tier + 1)]}`)
      sfx.levelUp()
      fx.flash('#fef9c3', 0.15)
    }
  }

  function finishMerge(a: MergeAnim) {
    const w = world.current
    const c = w.slots[a.dst]
    if (!c) return
    c.pending = false
    c.tier = Math.min(MAX_TIER, a.tier + 1)
    c.pop = 1
    const { cs } = geo()
    const s = slotXY(a.dst)
    const cx = s.x + cs / 2
    const cy = s.y + cs / 2
    w.combo = w.clock - w.lastMerge < 1.8 ? w.combo + 1 : 1
    w.lastMerge = w.clock
    w.stats.merges += 1
    const col = TIER_COLORS[c.tier]
    fx.burst(cx, cy, { count: 14 + c.tier * 3, color: [col, '#ffffff', '#fde047'], speed: 170 + c.tier * 18, shape: 'spark', gravity: 80 })
    fx.burst(cx, cy, { count: 8, color: ['#e5e7eb', '#9ca3af'], speed: 70, size: 5, life: 0.6, gravity: -30, drag: 3 })
    fx.ring(cx, cy, { color: col, maxR: cs * (0.75 + c.tier * 0.05), life: 0.38, width: 4 })
    fx.ring(cx, cy, { color: '#ffffff', maxR: cs * 0.45, life: 0.22, width: 2 })
    fx.stop(0.035 + Math.min(0.06, c.tier * 0.006))
    fx.shake(2 + c.tier * 0.5, 0.15)
    fx.text(cx, cy - cs * 0.55, w.combo > 1 ? `${CAR_NAMES[c.tier]} x${w.combo}` : CAR_NAMES[c.tier], w.combo > 2 ? '#fde047' : '#ffffff', 13 + Math.min(6, c.tier))
    sfx.pop()
    sfx.score(Math.min(12, w.combo + Math.floor(c.tier / 2)))
    if (w.combo >= 3) {
      sfx.combo()
      if (w.combo === 3 || w.combo % 5 === 0) showBanner(`COMBO x${w.combo}!`, 'pit crew on fire')
    }
    haptic.medium()
    if (c.tier > w.best) {
      w.best = c.tier
      w.stats.best = c.tier + 1
    }
    if (!w.seen[c.tier]) revealTier(c.tier)
    run.update(w.stats)
    pushHud()
  }

  // ── Input ───────────────────────────────────────────

  function goldenPos() {
    const g = world.current.golden
    if (!g) return null
    return trackPoint(geo().T, g.s, g.lane)
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const el = e.currentTarget
    const { x, y } = localPoint(e, el)
    const w = world.current
    const bt = buttons()
    if (inRect(x, y, bt.buy)) return buy()
    if (inRect(x, y, bt.nitro)) return nitro()
    const i = slotAt(x, y)
    if (i >= 0) {
      const c = w.slots[i]
      if (!c || c.pending) return
      el.setPointerCapture(e.pointerId)
      drag.current = { pid: e.pointerId, idx: i, x, y, sx: x, sy: y, moved: false }
      sfx.tap()
      return
    }
    const gp = goldenPos()
    if (gp && Math.hypot(gp.x - x, gp.y - y) < 40) {
      catchGolden(gp.x, gp.y)
      return
    }
    if (y < geo().pitY - 4) nitro(x, y)
  }

  function catchGolden(x: number, y: number) {
    const w = world.current
    w.golden = null
    w.stats.golden += 1
    const { cs } = geo()
    fx.burst(x, y, { count: 26, color: ['#fde047', '#facc15', '#ffffff'], speed: 240, shape: 'spark', gravity: 100 })
    fx.ring(x, y, { color: '#fde047', maxR: 60, life: 0.45, width: 4 })
    fx.stop(0.05)
    sfx.power()
    haptic.success()
    const r = Math.random()
    if (r < 0.4 && emptyGarage().length) {
      const tier = Math.max(0, w.best - 3)
      const idx = placeCar(tier)
      const s = slotXY(idx)
      fx.ring(s.x + cs / 2, s.y + cs / 2, { color: '#fde047', maxR: cs * 0.8, life: 0.5, width: 4 })
      showBanner('GOLDEN CAR!', `free ${CAR_NAMES[tier]}`)
      if (!w.seen[tier]) revealTier(tier)
    } else if (r < 0.7) {
      const v = Math.max(40, Math.round(incomeRate() * 20))
      w.cash += v
      w.earned += v
      w.total += v
      showBanner('GOLDEN CAR!', `jackpot +$${fmt(v)}`)
      for (let i = 0; i < 12; i++) w.coins.push({ x, y, vx: rand(-160, 160), vy: rand(-260, -120), t: 0 })
    } else {
      w.boost = 1
      w.weather = { kind: 'sponsor', t: 0, dur: 10 }
      showBanner('GOLDEN CAR!', 'sponsor rush: laps pay x2')
    }
    run.update(w.stats)
    pushHud()
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
    const src = w.slots[d.idx]
    if (!src || src.pending) return
    const { cs, pitY } = geo()
    if (!d.moved) {
      const s = slotXY(d.idx)
      fx.text(s.x + cs / 2, s.y - 4, `${CAR_NAMES[src.tier]} · $${fmt(lapValue(src.tier))}/lap`, '#ffffff', 12)
      return
    }
    if (inRect(d.x, d.y, buttons().buy)) return sell(d.idx)
    let dst = slotAt(d.x, d.y)
    // dropping a garage car on the track sends it to the first free pit lane
    if (dst < 0 && d.y < pitY - 4 && d.idx >= PITS) {
      for (let i = 0; i < w.pits && dst < 0; i++) if (!w.slots[i]) dst = i
      if (dst < 0) {
        note(d.x, d.y, 'Pit lanes full — swap or merge')
        sfx.miss()
        return
      }
    }
    if (dst < 0 || dst === d.idx) return
    if (dst < PITS && dst >= w.pits) {
      const s = slotXY(dst)
      fx.text(s.x + cs / 2, s.y, dst === 3 ? 'Unlocks in season 3' : 'Unlocks in season 5', '#fecaca', 12)
      sfx.miss()
      return
    }
    const tgt = w.slots[dst]
    if (!tgt) {
      w.slots[dst] = src
      w.slots[d.idx] = null
      src.pop = 0.6
      if (dst < PITS) {
        src.s = 0
        sfx.whoosh()
      } else sfx.move()
      return
    }
    if (tgt.pending) return
    if (tgt.tier === src.tier && src.tier < MAX_TIER) {
      w.slots[d.idx] = null
      tgt.pending = true
      w.anims.push({ tier: src.tier, x0: d.x, y0: d.y - cs * 0.2, dst, t: 0 })
      sfx.whoosh()
      return
    }
    w.slots[dst] = src
    w.slots[d.idx] = tgt
    src.pop = 0.6
    tgt.pop = 0.6
    if (dst < PITS) src.s = 0
    if (d.idx < PITS) tgt.s = 0
    sfx.flip()
  }

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__carmerge = world
  }, [world])

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'b' || e.key === 'B') buy()
      else if (e.key === ' ' || e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        nitro()
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation ──────────────────────────────────────

  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    const { T, W } = geo()
    const live = ph === 'play' || (ph === 'idle' && w.demo)
    w.clock += dt

    for (const a of w.anims) a.t += raw
    const done = w.anims.filter((a) => a.t >= 0.12)
    w.anims = w.anims.filter((a) => a.t < 0.12)
    for (const a of done) finishMerge(a)
    for (const c of w.slots) {
      if (!c) continue
      c.pop = Math.max(0, c.pop - raw * 3.2)
      c.lapFlash = Math.max(0, c.lapFlash - raw * 2)
    }
    if (!live) return

    if (w.demo) w.boost = 0.3 + Math.sin(w.clock * 0.7) * 0.3
    else w.boost = Math.max(0, w.boost - dt * 0.4)
    const boostMul = 1 + w.boost * 0.9
    const wx = w.weather
    if (wx) {
      wx.t += dt
      if (wx.t >= wx.dur) {
        w.weather = null
        if (!w.demo) fx.text(T.cx, T.cy, wx.kind === 'rain' ? 'Track is dry' : 'Rush over', '#e5e7eb', 14)
      }
    }
    const rainMul = w.weather?.kind === 'rain' ? 0.75 + w.boost * 0.25 : 1
    const payMul = (w.weather?.kind === 'sponsor' ? 2 : 1) * (w.season % 5 === 0 ? 1.5 : 1)

    // racing
    for (let i = 0; i < w.pits; i++) {
      const c = w.slots[i]
      if (!c || c.pending) continue
      c.s += (lapSpeed(c.tier) * w.speedBonus * boostMul * rainMul * dt) / LAP_SECS
      if (c.s >= 1) {
        c.s -= 1
        c.lapFlash = 1
        if (w.demo) continue
        const v = lapValue(c.tier) * payMul
        w.cash += v
        w.earned += v
        w.total += v
        w.stats.laps += 1
        w.stats.score = Math.round(w.total)
        const p = trackPoint(T, c.s, laneOf(i))
        fx.text(p.x, p.y - 14, `+$${fmt(v)}`, payMul > 1 ? '#fde047' : '#86efac', 12 + Math.min(5, c.tier * 0.5))
        fx.burst(p.x, p.y, { count: 6, color: ['#fde047', '#86efac', '#ffffff'], speed: 110, shape: 'spark', gravity: 0 })
        if (w.coins.length < 40) w.coins.push({ x: p.x, y: p.y, vx: rand(-60, 60), vy: rand(-180, -100), t: 0 })
        if (w.clock - w.lapSfx > 0.12) {
          w.lapSfx = w.clock
          sfx.score(Math.min(8, c.tier))
        }
        if (!w.hit && w.earned >= w.target) {
          w.hit = true
          showBanner('TARGET HIT!', 'extra earnings boost your score')
          sfx.win()
          haptic.success()
          fx.flash('#bbf7d0', 0.15)
        }
        run.update(w.stats)
      }
    }

    if (w.demo) return
    // season clock
    w.seasonT -= dt
    const before = Math.ceil(w.seasonT + dt)
    if (w.seasonT <= 10 && !w.hit && Math.ceil(w.seasonT) !== before) sfx.tick()
    if (w.seasonT <= 0) {
      w.seasonT = 0
      if (w.earned >= w.target) nextSeason()
      else die()
      return
    }
    // mid-season weather from season 3
    if (w.season >= 3 && !w.weatherDone && w.seasonT < 38) {
      w.weatherDone = true
      if (Math.random() < 0.55) {
        const kind = Math.random() < 0.5 ? 'rain' : 'sponsor'
        w.weather = { kind, t: 0, dur: kind === 'rain' ? 14 : 12 }
        showBanner(kind === 'rain' ? 'RAIN!' : 'SPONSOR RUSH!', kind === 'rain' ? 'slower laps — nitro cuts through' : 'laps pay x2')
        sfx.whoosh()
      }
    }
    // golden car
    if (w.season >= 1 && w.clock > 15) {
      if (!w.golden) {
        w.goldenIn -= dt
        if (w.goldenIn <= 0) {
          w.golden = { s: 0.02, lane: T.band * 0.45, t: 0 }
          w.goldenIn = rand(28, 42)
          fx.text(T.cx, T.cy, 'GOLDEN CAR — TAP IT!', '#fde047', 15)
          sfx.ready()
        }
      } else {
        w.golden.t += dt
        w.golden.s += dt / 9
        if (w.golden.s >= 1) {
          w.golden = null
          fx.text(T.cx, T.cy, 'Golden car escaped', '#e5e7eb', 13)
        }
      }
    }

    // coins to HUD
    const tx = W - 46
    const ty = 22
    for (const c of w.coins) {
      c.t += raw
      if (c.t < 0.35) {
        c.vy += 600 * raw
        c.x += c.vx * raw
        c.y += c.vy * raw
      } else {
        const kk = Math.min(1, raw * 9)
        c.x += (tx - c.x) * kk
        c.y += (ty - c.y) * kk
      }
    }
    w.coins = w.coins.filter((c) => !(c.t > 0.35 && Math.hypot(c.x - tx, c.y - ty) < 14))
    if (w.combo > 0 && w.clock - w.lastMerge > 1.8) w.combo = 0
    if (Math.floor(w.clock * 5) !== Math.floor((w.clock - dt) * 5)) pushHud()
  }

  // ── Drawing ─────────────────────────────────────────

  function drawSlot(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, pit: boolean, locked: boolean) {
    ctx.fillStyle = pit ? 'rgba(30,41,59,0.95)' : 'rgba(51,65,85,0.9)'
    ctx.beginPath()
    ctx.roundRect(x + 3, y + 3, cs - 6, cs - 6, 10)
    ctx.fill()
    ctx.strokeStyle = pit ? 'rgba(250,204,21,0.45)' : 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (pit) {
      ctx.fillStyle = 'rgba(250,204,21,0.25)'
      for (let k = 0; k < 4; k++) ctx.fillRect(x + 8 + k * ((cs - 16) / 4), y + cs - 9, (cs - 16) / 8, 3)
    }
    if (locked) {
      const cx = x + cs / 2
      const cy = y + cs / 2
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy - 4, 7, Math.PI, 0)
      ctx.stroke()
      ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.roundRect(cx - 10, cy - 4, 20, 15, 3)
      ctx.fill()
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const ph = phaseRef.current
    const dt = fx.step(raw)
    const { cs, gx, gridY, pitY, trackH, T } = geo()

    if (ph === 'idle' && w.demo && !w.slots.some(Boolean)) {
      ;[4, 8, 11].forEach((tier, i) => {
        w.slots[i] = newCar(tier)
        w.slots[i]!.s = i * 0.31
      })
      ;[0, 1, 2, 3, 5].forEach((tier, i) => (w.slots[PITS + i * 2] = newCar(tier)))
    }
    update(dt, raw)

    const night = w.season >= 4 && Math.floor((w.season - 4) / 3) % 2 === 0
    ctx.drawImage(trackSprite(W, trackH, T, night), 0, 0, W, trackH)
    if (night) {
      for (const x of [W * 0.08, W * 0.92]) glow(ctx, x, 30, 60, '#fef9c3', 0.18)
    }
    fx.applyShake(ctx)

    // racing cars
    const carL = clamp(T.band * 0.62, 30, 44)
    const order: number[] = []
    for (let i = 0; i < w.pits; i++) if (w.slots[i] && !w.slots[i]!.pending) order.push(i)
    for (const i of order) {
      const c = w.slots[i]!
      const p = trackPoint(T, c.s, laneOf(i))
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.a)
      if (w.boost > 0.05 || c.tier >= 10) drawFlame(ctx, carL, t + i, Math.max(w.boost, c.tier >= 10 ? 0.5 : 0), c.tier >= 10 ? '#38bdf8' : '#fb923c')
      if (w.weather?.kind === 'sponsor') glow(ctx, 0, 0, carL * 0.8, '#fde047', 0.3)
      if (c.lapFlash > 0) glow(ctx, 0, 0, carL * 0.9, '#86efac', c.lapFlash * 0.5)
      ctx.drawImage(carSprite(c.tier, carL), -carL / 2, -carL / 2, carL, carL)
      ctx.restore()
      // speed streaks
      if (w.boost > 0.4) {
        ctx.strokeStyle = `rgba(255,255,255,${(w.boost - 0.4) * 0.6})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(p.x - Math.cos(p.a) * carL * 0.6, p.y - Math.sin(p.a) * carL * 0.6 + 4)
        ctx.lineTo(p.x - Math.cos(p.a) * carL * 1.3, p.y - Math.sin(p.a) * carL * 1.3 + 4)
        ctx.stroke()
      }
    }
    // golden car
    const gp = goldenPos()
    if (gp && w.golden) {
      glow(ctx, gp.x, gp.y, 40, '#fde047', 0.45 + Math.sin(t * 10) * 0.15)
      ctx.save()
      ctx.translate(gp.x, gp.y)
      ctx.rotate(gp.a)
      ctx.drawImage(carSprite(6, carL * 1.1), -carL * 0.55, -carL * 0.55, carL * 1.1, carL * 1.1)
      ctx.restore()
      ctx.save()
      ctx.globalAlpha = 0.6 + Math.sin(t * 12) * 0.3
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(gp.x + Math.cos(t * 9) * 18, gp.y + Math.sin(t * 9) * 12, 2.5, 0, Math.PI * 2)
      ctx.arc(gp.x - Math.cos(t * 7) * 16, gp.y - Math.sin(t * 7) * 10, 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    // rain
    if (w.weather?.kind === 'rain') {
      ctx.fillStyle = 'rgba(30,58,138,0.18)'
      ctx.fillRect(0, 0, W, trackH)
      ctx.strokeStyle = 'rgba(191,219,254,0.55)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (let i = 0; i < 46; i++) {
        const rx = (i * 53 + t * 120) % W
        const ry = (i * 97 + t * 520) % trackH
        ctx.moveTo(rx, ry)
        ctx.lineTo(rx - 4, ry + 11)
      }
      ctx.stroke()
    }
    // nitro hint
    if (ph === 'play' && w.season === 1 && w.clock < 20) {
      ctx.globalAlpha = 0.6 + Math.sin(t * 6) * 0.3
      ctx.fillStyle = '#ffffff'
      ctx.font = `900 13px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('TAP THE TRACK FOR NITRO', T.cx, T.cy)
      ctx.globalAlpha = 1
    }

    // garage panel
    const pg = ctx.createLinearGradient(0, trackH, 0, H)
    pg.addColorStop(0, '#334155')
    pg.addColorStop(1, '#0f172a')
    ctx.fillStyle = pg
    ctx.fillRect(-10, trackH, W + 20, H - trackH + 10)
    ctx.fillStyle = '#facc15'
    for (let x = -10; x < W + 10; x += 22) {
      ctx.beginPath()
      ctx.moveTo(x, trackH)
      ctx.lineTo(x + 11, trackH)
      ctx.lineTo(x + 5, trackH + 5)
      ctx.lineTo(x - 6, trackH + 5)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fillRect(gx - 6, gridY - 4, cs * GC + 12, cs * GR + 8)
    for (let i = 0; i < SLOTS; i++) {
      const s = slotXY(i)
      drawSlot(ctx, s.x, s.y, cs, i < PITS, i < PITS && i >= w.pits)
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    ctx.font = `800 9px ${FONT}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText('PIT LANES · RACING', gx + 2, pitY - 3)
    ctx.fillText('GARAGE', gx + 2, gridY - 8)

    const d = drag.current
    const dragTier = d && d.moved ? w.slots[d.idx]?.tier ?? -1 : -1
    let hintTier = -1
    if (ph === 'play' && w.stats.merges === 0 && dragTier < 0) {
      const counts = new Map<number, number>()
      for (const c of w.slots) if (c) counts.set(c.tier, (counts.get(c.tier) ?? 0) + 1)
      for (const [tier, n] of counts) if (n >= 2) hintTier = tier
    }
    for (let i = 0; i < SLOTS; i++) {
      const c = w.slots[i]
      if (!c || (d && d.moved && d.idx === i)) continue
      const s = slotXY(i)
      const cx = s.x + cs / 2
      const cy = s.y + cs / 2
      if ((dragTier >= 0 && c.tier === dragTier && c.tier < MAX_TIER) || c.tier === hintTier) glow(ctx, cx, cy, cs * 0.7, '#fde047', 0.35 + Math.sin(t * 8) * 0.15)
      if (c.tier >= 7) glow(ctx, cx, cy, cs * 0.6, TIER_COLORS[c.tier], 0.2 + Math.sin(t * 3 + i) * 0.06)
      if (i < PITS && i < w.pits) {
        // lap progress ring
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(cx, cy, cs * 0.42, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = c.lapFlash > 0 ? '#86efac' : TIER_COLORS[c.tier]
        ctx.beginPath()
        ctx.arc(cx, cy, cs * 0.42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.s)
        ctx.stroke()
      }
      const pop = c.pop
      const sz = cs * (0.9 + pop * 0.3 - (pop > 0.75 ? (pop - 0.75) * 0.8 : 0))
      ctx.save()
      ctx.translate(cx, cy + Math.sin(t * 2 + i) * (i >= PITS ? 1 : 0))
      ctx.rotate(-0.5)
      ctx.drawImage(carSprite(c.tier, sz), -sz / 2, -sz / 2, sz, sz)
      ctx.restore()
      ctx.fillStyle = TIER_COLORS[c.tier]
      ctx.beginPath()
      ctx.arc(s.x + 12, s.y + 12, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0b0f19'
      ctx.font = `900 10px ${FONT}`
      ctx.textAlign = 'center'
      ctx.fillText(String(c.tier + 1), s.x + 12, s.y + 12.5)
    }
    if (d && d.moved) {
      const src = w.slots[d.idx]
      const dst = slotAt(d.x, d.y)
      if (src && dst >= 0 && dst !== d.idx) {
        const tgt = w.slots[dst]
        const s = slotXY(dst)
        ctx.strokeStyle = dst < PITS && dst >= w.pits ? '#ef4444' : tgt && tgt.tier === src.tier ? '#fde047' : '#ffffff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(s.x + 3, s.y + 3, cs - 6, cs - 6, 10)
        ctx.stroke()
      }
    }
    for (const a of w.anims) {
      const s = slotXY(a.dst)
      const q = Math.min(1, a.t / 0.12)
      const x = a.x0 + (s.x + cs / 2 - a.x0) * q
      const y = a.y0 + (s.y + cs / 2 - a.y0) * q
      const sz = cs * (1.05 - q * 0.2)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(-0.5)
      ctx.drawImage(carSprite(a.tier, sz), -sz / 2, -sz / 2, sz, sz)
      ctx.restore()
    }
    if (d && d.moved) {
      const c = w.slots[d.idx]
      if (c) {
        const sz = cs * 1.1
        ctx.save()
        ctx.translate(d.x, d.y - cs * 0.2)
        ctx.rotate(-0.5 + Math.sin(t * 12) * 0.05)
        ctx.drawImage(carSprite(c.tier, sz), -sz / 2, -sz / 2, sz, sz)
        ctx.restore()
      }
    }
    fx.draw(ctx)
    ctx.restore()

    if (ph !== 'idle') {
      // season target bar
      const bw = Math.min(W * 0.42, 190)
      const bx = (W - bw) / 2
      const k = clamp(w.earned / w.target, 0, 1)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.beginPath()
      ctx.roundRect(bx, 8, bw, 18, 9)
      ctx.fill()
      const fg = ctx.createLinearGradient(bx, 0, bx + bw, 0)
      fg.addColorStop(0, w.hit ? '#22c55e' : '#f59e0b')
      fg.addColorStop(1, w.hit ? '#86efac' : '#fde047')
      ctx.fillStyle = fg
      ctx.beginPath()
      ctx.roundRect(bx, 8, Math.max(18, bw * k), 18, 9)
      ctx.fill()
      ctx.fillStyle = '#0b0f19'
      ctx.font = `900 11px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`$${fmt(w.earned)} / $${fmt(w.target)}`, W / 2, 17.5)
      // bottom bar
      const bt = buttons()
      const cost = buyCost()
      const can = w.cash >= cost
      const dragging = !!(d && d.moved)
      const overBuy = dragging && inRect(d!.x, d!.y, bt.buy)
      const bg = ctx.createLinearGradient(0, bt.buy.y, 0, bt.buy.y + bt.buy.h)
      bg.addColorStop(0, dragging ? (overBuy ? '#f87171' : '#b91c1c') : can ? '#4ade80' : '#475569')
      bg.addColorStop(1, dragging ? '#7f1d1d' : can ? '#15803d' : '#1e293b')
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.roundRect(bt.buy.x, bt.buy.y, bt.buy.w, bt.buy.h, 14)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.textAlign = 'left'
      ctx.fillStyle = '#fff'
      if (dragging) {
        const c = w.slots[d!.idx]
        ctx.font = `900 14px ${FONT}`
        ctx.fillText('SELL', bt.buy.x + 12, bt.buy.y + bt.buy.h * 0.36)
        ctx.font = `800 12px ${FONT}`
        ctx.fillText(c ? `+$${fmt(sellValue(c.tier))}` : '', bt.buy.x + 12, bt.buy.y + bt.buy.h * 0.68)
      } else {
        const sz = bt.buy.h * 0.9
        ctx.save()
        ctx.translate(bt.buy.x + 4 + sz / 2, bt.buy.y + bt.buy.h / 2)
        ctx.rotate(-0.5)
        ctx.drawImage(carSprite(shopTier(), sz), -sz / 2, -sz / 2, sz, sz)
        ctx.restore()
        ctx.font = `900 13px ${FONT}`
        ctx.fillText('BUY', bt.buy.x + sz + 4, bt.buy.y + bt.buy.h * 0.34)
        ctx.font = `800 13px ${FONT}`
        ctx.fillStyle = can ? '#fef9c3' : '#cbd5e1'
        ctx.fillText(`$${fmt(cost)}`, bt.buy.x + sz + 4, bt.buy.y + bt.buy.h * 0.68)
      }
      const nx = bt.next
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      ctx.beginPath()
      ctx.roundRect(nx.x, nx.y, nx.w, nx.h, 12)
      ctx.fill()
      const nt = Math.min(MAX_TIER, w.best + 1)
      const sz = nx.h * 0.8
      ctx.save()
      ctx.translate(nx.x + 2 + sz / 2, nx.y + nx.h / 2)
      ctx.rotate(-0.5)
      ctx.drawImage(carSprite(nt, sz), -sz / 2, -sz / 2, sz, sz)
      ctx.restore()
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = `800 9px ${FONT}`
      ctx.fillText(w.best >= MAX_TIER ? 'MAXED' : 'NEXT', nx.x + sz + 2, nx.y + nx.h * 0.32)
      ctx.fillStyle = TIER_COLORS[nt] === '#f8fafc' ? '#e2e8f0' : TIER_COLORS[nt]
      ctx.font = `900 11px ${FONT}`
      ctx.fillText(CAR_NAMES[nt].split(' ')[0], nx.x + sz + 2, nx.y + nx.h * 0.62)
      // nitro gauge button
      const nb = bt.nitro
      const ng = ctx.createLinearGradient(0, nb.y, 0, nb.y + nb.h)
      ng.addColorStop(0, '#0ea5e9')
      ng.addColorStop(1, '#075985')
      ctx.fillStyle = ng
      ctx.beginPath()
      ctx.roundRect(nb.x, nb.y, nb.w, nb.h, 14)
      ctx.fill()
      ctx.fillStyle = 'rgba(125,211,252,0.55)'
      ctx.beginPath()
      ctx.roundRect(nb.x, nb.y + nb.h * (1 - w.boost), nb.w, nb.h * w.boost, 14)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.font = `900 12px ${FONT}`
      ctx.fillText('NITRO', nb.x + nb.w / 2, nb.y + nb.h * 0.42)
      ctx.font = `800 10px ${FONT}`
      ctx.fillText(`x${(1 + w.boost * 0.9).toFixed(1)}`, nb.x + nb.w / 2, nb.y + nb.h * 0.7)
    }
    for (const c of w.coins) {
      ctx.fillStyle = '#16a34a'
      ctx.strokeStyle = '#052e16'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(c.x - 6, c.y - 3.5, 12, 7, 1.5)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#bbf7d0'
      ctx.beginPath()
      ctx.arc(c.x, c.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const won = hud.seasons >= 3
  const mm = Math.floor(hud.time / 60)
  const ss = String(hud.time % 60).padStart(2, '0')
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena carmerge-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud carmerge-hud">
              <div>
                <div className={`action-hud__score${hud.time <= 10 ? ' carmerge-low' : ''}`}>
                  {mm}:{ss}
                </div>
                <div className="action-hud__small">Season {hud.season}</div>
              </div>
              <div className="action-hud__right">
                <span className="carmerge-cash">${fmt(hud.cash)}</span>
                {hud.combo > 1 ? <span className="carmerge-combo">x{hud.combo}</span> : null}
              </div>
            </div>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner carmerge-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="carmerge"
              icon={meta.icon}
              title={meta.title}
              hint="Merge identical cars, race them in the pit lanes for cash and hit each season's target before the clock runs out."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Champion!' : 'Season over'}
            subtitle={`Earned $${fmt(hud.total)} · ${hud.seasons} season${hud.seasons === 1 ? '' : 's'} cleared`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
