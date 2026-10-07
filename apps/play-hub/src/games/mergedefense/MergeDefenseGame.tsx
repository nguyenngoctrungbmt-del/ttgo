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
import { MAX_TIER, TIER_BASE, UNIT_COLOR, UNIT_NAME, UNIT_TYPES, drawEnemy, drawUnit, type EnemyKind, type UnitType } from './art'
import '../../shared/action/action.css'
import './mergedefense.css'

const meta = getGame('mergedefense')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Unit = { type: UnitType; tier: number; cd: number; recoil: number; pop: number; frozen: number; warn: number }
type Enemy = {
  id: number
  kind: EnemyKind
  s: number
  hp: number
  max: number
  speed: number
  r: number
  slowT: number
  slowK: number
  flash: number
  armor: number
  coin: number
  boss: boolean
  gold: boolean
  ability: number
  enraged: boolean
  dead: boolean
}
type Shot = { x: number; y: number; target: Enemy; kind: UnitType; dmg: number; tier: number; tx: number; ty: number }
type Bolt = { pts: { x: number; y: number }[]; life: number }
type MergeFx = { fx: number; fy: number; tx: number; ty: number; t: number; type: UnitType; tier: number }
type WaveState = 'spawn' | 'fight' | 'break'

const COLS = 5
const ROWS = 3
const PATH: [number, number][] = [
  [-0.06, 0.14],
  [0.9, 0.14],
  [0.9, 0.5],
  [0.1, 0.5],
  [0.1, 0.86],
  [0.86, 0.86],
]
const PATH_LEN = 1000

const BASE: Record<UnitType, { dmg: number; rate: number; speed: number }> = {
  archer: { dmg: 7, rate: 1.6, speed: 760 },
  mage: { dmg: 10, rate: 0.95, speed: 480 },
  cannon: { dmg: 26, rate: 0.5, speed: 420 },
  frost: { dmg: 4, rate: 1.1, speed: 560 },
  lightning: { dmg: 8, rate: 0.8, speed: 0 },
}

const KIND: Record<EnemyKind, { hp: number; speed: number; r: number; coin: number; armor?: number; boss?: boolean; name: string }> = {
  grunt: { hp: 1, speed: 52, r: 13, coin: 3, name: 'Slime' },
  runner: { hp: 0.55, speed: 95, r: 11, coin: 3, name: 'Imp' },
  tank: { hp: 3.2, speed: 34, r: 16, coin: 6, name: 'Brute' },
  splitter: { hp: 1.4, speed: 48, r: 15, coin: 4, name: 'Splitter' },
  shield: { hp: 2, speed: 44, r: 15, coin: 6, armor: 0.35, name: 'Knight' },
  mini: { hp: 10, speed: 38, r: 21, coin: 25, name: 'Horned Slime' },
  ogre: { hp: 26, speed: 30, r: 27, coin: 80, boss: true, name: 'Ogre King' },
  witch: { hp: 22, speed: 32, r: 25, coin: 80, boss: true, name: 'Hex Witch' },
  golem: { hp: 30, speed: 27, r: 28, coin: 80, boss: true, name: 'Stone Golem' },
}

const UNLOCKS: [number, EnemyKind][] = [
  [3, 'runner'],
  [6, 'tank'],
  [8, 'splitter'],
  [12, 'shield'],
]

type World = {
  slots: (Unit | null)[]
  enemies: Enemy[]
  shots: Shot[]
  bolts: Bolt[]
  merges: MergeFx[]
  nextId: number
  coins: number
  summons: number
  power: Record<UnitType, number>
  lives: number
  invuln: number
  wave: number
  wstate: WaveState
  spawnLeft: number
  spawnT: number
  waveT: number
  breakT: number
  pool: EnemyKind[]
  goldRush: boolean
  score: number
  sndT: number
  bestTier: number
  clock: number
  stats: { score: number; wave: number; kills: number; bosses: number; tier: number; merges: number }
}

function freshWorld(): World {
  return {
    slots: Array.from({ length: COLS * ROWS }, () => null),
    enemies: [],
    shots: [],
    bolts: [],
    merges: [],
    nextId: 1,
    coins: 100,
    summons: 0,
    power: { archer: 0, mage: 0, cannon: 0, frost: 0, lightning: 0 },
    lives: 3,
    invuln: 0,
    wave: 0,
    wstate: 'break',
    spawnLeft: 0,
    spawnT: 0,
    waveT: 0,
    breakT: 2,
    pool: ['grunt'],
    goldRush: false,
    score: 0,
    sndT: 0,
    bestTier: 1,
    clock: 0,
    stats: { score: 0, wave: 0, kills: 0, bosses: 0, tier: 1, merges: 0 },
  }
}

