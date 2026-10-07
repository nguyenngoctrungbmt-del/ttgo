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
import '../../shared/action/action.css'
import './blueprint.css'
import { PLANS, levelFor, planCells, type BpLevel, type Cell, type Plan } from './levels'

const meta = getGame('blueprint')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Item = { id: number; cells: Cell[]; mat: string; kind: 'piece' | 'star' | 'clock'; x: number; drag: boolean; wob: number }
type Puff = { x: number; y: number; r: number; life: number }

const MAT: Record<string, { base: string; dark: string; light: string }> = {
  X: { base: '#f59e0b', dark: '#b45309', light: '#fde68a' },
  B: { base: '#d9653f', dark: '#9a3412', light: '#fdba74' },
  R: { base: '#b91c1c', dark: '#7f1d1d', light: '#f87171' },
  W: { base: '#7dd3fc', dark: '#0369a1', light: '#e0f2fe' },
  D: { base: '#92400e', dark: '#5b2a0a', light: '#d97706' },
  S: { base: '#94a3b8', dark: '#475569', light: '#e2e8f0' },
  M: { base: '#cbd5e1', dark: '#64748b', light: '#f8fafc' },
  L: { base: '#f8fafc', dark: '#cbd5e1', light: '#ffffff' },
  H: { base: '#a16207', dark: '#713f12', light: '#facc15' },
  C: { base: '#9f4a32', dark: '#6b2a17', light: '#e07a5a' },
  G: { base: '#22c55e', dark: '#15803d', light: '#86efac' },
  T: { base: '#78350f', dark: '#451a03', light: '#b45309' },
  Y: { base: '#facc15', dark: '#a16207', light: '#fef9c3' },
}

const sprites = new Map<string, HTMLCanvasElement>()
function matSprite(mat: string, s: number): HTMLCanvasElement {
  const px = Math.max(6, Math.round(s))
  const key = `${mat}-${px}`
  const hit = sprites.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const c = document.createElement('canvas')
  c.width = px * dpr
  c.height = px * dpr
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  const m = MAT[mat] ?? MAT.X
  const grad = g.createLinearGradient(0, 0, 0, px)
  grad.addColorStop(0, m.light)
  grad.addColorStop(0.25, m.base)
  grad.addColorStop(1, m.dark)
  g.fillStyle = grad
  g.beginPath()
  g.roundRect(0.5, 0.5, px - 1, px - 1, px * 0.14)
  g.fill()
  g.lineWidth = Math.max(1, px * 0.05)
  if (mat === 'B' || mat === 'C') {
    g.strokeStyle = 'rgba(255,237,213,0.55)'
    g.beginPath()
    g.moveTo(1, px / 2)
    g.lineTo(px - 1, px / 2)
    g.moveTo(px * 0.5, 1)
    g.lineTo(px * 0.5, px / 2)
    g.moveTo(px * 0.22, px / 2)
    g.lineTo(px * 0.22, px - 1)
    g.moveTo(px * 0.78, px / 2)
    g.lineTo(px * 0.78, px - 1)
    g.stroke()
  } else if (mat === 'R') {
    g.strokeStyle = 'rgba(0,0,0,0.25)'
    for (let i = 0; i < 2; i++) {
      g.beginPath()
      for (let k = 0; k < 3; k++) g.arc(px * (k / 3 + 1 / 6), px * (0.35 + i * 0.45), px / 6, 0, Math.PI)
      g.stroke()
    }
  } else if (mat === 'W') {
    g.fillStyle = 'rgba(255,255,255,0.65)'
    g.beginPath()
    g.moveTo(px * 0.2, px * 0.75)
    g.lineTo(px * 0.55, px * 0.2)
    g.lineTo(px * 0.7, px * 0.2)
    g.lineTo(px * 0.35, px * 0.75)
    g.fill()
    g.strokeStyle = '#f8fafc'
    g.lineWidth = Math.max(1.5, px * 0.08)
    g.strokeRect(px * 0.08, px * 0.08, px * 0.84, px * 0.84)
    g.beginPath()
    g.moveTo(px / 2, px * 0.08)
    g.lineTo(px / 2, px * 0.92)
    g.stroke()
  } else if (mat === 'D') {
    g.strokeStyle = 'rgba(0,0,0,0.3)'
    g.beginPath()
    g.moveTo(px * 0.33, 2)
    g.lineTo(px * 0.33, px - 2)
    g.moveTo(px * 0.66, 2)
    g.lineTo(px * 0.66, px - 2)
    g.stroke()
    g.fillStyle = '#fde047'
    g.beginPath()
    g.arc(px * 0.78, px * 0.55, px * 0.06, 0, Math.PI * 2)
    g.fill()
  } else if (mat === 'S') {
    g.strokeStyle = 'rgba(30,41,59,0.35)'
    g.beginPath()
    g.moveTo(1, px * 0.45)
    g.lineTo(px * 0.6, px * 0.4)
    g.lineTo(px - 1, px * 0.5)
    g.moveTo(px * 0.35, px * 0.42)
    g.lineTo(px * 0.3, px - 1)
    g.moveTo(px * 0.6, 1)
    g.lineTo(px * 0.62, px * 0.4)
    g.stroke()
  } else if (mat === 'M') {
    g.fillStyle = 'rgba(71,85,105,0.7)'
    for (const [x, y] of [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]]) {
      g.beginPath()
      g.arc(px * x, px * y, px * 0.06, 0, Math.PI * 2)
      g.fill()
    }
  } else if (mat === 'H' || mat === 'T') {
    g.strokeStyle = 'rgba(0,0,0,0.25)'
    g.beginPath()
    g.moveTo(1, px * 0.33)
    g.lineTo(px - 1, px * 0.33)
    g.moveTo(1, px * 0.66)
    g.lineTo(px - 1, px * 0.66)
    g.stroke()
  } else if (mat === 'G') {
    g.fillStyle = 'rgba(255,255,255,0.25)'
    g.beginPath()
    g.arc(px * 0.32, px * 0.35, px * 0.18, 0, Math.PI * 2)
    g.arc(px * 0.7, px * 0.62, px * 0.14, 0, Math.PI * 2)
    g.fill()
  } else if (mat === 'Y') {
    g.fillStyle = 'rgba(255,255,255,0.6)'
    g.beginPath()
    g.arc(px * 0.5, px * 0.5, px * 0.2, 0, Math.PI * 2)
    g.fill()
  } else if (mat === 'L') {
    g.strokeStyle = 'rgba(100,116,139,0.35)'
    g.beginPath()
    g.moveTo(1, px * 0.5)
    g.quadraticCurveTo(px / 2, px * 0.3, px - 1, px * 0.5)
    g.stroke()
  } else if (mat === 'X') {
    g.strokeStyle = 'rgba(120,53,15,0.55)'
    g.strokeRect(px * 0.12, px * 0.12, px * 0.76, px * 0.76)
    g.beginPath()
    g.moveTo(px * 0.12, px * 0.12)
    g.lineTo(px * 0.88, px * 0.88)
    g.moveTo(px * 0.88, px * 0.12)
    g.lineTo(px * 0.12, px * 0.88)
    g.stroke()
  }
  g.fillStyle = 'rgba(255,255,255,0.35)'
  g.fillRect(px * 0.1, 1.5, px * 0.8, Math.max(1, px * 0.06))
  sprites.set(key, c)
  if (sprites.size > 120) {
    const first = sprites.keys().next().value
    if (first) sprites.delete(first)
  }
  return c
}

