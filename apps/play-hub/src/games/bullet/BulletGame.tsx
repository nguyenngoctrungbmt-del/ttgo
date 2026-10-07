import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, dist, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { BCOLORS, BRADIUS, bulletSprite, drawBoss, drawEnemy, drawItem, drawShip, type BType, type EKind, type IKind } from './art'
import '../../shared/action/action.css'
import './bullet.css'
import { AUTHORED, PALETTES, PATTERN_NAME, STAGES, type BossForm, type Pattern, type StageDef, type WaveKind } from './levels'

const meta = getGame('bullet')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Segment = 'waves' | 'warning' | 'boss' | 'clear'

type Bullet = { x: number; y: number; a: number; s: number; acc: number; maxS: number; curve: number; type: BType; color: number; grazed: boolean }
type Shot = { x: number; y: number; vx: number; vy: number; dmg: number; homing: boolean }
type Enemy = {
  id: number
  kind: EKind
  x: number
  y: number
  vx: number
  vy: number
  hp: number
  t: number
  fire: number
  shots: number
  ty: number
  side: number
  flash: number
  entered: boolean
  bombed: number
  spin: number
}
type Item = { x: number; y: number; vx: number; vy: number; kind: IKind; vac: boolean; t: number }
type Laser = { x: number; y: number; a: number; t: number; warn: number; dur: number; w: number; sweep: number }
type Boss = {
  x: number
  y: number
  tx: number
  hp: number
  max: number
  phases: Pattern[]
  phase: number
  pt: number
  ang: number
  cd: number
  cd2: number
  dir: number
  pause: number
  flash: number
  moveT: number
  hue: string
  enter: number
  name: string
  form: BossForm
}
type Queued = { at: number; spawn: () => void }

type World = {
  ship: { x: number; y: number; inv: number; bank: number }
  lives: number
  bombs: number
  power: number
  graze: number
  grazeBank: number
  bullets: Bullet[]
  shots: Shot[]
  enemies: Enemy[]
  items: Item[]
  lasers: Laser[]
  boss: Boss | null
  queue: Queued[]
  stage: number
  def: StageDef
  livesAtStage: number
  timeouts: number
  segment: Segment
  segT: number
  stageT: number
  wavesLeft: number
  waveT: number
  waveNo: number
  fireT: number
  bombT: number
  bombId: number
  score: number
  id: number
  scroll: number
  grazeSfx: number
  demoAng: number
  stats: { score: number; stage: number; bosses: number; grazes: number; kills: number }
}

const BOSS_NAMES = ['Seraph Prime', 'Violet Warden', 'Azure Tyrant', 'Crimson Oracle', 'Void Empress']
const BOSS_HUES = ['#e879f9', '#a78bfa', '#38bdf8', '#fb7185', '#facc15']
const ENEMY_R: Record<EKind, number> = { pop: 11, fan: 18, turret: 21, swirl: 13, sniper: 13 }
const ENEMY_HP: Record<EKind, number> = { pop: 3, fan: 22, turret: 40, swirl: 12, sniper: 9 }
const ENEMY_VALUE: Record<EKind, number> = { pop: 100, fan: 600, turret: 1000, swirl: 400, sniper: 350 }
const MAX_BULLETS = 650
const HITBOX = 2.6
const GRAZE_R = 17

function freshWorld(W: number, H: number): World {
  return {
    ship: { x: W / 2, y: H - 90, inv: 0, bank: 0 },
    lives: 3,
    bombs: 2,
    power: 1,
    graze: 0,
    grazeBank: 0,
    bullets: [],
    shots: [],
    enemies: [],
    items: [],
    lasers: [],
    boss: null,
    queue: [],
    stage: 0,
    def: STAGES[0],
    livesAtStage: 3,
    timeouts: 0,
    segment: 'waves',
    segT: 0,
    stageT: 0,
    wavesLeft: 0,
    waveT: 0,
    waveNo: 0,
    fireT: 0,
    bombT: 0,
    bombId: 0,
    score: 0,
    id: 1,
    scroll: 0,
    grazeSfx: 0,
    demoAng: 0,
    stats: { score: 0, stage: 0, bosses: 0, grazes: 0, kills: 0 },
  }
}

