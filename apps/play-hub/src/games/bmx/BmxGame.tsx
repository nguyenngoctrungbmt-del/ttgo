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
import { basaltSprite, blit, blitBase, boulderSprite, cactusSprite, coinSprite, drawBike, flagSprite, fuelSprite, headOffset, iceRockSprite, nitroSprite, pineSprite, rockSprite, treeSprite, ventSprite } from './art'
import '../../shared/action/action.css'
import './bmx.css'

const meta = getGame('bmx')

type Phase = 'idle' | 'play' | 'dying' | 'over'

const DX = 8
const PXM = 20
const WR = 14
const WB = 60
const G = 1150
const TAU = Math.PI * 2
const BEST_KEY = 'todaypuzzle.bmx.bestDist'

type Biome = {
  name: string
  sky0: string
  sky1: string
  far: string
  near: string
  dirt0: string
  dirt1: string
  top: string
  topDark: string
  grav: number
  deco: 'tree' | 'cactus' | 'moon' | 'autumn' | 'snow' | 'lava'
  sub?: string
}
const BIOMES: Biome[] = [
  { name: 'Countryside', sky0: '#60a5fa', sky1: '#dbeafe', far: '#93c5fd', near: '#4ade80', dirt0: '#92400e', dirt1: '#451a03', top: '#22c55e', topDark: '#15803d', grav: 1, deco: 'tree' },
  { name: 'Desert Dunes', sky0: '#f59e0b', sky1: '#fef3c7', far: '#fdba74', near: '#fbbf24', dirt0: '#d97706', dirt1: '#78350f', top: '#fcd34d', topDark: '#b45309', grav: 1, deco: 'cactus' },
  { name: 'The Moon', sky0: '#020617', sky1: '#1e1b4b', far: '#334155', near: '#475569', dirt0: '#64748b', dirt1: '#1e293b', top: '#cbd5e1', topDark: '#94a3b8', grav: 0.4, deco: 'moon' },
  { name: 'Autumn Woods', sky0: '#fb923c', sky1: '#fed7aa', far: '#c2410c', near: '#ea580c', dirt0: '#7c2d12', dirt1: '#2a0f05', top: '#f97316', topDark: '#9a3412', grav: 1, deco: 'autumn' },
  { name: 'Frozen Peaks', sky0: '#1e3a8a', sky1: '#c7d2fe', far: '#64748b', near: '#94a3b8', dirt0: '#475569', dirt1: '#1e293b', top: '#f8fafc', topDark: '#7dd3fc', grav: 1, deco: 'snow', sub: 'ice falls from the cliffs' },
  { name: 'Lava Badlands', sky0: '#1c0a05', sky1: '#9a3412', far: '#292524', near: '#44403c', dirt0: '#3f2a20', dirt1: '#0c0a09', top: '#78350f', topDark: '#ea580c', grav: 1, deco: 'lava', sub: 'mind the fire vents!' },
]
const BIOME_LEN = 800

/** Distances (m) when new content starts appearing. */
const NITRO_FROM = 450
const ROCK_FROM = 1000
const VENT_FROM = 1900
const RACE_FROM = 1400
const RACE_EVERY = 1700
const RACE_LEN = 300
const MAX_HAZ = 10
const ROCK_WARN = 1.4
const ROCK_FALL = 0.32
const VENT_WARN = 1
const VENT_ERUPT = 0.9
const VENT_H = 150

type Hazard = {
  kind: 'rock' | 'vent'
  x: number
  /** rock: countdown clock (s) once on screen; vent: phase clock */
  t: number
  armed: boolean
  done: boolean
  skin: 'rock' | 'ice' | 'meteor'
  period: number
  near: boolean
}
type Race = { x: number; v: number; spin: number; finish: number; lead: number }

type Wheel = { x: number; y: number; vx: number; vy: number; touch: boolean; spin: number }
type Pick = { kind: 'coin' | 'fuel' | 'nitro'; x: number; y: number; taken: boolean; t: number }
type Deco = { x: number; kind: 'tree' | 'cactus' | 'rock' | 'autumn' | 'mrock' | 'pine' | 'ice' | 'basalt'; s: number }

type World = {
  ys: number[]
  bridge: boolean[]
  base: number
  gen: { x: number; y: number; slope: number; target: number; segLeft: number; mode: 'hills' | 'rampFlat' | 'rampUp' | 'rampDrop' | 'bridge' | 'crater'; modeLeft: number; craterLen: number; craterY: number }
  picks: Pick[]
  decos: Deco[]
  nextCoin: number
  nextFuel: number
  R: Wheel
  F: Wheel
  comp: number
  compV: number
  fuel: number
  crashed: boolean
  rider: { x: number; y: number; vx: number; vy: number; rot: number; vr: number } | null
  helmets: number
  inv: number
  stillT: number
  airT: number
  airRot: number
  lastAng: number
  combo: number
  bonus: number
  coinsGot: number
  biome: number
  milestone: number
  bestDist: number
  bestPassed: boolean
  camX: number
  camY: number
  hudT: number
  lastTrack: number
  lowWarn: number
  hazards: Hazard[]
  nextHaz: number
  nextNitro: number
  nitro: number
  race: Race | null
  nextRace: number
  raceN: number
  extraCoins: number
  stats: { score: number; distance: number; flips: number; coins: number; moon: number }
}

/** Dev-only: ignore crashes while taking screenshots. */
let devGod = false

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0
  } catch {
    return 0
  }
}

function freshWorld(): World {
  return {
    ys: [],
    bridge: [],
    base: 0,
    gen: { x: -400, y: 0, slope: 0, target: 0, segLeft: 0, mode: 'hills', modeLeft: 0, craterLen: 0, craterY: 0 },
    picks: [],
    decos: [],
    nextCoin: 400,
    nextFuel: 120 * PXM,
    R: { x: 0, y: -WR - 2, vx: 0, vy: 0, touch: false, spin: 0 },
    F: { x: WB, y: -WR - 2, vx: 0, vy: 0, touch: false, spin: 0 },
    comp: 0,
    compV: 0,
    fuel: 1,
    crashed: false,
    rider: null,
    helmets: 0,
    inv: 0,
    stillT: 0,
    airT: 0,
    airRot: 0,
    lastAng: 0,
    combo: 0,
    bonus: 0,
    coinsGot: 0,
    biome: 0,
    milestone: 250,
    bestDist: readBest(),
    bestPassed: false,
    camX: 0,
    camY: 0,
    hudT: 0,
    lastTrack: 0,
    lowWarn: 0,
    hazards: [],
    nextHaz: ROCK_FROM * PXM,
    nextNitro: NITRO_FROM * PXM,
    nitro: 0,
    race: null,
    nextRace: RACE_FROM,
    raceN: 0,
    extraCoins: 0,
    stats: { score: 0, distance: 0, flips: 0, coins: 0, moon: 0 },
  }
}

function angDiff(a: number, b: number) {
  let d = (b - a) % TAU
  if (d > Math.PI) d -= TAU
  if (d < -Math.PI) d += TAU
  return d
}

function biomeAt(xPx: number) {
  return Math.floor(Math.max(0, xPx) / PXM / BIOME_LEN) % BIOMES.length
}

