import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'
import { BIOMES, drawAmmo, drawBackground, drawBlock, drawClouds, drawGuard, drawSling, drawStar, type Cam } from './art'
import { AMMO, UNLOCK, planFor, type LevelPlan } from './levels'
import { World, type Body } from './physics'

const meta = getGame('catapult')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Sub = 'load' | 'aim' | 'fly' | 'settle' | 'clearwait' | 'clear'

type Shot = { body: Body; kind: number; t: number; used: boolean; impactT: number; slowT: number; done: boolean; main: boolean }
type Chunk = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; s: number; color: string; life: number }

const VIEW_W = 394
const VIEW_L = -14
/** Visual pull of the pouch relative to the drag (power still uses the full drag). */
const POUCH_K = 0.65
const SLING_X = 60
const REST_X = 60
const MOUND = -30
const REST_Y = MOUND - 82
const MAX_PULL = 72
const POWER = 9
const STEP = 1 / 120
const MAX_CHUNKS = 140

const MAT_COLORS: Record<string, string[]> = {
  wood: ['#c98b4e', '#e0a868', '#9c612d'],
  stone: ['#98a1ab', '#bcc4cc', '#6f7882'],
  glass: ['#bae6fd', '#e0f2fe', '#7dd3fc'],
  tnt: ['#dc2626', '#facc15', '#7f1d1d'],
  guard: ['#7cc443', '#9aa3ae', '#5a9a2c'],
  king: ['#7cc443', '#facc15', '#5a9a2c'],
}
const MAT_POINTS: Record<string, number> = { wood: 100, stone: 150, glass: 50, tnt: 200 }

type Game = {
  phys: World
  level: number
  plan: LevelPlan | null
  queue: number[]
  reserve: number
  sub: Sub
  subT: number
  shots: Shot[]
  shotsUsed: number
  guardsLeft: number
  combo: number
  comboT: number
  score: number
  totalStars: number
  clearStars: number
  clearBonus: number
  starsShown: number
  trail: Array<[number, number]>
  trailT: number
  chunks: Chunk[]
  biome: number
  acc: number
  bandT: number
  demoT: number
  soundT: number
  lastMilestone: number
  stats: { level: number; guards: number; blocks: number; stars3: number; bosses: number }
}

function freshGame(): Game {
  return {
    phys: new World(),
    level: 0,
    plan: null,
    queue: [],
    reserve: 0,
    sub: 'load',
    subT: 0,
    shots: [],
    shotsUsed: 0,
    guardsLeft: 0,
    combo: 0,
    comboT: 0,
    score: 0,
    totalStars: 0,
    clearStars: 0,
    clearBonus: 0,
    starsShown: 0,
    trail: [],
    trailT: 0,
    chunks: [],
    biome: 0,
    acc: 0,
    bandT: 0,
    demoT: 0,
    soundT: 0,
    lastMilestone: 0,
    stats: { level: 0, guards: 0, blocks: 0, stars3: 0, bosses: 0 },
  }
}

function camera(W: number, H: number): Cam {
  const s = Math.min(W / VIEW_W, (H - 60) / 500)
  return { s, ox: (W - VIEW_W * s) / 2 - VIEW_L * s, gy: H - Math.max(42, H * 0.085) }
}

