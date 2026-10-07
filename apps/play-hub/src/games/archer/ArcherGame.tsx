import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, dist, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { BALLOON_COLORS, drawArcher, drawArrow, drawBalloon, drawBird, drawFriend, drawStar, drawTarget } from './art'
import { ARCHER_LEVELS, type ArcherLevel } from './levels'
import '../../shared/action/action.css'
import './archer.css'

const meta = getGame('archer')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type LState = 'intro' | 'live' | 'clear'
type Goal = { balloons: number; birds: number; targets: number; apples: number }

type Balloon = { x: number; y: number; r: number; vy: number; color: number; golden: boolean; sway: number }
type Bird = { x: number; y: number; vx: number; baseY: number; t: number; falling: number; vy: number }
type Target = { id: number; x: number; y: number; baseY: number; r: number; amp: number; spd: number; t: number; wob: number }
type Friend = { x: number; apple: boolean; appleT: number; hurt: number; cheer: number }
type Gold = { x: number; y: number; t: number; life: number }
type Arrow = {
  x: number
  y: number
  vx: number
  vy: number
  trail: number[]
  hits: number
  flying: boolean
  stuck: 'target' | 'ground' | null
  tid: number
  ox: number
  oy: number
  a: number
  quiver: number
  life: number
  scored: boolean
}

type World = {
  level: number
  lstate: LState
  stateT: number
  goal: Goal
  prog: Goal
  arrowsUsed: number
  quiver: number
  hearts: number
  balloons: Balloon[]
  birds: Bird[]
  targets: Target[]
  friend: Friend | null
  golds: Gold[]
  arrows: Arrow[]
  wind: number
  balloonT: number
  birdT: number
  goldT: number
  cool: number
  streak: number
  lastColor: number
  colorStreak: number
  emptyT: number
  score: number
  id: number
  demoT: number
  spec: ArcherLevel | null
  clearedRun: number
  tip: string
  tipT: number
  stats: { score: number; level: number; balloons: number; bullseyes: number; apples: number; combo: number; stars: number }
}

const SKIES = [
  ['#38bdf8', '#bae6fd', '#ecfeff'],
  ['#0ea5e9', '#fde68a', '#fed7aa'],
  ['#6d28d9', '#f472b6', '#fdba74'],
  ['#0f172a', '#1e3a8a', '#4338ca'],
]
const GRAVITY = 520
/** Dev-only time multiplier for scripted tests. */
let devSpeed = 1

function goalFor(level: number): Goal {
  if (level === 1) return { balloons: 6, birds: 0, targets: 0, apples: 0 }
  if (level === 2) return { balloons: 4, birds: 0, targets: 2, apples: 0 }
  if (level === 3) return { balloons: 5, birds: 2, targets: 0, apples: 0 }
  if (level === 4) return { balloons: 4, birds: 0, targets: 1, apples: 1 }
  if (level % 5 === 0) return { balloons: 12 + level, birds: 0, targets: 0, apples: 0 }
  return {
    balloons: 4 + Math.floor(level / 3),
    birds: Math.random() < 0.6 ? 1 + Math.floor(Math.random() * Math.min(3, 1 + level / 6)) : 0,
    targets: Math.random() < 0.6 ? 1 + Math.floor(Math.random() * 2) : 0,
    apples: level % 4 === 0 || Math.random() < 0.25 ? 1 : 0,
  }
}

function freshWorld(): World {
  return {
    level: 0,
    lstate: 'intro',
    stateT: 0,
    goal: { balloons: 0, birds: 0, targets: 0, apples: 0 },
    prog: { balloons: 0, birds: 0, targets: 0, apples: 0 },
    arrowsUsed: 0,
    quiver: 12,
    hearts: 2,
    balloons: [],
    birds: [],
    targets: [],
    friend: null,
    golds: [],
    arrows: [],
    wind: 0,
    balloonT: 0,
    birdT: 3,
    goldT: 6,
    cool: 0,
    streak: 0,
    lastColor: -1,
    colorStreak: 0,
    emptyT: 0,
    score: 0,
    id: 1,
    demoT: 1,
    spec: null,
    clearedRun: 0,
    tip: '',
    tipT: 0,
    stats: { score: 0, level: 0, balloons: 0, bullseyes: 0, apples: 0, combo: 0, stars: 0 },
  }
}

