import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { BIOMES, objSprite } from './art'
import { AUTHORED } from './authored'
import { FIT, L, authoredLevel, makeLevel, type LevelDef, type Obj, type Wall } from './levels'
import '../../shared/action/action.css'
import './allinhole.css'

const meta = getGame('allinhole')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type Body = Obj & { vx: number; vy: number; st: 'floor' | 'fall' | 'gone'; ft: number; tilt: number; big: number }
type MWall = Wall & { phase: number; vx: number }

const K = 0.76
const WALL_H = 0.045
const MAX_R = 0.2
const SPEED = 1.5

type World = {
  lv: LevelDef
  n: number
  bodies: Body[]
  walls: MWall[]
  hx: number
  hy: number
  R: number
  r0: number
  area: number
  stun: number
  time: number
  timeMax: number
  clock: number
  streak: number
  streakT: number
  score: number
  coins: number
  starsRun: number
  stars: number
  clearT: number
  magnetT: number
  growT: number
  freezeT: number
  magnets: number
  grows: number
  freezes: number
  tickAt: number
  tooBigT: number
  dragX: number
  dragY: number
  keys: { x: number; y: number }
  total: number
  stats: { score: number; level: number; eaten: number; stars: number; streak: number }
}

function freshWorld(): World {
  return {
    lv: { n: 0, objs: [], walls: [], r0: 0.054, growth: 0.35, time: 60, hard: false, biome: 0 },
    n: 0,
    bodies: [],
    walls: [],
    hx: 0.5,
    hy: L - 0.12,
    R: 0.054,
    r0: 0.054,
    area: 0,
    stun: 0,
    time: 60,
    timeMax: 60,
    clock: 0,
    streak: 0,
    streakT: 0,
    score: 0,
    coins: 0,
    starsRun: 0,
    stars: 0,
    clearT: 0,
    magnetT: 0,
    growT: 0,
    freezeT: 0,
    magnets: 1,
    grows: 1,
    freezes: 1,
    tickAt: 0,
    tooBigT: 0,
    dragX: 0,
    dragY: 0,
    keys: { x: 0, y: 0 },
    total: 0,
    stats: { score: 0, level: 1, eaten: 0, stars: 0, streak: 0 },
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

/** Push a circle out of an axis-aligned rect; returns the push normal or null. */
function pushOut(x: number, y: number, r: number, w: Wall) {
  const cx = clamp(x, w.x, w.x + w.w)
  const cy = clamp(y, w.y, w.y + w.h)
  const dx = x - cx
  const dy = y - cy
  const d = Math.hypot(dx, dy)
  if (d >= r) return null
  if (d < 1e-6) {
    // centre inside: push along the shallow axis
    const left = x - w.x
    const right = w.x + w.w - x
    const up = y - w.y
    const down = w.y + w.h - y
    const m = Math.min(left, right, up, down)
    if (m === left) return { nx: -1, ny: 0, depth: left + r }
    if (m === right) return { nx: 1, ny: 0, depth: right + r }
    if (m === up) return { nx: 0, ny: -1, depth: up + r }
    return { nx: 0, ny: 1, depth: down + r }
  }
  return { nx: dx / d, ny: dy / d, depth: r - d }
}

const MagnetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4v8a6 6 0 0 0 12 0V4" />
    <path d="M6 4h4v8a2 2 0 0 0 4 0V4h4" stroke="#fde047" />
  </svg>
)
const GrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="15" rx="7" ry="4" />
    <path d="M12 3v7M9 6l3-3 3 3M3 9l2 2M21 9l-2 2" />
  </svg>
)
const FreezeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M12 2v20M3.3 7l17.4 10M20.7 7L3.3 17M9 4l3 3 3-3M9 20l3-3 3 3" />
  </svg>
)

