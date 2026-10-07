import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'

const meta = getGame('parry')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Side = -1 | 1
type FoeKind = 'ronin' | 'quick' | 'brute' | 'trick' | 'ninja' | 'shogun'
type FoeState = 'walk' | 'windup' | 'swing' | 'stagger' | 'dead'

type Foe = {
  id: number
  kind: FoeKind
  side: Side
  x: number
  state: FoeState
  t: number
  windup: number
  strikeAt: number
  hp: number
  feint: boolean
  combo: number
  fall: number
}

type Petal = { x: number; y: number; vx: number; vy: number; rot: number; s: number }

const PERFECT = 0.075
const GOOD = 0.17
const STRIKE_DIST = 92
/** Fighters are drawn at this scale; hit points below are pre-scaled to match. */
const FS = 1.4
const MAX_HP = 3
/** Ninjas stand back and throw a shuriken; the ring closes as it arrives. */
const NINJA_DIST = 170
/** Sky palettes: dawn → dusk → night, shifting every 20 kills. */
const SKIES = [
  { top: '#fb7185', mid: '#fdba74', low: '#fef3c7', sun: '#fff7ed', hills: '#9f1239', ground: '#44403c', edge: '#57534e' },
  { top: '#6d28d9', mid: '#f472b6', low: '#fed7aa', sun: '#fde68a', hills: '#4c1d95', ground: '#3f3f46', edge: '#52525b' },
  { top: '#020617', mid: '#1e3a8a', low: '#64748b', sun: '#e2e8f0', hills: '#0b1120', ground: '#1f2937', edge: '#334155' },
]

function homeDist(k: FoeKind) {
  return k === 'ninja' ? NINJA_DIST : STRIKE_DIST
}

type World = {
  clock: number
  foes: Foe[]
  spawnTimer: number
  stance: 'idle' | 'parry' | 'recover' | 'hit' | 'counter'
  stanceT: number
  facing: Side
  hp: number
  maxHp: number
  /** Post-revive grace: strikes glance off automatically. */
  invuln: number
  /** PERFECT window in seconds (Focus upgrade widens it). */
  perfectWin: number
  kills: number
  streak: number
  score: number
  sinceBoss: number
  id: number
  petals: Petal[]
  slashFx: { side: Side; t: number } | null
  seenNinja: boolean
  stats: { score: number; kills: number; perfects: number; streak: number; bosses: number }
}

function freshWorld(): World {
  return {
    clock: 0,
    foes: [],
    spawnTimer: 0.8,
    stance: 'idle',
    stanceT: 0,
    facing: 1,
    hp: MAX_HP,
    maxHp: MAX_HP,
    invuln: 0,
    perfectWin: PERFECT,
    kills: 0,
    streak: 0,
    score: 0,
    sinceBoss: 0,
    id: 1,
    petals: Array.from({ length: 24 }, () => ({ x: Math.random(), y: Math.random(), vx: rand(-0.04, -0.01), vy: rand(0.02, 0.05), rot: rand(0, 6), s: rand(3, 6) })),
    slashFx: null,
    seenNinja: false,
    stats: { score: 0, kills: 0, perfects: 0, streak: 0, bosses: 0 },
  }
}

