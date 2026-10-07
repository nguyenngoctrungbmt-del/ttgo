import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { HUES, centreCell, drawAxis, drawKey, drawLock, drawPiece, drawRock, symbolPath } from './art'
import { SX, SY, absCells, canStep, exitDoor, generate, occupancy, specFor, type Block, type Door, type LevelSpec, type Side } from './engine'
import '../../shared/action/action.css'
import { LEVELS, authoredLevel } from './levels'
import './blockjam.css'

const meta = getGame('blockjam')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type Vis = { x: number; y: number; shake: number; pop: number; exit: { side: Side; t: number } | null; rubX: number; rubY: number }
type Drag = { id: number; pid: number; sx: number; sy: number; bx0: number; by0: number; tx: number; ty: number }
type Coin = { x: number; y: number; t: number; d: number }

type World = {
  level: number
  spec: LevelSpec
  blocks: Block[]
  doors: Door[]
  rocks: number[]
  vis: Vis[]
  drag: Drag | null
  time: number
  freeze: number
  score: number
  coins: number
  combo: number
  comboT: number
  hammer: number
  vacuum: number
  freezes: number
  mode: 'none' | 'hammer' | 'vacuum'
  doorFlash: number[]
  failT: number
  clearT: number
  idleT: number
  flying: Coin[]
  stats: { score: number; level: number; blocks: number; stars3: number; hard: number }
}

function freshWorld(): World {
  return {
    level: 0,
    spec: specFor(2),
    blocks: [],
    doors: [],
    rocks: [],
    vis: [],
    drag: null,
    time: 60,
    freeze: 0,
    score: 0,
    coins: 0,
    combo: 0,
    comboT: 0,
    hammer: 1,
    vacuum: 1,
    freezes: 1,
    mode: 'none',
    doorFlash: [],
    failT: 0,
    clearT: 0,
    idleT: 1.2,
    flying: [],
    stats: { score: 0, level: 1, blocks: 0, stars3: 0, hard: 0 },
  }
}

const HammerIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4l6 6-3 3-6-6zM11 7l-8 8 3 3 8-8" />
  </svg>
)
const VacuumIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 21h6a3 3 0 0 0 3-3V8" />
    <path d="M10 8h8l2-5H8z" fill="currentColor" fillOpacity="0.3" />
    <path d="M17 12l3 1M17 15l3 2" />
  </svg>
)
const FreezeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M3.5 7l17 10M3.5 17l17-10M9 4l3 3 3-3M9 20l3-3 3 3" />
  </svg>
)

