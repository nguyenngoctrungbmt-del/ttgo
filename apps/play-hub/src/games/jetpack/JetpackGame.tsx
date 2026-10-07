import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, glow, rand } from '../../shared/action/fx'
import { useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { useProgressStore } from '../../store/progressStore'
import '../../shared/action/action.css'
import {
  CRUSH_P, CRUSH_W, MINE_CHARGE, MINE_CORE, MINE_P, MINE_R, MINE_ZAP, circleRect, crusherK, drawAmb, drawBoss, drawBossBar, drawCell,
  drawCrusher, drawGem, drawIceBack, drawIceTrim, drawLavaBack, drawLavaFloor, drawMine, drawOrb, drawZapBolt, freshBoss, makeAmb, stepAmb,
  type AmbKind, type Boss, type Cell, type Crusher, type Gem, type Mine, type Orb,
} from './extra'

const meta = getGame('jetpack')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type PowerKind = 'shield' | 'magnet' | 'rocket'
type Zapper = { x: number; y: number; len: number; ang: number; spin: number; amp: number; ph: number; near: boolean }
type Missile = { x: number; y: number; warn: number; passed: boolean }
type Laser = { y: number; t: number; charge: number; fire: number; boss?: boolean }
type Coin = { x: number; y: number; pull: boolean }
type Power = { x: number; y: number; kind: PowerKind; t: number }
type Zone = { name: string; top: string; bot: string; far: string; mid: string; floor: string; stripe: string; accent: string; stars?: boolean; kind?: 'lava' | 'ice'; amb?: AmbKind }

const ZONES: Zone[] = [
  { name: 'Secret Lab', top: '#0b1a33', bot: '#16294d', far: '#1d3a66', mid: '#25456f', floor: '#0e1a2e', stripe: '#38bdf8', accent: '#38bdf8' },
  { name: 'Rocket Factory', top: '#241105', bot: '#43230d', far: '#5a3215', mid: '#6b3d1a', floor: '#1f1007', stripe: '#fb923c', accent: '#fbbf24' },
  { name: 'Bio Dome', top: '#04241a', bot: '#0b3a2a', far: '#0f4a35', mid: '#155c41', floor: '#062016', stripe: '#4ade80', accent: '#86efac' },
  { name: 'Neon Labs', top: '#1a0833', bot: '#33125c', far: '#45197a', mid: '#58208f', floor: '#14062a', stripe: '#e879f9', accent: '#f0abfc' },
  { name: 'Orbital Deck', top: '#020617', bot: '#0b1430', far: '#1e293b', mid: '#334155', floor: '#0a0f1f', stripe: '#a5b4fc', accent: '#c7d2fe', stars: true },
  { name: 'Magma Foundry', top: '#1c0603', bot: '#3f0d05', far: '#3b0d0a', mid: '#44403c', floor: '#140504', stripe: '#f97316', accent: '#fdba74', kind: 'lava', amb: 'embers' },
  { name: 'Cryo Vault', top: '#071a2e', bot: '#12385a', far: '#1e3a5f', mid: '#94a3b8', floor: '#0a1a2c', stripe: '#7dd3fc', accent: '#bae6fd', kind: 'ice', amb: 'snow' },
]

// First Sentinel boss after ~2:50 of flight, then every 150 s after each defeat
const BOSS_FIRST = 170
const BOSS_EVERY = 150

const TIERS: { t: number; label: string }[] = [
  { t: 0, label: '' },
  { t: 30, label: 'MISSILES INCOMING' },
  { t: 60, label: 'SPINNING ZAPPERS' },
  { t: 90, label: 'LASER ALERT' },
  { t: 125, label: 'MISSILE SALVOS' },
  { t: 160, label: 'MOVING ZAPPERS' },
  { t: 200, label: 'LASER GRIDS' },
  { t: 240, label: 'SHOCK MINES' },
  { t: 285, label: 'CRUSHERS' },
]

const SHAPES: string[][] = [
  ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...'],
  ['..#....', '..##...', '#######', '########', '#######', '..##...', '..#....'],
  ['########', '#......#', '#.####.#', '#.#..#.#', '#.####.#', '#......#', '########'],
  ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
]

const CEIL = 34
const PR = 12
const PX_PER_M = 20
const GRAV = 1350
const THRUST = 2700

type World = {
  t: number
  dist: number
  speed: number
  scroll: number
  gap: number
  py: number
  vy: number
  tilt: number
  runPh: number
  onFloor: boolean
  shield: number
  inv: number
  magnetT: number
  rocketT: number
  headStart: number
  zappers: Zapper[]
  missiles: Missile[]
  lasers: Laser[]
  coins: Coin[]
  powers: Power[]
  mines: Mine[]
  crushers: Crusher[]
  orbs: Orb[]
  gems: Gem[]
  cells: Cell[]
  boss: Boss
  bossNext: number
  bossCount: number
  empFx: number
  missileT: number
  laserT: number
  powerT: number
  tier: number
  zone: number
  zoneFade: number
  nextMark: number
  nextMilestone: number
  streak: number
  streakT: number
  deadRot: number
  flameAcc: number
  stats: { dist: number; coins: number; powerups: number; missiles: number; close: number }
}

function freshWorld(H: number): World {
  return {
    t: 0,
    dist: 0,
    speed: 230,
    scroll: 0,
    gap: 400,
    py: H * 0.55,
    vy: 0,
    tilt: 0,
    runPh: 0,
    onFloor: false,
    shield: 0,
    inv: 0,
    magnetT: 0,
    rocketT: 0,
    headStart: 0,
    zappers: [],
    missiles: [],
    lasers: [],
    coins: [],
    powers: [],
    mines: [],
    crushers: [],
    orbs: [],
    gems: [],
    cells: [],
    boss: freshBoss(),
    bossNext: BOSS_FIRST,
    bossCount: 0,
    empFx: 0,
    missileT: 4,
    laserT: 5,
    powerT: 14,
    tier: 0,
    zone: 0,
    zoneFade: 0,
    nextMark: 100,
    nextMilestone: 1000,
    streak: 0,
    streakT: 0,
    deadRot: 0,
    flameAcc: 0,
    stats: { dist: 0, coins: 0, powerups: 0, missiles: 0, close: 0 },
  }
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const l2 = dx * dx + dy * dy || 1
  const k = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1)
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k))
}

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k
}

// ── Art ────────────────────────────────────────────────────

