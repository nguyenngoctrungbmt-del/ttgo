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
import '../../shared/action/action.css'
import './goalie.css'

const meta = getGame('goalie')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type ShotKind = 'placed' | 'curl' | 'dip' | 'power' | 'knuckle' | 'fake' | 'double'
type BallState = 'fly' | 'held' | 'deflect' | 'net' | 'out'
type SState = 'walkin' | 'wait' | 'runup' | 'windup' | 'kick' | 'follow'

type Ball = {
  kind: ShotKind
  tu: number
  tv: number
  fu: number
  fv: number
  switchAt: number
  t: number
  T: number
  delay: number
  curve: number
  lift: number
  knuck: number
  kph: number
  x: number
  y: number
  r: number
  spin: number
  state: BallState
  vx: number
  vy: number
  life: number
  sx: number
  sy: number
  trail: number[]
}

type Kit = { name: string; shirt: string; trim: string; shorts: string; socks: string; skin: string; hair: string; num: number; pref: ShotKind[]; legend?: boolean }

const KINDS: ShotKind[] = ['placed', 'curl', 'dip', 'power', 'knuckle', 'fake', 'double']
/** Round at which each shot type joins the striker's repertoire. */
const UNLOCK: Record<ShotKind, number> = { placed: 1, curl: 2, dip: 3, power: 4, knuckle: 6, fake: 7, double: 8 }
const KIND_NAME: Record<ShotKind, string> = {
  placed: 'Placed shot',
  curl: 'Curlers',
  dip: 'Dippers',
  power: 'Power shots',
  knuckle: 'Knuckle balls',
  fake: 'Fake-outs',
  double: 'Double balls',
}

const STRIKERS: Kit[] = [
  { name: 'Rookie Rafa', shirt: '#ef4444', trim: '#ffffff', shorts: '#ffffff', socks: '#ef4444', skin: '#e0ac69', hair: '#1f2937', num: 9, pref: ['placed'] },
  { name: 'Curly Kofi', shirt: '#facc15', trim: '#15803d', shorts: '#15803d', socks: '#facc15', skin: '#8d5524', hair: '#111827', num: 7, pref: ['curl'] },
  { name: 'Lucky Leo', shirt: '#3b82f6', trim: '#fde047', shorts: '#1e3a8a', socks: '#3b82f6', skin: '#f1c27d', hair: '#a16207', num: 10, pref: ['dip', 'curl'] },
  { name: 'Hammer Hans', shirt: '#f8fafc', trim: '#111827', shorts: '#111827', socks: '#f8fafc', skin: '#ffdbac', hair: '#fde68a', num: 11, pref: ['power'] },
  { name: 'Wobbly Wes', shirt: '#22c55e', trim: '#052e16', shorts: '#052e16', socks: '#22c55e', skin: '#ffdbac', hair: '#7c2d12', num: 14, pref: ['knuckle'] },
  { name: 'Sly Santi', shirt: '#a855f7', trim: '#f0abfc', shorts: '#3b0764', socks: '#a855f7', skin: '#c68642', hair: '#3f2a14', num: 8, pref: ['fake'] },
  { name: 'Twin Toni', shirt: '#14b8a6', trim: '#ffffff', shorts: '#0f766e', socks: '#ffffff', skin: '#e0ac69', hair: '#7c2d12', num: 17, pref: ['double'] },
  { name: 'Rocket Ren', shirt: '#f97316', trim: '#111827', shorts: '#111827', socks: '#f97316', skin: '#f1c27d', hair: '#111827', num: 23, pref: ['power', 'dip'] },
]
const LEGENDS: Kit[] = [
  { name: 'El Maestro', shirt: '#fbbf24', trim: '#111827', shorts: '#111827', socks: '#fbbf24', skin: '#c68642', hair: '#111827', num: 10, pref: [], legend: true },
  { name: 'The Phantom', shirt: '#1f2937', trim: '#f43f5e', shorts: '#111827', socks: '#f43f5e', skin: '#ffdbac', hair: '#e5e7eb', num: 99, pref: [], legend: true },
  { name: 'King Kaiser', shirt: '#dc2626', trim: '#fbbf24', shorts: '#fbbf24', socks: '#dc2626', skin: '#f1c27d', hair: '#78350f', num: 1, pref: [], legend: true },
]

type Pal = { sky0: string; sky1: string; stand: string; g0: string; g1: string; lights: boolean; rain: boolean; crowd: string[] }
const PALS: Pal[] = [
  { sky0: '#60a5fa', sky1: '#bfdbfe', stand: '#334155', g0: '#2fae55', g1: '#28a04c', lights: false, rain: false, crowd: ['#ef4444', '#f8fafc', '#facc15', '#3b82f6', '#f97316'] },
  { sky0: '#7c2d12', sky1: '#fb923c', stand: '#3b2f4a', g0: '#24994a', g1: '#1f8c43', lights: false, rain: false, crowd: ['#f43f5e', '#fde68a', '#fb923c', '#a78bfa', '#f8fafc'] },
  { sky0: '#030712', sky1: '#1e293b', stand: '#1f2937', g0: '#1d9145', g1: '#198240', lights: true, rain: false, crowd: ['#22d3ee', '#f8fafc', '#facc15', '#f472b6', '#4ade80'] },
  { sky0: '#020617', sky1: '#111827', stand: '#111827', g0: '#18803d', g1: '#157236', lights: true, rain: true, crowd: ['#94a3b8', '#e2e8f0', '#fde047', '#60a5fa', '#f87171'] },
]

type World = {
  round: number
  savesThis: number
  need: number
  goalsThis: number
  lives: number
  maxLives: number
  streak: number
  score: number
  focus: number
  kit: Kit
  sState: SState
  sT: number
  sPos: number
  lean: number
  balls: Ball[]
  planned: Ball[]
  gu: number
  gv: number
  tu: number
  tv: number
  hipX: number
  ripple: { x: number; y: number; t: number; a: number }
  crowdJump: number
  shotDelay: number
  shots: number
  forceKind: ShotKind | null
  inv: number
  rainT: number
  stats: { saves: number; round: number; catches: number; streak: number; legends: number }
}

function freshWorld(): World {
  return {
    round: 1,
    savesThis: 0,
    need: 5,
    goalsThis: 0,
    lives: 3,
    maxLives: 3,
    streak: 0,
    score: 0,
    focus: 0,
    kit: STRIKERS[0],
    sState: 'walkin',
    sT: 0,
    sPos: 0,
    lean: 0,
    balls: [],
    planned: [],
    gu: 0,
    gv: 0.35,
    tu: 0,
    tv: 0.35,
    hipX: 0,
    ripple: { x: 0, y: 0, t: 9, a: 0 },
    crowdJump: 0,
    shotDelay: 0,
    shots: 0,
    forceKind: null,
    inv: 0,
    rainT: 0,
    stats: { saves: 0, round: 1, catches: 0, streak: 0, legends: 0 },
  }
}

function kitFor(round: number): Kit {
  if (round % 5 === 0) return LEGENDS[(round / 5 - 1) % LEGENDS.length]
  const idx = round - 1 - Math.floor(round / 5)
  return STRIKERS[idx % STRIKERS.length]
}

function palFor(round: number) {
  return round < 5 ? 0 : round < 10 ? 1 : round < 15 ? 2 : 3
}

/** Perspective depth: goal plane is DEPTH times further than the spot. */
const DEPTH = 2.5
function proj(s: number) {
  const z = 1 + (DEPTH - 1) * s
  return { k: (1 - 1 / z) / (1 - 1 / DEPTH), scale: 1 / z }
}

