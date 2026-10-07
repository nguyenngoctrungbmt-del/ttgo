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
import { MATERIALS, SCREW_COLORS, drawHole, drawScrew, drawSymbol, drawToolbox } from './art'
import { AUTHORED } from './authored'
import { BH, SCREW_R, authoredLevel, covered, makeLevel, plateDist, type LevelDef, type Plate, type Screw } from './levels'
import '../../shared/action/action.css'
import './screwjam.css'

const meta = getGame('screwjam')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type Box = { id: number; color: number; count: number; slot: number; enter: number; enterDelay: number; leave: number; leaveDelay: number; screws: RScrew[] }
type Dest = { kind: 'box'; box: Box; k: number } | { kind: 'tray'; i: number }
type RScrew = Screw & { st: 'board' | 'fly' | 'box' | 'tray' | 'gone'; ft: number; fdelay: number; fx: number; fy: number; dest: Dest | null; shake: number; spin: number }
type Fall = { plate: Plate; ox: number; oy: number; vx: number; vy: number; ang: number; va: number; px: number; py: number }

const FLY = 0.62
const LIFT = 0.22

type World = {
  lv: LevelDef
  n: number
  screws: RScrew[]
  plates: Plate[]
  byId: Map<number, Plate>
  boxes: (Box | null)[]
  leaving: Box[]
  queue: number[]
  tray: (RScrew | null)[]
  trayCap: number
  trayPeak: number
  falls: Fall[]
  wob: Map<number, number>
  drillMode: boolean
  drills: number
  slots: number
  magnets: number
  score: number
  coins: number
  clearT: number
  stars: number
  runClears: number
  pendingEnd: number
  demoT: number
  stats: { score: number; level: number; screws: number; plates: number; perfect: number }
}

let boxUid = 1

function freshWorld(): World {
  return {
    lv: { n: 0, plates: [], screws: [], boxes: [], active: 2, colors: 2, hard: false },
    n: 0,
    screws: [],
    plates: [],
    byId: new Map(),
    boxes: [null, null],
    leaving: [],
    queue: [],
    tray: [],
    trayCap: 5,
    trayPeak: 0,
    falls: [],
    wob: new Map(),
    drillMode: false,
    drills: 1,
    slots: 1,
    magnets: 1,
    score: 0,
    coins: 0,
    clearT: 0,
    stars: 0,
    runClears: 0,
    pendingEnd: 0,
    demoT: 1.2,
    stats: { score: 0, level: 1, screws: 0, plates: 0, perfect: 0 },
  }
}

function easeOutBack(k: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2)
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  ctx.closePath()
}

const SlotIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <rect x="3" y="8" width="18" height="8" rx="4" />
    <path d="M12 2v4M12 18v4M10 4h4" />
  </svg>
)
const DrillIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h9l2 2v2l-2 2H8l-1 7H4l1-7" />
    <path d="M15 10h3l3-1v2l-3-1" />
  </svg>
)
const MagnetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4v8a6 6 0 0 0 12 0V4" />
    <path d="M6 4h4v8a2 2 0 0 0 4 0V4h4" stroke="#fde047" />
  </svg>
)