export default function BlockJamGame() {
  const run = useActionRun('blockjam')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 620 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const lastEvent = useRef(0)
  const secRef = useRef(-1)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hard: false, coins: 0, time: 60, frozen: false, hammer: 0, vacuum: 0, freezes: 0, mode: 'none' as World['mode'], left: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string; stars?: number; hard?: boolean } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({
      score: w.score,
      level: w.level,
      hard: w.spec.hard,
      coins: w.coins,
      time: Math.ceil(w.time),
      frozen: w.freeze > 0,
      hammer: w.hammer,
      vacuum: w.vacuum,
      freezes: w.freezes,
      mode: w.mode,
      left: w.blocks.filter((b) => !b.gone).length,
    })
  }

  const playing = () => phaseRef.current === 'play'

  // ── Geometry ────────────────────────────────────
  function geo() {
    const { w: W, h: H } = size.current
    const { cols, rows } = world.current.spec
    const top = 78
    const bottom = H - 86
    const frame = 18
    const cell = Math.min(54, (W - 2 * frame - 20) / cols, (bottom - top - 2 * frame - 10) / rows)
    const bw = cell * cols
    const bh = cell * rows
    const bx = (W - bw) / 2
    const by = top + frame + Math.max(0, (bottom - top - 2 * frame - bh) / 2)
    return { W, H, cell, bw, bh, bx, by, frame }
  }

  function blockCentre(b: Block, v: Vis) {
    const { cell, bx, by } = geo()
    const [cx, cy] = centreCell(b.cells)
    return { x: bx + (v.x + cx + 0.5) * cell, y: by + (v.y + cy + 0.5) * cell }
  }

  // ── Level ───────────────────────────────────────
  function loadLevel(n: number) {
    const w = world.current
    const lv = authoredLevel(n) ?? generate(specFor(n), Math.floor(Math.random() * 1e9))
    const spec = lv.spec
    w.level = n
    w.spec = spec
    w.blocks = lv.blocks
    w.doors = lv.doors
    w.rocks = lv.rocks
    w.vis = lv.blocks.map((b) => ({ x: b.x, y: b.y, shake: 0, pop: 0, exit: null, rubX: 0, rubY: 0 }))
    w.drag = null
    w.doorFlash = lv.doors.map(() => 0)
    w.time = spec.time + (phaseRef.current === 'idle' ? 0 : run.level('time') * 10)
    w.freeze = 0
    w.mode = 'none'
    w.failT = 0
  }

  // ── Rules glue ──────────────────────────────────
  function onExit(b: Block, door: Door) {
    const w = world.current
    const v = w.vis[b.id]
    const di = w.doors.indexOf(door)
    if (di >= 0) w.doorFlash[di] = 1
    const p = blockCentre(b, v)
    w.drag = null
    if (b.outer >= 0) {
      // peel the outer layer; the block stays
      const hue = HUES[b.outer]
      b.outer = -1
      v.pop = 1
      fx.burst(p.x, p.y, { count: 22, color: [hue.base, hue.light, '#ffffff'], speed: 260, shape: 'square', size: 5, gravity: 300 })
      fx.ring(p.x, p.y, { color: hue.light, maxR: 46, life: 0.35 })
      if (playing()) {
        w.score += 15
        fx.text(p.x, p.y - 24, 'PEEL!', hue.light, 16)
        sfx.flip()
        sfx.pop()
        haptic.medium()
      }
      pushHud()
      return
    }
    b.gone = true
    v.exit = { side: door.side, t: 0 }
    const hue = HUES[b.color]
    fx.burst(p.x, p.y, { count: 16, color: [hue.base, hue.light, '#ffffff'], speed: 220, gravity: 200 })
    afterRemove(b)
    if (!playing()) return
    w.combo = w.comboT > 0 ? w.combo + 1 : 1
    w.comboT = 2.5
    const gain = 20 * Math.min(5, w.combo)
    w.score += gain
    w.stats.blocks += 1
    w.stats.score = w.score
    fx.text(p.x, p.y - 26, w.combo > 1 ? `+${gain} x${w.combo}` : `+${gain}`, w.combo > 1 ? '#fde047' : '#ffffff', 17 + Math.min(6, w.combo))
    sfx.whoosh()
    sfx.score(Math.min(8, w.combo))
    if (w.combo >= 3) sfx.combo()
    haptic.medium()
    run.update(w.stats)
    pushHud()
  }

  /** Thaw frozen blocks and open locks when a key block leaves. */
  function afterRemove(b: Block) {
    const w = world.current
    for (const o of w.blocks) {
      if (o.gone || o.ice <= 0) continue
      o.ice -= 1
      if (o.ice === 0) {
        const p = blockCentre(o, w.vis[o.id])
        fx.burst(p.x, p.y, { count: 18, color: ['#e0f2fe', '#7dd3fc', '#ffffff'], speed: 220, shape: 'square', size: 4, gravity: 300 })
        w.vis[o.id].pop = 1
        if (playing()) sfx.clang()
      }
    }
    if (b.key) {
      for (const o of w.blocks) {
        if (!o.gone && o.locked) {
          o.locked = false
          const p = blockCentre(o, w.vis[o.id])
          fx.burst(p.x, p.y, { count: 16, color: ['#fde047', '#ffffff'], speed: 200, shape: 'spark', gravity: 100 })
          fx.text(p.x, p.y - 20, 'UNLOCKED', '#fde047', 14)
          w.vis[o.id].pop = 1
        }
      }
      if (playing()) sfx.power()
    }
  }

  function stepDrag() {
    const w = world.current
    const d = w.drag
    if (!d) return
    const b = w.blocks[d.id]
    if (!b || b.gone) {
      w.drag = null
      return
    }
    const { cols, rows } = w.spec
    const itx = Math.round(d.tx)
    const ity = Math.round(d.ty)
    for (let k = 0; k < 24; k++) {
      let rx = itx - b.x
      let ry = ity - b.y
      if (b.axis === 1) ry = 0
      if (b.axis === 2) rx = 0
      if (!rx && !ry) break
      const axes: ('x' | 'y')[] = Math.abs(rx) >= Math.abs(ry) ? ['x', 'y'] : ['y', 'x']
      let moved = false
      for (const ax of axes) {
        const r = ax === 'x' ? rx : ry
        if (!r) continue
        const dx = ax === 'x' ? Math.sign(r) : 0
        const dy = ax === 'y' ? Math.sign(r) : 0
        const occ = occupancy(cols, rows, w.blocks, w.rocks)
        if (canStep(cols, rows, occ, b, dx, dy)) {
          b.x += dx
          b.y += dy
          moved = true
          if (playing()) sfx.tick()
          break
        }
        // flush against the wall: maybe a door
        const out = absCells(b, dx, dy).some(([x, y]) => x < 0 || y < 0 || x >= cols || y >= rows)
        if (out) {
          const side: Side = dy < 0 ? 0 : dx > 0 ? 1 : dy > 0 ? 2 : 3
          const door = exitDoor(cols, rows, occ, w.doors, b, side)
          if (door) {
            onExit(b, door)
            return
          }
        }
      }
      if (!moved) break
    }
  }

  function smash(b: Block) {
    const w = world.current
    const v = w.vis[b.id]
    const p = blockCentre(b, v)
    const hue = HUES[b.outer >= 0 ? b.outer : b.color]
    fx.burst(p.x, p.y, { count: 24, color: [hue.base, hue.light, hue.dark], speed: 280, shape: 'square', size: 6, gravity: 600 })
    if (b.outer >= 0) {
      b.outer = -1
      v.pop = 1
      return
    }
    b.gone = true
    v.exit = null
    w.stats.blocks += 1
    afterRemove(b)
  }

  function useHammerOn(b: Block) {
    const w = world.current
    w.hammer -= 1
    w.mode = 'none'
    smash(b)
    const p = blockCentre(b, w.vis[b.id])
    fx.text(p.x, p.y - 30, 'SMASH!', '#fdba74', 20)
    fx.shake(7, 0.25)
    fx.stop(0.06)
    sfx.clang()
    sfx.boom(0.3)
    haptic.heavy()
    w.stats.score = w.score
    run.update(w.stats)
    pushHud()
  }

  function useVacuumOn(b: Block) {
    const w = world.current
    const col = b.outer >= 0 ? b.outer : b.color
    w.vacuum -= 1
    w.mode = 'none'
    let n = 0
    for (const o of w.blocks) {
      if (o.gone || o.locked || o.ice > 0) continue
      if ((o.outer >= 0 ? o.outer : o.color) !== col) continue
      smash(o)
      n++
    }
    const g = geo()
    fx.ring(g.W / 2, g.by + g.bh / 2, { color: HUES[col].light, maxR: 200, life: 0.5, width: 6 })
    fx.text(g.W / 2, g.by + g.bh / 2, `VACUUM x${n}`, HUES[col].light, 22)
    sfx.whoosh()
    sfx.power()
    haptic.heavy()
    w.score += n * 15
    w.stats.score = w.score
    run.update(w.stats)
    pushHud()
  }

  function setMode(m: World['mode']) {
    const w = world.current
    if (!playing()) return
    if (w.mode === m) w.mode = 'none'
    else if ((m === 'hammer' && w.hammer > 0) || (m === 'vacuum' && w.vacuum > 0)) w.mode = m
    sfx.tap()
    pushHud()
  }

  function useFreeze() {
    const w = world.current
    if (!playing() || w.freezes <= 0) return
    w.freezes -= 1
    w.freeze = 10
    fx.flash('#bae6fd', 0.25)
    sfx.power()
    haptic.medium()
    setBanner({ key: Date.now(), text: 'TIME FROZEN', sub: '10 seconds' })
    pushHud()
  }

  // ── Lifecycle ───────────────────────────────────
  function start(level?: number) {
    void unlockAudio()
    const first = typeof level === 'number' && level >= 1 ? Math.floor(level) : run.nextLevel
    const w = freshWorld()
    w.hammer = 1 + run.level('hammer')
    world.current = w
    fx.reset()
    setPhaseBoth('play')
    run.begin()
    beginLevel(first)
  }

  function beginLevel(n: number) {
    const w = world.current
    loadLevel(n)
    w.stats.level = n
    const spec = w.spec
    setBanner({ key: Date.now(), text: spec.hard ? 'HARD LEVEL' : `LEVEL ${n}`, sub: [LEVELS[n - 1]?.name, spec.intro ?? (spec.hard ? 'beat the clock' : `${w.blocks.length} blocks`)].filter(Boolean).join(' · '), hard: spec.hard })
    if (spec.hard) sfx.boom(0.3)
    else sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function levelClear() {
    const w = world.current
    const total = w.spec.time + run.level('time') * 10
    const frac = w.time / total
    // Stars by time left: half the clock = 3, a quarter = 2, otherwise 1.
    const stars = frac >= 0.5 ? 3 : frac >= 0.25 ? 2 : 1
    run.completeLevel(w.level, stars)
    const bonus = 100 + stars * 50 + Math.round(w.time) * 3 + (w.spec.hard ? 200 : 0)
    w.score += bonus
    w.coins += 2 + stars + (w.spec.hard ? 5 : 0)
    if (stars === 3) w.stats.stars3 += 1
    if (w.spec.hard) w.stats.hard += 1
    w.stats.score = w.score
    let gift = ''
    if (w.spec.hard) {
      w.vacuum += 1
      gift = ' · +1 vacuum'
    } else if (w.level % 3 === 0) {
      if (Math.random() < 0.5) {
        w.hammer += 1
        gift = ' · +1 hammer'
      } else {
        w.freezes += 1
        gift = ' · +1 freeze'
      }
    }
    setPhaseBoth('clear')
    w.clearT = 1.9
    w.drag = null
    const g = geo()
    for (let k = 0; k < 4; k++) fx.burst(g.W * (0.2 + k * 0.2), g.H * 0.4, { count: 18, color: ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#ffffff'], speed: 360, shape: 'square', size: 5, gravity: 420, life: 1.1 })
    for (let k = 0; k < 2 + stars * 2; k++) w.flying.push({ x: g.W / 2 + rand(-40, 40), y: g.H * 0.45 + rand(-20, 20), t: 0, d: 0.5 + k * 0.08 })
    fx.flash('#fef9c3', 0.2)
    sfx.win()
    haptic.success()
    setBanner({ key: Date.now(), text: w.spec.hard ? 'HARD LEVEL BEATEN!' : `LEVEL ${w.level} CLEAR!`, sub: `+${bonus}${gift}`, stars })
    if ((w.level % 5 === 0 || w.spec.hard) && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'blockjam', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  function fail() {
    const w = world.current
    if (!playing()) return
    w.failT = 1
    w.drag = null
    setPhaseBoth('dying')
    setBanner({ key: Date.now(), text: "TIME'S UP!", hard: true })
    fx.flash('#ef4444', 0.3)
    fx.shake(10, 0.4)
    fx.slowmo(0.8, 0.4)
    sfx.lose()
    haptic.error()
  }

  function die() {
    const w = world.current
    setPhaseBoth('over')
    const coins = Math.round((w.coins + w.level) * (1 + run.level('bounty') * 0.15))
    run.end({ score: w.score, cleared: w.level >= 5, stats: { ...w.stats }, coins }, revive)
    pushHud()
  }

  /** Revive: 30 more seconds on the clock and a free time freeze. */
  function revive() {
    const w = world.current
    w.time = Math.max(0, w.time) + 30
    w.freezes += 1
    w.failT = 0
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: '+30 s · +1 freeze' })
    const g = geo()
    fx.ring(g.W / 2, g.by + g.bh / 2, { color: '#7dd3fc', maxR: 180, life: 0.6 })
    pushHud()
  }

  // ── Input ───────────────────────────────────────
  function blockAt(x: number, y: number) {
    const w = world.current
    const g = geo()
    const cx = Math.floor((x - g.bx) / g.cell)
    const cy = Math.floor((y - g.by) / g.cell)
    if (cx < 0 || cy < 0 || cx >= w.spec.cols || cy >= w.spec.rows) return null
    const o = occupancy(w.spec.cols, w.spec.rows, w.blocks, w.rocks)[cy * w.spec.cols + cx]
    return o >= 0 ? w.blocks[o] : null
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (!playing()) return
    const w = world.current
    const p = localPoint(e, e.currentTarget)
    const b = blockAt(p.x, p.y)
    if (!b) return
    if (w.mode === 'hammer') return useHammerOn(b)
    if (w.mode === 'vacuum') return useVacuumOn(b)
    const v = w.vis[b.id]
    if (b.locked || b.ice > 0) {
      v.shake = 0.35
      const c = blockCentre(b, v)
      fx.text(c.x, c.y - 22, b.locked ? 'Locked!' : `Frozen ${b.ice}`, b.locked ? '#fde047' : '#bae6fd', 14)
      sfx.clang()
      haptic.light()
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    w.drag = { id: b.id, pid: e.pointerId, sx: p.x, sy: p.y, bx0: b.x, by0: b.y, tx: b.x, ty: b.y }
    v.pop = 0.5
    sfx.tap()
    haptic.light()
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const w = world.current
    const d = w.drag
    if (!d || d.pid !== e.pointerId) return
    const p = localPoint(e, e.currentTarget)
    const { cell } = geo()
    d.tx = d.bx0 + (p.x - d.sx) / cell
    d.ty = d.by0 + (p.y - d.sy) / cell
  }

  function onUp(e: PointerEvent<HTMLDivElement>) {
    const w = world.current
    if (!w.drag || w.drag.pid !== e.pointerId) return
    stepDrag()
    w.drag = null
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'h') setMode('hammer')
      else if (e.key === 'v') setMode('vacuum')
      else if (e.key === 'f') useFreeze()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Tick ────────────────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    if (ph === 'idle') {
      if (!w.blocks.length) loadLevel(3)
      w.idleT -= raw
      if (w.idleT <= 0) {
        w.idleT = 1.1
        const { cols, rows } = w.spec
        const occ = occupancy(cols, rows, w.blocks, w.rocks)
        let done = false
        for (const b of w.blocks) {
          if (b.gone || done) continue
          for (const s of [0, 1, 2, 3] as Side[]) {
            // slide toward that wall, then try the door
            const save = [b.x, b.y]
            while (canStep(cols, rows, occ, b, SX[s], SY[s])) {
              b.x += SX[s]
              b.y += SY[s]
            }
            const door = exitDoor(cols, rows, occupancy(cols, rows, w.blocks, w.rocks), w.doors, b, s)
            if (door) {
              onExit(b, door)
              done = true
              break
            }
            ;[b.x, b.y] = save
          }
        }
        if (!done) loadLevel(3)
      }
    }
    if (w.drag) stepDrag()
    for (const b of w.blocks) {
      const v = w.vis[b.id]
      v.shake = Math.max(0, v.shake - raw)
      v.pop = Math.max(0, v.pop - raw * 3)
      if (v.exit) {
        v.exit.t += dt
        continue
      }
      if (b.gone) continue
      let rx = 0
      let ry = 0
      if (w.drag && w.drag.id === b.id) {
        rx = Math.max(-0.22, Math.min(0.22, w.drag.tx - b.x))
        ry = Math.max(-0.22, Math.min(0.22, w.drag.ty - b.y))
        if (b.axis === 1) ry = 0
        if (b.axis === 2) rx = 0
      }
      v.rubX += (rx - v.rubX) * Math.min(1, dt * 18)
      v.rubY += (ry - v.rubY) * Math.min(1, dt * 18)
      const k = 1 - Math.exp(-22 * dt)
      v.x += (b.x + v.rubX - v.x) * k
      v.y += (b.y + v.rubY - v.y) * k
    }
    for (let i = 0; i < w.doorFlash.length; i++) w.doorFlash[i] = Math.max(0, w.doorFlash[i] - raw * 2)
    w.comboT = Math.max(0, w.comboT - dt)
    for (const c of w.flying) c.t += raw
    if (w.flying.some((c) => c.t >= c.d + 0.55)) {
      w.flying = w.flying.filter((c) => c.t < c.d + 0.55)
      sfx.tick()
    }

    if (ph === 'play') {
      if (w.freeze > 0) w.freeze = Math.max(0, w.freeze - dt)
      else w.time = Math.max(0, w.time - dt)
      const sec = Math.ceil(w.time)
      if (sec !== secRef.current) {
        secRef.current = sec
        if (sec <= 10 && sec > 0 && w.freeze <= 0) sfx.tick()
        pushHud()
      }
      if (w.time <= 0) fail()
      else if (w.blocks.every((b) => b.gone) && w.vis.every((v) => !v.exit || v.exit.t > 0.45)) levelClear()
    } else if (ph === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0) {
        setPhaseBoth('play')
        beginLevel(w.level + 1)
      }
    } else if (ph === 'dying') {
      w.failT -= raw
      if (w.failT <= 0 && w.failT > -1) {
        w.failT = -5
        die()
      }
    }
  }

  // ── Render ──────────────────────────────────────
  function doorRect(d: Door) {
    const g = geo()
    const t = g.frame
    if (d.side === 0) return { x: g.bx + d.at * g.cell, y: g.by - t - 4, w: d.len * g.cell, h: t + 4 }
    if (d.side === 2) return { x: g.bx + d.at * g.cell, y: g.by + g.bh, w: d.len * g.cell, h: t + 4 }
    if (d.side === 3) return { x: g.bx - t - 4, y: g.by + d.at * g.cell, w: t + 4, h: d.len * g.cell }
    return { x: g.bx + g.bw, y: g.by + d.at * g.cell, w: t + 4, h: d.len * g.cell }
  }

  function drawBoard(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const g = geo()
    const { W, H } = g
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#312e81')
    bg.addColorStop(1, '#1e1b4b')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 18; i++) {
      const x = (i * 83 + Math.sin(t * 0.3 + i) * 10) % W
      const y = (i * 131) % H
      ctx.fillStyle = `rgba(165,180,252,${0.05 + (i % 3) * 0.03})`
      ctx.beginPath()
      ctx.roundRect(x, y, 14 + (i % 4) * 6, 14 + (i % 4) * 6, 4)
      ctx.fill()
    }
    // frame
    ctx.fillStyle = '#0f0d2e'
    ctx.beginPath()
    ctx.roundRect(g.bx - g.frame - 2, g.by - g.frame + 4, g.bw + 2 * g.frame + 4, g.bh + 2 * g.frame + 2, 18)
    ctx.fill()
    const fr = ctx.createLinearGradient(0, g.by - g.frame, 0, g.by + g.bh + g.frame)
    fr.addColorStop(0, '#6366f1')
    fr.addColorStop(1, '#3730a3')
    ctx.fillStyle = fr
    ctx.beginPath()
    ctx.roundRect(g.bx - g.frame, g.by - g.frame, g.bw + 2 * g.frame, g.bh + 2 * g.frame, 16)
    ctx.fill()
    // floor
    ctx.fillStyle = '#e0e7ff'
    ctx.fillRect(g.bx, g.by, g.bw, g.bh)
    for (let y = 0; y < w.spec.rows; y++) {
      for (let x = 0; x < w.spec.cols; x++) {
        ctx.fillStyle = (x + y) % 2 ? '#c7d2fe' : '#dbe3ff'
        ctx.beginPath()
        ctx.roundRect(g.bx + x * g.cell + 2, g.by + y * g.cell + 2, g.cell - 4, g.cell - 4, 6)
        ctx.fill()
      }
    }
    ctx.fillStyle = 'rgba(49,46,129,0.18)'
    ctx.fillRect(g.bx, g.by, g.bw, 5)
    // doors
    const dragged = w.drag ? w.blocks[w.drag.id] : null
    w.doors.forEach((d, i) => {
      const r = doorRect(d)
      const hue = HUES[d.color]
      const hot = dragged && (dragged.outer >= 0 ? dragged.outer : dragged.color) === d.color
      if (hot || w.doorFlash[i] > 0) glow(ctx, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.9, hue.base, 0.45 + (hot ? Math.sin(t * 9) * 0.15 : w.doorFlash[i] * 0.4))
      const gr = ctx.createLinearGradient(r.x, r.y, r.x + (d.side % 2 ? r.w : 0), r.y + (d.side % 2 ? 0 : r.h))
      gr.addColorStop(0, hue.light)
      gr.addColorStop(1, hue.dark)
      ctx.fillStyle = gr
      ctx.beginPath()
      ctx.roundRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 5)
      ctx.fill()
      // outward chevrons
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      const n = d.len
      for (let k = 0; k < n; k++) {
        const cx = d.side === 0 || d.side === 2 ? r.x + (k + 0.5) * g.cell : r.x + r.w / 2
        const cy = d.side === 0 || d.side === 2 ? r.y + r.h / 2 : r.y + (k + 0.5) * g.cell
        const a = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][d.side]
        const s = g.frame * 0.32
        if (k === Math.floor(n / 2)) {
          symbolPath(ctx, hue.sym, cx, cy, s * 1.2)
          ctx.fill()
          continue
        }
        ctx.beginPath()
        ctx.moveTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s)
        ctx.lineTo(cx + Math.cos(a + 2.4) * s, cy + Math.sin(a + 2.4) * s)
        ctx.lineTo(cx + Math.cos(a - 2.4) * s, cy + Math.sin(a - 2.4) * s)
        ctx.closePath()
        ctx.fill()
      }
    })
    for (const r of w.rocks) drawRock(ctx, g.bx + (r % w.spec.cols) * g.cell, g.by + Math.floor(r / w.spec.cols) * g.cell, g.cell)
  }

  function drawBlock(ctx: CanvasRenderingContext2D, b: Block, v: Vis, t: number) {
    const w = world.current
    const g = geo()
    let ox = g.bx + v.x * g.cell
    let oy = g.by + v.y * g.cell
    if (v.shake > 0) ox += Math.sin(t * 70) * 4 * v.shake
    const lifted = w.drag?.id === b.id
    const depth = lifted ? 7 : 5
    if (lifted) oy -= 2
    const pop = v.pop > 0 ? 1 + Math.sin(v.pop * Math.PI) * 0.06 : 1
    const [ccx, ccy] = centreCell(b.cells)
    const px = ox + (ccx + 0.5) * g.cell
    const py = oy + (ccy + 0.5) * g.cell
    ctx.save()
    if (pop !== 1) {
      ctx.translate(px, py)
      ctx.scale(pop, pop)
      ctx.translate(-px, -py)
    }
    if (b.outer >= 0) {
      drawPiece(ctx, b.cells, ox, oy, g.cell, HUES[b.outer], 2, depth)
      // inner core
      const inner = b.cells.map(([x, y]) => [x, y] as [number, number])
      ctx.save()
      ctx.beginPath()
      for (const [x, y] of inner) ctx.rect(ox + x * g.cell + g.cell * 0.2, oy + y * g.cell + g.cell * 0.2, g.cell * 0.6, g.cell * 0.6)
      ctx.clip()
      drawPiece(ctx, b.cells, ox, oy, g.cell, HUES[b.color], g.cell * 0.2, 0)
      ctx.restore()
    } else drawPiece(ctx, b.cells, ox, oy, g.cell, HUES[b.color], 2, depth)
    const top = HUES[b.outer >= 0 ? b.outer : b.color]
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    if (b.axis) drawAxis(ctx, px, py, g.cell * 0.28, b.axis === 2)
    else {
      symbolPath(ctx, top.sym, px, py, g.cell * 0.17)
      ctx.fill()
    }
    if (b.key) drawKey(ctx, px + g.cell * 0.18, py + g.cell * 0.2, g.cell * 0.22)
    if (b.locked) {
      ctx.fillStyle = 'rgba(15,23,42,0.35)'
      ctx.beginPath()
      for (const [x, y] of b.cells) ctx.rect(ox + x * g.cell + 2, oy + y * g.cell + 2, g.cell - 4, g.cell - 4)
      ctx.fill()
      drawLock(ctx, px, py, g.cell * 0.3)
    }
    if (b.ice > 0) {
      ctx.fillStyle = 'rgba(186,230,253,0.62)'
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (const [x, y] of b.cells) ctx.roundRect(ox + x * g.cell + 1, oy + y * g.cell + 1, g.cell - 2, g.cell - 2, g.cell * 0.18)
      ctx.fill()
      ctx.stroke()
      ctx.font = `900 ${Math.round(g.cell * 0.4)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 3
      ctx.strokeStyle = '#0c4a6e'
      ctx.strokeText(String(b.ice), px, py)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(String(b.ice), px, py)
    }
    ctx.restore()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    update(dt, raw)
    const g = geo()
    fx.applyShake(ctx)
    drawBoard(ctx, t)
    // exiting blocks slide through their door, clipped to board + opening
    for (const b of w.blocks) {
      const v = w.vis[b.id]
      if (!v.exit || v.exit.t > 0.5) continue
      const k = v.exit.t / 0.5
      const dist = k * k * 4
      const s = v.exit.side
      ctx.save()
      ctx.beginPath()
      ctx.rect(g.bx, g.by, g.bw, g.bh)
      ctx.clip()
      ctx.globalAlpha = 1 - k * 0.6
      drawBlock(ctx, b, { ...v, x: v.x + SX[s] * dist, y: v.y + SY[s] * dist, shake: 0 }, t)
      ctx.restore()
      ctx.globalAlpha = 1
    }
    const order = w.blocks.filter((b) => !b.gone).sort((a, b) => Number(w.drag?.id === a.id) - Number(w.drag?.id === b.id))
    for (const b of order) {
      const v = w.vis[b.id]
      if (w.mode !== 'none' && phaseRef.current === 'play') {
        const c = blockCentre(b, v)
        glow(ctx, c.x, c.y, g.cell * 0.9, w.mode === 'hammer' ? '#fb923c' : '#a5f3fc', 0.3 + Math.sin(t * 8) * 0.1)
      }
      drawBlock(ctx, b, v, t)
    }
    fx.draw(ctx)
    ctx.restore()
    for (const c of w.flying) {
      if (c.t < c.d) continue
      const k = Math.min(1, (c.t - c.d) / 0.55)
      const e = k * k
      const x = c.x + (W - 40 - c.x) * e
      const y = c.y + (20 - c.y) * e - Math.sin(k * Math.PI) * 60
      ctx.fillStyle = '#eab308'
      ctx.beginPath()
      ctx.arc(x, y, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fef08a'
      ctx.beginPath()
      ctx.arc(x - 2, y - 2, 4, 0, Math.PI * 2)
      ctx.fill()
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__blockjamLevel = (n: number) => beginLevel(n)
    win.__blockjam = () => {
      const w = world.current
      const { cols, rows } = w.spec
      const g = geo()
      const out: { x: number; y: number; pts: number[]; drag: true; match: boolean }[] = []
      for (const b of w.blocks) {
        if (b.gone || b.locked || b.ice > 0) continue
        const c = blockCentre(b, w.vis[b.id])
        const occ = occupancy(cols, rows, w.blocks, w.rocks)
        const sx0 = b.x
        const sy0 = b.y
        // BFS over this block's positions to one with an open door
        const key = (x: number, y: number) => `${x},${y}`
        const prev = new Map<string, string | null>([[key(b.x, b.y), null]])
        const q: [number, number][] = [[b.x, b.y]]
        let goal: [number, number, Side] | null = null
        while (q.length && !goal) {
          const [x, y] = q.shift()!
          b.x = x
          b.y = y
          for (const s of [0, 1, 2, 3] as Side[]) {
            if ((b.axis === 1 && s % 2 === 0) || (b.axis === 2 && s % 2 === 1)) continue
            if (exitDoor(cols, rows, occ, w.doors, b, s) && absCells(b, SX[s], SY[s]).some(([ax, ay]) => ax < 0 || ay < 0 || ax >= cols || ay >= rows)) {
              goal = [x, y, s]
              break
            }
            if (canStep(cols, rows, occ, b, SX[s], SY[s]) && !prev.has(key(x + SX[s], y + SY[s]))) {
              prev.set(key(x + SX[s], y + SY[s]), key(x, y))
              q.push([x + SX[s], y + SY[s]])
            }
          }
        }
        b.x = sx0
        b.y = sy0
        const pts: number[] = []
        let ok = false
        if (goal) {
          ok = true
          const chain: string[] = []
          for (let k: string | null = key(goal[0], goal[1]); k; k = prev.get(k) ?? null) chain.unshift(k)
          for (const k of chain) {
            const [x, y] = k.split(',').map(Number)
            pts.push(c.x + (x - sx0) * g.cell, c.y + (y - sy0) * g.cell)
          }
          pts.push(pts[pts.length - 2] + SX[goal[2]] * g.cell * 2, pts[pts.length - 1] + SY[goal[2]] * g.cell * 2)
        } else {
          const s = Math.floor(Math.random() * 4)
          pts.push(c.x + SX[s] * g.cell * 3, c.y + SY[s] * g.cell * 3)
        }
        out.push({ x: c.x, y: c.y, pts, drag: true, match: ok })
      }
      return { phase: phaseRef.current, level: w.level, time: Math.round(w.time), out, wait: 300 }
    }
    return () => {
      delete win.__blockjam
      delete win.__blockjamLevel
    }
  }, [])

  const won = hud.level >= 5
  const mm = Math.floor(Math.max(0, hud.time) / 60)
  const ss = String(Math.max(0, hud.time) % 60).padStart(2, '0')
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena bk-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="bk-hud-level">
                  Lv {hud.level}
                  {hud.hard ? <span className="bk-hard">HARD</span> : null}
                </div>
                <div className="bk-sub">
                  {hud.score} pts · {hud.left} blocks
                </div>
              </div>
              <div className="action-hud__right">
                <span className="bk-coins">
                  <i />
                  {hud.coins}
                </span>
                <span className={`bk-timer${hud.frozen ? ' is-frozen' : hud.time <= 10 ? ' is-low' : ''}`}>
                  {mm}:{ss}
                </span>
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'clear' || phase === 'dying' ? (
            <div className="bk-boosters" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" className={`bk-boost tp-boost${hud.mode === 'hammer' ? ' is-on' : ''}`} aria-label="Hammer" disabled={hud.hammer <= 0 && hud.mode !== 'hammer'} onClick={() => setMode('hammer')}>
                <HammerIcon />
                Hammer
                <span className="bk-boost__n">{hud.hammer}</span>
              </button>
              <button type="button" className={`bk-boost tp-boost${hud.mode === 'vacuum' ? ' is-on' : ''}`} aria-label="Vacuum a colour" disabled={hud.vacuum <= 0 && hud.mode !== 'vacuum'} onClick={() => setMode('vacuum')}>
                <VacuumIcon />
                Vacuum
                <span className="bk-boost__n">{hud.vacuum}</span>
              </button>
              <button type="button" className="bk-boost tp-boost" aria-label="Freeze time" disabled={hud.freezes <= 0} onClick={useFreeze}>
                <FreezeIcon />
                Freeze
                <span className="bk-boost__n">{hud.freezes}</span>
              </button>
            </div>
          ) : null}
          {hud.mode !== 'none' && phase === 'play' ? <div className="bk-hint">{hud.mode === 'hammer' ? 'Tap a block to smash it' : 'Tap a block to vacuum its colour'}</div> : null}
          {banner && phase !== 'idle' && phase !== 'over' ? (
            <div className={`action-banner bk-banner${banner.hard ? ' is-hard' : ''}`} key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.stars ? <span className="bk-stars">{'★'.repeat(banner.stars) + '☆'.repeat(3 - banner.stars)}</span> : null}
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="blockjam"
              icon={meta.icon}
              title={meta.title}
              hint="Drag blocks around the board. Slide each one into the door of its colour — if it fits, it pops out."
              onPlay={(lv) => start(lv)}
            />
          )}
          <ActionResult run={run} title={won ? 'Jam cleared!' : "Time's up"} subtitle={`Score ${hud.score} · reached level ${hud.level}`} celebrate={won} onPlayAgain={() => start()} />
        </div>
      </div>
    </GameShell>
  )
}
