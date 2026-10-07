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
import { HAZARD_R, drawCoin, drawFuel, drawHazard, drawRocket, rocketHeight, type Build, type HazardKind } from './art'
import '../../shared/action/action.css'
import './rocket.css'

const meta = getGame('rocket')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Stage = 'hangar' | 'countdown' | 'flight' | 'report'
type Hazard = { kind: HazardKind; x: number; y: number; vx: number; t: number; hit: boolean; passed: boolean }
type Pick = { kind: 'coin' | 'fuel'; x: number; y: number; got: boolean }
type Cloud = { x: number; y: number; s: number; a: number }
type Debris = { x: number; y: number; vx: number; vy: number; r: number; vr: number; life: number; side: number }

const ENG = [
  { T: 100, m: 2, burn: 1, K: 70, name: 'Spark' },
  { T: 170, m: 2.4, burn: 1.25, K: 105, name: 'Turbo' },
  { T: 280, m: 2.8, burn: 1.5, K: 150, name: 'Plasma' },
]
const BST = [null, { T: 120, fuel: 6, dry: 1, k: 0.6 }, { T: 240, fuel: 9, dry: 1.6, k: 1.1 }]
const ALT_A = 600
const ALT_Q = 0.75
const FUEL_MASS = 0.08
const ZONES: [number, string][] = [
  [0, 'Launch Pad'],
  [1000, 'Cloud Layer'],
  [8000, 'Jet Stream'],
  [25000, 'Stratosphere'],
  [60000, 'Edge of Space'],
  [100000, 'Orbit'],
  [300000, 'The Moon'],
]

type Shop = { id: string; label: string; desc: string; cost: number; owned: (b: Build) => boolean; can: (b: Build) => boolean; need?: string; apply: (b: Build) => void }
const SHOP: Shop[] = [
  { id: 'tank', label: 'Fuel Tank', desc: '+8 fuel (max 4 tanks)', cost: 30, owned: (b) => b.tanks.length >= 4, can: (b) => b.tanks.length < 4, apply: (b) => b.tanks.push('s') },
  { id: 'nose', label: 'Nose Cone', desc: 'Faster climb, steadier', cost: 25, owned: (b) => b.nose >= 1, can: (b) => b.nose === 0, apply: (b) => (b.nose = 1) },
  { id: 'fins', label: 'Fins', desc: 'Stability and speed', cost: 30, owned: (b) => b.fins, can: (b) => !b.fins, apply: (b) => (b.fins = true) },
  { id: 'turbo', label: 'Turbo Engine', desc: 'More thrust, faster', cost: 90, owned: (b) => b.engine >= 1, can: (b) => b.engine === 0, apply: (b) => (b.engine = 1) },
  { id: 'boost', label: 'Boosters', desc: 'Side boost for 6 s', cost: 80, owned: (b) => b.boost >= 1, can: (b) => b.boost === 0, apply: (b) => (b.boost = 1) },
  { id: 'bigtank', label: 'Big Tank', desc: 'Upgrade a tank to 16 fuel', cost: 70, owned: (b) => b.tanks.length === 4 && b.tanks.every((t) => t === 'l'), can: (b) => b.tanks.includes('s'), need: 'needs a tank', apply: (b) => (b.tanks[b.tanks.indexOf('s')] = 'l') },
  { id: 'armor', label: 'Armored Nose', desc: '+1 hit, sturdier', cost: 90, owned: (b) => b.nose === 2, can: (b) => b.nose === 1, need: 'needs nose cone', apply: (b) => (b.nose = 2) },
  { id: 'heavy', label: 'Heavy Boosters', desc: 'Huge boost for 9 s', cost: 220, owned: (b) => b.boost === 2, can: (b) => b.boost === 1, need: 'needs boosters', apply: (b) => (b.boost = 2) },
  { id: 'plasma', label: 'Plasma Engine', desc: 'Top-tier thrust', cost: 300, owned: (b) => b.engine === 2, can: (b) => b.engine === 1, need: 'needs turbo', apply: (b) => (b.engine = 2) },
]

function specs(b: Build, hullBonus: number) {
  const e = ENG[b.engine]
  let dry = e.m + (b.nose ? (b.nose === 2 ? 0.7 : 0.3) : 0) + (b.fins ? 0.4 : 0)
  let fuel = 0
  for (const t of b.tanks) {
    dry += t === 'l' ? 0.8 : 0.5
    fuel += t === 'l' ? 16 : 8
  }
  const bst = BST[b.boost]
  const mass0 = dry + fuel * FUEL_MASS + (bst ? bst.dry + bst.fuel * FUEL_MASS : 0)
  const twr = (e.T + (bst ? bst.T : 0)) / (mass0 * 10)
  const aero = (b.nose ? 1.15 : 1) * (b.fins ? 1.1 : 1)
  const stab = clamp(1 + (b.nose ? 1 : 0) + (b.fins ? 2 : 0) - Math.max(0, b.tanks.length - 2) * 0.6 + (b.boost ? 0.5 : 0), 0.4, 5)
  const hull = 2 + (b.nose === 2 ? 1 : 0) + hullBonus
  return { e, dry, fuel, bst, twr, aero, stab, hull, burnTime: fuel / e.burn }
}

