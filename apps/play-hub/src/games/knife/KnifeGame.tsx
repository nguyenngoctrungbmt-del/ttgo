import { trackEvent } from '../../analytics/analytics'
import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import { Fx, glow, rand } from '../../shared/action/fx'
import { useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import ActionResult from '../../shared/action/ActionResult'
import { useActionRun } from '../../shared/action/useActionRun'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'

const meta = getGame('knife')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type Flying = { y: number }
type Loose = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number }
type Chunk = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; a0: number; a1: number; life: number }
type Apple = { a: number; hit: boolean }

type BossArt = 'cheese' | 'shield' | 'pizza' | 'donut'
type Skin = { name: string; face: string; ring: string; rim: string; boss?: BossArt }
const SKINS: Skin[] = [
  { name: 'Oak', face: '#d6a46b', ring: '#b07a45', rim: '#7c4a21' },
  { name: 'Birch', face: '#f1d9b5', ring: '#cfae84', rim: '#8b6b4a' },
  { name: 'Redwood', face: '#c2703d', ring: '#93502a', rim: '#5c2d14' },
]
const BOSSES: Skin[] = [
  { name: 'Cheese Wheel', face: '#facc15', ring: '#eab308', rim: '#a16207', boss: 'cheese' },
  { name: 'Iron Shield', face: '#94a3b8', ring: '#64748b', rim: '#334155', boss: 'shield' },
  { name: 'Pizza', face: '#fb923c', ring: '#dc2626', rim: '#92400e', boss: 'pizza' },
  { name: 'Donut', face: '#f9a8d4', ring: '#ec4899', rim: '#a16207', boss: 'donut' },
]

