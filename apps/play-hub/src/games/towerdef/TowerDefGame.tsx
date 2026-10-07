import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, dist, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { ENEMY_COLOR, ENEMY_R, drawEnemy, drawGates, drawMenuIcon, drawTower, paintMap, type EnemyKind, type TowerKind } from './art'
import { LEVELS, levelSpec, type TdLevelSpec } from './levels'
import { COLS, MAPS, ROWS, buildMap, posAt, type MapData } from './maps'
import '../../shared/action/action.css'
import './towerdef.css'

const meta = getGame('towerdef')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'

type Enemy = {
  id: number
  kind: EnemyKind
  d: number
  x: number
  y: number
  hp: number
  max: number
  speed: number
  armor: number
  slow: number
  slowT: number
  flash: number
  face: number
  ph: number
  healT: number
  value: number
  lives: number
  splits: number
}

type Tower = {
  id: number
  kind: TowerKind
  tier: number
  cx: number
  cy: number
  cd: number
  aim: number
  recoil: number
  invested: number
  pop: number
}

type Proj = { kind: 'arrow' | 'ball'; x: number; y: number; sx: number; sy: number; tx: number; ty: number; target: number; dmg: number; splash: number; t: number; dur: number }
type Bolt = { pts: number[]; life: number }
type MenuOpt = { act: TowerKind | 'up' | 'sell'; x: number; y: number; cost: number; ok: boolean }
type Menu = { cx: number; cy: number; tower: Tower | null }

const KINDS: TowerKind[] = ['arrow', 'cannon', 'frost', 'tesla']
const TOWER_NAME: Record<TowerKind, string> = { arrow: 'Arrow', cannon: 'Cannon', frost: 'Frost', tesla: 'Tesla' }
/** [build, to tier 2, to tier 3] */
const COST: Record<TowerKind, number[]> = { arrow: [50, 65, 120], cannon: [80, 90, 170], frost: [70, 75, 140], tesla: [110, 110, 190] }
const STATS: Record<TowerKind, { range: number[]; rate: number[]; dmg: number[] }> = {
  arrow: { range: [2.4, 2.7, 3.0], rate: [0.6, 0.45, 0.34], dmg: [7, 13, 22] },
  cannon: { range: [2.1, 2.3, 2.5], rate: [1.5, 1.35, 1.2], dmg: [18, 38, 72] },
  frost: { range: [1.8, 2.0, 2.3], rate: [1.1, 1.0, 0.9], dmg: [2, 5, 10] },
  tesla: { range: [2.1, 2.3, 2.6], rate: [1.25, 1.1, 0.95], dmg: [14, 24, 40] },
}
const SPLASH = [0.85, 1.0, 1.25]
const SLOW = [0.4, 0.5, 0.62]
const CHAIN = [3, 4, 6]

const BASE: Record<EnemyKind, { hp: number; speed: number; value: number; lives: number; armor: number }> = {
  grunt: { hp: 28, speed: 1.1, value: 5, lives: 1, armor: 0 },
  runner: { hp: 14, speed: 2.0, value: 4, lives: 1, armor: 0 },
  tank: { hp: 95, speed: 0.62, value: 12, lives: 2, armor: 4 },
  flyer: { hp: 22, speed: 1.25, value: 6, lives: 1, armor: 0 },
  healer: { hp: 38, speed: 0.9, value: 9, lives: 1, armor: 0 },
  boss: { hp: 900, speed: 0.42, value: 150, lives: 10, armor: 3 },
}
const INTRO: Partial<Record<EnemyKind, string>> = {
  runner: 'fast but fragile',
  tank: 'armored — cannons crack them',
  flyer: 'they fly straight over the path',
  healer: 'they mend nearby foes',
}
/** First authored level in which each enemy kind marches (gets a NEW banner there). */
const FIRST_LEVEL: Partial<Record<EnemyKind, number>> = {}
LEVELS.forEach((l, i) => {
  for (const w of l.waves) for (const ch of w.replace(/[^a-zA-Z]/g, '')) {
    const k = ({ g: 'grunt', r: 'runner', t: 'tank', f: 'flyer', h: 'healer', B: 'boss' } as Record<string, EnemyKind>)[ch]
    if (k && FIRST_LEVEL[k] === undefined) FIRST_LEVEL[k] = i + 1
  }
})

type World = {
  demo: boolean
  spec: TdLevelSpec
  startLives: number
  levels: number
  runWaves: number
  clearT: number
  map: MapData
  mapIdx: number
  enemies: Enemy[]
  towers: Tower[]
  projs: Proj[]
  bolts: Bolt[]
  queue: EnemyKind[]
  spawnT: number
  spawnGap: number
  wave: number
  waveActive: boolean
  breakT: number
  gold: number
  lives: number
  leakedThisWave: boolean
  guardT: number
  menu: Menu | null
  seen: Set<EnemyKind>
  id: number
  score: number
  dmgMul: number
  speedMul: number
  lastMilestone: number
  stats: { score: number; wave: number; kills: number; bosses: number; towers: number; tier3: number }
}

let runCounter = 0

function freshWorld(mapIdx: number, demo: boolean): World {
  const idx = mapIdx % MAPS.length
  return {
    demo,
    spec: levelSpec(1),
    startLives: 20,
    levels: 0,
    runWaves: 0,
    clearT: 0,
    map: buildMap(MAPS[idx], idx),
    mapIdx,
    enemies: [],
    towers: [],
    projs: [],
    bolts: [],
    queue: [],
    spawnT: 0,
    spawnGap: 1,
    wave: 0,
    waveActive: false,
    breakT: 15,
    gold: 150,
    lives: 20,
    leakedThisWave: false,
    guardT: 0,
    menu: null,
    seen: new Set(['grunt']),
    id: 1,
    score: 0,
    dmgMul: 1,
    speedMul: 1,
    lastMilestone: 0,
    stats: { score: 0, wave: 0, kills: 0, bosses: 0, towers: 0, tier3: 0 },
  }
}

