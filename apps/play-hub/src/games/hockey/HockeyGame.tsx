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
import './hockey.css'
import { ARENAS, RIVALS, rivalFor, type Arena, type Opp } from './rivals'

const meta = getGame('hockey')

type Phase = 'idle' | 'play' | 'perk' | 'dying' | 'over'
type Side = 'p' | 'c'

type PerkId = 'size' | 'shot' | 'guard' | 'slow' | 'drops' | 'reach'
type Perk = { id: PerkId; icon: string; label: string; blurb: string }
const PERKS: Perk[] = [
  { id: 'size', icon: '🔵', label: 'Wide Mallet', blurb: '+12% mallet size' },
  { id: 'shot', icon: '💥', label: 'Power Shot', blurb: 'Puck flies 12% faster off your mallet' },
  { id: 'guard', icon: '🛡️', label: 'Goal Shield', blurb: 'Block the first shot on your goal each match' },
  { id: 'slow', icon: '🧊', label: 'Cold Feet', blurb: 'Rivals move 8% slower' },
  { id: 'drops', icon: '⚡', label: 'Supply Drop', blurb: 'Power-ups appear 25% more often' },
  { id: 'reach', icon: '↕️', label: 'Long Reach', blurb: 'Move further up toward centre' },
]

type PowerKind = 'big' | 'split' | 'freeze'
type Puck = { x: number; y: number; vx: number; vy: number; last: Side; trail: number[]; alive: boolean; stall?: number }
type Mallet = { x: number; y: number; vx: number; vy: number; tx: number; ty: number; big: number; frozen: number; scale: number; px: number; py: number }
type Power = { x: number; y: number; kind: PowerKind; life: number; t: number }

type World = {
  stage: number
  tier: number
  opp: Opp
  arena: Arena
  /** Champion tricks: dash telegraph/lunge timers, forcefield timer, grow phase. */
  dashT: number
  dashing: number
  wallT: number
  wallOn: boolean
  matchT: number
  ps: number
  cs: number
  pucks: Puck[]
  me: Mallet
  cpu: Mallet
  power: Power | null
  powerT: number
  serveT: number
  serveTo: Side
  vsT: number
  shield: number
  guardUsed: boolean
  inv: number
  mood: number
  aiState: 'defend' | 'line' | 'strike'
  aiT: number
  aiAim: number
  score: number
  matchGoals: number
  perks: Record<PerkId, number>
  goalFlash: { side: Side; t: number }
  stats: { goals: number; wins: number; stage: number; powerups: number; bosses: number; shutouts: number }
}

function newMallet(): Mallet {
  return { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, big: 0, frozen: 0, scale: 1, px: 0, py: 0 }
}

function freshWorld(): World {
  return {
    stage: 0,
    tier: 0,
    opp: RIVALS[0],
    arena: ARENAS.neon,
    dashT: 4,
    dashing: 0,
    wallT: 6,
    wallOn: false,
    matchT: 0,
    ps: 0,
    cs: 0,
    pucks: [],
    me: newMallet(),
    cpu: newMallet(),
    power: null,
    powerT: 8,
    serveT: 0,
    serveTo: 'p',
    vsT: 0,
    shield: 0,
    guardUsed: false,
    inv: 0,
    mood: 0,
    aiState: 'defend',
    aiT: 0,
    aiAim: 0,
    score: 0,
    matchGoals: 0,
    perks: { size: 0, shot: 0, guard: 0, slow: 0, drops: 0, reach: 0 },
    goalFlash: { side: 'p', t: 9 },
    stats: { goals: 0, wins: 0, stage: 1, powerups: 0, bosses: 0, shutouts: 0 },
  }
}

const POWER_COLOR: Record<PowerKind, string> = { big: '#4ade80', split: '#facc15', freeze: '#67e8f9' }
const POWER_NAME: Record<PowerKind, string> = { big: 'BIG MALLET', split: 'SPLIT PUCK', freeze: 'FREEZE' }
const WIN_SCORE = 7

