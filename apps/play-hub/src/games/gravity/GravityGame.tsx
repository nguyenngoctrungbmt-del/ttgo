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
  drawAmbient,
  drawBeam,
  drawCheckpoint,
  drawCrusher,
  drawCrystalBg,
  drawPhaseCore,
  drawRocket,
  drawRocketWarn,
  drawSentinel,
  drawStormBg,
  type Amb,
  type BgKind,
} from './art'

const meta = getGame('gravity')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Surf = 1 | -1 // 1 = floor, -1 = ceiling
type Seg = { x0: number; x1: number }
type Haz =
  | { k: 'spike'; x: number; w: number; s: Surf; passed: boolean }
  | { k: 'saw'; x: number; r: number; s: Surf; passed: boolean }
  | { k: 'msaw'; x: number; r: number; ph: number; passed: boolean }
  | { k: 'drone'; x: number; ph: number; amp: number; passed: boolean }
  | { k: 'gate'; x: number; ph: number; passed: boolean }
  | { k: 'gap'; x: number; w: number; s: Surf; passed: boolean }
  | { k: 'crusher'; x: number; s: Surf; ph: number; slam: boolean; passed: boolean }
type Orb = { x: number; y: number; got: boolean }
type Rocket = { trig: number; st: 0 | 1 | 2; s: Surf; x: number; tm: number; dur: number; passed: boolean }
type Boss = { n: number; total: number; enter: number; aim: Surf; ch: number; charge: number; fire: number; next: number; hit: number }
type Zone = { name: string; bg: BgKind; top: string; bot: string; wall: string; wall2: string; line: string; accent: string }

// Crystal Caves (1000 m) and Storm Reactor (2000 m) are the long-run biomes
const ZONES: Zone[] = [
  { name: 'Neon Tunnel', bg: 'chev', top: '#140a2e', bot: '#2a1458', wall: '#2e1a5c', wall2: '#1a0f38', line: '#a78bfa', accent: '#c4b5fd' },
  { name: 'Toxic Lab', bg: 'chev', top: '#06201a', bot: '#0d3b2c', wall: '#134e3a', wall2: '#0a2a1f', line: '#4ade80', accent: '#bbf7d0' },
  { name: 'Crystal Caves', bg: 'crystal', top: '#12061c', bot: '#2e0f3c', wall: '#3b1450', wall2: '#1c0828', line: '#f472b6', accent: '#fbcfe8' },
  { name: 'Deep Void', bg: 'chev', top: '#020617', bot: '#0f172a', wall: '#1e293b', wall2: '#0b1222', line: '#38bdf8', accent: '#bae6fd' },
  { name: 'Storm Reactor', bg: 'storm', top: '#0c0806', bot: '#2a1a12', wall: '#3a2416', wall2: '#1a0f08', line: '#fb923c', accent: '#fed7aa' },
  { name: 'Sunset Rails', bg: 'chev', top: '#2a0e1e', bot: '#5a1e2c', wall: '#5c2433', wall2: '#33121c', line: '#fb7185', accent: '#fecdd3' },
  { name: 'Golden Core', bg: 'chev', top: '#1f1404', bot: '#3d2a08', wall: '#4a3510', wall2: '#2a1d06', line: '#facc15', accent: '#fef08a' },
]

const TIERS = [
  { t: 0, id: 'start', label: '', sub: '' },
  { t: 20, id: 'gap', label: 'MIND THE GAPS', sub: 'new hazard' },
  { t: 42, id: 'saw', label: 'SAW BLADES', sub: 'new hazard' },
  { t: 66, id: 'drone', label: 'DRONES', sub: 'new hazard' },
  { t: 92, id: 'gate', label: 'LASER GATES', sub: 'new hazard' },
  { t: 108, id: 'crusher', label: 'CRUSHERS', sub: 'red zone = slam incoming' },
  { t: 122, id: 'msaw', label: 'ROLLING SAWS', sub: 'new hazard' },
  { t: 155, id: 'over', label: 'OVERDRIVE', sub: 'max speed' },
  { t: 175, id: 'rocket', label: 'ROCKETS', sub: 'switch lanes on the warning' },
]
const TIX: Record<string, number> = Object.fromEntries(TIERS.map((x, i) => [x.id, i]))

const PX_PER_M = 20
const G = 3200
const PR = 11
const ZONE_M = 500
const BOSS_FIRST = 84
const BOSS_EVERY = 120
const CRUSH_W = 22

type World = {
  t: number
  x: number
  y: number
  vy: number
  g: Surf
  grounded: boolean
  coyote: number
  buffer: number
  rot: number
  squash: number
  runPh: number
  speed: number
  floor: Seg[]
  ceil: Seg[]
  haz: Haz[]
  orbs: Orb[]
  genX: number
  tier: number
  zone: number
  zoneFade: number
  nextMark: number
  shield: number
  inv: number
  combo: number
  comboT: number
  flipFrom: Surf
  flipT: number
  trail: { x: number; y: number }[]
  demoT: number
  deadVx: number
  grace: number
  rockets: Rocket[]
  boss: Boss | null
  nextBoss: number
  bossN: number
  phase: number
  pows: Orb[]
  powCd: number
  amb: Amb[]
  bolt: number
  boltX: number
  boltSeed: number
  boltCd: number
  god: boolean
  stats: { dist: number; orbs: number; flips: number; near: number; combo: number }
}

function freshWorld(): World {
  return {
    t: 0,
    x: 0,
    y: 0,
    vy: 0,
    g: 1,
    grounded: true,
    coyote: 0,
    buffer: 0,
    rot: 0,
    squash: 0,
    runPh: 0,
    speed: 240,
    floor: [{ x0: -600, x1: 900 }],
    ceil: [{ x0: -600, x1: 900 }],
    haz: [],
    orbs: [],
    genX: 900,
    tier: 0,
    zone: 0,
    zoneFade: 0,
    nextMark: 100,
    shield: 0,
    inv: 0,
    combo: 0,
    comboT: 0,
    flipFrom: 1,
    flipT: 99,
    trail: [],
    demoT: 1,
    deadVx: 0,
    grace: 4,
    rockets: [],
    boss: null,
    nextBoss: BOSS_FIRST,
    bossN: 0,
    phase: 0,
    pows: [],
    powCd: 0,
    amb: [],
    bolt: 0,
    boltX: 0,
    boltSeed: 0,
    boltCd: 2,
    god: false,
    stats: { dist: 0, orbs: 0, flips: 0, near: 0, combo: 0 },
  }
}

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k
}

function addSeg(list: Seg[], x0: number, x1: number) {
  const last = list[list.length - 1]
  if (last && x0 <= last.x1 + 0.5) last.x1 = Math.max(last.x1, x1)
  else list.push({ x0, x1 })
}

function surfAt(list: Seg[], x0: number, x1: number) {
  for (const s of list) if (s.x1 > x0 && s.x0 < x1) return true
  return false
}

// Crusher cycle (1.8 s): rest → blinking warning → slam → hold → retract
function crushCycle(t: number, ph: number) {
  const k = (t * 0.55 + ph) % 1
  if (k < 0.5) return { e: 0, warn: 0 }
  if (k < 0.72) return { e: ((k - 0.5) / 0.22) * 0.06, warn: 1 }
  if (k < 0.78) return { e: 0.06 + ((k - 0.72) / 0.06) * 0.94, warn: 0 }
  if (k < 0.92) return { e: 1, warn: 0 }
  return { e: 1 - (k - 0.92) / 0.08, warn: 0 }
}