function makeDemo(): World {
  const w = freshWorld(0, true)
  const picks: [TowerKind, number][] = [['arrow', 2], ['cannon', 1], ['frost', 2], ['tesla', 3], ['arrow', 3], ['cannon', 2]]
  picks.forEach(([kind, tier], i) => {
    const p = w.map.pads[i * 2]
    if (p) w.towers.push({ id: w.id++, kind, tier, cx: p.x, cy: p.y, cd: rand(0, 1), aim: 0, recoil: 0, invested: 0, pop: 0 })
  })
  w.waveActive = true
  return w
}

const tmp = { x: 0, y: 0, dx: 0, dy: 0 }
const lastSfx: Record<string, number> = {}

export default function TowerDefGame() {
  const run = useActionRun('towerdef')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(makeDemo())
  const phaseRef = useRef<Phase>('idle')
  const bgCache = useRef<{ key: string; canvas: HTMLCanvasElement | null }>({ key: '', canvas: null })
  const fast = useRef(false)
  const turbo = useRef(1)
  const auto = useRef<{ on: boolean; t: number; i: number }>({ on: false, t: 0, i: 0 })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, wave: 0, waves: 1, level: 1, name: '', gold: 150, lives: 20, breakT: 0, waveActive: false })
  const [speed2, setSpeed2] = useState(false)
  const [boss, setBoss] = useState<number | null>(null)
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function play(key: string, fn: () => void, gap = 0.07) {
    if (world.current.demo) return
    const now = performance.now() / 1000
    if ((lastSfx[key] ?? 0) + gap > now) return
    lastSfx[key] = now
    fn()
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, wave: w.wave, waves: w.spec.waves.length, level: w.spec.n, name: w.map.def.name, gold: w.gold, lives: w.lives, breakT: Math.ceil(w.breakT), waveActive: w.waveActive })
  }

  function layout() {
    const { w: W, h: H } = size.current
    const top = 56
    const bottom = 66
    const cs = Math.floor(Math.min(W / COLS, (H - top - bottom) / ROWS))
    const ox = Math.floor((W - cs * COLS) / 2)
    const oy = Math.floor(top + (H - top - bottom - cs * ROWS) / 2)
    return { cs, ox, oy }
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld(runCounter++, false)
    world.current = w
    loadLevel(Math.max(1, level))
    fx.reset()
    fast.current = false
    setSpeed2(false)
    run.begin()
    setPhaseBoth('play')
    pushHud()
    sfx.ready()
  }

  /** Map n with its wave set: fresh pads, purse and gate. */
  function loadLevel(n: number) {
    const w = world.current
    const spec = levelSpec(n)
    w.spec = spec
    w.mapIdx = 1000 + n
    w.map = buildMap(spec.map, n)
    w.enemies = []
    w.towers = []
    w.projs = []
    w.bolts = []
    w.queue = []
    w.menu = null
    w.wave = 0
    w.waveActive = false
    w.breakT = 15
    w.gold = spec.gold + run.level('treasury') * 40
    w.lives = spec.lives + run.level('walls') * 3
    w.startLives = w.lives
    w.dmgMul = 1 + run.level('masonry') * 0.08
    w.guardT = 0
    setBoss(null)
    const kit = spec.allow ? `${spec.allow.map((k) => TOWER_NAME[k]).join(' + ')} only · ` : ''
    setBanner({ key: Date.now(), text: spec.boss ? `BOSS · ${spec.map.name}` : `LEVEL ${n} · ${spec.map.name}`, sub: `${kit}${spec.hint ?? `${spec.waves.length} waves`}` })
  }

  function startWave() {
    const w = world.current
    w.wave += 1
    w.runWaves += 1
    w.stats.wave = w.runWaves
    w.queue = (w.spec.queue[w.wave - 1] ?? ['grunt']).slice()
    w.spawnT = 0.4
    w.spawnGap = Math.max(0.45, 0.95 - w.spec.n * 0.008 - w.wave * 0.01)
    w.waveActive = true
    w.leakedThisWave = false
    w.speedMul = 1 + Math.min(0.35, w.spec.n * 0.008 + w.wave * 0.006)
    const isBoss = w.queue.includes('boss')
    const firstWave = (k: EnemyKind) => w.spec.queue.findIndex((q) => q.includes(k)) === w.wave - 1
    const intro = (Object.keys(INTRO) as EnemyKind[]).find((k) => FIRST_LEVEL[k] === w.spec.n && w.spec.authored && firstWave(k))
    const last = w.wave === w.spec.waves.length
    if (isBoss) {
      setBanner({ key: Date.now(), text: 'BOSS WAVE', sub: 'the Ogre King approaches' })
      sfx.boom(0.5)
      haptic.heavy()
    } else if (intro) {
      setBanner({ key: Date.now(), text: `NEW: ${intro.toUpperCase()}S`, sub: INTRO[intro] })
      sfx.levelUp()
    } else {
      setBanner({ key: Date.now(), text: last ? 'FINAL WAVE' : `WAVE ${w.wave}/${w.spec.waves.length}` })
      sfx.levelUp()
    }
    run.update(w.stats)
    pushHud()
  }

  function callEarly() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.waveActive) return
    const bonus = Math.max(0, Math.ceil(w.breakT)) * 2
    if (bonus > 0) {
      w.gold += bonus
      const { cs, ox, oy } = layout()
      fx.text(ox + (COLS * cs) / 2, oy + cs, `+${bonus} early`, '#fde047', 18)
    }
    sfx.tap()
    haptic.light()
    startWave()
  }

  function spawn(kind: EnemyKind, d = 0) {
    const w = world.current
    const b = BASE[kind]
    const hpMul = w.demo ? 1 : w.spec.hp * Math.pow(1.09, Math.max(0, w.wave - 1)) * (kind === 'boss' ? 1.25 : 1)
    const hp = Math.round(b.hp * hpMul)
    const path = kind === 'flyer' ? w.map.air : w.map.ground
    posAt(path, d, tmp)
    w.enemies.push({
      id: w.id++,
      kind,
      d,
      x: tmp.x,
      y: tmp.y,
      hp,
      max: hp,
      speed: b.speed * w.speedMul * rand(0.95, 1.05),
      armor: b.armor + (w.demo ? 0 : Math.floor((w.spec.hp - 1) * 1.1)),
      slow: 0,
      slowT: 0,
      flash: 0,
      face: 1,
      ph: rand(0, 6),
      healT: 2,
      value: Math.round(b.value * (1 + (w.demo ? 0 : w.spec.n + w.wave) * 0.025)),
      lives: b.lives,
      splits: kind === 'boss' ? 2 : 0,
    })
    if (kind === 'boss') setBoss(1)
    if (!w.demo && !w.seen.has(kind)) w.seen.add(kind)
  }

  function damage(e: Enemy, raw: number, pierce = false) {
    if (e.hp <= 0) return
    const w = world.current
    const dmg = raw * w.dmgMul
    const real = pierce ? dmg : Math.max(dmg * 0.35, dmg - e.armor)
    e.hp -= real
    e.flash = 0.07
    if (e.kind === 'boss' && e.splits > 0 && e.hp < e.max * (e.splits / 3)) {
      e.splits -= 1
      for (let i = 0; i < 3; i++) spawn('runner', Math.max(0, e.d - 0.3 - i * 0.25))
      const { cs, ox, oy } = layout()
      fx.text(ox + (e.x + 0.5) * cs, oy + (e.y + 0.5) * cs - cs, 'ENRAGED!', '#fb7185', 18)
      play('boom', () => sfx.boom(0.4), 0.2)
    }
    if (e.hp <= 0) kill(e)
  }

  function kill(e: Enemy) {
    const w = world.current
    const { cs, ox, oy } = layout()
    const px = ox + (e.x + 0.5) * cs
    const py = oy + (e.y + 0.5) * cs - (e.kind === 'flyer' ? cs * 0.32 : 0)
    const col = ENEMY_COLOR[e.kind]
    fx.burst(px, py, { count: e.kind === 'boss' ? 40 : 10, color: [col, '#ffffff', '#fde047'], speed: e.kind === 'boss' ? 320 : 160, size: 3, gravity: 200 })
    if (w.demo) return
    w.gold += e.value
    w.score += e.value * 10
    w.stats.kills += 1
    w.stats.score = w.score
    fx.text(px, py - 10, `+${e.value}`, '#fde047', e.kind === 'boss' ? 26 : 13)
    if (e.kind === 'boss') {
      w.stats.bosses += 1
      fx.explode(px, py, 2.6)
      fx.flash('#fff', 0.3)
      fx.stop(0.2)
      fx.slowmo(0.9, 0.3)
      sfx.boom(1)
      sfx.win()
      haptic.heavy()
      setBoss(null)
      setBanner({ key: Date.now(), text: 'BOSS DOWN!', sub: `+${e.value} gold` })
      void trackEvent('action_milestone', { game_id: 'towerdef', kind: 'boss', value: w.stats.bosses })
    } else if (e.kind === 'tank') {
      fx.ring(px, py, { color: '#e5e7eb', maxR: cs * 0.8 })
      fx.shake(3, 0.12)
      play('kill', () => sfx.thud(), 0.06)
      haptic.light()
    } else {
      play('kill', () => sfx.pop(), 0.05)
    }
    run.update(w.stats)
    pushHud()
  }

  function leak(e: Enemy) {
    const w = world.current
    if (w.demo || phaseRef.current !== 'play') return
    const { cs, ox, oy } = layout()
    const px = ox + (e.x + 0.5) * cs
    const py = oy + (e.y + 0.5) * cs
    fx.burst(px, py, { count: 14, color: ['#ef4444', '#fca5a5'], speed: 200 })
    if (w.guardT > 0) {
      fx.text(px, py - 16, 'BLOCKED', '#7dd3fc', 16)
      return
    }
    w.lives -= e.lives
    w.leakedThisWave = true
    fx.flash('#ef4444', 0.22)
    fx.shake(e.kind === 'boss' ? 14 : 6, 0.25)
    fx.text(px, py - 16, `-${e.lives}`, '#f87171', 20)
    sfx.hurt()
    haptic.heavy()
    if (e.kind === 'boss') setBoss(null)
    pushHud()
    if (w.lives <= 0) die()
  }

  function die() {
    const w = world.current
    w.lives = 0
    w.menu = null
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.4)
    fx.shake(14, 0.5)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    pushHud()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const done = Math.max(0, w.waveActive ? w.runWaves - 1 : w.runWaves)
      const coins = Math.round(done * 2 + w.stats.kills / 12 + w.stats.bosses * 10 + w.levels * 4)
      run.end({ score: w.score, cleared: w.levels >= 1, stats: { ...w.stats }, coins }, revive)
    }, 1100)
  }

  function revive() {
    const w = world.current
    const { cs, ox, oy } = layout()
    for (const e of w.enemies) {
      fx.burst(ox + (e.x + 0.5) * cs, oy + (e.y + 0.5) * cs, { count: 8, color: ['#fde047', '#ffffff'], speed: 160 })
    }
    w.enemies = []
    w.projs = []
    w.lives = Math.max(w.lives, 10)
    w.guardT = 4
    fx.flash('#fde047', 0.3)
    fx.ring(size.current.w / 2, size.current.h / 2, { color: '#fde047', maxR: size.current.w * 0.6, life: 0.6, width: 6 })
    setBoss(null)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'field cleared · +10 lives' })
    setPhaseBoth('play')
    pushHud()
  }

  function waveCleared() {
    const w = world.current
    w.waveActive = false
    const bonus = 15 + w.wave * 3
    w.gold += bonus
    w.score += w.wave * 50
    w.stats.score = w.score
    w.breakT = 9
    const perfect = !w.leakedThisWave
    if (perfect) w.gold += 10
    if (w.wave >= w.spec.waves.length) {
      levelClear()
      return
    } else {
      setBanner({ key: Date.now(), text: perfect ? 'PERFECT WAVE!' : `WAVE ${w.wave} CLEAR`, sub: `+${bonus + (perfect ? 10 : 0)} gold` })
      sfx.score(Math.min(8, w.wave))
    }
    haptic.success()
    run.update(w.stats)
    pushHud()
  }

  /** Stars: clear = 1, at least half the gate's lives left = +1, no leaks at all = +1. */
  function levelClear() {
    const w = world.current
    const lost = w.startLives - w.lives
    const stars = lost <= 0 ? 3 : w.lives >= w.startLives / 2 ? 2 : 1
    const res = run.completeLevel(w.spec.n, stars)
    w.levels += 1
    const bonus = (w.spec.boss ? 1000 : 300) + w.lives * 20
    w.score += bonus
    w.stats.score = w.score
    w.menu = null
    w.clearT = 2.8
    setPhaseBoth('clear')
    setBoss(null)
    setBanner({ key: Date.now(), text: w.spec.boss ? 'BOSS LEVEL CLEAR!' : `LEVEL ${w.spec.n} CLEAR!`, sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${w.lives} lives left · +${bonus}` })
    sfx.win()
    haptic.success()
    fx.flash('#fde047', 0.2)
    const { w: W, h: H } = size.current
    fx.burst(W / 2, H * 0.4, { count: 40, color: ['#fde047', '#ffffff', '#a3e635', '#fbbf24'], speed: 320, shape: 'spark', gravity: 160 })
    if (res.firstClear && w.spec.n % 5 === 0 && w.spec.n !== w.lastMilestone) {
      w.lastMilestone = w.spec.n
      void trackEvent('action_milestone', { game_id: 'towerdef', kind: 'level', value: w.spec.n })
    }
    run.update(w.stats)
    pushHud()
  }

  function nextLevel() {
    const w = world.current
    loadLevel(w.spec.n + 1)
    setPhaseBoth('play')
    sfx.ready()
    pushHud()
  }

  // ── Menu ──────────────────────────────────────────────────
  function menuOpts(m: Menu): MenuOpt[] {
    const w = world.current
    const { cs, ox, oy } = layout()
    const { w: W, h: H } = size.current
    const R = Math.max(50, cs * 1.25)
    // Shift the whole ring inward near edges so options never bunch up.
    const reach = m.tower ? 0 : R * 0.71
    const cx = Math.min(W - 30 - reach, Math.max(30 + reach, ox + (m.cx + 0.5) * cs))
    const cy = Math.min(H - 30 - R * 0.71, Math.max(80 + R * 0.71, oy + (m.cy + 0.5) * cs))
    const place = (a: number) => ({
      x: Math.min(W - 30, Math.max(30, cx + Math.cos(a) * R)),
      y: Math.min(H - 30, Math.max(80, cy + Math.sin(a) * R)),
    })
    if (!m.tower) {
      const kinds = w.spec.allow && !w.demo ? KINDS.filter((k) => w.spec.allow!.includes(k)) : KINDS
      return kinds.map((k, i) => {
        const p = place(kinds.length === 1 ? -Math.PI / 2 : -Math.PI / 2 + (i * Math.PI) / 2 - Math.PI / 4)
        return { act: k, x: p.x, y: p.y, cost: COST[k][0], ok: w.gold >= COST[k][0] }
      })
    }
    const t = m.tower
    const opts: MenuOpt[] = []
    if (t.tier < 3) {
      const c = COST[t.kind][t.tier]
      const p = place(-Math.PI / 2)
      opts.push({ act: 'up', x: p.x, y: p.y, cost: c, ok: w.gold >= c })
    }
    const p = place(Math.PI / 2)
    opts.push({ act: 'sell', x: p.x, y: p.y, cost: Math.floor(t.invested * 0.7), ok: true })
    return opts
  }

  function doOpt(o: MenuOpt) {
    const w = world.current
    const m = w.menu
    if (!m) return
    const { cs, ox, oy } = layout()
    const px = ox + (m.cx + 0.5) * cs
    const py = oy + (m.cy + 0.5) * cs
    if (!o.ok) {
      fx.text(o.x, o.y - 30, 'Need gold', '#fca5a5', 14)
      sfx.miss()
      haptic.error()
      return
    }
    if (o.act === 'sell' && m.tower) {
      w.gold += o.cost
      w.towers = w.towers.filter((t) => t !== m.tower)
      fx.burst(px, py, { count: 16, color: ['#fbbf24', '#a8a29e'], speed: 180, shape: 'square' })
      fx.text(px, py - 20, `+${o.cost}`, '#fde047', 16)
      sfx.flip()
    } else if (o.act === 'up' && m.tower) {
      const t = m.tower
      w.gold -= o.cost
      t.invested += o.cost
      t.tier += 1
      t.pop = 1
      if (t.tier === 3) w.stats.tier3 += 1
      fx.ring(px, py, { color: '#fde047', maxR: cs * 1.1, life: 0.45, width: 4 })
      fx.burst(px, py, { count: 24, color: ['#fde047', '#ffffff', '#fbbf24'], speed: 240, shape: 'spark' })
      fx.text(px, py - cs * 0.7, t.tier === 3 ? 'MAX!' : `TIER ${t.tier}`, '#fde68a', 18)
      sfx.power()
      haptic.success()
    } else if (o.act !== 'up' && o.act !== 'sell') {
      w.gold -= o.cost
      w.towers.push({ id: w.id++, kind: o.act, tier: 1, cx: m.cx, cy: m.cy, cd: 0.2, aim: -Math.PI / 2, recoil: 0, invested: o.cost, pop: 1 })
      w.stats.towers += 1
      fx.burst(px, py + cs * 0.2, { count: 18, color: ['#d6d3d1', '#a8a29e', '#fde68a'], speed: 180, shape: 'square', gravity: 400 })
      fx.ring(px, py, { color: '#fff', maxR: cs * 0.8 })
      fx.shake(3, 0.12)
      sfx.thud()
      haptic.medium()
    }
    w.menu = null
    run.update(w.stats)
    pushHud()
  }

  function tap(x: number, y: number) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    if (w.menu) {
      for (const o of menuOpts(w.menu)) {
        if (dist(x, y, o.x, o.y) < 28) {
          doOpt(o)
          return
        }
      }
      w.menu = null
    }
    const { cs, ox, oy } = layout()
    const cx = Math.floor((x - ox) / cs)
    const cy = Math.floor((y - oy) / cs)
    const tower = w.towers.find((t) => t.cx === cx && t.cy === cy)
    if (tower) {
      w.menu = { cx, cy, tower }
      sfx.tap()
      return
    }
    if (w.map.pads.some((p) => p.x === cx && p.y === cy)) {
      w.menu = { cx, cy, tower: null }
      sfx.tap()
      haptic.light()
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    tap(p.x, p.y)
  }

  function toggleSpeed() {
    fast.current = !fast.current
    setSpeed2(fast.current)
    sfx.tick()
    haptic.light()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (phaseRef.current !== 'play') return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        callEarly()
      } else if (e.key === 'f' || e.key === 'F') toggleSpeed()
      else if (e.key === 'Escape') world.current.menu = null
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation ────────────────────────────────────────────
  function step(dt: number) {
    const w = world.current
    const live = !w.demo && phaseRef.current === 'play'
    if (w.demo) {
      w.spawnT -= dt
      if (w.spawnT <= 0) {
        const r = Math.random()
        spawn(r < 0.6 ? 'grunt' : r < 0.85 ? 'runner' : r < 0.95 ? 'flyer' : 'tank')
        w.spawnT = 1.1
      }
    } else if (w.waveActive) {
      if (w.queue.length) {
        w.spawnT -= dt
        if (w.spawnT <= 0) {
          const k = w.queue.shift()!
          spawn(k)
          w.spawnT = k === 'boss' ? 2.5 : k === 'tank' ? w.spawnGap * 1.4 : k === 'runner' ? w.spawnGap * 0.6 : w.spawnGap
        }
      } else if (w.enemies.length === 0 && live) waveCleared()
    } else if (live) {
      const before = Math.ceil(w.breakT)
      w.breakT -= dt
      if (Math.ceil(w.breakT) !== before) {
        pushHud()
        if (w.breakT < 3.5 && w.breakT > 0) sfx.tick()
      }
      if (w.breakT <= 0) startWave()
    }
    w.guardT = Math.max(0, w.guardT - dt)

    // Enemies
    for (const e of w.enemies) {
      if (e.hp <= 0) continue
      e.slowT -= dt
      if (e.slowT <= 0) e.slow = 0
      const slowMul = 1 - e.slow * (e.kind === 'boss' ? 0.5 : 1)
      e.d += e.speed * slowMul * dt
      e.ph += dt * (1 + e.speed) * slowMul
      e.flash = Math.max(0, e.flash - dt)
      const path = e.kind === 'flyer' ? w.map.air : w.map.ground
      posAt(path, e.d, tmp)
      e.x = tmp.x
      e.y = tmp.y
      if (Math.abs(tmp.dx) > 0.2) e.face = tmp.dx > 0 ? 1 : -1
      if (e.kind === 'healer') {
        e.healT -= dt
        if (e.healT <= 0) {
          e.healT = 2.6
          let any = false
          for (const o of w.enemies) {
            if (o !== e && o.hp > 0 && o.hp < o.max && dist(o.x, o.y, e.x, e.y) < 1.6) {
              o.hp = Math.min(o.max, o.hp + o.max * 0.18)
              any = true
            }
          }
          if (any || !w.demo) {
            const { cs, ox, oy } = layout()
            fx.ring(ox + (e.x + 0.5) * cs, oy + (e.y + 0.5) * cs, { color: '#4ade80', maxR: cs * 1.6, life: 0.5, width: 3 })
          }
        }
      }
      if (e.d >= path.len) {
        e.hp = 0
        leak(e)
      }
    }

    // Towers
    for (const t of w.towers) {
      t.cd -= dt
      t.recoil = Math.max(0, t.recoil - dt * 4)
      t.pop = Math.max(0, t.pop - dt * 3)
      const st = STATS[t.kind]
      const range = st.range[t.tier - 1]
      let target: Enemy | null = null
      for (const e of w.enemies) {
        if (e.hp <= 0) continue
        if (t.kind === 'cannon' && e.kind === 'flyer') continue
        if (dist(e.x, e.y, t.cx, t.cy) > range) continue
        if (!target || e.d > target.d) target = e
      }
      if (!target) continue
      const want = Math.atan2(target.y - t.cy, target.x - t.cx)
      let da = want - t.aim
      while (da > Math.PI) da -= Math.PI * 2
      while (da < -Math.PI) da += Math.PI * 2
      t.aim += da * Math.min(1, dt * 14)
      if (t.cd > 0) continue
      t.cd = st.rate[t.tier - 1]
      t.recoil = 1
      const dmg = st.dmg[t.tier - 1]
      const { cs, ox, oy } = layout()
      const tx = ox + (t.cx + 0.5) * cs
      const ty = oy + (t.cy + 0.5) * cs
      if (t.kind === 'arrow') {
        const shots = t.tier === 3 ? 2 : 1
        for (let i = 0; i < shots; i++) {
          w.projs.push({ kind: 'arrow', x: t.cx, y: t.cy, sx: t.cx, sy: t.cy, tx: target.x, ty: target.y, target: target.id, dmg, splash: 0, t: -i * 0.06, dur: 0 })
        }
        play('arrow', () => sfx.shoot(), 0.09)
      } else if (t.kind === 'cannon') {
        // Lead the target a little so slow lobs still land.
        posAt(w.map.ground, target.d + target.speed * (1 - target.slow) * 0.55, tmp)
        w.projs.push({ kind: 'ball', x: t.cx, y: t.cy, sx: t.cx, sy: t.cy, tx: tmp.x, ty: tmp.y, target: target.id, dmg, splash: SPLASH[t.tier - 1], t: 0, dur: 0.55 })
        fx.burst(tx + Math.cos(t.aim) * cs * 0.4, ty + Math.sin(t.aim) * cs * 0.4, { count: 6, color: ['#9ca3af', '#e5e7eb'], speed: 60, size: 4, life: 0.4, gravity: -30 })
        play('cannon', () => sfx.thud(), 0.1)
      } else if (t.kind === 'frost') {
        const slow = SLOW[t.tier - 1]
        for (const e of w.enemies) {
          if (e.hp > 0 && dist(e.x, e.y, t.cx, t.cy) <= range) {
            e.slow = Math.max(e.slow, slow)
            e.slowT = 1.6 + t.tier * 0.3
            damage(e, dmg, true)
          }
        }
        fx.ring(tx, ty, { color: '#7dd3fc', maxR: range * cs, life: 0.45, width: 3 })
        fx.burst(tx, ty - cs * 0.2, { count: 6, color: ['#e0f2fe', '#7dd3fc'], speed: 90, size: 2.5, gravity: 0, shape: 'square' })
        play('frost', () => sfx.tick(), 0.12)
      } else {
        const hits: Enemy[] = [target]
        let cur = target
        for (let i = 1; i < CHAIN[t.tier - 1]; i++) {
          let next: Enemy | null = null
          let best = 1.7
          for (const e of w.enemies) {
            if (e.hp <= 0 || hits.includes(e)) continue
            const d = dist(e.x, e.y, cur.x, cur.y)
            if (d < best) {
              best = d
              next = e
            }
          }
          if (!next) break
          hits.push(next)
          cur = next
        }
        const pts: number[] = [t.cx, t.cy - 0.38]
        hits.forEach((e, i) => {
          pts.push(e.x, e.y - (e.kind === 'flyer' ? 0.32 : 0))
          damage(e, dmg * Math.pow(0.8, i), true)
        })
        w.bolts.push({ pts, life: 0.16 })
        play('tesla', () => sfx.slash(), 0.1)
      }
    }

    // Projectiles
    for (const p of w.projs) {
      p.t += dt
      if (p.t < 0) continue
      if (p.kind === 'arrow') {
        const tgt = w.enemies.find((e) => e.id === p.target && e.hp > 0)
        if (tgt) {
          p.tx = tgt.x
          p.ty = tgt.y - (tgt.kind === 'flyer' ? 0.32 : 0)
        }
        const dx = p.tx - p.x
        const dy = p.ty - p.y
        const d = Math.hypot(dx, dy)
        const sp = 11 * dt
        if (d <= sp) {
          p.dur = -1
          if (tgt) {
            damage(tgt, p.dmg)
            play('hit', () => sfx.hit(), 0.08)
          }
        } else {
          p.x += (dx / d) * sp
          p.y += (dy / d) * sp
        }
      } else {
        const k = Math.min(1, p.t / p.dur)
        p.x = p.sx + (p.tx - p.sx) * k
        p.y = p.sy + (p.ty - p.sy) * k
        if (k >= 1) {
          p.dur = -1
          for (const e of w.enemies) {
            if (e.hp > 0 && e.kind !== 'flyer' && dist(e.x, e.y, p.tx, p.ty) <= p.splash) damage(e, p.dmg)
          }
          const { cs, ox, oy } = layout()
          fx.explode(ox + (p.tx + 0.5) * cs, oy + (p.ty + 0.5) * cs, 0.45 + p.splash * 0.3)
          play('boom', () => sfx.boom(0.25), 0.1)
        }
      }
    }
    w.projs = w.projs.filter((p) => p.dur !== -1)
    for (const b of w.bolts) b.life -= dt
    w.bolts = w.bolts.filter((b) => b.life > 0)
    w.enemies = w.enemies.filter((e) => e.hp > 0)

    if (live) {
      const b = w.enemies.find((e) => e.kind === 'boss')
      if (b) {
        const pct = Math.max(0, b.hp / b.max)
        if (boss === null || Math.abs(pct - boss) > 0.01) setBoss(pct)
      }
    }
  }

  // ── Render ────────────────────────────────────────────────
  function frame({ ctx, w: W, h: H, raw, t: time }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const ph = phaseRef.current
    const real = fx.step(raw)
    const menuSlow = w.menu ? 0.35 : 1
    const dt = real * (fast.current && ph === 'play' ? 2 : 1) * menuSlow
    if (ph === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0) nextLevel()
    }
    if (ph === 'idle' || ph === 'play' || ph === 'dying' || ph === 'clear') {
      for (let k = 0; k < turbo.current; k++) {
        if (auto.current.on && phaseRef.current === 'play') autoStep(dt)
        step(dt)
      }
    }

    const { cs, ox, oy } = layout()
    const key = `${W}x${H}:${w.mapIdx}:${cs}`
    if (bgCache.current.key !== key) {
      const c = bgCache.current.canvas ?? document.createElement('canvas')
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
      c.width = Math.round(W * dpr)
      c.height = Math.round(H * dpr)
      const g = c.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintMap(g, w.map, W, H, cs, ox, oy)
      bgCache.current = { key, canvas: c }
    }
    fx.applyShake(ctx)
    ctx.drawImage(bgCache.current.canvas!, 0, 0, W, H)
    drawGates(ctx, w.map, cs, ox, oy, time)

    const P = (v: number, o: number) => o + (v + 0.5) * cs

    // Range preview
    if (w.menu?.tower) {
      const t = w.menu.tower
      const r = STATS[t.kind].range[t.tier - 1] * cs
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(P(t.cx, ox), P(t.cy, oy), r, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else if (w.menu) {
      ctx.strokeStyle = 'rgba(253,224,71,0.9)'
      ctx.lineWidth = 2.5
      ctx.strokeRect(ox + w.menu.cx * cs + 2, oy + w.menu.cy * cs + 2, cs - 4, cs - 4)
    }

    // Ground enemies, towers and flyers sorted by y for overlap.
    type Drawable = { y: number; draw: () => void }
    const list: Drawable[] = []
    for (const e of w.enemies) {
      const ex = P(e.x, ox)
      const ey = P(e.y, oy)
      list.push({
        y: e.kind === 'flyer' ? ey + 1000 : ey,
        draw: () => {
          drawEnemy(ctx, e.kind, ex, ey, cs, e.ph, e.face, e.flash, e.slow > 0)
          if (e.hp < e.max && e.kind !== 'boss') {
            const bw = cs * ENEMY_R[e.kind] * 2.2
            const by = ey - cs * ENEMY_R[e.kind] - (e.kind === 'flyer' ? cs * 0.6 : cs * 0.2)
            ctx.fillStyle = 'rgba(0,0,0,0.55)'
            ctx.fillRect(ex - bw / 2, by, bw, 4)
            ctx.fillStyle = e.hp / e.max > 0.5 ? '#4ade80' : e.hp / e.max > 0.25 ? '#facc15' : '#ef4444'
            ctx.fillRect(ex - bw / 2 + 0.5, by + 0.5, (bw - 1) * Math.max(0, e.hp / e.max), 3)
          }
        },
      })
    }
    for (const t of w.towers) {
      const tx = P(t.cx, ox)
      const ty = P(t.cy, oy)
      list.push({
        y: ty + cs * 0.1,
        draw: () => {
          const s = cs * (1 + t.pop * 0.25)
          drawTower(ctx, t.kind, t.tier, tx, ty, s, t.aim, time, t.recoil)
        },
      })
    }
    list.sort((a, b) => a.y - b.y)
    for (const d of list) d.draw()

    // Projectiles
    for (const p of w.projs) {
      if (p.t < 0) continue
      const px = P(p.x, ox)
      const py = P(p.y, oy)
      if (p.kind === 'arrow') {
        const a = Math.atan2(p.ty - p.y, p.tx - p.x)
        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(a)
        ctx.strokeStyle = '#78350f'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(-cs * 0.22, 0)
        ctx.lineTo(cs * 0.12, 0)
        ctx.stroke()
        ctx.fillStyle = '#e5e7eb'
        ctx.beginPath()
        ctx.moveTo(cs * 0.2, 0)
        ctx.lineTo(cs * 0.1, -3)
        ctx.lineTo(cs * 0.1, 3)
        ctx.fill()
        ctx.fillStyle = '#f87171'
        ctx.fillRect(-cs * 0.24, -2.5, cs * 0.08, 5)
        ctx.restore()
      } else {
        const k = Math.min(1, p.t / p.dur)
        const hgt = Math.sin(k * Math.PI) * cs * 1.1
        ctx.globalAlpha = 0.3
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.ellipse(px, py + cs * 0.1, cs * 0.12, cs * 0.06, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.fillStyle = '#111827'
        ctx.beginPath()
        ctx.arc(px, py - hgt, cs * 0.12, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#6b7280'
        ctx.beginPath()
        ctx.arc(px - cs * 0.04, py - hgt - cs * 0.04, cs * 0.04, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Lightning
    for (const b of w.bolts) {
      ctx.globalAlpha = Math.min(1, b.life * 8)
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass === 0 ? 'rgba(34,211,238,0.5)' : '#f0f9ff'
        ctx.lineWidth = pass === 0 ? 5 : 1.8
        ctx.beginPath()
        for (let i = 0; i + 3 < b.pts.length; i += 2) {
          const x0 = P(b.pts[i], ox)
          const y0 = P(b.pts[i + 1], oy)
          const x1 = P(b.pts[i + 2], ox)
          const y1 = P(b.pts[i + 3], oy)
          ctx.moveTo(x0, y0)
          const segs = 4
          for (let s = 1; s <= segs; s++) {
            const k = s / segs
            const j = s === segs ? 0 : (Math.sin(time * 90 + s * 7 + i) * cs) / 5
            ctx.lineTo(x0 + (x1 - x0) * k + j, y0 + (y1 - y0) * k - j)
          }
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    if (w.guardT > 0 && ph === 'play') {
      const e = w.map.ground.pts[w.map.ground.pts.length - 1]
      glow(ctx, P(Math.min(COLS - 1, Math.max(0, e.x)), ox), P(Math.min(ROWS - 1, Math.max(0, e.y)), oy), cs * 1.4, '#7dd3fc', 0.5 + Math.sin(time * 8) * 0.2)
    }

    fx.draw(ctx)

    // Radial menu
    if (w.menu && ph === 'play') {
      const m = w.menu
      const cx = P(m.cx, ox)
      const cy = P(m.cy, oy)
      for (const o of menuOpts(m)) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(o.x, o.y)
        ctx.stroke()
      }
      for (const o of menuOpts(m)) {
        ctx.globalAlpha = o.ok ? 1 : 0.55
        ctx.fillStyle = 'rgba(15,23,42,0.88)'
        ctx.beginPath()
        ctx.arc(o.x, o.y, 25, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = o.act === 'sell' ? '#fbbf24' : o.ok ? '#a3e635' : '#ef4444'
        ctx.lineWidth = 2.5
        ctx.stroke()
        drawMenuIcon(ctx, o.act, o.x, o.y - 3, 34, time)
        ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const label = o.act === 'sell' ? `+${o.cost}` : `${o.cost}`
        ctx.fillStyle = 'rgba(0,0,0,0.75)'
        ctx.beginPath()
        ctx.roundRect(o.x - 18, o.y + 15, 36, 15, 7)
        ctx.fill()
        ctx.fillStyle = o.act === 'sell' ? '#fde047' : o.ok ? '#fde68a' : '#fca5a5'
        ctx.fillText(label, o.x, o.y + 23)
        if (o.act !== 'up' && o.act !== 'sell') {
          ctx.fillStyle = '#fff'
          ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
          ctx.fillText(TOWER_NAME[o.act], o.x, o.y - 32)
        }
        ctx.globalAlpha = 1
      }
    }

    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  /**
   * Dev autopilot used to verify levels: builds on the pads that cover the most road,
   * cycles tower kinds allowed on the level, then upgrades the best-placed towers.
   */
  function autoStep(dt: number) {
    const a = auto.current
    a.t -= dt
    if (a.t > 0) return
    a.t = 0.3
    const w = world.current
    if (!w.waveActive && w.wave === 0 && w.towers.length >= 2) callEarly()
    const cover = (x: number, y: number) => {
      let n = 0
      for (const k of w.map.pathCells) {
        const cx = k % COLS
        const cy = Math.floor(k / COLS)
        if (Math.hypot(cx - x, cy - y) <= 2.4) n++
      }
      return n
    }
    const kinds = w.spec.allow ?? KINDS
    const pattern: TowerKind[] = ['arrow', 'cannon', 'frost', 'arrow', 'tesla', 'cannon', 'arrow', 'tesla', 'frost', 'cannon']
    const want = pattern.filter((k) => kinds.includes(k))
    const nextKind = (want.length ? want : kinds)[w.towers.length % (want.length || kinds.length)]
    const free = w.map.pads.filter((pd) => !w.towers.some((t) => t.cx === pd.x && t.cy === pd.y)).sort((p1, p2) => cover(p2.x, p2.y) - cover(p1.x, p1.y))
    const cap = Math.min(w.map.pads.length, 3 + Math.floor(w.spec.n / 3))
    const tryBuild = () => {
      if (!free.length || w.gold < COST[nextKind][0]) return false
      w.menu = { cx: free[0].x, cy: free[0].y, tower: null }
      const o = menuOpts(w.menu).find((m) => m.act === nextKind)
      if (o) doOpt(o)
      w.menu = null
      return !!o
    }
    const tryUp = () => {
      const ups = w.towers.filter((t) => t.tier < 3).sort((t1, t2) => t1.tier - t2.tier || cover(t2.cx, t2.cy) - cover(t1.cx, t1.cy))
      const t = ups[0]
      if (!t || w.gold < COST[t.kind][t.tier]) return false
      w.menu = { cx: t.cx, cy: t.cy, tower: t }
      const o = menuOpts(w.menu).find((m) => m.act === 'up')
      if (o) doOpt(o)
      w.menu = null
      return !!o
    }
    if (w.towers.length < cap) {
      if (!tryBuild()) tryUp()
    } else if (!tryUp()) tryBuild()
  }

  // Dev-only probes: autopilot + time skip for scripted level verification.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__towerdefAuto = (on: boolean, speed = 4) => {
      auto.current.on = on
      turbo.current = on ? speed : 1
    }
    win.__towerdefState = () => {
      const w = world.current
      return { level: w.spec.n, wave: w.wave, waves: w.spec.waves.length, lives: w.lives, startLives: w.startLives, gold: w.gold, towers: w.towers.length, phase: phaseRef.current }
    }
    return () => {
      delete win.__towerdefAuto
      delete win.__towerdefState
    }
  }, [])

  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena td-arena" onPointerDown={onPointerDown}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Level {hud.level} · Wave {Math.max(1, hud.wave)}/{hud.waves}
                </div>
              </div>
              <div className="action-hud__right td-stats">
                <span className="td-chip td-chip--gold">
                  <i className="td-coin" />
                  {hud.gold}
                </span>
                <span className="td-chip td-chip--lives">
                  <i className="td-heart" />
                  {hud.lives}
                </span>
              </div>
            </div>
          )}
          {boss !== null && phase === 'play' ? (
            <div className="td-bossbar" aria-label="Boss health">
              <span style={{ width: `${Math.round(boss * 100)}%` }} />
            </div>
          ) : null}
          {phase === 'play' && (
            <div className="td-controls" onPointerDown={stop}>
              <button type="button" className={`td-btn${speed2 ? ' is-on' : ''}`} onClick={toggleSpeed} aria-label="Toggle double speed">
                {speed2 ? '2× speed' : '1× speed'}
              </button>
              {!hud.waveActive ? (
                <button type="button" className="td-btn td-btn--go" onClick={callEarly}>
                  {hud.wave === 0 ? 'Start' : 'Next wave'} <small>{hud.breakT}s</small>
                </button>
              ) : null}
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
              game="towerdef"
              icon={meta.icon}
              title={meta.title}
              hint="Tap a stone pad to build towers. Tap a tower to upgrade or sell. Don't let the horde reach your gate."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={world.current.levels > 0 ? 'Valiant defense!' : 'The gate has fallen'}
            subtitle={`Score ${hud.score} · Level ${hud.level} · Wave ${Math.max(1, hud.wave)}`}
            celebrate={world.current.levels > 0}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