export default function BmxGame() {
  const run = useActionRun('bmx')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 620 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const pointers = useRef(new Map<number, 'gas' | 'brake'>())
  const keys = useRef({ gas: false, brake: false })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, dist: 0, fuel: 1, flips: 0, gas: false, brake: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  // ── Terrain ───────────────────────────────────────────
  function ground(x: number) {
    const w = world.current
    const f = x / DX - w.base
    const i = Math.floor(f)
    if (i < 0) return w.ys[0] ?? 0
    if (i >= w.ys.length - 1) return w.ys[w.ys.length - 1] ?? 0
    const k = f - i
    return w.ys[i] * (1 - k) + w.ys[i + 1] * k
  }
  function slope(x: number) {
    return (ground(x + 4) - ground(x - 4)) / 8
  }
  function isBridge(x: number) {
    const w = world.current
    const i = Math.round(x / DX - w.base)
    return !!w.bridge[i]
  }

  function genStep() {
    const w = world.current
    const g = w.gen
    const d = g.x / PXM
    const b = BIOMES[biomeAt(g.x)]
    const maxS = d < 150 ? 0.22 : 0.3 + Math.min(0.5, d / 2600)
    let isBr = false
    if (g.mode === 'hills') {
      g.segLeft -= DX
      if (g.segLeft <= 0) {
        g.segLeft = rand(120, 320)
        g.target = rand(-maxS, maxS) - g.y * 0.0012
        const r = Math.random()
        if (d > 120 && r < 0.2) {
          g.mode = 'rampFlat'
          g.modeLeft = 60
        } else if (d > 300 && r < 0.32 && b.deco !== 'moon') {
          g.mode = 'bridge'
          g.modeLeft = rand(200, 320)
        } else if (b.deco === 'moon' && r < 0.45) {
          g.mode = 'crater'
          g.craterLen = rand(160, 260)
          g.modeLeft = g.craterLen
          g.craterY = rand(40, 80)
        }
      }
      g.slope = approach(g.slope, g.target, 1.2, DX / 100)
    } else if (g.mode === 'rampFlat') {
      g.slope = approach(g.slope, 0, 3, DX / 100)
      g.modeLeft -= DX
      if (g.modeLeft <= 0) {
        g.mode = 'rampUp'
        g.modeLeft = rand(70, 120)
        g.target = -rand(0.6, 0.95)
      }
    } else if (g.mode === 'rampUp') {
      g.slope = approach(g.slope, g.target, 4, DX / 100)
      g.modeLeft -= DX
      if (g.modeLeft <= 0) {
        g.mode = 'rampDrop'
        g.modeLeft = rand(70, 110)
      }
    } else if (g.mode === 'rampDrop') {
      g.slope = approach(g.slope, 1.1, 6, DX / 100)
      g.modeLeft -= DX
      if (g.modeLeft <= 0) {
        g.mode = 'hills'
        g.segLeft = 80
        g.target = 0.3
      }
    } else if (g.mode === 'bridge') {
      g.slope = 0
      isBr = true
      g.modeLeft -= DX
      if (g.modeLeft <= 0) g.mode = 'hills'
    } else if (g.mode === 'crater') {
      const k = 1 - g.modeLeft / g.craterLen
      g.slope = Math.sin(k * TAU) * (g.craterY / g.craterLen) * Math.PI
      g.modeLeft -= DX
      if (g.modeLeft <= 0) g.mode = 'hills'
    }
    g.y += g.slope * DX
    g.x += DX
    w.ys.push(g.y)
    w.bridge.push(isBr)
    // decorations
    if (Math.random() < 0.05 && !isBr) {
      const kind: Deco['kind'] = b.deco === 'snow' ? (Math.random() < 0.7 ? 'pine' : 'ice') : b.deco === 'lava' ? 'basalt' : b.deco === 'tree' ? (Math.random() < 0.75 ? 'tree' : 'rock') : b.deco === 'cactus' ? (Math.random() < 0.6 ? 'cactus' : 'rock') : b.deco === 'moon' ? 'mrock' : Math.random() < 0.8 ? 'autumn' : 'rock'
      w.decos.push({ x: g.x, kind, s: rand(0.75, 1.2) })
    }
  }

  function extend() {
    const w = world.current
    const need = w.camX + size.current.w * 1.5
    while (w.gen.x < need) genStep()
    // pickups ahead
    while (w.nextCoin < w.gen.x - 200) {
      const x0 = w.nextCoin
      const n = 5
      for (let i = 0; i < n; i++) {
        const x = x0 + i * 26
        w.picks.push({ kind: 'coin', x, y: ground(x) - 30, taken: false, t: i * 0.3 })
      }
      w.nextCoin += rand(450, 750)
    }
    while (w.nextFuel < w.gen.x - 200) {
      const x = w.nextFuel
      w.picks.push({ kind: 'fuel', x, y: ground(x) - 26, taken: false, t: 0 })
      w.nextFuel += (170 + Math.min(150, (x / PXM) * 0.06)) * PXM
    }
    while (w.nextNitro < w.gen.x - 200) {
      const x = w.nextNitro
      w.picks.push({ kind: 'nitro', x, y: ground(x) - 30, taken: false, t: 0 })
      w.nextNitro += rand(330, 480) * PXM
    }
    while (w.nextHaz < w.gen.x - 200) placeHazard()
    // trim behind
    const cutIdx = Math.floor((Math.min(w.camX, w.R.x) - size.current.w * 2) / DX) - w.base
    if (cutIdx > 400) {
      w.ys.splice(0, cutIdx)
      w.bridge.splice(0, cutIdx)
      w.base += cutIdx
      const minX = w.base * DX
      w.picks = w.picks.filter((p) => p.x > minX)
      w.decos = w.decos.filter((d) => d.x > minX)
      w.hazards = w.hazards.filter((hz) => hz.x > minX)
    }
  }

  /** Place the next hazard at w.nextHaz on safe, rideable ground (never on bridges or ramp lips). */
  function placeHazard() {
    const w = world.current
    const x = w.nextHaz
    const d = x / PXM
    const b = BIOMES[biomeAt(x)]
    let safe = true
    for (let k = -60; k <= 60; k += 20) {
      if (isBridge(x + k) || Math.abs(slope(x + k)) > 0.55) safe = false
    }
    if (!safe) {
      w.nextHaz += 80
      return
    }
    const ventOk = d >= VENT_FROM && Math.abs(slope(x)) < 0.4
    const ventP = b.deco === 'lava' ? 0.65 : 0.35
    const live = w.hazards.filter((hz) => !hz.done).length
    if (live < MAX_HAZ && phaseRef.current !== 'idle') {
      if (ventOk && Math.random() < ventP) {
        w.hazards.push({ kind: 'vent', x, t: rand(0, 3), armed: true, done: false, skin: 'rock', period: rand(2.8, 3.6), near: false })
      } else {
        const skin = b.deco === 'snow' ? 'ice' : b.deco === 'moon' || b.deco === 'lava' ? 'meteor' : 'rock'
        w.hazards.push({ kind: 'rock', x, t: 0, armed: false, done: false, skin, period: 0, near: false })
      }
    }
    // gaps shrink slowly the further you ride (≈ 90 m at first, ≈ 40 m late)
    const gap = Math.max(40, 95 - (d - ROCK_FROM) * 0.015)
    w.nextHaz += rand(gap * 0.75, gap * 1.35) * PXM
  }

  function initTerrain(startX = 0) {
    const w = world.current
    w.gen.x = startX - 400
    w.base = Math.round(w.gen.x / DX)
    while (w.gen.x < startX + 900) genStep()
    w.R = { x: startX, y: ground(startX) - WR - 1, vx: 0, vy: 0, touch: true, spin: 0 }
    w.F = { x: startX + WB, y: ground(startX + WB) - WR - 1, vx: 0, vy: 0, touch: true, spin: 0 }
    w.camX = startX + WB / 2
    w.camY = ground(startX)
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    world.current = w
    initTerrain()
    w.helmets = run.level('helmet')
    fx.reset()
    pointers.current.clear()
    run.begin()
    setPhaseBoth('play')
    say('RIDE!', 'right = gas · left = brake')
    sfx.ready()
    pushHud()
  }

  function pushHud() {
    const w = world.current
    const ctl = controls()
    setHud({ score: w.stats.score, dist: Math.floor(w.R.x / PXM), fuel: w.fuel, flips: w.stats.flips, gas: ctl.gas, brake: ctl.brake })
  }

  function controls() {
    let gas = keys.current.gas
    let brake = keys.current.brake
    for (const v of pointers.current.values()) {
      if (v === 'gas') gas = true
      else brake = true
    }
    return { gas, brake }
  }

  function placeUpright(extraFuel: number) {
    const w = world.current
    const cx = (w.R.x + w.F.x) / 2
    const x0 = cx - WB / 2
    w.R = { x: x0, y: ground(x0) - WR - 4, vx: 0, vy: 0, touch: false, spin: w.R.spin }
    w.F = { x: x0 + WB, y: ground(x0 + WB) - WR - 4, vx: 0, vy: 0, touch: false, spin: w.F.spin }
    w.crashed = false
    w.rider = null
    w.inv = 1.5
    w.airT = 0
    w.airRot = 0
    w.stillT = 0
    w.fuel = Math.min(1, w.fuel + extraFuel)
  }

  function crash(reason: string) {
    const w = world.current
    if (w.crashed || w.inv > 0 || (import.meta.env.DEV && devGod)) return
    const hp = headWorld()
    const hs = toScreen(hp.x, hp.y)
    fx.burst(hs.x, hs.y, { count: 22, color: ['#fde047', '#ffffff', '#fb923c'], speed: 260, shape: 'spark' })
    fx.shake(12, 0.4)
    fx.stop(0.1)
    fx.flash('#ef4444', 0.25)
    sfx.thud()
    sfx.hurt()
    haptic.heavy()
    if (w.helmets > 0) {
      w.helmets -= 1
      placeUpright(0)
      say('HELMET SAVED YOU!', w.helmets > 0 ? `${w.helmets} left` : 'last helmet')
      return
    }
    w.crashed = true
    w.rider = { x: hp.x, y: hp.y, vx: (w.R.vx + w.F.vx) / 2, vy: -260, rot: 0, vr: rand(-8, 8) }
    die(reason)
  }

  function die(reason: string) {
    const w = world.current
    setPhaseBoth('dying')
    fx.slowmo(1, 0.35)
    sfx.lose()
    haptic.error()
    say(reason)
    const dist = Math.floor(w.R.x / PXM)
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
      const coins = Math.round(w.coinsGot * 0.3 + dist / 60 + w.stats.flips * 2 + w.extraCoins)
      run.end({ score: w.stats.score, cleared: dist >= 800, stats: { ...w.stats }, coins }, revive)
    }, 1300)
  }

  function revive() {
    const w = world.current
    placeUpright(0.6)
    w.inv = 2.5
    // clear threats close by and call off a race in progress
    for (const hz of w.hazards) {
      if (Math.abs(hz.x - w.R.x) < 500) hz.done = true
    }
    if (w.race) w.nextRace = w.R.x / PXM + 400
    w.race = null
    say('REVIVED!', '+60% fuel')
    pushHud()
    setPhaseBoth('play')
  }

  function frameAngle() {
    const w = world.current
    return Math.atan2(w.F.y - w.R.y, w.F.x - w.R.x)
  }

  function headWorld() {
    const w = world.current
    const a = frameAngle()
    const ctl = controls()
    const ho = headOffset(WB, WR, ctl.gas ? -0.4 : ctl.brake ? 0.6 : 0, 0.3)
    const c = Math.cos(a)
    const s = Math.sin(a)
    return { x: w.R.x + ho.x * c - ho.y * s, y: w.R.y + ho.x * s + ho.y * c }
  }

  function physics(h: number, gas: boolean, brake: boolean) {
    const w = world.current
    const R = w.R
    const F = w.F
    const grav = G * BIOMES[biomeAt(R.x)].grav
    const boost = w.nitro > 0 ? 1.45 : 1
    const vmax = 520 * (1 + run.level('engine') * 0.08) * boost
    const accel = 950 * (1 + run.level('engine') * 0.08) * boost
    const air = !R.touch && !F.touch
    let dxn = F.x - R.x
    let dyn = F.y - R.y
    let len = Math.hypot(dxn, dyn) || 1
    dxn /= len
    dyn /= len
    const nx = dyn
    const ny = -dxn
    R.vy += grav * h
    F.vy += grav * h
    // drive & brake along the ground tangent
    for (const [wh, k] of [
      [R, 1],
      [F, 0.35],
    ] as const) {
      if (!wh.touch) continue
      const s = slope(wh.x)
      const tl = Math.hypot(1, s)
      const tx = 1 / tl
      const ty = s / tl
      const vt = wh.vx * tx + wh.vy * ty
      if (gas && vt < vmax) {
        wh.vx += tx * accel * k * h
        wh.vy += ty * accel * k * h
      }
      if (brake) {
        const dec = vt > 20 ? Math.min(vt, 900 * h) : vt > -140 ? -260 * h * k : 0
        wh.vx -= tx * dec
        wh.vy -= ty * dec
      }
    }
    // lean torque: gas tilts back, brake tilts forward (stronger in the air)
    const torque = (gas ? 1 : 0) - (brake ? 1 : 0)
    if (torque) {
      const alpha = (air ? 9 : 3.2) * torque
      const lin = alpha * (WB / 2) * h
      F.vx += nx * lin
      F.vy += ny * lin
      R.vx -= nx * lin
      R.vy -= ny * lin
    }
    // cap spin rate
    const omega = ((F.vx - R.vx) * nx + (F.vy - R.vy) * ny) / WB
    const maxW = 8.5
    if (Math.abs(omega) > maxW) {
      const ex = (omega - Math.sign(omega) * maxW) * (WB / 2)
      F.vx -= nx * ex
      F.vy -= ny * ex
      R.vx += nx * ex
      R.vy += ny * ex
    }
    R.x += R.vx * h
    R.y += R.vy * h
    F.x += F.vx * h
    F.y += F.vy * h
    R.touch = false
    F.touch = false
    for (let it = 0; it < 2; it++) {
      // rigid wheelbase
      dxn = F.x - R.x
      dyn = F.y - R.y
      len = Math.hypot(dxn, dyn) || 1
      const diff = (len - WB) / len / 2
      R.x += dxn * diff
      R.y += dyn * diff
      F.x -= dxn * diff
      F.y -= dyn * diff
      const ux = dxn / len
      const uy = dyn / len
      const rel = (F.vx - R.vx) * ux + (F.vy - R.vy) * uy
      R.vx += ux * rel * 0.5
      R.vy += uy * rel * 0.5
      F.vx -= ux * rel * 0.5
      F.vy -= uy * rel * 0.5
      // ground contact
      for (const wh of [R, F]) {
        const gy = ground(wh.x)
        const s = slope(wh.x)
        const k = Math.hypot(1, s)
        const dist = (gy - wh.y) / k
        if (dist < WR + 1.5) {
          wh.touch = true
          if (dist < WR) {
            const nxu = s / k
            const nyu = -1 / k
            const pen = WR - dist
            wh.x += nxu * pen
            wh.y += nyu * pen
            const vn = wh.vx * nxu + wh.vy * nyu
            if (vn < 0) {
              wh.vx -= nxu * vn * 1.05
              wh.vy -= nyu * vn * 1.05
              if (vn < -260 && it === 0) {
                w.compV += -vn * 0.03
                if (phaseRef.current === 'play' && vn < -420) {
                  sfx.thud()
                  haptic.light()
                }
              }
            }
            // rolling resistance
            const tx = 1 / k
            const ty = s / k
            const vt = wh.vx * tx + wh.vy * ty
            const loss = vt * 0.12 * h
            wh.vx -= tx * loss
            wh.vy -= ty * loss
          }
        }
      }
    }
    // wheel spin for drawing
    for (const wh of [R, F]) {
      if (wh.touch) wh.spin += (Math.hypot(wh.vx, wh.vy) * Math.sign(wh.vx || 1) * h) / WR
      else if (wh === R && gas) wh.spin += 25 * h
    }
  }

  // ── Hazards: falling rocks (shrinking-ring countdown) and fire vents (bubble → erupt) ──
  function rockY(hz: Hazard) {
    const g = ground(hz.x) - 16
    // drifts into view and wobbles at the top during the countdown, then drops fast
    if (hz.t < ROCK_WARN) return g - 420 + 170 * Math.min(1, hz.t / (ROCK_WARN * 0.8)) + Math.sin(hz.t * 30) * 2
    const k = clamp((hz.t - ROCK_WARN) / ROCK_FALL, 0, 1)
    return g - 250 * (1 - k * k)
  }
  function ventState(hz: Hazard) {
    const ph = hz.t % hz.period
    const erupt = ph > hz.period - VENT_ERUPT
    const warn = !erupt && ph > hz.period - VENT_ERUPT - VENT_WARN
    const k = erupt ? (ph - (hz.period - VENT_ERUPT)) / VENT_ERUPT : warn ? (ph - (hz.period - VENT_ERUPT - VENT_WARN)) / VENT_WARN : 0
    // column height ramps up fast, holds, then drops
    const hgt = erupt ? VENT_H * Math.min(1, k * 7, (1 - k) * 6) : 0
    return { erupt, warn, k, hgt }
  }

  function updateHazards(dt: number) {
    const w = world.current
    if (w.crashed) return
    const hp = headWorld()
    const mid = { x: (w.R.x + w.F.x) / 2, y: (w.R.y + w.F.y) / 2 - 10 }
    const pts = [w.R, w.F, hp, mid]
    const W = size.current.w
    for (const hz of w.hazards) {
      if (hz.done) continue
      if (hz.kind === 'rock') {
        if (!hz.armed) {
          if (hz.x - w.R.x < W * 0.62) {
            hz.armed = true
            sfx.tick()
          }
          continue
        }
        hz.t += dt
        const ry = rockY(hz)
        if (w.inv <= 0 && hz.t > ROCK_WARN && ry > ground(hz.x) - 120) {
          if (pts.some((q) => (q.x - hz.x) ** 2 + (q.y - ry) ** 2 < 25 * 25)) {
            hz.done = true
            crash(hz.skin === 'ice' ? 'ICE FALL!' : hz.skin === 'meteor' ? 'METEOR HIT!' : 'ROCKFALL!')
            return
          }
        }
        if (hz.t >= ROCK_WARN + ROCK_FALL) {
          hz.done = true
          const sp = toScreen(hz.x, ground(hz.x) - 8)
          const cols = hz.skin === 'ice' ? ['#e0f2fe', '#7dd3fc', '#ffffff'] : hz.skin === 'meteor' ? ['#fb923c', '#fde047', '#57534e'] : ['#a8a29e', '#78716c', '#e7e5e4']
          fx.burst(sp.x, sp.y, { count: 14, color: cols, speed: 220, angle: -Math.PI / 2, spread: 1.4, size: 5 })
          if (hz.skin === 'meteor') fx.ring(sp.x, sp.y, { color: '#fb923c', maxR: 50 })
          const near = Math.abs(hz.x - mid.x)
          if (near < W) {
            fx.shake(near < 200 ? 7 : 3, 0.2)
            sfx.boom(near < 200 ? 0.45 : 0.2)
          }
          if (near < 95 && phaseRef.current === 'play') {
            w.bonus += 50
            const ps = toScreen(mid.x, mid.y)
            fx.text(ps.x, ps.y - 70, 'CLOSE CALL +50', '#fde68a', 16)
            haptic.light()
          }
        }
      } else {
        hz.t += dt
        const vs = ventState(hz)
        if (vs.erupt && !hz.near && Math.abs(hz.x - mid.x) < W) {
          hz.near = true
          sfx.whoosh()
          if (Math.abs(hz.x - mid.x) < 260) fx.shake(3, 0.15)
        } else if (!vs.erupt) hz.near = false
        if (w.inv <= 0 && vs.hgt > 10 && Math.abs(hz.x - mid.x) < 90) {
          const gy = ground(hz.x)
          if (pts.some((q) => Math.abs(q.x - hz.x) < 17 && q.y > gy - vs.hgt)) {
            crash('BURNED!')
            return
          }
        }
      }
    }
  }

  function startRace() {
    const w = world.current
    w.raceN += 1
    w.race = { x: w.R.x - 80, v: Math.max(200, Math.hypot(w.R.vx, w.R.vy)), spin: 0, finish: w.R.x + RACE_LEN * PXM, lead: -1 }
    w.nextRace = w.R.x / PXM + RACE_EVERY
    say('RIVAL RACE!', `beat Blaze to the flag · ${RACE_LEN} m`)
    sfx.levelUp()
    sfx.whoosh()
    haptic.medium()
    fx.flash('#a855f7', 0.15)
  }

  function updateRace(dt: number) {
    const w = world.current
    const dist = w.R.x / PXM
    if (!w.race) {
      if (dist >= w.nextRace && !w.crashed) startRace()
      return
    }
    const r = w.race
    const gap = r.x - w.R.x
    let vt = Math.min(500, 350 + 25 * w.raceN)
    if (gap > 450) vt *= 0.8
    else if (gap < -500) vt *= 1.12
    vt *= clamp(1 - slope(r.x + WB / 2) * 0.35, 0.7, 1.25)
    r.v = approach(r.v, vt, 2, dt)
    r.x += r.v * dt
    r.spin += (r.v * dt) / WR
    const lead = gap > 40 ? 1 : gap < -40 ? -1 : r.lead
    if (lead !== r.lead) {
      r.lead = lead
      const sp = toScreen(w.R.x, w.R.y)
      if (lead < 0) {
        fx.text(sp.x, sp.y - 80, 'OVERTAKE!', '#d8b4fe', 18)
        sfx.whoosh()
      } else fx.text(sp.x, sp.y - 80, 'Blaze passes!', '#fca5a5', 15)
    }
    if (w.R.x >= r.finish) {
      w.race = null
      const pts = 800 + 200 * w.raceN
      w.bonus += pts
      w.extraCoins += 20
      w.fuel = 1
      w.inv = Math.max(w.inv, 1)
      const sp = toScreen(w.R.x, w.R.y)
      fx.burst(sp.x, sp.y - 30, { count: 40, color: ['#a855f7', '#fde047', '#22d3ee', '#ffffff'], speed: 320, shape: 'spark' })
      fx.ring(sp.x, sp.y - 30, { color: '#d8b4fe', maxR: 90 })
      fx.slowmo(0.5, 0.5)
      say('RACE WON!', `+${pts} · +20 coins · full tank`)
      sfx.win()
      haptic.success()
      if (performance.now() - w.lastTrack > 30000) {
        w.lastTrack = performance.now()
        void trackEvent('action_milestone', { game_id: 'bmx', kind: 'boss', value: w.raceN })
      }
    } else if (r.x >= r.finish) {
      w.race = null
      say('BLAZE WINS', 'next race soon…')
      sfx.miss()
    }
  }

  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    const live = ph === 'play'
    const demo = ph === 'idle'

    if (w.ys.length === 0) initTerrain()

    let { gas, brake } = controls()
    if (!live) {
      gas = false
      brake = false
    }
    const ang = frameAngle()
    if (demo) {
      const air = !w.R.touch && !w.F.touch
      const gs = Math.atan(slope((w.R.x + w.F.x) / 2))
      gas = true
      if (air) {
        gas = ang > gs + 0.25
        brake = ang < gs - 0.25
      } else if (ang < gs - 0.5) {
        gas = false
        brake = true
      }
    }
    if (live && w.fuel <= 0) gas = false

    if (!w.crashed || ph === 'dying' || ph === 'over') {
      const steps = 4
      for (let i = 0; i < steps; i++) physics(dt / steps, gas && !w.crashed, brake && !w.crashed)
    }
    w.inv = Math.max(0, w.inv - dt)
    // never roll back past the trimmed terrain
    const minX = w.base * DX + size.current.w * 0.6
    if (w.R.x < minX) {
      const dx = minX - w.R.x
      w.R.x += dx
      w.F.x += dx
      w.R.vx = Math.max(0, w.R.vx)
      w.F.vx = Math.max(0, w.F.vx)
    }

    // suspension visual (spring-damper)
    w.compV += (-w.comp * 140 - w.compV * 10) * dt
    w.comp += w.compV * dt * 10

    // fuel
    if (live) {
      const tank = 1 + run.level('tank') * 0.2
      w.fuel = Math.max(0, w.fuel - ((dt / 40) * (gas ? 1.1 : 0.55) * (w.nitro > 0 ? 0.3 : 1)) / tank)
      if (w.fuel < 0.22 && w.fuel > 0) {
        w.lowWarn -= dt
        if (w.lowWarn <= 0) {
          w.lowWarn = 0.8
          sfx.tick()
        }
      }
      const speed = Math.hypot(w.R.vx, w.R.vy)
      if (w.fuel <= 0 && speed < 18) {
        w.stillT += dt
        if (w.stillT > 2) {
          die('OUT OF FUEL!')
          return
        }
      } else w.stillT = 0
    }

    // air time & flips
    const air = !w.R.touch && !w.F.touch
    const na = frameAngle()
    if (air) {
      w.airT += dt
      w.airRot += angDiff(w.lastAng, na)
    } else if (w.airT > 0) {
      if (live && w.airT > 0.35 && !w.crashed) {
        const flips = Math.floor((Math.abs(w.airRot) + 0.6) / TAU)
        const sp = toScreen((w.R.x + w.F.x) / 2, (w.R.y + w.F.y) / 2)
        if (flips > 0) {
          w.combo += 1
          const back = w.airRot < 0
          const pts = flips * 300 * Math.min(5, w.combo)
          w.bonus += pts
          w.stats.flips += flips
          const name = `${flips > 1 ? `${flips}x ` : ''}${back ? 'BACKFLIP' : 'FRONTFLIP'}`
          fx.text(sp.x, sp.y - 60, `${name} +${pts}`, '#fde047', 22)
          fx.burst(sp.x, sp.y, { count: 26, color: ['#fde047', '#ffffff', '#fb923c'], speed: 260 })
          fx.ring(sp.x, sp.y, { color: '#fde047', maxR: 60 })
          sfx.combo()
          haptic.success()
          if (flips >= 2) say(name + '!', `x${Math.min(5, w.combo)}`)
          run.update(w.stats)
        } else if (w.airT > 0.9) {
          const pts = Math.round(w.airT * 60)
          w.bonus += pts
          fx.text(sp.x, sp.y - 50, `AIR ${w.airT.toFixed(1)}s +${pts}`, '#e0f2fe', 16)
          sfx.score(2)
        }
      }
      w.airT = 0
      w.airRot = 0
    }
    w.lastAng = na

    // crash check: head touching the ground
    if ((live || demo) && !w.crashed) {
      const hp = headWorld()
      if (ground(hp.x) - hp.y < 7) {
        if (demo) placeUpright(0)
        else {
          crash('CRASH!')
          if (phaseRef.current !== 'play') return
        }
      }
    }
    if (demo && w.R.x > 30000) {
      world.current = freshWorld()
      initTerrain()
    }

    // rider ragdoll
    const rd = w.rider
    if (rd) {
      rd.vy += G * BIOMES[biomeAt(rd.x)].grav * dt
      rd.x += rd.vx * dt
      rd.y += rd.vy * dt
      rd.rot += rd.vr * dt
      const gy = ground(rd.x) - 8
      if (rd.y > gy) {
        rd.y = gy
        rd.vy *= -0.35
        rd.vx *= 0.7
        rd.vr *= 0.7
      }
    }

    // pickups
    if (live && !w.crashed) {
      const hp = headWorld()
      for (const p of w.picks) {
        if (p.taken) continue
        p.t += raw
        if (Math.abs(p.x - w.R.x) > 100) continue
        const hit = [w.R, w.F, hp].some((q) => (q.x - p.x) ** 2 + (q.y - p.y) ** 2 < 26 * 26)
        if (!hit) continue
        p.taken = true
        const sp = toScreen(p.x, p.y)
        if (p.kind === 'coin') {
          w.coinsGot += 1
          w.stats.coins += 1
          w.bonus += 5
          fx.burst(sp.x, sp.y, { count: 6, color: ['#fde047', '#facc15'], speed: 120, gravity: 0 })
          sfx.pop()
        } else if (p.kind === 'nitro') {
          w.nitro = 3.5
          fx.text(sp.x, sp.y - 30, 'NITRO!', '#7dd3fc', 22)
          fx.ring(sp.x, sp.y, { color: '#38bdf8', maxR: 70 })
          fx.burst(sp.x, sp.y, { count: 16, color: ['#38bdf8', '#e0f2fe', '#fde047'], speed: 220 })
          fx.shake(4, 0.2)
          sfx.power()
          sfx.whoosh()
          haptic.medium()
        } else {
          w.fuel = 1
          fx.text(sp.x, sp.y - 30, 'FUEL FULL!', '#fca5a5', 18)
          fx.ring(sp.x, sp.y, { color: '#ef4444', maxR: 50 })
          sfx.power()
          haptic.medium()
        }
      }
      w.picks = w.picks.filter((p) => !p.taken)
    }

    if (live) {
      w.nitro = Math.max(0, w.nitro - dt)
      updateHazards(dt)
      if (phaseRef.current !== 'play') return
      updateRace(dt)
    }

    // camera
    const cx = (w.R.x + w.F.x) / 2
    const cy = (w.R.y + w.F.y) / 2
    w.camX = approach(w.camX, cx + clamp(w.R.vx * 0.35, -60, 160), 4, raw)
    w.camY = approach(w.camY, cy * 0.65 + (ground(cx) - 40) * 0.35, 4, raw)
    extend()

    // biome & milestones
    const dist = w.R.x / PXM
    if (live) {
      const bi = biomeAt(w.R.x)
      if (bi !== w.biome) {
        w.biome = bi
        say(BIOMES[bi].name.toUpperCase(), bi === 2 ? 'low gravity!' : BIOMES[bi].sub ?? `${Math.floor(dist)} m`)
        sfx.levelUp()
        if (bi === 2 && w.stats.moon === 0) {
          w.stats.moon = 1
          run.update(w.stats)
        }
      }
      if (dist >= w.milestone) {
        const sp = toScreen(cx, cy)
        fx.text(sp.x, sp.y - 90, `${w.milestone} m`, '#fde68a', 20)
        sfx.score(4)
        if (w.milestone % 500 === 0) say(`${w.milestone} M`)
        if (w.milestone % 1000 === 0 && performance.now() - w.lastTrack > 30000) {
          w.lastTrack = performance.now()
          void trackEvent('action_milestone', { game_id: 'bmx', kind: 'distance', value: w.milestone })
        }
        w.milestone += 250
      }
      if (!w.bestPassed && w.bestDist > 80 && dist > w.bestDist) {
        w.bestPassed = true
        const sp = toScreen(cx, cy)
        fx.text(sp.x, sp.y - 110, 'NEW BEST!', '#fde047', 26)
        sfx.win()
        haptic.success()
      }
      w.stats.distance = Math.floor(Math.max(0, dist))
      w.stats.score = w.stats.distance + w.bonus
      w.hudT -= raw
      if (w.hudT <= 0) {
        w.hudT = 0.1
        pushHud()
        run.update(w.stats)
      }
    } else if (demo) w.biome = biomeAt(w.R.x)
  }

  function toScreen(x: number, y: number) {
    const w = world.current
    const { w: W, h: H } = size.current
    return { x: x - w.camX + W * 0.35, y: y - w.camY + H * 0.55 }
  }

  // ── Drawing ───────────────────────────────────────────
  function drawHills(ctx: CanvasRenderingContext2D, W: number, H: number, par: number, base: number, amp: number, color: string, seed: number) {
    const w = world.current
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, H)
    const off = w.camX * par
    for (let x = 0; x <= W + 20; x += 20) {
      const wx = x + off
      const y = base - (Math.sin(wx * 0.004 + seed) * 0.6 + Math.sin(wx * 0.011 + seed * 2) * 0.4) * amp
      ctx.lineTo(x, y)
    }
    ctx.lineTo(W, H)
    ctx.closePath()
    ctx.fill()
  }

  function drawStars(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, n: number, a: number) {
    const w = world.current
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < n; i++) {
      ctx.globalAlpha = a * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + i)))
      const x = (((i * 97 - w.camX * 0.02) % W) + W) % W
      ctx.fillRect(x, (i * 53) % (H * 0.4), 1.6, 1.6)
    }
    ctx.globalAlpha = 1
  }

  function drawAurora(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
    const w = world.current
    ctx.lineCap = 'round'
    for (let band = 0; band < 2; band++) {
      ctx.strokeStyle = band ? 'rgba(167,139,250,0.22)' : 'rgba(74,222,128,0.26)'
      ctx.lineWidth = band ? 18 : 26
      ctx.beginPath()
      for (let x = -20; x <= W + 20; x += 24) {
        const wx = x + w.camX * 0.03
        const y = H * (0.16 + band * 0.07) + Math.sin(wx * 0.012 + t * 0.6 + band * 2) * 18 + Math.sin(wx * 0.03 - t) * 6
        if (x === -20) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }

  /** Jagged ridge line; optional snow caps above 55 % of the amplitude. */
  function drawPeaks(ctx: CanvasRenderingContext2D, W: number, H: number, par: number, base: number, amp: number, color: string, cap: string, seed: number) {
    const w = world.current
    const off = w.camX * par
    const ys: number[] = []
    for (let x = 0; x <= W + 20; x += 20) {
      const wx = x + off
      const p = 1 - Math.abs(Math.sin(wx * 0.0045 + seed))
      const q = 1 - Math.abs(Math.sin(wx * 0.011 + seed * 3))
      ys.push(base - (p * 0.75 + q * 0.25) * amp)
    }
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, H)
    ys.forEach((y, i) => ctx.lineTo(i * 20, y))
    ctx.lineTo(W, H)
    ctx.closePath()
    ctx.fill()
    if (!cap) return
    const line = base - amp * 0.58
    ctx.fillStyle = cap
    ctx.beginPath()
    let open = false
    for (let i = 0; i < ys.length; i++) {
      const x = i * 20
      if (ys[i] < line) {
        if (!open) {
          ctx.moveTo(x - 10, line + 4)
          open = true
        }
        ctx.lineTo(x, ys[i])
      } else if (open) {
        ctx.lineTo(x - 10, line + 4)
        ctx.lineTo(x - 16, line - 2)
        ctx.closePath()
        open = false
      }
    }
    if (open) ctx.lineTo(W + 20, line)
    ctx.fill()
  }

  function drawVolcano(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
    const w = world.current
    const span = W + 500
    const cx = ((((W * 0.6 - w.camX * 0.06) % span) + span) % span) - 250
    const top = H * 0.3
    const base = H * 0.66
    glow(ctx, cx, top, 110, '#f97316', 0.35 + Math.sin(t * 1.7) * 0.08)
    ctx.fillStyle = '#1c1917'
    ctx.beginPath()
    ctx.moveTo(cx - 220, base)
    ctx.lineTo(cx - 34, top)
    ctx.lineTo(cx + 34, top)
    ctx.lineTo(cx + 220, base)
    ctx.closePath()
    ctx.fill()
    // lava streams
    ctx.strokeStyle = '#ea580c'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx - 10, top + 2)
    ctx.quadraticCurveTo(cx - 30, top + 50, cx - 60, top + 110)
    ctx.moveTo(cx + 14, top + 2)
    ctx.quadraticCurveTo(cx + 24, top + 40, cx + 50, top + 80)
    ctx.stroke()
    ctx.fillStyle = '#fb923c'
    ctx.beginPath()
    ctx.ellipse(cx, top + 1, 34, 5, 0, 0, TAU)
    ctx.fill()
    // smoke plume
    ctx.fillStyle = 'rgba(41,37,36,0.55)'
    for (let i = 0; i < 4; i++) {
      const k = (t * 0.15 + i / 4) % 1
      ctx.beginPath()
      ctx.arc(cx + k * 60 + Math.sin(k * 6 + i) * 8, top - 10 - k * 110, 14 + k * 26, 0, TAU)
      ctx.fill()
    }
  }

  /** Screen-space weather: snow for the peaks, rising embers + ash in the badlands. */
  function drawAmbient(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, b: Biome) {
    const w = world.current
    if (b.deco === 'snow') {
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 46; i++) {
        const sp = 30 + (i % 5) * 14
        const x = (((i * 137.5 + Math.sin(t * 0.9 + i) * 18 - w.camX * (0.5 + (i % 3) * 0.2) - t * 30) % (W + 20)) + W + 20) % (W + 20) - 10
        const y = ((i * 71 + t * sp) % (H + 20)) - 10
        ctx.globalAlpha = 0.55 + (i % 3) * 0.15
        ctx.beginPath()
        ctx.arc(x, y, 1.2 + (i % 3) * 0.8, 0, TAU)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    } else if (b.deco === 'lava') {
      for (let i = 0; i < 34; i++) {
        const sp = 26 + (i % 4) * 16
        const x = (((i * 113.3 + Math.sin(t * 1.3 + i) * 14 - w.camX * 0.4) % (W + 20)) + W + 20) % (W + 20) - 10
        const y = H + 10 - ((i * 67 + t * sp) % (H + 20))
        const ember = i % 3 !== 0
        ctx.globalAlpha = ember ? 0.5 + 0.5 * Math.abs(Math.sin(t * 6 + i)) : 0.35
        ctx.fillStyle = ember ? (i % 2 ? '#fb923c' : '#fde047') : '#57534e'
        ctx.fillRect(x, y, ember ? 2.4 : 3.2, ember ? 2.4 : 3.2)
      }
      ctx.globalAlpha = 1
    }
  }

  function drawHazards(ctx: CanvasRenderingContext2D, x0: number, x1: number, t: number) {
    const w = world.current
    for (const hz of w.hazards) {
      if (hz.done || hz.x < x0 - 60 || hz.x > x1 + 60) continue
      const gy = ground(hz.x)
      if (hz.kind === 'rock') {
        // warning: ground marker + shrinking ring = countdown
        const k = hz.armed ? clamp(1 - hz.t / ROCK_WARN, 0, 1) : 1
        const pulse = 0.5 + 0.5 * Math.sin(t * (hz.armed ? 16 : 6))
        ctx.fillStyle = `rgba(0,0,0,${0.18 + (1 - k) * 0.25})`
        ctx.beginPath()
        ctx.ellipse(hz.x, gy, 14 + (1 - k) * 12, 4 + (1 - k) * 2, 0, 0, TAU)
        ctx.fill()
        ctx.strokeStyle = `rgba(239,68,68,${0.55 + pulse * 0.4})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.ellipse(hz.x, gy, 18 + k * 34, 5 + k * 10, 0, 0, TAU)
        ctx.stroke()
        // warning sign post
        ctx.fillStyle = '#334155'
        ctx.fillRect(hz.x - 46, gy - 34, 3, 34)
        ctx.fillStyle = '#facc15'
        ctx.beginPath()
        ctx.moveTo(hz.x - 44.5, gy - 54)
        ctx.lineTo(hz.x - 33, gy - 34)
        ctx.lineTo(hz.x - 56, gy - 34)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = '#1f2937'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = '#1f2937'
        ctx.fillRect(hz.x - 45.5, gy - 48, 2, 8)
        ctx.fillRect(hz.x - 45.5, gy - 38.5, 2, 2)
        if (hz.armed) {
          const ry = rockY(hz)
          if (hz.t < ROCK_WARN) {
            // dotted drop line links the rock to its landing marker
            ctx.fillStyle = `rgba(239,68,68,${0.25 + pulse * 0.3})`
            for (let yy = ry + 22; yy < gy - 10; yy += 14) ctx.fillRect(hz.x - 1.5, yy, 3, 6)
          }
          if (hz.skin === 'meteor') {
            const tg = ctx.createLinearGradient(hz.x, ry - 70, hz.x, ry)
            tg.addColorStop(0, 'rgba(251,146,60,0)')
            tg.addColorStop(1, 'rgba(253,224,71,0.85)')
            ctx.fillStyle = tg
            ctx.beginPath()
            ctx.moveTo(hz.x - 13, ry)
            ctx.lineTo(hz.x - 4, ry - 80)
            ctx.lineTo(hz.x + 4, ry - 80)
            ctx.lineTo(hz.x + 13, ry)
            ctx.closePath()
            ctx.fill()
          } else if (hz.t > ROCK_WARN) {
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(hz.x - 8, ry - 22)
            ctx.lineTo(hz.x - 8, ry - 48)
            ctx.moveTo(hz.x + 7, ry - 24)
            ctx.lineTo(hz.x + 7, ry - 42)
            ctx.stroke()
          }
          ctx.save()
          ctx.translate(hz.x, ry)
          ctx.rotate(hz.t * 5)
          blit(ctx, boulderSprite(hz.skin), 0, 0, 34, 34)
          ctx.restore()
        }
      } else {
        const vs = ventState(hz)
        if (vs.warn || vs.erupt) glow(ctx, hz.x, gy - 6, 30 + vs.k * 20, '#f97316', vs.erupt ? 0.55 : 0.2 + vs.k * 0.35)
        if (vs.hgt > 0) {
          const top = gy - vs.hgt
          const fg = ctx.createLinearGradient(0, top, 0, gy)
          fg.addColorStop(0, 'rgba(254,240,138,0)')
          fg.addColorStop(0.25, 'rgba(251,146,60,0.9)')
          fg.addColorStop(1, 'rgba(220,38,38,0.95)')
          ctx.fillStyle = fg
          ctx.beginPath()
          ctx.moveTo(hz.x - 10, gy - 6)
          for (let i = 0; i <= 6; i++) {
            const yy = gy - 6 - (vs.hgt * i) / 6
            ctx.lineTo(hz.x - 13 + Math.sin(t * 30 + i * 2) * 4 - i * 0.6, yy)
          }
          for (let i = 6; i >= 0; i--) {
            const yy = gy - 6 - (vs.hgt * i) / 6
            ctx.lineTo(hz.x + 13 + Math.sin(t * 27 + i * 3) * 4 + i * 0.6, yy)
          }
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = 'rgba(255,251,235,0.85)'
          ctx.beginPath()
          ctx.ellipse(hz.x, gy - 6 - vs.hgt * 0.35, 4.5, vs.hgt * 0.3, 0, 0, TAU)
          ctx.fill()
        }
        blitBase(ctx, ventSprite(), hz.x, gy + 3, 40, 16)
        // molten core + warning bubbles
        ctx.fillStyle = vs.erupt ? '#fde047' : vs.warn ? (Math.floor(t * 10) % 2 ? '#f97316' : '#fde047') : '#9a3412'
        ctx.beginPath()
        ctx.ellipse(hz.x, gy - 9, 6.5, 2.2, 0, 0, TAU)
        ctx.fill()
        if (vs.warn) {
          ctx.fillStyle = '#fb923c'
          for (let i = 0; i < 3; i++) {
            const kk = (vs.k * 2 + i / 3) % 1
            ctx.globalAlpha = 1 - kk
            ctx.beginPath()
            ctx.arc(hz.x + (i - 1) * 6, gy - 10 - kk * 26 * (0.5 + vs.k), 2.5 + kk * 2, 0, TAU)
            ctx.fill()
          }
          ctx.globalAlpha = 1
          // chevron telegraph above the vent
          ctx.strokeStyle = `rgba(239,68,68,${0.4 + vs.k * 0.6})`
          ctx.lineWidth = 3
          ctx.beginPath()
          for (let i = 0; i < 2; i++) {
            const yy = gy - 60 - i * 14 - vs.k * 10
            ctx.moveTo(hz.x - 9, yy + 7)
            ctx.lineTo(hz.x, yy)
            ctx.lineTo(hz.x + 9, yy + 7)
          }
          ctx.stroke()
        }
      }
    }
  }

  function drawRaceWorld(ctx: CanvasRenderingContext2D, x0: number, x1: number, t: number) {
    const w = world.current
    const r = w.race
    if (!r) return
    // finish arch
    const fxp = r.finish
    if (fxp > x0 - 80 && fxp < x1 + 80) {
      const gy = ground(fxp)
      ctx.fillStyle = '#334155'
      ctx.fillRect(fxp - 40, gy - 90, 5, 90)
      ctx.fillRect(fxp + 35, gy - 90, 5, 90)
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillStyle = (i + j) % 2 ? '#111827' : '#f8fafc'
          ctx.fillRect(fxp - 40 + i * 8, gy - 100 + j * 8 + Math.sin(t * 4 + i * 0.6) * 1.5, 8, 8)
        }
      }
    }
    // the rival: Blaze, purple frame and green lid
    const rx = r.x
    const fxw = rx + WB
    const ry = ground(rx) - WR
    const fy = ground(fxw) - WR
    ctx.globalAlpha = 0.92
    drawBike(ctx, rx, ry, fxw, fy, WR, r.spin, r.spin, 0, { lean: -0.2, crouch: 0.4, pedal: r.spin * 0.5 }, { frame: '#a855f7', shirt: '#111827', helmet: '#22c55e' })
    ctx.globalAlpha = 1
    // name tag
    const hx = (rx + fxw) / 2 + 6
    const hy = Math.min(ry, fy) - 62
    ctx.fillStyle = 'rgba(88,28,135,0.85)'
    ctx.beginPath()
    ctx.roundRect(hx - 22, hy - 10, 44, 15, 7)
    ctx.fill()
    ctx.fillStyle = '#f5d0fe'
    ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.fillText('BLAZE', hx, hy + 1.5)
  }

  function drawRaceHud(ctx: CanvasRenderingContext2D, W: number) {
    const w = world.current
    const r = w.race
    if (!r) return
    const start = r.finish - RACE_LEN * PXM
    const bw = Math.min(220, W - 120)
    const bx = (W - bw) / 2
    const by = 78
    ctx.fillStyle = 'rgba(15,23,42,0.6)'
    ctx.beginPath()
    ctx.roundRect(bx - 8, by - 15, bw + 16, 28, 10)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.fillRect(bx, by + 4, bw, 4)
    const mark = (x: number, col: string) => {
      const k = clamp((x - start) / (r.finish - start), 0, 1)
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(bx + k * bw, by + 6, 5, 0, TAU)
      ctx.fill()
    }
    mark(r.x, '#a855f7')
    mark(w.R.x, '#facc15')
    const left = Math.max(0, Math.ceil((r.finish - w.R.x) / PXM))
    const gap = Math.round((w.R.x - r.x) / PXM)
    ctx.fillStyle = '#ffffff'
    ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.fillText(`RACE · ${left} m to flag · ${gap >= 0 ? 'lead' : 'behind'} ${Math.abs(gap)} m`, W / 2, by - 1)
  }

  function drawCheckpoints(ctx: CanvasRenderingContext2D, x0: number, x1: number) {
    const step = 250 * PXM
    for (let x = Math.ceil(x0 / step) * step; x <= x1 + 40; x += step) {
      if (x <= 0) continue
      const gy = ground(x)
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(x - 1.5, gy - 44, 3, 44)
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.roundRect(x - 20, gy - 58, 40, 16, 4)
      ctx.fill()
      ctx.fillStyle = '#fde68a'
      ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.round(x / PXM)} m`, x, gy - 46.5)
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    update(dt, raw)
    const b = BIOMES[w.biome]

    // sky
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, b.sky0)
    sky.addColorStop(1, b.sky1)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)
    if (b.deco === 'moon') {
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < 50; i++) {
        ctx.globalAlpha = 0.4 + 0.5 * Math.abs(Math.sin(t + i))
        ctx.fillRect((i * 83 - w.camX * 0.02) % W < 0 ? ((i * 83 - w.camX * 0.02) % W) + W : (i * 83 - w.camX * 0.02) % W, (i * 41) % (H * 0.6), 2, 2)
      }
      ctx.globalAlpha = 1
      // earth
      glow(ctx, W * 0.78, H * 0.18, 60, '#60a5fa', 0.4)
      ctx.fillStyle = '#2563eb'
      ctx.beginPath()
      ctx.arc(W * 0.78, H * 0.18, 26, 0, TAU)
      ctx.fill()
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.ellipse(W * 0.78 - 8, H * 0.18 - 4, 10, 7, 0.4, 0, TAU)
      ctx.ellipse(W * 0.78 + 10, H * 0.18 + 8, 7, 5, -0.3, 0, TAU)
      ctx.fill()
    } else if (b.deco === 'snow') {
      drawStars(ctx, W, H, t, 26, 0.45)
      drawAurora(ctx, W, H, t)
      glow(ctx, W * 0.22, H * 0.14, 50, '#e0e7ff', 0.5)
      ctx.fillStyle = '#f1f5f9'
      ctx.beginPath()
      ctx.arc(W * 0.22, H * 0.14, 16, 0, TAU)
      ctx.fill()
    } else if (b.deco === 'lava') {
      drawStars(ctx, W, H, t, 14, 0.25)
      glow(ctx, W * 0.75, H * 0.12, 70, '#fca5a5', 0.35)
      ctx.fillStyle = '#fecaca'
      ctx.beginPath()
      ctx.arc(W * 0.75, H * 0.12, 18, 0, TAU)
      ctx.fill()
    } else {
      glow(ctx, W * 0.8, H * 0.15, 80, '#fef9c3', 0.6)
      ctx.fillStyle = '#fef9c3'
      ctx.beginPath()
      ctx.arc(W * 0.8, H * 0.15, 22, 0, TAU)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      for (let i = 0; i < 3; i++) {
        const cx = ((i * 230 - w.camX * 0.08) % (W + 200) + W + 200) % (W + 200) - 100
        const cy = H * (0.1 + i * 0.07)
        ctx.beginPath()
        ctx.ellipse(cx, cy, 40, 12, 0, 0, TAU)
        ctx.ellipse(cx + 22, cy - 7, 24, 11, 0, 0, TAU)
        ctx.fill()
      }
    }
    if (b.deco === 'snow') {
      drawPeaks(ctx, W, H, 0.1, H * 0.56, 150, '#475569', '#f8fafc', 2)
      drawPeaks(ctx, W, H, 0.2, H * 0.62, 90, b.far, '#e2e8f0', 5)
      drawHills(ctx, W, H, 0.35, H * 0.7, 40, b.near, 4)
    } else if (b.deco === 'lava') {
      drawVolcano(ctx, W, H, t)
      drawPeaks(ctx, W, H, 0.2, H * 0.64, 80, b.far, '', 3)
      // molten river glow on the horizon
      const lg = ctx.createLinearGradient(0, H * 0.62, 0, H * 0.72)
      lg.addColorStop(0, 'rgba(249,115,22,0)')
      lg.addColorStop(0.5, `rgba(249,115,22,${0.45 + Math.sin(t * 2) * 0.1})`)
      lg.addColorStop(1, 'rgba(249,115,22,0)')
      ctx.fillStyle = lg
      ctx.fillRect(0, H * 0.62, W, H * 0.1)
      drawHills(ctx, W, H, 0.35, H * 0.72, 45, b.near, 4)
    } else {
      drawHills(ctx, W, H, 0.15, H * 0.55, 60, b.far, 1)
      drawHills(ctx, W, H, 0.35, H * 0.68, 50, b.near, 4)
    }
    ctx.globalAlpha = 0.25
    ctx.fillStyle = b.sky1
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1

    fx.applyShake(ctx)
    ctx.save()
    ctx.translate(W * 0.35 - w.camX, H * 0.55 - w.camY)

    const x0 = Math.max(w.base * DX, w.camX - W * 0.4)
    const x1 = w.camX + W * 0.7
    const bottom = w.camY + H
    // decorations behind the ground line
    for (const d of w.decos) {
      if (d.x < x0 - 60 || d.x > x1 + 60) continue
      const gy = ground(d.x) + 4
      const db = BIOMES[biomeAt(d.x)]
      if (d.kind === 'tree') blitBase(ctx, treeSprite('#4ade80', '#16a34a'), d.x, gy, 50 * d.s, 80 * d.s)
      else if (d.kind === 'autumn') blitBase(ctx, treeSprite('#fbbf24', '#c2410c'), d.x, gy, 50 * d.s, 80 * d.s)
      else if (d.kind === 'cactus') blitBase(ctx, cactusSprite(), d.x, gy, 40 * d.s, 64 * d.s)
      else if (d.kind === 'mrock') blitBase(ctx, rockSprite('#64748b', '#94a3b8'), d.x, gy, 34 * d.s, 22 * d.s)
      else if (d.kind === 'pine') blitBase(ctx, pineSprite(), d.x, gy, 44 * d.s, 84 * d.s)
      else if (d.kind === 'ice') blitBase(ctx, iceRockSprite(), d.x, gy, 34 * d.s, 26 * d.s)
      else if (d.kind === 'basalt') blitBase(ctx, basaltSprite(), d.x, gy, 36 * d.s, 44 * d.s)
      else blitBase(ctx, rockSprite(db.topDark, db.top), d.x, gy, 34 * d.s, 22 * d.s)
    }
    if (phaseRef.current !== 'idle') drawCheckpoints(ctx, x0, x1)
    // personal best flag
    if (w.bestDist > 80 && phaseRef.current !== 'idle') {
      const bx = w.bestDist * PXM
      if (bx > x0 - 40 && bx < x1 + 40) {
        blitBase(ctx, flagSprite(), bx, ground(bx) + 2, 30, 60)
        ctx.fillStyle = '#ffffff'
        ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.fillText('BEST', bx + 12, ground(bx) - 66)
      }
    }

    // terrain body (bridges show a valley below)
    const dirt = ctx.createLinearGradient(0, w.camY - H * 0.3, 0, bottom)
    dirt.addColorStop(0, b.dirt0)
    dirt.addColorStop(1, b.dirt1)
    ctx.fillStyle = dirt
    ctx.beginPath()
    ctx.moveTo(x0, bottom)
    for (let x = x0; x <= x1; x += DX) ctx.lineTo(x, ground(x) + (isBridge(x) ? 150 : 0))
    ctx.lineTo(x1, bottom)
    ctx.closePath()
    ctx.fill()
    // buried stones for texture
    ctx.fillStyle = b.dirt1
    ctx.globalAlpha = 0.35
    for (let x = Math.floor(x0 / 46) * 46; x <= x1; x += 46) {
      if (isBridge(x)) continue
      const hsh = Math.sin(x * 12.9898) * 43758.5453
      const r = hsh - Math.floor(hsh)
      ctx.beginPath()
      ctx.ellipse(x + r * 20, ground(x) + 22 + r * 50, 5 + r * 6, 3 + r * 3, r, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    // grass / sand top
    ctx.lineJoin = 'round'
    for (const [col, width, off] of [
      [b.topDark, 10, 3],
      [b.top, 6, 0],
    ] as const) {
      ctx.strokeStyle = col
      ctx.lineWidth = width
      ctx.beginPath()
      let pen = false
      for (let x = x0; x <= x1; x += DX) {
        if (isBridge(x)) {
          pen = false
          continue
        }
        const y = ground(x) + off
        if (!pen) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        pen = true
      }
      ctx.stroke()
    }
    // bridges: planks, rails, posts
    let inBr = false
    let brStart = 0
    for (let x = x0; x <= x1 + DX; x += DX) {
      const br = x <= x1 && isBridge(x)
      if (br && !inBr) {
        inBr = true
        brStart = x
      } else if (!br && inBr) {
        inBr = false
        const y = ground(brStart)
        ctx.fillStyle = '#78350f'
        for (let px = brStart; px < x; px += 12) {
          ctx.fillRect(px, y - 1, 10, 7)
        }
        ctx.fillStyle = '#a16207'
        for (let px = brStart; px < x; px += 12) ctx.fillRect(px, y - 1, 10, 2)
        ctx.strokeStyle = '#451a03'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(brStart, y - 22)
        ctx.quadraticCurveTo((brStart + x) / 2, y - 10, x, y - 22)
        ctx.stroke()
        ctx.fillStyle = '#451a03'
        ctx.fillRect(brStart - 3, y - 26, 6, 160)
        ctx.fillRect(x - 3, y - 26, 6, 160)
        for (let px = brStart + 24; px < x - 10; px += 24) {
          ctx.beginPath()
          ctx.moveTo(px, y)
          ctx.lineTo(px, y - 22 + 12 * Math.sin(((px - brStart) / (x - brStart)) * Math.PI))
          ctx.stroke()
        }
      }
    }

    // pickups
    for (const p of w.picks) {
      if (p.x < x0 - 30 || p.x > x1 + 30) continue
      if (p.kind === 'coin') {
        const sx = 0.35 + Math.abs(Math.cos(p.t * 4 + p.x)) * 0.65
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.scale(sx, 1)
        blit(ctx, coinSprite(), 0, 0, 20, 20)
        ctx.restore()
      } else if (p.kind === 'nitro') {
        glow(ctx, p.x, p.y, 32, '#38bdf8', 0.4 + Math.sin(t * 6) * 0.15)
        blit(ctx, nitroSprite(), p.x, p.y + Math.sin(t * 3.4) * 3, 22, 34)
      } else {
        glow(ctx, p.x, p.y, 30, '#ef4444', 0.35 + Math.sin(t * 5) * 0.15)
        blit(ctx, fuelSprite(), p.x, p.y + Math.sin(t * 3) * 3, 26, 32)
      }
    }

    drawHazards(ctx, x0, x1, t)
    drawRaceWorld(ctx, x0, x1, t)

    // bike + rider
    const ctl = controls()
    const blink = w.inv > 0 && Math.floor(t * 12) % 2 === 0
    if (!blink) {
      const lean = phaseRef.current === 'play' ? (ctl.gas ? -0.4 : ctl.brake ? 0.6 : 0) : 0
      drawBike(ctx, w.R.x, w.R.y, w.F.x, w.F.y, WR, w.R.spin, w.F.spin, w.comp, { lean, crouch: 0.3, pedal: w.R.spin * 0.5 }, { frame: '#e11d48', shirt: '#f97316', helmet: '#facc15' }, w.crashed)
    }
    const rd = w.rider
    if (rd) {
      ctx.save()
      ctx.translate(rd.x, rd.y)
      ctx.rotate(rd.rot)
      ctx.strokeStyle = '#f97316'
      ctx.lineWidth = 9
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(0, 18)
      ctx.stroke()
      ctx.strokeStyle = '#1d4ed8'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(0, 18)
      ctx.lineTo(-6, 32)
      ctx.moveTo(0, 18)
      ctx.lineTo(7, 31)
      ctx.stroke()
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.arc(0, -6, 7.5, 0, TAU)
      ctx.fill()
      ctx.restore()
    }

    ctx.restore()
    drawAmbient(ctx, W, H, t, b)
    if (w.nitro > 0 && phaseRef.current === 'play') {
      const a = frameAngle()
      const sp = toScreen(w.R.x - Math.cos(a) * 14, w.R.y - Math.sin(a) * 14 - 6)
      fx.burst(sp.x, sp.y, { count: 2, color: ['#38bdf8', '#e0f2fe', '#fb923c'], speed: 160, angle: a + Math.PI, spread: 0.35, size: 5, life: 0.3, gravity: 0 })
    }
    // dust when driving
    if (phaseRef.current === 'play' && ctl.gas && w.R.touch && w.fuel > 0 && Math.random() < 0.5) {
      const sp = toScreen(w.R.x, w.R.y + WR)
      fx.burst(sp.x, sp.y, { count: 1, color: b.deco === 'moon' ? ['#cbd5e1', '#94a3b8'] : [b.top, b.dirt0, '#e7e5e4'], speed: 90, angle: Math.PI + 0.5, spread: 0.6, size: 4, life: 0.5, gravity: b.deco === 'moon' ? 30 : 120 })
    }
    fx.draw(ctx)
    ctx.restore()
    if (w.fuel < 0.22 && phaseRef.current === 'play') {
      ctx.fillStyle = `rgba(239,68,68,${0.08 + Math.abs(Math.sin(t * 5)) * 0.1})`
      ctx.fillRect(0, 0, W, H)
    }
    if (phaseRef.current === 'play') {
      drawRaceHud(ctx, W)
      if (w.nitro > 0) {
        ctx.fillStyle = 'rgba(56,189,248,0.9)'
        ctx.font = "900 13px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.fillText(`NITRO ${w.nitro.toFixed(1)}s`, W / 2, w.race ? 112 : 84)
      }
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  // dev-only hooks for screenshots: jump ahead, force hazards / events
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const hook = {
      skip(m: number) {
        const w = world.current
        const x = Math.max(0, m) * PXM
        w.ys = []
        w.bridge = []
        w.picks = []
        w.decos = []
        w.hazards = []
        w.race = null
        w.gen = { x: 0, y: 0, slope: 0, target: 0, segLeft: 0, mode: 'hills', modeLeft: 0, craterLen: 0, craterY: 0 }
        initTerrain(x)
        w.nextCoin = x + 400
        w.nextFuel = x + 80 * PXM
        w.nextNitro = Math.max(NITRO_FROM * PXM, x + 150 * PXM)
        w.nextHaz = Math.max(ROCK_FROM * PXM, x + 700)
        w.nextRace = Math.max(RACE_FROM, m + 150)
        w.milestone = (Math.floor(m / 250) + 1) * 250
      },
      god(on: boolean) {
        devGod = on
      },
      spawn(kind: 'rock' | 'vent' | 'nitro') {
        const w = world.current
        const x = w.R.x + (kind === 'vent' ? 170 : 190)
        if (kind === 'nitro') w.picks.push({ kind: 'nitro', x, y: ground(x) - 30, taken: false, t: 0 })
        else if (kind === 'vent') {
          const period = 3.2
          w.hazards.push({ kind: 'vent', x, t: period - VENT_ERUPT - VENT_WARN * 0.4, armed: true, done: false, skin: 'rock', period, near: false })
        } else {
          const b = BIOMES[biomeAt(x)]
          const skin = b.deco === 'snow' ? 'ice' : b.deco === 'moon' || b.deco === 'lava' ? 'meteor' : 'rock'
          w.hazards.push({ kind: 'rock', x, t: 0, armed: false, done: false, skin, period: 0, near: false })
        }
      },
      event() {
        startRace()
      },
      world: () => world.current,
    }
    ;(window as unknown as { __en2bmx?: typeof hook }).__en2bmx = hook
    return () => {
      delete (window as unknown as { __en2bmx?: typeof hook }).__en2bmx
    }
  })

  useEffect(() => {
    function set(e: KeyboardEvent, on: boolean) {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'ArrowUp') {
        e.preventDefault()
        keys.current.gas = on
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowDown') {
        e.preventDefault()
        keys.current.brake = on
      }
    }
    const down = (e: KeyboardEvent) => set(e, true)
    const up = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = localPoint(e, e.currentTarget)
    pointers.current.set(e.pointerId, pt.x > e.currentTarget.clientWidth / 2 ? 'gas' : 'brake')
    pushHud()
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId)
    pushHud()
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
                <div className="action-hud__small">
                  {hud.dist} m · {hud.flips} flips
                </div>
              </div>
              <div className="action-hud__right">
                <div className={`bmx-fuel${hud.fuel < 0.22 ? ' is-low' : ''}`}>
                  <i />
                  <span>
                    <b style={{ width: `${Math.round(hud.fuel * 100)}%` }} />
                  </span>
                </div>
              </div>
            </div>
          )}
          {phase === 'play' && (
            <>
              <div className={`bmx-pedal is-brake${hud.brake ? ' is-down' : ''}`}>BRAKE</div>
              <div className={`bmx-pedal is-gas${hud.gas ? ' is-down' : ''}`}>GAS</div>
            </>
          )}
          {banner && (phase === 'play' || phase === 'dying') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle game="bmx" icon={meta.icon} title={meta.title} hint="Hold the right side for gas, the left side to brake. In the air, gas tilts you back and brake tilts you forward — flip it!" onPlay={start} />
          )}
          <ActionResult
            run={run}
            title={hud.dist >= 800 ? 'Hill legend!' : 'Bailed!'}
            subtitle={`Score ${hud.score} · ${hud.dist} m`}
            celebrate={hud.dist >= 800}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