export default function ArcherGame() {
  const run = useActionRun('archer')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const aim = useRef({ drawing: false, id: -1, sx: 0, sy: 0, a: -0.5, power: 0, kb: false })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, quiver: 12, hearts: 2, wind: 0, goal: freshWorld().goal, prog: freshWorld().prog })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: Math.max(1, w.level), quiver: w.quiver, hearts: w.hearts, wind: w.wind, goal: { ...w.goal }, prog: { ...w.prog } })
  }

  function show(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  const ground = () => size.current.h - 56
  const pivot = () => ({ x: 48, y: ground() - 40 })

  function addScore(n: number) {
    const w = world.current
    w.score += n
    w.stats.score = w.score
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    // nextLevel() increments and sets the quiver; the Big Quiver bonus is added on the first level.
    w.level = Math.max(1, Math.floor(level)) - 1
    w.quiver = -1
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    nextLevel()
  }

  function nextLevel() {
    const w = world.current
    const { w: W, h: H } = size.current
    w.level += 1
    w.stats.level = w.level
    w.lstate = 'intro'
    w.stateT = 0
    const spec = ARCHER_LEVELS[w.level - 1] ?? null
    w.spec = spec
    w.goal = spec ? { ...spec.goal } : goalFor(w.level)
    // Each level brings its own quiver; up to 5 left-over arrows carry over.
    const first = w.quiver < 0
    const carry = first ? run.level('quiver') * 2 : Math.min(5, w.quiver)
    const g0 = w.goal
    const base = spec ? spec.arrows : Math.max(10, Math.ceil((g0.balloons * 0.9 + g0.birds * 1.8 + g0.targets * 1.5 + g0.apples * 2) * 1.4) + 3)
    w.quiver = base + carry
    w.tip = spec?.tip ?? ''
    w.tipT = w.tip ? 4.5 : 0
    w.prog = { balloons: 0, birds: 0, targets: 0, apples: 0 }
    w.arrowsUsed = 0
    w.balloons = []
    w.birds = []
    w.golds = []
    w.arrows = w.arrows.filter((a) => a.flying)
    w.wind = spec ? spec.wind : Math.round(rand(-1, 1) * Math.min(3.2, 0.8 + w.level * 0.18) * 10) / 10
    w.targets = []
    if (spec) {
      for (const [x, y, r, amp, spd] of spec.targets ?? []) w.targets.push({ id: w.id++, x: W * x, y: H * y, baseY: H * y, r, amp, spd, t: rand(0, 6), wob: 0 })
      w.friend = spec.friend ? { x: W * spec.friend, apple: true, appleT: 0, hurt: 0, cheer: 0 } : null
    }
    const nT = spec ? 0 : w.goal.targets > 0 ? Math.min(2, w.goal.targets) : w.level >= 6 && Math.random() < 0.5 ? 1 : 0
    for (let i = 0; i < nT; i++) {
      const moving = w.level >= 4
      const y = moving ? H * rand(0.3, 0.55) : H * rand(0.5, 0.66)
      w.targets.push({ id: w.id++, x: W * (0.62 + i * 0.2) + rand(-10, 10), y, baseY: y, r: Math.max(13, 22 - w.level * 0.4), amp: moving ? rand(30, 60 + Math.min(40, w.level * 3)) : 0, spd: rand(0.8, 1.4 + w.level * 0.04), t: rand(0, 6), wob: 0 })
    }
    if (!spec) w.friend = w.goal.apples > 0 ? { x: W * 0.84, apple: true, appleT: 0, hurt: 0, cheer: 0 } : null
    if (w.friend) for (const t of w.targets) if (Math.abs(t.x - w.friend.x) < 40) t.x = W * 0.6
    w.balloonT = 0.5
    w.birdT = rand(1.5, 3)
    const rush = w.level % 5 === 0
    const parts: string[] = []
    if (w.goal.balloons) parts.push(`${w.goal.balloons} balloons`)
    if (w.goal.targets) parts.push(`${w.goal.targets} targets`)
    if (w.goal.birds) parts.push(`${w.goal.birds} birds`)
    if (w.goal.apples) parts.push('the apple')
    show(`LEVEL ${w.level}`, spec ? (rush ? `boss · ${spec.name}` : spec.name) : rush ? 'balloon rush' : `hit ${parts.join(', ')}`)
    sfx.levelUp()
    pushHud()
    run.update(w.stats)
  }

  function goalDone(w: World) {
    const g = w.goal
    const p = w.prog
    return p.balloons >= g.balloons && p.birds >= g.birds && p.targets >= g.targets && p.apples >= g.apples
  }

  function levelClear() {
    const w = world.current
    w.lstate = 'clear'
    w.stateT = 0
    const g = w.goal
    const par = Math.max(1, Math.ceil(g.balloons * 0.75) + g.birds + g.targets + g.apples)
    const stars = w.arrowsUsed <= par ? 3 : w.arrowsUsed <= Math.ceil(par * 1.6) ? 2 : 1
    const refill = 2 + stars
    w.quiver += refill
    w.stats.stars += stars
    const res = run.completeLevel(w.level, stars)
    w.clearedRun += 1
    if (res.firstClear && w.level % 5 === 0) void trackEvent('action_milestone', { game_id: 'archer', kind: 'level', value: w.level })
    addScore(stars * 100 + w.quiver * 5)
    show(w.level % 5 === 0 ? 'BOSS CLEAR!' : `LEVEL ${w.level} CLEAR`, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${w.arrowsUsed} arrows`)
    sfx.win()
    haptic.success()
    fx.flash('#fde68a', 0.15)
    run.update(w.stats)
    pushHud()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    sfx.lose()
    haptic.error()
    fx.slowmo(0.8, 0.4)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.clearedRun * 3 + w.stats.stars * 1.5 + w.stats.balloons / 10) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.clearedRun >= 1, stats: { ...w.stats }, coins }, revive)
    }, 1000)
  }

  function revive() {
    const w = world.current
    w.quiver += 6
    w.hearts = Math.max(1, w.hearts)
    w.emptyT = 0
    w.arrows = w.arrows.filter((a) => !a.flying)
    show('REVIVED!', '+6 arrows')
    pushHud()
    setPhaseBoth('play')
  }

  function loose() {
    const w = world.current
    const A = aim.current
    if (w.cool > 0 || w.quiver <= 0 || w.lstate === 'clear') return
    if (phaseRef.current !== 'play' && phaseRef.current !== 'idle') return
    const pv = pivot()
    const v = 420 + A.power * 580
    w.arrows.push({
      x: pv.x + Math.cos(A.a) * 22, y: pv.y + Math.sin(A.a) * 22, vx: Math.cos(A.a) * v, vy: Math.sin(A.a) * v, trail: [], hits: 0, flying: true,
      stuck: null, tid: 0, ox: 0, oy: 0, a: A.a, quiver: 0, life: 6, scored: false,
    })
    w.cool = 0.32
    if (phaseRef.current === 'play') {
      w.quiver -= 1
      w.arrowsUsed += 1
      pushHud()
      sfx.whoosh()
      haptic.light()
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    const A = aim.current
    A.drawing = true
    A.id = e.pointerId
    A.sx = p.x
    A.sy = p.y
    A.power = 0
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const A = aim.current
    if (!A.drawing || A.id !== e.pointerId) return
    const p = localPoint(e, e.currentTarget)
    const dx = A.sx - p.x
    const dy = A.sy - p.y
    const len = Math.hypot(dx, dy)
    const prev = A.power
    A.power = clamp((len - 10) / 110, 0, 1)
    if (len > 10) A.a = clamp(Math.atan2(dy, dx), -1.5, 0.75)
    if (Math.floor(A.power * 5) > Math.floor(prev * 5)) sfx.tick()
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const A = aim.current
    if (!A.drawing || A.id !== e.pointerId) return
    A.drawing = false
    if (A.power > 0.08) loose()
    A.power = 0
  }

  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__lv4archer = {
        world,
        pivot,
        shoot(a: number, power: number) {
          aim.current.a = a
          aim.current.power = power
          loose()
          aim.current.power = 0
        },
        speed(v: number) {
          devSpeed = v
        },
      }
    }
    function key(e: KeyboardEvent, down: boolean) {
      const A = aim.current
      if (phaseRef.current !== 'play') return
      if (e.key === 'ArrowUp' && down) A.a = clamp(A.a - 0.05, -1.5, 0.75)
      else if (e.key === 'ArrowDown' && down) A.a = clamp(A.a + 0.05, -1.5, 0.75)
      else if (e.key === ' ') {
        if (down && !A.kb) {
          A.kb = true
          A.drawing = true
          A.id = -2
        } else if (!down) {
          A.kb = false
          A.drawing = false
          if (A.power > 0.08) loose()
          A.power = 0
        }
      } else return
      e.preventDefault()
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

  function popBalloon(b: Balloon, ar: Arrow) {
    const w = world.current
    if (phaseRef.current !== 'play') {
      fx.burst(b.x, b.y, { count: 12, color: [BALLOON_COLORS[b.color], '#ffffff'], speed: 200, size: 3.5, gravity: 300, shape: 'square' })
      b.r = 0
      return
    }
    b.r = 0
    ar.hits += 1
    w.stats.balloons += 1
    w.stats.combo = Math.max(w.stats.combo, ar.hits)
    if (w.lstate === 'live') w.prog.balloons += 1
    if (b.color === w.lastColor) w.colorStreak += 1
    else w.colorStreak = 1
    w.lastColor = b.color
    const pts = (b.golden ? 30 : 10) * ar.hits + (w.colorStreak >= 3 ? w.colorStreak * 5 : 0)
    addScore(pts)
    const col = b.golden ? '#facc15' : BALLOON_COLORS[b.color]
    fx.burst(b.x, b.y, { count: 14, color: [col, '#ffffff'], speed: 220, size: 3.5, gravity: 300, shape: 'square' })
    fx.ring(b.x, b.y, { color: col, maxR: b.r + 30, life: 0.25 })
    fx.text(b.x, b.y - 10, ar.hits >= 2 ? `+${pts} ×${ar.hits}` : `+${pts}`, ar.hits >= 2 ? '#fde047' : '#ffffff', ar.hits >= 2 ? 18 : 14)
    if (w.colorStreak >= 3) fx.text(b.x, b.y - 32, `COLOR ×${w.colorStreak}`, col, 14)
    sfx.pop()
    sfx.score(ar.hits + w.colorStreak)
    haptic.light()
    if (ar.hits === 2 || ar.hits === 4) {
      w.quiver += 1
      fx.text(b.x, b.y - 50, '+1 ARROW', '#86efac', 16)
      sfx.combo()
    }
    if (b.golden) {
      w.quiver += 2
      fx.text(b.x, b.y - 50, '+2 ARROWS', '#fde047', 16)
      sfx.power()
    }
    fx.stop(0.02)
    run.update(w.stats)
    pushHud()
  }

  function hitArrowEnd(ar: Arrow) {
    const w = world.current
    if (ar.scored) return
    ar.scored = true
    if (ar.hits > 0) {
      w.streak += 1
      if (w.streak % 3 === 0 && phaseRef.current === 'play') {
        w.quiver += 1
        fx.text(pivot().x + 40, pivot().y - 40, `STREAK ${w.streak} · +1 ARROW`, '#86efac', 15)
        sfx.combo()
        pushHud()
      }
    } else {
      w.streak = 0
      w.colorStreak = 0
      // Practice level: missed arrows come back.
      if (w.level === 1 && phaseRef.current === 'play') {
        w.quiver += 1
        w.arrowsUsed = Math.max(0, w.arrowsUsed - 1)
        fx.text(pivot().x + 30, pivot().y - 50, 'practice: arrow returned', '#e0f2fe', 12)
        pushHud()
      }
    }
  }

  function frame({ ctx, w: W, h: H, raw: raw0, t }: Frame) {
    const raw = raw0 * devSpeed
    size.current = { w: W, h: H }
    const w = world.current
    const ph = phaseRef.current
    const dt = fx.step(raw)
    const gy = ground()
    const pv = pivot()
    const A = aim.current
    const playing = ph === 'play'
    const live = playing && w.lstate === 'live'

    if (A.kb && A.drawing) A.power = Math.min(1, A.power + raw * 1.4)
    w.cool = Math.max(0, w.cool - dt)
    w.stateT += raw

    // Level flow
    if (playing) {
      if (w.lstate === 'intro' && w.stateT > 1.2) {
        w.lstate = 'live'
        w.stateT = 0
      } else if (w.lstate === 'clear' && w.stateT > 2.4) nextLevel()
      if (live && goalDone(w)) levelClear()
      const flying = w.arrows.some((a) => a.flying)
      if (live && w.quiver <= 0 && !flying) {
        w.emptyT += dt
        if (w.emptyT > 0.7) die()
      } else w.emptyT = 0
    }

    // Idle demo archer
    if (ph === 'idle') {
      w.demoT -= raw
      A.a = -0.55 + Math.sin(t * 0.7) * 0.25
      A.power = Math.min(1, Math.max(0, 1 - w.demoT / 1.2))
      if (w.demoT <= 0) {
        loose()
        w.demoT = 1.6
      }
    }

    // Spawning
    if (playing || ph === 'idle') {
      const rush = w.level % 5 === 0 && w.level > 0
      const sp = playing ? w.spec : null
      w.balloonT -= dt
      const cap = rush ? 16 : 9
      if (w.balloonT <= 0 && w.balloons.length < cap && w.lstate !== 'clear') {
        if (sp) {
          const [every, speed, x0, x1] = sp.bal
          w.balloonT = every * rand(0.85, 1.15)
          const golden = Math.random() < (sp.golden ?? 0.04)
          w.balloons.push({ x: rand(W * x0, Math.min(W - 18, W * x1)), y: H + 30, r: (sp.br ?? Math.max(11, 17 - w.level * 0.2)) * rand(0.92, 1.1), vy: -(speed + rand(0, 18)), color: Math.floor(Math.random() * BALLOON_COLORS.length), golden, sway: rand(0, 6) })
        } else {
          w.balloonT = rush ? 0.28 : Math.max(0.5, 1.15 - w.level * 0.03)
          const golden = Math.random() < (rush ? 0.12 : 0.04)
          w.balloons.push({ x: rand(W * 0.42, W - 22), y: H + 30, r: Math.max(11, 17 - w.level * 0.25) * rand(0.9, 1.15), vy: -(38 + Math.min(70, w.level * 4) + rand(0, 30)), color: Math.floor(Math.random() * BALLOON_COLORS.length), golden, sway: rand(0, 6) })
        }
      }
      const birdCfg = sp ? (sp.birds ?? (w.goal.birds > 0 ? ([2.6, 90] as [number, number]) : null)) : null
      if (playing && (sp ? !!birdCfg : w.goal.birds > 0 || w.level >= 3) && w.lstate !== 'clear') {
        w.birdT -= dt
        if (w.birdT <= 0 && w.birds.filter((b) => !b.falling).length < 3) {
          w.birdT = birdCfg ? birdCfg[0] * rand(0.8, 1.25) : rand(2.5, 5.5)
          const dir = Math.random() < 0.5 ? -1 : 1
          const y = H * rand(0.12, 0.4)
          const v = birdCfg ? birdCfg[1] + rand(0, 25) : 70 + Math.min(90, w.level * 6) + rand(0, 40)
          w.birds.push({ x: dir > 0 ? -20 : W + 20, y, vx: dir * v, baseY: y, t: rand(0, 6), falling: 0, vy: 0 })
        }
      }
      if (playing && (sp ? !!sp.stars : w.level >= 2) && w.lstate === 'live') {
        w.goldT -= dt
        if (w.goldT <= 0) {
          w.goldT = rand(6, 10)
          if (w.golds.length === 0 && Math.random() < 0.45) w.golds.push({ x: rand(W * 0.5, W - 30), y: H * rand(0.12, 0.4), t: 0, life: 6 })
        }
      }
    }

    // Entities
    for (const b of w.balloons) {
      b.y += b.vy * dt
      b.x += (Math.sin(t * 1.3 + b.sway) * 10 + w.wind * 6) * dt
    }
    w.balloons = w.balloons.filter((b) => b.r > 0 && b.y > -60)
    for (const b of w.birds) {
      b.t += dt
      if (b.falling > 0) {
        b.falling += dt
        b.vy += 600 * dt
        b.y += b.vy * dt
        b.x += b.vx * 0.3 * dt
      } else {
        b.x += b.vx * dt
        b.y = b.baseY + Math.sin(b.t * 2.5) * 14
      }
    }
    w.birds = w.birds.filter((b) => b.x > -40 && b.x < W + 40 && b.y < H + 30)
    for (const tg of w.targets) {
      tg.t += dt
      tg.y = tg.baseY + Math.sin(tg.t * tg.spd) * tg.amp
      tg.wob = Math.max(0, tg.wob - raw * 1.6)
    }
    if (w.friend) {
      const f = w.friend
      f.hurt = Math.max(0, f.hurt - raw)
      f.cheer = Math.max(0, f.cheer - raw)
      if (!f.apple) {
        f.appleT -= dt
        if (f.appleT <= 0) f.apple = true
      }
    }
    for (const g of w.golds) {
      g.t += dt
      g.y += Math.sin(g.t * 2) * 12 * dt
      g.x += Math.cos(g.t * 1.3) * 10 * dt
    }
    w.golds = w.golds.filter((g) => g.t < g.life)

    // Arrows
    for (const ar of w.arrows) {
      if (ar.flying) {
        const steps = Math.max(1, Math.ceil((Math.hypot(ar.vx, ar.vy) * dt) / 5))
        const sdt = dt / steps
        for (let s = 0; s < steps && ar.flying; s++) {
          ar.vx += w.wind * 14 * sdt
          ar.vy += GRAVITY * sdt
          ar.x += ar.vx * sdt
          ar.y += ar.vy * sdt
          ar.a = Math.atan2(ar.vy, ar.vx)
          const tx = ar.x + Math.cos(ar.a) * 3
          const ty = ar.y + Math.sin(ar.a) * 3
          for (const b of w.balloons) if (b.r > 0 && dist(tx, ty, b.x, b.y) < b.r + 3) popBalloon(b, ar)
          for (const b of w.birds) {
            if (b.falling > 0 || dist(tx, ty, b.x, b.y) > 13) continue
            b.falling = 0.01
            b.vy = -60
            ar.hits += 1
            if (w.lstate === 'live') w.prog.birds += 1
            addScore(25 * ar.hits)
            fx.burst(b.x, b.y, { count: 12, color: ['#93c5fd', '#ffffff', '#1e40af'], speed: 140, size: 3, gravity: 120, drag: 3, life: 0.9, shape: 'square' })
            fx.text(b.x, b.y - 14, `+${25 * ar.hits}`, '#bfdbfe', 15)
            sfx.hit()
            haptic.medium()
            pushHud()
          }
          for (const g of w.golds) {
            if (dist(tx, ty, g.x, g.y) > 15) continue
            g.t = 99
            ar.hits += 1
            w.quiver += 3
            addScore(50)
            fx.burst(g.x, g.y, { count: 22, color: ['#facc15', '#fef9c3', '#ffffff'], speed: 240, gravity: 0, shape: 'spark' })
            fx.ring(g.x, g.y, { color: '#facc15', maxR: 50, life: 0.4, width: 4 })
            fx.text(g.x, g.y - 18, '+3 ARROWS', '#fde047', 18)
            sfx.power()
            haptic.success()
            pushHud()
          }
          if (w.friend) {
            const f = w.friend
            const fy = gy - 16
            if (f.apple && dist(tx, ty, f.x, fy - 62) < 8) {
              f.apple = false
              f.appleT = 2.5
              f.cheer = 1.4
              ar.hits += 1
              w.stats.apples += 1
              if (w.lstate === 'live') w.prog.apples += 1
              addScore(120)
              fx.burst(f.x, fy - 62, { count: 16, color: ['#dc2626', '#fef3c7', '#16a34a'], speed: 180, gravity: 400, shape: 'square' })
              fx.text(f.x, fy - 84, 'APPLE SHOT! +120', '#fde047', 18)
              fx.stop(0.08)
              fx.slowmo(0.5, 0.3)
              sfx.combo()
              haptic.success()
              run.update(w.stats)
              pushHud()
            } else if (f.hurt <= 0 && Math.abs(tx - f.x) < 9 && ty > fy - 57 && ty < fy) {
              ar.flying = false
              ar.life = 0
              f.hurt = 1.5
              w.hearts -= 1
              fx.flash('#ef4444', 0.3)
              fx.shake(10, 0.3)
              fx.text(f.x, fy - 70, 'OUCH!', '#fca5a5', 22)
              fx.burst(tx, ty, { count: 8, color: ['#fde68a', '#ffffff'], speed: 120, gravity: 0, shape: 'spark' })
              sfx.hurt()
              haptic.heavy()
              hitArrowEnd(ar)
              pushHud()
              if (w.hearts <= 0 && playing) die()
              break
            }
          }
          for (const tg of w.targets) {
            const d = dist(tx, ty, tg.x, tg.y)
            if (d > tg.r) continue
            ar.flying = false
            ar.stuck = 'target'
            ar.tid = tg.id
            ar.ox = ar.x - tg.x
            ar.oy = ar.y - tg.y
            ar.quiver = 0.6
            ar.hits += 1
            tg.wob = 1
            const k = d / tg.r
            const pts = k < 0.2 ? 50 : k < 0.4 ? 30 : k < 0.6 ? 20 : k < 0.8 ? 10 : 5
            addScore(pts)
            if (w.lstate === 'live') w.prog.targets += 1
            if (pts === 50) {
              w.stats.bullseyes += 1
              w.quiver += 1
              fx.text(tg.x, tg.y - tg.r - 26, 'BULLSEYE! +1 ARROW', '#fde047', 17)
              fx.ring(tg.x, tg.y, { color: '#facc15', maxR: tg.r * 2.2, life: 0.4, width: 4 })
              fx.slowmo(0.35, 0.3)
              sfx.levelUp()
              haptic.success()
            } else {
              sfx.thud()
              haptic.medium()
            }
            fx.text(tg.x, tg.y - tg.r - 8, `+${pts}`, '#ffffff', 16)
            fx.burst(ar.x, ar.y, { count: 8, color: ['#d6a46b', '#fef3c7'], speed: 120, gravity: 300, shape: 'square', size: 2.5 })
            fx.shake(3, 0.12)
            fx.stop(0.05)
            hitArrowEnd(ar)
            run.update(w.stats)
            pushHud()
            break
          }
          if (ar.flying && ar.y >= gy && ar.vy > 0) {
            ar.flying = false
            ar.stuck = 'ground'
            ar.y = gy + 2
            ar.quiver = 0.4
            ar.life = 2.5
            fx.burst(ar.x, gy, { count: 6, color: ['#a16207', '#65a30d'], speed: 80, gravity: 300, size: 2.5, angle: -Math.PI / 2, spread: 1.4 })
            if (playing) sfx.thud()
            hitArrowEnd(ar)
          }
        }
        if (ar.flying) {
          ar.trail.push(ar.x, ar.y)
          if (ar.trail.length > 24) ar.trail.splice(0, 2)
          if (ar.x > W + 50 || ar.x < -50 || ar.y > H + 50) {
            ar.flying = false
            ar.life = 0
            hitArrowEnd(ar)
          }
        }
      } else {
        ar.quiver = Math.max(0, ar.quiver - raw)
        if (ar.stuck === 'ground') ar.life -= dt
        if (ar.trail.length) ar.trail.splice(0, 2)
      }
    }
    w.arrows = w.arrows.filter((a) => a.life > 0 && (a.stuck !== 'target' || w.targets.some((tg) => tg.id === a.tid)))
    if (w.arrows.length > 40) w.arrows.splice(0, w.arrows.length - 40)

    // ── Draw ─────────────────────────────────────
    const sky = SKIES[w.spec && playing ? w.spec.sky : Math.floor((Math.max(1, w.level) - 1) / 4) % SKIES.length]
    const bg = ctx.createLinearGradient(0, 0, 0, gy)
    bg.addColorStop(0, sky[0])
    bg.addColorStop(0.6, sky[1])
    bg.addColorStop(1, sky[2])
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    const night = sky[0] === '#0f172a'
    if (night) {
      for (let i = 0; i < 40; i++) {
        ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t + i))
        ctx.fillStyle = '#fff'
        ctx.fillRect((i * 97) % W, (i * 53) % (gy * 0.6), 1.5, 1.5)
      }
      ctx.globalAlpha = 1
      glow(ctx, W * 0.8, H * 0.14, 70, '#e0f2fe', 0.35)
      ctx.fillStyle = '#f1f5f9'
      ctx.beginPath()
      ctx.arc(W * 0.8, H * 0.14, 18, 0, Math.PI * 2)
      ctx.fill()
    } else {
      glow(ctx, W * 0.78, H * 0.16, 110, '#fef9c3', 0.6)
      ctx.fillStyle = '#fffbeb'
      ctx.beginPath()
      ctx.arc(W * 0.78, H * 0.16, 22, 0, Math.PI * 2)
      ctx.fill()
    }
    // Clouds drift with the wind
    for (let i = 0; i < 4; i++) {
      const cx = (((i * 0.31 + 0.1) * W + t * (8 + w.wind * 12) * (0.6 + i * 0.2)) % (W + 160) + W + 160) % (W + 160) - 80
      const cy = H * (0.1 + i * 0.08)
      ctx.fillStyle = night ? 'rgba(148,163,184,0.25)' : 'rgba(255,255,255,0.85)'
      for (const [dx, dy, r] of [[0, 0, 18], [18, -6, 22], [38, 0, 16], [20, 6, 18]]) {
        ctx.beginPath()
        ctx.arc(cx + dx, cy + dy, r * (0.8 + i * 0.1), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // Hills (parallax)
    const hill = (yb: number, amp: number, col: string, freq: number, off: number) => {
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.moveTo(0, gy)
      for (let x = 0; x <= W; x += 12) ctx.lineTo(x, yb - Math.sin(x * freq + off) * amp - Math.sin(x * freq * 2.3 + off) * amp * 0.4)
      ctx.lineTo(W, gy)
      ctx.closePath()
      ctx.fill()
    }
    hill(gy - 90, 26, night ? '#1e293b' : '#86efac', 0.012, 1)
    hill(gy - 40, 18, night ? '#14532d' : '#4ade80', 0.02, 3)
    // Ground
    ctx.fillStyle = night ? '#166534' : '#22c55e'
    ctx.fillRect(0, gy, W, H - gy)
    ctx.fillStyle = night ? '#14532d' : '#16a34a'
    ctx.fillRect(0, gy, W, 5)
    ctx.fillStyle = night ? '#3f2a14' : '#a16207'
    ctx.fillRect(0, gy + 26, W, H - gy - 26)
    for (let x = 6; x < W; x += 22) {
      ctx.fillStyle = (x / 22) % 3 < 1 ? '#fde047' : '#f9a8d4'
      ctx.beginPath()
      ctx.arc(x + ((x * 7) % 9), gy + 12 + ((x * 3) % 8), 2, 0, Math.PI * 2)
      ctx.fill()
    }

    fx.applyShake(ctx)

    // Windsock
    const wx = 100
    ctx.strokeStyle = '#64748b'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(wx, gy)
    ctx.lineTo(wx, gy - 54)
    ctx.stroke()
    const wl = 8 + Math.abs(w.wind) * 7
    const wd = w.wind >= 0 ? 1 : -1
    const droop = 1 - Math.min(1, Math.abs(w.wind) / 2.5)
    ctx.save()
    ctx.translate(wx, gy - 52)
    ctx.rotate(wd > 0 ? droop * 1.2 : Math.PI - droop * 1.2)
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff' : '#ef4444'
      const fl = Math.sin(t * 10 + i) * 1.2
      ctx.fillRect((i * wl) / 4, -4 + fl * 0.3 + i * 0.4, wl / 4 + 0.5, 8 - i * 1.2)
    }
    ctx.restore()

    // Targets with posts
    for (const tg of w.targets) {
      if (tg.amp === 0) {
        ctx.fillStyle = '#78350f'
        ctx.fillRect(tg.x - 3, tg.y, 6, gy - tg.y)
      } else {
        ctx.strokeStyle = 'rgba(120,53,15,0.8)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(tg.x, 0)
        ctx.lineTo(tg.x, tg.y - tg.r)
        ctx.stroke()
      }
      drawTarget(ctx, tg.x, tg.y, tg.r, tg.wob)
    }
    // Stuck arrows on targets
    for (const ar of w.arrows) {
      if (ar.stuck !== 'target') continue
      const tg = w.targets.find((x) => x.id === ar.tid)
      if (!tg) continue
      const q = Math.sin(ar.quiver * 50) * ar.quiver * 0.25
      drawArrow(ctx, tg.x + ar.ox, tg.y + ar.oy, ar.a + q)
    }

    if (w.friend) drawFriend(ctx, w.friend.x, gy, t, w.friend.apple, w.friend.hurt, w.friend.cheer)
    for (const b of w.balloons) drawBalloon(ctx, b.x, b.y, b.r, b.color, t + b.sway, b.golden)
    for (const b of w.birds) drawBird(ctx, b.x, b.y, b.vx > 0 ? 1 : -1, b.t, b.falling)
    for (const g of w.golds) {
      const blink = g.life - g.t < 1.5 && Math.floor(g.t * 8) % 2 === 0
      if (!blink) drawStar(ctx, g.x, g.y, 11, g.t * 2)
    }

    // Arrows
    ctx.lineCap = 'round'
    for (const ar of w.arrows) {
      if (ar.trail.length >= 4) {
        for (let i = 2; i < ar.trail.length; i += 2) {
          ctx.globalAlpha = (i / ar.trail.length) * 0.5
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = (i / ar.trail.length) * 3
          ctx.beginPath()
          ctx.moveTo(ar.trail[i - 2], ar.trail[i - 1])
          ctx.lineTo(ar.trail[i], ar.trail[i + 1])
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
      if (ar.stuck === 'target') continue
      const q = Math.sin(ar.quiver * 50) * ar.quiver * 0.25
      ctx.globalAlpha = ar.stuck === 'ground' ? Math.min(1, ar.life) : 1
      drawArrow(ctx, ar.x, ar.y, ar.a + q)
      ctx.globalAlpha = 1
    }

    // Trajectory preview
    const showAim = (playing && A.drawing && A.power > 0.05) || ph === 'idle'
    if (showAim && w.quiver > 0) {
      const v = 420 + A.power * 580
      let x = pv.x + Math.cos(A.a) * 22
      let y = pv.y + Math.sin(A.a) * 22
      let vx = Math.cos(A.a) * v
      let vy = Math.sin(A.a) * v
      const steps = Math.round(16 * (1 + run.level('sight') * 0.35))
      for (let i = 0; i < steps; i++) {
        for (let k = 0; k < 2; k++) {
          vx += w.wind * 14 / 60
          vy += GRAVITY / 60
          x += vx / 60
          y += vy / 60
        }
        ctx.globalAlpha = (1 - i / steps) * (ph === 'idle' ? 0.35 : 0.9)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(x, y, 2.6 - (i / steps) * 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    if (w.tipT > 0 && playing) {
      w.tipT = Math.max(0, w.tipT - raw)
      ctx.globalAlpha = Math.min(1, w.tipT, (4.5 - w.tipT) * 3)
      ctx.font = "800 13px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const tw = Math.min(W - 24, ctx.measureText(w.tip).width + 28)
      ctx.fillStyle = 'rgba(15,23,42,0.55)'
      ctx.beginPath()
      ctx.roundRect((W - tw) / 2, gy + 12, tw, 28, 14)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(w.tip, W / 2, gy + 26, W - 40)
      ctx.globalAlpha = 1
    }
    drawArcher(ctx, 40, gy, A.a, playing ? (A.drawing ? A.power : 0) : ph === 'idle' ? A.power : 0, t, w.cool <= 0 && (w.quiver > 0 || ph === 'idle'))

    fx.draw(ctx)
    ctx.restore()

    // Draw-power ring near the touch point
    if (playing && A.drawing && A.id !== -2) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(A.sx, A.sy, 22, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = A.power >= 1 ? '#fde047' : '#ffffff'
      ctx.beginPath()
      ctx.arc(A.sx, A.sy, 22, -Math.PI / 2, -Math.PI / 2 + A.power * Math.PI * 2)
      ctx.stroke()
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const chip = (label: string, have: number, need: number) =>
    need > 0 ? (
      <span key={label} className={`ar-goal${have >= need ? ' is-done' : ''}`}>
        {label} {Math.min(have, need)}/{need}
      </span>
    ) : null

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score.toLocaleString()}</div>
                <div className="action-hud__small">
                  Level {hud.level} · {hud.wind === 0 ? 'No wind' : `Wind ${hud.wind > 0 ? '→' : '←'} ${Math.abs(hud.wind).toFixed(1)}`}
                </div>
              </div>
              <div className="action-hud__right">
                <span className={`ar-arrows${hud.quiver <= 3 ? ' is-low' : ''}`}>
                  <svg viewBox="0 0 44 20" aria-hidden>
                    <path d="M2 10 H36" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" />
                    <path d="M44 10 L34 4 L36 10 L34 16 Z" fill="#e2e8f0" />
                    <path d="M8 10 L2 4 M8 10 L2 16" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  {hud.quiver}
                </span>
                <span className="ar-hearts" aria-label="Hearts">
                  {Array.from({ length: 2 }, (_, i) => (
                    <svg key={i} viewBox="0 0 24 24" aria-hidden>
                      <path d="M12 21 C4 14 2 10 2 7 C2 4 4.5 2 7 2 C9 2 11 3.5 12 5 C13 3.5 15 2 17 2 C19.5 2 22 4 22 7 C22 10 20 14 12 21 Z" fill={i < hud.hearts ? '#ef4444' : 'rgba(255,255,255,0.3)'} />
                    </svg>
                  ))}
                </span>
              </div>
            </div>
          )}
          {phase === 'play' && (
            <div className="ar-goals">
              {chip('Balloons', hud.prog.balloons, hud.goal.balloons)}
              {chip('Targets', hud.prog.targets, hud.goal.targets)}
              {chip('Birds', hud.prog.birds, hud.goal.birds)}
              {chip('Apple', hud.prog.apples, hud.goal.apples)}
            </div>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="archer"
              icon={meta.icon}
              title={meta.title}
              hint="Drag back anywhere to draw the bow, release to loose. Pop balloons, hit targets — never hit your friend!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={world.current.clearedRun >= 4 ? 'Master archer!' : 'Out of arrows'}
            subtitle={`Score ${hud.score.toLocaleString()} · Level ${hud.level}`}
            celebrate={world.current.clearedRun >= 1}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
