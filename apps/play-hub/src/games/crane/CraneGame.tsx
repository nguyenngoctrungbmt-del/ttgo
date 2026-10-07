import { useEffect, useRef, useState } from 'react'
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
import { drawFloor, drawHat, lerpColor, PALS, type Kind } from './art'
import '../../shared/action/action.css'
import './crane.css'

const meta = getGame('crane')

type Phase = 'idle' | 'play' | 'pick' | 'dying' | 'over'

type Floor = { x: number; w: number; kind: Kind; pal: number; lit: number; windows: number; litT: number; seed: number }
type Falling = { x: number; y: number; vx: number; vy: number; w: number; kind: Kind; pal: number; rot: number }
type Piece = { x: number; y: number; vx: number; vy: number; w: number; h: number; rot: number; vr: number; kind: Kind; pal: number; delay: number; life: number; lit: number; seed: number; rested: boolean }
type Walker = { x: number; dir: number; target: number; col: string; t: number }
type Car = { x: number; dir: number; speed: number; col: string; lane: number }
type Cloud = { x: number; y: number; s: number; v: number }

type PowerId = 'steady' | 'wide' | 'hat' | 'slow' | 'magnet' | 'party'
type Power = { id: PowerId; label: string; blurb: string }
const POWERS: Power[] = [
  { id: 'steady', label: 'Tower Dampers', blurb: 'Calm the wobble by 70%' },
  { id: 'wide', label: 'Wide Slabs', blurb: 'Next floor is back to full width' },
  { id: 'hat', label: 'Spare Hard Hat', blurb: '+1 life for missed floors' },
  { id: 'slow', label: 'Gentle Swing', blurb: 'Crane swings slower for 8 drops' },
  { id: 'magnet', label: 'Magnet Hook', blurb: 'Next 5 drops snap PERFECT easier' },
  { id: 'party', label: 'Housewarming', blurb: '+60% residents for 10 floors' },
]

const FH = 30
const BASE_W = 128
const LOBBY_W = 150
const G = 1500
const PIVOT_Y = 84
const ZONES = ['Downtown', 'Rooftops', 'Cloud Line', 'Golden Hour', 'Night Sky', 'Stratosphere', 'Orbit']
// Sky colours keyed by floor count: [floor, top, bottom]
const SKY: [number, string, string][] = [
  [0, '#4fb3e8', '#d8f1ff'],
  [16, '#3d8fd6', '#bfe6ff'],
  [22, '#7f8fd6', '#ffd6c0'],
  [28, '#f08a4b', '#ffd59e'],
  [40, '#5b3a8c', '#f28aa0'],
  [52, '#0b1335', '#2a3f7a'],
  [66, '#02030a', '#0b1028'],
]

function zoneName(n: number) {
  return ZONES[Math.min(ZONES.length - 1, Math.floor(n / 10))]
}

type World = {
  floors: Floor[]
  saved: Floor[] | null
  swing: number
  hangW: number
  hangKind: Kind
  hangPal: number
  refill: number
  falling: Falling | null
  debris: Piece[]
  topple: Piece[]
  walkers: Walker[]
  cars: Car[]
  clouds: Cloud[]
  wobble: number
  swayPhase: number
  hats: number
  combo: number
  perfects: number
  residents: number
  gardens: number
  wind: number
  windTarget: number
  windTimer: number
  windWarn: number
  slow: number
  magnet: number
  party: number
  wide: boolean
  inv: number
  cam: number
  zoom: number
  warnT: number
  warned: boolean
  nextPick: number
  lastMilestone: number
  bestFloors: number
  stats: { floors: number; perfects: number; combo: number; residents: number; gardens: number }
}

function lobby(): Floor {
  return { x: 0, w: LOBBY_W, kind: 'lobby', pal: 0, lit: 0, windows: 0, litT: 9, seed: 1 }
}

function freshWorld(): World {
  const clouds: Cloud[] = []
  for (let i = 0; i < 14; i++) clouds.push({ x: rand(-200, 200), y: 260 + i * 110 + rand(-30, 30), s: rand(0.7, 1.4), v: rand(4, 14) })
  const cars: Car[] = []
  for (let i = 0; i < 4; i++) cars.push({ x: rand(-260, 260), dir: i % 2 ? 1 : -1, speed: rand(40, 80), col: ['#ef4444', '#3b82f6', '#f59e0b', '#10b981'][i], lane: i % 2 })
  return {
    floors: [lobby()],
    saved: null,
    swing: 0,
    hangW: BASE_W,
    hangKind: 'apt',
    hangPal: 0,
    refill: 0,
    falling: null,
    debris: [],
    topple: [],
    walkers: [],
    cars,
    clouds,
    wobble: 0,
    swayPhase: 0,
    hats: 3,
    combo: 0,
    perfects: 0,
    residents: 0,
    gardens: 0,
    wind: 0,
    windTarget: 0,
    windTimer: 6,
    windWarn: 0,
    slow: 0,
    magnet: 0,
    party: 0,
    wide: false,
    inv: 0,
    cam: 0,
    zoom: 1,
    warnT: 0,
    warned: false,
    nextPick: 10,
    lastMilestone: 0,
    bestFloors: 0,
    stats: { floors: 0, perfects: 0, combo: 0, residents: 0, gardens: 0 },
  }
}

function loadBest() {
  try {
    return Number(localStorage.getItem('crane-best-floors') ?? 0) || 0
  } catch {
    return 0
  }
}

function saveBest(n: number) {
  try {
    localStorage.setItem('crane-best-floors', String(n))
  } catch {
    // storage unavailable
  }
}