export default function CatapultGame() {
  const run = useActionRun('catapult')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const G = useRef<Game>(freshGame())
  const camRef = useRef<Cam>({ s: 1, ox: 0, gy: 500 })
  const phaseRef = useRef<Phase>('idle')
  const dragRef = useRef<{ id: number; sx: number; sy: number; dx: number; dy: number } | null>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, guards: 0, shots: 0, reserve: 0, stars: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const g = G.current
    setHud({ score: g.score, level: g.level, guards: g.guardsLeft, shots: g.queue.length, reserve: g.reserve, stars: g.totalStars })
  }

  const live = () => phaseRef.current === 'play' || phaseRef.current === 'dying'

  function toScreen(x: number, y: number): [number, number] {
    const c = camRef.current
    return [c.ox + x * c.s, c.gy + y * c.s]
  }

  // ── Level building ─────────────────────────────────────

  function build(plan: LevelPlan) {
    const g = G.current
    const p = g.phys
    p.clear()
    p.add({ x: VIEW_W / 2, y: 300, hw: 2400, hh: 300, mat: 'ground', isStatic: true })
    p.add({ x: 22, y: MOUND / 2, hw: 78, hh: -MOUND / 2, mat: 'earth', isStatic: true })
    if (plan.earth) p.add({ ...plan.earth, isStatic: true })
    for (const s of plan.specs) p.add({ ...s, awake: false })
    p.ammoPower = 1 + run.level('power') * 0.15
    g.plan = plan
    g.guardsLeft = plan.guards
    g.queue = plan.ammo.slice()
    g.shots = []
    g.shotsUsed = 0
    g.trail = []
    g.chunks = []
    g.sub = 'load'
    g.subT = 0
    g.acc = 0
  }

  function buildDemo() {
    const g = G.current
    const plan = planFor(3)
    plan.ammo = [0, 1, 0, 3]
    build(plan)
    g.biome = 0
    g.demoT = 0
  }

  function nextLevel() {
    const g = G.current
    g.level += 1
    g.stats.level = g.level
    const plan = planFor(g.level)
    build(plan)
    const nb = Math.floor((g.level - 1) / 5) % BIOMES.length
    const biomeChanged = nb !== g.biome
    g.biome = nb
    const fresh = [1, 2, 3].find((k) => UNLOCK[k] === g.level)
    let sub: string | undefined
    if (fresh != null) sub = `New: ${AMMO[fresh].name} — ${AMMO[fresh].tip}`
    else if (biomeChanged) sub = BIOMES[nb].name
    else if (plan.hint) sub = plan.hint
    if (plan.name) sub = sub ? `${plan.name} · ${sub}` : plan.name
    setBanner({ key: Date.now(), text: plan.boss ? "KING'S CASTLE" : `LEVEL ${g.level}`, sub: plan.boss ? `Level ${g.level}${sub ? ' · ' + sub : ''}` : sub })
    if (plan.boss) sfx.boom(0.4)
    else sfx.ready()
    if (g.level > 1) fx.flash('#ffffff', 0.18)
    if (g.level % 5 === 1 && g.level > 1) milestone('level', g.level - 1)
    run.update({ ...g.stats })
    pushHud()
  }

  function milestone(kind: string, value: number) {
    const g = G.current
    const now = performance.now()
    if (now - g.lastMilestone < 30000) return
    g.lastMilestone = now
    void trackEvent('action_milestone', { game_id: 'catapult', kind, value })
  }

  // ── Run lifecycle ──────────────────────────────────────

  function start(level = run.nextLevel) {
    void unlockAudio()
    const g = freshGame()
    // nextLevel() increments, so begin one below the chosen level.
    g.level = Math.max(0, level - 1)
    g.reserve = run.level('reserve')
    G.current = g
    dragRef.current = null
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    nextLevel()
  }

  function fail() {
    if (phaseRef.current !== 'play') return
    const g = G.current
    setPhaseBoth('dying')
    setBanner({ key: Date.now(), text: 'OUT OF SHOTS', sub: `${g.guardsLeft} guard${g.guardsLeft === 1 ? '' : 's'} left` })
    fx.flash('#ef4444', 0.25)
    fx.shake(8, 0.3)
    fx.slowmo(0.8, 0.4)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const cleared = g.level - 1
      const coins = Math.round(cleared * 3 + g.totalStars * 1.5 + g.stats.guards * 0.3)
      run.end({ score: g.score, cleared: g.level >= 5, stats: { ...g.stats }, coins }, revive)
    }, 1200)
  }

  function revive() {
    const g = G.current
    const unlocked = [3, 2, 1].filter((k) => UNLOCK[k] <= g.level)
    g.queue = [0, 0]
    if (unlocked.length) g.queue.push(unlocked[0])
    g.sub = 'load'
    g.subT = 0
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: `+${g.queue.length} shots` })
    const [sx, sy] = toScreen(REST_X, REST_Y)
    fx.ring(sx, sy, { color: '#fde047', maxR: 70, life: 0.6 })
    pushHud()
    setPhaseBoth('play')
  }

  // ── Shooting ───────────────────────────────────────────

  function launch(kind: number, px: number, py: number, vx: number, vy: number) {
    const g = G.current
    const def = AMMO[kind]
    const b = g.phys.add({ x: px, y: py, r: def.r, mat: 'ammo', density: def.density, kind })
    b.vx = vx
    b.vy = vy
    b.w = vx * 0.02
    g.shots = [{ body: b, kind, t: 0, used: kind === 0, impactT: -1, slowT: 0, done: false, main: true }]
    g.shotsUsed += 1
    g.trail = []
    g.trailT = 0
    g.combo = 0
    g.sub = 'fly'
    g.subT = 0
    g.bandT = 0.3
    if (phaseRef.current !== 'idle') {
      sfx.whoosh()
      haptic.light()
      const [sx, sy] = toScreen(px, py)
      fx.burst(sx, sy, { count: 8, color: ['#fef3c7', '#d6d3d1'], speed: 120, size: 2.5, gravity: 0 })
    }
  }

  function releaseDrag() {
    const g = G.current
    const d = dragRef.current
    dragRef.current = null
    if (!d || g.sub !== 'aim' || phaseRef.current !== 'play') return
    const len = Math.hypot(d.dx, d.dy)
    if (len < 14) return
    const kind = g.queue.shift() ?? 0
    launch(kind, REST_X + d.dx * POUCH_K, REST_Y + d.dy * POUCH_K, -d.dx * POWER, -d.dy * POWER)
    pushHud()
  }

  function activate() {
    const g = G.current
    if (g.sub !== 'fly') return
    const s = [...g.shots].reverse().find((o) => !o.done && !o.used)
    if (!s) return
    const b = s.body
    const [sx, sy] = toScreen(b.x, b.y)
    s.used = true
    if (s.kind === 1) {
      const sp = Math.hypot(b.vx, b.vy)
      const a = Math.atan2(b.vy, b.vx)
      for (const da of [-0.2, 0.2]) {
        const nb = g.phys.add({ x: b.x - Math.sin(a) * da * 60, y: b.y + Math.cos(a) * da * 60, r: AMMO[1].r, mat: 'ammo', density: AMMO[1].density, kind: 1 })
        nb.vx = Math.cos(a + da) * sp
        nb.vy = Math.sin(a + da) * sp
        g.shots.push({ body: nb, kind: 1, t: s.t, used: true, impactT: -1, slowT: 0, done: false, main: false })
      }
      fx.ring(sx, sy, { color: '#93c5fd', maxR: 34, life: 0.3 })
      fx.burst(sx, sy, { count: 10, color: ['#bfdbfe', '#ffffff'], speed: 160, gravity: 0, size: 2.5 })
      sfx.whoosh()
      sfx.pop()
      haptic.light()
    } else if (s.kind === 2) {
      b.vx *= 0.3
      b.vy = Math.max(b.vy, 0) + 720
      fx.ring(sx, sy, { color: '#e5e7eb', maxR: 40, life: 0.3 })
      sfx.whoosh()
      haptic.medium()
    } else if (s.kind === 3) {
      detonate(s)
    }
  }

  function detonate(s: Shot) {
    const g = G.current
    s.used = true
    s.done = true
    const b = s.body
    g.phys.remove(b)
    explode(b.x, b.y, 105, 1.25)
  }

  function finishShot(s: Shot) {
    const g = G.current
    s.done = true
    if (!s.body.dead) {
      const [sx, sy] = toScreen(s.body.x, s.body.y)
      fx.burst(sx, sy, { count: 10, color: ['#e7e5e4', '#a8a29e', '#ffffff'], speed: 90, size: 5, gravity: -30, life: 0.6 })
      g.phys.remove(s.body)
    }
  }

  // ── Destruction ────────────────────────────────────────

  function addScore(base: number, sx: number, sy: number, color: string) {
    const g = G.current
    g.combo += 1
    g.comboT = 1.6
    const mult = 1 + Math.floor(g.combo / 5) * 0.5
    const pts = Math.round((base * mult) / 10) * 10
    g.score += pts
    fx.text(sx, sy - 10, `+${pts}`, color, base >= 500 ? 20 : 14)
    if (g.combo % 5 === 0) {
      fx.text(sx, sy - 40, `COMBO x${g.combo}`, '#fde047', 22)
      sfx.combo()
      haptic.medium()
    }
  }

  function spawnChunks(b: Body, colors: string[], count: number) {
    const g = G.current
    for (let i = 0; i < count; i++) {
      if (g.chunks.length >= MAX_CHUNKS) g.chunks.shift()
      const lx = b.circle ? rand(-b.r, b.r) * 0.6 : rand(-b.hw, b.hw)
      const ly = b.circle ? rand(-b.r, b.r) * 0.6 : rand(-b.hh, b.hh)
      const c = Math.cos(b.a)
      const s = Math.sin(b.a)
      const x = b.x + lx * c - ly * s
      const y = b.y + lx * s + ly * c
      const a = Math.atan2(y - b.y, x - b.x) + rand(-0.6, 0.6)
      const sp = rand(60, 230)
      g.chunks.push({
        x,
        y,
        vx: b.vx * 0.3 + Math.cos(a) * sp,
        vy: b.vy * 0.3 + Math.sin(a) * sp - 120,
        rot: rand(0, 6),
        vr: rand(-10, 10),
        s: rand(2.5, 6.5),
        color: colors[i % colors.length],
        life: rand(1.4, 2.4),
      })
    }
  }

  function destroy(b: Body) {
    if (b.dead) return
    const g = G.current
    g.phys.remove(b)
    g.phys.wakeArea(b.x, b.y, 40)
    const [sx, sy] = toScreen(b.x, b.y)
    const s = camRef.current.s
    const colors = MAT_COLORS[b.mat] ?? ['#ffffff']
    const loud = phaseRef.current !== 'idle'
    if (b.mat === 'guard' || b.mat === 'king') {
      const king = b.mat === 'king'
      fx.burst(sx, sy, { count: king ? 34 : 22, color: ['#7cc443', '#bef264', '#ffffff', '#facc15'], speed: king ? 340 : 250, size: 4 })
      fx.ring(sx, sy, { color: '#bef264', maxR: b.r * s * 3.2, life: 0.4 })
      spawnChunks(b, colors, king ? 8 : 4)
      g.guardsLeft = Math.max(0, g.guardsLeft - 1)
      if (live()) {
        g.stats.guards += 1
        addScore(king ? 3000 : 500, sx, sy, '#bef264')
        sfx.pop()
        sfx.score(Math.min(12, g.combo))
        haptic.medium()
        fx.stop(king ? 0.15 : 0.05)
        if (king) {
          g.stats.bosses += 1
          fx.slowmo(0.9, 0.3)
          fx.shake(12, 0.4)
          fx.flash('#fde68a', 0.2)
          sfx.win()
          setBanner({ key: Date.now(), text: 'KING TOPPLED!', sub: '+3000' })
          milestone('boss', g.level)
        }
        run.update({ ...g.stats })
        pushHud()
      }
      return
    }
    if (b.mat === 'tnt') {
      spawnChunks(b, colors, 6)
      if (live()) {
        g.stats.blocks += 1
        addScore(MAT_POINTS.tnt, sx, sy, '#fca5a5')
      }
      explode(b.x, b.y, 95, 1)
      return
    }
    const area = b.hw * b.hh * 4
    spawnChunks(b, colors, clamp(Math.round(area / 110), 4, 10))
    if (b.mat === 'glass') fx.burst(sx, sy, { count: 12, color: ['#e0f2fe', '#ffffff', '#7dd3fc'], speed: 220, shape: 'spark', size: 2, gravity: 500 })
    else fx.burst(sx, sy, { count: 8, color: b.mat === 'stone' ? ['#d6d3d1', '#a8a29e'] : ['#e7c9a0', '#d6b386'], speed: 70, size: 6, gravity: -20, life: 0.7, drag: 3 })
    if (live()) {
      g.stats.blocks += 1
      addScore(MAT_POINTS[b.mat] ?? 50, sx, sy, '#ffffff')
    }
    if (loud && g.soundT <= 0) {
      g.soundT = 0.06
      if (b.mat === 'glass') {
        sfx.slash()
        sfx.tick()
      } else if (b.mat === 'stone') sfx.clang()
      else sfx.thud()
    }
  }

  function explode(x: number, y: number, R: number, power: number) {
    const g = G.current
    const [sx, sy] = toScreen(x, y)
    const s = camRef.current.s
    fx.explode(sx, sy, 1.4 * power)
    fx.ring(sx, sy, { color: '#fde047', maxR: R * s, life: 0.4, width: 5 })
    if (phaseRef.current !== 'idle') {
      fx.flash('#fde68a', 0.15)
      fx.shake(10 * power, 0.35)
      fx.stop(0.06)
      sfx.boom(Math.min(1, 0.6 * power))
      haptic.heavy()
    }
    const doomed: Body[] = []
    for (const b of g.phys.bodies.slice()) {
      if (b.isStatic || b.dead) continue
      const dx = b.x - x
      const dy = b.y - y
      const len = Math.hypot(dx, dy) || 1
      const d = len - (b.circle ? b.r : Math.min(b.hw, b.hh))
      if (d > R) continue
      const k = 1 - Math.max(0, d) / R
      g.phys.wake(b)
      const imp = 680 * k * power * Math.pow(Math.min(1, 1400 / b.m), 0.35) * (b.mat === 'ammo' ? 0.3 : 1)
      b.vx += (dx / len) * imp
      b.vy += (dy / len) * imp - 140 * k
      b.w += rand(-7, 7) * k
      if (b.mat === 'ammo') continue
      b.hp -= 120 * k * power * g.phys.ammoPower
      b.flash = 0.15
      if (b.hp <= 0) doomed.push(b)
    }
    for (const b of doomed) destroy(b)
  }

  function afterStep() {
    const g = G.current
    const doomed: Body[] = []
    for (const b of g.phys.bodies) {
      if (b.flash > 0) b.flash -= STEP
      if (b.isStatic || b.mat === 'ammo') continue
      if (b.hit > 7) {
        b.hp -= b.hit
        b.flash = 0.12
        if (b.hp <= 0) doomed.push(b)
      } else if (b.y > 400 || b.x < -160 || b.x > VIEW_W + 180) doomed.push(b)
    }
    for (const b of doomed) destroy(b)
    // Impact feedback
    if (phaseRef.current !== 'idle') {
      for (const im of g.phys.impacts) {
        if (im.speed > 380 && (im.a === 'ammo' || im.b === 'ammo')) {
          fx.shake(Math.min(7, im.speed / 120), 0.18)
          if (g.soundT <= 0) {
            g.soundT = 0.08
            sfx.hit()
            haptic.light()
          }
          const [sx, sy] = toScreen(im.x, im.y)
          fx.burst(sx, sy, { count: 6, color: ['#fef3c7', '#ffffff'], speed: 160, size: 2, shape: 'spark' })
          break
        }
      }
    }
  }

  // ── Turn flow ──────────────────────────────────────────

  function nextTurn() {
    const g = G.current
    if (phaseRef.current === 'idle') {
      if (g.guardsLeft === 0 || g.queue.length === 0) buildDemo()
      else {
        g.sub = 'load'
        g.subT = 0
      }
      return
    }
    if (g.guardsLeft === 0) return
    if (g.queue.length === 0) {
      if (g.reserve > 0) {
        g.reserve -= 1
        g.queue.push(0)
        setBanner({ key: Date.now(), text: 'RESERVE SHOT', sub: `${g.reserve} left` })
        sfx.power()
      } else {
        fail()
        return
      }
    }
    g.sub = 'load'
    g.subT = 0
    pushHud()
  }

  function finishLevel() {
    const g = G.current
    const plan = g.plan
    if (!plan) return
    const left = g.queue.length
    const stars = g.shotsUsed <= plan.par ? 3 : g.shotsUsed <= plan.par + 1 ? 2 : 1
    const saved = run.completeLevel(g.level, stars)
    g.clearStars = stars
    g.clearBonus = left * 1000
    g.starsShown = 0
    g.score += g.clearBonus + stars * 250
    g.totalStars += stars
    if (stars === 3) g.stats.stars3 += 1
    g.sub = 'clear'
    g.subT = 0
    setBanner({ key: Date.now(), text: plan.boss ? 'CASTLE FALLS!' : 'LEVEL CLEAR!', sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}${left ? ` · ${left} spare shot${left > 1 ? 's' : ''} +${g.clearBonus}` : ''}${saved.improved && !saved.firstClear ? ' · new best' : ''}` })
    sfx.win()
    haptic.success()
    run.update({ ...g.stats })
    pushHud()
  }

  function update(dt: number, raw: number) {
    const g = G.current
    const ph = phaseRef.current
    g.soundT -= raw
    g.bandT = Math.max(0, g.bandT - raw)
    if (g.comboT > 0) {
      g.comboT -= dt
      if (g.comboT <= 0) g.combo = 0
    }

    // Physics
    g.acc += dt
    let n = 0
    while (g.acc >= STEP && n < 4) {
      g.phys.step(STEP)
      afterStep()
      g.acc -= STEP
      n++
    }
    if (n >= 4) g.acc = 0

    // Chunks
    const earth = g.plan?.earth
    for (const c of g.chunks) {
      c.vy += 900 * dt
      c.x += c.vx * dt
      c.y += c.vy * dt
      c.rot += c.vr * dt
      c.life -= dt
      let floor = 0
      if (earth && c.x > earth.x - (earth.hw ?? 0) && c.x < earth.x + (earth.hw ?? 0)) floor = earth.y - (earth.hh ?? 0)
      if (c.y > floor - c.s * 0.5 && c.vy > 0 && c.y < floor + 20) {
        c.y = floor - c.s * 0.5
        c.vy *= -0.35
        c.vx *= 0.6
        c.vr *= 0.6
      }
    }
    if (g.chunks.length) g.chunks = g.chunks.filter((c) => c.life > 0)

    if (ph === 'over') return
    g.subT += dt

    if (g.guardsLeft === 0 && g.sub !== 'clearwait' && g.sub !== 'clear' && ph === 'play') {
      g.sub = 'clearwait'
      g.subT = 0
    }

    switch (g.sub) {
      case 'load':
        if (g.subT > 0.35 && g.queue.length > 0) g.sub = 'aim'
        break
      case 'aim':
        if (ph === 'idle') {
          g.demoT += dt
          if (g.demoT > 2.2) {
            g.demoT = 0
            demoShot()
          }
        }
        break
      case 'fly': {
        let all = true
        for (const s of g.shots) {
          if (s.done) continue
          const b = s.body
          if (b.dead) {
            s.done = true
            continue
          }
          all = false
          s.t += dt
          if (s.main) {
            g.trailT += dt
            if (g.trailT > 0.035 && g.trail.length < 70 && s.impactT < 0) {
              g.trailT = 0
              g.trail.push([b.x, b.y])
            }
          }
          if (s.impactT < 0 && b.contacts > 0) s.impactT = s.t
          if (s.kind === 3 && !s.used && ((s.impactT >= 0 && s.t - s.impactT > 1.1) || s.t > 5)) {
            detonate(s)
            continue
          }
          const sp = Math.hypot(b.vx, b.vy)
          s.slowT = sp < 20 ? s.slowT + dt : 0
          if (s.slowT > 0.45 || s.t > 9 || b.x > VIEW_W + 120 || b.x < -120 || b.y > 300) finishShot(s)
        }
        if (all) {
          g.sub = 'settle'
          g.subT = 0
        }
        break
      }
      case 'settle': {
        let mx = 0
        for (const b of g.phys.bodies) if (b.awake && b.mat !== 'ammo') mx = Math.max(mx, Math.abs(b.vx) + Math.abs(b.vy))
        if ((mx < 40 && g.subT > 0.6) || g.subT > 3.2) nextTurn()
        break
      }
      case 'clearwait':
        if (ph === 'idle') {
          if (g.subT > 1.5) buildDemo()
        } else if (g.subT > 1.1) finishLevel()
        break
      case 'clear': {
        const want = Math.min(g.clearStars, Math.floor((g.subT - 0.25) / 0.32) + 1)
        if (g.subT > 0.25 && want > g.starsShown) {
          g.starsShown = want
          sfx.score(g.starsShown * 2)
          haptic.light()
        }
        if (g.subT > 2.6) nextLevel()
        break
      }
    }
  }

  function demoShot() {
    const g = G.current
    const targets = g.phys.bodies.filter((b) => b.mat === 'guard' || b.mat === 'king')
    if (!targets.length || !g.queue.length) return
    const t = targets[Math.floor(Math.random() * targets.length)]
    const kind = g.queue.shift() ?? 0
    const x0 = REST_X - 40
    const y0 = REST_Y + 26
    const dx = t.x - x0
    const h = y0 - t.y
    let th = 0.72
    let den = 2 * Math.cos(th) ** 2 * (dx * Math.tan(th) - h)
    if (den <= 0) {
      th = 1.05
      den = 2 * Math.cos(th) ** 2 * (dx * Math.tan(th) - h)
    }
    const v = Math.min(720, Math.sqrt((g.phys.gravity * dx * dx) / Math.max(1, den)) * 1.03)
    launch(kind, x0, y0, Math.cos(th) * v, -Math.sin(th) * v)
    if (kind !== 0) {
      const s = g.shots[0]
      window.setTimeout(() => {
        if (G.current === g && !s.done && phaseRef.current === 'idle') activate()
      }, 650)
    }
  }

  // ── Input ──────────────────────────────────────────────

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const g = G.current
    const p = localPoint(e, e.currentTarget)
    if (g.sub === 'fly') {
      activate()
      return
    }
    if (g.sub === 'aim' || g.sub === 'load') {
      e.currentTarget.setPointerCapture(e.pointerId)
      dragRef.current = { id: e.pointerId, sx: p.x, sy: p.y, dx: 0, dy: 0 }
      sfx.tap()
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    const p = localPoint(e, e.currentTarget)
    const s = camRef.current.s
    let dx = (p.x - d.sx) / s
    let dy = (p.y - d.sy) / s
    const len = Math.hypot(dx, dy)
    if (len > MAX_PULL) {
      dx *= MAX_PULL / len
      dy *= MAX_PULL / len
    }
    if (Math.abs(Math.hypot(dx, dy) - Math.hypot(d.dx, d.dy)) > 12) sfx.tick()
    d.dx = dx
    d.dy = dy
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    releaseDrag()
  }

  // Dev-only bot hook: lob the next shot at a remaining guard (capped at full-pull power).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__lv3ct = {
      state: () => ({ level: G.current.level, sub: G.current.sub, guards: G.current.guardsLeft, shots: G.current.queue.length }),
      solve: () => {
        const g = G.current
        if (phaseRef.current !== 'play' || g.sub !== 'aim' || !g.queue.length) return false
        const targets = g.phys.bodies.filter((b) => b.mat === 'guard' || b.mat === 'king').sort((a, b) => a.x - b.x)
        if (!targets.length) return false
        const t = targets[0]
        const kind = g.queue.shift() ?? 0
        const x0 = REST_X - 40
        const y0 = REST_Y + 26
        const dx = t.x - x0
        const h = y0 - t.y
        let th = 0.72
        let den = 2 * Math.cos(th) ** 2 * (dx * Math.tan(th) - h)
        if (den <= 0) {
          th = 1.05
          den = 2 * Math.cos(th) ** 2 * (dx * Math.tan(th) - h)
        }
        const v = Math.min(MAX_PULL * POWER, Math.sqrt((g.phys.gravity * dx * dx) / Math.max(1, den)) * 1.03)
        launch(kind, x0, y0, Math.cos(th) * v, -Math.sin(th) * v)
        pushHud()
        return true
      },
    }
    return () => {
      delete win.__lv3ct
    }
  })

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === ' ') {
        e.preventDefault()
        activate()
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Render ─────────────────────────────────────────────

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    const cam = camera(W, H)
    camRef.current = cam
    const g = G.current
    const ph = phaseRef.current
    if (ph === 'idle' && !g.plan) buildDemo()
    const dt = fx.step(raw)
    update(dt, raw)

    const { s, ox, gy } = cam
    const X = (x: number) => ox + x * s
    const Y = (y: number) => gy + y * s
    const biome = BIOMES[g.biome]

    drawBackground(ctx, W, H, cam, g.biome)
    drawClouds(ctx, W, gy, t, biome.night)
    fx.applyShake(ctx)

    // Static earth
    for (const b of g.phys.bodies) {
      if (b.mat !== 'earth') continue
      ctx.save()
      ctx.translate(X(b.x), Y(b.y))
      ctx.scale(s, s)
      drawBlock(ctx, b, biome)
      ctx.restore()
    }

    // Trail of the last shot
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    g.trail.forEach(([x, y], i) => {
      ctx.beginPath()
      ctx.arc(X(x), Y(y), (i % 3 === 0 ? 2.6 : 1.6) * s, 0, Math.PI * 2)
      ctx.fill()
    })

    // Sling back arm + back band
    const aiming = (g.sub === 'aim' || g.sub === 'load') && (ph === 'play' || ph === 'idle') && g.queue.length > 0
    const d = dragRef.current
    const loadK = g.sub === 'load' ? clamp(g.subT / 0.35, 0, 1) : 1
    let px = REST_X
    let py = REST_Y
    if (aiming && g.sub === 'aim' && d && ph === 'play') {
      px += d.dx * POUCH_K
      py += d.dy * POUCH_K
    } else if (aiming && g.sub === 'load') {
      const fx0 = 30
      const fy0 = MOUND - AMMO[g.queue[0]].r
      px = fx0 + (REST_X - fx0) * loadK
      py = fy0 + (REST_Y - fy0) * loadK - Math.sin(loadK * Math.PI) * 40
    }
    ctx.save()
    ctx.translate(X(SLING_X), Y(MOUND))
    ctx.scale(s, s)
    drawSling(ctx, true)
    ctx.restore()
    const snap = g.bandT > 0 ? Math.sin(g.bandT * 40) * g.bandT * 20 : 0
    const bandTo = aiming && g.sub === 'aim' ? [px, py] : [REST_X + snap, REST_Y + 4]
    ctx.strokeStyle = '#3f2a14'
    ctx.lineWidth = 4 * s
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(X(SLING_X + 11), Y(MOUND - 82))
    ctx.lineTo(X(bandTo[0]), Y(bandTo[1]))
    ctx.stroke()

    // Bodies
    const active = g.shots.find((o) => !o.done)?.body
    const lookX = active ? active.x : REST_X
    const lookY = active ? active.y : REST_Y
    for (const b of g.phys.bodies) {
      if (b.mat === 'ground' || b.mat === 'earth') continue
      ctx.save()
      ctx.translate(X(b.x), Y(b.y))
      ctx.scale(s, s)
      ctx.rotate(b.a)
      if (b.mat === 'guard' || b.mat === 'king') {
        const near = !!active && Math.hypot(active.x - b.x, active.y - b.y) < 190
        drawGuard(ctx, b, Math.atan2(lookY - b.y, lookX - b.x) - b.a, near || b.flash > 0, t)
      } else if (b.mat === 'ammo') {
        drawAmmo(ctx, b.kind, b.r, b.id, t)
      } else drawBlock(ctx, b, biome)
      ctx.restore()
    }

    // Debris chunks
    for (const c of g.chunks) {
      ctx.globalAlpha = Math.min(1, c.life * 1.5)
      ctx.fillStyle = c.color
      ctx.save()
      ctx.translate(X(c.x), Y(c.y))
      ctx.rotate(c.rot)
      const cs = c.s * s
      ctx.beginPath()
      ctx.moveTo(-cs * 0.6, -cs * 0.5)
      ctx.lineTo(cs * 0.6, -cs * 0.3)
      ctx.lineTo(cs * 0.3, cs * 0.6)
      ctx.lineTo(-cs * 0.5, cs * 0.4)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    ctx.globalAlpha = 1

    // Ammo waiting on the ground
    const waiting = aiming ? g.queue.slice(1) : g.queue
    waiting.slice(0, 3).forEach((k, i) => {
      const r = AMMO[k].r
      const bob = Math.abs(Math.sin(t * 3 + i)) * 3
      ctx.save()
      ctx.translate(X(30 - i * 17), Y(MOUND - r - bob))
      ctx.scale(s, s)
      drawAmmo(ctx, k, r, i + 7, t, false)
      ctx.restore()
    })

    // Loaded ammo + front band + front arm
    if (aiming) {
      const k = g.queue[0]
      const r = AMMO[k].r
      ctx.save()
      ctx.translate(X(px), Y(py))
      ctx.scale(s, s)
      if (d && ph === 'play') ctx.rotate(Math.atan2(d.dy, d.dx) + Math.PI)
      drawAmmo(ctx, k, r, 99, t)
      ctx.restore()
    }
    ctx.strokeStyle = '#3f2a14'
    ctx.lineWidth = 4.5 * s
    ctx.beginPath()
    ctx.moveTo(X(SLING_X - 11), Y(MOUND - 82))
    ctx.lineTo(X(bandTo[0]), Y(bandTo[1]))
    ctx.stroke()
    if (aiming && g.sub === 'aim') {
      ctx.fillStyle = '#5b3413'
      ctx.beginPath()
      ctx.arc(X(px), Y(py), 3.5 * s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.save()
    ctx.translate(X(SLING_X), Y(MOUND))
    ctx.scale(s, s)
    drawSling(ctx, false)
    ctx.restore()

    // Aim guide (only the first part of the arc)
    if (aiming && g.sub === 'aim' && d && ph === 'play' && Math.hypot(d.dx, d.dy) >= 14) {
      const vx = -d.dx * POWER
      const vy = -d.dy * POWER
      const span = 0.34 + run.level('scope') * 0.14
      const pow = Math.hypot(d.dx, d.dy) / MAX_PULL
      for (let tt = 0.05; tt < span; tt += 0.04) {
        const x = px + vx * tt
        const y = py + vy * tt + 0.5 * g.phys.gravity * tt * tt
        ctx.globalAlpha = 0.9 * (1 - tt / span) + 0.1
        ctx.fillStyle = pow > 0.92 ? '#fde047' : '#ffffff'
        ctx.beginPath()
        ctx.arc(X(x), Y(y), Math.max(1.5, 3.6 * s * (1 - tt / span * 0.6)), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)

    // Off-screen marker for high shots
    if (active && Y(active.y) < -6) {
      const mx = clamp(X(active.x), 20, W - 20)
      ctx.fillStyle = 'rgba(15,23,42,0.55)'
      ctx.beginPath()
      ctx.arc(mx, 22, 15, 0, Math.PI * 2)
      ctx.fill()
      ctx.save()
      ctx.translate(mx, 22)
      ctx.scale(0.7, 0.7)
      drawAmmo(ctx, active.kind, AMMO[active.kind].r, active.id, t, true)
      ctx.restore()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(mx - 5, 4)
      ctx.lineTo(mx + 5, 4)
      ctx.lineTo(mx, -2)
      ctx.fill()
    }

    // Tap hint for specials in flight
    if (ph === 'play' && g.sub === 'fly') {
      const s0 = g.shots.find((o) => !o.done && !o.used)
      if (s0 && s0.t < 1.2) {
        ctx.globalAlpha = 0.6 + Math.sin(t * 10) * 0.3
        ctx.fillStyle = '#ffffff'
        ctx.font = "800 14px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.fillText('TAP!', X(s0.body.x), Y(s0.body.y) - 26)
        ctx.globalAlpha = 1
      }
    }

    // Stars after a clear
    if (g.sub === 'clear') {
      const k = clamp(g.subT / 0.25, 0, 1)
      const cy = H * 0.28
      ctx.globalAlpha = k
      ctx.fillStyle = 'rgba(15,23,42,0.45)'
      ctx.beginPath()
      ctx.roundRect(W / 2 - 120, cy - 44, 240, 88, 22)
      ctx.fill()
      ctx.globalAlpha = 1
      for (let i = 0; i < 3; i++) {
        const filled = i < g.starsShown
        const pop = filled ? 1 + Math.max(0, 0.4 - (g.subT - 0.25 - i * 0.32)) * 1.2 : 1
        drawStar(ctx, W / 2 + (i - 1) * 72, cy - (i === 1 ? 8 : 0), 26 * pop * k, filled)
      }
    }
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div
          className="action-arena"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Level {hud.level}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">Guards {hud.guards}</span>
                <span className="action-hud__small">
                  Shots {hud.shots}
                  {hud.reserve ? ` +${hud.reserve}` : ''}
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
          {phase === 'idle' && (
            <ActionIdle
              game="catapult"
              icon={meta.icon}
              title={meta.title}
              hint="Drag back and release to fling. Knock out every guard before you run out of shots."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.level >= 5 ? 'Siege master!' : 'Out of ammo!'}
            subtitle={`Score ${hud.score} · Level ${hud.level} · ${hud.stars} stars`}
            celebrate={hud.level >= 5}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
