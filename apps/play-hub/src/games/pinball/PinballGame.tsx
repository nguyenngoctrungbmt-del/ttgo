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
import '../../shared/action/action.css'
import {
  BALL_R,
  BUMPERS,
  FLIPPERS,
  FLIP_R0,
  FLIP_R1,
  GATE,
  LANES,
  LANE_Y,
  LOOP_SENSOR_Y,
  NEONS,
  PLUNGER_X,
  PLUNGER_Y,
  SAUCER,
  SLINGS,
  SPINNER,
  TARGETS,
  TARGET_HALF,
  TH,
  TW,
  WALLS,
  paintTable,
  type Seg,
} from './table'

const meta = getGame('pinball')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Ball = { x: number; y: number; vx: number; vy: number; held: number; inLane: boolean; trail: Array<[number, number]>; auto: number }
type Flip = { a: number; w: number; held: boolean }

const GRAV = 1250
const SUB = 8
const MAX_V = 2500

const TABLE_MISSIONS = [
  { key: 'bumpers', label: 'Hit the bumpers', n: 12 },
  { key: 'spins', label: 'Spin the spinner', n: 24 },
  { key: 'loops', label: 'Shoot the left loop', n: 2 },
  { key: 'bank', label: 'Drop all 3 targets', n: 1 },
  { key: 'lanes', label: 'Light all top lanes', n: 1 },
  { key: 'saucer', label: 'Sink the saucer', n: 2 },
]

type Game = {
  balls: Ball[]
  ballsLeft: number
  ballNo: number
  flips: Flip[]
  pull: number
  pulling: boolean
  pullHold: number
  saverT: number
  score: number
  mult: number
  lanes: boolean[]
  targets: boolean[]
  targetsReset: number
  lockLit: boolean
  bumperFlash: number[]
  bumperCd: number[]
  slingFlash: number[]
  spin: number
  spinV: number
  spinAcc: number
  loopArm: number
  combo: number
  comboT: number
  mIdx: number
  mProg: number
  missionsDone: number
  round: number
  wizardT: number
  neon: number
  multiball: boolean
  lastMilestone: number
  aiHold: number[]
  aiCd: number[]
  saverReady: boolean
  saverBonus: number
  stats: { bumpers: number; loops: number; multiball: number; tableMissions: number; wizard: number }
}

function freshGame(): Game {
  return {
    balls: [],
    ballsLeft: 2,
    ballNo: 1,
    flips: [
      { a: FLIPPERS[0].rest, w: 0, held: false },
      { a: FLIPPERS[1].rest, w: 0, held: false },
    ],
    pull: 0,
    pulling: false,
    pullHold: 0,
    saverT: 0,
    score: 0,
    mult: 1,
    lanes: [false, false, false],
    targets: [false, false, false],
    targetsReset: 0,
    lockLit: false,
    bumperFlash: [0, 0, 0],
    bumperCd: [0, 0, 0],
    slingFlash: [0, 0],
    spin: 0,
    spinV: 0,
    spinAcc: 0,
    loopArm: 0,
    combo: 0,
    comboT: 0,
    mIdx: 0,
    mProg: 0,
    missionsDone: 0,
    round: 0,
    wizardT: 0,
    neon: 0,
    multiball: false,
    lastMilestone: 0,
    aiHold: [0, 0],
    aiCd: [0, 0],
    saverReady: true,
    saverBonus: 0,
    stats: { bumpers: 0, loops: 0, multiball: 0, tableMissions: 0, wizard: 0 },
  }
}

function laneBall(): Ball {
  return { x: PLUNGER_X, y: PLUNGER_Y - BALL_R - 0.5, vx: 0, vy: 0, held: 0, inLane: true, trail: [], auto: 0 }
}

let tableCache: { key: string; c: HTMLCanvasElement } | null = null

