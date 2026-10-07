import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, rand } from '../../shared/action/fx'
import { Stick, localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { LAVA_IN, drawArena, drawTop, type ArenaKind } from './art'
import { BOSSES, TOPS, matchFor, type Pers, type Shape, type Sig } from './rivals'
import '../../shared/action/action.css'
import './spinner.css'

const meta = getGame('spinner')

type Phase = 'idle' | 'play' | 'upgrade' | 'dying' | 'over'

export type Top = {
  id: number
  name: string
  x: number
  y: number
  vx: number
  vy: number
  r: number
  mass: number
  spin: number
  maxSpin: number
  angle: number
  atk: number
  accel: number
  drain: number
  color: string
  color2: string
  blades: number
  ai: boolean
  pers: Pers
  alive: boolean
  out: number
  topple: number
  shield: number
  dash: number
  special: number
  think: number
  tx: number
  ty: number
  hitBy: Top | null
  hitT: number
  flash: number
  boss: boolean
  wave: number
  waveT: number
  trail: number[]
  angry: number
  shape?: Shape
  sig?: Sig
  /** Signature being telegraphed right now (boss 'all' rotates). */
  sigNow?: Sig
  sigN?: number
}

type PartId = 'atk' | 'mass' | 'bearing' | 'grip' | 'max' | 'charge' | 'vamp' | 'dash' | 'mirror'
type Part = { id: PartId; label: string; blurb: string; icon: string }
const PARTS: Part[] = [
  { id: 'atk', label: 'Razor Ring', blurb: '+20% clash power', icon: 'atk' },
  { id: 'mass', label: 'Weighted Disk', blurb: '+15% weight', icon: 'mass' },
  { id: 'bearing', label: 'Ball Bearing', blurb: '-25% spin drain', icon: 'bearing' },
  { id: 'grip', label: 'Rubber Tip', blurb: '+15% steering power', icon: 'grip' },
  { id: 'max', label: 'Turbo Winder', blurb: '+15% max spin', icon: 'max' },
  { id: 'charge', label: 'Capacitor', blurb: 'Special fills 25% faster', icon: 'charge' },
  { id: 'vamp', label: 'Leech Edge', blurb: 'Regain spin on every clash', icon: 'vamp' },
  { id: 'dash', label: 'Nitro Dash', blurb: 'Dash 30% stronger', icon: 'dash' },
  { id: 'mirror', label: 'Mirror Guard', blurb: 'Shield lasts longer', icon: 'mirror' },
]

type Orb = { x: number; y: number; ph: number; life: number }

type World = {
  tops: Top[]
  me: Top | null
  orbs: Orb[]
  orbT: number
  match: number
  arena: ArenaKind
  R: number
  countdown: number
  matchT: number
  endT: number
  parts: Record<PartId, number>
  score: number
  hudT: number
  clashSnd: number
  lastTrack: number
  clock: number
  koThisMatch: number
  tier: number
  lastStars: number
  title: string
  intro: string
  stats: { score: number; wins: number; ringouts: number; clashes: number; bosses: number }
}

let topId = 1

function freshWorld(): World {
  return {
    tops: [],
    me: null,
    orbs: [],
    orbT: 8,
    match: 0,
    arena: 'classic',
    R: 160,
    countdown: 0,
    matchT: 0,
    endT: 0,
    parts: { atk: 0, mass: 0, bearing: 0, grip: 0, max: 0, charge: 0, vamp: 0, dash: 0, mirror: 0 },
    score: 0,
    hudT: 0,
    clashSnd: 0,
    lastTrack: -99,
    clock: 0,
    koThisMatch: 0,
    tier: 0,
    lastStars: 0,
    title: '',
    intro: '',
    stats: { score: 0, wins: 0, ringouts: 0, clashes: 0, bosses: 0 },
  }
}

function makeTop(p: Partial<Top> & { name: string; color: string; color2: string }): Top {
  return {
    id: topId++,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 17,
    mass: 1,
    spin: 100,
    maxSpin: 100,
    angle: rand(0, 6.28),
    atk: 1,
    accel: 520,
    drain: 1.6,
    blades: 4,
    ai: false,
    pers: 'charger',
    alive: true,
    out: 0,
    topple: 0,
    shield: 0,
    dash: 0,
    special: 0,
    think: 0,
    tx: 0,
    ty: 0,
    hitBy: null,
    hitT: 0,
    flash: 0,
    boss: false,
    wave: 0,
    waveT: 0,
    trail: [],
    angry: 0,
    ...p,
  }
}

export default function SpinnerGame() {
  const run = useActionRun('spinner')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const stick = useRef(new Stick(56)).current
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const keys = useRef(new Set<string>())
  const view = useRef({ cx: 180, cy: 260, s: 1 })
  const devAuto = useRef(false)
  const devSpeed = useRef(1)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, match: 1, spin: 1, special: 0, foes: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [choices, setChoices] = useState<Part[]>([])

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function playerTop(w: World): Top {
    const maxSpin = 100 * (1 + run.level('spin') * 0.1) * (1 + w.parts.max * 0.15)
    return makeTop({
      name: 'You',
      color: '#db2777',
      color2: '#fbcfe8',
      blades: 4,
      r: 22,
      mass: (1 + run.level('weight') * 0.08) * (1 + w.parts.mass * 0.15),
      maxSpin,
      spin: maxSpin,
      atk: 1 + w.parts.atk * 0.2,
      accel: 560 * (1 + w.parts.grip * 0.15),
      drain: 1.5 * Math.pow(0.75, w.parts.bearing),
    })
  }

  function beginMatch(w: World, n: number, withPlayer: boolean) {
    w.match = n
    // Authored ladder: each match is a level; past match 20 the ladder repeats at a higher tier.
    const pick = matchFor(n)
    const m = withPlayer ? pick.m : { title: '', arena: 'classic' as ArenaKind, foes: ['blaze', 'glacier', 'viper'], intro: '' }
    w.tier = withPlayer ? pick.tier : 0
    w.title = m.title
    w.intro = m.intro
    const boss = withPlayer && !!m.boss
    w.arena = m.arena
    w.R = w.arena === 'mini' ? 130 : boss ? 175 : 160
    w.tops = []
    w.orbs = []
    w.orbT = 7
    w.countdown = withPlayer ? 2.2 : 0
    w.matchT = 0
    w.endT = 0
    w.koThisMatch = 0
    const lvl = Math.min(1.6, 0.72 + n * 0.045 + w.tier * 0.1)
    const foeIds = boss ? [] : withPlayer ? m.foes : [...m.foes].sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2))
    const total = foeIds.length + (withPlayer ? 1 : 0) + (boss ? 1 : 0)
    let slot = 0
    const place = (t: Top) => {
      const a = (slot++ / total) * Math.PI * 2 + Math.PI / 2
      t.x = Math.cos(a) * w.R * 0.62
      t.y = Math.sin(a) * w.R * 0.62
      t.vx = -Math.sin(a) * 60
      t.vy = Math.cos(a) * 60
      w.tops.push(t)
    }
    if (withPlayer) {
      const me = playerTop(w)
      w.me = me
      place(me)
      if (w.me.special < 30) w.me.special = 30
    } else w.me = null
    if (boss) {
      const b = BOSSES[m.boss ?? 'dragoon']
      const k = b.k + Math.min(1.5, w.tier * 0.5)
      place(
        makeTop({
          name: b.name,
          color: b.color,
          color2: b.color2,
          blades: b.blades,
          shape: b.shape,
          sig: b.sig,
          sigN: 0,
          r: 36,
          mass: 2.3 + k * 0.25,
          maxSpin: 140 + k * 25,
          spin: 140 + k * 25,
          atk: 0.95 + k * 0.1,
          accel: 360,
          drain: 1.2,
          ai: true,
          pers: 'boss',
          boss: true,
          waveT: b.sig === 'split' ? 7 : 5,
        }),
      )
    }
    for (const id of foeIds) {
      const d = TOPS[id] ?? TOPS.blaze
      const heavy = d.pers === 'tank' || !!d.heavy
      const small = !!d.small
      place(
        makeTop({
          name: d.name,
          color: d.color,
          color2: d.color2,
          blades: d.blades,
          shape: d.shape,
          r: heavy ? 25 : small ? 17 : 20,
          mass: (heavy ? 1.35 : small ? 0.75 : 0.9) * lvl,
          maxSpin: (small ? 75 : 85) * lvl,
          spin: (small ? 75 : 85) * lvl,
          atk: (heavy ? 0.95 : small ? 0.85 : 1) * lvl,
          accel: (heavy ? 380 : 470) * Math.min(1.25, 0.85 + n * 0.04),
          drain: 1.6,
          ai: true,
          pers: d.pers,
          think: rand(0.2, 0.6),
        }),
      )
    }
  }

  function start(level: number = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    world.current = w
    // Each match is a level: the map replays beaten matches, Play continues at the next one.
    beginMatch(w, Math.max(1, typeof level === 'number' && level > 0 ? Math.floor(level) : run.nextLevel), true)
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    announce(w)
    sfx.ready()
    haptic.light()
  }

  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.3)
    fx.stop(0.12)
    fx.shake(12, 0.4)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      w.stats.score = Math.round(w.score)
      const coins = Math.round(clamp(w.score / 90 + w.stats.wins * 3 + w.stats.bosses * 10, 3, 400))
      run.end({ score: w.stats.score, cleared: w.stats.wins >= 3, stats: { ...w.stats }, coins }, revive)
    }, 1150)
  }

  function revive() {
    const w = world.current
    const me = playerTop(w)
    me.spin = me.maxSpin * 0.7
    me.shield = 2.2
    me.special = 100
    w.me = me
    w.tops = w.tops.filter((t) => t.alive)
    w.tops.push(me)
    for (const t of w.tops) {
      if (t === me) continue
      const d = Math.hypot(t.x, t.y) || 1
      t.vx += (t.x / d) * 120
      t.vy += (t.y / d) * 120
      if (d < 70) {
        t.x = (t.x / d) * 70
        t.y = (t.y / d) * 70
      }
    }
    fx.ring(0, 0, { color: '#f9a8d4', maxR: 70, life: 0.6, width: 5 })
    say('REVIVED!', 'shield up')
    setPhaseBoth('play')
  }

  function chooseRandomParts(): Part[] {
    const pool = [...PARTS]
    const out: Part[] = []
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    return out
  }

  function choosePart(p: Part) {
    const w = world.current
    w.parts[p.id]++
    sfx.power()
    haptic.medium()
    beginMatch(w, w.match + 1, true)
    setPhaseBoth('play')
    announce(w)
  }

  function announce(w: World) {
    const boss = w.tops.find((t) => t.boss)
    say(boss ? `BOSS · ${boss.name}` : `LEVEL ${w.match} · ${w.title.toUpperCase()}`, `${w.tier > 0 ? `tier ${w.tier + 1} · ` : ''}${w.intro}`)
    if (boss) sfx.boom(0.5)
  }

  function doDash() {
    const w = world.current
    const me = w.me
    if (!me || !me.alive || phaseRef.current !== 'play' || w.countdown > 0) return
    const cost = w.parts.dash ? 28 : 35
    if (me.special < cost) return
    me.special -= cost
    const v = stick.vec()
    let dx = v.x
    let dy = v.y
    if (Math.hypot(dx, dy) < 0.2) {
      // Auto-aim at the nearest rival.
      let best: Top | null = null
      let bd = 1e9
      for (const t of w.tops) {
        if (t === me || !t.alive || t.out > 0) continue
        const d = Math.hypot(t.x - me.x, t.y - me.y)
        if (d < bd) {
          bd = d
          best = t
        }
      }
      if (best) {
        dx = best.x - me.x
        dy = best.y - me.y
      } else {
        dx = -me.x
        dy = -me.y
      }
    }
    const l = Math.hypot(dx, dy) || 1
    const power = 430 * (1 + w.parts.dash * 0.3)
    me.vx = (dx / l) * power
    me.vy = (dy / l) * power
    me.dash = 0.45
    me.angry = 0.6
    fx.ring(me.x, me.y, { color: '#f9a8d4', maxR: 40, life: 0.3, width: 4 })
    fx.burst(me.x, me.y, { count: 12, color: ['#f9a8d4', '#ffffff'], speed: 240, angle: Math.atan2(-dy, -dx), spread: 0.8, shape: 'spark', gravity: 0 })
    sfx.whoosh()
    haptic.medium()
  }

  function doShield() {
    const w = world.current
    const me = w.me
    if (!me || !me.alive || phaseRef.current !== 'play' || w.countdown > 0) return
    if (me.special < 60) return
    me.special -= 60
    me.shield = 1.1 * (1 + w.parts.mirror * 0.5)
    fx.ring(me.x, me.y, { color: '#67e8f9', maxR: 50, life: 0.4, width: 5 })
    sfx.power()
    haptic.medium()
  }

  function eliminate(w: World, t: Top, how: 'out' | 'spin') {
    if (!t.alive) return
    t.alive = false
    const credit = t.hitBy && t.hitT > 0 ? t.hitBy : null
    if (how === 'out') {
      fx.burst(t.x, t.y, { count: 20, color: [t.color, t.color2, '#ffffff'], speed: 260, shape: 'spark', gravity: 0 })
      sfx.boom(t.boss ? 1 : 0.5)
    } else {
      fx.burst(t.x, t.y, { count: 14, color: ['#94a3b8', '#e2e8f0', t.color], speed: 120, gravity: 0 })
      sfx.thud()
    }
    const me = w.me
    if (t === me) {
      w.me = null
      say(how === 'out' ? 'RING OUT!' : 'OUT-SPUN!')
      die()
      return
    }
    w.koThisMatch++
    if (me && (credit === me || how === 'out')) {
      if (how === 'out') w.stats.ringouts++
      const pts = t.boss ? 1500 : how === 'out' ? 200 : 150
      w.score += pts
      fx.text(t.x, t.y - 26, how === 'out' ? 'RING OUT!' : 'OUT-SPUN!', how === 'out' ? '#fde047' : '#f9a8d4', 22)
      fx.text(t.x, t.y - 6, `+${pts}`, '#ffffff', 15)
      fx.shake(t.boss ? 14 : 8, 0.35)
      fx.stop(0.1)
      haptic.heavy()
      sfx.score(w.koThisMatch * 2)
    }
    if (t.boss) {
      w.stats.bosses++
      fx.slowmo(1, 0.3)
      fx.flash('#fde047', 0.25)
      say('BOSS DOWN!', t.name)
      sfx.win()
      if (w.clock - w.lastTrack > 30) {
        w.lastTrack = w.clock
        void trackEvent('action_milestone', { game_id: 'spinner', kind: 'boss', value: w.stats.bosses })
      }
    }
    run.update(w.stats)
  }

  function clash(w: World, a: Top, b: Top) {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.hypot(dx, dy) || 0.01
    const overlap = a.r + b.r - d
    if (overlap <= 0) return
    const nx = dx / d
    const ny = dy / d
    const tm = a.mass + b.mass
    a.x -= nx * overlap * (b.mass / tm)
    a.y -= ny * overlap * (b.mass / tm)
    b.x += nx * overlap * (a.mass / tm)
    b.y += ny * overlap * (a.mass / tm)
    const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
    if (rel > -10) return
    const impact = -rel
    const j = (2.1 * impact) / (1 / a.mass + 1 / b.mass)
    // Spin powers the clash: a fast-spinning, sharp top hits much harder.
    const powA = a.atk * (0.45 + (a.spin / a.maxSpin) * 0.75) * (a.dash > 0 ? 1.8 : 1)
    const powB = b.atk * (0.45 + (b.spin / b.maxSpin) * 0.75) * (b.dash > 0 ? 1.8 : 1)
    const kA = a.shield > 0 ? 0 : 1
    const kB = b.shield > 0 ? 0 : 1
    const extraB = (90 + impact * 0.35) * powA * (a.shield > 0 ? 1.6 : 1)
    const extraA = (90 + impact * 0.35) * powB * (b.shield > 0 ? 1.6 : 1)
    a.vx -= ((j * 0.5 + extraA) / a.mass) * nx * kA
    a.vy -= ((j * 0.5 + extraA) / a.mass) * ny * kA
    b.vx += ((j * 0.5 + extraB) / b.mass) * nx * kB
    b.vy += ((j * 0.5 + extraB) / b.mass) * ny * kB
    // Spin deflection: tangential kick in the spin direction.
    const tx = -ny
    const ty = nx
    const side = impact * 0.25
    a.vx += tx * side * kA
    a.vy += ty * side * kA
    b.vx -= tx * side * kB
    b.vy -= ty * side * kB
    const dmgA = (3 + impact * 0.028) * powB * kA
    const dmgB = (3 + impact * 0.028) * powA * kB
    a.spin -= dmgA
    b.spin -= dmgB
    a.hitBy = b
    a.hitT = 2.5
    b.hitBy = a
    b.hitT = 2.5
    a.flash = 0.12
    b.flash = 0.12
    const me = w.me
    const px = a.x + nx * a.r
    const py = a.y + ny * a.r
    const big = impact > 260
    fx.burst(px, py, { count: big ? 22 : 12, color: ['#fde047', '#fff7ed', '#fb923c', '#ffffff'], speed: 200 + impact * 0.6, shape: 'spark', gravity: 0, size: 2.4, life: 0.4 })
    if (big) fx.ring(px, py, { color: '#fde047', maxR: 34, life: 0.25, width: 3 })
    if (a === me || b === me) {
      w.stats.clashes++
      const other = a === me ? b : a
      if (me) {
        me.special = Math.min(100, me.special + 9 * (1 + run.level('charge') * 0.2) * (1 + w.parts.charge * 0.25))
        if (w.parts.vamp) me.spin = Math.min(me.maxSpin, me.spin + 3 * w.parts.vamp)
        const dealt = a === me ? dmgB : dmgA
        if (dealt > 9) fx.text(other.x, other.y - other.r - 6, `-${Math.round(dealt)}`, '#fca5a5', 14)
      }
      fx.stop(Math.min(0.11, 0.025 + impact / 4000))
      fx.shake(Math.min(11, 2 + impact / 60), 0.2)
      haptic[big ? 'heavy' : 'light']()
      if (me && (a.shield > 0 || b.shield > 0) && me.shield > 0) sfx.clang()
    }
    if (w.clashSnd <= 0) {
      w.clashSnd = 0.06
      if (big) sfx.clang()
      else sfx.hit()
    }
  }

  function think(w: World, t: Top) {
    const me = w.me
    const dc = Math.hypot(t.x, t.y)
    const edge = w.R * (t.pers === 'tank' ? 0.55 : 0.72)
    if (dc > edge) {
      t.tx = 0
      t.ty = 0
      return
    }
    // Pick a target: prefer the player, else the nearest rival.
    let target: Top | null = null
    let best = 1e9
    for (const o of w.tops) {
      if (o === t || !o.alive || o.out > 0) continue
      const d = Math.hypot(o.x - t.x, o.y - t.y) * (o === me ? 0.6 : 1)
      if (d < best) {
        best = d
        target = o
      }
    }
    if (!target) {
      t.tx = 0
      t.ty = 0
      return
    }
    const lead = 0.25
    let ax = target.x + target.vx * lead
    let ay = target.y + target.vy * lead
    if (t.pers === 'counter') {
      // Strike from the inside so the hit pushes the target outward.
      const tr = Math.hypot(target.x, target.y) || 1
      const inX = target.x - (target.x / tr) * 30
      const inY = target.y - (target.y / tr) * 30
      if (Math.hypot(t.x - inX, t.y - inY) > 40) {
        ax = inX
        ay = inY
      }
    } else if (t.pers === 'tank') {
      ax = target.x * 0.5
      ay = target.y * 0.5
      if (best < 90) {
        ax = target.x
        ay = target.y
      }
    } else if (t.pers === 'orbit' && best > 85) {
      // Orbiters circle mid-bowl and only cut in when something comes close.
      const a = Math.atan2(t.y, t.x) + 0.9
      ax = Math.cos(a) * w.R * 0.5
      ay = Math.sin(a) * w.R * 0.5
    }
    t.tx = ax
    t.ty = ay
    // AI specials.
    const ready = w.matchT > 3
    if (ready && t.special >= 35 && best < 120 && Math.random() < 0.35 && t.pers !== 'tank') {
      t.special -= 35
      const dx = target.x - t.x
      const dy = target.y - t.y
      const l = Math.hypot(dx, dy) || 1
      const p = t.boss ? 480 : 380
      t.vx = (dx / l) * p
      t.vy = (dy / l) * p
      t.dash = 0.4
      t.angry = 0.6
      fx.burst(t.x, t.y, { count: 8, color: [t.color2, '#ffffff'], speed: 200, angle: Math.atan2(-dy, -dx), spread: 0.8, shape: 'spark', gravity: 0 })
    }
    if (ready && t.special >= 60 && t.pers !== 'charger' && Math.random() < 0.2) {
      for (const o of w.tops) {
        if (o === t || o.dash <= 0) continue
        if (Math.hypot(o.x - t.x, o.y - t.y) < 90) {
          t.special -= 60
          t.shield = 0.9
          break
        }
      }
    }
  }

  function step(w: World, dt: number, ph: Phase) {
    w.clock += dt
    const me = w.me
    const R = w.R
    if (w.countdown > 0) {
      const prev = Math.ceil(w.countdown - 0.2)
      w.countdown -= dt
      const now = Math.ceil(w.countdown - 0.2)
      if (now !== prev && ph === 'play') {
        if (now > 0) sfx.tick()
        else {
          sfx.ready()
          say('LET IT RIP!')
          haptic.medium()
        }
      }
    } else w.matchT += dt
    const live = w.countdown <= 0
    if (w.clashSnd > 0) w.clashSnd -= dt
    const ice = w.arena === 'ice'
    for (const t of w.tops) {
      if (!t.alive) continue
      if (t.out > 0 || t.topple > 0) continue
      let ix = 0
      let iy = 0
      if (t === me && ph === 'play' && import.meta.env.DEV && devAuto.current) {
        const ai = autoSteer(w, t)
        ix = ai.x
        iy = ai.y
      } else if (t === me && ph === 'play') {
        const v = stick.vec()
        ix = v.x
        iy = v.y
        const k = keys.current
        if (k.has('ArrowLeft') || k.has('a')) ix -= 1
        if (k.has('ArrowRight') || k.has('d')) ix += 1
        if (k.has('ArrowUp') || k.has('w')) iy -= 1
        if (k.has('ArrowDown') || k.has('s')) iy += 1
        const l = Math.hypot(ix, iy)
        if (l > 1) {
          ix /= l
          iy /= l
        }
      } else if (t.ai) {
        t.think -= dt
        if (t.think <= 0) {
          t.think = rand(0.2, 0.35)
          if (live) think(w, t)
        }
        const dx = t.tx - t.x
        const dy = t.ty - t.y
        const l = Math.hypot(dx, dy)
        if (l > 6) {
          ix = dx / l
          iy = dy / l
        }
        if (!live) {
          ix = 0
          iy = 0
        }
      }
      if (!live) {
        ix = 0
        iy = 0
      }
      const spinK = 0.35 + 0.65 * (t.spin / t.maxSpin)
      const acc = t.accel * spinK
      // Bowl slope pulls everything toward the centre.
      const pull = ice ? 1.6 : 2.2
      t.vx += (ix * acc - t.x * pull) * dt
      t.vy += (iy * acc - t.y * pull) * dt
      const fr = ice ? 0.35 : 1.1
      t.vx -= t.vx * fr * dt
      t.vy -= t.vy * fr * dt
      const sp = Math.hypot(t.vx, t.vy)
      const cap = t.dash > 0 ? 700 : 360
      if (sp > cap) {
        t.vx *= cap / sp
        t.vy *= cap / sp
      }
      t.x += t.vx * dt
      t.y += t.vy * dt
      if (live) {
        t.spin -= t.drain * dt * (t.ai ? 1 : 1)
        t.special = Math.min(100, t.special + dt * (t === me ? 7 * (1 + run.level('charge') * 0.2) * (1 + w.parts.charge * 0.25) : 6))
      }
      t.angle += dt * (8 + 24 * (t.spin / t.maxSpin))
      if (t.dash > 0) t.dash -= dt
      if (t.shield > 0) t.shield -= dt
      if (t.hitT > 0) t.hitT -= dt
      if (t.flash > 0) t.flash -= dt
      if (t.angry > 0) t.angry -= dt
      t.trail.push(t.x, t.y)
      if (t.trail.length > 16) t.trail.splice(0, 2)
      // Boss shockwave, telegraphed by a charging glow.
      if (t.boss && live) {
        t.waveT -= dt
        if (t.waveT < 0.8 && t.wave === 0) {
          t.wave = 0.8
          const order: Sig[] = ['wave', 'vortex', 'split']
          t.sigNow = t.sig === 'all' ? order[(t.sigN ?? 0) % 3] : (t.sig ?? 'wave')
          t.sigN = (t.sigN ?? 0) + 1
        }
        if (t.wave > 0) {
          t.wave -= dt
          if (t.wave <= 0 && t.sigNow === 'vortex') {
            t.wave = 0
            t.waveT = rand(4.5, 6.5)
            // Whirlpool: drags nearby tops toward the boss (spin away from it).
            fx.ring(t.x, t.y, { color: '#2dd4bf', maxR: 200, life: 0.5, width: 6 })
            fx.ring(t.x, t.y, { color: '#99f6e4', maxR: 120, life: 0.6, width: 3 })
            sfx.whoosh()
            for (const o of w.tops) {
              if (o === t || !o.alive || o.shield > 0) continue
              const dx = o.x - t.x
              const dy = o.y - t.y
              const d = Math.hypot(dx, dy) || 1
              if (d < 220) {
                const k = (1 - d / 220) * 300
                o.vx -= (dx / d) * k - (-dy / d) * k * 0.4
                o.vy -= (dy / d) * k - (dx / d) * k * 0.4
                o.spin -= 6
                if (o === me) haptic.medium()
              }
            }
          } else if (t.wave <= 0 && t.sigNow === 'split') {
            t.wave = 0
            t.waveT = rand(7.5, 9.5)
            // Splits off two mini tops that hunt you.
            if (w.tops.filter((o) => o.alive && o.ai && !o.boss).length < 2) {
              for (const sd of [-1, 1]) {
                const a = Math.atan2(t.y, t.x) + sd * 1.2
                const mini = makeTop({ name: 'Shard', color: t.color2, color2: '#ffffff', blades: 3, shape: 'spike', r: 13, mass: 0.55, maxSpin: 35, spin: 35, atk: 0.5, accel: 430, drain: 2.2, ai: true, pers: 'charger', think: 0.4 })
                mini.x = t.x + Math.cos(a) * (t.r + 18)
                mini.y = t.y + Math.sin(a) * (t.r + 18)
                mini.vx = Math.cos(a) * 160
                mini.vy = Math.sin(a) * 160
                w.tops.push(mini)
              }
              fx.burst(t.x, t.y, { count: 24, color: [t.color2, '#ffffff'], speed: 260, shape: 'spark', gravity: 0 })
              sfx.pop()
            }
          } else if (t.wave <= 0) {
            t.wave = 0
            t.waveT = rand(4.5, 6.5)
            fx.ring(t.x, t.y, { color: '#fbbf24', maxR: 150, life: 0.45, width: 8 })
            fx.shake(10, 0.3)
            sfx.boom(0.7)
            for (const o of w.tops) {
              if (o === t || !o.alive || o.shield > 0) continue
              const dx = o.x - t.x
              const dy = o.y - t.y
              const d = Math.hypot(dx, dy) || 1
              if (d < 150) {
                const k = (1 - d / 150) * 420
                o.vx += (dx / d) * k
                o.vy += (dy / d) * k
                o.hitBy = t
                o.hitT = 2
                if (o === me) haptic.heavy()
              }
            }
          }
        }
      }
      // Arena hazards.
      const dc = Math.hypot(t.x, t.y)
      if (w.arena === 'lava' && live && dc > R * LAVA_IN) {
        t.spin -= 11 * dt
        if (Math.random() < dt * 14) fx.burst(t.x, t.y, { count: 1, color: ['#fb923c', '#fde047', '#ef4444'], speed: 60, size: 2.5, gravity: -40, life: 0.5 })
        if (t === me && Math.random() < dt * 3) haptic.light()
      }
      if (w.arena === 'spikes' && dc > R - t.r - 6 && dc < R + 4) {
        const nx = t.x / dc
        const ny = t.y / dc
        const vn = t.vx * nx + t.vy * ny
        if (vn > 0) {
          t.vx -= nx * vn * 1.6
          t.vy -= ny * vn * 1.6
          t.spin -= 6
          fx.burst(t.x + nx * t.r, t.y + ny * t.r, { count: 8, color: ['#ef4444', '#fde047'], speed: 180, shape: 'spark', gravity: 0 })
          if (t === me) {
            sfx.hurt()
            haptic.medium()
            fx.flash('#ef4444', 0.12)
          }
        }
      }
      if (w.arena === 'bumpers') {
        for (let k = 0; k < 3; k++) {
          const a = (k / 3) * Math.PI * 2 + Math.PI / 6
          const bx = Math.cos(a) * R * 0.55
          const by = Math.sin(a) * R * 0.55
          const dx = t.x - bx
          const dy = t.y - by
          const d = Math.hypot(dx, dy)
          if (d < t.r + 14) {
            const nx = dx / (d || 1)
            const ny = dy / (d || 1)
            t.x = bx + nx * (t.r + 14)
            t.y = by + ny * (t.r + 14)
            const vn = t.vx * nx + t.vy * ny
            if (vn < 0) {
              t.vx -= nx * vn * 2.3
              t.vy -= ny * vn * 2.3
              fx.ring(bx, by, { color: '#a78bfa', maxR: 30, life: 0.25, width: 3 })
              if (t === me) sfx.pop()
            }
          }
        }
      }
      // Rim lip: slow tops bounce back, only hard knocks fly over.
      if (dc > R - t.r * 0.3 && dc <= R + t.r * 0.35 && w.arena !== 'spikes') {
        const nx = t.x / dc
        const ny = t.y / dc
        const vn = t.vx * nx + t.vy * ny
        const escape = Math.max(150, 260 - w.match * 10)
        if (vn > 0 && vn < escape) {
          t.vx -= nx * vn * 1.7
          t.vy -= ny * vn * 1.7
          t.x = nx * (R - t.r * 0.3)
          t.y = ny * (R - t.r * 0.3)
          if (vn > 60) {
            fx.burst(t.x + nx * t.r, t.y + ny * t.r, { count: 6, color: ['#e2e8f0', '#fde047'], speed: 140, shape: 'spark', gravity: 0 })
            if (t === me) sfx.clang()
          }
        }
      }
      if (dc > R + t.r * 0.35) {
        t.out = 0.6
        if (t === me) {
          fx.shake(10, 0.3)
        }
      } else if (t.spin <= 0) {
        t.spin = 0
        t.topple = 0.9
      }
    }
    // Ring-out falls and topples.
    for (const t of w.tops) {
      if (!t.alive) continue
      if (t.out > 0) {
        t.out -= dt
        t.x += t.vx * dt * 0.6
        t.y += t.vy * dt * 0.6
        if (t.out <= 0) eliminate(w, t, 'out')
      } else if (t.topple > 0) {
        t.topple -= dt
        t.vx *= 0.9
        t.vy *= 0.9
        if (t.topple <= 0) eliminate(w, t, 'spin')
      }
    }
    // Clashes.
    for (let i = 0; i < w.tops.length; i++) {
      const a = w.tops[i]
      if (!a.alive || a.out > 0) continue
      for (let j = i + 1; j < w.tops.length; j++) {
        const b = w.tops[j]
        if (!b.alive || b.out > 0) continue
        clash(w, a, b)
      }
    }
    w.tops = w.tops.filter((t) => t.alive || t === me)

    // Spin orbs.
    if (live && ph === 'play') {
      w.orbT -= dt
      if (w.orbT <= 0) {
        w.orbT = rand(7, 11)
        if (w.orbs.length < 2) {
          const a = rand(0, Math.PI * 2)
          const d = rand(0.2, 0.6) * R
          w.orbs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, ph: 0, life: 14 })
        }
      }
    }
    for (const o of w.orbs) {
      o.ph += dt
      o.life -= dt
      for (const t of w.tops) {
        if (!t.alive || t.out > 0 || o.life <= 0) continue
        if (Math.hypot(t.x - o.x, t.y - o.y) < t.r + 12) {
          o.life = 0
          t.spin = Math.min(t.maxSpin, t.spin + t.maxSpin * 0.25)
          fx.ring(o.x, o.y, { color: '#22d3ee', maxR: 40, life: 0.4, width: 4 })
          fx.burst(o.x, o.y, { count: 12, color: ['#22d3ee', '#ffffff'], speed: 160, gravity: 0 })
          if (t === me) {
            fx.text(o.x, o.y - 18, '+SPIN', '#67e8f9', 16)
            sfx.power()
            haptic.light()
          }
        }
      }
    }
    w.orbs = w.orbs.filter((o) => o.life > 0)

    if (ph === 'idle') {
      if (w.tops.filter((t) => t.alive).length <= 1) beginMatch(w, 1, false)
      return
    }
    if (ph !== 'play' || !me) return
    const foes = w.tops.filter((t) => t !== me && t.alive).length
    if (foes === 0 && me.alive) {
      w.endT += dt
      if (w.endT > 1.1) {
        w.stats.wins++
        // Stars: win = 1, finish with half your spin or more = +1, win inside 45 s = +1.
        const stars = 1 + (me.spin >= me.maxSpin * 0.5 ? 1 : 0) + (w.matchT <= 45 ? 1 : 0)
        run.completeLevel(w.match, stars)
        w.lastStars = stars
        const bonus = 300 + Math.round((me.spin / me.maxSpin) * 200)
        w.score += bonus
        w.stats.score = Math.round(w.score)
        run.update(w.stats)
        sfx.win()
        haptic.success()
        fx.flash('#ffffff', 0.2)
        setChoices(chooseRandomParts())
        stick.id = null
        setPhaseBoth('upgrade')
        if (w.stats.wins % 5 === 0 && w.clock - w.lastTrack > 30) {
          w.lastTrack = w.clock
          void trackEvent('action_milestone', { game_id: 'spinner', kind: 'wins', value: w.stats.wins })
        }
      }
    }
    w.hudT -= dt
    if (w.hudT <= 0) {
      w.hudT = 0.1
      w.stats.score = Math.round(w.score)
      setHud({ score: Math.round(w.score), match: w.match, spin: clamp(me.spin / me.maxSpin, 0, 1), special: me.special, foes })
    }
  }

  /** DEV-only test pilot: hug the centre, hit rivals from the inside, dash in close, shield boss waves. */
  function autoSteer(w: World, me: Top) {
    let target: Top | null = null
    let best = 1e9
    for (const o of w.tops) {
      if (o === me || !o.alive || o.out > 0) continue
      const d = Math.hypot(o.x - me.x, o.y - me.y)
      if (d < best) {
        best = d
        target = o
      }
      if (o.boss && o.wave > 0 && o.wave < 0.3 && me.special >= 60 && d < 200) doShield()
      if (o.dash > 0 && d < 90 && me.special >= 60 && me.shield <= 0) doShield()
    }
    if (!target) return { x: -me.x / 100, y: -me.y / 100 }
    const tr = Math.hypot(target.x, target.y) || 1
    let ax = target.x - (target.x / tr) * 28
    let ay = target.y - (target.y / tr) * 28
    if (Math.hypot(me.x - ax, me.y - ay) < 30 || best < 60) {
      ax = target.x
      ay = target.y
    }
    const lim = w.R * 0.55
    const al = Math.hypot(ax, ay)
    if (al > lim) {
      ax *= lim / al
      ay *= lim / al
    }
    if (w.arena !== 'ice' && best < 110 && me.special >= 35 && Math.hypot(me.x, me.y) < Math.min(tr, w.R * 0.45)) doDash()
    const dx = ax - me.x
    const dy = ay - me.y
    const l = Math.hypot(dx, dy) || 1
    return { x: dx / l, y: dy / l }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    stick.down(e.pointerId, p.x, p.y)
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = localPoint(e, e.currentTarget)
    stick.move(e.pointerId, p.x, p.y)
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    stick.up(e.pointerId)
  }

  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__spinner = world
      // Test hook for headless bots: autopilot, fast-forward, state readout.
      const hook = {
        auto: (on: boolean) => (devAuto.current = on),
        speed: (n: number) => (devSpeed.current = Math.max(1, Math.min(8, Math.round(n)))),
        state: () => {
          const w = world.current
          return { phase: phaseRef.current, stage: w.match, title: w.title, arena: w.arena, foes: w.tops.filter((t) => t !== w.me && t.alive).length, spin: w.me ? Math.round(w.me.spin) : 0 }
        },
        perk: () => (document.querySelector('.spinner-upgrade__card') as HTMLButtonElement | null)?.click(),
      }
      ;(window as unknown as { __lv6spinner?: typeof hook }).__lv6spinner = hook
    }
    function down(e: KeyboardEvent) {
      if (phaseRef.current !== 'play') return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (k.startsWith('Arrow') || k === ' ') e.preventDefault()
      if (k === 'j' || k === ' ') doDash()
      else if (k === 'k' || k === 'Shift') doShield()
      else keys.current.add(k)
    }
    function up(e: KeyboardEvent) {
      keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    const ph = phaseRef.current
    if (ph === 'idle' && world.current.tops.length === 0) beginMatch(world.current, 1, false)
    const w = world.current
    const reps = import.meta.env.DEV ? devSpeed.current : 1
    for (let i = 0; i < reps; i++) {
      const dt = fx.step(raw)
      if (dt > 0 && phaseRef.current !== 'upgrade') step(w, dt, phaseRef.current)
    }
    const R = w.R
    const s = Math.min((W * 0.94) / (2 * R + 30), (H * 0.66) / (2 * R + 30))
    const cx = W / 2
    const cy = H * 0.47
    view.current = { cx, cy, s }
    drawArena(ctx, W, H, cx, cy, s, R, w.arena, t)
    fx.applyShake(ctx)
    ctx.translate(cx, cy)
    ctx.scale(s, s)
    // Bumpers.
    if (w.arena === 'bumpers') {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + Math.PI / 6
        const bx = Math.cos(a) * R * 0.55
        const by = Math.sin(a) * R * 0.55
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        ctx.beginPath()
        ctx.arc(bx + 3, by + 4, 14, 0, Math.PI * 2)
        ctx.fill()
        const g = ctx.createRadialGradient(bx - 4, by - 5, 2, bx, by, 14)
        g.addColorStop(0, '#ede9fe')
        g.addColorStop(0.5, '#a78bfa')
        g.addColorStop(1, '#5b21b6')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(bx, by, 14, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#ddd6fe'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(bx, by, 9 + Math.sin(t * 5 + k) * 1.5, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    for (const o of w.orbs) {
      const bob = Math.sin(o.ph * 4) * 2
      if (o.life < 3 && Math.floor(o.ph * 8) % 2 === 0) ctx.globalAlpha = 0.4
      const g = ctx.createRadialGradient(o.x, o.y + bob, 0, o.x, o.y + bob, 22)
      g.addColorStop(0, 'rgba(103,232,249,0.8)')
      g.addColorStop(1, 'rgba(103,232,249,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(o.x, o.y + bob, 22, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ecfeff'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      for (let k = 0; k <= 14; k++) {
        const a = k * 0.6 + o.ph * 5
        const rr = k * 0.6
        if (k === 0) ctx.moveTo(o.x, o.y + bob)
        else ctx.lineTo(o.x + Math.cos(a) * rr, o.y + bob + Math.sin(a) * rr)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    // Draw tops (falling ones first).
    const order = [...w.tops].sort((a, b) => (b.out > 0 ? 1 : 0) - (a.out > 0 ? 1 : 0))
    for (const tp of order) if (tp.alive) drawTop(ctx, tp, t, tp === w.me)
    // Spin bars over rivals.
    for (const tp of w.tops) {
      if (!tp.alive || tp === w.me || tp.out > 0) continue
      const bw = tp.r * 2
      const k = clamp(tp.spin / tp.maxSpin, 0, 1)
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(tp.x - bw / 2, tp.y - tp.r - 12, bw, 4)
      ctx.fillStyle = k > 0.5 ? '#4ade80' : k > 0.25 ? '#facc15' : '#ef4444'
      ctx.fillRect(tp.x - bw / 2, tp.y - tp.r - 12, bw * k, 4)
      if (tp.boss) {
        ctx.font = `900 11px 'Plus Jakarta Sans', system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillStyle = '#fde68a'
        ctx.fillText(tp.name, tp.x, tp.y - tp.r - 18)
      }
    }
    fx.draw(ctx)
    ctx.restore()
    // Countdown.
    if (w.countdown > 0.2 && ph === 'play') {
      const n = Math.ceil(w.countdown - 0.2)
      const k = (w.countdown - 0.2) % 1
      ctx.save()
      ctx.globalAlpha = Math.min(1, k * 2)
      ctx.font = `900 ${Math.round(64 + (1 - k) * 30)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 6
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.strokeText(String(n), cx, cy)
      ctx.fillStyle = '#fff'
      ctx.fillText(String(n), cx, cy)
      ctx.restore()
    }
    const me = w.me
    if (me && me.alive && me.spin / me.maxSpin < 0.25 && ph === 'play') {
      ctx.fillStyle = `rgba(239,68,68,${0.1 + Math.sin(t * 9) * 0.07})`
      ctx.fillRect(0, 0, W, H)
    }
    stick.draw(ctx)
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const w0 = world.current
  const dashCost = w0.parts.dash ? 28 : 35
  const playing = phase === 'play' || phase === 'dying'

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena spinner-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Level {hud.match} · {hud.foes} left
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">SPIN</span>
                <div className="spinner-bar">
                  <span style={{ width: `${hud.spin * 100}%`, background: hud.spin > 0.5 ? '#4ade80' : hud.spin > 0.25 ? '#facc15' : '#ef4444' }} />
                </div>
              </div>
            </div>
          )}
          {phase === 'play' && (
            <div className="action-btns spinner-btns">
              <button
                type="button"
                className={`action-btn spinner-btn is-shield${hud.special >= 60 ? ' is-ready' : ''}`}
                style={{ ['--k' as string]: Math.min(1, hud.special / 60) }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  doShield()
                }}
                aria-label="Shield"
              >
                SHIELD
              </button>
              <button
                type="button"
                className={`action-btn spinner-btn is-dash${hud.special >= dashCost ? ' is-ready' : ''}`}
                style={{ ['--k' as string]: Math.min(1, hud.special / dashCost) }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  doDash()
                }}
                aria-label="Dash"
              >
                DASH
              </button>
            </div>
          )}
          {banner && playing ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          {phase === 'upgrade' && (
            <div className="spinner-upgrade" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Level {w0.match} cleared!</h3>
              <p className="spinner-upgrade__stars">{'★'.repeat(w0.lastStars) + '☆'.repeat(3 - w0.lastStars)}</p>
              <p>Pick a part for your top</p>
              <div className="spinner-upgrade__list">
                {choices.map((p) => (
                  <button key={p.id} type="button" className="spinner-upgrade__card" onClick={() => choosePart(p)}>
                    <PartIcon id={p.id} />
                    <strong>
                      {p.label}
                      {w0.parts[p.id] ? ` ${w0.parts[p.id] + 1}` : ''}
                    </strong>
                    <span>{p.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="spinner"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to steer your top. Clash to drain rivals and knock them over the rim — last top spinning wins."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={w0.stats.wins >= 3 ? 'Champion spinner!' : 'Knocked out!'}
            subtitle={`Score ${Math.round(w0.score)} · ${w0.stats.wins} wins · ${w0.stats.ringouts} ring-outs`}
            celebrate={w0.stats.wins >= 3}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}

function PartIcon({ id }: { id: PartId }) {
  const common = { fill: 'none', stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  return (
    <svg className="spinner-upgrade__icon" viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="15" fill="rgba(255,255,255,0.15)" />
      {id === 'atk' && <path {...common} d="M16 5 L19 13 L27 16 L19 19 L16 27 L13 19 L5 16 L13 13 Z" />}
      {id === 'mass' && <path {...common} d="M9 24 h14 l-3 -12 h-8 z M13 12 a3 3 0 0 1 6 0" />}
      {id === 'bearing' && (
        <g {...common}>
          <circle cx="16" cy="16" r="9" />
          <circle cx="16" cy="16" r="3" />
          <circle cx="16" cy="9.5" r="1.5" />
          <circle cx="22.5" cy="16" r="1.5" />
          <circle cx="16" cy="22.5" r="1.5" />
          <circle cx="9.5" cy="16" r="1.5" />
        </g>
      )}
      {id === 'grip' && <path {...common} d="M10 8 L16 26 L22 8 M12 14 h8" />}
      {id === 'max' && <path {...common} d="M16 6 a10 10 0 1 1 -9 6 M7 6 v6 h6" />}
      {id === 'charge' && <path {...common} d="M18 5 L10 18 h6 l-2 9 l8 -13 h-6 z" />}
      {id === 'vamp' && <path {...common} d="M16 6 C10 14 9 18 12 22 a5 5 0 0 0 8 0 C23 18 22 14 16 6 Z" />}
      {id === 'dash' && <path {...common} d="M6 12 h12 M4 17 h16 M8 22 h10 M20 9 l7 7 l-7 7" />}
      {id === 'mirror' && <path {...common} d="M16 5 L25 9 C25 18 21 24 16 27 C11 24 7 18 7 9 Z" />}
    </svg>
  )
}
