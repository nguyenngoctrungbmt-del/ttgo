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
import '../../shared/action/action.css'
import { drawBiomeLayer, drawDart, drawDrone, drawGeyser, drawOrb, drawSentinel, drawShieldPick } from './art'

const meta = getGame('copter')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Col = { x: number; top: number; bot: number }
type Rock = { k: 'rock'; x: number; y: number; w: number; h: number; verts: number[] }
type Pillar = { k: 'pillar'; x: number; w: number; top: boolean; len: number; amp: number; ph: number; speed: number }
type Bat = { k: 'bat'; x: number; y: number; ph: number; baseY: number }
type Drop = { k: 'drop'; x: number; y: number; vy: number; shake: number; falling: boolean; len: number }
type Geyser = { k: 'geyser'; x: number; top: boolean; tm: number; h: number; hMax: number; puff: number }
/** Projectiles: vx/vy are screen-relative (px/s). */
type Dart = { k: 'dart'; x: number; y: number; vx: number; vy: number }
type Orb = { k: 'orb'; x: number; y: number; vx: number; vy: number }
type Obs = Rock | Pillar | Bat | Drop | Geyser | Dart | Orb
type Pick = { k: 'fuel' | 'gem' | 'shield'; x: number; y: number; got: boolean }
type Biome = { name: string; bg1: string; bg2: string; back: string; wall1: string; wall2: string; edge: string; accent: string; part: 'spore' | 'snow' | 'ember' | 'spark' | 'glow' | 'bubble' }
type Drone = { x: number; y: number; st: 'in' | 'aim' | 'cool' | 'out'; tm: number; shots: number; aimY: number }
type Boss = { st: 'off' | 'in' | 'fight' | 'out'; tm: number; x: number; y: number; atk: number; atkT: number; mode: 'none' | 'beam' | 'orbs'; warn: number; fire: number; bandY: number; bandH: number }

const BIOMES: Biome[] = [
  { name: 'Mossy Cavern', bg1: '#0d1d16', bg2: '#183024', back: '#1f3a2c', wall1: '#3d5a2e', wall2: '#141f10', edge: '#86b049', accent: '#bef264', part: 'spore' },
  { name: 'Ice Cave', bg1: '#0b1b31', bg2: '#163a5e', back: '#1f4c75', wall1: '#8fc9e8', wall2: '#1e4766', edge: '#e0f7ff', accent: '#7dd3fc', part: 'snow' },
  { name: 'Lava Cave', bg1: '#220804', bg2: '#451206', back: '#5a1a0a', wall1: '#4a1f14', wall2: '#140604', edge: '#fb923c', accent: '#f97316', part: 'ember' },
  { name: 'Crystal Cave', bg1: '#160a2e', bg2: '#2c1260', back: '#3b1a78', wall1: '#4c2a80', wall2: '#140a2a', edge: '#d8b4fe', accent: '#e879f9', part: 'spark' },
  { name: 'Glow Grotto', bg1: '#080a1c', bg2: '#16123a', back: '#21184a', wall1: '#33245a', wall2: '#0c0818', edge: '#5eead4', accent: '#f472b6', part: 'glow' },
  { name: 'Sunken Temple', bg1: '#031519', bg2: '#06363f', back: '#0a4852', wall1: '#4f6b55', wall2: '#0b1a16', edge: '#a7f3d0', accent: '#22d3ee', part: 'bubble' },
]

const BOSS_FIRST = 220
const BOSS_EVERY = 160
const BOSS_FIGHT = 20
const SHIELD_FIRST = 60
const SHIELD_TIME = 12

const COL = 10
const PX_PER_M = 20
const BIOME_M = 600
const CR = { x: 17, y: 8 }

type World = {
  t: number
  x: number
  y: number
  vy: number
  tilt: number
  speed: number
  cols: Col[]
  genX: number
  center: number
  centerTarget: number
  centerT: number
  gap: number
  obs: Obs[]
  picks: Pick[]
  obsGap: number
  fuelGap: number
  gemGap: number
  fuel: number
  armor: number
  inv: number
  biome: number
  biomeFade: number
  nextMark: number
  tier: number
  smokeT: number
  lowT: number
  deadRot: number
  shield: number
  shieldT: number
  drone: Drone | null
  droneT: number
  boss: Boss
  bossNext: number
  bossN: number
  god: boolean
  stats: { dist: number; gems: number; fuel: number; biome: number; close: number }
}

// Tier index gates spawn kinds: 1 rock, 2 pillar, 3 bat, 4 drop, 5 geyser, 7 drones
const TIERS = [
  { t: 0, label: '', sub: '' },
  { t: 22, label: 'FLOATING ROCKS', sub: 'new hazard' },
  { t: 45, label: 'CRUSHER PILLARS', sub: 'new hazard' },
  { t: 75, label: 'BATS!', sub: 'new hazard' },
  { t: 105, label: 'FALLING STALACTITES', sub: 'new hazard' },
  { t: 125, label: 'STEAM GEYSERS', sub: 'watch the red vents' },
  { t: 140, label: 'DEEP CAVE', sub: 'new hazard' },
  { t: 165, label: 'SENTRY DRONES', sub: 'dodge the red line' },
]
const T_GEYSER = 5
const T_DRONE = 7

function freshBoss(): Boss {
  return { st: 'off', tm: 0, x: 0, y: 0, atk: 0, atkT: 0, mode: 'none', warn: 0, fire: 0, bandY: 0, bandH: 0 }
}

function freshWorld(H: number): World {
  return {
    t: 0,
    x: 0,
    y: H / 2,
    vy: 0,
    tilt: 0,
    speed: 190,
    cols: [],
    genX: -400,
    center: H / 2,
    centerTarget: H / 2,
    centerT: 400,
    gap: H * 0.66,
    obs: [],
    picks: [],
    obsGap: 700,
    fuelGap: 1800,
    gemGap: 300,
    fuel: 100,
    armor: 0,
    inv: 0,
    biome: 0,
    biomeFade: 0,
    nextMark: 100,
    tier: 0,
    smokeT: 0,
    lowT: 0,
    deadRot: 0,
    shield: 0,
    shieldT: SHIELD_FIRST,
    drone: null,
    droneT: 2,
    boss: freshBoss(),
    bossNext: BOSS_FIRST,
    bossN: 0,
    god: false,
    stats: { dist: 0, gems: 0, fuel: 0, biome: 1, close: 0 },
  }
}

function wallAt(cols: Col[], x: number): { top: number; bot: number } {
  if (!cols.length) return { top: 0, bot: 9999 }
  const i = (x - cols[0].x) / COL
  const a = cols[clamp(Math.floor(i), 0, cols.length - 1)]
  const b = cols[clamp(Math.floor(i) + 1, 0, cols.length - 1)]
  const k = clamp(i - Math.floor(i), 0, 1)
  return { top: a.top + (b.top - a.top) * k, bot: a.bot + (b.bot - a.bot) * k }
}

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k
}

// ── Art ────────────────────────────────────────────────────

