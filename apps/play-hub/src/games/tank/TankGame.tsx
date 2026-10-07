import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
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
import { useProgressStore } from '../../store/progressStore'
import '../../shared/action/action.css'
import './tank.css'
import { drawChargerGear, drawColossus, drawDashLane, drawLobShell, drawLobZone, drawMortarGear, drawPickup, drawVent, type PickupKind } from './art'
import { BIOMES, EMBER, biomeForWave, biomeLayer, drawAmbient, emberCracks, stepAmbient, type Mote } from './biomes'

const meta = getGame('tank')

type Phase = 'idle' | 'play' | 'upgrade' | 'dying' | 'over'
type EnemyKind = 'crawler' | 'runner' | 'brute' | 'spitter' | 'splitter' | 'mortar' | 'charger' | 'boss' | 'colossus'

type Enemy = {
  id: number
  kind: EnemyKind
  x: number
  y: number
  kx: number
  ky: number
  r: number
  hp: number
  max: number
  speed: number
  flash: number
  wobble: number
  shoot: number
  value: number
  /** Kind-specific state: charger 0 walk / 1 wind-up / 2 dash; colossus = next attack index. */
  mode: number
  mt: number
  dir: number
  sub: number
}

type Shell = { x: number; y: number; vx: number; vy: number; life: number; pierce: number; hits: Set<number> }
type EnemyShot = { x: number; y: number; vx: number; vy: number; life: number }
type Mark = { x: number; y: number; a: number; life: number }
type Decal = { x: number; y: number; r: number; color: string; life: number }
/** Arcing mortar shell with a telegraphed landing zone. */
type Lob = { sx: number; sy: number; tx: number; ty: number; t: number; dur: number; r: number }
type Vent = { x: number; y: number; t: number }
type Pickup = { x: number; y: number; kind: PickupKind; life: number }

const isBoss = (e: Enemy) => e.kind === 'boss' || e.kind === 'colossus'
const COLOSSUS_COLORS = ['#22d3ee', '#f97316', '#facc15']
const VENT_WARN = 1.5
const VENT_R = 34
const OVERDRIVE = 7

type UpgradeId = 'damage' | 'rate' | 'speed' | 'pierce' | 'twin' | 'armor' | 'blast'
type Upgrade = { id: UpgradeId; icon: string; label: string; blurb: string }

const UPGRADES: Upgrade[] = [
  { id: 'damage', icon: '💥', label: 'Heavy shells', blurb: '+1 damage per shot' },
  { id: 'rate', icon: '⚙️', label: 'Autoloader', blurb: 'Fire 20% faster' },
  { id: 'speed', icon: '🛞', label: 'Turbo treads', blurb: 'Drive 15% faster' },
  { id: 'pierce', icon: '🎯', label: 'AP rounds', blurb: 'Shells pierce +1 enemy' },
  { id: 'twin', icon: '🔫', label: 'Twin barrel', blurb: '+1 shell per volley' },
  { id: 'armor', icon: '🛡️', label: 'Field repair', blurb: '+1 max HP and full heal' },
  { id: 'blast', icon: '🧨', label: 'HE shells', blurb: 'Shells explode on impact' },
]

const KIND_STYLE: Record<EnemyKind, { color: string; dark: string }> = {
  crawler: { color: '#4ade80', dark: '#166534' },
  runner: { color: '#f87171', dark: '#7f1d1d' },
  brute: { color: '#a78bfa', dark: '#4c1d95' },
  spitter: { color: '#fb923c', dark: '#7c2d12' },
  splitter: { color: '#22d3ee', dark: '#155e75' },
  mortar: { color: '#94a3b8', dark: '#1e293b' },
  charger: { color: '#fbbf24', dark: '#92400e' },
  boss: { color: '#f472b6', dark: '#831843' },
  colossus: { color: '#f97316', dark: '#292524' },
}

type Tank = {
  x: number
  y: number
  a: number
  turret: number
  recoil: number
  hp: number
  maxHp: number
  inv: number
  vx: number
  vy: number
}

type World = {
  tank: Tank
  enemies: Enemy[]
  shells: Shell[]
  shots: EnemyShot[]
  marks: Mark[]
  decals: Decal[]
  lobs: Lob[]
  vents: Vent[]
  ventTimer: number
  pickups: Pickup[]
  overdrive: number
  motes: Mote[]
  biome: number
  prevBiome: number
  biomeFade: number
  wave: number
  toSpawn: number
  spawnTimer: number
  bossPending: boolean
  fireTimer: number
  markDist: number
  id: number
  score: number
  repairEvery: number
  best: number
  bestShown: boolean
  up: { damage: number; rate: number; speed: number; pierce: number; twin: number; blast: number }
  stats: { score: number; kills: number; wave: number; bosses: number }
}

function freshWorld(W: number, H: number): World {
  return {
    tank: { x: W / 2, y: H / 2, a: -Math.PI / 2, turret: -Math.PI / 2, recoil: 0, hp: 5, maxHp: 5, inv: 0, vx: 0, vy: 0 },
    enemies: [],
    shells: [],
    shots: [],
    marks: [],
    decals: [],
    lobs: [],
    vents: [],
    ventTimer: 6,
    pickups: [],
    overdrive: 0,
    motes: [],
    biome: 0,
    prevBiome: 0,
    biomeFade: 1,
    wave: 0,
    toSpawn: 0,
    spawnTimer: 0,
    bossPending: false,
    fireTimer: 0,
    markDist: 0,
    id: 1,
    score: 0,
    repairEvery: 0,
    best: 0,
    bestShown: false,
    up: { damage: 1, rate: 1, speed: 1, pierce: 0, twin: 1, blast: 0 },
    stats: { score: 0, kills: 0, wave: 0, bosses: 0 },
  }
}

function pickUpgrades(w: World): Upgrade[] {
  const pool = UPGRADES.filter((u) => !(u.id === 'blast' && w.up.blast > 0) && !(u.id === 'twin' && w.up.twin >= 4))
  const out: Upgrade[] = []
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  return out
}

