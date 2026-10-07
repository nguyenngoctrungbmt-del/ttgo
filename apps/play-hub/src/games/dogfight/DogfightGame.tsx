import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, dist, glow, rand } from '../../shared/action/fx'
import { Stick, localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { CLOUD_SIZE, ZEP_LEN, ZEP_TURRETS, ZEP_WID, cloudSprite, drawKamikaze, drawPlane, drawZeppelin, hash2, type PlaneStyle } from './art'
import { BIOMES, biomeFor, drawBolt, drawGround, drawWeather, makeWeather, type Flake } from './biomes'
import '../../shared/action/action.css'
import './dogfight.css'

const meta = getGame('dogfight')

type Phase = 'idle' | 'play' | 'pick' | 'dying' | 'over'
type EKind = 'fighter' | 'hunter' | 'bomber' | 'ace' | 'drone' | 'zeppelin'
type PickId = 'rate' | 'wing' | 'turn' | 'armor' | 'burner' | 'rockets' | 'flarepack' | 'dmg'
type Pick = { id: PickId; icon: string; label: string; blurb: string }

const PICKS: Pick[] = [
  { id: 'rate', icon: '🔥', label: 'Hot Guns', blurb: 'Fire 18% faster' },
  { id: 'wing', icon: '🔫', label: 'Wing Guns', blurb: '+2 extra gun streams' },
  { id: 'turn', icon: '🌀', label: 'Ailerons', blurb: 'Turn 15% tighter' },
  { id: 'armor', icon: '🛡️', label: 'Armor Plating', blurb: '+1 max hull and full repair' },
  { id: 'burner', icon: '💨', label: 'Afterburner', blurb: 'Fly 10% faster' },
  { id: 'rockets', icon: '🚀', label: 'Homing Rockets', blurb: 'Auto-launch rockets at targets' },
  { id: 'flarepack', icon: '🎆', label: 'Flare Pack', blurb: '+2 max flares' },
  { id: 'dmg', icon: '💥', label: 'AP Rounds', blurb: '+40% gun damage' },
]
const ACE_NAMES = ['Red Falcon', 'Night Viper', 'Iron Baron', 'Storm Hawk', 'Ghost Eagle', 'Crimson Wolf']

type Trail = number[]
type Player = { x: number; y: number; a: number; spd: number; hp: number; max: number; inv: number; roll: number; fire: number; trailL: Trail; trailR: Trail; alive: boolean }
type Enemy = {
  id: number
  kind: EKind
  x: number
  y: number
  a: number
  spd: number
  turn: number
  hp: number
  max: number
  fire: number
  burst: number
  state: 'attack' | 'extend'
  stateT: number
  extendA: number
  lock: number
  lockCd: number
  missiles: number
  flash: number
  roll: number
  trailL: Trail
  trailR: Trail
  jink: number
  bt: number
  aggro: number
  /** Drone: lock-on telegraph timer, dash timer and locked dash heading. */
  tele: number
  dashT: number
  dashA: number
  /** Zeppelin: per-turret charge timers (-1 idle) and drone launch timer. */
  tur: number[]
  launch: number
}
type Bullet = { x: number; y: number; vx: number; vy: number; life: number; enemy: boolean; dmg: number }
type Missile = { x: number; y: number; a: number; spd: number; life: number; enemy: boolean; target: number; decoy: number; smoke: number }
type Flare = { x: number; y: number; vx: number; vy: number; life: number }
type Pickup = { x: number; y: number; kind: 'repair' | 'flare' | 'medal' | 'overdrive'; t: number }
/** Flak shell: red reticle on the ground (`warn`), then a burst of smoke (`smoke`). */
type Flak = { x: number; y: number; warn: number; smoke: number; r: number }
const FLAK_WARN = 1.25
const OVERDRIVE_TIME = 8
const BOSS_NAME = 'LEVIATHAN'

type World = {
  p: Player
  enemies: Enemy[]
  bullets: Bullet[]
  missiles: Missile[]
  flares: Flare[]
  pickups: Pickup[]
  camX: number
  camY: number
  wave: number
  toSpawn: EKind[]
  spawnT: number
  waveDone: boolean
  flareCount: number
  flareMax: number
  flareCd: number
  rocketT: number
  score: number
  id: number
  multi: number
  multiT: number
  trailT: number
  lockBeep: number
  up: { rate: number; wing: number; turn: number; speed: number; rockets: number; dmg: number }
  flak: Flak[]
  flakT: number
  overdrive: number
  biome: number
  prevBiome: number
  biomeBlend: number
  weather: Flake[]
  boltT: number
  bolt: { x: number; seed: number; life: number }
  bosses: number
  god: boolean
  stats: { score: number; wave: number; kills: number; aces: number; evades: number }
}

function angDiff(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

function pushTrail(tr: Trail, x: number, y: number, max: number) {
  tr.push(x, y)
  if (tr.length > max * 2) tr.splice(0, 2)
}

/** Point-vs-hull test: the airship is a long ellipse, everything else a circle. */
function hits(e: Enemy, x: number, y: number, pad = 0) {
  if (e.kind === 'zeppelin') {
    const dx = x - e.x
    const dy = y - e.y
    const c = Math.cos(-e.a)
    const s = Math.sin(-e.a)
    const lx = dx * c - dy * s
    const ly = dx * s + dy * c
    return (lx / (ZEP_LEN + pad)) ** 2 + (ly / (ZEP_WID + pad)) ** 2 < 1
  }
  const r = (e.kind === 'bomber' ? 30 : e.kind === 'ace' ? 18 : e.kind === 'drone' ? 17 : 15) + pad
  return Math.abs(x - e.x) < r && Math.abs(y - e.y) < r && dist(x, y, e.x, e.y) < r
}

function freshWorld(): World {
  return {
    p: { x: 0, y: 0, a: -Math.PI / 2, spd: 185, hp: 5, max: 5, inv: 0, roll: 0, fire: 0, trailL: [], trailR: [], alive: true },
    enemies: [],
    bullets: [],
    missiles: [],
    flares: [],
    pickups: [],
    camX: 0,
    camY: 0,
    wave: 0,
    toSpawn: [],
    spawnT: 0,
    waveDone: false,
    flareCount: 3,
    flareMax: 3,
    flareCd: 0,
    rocketT: 3,
    score: 0,
    id: 1,
    multi: 0,
    multiT: 0,
    trailT: 0,
    lockBeep: 0,
    up: { rate: 1, wing: 0, turn: 1, speed: 1, rockets: 0, dmg: 1 },
    flak: [],
    flakT: 6,
    overdrive: 0,
    biome: 0,
    prevBiome: 0,
    biomeBlend: 1,
    weather: [],
    boltT: 6,
    bolt: { x: 0, seed: 0, life: 0 },
    bosses: 0,
    god: false,
    stats: { score: 0, wave: 0, kills: 0, aces: 0, evades: 0 },
  }
}

function pickChoices(w: World): Pick[] {
  const pool = PICKS.filter((p) => !(p.id === 'wing' && w.up.wing > 0) && !(p.id === 'rockets' && w.up.rockets >= 3))
  const out: Pick[] = []
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  return out
}

export default function DogfightGame() {
  const run = useActionRun('dogfight')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const stick = useRef(new Stick(56)).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const keys = useRef({ l: false, r: false })
  const lastCam = useRef({ x: 0, y: 0 })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, wave: 1, hp: 5, max: 5, flares: 3, enemies: 0 })
  const [warn, setWarn] = useState<'none' | 'lock' | 'missile'>('none')
  const [ace, setAce] = useState<{ label: string; name: string; pct: number } | null>(null)
  const [odHud, setOdHud] = useState(false)
  const [choices, setChoices] = useState<Pick[]>([])
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, wave: Math.max(1, w.wave), hp: Math.max(0, w.p.hp), max: w.p.max, flares: w.flareCount, enemies: w.enemies.length + w.toSpawn.length })
  }

  function show(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.p.max = 5 + run.level('armor')
    w.p.hp = w.p.max
    w.flareMax = 3 + run.level('flares')
    w.flareCount = w.flareMax
    world.current = w
    fx.reset()
    setAce(null)
    setOdHud(false)
    setWarn('none')
    run.begin()
    setPhaseBoth('play')
    nextWave()
  }

  function nextWave() {
    const w = world.current
    w.wave += 1
    w.stats.wave = w.wave
    w.waveDone = false
    w.flareCount = Math.max(w.flareCount, w.flareMax)
    const n = w.wave
    const list: EKind[] = []
    const fighters = Math.min(9, 2 + n)
    for (let i = 0; i < fighters; i++) list.push('fighter')
    if (n >= 3) for (let i = 0; i < Math.min(4, Math.floor((n - 1) / 2)); i++) list.splice(Math.floor(Math.random() * list.length), 0, 'hunter')
    if (n >= 2 && n % 2 === 0) for (let i = 0; i < 1 + Math.floor(n / 6); i++) list.splice(1, 0, 'bomber')
    // Kamikaze drones from wave 6, the Leviathan airship every 8th wave.
    if (n >= 6) for (let i = 0; i < Math.min(4, 1 + Math.floor((n - 6) / 3)); i++) list.splice(Math.floor(Math.random() * (list.length + 1)), 0, 'drone')
    if (n % 5 === 0) list.push('ace')
    if (n % 8 === 0) list.splice(1, 0, 'zeppelin')
    w.toSpawn = list
    w.spawnT = 1
    w.flakT = Math.min(w.flakT, 5)
    const nb = biomeFor(n)
    const { w: W, h: H } = size.current
    const changed = nb !== w.biome
    if (changed) {
      w.prevBiome = w.biome
      w.biome = nb
      w.biomeBlend = 0
      w.weather = makeWeather(BIOMES[nb], W, H)
      w.boltT = 3
    } else if (!w.weather.length && BIOMES[nb].weather !== 'none') w.weather = makeWeather(BIOMES[nb], W, H)
    const sub =
      n === 1 ? 'drag to steer · guns auto-fire' :
      n === 2 ? 'bombers incoming' :
      n === 3 ? 'missile hunters: use flares!' :
      n === 4 ? 'flak below: dodge the red rings' :
      n === 6 ? 'kamikaze drones: turn away when they flash' :
      n % 8 === 0 ? 'the Leviathan airship is coming' :
      n % 5 === 0 ? 'an enemy ace joins the fight' : `${list.length} bandits`
    if (changed) {
      const b = BIOMES[w.biome]
      show(b.name, `wave ${n} · ${b.sub}`)
      void trackEvent('action_milestone', { game_id: 'dogfight', kind: 'biome', value: n })
      window.setTimeout(() => sfx.whoosh(), 200)
    } else show(`WAVE ${n}`, sub)
    sfx.levelUp()
    pushHud()
    run.update(w.stats)
    if (n > 1 && n % 5 === 0) void trackEvent('action_milestone', { game_id: 'dogfight', kind: 'wave', value: n })
  }

  function spawnEnemy(kind: EKind, at?: { x: number; y: number }) {
    const w = world.current
    const p = w.p
    const { w: W, h: H } = size.current
    const R = Math.hypot(W, H) * 0.6 + (kind === 'zeppelin' ? 160 : 80)
    const a = p.a + rand(-1.2, 1.2) + (Math.random() < 0.3 ? Math.PI : 0)
    const x = at ? at.x : p.x + Math.cos(a) * R
    const y = at ? at.y : p.y + Math.sin(a) * R
    const toP = Math.atan2(p.y - y, p.x - x)
    const lvl = w.wave
    const base: Record<EKind, [hp: number, spd: number, turn: number]> = {
      fighter: [4, 150 + Math.min(40, lvl * 4), 1.25 + Math.min(0.6, lvl * 0.06)],
      hunter: [5, 165 + Math.min(30, lvl * 3), 1.3 + Math.min(0.5, lvl * 0.05)],
      bomber: [18 + lvl * 2, 95, 0.35],
      ace: [45 + lvl * 4, 205, 2.4],
      drone: [3, 165 + Math.min(30, lvl * 2), 1.7],
      zeppelin: [170 + lvl * 9, 52, 0.16],
    }
    const [hp, spd, turn] = base[kind]
    const e: Enemy = {
      id: w.id++, kind, x, y, a: kind === 'bomber' || kind === 'zeppelin' ? toP + rand(-0.4, 0.4) : toP, spd, turn, hp, max: hp, fire: w.wave === 1 ? rand(5, 7) : rand(1.5, 3), burst: 0,
      state: 'attack', stateT: 0, extendA: 0, lock: 0, lockCd: rand(3, 5), missiles: kind === 'hunter' ? 1 : kind === 'ace' ? 99 : 0,
      flash: 0, roll: 0, trailL: [], trailR: [], jink: 0, bt: 0, aggro: w.wave === 1 ? 0.35 : Math.min(1.3, 0.6 + w.wave * 0.08),
      tele: 0, dashT: 0, dashA: 0, tur: ZEP_TURRETS.map((_, i) => -1 - i * 0.6), launch: 8,
    }
    if (kind === 'drone') e.lockCd = rand(2, 3.5)
    w.enemies.push(e)
    if (kind === 'zeppelin') {
      setAce({ label: 'BOSS', name: BOSS_NAME, pct: 1 })
      show(`${BOSS_NAME} INBOUND`, 'giant airship · strafe it from behind')
      // Boss sting: rumbling boom and alarm clangs.
      sfx.boom(0.8)
      window.setTimeout(() => sfx.clang(), 200)
      window.setTimeout(() => sfx.clang(), 450)
      window.setTimeout(() => sfx.levelUp(), 750)
      fx.shake(8, 0.6)
      haptic.heavy()
    }
    if (kind === 'ace') {
      setAce({ label: 'ACE', name: ACE_NAMES[(Math.floor(w.wave / 5) - 1) % ACE_NAMES.length], pct: 1 })
      show(`ACE: ${ACE_NAMES[(Math.floor(w.wave / 5) - 1) % ACE_NAMES.length]}`, 'watch for missiles')
      sfx.boom(0.5)
      haptic.heavy()
    }
    if (kind === 'bomber') {
      // Bombers bring escorts.
      for (let i = 0; i < 2 && w.wave >= 4; i++) w.toSpawn.unshift('fighter')
    }
  }

  function damagePlayer(n: number, fromX: number, fromY: number) {
    const w = world.current
    const p = w.p
    if (p.inv > 0 || !p.alive || phaseRef.current !== 'play' || w.god) return
    p.hp -= n
    p.inv = n > 1 ? 1.1 : 0.8
    fx.flash('#ef4444', n > 1 ? 0.3 : 0.18)
    fx.shake(n > 1 ? 12 : 6, 0.3)
    fx.stop(n > 1 ? 0.1 : 0.04)
    fx.burst(p.x, p.y, { count: 10, color: ['#fde047', '#fb923c', '#e2e8f0'], speed: 200, gravity: 0, shape: 'spark' })
    const a = Math.atan2(p.y - fromY, p.x - fromX)
    p.roll = clamp(p.roll + Math.sin(a - p.a) * 0.8, -1, 1)
    sfx.hurt()
    haptic.heavy()
    pushHud()
    if (p.hp <= 0) {
      p.alive = false
      fx.explode(p.x, p.y, 2.2)
      fx.slowmo(1.1, 0.3)
      sfx.boom(1)
      setWarn('none')
      die()
    }
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.wave * 3 + w.stats.kills * 0.4 + w.stats.aces * 8 + w.bosses * 12)
      run.end({ score: w.score, cleared: w.wave >= 5, stats: { ...w.stats }, coins }, revive)
    }, 1200)
  }

  function revive() {
    const w = world.current
    const p = w.p
    p.alive = true
    p.hp = Math.max(3, Math.ceil(p.max / 2))
    p.inv = 2.6
    w.missiles = w.missiles.filter((m) => !m.enemy)
    w.bullets = w.bullets.filter((b) => !b.enemy)
    w.flareCount = Math.max(w.flareCount, 2)
    w.flak = []
    w.flakT = 5
    for (const e of w.enemies) {
      e.tele = 0
      e.dashT = 0
      e.lockCd = Math.max(e.lockCd, 2.5)
      if (e.kind === 'zeppelin') e.tur = e.tur.map((_, i) => -2 - i * 0.6)
      e.lock = 0
      e.lockCd = 3
      e.state = 'extend'
      e.extendA = Math.atan2(e.y - p.y, e.x - p.x)
      e.stateT = 2.5
    }
    fx.ring(p.x, p.y, { color: '#fde047', maxR: 90, life: 0.6, width: 5 })
    show('REVIVED!')
    pushHud()
    setPhaseBoth('play')
  }

  function killEnemy(e: Enemy) {
    const w = world.current
    e.hp = 0
    const big = e.kind === 'bomber' ? 1.8 : e.kind === 'ace' ? 2.6 : e.kind === 'zeppelin' ? 3 : e.kind === 'drone' ? 1.2 : 1
    fx.explode(e.x, e.y, big, ['#fde047', '#fb923c', '#ef4444', '#ffffff'])
    fx.burst(e.x, e.y, { count: 8, color: ['#334155', '#64748b'], speed: 160 * big, size: 3, shape: 'square', gravity: 0, drag: 1.5, life: 1 })
    w.multi = w.multiT > 0 ? w.multi + 1 : 1
    w.multiT = 2.6
    const values: Record<EKind, number> = { fighter: 100, hunter: 150, bomber: 400, ace: 2500, drone: 200, zeppelin: 6000 }
    let pts = values[e.kind] * (1 + (w.wave - 1) * 0.1)
    pts = Math.round(pts * (1 + (w.multi - 1) * 0.5))
    w.score += pts
    w.stats.score = w.score
    w.stats.kills += 1
    fx.text(e.x, e.y - 20, `+${pts}`, '#fef08a', e.kind === 'ace' || e.kind === 'zeppelin' ? 26 : 16)
    if (w.multi >= 2) {
      const label = ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL'][Math.min(4, w.multi)] || `${w.multi}× KILL`
      fx.text(e.x, e.y - 44, label, '#f0abfc', 18)
      sfx.combo()
    }
    if (e.kind === 'ace') {
      w.stats.aces += 1
      fx.flash('#ffffff', 0.35)
      fx.slowmo(1, 0.3)
      fx.stop(0.18)
      sfx.boom(1)
      sfx.win()
      haptic.success()
      setAce(null)
      show('ACE DOWN!', `+${pts}`)
      void trackEvent('action_milestone', { game_id: 'dogfight', kind: 'ace', value: w.stats.aces })
      w.pickups.push({ x: e.x, y: e.y, kind: 'repair', t: 0 }, { x: e.x + 30, y: e.y, kind: 'flare', t: 0 }, { x: e.x - 30, y: e.y, kind: 'medal', t: 0 })
    } else if (e.kind === 'zeppelin') {
      w.bosses += 1
      // Chain of secondary explosions along the hull.
      for (let i = 1; i <= 5; i++) {
        const k = (i / 5) * 2 - 1
        const ex = e.x + Math.cos(e.a) * k * ZEP_LEN
        const ey = e.y + Math.sin(e.a) * k * ZEP_LEN
        window.setTimeout(() => {
          fx.explode(ex, ey, 1.6, ['#fde047', '#fb923c', '#ef4444', '#ffffff'])
          sfx.boom(0.6)
        }, i * 130)
      }
      fx.flash('#ffffff', 0.4)
      fx.slowmo(1.2, 0.3)
      fx.stop(0.2)
      fx.shake(18, 0.7)
      sfx.boom(1)
      window.setTimeout(() => sfx.win(), 500)
      window.setTimeout(() => sfx.levelUp(), 900)
      haptic.success()
      setAce(null)
      if (w.p.alive) w.p.hp = w.p.max
      show(`${BOSS_NAME} DOWN!`, `+${pts} · full repair`)
      void trackEvent('action_milestone', { game_id: 'dogfight', kind: 'boss', value: w.bosses })
      w.pickups.push(
        { x: e.x, y: e.y, kind: 'overdrive', t: 0 },
        { x: e.x + 40, y: e.y, kind: 'medal', t: 0 },
        { x: e.x - 40, y: e.y, kind: 'medal', t: 0 },
        { x: e.x, y: e.y + 40, kind: 'flare', t: 0 },
      )
    } else {
      fx.stop(e.kind === 'bomber' ? 0.08 : 0.035)
      sfx.boom(e.kind === 'bomber' ? 0.7 : 0.4)
      haptic.medium()
      const roll = Math.random()
      if (e.kind === 'drone' && roll < 0.25) w.pickups.push({ x: e.x, y: e.y, kind: 'overdrive', t: 0 })
      else if (roll < 0.1 || (e.kind === 'bomber' && roll < 0.6)) w.pickups.push({ x: e.x, y: e.y, kind: Math.random() < 0.5 ? 'repair' : 'flare', t: 0 })
      else if (roll < 0.22) w.pickups.push({ x: e.x, y: e.y, kind: w.wave >= 6 && Math.random() < 0.2 ? 'overdrive' : 'medal', t: 0 })
    }
    run.update(w.stats)
    pushHud()
  }

  function deployFlares() {
    const w = world.current
    const p = w.p
    if (phaseRef.current !== 'play' || !p.alive || w.flareCount <= 0 || w.flareCd > 0) return
    w.flareCount -= 1
    w.flareCd = 1.2
    for (let i = 0; i < 6; i++) {
      const a = p.a + Math.PI + (i - 2.5) * 0.35
      w.flares.push({ x: p.x, y: p.y, vx: Math.cos(a) * rand(120, 200), vy: Math.sin(a) * rand(120, 200), life: 2.6 })
    }
    let broke = 0
    for (const m of w.missiles) {
      if (m.enemy && m.decoy < 0 && dist(m.x, m.y, p.x, p.y) < 700) {
        m.decoy = Math.floor(Math.random() * 6) + w.flares.length - 6
        broke++
      }
    }
    for (const e of w.enemies) {
      if (e.lock > 0) {
        e.lock = 0
        e.lockCd = 2.5
        broke++
      }
    }
    if (broke) fx.text(p.x, p.y - 40, 'LOCK BROKEN', '#fdba74', 18)
    sfx.whoosh()
    sfx.pop()
    haptic.medium()
    pushHud()
  }

  function choosePick(pk: Pick) {
    const w = world.current
    const p = w.p
    if (pk.id === 'rate') w.up.rate *= 1.18
    if (pk.id === 'wing') w.up.wing = 1
    if (pk.id === 'turn') w.up.turn *= 1.15
    if (pk.id === 'armor') {
      p.max += 1
      p.hp = p.max
    }
    if (pk.id === 'burner') w.up.speed *= 1.1
    if (pk.id === 'rockets') w.up.rockets += 1
    if (pk.id === 'flarepack') {
      w.flareMax += 2
      w.flareCount += 2
    }
    if (pk.id === 'dmg') w.up.dmg *= 1.4
    sfx.power()
    haptic.success()
    setChoices([])
    setPhaseBoth('play')
    nextWave()
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = localPoint(e, e.currentTarget)
    stick.down(e.pointerId, pt.x, pt.y)
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const pt = localPoint(e, e.currentTarget)
    stick.move(e.pointerId, pt.x, pt.y)
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    stick.up(e.pointerId)
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    // Dev-only: jump to a wave (`__en3skip(8)`), toggle invulnerability, spawn hazards.
    win.__en3skip = (wave: number) => {
      const w = world.current
      w.wave = Math.max(0, wave - 1)
      w.enemies = []
      w.toSpawn = []
      w.flak = []
      w.waveDone = true
      setAce(null)
      setChoices([])
      setPhaseBoth('play')
      nextWave()
    }
    win.__en3god = (on = true) => {
      world.current.god = on
    }
    win.__en3spawn = (kind: 'drone' | 'zeppelin' | 'overdrive', off = 0, r = 260) => {
      const w = world.current
      const p = w.p
      if (kind === 'overdrive') w.pickups.push({ x: p.x + Math.cos(p.a) * 120, y: p.y + Math.sin(p.a) * 120, kind, t: 0 })
      else spawnEnemy(kind, { x: p.x + Math.cos(p.a + off) * r, y: p.y + Math.sin(p.a + off) * r })
    }
    win.__en3w = () => world.current
    return () => {
      delete win.__en3skip
      delete win.__en3god
      delete win.__en3spawn
      delete win.__en3w
    }
  })

  useEffect(() => {
    function key(e: KeyboardEvent, down: boolean) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.l = down
      else if (e.key === 'ArrowRight' || e.key === 'd') keys.current.r = down
      else if ((e.key === ' ' || e.key === 'f') && down) deployFlares()
      else return
      e.preventDefault()
    }
    const kd = (e: KeyboardEvent) => key(e, true)
    const ku = (e: KeyboardEvent) => key(e, false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])

  function updatePlayer(dt: number, t: number) {
    const w = world.current
    const p = w.p
    const ph = phaseRef.current
    let turnIn = 0
    if (ph === 'idle') {
      turnIn = Math.sin(t * 0.4) * 0.6
    } else if (p.alive) {
      const v = stick.vec()
      if (v.mag > 0.2) {
        const desired = Math.atan2(v.y, v.x)
        turnIn = clamp(angDiff(p.a, desired) * 2.2, -1, 1) * Math.min(1, v.mag * 1.4)
      }
      if (keys.current.l) turnIn = -1
      if (keys.current.r) turnIn = 1
    } else {
      turnIn = 1.5
    }
    const turnRate = 2.35 * w.up.turn
    p.a += turnIn * turnRate * dt
    p.roll += (clamp(turnIn, -1, 1) - p.roll) * Math.min(1, dt * 6)
    p.spd = 185 * w.up.speed * (p.alive ? 1 : 0.7)
    p.x += Math.cos(p.a) * p.spd * dt
    p.y += Math.sin(p.a) * p.spd * dt
    p.inv = Math.max(0, p.inv - dt)
    if (!p.alive && Math.random() < 0.5) fx.burst(p.x, p.y, { count: 1, color: ['#334155', '#57534e'], speed: 30, size: 6, gravity: 0, drag: 1, life: 0.9 })
  }

  function updateEnemies(dt: number) {
    const w = world.current
    const p = w.p
    const playing = phaseRef.current === 'play'
    let locking = false
    for (const e of w.enemies) {
      e.flash = Math.max(0, e.flash - dt)
      const dx = p.x - e.x
      const dy = p.y - e.y
      const d = Math.hypot(dx, dy)
      const toP = Math.atan2(dy, dx)
      let desired = e.a
      let spd = e.spd
      if (e.kind === 'bomber') {
        // Straight runs; swing back toward the fight when far away.
        if (d > 900) desired = toP
        if (playing && d < 330) {
          e.fire -= dt
          if (e.fire <= 0) {
            e.fire = rand(0.9, 1.4) / e.aggro
            for (const sd of [-1, 1]) {
              const gx = e.x + Math.cos(e.a + sd * 1.57) * 14
              const gy = e.y + Math.sin(e.a + sd * 1.57) * 14
              const ga = Math.atan2(p.y - gy, p.x - gx) + rand(-0.12, 0.12)
              w.bullets.push({ x: gx, y: gy, vx: Math.cos(ga) * 300, vy: Math.sin(ga) * 300, life: 1.4, enemy: true, dmg: 1 })
            }
            sfx.tick()
          }
        }
      } else if (e.kind === 'zeppelin') {
        // Lumbers toward the fight, circling lazily once close.
        desired = d > 280 ? toP : e.a + 0.4
        if (d > 1100) spd *= 2.2
        if (playing && p.alive) {
          for (let i = 0; i < ZEP_TURRETS.length; i++) {
            const [tx, ty] = ZEP_TURRETS[i]
            const gx = e.x + Math.cos(e.a) * tx - Math.sin(e.a) * ty
            const gy = e.y + Math.sin(e.a) * tx + Math.cos(e.a) * ty
            const gd = dist(gx, gy, p.x, p.y)
            if (e.tur[i] < 0) e.tur[i] = Math.min(0, e.tur[i] + dt)
            else if (e.tur[i] > 0 || gd < 430) {
              // Telegraphed: the turret blinks red for 0.75 s, then fires a 3-round fan.
              e.tur[i] += dt
              if (e.tur[i] >= 0.75) {
                const ga = Math.atan2(p.y - gy, p.x - gx)
                for (const o of [-0.14, 0, 0.14]) w.bullets.push({ x: gx, y: gy, vx: Math.cos(ga + o) * 290, vy: Math.sin(ga + o) * 290, life: 1.7, enemy: true, dmg: 1 })
                e.tur[i] = -rand(2.6, 3.6) + Math.min(0.8, w.wave * 0.03)
                sfx.shoot()
              }
            }
          }
          e.launch -= dt
          if (e.launch <= 0) {
            e.launch = 11
            if (w.enemies.filter((o) => o.kind === 'drone').length < 3) {
              spawnEnemy('drone', { x: e.x - Math.cos(e.a) * 40, y: e.y - Math.sin(e.a) * 40 })
              sfx.whoosh()
            }
          }
        }
      } else if (e.kind === 'drone') {
        if (e.dashT > 0) {
          // Committed dash: straight line, very fast.
          e.dashT -= dt
          desired = e.dashA
          spd = 440
          if (Math.random() < 0.6) fx.burst(e.x - Math.cos(e.a) * 12, e.y - Math.sin(e.a) * 12, { count: 1, color: ['#fb923c', '#fde047'], speed: 40, size: 3, gravity: 0, life: 0.35 })
          if (e.dashT <= 0) e.lockCd = rand(2.2, 3.4)
        } else if (e.tele > 0) {
          // Telegraph: slows down, lines up with a short lead, eye blinks.
          e.tele -= dt
          desired = Math.atan2(p.y + Math.sin(p.a) * p.spd * 0.35 - e.y, p.x + Math.cos(p.a) * p.spd * 0.35 - e.x)
          spd *= 0.45
          if (e.tele <= 0) {
            e.dashT = 1.3
            e.dashA = e.a
            sfx.whoosh()
            haptic.light()
          }
        } else {
          desired = toP
          e.lockCd -= dt
          if (playing && p.alive && e.lockCd <= 0 && d < 330 && Math.abs(angDiff(e.a, toP)) < 0.5) {
            e.tele = 0.85
            sfx.tick()
          }
          if (d > 1000) spd *= 1.4
        }
      } else {
        if (e.state === 'extend') {
          desired = e.extendA
          spd *= 1.25
          e.stateT -= dt
          if (e.stateT <= 0) e.state = 'attack'
        } else {
          const lead = d / 500
          const lx = p.x + Math.cos(p.a) * p.spd * lead
          const ly = p.y + Math.sin(p.a) * p.spd * lead
          desired = Math.atan2(ly - e.y, lx - e.x)
          const headOn = Math.abs(angDiff(e.a, toP)) < 0.6 && Math.abs(angDiff(p.a, toP + Math.PI)) < 0.8
          if (d < 90 || (headOn && d < 150)) {
            e.state = 'extend'
            e.extendA = e.a + (Math.random() < 0.5 ? -1 : 1) * rand(0.9, 1.4)
            e.stateT = rand(0.9, 1.6)
          }
          // Aces jink when you get on their tail.
          if (e.kind === 'ace' && d < 280 && Math.abs(angDiff(e.a, toP)) > 2.3) {
            e.jink -= dt
            if (e.jink <= 0) {
              e.jink = rand(0.6, 1.1)
              e.extendA = e.a + (Math.random() < 0.5 ? -1.6 : 1.6)
              e.state = 'extend'
              e.stateT = 0.5
            }
          }
          if (d > 1000) spd *= 1.4
        }
        // Guns
        if (playing && p.alive && d < 360 && Math.abs(angDiff(e.a, toP)) < 0.22) {
          e.fire -= dt
          if (e.fire <= 0) {
            e.burst = e.kind === 'ace' ? 5 : 3
            e.fire = rand(1.3, 2.2) / e.aggro
          }
        }
        if (e.burst > 0) {
          e.bt -= dt
          if (e.bt <= 0) {
            e.bt = e.kind === 'ace' ? 0.07 : 0.1
            e.burst -= 1
            const ba = e.a + rand(-0.06, 0.06) * (2 - e.aggro)
            w.bullets.push({ x: e.x + Math.cos(e.a) * 16, y: e.y + Math.sin(e.a) * 16, vx: Math.cos(ba) * (430 + e.spd), vy: Math.sin(ba) * (430 + e.spd), life: 1, enemy: true, dmg: 1 })
            if (e.burst === 0) sfx.shoot()
          }
        }
        // Missile lock
        if (playing && p.alive && e.missiles > 0 && w.wave >= 3) {
          e.lockCd -= dt
          if (e.lock > 0) {
            locking = true
            e.lock -= dt
            if (d > 650) e.lock = 0
            else if (e.lock <= 0) {
              e.missiles -= 1
              e.lockCd = e.kind === 'ace' ? rand(6, 8) : 99
              w.missiles.push({ x: e.x, y: e.y, a: e.a, spd: 200, life: 5.5, enemy: true, target: 0, decoy: -1, smoke: 0 })
              if (e.kind === 'ace' && w.wave >= 10) w.missiles.push({ x: e.x, y: e.y, a: e.a + 0.5, spd: 200, life: 5.5, enemy: true, target: 0, decoy: -1, smoke: 0 })
              sfx.whoosh()
              haptic.medium()
            }
          } else if (e.lockCd <= 0 && d < 520) {
            e.lock = e.kind === 'ace' ? 1.1 : 1.5
          }
        }
      }
      const turn = e.kind === 'drone' ? (e.dashT > 0 ? 0.25 : e.tele > 0 ? 3.2 : e.turn) : e.turn * (e.state === 'extend' && e.kind !== 'bomber' ? 1.2 : 1)
      const da = clamp(angDiff(e.a, desired), -turn * dt, turn * dt)
      e.a += da
      e.roll += (clamp(da / Math.max(0.001, turn * dt), -1, 1) - e.roll) * Math.min(1, dt * 5)
      e.x += Math.cos(e.a) * spd * dt
      e.y += Math.sin(e.a) * spd * dt
      if (e.hp < e.max * 0.4 && Math.random() < 0.3) fx.burst(e.x, e.y, { count: 1, color: ['#475569', '#64748b'], speed: 25, size: 5, gravity: 0, drag: 1, life: 0.7 })
      // Body collision
      if (e.kind === 'zeppelin') {
        if (playing && p.alive && hits(e, p.x, p.y, 2)) damagePlayer(1, e.x, e.y)
      } else if (e.kind === 'drone') {
        if (playing && p.alive && d < 18) {
          // Kamikaze impact: the drone is spent, no score.
          damagePlayer(e.dashT > 0 ? 2 : 1, e.x, e.y)
          e.hp = 0
          fx.explode(e.x, e.y, 1.1, ['#fb923c', '#fde047', '#ffffff'])
          sfx.boom(0.6)
        }
      } else if (playing && p.alive && d < (e.kind === 'bomber' ? 28 : 14)) {
        damagePlayer(1, e.x, e.y)
        e.hp -= 6
        e.flash = 0.1
        if (e.hp <= 0) killEnemy(e)
      }
    }
    // Separation
    const es = w.enemies
    for (let i = 0; i < es.length; i++) {
      for (let j = i + 1; j < es.length; j++) {
        const a = es[i]
        const b = es[j]
        if (a.kind === 'zeppelin' || b.kind === 'zeppelin') continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const d2 = dx * dx + dy * dy
        if (d2 > 0 && d2 < 1600) {
          const d = Math.sqrt(d2)
          const push = (40 - d) * 0.5
          a.x -= (dx / d) * push
          a.y -= (dy / d) * push
          b.x += (dx / d) * push
          b.y += (dy / d) * push
        }
      }
    }
    w.enemies = w.enemies.filter((e) => e.hp > 0)
    if (locking) {
      w.lockBeep -= dt
      if (w.lockBeep <= 0) {
        w.lockBeep = 0.18
        sfx.tick()
      }
    }
    const incoming = w.missiles.some((m) => m.enemy && m.decoy < 0)
    const next = incoming ? 'missile' : locking ? 'lock' : 'none'
    setWarn((cur) => (cur === next ? cur : next))
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const p = w.p
    const ph = phaseRef.current
    const dt = ph === 'pick' ? 0 : fx.step(raw)
    if (ph === 'pick') fx.step(0)
    const playing = ph === 'play'
    const active = playing || ph === 'dying'

    if (ph !== 'pick' && ph !== 'over') updatePlayer(dt, t)
    if (ph === 'over') {
      p.x += Math.cos(p.a) * 60 * raw
      p.y += Math.sin(p.a) * 60 * raw
    }

    // Camera leads the nose.
    const tx = p.x + Math.cos(p.a) * 70
    const ty = p.y + Math.sin(p.a) * 70
    w.camX += (tx - w.camX) * Math.min(1, raw * 4)
    w.camY += (ty - w.camY) * Math.min(1, raw * 4)

    // Contrails
    w.trailT -= dt
    const sampleTrails = w.trailT <= 0
    if (sampleTrails) {
      w.trailT = 0.035
      const sy = 1 - Math.abs(p.roll) * 0.45
      const px = Math.cos(p.a + Math.PI / 2)
      const py = Math.sin(p.a + Math.PI / 2)
      pushTrail(p.trailL, p.x - px * 17 * sy - Math.cos(p.a) * 2, p.y - py * 17 * sy - Math.sin(p.a) * 2, 22)
      pushTrail(p.trailR, p.x + px * 17 * sy - Math.cos(p.a) * 2, p.y + py * 17 * sy - Math.sin(p.a) * 2, 22)
    }

    if (active) {
      // Spawning
      if (w.toSpawn.length > 0 && playing) {
        w.spawnT -= dt
        const cap = Math.min(7, 3 + Math.floor(w.wave / 2))
        if (w.spawnT <= 0 && w.enemies.length < cap) {
          spawnEnemy(w.toSpawn.shift()!)
          w.spawnT = w.wave === 1 ? 2.5 : Math.max(0.8, 2 - w.wave * 0.08)
          pushHud()
        }
      } else if (w.enemies.length === 0 && playing && !w.waveDone) {
        w.waveDone = true
        p.hp = Math.min(p.max, p.hp + 1)
        const bonus = 500 * w.wave
        w.score += bonus
        w.stats.score = w.score
        show('WAVE CLEAR', `+${bonus}`)
        sfx.win()
        haptic.success()
        run.update(w.stats)
        pushHud()
        window.setTimeout(() => {
          if (phaseRef.current !== 'play') return
          setChoices(pickChoices(world.current))
          setPhaseBoth('pick')
        }, 1300)
      }

      updateEnemies(dt)
      w.multiT = Math.max(0, w.multiT - dt)
      w.flareCd = Math.max(0, w.flareCd - dt)

      // Player guns: fire when something is in front of the nose.
      if (playing && p.alive) {
        let target: Enemy | null = null
        let best = 480
        for (const e of w.enemies) {
          const d = dist(e.x, e.y, p.x, p.y)
          const off = Math.abs(angDiff(p.a, Math.atan2(e.y - p.y, e.x - p.x)))
          if (off < 0.45 && d < best) {
            best = d
            target = e
          }
        }
        p.fire -= dt
        if (target && p.fire <= 0) {
          p.fire = 0.11 / (w.up.rate * (1 + run.level('guns') * 0.1) * (w.overdrive > 0 ? 1.8 : 1))
          const ta = Math.atan2(target.y - p.y, target.x - p.x)
          const aimA = p.a + clamp(angDiff(p.a, ta), -0.13, 0.13)
          const nx = Math.cos(p.a + Math.PI / 2)
          const ny = Math.sin(p.a + Math.PI / 2)
          const offs = w.up.wing ? [-9, -4, 4, 9] : [-5, 5]
          for (const o of offs) {
            const spread = w.up.wing && Math.abs(o) > 5 ? Math.sign(o) * 0.05 : 0
            const ba = aimA + spread
            const sp = 640 + p.spd
            w.bullets.push({ x: p.x + nx * o + Math.cos(p.a) * 10, y: p.y + ny * o + Math.sin(p.a) * 10, vx: Math.cos(ba) * sp, vy: Math.sin(ba) * sp, life: 0.7, enemy: false, dmg: w.up.dmg })
          }
          sfx.shoot()
        }
        // Homing rockets
        if (w.up.rockets > 0 && w.enemies.length) {
          w.rocketT -= dt
          if (w.rocketT <= 0) {
            w.rocketT = 3.6 / w.up.rockets
            let tgt = w.enemies[0]
            let bd = 1e9
            for (const e of w.enemies) {
              const d = dist(e.x, e.y, p.x, p.y)
              if (d < bd) {
                bd = d
                tgt = e
              }
            }
            w.missiles.push({ x: p.x, y: p.y, a: p.a, spd: 260, life: 4, enemy: false, target: tgt.id, decoy: -1, smoke: 0 })
            sfx.whoosh()
          }
        }
      }

      // Bullets
      for (const b of w.bullets) {
        b.x += b.vx * dt
        b.y += b.vy * dt
        b.life -= dt
        if (b.life <= 0) continue
        if (b.enemy) {
          if (p.alive && playing && Math.abs(b.x - p.x) < 13 && Math.abs(b.y - p.y) < 13 && dist(b.x, b.y, p.x, p.y) < 10) {
            b.life = 0
            damagePlayer(b.dmg, b.x - b.vx, b.y - b.vy)
          }
        } else {
          for (const e of w.enemies) {
            if (e.hp <= 0) continue
            if (hits(e, b.x, b.y)) {
              b.life = 0
              e.hp -= b.dmg
              e.flash = 0.06
              fx.burst(b.x, b.y, { count: 3, color: ['#fde047', '#ffffff'], speed: 120, gravity: 0, size: 2, life: 0.25, shape: 'spark' })
              if (e.hp <= 0) killEnemy(e)
              else if (Math.random() < 0.35) {
                sfx.hit()
                haptic.light()
              }
              if ((e.kind === 'ace' || e.kind === 'zeppelin') && e.hp > 0) setAce((cur) => (cur ? { ...cur, pct: e.hp / e.max } : cur))
              break
            }
          }
        }
      }
      w.bullets = w.bullets.filter((b) => b.life > 0)
      w.enemies = w.enemies.filter((e) => e.hp > 0)

      // Missiles
      for (const m of w.missiles) {
        m.life -= dt
        m.spd = Math.min(m.enemy ? 330 : 420, m.spd + 120 * dt)
        let tx2: number | null = null
        let ty2 = 0
        if (m.enemy) {
          if (m.decoy >= 0) {
            const f = w.flares[m.decoy] ?? w.flares[w.flares.length - 1]
            if (f) {
              tx2 = f.x
              ty2 = f.y
            }
          } else if (p.alive) {
            tx2 = p.x
            ty2 = p.y
          }
        } else {
          const e = w.enemies.find((o) => o.id === m.target) ?? w.enemies[0]
          if (e) {
            m.target = e.id
            tx2 = e.x
            ty2 = e.y
          }
        }
        if (tx2 != null) {
          const da = angDiff(m.a, Math.atan2(ty2 - m.y, tx2 - m.x))
          const rate = m.enemy ? 2.05 : 4
          m.a += clamp(da, -rate * dt, rate * dt)
        }
        m.x += Math.cos(m.a) * m.spd * dt
        m.y += Math.sin(m.a) * m.spd * dt
        m.smoke -= dt
        if (m.smoke <= 0) {
          m.smoke = 0.03
          fx.burst(m.x - Math.cos(m.a) * 8, m.y - Math.sin(m.a) * 8, { count: 1, color: m.enemy ? ['#e5e7eb', '#cbd5e1'] : ['#bae6fd'], speed: 10, size: 4, gravity: 0, drag: 1, life: 0.6 })
        }
        if (m.enemy) {
          if (m.decoy < 0 && p.alive && playing && dist(m.x, m.y, p.x, p.y) < 15) {
            m.life = 0
            fx.explode(m.x, m.y, 1.2)
            damagePlayer(2, m.x, m.y)
            continue
          }
          if (m.decoy >= 0 && tx2 != null && dist(m.x, m.y, tx2, ty2) < 14) {
            m.life = 0
            fx.explode(m.x, m.y, 0.7, ['#fdba74', '#ffffff', '#fde047'])
            w.stats.evades += 1
            fx.text(m.x, m.y - 18, 'EVADED', '#fdba74', 14)
            run.update(w.stats)
            continue
          }
          if (m.life <= 0) {
            fx.explode(m.x, m.y, 0.5)
            if (m.decoy < 0 && p.alive) {
              w.stats.evades += 1
              fx.text(m.x, m.y - 18, 'EVADED', '#fdba74', 14)
              run.update(w.stats)
            }
          }
        } else {
          for (const e of w.enemies) {
            if (hits(e, m.x, m.y, 3)) {
              m.life = 0
              fx.explode(m.x, m.y, 0.8)
              e.hp -= 6
              e.flash = 0.1
              if (e.hp <= 0) killEnemy(e)
              break
            }
          }
          if (m.life <= 0) fx.burst(m.x, m.y, { count: 6, color: ['#fde047', '#ffffff'], speed: 100, gravity: 0 })
        }
      }
      w.missiles = w.missiles.filter((m) => m.life > 0)
      w.enemies = w.enemies.filter((e) => e.hp > 0)

      // Flares
      for (const f of w.flares) {
        f.x += f.vx * dt
        f.y += f.vy * dt
        f.vx *= Math.exp(-1.2 * dt)
        f.vy *= Math.exp(-1.2 * dt)
        f.life -= dt
        if (Math.random() < 0.5) fx.burst(f.x, f.y, { count: 1, color: ['#fed7aa', '#fb923c'], speed: 20, size: 2.5, gravity: 0, life: 0.4 })
      }
      if (w.flares.length && w.flares.every((f) => f.life <= 0)) {
        w.flares = []
        for (const m of w.missiles) if (m.decoy >= 0) m.life = Math.min(m.life, 0.4)
      }

      // Pickups
      for (const pk of w.pickups) {
        pk.t += dt
        if (p.alive && playing && dist(pk.x, pk.y, p.x, p.y) < 36) {
          pk.t = 999
          if (pk.kind === 'repair') {
            p.hp = Math.min(p.max, p.hp + 2)
            fx.text(p.x, p.y - 30, 'REPAIR +2', '#86efac', 16)
          } else if (pk.kind === 'flare') {
            w.flareCount = Math.min(w.flareMax + 3, w.flareCount + 2)
            fx.text(p.x, p.y - 30, 'FLARES +2', '#fdba74', 16)
          } else if (pk.kind === 'overdrive') {
            w.overdrive = OVERDRIVE_TIME
            setOdHud(true)
            fx.text(p.x, p.y - 30, 'OVERDRIVE!', '#67e8f9', 18)
            fx.ring(p.x, p.y, { color: '#22d3ee', maxR: 70, life: 0.45, width: 5 })
            sfx.levelUp()
          } else {
            const v = 250 * w.wave
            w.score += v
            w.stats.score = w.score
            fx.text(p.x, p.y - 30, `MEDAL +${v}`, '#fde047', 16)
          }
          fx.ring(p.x, p.y, { color: '#ffffff', maxR: 40, life: 0.3 })
          sfx.power()
          haptic.success()
          pushHud()
        }
      }
      w.pickups = w.pickups.filter((pk) => pk.t < 25)

      if (w.overdrive > 0) {
        w.overdrive -= dt
        if (w.overdrive <= 0) setOdHud(false)
      }

      // Flak (wave 4+): reticles appear along your flight path, then burst.
      if (playing && w.wave >= 4 && !w.waveDone && p.alive) {
        w.flakT -= dt
        if (w.flakT <= 0 && w.flak.length < 8) {
          const n = Math.min(4, 2 + Math.floor((w.wave - 4) / 4))
          const ahead = rand(150, 290)
          for (let i = 0; i < n; i++) {
            const k = ahead + (i - (n - 1) / 2) * 70 + rand(-20, 20)
            const side = rand(-60, 60)
            w.flak.push({
              x: p.x + Math.cos(p.a) * k - Math.sin(p.a) * side,
              y: p.y + Math.sin(p.a) * k + Math.cos(p.a) * side,
              warn: FLAK_WARN + i * 0.12,
              smoke: 0,
              r: 44,
            })
          }
          w.flakT = Math.max(3.2, rand(6, 8.5) - w.wave * 0.12)
          sfx.tick()
        }
      }
      for (const f of w.flak) {
        if (f.warn > 0) {
          f.warn -= dt
          if (f.warn <= 0) {
            f.smoke = 1.3
            fx.burst(f.x, f.y, { count: 10, color: ['#fde047', '#fb923c', '#ef4444'], speed: 170, gravity: 0, size: 3, life: 0.35, shape: 'spark' })
            fx.burst(f.x, f.y, { count: 6, color: ['#3f3f46', '#52525b'], speed: 50, gravity: 0, size: 9, life: 1, drag: 1.5 })
            if (dist(f.x, f.y, p.x, p.y) < 520) sfx.boom(0.3)
            if (playing && p.alive && dist(f.x, f.y, p.x, p.y) < f.r) damagePlayer(1, f.x, f.y)
            else if (playing && p.alive && dist(f.x, f.y, p.x, p.y) < f.r + 30) fx.text(p.x, p.y - 34, 'CLOSE CALL', '#fdba74', 13)
          }
        } else f.smoke -= dt
      }
      w.flak = w.flak.filter((f) => f.warn > 0 || f.smoke > 0)
    }

    // ── Draw ─────────────────────────────────────
    const ox = W / 2 - w.camX
    const oy = H / 2 - w.camY
    // Ground: biome sea/sand/ice, cross-fading over ~2.5 s when a new theatre begins.
    w.biomeBlend = Math.min(1, w.biomeBlend + raw * 0.4)
    const bio = BIOMES[w.biome]
    const prevBio = BIOMES[w.prevBiome]
    if (w.biomeBlend < 1) drawGround(ctx, prevBio, W, H, w.camX, w.camY, t, 1)
    drawGround(ctx, bio, W, H, w.camX, w.camY, t, w.biomeBlend)
    const cb = w.biomeBlend < 0.5 ? prevBio : bio
    // Low clouds (parallax 0.8) with shadows
    drawClouds(ctx, W, H, w.camX, w.camY, 0.8, cb.lowClouds[0], 1, cb.lowClouds[1], cb.storm)

    fx.applyShake(ctx)
    ctx.save()
    ctx.translate(ox, oy)

    // Plane shadows on the sea
    const shadowOff = 26
    if (p.alive || ph === 'dying') drawPlane(ctx, 'player', p.x + shadowOff, p.y + shadowOff, p.a, p.roll, t, false, true)
    for (const e of w.enemies) {
      if (e.kind === 'zeppelin') drawZeppelin(ctx, e.x + shadowOff * 2, e.y + shadowOff * 2, e.a, t, false, e.tur, 0, 1, true)
      else if (e.kind === 'drone') drawKamikaze(ctx, e.x + shadowOff, e.y + shadowOff, e.a, t, 0, false, false, true)
      else drawPlane(ctx, e.kind as PlaneStyle, e.x + shadowOff, e.y + shadowOff, e.a, e.roll, t, false, true)
    }

    // Flak reticles (ground fire telegraph) and smoke puffs
    for (const f of w.flak) {
      if (f.warn > 0) {
        const k = 1 - Math.min(1, f.warn / FLAK_WARN)
        const blink = Math.floor(f.warn * 10) % 2 === 0
        ctx.fillStyle = `rgba(239,68,68,${0.08 + k * 0.16})`
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = blink ? 'rgba(254,202,202,0.95)' : 'rgba(239,68,68,0.9)'
        ctx.lineWidth = 2.5
        ctx.setLineDash([9, 7])
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        // shrinking inner ring = time left
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r * (1 - k) + 4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(f.x - 10, f.y)
        ctx.lineTo(f.x + 10, f.y)
        ctx.moveTo(f.x, f.y - 10)
        ctx.lineTo(f.x, f.y + 10)
        ctx.stroke()
      } else {
        const k = f.smoke / 1.3
        ctx.globalAlpha = Math.min(1, k * 1.3) * 0.75
        ctx.fillStyle = '#27272a'
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + f.x
          const rr = f.r * (0.55 + (1 - k) * 0.35)
          ctx.beginPath()
          ctx.arc(f.x + Math.cos(a) * rr * 0.5, f.y + Math.sin(a) * rr * 0.5, rr * 0.55, 0, Math.PI * 2)
          ctx.fill()
        }
        if (k > 0.75) {
          ctx.fillStyle = '#fb923c'
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.r * 0.45 * (k - 0.5) * 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
    }

    // Pickups
    for (const pk of w.pickups) drawPickup(ctx, pk, t)

    // Contrails
    ctx.lineCap = 'round'
    const drawTrail = (tr: Trail, col: string) => {
      if (tr.length < 4) return
      ctx.strokeStyle = col
      for (let i = 2; i < tr.length; i += 2) {
        ctx.globalAlpha = (i / tr.length) * 0.55
        ctx.lineWidth = 1 + (i / tr.length) * 2
        ctx.beginPath()
        ctx.moveTo(tr[i - 2], tr[i - 1])
        ctx.lineTo(tr[i], tr[i + 1])
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    drawTrail(p.trailL, '#ffffff')
    drawTrail(p.trailR, '#ffffff')
    for (const e of w.enemies) {
      if (sampleTrails && dt > 0) {
        const nx = Math.cos(e.a + Math.PI / 2)
        const ny = Math.sin(e.a + Math.PI / 2)
        const span = e.kind === 'bomber' || e.kind === 'zeppelin' ? 36 : e.kind === 'drone' ? 12 : 17
        pushTrail(e.trailL, e.x - nx * span, e.y - ny * span, 12)
        pushTrail(e.trailR, e.x + nx * span, e.y + ny * span, 12)
      }
      const col = e.kind === 'ace' ? '#e9d5ff' : '#f1f5f9'
      drawTrail(e.trailL, col)
      drawTrail(e.trailR, col)
    }

    // Flares
    for (const f of w.flares) {
      if (f.life <= 0) continue
      glow(ctx, f.x, f.y, 16, '#fb923c', 0.7)
      ctx.fillStyle = '#fff7ed'
      ctx.beginPath()
      ctx.arc(f.x, f.y, 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Bullets
    for (const b of w.bullets) {
      ctx.strokeStyle = b.enemy ? '#fca5a5' : w.overdrive > 0 ? '#67e8f9' : '#fde047'
      ctx.lineWidth = b.enemy ? 3 : 2.5
      ctx.beginPath()
      ctx.moveTo(b.x, b.y)
      ctx.lineTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022)
      ctx.stroke()
    }

    // Missiles
    for (const m of w.missiles) {
      ctx.save()
      ctx.translate(m.x, m.y)
      ctx.rotate(m.a)
      ctx.fillStyle = m.enemy ? '#e2e8f0' : '#bae6fd'
      ctx.fillRect(-7, -2, 14, 4)
      ctx.fillStyle = m.enemy ? '#ef4444' : '#0284c7'
      ctx.beginPath()
      ctx.moveTo(7, -2)
      ctx.lineTo(11, 0)
      ctx.lineTo(7, 2)
      ctx.fill()
      ctx.fillRect(-7, -4, 3, 8)
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.ellipse(-9 - Math.random() * 2, 0, 3, 1.8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Planes
    for (const e of w.enemies) {
      if (e.kind === 'zeppelin') {
        glow(ctx, e.x, e.y, 120, '#ef4444', e.tur.some((v) => v > 0) ? 0.18 : 0.08)
        drawZeppelin(ctx, e.x, e.y, e.a, t, e.flash > 0, e.tur.map((v) => (v > 0 ? v / 0.75 : 0)), Math.atan2(p.y - e.y, p.x - e.x), e.hp / e.max)
      } else if (e.kind === 'drone') {
        if (e.tele > 0) {
          // Lock-on telegraph: blinking dashed line along the coming dash.
          const k = 1 - e.tele / 0.85
          ctx.strokeStyle = Math.floor(t * 14) % 2 ? `rgba(239,68,68,${0.45 + k * 0.5})` : `rgba(254,215,170,${0.35 + k * 0.4})`
          ctx.lineWidth = 2 + k * 2.5
          ctx.setLineDash([12, 8])
          ctx.beginPath()
          ctx.moveTo(e.x, e.y)
          ctx.lineTo(e.x + Math.cos(e.a) * 480, e.y + Math.sin(e.a) * 480)
          ctx.stroke()
          ctx.setLineDash([])
          glow(ctx, e.x, e.y, 30, '#ef4444', 0.35 + k * 0.3)
        }
        drawKamikaze(ctx, e.x, e.y, e.a, t, e.tele > 0 ? 1 - e.tele / 0.85 : 0, e.dashT > 0, e.flash > 0)
      } else drawPlane(ctx, e.kind as PlaneStyle, e.x, e.y, e.a, e.roll, t, e.flash > 0)
      if (e.lock > 0) {
        ctx.strokeStyle = Math.floor(t * 10) % 2 ? '#ef4444' : '#fecaca'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(e.x, e.y, 26, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (e.kind !== 'fighter' && e.kind !== 'zeppelin' && e.hp < e.max) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(e.x - 18, e.y - 34, 36, 4)
        ctx.fillStyle = e.kind === 'ace' ? '#c084fc' : '#facc15'
        ctx.fillRect(e.x - 18, e.y - 34, 36 * (e.hp / e.max), 4)
      }
    }
    if ((p.alive || ph === 'dying') && !(p.inv > 0.3 && Math.floor(t * 14) % 2 === 0 && playing)) {
      drawPlane(ctx, 'player', p.x, p.y, p.a, p.roll, t, false)
    }

    fx.draw(ctx)
    ctx.restore()

    // High clouds above everything (parallax 1.25)
    drawClouds(ctx, W, H, w.camX, w.camY, 1.25, 0.3, 2, cb.highAlpha, cb.storm)

    ctx.restore()

    // Weather + lightning (screen space)
    const dcx = w.camX - lastCam.current.x
    const dcy = w.camY - lastCam.current.y
    lastCam.current = { x: w.camX, y: w.camY }
    drawWeather(ctx, bio, w.weather, W, H, dt, Math.abs(dcx) < 200 ? dcx : 0, Math.abs(dcy) < 200 ? dcy : 0, t, w.biomeBlend)
    if (bio.storm && w.biomeBlend > 0.5 && ph !== 'over') {
      w.boltT -= dt
      if (w.boltT <= 0) {
        w.boltT = rand(4.5, 8.5)
        w.bolt = { x: rand(W * 0.1, W * 0.9), seed: Math.floor(rand(0, 999)), life: 0.35 }
        fx.flash('#e0f2fe', 0.12)
        window.setTimeout(() => sfx.boom(0.35), 260)
      }
      if (w.bolt.life > 0) {
        w.bolt.life -= raw
        drawBolt(ctx, w.bolt.x, H, w.bolt.seed, Math.min(1, w.bolt.life / 0.2))
      }
    }

    // Off-screen arrows
    if (active) {
      const cx = W / 2
      const cy = H / 2
      const drawArrow = (x: number, y: number, col: string, big: boolean) => {
        const sx = x + ox
        const sy = y + oy
        if (sx > 0 && sx < W && sy > 0 && sy < H) return
        const a = Math.atan2(sy - cy, sx - cx)
        const m = 24
        const k = Math.min((W / 2 - m) / Math.abs(Math.cos(a) || 0.001), (H / 2 - m) / Math.abs(Math.sin(a) || 0.001))
        const axp = cx + Math.cos(a) * k
        const ayp = cy + Math.sin(a) * k
        const s = big ? 11 : 8
        ctx.save()
        ctx.translate(axp, ayp)
        ctx.rotate(a)
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.beginPath()
        ctx.moveTo(s + 2, 2)
        ctx.lineTo(-s + 2, -s + 2)
        ctx.lineTo(-s * 0.4 + 2, 2)
        ctx.lineTo(-s + 2, s + 2)
        ctx.fill()
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.moveTo(s, 0)
        ctx.lineTo(-s, -s)
        ctx.lineTo(-s * 0.4, 0)
        ctx.lineTo(-s, s)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      for (const e of w.enemies) {
        const col =
          e.kind === 'ace' ? '#c084fc' :
          e.kind === 'zeppelin' ? '#f43f5e' :
          e.kind === 'bomber' ? '#fb923c' :
          e.kind === 'drone' ? (e.tele > 0 && Math.floor(t * 12) % 2 ? '#ffffff' : '#f97316') :
          e.lock > 0 && Math.floor(t * 10) % 2 ? '#ffffff' : '#ef4444'
        drawArrow(e.x, e.y, col, e.kind !== 'fighter' && e.kind !== 'drone')
      }
      for (const m of w.missiles) if (m.enemy && m.decoy < 0 && Math.floor(t * 8) % 2) drawArrow(m.x, m.y, '#fde047', true)
      for (const pk of w.pickups) drawArrow(pk.x, pk.y, pk.kind === 'repair' ? '#4ade80' : pk.kind === 'flare' ? '#fdba74' : pk.kind === 'overdrive' ? '#22d3ee' : '#fde047', false)
    }

    stick.draw(ctx)
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score.toLocaleString()}</div>
                <div className="action-hud__small">Wave {hud.wave}</div>
                <div className="df-hull" aria-label="Hull">
                  {Array.from({ length: hud.max }, (_, i) => (
                    <i key={i} className={i >= hud.hp ? 'is-gone' : hud.hp <= 2 ? 'is-low' : ''} />
                  ))}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">Bandits {hud.enemies}</span>
                {odHud ? (
                  <span className="action-hud__small" style={{ color: '#67e8f9', fontWeight: 900 }}>
                    OVERDRIVE
                  </span>
                ) : null}
              </div>
            </div>
          )}
          {ace && phase === 'play' ? (
            <div className="df-acebar">
              {ace.label} · {ace.name}
              <div>
                <span style={{ width: `${Math.round(ace.pct * 100)}%` }} />
              </div>
            </div>
          ) : null}
          {warn !== 'none' && phase === 'play' ? <div className={`df-lock${warn === 'missile' ? ' is-missile' : ''}`}>{warn === 'missile' ? 'MISSILE!' : 'MISSILE LOCK'}</div> : null}
          {(phase === 'play' || phase === 'pick') && (
            <button
              type="button"
              className={`df-flare${hud.flares <= 0 ? ' is-empty' : ''}${warn !== 'none' && hud.flares > 0 ? ' is-urgent' : ''}`}
              onPointerDown={(e) => {
                e.stopPropagation()
                deployFlares()
              }}
              aria-label="Flare"
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="10" r="5" fill="#fff7ed" />
                <circle cx="12" cy="10" r="8" fill="#fb923c" opacity="0.4" />
                <path d="M12 15 L9 22 M12 15 L15 22 M12 15 L12 23" stroke="#fed7aa" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <span>FLARE ×{hud.flares}</span>
            </button>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'pick' && (
            <div className="df-pick" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Wave {hud.wave} cleared!</h3>
              <p>Choose a field upgrade</p>
              <div className="df-pick__list">
                {choices.map((c) => (
                  <button key={c.id} type="button" className="df-pick__card" onClick={() => choosePick(c)}>
                    <span className="df-pick__icon">{c.icon}</span>
                    <strong>{c.label}</strong>
                    <span>{c.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === 'idle' && (
            <ActionIdle
              game="dogfight"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to steer — your plane always flies forward and fires at anything ahead. Tap FLARE when a missile locks on."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.wave >= 5 ? 'Top gun!' : 'Shot down'}
            subtitle={`Score ${hud.score.toLocaleString()} · Wave ${hud.wave}`}
            celebrate={hud.wave >= 5}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}

function drawClouds(ctx: CanvasRenderingContext2D, W: number, H: number, camX: number, camY: number, par: number, density: number, seed: number, alpha: number, storm = false) {
  const cell = 230
  const gx0 = camX * par
  const gy0 = camY * par
  const S = CLOUD_SIZE * (par > 1 ? 1.5 : 1.1)
  for (let cx = Math.floor((gx0 - W / 2 - S) / cell); cx <= Math.floor((gx0 + W / 2 + S) / cell); cx++) {
    for (let cy = Math.floor((gy0 - H / 2 - S) / cell); cy <= Math.floor((gy0 + H / 2 + S) / cell); cy++) {
      const hv = hash2(cx, cy, 20 + seed)
      if (hv > density * 0.5) continue
      const sx = cx * cell + hash2(cx, cy, 30 + seed) * 120 - gx0 + W / 2
      const sy = cy * cell + hash2(cx, cy, 40 + seed) * 120 - gy0 + H / 2
      const img = cloudSprite(Math.floor(hv * 100) % 4, storm)
      if (par < 1) {
        // Cloud shadow on the sea
        ctx.globalAlpha = 0.12
        ctx.drawImage(img, sx - S / 2 + 30, sy - S / 2 + 40, S, S)
      }
      ctx.globalAlpha = alpha
      ctx.drawImage(img, sx - S / 2, sy - S / 2, S, S)
    }
  }
  ctx.globalAlpha = 1
}

function drawPickup(ctx: CanvasRenderingContext2D, pk: Pickup, t: number) {
  const bob = 1 + Math.sin(t * 5 + pk.x) * 0.08
  ctx.save()
  ctx.translate(pk.x, pk.y)
  ctx.scale(bob, bob)
  const col = pk.kind === 'repair' ? '#22c55e' : pk.kind === 'flare' ? '#f97316' : pk.kind === 'overdrive' ? '#06b6d4' : '#eab308'
  glow(ctx, 0, 0, 26, col, 0.45)
  // Parachute crate
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(0, -10, 13, Math.PI, 0)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-12, -10)
  ctx.lineTo(-5, 2)
  ctx.moveTo(12, -10)
  ctx.lineTo(5, 2)
  ctx.stroke()
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.roundRect(-8, 0, 16, 13, 3)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  if (pk.kind === 'repair') {
    ctx.fillRect(-1.5, 2.5, 3, 8)
    ctx.fillRect(-4, 5, 8, 3)
  } else if (pk.kind === 'flare') {
    ctx.beginPath()
    ctx.arc(0, 6.5, 3, 0, Math.PI * 2)
    ctx.fill()
  } else if (pk.kind === 'overdrive') {
    // lightning bolt
    ctx.beginPath()
    ctx.moveTo(1.5, 1)
    ctx.lineTo(-3.5, 7.5)
    ctx.lineTo(0, 7.5)
    ctx.lineTo(-1.5, 12)
    ctx.lineTo(3.5, 5)
    ctx.lineTo(0, 5)
    ctx.closePath()
    ctx.fill()
  } else {
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const r = i % 2 ? 2 : 4.5
      ctx.lineTo(Math.cos(a) * r, 6.5 + Math.sin(a) * r)
    }
    ctx.fill()
  }
  ctx.restore()
}
