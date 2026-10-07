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
import './sandcastle.css'

const meta = getGame('sandcastle')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Stage = 'build' | 'wave' | 'recede'
type Kind = 'block' | 'bucket' | 'slab' | 'wall' | 'big' | 'turret' | 'arch' | 'shovel' | 'wet' | 'shell' | 'flag'
type Piece = { kind: Kind; cols: number[]; mat: 2 | 3; tool: boolean; label: string }

const COLS = 10
const ROWS = 14 // rows above the ground
const GROUND = 2 // diggable ground rows
const TOTAL = ROWS + GROUND
const TRAY_H = 96
const EMPTY = 0
const DIRT = 1
const SAND = 2
const PACKED = 3

const PIECES: Record<Kind, Piece> = {
  block: { kind: 'block', cols: [1], mat: SAND, tool: false, label: 'Block' },
  bucket: { kind: 'bucket', cols: [2], mat: SAND, tool: false, label: 'Bucket' },
  slab: { kind: 'slab', cols: [1, 1], mat: SAND, tool: false, label: 'Slab' },
  wall: { kind: 'wall', cols: [2], mat: PACKED, tool: false, label: 'Wall' },
  big: { kind: 'big', cols: [2, 2], mat: SAND, tool: false, label: 'Mound' },
  turret: { kind: 'turret', cols: [3], mat: SAND, tool: false, label: 'Turret' },
  arch: { kind: 'arch', cols: [1, 2, 1], mat: SAND, tool: false, label: 'Keep' },
  shovel: { kind: 'shovel', cols: [0], mat: SAND, tool: true, label: 'Moat' },
  wet: { kind: 'wet', cols: [0], mat: PACKED, tool: true, label: 'Harden' },
  shell: { kind: 'shell', cols: [0], mat: SAND, tool: true, label: 'Shell' },
  flag: { kind: 'flag', cols: [0], mat: SAND, tool: true, label: 'Flag' },
}

type Deco = { col: number; kind: 'shell' | 'flag'; y: number; hue: number }
type Gull = { x: number; y: number; vx: number; t: number; target: Deco | null; swoop: number; carry: Deco | null; flee: boolean }
type Crab = { x: number; dir: number; t: number; pinch: number; flip: number; vy: number; y: number; gone: boolean }
type Cloud = { x: number; y: number; s: number; v: number }

type World = {
  type: number[][]
  hp: number[][]
  wet: number[][]
  pop: number[][]
  decos: Deco[]
  gulls: Gull[]
  crabs: Crab[]
  clouds: Cloud[]
  hand: (Kind | null)[]
  bag: Kind[]
  sel: number
  tide: number
  push: number
  stage: Stage
  timer: number
  timerMax: number
  autoWave: number
  waveX: number
  waveP: number
  waveRows: number
  waveCol: number
  waveTop: number
  rogue: boolean
  recede: number
  hearts: number
  score: number
  streak: number
  bestHeight: number
  wallHp: number
  hazardT: number
  coinsBonus: number
  stats: { score: number; tide: number; height: number; blocks: number; shells: number; critters: number }
}

function blankGrid(v: number) {
  return Array.from({ length: COLS }, () => Array.from({ length: TOTAL }, (_, r) => (r < GROUND ? v : 0)))
}

function freshWorld(): World {
  return {
    type: blankGrid(DIRT),
    hp: blankGrid(0),
    wet: blankGrid(0),
    pop: blankGrid(0),
    decos: [],
    gulls: [],
    crabs: [],
    clouds: Array.from({ length: 5 }, (_, i) => ({ x: i * 110 + rand(0, 60), y: rand(20, 120), s: rand(0.6, 1.2), v: rand(6, 14) })),
    hand: [null, null, null],
    bag: [],
    sel: -1,
    tide: 0,
    push: 0,
    stage: 'build',
    timer: 0,
    timerMax: 1,
    autoWave: 0,
    waveX: 0,
    waveP: 0,
    waveRows: 0,
    waveCol: COLS,
    waveTop: 0,
    rogue: false,
    recede: 0,
    hearts: 3,
    score: 0,
    streak: 0,
    bestHeight: 0,
    wallHp: 3,
    hazardT: 0,
    coinsBonus: 0,
    stats: { score: 0, tide: 0, height: 0, blocks: 0, shells: 0, critters: 0 },
  }
}

/** Height in rows above the ground (0 = flat beach, negative = moat). */
function colTop(w: World, c: number) {
  for (let r = TOTAL - 1; r >= 0; r--) if (w.type[c][r] !== EMPTY) return r + 1 - GROUND
  return -GROUND
}

function castleCells(w: World) {
  let n = 0
  for (let c = 0; c < COLS; c++) for (let r = 0; r < TOTAL; r++) if (w.type[c][r] >= SAND) n++
  return n
}

function moatDepth(w: World, c: number) {
  let m = 0
  for (let r = 0; r < GROUND; r++) if (w.type[c][r] === EMPTY) m++
  return m
}

/** Sand falls straight down into any gap (ground cells stay put). Returns rows fallen. */
function settle(w: World, c: number) {
  const t = w.type[c]
  const queue: { t: number; hp: number; wet: number; from: number }[] = []
  for (let r = 0; r < TOTAL; r++) if (t[r] >= SAND) queue.push({ t: t[r], hp: w.hp[c][r], wet: w.wet[c][r], from: r })
  let fell = 0
  let q = 0
  for (let r = 0; r < TOTAL; r++) {
    if (t[r] === DIRT) continue
    const cell = queue[q]
    if (cell) {
      t[r] = cell.t
      w.hp[c][r] = cell.hp
      w.wet[c][r] = cell.wet
      if (cell.from !== r) {
        fell = Math.max(fell, cell.from - r)
        w.pop[c][r] = 0.6
      }
      q++
    } else {
      t[r] = EMPTY
      w.hp[c][r] = 0
      w.wet[c][r] = 0
    }
  }
  return fell
}

/** Loose sand slides off any column standing more than 4 above its lowest neighbour. */
function slump(w: World, onMove?: (from: number, to: number) => void) {
  let moved = 0
  for (let it = 0; it < 120; it++) {
    let changed = false
    for (let c = 0; c < COLS; c++) {
      const h = colTop(w, c)
      const l = c > 0 ? colTop(w, c - 1) : 99
      const r = c < COLS - 1 ? colTop(w, c + 1) : 99
      const lo = Math.min(l, r)
      if (h - Math.max(0, lo) <= 4 || h <= 4) continue
      const top = h + GROUND - 1
      if (w.type[c][top] !== SAND) continue
      const to = l <= r ? c - 1 : c + 1
      const dst = colTop(w, to) + GROUND
      w.type[to][dst] = SAND
      w.hp[to][dst] = w.hp[c][top]
      w.wet[to][dst] = w.wet[c][top]
      w.pop[to][dst] = 0.8
      w.type[c][top] = EMPTY
      w.hp[c][top] = 0
      onMove?.(c, to)
      moved++
      changed = true
    }
    if (!changed) break
  }
  return moved
}

function maxHeight(w: World) {
  let m = 0
  for (let c = 0; c < COLS; c++) m = Math.max(m, colTop(w, c))
  return m
}

function waveRowsFor(eff: number, rogue: boolean) {
  return Math.min(9, 1 + Math.floor(eff * 0.6) + (rogue ? 1 : 0))
}

function goalFor(tide: number) {
  return Math.min(11, 1 + Math.ceil(tide * 0.85))
}

// ── Sprites ────────────────────────────────────────────────

