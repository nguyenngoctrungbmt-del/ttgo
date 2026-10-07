import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { DX, DY, generate, hitDistance, occupancy, rayOf, specFor, type Arrow, type LevelSpec } from './engine'
import '../../shared/action/action.css'
import { LEVELS, authoredLevel } from './levels'
import './arrowescape.css'

const meta = getGame('arrowescape')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type Vis = { pts: number[]; s: number; v: number; state: 'rest' | 'fly' | 'bounce'; target: number; back: boolean; shake: number; pop: number; hint: number; trail: number; blocker: number }
type Coin = { x: number; y: number; t: number; d: number }

const PAL = [
  { base: '#14b8a6', light: '#5eead4', dark: '#0f766e' },
  { base: '#f43f5e', light: '#fda4af', dark: '#9f1239' },
  { base: '#f59e0b', light: '#fcd34d', dark: '#92400e' },
  { base: '#8b5cf6', light: '#c4b5fd', dark: '#4c1d95' },
  { base: '#0ea5e9', light: '#7dd3fc', dark: '#075985' },
  { base: '#84cc16', light: '#bef264', dark: '#3f6212' },
]

type World = {
  level: number
  spec: LevelSpec
  arrows: Arrow[]
  stones: number[]
  vis: Vis[]
  hearts: number
  maxHearts: number
  shield: boolean
  hints: number
  hammers: number
  shields: number
  mode: 'none' | 'hammer'
  hits: number
  score: number
  coins: number
  combo: number
  comboT: number
  failT: number
  clearT: number
  idleT: number
  flying: Coin[]
  stats: { score: number; level: number; arrows: number; flawless: number; hard: number }
}

function freshWorld(): World {
  return {
    level: 0,
    spec: specFor(3),
    arrows: [],
    stones: [],
    vis: [],
    hearts: 3,
    maxHearts: 3,
    shield: false,
    hints: 2,
    hammers: 1,
    shields: 1,
    mode: 'none',
    hits: 0,
    score: 0,
    coins: 0,
    combo: 0,
    comboT: 0,
    failT: 0,
    clearT: 0,
    idleT: 1,
    flying: [],
    stats: { score: 0, level: 1, arrows: 0, flawless: 0, hard: 0 },
  }
}

const HintIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" fill="currentColor" fillOpacity="0.3" />
  </svg>
)
const HammerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4l6 6-3 3-6-6zM11 7l-8 8 3 3 8-8" />
  </svg>
)
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" fill="currentColor" fillOpacity="0.3" />
  </svg>
)
const Heart = ({ lost }: { lost: boolean }) => (
  <svg viewBox="0 0 24 24" className={lost ? 'is-lost' : ''}>
    <path d="M12 21s-7.5-4.6-9.5-9.3C1 7.9 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 6 3.4 4.5 7.2C19.5 16.4 12 21 12 21z" fill="#f43f5e" stroke="#9f1239" strokeWidth="1.5" />
    <ellipse cx="8" cy="9" rx="2" ry="1.3" fill="#fff" opacity="0.6" />
  </svg>
)