function drawHero(ctx: CanvasRenderingContext2D, t: number, thrust: boolean, onFloor: boolean, runPh: number, tilt: number) {
  ctx.save()
  ctx.rotate(tilt)
  // Scarf trailing behind
  ctx.strokeStyle = '#ef4444'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(-2, -10)
  for (let i = 1; i <= 5; i++) ctx.lineTo(-2 - i * 6.5, -10 + Math.sin(t * 14 - i * 0.9) * i * 0.9 + i * 0.8)
  ctx.stroke()
  ctx.strokeStyle = '#fca5a5'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Flame
  if (thrust) {
    const L = 20 + Math.random() * 12
    for (const nx of [-18, -11]) {
      ctx.fillStyle = '#f97316'
      ctx.beginPath()
      ctx.moveTo(nx - 4, 9)
      ctx.quadraticCurveTo(nx, 9 + L * 1.1, nx + 4, 9)
      ctx.fill()
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.moveTo(nx - 2.6, 9)
      ctx.quadraticCurveTo(nx, 9 + L * 0.7, nx + 2.6, 9)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.moveTo(nx - 1.3, 9)
      ctx.quadraticCurveTo(nx, 9 + L * 0.35, nx + 1.3, 9)
      ctx.fill()
    }
  } else {
    ctx.fillStyle = '#7dd3fc'
    for (const nx of [-18, -11]) {
      ctx.beginPath()
      ctx.moveTo(nx - 2, 9)
      ctx.quadraticCurveTo(nx, 15 + Math.random() * 2, nx + 2, 9)
      ctx.fill()
    }
  }
  // Jetpack
  const pack = ctx.createLinearGradient(-22, 0, -7, 0)
  pack.addColorStop(0, '#64748b')
  pack.addColorStop(0.5, '#cbd5e1')
  pack.addColorStop(1, '#475569')
  ctx.fillStyle = pack
  ctx.beginPath()
  ctx.roundRect(-22, -14, 15, 22, 5)
  ctx.fill()
  ctx.fillStyle = '#334155'
  ctx.fillRect(-21, 6, 6, 4)
  ctx.fillRect(-14, 6, 6, 4)
  ctx.fillStyle = '#ef4444'
  ctx.fillRect(-19, -9, 9, 3)
  // Legs
  ctx.strokeStyle = '#1e3a8a'
  ctx.lineWidth = 6
  const swing = onFloor ? Math.sin(runPh) * 0.8 : Math.sin(t * 3) * 0.15 + 0.35
  for (const s of [1, -1]) {
    const a = Math.PI / 2 - swing * s
    ctx.beginPath()
    ctx.moveTo(0, 8)
    ctx.lineTo(Math.cos(a) * 12, 8 + Math.sin(a) * 12)
    ctx.stroke()
  }
  ctx.fillStyle = '#0f172a'
  for (const s of [1, -1]) {
    const a = Math.PI / 2 - swing * s
    ctx.beginPath()
    ctx.ellipse(Math.cos(a) * 12 + 2, 8 + Math.sin(a) * 12 + 1, 4.5, 3, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // Body
  const suit = ctx.createLinearGradient(0, -12, 0, 12)
  suit.addColorStop(0, '#fb923c')
  suit.addColorStop(1, '#c2410c')
  ctx.fillStyle = suit
  ctx.beginPath()
  ctx.roundRect(-9, -11, 18, 21, 6)
  ctx.fill()
  ctx.fillStyle = '#7c2d12'
  ctx.fillRect(-9, 3, 18, 3)
  ctx.fillStyle = '#fde047'
  ctx.fillRect(-1.5, 3, 4, 3)
  // Arm reaching forward
  ctx.strokeStyle = '#ea580c'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(2, -5)
  ctx.lineTo(11, thrust ? -1 : 2)
  ctx.stroke()
  ctx.fillStyle = '#fef3c7'
  ctx.beginPath()
  ctx.arc(12, thrust ? -1 : 2, 3, 0, Math.PI * 2)
  ctx.fill()
  // Helmet
  const helm = ctx.createRadialGradient(-1, -23, 2, 2, -19, 12)
  helm.addColorStop(0, '#ffffff')
  helm.addColorStop(1, '#cbd5e1')
  ctx.fillStyle = helm
  ctx.beginPath()
  ctx.arc(2, -19, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#64748b'
  ctx.lineWidth = 1.5
  ctx.stroke()
  const visor = ctx.createLinearGradient(4, -24, 12, -14)
  visor.addColorStop(0, '#67e8f9')
  visor.addColorStop(1, '#0e7490')
  ctx.fillStyle = visor
  ctx.beginPath()
  ctx.ellipse(6.5, -19, 6, 5.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.beginPath()
  ctx.ellipse(5, -21.5, 2.4, 1.4, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawZapper(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, t: number) {
  // Beam: glow + jagged core
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(251,191,36,0.28)'
  ctx.lineWidth = 16
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  ctx.lineTo(bx, by)
  ctx.stroke()
  const dx = bx - ax
  const dy = by - ay
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const n = Math.max(4, Math.round(len / 18))
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass ? '#fffbeb' : '#facc15'
    ctx.lineWidth = pass ? 1.6 : 4
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    for (let i = 1; i < n; i++) {
      const k = i / n
      const off = (Math.random() - 0.5) * 9
      ctx.lineTo(ax + dx * k + nx * off, ay + dy * k + ny * off)
    }
    ctx.lineTo(bx, by)
    ctx.stroke()
  }
  for (const [x, y] of [
    [ax, ay],
    [bx, by],
  ]) {
    ctx.fillStyle = '#1f2937'
    ctx.beginPath()
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#9ca3af'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = Math.sin(t * 20) > 0 ? '#fef08a' : '#f59e0b'
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const sx = Math.abs(Math.cos(t * 4 + x * 0.02)) * 0.8 + 0.2
  ctx.fillStyle = '#b45309'
  ctx.beginPath()
  ctx.ellipse(x, y, 8 * sx, 8, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fbbf24'
  ctx.beginPath()
  ctx.ellipse(x, y, 6.6 * sx, 6.6, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.ellipse(x - 1.5 * sx, y - 2, 2.4 * sx, 2.4, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawPower(ctx: CanvasRenderingContext2D, p: Power, t: number) {
  const y = p.y + Math.sin(p.t * 3) * 6
  const col = p.kind === 'shield' ? '#38bdf8' : p.kind === 'magnet' ? '#f472b6' : '#facc15'
  glow(ctx, p.x, y, 34, col, 0.45)
  ctx.fillStyle = 'rgba(15,23,42,0.85)'
  ctx.beginPath()
  ctx.arc(p.x, y, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = col
  ctx.lineWidth = 2.5 + Math.sin(t * 8) * 0.8
  ctx.stroke()
  ctx.save()
  ctx.translate(p.x, y)
  if (p.kind === 'shield') {
    ctx.fillStyle = '#7dd3fc'
    ctx.beginPath()
    ctx.moveTo(0, -9)
    ctx.lineTo(8, -6)
    ctx.quadraticCurveTo(7, 5, 0, 10)
    ctx.quadraticCurveTo(-7, 5, -8, -6)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#e0f2fe'
    ctx.fillRect(-1.5, -5, 3, 10)
    ctx.fillRect(-5, -1.5, 10, 3)
  } else if (p.kind === 'magnet') {
    ctx.lineWidth = 5
    ctx.strokeStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(0, -1, 6, Math.PI, 0, true)
    ctx.stroke()
    ctx.fillStyle = '#e5e7eb'
    ctx.fillRect(-8.5, -3, 5, 6)
    ctx.fillRect(3.5, -3, 5, 6)
  } else {
    ctx.rotate(-0.6)
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.moveTo(0, -11)
    ctx.quadraticCurveTo(5, -5, 4, 6)
    ctx.lineTo(-4, 6)
    ctx.quadraticCurveTo(-5, -5, 0, -11)
    ctx.fill()
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.moveTo(-4, 2)
    ctx.lineTo(-8, 8)
    ctx.lineTo(-4, 6)
    ctx.moveTo(4, 2)
    ctx.lineTo(8, 8)
    ctx.lineTo(4, 6)
    ctx.fill()
    ctx.fillStyle = '#38bdf8'
    ctx.beginPath()
    ctx.arc(0, -3, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fb923c'
    ctx.beginPath()
    ctx.moveTo(-3, 7)
    ctx.lineTo(0, 13 + Math.random() * 3)
    ctx.lineTo(3, 7)
    ctx.fill()
  }
  ctx.restore()
}

function drawMissile(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  // Exhaust
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(x + 16, y - 4)
  ctx.lineTo(x + 30 + Math.random() * 10, y)
  ctx.lineTo(x + 16, y + 4)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.moveTo(x + 16, y - 2)
  ctx.lineTo(x + 24 + Math.random() * 5, y)
  ctx.lineTo(x + 16, y + 2)
  ctx.fill()
  // Body
  const g = ctx.createLinearGradient(x, y - 6, x, y + 6)
  g.addColorStop(0, '#fecaca')
  g.addColorStop(0.5, '#ef4444')
  g.addColorStop(1, '#7f1d1d')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(x - 16, y)
  ctx.quadraticCurveTo(x - 10, y - 6, x - 4, y - 6)
  ctx.lineTo(x + 16, y - 5)
  ctx.lineTo(x + 16, y + 5)
  ctx.lineTo(x - 4, y + 6)
  ctx.quadraticCurveTo(x - 10, y + 6, x - 16, y)
  ctx.fill()
  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.moveTo(x + 8, y - 5)
  ctx.lineTo(x + 17, y - 11)
  ctx.lineTo(x + 17, y - 5)
  ctx.moveTo(x + 8, y + 5)
  ctx.lineTo(x + 17, y + 11)
  ctx.lineTo(x + 17, y + 5)
  ctx.fill()
  ctx.fillStyle = Math.sin(t * 30) > 0 ? '#fef08a' : '#fff'
  ctx.beginPath()
  ctx.arc(x - 9, y, 2, 0, Math.PI * 2)
  ctx.fill()
}

function drawWarning(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, t: number) {
  const on = Math.sin(t * (12 + k * 26)) > -0.2
  ctx.save()
  ctx.translate(x, y)
  ctx.globalAlpha = on ? 1 : 0.35
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.moveTo(0, -15)
  ctx.lineTo(14, 11)
  ctx.lineTo(-14, 11)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#fee2e2'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.fillRect(-1.6, -7, 3.2, 10)
  ctx.fillRect(-1.6, 5, 3.2, 3)
  ctx.restore()
  ctx.globalAlpha = 1
}

export default function JetpackGame() {
  const run = useActionRun('jetpack')
  const best = useProgressStore((s) => s.games.jetpack?.bestScore ?? 0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(600))
  const phaseRef = useRef<Phase>('idle')
  const holdRef = useRef(false)
  const bestRef = useRef(best)
  bestRef.current = best
  const hudT = useRef(0)
  const amb = useRef(makeAmb(36)).current
  const godRef = useRef(false)
  const frozenRef = useRef(false)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ dist: 0, coins: 0, shield: 0, magnet: 0, rocket: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function pushHud() {
    const w = world.current
    setHud({ dist: Math.floor(w.dist / PX_PER_M), coins: w.stats.coins, shield: w.shield, magnet: Math.ceil(w.magnetT), rocket: Math.ceil(w.rocketT) })
  }

  function floorY() {
    return size.current.h - 44
  }

  function start() {
    void unlockAudio()
    const w = freshWorld(size.current.h)
    w.shield = run.level('shield')
    const hs = run.level('boost')
    if (hs > 0) {
      w.headStart = hs * 100
      w.rocketT = 99
    }
    world.current = w
    holdRef.current = false
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    say(ZONES[0].name.toUpperCase(), hs > 0 ? `head start ${hs * 100} m` : 'hold to fly')
    sfx.ready()
    pushHud()
  }

  function finishRun() {
    const w = world.current
    setPhaseBoth('over')
    const m = Math.floor(w.dist / PX_PER_M)
    const coins = Math.round(w.stats.coins / 6 + m / 60)
    run.end({ score: m, cleared: m >= 500, stats: { ...w.stats }, coins }, revive)
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    holdRef.current = false
    w.vy = -520
    w.deadRot = 0
    fx.explode(size.current.w * 0.26, w.py, 1.2, ['#fde047', '#fb923c', '#ffffff', '#ef4444'])
    fx.flash('#ef4444', 0.3)
    fx.stop(0.12)
    fx.shake(14, 0.45)
    fx.slowmo(0.8, 0.35)
    sfx.hurt()
    sfx.boom(0.6)
    sfx.lose()
    haptic.error()
    run.update(w.stats)
    window.setTimeout(finishRun, 1300)
  }

  function revive() {
    const w = world.current
    const W = size.current.w
    for (const z of w.zappers) if (z.x < W + 80) fx.burst(z.x, z.y, { count: 10, color: ['#facc15', '#fff'], speed: 200, shape: 'spark' })
    w.zappers = w.zappers.filter((z) => z.x > W + 80)
    w.missiles = []
    w.lasers = []
    w.orbs = []
    w.mines = w.mines.filter((m) => m.x > W + 80)
    w.crushers = w.crushers.filter((c) => c.x > W + 80)
    if (w.boss.on && w.boss.state === 'fight') {
      w.boss.atk = ''
      w.boss.atkT = 2.5
      w.boss.hp = Math.min(w.boss.hp, 70)
    }
    w.missileT = 5
    w.laserT = 7
    w.speed = Math.max(230, w.speed * 0.85)
    w.py = (CEIL + floorY()) / 2
    w.vy = 0
    w.inv = 2.2
    w.shield = Math.max(w.shield, 1)
    w.gap = Math.max(w.gap, 300)
    fx.ring(W * 0.26, w.py, { color: '#7dd3fc', maxR: 90, life: 0.6 })
    say('REVIVED!', 'shield up')
    setPhaseBoth('play')
    pushHud()
  }

  function hit(): boolean {
    const w = world.current
    if (w.inv > 0 || w.rocketT > 0 || godRef.current) return false
    const x = size.current.w * 0.26
    if (w.shield > 0) {
      w.shield -= 1
      w.inv = 1.3
      fx.burst(x, w.py, { count: 26, color: ['#7dd3fc', '#e0f2fe', '#38bdf8'], speed: 320, shape: 'spark' })
      fx.ring(x, w.py, { color: '#7dd3fc', maxR: 70, life: 0.45, width: 5 })
      fx.stop(0.08)
      fx.shake(9, 0.3)
      fx.flash('#38bdf8', 0.2)
      fx.text(x, w.py - 34, 'SHIELD!', '#7dd3fc', 20)
      sfx.clang()
      haptic.heavy()
      pushHud()
      return false
    }
    die()
    return true
  }

  function placeCoins(x0: number, H: number) {
    const w = world.current
    const top = CEIL + 26
    const bot = H - 44 - 26
    const S = 22
    const kind = Math.floor(Math.random() * 5)
    let width = 0
    if (kind === 0 || (w.t > 20 && kind === 4)) {
      const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)]
      const h = shape.length * S
      const y0 = rand(top, Math.max(top, bot - h))
      shape.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) if (row[c] === '#') w.coins.push({ x: x0 + c * S, y: y0 + r * S, pull: false })
      })
      width = shape[0].length * S
    } else if (kind === 1) {
      const n = 12
      const mid = rand(top + 80, bot - 80)
      const amp = rand(50, 90)
      for (let i = 0; i < n; i++) w.coins.push({ x: x0 + i * S, y: mid + Math.sin(i * 0.55) * amp, pull: false })
      width = n * S
    } else if (kind === 2) {
      const n = 11
      const yb = rand(top + 120, bot)
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1)
        w.coins.push({ x: x0 + i * S, y: yb - Math.sin(k * Math.PI) * 120, pull: false })
      }
      width = n * S
    } else {
      const rows = 1 + Math.floor(Math.random() * 3)
      const n = 10
      const y0 = rand(top, bot - rows * S)
      for (let r = 0; r < rows; r++) for (let i = 0; i < n; i++) w.coins.push({ x: x0 + i * S, y: y0 + r * S, pull: false })
      width = n * S
    }
    if (w.t > 75 && Math.random() < 0.22) {
      w.gems.push({ x: x0 + width + 34, y: rand(top + 20, bot - 20), pull: false, t: 0 })
      width += 60
    }
    return width
  }

  function placeHazard(x0: number, H: number) {
    const w = world.current
    const top = CEIL + 8
    const bot = H - 44 - 8
    const diff = clamp(w.t / 200, 0, 1)
    const early = w.t < 14
    const opts: string[] = ['static', 'static']
    if (w.t > 40) opts.push('pair')
    if (w.tier >= 2) opts.push('spin', 'spin')
    if (w.tier >= 5) opts.push('move', 'move')
    if (w.tier >= 7) opts.push('mine', 'mine')
    if (w.tier >= 8) opts.push('crusher', 'crusher')
    const kind = opts[Math.floor(Math.random() * opts.length)]
    if (kind === 'mine') {
      // Mines come in 1-2 with room to slip between their pulses
      const n = w.t > 320 && Math.random() < 0.4 ? 2 : 1
      for (let i = 0; i < n; i++) {
        const y = n === 1 ? rand(top + 70, bot - 70) : i === 0 ? rand(top + 60, top + (bot - top) * 0.3) : rand(top + (bot - top) * 0.7, bot - 60)
        w.mines.push({ x: x0 + i * 150, y, cyc: rand(0, MINE_P), bob: rand(0, 6), near: false })
      }
      return
    }
    if (kind === 'crusher') {
      const span = bot - top
      w.crushers.push({ x: x0 + CRUSH_W, top: Math.random() < 0.5, depth: span * rand(0.4, 0.56), cyc: rand(0, 0.6), k: 0, near: false })
      return
    }
    if (kind === 'pair') {
      const gapH = lerp(190, 135, diff)
      const gy = rand(top + 60 + gapH / 2, bot - 60 - gapH / 2)
      const l1 = gy - gapH / 2 - top
      const l2 = bot - (gy + gapH / 2)
      w.zappers.push({ x: x0, y: top + l1 / 2, len: l1, ang: Math.PI / 2, spin: 0, amp: 0, ph: 0, near: false })
      w.zappers.push({ x: x0, y: bot - l2 / 2, len: l2, ang: Math.PI / 2, spin: 0, amp: 0, ph: 0, near: false })
      return
    }
    const len = early ? rand(70, 100) : rand(85 + 50 * diff, 120 + 70 * diff)
    const ang = kind === 'spin' ? rand(0, Math.PI) : [Math.PI / 2, 0, Math.PI / 4, -Math.PI / 4][Math.floor(Math.random() * 4)]
    const ext = kind === 'spin' ? len / 2 : (Math.abs(Math.sin(ang)) * len) / 2
    const amp = kind === 'move' ? rand(50, 90) : 0
    const y = rand(top + ext + amp, Math.max(top + ext + amp, bot - ext - amp))
    const spin = kind === 'spin' ? (Math.random() < 0.5 ? -1 : 1) * rand(1.1, 1.6 + diff) : 0
    w.zappers.push({ x: x0, y, len, ang, spin, amp, ph: rand(0, 6), near: false })
  }

  function grabPower(p: Power) {
    const w = world.current
    const x = size.current.w * 0.26
    w.stats.powerups += 1
    const lvl = run.level('magnet')
    if (p.kind === 'shield') {
      w.shield = Math.min(3, w.shield + 1)
      say('SHIELD', 'blocks one hit')
    } else if (p.kind === 'magnet') {
      w.magnetT = 8 + lvl * 2
      say('COIN MAGNET')
    } else {
      w.rocketT = 3.2
      say('ROCKET BOOST!')
      fx.slowmo(0.15, 0.4)
    }
    fx.ring(x, w.py, { color: '#fde047', maxR: 70, life: 0.5, width: 4 })
    fx.burst(x, w.py, { count: 22, color: ['#fde047', '#fff', '#7dd3fc'], speed: 260, shape: 'spark' })
    sfx.power()
    haptic.medium()
    run.update(w.stats)
    pushHud()
  }

  function startBoss() {
    const w = world.current
    const { w: W, h: H } = size.current
    w.boss = freshBoss()
    const b = w.boss
    b.on = true
    b.x = W + 140
    b.y = (CEIL + H - 44) / 2
    b.eyeY = b.y
    b.aimY = b.y
    b.atkT = 2.2
    b.cellT = 3.5
    w.bossCount += 1
    w.missiles = w.missiles.filter((m) => m.warn <= 0)
    say('WARNING!', w.bossCount > 1 ? `Sentinel Mk ${w.bossCount} incoming` : 'Sentinel mech incoming')
    fx.flash('#f43f5e', 0.35)
    fx.shake(10, 0.6)
    haptic.heavy()
    sfx.clang()
    window.setTimeout(() => sfx.boom(0.45), 140)
    for (let i = 0; i < 3; i++) window.setTimeout(() => sfx.tick(), 380 + i * 150)
    window.setTimeout(() => sfx.levelUp(), 860)
  }

  function bossDown() {
    const w = world.current
    const b = w.boss
    const x = size.current.w * 0.26
    b.state = 'down'
    b.downT = 0
    b.atk = ''
    w.orbs = []
    w.lasers = w.lasers.filter((l) => !l.boss)
    w.cells = []
    w.bossNext = w.t + BOSS_EVERY
    fx.explode(b.x, b.y, 1.6, ['#f43f5e', '#fde047', '#fb923c', '#fff'])
    fx.ring(b.x, b.y, { color: '#fda4af', maxR: 140, life: 0.7, width: 6 })
    fx.flash('#ffffff', 0.3)
    fx.stop(0.15)
    fx.shake(16, 0.6)
    fx.slowmo(0.7, 0.3)
    // Reward: coin shower that homes in, a gem burst and a fresh shield
    for (let i = 0; i < 30; i++) w.coins.push({ x: b.x + rand(-50, 50), y: b.y + rand(-60, 60), pull: true })
    for (let i = 0; i < 3; i++) w.gems.push({ x: b.x + rand(-30, 30), y: b.y + rand(-40, 40), pull: true, t: 0 })
    w.shield = Math.min(3, w.shield + 1)
    fx.ring(x, w.py, { color: '#7dd3fc', maxR: 70, life: 0.5, width: 4 })
    say('SENTINEL DOWN!', 'coin shower + shield')
    sfx.boom(1)
    window.setTimeout(() => sfx.win(), 380)
    window.setTimeout(() => sfx.combo(), 820)
    haptic.success()
    void trackEvent('action_milestone', { game_id: 'jetpack', kind: 'boss', value: w.bossCount })
    pushHud()
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    holdRef.current = true
  }
  function onUp() {
    holdRef.current = false
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault()
        if (phaseRef.current === 'play') holdRef.current = true
      }
    }
    function up(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') holdRef.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // DEV-only test hook: jump in time, switch zones, spawn new content
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const hook = {
      skip(sec: number) {
        const w = world.current
        w.t += sec
        w.speed = 230 + Math.min(320, w.t * 2.1)
        w.dist += sec * w.speed
        const m = Math.floor(w.dist / PX_PER_M)
        w.nextMark = (Math.floor(m / 100) + 1) * 100
      },
      zone(i: number) {
        const w = world.current
        w.zone = ((i % ZONES.length) + ZONES.length) % ZONES.length
        w.zoneFade = 1
        say(ZONES[w.zone].name.toUpperCase(), 'zone')
      },
      spawn(kind: string) {
        const w = world.current
        const { w: W, h: H } = size.current
        const fy = H - 44
        if (kind === 'mine') w.mines.push({ x: W * 0.85, y: (CEIL + fy) / 2 - 60, cyc: 1.0, bob: 0, near: false })
        else if (kind === 'crusher') w.crushers.push({ x: W * 0.85, top: true, depth: (fy - CEIL) * 0.5, cyc: 0.5, k: 0, near: false })
        else if (kind === 'crusherBot') w.crushers.push({ x: W * 0.6, top: false, depth: (fy - CEIL) * 0.5, cyc: 1.2, k: 1, near: false })
        else if (kind === 'gem') w.gems.push({ x: W * 0.6, y: w.py, pull: false, t: 0 })
        else if (kind === 'cell') w.cells.push({ x: W * 0.5, y: w.py, t: 0 })
        else if (kind === 'noboss') w.bossNext = 1e9
        else if (kind === 'boss') w.bossNext = w.t
      },
      god(on: boolean) {
        godRef.current = on
      },
      freeze(on: boolean) {
        frozenRef.current = on
      },
      state() {
        const w = world.current
        return { t: w.t, m: Math.floor(w.dist / PX_PER_M), zone: ZONES[w.zone].name, tier: w.tier, boss: w.boss.on ? w.boss.state + ' ' + Math.round(w.boss.hp) : 'off', mines: w.mines.length, crushers: w.crushers.length }
      },
    }
    ;(window as unknown as Record<string, unknown>).__en1_jetpack = hook
    return () => {
      delete (window as unknown as Record<string, unknown>).__en1_jetpack
    }
  }, [])

  function step(dt: number, W: number, H: number, t: number) {
    const w = world.current
    const ph = phaseRef.current
    const fy = H - 44
    const px = W * 0.26
    const playing = ph === 'play'
    const demo = ph === 'idle'

    if (playing) {
      w.t += dt
      // Unlock new hazard types over time
      const next = TIERS[w.tier + 1]
      if (next && w.t >= next.t) {
        w.tier += 1
        say(next.label, 'new hazard')
        sfx.levelUp()
      }
      if (!w.boss.on && w.t >= w.bossNext && w.headStart === 0 && w.rocketT <= 0) startBoss()
    }

    // Speed
    let target = 230 + Math.min(320, w.t * 2.1)
    if (w.headStart > 0) target = 950
    else if (w.rocketT > 0) target *= 2.1
    if (ph === 'dying' || ph === 'over') w.speed = approach(w.speed, 0, 2.2, dt)
    else w.speed = approach(w.speed, target, w.rocketT > 0 ? 6 : 2, dt)
    if (demo) w.speed = 200
    const dx = w.speed * dt
    w.scroll += dx
    if (playing) w.dist += dx

    // Player physics
    const thrust = holdRef.current && playing
    let thrustNow = thrust
    if (demo) {
      const tgt = H * 0.5 + Math.sin(t * 0.9) * H * 0.18
      thrustNow = w.py > tgt
    }
    if (playing && w.rocketT > 0) {
      w.py = approach(w.py, (CEIL + fy) / 2, 4, dt)
      w.vy = 0
    } else if (ph === 'dying' || ph === 'over') {
      w.vy += GRAV * 1.2 * dt
      w.py += w.vy * dt
      w.deadRot += dt * (w.speed / 40 + 2)
      if (w.py > fy - 10) {
        w.py = fy - 10
        if (Math.abs(w.vy) > 120) {
          w.vy = -w.vy * 0.45
          fx.burst(px, fy, { count: 8, color: ['#94a3b8', '#e2e8f0'], speed: 140, angle: -Math.PI / 2, spread: 2 })
          sfx.thud()
        } else w.vy = 0
      }
    } else {
      w.vy += (thrustNow ? -THRUST : GRAV) * dt
      w.vy = clamp(w.vy, -480, 640)
      w.py += w.vy * dt
      w.onFloor = false
      if (w.py > fy - 22) {
        if (w.vy > 380 && playing) fx.burst(px, fy, { count: 6, color: ['#94a3b8', '#cbd5e1'], speed: 120, angle: -Math.PI / 2, spread: 2.4 })
        w.py = fy - 22
        w.vy = 0
        w.onFloor = true
      }
      if (w.py < CEIL + 30) {
        w.py = CEIL + 30
        w.vy = Math.max(0, w.vy)
      }
    }
    w.tilt = approach(w.tilt, ph === 'dying' || ph === 'over' ? w.deadRot : w.onFloor ? 0 : clamp(w.vy / 1400, -0.3, 0.35), 10, dt)
    w.runPh += dt * (w.speed / 14)
    if (thrustNow && (playing || demo)) {
      w.flameAcc += dt
      while (w.flameAcc > 0.03) {
        w.flameAcc -= 0.03
        fx.burst(px - 14, w.py + 26, { count: 1, color: ['#fb923c', '#fde047', '#94a3b8'], speed: 120, angle: Math.PI / 2 + 0.6, spread: 0.6, life: 0.4, gravity: 0, size: 3.5 })
      }
    }

    // Timers
    w.inv = Math.max(0, w.inv - dt)
    w.magnetT = Math.max(0, w.magnetT - dt)
    w.streakT -= dt
    if (w.streakT <= 0) w.streak = 0
    if (w.headStart > 0 && w.dist / PX_PER_M >= w.headStart) {
      w.headStart = 0
      w.rocketT = 0.01
    }
    if (w.rocketT > 0 && w.headStart === 0) {
      w.rocketT -= dt
      if (w.rocketT <= 0) {
        w.rocketT = 0
        w.inv = Math.max(w.inv, 1)
        pushHud()
      }
    }

    // Spawning
    if (playing || demo) {
      w.gap -= dx
      if (w.gap <= 0) {
        if (demo || w.boss.on || Math.random() < (w.t < 12 ? 0.55 : 0.38) || w.headStart > 0) {
          w.gap = placeCoins(W + 40, H) + rand(120, 200)
        } else {
          placeHazard(W + 40, H)
          w.gap = lerp(470, 240, clamp(w.t / 200, 0, 1))
        }
      }
    }
    if (playing && w.headStart === 0) {
      const diff = clamp(w.t / 240, 0, 1)
      w.powerT -= dt
      if (w.powerT <= 0) {
        w.powerT = rand(15, 22)
        const kinds: PowerKind[] = ['shield', 'magnet', 'rocket', 'magnet', 'shield']
        w.powers.push({ x: W + 40, y: rand(CEIL + 60, fy - 60), kind: kinds[Math.floor(Math.random() * kinds.length)], t: 0 })
      }
      if (w.tier >= 1 && w.rocketT <= 0 && !w.boss.on) {
        w.missileT -= dt
        if (w.missileT <= 0) {
          w.missileT = rand(lerp(7, 3, diff), lerp(9, 4.5, diff))
          const salvo = w.tier >= 4 && Math.random() < 0.4 ? 3 : 1
          for (let i = 0; i < salvo; i++) w.missiles.push({ x: W + 40 + i * 70, y: clamp(w.py + (i - 1) * 60 * (salvo > 1 ? 1 : 0), CEIL + 20, fy - 20), warn: 1.35 + i * 0.25, passed: false })
          sfx.tick()
        }
      }
      if (w.tier >= 3 && w.rocketT <= 0 && !w.boss.on) {
        w.laserT -= dt
        if (w.laserT <= 0) {
          w.laserT = rand(lerp(10, 6, diff), lerp(14, 8, diff))
          if (w.tier >= 6 && Math.random() < 0.5) {
            const safe = Math.floor(Math.random() * 3)
            for (let i = 0; i < 3; i++) if (i !== safe) w.lasers.push({ y: lerp(CEIL + 50, fy - 50, i / 2), t: 0, charge: 1.6, fire: 0.9 })
          } else w.lasers.push({ y: clamp(w.py + rand(-40, 40), CEIL + 40, fy - 40), t: 0, charge: 1.5, fire: 0.9 })
          sfx.tick()
        }
      }
    }

    // Zappers
    const alive = playing && w.inv <= 0
    for (const z of w.zappers) {
      z.x -= dx
      z.ang += z.spin * dt
      z.ph += dt * 1.6
    }
    w.zappers = w.zappers.filter((z) => z.x > -100)
    if (playing) {
      for (const z of w.zappers) {
        const cy = z.y + Math.sin(z.ph) * z.amp
        const hx = (Math.cos(z.ang) * z.len) / 2
        const hy = (Math.sin(z.ang) * z.len) / 2
        const d = segDist(px, w.py, z.x - hx, cy - hy, z.x + hx, cy + hy)
        if (w.rocketT > 0 && d < PR + 22) {
          fx.explode(z.x, cy, 0.9, ['#facc15', '#fff', '#fb923c'])
          sfx.boom(0.4)
          z.x = -999
          continue
        }
        if (d < PR + 4 && w.inv <= 0) {
          if (hit()) return
          z.x = -999
          continue
        }
        if (!z.near && alive && z.x < px - 20 && d < PR + 26) {
          z.near = true
          w.stats.close += 1
          fx.text(px + 10, w.py - 36, 'CLOSE!', '#fde047', 16)
          sfx.score(w.stats.close % 10)
          run.update(w.stats)
        }
        if (z.x < px - 30) z.near = true
      }
    }

    // Missiles
    for (const m of w.missiles) {
      if (m.warn > 0) {
        m.warn -= dt
        if (m.warn > 0.5 && playing) m.y = approach(m.y, w.py, 3.2, dt)
        if (m.warn <= 0) sfx.whoosh()
      } else {
        m.x -= (w.speed + 420) * dt
        if (Math.random() < 0.6) fx.burst(m.x + 20, m.y, { count: 1, color: ['#94a3b8', '#cbd5e1', '#64748b'], speed: 30, size: 5, life: 0.5, gravity: -20, drag: 2 })
        if (playing && Math.abs(m.x - px) < 18 + PR && Math.abs(m.y - w.py) < 7 + PR) {
          fx.explode(m.x, m.y, 1, ['#fde047', '#fb923c', '#ef4444'])
          m.x = -999
          if (hit()) return
          continue
        }
        if (!m.passed && m.x < px - 30) {
          m.passed = true
          if (playing) {
            w.stats.missiles += 1
            if (Math.abs(m.y - w.py) < 44 && w.inv <= 0) {
              w.stats.close += 1
              fx.text(px, w.py - 36, 'CLOSE!', '#fde047', 16)
              sfx.score(4)
            }
            run.update(w.stats)
          }
        }
      }
    }
    w.missiles = w.missiles.filter((m) => m.x > -60)

    // Lasers
    for (const l of w.lasers) {
      const was = l.t < l.charge
      l.t += dt
      if (was && l.t >= l.charge) {
        sfx.shoot()
        fx.shake(4, 0.2)
      }
      if (playing && w.inv <= 0 && w.rocketT <= 0 && l.t >= l.charge && l.t < l.charge + l.fire && Math.abs(w.py - l.y) < 10 + PR * 0.7) {
        l.t = l.charge + l.fire
        if (hit()) return
      }
    }
    w.lasers = w.lasers.filter((l) => l.t < l.charge + l.fire + 0.2)

    // Shock mines
    for (const m of w.mines) {
      m.x -= dx
      const prev = m.cyc
      m.cyc = (m.cyc + dt) % MINE_P
      const my = m.y + Math.sin(w.t * 2 + m.bob) * 8
      if (prev < MINE_CHARGE && m.cyc >= MINE_CHARGE && m.x > -40 && m.x < W + 40) {
        sfx.hit()
        fx.burst(m.x, my, { count: 8, color: ['#fb7185', '#fff1f2'], speed: 220, shape: 'spark', life: 0.3 })
      }
      if (!playing) continue
      const d = Math.hypot(px - m.x, w.py - my)
      if (w.rocketT > 0 && d < MINE_R) {
        fx.explode(m.x, my, 0.9, ['#fb7185', '#fff', '#64748b'])
        sfx.boom(0.4)
        m.x = -999
        continue
      }
      const zap = m.cyc >= MINE_CHARGE && m.cyc < MINE_ZAP
      if (w.inv <= 0 && (d < MINE_CORE + PR - 2 || (zap && d < MINE_R + PR * 0.4))) {
        fx.burst(px, w.py, { count: 14, color: ['#fb7185', '#fff'], speed: 260, shape: 'spark' })
        m.near = true
        if (hit()) return
        continue
      }
      if (!m.near && alive && m.x < px - 20) {
        m.near = true
        if (d < MINE_R + 28) {
          w.stats.close += 1
          fx.text(px + 10, w.py - 36, 'CLOSE!', '#fde047', 16)
          sfx.score(w.stats.close % 10)
          run.update(w.stats)
        }
      }
    }
    w.mines = w.mines.filter((m) => m.x > -90)

    // Crushers
    for (const c of w.crushers) {
      c.x -= dx
      const prev = c.k
      c.cyc = (c.cyc + dt) % CRUSH_P
      c.k = crusherK(c.cyc)
      if (prev < 1 && c.k >= 1 && c.x > -30 && c.x < W + 30) {
        const ey = c.top ? CEIL + c.depth : fy - c.depth
        fx.burst(c.x, ey, { count: 10, color: ['#9ca3af', '#e5e7eb', '#fde047'], speed: 180, angle: c.top ? Math.PI / 2 : -Math.PI / 2, spread: 2.6, life: 0.35 })
        fx.shake(3, 0.12)
        sfx.thud()
      }
      if (!playing) continue
      const x0 = c.x - CRUSH_W / 2
      const ext = c.depth * c.k
      const y0 = c.top ? CEIL : fy - ext
      const y1 = c.top ? CEIL + ext : fy
      if (c.k > 0.2 && w.rocketT > 0 && circleRect(px, w.py, PR + 20, x0, y0, x0 + CRUSH_W, y1)) {
        fx.explode(c.x, (y0 + y1) / 2, 0.9, ['#d1d5db', '#fde047', '#fff'])
        sfx.boom(0.4)
        c.x = -999
        continue
      }
      if (c.k > 0.2 && w.inv <= 0 && circleRect(px, w.py, PR, x0, y0, x0 + CRUSH_W, y1)) {
        fx.burst(px, w.py, { count: 12, color: ['#d1d5db', '#fde047'], speed: 240, shape: 'spark' })
        c.near = true
        if (hit()) return
        continue
      }
      if (!c.near && alive && c.x < px - 30) {
        c.near = true
        if (c.k > 0.2 && (c.top ? w.py - y1 : y0 - w.py) < PR + 30) {
          w.stats.close += 1
          fx.text(px + 10, w.py - 36, 'CLOSE!', '#fde047', 16)
          sfx.score(w.stats.close % 10)
          run.update(w.stats)
        }
      }
    }
    w.crushers = w.crushers.filter((c) => c.x > -60)

    // Sentinel boss
    const b = w.boss
    if (b.on) {
      b.t += dt
      b.hurt = Math.max(0, b.hurt - dt)
      const homeX = W - 66
      if (b.state === 'enter') {
        b.x = approach(b.x, homeX, 2.4, dt)
        if (b.x < homeX + 6) b.state = 'fight'
      }
      if (b.state !== 'down') {
        const ty = (CEIL + fy) / 2 + Math.sin(b.t * 0.85) * (fy - CEIL) * 0.27
        b.y = approach(b.y, ty, 3, dt)
        b.eyeY = approach(b.eyeY, w.py, 4, dt)
        if (b.atk === '') b.aimY = approach(b.aimY, w.py, 5, dt)
      }
      if (b.state === 'fight' && playing) {
        const fast = Math.min(0.6, (w.bossCount - 1) * 0.2)
        b.hp -= 4 * dt
        b.atkT -= dt
        if (b.atk === '' && b.atkT <= 0) {
          if (Math.random() < 0.55) {
            b.atk = 'volley'
            b.charge = 0.8
            b.aimY = w.py
          } else {
            w.lasers.push({ y: clamp(w.py, CEIL + 40, fy - 40), t: 0, charge: 1.4, fire: 0.75, boss: true })
            b.atkT = rand(2.2, 2.9) - fast
          }
          sfx.tick()
        }
        if (b.atk === 'volley') {
          b.charge -= dt
          if (b.charge <= 0) {
            const ox = b.x - 70
            const oy = b.y + 14
            const base = Math.atan2(b.aimY - oy, px - ox)
            const n = w.bossCount > 1 ? 5 : 3
            for (let i = 0; i < n; i++) {
              const a = base + (i - (n - 1) / 2) * 0.2
              w.orbs.push({ x: ox, y: oy, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330 })
            }
            fx.burst(ox, oy, { count: 10, color: ['#fb7185', '#fff'], speed: 200, shape: 'spark', life: 0.3 })
            sfx.shoot()
            b.atk = ''
            b.atkT = rand(1.7, 2.4) - fast
          }
        }
        b.cellT -= dt
        if (b.cellT <= 0) {
          b.cellT = rand(4.5, 6)
          w.cells.push({ x: W + 30, y: rand(CEIL + 70, fy - 70), t: 0 })
        }
        if (b.hp <= 0) bossDown()
      }
      if (b.state === 'down') {
        b.downT += dt
        b.y += 160 * b.downT * dt
        b.x += 60 * dt
        b.boomT -= dt
        if (b.boomT <= 0) {
          b.boomT = 0.18
          fx.explode(b.x + rand(-40, 40), b.y + rand(-40, 40), 0.6, ['#fde047', '#fb923c', '#f43f5e'])
          sfx.boom(0.35)
        }
        if (b.downT > 1.7) b.on = false
      }
    }
    for (const o of w.orbs) {
      o.x += o.vx * dt
      o.y += o.vy * dt
      if (playing && w.inv <= 0 && Math.hypot(o.x - px, o.y - w.py) < 8 + PR) {
        fx.explode(o.x, o.y, 0.6, ['#fb7185', '#fff'])
        o.x = -999
        if (hit()) return
      }
    }
    w.orbs = w.orbs.filter((o) => o.x > -30 && o.y > CEIL - 20 && o.y < fy + 20)
    w.empFx = Math.max(0, w.empFx - dt)
    for (const c of w.cells) {
      c.x -= dx
      c.t += dt
      if (playing && Math.hypot(c.x - px, c.y + Math.sin(c.t * 4) * 6 - w.py) < 32) {
        c.x = -999
        if (b.on && b.state === 'fight') {
          b.hp -= 22
          b.hurt = 0.35
          w.empFx = 0.3
          fx.explode(b.x - 10, b.y - 10, 0.7, ['#22d3ee', '#ecfeff', '#a5f3fc'])
          fx.text(b.x - 40, b.y - 60, 'EMP HIT!', '#67e8f9', 20)
          fx.stop(0.06)
          fx.shake(7, 0.25)
          sfx.power()
          sfx.hit()
          haptic.medium()
          if (b.hp <= 0) bossDown()
        }
      }
    }
    w.cells = w.cells.filter((c) => c.x > -40)

    // Gems (worth 5 coins)
    for (const g of w.gems) {
      g.x -= dx
      g.t += dt
      if (!playing) continue
      const ddx = px - g.x
      const ddy = w.py - g.y
      const d = Math.hypot(ddx, ddy)
      if ((w.magnetT > 0 || w.rocketT > 0) && d < 260) g.pull = true
      if (g.pull) {
        const sp = (650 + w.speed) * dt
        g.x += (ddx / (d || 1)) * Math.min(sp, d)
        g.y += (ddy / (d || 1)) * Math.min(sp, d)
      }
      if (d < 24 + run.level('magnet') * 6) {
        g.x = -999
        w.stats.coins += 5
        fx.burst(px + 6, w.py, { count: 12, color: ['#22d3ee', '#cffafe', '#fff'], speed: 200, shape: 'spark', life: 0.4 })
        fx.text(px + 8, w.py - 34, '+5', '#67e8f9', 18)
        sfx.combo()
        haptic.light()
        run.update(w.stats)
      }
    }
    w.gems = w.gems.filter((g) => g.x > -30)

    // Coins
    const magnet = w.magnetT > 0 || w.rocketT > 0
    const pickR = 20 + run.level('magnet') * 6
    let got = 0
    for (const c of w.coins) {
      c.x -= dx
      if (!playing) continue
      const ddx = px - c.x
      const ddy = w.py - c.y
      const d = Math.hypot(ddx, ddy)
      if (magnet && d < 240) c.pull = true
      if (c.pull) {
        const sp = (700 + w.speed) * dt
        c.x += (ddx / (d || 1)) * Math.min(sp, d)
        c.y += (ddy / (d || 1)) * Math.min(sp, d)
      }
      if (d < pickR) {
        c.x = -999
        got++
      }
    }
    w.coins = w.coins.filter((c) => c.x > -20)
    if (got > 0) {
      w.stats.coins += got
      w.streak += got
      w.streakT = 0.45
      fx.burst(px + 6, w.py, { count: 4 + got, color: ['#fde047', '#fbbf24', '#fff'], speed: 160, size: 2.5, life: 0.35 })
      sfx.score(Math.min(10, Math.floor(w.streak / 3)))
      if (w.streak > 0 && w.streak % 25 === 0) {
        fx.text(px, w.py - 40, `${w.streak} STREAK!`, '#fde047', 18)
        sfx.combo()
      }
      run.update(w.stats)
    }

    // Power-ups
    for (const p of w.powers) {
      p.x -= dx
      p.t += dt
      if (playing && Math.hypot(p.x - px, p.y + Math.sin(p.t * 3) * 6 - w.py) < 30) {
        p.x = -999
        grabPower(p)
      }
    }
    w.powers = w.powers.filter((p) => p.x > -40)

    // Distance milestones & zones
    if (playing) {
      const m = Math.floor(w.dist / PX_PER_M)
      if (m !== w.stats.dist) {
        w.stats.dist = m
        if (m % 10 === 0) run.update(w.stats)
      }
      if (m >= w.nextMark) {
        const mark = w.nextMark
        w.nextMark += 100
        if (mark % 500 === 0) {
          w.zone = (w.zone + 1) % ZONES.length
          w.zoneFade = 1
          say(ZONES[w.zone].name.toUpperCase(), ZONES[w.zone].kind && mark < 4000 ? `${mark} m · new zone` : `${mark} m`)
          sfx.levelUp()
          haptic.success()
        } else {
          fx.text(W / 2, CEIL + 40, `${m} m`, '#ffffff', 22)
          sfx.tick()
        }
        if (bestRef.current > 0 && m - 100 < bestRef.current && m >= bestRef.current) {
          say('NEW BEST!', `${m} m`)
          sfx.win()
        }
      }
      if (m >= w.nextMilestone) {
        w.nextMilestone += 1000
        void trackEvent('action_milestone', { game_id: 'jetpack', kind: 'distance', value: m })
      }
    }
    w.zoneFade = Math.max(0, w.zoneFade - dt * 0.8)
    const ak = ZONES[w.zone].amb
    if (ak) stepAmb(amb, ak, dt, dx, W, CEIL, fy)
  }

  function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
    const w = world.current
    const z = ZONES[w.zone]
    const fy = H - 44
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, z.top)
    bg.addColorStop(1, z.bot)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    if (z.stars) {
      ctx.fillStyle = '#e2e8f0'
      for (let i = 0; i < 50; i++) {
        const sx = (((i * 137.5 - w.scroll * (0.05 + (i % 3) * 0.04)) % W) + W) % W
        const sy = (i * 71.3) % (fy - CEIL) + CEIL
        ctx.globalAlpha = 0.3 + ((i * 7) % 5) / 8 + Math.sin(t * 2 + i) * 0.1
        ctx.fillRect(sx, sy, 1.6, 1.6)
      }
      ctx.globalAlpha = 1
      glow(ctx, W * 0.75, H * 0.3, 90, '#6366f1', 0.25)
      ctx.fillStyle = '#4338ca'
      ctx.beginPath()
      ctx.arc(W * 0.75, H * 0.3, 34, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#6366f1'
      ctx.beginPath()
      ctx.arc(W * 0.75 - 8, H * 0.3 - 8, 24, 0, Math.PI * 2)
      ctx.fill()
    }
    if (z.kind === 'lava') drawLavaBack(ctx, W, CEIL, fy, w.scroll, t)
    else if (z.kind === 'ice') drawIceBack(ctx, W, CEIL, fy, w.scroll, t)
    else drawLabBack(ctx, W, fy, t, z)
    // Ceiling
    ctx.fillStyle = z.floor
    ctx.fillRect(0, 0, W, CEIL)
    const so = -(w.scroll % 40)
    ctx.fillStyle = z.stripe
    ctx.globalAlpha = 0.6
    for (let x = so - 40; x < W + 40; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, CEIL - 6)
      ctx.lineTo(x + 20, CEIL - 6)
      ctx.lineTo(x + 30, CEIL)
      ctx.lineTo(x + 10, CEIL)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    // Floor
    const fl = ctx.createLinearGradient(0, fy, 0, H)
    fl.addColorStop(0, z.mid)
    fl.addColorStop(0.15, z.floor)
    fl.addColorStop(1, '#000')
    ctx.fillStyle = fl
    ctx.fillRect(0, fy, W, H - fy)
    if (z.kind === 'lava') drawLavaFloor(ctx, W, H, fy, w.scroll, t)
    ctx.fillStyle = z.stripe
    ctx.fillRect(0, fy, W, 2)
    const to = -(w.scroll % 60)
    ctx.fillStyle = 'rgba(255,255,255,0.07)'
    for (let x = to - 60; x < W + 60; x += 60) ctx.fillRect(x, fy + 8, 30, 6)
    if (z.kind === 'ice') drawIceTrim(ctx, W, CEIL, fy, w.scroll)
    if (z.amb) drawAmb(ctx, amb, z.amb, t)
    if (w.zoneFade > 0) {
      ctx.globalAlpha = w.zoneFade * 0.5
      ctx.fillStyle = z.accent
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }
  }

  function drawLabBack(ctx: CanvasRenderingContext2D, W: number, fy: number, t: number, z: Zone) {
    const w = world.current
    // Far layer: tall windows / panels
    const farS = 150
    const off1 = -((w.scroll * 0.2) % farS)
    for (let x = off1 - farS; x < W + farS; x += farS) {
      ctx.fillStyle = z.far
      ctx.beginPath()
      ctx.roundRect(x + 20, CEIL + 40, 90, fy - CEIL - 110, 14)
      ctx.fill()
      ctx.fillStyle = z.accent
      ctx.globalAlpha = z.stars ? 0.08 : 0.12
      ctx.beginPath()
      ctx.roundRect(x + 30, CEIL + 50, 70, fy - CEIL - 130, 10)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    // Mid layer: pillars with lights
    const midS = 260
    const off2 = -((w.scroll * 0.55) % midS)
    for (let x = off2 - midS; x < W + midS; x += midS) {
      ctx.fillStyle = z.mid
      ctx.fillRect(x, CEIL, 26, fy - CEIL)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillRect(x + 18, CEIL, 8, fy - CEIL)
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(x + 3, CEIL, 4, fy - CEIL)
      for (let y = CEIL + 50; y < fy - 20; y += 90) {
        ctx.fillStyle = Math.sin(t * 3 + y + x * 0.01) > 0 ? z.accent : 'rgba(255,255,255,0.15)'
        ctx.fillRect(x + 10, y, 6, 6)
      }
      ctx.strokeStyle = z.mid
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.moveTo(x + 26, fy - 120)
      ctx.lineTo(x + 120, fy - 120)
      ctx.stroke()
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    if (size.current.h !== H && phaseRef.current === 'idle') world.current.py = H * 0.5
    size.current = { w: W, h: H }
    const w = world.current
    const dt = frozenRef.current ? 0 : fx.step(raw)
    const ph = phaseRef.current
    step(dt, W, H, t)
    if (ph === 'play') {
      hudT.current -= raw
      if (hudT.current <= 0) {
        hudT.current = 0.12
        pushHud()
      }
    }
    const fy = H - 44
    const px = W * 0.26

    drawBackground(ctx, W, H, t)
    fx.applyShake(ctx)

    // Personal best marker
    if (ph !== 'idle' && bestRef.current > 0) {
      const bx = px + (bestRef.current * PX_PER_M - w.dist)
      if (bx > -20 && bx < W + 20) {
        ctx.strokeStyle = '#fde047'
        ctx.setLineDash([8, 8])
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(bx, CEIL)
        ctx.lineTo(bx, fy)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#fde047'
        ctx.beginPath()
        ctx.moveTo(bx, CEIL + 4)
        ctx.lineTo(bx + 34, CEIL + 12)
        ctx.lineTo(bx, CEIL + 22)
        ctx.fill()
        ctx.fillStyle = '#422006'
        ctx.font = "800 9px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText('BEST', bx + 3, CEIL + 13)
      }
    }

    for (const c of w.coins) if (c.x > -10 && c.x < W + 10) drawCoin(ctx, c.x, c.y, t)
    for (const g of w.gems) if (g.x > -20 && g.x < W + 20) drawGem(ctx, g, t)
    for (const p of w.powers) drawPower(ctx, p, t)
    for (const c of w.cells) drawCell(ctx, c, t)
    for (const c of w.crushers) if (c.x > -40 && c.x < W + 40) drawCrusher(ctx, c, CEIL, fy, t)
    for (const m of w.mines) if (m.x > -90 && m.x < W + 90) drawMine(ctx, m, m.y + Math.sin(w.t * 2 + m.bob) * 8, t)
    if (w.boss.on) drawBoss(ctx, w.boss, px, t)
    for (const z of w.zappers) {
      if (z.x < -90 || z.x > W + 90) continue
      const cy = z.y + Math.sin(z.ph) * z.amp
      const hx = (Math.cos(z.ang) * z.len) / 2
      const hy = (Math.sin(z.ang) * z.len) / 2
      drawZapper(ctx, z.x - hx, cy - hy, z.x + hx, cy + hy, t)
    }

    // Lasers
    for (const l of w.lasers) {
      const firing = l.t >= l.charge
      const k = Math.min(1, l.t / l.charge)
      const x1 = l.boss ? (w.boss.on ? w.boss.x - 24 : W) : W - 22
      if (!l.boss) for (const ex of [0, W]) {
        ctx.fillStyle = '#374151'
        ctx.beginPath()
        ctx.roundRect(ex === 0 ? -6 : W - 22, l.y - 13, 28, 26, 6)
        ctx.fill()
        ctx.fillStyle = firing ? '#fff' : `rgba(239,68,68,${0.4 + k * 0.6})`
        ctx.beginPath()
        ctx.arc(ex === 0 ? 14 : W - 14, l.y, 5 + k * 3, 0, Math.PI * 2)
        ctx.fill()
      }
      if (!firing) {
        if (l.boss) glow(ctx, x1, l.y, 10 + k * 22, '#f43f5e', 0.4 + k * 0.4)
        ctx.strokeStyle = '#ef4444'
        ctx.globalAlpha = 0.35 + Math.sin(t * 30) * 0.25
        ctx.lineWidth = 1.5
        ctx.setLineDash([10, 8])
        ctx.beginPath()
        ctx.moveTo(l.boss ? 0 : 22, l.y)
        ctx.lineTo(x1, l.y)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
      } else {
        const fk = 1 - Math.max(0, (l.t - l.charge - l.fire) / 0.2)
        const th = 22 * fk + Math.sin(t * 60) * 2
        ctx.fillStyle = 'rgba(239,68,68,0.35)'
        const x0 = l.boss ? 0 : 14
        const bw = l.boss ? x1 : W - 28
        ctx.fillRect(x0, l.y - th, bw, th * 2)
        ctx.fillStyle = l.boss ? '#fb7185' : '#f87171'
        ctx.fillRect(x0, l.y - th * 0.5, bw, th)
        ctx.fillStyle = '#fff'
        ctx.fillRect(x0, l.y - th * 0.18, bw, th * 0.36)
      }
    }

    for (const m of w.missiles) {
      if (m.warn > 0) drawWarning(ctx, W - 26, m.y, 1 - m.warn / 1.35, t)
      else drawMissile(ctx, m.x, m.y, t)
    }
    for (const o of w.orbs) drawOrb(ctx, o, t)
    if (w.empFx > 0 && w.boss.on) drawZapBolt(ctx, px, w.py, w.boss.x - 12, w.boss.y - 16, w.empFx / 0.3)
    if (w.boss.on && w.boss.state === 'enter' && ph === 'play') {
      ctx.globalAlpha = 0.3 + Math.sin(t * 14) * 0.2
      ctx.fillStyle = '#f43f5e'
      ctx.fillRect(W - 8, CEIL, 8, fy - CEIL)
      ctx.globalAlpha = 1
    }

    // Hero
    const blink = w.inv > 0 && w.rocketT <= 0 && Math.sin(t * 40) > 0.3
    if (w.rocketT > 0 && ph === 'play') {
      glow(ctx, px, w.py, 60, '#fde047', 0.45)
      ctx.strokeStyle = 'rgba(253,224,71,0.6)'
      ctx.lineWidth = 2
      for (let i = 0; i < 5; i++) {
        const ly = w.py - 20 + i * 10
        const lx = px - 40 - ((t * 900 + i * 47) % 120)
        ctx.beginPath()
        ctx.moveTo(lx, ly)
        ctx.lineTo(lx - 40, ly)
        ctx.stroke()
      }
    }
    ctx.save()
    ctx.translate(px, w.py)
    ctx.globalAlpha = blink ? 0.4 : 1
    // Soft floor shadow
    const sh = clamp(1 - (fy - w.py) / 300, 0.15, 1)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.ellipse(0, fy - w.py + 2, 18 * sh, 4 * sh, 0, 0, Math.PI * 2)
    ctx.fill()
    const thrusting = (holdRef.current && ph === 'play') || w.rocketT > 0 || (ph === 'idle' && w.vy < 0)
    ctx.scale(1.2, 1.2)
    drawHero(ctx, t, thrusting, w.onFloor && ph === 'play', w.runPh, w.tilt)
    ctx.scale(1 / 1.2, 1 / 1.2)
    ctx.globalAlpha = 1
    if (w.shield > 0 && ph === 'play') {
      ctx.strokeStyle = '#7dd3fc'
      for (let i = 0; i < w.shield; i++) {
        ctx.globalAlpha = 0.5 - i * 0.12
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(-2, -4, 30 + i * 5 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 0.12
      ctx.fillStyle = '#38bdf8'
      ctx.beginPath()
      ctx.arc(-2, -4, 30, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 0.6
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.ellipse(-12, -20, 6, 3, -0.7, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    if (w.magnetT > 0 && ph === 'play') {
      ctx.strokeStyle = '#f472b6'
      ctx.globalAlpha = 0.35
      ctx.lineWidth = 2
      const r = 40 + ((t * 80) % 50)
      ctx.beginPath()
      ctx.arc(0, -4, r, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    ctx.restore()

    fx.draw(ctx)
    ctx.restore()
    if (w.boss.on && w.boss.state !== 'down' && ph === 'play') drawBossBar(ctx, w.boss, W, H)
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const m = hud.dist
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{m} m</div>
                <div className="action-hud__small">🪙 {hud.coins}</div>
              </div>
              <div className="action-hud__right">
                {hud.shield > 0 ? <span className="action-hud__small" style={{ color: '#7dd3fc' }}>Shield ×{hud.shield}</span> : null}
                {hud.magnet > 0 ? <span className="action-hud__small" style={{ color: '#f9a8d4' }}>Magnet {hud.magnet}s</span> : null}
                {hud.rocket > 0 && hud.rocket < 50 ? <span className="action-hud__small" style={{ color: '#fde047' }}>Boost {hud.rocket}s</span> : null}
              </div>
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
              game="jetpack"
              icon={meta.icon}
              title={meta.title}
              hint="Hold anywhere to thrust, release to drop. Dodge zappers, missiles and lasers while you grab coins."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={m >= 1000 ? 'Legendary flight!' : m >= 500 ? 'Great flight!' : 'Zapped!'}
            subtitle={`${m} m · ${hud.coins} coins`}
            celebrate={m >= 500}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
