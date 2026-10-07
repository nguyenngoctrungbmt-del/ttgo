import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, dist, glow, rand } from '../../shared/action/fx'
import { useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'
import { drawBat, drawBubble, drawSerpent, drawSpike } from './art'

const meta = getGame('swing')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Anchor = { x: number; y: number }
type Saw = { x: number; y: number; baseY: number; r: number; amp: number; t: number }
type Gem = { x: number; y: number; taken: boolean }
type Trail = { x: number; y: number; life: number }
/** Lava fireball: bubbles (warn) at the surface, then leaps up. */
type Fire = { x: number; y: number; vy: number; warn: number }

/** Biomes shift every 250 m. */
type MoteKind = 'spark' | 'snow' | 'spore' | 'ember' | 'dust' | 'void'
type Biome = { name: string; top: string; mid: string; low: string; rock: string; ceil: string; mote: MoteKind; moteColor: string; layer?: 'shrooms' | 'mine' }
const BIOMES: Biome[] = [
  { name: 'Crystal Cave', top: '#0c4a6e', mid: '#155e75', low: '#7c2d12', rock: 'rgba(8,47,73,0.6)', ceil: '#082f49', mote: 'spark', moteColor: '#a5f3fc' },
  { name: 'Frost Hollow', top: '#1e3a8a', mid: '#3b82f6', low: '#9a3412', rock: 'rgba(191,219,254,0.25)', ceil: '#1e3a8a', mote: 'snow', moteColor: '#ffffff' },
  { name: 'Fungal Glow', top: '#022c22', mid: '#155e75', low: '#7e22ce', rock: 'rgba(2,44,34,0.65)', ceil: '#011c16', mote: 'spore', moteColor: '#bef264', layer: 'shrooms' },
  { name: 'Ember Depths', top: '#450a0a', mid: '#7c2d12', low: '#c2410c', rock: 'rgba(69,10,10,0.7)', ceil: '#2a0a0a', mote: 'ember', moteColor: '#fb923c' },
  { name: 'Gilded Mine', top: '#292524', mid: '#78350f', low: '#b45309', rock: 'rgba(41,37,36,0.7)', ceil: '#1c1917', mote: 'dust', moteColor: '#fde68a', layer: 'mine' },
  { name: 'Void Grotto', top: '#1e1b4b', mid: '#4c1d95', low: '#9d174d', rock: 'rgba(30,27,75,0.7)', ceil: '#0f0a2e', mote: 'void', moteColor: '#e9d5ff' },
]

type Mote = { x: number; y: number; vx: number; vy: number; s: number; ph: number }
/** Cave bat: shows warning eyes at the screen edge, then flaps in on a wavy line. */
type Bat = { x: number; y: number; baseY: number; warn: number; ph: number; vx: number }
/** Stalactite: hangs, shakes when you get close, then drops. */
type Spike = { x: number; len: number; y: number; vy: number; shake: number; state: 'hang' | 'shake' | 'fall' }
type Bubble = { x: number; y: number; taken: boolean }
/** Lava Serpent boss: a few telegraphed leaps out of the lava. `x` is the leap centre in screen space. */
type Serpent = { leaps: number; x: number; warn: number; u: number; gap: number; wave: number }

const BAT_FROM = 400
const SPIKE_FROM = 600
const FIRST_SERPENT = 700
const SERPENT_EVERY = 800
const BUBBLE_FROM = 200

let gemSprite: HTMLCanvasElement | null = null
/** Faceted cyan gem, pre-rendered once (drawn many times per frame). */
function getGemSprite() {
  if (gemSprite) return gemSprite
  const c = document.createElement('canvas')
  const S = 2
  c.width = 28 * S
  c.height = 28 * S
  const g = c.getContext('2d')
  if (!g) return c
  g.scale(S, S)
  g.translate(14, 14)
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 14)
  grad.addColorStop(0, 'rgba(103,232,249,0.45)')
  grad.addColorStop(1, 'rgba(103,232,249,0)')
  g.fillStyle = grad
  g.fillRect(-14, -14, 28, 28)
  // Crown + pavilion
  g.fillStyle = '#22d3ee'
  g.beginPath()
  g.moveTo(-8, -3)
  g.lineTo(-4, -8)
  g.lineTo(4, -8)
  g.lineTo(8, -3)
  g.lineTo(0, 9)
  g.closePath()
  g.fill()
  g.fillStyle = '#a5f3fc'
  g.beginPath()
  g.moveTo(-4, -8)
  g.lineTo(4, -8)
  g.lineTo(2, -3)
  g.lineTo(-2, -3)
  g.closePath()
  g.fill()
  g.fillStyle = '#0891b2'
  g.beginPath()
  g.moveTo(2, -3)
  g.lineTo(8, -3)
  g.lineTo(0, 9)
  g.closePath()
  g.fill()
  g.strokeStyle = '#ecfeff'
  g.lineWidth = 1
  g.beginPath()
  g.moveTo(-8, -3)
  g.lineTo(8, -3)
  g.stroke()
  g.fillStyle = '#ffffff'
  g.beginPath()
  g.arc(-3.5, -5.5, 1.2, 0, Math.PI * 2)
  g.fill()
  gemSprite = c
  return c
}

const SP = { x: 0, y: 0 }
const SERP_PTS = new Float32Array(20)
const GRAVITY = 1250
const PX_PER_M = 30
const ROPE_RANGE = 340

type World = {
  x: number
  y: number
  vx: number
  vy: number
  anchor: Anchor | null
  ropeLen: number
  ropeShoot: number
  holding: boolean
  anchors: Anchor[]
  saws: Saw[]
  gems: Gem[]
  trail: Trail[]
  camX: number
  maxX: number
  lavaT: number
  gemCount: number
  perfects: number
  fires: Fire[]
  fireT: number
  invuln: number
  /** Lava bounces left (Ember Shield upgrade). */
  shields: number
  range: number
  magnet: number
  biome: number
  motes: Mote[]
  bats: Bat[]
  batT: number
  spikes: Spike[]
  bubbles: Bubble[]
  nextBubble: number
  /** Hits absorbed by a picked-up bubble (any hazard, incl. lava). */
  bubble: number
  serpent: Serpent | null
  nextSerpent: number
  serpents: number
  bonus: number
  stats: { score: number; distance: number; gems: number; perfects: number }
}