function normalize(cells: Cell[]): Cell[] {
  const mx = Math.min(...cells.map((c) => c[0]))
  const my = Math.min(...cells.map((c) => c[1]))
  return cells.map(([x, y]) => [x - mx, y - my] as Cell).sort((a, b) => a[1] - b[1] || a[0] - b[0])
}

function rotate(cells: Cell[]): Cell[] {
  return normalize(cells.map(([x, y]) => [-y, x] as Cell))
}

function dims(cells: Cell[]) {
  return { w: Math.max(...cells.map((c) => c[0])) + 1, h: Math.max(...cells.map((c) => c[1])) + 1 }
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.fillStyle = fill
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
}

function drawClock(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.fillStyle = '#22d3ee'
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.arc(x, y, r * 0.78, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + Math.cos(t * 3) * r * 0.55, y + Math.sin(t * 3) * r * 0.55)
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - r * 0.4)
  ctx.stroke()
  ctx.fillStyle = '#0891b2'
  ctx.fillRect(x - r * 0.2, y - r * 1.25, r * 0.4, r * 0.3)
}

type World = {
  level: number
  lv: BpLevel
  /** Blueprints finished in this run. */
  built: number
  plan: Plan
  gw: number
  gh: number
  target: string[][]
  filled: (string | null)[][]
  pop: number[][]
  timer: number
  timerMax: number
  items: Item[]
  nextId: number
  mistakes: number
  combo: number
  lastPlace: number
  clock: number
  score: number
  celebrate: number
  stars: number
  multi: boolean
  rot: boolean
  speed: number
  puffs: Puff[]
  wrongFlash: number
  stats: { score: number; level: number; pieces: number; stars: number; flawless: number; combo: number }
}

function freshWorld(): World {
  return {
    level: 0,
    lv: levelFor(1),
    built: 0,
    plan: PLANS.crate,
    gw: 1,
    gh: 1,
    target: [],
    filled: [],
    pop: [],
    timer: 1,
    timerMax: 1,
    items: [],
    nextId: 1,
    mistakes: 0,
    combo: 0,
    lastPlace: -10,
    clock: 0,
    score: 0,
    celebrate: 0,
    stars: 0,
    multi: false,
    rot: false,
    speed: 40,
    puffs: [],
    wrongFlash: 0,
    stats: { score: 0, level: 0, pieces: 0, stars: 0, flawless: 0, combo: 0 },
  }
}

function loadPlan(w: World, plan: Plan) {
  w.plan = plan
  w.gh = plan.rows.length
  w.gw = Math.max(...plan.rows.map((r) => r.length))
  w.target = Array.from({ length: w.gh }, (_, y) => Array.from({ length: w.gw }, (_, x) => (plan.rows[y][x] && plan.rows[y][x] !== '.' ? plan.rows[y][x] : '')))
  w.filled = Array.from({ length: w.gh }, () => Array.from({ length: w.gw }, () => null))
  w.pop = Array.from({ length: w.gh }, () => Array.from({ length: w.gw }, () => 0))
}

