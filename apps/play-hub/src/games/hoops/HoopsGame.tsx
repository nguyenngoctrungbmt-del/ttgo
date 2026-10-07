import { useRef, useState, type PointerEvent } from 'react'
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
import './hoops.css'

const meta = getGame('hoops')

type Phase = 'idle' | 'play' | 'dying' | 'over'

const BR = 0.15
const GRAV = 14
const CAMZ = -2.2
const CAMY = 1.6
const HOOP_Z = 2.5
const HOOP_Y = 3.05
const START_Y = 0.35
const VY0 = 10.4
const BASKETS_PER_LEVEL = 6

type Ball = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  ax: number
  spin: number
  rim: boolean
  board: boolean
  scored: boolean
  resolved: boolean
  floor: number
  life: number
  gold: boolean
  fire: boolean
  inNet: boolean
  trail: number[]
}

type Hoop = { x: number; y: number; z: number; R: number }

type World = {
  clock: number
  level: number
  levelBaskets: number
  baskets: number
  streak: number
  swishRun: number
  fireT: number
  score: number
  balls: Ball[]
  readyX: number
  readyT: number
  readyGold: boolean
  hoopT: number
  hoop: Hoop
  wind: number
  windT: number
  netStretch: number
  netSwing: number
  shots: number
  bonusT: number
  tick: number
  demoT: number
  stats: { baskets: number; swishes: number; streak: number; fires: number; level: number }
}

function freshWorld(): World {
  return {
    clock: 30,
    level: 1,
    levelBaskets: 0,
    baskets: 0,
    streak: 0,
    swishRun: 0,
    fireT: 0,
    score: 0,
    balls: [],
    readyX: 0,
    readyT: 1,
    readyGold: false,
    hoopT: 0,
    hoop: { x: 0, y: HOOP_Y, z: HOOP_Z, R: 0.36 },
    wind: 0,
    windT: 0,
    netStretch: 0,
    netSwing: 0,
    shots: 0,
    bonusT: 0,
    tick: 0,
    demoT: 1,
    stats: { baskets: 0, swishes: 0, streak: 0, fires: 0, level: 1 },
  }
}

const LEVEL_NOTE: Record<number, string> = {
  2: 'the hoop slides',
  3: 'the hoop bobs',
  4: 'smaller rim',
  5: 'bonus rack + wind',
  6: 'the hoop drifts',
  7: 'gusty wind',
  8: 'all-star mode',
}

/** Where the hoop is at hoop-clock time `t` for a given level. */
function hoopAt(level: number, t: number): Hoop {
  const L = level
  const sp = L >= 8 ? 1 + (L - 8) * 0.06 : 1
  const ampX = L >= 6 ? 0.8 : L >= 4 ? 0.7 : L >= 3 ? 0.6 : L >= 2 ? 0.5 : 0
  const spdX = (L >= 6 ? 1.2 : L >= 4 ? 1.0 : 0.8) * sp
  const ampY = L >= 7 ? 0.35 : L >= 3 ? 0.25 : 0
  const ampZ = L >= 6 ? 0.4 : 0
  const R = L >= 8 ? Math.max(0.25, 0.29 - (L - 8) * 0.008) : L >= 7 ? 0.29 : L >= 6 ? 0.31 : L >= 4 ? 0.32 : 0.36
  return {
    x: ampX * Math.sin(t * spdX),
    y: HOOP_Y + ampY * Math.sin(t * 1.1 * sp + 1),
    z: HOOP_Z + ampZ * Math.sin(t * 0.7 * sp + 2),
    R,
  }
}

/** Seconds for a ball launched with VY0 to fall back to height y. */
function flightTime(y: number) {
  const d = VY0 * VY0 - 2 * GRAV * (y - START_Y)
  return (VY0 + Math.sqrt(Math.max(0, d))) / GRAV
}

type Pal = { sky0: string; sky1: string; wall: string; wallLine: string; floor0: string; floor1: string; paint: string; line: string; lights: boolean; neon: boolean }
const PALS: Pal[] = [
  { sky0: '#38bdf8', sky1: '#bae6fd', wall: '#64748b', wallLine: '#94a3b8', floor0: '#2563eb', floor1: '#1d4ed8', paint: '#16a34a', line: '#f8fafc', lights: false, neon: false },
  { sky0: '#9a3412', sky1: '#fdba74', wall: '#57534e', wallLine: '#78716c', floor0: '#334155', floor1: '#1e293b', paint: '#b91c1c', line: '#fef3c7', lights: false, neon: false },
  { sky0: '#020617', sky1: '#1e1b4b', wall: '#1e293b', wallLine: '#334155', floor0: '#d6a15e', floor1: '#b7814a', paint: '#1d4ed8', line: '#ffffff', lights: true, neon: false },
  { sky0: '#0f0225', sky1: '#3b0764', wall: '#1e1033', wallLine: '#a21caf', floor0: '#111827', floor1: '#0b1020', paint: '#312e81', line: '#22d3ee', lights: true, neon: true },
]
function palFor(level: number) {
  return level < 4 ? 0 : level < 7 ? 1 : level < 10 ? 2 : 3
}