function fmtAlt(m: number) {
  if (m < 1000) return `${Math.round(m)} m`
  if (m < 100000) return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`
  return `${Math.round(m / 1000)} km`
}

function targetFor(n: number) {
  const raw = 600 * Math.pow(1.85, n - 1)
  const mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1)
  return Math.round(raw / mag) * mag
}

type Fl = {
  alt: number
  v: number
  fuel: number
  maxFuel: number
  bf: number
  bMax: number
  att: boolean
  bEmptyAt: number
  x: number
  tx: number
  hull: number
  inv: number
  hz: Hazard[]
  picks: Pick[]
  clouds: Cloud[]
  debris: Debris[]
  spawnT: number
  coinT: number
  fuelT: number
  t: number
  coins: number
  staged: boolean
  perfect: boolean
  zone: number
  crashed: boolean
  endT: number
  count: number
  hitFlash: number
}

function freshFlight(): Fl {
  return { alt: 0, v: 0, fuel: 0, maxFuel: 1, bf: 0, bMax: 1, att: false, bEmptyAt: -1, x: 0, tx: 0, hull: 2, inv: 0, hz: [], picks: [], clouds: [], debris: [], spawnT: 2.5, coinT: 1.5, fuelT: 5, t: 0, coins: 0, staged: false, perfect: false, zone: 0, crashed: false, endT: 0, count: 0, hitFlash: 0 }
}

type World = {
  build: Build
  cash: number
  flight: number
  hearts: number
  score: number
  stage: Stage
  fl: Fl
  report: { hit: boolean; alt: number; target: number; cash: number; coins: number; crashed: boolean; perfect: boolean } | null
  stats: { score: number; alt: number; flights: number; coins: number; staging: number }
}

function freshWorld(): World {
  return {
    build: { engine: 0, tanks: ['s'], nose: 0, fins: false, boost: 0 },
    cash: 0,
    flight: 1,
    hearts: 3,
    score: 0,
    stage: 'hangar',
    fl: freshFlight(),
    report: null,
    stats: { score: 0, alt: 0, flights: 0, coins: 0, staging: 0 },
  }
}

function lerpColor(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`
}

const SKY: [number, string, string][] = [
  [0, '#38bdf8', '#e0f2fe'],
  [3000, '#2563eb', '#93c5fd'],
  [15000, '#1e3a8a', '#3b82f6'],
  [40000, '#0f172a', '#1e3a8a'],
  [80000, '#020617', '#0b1026'],
]

function skyAt(alt: number): [string, string] {
  for (let i = 0; i < SKY.length - 1; i++) {
    const [a0, t0, b0] = SKY[i]
    const [a1, t1, b1] = SKY[i + 1]
    if (alt < a1) {
      const k = (alt - a0) / (a1 - a0)
      return [lerpColor(t0, t1, k), lerpColor(b0, b1, k)]
    }
  }
  return [SKY[SKY.length - 1][1], SKY[SKY.length - 1][2]]
}

const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 137.5) % 1, y: ((i * 73.1) % 100) / 100, r: 0.6 + ((i * 7) % 3) * 0.5 }))