export default function ParryGame() {
  const run = useActionRun('parry')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 520 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, hp: MAX_HP, maxHp: MAX_HP, kills: 0, streak: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const lastMilestone = useRef(0)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, hp: w.hp, maxHp: w.maxHp, kills: w.kills, streak: w.streak })
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.maxHp = MAX_HP + run.level('heart')
    w.hp = w.maxHp
    w.perfectWin = PERFECT * (1 + run.level('focus') * 0.15)
    world.current = w
    fx.reset()
    pushHud()
    run.begin()
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'DUEL!', sub: 'tap when the ring closes' })
    sfx.ready()
  }

  function windupFor(kind: FoeKind, kills: number) {
    const base = Math.max(0.5, 1.05 - kills * 0.012)
    if (kind === 'quick') return base * 0.6
    if (kind === 'brute') return base * 1.15
    if (kind === 'shogun') return base * 0.75
    if (kind === 'ninja') return base * 1.05
    return base
  }

  function spawnFoe() {
    const w = world.current
    const { w: W } = size.current
    const twoSided = w.kills >= 6
    let side: Side = twoSided && Math.random() < 0.5 ? -1 : 1
    if (w.foes.some((f) => f.side === side && f.state !== 'dead')) side = (side * -1) as Side
    if (w.foes.some((f) => f.side === side && f.state !== 'dead')) return
    let kind: FoeKind = 'ronin'
    if (w.sinceBoss >= 10) {
      kind = 'shogun'
      w.sinceBoss = 0
      setBanner({ key: Date.now(), text: 'SHOGUN', sub: 'three-strike combos' })
      sfx.boom(0.4)
    } else {
      const r = Math.random()
      if (w.kills >= 4 && r < 0.25) kind = 'quick'
      else if (w.kills >= 8 && r < 0.42) kind = 'brute'
      else if (w.kills >= 12 && r < 0.58) kind = 'trick'
      else if (w.kills >= 18 && r < 0.74) kind = 'ninja'
      if (kind === 'ninja' && !w.seenNinja) {
        w.seenNinja = true
        setBanner({ key: Date.now(), text: 'NINJA', sub: 'parry the star back' })
        sfx.whoosh()
      }
    }
    w.foes.push({
      id: w.id++,
      kind,
      side,
      x: Math.max(W / 2 + 50, homeDist(kind) + 60),
      state: 'walk',
      t: 0,
      windup: 0,
      strikeAt: 0,
      hp: kind === 'brute' ? 2 : kind === 'shogun' ? 3 : 1,
      feint: kind === 'trick',
      combo: kind === 'shogun' ? 3 : 1,
      fall: 0,
    })
  }

  function beginWindup(f: Foe, wd?: number) {
    const w = world.current
    f.state = 'windup'
    f.windup = wd ?? windupFor(f.kind, w.kills)
    f.strikeAt = w.clock + f.windup
    f.t = 0
  }

  function cx() {
    return size.current.w / 2
  }

  function groundY() {
    return size.current.h * 0.72
  }

  function foeX(f: Foe) {
    return cx() + f.side * f.x
  }

  function killFoe(f: Foe) {
    const w = world.current
    f.state = 'dead'
    f.fall = 0
    w.kills += 1
    w.sinceBoss += 1
    w.stats.kills = w.kills
    if (f.kind === 'shogun') {
      w.stats.bosses += 1
      w.score += 30
      setBanner({ key: Date.now(), text: 'SHOGUN FALLS', sub: '+30' })
      fx.flash('#fff', 0.35)
      fx.slowmo(1, 0.25)
      sfx.win()
      haptic.success()
      milestone('boss', w.stats.bosses)
    } else if (w.kills % 20 === 0) {
      const sky = Math.floor(w.kills / 20) % SKIES.length
      setBanner({ key: Date.now(), text: `${w.kills} DEFEATED`, sub: sky === 1 ? 'dusk settles' : sky === 2 ? 'night falls' : 'a new dawn' })
      sfx.levelUp()
      milestone('kills', w.kills)
    }
    const x = foeX(f)
    const y = groundY() - 56
    fx.burst(x, y, { count: 26, color: ['#111827', '#1f2937', '#ef4444'], speed: 260, size: 4, gravity: 400 })
    fx.burst(x, y, { count: 14, color: ['#fbcfe8', '#f9a8d4', '#ffffff'], speed: 180, size: 3, gravity: 60, life: 1.2, shape: 'square' })
    sfx.boom(0.3)
  }

  function milestone(kind: string, value: number) {
    const now = performance.now()
    if (now - lastMilestone.current < 30000) return
    lastMilestone.current = now
    void trackEvent('action_milestone', { game_id: 'parry', kind, value })
  }

  function takeHit(f: Foe) {
    const w = world.current
    if (w.invuln > 0) {
      // Revive grace: the strike glances off a spirit guard.
      const x = cx() + f.side * 48
      fx.ring(x, groundY() - 74, { color: '#7dd3fc', maxR: 60, life: 0.35 })
      fx.text(x, groundY() - 130, 'GUARDED', '#7dd3fc', 16)
      sfx.clang()
      f.state = 'walk'
      f.x = homeDist(f.kind) + 50
      return
    }
    w.hp -= 1
    w.streak = 0
    w.stance = 'hit'
    w.stanceT = 0.4
    w.facing = f.side
    fx.flash('#ef4444', 0.3)
    fx.shake(12, 0.35)
    fx.stop(0.12)
    fx.burst(cx(), groundY() - 62, { count: 18, color: ['#ef4444', '#7f1d1d', '#fff'], speed: 220 })
    sfx.hurt()
    haptic.heavy()
    // Attacker steps back and resets.
    f.state = 'walk'
    f.x = homeDist(f.kind) + 50
    f.feint = false
    f.combo = f.kind === 'shogun' ? 3 : 1
    pushHud()
    if (w.hp <= 0 && phaseRef.current === 'play') {
      setPhaseBoth('dying')
      fx.slowmo(1.2, 0.2)
      sfx.lose()
      haptic.error()
      window.setTimeout(() => {
        setPhaseBoth('over')
        w.stats.score = w.score
        const coins = Math.round((3 + w.kills * 0.8 + w.stats.perfects * 0.4 + w.stats.bosses * 6) * (1 + run.level('bounty') * 0.15))
        run.end({ score: w.score, cleared: w.kills >= 15, stats: { ...w.stats }, coins }, revive)
      }, 1300)
    }
  }

  /** Ad revive: one heart back, foes shoved away, ~2 s of guarded strikes. */
  function revive() {
    const w = world.current
    w.hp = 1
    w.invuln = 2.2
    w.stance = 'idle'
    w.stanceT = 0
    w.spawnTimer = 1.5
    for (const f of w.foes) {
      if (f.state === 'dead') continue
      f.state = 'walk'
      f.t = 0
      f.x = homeDist(f.kind) + 140
      f.feint = f.kind === 'trick'
    }
    fx.ring(cx(), groundY() - 60, { color: '#7dd3fc', maxR: 170, life: 0.6, width: 5 })
    fx.burst(cx(), groundY() - 60, { count: 30, color: ['#fbcfe8', '#ffffff', '#7dd3fc'], speed: 300, shape: 'square', gravity: 40, life: 1 })
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'one more duel' })
    pushHud()
    setPhaseBoth('play')
  }

  function parry(side: Side) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    if (w.stance === 'recover' || w.stance === 'hit') return
    w.facing = side
    const f = w.foes.find((o) => o.side === side && o.state === 'windup')
    const x = cx() + side * 48
    const y = groundY() - 74
    if (!f) {
      whiff()
      return
    }
    const off = w.clock - f.strikeAt
    if (f.feint && off < -GOOD * 0.5) {
      // Bit on the feint.
      whiff()
      fx.text(foeX(f), y - 50, 'FEINT!', '#fca5a5', 18)
      return
    }
    if (off < -GOOD) {
      whiff()
      return
    }
    const perfect = Math.abs(off) <= w.perfectWin
    sfx.clang()
    fx.burst(x, y, { count: perfect ? 22 : 12, color: ['#fde047', '#ffffff', '#fb923c'], speed: perfect ? 360 : 240, shape: 'spark', gravity: 0, drag: 3 })
    fx.ring(x, y, { color: perfect ? '#fde047' : '#ffffff', maxR: perfect ? 70 : 40, life: 0.3, width: perfect ? 5 : 3 })
    if (perfect) {
      w.streak += 1
      w.stats.perfects += 1
      w.stats.streak = Math.max(w.stats.streak, w.streak)
      f.hp -= 2
      w.stance = 'counter'
      w.stanceT = 0.3
      w.slashFx = { side, t: 0.25 }
      fx.stop(0.13)
      fx.flash('#ffffff', 0.18)
      fx.shake(9, 0.25)
      const pts = 3 * (1 + Math.floor(w.streak / 5))
      w.score += pts
      fx.text(x + side * 30, y - 40, w.streak >= 3 ? `PERFECT ×${w.streak}` : 'PERFECT', '#fde047', 22)
      sfx.slash()
      sfx.score(Math.min(w.streak, 12))
      haptic.heavy()
      if (w.streak % 5 === 0) sfx.combo()
      if (f.kind === 'ninja') fx.text(foeX(f), y - 70, 'RETURNED!', '#c4b5fd', 16)
    } else {
      f.hp -= 1
      w.stance = 'parry'
      w.stanceT = 0.22
      w.score += 1
      fx.stop(0.05)
      fx.shake(4, 0.15)
      fx.text(x + side * 30, y - 40, 'PARRY', '#e5e7eb', 16)
      haptic.medium()
    }
    w.stats.score = w.score
    if (f.hp <= 0) {
      if (f.combo > 1) {
        // Shogun chains strikes — keep defending.
        f.combo -= 1
        f.hp = 1
        beginWindup(f, Math.max(0.32, windupFor(f.kind, w.kills) * 0.55))
      } else killFoe(f)
    } else if (f.combo > 1) {
      f.combo -= 1
      beginWindup(f, Math.max(0.32, windupFor(f.kind, w.kills) * 0.55))
    } else {
      f.state = 'stagger'
      f.t = 0
      f.x += 26
    }
    run.update(w.stats)
    pushHud()
  }

  function whiff() {
    const w = world.current
    w.stance = 'recover'
    w.stanceT = 0.38
    w.streak = 0
    sfx.slash()
    sfx.miss()
    pushHud()
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    const w = world.current
    // Single-sided early game: any tap parries right.
    const twoSided = w.foes.some((f) => f.side === -1 && f.state !== 'dead')
    parry(twoSided ? (p.x < size.current.w / 2 ? -1 : 1) : 1)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.repeat) return
      if (e.key === 'ArrowLeft' || e.key === 'a') parry(-1)
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === ' ') parry(1)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  function drawFighter(
    ctx: CanvasRenderingContext2D,
    x: number,
    gy: number,
    facing: Side,
    opts: { scale?: number; body: string; sash: string; hat: 'topknot' | 'kasa' | 'kabuto' | 'hood'; sword: number; glint?: number; alpha?: number; tilt?: number; eye?: string },
  ) {
    const s = (opts.scale ?? 1) * FS
    ctx.save()
    ctx.globalAlpha = opts.alpha ?? 1
    ctx.translate(x, gy)
    if (opts.tilt) ctx.rotate(opts.tilt)
    ctx.scale(facing * s, s)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(0, 2, 26, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    // Legs + robe
    ctx.fillStyle = opts.body
    ctx.beginPath()
    ctx.moveTo(-18, 0)
    ctx.lineTo(-10, -44)
    ctx.lineTo(10, -44)
    ctx.lineTo(20, 0)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = opts.sash
    ctx.fillRect(-11, -30, 22, 5)
    // Torso
    ctx.fillStyle = opts.body
    ctx.beginPath()
    ctx.roundRect(-10, -64, 20, 24, 6)
    ctx.fill()
    // Head
    ctx.beginPath()
    ctx.arc(0, -72, 9, 0, Math.PI * 2)
    ctx.fill()
    if (opts.hat === 'topknot') {
      ctx.beginPath()
      ctx.arc(-3, -82, 4, 0, Math.PI * 2)
      ctx.fill()
    } else if (opts.hat === 'hood') {
      ctx.fillStyle = '#4c1d95'
      ctx.fillRect(-9, -76, 18, 5)
      ctx.strokeStyle = '#4c1d95'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-9, -74)
      ctx.quadraticCurveTo(-18, -76, -22, -68)
      ctx.stroke()
    } else if (opts.hat === 'kasa') {
      ctx.fillStyle = '#a16207'
      ctx.beginPath()
      ctx.moveTo(-20, -72)
      ctx.lineTo(0, -88)
      ctx.lineTo(20, -72)
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.fillStyle = '#7f1d1d'
      ctx.beginPath()
      ctx.arc(0, -75, 11, Math.PI, 0)
      ctx.fill()
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(-8, -82)
      ctx.quadraticCurveTo(-14, -96, -4, -98)
      ctx.moveTo(8, -82)
      ctx.quadraticCurveTo(14, -96, 4, -98)
      ctx.stroke()
    }
    // Eye: a narrow glint facing forward.
    ctx.fillStyle = opts.eye ?? '#f8fafc'
    ctx.beginPath()
    ctx.ellipse(4.5, -73, 2.6, 1.1, -0.15, 0, Math.PI * 2)
    ctx.fill()
    // Rim light along the back.
    ctx.strokeStyle = 'rgba(255,237,213,0.25)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-10, -62)
    ctx.lineTo(-10, -44)
    ctx.lineTo(-18, 0)
    ctx.stroke()
    // Arm + katana; sword is the blade angle in radians from horizontal-forward.
    const hx = 10
    const hy = -54
    ctx.strokeStyle = opts.body
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(2, -58)
    ctx.lineTo(hx, hy)
    ctx.stroke()
    const bl = 46
    const tx = hx + Math.cos(opts.sword) * bl
    const ty = hy + Math.sin(opts.sword) * bl
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 2.6
    ctx.beginPath()
    ctx.moveTo(hx, hy)
    ctx.lineTo(tx, ty)
    ctx.stroke()
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(hx - Math.cos(opts.sword) * 8, hy - Math.sin(opts.sword) * 8)
    ctx.lineTo(hx, hy)
    ctx.stroke()
    ctx.restore()
    if (opts.glint && opts.glint > 0) {
      const gx = x + facing * s * tx
      const gy2 = gy + s * ty
      glow(ctx, gx, gy2, 16 * opts.glint, '#ffffff', 0.9)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(gx - 10 * opts.glint, gy2)
      ctx.lineTo(gx + 10 * opts.glint, gy2)
      ctx.moveTo(gx, gy2 - 10 * opts.glint)
      ctx.lineTo(gx, gy2 + 10 * opts.glint)
      ctx.stroke()
    }
  }

  function drawShuriken(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number, warn: boolean) {
    glow(ctx, x, y, 20, warn ? '#f87171' : '#c4b5fd', 0.5)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.fillStyle = '#cbd5e1'
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11)
      ctx.lineTo(Math.cos(a + Math.PI / 4) * 3.5, Math.sin(a + Math.PI / 4) * 3.5)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#334155'
    ctx.beginPath()
    ctx.arc(0, 0, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const gy = groundY()
    const CX = cx()

    if (ph === 'idle') {
      // Attract mode: a ronin walks up and is cut down on the beat.
      if (w.foes.length === 0) {
        w.foes.push({ id: w.id++, kind: 'ronin', side: Math.random() < 0.5 ? -1 : 1, x: W / 2 + 60, state: 'walk', t: 0, windup: 0, strikeAt: 0, hp: 1, feint: false, combo: 1, fall: 0 })
      }
      for (const f of w.foes) {
        if (f.state === 'windup' && w.clock >= f.strikeAt) {
          f.state = 'dead'
          f.fall = 0
          w.facing = f.side
          w.stance = 'counter'
          w.stanceT = 0.3
          w.slashFx = { side: f.side, t: 0.25 }
          fx.burst(foeX(f), gy - 56, { count: 14, color: ['#fbcfe8', '#f9a8d4', '#ffffff'], speed: 180, size: 3, gravity: 60, life: 1.2, shape: 'square' })
        } else if (f.state === 'walk' && f.x <= STRIKE_DIST + 1) {
          beginWindup(f, 1)
        }
      }
    }

    if (ph === 'play' || ph === 'dying' || ph === 'idle') {
      w.clock += dt
      w.invuln = Math.max(0, w.invuln - dt)
      w.stanceT = Math.max(0, w.stanceT - dt)
      if (w.stanceT <= 0 && w.stance !== 'idle') w.stance = 'idle'
      if (w.slashFx) {
        w.slashFx.t -= raw
        if (w.slashFx.t <= 0) w.slashFx = null
      }

      if (ph === 'play') {
        w.spawnTimer -= dt
        const active = w.foes.filter((f) => f.state !== 'dead').length
        const maxActive = w.kills >= 6 ? 2 : 1
        if (w.spawnTimer <= 0 && active < maxActive) {
          spawnFoe()
          w.spawnTimer = Math.max(0.5, 1.4 - w.kills * 0.02)
        }
      }

      for (const f of w.foes) {
        f.t += dt
        if (f.state === 'walk') {
          f.x -= (f.kind === 'quick' || f.kind === 'ninja' ? 190 : f.kind === 'brute' ? 85 : 130) * dt
          const home = homeDist(f.kind)
          if (f.x <= home) {
            f.x = home
            if (ph === 'play') beginWindup(f)
          }
        } else if (f.state === 'windup') {
          if (f.feint && w.clock >= f.strikeAt) {
            // Fake out: pause, then the real strike.
            f.feint = false
            beginWindup(f, Math.max(0.42, windupFor(f.kind, w.kills) * 0.7))
          } else if (w.clock >= f.strikeAt + GOOD && ph === 'play') {
            f.state = 'swing'
            f.t = 0
            takeHit(f)
          }
        } else if (f.state === 'stagger') {
          f.x = Math.min(f.x + 60 * dt, homeDist(f.kind) + 40)
          if (f.t > 0.45) {
            f.state = 'walk'
          }
        } else if (f.state === 'dead') {
          f.fall += dt
        }
      }
      w.foes = w.foes.filter((f) => !(f.state === 'dead' && f.fall > 1.4))
    }

    for (const p of w.petals) {
      p.x += p.vx * raw + Math.sin(t + p.rot) * 0.0006
      p.y += p.vy * raw
      p.rot += raw
      if (p.y > 1.05) {
        p.y = -0.05
        p.x = Math.random() * 1.2
      }
      if (p.x < -0.05) p.x = 1.05
    }

    // ── Draw ─────────────────────────────────────
    const pal = SKIES[Math.floor(w.kills / 20) % SKIES.length]
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, pal.top)
    sky.addColorStop(0.55, pal.mid)
    sky.addColorStop(1, pal.low)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)
    if (pal === SKIES[2]) {
      ctx.fillStyle = '#e2e8f0'
      for (let i = 0; i < 30; i++) {
        ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.3 + i * 7.1))
        ctx.fillRect(((i * 97) % 100) / 100 * W, ((i * 53) % 45) / 100 * H, 2, 2)
      }
      ctx.globalAlpha = 1
    }
    glow(ctx, W / 2, H * 0.36, 120, pal.sun, 0.6)
    ctx.fillStyle = pal.sun
    ctx.beginPath()
    ctx.arc(W / 2, H * 0.36, 52, 0, Math.PI * 2)
    ctx.fill()
    // Far mountains, then a nearer ridge with a pagoda for depth.
    ctx.fillStyle = pal.hills
    ctx.globalAlpha = 0.35
    ctx.beginPath()
    ctx.moveTo(0, gy - 90)
    ctx.lineTo(W * 0.15, gy - 190)
    ctx.lineTo(W * 0.33, gy - 120)
    ctx.lineTo(W * 0.55, gy - 210)
    ctx.lineTo(W * 0.8, gy - 130)
    ctx.lineTo(W, gy - 170)
    ctx.lineTo(W, gy)
    ctx.lineTo(0, gy)
    ctx.fill()
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.moveTo(0, gy - 70)
    ctx.lineTo(W * 0.2, gy - 130)
    ctx.lineTo(W * 0.42, gy - 80)
    ctx.lineTo(W * 0.65, gy - 140)
    ctx.lineTo(W, gy - 90)
    ctx.lineTo(W, gy)
    ctx.lineTo(0, gy)
    ctx.fill()
    const px = W * 0.65
    const py = gy - 136
    for (let i = 0; i < 3; i++) {
      const tw = 34 - i * 8
      const ty = py - i * 18
      ctx.fillRect(px - tw * 0.35, ty - 12, tw * 0.7, 12)
      ctx.beginPath()
      ctx.moveTo(px - tw, ty - 10)
      ctx.quadraticCurveTo(px, ty - 22, px + tw, ty - 10)
      ctx.lineTo(px + tw * 0.6, ty - 16)
      ctx.lineTo(px - tw * 0.6, ty - 16)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillRect(px - 1, py - 70, 2, 16)
    ctx.globalAlpha = 1
    ctx.fillStyle = pal.ground
    ctx.fillRect(0, gy, W, H - gy)
    ctx.fillStyle = pal.edge
    ctx.fillRect(0, gy, W, 4)
    // Wooden dojo boards.
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 1
    for (let i = 1; i < 6; i++) {
      const yy = gy + i * i * 5
      ctx.beginPath()
      ctx.moveTo(0, yy)
      ctx.lineTo(W, yy)
      ctx.stroke()
    }

    fx.applyShake(ctx)

    for (const f of w.foes) {
      const x = foeX(f)
      const dead = f.state === 'dead'
      let sword = -0.2
      let glint = 0
      if (f.state === 'windup') {
        const k = Math.min(1, f.t / Math.max(0.1, f.windup))
        sword = -0.2 - k * 2.2
        glint = k > 0.7 ? (k - 0.7) / 0.3 : 0
      } else if (f.state === 'swing') sword = 0.9
      else if (f.state === 'stagger') sword = -2.6
      const look: Side = (f.side * -1) as Side
      const tint = f.kind === 'shogun' ? '#3f0d12' : f.kind === 'brute' ? '#292524' : f.kind === 'ninja' ? '#1e1b4b' : '#1c1917'
      const ninja = f.kind === 'ninja'
      drawFighter(ctx, x + (dead ? f.side * f.fall * 30 : 0), gy, look, {
        scale: f.kind === 'brute' ? 1.25 : f.kind === 'shogun' ? 1.35 : ninja ? 0.9 : 1,
        body: tint,
        sash: f.kind === 'trick' ? '#7c3aed' : f.kind === 'quick' ? '#0891b2' : ninja ? '#a78bfa' : '#b91c1c',
        hat: f.kind === 'shogun' ? 'kabuto' : ninja ? 'hood' : 'kasa',
        sword: ninja ? (f.state === 'windup' ? -0.4 + Math.min(1, f.t * 3) * 1.6 : 1.3) : sword,
        glint: ninja ? 0 : glint,
        eye: f.state === 'windup' ? '#fca5a5' : undefined,
        alpha: dead ? Math.max(0, 1 - f.fall / 1.2) : 1,
        tilt: dead ? f.side * Math.min(1.4, f.fall * 2.5) : f.state === 'stagger' ? f.side * 0.15 : 0,
      })
      if (ninja && f.state === 'windup' && (ph === 'play' || ph === 'idle')) {
        const p = Math.max(0, Math.min(1, (f.t - f.windup * 0.25) / (f.windup * 0.75)))
        const sx = x + (CX + f.side * 48 - x) * p
        const sy = gy - 80 + Math.sin(p * Math.PI) * -22 + p * 6
        drawShuriken(ctx, sx, sy, w.clock * 18, f.feint)
      }
      // Timing ring: closes exactly at the strike.
      if (f.state === 'windup' && ph === 'play') {
        const remain = Math.max(0, f.strikeAt - w.clock)
        const k = remain / f.windup
        const rx = CX + f.side * 48
        const ry = gy - 74
        const color = f.feint ? '#f87171' : remain < PERFECT ? '#fde047' : '#ffffff'
        ctx.strokeStyle = color
        ctx.globalAlpha = 0.35 + (1 - k) * 0.65
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(rx, ry, 12 + k * 70, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 0.5
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(rx, ry, 12, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    if (!(ph === 'over' && w.hp <= 0)) {
      let sword = 0.35
      if (w.stance === 'parry') sword = -1.3
      else if (w.stance === 'counter') sword = 0.6
      else if (w.stance === 'recover') sword = 1.1
      else if (w.stance === 'hit') sword = 1.4
      const dying = ph !== 'play' && w.hp <= 0
      drawFighter(ctx, CX, gy, w.facing, {
        body: w.stance === 'hit' && Math.floor(t * 20) % 2 === 0 ? '#7f1d1d' : '#0f172a',
        sash: '#f8fafc',
        hat: 'topknot',
        sword,
        tilt: dying ? -w.facing * 0.5 : w.stance === 'recover' ? w.facing * 0.08 : 0,
      })
      if (w.invuln > 0) {
        ctx.globalAlpha = Math.min(1, w.invuln) * (0.5 + Math.sin(t * 12) * 0.2)
        ctx.strokeStyle = '#7dd3fc'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.ellipse(CX, gy - 62, 52, 80, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    if (w.slashFx) {
      const k = w.slashFx.t / 0.25
      const sx = CX + w.slashFx.side * 92
      ctx.globalAlpha = k
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 10 * k + 1
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(sx - 70, gy - 150)
      ctx.lineTo(sx + 70, gy - 10)
      ctx.stroke()
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(sx - 80, gy - 160)
      ctx.lineTo(sx + 80, gy - 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    for (const p of w.petals) {
      ctx.save()
      ctx.translate(p.x * W, p.y * H)
      ctx.rotate(p.rot)
      ctx.fillStyle = 'rgba(251,207,232,0.85)'
      ctx.beginPath()
      ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    fx.draw(ctx)
    ctx.restore()
    if (fx.slowTime > 0 || fx.hitstop > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.fillRect(0, 0, W, H)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud" style={{ color: '#fff' }}>
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  {hud.kills} defeated{hud.streak >= 2 ? ` · streak ${hud.streak}` : ''}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hearts">
                  {'❤'.repeat(Math.max(0, hud.hp))}
                  <span style={{ opacity: 0.3 }}>{'❤'.repeat(Math.max(0, hud.maxHp - hud.hp))}</span>
                </span>
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
              game="parry"
              icon={meta.icon}
              title={meta.title}
              hint="Tap the moment the ring closes to parry. Perfect timing cuts your foe down in one stroke."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.kills >= 15 ? 'Undefeated blade!' : 'You fell'}
            subtitle={`Score ${hud.score} · ${hud.kills} defeated`}
            celebrate={hud.kills >= 15}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
