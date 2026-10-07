import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'
import './boxing.css'
import { FOES, LADDER, VENUES, isChamp, type Atk, type FoeDef, type Venue } from './rivals'

const meta = getGame('boxing')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Evade = 'none' | 'L' | 'R' | 'duck'
type FoeSt = 'intro' | 'idle' | 'taunt' | 'windup' | 'strike' | 'recover' | 'open' | 'dazed' | 'down' | 'ko' | 'wait'
const WIND: Record<Atk, number> = { jab: 0.5, hookL: 0.75, hookR: 0.75, upper: 0.85, hay: 1.1, bolt: 0.6 }
const DMG: Record<Atk, number> = { jab: 7, hookL: 12, hookR: 12, upper: 16, hay: 24, bolt: 14 }
const DODGES: Record<Atk, Evade[]> = { jab: ['L', 'R', 'duck'], hookL: ['R', 'duck'], hookR: ['L', 'duck'], upper: ['L', 'R'], hay: ['L', 'R'], bolt: ['duck'] }

type Foe = {
  def: FoeDef
  st: FoeSt
  t: number
  dur: number
  atk: Atk
  queue: Atk[]
  feint: boolean
  feinted: boolean
  hp: number
  max: number
  downs: number
  flash: number
  flinch: number
  openHits: number
  dodged: boolean
  count: number
}

type Punch = { side: -1 | 1; kind: 'jab' | 'upper' | 'star'; t: number }

type World = {
  stage: number
  tier: number
  venue: Venue
  foe: Foe
  hp: number
  max: number
  stam: number
  maxStam: number
  gassed: boolean
  restT: number
  evade: Evade
  evadeT: number
  evadeAt: number
  evadeCd: number
  punch: Punch | null
  punchCd: number
  stars: number
  downs: number
  mash: number
  mashNeed: number
  mashT: number
  camX: number
  camY: number
  score: number
  clock: number
  hurt: number
  stats: { knockdowns: number; perfects: number; kos: number; stage: number; stars: number; belts: number }
}

function makeFoe(stage: number): Foe {
  const def = FOES[stage % LADDER]
  const tier = Math.min(3, Math.floor(stage / LADDER))
  const max = Math.round(def.hp * (1 + tier * 0.3))
  return { def, st: 'intro', t: 0, dur: 1.6, atk: 'jab', queue: [], feint: false, feinted: false, hp: max, max, downs: 0, flash: 0, flinch: 0, openHits: 0, dodged: false, count: 0 }
}

function freshWorld(): World {
  return {
    stage: 0,
    tier: 0,
    venue: VENUES.gym,
    foe: makeFoe(0),
    hp: 100,
    max: 100,
    stam: 8,
    maxStam: 8,
    gassed: false,
    restT: 0,
    evade: 'none',
    evadeT: 0,
    evadeAt: 0,
    evadeCd: 0,
    punch: null,
    punchCd: 0,
    stars: 0,
    downs: 0,
    mash: 0,
    mashNeed: 0,
    mashT: 0,
    camX: 0,
    camY: 0,
    score: 0,
    clock: 0,
    hurt: 0,
    stats: { knockdowns: 0, perfects: 0, kos: 0, stage: 1, stars: 0, belts: 0 },
  }
}