function drawCopter(ctx: CanvasRenderingContext2D, t: number, thrust: boolean) {
  // Tail boom
  ctx.fillStyle = '#b91c1c'
  ctx.beginPath()
  ctx.moveTo(-8, -3)
  ctx.lineTo(-30, -2)
  ctx.lineTo(-30, 2)
  ctx.lineTo(-8, 4)
  ctx.fill()
  ctx.fillStyle = '#7f1d1d'
  ctx.beginPath()
  ctx.moveTo(-30, -2)
  ctx.lineTo(-34, -10)
  ctx.lineTo(-27, -2)
  ctx.fill()
  // Tail rotor
  ctx.fillStyle = 'rgba(226,232,240,0.6)'
  const tr = Math.abs(Math.sin(t * 40)) * 7 + 1
  ctx.beginPath()
  ctx.ellipse(-31, -2, 2, tr, 0, 0, Math.PI * 2)
  ctx.fill()
  // Skids
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-10, 13)
  ctx.lineTo(12, 13)
  ctx.quadraticCurveTo(16, 13, 17, 10)
  ctx.moveTo(-4, 9)
  ctx.lineTo(-6, 13)
  ctx.moveTo(6, 9)
  ctx.lineTo(8, 13)
  ctx.stroke()
  // Body
  const body = ctx.createLinearGradient(0, -10, 0, 11)
  body.addColorStop(0, '#fca5a5')
  body.addColorStop(0.35, '#ef4444')
  body.addColorStop(1, '#991b1b')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(-12, -2)
  ctx.quadraticCurveTo(-12, -10, 0, -10)
  ctx.quadraticCurveTo(16, -10, 19, 2)
  ctx.quadraticCurveTo(18, 10, 4, 10)
  ctx.lineTo(-8, 10)
  ctx.quadraticCurveTo(-13, 8, -12, -2)
  ctx.fill()
  ctx.strokeStyle = '#450a0a'
  ctx.lineWidth = 1.2
  ctx.stroke()
  // Cockpit glass
  const glass = ctx.createLinearGradient(4, -9, 16, 3)
  glass.addColorStop(0, '#cffafe')
  glass.addColorStop(1, '#0e7490')
  ctx.fillStyle = glass
  ctx.beginPath()
  ctx.moveTo(3, -8)
  ctx.quadraticCurveTo(14, -8, 17, 2)
  ctx.lineTo(3, 2)
  ctx.closePath()
  ctx.fill()
  // Pilot
  ctx.fillStyle = '#fde68a'
  ctx.beginPath()
  ctx.arc(7, -2, 3.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.arc(7, -3.2, 3.4, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.beginPath()
  ctx.ellipse(10, -5, 3, 1.2, 0.4, 0, Math.PI * 2)
  ctx.fill()
  // Stripe
  ctx.fillStyle = '#fde047'
  ctx.fillRect(-11, 2, 14, 2.5)
  // Mast + rotor
  ctx.fillStyle = '#334155'
  ctx.fillRect(-1.5, -15, 3, 6)
  ctx.fillStyle = 'rgba(226,232,240,0.18)'
  ctx.beginPath()
  ctx.ellipse(0, -15, 30, 3.2, 0, 0, Math.PI * 2)
  ctx.fill()
  const bl = Math.cos(t * (thrust ? 70 : 50)) * 30
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-bl, -15)
  ctx.lineTo(bl, -15)
  ctx.stroke()
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.arc(0, -15, 2.2, 0, Math.PI * 2)
  ctx.fill()
}

function drawBat(ctx: CanvasRenderingContext2D, x: number, y: number, ph: number) {
  const f = Math.sin(ph * 18)
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = '#3b0764'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(s * 10, -10 * f - 4, s * 18, -6 * f)
    ctx.quadraticCurveTo(s * 13, 1, s * 9, 4)
    ctx.quadraticCurveTo(s * 5, 2, 0, 4)
    ctx.fill()
    ctx.strokeStyle = '#d8b4fe'
    ctx.lineWidth = 1.2
    ctx.stroke()
  }
  ctx.fillStyle = '#581c87'
  ctx.beginPath()
  ctx.ellipse(0, 1, 6, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-4, -4)
  ctx.lineTo(-3, -9)
  ctx.lineTo(-1, -5)
  ctx.moveTo(4, -4)
  ctx.lineTo(3, -9)
  ctx.lineTo(1, -5)
  ctx.fill()
  ctx.fillStyle = '#fde047'
  ctx.beginPath()
  ctx.arc(-2.2, -1, 1.6, 0, Math.PI * 2)
  ctx.arc(2.2, -1, 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillRect(-2, 4, 1.2, 2)
  ctx.fillRect(0.8, 4, 1.2, 2)
  ctx.restore()
}