/** Boss target face decorations, drawn in the target's rotated frame. */
function drawBossFace(ctx: CanvasRenderingContext2D, art: BossArt, R: number) {
  const r = R * 0.9
  if (art === 'cheese') {
    ctx.fillStyle = '#eab308'
    const holes: [number, number, number][] = [[0.35, 0.2, 0.14], [-0.4, 0.3, 0.1], [-0.15, -0.45, 0.16], [0.45, -0.35, 0.08], [0, 0.55, 0.09], [-0.55, -0.1, 0.07]]
    for (const [x, y, s] of holes) {
      ctx.beginPath()
      ctx.arc(x * r, y * r, s * r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    for (const [x, y, s] of holes) {
      ctx.beginPath()
      ctx.arc(x * r - s * r * 0.3, y * r - s * r * 0.3, s * r * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (art === 'shield') {
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = R * 0.1
    ctx.beginPath()
    ctx.moveTo(-r * 0.85, 0)
    ctx.lineTo(r * 0.85, 0)
    ctx.moveTo(0, -r * 0.85)
    ctx.lineTo(0, r * 0.85)
    ctx.stroke()
    ctx.fillStyle = '#cbd5e1'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.arc(-r * 0.08, -r * 0.08, r * 0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#e2e8f0'
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      ctx.beginPath()
      ctx.arc(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, R * 0.045, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (art === 'pizza') {
    ctx.fillStyle = '#fde68a'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#b45309'
    ctx.lineWidth = 2
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86)
      ctx.lineTo(-Math.cos(a) * r * 0.86, -Math.sin(a) * r * 0.86)
      ctx.stroke()
    }
    const pep: [number, number][] = [[0.4, 0.15], [-0.35, 0.4], [-0.2, -0.45], [0.3, -0.5], [-0.6, -0.05], [0.1, 0.6], [0.62, -0.1]]
    for (const [x, y] of pep) {
      ctx.fillStyle = '#dc2626'
      ctx.beginPath()
      ctx.arc(x * r, y * r, r * 0.13, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#991b1b'
      ctx.beginPath()
      ctx.arc(x * r + r * 0.03, y * r + r * 0.03, r * 0.04, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = '#16a34a'
    for (const [x, y] of [[0.05, 0.1], [-0.5, 0.55], [0.55, 0.45]]) {
      ctx.beginPath()
      ctx.ellipse(x * r, y * r, r * 0.07, r * 0.035, x * 5, 0, Math.PI * 2)
      ctx.fill()
    }
  } else {
    ctx.fillStyle = '#d97706'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2)
    ctx.fill()
    // Frosting with a wavy edge
    ctx.fillStyle = '#f472b6'
    ctx.beginPath()
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2
      const rr = r * (0.8 + Math.sin(i * 2.1) * 0.05)
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    ctx.fill()
    const cols = ['#fde047', '#60a5fa', '#ffffff', '#4ade80']
    ctx.lineWidth = R * 0.04
    ctx.lineCap = 'round'
    for (let i = 0; i < 18; i++) {
      const a = i * 2.4
      const d = r * (0.38 + ((i * 37) % 10) / 28)
      const x = Math.cos(a) * d
      const y = Math.sin(a) * d
      ctx.strokeStyle = cols[i % cols.length]
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(i) * R * 0.07, y + Math.sin(i) * R * 0.07)
      ctx.stroke()
    }
    ctx.fillStyle = '#1e293b'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#b45309'
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

/** Apple pickup on the rim; ang points the stem outward. */
function drawApple(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)
  const g = ctx.createRadialGradient(-4, -4, 1, 0, 0, 13)
  g.addColorStop(0, '#fca5a5')
  g.addColorStop(0.45, '#ef4444')
  g.addColorStop(1, '#991b1b')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.moveTo(0, -7)
  ctx.bezierCurveTo(6, -13, 14, -6, 12, 2)
  ctx.bezierCurveTo(10, 10, 4, 13, 0, 10)
  ctx.bezierCurveTo(-4, 13, -10, 10, -12, 2)
  ctx.bezierCurveTo(-14, -6, -6, -13, 0, -7)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.ellipse(-5, -3, 2.2, 3.6, 0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#78350f'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, -7)
  ctx.quadraticCurveTo(1, -11, 3, -13)
  ctx.stroke()
  ctx.fillStyle = '#22c55e'
  ctx.beginPath()
  ctx.ellipse(6, -12, 4.5, 2.2, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const KNIFE_LEN = 72
const BLADE = 42
const EMBED = 14
const HIT_TOL = 0.16
const APPLE_TOL = 0.2
const THROW_SPEED = 2100

type World = {
  stage: number
  boss: boolean
  skin: Skin
  rot: number
  omega: number
  patternT: number
  pattern: number
  stuck: number[]
  apples: Apple[]
  left: number
  total: number
  flying: Flying[]
  loose: Loose[]
  chunks: Chunk[]
  wobble: number
  cooldown: number
  clearT: number
  appleCount: number
  score: number
  /** Collisions the Guardian upgrade can still forgive this run. */
  guards: number
  /** Guards left when the current stage began (for the no-save star). */
  stageGuards: number
  stats: { score: number; stage: number; knives: number; apples: number; bosses: number }
}

function angDiff(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

function freshWorld(): World {
  return {
    stage: 0,
    boss: false,
    skin: SKINS[0],
    rot: 0,
    omega: 1.6,
    patternT: 0,
    pattern: 0,
    stuck: [],
    apples: [],
    left: 0,
    total: 0,
    flying: [],
    loose: [],
    chunks: [],
    wobble: 0,
    cooldown: 0,
    clearT: 0,
    appleCount: 0,
    score: 0,
    guards: 0,
    stageGuards: 0,
    stats: { score: 0, stage: 0, knives: 0, apples: 0, bosses: 0 },
  }
}

export default function KnifeGame() {
  const run = useActionRun('knife')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 520 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, stage: 1, left: 0, total: 0, apples: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, stage: w.stage, left: w.left, total: w.total, apples: w.appleCount })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const R = Math.max(60, Math.min(W * 0.27, H * 0.17))
    return { cx: W / 2, cy: H * 0.34, R, throwY: H - 70 }
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.guards = run.level('guard')
    // nextStage() increments, so begin one below the chosen level.
    w.stage = Math.max(0, level - 1)
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    nextStage()
  }

  function nextStage() {
    const w = world.current
    w.stage += 1
    w.stats.stage = w.stage
    w.stageGuards = w.guards
    w.boss = w.stage % 5 === 0
    w.skin = w.boss ? BOSSES[Math.floor(w.stage / 5 - 1) % BOSSES.length] : SKINS[(w.stage - 1) % SKINS.length]
    w.total = Math.min(12, 5 + Math.floor(w.stage * 0.6) + (w.boss ? 2 : 0))
    w.left = w.total
    w.rot = rand(0, Math.PI * 2)
    w.patternT = 0
    w.pattern = w.boss ? 3 : w.stage < 3 ? 0 : Math.floor(Math.random() * 3)
    w.omega = (1.5 + w.stage * 0.08) * (Math.random() < 0.5 ? 1 : -1)
    w.flying = []
    // Pre-stuck obstacle knives, spread out.
    const pre = w.stage === 1 ? 0 : Math.min(4, 1 + Math.floor(w.stage / 3))
    w.stuck = []
    for (let i = 0; i < pre; i++) w.stuck.push((i / pre) * Math.PI * 2 + rand(-0.3, 0.3))
    const appleBoost = run.level('orchard') * 0.12
    const apples = Math.random() < 0.7 + appleBoost ? 1 + (Math.random() < 0.3 + appleBoost ? 1 : 0) : 0
    w.apples = []
    for (let i = 0; i < apples; i++) {
      let a = rand(0, Math.PI * 2)
      for (let tries = 0; tries < 10 && w.stuck.some((k) => Math.abs(angDiff(k, a)) < 0.5); tries++) a = rand(0, Math.PI * 2)
      w.apples.push({ a, hit: false })
    }
    pushHud()
    run.update(w.stats)
    setBanner({
      key: Date.now(),
      text: w.boss ? `BOSS: ${w.skin.name}` : `STAGE ${w.stage}`,
      sub: w.stage === 1 ? 'tap to throw' : w.boss ? 'watch the spin' : undefined,
    })
    if (w.boss) sfx.boom(0.4)
    else sfx.ready()
  }

  function throwKnife() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.left <= 0 || w.cooldown > 0) return
    w.left -= 1
    w.cooldown = 0.09
    w.flying.push({ y: geo().throwY })
    sfx.whoosh()
    pushHud()
  }

  function fail() {
    const w = world.current
    const { cx, cy, R } = geo()
    const contactY = cy + R + KNIFE_LEN - EMBED
    w.loose.push({ x: cx, y: contactY, vx: rand(-260, 260), vy: 420, rot: -Math.PI / 2, vr: rand(-18, 18), life: 2 })
    fx.burst(cx, contactY - 6, { count: 20, color: ['#fde047', '#ffffff', '#fb923c'], speed: 300, shape: 'spark', gravity: 200 })
    sfx.clang()
    // Guardian upgrade forgives a collision.
    if (w.guards > 0) {
      w.guards -= 1
      fx.text(cx, contactY - 40, 'GUARDED!', '#7dd3fc', 20)
      fx.ring(cx, contactY - 6, { color: '#7dd3fc', maxR: 50, life: 0.35 })
      fx.shake(6, 0.2)
      haptic.medium()
      if (w.left === 0 && w.flying.length === 0) clearStage()
      return
    }
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.3)
    fx.stop(0.15)
    fx.shake(12, 0.4)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.stage * 3 + w.appleCount * 2) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.stage >= 5, stats: { ...w.stats }, coins }, revive)
    }, 1100)
  }

  /** Ad revive: hand back the knife that clanged and resume the stage. */
  function revive() {
    const w = world.current
    w.left += 1
    w.cooldown = 0.4
    fx.ring(geo().cx, geo().throwY, { color: '#fde047', maxR: 60, life: 0.5 })
    setBanner({ key: Date.now(), text: 'REVIVED!' })
    pushHud()
    setPhaseBoth('play')
  }

  function stick() {
    const w = world.current
    const { cx, cy, R } = geo()
    const local = Math.PI / 2 - w.rot
    if (w.stuck.some((k) => Math.abs(angDiff(k, local)) < HIT_TOL)) {
      fail()
      return
    }
    w.stuck.push(local)
    w.wobble = 1
    w.stats.knives += 1
    w.score += 1
    fx.burst(cx, cy + R, { count: 10, color: [w.skin.face, w.skin.rim, w.skin.ring], speed: 180, angle: Math.PI / 2, spread: 1.6, shape: 'square', size: 4, gravity: 600 })
    fx.shake(3, 0.1)
    fx.stop(0.03)
    sfx.thud()
    haptic.light()
    for (const ap of w.apples) {
      if (!ap.hit && Math.abs(angDiff(ap.a, local)) < APPLE_TOL) {
        ap.hit = true
        w.appleCount += 1
        w.stats.apples += 1
        w.score += 2
        const ax = cx + Math.cos(ap.a + w.rot) * (R + 16)
        const ay = cy + Math.sin(ap.a + w.rot) * (R + 16)
        fx.burst(ax, ay, { count: 14, color: ['#ef4444', '#fecaca', '#fef9c3'], speed: 220, gravity: 500 })
        fx.text(ax, ay - 20, '+2 APPLE', '#fecaca', 18)
        sfx.pop()
        sfx.power()
        haptic.medium()
      }
    }
    w.stats.score = w.score
    run.update(w.stats)
    pushHud()
    if (w.left === 0 && w.flying.length === 0) clearStage()
  }

  function clearStage() {
    const w = world.current
    const { cx, cy, R } = geo()
    setPhaseBoth('clear')
    w.clearT = 1.3
    const bonus = w.boss ? 20 : 5
    w.score += bonus
    if (w.boss) w.stats.bosses += 1
    w.stats.score = w.score
    // Stars: clearing = 1, every apple sliced = +1, no Guardian save needed = +1.
    const applesAll = w.apples.every((ap) => ap.hit)
    const stars = 1 + (applesAll ? 1 : 0) + (w.guards === w.stageGuards ? 1 : 0)
    const cleared = run.completeLevel(w.stage, stars)
    if (cleared.firstClear && w.stage % 5 === 0) void trackEvent('action_milestone', { game_id: 'knife', kind: 'level', value: w.stage })
    // Log bursts into wedges; stuck knives fly off.
    const pieces = 6
    for (let i = 0; i < pieces; i++) {
      const a0 = (i / pieces) * Math.PI * 2 + w.rot
      const a1 = ((i + 1) / pieces) * Math.PI * 2 + w.rot
      const mid = (a0 + a1) / 2
      w.chunks.push({ x: cx, y: cy, vx: Math.cos(mid) * rand(180, 320), vy: Math.sin(mid) * rand(180, 320) - 200, rot: 0, vr: rand(-6, 6), a0, a1, life: 1.6 })
    }
    for (const k of w.stuck) {
      const a = k + w.rot
      w.loose.push({ x: cx + Math.cos(a) * (R + KNIFE_LEN / 2 - EMBED), y: cy + Math.sin(a) * (R + KNIFE_LEN / 2 - EMBED), vx: Math.cos(a) * rand(200, 380), vy: Math.sin(a) * rand(200, 380) - 150, rot: a, vr: rand(-12, 12), life: 1.6 })
    }
    w.stuck = []
    w.apples = []
    fx.explode(cx, cy, w.boss ? 2 : 1.3, [w.skin.face, w.skin.ring, '#ffffff', '#fde047'])
    fx.stop(0.1)
    fx.flash('#ffffff', 0.2)
    sfx.boom(w.boss ? 0.9 : 0.6)
    sfx.win()
    haptic.success()
    setBanner({ key: Date.now(), text: w.boss ? 'BOSS DOWN!' : 'CLEAR!', sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  +${bonus}` })
    run.update(w.stats)
    pushHud()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        throwKnife()
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  function drawKnife(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, alpha = 1) {
    // ang points from handle toward tip.
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(x, y)
    ctx.rotate(ang)
    ctx.fillStyle = '#e2e8f0'
    ctx.beginPath()
    ctx.moveTo(KNIFE_LEN / 2, 0)
    ctx.lineTo(KNIFE_LEN / 2 - BLADE, -5)
    ctx.lineTo(KNIFE_LEN / 2 - BLADE, 5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(KNIFE_LEN / 2 - BLADE, -1, BLADE - 6, 2)
    ctx.fillStyle = '#334155'
    ctx.fillRect(KNIFE_LEN / 2 - BLADE - 3, -7, 3, 14)
    ctx.fillStyle = '#7c2d12'
    ctx.beginPath()
    ctx.roundRect(-KNIFE_LEN / 2, -4.5, KNIFE_LEN - BLADE - 3, 9, 3)
    ctx.fill()
    ctx.restore()
  }

  function frame({ ctx, w: W, h: H, raw }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const { cx, cy, R, throwY } = geo()

    if (ph === 'idle' && w.stage === 0) {
      w.skin = SKINS[0]
      if (w.stuck.length === 0) w.stuck = [0.4, 2.2, 4.1]
    }

    // Spin patterns
    w.patternT += dt
    let omega = w.omega
    if (w.pattern === 1) omega = w.omega * (0.7 + Math.sin(w.patternT * 1.6) * 0.6)
    else if (w.pattern === 2) omega = w.omega * (Math.sin(w.patternT * 0.9) > 0 ? 1.25 : 0.35)
    else if (w.pattern === 3) {
      // Boss: surges, stalls and reversals.
      const cycle = w.patternT % 3.2
      omega = cycle < 1.4 ? w.omega * 1.5 : cycle < 1.9 ? w.omega * 0.1 : -w.omega * 1.1
    }
    if (ph !== 'clear') w.rot += omega * dt
    w.wobble = Math.max(0, w.wobble - raw * 6)
    w.cooldown = Math.max(0, w.cooldown - raw)

    if (ph === 'play') {
      const tipTarget = cy + R + KNIFE_LEN / 2 - EMBED
      for (const k of w.flying) {
        k.y -= THROW_SPEED * dt
      }
      const landed = w.flying.filter((k) => k.y <= tipTarget)
      w.flying = w.flying.filter((k) => k.y > tipTarget)
      for (let i = 0; i < landed.length && phaseRef.current === 'play'; i++) stick()
    } else if (ph === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0) {
        setPhaseBoth('play')
        nextStage()
      }
    }

    for (const l of w.loose) {
      l.vy += 1400 * dt
      l.x += l.vx * dt
      l.y += l.vy * dt
      l.rot += l.vr * dt
      l.life -= raw
    }
    w.loose = w.loose.filter((l) => l.life > 0)
    for (const c of w.chunks) {
      c.vy += 1200 * dt
      c.x += c.vx * dt
      c.y += c.vy * dt
      c.rot += c.vr * dt
      c.life -= raw
    }
    w.chunks = w.chunks.filter((c) => c.life > 0)

    // ── Draw ─────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, w.boss ? '#3b0764' : '#1e293b')
    bg.addColorStop(1, w.boss ? '#1e1b4b' : '#0f172a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    glow(ctx, cx, cy, R * 2.4, w.boss ? '#a855f7' : '#f59e0b', 0.18)

    fx.applyShake(ctx)

    const showLog = ph !== 'clear' && !(ph === 'over' && w.chunks.length)
    if (showLog) {
      const bump = 1 + w.wobble * 0.04
      const yOff = -w.wobble * 5
      // Stuck knives (behind log face so blades sink in).
      for (const k of w.stuck) {
        const a = k + w.rot
        const d = R + KNIFE_LEN / 2 - EMBED
        drawKnife(ctx, cx + Math.cos(a) * d, cy + yOff + Math.sin(a) * d, a + Math.PI)
      }
      ctx.save()
      ctx.translate(cx, cy + yOff)
      ctx.scale(bump, bump)
      ctx.rotate(w.rot)
      ctx.fillStyle = w.skin.rim
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = w.skin.face
      ctx.beginPath()
      ctx.arc(0, 0, R * 0.9, 0, Math.PI * 2)
      ctx.fill()
      if (w.skin.boss) drawBossFace(ctx, w.skin.boss, R)
      else {
        ctx.strokeStyle = w.skin.ring
        ctx.lineWidth = 2
        for (let r = R * 0.2; r < R * 0.85; r += R * 0.17) {
          ctx.beginPath()
          ctx.arc(R * 0.03, -R * 0.02, r, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.fillStyle = w.skin.ring
        ctx.beginPath()
        ctx.arc(0, 0, R * 0.07, 0, Math.PI * 2)
        ctx.fill()
        // Marker so the spin reads clearly.
        ctx.strokeStyle = w.skin.rim
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(R * 0.25, 0)
        ctx.lineTo(R * 0.7, R * 0.12)
        ctx.stroke()
      }
      ctx.restore()
      // Soft top-left highlight gives the target some volume.
      glow(ctx, cx - R * 0.35, cy + yOff - R * 0.35, R * 0.6, '#ffffff', 0.12)

      for (const ap of w.apples) {
        if (ap.hit) continue
        const a = ap.a + w.rot
        drawApple(ctx, cx + Math.cos(a) * (R + 14), cy + yOff + Math.sin(a) * (R + 14), a + Math.PI / 2)
      }
    }

    for (const c of w.chunks) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, c.life * 1.5)
      ctx.translate(c.x, c.y)
      ctx.rotate(c.rot)
      ctx.fillStyle = w.skin.face
      ctx.strokeStyle = w.skin.rim
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, R * 0.95, c.a0, c.a1)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()
    }

    for (const l of w.loose) drawKnife(ctx, l.x, l.y, l.rot, Math.min(1, l.life * 1.5))

    for (const k of w.flying) {
      ctx.globalAlpha = 0.25
      drawKnife(ctx, cx, k.y + 30, -Math.PI / 2)
      ctx.globalAlpha = 1
      drawKnife(ctx, cx, k.y, -Math.PI / 2)
    }

    // Ready knife at the bottom
    if ((ph === 'play' && w.left > 0) || ph === 'idle') {
      const ready = w.cooldown <= 0 && w.flying.length === 0
      drawKnife(ctx, cx, throwY + (ready ? 0 : 10), -Math.PI / 2, ready ? 1 : 0.5)
    }

    // Remaining knives column
    if (ph !== 'idle') {
      for (let i = 0; i < w.total; i++) {
        const used = i >= w.left
        const kx = 22
        const ky = H - 30 - i * 22
        ctx.save()
        ctx.translate(kx, ky)
        ctx.rotate(-Math.PI / 2)
        ctx.globalAlpha = used ? 0.25 : 1
        ctx.fillStyle = used ? '#475569' : '#e2e8f0'
        ctx.fillRect(-9, -3, 18, 6)
        ctx.fillStyle = used ? '#334155' : '#7c2d12'
        ctx.fillRect(-9, -3, 7, 6)
        ctx.restore()
      }
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
        <div className="action-arena" onPointerDown={() => throwKnife()}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Stage {hud.stage}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">🍎 {hud.apples}</span>
              </div>
            </div>
          )}
          {banner && (phase === 'play' || phase === 'clear') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="knife"
              icon={meta.icon}
              title={meta.title}
              hint="Tap to throw. Stick every knife into the spinning target — but never hit another knife."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.stage >= 5 ? 'Sharp shooter!' : 'Clang!'}
            subtitle={`Score ${hud.score} · Stage ${hud.stage}`}
            celebrate={hud.stage >= 5}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
