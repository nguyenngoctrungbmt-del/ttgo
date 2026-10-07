import { useEffect, useRef, useState, type PointerEvent } from 'react'
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
import { useProgressStore } from '../../store/progressStore'
import '../../shared/action/action.css'
import { SKIES, drawBird, drawCoin, drawSpikes } from './art'
import { drawBolt, drawFireball, drawOni, drawRival, drawScroll, drawShuriken, drawVent } from './art2'
import './ninja.css'

const meta = getGame('ninja')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Building = { x: number; w: number; top: number; seed: number; deco: number }
type EnemyKind = 'guard' | 'archer' | 'bird' | 'rival'
type Enemy = { id: number; kind: EnemyKind; x: number; y: number; t: number; shoot: number; dead: boolean }
type Arrow = { x: number; y: number; vx: number; vy: number; friendly: boolean; life: number; kind?: 'star' | 'fire' }
type Coin = { x: number; y: number; taken: boolean }
type Spike = { x: number; w: number; y: number }
type ScarfPt = { x: number; y: number }
/** Fire vent on a roof: cycles idle → warn (puffs) → blast (flame column). */
type Vent = { x: number; y: number; t: number }
type Scroll = { x: number; y: number; taken: boolean }
type Mote = { x: number; y: number; vx: number; vy: number; s: number; ph: number }
/** Lightning strike marked on a roof, then a burning patch. */
type Strike = { x: number; y: number; warn: number; burn: number }
/** Oni warlord on a storm cloud: deflect its fireballs back to hurt it. */
type Oni = { hp: number; max: number; t: number; enter: number; atkT: number; wind: number; mode: 'fire' | 'bolt'; hurt: number; wave: number; y: number }

const RIVAL_FROM = 600
const VENT_FROM = 800
const SCROLL_FROM = 300
const FIRST_ONI = 750
const ONI_EVERY = 1000
const VENT_CYCLE = 3.1
const ONI_SX = 0.8

const GRAVITY = 2300
const JUMP_V = 760
const DOUBLE_V = 660
const COYOTE = 0.09
const BUFFER = 0.12
const PLAYER_SX = 0.28
const PX_PER_M = 40

type World = {
  camX: number
  speed: number
  buildings: Building[]
  enemies: Enemy[]
  arrows: Arrow[]
  coins: Coin[]
  spikes: Spike[]
  py: number
  vy: number
  grounded: boolean
  coyote: number
  buffer: number
  jumps: number
  holding: boolean
  slash: number
  slashCd: number
  runT: number
  squash: number
  scarf: ScarfPt[]
  id: number
  kills: number
  coinCount: number
  /** Invulnerability seconds (revive / guard). */
  inv: number
  guards: number
  magnet: number
  best: number
  bestShown: boolean
  vents: Vent[]
  scrolls: Scroll[]
  nextScroll: number
  /** Shadow Dash seconds left (scroll power-up). */
  dash: number
  motes: Mote[]
  strikes: Strike[]
  oni: Oni | null
  nextOni: number
  onis: number
  bonus: number
  god: boolean
  stats: { score: number; distance: number; kills: number; coins: number; deflects: number; stomps: number }
}

