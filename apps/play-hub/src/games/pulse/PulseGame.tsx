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

const meta = getGame('pulse')

type Phase = 'idle' | 'play' | 'dying' | 'over'
import { AUTHORED, STAGES as LEVELS, buildStage } from './levels'
import { CEIL_H, H2, JUMP, T, addSeg, simSub, type Mode, type Obj, type Seg, type SimWorld } from './sim'

const PXK = 0.2
const demoHooks = { crash: () => false }

const STAGES = ['Warm Up', 'Neon Steps', 'Jump Pads', 'Orb Rush', 'Gravity Gate', 'Sky Ship', 'Pulse Storm', 'Hyperdrive', 'Overload', 'Infinity']
const HUES = [190, 280, 330, 45, 150, 210, 300, 15, 170, 260]

function stageName(s: number) {
  if (s < AUTHORED) return LEVELS[s].name
  return s < STAGES.length ? STAGES[s] : `Infinity ${s - AUTHORED + 1}`
}
function stageHue(s: number) {
  return s < AUTHORED ? LEVELS[s].hue : HUES[s % HUES.length]
}
function stageLen(s: number) {
  return 230 + Math.min(s, 10) * 12
}
function stageSpeed(s: number) {
  if (s < AUTHORED) return LEVELS[s].speed
  return Math.min(430, 290 + s * 14)
}

type World = SimWorld & {
  /** Authored layout of genStage already appended. */
  genBuilt: boolean
  /** Per stage: gem count and layout span (px) for stars and the progress bar. */
  gemTotal: Record<number, number>
  span: Record<number, number>
  stageGems: number
  bumps: number
  stageBumps: number
  objs: Obj[]
  ground: Seg[]
  ceil: Seg[]
  genX: number
  genStage: number
  genLeft: number
  x: number
  y: number
  vy: number
  rot: number
  gdir: 1 | -1
  mode: Mode
  grounded: boolean
  stage: number
  cpX: number
  maxX: number
  speed: number
  inv: number
  shields: number
  buffer: number
  beatT: number
  beat: number
  pulse: number
  trail: { x: number; y: number; r: number }[]
  trailT: number
  hue: number
  deadX: number
  deadY: number
  t: number
  grace: number
  stats: { stage: number; gems: number; jumps: number; orbs: number; ship: number; dist: number }
}

function freshWorld(stage = 0): World {
  return {
    genBuilt: false,
    gemTotal: {},
    span: {},
    stageGems: 0,
    bumps: 0,
    stageBumps: 0,
    objs: [],
    ground: [{ x0: -20 * T, x1: 22 * T }],
    ceil: [],
    genX: 22 * T,
    genStage: stage,
    genLeft: stageLen(stage),
    x: 0,
    y: -H2,
    vy: 0,
    rot: 0,
    gdir: 1,
    mode: 'cube',
    grounded: true,
    stage,
    cpX: 0,
    maxX: 0,
    speed: stageSpeed(stage),
    inv: 0,
    shields: 0,
    buffer: 0,
    beatT: 0,
    beat: 0,
    pulse: 0,
    trail: [],
    trailT: 0,
    hue: stageHue(stage),
    deadX: 0,
    deadY: 0,
    t: 0,
    grace: 6,
    stats: { stage: stage + 1, gems: 0, jumps: 0, orbs: 0, ship: 0, dist: 0 },
  }
}

