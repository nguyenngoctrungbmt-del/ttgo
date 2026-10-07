import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { STREETS, drawFighter, drawGround, drawKnife, drawLamp, drawOrb, paintLayer, type PoseName, type Style } from './art'
import '../../shared/action/action.css'
import './brawler.css'

const meta = getGame('brawler')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Kind = 'basic' | 'blocker' | 'jumper' | 'thrower' | 'boss'
type FoeState = 'walk' | 'wind' | 'recover' | 'crouch' | 'air' | 'throwwind' | 'block' | 'stomp' | 'ko'

type Foe = {
  id: number
  kind: Kind
  side: -1 | 1
  x: number
  y: number
  vy: number
  hp: number
  max: number
  state: FoeState
  timer: number
  ph: number
  guard: boolean
  throws: number
  flash: number
  vx: number
  rot: number
  hitsTaken: number
  stompT: number
  speed: number
  wind: number
  airDur: number
  airX0: number
  airT: number
}

type Knife = { side: -1 | 1; x: number; spin: number }

type Hero = {
  pose: PoseName
  poseT: number
  poseDur: number
  face: -1 | 1
  hp: number
  max: number
  inv: number
  stagger: number
  duck: number
  duckCd: number
  ph: number
  superT: number
}

const STYLES: Record<Kind | 'hero', Style> = {
  hero: { skin: '#f1c27d', shirt: '#f8fafc', shirt2: '#dc2626', pants: '#1d4ed8', shoes: '#111827', hair: 'band', hairColor: '#dc2626', extra: 'wraps', size: 1 },
  basic: { skin: '#d4a373', shirt: '#16a34a', shirt2: '#14532d', pants: '#374151', shoes: '#1f2937', hair: 'hood', hairColor: '#14532d', size: 0.95 },
  blocker: { skin: '#c68642', shirt: '#ea580c', shirt2: '#7c2d12', pants: '#3f3f46', shoes: '#18181b', hair: 'cap', hairColor: '#1f2937', extra: 'lid', size: 1.08 },
  jumper: { skin: '#f1c27d', shirt: '#7c3aed', shirt2: '#e9d5ff', pants: '#4c1d95', shoes: '#f8fafc', hair: 'mohawk', hairColor: '#22c55e', size: 0.92 },
  thrower: { skin: '#e0ac69', shirt: '#111827', shirt2: '#ef4444', pants: '#1f2937', shoes: '#7f1d1d', hair: 'bandana', hairColor: '#ef4444', extra: 'knife', size: 0.95 },
  boss: { skin: '#8d5524', shirt: '#292524', shirt2: '#facc15', pants: '#1c1917', shoes: '#0c0a09', hair: 'bald', hairColor: '#000', extra: 'shades', size: 1.5 },
}
const KO_SCORE: Record<Kind, number> = { basic: 50, blocker: 80, jumper: 100, thrower: 90, boss: 1000 }
const HIT_COLOR: Record<Kind, string> = { basic: '#4ade80', blocker: '#fb923c', jumper: '#c084fc', thrower: '#f87171', boss: '#facc15' }
const INTRO: Partial<Record<number, [string, string]>> = {
  2: ['BLOCKERS', 'two hits to break the guard'],
  3: ['JUMPERS', 'swipe up to uppercut them'],
  5: ['KNIFE THROWERS', 'swipe down to duck'],
}
const WAVES_PER_STREET = 4

type World = {
  demo: boolean
  hero: Hero
  foes: Foe[]
  knives: Knife[]
  queue: Kind[]
  spawnT: number
  spawnGap: number
  wave: number
  street: number
  pause: number
  travel: number
  scroll: number
  combo: number
  special: number
  reachMul: number
  id: number
  score: number
  stats: { score: number; ko: number; combo: number; wave: number; bosses: number; uppercuts: number; dodges: number }
}

function freshHero(): Hero {
  return { pose: 'idle', poseT: 0, poseDur: 0, face: 1, hp: 5, max: 5, inv: 0, stagger: 0, duck: 0, duckCd: 0, ph: 0, superT: 0 }
}

function freshWorld(demo: boolean): World {
  return {
    demo,
    hero: freshHero(),
    foes: [],
    knives: [],
    queue: [],
    spawnT: 1,
    spawnGap: 1.6,
    wave: 0,
    street: 0,
    pause: 0,
    travel: 0,
    scroll: 0,
    combo: 0,
    special: 0,
    reachMul: 1,
    id: 1,
    score: 0,
    stats: { score: 0, ko: 0, combo: 0, wave: 0, bosses: 0, uppercuts: 0, dodges: 0 },
  }
}