export default function GoalieGame() {
  const run = useActionRun('goalie')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const keys = useRef({ l: false, r: false, u: false, d: false })
  const bgCache = useRef<{ key: string; c: HTMLCanvasElement | null; crowd: HTMLCanvasElement | null }>({ key: '', c: null, crowd: null })
  const lastMilestone = useRef(0)
  const pose = useRef({ hx: 0, hy: 0, shx: 0, shy: 0 })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, round: 1, lives: 3, max: 3, mult: 1, saves: 0, need: 5, name: '', focus: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  /** The attract demo plays silently. */
  function au() {
    return phaseRef.current !== 'idle'
  }

  function mult(w: World) {
    return Math.min(5, 1 + Math.floor(w.streak / 3))
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, round: w.round, lives: w.lives, max: w.maxLives, mult: mult(w), saves: w.savesThis, need: w.need, name: w.kit.name, focus: w.focus })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const halfW = Math.min(W * 0.47, H * 0.42)
    const goalH = halfW * 0.72
    const top = H * 0.23
    const ground = top + goalH
    const sc = goalH / 112
    return { W, H, cx: W / 2, halfW, goalH, top, ground, sc, spotX: W / 2, spotY: H * 0.76 }
  }

  function plane(u: number, v: number) {
    const g = geo()
    return { x: g.cx + u * g.halfW, y: g.ground - v * g.goalH }
  }

  function milestone(kind: string, value: number) {
    const now = performance.now()
    if (now - lastMilestone.current < 30000) return
    lastMilestone.current = now
    void trackEvent('action_milestone', { game_id: 'goalie', kind, value })
  }

  function setupStriker(w: World) {
    w.kit = kitFor(w.round)
    w.need = w.kit.legend ? 8 : w.round < 4 ? 5 : 6
    w.savesThis = 0
    w.goalsThis = 0
    w.sState = 'walkin'
    w.sT = 0
    w.sPos = 0
    w.shotDelay = 0
    const newKind = KINDS.find((k) => UNLOCK[k] === w.round)
    w.forceKind = newKind && newKind !== 'placed' ? newKind : null
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.maxLives = 3 + run.level('iron')
    w.lives = w.maxLives
    w.focus = Math.min(0.99, run.level('eyes') * 0.25)
    setupStriker(w)
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    pushHud()
    setBanner({ key: Date.now(), text: 'ROUND 1', sub: `vs ${w.kit.name}` })
    sfx.ready()
  }

  function unlocked(w: World) {
    return KINDS.filter((k) => UNLOCK[k] <= w.round)
  }

  /** Plan the next shot (or two) — the striker telegraphs it during his wind-up. */
  function planShot(w: World) {
    const pool = unlocked(w)
    let kind: ShotKind
    if (w.forceKind) {
      kind = w.forceKind
      w.forceKind = null
    } else if (w.kit.pref.length && Math.random() < 0.45) {
      const prefs = w.kit.pref.filter((k) => pool.includes(k))
      kind = prefs.length ? prefs[Math.floor(Math.random() * prefs.length)] : pool[Math.floor(Math.random() * pool.length)]
    } else {
      kind = pool[Math.floor(Math.random() * pool.length)]
    }
    const r = w.round
    const maxU = Math.min(0.93, 0.5 + r * 0.075)
    const maxV = Math.min(0.92, 0.5 + r * 0.07)
    const speedK = w.kit.legend ? 0.88 : 1
    const baseT = Math.max(0.6, 1.3 - (r - 1) * 0.06) * speedK
    const missChance = Math.max(0.03, 0.13 - r * 0.012)
    const mk = (delay: number): Ball => {
      let tu = rand(-maxU, maxU)
      let tv = rand(0.08, maxV)
      // Later rounds love the corners.
      if (r >= 4 && Math.random() < 0.35) {
        tu = (Math.random() < 0.5 ? -1 : 1) * rand(maxU * 0.75, maxU)
        tv = Math.random() < 0.5 ? rand(0.08, 0.25) : rand(maxV * 0.75, maxV)
      }
      if (Math.random() < missChance && w.shots > 1) {
        if (Math.random() < 0.5) tu = (tu < 0 ? -1 : 1) * rand(1.06, 1.35)
        else tv = rand(1.1, 1.3)
      }
      const b: Ball = {
        kind,
        tu,
        tv,
        fu: tu,
        fv: tv,
        switchAt: 0,
        t: 0,
        T: baseT,
        delay,
        curve: 0,
        lift: rand(0.05, 0.25),
        knuck: 0,
        kph: rand(0, 6),
        x: 0,
        y: 0,
        r: 0,
        spin: 0,
        state: 'fly',
        vx: 0,
        vy: 0,
        life: 0,
        sx: 0,
        sy: 0,
        trail: [],
      }
      if (kind === 'curl') {
        b.curve = (tu > 0 ? -1 : 1) * rand(0.35, 0.6)
        b.T *= 1.06
      } else if (kind === 'dip') {
        b.lift = rand(0.9, 1.3)
        b.tv = Math.min(b.tv, rand(0.15, 0.55))
        b.fv = b.tv
        b.T *= 1.1
      } else if (kind === 'power') {
        b.T *= 0.64
        b.lift = rand(0, 0.08)
      } else if (kind === 'knuckle') {
        b.knuck = rand(0.18, 0.3)
      } else if (kind === 'fake') {
        b.fu = -tu + rand(-0.15, 0.15)
        b.fv = clamp(tv + rand(-0.2, 0.2), 0.1, 0.9)
        b.switchAt = rand(0.28, 0.4)
      }
      return b
    }
    if (kind === 'double') {
      const a = mk(0)
      const b = mk(0.28)
      b.kind = 'double'
      a.T *= 1.05
      // Keep the pair on opposite halves so both need a dive.
      if (Math.sign(a.tu) === Math.sign(b.tu)) b.tu = -b.tu
      b.fu = b.tu
      w.planned = [a, b]
    } else {
      w.planned = [mk(0)]
    }
    const first = w.planned[0]
    w.lean = clamp(kind === 'fake' ? first.fu : first.tu, -1, 1)
  }

  function kick(w: World) {
    const g = geo()
    for (const b of w.planned) {
      b.sx = g.spotX
      b.sy = g.spotY
      b.x = b.sx
      b.y = b.sy
      b.r = g.goalH * 0.07 * DEPTH
      w.balls.push(b)
    }
    w.planned = []
    w.shots += 1
    const kind = w.balls[0]?.kind
    if (au()) sfx.thud()
    if (kind === 'power') {
      if (au()) sfx.boom(0.3)
      fx.shake(4, 0.15)
    } else if (au()) sfx.whoosh()
    fx.burst(g.spotX, g.spotY + 6, { count: 10, color: ['#86efac', '#4ade80', '#a16207'], speed: 160, angle: -Math.PI / 2, spread: 1.6, size: 3, gravity: 500, shape: 'square' })
    if (kind === 'power') fx.ring(g.spotX, g.spotY, { color: '#fde047', maxR: 50, life: 0.3 })
  }

  function save(w: World, b: Ball, caught: boolean, how: string, diving: boolean) {
    const live = phaseRef.current === 'play'
    w.streak += 1
    w.savesThis += 1
    const m = mult(w)
    let pts = 10 * m
    if (caught) pts += 5
    if (diving) pts += 5
    if (live) {
      w.score += pts
      w.stats.saves += 1
      if (caught) w.stats.catches += 1
      w.stats.streak = Math.max(w.stats.streak, w.streak)
      w.focus = Math.min(1, w.focus + (caught ? 0.24 : 0.17) + (diving ? 0.06 : 0))
    }
    fx.text(b.x, b.y - 26, `${how} +${pts}`, caught ? '#a5f3fc' : '#fef08a', diving ? 20 : 17)
    fx.burst(b.x, b.y, { count: diving ? 22 : 14, color: ['#ffffff', '#fde047', '#e2e8f0'], speed: diving ? 300 : 200, size: 3, shape: 'spark', gravity: 200 })
    fx.ring(b.x, b.y, { color: caught ? '#67e8f9' : '#fde047', maxR: caught ? 36 : 48, life: 0.3 })
    fx.stop(diving ? 0.09 : 0.05)
    fx.shake(diving ? 6 : 3, 0.18)
    if (diving) fx.slowmo(0.35, 0.4)
    if (au()) sfx.thud()
    if (caught && au()) sfx.pop()
    if (au()) sfx.score(w.streak)
    if (w.streak > 0 && w.streak % 3 === 0 && m > 1) {
      fx.text(geo().cx, geo().top + geo().goalH * 0.5, `x${m} STREAK`, '#fb923c', 22)
      if (au()) sfx.combo()
    }
    if (au()) haptic.medium()
    w.crowdJump = 1
    if (caught) {
      b.state = 'held'
      b.life = 0.45
    } else {
      b.state = 'deflect'
      const g = geo()
      const gx = plane(w.gu, w.gv)
      const away = b.x - gx.x
      b.vx = (Math.abs(away) < 4 ? (b.x < g.cx ? -1 : 1) * 260 : Math.sign(away) * rand(240, 380)) + rand(-40, 40)
      b.vy = rand(-320, -160)
      b.life = 0.65
    }
    if (live) run.update(w.stats)
  }

  function concede(w: World, b: Ball) {
    const live = phaseRef.current === 'play'
    b.state = 'net'
    b.life = 0.95
    w.ripple = { x: b.x, y: b.y, t: 0, a: 1 }
    fx.burst(b.x, b.y, { count: 12, color: ['#f8fafc', '#cbd5e1'], speed: 140, size: 2.5, gravity: 120 })
    if (au()) sfx.hit()
    if (!live) return
    if (w.inv > 0) {
      fx.text(b.x, b.y - 30, 'OFF THE LINE!', '#7dd3fc', 18)
      return
    }
    w.lives -= 1
    w.streak = 0
    w.goalsThis += 1
    fx.flash('#ef4444', 0.25)
    fx.shake(9, 0.35)
    fx.stop(0.08)
    fx.text(b.x, b.y - 30, 'GOAL!', '#fca5a5', 24)
    sfx.hurt()
    haptic.error()
    w.crowdJump = 0.6
    pushHud()
    if (w.lives <= 0) die()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.slowmo(1, 0.3)
    sfx.lose()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(4 + w.stats.saves * 0.7 + (w.round - 1) * 3 + w.stats.legends * 10)
      run.end({ score: w.score, cleared: w.round >= 4, stats: { ...w.stats, round: w.round }, coins }, revive)
    }, 1100)
  }

  /** Ad revive: one life back, the shot clears and the next striker waits a beat. */
  function revive() {
    const w = world.current
    w.lives = Math.max(1, w.lives + 1)
    w.balls = []
    w.planned = []
    w.sState = 'wait'
    w.sT = 0
    w.shotDelay = 2
    w.inv = 2
    w.focus = 1
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'focus charged' })
    pushHud()
    setPhaseBoth('play')
  }

  function strikerBeaten(w: World) {
    const g = geo()
    const bonus = w.round * 20 + (w.goalsThis === 0 ? 50 : 0)
    w.score += bonus
    if (w.kit.legend) {
      w.stats.legends += 1
      milestone('legend', w.round)
      fx.explode(g.cx, g.top + g.goalH * 0.5, 2, ['#fde047', '#facc15', '#ffffff', '#fb923c'])
    }
    w.round += 1
    w.stats.round = w.round
    const flawless = w.goalsThis === 0
    setupStriker(w)
    w.shotDelay = 1.6
    sfx.win()
    haptic.success()
    w.crowdJump = 1.4
    const unlock = KINDS.find((k) => UNLOCK[k] === w.round && k !== 'placed')
    const pal = palFor(w.round) !== palFor(w.round - 1)
    setBanner({
      key: Date.now(),
      text: w.kit.legend ? `LEGEND: ${w.kit.name}` : `ROUND ${w.round}`,
      sub: unlock ? `new: ${KIND_NAME[unlock]}` : flawless ? `clean sheet +${bonus}` : pal ? 'the lights come on' : `vs ${w.kit.name}`,
    })
    if (w.round % 5 === 0) milestone('round', w.round)
    run.update(w.stats)
    pushHud()
  }

  function activateFocus() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.focus < 1) return
    w.focus = 0
    fx.slowmo(2.6, 0.35)
    fx.flash('#67e8f9', 0.2)
    sfx.power()
    haptic.medium()
    pushHud()
  }

  function setTargetFromPoint(x: number, y: number) {
    const g = geo()
    const w = world.current
    w.tu = clamp((x - g.cx) / g.halfW, -1.06, 1.06)
    w.tv = clamp((g.ground - y) / g.goalH, 0, 1.08)
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    drag.current = { id: e.pointerId, x: p.x, y: p.y }
    const g = geo()
    // Taps on the goal mouth snap the gloves there; lower down works like a trackpad.
    if (p.y < g.ground + g.goalH * 0.35) setTargetFromPoint(p.x, p.y)
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const p = localPoint(e, e.currentTarget)
    const g = geo()
    const w = world.current
    w.tu = clamp(w.tu + ((p.x - d.x) * 1.3) / g.halfW, -1.06, 1.06)
    w.tv = clamp(w.tv - ((p.y - d.y) * 1.3) / g.goalH, 0, 1.08)
    d.x = p.x
    d.y = p.y
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null
  }

  useEffect(() => {
    function set(e: KeyboardEvent, v: boolean) {
      const k = keys.current
      if (e.key === 'ArrowLeft' || e.key === 'a') k.l = v
      else if (e.key === 'ArrowRight' || e.key === 'd') k.r = v
      else if (e.key === 'ArrowUp' || e.key === 'w') k.u = v
      else if (e.key === 'ArrowDown' || e.key === 's') k.d = v
      else if (e.key === ' ' && v) activateFocus()
      else return
      e.preventDefault()
    }
    const down = (e: KeyboardEvent) => set(e, true)
    const up = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ── Simulation ──────────────────────────────────────────

  function updateBall(w: World, b: Ball, dt: number) {
    const g = geo()
    if (b.state === 'fly') {
      if (b.delay > 0) {
        b.delay -= dt
        b.x = g.spotX
        b.y = g.spotY
        return
      }
      b.t += dt
      const s = Math.min(1, b.t / b.T)
      const { k, scale } = proj(s)
      const knu = b.knuck * Math.sin(s * 13 + b.kph) * s
      const end = plane(b.tu + knu, b.tv + b.knuck * 0.5 * Math.cos(s * 11 + b.kph) * s)
      const arc = 4 * s * (1 - s)
      const curveX = b.curve * g.halfW * arc
      const lift = b.kind === 'dip' ? b.lift * g.goalH * Math.sin(Math.PI * Math.pow(s, 0.75)) : b.lift * g.goalH * arc
      b.x = b.sx + (end.x - b.sx) * k + curveX
      b.y = b.sy + (end.y - b.sy) * k - lift
      b.r = g.goalH * 0.085 * DEPTH * scale
      b.spin += dt * (b.kind === 'knuckle' ? 2 : 18)
      b.trail.push(b.x, b.y)
      if (b.trail.length > 16) b.trail.splice(0, 2)
      if (s >= 1) resolve(w, b, b.tu + knu, b.tv + b.knuck * 0.5 * Math.cos(11 + b.kph))
    } else if (b.state === 'held') {
      const gp = plane(w.gu, w.gv)
      b.x = gp.x
      b.y = gp.y
      b.life -= dt
    } else if (b.state === 'deflect') {
      b.vy += 900 * dt
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.r *= 1 + dt * 0.6
      b.spin += dt * 20
      b.life -= dt
    } else if (b.state === 'net') {
      b.r = approach(b.r, g.goalH * 0.055, 6, dt)
      b.y = Math.min(g.ground - b.r, b.y + 60 * dt * (b.life < 0.8 ? 1 : 0))
      b.life -= dt
    } else if (b.state === 'out') {
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.r *= 1 - dt * 0.5
      b.life -= dt
    }
  }

  function resolve(w: World, b: Ball, u: number, v: number) {
    const g = geo()
    const gp = plane(w.gu, w.gv)
    const reach = g.goalH * 0.26 * (1 + run.level('reach') * 0.12)
    const d = Math.hypot(b.x - gp.x, b.y - gp.y)
    // Body block: distance to the torso segment.
    const p = pose.current
    const sx = p.shx - p.hx
    const sy = p.shy - p.hy
    const len2 = sx * sx + sy * sy || 1
    const tt = clamp(((b.x - p.hx) * sx + (b.y - p.hy) * sy) / len2, 0, 1)
    const bodyD = Math.hypot(b.x - (p.hx + sx * tt), b.y - (p.hy + sy * tt))
    const inGoal = Math.abs(u) < 1 && v < 1 && v > -0.1
    const diving = Math.abs(p.hy - (g.ground - g.goalH * 0.36)) > g.goalH * 0.12 || Math.abs(w.gu - w.hipX) > 0.5
    if (d < reach) {
      const caught = d < reach * 0.45 && b.kind !== 'power'
      save(w, b, caught, caught ? 'CATCH!' : diving ? 'DIVING SAVE!' : 'SAVE!', diving)
    } else if (bodyD < reach * 0.55 && inGoal) {
      save(w, b, false, 'BLOCK!', false)
    } else if (inGoal) {
      concede(w, b)
    } else {
      const post = (Math.abs(Math.abs(u) - 1) < 0.07 && v < 1.06) || (Math.abs(v - 1) < 0.07 && Math.abs(u) < 1.06)
      b.state = 'out'
      b.life = 0.6
      if (post) {
        b.vx = (u < 0 ? -1 : 1) * 300
        b.vy = -200
        fx.text(b.x, b.y - 24, 'POST!', '#e2e8f0', 18)
        fx.burst(b.x, b.y, { count: 12, color: ['#ffffff', '#cbd5e1'], speed: 220, shape: 'spark' })
        if (au()) sfx.clang()
        fx.shake(4, 0.15)
      } else {
        b.vx = (b.x - g.cx) * 0.6
        b.vy = v > 1 ? -160 : 0
        fx.text(b.x, b.y - 24, v > 1 ? 'OVER!' : 'WIDE!', '#cbd5e1', 16)
        if (au()) sfx.miss()
      }
    }
    if (phaseRef.current === 'play') pushHud()
  }

  function updateStriker(w: World, dt: number) {
    const live = phaseRef.current === 'play' || phaseRef.current === 'idle'
    w.sT += dt
    if (w.sState === 'walkin') {
      w.sPos = Math.min(1, w.sT / 1.2)
      if (w.sT > 1.2) {
        w.sState = 'wait'
        w.sT = 0
      }
    } else if (w.sState === 'wait') {
      w.shotDelay -= dt
      if (w.shotDelay <= 0 && w.balls.length === 0 && live) {
        planShot(w)
        w.sState = 'runup'
        w.sT = 0
      }
    } else if (w.sState === 'runup') {
      if (w.sT > 0.5) {
        w.sState = 'windup'
        w.sT = 0
      }
    } else if (w.sState === 'windup') {
      const fake = w.planned[0]?.kind === 'fake'
      const hold = (fake ? 0.75 : 0.38) * (w.kit.legend ? 0.85 : 1)
      if (fake && w.sT > 0.35) w.lean = approach(w.lean, w.planned[0].tu, 10, dt)
      if (w.sT > hold) {
        w.sState = 'kick'
        w.sT = 0
        kick(w)
      }
    } else if (w.sState === 'kick') {
      if (w.sT > 0.35) {
        w.sState = 'follow'
        w.sT = 0
      }
    } else if (w.sState === 'follow') {
      if (w.balls.length === 0) {
        if (w.savesThis >= w.need && phaseRef.current === 'play') {
          strikerBeaten(w)
        } else {
          w.sState = 'wait'
          w.sT = 0
          w.shotDelay = phaseRef.current === 'idle' ? 1.4 : Math.max(0.35, 0.7 - w.round * 0.03)
        }
      }
    }
  }

  // ── Drawing ─────────────────────────────────────────────

  function buildBg(W: number, H: number, pal: Pal) {
    const g = geo()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const c = document.createElement('canvas')
    c.width = Math.round(W * dpr)
    c.height = Math.round(H * dpr)
    const x = c.getContext('2d')!
    x.scale(dpr, dpr)
    const backBottom = g.ground - g.goalH * 0.14
    const boardTop = backBottom - g.goalH * 0.3
    const sky = x.createLinearGradient(0, 0, 0, boardTop)
    sky.addColorStop(0, pal.sky0)
    sky.addColorStop(1, pal.sky1)
    x.fillStyle = sky
    x.fillRect(0, 0, W, boardTop)
    // Grass: far stripes behind the goal, then the box.
    const fieldTop = boardTop + g.goalH * 0.18
    let y = fieldTop
    let i = 0
    while (y < H) {
      const hgt = 8 + (y - fieldTop) * 0.12
      x.fillStyle = i % 2 ? pal.g0 : pal.g1
      x.fillRect(0, y, W, hgt + 1)
      y += hgt
      i++
    }
    const fade = x.createLinearGradient(0, fieldTop, 0, H)
    fade.addColorStop(0, 'rgba(0,0,0,0.18)')
    fade.addColorStop(0.5, 'rgba(0,0,0,0)')
    fade.addColorStop(1, 'rgba(0,0,0,0.25)')
    x.fillStyle = fade
    x.fillRect(0, fieldTop, W, H - fieldTop)
    // Ad boards
    x.fillStyle = '#0f172a'
    x.fillRect(0, boardTop, W, g.goalH * 0.18)
    const boards = ['#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed']
    const bw = W / 5
    for (let k = 0; k < 5; k++) {
      x.fillStyle = boards[k]
      x.fillRect(k * bw + 2, boardTop + 2, bw - 4, g.goalH * 0.18 - 4)
      x.fillStyle = 'rgba(255,255,255,0.85)'
      x.fillRect(k * bw + bw * 0.2, boardTop + g.goalH * 0.07, bw * 0.6, g.goalH * 0.04)
    }
    // Pitch lines in perspective.
    x.strokeStyle = 'rgba(255,255,255,0.85)'
    x.lineWidth = 2.5
    x.beginPath()
    x.moveTo(0, g.ground)
    x.lineTo(W, g.ground)
    const sixY = g.ground + (H - g.ground) * 0.16
    const sixHalf = g.halfW * 1.75
    x.moveTo(g.cx - g.halfW * 1.45, g.ground)
    x.lineTo(g.cx - sixHalf, sixY)
    x.lineTo(g.cx + sixHalf, sixY)
    x.lineTo(g.cx + g.halfW * 1.45, g.ground)
    const boxY = g.ground + (H - g.ground) * 0.82
    x.moveTo(g.cx - g.halfW * 2.4, g.ground)
    x.lineTo(g.cx - g.halfW * 3.4, boxY)
    x.moveTo(g.cx + g.halfW * 2.4, g.ground)
    x.lineTo(g.cx + g.halfW * 3.4, boxY)
    x.stroke()
    x.fillStyle = 'rgba(255,255,255,0.9)'
    x.beginPath()
    x.ellipse(g.spotX, g.spotY + 4, 6, 3, 0, 0, Math.PI * 2)
    x.fill()

    // Crowd stand layer (animated as strips at draw time).
    const cr = document.createElement('canvas')
    cr.width = Math.round(W * dpr)
    cr.height = Math.round(boardTop * dpr)
    const q = cr.getContext('2d')!
    q.scale(dpr, dpr)
    const standTop = boardTop * 0.18
    q.fillStyle = pal.stand
    q.fillRect(0, standTop, W, boardTop - standTop)
    q.fillStyle = 'rgba(255,255,255,0.06)'
    for (let ry = standTop + 10; ry < boardTop; ry += 11) q.fillRect(0, ry, W, 2)
    for (let ry = standTop + 6; ry < boardTop - 2; ry += 11) {
      for (let rx = 4 + ((ry / 11) % 2) * 5; rx < W; rx += 10) {
        const col = pal.crowd[Math.floor(Math.random() * pal.crowd.length)]
        q.fillStyle = col
        q.beginPath()
        q.roundRect(rx - 4, ry, 8, 7, 3)
        q.fill()
        q.fillStyle = ['#f1c27d', '#e0ac69', '#8d5524', '#ffdbac', '#c68642'][Math.floor(Math.random() * 5)]
        q.beginPath()
        q.arc(rx, ry - 1.5, 3, 0, Math.PI * 2)
        q.fill()
      }
    }
    q.fillStyle = 'rgba(0,0,0,0.25)'
    q.fillRect(0, standTop, W, 4)
    // Roof edge
    q.fillStyle = '#0f172a'
    q.fillRect(0, standTop - 6, W, 6)
    return { c, crowd: cr }
  }

  function drawNet(ctx: CanvasRenderingContext2D, w: World) {
    const g = geo()
    const L = g.cx - g.halfW
    const R = g.cx + g.halfW
    const bl = L + g.halfW * 0.08
    const br = R - g.halfW * 0.08
    const bt = g.top + g.goalH * 0.12
    const bb = g.ground - g.goalH * 0.14
    const rp = w.ripple
    const amp = rp.t < 1.4 ? rp.a * Math.exp(-rp.t * 2.4) * g.goalH * 0.09 : 0
    const off = (px: number, py: number) => {
      if (amp < 0.2) return 0
      const d = Math.hypot(px - rp.x, py - rp.y)
      return amp * Math.exp(-d / (g.goalH * 0.5)) * Math.sin(d * 0.12 - rp.t * 18)
    }
    ctx.fillStyle = 'rgba(15,23,42,0.18)'
    ctx.beginPath()
    ctx.moveTo(L, g.top)
    ctx.lineTo(bl, bt)
    ctx.lineTo(br, bt)
    ctx.lineTo(R, g.top)
    ctx.lineTo(R, g.ground)
    ctx.lineTo(br, bb)
    ctx.lineTo(bl, bb)
    ctx.lineTo(L, g.ground)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.42)'
    ctx.lineWidth = 1
    const cols = 16
    const rows = 7
    ctx.beginPath()
    for (let i = 0; i <= cols; i++) {
      const fx0 = bl + ((br - bl) * i) / cols
      for (let j = 0; j <= rows; j++) {
        const py = bt + ((bb - bt) * j) / rows
        const o = off(fx0, py)
        if (j === 0) ctx.moveTo(fx0, py + o)
        else ctx.lineTo(fx0 + o * 0.3, py + o)
      }
    }
    for (let j = 0; j <= rows; j++) {
      const py = bt + ((bb - bt) * j) / rows
      for (let i = 0; i <= cols; i++) {
        const px = bl + ((br - bl) * i) / cols
        const o = off(px, py)
        if (i === 0) ctx.moveTo(px, py + o)
        else ctx.lineTo(px + o * 0.3, py + o)
      }
    }
    // Side panels and roof
    for (let j = 0; j <= 4; j++) {
      const k = j / 4
      ctx.moveTo(L, g.top + (g.ground - g.top) * k)
      ctx.lineTo(bl, bt + (bb - bt) * k)
      ctx.moveTo(R, g.top + (g.ground - g.top) * k)
      ctx.lineTo(br, bt + (bb - bt) * k)
    }
    for (let i = 0; i <= 8; i++) {
      const k = i / 8
      ctx.moveTo(L + (R - L) * k, g.top)
      ctx.lineTo(bl + (br - bl) * k, bt)
    }
    ctx.stroke()
  }

  function drawPosts(ctx: CanvasRenderingContext2D) {
    const g = geo()
    const L = g.cx - g.halfW
    const R = g.cx + g.halfW
    const t = Math.max(4, g.goalH * 0.055)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(L - t / 2 + 3, g.top + 3, t, g.goalH)
    ctx.fillRect(R - t / 2 + 3, g.top + 3, t, g.goalH)
    const post = ctx.createLinearGradient(L - t / 2, 0, L + t / 2, 0)
    post.addColorStop(0, '#cbd5e1')
    post.addColorStop(0.4, '#ffffff')
    post.addColorStop(1, '#94a3b8')
    ctx.fillStyle = post
    ctx.fillRect(L - t / 2, g.top - t / 2, t, g.goalH + t / 2)
    ctx.save()
    ctx.translate(R - L, 0)
    ctx.fillRect(L - t / 2, g.top - t / 2, t, g.goalH + t / 2)
    ctx.restore()
    const bar = ctx.createLinearGradient(0, g.top - t / 2, 0, g.top + t / 2)
    bar.addColorStop(0, '#ffffff')
    bar.addColorStop(1, '#94a3b8')
    ctx.fillStyle = bar
    ctx.fillRect(L - t / 2, g.top - t / 2, R - L + t, t)
  }

  function limb(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, wdt: number, col: string) {
    ctx.strokeStyle = col
    ctx.lineWidth = wdt
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    ctx.lineTo(bx, by)
    ctx.stroke()
  }

  function drawKeeper(ctx: CanvasRenderingContext2D, w: World, dt: number, time: number) {
    const g = geo()
    const s = g.sc
    const legLen = g.goalH * 0.36
    const torso = g.goalH * 0.27
    const arm = g.goalH * 0.3
    const gp = plane(w.gu, w.gv)
    w.hipX = approach(w.hipX, clamp(w.gu, -0.6, 0.6), 7, dt)
    let hx = g.cx + w.hipX * g.halfW
    let hy = g.ground - legLen
    let dx = gp.x - hx
    let dy = gp.y - hy
    let dl = Math.hypot(dx, dy) || 1
    const L = torso + arm * 0.92
    if (dl > L) {
      hx = gp.x - (dx / dl) * L
      hy = gp.y - (dy / dl) * L
      hy = Math.min(hy, g.ground - g.goalH * 0.1)
      dx = gp.x - hx
      dy = gp.y - hy
      dl = Math.hypot(dx, dy) || 1
    }
    const k = clamp(dl / L, 0, 1)
    let ux = (dx / dl) * k
    let uy = -1 + (dy / dl + 1) * k
    const ul = Math.hypot(ux, uy) || 1
    ux /= ul
    uy /= ul
    // Keep the torso from folding downward when the gloves go low.
    if (uy > -0.15) {
      uy = -0.15
      const n = Math.hypot(ux, uy)
      ux /= n
      uy /= n
    }
    const shx = hx + ux * torso
    const shy = hy + uy * torso
    pose.current = { hx, hy, shx, shy }
    const px = -uy
    const py = ux
    const airborne = hy < g.ground - legLen - g.goalH * 0.08

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath()
    ctx.ellipse((hx + gp.x) / 2, g.ground + 2, g.goalH * 0.32, g.goalH * 0.05, 0, 0, Math.PI * 2)
    ctx.fill()

    const jersey = '#a3e635'
    const jerseyDark = '#4d7c0f'
    // Legs
    if (airborne) {
      const bx = -ux
      const by = -uy
      limb(ctx, hx + px * 6 * s, hy + py * 6 * s, hx + bx * legLen + px * 10 * s, hy + by * legLen + py * 10 * s, 11 * s, '#111827')
      limb(ctx, hx - px * 6 * s, hy - py * 6 * s, hx + bx * legLen * 0.8 - px * 14 * s, hy + by * legLen * 0.8 - py * 14 * s + 8 * s, 11 * s, '#111827')
      ctx.fillStyle = '#a3e635'
      ctx.beginPath()
      ctx.arc(hx + bx * legLen + px * 10 * s, hy + by * legLen + py * 10 * s, 6 * s, 0, Math.PI * 2)
      ctx.arc(hx + bx * legLen * 0.8 - px * 14 * s, hy + by * legLen * 0.8 - py * 14 * s + 8 * s, 6 * s, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const bob = Math.sin(time * 6) * 1.5 * s
      for (const side of [-1, 1]) {
        const kx = hx + side * 14 * s
        const ky = hy + legLen * 0.5 + bob
        const fx2 = hx + side * 20 * s
        limb(ctx, hx + side * 6 * s, hy, kx, ky, 11 * s, '#111827')
        limb(ctx, kx, ky, fx2, g.ground - 4 * s, 9 * s, jersey)
        ctx.fillStyle = '#111827'
        ctx.beginPath()
        ctx.ellipse(fx2 + side * 3 * s, g.ground - 3 * s, 7 * s, 4 * s, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // Shorts
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(hx, hy, 11 * s, 0, Math.PI * 2)
    ctx.fill()
    // Torso
    ctx.save()
    ctx.translate((hx + shx) / 2, (hy + shy) / 2)
    ctx.rotate(Math.atan2(uy, ux) + Math.PI / 2)
    const tw = 15 * s
    const tg = ctx.createLinearGradient(-tw, 0, tw, 0)
    tg.addColorStop(0, jerseyDark)
    tg.addColorStop(0.35, jersey)
    tg.addColorStop(1, jerseyDark)
    ctx.fillStyle = tg
    ctx.beginPath()
    ctx.roundRect(-tw, -torso / 2 - 4 * s, tw * 2, torso + 8 * s, 8 * s)
    ctx.fill()
    ctx.fillStyle = '#111827'
    ctx.fillRect(-tw, -2 * s, tw * 2, 4 * s)
    ctx.font = `900 ${Math.round(11 * s)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#111827'
    ctx.fillText('1', 0, -torso * 0.22)
    ctx.restore()
    // Arms + gloves
    const gx2 = gp.x
    const gy2 = gp.y
    const gsep = 9 * s
    for (const side of [-1, 1]) {
      const sx2 = shx + px * side * 13 * s
      const sy2 = shy + py * side * 13 * s
      const hx2 = gx2 + px * side * gsep
      const hy2 = gy2 + py * side * gsep
      const mx = (sx2 + hx2) / 2 + px * side * 6 * s
      const my = (sy2 + hy2) / 2 + py * side * 6 * s
      limb(ctx, sx2, sy2, mx, my, 9 * s, jersey)
      limb(ctx, mx, my, hx2, hy2, 8 * s, jerseyDark)
    }
    // Head
    const headR = 10 * s
    const hdx = shx + ux * headR * 1.25
    const hdy = shy + uy * headR * 1.25
    ctx.fillStyle = '#e0ac69'
    ctx.beginPath()
    ctx.arc(hdx, hdy, headR, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#3f2a14'
    ctx.beginPath()
    ctx.arc(hdx, hdy - headR * 0.25, headR, Math.PI * 1.05, Math.PI * 1.95)
    ctx.fill()
    // Eyes track the nearest ball.
    const ball = w.balls.find((b) => b.state === 'fly')
    const lx = ball ? clamp((ball.x - hdx) / 80, -1, 1) * 1.6 * s : 0
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(hdx - 3.5 * s, hdy + 1 * s, 2.4 * s, 0, Math.PI * 2)
    ctx.arc(hdx + 3.5 * s, hdy + 1 * s, 2.4 * s, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(hdx - 3.5 * s + lx, hdy + 1.3 * s, 1.3 * s, 0, Math.PI * 2)
    ctx.arc(hdx + 3.5 * s + lx, hdy + 1.3 * s, 1.3 * s, 0, Math.PI * 2)
    ctx.fill()
    limb(ctx, hdx - 6 * s, hdy - 2.5 * s, hdx - 1.5 * s, hdy - 1.2 * s, 1.4 * s, '#3f2a14')
    limb(ctx, hdx + 6 * s, hdy - 2.5 * s, hdx + 1.5 * s, hdy - 1.2 * s, 1.4 * s, '#3f2a14')
    // Gloves on top
    for (const side of [-1, 1]) {
      const cx2 = gx2 + px * side * gsep
      const cy2 = gy2 + py * side * gsep
      const gr = 8 * s
      const gg = ctx.createRadialGradient(cx2 - gr * 0.3, cy2 - gr * 0.3, 1, cx2, cy2, gr)
      gg.addColorStop(0, '#ffffff')
      gg.addColorStop(1, '#cbd5e1')
      ctx.fillStyle = gg
      ctx.beginPath()
      ctx.ellipse(cx2, cy2, gr, gr * 1.15, Math.atan2(uy, ux) + Math.PI / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.arc(cx2, cy2 + gr * 0.2, gr * 0.45, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.ellipse(cx2, cy2, gr, gr * 1.15, Math.atan2(uy, ux) + Math.PI / 2, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, spin: number, fire: boolean) {
    if (fire) glow(ctx, x, y, r * 3, '#f97316', 0.55)
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.7, '#e5e7eb')
    g.addColorStop(1, '#9ca3af')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111827'
    for (let i = 0; i < 3; i++) {
      const a = spin + (i * Math.PI * 2) / 3
      const px = x + Math.cos(a) * r * 0.55
      const py = y + Math.sin(a) * r * 0.55 * 0.8
      ctx.beginPath()
      for (let j = 0; j < 5; j++) {
        const aa = (j / 5) * Math.PI * 2 + a
        const qx = px + Math.cos(aa) * r * 0.24
        const qy = py + Math.sin(aa) * r * 0.24
        if (j === 0) ctx.moveTo(qx, qy)
        else ctx.lineTo(qx, qy)
      }
      ctx.fill()
    }
    ctx.beginPath()
    ctx.arc(x, y, r * 0.2, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawStriker(ctx: CanvasRenderingContext2D, w: World, time: number) {
    const g = geo()
    const kit = w.kit
    const s = g.H / 540
    const restX = g.spotX - 58 * s
    const restY = g.spotY + 64 * s
    let x = restX
    let y = restY
    let legSwing = 0
    let runPhase = 0
    let alpha = 1
    if (w.sState === 'walkin') {
      x = restX - (1 - w.sPos) * g.W * 0.6
      runPhase = time * 10
      alpha = w.sPos
    } else if (w.sState === 'runup') {
      const k = clamp(w.sT / 0.5, 0, 1)
      x = restX + (g.spotX - 22 * s - restX) * k
      y = restY + (g.spotY + 28 * s - restY) * k
      runPhase = time * 16
    } else if (w.sState === 'windup' || w.sState === 'kick' || w.sState === 'follow') {
      x = g.spotX - 22 * s
      y = g.spotY + 28 * s
      if (w.sState === 'windup') legSwing = -clamp(w.sT / 0.3, 0, 1)
      else if (w.sState === 'kick') legSwing = clamp(w.sT / 0.1, 0, 1) * 1.2
      else {
        const k = clamp(w.sT / 0.5, 0, 1)
        legSwing = 1.2 * (1 - k)
        x = g.spotX - 22 * s + (restX - (g.spotX - 22 * s)) * clamp((w.sT - 0.5) / 0.8, 0, 1)
        y = g.spotY + 28 * s + (restY - (g.spotY + 28 * s)) * clamp((w.sT - 0.5) / 0.8, 0, 1)
      }
    }
    const sz = (kit.legend ? 1.1 : 1) * s
    const lean = w.sState === 'windup' || w.sState === 'kick' ? w.lean * 0.18 : 0
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(x, y)
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(0, 0, 30 * sz, 8 * sz, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.rotate(lean)
    const hipY = -46 * sz
    const run2 = Math.sin(runPhase)
    // Legs: left plant leg, right kicking leg.
    const leftFootX = -10 * sz + run2 * 6 * sz
    const leftFootY = -2 * sz - Math.max(0, run2) * 8 * sz
    let rightFootX = 12 * sz - run2 * 6 * sz
    let rightFootY = -2 * sz - Math.max(0, -run2) * 8 * sz
    if (legSwing < 0) {
      rightFootX = 16 * sz
      rightFootY = -2 * sz + legSwing * 30 * sz
    } else if (legSwing > 0) {
      rightFootX = 18 * sz + legSwing * 8 * sz
      rightFootY = -6 * sz - legSwing * 26 * sz
    }
    for (const [fx2, fy2] of [
      [leftFootX, leftFootY],
      [rightFootX, rightFootY],
    ]) {
      const side = fx2 < 0 ? -1 : 1
      limb(ctx, side * 7 * sz, hipY + 6 * sz, fx2 * 0.8, (hipY + fy2) / 2, 11 * sz, kit.skin)
      limb(ctx, fx2 * 0.8, (hipY + fy2) / 2, fx2, fy2 - 4 * sz, 10 * sz, kit.socks)
      ctx.fillStyle = '#111827'
      ctx.beginPath()
      ctx.ellipse(fx2, fy2 - 1 * sz, 6 * sz, 4 * sz, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    // Shorts
    ctx.fillStyle = kit.shorts
    ctx.beginPath()
    ctx.roundRect(-15 * sz, hipY - 6 * sz, 30 * sz, 18 * sz, 5 * sz)
    ctx.fill()
    // Shirt (back view)
    const sg = ctx.createLinearGradient(-18 * sz, 0, 18 * sz, 0)
    sg.addColorStop(0, kit.shirt)
    sg.addColorStop(0.5, kit.shirt)
    sg.addColorStop(1, 'rgba(0,0,0,0.25)')
    ctx.fillStyle = kit.shirt
    ctx.beginPath()
    ctx.roundRect(-17 * sz, hipY - 40 * sz, 34 * sz, 38 * sz, 8 * sz)
    ctx.fill()
    ctx.fillStyle = sg
    ctx.fill()
    ctx.fillStyle = kit.trim
    ctx.fillRect(-17 * sz, hipY - 8 * sz, 34 * sz, 3 * sz)
    ctx.font = `900 ${Math.round(18 * sz)}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = kit.trim
    ctx.fillText(String(kit.num), 0, hipY - 22 * sz)
    // Arms swing opposite the legs, flung out on the strike.
    const armOut = w.sState === 'kick' || w.sState === 'windup' ? 1 : 0
    for (const side of [-1, 1]) {
      const sw = run2 * side * 8 * sz
      limb(ctx, side * 15 * sz, hipY - 34 * sz, side * (22 + armOut * 12) * sz, hipY - 14 * sz + sw - armOut * 10 * sz, 8 * sz, kit.shirt)
      ctx.fillStyle = kit.skin
      ctx.beginPath()
      ctx.arc(side * (22 + armOut * 12) * sz, hipY - 12 * sz + sw - armOut * 10 * sz, 4.5 * sz, 0, Math.PI * 2)
      ctx.fill()
    }
    // Head (back of the head)
    ctx.fillStyle = kit.skin
    ctx.fillRect(-5 * sz, hipY - 46 * sz, 10 * sz, 8 * sz)
    ctx.beginPath()
    ctx.arc(0, hipY - 52 * sz, 11 * sz, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = kit.hair
    ctx.beginPath()
    ctx.arc(0, hipY - 54 * sz, 11 * sz, Math.PI * 0.85, Math.PI * 2.15)
    ctx.closePath()
    ctx.fill()
    if (kit.legend) {
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.moveTo(-9 * sz, hipY - 64 * sz)
      ctx.lineTo(-9 * sz, hipY - 72 * sz)
      ctx.lineTo(-4 * sz, hipY - 67 * sz)
      ctx.lineTo(0, hipY - 74 * sz)
      ctx.lineTo(4 * sz, hipY - 67 * sz)
      ctx.lineTo(9 * sz, hipY - 72 * sz)
      ctx.lineTo(9 * sz, hipY - 64 * sz)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }

  function frame({ ctx, w: W, h: H, raw, t: time }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const g = geo()
    const pal = PALS[palFor(w.round)]

    // Controls: keyboard nudges, idle autopilot.
    const k = keys.current
    if (k.l) w.tu = clamp(w.tu - raw * 2.6, -1.06, 1.06)
    if (k.r) w.tu = clamp(w.tu + raw * 2.6, -1.06, 1.06)
    if (k.u) w.tv = clamp(w.tv + raw * 2.2, 0, 1.08)
    if (k.d) w.tv = clamp(w.tv - raw * 2.2, 0, 1.08)
    if (ph === 'idle') {
      const b = w.balls.find((bb) => bb.state === 'fly' && bb.delay <= 0)
      if (b && b.t / b.T > 0.35) {
        w.tu = b.tu + (Math.sin(time * 3) > 0.92 ? 0.6 : 0)
        w.tv = b.tv
      } else if (!b) {
        w.tu = approach(w.tu, 0, 2, raw)
        w.tv = approach(w.tv, 0.35, 2, raw)
      }
    }
    // Gloves chase the target at a finite (but quick) speed.
    const maxStep = 5.2 * dt
    const du = w.tu - w.gu
    const dv = w.tv - w.gv
    const dd = Math.hypot(du, dv * 0.7)
    if (dd > maxStep) {
      w.gu += (du / dd) * maxStep
      w.gv += (dv / dd) * maxStep
    } else {
      w.gu = w.tu
      w.gv = w.tv
    }

    if (ph === 'play' || ph === 'idle' || ph === 'dying') {
      updateStriker(w, dt)
      for (const b of w.balls) updateBall(w, b, dt)
      w.balls = w.balls.filter((b) => b.state === 'fly' || b.life > 0)
    }
    w.inv = Math.max(0, w.inv - dt)
    w.ripple.t += dt
    w.crowdJump = Math.max(0, w.crowdJump - raw * 0.8)

    // ── Draw ──
    const key = `${W}x${H}:${palFor(w.round)}`
    if (bgCache.current.key !== key) {
      const built = buildBg(W, H, pal)
      bgCache.current = { key, c: built.c, crowd: built.crowd }
    }
    fx.applyShake(ctx)
    const bg = bgCache.current
    if (bg.c) ctx.drawImage(bg.c, 0, 0, W, H)
    if (bg.crowd) {
      const ch = bg.crowd.height / Math.min(window.devicePixelRatio || 1, 2)
      const strips = 6
      const sw = W / strips
      const srcW = bg.crowd.width / strips
      for (let i = 0; i < strips; i++) {
        const jump = w.crowdJump > 0 ? Math.max(0, Math.sin(time * 14 + i * 1.3)) * 5 * Math.min(1, w.crowdJump) : Math.sin(time * 1.5 + i) * 0.6
        ctx.drawImage(bg.crowd, i * srcW, 0, srcW, bg.crowd.height, i * sw, -jump, sw + 0.5, ch)
      }
      if (pal.lights) {
        glow(ctx, W * 0.12, ch * 0.12, W * 0.35, '#fef9c3', 0.35)
        glow(ctx, W * 0.88, ch * 0.12, W * 0.35, '#fef9c3', 0.35)
      }
      // Camera flashes from the stands
      if (Math.random() < (w.crowdJump > 0 ? 0.5 : 0.06)) {
        ctx.fillStyle = '#ffffff'
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.arc(rand(0, W), rand(ch * 0.25, ch * 0.95), rand(1, 2.2), 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    drawNet(ctx, w)
    // Balls already behind the line sit in the net, behind the keeper.
    for (const b of w.balls) if (b.state === 'net' || (b.state === 'out' && b.life < 0.45)) drawBall(ctx, b.x, b.y, b.r, b.spin, false)
    drawPosts(ctx)

    // Target ring: the keeper's read of where the ball is heading.
    for (const b of w.balls) {
      if (b.state !== 'fly' || b.delay > 0) continue
      const s = Math.min(1, b.t / b.T)
      const reveal = clamp(0.06 + w.round * 0.035 - run.level('eyes') * 0.05 + (b.kind === 'power' ? 0.1 : 0), 0, 0.6)
      const a = clamp((s - reveal) / 0.12, 0, 1)
      if (a <= 0) continue
      let u = b.tu + b.knuck * Math.sin(s * 13 + b.kph) * s
      let v = b.tv + b.knuck * 0.5 * Math.cos(s * 11 + b.kph) * s
      if (b.kind === 'fake') {
        const m = clamp((s - b.switchAt) / 0.12, 0, 1)
        u = b.fu + (u - b.fu) * m
        v = b.fv + (v - b.fv) * m
      }
      const p = plane(u, v)
      const rr = g.goalH * 0.13 * (1 + (1 - s) * 1.8)
      ctx.globalAlpha = a * 0.85
      ctx.strokeStyle = b.kind === 'power' ? '#f87171' : '#fde047'
      ctx.lineWidth = 2.5
      ctx.setLineDash([5, 4])
      ctx.beginPath()
      ctx.arc(p.x, p.y, rr, time * 3, time * 3 + Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = ctx.strokeStyle
      ctx.fill()
      ctx.globalAlpha = 1
    }

    drawKeeper(ctx, w, raw, time)
    if (w.inv > 0) {
      ctx.globalAlpha = 0.25 + Math.sin(time * 12) * 0.1
      ctx.fillStyle = '#7dd3fc'
      ctx.fillRect(g.cx - g.halfW, g.top, g.halfW * 2, g.goalH)
      ctx.globalAlpha = 1
    }

    // Ball resting on the spot before the kick.
    const onSpot = w.planned.length > 0 || (w.sState === 'wait' && w.balls.length === 0) || w.sState === 'walkin'
    if (onSpot) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(g.spotX, g.spotY + g.goalH * 0.16, g.goalH * 0.17, g.goalH * 0.05, 0, 0, Math.PI * 2)
      ctx.fill()
      drawBall(ctx, g.spotX, g.spotY, g.goalH * 0.07 * DEPTH, 0.4, false)
    }
    drawStriker(ctx, w, time)

    // Flying balls in front of everything.
    for (const b of w.balls) {
      if (b.state === 'net' || (b.state === 'out' && b.life < 0.45)) continue
      if (b.state === 'fly' && b.delay > 0) {
        drawBall(ctx, g.spotX + 14, g.spotY, g.goalH * 0.07 * DEPTH, 0, false)
        continue
      }
      if (b.state === 'fly') {
        const s = Math.min(1, b.t / b.T)
        const { k: kk } = proj(s)
        const shy = g.spotY + g.goalH * 0.16 + (g.ground - g.spotY - g.goalH * 0.16) * kk
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.beginPath()
        ctx.ellipse(b.x, shy, b.r * 1.1, b.r * 0.35, 0, 0, Math.PI * 2)
        ctx.fill()
        // Motion trail
        const tr = b.trail
        if (tr.length >= 4) {
          ctx.strokeStyle = b.kind === 'power' ? 'rgba(251,146,60,0.55)' : 'rgba(255,255,255,0.35)'
          ctx.lineWidth = b.r * 0.9
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(tr[0], tr[1])
          for (let i = 2; i < tr.length; i += 2) ctx.lineTo(tr[i], tr[i + 1])
          ctx.stroke()
        }
      }
      drawBall(ctx, b.x, b.y, b.r, b.spin, b.kind === 'power' && b.state === 'fly')
    }

    // Rain
    if (pal.rain) {
      w.rainT += raw
      ctx.strokeStyle = 'rgba(203,213,225,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < 60; i++) {
        const rx = ((i * 97.3 + w.rainT * 60) % (W + 40)) - 20
        const ry = ((i * 53.7 + w.rainT * 620) % (H + 40)) - 20
        ctx.moveTo(rx, ry)
        ctx.lineTo(rx - 4, ry + 14)
      }
      ctx.stroke()
    }

    fx.draw(ctx)
    ctx.restore()
    if (fx.slowTime > 0 && ph === 'play') {
      ctx.globalAlpha = 0.12
      ctx.fillStyle = '#22d3ee'
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Round {hud.round} · {hud.name}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="goalie-lives">
                  {Array.from({ length: hud.max }, (_, i) => (
                    <i key={i} className={i >= hud.lives ? 'is-lost' : ''} />
                  ))}
                </span>
                {hud.mult > 1 ? <span className="goalie-mult">x{hud.mult}</span> : null}
                <span className="goalie-pips">
                  {Array.from({ length: hud.need }, (_, i) => (
                    <i key={i} className={i < hud.saves ? 'is-on' : ''} />
                  ))}
                </span>
              </div>
            </div>
          )}
          {phase === 'play' && hud.focus >= 1 ? (
            <button
              type="button"
              className="goalie-focus"
              onPointerDown={(e) => {
                e.stopPropagation()
                activateFocus()
              }}
            >
              FOCUS
            </button>
          ) : phase === 'play' ? (
            <div className="goalie-focus-bar">
              <span style={{ width: `${Math.round(hud.focus * 100)}%` }} />
            </div>
          ) : null}
          {banner && phase === 'play' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="goalie"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to move your gloves and stop every shot. Read the striker, watch the target ring, dive!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.round >= 4 ? 'Wall of a keeper!' : 'Beaten!'}
            subtitle={`Score ${hud.score} · Round ${hud.round}`}
            celebrate={hud.round >= 4}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