export default function PinballGame() {
  const run = useActionRun('pinball')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const G = useRef<Game>(freshGame())
  const phaseRef = useRef<Phase>('idle')
  const view = useRef({ s: 1, ox: 0, oy: 0, W: 360, H: 600 })
  const pointers = useRef(new Map<number, 'L' | 'R' | 'P'>())
  const plungeStart = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, ball: 1, balls: 3, mult: 1, mission: '', prog: '', wizard: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function missionTarget(g: Game) {
    const m = TABLE_MISSIONS[g.mIdx % TABLE_MISSIONS.length]
    return Math.ceil(m.n * (1 + g.round * 0.5))
  }

  function pushHud() {
    const g = G.current
    const m = TABLE_MISSIONS[g.mIdx % TABLE_MISSIONS.length]
    setHud({
      score: g.score,
      ball: g.ballNo,
      balls: g.ballNo + g.ballsLeft,
      mult: g.mult,
      mission: g.wizardT > 0 ? 'WIZARD MODE · double score' : m.label,
      prog: g.wizardT > 0 ? `${Math.ceil(g.wizardT)}s` : `${Math.min(g.mProg, missionTarget(g))}/${missionTarget(g)}`,
      wizard: g.wizardT > 0,
    })
  }

  const S = (x: number) => view.current.ox + x * view.current.s
  const SY = (y: number) => view.current.oy + y * view.current.s

  function milestone(kind: string, value: number) {
    const g = G.current
    const now = performance.now()
    if (now - g.lastMilestone < 30000) return
    g.lastMilestone = now
    void trackEvent('action_milestone', { game_id: 'pinball', kind, value })
  }

  // ── Scoring + events ───────────────────────────────────

  function award(base: number, x: number, y: number, label?: string, color = '#ffffff') {
    const g = G.current
    if (phaseRef.current !== 'play') return
    const pts = Math.round(base * g.mult * (g.wizardT > 0 ? 2 : 1))
    g.score += pts
    if (base >= 300 || label) fx.text(S(x), SY(y) - 14, label ? `${label} +${pts}` : `+${pts}`, color, label ? 17 : 13)
  }

  function majorShot(x: number, y: number) {
    const g = G.current
    g.combo = g.comboT > 0 ? g.combo + 1 : 1
    g.comboT = 3
    if (g.combo >= 2 && phaseRef.current === 'play') {
      fx.text(S(x), SY(y) - 40, `COMBO x${g.combo}`, '#fde047', 20)
      award(1000 * g.combo, x, y)
      sfx.combo()
    }
  }

  function event(key: string, amount = 1) {
    const g = G.current
    if (phaseRef.current !== 'play' || g.wizardT > 0) return
    const m = TABLE_MISSIONS[g.mIdx % TABLE_MISSIONS.length]
    if (m.key !== key) return
    g.mProg += amount
    if (g.mProg >= missionTarget(g)) completeMission()
    pushHud()
  }

  function completeMission() {
    const g = G.current
    g.missionsDone += 1
    g.stats.tableMissions += 1
    const bonus = 5000 * g.missionsDone
    g.score += bonus * g.mult
    g.mIdx += 1
    g.mProg = 0
    g.neon = g.missionsDone % NEONS.length
    sfx.mission()
    haptic.success()
    fx.flash('#ffffff', 0.15)
    if (g.missionsDone % TABLE_MISSIONS.length === 0) {
      g.round += 1
      g.wizardT = 30
      g.stats.wizard += 1
      setBanner({ key: Date.now(), text: 'WIZARD MODE!', sub: 'double score · multiball' })
      startMultiball(2)
      milestone('wizard', g.round)
    } else {
      setBanner({ key: Date.now(), text: 'MISSION COMPLETE', sub: `+${bonus * g.mult}` })
    }
    run.update({ ...g.stats })
  }

  function startMultiball(extra: number) {
    const g = G.current
    for (let i = 0; i < extra; i++) {
      const b = laneBall()
      b.auto = 0.4 + i * 0.6
      b.y -= i * (BALL_R * 2 + 2)
      g.balls.push(b)
    }
    g.multiball = true
    g.saverT = Math.max(g.saverT, 10)
    if (phaseRef.current === 'play') {
      g.stats.multiball += 1
      sfx.win()
      haptic.heavy()
      fx.shake(6, 0.3)
      run.update({ ...g.stats })
    }
  }

  // ── Run lifecycle ──────────────────────────────────────

  function start() {
    void unlockAudio()
    const g = freshGame()
    g.ballsLeft = 2 + run.level('balls')
    g.mult = 1 + run.level('mult')
    g.balls = [laneBall()]
    G.current = g
    pointers.current.clear()
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'BALL 1', sub: 'pull down to launch' })
    sfx.ready()
    pushHud()
  }

  function die() {
    if (phaseRef.current !== 'play') return
    const g = G.current
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.25)
    fx.slowmo(0.6, 0.4)
    sfx.lose()
    haptic.error()
    setBanner({ key: Date.now(), text: 'GAME OVER' })
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(g.score / 4000 + g.stats.tableMissions * 3 + g.stats.multiball * 4)
      run.end({ score: g.score, cleared: g.score >= 50000, stats: { ...g.stats }, coins: Math.min(80, coins) }, revive)
    }, 1100)
  }

  function revive() {
    const g = G.current
    g.balls = [laneBall()]
    g.saverT = 0
    g.saverReady = true
    g.saverBonus = 10
    g.ballNo += 1
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'extra ball · 15s saver' })
    fx.ring(S(PLUNGER_X), SY(PLUNGER_Y), { color: '#fde047', maxR: 60, life: 0.6 })
    pushHud()
    setPhaseBoth('play')
  }

  function drain(b: Ball) {
    const g = G.current
    g.balls = g.balls.filter((o) => o !== b)
    fx.burst(S(b.x), SY(TH - 10), { count: 14, color: ['#ef4444', '#fca5a5', '#ffffff'], speed: 200, angle: -Math.PI / 2, spread: 1.4 })
    if (phaseRef.current === 'idle') {
      if (!g.balls.length) g.balls.push(laneBall())
      return
    }
    if (g.saverT > 0) {
      const nb = laneBall()
      nb.auto = g.balls.length ? 0.6 : 0
      g.balls.push(nb)
      setBanner({ key: Date.now(), text: 'BALL SAVED!' })
      if (!g.multiball) g.saverT = 0
      sfx.power()
      haptic.medium()
      return
    }
    if (g.balls.length) {
      if (g.balls.filter((o) => !o.inLane).length <= 1) g.multiball = false
      sfx.miss()
      return
    }
    g.multiball = false
    fx.shake(8, 0.3)
    if (g.ballsLeft > 0) {
      g.ballsLeft -= 1
      g.ballNo += 1
      g.balls.push(laneBall())
      g.saverReady = true
      setBanner({ key: Date.now(), text: `BALL ${g.ballNo}`, sub: g.ballsLeft === 0 ? 'last ball!' : undefined })
      sfx.miss()
      haptic.error()
      pushHud()
    } else die()
  }

  // ── Input ──────────────────────────────────────────────

  function plungerMode() {
    const g = G.current
    return g.balls.length > 0 && g.balls.every((b) => b.inLane) && phaseRef.current === 'play'
  }

  function setFlip(i: number, on: boolean) {
    const g = G.current
    const f = g.flips[i]
    if (f.held === on) return
    f.held = on
    if (on) {
      if (phaseRef.current === 'play') {
        sfx.flip()
        haptic.light()
      }
      // Lane change: rotate lit lanes with the flippers.
      const l = g.lanes
      g.lanes = i === 0 ? [l[1], l[2], l[0]] : [l[2], l[0], l[1]]
    }
  }

  function syncFlips() {
    const vals = [...pointers.current.values()]
    setFlip(0, vals.includes('L') || keys.current.L)
    setFlip(1, vals.includes('R') || keys.current.R)
  }

  function launch() {
    const g = G.current
    const power = Math.max(0.35, g.pull)
    for (const b of g.balls) {
      if (b.inLane && b.y > PLUNGER_Y - 60) {
        b.inLane = false
        b.vy = -(1350 + power * 1100)
        b.vx = 0
      }
    }
    g.pull = 0
    g.pulling = false
    if (g.saverReady) {
      g.saverReady = false
      g.saverT = Math.max(g.saverT, 5 + run.level('saver') * 3 + g.saverBonus)
      g.saverBonus = 0
    }
    if (phaseRef.current === 'play') {
      sfx.whoosh()
      haptic.medium()
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    e.currentTarget.setPointerCapture(e.pointerId)
    const g = G.current
    if (plungerMode()) {
      pointers.current.set(e.pointerId, 'P')
      g.pulling = true
      g.pullHold = 0
      plungeStart.current = p.y
      sfx.tap()
      return
    }
    pointers.current.set(e.pointerId, p.x < view.current.W / 2 ? 'L' : 'R')
    syncFlips()
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (pointers.current.get(e.pointerId) !== 'P') return
    const p = localPoint(e, e.currentTarget)
    const g = G.current
    const before = Math.floor(g.pull * 8)
    g.pull = clamp(Math.max((p.y - plungeStart.current) / 140, g.pullHold * 0.9), 0, 1)
    if (Math.floor(g.pull * 8) !== before) sfx.tick()
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const kind = pointers.current.get(e.pointerId)
    pointers.current.delete(e.pointerId)
    if (kind === 'P') {
      if (G.current.pulling && plungerMode()) launch()
      G.current.pulling = false
    } else syncFlips()
  }

  const keys = useRef({ L: false, R: false })
  useEffect(() => {
    function handle(e: KeyboardEvent, down: boolean) {
      if (phaseRef.current !== 'play') return
      const k = e.key.toLowerCase()
      const g = G.current
      if (k === 'arrowleft' || k === 'z' || k === 'shift') keys.current.L = down
      else if (k === 'arrowright' || k === '/' || k === 'm') keys.current.R = down
      else if (k === ' ' || k === 'arrowdown') {
        if (down && plungerMode() && !g.pulling) {
          g.pulling = true
          g.pullHold = 0
        } else if (!down && g.pulling) launch()
      } else return
      e.preventDefault()
      syncFlips()
    }
    const d = (e: KeyboardEvent) => handle(e, true)
    const u = (e: KeyboardEvent) => handle(e, false)
    window.addEventListener('keydown', d)
    window.addEventListener('keyup', u)
    return () => {
      window.removeEventListener('keydown', d)
      window.removeEventListener('keyup', u)
    }
  }, [])

  // ── Physics ────────────────────────────────────────────

  function collideSeg(b: Ball, s: Seg, e: number): number {
    const dx = s.bx - s.ax
    const dy = s.by - s.ay
    const l2 = dx * dx + dy * dy
    const t = clamp(((b.x - s.ax) * dx + (b.y - s.ay) * dy) / l2, 0, 1)
    const px = s.ax + dx * t
    const py = s.ay + dy * t
    let nx = b.x - px
    let ny = b.y - py
    const d = Math.hypot(nx, ny)
    const min = BALL_R + s.r
    if (d >= min || d < 1e-6) return -1
    nx /= d
    ny /= d
    b.x = px + nx * min
    b.y = py + ny * min
    const vn = b.vx * nx + b.vy * ny
    if (vn < 0) {
      b.vx -= (1 + e) * vn * nx
      b.vy -= (1 + e) * vn * ny
      // a touch of rolling friction along the wall
      b.vx *= 0.998
      b.vy *= 0.998
      return -vn
    }
    return 0
  }

  function collideFlipper(b: Ball, i: number) {
    const g = G.current
    const def = FLIPPERS[i]
    const f = g.flips[i]
    const tx = def.px + Math.cos(f.a) * def.len
    const ty = def.py + Math.sin(f.a) * def.len
    const dx = tx - def.px
    const dy = ty - def.py
    const t = clamp(((b.x - def.px) * dx + (b.y - def.py) * dy) / (def.len * def.len), 0, 1)
    const cx = def.px + dx * t
    const cy = def.py + dy * t
    const r = FLIP_R0 + (FLIP_R1 - FLIP_R0) * t
    let nx = b.x - cx
    let ny = b.y - cy
    const d = Math.hypot(nx, ny)
    if (d >= BALL_R + r || d < 1e-6) return
    nx /= d
    ny /= d
    b.x = cx + nx * (BALL_R + r)
    b.y = cy + ny * (BALL_R + r)
    const svx = -f.w * (cy - def.py)
    const svy = f.w * (cx - def.px)
    const rvx = b.vx - svx
    const rvy = b.vy - svy
    const vn = rvx * nx + rvy * ny
    if (vn < 0) {
      b.vx -= 1.3 * vn * nx
      b.vy -= 1.3 * vn * ny
      if (Math.abs(f.w) > 1 && -vn > 500 && phaseRef.current === 'play') haptic.light()
    }
  }

  function stepFlippers(h: number) {
    const g = G.current
    g.flips.forEach((f, i) => {
      const def = FLIPPERS[i]
      const target = f.held ? def.up : def.rest
      const diff = target - f.a
      if (Math.abs(diff) < 1e-4) {
        f.w = 0
        return
      }
      const speed = f.held ? 30 : 15
      const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * h)
      f.w = step / h
      f.a += step
    })
  }

  function physicsStep(h: number) {
    const g = G.current
    stepFlippers(h)
    const play = phaseRef.current === 'play'
    for (const b of g.balls.slice()) {
      if (b.held > 0) continue
      if (b.inLane) {
        // Resting on the plunger
        const top = PLUNGER_Y + g.pull * 34
        b.x = PLUNGER_X
        b.y = top - BALL_R - 0.5
        b.vx = 0
        b.vy = 0
        continue
      }
      const oy = b.y
      b.vy += GRAV * h
      const sp = Math.hypot(b.vx, b.vy)
      if (sp > MAX_V) {
        b.vx *= MAX_V / sp
        b.vy *= MAX_V / sp
      }
      b.x += b.vx * h
      b.y += b.vy * h

      for (const s of WALLS) collideSeg(b, s, 0.35)
      // One-way gate above the plunger lane: blocks only from above.
      const gdx = GATE.bx - GATE.ax
      const gdy = GATE.by - GATE.ay
      const side = (b.x - GATE.ax) * -gdy + (b.y - GATE.ay) * gdx
      if (side > 0 && b.vy > -200) collideSeg(b, GATE, 0.2)
      // Plunger floor
      if (b.x > 352 && b.y + BALL_R > PLUNGER_Y) {
        b.y = PLUNGER_Y - BALL_R
        if (b.vy > 0) b.vy = -b.vy * 0.15
        if (Math.abs(b.vy) < 60 && Math.abs(b.vx) < 60) {
          b.inLane = true
          b.auto = g.balls.some((o) => o !== b && !o.inLane) ? 0.7 : 0
        }
      }
      // Bumpers
      BUMPERS.forEach((bp, i) => {
        const dx = b.x - bp.x
        const dy = b.y - bp.y
        const d = Math.hypot(dx, dy)
        if (d >= bp.r + BALL_R || d < 1e-6) return
        const nx = dx / d
        const ny = dy / d
        b.x = bp.x + nx * (bp.r + BALL_R)
        b.y = bp.y + ny * (bp.r + BALL_R)
        const vn = b.vx * nx + b.vy * ny
        if (vn < 0) {
          b.vx -= 2 * vn * nx
          b.vy -= 2 * vn * ny
        }
        const out = b.vx * nx + b.vy * ny
        if (out < 760) {
          b.vx += nx * (760 - out)
          b.vy += ny * (760 - out)
        }
        if (g.bumperCd[i] <= 0) {
          g.bumperCd[i] = 0.08
          g.bumperFlash[i] = 1
          fx.ring(S(bp.x), SY(bp.y), { color: NEONS[g.neon].accent, maxR: bp.r * view.current.s * 2.2, life: 0.25 })
          fx.burst(S(b.x), SY(b.y), { count: 6, color: ['#ffffff', NEONS[g.neon].accent], speed: 180, shape: 'spark', size: 2 })
          if (play) {
            g.stats.bumpers += 1
            award(100, bp.x, bp.y)
            sfx.hit()
            haptic.light()
            fx.shake(2, 0.08)
            event('bumpers')
          }
        }
      })
      // Slingshots
      SLINGS.forEach((sl, i) => {
        const kick: Seg = { ax: sl.c[0], ay: sl.c[1], bx: sl.a[0], by: sl.a[1], r: 3 }
        const hit = collideSeg(b, kick, 0.3)
        if (hit > 140) {
          b.vx += sl.nx * 620
          b.vy += sl.ny * 620
          g.slingFlash[i] = 1
          if (play) {
            award(30, (sl.a[0] + sl.c[0]) / 2, (sl.a[1] + sl.c[1]) / 2)
            sfx.thud()
            haptic.light()
          }
        }
        collideSeg(b, { ax: sl.a[0], ay: sl.a[1], bx: sl.b[0], by: sl.b[1], r: 3 }, 0.3)
        collideSeg(b, { ax: sl.b[0], ay: sl.b[1], bx: sl.c[0], by: sl.c[1], r: 3 }, 0.3)
      })
      // Drop targets
      TARGETS.forEach((t, i) => {
        if (g.targets[i]) return
        const hit = collideSeg(b, { ax: t.x, ay: t.y - TARGET_HALF, bx: t.x, by: t.y + TARGET_HALF, r: 3 }, 0.25)
        if (hit > 80) {
          g.targets[i] = true
          fx.burst(S(t.x), SY(t.y), { count: 10, color: [NEONS[g.neon].accent, '#ffffff'], speed: 160, shape: 'spark' })
          if (play) {
            award(400, t.x - 20, t.y)
            sfx.thud()
            haptic.medium()
          }
          if (g.targets.every(Boolean)) {
            g.targetsReset = 1.4
            g.lockLit = true
            if (play) {
              award(3000, 300, 330, 'BANK', '#fde047')
              setBanner({ key: Date.now(), text: 'LOCK IS LIT', sub: 'sink the saucer for multiball' })
              sfx.combo()
              majorShot(300, 330)
              event('bank')
            }
          }
        }
      })
      for (let i = 0; i < 2; i++) collideFlipper(b, i)
      // Saucer
      if (Math.hypot(b.x - SAUCER.x, b.y - SAUCER.y) < 8 && Math.hypot(b.vx, b.vy) < 1300) {
        b.held = 1.1
        b.x = SAUCER.x
        b.y = SAUCER.y
        b.vx = 0
        b.vy = 0
        fx.ring(S(SAUCER.x), SY(SAUCER.y), { color: '#fde047', maxR: 40, life: 0.4 })
        if (play) {
          if (g.multiball) {
            award(20000, SAUCER.x, SAUCER.y, 'JACKPOT', '#fde047')
            fx.flash('#fde68a', 0.2)
            sfx.win()
          } else award(1500, SAUCER.x, SAUCER.y, 'SAUCER', '#f9a8d4')
          sfx.power()
          haptic.medium()
          majorShot(SAUCER.x, SAUCER.y)
          event('saucer')
          if (g.lockLit && !g.multiball) {
            g.lockLit = false
            setBanner({ key: Date.now(), text: 'MULTIBALL!' })
            startMultiball(2)
            milestone('multiball', g.stats.multiball)
          }
        }
      }
      // Sensors: lanes, spinner, loop
      if ((oy - LANE_Y) * (b.y - LANE_Y) <= 0 && oy !== b.y) {
        LANES.forEach((ln, i) => {
          if (b.x > ln.x0 && b.x < ln.x1 && !g.lanes[i]) {
            g.lanes[i] = true
            if (play) {
              award(500, (ln.x0 + ln.x1) / 2, LANE_Y)
              sfx.ready()
            }
            if (g.lanes.every(Boolean)) {
              g.lanes = [false, false, false]
              if (play) {
                g.mult = Math.min(8, g.mult + 1)
                award(2000, 182, LANE_Y + 30, `x${g.mult}`, '#fde047')
                sfx.levelUp()
                majorShot(182, LANE_Y + 30)
                event('lanes')
                pushHud()
              }
            }
          }
        })
      }
      if ((oy - SPINNER.y) * (b.y - SPINNER.y) <= 0 && b.x > SPINNER.x0 && b.x < SPINNER.x1 && oy !== b.y) {
        g.spinV += Math.min(60, Math.abs(b.vy) * 0.03)
      }
      if (oy > LOOP_SENSOR_Y && b.y <= LOOP_SENSOR_Y && b.x < 50) g.loopArm = 2.5
      if (g.loopArm > 0 && b.x > 320 && b.y < 175 && b.vx > 0) {
        g.loopArm = 0
        if (play) {
          g.stats.loops += 1
          award(2500, 300, 160, 'LOOP', '#67e8f9')
          sfx.whoosh()
          sfx.score(4)
          majorShot(300, 160)
          event('loops')
          run.update({ ...g.stats })
        }
      }
      // Ball vs ball
      for (const o of g.balls) {
        if (o === b || o.inLane || o.held > 0) continue
        const dx = o.x - b.x
        const dy = o.y - b.y
        const d = Math.hypot(dx, dy)
        if (d > 0 && d < BALL_R * 2) {
          const nx = dx / d
          const ny = dy / d
          const push = (BALL_R * 2 - d) / 2
          b.x -= nx * push
          b.y -= ny * push
          o.x += nx * push
          o.y += ny * push
          const rel = (o.vx - b.vx) * nx + (o.vy - b.vy) * ny
          if (rel < 0) {
            b.vx += rel * nx
            b.vy += rel * ny
            o.vx -= rel * nx
            o.vy -= rel * ny
          }
        }
      }
      if (b.y > TH + 30 || b.x < -30 || b.x > TW + 30) drain(b)
    }
  }

  function update(dt: number, raw: number) {
    const g = G.current
    const ph = phaseRef.current
    if (ph === 'over') return
    // Timers
    g.saverT = Math.max(0, g.saverT - dt)
    g.comboT = Math.max(0, g.comboT - dt)
    g.loopArm = Math.max(0, g.loopArm - dt)
    for (let i = 0; i < 3; i++) {
      g.bumperFlash[i] = Math.max(0, g.bumperFlash[i] - raw * 5)
      g.bumperCd[i] -= dt
    }
    for (let i = 0; i < 2; i++) g.slingFlash[i] = Math.max(0, g.slingFlash[i] - raw * 6)
    if (g.targetsReset > 0) {
      g.targetsReset -= dt
      if (g.targetsReset <= 0) g.targets = [false, false, false]
    }
    if (g.wizardT > 0) {
      const before = Math.ceil(g.wizardT)
      g.wizardT -= dt
      if (Math.ceil(g.wizardT) !== before) pushHud()
      if (g.wizardT <= 0) {
        g.wizardT = 0
        setBanner({ key: Date.now(), text: 'WIZARD MODE OVER' })
        pushHud()
      }
    }
    // Spinner
    if (g.spinV > 0) {
      g.spin += g.spinV * dt
      g.spinAcc += g.spinV * dt
      g.spinV = Math.max(0, g.spinV - dt * (6 + g.spinV * 0.8))
      while (g.spinAcc > Math.PI) {
        g.spinAcc -= Math.PI
        if (ph === 'play') {
          award(25, SPINNER.x0 + 19, SPINNER.y)
          sfx.tick()
          event('spins')
        }
      }
    }
    // Plunger hold
    if (g.pulling) {
      g.pullHold += raw
      g.pull = clamp(Math.max(g.pull, g.pullHold * 0.9), 0, 1)
    }
    // Saucer eject + auto-launch in multiball
    for (const b of g.balls) {
      if (b.held > 0) {
        b.held -= dt
        if (b.held <= 0) {
          b.vx = rand(-380, 380)
          b.vy = -rand(850, 1050)
          b.y -= 10
          if (ph === 'play') sfx.whoosh()
        }
      }
      if (b.inLane && b.auto > 0) {
        b.auto -= dt
        if (b.auto <= 0) {
          b.inLane = false
          b.vy = -(1500 + Math.random() * 600)
          if (ph === 'play') sfx.whoosh()
        }
      }
    }
    // Idle attract: robot flippers + auto-plunge
    if (ph === 'idle') {
      if (!g.balls.length) g.balls.push(laneBall())
      for (const b of g.balls) {
        if (b.inLane && b.auto <= 0) b.auto = 0.8
      }
      const near = (i: number) => g.balls.some((b) => b.y > 560 && b.y < 650 && b.vy > -50 && (i === 0 ? b.x < 182 && b.x > 90 : b.x >= 182 && b.x < 275))
      for (let i = 0; i < 2; i++) {
        g.aiHold[i] -= dt
        g.aiCd[i] -= dt
        if (g.aiHold[i] <= 0) g.flips[i].held = false
        if (near(i) && g.aiCd[i] <= 0) {
          g.flips[i].held = true
          g.aiHold[i] = 0.18
          g.aiCd[i] = 0.5
        }
      }
    }
    const h = dt / SUB
    if (h > 0) for (let i = 0; i < SUB; i++) physicsStep(h)
    for (const b of g.balls) {
      b.trail.push([b.x, b.y])
      if (b.trail.length > 7) b.trail.shift()
    }
  }

  const lastScore = useRef(0)
  function pushHudScore() {
    const g = G.current
    if (g.score !== lastScore.current) {
      lastScore.current = g.score
      pushHud()
    }
  }

  // ── Render ─────────────────────────────────────────────

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    const s = Math.min(W / TW, H / TH)
    view.current = { s, ox: (W - TW * s) / 2, oy: (H - TH * s) / 2, W, H }
    const g = G.current
    const ph = phaseRef.current
    if (ph === 'idle' && !g.balls.length) g.balls.push(laneBall())
    const dt = fx.step(raw)
    update(dt, raw)
    if (ph === 'play' && Math.random() < 0.1) pushHudScore()
    const n = NEONS[g.neon]

    ctx.fillStyle = '#05010d'
    ctx.fillRect(0, 0, W, H)
    fx.applyShake(ctx)

    // Static table
    const dpr = ctx.getTransform().a || 1
    const key = `${W}x${H}:${g.neon}:${dpr}`
    if (!tableCache || tableCache.key !== key) {
      const c = document.createElement('canvas')
      c.width = Math.round(W * dpr)
      c.height = Math.round(H * dpr)
      const tg = c.getContext('2d')!
      tg.setTransform(dpr * s, 0, 0, dpr * s, dpr * view.current.ox, dpr * view.current.oy)
      paintTable(tg, n)
      tableCache = { key, c }
    }
    ctx.drawImage(tableCache.c, 0, 0, W, H)

    ctx.save()
    ctx.translate(view.current.ox, view.current.oy)
    ctx.scale(s, s)

    // Wizard mode rim
    if (g.wizardT > 0) {
      ctx.strokeStyle = `hsl(${(t * 200) % 360},90%,65%)`
      ctx.lineWidth = 4
      ctx.globalAlpha = 0.6 + Math.sin(t * 8) * 0.3
      ctx.strokeRect(4, 4, TW - 8, TH - 8)
      ctx.globalAlpha = 1
    }

    // Lane lamps
    LANES.forEach((ln, i) => {
      const x = (ln.x0 + ln.x1) / 2
      const on = g.lanes[i]
      if (on) glow(ctx, x, 106, 22, n.accent, 0.5)
      ctx.fillStyle = on ? n.accent : 'rgba(255,255,255,0.12)'
      ctx.beginPath()
      ctx.arc(x, 106, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x - 10, LANE_Y)
      ctx.lineTo(x + 10, LANE_Y)
      ctx.stroke()
    })

    // Mission lamps
    for (let i = 0; i < TABLE_MISSIONS.length; i++) {
      const x = 132 + i * 20
      const y = 452
      const done = i < g.missionsDone % TABLE_MISSIONS.length
      const cur = i === g.mIdx % TABLE_MISSIONS.length
      ctx.fillStyle = done ? '#fde047' : cur && Math.sin(t * 8) > 0 ? n.wall : 'rgba(255,255,255,0.12)'
      ctx.beginPath()
      ctx.moveTo(x, y - 6)
      ctx.lineTo(x + 6, y)
      ctx.lineTo(x, y + 6)
      ctx.lineTo(x - 6, y)
      ctx.closePath()
      ctx.fill()
    }

    // Saucer
    if (g.lockLit || g.multiball) {
      const k = 0.5 + Math.sin(t * 9) * 0.5
      glow(ctx, SAUCER.x, SAUCER.y, 36, g.multiball ? '#fde047' : n.accent, 0.35 + k * 0.4)
      ctx.font = "900 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(g.multiball ? 'JACKPOT' : 'LOCK', SAUCER.x, SAUCER.y + 30)
    }

    // Bumpers
    BUMPERS.forEach((bp, i) => {
      const f = g.bumperFlash[i]
      if (f > 0) glow(ctx, bp.x, bp.y, bp.r * 2.4, n.accent, f * 0.8)
      ctx.fillStyle = '#111827'
      ctx.beginPath()
      ctx.arc(bp.x, bp.y + 3, bp.r + 2, 0, Math.PI * 2)
      ctx.fill()
      const gr = ctx.createRadialGradient(bp.x - bp.r * 0.3, bp.y - bp.r * 0.4, 2, bp.x, bp.y, bp.r * (1 + f * 0.15))
      gr.addColorStop(0, '#ffffff')
      gr.addColorStop(0.35, f > 0 ? '#ffffff' : n.wall)
      gr.addColorStop(1, n.glow)
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.arc(bp.x, bp.y, bp.r * (1 + f * 0.15), 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = n.accent
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(bp.x, bp.y, bp.r * 0.62, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(bp.x, bp.y, 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // Slingshots
    SLINGS.forEach((sl, i) => {
      const f = g.slingFlash[i]
      ctx.fillStyle = `rgba(255,255,255,${0.06 + f * 0.3})`
      ctx.beginPath()
      ctx.moveTo(sl.a[0], sl.a[1])
      ctx.lineTo(sl.b[0], sl.b[1])
      ctx.lineTo(sl.c[0], sl.c[1])
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = n.wall
      ctx.lineWidth = 3
      ctx.stroke()
      ctx.strokeStyle = f > 0 ? '#ffffff' : n.accent
      ctx.lineWidth = 4 + f * 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(sl.c[0], sl.c[1])
      ctx.lineTo(sl.a[0], sl.a[1])
      ctx.stroke()
    })

    // Drop targets
    TARGETS.forEach((tg, i) => {
      const down = g.targets[i]
      if (!down) glow(ctx, tg.x, tg.y, 20, n.accent, 0.35)
      ctx.fillStyle = down ? 'rgba(255,255,255,0.12)' : n.accent
      ctx.beginPath()
      ctx.roundRect(tg.x - 3.5, tg.y - TARGET_HALF, 7, TARGET_HALF * 2, 3)
      ctx.fill()
      if (!down) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillRect(tg.x - 1.5, tg.y - TARGET_HALF + 3, 2, TARGET_HALF * 2 - 6)
      }
    })

    // Spinner
    const sh = Math.abs(Math.cos(g.spin)) * 7 + 1
    ctx.fillStyle = g.spinV > 2 ? '#ffffff' : '#cbd5e1'
    ctx.fillRect(SPINNER.x0 + 2, SPINNER.y - sh / 2, SPINNER.x1 - SPINNER.x0 - 4, sh)
    ctx.fillStyle = n.accent
    ctx.beginPath()
    ctx.arc(SPINNER.x0 + 2, SPINNER.y, 3, 0, Math.PI * 2)
    ctx.arc(SPINNER.x1 - 2, SPINNER.y, 3, 0, Math.PI * 2)
    ctx.fill()

    // Plunger
    const ptop = PLUNGER_Y + g.pull * 34
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    const coils = 7
    for (let i = 0; i <= coils * 2; i++) {
      const y = ptop + 6 + ((714 - ptop - 6) * i) / (coils * 2)
      const x = PLUNGER_X + (i % 2 ? 9 : -9)
      if (i === 0) ctx.moveTo(PLUNGER_X, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.fillStyle = g.pull > 0.9 ? '#fde047' : '#e2e8f0'
    ctx.beginPath()
    ctx.roundRect(PLUNGER_X - 13, ptop, 26, 7, 3)
    ctx.fill()
    if (plungerMode() || ph === 'idle') {
      ctx.fillStyle = `rgba(253,224,71,${0.5 + Math.sin(t * 6) * 0.3})`
      ctx.beginPath()
      ctx.moveTo(PLUNGER_X, 712)
      ctx.lineTo(PLUNGER_X - 7, 702)
      ctx.lineTo(PLUNGER_X + 7, 702)
      ctx.fill()
    }

    // Flippers
    g.flips.forEach((f, i) => {
      const def = FLIPPERS[i]
      const c = Math.cos(f.a)
      const sn = Math.sin(f.a)
      const tx = def.px + c * def.len
      const ty = def.py + sn * def.len
      const nx = -sn
      const ny = c
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.moveTo(def.px + nx * FLIP_R0 + 2, def.py + ny * FLIP_R0 + 4)
      ctx.lineTo(tx + nx * FLIP_R1 + 2, ty + ny * FLIP_R1 + 4)
      ctx.lineTo(tx - nx * FLIP_R1 + 2, ty - ny * FLIP_R1 + 4)
      ctx.lineTo(def.px - nx * FLIP_R0 + 2, def.py - ny * FLIP_R0 + 4)
      ctx.fill()
      const gr = ctx.createLinearGradient(def.px + nx * FLIP_R0, def.py + ny * FLIP_R0, def.px - nx * FLIP_R0, def.py - ny * FLIP_R0)
      gr.addColorStop(0, '#ffffff')
      gr.addColorStop(1, f.held ? n.accent : n.wall)
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.arc(def.px, def.py, FLIP_R0, f.a + Math.PI / 2, f.a - Math.PI / 2)
      ctx.lineTo(tx + nx * -FLIP_R1, ty + ny * -FLIP_R1)
      ctx.arc(tx, ty, FLIP_R1, f.a - Math.PI / 2, f.a + Math.PI / 2)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = n.glow
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = '#1f2937'
      ctx.beginPath()
      ctx.arc(def.px, def.py, 3.5, 0, Math.PI * 2)
      ctx.fill()
    })

    // Balls
    for (const b of g.balls) {
      b.trail.forEach(([x, y], i) => {
        ctx.globalAlpha = (i / b.trail.length) * 0.25
        ctx.fillStyle = n.wall
        ctx.beginPath()
        ctx.arc(x, y, BALL_R * (0.5 + (i / b.trail.length) * 0.4), 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.beginPath()
      ctx.arc(b.x + 3, b.y + 4, BALL_R, 0, Math.PI * 2)
      ctx.fill()
      const gr = ctx.createRadialGradient(b.x - 3, b.y - 3.5, 1, b.x, b.y, BALL_R)
      gr.addColorStop(0, '#ffffff')
      gr.addColorStop(0.45, '#cbd5e1')
      gr.addColorStop(1, '#334155')
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = n.wall
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // Ball saver lamp
    if (g.saverT > 0 && ph === 'play') {
      ctx.globalAlpha = g.saverT < 2 ? (Math.sin(t * 16) > 0 ? 1 : 0.2) : 0.9
      ctx.fillStyle = '#4ade80'
      ctx.font = "900 10px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.fillText('SHOOT AGAIN', 182, 700)
      ctx.globalAlpha = 1
    }
    ctx.restore()

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud" style={{ top: '0.4rem' }}>
              <div>
                <div className="action-hud__score" style={{ fontSize: '1.45rem' }}>{hud.score.toLocaleString()}</div>
                <div className="action-hud__small">x{hud.mult} bonus</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">
                  Ball {Math.min(hud.ball, hud.balls)}/{hud.balls}
                </span>
              </div>
            </div>
          )}
          {phase === 'play' && hud.mission ? (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: '0.45rem',
                transform: 'translateX(-50%)',
                zIndex: 6,
                pointerEvents: 'none',
                padding: '0.2rem 0.7rem',
                borderRadius: 99,
                background: hud.wizard ? 'rgba(250,204,21,0.85)' : 'rgba(15,23,42,0.7)',
                color: hud.wizard ? '#422006' : '#fff',
                fontWeight: 800,
                fontSize: '0.72rem',
                whiteSpace: 'nowrap',
              }}
            >
              {hud.mission} · {hud.prog}
            </div>
          ) : null}
          {banner && (phase === 'play' || phase === 'dying') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="pinball"
              icon={meta.icon}
              title={meta.title}
              hint="Pull down to launch. Hold the left or right half of the screen to flip. Keep the ball alive and finish table missions."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.score >= 50000 ? 'Pinball wizard!' : 'Drained!'}
            subtitle={`Score ${hud.score.toLocaleString()}`}
            celebrate={hud.score >= 50000}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