export default function BulletGame() {
  const run = useActionRun('bullet')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(360, 600))
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const keys = useRef({ l: false, r: false, u: false, d: false })
  const devAuto = useRef(false)
  const devSpeed = useRef(1)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    // Test hook for headless bots: dodging autopilot, fast-forward, state readout.
    const hook = {
      auto: (on: boolean) => (devAuto.current = on),
      speed: (n: number) => (devSpeed.current = Math.max(1, Math.min(8, Math.round(n)))),
      state: () => {
        const w = world.current
        return { phase: phaseRef.current, stage: w.stage, name: w.def.name, seg: w.segment, boss: w.boss ? `${w.boss.phase + 1}/${w.boss.phases.length}` : '', lives: w.lives, bombs: w.bombs }
      },
    }
    ;(window as unknown as { __lv6bullet?: typeof hook }).__lv6bullet = hook
  }, [])

  /** DEV-only pilot: samples nearby spots, scores predicted bullet/laser danger, bombs when cornered. */
  function autoPilot(dt: number) {
    const w = world.current
    const s = w.ship
    const { w: W, h: H } = size.current
    const step = 330 * dt
    let bx = s.x
    let by = s.y
    let best = 1e9
    let here = 0
    const tx = w.boss ? w.boss.x : (w.enemies[0]?.x ?? W / 2)
    for (let k = -1; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2
      const r = k < 0 ? 0 : step
      const cx = clamp(s.x + Math.cos(a) * r, 10, W - 10)
      const cy = clamp(s.y + Math.sin(a) * r, H * 0.45, H - 16)
      let c = Math.abs(cy - H * 0.78) * 0.02 + Math.abs(cx - tx) * 0.01 + Math.abs(cx - W / 2) * 0.004
      for (const bl of w.bullets) {
        const dx0 = bl.x - cx
        const dy0 = bl.y - cy
        if (dx0 > 90 || dx0 < -90 || dy0 > 90 || dy0 < -120) continue
        const vx = Math.cos(bl.a) * bl.s
        const vy = Math.sin(bl.a) * bl.s
        const rr = BRADIUS[bl.type] * 0.7 + HITBOX + 7
        for (const tau of [0, 0.06, 0.14, 0.24]) {
          const d = Math.hypot(dx0 + vx * tau, dy0 + vy * tau)
          if (d < rr) c += 100 / (1 + tau * 8)
          else if (d < rr + 10) c += 4
        }
      }
      for (const L of w.lasers) {
        const ux = Math.cos(L.a)
        const uy = Math.sin(L.a)
        const px = cx - L.x
        const py = cy - L.y
        if (px * ux + py * uy > 0 && Math.abs(px * uy - py * ux) < L.w + 18) c += L.t > L.warn - 0.3 ? 200 : 30
      }
      for (const e of w.enemies) if (dist(e.x, e.y, cx, cy) < ENEMY_R[e.kind] + 16) c += 80
      if (k < 0) here = c
      if (c < best) {
        best = c
        bx = cx
        by = cy
      }
    }
    if (best > 90 && here > 90 && w.bombs > 0 && s.inv <= 0) useBomb()
    s.x = bx
    s.y = by
  }

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, stage: 1, graze: 0, bombs: 2 })
  const [bossUi, setBossUi] = useState<{ name: string; pct: number; phase: number; phases: number } | null>(null)
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, stage: Math.max(1, w.stage), graze: w.graze, bombs: w.bombs })
  }

  function show(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function addScore(n: number) {
    const w = world.current
    w.score += n
    w.stats.score = w.score
  }

  // ── Bullet helpers ──────────────────────────
  function spd(base: number) {
    return base * (1 + Math.min(0.6, (world.current.stage - 1) * 0.07))
  }

  function emit(x: number, y: number, a: number, s: number, type: BType, color: number, acc = 0, maxS = 0, curve = 0) {
    const w = world.current
    if (w.bullets.length >= MAX_BULLETS) return
    w.bullets.push({ x, y, a, s, acc, maxS: maxS || s * 3, curve, type, color, grazed: false })
  }

  function ring(x: number, y: number, n: number, s: number, off: number, type: BType, color: number, curve = 0) {
    for (let i = 0; i < n; i++) emit(x, y, off + (i / n) * Math.PI * 2, s, type, color, 0, 0, curve)
  }

  function aim(x: number, y: number) {
    const s = world.current.ship
    return Math.atan2(s.y - y, s.x - x)
  }

  function fan(x: number, y: number, a: number, n: number, spread: number, s: number, type: BType, color: number) {
    for (let i = 0; i < n; i++) emit(x, y, a + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread), s, type, color)
  }

  // ── Run flow ────────────────────────────────
  function start(level: number = run.nextLevel) {
    void unlockAudio()
    const { w: W, h: H } = size.current
    const w = freshWorld(W, H)
    // Each stage is a level: the map replays beaten stages, Play continues at the next one.
    w.stage = Math.max(1, typeof level === 'number' && level > 0 ? Math.floor(level) : run.nextLevel) - 1
    // Jumping in late: start with the power a player would have collected by then.
    w.power = Math.min(4, 1 + w.stage * 0.35)
    w.bombs = 2 + run.level('bombs')
    w.power = Math.max(w.power, 1 + run.level('power'))
    world.current = w
    fx.reset()
    setBossUi(null)
    run.begin()
    setPhaseBoth('play')
    nextStage()
  }

  function nextStage() {
    const w = world.current
    w.stage += 1
    w.stats.stage = w.stage
    w.segment = 'waves'
    w.segT = 0
    w.stageT = 0
    w.def = stageDef(w.stage)
    w.livesAtStage = w.lives
    w.timeouts = 0
    w.wavesLeft = w.def.waves.length
    w.waveT = 1.5
    w.waveNo = 0
    w.queue = []
    show(`${w.def.grand ? '★ ' : ''}STAGE ${w.stage} · ${w.def.name.toUpperCase()}`, w.def.sub)
    sfx.levelUp()
    pushHud()
    run.update(w.stats)
  }

  /** Authored stages first; past them a generated stage with a shuffled boss and the classic wave pool. */
  function stageDef(stage: number): StageDef {
    if (stage <= AUTHORED) return STAGES[stage - 1]
    const pool: WaveKind[] = ['popLine', 'popRain', 'fanPair', 'swirl', 'turret', 'sniper', 'mix', 'popV', 'swirlPair', 'turretPair', 'snipeLine', 'fanQuad']
    const waves = Array.from({ length: Math.min(10, 6 + Math.floor(stage / 4)) }, () => pool[Math.floor(Math.random() * pool.length)])
    const all: Pattern[] = ['fans', 'ring', 'spiral', 'laser', 'flower', 'rain', 'cross', 'wall', 'web', 'pulse']
    const grand = stage % 5 === 0
    const forms: BossForm[] = ['seraph', 'eye', 'moth', 'crystal']
    return {
      name: PALETTE_NAMES[stage % PALETTE_NAMES.length],
      sub: `deep sector ${stage}`,
      palette: stage % PALETTES.length,
      waves,
      grand,
      boss: { name: BOSS_NAMES[stage % BOSS_NAMES.length], hue: BOSS_HUES[stage % BOSS_HUES.length], form: forms[stage % forms.length], phases: shuffle(all).slice(0, grand ? 5 : 3), hp: Math.min(600, 420 + stage * 4) },
    }
  }

  function spawnEnemy(kind: EKind, x: number, y: number, vx: number, vy: number, extra: Partial<Enemy> = {}) {
    const w = world.current
    const hp = Math.round(ENEMY_HP[kind] * (1 + (w.stage - 1) * 0.18))
    w.enemies.push({ id: w.id++, kind, x, y, vx, vy, hp, t: 0, fire: rand(0.6, 1.4), shots: 0, ty: 0, side: 1, flash: 0, entered: false, bombed: 0, spin: 0, ...extra })
  }

  function queueWave() {
    const w = world.current
    const { w: W, h: H } = size.current
    const now = w.stageT
    const q = (dt: number, fn: () => void) => w.queue.push({ at: now + dt, spawn: fn })
    w.waveNo += 1
    const pool = ['popLine', 'popRain', 'fanPair']
    if (w.waveNo >= 3 || w.stage > 1) pool.push('swirl')
    if (w.stage >= 2) pool.push('turret', 'sniper')
    if (w.stage >= 3) pool.push('mix')
    const kind: WaveKind = w.def.waves[w.waveNo - 1] ?? (pool[Math.floor(Math.random() * pool.length)] as WaveKind)
    const fireP = w.stage === 1 ? Math.min(0.75, 0.15 + w.waveNo * 0.1) : Math.min(1, 0.5 + w.stage * 0.1)
    if (kind === 'popLine' || kind === 'mix') {
      const side = Math.random() < 0.5 ? -1 : 1
      const by = H * rand(0.08, 0.2)
      const n = 7 + Math.min(4, w.stage)
      for (let i = 0; i < n; i++) {
        q(i * 0.28, () => spawnEnemy('pop', side < 0 ? -20 : W + 20, by, -side * rand(95, 115), 22, { ty: by, shots: Math.random() < fireP ? 1 : 0, side }))
      }
    }
    if (kind === 'popRain') {
      const n = 8 + Math.min(5, w.stage)
      for (let i = 0; i < n; i++) q(i * 0.35, () => spawnEnemy('pop', rand(30, W - 30), -20, 0, 100, { shots: Math.random() < fireP ? 1 : 0, side: Math.random() < 0.5 ? -1 : 1 }))
    }
    if (kind === 'fanPair' || kind === 'mix') {
      q(0.4, () => spawnEnemy('fan', W * 0.27, -30, 0, 140, { ty: H * rand(0.16, 0.24), shots: 3 }))
      q(0.4, () => spawnEnemy('fan', W * 0.73, -30, 0, 140, { ty: H * rand(0.16, 0.24), shots: 3 }))
    }
    if (kind === 'swirl') {
      q(0, () => spawnEnemy('swirl', -20, H * 0.17, 75, 0, { side: 1 }))
      q(1.2, () => spawnEnemy('swirl', W + 20, H * 0.3, -75, 0, { side: -1 }))
    }
    if (kind === 'turret') {
      q(0.2, () => spawnEnemy('turret', W * rand(0.35, 0.65), -30, 0, 26, {}))
      if (w.stage >= 4) q(2.5, () => spawnEnemy('turret', W * rand(0.2, 0.8), -30, 0, 26, {}))
    }
    if (kind === 'popV') {
      // A V of popcorn diving from the top centre.
      for (let i = 0; i < 9; i++) {
        const k = i - 4
        q(Math.abs(k) * 0.18, () => spawnEnemy('pop', W / 2 + k * 24, -20 - Math.abs(k) * 6, k * 8, 95, { shots: Math.random() < fireP ? 1 : 0, side: k < 0 ? -1 : 1 }))
      }
    }
    if (kind === 'swirlPair') {
      q(0, () => spawnEnemy('swirl', -20, H * 0.15, 70, 0, { side: 1 }))
      q(0, () => spawnEnemy('swirl', W + 20, H * 0.27, -70, 0, { side: -1 }))
    }
    if (kind === 'turretPair') {
      q(0.2, () => spawnEnemy('turret', W * 0.28, -30, 0, 24, {}))
      q(1.4, () => spawnEnemy('turret', W * 0.72, -30, 0, 24, {}))
    }
    if (kind === 'snipeLine') {
      for (let i = 0; i < 4; i++) {
        const sd = i % 2 ? -1 : 1
        q(i * 0.5, () => spawnEnemy('sniper', sd > 0 ? -20 : W + 20, H * (0.12 + i * 0.07), sd * 110, 0, { ty: W * (sd > 0 ? 0.12 + i * 0.06 : 0.88 - i * 0.06), side: sd, shots: 2 }))
      }
    }
    if (kind === 'fanQuad') {
      for (const fxp of [0.15, 0.38, 0.62, 0.85]) q(0.3 + fxp, () => spawnEnemy('fan', W * fxp, -30, 0, 140, { ty: H * (0.12 + Math.abs(fxp - 0.5) * 0.2), shots: 2 }))
    }
    if (kind === 'sniper' || (kind === 'mix' && w.stage >= 4)) {
      q(0.3, () => spawnEnemy('sniper', -20, H * 0.32, 110, 0, { ty: W * 0.15, side: 1, shots: 2 }))
      q(0.3, () => spawnEnemy('sniper', W + 20, H * 0.32, -110, 0, { ty: W * 0.85, side: -1, shots: 2 }))
    }
  }

  function startBoss() {
    const w = world.current
    const W = size.current.w
    const bd = w.def.boss
    const set = bd.phases
    const hp = Math.round(bd.hp * (1 + w.stage * 0.06))
    w.boss = {
      x: W / 2, y: -80, tx: W / 2, hp, max: hp, phases: set, phase: 0, pt: 0, ang: 0, cd: 1, cd2: 1, dir: 1, pause: 0, flash: 0, moveT: 2,
      hue: bd.hue, enter: 1.6, name: bd.name, form: bd.form,
    }
    w.segment = 'boss'
    pushBossUi()
    show(`${w.def.grand ? 'GRAND BOSS · ' : ''}${bd.name}`, `${PATTERN_NAME[set[0]]} · ${set.length} phases`)
    sfx.boom(0.6)
    fx.shake(8, 0.6)
    haptic.heavy()
  }

  function pushBossUi() {
    const w = world.current
    const b = w.boss
    if (!b) {
      setBossUi(null)
      return
    }
    setBossUi({ name: b.name, pct: Math.max(0, b.hp / b.max), phase: b.phase, phases: b.phases.length })
  }

  /** Turn all enemy bullets into score sparkles. */
  function cancelBullets(x?: number, y?: number, r = Infinity) {
    const w = world.current
    let n = 0
    w.bullets = w.bullets.filter((b) => {
      if (x != null && y != null && dist(b.x, b.y, x, y) > r) return true
      n++
      if (n % 3 === 0) fx.burst(b.x, b.y, { count: 1, color: BCOLORS[b.color % BCOLORS.length], speed: 60, size: 2.5, gravity: 0, life: 0.4 })
      return false
    })
    if (x == null) w.lasers = []
    addScore(n * 10)
    return n
  }

  function bossPhaseDone() {
    const w = world.current
    const b = w.boss
    if (!b) return
    const n = cancelBullets()
    w.lasers = []
    fx.explode(b.x, b.y, 1.5, [b.hue, '#ffffff', '#fde047'])
    fx.stop(0.12)
    sfx.boom(0.7)
    haptic.heavy()
    dropItems(b.x, b.y, ['p', 'p', 'pt', 'pt', 'pt'])
    if (n > 0) fx.text(b.x, b.y + 50, `+${n * 10}`, '#a5f3fc', 16)
    b.phase += 1
    if (b.phase >= b.phases.length) {
      killBoss()
      return
    }
    b.hp = b.max
    b.pt = 0
    b.cd = 1.2
    b.cd2 = 1
    b.pause = 1.1
    show(PATTERN_NAME[b.phases[b.phase]], `phase ${b.phase + 1} / ${b.phases.length}`)
    pushBossUi()
  }

  function killBoss() {
    const w = world.current
    const b = w.boss
    if (!b) return
    fx.explode(b.x, b.y, 3, [b.hue, '#ffffff', '#fde047', '#f472b6'])
    fx.flash('#ffffff', 0.4)
    fx.slowmo(1.2, 0.3)
    fx.stop(0.2)
    sfx.boom(1)
    sfx.win()
    haptic.success()
    const bonus = 20000 * w.stage
    addScore(bonus)
    w.stats.bosses += 1
    dropItems(b.x, b.y, ['bigp', 'bomb', 'pt', 'pt', 'pt', 'pt', 'pt', 'pt', ...(w.stage % 2 === 0 ? (['life'] as IKind[]) : [])])
    w.boss = null
    w.segment = 'clear'
    w.segT = 0
    setBossUi(null)
    // Stars: clear = 1, no life lost this stage = +1, every boss phase broken before its timer = +1.
    const stars = 1 + (w.lives >= w.livesAtStage ? 1 : 0) + (w.timeouts === 0 ? 1 : 0)
    run.completeLevel(w.stage, stars)
    show('BOSS DEFEATED', `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  +${bonus.toLocaleString()}`)
    void trackEvent('action_milestone', { game_id: 'bullet', kind: 'boss', value: w.stage })
    run.update(w.stats)
    pushHud()
  }

  function dropItems(x: number, y: number, kinds: IKind[]) {
    const w = world.current
    for (const k of kinds) {
      if (w.items.length > 80) break
      w.items.push({ x: x + rand(-18, 18), y: y + rand(-10, 10), vx: rand(-60, 60), vy: rand(-200, -110), kind: k, vac: false, t: 0 })
    }
  }

  function killEnemy(e: Enemy) {
    const w = world.current
    e.hp = 0
    const big = e.kind === 'turret' || e.kind === 'fan'
    fx.explode(e.x, e.y, big ? 1.2 : 0.55, ['#fde047', '#f472b6', '#ffffff', '#a78bfa'])
    if (big) {
      fx.stop(0.04)
      sfx.boom(0.45)
      haptic.medium()
    } else {
      sfx.pop()
      haptic.light()
    }
    addScore(ENEMY_VALUE[e.kind])
    fx.text(e.x, e.y - 12, `${ENEMY_VALUE[e.kind]}`, '#fef08a', big ? 16 : 12)
    w.stats.kills += 1
    const drops: IKind[] = []
    if (e.kind === 'pop') {
      if (Math.random() < 0.35) drops.push('pt')
      if (Math.random() < 0.2) drops.push('p')
    } else if (e.kind === 'fan') drops.push('p', 'p', 'pt', 'pt')
    else if (e.kind === 'turret') {
      drops.push('p', 'p', 'p', 'pt', 'pt', 'pt')
      if (Math.random() < 0.15) drops.push('bomb')
    } else if (e.kind === 'swirl') drops.push('p', 'pt', 'pt')
    else drops.push('pt', 'pt')
    dropItems(e.x, e.y, drops)
    // Popcorn on later stages leaves a parting ring.
    if (w.stage >= 5 && e.kind === 'pop' && Math.random() < 0.3) ring(e.x, e.y, 6, spd(90), rand(0, 1), 'orb', 5)
  }

  function useBomb() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.bombs <= 0 || w.bombT > 0) return
    w.bombs -= 1
    w.bombT = 1.4
    w.bombId += 1
    w.ship.inv = Math.max(w.ship.inv, 2.4)
    fx.flash('#f0abfc', 0.35)
    fx.shake(10, 0.5)
    fx.ring(w.ship.x, w.ship.y, { color: '#f0abfc', maxR: 160, life: 0.6, width: 8 })
    sfx.boom(1)
    sfx.power()
    haptic.heavy()
    pushHud()
  }

  function hitShip() {
    const w = world.current
    const s = w.ship
    const { w: W, h: H } = size.current
    if (s.inv > 0 || phaseRef.current !== 'play') return
    fx.explode(s.x, s.y, 1.8, ['#ffffff', '#f0abfc', '#22d3ee', '#fde047'])
    fx.flash('#ef4444', 0.3)
    fx.stop(0.18)
    fx.shake(12, 0.4)
    sfx.boom(0.9)
    sfx.hurt()
    haptic.heavy()
    w.lives -= 1
    const lost = Math.min(1, w.power - 1)
    w.power = Math.max(1, w.power - 1)
    if (lost > 0) for (let i = 0; i < 4; i++) w.items.push({ x: s.x, y: s.y, vx: rand(-120, 120), vy: rand(-320, -220), kind: 'p', vac: false, t: -0.6 })
    cancelBullets(s.x, s.y, 160)
    w.lasers = []
    if (w.lives <= 0) {
      die()
      return
    }
    w.bombs = Math.max(w.bombs, 2 + run.level('bombs'))
    s.inv = 2.8
    s.x = W / 2
    s.y = H - 90
    show('MISS', `${w.lives} ${w.lives === 1 ? 'life' : 'lives'} left`)
    pushHud()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.stage * 5 + w.stats.bosses * 6 + w.graze / 25 + w.stats.kills / 12)
      run.end({ score: w.score, cleared: w.stats.bosses >= 1, stats: { ...w.stats }, coins }, revive)
    }, 1100)
  }

  function revive() {
    const w = world.current
    const { w: W, h: H } = size.current
    w.lives = 2
    w.bombs = Math.max(w.bombs, 2 + run.level('bombs'))
    cancelBullets()
    w.lasers = []
    w.ship.x = W / 2
    w.ship.y = H - 90
    w.ship.inv = 3
    fx.ring(W / 2, H - 90, { color: '#fde047', maxR: 100, life: 0.6, width: 6 })
    show('REVIVED!')
    pushHud()
    setPhaseBoth('play')
  }

  // ── Updates ─────────────────────────────────
  function updateEnemies(dt: number) {
    const w = world.current
    const { w: W, h: H } = size.current
    for (const e of w.enemies) {
      e.t += dt
      e.flash = Math.max(0, e.flash - dt)
      e.spin += dt * 3
      switch (e.kind) {
        case 'pop': {
          if (e.ty) {
            e.x += e.vx * dt
            e.y = e.ty + Math.sin(e.t * 2.4) * 26 + e.t * 22
          } else {
            e.x += Math.sin(e.t * 2 + e.id) * 50 * dt * e.side
            e.y += e.vy * dt
          }
          e.fire -= dt
          if (e.shots > 0 && e.fire <= 0 && e.entered && e.y < H * 0.6) {
            e.shots -= 1
            const n = w.stage >= 4 ? 3 : 1
            fan(e.x, e.y, aim(e.x, e.y), n, 0.35, spd(120), 'orb', 0)
          }
          break
        }
        case 'fan': {
          if (e.shots > 0 || e.t < 1) {
            e.y += (e.ty - e.y) * Math.min(1, dt * 3)
            e.fire -= dt
            if (e.fire <= 0 && e.t > 1) {
              e.fire = 0.85
              e.shots -= 1
              const n = 3 + Math.min(5, w.stage)
              fan(e.x, e.y + 10, aim(e.x, e.y), n, 0.9, spd(140), 'rice', 2)
              if (w.stage >= 3) fan(e.x, e.y + 10, aim(e.x, e.y), n - 1, 0.7, spd(105), 'rice', 5)
              sfx.tick()
            }
          } else {
            e.y -= 90 * dt
          }
          break
        }
        case 'turret': {
          e.y += e.vy * dt
          e.fire -= dt
          if (e.fire <= 0 && e.entered && e.y < H * 0.55) {
            e.fire = Math.max(1.1, 1.9 - w.stage * 0.08)
            const n = Math.min(26, 10 + w.stage * 2)
            ring(e.x, e.y, n, spd(95), e.t, 'orb', 1)
            if (w.stage >= 3) ring(e.x, e.y, Math.floor(n / 2), spd(65), e.t + 0.3, 'big', 6)
            sfx.tick()
          }
          break
        }
        case 'swirl': {
          e.x += e.vx * dt
          e.y += Math.sin(e.t * 1.6) * 20 * dt
          e.fire -= dt
          if (e.fire <= 0 && e.entered) {
            e.fire = Math.max(0.09, 0.16 - w.stage * 0.01)
            const a = e.t * 4 * e.side
            emit(e.x, e.y, a, spd(110), 'rice', 3)
            emit(e.x, e.y, a + Math.PI, spd(110), 'rice', 3)
          }
          break
        }
        case 'sniper': {
          if (e.shots > 0) {
            e.x += (e.ty - e.x) * Math.min(1, dt * 2.5)
            e.fire -= dt
            if (e.fire <= 0 && e.t > 0.8) {
              e.fire = 1.8
              e.shots -= 1
              const a = aim(e.x, e.y)
              for (let k = 0; k < 4; k++) emit(e.x, e.y, a, spd(190) + k * 40, 'rice', 7)
              sfx.shoot()
            }
          } else {
            e.x += -e.side * 140 * dt
          }
          break
        }
      }
      const r = ENEMY_R[e.kind]
      if (!e.entered && e.x > r && e.x < W - r && e.y > r && e.y < H) e.entered = true
      if (e.entered && (e.x < -60 || e.x > W + 60 || e.y < -80 || e.y > H + 60)) e.hp = -999
      // Body contact
      if (e.hp > 0 && dist(e.x, e.y, w.ship.x, w.ship.y) < r * 0.7 + HITBOX) hitShip()
    }
    w.enemies = w.enemies.filter((e) => e.hp > 0)
  }

  function updateBoss(dt: number) {
    const w = world.current
    const b = w.boss
    const { w: W, h: H } = size.current
    if (!b) return
    b.flash = Math.max(0, b.flash - dt)
    if (b.enter > 0) {
      b.enter -= dt
      b.y += (H * 0.2 - b.y) * Math.min(1, dt * 2.5)
      return
    }
    const pat = b.phases[b.phase]
    const center = pat === 'spiral' || pat === 'cross' || pat === 'flower'
    b.moveT -= dt
    if (b.moveT <= 0) {
      b.moveT = rand(2, 3.2)
      b.tx = center ? W / 2 + rand(-20, 20) : rand(W * 0.25, W * 0.75)
    }
    b.x += (b.tx - b.x) * Math.min(1, dt * 1.5)
    b.y = H * 0.2 + Math.sin(b.pt * 1.3) * 8
    if (b.pause > 0) {
      b.pause -= dt
      return
    }
    b.pt += dt
    const st = w.stage
    const hard = Math.min(1, (st - 1) / 6)
    b.cd -= dt
    b.cd2 -= dt
    switch (pat) {
      case 'fans':
        if (b.cd <= 0) {
          b.cd = 1 - hard * 0.4
          const n = 5 + Math.min(6, st)
          fan(b.x, b.y + 20, aim(b.x, b.y), n, 1.1, spd(150), 'rice', 0)
          fan(b.x, b.y + 20, aim(b.x, b.y), n + 1, 1.25, spd(115), 'rice', 5)
          sfx.tick()
        }
        if (b.cd2 <= 0) {
          b.cd2 = 2.4
          ring(b.x, b.y, 14 + st, spd(80), b.pt, 'big', 2)
        }
        break
      case 'ring':
        if (b.cd <= 0) {
          b.cd = 1.1 - hard * 0.4
          b.dir = -b.dir
          const n = Math.min(36, 16 + st * 2)
          ring(b.x, b.y, n, spd(115), b.dir > 0 ? 0 : Math.PI / n, 'orb', 1)
          if (Math.floor(b.pt) % 3 === 0) ring(b.x, b.y, Math.floor(n / 2), spd(70), b.pt, 'big', 6)
          sfx.tick()
        }
        if (st >= 3 && b.cd2 <= 0) {
          b.cd2 = 1.6
          fan(b.x, b.y, aim(b.x, b.y), 3, 0.3, spd(170), 'rice', 0)
        }
        break
      case 'spiral': {
        if (b.cd <= 0) {
          b.cd = 0.075 - hard * 0.015
          b.ang += 0.2
          const arms = Math.min(5, 2 + Math.floor(st / 2))
          for (let k = 0; k < arms; k++) emit(b.x, b.y, b.ang + (k / arms) * Math.PI * 2, spd(125), 'orb', Math.floor(b.pt * 2) % 2 ? 0 : 2)
        }
        if (b.cd2 <= 0) {
          b.cd2 = 2.2
          fan(b.x, b.y, aim(b.x, b.y), 3, 0.25, spd(150), 'big', 3)
        }
        break
      }
      case 'laser':
        if (b.cd <= 0) {
          b.cd = 3.2 - hard * 0.8
          const k = 3 + Math.min(3, Math.floor(st / 2))
          const a0 = aim(b.x, b.y)
          const sweep = st >= 3 ? (Math.random() < 0.5 ? -0.22 : 0.22) : 0
          for (let i = 0; i < k; i++) w.lasers.push({ x: b.x, y: b.y + 10, a: a0 + (i - (k - 1) / 2) * 0.42, t: 0, warn: 1.05, dur: 1.1, w: 15, sweep })
          sfx.ready()
        }
        if (b.cd2 <= 0) {
          b.cd2 = 1.3
          ring(b.x, b.y, 12 + st, spd(75), b.pt, 'orb', 6)
        }
        break
      case 'flower':
        if (b.cd <= 0) {
          b.cd = 0.1 - hard * 0.02
          b.ang += 0.17
          const arms = 3 + Math.min(2, Math.floor(st / 3))
          for (let k = 0; k < arms; k++) {
            emit(b.x, b.y, b.ang + (k / arms) * Math.PI * 2, spd(105), 'rice', 0, 0, 0, 0.55)
            emit(b.x, b.y, -b.ang + (k / arms) * Math.PI * 2, spd(105), 'rice', 1, 0, 0, -0.55)
          }
        }
        break
      case 'rain':
        if (b.cd <= 0) {
          b.cd = 0.13 - hard * 0.04
          emit(rand(10, W - 10), -10, Math.PI / 2 + rand(-0.25, 0.25), spd(rand(80, 130)), 'star', 4, 25, spd(170))
        }
        if (b.cd2 <= 0) {
          b.cd2 = 1.4 - hard * 0.4
          fan(b.x, b.y, aim(b.x, b.y), 5, 0.6, spd(140), 'rice', 3)
        }
        break
      case 'cross':
        if (b.cd <= 0) {
          b.cd = 0.085
          if (Math.floor(b.pt / 3) % 2) b.ang += 0.07
          else b.ang -= 0.07
          for (let k = 0; k < 4; k++) emit(b.x, b.y, b.ang + (k * Math.PI) / 2, spd(140), 'star', 3)
        }
        if (b.cd2 <= 0) {
          b.cd2 = 1.5 - hard * 0.3
          ring(b.x, b.y, 18 + st, spd(85), b.pt * 0.7, 'orb', 2)
        }
        break
    }
    // New patterns from the authored stages.
    if (pat === 'wall' && b.cd <= 0) {
      // A row of bullets falls with a drifting gap — slip through it.
      b.cd = 1.15 - hard * 0.25
      b.ang += 0.9
      const gap = W / 2 + Math.sin(b.ang) * W * 0.32
      const n = 15
      for (let i = 0; i <= n; i++) {
        const x = (i / n) * W
        if (Math.abs(x - gap) < 44) continue
        emit(x, -6, Math.PI / 2, spd(95), 'orb', 6)
      }
      sfx.tick()
    } else if (pat === 'web' && b.cd <= 0) {
      // Two sweeping streams that cross in front of the boss.
      b.cd = 0.11 - hard * 0.02
      b.ang += 0.05 * b.dir
      if (Math.abs(b.ang) > 0.9) b.dir = -b.dir
      for (const sd of [-1, 1]) emit(b.x + sd * 30, b.y, Math.PI / 2 + sd * b.ang, spd(150), 'rice', sd < 0 ? 1 : 2)
    } else if (pat === 'pulse' && b.cd <= 0) {
      // Heartbeat: slow rings that suddenly accelerate.
      b.cd = 1.25 - hard * 0.3
      const n = Math.min(30, 14 + st)
      ring(b.x, b.y, n, spd(40), b.pt * 0.5, 'big', 5)
      for (let k = w.bullets.length - n; k < w.bullets.length; k++) {
        const bl = w.bullets[k]
        if (bl) {
          bl.acc = 120
          bl.maxS = spd(170)
        }
      }
      sfx.tick()
    }
    if ((pat === 'wall' || pat === 'pulse') && b.cd2 <= 0) {
      b.cd2 = 2.1
      fan(b.x, b.y, aim(b.x, b.y), 3, 0.3, spd(150), 'rice', 0)
    }
    // Phase timeout: skip without bonus (and without the third star).
    if (b.pt > 30) {
      w.timeouts += 1
      bossPhaseDone()
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    drag.current = { id: e.pointerId, x: p.x, y: p.y }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId || phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    const s = world.current.ship
    const { w: W, h: H } = size.current
    const dx = (p.x - d.x) * 1.15
    s.x = clamp(s.x + dx, 10, W - 10)
    s.y = clamp(s.y + (p.y - d.y) * 1.15, 50, H - 16)
    s.bank = clamp(s.bank + dx * 0.04, -1, 1)
    d.x = p.x
    d.y = p.y
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null
  }

  useEffect(() => {
    function key(e: KeyboardEvent, down: boolean) {
      const k = e.key
      if (k === 'ArrowLeft' || k === 'a') keys.current.l = down
      else if (k === 'ArrowRight' || k === 'd') keys.current.r = down
      else if (k === 'ArrowUp' || k === 'w') keys.current.u = down
      else if (k === 'ArrowDown' || k === 's') keys.current.d = down
      else if ((k === ' ' || k === 'x' || k === 'b') && down) useBomb()
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

  function simulate(raw: number, t: number) {
    const { w: W, h: H } = size.current
    const w = world.current
    const s = w.ship
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const playing = ph === 'play'
    w.scroll += dt * (40 + w.stage * 4)
    s.bank = approachZero(s.bank, dt * 4)

    if (ph === 'idle') {
      // Attract: a slow spiral bloom over a weaving ship.
      w.demoAng += raw * 2.2
      if (Math.floor(t * 12) !== Math.floor((t - raw) * 12)) {
        for (let k = 0; k < 3; k++) emit(W / 2, H * 0.25, w.demoAng + (k / 3) * Math.PI * 2, 85, 'orb', k % 2 ? 0 : 1)
      }
      s.x = W / 2 + Math.sin(t * 0.8) * W * 0.3
      s.y = H * 0.78 + Math.sin(t * 1.3) * 20
    }

    if (playing || ph === 'dying') {
      w.stageT += dt
      w.segT += dt
      if (playing) {
        const kv = 260 * dt
        if (keys.current.l) s.x -= kv
        if (keys.current.r) s.x += kv
        if (keys.current.u) s.y -= kv
        if (keys.current.d) s.y += kv
        if (import.meta.env.DEV && devAuto.current) autoPilot(dt)
        s.x = clamp(s.x, 10, W - 10)
        s.y = clamp(s.y, 50, H - 16)
      }
      s.inv = Math.max(0, s.inv - dt)

      // Segment flow
      if (w.segment === 'waves') {
        for (const q of w.queue) if (q.at <= w.stageT) q.spawn()
        w.queue = w.queue.filter((q) => q.at > w.stageT)
        w.waveT -= dt
        const empty = w.enemies.length === 0 && w.queue.length === 0
        if (w.wavesLeft > 0 && (w.waveT <= 0 || (empty && w.waveT < 3))) {
          w.wavesLeft -= 1
          w.waveT = Math.max(3.2, 5 - w.stage * 0.2)
          queueWave()
        } else if (w.wavesLeft === 0 && empty) {
          w.segment = 'warning'
          w.segT = 0
          show('WARNING', 'boss approaching')
          sfx.boom(0.3)
          fx.flash('#f43f5e', 0.2)
        }
      } else if (w.segment === 'warning') {
        if (w.segT > 2.2) startBoss()
      } else if (w.segment === 'clear') {
        for (const it of w.items) it.vac = true
        if (w.segT > 3.6 && playing) nextStage()
      }

      // Firing
      if (playing && w.segment !== 'clear') {
        w.fireT -= dt
        if (w.fireT <= 0) {
          w.fireT = 0.075
          const L = Math.floor(w.power)
          const dmg = L >= 5 ? 1.25 : 1
          const y = s.y - 16
          const shoot = (dx: number, a: number, homing = false) => w.shots.push({ x: s.x + dx, y, vx: Math.sin(a) * 900, vy: -Math.cos(a) * 900, dmg, homing })
          if (L <= 1) {
            shoot(-5, 0)
            shoot(5, 0)
          } else if (L === 2) {
            shoot(0, 0)
            shoot(-7, -0.05)
            shoot(7, 0.05)
          } else {
            shoot(0, 0)
            shoot(-7, -0.06)
            shoot(7, 0.06)
            if (L >= 4) {
              shoot(-10, -0.17)
              shoot(10, 0.17)
            }
          }
          if (L >= 3 && Math.floor(t * 13.3) % 2 === 0) {
            for (const sd of [-1, 1]) w.shots.push({ x: s.x + sd * 24, y: s.y, vx: 0, vy: -800, dmg: 1, homing: L >= 4 })
          }
          if (Math.floor(t * 13.3) % 3 === 0) sfx.shoot()
        }
      }

      updateEnemies(dt)
      updateBoss(dt)

      // Player shots
      const b = w.boss
      for (const sh of w.shots) {
        if (sh.homing) {
          let tx = 0
          let ty = 0
          let best = 1e9
          if (b && b.enter <= 0) {
            tx = b.x
            ty = b.y
            best = dist(b.x, b.y, sh.x, sh.y)
          }
          for (const e of w.enemies) {
            const d = dist(e.x, e.y, sh.x, sh.y)
            if (d < best && e.entered) {
              best = d
              tx = e.x
              ty = e.y
            }
          }
          if (best < 1e9) {
            const a = Math.atan2(ty - sh.y, tx - sh.x)
            const cur = Math.atan2(sh.vy, sh.vx)
            let da = a - cur
            while (da > Math.PI) da -= Math.PI * 2
            while (da < -Math.PI) da += Math.PI * 2
            const na = cur + clamp(da, -8 * dt, 8 * dt)
            sh.vx = Math.cos(na) * 800
            sh.vy = Math.sin(na) * 800
          }
        }
        sh.x += sh.vx * dt
        sh.y += sh.vy * dt
        if (sh.y < -20 || sh.x < -20 || sh.x > W + 20) {
          sh.y = -999
          continue
        }
        if (b && b.enter <= 0 && Math.abs(sh.x - b.x) < 30 && Math.abs(sh.y - b.y) < 30) {
          sh.y = -999
          if (b.pause <= 0) {
            b.hp -= sh.dmg
            b.flash = 0.05
            if (Math.random() < 0.3) fx.burst(sh.x, sh.y, { count: 2, color: ['#ffffff', b.hue], speed: 120, gravity: 0, size: 2, life: 0.25 })
            addScore(10)
            if (b.hp <= 0) bossPhaseDone()
          }
          continue
        }
        for (const e of w.enemies) {
          if (e.hp <= 0) continue
          const r = ENEMY_R[e.kind]
          if (Math.abs(sh.x - e.x) < r && Math.abs(sh.y - e.y) < r + 4) {
            sh.y = -999
            e.hp -= sh.dmg
            e.flash = 0.05
            addScore(5)
            if (e.hp <= 0) killEnemy(e)
            break
          }
        }
      }
      w.shots = w.shots.filter((sh) => sh.y > -100)
      w.enemies = w.enemies.filter((e) => e.hp > 0)
      if (b && w.boss && Math.floor(t * 10) !== Math.floor((t - raw) * 10)) pushBossUi()

      // Bomb wave
      if (w.bombT > 0) {
        w.bombT -= dt
        const R = (1 - Math.max(0, w.bombT - 0.8) / 0.6) * Math.max(W, H) * 1.2
        const before = w.bullets.length
        cancelBullets(s.x, s.y, R)
        if (before !== w.bullets.length && w.bullets.length === 0) w.lasers = []
        if (R > H) w.lasers = []
        for (const e of w.enemies) {
          if (e.bombed !== w.bombId && dist(e.x, e.y, s.x, s.y) < R) {
            e.bombed = w.bombId
            e.hp -= 30
            e.flash = 0.1
            if (e.hp <= 0) killEnemy(e)
          }
        }
        w.enemies = w.enemies.filter((e) => e.hp > 0)
        if (w.boss && w.boss.enter <= 0 && w.bombT < 1.0 && w.bombT + dt >= 1.0 && w.boss.pause <= 0) {
          w.boss.hp -= 45
          w.boss.flash = 0.2
          if (w.boss.hp <= 0) bossPhaseDone()
        }
      }

      // Enemy bullets: motion, graze, hits
      const sx = s.x
      const sy = s.y
      let grazed = 0
      for (const bl of w.bullets) {
        if (bl.acc) bl.s = Math.min(bl.maxS, bl.s + bl.acc * dt)
        if (bl.curve) bl.a += bl.curve * dt
        bl.x += Math.cos(bl.a) * bl.s * dt
        bl.y += Math.sin(bl.a) * bl.s * dt
        if (!playing) continue
        const dx = bl.x - sx
        const dy = bl.y - sy
        if (dx > 30 || dx < -30 || dy > 30 || dy < -30) continue
        const d = Math.sqrt(dx * dx + dy * dy)
        const r = BRADIUS[bl.type]
        if (d < r * 0.7 + HITBOX && s.inv <= 0) {
          hitShip()
          break
        }
        if (!bl.grazed && d < r + GRAZE_R) {
          bl.grazed = true
          grazed++
        }
      }
      if (grazed > 0 && playing) {
        w.graze += grazed
        w.grazeBank += grazed
        w.stats.grazes = w.graze
        addScore(grazed * (40 + w.stage * 10))
        fx.burst(sx, sy, { count: 2 * grazed, color: ['#a5f3fc', '#ffffff'], speed: 160, size: 2, gravity: 0, life: 0.25, shape: 'spark' })
        if (t - w.grazeSfx > 0.05) {
          w.grazeSfx = t
          sfx.tick()
        }
        if (w.grazeBank >= 50) {
          w.grazeBank -= 50
          if (w.bombs < 6) {
            w.bombs += 1
            fx.text(sx, sy - 34, '+1 BOMB', '#86efac', 18)
            sfx.power()
            haptic.success()
          }
        }
        run.update(w.stats)
        pushHud()
      }
      w.bullets = w.bullets.filter((bl) => bl.x > -30 && bl.x < W + 30 && bl.y > -40 && bl.y < H + 30)

      // Lasers
      for (const L of w.lasers) {
        L.t += dt
        if (L.t > L.warn) L.a += L.sweep * dt
        if (playing && L.t > L.warn && L.t < L.warn + L.dur && s.inv <= 0) {
          const ux = Math.cos(L.a)
          const uy = Math.sin(L.a)
          const px = sx - L.x
          const py = sy - L.y
          const along = px * ux + py * uy
          const perp = Math.abs(px * uy - py * ux)
          if (along > 0 && perp < L.w * 0.4 + HITBOX) hitShip()
        }
      }
      w.lasers = w.lasers.filter((L) => L.t < L.warn + L.dur)

      // Items
      const magnet = run.level('magnet')
      const vacLine = H * (0.3 + magnet * 0.03)
      const vacAll = s.y < vacLine && playing
      for (const it of w.items) {
        it.t += dt
        if (vacAll && it.t > 0) it.vac = true
        if ((it.vac || dist(it.x, it.y, sx, sy) < 34 + magnet * 14) && it.t > 0 && playing) {
          const a = Math.atan2(sy - it.y, sx - it.x)
          it.x += Math.cos(a) * 560 * dt
          it.y += Math.sin(a) * 560 * dt
        } else {
          it.vy = Math.min(110, it.vy + 260 * dt)
          it.vx *= Math.exp(-2 * dt)
          it.x += it.vx * dt
          it.y += it.vy * dt
        }
        if (playing && it.t > 0 && dist(it.x, it.y, sx, sy) < 18) {
          it.y = H + 999
          collect(it)
        }
      }
      w.items = w.items.filter((it) => it.y < H + 30)
    } else {
      // Idle: just drift demo bullets.
      for (const bl of w.bullets) {
        bl.x += Math.cos(bl.a) * bl.s * raw
        bl.y += Math.sin(bl.a) * bl.s * raw
      }
      w.bullets = w.bullets.filter((bl) => bl.x > -30 && bl.x < W + 30 && bl.y > -40 && bl.y < H + 30)
    }

  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    if (size.current.w !== W || size.current.h !== H) {
      size.current = { w: W, h: H }
      if (phaseRef.current === 'idle') world.current = freshWorld(W, H)
    }
    const reps = import.meta.env.DEV ? devSpeed.current : 1
    for (let k = 0; k < reps; k++) simulate(raw, t)
    const w = world.current
    const s = w.ship
    const ph = phaseRef.current

    // ── Draw ─────────────────────────────────────
    const pal = PALETTES[(ph === 'idle' ? 0 : w.def.palette) % PALETTES.length]
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, pal[0])
    bg.addColorStop(1, pal[1])
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // Scrolling perspective grid
    ctx.strokeStyle = pal[2]
    ctx.globalAlpha = 0.09
    ctx.lineWidth = 1
    const gs = 46
    const off = w.scroll % gs
    ctx.beginPath()
    for (let y = -gs + off; y < H; y += gs) {
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
    }
    for (let x = (W / 2) % gs; x < W; x += gs) {
      ctx.moveTo(x, 0)
      ctx.lineTo(x, H)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    // Nebula blobs drifting at parallax speed
    for (let i = 0; i < 3; i++) {
      const ny = ((w.scroll * (0.3 + i * 0.15) + i * 260) % (H + 300)) - 150
      glow(ctx, (i * 0.37 + 0.2) * W, ny, 140 + i * 30, i === 1 ? '#22d3ee' : pal[2], 0.12)
    }
    for (let i = 0; i < 40; i++) {
      const sy0 = ((i * 97 + w.scroll * (0.8 + (i % 3) * 0.6)) % H)
      ctx.fillStyle = i % 4 ? 'rgba(255,255,255,0.5)' : 'rgba(165,243,252,0.8)'
      ctx.fillRect((i * 151) % W, sy0, 1.5, 1.5 + (i % 3))
    }

    fx.applyShake(ctx)

    for (const it of w.items) drawItem(ctx, it.kind, it.x, it.y, t + it.x)

    for (const e of w.enemies) drawEnemy(ctx, e.kind, e.x, e.y, t, e.flash > 0, e.spin)

    if (w.boss) {
      const b = w.boss
      drawBoss(ctx, b.x, b.y, t, b.hue, b.flash > 0, b.phase / Math.max(1, b.phases.length - 1), b.form)
    }

    // Player shots
    ctx.lineCap = 'round'
    for (const sh of w.shots) {
      ctx.strokeStyle = sh.homing ? 'rgba(134,239,172,0.5)' : 'rgba(240,171,252,0.45)'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(sh.x, sh.y)
      ctx.lineTo(sh.x - sh.vx * 0.016, sh.y - sh.vy * 0.016)
      ctx.stroke()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Ship + options
    const showShip = ph !== 'over' && ph !== 'dying' && !(s.inv > 0 && Math.floor(t * 15) % 2 === 0 && ph === 'play')
    if (showShip) {
      if (Math.floor(w.power) >= 3 && ph === 'play') {
        for (const sd of [-1, 1]) {
          const ox = s.x + sd * 24
          const oy = s.y + 4 + Math.sin(t * 5 + sd) * 2
          glow(ctx, ox, oy, 12, '#86efac', 0.5)
          ctx.fillStyle = '#14532d'
          ctx.beginPath()
          ctx.arc(ox, oy, 5.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#86efac'
          ctx.beginPath()
          ctx.arc(ox, oy, 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      drawShip(ctx, s.x, s.y, t, s.bank)
    }

    // Lasers
    for (const L of w.lasers) {
      const len = Math.hypot(W, H) * 1.2
      const ex = L.x + Math.cos(L.a) * len
      const ey = L.y + Math.sin(L.a) * len
      if (L.t < L.warn) {
        ctx.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(L.t * 18))
        ctx.strokeStyle = '#fda4af'
        ctx.lineWidth = 1.5
        ctx.setLineDash([8, 6])
        ctx.beginPath()
        ctx.moveTo(L.x, L.y)
        ctx.lineTo(ex, ey)
        ctx.stroke()
        ctx.setLineDash([])
      } else {
        const k = Math.min(1, (L.t - L.warn) * 8) * Math.min(1, (L.warn + L.dur - L.t) * 6)
        ctx.globalAlpha = 0.45 * k
        ctx.strokeStyle = '#f43f5e'
        ctx.lineWidth = L.w * 1.8 * k
        ctx.beginPath()
        ctx.moveTo(L.x, L.y)
        ctx.lineTo(ex, ey)
        ctx.stroke()
        ctx.globalAlpha = k
        ctx.strokeStyle = '#fecdd3'
        ctx.lineWidth = L.w * 0.7 * k
        ctx.stroke()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = L.w * 0.3 * k
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    // Enemy bullets on top for readability
    for (const bl of w.bullets) {
      const sp = bulletSprite(bl.type, bl.color)
      const h = sp.size / 2
      if (bl.type === 'rice' || bl.type === 'star') {
        ctx.save()
        ctx.translate(bl.x, bl.y)
        ctx.rotate(bl.type === 'star' ? t * 4 : bl.a)
        ctx.drawImage(sp.c, -h, -h, sp.size, sp.size)
        ctx.restore()
      } else ctx.drawImage(sp.c, bl.x - h, bl.y - h, sp.size, sp.size)
    }

    // Hitbox core
    if (showShip && ph !== 'idle') {
      ctx.fillStyle = 'rgba(244,114,182,0.9)'
      ctx.beginPath()
      ctx.arc(s.x, s.y, HITBOX + 2.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(s.x, s.y, HITBOX, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(165,243,252,0.25)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(s.x, s.y, GRAZE_R, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Bomb shock ring
    if (w.bombT > 0) {
      const R = (1 - Math.max(0, w.bombT - 0.8) / 0.6) * Math.max(W, H) * 1.2
      ctx.globalAlpha = Math.min(1, w.bombT)
      ctx.strokeStyle = '#f0abfc'
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.arc(s.x, s.y, R, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    fx.draw(ctx)
    ctx.restore()

    // Lives, power gauge (canvas UI)
    if (ph !== 'idle') {
      for (let i = 0; i < Math.min(8, w.lives); i++) drawItem(ctx, 'life', 18 + i * 22, H - 50, 0)
      const L = Math.floor(w.power)
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.beginPath()
      ctx.roundRect(8, H - 28, 96, 14, 7)
      ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.roundRect(10, H - 26, 92 * Math.min(1, (w.power - 1) / 4), 10, 5)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(L >= 5 ? 'POWER MAX' : `POWER ${L}`, 14, H - 21)
    }
    fx.drawOverlay(ctx, W, H)
  }

  function collect(it: Item) {
    const w = world.current
    const s = w.ship
    const H = size.current.h
    if (it.kind === 'p' || it.kind === 'bigp') {
      const before = Math.floor(w.power)
      if (w.power >= 5) addScore(500)
      w.power = Math.min(5, w.power + (it.kind === 'bigp' ? 1 : 0.12))
      if (Math.floor(w.power) > before) {
        fx.text(s.x, s.y - 34, Math.floor(w.power) >= 5 ? 'POWER MAX!' : 'POWER UP!', '#fca5a5', 18)
        fx.ring(s.x, s.y, { color: '#f87171', maxR: 50, life: 0.35 })
        sfx.power()
        haptic.success()
      } else sfx.pop()
    } else if (it.kind === 'pt') {
      const v = Math.round((300 + 900 * clamp(1 - it.y / H, 0, 1)) / 10) * 10
      addScore(v)
      if (Math.random() < 0.4) fx.text(it.x, it.y - 10, `${v}`, '#bfdbfe', 11)
      sfx.score(2)
    } else if (it.kind === 'bomb') {
      w.bombs = Math.min(6, w.bombs + 1)
      fx.text(s.x, s.y - 34, '+1 BOMB', '#86efac', 18)
      sfx.power()
    } else {
      w.lives = Math.min(8, w.lives + 1)
      fx.text(s.x, s.y - 34, '1UP!', '#f9a8d4', 20)
      sfx.levelUp()
      haptic.success()
    }
    pushHud()
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
                <div className="action-hud__small">Level {hud.stage}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small bullet-graze">Graze {hud.graze}</span>
              </div>
            </div>
          )}
          {bossUi && phase === 'play' ? (
            <div className="bullet-bossbar">
              <div className="bullet-bossbar__top">
                <span>{bossUi.name}</span>
                <span className="bullet-bossbar__pips">
                  {Array.from({ length: bossUi.phases }, (_, i) => (
                    <i key={i} className={i < bossUi.phase ? 'is-done' : ''} />
                  ))}
                </span>
              </div>
              <div className="bullet-bossbar__bar">
                <span style={{ width: `${Math.round(bossUi.pct * 100)}%` }} />
              </div>
            </div>
          ) : null}
          {phase === 'play' && (
            <button
              type="button"
              className={`bullet-bomb${hud.bombs <= 0 ? ' is-empty' : ''}`}
              onPointerDown={(e) => {
                e.stopPropagation()
                useBomb()
              }}
              aria-label="Bomb"
            >
              <svg viewBox="0 0 24 24" aria-hidden>
                <circle cx="11" cy="14" r="7" fill="#dcfce7" />
                <circle cx="9" cy="12" r="2" fill="#ffffff" />
                <path d="M15 8 L18 5" stroke="#fde047" strokeWidth="2.2" strokeLinecap="round" />
                <circle cx="19" cy="4" r="1.8" fill="#fb923c" />
              </svg>
              <span>BOMB ×{hud.bombs}</span>
            </button>
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
              game="bullet"
              icon={meta.icon}
              title={meta.title}
              hint="Drag anywhere to fly. Only the glowing core can be hit — brush past bullets to graze them for points."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={world.current.stats.bosses >= 1 ? 'Storm survivor!' : 'Shot down'}
            subtitle={`Score ${hud.score.toLocaleString()} · Level ${hud.stage} · Graze ${hud.graze}`}
            celebrate={world.current.stats.bosses >= 1}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}

const PALETTE_NAMES = ['Nebula Gate', 'Azure Rift', 'Crimson Expanse', 'Emerald Drift', 'Golden Void']

function approachZero(v: number, k: number) {
  return v > 0 ? Math.max(0, v - k) : Math.min(0, v + k)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