function PowerIcon({ id }: { id: PowerId }) {
  const c = { steady: '#38bdf8', wide: '#f97316', hat: '#facc15', slow: '#a78bfa', magnet: '#ef4444', party: '#f472b6' }[id]
  return (
    <svg className="crane-pick__icon" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="rgba(0,0,0,0.25)" />
      {id === 'steady' && <path d="M8 26 Q14 14 20 26 T32 26" stroke={c} strokeWidth="4" fill="none" strokeLinecap="round" />}
      {id === 'wide' && <path d="M6 20 L13 13 L13 17 L27 17 L27 13 L34 20 L27 27 L27 23 L13 23 L13 27 Z" fill={c} />}
      {id === 'hat' && (
        <g fill={c}>
          <path d="M9 25 Q9 11 20 11 Q31 11 31 25 Z" />
          <rect x="6" y="24" width="28" height="4" rx="2" />
        </g>
      )}
      {id === 'slow' && (
        <g stroke={c} strokeWidth="3.5" fill="none" strokeLinecap="round">
          <circle cx="20" cy="21" r="11" />
          <path d="M20 14 V21 L25 24" />
        </g>
      )}
      {id === 'magnet' && <path d="M11 10 V22 A9 9 0 0 0 29 22 V10 H23 V22 A3 3 0 0 1 17 22 V10 Z" fill={c} />}
      {id === 'party' && (
        <g fill={c}>
          <rect x="11" y="12" width="18" height="18" rx="2" />
          <rect x="14" y="16" width="4" height="4" fill="#fde68a" />
          <rect x="22" y="16" width="4" height="4" fill="#fde68a" />
          <rect x="18" y="23" width="4" height="7" fill="#7c2d12" />
        </g>
      )}
    </svg>
  )
}