const sprites = new Map<string, HTMLCanvasElement>()
function cached(key: string, dim: number, draw: (g: CanvasRenderingContext2D) => void) {
  const hit = sprites.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const c = document.createElement('canvas')
  c.width = Math.ceil(dim * dpr)
  c.height = Math.ceil(dim * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate(dim / 2, dim / 2)
  draw(g)
  sprites.set(key, c)
  if (sprites.size > 140) {
    const first = sprites.keys().next().value
    if (first) sprites.delete(first)
  }
  return c
}

function unitSprite(type: UnitType, tier: number, d: number) {
  const px = Math.round(d)
  return cached(`u|${type}|${tier}|${px}`, px * 1.3, (g) => drawUnit(g, type, tier, px))
}

function enemySprite(kind: EnemyKind, r: number) {
  const px = Math.round(r)
  return cached(`e|${kind}|${px}`, px * 3.4, (g) => drawEnemy(g, kind, px))
}

const ICONS: Record<UnitType, string> = {
  archer: 'M5 19 Q19 19 19 5 M5 19 L19 5 M15 5 h4 v4',
  mage: 'M12 3 L18 18 H6 Z M12 9 v0.1',
  cannon: 'M4 16 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0 M9 14 L19 7 l1.5 2.5 L11 17',
  frost: 'M12 3 v18 M4.5 7.5 l15 9 M19.5 7.5 l-15 9',
  lightning: 'M13 3 L6 13 h5 l-1 8 7 -10 h-5 Z',
}

export default function MergeDefenseGame() {
  const run = useActionRun('mergedefense')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ id: number; from: number; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null)
  const pathCache = useRef<{ w: number; h: number; pts: { x: number; y: number }[]; cum: number[]; len: number } | null>(null)
  const bgRef = useRef<{ c: HTMLCanvasElement; w: number; h: number } | null>(null)
  const lastEvent = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, wave: 0, coins: 0, cost: 10, lives: 3, power: { archer: 0, mage: 0, cannon: 0, frost: 0, lightning: 0 } as Record<UnitType, number>, full: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function summonCost() {
    return 10 + world.current.summons * 10
  }

  function powerCost(t: UnitType) {
    return 60 * (world.current.power[t] + 1)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, wave: w.wave, coins: w.coins, cost: summonCost(), lives: w.lives, power: { ...w.power }, full: w.slots.every((s) => s) })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const ax = 6
    const ay = 58
    const aw = W - 12
    const bottom = 76
    const ah = Math.max(180, Math.min(H * 0.4, H - ay - bottom - 3 * 60 - 20))
    const gridTop = ay + ah + 10
    const cs = Math.floor(Math.min((W - 24) / COLS, (H - gridTop - bottom - 6) / ROWS))
    const gx = Math.round((W - cs * COLS) / 2)
    return { W, H, ax, ay, aw, ah, gridTop, cs, gx }
  }

  function path() {
    const { W, H, ax, ay, aw, ah } = geo()
    const pc = pathCache.current
    if (pc && pc.w === W && pc.h === H) return pc
    const pts = PATH.map(([x, y]) => ({ x: ax + x * aw, y: ay + y * ah }))
    const cum = [0]
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
    const np = { w: W, h: H, pts, cum, len: cum[cum.length - 1] }
    pathCache.current = np
    return np
  }

  function posAt(s: number) {
    const p = path()
    const d = clamp(s / PATH_LEN, 0, 1) * p.len
    let i = 1
    while (i < p.cum.length - 1 && p.cum[i] < d) i++
    const seg = p.cum[i] - p.cum[i - 1] || 1
    const k = (d - p.cum[i - 1]) / seg
    const a = p.pts[i - 1]
    const b = p.pts[i]
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, dir: Math.sign(b.x - a.x) }
  }

  function slotXY(i: number) {
    const { gridTop, cs, gx } = geo()
    return { x: gx + (i % COLS) * cs + cs / 2, y: gridTop + Math.floor(i / COLS) * cs + cs / 2 }
  }

  // ── Units ───────────────────────────────────────
  function stat(u: Unit) {
    const b = BASE[u.type]
    const mult = Math.pow(1.9, u.tier - 1) * (1 + world.current.power[u.type] * 0.2) * (1 + run.level('power') * 0.08)
    return {
      dmg: b.dmg * mult,
      rate: b.rate * (1 + 0.1 * (u.tier - 1)),
      slow: Math.min(0.65, 0.35 + 0.05 * (u.tier - 1)),
      chain: 3 + Math.floor((u.tier - 1) / 2),
      splash: u.type === 'mage' ? 34 + u.tier * 2 : u.type === 'cannon' ? 48 + u.tier * 3 : 0,
    }
  }

  function summon() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    const cost = summonCost()
    const empty = w.slots.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0)
    if (w.coins < cost || !empty.length) {
      sfx.miss()
      haptic.error()
      return
    }
    w.coins -= cost
    w.summons += 1
    const i = empty[Math.floor(Math.random() * empty.length)]
    const type = UNIT_TYPES[Math.floor(Math.random() * UNIT_TYPES.length)]
    w.slots[i] = { type, tier: 1, cd: rand(0.2, 0.6), recoil: 0, pop: 1, frozen: 0, warn: 0 }
    const p = slotXY(i)
    fx.burst(p.x, p.y, { count: 16, color: [UNIT_COLOR[type], '#ffffff', '#fde047'], speed: 180, gravity: 120 })
    fx.ring(p.x, p.y, { color: '#ffffff', maxR: 40, life: 0.3 })
    sfx.power()
    haptic.light()
    pushHud()
  }

  function buyPower(t: UnitType) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    const cost = powerCost(t)
    if (w.coins < cost || w.power[t] >= 5) {
      sfx.miss()
      return
    }
    w.coins -= cost
    w.power[t] += 1
    w.slots.forEach((u, i) => {
      if (u && u.type === t) {
        const p = slotXY(i)
        fx.burst(p.x, p.y, { count: 10, color: [UNIT_COLOR[t], '#ffffff'], speed: 140, angle: -Math.PI / 2, spread: 1.4, gravity: -50 })
        u.pop = 0.6
      }
    })
    fx.text(size.current.w / 2, geo().gridTop - 4, `${UNIT_NAME[t]} power ${w.power[t]}!`, '#fde047', 16)
    sfx.levelUp()
    haptic.medium()
    pushHud()
  }

  function mergeUnits(from: number, to: number) {
    const w = world.current
    const a = w.slots[from]!
    const b = w.slots[to]!
    const pa = slotXY(from)
    const pb = slotXY(to)
    w.merges.push({ fx: pa.x, fy: pa.y, tx: pb.x, ty: pb.y, t: 0, type: a.type, tier: a.tier })
    w.slots[from] = null
    const tier = b.tier + 1
    const type = UNIT_TYPES[Math.floor(Math.random() * UNIT_TYPES.length)]
    w.slots[to] = { type, tier, cd: 0.3, recoil: 0, pop: 1, frozen: 0, warn: 0 }
    w.stats.merges += 1
    const { cs } = geo()
    fx.burst(pb.x, pb.y, { count: 18 + tier * 4, color: [TIER_BASE[tier - 1], '#ffffff', UNIT_COLOR[type]], speed: 180 + tier * 25, shape: 'spark', gravity: 60 })
    fx.burst(pb.x, pb.y, { count: 10, color: [TIER_BASE[tier - 1]], speed: 120, gravity: 300, size: 4 })
    fx.ring(pb.x, pb.y, { color: TIER_BASE[tier - 1], maxR: cs * (0.7 + tier * 0.08), life: 0.35, width: 4 })
    fx.text(pb.x, pb.y - cs * 0.55, `${UNIT_NAME[type]} T${tier}`, '#ffffff', 15 + tier)
    sfx.pop()
    sfx.score(Math.min(10, tier * 2))
    if (tier >= 4) {
      sfx.combo()
      fx.shake(2 + tier, 0.2)
      fx.stop(0.05)
      haptic.heavy()
    } else haptic.medium()
    if (tier > w.bestTier) {
      w.bestTier = tier
      w.stats.tier = tier
      if (tier >= 3) {
        setBanner({ key: Date.now(), text: `NEW: Tier ${tier}!`, sub: tier < MAX_TIER ? `next: tier ${tier + 1}` : 'maximum power!' })
        sfx.levelUp()
        fx.flash('#fef9c3', 0.12)
      }
    }
    run.update(w.stats)
    pushHud()
  }

  // ── Enemies & waves ─────────────────────────────
  function waveHp(n: number) {
    return 18 * Math.pow(1.25, n - 1) + 6 * (n - 1)
  }

  function spawnEnemy(kind: EnemyKind, s = 0, hpMul = 1) {
    const w = world.current
    const k = KIND[kind]
    const hp = waveHp(Math.max(1, w.wave)) * k.hp * hpMul
    const e: Enemy = {
      id: w.nextId++,
      kind,
      s,
      hp,
      max: hp,
      speed: k.speed * rand(0.92, 1.08) * Math.min(1.4, 1 + w.wave * 0.012),
      r: k.r,
      slowT: 0,
      slowK: 0,
      flash: 0,
      armor: k.armor ?? 0,
      coin: k.coin + Math.floor(w.wave / 2),
      boss: !!k.boss || kind === 'mini',
      gold: !k.boss && kind !== 'mini' && w.wave >= 2 && Math.random() < 0.03,
      ability: 4,
      enraged: false,
      dead: false,
    }
    w.enemies.push(e)
    return e
  }

  function startWave() {
    const w = world.current
    w.wave += 1
    w.stats.wave = w.wave
    w.wstate = 'spawn'
    w.spawnLeft = Math.min(28, 6 + Math.floor(w.wave * 1.4))
    w.spawnT = 0.3
    w.waveT = 0
    w.goldRush = w.wave % 7 === 0
    let sub = w.goldRush ? 'GOLD RUSH: double coins' : undefined
    for (const [at, kind] of UNLOCKS) {
      if (w.wave === at) {
        w.pool.push(kind)
        sub = `new enemy: ${KIND[kind].name}`
      }
    }
    if (w.wave % 10 === 0) {
      const bossKinds: EnemyKind[] = ['ogre', 'witch', 'golem']
      const kind = bossKinds[(w.wave / 10 - 1) % 3]
      spawnEnemy(kind, 0, 1 + Math.floor(w.wave / 30) * 0.5)
      w.spawnLeft = Math.floor(w.spawnLeft / 2)
      setBanner({ key: Date.now(), text: `BOSS: ${KIND[kind].name}`, sub: kind === 'witch' ? 'freezes your units' : kind === 'golem' ? 'summons minions' : 'enrages when hurt' })
      sfx.boom(0.6)
      fx.shake(8, 0.4)
      haptic.heavy()
    } else if (w.wave % 5 === 0) {
      spawnEnemy('mini')
      setBanner({ key: Date.now(), text: `WAVE ${w.wave}`, sub: 'mini-boss incoming' })
      sfx.ready()
    } else {
      setBanner({ key: Date.now(), text: `WAVE ${w.wave}`, sub })
      sfx.ready()
    }
    if (w.wave % 5 === 0 && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'mergedefense', kind: 'wave', value: w.wave })
    }
    run.update(w.stats)
    pushHud()
  }

  function pickKind(): EnemyKind {
    const pool = world.current.pool
    if (Math.random() < 0.45) return 'grunt'
    return pool[Math.floor(Math.random() * pool.length)]
  }

  function damage(e: Enemy, dmg: number, kind: UnitType) {
    if (e.dead) return
    const real = kind === 'lightning' ? dmg : dmg * (1 - e.armor)
    e.hp -= real
    e.flash = 0.08
    if (e.hp <= 0) kill(e)
  }

  function kill(e: Enemy) {
    const w = world.current
    e.dead = true
    const p = posAt(e.s)
    const play = phaseRef.current === 'play'
    const cols = e.kind === 'runner' ? ['#ef4444', '#fecaca'] : e.kind === 'tank' ? ['#9333ea', '#e9d5ff'] : e.kind === 'shield' ? ['#3b82f6', '#cbd5e1'] : e.kind === 'golem' ? ['#78716c', '#fb923c'] : ['#4ade80', '#bbf7d0', '#facc15']
    fx.burst(p.x, p.y, { count: e.boss ? 40 : 10, color: cols, speed: e.boss ? 320 : 170, gravity: 400, size: e.boss ? 5 : 3 })
    if (e.kind === 'splitter') {
      for (let i = 0; i < 2; i++) {
        const m = spawnEnemy('grunt', Math.max(0, e.s - 10 - i * 14), 0.4)
        m.r = 10
        m.speed = 70
        m.coin = 1
      }
    }
    if (!play) return
    const coin = Math.round((e.coin + (e.gold ? 25 : 0)) * (w.goldRush ? 2 : 1))
    w.coins += coin
    w.score += coin * 10
    w.stats.kills += 1
    w.stats.score = w.score
    if (e.gold || e.boss || coin >= 10) fx.text(p.x, p.y - 16, `+${coin}`, '#fde047', e.boss ? 22 : 14)
    if (e.gold) fx.burst(p.x, p.y, { count: 16, color: ['#fde047', '#fbbf24'], speed: 220, shape: 'square', size: 4, gravity: 300 })
    if (e.boss) {
      fx.explode(p.x, p.y, 2)
      fx.flash('#ffffff', 0.2)
      fx.slowmo(0.6, 0.35)
      sfx.boom(0.9)
      haptic.success()
      if (KIND[e.kind].boss) {
        w.stats.bosses += 1
        setBanner({ key: Date.now() + 1, text: 'BOSS DEFEATED!', sub: `+${coin} coins` })
        sfx.win()
        void trackEvent('action_milestone', { game_id: 'mergedefense', kind: 'boss', value: w.wave })
      }
    } else if (w.sndT <= 0) {
      sfx.pop()
      w.sndT = 0.05
    }
    run.update(w.stats)
    pushHud()
  }

  function leak(e: Enemy) {
    const w = world.current
    e.dead = true
    if (phaseRef.current !== 'play') return
    if (w.invuln > 0) return
    const cost = KIND[e.kind].boss || e.kind === 'mini' ? 2 : 1
    w.lives -= cost
    const p = posAt(PATH_LEN)
    fx.explode(p.x, p.y, 0.8, ['#ef4444', '#fca5a5', '#ffffff'])
    fx.text(p.x - 20, p.y - 30, `-${cost}`, '#fca5a5', 22)
    fx.flash('#ef4444', 0.25)
    fx.shake(8, 0.3)
    sfx.hurt()
    haptic.heavy()
    pushHud()
    if (w.lives <= 0) die()
  }

  // ── Lifecycle ───────────────────────────────────
  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.lives = 3 + run.level('lives')
    w.coins = 100 + run.level('purse') * 25
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'DEFEND THE CASTLE', sub: 'summon units, merge twins' })
    sfx.ready()
    pushHud()
  }

  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    drag.current = null
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.4)
    fx.shake(14, 0.5)
    fx.slowmo(1, 0.3)
    fx.stop(0.12)
    sfx.lose()
    haptic.error()
    const p = posAt(PATH_LEN)
    fx.explode(p.x, p.y, 2, ['#ef4444', '#f97316', '#ffffff'])
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.wave * 1.5 + w.stats.bosses * 5 + w.stats.kills / 40)
      run.end({ score: w.score, cleared: w.stats.bosses >= 1, stats: { ...w.stats }, coins }, revive)
      pushHud()
    }, 1200)
  }

  /** Revive: blast every regular enemy, push bosses back, restore lives, brief shield. */
  function revive() {
    const w = world.current
    for (const e of w.enemies) {
      if (KIND[e.kind].boss) {
        e.s = 0
        continue
      }
      const p = posAt(e.s)
      fx.burst(p.x, p.y, { count: 12, color: ['#fde047', '#ffffff'], speed: 200, gravity: 200 })
      e.dead = true
    }
    w.enemies = w.enemies.filter((e) => !e.dead)
    w.shots = []
    w.lives = Math.max(w.lives, 2)
    w.invuln = 3
    fx.flash('#fde047', 0.2)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'enemies cleared · castle shielded' })
    setPhaseBoth('play')
    pushHud()
  }

  // ── Input ───────────────────────────────────────
  function slotAt(x: number, y: number) {
    const { gridTop, cs, gx } = geo()
    const c = Math.floor((x - gx) / cs)
    const r = Math.floor((y - gridTop) / cs)
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1
    return r * COLS + c
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    const i = slotAt(p.x, p.y)
    if (i < 0 || !world.current.slots[i]) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, from: i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false }
    sfx.tap()
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const p = localPoint(e, e.currentTarget)
    d.x = p.x
    d.y = p.y
    if (Math.hypot(p.x - d.sx, p.y - d.sy) > 8) d.moved = true
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    const w = world.current
    const to = slotAt(d.x, d.y)
    if (to < 0 || to === d.from || phaseRef.current !== 'play') return
    const a = w.slots[d.from]
    const b = w.slots[to]
    if (!a) return
    if (b && b.type === a.type && b.tier === a.tier && a.tier < MAX_TIER) mergeUnits(d.from, to)
    else {
      w.slots[to] = a
      w.slots[d.from] = b
      a.pop = 0.4
      sfx.move()
    }
  }

  // ── Tick ────────────────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    w.sndT -= raw
    w.invuln = Math.max(0, w.invuln - dt)

    if (ph === 'play') {
      w.clock += dt
      if (w.wstate === 'break') {
        w.breakT -= dt
        if (w.breakT <= 0) startWave()
      } else {
        w.waveT += dt
        if (w.wstate === 'spawn') {
          w.spawnT -= dt
          if (w.spawnT <= 0 && w.spawnLeft > 0) {
            spawnEnemy(pickKind())
            w.spawnLeft -= 1
            w.spawnT = Math.max(0.42, 1.0 - w.wave * 0.02)
          }
          if (w.spawnLeft <= 0) w.wstate = 'fight'
        } else if (w.enemies.length === 0 || w.waveT > 45) {
          const bonus = 15 + w.wave * 3
          w.coins += bonus
          w.score += w.wave * 50
          w.stats.score = w.score
          fx.text(size.current.w / 2, geo().ay + 30, `WAVE CLEAR +${bonus}`, '#fde047', 18)
          sfx.match()
          w.wstate = 'break'
          w.breakT = 2.5
          run.update(w.stats)
          pushHud()
        }
      }
    } else if (ph === 'idle') {
      // attract mode: a small garrison holds off slimes
      if (!w.slots.some((s) => s)) {
        w.slots[6] = { type: 'archer', tier: 2, cd: 0, recoil: 0, pop: 0, frozen: 0, warn: 0 }
        w.slots[7] = { type: 'cannon', tier: 3, cd: 0.5, recoil: 0, pop: 0, frozen: 0, warn: 0 }
        w.slots[8] = { type: 'frost', tier: 1, cd: 0.2, recoil: 0, pop: 0, frozen: 0, warn: 0 }
        w.slots[2] = { type: 'mage', tier: 2, cd: 0.3, recoil: 0, pop: 0, frozen: 0, warn: 0 }
        w.slots[12] = { type: 'lightning', tier: 1, cd: 0.6, recoil: 0, pop: 0, frozen: 0, warn: 0 }
        w.wave = 3
      }
      w.spawnT -= raw
      if (w.spawnT <= 0) {
        w.spawnT = 1.1
        spawnEnemy(Math.random() < 0.7 ? 'grunt' : 'runner', 0, 2)
      }
    }

    // enemies
    for (const e of w.enemies) {
      if (e.dead) continue
      e.flash = Math.max(0, e.flash - raw)
      if (e.slowT > 0) e.slowT -= dt
      const slow = e.slowT > 0 && e.kind !== 'shield' ? 1 - e.slowK : 1
      const enr = e.enraged ? 1.5 : 1
      e.s += e.speed * slow * enr * dt
      if (KIND[e.kind].boss && ph === 'play') {
        e.ability -= dt
        if (e.kind === 'ogre' && !e.enraged && e.hp < e.max * 0.5) {
          e.enraged = true
          const p = posAt(e.s)
          fx.text(p.x, p.y - 40, 'ENRAGED!', '#f87171', 20)
          sfx.boom(0.5)
          fx.shake(6, 0.3)
        } else if (e.kind === 'witch' && e.ability <= 0) {
          e.ability = 5
          const units = w.slots.map((u, i) => (u && u.frozen <= 0 && u.warn <= 0 ? i : -1)).filter((i) => i >= 0)
          if (units.length) {
            const u = w.slots[units[Math.floor(Math.random() * units.length)]]!
            u.warn = 1
            sfx.whoosh()
          }
        } else if (e.kind === 'golem' && e.ability <= 0) {
          e.ability = 6
          for (let i = 0; i < 2; i++) spawnEnemy('grunt', Math.max(0, e.s - 20 - i * 15), 0.6)
          const p = posAt(e.s)
          fx.burst(p.x, p.y, { count: 20, color: ['#a8a29e', '#78716c'], speed: 160, shape: 'square', gravity: 400 })
          sfx.thud()
        }
      }
      if (e.s >= PATH_LEN) leak(e)
    }

    // units fire
    const live = w.enemies.filter((e) => !e.dead)
    for (let i = 0; i < w.slots.length; i++) {
      const u = w.slots[i]
      if (!u) continue
      u.recoil = Math.max(0, u.recoil - raw * 5)
      u.pop = Math.max(0, u.pop - raw * 3)
      if (u.warn > 0) {
        u.warn -= dt
        if (u.warn <= 0) {
          u.frozen = 3
          const p = slotXY(i)
          fx.burst(p.x, p.y, { count: 16, color: ['#c084fc', '#e9d5ff'], speed: 160 })
          sfx.hurt()
        }
      }
      if (u.frozen > 0) {
        u.frozen -= dt
        continue
      }
      u.cd -= dt
      if (u.cd > 0 || !live.length) continue
      const st = stat(u)
      u.cd = 1 / st.rate
      u.recoil = 1
      const from = slotXY(i)
      let target = live[0]
      if (u.type === 'lightning') target = live[Math.floor(Math.random() * live.length)]
      else if (u.type === 'frost') {
        const fresh = live.filter((e) => e.slowT <= 0 && e.kind !== 'shield')
        const pool = fresh.length ? fresh : live
        target = pool.reduce((a, b) => (b.s > a.s ? b : a), pool[0])
      } else target = live.reduce((a, b) => (b.s > a.s ? b : a), live[0])
      if (u.type === 'lightning') {
        const hit = [target]
        let cur = target
        for (let k = 1; k < st.chain; k++) {
          const cp = posAt(cur.s)
          let best: Enemy | null = null
          let bd = 120
          for (const o of live) {
            if (hit.includes(o)) continue
            const op = posAt(o.s)
            const d = Math.hypot(op.x - cp.x, op.y - cp.y)
            if (d < bd) {
              bd = d
              best = o
            }
          }
          if (!best) break
          hit.push(best)
          cur = best
        }
        const pts = [{ x: from.x, y: from.y - 10 }]
        for (const h of hit) {
          const hp = posAt(h.s)
          const last = pts[pts.length - 1]
          for (let j = 1; j <= 3; j++) pts.push({ x: last.x + ((hp.x - last.x) * j) / 4 + rand(-8, 8), y: last.y + ((hp.y - last.y) * j) / 4 + rand(-8, 8) })
          pts.push({ x: hp.x, y: hp.y })
          damage(h, st.dmg, 'lightning')
          fx.burst(hp.x, hp.y, { count: 4, color: ['#fde047', '#ffffff'], speed: 120, shape: 'spark', gravity: 0 })
        }
        w.bolts.push({ pts, life: 0.16 })
        if (w.sndT <= 0) {
          sfx.shoot()
          w.sndT = 0.04
        }
      } else {
        const tp = posAt(target.s)
        w.shots.push({ x: from.x, y: from.y - 10, target, kind: u.type, dmg: st.dmg, tier: u.tier, tx: tp.x, ty: tp.y })
        if (w.sndT <= 0 && ph === 'play') {
          if (u.type === 'cannon') sfx.thud()
          else sfx.shoot()
          w.sndT = 0.05
        }
      }
    }

    // shots
    for (const s of w.shots) {
      if (!s.target.dead) {
        const tp = posAt(s.target.s)
        s.tx = tp.x
        s.ty = tp.y
      }
      const dx = s.tx - s.x
      const dy = s.ty - s.y
      const d = Math.hypot(dx, dy)
      const step = BASE[s.kind].speed * dt
      if (d <= step + 4) {
        s.x = s.tx
        s.y = s.ty
        s.dmg = -s.dmg
        const u = { type: s.kind, tier: s.tier } as Unit
        const st = stat(u)
        const dmg = -s.dmg
        if (st.splash > 0) {
          for (const e of w.enemies) {
            if (e.dead) continue
            const ep = posAt(e.s)
            if (Math.hypot(ep.x - s.x, ep.y - s.y) <= st.splash + e.r) damage(e, dmg, s.kind)
          }
          if (s.kind === 'cannon') {
            fx.explode(s.x, s.y, 0.5 + s.tier * 0.06)
            if (ph === 'play' && w.sndT <= 0) {
              sfx.boom(0.25)
              w.sndT = 0.05
            }
          } else {
            fx.burst(s.x, s.y, { count: 10, color: ['#a5b4fc', '#e0e7ff', '#f0abfc'], speed: 160, gravity: 0 })
            fx.ring(s.x, s.y, { color: '#a5b4fc', maxR: st.splash, life: 0.25, width: 2 })
          }
        } else if (!s.target.dead) {
          damage(s.target, dmg, s.kind)
          if (s.kind === 'frost' && s.target.kind !== 'shield') {
            s.target.slowK = s.target.slowT > 0 ? Math.max(s.target.slowK, st.slow) : st.slow
            s.target.slowT = 1.5
          }
          fx.burst(s.x, s.y, { count: 4, color: s.kind === 'frost' ? ['#bae6fd', '#ffffff'] : ['#fef3c7', '#d97706'], speed: 110, gravity: 200, size: 2 })
        }
      } else {
        s.x += (dx / d) * step
        s.y += (dy / d) * step
      }
    }
    w.shots = w.shots.filter((s) => s.dmg > 0)
    for (const b of w.bolts) b.life -= raw
    w.bolts = w.bolts.filter((b) => b.life > 0)
    for (const m of w.merges) m.t += raw * 7
    w.merges = w.merges.filter((m) => m.t < 1)
    if (w.enemies.some((e) => e.dead)) w.enemies = w.enemies.filter((e) => !e.dead)
  }

  // ── Render ──────────────────────────────────────
  function background(W: number, H: number) {
    const cached0 = bgRef.current
    if (cached0 && cached0.w === W && cached0.h === H) return cached0.c
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    const c = document.createElement('canvas')
    c.width = Math.ceil(W * dpr)
    c.height = Math.ceil(H * dpr)
    const g = c.getContext('2d')!
    g.scale(dpr, dpr)
    const { ax, ay, aw, ah, gridTop, cs, gx } = geo()
    // sky strip + far hills
    const sky = g.createLinearGradient(0, 0, 0, ay + 20)
    sky.addColorStop(0, '#1e3a8a')
    sky.addColorStop(1, '#3b82f6')
    g.fillStyle = sky
    g.fillRect(0, 0, W, ay + 20)
    g.fillStyle = '#166534'
    g.beginPath()
    g.moveTo(0, ay + 10)
    for (let x = 0; x <= W; x += 20) g.lineTo(x, ay + 2 - Math.sin(x * 0.03) * 8 - Math.sin(x * 0.011) * 6)
    g.lineTo(W, ay + 20)
    g.lineTo(0, ay + 20)
    g.fill()
    // grass field
    const grass = g.createLinearGradient(0, ay, 0, gridTop)
    grass.addColorStop(0, '#4ade80')
    grass.addColorStop(1, '#22c55e')
    g.fillStyle = grass
    g.fillRect(0, ay, W, gridTop - ay)
    g.fillStyle = 'rgba(21,128,61,0.35)'
    for (let i = 0; i < 60; i++) {
      const x = (i * 53) % W
      const y = ay + ((i * 97) % ah)
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + 2, y - 6)
      g.lineTo(x + 4, y)
      g.fill()
    }
    const flowers = ['#fde047', '#f472b6', '#ffffff']
    for (let i = 0; i < 18; i++) {
      g.fillStyle = flowers[i % 3]
      g.beginPath()
      g.arc((i * 89 + 13) % W, ay + ((i * 61 + 7) % ah), 2, 0, Math.PI * 2)
      g.fill()
    }
    // road
    const pts = PATH.map(([x, y]) => ({ x: ax + x * aw, y: ay + y * ah }))
    const road = (wd: number, col: string) => {
      g.strokeStyle = col
      g.lineWidth = wd
      g.lineJoin = 'round'
      g.lineCap = 'round'
      g.beginPath()
      pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
      g.stroke()
    }
    road(ah * 0.2 + 8, '#78350f')
    road(ah * 0.2, '#d6a46b')
    road(ah * 0.12, '#e7c08f')
    g.fillStyle = 'rgba(120,53,15,0.25)'
    for (let i = 0; i < 40; i++) {
      const s = (i / 40) * (pts.length - 1)
      const a = pts[Math.floor(s)]
      const b = pts[Math.min(pts.length - 1, Math.floor(s) + 1)]
      const k = s - Math.floor(s)
      g.beginPath()
      g.ellipse(a.x + (b.x - a.x) * k + ((i * 7) % 9) - 4, a.y + (b.y - a.y) * k + ((i * 5) % 9) - 4, 3, 2, 0, 0, Math.PI * 2)
      g.fill()
    }
    // trees between lanes
    for (let i = 0; i < 6; i++) {
      const x = ax + aw * (0.2 + i * 0.13)
      for (const y of [ay + ah * 0.32, ay + ah * 0.68]) {
        g.fillStyle = 'rgba(0,0,0,0.18)'
        g.beginPath()
        g.ellipse(x + 3, y + 8, 9, 4, 0, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#15803d'
        g.beginPath()
        g.arc(x, y, 9, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#22c55e'
        g.beginPath()
        g.arc(x - 3, y - 3, 5, 0, Math.PI * 2)
        g.fill()
      }
    }
    // castle at the end
    const end = pts[pts.length - 1]
    const cxp = end.x + 16
    const cyp = end.y
    g.fillStyle = '#94a3b8'
    g.fillRect(cxp - 18, cyp - 30, 36, 40)
    g.fillStyle = '#64748b'
    for (let i = 0; i < 4; i++) g.fillRect(cxp - 18 + i * 10, cyp - 36, 6, 8)
    g.fillStyle = '#475569'
    g.beginPath()
    g.roundRect(cxp - 8, cyp - 10, 16, 20, [8, 8, 0, 0])
    g.fill()
    g.fillStyle = '#ef4444'
    g.beginPath()
    g.moveTo(cxp, cyp - 48)
    g.lineTo(cxp + 12, cyp - 44)
    g.lineTo(cxp, cyp - 40)
    g.fill()
    g.strokeStyle = '#334155'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(cxp, cyp - 36)
    g.lineTo(cxp, cyp - 48)
    g.stroke()
    // courtyard
    const ct = g.createLinearGradient(0, gridTop - 6, 0, H)
    ct.addColorStop(0, '#57534e')
    ct.addColorStop(1, '#292524')
    g.fillStyle = ct
    g.fillRect(0, gridTop - 6, W, H - gridTop + 6)
    g.fillStyle = '#78716c'
    g.fillRect(0, gridTop - 8, W, 4)
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = gx + (i % COLS) * cs
      const y = gridTop + Math.floor(i / COLS) * cs
      g.fillStyle = 'rgba(0,0,0,0.25)'
      g.beginPath()
      g.roundRect(x + 4, y + 6, cs - 8, cs - 8, 10)
      g.fill()
      g.fillStyle = '#a8a29e'
      g.beginPath()
      g.roundRect(x + 4, y + 4, cs - 8, cs - 8, 10)
      g.fill()
      g.fillStyle = '#d6d3d1'
      g.beginPath()
      g.roundRect(x + 4, y + 4, cs - 8, (cs - 8) * 0.3, [10, 10, 4, 4])
      g.fill()
    }
    bgRef.current = { c, w: W, h: H }
    return c
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    if (size.current.w !== W || size.current.h !== H) {
      size.current = { w: W, h: H }
      bgRef.current = null
      pathCache.current = null
    }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    update(dt, raw)
    const { ay, ah, cs } = geo()

    ctx.drawImage(background(W, H), 0, 0, W, H)
    // clouds drifting over the sky strip
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    for (let i = 0; i < 3; i++) {
      const x = ((t * (8 + i * 4) + i * 160) % (W + 120)) - 60
      const y = 14 + i * 12
      ctx.beginPath()
      ctx.arc(x, y, 9, 0, Math.PI * 2)
      ctx.arc(x + 11, y - 4, 11, 0, Math.PI * 2)
      ctx.arc(x + 24, y, 8, 0, Math.PI * 2)
      ctx.fill()
    }

    fx.applyShake(ctx)
    // spawn portal
    const portal = posAt(30)
    ctx.save()
    ctx.translate(portal.x - 8, portal.y)
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(168,85,247,${0.8 - i * 0.2})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(0, 0, 10 + i * 4, 16 + i * 5, 0, t * 3 + i, t * 3 + i + Math.PI * 1.4)
      ctx.stroke()
    }
    ctx.restore()

    // enemies (sorted by y for depth)
    const sorted = [...w.enemies].sort((a, b) => posAt(a.s).y - posAt(b.s).y)
    for (const e of sorted) {
      const p = posAt(e.s)
      const bob = Math.abs(Math.sin(t * 8 + e.id)) * 3
      const sq = 1 + Math.sin(t * 16 + e.id) * 0.05
      ctx.save()
      ctx.translate(p.x, p.y - bob)
      ctx.scale(p.dir < 0 ? -sq : sq, 2 - sq)
      const spr = enemySprite(e.kind, e.r)
      const dim = Math.round(e.r) * 3.4
      ctx.drawImage(spr, -dim / 2, -dim / 2, dim, dim)
      if (e.flash > 0) {
        ctx.globalAlpha = 0.6
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(0, 0, e.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
      ctx.restore()
      if (e.slowT > 0 && e.kind !== 'shield') {
        ctx.strokeStyle = 'rgba(186,230,253,0.85)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(p.x, p.y, e.r + 3, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (e.gold) glow(ctx, p.x, p.y, e.r * 2, '#fde047', 0.4)
      if (e.enraged) glow(ctx, p.x, p.y, e.r * 2, '#ef4444', 0.35)
      if (e.hp < e.max) {
        const bw = e.r * 2
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(p.x - bw / 2, p.y - e.r - 10, bw, 4)
        ctx.fillStyle = e.boss ? '#f97316' : '#ef4444'
        ctx.fillRect(p.x - bw / 2, p.y - e.r - 10, bw * Math.max(0, e.hp / e.max), 4)
      }
    }
    if (w.invuln > 0 && ph === 'play') {
      const end = posAt(PATH_LEN)
      ctx.strokeStyle = `rgba(253,224,71,${0.5 + Math.sin(t * 10) * 0.3})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(end.x + 16, end.y - 12, 30, 0, Math.PI * 2)
      ctx.stroke()
    }

    // units
    const d = drag.current
    for (let i = 0; i < w.slots.length; i++) {
      const u = w.slots[i]
      if (!u) continue
      const p = slotXY(i)
      const dragging = d && d.from === i && d.moved
      const bob = Math.sin(t * 3 + i) * 1.5
      const pop = u.pop > 0 ? 1 + Math.sin(u.pop * Math.PI) * 0.2 : 1
      const sx = pop * (1 + u.recoil * 0.06)
      const sy = pop * (1 - u.recoil * 0.08)
      const size0 = cs * 0.8
      const spr = unitSprite(u.type, u.tier, size0)
      const dim = Math.round(size0) * 1.3
      if (d && d.moved && !dragging) {
        const a = w.slots[d.from]
        if (a && a.type === u.type && a.tier === u.tier && a.tier < MAX_TIER) glow(ctx, p.x, p.y, cs * 0.65, '#fde047', 0.55 + Math.sin(t * 10) * 0.15)
      }
      ctx.save()
      ctx.globalAlpha = dragging ? 0.35 : 1
      ctx.translate(p.x, p.y + bob)
      ctx.scale(sx, sy)
      ctx.drawImage(spr, -dim / 2, -dim / 2, dim, dim)
      ctx.restore()
      if (u.warn > 0) {
        ctx.strokeStyle = `rgba(192,132,252,${0.6 + Math.sin(t * 20) * 0.4})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(p.x, p.y, cs * 0.42, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (u.frozen > 0) {
        ctx.fillStyle = 'rgba(196,181,253,0.45)'
        ctx.beginPath()
        ctx.roundRect(p.x - cs * 0.4, p.y - cs * 0.4, cs * 0.8, cs * 0.8, 10)
        ctx.fill()
        ctx.strokeStyle = 'rgba(237,233,254,0.9)'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
    for (const m of w.merges) {
      const k = 1 - Math.pow(1 - m.t, 3)
      const size0 = cs * 0.8
      const spr = unitSprite(m.type, m.tier, size0)
      const dim = Math.round(size0) * 1.3 * (1 - k * 0.4)
      ctx.globalAlpha = 1 - k * 0.5
      ctx.drawImage(spr, m.fx + (m.tx - m.fx) * k - dim / 2, m.fy + (m.ty - m.fy) * k - dim / 2, dim, dim)
      ctx.globalAlpha = 1
    }

    // projectiles
    for (const s of w.shots) {
      const a = Math.atan2(s.ty - s.y, s.tx - s.x)
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.rotate(a)
      if (s.kind === 'archer') {
        ctx.strokeStyle = '#78350f'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-9, 0)
        ctx.lineTo(5, 0)
        ctx.stroke()
        ctx.fillStyle = '#e5e7eb'
        ctx.beginPath()
        ctx.moveTo(8, 0)
        ctx.lineTo(3, -3)
        ctx.lineTo(3, 3)
        ctx.fill()
      } else if (s.kind === 'mage') {
        glow(ctx, 0, 0, 12, '#a5b4fc', 0.8)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2)
        ctx.fill()
      } else if (s.kind === 'cannon') {
        ctx.fillStyle = '#111827'
        ctx.beginPath()
        ctx.arc(0, 0, 4.5 + s.tier * 0.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.beginPath()
        ctx.arc(-1.5, -1.5, 1.5, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.strokeStyle = '#e0f2fe'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let k = 0; k < 3; k++) {
          const aa = (k * Math.PI) / 3 + t * 6
          ctx.moveTo(Math.cos(aa) * 5, Math.sin(aa) * 5)
          ctx.lineTo(-Math.cos(aa) * 5, -Math.sin(aa) * 5)
        }
        ctx.stroke()
      }
      ctx.restore()
    }
    for (const b of w.bolts) {
      ctx.globalAlpha = Math.min(1, b.life / 0.16)
      for (const [lw, col] of [[5, 'rgba(253,224,71,0.5)'], [2, '#ffffff']] as const) {
        ctx.strokeStyle = col
        ctx.lineWidth = lw
        ctx.beginPath()
        b.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // dragged unit on top
    if (d && d.moved) {
      const u = w.slots[d.from]
      if (u) {
        const size0 = cs * 0.9
        const spr = unitSprite(u.type, u.tier, size0)
        const dim = Math.round(size0) * 1.3
        ctx.drawImage(spr, d.x - dim / 2, d.y - dim / 2 - 10, dim, dim)
      }
    }

    fx.draw(ctx)
    ctx.restore()

    if (ph !== 'idle') {
      // lives
      for (let i = 0; i < Math.max(w.lives, 0); i++) {
        const x = W - 18 - i * 22
        const y = ay - 32
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.moveTo(x, y + 7)
        ctx.bezierCurveTo(x - 11, y, x - 6, y - 9, x, y - 3)
        ctx.bezierCurveTo(x + 6, y - 9, x + 11, y, x, y + 7)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.beginPath()
        ctx.arc(x - 4, y - 2, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      // boss bar
      const boss = w.enemies.find((e) => KIND[e.kind].boss)
      if (boss) {
        const bw = W * 0.6
        const bx = (W - bw) / 2
        const by = ay + ah - 14
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.beginPath()
        ctx.roundRect(bx, by, bw, 10, 5)
        ctx.fill()
        ctx.fillStyle = '#f97316'
        ctx.beginPath()
        ctx.roundRect(bx, by, Math.max(6, bw * Math.max(0, boss.hp / boss.max)), 10, 5)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(KIND[boss.kind].name, W / 2, by - 2)
      }
      if (w.wstate === 'break' && w.wave > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`next wave in ${Math.ceil(w.breakT)}`, W / 2, ay + ah * 0.32)
      }
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  // Dev-only probe for scripted end-to-end tests.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__mergedefense = () => {
      const w = world.current
      return { coins: w.coins, lives: w.lives, wave: w.wave, slots: w.slots.map((u, i) => (u ? { t: u.type, n: u.tier, ...slotXY(i) } : slotXY(i))) }
    }
    return () => {
      delete win.__mergedefense
    }
  }, [])

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena md-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud md-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="md-sub">Wave {hud.wave}</div>
              </div>
              <div className="action-hud__right">
                <span className="md-coins">
                  <i className="md-coin" />
                  {hud.coins}
                </span>
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'dying' ? (
            <div className="md-bar" onPointerDown={(e) => e.stopPropagation()}>
              <div className="md-powers">
                {UNIT_TYPES.map((t) => {
                  const lv = hud.power[t]
                  const cost = 60 * (lv + 1)
                  return (
                    <button key={t} type="button" className="md-power" style={{ ['--c' as string]: UNIT_COLOR[t] }} disabled={lv >= 5 || hud.coins < cost} onClick={() => buyPower(t)} aria-label={`Power up ${UNIT_NAME[t]}`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d={ICONS[t]} />
                      </svg>
                      <span className="md-power__lv">{lv >= 5 ? 'MAX' : `Lv${lv}`}</span>
                      {lv < 5 ? <span className="md-power__cost">{cost}</span> : null}
                    </button>
                  )
                })}
              </div>
              <button type="button" className="md-summon" disabled={hud.coins < hud.cost || hud.full} onClick={summon}>
                <span>Summon</span>
                <small>
                  <i className="md-coin" />
                  {hud.cost}
                </small>
              </button>
            </div>
          ) : null}
          {banner && phase === 'play' ? (
            <div className="action-banner md-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="mergedefense"
              icon={meta.icon}
              title={meta.title}
              hint="Summon defenders, drag twins together to merge them into stronger heroes, and hold the road against the waves."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.wave >= 10 ? 'Heroic defence!' : 'The castle fell'}
            subtitle={`Score ${hud.score} · reached wave ${hud.wave}`}
            celebrate={hud.wave >= 10}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