function drawCrown(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rot)
  const g = ctx.createLinearGradient(0, -16, 0, 4)
  g.addColorStop(0, '#fef08a')
  g.addColorStop(1, '#ca8a04')
  ctx.fillStyle = g
  ctx.strokeStyle = '#713f12'
  ctx.lineWidth = 1.5
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(-14, 4)
  ctx.lineTo(-16, -12)
  ctx.lineTo(-7, -4)
  ctx.lineTo(0, -16)
  ctx.lineTo(7, -4)
  ctx.lineTo(16, -12)
  ctx.lineTo(14, 4)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#dc2626'
  ctx.beginPath()
  ctx.arc(0, -2, 2.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#38bdf8'
  ctx.beginPath()
  ctx.arc(-8, 0, 1.8, 0, Math.PI * 2)
  ctx.arc(8, 0, 1.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillRect(-12, -1, 3, 3)
  ctx.restore()
}

function angleDiff(a: number, b: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

export default function TankGame() {
  const run = useActionRun('tank')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const stick = useRef(new Stick(52)).current
  const keys = useRef(new Set<string>()).current

  useEffect(() => {
    const map: Record<string, string> = { ArrowLeft: 'l', a: 'l', ArrowRight: 'r', d: 'r', ArrowUp: 'u', w: 'u', ArrowDown: 'd', s: 'd' }
    function down(e: KeyboardEvent) {
      const k = map[e.key]
      if (!k) return
      e.preventDefault()
      keys.add(k)
    }
    function up(e: KeyboardEvent) {
      const k = map[e.key]
      if (k) keys.delete(k)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [keys])
  const size = useRef({ w: 360, h: 520 })
  const world = useRef<World>(freshWorld(360, 520))
  const phaseRef = useRef<Phase>('idle')
  const devGod = useRef(false)

  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [hp, setHp] = useState({ hp: 5, max: 5 })
  const [wave, setWave] = useState(1)
  const [choices, setChoices] = useState<Upgrade[]>([])
  const [boss, setBoss] = useState<number | null>(null)
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [zone, setZone] = useState<{ key: number; name: string; sub: string; color: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function start() {
    void unlockAudio()
    const w = freshWorld(size.current.w, size.current.h)
    w.tank.maxHp += run.level('plating')
    w.tank.hp = w.tank.maxHp
    w.up.rate = 1 + run.level('loader') * 0.1
    const kit = run.level('repair')
    w.repairEvery = kit > 0 ? 4 - kit : 0
    w.best = useProgressStore.getState().games.tank?.bestScore ?? 0
    w.bestShown = w.best < 300
    world.current = w
    fx.reset()
    setScore(0)
    setHp({ hp: w.tank.hp, max: w.tank.maxHp })
    setBoss(null)
    run.begin()
    setPhaseBoth('play')
    beginWave()
  }

  function beginWave() {
    const w = world.current
    w.wave += 1
    w.stats.wave = w.wave
    setWave(w.wave)
    run.update(w.stats)
    w.toSpawn = 6 + w.wave * 3
    w.spawnTimer = 0.8
    w.bossPending = w.wave % 5 === 0
    const colossus = w.bossPending && w.wave % 10 === 0
    showBanner(
      colossus ? 'COLOSSUS WAVE' : w.bossPending ? 'BOSS WAVE' : `WAVE ${w.wave}`,
      w.wave === 1 ? 'drag to drive · auto-aim'
      : colossus ? 'dodge the marked craters'
      : w.bossPending ? 'big one incoming'
      : w.wave === 3 ? 'grab the crates slimes drop'
      : w.wave === 6 ? 'splitters: they divide when popped'
      : w.wave === 7 ? 'mortars: leave the red circles'
      : w.wave === 9 ? 'chargers: sidestep the dash'
      : undefined,
    )
    if (w.bossPending) sfx.boom(0.4)
    sfx.levelUp()
    const nb = biomeForWave(w.wave)
    if (nb !== w.biome) {
      w.prevBiome = w.biome
      w.biome = nb
      w.biomeFade = 0
      w.motes = []
      w.vents = []
      w.ventTimer = 5
      const b = BIOMES[nb]
      setZone({ key: Date.now() + Math.random(), name: b.name, sub: b.sub, color: b.accent })
      sfx.whoosh()
      window.setTimeout(() => sfx.ready(), 200)
    }
  }

  function spawnEnemy(kind: EnemyKind, at?: { x: number; y: number }) {
    const w = world.current
    const { w: W, h: H } = size.current
    const side = Math.floor(Math.random() * 4)
    const pad = 30
    const x = at ? at.x : side === 0 ? -pad : side === 1 ? W + pad : rand(0, W)
    const y = at ? at.y : side === 2 ? -pad : side === 3 ? H + pad : rand(0, H)
    const lvl = 1 + w.wave * 0.12
    const base: Record<EnemyKind, [r: number, hp: number, speed: number, value: number]> = {
      crawler: [13, 2, 48, 10],
      runner: [10, 1, 96, 15],
      brute: [21, 9, 30, 40],
      spitter: [13, 3, 42, 25],
      splitter: [17, 5, 38, 30],
      mortar: [14, 4, 34, 35],
      charger: [15, 5, 40, 35],
      boss: [38, 70 + w.wave * 12, 26, 500],
      colossus: [46, 120 + w.wave * 12, 20, 1000],
    }
    const [r, hp0, speed, value] = base[kind]
    const boss = kind === 'boss' || kind === 'colossus'
    const hpv = Math.round(hp0 * (boss ? 1 : lvl))
    w.enemies.push({
      id: w.id++, kind, x, y, kx: 0, ky: 0, r, hp: hpv, max: hpv, speed: speed * (1 + w.wave * 0.025), flash: 0, wobble: rand(0, 6),
      shoot: kind === 'colossus' ? 3 : rand(1.5, 3), value, mode: 0, mt: rand(1, 2), dir: 0, sub: 0,
    })
    if (boss) setBoss(1)
  }

  function countKind(k: EnemyKind) {
    let n = 0
    for (const e of world.current.enemies) if (e.kind === k) n++
    return n
  }

  function launchLob(sx: number, sy: number, tx: number, ty: number, r: number, dur: number) {
    const w = world.current
    if (w.lobs.length >= 16) return
    const { w: W, h: H } = size.current
    w.lobs.push({ sx, sy, tx: clamp(tx, 16, W - 16), ty: clamp(ty, 16, H - 16), t: 0, dur, r })
  }

  function landLob(l: Lob) {
    const w = world.current
    const t = w.tank
    fx.explode(l.tx, l.ty, 0.65, ['#fdba74', '#f97316', '#fef3c7', '#78350f'])
    w.decals.push({ x: l.tx, y: l.ty, r: l.r * 0.9, color: '#1c1917', life: 8 })
    if (w.decals.length > 40) w.decals.shift()
    sfx.boom(0.3)
    if (t.hp > 0 && dist(t.x, t.y, l.tx, l.ty) < l.r + 10) damageTank(l.tx, l.ty)
    for (const e of w.enemies) {
      if (!isBoss(e) && e.hp > 0 && dist(e.x, e.y, l.tx, l.ty) < l.r + e.r * 0.5) hitEnemy(e, 2, Math.atan2(e.y - l.ty, e.x - l.tx))
    }
  }

  function eruptVent(v: Vent) {
    const w = world.current
    const t = w.tank
    fx.burst(v.x, v.y, { count: 22, color: ['#fde68a', '#fb923c', '#ef4444'], speed: 260, angle: -Math.PI / 2, spread: 1.4, size: 3.5, gravity: 420, shape: 'spark' })
    fx.ring(v.x, v.y, { color: '#fb923c', maxR: VENT_R * 1.6, life: 0.35, width: 4 })
    fx.shake(5, 0.2)
    sfx.boom(0.35)
    w.decals.push({ x: v.x, y: v.y, r: VENT_R * 0.8, color: '#7c2d12', life: 6 })
    if (w.decals.length > 40) w.decals.shift()
    if (t.hp > 0 && dist(t.x, t.y, v.x, v.y) < VENT_R + 10) damageTank(v.x, v.y)
    for (const e of w.enemies) {
      if (!isBoss(e) && e.hp > 0 && dist(e.x, e.y, v.x, v.y) < VENT_R + e.r * 0.5) hitEnemy(e, 3, Math.atan2(e.y - v.y, e.x - v.x))
    }
  }

  function collectPickup(p: Pickup) {
    const w = world.current
    const t = w.tank
    if (p.kind === 'repair') {
      if (t.hp < t.maxHp) {
        t.hp += 1
        setHp({ hp: t.hp, max: t.maxHp })
        fx.text(t.x, t.y - 30, '+1 HP', '#86efac', 18)
      } else {
        w.score += 100
        w.stats.score = w.score
        setScore(w.score)
        fx.text(t.x, t.y - 30, '+100', '#fef08a', 18)
      }
      fx.ring(p.x, p.y, { color: '#4ade80', maxR: 44, life: 0.35 })
    } else {
      w.overdrive = OVERDRIVE
      fx.text(t.x, t.y - 30, 'OVERDRIVE!', '#67e8f9', 20)
      fx.ring(t.x, t.y, { color: '#22d3ee', maxR: 60, life: 0.4, width: 4 })
    }
    fx.burst(p.x, p.y, { count: 14, color: p.kind === 'repair' ? ['#86efac', '#ffffff'] : ['#67e8f9', '#fef08a'], speed: 180, gravity: 0, shape: 'square' })
    sfx.power()
    haptic.success()
  }

  function pickKind(): EnemyKind {
    const wv = world.current.wave
    const roll = Math.random()
    if (wv >= 6 && roll > 0.85) return 'splitter'
    if (wv >= 9 && roll > 0.77 && countKind('charger') < 4) return 'charger'
    if (wv >= 7 && roll > 0.69 && countKind('mortar') < 4) return 'mortar'
    if (wv >= 4 && roll < 0.12) return 'brute'
    if (wv >= 3 && roll < 0.27) return 'spitter'
    if (wv >= 2 && roll < 0.5) return 'runner'
    return 'crawler'
  }

  function damageTank(fromX: number, fromY: number) {
    const w = world.current
    const t = w.tank
    if (t.inv > 0 || phaseRef.current !== 'play') return
    if (import.meta.env.DEV && devGod.current) return
    t.hp -= 1
    t.inv = 0.9
    const a = Math.atan2(t.y - fromY, t.x - fromX)
    t.vx += Math.cos(a) * 260
    t.vy += Math.sin(a) * 260
    setHp({ hp: t.hp, max: t.maxHp })
    fx.flash('#ef4444', 0.22)
    fx.shake(10, 0.3)
    fx.stop(0.08)
    fx.burst(t.x, t.y, { count: 14, color: ['#fde047', '#f97316', '#e5e7eb'], speed: 220, shape: 'spark' })
    sfx.hurt()
    haptic.heavy()
    if (t.hp <= 0) die()
  }

  function die() {
    const w = world.current
    const t = w.tank
    fx.explode(t.x, t.y, 2.2)
    fx.slowmo(1.1, 0.25)
    sfx.boom(1)
    sfx.lose()
    haptic.error()
    setPhaseBoth('dying')
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.score / 120 + w.wave * 2 + w.stats.bosses * 8)
      run.end({ score: w.score, cleared: w.wave >= 5, stats: { ...w.stats, score: w.score }, coins }, revive)
    }, 1300)
  }

  /** Ad revive: half HP back, a shockwave clears the slimes around the tank, brief invulnerability. */
  function revive() {
    const w = world.current
    const t = w.tank
    t.hp = Math.max(3, Math.ceil(t.maxHp / 2))
    t.inv = 2.5
    t.vx = 0
    t.vy = 0
    w.shots = []
    w.lobs = []
    w.vents = []
    for (const e of w.enemies) {
      const d = dist(e.x, e.y, t.x, t.y)
      const a = Math.atan2(e.y - t.y, e.x - t.x)
      if (!isBoss(e) && d < 170) {
        e.hp = 0
        fx.burst(e.x, e.y, { count: 10, color: [KIND_STYLE[e.kind].color, '#ffffff'], speed: 200, gravity: 0 })
      } else {
        e.kx += Math.cos(a) * 400
        e.ky += Math.sin(a) * 400
      }
    }
    // Revive clears don't count as kills.
    w.enemies = w.enemies.filter((e) => e.hp > 0)
    fx.ring(t.x, t.y, { color: '#a3e635', maxR: 170, life: 0.6, width: 6 })
    setHp({ hp: t.hp, max: t.maxHp })
    showBanner('REVIVED!', 'armor patched')
    setPhaseBoth('play')
  }

  function hitEnemy(e: Enemy, dmg: number, fromA: number) {
    e.hp -= dmg
    e.flash = 0.08
    const kb = e.kind === 'colossus' ? 12 : e.kind === 'boss' ? 30 : e.kind === 'brute' || (e.kind === 'charger' && e.mode === 2) ? 90 : 210
    e.kx += Math.cos(fromA) * kb
    e.ky += Math.sin(fromA) * kb
    fx.burst(e.x, e.y, { count: 5, color: KIND_STYLE[e.kind].color, speed: 150, angle: fromA, spread: 1.2, size: 3, gravity: 0 })
    if (e.hp > 0) {
      sfx.hit()
      haptic.light()
    }
  }

  function killEnemy(e: Enemy) {
    const w = world.current
    const style = KIND_STYLE[e.kind]
    const big = isBoss(e) ? 2.6 : e.kind === 'brute' ? 1.3 : 0.7
    fx.burst(e.x, e.y, { count: Math.round(14 * big), color: [style.color, style.dark, '#ffffff'], speed: 240 * big, size: 3.5, gravity: 0, drag: 2.5 })
    fx.ring(e.x, e.y, { color: style.color, maxR: e.r * 2.2, life: 0.3 })
    w.decals.push({ x: e.x, y: e.y, r: e.r * 1.4, color: style.dark, life: 12 })
    if (w.decals.length > 40) w.decals.shift()
    fx.shake(2 + big * 3, 0.15)
    if (isBoss(e)) {
      fx.explode(e.x, e.y, 2.5)
      fx.flash('#fff', 0.3)
      fx.stop(0.25)
      fx.slowmo(0.8, 0.3)
      sfx.boom(1)
      haptic.heavy()
      w.stats.bosses += 1
      setBoss(null)
      if (e.kind === 'colossus') {
        // Bigger payout: patch armour and drop both power-ups.
        const t = w.tank
        t.hp = Math.min(t.maxHp, t.hp + 2)
        setHp({ hp: t.hp, max: t.maxHp })
        w.pickups.push({ x: e.x - 20, y: e.y, kind: 'overdrive', life: 14 }, { x: e.x + 20, y: e.y, kind: 'repair', life: 14 })
        fx.explode(e.x, e.y, 1.6, ['#fb923c', '#fde68a', '#78716c', '#fff7ed'])
        showBanner('COLOSSUS FELLED!', '+2 HP · loot dropped')
        window.setTimeout(() => sfx.win(), 260)
        window.setTimeout(() => sfx.combo(), 700)
      } else showBanner('BOSS DOWN!', `${w.stats.bosses} crown${w.stats.bosses > 1 ? 's' : ''} taken`)
      void trackEvent('action_milestone', { game_id: 'tank', kind: 'boss', value: w.wave })
    } else {
      if (e.kind === 'splitter') {
        for (const s of [-1, 1]) spawnEnemy('crawler', { x: e.x + s * 10, y: e.y + s * 6 })
        const kids = w.enemies.slice(-2)
        for (const k of kids) {
          k.kx = (k.x - e.x) * 30
          k.ky = (k.y - e.y) * 30
        }
      }
      fx.stop(e.kind === 'brute' ? 0.05 : 0.02)
      sfx.pop()
      haptic.medium()
      if (w.wave >= 3 && w.pickups.length < 2 && Math.random() < 0.035) {
        const kind: PickupKind = w.tank.hp < w.tank.maxHp && Math.random() < 0.5 ? 'repair' : 'overdrive'
        w.pickups.push({ x: e.x, y: e.y, kind, life: 9 })
      }
    }
    w.score += e.value
    w.stats.kills += 1
    w.stats.score = w.score
    fx.text(e.x, e.y - e.r, `+${e.value}`, '#fef08a', e.kind === 'boss' ? 26 : 14)
    setScore(w.score)
    run.update(w.stats)
    if (!w.bestShown && w.score > w.best) {
      w.bestShown = true
      showBanner('NEW BEST!', `beat ${w.best}`)
      sfx.levelUp()
    }
  }

  function explodeAt(x: number, y: number, dmg: number) {
    const w = world.current
    fx.explode(x, y, 0.6, ['#fde047', '#fb923c', '#ffffff'])
    sfx.boom(0.25)
    for (const e of w.enemies) {
      if (e.hp <= 0) continue
      if (dist(e.x, e.y, x, y) < 48 + e.r) hitEnemy(e, Math.ceil(dmg * 0.6), Math.atan2(e.y - y, e.x - x))
    }
  }

  function chooseUpgrade(u: Upgrade) {
    const w = world.current
    const t = w.tank
    if (u.id === 'damage') w.up.damage += 1
    if (u.id === 'rate') w.up.rate *= 1.2
    if (u.id === 'speed') w.up.speed *= 1.15
    if (u.id === 'pierce') w.up.pierce += 1
    if (u.id === 'twin') w.up.twin += 1
    if (u.id === 'blast') w.up.blast = 1
    if (u.id === 'armor') {
      t.maxHp += 1
      t.hp = t.maxHp
    }
    // Repair kit upgrade patches 1 HP every few waves.
    if (w.repairEvery > 0 && w.wave % w.repairEvery === 0 && t.hp < t.maxHp) {
      t.hp += 1
      fx.text(t.x, t.y - 30, '+1 REPAIR', '#a3e635', 18)
    }
    setHp({ hp: t.hp, max: t.maxHp })
    sfx.power()
    haptic.success()
    setChoices([])
    setPhaseBoth('play')
    beginWave()
  }

  function fire(target: Enemy | null) {
    const w = world.current
    const t = w.tank
    const n = w.up.twin
    const spacing = 0.09
    for (let i = 0; i < n; i++) {
      const a = t.turret + (i - (n - 1) / 2) * spacing
      const mx = t.x + Math.cos(t.turret) * 24
      const my = t.y + Math.sin(t.turret) * 24
      w.shells.push({ x: mx, y: my, vx: Math.cos(a) * 470, vy: Math.sin(a) * 470, life: 0.9, pierce: w.up.pierce, hits: new Set() })
    }
    t.recoil = 1
    t.vx -= Math.cos(t.turret) * 22
    t.vy -= Math.sin(t.turret) * 22
    const mx = t.x + Math.cos(t.turret) * 26
    const my = t.y + Math.sin(t.turret) * 26
    fx.burst(mx, my, { count: 6, color: ['#fde047', '#fb923c'], speed: 180, angle: t.turret, spread: 0.7, size: 2.5, life: 0.18, gravity: 0, shape: 'spark' })
    fx.burst(mx, my, { count: 3, color: ['#9ca3af', '#6b7280'], speed: 40, size: 5, life: 0.5, gravity: -20, drag: 3 })
    fx.shake(1.5, 0.06)
    sfx.shoot()
    if (target && isBoss(target)) haptic.light()
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

  function frame({ ctx, w: W, h: H, raw, t: time }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const t = w.tank
    const ph = phaseRef.current
    const dt = ph === 'upgrade' ? 0 : fx.step(raw)
    if (ph === 'upgrade') fx.step(0)
    const alive = t.hp > 0

    if (ph === 'play' && alive) {
      // Spawning
      if (w.toSpawn > 0) {
        w.spawnTimer -= dt
        if (w.spawnTimer <= 0) {
          const burst = Math.min(w.toSpawn, 1 + Math.floor(Math.random() * Math.min(3, 1 + w.wave / 3)))
          for (let i = 0; i < burst; i++) spawnEnemy(pickKind())
          w.toSpawn -= burst
          w.spawnTimer = Math.max(0.35, 1.3 - w.wave * 0.06)
        }
      } else if (w.bossPending) {
        w.bossPending = false
        const colossus = w.wave % 10 === 0
        spawnEnemy(colossus ? 'colossus' : 'boss')
        fx.shake(8, 0.5)
        sfx.boom(0.7)
        if (colossus) {
          // Arrival sting: rumble, double clang, roar.
          fx.shake(14, 0.9)
          fx.flash('#f97316', 0.2)
          window.setTimeout(() => sfx.clang(), 250)
          window.setTimeout(() => sfx.clang(), 450)
          window.setTimeout(() => sfx.boom(0.9), 700)
          haptic.heavy()
          showBanner('THE COLOSSUS', 'molten boss awakens')
        }
      } else if (w.enemies.length === 0 && w.lobs.length === 0) {
        setChoices(pickUpgrades(w))
        setPhaseBoth('upgrade')
        sfx.win()
        haptic.success()
      }

      // Driving
      let v = stick.vec()
      if (v.mag <= 0.1 && keys.size) {
        const kx = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0)
        const ky = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0)
        const km = Math.hypot(kx, ky)
        if (km) v = { x: kx / km, y: ky / km, mag: 1 }
      }
      const speed = 120 * w.up.speed
      if (v.mag > 0.1) {
        const target = Math.atan2(v.y, v.x)
        t.a += angleDiff(t.a, target) * Math.min(1, dt * 10)
        t.x += v.x * speed * dt
        t.y += v.y * speed * dt
        w.markDist += v.mag * speed * dt
        if (w.markDist > 9) {
          w.markDist = 0
          w.marks.push({ x: t.x, y: t.y, a: t.a, life: 4 })
          if (w.marks.length > 120) w.marks.shift()
        }
      }
      t.x += t.vx * dt
      t.y += t.vy * dt
      const damp = Math.exp(-8 * dt)
      t.vx *= damp
      t.vy *= damp
      t.x = clamp(t.x, 16, W - 16)
      t.y = clamp(t.y, 16, H - 16)
      t.inv = Math.max(0, t.inv - dt)
      t.recoil = Math.max(0, t.recoil - dt * 7)

      // Aim + fire
      let target: Enemy | null = null
      let best = 300
      for (const e of w.enemies) {
        const d = dist(e.x, e.y, t.x, t.y)
        if (d < best && e.x > -10 && e.x < W + 10 && e.y > -10 && e.y < H + 10) {
          best = d
          target = e
        }
      }
      if (target) {
        const aim = Math.atan2(target.y - t.y, target.x - t.x)
        t.turret += angleDiff(t.turret, aim) * Math.min(1, dt * 14)
        w.fireTimer -= dt
        if (w.fireTimer <= 0 && Math.abs(angleDiff(t.turret, aim)) < 0.3) {
          fire(target)
          w.fireTimer = 0.42 / (w.up.rate * (w.overdrive > 0 ? 1.8 : 1))
        }
      } else {
        w.fireTimer = Math.max(0, w.fireTimer - dt)
      }

      w.overdrive = Math.max(0, w.overdrive - dt)
      for (const p of w.pickups) {
        p.life -= dt
        if (p.life > 0 && dist(p.x, p.y, t.x, t.y) < 28) {
          p.life = 0
          collectPickup(p)
        }
      }
      w.pickups = w.pickups.filter((p) => p.life > 0)

      // Ember Wastes: lava vents open near the tank.
      if (w.biome === EMBER) {
        w.ventTimer -= dt
        if (w.ventTimer <= 0 && w.vents.length < 2) {
          const va = rand(0, Math.PI * 2)
          const vd = rand(40, 140)
          w.vents.push({ x: clamp(t.x + Math.cos(va) * vd, 30, W - 30), y: clamp(t.y + Math.sin(va) * vd, 30, H - 30), t: 0 })
          w.ventTimer = rand(3.5, 5.5)
          sfx.tick()
        }
      }
    }

    // Attract mode: slimes circle a parked tank that sweeps its turret.
    if (ph === 'idle') {
      const kinds: EnemyKind[] = ['crawler', 'runner', 'brute', 'spitter', 'splitter']
      if (w.enemies.length < kinds.length) spawnEnemy(kinds[w.enemies.length])
      t.x = W / 2
      t.y = H / 2
      t.turret += raw * 0.8
      for (const e of w.enemies) {
        const a = Math.atan2(e.y - t.y, e.x - t.x)
        const d = dist(e.x, e.y, t.x, t.y)
        const want = 110 + (e.id % 3) * 35
        const sp = e.speed * 0.6
        e.x += (Math.cos(a + Math.PI / 2) * sp + Math.cos(a) * (want - d) * 0.8) * raw
        e.y += (Math.sin(a + Math.PI / 2) * sp + Math.sin(a) * (want - d) * 0.8) * raw
        e.wobble += raw * (e.speed / 12)
      }
    }

    // Enemies
    if (ph === 'play' || ph === 'dying') {
      for (const e of w.enemies) {
        const a = Math.atan2(t.y - e.y, t.x - e.x)
        const d = dist(e.x, e.y, t.x, t.y)
        const onScreen = e.x > 10 && e.x < W - 10 && e.y > 10 && e.y < H - 10
        let ang = a
        let mv = e.speed
        if (e.kind === 'spitter' && d < 150) mv = -e.speed * 0.6
        if (e.kind === 'mortar') mv = d < 150 ? -e.speed * 0.7 : d < 230 ? 0 : e.speed
        if (e.kind === 'colossus' && d < 110) mv = 0
        if (e.kind === 'charger') {
          if (e.mode === 0) {
            e.mt -= dt
            if (e.mt <= 0 && d < 220 && onScreen && alive && ph === 'play') {
              e.mode = 1
              e.mt = 0.85
              e.dir = a
              sfx.tick()
            }
          } else if (e.mode === 1) {
            mv = 0
            e.mt -= dt
            if (e.mt <= 0) {
              e.mode = 2
              e.mt = 0.55
              sfx.whoosh()
            }
          } else {
            ang = e.dir
            mv = 380
            e.mt -= dt
            if (Math.random() < 0.4) fx.burst(e.x, e.y + e.r * 0.6, { count: 1, color: ['#d6d3d1', '#a8a29e'], speed: 30, size: 4, life: 0.45, gravity: -10, drag: 3 })
            if (e.mt <= 0) {
              e.mode = 0
              e.mt = rand(2.2, 3.2)
            }
          }
        }
        if (!alive) mv = -20
        e.x += (Math.cos(ang) * mv + e.kx) * dt
        e.y += (Math.sin(ang) * mv + e.ky) * dt
        const kd = Math.exp(-9 * dt)
        e.kx *= kd
        e.ky *= kd
        e.wobble += dt * (e.speed / 12)
        e.flash = Math.max(0, e.flash - raw)
        if ((e.kind === 'spitter' || e.kind === 'boss') && alive) {
          e.shoot -= dt
          if (e.shoot <= 0 && d < 380) {
            if (e.kind === 'boss') {
              const n = 10
              const off = rand(0, 1)
              for (let i = 0; i < n; i++) {
                const sa = ((i + off) / n) * Math.PI * 2
                w.shots.push({ x: e.x, y: e.y, vx: Math.cos(sa) * 140, vy: Math.sin(sa) * 140, life: 3 })
              }
              e.shoot = 2.4
              fx.ring(e.x, e.y, { color: '#f472b6', maxR: 60, life: 0.3 })
              sfx.boom(0.3)
              if (Math.random() < 0.6) for (let i = 0; i < 2; i++) spawnEnemy('runner')
            } else {
              w.shots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, life: 3 })
              e.shoot = rand(2.2, 3.2)
              sfx.tick()
            }
          }
        }
        if (e.kind === 'mortar' && alive && ph === 'play') {
          e.shoot -= dt
          if (e.shoot <= 0 && d < 340 && onScreen) {
            launchLob(e.x, e.y - e.r, t.x, t.y, 30, 1.25)
            e.shoot = rand(3.4, 4.4)
            sfx.thud()
          }
        }
        if (e.kind === 'colossus' && alive && ph === 'play') {
          if (e.mt > 0) {
            e.sub -= dt
            if (e.sub <= 0) {
              for (let k = 0; k < 5 && w.shots.length < 90; k++) {
                const sa = e.dir + (k / 5) * Math.PI * 2
                w.shots.push({ x: e.x, y: e.y, vx: Math.cos(sa) * 125, vy: Math.sin(sa) * 125, life: 3.2 })
              }
              e.dir += 0.21
              e.mt -= 1
              e.sub = 0.17
              sfx.tick()
            }
          }
          e.shoot -= dt
          if (e.shoot <= 0) {
            const atk = e.mode
            e.mode = (e.mode + 1) % 3
            e.shoot = 3.2
            fx.ring(e.x, e.y, { color: COLOSSUS_COLORS[atk], maxR: 90, life: 0.4, width: 4 })
            if (atk === 0) {
              e.mt = 7
              e.sub = 0
              e.dir = rand(0, Math.PI * 2)
              sfx.boom(0.3)
            } else if (atk === 1) {
              for (let k = 0; k < 4; k++) {
                const off = k ? rand(50, 110) : 0
                const oa = rand(0, Math.PI * 2)
                launchLob(e.x, e.y - e.r, t.x + Math.cos(oa) * off, t.y + Math.sin(oa) * off, 34, 1.3 + k * 0.15)
              }
              fx.shake(4, 0.2)
              sfx.thud()
            } else {
              if (w.enemies.length < 24) {
                spawnEnemy('charger', { x: e.x - 50, y: e.y + 10 })
                spawnEnemy('mortar', { x: e.x + 50, y: e.y + 10 })
              }
              fx.burst(e.x, e.y, { count: 16, color: ['#facc15', '#fb923c'], speed: 200, gravity: 0, shape: 'spark' })
              sfx.boom(0.4)
            }
          }
        }
        if (alive && d < e.r + 13) damageTank(e.x, e.y)
      }
      for (const l of w.lobs) {
        l.t += dt
        if (l.t >= l.dur) landLob(l)
      }
      w.lobs = w.lobs.filter((l) => l.t < l.dur)
      for (const v of w.vents) {
        const before = v.t
        v.t += dt
        if (before < VENT_WARN && v.t >= VENT_WARN) eruptVent(v)
      }
      w.vents = w.vents.filter((v) => v.t < VENT_WARN + 0.6)
      // Separation keeps the horde from stacking into one blob.
      const es = w.enemies
      for (let i = 0; i < es.length; i++) {
        for (let j = i + 1; j < es.length; j++) {
          const a = es[i]
          const b = es[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const min = a.r + b.r
          const d2 = dx * dx + dy * dy
          if (d2 > 0 && d2 < min * min) {
            const d = Math.sqrt(d2)
            const push = (min - d) / 2
            const wa = isBoss(a) ? 0.1 : 1
            const wb = isBoss(b) ? 0.1 : 1
            a.x -= (dx / d) * push * wa
            a.y -= (dy / d) * push * wa
            b.x += (dx / d) * push * wb
            b.y += (dy / d) * push * wb
          }
        }
      }
      if (boss !== null) {
        const b = w.enemies.find(isBoss)
        if (b) {
          const pct = Math.max(0, b.hp / b.max)
          if (Math.abs(pct - boss) > 0.01) setBoss(pct)
        }
      }
    }

    // Shells
    for (const s of w.shells) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.life -= dt
      if (s.x < -20 || s.x > W + 20 || s.y < -20 || s.y > H + 20) s.life = 0
      if (s.life <= 0) continue
      for (const e of w.enemies) {
        if (e.hp <= 0 || s.hits.has(e.id)) continue
        if (dist(s.x, s.y, e.x, e.y) < e.r + 4) {
          s.hits.add(e.id)
          const a = Math.atan2(s.vy, s.vx)
          hitEnemy(e, w.up.damage, a)
          if (w.up.blast) explodeAt(s.x, s.y, w.up.damage)
          if (s.pierce > 0) s.pierce -= 1
          else {
            s.life = 0
            break
          }
        }
      }
    }
    w.shells = w.shells.filter((s) => s.life > 0)
    for (const e of w.enemies) if (e.hp <= 0) killEnemy(e)
    w.enemies = w.enemies.filter((e) => e.hp > 0)

    for (const s of w.shots) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.life -= dt
      if (alive && ph === 'play' && dist(s.x, s.y, t.x, t.y) < 14) {
        s.life = 0
        damageTank(s.x, s.y)
      }
    }
    w.shots = w.shots.filter((s) => s.life > 0)
    for (const m of w.marks) m.life -= dt
    w.marks = w.marks.filter((m) => m.life > 0)
    for (const d of w.decals) d.life -= dt
    w.decals = w.decals.filter((d) => d.life > 0)

    // ── Draw ─────────────────────────────────────
    // Biome ground is cached offscreen; a zone change cross-fades over ~1.6 s.
    const dpr = ctx.getTransform().a || 1
    w.biomeFade = Math.min(1, w.biomeFade + raw / 1.6)
    if (w.biomeFade < 1) {
      ctx.drawImage(biomeLayer(w.prevBiome, W, H, dpr), 0, 0, W, H)
      ctx.globalAlpha = w.biomeFade
    }
    ctx.drawImage(biomeLayer(w.biome, W, H, dpr), 0, 0, W, H)
    ctx.globalAlpha = 1
    if (w.biome === EMBER) {
      ctx.globalAlpha = w.biomeFade
      for (const pts of emberCracks(W, H)) {
        const p = pts[2]
        glow(ctx, p.x, p.y, 34, '#f97316', 0.18 + 0.14 * Math.sin(time * 2 + p.x))
      }
      ctx.globalAlpha = 1
    }
    const biome = BIOMES[w.biome]
    stepAmbient(w.motes, biome.ambient, W, H, dt)
    fx.applyShake(ctx)

    for (const d of w.decals) {
      ctx.globalAlpha = Math.min(0.45, d.life / 6)
      ctx.fillStyle = d.color
      ctx.beginPath()
      ctx.ellipse(d.x, d.y, d.r, d.r * 0.75, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    for (const m of w.marks) {
      ctx.globalAlpha = Math.min(0.3, m.life / 6)
      ctx.save()
      ctx.translate(m.x, m.y)
      ctx.rotate(m.a)
      ctx.fillStyle = biome.mark
      ctx.fillRect(-3, -12, 6, 4)
      ctx.fillRect(-3, 8, 6, 4)
      ctx.restore()
    }
    ctx.globalAlpha = 1

    for (const v of w.vents) drawVent(ctx, v.x, v.y, VENT_R, Math.min(1, v.t / VENT_WARN), v.t - VENT_WARN, time)
    for (const l of w.lobs) drawLobZone(ctx, l.tx, l.ty, l.r, l.t / l.dur, time)
    for (const p of w.pickups) drawPickup(ctx, p.kind, p.x, p.y, time, p.life < 2.5)
    for (const e of w.enemies) {
      if (e.kind === 'charger' && e.mode === 1) drawDashLane(ctx, e.x, e.y, e.dir, 1 - e.mt / 0.85, time)
    }

    for (const e of w.enemies) {
      const st = KIND_STYLE[e.kind]
      if (e.kind === 'colossus') {
        const charge = ph === 'play' && e.shoot < 0.8 ? 1 - e.shoot / 0.8 : 0
        drawColossus(ctx, e.x, e.y, e.r, { flash: e.flash > 0, wobble: e.wobble, look: Math.atan2(t.y - e.y, t.x - e.x), t: time, charge, chargeColor: COLOSSUS_COLORS[e.mode] })
        continue
      }
      const winding = e.kind === 'charger' && e.mode === 1
      const jit = winding ? Math.sin(time * 60) * 1.5 : 0
      // Boss swells and glows right before its ring volley.
      const charging = e.kind === 'boss' && e.shoot < 0.6 && ph === 'play'
      const squash = 1 + Math.sin(e.wobble) * 0.08 + (charging ? Math.sin(time * 40) * 0.05 : 0)
      if (charging) glow(ctx, e.x, e.y, e.r * 2.2, '#f472b6', 0.5)
      ctx.save()
      ctx.translate(e.x + jit, e.y)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(2, e.r * 0.7, e.r, e.r * 0.4, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.scale(squash, 2 - squash)
      // Kind details behind the body: brute horns, runner spikes.
      if (e.kind === 'brute' || e.kind === 'boss') {
        ctx.fillStyle = '#f5f5f4'
        for (const s of [-1, 1]) {
          ctx.beginPath()
          ctx.moveTo(s * e.r * 0.45, -e.r * 0.7)
          ctx.quadraticCurveTo(s * e.r * 1.05, -e.r * 1.0, s * e.r * 0.9, -e.r * 1.35)
          ctx.lineTo(s * e.r * 0.75, -e.r * 0.6)
          ctx.closePath()
          ctx.fill()
        }
      } else if (e.kind === 'runner') {
        ctx.fillStyle = st.dark
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k - 2) * 0.45
          ctx.beginPath()
          ctx.moveTo(Math.cos(a - 0.18) * e.r * 0.9, Math.sin(a - 0.18) * e.r * 0.9)
          ctx.lineTo(Math.cos(a) * e.r * 1.45, Math.sin(a) * e.r * 1.45)
          ctx.lineTo(Math.cos(a + 0.18) * e.r * 0.9, Math.sin(a + 0.18) * e.r * 0.9)
          ctx.fill()
        }
      }
      const g = ctx.createRadialGradient(-e.r * 0.3, -e.r * 0.3, 1, 0, 0, e.r)
      const hot = winding && Math.floor(time * 12) % 2 === 0
      g.addColorStop(0, e.flash > 0 ? '#fff' : hot ? '#fca5a5' : st.color)
      g.addColorStop(1, e.flash > 0 ? '#fff' : hot ? '#b91c1c' : st.dark)
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, e.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      if (e.kind === 'splitter' && e.flash <= 0) {
        // Visible seam + twin nuclei hint that it will divide.
        ctx.strokeStyle = 'rgba(236,254,255,0.7)'
        ctx.lineWidth = 2
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(0, -e.r * 0.9)
        ctx.lineTo(0, e.r * 0.9)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = 'rgba(21,94,117,0.5)'
        ctx.beginPath()
        ctx.arc(-e.r * 0.45, e.r * 0.35, e.r * 0.2, 0, Math.PI * 2)
        ctx.arc(e.r * 0.45, e.r * 0.35, e.r * 0.2, 0, Math.PI * 2)
        ctx.fill()
      } else if (e.kind === 'spitter' && e.flash <= 0) {
        const open = e.shoot < 0.5 ? 1 : 0.4
        ctx.fillStyle = '#431407'
        ctx.beginPath()
        ctx.ellipse(0, e.r * 0.45, e.r * 0.28, e.r * 0.2 * open, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      // glossy highlight
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.ellipse(-e.r * 0.4, -e.r * 0.5, e.r * 0.28, e.r * 0.14, -0.6, 0, Math.PI * 2)
      ctx.fill()
      const look = Math.atan2(t.y - e.y, t.x - e.x)
      if (e.kind === 'mortar') drawMortarGear(ctx, e.r, look, ph === 'play' && e.shoot < 0.5 ? 1 - e.shoot / 0.5 : 0)
      else if (e.kind === 'charger') drawChargerGear(ctx, e.r, e.mode ? e.dir : look, winding)
      for (const side of [-1, 1]) {
        const ex = Math.cos(look + side * 0.5) * e.r * 0.45
        const ey = Math.sin(look + side * 0.5) * e.r * 0.45
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(ex, ey, e.r * 0.22, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#111'
        ctx.beginPath()
        ctx.arc(ex + Math.cos(look) * e.r * 0.08, ey + Math.sin(look) * e.r * 0.08, e.r * 0.11, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      if (e.kind === 'boss') drawCrown(ctx, e.x, e.y - e.r - 6, Math.sin(time * 3) * 0.15)
      else if (e.max > 2 && e.hp < e.max) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2, 3)
        ctx.fillStyle = st.color
        ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2 * (e.hp / e.max), 3)
      }
    }

    for (const s of w.shots) {
      glow(ctx, s.x, s.y, 12, '#f472b6', 0.6)
      ctx.fillStyle = '#fdf2f8'
      ctx.beginPath()
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const l of w.lobs) {
      const p = l.t / l.dur
      drawLobShell(ctx, l.sx + (l.tx - l.sx) * p, l.sy + (l.ty - l.sy) * p, Math.sin(Math.PI * p) * 90, time)
    }

    const shellCol = w.overdrive > 0 ? '#67e8f9' : '#fde047'
    for (const s of w.shells) {
      ctx.strokeStyle = shellCol
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(s.x - s.vx * 0.025, s.y - s.vy * 0.025)
      ctx.stroke()
      glow(ctx, s.x, s.y, 9, shellCol, 0.6)
    }

    if (alive && !(t.inv > 0 && Math.floor(time * 16) % 2 === 0)) {
      ctx.save()
      ctx.translate(t.x, t.y)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(3, 5, 20, 16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.rotate(t.a)
      // treads with rolling links
      ctx.fillStyle = '#1f2414'
      ctx.fillRect(-17, -15, 34, 7)
      ctx.fillRect(-17, 8, 34, 7)
      ctx.fillStyle = '#4b5232'
      const roll = (w.markDist / 9) * 6
      for (let k = 0; k < 6; k++) {
        const lx = -16 + ((k * 6 + roll) % 34)
        ctx.fillRect(lx, -15, 2, 7)
        ctx.fillRect(lx, 8, 2, 7)
      }
      const hull = ctx.createLinearGradient(0, -10, 0, 10)
      hull.addColorStop(0, '#8fb339')
      hull.addColorStop(1, '#4d6b17')
      ctx.fillStyle = hull
      ctx.beginPath()
      ctx.roundRect(-15, -10, 30, 20, 5)
      ctx.fill()
      ctx.strokeStyle = '#a3c45a'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(-12, -8, 24, 4)
      ctx.rotate(t.turret - t.a)
      const rec = t.recoil * 5
      ctx.fillStyle = '#4d6b17'
      ctx.fillRect(4 - rec, -3.5, 22, 7)
      ctx.fillStyle = '#334a0c'
      ctx.fillRect(22 - rec, -4.5, 5, 9)
      ctx.fillStyle = '#556b2f'
      ctx.beginPath()
      ctx.arc(-rec * 0.3, 0, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#a3c45a'
      ctx.stroke()
      ctx.fillStyle = '#2f3d10'
      ctx.beginPath()
      ctx.arc(-rec * 0.3 - 2, 0, 3.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      if (w.overdrive > 0) {
        ctx.strokeStyle = '#22d3ee'
        ctx.globalAlpha = 0.8
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(t.x, t.y, 26, -Math.PI / 2, -Math.PI / 2 + (w.overdrive / OVERDRIVE) * Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    drawAmbient(ctx, w.motes, biome.ambient)
    fx.draw(ctx)
    ctx.restore()
    stick.draw(ctx)
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  if (import.meta.env.DEV) {
    // Dev-only skips for screenshots: __en3tank(wave, god?) jumps to a wave; __en3tankSpawn(kind) / __en3tankPick(kind).
    const win = window as unknown as Record<string, unknown>
    win.__en3tank = (wv: number, god = true) => {
      if (phaseRef.current !== 'play') return 'not playing'
      const w = world.current
      devGod.current = god
      w.enemies = []
      w.shots = []
      w.lobs = []
      w.vents = []
      w.toSpawn = 0
      w.bossPending = false
      w.wave = Math.max(0, wv - 1)
      w.up.damage = Math.max(w.up.damage, 1 + Math.floor(wv / 3))
      setBoss(null)
      beginWave()
      return `wave ${w.wave}`
    }
    win.__en3tankSpawn = (k: EnemyKind) => spawnEnemy(k)
    win.__en3tankPick = (k: PickupKind) => {
      const t = world.current.tank
      world.current.pickups.push({ x: t.x + 60, y: t.y, kind: k, life: 30 })
    }
  }

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
                <div className="action-hud__score">{score}</div>
                <div className="action-hud__small">Wave {wave}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hearts">
                  {'❤'.repeat(Math.max(0, hp.hp))}
                  <span style={{ opacity: 0.3 }}>{'❤'.repeat(Math.max(0, hp.max - hp.hp))}</span>
                </span>
              </div>
            </div>
          )}
          {boss !== null && phase === 'play' ? (
            <div className="tank-bossbar" aria-label="Boss health">
              <span style={{ width: `${Math.round(boss * 100)}%` }} />
            </div>
          ) : null}
          {zone && phase === 'play' ? (
            <div className="tank-zone" key={zone.key} style={{ '--zone': zone.color } as CSSProperties} onAnimationEnd={() => setZone(null)}>
              <small>New zone</small>
              {zone.name}
              <em>{zone.sub}</em>
            </div>
          ) : null}
          {banner && phase === 'play' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'upgrade' && (
            <div className="tank-upgrade" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Wave {wave} cleared!</h3>
              <p>Pick an upgrade</p>
              <div className="tank-upgrade__list">
                {choices.map((u) => (
                  <button key={u.id} type="button" className="tank-upgrade__card" onClick={() => chooseUpgrade(u)}>
                    <span className="tank-upgrade__icon">{u.icon}</span>
                    <strong>{u.label}</strong>
                    <span>{u.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === 'idle' && (
            <ActionIdle
              game="tank"
              icon={meta.icon}
              title={meta.title}
              hint="Drag anywhere to drive. Your turret aims and fires by itself — keep moving and kite the horde."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={wave >= 5 ? 'Arena veteran!' : 'Tank destroyed'}
            subtitle={`Score ${score} · Wave ${wave}`}
            celebrate={wave >= 5}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