function freshWorld(W: number, H: number): World {
  const first: Anchor = { x: W * 0.45, y: H * 0.18 }
  return {
    x: W * 0.2,
    y: H * 0.42,
    vx: 160,
    vy: 0,
    anchor: first,
    ropeLen: dist(W * 0.2, H * 0.42, first.x, first.y),
    ropeShoot: 1,
    holding: true,
    anchors: [first],
    saws: [],
    gems: [],
    trail: [],
    camX: 0,
    maxX: W * 0.2,
    lavaT: 0,
    gemCount: 0,
    perfects: 0,
    fires: [],
    fireT: 3,
    invuln: 0,
    shields: 0,
    range: ROPE_RANGE,
    magnet: 0,
    biome: 0,
    motes: [],
    bats: [],
    batT: 4,
    spikes: [],
    bubbles: [],
    nextBubble: BUBBLE_FROM,
    bubble: 0,
    serpent: null,
    nextSerpent: FIRST_SERPENT,
    serpents: 0,
    bonus: 0,
    stats: { score: 0, distance: 0, gems: 0, perfects: 0 },
  }
}

export default function SwingGame() {
  const run = useActionRun('swing')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 520 })
  const world = useRef<World>(freshWorld(360, 520))
  const phaseRef = useRef<Phase>('idle')

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, dist: 0 })
  const lastMilestone = useRef(0)
  /** DEV-only autopilot used by screenshot scripts. */
  const autoPlay = useRef(false)
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function scoreOf(w: World) {
    return Math.floor((w.maxX - size.current.w * 0.2) / PX_PER_M) + w.gemCount * 5 + w.perfects * 10 + w.bonus
  }

  function start() {
    void unlockAudio()
    const w = freshWorld(size.current.w, size.current.h)
    // Launch free so the first hold is the player's own grab.
    w.anchor = null
    w.holding = false
    w.y = size.current.h * 0.3
    w.vx = 240
    w.vy = -300
    w.range = ROPE_RANGE * (1 + run.level('range') * 0.12)
    w.magnet = run.level('magnet') * 18
    w.shields = run.level('shield')
    world.current = w
    fx.reset()
    setHud({ score: 0, dist: 0 })
    setBanner({ key: Date.now(), text: 'HOLD!', sub: 'grab the glowing hook' })
    run.begin()
    setPhaseBoth('play')
    sfx.ready()
  }

  function extend(w: World) {
    const { w: W, h: H } = size.current
    let last = w.anchors[w.anchors.length - 1]
    while (last.x < w.camX + W * 2) {
      const m = last.x / PX_PER_M
      const spacing = rand(150, 230) + Math.min(70, m * 0.06)
      const a: Anchor = { x: last.x + spacing, y: clamp(last.y + rand(-70, 70), H * 0.1, H * 0.42) }
      w.anchors.push(a)
      // Gems trace the likely swing arc below each anchor.
      if (Math.random() < 0.75) {
        const n = 3 + Math.floor(Math.random() * 3)
        for (let i = 0; i < n; i++) {
          const k = (i / (n - 1)) * Math.PI * 0.7 + Math.PI * 0.15
          w.gems.push({ x: a.x - Math.cos(k) * 120, y: a.y + Math.sin(k) * 120, taken: false })
        }
      }
      if (m > 120 && Math.random() < Math.min(0.55, 0.18 + m * 0.0007)) {
        const sx = (last.x + a.x) / 2 + rand(-20, 20)
        const sy = rand(H * 0.45, H * 0.72)
        w.saws.push({ x: sx, y: sy, baseY: sy, r: rand(16, 24), amp: m > 400 ? rand(30, 80) : 0, t: rand(0, 6) })
      }
      if (m > SPIKE_FROM && Math.random() < Math.min(0.4, 0.14 + (m - SPIKE_FROM) * 0.0003)) {
        w.spikes.push({ x: (last.x + a.x) / 2 + rand(-30, 30), len: rand(42, 70), y: 8, vy: 0, shake: 0, state: 'hang' })
      }
      if (m > w.nextBubble) {
        w.bubbles.push({ x: a.x + rand(-30, 30), y: a.y + rand(95, 130), taken: false })
        w.nextBubble = m + rand(140, 210)
      }
      last = a
    }
    const cut = w.camX - 300
    w.spikes = w.spikes.filter((p) => p.x > cut)
    w.bubbles = w.bubbles.filter((b) => b.x > cut && !b.taken)
    w.anchors = w.anchors.filter((a) => a.x > cut || a === w.anchor)
    w.saws = w.saws.filter((s) => s.x > cut)
    w.gems = w.gems.filter((g) => g.x > cut && !g.taken)
  }

  function grab() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.anchor) return
    let best: Anchor | null = null
    let bestScore = Infinity
    for (const a of w.anchors) {
      if (a.x < w.x - 30) continue
      const d = dist(a.x, a.y, w.x, w.y)
      if (d > w.range || a.y > w.y + 20) continue
      // Prefer anchors ahead and a bit above.
      const s = d - (a.x - w.x) * 0.4
      if (s < bestScore) {
        bestScore = s
        best = a
      }
    }
    if (!best) {
      sfx.miss()
      return
    }
    w.anchor = best
    w.ropeLen = Math.max(60, dist(best.x, best.y, w.x, w.y))
    w.ropeShoot = 0
    const sx = best.x - w.camX
    fx.burst(sx, best.y, { count: 8, color: ['#fde047', '#ffffff'], speed: 120, gravity: 0, shape: 'spark', life: 0.3 })
    sfx.thud()
    haptic.light()
  }

  function release() {
    const w = world.current
    if (!w.anchor) return
    w.anchor = null
    if (phaseRef.current !== 'play') return
    const speed = Math.hypot(w.vx, w.vy)
    const ang = Math.atan2(w.vy, w.vx)
    // Releasing on the up-swing at speed = perfect launch.
    if (speed > 380 && w.vx > 0 && ang < -0.3 && ang > -1.25) {
      w.vx *= 1.12
      w.vy *= 1.12
      w.perfects += 1
      w.stats.perfects = w.perfects
      const sx = w.x - w.camX
      fx.text(sx, w.y - 30, 'PERFECT!', '#fde047', 20)
      fx.burst(sx, w.y, { count: 16, color: ['#fde047', '#fb923c', '#ffffff'], speed: 220, angle: ang + Math.PI, spread: 1, shape: 'spark', gravity: 0 })
      fx.ring(sx, w.y, { color: '#fde047', maxR: 40, life: 0.3 })
      fx.slowmo(0.18, 0.4)
      sfx.power()
      haptic.medium()
      run.update(w.stats)
    } else {
      sfx.whoosh()
    }
  }

  function milestone(kind: string, value: number) {
    const now = performance.now()
    if (now - lastMilestone.current < 30000) return
    lastMilestone.current = now
    void trackEvent('action_milestone', { game_id: 'swing', kind, value })
  }

  function die(kind: 'lava' | 'saw') {
    const w = world.current
    if (phaseRef.current !== 'play' || w.invuln > 0) return
    if (w.bubble > 0) {
      // Bubble pickup soaks one hit of any kind.
      w.bubble -= 1
      w.invuln = 1.2
      const sx = w.x - w.camX
      if (kind === 'lava') {
        w.anchor = null
        w.vy = -900
        w.vx = Math.max(w.vx, 220)
      }
      fx.burst(sx, w.y, { count: 22, color: ['#a5f3fc', '#e0f2fe', '#ffffff'], speed: 260, gravity: 0 })
      fx.ring(sx, w.y, { color: '#a5f3fc', maxR: 70, life: 0.45, width: 4 })
      fx.text(sx, w.y - 34, 'POP!', '#a5f3fc', 22)
      fx.shake(6, 0.2)
      sfx.pop()
      haptic.medium()
      return
    }
    if (kind === 'lava' && w.shields > 0) {
      // Ember Shield: bounce off the lava once.
      w.shields -= 1
      w.anchor = null
      w.vy = -900
      w.vx = Math.max(w.vx, 220)
      w.invuln = 0.8
      const sx = w.x - w.camX
      fx.burst(sx, size.current.h - 34, { count: 24, color: ['#7dd3fc', '#fde047', '#ffffff'], speed: 260, angle: -Math.PI / 2, spread: 1.4, gravity: 500 })
      fx.ring(sx, size.current.h - 34, { color: '#7dd3fc', maxR: 60 })
      fx.text(sx, size.current.h - 80, 'SHIELD!', '#7dd3fc', 20)
      sfx.power()
      haptic.medium()
      return
    }
    setPhaseBoth('dying')
    w.anchor = null
    const sx = w.x - w.camX
    if (kind === 'lava') {
      fx.burst(sx, size.current.h - 30, { count: 30, color: ['#f97316', '#fde047', '#ef4444'], speed: 300, angle: -Math.PI / 2, spread: 1.4, gravity: 700 })
      fx.burst(sx, size.current.h - 40, { count: 10, color: ['#57534e', '#a8a29e'], speed: 60, size: 7, gravity: -60, life: 1.2 })
      sfx.boom(0.5)
    } else {
      fx.explode(sx, w.y, 1.2, ['#e5e7eb', '#ef4444', '#fde047'])
      fx.flash('#ef4444', 0.25)
      fx.stop(0.12)
      w.vx = -120
      w.vy = -300
      sfx.clang()
      sfx.hurt()
    }
    fx.shake(10, 0.35)
    haptic.error()
    sfx.lose()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const s = scoreOf(w)
      w.stats.score = s
      const coins = Math.round(w.stats.distance / 20 + w.gemCount * 0.3 + w.perfects * 0.5)
      run.end({ score: s, cleared: w.stats.distance >= 300, stats: { ...w.stats }, coins }, revive)
    }, 1100)
  }

  /** Ad revive: respawn just below the nearest hook ahead, flung upward. */
  function revive() {
    const w = world.current
    const { w: W, h: H } = size.current
    const ahead = w.anchors.filter((a) => a.x >= w.x - 60)
    const hook = ahead.length ? ahead.reduce((a, b) => (Math.abs(b.x - w.x) < Math.abs(a.x - w.x) ? b : a)) : w.anchors[w.anchors.length - 1]
    w.x = hook.x - 40
    w.y = Math.min(hook.y + 90, H * 0.55)
    w.vx = 260
    w.vy = -520
    w.anchor = null
    w.holding = false
    w.invuln = 2
    w.trail = []
    w.fires = []
    w.bats = []
    w.spikes = w.spikes.filter((p) => p.state === 'hang' && Math.abs(p.x - hook.x) > 260)
    if (w.serpent) {
      w.serpent.gap = 2.5
      w.serpent.warn = 1.1
      w.serpent.u = -1
    }
    w.saws = w.saws.filter((s) => Math.abs(s.x - hook.x) > 260)
    w.camX = w.x - W * 0.35
    const sx = w.x - w.camX
    fx.ring(sx, w.y, { color: '#67e8f9', maxR: 80, life: 0.5, width: 4 })
    fx.burst(sx, w.y, { count: 24, color: ['#67e8f9', '#ffffff', '#fde047'], speed: 240, gravity: 0 })
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'hold to grab' })
    setPhaseBoth('play')
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    world.current.holding = true
    grab()
  }

  function onPointerUp() {
    world.current.holding = false
    release()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.repeat || (e.key !== ' ' && e.key !== 'ArrowUp')) return
      e.preventDefault()
      world.current.holding = true
      grab()
    }
    function up(e: KeyboardEvent) {
      if (e.key !== ' ' && e.key !== 'ArrowUp') return
      world.current.holding = false
      release()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  function startSerpent() {
    const w = world.current
    const { w: W } = size.current
    w.serpent = { leaps: 4 + Math.min(2, w.serpents), x: W * rand(0.38, 0.5), warn: 1.2, u: -1, gap: 1.6, wave: w.serpents }
    w.fires = []
    setBanner({ key: Date.now(), text: 'LAVA SERPENT!', sub: 'dodge its leaps — watch the glowing lava' })
    sfx.boom(0.8)
    window.setTimeout(() => sfx.levelUp(), 250)
    fx.shake(10, 0.6)
    fx.flash('#f97316', 0.25)
    haptic.heavy()
  }

  function serpentDone() {
    const w = world.current
    w.serpent = null
    w.serpents += 1
    w.nextSerpent = w.stats.distance + SERPENT_EVERY
    w.bonus += 60
    // Reward: a gem arc ahead.
    for (let i = 0; i < 10; i++) {
      const k = (i / 9) * Math.PI
      w.gems.push({ x: w.x + 160 + i * 34, y: size.current.h * 0.42 - Math.sin(k) * 110, taken: false })
    }
    setBanner({ key: Date.now(), text: 'SERPENT REPELLED!', sub: '+60 points · gem shower' })
    fx.flash('#fde047', 0.25)
    sfx.win()
    haptic.success()
    milestone('boss', w.serpents)
    setHud({ score: scoreOf(w), dist: w.stats.distance })
  }

  /** Serpent path point for leap progress u (0..1); writes into SP. */
  function serpentPoint(sp: Serpent, u: number, lavaY: number, H: number) {
    SP.x = world.current.camX + sp.x + 150 - u * 300
    SP.y = lavaY + 20 - Math.sin(u * Math.PI) * (H * 0.36 + 20)
    return SP
  }

  function updateHazards(dt: number, W: number, H: number, lavaY: number) {
    const w = world.current
    const dM = w.stats.distance
    const sp = w.serpent
    if (!sp && dM >= w.nextSerpent) startSerpent()
    if (sp) {
      if (sp.gap > 0) sp.gap -= dt
      else if (sp.warn > 0) {
        if (sp.u < 0 && sp.warn >= 1.19) sfx.tick()
        sp.warn -= dt
        if (sp.warn <= 0) {
          sp.u = 0
          sfx.whoosh()
          fx.burst(sp.x + 150, lavaY, { count: 18, color: ['#fde047', '#f97316', '#ef4444'], speed: 320, angle: -Math.PI / 2, spread: 1.2, gravity: 700 })
          fx.shake(5, 0.25)
        }
      } else if (sp.u >= 0) {
        sp.u += dt / Math.max(1.15, 1.6 - sp.wave * 0.1)
        for (let i = 0; i < 10; i++) {
          const u = sp.u - i * 0.035
          if (u <= 0 || u >= 1) continue
          const p = serpentPoint(sp, u, lavaY, H)
          if (dist(p.x, p.y, w.x, w.y) < 20 - i * 0.6) {
            die('saw')
            break
          }
        }
        if (sp.u - 0.35 >= 1) {
          fx.burst(sp.x - 150, lavaY, { count: 14, color: ['#fde047', '#f97316'], speed: 260, angle: -Math.PI / 2, spread: 1.2, gravity: 700 })
          sp.leaps -= 1
          if (sp.leaps <= 0) serpentDone()
          else {
            sp.u = -1
            sp.gap = 0.7
            sp.warn = 1.1
            sp.x = W * rand(0.35, 0.55)
          }
        }
      }
    }
    // Bats from 400 m
    if (dM >= BAT_FROM && !w.serpent) {
      w.batT -= dt
      if (w.batT <= 0) {
        w.batT = rand(4.5, 7.5) * Math.max(0.5, 1 - (dM - BAT_FROM) * 0.0006)
        if (w.bats.length < 2) {
          const y = rand(H * 0.22, H * 0.6)
          w.bats.push({ x: w.camX + W + 20, y, baseY: y, warn: 1.1, ph: 0, vx: -(150 + Math.min(110, (dM - BAT_FROM) * 0.1)) })
          sfx.tick()
        }
      }
    }
    for (const b of w.bats) {
      b.ph += dt
      if (b.warn > 0) {
        b.warn -= dt
        b.x = w.camX + W + 20
        continue
      }
      b.x += b.vx * dt
      b.y = b.baseY + Math.sin(b.ph * 3.2) * 28
      if (dist(b.x, b.y, w.x, w.y) < 22) die('saw')
    }
    if (w.bats.length) w.bats = w.bats.filter((b) => b.x > w.camX - 60)
    for (const p of w.spikes) {
      if (p.state === 'hang') {
        if (w.x > p.x - 240 && w.x < p.x) {
          p.state = 'shake'
          p.shake = 0.65
          sfx.thud()
        }
      } else if (p.state === 'shake') {
        p.shake -= dt
        if (Math.random() < 0.3) fx.burst(p.x - w.camX + rand(-8, 8), 12, { count: 1, color: ['#78716c', '#a8a29e'], speed: 40, angle: Math.PI / 2, spread: 0.5, gravity: 600, size: 2.5 })
        if (p.shake <= 0) {
          p.state = 'fall'
          sfx.whoosh()
        }
      } else {
        p.vy += GRAVITY * 1.1 * dt
        p.y += p.vy * dt
      }
      if (Math.abs(w.x - p.x) < 11 + 8 * (1 - (w.y - p.y) / p.len) && w.y > p.y - 4 && w.y < p.y + p.len + 6) die('saw')
      if (p.y > lavaY) {
        p.y = 9999
        fx.burst(p.x - w.camX, lavaY, { count: 12, color: ['#fde047', '#f97316', '#78716c'], speed: 240, angle: -Math.PI / 2, spread: 1.4, gravity: 700 })
      }
    }
    if (w.spikes.length) w.spikes = w.spikes.filter((p) => p.y < 9000)
    for (const b of w.bubbles) {
      if (b.taken) continue
      if (dist(b.x, b.y, w.x, w.y) < 26) {
        b.taken = true
        w.bubble = Math.min(2, w.bubble + 1)
        const sx = b.x - w.camX
        fx.ring(sx, b.y, { color: '#a5f3fc', maxR: 50, life: 0.4 })
        fx.burst(sx, b.y, { count: 14, color: ['#a5f3fc', '#ffffff'], speed: 180, gravity: 0 })
        fx.text(sx, b.y - 30, 'BUBBLE SHIELD!', '#a5f3fc', 18)
        sfx.power()
        haptic.success()
      }
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const lavaY = H - 34

    if (ph === 'idle' || autoPlay.current) {
      // Attract mode: auto-swing from anchor to anchor.
      if (!w.anchor && w.vy > 0) {
        const next = w.anchors.find((a) => a.x > w.x + 40)
        if (next) {
          w.anchor = next
          w.ropeLen = dist(next.x, next.y, w.x, w.y)
        }
      }
      if (w.anchor && w.x > w.anchor.x + 40 && w.vy < 0) w.anchor = null
      if (ph === 'idle' && w.y > H * 0.8) {
        world.current = freshWorld(W, H)
        return
      }
    }

    if (ph !== 'over') {
      w.vy += GRAVITY * dt
      w.x += w.vx * dt
      w.y += w.vy * dt
      if (w.anchor) {
        w.ropeShoot = Math.min(1, w.ropeShoot + raw * 16)
        const dx = w.x - w.anchor.x
        const dy = w.y - w.anchor.y
        const d = Math.hypot(dx, dy) || 1
        // Reel in slightly for snappier swings.
        w.ropeLen = Math.max(70, w.ropeLen - 25 * dt)
        if (d > w.ropeLen) {
          const nx = dx / d
          const ny = dy / d
          w.x = w.anchor.x + nx * w.ropeLen
          w.y = w.anchor.y + ny * w.ropeLen
          const radial = w.vx * nx + w.vy * ny
          if (radial > 0) {
            w.vx -= radial * nx
            w.vy -= radial * ny
          }
          // Gentle pump keeps momentum alive.
          const tx = -ny
          const ty = nx
          const tang = w.vx * tx + w.vy * ty
          const boost = Math.abs(tang) < 520 ? 1 + 0.18 * dt : 1
          w.vx += tang * tx * (boost - 1)
          w.vy += tang * ty * (boost - 1)
        }
      }
      w.vx = clamp(w.vx, -700, 900)
      if (w.y < -80) w.vy = Math.max(w.vy, 0)
      w.camX = approach(w.camX, w.x - W * 0.35, 6, raw)
      extend(w)
      w.trail.push({ x: w.x, y: w.y, life: 0.35 })
    }
    for (const tr of w.trail) tr.life -= raw
    w.trail = w.trail.filter((tr) => tr.life > 0)

    if (ph === 'play') {
      if (w.x > w.maxX) w.maxX = w.x
      const dM = Math.floor((w.maxX - W * 0.2) / PX_PER_M)
      if (dM !== w.stats.distance) {
        w.stats.distance = dM
        w.stats.score = scoreOf(w)
        run.update(w.stats)
        setHud({ score: scoreOf(w), dist: dM })
        if (dM > 0 && dM % 250 === 0) {
          w.biome = (dM / 250) % BIOMES.length
          setBanner({ key: Date.now(), text: BIOMES[w.biome].name.toUpperCase(), sub: `${dM} m` })
          sfx.levelUp()
          haptic.success()
          if (dM % 500 === 0) milestone('distance', dM)
        } else if (dM === BAT_FROM) {
          setBanner({ key: Date.now(), text: 'CAVE BATS!', sub: 'red eyes at the edge = incoming' })
          sfx.levelUp()
        } else if (dM === SPIKE_FROM) {
          setBanner({ key: Date.now(), text: 'FALLING ROCKS!', sub: 'shaking stalactites drop' })
          sfx.levelUp()
        } else if (dM === 300) {
          setBanner({ key: Date.now(), text: 'FIREBALLS!', sub: 'watch the bubbling lava' })
          sfx.levelUp()
        } else if (dM > 0 && dM % 100 === 0) {
          fx.text(W / 2, H * 0.25, `${dM} m`, '#fde047', 26)
          sfx.levelUp()
        }
      }
      let got = false
      for (const g of w.gems) {
        if (g.taken) continue
        if (w.magnet > 0) {
          const d = dist(g.x, g.y, w.x, w.y)
          if (d < 22 + w.magnet * 2.5 && d > 1) {
            g.x += ((w.x - g.x) / d) * 380 * dt
            g.y += ((w.y - g.y) / d) * 380 * dt
          }
        }
        if (dist(g.x, g.y, w.x, w.y) < 22) {
          g.taken = true
          w.gemCount += 1
          w.stats.gems = w.gemCount
          fx.burst(g.x - w.camX, g.y, { count: 6, color: ['#67e8f9', '#ffffff'], speed: 100, gravity: 0, size: 2.5 })
          sfx.score(w.gemCount % 8)
          got = true
        }
      }
      if (got) {
        setHud({ score: scoreOf(w), dist: w.stats.distance })
        run.update(w.stats)
      }
      w.invuln = Math.max(0, w.invuln - dt)
      updateHazards(dt, W, H, lavaY)
      // Fireballs from 300 m on (paused while the serpent is out).
      if (w.stats.distance >= 300 && !w.serpent) {
        w.fireT -= dt
        if (w.fireT <= 0) {
          w.fireT = Math.max(1.4, 4 - w.stats.distance * 0.002) * rand(0.8, 1.3)
          if (w.fires.length < 3) w.fires.push({ x: w.camX + W * rand(0.55, 1), y: lavaY, vy: 0, warn: 0.9 })
        }
      }
      for (const f of w.fires) {
        if (f.warn > 0) {
          f.warn -= dt
          if (f.warn <= 0) {
            f.vy = -rand(780, 980)
            sfx.whoosh()
          }
          continue
        }
        f.vy += GRAVITY * 0.7 * dt
        f.y += f.vy * dt
        if (dist(f.x, f.y, w.x, w.y) < 18) die('saw')
      }
      w.fires = w.fires.filter((f) => f.y <= lavaY + 5 && f.x > w.camX - 60)
      for (const s of w.saws) {
        if (w.invuln <= 0 && dist(s.x, s.y, w.x, w.y) < s.r + 8) {
          die('saw')
          break
        }
      }
      if (w.y > lavaY) die('lava')
    }
    for (const s of w.saws) {
      s.t += dt
      s.y = s.baseY + Math.sin(s.t * 1.6) * s.amp
    }

    // ── Draw ─────────────────────────────────────
    const bio = BIOMES[w.biome]
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, bio.top)
    sky.addColorStop(0.6, bio.mid)
    sky.addColorStop(1, bio.low)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)
    // Far stalagmites (slow parallax)
    ctx.fillStyle = bio.rock
    ctx.globalAlpha = 0.5
    const farOff = Math.floor((w.camX * 0.12) / 90)
    for (let i = -1; i < 8; i++) {
      const px = i * 90 - ((w.camX * 0.12) % 90)
      const hh = 60 + (((i + farOff) * 37) % 5 + 5) % 5 * 22
      ctx.beginPath()
      ctx.moveTo(px - 26, H)
      ctx.lineTo(px, H - 60 - hh)
      ctx.lineTo(px + 26, H)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    // Cave pillars parallax
    ctx.fillStyle = bio.rock
    for (let i = -1; i < 6; i++) {
      const px = i * 120 - ((w.camX * 0.3) % 120)
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px + 50, 0)
      ctx.lineTo(px + 30, H * 0.25 + Math.sin(i * 7 + Math.floor((w.camX * 0.3) / 120)) * 30)
      ctx.fill()
    }

    if (bio.layer === 'shrooms') {
      // Giant glowing mushrooms
      for (let i = -1; i < 5; i++) {
        const seed = Math.floor((w.camX * 0.22) / 140) + i
        const px = i * 140 - ((w.camX * 0.22) % 140) + 40
        const hgt = 110 + (((seed * 53) % 4) + 4) % 4 * 26
        const capR = 34 + (((seed * 31) % 3) + 3) % 3 * 10
        const col = seed % 2 ? '#2dd4bf' : '#c084fc'
        ctx.fillStyle = 'rgba(6,78,59,0.75)'
        ctx.fillRect(px - 6, H - hgt, 12, hgt)
        glow(ctx, px, H - hgt, capR * 1.6, col, 0.28 + Math.sin(t * 1.5 + seed) * 0.08)
        ctx.fillStyle = col
        ctx.globalAlpha = 0.75
        ctx.beginPath()
        ctx.ellipse(px, H - hgt, capR, capR * 0.55, 0, Math.PI, 0)
        ctx.fill()
        ctx.fillStyle = '#f0fdfa'
        for (let d = -1; d <= 1; d++) {
          ctx.beginPath()
          ctx.arc(px + d * capR * 0.45, H - hgt - capR * 0.22 - Math.abs(d) * -4, 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
    } else if (bio.layer === 'mine') {
      // Timber supports with hanging lanterns
      for (let i = -1; i < 4; i++) {
        const px = i * 200 - ((w.camX * 0.4) % 200) + 60
        ctx.fillStyle = 'rgba(69,26,3,0.85)'
        ctx.fillRect(px - 7, H * 0.18, 14, H)
        ctx.fillRect(px + 113, H * 0.18, 14, H)
        ctx.fillRect(px - 14, H * 0.16, 148, 14)
        ctx.strokeStyle = 'rgba(28,25,23,0.9)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(px + 60, H * 0.16 + 14)
        ctx.lineTo(px + 60, H * 0.27)
        ctx.stroke()
        const flick = 0.45 + Math.sin(t * 9 + i) * 0.06
        glow(ctx, px + 60, H * 0.29, 46, '#fbbf24', flick)
        ctx.fillStyle = '#fde68a'
        ctx.beginPath()
        ctx.roundRect(px + 54, H * 0.27, 12, 15, 3)
        ctx.fill()
        ctx.fillStyle = '#78350f'
        ctx.fillRect(px + 52, H * 0.27 - 2, 16, 3)
      }
    }
    // Ambient motes per biome
    if (w.motes.length < 26 && Math.random() < raw * 14) {
      const up = bio.mote === 'ember' || bio.mote === 'spore'
      w.motes.push({ x: rand(0, W), y: up ? H : rand(-10, H * 0.3), vx: rand(-25, 5), vy: up ? rand(-55, -25) : bio.mote === 'snow' ? rand(30, 60) : rand(-8, 14), s: rand(1.5, 3.5), ph: rand(0, 6) })
    }
    for (const m of w.motes) {
      m.ph += raw
      m.x += (m.vx + Math.sin(m.ph * 1.7) * 14) * raw
      m.y += m.vy * raw
      const a = bio.mote === 'spark' || bio.mote === 'void' ? 0.4 + Math.sin(m.ph * 5) * 0.4 : 0.8
      if (bio.mote === 'ember' || bio.mote === 'spore') glow(ctx, m.x, m.y, m.s * 3.5, bio.moteColor, 0.35 * a)
      ctx.globalAlpha = Math.max(0, a)
      ctx.fillStyle = bio.moteColor
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.s * (bio.mote === 'snow' ? 1 : 0.7), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (w.motes.length) w.motes = w.motes.filter((m) => m.y > -20 && m.y < H + 20 && m.x > -20 && m.x < W + 20)

    fx.applyShake(ctx)
    const ox = -w.camX

    // Ceiling rocks
    ctx.fillStyle = bio.ceil
    ctx.fillRect(0, 0, W, 10)

    for (const a of w.anchors) {
      const ax = a.x + ox
      if (ax < -20 || ax > W + 20) continue
      const inRange = !w.anchor && ph === 'play' && a.x > w.x - 30 && dist(a.x, a.y, w.x, w.y) < w.range && a.y < w.y + 20
      if (inRange) glow(ctx, ax, a.y, 22, '#fde047', 0.45 + Math.sin(t * 10) * 0.15)
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(ax, 0)
      ctx.lineTo(ax, a.y)
      ctx.stroke()
      ctx.fillStyle = a === w.anchor ? '#fde047' : '#e2e8f0'
      ctx.beginPath()
      ctx.arc(ax, a.y, 7, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    for (const g of w.gems) {
      if (g.taken) continue
      const gx = g.x + ox
      if (gx < -20 || gx > W + 20) continue
      ctx.drawImage(getGemSprite(), gx - 14, g.y + Math.sin(t * 4 + g.x) * 2 - 14, 28, 28)
    }

    for (const s of w.saws) {
      const sx = s.x + ox
      if (sx < -40 || sx > W + 40) continue
      ctx.save()
      ctx.translate(sx, s.y)
      ctx.rotate(s.t * 9)
      ctx.fillStyle = '#cbd5e1'
      ctx.beginPath()
      const teeth = 12
      for (let i = 0; i < teeth * 2; i++) {
        const rr = i % 2 ? s.r * 0.78 : s.r
        const a = (i / (teeth * 2)) * Math.PI * 2
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#475569'
      ctx.beginPath()
      ctx.arc(0, 0, s.r * 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      if (s.amp > 0) {
        ctx.strokeStyle = 'rgba(203,213,225,0.15)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(sx, s.baseY - s.amp)
        ctx.lineTo(sx, s.baseY + s.amp)
        ctx.stroke()
      }
    }

    for (const b of w.bubbles) {
      if (b.taken) continue
      const bx = b.x + ox
      if (bx < -30 || bx > W + 30) continue
      drawBubble(ctx, bx, b.y + Math.sin(t * 3 + b.x) * 3, 13, t)
    }

    for (const p of w.spikes) {
      const px = p.x + ox + (p.state === 'shake' ? Math.sin(t * 70) * 2.5 : 0)
      if (px < -30 || px > W + 30) continue
      drawSpike(ctx, px, p.y, p.len, p.state !== 'hang')
    }

    for (const b of w.bats) {
      if (b.warn > 0) {
        const pulse = 0.5 + Math.sin(t * 16) * 0.4
        glow(ctx, W - 18, b.y, 30, '#ef4444', 0.45 * pulse + 0.3)
        ctx.fillStyle = 'rgba(69,10,10,0.85)'
        ctx.beginPath()
        ctx.arc(W - 17, b.y, 13, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.fillStyle = '#fca5a5'
        ctx.beginPath()
        ctx.arc(W - 22, b.y, 3.2, 0, Math.PI * 2)
        ctx.arc(W - 12, b.y, 3.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fecaca'
        ctx.font = "900 16px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('!', W - 17, b.y - 20)
        continue
      }
      drawBat(ctx, b.x + ox, b.y, b.ph)
    }

    for (const f of w.fires) {
      const fx0 = f.x + ox
      if (f.warn > 0) {
        const k = 1 - f.warn / 0.9
        glow(ctx, fx0, lavaY, 18 + k * 18, '#fde047', 0.4 + k * 0.4)
        ctx.fillStyle = '#fef08a'
        for (let i = 0; i < 3; i++) {
          ctx.beginPath()
          ctx.arc(fx0 + Math.sin(t * 9 + i * 2) * 8, lavaY - 3 - ((t * 30 + i * 6) % 10), 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
        continue
      }
      glow(ctx, fx0, f.y, 30, '#f97316', 0.6)
      const up = f.vy < 0
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.moveTo(fx0 - 11, f.y)
      ctx.quadraticCurveTo(fx0, f.y + (up ? 34 : -34), fx0 + 11, f.y)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fb923c'
      ctx.beginPath()
      ctx.arc(fx0, f.y, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(fx0 - 2, f.y - 2, 5, 0, Math.PI * 2)
      ctx.fill()
      // Angry eyes so it reads as a hazard.
      ctx.fillStyle = '#7f1d1d'
      ctx.fillRect(fx0 - 5, f.y - 1, 3, 3)
      ctx.fillRect(fx0 + 2, f.y - 1, 3, 3)
    }

    // Speed trail
    for (let i = 1; i < w.trail.length; i++) {
      const a = w.trail[i - 1]
      const b = w.trail[i]
      ctx.globalAlpha = (b.life / 0.35) * 0.5
      ctx.strokeStyle = '#67e8f9'
      ctx.lineWidth = 6 * (b.life / 0.35)
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(a.x + ox, a.y)
      ctx.lineTo(b.x + ox, b.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    if (ph !== 'over' || w.y < H) {
      const px = w.x + ox
      if (w.anchor) {
        const ax = w.anchor.x + ox
        const k = w.ropeShoot
        const ex = px + (ax - px) * k
        const ey = w.y + (w.anchor.y - w.y) * k
        ctx.strokeStyle = '#fef3c7'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(px, w.y)
        // Slack wobble right after attaching.
        const wob = (1 - k) * 12
        ctx.quadraticCurveTo((px + ex) / 2 + wob, (w.y + ey) / 2 + wob, ex, ey)
        ctx.stroke()
      }
      const ang = Math.atan2(w.vy, w.vx)
      ctx.save()
      ctx.translate(px, w.y)
      ctx.rotate(ang * 0.4)
      glow(ctx, 0, 0, 22, w.invuln > 0 ? '#ffffff' : '#22d3ee', w.invuln > 0 ? 0.6 : 0.35)
      // Scarf streaming behind
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-6, 3)
      ctx.quadraticCurveTo(-16, 2 + Math.sin(t * 20) * 3, -24, 6 + Math.sin(t * 20 + 1) * 5)
      ctx.stroke()
      const body = ctx.createRadialGradient(-3, -4, 1, 0, 0, 12)
      body.addColorStop(0, '#fdba74')
      body.addColorStop(1, '#ea580c')
      ctx.fillStyle = body
      ctx.beginPath()
      ctx.arc(0, 0, 11, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#7c2d12'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = '#1e293b'
      ctx.beginPath()
      ctx.roundRect(-8, -6, 17, 7, 3)
      ctx.fill()
      ctx.fillStyle = '#67e8f9'
      ctx.fillRect(1, -4.5, 6, 3)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(5, -4.5, 1.5, 1.5)
      ctx.restore()
      if (w.y < 0) {
        ctx.fillStyle = '#fde047'
        ctx.beginPath()
        ctx.moveTo(px, 14)
        ctx.lineTo(px - 7, 26)
        ctx.lineTo(px + 7, 26)
        ctx.fill()
      }
    }

    const sp = w.serpent
    if (sp) {
      if (sp.u < 0 && sp.gap <= 0) {
        // Telegraph: glowing lava + dotted leap path
        const k = 1 - sp.warn / 1.1
        glow(ctx, sp.x + 150, lavaY, 30 + k * 30, '#fde047', 0.4 + k * 0.4)
        ctx.strokeStyle = `rgba(254,202,202,${0.25 + k * 0.5})`
        ctx.lineWidth = 3
        ctx.setLineDash([8, 10])
        ctx.beginPath()
        for (let i = 0; i <= 16; i++) {
          const p = serpentPoint(sp, i / 16, lavaY, H)
          if (i === 0) ctx.moveTo(p.x + ox, p.y)
          else ctx.lineTo(p.x + ox, p.y)
        }
        ctx.stroke()
        ctx.setLineDash([])
      } else if (sp.u >= 0) {
        let n = 0
        for (let i = 0; i < 10; i++) {
          const u = sp.u - i * 0.035
          if (u <= 0 || u >= 1) continue
          const p = serpentPoint(sp, u, lavaY, H)
          SERP_PTS[n * 2] = p.x + ox
          SERP_PTS[n * 2 + 1] = p.y
          n++
        }
        if (n > 0) {
          glow(ctx, SERP_PTS[0], SERP_PTS[1], 50, '#f97316', 0.4)
          drawSerpent(ctx, SERP_PTS, n, t)
        }
      }
    }

    if (w.bubble > 0 && ph !== 'over') {
      const px = w.x + ox
      ctx.strokeStyle = 'rgba(165,243,252,0.85)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(px, w.y, 19 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(165,243,252,0.14)'
      ctx.fill()
      if (w.bubble > 1) {
        ctx.beginPath()
        ctx.arc(px, w.y, 24, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // Lava
    w.lavaT += raw
    const lg = ctx.createLinearGradient(0, lavaY - 10, 0, H)
    lg.addColorStop(0, '#fde047')
    lg.addColorStop(0.3, '#f97316')
    lg.addColorStop(1, '#7f1d1d')
    ctx.fillStyle = lg
    ctx.beginPath()
    ctx.moveTo(0, H)
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, lavaY + Math.sin(x * 0.05 + w.lavaT * 3 + w.camX * 0.05) * 4)
    ctx.lineTo(W, H)
    ctx.fill()
    glow(ctx, W / 2, H, W * 0.7, '#f97316', 0.35)
    if (Math.random() < 0.3) fx.burst(rand(0, W), lavaY, { count: 1, color: ['#fde047', '#fb923c'], speed: 80, angle: -Math.PI / 2, spread: 0.6, gravity: 300, size: 2.5, life: 0.6 })

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const hook = {
      /** Teleport ahead to distance m (rebuilds the hooks ahead). */
      jump(m: number) {
        const w = world.current
        const { w: W, h: H } = size.current
        w.x = W * 0.2 + m * PX_PER_M
        w.maxX = w.x
        w.y = H * 0.3
        w.vx = 260
        w.vy = -300
        w.anchor = null
        w.camX = w.x - W * 0.35
        w.anchors = [{ x: w.x + 110, y: H * 0.2 }]
        w.saws = []
        w.gems = []
        w.spikes = []
        w.bubbles = []
        w.fires = []
        w.bats = []
        w.nextBubble = m
        extend(w)
      },
      biome(i: number) {
        world.current.biome = i % BIOMES.length
      },
      god(on: boolean) {
        world.current.invuln = on ? 9999 : 0
      },
      serpent: () => startSerpent(),
      auto(on: boolean) {
        autoPlay.current = on
      },
      bat() {
        const w = world.current
        w.bats.push({ x: w.camX + size.current.w + 20, y: w.y, baseY: w.y, warn: 1.1, ph: 0, vx: -170 })
      },
      state: () => {
        const w = world.current
        return { d: w.stats.distance, biome: BIOMES[w.biome].name, bats: w.bats.length, spikes: w.spikes.length, bubbles: w.bubbles.length, serpent: w.serpent?.leaps ?? null, bubble: w.bubble }
      },
    }
    ;(window as unknown as Record<string, unknown>).__en1_swing = hook
  })

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">{hud.dist} m</div>
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
              game="swing"
              icon={meta.icon}
              title={meta.title}
              hint="Hold to fire your grapple, release to fly. Let go on the up-swing for a PERFECT boost."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.dist >= 300 ? 'Sky swinger!' : 'Burned out'}
            subtitle={`Score ${hud.score} · ${hud.dist} m`}
            celebrate={hud.dist >= 300}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