export default function RocketGame() {
  const run = useActionRun('rocket')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const steer = useRef<number | null>(null)
  const keys = useRef({ l: false, r: false })
  const cardDrag = useRef<{ id: string; pid: number; sx: number; sy: number; x: number; y: number } | null>(null)
  const lastMilestone = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [, setTick] = useState(0)
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [ghost, setGhost] = useState<{ label: string; x: number; y: number } | null>(null)
  const [fhud, setFhud] = useState({ alt: 0, zone: 'Launch Pad', hull: 2, hullMax: 2, stage: false, stageReady: false })

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  const refresh = () => setTick((n) => n + 1)

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.cash = run.level('seed') * 40
    world.current = w
    fx.reset()
    lastMilestone.current = 0
    run.begin()
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'HANGAR', sub: 'build, then launch' })
    sfx.ready()
    refresh()
  }

  function buy(id: string) {
    const w = world.current
    const it = SHOP.find((s) => s.id === id)
    if (!it || w.stage !== 'hangar' || phaseRef.current !== 'play') return
    if (!it.can(w.build) || w.cash < it.cost) {
      sfx.miss()
      haptic.error()
      return
    }
    w.cash -= it.cost
    it.apply(w.build)
    const { w: W, h: H } = size.current
    fx.burst(W / 2, H * 0.3, { count: 16, color: ['#fde047', '#ffffff', '#c4b5fd'], speed: 200, shape: 'spark', gravity: 200 })
    fx.ring(W / 2, H * 0.3, { color: '#c4b5fd', maxR: 60, life: 0.35 })
    fx.shake(3, 0.12)
    sfx.thud()
    sfx.power()
    haptic.medium()
    refresh()
  }

  function launch() {
    const w = world.current
    if (w.stage !== 'hangar' || phaseRef.current !== 'play') return
    const sp = specs(w.build, run.level('hull'))
    if (sp.twr < 1) {
      sfx.miss()
      return
    }
    const fl = freshFlight()
    const { w: W } = size.current
    fl.fuel = sp.fuel
    fl.maxFuel = sp.fuel
    fl.bf = sp.bst ? sp.bst.fuel : 0
    fl.bMax = sp.bst ? sp.bst.fuel : 1
    fl.att = !!sp.bst
    fl.hull = sp.hull
    fl.x = W / 2
    fl.tx = W / 2
    fl.count = 1.6
    w.fl = fl
    w.stage = 'countdown'
    setFhud({ alt: 0, zone: ZONES[0][1], hull: fl.hull, hullMax: fl.hull, stage: fl.att, stageReady: false })
    setBanner({ key: Date.now(), text: '3 · 2 · 1', sub: `target ${fmtAlt(targetFor(w.flight))}` })
    sfx.tick()
    refresh()
  }

  function stageBoosters() {
    const w = world.current
    const fl = w.fl
    if (w.stage !== 'flight' || !fl.att) return
    const { h: H } = size.current
    const baseY = H * 0.7
    const sc = rocketScale()
    fl.att = false
    fl.staged = true
    for (const side of [-1, 1]) fl.debris.push({ x: fl.x + side * 16 * sc, y: baseY - 30 * sc, vx: side * 70, vy: 40, r: 0, vr: side * 2.5, life: 2.5, side })
    if (fl.bf <= 0 && fl.bEmptyAt >= 0 && fl.t - fl.bEmptyAt < 0.8) {
      fl.perfect = true
      w.stats.staging += 1
      w.score += 100
      fx.text(fl.x, baseY - 120, 'PERFECT STAGING +100', '#fde047', 17)
      fx.ring(fl.x, baseY - 40, { color: '#fde047', maxR: 60, life: 0.4 })
      sfx.combo()
      haptic.success()
    } else if (fl.bf > 0) {
      fx.text(fl.x, baseY - 120, 'EARLY STAGE', '#fecaca', 14)
      sfx.whoosh()
    } else {
      fx.text(fl.x, baseY - 120, 'STAGED', '#ffffff', 14)
      sfx.whoosh()
    }
    fx.shake(4, 0.2)
    run.update(w.stats)
    setFhud((h) => ({ ...h, stage: false, stageReady: false }))
  }

  function rocketScale() {
    const { h: H } = size.current
    return clamp((H * 0.34) / rocketHeight(world.current.build), 0.45, 1.25)
  }

  function endFlight() {
    const w = world.current
    const fl = w.fl
    const target = targetFor(w.flight)
    const hit = fl.alt >= target
    const cash = 25 + Math.floor(Math.sqrt(fl.alt) * 1.1) + fl.coins * 3 + (hit ? 20 + w.flight * 5 : 0)
    w.cash += cash
    w.score += Math.round(fl.alt / 10)
    w.stats.score = w.score
    w.stats.alt = Math.max(w.stats.alt, Math.round(fl.alt))
    if (hit) w.stats.flights += 1
    else w.hearts -= 1
    w.report = { hit, alt: fl.alt, target, cash, coins: fl.coins, crashed: fl.crashed, perfect: fl.perfect }
    w.stage = 'report'
    if (hit) {
      sfx.win()
      haptic.success()
    } else {
      sfx.hurt()
      haptic.error()
      fx.flash('#ef4444', 0.2)
    }
    if (w.flight - lastMilestone.current >= 5 && w.flight % 5 === 0) {
      lastMilestone.current = w.flight
      void trackEvent('action_milestone', { game_id: 'rocket', kind: 'flight', value: w.flight })
    }
    run.update(w.stats)
    refresh()
  }

  function closeReport() {
    const w = world.current
    if (w.stage !== 'report' || phaseRef.current !== 'play') return
    if (w.hearts <= 0) {
      die()
      return
    }
    w.flight += 1
    w.stage = 'hangar'
    w.report = null
    setBanner({ key: Date.now(), text: `FLIGHT ${w.flight}`, sub: `target ${fmtAlt(targetFor(w.flight))}` })
    sfx.ready()
    refresh()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.shake(8, 0.4)
    fx.slowmo(0.8, 0.4)
    sfx.lose()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.stats.flights * 4 + w.stats.coins / 4 + w.stats.alt / 20000 + 3) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.stats.alt >= 25000, stats: { ...w.stats }, coins }, revive)
    }, 900)
  }

  /** Revive: one heart back plus a rescue grant, straight back to the hangar. */
  function revive() {
    const w = world.current
    w.hearts = 1
    w.cash += 60
    w.flight += 1
    w.stage = 'hangar'
    w.report = null
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: '+60 rescue cash' })
    setPhaseBoth('play')
    refresh()
  }

  // ── Input ─────────────────────────────────────────────

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const w = world.current
    if (w.stage !== 'flight' && w.stage !== 'countdown') return
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    steer.current = e.pointerId
    w.fl.tx = localPoint(e, el).x
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (steer.current !== e.pointerId) return
    world.current.fl.tx = localPoint(e, e.currentTarget).x
  }

  function onUp(e: React.PointerEvent<HTMLDivElement>) {
    if (steer.current === e.pointerId) steer.current = null
  }

  function cardDown(e: React.PointerEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    cardDrag.current = { id, pid: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY }
  }

  function cardMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = cardDrag.current
    if (!d || d.pid !== e.pointerId) return
    d.x = e.clientX
    d.y = e.clientY
    if (Math.hypot(d.x - d.sx, d.y - d.sy) > 10) {
      const host = e.currentTarget.closest('.action-arena')
      const r = host?.getBoundingClientRect()
      setGhost({ label: SHOP.find((s) => s.id === d.id)?.label ?? '', x: d.x - (r?.left ?? 0), y: d.y - (r?.top ?? 0) })
    }
  }

  function cardUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = cardDrag.current
    if (!d || d.pid !== e.pointerId) return
    cardDrag.current = null
    setGhost(null)
    const moved = Math.hypot(d.x - d.sx, d.y - d.sy)
    if (moved < 10 || d.y - d.sy < -50) buy(d.id)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.l = true
      if (e.key === 'ArrowRight' || e.key === 'd') keys.current.r = true
      if (e.key === ' ') {
        const w = world.current
        if (w.stage === 'flight') stageBoosters()
        else if (w.stage === 'hangar') launch()
        else if (w.stage === 'report') closeReport()
      }
    }
    function up(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.l = false
      if (e.key === 'ArrowRight' || e.key === 'd') keys.current.r = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ── Flight sim ───────────────────────────────────────

  function stepFlight(dt: number, W: number, H: number) {
    const w = world.current
    const fl = w.fl
    const sp = specs(w.build, run.level('hull'))
    const baseY = H * 0.7
    const sc = rocketScale()
    fl.t += dt
    fl.inv = Math.max(0, fl.inv - dt)
    fl.hitFlash = Math.max(0, fl.hitFlash - dt * 3)
    if (keys.current.l) fl.tx -= 320 * dt
    if (keys.current.r) fl.tx += 320 * dt
    fl.tx = clamp(fl.tx, 30, W - 30)
    const resp = 3 + sp.stab * 1.4
    fl.x += (fl.tx - fl.x) * Math.min(1, dt * resp)

    const boosting = fl.att && fl.bf > 0
    const burning = fl.fuel > 0 || boosting
    if (fl.fuel > 0 || boosting) {
      const bst = sp.bst
      const m = sp.dry + fl.fuel * FUEL_MASS + (fl.att && bst ? bst.dry + fl.bf * FUEL_MASS : 0)
      const T = (fl.fuel > 0 ? sp.e.T : 0) + (boosting && bst ? bst.T : 0)
      const twr = T / (m * 10)
      const mult = clamp(twr / 2, 0.35, 1.2)
      const k = (fl.fuel > 0 ? sp.e.K : sp.e.K * 0.5) * sp.aero * mult * (1 + (boosting && bst ? bst.k : 0))
      const target = k * Math.pow(1 + fl.alt / ALT_A, ALT_Q)
      fl.v += (target - fl.v) * Math.min(1, 2 * dt)
    } else fl.v -= (20 + Math.max(0, fl.v) * 0.7) * dt
    fl.alt = Math.max(0, fl.alt + fl.v * dt)
    if (fl.fuel > 0) fl.fuel = Math.max(0, fl.fuel - sp.e.burn * dt)
    if (boosting) {
      fl.bf -= dt
      if (fl.bf <= 0) {
        fl.bf = 0
        fl.bEmptyAt = fl.t
        setFhud((h) => ({ ...h, stageReady: true }))
        fx.text(fl.x, baseY - 140, 'BOOSTERS EMPTY — STAGE!', '#fde047', 15)
        sfx.tick()
      }
    }
    // auto-drop dead boosters after a while
    if (fl.att && fl.bf <= 0 && fl.t - fl.bEmptyAt > 3) stageBoosters()

    // zones
    while (fl.zone < ZONES.length - 1 && fl.alt >= ZONES[fl.zone + 1][0]) {
      fl.zone += 1
      const bonus = 50 * fl.zone
      w.score += bonus
      setBanner({ key: Date.now(), text: ZONES[fl.zone][1].toUpperCase(), sub: `${fmtAlt(ZONES[fl.zone][0])} · +${bonus}` })
      sfx.levelUp()
      haptic.success()
      if (fl.zone === ZONES.length - 1) {
        fx.flash('#fef9c3', 0.3)
        fx.slowmo(1, 0.4)
        fx.explode(W / 2, H * 0.25, 2, ['#fde047', '#ffffff', '#c4b5fd', '#f9a8d4'])
      }
    }

    const scroll = fl.v > 0 ? 120 + 75 * Math.log10(1 + fl.v / 25) : Math.max(0, fl.v * 2)
    // spawns
    if (burning || fl.v > 30) {
      fl.spawnT -= dt
      if (fl.spawnT <= 0) {
        const a = fl.alt
        const kinds: HazardKind[] = []
        if (a < 3000) kinds.push('bird')
        if (a > 900 && a < 15000) kinds.push('plane')
        if (a > 7000 && a < 40000) kinds.push('balloon')
        if (a > 15000 && a < 60000) kinds.push('jet')
        if (a > 55000) kinds.push('satellite')
        if (a > 100000) kinds.push('meteor')
        const kind = kinds[Math.floor(Math.random() * kinds.length)]
        const fromSide = kind === 'plane' || kind === 'jet' || kind === 'bird'
        const dir = Math.random() < 0.5 ? 1 : -1
        const speed = kind === 'jet' ? 150 : kind === 'plane' ? 90 : kind === 'bird' ? 55 : kind === 'meteor' ? 70 : 20
        fl.hz.push({ kind, x: fromSide ? (dir > 0 ? rand(-20, W * 0.5) : rand(W * 0.5, W + 20)) : rand(30, W - 30), y: -50, vx: dir * speed * (kind === 'balloon' ? rand(0.2, 1) : 1), t: rand(0, 5), hit: false, passed: false })
        const zoneK = Math.min(1, fl.zone / 5)
        fl.spawnT = rand(0.9, 1.6) * (1 - zoneK * 0.4) * (fl.t < 6 ? 1.5 : 1)
      }
      fl.coinT -= dt
      if (fl.coinT <= 0) {
        const cx = rand(40, W - 40)
        const n = 3 + Math.floor(Math.random() * 3)
        for (let i = 0; i < n; i++) fl.picks.push({ kind: 'coin', x: cx + Math.sin(i * 0.8) * 18, y: -30 - i * 30, got: false })
        fl.coinT = rand(1.8, 3)
      }
      fl.fuelT -= dt
      if (fl.fuelT <= 0) {
        fl.picks.push({ kind: 'fuel', x: rand(40, W - 40), y: -30, got: false })
        fl.fuelT = rand(5, 8)
      }
      if (fl.alt > 500 && fl.alt < 16000 && Math.random() < dt * 1.2) fl.clouds.push({ x: rand(-40, W + 40), y: -60, s: rand(0.7, 1.6), a: rand(0.5, 0.9) })
    }

    const rx = fl.x
    const ry1 = baseY - rocketHeight(w.build) * sc * 0.3
    const ry2 = baseY - rocketHeight(w.build) * sc * 0.75
    const rr = 12 * sc + 4
    for (const h of fl.hz) {
      h.t += dt
      h.y += scroll * dt * (h.kind === 'meteor' ? 1.4 : 1)
      h.x += h.vx * dt
      if (h.hit) continue
      const hr = HAZARD_R[h.kind]
      const d1 = Math.hypot(h.x - rx, h.y - ry1)
      const d2 = Math.hypot(h.x - rx, h.y - ry2)
      if ((d1 < hr + rr || d2 < hr + rr) && fl.inv <= 0 && !fl.crashed) {
        h.hit = true
        fl.hull -= 1
        fl.inv = 1.2
        fl.hitFlash = 1
        fx.explode(h.x, h.y, 0.8)
        fx.flash('#ef4444', 0.25)
        fx.stop(0.08)
        sfx.hurt()
        haptic.heavy()
        h.vx = (h.x < rx ? -1 : 1) * 300
        setFhud((s) => ({ ...s, hull: fl.hull }))
        if (fl.hull <= 0) crash(H)
      } else if (!h.passed && h.y > ry1 + 30 && Math.min(d1, d2) < hr + rr + 26) {
        h.passed = true
        w.score += 15
        fx.text(h.x, h.y - 16, 'CLOSE! +15', '#a5f3fc', 13)
        sfx.whoosh()
      }
    }
    fl.hz = fl.hz.filter((h) => h.y < H + 80 && h.x > -120 && h.x < W + 120)
    for (const p of fl.picks) {
      p.y += scroll * dt
      if (p.got) continue
      if (Math.hypot(p.x - rx, p.y - ry1) < 22 * sc + 12 || Math.hypot(p.x - rx, p.y - ry2) < 22 * sc + 12) {
        p.got = true
        if (p.kind === 'coin') {
          fl.coins += 1
          w.stats.coins += 1
          w.score += 10
          fx.burst(p.x, p.y, { count: 8, color: ['#fde047', '#facc15', '#ffffff'], speed: 140, shape: 'spark', gravity: 0 })
          sfx.score(Math.min(10, fl.coins % 10))
        } else {
          fl.fuel += 1.5
          fl.maxFuel = Math.max(fl.maxFuel, fl.fuel)
          fx.text(p.x, p.y - 18, '+FUEL', '#86efac', 15)
          fx.burst(p.x, p.y, { count: 12, color: ['#22c55e', '#bbf7d0'], speed: 160 })
          sfx.power()
          haptic.light()
        }
      }
    }
    fl.picks = fl.picks.filter((p) => !p.got && p.y < H + 40)
    for (const c of fl.clouds) c.y += scroll * dt * 0.7 * c.s
    fl.clouds = fl.clouds.filter((c) => c.y < H + 80).slice(-14)

    // exhaust smoke
    if (burning && Math.random() < 0.7) fx.burst(rx + rand(-4, 4), baseY + 30 * sc, { count: 1, color: ['#e2e8f0', '#cbd5e1'], speed: 40, size: 5, life: 0.7, gravity: scroll * 0.8, drag: 1 })

    if (!burning && fl.v <= 0 && !fl.crashed) {
      fl.endT += dt
      if (fl.endT > 0.4) endFlight()
    }
    if (fl.crashed) {
      fl.endT += dt
      if (fl.endT > 1.5) endFlight()
    }
    if (Math.floor(fl.t * 6) !== Math.floor((fl.t - dt) * 6)) setFhud((s) => ({ ...s, alt: fl.alt, zone: ZONES[fl.zone][1] }))
  }

  function crash(H: number) {
    const w = world.current
    const fl = w.fl
    const baseY = H * 0.7
    fl.crashed = true
    fl.fuel = 0
    fl.att = false
    fl.v = Math.min(fl.v, 0)
    fl.endT = 0
    const sc = rocketScale()
    fx.explode(fl.x, baseY - 40 * sc, 2.2, ['#fde047', '#fb923c', '#ef4444', '#ffffff'])
    for (let i = 0; i < 6; i++) fl.debris.push({ x: fl.x, y: baseY - i * 15 * sc, vx: rand(-160, 160), vy: rand(-200, 0), r: 0, vr: rand(-8, 8), life: 2, side: 0 })
    fx.slowmo(1, 0.3)
    fx.shake(14, 0.6)
    sfx.boom(1)
    haptic.error()
    setBanner({ key: Date.now(), text: 'ROCKET LOST!', sub: fmtAlt(fl.alt) })
  }

  // ── Frame ─────────────────────────────────────────────

  function drawSky(ctx: CanvasRenderingContext2D, W: number, H: number, alt: number, t: number) {
    const [top, bot] = skyAt(alt)
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, top)
    g.addColorStop(1, bot)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    const starA = clamp((alt - 20000) / 40000, 0, 1)
    if (starA > 0) {
      ctx.fillStyle = '#ffffff'
      for (const s of STARS) {
        ctx.globalAlpha = starA * (0.5 + Math.sin(t * 2 + s.x * 40) * 0.3)
        ctx.beginPath()
        ctx.arc(s.x * W, ((s.y * H + alt * 0.002) % H + H) % H, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    if (alt > 60000) {
      // earth curve below
      const k = clamp((alt - 60000) / 240000, 0, 1)
      const R = W * (3 - k * 1.8)
      const cy = H + R - H * (0.12 - k * 0.06)
      glow(ctx, W / 2, cy - R, W * 0.8, '#38bdf8', 0.35)
      const eg = ctx.createRadialGradient(W / 2, cy - R * 0.6, R * 0.2, W / 2, cy, R)
      eg.addColorStop(0, '#22c55e')
      eg.addColorStop(0.5, '#0284c7')
      eg.addColorStop(1, '#0c4a6e')
      ctx.fillStyle = eg
      ctx.beginPath()
      ctx.arc(W / 2, cy, R, 0, Math.PI * 2)
      ctx.fill()
    }
    if (alt > 140000) {
      const k = clamp((alt - 140000) / 160000, 0, 1)
      const r = 20 + k * 110
      const mx = W * 0.62
      const my = 40 + r * 0.6
      glow(ctx, mx, my, r * 1.6, '#fef9c3', 0.3)
      const mg = ctx.createRadialGradient(mx - r * 0.3, my - r * 0.3, r * 0.1, mx, my, r)
      mg.addColorStop(0, '#f8fafc')
      mg.addColorStop(1, '#94a3b8')
      ctx.fillStyle = mg
      ctx.beginPath()
      ctx.arc(mx, my, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(100,116,139,0.45)'
      for (const [dx, dy, cr] of [[-0.3, -0.1, 0.18], [0.25, 0.2, 0.12], [0.1, -0.4, 0.1], [-0.1, 0.4, 0.14]]) {
        ctx.beginPath()
        ctx.arc(mx + dx * r, my + dy * r, cr * r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  function drawPad(ctx: CanvasRenderingContext2D, W: number, y: number) {
    ctx.fillStyle = '#4ade80'
    ctx.fillRect(0, y, W, 400)
    ctx.fillStyle = '#16a34a'
    for (let x = 10; x < W; x += 46) {
      ctx.beginPath()
      ctx.arc(x, y + 4, 14, Math.PI, 0)
      ctx.fill()
    }
    ctx.fillStyle = '#64748b'
    ctx.fillRect(W / 2 - 50, y - 6, 100, 10)
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(W / 2 - 50, y - 6, 100, 3)
    // gantry
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 3
    const gx = W / 2 + 46
    ctx.beginPath()
    ctx.moveTo(gx, y - 6)
    ctx.lineTo(gx, y - 170)
    ctx.moveTo(gx + 14, y - 6)
    ctx.lineTo(gx + 14, y - 170)
    for (let k = y - 6; k > y - 170; k -= 18) {
      ctx.moveTo(gx, k)
      ctx.lineTo(gx + 14, k - 18)
    }
    ctx.stroke()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const fl = w.fl
    const baseY = H * 0.7
    const sc = rocketScale()

    if (ph === 'idle') {
      const alt = 2000 + Math.sin(t * 0.1) * 1500
      drawSky(ctx, W, H, alt, t)
      if (fl.clouds.length < 6 && Math.random() < raw * 2) fl.clouds.push({ x: rand(-40, W + 40), y: -60, s: rand(0.7, 1.6), a: rand(0.5, 0.9) })
      for (const c of fl.clouds) c.y += 160 * raw * c.s
      fl.clouds = fl.clouds.filter((c) => c.y < H + 80)
      drawClouds(ctx, fl.clouds)
      const demo: Build = { engine: 1, tanks: ['s', 'l'], nose: 1, fins: true, boost: 1 }
      drawRocket(ctx, demo, W / 2 + Math.sin(t * 1.3) * 30, H * 0.62, 0.8, { t, flame: true, boostFlame: true, boosters: true, tilt: Math.cos(t * 1.3) * 0.08 })
      fx.draw(ctx)
      return
    }

    if (ph === 'play' || ph === 'dying') {
      if (w.stage === 'countdown') {
        fl.count -= raw
        if (Math.random() < 0.6) fx.burst(W / 2 + rand(-30, 30), baseY + 6, { count: 2, color: ['#e2e8f0', '#cbd5e1', '#f1f5f9'], speed: 90, size: 7, life: 0.9, gravity: -20, drag: 1.5 })
        if (fl.count <= 0) {
          w.stage = 'flight'
          sfx.boom(0.5)
          fx.shake(6, 0.6)
          haptic.heavy()
          refresh()
        }
      } else if (w.stage === 'flight') stepFlight(dt, W, H)
    }

    // ── Draw ──
    const alt = w.stage === 'flight' || w.stage === 'countdown' || w.stage === 'report' ? fl.alt : 0
    drawSky(ctx, W, H, alt, t)
    fx.applyShake(ctx)
    if (w.stage === 'hangar') {
      drawPad(ctx, W, H * 0.47)
      const hs = clamp((H * 0.3) / rocketHeight(w.build), 0.5, 1.1)
      drawRocket(ctx, w.build, W / 2, H * 0.47 - 6, hs, { t, boosters: true })
      // sparkle hint
      glow(ctx, W / 2, H * 0.47 - rocketHeight(w.build) * hs * 0.5, 80, '#c4b5fd', 0.12 + Math.sin(t * 2) * 0.05)
    } else {
      if (alt < 600) drawPad(ctx, W, baseY + 8 + alt * 0.9)
      drawClouds(ctx, fl.clouds)
      for (const p of fl.picks) {
        if (p.kind === 'coin') drawCoin(ctx, p.x, p.y, t)
        else drawFuel(ctx, p.x, p.y)
      }
      for (const h of fl.hz) {
        if (h.y < 0) {
          // telegraph from the top edge
          ctx.fillStyle = '#ef4444'
          ctx.globalAlpha = 0.6 + Math.sin(t * 20) * 0.3
          ctx.beginPath()
          ctx.moveTo(clamp(h.x, 12, W - 12) - 8, 6)
          ctx.lineTo(clamp(h.x, 12, W - 12) + 8, 6)
          ctx.lineTo(clamp(h.x, 12, W - 12), 18)
          ctx.closePath()
          ctx.fill()
          ctx.globalAlpha = 1
        }
        drawHazard(ctx, h.kind, h.x, h.y, h.t, h.vx >= 0 ? 1 : -1)
      }
      for (const d of fl.debris) {
        d.life -= raw
        d.vy += 300 * raw
        d.x += d.vx * raw
        d.y += d.vy * raw
        d.r += d.vr * raw
        ctx.save()
        ctx.translate(d.x, d.y)
        ctx.rotate(d.r)
        ctx.globalAlpha = clamp(d.life, 0, 1)
        if (d.side !== 0) {
          ctx.fillStyle = '#e2e8f0'
          ctx.fillRect(-6, -26 * sc, 12, 52 * sc)
          ctx.fillStyle = w.build.boost === 2 ? '#7c3aed' : '#f97316'
          ctx.fillRect(-6, -4, 12, 4)
        } else {
          ctx.fillStyle = '#475569'
          ctx.fillRect(-6, -4, 12, 8)
        }
        ctx.restore()
      }
      fl.debris = fl.debris.filter((d) => d.life > 0)
      ctx.globalAlpha = 1
      if (!(w.stage === 'flight' && fl.crashed) && w.stage !== 'report') {
        const burning = w.stage === 'flight' && (fl.fuel > 0 || (fl.att && fl.bf > 0))
        const sp = specs(w.build, run.level('hull'))
        const wob = Math.sin(t * 9) * Math.max(0, 3 - sp.stab) * 0.025
        const tilt = clamp((fl.tx - fl.x) * 0.004, -0.35, 0.35) + wob
        const blink = fl.inv > 0 && Math.sin(t * 40) > 0
        if (!blink) drawRocket(ctx, w.build, fl.x, baseY, sc, { t, flame: burning && fl.fuel > 0, boostFlame: fl.att && fl.bf > 0 && w.stage === 'flight', boosters: fl.att, tilt, flash: fl.hitFlash })
      }
    }
    fx.draw(ctx)
    ctx.restore()

    // flight gauges
    if (w.stage === 'flight' || w.stage === 'countdown') {
      const gx = 12
      const gy = H * 0.3
      const gh = H * 0.36
      ctx.fillStyle = 'rgba(15,23,42,0.45)'
      ctx.beginPath()
      ctx.roundRect(gx, gy, 12, gh, 6)
      ctx.fill()
      const k = clamp(fl.fuel / Math.max(1, fl.maxFuel), 0, 1)
      ctx.fillStyle = k < 0.2 ? '#ef4444' : '#22c55e'
      ctx.beginPath()
      ctx.roundRect(gx + 2, gy + 2 + (gh - 4) * (1 - k), 8, (gh - 4) * k, 4)
      ctx.fill()
      if (fl.att) {
        const bk = clamp(fl.bf / fl.bMax, 0, 1)
        ctx.fillStyle = 'rgba(15,23,42,0.45)'
        ctx.beginPath()
        ctx.roundRect(gx + 16, gy + gh * 0.4, 8, gh * 0.6, 4)
        ctx.fill()
        ctx.fillStyle = '#f97316'
        ctx.beginPath()
        ctx.roundRect(gx + 17, gy + gh * 0.4 + 1 + (gh * 0.6 - 2) * (1 - bk), 6, (gh * 0.6 - 2) * bk, 3)
        ctx.fill()
      }
      ctx.fillStyle = '#fff'
      ctx.font = "800 9px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText('FUEL', gx - 2, gy + gh + 4)
      // target marker
      const tgt = targetFor(w.flight)
      const prog = clamp(fl.alt / tgt, 0, 1)
      const tx = W - 16
      ctx.fillStyle = 'rgba(15,23,42,0.45)'
      ctx.beginPath()
      ctx.roundRect(tx - 6, gy, 8, gh, 4)
      ctx.fill()
      ctx.fillStyle = prog >= 1 ? '#4ade80' : '#c4b5fd'
      ctx.beginPath()
      ctx.roundRect(tx - 5, gy + 1 + (gh - 2) * (1 - prog), 6, (gh - 2) * prog, 3)
      ctx.fill()
      ctx.textAlign = 'right'
      ctx.fillStyle = prog >= 1 ? '#4ade80' : '#fff'
      ctx.fillText(prog >= 1 ? 'TARGET HIT' : `TARGET ${fmtAlt(tgt)}`, W - 6, gy - 14)
    }
    fx.drawOverlay(ctx, W, H)
  }

  function drawClouds(ctx: CanvasRenderingContext2D, clouds: Cloud[]) {
    for (const c of clouds) {
      ctx.globalAlpha = c.a
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(c.x, c.y, 40 * c.s, 14 * c.s, 0, 0, Math.PI * 2)
      ctx.ellipse(c.x - 22 * c.s, c.y + 4, 22 * c.s, 11 * c.s, 0, 0, Math.PI * 2)
      ctx.ellipse(c.x + 18 * c.s, c.y - 7 * c.s, 22 * c.s, 14 * c.s, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  useActionCanvas(canvasRef, frame)

  const w = world.current
  const sp = specs(w.build, run.level('hull'))
  const target = targetFor(w.flight)
  const rep = w.report
  const won = w.stats.alt >= 25000
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena rocket-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{w.stage === 'flight' || w.stage === 'countdown' ? fmtAlt(fhud.alt) : w.score}</div>
                <div className="action-hud__small">{w.stage === 'flight' || w.stage === 'countdown' ? fhud.zone : `Flight ${w.flight} · Score`}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hearts">
                  {'❤'.repeat(Math.max(0, w.hearts))}
                  <span style={{ opacity: 0.3 }}>{'❤'.repeat(Math.max(0, 3 - w.hearts))}</span>
                </span>
                {w.stage === 'flight' || w.stage === 'countdown' ? (
                  <span className="rocket-hull">
                    {Array.from({ length: fhud.hullMax }, (_, i) => (
                      <i key={i} className={i < fhud.hull ? 'on' : ''} />
                    ))}
                  </span>
                ) : (
                  <span className="action-hud__small">Cash ${w.cash}</span>
                )}
              </div>
            </div>
          )}
          {phase === 'play' && w.stage === 'hangar' && (
            <div className="rocket-hangar" onPointerDown={(e) => e.stopPropagation()}>
              <div className="rocket-hangar__head">
                <strong>Flight {w.flight}</strong>
                <span>Target {fmtAlt(target)}</span>
                <span className="rocket-cash">${w.cash}</span>
              </div>
              <div className="rocket-meters">
                <Meter label="Thrust/weight" value={sp.twr / 3.5} text={sp.twr.toFixed(2)} bad={sp.twr < 1} />
                <Meter label="Burn time" value={sp.burnTime / 45} text={`${Math.round(sp.burnTime)}s`} />
                <Meter label="Stability" value={sp.stab / 4.5} text={sp.stab.toFixed(1)} bad={sp.stab < 1.5} />
                <Meter label="Hull" value={sp.hull / 6} text={`${sp.hull}`} />
              </div>
              <div className="rocket-shop">
                {SHOP.map((it) => {
                  const owned = it.owned(w.build)
                  const can = it.can(w.build)
                  const afford = w.cash >= it.cost
                  return (
                    <button
                      key={it.id}
                      type="button"
                      className={`rocket-card${owned ? ' is-owned' : ''}${can && afford ? ' is-ready' : ''}`}
                      disabled={owned || !can}
                      onPointerDown={(e) => cardDown(e, it.id)}
                      onPointerMove={cardMove}
                      onPointerUp={cardUp}
                      onPointerCancel={() => {
                        cardDrag.current = null
                        setGhost(null)
                      }}
                    >
                      <PartIcon id={it.id} />
                      <span className="rocket-card__txt">
                        <strong>{it.label}</strong>
                        <small>{owned ? 'Installed' : !can && it.need ? it.need : it.desc}</small>
                      </span>
                      {!owned && <span className={`rocket-card__cost${afford ? '' : ' is-poor'}`}>${it.cost}</span>}
                    </button>
                  )
                })}
              </div>
              <button type="button" className="rocket-launch" disabled={sp.twr < 1} onClick={launch}>
                {sp.twr < 1 ? 'Too heavy to lift off' : 'LAUNCH'}
              </button>
            </div>
          )}
          {ghost && <div className="rocket-ghost" style={{ left: ghost.x, top: ghost.y }}>{ghost.label}</div>}
          {phase === 'play' && w.stage === 'flight' && fhud.stage && (
            <button
              type="button"
              className={`rocket-stage${fhud.stageReady ? ' is-ready' : ''}`}
              onPointerDown={(e) => {
                e.stopPropagation()
                stageBoosters()
              }}
            >
              STAGE
            </button>
          )}
          {phase === 'play' && w.stage === 'report' && rep && (
            <div className="rocket-report" onPointerDown={(e) => e.stopPropagation()}>
              <h3 className={rep.hit ? 'is-hit' : 'is-miss'}>{rep.hit ? 'TARGET HIT!' : rep.crashed ? 'ROCKET LOST' : 'TARGET MISSED'}</h3>
              <div className="rocket-report__alt">{fmtAlt(rep.alt)}</div>
              <p>
                Target {fmtAlt(rep.target)} · {rep.coins} coins{rep.perfect ? ' · perfect staging' : ''}
              </p>
              <p className="rocket-report__cash">+${rep.cash} cash</p>
              {!rep.hit && <p className="rocket-report__warn">{w.hearts > 0 ? `-1 heart · ${w.hearts} left` : 'Out of hearts'}</p>}
              <button type="button" className="btn btn-primary" onClick={closeReport}>
                {w.hearts > 0 ? 'To the hangar' : 'Continue'}
              </button>
            </div>
          )}
          {banner && phase === 'play' && w.stage !== 'report' ? (
            <div className="action-banner rocket-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="rocket"
              icon={meta.icon}
              title={meta.title}
              hint="Build your rocket in the hangar, launch, steer past the sky traffic and hit each flight's target altitude."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Space pioneer!' : 'Grounded'}
            subtitle={`Score ${w.score} · best altitude ${fmtAlt(w.stats.alt)}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}

function Meter({ label, value, text, bad }: { label: string; value: number; text: string; bad?: boolean }) {
  return (
    <div className={`rocket-meter${bad ? ' is-bad' : ''}`}>
      <span>{label}</span>
      <div>
        <i style={{ width: `${Math.round(clamp(value, 0.04, 1) * 100)}%` }} />
      </div>
      <b>{text}</b>
    </div>
  )
}

/** Tiny inline SVG part icons for the shop cards. */
function PartIcon({ id }: { id: string }) {
  const common = { width: 30, height: 30, viewBox: '0 0 30 30' }
  if (id === 'tank' || id === 'bigtank')
    return (
      <svg {...common}>
        <rect x="9" y={id === 'bigtank' ? 2 : 7} width="12" height={id === 'bigtank' ? 26 : 18} rx="2" fill="#f1f5f9" />
        <rect x="9" y="15" width="12" height="3" fill={id === 'bigtank' ? '#7c3aed' : '#ef4444'} />
      </svg>
    )
  if (id === 'nose' || id === 'armor')
    return (
      <svg {...common}>
        <path d="M8 26 Q8 10 15 3 Q22 10 22 26 Z" fill={id === 'armor' ? '#94a3b8' : '#ef4444'} />
        {id === 'armor' && <circle cx="15" cy="16" r="1.6" fill="#1e293b" />}
      </svg>
    )
  if (id === 'fins')
    return (
      <svg {...common}>
        <rect x="12" y="4" width="6" height="22" fill="#e2e8f0" />
        <path d="M12 12 L4 24 L12 22 Z M18 12 L26 24 L18 22 Z" fill="#dc2626" />
      </svg>
    )
  if (id === 'boost' || id === 'heavy')
    return (
      <svg {...common}>
        <rect x="11" y="6" width="8" height="20" fill="#cbd5e1" />
        <rect x="3" y="11" width="6" height="15" rx="1" fill="#f8fafc" />
        <rect x="21" y="11" width="6" height="15" rx="1" fill="#f8fafc" />
        <path d="M3 11 Q6 5 9 11 Z M21 11 Q24 5 27 11 Z" fill={id === 'heavy' ? '#a78bfa' : '#fb923c'} />
      </svg>
    )
  return (
    <svg {...common}>
      <rect x="9" y="4" width="12" height="14" rx="2" fill={id === 'plasma' ? '#8b5cf6' : '#f59e0b'} />
      <path d="M10 18 L20 18 L23 25 L7 25 Z" fill="#334155" />
      <path d="M11 25 Q15 32 19 25 Z" fill="#fb923c" />
    </svg>
  )
}