// ── Art ────────────────────────────────────────────────────

function drawBot(ctx: CanvasRenderingContext2D, t: number, runPh: number, grounded: boolean, accent: string) {
  // Legs
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  const sw = grounded ? Math.sin(runPh) * 6 : 3
  ctx.beginPath()
  ctx.moveTo(-4, 8)
  ctx.lineTo(-4 + sw, 15)
  ctx.moveTo(4, 8)
  ctx.lineTo(4 - sw, 15)
  ctx.stroke()
  ctx.fillStyle = '#1e293b'
  ctx.beginPath()
  ctx.ellipse(-4 + sw + 1, 15.5, 3.5, 2, 0, 0, Math.PI * 2)
  ctx.ellipse(4 - sw + 1, 15.5, 3.5, 2, 0, 0, Math.PI * 2)
  ctx.fill()
  // Antenna
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, -12)
  ctx.quadraticCurveTo(-3, -18, -6 - Math.sin(t * 10) * 1.5, -21)
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(-6 - Math.sin(t * 10) * 1.5, -21, 3, 0, Math.PI * 2)
  ctx.fill()
  // Body
  const g = ctx.createLinearGradient(-12, -13, 12, 10)
  g.addColorStop(0, '#ffffff')
  g.addColorStop(1, '#c7d2fe')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.roundRect(-12, -13, 24, 22, 9)
  ctx.fill()
  ctx.strokeStyle = '#4338ca'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Visor
  ctx.fillStyle = '#1e1b4b'
  ctx.beginPath()
  ctx.roundRect(-8, -8, 18, 9, 4.5)
  ctx.fill()
  const blink = Math.sin(t * 2.3) > 0.97
  ctx.fillStyle = accent
  if (blink) {
    ctx.fillRect(-4, -4, 4, 1.5)
    ctx.fillRect(3, -4, 4, 1.5)
  } else {
    ctx.beginPath()
    ctx.arc(-2, -3.5, 2.2, 0, Math.PI * 2)
    ctx.arc(5, -3.5, 2.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.fillRect(-6, -7, 5, 1.5)
  // Belly light
  ctx.fillStyle = accent
  ctx.globalAlpha = 0.6 + Math.sin(t * 6) * 0.3
  ctx.fillRect(-2, 3, 4, 3)
  ctx.globalAlpha = 1
}

function drawSaw(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(t * 12)
  ctx.fillStyle = '#cbd5e1'
  ctx.beginPath()
  const n = 12
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2
    const rr = i % 2 ? r * 0.78 : r
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.stroke()
  const g = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 1, 0, 0, r * 0.7)
  g.addColorStop(0, '#f8fafc')
  g.addColorStop(1, '#64748b')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#7f1d1d'
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(15,23,42,0.4)'
  ctx.lineWidth = 2
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25)
    ctx.lineTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55)
    ctx.stroke()
  }
  ctx.restore()
}