export default function AllInHoleGame() {
  const run = useActionRun('allinhole')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const pointer = useRef<number | null>(null)
  const lastEvent = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hard: false, magnets: 0, grows: 0, freezes: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.n, hard: w.lv.hard, magnets: w.magnets, grows: w.grows, freezes: w.freezes })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const top = 112
    const bottom = H - 80
    const S = Math.min(W - 22, (bottom - top) / (L * K + WALL_H * 1.5))
    const ox = (W - S) / 2
    const oy = top + (bottom - top - (L * K + WALL_H) * S) / 2 + WALL_H * S
    return { W, H, S, ox, oy, top, bottom }
  }

  function proj(x: number, y: number, z = 0) {
    const { S, ox, oy } = geo()
    return { x: ox + x * S, y: oy + y * S * K - z * S }
  }

  // ── Level flow ────────────────────────────────
  function loadLevel(n: number) {
    const w = world.current
    w.n = n
    const r0 = 0.054 * (1 + run.level('size') * 0.06)
    w.lv = n <= AUTHORED.length ? authoredLevel(n, AUTHORED[n - 1], r0) : makeLevel(n, Math.floor(Math.random() * 1e9), r0)
    w.r0 = r0
    w.bodies = w.lv.objs.map((o) => ({ ...o, vx: 0, vy: 0, st: 'floor' as const, ft: 0, tilt: 0, big: 0 }))
    w.walls = w.lv.walls.map((wl, i) => ({ ...wl, phase: i * 1.7, vx: 0 }))
    w.total = w.bodies.filter((b) => b.kind !== 'bomb').length
    w.hx = 0.5
    w.hy = L - 0.12
    w.area = 0
    w.R = r0
    w.stun = 0
    w.timeMax = w.lv.time + run.level('time') * 5
    w.time = w.timeMax
    w.clock = 0
    w.streak = 0
    w.streakT = 0
    w.magnetT = 0
    w.growT = 0
    w.freezeT = 0
    w.stats.level = n
    if (phaseRef.current !== 'idle') {
      setBanner({ key: Date.now(), text: w.lv.hard ? `LEVEL ${n} · HARD` : `LEVEL ${n}`, sub: `${w.lv.name ?? BIOMES[w.lv.biome].name} · ${w.lv.tip ?? `swallow all ${w.total}`}` })
      if (w.lv.hard) sfx.boom(0.3)
      else sfx.ready()
      if (n % 5 === 0 && performance.now() - lastEvent.current > 30000) {
        lastEvent.current = performance.now()
        void trackEvent('action_milestone', { game_id: 'allinhole', kind: 'level', value: n })
      }
      run.update(w.stats)
    }
    pushHud()
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    loadLevel(Math.max(1, level))
  }

  function remaining() {
    return world.current.bodies.filter((b) => b.kind !== 'bomb' && b.st !== 'gone').length
  }

  function levelClear() {
    const w = world.current
    const frac = w.time / w.timeMax
    // Stars by time left: 40%+ = 3, 18%+ = 2, else 1.
    const stars = frac >= 0.4 ? 3 : frac >= 0.18 ? 2 : 1
    w.stars = stars
    run.completeLevel(w.n, stars)
    w.starsRun += stars
    w.stats.stars = w.starsRun
    const bonus = Math.round(w.time) * 3 + stars * 50 + (w.lv.hard ? 150 : 0)
    w.score += bonus
    w.stats.score = w.score
    const gain = 2 + stars + (w.lv.hard ? 3 : 0)
    w.coins += gain
    w.clearT = 2.2
    setPhaseBoth('clear')
    const { W, H } = geo()
    for (let i = 0; i < 5; i++) fx.burst(rand(W * 0.15, W * 0.85), rand(H * 0.25, H * 0.45), { count: 18, color: ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#ffffff'], speed: 320, shape: 'square', size: 5, gravity: 380, life: 1.1 })
    fx.flash('#fef9c3', 0.18)
    sfx.win()
    haptic.success()
    setBanner({ key: Date.now(), text: `LEVEL ${w.n} CLEAR!`, sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · +${bonus} · +${gain} coins` })
    if (w.n % 3 === 0) {
      const r = w.n % 9 === 0 ? 'freeze' : w.n % 6 === 0 ? 'grow' : 'magnet'
      if (r === 'magnet') w.magnets += 1
      else if (r === 'grow') w.grows += 1
      else w.freezes += 1
      fx.text(W / 2, H * 0.62, `+1 ${r.toUpperCase()}`, '#fde047', 18)
    }
    run.update(w.stats)
    pushHud()
  }

  // ── Eating ────────────────────────────────────
  function swallow(b: Body) {
    const w = world.current
    const play = phaseRef.current === 'play'
    const p = proj(b.x, b.y)
    if (b.kind === 'bomb') {
      fx.explode(p.x, p.y - 6, 1.3)
      if (!play) return
      w.time = Math.max(0, w.time - 6)
      w.stun = 1.4
      w.streak = 0
      fx.flash('#ef4444', 0.3)
      fx.text(p.x, p.y - 30, '-6s', '#fca5a5', 22)
      fx.stop(0.08)
      sfx.boom(0.9)
      sfx.hurt()
      haptic.error()
      return
    }
    w.area += b.r * b.r
    fx.burst(p.x, p.y, { count: 6, color: ['#ffffff', '#e2e8f0', '#94a3b8'], speed: 90, gravity: -40, size: 2.5, drag: 3 })
    if (!play) return
    w.streak = w.streakT > 0 ? w.streak + 1 : 1
    w.streakT = 0.9
    const pts = Math.round((10 + b.r * 600) * (1 + Math.min(2, w.streak * 0.05)))
    w.score += pts
    w.stats.score = w.score
    w.stats.eaten += 1
    w.stats.streak = Math.max(w.stats.streak, w.streak)
    sfx.score(Math.min(12, w.streak))
    if (b.r > 0.04) {
      sfx.thud()
      fx.shake(3, 0.12)
      haptic.medium()
      fx.text(p.x, p.y - 26, `+${pts}`, '#fde047', 18)
    } else haptic.light()
    if (w.streak > 0 && w.streak % 10 === 0) {
      fx.text(p.x, p.y - 44, `STREAK x${w.streak}`, '#fde047', 20)
      sfx.combo()
    }
    pushHud()
    if (remaining() === 0) window.setTimeout(() => phaseRef.current === 'play' && levelClear(), 350)
  }

  // ── Boosters ──────────────────────────────────
  function boostMagnet() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.magnets <= 0 || w.magnetT > 0) return
    w.magnets -= 1
    w.magnetT = 4
    sfx.power()
    haptic.medium()
    setBanner({ key: Date.now(), text: 'MAGNET!', sub: 'everything nearby slides in' })
    pushHud()
  }

  function boostGrow() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.grows <= 0 || w.growT > 0) return
    w.grows -= 1
    w.growT = 7
    sfx.power()
    haptic.medium()
    setBanner({ key: Date.now(), text: 'MEGA HOLE!', sub: '7 seconds' })
    pushHud()
  }

  function boostFreeze() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.freezes <= 0 || w.freezeT > 0) return
    w.freezes -= 1
    w.freezeT = 10
    fx.flash('#bae6fd', 0.25)
    sfx.power()
    haptic.medium()
    setBanner({ key: Date.now(), text: 'TIME FROZEN', sub: '10 seconds' })
    pushHud()
  }

  // ── Fail / revive ─────────────────────────────
  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.3)
    fx.shake(10, 0.4)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    const { W, H } = geo()
    fx.text(W / 2, H * 0.45, `TIME UP! ${remaining()} left`, '#fecaca', 24)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.coins + w.n * 2 + w.stats.eaten / 25) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.starsRun > 0 && w.n >= 5, stats: { ...w.stats }, coins }, revive)
      pushHud()
    }, 1100)
  }

  /** Revive: +25 s on the clock and a free magnet pull. */
  function revive() {
    const w = world.current
    w.time = Math.max(0, w.time) + 25
    w.timeMax = Math.max(w.timeMax, w.time)
    w.magnetT = 3
    w.stun = 0
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: '+25 seconds · free magnet' })
    setPhaseBoth('play')
    pushHud()
  }

  // ── Input ─────────────────────────────────────
  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play' || pointer.current != null) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointer.current = e.pointerId
    const p = localPoint(e, e.currentTarget)
    world.current.dragX = p.x
    world.current.dragY = p.y
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId) return
    const w = world.current
    const p = localPoint(e, e.currentTarget)
    const { S } = geo()
    const dx = (p.x - w.dragX) / S
    const dy = (p.y - w.dragY) / (S * K)
    w.dragX = p.x
    w.dragY = p.y
    moveHole(dx * 1.15, dy * 1.15)
  }

  function onUp(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current === e.pointerId) pointer.current = null
  }

  useEffect(() => {
    function key(e: KeyboardEvent, down: boolean) {
      const k = world.current.keys
      const v = down ? 1 : 0
      if (e.key === 'ArrowLeft' || e.key === 'a') k.x = -v
      else if (e.key === 'ArrowRight' || e.key === 'd') k.x = v
      else if (e.key === 'ArrowUp' || e.key === 'w') k.y = -v
      else if (e.key === 'ArrowDown' || e.key === 's') k.y = v
      else if (down && e.key === 'm') boostMagnet()
      else if (down && e.key === 'g') boostGrow()
      else if (down && e.key === 'f') boostFreeze()
    }
    const kd = (e: KeyboardEvent) => key(e, true)
    const ku = (e: KeyboardEvent) => key(e, false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])

  /** Moves the hole by a world delta, sliding along walls and the table edge. */
  function moveHole(dx: number, dy: number) {
    const w = world.current
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 0.02))
    const cr = w.R * 0.6
    const slow = w.stun > 0 ? 0.35 : 1
    for (let i = 0; i < steps; i++) {
      w.hx += (dx / steps) * slow
      w.hy += (dy / steps) * slow
      w.hx = clamp(w.hx, cr, 1 - cr)
      w.hy = clamp(w.hy, cr, L - cr)
      for (const wl of w.walls) {
        const o = pushOut(w.hx, w.hy, cr, wl)
        if (o) {
          w.hx += o.nx * o.depth
          w.hy += o.ny * o.depth
        }
      }
    }
  }

  // ── Simulation ────────────────────────────────
  function update(dt: number, raw: number, t: number) {
    const w = world.current
    const ph = phaseRef.current
    const active = ph === 'play' || ph === 'idle' || ph === 'clear'
    // hole size
    const target = Math.min(MAX_R, w.r0 + w.lv.growth * Math.sqrt(w.area)) * (w.growT > 0 ? 1.45 : 1)
    w.R = approach(w.R, target, 5, dt)
    if (w.stun > 0) w.stun -= dt
    if (w.magnetT > 0) w.magnetT -= dt
    if (w.growT > 0) w.growT -= dt
    if (w.streakT > 0) w.streakT -= dt
    if (w.tooBigT > 0) w.tooBigT -= raw
    // keyboard / attract steering
    if (ph === 'play' && (w.keys.x || w.keys.y)) moveHole(w.keys.x * SPEED * dt, w.keys.y * SPEED * dt)
    if (ph === 'idle') {
      let best: Body | null = null
      let bd = Infinity
      for (const b of w.bodies) {
        if (b.st !== 'floor' || b.kind === 'bomb' || b.r >= w.R * FIT) continue
        const d = Math.hypot(b.x - w.hx, b.y - w.hy)
        if (d < bd) {
          bd = d
          best = b
        }
      }
      if (best) {
        const d = Math.max(bd, 1e-4)
        const sp = Math.min(d, 0.45 * dt)
        moveHole(((best.x - w.hx) / d) * sp, ((best.y - w.hy) / d) * sp)
      } else if (!w.bodies.some((b) => b.st === 'fall')) loadLevel(1 + Math.floor(Math.random() * 4))
    }
    // moving platforms
    for (const wl of w.walls) {
      if (!wl.move) continue
      const nx = wl.move.ax + (wl.move.bx - wl.move.ax) * (0.5 + 0.5 * Math.sin(t * wl.move.speed * 3 + wl.phase))
      wl.vx = dt > 0 ? (nx - wl.x) / dt : 0
      wl.x = nx
    }
    // hole must not sit inside a moving platform
    moveHole(0, 0)
    if (!active) return
    const R = w.R
    const live = w.bodies
    for (const b of live) {
      if (b.st === 'fall') {
        b.ft += dt / 0.38
        b.x += (w.hx - b.x) * Math.min(1, dt * 7)
        b.y += (w.hy - b.y) * Math.min(1, dt * 7)
        if (b.ft >= 1) {
          b.st = 'gone'
          swallow(b)
        }
        continue
      }
      if (b.st !== 'floor') continue
      const dx = w.hx - b.x
      const dy = w.hy - b.y
      const d = Math.hypot(dx, dy) || 1e-6
      const fits = b.r < R * FIT
      b.tilt = approach(b.tilt, 0, 8, dt)
      if (fits && d < R - b.r * 0.35) {
        b.st = 'fall'
        b.ft = 0
        continue
      }
      if (d < R + b.r * 0.7) {
        const over = (R + b.r * 0.7 - d) / (b.r * 1.7)
        if (fits) {
          const a = 5 + over * 12
          b.vx += (dx / d) * a * dt
          b.vy += (dy / d) * a * dt
          b.tilt = clamp(over, 0, 1) * Math.sign(dx || 1)
        } else {
          // too big: rests on the rim, wobbling
          b.vx -= (dx / d) * 2.5 * dt
          b.vy -= (dy / d) * 2.5 * dt
          b.tilt = Math.sin(t * 16 + b.id) * 0.12 * clamp(over, 0, 1)
          b.big = 0.4
          if (ph === 'play' && w.tooBigT <= 0) {
            w.tooBigT = 2.5
            const p = proj(b.x, b.y)
            fx.text(p.x, p.y - 30, 'TOO BIG!', '#fecaca', 15)
          }
        }
      }
      if (w.magnetT > 0 && fits && d < 0.4 && b.kind !== 'bomb') {
        b.vx += (dx / d) * 1.6 * dt
        b.vy += (dy / d) * 1.6 * dt
      }
      if (b.big > 0) b.big -= dt
      const f = Math.exp(-3.2 * dt)
      b.vx *= f
      b.vy *= f
      b.x += b.vx * dt
      b.y += b.vy * dt
      // table edges
      if (b.x < b.r) {
        b.x = b.r
        b.vx = Math.abs(b.vx) * 0.4
      } else if (b.x > 1 - b.r) {
        b.x = 1 - b.r
        b.vx = -Math.abs(b.vx) * 0.4
      }
      if (b.y < b.r) {
        b.y = b.r
        b.vy = Math.abs(b.vy) * 0.4
      } else if (b.y > L - b.r) {
        b.y = L - b.r
        b.vy = -Math.abs(b.vy) * 0.4
      }
      for (const wl of w.walls) {
        const o = pushOut(b.x, b.y, b.r, wl)
        if (!o) continue
        b.x += o.nx * o.depth
        b.y += o.ny * o.depth
        const vn = b.vx * o.nx + b.vy * o.ny
        if (vn < 0) {
          b.vx -= vn * o.nx * 1.4
          b.vy -= vn * o.ny * 1.4
        }
        if (wl.move && o.nx !== 0) b.vx += wl.vx * 0.6
      }
    }
    // body-body collisions (cheap pairwise; counts stay small)
    for (let i = 0; i < live.length; i++) {
      const a = live[i]
      if (a.st !== 'floor') continue
      for (let j = i + 1; j < live.length; j++) {
        const b = live[j]
        if (b.st !== 'floor') continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const rr = a.r + b.r
        if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue
        const d = Math.hypot(dx, dy)
        if (d >= rr || d < 1e-6) continue
        const pen = (rr - d) / 2
        const nx = dx / d
        const ny = dy / d
        const ma = a.r * a.r
        const mb = b.r * b.r
        const ka = mb / (ma + mb)
        const kb = ma / (ma + mb)
        a.x -= nx * pen * 2 * ka
        a.y -= ny * pen * 2 * ka
        b.x += nx * pen * 2 * kb
        b.y += ny * pen * 2 * kb
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
        if (rv < 0) {
          a.vx += nx * rv * ka
          a.vy += ny * rv * ka
          b.vx -= nx * rv * kb
          b.vy -= ny * rv * kb
        }
      }
    }
    if (w.bodies.length > 0 && w.bodies.every((b) => b.st === 'gone' || b.kind === 'bomb') && ph === 'idle') w.bodies = []

    if (ph === 'play') {
      w.clock += dt
      if (w.freezeT > 0) w.freezeT = Math.max(0, w.freezeT - dt)
      else if (w.clock > 1) {
        w.time -= dt
        if (w.time <= 10 && w.time > 0 && Math.ceil(w.time) !== w.tickAt) {
          w.tickAt = Math.ceil(w.time)
          sfx.tick()
        }
        if (w.time <= 0) {
          w.time = 0
          die()
        }
      }
    } else if (ph === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0) {
        setPhaseBoth('play')
        loadLevel(w.n + 1)
      }
    }
  }

  // ── Render ────────────────────────────────────
  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    if (ph === 'idle' && !w.bodies.length) loadLevel(1 + Math.floor(Math.random() * 4))
    update(dt, raw, t)
    const g = geo()
    const bio = BIOMES[w.lv.biome]
    const hard = w.lv.hard && ph !== 'idle'

    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, hard ? '#7f1d1d' : bio.bg[0])
    bg.addColorStop(1, hard ? '#450a0a' : bio.bg[1])
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 6; i++) glow(ctx, ((i * 97 + t * 6) % (W + 120)) - 60, 40 + (i % 3) * 30, 60, '#ffffff', 0.12)

    fx.applyShake(ctx)
    // table
    const p00 = proj(0, 0)
    const p11 = proj(1, L)
    const tw = p11.x - p00.x
    const th = p11.y - p00.y
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.roundRect(p00.x + 6, p00.y + 10, tw, th + WALL_H * g.S, 16)
    ctx.fill()
    ctx.fillStyle = bio.edge
    ctx.beginPath()
    ctx.roundRect(p00.x, p00.y + 6, tw, th + WALL_H * g.S, 16)
    ctx.fill()
    const fg = ctx.createLinearGradient(0, p00.y, 0, p11.y)
    fg.addColorStop(0, bio.floor[1])
    fg.addColorStop(1, bio.floor[0])
    ctx.fillStyle = fg
    ctx.beginPath()
    ctx.roundRect(p00.x, p00.y, tw, th, 14)
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = bio.line
    ctx.lineWidth = 2
    if (w.lv.biome === 0) {
      for (let x = 0; x < 1; x += 0.125) {
        ctx.beginPath()
        ctx.moveTo(p00.x + x * tw, p00.y)
        ctx.lineTo(p00.x + x * tw, p11.y)
        ctx.stroke()
      }
    } else if (w.lv.biome === 1) {
      ctx.fillStyle = bio.line
      for (let y = 0; y < L; y += 0.1) if (Math.round(y * 10) % 2 === 0) ctx.fillRect(p00.x, proj(0, y).y, tw, 0.05 * g.S * K)
    } else if (w.lv.biome === 2) {
      for (let x = 0; x <= 1; x += 0.1) {
        ctx.beginPath()
        ctx.moveTo(p00.x + x * tw, p00.y)
        ctx.lineTo(p00.x + x * tw, p11.y)
        ctx.stroke()
      }
      for (let y = 0; y <= L; y += 0.1) {
        ctx.beginPath()
        ctx.moveTo(p00.x, proj(0, y).y)
        ctx.lineTo(p11.x, proj(0, y).y)
        ctx.stroke()
      }
    } else {
      for (let y = 0.05; y < L; y += 0.12) {
        ctx.beginPath()
        for (let x = 0; x <= 1.001; x += 0.05) {
          const q = proj(x, y + Math.sin(x * 12 + y * 5) * 0.012)
          if (x === 0) ctx.moveTo(q.x, q.y)
          else ctx.lineTo(q.x, q.y)
        }
        ctx.stroke()
      }
    }
    ctx.restore()

    // hole
    const hp = proj(w.hx, w.hy)
    const rx = w.R * g.S
    const ry = rx * K
    if (w.magnetT > 0) glow(ctx, hp.x, hp.y, rx * 2.4, '#fde047', 0.35 + Math.sin(t * 12) * 0.1)
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse(hp.x, hp.y + 2, rx * 1.08, ry * 1.12, 0, 0, Math.PI * 2)
    ctx.fill()
    const hg = ctx.createRadialGradient(hp.x, hp.y + ry * 0.35, rx * 0.1, hp.x, hp.y, rx)
    hg.addColorStop(0, '#000000')
    hg.addColorStop(0.75, '#0b1020')
    hg.addColorStop(1, '#1e293b')
    ctx.fillStyle = hg
    ctx.beginPath()
    ctx.ellipse(hp.x, hp.y, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    // inner far wall
    ctx.fillStyle = 'rgba(71,85,105,0.55)'
    ctx.beginPath()
    ctx.ellipse(hp.x, hp.y, rx * 0.98, ry * 0.96, 0, Math.PI, Math.PI * 2)
    ctx.ellipse(hp.x, hp.y + ry * 0.3, rx * 0.9, ry * 0.7, 0, Math.PI * 2, Math.PI, true)
    ctx.fill()
    ctx.strokeStyle = w.stun > 0 ? '#ef4444' : w.growT > 0 ? '#fde047' : 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.ellipse(hp.x, hp.y, rx, ry, 0, 0, Math.PI * 2)
    ctx.stroke()
    // falling bodies, clipped by the hole mouth (far half may peek above the rim)
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(hp.x, hp.y, rx, ry, 0, 0, Math.PI * 2)
    ctx.rect(hp.x - rx, hp.y - rx * 3, rx * 2, rx * 3)
    ctx.clip()
    for (const b of w.bodies) {
      if (b.st !== 'fall') continue
      const p = proj(b.x, b.y)
      const R = b.r * g.S
      const k = clamp(b.ft, 0, 1)
      const sink = k * k * R * 3.2
      const sc = 1 - k * 0.45
      const spr = objSprite(b.kind, R, b.hue)
      const rr = Math.max(3, Math.round(R * 2) / 2)
      ctx.globalAlpha = 1 - k * 0.6
      ctx.save()
      ctx.translate(p.x, p.y + sink)
      ctx.rotate(k * (b.id % 2 ? 1.2 : -1.2))
      ctx.scale(sc, sc)
      ctx.drawImage(spr, -rr * 3, -rr * 4.5, rr * 6, rr * 6)
      ctx.restore()
    }
    ctx.globalAlpha = 1
    ctx.restore()
    // near rim over falling things
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(hp.x, hp.y, rx, ry, 0, 0.1, Math.PI - 0.1)
    ctx.stroke()

    // depth-sorted walls + bodies
    type D = { y: number; draw: () => void }
    const list: D[] = []
    for (const wl of w.walls) {
      list.push({
        y: wl.y + wl.h,
        draw: () => {
          const a = proj(wl.x, wl.y, WALL_H)
          const b = proj(wl.x + wl.w, wl.y + wl.h, WALL_H)
          const fb = proj(wl.x, wl.y + wl.h, 0)
          const cols = wl.move ? ['#a5f3fc', '#22d3ee', '#0e7490'] : bio.wall
          ctx.fillStyle = 'rgba(0,0,0,0.22)'
          ctx.fillRect(a.x + 3, fb.y - 2, b.x - a.x, 6)
          ctx.fillStyle = cols[1]
          ctx.fillRect(a.x, b.y, b.x - a.x, fb.y - b.y)
          ctx.fillStyle = cols[0]
          ctx.fillRect(a.x, a.y, b.x - a.x, b.y - a.y)
          ctx.strokeStyle = cols[2]
          ctx.lineWidth = 1.5
          ctx.strokeRect(a.x, a.y, b.x - a.x, fb.y - a.y)
          if (wl.move) {
            ctx.fillStyle = '#0e7490'
            const cx = (a.x + b.x) / 2
            const cy = (b.y + fb.y) / 2
            ctx.beginPath()
            ctx.moveTo(cx - 10, cy)
            ctx.lineTo(cx - 5, cy - 3)
            ctx.lineTo(cx - 5, cy + 3)
            ctx.moveTo(cx + 10, cy)
            ctx.lineTo(cx + 5, cy - 3)
            ctx.lineTo(cx + 5, cy + 3)
            ctx.fill()
          }
        },
      })
    }
    for (const b of w.bodies) {
      if (b.st !== 'floor') continue
      list.push({
        y: b.y,
        draw: () => {
          const p = proj(b.x, b.y)
          const R = b.r * g.S
          ctx.fillStyle = 'rgba(0,0,0,0.22)'
          ctx.beginPath()
          ctx.ellipse(p.x + R * 0.15, p.y + R * 0.1, R * 0.95, R * 0.45, 0, 0, Math.PI * 2)
          ctx.fill()
          const spr = objSprite(b.kind, R, b.hue)
          const rr = Math.max(3, Math.round(R * 2) / 2)
          const sc = R / rr
          ctx.save()
          ctx.translate(p.x, p.y)
          if (b.tilt) ctx.rotate(b.tilt * 0.45)
          ctx.scale(sc, sc)
          ctx.drawImage(spr, -rr * 3, -rr * 4.5, rr * 6, rr * 6)
          ctx.restore()
          if (b.kind === 'bomb') {
            const sp = 0.7 + Math.sin(t * 22 + b.id) * 0.3
            glow(ctx, p.x + R * 0.6, p.y - R * 2.45, R * 1.2 * sp, '#f97316', 0.8)
          } else if (b.big > 0) {
            ctx.strokeStyle = 'rgba(239,68,68,0.8)'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.ellipse(p.x, p.y, R * 1.1, R * 0.55, 0, 0, Math.PI * 2)
            ctx.stroke()
          }
        },
      })
    }
    list.sort((a, b) => a.y - b.y)
    for (const d of list) d.draw()
    fx.draw(ctx)
    ctx.restore()

    if (ph !== 'idle') {
      // timer + progress
      const bx = 14
      const by = 78
      const bw = W - 28
      const frac = clamp(w.time / w.timeMax, 0, 1)
      ctx.fillStyle = 'rgba(15,23,42,0.55)'
      ctx.beginPath()
      ctx.roundRect(bx, by, bw, 13, 6.5)
      ctx.fill()
      ctx.fillStyle = w.freezeT > 0 ? '#7dd3fc' : w.time < 10 ? (Math.sin(t * 12) > 0 ? '#ef4444' : '#f87171') : frac > 0.4 ? '#4ade80' : frac > 0.18 ? '#facc15' : '#fb923c'
      ctx.beginPath()
      ctx.roundRect(bx, by, Math.max(13, bw * frac), 13, 6.5)
      ctx.fill()
      for (const th2 of [0.18, 0.4]) {
        ctx.fillStyle = frac >= th2 ? '#fde047' : 'rgba(255,255,255,0.45)'
        starPath(ctx, bx + bw * th2, by + 6.5, 6)
        ctx.fill()
      }
      ctx.font = "900 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      const secs = Math.ceil(w.time)
      ctx.fillText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, bx + bw - 6, by + 7)
      const done = w.total ? 1 - remaining() / w.total : 0
      ctx.fillStyle = 'rgba(15,23,42,0.55)'
      ctx.beginPath()
      ctx.roundRect(bx, by + 18, bw, 8, 4)
      ctx.fill()
      ctx.fillStyle = '#e0e7ff'
      ctx.beginPath()
      ctx.roundRect(bx, by + 18, Math.max(8, bw * done), 8, 4)
      ctx.fill()
      ctx.textAlign = 'left'
      ctx.font = "900 10px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.fillStyle = '#0f172a'
      if (done > 0.12) ctx.fillText(`${Math.round(done * 100)}%`, bx + 5, by + 22.5)
      if (w.freezeT > 0) {
        ctx.fillStyle = `rgba(186,230,253,${0.12 + Math.sin(t * 4) * 0.04})`
        ctx.fillRect(0, 0, W, H)
      }
    }
    if (ph === 'clear') {
      const k = 2.2 - w.clearT
      for (let i = 0; i < 3; i++) {
        const appear = k - 0.25 - i * 0.18
        if (appear < 0) continue
        const sc = easeOutBack(clamp(appear / 0.3, 0, 1))
        const x = W / 2 + (i - 1) * 62
        const y = H * 0.3 - (i === 1 ? 14 : 0)
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
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__t2fail = () => {
      if (phaseRef.current === 'play') world.current.time = 0.01
    }
    win.__t2level = (n: number) => {
      if (phaseRef.current === 'play') loadLevel(n)
    }
    win.__allinhole = () => {
      const w = world.current
      if (phaseRef.current !== 'play') return null
      let best: Body | null = null
      let bd = Infinity
      for (const b of w.bodies) {
        if (b.st !== 'floor' || b.kind === 'bomb' || b.r >= w.R * FIT) continue
        const d = Math.hypot(b.x - w.hx, b.y - w.hy)
        if (d < bd) {
          bd = d
          best = b
        }
      }
      if (!best) return null
      const { S, W, H } = geo()
      const dx = ((best.x - w.hx) * S) / 1.15
      const dy = ((best.y - w.hy) * S * K) / 1.15
      const n = 8
      const pts = []
      for (let i = 0; i <= n; i++) pts.push({ x: W / 2 + (dx * i) / n - dx / 2, y: H * 0.6 + (dy * i) / n - dy / 2 })
      return { drag: pts }
    }
    return () => {
      delete win.__t2fail
      delete win.__t2level
      delete win.__allinhole
    }
  }, [])

  const won = hud.level >= 5
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena ah-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="ah-sub">
                  Level {hud.level}
                  {hud.hard ? <span className="ah-hard">HARD</span> : null}
                </div>
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'clear' || phase === 'dying' ? (
            <div className="ah-boosters">
              <button type="button" className="ah-boost" aria-label="Magnet" disabled={hud.magnets <= 0} onPointerDown={stop} onClick={boostMagnet}>
                <MagnetIcon />
                <span className="ah-boost__n">{hud.magnets}</span>
              </button>
              <button type="button" className="ah-boost" aria-label="Mega hole" disabled={hud.grows <= 0} onPointerDown={stop} onClick={boostGrow}>
                <GrowIcon />
                <span className="ah-boost__n">{hud.grows}</span>
              </button>
              <button type="button" className="ah-boost" aria-label="Freeze time" disabled={hud.freezes <= 0} onPointerDown={stop} onClick={boostFreeze}>
                <FreezeIcon />
                <span className="ah-boost__n">{hud.freezes}</span>
              </button>
            </div>
          ) : null}
          {banner && (phase === 'play' || phase === 'clear') ? (
            <div className="action-banner ah-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="allinhole"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to steer the hole. Swallow everything on the table before time runs out — the hole grows as it eats."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Bottomless!' : 'Time up'}
            subtitle={`Score ${hud.score} · reached level ${hud.level}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