export default function CraneGame() {
  const run = useActionRun('crane')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const view = useRef({ LW: 360, VH: 600, s: 1 })
  const lastEvent = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, floors: 0, combo: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [choices, setChoices] = useState<Power[]>([])

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.residents, floors: w.floors.length - 1, combo: w.combo })
  }

  function say(text: string, sub?: string) {
    setBanner({ key: performance.now(), text, sub })
  }

  // ── Geometry ───────────────────────────────────────────
  function groundY() {
    return view.current.VH - 92
  }
  function ropeLen() {
    const { VH } = view.current
    return Math.max(110, VH * 0.62 - 110 - FH / 2 - PIVOT_Y)
  }
  function topY(w: World) {
    return w.floors.length * FH
  }
  function swayAt(w: World, y: number) {
    const k = Math.min(2.2, Math.pow(Math.max(0, y) / 600, 1.25))
    const amp = 2 + w.wobble * 26 + Math.abs(w.wind) * 0.03
    return Math.sin(w.swayPhase) * amp * k
  }
  function level(w: World) {
    return w.floors.length - 1
  }
  function pivotX(w: World, t: number) {
    const n = level(w)
    const k = clamp((n - 18) / 20, 0, 1)
    return view.current.LW / 2 + Math.sin(t * 0.55) * 46 * k
  }
  function swingAmp(w: World) {
    const n = level(w)
    const steady = phaseRef.current === 'idle' ? 0 : run.level('steady')
    return (0.34 + Math.min(0.2, n * 0.005)) * (1 - steady * 0.07)
  }
  function swingSpeed(w: World) {
    const n = level(w)
    let s = 1.65 + Math.min(1.5, n * 0.03)
    if (w.hangKind === 'concrete') s *= 0.85
    if (w.slow > 0) s *= 0.62
    return s
  }
  function hangPos(w: World) {
    const { LW } = view.current
    const th = Math.sin(w.swing) * swingAmp(w)
    const L = ropeLen()
    const drop = w.refill > 0 ? w.refill * 160 : 0
    const px = pivotX(w, tNow.current)
    return { x: px - LW / 2 + Math.sin(th) * L, sy: PIVOT_Y + Math.cos(th) * L - drop, th, px }
  }
  const tNow = useRef(0)
  /** How far the current wind will push a floor dropped from screen height sy. */
  function windDrift(w: World, sy: number) {
    if (Math.abs(w.wind) < 1) return 0
    const dy = w.cam + (groundY() - sy) - FH / 2 - topY(w)
    const g = w.hangKind === 'concrete' ? G * 1.25 : G
    const tf = Math.sqrt(Math.max(0, (2 * dy) / g))
    return 0.5 * w.wind * tf * tf
  }

  function rollNext(w: World) {
    const k = w.floors.length
    w.hangW = w.wide ? BASE_W : w.floors[k - 1].kind === 'lobby' ? BASE_W : w.floors[k - 1].w
    w.wide = false
    if (k >= 8 && k % 8 === 0) w.hangKind = 'garden'
    else if (k >= 14 && Math.random() < 0.18) w.hangKind = 'concrete'
    else if (k >= 22 && Math.random() < 0.07) w.hangKind = 'gold'
    else w.hangKind = 'apt'
    w.hangPal = Math.floor(Math.random() * PALS.length)
    w.refill = 1
  }

  // ── Run lifecycle ─────────────────────────────────────
  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.hats = 3 + run.level('hats')
    w.bestFloors = loadBest()
    world.current = w
    rollNext(w)
    w.refill = 0.6
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    pushHud()
    say('BUILD!', 'tap to drop the floor')
    sfx.ready()
  }

  function drop() {
    const w = world.current
    const ph = phaseRef.current
    if ((ph !== 'play' && ph !== 'idle') || w.falling || w.refill > 0) return
    const hp = hangPos(w)
    const wy = w.cam + (groundY() - hp.sy)
    w.falling = { x: hp.x, y: wy, vx: 0, vy: 0, w: w.hangW, kind: w.hangKind, pal: w.hangPal, rot: hp.th * 0.5 }
    w.refill = -1
    if (ph === 'play') {
      sfx.whoosh()
      haptic.light()
    }
  }

  function addResidents(w: World, n: number, x: number, y: number) {
    w.residents += n
    w.stats.residents = w.residents
    fx.text(x, -y - 18, `+${n}`, '#fde68a', 17)
    if (phaseRef.current === 'play' && w.walkers.length < 14) {
      const count = Math.min(3, Math.ceil(n / 8))
      for (let i = 0; i < count; i++) {
        const dir = Math.random() < 0.5 ? -1 : 1
        w.walkers.push({ x: -dir * rand(150, 230), dir, target: rand(-8, 8), col: ['#f97316', '#22c55e', '#3b82f6', '#e11d48', '#a855f7'][Math.floor(Math.random() * 5)], t: rand(0, 6) })
      }
    }
  }

  function land(f: Falling) {
    const w = world.current
    const ph = phaseRef.current
    w.falling = null
    const N = w.floors.length
    const top = w.floors[N - 1]
    const ty = topY(w)
    const topX = top.x + swayAt(w, ty - FH / 2)
    const off = f.x - topX
    const guide = ph === 'idle' ? 2 : run.level('guide')
    const tol = w.magnet > 0 ? 12 : 4 + guide * 1.5
    const topW = top.w
    const L = Math.max(f.x - f.w / 2, topX - topW / 2)
    const R = Math.min(f.x + f.w / 2, topX + topW / 2)
    const ov = R - L
    const heavy = f.kind === 'concrete' ? 1.7 : 1
    const steady = ph === 'idle' ? 0 : run.level('steady')

    if (Math.abs(off) <= tol) {
      // PERFECT: snap onto the floor below
      w.combo += 1
      w.perfects += 1
      w.stats.perfects = w.perfects
      w.stats.combo = Math.max(w.stats.combo, w.combo)
      if (w.magnet > 0) w.magnet -= 1
      let nw = Math.min(f.w, topW)
      if (top.kind === 'lobby') nw = f.w
      const regrow = w.combo % 3 === 0 && nw < BASE_W
      if (regrow) nw = Math.min(BASE_W, nw + 8)
      const relX = topX - swayAt(w, ty + FH / 2)
      placeFloor(w, f, relX, nw, true)
      w.wobble *= 0.72
      const sx = topX
      fx.burst(sx, -ty, { count: 22, color: ['#fde047', '#ffffff', '#fbbf24'], speed: 260, shape: 'spark', gravity: 200, angle: -Math.PI / 2, spread: Math.PI * 1.4 })
      fx.ring(sx, -ty - FH / 2, { color: '#fde047', maxR: nw * 0.75, life: 0.4, width: 4 })
      fx.text(sx, -ty - FH - 26, w.combo > 1 ? `PERFECT x${w.combo}` : 'PERFECT', '#fde047', 20 + Math.min(8, w.combo))
      if (regrow) fx.text(sx, -ty - FH - 50, 'WIDER!', '#7dd3fc', 16)
      fx.stop(0.05)
      fx.shake(2 + heavy * 2, 0.12)
      if (ph === 'play') {
        sfx.score(w.combo)
        if (w.combo % 5 === 0) sfx.combo()
        haptic.medium()
      }
    } else if (ov >= 12) {
      w.combo = 0
      const r = Math.abs(off) / topW
      const relX = (L + R) / 2 - swayAt(w, ty + FH / 2)
      placeFloor(w, f, relX, ov, false, r)
      const early = clamp(0.25 + N / 22, 0.25, 1)
      if (w.inv <= 0) w.wobble += r * 0.95 * heavy * early * (1 - steady * 0.1)
      // Overhang slab tumbles away
      const cutW = f.w - ov
      if (cutW > 1) {
        const side = off > 0 ? 1 : -1
        const cx = side > 0 ? R + cutW / 2 : L - cutW / 2
        w.debris.push({ x: cx, y: ty + FH / 2, vx: side * rand(40, 90), vy: rand(60, 140), w: cutW, h: FH, rot: 0, vr: side * rand(1.5, 4), kind: f.kind, pal: f.pal, delay: 0, life: 3, lit: 0, seed: 3, rested: false })
        fx.burst(side > 0 ? R : L, -ty - FH / 2, { count: 12, color: ['#d6d3d1', '#a8a29e', '#78716c'], speed: 160, size: 4, shape: 'square', gravity: 500 })
      }
      fx.burst(f.x, -ty, { count: 10, color: ['#e7e5e4', '#a8a29e'], speed: 120, gravity: 120, size: 4 })
      fx.shake(3 + heavy * 3 + r * 8, 0.18)
      if (ph === 'play') {
        sfx.thud()
        haptic.light()
      }
    } else {
      // Missed: the floor falls past the tower
      w.combo = 0
      const side = off >= 0 ? 1 : -1
      w.debris.push({ x: f.x, y: ty + FH / 2, vx: side * rand(70, 130), vy: 40, w: f.w, h: FH, rot: f.rot, vr: side * rand(2, 4), kind: f.kind, pal: f.pal, delay: 0, life: 4, lit: 0, seed: 5, rested: false })
      if (ph !== 'play') {
        rollNext(w)
        return
      }
      fx.flash('#ef4444', 0.2)
      fx.shake(8, 0.3)
      sfx.miss()
      sfx.hurt()
      haptic.error()
      w.wobble += 0.12 * heavy
      if (w.inv > 0 || level(w) < 3) {
        fx.text(f.x, -ty - 30, 'SAVED!', '#7dd3fc', 20)
      } else {
        w.hats -= 1
        fx.text(f.x, -ty - 30, w.hats > 0 ? 'MISSED!' : 'NO HATS LEFT', '#fca5a5', 20)
      }
      pushHud()
      if (w.hats <= 0) {
        collapse('Out of hard hats')
        return
      }
      rollNext(w)
      return
    }

    w.falling = null
    if (ph === 'play') afterPlace(w)
    else if (w.floors.length > 14) {
      world.current = freshWorld()
      rollNext(world.current)
    } else rollNext(w)
  }

  function placeFloor(w: World, f: Falling, relX: number, width: number, perfect: boolean, r = 0) {
    const windows = f.kind === 'garden' ? 0 : Math.max(1, Math.floor((width - 8) / 18))
    const lit = perfect ? windows : Math.round(windows * clamp(1 - r * 1.6, 0.3, 1))
    const fl: Floor = { x: relX, w: width, kind: f.kind, pal: f.pal, lit, windows, litT: 0, seed: Math.floor(Math.random() * 97) }
    w.floors.push(fl)
    w.falling = null
    const y = topY(w)
    const sx = relX + swayAt(w, y - FH / 2)
    let n = 0
    if (f.kind === 'garden') {
      n = 6 + w.combo
      w.gardens += 1
      w.stats.gardens = w.gardens
      w.wobble *= 0.65
      fx.burst(sx, -y, { count: 18, color: ['#4ade80', '#86efac', '#f9a8d4', '#fde047'], speed: 160, gravity: 120 })
      fx.text(sx, -y - 44, 'GARDEN: CALMER', '#86efac', 15)
    } else {
      n = lit * 2
      if (f.kind === 'concrete') n *= 2
      if (f.kind === 'gold') n *= 3
    }
    if (w.party > 0) {
      n = Math.round(n * 1.6)
      w.party -= 1
    }
    n = Math.round(n * (1 + Math.min(w.combo, 10) * 0.1))
    if (phaseRef.current === 'play') addResidents(w, n, sx, y)
    if (f.kind === 'gold') {
      fx.burst(sx, -y + FH / 2, { count: 26, color: ['#fde047', '#facc15', '#fff7c2'], speed: 240, shape: 'spark', gravity: 80 })
      if (phaseRef.current === 'play') sfx.power()
    }
  }

  function afterPlace(w: World) {
    const n = level(w)
    w.stats.floors = n
    run.update(w.stats)
    pushHud()
    if (n > w.bestFloors && w.bestFloors > 0 && n === w.bestFloors + 1) {
      say('NEW RECORD!', `${n} floors`)
      sfx.levelUp()
    } else if (n % 10 === 0) {
      say(`FLOOR ${n}`, zoneName(n))
      sfx.levelUp()
      haptic.success()
      const now = performance.now()
      if (now - lastEvent.current > 30000) {
        lastEvent.current = now
        void trackEvent('action_milestone', { game_id: 'crane', kind: 'floors', value: n })
      }
    } else if (n === 12) say('WIND AHEAD', 'watch the gusts')
    else if (n === 14) say('HEAVY CONCRETE', 'lands hard — aim true')
    else if (n === 18) say('MOVING CRANE', 'the trolley drifts')
    if (w.slow > 0) w.slow -= 1
    if (n >= w.nextPick) {
      w.nextPick += 10
      const pool = [...POWERS].sort(() => Math.random() - 0.5)
      setChoices(pool.slice(0, 3))
      window.setTimeout(() => {
        if (phaseRef.current === 'play') setPhaseBoth('pick')
      }, 700)
    }
    rollNext(w)
  }

  function choose(p: Power) {
    const w = world.current
    if (p.id === 'steady') w.wobble *= 0.3
    else if (p.id === 'wide') {
      w.wide = true
      w.hangW = BASE_W
    } else if (p.id === 'hat') w.hats += 1
    else if (p.id === 'slow') w.slow = 8
    else if (p.id === 'magnet') w.magnet = 5
    else if (p.id === 'party') w.party = 10
    sfx.power()
    haptic.success()
    say(p.label.toUpperCase())
    setPhaseBoth('play')
  }

  function collapse(reason: string) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    setPhaseBoth('dying')
    w.saved = w.floors.map((f) => ({ ...f }))
    const dir = Math.sin(w.swayPhase) >= 0 ? 1 : -1
    const N = w.floors.length
    w.floors.forEach((f, i) => {
      if (i === 0) return
      const y = i * FH + FH / 2
      const k = i / N
      w.topple.push({
        x: f.x + swayAt(w, y),
        y,
        vx: dir * (30 + 140 * k) + rand(-20, 20),
        vy: rand(0, 60) * k,
        w: f.w,
        h: FH,
        rot: 0,
        vr: dir * rand(0.4, 1.6) * (0.4 + k),
        kind: f.kind,
        pal: f.pal,
        delay: (1 - k) * 0.5,
        life: 6,
        lit: f.lit,
        seed: f.seed,
        rested: false,
      })
    })
    w.floors = [w.floors[0]]
    w.falling = null
    fx.flash('#ef4444', 0.3)
    fx.shake(14, 0.6)
    fx.slowmo(1.2, 0.4)
    sfx.boom(0.9)
    sfx.lose()
    haptic.heavy()
    say('TIMBER!', reason)
    const n = (w.saved?.length ?? 1) - 1
    if (n > w.bestFloors) saveBest(n)
    setHud({ score: w.residents, floors: n, combo: 0 })
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(n * 1.1 + w.perfects * 0.5 + w.gardens)
      run.end({ score: w.residents, cleared: n >= 20, stats: { ...w.stats, floors: n }, coins }, revive)
    }, 2200)
  }

  /** Ad revive: rebuild the tower, steady it and refill hard hats. */
  function revive() {
    const w = world.current
    if (w.saved) w.floors = w.saved.map((f) => ({ ...f }))
    w.saved = null
    w.topple = []
    w.debris = []
    w.hats = Math.max(w.hats, 2)
    w.wobble = 0.2
    w.wind = 0
    w.windTarget = 0
    w.windTimer = 6
    w.inv = 2.5
    w.warned = false
    w.falling = null
    rollNext(w)
    fx.ring(w.floors[w.floors.length - 1].x, -topY(w), { color: '#fde047', maxR: 120, life: 0.6, width: 5 })
    say('REVIVED!', 'tower stabilised')
    pushHud()
    setPhaseBoth('play')
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        if (phaseRef.current === 'play') drop()
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation ────────────────────────────────────────
  function update(w: World, dt: number, raw: number, ph: Phase) {
    const active = ph === 'play' || ph === 'idle'
    w.swayPhase += dt * 1.5
    if (active) w.swing += dt * swingSpeed(w)
    if (w.refill > 0) w.refill = Math.max(0, w.refill - dt * 2.6)
    w.inv = Math.max(0, w.inv - dt)
    for (const f of w.floors) f.litT += dt

    // Idle demo: the crane builds by itself
    if (ph === 'idle' && !w.falling && w.refill === 0) {
      const hp = hangPos(w)
      const top = w.floors[w.floors.length - 1]
      if (Math.abs(hp.x - top.x) < 2.2) drop()
    }

    if (ph === 'play') {
      const n = level(w)
      // Wind gusts after floor 12
      if (n >= 12) {
        if (w.windWarn > 0) {
          w.windWarn -= dt
          if (w.windWarn <= 0) {
            w.windTimer = rand(3, 4.5)
          }
        } else if (w.windTarget !== 0) {
          w.windTimer -= dt
          if (w.windTimer <= 0) {
            w.windTarget = 0
            w.windTimer = rand(5, 9)
          }
        } else {
          w.windTimer -= dt
          if (w.windTimer <= 0) {
            const dir = Math.random() < 0.5 ? -1 : 1
            w.windTarget = dir * Math.min(320, 140 + (n - 12) * 4)
            w.windWarn = 1.3
            sfx.whoosh()
          }
        }
      }
      const blowing = w.windWarn <= 0 && w.windTarget !== 0
      w.wind = approach(w.wind, blowing ? w.windTarget : 0, 2.5, dt)

      // Wobble decays slowly; a leaning tower creeps
      const lean = Math.abs(w.floors.reduce((s, f) => s + f.x, 0) / w.floors.length)
      w.wobble = Math.max(0, w.wobble - dt * 0.018 + Math.max(0, lean - 40) * 0.0012 * dt)
      if (w.wobble > 0.72) {
        w.warnT -= raw
        if (w.warnT <= 0) {
          w.warnT = 0.45
          sfx.tick()
          haptic.light()
        }
        if (!w.warned) {
          w.warned = true
          say('WOBBLY!', 'land perfect to steady it')
        }
      } else if (w.wobble < 0.55) w.warned = false
      if (w.wobble >= 1) collapse('The tower swayed too far')
    }

    // Falling floor
    const f = w.falling
    if (f && (ph === 'play' || ph === 'idle')) {
      const g = f.kind === 'concrete' ? G * 1.25 : G
      f.vy -= g * dt
      f.vx += w.wind * dt
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.rot = approach(f.rot, 0, 10, dt)
      if (f.y - FH / 2 <= topY(w)) {
        f.y = topY(w) + FH / 2
        land(f)
      }
    }
    if (w.refill < 0 && !w.falling && active) w.refill = 1

    // Debris & collapse pieces
    for (const list of [w.debris, w.topple]) {
      for (const p of list) {
        if (p.delay > 0) {
          p.delay -= dt
          continue
        }
        p.life -= dt
        if (p.rested) continue
        p.vy -= G * 0.8 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.rot += p.vr * dt
        if (p.y - p.h / 2 < 0) {
          p.y = p.h / 2
          if (Math.abs(p.vy) > 160) {
            fx.burst(p.x, 0, { count: 8, color: ['#d6d3d1', '#a8a29e', '#78716c'], speed: 140, size: 5, gravity: 200 })
            if (list === w.topple && Math.random() < 0.3) sfx.thud()
          }
          p.vy *= -0.2
          p.vx *= 0.5
          p.vr *= 0.4
          if (Math.abs(p.vy) < 30) {
            p.rested = true
            p.rot = Math.round(p.rot / (Math.PI / 2)) * (Math.PI / 2)
          }
        }
      }
    }
    w.debris = w.debris.filter((p) => p.life > 0)

    // Street life
    for (const c of w.cars) {
      c.x += c.dir * c.speed * dt
      if (c.x > 320) c.x = -320
      if (c.x < -320) c.x = 320
    }
    for (const p of w.walkers) {
      p.t += dt
      p.x += p.dir * 34 * dt
    }
    w.walkers = w.walkers.filter((p) => (p.dir > 0 ? p.x < p.target : p.x > p.target))
    for (const c of w.clouds) {
      c.x += c.v * dt
      if (c.x > 260) c.x = -260
    }

    // Camera
    const { VH } = view.current
    if (ph === 'over' || ph === 'dying') {
      const h = (w.saved?.length ?? w.floors.length) * FH + 80
      const fit = clamp((groundY() - 90) / h, 0.18, 1)
      w.zoom = approach(w.zoom, fit, 2.2, raw)
      w.cam = approach(w.cam, 0, 2.2, raw)
    } else {
      w.zoom = approach(w.zoom, 1, 4, raw)
      const target = Math.max(0, topY(w) - (groundY() - VH * 0.62))
      w.cam = approach(w.cam, target, 3.5, raw)
    }
  }

  // ── Drawing ───────────────────────────────────────────
  function drawSky(ctx: CanvasRenderingContext2D, w: World, LW: number, VH: number, t: number) {
    const fl = w.cam / FH
    let i = 0
    while (i < SKY.length - 2 && fl > SKY[i + 1][0]) i++
    const a = SKY[i]
    const b = SKY[i + 1]
    const k = clamp((fl - a[0]) / (b[0] - a[0]), 0, 1)
    const g = ctx.createLinearGradient(0, 0, 0, VH)
    g.addColorStop(0, lerpColor(a[1], b[1], k))
    g.addColorStop(1, lerpColor(a[2], b[2], k))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, LW, VH)

    // Stars fade in with altitude
    const starA = clamp((fl - 40) / 16, 0, 1)
    if (starA > 0) {
      ctx.fillStyle = '#ffffff'
      for (let s = 0; s < 70; s++) {
        const sx = (s * 97.3) % LW
        const sy = (s * 53.7 + w.cam * 0.05) % VH
        ctx.globalAlpha = starA * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + s)))
        ctx.fillRect(sx, sy, s % 5 === 0 ? 2 : 1.2, s % 5 === 0 ? 2 : 1.2)
      }
      ctx.globalAlpha = 1
    }
    // Sun sinks as you climb, then the planet glow appears in orbit
    const sunK = clamp(fl / 44, 0, 1)
    const sunX = LW * 0.78
    const sunY = 90 + sunK * (VH * 0.55)
    const sunCol = lerpColor('#fff7c2', '#ff7a3d', sunK)
    if (sunK < 1) {
      glow(ctx, sunX, sunY, 90, sunCol, 0.45)
      ctx.fillStyle = sunCol
      ctx.beginPath()
      ctx.arc(sunX, sunY, 24, 0, Math.PI * 2)
      ctx.fill()
    }
    if (fl > 48) {
      const mk = clamp((fl - 48) / 10, 0, 1)
      ctx.globalAlpha = mk
      ctx.fillStyle = '#e5e7eb'
      ctx.beginPath()
      ctx.arc(LW * 0.22, 110, 18, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = lerpColor('#0b1335', '#02030a', clamp((fl - 52) / 14, 0, 1))
      ctx.beginPath()
      ctx.arc(LW * 0.22 + 8, 104, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    if (fl > 60) {
      const ek = clamp((fl - 60) / 10, 0, 1)
      glow(ctx, LW / 2, VH + 380, 560, '#38bdf8', 0.35 * ek)
      ctx.globalAlpha = ek
      ctx.fillStyle = '#1d4ed8'
      ctx.beginPath()
      ctx.arc(LW / 2, VH + 560, 640, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Far skyline (parallax)
    const gy = groundY()
    const far = gy + w.cam * 0.25 * w.zoom
    if (far - 160 < VH) {
      ctx.fillStyle = lerpColor('#9cc9e8', '#3b2a5a', clamp(fl / 40, 0, 1))
      for (let s = 0; s < 14; s++) {
        const bx = ((s * 61) % (LW + 60)) - 30
        const bh = 50 + ((s * 37) % 70)
        ctx.fillRect(bx, far - bh, 42, bh + 200)
      }
      ctx.fillStyle = lerpColor('#6ea7cc', '#2a1d45', clamp(fl / 40, 0, 1))
      const mid = gy + w.cam * 0.5 * w.zoom
      for (let s = 0; s < 9; s++) {
        const bx = ((s * 89 + 20) % (LW + 80)) - 40
        const bh = 34 + ((s * 53) % 60)
        ctx.fillRect(bx, mid - bh, 50, bh + 200)
        ctx.fillStyle = 'rgba(255,240,180,0.35)'
        for (let r = 0; r < bh / 12 - 1; r++) ctx.fillRect(bx + 8 + ((r * 13) % 30), mid - bh + 8 + r * 12, 5, 5)
        ctx.fillStyle = lerpColor('#6ea7cc', '#2a1d45', clamp(fl / 40, 0, 1))
      }
    }
  }

  function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, col: string) {
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.ellipse(x, y, 34 * s, 13 * s, 0, 0, Math.PI * 2)
    ctx.ellipse(x - 18 * s, y + 2 * s, 18 * s, 10 * s, 0, 0, Math.PI * 2)
    ctx.ellipse(x + 10 * s, y - 9 * s, 20 * s, 13 * s, 0, 0, Math.PI * 2)
    ctx.ellipse(x + 26 * s, y + 1 * s, 16 * s, 9 * s, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  function drawStreet(ctx: CanvasRenderingContext2D, w: World, LW: number, t: number) {
    const half = LW / 2 / Math.min(1, w.zoom) + 40
    const cx = LW / 2
    // Sidewalk + road
    ctx.fillStyle = '#9ca3af'
    ctx.fillRect(cx - half, 0, half * 2, 10)
    ctx.fillStyle = '#374151'
    ctx.fillRect(cx - half, 10, half * 2, 46)
    ctx.fillStyle = '#4b5563'
    ctx.fillRect(cx - half, 56, half * 2, 300)
    ctx.fillStyle = '#fde68a'
    for (let x = -Math.ceil(half / 40) * 40; x < half; x += 40) ctx.fillRect(cx + x, 31, 20, 3)
    // Trees
    for (const tx of [-128, -100, 100, 128, -200, 200]) {
      const x = cx + tx
      ctx.fillStyle = '#7c4a21'
      ctx.fillRect(x - 2, -18, 4, 18)
      ctx.fillStyle = '#16a34a'
      ctx.beginPath()
      ctx.arc(x, -24, 11, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#4ade80'
      ctx.beginPath()
      ctx.arc(x - 3, -28, 5, 0, Math.PI * 2)
      ctx.fill()
    }
    // Cars
    for (const c of w.cars) {
      const x = cx + c.x
      const y = c.lane ? 44 : 22
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillRect(x - 15, y + 5, 30, 4)
      ctx.fillStyle = c.col
      ctx.beginPath()
      ctx.roundRect(x - 15, y - 7, 30, 11, 4)
      ctx.fill()
      ctx.beginPath()
      ctx.roundRect(x - 8 + c.dir * 1, y - 13, 15, 8, 3)
      ctx.fill()
      ctx.fillStyle = '#bfdbfe'
      ctx.fillRect(x - 6 + c.dir, y - 11, 11, 4)
      ctx.fillStyle = '#111827'
      ctx.beginPath()
      ctx.arc(x - 9, y + 4, 3.5, 0, Math.PI * 2)
      ctx.arc(x + 9, y + 4, 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fef08a'
      ctx.fillRect(x + c.dir * 14 - 1, y - 4, 2, 3)
    }
    // Residents walking in
    for (const p of w.walkers) {
      const x = cx + p.x
      const bob = Math.abs(Math.sin(p.t * 9)) * 2
      ctx.fillStyle = p.col
      ctx.fillRect(x - 2.5, -11 - bob, 5, 8)
      ctx.fillStyle = '#fcd34d'
      ctx.beginPath()
      ctx.arc(x, -14 - bob, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x - 1.5, -3 - bob)
      ctx.lineTo(x - 1.5 + Math.sin(p.t * 9) * 2, 0)
      ctx.moveTo(x + 1.5, -3 - bob)
      ctx.lineTo(x + 1.5 - Math.sin(p.t * 9) * 2, 0)
      ctx.stroke()
    }
    void t
  }

  function drawCrane(ctx: CanvasRenderingContext2D, w: World, LW: number, t: number, ph: Phase) {
    if (ph === 'over' || ph === 'dying') return
    const hp = hangPos(w)
    const jibY = PIVOT_Y - 30
    // Jib truss across the top
    ctx.fillStyle = '#f59e0b'
    ctx.fillRect(-10, jibY - 8, LW + 20, 4)
    ctx.fillRect(-10, jibY + 8, LW + 20, 4)
    ctx.strokeStyle = '#d97706'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let x = -10; x < LW + 20; x += 16) {
      ctx.moveTo(x, jibY - 5)
      ctx.lineTo(x + 8, jibY + 9)
      ctx.lineTo(x + 16, jibY - 5)
    }
    ctx.stroke()
    // Windsock shows the gust direction
    const sockX = LW - 34
    const windK = clamp(Math.abs(w.wind) / 250 + (w.windWarn > 0 ? 0.4 : 0), 0, 1)
    const wdir = w.windTarget !== 0 ? Math.sign(w.windTarget) : 1
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(sockX, jibY + 10)
    ctx.lineTo(sockX, jibY + 30)
    ctx.stroke()
    ctx.save()
    ctx.translate(sockX, jibY + 14)
    ctx.rotate((1 - windK) * (Math.PI / 2.4) * wdir)
    ctx.scale(wdir, 1)
    for (let s = 0; s < 4; s++) {
      ctx.fillStyle = s % 2 ? '#ffffff' : '#ef4444'
      ctx.fillRect(s * 6, -4 + s * 0.6, 6, 8 - s * 1.2)
    }
    ctx.restore()
    if (w.windWarn > 0 && Math.sin(t * 16) > 0) {
      ctx.fillStyle = '#fef08a'
      ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'right'
      ctx.fillText(wdir > 0 ? 'GUST >>' : '<< GUST', sockX - 10, jibY + 30)
    }
    // Trolley
    const px = hp.px
    ctx.fillStyle = '#374151'
    ctx.beginPath()
    ctx.roundRect(px - 14, jibY - 2, 28, 14, 3)
    ctx.fill()
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(px - 8, jibY + 12, 3, 0, Math.PI * 2)
    ctx.arc(px + 8, jibY + 12, 3, 0, Math.PI * 2)
    ctx.fill()
    if (w.refill < 0) return
    const bx = LW / 2 + hp.x
    const by = hp.sy
    const L = ropeLen()
    const hookD = L - FH / 2 - 16 - (w.refill > 0 ? w.refill * 160 : 0)
    const hx = px + Math.sin(hp.th) * hookD
    const hy = PIVOT_Y + Math.cos(hp.th) * hookD
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.moveTo(px, jibY + 10)
    ctx.lineTo(hx, hy)
    ctx.stroke()
    // Alignment guide: dashed plumb line
    const top = w.floors[w.floors.length - 1]
    const ty = topY(w)
    const topX = LW / 2 + top.x + swayAt(w, ty - FH / 2)
    const guide = run.level('guide')
    const drift = windDrift(w, hp.sy)
    const aligned = Math.abs(bx + drift - topX) <= (w.magnet > 0 ? 12 : 4 + guide * 1.5)
    if (ph === 'play' && w.refill === 0) {
      const topScreen = groundY() - (ty - w.cam)
      ctx.strokeStyle = aligned ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.35)'
      ctx.lineWidth = aligned ? 2 : 1
      ctx.setLineDash([5, 6])
      ctx.beginPath()
      ctx.moveTo(bx, by + FH / 2)
      ctx.quadraticCurveTo(bx, (by + topScreen) / 2, bx + drift, topScreen)
      ctx.stroke()
      ctx.setLineDash([])
    }
    // Hook
    ctx.save()
    ctx.translate(hx, hy)
    ctx.rotate(-hp.th)
    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.roundRect(-7, -6, 14, 9, 2)
    ctx.fill()
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 7, 4, -Math.PI * 0.1, Math.PI * 1.1, false)
    ctx.stroke()
    ctx.restore()
    // Slings to the slab
    ctx.save()
    ctx.translate(bx, by)
    ctx.rotate(-hp.th * 0.5)
    ctx.strokeStyle = 'rgba(31,41,55,0.8)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(-w.hangW * 0.38, -FH / 2)
    ctx.lineTo(0, -FH / 2 - 12)
    ctx.lineTo(w.hangW * 0.38, -FH / 2)
    ctx.stroke()
    const lit = w.hangKind === 'garden' ? 0 : Math.max(1, Math.floor((w.hangW - 8) / 18))
    drawFloor(ctx, 0, -FH / 2, w.hangW, FH, w.hangKind, w.hangPal, 0, lit, 0, 7, t)
    if (w.magnet > 0) {
      ctx.strokeStyle = 'rgba(239,68,68,0.7)'
      ctx.lineWidth = 2
      ctx.strokeRect(-w.hangW / 2 - 3, -FH / 2 - 3, w.hangW + 6, FH + 6)
    }
    ctx.restore()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    const s = Math.min(W / 360, H / 560)
    const LW = W / s
    const VH = H / s
    view.current = { LW, VH, s }
    tNow.current = t
    const w = world.current
    const ph = phaseRef.current
    const dt = ph === 'pick' ? 0 : fx.step(raw)
    if (ph === 'pick') fx.step(0)
    if (ph !== 'pick') update(w, dt, raw, ph)

    ctx.save()
    ctx.scale(s, s)
    drawSky(ctx, w, LW, VH, t)
    const gy = groundY()
    // Clouds at altitude (behind tower)
    for (const c of w.clouds) {
      const sy = gy - (c.y - w.cam * 0.8) * w.zoom
      if (sy < -60 || sy > VH + 40) continue
      drawCloud(ctx, LW / 2 + c.x, sy, c.s * Math.max(0.5, w.zoom), 'rgba(255,255,255,0.75)')
    }
    // Wind streaks
    if (Math.abs(w.wind) > 30) {
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1.5
      const dir = Math.sign(w.wind)
      for (let i = 0; i < 12; i++) {
        const y = (i * 47.3) % VH
        const x = ((t * Math.abs(w.wind) * 1.6 + i * 131) % (LW + 120)) - 60
        const xx = dir > 0 ? x : LW - x
        ctx.beginPath()
        ctx.moveTo(xx, y)
        ctx.lineTo(xx - dir * (20 + Math.abs(w.wind) * 0.12), y)
        ctx.stroke()
      }
    }

    fx.applyShake(ctx)
    ctx.save()
    ctx.translate(LW / 2, gy)
    ctx.scale(w.zoom, w.zoom)
    ctx.translate(-LW / 2, w.cam)
    drawStreet(ctx, w, LW, t)

    // Best-height marker
    if (w.bestFloors > 2 && ph !== 'idle') {
      const by = -(w.bestFloors + 1) * FH
      ctx.strokeStyle = 'rgba(253,224,71,0.7)'
      ctx.lineWidth = 2 / w.zoom
      ctx.setLineDash([8, 6])
      ctx.beginPath()
      ctx.moveTo(LW / 2 - 170, by)
      ctx.lineTo(LW / 2 + 170, by)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#fde047'
      ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'left'
      ctx.fillText(`BEST ${w.bestFloors}`, LW / 2 - 168, by - 6)
    }

    // Tower
    const floors = ph === 'over' && w.saved ? w.saved : w.floors
    const warn = w.wobble > 0.72 && ph === 'play'
    for (let i = 0; i < floors.length; i++) {
      const f = floors[i]
      const yTop = (i + 1) * FH
      const screen = gy - (yTop - w.cam) * w.zoom
      if (screen > VH + 40 || screen < -FH * w.zoom - 40) continue
      const x = LW / 2 + f.x + (ph === 'over' ? 0 : swayAt(w, yTop - FH / 2))
      const litShown = Math.min(f.lit, Math.floor(f.litT * 10))
      drawFloor(ctx, x, -yTop, f.w, FH, f.kind, f.pal, i, litShown, f.litT, f.seed, t)
      if (warn) {
        ctx.fillStyle = `rgba(239,68,68,${0.12 + 0.12 * Math.sin(t * 14)})`
        ctx.fillRect(x - f.w / 2, -yTop, f.w, FH)
      }
    }
    // Falling floor
    const f = w.falling
    if (f) {
      ctx.save()
      ctx.translate(LW / 2 + f.x, -f.y)
      ctx.rotate(-f.rot)
      const lit = f.kind === 'garden' ? 0 : Math.max(1, Math.floor((f.w - 8) / 18))
      drawFloor(ctx, 0, -FH / 2, f.w, FH, f.kind, f.pal, 0, lit, 0, 7, t)
      ctx.restore()
    }
    for (const list of [w.debris, w.topple]) {
      for (const p of list) {
        if (ph === 'over' && list === w.topple) continue
        ctx.save()
        ctx.globalAlpha = Math.min(1, p.life)
        ctx.translate(LW / 2 + p.x, -p.y)
        ctx.rotate(-p.rot)
        drawFloor(ctx, 0, -p.h / 2, p.w, p.h, p.kind, p.pal, 1, p.lit, 9, p.seed, t)
        ctx.restore()
      }
    }
    ctx.globalAlpha = 1
    ctx.save()
    ctx.translate(LW / 2, 0)
    fx.draw(ctx)
    ctx.restore()
    ctx.restore()

    drawCrane(ctx, w, LW, t, ph)
    ctx.restore()

    // Canvas HUD: hard hats + wobble meter
    if (ph === 'play' || ph === 'pick' || ph === 'dying') {
      for (let i = 0; i < Math.min(w.hats, 7); i++) drawHat(ctx, LW - 22 - i * 24, PIVOT_Y + 34, 1)
      const mh = 120
      const mx = 14
      const my = PIVOT_Y + 40
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.beginPath()
      ctx.roundRect(mx, my, 10, mh, 5)
      ctx.fill()
      const wk = clamp(w.wobble, 0, 1)
      ctx.fillStyle = wk > 0.72 ? '#ef4444' : wk > 0.45 ? '#f59e0b' : '#4ade80'
      ctx.beginPath()
      ctx.roundRect(mx + 2, my + mh - 2 - (mh - 4) * wk, 6, (mh - 4) * wk, 3)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = "800 9px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'left'
      ctx.fillText('SWAY', mx - 4, my + mh + 12)
      const tags: string[] = []
      if (w.slow > 0) tags.push(`SLOW ${w.slow}`)
      if (w.magnet > 0) tags.push(`MAGNET ${w.magnet}`)
      if (w.party > 0) tags.push(`PARTY ${w.party}`)
      if (w.inv > 0) tags.push('SHIELD')
      ctx.textAlign = 'right'
      ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      tags.forEach((tg, i) => {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.fillText(tg, LW - 13, PIVOT_Y + 61 + i * 15)
        ctx.fillStyle = '#fde68a'
        ctx.fillText(tg, LW - 14, PIVOT_Y + 60 + i * 15)
      })
    }
    if (ph === 'over' && w.saved) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.beginPath()
      ctx.roundRect(LW / 2 - 100, 12, 200, 28, 14)
      ctx.fill()
      ctx.fillStyle = '#fde68a'
      ctx.font = "800 13px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.fillText(`YOUR TOWER · ${w.saved.length - 1} FLOORS`, LW / 2, 31)
    }
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    rollNext(world.current)
    world.current.floors.push({ x: 0, w: BASE_W, kind: 'apt', pal: 1, lit: 6, windows: 6, litT: 9, seed: 4 })
    world.current.floors.push({ x: 2, w: BASE_W, kind: 'apt', pal: 2, lit: 5, windows: 6, litT: 9, seed: 9 })
  }, [])

  const floors = hud.floors
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div
          className="action-arena"
          onPointerDown={() => {
            if (phaseRef.current === 'play') drop()
          }}
        >
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">residents</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__score" style={{ fontSize: '1.4rem' }}>
                  {floors} <small style={{ fontSize: '0.8rem' }}>floors</small>
                </span>
                {hud.combo > 1 ? <span className="action-hud__small">Perfect x{hud.combo}</span> : null}
              </div>
            </div>
          )}
          {banner && (phase === 'play' || phase === 'dying') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'pick' && (
            <div className="crane-pick" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Floor {floors}!</h3>
              <p>Pick a site perk</p>
              <div className="crane-pick__list">
                {choices.map((p) => (
                  <button key={p.id} type="button" className="crane-pick__card" onClick={() => choose(p)}>
                    <PowerIcon id={p.id} />
                    <strong>{p.label}</strong>
                    <span>{p.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === 'idle' && (
            <ActionIdle
              game="crane"
              icon={meta.icon}
              title={meta.title}
              hint="Tap to drop the swinging floor. Line it up perfectly to keep it wide and move residents in."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={floors >= 20 ? 'Skyline legend!' : 'Timber!'}
            subtitle={`${hud.score} residents · ${floors} floors`}
            celebrate={floors >= 20}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