function drawDrone(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = 'rgba(226,232,240,0.35)'
  for (const s of [-1, 1]) {
    ctx.beginPath()
    ctx.ellipse(s * 15, -10, 9 * Math.abs(Math.cos(t * 40 + s)), 2, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-15, -9)
  ctx.lineTo(15, -9)
  ctx.stroke()
  ctx.fillStyle = '#1f2937'
  ctx.beginPath()
  ctx.ellipse(0, 0, 14, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = '#ef4444'
  ctx.beginPath()
  ctx.arc(-3, 1, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fee2e2'
  ctx.beginPath()
  ctx.arc(-4.5, -0.5, 1.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export default function GravityGame() {
  const run = useActionRun('gravity')
  const best = useProgressStore((s) => s.games.gravity?.bestScore ?? 0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const bestRef = useRef(best)
  bestRef.current = best
  const hudT = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ dist: 0, orbs: 0, combo: 0, shield: 0, phase: 0 })
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
    setHud({ dist: Math.floor(w.x / PX_PER_M), orbs: w.stats.orbs, combo: w.combo, shield: w.shield, phase: Math.ceil(w.phase) })
  }
  function geo() {
    const H = size.current.h
    return { ceilY: Math.round(H * 0.24), floorY: Math.round(H * 0.76) }
  }
  function surfY(s: Surf) {
    const { ceilY, floorY } = geo()
    return s === 1 ? floorY : ceilY
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.y = surfY(1) - 16
    w.shield = run.level('shield')
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    say(ZONES[0].name.toUpperCase(), 'tap to flip')
    sfx.ready()
    pushHud()
  }

  function finishRun() {
    const w = world.current
    setPhaseBoth('over')
    const m = Math.floor(w.x / PX_PER_M)
    const coins = Math.round(w.stats.orbs / 4 + m / 60)
    run.end({ score: m, cleared: m >= 500, stats: { ...w.stats, dist: m }, coins }, revive)
  }

  function hurt(): boolean {
    const w = world.current
    if (phaseRef.current !== 'play' || w.inv > 0 || w.phase > 0) return false
    if (w.god) {
      w.inv = 0.5
      fx.flash('#ffffff', 0.1)
      return false
    }
    const px = size.current.w * 0.25
    // Opening grace: early hits just bump you
    if (w.t < 20 && w.grace > 0) {
      w.grace -= 1
      w.inv = 1.4
      fx.flash('#ffffff', 0.18)
      fx.burst(px, w.y, { count: 14, color: ['#fff', '#fde047'], speed: 220, shape: 'spark' })
      fx.text(px, w.y - 30, 'OOPS! TRY AGAIN', '#fde047', 16)
      fx.shake(5, 0.2)
      sfx.miss()
      haptic.medium()
      return false
    }
    if (w.shield > 0) {
      w.shield -= 1
      w.inv = 1.4
      fx.burst(px, w.y, { count: 24, color: ['#7dd3fc', '#e0f2fe', '#fff'], speed: 300, shape: 'spark' })
      fx.ring(px, w.y, { color: '#7dd3fc', maxR: 60, life: 0.45, width: 4 })
      fx.text(px, w.y - 30, 'SHIELD!', '#7dd3fc', 20)
      fx.stop(0.08)
      fx.shake(8, 0.3)
      sfx.clang()
      haptic.heavy()
      pushHud()
      return false
    }
    setPhaseBoth('dying')
    w.vy = -w.g * 500
    w.deadVx = 0
    fx.burst(px, w.y, { count: 26, color: ['#c7d2fe', '#ffffff', ZONES[w.zone].line], speed: 340, shape: 'square', size: 5, gravity: 500, life: 0.9 })
    fx.ring(px, w.y, { color: '#ef4444', maxR: 70, life: 0.45, width: 5 })
    fx.flash('#ef4444', 0.3)
    fx.stop(0.12)
    fx.shake(13, 0.4)
    fx.slowmo(0.7, 0.35)
    sfx.hurt()
    sfx.lose()
    haptic.error()
    run.update({ ...w.stats, dist: Math.floor(w.x / PX_PER_M) })
    window.setTimeout(finishRun, 1200)
    return true
  }

  function revive() {
    const w = world.current
    const W = size.current.w
    w.haz = w.haz.filter((h) => h.x > w.x + W * 0.9 || h.x < w.x - W)
    addSeg(w.floor, w.x - 100, w.x + W)
    addSeg(w.ceil, w.x - 100, w.x + W)
    w.floor.sort((a, b) => a.x0 - b.x0)
    w.ceil.sort((a, b) => a.x0 - b.x0)
    w.g = 1
    w.y = surfY(1) - 16
    w.vy = 0
    w.rot = 0
    w.grounded = true
    w.inv = 2.2
    w.combo = 0
    w.speed = Math.max(240, w.speed * 0.85)
    w.rockets = []
    w.pows = w.pows.filter((p) => p.x > w.x + W * 0.5)
    if (w.boss) {
      w.boss.ch = -1
      w.boss.fire = 0
      w.boss.next = 2.4
    }
    fx.ring(W * 0.25, w.y, { color: '#7dd3fc', maxR: 90, life: 0.6 })
    say('REVIVED!', 'tap to flip')
    setPhaseBoth('play')
    pushHud()
  }

  function flip(demo = false) {
    const w = world.current
    if (!demo && phaseRef.current !== 'play') return
    if (!(w.grounded || w.coyote > 0)) {
      w.buffer = 0.14
      return
    }
    w.flipFrom = w.g
    w.flipT = 0
    w.g = w.g === 1 ? -1 : 1
    w.grounded = false
    w.coyote = 0
    w.buffer = 0
    w.vy = w.g * 140
    if (demo) return
    w.stats.flips += 1
    const px = size.current.w * 0.25
    fx.burst(px, w.y, { count: 8, color: [ZONES[w.zone].line, '#fff'], speed: 160, angle: w.g === 1 ? -Math.PI / 2 : Math.PI / 2, spread: 1.6, size: 2.5, life: 0.35 })
    sfx.flip()
    sfx.whoosh()
    haptic.light()
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    flip()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'w') {
        e.preventDefault()
        if (!e.repeat) flip()
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  function nearMiss(px: number) {
    const w = world.current
    w.combo += 1
    w.comboT = 3.2
    w.stats.near += 1
    w.stats.combo = Math.max(w.stats.combo, w.combo)
    const bonus = 2 * w.combo
    w.stats.orbs += bonus
    fx.text(px + 20, w.y + (w.g === 1 ? -34 : 34), w.combo > 1 ? `NEAR MISS x${w.combo}` : 'NEAR MISS', '#fde047', 15 + Math.min(8, w.combo))
    sfx.score(w.combo)
    if (w.combo % 5 === 0) {
      sfx.combo()
      haptic.success()
      say(`COMBO x${w.combo}!`)
    }
    run.update(w.stats)
    pushHud()
  }

  // Phase shift: hazards shatter on contact
  function smash(x: number, y: number) {
    const w = world.current
    w.stats.orbs += 1
    fx.burst(x, y, { count: 16, color: ['#c4b5fd', '#67e8f9', '#fff'], speed: 260, shape: 'square', size: 3.5, life: 0.5, gravity: 300 })
    fx.ring(x, y, { color: '#a78bfa', maxR: 40, life: 0.3, width: 3 })
    fx.text(x, y - 26, 'SMASH +1', '#c4b5fd', 15)
    fx.stop(0.03)
    fx.shake(4, 0.12)
    sfx.hit()
    haptic.light()
  }

  function startBoss() {
    const w = world.current
    const n = w.bossN
    w.boss = { n: 6 + Math.min(4, n * 2), total: 6 + Math.min(4, n * 2), enter: 0, aim: 1, ch: -1, charge: Math.max(0.72, 0.95 - n * 0.08), fire: 0, next: 1.2, hit: 0 }
    say('SENTINEL INCOMING', 'flip away from the red lane')
    sfx.boom(0.5)
    sfx.power()
    window.setTimeout(() => sfx.clang(), 180)
    window.setTimeout(() => sfx.levelUp(), 420)
    fx.shake(8, 0.4)
    fx.flash('#ef4444', 0.15)
    haptic.heavy()
  }

  function bossDown(bx: number, by: number) {
    const w = world.current
    w.boss = null
    w.bossN += 1
    w.nextBoss = w.t + BOSS_EVERY
    const reward = 20 + w.bossN * 5
    w.stats.orbs += reward
    const gotShield = w.shield < 3
    if (gotShield) w.shield += 1
    fx.explode(bx, by, 1.4, ['#fde047', '#f87171', '#ffffff', '#94a3b8'])
    fx.burst(bx, by, { count: 30, color: ['#67e8f9', '#a5f3fc', '#fff'], speed: 380, size: 3, life: 0.9 })
    fx.ring(bx, by, { color: '#fde047', maxR: 140, life: 0.6, width: 6 })
    fx.text(bx - 40, by - 50, `+${reward} ORBS`, '#67e8f9', 22)
    fx.stop(0.12)
    fx.shake(16, 0.5)
    fx.slowmo(0.6, 0.4)
    fx.flash('#ffffff', 0.2)
    say('SENTINEL DOWN!', `+${reward} orbs${gotShield ? ' · +1 shield' : ''}`)
    sfx.boom(1)
    window.setTimeout(() => sfx.win(), 300)
    haptic.success()
    run.update(w.stats)
    pushHud()
    void trackEvent('action_milestone', { game_id: 'gravity', kind: 'boss', value: w.bossN })
  }

  function setZone(i: number, sub: string) {
    const w = world.current
    w.zone = ((i % ZONES.length) + ZONES.length) % ZONES.length
    w.zoneFade = 1
    w.amb = []
    say(ZONES[w.zone].name.toUpperCase(), sub)
    sfx.levelUp()
    haptic.success()
  }

  // DEV-only hook for automated screenshots / tests
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const insertHaz = (h: Haz) => {
      const w = world.current
      const i = w.haz.findIndex((o) => o.x > h.x)
      if (i < 0) w.haz.push(h)
      else w.haz.splice(i, 0, h)
    }
    const hook = {
      skip(sec: number) {
        world.current.t += sec
        return world.current.t
      },
      jump(m: number) {
        const w = world.current
        const W = size.current.w
        w.x = m * PX_PER_M
        w.genX = w.x + W
        w.floor = [{ x0: w.x - 600, x1: w.genX }]
        w.ceil = [{ x0: w.x - 600, x1: w.genX }]
        w.haz = []
        w.orbs = []
        w.rockets = []
        w.nextMark = Math.floor(m / 100) * 100 + 100
        return m
      },
      biome(i: number) {
        setZone(i, 'debug')
        return ZONES[world.current.zone].name
      },
      bolt() {
        world.current.boltCd = 0
      },
      clear() {
        const w = world.current
        w.haz = []
        w.rockets = []
      },
      spawn(kind: string) {
        const w = world.current
        const W = size.current.w
        if (kind === 'crusher' || kind === 'crusherTop') insertHaz({ k: 'crusher', x: w.x + W * 0.75, s: kind === 'crusher' ? 1 : -1, ph: 0.33 - ((w.t * 0.55) % 1) + 1, slam: false, passed: false })
        else if (kind === 'rocket') w.rockets.push({ trig: w.x + W * 0.75, st: 0, s: 1, x: 0, tm: 0, dur: 1.1, passed: false })
        else if (kind === 'boss') startBoss()
        else if (kind === 'phase') w.pows.push({ x: w.x + W * 0.35, y: w.y, got: false })
        else if (kind === 'saw') insertHaz({ k: 'saw', x: w.x + W * 0.6, r: 26, s: 1, passed: false })
        return kind
      },
      god(on: boolean) {
        world.current.god = on
        return on
      },
      state() {
        const w = world.current
        return {
          phase: phaseRef.current,
          t: Math.round(w.t),
          m: Math.floor(w.x / PX_PER_M),
          zone: ZONES[w.zone].name,
          tier: TIERS[w.tier].id,
          boss: w.boss ? { n: w.boss.n, enter: w.boss.enter } : null,
          nextBoss: Math.round(w.nextBoss),
          haz: w.haz.map((h) => h.k).join(','),
          rockets: w.rockets.length,
          phaseT: w.phase,
          shield: w.shield,
          orbs: w.stats.orbs,
        }
      },
    }
    ;(window as unknown as Record<string, unknown>).__en1_gravity = hook
    return () => {
      delete (window as unknown as Record<string, unknown>).__en1_gravity
    }
  }, [])

  function genChunk(demo: boolean) {
    const w = world.current
    const { ceilY, floorY } = geo()
    const mid = (ceilY + floorY) / 2
    const x0 = w.genX
    const diff = clamp(w.t / 220, 0, 1)
    let len = 0
    const gaps: { s: Surf; a: number; b: number }[] = []
    const rs = (): Surf => (Math.random() < 0.5 ? 1 : -1)
    const calm = !!w.boss || w.t >= w.nextBoss - 1.8
    if (demo) {
      len = 260
      for (let i = 0; i < 5; i++) w.orbs.push({ x: x0 + 60 + i * 30, y: mid + Math.sin(i) * 40, got: false })
    } else if (calm) {
      // Clear runway while the Sentinel fights
      len = 320
      if (Math.random() < 0.6) {
        const ay = Math.random() < 0.5 ? floorY - 16 : ceilY + 16
        for (let i = 0; i < 4; i++) w.orbs.push({ x: x0 + 80 + i * 24, y: ay, got: false })
      }
    } else {
      const pool: string[] = ['spike', 'spike', 'spike2']
      if (w.tier >= TIX.gap) pool.push('gap', 'gap')
      if (w.tier >= TIX.saw) pool.push('saw', 'saw')
      if (w.tier >= TIX.drone) pool.push('drone')
      if (w.tier >= TIX.gate) pool.push('gate')
      if (w.tier >= TIX.crusher) pool.push('crusher')
      if (w.tier >= TIX.msaw) pool.push('msaw')
      if (w.tier >= TIX.rocket) pool.push('rocket')
      const kind = pool[Math.floor(Math.random() * pool.length)]
      if (kind === 'spike') {
        const s = rs()
        const n = w.t < 20 ? 1 : 1 + Math.floor(Math.random() * Math.min(4, 2 + w.tier))
        w.haz.push({ k: 'spike', x: x0, w: n * 24, s, passed: false })
        len = n * 24
      } else if (kind === 'spike2') {
        const s = rs()
        const n = 2 + Math.floor(Math.random() * 2)
        const off = lerp(240, 160, diff)
        w.haz.push({ k: 'spike', x: x0, w: n * 24, s, passed: false })
        w.haz.push({ k: 'spike', x: x0 + off, w: n * 24, s: (s * -1) as Surf, passed: false })
        for (let i = 0; i < 3; i++) w.orbs.push({ x: x0 + off / 2 + i * 22, y: mid + (i - 1) * 30 * s, got: false })
        len = off + n * 24
      } else if (kind === 'gap') {
        const s = rs()
        const gw = rand(90, 130 + diff * 60)
        gaps.push({ s, a: x0, b: x0 + gw })
        w.haz.push({ k: 'gap', x: x0, w: gw, s, passed: false })
        if (Math.random() < 0.5 && w.tier >= 2) {
          w.haz.push({ k: 'spike', x: x0 + gw / 2 - 24, w: 48, s: (s * -1) as Surf, passed: false })
        }
        len = gw
      } else if (kind === 'saw') {
        const s = rs()
        const r = rand(22, 30)
        w.haz.push({ k: 'saw', x: x0 + r, r, s, passed: false })
        if (Math.random() < 0.4) w.haz.push({ k: 'saw', x: x0 + r + 150, r, s: (s * -1) as Surf, passed: false })
        len = r * 2 + 150
      } else if (kind === 'drone') {
        w.haz.push({ k: 'drone', x: x0 + 20, ph: rand(0, 6), amp: (floorY - ceilY) * rand(0.15, 0.3), passed: false })
        len = 60
      } else if (kind === 'gate') {
        w.haz.push({ k: 'gate', x: x0 + 10, ph: rand(0, 1), passed: false })
        len = 40
      } else if (kind === 'crusher') {
        w.haz.push({ k: 'crusher', x: x0 + CRUSH_W + 4, s: rs(), ph: rand(0, 1), slam: false, passed: false })
        len = CRUSH_W * 2 + 8
      } else if (kind === 'rocket') {
        // Needs a clean runway on both lanes while it flies in
        w.rockets.push({ trig: x0, st: 0, s: 1, x: 0, tm: 0, dur: lerp(1.15, 0.9, diff), passed: false })
        for (let i = 0; i < 4; i++) w.orbs.push({ x: x0 + 140 + i * 26, y: mid + (i - 1.5) * 26, got: false })
        len = w.speed * 1.5
      } else {
        w.haz.push({ k: 'msaw', x: x0 + 26, r: 22, ph: rand(0, 6), passed: false })
        len = 60
      }
      // Phase core power-up, every ~30-40 s after the first minute
      if (w.t > 55 && w.powCd <= 0 && kind !== 'rocket') {
        w.powCd = rand(28, 40)
        w.pows.push({ x: x0 + len + 90, y: mid, got: false })
      } else if (Math.random() < 0.55) {
        const ox = x0 + len + 50
        const along = Math.random() < 0.5
        const ay = Math.random() < 0.5 ? floorY - 16 : ceilY + 16
        for (let i = 0; i < 5; i++) w.orbs.push({ x: ox + i * 24, y: along ? ay : mid + Math.sin(i * 0.9) * 50, got: false })
      }
      len += lerp(390, 190, diff) * rand(0.85, 1.2) + (w.t < 20 ? 220 : 0)
    }
    for (const s of [1, -1] as Surf[]) {
      const list = s === 1 ? w.floor : w.ceil
      let cur = x0
      for (const gp of gaps) {
        if (gp.s !== s) continue
        if (gp.a > cur) addSeg(list, cur, gp.a)
        cur = gp.b
      }
      addSeg(list, cur, x0 + len)
    }
    w.genX = x0 + len
  }

  function step(dt: number, W: number, t: number) {
    const w = world.current
    const ph = phaseRef.current
    const playing = ph === 'play'
    const demo = ph === 'idle'
    const { ceilY, floorY } = geo()
    const px = W * 0.25

    if (playing) {
      w.t += dt
      const nt = TIERS[w.tier + 1]
      if (nt && w.t >= nt.t && !w.boss) {
        w.tier += 1
        say(nt.label, nt.sub)
        sfx.levelUp()
      }
      if (!w.boss && w.t >= w.nextBoss) startBoss()
      w.powCd -= dt
      if (w.phase > 0) {
        const before = w.phase
        w.phase = Math.max(0, w.phase - dt)
        if (w.phase === 0) {
          w.inv = Math.max(w.inv, 0.8)
          fx.text(W * 0.25, w.y - 30, 'PHASE OVER', '#c4b5fd', 14)
          sfx.pop()
        } else if (Math.ceil(before) !== Math.ceil(w.phase)) pushHud()
      }
    }
    const ramp = 1 - run.level('slow') * 0.1
    let target = 240 + Math.min(260, w.t * 1.7 * ramp)
    if (w.tier >= TIX.over) target += 30
    if (demo) target = 220
    if (ph === 'dying' || ph === 'over') w.speed = approach(w.speed, 0, 2.5, dt)
    else w.speed = approach(w.speed, target, 2, dt)
    const dx = w.speed * dt
    w.x += dx
    while (w.genX < w.x + W * 1.4) genChunk(demo)
    const keep = w.x - W
    if (w.floor.length > 1 && w.floor[0].x1 < keep) w.floor.shift()
    if (w.ceil.length > 1 && w.ceil[0].x1 < keep) w.ceil.shift()

    // Demo autopilot
    if (demo) {
      w.demoT -= dt
      if (w.demoT <= 0) {
        w.demoT = rand(0.9, 1.6)
        flip(true)
      }
    }

    // Physics
    w.coyote -= dt
    w.buffer -= dt
    w.flipT += dt
    w.inv = Math.max(0, w.inv - dt)
    if (ph === 'dying' || ph === 'over') {
      w.vy += G * w.g * 0.6 * dt
      w.y += w.vy * dt
      w.rot += dt * 8
    } else {
      const wasGrounded = w.grounded
      w.vy += G * w.g * dt
      w.vy = clamp(w.vy, -1100, 1100)
      w.y += w.vy * dt
      w.grounded = false
      const list = w.g === 1 ? w.floor : w.ceil
      const sy = w.g === 1 ? floorY - 16 : ceilY + 16
      const onSurf = surfAt(list, w.x - 8, w.x + 8) || ((w.inv > 0 || w.phase > 0) && !demo) || demo
      if (onSurf && (w.g === 1 ? w.y >= sy : w.y <= sy) && Math.abs(w.y - sy) < 40) {
        if (!wasGrounded && (playing || demo)) {
          w.squash = 1
          if (playing) {
            fx.burst(px, w.g === 1 ? floorY : ceilY, { count: 6, color: [ZONES[w.zone].line, '#fff'], speed: 120, angle: w.g === 1 ? -Math.PI / 2 : Math.PI / 2, spread: 2.6, size: 2.5, life: 0.3, gravity: 0 })
            sfx.thud()
          }
        }
        w.y = sy
        w.vy = 0
        w.grounded = true
        w.coyote = 0.08
        if (w.buffer > 0) flip()
      }
      // Fell out of the corridor
      if (playing && (w.y > floorY + 70 || w.y < ceilY - 70)) {
        if (hurt()) return
        w.g = (w.y > floorY ? -1 : 1) as Surf
        w.vy = w.g * 600
      }
    }
    const targetRot = w.g === 1 ? 0 : Math.PI
    if (ph !== 'dying' && ph !== 'over') w.rot = approach(w.rot, targetRot, 14, dt)
    w.squash = Math.max(0, w.squash - dt * 5)
    w.runPh += dt * w.speed * 0.06
    if (!w.grounded && (playing || demo)) {
      w.trail.push({ x: w.x, y: w.y })
      if (w.trail.length > 10) w.trail.shift()
    } else if (w.trail.length) w.trail.shift()

    // Combo timer
    w.comboT -= dt
    if (w.comboT <= 0 && w.combo > 0) {
      w.combo = 0
      pushHud()
    }

    // Hazards
    for (const h of w.haz) {
      if (h.x > w.x + W) break
      if (!playing) continue
      let hit = false
      let surf: Surf | 0 = 0
      let endX = h.x
      if (h.k === 'spike') {
        surf = h.s
        endX = h.x + h.w
        const sy = surfY(h.s)
        const y0 = h.s === 1 ? sy - 19 : sy
        const y1 = h.s === 1 ? sy : sy + 19
        hit = w.x + PR - 3 > h.x + 3 && w.x - PR + 3 < h.x + h.w - 3 && w.y + PR > y0 && w.y - PR < y1
      } else if (h.k === 'saw') {
        surf = h.s
        endX = h.x + h.r
        hit = Math.hypot(w.x - h.x, w.y - surfY(h.s)) < h.r * 0.85 + PR
      } else if (h.k === 'msaw') {
        h.ph += dt * 1.8
        const yy = (ceilY + floorY) / 2 + Math.sin(h.ph) * ((floorY - ceilY) / 2 - h.r)
        endX = h.x + h.r
        hit = Math.hypot(w.x - h.x, w.y - yy) < h.r * 0.85 + PR
      } else if (h.k === 'drone') {
        h.ph += dt * 2
        const yy = (ceilY + floorY) / 2 + Math.sin(h.ph) * h.amp
        endX = h.x + 14
        hit = Math.hypot(w.x - h.x, w.y - yy) < 13 + PR
      } else if (h.k === 'gate') {
        const on = (t * 0.6 + h.ph) % 1 < 0.45
        endX = h.x + 6
        hit = on && Math.abs(w.x - h.x) < PR + 4
      } else if (h.k === 'crusher') {
        surf = h.s
        endX = h.x + CRUSH_W
        const c = crushCycle(w.t, h.ph)
        const ext = c.e * (floorY - ceilY) * 0.52
        if (c.e >= 1 && !h.slam) {
          h.slam = true
          const sx = h.x - w.x + px
          if (sx > -30 && sx < W + 30) {
            const fy = surfY(h.s) - h.s * ext
            fx.burst(sx, fy, { count: 8, color: ['#facc15', '#e2e8f0'], speed: 160, angle: h.s === 1 ? -Math.PI / 2 : Math.PI / 2, spread: 2.4, size: 2.5, life: 0.3 })
            fx.shake(3, 0.12)
            sfx.thud()
          }
        } else if (c.e < 1) h.slam = false
        if (ext > 4) {
          const sy = surfY(h.s)
          const y0 = h.s === 1 ? sy - ext : sy
          const y1 = h.s === 1 ? sy : sy + ext
          hit = w.x + PR - 3 > h.x - CRUSH_W && w.x - PR + 3 < h.x + CRUSH_W && w.y + PR - 2 > y0 && w.y - PR + 2 < y1
        }
      } else {
        surf = h.s
        endX = h.x + h.w
      }
      if (hit && w.phase > 0) {
        if (h.k !== 'gate') {
          smash(px + (h.x - w.x), w.y)
          h.x = -99999
        }
        continue
      }
      if (hit && w.inv <= 0) {
        if (hurt()) return
        h.x = -99999
        continue
      }
      // Near miss: hazard on the surface you just left passes right after the flip
      if (!h.passed && endX < w.x - PR) {
        h.passed = true
        const close = surf !== 0 && surf === w.flipFrom && w.flipT < 0.38 && w.g !== surf
        if (close) nearMiss(px)
      }
    }
    w.haz = w.haz.filter((h) => h.x > w.x - W)

    // Rockets: warn at the screen edge on your lane, then fly in along it
    for (const r of w.rockets) {
      if (!playing) break
      if (r.st === 0) {
        if (w.x + W * 0.75 < r.trig) continue
        r.st = 1
        r.tm = 0
        r.s = w.g
        sfx.tick()
        haptic.light()
      } else if (r.st === 1) {
        r.tm += dt
        if (Math.floor((r.tm - dt) * 6) !== Math.floor(r.tm * 6)) sfx.tick()
        if (r.tm >= r.dur) {
          r.st = 2
          r.x = w.x + W * 0.75 + 40
          sfx.whoosh()
          sfx.shoot()
        }
      } else {
        r.x -= 330 * dt
        const ry = surfY(r.s) - r.s * 16
        if (Math.abs(r.x - w.x) < 20 + PR - 4 && Math.abs(ry - w.y) < 7 + PR) {
          const sx = px + (r.x - w.x)
          r.x = -99999
          if (w.phase > 0) smash(sx, ry)
          else {
            fx.explode(sx, ry, 0.6)
            sfx.boom(0.4)
            if (hurt()) return
          }
          continue
        }
        if (!r.passed && r.x < w.x - PR - 20) {
          r.passed = true
          if (r.s === w.flipFrom && w.g !== r.s && w.flipT < 0.6) nearMiss(px)
        }
      }
    }
    w.rockets = w.rockets.filter((r) => r.st < 2 || r.x > w.x - W)

    // Sentinel boss
    const b = w.boss
    if (b && playing) {
      b.enter = Math.min(1, b.enter + dt / 1.3)
      b.hit = Math.max(0, b.hit - dt * 4)
      if (b.enter >= 1) {
        if (b.fire > 0) {
          b.fire -= dt
          const ly = surfY(b.aim) - b.aim * 18
          if (Math.abs(w.y - ly) < 18 + PR - 5 && w.phase <= 0 && w.inv <= 0) {
            if (hurt()) return
          }
          if (b.fire <= 0) {
            b.n -= 1
            b.hit = 1
            b.next = b.n > 0 ? rand(0.55, 0.85) : 0
            if (b.n <= 0) {
              bossDown(W * 0.8, (ceilY + floorY) / 2)
            } else if (w.g !== b.aim) {
              fx.text(px + 30, w.y + (w.g === 1 ? -30 : 30), 'DODGED', '#a5f3fc', 14)
              sfx.score(b.total - b.n)
            }
          }
        } else if (b.ch >= 0) {
          b.ch += dt
          if (b.ch >= b.charge) {
            b.ch = -1
            b.fire = 0.32
            fx.shake(7, 0.25)
            sfx.boom(0.35)
            sfx.shoot()
            haptic.medium()
          }
        } else {
          b.next -= dt
          if (b.next <= 0) {
            b.ch = 0
            b.aim = w.g
            sfx.power()
          }
        }
      }
    }

    // Phase cores
    for (const p of w.pows) {
      if (p.got || p.x > w.x + W) continue
      if (playing && Math.hypot(p.x - w.x, p.y - w.y) < 26) {
        p.got = true
        w.phase = 5
        fx.burst(px, w.y, { count: 22, color: ['#c4b5fd', '#67e8f9', '#fff'], speed: 260, shape: 'spark', life: 0.5 })
        fx.ring(px, w.y, { color: '#a78bfa', maxR: 80, life: 0.5, width: 4 })
        say('PHASE SHIFT', 'smash through hazards')
        sfx.power()
        haptic.success()
        pushHud()
      }
    }
    w.pows = w.pows.filter((p) => !p.got && p.x > w.x - W)

    // Biome ambience: crystal motes, storm rain + lightning
    const bg = ZONES[w.zone].bg
    if (bg === 'crystal') {
      if (w.amb.length < 26 && Math.random() < dt * 14) {
        w.amb.push({ x: rand(0, W + 40), y: rand(ceilY + 10, floorY - 10), vx: -rand(10, 30), vy: -rand(8, 24), life: 0, max: rand(2.5, 4.5), s: rand(1.2, 2.4), c: Math.random() < 0.5 ? 1 : 0 })
      }
    } else if (bg === 'storm') {
      for (let k = 0; k < 3 && w.amb.length < 46; k++) {
        if (Math.random() > dt * 60) break
        w.amb.push({ x: rand(0, W + 200), y: ceilY + rand(-10, 30), vx: -(w.speed * 0.5 + 140), vy: rand(520, 640), life: 0, max: 2, s: 1, c: 0 })
      }
      w.bolt = Math.max(0, w.bolt - dt)
      w.boltCd -= dt
      if (w.boltCd <= 0) {
        w.boltCd = rand(2.5, 5.5)
        w.bolt = 0.22
        w.boltX = rand(W * 0.2, W * 0.95)
        w.boltSeed = Math.floor(rand(0, 1000))
        if (playing) window.setTimeout(() => phaseRef.current === 'play' && sfx.boom(0.12), 160)
      }
    }
    for (const a of w.amb) {
      a.life += dt
      a.x += a.vx * dt
      a.y += a.vy * dt
    }
    if (w.amb.length) w.amb = w.amb.filter((a) => a.life < a.max && a.y < floorY && a.x > -30)

    // Orbs
    const mag = run.level('magnet')
    for (const o of w.orbs) {
      if (o.got || o.x > w.x + W) continue
      const d = Math.hypot(o.x - w.x, o.y - w.y)
      if (playing && mag > 0 && d < 50 + mag * 22) {
        o.x += ((w.x - o.x) / d) * 420 * dt
        o.y += ((w.y - o.y) / d) * 420 * dt
      }
      if (d < 20 && (playing || demo)) {
        o.got = true
        if (!playing) continue
        w.stats.orbs += 1
        const sx = px + (o.x - w.x)
        fx.burst(sx, o.y, { count: 7, color: ['#67e8f9', '#fff', ZONES[w.zone].accent], speed: 150, size: 2.5, life: 0.35 })
        sfx.score(Math.min(8, w.stats.orbs % 9))
        run.update(w.stats)
      }
    }
    w.orbs = w.orbs.filter((o) => !o.got && o.x > w.x - W)

    // Distance milestones
    if (playing) {
      const m = Math.floor(w.x / PX_PER_M)
      if (m !== w.stats.dist) {
        w.stats.dist = m
        if (m % 10 === 0) run.update(w.stats)
      }
      if (m >= w.nextMark) {
        w.nextMark += 100
        if (m % ZONE_M === 0) {
          setZone(w.zone + 1, `${m} m`)
          if (m % 1000 === 0) void trackEvent('action_milestone', { game_id: 'gravity', kind: 'distance', value: m })
        } else {
          fx.text(W / 2, ceilY + 40, `${m} m`, '#fff', 20)
          sfx.tick()
        }
        if (bestRef.current > 0 && m >= bestRef.current && m - 100 < bestRef.current) {
          say('NEW BEST!', `${m} m`)
          sfx.win()
        }
      }
    }
    w.zoneFade = Math.max(0, w.zoneFade - dt * 0.8)
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    if (phaseRef.current === 'idle' && w.y === 0) w.y = surfY(1) - 16
    const dt = fx.step(raw)
    step(dt, W, t)
    const ph = phaseRef.current
    if (ph === 'play') {
      hudT.current -= raw
      if (hudT.current <= 0) {
        hudT.current = 0.15
        pushHud()
      }
    }
    const z = ZONES[w.zone]
    const { ceilY, floorY } = geo()
    const px = W * 0.25
    const cam = w.x - px

    // Background
    const bg = ctx.createLinearGradient(0, ceilY, 0, floorY)
    bg.addColorStop(0, z.top)
    bg.addColorStop(0.5, z.bot)
    bg.addColorStop(1, z.top)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    if (z.bg === 'crystal') drawCrystalBg(ctx, W, ceilY, floorY, cam, t)
    else if (z.bg === 'storm') drawStormBg(ctx, W, ceilY, floorY, cam, t, w.bolt, w.boltX, w.boltSeed)
    else {
      // Parallax: far chevrons and pillars
      ctx.strokeStyle = z.line
      ctx.globalAlpha = 0.08
      ctx.lineWidth = 10
      const s1 = 120
      const o1 = -((cam * 0.25) % s1)
      for (let x = o1 - s1; x < W + s1; x += s1) {
        ctx.beginPath()
        ctx.moveTo(x, ceilY + 30)
        ctx.lineTo(x + 40, (ceilY + floorY) / 2)
        ctx.lineTo(x, floorY - 30)
        ctx.stroke()
      }
      ctx.globalAlpha = 0.15
      ctx.fillStyle = z.wall
      const s2 = 200
      const o2 = -((cam * 0.5) % s2)
      for (let x = o2 - s2; x < W + s2; x += s2) ctx.fillRect(x, ceilY, 18, floorY - ceilY)
      ctx.globalAlpha = 1
    }
    if (w.amb.length) drawAmbient(ctx, z.bg, w.amb)
    glow(ctx, px, w.y, 90, w.phase > 0 ? '#a78bfa' : z.line, w.phase > 0 ? 0.3 : 0.12)

    // Checkpoint arches at each zone boundary
    if (ph !== 'idle') {
      const span = ZONE_M * PX_PER_M
      const k = Math.ceil((cam - 30) / span)
      const cx = k * span - cam
      if (k > 0 && cx < W + 40) drawCheckpoint(ctx, cx, ceilY, floorY, `${k * ZONE_M} m`, ZONES[(w.zone + (cx > px ? 1 : 0)) % ZONES.length].line, t)
    }

    fx.applyShake(ctx)

    // Walls outside corridor
    for (const s of [1, -1] as Surf[]) {
      const list = s === 1 ? w.floor : w.ceil
      const sy = s === 1 ? floorY : ceilY
      for (const seg of list) {
        const a = seg.x0 - cam
        const b = seg.x1 - cam
        if (b < -10 || a > W + 10) continue
        const y0 = s === 1 ? sy : 0
        const hgt = s === 1 ? H - sy : sy
        const g = ctx.createLinearGradient(0, s === 1 ? sy : 0, 0, s === 1 ? H : sy)
        g.addColorStop(0, s === 1 ? z.wall : z.wall2)
        g.addColorStop(1, s === 1 ? z.wall2 : z.wall)
        ctx.fillStyle = g
        ctx.fillRect(a, y0, b - a, hgt)
        // Panel seams
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        const st = Math.ceil((seg.x0) / 60) * 60
        for (let x = st; x < seg.x1; x += 60) {
          const sx = x - cam
          if (sx < -4 || sx > W + 4) continue
          ctx.fillRect(sx, y0, 3, hgt)
        }
        ctx.fillStyle = z.line
        ctx.fillRect(a, s === 1 ? sy : sy - 3, b - a, 3)
        ctx.globalAlpha = 0.25
        ctx.fillRect(a, s === 1 ? sy + 3 : sy - 9, b - a, 6)
        ctx.globalAlpha = 1
      }
    }
    // Gap warning glows
    for (const h of w.haz) {
      if (h.k !== 'gap') continue
      const a = h.x - cam
      if (a > W + 20 || a + h.w < -20) continue
      const sy = h.s === 1 ? floorY : ceilY
      ctx.fillStyle = 'rgba(239,68,68,0.18)'
      ctx.fillRect(a, h.s === 1 ? sy : 0, h.w, h.s === 1 ? H - sy : sy)
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(a - 3, h.s === 1 ? sy : sy - 12, 4, 12)
      ctx.fillRect(a + h.w - 1, h.s === 1 ? sy : sy - 12, 4, 12)
    }

    // Best marker
    if (ph !== 'idle' && bestRef.current > 0) {
      const bx = bestRef.current * PX_PER_M - cam
      if (bx > -10 && bx < W + 10) {
        ctx.strokeStyle = '#fde047'
        ctx.setLineDash([8, 8])
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(bx, ceilY)
        ctx.lineTo(bx, floorY)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#fde047'
        ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText('BEST', bx, ceilY - 6)
      }
    }

    // Orbs
    for (const o of w.orbs) {
      const sx = o.x - cam
      if (sx < -10 || sx > W + 10) continue
      const r = 6 + Math.sin(t * 6 + o.x) * 1
      glow(ctx, sx, o.y, 16, '#22d3ee', 0.4)
      ctx.fillStyle = '#a5f3fc'
      ctx.beginPath()
      ctx.arc(sx, o.y, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(sx - 2, o.y - 2, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Hazards
    for (const h of w.haz) {
      const sx = h.x - cam
      if (sx > W + 60) break
      if (sx < -80) continue
      if (h.k === 'spike') {
        const sy = surfY(h.s)
        const n = Math.round(h.w / 24)
        ctx.fillStyle = '#e2e8f0'
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        for (let i = 0; i < n; i++) {
          const bx = sx + i * 24
          ctx.beginPath()
          ctx.moveTo(bx + 1, sy)
          ctx.lineTo(bx + 12, sy - 26 * h.s)
          ctx.lineTo(bx + 23, sy)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          ctx.fillStyle = '#94a3b8'
          ctx.beginPath()
          ctx.moveTo(bx + 12, sy - 20 * h.s)
          ctx.lineTo(bx + 23, sy)
          ctx.lineTo(bx + 12, sy)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = '#e2e8f0'
        }
      } else if (h.k === 'saw') {
        drawSaw(ctx, sx, surfY(h.s), h.r, t)
      } else if (h.k === 'msaw') {
        const yy = (ceilY + floorY) / 2 + Math.sin(h.ph) * ((floorY - ceilY) / 2 - h.r)
        ctx.fillStyle = 'rgba(148,163,184,0.5)'
        ctx.fillRect(sx - 2, ceilY, 4, floorY - ceilY)
        drawSaw(ctx, sx, yy, h.r, t)
      } else if (h.k === 'drone') {
        const yy = (ceilY + floorY) / 2 + Math.sin(h.ph) * h.amp
        drawDrone(ctx, sx, yy, t)
      } else if (h.k === 'crusher') {
        const c = crushCycle(w.t, h.ph)
        const maxLen = (floorY - ceilY) * 0.52
        drawCrusher(ctx, sx, surfY(h.s), h.s, c.e * maxLen, maxLen, c.warn, t)
      } else if (h.k === 'gate') {
        const k = (t * 0.6 + h.ph) % 1
        const on = k < 0.45
        const warn = !on && k > 0.85
        for (const ey of [ceilY, floorY]) {
          ctx.fillStyle = '#374151'
          ctx.beginPath()
          ctx.roundRect(sx - 10, ey - 8, 20, 16, 4)
          ctx.fill()
          ctx.fillStyle = on ? '#fff' : warn ? '#f87171' : '#7f1d1d'
          ctx.beginPath()
          ctx.arc(sx, ey, 4, 0, Math.PI * 2)
          ctx.fill()
        }
        if (on) {
          ctx.fillStyle = 'rgba(239,68,68,0.35)'
          ctx.fillRect(sx - 9, ceilY, 18, floorY - ceilY)
          ctx.fillStyle = '#f87171'
          ctx.fillRect(sx - 4, ceilY, 8, floorY - ceilY)
          ctx.fillStyle = '#fff'
          ctx.fillRect(sx - 1.5, ceilY, 3, floorY - ceilY)
        } else {
          ctx.strokeStyle = warn ? '#f87171' : 'rgba(239,68,68,0.3)'
          ctx.setLineDash([6, 8])
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(sx, ceilY)
          ctx.lineTo(sx, floorY)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
    }

    // Phase cores
    for (const p of w.pows) {
      const sx = p.x - cam
      if (sx < -20 || sx > W + 20) continue
      glow(ctx, sx, p.y, 30, '#a78bfa', 0.45)
      drawPhaseCore(ctx, sx, p.y, t)
    }

    // Rockets
    for (const r of w.rockets) {
      if (r.st === 0) continue
      const ry = surfY(r.s) - r.s * 16
      if (r.st === 1) {
        if (ph === 'play') drawRocketWarn(ctx, W, ry, r.tm / r.dur, px + 30, t)
      } else {
        const sx = r.x - cam
        if (sx > -40 && sx < W + 60) drawRocket(ctx, sx, ry, t)
      }
    }

    // Sentinel boss
    const boss = w.boss
    if (boss) {
      const e = 1 - boss.enter
      const bx = W * 0.8 + e * e * W * 0.6
      const by = (ceilY + floorY) / 2 + Math.sin(t * 2.2) * 14
      const charge = boss.ch >= 0 ? boss.ch / boss.charge : 0
      const ly = surfY(boss.aim) - boss.aim * 18
      if (boss.fire > 0 || boss.ch >= 0) drawBeam(ctx, bx - 20, ly, 18, charge, boss.fire, t)
      if (boss.fire > 0) {
        ctx.strokeStyle = '#f87171'
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.moveTo(bx - 14, by)
        ctx.lineTo(bx - 20, ly)
        ctx.stroke()
      }
      drawSentinel(ctx, bx, by, t, boss.ch >= 0 || boss.fire > 0 ? boss.aim : Math.sin(t * 1.3), charge, boss.hit)
      // Health pips: one per volley still to survive
      const pw = Math.min(150, W * 0.4)
      const bx0 = W / 2 - pw / 2
      const by0 = ceilY - 22
      ctx.fillStyle = 'rgba(2,6,23,0.7)'
      ctx.beginPath()
      ctx.roundRect(bx0 - 6, by0 - 16, pw + 12, 26, 8)
      ctx.fill()
      ctx.fillStyle = '#fecaca'
      ctx.font = "800 9px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('SENTINEL', W / 2, by0 - 8)
      const gap = 3
      const cw = (pw - gap * (boss.total - 1)) / boss.total
      for (let i = 0; i < boss.total; i++) {
        ctx.fillStyle = i < boss.n ? '#ef4444' : 'rgba(148,163,184,0.3)'
        ctx.fillRect(bx0 + i * (cw + gap), by0, cw, 5)
      }
    }

    // Player trail
    if (w.trail.length > 1 && ph !== 'dying' && ph !== 'over') {
      ctx.strokeStyle = w.phase > 0 ? '#a78bfa' : z.line
      ctx.lineCap = 'round'
      for (let i = 1; i < w.trail.length; i++) {
        const a = w.trail[i - 1]
        const b2 = w.trail[i]
        ctx.globalAlpha = (i / w.trail.length) * 0.5
        ctx.lineWidth = (i / w.trail.length) * 14
        ctx.beginPath()
        ctx.moveTo(a.x - cam, a.y)
        ctx.lineTo(b2.x - cam, b2.y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // Player
    ctx.save()
    ctx.translate(px, w.y)
    ctx.globalAlpha = w.inv > 0 && Math.sin(t * 40) > 0.3 ? 0.4 : 1
    ctx.rotate(w.rot)
    const sq = w.squash
    ctx.scale(1 + sq * 0.2, 1 - sq * 0.2)
    ctx.translate(0, -3)
    ctx.scale(1.25, 1.25)
    drawBot(ctx, t, w.runPh, w.grounded, z.accent)
    ctx.restore()
    ctx.globalAlpha = 1
    if (w.phase > 0 && ph === 'play') {
      const fade = w.phase < 1.2 && Math.sin(t * 30) > 0 ? 0.3 : 1
      ctx.globalAlpha = fade
      ctx.strokeStyle = '#c4b5fd'
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + t * 2
        ctx.lineTo(px + Math.cos(a) * 28, w.y + Math.sin(a) * 28)
      }
      ctx.closePath()
      ctx.stroke()
      ctx.strokeStyle = 'rgba(103,232,249,0.7)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(px, w.y, 22 + Math.sin(t * 10) * 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    if (w.shield > 0 && ph === 'play') {
      ctx.strokeStyle = 'rgba(125,211,252,0.55)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(px, w.y, 24 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2)
      ctx.stroke()
    }

    fx.draw(ctx)
    ctx.restore()
    if (w.zoneFade > 0) {
      ctx.globalAlpha = w.zoneFade * 0.4
      ctx.fillStyle = z.accent
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onDown}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.dist} m</div>
                <div className="action-hud__small" style={{ color: '#a5f3fc' }}>● {hud.orbs}</div>
              </div>
              <div className="action-hud__right">
                {hud.combo > 1 ? <span className="action-hud__small" style={{ color: '#fde047' }}>Combo x{hud.combo}</span> : null}
                {hud.phase > 0 ? <span className="action-hud__small" style={{ color: '#c4b5fd' }}>Phase {hud.phase}s</span> : null}
                {hud.shield > 0 ? <span className="action-hud__small" style={{ color: '#7dd3fc' }}>Shield ×{hud.shield}</span> : null}
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
              game="gravity"
              icon={meta.icon}
              title={meta.title}
              hint="Tap to flip gravity between floor and ceiling. Dodge spikes, saws and gaps — flip late for near-miss combos."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.dist >= 1000 ? 'Gravity master!' : hud.dist >= 500 ? 'Great run!' : 'Splat!'}
            subtitle={`${hud.dist} m · ${hud.orbs} orbs`}
            celebrate={hud.dist >= 500}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