export default function CopterGame() {
  const run = useActionRun('copter')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(600))
  const phaseRef = useRef<Phase>('idle')
  const holdRef = useRef(false)
  const hudT = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ dist: 0, gems: 0, fuel: 100, armor: 0, shield: 0 })
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
    setHud({ dist: Math.floor(w.x / PX_PER_M), gems: w.stats.gems, fuel: Math.ceil(w.fuel), armor: w.armor, shield: Math.ceil(w.shield) })
  }

  function start() {
    void unlockAudio()
    const H = size.current.h
    const w = freshWorld(H)
    w.armor = run.level('armor')
    world.current = w
    holdRef.current = false
    fx.reset()
    genTo(size.current.w + 200)
    run.begin()
    setPhaseBoth('play')
    say(BIOMES[0].name.toUpperCase(), 'hold to rise')
    sfx.ready()
    pushHud()
  }

  function finishRun() {
    const w = world.current
    setPhaseBoth('over')
    const m = Math.floor(w.x / PX_PER_M)
    const coins = Math.round(w.stats.gems / 3 + m / 50 + w.bossN * 8)
    run.end({ score: m, cleared: m >= 600, stats: { ...w.stats, dist: m }, coins }, revive)
  }

  function crash(): boolean {
    const w = world.current
    if (phaseRef.current !== 'play' || w.inv > 0 || w.god) return false
    const W = size.current.w
    const sx = W * 0.28
    if (w.shield > 0) {
      w.shield = 0
      w.inv = 1.2
      const wall = wallAt(w.cols, w.x)
      w.vy = w.y < (wall.top + wall.bot) / 2 ? 200 : -200
      fx.burst(sx, w.y, { count: 26, color: ['#e0f2fe', '#38bdf8', '#fff'], speed: 320, shape: 'spark' })
      fx.ring(sx, w.y, { color: '#38bdf8', maxR: 80, life: 0.45, width: 5 })
      fx.text(sx, w.y - 30, 'SHIELD!', '#7dd3fc', 20)
      fx.stop(0.07)
      fx.shake(7, 0.25)
      sfx.pop()
      haptic.heavy()
      pushHud()
      return false
    }
    if (w.armor > 0) {
      w.armor -= 1
      w.inv = 1.5
      const wall = wallAt(w.cols, w.x)
      w.vy = w.y < (wall.top + wall.bot) / 2 ? 220 : -220
      fx.burst(sx, w.y, { count: 22, color: ['#fde047', '#fff', '#94a3b8'], speed: 300, shape: 'spark' })
      fx.ring(sx, w.y, { color: '#7dd3fc', maxR: 60, life: 0.4, width: 4 })
      fx.text(sx, w.y - 30, 'ARMOR!', '#7dd3fc', 20)
      fx.stop(0.08)
      fx.shake(8, 0.3)
      sfx.clang()
      haptic.heavy()
      pushHud()
      return false
    }
    setPhaseBoth('dying')
    holdRef.current = false
    w.vy = -160
    fx.explode(sx, w.y, 1.4, ['#fde047', '#fb923c', '#ef4444', '#fff'])
    fx.burst(sx, w.y, { count: 14, color: ['#ef4444', '#991b1b', '#e2e8f0'], speed: 260, shape: 'square', size: 5, gravity: 700, life: 1 })
    fx.flash('#ef4444', 0.3)
    fx.stop(0.12)
    fx.shake(14, 0.45)
    fx.slowmo(0.7, 0.35)
    sfx.boom(0.8)
    sfx.lose()
    haptic.error()
    run.update({ ...w.stats, dist: Math.floor(w.x / PX_PER_M) })
    window.setTimeout(finishRun, 1300)
    return true
  }

  function revive() {
    const w = world.current
    const W = size.current.w
    w.obs = w.obs.filter((o) => o.x > w.x + W)
    const wall = wallAt(w.cols, w.x)
    w.y = (wall.top + wall.bot) / 2
    w.vy = 0
    w.fuel = Math.max(w.fuel, 70)
    w.inv = 2.2
    w.speed = Math.max(190, w.speed * 0.85)
    w.obsGap = Math.max(w.obsGap, 300)
    if (w.drone) w.drone.st = 'out'
    w.droneT = Math.max(w.droneT, 5)
    if (w.boss.st === 'fight') {
      w.boss.mode = 'none'
      w.boss.atkT = 2.2
    }
    fx.ring(W * 0.28, w.y, { color: '#7dd3fc', maxR: 90, life: 0.6 })
    say('REVIVED!', 'fuel refilled')
    setPhaseBoth('play')
    pushHud()
  }

  /** Extend the cave so it reaches screen-x `ahead` past the copter. */
  function genTo(ahead: number) {
    const w = world.current
    const H = size.current.h
    const W = size.current.w
    const camX = w.x - W * 0.28
    while (w.genX < camX + ahead) {
      const m = Math.max(0, w.genX / PX_PER_M)
      const diff = clamp(m / 2200, 0, 1)
      const minGap = Math.max(140, H * 0.3)
      let gapT = lerp(H * 0.66, minGap, diff)
      gapT *= 1 + Math.sin(w.genX * 0.0021) * 0.12
      // Wide, nearly straight opening for the first ~20 s
      const open = clamp((w.genX - 3800) / 1600, 0, 1)
      gapT = lerp(H * 0.76, gapT, open)
      if (m > 150 && Math.sin(w.genX * 0.00063) > 0.85) gapT *= 0.85
      // Boss arena: a wide, calm tunnel so the attacks are the only threat
      const arena = w.boss.st === 'in' || w.boss.st === 'fight'
      if (arena) gapT = Math.max(gapT, H * 0.6)
      w.gap = approach(w.gap, Math.max(minGap, gapT), arena ? 0.012 : 0.004, COL)
      w.centerT -= COL
      if (w.centerT <= 0) {
        w.centerT = rand(260, 520)
        const amp = lerp(0.12, 0.32, diff) * H * lerp(0.25, 1, clamp((w.genX - 3800) / 1600, 0, 1)) * (arena ? 0.35 : 1)
        w.centerTarget = clamp(H / 2 + rand(-amp, amp), 30 + w.gap / 2, H - 30 - w.gap / 2)
      }
      const slope = lerp(0.25, 0.5, diff) * COL
      w.center += clamp(w.centerTarget - w.center, -slope, slope)
      w.center = clamp(w.center, 24 + w.gap / 2, H - 24 - w.gap / 2)
      const jag = Math.sin(w.genX * 0.05) * 3 + rand(-2.5, 2.5)
      w.cols.push({ x: w.genX, top: w.center - w.gap / 2 + jag, bot: w.center + w.gap / 2 + Math.sin(w.genX * 0.043 + 2) * 3 + rand(-2.5, 2.5) })
      w.genX += COL
    }
    while (w.cols.length > 2 && w.cols[1].x < camX - 40) w.cols.shift()
  }

  function spawn(W: number) {
    const w = world.current
    const sx = w.x - W * 0.28 + W + 60
    const wall = wallAt(w.cols, sx)
    if (wall.bot - wall.top < 60) return
    const gapH = wall.bot - wall.top
    const opts: Obs['k'][] = []
    if (w.tier >= 1) opts.push('rock', 'rock')
    if (w.tier >= 2) opts.push('pillar', 'pillar')
    if (w.tier >= 3) opts.push('bat', 'bat')
    if (w.tier >= 4) opts.push('drop')
    if (w.tier >= T_GEYSER) opts.push('geyser', 'geyser')
    if (!opts.length) return
    const k = opts[Math.floor(Math.random() * opts.length)]
    if (k === 'geyser') {
      w.obs.push({ k: 'geyser', x: sx, top: Math.random() < 0.35, tm: 0, h: 0, hMax: gapH * rand(0.38, 0.48), puff: 0 })
    } else if (k === 'rock') {
      const h = Math.min(gapH * 0.32, rand(36, 64))
      const ww = rand(30, 46)
      const free = gapH - h
      // Leave at least one comfortable lane
      const side = Math.random() < 0.5
      const off = side ? rand(free * 0.62, free * 0.85) : rand(free * 0.15, free * 0.38)
      const verts: number[] = []
      for (let i = 0; i < 8; i++) verts.push(rand(0.78, 1.05))
      w.obs.push({ k: 'rock', x: sx, y: wall.top + off, w: ww, h, verts })
    } else if (k === 'pillar') {
      const top = Math.random() < 0.5
      w.obs.push({ k: 'pillar', x: sx, w: 26, top, len: gapH * 0.35, amp: gapH * 0.22, ph: rand(0, 6), speed: rand(1.6, 2.4) })
    } else if (k === 'bat') {
      const n = 1 + (Math.random() < Math.min(0.6, w.t / 300) ? 1 : 0)
      for (let i = 0; i < n; i++) {
        const y = rand(wall.top + 30, wall.bot - 30)
        w.obs.push({ k: 'bat', x: sx + i * 50, y, baseY: y, ph: rand(0, 6) })
      }
    } else {
      w.obs.push({ k: 'drop', x: sx, y: wall.top, vy: 0, shake: 0, falling: false, len: rand(30, 44) })
    }
  }

  function spawnDrone(W: number) {
    const w = world.current
    const wl = wallAt(w.cols, w.x - W * 0.28 + W * 0.84)
    w.drone = { x: W + 40, y: (wl.top + wl.bot) / 2, st: 'in', tm: 0, shots: w.t > 280 ? 3 : 2, aimY: w.y }
    sfx.whoosh()
  }

  /** Sentry drone: hovers ahead, tracks the copter with a red laser line, locks, then fires a dart along it. */
  function updateDrone(dt: number, W: number) {
    const w = world.current
    const d = w.drone
    if (!d) return false
    const sx = W * 0.28
    const playing = phaseRef.current === 'play'
    const wl = wallAt(w.cols, w.x - sx + d.x)
    if (!playing && d.st !== 'out') d.st = 'out'
    d.tm += dt
    if (d.st === 'in') {
      d.x = approach(d.x, W * 0.84, 4, dt)
      d.y = approach(d.y, clamp(w.y, wl.top + 20, wl.bot - 20), 3, dt)
      if (d.tm > 0.8) {
        d.st = 'aim'
        d.tm = 0
        d.aimY = d.y
        sfx.tick()
      }
    } else if (d.st === 'aim') {
      const cw = wallAt(w.cols, w.x)
      // Track for the first 0.4 s, then the lane locks
      if (d.tm < 0.4) d.aimY = approach(d.aimY, clamp(w.y, cw.top + 14, cw.bot - 14), 9, dt)
      else if (d.tm - dt < 0.4) sfx.tick()
      d.y = approach(d.y, clamp(d.aimY, wl.top + 18, wl.bot - 18), 10, dt)
      if (d.tm >= 1.0) {
        w.obs.push({ k: 'dart', x: w.x - sx + d.x - 34, y: d.aimY, vx: -330, vy: 0 })
        fx.burst(d.x - 34, d.aimY, { count: 6, color: ['#fecaca', '#ef4444', '#fff'], speed: 160, angle: Math.PI, spread: 0.7, shape: 'spark' })
        sfx.shoot()
        d.shots -= 1
        d.st = 'cool'
        d.tm = 0
      }
    } else if (d.st === 'cool') {
      d.x = approach(d.x, W * 0.86, 3, dt)
      if (d.tm > 0.6) {
        d.st = d.shots > 0 ? 'aim' : 'out'
        d.tm = 0
        d.aimY = d.y
      }
    } else {
      d.x += 170 * dt
      d.y -= 110 * dt
      if (d.x > W + 60 || d.y < -40) w.drone = null
    }
    return false
  }

  function startBoss(W: number) {
    const w = world.current
    const b = w.boss
    Object.assign(b, freshBoss())
    b.st = 'in'
    b.x = W + 90
    b.y = w.y
    b.atkT = 0.8
    w.bossNext = w.t + BOSS_FIGHT + BOSS_EVERY
    w.fuelGap = Math.min(w.fuelGap, 300)
    say('THE SENTINEL', `boss · survive ${BOSS_FIGHT} s`)
    fx.flash('#ef4444', 0.25)
    fx.shake(6, 0.6)
    haptic.heavy()
    // Alarm sting
    sfx.miss()
    window.setTimeout(() => sfx.miss(), 220)
    window.setTimeout(() => sfx.boom(0.5), 440)
    window.setTimeout(() => sfx.clang(), 700)
  }

  function defeatBoss(W: number) {
    const w = world.current
    const b = w.boss
    const sx = W * 0.28
    b.st = 'out'
    b.tm = 0
    b.mode = 'none'
    w.bossN += 1
    w.armor += 1
    w.fuel = 100
    const wl = wallAt(w.cols, w.x + 200)
    const mid = (wl.top + wl.bot) / 2
    const amp = (wl.bot - wl.top) * 0.22
    for (let i = 0; i < 24; i++) w.picks.push({ k: 'gem', x: w.x + 150 + i * 24, y: mid + Math.sin(i * 0.55) * amp, got: false })
    fx.explode(b.x, b.y, 2, ['#fde047', '#fb923c', '#ef4444', '#fff', '#94a3b8'])
    fx.ring(b.x, b.y, { color: '#fde047', maxR: 140, life: 0.7, width: 6 })
    fx.ring(sx, w.y, { color: '#7dd3fc', maxR: 60, life: 0.5, width: 4 })
    fx.text(sx, w.y - 34, '+1 ARMOR', '#7dd3fc', 20)
    fx.flash('#fff', 0.3)
    fx.shake(16, 0.6)
    fx.slowmo(0.8, 0.3)
    sfx.boom(1)
    window.setTimeout(() => sfx.win(), 250)
    haptic.success()
    say('SENTINEL DOWN!', '+1 armor · gem shower')
    pushHud()
    void trackEvent('action_milestone', { game_id: 'copter', kind: 'boss', value: w.bossN })
  }

  /** The Sentinel boss: telegraphed laser bands and aimed orb volleys until it overheats. Returns true on death. */
  function updateBoss(dt: number, W: number) {
    const w = world.current
    const b = w.boss
    if (b.st === 'off') return false
    const sx = W * 0.28
    const playing = phaseRef.current === 'play'
    const wl = wallAt(w.cols, w.x - sx + b.x)
    const mid = (wl.top + wl.bot) / 2
    b.tm += dt
    if (b.st === 'out') {
      b.x += 40 * dt
      b.y += 160 * dt
      if (Math.random() < dt * 10) fx.burst(b.x + rand(-30, 30), b.y + rand(-30, 30), { count: 5, color: ['#fb923c', '#fde047', '#334155'], speed: 150, size: 4 })
      if (b.tm > 1.6) b.st = 'off'
      return false
    }
    if (b.st === 'in') {
      b.x = approach(b.x, W * 0.83, 2.2, dt)
      b.y = approach(b.y, mid, 3, dt)
      if (b.tm > 2) {
        b.st = 'fight'
        b.tm = 0
      }
      return false
    }
    // fight
    if (!playing) {
      // Hold the overheat clock while dying / on the continue screen
      b.tm -= dt
      b.mode = 'none'
      b.y = approach(b.y, mid, 2, dt)
      return false
    }
    if (b.tm >= BOSS_FIGHT && b.mode === 'none') {
      defeatBoss(W)
      return false
    }
    const late = b.tm > BOSS_FIGHT / 2
    if (b.mode === 'none') {
      b.y = approach(b.y, mid + Math.sin(b.tm * 1.3) * (wl.bot - wl.top) * 0.18, 2.5, dt)
      b.atkT -= dt
      if (b.atkT <= 0) {
        const cw = wallAt(w.cols, w.x)
        const gap = cw.bot - cw.top
        const kind = b.atk % 3 === 1 ? 'orbs' : 'beam'
        b.atk += 1
        if (kind === 'beam') {
          b.mode = 'beam'
          b.bandH = clamp(gap * 0.16, 22, 44)
          const lo = cw.top + b.bandH + 8
          const hi = cw.bot - b.bandH - 8
          b.bandY = Math.random() < 0.55 ? clamp(w.y, lo, hi) : rand(lo, hi)
          b.warn = late ? 0.95 : 1.15
          b.fire = 0
          sfx.tick()
        } else {
          b.mode = 'orbs'
          b.warn = 0.65
          sfx.power()
        }
      }
      return false
    }
    if (b.mode === 'beam') {
      b.y = approach(b.y, b.bandY, 6, dt)
      if (b.warn > 0) {
        b.warn -= dt
        if (b.warn <= 0) {
          b.fire = 0.45
          sfx.boom(0.35)
          sfx.shoot()
          fx.shake(6, 0.3)
          haptic.medium()
        }
        return false
      }
      b.fire -= dt
      if (Math.abs(w.y - b.bandY) < b.bandH + CR.y * 0.5 && w.inv <= 0) {
        if (crash()) return true
      }
      if (b.fire <= 0) {
        b.mode = 'none'
        b.atkT = late ? 0.45 : 0.7
      }
      return false
    }
    // orbs
    b.warn -= dt
    if (b.warn <= 0) {
      const base = Math.atan2(w.y - b.y, sx - (b.x - 30))
      const n = late ? 5 : 3
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * (late ? 0.2 : 0.26)
        const sp = 200
        w.obs.push({ k: 'orb', x: w.x - sx + b.x - 30, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp })
      }
      fx.burst(b.x - 30, b.y, { count: 10, color: ['#fda4af', '#f43f5e', '#fff'], speed: 180, angle: Math.PI, spread: 1, shape: 'spark' })
      sfx.shoot()
      b.mode = 'none'
      b.atkT = late ? 1.1 : 1.4
    }
    return false
  }

  function step(dt: number, W: number, t: number) {
    const w = world.current
    const ph = phaseRef.current
    const playing = ph === 'play'
    const demo = ph === 'idle'
    const sx = W * 0.28

    if (playing) {
      w.t += dt
      const nt = TIERS[w.tier + 1]
      if (nt && w.t >= nt.t) {
        w.tier += 1
        say(nt.label, nt.sub)
        sfx.levelUp()
      }
    }
    let target = 190 + Math.min(230, w.t * 1.6)
    if (demo) target = 170
    if (ph === 'dying' || ph === 'over') w.speed = approach(w.speed, 0, 2, dt)
    else w.speed = approach(w.speed, target, 2, dt)
    w.x += w.speed * dt
    if (demo && w.cols.length === 0) genTo(W + 200)
    genTo(W + 200)

    const wall = wallAt(w.cols, w.x)
    const hold = holdRef.current && playing && w.fuel > 0
    let thrust = hold
    if (demo || (w.god && playing && !holdRef.current)) {
      const mid = (wall.top + wall.bot) / 2 + Math.sin(t * 1.3) * 20
      thrust = w.y > mid + w.vy * 0.25
    }
    if (ph === 'dying' || ph === 'over') {
      w.vy += 900 * dt
      w.y += w.vy * dt
      w.deadRot += dt * 6
      if (w.y > wall.bot - 10) {
        w.y = wall.bot - 10
        w.vy = -w.vy * 0.3
      }
    } else {
      w.vy += (thrust ? -1150 : 950) * dt
      w.vy = clamp(w.vy, -340, 380)
      w.y += w.vy * dt
    }
    w.tilt = approach(w.tilt, ph === 'dying' || ph === 'over' ? w.deadRot : clamp(w.vy / 900, -0.3, 0.35), 10, dt)

    // Fuel
    if (playing) {
      const drain = 2.3 * (1 - run.level('tank') * 0.12) * (1 + Math.min(0.5, w.t / 400))
      const before = w.fuel
      w.fuel = Math.max(0, w.fuel - drain * dt)
      if (before > 0 && w.fuel <= 0) {
        say('OUT OF FUEL!', 'engine stalled')
        sfx.miss()
        haptic.heavy()
      }
      if (w.fuel < 25) {
        w.lowT -= dt
        if (w.lowT <= 0) {
          w.lowT = w.fuel <= 0 ? 0.25 : 0.6
          sfx.tick()
        }
      }
    }

    // Smoke trail
    w.smokeT -= dt
    if (w.smokeT <= 0 && ph !== 'over') {
      w.smokeT = w.fuel < 20 && playing ? 0.03 : 0.07
      const dark = w.fuel < 20 && playing
      fx.burst(sx - 14, w.y + 2, { count: 1, color: dark ? ['#1f2937', '#374151'] : ['#94a3b8', '#cbd5e1'], speed: 40, angle: Math.PI, spread: 0.6, size: dark ? 7 : 5, life: 0.7, gravity: -30, drag: 1.5 })
    }

    w.inv = Math.max(0, w.inv - dt)
    w.biomeFade = Math.max(0, w.biomeFade - dt * 0.8)

    // Wall collision
    if (playing) {
      for (const ox of [-14, 0, 16]) {
        const wl = wallAt(w.cols, w.x + ox)
        const yTop = w.y - (ox === 0 ? CR.y + 6 : CR.y)
        const yBot = w.y + CR.y + 4
        if (yTop < wl.top || yBot > wl.bot) {
          if (w.inv > 0 || w.t < 20 || w.god) {
            w.y = clamp(w.y, wl.top + CR.y + 7, wl.bot - CR.y - 5)
            w.vy = yTop < wl.top ? 160 : -200
            if (w.inv <= 0) {
              w.inv = 0.35
              fx.burst(sx, yTop < wl.top ? wl.top : wl.bot, { count: 10, color: ['#fde047', '#fff'], speed: 200, shape: 'spark' })
              fx.text(sx, w.y - 28, 'BONK!', '#fde047', 15)
              fx.shake(4, 0.15)
              sfx.thud()
              haptic.light()
            }
          } else if (crash()) return
          else w.y = clamp(w.y, wl.top + CR.y + 8, wl.bot - CR.y - 6)
          break
        }
      }
    }

    // Spawning
    if (playing) {
      const diff = clamp(w.t / 200, 0, 1)
      const bossOn = w.boss.st !== 'off'
      w.obsGap -= w.speed * dt
      if (w.obsGap <= 0) {
        if (!bossOn) spawn(W)
        w.obsGap = lerp(520, 230, diff) * rand(0.8, 1.2)
      }
      if (w.t >= SHIELD_FIRST && !bossOn) {
        w.shieldT -= dt
        if (w.shieldT <= 0) {
          w.shieldT = rand(38, 52)
          const shx = w.x - sx + W + 40
          const wl = wallAt(w.cols, shx)
          w.picks.push({ k: 'shield', x: shx, y: (wl.top + wl.bot) / 2, got: false })
        }
      }
      if (w.tier >= T_DRONE && !w.drone && !bossOn) {
        w.droneT -= dt
        if (w.droneT <= 0) {
          w.droneT = rand(8, 13) * lerp(1, 0.7, clamp((w.t - 165) / 300, 0, 1))
          spawnDrone(W)
        }
      }
      if (w.t >= w.bossNext && !bossOn && !w.drone) startBoss(W)
      w.fuelGap -= w.speed * dt
      if (w.fuelGap <= 0) {
        w.fuelGap = rand(2400, 3000) * (1 + diff * 0.4)
        const fxw = w.x - sx + W + 40
        const wl = wallAt(w.cols, fxw)
        w.picks.push({ k: 'fuel', x: fxw, y: (wl.top + wl.bot) / 2, got: false })
      }
    }
    if (playing || demo) {
      w.gemGap -= w.speed * dt
      if (w.gemGap <= 0) {
        w.gemGap = rand(380, 620)
        const n = 4 + Math.floor(Math.random() * 4)
        for (let i = 0; i < n; i++) {
          const gx = w.x - sx + W + 40 + i * 26
          const wl = wallAt(w.cols, gx)
          w.picks.push({ k: 'gem', x: gx, y: (wl.top + wl.bot) / 2 + Math.sin(i * 0.8) * (wl.bot - wl.top) * 0.18, got: false })
        }
      }
    }

    // Obstacles
    const cx = w.x
    for (const o of w.obs) {
      let hit = false
      let passX = o.x
      if (o.k === 'rock') {
        hit = cx + CR.x > o.x + 4 && cx - CR.x < o.x + o.w - 4 && w.y + CR.y > o.y + 4 && w.y - CR.y < o.y + o.h - 4
        passX = o.x + o.w
      } else if (o.k === 'pillar') {
        o.ph += dt * o.speed
        const wl = wallAt(w.cols, o.x + o.w / 2)
        const L = o.len + Math.sin(o.ph) * o.amp
        const tip = o.top ? wl.top + L : wl.bot - L
        hit = cx + CR.x > o.x + 3 && cx - CR.x < o.x + o.w - 3 && (o.top ? w.y - CR.y < tip : w.y + CR.y > tip)
        passX = o.x + o.w
      } else if (o.k === 'bat') {
        o.ph += dt
        o.x -= 60 * dt
        o.y = o.baseY + Math.sin(o.ph * 2.4) * 34
        const wl = wallAt(w.cols, o.x)
        o.y = clamp(o.y, wl.top + 14, wl.bot - 14)
        hit = Math.abs(o.x - cx) < CR.x + 8 && Math.abs(o.y - w.y) < CR.y + 6
      } else if (o.k === 'geyser') {
        const wl = wallAt(w.cols, o.x + 12)
        // Telegraph starts as soon as the vent scrolls into view
        if (o.x - (w.x - sx) < W + 20) o.tm += dt
        if (o.tm > 0.3) {
          if (o.h === 0 && playing) {
            sfx.whoosh()
            fx.burst(o.x + 12 - (w.x - sx), o.top ? wl.top : wl.bot, { count: 8, color: ['#fff7ed', '#fdba74'], speed: 220, angle: o.top ? Math.PI / 2 : -Math.PI / 2, spread: 0.6, size: 4, life: 0.5 })
          }
          o.h = Math.min(o.hMax, o.h + 900 * dt)
        }
        o.puff -= dt
        if (o.h > 0 && o.puff <= 0) {
          o.puff = 0.12
          const ex = o.x + 12 - (w.x - sx)
          if (ex > -20 && ex < W + 20) fx.burst(ex, o.top ? wl.top + o.h : wl.bot - o.h, { count: 1, color: ['#fff7ed', '#fed7aa'], speed: 50, angle: o.top ? Math.PI / 2 : -Math.PI / 2, spread: 1.2, size: 6, life: 0.5, gravity: o.top ? 40 : -40, drag: 2 })
        }
        hit = o.h > 0 && Math.abs(cx - (o.x + 12)) < CR.x + 8 && (o.top ? w.y - CR.y < wl.top + o.h - 4 : w.y + CR.y > wl.bot - o.h + 4)
        passX = o.x + 24
      } else if (o.k === 'dart' || o.k === 'orb') {
        o.x += (w.speed + o.vx) * dt
        o.y += o.vy * dt
        const wl = wallAt(w.cols, o.x)
        if (o.y < wl.top - 4 || o.y > wl.bot + 4) {
          fx.burst(o.x - (w.x - sx), o.y, { count: 6, color: o.k === 'dart' ? ['#fecaca', '#ef4444'] : ['#fda4af', '#f43f5e'], speed: 140, shape: 'spark' })
          o.x = -99999
          continue
        }
        hit = o.k === 'dart' ? Math.abs(o.x + 4 - cx) < CR.x + 10 && Math.abs(o.y - w.y) < CR.y + 3 : Math.hypot(o.x - cx, o.y - w.y) < 9 + 11
        passX = o.x + 999999
      } else {
        if (!o.falling) {
          if (o.x - cx < 170) o.shake += dt
          if (o.shake > 0.45) {
            o.falling = true
            if (playing) sfx.thud()
          }
        } else {
          o.vy += 1300 * dt
          o.y += o.vy * dt
          const wl = wallAt(w.cols, o.x)
          if (o.y + o.len > wl.bot) {
            fx.burst(o.x - (w.x - sx), wl.bot, { count: 10, color: ['#a8a29e', '#78716c'], speed: 180, angle: -Math.PI / 2, spread: 2, shape: 'square', size: 4 })
            o.x = -99999
            continue
          }
        }
        hit = Math.abs(o.x - cx) < CR.x + 6 && w.y - CR.y < o.y + o.len && w.y + CR.y > o.y + 6
      }
      if (playing && hit && w.inv <= 0 && !w.god) {
        if (crash()) return
        fx.explode(o.x - (w.x - sx), w.y, 0.7)
        o.x = -99999
        continue
      }
      // Near miss
      if (playing && passX < cx - CR.x && passX > cx - CR.x - w.speed * dt - 1 && o.k !== 'bat') {
        let gapD = 999
        if (o.k === 'rock') gapD = Math.min(Math.abs(w.y - CR.y - (o.y + o.h)), Math.abs(o.y - (w.y + CR.y)))
        else if (o.k === 'geyser' && o.h > 0) {
          const wl = wallAt(w.cols, o.x + 12)
          gapD = o.top ? w.y - CR.y - (wl.top + o.h) : wl.bot - o.h - (w.y + CR.y)
          if (gapD < 0) gapD = 999
        }
        if (gapD < 16) {
          w.stats.close += 1
          fx.text(sx, w.y - 30, 'CLOSE!', '#fde047', 15)
          sfx.score(3)
        }
      }
    }
    w.obs = w.obs.filter((o) => o.x > w.x - sx - 80)

    if (updateDrone(dt, W)) return
    if (updateBoss(dt, W)) return
    w.shield = Math.max(0, w.shield - (playing ? dt : 0))

    // Pickups
    const mag = demo ? 0 : run.level('magnet') * 14
    for (const p of w.picks) {
      if (p.got) continue
      const d = Math.hypot(p.x - cx, p.y - w.y)
      if (playing && p.k === 'gem' && d < 40 + mag * 3 && mag > 0) {
        p.x += ((cx - p.x) / d) * 300 * dt
        p.y += ((w.y - p.y) / d) * 300 * dt
      }
      if (d < (p.k === 'gem' ? 22 + mag : 28) && (playing || demo)) {
        p.got = true
        const px = p.x - (w.x - sx)
        if (demo) continue
        if (p.k === 'gem') {
          w.stats.gems += 1
          fx.burst(px, p.y, { count: 8, color: ['#67e8f9', '#fff', BIOMES[w.biome].accent], speed: 160, size: 2.5 })
          sfx.score(w.stats.gems % 8)
        } else if (p.k === 'shield') {
          w.shield = SHIELD_TIME
          fx.ring(px, p.y, { color: '#38bdf8', maxR: 60, life: 0.45, width: 4 })
          fx.burst(px, p.y, { count: 14, color: ['#e0f2fe', '#38bdf8', '#fff'], speed: 200, shape: 'spark' })
          fx.text(px, p.y - 24, 'SHIELD UP!', '#7dd3fc', 18)
          sfx.power()
          haptic.medium()
          pushHud()
        } else {
          w.fuel = 100
          w.stats.fuel += 1
          fx.ring(px, p.y, { color: '#4ade80', maxR: 50, life: 0.4, width: 4 })
          fx.text(px, p.y - 24, 'FUEL!', '#86efac', 18)
          sfx.power()
          haptic.medium()
        }
        run.update(w.stats)
      }
    }
    w.picks = w.picks.filter((p) => !p.got && p.x > w.x - sx - 40)

    // Distance & biomes
    if (playing) {
      const m = Math.floor(w.x / PX_PER_M)
      if (m >= w.nextMark) {
        w.nextMark += 100
        if (m % BIOME_M === 0) {
          w.biome = (w.biome + 1) % BIOMES.length
          w.biomeFade = 1
          w.stats.biome = Math.max(w.stats.biome, m / BIOME_M + 1)
          say(BIOMES[w.biome].name.toUpperCase(), `${m} m`)
          sfx.levelUp()
          haptic.success()
          void trackEvent('action_milestone', { game_id: 'copter', kind: 'biome', value: m / BIOME_M + 1 })
        } else {
          fx.text(W / 2, 70, `${m} m`, '#fff', 20)
          sfx.tick()
        }
        w.stats.dist = m
        run.update(w.stats)
      }
    }
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

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const hook = {
      /** Set run time (seconds); tiers catch up one per frame. */
      skip(sec: number) {
        world.current.t = sec
      },
      /** Teleport to distance m (meters) and regenerate the cave there. */
      jump(m: number) {
        const w = world.current
        const W = size.current.w
        w.x = m * PX_PER_M
        w.genX = w.x - W
        w.cols = []
        w.center = size.current.h / 2
        w.obs = []
        w.picks = []
        w.nextMark = Math.ceil(m / 100) * 100
        genTo(W + 200)
        const wl = wallAt(w.cols, w.x)
        w.y = (wl.top + wl.bot) / 2
        w.vy = 0
      },
      biome(i: number) {
        const w = world.current
        w.biome = ((i % BIOMES.length) + BIOMES.length) % BIOMES.length
        w.biomeFade = 1
        say(BIOMES[w.biome].name.toUpperCase(), 'debug')
      },
      spawn(kind: string) {
        const w = world.current
        const W = size.current.w
        const sx = W * 0.28
        if (kind === 'geyser' || kind === 'geyserTop') {
          const gx = w.x - sx + W + 30
          const wl = wallAt(w.cols, gx)
          w.obs.push({ k: 'geyser', x: gx, top: kind === 'geyserTop', tm: 0, h: 0, hMax: (wl.bot - wl.top) * 0.45, puff: 0 })
        } else if (kind === 'drone') spawnDrone(W)
        else if (kind === 'boss') startBoss(W)
        else if (kind === 'noboss') w.bossNext = 1e9
        else if (kind === 'shield') {
          const wl = wallAt(w.cols, w.x + 120)
          w.picks.push({ k: 'shield', x: w.x + 120, y: (wl.top + wl.bot) / 2, got: false })
        } else if (kind === 'fuel') w.fuel = 100
      },
      god(on: boolean) {
        world.current.god = on
      },
      state() {
        const w = world.current
        return {
          phase: phaseRef.current,
          t: Math.round(w.t * 10) / 10,
          m: Math.floor(w.x / PX_PER_M),
          biome: BIOMES[w.biome].name,
          tier: w.tier,
          boss: w.boss.st + ' ' + w.boss.mode + ' ' + Math.round(w.boss.tm),
          bossN: w.bossN,
          drone: w.drone ? w.drone.st : 'none',
          shield: Math.round(w.shield),
          armor: w.armor,
          obs: w.obs.map((o) => o.k).join(','),
        }
      },
    }
    ;(window as unknown as Record<string, unknown>).__en1_copter = hook
    return () => {
      delete (window as unknown as Record<string, unknown>).__en1_copter
    }
  }, [])

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    if (size.current.h !== H && phaseRef.current === 'idle') {
      size.current = { w: W, h: H }
      world.current = freshWorld(H)
    }
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    step(dt, W, t)
    const ph = phaseRef.current
    if (ph === 'play') {
      hudT.current -= raw
      if (hudT.current <= 0) {
        hudT.current = 0.12
        pushHud()
      }
    }
    const b = BIOMES[w.biome]
    const sx = W * 0.28
    const cam = w.x - sx

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, b.bg1)
    bg.addColorStop(0.5, b.bg2)
    bg.addColorStop(1, b.bg1)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // Far cave layer (parallax silhouettes)
    ctx.fillStyle = b.back
    ctx.globalAlpha = 0.55
    for (const top of [true, false]) {
      ctx.beginPath()
      ctx.moveTo(0, top ? 0 : H)
      for (let x = 0; x <= W + 20; x += 20) {
        const wx = (x + cam * 0.35) * 0.012
        const d = H * 0.16 + Math.sin(wx) * H * 0.07 + Math.sin(wx * 2.7 + 1) * H * 0.03
        ctx.lineTo(x, top ? d : H - d)
      }
      ctx.lineTo(W + 20, top ? 0 : H)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (b.part === 'glow' || b.part === 'bubble') drawBiomeLayer(ctx, b.part, W, H, cam, t)
    // Ambient particles
    ctx.fillStyle = b.accent
    if (b.part === 'glow') {
      // Drifting luminous spores
      for (let i = 0; i < 22; i++) {
        const px = ((i * 97 - cam * (0.3 + (i % 3) * 0.1)) % (W + 40) + W + 40) % (W + 40) - 20 + Math.sin(t * 0.9 + i) * 10
        const py = H - ((H - ((i * 71) % H) + t * (12 + (i % 4) * 6)) % H)
        ctx.globalAlpha = 0.25 + Math.abs(Math.sin(t * 2 + i * 1.3)) * 0.55
        ctx.fillStyle = i % 2 ? '#f9a8d4' : '#5eead4'
        ctx.beginPath()
        ctx.arc(px, py, 1.6 + (i % 3) * 0.7, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (b.part === 'bubble') {
      ctx.strokeStyle = '#bae6fd'
      ctx.lineWidth = 1.2
      for (let i = 0; i < 20; i++) {
        const px = ((i * 89 - cam * (0.25 + (i % 3) * 0.12)) % (W + 40) + W + 40) % (W + 40) - 20 + Math.sin(t * 2 + i) * 4
        const py = H - ((H - ((i * 67) % H) + t * (26 + (i % 5) * 9)) % H)
        const r = 1.8 + (i % 4) * 1.1
        ctx.globalAlpha = 0.45
        ctx.beginPath()
        ctx.arc(px, py, r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 0.6
        ctx.fillStyle = '#fff'
        ctx.fillRect(px - r * 0.4, py - r * 0.5, 1.2, 1.2)
      }
    }
    for (let i = 0; i < (b.part === 'glow' || b.part === 'bubble' ? 0 : 26); i++) {
      const sp = 0.25 + (i % 4) * 0.12
      let px = ((i * 113 - cam * sp) % (W + 40) + W + 40) % (W + 40) - 20
      let py = (i * 61) % H
      if (b.part === 'snow') py = (py + t * (20 + (i % 5) * 8)) % H
      else if (b.part === 'ember') py = H - ((H - py + t * (30 + (i % 5) * 10)) % H)
      else py += Math.sin(t + i) * 8
      if (b.part === 'snow') px += Math.sin(t * 1.5 + i) * 6
      ctx.globalAlpha = b.part === 'spark' ? 0.3 + Math.abs(Math.sin(t * 3 + i)) * 0.6 : 0.5
      const s = b.part === 'snow' ? 2.2 : b.part === 'ember' ? 1.8 : 1.6
      ctx.fillRect(px, py, s, s)
    }
    ctx.globalAlpha = 1
    if (b.part === 'ember') glow(ctx, W / 2, H, W * 0.8, '#f97316', 0.18)

    fx.applyShake(ctx)

    // Pickups (screen coords)
    for (const p of w.picks) {
      const px = p.x - cam
      if (px < -20 || px > W + 20) continue
      if (p.k === 'gem') {
        const by = p.y + Math.sin(t * 4 + p.x) * 2
        const s = Math.abs(Math.cos(t * 3 + p.x * 0.02)) * 0.6 + 0.4
        ctx.fillStyle = '#0e7490'
        ctx.beginPath()
        ctx.moveTo(px, by - 9)
        ctx.lineTo(px + 7 * s, by - 2)
        ctx.lineTo(px, by + 9)
        ctx.lineTo(px - 7 * s, by - 2)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#67e8f9'
        ctx.beginPath()
        ctx.moveTo(px, by - 7)
        ctx.lineTo(px + 5 * s, by - 2)
        ctx.lineTo(px, by + 2)
        ctx.lineTo(px - 5 * s, by - 2)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.fillRect(px - 1.2, by - 6, 2.4, 2.4)
      } else if (p.k === 'shield') {
        drawShieldPick(ctx, px, p.y, t)
      } else {
        glow(ctx, px, p.y, 30, '#4ade80', 0.4)
        ctx.save()
        ctx.translate(px, p.y + Math.sin(t * 3) * 3)
        ctx.rotate(Math.sin(t * 2) * 0.15)
        const g = ctx.createLinearGradient(-9, 0, 9, 0)
        g.addColorStop(0, '#15803d')
        g.addColorStop(0.45, '#4ade80')
        g.addColorStop(1, '#166534')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.roundRect(-9, -11, 18, 23, 4)
        ctx.fill()
        ctx.fillStyle = '#14532d'
        ctx.fillRect(-4, -15, 8, 5)
        ctx.fillStyle = '#f0fdf4'
        ctx.beginPath()
        ctx.moveTo(1, -6)
        ctx.lineTo(-4, 2)
        ctx.lineTo(0, 2)
        ctx.lineTo(-1, 8)
        ctx.lineTo(4, 0)
        ctx.lineTo(0, 0)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
    }

    // Obstacles
    for (const o of w.obs) {
      const ox = o.x - cam
      if (ox < -80 || ox > W + 80) continue
      if (o.k === 'rock') {
        const cx = ox + o.w / 2
        const cy = o.y + o.h / 2
        ctx.fillStyle = b.wall2
        ctx.beginPath()
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          const px = cx + Math.cos(a) * (o.w / 2 + 3) * o.verts[i]
          const py = cy + Math.sin(a) * (o.h / 2 + 3) * o.verts[i]
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = b.edge
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = b.wall1
        ctx.beginPath()
        ctx.ellipse(cx - o.w * 0.12, cy - o.h * 0.15, o.w * 0.28, o.h * 0.22, -0.4, 0, Math.PI * 2)
        ctx.fill()
        if (b.part === 'spark' || b.part === 'snow') {
          ctx.fillStyle = b.part === 'spark' ? '#f0abfc' : '#f0f9ff'
          ctx.globalAlpha = 0.7
          ctx.beginPath()
          ctx.moveTo(cx + 2, cy - o.h / 2 - 6)
          ctx.lineTo(cx + 7, cy - 2)
          ctx.lineTo(cx - 2, cy - 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      } else if (o.k === 'pillar') {
        const wl = wallAt(w.cols, o.x + o.w / 2)
        const L = o.len + Math.sin(o.ph) * o.amp
        const y0 = o.top ? wl.top - 4 : wl.bot - L
        const g = ctx.createLinearGradient(ox, 0, ox + o.w, 0)
        g.addColorStop(0, '#57534e')
        g.addColorStop(0.4, '#a8a29e')
        g.addColorStop(1, '#44403c')
        ctx.fillStyle = g
        ctx.fillRect(ox, y0, o.w, L + 4)
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        for (let yy = y0 + 8; yy < y0 + L; yy += 16) ctx.fillRect(ox, yy, o.w, 3)
        // Spiked crusher head
        const tip = o.top ? wl.top + L : wl.bot - L
        ctx.fillStyle = '#ef4444'
        ctx.fillRect(ox - 3, o.top ? tip - 8 : tip, o.w + 6, 8)
        ctx.fillStyle = '#fca5a5'
        ctx.beginPath()
        for (let i = 0; i < 3; i++) {
          const bx = ox - 3 + (i * (o.w + 6)) / 3
          const bw = (o.w + 6) / 3
          if (o.top) {
            ctx.moveTo(bx, tip)
            ctx.lineTo(bx + bw / 2, tip + 8)
            ctx.lineTo(bx + bw, tip)
          } else {
            ctx.moveTo(bx, tip)
            ctx.lineTo(bx + bw / 2, tip - 8)
            ctx.lineTo(bx + bw, tip)
          }
        }
        ctx.fill()
      } else if (o.k === 'bat') {
        drawBat(ctx, ox, o.y, o.ph)
      } else if (o.k === 'geyser' || o.k === 'dart' || o.k === 'orb') {
        // drawn on top of the walls below
      } else {
        const shake = !o.falling && o.shake > 0 ? Math.sin(t * 80) * 2 : 0
        ctx.fillStyle = b.wall1
        ctx.beginPath()
        ctx.moveTo(ox - 10 + shake, o.y)
        ctx.lineTo(ox + shake, o.y + o.len)
        ctx.lineTo(ox + 10 + shake, o.y)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = o.shake > 0 ? '#ef4444' : b.edge
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    // Cave walls
    const cols = w.cols
    const wallG = ctx.createLinearGradient(0, 0, 0, H)
    wallG.addColorStop(0, b.wall2)
    wallG.addColorStop(0.5, b.wall1)
    wallG.addColorStop(1, b.wall2)
    for (const top of [true, false]) {
      ctx.fillStyle = wallG
      ctx.beginPath()
      ctx.moveTo(-10, top ? -10 : H + 10)
      for (const c of cols) ctx.lineTo(c.x - cam, top ? c.top : c.bot)
      ctx.lineTo(W + 10, top ? -10 : H + 10)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = b.edge
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i]
        if (i === 0) ctx.moveTo(c.x - cam, top ? c.top : c.bot)
        else ctx.lineTo(c.x - cam, top ? c.top : c.bot)
      }
      ctx.stroke()
    }
    // Edge decorations: stalactites / crystals / lava drips
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i]
      const idx = Math.round(c.x / COL)
      if (idx % 7 !== 0) continue
      const x = c.x - cam
      const s = 5 + (idx % 3) * 2
      if (b.part === 'spark') {
        ctx.fillStyle = idx % 2 ? '#e879f9' : '#a78bfa'
        ctx.beginPath()
        ctx.moveTo(x - 4, c.bot + 2)
        ctx.lineTo(x, c.bot - s * 1.4)
        ctx.lineTo(x + 4, c.bot + 2)
        ctx.fill()
      } else {
        ctx.fillStyle = b.part === 'ember' && idx % 2 ? '#f97316' : b.wall1
        ctx.beginPath()
        ctx.moveTo(x - 4, c.top - 2)
        ctx.lineTo(x, c.top + s)
        ctx.lineTo(x + 4, c.top - 2)
        ctx.fill()
      }
      if (b.part === 'glow' && idx % 14 === 0) {
        // Tiny glowing mushrooms on the floor
        const pink = idx % 28 === 0
        ctx.fillStyle = '#c4b5fd'
        ctx.fillRect(x - 1.5, c.bot - 8, 3, 9)
        ctx.fillStyle = pink ? '#f472b6' : '#2dd4bf'
        ctx.beginPath()
        ctx.ellipse(x, c.bot - 8, 7, 5, 0, Math.PI, 0)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.globalAlpha = 0.6 + Math.sin(t * 3 + idx) * 0.3
        ctx.fillRect(x - 3, c.bot - 11, 2, 2)
        ctx.globalAlpha = 1
      } else if (b.part === 'bubble' && idx % 14 === 7) {
        // Swaying kelp
        ctx.strokeStyle = idx % 28 === 7 ? '#22c55e' : '#15803d'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x, c.bot + 2)
        const sw = Math.sin(t * 1.8 + idx) * 6
        ctx.quadraticCurveTo(x + sw, c.bot - 14, x - sw * 0.5, c.bot - 26 - (idx % 3) * 5)
        ctx.stroke()
      }
    }

    // Geysers and projectiles (over the walls)
    for (const o of w.obs) {
      const ox = o.x - cam
      if (ox < -60 || ox > W + 60) continue
      if (o.k === 'geyser') {
        const wl = wallAt(w.cols, o.x + 12)
        drawGeyser(ctx, ox, o.top ? wl.top : wl.bot, o.top, o.h, o.hMax, clamp(o.tm / 0.3, 0, 1), t)
      } else if (o.k === 'dart') drawDart(ctx, ox, o.y)
      else if (o.k === 'orb') drawOrb(ctx, ox, o.y, t)
    }

    // Drone + its laser sight
    const dr = w.drone
    if (dr) {
      if (dr.st === 'aim') {
        const locked = dr.tm >= 0.4
        ctx.save()
        ctx.strokeStyle = locked ? '#f87171' : '#fca5a5'
        ctx.globalAlpha = locked ? 0.65 + Math.sin(t * 30) * 0.3 : 0.7
        ctx.lineWidth = locked ? 3 : 2
        if (!locked) ctx.setLineDash([8, 6])
        ctx.beginPath()
        ctx.moveTo(dr.x - 34, dr.aimY)
        ctx.lineTo(0, dr.aimY)
        ctx.stroke()
        ctx.restore()
        // Reticle around the copter's x
        ctx.strokeStyle = locked ? '#ef4444' : 'rgba(248,113,113,0.7)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(sx, dr.aimY, 14, 0, Math.PI * 2)
        ctx.moveTo(sx - 20, dr.aimY)
        ctx.lineTo(sx - 9, dr.aimY)
        ctx.moveTo(sx + 9, dr.aimY)
        ctx.lineTo(sx + 20, dr.aimY)
        ctx.stroke()
      }
      drawDrone(ctx, dr.x, dr.y, t, dr.st === 'aim' ? clamp(dr.tm / 1, 0, 1) : 0)
    }

    // Sentinel boss: telegraphed beam band, then the beam
    const bs = w.boss
    if (bs.st !== 'off') {
      if (bs.mode === 'beam') {
        const top = bs.bandY - bs.bandH
        if (bs.warn > 0) {
          const k = 1 - bs.warn / 1.15
          ctx.fillStyle = '#ef4444'
          ctx.globalAlpha = 0.1 + k * 0.15 + (Math.sin(t * 24) > 0 ? 0.06 : 0)
          ctx.fillRect(0, top, bs.x, bs.bandH * 2)
          ctx.globalAlpha = 0.8
          ctx.save()
          ctx.strokeStyle = '#f87171'
          ctx.lineWidth = 2
          ctx.setLineDash([10, 7])
          ctx.lineDashOffset = -t * 60
          ctx.beginPath()
          ctx.moveTo(0, top)
          ctx.lineTo(bs.x, top)
          ctx.moveTo(0, top + bs.bandH * 2)
          ctx.lineTo(bs.x, top + bs.bandH * 2)
          ctx.stroke()
          ctx.restore()
          ctx.globalAlpha = 1
          // Warning chevrons on the left edge
          ctx.fillStyle = '#fecaca'
          for (let i = 0; i < 2; i++) {
            const cxv = 14 + i * 12 + ((t * 40) % 12)
            ctx.beginPath()
            ctx.moveTo(cxv, bs.bandY - 7)
            ctx.lineTo(cxv - 7, bs.bandY)
            ctx.lineTo(cxv, bs.bandY + 7)
            ctx.lineTo(cxv + 3, bs.bandY + 7)
            ctx.lineTo(cxv - 4, bs.bandY)
            ctx.lineTo(cxv + 3, bs.bandY - 7)
            ctx.fill()
          }
        } else if (bs.fire > 0) {
          const g = ctx.createLinearGradient(0, top, 0, top + bs.bandH * 2)
          g.addColorStop(0, 'rgba(239,68,68,0)')
          g.addColorStop(0.25, '#ef4444')
          g.addColorStop(0.5, '#fff1f2')
          g.addColorStop(0.75, '#ef4444')
          g.addColorStop(1, 'rgba(239,68,68,0)')
          ctx.fillStyle = g
          ctx.globalAlpha = 0.6 + Math.sin(t * 50) * 0.3
          ctx.fillRect(0, top, bs.x - 20, bs.bandH * 2)
          ctx.globalAlpha = 1
        }
      }
      const charge = bs.mode === 'beam' ? (bs.warn > 0 ? clamp(1 - bs.warn / 1.15, 0, 1) : 1) : bs.mode === 'orbs' ? clamp(1 - bs.warn / 0.65, 0, 1) : 0
      const heat = bs.st === 'fight' ? clamp(bs.tm / BOSS_FIGHT, 0, 1) : bs.st === 'out' ? 1 : 0
      ctx.save()
      if (bs.st === 'out') {
        ctx.translate(bs.x, bs.y)
        ctx.rotate(bs.tm * 1.5)
        ctx.translate(-bs.x, -bs.y)
      }
      drawSentinel(ctx, bs.x, bs.y, t, Math.atan2(w.y - bs.y, sx - bs.x), charge, heat)
      ctx.restore()
    }

    // Copter
    const blink = w.inv > 0 && Math.sin(t * 40) > 0.3
    ctx.save()
    ctx.translate(sx, w.y)
    ctx.rotate(w.tilt)
    ctx.globalAlpha = blink ? 0.4 : 1
    if (ph !== 'over' || w.speed > 5) drawCopter(ctx, t, (holdRef.current && ph === 'play') || (ph === 'idle' && w.vy < 0))
    ctx.restore()
    ctx.globalAlpha = 1
    if (w.armor > 0 && ph === 'play') {
      ctx.strokeStyle = 'rgba(125,211,252,0.45)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(sx, w.y - 2, 34, 22, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (w.shield > 0 && ph === 'play' && (w.shield > 2.5 || Math.sin(t * 20) > 0)) {
      glow(ctx, sx, w.y - 2, 46, '#38bdf8', 0.25)
      ctx.strokeStyle = 'rgba(186,230,253,0.85)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.ellipse(sx, w.y - 3, 40, 28, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.beginPath()
      ctx.ellipse(sx, w.y - 3, 34, 22, 0, Math.PI * 1.1 + t, Math.PI * 1.5 + t)
      ctx.stroke()
    }

    fx.draw(ctx)
    ctx.restore()
    if (w.biomeFade > 0) {
      ctx.globalAlpha = w.biomeFade * 0.4
      ctx.fillStyle = b.accent
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }
    if (bs.st === 'in' || bs.st === 'fight') {
      // Overheat meter: survive until it fills
      const bw = Math.min(200, W * 0.5)
      const bx = (W - bw) / 2
      const by = 100
      const k = bs.st === 'fight' ? clamp(bs.tm / BOSS_FIGHT, 0, 1) : 0
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.beginPath()
      ctx.roundRect(bx - 2, by - 2, bw + 4, 12, 6)
      ctx.fill()
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0)
      g.addColorStop(0, '#facc15')
      g.addColorStop(1, '#ef4444')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.roundRect(bx, by, Math.max(4, bw * k), 8, 4)
      ctx.fill()
      ctx.fillStyle = '#fecaca'
      ctx.font = '800 11px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('SENTINEL OVERHEAT', W / 2, by - 6)
      ctx.textAlign = 'left'
      if (bs.st === 'in' && Math.sin(t * 12) > 0) {
        ctx.strokeStyle = 'rgba(239,68,68,0.5)'
        ctx.lineWidth = 6
        ctx.strokeRect(3, 3, W - 6, H - 6)
      }
    }
    if (ph === 'play' && w.fuel < 25 && Math.sin(t * 10) > 0) {
      ctx.strokeStyle = 'rgba(239,68,68,0.5)'
      ctx.lineWidth = 6
      ctx.strokeRect(3, 3, W - 6, H - 6)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const fuelCol = hud.fuel < 25 ? '#ef4444' : hud.fuel < 50 ? '#facc15' : '#4ade80'
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.dist} m</div>
                <div className="action-hud__small" style={{ color: '#a5f3fc' }}>◆ {hud.gems}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">Fuel</span>
                <div style={{ width: 84, height: 10, borderRadius: 6, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.4)', overflow: 'hidden' }}>
                  <div style={{ width: `${hud.fuel}%`, height: '100%', background: fuelCol, transition: 'width 0.12s linear' }} />
                </div>
                {hud.armor > 0 ? <span className="action-hud__small" style={{ color: '#7dd3fc' }}>Armor ×{hud.armor}</span> : null}
                {hud.shield > 0 ? <span className="action-hud__small" style={{ color: '#38bdf8' }}>Shield {hud.shield}s</span> : null}
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
              game="copter"
              icon={meta.icon}
              title={meta.title}
              hint="Hold to rise, release to dip. Thread the twisting cave, grab fuel before the tank runs dry and collect gems."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.dist >= 1200 ? 'Cave legend!' : hud.dist >= 600 ? 'Deep explorer!' : 'Crashed!'}
            subtitle={`${hud.dist} m · ${hud.gems} gems`}
            celebrate={hud.dist >= 600}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