export default function HoopsGame() {
  const run = useActionRun('hoops')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const aim = useRef<{ id: number; x0: number; y0: number; x: number; y: number } | null>(null)
  const bgCache = useRef<{ key: string; c: HTMLCanvasElement | null }>({ key: '', c: null })
  const lastMilestone = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, clock: 30, streak: 0, swish: 0, fire: false, baskets: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function au() {
    return phaseRef.current !== 'idle'
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.level, clock: Math.ceil(w.clock), streak: w.streak, swish: Math.min(3, w.swishRun), fire: w.fireT > 0, baskets: w.baskets })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const F = Math.min(H * 0.6, W * 1.3)
    const ballY = H * 0.87
    const hor = ballY - ((CAMY - START_Y) * F) / (0 - CAMZ)
    return { W, H, F, hor, cx: W / 2 }
  }

  function P(x: number, y: number, z: number) {
    const g = geo()
    const zc = Math.max(0.3, z - CAMZ)
    const k = g.F / zc
    return { x: g.cx + x * k, y: g.hor - (y - CAMY) * k, k }
  }

  function milestone(kind: string, value: number) {
    const now = performance.now()
    if (now - lastMilestone.current < 30000) return
    lastMilestone.current = now
    void trackEvent('action_milestone', { game_id: 'hoops', kind, value })
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.clock = 30 + run.level('clock') * 4
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    pushHud()
    setBanner({ key: Date.now(), text: 'TIP OFF!', sub: 'swipe up to shoot' })
    sfx.ready()
  }

  function nextReady(w: World) {
    w.readyT = 0
    w.readyX = w.level >= 2 ? rand(-0.9, 0.9) : rand(-0.25, 0.25)
    w.readyGold = w.bonusT > 0 || (w.level >= 3 && w.shots > 3 && Math.random() < 0.1)
  }

  function launch(w: World, vx: number, vz: number) {
    const b: Ball = {
      x: w.readyX,
      y: START_Y,
      z: 0,
      vx,
      vy: VY0,
      vz,
      ax: w.wind,
      spin: 0,
      rim: false,
      board: false,
      scored: false,
      resolved: false,
      floor: 0,
      life: 2.5,
      gold: w.readyGold,
      fire: w.fireT > 0,
      inNet: false,
      trail: [],
    }
    w.balls.push(b)
    if (w.balls.length > 5) w.balls.shift()
    w.shots += 1
    w.readyT = -0.45
    if (au()) sfx.whoosh()
    if (au()) haptic.light()
  }

  /** Swipe vector (screen px) → launch velocity. */
  function swipeToVel(w: World, dx: number, dy: number) {
    const g = geo()
    const len = Math.hypot(dx, dy)
    const p = clamp(len / (g.H * 0.3), 0.3, 2)
    const t = flightTime(HOOP_Y)
    const vzIdeal = HOOP_Z / t
    const vz = vzIdeal * (1 + (p - 1) * 0.5)
    // Extend the swipe ray from the ball up to the hoop's screen height.
    const bs = P(w.readyX, START_Y, 0)
    const hs = P(w.hoop.x, w.hoop.y, w.hoop.z)
    const sxAim = bs.x + (dx / Math.max(1, -dy)) * (bs.y - hs.y)
    const xa = (sxAim - g.cx) / hs.k
    const vx = (xa - w.readyX) / t
    return { vx, vz }
  }

  function autoShot(w: World, err = 0) {
    const t = flightTime(w.hoop.y)
    const h = hoopAt(w.level, w.hoopT + t)
    const vz = h.z / flightTime(h.y) + rand(-err, err)
    const vx = (h.x - w.readyX) / t - 0.5 * w.wind * t + rand(-err, err)
    launch(w, vx, vz)
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    aim.current = { id: e.pointerId, x0: p.x, y0: p.y, x: p.x, y: p.y }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const a = aim.current
    if (!a || a.id !== e.pointerId) return
    const p = localPoint(e, e.currentTarget)
    a.x = p.x
    a.y = p.y
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const a = aim.current
    if (!a || a.id !== e.pointerId) return
    aim.current = null
    const w = world.current
    const dx = a.x - a.x0
    const dy = a.y - a.y0
    if (phaseRef.current !== 'play' || w.readyT < 1 || dy > -30) return
    const v = swipeToVel(w, dx, dy)
    launch(w, v.vx, v.vz)
  }

  function scoreBasket(w: World, b: Ball) {
    const live = phaseRef.current === 'play'
    const swish = !b.rim && !b.board
    const bank = b.board && !b.rim
    w.netStretch = 1
    w.netSwing = (b.vx > 0 ? 1 : -1) * 0.6
    const hp = P(w.hoop.x, w.hoop.y - 0.2, w.hoop.z)
    if (!live) {
      fx.burst(hp.x, hp.y, { count: 8, color: ['#ffffff', '#fdba74'], speed: 120, size: 2 })
      return
    }
    w.baskets += 1
    w.levelBaskets += 1
    w.streak += 1
    w.stats.baskets = w.baskets
    w.stats.streak = Math.max(w.stats.streak, w.streak)
    if (swish) {
      w.stats.swishes += 1
      w.swishRun += 1
      if (w.swishRun >= 3 && w.fireT <= 0) {
        w.fireT = 10 + run.level('hot') * 3
        w.stats.fires += 1
        setBanner({ key: Date.now(), text: 'ON FIRE!', sub: 'double points' })
        sfx.power()
        sfx.boom(0.4)
        fx.flash('#f97316', 0.25)
        haptic.success()
      } else if (w.fireT > 0) w.fireT += 1.5
    } else w.swishRun = 0
    const mult = (b.gold ? 3 : 1) * (w.fireT > 0 ? 2 : 1)
    const pts = (10 + (swish ? 10 : 0) + (bank ? 5 : 0)) * mult + Math.min(w.streak, 10) * 2
    w.score += pts
    if (w.bonusT <= 0) w.clock += Math.max(1, 2.2 - w.level * 0.12) + (swish ? 1 : 0) + (b.gold ? 2 : 0)
    const label = b.gold ? 'GOLD!' : swish ? 'SWISH!' : bank ? 'BANK!' : 'SCORE!'
    const col = b.gold ? '#fde047' : swish ? '#a5f3fc' : '#ffffff'
    fx.text(hp.x, hp.y - 40, `${label} +${pts}`, col, swish ? 22 : 18)
    fx.burst(hp.x, hp.y + 10, { count: swish ? 26 : 14, color: b.gold ? ['#fde047', '#facc15', '#ffffff'] : w.fireT > 0 ? ['#fde047', '#f97316', '#ef4444'] : ['#ffffff', '#fdba74', '#fb923c'], speed: swish ? 260 : 180, size: 3, shape: 'spark', gravity: 300 })
    fx.ring(hp.x, hp.y, { color: col, maxR: swish ? 60 : 40, life: 0.35 })
    fx.stop(swish ? 0.06 : 0.03)
    fx.shake(swish ? 4 : 2, 0.15)
    sfx.score(w.streak)
    if (swish) sfx.match()
    haptic.medium()
    if (w.levelBaskets >= BASKETS_PER_LEVEL) levelUp(w)
    run.update(w.stats)
    pushHud()
  }

  function missBall(w: World, b: Ball) {
    if (phaseRef.current !== 'play') return
    const p = P(b.x, b.y, b.z)
    w.streak = 0
    w.swishRun = 0
    if (w.fireT > 0) {
      w.fireT = 0
      fx.text(clamp(p.x, 50, size.current.w - 50), p.y - 30, 'FIRE OUT', '#fdba74', 16)
    } else fx.text(clamp(p.x, 50, size.current.w - 50), p.y - 30, b.rim ? 'RIMMED OUT' : 'MISS', '#cbd5e1', 15)
    sfx.miss()
    pushHud()
  }

  function levelUp(w: World) {
    w.level += 1
    w.levelBaskets = 0
    w.stats.level = w.level
    const note = LEVEL_NOTE[w.level] ?? (w.level % 5 === 0 ? 'bonus rack!' : 'faster and smaller')
    if (w.level % 5 === 0) {
      w.bonusT = 7
      w.readyGold = true
      milestone('level', w.level)
    }
    setBanner({ key: Date.now(), text: w.level % 5 === 0 ? 'BONUS RACK!' : `LEVEL ${w.level}`, sub: w.level % 5 === 0 ? 'clock stopped · gold balls' : note })
    sfx.levelUp()
    haptic.success()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.slowmo(0.8, 0.4)
    fx.flash('#ef4444', 0.3)
    sfx.lose()
    haptic.error()
    setBanner({ key: Date.now(), text: 'TIME!' })
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(3 + w.baskets * 0.8 + (w.level - 1) * 2 + w.stats.fires * 2)
      run.end({ score: w.score, cleared: w.baskets >= 15, stats: { ...w.stats }, coins }, revive)
    }, 1100)
  }

  /** Ad revive: ten more seconds on the clock and a ball ready to go. */
  function revive() {
    const w = world.current
    w.clock = 10
    w.balls = []
    w.readyT = 1
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: '+10 seconds' })
    pushHud()
    setPhaseBoth('play')
  }

  function updateBall(w: World, b: Ball, dt: number) {
    const h = w.hoop
    const steps = 3
    const sdt = dt / steps
    for (let s = 0; s < steps; s++) {
      const prevY = b.y
      b.vy -= GRAV * sdt
      b.vx += b.ax * sdt
      b.x += b.vx * sdt
      b.y += b.vy * sdt
      b.z += b.vz * sdt
      // Inside the net: damp sideways motion so it drops through.
      if (b.inNet) {
        const dx = b.x - h.x
        const dz = b.z - h.z
        b.vx = b.vx * 0.9 - dx * 30 * sdt
        b.vz = b.vz * 0.9 - dz * 30 * sdt
        if (b.y < h.y - 0.55) b.inNet = false
      }
      // Rim: torus collision.
      const dx = b.x - h.x
      const dz = b.z - h.z
      const dl = Math.hypot(dx, dz) || 0.0001
      const qx = h.x + (dx / dl) * h.R
      const qz = h.z + (dz / dl) * h.R
      const nx0 = b.x - qx
      const ny0 = b.y - h.y
      const nz0 = b.z - qz
      const nd = Math.hypot(nx0, ny0, nz0)
      if (nd < BR && nd > 0) {
        const nx = nx0 / nd
        const ny = ny0 / nd
        const nz = nz0 / nd
        const vn = b.vx * nx + b.vy * ny + b.vz * nz
        if (vn < 0) {
          b.vx -= 1.5 * vn * nx
          b.vy -= 1.5 * vn * ny
          b.vz -= 1.5 * vn * nz
          if (!b.rim || Math.abs(vn) > 1.5) {
            const p = P(qx, h.y, qz)
            fx.burst(p.x, p.y, { count: 5, color: ['#fb923c', '#ffffff'], speed: 100, size: 2, shape: 'spark' })
            if (au()) sfx.clang()
          }
          b.rim = true
        }
        b.x = qx + nx * BR
        b.y = h.y + ny * BR
        b.z = qz + nz * BR
      }
      // Backboard
      const boardZ = h.z + h.R + 0.12
      if (b.vz > 0 && b.z + BR > boardZ && b.z < boardZ + 0.2 && Math.abs(b.x - h.x) < 0.9 && b.y > h.y - 0.15 && b.y < h.y + 1.05) {
        b.z = boardZ - BR
        b.vz = -b.vz * 0.55
        b.vx *= 0.85
        if (!b.board) {
          const p = P(b.x, b.y, boardZ)
          fx.ring(p.x, p.y, { color: '#ffffff', maxR: 22, life: 0.25 })
          if (au()) sfx.thud()
        }
        b.board = true
      }
      // Through the hoop, downward.
      if (!b.scored && !b.resolved && prevY >= h.y && b.y < h.y && b.vy < 0) {
        const hd = Math.hypot(b.x - h.x, b.z - h.z)
        if (hd < h.R - BR * 0.25) {
          b.scored = true
          b.resolved = true
          b.inNet = true
          scoreBasket(w, b)
        }
      }
      // Floor
      if (b.y < BR) {
        b.y = BR
        if (b.vy < 0) {
          b.vy = -b.vy * 0.55
          b.vx *= 0.8
          b.vz *= 0.8
          b.floor += 1
          if (b.floor === 1) {
            b.life = Math.min(b.life, 0.9)
            if (au() && b.vy > 2) sfx.thud()
          }
        }
        if (!b.resolved) {
          b.resolved = true
          missBall(w, b)
        }
      }
    }
    b.spin += dt * (b.vz * 3 + 4)
    if (b.floor > 0 || b.y < h.y - 1) b.life -= dt
    b.trail.push(b.x, b.y, b.z)
    if (b.trail.length > 24) b.trail.splice(0, 3)
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
    // Far wall at z = 6.5
    const wallTop = P(0, 6.5, 6.5).y
    const wallBottom = P(0, 0, 6.5).y
    const sky = x.createLinearGradient(0, 0, 0, wallBottom)
    sky.addColorStop(0, pal.sky0)
    sky.addColorStop(1, pal.sky1)
    x.fillStyle = sky
    x.fillRect(0, 0, W, wallBottom)
    if (!pal.lights) {
      // City skyline
      x.fillStyle = 'rgba(15,23,42,0.35)'
      let bx = -10
      let i = 0
      while (bx < W) {
        const bw = 26 + ((i * 37) % 30)
        const bh = 40 + ((i * 53) % 90)
        x.fillRect(bx, wallBottom - (wallBottom - wallTop) * 0.6 - bh, bw, bh + 40)
        bx += bw + 4
        i++
      }
    } else {
      // Arena stands with dotted crowd
      const standTop = wallTop - 30
      x.fillStyle = pal.wall
      x.fillRect(0, standTop, W, wallBottom - standTop)
      for (let ry = standTop + 8; ry < wallBottom - 30; ry += 9) {
        for (let rx = 3 + ((ry / 9) % 2) * 4; rx < W; rx += 8) {
          x.fillStyle = pal.neon ? ['#a21caf', '#22d3ee', '#f472b6', '#6366f1'][(rx * 7 + ry) % 4] : ['#f87171', '#fde68a', '#93c5fd', '#e5e7eb', '#fb923c'][(rx * 3 + ry) % 5]
          x.globalAlpha = 0.55
          x.beginPath()
          x.arc(rx, ry, 2.6, 0, Math.PI * 2)
          x.fill()
        }
      }
      x.globalAlpha = 1
    }
    // Back wall / fence band
    const fenceTop = wallBottom - (wallBottom - wallTop) * 0.55
    x.fillStyle = pal.wall
    x.fillRect(0, fenceTop, W, wallBottom - fenceTop)
    x.strokeStyle = pal.wallLine
    x.lineWidth = 1
    x.beginPath()
    if (!pal.lights) {
      // Chain-link fence
      for (let k = -W; k < W * 2; k += 10) {
        x.moveTo(k, fenceTop)
        x.lineTo(k + (wallBottom - fenceTop), wallBottom)
        x.moveTo(k, wallBottom)
        x.lineTo(k + (wallBottom - fenceTop), fenceTop)
      }
    } else {
      for (let yy = fenceTop + 6; yy < wallBottom; yy += 8) {
        x.moveTo(0, yy)
        x.lineTo(W, yy)
      }
    }
    x.stroke()
    if (pal.neon) {
      x.fillStyle = '#e879f9'
      x.fillRect(0, fenceTop - 3, W, 3)
      x.fillStyle = '#22d3ee'
      x.fillRect(0, wallBottom - 4, W, 3)
    }
    // Floor
    const fl = x.createLinearGradient(0, wallBottom, 0, H)
    fl.addColorStop(0, pal.floor1)
    fl.addColorStop(1, pal.floor0)
    x.fillStyle = fl
    x.fillRect(0, wallBottom, W, H - wallBottom)
    if (palFor(1) !== PALS.indexOf(pal) && !pal.neon && pal.lights) {
      // Wood planks
      x.strokeStyle = 'rgba(120,53,15,0.25)'
      x.beginPath()
      for (let px = -6; px <= 6; px += 0.35) {
        const a = P(px, 0, 6.5)
        const b = P(px, 0, -1.5)
        x.moveTo(a.x, a.y)
        x.lineTo(b.x, b.y)
      }
      x.stroke()
    }
    // Paint (key) and court lines
    const poly = (pts: [number, number][]) => {
      x.beginPath()
      pts.forEach(([px, pz], i2) => {
        const p = P(px, 0, pz)
        if (i2 === 0) x.moveTo(p.x, p.y)
        else x.lineTo(p.x, p.y)
      })
    }
    poly([
      [-1.3, HOOP_Z + 1.2],
      [1.3, HOOP_Z + 1.2],
      [1.3, HOOP_Z - 3],
      [-1.3, HOOP_Z - 3],
    ])
    x.closePath()
    x.fillStyle = pal.paint
    x.globalAlpha = 0.75
    x.fill()
    x.globalAlpha = 1
    x.strokeStyle = pal.line
    x.lineWidth = 2
    x.stroke()
    poly([
      [-g.W, HOOP_Z + 1.2],
      [g.W, HOOP_Z + 1.2],
    ])
    x.stroke()
    // Free-throw circle
    x.beginPath()
    for (let i2 = 0; i2 <= 24; i2++) {
      const a = (i2 / 24) * Math.PI * 2
      const p = P(Math.cos(a) * 1.3, 0, HOOP_Z - 3 + Math.sin(a) * 1.3)
      if (i2 === 0) x.moveTo(p.x, p.y)
      else x.lineTo(p.x, p.y)
    }
    x.stroke()
    // Three-point arc
    x.beginPath()
    for (let i2 = 0; i2 <= 40; i2++) {
      const a = Math.PI + (i2 / 40) * Math.PI
      const p = P(Math.cos(a) * 5.2, 0, HOOP_Z + 0.4 + Math.sin(a) * 5.2)
      if (i2 === 0) x.moveTo(p.x, p.y)
      else x.lineTo(p.x, p.y)
    }
    x.stroke()
    const vg = x.createRadialGradient(W / 2, H * 0.5, H * 0.3, W / 2, H * 0.5, H * 0.8)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(0,0,0,0.35)')
    x.fillStyle = vg
    x.fillRect(0, 0, W, H)
    return c
  }

  function drawBall(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number, spin: number, gold: boolean, fire: boolean, time: number) {
    if (fire) {
      glow(ctx, sx, sy, r * 3.2, '#f97316', 0.6)
      for (let i = 0; i < 4; i++) {
        const a = time * 9 + i * 1.6
        ctx.fillStyle = i % 2 ? '#fde047' : '#fb923c'
        ctx.globalAlpha = 0.7
        ctx.beginPath()
        ctx.ellipse(sx + Math.sin(a) * r * 0.4, sy + r * 0.6 + Math.cos(a) * r * 0.2, r * 0.5, r * 1.1, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    if (gold) glow(ctx, sx, sy, r * 2.4, '#fde047', 0.5)
    const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.1, sx, sy, r)
    g.addColorStop(0, gold ? '#fef9c3' : '#fdba74')
    g.addColorStop(0.55, gold ? '#facc15' : '#f97316')
    g.addColorStop(1, gold ? '#a16207' : '#9a3412')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.clip()
    ctx.strokeStyle = gold ? '#713f12' : '#431407'
    ctx.lineWidth = Math.max(1, r * 0.09)
    ctx.translate(sx, sy)
    ctx.rotate(spin)
    ctx.beginPath()
    ctx.moveTo(-r, 0)
    ctx.lineTo(r, 0)
    ctx.moveTo(0, -r)
    ctx.lineTo(0, r)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(-r * 0.95, 0, r * 0.55, r, 0, -Math.PI / 2, Math.PI / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(r * 0.95, 0, r * 0.55, r, 0, Math.PI / 2, Math.PI * 1.5)
    ctx.stroke()
    ctx.restore()
  }

  function drawHoopBack(ctx: CanvasRenderingContext2D, w: World, pal: Pal) {
    const h = w.hoop
    const boardZ = h.z + h.R + 0.12
    // Pole + arm
    const base = P(h.x, 0, boardZ + 0.9)
    const top = P(h.x, h.y + 0.6, boardZ + 0.9)
    const arm = P(h.x, h.y + 0.6, boardZ + 0.05)
    ctx.strokeStyle = pal.neon ? '#4c1d95' : '#334155'
    ctx.lineCap = 'round'
    ctx.lineWidth = 0.16 * base.k
    ctx.beginPath()
    ctx.moveTo(base.x, base.y)
    ctx.lineTo(top.x, top.y)
    ctx.lineTo(arm.x, arm.y)
    ctx.stroke()
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(base.x, base.y, 0.5 * base.k, 0.12 * base.k, 0, 0, Math.PI * 2)
    ctx.fill()
    // Backboard
    const bl = P(h.x - 0.9, h.y + 1.05, boardZ)
    const br2 = P(h.x + 0.9, h.y - 0.15, boardZ)
    const bw = br2.x - bl.x
    const bh = br2.y - bl.y
    const glass = ctx.createLinearGradient(bl.x, bl.y, br2.x, br2.y)
    glass.addColorStop(0, 'rgba(255,255,255,0.92)')
    glass.addColorStop(0.5, 'rgba(226,232,240,0.85)')
    glass.addColorStop(1, 'rgba(255,255,255,0.92)')
    ctx.fillStyle = glass
    ctx.beginPath()
    ctx.roundRect(bl.x, bl.y, bw, bh, 4)
    ctx.fill()
    ctx.strokeStyle = pal.neon ? '#22d3ee' : '#ef4444'
    ctx.lineWidth = Math.max(2, bw * 0.025)
    ctx.stroke()
    const sq = P(h.x - 0.3, h.y + 0.45, boardZ)
    const sq2 = P(h.x + 0.3, h.y + 0.02, boardZ)
    ctx.strokeRect(sq.x, sq.y, sq2.x - sq.x, sq2.y - sq.y)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.moveTo(bl.x + bw * 0.08, bl.y + 3)
    ctx.lineTo(bl.x + bw * 0.22, bl.y + 3)
    ctx.lineTo(bl.x + bw * 0.1, br2.y - 3)
    ctx.lineTo(bl.x + bw * 0.02, br2.y - 3)
    ctx.closePath()
    ctx.fill()
    // Wind flag on top of the board
    if (Math.abs(w.wind) > 0.05) {
      const fp = P(h.x + 0.8, h.y + 1.05, boardZ)
      const fh = 0.5 * fp.k
      ctx.strokeStyle = '#e2e8f0'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(fp.x, fp.y)
      ctx.lineTo(fp.x, fp.y - fh)
      ctx.stroke()
      const dir = Math.sign(w.wind)
      const len = (0.3 + Math.abs(w.wind) * 0.12) * fp.k
      const wav = Math.sin(w.windT * 12) * 3
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.moveTo(fp.x, fp.y - fh)
      ctx.quadraticCurveTo(fp.x + dir * len * 0.5, fp.y - fh + wav, fp.x + dir * len, fp.y - fh + 4)
      ctx.lineTo(fp.x, fp.y - fh + 10)
      ctx.closePath()
      ctx.fill()
    }
  }

  function rimPoints(h: Hoop, n: number, y = h.y, r = h.R) {
    const pts: { x: number; y: number; z: number; sx: number; sy: number }[] = []
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      const x = h.x + Math.cos(a) * r
      const z = h.z + Math.sin(a) * r
      const p = P(x, y, z)
      pts.push({ x, y, z, sx: p.x, sy: p.y })
    }
    return pts
  }

  function drawRimHalf(ctx: CanvasRenderingContext2D, w: World, front: boolean, pal: Pal) {
    const h = w.hoop
    const p = P(h.x, h.y, h.z)
    const rx = h.R * p.k
    const ry = rx * 0.32
    ctx.strokeStyle = pal.neon ? '#f472b6' : '#ea580c'
    ctx.lineWidth = Math.max(3, 0.05 * p.k)
    ctx.beginPath()
    if (front) ctx.ellipse(p.x, p.y, rx, ry, 0, 0, Math.PI)
    else ctx.ellipse(p.x, p.y, rx, ry, 0, Math.PI, Math.PI * 2)
    ctx.stroke()
    if (front) {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.ellipse(p.x, p.y - 1, rx, ry, 0, 0.3, Math.PI - 0.3)
      ctx.stroke()
    }
  }

  function drawNet(ctx: CanvasRenderingContext2D, w: World, time: number) {
    const h = w.hoop
    const n = 12
    const top = rimPoints(h, n)
    const drop = 0.48 + w.netStretch * 0.22
    const sway = w.netSwing * Math.sin(time * 14) * 0.08
    const bottom = rimPoints({ ...h, x: h.x + sway }, n, h.y - drop, h.R * 0.62)
    const mid = rimPoints({ ...h, x: h.x + sway * 0.5 }, n, h.y - drop * 0.5, h.R * 0.82)
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 1.3
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      ctx.moveTo(top[i].sx, top[i].sy)
      ctx.lineTo(mid[j].sx, mid[j].sy)
      ctx.lineTo(bottom[i].sx, bottom[i].sy)
      ctx.moveTo(top[j].sx, top[j].sy)
      ctx.lineTo(mid[i].sx, mid[i].sy)
      ctx.lineTo(bottom[j].sx, bottom[j].sy)
    }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      ctx.moveTo(mid[i].sx, mid[i].sy)
      ctx.lineTo(mid[j].sx, mid[j].sy)
      ctx.moveTo(bottom[i].sx, bottom[i].sy)
      ctx.lineTo(bottom[j].sx, bottom[j].sy)
    }
    ctx.stroke()
  }

  function drawWorldBall(ctx: CanvasRenderingContext2D, b: Ball, time: number) {
    const p = P(b.x, b.y, b.z)
    const tr = b.trail
    if ((b.fire || b.gold) && tr.length >= 6) {
      ctx.strokeStyle = b.gold ? 'rgba(253,224,71,0.5)' : 'rgba(249,115,22,0.55)'
      ctx.lineCap = 'round'
      ctx.lineWidth = BR * p.k * 1.4
      ctx.beginPath()
      for (let i = 0; i < tr.length; i += 3) {
        const q = P(tr[i], tr[i + 1], tr[i + 2])
        if (i === 0) ctx.moveTo(q.x, q.y)
        else ctx.lineTo(q.x, q.y)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = clamp(b.life * 2, 0, 1)
    drawBall(ctx, p.x, p.y, BR * p.k, b.spin, b.gold, b.fire, time)
    ctx.globalAlpha = 1
  }

  function frame({ ctx, w: W, h: H, raw, t: time }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const pal = PALS[palFor(w.level)]

    if (ph === 'play' || ph === 'idle' || ph === 'dying') {
      w.hoopT += dt
      w.hoop = hoopAt(w.level, w.hoopT)
      // Wind shifts every few seconds once unlocked.
      w.windT += dt
      if (w.level >= 5) {
        const maxW = w.level >= 8 ? 2.2 : w.level >= 7 ? 1.8 : 1.2
        if (Math.floor(w.windT / 6) !== Math.floor((w.windT - dt) / 6)) w.wind = rand(-maxW, maxW)
      } else w.wind = 0
      if (w.readyT < 1) {
        w.readyT += dt * (w.bonusT > 0 ? 3.2 : 2.2)
        if (w.readyT >= 0 && w.readyT - dt * 2.2 < 0) nextReady(w)
      }
      for (const b of w.balls) updateBall(w, b, dt)
      w.balls = w.balls.filter((b) => b.life > 0)
      w.netStretch = Math.max(0, w.netStretch - dt * 2.5)
      w.netSwing *= Math.exp(-dt * 2)
    }

    if (ph === 'play') {
      if (w.bonusT > 0) {
        w.bonusT -= dt
        if (w.bonusT <= 0) setBanner({ key: Date.now(), text: 'CLOCK RUNNING', sub: `level ${w.level}` })
      } else w.clock -= dt
      if (w.fireT > 0) {
        w.fireT -= dt
        if (w.fireT <= 0) pushHud()
      }
      const sec = Math.ceil(w.clock)
      if (sec !== w.tick) {
        w.tick = sec
        if (sec <= 5 && sec > 0) sfx.tick()
        pushHud()
      }
      if (w.clock <= 0) {
        w.clock = 0
        die()
      }
    } else if (ph === 'idle') {
      w.demoT -= raw
      if (w.demoT <= 0 && w.readyT >= 1) {
        w.demoT = 1.6
        autoShot(w, Math.random() < 0.25 ? 0.25 : 0.03)
      }
    }

    // ── Draw ──
    const key = `${W}x${H}:${palFor(w.level)}`
    if (bgCache.current.key !== key) bgCache.current = { key, c: buildBg(W, H, pal) }
    fx.applyShake(ctx)
    if (bgCache.current.c) ctx.drawImage(bgCache.current.c, 0, 0, W, H)
    if (pal.lights) {
      glow(ctx, W * 0.2, 0, W * 0.5, pal.neon ? '#e879f9' : '#fef9c3', 0.25)
      glow(ctx, W * 0.8, 0, W * 0.5, pal.neon ? '#22d3ee' : '#fef9c3', 0.25)
    }
    if (w.fireT > 0) {
      ctx.globalAlpha = 0.1 + Math.sin(time * 8) * 0.04
      ctx.fillStyle = '#f97316'
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }

    // Ball shadows on the floor
    for (const b of w.balls) {
      const s = P(b.x, 0, b.z)
      const hgt = clamp(1 - b.y / 5, 0.2, 1)
      ctx.fillStyle = `rgba(0,0,0,${0.3 * hgt})`
      ctx.beginPath()
      ctx.ellipse(s.x, s.y, BR * s.k * (1.4 - hgt * 0.4), BR * s.k * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    drawHoopBack(ctx, w, pal)
    drawRimHalf(ctx, w, false, pal)
    const h = w.hoop
    // Balls beyond the rim front (dropping through or behind) are drawn under the net.
    const behind = (b: Ball) => b.z > h.z || (b.inNet && b.y < h.y + BR)
    for (const b of w.balls) if (behind(b)) drawWorldBall(ctx, b, time)
    drawNet(ctx, w, time)
    drawRimHalf(ctx, w, true, pal)
    for (const b of w.balls) if (!behind(b)) drawWorldBall(ctx, b, time)

    // Wind streaks
    if (Math.abs(w.wind) > 0.05) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const yy = ((i * 71) % (H * 0.6)) + H * 0.05
        const xx = (((i * 113 + w.windT * 160 * Math.sign(w.wind)) % (W + 60)) + W + 60) % (W + 60) - 30
        ctx.moveTo(xx, yy)
        ctx.lineTo(xx - Math.sign(w.wind) * (16 + Math.abs(w.wind) * 8), yy)
      }
      ctx.stroke()
    }

    // Ready ball at the shooting spot, rolling in.
    if (w.readyT >= 0 && (ph === 'play' || ph === 'idle')) {
      const k = clamp(w.readyT, 0, 1)
      const ease = 1 - (1 - k) * (1 - k)
      const fromX = w.readyX < 0 ? -3 : 3
      const bx = fromX + (w.readyX - fromX) * ease
      const bp = P(bx, START_Y, 0)
      const sp = P(bx, 0, 0)
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.ellipse(sp.x, sp.y, BR * sp.k * 1.1, BR * sp.k * 0.35, 0, 0, Math.PI * 2)
      ctx.fill()
      const bob = k >= 1 ? Math.sin(time * 4) * 2 : 0
      if (k >= 1 && ph === 'play' && !aim.current) {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 5])
        ctx.beginPath()
        ctx.arc(bp.x, bp.y, BR * bp.k * 1.5 + Math.sin(time * 5) * 2, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
      drawBall(ctx, bp.x, bp.y + bob, BR * bp.k, (bx - fromX) * 3, w.readyGold, w.fireT > 0, time)
    }

    // Aim arrow + guide dots
    const a = aim.current
    if (a && ph === 'play' && w.readyT >= 1) {
      const dx = a.x - a.x0
      const dy = a.y - a.y0
      if (dy < -10) {
        const bp = P(w.readyX, START_Y, 0)
        const len = Math.hypot(dx, dy)
        const pw = clamp(len / (H * 0.3), 0, 2)
        const col = pw < 0.8 ? '#93c5fd' : pw < 1.25 ? '#4ade80' : '#f87171'
        ctx.strokeStyle = col
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        const ex = bp.x + (dx / len) * Math.min(len, H * 0.35) * 0.6
        const ey = bp.y + (dy / len) * Math.min(len, H * 0.35) * 0.6
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.moveTo(bp.x, bp.y)
        ctx.lineTo(ex, ey)
        ctx.stroke()
        const ang = Math.atan2(dy, dx)
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.moveTo(ex + Math.cos(ang) * 10, ey + Math.sin(ang) * 10)
        ctx.lineTo(ex + Math.cos(ang + 2.4) * 10, ey + Math.sin(ang + 2.4) * 10)
        ctx.lineTo(ex + Math.cos(ang - 2.4) * 10, ey + Math.sin(ang - 2.4) * 10)
        ctx.closePath()
        ctx.fill()
        const guide = run.level('guide')
        if (guide > 0 && dy < -30) {
          const v = swipeToVel(w, dx, dy)
          const dots = 3 + guide * 4
          let x = w.readyX
          let y = START_Y
          let z = 0
          let vx = v.vx
          let vy = VY0
          const stepT = 0.07
          ctx.fillStyle = '#ffffff'
          for (let i = 0; i < dots; i++) {
            for (let s = 0; s < 2; s++) {
              vy -= GRAV * (stepT / 2)
              vx += w.wind * (stepT / 2)
              x += vx * (stepT / 2)
              y += vy * (stepT / 2)
              z += v.vz * (stepT / 2)
            }
            const q = P(x, y, z)
            ctx.globalAlpha = 0.75 * (1 - i / dots)
            ctx.beginPath()
            ctx.arc(q.x, q.y, Math.max(1.5, 0.04 * q.k), 0, Math.PI * 2)
            ctx.fill()
          }
        }
        ctx.globalAlpha = 1
      }
    }

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
            <>
              <div className="action-hud">
                <div>
                  <div className="action-hud__score">{hud.score}</div>
                  <div className="action-hud__small">Level {hud.level}</div>
                </div>
                <div className="action-hud__right">
                  <span className="action-hud__small">{hud.baskets} baskets</span>
                  {hud.streak > 1 ? <span className="action-hud__small">Streak {hud.streak}</span> : null}
                  <span className="hoops-flames" aria-label="Swish streak">
                    {[0, 1, 2].map((i) => (
                      <i key={i} className={hud.fire || i < hud.swish ? 'is-on' : ''} />
                    ))}
                  </span>
                </div>
              </div>
              <div className={`hoops-clock${hud.fire ? ' is-fire' : hud.clock <= 5 ? ' is-low' : ''}`}>{hud.clock}</div>
            </>
          )}
          {banner && (phase === 'play' || phase === 'dying') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="hoops"
              icon={meta.icon}
              title={meta.title}
              hint="Swipe up to shoot. Baskets add time, swishes add more — three swishes in a row and you're on fire!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.baskets >= 15 ? 'Buzzer beater!' : 'Time!'}
            subtitle={`Score ${hud.score} · ${hud.baskets} baskets · Level ${hud.level}`}
            celebrate={hud.baskets >= 15}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