/** Appends one chunk of level at w.genX; returns nothing, advances genX. */
function genChunk(w: World, demo: boolean) {
  if (!demo && w.genLeft > 0 && w.genStage < AUTHORED && !w.genBuilt) {
    // Hand-built layout for this stage, then the next call places the checkpoint.
    const start = w.genX
    const r = buildStage(w, w.genX, LEVELS[w.genStage])
    w.genX = r.end
    w.genBuilt = true
    w.genLeft = 0
    w.gemTotal[w.genStage] = r.gems
    w.span[w.genStage] = r.end - start + 9 * T
    return
  }
  const s = demo ? 0 : w.genStage
  const x0 = w.genX
  const objsBefore = w.objs.length
  const tx = (i: number) => x0 + i * T
  const O = w.objs
  const spike = (i: number, dir: 1 | -1 = 1, surf = 0) => O.push({ k: 'spike', x: tx(i), y: dir === 1 ? surf - T : surf, dir })
  const block = (i: number, h: number, wd = 1) => O.push({ k: 'block', x: tx(i), y: -h * T, w: wd * T, h: h * T })
  const gem = (i: number, yt: number) => O.push({ k: 'gem', x: tx(i) + T / 2, y: -yt * T, got: false })
  const opening = !demo && s === 0 && x0 < 20 * stageSpeed(0)
  const pad = opening ? 12 : Math.max(3, 8 - s)
  let len = 0
  const gaps: [number, number][] = []

  // Stage boundary: checkpoint + safe runway
  if (w.genLeft <= 0 && !demo) {
    w.genStage += 1
    w.genLeft = stageLen(w.genStage)
    w.genBuilt = false
    O.push({ k: 'cp', x: tx(1), stage: w.genStage, used: false })
    len = 9
  } else {
    const pool: string[] = ['spikes', 'spikes', 'block']
    if (s >= 1) pool.push('stairs', 'gap', 'spikes3')
    if (s >= 2) pool.push('pad', 'pad')
    if (s >= 3) pool.push('orb', 'orb', 'orbgap')
    if (s >= 4) pool.push('grav', 'grav')
    if (s >= 5) pool.push('ship', 'ship')
    let kind = pool[Math.floor(Math.random() * pool.length)]
    // Introduce each stage's new mechanic early
    if (!demo && w.genLeft > stageLen(s) - 40) {
      const intro = ['spikes', 'gap', 'pad', 'orb', 'grav', 'ship'][s]
      if (intro) kind = intro
    }
    if (kind === 'spikes') {
      const n = opening ? 1 : s === 0 ? 1 + (Math.random() < 0.3 ? 1 : 0) : 1 + Math.floor(Math.random() * 2)
      for (let i = 0; i < n; i++) spike(2 + i)
      gem(2 + Math.floor(n / 2), 2.6)
      len = n + 2 + pad
    } else if (kind === 'spikes3') {
      for (let i = 0; i < 3; i++) spike(2 + i)
      gem(3, 2.8)
      len = 5 + pad
    } else if (kind === 'block') {
      const wd = opening ? 1 : 1 + Math.floor(Math.random() * 3)
      block(2, 1, wd)
      gem(2 + wd - 1, 2.2)
      if (s >= 1 && Math.random() < 0.5) {
        spike(2 + wd + 1)
        len = wd + 4 + pad
      } else len = wd + 2 + pad
    } else if (kind === 'stairs') {
      block(2, 1, 2)
      block(4, 2, 2)
      gem(5, 3.4)
      block(6, 1, 1)
      if (s >= 3) spike(4, 1, -2 * T)
      len = 7 + pad
    } else if (kind === 'gap') {
      const g = 2 + (s >= 3 && Math.random() < 0.5 ? 1 : 0)
      gaps.push([2, 2 + g])
      gem(2 + Math.floor(g / 2), 1.8)
      len = 2 + g + pad
    } else if (kind === 'pad') {
      O.push({ k: 'pad', x: tx(2), used: false })
      if (Math.random() < 0.5) {
        for (let i = 4; i < 9; i++) spike(i)
        gem(6, 4.2)
        len = 10 + pad
      } else {
        block(6, 3, 2)
        gem(6, 4.8)
        len = 8 + pad
      }
    } else if (kind === 'orb' || kind === 'orbgap') {
      if (kind === 'orb') for (let i = 4; i < 11; i++) spike(i)
      else gaps.push([4, 11])
      O.push({ k: 'orb', x: tx(6) + T / 2, y: -2.2 * T, used: false })
      gem(9, 3)
      len = 12 + pad
    } else if (kind === 'grav') {
      const L = 16 + Math.floor(Math.random() * 10)
      O.push({ k: 'portal', x: tx(2), kind: 'up', used: false })
      addSeg(w.ceil, tx(0), tx(L + 5))
      let i = 9
      while (i < L - 1) {
        const n = 1 + (s >= 6 && Math.random() < 0.5 ? 1 : 0)
        for (let j = 0; j < n; j++) spike(i + j, -1, -CEIL_H)
        O.push({ k: 'gem', x: tx(i) + T / 2, y: -CEIL_H + 2.4 * T, got: false })
        i += n + rand(4, 6) | 0
      }
      O.push({ k: 'portal', x: tx(L), kind: 'down', used: false })
      len = L + 6 + pad
    } else if (kind === 'ship') {
      const L = 30 + Math.floor(Math.random() * 12)
      O.push({ k: 'portal', x: tx(2), kind: 'ship', used: false })
      addSeg(w.ceil, tx(0), tx(L + 4))
      let i = 9
      let up = Math.random() < 0.5
      const gapT = s >= 7 ? 3.4 : 4
      while (i < L - 3) {
        const h = Math.floor(rand(1, 7 - gapT + 0.99))
        if (up) {
          O.push({ k: 'block', x: tx(i), y: -CEIL_H, w: T, h: h * T })
          gem(i, 7 - h - gapT / 2)
        } else {
          block(i, h, 1)
          if (s >= 6 && h < 3) spike(i, 1, -h * T)
          gem(i, h + gapT / 2)
        }
        up = !up
        i += s >= 7 ? 5 : 6
      }
      O.push({ k: 'portal', x: tx(L), kind: 'cube', used: false })
      len = L + 6
    }
  }
  // Ground with gaps
  let cur = 0
  for (const [a, b] of gaps) {
    if (a > cur) addSeg(w.ground, tx(cur), tx(a))
    cur = b
  }
  addSeg(w.ground, tx(cur), tx(len))
  w.genX = tx(len)
  if (!demo) {
    w.genLeft -= len
    // Generated stages: count gems and span for stars/progress.
    let g = 0
    for (let i = objsBefore; i < O.length; i++) if (O[i].k === 'gem') g++
    const gs = w.genStage
    w.gemTotal[gs] = (w.gemTotal[gs] ?? 0) + g
    if (w.genStage >= AUTHORED) w.span[w.genStage] = stageLen(w.genStage) * T
  }
  O.sort((a, b) => a.x - b.x)
}