export default function BoxingGame() {
  const run = useActionRun('boxing')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const swipe = useRef<{ id: number; x: number; y: number; done: boolean } | null>(null)
  const bgCache = useRef<{ key: string; c: HTMLCanvasElement | null }>({ key: '', c: null })
  const lastMilestone = useRef(0)
  const devAuto = useRef(false)
  const devSpeed = useRef(1)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    // Test hook for headless bots: autopilot, fast-forward, state readout.
    const hook = {
      auto: (on: boolean) => (devAuto.current = on),
      speed: (n: number) => (devSpeed.current = Math.max(1, Math.min(8, Math.round(n)))),
      state: () => {
        const w = world.current
        return { phase: phaseRef.current, stage: w.stage + 1, foe: w.foe.def.name, foeDowns: w.foe.downs, downs: w.downs, venue: w.venue.id }
      },
    }
    ;(window as unknown as { __lv6boxing?: typeof hook }).__lv6boxing = hook
  }, [])

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, hp: 1, stam: 1, gassed: false, foeHp: 1, name: FOES[0].name as string, stars: 0, foeDowns: 0, downs: 0, stage: 1, mash: -1 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function au() {
    return phaseRef.current !== 'idle'
  }

  function pushHud() {
    const w = world.current
    setHud({
      score: w.score,
      hp: clamp(w.hp / w.max, 0, 1),
      stam: clamp(w.stam / w.maxStam, 0, 1),
      gassed: w.gassed,
      foeHp: clamp(w.foe.hp / w.foe.max, 0, 1),
      name: w.foe.def.name,
      stars: w.stars,
      foeDowns: w.foe.downs,
      downs: w.downs,
      stage: w.stage + 1,
      mash: w.mashNeed > 0 ? clamp(w.mash / w.mashNeed, 0, 1) : -1,
    })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const s = Math.min(W / 380, H / 640)
    return { W, H, s, cx: W / 2, waist: H * 0.8 }
  }

  function milestone(kind: string, value: number) {
    const now = performance.now()
    if (now - lastMilestone.current < 30000) return
    lastMilestone.current = now
    void trackEvent('action_milestone', { game_id: 'boxing', kind, value })
  }

  function speedOf(w: World) {
    const f = w.foe
    let k = f.def.speed * Math.pow(0.9, w.tier)
    if (f.def.rage && f.hp < f.max * 0.4) k *= 0.75
    return k
  }

  function startBout(w: World) {
    w.foe = makeFoe(w.stage)
    w.tier = Math.min(3, Math.floor(w.stage / LADDER))
    w.venue = VENUES[w.foe.def.venue] ?? VENUES.club
    w.stats.stage = Math.max(w.stats.stage, w.stage + 1)
    w.stars = Math.min(3, Math.max(w.stars, run.level('star')))
    w.hp = w.max
    w.stam = w.maxStam
    w.gassed = false
    w.downs = 0
    w.mashNeed = 0
    const d = w.foe.def
    setBanner({ key: Date.now(), text: isChamp(w.stage) ? `👑 ${d.name.toUpperCase()}` : d.name.toUpperCase(), sub: `“${d.nick}” · ${w.tier > 0 ? `tier ${w.tier + 1} · ` : ''}${d.tip}` })
    pushHud()
  }

  function start(level: number = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    // Each bout is a level: the map replays beaten boxers, Play continues at the next one.
    w.stage = Math.max(0, (typeof level === 'number' && level > 0 ? Math.floor(level) : run.nextLevel) - 1)
    w.stats.stage = w.stage + 1
    w.max = Math.round(100 * (1 + run.level('chin') * 0.15))
    w.hp = w.max
    w.maxStam = 8 + run.level('lungs') * 2
    w.stam = w.maxStam
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    startBout(w)
    sfx.ready()
  }

  // ── Opponent ────────────────────────────────────────────

  function setFoe(f: Foe, st: FoeSt, dur: number) {
    f.st = st
    f.t = 0
    f.dur = dur
  }

  function beginAttack(w: World, atk: Atk, quick = 1) {
    const f = w.foe
    f.atk = atk
    f.feint = !f.feinted && atk !== 'bolt' && Math.random() < f.def.feint
    setFoe(f, 'windup', WIND[atk] * speedOf(w) * quick)
    if (atk === 'bolt' && phaseRef.current === 'play') {
      fx.text(geo().cx, geo().H * 0.24, 'DUCK!', '#fde047', 20)
      sfx.power()
    }
  }

  function foeThink(w: World) {
    const f = w.foe
    if (f.queue.length > 0) {
      beginAttack(w, f.queue.shift()!, 0.85)
      return
    }
    // Occasional taunt: guard dropped for a moment.
    if (Math.random() < 0.12) {
      setFoe(f, 'taunt', 0.9)
      return
    }
    const pats = f.def.patterns
    const pat = pats[Math.floor(Math.random() * pats.length)]
    f.queue = pat.slice(1)
    f.feinted = false
    beginAttack(w, pat[0])
  }

  function strike(w: World) {
    const f = w.foe
    const g = geo()
    const live = phaseRef.current === 'play'
    const ok = DODGES[f.atk].includes(w.evade)
    setFoe(f, 'strike', 0.16)
    f.dodged = ok
    if (ok) {
      const perfect = w.clock - w.evadeAt < 0.22
      if (au()) sfx.whoosh()
      fx.text(g.cx, g.H * 0.28, perfect ? 'PERFECT!' : 'DODGE', perfect ? '#fde047' : '#e2e8f0', perfect ? 24 : 16)
      if (perfect && live) {
        w.stats.perfects += 1
        w.score += 25
        if (w.stars < 3) {
          w.stars += 1
          fx.text(g.cx, g.H * 0.34, '+STAR', '#fde047', 18)
          sfx.power()
        }
        fx.slowmo(0.25, 0.4)
        haptic.light()
        run.update(w.stats)
        pushHud()
      }
      f.openHits = perfect ? 2 : 0
      return
    }
    // Hit!
    f.queue = []
    if (!live) return
    const dmg = Math.round(DMG[f.atk] * (1 + w.tier * 0.15))
    w.hp -= dmg
    w.hurt = 1
    fx.flash('#ef4444', 0.3)
    fx.shake(6 + dmg * 0.5, 0.3)
    fx.stop(0.08)
    fx.burst(g.cx + rand(-40, 40), g.H * 0.55, { count: 18, color: ['#ffffff', '#fde047', '#ef4444'], speed: 320, shape: 'spark', gravity: 200 })
    sfx.hurt()
    sfx.hit()
    haptic.heavy()
    pushHud()
    if (w.hp <= 0) playerDown(w)
  }

  function playerDown(w: World) {
    w.hp = 0
    w.downs += 1
    w.evade = 'none'
    w.punch = null
    if (w.downs >= 3) {
      knockedOut()
      return
    }
    w.mash = 0
    w.mashNeed = 8 + w.downs * 5
    w.mashT = 6
    setFoe(w.foe, 'wait', 99)
    setBanner({ key: Date.now(), text: 'DOWN!', sub: 'tap fast to get up' })
    sfx.boom(0.5)
    fx.slowmo(0.6, 0.35)
    pushHud()
  }

  function knockedOut() {
    const w = world.current
    w.mashNeed = 0
    setPhaseBoth('dying')
    setFoe(w.foe, 'wait', 99)
    fx.flash('#000000', 0.6)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    setBanner({ key: Date.now(), text: 'K.O.', sub: `${w.foe.def.name} wins` })
    pushHud()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(3 + w.stats.kos * 6 + w.stats.knockdowns * 2 + w.stats.belts * 20)
      run.end({ score: w.score, cleared: w.stats.kos >= 1, stats: { ...w.stats }, coins }, revive)
    }, 1300)
  }

  /** Ad revive: back on your feet with most of your health, one knockdown forgiven. */
  function revive() {
    const w = world.current
    w.downs = Math.max(0, w.downs - 1)
    w.hp = Math.round(w.max * 0.65)
    w.stam = w.maxStam
    w.gassed = false
    w.mashNeed = 0
    setFoe(w.foe, 'recover', 1.6)
    w.foe.queue = []
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'back on your feet' })
    pushHud()
    setPhaseBoth('play')
  }

  function hurtFoe(w: World, dmg: number, label: string, color: string, big: boolean) {
    const f = w.foe
    const g = geo()
    f.hp -= dmg
    f.flash = 1
    f.flinch = big ? 1 : 0.6
    w.score += dmg
    const hx = g.cx + w.camX
    const hy = g.waist - 230 * g.s * f.def.build + w.camY
    fx.text(hx + rand(-30, 30), hy - 40, `${label} ${dmg}`, color, big ? 24 : 17)
    fx.burst(hx, hy, { count: big ? 26 : 10, color: big ? ['#fde047', '#ffffff', '#f97316'] : ['#ffffff', '#fecaca'], speed: big ? 380 : 220, shape: 'spark', gravity: 100 })
    if (big) fx.ring(hx, hy, { color: '#fde047', maxR: 90, life: 0.35, width: 5 })
    fx.stop(big ? 0.12 : 0.04)
    fx.shake(big ? 10 : 3, big ? 0.3 : 0.1)
    if (au()) {
      sfx.hit()
      if (big) sfx.boom(0.5)
    }
    haptic.medium()
    if (f.hp <= 0) foeDown(w)
    pushHud()
  }

  function foeDown(w: World) {
    const f = w.foe
    f.hp = 0
    f.downs += 1
    f.queue = []
    w.stats.knockdowns += 1
    w.score += 100 * (w.stage + 1)
    fx.slowmo(0.8, 0.3)
    if (f.downs >= 3) {
      setFoe(f, 'ko', 3)
      w.stats.kos += 1
      w.score += 300 * (w.stage + 1)
      const champ = isChamp(w.stage)
      if (champ) {
        w.stats.belts += 1
        milestone('belt', w.stage + 1)
      } else milestone('ko', w.stage + 1)
      // Stars: KO = 1, never knocked down this bout = +1, finish with half your health or more = +1.
      const stars = 1 + (w.downs === 0 ? 1 : 0) + (w.hp >= w.max * 0.5 ? 1 : 0)
      run.completeLevel(w.stage + 1, stars)
      setBanner({ key: Date.now(), text: champ ? 'NEW CHAMPION!' : 'K.O.!', sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${f.def.name} is out` })
      sfx.win()
      haptic.success()
    } else {
      f.count = 0
      setFoe(f, 'down', 1.2 + f.downs * 1.4)
      setBanner({ key: Date.now(), text: 'KNOCKDOWN!', sub: `${f.downs} of 3` })
      sfx.boom(0.8)
      haptic.heavy()
    }
    run.update(w.stats)
  }

  // ── Player actions ──────────────────────────────────────

  function canAct(w: World) {
    return phaseRef.current === 'play' && w.mashNeed === 0 && w.hp > 0
  }

  function doEvade(dir: Evade) {
    const w = world.current
    if (!canAct(w) || w.evadeCd > 0 || w.evade !== 'none') return
    w.evade = dir
    w.evadeT = 0.5
    w.evadeAt = w.clock
    w.punch = null
    if (au()) sfx.whoosh()
  }

  function spendStam(w: World, n: number) {
    w.stam -= n
    w.restT = 0.45
    if (w.stam <= 0) {
      w.stam = 0
      w.gassed = true
      fx.text(geo().cx, geo().H * 0.7, 'GASSED!', '#cbd5e1', 18)
      sfx.miss()
    }
    pushHud()
  }

  function doJab(side: -1 | 1) {
    const w = world.current
    if (w.mashNeed > 0 && phaseRef.current === 'play') {
      mashTap(w)
      return
    }
    if (!canAct(w) || w.punchCd > 0 || w.evade !== 'none') return
    if (w.gassed) {
      fx.text(geo().cx, geo().H * 0.7, 'TOO TIRED', '#cbd5e1', 15)
      return
    }
    w.punch = { side, kind: 'jab', t: 0 }
    w.punchCd = 0.24
    spendStam(w, 1)
    if (au()) sfx.slash()
    const f = w.foe
    const st = f.st
    if (st === 'down' || st === 'ko' || st === 'intro' || st === 'wait') return
    if (st === 'open' || st === 'recover') {
      f.openHits += 1
      hurtFoe(w, 6, 'HIT', '#ffffff', false)
      if (st === 'open' && f.openHits >= 3 && f.hp > 0) {
        setFoe(f, 'dazed', 1.4)
        fx.text(geo().cx, geo().H * 0.22, 'DAZED! SWIPE UP', '#fde047', 20)
        sfx.combo()
      }
    } else if (st === 'dazed') {
      hurtFoe(w, 7, 'HIT', '#ffffff', false)
    } else if (st === 'taunt') {
      hurtFoe(w, 8, 'CHEAP SHOT', '#fca5a5', false)
      setFoe(f, 'recover', 0.5)
    } else if (st === 'windup' && f.t / f.dur < 0.5 && f.atk !== 'hay') {
      f.queue = []
      setFoe(f, 'recover', 0.7)
      hurtFoe(w, 10, 'COUNTER!', '#fde047', false)
      w.score += 20
    } else if (Math.random() < f.def.guard || st === 'windup' || st === 'strike') {
      fx.text(geo().cx + side * 40, geo().H * 0.38, 'BLOCKED', '#94a3b8', 14)
      spendStam(w, 1)
      if (au()) sfx.thud()
    } else {
      hurtFoe(w, 4, 'HIT', '#ffffff', false)
    }
  }

  function doUpper() {
    const w = world.current
    if (!canAct(w) || w.punchCd > 0 || w.evade !== 'none') return
    if (w.gassed) {
      fx.text(geo().cx, geo().H * 0.7, 'TOO TIRED', '#cbd5e1', 15)
      return
    }
    const f = w.foe
    if (f.st === 'down' || f.st === 'ko' || f.st === 'intro' || f.st === 'wait') return
    w.punchCd = 0.45
    if (w.stars > 0) {
      const n = w.stars
      w.punch = { side: 1, kind: 'star', t: 0 }
      w.stars = 0
      w.stats.stars += 1
      spendStam(w, 1)
      f.queue = []
      setFoe(f, 'recover', 1)
      fx.flash('#fde047', 0.25)
      hurtFoe(w, 10 + n * 9, n >= 3 ? 'SUPER STAR' : 'STAR PUNCH', '#fde047', true)
      run.update(w.stats)
      return
    }
    w.punch = { side: 1, kind: 'upper', t: 0 }
    spendStam(w, 2)
    if (f.st === 'dazed') {
      setFoe(f, 'recover', 0.9)
      hurtFoe(w, 18, 'UPPERCUT!', '#fb923c', true)
    } else if (f.st === 'open') {
      setFoe(f, 'recover', 0.6)
      hurtFoe(w, 10, 'UPPERCUT', '#fb923c', false)
    } else {
      fx.text(geo().cx, geo().H * 0.38, 'BLOCKED', '#94a3b8', 15)
      if (au()) sfx.clang()
      // Whiffed uppercut gets punished with a quick jab.
      if (f.st === 'idle' || f.st === 'taunt') beginAttack(w, 'jab', 0.7)
    }
  }

  function mashTap(w: World) {
    w.mash += 1
    fx.burst(geo().cx + rand(-60, 60), geo().H * 0.75, { count: 4, color: ['#fde047', '#ffffff'], speed: 160, size: 2.5 })
    if (au()) sfx.tap()
    haptic.light()
    if (w.mash >= w.mashNeed) {
      w.mashNeed = 0
      w.hp = Math.round(w.max * Math.max(0.3, 0.6 - (w.downs - 1) * 0.15))
      w.stam = w.maxStam
      w.gassed = false
      setFoe(w.foe, 'recover', 1.2)
      setBanner({ key: Date.now(), text: 'BACK UP!', sub: `${3 - w.downs} knockdown${3 - w.downs === 1 ? '' : 's'} left` })
      sfx.levelUp()
    }
    pushHud()
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    swipe.current = { id: e.pointerId, x: p.x, y: p.y, done: false }
    const w = world.current
    if (w.mashNeed > 0) {
      mashTap(w)
      swipe.current.done = true
    }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const sw = swipe.current
    if (!sw || sw.id !== e.pointerId || sw.done) return
    const p = localPoint(e, e.currentTarget)
    const dx = p.x - sw.x
    const dy = p.y - sw.y
    if (Math.hypot(dx, dy) < 26) return
    sw.done = true
    if (Math.abs(dx) > Math.abs(dy)) doEvade(dx < 0 ? 'L' : 'R')
    else if (dy > 0) doEvade('duck')
    else doUpper()
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const sw = swipe.current
    if (!sw || sw.id !== e.pointerId) return
    swipe.current = null
    if (sw.done) return
    const p = localPoint(e, e.currentTarget)
    doJab(p.x < size.current.w / 2 ? -1 : 1)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.repeat) return
      const k = e.key
      if (k === 'ArrowLeft') doEvade('L')
      else if (k === 'ArrowRight') doEvade('R')
      else if (k === 'ArrowDown') doEvade('duck')
      else if (k === 'ArrowUp') doUpper()
      else if (k === 'z' || k === 'a') doJab(-1)
      else if (k === 'x' || k === 'd' || k === ' ') doJab(1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation ──────────────────────────────────────────

  function updateFoe(w: World, dt: number) {
    const f = w.foe
    f.t += dt
    f.flash = Math.max(0, f.flash - dt * 5)
    f.flinch = Math.max(0, f.flinch - dt * 3)
    const done = f.t >= f.dur
    switch (f.st) {
      case 'intro':
        if (done) setFoe(f, 'idle', rand(0.8, 1.2))
        break
      case 'idle':
        if (done) foeThink(w)
        break
      case 'taunt':
        if (done) setFoe(f, 'idle', 0.3)
        break
      case 'windup':
        if (f.feint && !f.feinted && f.t > f.dur * 0.6) {
          // Fake: pull back and throw something else, quicker.
          f.feinted = true
          f.feint = false
          const others: Atk[] = (['hookL', 'hookR', 'upper', 'jab'] as Atk[]).filter((a) => a !== f.atk)
          fx.text(geo().cx, geo().H * 0.24, 'FAKE!', '#f0abfc', 18)
          beginAttack(w, others[Math.floor(Math.random() * others.length)], 0.7)
        } else if (done) strike(w)
        break
      case 'strike':
        if (done) {
          const dodged = f.dodged
          if (f.queue.length > 0) setFoe(f, 'recover', 0.22)
          else if (dodged) {
            if (f.openHits >= 2) {
              setFoe(f, 'dazed', 1.3)
              fx.text(geo().cx, geo().H * 0.22, 'DAZED! SWIPE UP', '#fde047', 20)
            } else setFoe(f, 'open', 1.1 * Math.min(1.2, speedOf(w)))
            f.openHits = 0
          } else setFoe(f, 'recover', 0.5)
        }
        break
      case 'recover':
        if (done) {
          if (f.queue.length > 0) beginAttack(w, f.queue.shift()!, 0.85)
          else setFoe(f, 'idle', rand(f.def.rest[0], f.def.rest[1]) * speedOf(w))
        }
        break
      case 'open':
      case 'dazed':
        if (done) setFoe(f, 'idle', rand(f.def.rest[0], f.def.rest[1]) * speedOf(w) * 0.8)
        break
      case 'down': {
        const c = Math.floor(f.t / 0.6) + 1
        if (c !== f.count && c <= 10) {
          f.count = c
          const g = geo()
          fx.text(g.cx, g.H * 0.2, String(c), '#ffffff', 40)
          if (au()) sfx.tick()
        }
        if (done) {
          f.hp = Math.round(f.max * (f.downs === 1 ? 0.6 : 0.4))
          setFoe(f, 'recover', 0.8)
          fx.text(geo().cx, geo().H * 0.3, 'HE IS UP!', '#fca5a5', 20)
          pushHud()
        }
        break
      }
      case 'ko':
        if (done && phaseRef.current === 'play') {
          w.stage += 1
          startBout(w)
        }
        break
      default:
        break
    }
  }

  function autoPlay(w: World) {
    // Attract-mode autopilot: dodge the right way just before impact, punch openings.
    const f = w.foe
    if (f.st === 'windup' && f.dur - f.t < 0.14 && w.evade === 'none') {
      const opts = DODGES[f.atk]
      doEvadeAuto(w, opts[Math.floor(Math.random() * opts.length)])
    } else if ((f.st === 'open' || f.st === 'dazed') && w.punchCd <= 0 && w.evade === 'none') {
      if (phaseRef.current === 'idle') {
        w.punch = { side: Math.random() < 0.5 ? -1 : 1, kind: 'jab', t: 0 }
        w.punchCd = 0.3
        f.flash = 1
        f.flinch = 0.6
      } else if (f.st === 'dazed' || w.stars >= 2) doUpper()
      else doJab(Math.random() < 0.5 ? -1 : 1)
    } else if (w.mashNeed > 0 && Math.random() < 0.3) mashTap(w)
  }

  function doEvadeAuto(w: World, dir: Evade) {
    if (phaseRef.current === 'idle') {
      w.evade = dir
      w.evadeT = 0.45
      w.evadeAt = w.clock
    } else doEvade(dir)
  }

  // ── Drawing ─────────────────────────────────────────────

  function buildBg(W: number, H: number, V: Venue) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const c = document.createElement('canvas')
    const pad = 80
    c.width = Math.round((W + pad * 2) * dpr)
    c.height = Math.round((H + pad) * dpr)
    const x = c.getContext('2d')!
    x.scale(dpr, dpr)
    x.translate(pad, pad / 2)
    const g = x.createLinearGradient(0, -pad, 0, H)
    g.addColorStop(0, V.sky[0])
    g.addColorStop(0.5, V.sky[1])
    g.addColorStop(1, V.sky[2])
    x.fillStyle = g
    x.fillRect(-pad, -pad, W + pad * 2, H + pad * 2)
    drawDecor(x, V, W, H, pad)
    // Crowd silhouettes in tiers
    const cr = V.crowd
    if (cr) for (let row = 0; row < 6; row++) {
      const y = H * 0.12 + row * H * 0.045
      x.fillStyle = `rgba(${cr[0] + row * 12},${cr[1] + row * 8},${cr[2] + row * 10},1)`
      for (let px = -pad + (row % 2) * 9; px < W + pad; px += 18) {
        const r = 7 + ((px * 13 + row * 7) % 4)
        x.beginPath()
        x.arc(px, y + ((px * 7) % 5), r, 0, Math.PI * 2)
        x.fill()
        x.fillRect(px - r, y + r * 0.4, r * 2, H * 0.05)
      }
    }
    // Apron / ring floor
    const floorTop = H * 0.58
    const fl = x.createLinearGradient(0, floorTop, 0, H)
    fl.addColorStop(0, V.floor[0])
    fl.addColorStop(1, V.floor[1])
    x.fillStyle = fl
    x.beginPath()
    x.moveTo(-pad, H)
    x.lineTo(W * 0.04, floorTop)
    x.lineTo(W * 0.96, floorTop)
    x.lineTo(W + pad, H)
    x.closePath()
    x.fill()
    x.fillStyle = V.mat
    x.beginPath()
    x.ellipse(W / 2, H * 0.78, W * 0.42, H * 0.12, 0, 0, Math.PI * 2)
    x.fill()
    x.strokeStyle = 'rgba(255,255,255,0.35)'
    x.lineWidth = 3
    x.beginPath()
    x.ellipse(W / 2, H * 0.78, W * 0.3, H * 0.08, 0, 0, Math.PI * 2)
    x.stroke()
    // Corner posts
    for (const px of [W * 0.04, W * 0.96]) {
      const pg = x.createLinearGradient(px - 6, 0, px + 6, 0)
      pg.addColorStop(0, V.post[0])
      pg.addColorStop(0.5, V.post[1])
      pg.addColorStop(1, V.post[0])
      x.fillStyle = pg
      x.fillRect(px - 6, H * 0.36, 12, floorTop - H * 0.36 + 4)
      x.fillStyle = '#fde047'
      x.fillRect(px - 7, H * 0.36, 14, 6)
    }
    // Ropes
    const ropes = V.ropes
    ropes.forEach((col, i) => {
      const y = H * 0.4 + i * H * 0.055
      x.strokeStyle = 'rgba(0,0,0,0.35)'
      x.lineWidth = 5
      x.beginPath()
      x.moveTo(-pad, y + 3)
      x.quadraticCurveTo(W / 2, y + 9, W + pad, y + 3)
      x.stroke()
      x.strokeStyle = col
      x.lineWidth = 4
      x.beginPath()
      x.moveTo(-pad, y)
      x.quadraticCurveTo(W / 2, y + 6, W + pad, y)
      x.stroke()
    })
    return { c, pad }
  }

  /** Venue backdrop details painted behind the crowd. */
  function drawDecor(x: CanvasRenderingContext2D, V: Venue, W: number, H: number, pad: number) {
    const top = H * 0.36
    if (V.decor === 'bricks') {
      x.fillStyle = 'rgba(120,53,15,0.35)'
      for (let yy = -pad; yy < top + 40; yy += 18) {
        for (let xx = -pad + ((yy / 18) % 2) * 20; xx < W + pad; xx += 40) {
          x.fillRect(xx, yy, 36, 14)
        }
      }
      // Hanging punching bag and a dim bulb
      x.fillStyle = '#7f1d1d'
      x.beginPath()
      x.roundRect(W * 0.1, H * 0.12, 26, 70, 10)
      x.fill()
      x.fillRect(W * 0.1 + 12, -pad, 2, H * 0.12 + pad)
      const bl = x.createRadialGradient(W * 0.75, H * 0.08, 2, W * 0.75, H * 0.08, 80)
      bl.addColorStop(0, 'rgba(253,230,138,0.6)')
      bl.addColorStop(1, 'rgba(253,230,138,0)')
      x.fillStyle = bl
      x.fillRect(W * 0.75 - 80, H * 0.08 - 80, 160, 160)
    } else if (V.decor === 'skyline') {
      for (let i = 0; i < 14; i++) {
        const bw = 26 + ((i * 37) % 30)
        const bh = H * (0.12 + ((i * 53) % 17) / 60)
        const bx = -pad + i * ((W + pad * 2) / 13)
        x.fillStyle = i % 2 ? 'rgba(15,23,42,0.95)' : 'rgba(30,41,59,0.95)'
        x.fillRect(bx, top - bh, bw, bh + 10)
        x.fillStyle = 'rgba(253,224,71,0.55)'
        for (let wy = top - bh + 6; wy < top - 4; wy += 9) {
          for (let wx = bx + 4; wx < bx + bw - 4; wx += 7) if ((wx * 7 + wy * 3) % 5 < 2) x.fillRect(wx, wy, 3, 4)
        }
      }
      x.fillStyle = '#f8fafc'
      x.beginPath()
      x.arc(W * 0.14, H * 0.19, 14, 0, Math.PI * 2)
      x.fill()
    } else if (V.decor === 'banners') {
      const cols = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ec4899']
      for (let row = 0; row < 2; row++) {
        const yy = H * (0.05 + row * 0.07)
        x.strokeStyle = 'rgba(255,255,255,0.4)'
        x.lineWidth = 1
        x.beginPath()
        x.moveTo(-pad, yy)
        x.quadraticCurveTo(W / 2, yy + 20, W + pad, yy)
        x.stroke()
        for (let i = 0; i < 16; i++) {
          const fx0 = -pad + ((i + 0.5) / 16) * (W + pad * 2)
          const fy0 = yy + Math.sin((i / 15) * Math.PI) * 10
          x.fillStyle = cols[(i + row) % cols.length]
          x.beginPath()
          x.moveTo(fx0 - 9, fy0)
          x.lineTo(fx0 + 9, fy0)
          x.lineTo(fx0, fy0 + 16)
          x.closePath()
          x.fill()
        }
      }
    } else if (V.decor === 'lights') {
      for (let i = 0; i < 4; i++) {
        const lx = W * (0.12 + i * 0.25)
        const beam = x.createLinearGradient(lx, 0, lx, top)
        beam.addColorStop(0, `${V.spot}55`)
        beam.addColorStop(1, `${V.spot}00`)
        x.fillStyle = beam
        x.beginPath()
        x.moveTo(lx - 6, -pad / 2)
        x.lineTo(lx + 6, -pad / 2)
        x.lineTo(lx + 60, top)
        x.lineTo(lx - 60, top)
        x.closePath()
        x.fill()
        x.fillStyle = '#e2e8f0'
        x.fillRect(lx - 10, -pad / 2 - 6, 20, 10)
      }
    } else if (V.decor === 'lanterns') {
      for (let i = 0; i < 7; i++) {
        const lx = -pad / 2 + (i / 6) * (W + pad)
        const ly = H * 0.06 + (i % 2) * 14
        const gl = x.createRadialGradient(lx, ly, 2, lx, ly, 34)
        gl.addColorStop(0, 'rgba(248,113,113,0.6)')
        gl.addColorStop(1, 'rgba(248,113,113,0)')
        x.fillStyle = gl
        x.fillRect(lx - 34, ly - 34, 68, 68)
        x.fillStyle = '#dc2626'
        x.beginPath()
        x.ellipse(lx, ly, 10, 13, 0, 0, Math.PI * 2)
        x.fill()
        x.fillStyle = '#111827'
        x.fillRect(lx - 6, ly - 15, 12, 3)
        x.fillRect(lx - 6, ly + 12, 12, 3)
      }
    } else if (V.decor === 'palace') {
      for (let i = 0; i < 6; i++) {
        const cx = -pad / 2 + (i / 5) * (W + pad)
        const col = x.createLinearGradient(cx - 12, 0, cx + 12, 0)
        col.addColorStop(0, '#a16207')
        col.addColorStop(0.5, '#fde68a')
        col.addColorStop(1, '#a16207')
        x.fillStyle = col
        x.fillRect(cx - 12, -pad / 2, 24, top + pad / 2)
      }
      x.fillStyle = '#7f1d1d'
      x.beginPath()
      x.moveTo(-pad, -pad / 2)
      x.lineTo(W + pad, -pad / 2)
      for (let i = 10; i >= 0; i--) x.quadraticCurveTo(-pad + ((i + 0.5) / 10) * (W + pad * 2), H * 0.08, -pad + (i / 10) * (W + pad * 2), H * 0.02)
      x.closePath()
      x.fill()
    }
  }

  function drawGlove(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, ang: number, glowAmt: number) {
    if (glowAmt > 0) glow(ctx, x, y, r * 2.4, '#ef4444', glowAmt)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.25, col)
    g.addColorStop(1, shade(col))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(0, 0, r, r * 1.08, 0, 0, Math.PI * 2)
    ctx.fill()
    // Thumb
    ctx.beginPath()
    ctx.ellipse(r * 0.75, r * 0.15, r * 0.32, r * 0.5, -0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = Math.max(1, r * 0.06)
    ctx.beginPath()
    ctx.arc(0, r * 0.1, r * 0.55, Math.PI * 1.1, Math.PI * 1.9)
    ctx.stroke()
    // Cuff
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.roundRect(-r * 0.6, r * 0.82, r * 1.2, r * 0.42, r * 0.12)
    ctx.fill()
    ctx.restore()
  }

  function shade(hex: string) {
    const n = parseInt(hex.slice(1), 16)
    const r = Math.round(((n >> 16) & 255) * 0.5)
    const g = Math.round(((n >> 8) & 255) * 0.5)
    const b = Math.round((n & 255) * 0.5)
    return `rgb(${r},${g},${b})`
  }

  function drawFoe(ctx: CanvasRenderingContext2D, w: World, time: number) {
    const g = geo()
    const f = w.foe
    const d = f.def
    const s = g.s * d.build
    const p = f.dur > 0 ? clamp(f.t / f.dur, 0, 1) : 1
    let cx = g.cx + w.camX
    let waist = g.waist + w.camY
    let rot = 0
    let scale = 1
    let alpha = 1
    const bob = Math.sin(time * 4) * 4 * g.s
    // Whole-body poses
    if (f.st === 'intro') {
      scale = 0.7 + 0.3 * Math.min(1, p * 1.5)
      alpha = Math.min(1, p * 2)
    } else if (f.st === 'down' || f.st === 'ko') {
      const fall = Math.min(1, f.t / 0.5)
      rot = fall * 0.5 * (f.downs % 2 ? 1 : -1)
      waist += fall * g.H * 0.28
      if (f.st === 'down' && f.dur - f.t < 0.6) {
        const up = 1 - (f.dur - f.t) / 0.6
        rot *= 1 - up
        waist -= up * fall * g.H * 0.28
      }
    } else if (f.st === 'windup') {
      if (f.atk === 'upper') waist += 18 * g.s * p
      if (f.atk === 'hay') waist -= 10 * g.s * p
    } else if (f.st === 'dazed') {
      cx += Math.sin(time * 5) * 10 * g.s
      rot = Math.sin(time * 5) * 0.06
    }
    const lean = f.st === 'windup' ? (f.atk === 'hookL' ? 0.12 : f.atk === 'hookR' ? -0.12 : 0) * p : f.st === 'strike' ? (f.atk === 'hookL' ? -0.15 : f.atk === 'hookR' ? 0.15 : 0) : 0
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(cx, waist + bob)
    ctx.rotate(rot + lean)
    ctx.scale(scale, scale)
    if (d.rage && f.hp < f.max * 0.4 && f.st !== 'down' && f.st !== 'ko') glow(ctx, 0, -180 * s, 200 * s, '#ef4444', 0.25 + Math.sin(time * 8) * 0.08)
    const shoulderY = -175 * s
    const shoulderW = 82 * s
    // Torso
    const tg = ctx.createLinearGradient(-shoulderW, 0, shoulderW, 0)
    tg.addColorStop(0, shade(d.skin))
    tg.addColorStop(0.35, d.skin)
    tg.addColorStop(0.7, d.skin)
    tg.addColorStop(1, shade(d.skin))
    ctx.fillStyle = tg
    ctx.beginPath()
    ctx.moveTo(-shoulderW, shoulderY)
    ctx.quadraticCurveTo(0, shoulderY - 18 * s, shoulderW, shoulderY)
    ctx.lineTo(shoulderW * 0.68, 0)
    ctx.lineTo(-shoulderW * 0.68, 0)
    ctx.closePath()
    ctx.fill()
    if (f.flash > 0) {
      ctx.globalAlpha = f.flash * 0.6
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.globalAlpha = alpha
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 2
    ctx.stroke()
    // Pecs and abs
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 2.5 * s
    ctx.beginPath()
    ctx.arc(-26 * s, shoulderY + 45 * s, 26 * s, 0.2, Math.PI - 0.4)
    ctx.moveTo(52 * s, shoulderY + 45 * s)
    ctx.arc(26 * s, shoulderY + 45 * s, 26 * s, 0.4, Math.PI - 0.2)
    ctx.moveTo(0, shoulderY + 75 * s)
    ctx.lineTo(0, -12 * s)
    ctx.moveTo(-18 * s, shoulderY + 100 * s)
    ctx.lineTo(18 * s, shoulderY + 100 * s)
    ctx.moveTo(-16 * s, shoulderY + 125 * s)
    ctx.lineTo(16 * s, shoulderY + 125 * s)
    ctx.stroke()
    // Trunks
    ctx.fillStyle = d.trunks
    ctx.beginPath()
    ctx.roundRect(-shoulderW * 0.72, -6 * s, shoulderW * 1.44, 90 * s, 10 * s)
    ctx.fill()
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(-shoulderW * 0.72, -6 * s, shoulderW * 1.44, 12 * s)
    ctx.fillStyle = shade(d.trunks)
    ctx.fillRect(-2 * s, 10 * s, 4 * s, 70 * s)
    // Head
    const flinch = f.flinch
    const headX = (f.st === 'dazed' ? Math.sin(time * 6) * 8 : 0) * s
    const headY = shoulderY - 52 * s - flinch * 10 * s
    const hr = 47 * s * (1 - flinch * 0.08)
    ctx.fillStyle = d.skin
    ctx.fillRect(-18 * s, shoulderY - 30 * s, 36 * s, 30 * s)
    drawHead(ctx, w, headX, headY, hr, time)
    // Arms and gloves
    const gr = 30 * s
    let boltAt: { x: number; y: number; r: number; p: number } | null = null
    for (const side of [-1, 1] as const) {
      const shx = side * shoulderW * 0.92
      const shy = shoulderY + 12 * s
      let gx = side * 34 * s
      let gy = headY + 34 * s
      let gscale = 1
      let glowAmt = 0
      let ang = side * 0.2
      const isAtk = (f.atk === 'hookL' && side === -1) || (f.atk === 'hookR' && side === 1) || ((f.atk === 'jab' || f.atk === 'bolt') && side === 1) || (f.atk === 'upper' && side === -1) || f.atk === 'hay'
      if (f.st === 'windup' && isAtk) {
        glowAmt = 0.25 + p * 0.45 + Math.sin(time * 30) * 0.1 * p
        if (f.atk === 'hookL' || f.atk === 'hookR') {
          gx = side * (60 + 70 * p) * s
          gy = headY + (10 - 10 * p) * s
          gscale = 1 - 0.15 * p
          ang = side * (0.3 + p)
        } else if (f.atk === 'jab') {
          gx = side * (34 + 8 * p) * s
          gy = headY + (34 + 14 * p) * s
          gscale = 1 - 0.12 * p
        } else if (f.atk === 'bolt') {
          // Cocked at the chin, crackling with lightning — duck it.
          gx = side * (34 - 20 * p) * s
          gy = headY + (30 - 18 * p) * s
          gscale = 1 - 0.2 * p
          boltAt = { x: gx, y: gy, r: gr * gscale, p }
        } else if (f.atk === 'upper') {
          gx = side * 48 * s
          gy = shoulderY + (40 + 90 * p) * s
          ang = Math.PI * p * 0.5 * side
        } else {
          gx = side * (40 + 20 * p) * s
          gy = headY - (30 + 70 * p) * s
          ang = -side * 0.4
        }
      } else if (f.st === 'strike' && isAtk) {
        // Punch flies at the camera.
        const k = clamp(f.t / f.dur, 0, 1)
        gscale = 1 + k * 1.6
        if (f.atk === 'hookL' || f.atk === 'hookR') {
          gx = side * (130 - 160 * k) * s
          gy = headY + 40 * k * s
        } else if (f.atk === 'upper') {
          gx = side * (48 - 40 * k) * s
          gy = shoulderY + (130 - 200 * k) * s
        } else if (f.atk === 'hay') {
          gx = side * (60 - 50 * k) * s
          gy = headY + (-100 + 160 * k) * s
        } else {
          gx = side * 30 * (1 - k) * s
          gy = headY + (48 + 10 * k) * s
        }
        glowAmt = 0.5
      } else if (f.st === 'open' || f.st === 'taunt') {
        gx = side * 70 * s
        gy = shoulderY + 90 * s
      } else if (f.st === 'dazed' || f.st === 'down' || f.st === 'ko') {
        gx = side * 64 * s
        gy = shoulderY + 120 * s + Math.sin(time * 4 + side) * 6 * s
      } else if (f.st === 'recover' && f.flinch > 0.2) {
        gx = side * 52 * s
        gy = shoulderY + 30 * s
      } else if (f.flash > 0.5 && (f.st === 'idle' || f.st === 'windup')) {
        gx = side * 18 * s
        gy = headY + 12 * s
      }
      // Upper arm then forearm
      const ex = (shx + gx) / 2 + side * 16 * s
      const ey = (shy + gy) / 2 + 34 * s
      ctx.strokeStyle = shade(d.skin)
      ctx.lineCap = 'round'
      ctx.lineWidth = 30 * s
      ctx.beginPath()
      ctx.moveTo(shx, shy)
      ctx.lineTo(ex, ey)
      ctx.lineTo(gx, gy)
      ctx.stroke()
      ctx.strokeStyle = d.skin
      ctx.lineWidth = 24 * s
      ctx.stroke()
      // Deltoid
      const dg = ctx.createRadialGradient(shx - side * 4 * s, shy - 6 * s, 2 * s, shx, shy, 22 * s)
      dg.addColorStop(0, d.skin)
      dg.addColorStop(1, shade(d.skin))
      ctx.fillStyle = dg
      ctx.beginPath()
      ctx.arc(shx, shy, 21 * s, 0, Math.PI * 2)
      ctx.fill()
      drawGlove(ctx, gx, gy, gr * gscale, d.gloves, ang, glowAmt)
    }
    if (boltAt) {
      // Lightning arcs around the cocked glove.
      glow(ctx, boltAt.x, boltAt.y, boltAt.r * 3, '#fde047', 0.35 + boltAt.p * 0.4)
      ctx.strokeStyle = '#fef08a'
      ctx.lineWidth = 2.5 * s
      ctx.lineJoin = 'round'
      ctx.beginPath()
      for (let k = 0; k < 4; k++) {
        const a0 = time * 9 + k * 1.6
        let px = boltAt.x + Math.cos(a0) * boltAt.r * 0.9
        let py = boltAt.y + Math.sin(a0) * boltAt.r * 0.9
        ctx.moveTo(px, py)
        for (let j = 0; j < 3; j++) {
          px += Math.cos(a0) * boltAt.r * 0.35 + rand(-6, 6) * s
          py += Math.sin(a0) * boltAt.r * 0.35 + rand(-6, 6) * s
          ctx.lineTo(px, py)
        }
      }
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawHead(ctx: CanvasRenderingContext2D, w: World, x: number, y: number, r: number, time: number) {
    const f = w.foe
    const d = f.def
    const hurt = 1 - f.hp / f.max
    // Hair behind
    if (d.hairStyle === 'ponytail') {
      ctx.fillStyle = d.hair
      ctx.beginPath()
      ctx.ellipse(x + r * 0.7, y - r * 0.2 + Math.sin(time * 3) * r * 0.05, r * 0.25, r * 0.7, 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
    if (d.hairStyle === 'afro') {
      ctx.fillStyle = d.hair
      ctx.beginPath()
      ctx.arc(x, y - r * 0.2, r * 1.3, 0, Math.PI * 2)
      ctx.fill()
    }
    const hg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r * 1.1)
    hg.addColorStop(0, d.skin)
    hg.addColorStop(1, shade(d.skin))
    ctx.fillStyle = hg
    ctx.beginPath()
    ctx.ellipse(x, y, r * 0.92, r, 0, 0, Math.PI * 2)
    ctx.fill()
    // Ears
    ctx.beginPath()
    ctx.ellipse(x - r * 0.92, y + r * 0.05, r * 0.16, r * 0.24, 0, 0, Math.PI * 2)
    ctx.ellipse(x + r * 0.92, y + r * 0.05, r * 0.16, r * 0.24, 0, 0, Math.PI * 2)
    ctx.fill()
    if (f.flash > 0) {
      ctx.globalAlpha = f.flash * 0.7
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(x, y, r * 0.92, r, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    // Hair on top
    ctx.fillStyle = d.hair
    if (d.hairStyle === 'slick') {
      ctx.beginPath()
      ctx.ellipse(x, y - r * 0.55, r * 0.95, r * 0.55, 0, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.ellipse(x + r * 0.2, y - r * 0.62, r * 0.7, r * 0.3, -0.2, 0, Math.PI * 2)
      ctx.fill()
    } else if (d.hairStyle === 'spiky') {
      ctx.beginPath()
      ctx.moveTo(x - r * 0.95, y - r * 0.3)
      for (let i = 0; i <= 6; i++) {
        const a = Math.PI + (i / 6) * Math.PI
        const rr = i % 2 ? r * 1.35 : r * 0.95
        ctx.lineTo(x + Math.cos(a) * rr, y - r * 0.2 + Math.sin(a) * rr)
      }
      ctx.closePath()
      ctx.fill()
    } else if (d.hairStyle === 'buzz') {
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      ctx.ellipse(x, y - r * 0.4, r * 0.93, r * 0.62, 0, Math.PI, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    } else if (d.hairStyle === 'mohawk') {
      ctx.beginPath()
      ctx.moveTo(x - r * 0.18, y - r * 0.7)
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(x - r * 0.25 + i * r * 0.12, y - r * (1.35 + (i % 2) * 0.2))
      }
      ctx.lineTo(x + r * 0.2, y - r * 0.7)
      ctx.closePath()
      ctx.fill()
    } else if (d.hairStyle === 'afro') {
      ctx.beginPath()
      ctx.ellipse(x, y - r * 0.75, r * 1.05, r * 0.5, 0, Math.PI, Math.PI * 2)
      ctx.fill()
    } else if (d.hairStyle === 'ponytail') {
      ctx.beginPath()
      ctx.ellipse(x, y - r * 0.5, r * 0.94, r * 0.6, 0, Math.PI, Math.PI * 2)
      ctx.fill()
    } else if (d.hairStyle === 'curly') {
      ctx.beginPath()
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * 1.05 + (i / 6) * Math.PI * 0.9
        ctx.moveTo(x + Math.cos(a) * r * 0.85 + r * 0.22, y - r * 0.3 + Math.sin(a) * r * 0.85)
        ctx.arc(x + Math.cos(a) * r * 0.85, y - r * 0.3 + Math.sin(a) * r * 0.85, r * 0.22, 0, Math.PI * 2)
      }
      ctx.fill()
    }
    drawAcc(ctx, d, x, y, r, 'top')
    if (d.crown) {
      ctx.fillStyle = '#facc15'
      ctx.strokeStyle = '#a16207'
      ctx.lineWidth = 2
      ctx.beginPath()
      const cy = y - r * 1.15
      ctx.moveTo(x - r * 0.55, cy + r * 0.35)
      ctx.lineTo(x - r * 0.6, cy - r * 0.15)
      ctx.lineTo(x - r * 0.3, cy + r * 0.1)
      ctx.lineTo(x, cy - r * 0.3)
      ctx.lineTo(x + r * 0.3, cy + r * 0.1)
      ctx.lineTo(x + r * 0.6, cy - r * 0.15)
      ctx.lineTo(x + r * 0.55, cy + r * 0.35)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(x, cy + r * 0.12, r * 0.08, 0, Math.PI * 2)
      ctx.fill()
    }
    // Face
    const st = f.st
    const angry = st === 'windup' || st === 'strike'
    const ey = y - r * 0.08
    const ex = r * 0.34
    if (st === 'dazed' || st === 'down' || st === 'ko') {
      // Spiral / X eyes
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = Math.max(1.5, r * 0.06)
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        if (st === 'ko') {
          ctx.moveTo(x + sx * ex - r * 0.1, ey - r * 0.1)
          ctx.lineTo(x + sx * ex + r * 0.1, ey + r * 0.1)
          ctx.moveTo(x + sx * ex + r * 0.1, ey - r * 0.1)
          ctx.lineTo(x + sx * ex - r * 0.1, ey + r * 0.1)
        } else {
          for (let a = 0; a < Math.PI * 4; a += 0.4) {
            const rr = (a / (Math.PI * 4)) * r * 0.14
            const px = x + sx * ex + Math.cos(a + time * 6) * rr
            const py = ey + Math.sin(a + time * 6) * rr
            if (a === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
        }
        ctx.stroke()
      }
      // Stars circling the head
      if (st === 'dazed') {
        for (let i = 0; i < 3; i++) {
          const a = time * 4 + (i * Math.PI * 2) / 3
          drawStar(ctx, x + Math.cos(a) * r * 1.1, y - r * 1.05 + Math.sin(a) * r * 0.25, r * 0.16, '#fde047')
        }
      }
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(x - ex, ey, r * 0.15, r * (angry ? 0.08 : 0.12), 0, 0, Math.PI * 2)
      ctx.ellipse(x + ex, ey, r * 0.15, r * (angry ? 0.08 : 0.12), 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#111827'
      const look = st === 'windup' ? (f.atk === 'hookL' ? -1 : f.atk === 'hookR' ? 1 : 0) * r * 0.04 : 0
      ctx.beginPath()
      ctx.arc(x - ex + look, ey + r * 0.01, r * 0.065, 0, Math.PI * 2)
      ctx.arc(x + ex + look, ey + r * 0.01, r * 0.065, 0, Math.PI * 2)
      ctx.fill()
    }
    // Brows
    ctx.strokeStyle = d.hairStyle === 'bald' ? '#3f2a14' : d.hair
    ctx.lineWidth = Math.max(2, r * 0.1)
    ctx.lineCap = 'round'
    const browTilt = angry ? 0.12 : st === 'open' || st === 'taunt' ? -0.08 : 0.03
    ctx.beginPath()
    ctx.moveTo(x - ex - r * 0.2, ey - r * 0.2 - browTilt * r)
    ctx.lineTo(x - ex + r * 0.17, ey - r * 0.2 + browTilt * r)
    ctx.moveTo(x + ex + r * 0.2, ey - r * 0.2 - browTilt * r)
    ctx.lineTo(x + ex - r * 0.17, ey - r * 0.2 + browTilt * r)
    ctx.stroke()
    // Nose
    ctx.strokeStyle = shade(d.skin)
    ctx.lineWidth = Math.max(1.5, r * 0.06)
    ctx.beginPath()
    ctx.moveTo(x, ey + r * 0.05)
    ctx.quadraticCurveTo(x + r * 0.12, ey + r * 0.3, x - r * 0.05, ey + r * 0.32)
    ctx.stroke()
    // Mouth
    const my = y + r * 0.55
    if (f.flinch > 0.3 || st === 'dazed' || st === 'down') {
      ctx.fillStyle = '#450a0a'
      ctx.beginPath()
      ctx.ellipse(x, my, r * 0.14, r * 0.12, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (angry) {
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(x - r * 0.25, my - r * 0.07, r * 0.5, r * 0.14, r * 0.04)
      ctx.fill()
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = 1
      ctx.stroke()
    } else if (st === 'taunt') {
      ctx.strokeStyle = '#450a0a'
      ctx.lineWidth = Math.max(2, r * 0.07)
      ctx.beginPath()
      ctx.arc(x, my - r * 0.12, r * 0.24, 0.2, Math.PI - 0.2)
      ctx.stroke()
    } else {
      ctx.strokeStyle = '#450a0a'
      ctx.lineWidth = Math.max(2, r * 0.07)
      ctx.beginPath()
      ctx.moveTo(x - r * 0.2, my)
      ctx.lineTo(x + r * 0.2, my + r * 0.02)
      ctx.stroke()
    }
    if (d.mustache) {
      ctx.fillStyle = d.hairStyle === 'bald' ? '#3f2a14' : d.hair
      ctx.beginPath()
      ctx.ellipse(x - r * 0.15, my - r * 0.14, r * 0.2, r * 0.07, 0.2, 0, Math.PI * 2)
      ctx.ellipse(x + r * 0.15, my - r * 0.14, r * 0.2, r * 0.07, -0.2, 0, Math.PI * 2)
      ctx.fill()
    }
    if (d.beard) {
      ctx.fillStyle = d.hair
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.ellipse(x, y + r * 0.7, r * 0.55, r * 0.35, 0, 0, Math.PI)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    drawAcc(ctx, d, x, y, r, 'face')
    // Bruises and sweat as the bout wears on
    if (hurt > 0.35) {
      ctx.fillStyle = `rgba(147,51,234,${Math.min(0.45, (hurt - 0.35) * 0.9)})`
      ctx.beginPath()
      ctx.ellipse(x - ex - r * 0.05, ey + r * 0.12, r * 0.2, r * 0.13, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    if (hurt > 0.6 || f.downs > 0) {
      ctx.fillStyle = '#bae6fd'
      const sy = (time * 40) % (r * 0.8)
      ctx.beginPath()
      ctx.ellipse(x + r * 0.85, y - r * 0.4 + sy, r * 0.06, r * 0.1, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  /** Accessories: 'top' layer sits on the hair, 'face' layer over the eyes. */
  function drawAcc(ctx: CanvasRenderingContext2D, d: FoeDef, x: number, y: number, r: number, layer: 'top' | 'face') {
    const acc = d.acc ?? 'none'
    const ey = y - r * 0.08
    if (layer === 'top' && acc === 'headband') {
      ctx.fillStyle = d.trunks
      ctx.beginPath()
      ctx.roundRect(x - r * 0.95, y - r * 0.52, r * 1.9, r * 0.2, r * 0.06)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x + r * 0.85, y - r * 0.45)
      ctx.lineTo(x + r * 1.3, y - r * 0.2)
      ctx.lineTo(x + r * 1.2, y - r * 0.55)
      ctx.closePath()
      ctx.fill()
    } else if (layer === 'face' && acc === 'patch') {
      ctx.fillStyle = '#111827'
      ctx.beginPath()
      ctx.ellipse(x - r * 0.34, ey, r * 0.2, r * 0.17, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#111827'
      ctx.lineWidth = Math.max(1.5, r * 0.05)
      ctx.beginPath()
      ctx.moveTo(x - r * 0.9, y - r * 0.35)
      ctx.lineTo(x + r * 0.9, ey + r * 0.1)
      ctx.stroke()
    } else if (layer === 'face' && acc === 'shades') {
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.roundRect(x - r * 0.58, ey - r * 0.13, r * 0.48, r * 0.26, r * 0.1)
      ctx.roundRect(x + r * 0.1, ey - r * 0.13, r * 0.48, r * 0.26, r * 0.1)
      ctx.fill()
      ctx.fillRect(x - r * 0.12, ey - r * 0.07, r * 0.24, r * 0.05)
      ctx.fillStyle = 'rgba(134,239,172,0.5)'
      ctx.fillRect(x - r * 0.5, ey - r * 0.08, r * 0.14, r * 0.05)
      ctx.fillRect(x + r * 0.18, ey - r * 0.08, r * 0.14, r * 0.05)
    } else if (layer === 'face' && acc === 'scar') {
      ctx.strokeStyle = 'rgba(127,29,29,0.75)'
      ctx.lineWidth = Math.max(1.5, r * 0.05)
      ctx.beginPath()
      ctx.moveTo(x + r * 0.2, ey - r * 0.35)
      ctx.lineTo(x + r * 0.5, ey + r * 0.3)
      for (let i = 0; i < 4; i++) {
        const t = i / 3
        const px = x + r * (0.2 + 0.3 * t)
        const py = ey + r * (-0.35 + 0.65 * t)
        ctx.moveTo(px - r * 0.07, py + r * 0.03)
        ctx.lineTo(px + r * 0.07, py - r * 0.03)
      }
      ctx.stroke()
    } else if (layer === 'face' && acc === 'mask') {
      ctx.fillStyle = 'rgba(30,27,75,0.9)'
      ctx.beginPath()
      ctx.ellipse(x, ey, r * 0.85, r * 0.22, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e9d5ff'
      ctx.beginPath()
      ctx.ellipse(x - r * 0.34, ey, r * 0.12, r * 0.06, 0, 0, Math.PI * 2)
      ctx.ellipse(x + r * 0.34, ey, r * 0.12, r * 0.06, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (layer === 'face' && acc === 'tattoo') {
      ctx.strokeStyle = 'rgba(30,58,138,0.6)'
      ctx.lineWidth = Math.max(1.2, r * 0.04)
      ctx.beginPath()
      ctx.moveTo(x - r * 0.75, y + r * 0.1)
      ctx.quadraticCurveTo(x - r * 0.55, y + r * 0.35, x - r * 0.7, y + r * 0.55)
      ctx.moveTo(x - r * 0.62, y + r * 0.18)
      ctx.lineTo(x - r * 0.48, y + r * 0.22)
      ctx.stroke()
    }
  }

  function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
    ctx.fillStyle = col
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const rr = i % 2 ? r * 0.45 : r
      if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
      else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    }
    ctx.closePath()
    ctx.fill()
  }

  function drawPlayer(ctx: CanvasRenderingContext2D, w: World, time: number) {
    const g = geo()
    const s = g.s
    const r = 46 * s
    const duck = w.evade === 'duck' ? 1 : 0
    const sideShift = w.evade === 'L' ? -1 : w.evade === 'R' ? 1 : 0
    const baseY = g.H * 0.93 + duck * 40 * s + Math.sin(time * 4) * 3 * s
    const foeHead = { x: g.cx + w.camX, y: g.waist + w.camY - 230 * s * w.foe.def.build }
    for (const side of [-1, 1] as const) {
      let x = g.cx + side * g.W * 0.24 + sideShift * 30 * s
      let y = baseY
      let sc = 1
      let ang = side * -0.35
      const p = w.punch
      if (p && p.side === side) {
        const k = p.t < 0.08 ? p.t / 0.08 : Math.max(0, 1 - (p.t - 0.08) / 0.16)
        if (p.kind === 'jab') {
          x += (foeHead.x + side * 18 * s - x) * k
          y += (foeHead.y + 20 * s - y) * k
          sc = 1 - 0.45 * k
          ang = side * -0.1
        } else {
          const kk = p.t < 0.12 ? p.t / 0.12 : Math.max(0, 1 - (p.t - 0.12) / 0.2)
          x += (foeHead.x + 10 * s - x) * kk
          y += (foeHead.y + 45 * s - y) * kk + Math.sin(kk * Math.PI) * 40 * s
          sc = 1 - 0.35 * kk
          ang = -0.2 - kk * 0.6
          if (p.kind === 'star') glow(ctx, x, y, r * 2.4 * sc, '#fde047', 0.6 * kk)
        }
      }
      // Forearm
      ctx.strokeStyle = '#d4a373'
      ctx.lineCap = 'round'
      ctx.lineWidth = 36 * s * sc
      ctx.beginPath()
      ctx.moveTo(x + side * 30 * s, g.H + 40 * s)
      ctx.lineTo(x, y + r * 0.6 * sc)
      ctx.stroke()
      drawGlove(ctx, x, y, r * sc, side === -1 ? '#ef4444' : '#2563eb', ang, 0)
    }
  }

  function simulate(raw: number) {
    const { w: W, h: H } = size.current
    const w = world.current
    const ph = phaseRef.current
    const dt = fx.step(raw)
    const g = geo()

    w.clock += dt
    if (ph === 'idle' || ph === 'play' || ph === 'dying') {
      if (ph !== 'dying') updateFoe(w, dt)
      if (ph === 'idle' || (import.meta.env.DEV && devAuto.current && ph === 'play')) autoPlay(w)
      if (w.evadeT > 0) {
        w.evadeT -= dt
        if (w.evadeT <= 0) {
          w.evade = 'none'
          w.evadeCd = 0.12
        }
      }
      w.evadeCd = Math.max(0, w.evadeCd - dt)
      w.punchCd = Math.max(0, w.punchCd - dt)
      if (w.punch) {
        w.punch.t += dt
        if (w.punch.t > 0.4) w.punch = null
      }
      // Stamina recovery
      w.restT -= dt
      if (w.restT <= 0 && w.stam < w.maxStam) {
        const before = w.stam
        w.stam = Math.min(w.maxStam, w.stam + dt * (1.3 + run.level('lungs') * 0.4))
        if (w.gassed && w.stam >= 3) w.gassed = false
        if (Math.floor(before) !== Math.floor(w.stam) && ph === 'play') pushHud()
      }
      // Knockdown count while mashing
      if (w.mashNeed > 0 && ph === 'play') {
        const prev = Math.ceil(w.mashT)
        w.mashT -= dt
        if (Math.ceil(w.mashT) !== prev) {
          fx.text(g.cx, g.H * 0.2, String(11 - prev), '#ffffff', 40)
          sfx.tick()
        }
        if (w.mashT <= 0) knockedOut()
      }
      w.hurt = Math.max(0, w.hurt - raw * 2)
    }
    const tx = w.evade === 'L' ? W * 0.17 : w.evade === 'R' ? -W * 0.17 : 0
    const ty = w.evade === 'duck' ? -H * 0.07 : 0
    w.camX = approach(w.camX, tx, 22, raw)
    w.camY = approach(w.camY, ty, 22, raw)

  }

  function frame({ ctx, w: W, h: H, raw, t: time }: Frame) {
    size.current = { w: W, h: H }
    const reps = import.meta.env.DEV ? devSpeed.current : 1
    for (let i = 0; i < reps; i++) simulate(raw)
    const w = world.current
    const ph = phaseRef.current
    const g = geo()

    // ── Draw ──
    const key = `${W}x${H}:${w.venue.id}`
    if (bgCache.current.key !== key) {
      const b = buildBg(W, H, w.venue)
      bgCache.current = { key, c: b.c }
    }
    fx.applyShake(ctx)
    const bg = bgCache.current.c
    if (bg) {
      const pad = 80
      ctx.drawImage(bg, -pad + w.camX * 0.5, -pad / 2 + w.camY * 0.5, W + pad * 2, H + pad)
    }
    // Spotlights
    glow(ctx, g.cx + w.camX, H * 0.25, W * 0.7, w.venue.spot, 0.16)
    for (let i = 0; i < 5; i++) {
      if (Math.random() < 0.04) {
        ctx.fillStyle = '#ffffff'
        ctx.globalAlpha = 0.8
        ctx.beginPath()
        ctx.arc(rand(0, W), rand(H * 0.1, H * 0.35), rand(1, 2.5), 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
    // Shadow under foe
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse(g.cx + w.camX, g.waist + w.camY + 70 * g.s, 110 * g.s, 22 * g.s, 0, 0, Math.PI * 2)
    ctx.fill()
    drawFoe(ctx, w, time)
    drawPlayer(ctx, w, time)
    // Red vignette when hurt or low
    const low = w.hp < w.max * 0.3 && ph === 'play'
    if (w.hurt > 0 || low) {
      const a = Math.max(w.hurt * 0.5, low ? 0.18 + Math.sin(time * 6) * 0.08 : 0)
      const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.7)
      vg.addColorStop(0, 'rgba(239,68,68,0)')
      vg.addColorStop(1, `rgba(239,68,68,${a})`)
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, W, H)
    }
    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="boxing-hud">
              <div className="boxing-side">
                <span className="boxing-name">YOU</span>
                <div className="boxing-bar boxing-bar--me">
                  <span style={{ width: `${hud.hp * 100}%` }} />
                </div>
                <div className={`boxing-bar boxing-bar--stam${hud.gassed ? ' is-gassed' : ''}`}>
                  <span style={{ width: `${hud.stam * 100}%` }} />
                </div>
                <span className="boxing-pips" aria-label="Your knockdowns">
                  {[0, 1, 2].map((i) => (
                    <i key={i} className={i < hud.downs ? 'is-on' : ''} />
                  ))}
                </span>
              </div>
              <div className="boxing-mid">
                <div className="boxing-score">{hud.score}</div>
                <div className="boxing-stars" aria-label="Star punches">
                  {[0, 1, 2].map((i) => (
                    <i key={i} className={i < hud.stars ? 'is-on' : ''} />
                  ))}
                </div>
              </div>
              <div className="boxing-side boxing-side--right">
                <span className="boxing-name">
                  {hud.stage}. {hud.name}
                </span>
                <div className="boxing-bar boxing-bar--foe">
                  <span style={{ width: `${hud.foeHp * 100}%` }} />
                </div>
                <span className="boxing-pips" aria-label="Rival knockdowns">
                  {[0, 1, 2].map((i) => (
                    <i key={i} className={i < hud.foeDowns ? 'is-on' : ''} />
                  ))}
                </span>
              </div>
            </div>
          )}
          {phase === 'play' && hud.mash >= 0 ? (
            <div className="boxing-mash">
              TAP TO GET UP!
              <div className="boxing-bar">
                <span style={{ width: `${hud.mash * 100}%` }} />
              </div>
            </div>
          ) : null}
          {banner && (phase === 'play' || phase === 'dying') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="boxing"
              icon={meta.icon}
              title={meta.title}
              hint="Tap left/right to jab. Swipe left/right to dodge, down to duck, up to uppercut. Read every wind-up!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.stage >= 3 ? 'Contender!' : 'Knocked out!'}
            subtitle={`Score ${hud.score} · Level ${hud.stage}`}
            celebrate={hud.stage >= 3}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