export default function ArrowEscapeGame() {
  const run = useActionRun('arrowescape')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 620 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const lastEvent = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hard: false, coins: 0, hearts: 3, maxHearts: 3, shield: false, hints: 0, hammers: 0, shields: 0, mode: 'none' as World['mode'], left: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string; stars?: number; hard?: boolean } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({
      score: w.score,
      level: w.level,
      hard: w.spec.hard,
      coins: w.coins,
      hearts: w.hearts,
      maxHearts: w.maxHearts,
      shield: w.shield,
      hints: w.hints,
      hammers: w.hammers,
      shields: w.shields,
      mode: w.mode,
      left: w.arrows.filter((a) => !a.gone).length,
    })
  }

  const playing = () => phaseRef.current === 'play'

  // ── Geometry ────────────────────────────────────
  function geo() {
    const { w: W, h: H } = size.current
    const { cols, rows } = world.current.spec
    const top = 78
    const bottom = H - 86
    const cell = Math.min(58, (W - 28) / cols, (bottom - top - 16) / rows)
    const bw = cell * cols
    const bh = cell * rows
    const bx = (W - bw) / 2
    const by = top + Math.max(4, (bottom - top - bh) / 2)
    return { W, H, cell, bw, bh, bx, by }
  }

  function buildPath(a: Arrow): number[] {
    const { cols, rows } = world.current.spec
    const pts: number[] = []
    for (const c of a.cells) pts.push(c % cols, Math.floor(c / cols))
    const ray = rayOf(cols, rows, a)
    for (const c of ray) pts.push(c % cols, Math.floor(c / cols))
    const h = ray.length ? ray[ray.length - 1] : a.cells[a.cells.length - 1]
    let x = h % cols
    let y = Math.floor(h / cols)
    for (let k = 0; k < a.cells.length + 3; k++) {
      x += DX[a.dir]
      y += DY[a.dir]
      pts.push(x, y)
    }
    return pts
  }

  function at(v: Vis, u: number) {
    const n = v.pts.length / 2 - 1
    const uu = Math.max(0, Math.min(n, u))
    const i = Math.min(n - 1, Math.floor(uu))
    const f = uu - i
    return { x: v.pts[i * 2] + (v.pts[i * 2 + 2] - v.pts[i * 2]) * f, y: v.pts[i * 2 + 1] + (v.pts[i * 2 + 3] - v.pts[i * 2 + 1]) * f }
  }

  function headPx(a: Arrow) {
    const g = geo()
    const v = world.current.vis[a.id]
    const p = at(v, v.s + a.cells.length - 1)
    return { x: g.bx + (p.x + 0.5) * g.cell, y: g.by + (p.y + 0.5) * g.cell }
  }

  // ── Level ───────────────────────────────────────
  function loadLevel(n: number) {
    const w = world.current
    const lv = authoredLevel(n) ?? generate(specFor(n), Math.floor(Math.random() * 1e9))
    const spec = lv.spec
    w.level = n
    w.spec = spec
    w.arrows = lv.arrows
    w.stones = lv.stones
    w.vis = lv.arrows.map((a) => ({ pts: buildPath(a), s: 0, v: 0, state: 'rest', target: 0, back: false, shake: 0, pop: 0, hint: 0, trail: 0, blocker: -1 }))
    w.hearts = w.maxHearts
    w.shield = false
    w.mode = 'none'
    w.hits = 0
    w.failT = 0
  }

  // ── Actions ─────────────────────────────────────
  function launch(a: Arrow) {
    const w = world.current
    const v = w.vis[a.id]
    if (a.gone || v.state !== 'rest') return
    const { cols, rows } = w.spec
    const occ = occupancy(cols, rows, w.arrows, w.stones)
    const hit = hitDistance(cols, rows, occ, a)
    v.hint = 0
    if (hit.steps < 0) {
      a.gone = true
      v.state = 'fly'
      v.v = 6
      if (!playing()) return
      w.combo = w.comboT > 0 ? w.combo + 1 : 1
      w.comboT = 1.3
      const gain = 10 * a.cells.length * Math.min(5, w.combo)
      w.score += gain
      w.stats.arrows += 1
      w.stats.score = w.score
      const h = headPx(a)
      fx.text(h.x, h.y - 20, w.combo > 1 ? `+${gain} x${w.combo}` : `+${gain}`, w.combo > 1 ? '#fde047' : '#ffffff', 15 + Math.min(7, w.combo))
      sfx.whoosh()
      sfx.score(Math.min(10, w.combo))
      haptic.light()
      run.update(w.stats)
      pushHud()
      return
    }
    v.state = 'bounce'
    v.target = hit.steps + 0.35
    v.back = false
    v.v = 9
    v.blocker = hit.blocker
  }

  /** The head reached its blocker. */
  function onHit(a: Arrow, blocker: number) {
    const w = world.current
    const h = headPx(a)
    if (blocker >= 0) w.vis[blocker].shake = 0.4
    fx.burst(h.x, h.y, { count: 14, color: ['#fde047', '#ffffff', '#fb7185'], speed: 220, shape: 'spark', gravity: 0 })
    fx.ring(h.x, h.y, { color: '#fda4af', maxR: 28, life: 0.3 })
    if (!playing()) return
    if (w.shield) {
      w.shield = false
      fx.text(h.x, h.y - 24, 'SHIELDED!', '#7dd3fc', 16)
      fx.ring(h.x, h.y, { color: '#7dd3fc', maxR: 44, life: 0.4 })
      sfx.clang()
      haptic.medium()
      pushHud()
      return
    }
    w.hearts -= 1
    w.hits += 1
    w.combo = 0
    fx.text(h.x, h.y - 24, 'OUCH!', '#fecaca', 17)
    fx.flash('#ef4444', 0.18)
    fx.shake(7, 0.25)
    fx.stop(0.08)
    sfx.hurt()
    haptic.heavy()
    if (w.hearts <= 0) fail()
    pushHud()
  }

  function fail() {
    const w = world.current
    if (!playing()) return
    w.failT = 1
    setPhaseBoth('dying')
    setBanner({ key: Date.now(), text: 'OUT OF HEARTS!', hard: true })
    fx.flash('#ef4444', 0.3)
    fx.shake(10, 0.4)
    fx.slowmo(0.8, 0.4)
    sfx.lose()
    haptic.error()
  }

  function die() {
    const w = world.current
    setPhaseBoth('over')
    const coins = Math.round((w.coins + w.level) * (1 + run.level('bounty') * 0.15))
    run.end({ score: w.score, cleared: w.level >= 5, stats: { ...w.stats }, coins }, revive)
    pushHud()
  }

  /** Revive: hearts refilled plus a shield for the next bump. */
  function revive() {
    const w = world.current
    w.hearts = w.maxHearts
    w.shield = true
    w.failT = 0
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'hearts refilled · shield on' })
    const g = geo()
    fx.ring(g.W / 2, g.by + g.bh / 2, { color: '#fda4af', maxR: 180, life: 0.6 })
    pushHud()
  }

  function useHint() {
    const w = world.current
    if (!playing() || w.hints <= 0) return
    const { cols, rows } = w.spec
    const occ = occupancy(cols, rows, w.arrows, w.stones)
    const free = w.arrows.filter((a) => !a.gone && w.vis[a.id].state === 'rest' && hitDistance(cols, rows, occ, a).steps < 0)
    if (!free.length) return
    w.hints -= 1
    // point at the longest free arrow
    free.sort((a, b) => b.cells.length - a.cells.length)
    w.vis[free[0].id].hint = 4
    sfx.power()
    haptic.light()
    pushHud()
  }

  function toggleHammer() {
    const w = world.current
    if (!playing()) return
    if (w.mode === 'hammer') w.mode = 'none'
    else if (w.hammers > 0) w.mode = 'hammer'
    sfx.tap()
    pushHud()
  }

  function useShield() {
    const w = world.current
    if (!playing() || w.shields <= 0 || w.shield) return
    w.shields -= 1
    w.shield = true
    const g = geo()
    fx.ring(g.W / 2, g.by + g.bh / 2, { color: '#7dd3fc', maxR: 140, life: 0.5 })
    sfx.power()
    haptic.medium()
    pushHud()
  }

  function smash(a: Arrow) {
    const w = world.current
    const g = geo()
    w.hammers -= 1
    w.mode = 'none'
    a.gone = true
    w.vis[a.id].state = 'fly'
    w.vis[a.id].s = 1e3
    const col = PAL[a.color]
    for (const c of a.cells) {
      const x = g.bx + ((c % w.spec.cols) + 0.5) * g.cell
      const y = g.by + (Math.floor(c / w.spec.cols) + 0.5) * g.cell
      fx.burst(x, y, { count: 6, color: [col.base, col.light, col.dark], speed: 200, shape: 'square', size: 5, gravity: 500 })
    }
    w.stats.arrows += 1
    fx.shake(6, 0.2)
    sfx.clang()
    sfx.boom(0.25)
    haptic.heavy()
    run.update(w.stats)
    pushHud()
  }

  // ── Lifecycle ───────────────────────────────────
  function start(level?: number) {
    void unlockAudio()
    const first = typeof level === 'number' && level >= 1 ? Math.floor(level) : run.nextLevel
    const w = freshWorld()
    w.maxHearts = 3 + run.level('heart')
    w.hints = 2 + run.level('hint')
    world.current = w
    fx.reset()
    setPhaseBoth('play')
    run.begin()
    beginLevel(first)
  }

  function beginLevel(n: number) {
    const w = world.current
    loadLevel(n)
    w.stats.level = n
    const spec = w.spec
    setBanner({ key: Date.now(), text: spec.hard ? 'HARD LEVEL' : `LEVEL ${n}`, sub: [LEVELS[n - 1]?.name, spec.intro ?? (spec.hard ? 'packed grid' : `${w.arrows.length} arrows`)].filter(Boolean).join(' · '), hard: spec.hard })
    if (spec.hard) sfx.boom(0.3)
    else sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function levelClear() {
    const w = world.current
    // Stars: no blocked launches = 3, one = 2, otherwise 1.
    const stars = w.hits === 0 ? 3 : w.hits === 1 ? 2 : 1
    run.completeLevel(w.level, stars)
    const bonus = 100 + stars * 50 + (w.spec.hard ? 200 : 0)
    w.score += bonus
    w.coins += 2 + stars + (w.spec.hard ? 5 : 0)
    if (w.hits === 0) w.stats.flawless += 1
    if (w.spec.hard) w.stats.hard += 1
    w.stats.score = w.score
    let gift = ''
    if (w.spec.hard) {
      w.hammers += 1
      gift = ' · +1 hammer'
    } else if (w.level % 3 === 0) {
      if (Math.random() < 0.5) {
        w.hints += 1
        gift = ' · +1 hint'
      } else {
        w.shields += 1
        gift = ' · +1 shield'
      }
    }
    setPhaseBoth('clear')
    w.clearT = 1.8
    const g = geo()
    for (let k = 0; k < 4; k++) fx.burst(g.W * (0.2 + k * 0.2), g.H * 0.4, { count: 18, color: ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#ffffff'], speed: 360, shape: 'square', size: 5, gravity: 420, life: 1.1 })
    for (let k = 0; k < 2 + stars * 2; k++) w.flying.push({ x: g.W / 2 + rand(-40, 40), y: g.H * 0.45 + rand(-20, 20), t: 0, d: 0.5 + k * 0.08 })
    fx.flash('#fef9c3', 0.2)
    sfx.win()
    haptic.success()
    setBanner({ key: Date.now(), text: w.spec.hard ? 'HARD LEVEL BEATEN!' : `LEVEL ${w.level} CLEAR!`, sub: `+${bonus}${gift}`, stars })
    if ((w.level % 5 === 0 || w.spec.hard) && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'arrowescape', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  // ── Input ───────────────────────────────────────
  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (!playing()) return
    const w = world.current
    const g = geo()
    const p = localPoint(e, e.currentTarget)
    const cx = Math.floor((p.x - g.bx) / g.cell)
    const cy = Math.floor((p.y - g.by) / g.cell)
    if (cx < 0 || cy < 0 || cx >= w.spec.cols || cy >= w.spec.rows) return
    const id = occupancy(w.spec.cols, w.spec.rows, w.arrows, w.stones)[cy * w.spec.cols + cx]
    if (id < 0) return
    const a = w.arrows[id]
    if (w.mode === 'hammer') return smash(a)
    w.vis[id].pop = 1
    launch(a)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'h') useHint()
      else if (e.key === 'm') toggleHammer()
      else if (e.key === 's') useShield()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Tick ────────────────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    const g = geo()
    if (ph === 'idle') {
      if (!w.arrows.length) loadLevel(4)
      w.idleT -= raw
      if (w.idleT <= 0) {
        w.idleT = 0.55
        const { cols, rows } = w.spec
        const occ = occupancy(cols, rows, w.arrows, w.stones)
        const free = w.arrows.filter((a) => !a.gone && hitDistance(cols, rows, occ, a).steps < 0)
        if (free.length) launch(free[Math.floor(Math.random() * free.length)])
        else if (w.vis.every((v) => v.state !== 'fly' || v.s > 60)) loadLevel(4)
      }
    }
    for (const a of w.arrows) {
      const v = w.vis[a.id]
      v.shake = Math.max(0, v.shake - raw)
      v.pop = Math.max(0, v.pop - raw * 4)
      v.hint = Math.max(0, v.hint - raw)
      if (v.state === 'fly') {
        if (v.s > 200) continue
        v.v = Math.min(40, v.v + 70 * dt)
        v.s += v.v * dt
        v.trail -= dt
        if (v.trail <= 0) {
          v.trail = 0.03
          const t = at(v, v.s)
          fx.burst(g.bx + (t.x + 0.5) * g.cell, g.by + (t.y + 0.5) * g.cell, { count: 1, color: [PAL[a.color].light, '#ffffff'], speed: 30, size: 3, gravity: 0, life: 0.35 })
        }
        const n = a.cells.length
        const end = at(v, v.s)
        const outside = end.x < -1.5 || end.y < -1.5 || end.x > w.spec.cols + 0.5 || end.y > w.spec.rows + 0.5
        if (outside && v.s > n) v.s = 1e3
      } else if (v.state === 'bounce') {
        if (!v.back) {
          v.s = Math.min(v.target, v.s + v.v * dt)
          if (v.s >= v.target) {
            v.back = true
            onHit(a, v.blocker)
          }
        } else {
          v.s = Math.max(0, v.s - 7 * dt)
          if (v.s <= 0) v.state = 'rest'
        }
      }
    }
    w.comboT = Math.max(0, w.comboT - dt)
    for (const c of w.flying) c.t += raw
    if (w.flying.some((c) => c.t >= c.d + 0.55)) {
      w.flying = w.flying.filter((c) => c.t < c.d + 0.55)
      sfx.tick()
    }
    if (ph === 'play') {
      if (w.arrows.every((a) => a.gone) && w.vis.every((v) => v.state !== 'fly' || v.s > 200)) levelClear()
    } else if (ph === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0) {
        setPhaseBoth('play')
        beginLevel(w.level + 1)
      }
    } else if (ph === 'dying') {
      w.failT -= raw
      if (w.failT <= 0 && w.failT > -1) {
        w.failT = -5
        die()
      }
    }
  }

  // ── Render ──────────────────────────────────────
  function drawArrow(ctx: CanvasRenderingContext2D, a: Arrow, v: Vis, t: number) {
    const g = geo()
    const n = a.cells.length
    const col = PAL[a.color]
    const pts: number[] = []
    let ox = 0
    let oy = 0
    if (v.shake > 0) {
      ox = Math.sin(t * 70) * 3 * v.shake
      oy = Math.cos(t * 61) * 2 * v.shake
    }
    const tail = v.s
    const head = v.s + n - 1
    const add = (u: number) => {
      const p = at(v, u)
      pts.push(g.bx + (p.x + 0.5) * g.cell + ox, g.by + (p.y + 0.5) * g.cell + oy)
    }
    add(tail)
    for (let u = Math.floor(tail) + 1; u < head; u++) add(u)
    if (n > 1) add(head)
    const hp = at(v, head)
    const hx = g.bx + (hp.x + 0.5) * g.cell + ox
    const hy = g.by + (hp.y + 0.5) * g.cell + oy
    const ang = Math.atan2(DY[a.dir], DX[a.dir])
    const lw = g.cell * 0.3 * (1 + v.pop * 0.15)
    if (v.hint > 0) glow(ctx, hx, hy, g.cell * 1.1, '#fde047', 0.4 + Math.sin(t * 10) * 0.2)
    const stroke = (width: number, color: string, dy = 0) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(pts[0], pts[1] + dy)
      for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1] + dy)
      if (pts.length === 2) ctx.lineTo(pts[0] - Math.cos(ang) * g.cell * 0.3, pts[1] - Math.sin(ang) * g.cell * 0.3 + dy)
      ctx.stroke()
    }
    // single-cell arrows get a short stub tail
    if (n === 1) {
      pts.length = 0
      pts.push(hx - Math.cos(ang) * g.cell * 0.32, hy - Math.sin(ang) * g.cell * 0.32, hx, hy)
    }
    stroke(lw + 5, 'rgba(15,23,42,0.28)', 3)
    stroke(lw + 3, col.dark)
    stroke(lw, col.base)
    stroke(lw * 0.35, 'rgba(255,255,255,0.45)', -lw * 0.18)
    // arrowhead
    const hs = g.cell * 0.36 * (1 + v.pop * 0.15)
    const tipX = hx + Math.cos(ang) * hs * 0.9
    const tipY = hy + Math.sin(ang) * hs * 0.9
    ctx.fillStyle = col.dark
    ctx.beginPath()
    ctx.moveTo(tipX + Math.cos(ang) * 2, tipY + Math.sin(ang) * 2)
    ctx.lineTo(hx + Math.cos(ang + 2.3) * hs + Math.cos(ang) * 1, hy + Math.sin(ang + 2.3) * hs)
    ctx.lineTo(hx + Math.cos(ang - 2.3) * hs + Math.cos(ang) * 1, hy + Math.sin(ang - 2.3) * hs)
    ctx.closePath()
    ctx.fill()
    const gr = ctx.createLinearGradient(hx - hs, hy - hs, hx + hs, hy + hs)
    gr.addColorStop(0, col.light)
    gr.addColorStop(1, col.base)
    ctx.fillStyle = gr
    ctx.beginPath()
    ctx.moveTo(tipX, tipY)
    ctx.lineTo(hx + Math.cos(ang + 2.35) * hs * 0.85, hy + Math.sin(ang + 2.35) * hs * 0.85)
    ctx.lineTo(hx + Math.cos(ang - 2.35) * hs * 0.85, hy + Math.sin(ang - 2.35) * hs * 0.85)
    ctx.closePath()
    ctx.fill()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    update(dt, raw)
    const g = geo()
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#134e4a')
    bg.addColorStop(1, '#042f2e')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // drifting chevrons
    ctx.strokeStyle = 'rgba(94,234,212,0.08)'
    ctx.lineWidth = 3
    for (let i = 0; i < 10; i++) {
      const x = ((i * 91 + t * 14) % (W + 60)) - 30
      const y = (i * 67) % H
      ctx.beginPath()
      ctx.moveTo(x - 8, y - 8)
      ctx.lineTo(x, y)
      ctx.lineTo(x - 8, y + 8)
      ctx.stroke()
    }
    fx.applyShake(ctx)
    // board
    ctx.fillStyle = 'rgba(2,6,23,0.35)'
    ctx.beginPath()
    ctx.roundRect(g.bx - 10, g.by - 6, g.bw + 20, g.bh + 20, 18)
    ctx.fill()
    ctx.fillStyle = '#f0fdfa'
    ctx.beginPath()
    ctx.roundRect(g.bx - 10, g.by - 10, g.bw + 20, g.bh + 20, 18)
    ctx.fill()
    ctx.fillStyle = '#99f6e4'
    for (let y = 0; y < w.spec.rows; y++) {
      for (let x = 0; x < w.spec.cols; x++) {
        ctx.beginPath()
        ctx.arc(g.bx + (x + 0.5) * g.cell, g.by + (y + 0.5) * g.cell, Math.max(1.5, g.cell * 0.05), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    for (const s of w.stones) {
      const x = g.bx + (s % w.spec.cols) * g.cell
      const y = g.by + Math.floor(s / w.spec.cols) * g.cell
      const gr = ctx.createLinearGradient(x, y, x, y + g.cell)
      gr.addColorStop(0, '#94a3b8')
      gr.addColorStop(1, '#475569')
      ctx.fillStyle = '#334155'
      ctx.beginPath()
      ctx.roundRect(x + 4, y + 7, g.cell - 8, g.cell - 9, g.cell * 0.25)
      ctx.fill()
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.roundRect(x + 4, y + 4, g.cell - 8, g.cell - 11, g.cell * 0.25)
      ctx.fill()
    }
    if (w.mode === 'hammer') {
      ctx.fillStyle = `rgba(251,146,60,${0.08 + Math.sin(t * 8) * 0.04})`
      ctx.fillRect(g.bx, g.by, g.bw, g.bh)
    }
    // resting arrows first, moving ones on top
    for (const a of w.arrows) if (!a.gone && w.vis[a.id].state === 'rest') drawArrow(ctx, a, w.vis[a.id], t)
    for (const a of w.arrows) {
      const v = w.vis[a.id]
      if (v.state === 'bounce' || (v.state === 'fly' && v.s < 200)) drawArrow(ctx, a, v, t)
    }
    fx.draw(ctx)
    ctx.restore()
    for (const c of w.flying) {
      if (c.t < c.d) continue
      const k = Math.min(1, (c.t - c.d) / 0.55)
      const e = k * k
      const x = c.x + (W - 40 - c.x) * e
      const y = c.y + (20 - c.y) * e - Math.sin(k * Math.PI) * 60
      ctx.fillStyle = '#eab308'
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(x - 2, y - 2, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__arrowescapeLevel = (n: number) => beginLevel(n)
    win.__arrowescape = () => {
      const w = world.current
      const { cols, rows } = w.spec
      const occ = occupancy(cols, rows, w.arrows, w.stones)
      const out = w.arrows
        .filter((a) => !a.gone && w.vis[a.id].state === 'rest')
        .map((a) => ({ ...headPx(a), match: hitDistance(cols, rows, occ, a).steps < 0 }))
      return { phase: phaseRef.current, level: w.level, hearts: w.hearts, out, wait: 200 }
    }
    return () => {
      delete win.__arrowescape
      delete win.__arrowescapeLevel
    }
  }, [])

  const won = hud.level >= 5
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena ae-arena" onPointerDown={onDown}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="ae-hud-level">
                  Lv {hud.level}
                  {hud.hard ? <span className="ae-hard">HARD</span> : null}
                </div>
                <div className="ae-sub">
                  {hud.score} pts · {hud.left} arrows
                </div>
              </div>
              <div className="action-hud__right">
                <span className="ae-coins">
                  <i />
                  {hud.coins}
                </span>
                <span className="ae-hearts">
                  {Array.from({ length: hud.maxHearts }, (_, i) => (
                    <Heart key={i} lost={i >= hud.hearts} />
                  ))}
                </span>
                {hud.shield ? <span className="ae-shield">shield on</span> : null}
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'clear' || phase === 'dying' ? (
            <div className="ae-boosters" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" className="ae-boost tp-boost" aria-label="Hint" disabled={hud.hints <= 0} onClick={useHint}>
                <HintIcon />
                Hint
                <span className="ae-boost__n">{hud.hints}</span>
              </button>
              <button type="button" className={`ae-boost tp-boost${hud.mode === 'hammer' ? ' is-on' : ''}`} aria-label="Hammer" disabled={hud.hammers <= 0 && hud.mode !== 'hammer'} onClick={toggleHammer}>
                <HammerIcon />
                Hammer
                <span className="ae-boost__n">{hud.hammers}</span>
              </button>
              <button type="button" className={`ae-boost tp-boost${hud.shield ? ' is-on' : ''}`} aria-label="Shield" disabled={hud.shields <= 0 || hud.shield} onClick={useShield}>
                <ShieldIcon />
                Shield
                <span className="ae-boost__n">{hud.shields}</span>
              </button>
            </div>
          ) : null}
          {hud.mode === 'hammer' && phase === 'play' ? <div className="ae-hint">Tap an arrow to smash it</div> : null}
          {banner && phase !== 'idle' && phase !== 'over' ? (
            <div className={`action-banner ae-banner${banner.hard ? ' is-hard' : ''}`} key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.stars ? <span className="ae-stars">{'★'.repeat(banner.stars) + '☆'.repeat(3 - banner.stars)}</span> : null}
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="arrowescape"
              icon={meta.icon}
              title={meta.title}
              hint="Tap an arrow to launch it. A clear path flies it off the grid — a blocked one bumps and costs a heart."
              onPlay={(lv) => start(lv)}
            />
          )}
          <ActionResult run={run} title={won ? 'Arrow ace!' : 'Out of hearts'} subtitle={`Score ${hud.score} · reached level ${hud.level}`} celebrate={won} onPlayAgain={() => start()} />
        </div>
      </div>
    </GameShell>
  )
}