export default function BlueprintGame() {
  const run = useActionRun('blueprint')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ pid: number; item: Item; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, built: 0, combo: 0, name: '' })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: Math.max(1, w.level), built: w.built, combo: w.combo, name: w.plan.name })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const w = world.current
    const beltH = 96
    const beltY = H - beltH - 6
    const top = 86
    const cs = Math.floor(Math.min((W - 36) / w.gw, (beltY - top - 26) / w.gh, 46))
    const gx = Math.round((W - cs * w.gw) / 2)
    const gy = Math.round(top + (beltY - top - 14 - cs * w.gh) / 2)
    return { W, H, cs, gx, gy, beltY, beltH, pc: 20 }
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    world.current = freshWorld()
    // nextLevel() increments, so begin one below the chosen level.
    world.current.level = Math.max(0, level - 1)
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    nextLevel()
  }

  function nextLevel() {
    const w = world.current
    w.level += 1
    const lv = levelFor(w.level)
    w.lv = lv
    loadPlan(w, lv.plan)
    const cells = planCells(lv.plan)
    w.multi = lv.multi
    w.rot = lv.rot
    w.timerMax = Math.round(cells * lv.per + 12 + (w.rot ? 6 : 0) + (w.multi ? 6 : 0) + run.level('time') * 4)
    w.timer = w.timerMax
    w.speed = lv.speed * (1 - run.level('belt') * 0.08)
    w.items = []
    w.mistakes = 0
    w.celebrate = 0
    w.clock = 0.2
    pushHud()
    run.update(w.stats)
    const news = lv.hint ? `${lv.hint} · ${w.timerMax}s` : `${w.timerMax}s`
    setBanner({ key: Date.now(), text: lv.boss ? `★ BIG BUILD #${w.level}` : `#${w.level} ${w.plan.name.toUpperCase()}`, sub: lv.boss ? `${w.plan.name} · ${news}` : news })
    sfx.ready()
  }

  function emptyCells(): Cell[] {
    const w = world.current
    const out: Cell[] = []
    for (let y = 0; y < w.gh; y++) for (let x = 0; x < w.gw; x++) if (w.target[y][x] && !w.filled[y][x]) out.push([x, y])
    return out
  }

  /** Grow a random piece inside the unfilled outline so the belt always offers a fit. */
  function genPiece(): Item {
    const w = world.current
    const id = w.nextId++
    const { W } = geo()
    const r = Math.random()
    if (w.level >= 3 && r < 0.05) return { id, cells: [[0, 0]], mat: 'Y', kind: 'clock', x: W + 10, drag: false, wob: 0 }
    if (r < 0.1) return { id, cells: [[0, 0]], mat: 'Y', kind: 'star', x: W + 10, drag: false, wob: 0 }
    const empty = emptyCells()
    const decoy = Math.random() < w.lv.decoy
    let cells: Cell[]
    let mat = 'X'
    if (empty.length === 0 || decoy) {
      const shapes: Cell[][] = [
        [[0, 0], [1, 0], [2, 0], [3, 0]],
        [[0, 0], [1, 0], [0, 1], [1, 1]],
        [[0, 0], [1, 0], [2, 0], [1, 1]],
        [[0, 0], [0, 1], [0, 2], [1, 2]],
        [[1, 0], [2, 0], [0, 1], [1, 1]],
        [[0, 0], [1, 0], [2, 0]],
      ]
      cells = shapes[Math.floor(Math.random() * shapes.length)]
      const mats = Array.from(new Set(empty.map(([x, y]) => w.target[y][x])))
      if (w.multi) mat = mats.length ? mats[Math.floor(Math.random() * mats.length)] : 'B'
    } else {
      const seed = empty[Math.floor(Math.random() * empty.length)]
      const want = Math.random() < 0.12 ? 1 : Math.random() < 0.25 ? 2 : Math.random() < 0.45 ? 3 : w.lv.big && Math.random() < 0.45 ? 5 : 4
      const region = w.target[seed[1]][seed[0]]
      const set: Cell[] = [seed]
      const has = (x: number, y: number) => set.some((c) => c[0] === x && c[1] === y)
      for (let tries = 0; set.length < want && tries < 30; tries++) {
        const [bx, by] = set[Math.floor(Math.random() * set.length)]
        const dirs: Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]
        const [dx, dy] = dirs[Math.floor(Math.random() * 4)]
        const nx = bx + dx
        const ny = by + dy
        if (nx < 0 || ny < 0 || nx >= w.gw || ny >= w.gh) continue
        if (!w.target[ny][nx] || w.filled[ny][nx] || has(nx, ny)) continue
        if (w.multi && w.target[ny][nx] !== region) continue
        set.push([nx, ny])
      }
      cells = normalize(set)
      if (w.multi) mat = region
    }
    if (w.rot) {
      const turns = Math.floor(Math.random() * 4)
      for (let i = 0; i < turns; i++) cells = rotate(cells)
    }
    return { id, cells: normalize(cells), mat, kind: 'piece', x: W + 10, drag: false, wob: 0 }
  }

  function itemWidth(it: Item) {
    const { pc } = geo()
    if (it.kind !== 'piece') return pc * 1.6
    return dims(it.cells).w * pc
  }

  function fits(it: Item, ox: number, oy: number) {
    const w = world.current
    for (const [cx, cy] of it.cells) {
      const x = ox + cx
      const y = oy + cy
      if (x < 0 || y < 0 || x >= w.gw || y >= w.gh) return false
      if (!w.target[y][x] || w.filled[y][x]) return false
      if (it.kind === 'piece' && w.multi && w.target[y][x] !== it.mat) return false
    }
    return true
  }

  /** Grid origin for a dragged item (the piece floats above the finger). */
  function dropOrigin(it: Item, px: number, py: number) {
    const { cs, gx, gy } = geo()
    const d = dims(it.cells)
    const lift = 56
    const ox = Math.round((px - gx) / cs - d.w / 2)
    const oy = Math.round((py - lift - gy) / cs - d.h / 2)
    return { ox, oy }
  }

  function overGrid(it: Item, ox: number, oy: number) {
    const w = world.current
    return it.cells.some(([cx, cy]) => ox + cx >= 0 && oy + cy >= 0 && ox + cx < w.gw && oy + cy < w.gh)
  }

  function placeItem(it: Item, ox: number, oy: number) {
    const w = world.current
    const { cs, gx, gy } = geo()
    for (const [cx, cy] of it.cells) {
      const x = ox + cx
      const y = oy + cy
      w.filled[y][x] = it.kind === 'star' ? w.target[y][x] : w.multi ? it.mat : 'X'
      w.pop[y][x] = 1
    }
    w.items = w.items.filter((i) => i !== it)
    const now = w.clock
    w.combo = now - w.lastPlace < 3.2 ? Math.min(9, w.combo + 1) : 1
    w.lastPlace = now
    w.stats.combo = Math.max(w.stats.combo, w.combo)
    w.stats.pieces += 1
    const gain = it.cells.length * 10 * w.combo
    w.score += gain
    w.stats.score = w.score
    const d = dims(it.cells)
    const px = gx + (ox + d.w / 2) * cs
    const py = gy + (oy + d.h / 2) * cs
    fx.burst(px, py, { count: 8 + it.cells.length * 3, color: ['#e0f2fe', '#fde047', '#ffffff'], speed: 180, shape: 'spark', gravity: 200 })
    fx.ring(px, py, { color: '#bae6fd', maxR: cs * 1.4, life: 0.3 })
    fx.text(px, py - cs, w.combo > 1 ? `+${gain} x${w.combo}` : `+${gain}`, w.combo > 2 ? '#fde047' : '#ffffff', w.combo > 2 ? 18 : 15)
    fx.shake(2 + it.cells.length * 0.5, 0.12)
    fx.stop(0.03)
    sfx.thud()
    if (w.combo > 1) sfx.score(w.combo)
    haptic.light()
    run.update(w.stats)
    pushHud()
    if (emptyCells().length === 0) complete()
  }

  function wrongDrop(it: Item, ox: number, oy: number) {
    const w = world.current
    const { cs, gx, gy } = geo()
    w.timer = Math.max(0.5, w.timer - 3)
    w.mistakes += 1
    w.combo = 0
    w.items = w.items.filter((i) => i !== it)
    w.wrongFlash = 0.4
    const d = dims(it.cells)
    const px = gx + (ox + d.w / 2) * cs
    const py = gy + (oy + d.h / 2) * cs
    fx.burst(px, py, { count: 16, color: [MAT[it.mat]?.base ?? '#f59e0b', '#ef4444', '#78350f'], speed: 240, shape: 'square', size: 5, gravity: 900 })
    fx.text(px, py - 20, '-3s', '#f87171', 22)
    fx.flash('#ef4444', 0.18)
    fx.shake(7, 0.25)
    sfx.miss()
    haptic.error()
    pushHud()
  }

  function complete() {
    const w = world.current
    const { cs, gx, gy, W } = geo()
    const frac = w.timer / w.timerMax
    const stars = w.mistakes === 0 && frac > 0.35 ? 3 : w.mistakes <= 1 && frac > 0.15 ? 2 : 1
    w.stars = stars
    w.celebrate = 2.8
    w.items = []
    w.built += 1
    w.stats.level = w.built
    const saved = run.completeLevel(w.level, stars)
    w.stats.stars += stars
    if (w.mistakes === 0) w.stats.flawless += 1
    const bonus = 100 + Math.round(w.timer * 5) + stars * 50 + (w.mistakes === 0 ? 100 : 0)
    w.score += bonus
    w.stats.score = w.score
    fx.explode(W / 2, gy + (w.gh * cs) / 2, 1.4, ['#fde047', '#7dd3fc', '#ffffff', '#f472b6'])
    for (let i = 0; i < 4; i++) fx.burst(gx + Math.random() * w.gw * cs, gy + Math.random() * w.gh * cs, { count: 10, color: ['#fde047', '#ffffff'], speed: 200, shape: 'spark', gravity: -30 })
    fx.slowmo(0.4, 0.5)
    sfx.win()
    haptic.success()
    setBanner({ key: Date.now(), text: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, sub: `${w.plan.name} built · +${bonus}${w.mistakes === 0 ? ' · flawless' : ''}${saved.improved && !saved.firstClear ? ' · new best' : ''}` })
    if (saved.firstClear && w.level % 5 === 0) void trackEvent('action_milestone', { game_id: 'blueprint', kind: 'level', value: w.level })
    run.update(w.stats)
    pushHud()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(10, 0.4)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    // A few loose pieces rattle off the unfinished build.
    const { cs, gx, gy } = geo()
    for (let y = 0; y < w.gh; y++)
      for (let x = 0; x < w.gw; x++)
        if (w.filled[y][x] && Math.random() < 0.3) fx.burst(gx + (x + 0.5) * cs, gy + (y + 0.5) * cs, { count: 3, color: [MAT[w.filled[y][x]!]?.base ?? '#f59e0b'], speed: 160, shape: 'square', size: 5, gravity: 800 })
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.stats.level * 4 + w.stats.stars * 1.5 + Math.floor(w.score / 400)) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.stats.level >= 6, stats: { ...w.stats }, coins }, revive)
    }, 1200)
  }

  /** Revive: +15 seconds on the same blueprint, the belt is refreshed with fitting pieces. */
  function revive() {
    const w = world.current
    w.timer = 15
    w.items = []
    w.clock = 0
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: '+15 seconds' })
    const { W, gy } = geo()
    fx.ring(W / 2, gy + 60, { color: '#7dd3fc', maxR: 120, life: 0.6 })
    pushHud()
    setPhaseBoth('play')
  }

  // ── Input ─────────────────────────────────────────────

  function itemAt(x: number, y: number) {
    const w = world.current
    const { beltY, beltH } = geo()
    if (y < beltY - 6 || y > beltY + beltH + 6) return null
    for (const it of w.items) {
      if (it.drag) continue
      const iw = itemWidth(it)
      if (x >= it.x - 10 && x <= it.x + iw + 10) return it
    }
    return null
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play' || world.current.celebrate > 0) return
    const el = e.currentTarget
    const { x, y } = localPoint(e, el)
    const it = itemAt(x, y)
    if (!it) return
    el.setPointerCapture(e.pointerId)
    if (it.kind === 'clock') {
      const w = world.current
      w.items = w.items.filter((i) => i !== it)
      w.timer += 5
      fx.text(x, y - 30, '+5s', '#67e8f9', 22)
      fx.burst(x, y, { count: 14, color: ['#67e8f9', '#ffffff'], speed: 200 })
      sfx.power()
      haptic.medium()
      return
    }
    it.drag = true
    drag.current = { pid: e.pointerId, item: it, x, y, sx: x, sy: y, moved: false }
    sfx.tap()
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.pid !== e.pointerId) return
    const { x, y } = localPoint(e, e.currentTarget)
    d.x = x
    d.y = y
    if (Math.hypot(x - d.sx, y - d.sy) > 10) d.moved = true
  }

  function onUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.pid !== e.pointerId) return
    drag.current = null
    const w = world.current
    const it = d.item
    it.drag = false
    if (!w.items.includes(it) || phaseRef.current !== 'play') return
    if (!d.moved) {
      if (w.rot && it.kind === 'piece') {
        it.cells = rotate(it.cells)
        it.wob = 1
        sfx.flip()
        haptic.light()
      }
      return
    }
    const { ox, oy } = dropOrigin(it, d.x, d.y)
    if (fits(it, ox, oy)) placeItem(it, ox, oy)
    else if (overGrid(it, ox, oy)) wrongDrop(it, ox, oy)
  }

  // Dev-only bot hook: place the first belt item that fits (with rotations) via the real rules.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__lv3bp = {
      state: () => ({ level: world.current.level, phase: phaseRef.current, timer: world.current.timer, left: emptyCells().length, celebrate: world.current.celebrate }),
      place: () => {
        const w = world.current
        if (phaseRef.current !== 'play' || w.celebrate > 0) return false
        for (const it of w.items) {
          if (it.kind === 'clock') continue
          for (let t = 0; t < (w.rot ? 4 : 1); t++) {
            for (let oy = 0; oy < w.gh; oy++) for (let ox = 0; ox < w.gw; ox++) if (fits(it, ox, oy)) {
              placeItem(it, ox, oy)
              return true
            }
            if (w.rot) it.cells = rotate(it.cells)
          }
        }
        return false
      },
    }
    return () => {
      delete win.__lv3bp
    }
  })

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === 'r') {
        const d = drag.current
        if (d && world.current.rot && d.item.kind === 'piece') d.item.cells = rotate(d.item.cells)
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  // ── Frame ─────────────────────────────────────────────

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    if (ph === 'idle' && w.target.length === 0) {
      loadPlan(w, PLANS.house)
      w.rot = false
    }
    const { cs, gx, gy, beltY, beltH, pc } = geo()

    if (ph === 'idle') {
      // attract: slowly assemble the house, then let it live
      w.clock += raw
      const cyc = w.clock % 9
      const all: Cell[] = []
      for (let y = w.gh - 1; y >= 0; y--) for (let x = 0; x < w.gw; x++) if (w.target[y][x]) all.push([x, y])
      const n = Math.floor(clamp(cyc / 5, 0, 1) * all.length)
      for (let i = 0; i < all.length; i++) {
        const [x, y] = all[i]
        const want = i < n ? w.target[y][x] : null
        if (want && !w.filled[y][x]) w.pop[y][x] = 1
        w.filled[y][x] = want
      }
      w.celebrate = cyc > 5 ? 1 : 0
    }

    for (let y = 0; y < w.gh; y++) for (let x = 0; x < w.gw; x++) if (w.pop[y]?.[x] > 0) w.pop[y][x] = Math.max(0, w.pop[y][x] - raw * 4)
    w.wrongFlash = Math.max(0, w.wrongFlash - raw)

    if (ph === 'play') {
      if (w.celebrate > 0) {
        w.celebrate -= raw
        if (w.celebrate <= 0) nextLevel()
      } else {
        w.clock += dt
        const prev = w.timer
        w.timer -= dt
        if (w.timer < 5 && Math.floor(prev) !== Math.floor(w.timer)) sfx.tick()
        if (w.timer <= 0) {
          w.timer = 0
          die()
        }
        for (const it of w.items) if (!it.drag) it.x -= w.speed * dt
        const last = w.items.filter((i) => !i.drag).reduce((m, i) => Math.max(m, i.x + itemWidth(i)), -999)
        if (last < W - 26 || w.items.length === 0) {
          // keep the belt stocked; first pieces arrive fast
          const it = genPiece()
          it.x = Math.max(W + 6, last + 26)
          if (w.items.length === 0) it.x = W * 0.55
          w.items.push(it)
        }
        w.items = w.items.filter((it) => {
          if (it.drag) return true
          if (it.x + itemWidth(it) < -6) {
            fx.burst(4, beltY + beltH / 2, { count: 5, color: ['#94a3b8', '#e2e8f0'], speed: 80 })
            return false
          }
          return true
        })
      }
    }
    for (const it of w.items) it.wob = Math.max(0, it.wob - raw * 5)

    // ── Draw ─────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#1e3a8a')
    bg.addColorStop(1, '#172554')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // blueprint paper grid
    ctx.strokeStyle = 'rgba(147,197,253,0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = gx % 16; x < W; x += 16) {
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, beltY)
    }
    for (let y = gy % 16; y < beltY; y += 16) {
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(W, y + 0.5)
    }
    ctx.stroke()
    glow(ctx, W / 2, gy + (w.gh * cs) / 2, Math.max(w.gw, w.gh) * cs * 0.9, '#3b82f6', 0.3)

    fx.applyShake(ctx)

    const done = w.celebrate > 0
    const lifeK = done ? 1 : 0
    const hasBob = w.plan.life.some((l) => l.k === 'bob')
    const hasFlame = w.plan.life.some((l) => l.k === 'flame')
    let oyBuild = 0
    if (done && hasBob) oyBuild = Math.sin(t * 2.4) * 4
    if (done && hasFlame) oyBuild = -Math.max(0, (2.8 - Math.max(0, w.celebrate)) - 1.2) * 40 + Math.sin(t * 40) * 1.2

    // water for boats
    if (hasBob && done) {
      const wy = gy + (w.gh - 1.6) * cs
      ctx.fillStyle = 'rgba(56,189,248,0.55)'
      ctx.beginPath()
      ctx.moveTo(0, beltY)
      for (let x = 0; x <= W; x += 10) ctx.lineTo(x, wy + Math.sin(x * 0.05 + t * 3) * 4)
      ctx.lineTo(W, beltY)
      ctx.closePath()
      ctx.fill()
    }

    // ground line + name
    ctx.strokeStyle = 'rgba(191,219,254,0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(gx - 10, gy + w.gh * cs + 1)
    ctx.lineTo(gx + w.gw * cs + 10, gy + w.gh * cs + 1)
    ctx.stroke()
    ctx.fillStyle = 'rgba(191,219,254,0.85)'
    ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(`${w.plan.name.toUpperCase()}${w.multi ? ' · COLOUR PLAN' : ''}`, W / 2, gy + w.gh * cs + 6)

    // target outline + filled cells
    ctx.save()
    ctx.translate(0, oyBuild)
    for (let y = 0; y < w.gh; y++) {
      for (let x = 0; x < w.gw; x++) {
        const tg = w.target[y][x]
        if (!tg) continue
        const px = gx + x * cs
        const py = gy + y * cs
        const f = w.filled[y][x]
        if (!f) {
          ctx.fillStyle = w.multi ? MAT[tg].base : '#93c5fd'
          ctx.globalAlpha = w.multi ? 0.35 : 0.16
          ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2)
          ctx.globalAlpha = 1
          continue
        }
        const p = w.pop[y][x]
        const showMat = done ? (w.multi ? f : tg) : f
        // reveal sweep from the bottom when complete
        const reveal = done ? clamp((2.8 - w.celebrate) * 6 - (w.gh - y) * 0.5, 0, 1) : 1
        const mat = done && reveal < 1 ? f : showMat
        const s = cs * (1 + p * 0.25)
        ctx.drawImage(matSprite(mat, cs), px + (cs - s) / 2, py + (cs - s) / 2 - p * 4, s, s)
        if (done && reveal > 0 && reveal < 1) {
          ctx.globalAlpha = 1 - reveal
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(px, py, cs, cs)
          ctx.globalAlpha = 1
        }
      }
    }
    // silhouette outline edges
    ctx.strokeStyle = w.wrongFlash > 0 ? '#f87171' : 'rgba(224,242,254,0.85)'
    ctx.lineWidth = 2
    ctx.setLineDash(done ? [] : [5, 4])
    ctx.beginPath()
    for (let y = 0; y < w.gh; y++)
      for (let x = 0; x < w.gw; x++) {
        if (!w.target[y][x]) continue
        const px = gx + x * cs
        const py = gy + y * cs
        if (!w.target[y - 1]?.[x]) {
          ctx.moveTo(px, py)
          ctx.lineTo(px + cs, py)
        }
        if (!w.target[y + 1]?.[x]) {
          ctx.moveTo(px, py + cs)
          ctx.lineTo(px + cs, py + cs)
        }
        if (!w.target[y][x - 1]) {
          ctx.moveTo(px, py)
          ctx.lineTo(px, py + cs)
        }
        if (!w.target[y][x + 1]) {
          ctx.moveTo(px + cs, py)
          ctx.lineTo(px + cs, py + cs)
        }
      }
    if (!done) ctx.stroke()
    ctx.setLineDash([])

    // life!
    if (lifeK > 0) {
      for (const l of w.plan.life) {
        const lx = gx + (l.x + 0.5) * cs
        const ly = gy + l.y * cs
        if (l.k === 'smoke' && Math.random() < raw * 6) w.puffs.push({ x: lx, y: ly, r: cs * 0.18, life: 1.6 })
        else if (l.k === 'flag') {
          ctx.strokeStyle = '#e2e8f0'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(lx, ly)
          ctx.lineTo(lx, ly - cs * 1.1)
          ctx.stroke()
          ctx.fillStyle = '#ef4444'
          const wv = Math.sin(t * 7 + l.x) * cs * 0.1
          ctx.beginPath()
          ctx.moveTo(lx, ly - cs * 1.1)
          ctx.quadraticCurveTo(lx + cs * 0.35, ly - cs * 1.1 + wv, lx + cs * 0.7, ly - cs * 0.92 + wv * 0.5)
          ctx.quadraticCurveTo(lx + cs * 0.35, ly - cs * 0.75 - wv, lx, ly - cs * 0.7)
          ctx.fill()
        } else if (l.k === 'lights') {
          for (let y = 0; y < w.gh; y++)
            for (let x = 0; x < w.gw; x++)
              if (w.target[y][x] === 'W') glow(ctx, gx + (x + 0.5) * cs, gy + (y + 0.5) * cs, cs * 0.9, '#fde047', 0.35 + Math.sin(t * 3 + x + y) * 0.1)
        } else if (l.k === 'beam') {
          const a = t * 1.8
          ctx.save()
          ctx.globalAlpha = 0.35
          ctx.fillStyle = '#fef08a'
          ctx.beginPath()
          ctx.moveTo(lx, ly + cs * 0.5)
          ctx.lineTo(lx + Math.cos(a) * W, ly + cs * 0.5 + Math.sin(a) * 40 - 30)
          ctx.lineTo(lx + Math.cos(a) * W, ly + cs * 0.5 + Math.sin(a) * 40 + 30)
          ctx.closePath()
          ctx.fill()
          ctx.restore()
          glow(ctx, lx, ly + cs * 0.5, cs * 1.4, '#fde047', 0.7)
        } else if (l.k === 'flame') {
          const fl = cs * (1.2 + Math.sin(t * 30) * 0.2)
          const fg = ctx.createLinearGradient(0, ly, 0, ly + fl)
          fg.addColorStop(0, '#fef08a')
          fg.addColorStop(0.5, '#f97316')
          fg.addColorStop(1, 'rgba(239,68,68,0)')
          ctx.fillStyle = fg
          ctx.beginPath()
          ctx.moveTo(lx - cs * 0.7, ly)
          ctx.quadraticCurveTo(lx, ly + fl * 1.6, lx + cs * 0.7, ly)
          ctx.closePath()
          ctx.fill()
          if (Math.random() < 0.6) w.puffs.push({ x: lx + rand(-cs, cs), y: ly + fl, r: cs * 0.25, life: 1 })
        } else if (l.k === 'walker') {
          const k = ((t * 0.25) % 1) * 2 - 1
          const wx = lx + k * cs * 3
          const wy = ly
          const step = Math.sin(t * 10) * 2
          ctx.fillStyle = '#fde68a'
          ctx.beginPath()
          ctx.arc(wx, wy - cs * 0.6, cs * 0.12, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#ef4444'
          ctx.fillRect(wx - cs * 0.1, wy - cs * 0.48, cs * 0.2, cs * 0.28)
          ctx.strokeStyle = '#1e293b'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(wx - 2, wy - cs * 0.2)
          ctx.lineTo(wx - 2 + step, wy)
          ctx.moveTo(wx + 2, wy - cs * 0.2)
          ctx.lineTo(wx + 2 - step, wy)
          ctx.stroke()
        } else if (l.k === 'car') {
          const k = (t * 0.3) % 1
          const cx = gx + k * w.gw * cs
          const cy = gy + l.y * cs
          ctx.fillStyle = '#facc15'
          ctx.beginPath()
          ctx.roundRect(cx - cs * 0.5, cy - cs * 0.42, cs, cs * 0.32, 4)
          ctx.fill()
          ctx.fillStyle = '#7dd3fc'
          ctx.fillRect(cx - cs * 0.2, cy - cs * 0.6, cs * 0.4, cs * 0.2)
          ctx.fillStyle = '#0f172a'
          ctx.beginPath()
          ctx.arc(cx - cs * 0.28, cy - cs * 0.1, cs * 0.1, 0, Math.PI * 2)
          ctx.arc(cx + cs * 0.28, cy - cs * 0.1, cs * 0.1, 0, Math.PI * 2)
          ctx.fill()
        } else if (l.k === 'birds') {
          ctx.strokeStyle = '#e0f2fe'
          ctx.lineWidth = 2
          for (let i = 0; i < 3; i++) {
            const bx = lx + Math.sin(t * 0.8 + i * 2) * cs * 3
            const by = ly - cs * (1 + i * 0.4) + Math.sin(t * 2 + i) * 6
            const f = Math.sin(t * 12 + i) * 4
            ctx.beginPath()
            ctx.moveTo(bx - 7, by - f)
            ctx.quadraticCurveTo(bx - 3, by - 3, bx, by)
            ctx.quadraticCurveTo(bx + 3, by - 3, bx + 7, by - f)
            ctx.stroke()
          }
        }
      }
    }
    ctx.restore()
    for (const p of w.puffs) {
      p.life -= raw
      p.y -= 26 * raw
      p.x += 8 * raw
      p.r += 8 * raw
      ctx.globalAlpha = Math.max(0, p.life / 1.6) * 0.6
      ctx.fillStyle = '#e2e8f0'
      ctx.beginPath()
      ctx.arc(p.x, p.y + oyBuild, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    w.puffs = w.puffs.filter((p) => p.life > 0).slice(-60)

    // ghost
    const d = drag.current
    if (d && d.moved && ph === 'play') {
      const it = d.item
      const { ox, oy } = dropOrigin(it, d.x, d.y)
      if (overGrid(it, ox, oy)) {
        const ok = fits(it, ox, oy)
        for (const [cx, cy] of it.cells) {
          const x = ox + cx
          const y = oy + cy
          if (x < 0 || y < 0 || x >= w.gw || y >= w.gh) continue
          ctx.fillStyle = ok ? 'rgba(134,239,172,0.45)' : 'rgba(248,113,113,0.45)'
          ctx.fillRect(gx + x * cs + 1, gy + y * cs + 1, cs - 2, cs - 2)
        }
      }
    }

    fx.draw(ctx)
    ctx.restore()

    // conveyor belt
    const bgr = ctx.createLinearGradient(0, beltY, 0, beltY + beltH)
    bgr.addColorStop(0, '#334155')
    bgr.addColorStop(1, '#0f172a')
    ctx.fillStyle = bgr
    ctx.fillRect(0, beltY, W, beltH)
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, beltY + beltH - 14, W, 14)
    const shift = ph === 'play' && w.celebrate <= 0 ? (w.clock * w.speed) % 24 : (t * 30) % 24
    ctx.fillStyle = 'rgba(148,163,184,0.18)'
    for (let x = -shift; x < W + 24; x += 24) {
      ctx.beginPath()
      ctx.moveTo(x, beltY + 8)
      ctx.lineTo(x + 8, beltY + 8)
      ctx.lineTo(x + 2, beltY + beltH / 2 - 4)
      ctx.lineTo(x + 8, beltY + beltH - 22)
      ctx.lineTo(x, beltY + beltH - 22)
      ctx.lineTo(x - 6, beltY + beltH / 2 - 4)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = '#64748b'
    for (let x = 12 - (shift % 24); x < W; x += 24) {
      ctx.beginPath()
      ctx.arc(x, beltY + beltH - 7, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#f59e0b'
    ctx.fillRect(0, beltY, W, 3)

    for (const it of w.items) {
      if (it.drag) continue
      const cy = beltY + (beltH - 14) / 2
      if (it.kind === 'clock') {
        drawClock(ctx, it.x + pc * 0.8, cy, pc * 0.75, t)
        continue
      }
      if (it.kind === 'star') {
        glow(ctx, it.x + pc * 0.8, cy, pc * 1.4, '#fde047', 0.45)
        drawStar(ctx, it.x + pc * 0.8, cy, pc * 0.8, '#facc15')
        continue
      }
      const dd = dims(it.cells)
      const s = pc * (1 + it.wob * 0.15)
      const oy = cy - (dd.h * s) / 2
      for (const [cx, cyy] of it.cells) ctx.drawImage(matSprite(it.mat, s), it.x + cx * s, oy + cyy * s, s, s)
    }

    // dragged piece floats at full size
    if (d && ph === 'play') {
      const it = d.item
      const dd = dims(it.cells)
      const lift = d.moved ? 56 : 0
      const s = d.moved ? cs : pc * 1.2
      const ox = d.x - (dd.w * s) / 2
      const oy = d.y - lift - (dd.h * s) / 2
      ctx.globalAlpha = 0.25
      ctx.fillStyle = '#000'
      for (const [cx, cy] of it.cells) ctx.fillRect(ox + cx * s + 5, oy + cy * s + 7, s, s)
      ctx.globalAlpha = 1
      if (it.kind === 'star') drawStar(ctx, d.x, oy + s / 2, s * 0.6, '#facc15')
      else for (const [cx, cy] of it.cells) ctx.drawImage(matSprite(it.mat, s), ox + cx * s, oy + cy * s, s, s)
    }

    // timer bar
    if (ph !== 'idle') {
      const k = clamp(w.timer / w.timerMax, 0, 1)
      const bx = 14
      const bw = W - 64
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.roundRect(bx, 64, bw, 10, 5)
      ctx.fill()
      ctx.fillStyle = k < 0.25 ? (Math.sin(t * 14) > 0 ? '#ef4444' : '#f87171') : k < 0.5 ? '#facc15' : '#4ade80'
      ctx.beginPath()
      ctx.roundRect(bx, 64, Math.max(10, bw * k), 10, 5)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = "800 13px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${Math.ceil(w.timer)}s`, W - 12, 69)
    }

    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const won = hud.built >= 6
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena blueprint-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Blueprint {hud.level}</div>
              </div>
              <div className="action-hud__right">{hud.combo > 1 ? <span className="blueprint-combo">x{hud.combo}</span> : null}</div>
            </div>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner blueprint-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="blueprint"
              icon={meta.icon}
              title={meta.title}
              hint="Drag pieces from the belt onto the plan. Fill every cell before time runs out — clean, quick drops build combos."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Master builder!' : "Time's up"}
            subtitle={`Score ${hud.score} · Blueprint ${hud.level} · ${hud.built} built this run`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
