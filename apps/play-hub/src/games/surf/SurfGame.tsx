import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, glow, rand } from '../../shared/action/fx'
import { useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { blit, buoySprite, coinSprite, drawGull, drawSurfer, finSprite, powerSprite, rockSprite, sharkSprite, type PowerKind } from './art'
import { drawBerg, drawEdgeWarn, drawKraken, drawPelican, drawReticle, drawTentacle, drawTentacleWarn, drawVolcano, drawWhirl, iceChunkSprite, jetskiSprite, pearlSprite } from './art2'
import '../../shared/action/action.css'
import './surf.css'

const meta = getGame('surf')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type ObKind = 'rock' | 'buoy' | 'surfer' | 'fin' | 'gull' | 'coin' | 'pearl' | 'whirl' | 'jetski' | 'pelican' | 'tentacle' | PowerKind
type EvKind = 'golden' | 'kraken'
const PICKS = new Set<ObKind>(['coin', 'pearl', 'shield', 'turbo', 'star', 'magnet'])

const PXM = 20
const TAU = Math.PI * 2
const BEST_KEY = 'todaypuzzle.surf.bestDist'

// jump: per-kind state timer · ax/ah: pelican aim point (ah = tentacle length) · bx: pelican dive start
type Ob = { kind: ObKind; x: number; h: number; vx: number; t: number; hit: boolean; jump: number; base: number; color: string; ax: number; ah: number; bx: number }
function mkOb(kind: ObKind, x: number, h: number, vx = 0, t = 0, color = ''): Ob {
  return { kind, x, h, vx, t, hit: false, jump: 0, base: h, color, ax: 0, ah: 0, bx: x }
}

type Biome = { name: string; sky0: string; sky1: string; deep: string; face0: string; face1: string; lip: string; fore: string; sun: string; night: boolean; rain: boolean; bg?: 'berg' | 'volcano'; amb?: 'snow' | 'ember' }
const BIOMES: Biome[] = [
  { name: 'Sunny Bay', sky0: '#38bdf8', sky1: '#e0f2fe', deep: '#075985', face0: '#0e7490', face1: '#5eead4', lip: '#ecfeff', fore: '#0c4a6e', sun: '#fde68a', night: false, rain: false },
  { name: 'Golden Hour', sky0: '#f97316', sky1: '#fde68a', deep: '#134e4a', face0: '#0f5d6e', face1: '#fbbf24', lip: '#fff7ed', fore: '#0f2f3a', sun: '#fef3c7', night: false, rain: false },
  { name: 'Tropic Reef', sky0: '#06b6d4', sky1: '#cffafe', deep: '#115e59', face0: '#0d9488', face1: '#99f6e4', lip: '#f0fdfa', fore: '#134e4a', sun: '#fef9c3', night: false, rain: false },
  { name: 'Arctic Floe', sky0: '#7dd3fc', sky1: '#f0f9ff', deep: '#0c4a6e', face0: '#155e75', face1: '#a5f3fc', lip: '#ffffff', fore: '#082f49', sun: '#ffffff', night: false, rain: false, bg: 'berg', amb: 'snow' },
  { name: 'Storm Swell', sky0: '#334155', sky1: '#94a3b8', deep: '#1e293b', face0: '#1e3a4c', face1: '#64748b', lip: '#e2e8f0', fore: '#0f172a', sun: '#cbd5e1', night: false, rain: true },
  { name: 'Lava Coast', sky0: '#431407', sky1: '#fb923c', deep: '#1c1917', face0: '#1f3a44', face1: '#ea580c', lip: '#fed7aa', fore: '#0c0a09', sun: '#fecaca', night: false, rain: false, bg: 'volcano', amb: 'ember' },
  { name: 'Moonlight Glow', sky0: '#0b1030', sky1: '#312e81', deep: '#020617', face0: '#082f49', face1: '#0e7490', lip: '#a5f3fc', fore: '#020617', sun: '#e0e7ff', night: true, rain: false },
]
const NPC_SUITS = ['#f43f5e', '#8b5cf6', '#22c55e', '#f59e0b']

type Surfer = {
  x: number
  h: number
  vup: number
  s: number
  air: boolean
  airT: number
  rot: number
  lives: number
  inv: number
  shield: boolean
  turbo: number
  crash: number
  tubeT: number
  tubeCounted: boolean
  magnet: number
}

type World = {
  sf: Surfer
  curlX: number
  obs: Ob[]
  nextSpawn: number
  nextPick: number
  combo: number
  bonus: number
  coinsGot: number
  biome: number
  setT: number
  setMul: number
  nextSet: number
  milestone: number
  bestDist: number
  bestPassed: boolean
  hudT: number
  lastTrack: number
  runT: number
  camK: number
  drops: { x: number; y: number }[]
  ev: EvKind | null
  evT: number
  evDur: number
  evSpawn: number
  evN: number
  nextEv: number
  evHurt: boolean
  god: boolean
  stats: { score: number; distance: number; tricks: number; barrels: number; coins: number }
}

/** Tentacle extension 0..1 over its life: warn, rise, hold, retract. */
function tentacleExt(t: number) {
  if (t < 1.1) return 0
  if (t < 1.35) return (t - 1.1) / 0.25
  if (t < 2.7) return 1
  if (t < 3) return 1 - (t - 2.7) / 0.3
  return 0
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function freshWorld(): World {
  const drops = []
  for (let i = 0; i < 50; i++) drops.push({ x: Math.random() * 500, y: Math.random() * 800 })
  return {
    sf: { x: 0, h: 60, vup: 0, s: 200, air: false, airT: 0, rot: 0, lives: 2, inv: 0, shield: false, turbo: 0, crash: 0, tubeT: 0, tubeCounted: false, magnet: 0 },
    curlX: -210,
    obs: [],
    nextSpawn: 500,
    nextPick: 300,
    combo: 0,
    bonus: 0,
    coinsGot: 0,
    biome: 0,
    setT: 0,
    setMul: 1,
    nextSet: 900,
    milestone: 250,
    bestDist: readBest(),
    bestPassed: false,
    hudT: 0,
    lastTrack: 0,
    runT: 0,
    camK: 0,
    drops,
    ev: null,
    evT: 0,
    evDur: 0,
    evSpawn: 0,
    evN: 0,
    nextEv: 1300,
    evHurt: false,
    god: false,
    stats: { score: 0, distance: 0, tricks: 0, barrels: 0, coins: 0 },
  }
}

export default function SurfGame() {
  const run = useActionRun('surf')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 620 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const holdRef = useRef(false)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, dist: 0, lives: 2, combo: 0, gap: 1, shield: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const faceH = Math.min(H * 0.4, 300) * world.current.setMul
    const trough = H * 0.8
    return { W, H, faceH, trough, lip: trough - faceH, sx: world.current.camK || W * 0.6 }
  }
  function scr(x: number, h: number) {
    const g = geo()
    return { x: g.sx + (x - world.current.sf.x), y: g.trough - h }
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.sf.lives = 2 + run.level('board')
    world.current = w
    fx.reset()
    holdRef.current = false
    run.begin()
    setPhaseBoth('play')
    say('PADDLE IN!', 'hold to carve up · release to drop')
    sfx.ready()
    pushHud()
  }

  function pushHud() {
    const w = world.current
    const gap = w.sf.x - w.curlX
    setHud({ score: w.stats.score, dist: Math.floor(w.sf.x / PXM), lives: w.sf.lives, combo: w.combo, gap: clamp(gap / 240, 0, 1), shield: w.sf.shield })
  }

  function spawn(x: number) {
    const w = world.current
    const g = geo()
    const d = x / PXM
    const r = Math.random()
    const add = (kind: ObKind, h: number, vx = 0, color = '') => w.obs.push(mkOb(kind, x, h, vx, rand(0, 6), color))
    if (w.obs.length > 70) return
    // events keep the face mostly clear so the event is the star
    if (w.ev && Math.random() < (w.ev === 'kraken' ? 0.65 : 0.75)) return
    // late-run hazards, each unlocked further out
    const r2 = Math.random()
    if (d > 1500 && r2 < 0.13) {
      w.obs.push(mkOb('whirl', x, g.faceH * rand(0.2, 0.6)))
      return
    }
    if (d > 2200 && r2 < 0.24) {
      w.obs.push(mkOb('jetski', x + 200, g.faceH * rand(0.2, 0.75)))
      return
    }
    if (d > 2900 && r2 < 0.34) {
      w.obs.push(mkOb('pelican', x, g.faceH + rand(110, 160), -50, rand(0, 6)))
      return
    }
    if (d < 120) {
      if (r < 0.5) add('buoy', g.faceH * rand(0.15, 0.5))
    } else if (r < 0.22) add('rock', 10)
    else if (r < 0.42) add('buoy', g.faceH * rand(0.15, 0.55))
    else if (r < 0.62 && d > 350) add('surfer', g.faceH * rand(0.25, 0.7), rand(90, 140), NPC_SUITS[Math.floor(Math.random() * NPC_SUITS.length)])
    else if (r < 0.8 && d > 650) add('fin', g.faceH * rand(0.1, 0.4), -rand(40, 90))
    else if (d > 950) add('gull', g.faceH + rand(40, 120), -rand(60, 110))
    else add('buoy', g.faceH * rand(0.2, 0.6))
  }

  function spawnPickups(x: number) {
    const w = world.current
    const g = geo()
    const r = Math.random()
    const d = x / PXM
    if (w.obs.length > 80) return
    if (r < 0.55) {
      // coin wave along the face
      const ph = rand(0, TAU)
      for (let i = 0; i < 8; i++) w.obs.push(mkOb('coin', x + i * 34, g.faceH * (0.45 + Math.sin(ph + i * 0.6) * 0.3), 0, i * 0.3))
    } else if (r < 0.8) {
      // coin arc above the lip: rewards launching; rare pearl at the apex later on
      const pearl = d > 1000 && Math.random() < 0.25
      for (let i = 0; i < 7; i++) w.obs.push(mkOb(pearl && i === 3 ? 'pearl' : 'coin', x + i * 34, g.faceH + 30 + Math.sin((i / 6) * Math.PI) * 80, 0, i * 0.3))
    } else {
      const kinds: PowerKind[] = d > 800 ? ['shield', 'turbo', 'star', 'magnet'] : ['shield', 'turbo', 'star']
      w.obs.push(mkOb(kinds[Math.floor(Math.random() * kinds.length)], x, g.faceH * rand(0.3, 0.8)))
    }
  }

  function pearlTrail(x: number, n: number) {
    const w = world.current
    const g = geo()
    for (let i = 0; i < n; i++) w.obs.push(mkOb('pearl', x + i * 46, g.faceH * (0.35 + 0.4 * Math.abs(Math.sin(i * 0.9))), 0, i * 0.3))
  }

  function sting(kind: EvKind) {
    if (kind === 'kraken') {
      sfx.boom(0.9)
      window.setTimeout(() => sfx.hurt(), 160)
      window.setTimeout(() => sfx.clang(), 420)
      window.setTimeout(() => sfx.boom(0.5), 700)
    } else {
      sfx.win()
      window.setTimeout(() => sfx.power(), 260)
      window.setTimeout(() => sfx.combo(), 520)
    }
  }

  function startEvent(kind: EvKind) {
    const w = world.current
    w.ev = kind
    w.evT = 0
    w.evDur = kind === 'kraken' ? 18 : 12
    w.evSpawn = kind === 'kraken' ? 2.2 : 0.2
    w.evHurt = false
    w.evN += 1
    sting(kind)
    haptic.heavy()
    if (kind === 'kraken') {
      say('KRAKEN!', 'dodge the tentacles')
      fx.shake(12, 0.8)
      fx.flash('#7e22ce', 0.25)
    } else {
      say('GOLDEN SWELL', 'coin frenzy')
      fx.flash('#facc15', 0.2)
    }
  }

  function endEvent() {
    const w = world.current
    const sf = w.sf
    const kind = w.ev
    w.ev = null
    const d = sf.x / PXM
    w.nextEv = d + rand(1100, 1400)
    const p = scr(sf.x, sf.h)
    if (kind === 'kraken') {
      const clean = !w.evHurt
      const pts = clean ? 2500 : 1500
      w.bonus += pts
      pearlTrail(sf.x + 380, clean ? 6 : 4)
      say('ESCAPED!', `kraken · +${pts}${clean ? ' flawless' : ''}`)
      sfx.win()
      window.setTimeout(() => sfx.levelUp(), 300)
      haptic.success()
      fx.burst(p.x, p.y, { count: 36, color: ['#e9d5ff', '#c084fc', '#fde047', '#ffffff'], speed: 320, gravity: 200 })
      fx.slowmo(0.4, 0.5)
      void trackEvent('action_milestone', { game_id: 'surf', kind: 'boss', value: w.evN })
    } else {
      w.bonus += 600
      pearlTrail(sf.x + 380, 2)
      say('GOLD RUSH!', '+600 bonus')
      sfx.levelUp()
      haptic.success()
      fx.burst(p.x, p.y, { count: 24, color: ['#fde047', '#facc15', '#ffffff'], speed: 260, gravity: 200 })
    }
    pushHud()
  }

  function spawnTentacle() {
    const w = world.current
    const g = geo()
    const sf = w.sf
    // either rises from the trough (ride high) or from the upper face (ride low)
    const low = Math.random() < 0.6
    const o = mkOb('tentacle', sf.x + clamp(sf.s * rand(1.05, 1.35), 220, 560), low ? 0 : g.faceH * rand(0.4, 0.5))
    o.ah = low ? g.faceH * rand(0.45, 0.62) : g.faceH * rand(0.4, 0.55)
    o.color = String(rand(0, 6))
    w.obs.push(o)
  }

  function hurt(what: string) {
    const w = world.current
    const sf = w.sf
    if (sf.inv > 0 || sf.crash > 0 || w.god) return
    const p = scr(sf.x, sf.h)
    if (w.ev) w.evHurt = true
    if (sf.shield) {
      sf.shield = false
      sf.inv = 1.2
      fx.ring(p.x, p.y, { color: '#38bdf8', maxR: 60, life: 0.4, width: 4 })
      fx.text(p.x, p.y - 40, 'SHIELD!', '#bae6fd', 18)
      sfx.clang()
      haptic.medium()
      pushHud()
      return
    }
    sf.lives -= 1
    sf.crash = 1.1
    sf.air = false
    sf.rot = 0
    w.combo = 0
    sf.tubeT = 0
    fx.burst(p.x, p.y, { count: 26, color: ['#ffffff', '#a5f3fc', '#67e8f9'], speed: 260, gravity: 400 })
    fx.text(p.x, p.y - 40, what, '#fecaca', 20)
    fx.shake(10, 0.35)
    fx.stop(0.08)
    fx.flash('#ef4444', 0.22)
    sfx.hurt()
    sfx.thud()
    haptic.heavy()
    pushHud()
    if (sf.lives <= 0) die(false)
  }

  function die(curl: boolean) {
    const w = world.current
    setPhaseBoth('dying')
    fx.slowmo(1, 0.35)
    fx.shake(14, 0.5)
    sfx.lose()
    haptic.error()
    if (curl) {
      const p = scr(w.sf.x, w.sf.h)
      fx.burst(p.x, p.y, { count: 40, color: ['#ffffff', '#e0f2fe', '#a5f3fc'], speed: 340, size: 5, gravity: 300 })
      sfx.boom(0.6)
      fx.flash('#ffffff', 0.4)
    }
    const dist = Math.floor(w.sf.x / PXM)
    w.stats.score = dist + w.bonus
    pushHud()
    if (dist > w.bestDist) {
      try {
        localStorage.setItem(BEST_KEY, String(dist))
      } catch {
        // storage unavailable
      }
    }
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.coinsGot + dist / 100 + w.stats.barrels * 2)
      run.end({ score: w.stats.score, cleared: dist >= 1000, stats: { ...w.stats }, coins }, revive)
    }, 1200)
  }

  function revive() {
    const w = world.current
    const sf = w.sf
    const g = geo()
    sf.lives = Math.max(1, sf.lives)
    sf.crash = 0
    sf.air = false
    sf.rot = 0
    sf.h = g.faceH * 0.5
    sf.vup = 0
    sf.inv = 2.5
    sf.s = Math.max(sf.s, 260)
    w.curlX = sf.x - 340
    w.obs = w.obs.filter((o) => PICKS.has(o.kind) || o.x < sf.x - 100 || o.x > sf.x + 420)
    const p = scr(sf.x, sf.h)
    fx.ring(p.x, p.y, { color: '#fde047', maxR: 100, life: 0.6, width: 5 })
    say('REVIVED!', 'back on the wave')
    pushHud()
    setPhaseBoth('play')
  }

  function land() {
    const w = world.current
    const sf = w.sf
    const p = scr(sf.x, sf.h)
    const rot = ((sf.rot % TAU) + TAU) % TAU
    const dev = Math.min(rot, TAU - rot)
    const tol = 0.85 + run.level('wax') * 0.12
    const flips = Math.round(Math.abs(sf.rot) / TAU)
    sf.air = false
    if (dev > tol) {
      sf.rot = 0
      if (w.runT < 20) {
        // learning window: sloppy landings are free early on
        w.combo = 0
        sf.s *= 0.85
        fx.text(p.x, p.y - 40, 'SLOPPY! let go to land', '#fde68a', 16)
        fx.burst(p.x, p.y, { count: 14, color: ['#ffffff', '#a5f3fc'], speed: 180, gravity: 400 })
        sfx.miss()
        return
      }
      hurt('WIPEOUT!')
      return
    }
    sf.rot = 0
    w.combo += 1
    const mult = Math.min(5, w.combo)
    const pts = Math.round((40 + sf.airT * 90 + flips * 260) * (1 + run.level('wax') * 0.15) * mult)
    w.bonus += pts
    if (flips > 0) w.stats.tricks += 1
    const name = flips === 0 ? 'AIR' : flips === 1 ? 'FLIP' : flips === 2 ? 'DOUBLE FLIP' : `${flips}x FLIP`
    fx.text(p.x, p.y - 50, `${name}! +${pts}`, flips ? '#fde047' : '#e0f2fe', flips ? 22 : 16)
    fx.burst(p.x, p.y, { count: flips ? 26 : 12, color: ['#ffffff', '#a5f3fc', '#fde047'], speed: 240, gravity: 350 })
    fx.ring(p.x, p.y, { color: flips ? '#fde047' : '#ffffff', maxR: 50, life: 0.35 })
    sf.vup = Math.min(sf.vup, -200)
    if (flips) {
      sfx.combo()
      haptic.success()
      if (flips >= 2) {
        say(name + '!', `x${mult}`)
        fx.slowmo(0.25, 0.5)
      }
    } else {
      sfx.score(w.combo)
      haptic.light()
    }
    run.update(w.stats)
  }

  function collect(o: Ob) {
    const w = world.current
    const sf = w.sf
    const p = scr(o.x, o.h)
    o.hit = true
    if (o.kind === 'pearl') {
      w.coinsGot += 3
      w.stats.coins += 3
      w.bonus += 150
      fx.burst(p.x, p.y, { count: 12, color: ['#fce7f3', '#c4b5fd', '#ffffff'], speed: 160, gravity: 0 })
      fx.ring(p.x, p.y, { color: '#f9a8d4', maxR: 34, life: 0.3 })
      fx.text(p.x, p.y - 26, 'PEARL +150', '#fbcfe8', 15)
      sfx.score(4)
      haptic.light()
      return
    }
    if (o.kind === 'coin') {
      w.coinsGot += 1
      w.stats.coins += 1
      w.bonus += 10
      fx.burst(p.x, p.y, { count: 6, color: ['#fde047', '#facc15', '#fff7ed'], speed: 120, gravity: 0 })
      sfx.pop()
      return
    }
    if (o.kind === 'shield') {
      sf.shield = true
      fx.text(p.x, p.y - 30, 'SHIELD', '#bae6fd', 18)
    } else if (o.kind === 'turbo') {
      sf.turbo = 3
      fx.text(p.x, p.y - 30, 'TURBO!', '#fdba74', 18)
      fx.flash('#f97316', 0.15)
    } else if (o.kind === 'magnet') {
      sf.magnet = 8
      fx.text(p.x, p.y - 30, 'MAGNET!', '#fda4af', 18)
    } else {
      w.bonus += 250
      fx.text(p.x, p.y - 30, 'STAR +250', '#fde047', 18)
    }
    fx.ring(p.x, p.y, { color: '#ffffff', maxR: 46 })
    sfx.power()
    haptic.medium()
    pushHud()
  }

  function update(dt: number, raw: number) {
    const w = world.current
    const sf = w.sf
    const g = geo()
    const ph = phaseRef.current
    const live = ph === 'play'
    const demo = ph === 'idle'
    const d = sf.x / PXM
    if (live) w.runT += dt

    // big sets every so often
    if (live && d > w.nextSet && w.setT <= 0) {
      w.setT = 22
      w.nextSet = d + rand(700, 1000)
      say('BIG SET!', 'bigger face · bigger air')
      sfx.boom(0.4)
    }
    if (w.setT > 0) w.setT -= dt
    w.setMul = approach(w.setMul, w.setT > 0 ? 1.18 : 1, 0.8, dt)

    // special events: golden swell first, then the kraken, alternating
    if (live && !w.ev && d > w.nextEv) startEvent(w.evN % 2 === 0 ? 'golden' : 'kraken')
    if (w.ev) {
      if (live) w.evT += dt
      w.evSpawn -= dt
      if (w.evT >= w.evDur && live) endEvent()
      else if (w.evSpawn <= 0 && live) {
        if (w.ev === 'kraken') {
          spawnTentacle()
          // later krakens attack a bit faster
          w.evSpawn = Math.max(0.85, rand(1.3, 1.7) - w.evN * 0.05)
        } else {
          spawnPickups(sf.x + g.W - g.sx + 40)
          w.evSpawn = rand(0.35, 0.55)
        }
      }
    }

    // curl speed ramps up; early on you outrun it without trying
    const curlV = 160 + Math.min(180, d * 0.085)
    const fins = 1 + run.level('fins') * 0.06
    const sNat = 205 * fins
    const sMax = 480 * fins

    let hold = holdRef.current && live
    if (demo) {
      // attract: pump rhythmically and launch now and then
      hold = Math.sin(performance.now() / 420) > -0.1 || sf.h < g.faceH * 0.2
    }

    if (sf.crash > 0) {
      sf.crash -= dt
      sf.h = approach(sf.h, g.faceH * 0.25, 4, dt)
      sf.vup = 0
      sf.s = Math.max(sf.s * (1 - 0.3 * dt), curlV + 30)
      if (sf.crash <= 0 && live) sf.inv = 1.5
    } else if (ph === 'dying' || ph === 'over') {
      sf.s = approach(sf.s, curlV * 0.5, 2, dt)
      sf.vup = approach(sf.vup, 0, 3, dt)
      sf.h = approach(sf.h, g.faceH * 0.2, 2, dt)
      sf.air = false
    } else if (sf.air) {
      sf.airT += dt
      sf.vup -= 1250 * dt
      sf.h += sf.vup * dt
      if (hold) sf.rot -= 7.2 * dt
      else {
        // let go: ease toward the nearest upright angle
        const nearest = Math.round(sf.rot / TAU) * TAU
        sf.rot = approach(sf.rot, nearest, 4, dt)
      }
      if (sf.h <= g.faceH && sf.vup < 0) {
        sf.h = g.faceH - 2
        if (live) land()
        else {
          sf.air = false
          sf.rot = 0
        }
      }
    } else {
      sf.vup += (hold ? 1500 : -1350) * dt
      sf.vup = clamp(sf.vup, -580, 540)
      sf.h += sf.vup * dt
      // pumping: dropping converts height into speed
      const pump = sf.vup < 0 ? -sf.vup * 0.62 : -sf.vup * 0.36
      sf.s += ((sNat - sf.s) * 0.35 + pump * fins) * dt
      if (sf.h <= 0) {
        sf.h = 0
        sf.vup = Math.max(0, sf.vup)
        sf.s -= sf.s * 0.45 * dt
      }
      if (sf.h >= g.faceH) {
        if (sf.vup > 140) {
          sf.air = true
          sf.airT = 0
          sf.vup = sf.vup * 1.08 + 60
          sf.rot = 0
          if (live) {
            sfx.whoosh()
            const p = scr(sf.x, sf.h)
            fx.burst(p.x, p.y, { count: 14, color: ['#ffffff', '#ecfeff'], speed: 200, angle: -Math.PI / 2, spread: 1.4, gravity: 400 })
          }
        } else {
          sf.h = g.faceH
          sf.vup = 0
        }
      }
    }
    if (sf.turbo > 0) {
      sf.turbo -= dt
      sf.s = Math.max(sf.s, curlV + 160)
    }
    sf.s = clamp(sf.s, 90, sMax + (sf.turbo > 0 ? 120 : 0))
    sf.inv = Math.max(0, sf.inv - dt)
    sf.magnet = Math.max(0, sf.magnet - dt)
    sf.x += sf.s * dt
    w.curlX += curlV * dt
    // don't let the curl fall absurdly far behind
    // rubber band: the curl never falls far behind
    const lead = sf.x - w.curlX
    if (lead > 240) w.curlX += (lead - 240) * 0.9 * dt
    w.camK = approach(w.camK, clamp(lead * 0.8 + 50, g.W * 0.4, g.W * 0.72), 2, raw)
    if (demo && sf.x - w.curlX < 200) w.curlX = sf.x - 200

    // spray trail
    if (!sf.air && sf.crash <= 0 && Math.random() < 0.8) {
      const p = scr(sf.x - 18, sf.h)
      fx.burst(p.x, p.y + 2, { count: 1, color: ['#ffffff', '#ecfeff', '#a5f3fc'], speed: 90 + Math.abs(sf.vup) * 0.2, angle: Math.PI + (sf.vup > 0 ? 0.6 : -0.3), spread: 0.6, size: 3, life: 0.45, gravity: 380 })
    }
    // curl spray
    if (Math.random() < 0.9) {
      const cx = scr(w.curlX, 0).x
      if (cx > -60 && cx < g.W + 60) fx.burst(cx + rand(-10, 30), g.lip + rand(0, g.faceH * 0.6), { count: 1, color: ['#ffffff', '#e0f2fe'], speed: 220, angle: -Math.PI / 2 - 0.4, spread: 1.2, size: 4, life: 0.7, gravity: 300 })
    }

    const gap = sf.x - w.curlX
    if (live) {
      // tube riding
      if (gap > 0 && gap < 130 && !sf.air && sf.h > g.faceH * 0.3 && sf.h < g.faceH * 0.95 && sf.crash <= 0) {
        sf.tubeT += dt
        w.bonus += Math.round(150 * dt)
        if (sf.tubeT > 1.1 && !sf.tubeCounted) {
          sf.tubeCounted = true
          w.stats.barrels += 1
          w.bonus += 400
          say('BARREL!', '+400 · get out!')
          sfx.win()
          haptic.success()
          const p = scr(sf.x, sf.h)
          fx.burst(p.x, p.y, { count: 30, color: ['#ffffff', '#5eead4', '#fde047'], speed: 280, gravity: 200 })
          run.update(w.stats)
        }
      } else {
        sf.tubeT = 0
        sf.tubeCounted = false
      }
      if (gap <= 0) {
        if (w.god) w.curlX = sf.x - 200
        else if (sf.shield) {
          sf.shield = false
          w.curlX = sf.x - 160
          sf.inv = 1.2
          const p = scr(sf.x, sf.h)
          fx.ring(p.x, p.y, { color: '#38bdf8', maxR: 70 })
          fx.text(p.x, p.y - 40, 'SHIELD SAVE!', '#bae6fd', 18)
          sfx.clang()
        } else {
          sf.lives = 0
          const p = scr(sf.x, sf.h)
          fx.text(p.x, p.y - 50, 'CLOSED OUT!', '#ffffff', 24)
          die(true)
          return
        }
      }
    }

    // biome & milestones
    if (live) {
      const bi = Math.floor(d / 700) % BIOMES.length
      if (bi !== w.biome) {
        w.biome = bi
        say(BIOMES[bi].name.toUpperCase(), `${Math.floor(d)} m`)
        sfx.levelUp()
      }
      if (d >= w.milestone) {
        const p = scr(sf.x, sf.h)
        fx.text(p.x, p.y - 80, `${w.milestone} m`, '#fde68a', 20)
        sfx.score(3)
        if (w.milestone % 500 === 0) say(`${w.milestone} M`)
        if (w.milestone % 1000 === 0 && performance.now() - w.lastTrack > 30000) {
          w.lastTrack = performance.now()
          void trackEvent('action_milestone', { game_id: 'surf', kind: 'distance', value: w.milestone })
        }
        w.milestone += 250
      }
      if (!w.bestPassed && w.bestDist > 100 && d > w.bestDist) {
        w.bestPassed = true
        const p = scr(sf.x, sf.h)
        fx.text(p.x, p.y - 100, 'NEW BEST!', '#fde047', 26)
        sfx.win()
        haptic.success()
      }
    } else if (demo) w.biome = 0

    // spawning
    const ahead = sf.x + g.W
    if (ahead > w.nextSpawn) {
      if (live || demo) spawn(w.nextSpawn)
      w.nextSpawn += rand(260, 420) - Math.min(140, d * 0.05)
    }
    if (ahead > w.nextPick) {
      spawnPickups(w.nextPick)
      w.nextPick += rand(380, 620)
    }

    // obstacles
    for (const o of w.obs) {
      o.t += dt
      o.x += o.vx * dt
      if (o.kind === 'buoy') o.h = o.base + Math.sin(o.t * 2) * 6
      else if (o.kind === 'surfer') o.h = clamp(o.base + Math.sin(o.t * 1.3) * g.faceH * 0.2, 10, g.faceH * 0.9)
      else if (o.kind === 'fin' && d > 1100) {
        // later sharks leap out at you
        const dx = o.x - sf.x
        if (o.jump === 0 && dx > 0 && dx < 230) o.jump = 0.0001
        if (o.jump > 0) {
          o.jump += dt
          const tt = o.jump - 0.5
          if (tt > 0) {
            const k = tt / 1.0
            o.h = o.base + Math.sin(Math.min(1, k) * Math.PI) * (g.faceH * 0.9)
            o.vx = -200
            if (k > 1) o.jump = -1
          }
        }
      } else if (o.kind === 'whirl') {
        // calm ripple until you get close, then it spins open
        const dx = o.x - sf.x
        if (o.jump === 0 && dx > 0 && dx < 340) o.jump = 0.0001
        if (o.jump > 0) o.jump += dt
        if (o.jump > 0.9 && live && !sf.air && sf.crash <= 0 && Math.abs(dx) < 110) {
          const dh = o.h - sf.h
          sf.h += Math.sign(dh) * Math.min(Math.abs(dh), 120 * dt * (1 - Math.abs(dx) / 110))
        }
      } else if (o.kind === 'jetski') {
        // warning at the right edge, then it rips across the face
        o.jump += dt
        if (o.jump < 1.3) o.x = sf.x + (g.W - g.sx) + 60
        else o.vx = -230
        o.h = o.base + Math.sin(o.t * 5) * 4
        if (o.jump >= 1.3 && o.jump - dt < 1.3 && live) sfx.whoosh()
      } else if (o.kind === 'pelican') {
        // swoops in high, locks a target height (reticle), then dives through it
        const dx = o.x - sf.x
        const perch = g.W - g.sx - 50
        if (o.jump === 0) {
          o.h = o.base + Math.sin(o.t * 1.5) * 8
          if (dx > 0 && dx < perch + 260 && live) {
            o.jump = 0.0001
            o.vx = 0
            o.ax = sf.x + sf.s * 1.3
            o.ah = clamp(sf.h, g.faceH * 0.15, g.faceH * 0.85)
            sfx.tick()
          }
        } else {
          o.jump += dt
          if (o.jump <= 0.9) {
            const k = o.jump / 0.9
            o.x = sf.x + perch + (1 - k) * (1 - k) * 160
            o.h = o.base + Math.sin(o.t * 1.5) * 8
            o.bx = o.x
          } else if (o.jump <= 1.35) {
            const k = (o.jump - 0.9) / 0.45
            if (o.jump - dt <= 0.9) o.base = o.h
            o.x = o.bx + (o.ax - o.bx) * k
            o.h = o.base + (o.ah - o.base) * k * k
            if (o.jump - dt <= 0.9 && live) sfx.whoosh()
          } else {
            o.vx = -140
            o.h += 260 * dt
          }
        }
      } else if (o.kind === 'tentacle') {
        if (o.jump === 0 && o.t > 1.1) {
          o.jump = 1
          if (live) {
            const p = scr(o.x, o.base)
            fx.burst(p.x, p.y, { count: 14, color: ['#ffffff', '#e9d5ff', '#a5f3fc'], speed: 220, angle: -Math.PI / 2, spread: 1.2, gravity: 420 })
            sfx.slash()
            fx.shake(4, 0.15)
          }
        }
      } else if (sf.magnet > 0 && (o.kind === 'coin' || o.kind === 'pearl') && !o.hit) {
        const dx = sf.x - o.x
        const dh = sf.h - o.h
        if (dx * dx + dh * dh < 190 * 190) {
          o.x += dx * Math.min(1, 7 * dt)
          o.h += dh * Math.min(1, 7 * dt)
        }
      }
      if (o.hit || !live || sf.crash > 0) continue
      const dx = o.x - sf.x
      const dh = o.h - sf.h
      if (Math.abs(dx) > 40) continue
      if (o.kind === 'tentacle') {
        const ext = tentacleExt(o.t)
        if (ext > 0.5 && Math.abs(dx) < 20 && sf.h > o.base - 8 && sf.h < o.base + o.ah * ext && sf.inv <= 0) {
          o.hit = true
          hurt('TENTACLE!')
          if (phaseRef.current !== 'play') return
        }
        continue
      }
      if (o.kind === 'whirl' && o.jump < 1.1) continue
      if (o.kind === 'jetski' && o.jump < 1.3) continue
      if (o.kind === 'pelican' && !(o.jump > 0.9 && o.jump < 1.6)) continue
      const r = o.kind === 'rock' ? 30 : o.kind === 'coin' ? 18 : o.kind === 'surfer' ? 20 : o.kind === 'gull' ? 16 : o.kind === 'fin' ? (o.jump > 0.5 ? 26 : 16) : o.kind === 'buoy' ? 16 : o.kind === 'whirl' ? 22 : 20
      if (dx * dx + dh * dh < r * r) {
        if (PICKS.has(o.kind)) collect(o)
        else if (sf.inv <= 0) {
          o.hit = true
          hurt(o.kind === 'rock' ? 'ROCK!' : o.kind === 'fin' ? 'SHARK!' : o.kind === 'gull' ? 'GULL!' : o.kind === 'surfer' ? 'COLLISION!' : o.kind === 'whirl' ? 'WHIRLPOOL!' : o.kind === 'jetski' ? 'JET-SKI!' : o.kind === 'pelican' ? 'PELICAN!' : 'BUOY!')
          if (phaseRef.current !== 'play') return
        }
      }
    }
    w.obs = w.obs.filter((o) => o.x > sf.x - g.sx - 120 && !(o.hit && PICKS.has(o.kind)) && !(o.kind === 'tentacle' && o.t > 3.05))

    if (live) {
      w.stats.distance = Math.floor(d)
      w.stats.score = Math.floor(d) + w.bonus
      w.hudT -= raw
      if (w.hudT <= 0) {
        w.hudT = 0.1
        pushHud()
        run.update(w.stats)
      }
    }
  }

  // ── Drawing ───────────────────────────────────────────
  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    update(dt, raw)
    const g = geo()
    const sf = w.sf
    const b = BIOMES[w.biome]

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, g.trough)
    sky.addColorStop(0, b.sky0)
    sky.addColorStop(1, b.sky1)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)
    glow(ctx, W * 0.8, H * 0.14, 90, b.sun, 0.6)
    ctx.fillStyle = b.sun
    ctx.beginPath()
    ctx.arc(W * 0.8, H * 0.14, b.night ? 18 : 26, 0, Math.PI * 2)
    ctx.fill()
    if (b.night) {
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 30; i++) {
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + i)
        ctx.fillRect((i * 97) % W, (i * 53) % (H * 0.3), 2, 2)
      }
      ctx.globalAlpha = 1
    }
    // clouds (parallax)
    ctx.fillStyle = b.rain ? 'rgba(71,85,105,0.7)' : 'rgba(255,255,255,0.75)'
    for (let i = 0; i < 4; i++) {
      const cx = (((i * 260 - sf.x * 0.05) % (W + 240)) + W + 240) % (W + 240) - 120
      const cy = H * (0.08 + (i % 3) * 0.06)
      ctx.beginPath()
      ctx.ellipse(cx, cy, 50, 14, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 26, cy - 8, 30, 14, 0, 0, Math.PI * 2)
      ctx.ellipse(cx - 24, cy - 4, 24, 10, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    const ix = (((600 - sf.x * 0.1) % (W + 400)) + W + 400) % (W + 400) - 200
    if (b.bg === 'berg') {
      // far ice shelf + two icebergs at different depths
      ctx.fillStyle = 'rgba(186,230,253,0.7)'
      ctx.fillRect(0, g.lip - 14, W, 14)
      // two copies half a period apart so a berg is always in view
      const span = W + 160
      ctx.globalAlpha = 0.6
      for (let i = 0; i < 2; i++) drawBerg(ctx, ((((i * span) / 2 + 200 - sf.x * 0.05) % span) + span) % span - 80, g.lip - 8, 0.8)
      ctx.globalAlpha = 1
      for (let i = 0; i < 2; i++) drawBerg(ctx, ((((i * span) / 2 - sf.x * 0.1) % span) + span) % span - 80, g.lip - 2, 1.2)
    } else if (b.bg === 'volcano') {
      const span = W + 260
      const vx = ((((W * 0.6) - sf.x * 0.03) % span) + span) % span - 130
      drawVolcano(ctx, vx, g.lip - 2, 1.1, t)
      ctx.fillStyle = 'rgba(28,25,23,0.75)'
      ctx.beginPath()
      ctx.moveTo(ix - 140, g.lip - 4)
      ctx.quadraticCurveTo(ix - 60, g.lip - 40, ix, g.lip - 30)
      ctx.quadraticCurveTo(ix + 70, g.lip - 50, ix + 140, g.lip - 4)
      ctx.fill()
    } else {
      // distant island
      ctx.fillStyle = b.night ? '#0b1224' : 'rgba(15,60,70,0.45)'
      ctx.beginPath()
      ctx.moveTo(ix - 120, g.lip - 6)
      ctx.quadraticCurveTo(ix - 40, g.lip - 70, ix + 10, g.lip - 50)
      ctx.quadraticCurveTo(ix + 60, g.lip - 80, ix + 130, g.lip - 6)
      ctx.fill()
    }
    if (w.ev === 'kraken') {
      const rise = clamp(w.evT / 1.5, 0, 1) * clamp((w.evDur - w.evT) / 1.2, 0, 1)
      drawKraken(ctx, W * 0.66, g.lip + 4, 1.1, t, rise)
    }

    fx.applyShake(ctx)
    const curlSx = scr(w.curlX, 0).x
    const lipK = (x: number) => (x < g.sx + 30 ? 1 + clamp((g.sx + 30 - x) / 400, 0, 0.1) : 1 - clamp((x - g.sx - 30) / (g.W - g.sx), 0, 1) * 0.28)
    const lipY = (x: number) => g.trough - g.faceH * lipK(x) + Math.sin((x + sf.x) * 0.018 + t * 2) * 3

    // wave face
    const face = ctx.createLinearGradient(0, g.lip, 0, g.trough)
    face.addColorStop(0, b.face1)
    face.addColorStop(0.35, b.face0)
    face.addColorStop(1, b.deep)
    ctx.fillStyle = face
    ctx.beginPath()
    ctx.moveTo(curlSx - 40, g.trough + 4)
    for (let x = curlSx - 40; x <= W + 10; x += 12) ctx.lineTo(x, lipY(x))
    ctx.lineTo(W + 10, g.trough + 4)
    ctx.closePath()
    ctx.fill()
    // face texture: streaks flowing past
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'
    ctx.lineWidth = 2
    for (let i = 0; i < 9; i++) {
      const hy = g.lip + 18 + i * (g.faceH / 9)
      const off = ((sf.x * (0.8 + i * 0.05) + i * 70) % 160)
      for (let x = -off; x < W; x += 160) {
        if (x < curlSx) continue
        ctx.beginPath()
        ctx.moveTo(x, hy)
        ctx.quadraticCurveTo(x + 30, hy - 3, x + 70, hy + 1)
        ctx.stroke()
      }
    }
    if (w.ev === 'golden') {
      // golden swell: gilded face + glitter
      const k = clamp(w.evT / 0.8, 0, 1) * clamp((w.evDur - w.evT) / 0.8, 0, 1)
      const gold = ctx.createLinearGradient(0, g.lip, 0, g.trough)
      gold.addColorStop(0, 'rgba(254,240,138,0.75)')
      gold.addColorStop(0.4, 'rgba(250,204,21,0.35)')
      gold.addColorStop(1, 'rgba(202,138,4,0.1)')
      ctx.globalAlpha = k
      ctx.fillStyle = gold
      ctx.beginPath()
      ctx.moveTo(curlSx - 40, g.trough + 4)
      for (let x = curlSx - 40; x <= W + 10; x += 24) ctx.lineTo(x, lipY(x))
      ctx.lineTo(W + 10, g.trough + 4)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fef9c3'
      for (let i = 0; i < 26; i++) {
        const x = ((i * 83 - sf.x * 0.85) % W + W) % W
        if (x < curlSx) continue
        const y = g.lip + 16 + ((i * 41) % Math.max(1, g.faceH - 16))
        ctx.globalAlpha = k * (0.5 + 0.5 * Math.sin(t * 6 + i * 1.7))
        ctx.fillRect(x - 1, y - 3, 2, 6)
        ctx.fillRect(x - 3, y - 1, 6, 2)
      }
      ctx.globalAlpha = 1
    }
    if (b.night) {
      // bioluminescent sparkles on the face
      for (let i = 0; i < 24; i++) {
        const x = ((i * 71 - sf.x * 0.9) % W + W) % W
        if (x < curlSx) continue
        const y = g.lip + 20 + ((i * 37) % Math.max(1, g.faceH - 20))
        ctx.fillStyle = '#5eead4'
        ctx.globalAlpha = 0.4 + 0.5 * Math.sin(t * 3 + i)
        ctx.fillRect(x, y, 2.5, 2.5)
      }
      ctx.globalAlpha = 1
    }
    // lip foam line
    ctx.strokeStyle = b.lip
    ctx.lineWidth = 5
    ctx.beginPath()
    for (let x = curlSx; x <= W + 10; x += 10) {
      const y = lipY(x)
      if (x === curlSx) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.fillStyle = b.lip
    for (let x = curlSx + 6; x < W; x += 22) {
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.arc(x + ((sf.x * 0.7) % 22), lipY(x) - 2, 2.5 + Math.sin(x + t * 4), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // face obstacles (behind surfer)
    for (const o of w.obs) {
      if (o.kind === 'pelican') {
        if (o.jump > 0 && o.jump < 1.35 && !o.hit) {
          const rp = scr(o.ax, o.ah)
          rp.x = Math.min(rp.x, W - 26)
          if (rp.x > -40) drawReticle(ctx, rp.x, Math.max(rp.y, lipY(rp.x) + 12), t, o.jump / 1.35)
        }
        continue
      }
      if (o.kind === 'tentacle') {
        const pb = scr(o.x, o.base)
        pb.y = Math.max(pb.y, lipY(pb.x) + 12)
        if (pb.x < -60 || pb.x > W + 60) continue
        if (o.t < 1.1) drawTentacleWarn(ctx, pb.x, pb.y, o.ah, t, o.t / 1.1)
        else drawTentacle(ctx, pb.x, pb.y, o.ah * tentacleExt(o.t), t, Number(o.color))
        continue
      }
      const p = scr(o.x, o.h)
      if (o.kind !== 'fin' || o.jump <= 0.5) p.y = Math.max(p.y, lipY(p.x) + 12)
      if (p.x < -60 || p.x > W + 60) continue
      if (o.kind === 'whirl') drawWhirl(ctx, p.x, p.y, t + o.t, clamp((o.jump - 0.9) / 0.3, 0, 1), o.jump > 0 && o.jump < 1.2 ? o.jump / 1.2 : 0)
      else if (o.kind === 'jetski') {
        if (o.jump >= 1.3) {
          blit(ctx, jetskiSprite(), p.x, p.y - 8, 70, 44, Math.sin(o.t * 5) * 0.05)
          if (Math.random() < 0.7) fx.burst(p.x + 30, p.y + 6, { count: 1, color: ['#ffffff', '#e0f2fe'], speed: 140, angle: -0.5, spread: 0.6, size: 3, life: 0.4, gravity: 400 })
        }
      } else if (o.kind === 'rock') blit(ctx, rockSprite(), p.x, g.trough - 8, 60, 40)
      else if (o.kind === 'buoy') blit(ctx, buoySprite(), p.x, p.y, 28, 40, Math.sin(o.t * 2) * 0.15)
      else if (o.kind === 'fin') {
        if (o.jump > 0 && o.jump < 0.5) {
          // telegraph: churning water
          fx.burst(p.x, p.y, { count: 1, color: ['#ffffff', '#fecaca'], speed: 100, angle: -Math.PI / 2, spread: 1, gravity: 300, life: 0.4 })
          blit(ctx, finSprite(), p.x, p.y - 8, 40, 30)
        } else if (o.jump > 0.5) blit(ctx, sharkSprite(), p.x, p.y, 84, 40, -0.4 + Math.min(1, o.jump - 0.5) * 0.8)
        else blit(ctx, finSprite(), p.x, p.y - 8, 40, 30)
      } else if (o.kind === 'surfer' && !o.hit) {
        drawSurfer(ctx, p.x, p.y, Math.sin(o.t * 1.3) * -0.25, t + o.t, { suit: o.color, board: '#f8fafc', stripe: o.color, hair: '#422006', crouch: 0.3, arms: 0.5, scale: 0.9 })
      } else if (o.kind === 'surfer') {
        drawSurfer(ctx, p.x, p.y, 0.4, t, { suit: o.color, board: '#f8fafc', stripe: o.color, hair: '#422006', crouch: 0, arms: 0, scale: 0.9, fallen: true })
      }
    }

    // player
    const p = scr(sf.x, sf.h)
    const blink = sf.inv > 0 && Math.floor(t * 12) % 2 === 0
    if (phaseRef.current !== 'over' && !blink) {
      const rot = sf.air ? sf.rot - 0.2 : -Math.atan2(sf.vup, sf.s) * 0.8
      if (sf.turbo > 0) glow(ctx, p.x, p.y, 40, '#f97316', 0.45)
      drawSurfer(ctx, p.x, p.y, rot, t, {
        suit: '#0f172a',
        board: '#f97316',
        stripe: '#fde047',
        hair: '#facc15',
        crouch: holdRef.current ? 0.8 : 0.35,
        arms: sf.air ? 1 : 0.4,
        scale: 1.15,
        fallen: sf.crash > 0 || phaseRef.current === 'dying',
      })
      if (sf.shield) {
        ctx.strokeStyle = 'rgba(56,189,248,0.7)'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(p.x, p.y - 12, 30 + Math.sin(t * 6) * 2, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (sf.magnet > 0) {
        const pulse = (t * 1.5) % 1
        ctx.strokeStyle = `rgba(244,63,94,${0.45 * (1 - pulse) * Math.min(1, sf.magnet)})`
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(p.x, p.y - 12, 26 + pulse * 40, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // curl + whitewater (in front)
    if (curlSx > -220) {
      const top = lipY(curlSx) - 4
      const land = { x: curlSx - 18, y: top + g.faceH * 0.62 }
      // tube interior: crescent under the throwing lip
      ctx.fillStyle = 'rgba(2,40,56,0.38)'
      ctx.beginPath()
      ctx.moveTo(curlSx + 160, lipY(curlSx + 160))
      ctx.quadraticCurveTo(curlSx + 40, top - 34, curlSx - 6, top + 12)
      ctx.quadraticCurveTo(curlSx - 26, top + g.faceH * 0.35, land.x, land.y)
      ctx.quadraticCurveTo(curlSx + 18, top + g.faceH * 0.4, curlSx + 50, top + 26)
      ctx.quadraticCurveTo(curlSx + 100, top + 8, curlSx + 160, lipY(curlSx + 160) + 6)
      ctx.closePath()
      ctx.fill()
      // whitewater mass behind the break
      const ww = ctx.createLinearGradient(0, top, 0, g.trough + 10)
      ww.addColorStop(0, 'rgba(255,255,255,0.97)')
      ww.addColorStop(0.6, 'rgba(224,242,254,0.92)')
      ww.addColorStop(1, b.face0)
      ctx.fillStyle = ww
      ctx.beginPath()
      ctx.moveTo(-20, g.trough + 12)
      ctx.lineTo(-20, top + 30)
      for (let x = -20; x < land.x; x += 16) {
        const yy = top + 22 + Math.sin(x * 0.15 + t * 7) * 7 + (x / Math.max(1, land.x)) * 8
        ctx.quadraticCurveTo(x + 8, yy - 12, x + 16, yy)
      }
      ctx.quadraticCurveTo(land.x + 46, land.y + 20, land.x + 74, g.trough + 12)
      ctx.closePath()
      ctx.fill()
      // throwing lip
      const lipG = ctx.createLinearGradient(curlSx - 40, top - 40, curlSx + 140, top + 30)
      lipG.addColorStop(0, '#ffffff')
      lipG.addColorStop(0.45, b.face1)
      lipG.addColorStop(1, b.face0)
      ctx.strokeStyle = lipG
      ctx.lineCap = 'round'
      ctx.lineWidth = 18
      ctx.beginPath()
      ctx.moveTo(curlSx + 160, lipY(curlSx + 160) + 4)
      ctx.quadraticCurveTo(curlSx + 40, top - 30, curlSx - 6, top + 12)
      ctx.quadraticCurveTo(curlSx - 24, top + g.faceH * 0.35, land.x, land.y)
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(curlSx + 130, top - 6)
      ctx.quadraticCurveTo(curlSx + 40, top - 38, curlSx - 12, top + 4)
      ctx.stroke()
      // foam explosion where the lip lands
      ctx.fillStyle = '#ffffff'
      ctx.globalAlpha = 0.9
      for (let i = 0; i < 7; i++) {
        const a = t * 3 + i
        ctx.beginPath()
        ctx.arc(land.x + Math.cos(a) * 14, land.y + Math.sin(a * 1.3) * 14, 10 + (i % 3) * 5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    } else {
      // curl off-screen: show how close it is
      const k = clamp(1 - (sf.x - w.curlX - g.sx) / 300, 0, 1)
      ctx.fillStyle = `rgba(255,255,255,${0.15 + k * 0.4})`
      ctx.fillRect(0, g.lip, 6 + k * 10, g.faceH)
    }

    // air obstacles and pickups
    for (const o of w.obs) {
      const op = scr(o.x, o.h)
      if (o.h <= g.faceH && o.kind !== 'gull' && o.kind !== 'pelican') op.y = Math.max(op.y, lipY(op.x) + 12)
      if (op.x < -40 || op.x > W + 40) continue
      if (o.kind === 'gull' && !o.hit) drawGull(ctx, op.x, op.y, t + o.t, 1.2)
      else if (o.kind === 'pelican') {
        const dk = o.jump <= 0 ? 0 : o.jump < 0.9 ? (o.jump / 0.9) * 0.4 : o.jump < 1.35 ? 1 : Math.max(0, 1 - (o.jump - 1.35) * 2)
        const rot = o.jump > 1.35 ? Math.min(0.5, (o.jump - 1.35) * 2) : -dk * 1.2
        drawPelican(ctx, op.x, op.y, t + o.t, dk, rot)
      } else if (o.kind === 'pearl') blit(ctx, pearlSprite(), op.x, op.y + Math.sin(o.t * 3) * 3, 24, 24)
      else if (o.kind === 'coin') {
        const sx = 0.35 + Math.abs(Math.cos(o.t * 4)) * 0.65
        ctx.save()
        ctx.translate(op.x, op.y)
        ctx.scale(sx, 1)
        blit(ctx, coinSprite(), 0, 0, 20, 20)
        ctx.restore()
      } else if (o.kind === 'shield' || o.kind === 'turbo' || o.kind === 'star' || o.kind === 'magnet') blit(ctx, powerSprite(o.kind), op.x, op.y + Math.sin(o.t * 4) * 4, 34, 34)
    }

    // foreground water
    const fore = ctx.createLinearGradient(0, g.trough, 0, H)
    fore.addColorStop(0, b.deep)
    fore.addColorStop(1, b.fore)
    ctx.fillStyle = fore
    ctx.fillRect(-10, g.trough + 2, W + 20, H - g.trough + 10)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 2
    for (let i = 0; i < 4; i++) {
      const y = g.trough + 14 + i * 22
      const off = (sf.x * (1.2 + i * 0.3)) % 120
      ctx.beginPath()
      for (let x = -off; x < W + 20; x += 120) {
        ctx.moveTo(x, y)
        ctx.quadraticCurveTo(x + 25, y - 4, x + 50, y)
      }
      ctx.stroke()
    }
    if (b.bg === 'berg') {
      // drifting ice chunks in the foreground
      for (let i = 0; i < 4; i++) {
        const x = (((i * 173 + 60 - sf.x * 1.3) % (W + 80)) + W + 80) % (W + 80) - 40
        blit(ctx, iceChunkSprite(), x, g.trough + 22 + (i % 2) * 34 + Math.sin(t * 2 + i) * 2, 36, 16)
      }
    } else if (b.bg === 'volcano') {
      // lava glints on the water
      ctx.fillStyle = '#fb923c'
      for (let i = 0; i < 10; i++) {
        const x = (((i * 97 - sf.x * 1.1) % W) + W) % W
        ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 4 + i * 2)
        ctx.fillRect(x, g.trough + 18 + (i % 4) * 20, 18, 2)
      }
      ctx.globalAlpha = 1
    }

    // milestone flags: personal best + every 500 m
    const flag = (fd: number, col: string, label: string) => {
      const fxp = scr(fd * PXM, 0).x
      if (fxp < -20 || fxp > W + 20) return
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(fxp - 1.5, g.trough - 66, 3, 70)
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.moveTo(fxp + 1.5, g.trough - 66)
      ctx.quadraticCurveTo(fxp + 20, g.trough - 62 + Math.sin(t * 6) * 2, fxp + 34, g.trough - 58)
      ctx.lineTo(fxp + 1.5, g.trough - 48)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = '800 10px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(label, fxp, g.trough - 72)
    }
    if (phaseRef.current !== 'idle') {
      const cur = sf.x / PXM
      const next500 = Math.ceil(cur / 500) * 500
      for (const fd of [next500 - 500, next500, next500 + 500]) if (fd > 0) flag(fd, '#22c55e', `${fd} m`)
      if (w.bestDist > 100) flag(w.bestDist, '#facc15', 'BEST')
    }

    // jet-ski warnings at the right edge
    for (const o of w.obs) {
      if (o.kind === 'jetski' && o.jump < 1.3) drawEdgeWarn(ctx, W - 22, Math.max(scr(o.x, o.h).y, lipY(W - 22) + 14), t)
    }

    fx.draw(ctx)
    ctx.restore()

    if (b.amb) {
      const snow = b.amb === 'snow'
      ctx.fillStyle = snow ? '#ffffff' : '#fb923c'
      for (let i = 0; i < w.drops.length; i++) {
        const d = w.drops[i]
        if (snow) {
          d.y += (40 + (i % 5) * 12) * raw
          d.x -= (50 + Math.sin(t + i) * 30) * raw
        } else {
          d.y -= (30 + (i % 5) * 10) * raw
          d.x -= (70 + Math.sin(t * 2 + i) * 40) * raw
        }
        if (d.y > H) d.y -= H + 10
        if (d.y < -10) d.y += H + 10
        if (d.x < -10) d.x += W + 20
        ctx.globalAlpha = snow ? 0.85 : 0.4 + 0.5 * Math.abs(Math.sin(t * 5 + i))
        const s = snow ? 1.5 + (i % 3) : 1.5 + (i % 2)
        ctx.fillRect(d.x, d.y, s, s)
      }
      ctx.globalAlpha = 1
    }
    if (w.ev && phaseRef.current === 'play') {
      // event timer pill
      const k = 1 - clamp(w.evT / w.evDur, 0, 1)
      const bw = Math.min(160, W * 0.42)
      const bx = (W - bw) / 2
      const by = 104
      ctx.fillStyle = 'rgba(15,23,42,0.55)'
      ctx.fillRect(bx - 2, by - 2, bw + 4, 10)
      ctx.fillStyle = w.ev === 'kraken' ? '#c084fc' : '#facc15'
      ctx.fillRect(bx, by, bw * k, 6)
      ctx.fillStyle = '#ffffff'
      ctx.font = '800 11px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(w.ev === 'kraken' ? 'KRAKEN' : 'GOLDEN SWELL', W / 2, by - 6)
    }

    if (b.rain) {
      ctx.strokeStyle = 'rgba(226,232,240,0.45)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      for (const d of w.drops) {
        d.y += 700 * raw
        d.x -= 160 * raw
        if (d.y > H) {
          d.y -= H + 20
          d.x = Math.random() * (W + 100)
        }
        if (d.x < -20) d.x += W + 40
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - 4, d.y + 14)
      }
      ctx.stroke()
    }
    // danger vignette when the curl is close
    const gap = sf.x - w.curlX
    if (phaseRef.current === 'play' && gap < 150) {
      const k = clamp(1 - gap / 150, 0, 1)
      const vg = ctx.createLinearGradient(0, 0, W * 0.5, 0)
      vg.addColorStop(0, `rgba(255,255,255,${0.35 * k})`)
      vg.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, W, H)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        holdRef.current = true
      }
    }
    function up(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp') holdRef.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // dev-only: jump ahead for screenshots / tuning
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    const skip = (dist: number) => {
      const w = world.current
      const x = dist * PXM
      const dx = x - w.sf.x
      w.sf.x = x
      w.curlX += dx
      w.obs = []
      w.nextSpawn = x + 400
      w.nextPick = x + 300
      w.milestone = Math.ceil((dist + 1) / 250) * 250
      w.nextSet = dist + 700
      if (w.nextEv < dist) w.nextEv = dist + 400
    }
    win.__en2surf = {
      skip,
      biome: (i: number) => skip(i * 700 + 30),
      god: (on = true) => {
        world.current.god = on
      },
      event: (kind: string) => {
        const w = world.current
        const g = geo()
        const sf = w.sf
        if (kind === 'golden' || kind === 'kraken') {
          if (w.ev) return
          w.evN = kind === 'golden' ? 0 : 1
          startEvent(kind)
        } else if (kind === 'whirl') w.obs.push(mkOb('whirl', sf.x + 380, g.faceH * 0.45))
        else if (kind === 'jetski') w.obs.push(mkOb('jetski', sf.x + 600, g.faceH * 0.5))
        else if (kind === 'pelican') w.obs.push(mkOb('pelican', sf.x + 460, g.faceH + 130, -50))
        else if (kind === 'magnet' || kind === 'pearl') w.obs.push(mkOb(kind, sf.x + 200, g.faceH * 0.5))
      },
      world: () => world.current,
      state: () => ({ d: Math.floor(world.current.sf.x / PXM), biome: BIOMES[world.current.biome].name, ev: world.current.ev, obs: world.current.obs.length }),
    }
    return () => {
      delete win.__en2surf
    }
  }, [])

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    holdRef.current = true
  }
  function onUp() {
    holdRef.current = false
  }

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">{hud.dist} m</div>
                <div className={`surf-gap${hud.gap < 0.3 ? ' is-danger' : ''}`}>
                  <span style={{ width: `${Math.round(hud.gap * 100)}%` }} />
                </div>
              </div>
              <div className="action-hud__right">
                <span className="surf-lives">
                  {Array.from({ length: Math.max(0, hud.lives) }, (_, i) => (
                    <i key={i} />
                  ))}
                  {hud.shield ? <b /> : null}
                </span>
                {hud.combo > 1 ? <span className="action-hud__small surf-combo">Combo x{hud.combo}</span> : null}
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
            <ActionIdle game="surf" icon={meta.icon} title={meta.title} hint="Hold to carve up the face, release to drop and gain speed. Launch off the lip and hold to flip — land upright!" onPlay={start} />
          )}
          <ActionResult
            run={run}
            title={hud.dist >= 1000 ? 'Legendary session!' : 'Wiped out!'}
            subtitle={`Score ${hud.score} · ${hud.dist} m`}
            celebrate={hud.dist >= 1000}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