// ── Art ────────────────────────────────────────────────────

function drawCube(ctx: CanvasRenderingContext2D, hue: number, s: number, face = true) {
  const g = ctx.createLinearGradient(-s, -s, s, s)
  g.addColorStop(0, `hsl(${hue + 50},100%,70%)`)
  g.addColorStop(1, `hsl(${hue + 30},90%,45%)`)
  ctx.fillStyle = '#0a0a14'
  ctx.fillRect(-s - 2, -s - 2, s * 2 + 4, s * 2 + 4)
  ctx.fillStyle = g
  ctx.fillRect(-s, -s, s * 2, s * 2)
  ctx.fillStyle = 'rgba(10,10,20,0.55)'
  ctx.fillRect(-s * 0.55, -s * 0.55, s * 1.1, s * 1.1)
  ctx.fillStyle = `hsl(${hue + 50},100%,80%)`
  ctx.fillRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8)
  if (face) {
    ctx.fillStyle = '#0a0a14'
    ctx.fillRect(-s * 0.3, -s * 0.25, s * 0.18, s * 0.28)
    ctx.fillRect(s * 0.12, -s * 0.25, s * 0.18, s * 0.28)
    ctx.fillRect(-s * 0.28, s * 0.14, s * 0.56, s * 0.1)
  }
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.fillRect(-s, -s, s * 2, 2.5)
}

function drawShip(ctx: CanvasRenderingContext2D, hue: number, t: number) {
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(-16, 2)
  ctx.lineTo(-26 - Math.random() * 8, 5)
  ctx.lineTo(-16, 8)
  ctx.fill()
  ctx.save()
  ctx.translate(-1, -6)
  drawCube(ctx, hue, 7, true)
  ctx.restore()
  const g = ctx.createLinearGradient(0, 0, 0, 12)
  g.addColorStop(0, `hsl(${hue + 180},90%,65%)`)
  g.addColorStop(1, `hsl(${hue + 200},80%,35%)`)
  ctx.fillStyle = g
  ctx.strokeStyle = '#0a0a14'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-17, 0)
  ctx.lineTo(10, 0)
  ctx.lineTo(19, 5 + Math.sin(t * 20) * 0.5)
  ctx.lineTo(10, 10)
  ctx.lineTo(-17, 10)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillRect(-14, 1.5, 22, 2)
}