function waveList(g: number): Kind[] {
  if (g % WAVES_PER_STREET === 0) {
    const out: Kind[] = ['basic', 'basic', 'boss']
    for (let i = 0; i < 2 + g / 4; i++) out.push(i % 2 ? 'blocker' : 'basic')
    return out
  }
  const count = Math.round(5 + g * 1.5)
  const pool: [Kind, number][] = [['basic', 5]]
  if (g >= 2) pool.push(['blocker', 2.2])
  if (g >= 3) pool.push(['jumper', 2])
  if (g >= 5) pool.push(['thrower', 1.8])
  const total = pool.reduce((s, p) => s + p[1], 0)
  const out: Kind[] = []
  for (let i = 0; i < count; i++) {
    let r = Math.random() * total
    let k: Kind = 'basic'
    for (const [kk, wt] of pool) {
      r -= wt
      if (r <= 0) {
        k = kk
        break
      }
    }
    out.push(k)
  }
  const intro = INTRO[g]
  if (intro) {
    const k: Kind = g === 2 ? 'blocker' : g === 3 ? 'jumper' : 'thrower'
    out.splice(1, 0, k)
    out.splice(4, 0, k)
  }
  return out
}

export default function BrawlerGame() {
  const run = useActionRun('brawler')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(true))
  const phaseRef = useRef<Phase>('idle')
  const layers = useRef<{ key: string; far: HTMLCanvasElement | null; mid: HTMLCanvasElement | null }>({ key: '', far: null, mid: null })
  const gesture = useRef<{ id: number; x0: number; y0: number; side: -1 | 1; deferred: boolean; swiped: boolean } | null>(null)
  const rain = useRef(Array.from({ length: 50 }, () => ({ x: Math.random(), y: Math.random(), s: rand(0.7, 1.3) }))).current

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, wave: 1, street: 0, hp: 5, max: 5, combo: 0, special: 0 })
  const [boss, setBoss] = useState<number | null>(null)
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, wave: Math.max(1, w.wave), street: w.street, hp: w.hero.hp, max: w.hero.max, combo: w.combo, special: w.special })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const u = Math.min(H / 560, W / 300)
    const gy = H * 0.74
    return { W, H, u, gy, cx: W / 2, hw: W / 2 / u }
  }

  const reach = () => 66 * world.current.reachMul

  // ── Lifecycle ─────────────────────────────────────────────
  function start() {
    void unlockAudio()
    const w = freshWorld(false)
    w.hero.max = 5 + run.level('grit')
    w.hero.hp = w.hero.max
    w.reachMul = 1 + run.level('reach') * 0.08
    w.special = run.level('fury') * 25
    world.current = w
    fx.reset()
    setBoss(null)
    run.begin()
    setPhaseBoth('play')
    w.pause = 1.2
    pushHud()
    setBanner({ key: Date.now(), text: STREETS[0].name.toUpperCase(), sub: 'tap a side to punch' })
    sfx.ready()
  }

  function nextWave() {
    const w = world.current
    w.wave += 1
    w.stats.wave = w.wave
    w.queue = waveList(w.wave)
    w.spawnGap = Math.max(0.55, 1.55 - w.wave * 0.07)
    w.spawnT = 0.6
    const intro = INTRO[w.wave]
    if (w.wave % WAVES_PER_STREET === 0) {
      setBanner({ key: Date.now(), text: 'BOSS FIGHT', sub: 'the gang leader steps in' })
      sfx.boom(0.5)
      haptic.heavy()
    } else if (intro) {
      setBanner({ key: Date.now(), text: `NEW: ${intro[0]}`, sub: intro[1] })
      sfx.levelUp()
    } else {
      setBanner({ key: Date.now(), text: `WAVE ${w.wave}` })
      sfx.levelUp()
    }
    if (w.wave % 5 === 0) void trackEvent('action_milestone', { game_id: 'brawler', kind: 'wave', value: w.wave })
    run.update(w.stats)
    pushHud()
  }

  function spawn(kind: Kind, side?: -1 | 1) {
    const w = world.current
    const { hw } = geo()
    const g = Math.max(1, w.wave)
    const sc = w.demo ? 1 : 1 + Math.min(0.5, g * 0.03)
    const s = side ?? (Math.random() < 0.5 ? -1 : 1)
    const hp = kind === 'boss' ? 14 + w.street * 5 : kind === 'blocker' ? 2 : 1
    const base: Record<Kind, number> = { basic: 72, blocker: 56, jumper: 95, thrower: 62, boss: 42 }
    w.foes.push({
      id: w.id++,
      kind,
      side: s,
      x: hw + 40,
      y: 0,
      vy: 0,
      hp,
      max: hp,
      state: 'walk',
      timer: 0,
      ph: rand(0, 6),
      guard: kind === 'blocker',
      throws: 0,
      flash: 0,
      vx: 0,
      rot: 0,
      hitsTaken: 0,
      stompT: 6,
      speed: base[kind] * sc * rand(0.92, 1.08),
      wind: w.demo ? 0.8 : Math.max(0.42, 0.72 - g * 0.02),
      airDur: 0.8,
      airX0: 0,
      airT: 0,
    })
    if (kind === 'boss') setBoss(1)
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    w.hero.pose = 'ko'
    fx.flash('#ef4444', 0.4)
    fx.stop(0.15)
    fx.shake(14, 0.5)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.stats.ko / 4 + w.wave * 1.5 + w.stats.bosses * 8)
      run.end({ score: w.score, cleared: w.stats.bosses >= 1, stats: { ...w.stats }, coins }, revive)
    }, 1100)
  }

  function revive() {
    const w = world.current
    const h = w.hero
    const { cx, gy, u } = geo()
    h.hp = h.max
    h.inv = 2.2
    h.stagger = 0
    h.pose = 'idle'
    for (const f of w.foes) {
      if (f.state === 'ko') continue
      f.x = Math.max(f.x, 0) + 160
      f.state = 'walk'
      f.y = 0
    }
    w.knives = []
    fx.ring(cx, gy - 50 * u, { color: '#fde047', maxR: 220 * u, life: 0.6, width: 6 })
    fx.flash('#fde047', 0.3)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'back on your feet' })
    setPhaseBoth('play')
    pushHud()
  }

  // ── Hero actions ──────────────────────────────────────────
  function setPose(p: PoseName, dur: number) {
    const h = world.current.hero
    h.pose = p
    h.poseT = 0
    h.poseDur = dur
  }

  function frontFoe(side: number, test: (f: Foe) => boolean) {
    let best: Foe | null = null
    for (const f of world.current.foes) {
      if (f.side !== side || f.state === 'ko' || !test(f)) continue
      if (!best || f.x < best.x) best = f
    }
    return best
  }

  function whiff(side: -1 | 1) {
    const w = world.current
    const h = w.hero
    const { cx, gy, u } = geo()
    h.stagger = 0.38
    setPose('stagger', 0.38)
    if (!w.demo) {
      if (w.combo >= 5) fx.text(cx, gy - 120 * u, 'COMBO LOST', '#fca5a5', 16)
      else fx.text(cx + side * 40 * u, gy - 70 * u, 'MISS', '#cbd5e1', 15)
      w.combo = 0
      sfx.miss()
      haptic.light()
      pushHud()
    }
  }

  function punch(side: -1 | 1) {
    const w = world.current
    const h = w.hero
    if (h.stagger > 0 || h.superT > 0) return
    h.face = side
    setPose('punch', 0.2)
    const R = reach()
    const f = frontFoe(side, (f) => f.state !== 'air' && f.x <= R + (f.kind === 'boss' ? 14 : 0))
    if (!w.demo) sfx.whoosh()
    if (!f) {
      whiff(side)
      return
    }
    hit(f, false)
  }

  function uppercut(side: -1 | 1) {
    const w = world.current
    const h = w.hero
    if (h.stagger > 0 || h.superT > 0) return
    h.face = side
    setPose('uppercut', 0.3)
    const R = reach()
    const air = frontFoe(side, (f) => f.state === 'air' && f.x < 135)
    const f = air ?? frontFoe(side, (f) => f.state !== 'air' && f.x <= R + (f.kind === 'boss' ? 14 : 0))
    if (!w.demo) sfx.whoosh()
    if (!f) {
      whiff(side)
      return
    }
    hit(f, true)
  }

  function duck() {
    const w = world.current
    const h = w.hero
    if (h.duckCd > 0 || h.superT > 0) return
    h.duck = 0.45
    h.duckCd = 0.6
    h.stagger = 0
    setPose('duck', 0.45)
    if (!w.demo) sfx.move()
  }

  function dodgeReward(text = 'DODGE!') {
    const w = world.current
    const { cx, gy, u } = geo()
    w.stats.dodges += 1
    w.combo += 1
    w.stats.combo = Math.max(w.stats.combo, w.combo)
    w.special = Math.min(100, w.special + 12)
    w.score += 30
    w.stats.score = w.score
    fx.text(cx, gy - 130 * u, text, '#7dd3fc', 20)
    fx.ring(cx, gy - 40 * u, { color: '#7dd3fc', maxR: 60 * u })
    sfx.score(Math.min(10, w.combo / 3))
    haptic.light()
    run.update(w.stats)
    pushHud()
  }

  function hit(f: Foe, upper: boolean) {
    const w = world.current
    const { cx, gy, u } = geo()
    const fxp = cx + f.side * (f.x - 8) * u
    const fyp = gy - (upper ? 70 : 58) * u * STYLES[f.kind].size - f.y * u
    if (f.kind === 'boss' && f.state === 'block') {
      fx.burst(fxp, fyp, { count: 10, color: ['#e5e7eb', '#fde047'], speed: 220, shape: 'spark' })
      fx.text(fxp, fyp - 20 * u, 'BLOCKED', '#e5e7eb', 15)
      if (!w.demo) sfx.clang()
      f.x += 6
      return
    }
    f.flash = 0.09
    f.hitsTaken += 1
    if (f.guard && !upper) {
      f.guard = false
      f.hp -= 1
      f.x += 22
      f.state = 'recover'
      f.timer = 0.45
      fx.burst(fxp, fyp, { count: 14, color: ['#cbd5e1', '#94a3b8', '#fde047'], speed: 260, shape: 'square', size: 4 })
      if (!w.demo) {
        fx.text(fxp, fyp - 22 * u, 'GUARD BREAK', '#fdba74', 16)
        sfx.clang()
        haptic.medium()
      }
      fx.stop(0.05)
      fx.shake(4, 0.12)
    } else {
      f.hp -= upper ? 2 : 1
      fx.burst(fxp, fyp, { count: upper ? 18 : 12, color: [HIT_COLOR[f.kind], '#ffffff', '#fde047'], speed: upper ? 300 : 240, shape: 'spark', size: 3 })
      fx.ring(fxp, fyp, { color: '#fff', maxR: 26 * u, life: 0.18 })
      fx.stop(upper ? 0.08 : 0.05)
      fx.shake(upper ? 7 : 4, 0.12)
      if (!w.demo) {
        sfx.hit()
        haptic.medium()
      }
      if (f.hp > 0) {
        f.x += f.kind === 'boss' ? 8 : 18
        if (f.state === 'wind' || f.state === 'throwwind') {
          f.state = 'recover'
          f.timer = 0.5
        }
        if (f.kind === 'boss' && f.hitsTaken % 4 === 0) {
          f.state = 'block'
          f.timer = 1.1
        }
      }
    }
    if (f.hp <= 0) ko(f, upper)
    if (w.demo) return
    w.combo += 1
    w.stats.combo = Math.max(w.stats.combo, w.combo)
    if (upper) w.stats.uppercuts += 1
    w.special = Math.min(100, w.special + (upper ? 14 : 7))
    w.score += 10 * mult()
    w.stats.score = w.score
    sfx.score(Math.min(12, Math.floor(w.combo / 3)))
    if (w.combo === 10 || w.combo === 25 || w.combo % 50 === 0) {
      fx.text(cx, gy - 160 * u, `${w.combo} HIT COMBO!`, '#fde047', 24)
      sfx.combo()
    }
    if (f.kind === 'boss' && f.hp > 0) setBoss(f.hp / f.max)
    run.update(w.stats)
    pushHud()
  }

  function mult() {
    return 1 + Math.floor(world.current.combo / 10) * 0.5
  }

  function ko(f: Foe, upper: boolean) {
    const w = world.current
    const { cx, gy, u } = geo()
    f.state = 'ko'
    f.vx = (upper ? 120 : 330) * (f.kind === 'boss' ? 0.5 : 1)
    f.vy = upper ? -620 : -260
    f.timer = 1.6
    const fxp = cx + f.side * f.x * u
    fx.burst(fxp, gy - 50 * u, { count: 16, color: [HIT_COLOR[f.kind], '#fff'], speed: 260, gravity: 400 })
    if (w.demo) return
    const pts = Math.round(KO_SCORE[f.kind] * mult())
    w.score += pts
    w.stats.ko += 1
    w.stats.score = w.score
    fx.text(fxp, gy - 110 * u, upper ? `UPPERCUT +${pts}` : `KO +${pts}`, upper ? '#c4b5fd' : '#fde047', upper ? 18 : 16)
    if (f.kind === 'boss') {
      w.stats.bosses += 1
      fx.explode(fxp, gy - 70 * u, 2.4, ['#fde047', '#facc15', '#fff', '#fb923c'])
      fx.flash('#fff', 0.35)
      fx.stop(0.25)
      fx.slowmo(1.3, 0.25)
      sfx.boom(1)
      sfx.win()
      haptic.heavy()
      setBoss(null)
      setBanner({ key: Date.now(), text: 'BOSS DOWN!', sub: `+${pts}` })
      void trackEvent('action_milestone', { game_id: 'brawler', kind: 'boss', value: w.stats.bosses })
      for (const o of w.foes) if (o !== f && o.state !== 'ko') {
        o.state = 'ko'
        o.vx = 300
        o.vy = -300
        o.timer = 1.4
      }
    } else {
      sfx.pop()
    }
  }

  function superMove() {
    const w = world.current
    const h = w.hero
    if (phaseRef.current !== 'play' || w.special < 100 || h.superT > 0) return
    w.special = 0
    h.superT = 0.55
    h.stagger = 0
    h.inv = Math.max(h.inv, 1)
    setPose('super', 0.55)
    sfx.power()
    sfx.whoosh()
    haptic.heavy()
    fx.slowmo(0.5, 0.4)
    pushHud()
  }

  function superLand() {
    const w = world.current
    const { cx, gy, u, hw } = geo()
    fx.ring(cx, gy, { color: '#fde047', maxR: 300 * u, life: 0.6, width: 10 })
    fx.ring(cx, gy, { color: '#fff', maxR: 200 * u, life: 0.45, width: 5 })
    fx.burst(cx, gy, { count: 50, color: ['#fde047', '#fb923c', '#fff'], speed: 420, shape: 'spark', gravity: 300 })
    fx.flash('#fde68a', 0.4)
    fx.shake(16, 0.5)
    fx.stop(0.12)
    sfx.boom(1)
    haptic.heavy()
    w.knives = []
    for (const f of w.foes) {
      if (f.state === 'ko' || f.x > hw + 10) continue
      if (f.kind === 'boss') {
        f.hp -= 5
        f.flash = 0.2
        f.x += 40
        f.state = 'recover'
        f.timer = 1
        if (f.hp <= 0) ko(f, true)
        else setBoss(f.hp / f.max)
      } else {
        f.hp = 0
        ko(f, true)
      }
    }
    setBanner({ key: Date.now(), text: 'SUPER SMASH!' })
    run.update(w.stats)
    pushHud()
  }

  function hurt(dmg: number, side: number) {
    const w = world.current
    const h = w.hero
    if (w.demo || h.inv > 0 || phaseRef.current !== 'play') return
    const { cx, gy, u } = geo()
    h.hp -= dmg
    h.inv = 0.75
    h.stagger = 0
    h.face = side as -1 | 1
    setPose('hurt', 0.3)
    if (w.combo >= 5) fx.text(cx, gy - 160 * u, 'COMBO LOST', '#fca5a5', 16)
    w.combo = 0
    fx.flash('#ef4444', 0.25)
    fx.shake(10, 0.3)
    fx.stop(0.08)
    fx.burst(cx + side * 10 * u, gy - 60 * u, { count: 14, color: ['#ef4444', '#fca5a5', '#fff'], speed: 220, shape: 'spark' })
    sfx.hurt()
    haptic.heavy()
    pushHud()
    if (h.hp <= 0) {
      h.hp = 0
      die()
    }
  }

  // ── Input ─────────────────────────────────────────────────
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    const side: -1 | 1 = p.x < size.current.w / 2 ? -1 : 1
    const airborne = world.current.foes.some((f) => f.side === side && (f.state === 'air' || f.state === 'crouch') && f.x < 170)
    const knife = world.current.knives.length > 0
    const deferred = airborne || knife
    gesture.current = { id: e.pointerId, x0: p.x, y0: p.y, side, deferred, swiped: false }
    if (!deferred) punch(side)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || g.id !== e.pointerId || g.swiped || phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    const dx = p.x - g.x0
    const dy = p.y - g.y0
    if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) {
      g.swiped = true
      if (dy < 0) uppercut(g.side)
      else duck()
    }
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g || g.id !== e.pointerId) return
    if (g.deferred && !g.swiped && phaseRef.current === 'play') punch(g.side)
    gesture.current = null
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (phaseRef.current !== 'play' || e.repeat) return
      const k = e.key
      if (k === 'ArrowLeft' || k === 'a') punch(-1)
      else if (k === 'ArrowRight' || k === 'd') punch(1)
      else if (k === 'ArrowUp' || k === 'w') {
        const l = frontFoe(-1, (f) => f.state === 'air')
        const r = frontFoe(1, (f) => f.state === 'air')
        uppercut(l && (!r || l.x < r.x) ? -1 : r ? 1 : world.current.hero.face)
      } else if (k === 'ArrowDown' || k === 's') duck()
      else if (k === ' ') superMove()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation ────────────────────────────────────────────
  function step(dt: number) {
    const w = world.current
    const h = w.hero
    const live = phaseRef.current === 'play' && !w.demo
    const { hw, u, gy, cx } = geo()

    h.ph += dt
    h.inv = Math.max(0, h.inv - dt)
    h.stagger = Math.max(0, h.stagger - dt)
    h.duck = Math.max(0, h.duck - dt)
    h.duckCd = Math.max(0, h.duckCd - dt)
    if (h.poseDur > 0) {
      h.poseT += dt
      if (h.poseT >= h.poseDur) {
        h.poseDur = 0
        h.pose = 'idle'
      }
    }
    if (h.superT > 0) {
      h.superT -= dt
      if (h.superT <= 0) superLand()
    }

    // Waves / travel
    if (w.demo) {
      w.spawnT -= dt
      if (w.spawnT <= 0 && w.foes.length < 4) {
        spawn(Math.random() < 0.7 ? 'basic' : 'blocker')
        w.spawnT = 1.3
      }
    } else if (live) {
      if (w.travel > 0) {
        w.travel -= dt
        w.scroll += 300 * u * dt
        h.pose = 'walk'
        h.face = 1
        h.ph += dt * 0.6
        if (w.travel <= 0) {
          h.pose = 'idle'
          w.pause = 0.8
        }
      } else if (w.pause > 0) {
        w.pause -= dt
        if (w.pause <= 0) nextWave()
      } else if (w.queue.length) {
        w.spawnT -= dt
        if (w.spawnT <= 0) {
          const k = w.queue.shift()!
          spawn(k)
          w.spawnT = k === 'boss' ? 2 : w.spawnGap * rand(0.7, 1.3)
        }
      } else if (w.foes.every((f) => f.state === 'ko')) {
        if (w.wave % WAVES_PER_STREET === 0) {
          w.street += 1
          w.travel = 2.2
          const st = STREETS[w.street % STREETS.length]
          setBanner({ key: Date.now(), text: `STREET ${w.street + 1}`, sub: st.name })
          h.hp = Math.min(h.max, h.hp + 1)
          sfx.win()
          pushHud()
        } else {
          w.pause = 1.4
          setBanner({ key: Date.now(), text: 'WAVE CLEAR', sub: `combo x${mult()}` })
          sfx.score(6)
        }
      }
    }

    // Foes, sorted per side for spacing
    const order = w.foes.filter((f) => f.state !== 'ko').sort((a, b) => a.x - b.x)
    const rank = { '-1': 0, '1': 0 } as Record<string, number>
    const lastX = { '-1': 0, '1': 0 } as Record<string, number>
    for (const f of order) {
      const key = String(f.side)
      const r = rank[key]++
      const sz = STYLES[f.kind].size
      const stop = r === 0 ? (f.kind === 'boss' ? 54 : 44) : lastX[key] + 34 * sz
      f.ph += dt
      f.flash = Math.max(0, f.flash - dt)
      f.timer -= dt
      const front = r === 0
      switch (f.state) {
        case 'walk': {
          let target = stop
          if (f.kind === 'thrower' && f.throws < 2) target = Math.max(stop, Math.min(175, hw - 28))
          if (f.kind === 'jumper' && front && f.x <= Math.min(160, hw - 22) && f.x > 90) {
            f.state = 'crouch'
            f.timer = 0.28
            break
          }
          if (f.x > target) f.x = Math.max(target, f.x - f.speed * dt)
          else if (f.x < target - 2) f.x += 40 * dt
          if (Math.abs(f.x - target) < 3 && (live || w.demo)) {
            if (f.kind === 'thrower' && f.throws < 2 && f.x > 100) {
              f.state = 'throwwind'
              f.timer = 0.65
              if (!w.demo) sfx.tick()
            } else if (front && f.timer <= 0) {
              f.state = 'wind'
              f.timer = f.kind === 'boss' ? 0.9 : f.wind
              if (!w.demo) sfx.tick()
            }
          }
          if (f.kind === 'boss' && live) {
            f.stompT -= dt
            if (f.stompT <= 0 && f.x < hw) {
              f.state = 'stomp'
              f.timer = 0.6
              f.stompT = 7
            }
          }
          break
        }
        case 'wind':
          if (f.timer <= 0) {
            if (w.demo) {
              f.state = 'recover'
              f.timer = 0.8
              break
            }
            if (h.duck > 0) dodgeReward()
            else hurt(f.kind === 'boss' ? 2 : 1, f.side)
            f.state = 'recover'
            f.timer = f.kind === 'boss' ? 1.0 : 0.8
            f.x += 12
            fx.burst(cx + f.side * 20 * u, gy - 60 * u, { count: 6, color: '#fff', speed: 120, size: 2 })
          }
          break
        case 'recover':
        case 'block':
          if (f.timer <= 0) {
            f.state = 'walk'
            f.timer = rand(0.2, 0.6)
          }
          break
        case 'crouch':
          if (f.timer <= 0) {
            f.state = 'air'
            f.airT = 0
            f.airX0 = f.x
            f.airDur = 0.85
            if (!w.demo) sfx.whoosh()
          }
          break
        case 'air': {
          f.airT += dt
          const k = Math.min(1, f.airT / f.airDur)
          f.x = f.airX0 * (1 - k)
          f.y = Math.sin(k * Math.PI) * 120
          if (k >= 1) {
            f.y = 0
            if (live) hurt(1, f.side)
            f.x = 50
            f.state = 'recover'
            f.timer = 0.7
            fx.burst(cx, gy, { count: 10, color: ['#a8a29e', '#e7e5e4'], speed: 160, gravity: 300 })
            if (!w.demo) sfx.thud()
          }
          break
        }
        case 'throwwind':
          if (f.timer <= 0) {
            f.throws += 1
            w.knives.push({ side: f.side, x: f.x - 10, spin: 0 })
            f.state = 'recover'
            f.timer = f.throws >= 2 ? 0.3 : 1.2
            if (f.throws >= 2) f.speed *= 1.8
            sfx.shoot()
          }
          break
        case 'stomp':
          if (f.timer <= 0) {
            fx.shake(10, 0.3)
            fx.burst(cx + f.side * f.x * u, gy, { count: 16, color: ['#a8a29e', '#78716c'], speed: 200, gravity: 400 })
            sfx.thud()
            spawn('basic', -1)
            spawn('basic', 1)
            f.state = 'walk'
          }
          break
        default:
          break
      }
      lastX[key] = f.x
    }
    // KO physics
    for (const f of w.foes) {
      if (f.state !== 'ko') continue
      f.x += f.vx * dt
      f.vy += 1400 * dt
      f.y -= f.vy * dt
      f.rot += dt * 9
      if (f.y < 0) {
        f.y = 0
        if (f.vy > 300) {
          f.vy = -f.vy * 0.35
          fx.burst(cx + f.side * f.x * u, gy, { count: 6, color: ['#a8a29e'], speed: 120, gravity: 300 })
        } else f.vy = 0
      }
      f.timer -= dt
    }
    w.foes = w.foes.filter((f) => !(f.state === 'ko' && (f.timer <= 0 || f.x > hw + 80)))

    // Knives
    for (const k of w.knives) {
      k.x -= 330 * dt
      k.spin += dt * 20
      if (k.x < 14) {
        k.x = -999
        if (h.duck > 0) dodgeReward('DUCKED!')
        else hurt(1, k.side)
      }
    }
    w.knives = w.knives.filter((k) => k.x > -100)

    if (live && boss !== null) {
      const b = w.foes.find((f) => f.kind === 'boss' && f.state !== 'ko')
      if (b && Math.abs(b.hp / b.max - boss) > 0.01) setBoss(b.hp / b.max)
    }

    // Demo hero AI
    if (w.demo && h.stagger <= 0 && h.poseDur <= 0) {
      for (const side of [-1, 1] as const) {
        const f = frontFoe(side, (f) => f.state !== 'air' && f.x < 60)
        if (f) {
          punch(side)
          break
        }
      }
    }
  }

  // ── Render ────────────────────────────────────────────────
  function frame({ ctx, w: W, h: H, raw, t: time }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const ph = phaseRef.current
    const dt = fx.step(raw)
    if (ph === 'idle' || ph === 'play' || ph === 'dying') step(dt)
    const { u, gy, cx } = geo()
    const st = STREETS[w.street % STREETS.length]
    const si = w.street % STREETS.length

    const key = `${W}x${H}:${si}`
    if (layers.current.key !== key) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const mk = (layer: 0 | 1) => {
        const c = document.createElement('canvas')
        c.width = Math.round(W * dpr)
        c.height = Math.round(H * dpr)
        const g = c.getContext('2d')!
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        paintLayer(g, st, si, layer, W, H, gy, u)
        return c
      }
      layers.current = { key, far: mk(0), mid: mk(1) }
    }
    const drawTiled = (c: HTMLCanvasElement, off: number) => {
      const o = ((off % W) + W) % W
      ctx.drawImage(c, -o, 0, W, H)
      ctx.drawImage(c, W - o, 0, W, H)
    }
    drawTiled(layers.current.far!, w.scroll * 0.15)
    drawOrb(ctx, st, W, gy, u)
    fx.applyShake(ctx)
    drawTiled(layers.current.mid!, w.scroll * 0.45)
    drawGround(ctx, st, W, H, gy, u, w.scroll, time)
    const lampGap = 240 * u
    const lo = ((w.scroll % lampGap) + lampGap) % lampGap
    for (let x = -lo + lampGap * 0.3; x < W + lampGap; x += lampGap) drawLamp(ctx, x, gy, u, st, time)

    // Foes behind (KO'd) then active, hero in the middle
    const drawFoe = (f: Foe) => {
      const sx = cx + f.side * f.x * u
      const gyy = gy - f.y * u
      let pose: PoseName = 'idle'
      let k = 0
      switch (f.state) {
        case 'walk':
          pose = Math.abs(f.x - 44) < 4 && f.kind !== 'thrower' ? 'idle' : 'walk'
          if (f.guard) pose = 'block'
          break
        case 'wind':
          pose = 'windup'
          break
        case 'recover':
          pose = f.flash > 0 ? 'hurt' : 'idle'
          break
        case 'block':
          pose = 'duck'
          break
        case 'crouch':
          pose = 'crouch'
          break
        case 'air':
          pose = 'air'
          break
        case 'throwwind':
          pose = 'throw'
          k = 1 - f.timer / 0.65
          if (k > 0.55) k = 0.5
          break
        case 'stomp':
          pose = 'super'
          break
        case 'ko':
          pose = 'ko'
          break
      }
      if (f.state === 'ko') {
        ctx.save()
        ctx.translate(sx, gyy - 40 * u)
        ctx.rotate(f.rot * f.side)
        ctx.globalAlpha = Math.min(1, f.timer * 2)
        drawFighter(ctx, STYLES[f.kind], 0, 40 * u, u, -f.side, pose, k, f.ph, f.flash > 0)
        ctx.restore()
        ctx.globalAlpha = 1
        return
      }
      drawFighter(ctx, STYLES[f.kind], sx, gyy, u, -f.side, pose, k, f.ph, f.flash > 0, f.state === 'wind')
      // Telegraphs
      const top = gyy - 118 * u * STYLES[f.kind].size
      if (f.state === 'wind' || f.state === 'throwwind' || f.state === 'stomp') {
        const pulse = 1 + Math.sin(time * 30) * 0.12
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.roundRect(sx - 4 * u * pulse, top - 18 * u, 8 * u * pulse, 14 * u, 3 * u)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(sx, top + 2 * u, 4 * u * pulse, 0, Math.PI * 2)
        ctx.fill()
      }
      if (f.state === 'air' && f.x < 135) {
        // uppercut cue: chevrons
        ctx.strokeStyle = '#fde047'
        ctx.lineWidth = 4 * u
        ctx.lineCap = 'round'
        const bx = sx
        const by = gyy - 140 * u + Math.sin(time * 14) * 4 * u
        for (let i = 0; i < 2; i++) {
          ctx.beginPath()
          ctx.moveTo(bx - 10 * u, by + i * 10 * u)
          ctx.lineTo(bx, by - 9 * u + i * 10 * u)
          ctx.lineTo(bx + 10 * u, by + i * 10 * u)
          ctx.stroke()
        }
      }
      if (f.kind === 'blocker' && f.guard) {
        ctx.fillStyle = 'rgba(148,163,184,0.85)'
        ctx.beginPath()
        ctx.arc(sx, top - 4 * u, 5 * u, 0, Math.PI * 2)
        ctx.arc(sx + 12 * u, top - 4 * u, 5 * u, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    for (const f of w.foes) if (f.state === 'ko') drawFoe(f)
    const active = w.foes.filter((f) => f.state !== 'ko').sort((a, b) => b.x - a.x)
    for (const f of active) drawFoe(f)

    // Hero
    const h = w.hero
    const blink = h.inv > 0 && Math.floor(time * 16) % 2 === 0 && ph === 'play'
    if (!blink) {
      const k = h.poseDur > 0 ? h.poseT / h.poseDur : 0
      const lift = h.superT > 0 ? Math.sin((1 - h.superT / 0.55) * Math.PI) * 70 * u : 0
      drawFighter(ctx, STYLES.hero, cx, gy - lift, u, h.face, ph === 'over' || ph === 'dying' ? 'ko' : h.pose, k, h.ph, false)
      if (h.stagger > 0 && !w.demo) {
        for (let i = 0; i < 3; i++) {
          const a = time * 6 + (i / 3) * Math.PI * 2
          ctx.fillStyle = '#fde047'
          ctx.beginPath()
          ctx.arc(cx + Math.cos(a) * 16 * u, gy - 112 * u + Math.sin(a) * 5 * u, 3.2 * u, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // Knives
    for (const kn of w.knives) drawKnife(ctx, cx + kn.side * kn.x * u, gy - 62 * u, u * 1.4, -kn.side, kn.spin)

    // Reach guides (subtle) so taps feel fair
    if (ph === 'play' && w.travel <= 0) {
      ctx.globalAlpha = 0.18
      ctx.fillStyle = '#fff'
      for (const s of [-1, 1]) ctx.fillRect(cx + s * reach() * u - 1.5, gy + 4 * u, 3, 12 * u)
      ctx.globalAlpha = 1
    }

    // Rain in Neon Alley
    if (si === 2) {
      ctx.strokeStyle = 'rgba(186,230,253,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (const d of rain) {
        d.y += raw * 1.2 * d.s
        if (d.y > 1) d.y -= 1
        const x = ((d.x * W - w.scroll * 0.6) % W + W) % W
        ctx.moveTo(x, d.y * H)
        ctx.lineTo(x - 3, d.y * H + 12)
      }
      ctx.stroke()
    }

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const segs = []
  for (let i = 0; i < hud.max; i++) segs.push(<i key={i} className={i < hud.hp ? 'is-on' : ''} />)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div
          className="action-arena sb-arena"
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
                <div className="action-hud__small">
                  Street {hud.street + 1} · Wave {hud.wave}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="sb-hp">{segs}</span>
              </div>
            </div>
          )}
          {phase === 'play' && hud.combo >= 2 ? (
            <div className="sb-combo" key={hud.combo}>
              <b>{hud.combo}</b>
              <span>HITS</span>
            </div>
          ) : null}
          {boss !== null && phase === 'play' ? (
            <div className="sb-bossbar" aria-label="Boss health">
              <span style={{ width: `${Math.round(boss * 100)}%` }} />
            </div>
          ) : null}
          {phase === 'play' && (
            <div className="sb-special" onPointerDown={(e) => e.stopPropagation()}>
              {hud.special >= 100 ? (
                <button type="button" className="sb-super" onClick={superMove}>
                  SUPER!
                </button>
              ) : (
                <div className="sb-meter">
                  <span style={{ width: `${hud.special}%` }} />
                </div>
              )}
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
              game="brawler"
              icon={meta.icon}
              title={meta.title}
              hint="Tap the left or right half to punch that side. Swipe up to uppercut jumpers, swipe down to duck. Don't punch air!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.street >= 1 ? 'Street legend!' : 'Knocked out!'}
            subtitle={`Score ${hud.score} · Wave ${hud.wave}`}
            celebrate={hud.street >= 1}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