function freshWorld(W: number, H: number): World {
  const top = H * 0.7
  const buildings: Building[] = [{ x: -40, w: W * 1.4, top, seed: 1, deco: 0 }]
  return {
    camX: 0,
    speed: 250,
    buildings,
    enemies: [],
    arrows: [],
    coins: [],
    spikes: [],
    py: top,
    vy: 0,
    grounded: true,
    coyote: 0,
    buffer: 0,
    jumps: 0,
    holding: false,
    slash: 0,
    slashCd: 0,
    runT: 0,
    squash: 0,
    scarf: Array.from({ length: 8 }, () => ({ x: W * PLAYER_SX, y: top - 30 })),
    id: 1,
    kills: 0,
    coinCount: 0,
    inv: 0,
    guards: 0,
    magnet: 22,
    best: 0,
    bestShown: false,
    vents: [],
    scrolls: [],
    nextScroll: SCROLL_FROM,
    dash: 0,
    motes: [],
    strikes: [],
    oni: null,
    nextOni: FIRST_ONI,
    onis: 0,
    bonus: 0,
    god: false,
    stats: { score: 0, distance: 0, kills: 0, coins: 0, deflects: 0, stomps: 0 },
  }
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

export default function NinjaGame() {
  const run = useActionRun('ninja')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 520 })
  const world = useRef<World>(freshWorld(360, 520))
  const phaseRef = useRef<Phase>('idle')
  /** DEV-only: auto-slash incoming projectiles (screenshot scripts). */
  const autoSlash = useRef(false)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, dist: 0 })
  const [showHints, setShowHints] = useState(false)
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function score(w: World) {
    return Math.floor(w.camX / PX_PER_M) + w.kills * 10 + w.coinCount * 5 + w.bonus
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function start() {
    void unlockAudio()
    const w = freshWorld(size.current.w, size.current.h)
    w.guards = run.level('guard')
    w.magnet = 22 + run.level('magnet') * 18
    w.best = useProgressStore.getState().games.ninja?.bestScore ?? 0
    w.bestShown = w.best < 100
    world.current = w
    fx.reset()
    setHud({ score: 0, dist: 0 })
    run.begin()
    setPhaseBoth('play')
    setShowHints(true)
    window.setTimeout(() => setShowHints(false), 2600)
    sfx.ready()
  }

  function playerX(w: World) {
    return w.camX + size.current.w * PLAYER_SX
  }

  function die(reason: 'fall' | 'hit') {
    const w = world.current
    if (phaseRef.current !== 'play') return
    const sx = size.current.w * PLAYER_SX
    if (w.god) return
    if (reason === 'hit') {
      if (w.inv > 0 || w.dash > 0) return
      // Shadow Guard upgrade absorbs a hit.
      if (w.guards > 0) {
        w.guards -= 1
        w.inv = 1.2
        fx.ring(sx, w.py - 22, { color: '#7dd3fc', maxR: 50, life: 0.4, width: 4 })
        fx.text(sx, w.py - 60, 'GUARDED!', '#7dd3fc', 20)
        fx.shake(6, 0.2)
        sfx.clang()
        haptic.medium()
        return
      }
    }
    setPhaseBoth('dying')
    if (reason === 'hit') {
      fx.burst(sx, w.py - 20, { count: 24, color: ['#111827', '#ef4444', '#f9fafb'], speed: 260 })
      fx.flash('#ef4444', 0.3)
      fx.stop(0.18)
      fx.shake(12, 0.4)
      w.vy = -500
    } else {
      fx.shake(6, 0.3)
    }
    sfx.hurt()
    sfx.lose()
    haptic.error()
    fx.slowmo(0.8, 0.35)
    window.setTimeout(() => {
      const s = score(w)
      const fin = { ...w.stats, score: s, distance: Math.floor(w.camX / PX_PER_M) }
      setHud({ score: s, dist: fin.distance })
      setPhaseBoth('over')
      const coins = Math.round((w.coinCount / 4 + fin.distance / 40 + w.kills / 3 + w.onis * 8) * (1 + run.level('bounty') * 0.15))
      run.end({ score: s, cleared: fin.distance >= 500, stats: fin, coins }, revive)
    }, 1100)
  }

  /** Ad revive: drop the ninja onto the next safe roof, clear threats ahead, brief invulnerability. */
  function revive() {
    const w = world.current
    const { w: W } = size.current
    const px = playerX(w)
    // Next building that extends well past the player, so there is room to land.
    const b = w.buildings.find((o) => o.x + o.w > px + 80) ?? w.buildings[w.buildings.length - 1]
    const landX = Math.max(px, b.x + 30)
    w.camX = landX - W * PLAYER_SX
    w.py = b.top
    w.vy = 0
    w.grounded = true
    w.jumps = 0
    w.inv = 2.2
    const nx = playerX(w)
    w.enemies = w.enemies.filter((e) => e.dead || e.x < nx - 40 || e.x > nx + W * 0.8)
    w.arrows = []
    w.strikes = []
    w.spikes = w.spikes.filter((k) => k.x > nx + 200 || k.x + k.w < nx - 20)
    w.vents = w.vents.filter((v) => v.x > nx + 260 || v.x < nx - 40)
    if (w.oni) {
      w.oni.atkT = 2.5
      w.oni.wind = 0
    }
    for (const sc of w.scarf) {
      sc.x = W * PLAYER_SX
      sc.y = b.top - 30
    }
    fx.ring(W * PLAYER_SX, b.top - 22, { color: '#7dd3fc', maxR: 80, life: 0.6, width: 5 })
    showBanner('REVIVED!', 'shadow shield')
    setPhaseBoth('play')
  }

  function jumpPress() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    w.holding = true
    w.buffer = BUFFER
  }

  function jumpRelease() {
    const w = world.current
    w.holding = false
    // Variable jump height: let go early for a short hop.
    if (w.vy < -280) w.vy *= 0.5
  }

  function slashPress() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.slashCd > 0) return
    w.slash = 0.14
    w.slashCd = 0.3
    sfx.slash()
    haptic.light()
    const px = playerX(w)
    let hitSomething = false
    for (const e of w.enemies) {
      if (e.dead) continue
      const ey = e.y - 18
      if (e.x > px - 20 && e.x < px + 85 && Math.abs(ey - (w.py - 22)) < 60) {
        killEnemy(e, 'slash')
        hitSomething = true
      }
    }
    for (const a of w.arrows) {
      if (a.friendly) continue
      if (a.x > px - 20 && a.x < px + 90 && Math.abs(a.y - (w.py - 22)) < 55) {
        a.friendly = true
        a.vx = w.speed + 420
        a.vy = -60
        if (a.kind === 'fire' && w.oni) {
          const tx = w.camX + size.current.w * ONI_SX
          const time = Math.max(0.15, (tx - a.x) / 420)
          a.vy = (w.oni.y - a.y) / time
        }
        w.stats.deflects += 1
        const sx = a.x - w.camX
        fx.burst(sx, a.y, { count: 10, color: ['#fde047', '#ffffff'], speed: 220, shape: 'spark', gravity: 0 })
        fx.text(sx, a.y - 18, 'DEFLECT!', '#fde047', 16)
        sfx.clang()
        fx.stop(0.06)
        haptic.medium()
        hitSomething = true
      }
    }
    if (hitSomething) run.update(w.stats)
  }

  function killEnemy(e: Enemy, how: 'slash' | 'stomp' | 'arrow') {
    const w = world.current
    e.dead = true
    w.kills += 1
    w.stats.kills = w.kills
    if (how === 'stomp') w.stats.stomps += 1
    const sx = e.x - w.camX
    const color = e.kind === 'bird' ? '#a78bfa' : e.kind === 'archer' ? '#f59e0b' : e.kind === 'rival' ? '#3b82f6' : '#ef4444'
    fx.burst(sx, e.y - 16, { count: 18, color: [color, '#1f2937', '#ffffff'], speed: 240, size: 3.2 })
    fx.ring(sx, e.y - 16, { color: '#ffffff', maxR: 34, life: 0.25 })
    fx.text(sx, e.y - 40, how === 'stomp' ? 'STOMP +10' : '+10', '#fff', 16)
    fx.stop(0.05)
    fx.shake(4, 0.15)
    sfx.hit()
    haptic.medium()
    run.update(w.stats)
  }

  function groundAt(w: World, x: number): Building | null {
    for (const b of w.buildings) if (x >= b.x && x <= b.x + b.w) return b
    return null
  }

  function extendWorld(w: World) {
    const { w: W, h: H } = size.current
    let last = w.buildings[w.buildings.length - 1]
    while (last.x + last.w < w.camX + W * 2) {
      const diff = clamp(w.camX / 18000, 0, 1)
      const gap = rand(50, 95 + diff * 70) * (w.speed / 300)
      const width = rand(170, 380) * (1 - diff * 0.3)
      const top = clamp(last.top + rand(-85, 75), H * 0.5, H * 0.82)
      const b: Building = { x: last.x + last.w + gap, w: width, top, seed: Math.random() * 1000, deco: Math.floor(Math.random() * 3) }
      w.buildings.push(b)
      // Populate the roof.
      const roll = Math.random()
      const m = w.camX / PX_PER_M
      if (w.camX > 300 && roll < 0.55 + diff * 0.25 && !(w.oni && Math.random() < 0.6)) {
        const r2 = Math.random()
        const kind: EnemyKind = m > RIVAL_FROM && r2 < Math.min(0.3, 0.15 + (m - RIVAL_FROM) * 0.0002) ? 'rival' : r2 < 0.35 + diff * 0.2 ? 'archer' : 'guard'
        w.enemies.push({ id: w.id++, kind, x: b.x + rand(width * 0.45, width - 30), y: top, t: 0, shoot: rand(0.4, 1.2), dead: false })
      }
      // Spike traps from ~400 m: must be jumped, a slash won't help.
      if (w.camX > 16000 && width > 220 && Math.random() < 0.3 + diff * 0.15) {
        w.spikes.push({ x: b.x + rand(width * 0.15, width * 0.3), w: rand(34, 56), y: top })
      }
      if (m > VENT_FROM && width > 200 && Math.random() < Math.min(0.4, 0.22 + (m - VENT_FROM) * 0.0002)) {
        const vx = b.x + rand(width * 0.5, width * 0.75)
        if (!w.spikes.some((k) => Math.abs(k.x - vx) < 90)) w.vents.push({ x: vx, y: top, t: rand(0, VENT_CYCLE) })
      }
      if (m > w.nextScroll) {
        w.scrolls.push({ x: b.x + width * 0.5, y: top - 70, taken: false })
        w.nextScroll = m + rand(280, 380)
      }
      if (w.camX > 900 && Math.random() < 0.25 + diff * 0.2) {
        w.enemies.push({ id: w.id++, kind: 'bird', x: b.x + rand(0, width), y: top - rand(90, 150), t: rand(0, 6), shoot: 0, dead: false })
      }
      if (Math.random() < 0.7) {
        const n = 4 + Math.floor(Math.random() * 4)
        const arc = Math.random() < 0.4
        const cx = b.x + rand(20, Math.max(30, width - n * 26))
        for (let i = 0; i < n; i++) {
          const k = i / (n - 1)
          w.coins.push({ x: cx + i * 26, y: top - 26 - (arc ? Math.sin(k * Math.PI) * 70 : 0), taken: false })
        }
      }
      last = b
    }
    const cut = w.camX - 200
    w.buildings = w.buildings.filter((b) => b.x + b.w > cut)
    w.enemies = w.enemies.filter((e) => e.x > cut && !(e.dead && e.x < w.camX))
    w.coins = w.coins.filter((c) => c.x > cut && !c.taken)
    w.spikes = w.spikes.filter((k) => k.x + k.w > cut)
    w.vents = w.vents.filter((v) => v.x + 30 > cut)
    w.scrolls = w.scrolls.filter((c) => c.x > cut && !c.taken)
  }

  // ── Oni boss, vents, scrolls ──────────────────────────

  function startOni() {
    const w = world.current
    const { h: H } = size.current
    const hp = 5 + w.onis * 2
    w.oni = { hp, max: hp, t: 0, enter: 1, atkT: 1.1, wind: 0, mode: 'fire', hurt: 0, wave: w.onis, y: H * 0.3 }
    showBanner('ONI WARLORD!', 'slash its fireballs back at it')
    sfx.boom(0.9)
    window.setTimeout(() => sfx.levelUp(), 260)
    fx.flash('#7f1d1d', 0.35)
    fx.shake(10, 0.5)
    haptic.heavy()
  }

  function oniDefeated() {
    const w = world.current
    const { w: W } = size.current
    const o = w.oni
    if (!o) return
    const bx = W * ONI_SX
    fx.explode(bx, o.y, 2, ['#fde047', '#ef4444', '#fb923c', '#ffffff'])
    fx.slowmo(0.8, 0.3)
    fx.flash('#fde047', 0.3)
    w.oni = null
    w.strikes = []
    w.onis += 1
    w.bonus += 100
    w.nextOni = w.stats.distance + ONI_EVERY
    w.arrows = w.arrows.filter((a) => a.friendly)
    // Reward: coin rain ahead
    const px = playerX(w)
    for (let i = 0; i < 14; i++) w.coins.push({ x: px + 120 + i * 24, y: size.current.h * 0.42 - Math.sin((i / 13) * Math.PI) * 60, taken: false })
    showBanner('ONI DEFEATED!', '+100 · coin rain')
    sfx.win()
    haptic.success()
    void trackEvent('action_milestone', { game_id: 'ninja', kind: 'boss', value: w.onis })
  }

  function updateNew(dt: number, px: number) {
    const w = world.current
    const { w: W, h: H } = size.current
    w.dash = Math.max(0, w.dash - dt)
    if (!w.oni && w.stats.distance >= w.nextOni) startOni()
    const o = w.oni
    if (o) {
      o.t += dt
      o.enter = Math.max(0, o.enter - dt)
      o.hurt = Math.max(0, o.hurt - dt)
      o.y = H * 0.28 + Math.sin(o.t * 1.4) * 22
      const bx = w.camX + W * ONI_SX
      if (o.enter <= 0) {
        if (o.wind > 0) {
          o.wind += dt / 0.65
          if (o.wind >= 1) {
            o.wind = 0
            if (o.mode === 'fire') {
              const vx = -330
              const time = (bx - 30 - px) / (330 + w.speed)
              w.arrows.push({ x: bx - 30, y: o.y + 6, vx, vy: (w.py - 22 - (o.y + 6)) / Math.max(0.4, time), friendly: false, life: 5, kind: 'fire' })
              sfx.shoot()
            } else {
              // Mark a roof spot the ninja will reach in ~1 s
              const sx = px + w.speed * 1.05 + rand(-20, 20)
              const g = groundAt(w, sx)
              if (g) w.strikes.push({ x: sx, y: g.top, warn: 0.9, burn: 0 })
              sfx.tick()
            }
          }
        } else {
          o.atkT -= dt
          if (o.atkT <= 0) {
            o.mode = o.mode === 'bolt' || Math.random() < 0.65 ? 'fire' : 'bolt'
            o.wind = 0.01
            o.atkT = rand(1.2, 1.9) - Math.min(0.5, o.wave * 0.15)
          }
        }
      }
      for (const a of w.arrows) {
        if (!a.friendly || a.kind !== 'fire') continue
        if (Math.abs(a.x - bx) < 42 && Math.abs(a.y - o.y) < 46) {
          a.life = 0
          o.hp -= 1
          o.hurt = 0.2
          fx.burst(bx - w.camX + 0, o.y, { count: 20, color: ['#fde047', '#fb923c', '#ffffff'], speed: 280, shape: 'spark' })
          fx.text(W * ONI_SX, o.y - 50, o.hp > 0 ? 'HIT!' : 'K.O.!', '#fde047', 22)
          fx.stop(0.08)
          fx.shake(7, 0.25)
          sfx.hit()
          haptic.heavy()
          if (o.hp <= 0) {
            oniDefeated()
            break
          }
        }
      }
    }
    for (const k of w.strikes) {
      if (k.warn > 0) {
        k.warn -= dt
        if (k.warn <= 0) {
          k.burn = 1.3
          fx.burst(k.x - w.camX, k.y, { count: 16, color: ['#fef9c3', '#fde047', '#fb923c'], speed: 280, shape: 'spark', angle: -Math.PI / 2, spread: 2 })
          fx.shake(6, 0.2)
          sfx.boom(0.4)
        }
      } else {
        k.burn -= dt
        if (phaseRef.current === 'play' && Math.abs(px - k.x) < 26 && w.py > k.y - 16 && w.py <= k.y + 4) die('hit')
      }
    }
    if (w.strikes.length) w.strikes = w.strikes.filter((k) => k.warn > 0 || k.burn > 0)
    for (const v of w.vents) {
      v.t = (v.t + dt) % VENT_CYCLE
      if (v.t > 2.3 && phaseRef.current === 'play' && px > v.x - 6 && px < v.x + 34 && w.py > v.y - 115) {
        die('hit')
        if (phaseRef.current === 'play' && w.inv > 0) {
          w.vy = -560
          w.grounded = false
        }
      }
    }
    for (const c of w.scrolls) {
      if (c.taken) continue
      if (Math.abs(c.x - px) < 26 && Math.abs(c.y - (w.py - 22)) < 34) {
        c.taken = true
        w.dash = 5
        w.stats.coins = w.coinCount
        fx.ring(W * PLAYER_SX, w.py - 22, { color: '#c084fc', maxR: 70, life: 0.5, width: 4 })
        fx.burst(W * PLAYER_SX, w.py - 22, { count: 20, color: ['#c084fc', '#fde047', '#ffffff'], speed: 260 })
        showBanner('SHADOW DASH!', 'smash through everything')
        sfx.power()
        haptic.success()
      }
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    if (p.x < size.current.w * 0.42) slashPress()
    else jumpPress()
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const p = localPoint(e, e.currentTarget)
    if (p.x >= size.current.w * 0.42 || world.current.holding) jumpRelease()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.repeat) return
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault()
        jumpPress()
      } else if (e.key === 'x' || e.key === 'j' || e.key === 'ArrowRight') {
        e.preventDefault()
        slashPress()
      }
    }
    function up(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') jumpRelease()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const sx = W * PLAYER_SX

    if (ph === 'play' || ph === 'idle') {
      w.speed = Math.min(560, 250 + w.camX / 60)
      if (ph === 'idle') w.speed = 200
      w.camX += w.speed * dt
      extendWorld(w)
    }

    if (ph === 'play' || ph === 'dying') {
      const px = playerX(w)
      const ground = ph === 'play' ? groundAt(w, px) : null
      w.buffer = Math.max(0, w.buffer - dt)
      w.slash = Math.max(0, w.slash - dt)
      w.slashCd = Math.max(0, w.slashCd - dt)
      w.inv = Math.max(0, w.inv - raw)
      w.squash = Math.max(0, w.squash - dt * 5)

      if (w.grounded) w.coyote = COYOTE
      else w.coyote = Math.max(0, w.coyote - dt)

      if (w.buffer > 0 && ph === 'play') {
        if (w.grounded || w.coyote > 0) {
          w.vy = -JUMP_V
          w.grounded = false
          w.coyote = 0
          w.jumps = 1
          w.buffer = 0
          w.squash = -1
          fx.burst(sx, w.py, { count: 8, color: '#d6d3d1', speed: 90, angle: Math.PI, spread: 1.2, gravity: -50, size: 3, life: 0.4 })
          sfx.whoosh()
          haptic.light()
        } else if (w.jumps < 2) {
          w.vy = -DOUBLE_V
          w.jumps = 2
          w.buffer = 0
          fx.ring(sx, w.py, { color: '#e0f2fe', maxR: 26, life: 0.25, width: 2 })
          sfx.whoosh()
          haptic.light()
        }
      }

      const prevY = w.py
      w.vy += GRAVITY * dt * (w.holding && w.vy < 0 ? 0.75 : 1)
      w.vy = Math.min(w.vy, 1400)
      w.py += w.vy * dt

      if (ground && w.vy >= 0 && prevY <= ground.top + 2 && w.py >= ground.top) {
        if (!w.grounded && w.vy > 500) {
          w.squash = 1
          fx.burst(sx, ground.top, { count: 10, color: '#d6d3d1', speed: 120, angle: -Math.PI / 2, spread: 2.6, gravity: 200, size: 3, life: 0.35 })
          sfx.thud()
          haptic.light()
        }
        w.py = ground.top
        w.vy = 0
        w.grounded = true
        w.jumps = 0
      } else if (!ground || w.py < ground.top - 1) {
        w.grounded = false
      }
      // Ran into the side of a taller building.
      if (ph === 'play') {
        const ahead = groundAt(w, px + 10)
        if (ahead && ahead !== ground && w.py > ahead.top + 14) {
          die('hit')
          // Survived (shielded): vault onto the roof instead of clipping into the wall.
          if (phaseRef.current === 'play') {
            w.py = ahead.top
            w.vy = 0
            w.grounded = true
          }
        }
        for (const k of w.spikes) {
          if (px > k.x - 6 && px < k.x + k.w + 6 && w.py > k.y - 14 && w.py <= k.y + 4) {
            die('hit')
            if (phaseRef.current === 'play' && w.inv > 0) {
              w.vy = -520
              w.grounded = false
            }
            break
          }
        }
        if (w.py > H + 60 && w.god) {
          const nb = w.buildings.find((o) => o.x + o.w > px + 40)
          if (nb) w.py = nb.top - 120
          w.vy = 0
        }
        if (w.py > H + 60) die('fall')
      }

      if (w.grounded) w.runT += dt * w.speed / 40

      // Enemies
      for (const e of w.enemies) {
        if (e.dead) continue
        e.t += dt
        if (e.kind === 'bird') {
          e.x -= 80 * dt
          e.y += Math.sin(e.t * 4) * 50 * dt
        }
        if (e.kind === 'rival' && ph === 'play') {
          const d = e.x - px
          if (d > 80 && d < W * 1.05) {
            e.shoot -= dt
            if (e.shoot <= 0) {
              w.arrows.push({ x: e.x - 16, y: e.y - 30, vx: -380, vy: (w.py - 22 - (e.y - 30)) * 0.6, friendly: false, life: 4, kind: 'star' })
              e.shoot = rand(1.4, 2)
              sfx.shoot()
            }
          }
        }
        if (e.kind === 'archer' && ph === 'play') {
          const d = e.x - px
          if (d > 60 && d < W * 1.1) {
            e.shoot -= dt
            if (e.shoot <= 0) {
              w.arrows.push({ x: e.x - 16, y: e.y - 24, vx: -340, vy: 0, friendly: false, life: 4 })
              e.shoot = rand(1.6, 2.4)
              sfx.tick()
            }
          }
        }
        if (ph !== 'play') continue
        const ex = e.x
        const ey = e.y - 18
        const dx = Math.abs(ex - px)
        const dy = w.py - 22 - ey
        if (dx < 24 && Math.abs(dy) < 34) {
          // Coming down on top = stomp.
          if (w.dash > 0) {
            killEnemy(e, 'slash')
          } else if (w.vy > 0 && w.py - 10 < ey) {
            killEnemy(e, 'stomp')
            w.vy = -620
            w.jumps = 1
            w.grounded = false
          } else {
            die('hit')
            if (phaseRef.current === 'play') killEnemy(e, 'slash')
          }
        }
      }

      for (const a of w.arrows) {
        // Oni fireballs drift toward the ninja's height so they always reach the slash zone.
        if (a.kind === 'fire' && !a.friendly) a.vy += ((w.py - 22 - a.y) * 6 - a.vy) * Math.min(1, dt * 3)
        a.x += a.vx * dt
        a.y += a.vy * dt
        a.life -= dt
        if (a.friendly) {
          for (const e of w.enemies) {
            if (!e.dead && Math.abs(e.x - a.x) < 20 && Math.abs(e.y - 18 - a.y) < 26) {
              killEnemy(e, 'arrow')
              a.life = 0
            }
          }
        } else if (ph === 'play' && Math.abs(a.x - px) < (a.kind === 'fire' ? 18 : 14) && Math.abs(a.y - (w.py - 22)) < 24) {
          a.life = 0
          die('hit')
        }
      }
      w.arrows = w.arrows.filter((a) => a.life > 0 && a.x > w.camX - 50 && a.x < w.camX + size.current.w + 200)
      if (ph === 'play') updateNew(dt, px)
      if (autoSlash.current && ph === 'play' && w.grounded && !groundAt(w, px + 45)) w.buffer = BUFFER
      if (autoSlash.current && ph === 'play' && w.slashCd <= 0 && w.arrows.some((a) => !a.friendly && a.x - px < 70 && a.x > px - 10)) slashPress()

      if (ph === 'play') {
        let got = false
        for (const c of w.coins) {
          if (c.taken) continue
          // Magnet upgrade pulls nearby coins in.
          const cdx = px - c.x
          const cdy = w.py - 22 - c.y
          if ((w.magnet > 22 || w.dash > 0) && Math.hypot(cdx, cdy) < Math.max(w.magnet, w.dash > 0 ? 60 : 0) * 2.4) {
            c.x += cdx * Math.min(1, dt * 9)
            c.y += cdy * Math.min(1, dt * 9)
          }
          if (Math.abs(c.x - px) < w.magnet && Math.abs(c.y - (w.py - 22)) < w.magnet + 8) {
            c.taken = true
            w.coinCount += 1
            w.stats.coins = w.coinCount
            fx.burst(c.x - w.camX, c.y, { count: 5, color: '#fde047', speed: 90, size: 2, gravity: 0 })
            sfx.score(Math.min(w.coinCount % 8, 7))
            got = true
          }
        }
        if (got) run.update(w.stats)
        const distM = Math.floor(w.camX / PX_PER_M)
        if (distM !== w.stats.distance) {
          w.stats.distance = distM
          w.stats.score = score(w)
          run.update(w.stats)
          if (distM % 5 === 0) setHud({ score: score(w), dist: distM })
          if (!w.bestShown && w.stats.score > w.best) {
            w.bestShown = true
            showBanner('NEW BEST!', `beat ${w.best}`)
            sfx.levelUp()
          }
          if (distM > 0 && distM % 500 === 0) {
            const sky = SKIES[(distM / 500) % SKIES.length]
            showBanner(`${distM} m!`, sky.name)
            sfx.levelUp()
            haptic.success()
            void trackEvent('action_milestone', { game_id: 'ninja', kind: 'distance', value: distM })
          } else if (distM > 0 && distM % 250 === 0) {
            fx.text(W / 2, H * 0.3, `${distM} m!`, '#fde047', 28)
            sfx.levelUp()
          }
          if (distM === 400) showBanner('SPIKE TRAPS', 'jump over them')
          if (distM === RIVAL_FROM) showBanner('RIVAL NINJAS', 'slash their shuriken back')
          if (distM === VENT_FROM + 20) showBanner('FIRE VENTS', 'wait for the puffs to pass')
        }
      }
    }

    // ── Draw ─────────────────────────────────────
    const pal = SKIES[Math.floor(w.camX / PX_PER_M / 500) % SKIES.length]
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, pal.top)
    sky.addColorStop(0.6, pal.mid)
    sky.addColorStop(1, pal.low)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)
    glow(ctx, W * 0.75, H * 0.22, 90, pal.sun, 0.45)
    ctx.fillStyle = pal.sun
    ctx.beginPath()
    ctx.arc(W * 0.75, H * 0.22, 30, 0, Math.PI * 2)
    ctx.fill()

    // Parallax skyline
    const layers = [
      { k: 0.15, color: pal.far, base: H * 0.55, hmax: 120 },
      { k: 0.35, color: pal.near, base: H * 0.62, hmax: 150 },
    ]
    for (const L of layers) {
      ctx.fillStyle = L.color
      const off = (w.camX * L.k) % 60
      const startIdx = Math.floor((w.camX * L.k) / 60)
      for (let i = -1; i < W / 60 + 2; i++) {
        const idx = startIdx + i
        const hgt = 40 + hash(idx * (L.k * 10 + 1)) * L.hmax
        ctx.fillRect(i * 60 - off, L.base - hgt, 52, H)
      }
    }

    if (pal.layer === 'bamboo') {
      // Bamboo grove (mid parallax) with drifting mist
      const off = (w.camX * 0.5) % 46
      const start = Math.floor((w.camX * 0.5) / 46)
      for (let i = -1; i < W / 46 + 2; i++) {
        const h0 = hash(start + i)
        const bx = i * 46 - off + h0 * 14
        ctx.fillStyle = h0 > 0.5 ? 'rgba(21,128,61,0.75)' : 'rgba(22,101,52,0.85)'
        ctx.fillRect(bx, H * 0.18 + h0 * 60, 8, H)
        ctx.fillStyle = 'rgba(5,46,22,0.7)'
        for (let ny = H * 0.25 + h0 * 60; ny < H; ny += 48) ctx.fillRect(bx - 1, ny, 10, 3)
        ctx.fillStyle = 'rgba(74,222,128,0.55)'
        ctx.beginPath()
        ctx.ellipse(bx + 14, H * 0.2 + h0 * 60, 12, 3.5, -0.5, 0, Math.PI * 2)
        ctx.ellipse(bx - 6, H * 0.24 + h0 * 60, 11, 3, 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(240,253,244,0.12)'
      for (let i = 0; i < 3; i++) {
        const mx = ((t * 14 + i * 160 - w.camX * 0.1) % (W + 300)) - 150
        ctx.beginPath()
        ctx.ellipse(mx < -150 ? mx + W + 300 : mx, H * (0.5 + i * 0.08), 160, 22, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (pal.layer === 'pagoda') {
      // Snowy pagodas on the far ridge
      const off = (w.camX * 0.25) % 220
      const start = Math.floor((w.camX * 0.25) / 220)
      for (let i = -1; i < W / 220 + 2; i++) {
        const h0 = hash(start + i + 7)
        const px = i * 220 - off + 60 + h0 * 50
        const base = H * 0.6
        const tiers = 3 + Math.floor(h0 * 2)
        for (let k = 0; k < tiers; k++) {
          const y = base - k * 30
          const hw = 46 - k * 8
          ctx.fillStyle = '#1e293b'
          ctx.fillRect(px - hw * 0.6, y - 20, hw * 1.2, 20)
          ctx.fillStyle = '#0f172a'
          ctx.beginPath()
          ctx.moveTo(px - hw - 8, y - 18)
          ctx.quadraticCurveTo(px, y - 34, px + hw + 8, y - 18)
          ctx.lineTo(px + hw, y - 24)
          ctx.lineTo(px - hw, y - 24)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = 'rgba(241,245,249,0.9)'
          ctx.beginPath()
          ctx.moveTo(px - hw, y - 24)
          ctx.quadraticCurveTo(px, y - 36, px + hw, y - 24)
          ctx.quadraticCurveTo(px, y - 30, px - hw, y - 24)
          ctx.fill()
          if (k === 0) {
            glow(ctx, px, y - 10, 14, '#fbbf24', 0.5)
          }
        }
        ctx.strokeStyle = '#0f172a'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(px, base - tiers * 30 - 4)
        ctx.lineTo(px, base - tiers * 30 - 22)
        ctx.stroke()
      }
    }
    // Ambient motes
    if (w.motes.length < 28 && Math.random() < raw * 16) {
      const up = pal.mote === 'ember'
      w.motes.push({ x: rand(0, W + 60), y: up ? H : pal.mote === 'star' ? rand(0, H * 0.6) : -10, vx: pal.mote === 'star' ? 0 : rand(-60, -20), vy: up ? rand(-50, -25) : pal.mote === 'star' ? 0 : rand(30, 70), s: rand(1.5, 3.5), ph: rand(0, 6) })
    }
    for (const m of w.motes) {
      m.ph += raw
      m.x += (m.vx - (pal.mote === 'star' ? 8 : 0) + Math.sin(m.ph * 2) * 12) * raw
      m.y += m.vy * raw
      if (pal.mote === 'star') {
        m.vy = 0
        if (m.ph > 4) m.y = -99
      }
      ctx.save()
      ctx.translate(m.x, m.y)
      ctx.rotate(m.ph * 2)
      ctx.globalAlpha = pal.mote === 'star' ? Math.max(0, Math.sin(m.ph * 0.8)) : 0.85
      ctx.fillStyle = pal.moteColor
      if (pal.mote === 'leaf' || pal.mote === 'petal') {
        ctx.beginPath()
        ctx.ellipse(0, 0, m.s * 1.6, m.s * 0.7, 0, 0, Math.PI * 2)
        ctx.fill()
      } else {
        if (pal.mote === 'ember') glow(ctx, 0, 0, m.s * 3, pal.moteColor, 0.35)
        ctx.beginPath()
        ctx.arc(0, 0, m.s * 0.7, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    if (w.motes.length) w.motes = w.motes.filter((m) => m.y > -20 && m.y < H + 20 && m.x > -30)

    // Oni boss behind the rooftops
    const oni = w.oni
    if (oni && ph !== 'idle') {
      const ox = W * ONI_SX + oni.enter * 140
      glow(ctx, ox, oni.y, 70, '#ef4444', 0.2 + oni.wind * 0.3)
      drawOni(ctx, ox, oni.y, t, oni.mode === 'fire' ? oni.wind : 0, oni.hurt)
      if (oni.mode === 'bolt' && oni.wind > 0) glow(ctx, ox, oni.y + 26, 40, '#fde047', oni.wind * 0.6)
    }

    fx.applyShake(ctx)
    for (const b of w.buildings) {
      const bx = b.x - w.camX
      if (bx > W || bx + b.w < 0) continue
      ctx.fillStyle = '#140a1c'
      ctx.fillRect(bx, b.top, b.w, H - b.top + 20)
      ctx.fillStyle = '#3f2a52'
      ctx.fillRect(bx - 3, b.top - 4, b.w + 6, 7)
      for (let wy = b.top + 22; wy < H; wy += 28) {
        for (let wx = bx + 14; wx < bx + b.w - 14; wx += 24) {
          const lit = hash(b.seed + wx * 0.37 - bx * 0.37 + wy * 1.7) > 0.62
          ctx.fillStyle = lit ? 'rgba(253,224,71,0.55)' : 'rgba(255,255,255,0.05)'
          ctx.fillRect(wx, wy, 10, 13)
        }
      }
      if (b.deco === 1 && b.w > 160) {
        ctx.fillStyle = '#2a1b38'
        ctx.fillRect(bx + b.w - 50, b.top - 34, 30, 30)
        ctx.fillRect(bx + b.w - 46, b.top - 4, 4, 4)
      } else if (b.deco === 2) {
        ctx.strokeStyle = '#2a1b38'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(bx + 24, b.top - 4)
        ctx.lineTo(bx + 24, b.top - 44)
        ctx.stroke()
        if (Math.floor(t * 2) % 2 === 0) glow(ctx, bx + 24, b.top - 44, 8, '#ef4444', 0.9)
      }
    }

    for (const c of w.coins) {
      if (c.taken) continue
      const cx = c.x - w.camX
      if (cx < -20 || cx > W + 20) continue
      const spin = Math.abs(Math.cos(t * 5 + c.x * 0.05))
      drawCoin(ctx, cx, c.y, 18, 0.3 + spin * 0.7)
    }

    for (const k of w.spikes) {
      const kx = k.x - w.camX
      if (kx < -60 || kx > W + 20) continue
      drawSpikes(ctx, kx, k.y, k.w, t)
    }

    for (const v of w.vents) {
      const vx = v.x - w.camX
      if (vx < -40 || vx > W + 20) continue
      const warn = v.t > 1.6 && v.t <= 2.3 ? (v.t - 1.6) / 0.7 : 0
      const blast = v.t > 2.3 ? (v.t - 2.3) / 0.8 : 0
      drawVent(ctx, vx, v.y, warn, blast, t)
    }
    for (const c of w.scrolls) {
      if (c.taken) continue
      const cx = c.x - w.camX
      if (cx < -30 || cx > W + 30) continue
      glow(ctx, cx, c.y, 26, '#c084fc', 0.45)
      drawScroll(ctx, cx, c.y, t)
    }
    for (const k of w.strikes) {
      const kx = k.x - w.camX
      if (k.warn > 0) {
        const p = 1 - k.warn / 0.9
        ctx.strokeStyle = Math.floor(t * 14) % 2 ? '#fde047' : '#ef4444'
        ctx.lineWidth = 3
        ctx.setLineDash([6, 6])
        ctx.beginPath()
        ctx.ellipse(kx, k.y - 2, 26, 6, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 0.25 + p * 0.4
        ctx.fillStyle = '#fde047'
        ctx.fillRect(kx - 2, 0, 4, k.y)
        ctx.globalAlpha = 1
      } else {
        if (k.burn > 1.05 && oni) drawBolt(ctx, kx, oni.y + 30, k.y, t)
        const a = Math.min(1, k.burn)
        ctx.globalAlpha = a
        for (let i = 0; i < 5; i++) {
          const fxp = kx - 22 + i * 11
          const fh = 14 + Math.sin(t * 20 + i * 1.7) * 6
          ctx.fillStyle = i % 2 ? '#fb923c' : '#ef4444'
          ctx.beginPath()
          ctx.moveTo(fxp - 6, k.y)
          ctx.quadraticCurveTo(fxp, k.y - fh * 1.4, fxp + 6, k.y)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
    }

    for (const e of w.enemies) {
      if (e.dead) continue
      const ex = e.x - w.camX
      if (ex < -40 || ex > W + 40) continue
      if (e.kind === 'rival') {
        drawRival(ctx, ex, e.y, e.t, e.shoot < 0.5 && e.x - playerX(w) > 80 ? 1 - e.shoot / 0.5 : 0)
        continue
      }
      if (e.kind === 'bird') {
        drawBird(ctx, ex, e.y, e.t)
        continue
      }
      // Guard / archer silhouette
      const bob = Math.sin(e.t * 5) * 1.5
      ctx.fillStyle = e.kind === 'archer' ? '#78350f' : '#7f1d1d'
      ctx.beginPath()
      ctx.roundRect(ex - 11, e.y - 30 + bob, 22, 30 - bob, 6)
      ctx.fill()
      ctx.fillStyle = '#1f2937'
      ctx.beginPath()
      ctx.arc(ex, e.y - 36 + bob, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fca5a5'
      ctx.fillRect(ex - 6, e.y - 38 + bob, 4, 2.5)
      if (e.kind === 'archer') {
        ctx.strokeStyle = '#fde68a'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(ex - 12, e.y - 22 + bob, 12, Math.PI * 0.6, Math.PI * 1.4)
        ctx.stroke()
      } else {
        ctx.strokeStyle = '#d6d3d1'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(ex - 14, e.y - 48 + bob)
        ctx.lineTo(ex - 14, e.y - 2)
        ctx.stroke()
        ctx.fillStyle = '#e5e7eb'
        ctx.beginPath()
        ctx.moveTo(ex - 14, e.y - 56 + bob)
        ctx.lineTo(ex - 18, e.y - 46 + bob)
        ctx.lineTo(ex - 10, e.y - 46 + bob)
        ctx.fill()
      }
    }

    for (const a of w.arrows) {
      const ax = a.x - w.camX
      if (a.kind === 'star') {
        drawShuriken(ctx, ax, a.y, t * 18, a.friendly)
        continue
      }
      if (a.kind === 'fire') {
        drawFireball(ctx, ax, a.y, t, a.friendly)
        continue
      }
      ctx.strokeStyle = a.friendly ? '#fde047' : '#e5e7eb'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(ax - 12, a.y)
      ctx.lineTo(ax + 12, a.y)
      ctx.stroke()
      ctx.fillStyle = a.friendly ? '#fde047' : '#e5e7eb'
      ctx.beginPath()
      const dir = a.vx < 0 ? -1 : 1
      ctx.moveTo(ax + 12 * dir + 6 * dir, a.y)
      ctx.lineTo(ax + 12 * dir, a.y - 4)
      ctx.lineTo(ax + 12 * dir, a.y + 4)
      ctx.fill()
      if (a.friendly) glow(ctx, ax, a.y, 14, '#fde047', 0.5)
    }

    // Ninja
    const blink = w.inv > 0 && ph === 'play' && Math.floor(t * 14) % 2 === 0
    if (ph !== 'idle' && !(ph === 'over' && w.py > H)) {
      if (w.inv > 0 && ph === 'play') glow(ctx, sx, w.py - 24, 40, '#7dd3fc', 0.35)
      if (w.dash > 0) {
        glow(ctx, sx, w.py - 24, 46, '#c084fc', 0.45 + Math.sin(t * 20) * 0.1)
        ctx.fillStyle = 'rgba(126,34,206,0.35)'
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath()
          ctx.roundRect(sx - 8 - i * 14, w.py - 44, 16, 40, 7)
          ctx.fill()
        }
      }
      ctx.globalAlpha = blink ? 0.45 : 1
      const py = w.py
      const sq = w.squash
      const scaleY = sq > 0 ? 1 - sq * 0.25 : 1 + -sq * 0.15
      const scaleX = 2 - scaleY
      // Scarf follows a chain anchored at the neck.
      const neckX = sx - 2
      const neckY = py - 34 * scaleY
      w.scarf[0] = { x: neckX, y: neckY }
      for (let i = 1; i < w.scarf.length; i++) {
        const p = w.scarf[i]
        const prev = w.scarf[i - 1]
        p.x -= w.speed * raw * 0.9
        p.y += Math.sin(t * 14 + i) * 0.8 + 18 * raw
        const dx = p.x - prev.x
        const dy = p.y - prev.y
        const d = Math.hypot(dx, dy) || 1
        const seg = 6
        p.x = prev.x + (dx / d) * seg
        p.y = prev.y + (dy / d) * seg
      }
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(w.scarf[0].x, w.scarf[0].y)
      for (const p of w.scarf) ctx.lineTo(p.x, p.y)
      ctx.stroke()

      ctx.save()
      ctx.translate(sx, py)
      ctx.scale(scaleX, scaleY)
      const legA = w.grounded ? Math.sin(w.runT) * 0.9 : 0.5
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(0, -14)
      ctx.lineTo(Math.sin(legA) * 10, 0)
      ctx.moveTo(0, -14)
      ctx.lineTo(Math.sin(-legA) * 10, w.grounded ? 0 : -6)
      ctx.stroke()
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.roundRect(-8, -32, 16, 20, 6)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(1, -38, 8.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fef3c7'
      ctx.fillRect(1, -40, 8, 3)
      // Sword on back / in hand
      ctx.strokeStyle = '#cbd5e1'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      if (w.slash > 0) {
        ctx.moveTo(6, -26)
        ctx.lineTo(34, -40 + (0.14 - w.slash) * 300)
      } else {
        ctx.moveTo(-8, -18)
        ctx.lineTo(8, -44)
      }
      ctx.stroke()
      ctx.restore()

      if (w.slash > 0) {
        const k = w.slash / 0.14
        ctx.globalAlpha = k
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 6 * k + 1
        ctx.beginPath()
        ctx.arc(sx + 14, py - 24, 46, -Math.PI * 0.55, Math.PI * 0.45 - k * 0.6)
        ctx.stroke()
        ctx.strokeStyle = '#7dd3fc'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(sx + 14, py - 24, 54, -Math.PI * 0.5, Math.PI * 0.4 - k * 0.6)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      ctx.globalAlpha = 1
    }

    // Speed lines
    if (w.speed > 380 && ph === 'play') {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 1.5
      for (let i = 0; i < 6; i++) {
        const y = hash(i + Math.floor(t * 10)) * H
        const x = W - ((t * 900 + i * 157) % (W + 200))
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + 60, y)
        ctx.stroke()
      }
    }

    fx.draw(ctx)
    ctx.restore()
    if (oni && ph !== 'idle') {
      const bw = Math.min(W * 0.55, 220)
      const bx = (W - bw) / 2
      const by = 70
      ctx.fillStyle = 'rgba(15,23,42,0.6)'
      ctx.beginPath()
      ctx.roundRect(bx - 4, by - 4, bw + 8, 16, 8)
      ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.roundRect(bx, by, Math.max(6, (bw * Math.max(0, oni.hp)) / oni.max), 8, 4)
      ctx.fill()
      ctx.fillStyle = '#fecaca'
      ctx.font = "900 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('ONI WARLORD', W / 2, by + 12)
    }
    if (w.dash > 0 && ph === 'play') {
      ctx.fillStyle = '#e9d5ff'
      ctx.font = "900 13px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      ctx.fillText(`SHADOW DASH ${w.dash.toFixed(1)}s`, W - 14, 18)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const hook = {
      jump(m: number) {
        const w = world.current
        const { w: W, h: H } = size.current
        w.camX = m * PX_PER_M
        const top = H * 0.7
        w.buildings = [{ x: w.camX - 40, w: W * 3, top, seed: 1, deco: 0 }]
        w.enemies = []
        w.arrows = []
        w.coins = []
        w.spikes = []
        w.vents = []
        w.scrolls = []
        w.strikes = []
        w.py = top
        w.vy = 0
        w.grounded = true
        w.nextScroll = m + 40
        w.stats.distance = m
      },
      god(on: boolean) {
        world.current.god = on
      },
      dbg: () => { const w = world.current; return { cam: w.camX, vents: w.vents.map((v) => [v.x - w.camX, v.y, v.t]), b: w.buildings.map((b) => [b.x - w.camX, b.w, b.top]), H: size.current.h } },
      oni: () => startOni(),
      deflectTest() {
        const w = world.current
        w.arrows.push({ x: playerX(w) + 40, y: w.py - 22, vx: -330, vy: 0, friendly: false, life: 5, kind: 'fire' })
        w.slashCd = 0
        slashPress()
      },
      autoSlash(on: boolean) {
        autoSlash.current = on
      },
      dash: () => {
        world.current.dash = 5
      },
      spawn(kind: 'rival' | 'vent') {
        const w = world.current
        const px = playerX(w)
        const b = w.buildings.find((o) => o.x > px + 60) ?? w.buildings[w.buildings.length - 1]
        if (kind === 'rival') w.enemies.push({ id: w.id++, kind: 'rival', x: b.x + b.w * 0.6, y: b.top, t: 0, shoot: 0.6, dead: false })
        else {
          const g = groundAt(w, px + 260) ?? b
          w.vents.push({ x: Math.max(g.x + 4, px + 260), y: g.top, t: 1.3 })
        }
      },
      state: () => {
        const w = world.current
        return { d: w.stats.distance, sky: SKIES[Math.floor(w.camX / PX_PER_M / 500) % SKIES.length].name, oni: w.oni?.hp ?? null, vents: w.vents.length, rivals: w.enemies.filter((e) => e.kind === 'rival' && !e.dead).length, scrolls: w.scrolls.length, fire: w.arrows.filter((x) => x.kind === 'fire').map((x) => [Math.round(x.x - w.camX), Math.round(x.y), x.friendly]), wind: w.oni ? [w.oni.mode, +w.oni.wind.toFixed(2), +w.oni.atkT.toFixed(2), w.oni.enter] : null }
      },
    }
    ;(window as unknown as Record<string, unknown>).__en1_ninja = hook
  })

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div
          className="action-arena"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">{hud.dist} m</div>
              </div>
            </div>
          )}
          {showHints && phase === 'play' ? (
            <div className="ninja-hints" aria-hidden>
              <span>⚔️ tap · slash</span>
              <span>tap · jump ⤒<br />tap again · double</span>
            </div>
          ) : null}
          {banner && phase === 'play' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="ninja"
              icon={meta.icon}
              title={meta.title}
              hint="Right side to jump (hold for height, tap again to double jump). Left side to slash."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.dist >= 500 ? 'Shadow runner!' : 'Wiped out'}
            subtitle={`Score ${hud.score} · ${hud.dist} m`}
            celebrate={hud.dist >= 500}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