export default function PulseGame() {
  const run = useActionRun('pulse')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const holdRef = useRef(false)
  const hudT = useRef(0)
  const devAuto = useRef(false)
  const devSpeed = useRef(1)
  const autoPlan = useRef<number[]>([])

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, stage: 1, gems: 0, shields: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }
  function score() {
    const w = world.current
    return Math.floor(w.maxX / T) + w.stats.gems * 5
  }
  function pushHud() {
    const w = world.current
    setHud({ score: score(), stage: w.stage + 1, gems: w.stats.gems, shields: w.shields })
  }

  function start(level: number = run.nextLevel) {
    void unlockAudio()
    // Each stage is a level: the map replays beaten stages, Play continues at the next one.
    const lv = Math.max(1, typeof level === 'number' && level > 0 ? Math.floor(level) : run.nextLevel)
    const w = freshWorld(lv - 1)
    w.shields = run.level('guard')
    world.current = w
    holdRef.current = false
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    say(`STAGE ${lv} · ${stageName(lv - 1).toUpperCase()}`, lv - 1 < AUTHORED ? LEVELS[lv - 1].sub : 'endless remix')
    sfx.ready()
    pushHud()
  }

  function finishRun() {
    const w = world.current
    setPhaseBoth('over')
    const sc = score()
    const coins = Math.round((sc / 40) * (1 + run.level('bounty') * 0.2))
    run.end({ score: sc, cleared: w.stage >= 4, stats: { ...w.stats, dist: Math.floor(w.maxX / T) }, coins }, revive)
  }

  function crash(): boolean {
    const w = world.current
    if (phaseRef.current !== 'play') return false
    if (w.inv > 0) return false
    const px = size.current.w * PXK
    const gy = groundY()
    // Opening grace: early crashes just bounce you back
    if (w.t < 22 && w.grace > 0) {
      w.grace -= 1
      w.bumps += 1
      w.inv = 1.4
      w.vy = -JUMP * w.gdir
      w.grounded = false
      fx.flash('#ffffff', 0.18)
      fx.burst(px, gy + w.y, { count: 14, color: ['#fff', '#fde047'], speed: 220, shape: 'spark' })
      fx.text(px, gy + w.y - 34, 'OOPS! TRY AGAIN', '#fde047', 16)
      fx.shake(5, 0.2)
      sfx.miss()
      haptic.medium()
      return false
    }
    if (w.shields > 0) {
      w.shields -= 1
      w.bumps += 1
      w.inv = 1.3
      w.vy = -JUMP * 1.1 * w.gdir
      w.grounded = false
      fx.ring(px, gy + w.y, { color: '#7dd3fc', maxR: 60, life: 0.45, width: 4 })
      fx.burst(px, gy + w.y, { count: 20, color: ['#7dd3fc', '#fff'], speed: 260, shape: 'spark' })
      fx.text(px, gy + w.y - 34, 'SAVED!', '#7dd3fc', 20)
      fx.stop(0.08)
      fx.shake(7, 0.25)
      sfx.clang()
      haptic.heavy()
      pushHud()
      return false
    }
    setPhaseBoth('dying')
    w.deadX = px
    w.deadY = gy + w.y
    const col = `hsl(${w.hue + 40},100%,65%)`
    fx.burst(px, gy + w.y, { count: 30, color: [col, '#fff', `hsl(${w.hue + 80},100%,70%)`], speed: 380, shape: 'square', size: 6, gravity: 600, life: 0.9 })
    fx.ring(px, gy + w.y, { color: col, maxR: 80, life: 0.5, width: 5 })
    fx.flash('#ffffff', 0.25)
    fx.stop(0.12)
    fx.shake(12, 0.4)
    sfx.boom(0.5)
    sfx.lose()
    haptic.error()
    run.update({ ...w.stats, dist: Math.floor(w.maxX / T) })
    window.setTimeout(finishRun, 1100)
    return true
  }

  function revive() {
    const w = world.current
    w.x = w.cpX + T * 2
    w.y = -H2
    w.vy = 0
    w.gdir = 1
    w.mode = 'cube'
    w.grounded = true
    w.rot = 0
    w.inv = 1.2
    w.trail = []
    for (const o of w.objs) {
      if (o.x < w.x) continue
      if (o.k === 'pad' || o.k === 'orb' || o.k === 'portal' || o.k === 'cp') o.used = false
    }
    say('REVIVED!', 'back to checkpoint')
    setPhaseBoth('play')
    pushHud()
  }

  function groundY() {
    return Math.round(size.current.h * 0.64)
  }

  function press() {
    if (phaseRef.current !== 'play') return
    holdRef.current = true
    world.current.buffer = 0.14
  }
  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    press()
  }
  function onUp() {
    holdRef.current = false
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return
    // Test hook for headless bots: look-ahead autopilot (no invulnerability), fast-forward, state readout.
    const hook = {
      auto: (on: boolean) => (devAuto.current = on),
      speed: (n: number) => (devSpeed.current = Math.max(1, Math.min(4, Math.round(n)))),
      state: () => {
        const w = world.current
        return { phase: phaseRef.current, stage: w.stage + 1, name: stageName(w.stage), x: Math.round(w.x / T), bumps: w.bumps }
      },
    }
    ;(window as unknown as { __lv6pulse?: typeof hook }).__lv6pulse = hook
  }, [])

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault()
        if (!e.repeat) press()
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

  function enterStage(o: { stage: number; x: number }) {
    const w = world.current
    // Passing this checkpoint clears the previous stage (level o.stage, 1-based).
    // Stars: clear = 1, no Guardian save or bump = +1, every gem of the stage = +1.
    const total = w.gemTotal[o.stage - 1] ?? 0
    const stars = 1 + (w.bumps === w.stageBumps ? 1 : 0) + (w.stageGems >= total ? 1 : 0)
    run.completeLevel(o.stage, stars)
    w.stageBumps = w.bumps
    w.stageGems = 0
    say(`STAGE ${o.stage} CLEAR ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, `next: ${stageName(o.stage)}`)
    w.stage = o.stage
    w.cpX = o.x
    w.stats.stage = o.stage + 1
    w.speed = stageSpeed(o.stage)
    sfx.levelUp()
    haptic.success()
    fx.flash(`hsl(${stageHue(o.stage)},90%,60%)`, 0.25)
    run.update(w.stats)
    if ((o.stage + 1) % 3 === 0) void trackEvent('action_milestone', { game_id: 'pulse', kind: 'stage', value: o.stage + 1 })
  }

  /** One physics substep (shared rules in sim.ts). Returns false if the run ended. */
  function sub(dt: number, demo: boolean): boolean {
    const w = world.current
    let hold = demo ? false : holdRef.current
    if (import.meta.env.DEV && devAuto.current && !demo) hold = autoHold()
    const wasGrounded = w.grounded
    const px = size.current.w * PXK
    const ok = simSub(w, dt, hold, demo, 22 + (demo ? 0 : run.level('magnet') * 12), demo ? demoHooks : {
      crash,
      jump: () => {
        w.stats.jumps += 1
      },
      pad: () => {
        fx.burst(px, groundY(), { count: 14, color: ['#fde047', '#fff'], speed: 260, angle: -Math.PI / 2, spread: 1, shape: 'spark' })
        sfx.whoosh()
      },
      orb: (o) => {
        w.stats.orbs += 1
        fx.ring(px + (o.x - w.x), groundY() + o.y, { color: '#fde047', maxR: 46, life: 0.35, width: 4 })
        sfx.pop()
        haptic.light()
      },
      gem: (o) => {
        w.stats.gems += 1
        w.stageGems += 1
        const sx = px + (o.x - w.x)
        fx.burst(sx, groundY() + o.y, { count: 10, color: ['#67e8f9', '#fff', '#a5f3fc'], speed: 180, size: 2.5 })
        fx.text(sx, groundY() + o.y - 16, '+5', '#a5f3fc', 14)
        sfx.score(w.stats.gems % 8)
        run.update(w.stats)
      },
      portal: (kind) => {
        if (kind === 'ship') say('FLY!', 'hold to rise')
        else if (kind === 'cube') {
          w.stats.ship += 1
          run.update(w.stats)
        }
        fx.ring(px, groundY() + w.y, { color: kind === 'up' || kind === 'down' ? '#38bdf8' : '#f472b6', maxR: 70, life: 0.4, width: 4 })
        sfx.whoosh()
        haptic.light()
      },
      cp: (o) => enterStage(o),
    })
    if (ok && !demo && !wasGrounded && w.grounded && w.mode === 'cube') {
      fx.burst(px, groundY() + w.y + H2 * w.gdir, { count: 4, color: [`hsl(${w.hue + 40},100%,70%)`], speed: 90, angle: w.gdir === 1 ? -Math.PI / 2 : Math.PI / 2, spread: 2.4, size: 2.5, life: 0.3, gravity: 0 })
    }
    return ok
  }

  /** DEV-only pilot: short look-ahead search over hold/release with the real physics. */
  function autoHold(): boolean {
    const w = world.current
    if (autoPlan.current.length > 0) return (holdRef.current = autoPlan.current.shift() === 1)
    const save = { x: w.x, y: w.y, vy: w.vy, gdir: w.gdir, mode: w.mode, grounded: w.grounded, buffer: w.buffer, inv: w.inv }
    const near = w.objs.filter((o) => (o.k === 'pad' || o.k === 'orb' || o.k === 'portal' || o.k === 'cp') && o.x > w.x - T * 4 && o.x < w.x + T * 30)
    const used = near.map((o) => (o as { used: boolean }).used)
    const gems = w.objs.filter((o) => o.k === 'gem' && o.x > w.x - T && o.x < w.x + T * 30) as { got: boolean }[]
    const got = gems.map((g) => g.got)
    let dead = false
    const hooks = { crash: () => ((dead = true), true), cp: () => {} }
    const seen = new Set<string>()
    const path: number[] = []
    const restore = (st: typeof save, u: boolean[]) => {
      Object.assign(w, st)
      near.forEach((o, i) => ((o as { used: boolean }).used = u[i]))
    }
    const dfs = (st: typeof save, u: boolean[], hold: boolean, depth: number): boolean => {
      if (depth >= 28) return true
      for (const act of st.mode === 'ship' ? [hold, !hold] : [false, true]) {
        restore(st, u)
        w.inv = 0
        if (act && !hold) w.buffer = 0.14
        dead = false
        let ok = true
        for (let k = 0; k < 4 && ok; k++) ok = simSub(w, 1 / 120, act, false, 0, hooks) && !dead
        if (!ok) continue
        const ns = { x: w.x, y: w.y, vy: w.vy, gdir: w.gdir, mode: w.mode, grounded: w.grounded, buffer: w.buffer, inv: 0 }
        const nu = near.map((o) => (o as { used: boolean }).used)
        const key = `${depth}|${Math.round(w.y)}|${Math.round(w.vy / 5)}|${w.grounded}|${w.gdir}|${w.mode}|${act}|${nu.join('')}`
        if (seen.has(key)) continue
        seen.add(key)
        path.push(act ? 1 : 0, act ? 1 : 0, act ? 1 : 0, act ? 1 : 0)
        if (dfs(ns, nu, act, depth + 1)) return true
        path.length -= 4
      }
      return false
    }
    const found = dfs(save, used, holdRef.current, 0)
    restore(save, used)
    gems.forEach((g, i) => (g.got = got[i]))
    autoPlan.current = found ? path.slice(1, 4) : []
    const next = found ? path[0] === 1 : false
    if (next && !holdRef.current) w.buffer = 0.14
    holdRef.current = next
    return next
  }

  function step(dt: number, W: number) {
    const w = world.current
    const ph = phaseRef.current
    const demo = ph === 'idle'
    if (demo && w.x > 4000) {
      world.current = freshWorld()
      return
    }
    // Generate ahead and prune behind
    while (w.genX < w.x + W * 1.5) genChunk(w, demo)
    const keep = Math.min(w.cpX, w.x) - W
    if (w.objs.length && w.objs[0].x < keep - T * 10) {
      w.objs = w.objs.filter((o) => o.x > keep - T * 10)
      w.ground = w.ground.filter((g) => g.x1 > keep)
      w.ceil = w.ceil.filter((g) => g.x1 > keep)
    }

    // Beat
    const bpm = 120 + Math.min(w.stage, 10) * 4
    w.beatT += dt
    if (w.beatT >= 60 / bpm) {
      w.beatT -= 60 / bpm
      w.beat += 1
      w.pulse = 1
      if (ph === 'play') {
        if (w.beat % 4 === 0) sfx.move()
        else sfx.tick()
      }
    }
    w.pulse = Math.max(0, w.pulse - dt * 3.2)
    w.hue = approach(w.hue, stageHue(w.stage), 2, dt)

    if (ph === 'play' || demo) {
      w.inv = Math.max(0, w.inv - dt)
      if (ph === 'play') w.t += dt
      let left = dt
      while (left > 0) {
        const d = Math.min(left, 1 / 120)
        left -= d
        if (!sub(d, demo)) break
      }
      const cw = phaseRef.current === 'play' || demo
      if (cw) {
        if (w.mode === 'cube') {
          if (!w.grounded) w.rot += dt * (Math.PI / 0.46) * w.gdir
          else w.rot = approach(w.rot, Math.round(w.rot / (Math.PI / 2)) * (Math.PI / 2), 25, dt)
        } else w.rot = approach(w.rot, clamp(w.vy / 900, -0.5, 0.5), 12, dt)
        w.trailT -= dt
        if (w.trailT <= 0) {
          w.trailT = 0.03
          w.trail.push({ x: w.x, y: w.y, r: w.rot })
          if (w.trail.length > 8) w.trail.shift()
        }
      }
      if (!demo && w.x > w.maxX) {
        w.maxX = w.x
        const d = Math.floor(w.maxX / T)
        if (d !== w.stats.dist) {
          w.stats.dist = d
          if (d % 25 === 0) run.update(w.stats)
        }
      }
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const reps = import.meta.env.DEV ? devSpeed.current : 1
    for (let i = 0; i < reps; i++) step(fx.step(raw), W)
    const ph = phaseRef.current
    if (ph === 'play') {
      hudT.current -= raw
      if (hudT.current <= 0) {
        hudT.current = 0.15
        pushHud()
      }
    }
    const gy = groundY()
    const px = W * PXK
    const cam = w.x - px
    const hue = w.hue
    const pulse = w.pulse
    const neon = `hsl(${hue},100%,62%)`
    const neonHi = `hsl(${hue},100%,80%)`

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, `hsl(${hue},60%,${7 + pulse * 3}%)`)
    bg.addColorStop(1, `hsl(${hue + 30},70%,${15 + pulse * 4}%)`)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    glow(ctx, W * 0.6, gy - CEIL_H * 0.4, W * (0.7 + pulse * 0.15), neon, 0.12 + pulse * 0.18)
    // Far skyline
    const farS = 70
    const off = -((cam * 0.15) % farS)
    for (let i = -1; i < W / farS + 2; i++) {
      const idx = Math.floor(cam * 0.15 / farS) + i
      const hgt = 60 + ((idx * 73) % 7) * 22
      const x = off + i * farS
      ctx.fillStyle = `hsl(${hue + 20},50%,12%)`
      ctx.fillRect(x, gy - hgt, farS - 10, hgt)
      ctx.fillStyle = `hsla(${hue},100%,70%,${0.15 + pulse * 0.25})`
      ctx.fillRect(x, gy - hgt, farS - 10, 2)
    }
    // Floating squares
    ctx.lineWidth = 2
    for (let i = 0; i < 7; i++) {
      const sx = ((((i * 173 - cam * 0.4) % (W + 120)) + W + 120) % (W + 120)) - 60
      const sy = 40 + ((i * 97) % Math.max(60, gy - 140))
      const sz = 14 + (i % 3) * 10 + pulse * 4
      ctx.save()
      ctx.translate(sx, sy)
      ctx.rotate(t * 0.5 + i)
      ctx.strokeStyle = `hsla(${hue + 60},100%,70%,0.18)`
      ctx.strokeRect(-sz / 2, -sz / 2, sz, sz)
      ctx.restore()
    }

    fx.applyShake(ctx)
    ctx.save()
    ctx.translate(-cam, gy)

    // Ground segments
    for (const g of w.ground) {
      if (g.x1 < cam - 10 || g.x0 > cam + W + 10) continue
      const fl = ctx.createLinearGradient(0, 0, 0, H - gy)
      fl.addColorStop(0, `hsl(${hue},60%,16%)`)
      fl.addColorStop(1, '#05050c')
      ctx.fillStyle = fl
      ctx.fillRect(g.x0, 0, g.x1 - g.x0, H - gy)
      ctx.strokeStyle = `hsla(${hue},100%,65%,0.12)`
      ctx.lineWidth = 1
      const start = Math.ceil(Math.max(g.x0, cam) / T) * T
      for (let x = start; x < Math.min(g.x1, cam + W); x += T) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H - gy)
        ctx.stroke()
      }
      ctx.fillStyle = `hsla(${hue},100%,65%,${0.25 + pulse * 0.3})`
      ctx.fillRect(g.x0, -2, g.x1 - g.x0, 8)
      ctx.fillStyle = neonHi
      ctx.fillRect(g.x0, 0, g.x1 - g.x0, 2 + pulse * 1.5)
    }
    for (const c of w.ceil) {
      if (c.x1 < cam - 10 || c.x0 > cam + W + 10) continue
      ctx.fillStyle = `hsl(${hue},55%,12%)`
      ctx.fillRect(c.x0, -CEIL_H - 400, c.x1 - c.x0, 400)
      ctx.fillStyle = `hsla(${hue},100%,65%,${0.25 + pulse * 0.3})`
      ctx.fillRect(c.x0, -CEIL_H - 6, c.x1 - c.x0, 8)
      ctx.fillStyle = neonHi
      ctx.fillRect(c.x0, -CEIL_H - 2, c.x1 - c.x0, 2 + pulse * 1.5)
    }

    // Objects
    for (const o of w.objs) {
      if (o.x > cam + W + 40) break
      if (o.x < cam - 260) continue
      if (o.k === 'block') {
        ctx.fillStyle = '#0a0a16'
        ctx.fillRect(o.x, o.y, o.w, o.h)
        ctx.strokeStyle = `hsla(${hue},100%,65%,0.35)`
        ctx.lineWidth = 6
        ctx.strokeRect(o.x + 2, o.y + 2, o.w - 4, o.h - 4)
        ctx.strokeStyle = neonHi
        ctx.lineWidth = 2
        ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2)
        ctx.strokeStyle = `hsla(${hue},100%,70%,${0.2 + pulse * 0.3})`
        for (let yy = o.y; yy < o.y + o.h - 1; yy += T) for (let xx = o.x; xx < o.x + o.w - 1; xx += T) ctx.strokeRect(xx + 7, yy + 7, T - 14, T - 14)
      } else if (o.k === 'spike') {
        const base = o.dir === 1 ? o.y + T : o.y
        const tip = o.dir === 1 ? o.y + 3 - pulse * 2 : o.y + T - 3 + pulse * 2
        ctx.fillStyle = '#12040a'
        ctx.beginPath()
        ctx.moveTo(o.x + 2, base)
        ctx.lineTo(o.x + T / 2, tip)
        ctx.lineTo(o.x + T - 2, base)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = 'rgba(255,77,109,0.35)'
        ctx.lineWidth = 6
        ctx.stroke()
        ctx.strokeStyle = '#ff6b88'
        ctx.lineWidth = 2
        ctx.stroke()
      } else if (o.k === 'pad') {
        glow(ctx, o.x + T / 2, -4, 26, '#fde047', 0.35 + pulse * 0.3)
        ctx.fillStyle = o.used ? '#a16207' : '#fde047'
        ctx.beginPath()
        ctx.ellipse(o.x + T / 2, 0, T * 0.45, 7, 0, Math.PI, 0)
        ctx.fill()
      } else if (o.k === 'orb') {
        const r = 11 + pulse * 2
        glow(ctx, o.x, o.y, 34, '#fde047', o.used ? 0.1 : 0.4)
        ctx.strokeStyle = o.used ? 'rgba(253,224,71,0.3)' : '#fde047'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(o.x, o.y, r, 0, Math.PI * 2)
        ctx.stroke()
        if (!o.used) {
          ctx.fillStyle = '#fef9c3'
          ctx.beginPath()
          ctx.arc(o.x, o.y, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = 'rgba(253,224,71,0.5)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(o.x, o.y, r + 6 + ((t * 30) % 10), 0, Math.PI * 2)
          ctx.stroke()
        }
      } else if (o.k === 'gem') {
        if (o.got) continue
        const by = o.y + Math.sin(t * 4 + o.x) * 3
        const sx = Math.abs(Math.cos(t * 3 + o.x * 0.01)) * 0.7 + 0.3
        ctx.fillStyle = '#0e7490'
        ctx.beginPath()
        ctx.moveTo(o.x, by - 10)
        ctx.lineTo(o.x + 8 * sx, by)
        ctx.lineTo(o.x, by + 10)
        ctx.lineTo(o.x - 8 * sx, by)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#67e8f9'
        ctx.beginPath()
        ctx.moveTo(o.x, by - 8)
        ctx.lineTo(o.x + 5.5 * sx, by)
        ctx.lineTo(o.x, by + 3)
        ctx.lineTo(o.x - 5.5 * sx, by)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.fillRect(o.x - 1.5 * sx, by - 6, 3 * sx, 3)
      } else if (o.k === 'portal') {
        const col = o.kind === 'up' ? '#38bdf8' : o.kind === 'down' ? '#facc15' : o.kind === 'ship' ? '#f472b6' : '#4ade80'
        const cy = o.kind === 'ship' || o.kind === 'cube' ? -CEIL_H / 2 : -T * 1.6
        const ry = o.kind === 'ship' || o.kind === 'cube' ? CEIL_H * 0.42 : T * 1.6
        const cx = o.x + T / 2
        glow(ctx, cx, cy, ry * 1.1, col, 0.3 + pulse * 0.2)
        ctx.strokeStyle = col
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.ellipse(cx, cy, 10, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.ellipse(cx, cy, 5, ry - 6, 0, 0, Math.PI * 2)
        ctx.stroke()
        // Arrow hint
        ctx.fillStyle = col
        ctx.beginPath()
        if (o.kind === 'up') {
          ctx.moveTo(cx - 8, cy - ry - 6)
          ctx.lineTo(cx, cy - ry - 16)
          ctx.lineTo(cx + 8, cy - ry - 6)
        } else if (o.kind === 'down') {
          ctx.moveTo(cx - 8, cy + ry + 6)
          ctx.lineTo(cx, cy + ry + 16)
          ctx.lineTo(cx + 8, cy + ry + 6)
        }
        ctx.fill()
      } else if (o.k === 'cp') {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(o.x, 0)
        ctx.lineTo(o.x, -T * 3)
        ctx.stroke()
        ctx.fillStyle = o.used ? '#4ade80' : neon
        ctx.beginPath()
        ctx.moveTo(o.x, -T * 3)
        ctx.lineTo(o.x + 26, -T * 2.6)
        ctx.lineTo(o.x, -T * 2.2)
        ctx.fill()
      }
    }

    // Player
    if (ph !== 'dying' && ph !== 'over') {
      for (let i = 0; i < w.trail.length; i++) {
        const tr = w.trail[i]
        ctx.save()
        ctx.globalAlpha = (i / w.trail.length) * 0.3
        ctx.translate(tr.x, tr.y)
        ctx.rotate(tr.r)
        ctx.fillStyle = `hsl(${hue + 40},100%,65%)`
        const s = H2 * (0.5 + (i / w.trail.length) * 0.5)
        ctx.fillRect(-s, -s, s * 2, s * 2)
        ctx.restore()
      }
      ctx.globalAlpha = w.inv > 0 && Math.sin(t * 40) > 0 ? 0.45 : 1
      glow(ctx, w.x, w.y, 34, `hsl(${hue + 40},100%,60%)`, 0.25 + pulse * 0.2)
      ctx.save()
      ctx.translate(w.x, w.y)
      if (w.mode === 'cube') {
        ctx.rotate(w.rot)
        const sq = w.grounded ? 1 + pulse * 0.06 : 1
        ctx.scale(sq, 1 / sq)
        drawCube(ctx, hue, H2)
      } else {
        ctx.rotate(w.rot)
        drawShip(ctx, hue, t)
      }
      ctx.restore()
      if (w.shields > 0 && ph === 'play') {
        ctx.strokeStyle = 'rgba(125,211,252,0.55)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(w.x, w.y, 22 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    ctx.restore()

    fx.draw(ctx)
    ctx.restore()

    // Stage progress meter (bottom)
    if (ph !== 'idle') {
      const k = clamp((w.x - w.cpX) / (w.span[w.stage] ?? stageLen(w.stage) * T), 0, 1)
      const bw = W - 48
      const by = H - 30
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.beginPath()
      ctx.roundRect(24, by, bw, 10, 5)
      ctx.fill()
      ctx.fillStyle = neon
      ctx.beginPath()
      ctx.roundRect(24, by, Math.max(10, bw * k), 10, 5)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`STAGE ${w.stage + 1} · ${stageName(w.stage).toUpperCase()} · ${Math.floor(k * 100)}%`, W / 2, by - 6)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Level {hud.stage}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small" style={{ color: '#a5f3fc' }}>◆ {hud.gems}</span>
                {hud.shields > 0 ? <span className="action-hud__small" style={{ color: '#7dd3fc' }}>Guard ×{hud.shields}</span> : null}
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
              game="pulse"
              icon={meta.icon}
              title={meta.title}
              hint="Tap or hold to jump to the beat. Clear every stage — spikes, pads, orbs, gravity portals and ship runs."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.stage >= 5 ? 'Beat master!' : 'Crashed!'}
            subtitle={`Score ${hud.score} · Stage ${hud.stage} · ${hud.gems} gems`}
            celebrate={hud.stage >= 5}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