export default function ScrewJamGame() {
  const run = useActionRun('screwjam')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const lastEvent = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hard: false, drills: 0, slots: 0, magnets: 0, drill: false, boxesLeft: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    const open = w.boxes.filter((b) => b && b.count < 3).length
    setHud({ score: w.score, level: w.n, hard: w.lv.hard, drills: w.drills, slots: w.slots, magnets: w.magnets, drill: w.drillMode, boxesLeft: w.queue.length + open })
  }

  // ── Geometry ──────────────────────────────────
  function geo() {
    const { w: W, h: H } = size.current
    const boxY = 104
    const trayY = 160
    const top = 186
    const bottom = H - 74
    const unit = Math.min(W - 20, (bottom - top) / BH)
    const bx0 = (W - unit) / 2
    const by0 = top + (bottom - top - unit * BH) / 2
    const r = SCREW_R * unit
    const bw = Math.min(150, W * 0.42)
    const bh = 50
    return { W, H, boxY, trayY, top, bottom, unit, bx0, by0, r, bw, bh }
  }

  function P(x: number, y: number) {
    const g = geo()
    return { x: g.bx0 + x * g.unit, y: g.by0 + y * g.unit }
  }

  function boxPos(b: Box) {
    const { W, boxY, bw } = geo()
    const home = W / 2 + (b.slot === 0 ? -1 : 1) * bw * 0.56
    let x = home
    let y = boxY
    let sc = 1
    if (b.enter < 1) {
      const e = easeOutBack(clamp(b.enter, 0, 1))
      x = W + bw + (home - W - bw) * e
    }
    if (b.leave >= 0) {
      const k = clamp(b.leave, 0, 1)
      y = boxY - k * k * 140
      x = home + k * 30 * (b.slot === 0 ? -1 : 1)
      sc = 1 - k * 0.3
    }
    return { x, y, sc }
  }

  function socketPos(b: Box, k: number) {
    const { bw } = geo()
    const p = boxPos(b)
    return { x: p.x + (k - 1) * (bw / 3.3) * p.sc, y: p.y }
  }

  function trayPos(i: number) {
    const { W, trayY } = geo()
    const n = world.current.trayCap
    const span = Math.min(W - 60, n * 46)
    return { x: W / 2 - span / 2 + (i + 0.5) * (span / n), y: trayY }
  }

  function destPos(d: Dest) {
    return d.kind === 'box' ? socketPos(d.box, d.k) : trayPos(d.i)
  }

  // ── Level flow ────────────────────────────────
  function loadLevel(n: number) {
    const w = world.current
    w.n = n
    w.lv = n <= AUTHORED.length ? authoredLevel(n, AUTHORED[n - 1]) : makeLevel(n, Math.floor(Math.random() * 1e9), w.trayCap)
    w.plates = w.lv.plates
    w.byId = new Map(w.plates.map((p) => [p.id, p]))
    w.screws = w.lv.screws.map((s) => ({ ...s, st: 'board' as const, ft: 0, fdelay: 0, fx: 0, fy: 0, dest: null, shake: 0, spin: Math.random() * 6 }))
    w.queue = w.lv.boxes.slice()
    w.boxes = [null, null]
    w.leaving = []
    w.falls = []
    w.wob.clear()
    w.trayCap = 5 + run.level('tray')
    w.tray = Array.from({ length: w.trayCap }, () => null)
    w.trayPeak = 0
    w.drillMode = false
    w.pendingEnd = 0
    for (let s = 0; s < 2; s++) {
      const c = w.queue.shift()
      if (c != null) w.boxes[s] = { id: boxUid++, color: c, count: 0, slot: s, enter: 0, enterDelay: 0.15 + s * 0.12, leave: -1, leaveDelay: 0, screws: [] }
    }
    w.stats.level = n
    if (phaseRef.current !== 'idle') {
      setBanner({ key: Date.now(), text: w.lv.hard ? `LEVEL ${n} · HARD` : `LEVEL ${n}`, sub: `${w.lv.name ? `${w.lv.name} · ` : ''}${w.lv.tip ?? `${w.screws.length} screws · ${w.lv.boxes.length} boxes`}` })
      if (w.lv.hard) sfx.boom(0.3)
      else sfx.ready()
      if (n % 5 === 0 && performance.now() - lastEvent.current > 30000) {
        lastEvent.current = performance.now()
        void trackEvent('action_milestone', { game_id: 'screwjam', kind: 'level', value: n })
      }
      run.update(w.stats)
    }
    pushHud()
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.drills = 1 + run.level('drill')
    w.trayCap = 5 + run.level('tray')
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    loadLevel(Math.max(1, level))
  }

  function levelClear() {
    const w = world.current
    // Stars by spare-tray use: peak 0–1 = 3, 2–3 = 2, more = 1.
    const stars = w.trayPeak <= 1 ? 3 : w.trayPeak <= 3 ? 2 : 1
    w.stars = stars
    run.completeLevel(w.n, stars)
    w.runClears += 1
    if (stars === 3) w.stats.perfect += 1
    const bonus = 100 + stars * 50 + (w.lv.hard ? 150 : 0)
    w.score += bonus
    w.stats.score = w.score
    const gain = 2 + stars + (w.lv.hard ? 3 : 0)
    w.coins += gain
    w.clearT = 2.1
    w.drillMode = false
    setPhaseBoth('clear')
    const { W, H } = geo()
    for (let i = 0; i < 5; i++) fx.burst(rand(W * 0.15, W * 0.85), rand(H * 0.25, H * 0.5), { count: 18, color: ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#ffffff'], speed: 320, shape: 'square', size: 5, gravity: 380, life: 1.1 })
    fx.flash('#fef9c3', 0.18)
    sfx.win()
    haptic.success()
    setBanner({ key: Date.now(), text: `LEVEL ${w.n} CLEAR!`, sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · +${bonus} · +${gain} coins` })
    if (w.n % 3 === 0) {
      const r = w.n % 9 === 0 ? 'slot' : w.n % 6 === 0 ? 'magnet' : 'drill'
      if (r === 'slot') w.slots += 1
      else if (r === 'magnet') w.magnets += 1
      else w.drills += 1
      fx.text(W / 2, H * 0.62, `+1 ${r.toUpperCase()}`, '#fde047', 18)
    }
    run.update(w.stats)
    pushHud()
  }

  // ── Core move ─────────────────────────────────
  function boardScrews() {
    return world.current.screws.filter((s) => s.st === 'board')
  }

  function isCovered(s: RScrew) {
    const w = world.current
    return covered(s, w.plates, w.byId)
  }

  function unscrew(s: RScrew, forceTray = false) {
    const w = world.current
    const play = phaseRef.current === 'play'
    const p = P(s.x, s.y)
    if (s.ice) {
      s.ice = 0
      s.shake = 0.3
      fx.burst(p.x, p.y, { count: 14, color: ['#e0f2fe', '#7dd3fc', '#ffffff'], speed: 200, shape: 'square', size: 3.5, gravity: 400 })
      if (play) {
        sfx.clang()
        haptic.light()
      }
      return
    }
    s.hidden = false
    // destination: open box of this colour, else tray
    let dest: Dest | null = null
    for (const b of w.boxes) {
      if (!forceTray && b && b.color === s.color && b.count < 3 && b.leave < 0) {
        dest = { kind: 'box', box: b, k: b.count }
        b.count++
        b.screws.push(s)
        break
      }
    }
    if (!dest) {
      const i = w.tray.findIndex((x) => !x)
      if (i < 0) return
      w.tray[i] = s
      dest = { kind: 'tray', i }
      const used = w.tray.filter(Boolean).length
      w.trayPeak = Math.max(w.trayPeak, used)
    }
    s.st = 'fly'
    s.ft = 0
    s.fdelay = 0
    s.fx = p.x
    s.fy = p.y
    s.dest = dest
    // plate bookkeeping
    const plate = w.byId.get(s.plate)!
    const rest = w.screws.filter((o) => o.plate === plate.id && o.st === 'board')
    if (!rest.length) dropPlate(plate, p.x)
    else w.wob.set(plate.id, 1)
    fx.burst(p.x, p.y, { count: 6, color: ['#e5e7eb', '#9ca3af'], speed: 90, size: 2, gravity: 200 })
    if (play) {
      sfx.whoosh()
      haptic.light()
      w.score += 10
      w.stats.screws += 1
      w.stats.score = w.score
    }
    resolveBoxes()
    if (play) {
      run.update(w.stats)
      if (w.tray.every(Boolean)) {
        w.pendingEnd = FLY + 0.15
        setBanner({ key: Date.now(), text: 'OUT OF SPACE!', sub: 'the tray is full' })
      } else if (!boardScrews().length && !w.queue.length) {
        w.pendingEnd = -1
      }
    }
    pushHud()
  }

  function dropPlate(plate: Plate, sx: number) {
    const w = world.current
    plate.attached = false
    const c = P(plate.x, plate.y)
    const { unit } = geo()
    w.falls.push({ plate, ox: 0, oy: 0, vx: rand(-40, 40), vy: -80, ang: 0, va: clamp((c.x - sx) / unit, -0.4, 0.4) * 9 + rand(-1, 1), px: c.x, py: c.y })
    if (phaseRef.current === 'play') {
      w.score += 25
      w.stats.plates += 1
      w.stats.score = w.score
      window.setTimeout(() => {
        sfx.thud()
        fx.shake(2, 0.1)
      }, 150)
      fx.text(c.x, c.y - 10, '+25', '#fde68a', 14)
    }
  }

  /** Complete full boxes: they leave, the next box slides in and pulls matching screws from the tray. */
  function resolveBoxes() {
    const w = world.current
    for (let guard = 0; guard < 20; guard++) {
      // tray → any open box with room
      for (const nb of w.boxes) {
        if (!nb || nb.leave >= 0) continue
        let d = 0
        for (let ti = 0; ti < w.tray.length && nb.count < 3; ti++) {
          const s = w.tray[ti]
          if (!s || s.color !== nb.color) continue
          w.tray[ti] = null
          const from = s.st === 'fly' ? null : trayPos(ti)
          s.dest = { kind: 'box', box: nb, k: nb.count }
          nb.count++
          nb.screws.push(s)
          if (from) {
            s.fx = from.x
            s.fy = from.y
            s.ft = LIFT
            s.fdelay = Math.max(0, nb.enterDelay) + (nb.enter < 1 ? 0.35 : 0.05) + d
            s.st = 'fly'
          }
          d += 0.1
        }
      }
      const i = w.boxes.findIndex((b) => b && b.count >= 3 && b.leave < 0)
      if (i < 0) break
      const b = w.boxes[i]!
      const wait = Math.max(0, ...b.screws.map((s) => (s.st === 'fly' ? s.fdelay + (1 - s.ft) * FLY : 0)))
      b.leave = 0
      b.leaveDelay = wait + 0.3
      w.leaving.push(b)
      const c = w.queue.shift()
      w.boxes[i] = c == null ? null : { id: boxUid++, color: c, count: 0, slot: i, enter: 0, enterDelay: b.leaveDelay + 0.45, leave: -1, leaveDelay: 0, screws: [] }
    }
  }

  // ── Boosters ──────────────────────────────────
  function boostSlot() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.slots <= 0) return
    w.slots -= 1
    w.trayCap += 1
    w.tray.push(null)
    const p = trayPos(w.trayCap - 1)
    fx.ring(p.x, p.y, { color: '#fde047', maxR: 30, life: 0.4 })
    sfx.power()
    haptic.medium()
    pushHud()
  }

  function toggleDrill() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    if (w.drillMode) w.drillMode = false
    else if (w.drills > 0) w.drillMode = true
    sfx.tap()
    pushHud()
  }

  function boostMagnet() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.magnets <= 0) return
    // fill the open box that is closest to full with matching screws from anywhere
    const open = w.boxes.filter((b): b is Box => !!b && b.count < 3 && b.leave < 0).sort((a, b) => b.count - a.count)
    for (const b of open) {
      const need = 3 - b.count
      const pool = boardScrews().filter((s) => s.color === b.color)
      if (pool.length < need) continue
      w.magnets -= 1
      pool.sort((a, c) => Number(isCovered(c)) - Number(isCovered(a)))
      for (let i = 0; i < need; i++) {
        const s = pool[i]
        s.ice = 0
        unscrew(s)
      }
      sfx.power()
      haptic.medium()
      pushHud()
      return
    }
    fx.text(geo().W / 2, geo().boxY + 50, 'NO MATCH ON BOARD', '#fecaca', 14)
    sfx.miss()
  }

  // ── Fail / revive ─────────────────────────────
  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    w.drillMode = false
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.3)
    fx.shake(10, 0.4)
    fx.slowmo(1, 0.3)
    fx.stop(0.1)
    sfx.lose()
    haptic.error()
    const { W, trayY } = geo()
    fx.text(W / 2, trayY + 30, 'TRAY FULL!', '#fecaca', 26)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.coins + w.n * 2 + w.stats.screws / 15) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.runClears > 0 && w.n >= 5, stats: { ...w.stats }, coins }, revive)
      pushHud()
    }, 1100)
  }

  /** Revive: two extra tray slots for this level. */
  function revive() {
    const w = world.current
    w.trayCap += 2
    w.tray.push(null, null)
    w.pendingEnd = 0
    setPhaseBoth('play')
    for (let i = w.trayCap - 2; i < w.trayCap; i++) {
      const p = trayPos(i)
      fx.ring(p.x, p.y, { color: '#4ade80', maxR: 34, life: 0.5 })
    }
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: '+2 tray slots' })
    pushHud()
  }

  // ── Input ─────────────────────────────────────
  function pickScrew(px: number, py: number) {
    const w = world.current
    const { r } = geo()
    let best: RScrew | null = null
    let bz = -1
    let bd = Infinity
    for (const s of w.screws) {
      if (s.st !== 'board') continue
      const p = P(s.x, s.y)
      const d = Math.hypot(p.x - px, p.y - py)
      if (d > r * 1.7) continue
      const z = w.byId.get(s.plate)!.z
      const free = !isCovered(s)
      // prefer free screws, then top plates, then nearest
      const key = (free ? 1000 : 0) + z
      if (key > bz || (key === bz && d < bd)) {
        bz = key
        bd = d
        best = s
      }
    }
    return best
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.pendingEnd !== 0) return
    const p = localPoint(e, e.currentTarget)
    const s = pickScrew(p.x, p.y)
    if (!s) return
    if (w.drillMode) {
      w.drillMode = false
      w.drills -= 1
      s.ice = 0
      const q = P(s.x, s.y)
      fx.burst(q.x, q.y, { count: 16, color: ['#fde047', '#fb923c', '#ffffff'], speed: 260, shape: 'spark', gravity: 100 })
      sfx.slash()
      unscrew(s)
      pushHud()
      return
    }
    if (isCovered(s)) {
      s.shake = 0.35
      // wobble the plates on top
      const own = w.byId.get(s.plate)!
      for (const pl of w.plates) if (pl.attached && pl.z > own.z && plateDist(pl, s.x, s.y) < SCREW_R * 0.55) w.wob.set(pl.id, 0.6)
      sfx.miss()
      haptic.light()
      return
    }
    unscrew(s)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'd') toggleDrill()
      else if (e.key === 'm') boostMagnet()
      else if (e.key === 's') boostSlot()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Tick ──────────────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    const { H } = geo()
    for (const s of w.screws) {
      if (s.shake > 0) s.shake = Math.max(0, s.shake - raw)
      if (s.st === 'board' && s.hidden && !isCovered(s)) {
        s.hidden = false
        const p = P(s.x, s.y)
        fx.burst(p.x, p.y, { count: 10, color: [SCREW_COLORS[s.color].base, '#ffffff'], speed: 140, gravity: 0 })
      }
      if (s.st !== 'fly') continue
      if (s.fdelay > 0) {
        s.fdelay -= dt
        continue
      }
      s.ft += dt / FLY
      s.spin += dt * 22
      if (s.ft >= 1) {
        s.ft = 1
        const d = s.dest!
        s.st = d.kind === 'box' ? 'box' : 'tray'
        const p = destPos(d)
        fx.burst(p.x, p.y, { count: 6, color: [SCREW_COLORS[s.color].light, '#ffffff'], speed: 120, size: 2, gravity: 150 })
        if (ph === 'play' || ph === 'clear') {
          sfx.tick()
          if (d.kind === 'box' && d.box.count >= 3 && d.box.screws.every((o) => o.st === 'box')) {
            sfx.match()
            haptic.medium()
            fx.ring(p.x, p.y, { color: SCREW_COLORS[s.color].light, maxR: 40, life: 0.4 })
          }
        }
      }
    }
    for (const b of w.boxes) {
      if (!b) continue
      if (b.enterDelay > 0) b.enterDelay -= dt
      else if (b.enter < 1) {
        b.enter = Math.min(1, b.enter + dt / 0.4)
        if (b.enter >= 1 && ph === 'play') sfx.flip()
      }
    }
    for (const b of w.leaving) {
      if (b.leaveDelay > 0) {
        b.leaveDelay -= dt
        if (b.leaveDelay <= 0 && (ph === 'play' || ph === 'clear')) {
          const p = boxPos(b)
          fx.burst(p.x, p.y, { count: 22, color: [SCREW_COLORS[b.color].base, '#fde047', '#ffffff'], speed: 260, shape: 'square', size: 4, gravity: 300 })
          fx.text(p.x, p.y - 30, 'BOX FULL!', '#fde047', 15)
          w.score += 30
          w.stats.score = w.score
          sfx.combo()
        }
        continue
      }
      b.leave += dt / 0.55
    }
    w.leaving = w.leaving.filter((b) => b.leave < 1)
    for (const s of w.screws) if (s.st === 'box' && s.dest?.kind === 'box' && s.dest.box.leave >= 1) s.st = 'gone'
    for (const f of w.falls) {
      f.vy += 1700 * dt
      f.ox += f.vx * dt
      f.oy += f.vy * dt
      f.ang += f.va * dt
    }
    w.falls = w.falls.filter((f) => f.py + f.oy < H + 200)
    for (const [id, v] of w.wob) {
      const nv = v - raw * 2.2
      if (nv <= 0) w.wob.delete(id)
      else w.wob.set(id, nv)
    }

    if (ph === 'play' && w.pendingEnd !== 0) {
      if (w.pendingEnd > 0) {
        w.pendingEnd -= dt
        if (w.pendingEnd <= 0) {
          w.pendingEnd = 0
          if (w.tray.every(Boolean)) die()
        }
      } else if (!w.screws.some((s) => s.st === 'fly') && !w.leaving.length) {
        w.pendingEnd = 0
        levelClear()
      }
    } else if (ph === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0) {
        setPhaseBoth('play')
        loadLevel(w.n + 1)
      }
    } else if (ph === 'idle') {
      if (!w.screws.length || (!boardScrews().length && !w.screws.some((s) => s.st === 'fly'))) {
        w.trayCap = 5
        loadLevel(2 + Math.floor(Math.random() * 3))
      }
      w.demoT -= raw
      if (w.demoT <= 0) {
        w.demoT = 0.8
        const free = boardScrews().filter((s) => !isCovered(s))
        const want = new Set(w.boxes.filter((b) => b && b.count < 3).map((b) => b!.color))
        const good = free.filter((s) => want.has(s.color))
        const pick = good.length ? good : free
        if (pick.length && w.tray.some((x) => !x)) unscrew(pick[Math.floor(Math.random() * pick.length)])
        else loadLevel(2)
      }
    }
  }

  // ── Render ────────────────────────────────────
  function platePath(ctx: CanvasRenderingContext2D, p: Plate, unit: number) {
    ctx.beginPath()
    if (p.kind === 'disc') ctx.arc(0, 0, p.hw * unit, 0, Math.PI * 2)
    else {
      const rr = Math.min(p.hw, p.hh) * (p.kind === 'bar' ? 1 : 0.35) * unit
      ctx.roundRect(-p.hw * unit, -p.hh * unit, p.hw * 2 * unit, p.hh * 2 * unit, rr)
    }
  }

  function drawPlate(ctx: CanvasRenderingContext2D, p: Plate, rank: number, t: number, fall?: Fall) {
    const w = world.current
    const { unit, r } = geo()
    const c = P(p.x, p.y)
    const band = Math.floor(Math.max(0, w.n - 1) / 5) % MATERIALS.length
    const mat = MATERIALS[band][p.tint % 4]
    const wob = w.wob.get(p.id) ?? 0
    ctx.save()
    ctx.translate(c.x + (fall?.ox ?? 0), c.y + (fall?.oy ?? 0))
    ctx.rotate(p.ang + (fall?.ang ?? 0) + Math.sin(t * 34) * wob * 0.035)
    // drop shadow grows with height
    ctx.save()
    ctx.translate(3 + (fall ? 10 : 0), 6 + (fall ? 16 : 0))
    ctx.fillStyle = `rgba(0,0,0,${fall ? 0.22 : 0.34})`
    platePath(ctx, p, unit)
    ctx.fill()
    ctx.restore()
    const gr = ctx.createLinearGradient(0, -p.hh * unit, 0, p.hh * unit)
    gr.addColorStop(0, mat[0])
    gr.addColorStop(1, mat[1])
    ctx.fillStyle = gr
    platePath(ctx, p, unit)
    ctx.fill()
    ctx.save()
    ctx.clip()
    // material texture
    if (band === 0) {
      ctx.strokeStyle = 'rgba(120,70,30,0.22)'
      ctx.lineWidth = 1.2
      for (let i = -4; i <= 4; i++) {
        ctx.beginPath()
        ctx.moveTo(-p.hw * unit, i * p.hh * unit * 0.25 + Math.sin(i * 3.1 + p.id) * 2)
        ctx.bezierCurveTo(-p.hw * unit * 0.3, i * p.hh * unit * 0.25 + 3, p.hw * unit * 0.3, i * p.hh * unit * 0.25 - 3, p.hw * unit, i * p.hh * unit * 0.25)
        ctx.stroke()
      }
    } else if (band === 1) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 1
      for (let i = -12; i <= 12; i++) {
        ctx.beginPath()
        ctx.moveTo(-p.hw * unit, i * 3)
        ctx.lineTo(p.hw * unit, i * 3 + 1)
        ctx.stroke()
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.beginPath()
      ctx.moveTo(-p.hw * unit, -p.hh * unit)
      ctx.lineTo(-p.hw * unit * 0.4, -p.hh * unit)
      ctx.lineTo(-p.hw * unit * 0.9, p.hh * unit)
      ctx.lineTo(-p.hw * unit, p.hh * unit)
      ctx.fill()
    }
    // top highlight + bottom bevel
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fillRect(-p.hw * unit, -p.hh * unit, p.hw * 2 * unit, 3)
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(-p.hw * unit, p.hh * unit - 4, p.hw * 2 * unit, 4)
    // deeper layers sit in shade
    if (rank > 0 && !fall) {
      ctx.fillStyle = `rgba(15,10,30,${Math.min(0.42, rank * 0.07)})`
      ctx.fillRect(-p.hw * unit - 2, -p.hh * unit - 2, p.hw * 2 * unit + 4, p.hh * 2 * unit + 4)
    }
    ctx.restore()
    ctx.strokeStyle = mat[2]
    ctx.lineWidth = 2
    platePath(ctx, p, unit)
    ctx.stroke()
    ctx.restore()
    // holes + screws (in board space so screws stay upright)
    const ang = p.ang + (fall?.ang ?? 0) + Math.sin(t * 34) * wob * 0.035
    const ca = Math.cos(ang - p.ang)
    const sa = Math.sin(ang - p.ang)
    for (const s of w.screws) {
      if (s.plate !== p.id) continue
      const q = P(s.x, s.y)
      const dx = q.x - c.x
      const dy = q.y - c.y
      const x = c.x + (fall?.ox ?? 0) + dx * ca - dy * sa
      const y = c.y + (fall?.oy ?? 0) + dx * sa + dy * ca
      if (s.st === 'board') {
        const sh = s.shake > 0 ? Math.sin(s.shake * 70) * 3 : 0
        drawScrew(ctx, x + sh, y, r, s.color, s.spin, 0, s.hidden, s.ice > 0)
      } else drawHole(ctx, x, y, r)
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    update(dt, raw)
    const g = geo()

    // workshop backdrop
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, w.lv.hard && ph !== 'idle' ? '#450a0a' : '#1e293b')
    bg.addColorStop(1, '#0b1120')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    glow(ctx, W / 2, g.boxY, W * 0.6, '#fbbf24', 0.12)

    fx.applyShake(ctx)
    // pegboard
    const px0 = g.bx0 - 6
    const py0 = g.by0 - 6
    const pw = g.unit + 12
    const phh = g.unit * BH + 12
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.roundRect(px0 + 4, py0 + 8, pw, phh, 16)
    ctx.fill()
    const pg = ctx.createLinearGradient(0, py0, 0, py0 + phh)
    pg.addColorStop(0, '#a16207')
    pg.addColorStop(1, '#713f12')
    ctx.fillStyle = pg
    ctx.beginPath()
    ctx.roundRect(px0, py0, pw, phh, 16)
    ctx.fill()
    ctx.strokeStyle = '#422006'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = 'rgba(40,20,5,0.45)'
    for (let yy = py0 + 14; yy < py0 + phh - 8; yy += 22) for (let xx = px0 + 14; xx < px0 + pw - 8; xx += 22) {
      ctx.beginPath()
      ctx.arc(xx, yy, 2.2, 0, Math.PI * 2)
      ctx.fill()
    }
    // plates bottom → top
    const attached = w.plates.filter((p) => p.attached).sort((a, b) => a.z - b.z)
    attached.forEach((p, i) => drawPlate(ctx, p, attached.length - 1 - i, t))
    // falling plates
    for (const f of w.falls) drawPlate(ctx, f.plate, 0, t, f)

    // toolbox shelf
    ctx.fillStyle = 'rgba(15,23,42,0.6)'
    ctx.beginPath()
    ctx.roundRect(10, g.boxY - 40, W - 20, 78, 16)
    ctx.fill()
    const drawBox = (b: Box) => {
      const p = boxPos(b)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.scale(p.sc, p.sc)
      drawToolbox(ctx, 0, 0, g.bw, g.bh, b.color, 0)
      ctx.restore()
      for (const s of b.screws) {
        if (s.st !== 'box' || s.dest?.kind !== 'box') continue
        const q = socketPos(b, s.dest.k)
        drawScrew(ctx, q.x, q.y, g.r * 0.95 * p.sc, s.color, s.spin, 0)
      }
      if (b.leave >= 0) {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.scale(p.sc, p.sc)
        drawToolbox(ctx, 0, 0, g.bw, g.bh, b.color, clamp(b.leave * 4, 0, 1))
        ctx.restore()
      }
    }
    for (const b of w.leaving) drawBox(b)
    for (const b of w.boxes) if (b && !w.leaving.includes(b)) drawBox(b)
    // queue preview
    const qx = W - 22
    for (let i = 0; i < Math.min(4, w.queue.length); i++) {
      const c = SCREW_COLORS[w.queue[i]]
      const x = qx - i * 22
      const y = g.boxY - 50
      ctx.globalAlpha = 1 - i * 0.18
      ctx.fillStyle = c.base
      ctx.beginPath()
      ctx.roundRect(x - 9, y - 7, 18, 14, 4)
      ctx.fill()
      ctx.save()
      ctx.translate(x, y)
      drawSymbol(ctx, w.queue[i], 6, c.dark)
      ctx.restore()
    }
    ctx.globalAlpha = 1
    if (w.queue.length > 4 && ph !== 'idle') {
      ctx.fillStyle = '#cbd5e1'
      ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(`+${w.queue.length - 4}`, qx - 4 * 22 + 4, g.boxY - 50)
    }

    // spare tray
    const used = w.tray.filter(Boolean).length
    const danger = used >= w.trayCap - 1
    const t0 = trayPos(0)
    const t1 = trayPos(w.trayCap - 1)
    const tg = ctx.createLinearGradient(0, g.trayY - 18, 0, g.trayY + 18)
    tg.addColorStop(0, '#94a3b8')
    tg.addColorStop(1, '#475569')
    ctx.fillStyle = tg
    ctx.beginPath()
    ctx.roundRect(t0.x - 24, g.trayY - 19, t1.x - t0.x + 48, 38, 19)
    ctx.fill()
    ctx.strokeStyle = danger && ph === 'play' ? (Math.sin(t * 10) > 0 ? '#ef4444' : '#fca5a5') : '#1e293b'
    ctx.lineWidth = danger ? 3 : 2
    ctx.stroke()
    for (let i = 0; i < w.trayCap; i++) {
      const q = trayPos(i)
      ctx.fillStyle = 'rgba(15,23,42,0.6)'
      ctx.beginPath()
      ctx.arc(q.x, q.y, g.r * 0.9, 0, Math.PI * 2)
      ctx.fill()
      const s = w.tray[i]
      if (s && s.st === 'tray') drawScrew(ctx, q.x, q.y, g.r * 0.92, s.color, s.spin, 0)
    }
    // flying screws on top
    for (const s of w.screws) {
      if (s.st !== 'fly' || s.fdelay > 0 || !s.dest) continue
      const d = destPos(s.dest)
      const k = s.ft
      if (k < LIFT) {
        drawScrew(ctx, s.fx, s.fy, g.r, s.color, s.spin, k / LIFT)
      } else {
        const m = (k - LIFT) / (1 - LIFT)
        const e = m * m * (3 - 2 * m)
        const x = s.fx + (d.x - s.fx) * e
        const y = s.fy + (d.y - s.fy) * e - Math.sin(m * Math.PI) * 70
        drawScrew(ctx, x, y, g.r * (1.1 - m * 0.15), s.color, s.spin, 1 - m)
      }
    }
    if (w.drillMode) {
      ctx.strokeStyle = `rgba(253,224,71,${0.5 + Math.sin(t * 8) * 0.3})`
      ctx.lineWidth = 4
      ctx.setLineDash([10, 8])
      ctx.strokeRect(g.bx0 - 4, g.by0 - 4, g.unit + 8, g.unit * BH + 8)
      ctx.setLineDash([])
    }
    fx.draw(ctx)
    ctx.restore()

    if (ph === 'clear') {
      const k = 2.1 - w.clearT
      for (let i = 0; i < 3; i++) {
        const appear = k - 0.25 - i * 0.18
        if (appear < 0) continue
        const sc = easeOutBack(clamp(appear / 0.3, 0, 1))
        const x = W / 2 + (i - 1) * 62
        const y = H * 0.3 - (i === 1 ? 14 : 0)
        const on = i < w.stars
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        starPath(ctx, x + 2, y + 4, 26 * sc)
        ctx.fill()
        const sg = ctx.createLinearGradient(0, y - 26, 0, y + 26)
        sg.addColorStop(0, on ? '#fef08a' : '#64748b')
        sg.addColorStop(1, on ? '#f59e0b' : '#334155')
        ctx.fillStyle = sg
        starPath(ctx, x, y, 26 * sc)
        ctx.fill()
        ctx.strokeStyle = on ? '#fff7ed' : '#94a3b8'
        ctx.lineWidth = 2.5
        ctx.stroke()
      }
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__t2fail = () => {
      const w = world.current
      if (phaseRef.current !== 'play') return
      // dev: jam the tray with board screws
      for (let i = 0; i < 12 && w.tray.some((x) => !x); i++) {
        const s = w.screws.find((o) => o.st === 'board' && !o.ice)
        if (!s) break
        unscrew(s, true)
      }
      die()
    }
    win.__t2level = (n: number) => {
      if (phaseRef.current === 'play') loadLevel(n)
    }
    win.__screwjam = () => {
      const w = world.current
      if (phaseRef.current !== 'play' || w.pendingEnd !== 0) return null
      const free = boardScrews().filter((s) => !isCovered(s))
      const want = new Set(w.boxes.filter((b) => b && b.count < 3 && b.leave < 0).map((b) => b!.color))
      const good = free.filter((s) => want.has(s.color))
      const s = (good.length ? good : free)[0]
      return s ? { tap: P(s.x, s.y) } : null
    }
    return () => {
      delete win.__t2fail
      delete win.__t2level
      delete win.__screwjam
    }
  }, [])

  const won = hud.level >= 5
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena sj-arena" onPointerDown={onDown}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="sj-sub">
                  Level {hud.level}
                  {hud.hard ? <span className="sj-hard">HARD</span> : null}
                </div>
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'clear' || phase === 'dying' ? (
            <div className="sj-boosters">
              <button type="button" className="sj-boost" aria-label="Extra tray slot" disabled={hud.slots <= 0} onPointerDown={stop} onClick={boostSlot}>
                <SlotIcon />
                <span className="sj-boost__n">{hud.slots}</span>
              </button>
              <button type="button" className={`sj-boost${hud.drill ? ' is-on' : ''}`} aria-label="Drill any screw" disabled={hud.drills <= 0 && !hud.drill} onPointerDown={stop} onClick={toggleDrill}>
                <DrillIcon />
                <span className="sj-boost__n">{hud.drills}</span>
              </button>
              <button type="button" className="sj-boost" aria-label="Magnet fills a box" disabled={hud.magnets <= 0} onPointerDown={stop} onClick={boostMagnet}>
                <MagnetIcon />
                <span className="sj-boost__n">{hud.magnets}</span>
              </button>
            </div>
          ) : null}
          {hud.drill && phase === 'play' ? <div className="sj-hint">Tap any screw — even a covered one</div> : null}
          {banner && (phase === 'play' || phase === 'clear') ? (
            <div className="action-banner sj-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="screwjam"
              icon={meta.icon}
              title={meta.title}
              hint="Tap uncovered screws. They fly to the toolbox of their colour — or the spare tray. Don't let the tray fill up!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Master mechanic!' : 'Tray full'}
            subtitle={`Score ${hud.score} · reached level ${hud.level}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