const sprites = new Map<string, HTMLCanvasElement>()
function sprite(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = sprites.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * dpr)
  c.height = Math.ceil(h * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  draw(g)
  sprites.set(key, c)
  if (sprites.size > 80) {
    const first = sprites.keys().next().value
    if (first) sprites.delete(first)
  }
  return c
}

function sandCell(cs: number, mat: number, v: number) {
  return sprite(`cell${mat}-${v}-${Math.round(cs)}`, cs, cs, (g) => {
    const packed = mat === PACKED
    const grad = g.createLinearGradient(0, 0, 0, cs)
    grad.addColorStop(0, packed ? '#d6a35c' : '#fde7a8')
    grad.addColorStop(1, packed ? '#a8743a' : '#e9c06b')
    g.fillStyle = grad
    g.beginPath()
    g.roundRect(0.5, 0.5, cs - 1, cs - 1, cs * 0.12)
    g.fill()
    // grain speckles
    let seed = v * 97 + mat * 13 + 7
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280
      return seed / 233280
    }
    g.fillStyle = packed ? 'rgba(90,50,20,0.35)' : 'rgba(160,110,40,0.35)'
    for (let i = 0; i < 9; i++) g.fillRect(rnd() * (cs - 3) + 1, rnd() * (cs - 3) + 1, 1.6, 1.6)
    g.fillStyle = 'rgba(255,255,255,0.45)'
    for (let i = 0; i < 4; i++) g.fillRect(rnd() * (cs - 3) + 1, rnd() * (cs - 3) + 1, 1.4, 1.4)
    if (packed) {
      g.strokeStyle = 'rgba(92,52,18,0.45)'
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(1, cs * 0.5)
      g.lineTo(cs - 1, cs * 0.5)
      g.moveTo(cs * (v % 2 ? 0.35 : 0.6), 1)
      g.lineTo(cs * (v % 2 ? 0.35 : 0.6), cs * 0.5)
      g.moveTo(cs * (v % 2 ? 0.7 : 0.25), cs * 0.5)
      g.lineTo(cs * (v % 2 ? 0.7 : 0.25), cs - 1)
      g.stroke()
    }
    // top highlight + bottom shade
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.fillRect(cs * 0.12, 1.5, cs * 0.76, 2)
    g.fillStyle = 'rgba(0,0,0,0.12)'
    g.fillRect(1, cs - 4, cs - 2, 3)
  })
}

function drawShell(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, hue: number) {
  ctx.save()
  ctx.translate(x, y)
  const g = ctx.createLinearGradient(0, -s, 0, s * 0.3)
  g.addColorStop(0, hue > 0.5 ? '#fbcfe8' : '#fed7aa')
  g.addColorStop(1, hue > 0.5 ? '#ec4899' : '#f97316')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-s * 0.25, s * 0.3)
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI
    ctx.quadraticCurveTo(Math.cos(a - 0.26) * s * 1.1, Math.sin(a - 0.26) * s * 1.1 - s * 0.05, Math.cos(a) * s, Math.sin(a) * s)
  }
  ctx.lineTo(s * 0.25, s * 0.3)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(120,30,60,0.5)'
  ctx.lineWidth = 1
  for (let i = 1; i < 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI
    ctx.beginPath()
    ctx.moveTo(0, s * 0.25)
    ctx.lineTo(Math.cos(a) * s * 0.9, Math.sin(a) * s * 0.9)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.beginPath()
  ctx.ellipse(-s * 0.3, -s * 0.55, s * 0.18, s * 0.1, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, color = '#ef4444') {
  ctx.strokeStyle = '#78350f'
  ctx.lineWidth = Math.max(1.5, s * 0.08)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - s * 1.4)
  ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath()
  const top = y - s * 1.4
  ctx.moveTo(x, top)
  const wv = Math.sin(t * 6 + x) * s * 0.12
  ctx.quadraticCurveTo(x + s * 0.4, top + wv, x + s * 0.85, top + s * 0.22 + wv * 0.5)
  ctx.quadraticCurveTo(x + s * 0.4, top + s * 0.38 - wv, x, top + s * 0.55)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.beginPath()
  ctx.moveTo(x, top + 1)
  ctx.quadraticCurveTo(x + s * 0.3, top + wv + 2, x + s * 0.6, top + s * 0.15)
  ctx.lineTo(x, top + s * 0.18)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.arc(x, top - 1, s * 0.09, 0, Math.PI * 2)
  ctx.fill()
}

function drawShovel(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-0.6)
  ctx.fillStyle = '#f97316'
  ctx.fillRect(-s * 0.08, -s * 0.9, s * 0.16, s * 0.9)
  ctx.fillStyle = '#ea580c'
  ctx.fillRect(-s * 0.25, -s * 1.0, s * 0.5, s * 0.14)
  const g = ctx.createLinearGradient(-s * 0.4, 0, s * 0.4, 0)
  g.addColorStop(0, '#38bdf8')
  g.addColorStop(1, '#0284c7')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-s * 0.35, 0)
  ctx.lineTo(s * 0.35, 0)
  ctx.lineTo(s * 0.3, s * 0.5)
  ctx.quadraticCurveTo(0, s * 0.85, -s * 0.3, s * 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillRect(-s * 0.25, s * 0.08, s * 0.1, s * 0.35)
  ctx.restore()
}

function drawBucketIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  const g = ctx.createLinearGradient(-s * 0.5, 0, s * 0.5, 0)
  g.addColorStop(0, '#22c55e')
  g.addColorStop(1, '#15803d')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(-s * 0.5, -s * 0.4)
  ctx.lineTo(s * 0.5, -s * 0.4)
  ctx.lineTo(s * 0.38, s * 0.5)
  ctx.lineTo(-s * 0.38, s * 0.5)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#14532d'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(0, -s * 0.4, s * 0.45, Math.PI, 0)
  ctx.stroke()
  ctx.fillStyle = '#7dd3fc'
  ctx.beginPath()
  ctx.ellipse(0, -s * 0.4, s * 0.48, s * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#38bdf8'
  for (let i = 0; i < 2; i++) {
    const dy = ((t * 1.5 + i * 0.5) % 1) * s * 0.7
    ctx.beginPath()
    ctx.arc(s * 0.62, -s * 0.2 + dy, s * 0.09, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(-s * 0.35, -s * 0.25, s * 0.1, s * 0.6)
  ctx.restore()
}

function drawGull(ctx: CanvasRenderingContext2D, g: Gull, t: number) {
  ctx.save()
  ctx.translate(g.x, g.y)
  if (g.vx < 0) ctx.scale(-1, 1)
  const flap = Math.sin(t * (g.flee ? 22 : 12) + g.t) * 0.7
  ctx.fillStyle = '#f8fafc'
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 1.2
  // wings
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(-2, 0)
    ctx.quadraticCurveTo(-8, side * 0 - 10 * flap - 4, -20, -14 * flap - 2)
    ctx.quadraticCurveTo(-10, -2, -2, 3)
    ctx.closePath()
    ctx.fillStyle = side < 0 ? '#e2e8f0' : '#f8fafc'
    ctx.fill()
    ctx.stroke()
  }
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.ellipse(0, 2, 12, 6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#94a3b8'
  ctx.beginPath()
  ctx.moveTo(-10, 0)
  ctx.lineTo(-17, -2)
  ctx.lineTo(-16, 4)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(10, -2, 5, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(14, -2)
  ctx.lineTo(21, 0)
  ctx.lineTo(14, 1)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(11.5, -3, 1.2, 0, Math.PI * 2)
  ctx.fill()
  // angry brow while swooping
  if (g.target || g.carry) {
    ctx.strokeStyle = '#0f172a'
    ctx.beginPath()
    ctx.moveTo(9, -6)
    ctx.lineTo(13.5, -4.5)
    ctx.stroke()
  }
  ctx.restore()
}

function drawCrab(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, flip: number, pinch: number) {
  ctx.save()
  ctx.translate(x, y)
  if (flip > 0) ctx.rotate(flip * 9)
  const walk = Math.sin(t * 14)
  ctx.strokeStyle = '#991b1b'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  for (let i = 0; i < 3; i++) {
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(s * 6, -4)
      ctx.lineTo(s * (11 + i * 2), -2 + (i % 2 ? walk : -walk) * 1.5)
      ctx.lineTo(s * (13 + i * 2), 3)
      ctx.stroke()
    }
  }
  const g = ctx.createRadialGradient(-3, -9, 1, 0, -6, 12)
  g.addColorStop(0, '#fca5a5')
  g.addColorStop(1, '#dc2626')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, -6, 11, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  const claw = pinch > 0 ? Math.sin(pinch * 30) * 0.4 : 0
  for (const s of [-1, 1]) {
    ctx.save()
    ctx.translate(s * 12, -12)
    ctx.rotate(s * (0.4 + claw))
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.ellipse(0, 0, 5, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#7f1d1d'
    ctx.fillRect(-1, -4, 2, 3)
    ctx.restore()
  }
  for (const s of [-1, 1]) {
    ctx.strokeStyle = '#991b1b'
    ctx.beginPath()
    ctx.moveTo(s * 3, -11)
    ctx.lineTo(s * 4, -16)
    ctx.stroke()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(s * 4, -17, 2.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.arc(s * 4.3, -17, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export default function SandcastleGame() {
  const run = useActionRun('sandcastle')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ id: number; x: number; y: number; slot: number; moved: boolean; onBoard: boolean } | null>(null)
  const lastMilestone = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, tide: 1, survived: 0, goal: 2, hearts: 3, height: 0, left: 0, stage: 'build' as Stage })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, tide: Math.max(1, w.tide), survived: w.stats.tide, goal: goalFor(w.tide), hearts: w.hearts, height: maxHeight(w), left: w.bag.length + w.hand.filter(Boolean).length, stage: w.stage })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const cs = Math.floor(Math.min((W - 12) / (COLS + 2.2), (H - TRAY_H - 86) / (ROWS + GROUND + 0.4)))
    const bx = 10
    const baseY = H - TRAY_H - GROUND * cs - 4
    return { W, H, cs, bx, baseY, right: bx + COLS * cs, trayY: H - TRAY_H }
  }

  const rowTop = (r: number) => {
    const { baseY, cs } = geo()
    return baseY - (r - GROUND + 1) * cs
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.wallHp = 3 + run.level('pack')
    world.current = w
    fx.reset()
    lastMilestone.current = 0
    run.begin()
    setPhaseBoth('play')
    nextTide()
  }

  function makeBag(tide: number): Kind[] {
    const w = world.current
    const n = 5 + Math.floor(tide / 2) + run.level('bucket')
    if (tide === 1) return (['bucket', 'slab', 'block', 'bucket', 'shell', 'wall', 'bucket'] as Kind[]).slice(0, n)
    const pool: [Kind, number][] = [
      ['block', 3],
      ['bucket', 5],
      ['slab', 3],
      ['wall', 3],
      ['big', 2],
      ['shell', 1.2],
      ['flag', tide >= 2 ? 1 : 0],
      ['shovel', tide >= 2 ? 1.6 : 0],
      ['turret', tide >= 3 ? 2.5 : 0],
      ['wet', tide >= 4 ? 1.2 : 0],
      ['arch', tide >= 6 ? 1.5 : 0],
    ]
    const sum = pool.reduce((s, p) => s + p[1], 0)
    const out: Kind[] = []
    for (let i = 0; i < n; i++) {
      let r = Math.random() * sum
      for (const [k, wt] of pool) {
        r -= wt
        if (r <= 0) {
          out.push(k)
          break
        }
      }
    }
    if (tide === 2) out[1] = 'shovel'
    if (w.push > 0 && w.tide === tide) out.push('wall', 'wall')
    return out.sort(() => Math.random() - 0.5)
  }

  function refillHand() {
    const w = world.current
    for (let i = 0; i < 3; i++) if (!w.hand[i] && w.bag.length) w.hand[i] = w.bag.shift()!
    if (w.sel >= 0 && !w.hand[w.sel]) w.sel = -1
  }

  function nextTide() {
    const w = world.current
    w.tide += 1
    w.stage = 'build'
    w.rogue = w.tide % 5 === 0
    w.timerMax = Math.max(16, 26 - w.tide * 0.4)
    w.timer = w.timerMax
    w.autoWave = 0
    w.bag = makeBag(w.tide)
    w.hand = [null, null, null]
    refillHand()
    w.hazardT = rand(3, 7)
    if (w.tide >= 2 && w.tide % 5 === 1 && w.hearts < 3) {
      w.hearts += 1
      fx.text(geo().W / 2, 120, '+1 HEART', '#fda4af', 20)
    }
    pushHud()
    run.update(w.stats)
    const goal = goalFor(w.tide)
    setBanner({
      key: Date.now(),
      text: w.rogue ? 'ROGUE WAVE AHEAD' : `TIDE ${w.tide}`,
      sub: w.tide === 1 ? `build ${goal} high before the wave` : `goal: ${goal} high`,
    })
    if (w.rogue) sfx.boom(0.3)
    else sfx.ready()
    if (w.tide - lastMilestone.current >= 5 && w.tide % 5 === 0) {
      lastMilestone.current = w.tide
      void trackEvent('action_milestone', { game_id: 'sandcastle', kind: 'tide', value: w.tide })
    }
  }

  function callWave() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.stage !== 'build') return
    const bonus = Math.round(w.timer * 2)
    if (bonus > 0 && w.timer > 2) {
      w.score += bonus
      fx.text(geo().W - 70, geo().baseY - 120, `EARLY +${bonus}`, '#fde047', 18)
    }
    startWave()
  }

  function startWave() {
    const w = world.current
    const { W } = geo()
    const eff = Math.max(1, w.tide - w.push)
    w.stage = 'wave'
    w.waveP = (3 + eff * 2.2 + eff * eff * 0.12) * (w.rogue ? 1.4 : 1)
    w.waveRows = waveRowsFor(eff, w.rogue)
    w.waveCol = COLS
    w.waveX = W + 30
    w.waveTop = w.waveX
    w.sel = -1
    drag.current = null
    sfx.whoosh()
    fx.shake(w.rogue ? 6 : 3, 0.5)
    haptic.medium()
    pushHud()
  }

  function hitColumn(c: number) {
    const w = world.current
    const { cs, bx, baseY } = geo()
    const cx = bx + c * cs + cs / 2
    let p = w.waveP
    const m = moatDepth(w, c)
    if (m > 0) {
      p -= m * 2.4
      fx.burst(cx, baseY, { count: 14, color: ['#e0f2fe', '#7dd3fc', '#ffffff'], speed: 260, angle: -Math.PI / 2, spread: 1.4, gravity: 700 })
      fx.text(cx, baseY - cs, 'SPLASH', '#bae6fd', 14)
    }
    const topRow = GROUND - 1 + w.waveRows
    let lost = 0
    for (let r = 0; r <= topRow && r < TOTAL && p > 0; r++) {
      const t = w.type[c][r]
      if (t < SAND) continue
      const dmg = Math.min(w.hp[c][r], p)
      w.hp[c][r] -= dmg
      p -= dmg
      w.wet[c][r] = 1
      if (w.hp[c][r] <= 0.001) {
        w.type[c][r] = EMPTY
        w.hp[c][r] = 0
        lost++
        fx.burst(cx, rowTop(r) + cs / 2, { count: 6, color: ['#fde68a', '#e9c06b', '#ffffff'], speed: 160, size: 3.5, shape: 'square', gravity: 500 })
      }
    }
    // Decorations wash away when the water reaches the top of their column.
    const top = colTop(w, c)
    if (p > 0 && top <= w.waveRows) {
      for (const d of w.decos.filter((d) => d.col === c)) {
        fx.text(cx, rowTop(top + GROUND) , d.kind === 'shell' ? 'SHELL LOST' : 'FLAG LOST', '#fecaca', 13)
        fx.burst(cx, baseY - top * cs - cs * 0.3, { count: 8, color: ['#fbcfe8', '#ffffff'], speed: 140 })
      }
      w.decos = w.decos.filter((d) => d.col !== c)
    }
    const fell = settle(w, c)
    if (lost > 0) {
      sfx.hit()
      haptic.light()
    }
    if (fell > 0) {
      fx.shake(Math.min(6, 1 + fell), 0.2)
      sfx.thud()
    }
    w.waveP = p - 0.25
  }

  function endWave() {
    const w = world.current
    const { W, baseY, cs } = geo()
    doSlump()
    const h = maxHeight(w)
    const goal = goalFor(w.tide)
    const cells = castleCells(w)
    const shells = w.decos.filter((d) => d.kind === 'shell').length
    let gain = cells * 4 + h * 15 + w.tide * 10
    let decoBonus = 0
    for (const d of w.decos) decoBonus += d.kind === 'shell' ? 25 : Math.max(1, colTop(w, d.col)) * 8
    gain += decoBonus
    w.stats.shells += shells > 0 ? 1 : 0
    w.bestHeight = Math.max(w.bestHeight, h)
    w.stats.height = Math.max(w.stats.height, h)
    w.coinsBonus += shells
    if (h >= goal) {
      gain += 50
      w.score += gain
      w.stats.tide += 1
      w.stats.score = w.score
      setBanner({ key: Date.now(), text: w.rogue ? 'ROGUE WAVE SURVIVED!' : 'CASTLE STANDS!', sub: `+${gain}${decoBonus ? ` · decor +${decoBonus}` : ''}` })
      sfx.win()
      haptic.success()
      for (let c = 0; c < COLS; c++) {
        const t = colTop(w, c)
        if (t > 0) fx.burst(geo().bx + c * cs + cs / 2, baseY - t * cs, { count: 4, color: ['#fde047', '#ffffff'], speed: 120, shape: 'spark', gravity: -40 })
      }
      if (w.rogue) fx.explode(W / 2, baseY - h * cs, 1, ['#fde047', '#fb923c', '#ffffff', '#fef3c7'])
      run.update(w.stats)
      w.push = Math.max(0, w.push - 1)
      nextTide()
      return
    }
    w.score += Math.round(gain * 0.5)
    w.stats.score = w.score
    w.hearts -= 1
    fx.flash('#ef4444', 0.3)
    fx.shake(10, 0.5)
    sfx.hurt()
    haptic.error()
    run.update(w.stats)
    if (w.hearts > 0) {
      setBanner({ key: Date.now(), text: 'BREACHED!', sub: `tower ${h} / goal ${goal} · -1 heart` })
      nextTide()
      return
    }
    die()
  }

  function die() {
    const w = world.current
    const { cs, bx, baseY } = geo()
    setPhaseBoth('dying')
    fx.slowmo(1, 0.3)
    fx.stop(0.12)
    sfx.lose()
    // Crumble the top layer for drama; the rest of the castle is kept for a revive.
    for (let c = 0; c < COLS; c++) {
      const t = colTop(w, c)
      if (t > 0) fx.burst(bx + c * cs + cs / 2, baseY - t * cs, { count: 6, color: ['#fde68a', '#d6a35c'], speed: 200, shape: 'square', size: 4, gravity: 600 })
    }
    pushHud()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.stats.tide * 3 + w.coinsBonus + Math.floor(w.score / 250)) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.stats.tide >= 6, stats: { ...w.stats }, coins }, revive)
    }, 1200)
  }

  /** Revive: one heart back, tide pushed back 2 levels, bonus walls, castle kept. */
  function revive() {
    const w = world.current
    w.hearts = 1
    w.push += 2
    w.bag.push('wall', 'wall', 'bucket')
    refillHand()
    w.timer = Math.max(w.timer, w.timerMax * 0.8)
    w.stage = 'build'
    w.crabs = []
    w.gulls = []
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'the tide pulls back' })
    fx.ring(geo().W / 2, geo().baseY - 60, { color: '#fde047', maxR: 120, life: 0.6 })
    pushHud()
    setPhaseBoth('play')
  }

  /** Run the slump rule with feedback; returns cells that slid. */
  function doSlump() {
    const w = world.current
    const { cs, bx, baseY } = geo()
    let last = -1
    const n = slump(w, (from, to) => {
      last = to
      fx.burst(bx + (from + 0.5) * cs, baseY - colTop(w, from) * cs, { count: 4, color: ['#fde68a', '#e9c06b'], speed: 110, shape: 'square', gravity: 500 })
    })
    if (n > 0 && last >= 0) {
      fx.text(bx + (last + 0.5) * cs, baseY - colTop(w, last) * cs - 16, 'SLUMP', '#fed7aa', 14)
      sfx.thud()
    }
    return n
  }

  function pieceAt(px: number, k: Kind) {
    const { cs, bx } = geo()
    const p = PIECES[k]
    const wid = p.cols.length
    return clamp(Math.round((px - bx) / cs - wid / 2), 0, COLS - wid)
  }

  /** Can piece k go in column c? Returns a reason when invalid. */
  function canPlace(k: Kind, c: number): boolean {
    const w = world.current
    const p = PIECES[k]
    if (k === 'shovel') return colTop(w, c) === 0 && moatDepth(w, c) === 0
    if (k === 'wet') return colTop(w, c) > 0
    if (k === 'shell' || k === 'flag') return colTop(w, c) > 0 && !w.decos.some((d) => d.col === c)
    for (let i = 0; i < p.cols.length; i++) if (colTop(w, c + i) + p.cols[i] > ROWS) return false
    return true
  }

  function place(slot: number, c: number) {
    const w = world.current
    const k = w.hand[slot]
    if (!k || phaseRef.current !== 'play' || w.stage !== 'build') return
    const { cs, bx, baseY } = geo()
    if (!canPlace(k, c)) {
      sfx.miss()
      haptic.error()
      fx.text(bx + c * cs + cs / 2, baseY - Math.max(0, colTop(w, c)) * cs - 20, k === 'shovel' ? 'Dig on bare sand' : k === 'shell' || k === 'flag' || k === 'wet' ? 'Needs sand' : 'Too tall', '#fecaca', 14)
      return
    }
    const p = PIECES[k]
    const cx = bx + c * cs + (p.cols.length * cs) / 2
    if (k === 'shovel') {
      for (let r = 0; r < GROUND; r++) w.type[c][r] = EMPTY
      fx.burst(cx, baseY, { count: 18, color: ['#e9c06b', '#c08a3e', '#fde68a'], speed: 260, angle: -Math.PI / 2, spread: 1.6, shape: 'square', gravity: 800 })
      fx.text(cx, baseY - 26, 'MOAT', '#bae6fd', 16)
      sfx.thud()
    } else if (k === 'wet') {
      let n = 0
      for (let r = 0; r < TOTAL; r++)
        if (w.type[c][r] >= SAND) {
          w.type[c][r] = PACKED
          w.hp[c][r] = w.wallHp
          w.pop[c][r] = 0.5
          n++
        }
      fx.burst(cx, baseY - colTop(w, c) * cs, { count: 16, color: ['#7dd3fc', '#e0f2fe', '#38bdf8'], speed: 180, gravity: 500 })
      fx.text(cx, baseY - colTop(w, c) * cs - 20, `HARDENED x${n}`, '#7dd3fc', 15)
      sfx.power()
    } else if (k === 'shell' || k === 'flag') {
      w.decos.push({ col: c, kind: k, y: -60, hue: Math.random() })
      fx.text(cx, baseY - colTop(w, c) * cs - 30, k === 'shell' ? 'SHELL' : 'FLAG', '#fbcfe8', 15)
      sfx.pop()
    } else {
      let added = 0
      for (let i = 0; i < p.cols.length; i++) {
        const col = c + i
        for (let j = 0; j < p.cols[i]; j++) {
          const r = colTop(w, col) + GROUND
          if (r >= TOTAL) break
          w.type[col][r] = p.mat
          w.hp[col][r] = p.mat === PACKED ? w.wallHp : 1
          w.wet[col][r] = 0
          w.pop[col][r] = 1
          added++
        }
        settle(w, col)
      }
      doSlump()
      w.stats.blocks += added
      // PERFECT: the new top lines up with a neighbouring tower.
      let perfect = false
      const lt = colTop(w, c)
      const rt = colTop(w, c + p.cols.length - 1)
      if (c > 0 && colTop(w, c - 1) === lt && lt >= 2) perfect = true
      if (c + p.cols.length < COLS && colTop(w, c + p.cols.length) === rt && rt >= 2) perfect = true
      const topY = baseY - Math.max(lt, rt) * cs
      fx.burst(cx, topY + cs, { count: 10, color: ['#fde68a', '#fef3c7', '#e9c06b'], speed: 150, angle: -Math.PI / 2, spread: 2.6, size: 2.5, gravity: 400 })
      fx.shake(2, 0.1)
      sfx.thud()
      haptic.light()
      let gain = added * 3
      if (perfect) {
        w.streak += 1
        gain += 5 * w.streak
        fx.text(cx, topY - 18, w.streak > 1 ? `PERFECT x${w.streak}` : 'PERFECT', '#fde047', 17)
        fx.ring(cx, topY, { color: '#fde047', maxR: 30, life: 0.3 })
        sfx.score(w.streak)
      } else {
        w.streak = 0
      }
      w.score += gain
      const h = maxHeight(w)
      if (h > w.bestHeight) {
        if (h >= 5 && h > w.bestHeight) fx.text(cx, topY - 40, `NEW HEIGHT ${h}`, '#ffffff', 15)
        w.bestHeight = h
      }
      w.stats.height = Math.max(w.stats.height, h)
    }
    w.hand[slot] = null
    w.sel = -1
    refillHand()
    w.stats.score = w.score
    run.update(w.stats)
    pushHud()
    if (!w.hand.some(Boolean)) w.autoWave = 1.4
  }

  // ── Input ─────────────────────────────────────────────

  function slotAt(x: number, y: number) {
    const { W, trayY } = geo()
    if (y < trayY + 4) return -1
    const sw = (W - 24) / 3
    const i = Math.floor((x - 12) / sw)
    return i >= 0 && i < 3 ? i : -1
  }

  function hitCritter(x: number, y: number) {
    const w = world.current
    const { baseY } = geo()
    for (const g of w.gulls) {
      if (!g.flee && Math.hypot(g.x - x, g.y - y) < 34) {
        g.flee = true
        g.vx = (g.vx > 0 ? 1 : -1) * 320
        if (g.carry) {
          w.decos.push(g.carry)
          g.carry.y = -40
          fx.text(g.x, g.y + 20, 'SAVED!', '#bbf7d0', 15)
          g.carry = null
        }
        g.target = null
        w.stats.critters += 1
        w.score += 15
        fx.burst(g.x, g.y, { count: 12, color: ['#ffffff', '#e2e8f0'], speed: 200, gravity: 120 })
        fx.text(g.x, g.y - 20, 'SHOO! +15', '#ffffff', 15)
        sfx.whoosh()
        haptic.light()
        run.update(w.stats)
        return true
      }
    }
    for (const c of w.crabs) {
      if (c.flip <= 0 && Math.hypot(c.x - x, baseY - 8 - y) < 34) {
        c.flip = 0.01
        c.vy = -420
        w.stats.critters += 1
        w.score += 15
        fx.burst(c.x, baseY - 8, { count: 10, color: ['#fca5a5', '#fde68a'], speed: 200 })
        fx.text(c.x, baseY - 40, 'FLIP! +15', '#fecaca', 15)
        sfx.pop()
        haptic.light()
        run.update(w.stats)
        return true
      }
    }
    return false
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const el = e.currentTarget
    const { x, y } = localPoint(e, el)
    if (hitCritter(x, y)) return
    const w = world.current
    if (w.stage !== 'build') return
    const s = slotAt(x, y)
    el.setPointerCapture(e.pointerId)
    if (s >= 0 && w.hand[s]) {
      w.sel = s
      drag.current = { id: e.pointerId, x, y, slot: s, moved: false, onBoard: false }
      sfx.tap()
      return
    }
    if (w.sel >= 0 && y < geo().trayY) {
      drag.current = { id: e.pointerId, x, y, slot: w.sel, moved: true, onBoard: true }
    }
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const { x, y } = localPoint(e, e.currentTarget)
    if (Math.hypot(x - d.x, y - d.y) > 8) d.moved = true
    d.x = x
    d.y = y
    d.onBoard = y < geo().trayY - 4
  }

  function onUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const w = world.current
    const k = w.hand[d.slot]
    if (!k) return
    if (d.onBoard) place(d.slot, pieceAt(d.x, k))
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'w' || e.key === 'Enter') callWave()
      if (e.key >= '1' && e.key <= '3') world.current.sel = Number(e.key) - 1
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation ────────────────────────────────────────

  function spawnHazards(dt: number) {
    const w = world.current
    const { W, H, right } = geo()
    if (w.tide < 2 || w.stage !== 'build') return
    w.hazardT -= dt
    if (w.hazardT > 0) return
    w.hazardT = rand(Math.max(4, 10 - w.tide * 0.4), Math.max(7, 15 - w.tide * 0.5))
    const crabOk = w.tide >= 3 && w.crabs.length < 1 + Math.floor(w.tide / 6)
    if (crabOk && Math.random() < 0.5) {
      w.crabs.push({ x: right + 30, dir: -1, t: rand(0, 5), pinch: 0, flip: 0, vy: 0, y: 0, gone: false })
    } else if (w.gulls.length < 1 + Math.floor(w.tide / 7)) {
      const fromLeft = Math.random() < 0.5
      w.gulls.push({ x: fromLeft ? -30 : W + 30, y: rand(60, H * 0.22), vx: (fromLeft ? 1 : -1) * rand(70, 95), t: rand(0, 5), target: null, swoop: 0, carry: null, flee: false })
    }
  }

  function updateHazards(dt: number) {
    const w = world.current
    const { W, cs, bx, baseY, right } = geo()
    for (const g of w.gulls) {
      g.t += dt
      if (g.flee) {
        g.x += g.vx * dt
        g.y -= 140 * dt
        continue
      }
      if (!g.target && !g.carry && w.decos.length && Math.random() < dt * 0.6) {
        const d = w.decos[Math.floor(Math.random() * w.decos.length)]
        const dx = bx + d.col * cs + cs / 2
        if (Math.abs(dx - g.x) < 140) g.target = d
      }
      if (g.target) {
        const d = g.target
        if (!w.decos.includes(d)) {
          g.target = null
          continue
        }
        const tx = bx + d.col * cs + cs / 2
        const ty = baseY - colTop(w, d.col) * cs - 14
        g.x += (tx - g.x) * Math.min(1, dt * 1.6)
        g.y += (ty - g.y) * Math.min(1, dt * 1.6)
        g.vx = tx > g.x ? Math.abs(g.vx) : -Math.abs(g.vx)
        if (Math.hypot(tx - g.x, ty - g.y) < 8) {
          w.decos = w.decos.filter((x) => x !== d)
          g.carry = d
          g.target = null
          fx.text(g.x, g.y - 20, 'STOLEN!', '#fca5a5', 15)
          sfx.miss()
        }
      } else {
        g.x += g.vx * dt
        if (g.carry) g.y -= 50 * dt
        else g.y += Math.sin(g.t * 2) * 12 * dt
      }
    }
    w.gulls = w.gulls.filter((g) => g.x > -60 && g.x < W + 60 && g.y > -60)

    for (const c of w.crabs) {
      c.t += dt
      if (c.flip > 0) {
        c.flip += dt
        c.vy += 1200 * dt
        c.y += c.vy * dt
        c.x += 160 * dt
        if (c.flip > 1.5) c.gone = true
        continue
      }
      const col = Math.floor((c.x - bx) / cs)
      const ahead = Math.floor((c.x - 14 - bx) / cs)
      if (col >= 0 && col < COLS && moatDepth(w, col) > 0) {
        // Fell into a moat: it gives up and scuttles back to sea.
        if (c.dir < 0) {
          fx.text(c.x, baseY - 30, 'BLOCKED', '#bae6fd', 13)
          fx.burst(c.x, baseY, { count: 8, color: ['#7dd3fc', '#ffffff'], speed: 120, angle: -Math.PI / 2, spread: 1.4 })
        }
        c.dir = 1
      }
      const blocker = ahead >= 0 && ahead < COLS && colTop(w, ahead) > 0 ? ahead : -1
      if (c.dir < 0 && blocker >= 0) {
        c.pinch += dt
        if (c.pinch > 1.6) {
          c.pinch = 0
          for (let r = GROUND; r < TOTAL; r++) {
            if (w.type[blocker][r] >= SAND) {
              w.hp[blocker][r] -= 1
              if (w.hp[blocker][r] <= 0) {
                w.type[blocker][r] = EMPTY
                settle(w, blocker)
                doSlump()
              }
              break
            }
          }
          fx.burst(bx + blocker * cs + cs, baseY - cs / 2, { count: 6, color: ['#fde68a', '#d6a35c'], speed: 120, shape: 'square', gravity: 500 })
          fx.text(c.x, baseY - 34, 'PINCH', '#fca5a5', 13)
          sfx.hit()
          pushHud()
        }
      } else {
        c.pinch = 0
        c.x += c.dir * 34 * dt
      }
      if (c.x < bx - 20) c.dir = 1
      if (c.dir > 0 && c.x > right + 40) c.gone = true
    }
    w.crabs = w.crabs.filter((c) => !c.gone)
  }

  function idleDemo() {
    const w = world.current
    if (castleCells(w) > 0) return
    const hs = [0, 2, 3, 5, 3, 4, 2, 1, 0, 0]
    for (let c = 0; c < COLS; c++) {
      for (let j = 0; j < hs[c]; j++) {
        w.type[c][GROUND + j] = j === 0 || c === 6 ? PACKED : SAND
        w.hp[c][GROUND + j] = 3
      }
    }
    w.type[8][0] = EMPTY
    w.type[8][1] = EMPTY
    w.decos.push({ col: 3, kind: 'flag', y: 0, hue: 0 }, { col: 5, kind: 'shell', y: 0, hue: 0.8 })
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const { cs, bx, baseY, right, trayY } = geo()

    if (ph === 'idle') idleDemo()

    for (const cl of w.clouds) {
      cl.x += cl.v * raw
      if (cl.x > W + 80) cl.x = -100
    }
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r < TOTAL; r++) {
        if (w.pop[c][r] > 0) w.pop[c][r] = Math.max(0, w.pop[c][r] - raw * 4)
        if (w.wet[c][r] > 0 && w.stage === 'build') w.wet[c][r] = Math.max(0, w.wet[c][r] - raw * 0.08)
      }
    for (const d of w.decos) d.y = Math.min(0, d.y + raw * 260)

    if (ph === 'play') {
      if (w.stage === 'build') {
        w.timer -= dt
        if (w.autoWave > 0) {
          w.autoWave -= dt
          if (w.autoWave <= 0) startWave()
        } else if (w.timer <= 0) startWave()
        else if (w.timer < 3.2 && Math.floor(w.timer * 2) !== Math.floor((w.timer + dt) * 2)) sfx.tick()
        spawnHazards(dt)
      } else if (w.stage === 'wave') {
        const speed = 230 + w.tide * 6
        w.waveX -= speed * dt
        w.waveTop = Math.min(w.waveTop, w.waveX)
        while (w.waveCol > 0 && w.waveX <= bx + (w.waveCol - 0.5) * cs) {
          w.waveCol -= 1
          if (w.waveP > 0) hitColumn(w.waveCol)
        }
        if (w.waveP <= 0 || w.waveX < bx - cs) {
          w.stage = 'recede'
          w.recede = 0
        }
      } else if (w.stage === 'recede') {
        w.recede += dt
        if (w.recede > 1.1) endWave()
      }
    }
    if (ph === 'play' || ph === 'dying') updateHazards(dt)

    // ── Draw ─────────────────────────────────────────
    const dusk = clamp((w.tide - 6) / 10, 0, 1)
    const sky = ctx.createLinearGradient(0, 0, 0, baseY)
    sky.addColorStop(0, dusk > 0 ? `rgb(${Math.round(56 + dusk * 60)},${Math.round(189 - dusk * 110)},${Math.round(248 - dusk * 90)})` : '#38bdf8')
    sky.addColorStop(1, dusk > 0 ? `rgb(${Math.round(186 + dusk * 60)},${Math.round(230 - dusk * 80)},${Math.round(253 - dusk * 120)})` : '#bae6fd')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)
    const sunX = W * 0.78
    const sunY = 70 + dusk * 90
    glow(ctx, sunX, sunY, 90, dusk > 0.4 ? '#fb923c' : '#fef08a', 0.5)
    ctx.fillStyle = dusk > 0.4 ? '#fdba74' : '#fef9c3'
    ctx.beginPath()
    ctx.arc(sunX, sunY, 24, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    for (const cl of w.clouds) {
      ctx.beginPath()
      ctx.ellipse(cl.x, cl.y, 34 * cl.s, 12 * cl.s, 0, 0, Math.PI * 2)
      ctx.ellipse(cl.x - 18 * cl.s, cl.y + 3, 18 * cl.s, 9 * cl.s, 0, 0, Math.PI * 2)
      ctx.ellipse(cl.x + 14 * cl.s, cl.y - 6 * cl.s, 18 * cl.s, 12 * cl.s, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    fx.applyShake(ctx)

    // distant sea band
    const horizon = baseY - cs * 2.2
    const far = ctx.createLinearGradient(0, horizon, 0, baseY)
    far.addColorStop(0, '#0ea5e9')
    far.addColorStop(1, '#38bdf8')
    ctx.fillStyle = far
    ctx.fillRect(0, horizon, W, baseY - horizon + 2)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    for (let i = 0; i < 7; i++) {
      const x = ((i * 67 + t * 12) % (W + 40)) - 20
      ctx.fillRect(x, horizon + 6 + (i % 3) * 7, 16, 1.5)
    }

    // tide level at the sea edge (rises as the meter fills)
    const meter = w.stage === 'build' ? 1 - w.timer / w.timerMax : 1
    const tideLvl = ph === 'idle' ? 0.3 + Math.sin(t) * 0.1 : meter
    const seaY = baseY - tideLvl * cs * 0.8 + Math.sin(t * 2) * 2

    // beach
    const beach = ctx.createLinearGradient(0, baseY, 0, trayY)
    beach.addColorStop(0, '#f5d58a')
    beach.addColorStop(1, '#d9a95a')
    ctx.fillStyle = beach
    ctx.beginPath()
    ctx.moveTo(0, baseY)
    ctx.lineTo(right + cs * 0.4, baseY)
    ctx.quadraticCurveTo(right + cs * 1.4, baseY + cs * 0.3, W, baseY + cs * 1.6)
    ctx.lineTo(W, trayY)
    ctx.lineTo(0, trayY)
    ctx.closePath()
    ctx.fill()
    // foreground sea on the right
    const sea = ctx.createLinearGradient(0, seaY, 0, trayY)
    sea.addColorStop(0, '#22d3ee')
    sea.addColorStop(1, '#0369a1')
    ctx.fillStyle = sea
    ctx.beginPath()
    ctx.moveTo(right + cs * 0.6 - tideLvl * cs, trayY)
    ctx.lineTo(right + cs * 0.6 - tideLvl * cs, seaY)
    for (let x = right + cs * 0.6 - tideLvl * cs; x <= W + 8; x += 8) ctx.lineTo(x, seaY + Math.sin(x * 0.08 + t * 3) * 2.5)
    ctx.lineTo(W, trayY)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = right + cs * 0.6 - tideLvl * cs; x <= W + 8; x += 8) {
      const yy = seaY + Math.sin(x * 0.08 + t * 3) * 2.5
      if (x === right + cs * 0.6 - tideLvl * cs) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()

    // ground cells: moats
    for (let c = 0; c < COLS; c++) {
      const m = moatDepth(w, c)
      if (m === 0) continue
      const x = bx + c * cs
      ctx.fillStyle = '#a16207'
      ctx.fillRect(x, baseY, cs, m * cs)
      const water = ctx.createLinearGradient(0, baseY, 0, baseY + m * cs)
      water.addColorStop(0, '#67e8f9')
      water.addColorStop(1, '#0e7490')
      ctx.fillStyle = water
      ctx.fillRect(x + 2, baseY + 4 + Math.sin(t * 3 + c) * 1.5, cs - 4, m * cs - 6)
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillRect(x + 4, baseY + 6 + Math.sin(t * 3 + c) * 1.5, cs * 0.4, 2)
    }

    // goal line
    if (ph !== 'idle') {
      const goal = goalFor(w.tide)
      const gy = baseY - goal * cs
      ctx.setLineDash([6, 6])
      ctx.strokeStyle = maxHeight(w) >= goal ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.75)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(bx, gy)
      ctx.lineTo(right, gy)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = maxHeight(w) >= goal ? '#4ade80' : '#ffffff'
      ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`GOAL ${goal}`, bx + 2, gy - 3)
      // wave height marker on the sea side
      const eff = Math.max(1, w.tide - w.push)
      const rows = waveRowsFor(eff, w.rogue)
      const wy = baseY - rows * cs
      ctx.strokeStyle = 'rgba(14,116,144,0.8)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(right + 6, wy)
      ctx.lineTo(right + 18, wy)
      ctx.stroke()
      ctx.fillStyle = '#0e7490'
      ctx.textAlign = 'left'
      ctx.fillText('WAVE', right + 4, wy - 2)
    }

    // castle cells
    for (let c = 0; c < COLS; c++) {
      const top = colTop(w, c)
      for (let r = 0; r < TOTAL; r++) {
        const tp = w.type[c][r]
        if (tp < SAND) continue
        const x = bx + c * cs
        const y = rowTop(r)
        const pop = w.pop[c][r]
        const v = (c * 7 + r * 3) % 4
        if (pop > 0) {
          const sx = 1 + pop * 0.25
          const sy = 1 - pop * 0.2
          ctx.drawImage(sandCell(cs, tp, v), x + (cs - cs * sx) / 2, y + cs - cs * sy - pop * 6, cs * sx, cs * sy)
        } else ctx.drawImage(sandCell(cs, tp, v), x, y, cs, cs)
        if (w.wet[c][r] > 0) {
          ctx.globalAlpha = w.wet[c][r] * 0.35
          ctx.fillStyle = '#7c4a1a'
          ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2)
          ctx.globalAlpha = 1
        }
        if (tp === PACKED && w.hp[c][r] < w.wallHp) {
          ctx.strokeStyle = 'rgba(60,30,10,0.7)'
          ctx.lineWidth = 1.4
          ctx.beginPath()
          ctx.moveTo(x + cs * 0.2, y + cs * 0.1)
          ctx.lineTo(x + cs * 0.45, y + cs * 0.45)
          ctx.lineTo(x + cs * 0.3, y + cs * 0.8)
          if (w.hp[c][r] < w.wallHp - 1) {
            ctx.moveTo(x + cs * 0.45, y + cs * 0.45)
            ctx.lineTo(x + cs * 0.85, y + cs * 0.6)
          }
          ctx.stroke()
        }
        // window on tall towers
        const fromTop = top + GROUND - 1 - r
        if (top >= 3 && fromTop === 1) {
          ctx.fillStyle = '#5b3410'
          ctx.beginPath()
          ctx.moveTo(x + cs * 0.36, y + cs * 0.8)
          ctx.lineTo(x + cs * 0.36, y + cs * 0.42)
          ctx.arc(x + cs * 0.5, y + cs * 0.42, cs * 0.14, Math.PI, 0)
          ctx.lineTo(x + cs * 0.64, y + cs * 0.8)
          ctx.closePath()
          ctx.fill()
        }
      }
      // crenellations on local peaks
      const l = c > 0 ? colTop(w, c - 1) : 0
      const rr = c < COLS - 1 ? colTop(w, c + 1) : 0
      if (top >= 2 && top >= l && top >= rr) {
        const x = bx + c * cs
        const y = baseY - top * cs
        ctx.fillStyle = '#f2cf86'
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.roundRect(x + cs * (0.06 + i * 0.33), y - cs * 0.22, cs * 0.24, cs * 0.24, 2)
          ctx.fill()
        }
      }
    }

    // decorations
    for (const d of w.decos) {
      const x = bx + d.col * cs + cs / 2
      const top = colTop(w, d.col)
      const y = baseY - top * cs + d.y
      if (d.kind === 'shell') drawShell(ctx, x, y - cs * 0.28 - (top >= 2 ? cs * 0.2 : 0), cs * 0.32, d.hue)
      else drawFlag(ctx, x, y - (top >= 2 ? cs * 0.2 : 0), cs * 0.75, t, d.hue > 0.5 ? '#3b82f6' : '#ef4444')
    }

    // crabs & gulls
    for (const c of w.crabs) drawCrab(ctx, c.x, baseY + c.y, t + c.t, c.flip, c.pinch)
    for (const g of w.gulls) {
      if (g.carry) {
        if (g.carry.kind === 'shell') drawShell(ctx, g.x, g.y + 12, cs * 0.28, g.carry.hue)
        else drawFlag(ctx, g.x - 4, g.y + 26, cs * 0.5, t)
      }
      drawGull(ctx, g, t)
    }

    // the wave
    if (w.stage === 'wave' || w.stage === 'recede') {
      const rows = w.waveRows
      const k = w.stage === 'recede' ? clamp(w.recede / 1.1, 0, 1) : 0
      const front = w.stage === 'recede' ? w.waveTop + (W + 60 - w.waveTop) * k * k : w.waveX
      const hgt = rows * cs * (1 - k * 0.8)
      const topY = baseY - hgt
      const g = ctx.createLinearGradient(0, topY, 0, baseY + cs)
      g.addColorStop(0, w.rogue ? '#0891b2' : '#22d3ee')
      g.addColorStop(1, '#0c4a6e')
      ctx.globalAlpha = 0.86
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(W + 10, baseY + cs * 2)
      ctx.lineTo(front - 6, baseY + cs * 2)
      ctx.lineTo(front - 6, baseY)
      ctx.quadraticCurveTo(front - cs * 0.6, topY + hgt * 0.4, front + cs * 0.2, topY)
      for (let x = front + cs * 0.2; x <= W + 10; x += 10) ctx.lineTo(x, topY + Math.sin(x * 0.05 + t * 5) * 4)
      ctx.lineTo(W + 10, baseY + cs * 2)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
      // foam curl
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      for (let i = 0; i < 6; i++) {
        const fy = topY + (i / 6) * hgt
        ctx.beginPath()
        ctx.arc(front - 4 + Math.sin(t * 9 + i) * 3 - (i / 6) * cs * 0.3, fy, cs * 0.18 + (i % 2) * 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.beginPath()
      ctx.arc(front + cs * 0.2, topY + 2, cs * 0.3, 0, Math.PI * 2)
      ctx.fill()
      if (w.stage === 'wave' && Math.random() < 0.5) fx.burst(front, topY + rand(0, hgt), { count: 1, color: ['#ffffff', '#e0f2fe'], speed: 120, angle: Math.PI, spread: 1.4, gravity: 300 })
    }

    // ghost preview
    const d = drag.current
    if (ph === 'play' && w.stage === 'build' && w.sel >= 0 && d && d.onBoard) {
      const k = w.hand[w.sel]
      if (k) {
        const c = pieceAt(d.x, k)
        const ok = canPlace(k, c)
        const p = PIECES[k]
        ctx.globalAlpha = 0.5 + Math.sin(t * 10) * 0.12
        if (p.tool) {
          const top = colTop(w, c)
          ctx.fillStyle = ok ? 'rgba(255,255,255,0.5)' : 'rgba(239,68,68,0.5)'
          ctx.fillRect(bx + c * cs, baseY - Math.max(0, top) * cs - cs, cs, cs)
        } else {
          for (let i = 0; i < p.cols.length; i++) {
            const top = colTop(w, c + i)
            for (let j = 0; j < p.cols[i]; j++) {
              const y = baseY - (top + j + 1) * cs
              if (ok) ctx.drawImage(sandCell(cs, p.mat, 0), bx + (c + i) * cs, y, cs, cs)
              else {
                ctx.fillStyle = 'rgba(239,68,68,0.6)'
                ctx.fillRect(bx + (c + i) * cs, y, cs, cs)
              }
            }
          }
        }
        ctx.globalAlpha = 1
        ctx.strokeStyle = ok ? 'rgba(255,255,255,0.6)' : 'rgba(239,68,68,0.7)'
        ctx.setLineDash([4, 5])
        ctx.lineWidth = 1.5
        ctx.strokeRect(bx + c * cs, 46, p.cols.length * cs, baseY - 46)
        ctx.setLineDash([])
      }
    }

    fx.draw(ctx)
    ctx.restore()

    // tray
    const tray = ctx.createLinearGradient(0, trayY, 0, H)
    tray.addColorStop(0, '#7c4a1a')
    tray.addColorStop(1, '#4a2a0c')
    ctx.fillStyle = tray
    ctx.fillRect(0, trayY, W, H - trayY)
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(0, trayY, W, 2)
    const sw = (W - 24) / 3
    for (let i = 0; i < 3; i++) {
      const k = w.hand[i]
      const x = 12 + i * sw
      const sel = w.sel === i && ph === 'play'
      ctx.fillStyle = sel ? 'rgba(253,224,71,0.3)' : 'rgba(0,0,0,0.25)'
      ctx.strokeStyle = sel ? '#fde047' : 'rgba(255,255,255,0.15)'
      ctx.lineWidth = sel ? 2.5 : 1
      ctx.beginPath()
      ctx.roundRect(x + 4, trayY + 10, sw - 8, TRAY_H - 22, 12)
      ctx.fill()
      ctx.stroke()
      if (!k) continue
      if (d && d.slot === i && d.onBoard) ctx.globalAlpha = 0.35
      const cx = x + sw / 2
      const cy = trayY + 10 + (TRAY_H - 22) / 2 - 6
      const p = PIECES[k]
      const s = 15
      if (k === 'shovel') drawShovel(ctx, cx, cy + 4, 26)
      else if (k === 'wet') drawBucketIcon(ctx, cx, cy, 28, t)
      else if (k === 'shell') drawShell(ctx, cx, cy + 6, 14, 0.8)
      else if (k === 'flag') drawFlag(ctx, cx - 6, cy + 16, 22, t)
      else {
        const wid = p.cols.length * s
        const tallest = Math.max(...p.cols)
        for (let ci = 0; ci < p.cols.length; ci++)
          for (let j = 0; j < p.cols[ci]; j++) ctx.drawImage(sandCell(s, p.mat, (ci + j) % 4), cx - wid / 2 + ci * s, cy + (tallest * s) / 2 - (j + 1) * s, s, s)
      }
      ctx.fillStyle = '#fef3c7'
      ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(p.label.toUpperCase(), cx, trayY + TRAY_H - 18)
      ctx.globalAlpha = 1
    }
    if (ph === 'play') {
      ctx.fillStyle = 'rgba(254,243,199,0.7)'
      ctx.font = "700 10px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'right'
      ctx.fillText(`+${w.bag.length} in bucket`, W - 14, trayY + TRAY_H - 4)
    }

    // tide meter
    if (ph === 'play' || ph === 'dying') {
      const mw = W * 0.42
      const mx = (W - mw) / 2
      const my = 14
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.roundRect(mx, my, mw, 10, 5)
      ctx.fill()
      const fill = w.stage === 'build' ? 1 - w.timer / w.timerMax : 1
      const mg = ctx.createLinearGradient(mx, 0, mx + mw, 0)
      mg.addColorStop(0, '#67e8f9')
      mg.addColorStop(1, w.rogue ? '#ef4444' : '#0284c7')
      ctx.fillStyle = mg
      ctx.beginPath()
      ctx.roundRect(mx, my, Math.max(10, mw * fill), 10, 5)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(w.stage === 'build' ? `WAVE IN ${Math.ceil(w.timer)}s` : 'WAVE!', W / 2, my + 13)
    }

    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const won = hud.survived >= 6
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena sandcastle-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Tide {hud.tide} · Tower {hud.height}/{hud.goal}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hearts">
                  {'❤'.repeat(Math.max(0, hud.hearts))}
                  <span style={{ opacity: 0.3 }}>{'❤'.repeat(Math.max(0, 3 - hud.hearts))}</span>
                </span>
              </div>
            </div>
          )}
          {phase === 'play' && hud.stage === 'build' ? (
            <button
              type="button"
              className="sandcastle-wave"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => callWave()}
            >
              Wave!
            </button>
          ) : null}
          {banner && phase === 'play' ? (
            <div className="action-banner sandcastle-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="sandcastle"
              icon={meta.icon}
              title={meta.title}
              hint="Drag sand pieces onto the beach. Reach the goal height before each wave — walls and moats keep your castle standing."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'King of the beach!' : 'Washed away'}
            subtitle={`Score ${hud.score} · ${hud.survived} tides survived`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
