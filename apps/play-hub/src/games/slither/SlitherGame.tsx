import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, rand } from '../../shared/action/fx'
import { Stick, localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { ball, halo, hexPattern, shade } from './art'
import { BIOMES, MINE_ARM, VORTEX_WARN, drawAtmos, drawDecor, drawFar, drawMine, drawMotes, drawVortex, makeDecor, makeMotes, snowflake, stepMotes, type Mine, type Vortex } from './biomes'
import '../../shared/action/action.css'
import './slither.css'

const meta = getGame('slither')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Pers = 'glutton' | 'hunter' | 'coward' | 'encircler' | 'darter' | 'titan' | 'serpent'
type PowKind = 'magnet' | 'turbo' | 'double' | 'ghost' | 'frost'

type Worm = {
  id: number
  name: string
  player: boolean
  pers: Pers
  titan: boolean
  /** Golden Serpent (special event): flees, escapes when its timer runs out. */
  gold: boolean
  escape: number
  xs: number[]
  ys: number[]
  a: number
  target: number
  mass: number
  r: number
  boost: boolean
  shed: number
  colors: string[]
  think: number
  ghost: number
  alive: boolean
  kills: number
  blink: number
  side: number
  x0: number
  y0: number
  x1: number
  y1: number
}

type Pellet = { x: number; y: number; v: number; r: number; c: string; ph: number; vx: number; vy: number; life: number }
type Orb = { x: number; y: number; kind: PowKind; ph: number; life: number }
type Feed = { key: number; text: string; me: boolean }
type BoardRow = { name: string; len: number; me: boolean; titan: boolean }

const R = 1800
const BASE_SPEED = 170
const FOOD_TARGET = 950
const MAX_PELLETS = 1700
const PEL_COLORS = ['#f472b6', '#facc15', '#4ade80', '#38bdf8', '#a78bfa', '#fb923c', '#f87171', '#2dd4bf']
const SKINS = [
  ['#f43f5e', '#fecdd3'],
  ['#3b82f6', '#bfdbfe'],
  ['#f59e0b', '#fef3c7'],
  ['#a855f7', '#e9d5ff'],
  ['#14b8a6', '#ccfbf1'],
  ['#ec4899', '#fbcfe8'],
  ['#eab308', '#334155'],
  ['#ef4444', '#fde047'],
  ['#06b6d4', '#155e75'],
  ['#84cc16', '#ecfccb'],
  ['#f97316', '#7c2d12'],
  ['#6366f1', '#e0e7ff'],
]
const PLAYER_SKIN = ['#4ade80', '#4ade80', '#15803d', '#bef264']
const TITAN_SKIN = ['#dc2626', '#dc2626', '#111827', '#f59e0b']
const NAMES = ['Viper', 'Noodle', 'Zigzag', 'Mamba', 'Wiggles', 'Sly', 'Pixel', 'Fang', 'Comet', 'Slinky', 'Nova', 'Rascal', 'Ziggy', 'Bolt', 'Echo', 'Mochi', 'Jinx', 'Kiwi', 'Rex', 'Neon', 'Taco', 'Squiggle', 'Dash', 'Loop']
const TITAN_NAMES = ['Gorgon', 'Leviathan', 'Jormun', 'Basilisk', 'Wyrm', 'Hydra']
const POW: Record<PowKind, { color: string; dur: number; label: string }> = {
  magnet: { color: '#22d3ee', dur: 12, label: 'MAGNET' },
  turbo: { color: '#facc15', dur: 8, label: 'TURBO' },
  double: { color: '#f472b6', dur: 12, label: 'x2 FOOD' },
  ghost: { color: '#c4b5fd', dur: 5, label: 'GHOST' },
  frost: { color: '#93c5fd', dur: 7, label: 'FREEZE' },
}
const GOLD_SKIN = ['#fbbf24', '#fde68a', '#f59e0b', '#fffbeb']
/** New-content schedule (seconds into a run). */
const BIOME_EVERY = 100
const MINES_AT = 120
const VORTEX_AT = 180
const SERPENT_AT = 210
const SERPENT_EVERY = 120
const FROST_AT = 60
const MAX_MINES = 9
const MILESTONES = [100, 250, 500, 1000, 1500, 2000, 3000, 4000, 5000]

const segCount = (mass: number) => clamp(Math.round(8 + mass * 0.22), 8, 170)
const radiusFor = (mass: number) => 9 + Math.min(28, Math.sqrt(mass) * 0.75)

function angDiff(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

type World = {
  worms: Worm[]
  pellets: Pellet[]
  orbs: Orb[]
  me: Worm | null
  id: number
  time: number
  cam: { x: number; y: number; z: number }
  aiCap: number
  aggr: number
  hunters: boolean
  nextEvent: number
  eventIdx: number
  frenzy: number
  orbTimer: number
  spawnTimer: number
  pow: Record<PowKind, number>
  peak: number
  milestone: number
  combo: number
  comboT: number
  closeT: number
  hudT: number
  deathX: number
  deathY: number
  lastTrack: number
  startMass: number
  lastMass: number
  stats: { score: number; length: number; kills: number; food: number; titans: number; top: number }
  biome: number
  prevBiome: number
  blend: number
  nextBiome: number
  mines: Mine[]
  vortices: Vortex[]
  mineT: number
  vortexT: number
  serpentT: number
  seen: Record<string, boolean>
  bonusCoins: number
  serpents: number
  deathCause: string
}

function freshWorld(): World {
  return {
    worms: [],
    pellets: [],
    orbs: [],
    me: null,
    id: 1,
    time: 0,
    cam: { x: 0, y: 0, z: 1 },
    aiCap: 7,
    aggr: 0.15,
    hunters: false,
    nextEvent: 30,
    eventIdx: 0,
    frenzy: 0,
    orbTimer: 8,
    spawnTimer: 0,
    pow: { magnet: 0, turbo: 0, double: 0, ghost: 0, frost: 0 },
    peak: 0,
    milestone: 0,
    combo: 0,
    comboT: 0,
    closeT: 0,
    hudT: 0,
    deathX: 0,
    deathY: 0,
    lastTrack: -99,
    startMass: 30,
    lastMass: 30,
    stats: { score: 0, length: 0, kills: 0, food: 0, titans: 0, top: 0 },
    biome: 0,
    prevBiome: 0,
    blend: 1,
    nextBiome: BIOME_EVERY,
    mines: [],
    vortices: [],
    mineT: 0,
    vortexT: 0,
    serpentT: SERPENT_AT,
    seen: {},
    bonusCoins: 0,
    serpents: 0,
    deathCause: '',
  }
}

function makeWorm(w: World, opts: { name: string; pers: Pers; x: number; y: number; mass: number; colors: string[]; player?: boolean; a?: number }): Worm {
  const a = opts.a ?? rand(0, Math.PI * 2)
  const n = segCount(opts.mass)
  const r = radiusFor(opts.mass)
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i < n; i++) {
    xs.push(opts.x - Math.cos(a) * r * 0.5 * i)
    ys.push(opts.y - Math.sin(a) * r * 0.5 * i)
  }
  return {
    id: w.id++,
    name: opts.name,
    player: !!opts.player,
    pers: opts.pers,
    titan: opts.pers === 'titan',
    gold: opts.pers === 'serpent',
    escape: 0,
    xs,
    ys,
    a,
    target: a,
    mass: opts.mass,
    r,
    boost: false,
    shed: 0,
    colors: opts.colors,
    think: rand(0, 0.2),
    ghost: 0,
    alive: true,
    kills: 0,
    blink: rand(1, 5),
    side: Math.random() < 0.5 ? -1 : 1,
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
  }
}

function addPellet(w: World, x: number, y: number, v: number, c: string, life = -1, vx = 0, vy = 0) {
  if (w.pellets.length >= MAX_PELLETS) w.pellets.shift()
  w.pellets.push({ x, y, v, r: 3 + Math.sqrt(v) * 2.2, c, ph: rand(0, 6.28), vx, vy, life })
}

function randomInArena(maxR: number) {
  const a = rand(0, Math.PI * 2)
  const d = Math.sqrt(Math.random()) * maxR
  return { x: Math.cos(a) * d, y: Math.sin(a) * d }
}

/** A spot far from every worm segment, preferring distance from the player. */
function safeSpot(w: World, minFromMe: number) {
  let best = randomInArena(R - 300)
  let bestScore = -1
  for (let k = 0; k < 24; k++) {
    const p = randomInArena(R - 300)
    let near = 1e9
    for (const o of w.worms) {
      if (!o.alive) continue
      for (let i = 0; i < o.xs.length; i += 3) {
        const d = Math.hypot(o.xs[i] - p.x, o.ys[i] - p.y)
        if (d < near) near = d
      }
    }
    if (w.me && w.me.alive && Math.hypot(w.me.xs[0] - p.x, w.me.ys[0] - p.y) < minFromMe) continue
    if (near > bestScore) {
      bestScore = near
      best = p
    }
  }
  return best
}

export default function SlitherGame() {
  const run = useActionRun('slither')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const stick = useRef(new Stick(56)).current
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const boostRef = useRef(false)
  const keys = useRef(new Set<string>())
  const stars = useRef<{ x: number; y: number; s: number; d: number }[]>([])
  const size = useRef({ w: 360, h: 560 })
  const motes = useRef(makeMotes(42)).current
  const decor = useRef(makeDecor(R)).current
  const floorPats = useRef(new Map<number, CanvasPattern | null>()).current

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ len: 0, rank: 1, alive: 1, kills: 0, pows: [] as { kind: PowKind; t: number }[] })
  const [board, setBoard] = useState<BoardRow[]>([])
  const [feed, setFeed] = useState<Feed[]>([])
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [boosting, setBoosting] = useState(false)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  const bannerQ = useRef<{ text: string; sub?: string }[]>([])
  const lastSay = useRef(0)

  /** Show a banner; queue it if another one is still on screen. */
  function say(text: string, sub?: string) {
    const now = performance.now()
    if (now - lastSay.current < 1350) {
      if (bannerQ.current.length < 3) bannerQ.current.push({ text, sub })
      return
    }
    lastSay.current = now
    setBanner({ key: now + Math.random(), text, sub })
  }

  function flushBanners() {
    if (!bannerQ.current.length || performance.now() - lastSay.current < 1350) return
    const b = bannerQ.current.shift()!
    say(b.text, b.sub)
  }

  function pushFeed(text: string, me: boolean) {
    const key = Date.now() + Math.random()
    setFeed((f) => [...f.slice(-2), { key, text, me }])
    window.setTimeout(() => setFeed((f) => f.filter((x) => x.key !== key)), 3800)
  }

  function spawnAi(w: World, near?: { x: number; y: number }, pers?: Pers, mass?: number) {
    const used = new Set(w.worms.map((o) => o.name))
    const free = NAMES.filter((n) => !used.has(n))
    const name = free.length ? free[Math.floor(Math.random() * free.length)] : NAMES[w.id % NAMES.length]
    let p = safeSpot(w, 650)
    if (near) {
      const a = rand(0, Math.PI * 2)
      const d = rand(650, 850)
      const x = clamp(near.x + Math.cos(a) * d, -R + 300, R - 300)
      const y = clamp(near.y + Math.sin(a) * d, -R + 300, R - 300)
      if (Math.hypot(x, y) < R - 250) p = { x, y }
    }
    let kind: Pers = pers ?? 'glutton'
    if (!pers) {
      const roll = Math.random()
      kind = roll < 0.35 ? 'glutton' : roll < 0.6 ? (w.hunters ? 'hunter' : 'glutton') : roll < 0.8 ? 'coward' : 'encircler'
    }
    const m = mass ?? rand(30, Math.min(420, 70 + w.time * 0.9))
    // Face the player (or the centre) so the long body trails away from them.
    const me = w.me && w.me.alive ? w.me : null
    const a = me ? Math.atan2(me.ys[0] - p.y, me.xs[0] - p.x) + rand(-0.6, 0.6) : Math.atan2(-p.y, -p.x) + rand(-0.8, 0.8)
    const worm = makeWorm(w, { name, pers: kind, x: p.x, y: p.y, mass: m, colors: SKINS[w.id % SKINS.length], a })
    w.worms.push(worm)
    return worm
  }

  function spawnTitan(w: World, n: number) {
    const near = w.me && w.me.alive ? { x: w.me.xs[0], y: w.me.ys[0] } : undefined
    const t = spawnAi(w, near, 'titan', 700 + n * 260)
    t.name = TITAN_NAMES[n % TITAN_NAMES.length]
    t.colors = TITAN_SKIN
    return t
  }

  function buildWorld(withPlayer: boolean) {
    const w = freshWorld()
    for (let i = 0; i < FOOD_TARGET; i++) {
      const p = randomInArena(R - 40)
      addPellet(w, p.x, p.y, Math.random() < 0.85 ? 1 : 2, PEL_COLORS[i % PEL_COLORS.length])
    }
    if (withPlayer) {
      w.startMass = 30 + run.level('start') * 20
      const me = makeWorm(w, { name: 'You', pers: 'glutton', x: 0, y: 0, mass: w.startMass, colors: PLAYER_SKIN, player: true, a: -Math.PI / 2 })
      me.ghost = 2
      w.worms.push(me)
      w.me = me
      w.peak = w.startMass
    }
    for (let i = 0; i < 7; i++) spawnAi(w, undefined, undefined, rand(30, withPlayer ? 110 : 300))
    w.cam = { x: 0, y: 0, z: 1 }
    return w
  }

  function start() {
    void unlockAudio()
    bannerQ.current = []
    lastSay.current = 0
    world.current = buildWorld(true)
    fx.reset()
    boostRef.current = false
    setBoosting(false)
    setFeed([])
    run.begin()
    setPhaseBoth('play')
    say('SLITHER!', 'drag to steer · hold boost')
    sfx.ready()
    haptic.light()
  }

  function die(killer: Worm | null) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    setPhaseBoth('dying')
    boostRef.current = false
    setBoosting(false)
    fx.flash('#ef4444', 0.3)
    fx.stop(0.12)
    fx.shake(14, 0.45)
    fx.slowmo(1, 0.3)
    sfx.boom(0.8)
    sfx.lose()
    haptic.error()
    pushFeed(killer ? `${killer.name} cut you off!` : w.deathCause || 'You hit the wall!', true)
    w.deathCause = ''
    window.setTimeout(() => {
      setPhaseBoth('over')
      const s = w.stats
      s.score = Math.round(w.peak + s.kills * 20 + s.titans * 150)
      const coins = Math.round(clamp(w.peak / 30 + s.kills * 3 + s.titans * 12 + w.bonusCoins, 3, 450))
      run.end({ score: s.score, cleared: w.peak >= 500, stats: { ...s }, coins }, revive)
    }, 1150)
  }

  function revive() {
    const w = world.current
    const p = safeSpot(w, 0)
    const mass = Math.max(w.startMass, Math.round(w.lastMass * 0.8))
    const me = makeWorm(w, { name: 'You', pers: 'glutton', x: p.x, y: p.y, mass, colors: PLAYER_SKIN, player: true, a: Math.atan2(-p.y, -p.x) })
    me.ghost = 3
    w.worms.push(me)
    w.me = me
    // Push nearby rivals away so the restart is fair.
    for (const o of w.worms) {
      if (o === me || !o.alive) continue
      if (Math.hypot(o.xs[0] - p.x, o.ys[0] - p.y) < 450) o.target = Math.atan2(o.ys[0] - p.y, o.xs[0] - p.x)
    }
    // Clear hazards around the respawn point.
    w.mines = w.mines.filter((m) => Math.hypot(m.x - p.x, m.y - p.y) > 450)
    w.vortices = w.vortices.filter((v) => Math.hypot(v.x - p.x, v.y - p.y) > v.pull + 350)
    fx.ring(p.x, p.y, { color: '#bef264', maxR: 140, life: 0.6, width: 6 })
    bannerQ.current = []
    lastSay.current = 0
    say('REVIVED!', 'ghost for 3 s')
    setPhaseBoth('play')
  }

  function wormColor(o: Worm, i: number) {
    return o.colors[Math.floor(i / 2) % o.colors.length]
  }

  function killWorm(w: World, o: Worm, by: Worm | null) {
    if (!o.alive) return
    o.alive = false
    const n = o.xs.length
    const drops = Math.min(70, Math.ceil(n / 2))
    const value = (o.mass * 0.6) / drops
    for (let k = 0; k < drops; k++) {
      const i = Math.floor((k / drops) * n)
      addPellet(w, o.xs[i] + rand(-o.r, o.r), o.ys[i] + rand(-o.r, o.r), value, wormColor(o, i), rand(28, 40), rand(-60, 60), rand(-60, 60))
    }
    const me = w.me
    const near = me ? Math.hypot(o.xs[0] - w.cam.x, o.ys[0] - w.cam.y) : 0
    if (near < 700) {
      fx.burst(o.xs[0], o.ys[0], { count: 26, color: [o.colors[0], o.colors[1] ?? '#fff', '#ffffff'], speed: 380, size: 4, shape: 'spark', gravity: 0 })
      fx.ring(o.xs[0], o.ys[0], { color: o.colors[0], maxR: 60 + o.r * 2, life: 0.4, width: 5 })
    }
    if (by) by.kills++
    if (o.player) {
      w.lastMass = o.mass
      w.deathX = o.xs[0]
      w.deathY = o.ys[0]
      w.me = null
      die(by)
      return
    }
    if (by && by.player) {
      w.stats.kills++
      w.combo = w.comboT > 0 ? w.combo + 1 : 1
      w.comboT = 4
      fx.stop(o.titan ? 0.15 : 0.06)
      fx.shake(o.titan ? 14 : 7, 0.3)
      fx.text(o.xs[0], o.ys[0] - 30, o.titan ? 'TITAN DOWN!' : w.combo > 1 ? `${w.combo}x CUT!` : 'CUT!', o.titan ? '#fde047' : '#bef264', 22 / w.cam.z)
      sfx.hit()
      if (w.combo > 1) sfx.combo()
      haptic.medium()
      pushFeed(`You cut off ${o.name}${o.titan ? ' (TITAN)' : ''}`, true)
      if (o.titan) {
        w.stats.titans++
        fx.slowmo(0.8, 0.35)
        fx.flash('#fde047', 0.25)
        sfx.boom(1)
        sfx.win()
        haptic.success()
        say('TITAN DOWN!', `${o.name} is food`)
        if (w.time - w.lastTrack > 30) {
          w.lastTrack = w.time
          void trackEvent('action_milestone', { game_id: 'slither', kind: 'boss', value: w.stats.titans })
        }
      }
      if (o.gold) serpentReward(w, o)
      run.update(w.stats)
    } else if (o.titan) {
      pushFeed(`Titan ${o.name} crashed${by ? ` into ${by.name}` : ''}`, false)
    } else if (o.gold) {
      pushFeed(`The Golden Serpent crashed${by ? ` into ${by.name}` : ''} — grab the gold!`, false)
    }
  }

  function serpentReward(w: World, o: Worm) {
    w.serpents++
    w.bonusCoins += 25
    const x = o.xs[0]
    const y = o.ys[0]
    // Jackpot ring of fat golden pellets + two free power orbs.
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2
      addPellet(w, x + Math.cos(a) * 30, y + Math.sin(a) * 30, 6, '#fde047', 30, Math.cos(a) * 260, Math.sin(a) * 260)
    }
    const kinds: PowKind[] = ['magnet', 'double', 'turbo', 'frost']
    for (let k = 0; k < 2; k++) w.orbs.push({ x: x + rand(-90, 90), y: y + rand(-90, 90), kind: kinds[Math.floor(Math.random() * kinds.length)], ph: 0, life: 25 })
    fx.flash('#fde047', 0.3)
    fx.slowmo(0.7, 0.35)
    fx.ring(x, y, { color: '#fde047', maxR: 220, life: 0.7, width: 8 })
    fx.burst(x, y, { count: 40, color: ['#fde047', '#fbbf24', '#ffffff'], speed: 460, size: 4, shape: 'spark', gravity: 0 })
    fx.text(x, y - 46, '+25 COINS', '#fde047', 24 / w.cam.z)
    sfx.win()
    window.setTimeout(() => sfx.power(), 380)
    haptic.success()
    say('JACKPOT!', 'serpent cut · +25 coins')
    if (w.time - w.lastTrack > 30) {
      w.lastTrack = w.time
      void trackEvent('action_milestone', { game_id: 'slither', kind: 'serpent', value: w.serpents })
    }
  }

  function spawnSerpent(w: World) {
    const me = w.me
    if (!me || !me.alive) return
    const s = spawnAi(w, { x: me.xs[0], y: me.ys[0] }, 'serpent', 280 + w.serpents * 60)
    s.name = 'Golden Serpent'
    s.colors = GOLD_SKIN
    s.escape = 32
    s.ghost = 1.5
    say('GOLDEN SERPENT!', 'cut it off before it flees')
    // Sting: rising chime over a low rumble.
    sfx.boom(0.35)
    window.setTimeout(() => sfx.mission(), 150)
    window.setTimeout(() => sfx.power(), 520)
    haptic.heavy()
    fx.flash('#fde047', 0.15)
  }

  function spawnMine(w: World) {
    const me = w.me
    if (!me || !me.alive) return
    for (let tries = 0; tries < 8; tries++) {
      // Prefer the region in front of the player so they see it arm.
      const a = me.a + rand(-1.3, 1.3)
      const d = rand(420, 840)
      const x = me.xs[0] + Math.cos(a) * d
      const y = me.ys[0] + Math.sin(a) * d
      if (Math.hypot(x, y) > R - 220) continue
      let ok = true
      for (const o of w.worms) if (Math.hypot(o.xs[0] - x, o.ys[0] - y) < 220) ok = false
      for (const m of w.mines) if (Math.hypot(m.x - x, m.y - y) < 260) ok = false
      if (!ok) continue
      w.mines.push({ x, y, r: 17, arm: MINE_ARM, life: rand(38, 48), ph: rand(0, 6) })
      return
    }
  }

  function spawnVortex(w: World) {
    const me = w.me
    if (!me || !me.alive) return
    for (let tries = 0; tries < 10; tries++) {
      const a = rand(0, Math.PI * 2)
      const d = rand(520, 780)
      const x = me.xs[0] + Math.cos(a) * d
      const y = me.ys[0] + Math.sin(a) * d
      if (Math.hypot(x, y) > R - 420) continue
      w.vortices.push({ x, y, warn: VORTEX_WARN, life: 13, pull: 360, core: 30, ph: 0 })
      sfx.whoosh()
      return
    }
  }

  function intro(w: World, key: string, text: string, sub: string) {
    if (w.seen[key]) return
    w.seen[key] = true
    say(text, sub)
    sfx.ready()
    haptic.medium()
  }

  /** Biome rotation, hazards and the Golden Serpent — all gated by run time. */
  function runContent(w: World, dt: number) {
    const me = w.me
    if (w.blend < 1) w.blend = Math.min(1, w.blend + dt / 2.5)
    if (w.time >= w.nextBiome) {
      w.nextBiome += BIOME_EVERY
      w.prevBiome = w.biome
      w.biome = (w.biome + 1) % BIOMES.length
      w.blend = 0
      const b = BIOMES[w.biome]
      say(b.name, b.sub)
      sfx.levelUp()
      haptic.medium()
    }
    if (w.time >= MINES_AT) {
      intro(w, 'mines', 'SPIKE MINES', 'red rings arm — steer clear')
      w.mineT -= dt
      const cap = Math.min(MAX_MINES, 3 + Math.floor((w.time - MINES_AT) / 60))
      if (w.mineT <= 0) {
        w.mineT = rand(5.5, 8.5)
        if (w.mines.length < cap) spawnMine(w)
      }
    }
    if (w.time >= VORTEX_AT) {
      w.vortexT -= dt
      const cap = w.time > 360 ? 2 : 1
      if (w.vortexT <= 0) {
        w.vortexT = rand(28, 38)
        if (w.vortices.length < cap) {
          spawnVortex(w)
          intro(w, 'vortex', 'VORTEX!', 'boost away from the core')
        }
      }
    }
    if (w.time >= w.serpentT && me && me.alive && !w.worms.some((o) => o.gold)) {
      w.serpentT = w.time + SERPENT_EVERY
      spawnSerpent(w)
    }
    for (const m of w.mines) {
      m.ph += dt
      if (m.arm > 0) m.arm = Math.max(0, m.arm - dt)
      m.life -= dt
    }
    w.mines = w.mines.filter((m) => m.life > 0)
    for (const v of w.vortices) {
      v.ph += dt
      if (v.warn > 0) {
        v.warn = Math.max(0, v.warn - dt)
        continue
      }
      v.life -= dt
      if (v.life <= 0) {
        // Collapse: scatter everything it swallowed back out as bonus food.
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2
          addPellet(w, v.x, v.y, 3, PEL_COLORS[k % PEL_COLORS.length], 25, Math.cos(a) * 320, Math.sin(a) * 320)
        }
        if (me && Math.hypot(me.xs[0] - v.x, me.ys[0] - v.y) < 900) {
          fx.ring(v.x, v.y, { color: '#c4b5fd', maxR: v.pull, life: 0.6, width: 6 })
          sfx.pop()
        }
        continue
      }
      const pk = Math.min(1, (13 - v.life) / 1.2) * Math.min(1, v.life / 0.8)
      for (const o of w.worms) {
        if (!o.alive) continue
        const dx = v.x - o.xs[0]
        const dy = v.y - o.ys[0]
        const d = Math.hypot(dx, dy)
        if (d > v.pull || d < 1) continue
        const f = (40 + 100 * (1 - d / v.pull)) * pk * dt
        o.xs[0] += (dx / d) * f - (dy / d) * f * 0.35
        o.ys[0] += (dy / d) * f + (dx / d) * f * 0.35
      }
      for (const p of w.pellets) {
        const dx = v.x - p.x
        if (dx > v.pull || dx < -v.pull) continue
        const dy = v.y - p.y
        if (dy > v.pull || dy < -v.pull) continue
        const d = Math.hypot(dx, dy)
        if (d > v.pull || d < v.core * 0.5) continue
        const f = 140 * pk * dt
        p.x += (dx / d) * f - (dy / d) * f * 0.6
        p.y += (dy / d) * f + (dx / d) * f * 0.6
      }
    }
    w.vortices = w.vortices.filter((v) => v.life > 0)
    // Golden Serpent escape timer.
    for (const o of w.worms) {
      if (!o.gold || !o.alive) continue
      o.escape -= dt
      if (Math.random() < dt * 8) fx.burst(o.xs[o.xs.length - 1], o.ys[o.ys.length - 1], { count: 1, color: ['#fde047', '#fffbeb'], speed: 40, size: 2.5, gravity: 0, life: 0.6 })
      if (o.escape <= 0) {
        o.alive = false
        fx.ring(o.xs[0], o.ys[0], { color: '#fde047', maxR: 90, life: 0.5, width: 5 })
        fx.burst(o.xs[0], o.ys[0], { count: 20, color: ['#fde047', '#ffffff'], speed: 260, gravity: 0, shape: 'spark' })
        pushFeed('The Golden Serpent escaped!', false)
        sfx.miss()
      }
    }
  }

  /** Hazard contacts: armed mines and vortex cores kill any non-ghost head. */
  function hazardHits(w: World) {
    for (const o of w.worms) {
      if (!o.alive || o.ghost > 0) continue
      const hx = o.xs[0]
      const hy = o.ys[0]
      for (const m of w.mines) {
        if (m.arm > 0 || m.life <= 0) continue
        const rr = m.r * 1.15 + o.r * 0.7
        if (Math.abs(m.x - hx) > rr || Math.abs(m.y - hy) > rr) continue
        if (Math.hypot(m.x - hx, m.y - hy) < rr) {
          m.life = 0
          fx.explode(m.x, m.y, 1.1, ['#fde047', '#f87171', '#dc2626', '#fff7ed'])
          sfx.boom(0.6)
          if (o.player) w.deathCause = 'A spike mine got you!'
          killWorm(w, o, null)
          break
        }
      }
      if (!o.alive) continue
      for (const v of w.vortices) {
        if (v.warn > 0) continue
        if (Math.hypot(v.x - hx, v.y - hy) < v.core + o.r * 0.4) {
          if (o.player) w.deathCause = 'The vortex swallowed you!'
          fx.ring(v.x, v.y, { color: '#f0abfc', maxR: 80, life: 0.4, width: 5 })
          killWorm(w, o, null)
          break
        }
      }
    }
    w.mines = w.mines.filter((m) => m.life > 0)
  }

  function think(w: World, o: Worm) {
    const hx = o.xs[0]
    const hy = o.ys[0]
    const dc = Math.hypot(hx, hy)
    o.boost = false
    if (dc > R - 260 - o.r * 2) {
      o.target = Math.atan2(-hy, -hx) + o.side * 0.3
      return
    }
    const ca = Math.cos(o.a)
    const sa = Math.sin(o.a)
    // The Golden Serpent is greedy and careless: it reads danger late.
    const look = o.gold ? 55 + o.r * 2 : 110 + o.r * 4
    let rx = 0
    let ry = 0
    let danger = 0
    for (const q of w.worms) {
      if (q === o || !q.alive || q.ghost > 0) continue
      if (hx + look < q.x0 || hx - look > q.x1 || hy + look < q.y0 || hy - look > q.y1) continue
      const step = q.xs.length > 60 ? 2 : 1
      for (let i = 0; i < q.xs.length; i += step) {
        const dx = q.xs[i] - hx
        const dy = q.ys[i] - hy
        const d2 = dx * dx + dy * dy
        if (d2 > look * look) continue
        const d = Math.sqrt(d2) + 0.01
        const ahead = (dx * ca + dy * sa) / d
        if (ahead < -0.3) continue
        const wgt = (1 - d / look) * (0.6 + ahead)
        rx -= (dx / d) * wgt
        ry -= (dy / d) * wgt
        danger += wgt
      }
    }
    // Hazards: mines (even while arming) and vortices read as walls of danger.
    for (const m of w.mines) {
      const dx = m.x - hx
      const dy = m.y - hy
      const lim = look + m.r
      if (dx > lim || dx < -lim || dy > lim || dy < -lim) continue
      const d = Math.hypot(dx, dy) + 0.01
      if (d > lim) continue
      const ahead = (dx * ca + dy * sa) / d
      if (ahead < -0.2) continue
      const wgt = (1 - d / lim) * (1 + ahead) * 1.6
      rx -= (dx / d) * wgt
      ry -= (dy / d) * wgt
      danger += wgt
    }
    for (const v of w.vortices) {
      const dx = v.x - hx
      const dy = v.y - hy
      const d = Math.hypot(dx, dy) + 0.01
      if (d > v.pull + 60) continue
      const wgt = 1.5 + (1 - d / (v.pull + 60)) * 3
      rx -= (dx / d) * wgt
      ry -= (dy / d) * wgt
      danger += wgt
      o.boost = d < v.pull * 0.6 && o.mass > 40
    }
    if (danger > 0.4) {
      o.target = Math.atan2(ry, rx)
      o.boost = o.boost || (danger > 2.2 && o.mass > 60 && Math.random() < w.aggr)
      return
    }
    const early = w.time < 22
    const me = w.me
    if (o.gold && me && me.alive) {
      // Golden Serpent: bolt away from the player's head, otherwise graze.
      const dx = me.xs[0] - hx
      const dy = me.ys[0] - hy
      const d2 = dx * dx + dy * dy
      if (d2 < 420 * 420) {
        o.target = Math.atan2(-dy, -dx) + o.side * 0.5
        o.boost = d2 < 200 * 200
        return
      }
    }
    // Hunting: aim ahead of a smaller worm's head to cut it off.
    if (o.pers === 'hunter' || o.pers === 'titan' || o.pers === 'darter') {
      if (Math.random() < 0.35 + w.aggr * 0.6) {
        let prey: Worm | null = null
        let best = o.pers === 'darter' ? 700 : 480
        for (const q of w.worms) {
          if (q === o || !q.alive || q.ghost > 0) continue
          if (q.player && early) continue
          if (q.mass > o.mass * 0.9 && !o.titan) continue
          const d = Math.hypot(q.xs[0] - hx, q.ys[0] - hy) - (q.player ? 120 * w.aggr : 0)
          if (d < best) {
            best = d
            prey = q
          }
        }
        if (o.pers === 'darter' && me && me.alive && me.ghost <= 0) prey = me
        if (prey) {
          const lead = 70 + prey.r * 2
          const tx = prey.xs[0] + Math.cos(prey.a) * lead
          const ty = prey.ys[0] + Math.sin(prey.a) * lead
          o.target = Math.atan2(ty - hy, tx - hx)
          const d = Math.hypot(tx - hx, ty - hy)
          o.boost = d < 280 && o.mass > 45 && Math.random() < 0.3 + w.aggr * 0.5
          return
        }
      }
    }
    if (o.pers === 'coward') {
      for (const q of w.worms) {
        if (q === o || !q.alive || q.mass < o.mass * 1.3) continue
        const dx = q.xs[0] - hx
        const dy = q.ys[0] - hy
        if (dx * dx + dy * dy < 320 * 320) {
          o.target = Math.atan2(-dy, -dx)
          o.boost = o.mass > 50 && Math.random() < 0.3
          return
        }
      }
    }
    if (o.pers === 'encircler' && !early) {
      for (const q of w.worms) {
        if (q === o || !q.alive || q.ghost > 0 || q.mass * 2.5 > o.mass) continue
        const dx = q.xs[0] - hx
        const dy = q.ys[0] - hy
        if (dx * dx + dy * dy < 380 * 380) {
          o.target = Math.atan2(dy, dx) + (Math.PI / 2) * o.side * 0.85
          return
        }
      }
    }
    if (early && me && me.alive) {
      const dx = me.xs[0] - hx
      const dy = me.ys[0] - hy
      if (dx * dx + dy * dy < 240 * 240) {
        o.target = Math.atan2(-dy, -dx)
        return
      }
    }
    // Food: best value per distance nearby.
    let bx = 0
    let by = 0
    let bs = 0
    for (const p of w.pellets) {
      const dx = p.x - hx
      if (dx > 380 || dx < -380) continue
      const dy = p.y - hy
      if (dy > 380 || dy < -380) continue
      const s = p.v / (Math.abs(dx) + Math.abs(dy) + 40)
      if (s > bs) {
        bs = s
        bx = p.x
        by = p.y
      }
    }
    if (bs > 0) o.target = Math.atan2(by - hy, bx - hx)
    else o.target += rand(-0.7, 0.7)
  }

  function moveWorm(w: World, o: Worm, dt: number) {
    const frozen = !o.player && w.pow.frost > 0
    const turn = (4.8 / (1 + (o.r - 9) / 20)) * (o.boost ? 0.85 : 1) * (frozen ? 0.6 : 1)
    const d = angDiff(o.a, o.target)
    o.a += clamp(d, -turn * dt, turn * dt)
    const canBoost = o.boost && o.mass > 22
    const turbo = o.player && w.pow.turbo > 0
    const spd = BASE_SPEED * (o.pers === 'darter' ? 1.15 : 1) * (o.titan ? 0.88 : 1) * (o.gold ? 1.05 : 1) * (canBoost || turbo ? 1.95 : 1) * (frozen ? 0.5 : 1)
    o.xs[0] += Math.cos(o.a) * spd * dt
    o.ys[0] += Math.sin(o.a) * spd * dt
    if (canBoost && !turbo && !o.gold) {
      const lean = o.player ? 1 - run.level('turbo') * 0.15 : 1
      o.shed += dt * (4 + o.mass * 0.016) * lean
      if (o.shed >= 1.6) {
        const tail = o.xs.length - 1
        addPellet(w, o.xs[tail], o.ys[tail], o.shed * 0.75, wormColor(o, tail), 30)
        o.mass -= o.shed
        o.shed = 0
      }
    }
    const n = segCount(o.mass)
    while (o.xs.length < n) {
      o.xs.push(o.xs[o.xs.length - 1])
      o.ys.push(o.ys[o.ys.length - 1])
    }
    if (o.xs.length > n) {
      o.xs.length = n
      o.ys.length = n
    }
    o.r = approach(o.r, radiusFor(o.mass), 3, dt)
    const sp = o.r * 0.5
    let x0 = o.xs[0]
    let x1 = x0
    let y0 = o.ys[0]
    let y1 = y0
    for (let i = 1; i < n; i++) {
      const dx = o.xs[i] - o.xs[i - 1]
      const dy = o.ys[i] - o.ys[i - 1]
      const dd = Math.hypot(dx, dy)
      if (dd > sp) {
        o.xs[i] = o.xs[i - 1] + (dx / dd) * sp
        o.ys[i] = o.ys[i - 1] + (dy / dd) * sp
      }
      const x = o.xs[i]
      const y = o.ys[i]
      if (x < x0) x0 = x
      else if (x > x1) x1 = x
      if (y < y0) y0 = y
      else if (y > y1) y1 = y
    }
    o.x0 = x0 - o.r
    o.x1 = x1 + o.r
    o.y0 = y0 - o.r
    o.y1 = y1 + o.r
    if (o.ghost > 0) o.ghost -= dt
    o.blink -= dt
    if (o.blink < -0.14) o.blink = rand(2, 6)
  }

  function eat(w: World, dt: number) {
    const me = w.me
    const magLvl = run.level('magnet')
    for (const o of w.worms) {
      if (!o.alive) continue
      const hx = o.xs[0]
      const hy = o.ys[0]
      let mr = o.r * 2.2 + 34
      if (o.player) mr *= (1 + magLvl * 0.3) * (w.pow.magnet > 0 ? 2.6 : 1)
      const er = o.r + 5
      const mr2 = mr * mr
      const er2 = er * er
      const pull = o.player && w.pow.magnet > 0 ? 520 : 330
      for (const p of w.pellets) {
        if (p.v <= 0) continue
        const dx = hx - p.x
        if (dx > mr || dx < -mr) continue
        const dy = hy - p.y
        if (dy > mr || dy < -mr) continue
        const d2 = dx * dx + dy * dy
        if (d2 < er2) {
          const gain = p.v * (o.player && w.pow.double > 0 ? 2 : 1)
          o.mass += gain
          if (o.player) {
            w.stats.food++
            if (p.v >= 3 && Math.random() < 0.5) sfx.score(Math.min(10, Math.floor(p.v)))
            else if (Math.random() < 0.2) sfx.pop()
          }
          p.v = 0
        } else if (d2 < mr2) {
          const d = Math.sqrt(d2)
          const k = Math.min(d, pull * dt) / d
          p.x += dx * k
          p.y += dy * k
        }
      }
    }
    let j = 0
    for (let i = 0; i < w.pellets.length; i++) {
      const p = w.pellets[i]
      if (p.v > 0 && p.life !== 0) w.pellets[j++] = p
    }
    w.pellets.length = j
    if (me && me.alive) {
      for (const orb of w.orbs) {
        if (orb.life <= 0) continue
        if (Math.hypot(orb.x - me.xs[0], orb.y - me.ys[0]) < me.r + 22) {
          orb.life = 0
          const info = POW[orb.kind]
          w.pow[orb.kind] = info.dur
          if (orb.kind === 'ghost') me.ghost = Math.max(me.ghost, info.dur)
          if (orb.kind === 'frost') {
            fx.flash('#bfdbfe', 0.2)
            fx.ring(orb.x, orb.y, { color: '#e0f2fe', maxR: 420, life: 0.7, width: 4 })
            if (!w.seen.frost) {
              w.seen.frost = true
              say('FREEZE!', 'rivals crawl at half speed')
            }
          }
          fx.ring(orb.x, orb.y, { color: info.color, maxR: 90, life: 0.45, width: 5 })
          fx.burst(orb.x, orb.y, { count: 18, color: [info.color, '#ffffff'], speed: 260, gravity: 0, shape: 'spark' })
          fx.text(orb.x, orb.y - 26, info.label, info.color, 20 / w.cam.z)
          sfx.power()
          haptic.medium()
        }
      }
      w.orbs = w.orbs.filter((o) => o.life > 0)
    }
  }

  function collide(w: World) {
    const me = w.me
    for (const o of w.worms) {
      if (!o.alive) continue
      const hx = o.xs[0]
      const hy = o.ys[0]
      if (Math.hypot(hx, hy) > R - o.r * 0.6) {
        killWorm(w, o, null)
        continue
      }
      if (o.ghost > 0) continue
      let close = 1e9
      for (const q of w.worms) {
        if (q === o || !q.alive || q.ghost > 0) continue
        if (hx + o.r < q.x0 || hx - o.r > q.x1 || hy + o.r < q.y0 || hy - o.r > q.y1) {
          if (!o.player) continue
          if (hx + o.r + 30 < q.x0 || hx - o.r - 30 > q.x1 || hy + o.r + 30 < q.y0 || hy - o.r - 30 > q.y1) continue
        }
        const rr = o.r * 0.75 + q.r * 0.8
        let hit = false
        for (let i = 0; i < q.xs.length; i++) {
          const dx = q.xs[i] - hx
          const dy = q.ys[i] - hy
          const d2 = dx * dx + dy * dy
          if (d2 < rr * rr) {
            hit = true
            break
          }
          if (o.player && d2 < (rr + 30) * (rr + 30)) close = Math.min(close, Math.sqrt(d2) - rr)
        }
        if (hit) {
          killWorm(w, o, q)
          break
        }
      }
      if (o === me && o.alive && close < 14 && w.closeT <= 0) {
        w.closeT = 2.5
        fx.text(hx, hy - 34, 'CLOSE CALL!', '#7dd3fc', 16 / w.cam.z)
        sfx.whoosh()
        haptic.light()
        o.mass += 4
      }
    }
    hazardHits(w)
    w.worms = w.worms.filter((o) => o.alive)
  }

  function runEvents(w: World) {
    if (w.time < w.nextEvent) return
    const n = w.eventIdx++
    const titanNo = w.stats.titans + w.worms.filter((o) => o.titan).length
    let kind: string
    if (n === 0) kind = 'hunters'
    else if (n === 1) kind = 'titan'
    else if (n === 2) kind = 'frenzy'
    else if (n === 3) kind = 'swarm'
    else kind = ['titan', 'frenzy', 'swarm', 'storm'][(n - 4) % 4]
    w.nextEvent = w.time + (n < 4 ? 30 : 40)
    w.aggr = Math.min(1, w.aggr + 0.1)
    w.aiCap = Math.min(15, w.aiCap + 1)
    const me = w.me
    const near = me && me.alive ? { x: me.xs[0], y: me.ys[0] } : undefined
    if (kind === 'hunters') {
      w.hunters = true
      for (const o of w.worms) if (!o.player && o.pers === 'glutton' && Math.random() < 0.4) o.pers = 'hunter'
      say('HUNTERS AWAKE', 'rivals will chase you now')
      sfx.ready()
    } else if (kind === 'titan') {
      const t = spawnTitan(w, titanNo)
      say(`TITAN: ${t.name}`, 'make it crash into you')
      sfx.boom(0.7)
      fx.shake(6, 0.4)
      haptic.heavy()
    } else if (kind === 'frenzy') {
      w.frenzy = 14
      say('FEEDING FRENZY', 'golden pellets everywhere')
      sfx.combo()
    } else if (kind === 'swarm') {
      for (let i = 0; i < 4; i++) {
        const d = spawnAi(w, near, 'darter', rand(26, 40))
        d.colors = ['#fb7185', '#fb7185', '#7f1d1d']
        d.name = `Darter ${i + 1}`
      }
      say('DARTER SWARM', 'small, fast and hungry')
      sfx.whoosh()
    } else {
      for (let i = 0; i < 4; i++) w.orbs.push({ ...(near ? { x: near.x + rand(-500, 500), y: near.y + rand(-500, 500) } : randomInArena(R - 200)), kind: (['magnet', 'turbo', 'double', 'ghost'] as PowKind[])[i], ph: 0, life: 30 })
      say('POWER STORM', 'orbs dropped nearby')
      sfx.power()
    }
  }

  function step(w: World, dt: number, ph: Phase) {
    w.time += dt
    const me = w.me
    // Player steering.
    if (me && me.alive && ph === 'play') {
      const v = stick.vec()
      let kx = 0
      let ky = 0
      const k = keys.current
      if (k.has('ArrowLeft') || k.has('a')) kx -= 1
      if (k.has('ArrowRight') || k.has('d')) kx += 1
      if (k.has('ArrowUp') || k.has('w')) ky -= 1
      if (k.has('ArrowDown') || k.has('s')) ky += 1
      if (v.mag > 0.2) me.target = Math.atan2(v.y, v.x)
      else if (kx || ky) me.target = Math.atan2(ky, kx)
      me.boost = boostRef.current || k.has(' ')
    }
    for (const o of w.worms) {
      if (o.player) continue
      o.think -= dt
      if (o.think <= 0) {
        o.think = 0.12 + Math.random() * 0.06
        think(w, o)
      }
    }
    for (const o of w.worms) moveWorm(w, o, dt)
    eat(w, dt)
    collide(w)

    // Pellet drift / fade, ambient respawn.
    let normal = 0
    for (const p of w.pellets) {
      p.ph += dt * 3
      if (p.vx || p.vy) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 1 - Math.min(1, dt * 3)
        p.vy *= 1 - Math.min(1, dt * 3)
        if (Math.abs(p.vx) + Math.abs(p.vy) < 2) p.vx = p.vy = 0
      }
      if (p.life > 0) {
        p.life = Math.max(0, p.life - dt)
      } else normal++
    }
    if (normal < FOOD_TARGET) {
      for (let i = 0; i < 8; i++) {
        const p = randomInArena(R - 40)
        addPellet(w, p.x, p.y, Math.random() < 0.85 ? 1 : 2, PEL_COLORS[Math.floor(Math.random() * PEL_COLORS.length)])
      }
    }
    if (w.frenzy > 0 && me && me.alive) {
      w.frenzy -= dt
      if (Math.random() < dt * 30) {
        const a = rand(0, Math.PI * 2)
        const d = rand(200, 650)
        const x = me.xs[0] + Math.cos(a) * d
        const y = me.ys[0] + Math.sin(a) * d
        if (Math.hypot(x, y) < R - 60) addPellet(w, x, y, 5, '#fde047', 20)
      }
    }

    // Rivals respawn up to the cap.
    const ai = w.worms.filter((o) => !o.player).length
    w.spawnTimer -= dt
    if (ai < w.aiCap && w.spawnTimer <= 0) {
      w.spawnTimer = 1.6
      spawnAi(w)
    }

    if (ph === 'idle') return

    // Power orbs.
    w.orbTimer -= dt
    if (w.orbTimer <= 0 && me && me.alive) {
      w.orbTimer = rand(12, 18)
      if (w.orbs.length < 3) {
        const a = rand(0, Math.PI * 2)
        const d = rand(300, 650)
        const x = me.xs[0] + Math.cos(a) * d
        const y = me.ys[0] + Math.sin(a) * d
        if (Math.hypot(x, y) < R - 150) {
          const kinds: PowKind[] = w.time >= FROST_AT ? ['magnet', 'turbo', 'double', 'ghost', 'frost'] : ['magnet', 'turbo', 'double', 'ghost']
          w.orbs.push({ x, y, kind: kinds[Math.floor(Math.random() * kinds.length)], ph: 0, life: 40 })
        }
      }
    }
    for (const orb of w.orbs) {
      orb.ph += dt
      orb.life -= dt
    }
    w.orbs = w.orbs.filter((o) => o.life > 0)
    for (const k of Object.keys(w.pow) as PowKind[]) w.pow[k] = Math.max(0, w.pow[k] - dt)
    if (w.comboT > 0) w.comboT -= dt
    if (w.closeT > 0) w.closeT -= dt

    if (ph === 'play' && me && me.alive) runContent(w, dt)
    if (ph === 'play' && me && me.alive) {
      runEvents(w)
      const len = Math.round(me.mass)
      if (len > w.peak) w.peak = len
      w.stats.length = Math.round(w.peak)
      const next = MILESTONES[w.milestone]
      if (next && w.peak >= next) {
        w.milestone++
        say(`LENGTH ${next}!`, next >= 1000 ? 'colossal' : 'keep growing')
        sfx.levelUp()
        haptic.success()
        fx.ring(me.xs[0], me.ys[0], { color: '#bef264', maxR: 160, life: 0.6, width: 6 })
        if (next >= 500 && w.time - w.lastTrack > 30) {
          w.lastTrack = w.time
          void trackEvent('action_milestone', { game_id: 'slither', kind: 'length', value: next })
        }
      }
    }

    w.hudT -= dt
    if (w.hudT <= 0) {
      w.hudT = 0.25
      flushBanners()
      const sorted = [...w.worms].sort((a, b) => b.mass - a.mass)
      const rank = me ? sorted.indexOf(me) + 1 : 0
      if (me && rank === 1 && sorted.length >= 6 && w.stats.top === 0 && ph === 'play') {
        w.stats.top = 1
        say('#1 ON THE BOARD!', 'everyone wants your head')
        sfx.win()
        haptic.success()
      }
      w.stats.score = Math.round(w.peak + w.stats.kills * 20 + w.stats.titans * 150)
      run.update(w.stats)
      const rows: BoardRow[] = sorted.slice(0, 5).map((o) => ({ name: o.name, len: Math.round(o.mass), me: o.player, titan: o.titan }))
      setBoard(rows)
      setHud({
        len: me ? Math.round(me.mass) : 0,
        rank,
        alive: sorted.length,
        kills: w.stats.kills,
        pows: (Object.keys(w.pow) as PowKind[]).filter((k) => w.pow[k] > 0).map((k) => ({ kind: k, t: Math.ceil(w.pow[k]) })),
      })
    }
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
  function boostDown(e: PointerEvent<HTMLButtonElement>) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    boostRef.current = true
    setBoosting(true)
    sfx.whoosh()
    haptic.light()
  }
  function boostUp(e: PointerEvent<HTMLButtonElement>) {
    e.stopPropagation()
    boostRef.current = false
    setBoosting(false)
  }

  useEffect(() => {
    // Dev-only handle for automated play tests.
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__slither = world
    // Dev-only: jump ahead in run time (keeps the player ghosted so screenshots survive).
    win.__en3skip = (seconds: number) => {
      const w = world.current
      w.time += seconds
      if (w.me) w.me.ghost = Math.max(w.me.ghost, 6)
    }
    win.__en3force = (kind: string) => {
      const w = world.current
      if (kind === 'mine') {
        spawnMine(w)
        const m = w.mines[w.mines.length - 1]
        if (m && w.me) {
          m.x = w.me.xs[0] + Math.cos(w.me.a) * 160
          m.y = w.me.ys[0] + Math.sin(w.me.a) * 160
        }
      } else if (kind === 'vortex') spawnVortex(w)
      else if (kind === 'serpent') spawnSerpent(w)
      else if (kind === 'cutserpent') {
        const s = w.worms.find((o) => o.gold)
        if (s) killWorm(w, s, w.me)
      }
      else if (kind === 'frost') w.pow.frost = POW.frost.dur
      else if (kind === 'biome') w.nextBiome = w.time
    }
  }, [])

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (phaseRef.current !== 'play') return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (k === ' ' || k.startsWith('Arrow')) e.preventDefault()
      keys.current.add(k)
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

  // ── Drawing ─────────────────────────────────────────────

  function drawWorm(ctx: CanvasRenderingContext2D, o: Worm, t: number) {
    const n = o.xs.length
    const ghost = o.ghost > 0
    if (ghost) ctx.globalAlpha = 0.35 + Math.sin(t * 18) * 0.15
    // Drop shadow.
    if (!ghost) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.beginPath()
      for (let i = n - 1; i >= 0; i -= 2) {
        const s = o.r * taper(i, n)
        ctx.moveTo(o.xs[i] + 4 + s, o.ys[i] + 6)
        ctx.arc(o.xs[i] + 4, o.ys[i] + 6, s, 0, Math.PI * 2)
      }
      ctx.fill()
    }
    const boosting = o.boost && o.mass > 22
    if (boosting || (o.player && world.current.pow.turbo > 0)) {
      const a = ctx.globalAlpha
      ctx.globalAlpha = a * (0.5 + Math.sin(t * 20) * 0.2)
      const hs = halo(o.colors[0])
      for (let i = n - 1; i >= 0; i -= 2) {
        const s = o.r * 2.3 * taper(i, n)
        ctx.drawImage(hs, o.xs[i] - s, o.ys[i] - s, s * 2, s * 2)
      }
      ctx.globalAlpha = a
    }
    for (let i = n - 1; i >= 0; i--) {
      const s = o.r * taper(i, n) * (i === 0 ? 1.08 : 1)
      ctx.drawImage(ball(wormColor(o, i)), o.xs[i] - s, o.ys[i] - s, s * 2, s * 2)
    }
    if (!o.player && world.current.pow.frost > 0) {
      // Frosted rivals: icy glaze over the body.
      const a = ctx.globalAlpha
      ctx.globalAlpha = a * 0.45
      const ice = ball('#dbeafe')
      for (let i = n - 1; i >= 0; i -= 3) {
        const s = o.r * taper(i, n) * 0.8
        ctx.drawImage(ice, o.xs[i] - s, o.ys[i] - s, s * 2, s * 2)
      }
      ctx.globalAlpha = a
    }
    // Eyes.
    const hx = o.xs[0]
    const hy = o.ys[0]
    const ca = Math.cos(o.a)
    const sa = Math.sin(o.a)
    const er = o.r * 0.36
    const look = o.target
    const blink = o.blink < 0 ? 0.15 : 1
    for (const side of [-1, 1]) {
      const ex = hx + ca * o.r * 0.38 - sa * o.r * 0.48 * side
      const ey = hy + sa * o.r * 0.38 + ca * o.r * 0.48 * side
      ctx.save()
      ctx.translate(ex, ey)
      ctx.rotate(o.a)
      ctx.scale(1, blink)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(0, 0, er, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.rotate(-o.a)
      ctx.fillStyle = o.titan ? '#b91c1c' : '#0f172a'
      ctx.beginPath()
      ctx.arc(Math.cos(look) * er * 0.42, Math.sin(look) * er * 0.42, er * 0.55, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(Math.cos(look) * er * 0.42 - er * 0.2, Math.sin(look) * er * 0.42 - er * 0.2, er * 0.18, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    if (o.titan) {
      // Crown.
      const cx = hx - ca * o.r * 0.2
      const cy = hy - sa * o.r * 0.2
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(o.a + Math.PI / 2)
      const s = o.r * 0.9
      ctx.fillStyle = '#fbbf24'
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-s, s * 0.35)
      ctx.lineTo(-s, -s * 0.35)
      ctx.lineTo(-s * 0.5, s * 0.05)
      ctx.lineTo(0, -s * 0.6)
      ctx.lineTo(s * 0.5, s * 0.05)
      ctx.lineTo(s, -s * 0.35)
      ctx.lineTo(s, s * 0.35)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.14, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    ctx.globalAlpha = 1
  }

  function taper(i: number, n: number) {
    const k = i / n
    return k < 0.75 ? 1 : 1 - (k - 0.75) * 1.6
  }

  function drawOrb(ctx: CanvasRenderingContext2D, o: Orb) {
    const info = POW[o.kind]
    const bob = Math.sin(o.ph * 3) * 4
    const x = o.x
    const y = o.y + bob
    const blinkOut = o.life < 5 && Math.floor(o.ph * 8) % 2 === 0
    if (blinkOut) ctx.globalAlpha = 0.4
    ctx.drawImage(halo(info.color), x - 40, y - 40, 80, 80)
    const g = ctx.createRadialGradient(x - 5, y - 6, 2, x, y, 16)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.4, info.color)
    g.addColorStop(1, shade(info.color, -0.5))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, 20 + Math.sin(o.ph * 5) * 2, o.ph, o.ph + Math.PI * 1.3)
    ctx.stroke()
    ctx.fillStyle = '#0f172a'
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    if (o.kind === 'magnet') {
      ctx.arc(x, y - 1, 6, Math.PI, 0, true)
      ctx.moveTo(x - 6, y - 1)
      ctx.lineTo(x - 6, y - 6)
      ctx.moveTo(x + 6, y - 1)
      ctx.lineTo(x + 6, y - 6)
      ctx.stroke()
    } else if (o.kind === 'turbo') {
      ctx.moveTo(x + 2, y - 9)
      ctx.lineTo(x - 5, y + 1)
      ctx.lineTo(x, y + 1)
      ctx.lineTo(x - 2, y + 9)
      ctx.lineTo(x + 5, y - 1)
      ctx.lineTo(x, y - 1)
      ctx.closePath()
      ctx.fill()
    } else if (o.kind === 'double') {
      ctx.arc(x - 3, y, 5, 0, Math.PI * 2)
      ctx.moveTo(x + 8, y)
      ctx.arc(x + 3, y, 5, 0, Math.PI * 2)
      ctx.lineWidth = 2.4
      ctx.stroke()
    } else if (o.kind === 'frost') {
      ctx.lineWidth = 2
      snowflake(ctx, x, y, 8)
    } else {
      ctx.moveTo(x - 6, y + 7)
      ctx.lineTo(x - 6, y - 2)
      ctx.arc(x, y - 2, 6, Math.PI, 0)
      ctx.lineTo(x + 6, y + 7)
      ctx.lineTo(x + 3, y + 4)
      ctx.lineTo(x, y + 7)
      ctx.lineTo(x - 3, y + 4)
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const ph = phaseRef.current
    if (ph === 'idle' && world.current.me === null && world.current.worms.length === 0) world.current = buildWorld(false)
    const w = world.current
    const dt = fx.step(raw)
    if (dt > 0) step(w, dt, ph)

    // Camera.
    const me = w.me
    let focus: Worm | null = me
    if (!focus && ph === 'idle') {
      focus = w.worms.reduce<Worm | null>((b, o) => (!b || o.mass > b.mass ? o : b), null)
    }
    const scr = Math.min(W, H) / 390
    const tx = focus ? focus.xs[0] : w.deathX
    const ty = focus ? focus.ys[0] : w.deathY
    const zt = (focus ? clamp(1.15 - (focus.r - 12) * 0.022, 0.5, 1.15) : w.cam.z) * scr * (ph === 'idle' ? 0.8 : 1)
    w.cam.x = approach(w.cam.x, tx, 7, raw)
    w.cam.y = approach(w.cam.y, ty, 7, raw)
    w.cam.z = approach(w.cam.z, zt, 1.5, raw)
    const z = w.cam.z

    // Far layer: current biome over the previous one while blending.
    if (stars.current.length === 0) {
      for (let i = 0; i < 70; i++) stars.current.push({ x: Math.random(), y: Math.random(), s: rand(0.6, 1.8), d: rand(0.05, 0.2) })
    }
    const bNow = BIOMES[w.biome]
    const bOld = BIOMES[w.prevBiome]
    const blend = w.blend
    if (blend < 1) drawFar(ctx, bOld, W, H, w.cam.x, w.cam.y, 1, stars.current)
    drawFar(ctx, bNow, W, H, w.cam.x, w.cam.y, blend < 1 ? blend : 1, stars.current)
    stepMotes(motes, bNow.moteKind, raw)

    fx.applyShake(ctx)
    ctx.translate(W / 2, H / 2)
    ctx.scale(z, z)
    ctx.translate(-w.cam.x, -w.cam.y)
    const vx0 = w.cam.x - W / 2 / z - 60
    const vx1 = w.cam.x + W / 2 / z + 60
    const vy0 = w.cam.y - H / 2 / z - 60
    const vy1 = w.cam.y + H / 2 / z + 60

    // Outside the arena: danger tint, then the biome floor (cross-faded).
    ctx.fillStyle = blend < 1 ? bOld.outside : bNow.outside
    ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0)
    const floor = (idx: number, a: number) => {
      if (!floorPats.has(idx)) floorPats.set(idx, hexPattern(ctx, BIOMES[idx].floor))
      ctx.globalAlpha = a
      ctx.fillStyle = floorPats.get(idx) ?? BIOMES[idx].floor.base
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    if (blend < 1) {
      floor(w.prevBiome, 1)
      drawDecor(ctx, decor, bOld, 1 - blend, vx0, vx1, vy0, vy1)
      if (blend > 0) floor(w.biome, blend)
    } else floor(w.biome, 1)
    drawDecor(ctx, decor, bNow, blend, vx0, vx1, vy0, vy1)
    // Hazards sit on the floor, under food and worms.
    for (const v of w.vortices) if (v.x + v.pull > vx0 && v.x - v.pull < vx1 && v.y + v.pull > vy0 && v.y - v.pull < vy1) drawVortex(ctx, v, t)
    for (const m of w.mines) if (m.x > vx0 && m.x < vx1 && m.y > vy0 && m.y < vy1) drawMine(ctx, m, t)
    const edge = Math.hypot(w.cam.x, w.cam.y) + Math.max(W, H) / z > R
    if (edge) {
      ctx.strokeStyle = 'rgba(239,68,68,0.18)'
      ctx.lineWidth = 60
      ctx.beginPath()
      ctx.arc(0, 0, R - 30, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 8 + Math.sin(t * 4) * 2
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Pellets.
    for (const p of w.pellets) {
      if (p.x < vx0 || p.x > vx1 || p.y < vy0 || p.y > vy1) continue
      const s = p.r * (2.4 + Math.sin(p.ph) * 0.35)
      if (p.life > 0 && p.life < 4) ctx.globalAlpha = p.life / 4
      ctx.drawImage(halo(p.c), p.x - s, p.y - s, s * 2, s * 2)
      ctx.globalAlpha = 1
    }
    for (const o of w.orbs) if (o.x > vx0 && o.x < vx1 && o.y > vy0 && o.y < vy1) drawOrb(ctx, o)

    // Worms (player last so it sits on top).
    for (const o of w.worms) {
      if (o.player || o.x1 < vx0 || o.x0 > vx1 || o.y1 < vy0 || o.y0 > vy1) continue
      drawWorm(ctx, o, t)
    }
    if (me) drawWorm(ctx, me, t)
    // Name tags.
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${Math.round(12 / z)}px 'Plus Jakarta Sans', system-ui, sans-serif`
    for (const o of w.worms) {
      if (o.player || o.xs[0] < vx0 || o.xs[0] > vx1 || o.ys[0] < vy0 || o.ys[0] > vy1) continue
      ctx.fillStyle = o.titan ? '#fca5a5' : o.gold ? '#fde047' : 'rgba(255,255,255,0.7)'
      ctx.fillText(o.titan ? `TITAN ${o.name}` : o.gold ? `${o.name} ${Math.ceil(o.escape)}s` : o.name, o.xs[0], o.ys[0] - o.r - 16 / z)
    }

    fx.draw(ctx)
    ctx.restore()
    if (blend < 1) drawAtmos(ctx, bOld, W, H, w.cam.x, t, (1 - blend) * 0.7)
    drawAtmos(ctx, bNow, W, H, w.cam.x, t, (blend < 1 ? blend : 1) * 0.7)
    drawMotes(ctx, motes, bNow, W, H, w.cam.x, w.cam.y, blend < 1 ? blend : 1)
    if (blend < 1) drawMotes(ctx, motes, bOld, W, H, w.cam.x, w.cam.y, 1 - blend)
    // Freeze tint around the screen edge.
    if (w.pow.frost > 0 && ph === 'play') {
      const k = Math.min(1, w.pow.frost / 1.5)
      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.72)
      g.addColorStop(0, 'rgba(191,219,254,0)')
      g.addColorStop(1, `rgba(191,219,254,${0.3 * k})`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
    // Off-screen pointer to the Golden Serpent.
    const gold = ph === 'play' ? w.worms.find((o) => o.gold) : undefined
    if (gold) {
      const sx = (gold.xs[0] - w.cam.x) * z + W / 2
      const sy = (gold.ys[0] - w.cam.y) * z + H / 2
      if (sx < 0 || sx > W || sy < 0 || sy > H) {
        const a = Math.atan2(sy - H / 2, sx - W / 2)
        const ex = clamp(W / 2 + Math.cos(a) * W, 26, W - 26)
        const ey = clamp(H / 2 + Math.sin(a) * H, 130, H - 100)
        ctx.save()
        ctx.translate(ex, ey)
        ctx.rotate(a)
        ctx.globalAlpha = 0.75 + Math.sin(t * 8) * 0.25
        ctx.fillStyle = '#fde047'
        ctx.strokeStyle = '#78350f'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(14, 0)
        ctx.lineTo(-8, -10)
        ctx.lineTo(-3, 0)
        ctx.lineTo(-8, 10)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.restore()
        ctx.globalAlpha = 1
      }
    }

    // Minimap.
    if (ph !== 'idle') {
      const mr = 34
      const mx = 12 + mr
      const my = H - 12 - mr
      ctx.fillStyle = 'rgba(2,6,23,0.6)'
      ctx.beginPath()
      ctx.arc(mx, my, mr, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(239,68,68,0.7)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      for (const o of w.worms) {
        if (!o.titan && !o.player && !o.gold && o.mass < 300) continue
        ctx.fillStyle = o.player ? '#bef264' : o.titan ? '#ef4444' : o.gold ? '#fde047' : 'rgba(255,255,255,0.45)'
        const rr = o.player ? 3 : o.titan || o.gold ? 3.5 : 2
        ctx.beginPath()
        ctx.arc(mx + (o.xs[0] / R) * mr, my + (o.ys[0] / R) * mr, rr, 0, Math.PI * 2)
        ctx.fill()
      }
      for (const o of w.orbs) {
        ctx.fillStyle = POW[o.kind].color
        ctx.fillRect(mx + (o.x / R) * mr - 1.5, my + (o.y / R) * mr - 1.5, 3, 3)
      }
      for (const v of w.vortices) {
        ctx.strokeStyle = v.warn > 0 ? '#f87171' : '#c4b5fd'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(mx + (v.x / R) * mr, my + (v.y / R) * mr, (v.pull / R) * mr, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    // Wall proximity warning.
    if (me && ph === 'play') {
      const near = Math.hypot(me.xs[0], me.ys[0]) - (R - 380)
      if (near > 0) {
        const k = Math.min(1, near / 300) * (0.6 + Math.sin(t * 10) * 0.4)
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7)
        g.addColorStop(0, 'rgba(239,68,68,0)')
        g.addColorStop(1, `rgba(239,68,68,${0.45 * k})`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
      }
    }
    stick.draw(ctx)
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const playing = phase === 'play' || phase === 'dying'

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.len}</div>
                <div className="action-hud__small">
                  Rank #{hud.rank} of {hud.alive} · {hud.kills} cuts
                </div>
                <div className="slither-pows">
                  {hud.pows.map((p) => (
                    <span key={p.kind} style={{ background: POW[p.kind].color }}>
                      {POW[p.kind].label} {p.t}
                    </span>
                  ))}
                </div>
              </div>
              <ol className="slither-board">
                {board.map((r, i) => (
                  <li key={`${r.name}-${i}`} className={r.me ? 'is-me' : r.titan ? 'is-titan' : ''}>
                    <span>{i + 1}.</span> {r.name} <b>{r.len}</b>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {playing && (
            <div className="slither-feed">
              {feed.map((f) => (
                <div key={f.key} className={f.me ? 'is-me' : ''}>
                  {f.text}
                </div>
              ))}
            </div>
          )}
          {phase === 'play' && (
            <div className="action-btns">
              <button
                type="button"
                className={`action-btn slither-boost${boosting ? ' is-down' : ''}`}
                onPointerDown={boostDown}
                onPointerUp={boostUp}
                onPointerCancel={boostUp}
                aria-label="Boost"
              >
                BOOST
              </button>
            </div>
          )}
          {banner && playing ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="slither"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to steer, hold Boost to dash. Make rivals crash into your body — then eat what they drop."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={world.current.peak >= 500 ? 'Mighty worm!' : 'Cut off!'}
            subtitle={`Length ${world.current.peak} · ${world.current.stats.kills} cuts`}
            celebrate={world.current.peak >= 500}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