export default function HockeyGame() {
  const run = useActionRun('hockey')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null)
  const keys = useRef({ l: false, r: false, u: false, d: false })
  const bgCache = useRef<{ key: string; c: HTMLCanvasElement | null }>({ key: '', c: null })
  const lastMilestone = useRef(0)
  const lastHitAt = useRef(0)
  const bumpFlash = useRef(0)
  const devAuto = useRef(false)
  const devSpeed = useRef(1)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    // Test hook: autopilot + fast-forward + state readout for headless bots.
    const hook = {
      auto: (on: boolean) => (devAuto.current = on),
      speed: (n: number) => (devSpeed.current = Math.max(1, Math.min(8, Math.round(n)))),
      state: () => {
        const w = world.current
        return { phase: phaseRef.current, stage: w.stage + 1, ps: w.ps, cs: w.cs, opp: w.opp.name, arena: w.arena.id }
      },
      perk: () => {
        const c = document.querySelector('.hockey-perk__card') as HTMLButtonElement | null
        c?.click()
      },
    }
    ;(window as unknown as { __lv6hockey?: typeof hook }).__lv6hockey = hook
  }, [])

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, ps: 0, cs: 0, stage: 1, name: RIVALS[0].name, tier: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [choices, setChoices] = useState<Perk[]>([])

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function au() {
    return phaseRef.current !== 'idle'
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, ps: w.ps, cs: w.cs, stage: w.stage + 1, name: w.opp.name, tier: w.tier })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const x0 = 12
    const x1 = W - 12
    const y0 = 62
    const y1 = H - 12
    const tw = x1 - x0
    const th = y1 - y0
    return { W, H, x0, x1, y0, y1, tw, th, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, goalW: tw * 0.38, mr: tw * 0.085, pr: tw * 0.05 }
  }

  function malletR(m: Mallet, mine: boolean) {
    const g = geo()
    const w = world.current
    const grow = !mine && w.opp.special === 'grow' ? 1 + 0.14 * (1 + Math.sin(w.matchT * 1.2)) : 1
    const base = mine ? 1 + run.level('mallet') * 0.08 + w.perks.size * 0.12 : w.opp.big * grow
    return g.mr * base * (m.big > 0 ? 1.5 : 1)
  }

  function milestone(kind: string, value: number) {
    const now = performance.now()
    if (now - lastMilestone.current < 30000) return
    lastMilestone.current = now
    void trackEvent('action_milestone', { game_id: 'hockey', kind, value })
  }

  function placeMallets(w: World) {
    const g = geo()
    w.me.x = g.cx
    w.me.y = g.y1 - g.th * 0.14
    w.me.tx = w.me.x
    w.me.ty = w.me.y
    w.cpu.x = g.cx
    w.cpu.y = g.y0 + g.th * 0.12
    w.me.big = 0
    w.cpu.big = 0
    w.me.frozen = 0
    w.cpu.frozen = 0
  }

  function serve(w: World, to: Side) {
    const g = geo()
    w.pucks = [{ x: g.cx + rand(-g.tw * 0.15, g.tw * 0.15), y: to === 'p' ? g.cy + g.th * 0.18 : g.cy - g.th * 0.18, vx: 0, vy: 0, last: to, trail: [], alive: true }]
    // Nova's signature: every serve drops a second puck on the other half.
    if (w.opp.special === 'twin' && phaseRef.current === 'play') {
      w.pucks.push({ x: g.cx + rand(-g.tw * 0.25, g.tw * 0.25), y: to === 'p' ? g.cy - g.th * 0.2 : g.cy + g.th * 0.2, vx: 0, vy: 0, last: to === 'p' ? 'c' : 'p', trail: [], alive: true })
    }
  }

  function startMatch(w: World) {
    const r = rivalFor(w.stage)
    w.opp = r.opp
    w.tier = r.tier
    w.arena = r.arena
    w.dashT = 3.5
    w.dashing = 0
    w.wallT = 5
    w.wallOn = false
    w.matchT = 0
    w.ps = run.level('head')
    w.cs = 0
    w.matchGoals = 0
    w.power = null
    w.powerT = 7
    w.guardUsed = false
    w.shield = w.perks.guard > 0 ? 1 : 0
    w.mood = 0
    w.vsT = 2.2
    w.stats.stage = Math.max(w.stats.stage, w.stage + 1)
    placeMallets(w)
    w.pucks = []
    w.serveTo = 'p'
    w.serveT = 0.01
    pushHud()
    sfx.ready()
  }

  function start(level: number = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    // Each rival is a level: the map can replay any beaten rival, Play continues at the next one.
    w.stage = Math.max(0, (typeof level === 'number' && level > 0 ? Math.floor(level) : run.nextLevel) - 1)
    w.stats.stage = w.stage + 1
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    startMatch(w)
  }

  function oppSpeed(w: World) {
    return Math.min(2.9, w.opp.speed * (1 + w.tier * 0.12)) * (1 - w.perks.slow * 0.08) * (w.dashing > 0 ? 1.7 : 1)
  }

  function goal(w: World, p: Puck, scorer: Side) {
    const g = geo()
    p.alive = false
    const live = phaseRef.current === 'play'
    const gy = scorer === 'p' ? g.y0 : g.y1
    // Shield: the first shot on your goal bounces back.
    if (scorer === 'c' && live && (w.shield > 0 || w.inv > 0)) {
      p.alive = true
      p.y = g.y1 - g.pr - 2
      p.vy = -Math.abs(p.vy) * 0.8
      if (w.shield > 0 && w.inv <= 0) w.shield = 0
      fx.ring(p.x, g.y1, { color: '#7dd3fc', maxR: 60, life: 0.4 })
      fx.text(p.x, g.y1 - 40, 'BLOCKED!', '#7dd3fc', 18)
      if (au()) sfx.clang()
      return
    }
    // Aegis forcefield: while it is up, the rival's goal is sealed.
    if (scorer === 'p' && live && w.wallOn) {
      p.alive = true
      p.y = g.y0 + g.pr + 2
      p.vy = Math.abs(p.vy) * 0.8
      fx.ring(p.x, g.y0, { color: w.opp.color, maxR: 60, life: 0.4 })
      fx.text(p.x, g.y0 + 40, 'SHIELDED!', w.opp.color, 18)
      if (au()) sfx.clang()
      return
    }
    w.goalFlash = { side: scorer, t: 0 }
    fx.explode(p.x, gy, 1.4, scorer === 'p' ? ['#22d3ee', '#a5f3fc', '#ffffff', '#38bdf8'] : [w.opp.color, '#ffffff', '#f472b6', w.opp.color])
    fx.burst(p.x, gy, { count: 30, color: scorer === 'p' ? ['#22d3ee', '#ffffff'] : [w.opp.color, '#ffffff'], speed: 380, angle: scorer === 'p' ? Math.PI / 2 : -Math.PI / 2, spread: 2.2, shape: 'spark' })
    if (!live) {
      if (!w.pucks.some((q) => q.alive)) {
        w.serveTo = scorer === 'p' ? 'c' : 'p'
        w.serveT = 1
      }
      return
    }
    fx.stop(0.1)
    fx.shake(10, 0.35)
    if (scorer === 'p') {
      w.ps += 1
      w.matchGoals += 1
      w.stats.goals += 1
      w.score += 10 * (w.stage + 1)
      w.mood = -1
      fx.text(g.cx, g.cy - 40, 'GOAL!', '#67e8f9', 30)
      fx.flash('#22d3ee', 0.2)
      sfx.score(w.ps)
      sfx.boom(0.4)
      haptic.success()
    } else {
      w.cs += 1
      w.mood = 1
      fx.text(g.cx, g.cy + 40, `${w.opp.name.toUpperCase()} SCORES`, '#fca5a5', 20)
      fx.flash('#ef4444', 0.22)
      sfx.hurt()
      haptic.error()
    }
    run.update(w.stats)
    pushHud()
    if (w.ps >= WIN_SCORE) {
      winMatch(w)
      return
    }
    if (w.cs >= WIN_SCORE) {
      loseMatch()
      return
    }
    if (!w.pucks.some((q) => q.alive)) {
      w.serveTo = scorer === 'p' ? 'c' : 'p'
      w.serveT = 1.1
    }
  }

  function winMatch(w: World) {
    w.stats.wins += 1
    const shut = w.cs === 0
    if (shut) w.stats.shutouts += 1
    if (w.opp.boss) {
      w.stats.bosses += 1
      milestone('boss', w.stage + 1)
    } else if ((w.stage + 1) % 3 === 0) milestone('stage', w.stage + 1)
    const bonus = 100 * (w.stage + 1) + (shut ? 200 : 0)
    w.score += bonus
    w.pucks = []
    // Stars: win = 1, concede 3 or fewer = 2, concede at most 1 = 3.
    const stars = 1 + (w.cs <= 3 ? 1 : 0) + (w.cs <= 1 ? 1 : 0)
    run.completeLevel(w.stage + 1, stars)
    run.update(w.stats)
    pushHud()
    setBanner({ key: Date.now(), text: w.opp.boss ? 'CHAMPION!' : 'YOU WIN!', sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${shut ? 'shutout ' : ''}+${bonus}` })
    sfx.win()
    fx.slowmo(0.6, 0.4)
    window.setTimeout(() => {
      if (phaseRef.current !== 'play') return
      const pool = [...PERKS].sort(() => Math.random() - 0.5).slice(0, 3)
      setChoices(pool)
      setPhaseBoth('perk')
    }, 1500)
  }

  function choosePerk(p: Perk) {
    const w = world.current
    w.perks[p.id] += 1
    w.stage += 1
    sfx.power()
    haptic.medium()
    setPhaseBoth('play')
    startMatch(w)
  }

  function loseMatch() {
    const w = world.current
    setPhaseBoth('dying')
    fx.slowmo(1, 0.3)
    sfx.lose()
    setBanner({ key: Date.now(), text: 'DEFEAT', sub: `${w.ps} – ${w.cs}` })
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(4 + w.stats.wins * 8 + w.stats.goals * 0.6 + w.stats.bosses * 15)
      run.end({ score: w.score, cleared: w.stats.wins >= 2, stats: { ...w.stats }, coins }, revive)
    }, 1300)
  }

  /** Ad revive: the rival drops back to 4 goals, you serve, and your goal is shielded briefly. */
  function revive() {
    const w = world.current
    w.cs = Math.min(w.cs, 4)
    w.inv = 3
    placeMallets(w)
    serve(w, 'p')
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: `${w.ps} – ${w.cs} · keep going` })
    pushHud()
    setPhaseBoth('play')
  }

  function grantPower(w: World, kind: PowerKind, to: Side) {
    const g = geo()
    const dur = 8 + run.level('drops') * 1
    const mine = to === 'p'
    if (mine) w.stats.powerups += 1
    if (kind === 'big') {
      ;(mine ? w.me : w.cpu).big = dur
    } else if (kind === 'freeze') {
      ;(mine ? w.cpu : w.me).frozen = 2.6
    } else {
      const src = w.pucks.find((q) => q.alive)
      if (src && w.pucks.length < 3) {
        const sp = Math.hypot(src.vx, src.vy) || g.th
        const a = Math.atan2(src.vy, src.vx) + 0.6
        w.pucks.push({ x: src.x, y: src.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, last: to, trail: [], alive: true })
        src.vx = Math.cos(a - 1.2) * sp
        src.vy = Math.sin(a - 1.2) * sp
      }
    }
    if (au()) {
      fx.text(g.cx, g.cy, `${mine ? '' : w.opp.name.toUpperCase() + ': '}${POWER_NAME[kind]}`, POWER_COLOR[kind], 20)
      sfx.power()
      haptic.medium()
    }
    run.update(w.stats)
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    pointer.current = { id: e.pointerId, x: p.x, y: p.y }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const pt = pointer.current
    if (!pt || pt.id !== e.pointerId) return
    const p = localPoint(e, e.currentTarget)
    pt.x = p.x
    pt.y = p.y
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current?.id === e.pointerId) pointer.current = null
  }

  useEffect(() => {
    function set(e: KeyboardEvent, v: boolean) {
      const k = keys.current
      if (e.key === 'ArrowLeft' || e.key === 'a') k.l = v
      else if (e.key === 'ArrowRight' || e.key === 'd') k.r = v
      else if (e.key === 'ArrowUp' || e.key === 'w') k.u = v
      else if (e.key === 'ArrowDown' || e.key === 's') k.d = v
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

  function moveMallet(m: Mallet, maxSpeed: number, r: number, mine: boolean, dt: number) {
    const g = geo()
    const w = world.current
    const reach = mine ? w.perks.reach * g.th * 0.04 : 0
    const minY = mine ? g.cy + r * 0.2 - reach : g.y0 + r
    const maxY = mine ? g.y1 - r : g.cy - r * 0.2
    const tx = clamp(m.tx, g.x0 + r, g.x1 - r)
    const ty = clamp(m.ty, minY, maxY)
    m.px = m.x
    m.py = m.y
    const ox = m.x
    const oy = m.y
    if (m.frozen > 0) {
      m.vx = 0
      m.vy = 0
      return
    }
    const dx = tx - m.x
    const dy = ty - m.y
    const d = Math.hypot(dx, dy)
    const step = maxSpeed * dt
    if (d > step) {
      m.x += (dx / d) * step
      m.y += (dy / d) * step
    } else {
      m.x = tx
      m.y = ty
    }
    if (dt > 0) {
      m.vx = (m.x - ox) / dt
      m.vy = (m.y - oy) / dt
    }
  }

  function collide(p: Puck, m: Mallet, r: number, who: Side) {
    const g = geo()
    const w = world.current
    const dx = p.x - m.x
    const dy = p.y - m.y
    const d = Math.hypot(dx, dy)
    const min = r + g.pr
    if (d >= min || d === 0) return
    const nx = dx / d
    const ny = dy / d
    p.x = m.x + nx * (min + 0.5)
    p.y = m.y + ny * (min + 0.5)
    const rvx = p.vx - m.vx
    const rvy = p.vy - m.vy
    const vn = rvx * nx + rvy * ny
    if (vn < 0) {
      const boost = who === 'p' ? 1 + w.perks.shot * 0.12 : 1
      p.vx -= 1.9 * vn * nx
      p.vy -= 1.9 * vn * ny
      p.vx = p.vx * boost
      p.vy = p.vy * boost
      const maxS = g.th * 2.3 * (who === 'p' ? boost : 1)
      const s = Math.hypot(p.vx, p.vy)
      if (s > maxS) {
        p.vx *= maxS / s
        p.vy *= maxS / s
      }
      p.last = who
      const impact = Math.min(1, -vn / (g.th * 2))
      const now = performance.now()
      if (impact > 0.08 && now - lastHitAt.current > 120) {
        lastHitAt.current = now
        fx.burst(p.x - nx * g.pr, p.y - ny * g.pr, { count: 4 + Math.round(impact * 10), color: who === 'p' ? ['#67e8f9', '#ffffff'] : [w.opp.color, '#ffffff'], speed: 120 + impact * 260, size: 2.5, shape: 'spark', gravity: 0 })
        if (au()) {
          if (impact > 0.5) {
            sfx.hit()
            fx.shake(3 * impact, 0.1)
            fx.stop(0.03)
          } else sfx.tap()
          if (who === 'p') haptic.light()
        }
      }
    }
  }

  /** Predict where a puck crosses a given y, folding wall bounces. */
  function predictX(p: Puck, y: number) {
    const g = geo()
    if (Math.abs(p.vy) < 1) return p.x
    const t = (y - p.y) / p.vy
    if (t < 0) return p.x
    const L = g.x0 + g.pr
    const R = g.x1 - g.pr
    const span = R - L
    let x = p.x + p.vx * t - L
    x = ((x % (2 * span)) + 2 * span) % (2 * span)
    if (x > span) x = 2 * span - x
    return L + x
  }

  function updateAI(w: World, dt: number) {
    const g = geo()
    const o = w.opp
    const m = w.cpu
    const r = malletR(m, false)
    const puck = w.pucks.filter((q) => q.alive).sort((a, b) => a.y - b.y)[0]
    const homeY = g.y0 + g.th * 0.5 * o.defY
    w.aiT -= dt
    if (!puck) {
      m.tx = g.cx
      m.ty = homeY
      return
    }
    const inHalf = puck.y < g.cy
    const slow = Math.hypot(puck.vx, puck.vy) < g.th * 0.5
    const coming = puck.vy < 0
    if (w.aiState === 'strike') {
      if (w.aiT <= 0 || !inHalf || puck.y < m.y - r) w.aiState = 'defend'
    } else if (inHalf && (slow || (Math.random() < o.aggr * dt * 4 && Math.hypot(puck.vx, puck.vy) < g.th * 1.6) || (o.aggr > 0.8 && puck.y < g.cy - g.th * 0.05))) {
      if (w.aiState !== 'line') {
        w.aiState = 'line'
        w.aiT = 0.9
        // Aim at the player's goal; tricksters go for a bank off the side wall.
        const bank = Math.random() < o.trick
        w.aiAim = bank ? (Math.random() < 0.5 ? g.x0 - g.tw * 0.5 : g.x1 + g.tw * 0.5) : g.cx + rand(-g.goalW * 0.4, g.goalW * 0.4)
      }
    }
    if (w.aiState === 'line') {
      if (!inHalf) w.aiState = 'defend'
      else if (w.aiT <= 0) {
        w.aiState = 'strike'
        w.aiT = 0.3
      }
    }

    if (w.aiState === 'defend') {
      const lineY = homeY
      const px = coming ? predictX(puck, lineY) : g.cx + (puck.x - g.cx) * 0.5
      const err = o.err * g.goalW * 0.5 * Math.sin(performance.now() / 400)
      m.tx = clamp(px + err, g.cx - g.goalW * 0.75, g.cx + g.goalW * 0.75)
      m.ty = lineY
    } else {
      // Line up behind the puck relative to the aim point, then drive through it.
      const ax = w.aiAim
      const ay = g.y1
      const dx = ax - puck.x
      const dy = ay - puck.y
      const dl = Math.hypot(dx, dy) || 1
      const bx = puck.x - (dx / dl) * (r + g.pr + 8)
      const by = puck.y - (dy / dl) * (r + g.pr + 8)
      if (w.aiState === 'line') {
        m.tx = bx
        m.ty = Math.min(by, puck.y - r * 0.5)
        if (Math.hypot(m.x - bx, m.y - by) < r * 0.6) {
          w.aiState = 'strike'
          w.aiT = 0.35
        }
      } else {
        m.tx = puck.x + (dx / dl) * g.th * 0.25 * (0.6 + o.aggr * 0.6)
        m.ty = puck.y + (dy / dl) * g.th * 0.25 * (0.6 + o.aggr * 0.6)
      }
    }
    // Feints: Mirage and the boss twitch sideways while defending.
    if (o.trick > 0.5 && w.aiState === 'defend') m.tx += Math.sin(performance.now() / 160) * g.tw * 0.04
  }

  /** Champion signature tricks, all telegraphed. */
  function updateSpecial(w: World, dt: number) {
    const g = geo()
    w.matchT += dt
    const sp = w.opp.special
    if (sp === 'dash') {
      w.dashing = Math.max(0, w.dashing - dt)
      w.dashT -= dt
      if (w.dashT <= 0) {
        w.dashT = rand(3.6, 5.2)
        w.dashing = 0.55
        if (w.pucks.some((q) => q.alive && q.y < g.cy)) {
          w.aiState = 'strike'
          w.aiT = 0.5
        }
        fx.ring(w.cpu.x, w.cpu.y, { color: w.opp.color, maxR: g.mr * 2.4, life: 0.35 })
        if (au()) sfx.whoosh()
      }
    } else if (sp === 'wall') {
      w.wallT -= dt
      if (w.wallT <= 0) {
        w.wallOn = !w.wallOn
        w.wallT = w.wallOn ? 2.6 : rand(4.5, 6)
        if (w.wallOn) {
          fx.ring(g.cx, g.y0, { color: w.opp.color, maxR: g.goalW, life: 0.4 })
          if (au()) sfx.power()
        }
      }
    }
  }

  function updatePucks(w: World, dt: number) {
    const g = geo()
    const steps = 6
    let meX = w.me.x
    let meY = w.me.y
    let cX = w.cpu.x
    let cY = w.cpu.y
    const sdt = dt / steps
    const rMe = malletR(w.me, true)
    const rCpu = malletR(w.cpu, false)
    for (let s = 0; s < steps; s++) {
      // Sweep the mallets through the frame too, so fast swipes cannot tunnel through the puck.
      const k = (s + 1) / steps
      w.me.x = w.me.px + (meX - w.me.px) * k
      w.me.y = w.me.py + (meY - w.me.py) * k
      w.cpu.x = w.cpu.px + (cX - w.cpu.px) * k
      w.cpu.y = w.cpu.py + (cY - w.cpu.py) * k
      for (const p of w.pucks) {
        if (!p.alive) continue
        p.x += p.vx * sdt
        p.y += p.vy * sdt
        collide(p, w.me, rMe, 'p')
        collide(p, w.cpu, rCpu, 'c')
        const fr = Math.exp(-0.32 * w.arena.friction * sdt)
        p.vx *= fr
        p.vy *= fr
        if (w.arena.wind) p.vx += w.arena.wind * g.th * Math.sin(w.matchT * 0.6) * sdt
        for (const b of w.arena.bumpers) bumper(p, g.x0 + b.x * g.tw, g.y0 + b.y * g.th, b.r * g.tw)
        if (p.x < g.x0 + g.pr) {
          p.x = g.x0 + g.pr
          p.vx = Math.abs(p.vx) * 0.9
          wallHit(p)
        } else if (p.x > g.x1 - g.pr) {
          p.x = g.x1 - g.pr
          p.vx = -Math.abs(p.vx) * 0.9
          wallHit(p)
        }
        const inMouth = Math.abs(p.x - g.cx) < g.goalW / 2 - g.pr * 0.3
        if (p.y < g.y0 + g.pr) {
          if (inMouth) {
            // Slots suck in a puck that dribbles over the lip.
            p.vy -= 300 * sdt
            if (p.y < g.y0 - g.pr * 0.2) goal(w, p, 'p')
          } else {
            p.y = g.y0 + g.pr
            p.vy = Math.abs(p.vy) * 0.9
            wallHit(p)
          }
        } else if (p.y > g.y1 - g.pr) {
          if (inMouth) {
            p.vy += 300 * sdt
            if (p.y > g.y1 + g.pr * 0.2) goal(w, p, 'c')
          } else {
            p.y = g.y1 - g.pr
            p.vy = -Math.abs(p.vy) * 0.9
            wallHit(p)
          }
        }
        if (!p.alive) continue
        // A puck pinned against a rail stops the mallet instead of tunnelling.
        if (unpin(p, w.me, rMe)) {
          meX = w.me.x
          meY = w.me.y
        }
        if (unpin(p, w.cpu, rCpu)) {
          cX = w.cpu.x
          cY = w.cpu.y
        }
        // Power-up pickup
        const pw = w.power
        if (pw && Math.hypot(p.x - pw.x, p.y - pw.y) < g.pr + g.mr * 0.45) {
          w.power = null
          fx.ring(pw.x, pw.y, { color: POWER_COLOR[pw.kind], maxR: 50, life: 0.4 })
          fx.burst(pw.x, pw.y, { count: 16, color: [POWER_COLOR[pw.kind], '#ffffff'], speed: 200, shape: 'spark', gravity: 0 })
          grantPower(w, pw.kind, p.last)
        }
      }
      // Pucks bounce off each other.
      if (w.pucks.length > 1) {
        for (let i = 0; i < w.pucks.length; i++) {
          for (let j = i + 1; j < w.pucks.length; j++) {
            const a = w.pucks[i]
            const b = w.pucks[j]
            if (!a.alive || !b.alive) continue
            const dx = b.x - a.x
            const dy = b.y - a.y
            const d = Math.hypot(dx, dy)
            if (d > 0 && d < g.pr * 2) {
              const nx = dx / d
              const ny = dy / d
              const push = (g.pr * 2 - d) / 2
              a.x -= nx * push
              a.y -= ny * push
              b.x += nx * push
              b.y += ny * push
              const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
              if (vn < 0) {
                a.vx += vn * nx
                a.vy += vn * ny
                b.vx -= vn * nx
                b.vy -= vn * ny
              }
            }
          }
        }
      }
    }
    for (const p of w.pucks) {
      p.trail.push(p.x, p.y)
      // Anti-stall: a puck dead against the rails for a while gets an air-jet puff toward the centre.
      const nearRail = p.x < g.x0 + g.pr * 2.2 || p.x > g.x1 - g.pr * 2.2 || p.y < g.y0 + g.pr * 2.2 || p.y > g.y1 - g.pr * 2.2
      if (nearRail && Math.hypot(p.vx, p.vy) < g.th * 0.12) p.stall = (p.stall ?? 0) + dt
      else p.stall = 0
      if ((p.stall ?? 0) > 2.2) {
        p.stall = 0
        const dx = g.cx - p.x
        const dy = g.cy - p.y
        const d = Math.hypot(dx, dy) || 1
        p.vx = (dx / d) * g.th * 0.55
        p.vy = (dy / d) * g.th * 0.55
        fx.ring(p.x, p.y, { color: '#e0f2fe', maxR: g.pr * 3, life: 0.4 })
        fx.burst(p.x, p.y, { count: 8, color: ['#e0f2fe', '#ffffff'], speed: 120, size: 2, gravity: 0 })
        if (au()) sfx.whoosh()
      }
      if (p.trail.length > 20) p.trail.splice(0, 2)
    }
    w.pucks = w.pucks.filter((p) => p.alive)
  }

  function bumper(p: Puck, bx: number, by: number, br: number) {
    const g = geo()
    const dx = p.x - bx
    const dy = p.y - by
    const d = Math.hypot(dx, dy)
    const min = br + g.pr
    if (d >= min || d === 0) return
    const nx = dx / d
    const ny = dy / d
    p.x = bx + nx * (min + 0.5)
    p.y = by + ny * (min + 0.5)
    const vn = p.vx * nx + p.vy * ny
    if (vn < 0) {
      // Springy bumper: reflect with a small kick.
      p.vx -= 2.1 * vn * nx
      p.vy -= 2.1 * vn * ny
      const now = performance.now()
      if (now - lastHitAt.current > 90) {
        lastHitAt.current = now
        bumpFlash.current = 1
        fx.burst(bx + nx * br, by + ny * br, { count: 6, color: [world.current.arena.rail, '#ffffff'], speed: 150, size: 2, shape: 'spark', gravity: 0 })
        if (au()) sfx.pop()
      }
    }
  }

  function unpin(p: Puck, m: Mallet, r: number) {
    const g = geo()
    const dx = m.x - p.x
    const dy = m.y - p.y
    const d = Math.hypot(dx, dy)
    const min = r + g.pr
    if (d >= min - 0.5 || d === 0) return false
    m.x = p.x + (dx / d) * min
    m.y = p.y + (dy / d) * min
    m.px = m.x
    m.py = m.y
    return true
  }

  function wallHit(p: Puck) {
    const s = Math.hypot(p.vx, p.vy)
    if (s > geo().th * 0.6) {
      fx.burst(p.x, p.y, { count: 4, color: ['#a5f3fc', '#ffffff'], speed: 100, size: 2, shape: 'spark', gravity: 0 })
      if (au()) sfx.tick()
    }
  }

  // ── Drawing ─────────────────────────────────────────────

  function buildTable(W: number, H: number, A: Arena) {
    const g = geo()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const c = document.createElement('canvas')
    c.width = Math.round(W * dpr)
    c.height = Math.round(H * dpr)
    const x = c.getContext('2d')!
    x.scale(dpr, dpr)
    const bg = x.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, A.bg[0])
    bg.addColorStop(1, A.bg[1])
    x.fillStyle = bg
    x.fillRect(0, 0, W, H)
    // Rails
    x.fillStyle = '#1e293b'
    x.beginPath()
    x.roundRect(g.x0 - 9, g.y0 - 9, g.tw + 18, g.th + 18, 24)
    x.fill()
    const surf = x.createRadialGradient(g.cx, g.cy, g.tw * 0.1, g.cx, g.cy, g.th * 0.7)
    surf.addColorStop(0, A.surf[0])
    surf.addColorStop(1, A.surf[1])
    x.fillStyle = surf
    x.beginPath()
    x.roundRect(g.x0, g.y0, g.tw, g.th, 18)
    x.fill()
    // Air holes
    x.fillStyle = A.dots
    const step = Math.max(14, g.tw / 18)
    for (let yy = g.y0 + step / 2; yy < g.y1; yy += step) {
      for (let xx = g.x0 + step / 2; xx < g.x1; xx += step) {
        x.beginPath()
        x.arc(xx, yy, 1.3, 0, Math.PI * 2)
        x.fill()
      }
    }
    // Lines
    x.lineWidth = 3
    x.strokeStyle = A.rail
    x.globalAlpha = 0.75
    x.beginPath()
    x.moveTo(g.x0, g.cy)
    x.lineTo(g.x1, g.cy)
    x.stroke()
    x.globalAlpha = 1
    x.strokeStyle = A.line
    x.beginPath()
    x.arc(g.cx, g.cy, g.tw * 0.18, 0, Math.PI * 2)
    x.stroke()
    x.fillStyle = A.line
    x.beginPath()
    x.arc(g.cx, g.cy, 4, 0, Math.PI * 2)
    x.fill()
    // Creases
    x.strokeStyle = A.rail
    x.globalAlpha = 0.55
    x.beginPath()
    x.arc(g.cx, g.y0, g.goalW * 0.62, 0, Math.PI)
    x.stroke()
    x.strokeStyle = 'rgba(103,232,249,0.9)'
    x.beginPath()
    x.arc(g.cx, g.y1, g.goalW * 0.62, Math.PI, Math.PI * 2)
    x.stroke()
    x.globalAlpha = 1
    // Neon rails
    x.lineWidth = 4
    x.strokeStyle = A.rail
    x.beginPath()
    x.moveTo(g.x0, g.cy)
    x.lineTo(g.x0, g.y0 + 18)
    x.arcTo(g.x0, g.y0, g.x0 + 18, g.y0, 18)
    x.lineTo(g.cx - g.goalW / 2, g.y0)
    x.moveTo(g.cx + g.goalW / 2, g.y0)
    x.lineTo(g.x1 - 18, g.y0)
    x.arcTo(g.x1, g.y0, g.x1, g.y0 + 18, 18)
    x.lineTo(g.x1, g.cy)
    x.stroke()
    x.strokeStyle = '#22d3ee'
    x.beginPath()
    x.moveTo(g.x0, g.cy)
    x.lineTo(g.x0, g.y1 - 18)
    x.arcTo(g.x0, g.y1, g.x0 + 18, g.y1, 18)
    x.lineTo(g.cx - g.goalW / 2, g.y1)
    x.moveTo(g.cx + g.goalW / 2, g.y1)
    x.lineTo(g.x1 - 18, g.y1)
    x.arcTo(g.x1, g.y1, g.x1, g.y1 - 18, 18)
    x.lineTo(g.x1, g.cy)
    x.stroke()
    // Goal slots
    x.fillStyle = '#000000'
    x.fillRect(g.cx - g.goalW / 2, g.y0 - 9, g.goalW, 9)
    x.fillRect(g.cx - g.goalW / 2, g.y1, g.goalW, 9)
    return c
  }

  function drawFace(ctx: CanvasRenderingContext2D, o: Opp, x: number, y: number, r: number, mood: number, time: number) {
    ctx.fillStyle = o.face
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = o.dark
    ctx.lineWidth = Math.max(1.5, r * 0.08)
    ctx.stroke()
    const blink = Math.sin(time * 1.7 + o.name.length) > 0.97
    const ex = r * 0.38
    const ey = y - r * 0.12
    ctx.fillStyle = o.dark
    ctx.strokeStyle = o.dark
    if (o.eyes === 'robot') {
      ctx.fillRect(x - ex - r * 0.16, ey - r * 0.14, r * 0.32, blink ? r * 0.05 : r * 0.28)
      ctx.fillRect(x + ex - r * 0.16, ey - r * 0.14, r * 0.32, blink ? r * 0.05 : r * 0.28)
      ctx.beginPath()
      ctx.moveTo(x, y - r)
      ctx.lineTo(x, y - r * 1.35)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, y - r * 1.4, r * 0.12, 0, Math.PI * 2)
      ctx.fillStyle = o.color
      ctx.fill()
      ctx.fillStyle = o.dark
    } else if (o.eyes === 'visor') {
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.roundRect(x - r * 0.75, ey - r * 0.2, r * 1.5, r * 0.4, r * 0.2)
      ctx.fill()
      ctx.fillStyle = o.color
      ctx.fillRect(x - r * 0.6 + ((Math.sin(time * 3) + 1) / 2) * r * 0.9, ey - r * 0.08, r * 0.3, r * 0.16)
      ctx.fillStyle = o.dark
    } else if (o.eyes === 'mask') {
      ctx.fillStyle = o.dark
      ctx.beginPath()
      ctx.ellipse(x, ey, r * 0.8, r * 0.26, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(x - ex, ey, r * 0.15, blink ? r * 0.02 : r * 0.1, 0, 0, Math.PI * 2)
      ctx.ellipse(x + ex, ey, r * 0.15, blink ? r * 0.02 : r * 0.1, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = o.dark
    } else if (o.eyes === 'shades') {
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.roundRect(x - ex - r * 0.26, ey - r * 0.16, r * 0.5, r * 0.3, r * 0.1)
      ctx.roundRect(x + ex - r * 0.24, ey - r * 0.16, r * 0.5, r * 0.3, r * 0.1)
      ctx.fill()
      ctx.fillRect(x - r * 0.14, ey - r * 0.08, r * 0.28, r * 0.06)
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.fillRect(x - ex - r * 0.16, ey - r * 0.1, r * 0.12, r * 0.06)
      ctx.fillRect(x + ex - r * 0.14, ey - r * 0.1, r * 0.12, r * 0.06)
      ctx.fillStyle = o.dark
    } else if (o.eyes === 'cyclops') {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(x, ey, r * 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = o.dark
      ctx.beginPath()
      ctx.ellipse(x + Math.sin(time * 1.3) * r * 0.1, ey, r * 0.13, blink ? r * 0.02 : r * 0.15, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (o.eyes === 'happy' || o.eyes === 'sleepy') {
      ctx.lineWidth = Math.max(1.5, r * 0.1)
      ctx.lineCap = 'round'
      ctx.beginPath()
      if (o.eyes === 'happy') {
        ctx.arc(x - ex, ey + r * 0.06, r * 0.14, Math.PI * 1.1, Math.PI * 1.9)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(x + ex, ey + r * 0.06, r * 0.14, Math.PI * 1.1, Math.PI * 1.9)
      } else {
        ctx.moveTo(x - ex - r * 0.15, ey)
        ctx.lineTo(x - ex + r * 0.15, ey)
        ctx.moveTo(x + ex - r * 0.15, ey)
        ctx.lineTo(x + ex + r * 0.15, ey)
      }
      ctx.stroke()
      if (o.eyes === 'happy') {
        ctx.fillStyle = 'rgba(244,114,182,0.45)'
        ctx.beginPath()
        ctx.arc(x - ex - r * 0.08, ey + r * 0.3, r * 0.12, 0, Math.PI * 2)
        ctx.arc(x + ex + r * 0.08, ey + r * 0.3, r * 0.12, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = o.dark
      }
    } else {
      const er = r * (o.eyes === 'brute' ? 0.1 : 0.14)
      ctx.beginPath()
      ctx.ellipse(x - ex, ey, er, blink ? er * 0.2 : er * 1.2, 0, 0, Math.PI * 2)
      ctx.ellipse(x + ex, ey, er, blink ? er * 0.2 : er * 1.2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = Math.max(1.5, r * 0.1)
      ctx.lineCap = 'round'
      if (o.eyes === 'angry' || o.eyes === 'brute' || o.eyes === 'crown' || mood < 0) {
        ctx.beginPath()
        ctx.moveTo(x - ex - r * 0.2, ey - r * 0.32)
        ctx.lineTo(x - ex + r * 0.15, ey - r * 0.18)
        ctx.moveTo(x + ex + r * 0.2, ey - r * 0.32)
        ctx.lineTo(x + ex - r * 0.15, ey - r * 0.18)
        ctx.stroke()
      } else if (o.eyes === 'sly') {
        ctx.beginPath()
        ctx.moveTo(x - ex - r * 0.2, ey - r * 0.2)
        ctx.lineTo(x - ex + r * 0.18, ey - r * 0.3)
        ctx.moveTo(x + ex - r * 0.18, ey - r * 0.3)
        ctx.lineTo(x + ex + r * 0.2, ey - r * 0.2)
        ctx.stroke()
      } else if (o.eyes === 'block') {
        ctx.fillRect(x - r * 0.65, ey - r * 0.36, r * 1.3, r * 0.14)
      }
    }
    // Mouth reacts to the score.
    ctx.lineWidth = Math.max(1.5, r * 0.1)
    ctx.lineCap = 'round'
    ctx.strokeStyle = o.dark
    ctx.beginPath()
    const my = y + r * 0.42
    if (mood > 0) ctx.arc(x, my - r * 0.12, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI)
    else if (mood < 0) ctx.arc(x, my + r * 0.12, r * 0.26, 1.15 * Math.PI, 1.85 * Math.PI)
    else {
      ctx.moveTo(x - r * 0.22, my)
      ctx.lineTo(x + r * 0.22, my)
    }
    ctx.stroke()
    if (o.eyes === 'brute') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x - r * 0.2, my - r * 0.02, r * 0.12, r * 0.12)
      ctx.fillRect(x + r * 0.08, my - r * 0.02, r * 0.12, r * 0.12)
    }
    if (o.eyes === 'crown') {
      ctx.fillStyle = '#facc15'
      ctx.strokeStyle = '#a16207'
      ctx.lineWidth = Math.max(1, r * 0.06)
      ctx.beginPath()
      ctx.moveTo(x - r * 0.7, y - r * 0.75)
      ctx.lineTo(x - r * 0.75, y - r * 1.3)
      ctx.lineTo(x - r * 0.35, y - r * 1.0)
      ctx.lineTo(x, y - r * 1.45)
      ctx.lineTo(x + r * 0.35, y - r * 1.0)
      ctx.lineTo(x + r * 0.75, y - r * 1.3)
      ctx.lineTo(x + r * 0.7, y - r * 0.75)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    drawHat(ctx, o, x, y, r, time)
  }

  function drawHat(ctx: CanvasRenderingContext2D, o: Opp, x: number, y: number, r: number, time: number) {
    const lw = Math.max(1, r * 0.07)
    ctx.lineWidth = lw
    ctx.strokeStyle = o.dark
    if (o.hat === 'beanie') {
      ctx.fillStyle = o.color
      ctx.beginPath()
      ctx.arc(x, y - r * 0.35, r * 0.82, Math.PI, Math.PI * 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(x - r * 0.86, y - r * 0.44, r * 1.72, r * 0.2)
      ctx.beginPath()
      ctx.arc(x, y - r * 1.2, r * 0.18, 0, Math.PI * 2)
      ctx.fill()
    } else if (o.hat === 'horns') {
      ctx.fillStyle = '#f5f5f4'
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(x + s * r * 0.55, y - r * 0.7)
        ctx.quadraticCurveTo(x + s * r * 1.15, y - r * 0.9, x + s * r * 1.05, y - r * 1.45)
        ctx.quadraticCurveTo(x + s * r * 0.85, y - r * 1.0, x + s * r * 0.3, y - r * 0.92)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    } else if (o.hat === 'band') {
      ctx.fillStyle = o.color
      ctx.fillRect(x - r * 0.95, y - r * 0.55, r * 1.9, r * 0.2)
      ctx.beginPath()
      const flap = Math.sin(time * 6) * r * 0.12
      ctx.moveTo(x + r * 0.85, y - r * 0.5)
      ctx.lineTo(x + r * 1.45, y - r * 0.75 + flap)
      ctx.lineTo(x + r * 1.35, y - r * 0.35 + flap)
      ctx.closePath()
      ctx.fill()
    } else if (o.hat === 'halo') {
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = Math.max(1.5, r * 0.1)
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.ellipse(x, y - r * 1.25 + Math.sin(time * 2) * r * 0.05, r * 0.6, r * 0.18, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    } else if (o.hat === 'mohawk') {
      ctx.fillStyle = '#fb923c'
      ctx.beginPath()
      ctx.moveTo(x - r * 0.3, y - r * 0.85)
      for (let i = 0; i < 5; i++) {
        const px = x - r * 0.3 + (i + 0.5) * r * 0.12
        ctx.lineTo(px, y - r * (1.35 + (i % 2) * 0.12) - Math.sin(time * 8 + i) * r * 0.04)
        ctx.lineTo(px + r * 0.06, y - r * 0.9)
      }
      ctx.lineTo(x + r * 0.3, y - r * 0.85)
      ctx.closePath()
      ctx.fill()
    } else if (o.hat === 'ears') {
      ctx.fillStyle = o.face
      for (const s of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(x + s * r * 0.25, y - r * 0.92)
        ctx.lineTo(x + s * r * 0.75, y - r * 1.45)
        ctx.lineTo(x + s * r * 0.85, y - r * 0.55)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
    } else if (o.hat === 'witch') {
      ctx.fillStyle = '#1e1b4b'
      ctx.beginPath()
      ctx.ellipse(x, y - r * 0.8, r * 1.1, r * 0.2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x - r * 0.55, y - r * 0.82)
      ctx.quadraticCurveTo(x - r * 0.1, y - r * 1.5, x + r * 0.5 + Math.sin(time * 2) * r * 0.1, y - r * 1.9)
      ctx.quadraticCurveTo(x + r * 0.2, y - r * 1.3, x + r * 0.55, y - r * 0.82)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = o.color
      ctx.fillRect(x - r * 0.5, y - r * 1.0, r * 1.0, r * 0.12)
    } else if (o.hat === 'helm') {
      ctx.fillStyle = '#64748b'
      ctx.beginPath()
      ctx.arc(x, y - r * 0.3, r * 0.92, Math.PI * 1.05, Math.PI * 1.95)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = o.color
      ctx.beginPath()
      ctx.moveTo(x - r * 0.12, y - r * 1.2)
      ctx.lineTo(x, y - r * 1.55)
      ctx.lineTo(x + r * 0.12, y - r * 1.2)
      ctx.closePath()
      ctx.fill()
    }
  }

  function drawMallet(ctx: CanvasRenderingContext2D, m: Mallet, r: number, color: string, dark: string, time: number, face: Opp | null, mood: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.ellipse(m.x + 3, m.y + 5, r, r * 0.92, 0, 0, Math.PI * 2)
    ctx.fill()
    glow(ctx, m.x, m.y, r * 1.9, color, m.big > 0 ? 0.5 : 0.3)
    const g = ctx.createRadialGradient(m.x - r * 0.3, m.y - r * 0.35, r * 0.1, m.x, m.y, r)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.25, color)
    g.addColorStop(1, dark)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(m.x, m.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(m.x, m.y, r * 0.68, 0, Math.PI * 2)
    ctx.stroke()
    if (face) {
      drawFace(ctx, face, m.x, m.y, r * 0.58, mood, time)
    } else {
      const kg = ctx.createRadialGradient(m.x - r * 0.15, m.y - r * 0.2, 1, m.x, m.y, r * 0.5)
      kg.addColorStop(0, '#ffffff')
      kg.addColorStop(1, color)
      ctx.fillStyle = kg
      ctx.beginPath()
      ctx.arc(m.x, m.y, r * 0.46, 0, Math.PI * 2)
      ctx.fill()
    }
    if (m.frozen > 0) {
      ctx.globalAlpha = 0.6
      ctx.fillStyle = '#a5f3fc'
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3
        const rr = r * (i % 2 ? 1.05 : 1.25)
        if (i === 0) ctx.moveTo(m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr)
        else ctx.lineTo(m.x + Math.cos(a) * rr, m.y + Math.sin(a) * rr)
      }
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  function drawPuck(ctx: CanvasRenderingContext2D, p: Puck, r: number) {
    const tr = p.trail
    const col = p.last === 'p' ? '103,232,249' : '244,114,182'
    for (let i = 0; i < tr.length - 2; i += 2) {
      const k = i / tr.length
      ctx.fillStyle = `rgba(${col},${k * 0.35})`
      ctx.beginPath()
      ctx.arc(tr[i], tr[i + 1], r * (0.4 + k * 0.6), 0, Math.PI * 2)
      ctx.fill()
    }
    glow(ctx, p.x, p.y, r * 2.4, p.last === 'p' ? '#22d3ee' : '#f472b6', 0.45)
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.arc(p.x + 2, p.y + 3, r, 0, Math.PI * 2)
    ctx.fill()
    const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 1, p.x, p.y, r)
    g.addColorStop(0, '#475569')
    g.addColorStop(1, '#0f172a')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = p.last === 'p' ? '#67e8f9' : '#f9a8d4'
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(p.x, p.y, r * 0.55, 0, Math.PI * 2)
    ctx.stroke()
  }

  function drawPower(ctx: CanvasRenderingContext2D, pw: Power, time: number) {
    const g = geo()
    const r = g.mr * 0.45
    const col = POWER_COLOR[pw.kind]
    const blink = pw.life < 2 && Math.sin(time * 20) > 0
    if (blink) return
    const bob = 1 + Math.sin(time * 5) * 0.08
    glow(ctx, pw.x, pw.y, r * 2.6, col, 0.45)
    ctx.save()
    ctx.translate(pw.x, pw.y)
    ctx.scale(bob, bob)
    ctx.rotate(time * 0.8)
    ctx.fillStyle = '#0f172a'
    ctx.strokeStyle = col
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.rotate(-time * 0.8)
    ctx.fillStyle = col
    ctx.strokeStyle = col
    if (pw.kind === 'big') {
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2)
      ctx.stroke()
    } else if (pw.kind === 'split') {
      ctx.beginPath()
      ctx.arc(-r * 0.28, 0, r * 0.26, 0, Math.PI * 2)
      ctx.arc(r * 0.28, 0, r * 0.26, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI
        ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6)
        ctx.lineTo(-Math.cos(a) * r * 0.6, -Math.sin(a) * r * 0.6)
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  /** Bumpers, drift streaks and champion telegraphs drawn over the cached table. */
  function drawArenaFx(ctx: CanvasRenderingContext2D, w: World, time: number) {
    const g = geo()
    const A = w.arena
    bumpFlash.current = Math.max(0, bumpFlash.current - 0.05)
    for (const b of A.bumpers) {
      const bx = g.x0 + b.x * g.tw
      const by = g.y0 + b.y * g.th
      const br = b.r * g.tw
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.beginPath()
      ctx.arc(bx + 2, by + 4, br, 0, Math.PI * 2)
      ctx.fill()
      glow(ctx, bx, by, br * 2.4, A.rail, 0.25 + bumpFlash.current * 0.4)
      const bg = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.35, br * 0.1, bx, by, br)
      bg.addColorStop(0, '#ffffff')
      bg.addColorStop(0.35, A.rail)
      bg.addColorStop(1, A.bg[1])
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.arc(bx, by, br, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.globalAlpha = 0.5
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(bx, by, br * 0.62, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    if (A.wind) {
      // Drift streaks show which way the air is pushing the puck.
      const dir = Math.sin(w.matchT * 0.6)
      ctx.strokeStyle = A.line
      ctx.lineWidth = 1.5
      ctx.globalAlpha = Math.min(0.5, Math.abs(dir) * 0.6)
      ctx.beginPath()
      for (let i = 0; i < 7; i++) {
        const yy = g.y0 + g.th * (0.12 + i * 0.13)
        const xx = g.x0 + ((time * 70 * Math.sign(dir || 1) + i * 97) % g.tw + g.tw) % g.tw
        ctx.moveTo(xx, yy)
        ctx.lineTo(xx - Math.sign(dir || 1) * 26, yy)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    if (phaseRef.current !== 'play' && phaseRef.current !== 'dying') return
    if (w.opp.special === 'wall') {
      const warn = !w.wallOn && w.wallT < 0.9
      if (w.wallOn || (warn && Math.sin(time * 30) > 0)) {
        ctx.strokeStyle = w.opp.color
        ctx.lineWidth = w.wallOn ? 7 : 3
        ctx.globalAlpha = w.wallOn ? 0.75 + Math.sin(time * 10) * 0.2 : 0.6
        ctx.beginPath()
        ctx.moveTo(g.cx - g.goalW / 2, g.y0 + 3)
        ctx.lineTo(g.cx + g.goalW / 2, g.y0 + 3)
        ctx.stroke()
        if (w.wallOn) glow(ctx, g.cx, g.y0, g.goalW * 0.7, w.opp.color, 0.35)
        ctx.globalAlpha = 1
      }
    }
    if (w.opp.special === 'dash' && w.dashT < 0.7) {
      // Telegraph: the rival winds up with a tightening ring before lunging.
      const k = 1 - w.dashT / 0.7
      ctx.strokeStyle = w.opp.color
      ctx.lineWidth = 3
      ctx.globalAlpha = 0.4 + k * 0.5
      ctx.beginPath()
      ctx.arc(w.cpu.x, w.cpu.y, malletR(w.cpu, false) * (2.2 - k * 1), 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  }

  function simulate(raw: number, time: number) {
    const w = world.current
    const ph = phaseRef.current
    const dt = ph === 'perk' ? 0 : fx.step(raw)
    if (ph === 'perk') fx.step(0)
    const g = geo()

    if (w.me.x === 0) placeMallets(w)

    // Player control
    const pt = pointer.current
    const rMe = malletR(w.me, true)
    if (ph === 'play' && pt) {
      w.me.tx = pt.x
      w.me.ty = pt.y - rMe * 0.3
    }
    const k = keys.current
    if (k.l || k.r || k.u || k.d) {
      w.me.tx = w.me.x + ((k.r ? 1 : 0) - (k.l ? 1 : 0)) * g.th * 0.2
      w.me.ty = w.me.y + ((k.d ? 1 : 0) - (k.u ? 1 : 0)) * g.th * 0.2
    }
    if (ph === 'idle' || (import.meta.env.DEV && devAuto.current && ph === 'play')) {
      // Attract-mode autopilot: a simple defender-attacker.
      const p = w.pucks.find((q) => q.alive && q.y > g.cy)
      if (p) {
        const dx = g.cx - p.x
        const dy = g.y0 - p.y
        const dl = Math.hypot(dx, dy) || 1
        const bx = p.x - (dx / dl) * (rMe + g.pr + 4)
        const by = p.y - (dy / dl) * (rMe + g.pr + 4)
        if (by > g.y1 - rMe - 2) {
          // Puck tucked against our wall: sweep it sideways toward the centre.
          const side = p.x < g.cx ? -1 : 1
          const sx = p.x + side * (rMe + g.pr + 6)
          const near = Math.abs(w.me.x - sx) < 10 && Math.abs(w.me.y - p.y) < rMe
          w.me.tx = near ? p.x - side * 90 : sx
          w.me.ty = p.y
        } else if (w.me.y < p.y + 2) {
          // Wrong side of the puck: loop around it.
          w.me.tx = p.x + (w.me.x < p.x ? -1 : 1) * (rMe + g.pr + 14)
          w.me.ty = p.y + rMe
        } else if (Math.hypot(w.me.x - bx, w.me.y - by) < rMe * 0.6) {
          w.me.tx = p.x + (dx / dl) * 90
          w.me.ty = p.y + (dy / dl) * 90
        } else {
          w.me.tx = bx
          w.me.ty = by
        }
      } else {
        w.me.tx = g.cx + Math.sin(time) * g.tw * 0.2
        w.me.ty = g.y1 - g.th * 0.14
      }
    }

    const sim = ph === 'play' || ph === 'idle' || ph === 'dying'
    if (sim) {
      if (w.vsT > 0) w.vsT -= raw
      const paused = w.vsT > 0
      w.me.big = Math.max(0, w.me.big - dt)
      w.cpu.big = Math.max(0, w.cpu.big - dt)
      w.me.frozen = Math.max(0, w.me.frozen - dt)
      w.cpu.frozen = Math.max(0, w.cpu.frozen - dt)
      w.inv = Math.max(0, w.inv - dt)
      moveMallet(w.me, g.th * 5, rMe, true, dt)
      if (!paused) {
        if (ph !== 'dying') updateAI(w, dt)
        if (ph === 'play') updateSpecial(w, dt)
        moveMallet(w.cpu, g.th * oppSpeed(w), malletR(w.cpu, false), false, dt)
        if (w.serveT > 0) {
          w.serveT -= dt
          if (w.serveT <= 0 && w.pucks.length === 0) serve(w, w.serveTo)
        }
        if (dt > 0) updatePucks(w, dt)
        // Power-ups
        if (w.power) {
          w.power.life -= dt
          w.power.t += dt
          if (w.power.life <= 0) w.power = null
        } else if (w.pucks.length > 0) {
          w.powerT -= dt * (1 + w.perks.drops * 0.25)
          if (w.powerT <= 0) {
            w.powerT = rand(9, 14) * (1 - run.level('drops') * 0.12)
            const kinds: PowerKind[] = ['big', 'split', 'freeze']
            w.power = { x: g.cx + rand(-g.tw * 0.32, g.tw * 0.32), y: g.cy + rand(-g.th * 0.18, g.th * 0.18), kind: kinds[Math.floor(Math.random() * 3)], life: 7 + run.level('drops'), t: 0 }
            if (au()) sfx.pop()
          }
        }
      }
      w.goalFlash.t += raw
      w.mood *= Math.exp(-raw * 0.6)
      if (ph === 'idle' && w.pucks.length === 0 && w.serveT <= 0) {
        w.serveT = 0.6
      }
      if (ph === 'idle' && (w.ps >= WIN_SCORE || w.cs >= WIN_SCORE)) {
        w.ps = 0
        w.cs = 0
      }
    }

  }

  function frame({ ctx, w: W, h: H, raw, t: time }: Frame) {
    size.current = { w: W, h: H }
    const reps = import.meta.env.DEV ? devSpeed.current : 1
    for (let i = 0; i < reps; i++) simulate(raw, time)
    const w = world.current
    const ph = phaseRef.current
    const g = geo()
    const rMe = malletR(w.me, true)

    // ── Draw ──
    const key = `${W}x${H}:${w.arena.id}`
    if (bgCache.current.key !== key) bgCache.current = { key, c: buildTable(W, H, w.arena) }
    fx.applyShake(ctx)
    if (bgCache.current.c) ctx.drawImage(bgCache.current.c, 0, 0, W, H)

    // Big translucent match score in each half.
    if (ph !== 'idle') {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `900 ${Math.round(g.th * 0.16)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.fillStyle = 'rgba(244,114,182,0.14)'
      ctx.fillText(String(w.cs), g.cx, g.cy - g.th * 0.22)
      ctx.fillStyle = 'rgba(103,232,249,0.14)'
      ctx.fillText(String(w.ps), g.cx, g.cy + g.th * 0.22)
    }

    // Goal flash glow
    if (w.goalFlash.t < 1) {
      const a = 1 - w.goalFlash.t
      const gy = w.goalFlash.side === 'p' ? g.y0 : g.y1
      glow(ctx, g.cx, gy, g.goalW * 1.4, w.goalFlash.side === 'p' ? '#22d3ee' : w.opp.color, a * 0.8)
    }
    // Shield across your goal
    if (w.shield > 0 || w.inv > 0) {
      ctx.strokeStyle = '#7dd3fc'
      ctx.globalAlpha = 0.5 + Math.sin(time * 8) * 0.25
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(g.cx - g.goalW / 2, g.y1 - 2)
      ctx.lineTo(g.cx + g.goalW / 2, g.y1 - 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    drawArenaFx(ctx, w, time)
    if (w.power) drawPower(ctx, w.power, time)
    for (const p of w.pucks) drawPuck(ctx, p, g.pr)
    drawMallet(ctx, w.cpu, malletR(w.cpu, false), w.opp.color, w.opp.dark, time, w.opp, w.mood)
    drawMallet(ctx, w.me, rMe, '#22d3ee', '#0e7490', time, null, 0)

    // VS intro card
    if (w.vsT > 0 && ph === 'play') {
      const a = clamp(w.vsT / 0.4, 0, 1) * clamp((2.2 - w.vsT) / 0.25, 0, 1)
      ctx.globalAlpha = a * 0.75
      ctx.fillStyle = '#020617'
      ctx.fillRect(0, g.cy - g.th * 0.22, W, g.th * 0.46)
      ctx.globalAlpha = a
      drawFace(ctx, w.opp, g.cx, g.cy - g.th * 0.04, g.th * 0.085, 0, time)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `900 ${Math.round(g.th * 0.045)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.fillStyle = w.opp.color
      ctx.fillText(`${w.opp.boss ? 'BOSS · ' : ''}${w.opp.name.toUpperCase()}`, g.cx, g.cy + g.th * 0.09)
      ctx.font = `700 ${Math.round(g.th * 0.026)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.fillStyle = '#e2e8f0'
      ctx.fillText(`Level ${w.stage + 1}${w.tier > 0 ? ` · Tier ${w.tier + 1}` : ''} · ${w.arena.name} · first to 7`, g.cx, g.cy + g.th * 0.145)
      ctx.font = `italic 600 ${Math.round(g.th * 0.024)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.fillStyle = '#cbd5e1'
      ctx.fillText(`“${w.opp.taunt}”  ·  ${w.opp.style}`, g.cx, g.cy + g.th * 0.195)
      ctx.globalAlpha = 1
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
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Level {hud.stage}
                  {hud.tier > 0 ? ` · Tier ${hud.tier + 1}` : ''}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">{hud.name}</span>
                <span className="action-hud__score" style={{ fontSize: '1.4rem' }}>
                  <span style={{ color: '#67e8f9' }}>{hud.ps}</span> – <span style={{ color: '#f9a8d4' }}>{hud.cs}</span>
                </span>
              </div>
            </div>
          )}
          {banner && (phase === 'play' || phase === 'dying') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'perk' && (
            <div className="hockey-perk" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Rival beaten!</h3>
              <p>Pick a perk for the rest of the run</p>
              <div className="hockey-perk__list">
                {choices.map((p) => (
                  <button key={p.id} type="button" className="hockey-perk__card" onClick={() => choosePerk(p)}>
                    <span className="hockey-perk__icon">{p.icon}</span>
                    <strong>{p.label}</strong>
                    <span>{p.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === 'idle' && (
            <ActionIdle
              game="hockey"
              icon={meta.icon}
              title={meta.title}
              hint="Drag your mallet and smash the puck into the top goal. First to 7 — then climb the rival ladder."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.stage >= 3 ? 'Table legend!' : 'Knocked out!'}
            subtitle={`Score ${hud.score} · Level ${hud.stage} · ${hud.ps}–${hud.cs}`}
            celebrate={hud.stage >= 3}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
