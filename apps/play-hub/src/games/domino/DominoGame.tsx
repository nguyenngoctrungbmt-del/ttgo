import { useEffect, useRef, useState } from 'react'
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
import '../../shared/action/action.css'
import './domino.css'
import { LEVELS, type Button, type Gate, type Level, type P, type Pool, type Rect } from './levels'

const meta = getGame('domino')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Stage = 'draw' | 'run' | 'clear' | 'fail'
type Dom = { x: number; y: number; a: number; state: 0 | 1 | 2; p: number; pre: boolean; hue: number; stroke: number }
type Bell = P & { rung: boolean; swing: number }
type Gem = P & { got: boolean }

const BW = 360
const BH = 520
const SP = 18
const REACH = 27
const CONE = Math.cos((58 * Math.PI) / 180)
const FALL_T = 0.13
const TURN = (50 * Math.PI) / 180
const DOM_W = 15
const DOM_H = 28
const DOM_T = 7

function boxedBell(bx: number, by: number, button: P): { walls: Rect[]; bell: P; btn: Button } {
  // A walled pen around a bell; a button outside fires a hidden chain inside.
  const walls: Rect[] = [
    { x: bx - 70, y: by - 40, w: 140, h: 12 },
    { x: bx - 70, y: by - 40, w: 12, h: 132 },
    { x: bx + 58, y: by - 40, w: 12, h: 132 },
    { x: bx - 70, y: by + 80, w: 140, h: 12 },
  ]
  const chain = Array.from({ length: 5 }, (_, i) => ({ x: bx, y: by + 66 - i * SP, a: -Math.PI / 2 }))
  return { walls, bell: { x: bx, y: by - 8 }, btn: { x: button.x, y: button.y, chain, pressed: false } }
}

function rectHit(r: Rect, x: number, y: number, pad: number) {
  return x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad
}

function segCross(a: P, b: P, c: P, d: P) {
  const d1 = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
  const d2 = (b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x)
  const d3 = (d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x)
  const d4 = (d.x - c.x) * (b.y - c.y) - (d.y - c.y) * (b.x - c.x)
  return d1 * d2 < 0 && d3 * d4 < 0
}

function segRect(a: P, b: P, r: Rect) {
  const c = [
    { x: r.x, y: r.y },
    { x: r.x + r.w, y: r.y },
    { x: r.x + r.w, y: r.y + r.h },
    { x: r.x, y: r.y + r.h },
  ]
  for (let i = 0; i < 4; i++) if (segCross(a, b, c[i], c[(i + 1) % 4])) return true
  return false
}

function genLevel(n: number): Level {
  if (n <= LEVELS.length) {
    const { sol: _sol, ...lv } = structuredClone(LEVELS[n - 1])
    return lv
  }
  for (let attempt = 0; attempt < 60; attempt++) {
    const start = { x: rand(60, 300), y: 480, a: -Math.PI / 2 }
    const walls: Rect[] = []
    const pools: Pool[] = []
    const gates: Gate[] = []
    const buttons: Button[] = []
    const bells: P[] = []
    let pen: Rect | null = null
    const free = (x: number, y: number, pad: number) =>
      x > 30 && x < BW - 30 && y > 40 && y < BH - 30 && !walls.some((r) => rectHit(r, x, y, pad)) && !pools.some((p) => dist(p.x, p.y, x, y) < p.r + pad) && dist(x, y, start.x, start.y) > 70 && !(pen && rectHit(pen, x, y, pad))
    // optional gated barrier
    if (n >= 8 && Math.random() < 0.38) {
      const gy = rand(230, 330)
      const gx = rand(70, 290)
      walls.push({ x: 0, y: gy, w: gx - 30, h: 14 }, { x: gx + 30, y: gy, w: BW - gx - 30, h: 14 })
      gates.push({ x1: gx - 30, y1: gy + 7, x2: gx + 30, y2: gy + 7, period: rand(2.2, 3.2) - Math.min(0.6, n * 0.02), phase: rand(0, 2) })
    }
    let boxed: ReturnType<typeof boxedBell> | null = null
    if (n >= 10 && Math.random() < 0.35) {
      const bx = rand(110, 250)
      boxed = boxedBell(bx, 110, { x: 0, y: 0 })
      walls.push(...boxed.walls)
      pen = { x: bx - 70, y: 70, w: 140, h: 132 }
    }
    const nWalls = Math.min(5, 1 + Math.floor(n / 4))
    for (let i = 0; i < nWalls * 4 && walls.length < nWalls + (gates.length ? 2 : 0) + (boxed ? 4 : 0); i++) {
      const horiz = Math.random() < 0.6
      const len = rand(60, 130)
      const r: Rect = horiz ? { x: rand(10, BW - len - 10), y: rand(150, 420), w: len, h: 14 } : { x: rand(40, BW - 54), y: rand(140, 400 - len), w: 14, h: len }
      if (dist(r.x + r.w / 2, r.y + r.h / 2, start.x, start.y) < 90) continue
      if (walls.some((o) => rectHit(o, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) / 2 + 30))) continue
      walls.push(r)
    }
    if (n >= 9) {
      const np = Math.random() < 0.5 ? 1 : 2
      for (let i = 0; i < np * 6 && pools.length < np; i++) {
        const p = { x: rand(70, 290), y: rand(170, 400), r: rand(28, 48) }
        if (dist(p.x, p.y, start.x, start.y) < p.r + 70) continue
        if (walls.some((r) => rectHit(r, p.x, p.y, p.r + 20))) continue
        pools.push(p)
      }
    }
    const nb = Math.min(3, 1 + (n >= 7 ? 1 : 0) + (n >= 13 && Math.random() < 0.5 ? 1 : 0)) - (boxed ? 1 : 0)
    for (let i = 0; i < 80 && bells.length < nb; i++) {
      const x = rand(50, 310)
      const y = rand(70, 260)
      if (!free(x, y, 30) || bells.some((b) => dist(b.x, b.y, x, y) < 90)) continue
      bells.push({ x, y })
    }
    if (bells.length < nb) continue
    if (boxed) {
      let placed = false
      for (let i = 0; i < 60 && !placed; i++) {
        const x = rand(50, 310)
        const y = rand(230, 400)
        if (!free(x, y, 30)) continue
        boxed.btn.x = x
        boxed.btn.y = y
        placed = true
      }
      if (!placed) continue
      bells.push(boxed.bell)
      buttons.push(boxed.btn)
    }
    const gems: P[] = []
    for (let i = 0; i < 60 && gems.length < 2 + (n > 12 ? 1 : 0); i++) {
      const x = rand(40, 320)
      const y = rand(90, 420)
      if (free(x, y, 22) && !bells.some((b) => dist(b.x, b.y, x, y) < 40)) gems.push({ x, y })
    }
    // Estimate a trail: greedy tour from the start through bells (or the button for a boxed bell).
    const stops: P[] = bells.filter((b) => !boxed || b !== boxed.bell).concat(buttons.map((b) => ({ x: b.x, y: b.y })))
    let cur: P = start
    let len = 0
    const left = [...stops]
    while (left.length) {
      left.sort((a, b) => dist(a.x, a.y, cur.x, cur.y) - dist(b.x, b.y, cur.x, cur.y))
      const nx = left.shift()!
      len += dist(nx.x, nx.y, cur.x, cur.y) * (left.length ? 0.85 : 1)
      cur = nx
    }
    const est = Math.ceil((len * (1.25 + walls.length * 0.05 + pools.length * 0.08)) / SP)
    return { start, bells, walls, pools, gates, gems, buttons, count: est + 10 + Math.max(0, 6 - Math.floor(n / 4)), par: est + 2 }
  }
  const { sol: _sol, ...first } = structuredClone(LEVELS[0])
  return first
}

type World = {
  level: number
  /** Levels cleared in this run. */
  cleared: number
  lv: Level
  doms: Dom[]
  strokes: number[]
  bells: Bell[]
  gems: Gem[]
  stage: Stage
  simT: number
  quiet: number
  gateT: number
  hearts: number
  maxHearts: number
  score: number
  stageT: number
  breakAt: P | null
  slowDone: boolean
  stroke: number
  extra: number
  levelGems: number
  stats: { score: number; level: number; bells: number; toppled: number; stars: number; gems: number; perfect: number }
}

function freshWorld(): World {
  return {
    level: 0,
    cleared: 0,
    lv: genLevel(1),
    doms: [],
    strokes: [],
    bells: [],
    gems: [],
    stage: 'draw',
    simT: 0,
    quiet: 0,
    gateT: 0,
    hearts: 3,
    maxHearts: 3,
    score: 0,
    stageT: 0,
    breakAt: null,
    slowDone: false,
    stroke: 0,
    extra: 0,
    levelGems: 0,
    stats: { score: 0, level: 0, bells: 0, toppled: 0, stars: 0, gems: 0, perfect: 0 },
  }
}

function gateOpen(g: Gate, t: number) {
  return ((t + g.phase) % g.period) / g.period < 0.5
}

const HUES = [340, 20, 45, 150, 195, 265]
const colorCache = new Map<number, { body: string; side: string; light: string }>()
function tileColors(hue: number) {
  let c = colorCache.get(hue)
  if (!c) {
    c = hue < 0 ? { body: '#60a5fa', side: '#1e40af', light: '#dbeafe' } : { body: `hsl(${hue} 85% 62%)`, side: `hsl(${hue} 65% 34%)`, light: `hsl(${hue} 90% 85%)` }
    colorCache.set(hue, c)
  }
  return c
}

export default function DominoGame() {
  const run = useActionRun('domino')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const drawing = useRef<{ pid: number; anchor: P & { a: number }; placed: number; blocked: P | null; sx: number; sy: number } | null>(null)
  const lastMilestone = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, cleared: 0, used: 0, count: 0, hearts: 3, maxHearts: 3, stage: 'draw' as Stage })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function used() {
    return world.current.doms.filter((d) => !d.pre).length
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: Math.max(1, w.level), cleared: w.cleared, used: used(), count: w.lv.count + w.extra, hearts: w.hearts, maxHearts: w.maxHearts, stage: w.stage })
  }

  function view() {
    const { w: W, h: H } = size.current
    const top = 52
    const bottom = 70
    const s = Math.min(W / BW, (H - top - bottom) / BH)
    const ox = (W - BW * s) / 2
    const oy = top + (H - top - bottom - BH * s) / 2
    return { W, H, s, ox, oy }
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    // nextLevel() increments, so begin one below the chosen level.
    w.level = Math.max(0, level - 1)
    w.maxHearts = 3 + run.level('heart')
    w.hearts = w.maxHearts
    w.extra = run.level('extra') * 3
    world.current = w
    fx.reset()
    lastMilestone.current = 0
    run.begin()
    setPhaseBoth('play')
    nextLevel()
  }

  function loadLevel(lv: Level) {
    const w = world.current
    w.lv = lv
    w.doms = []
    w.strokes = []
    for (const b of lv.buttons) for (const c of b.chain) w.doms.push({ x: c.x, y: c.y, a: c.a, state: 0, p: 0, pre: true, hue: 210, stroke: -1 })
    w.bells = lv.bells.map((b) => ({ ...b, rung: false, swing: 0 }))
    w.gems = lv.gems.map((g) => ({ ...g, got: false }))
    w.stage = 'draw'
    w.breakAt = null
  }

  function nextLevel() {
    const w = world.current
    w.level += 1
    loadLevel(genLevel(w.level))
    if (w.level > 1 && w.level % 5 === 1 && w.hearts < w.maxHearts) {
      w.hearts += 1
      fx.text(BW / 2, BH / 2, '+1 HEART', '#fda4af', 22)
    }
    pushHud()
    run.update(w.stats)
    const lv = w.lv
    const news = lv.hint ?? (lv.buttons.length ? 'button + hidden chain' : lv.gates.length ? 'time the gate' : lv.bells.length > 1 ? `${lv.bells.length} bells to ring` : `${lv.count + w.extra} dominoes`)
    const boss = w.level % 5 === 0
    setBanner({ key: Date.now(), text: boss ? `BOSS · LEVEL ${w.level}` : `LEVEL ${w.level}`, sub: lv.name ? `${lv.name} · ${news}` : news })
    sfx.ready()
  }

  /** Reset the trail to standing (keeps the player's dominoes). */
  function resetTrail() {
    const w = world.current
    for (const d of w.doms) {
      d.state = 0
      d.p = 0
    }
    for (const b of w.lv.buttons) b.pressed = false
    for (const b of w.bells) b.rung = false
    for (const g of w.gems) g.got = false
    w.stage = 'draw'
    w.breakAt = null
    pushHud()
  }

  function go() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.stage !== 'draw') return
    if (used() === 0) {
      fx.text(w.lv.start.x, w.lv.start.y - 40, 'Draw a trail first', '#fecaca', 16)
      sfx.miss()
      return
    }
    w.stage = 'run'
    w.simT = 0
    w.quiet = 0
    w.slowDone = false
    w.levelGems = 0
    const s = w.lv.start
    // the pusher knocks whatever stands in front of the pad
    let any = false
    for (const d of w.doms) {
      if (d.pre) continue
      const dx = d.x - s.x
      const dy = d.y - s.y
      const l = Math.hypot(dx, dy)
      if (l <= REACH + 2 && (dx * Math.cos(s.a) + dy * Math.sin(s.a)) / l > CONE) {
        d.state = 1
        any = true
      }
    }
    fx.ring(s.x, s.y, { color: '#fde047', maxR: 30, life: 0.3 })
    sfx.whoosh()
    haptic.light()
    if (!any) w.breakAt = { x: s.x, y: s.y }
    pushHud()
  }

  function undo() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.stage !== 'draw' || !w.strokes.length) return
    const id = w.strokes.pop()!
    w.doms = w.doms.filter((d) => d.stroke !== id)
    sfx.pop()
    haptic.light()
    pushHud()
  }

  function clearAll() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.stage !== 'draw') return
    w.doms = w.doms.filter((d) => d.pre)
    w.strokes = []
    sfx.flip()
    pushHud()
  }

  function canStand(from: P, x: number, y: number, ignore: Dom | null) {
    const w = world.current
    const lv = w.lv
    if (x < 8 || y < 8 || x > BW - 8 || y > BH - 8) return false
    for (const r of lv.walls) if (rectHit(r, x, y, 7) || segRect(from, { x, y }, r)) return false
    for (const p of lv.pools) if (dist(p.x, p.y, x, y) < p.r + 4) return false
    for (const b of w.bells) if (dist(b.x, b.y, x, y) < 18) return false
    for (const b of lv.buttons) if (dist(b.x, b.y, x, y) < 14) return false
    for (const d of w.doms) if (d !== ignore && dist(d.x, d.y, x, y) < SP * 0.72) return false
    return true
  }

  function finish() {
    const w = world.current
    const allRung = w.bells.every((b) => b.rung)
    if (allRung) {
      w.stage = 'clear'
      w.stageT = 1.8
      const left = w.lv.count + w.extra - used()
      const gemsAll = w.gems.length > 0 && w.gems.every((g) => g.got)
      const parOk = used() <= w.lv.par + w.extra * 0
      const stars = 1 + (gemsAll ? 1 : 0) + (parOk ? 1 : 0)
      const bonus = 100 + w.level * 40 + left * 5 + stars * 50
      w.score += bonus
      w.cleared += 1
      w.stats.level = w.cleared
      const saved = run.completeLevel(w.level, stars)
      w.stats.stars += stars
      if (stars === 3) w.stats.perfect += 1
      w.stats.score = w.score
      setBanner({ key: Date.now(), text: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, sub: `level ${w.level} clear · +${bonus}${saved.improved && !saved.firstClear ? ' · new best' : ''}` })
      sfx.win()
      haptic.success()
      for (const b of w.bells) fx.burst(b.x, b.y, { count: 16, color: ['#fde047', '#ffffff', '#f472b6'], speed: 220, shape: 'spark', gravity: -40 })
      if (saved.firstClear && w.level - lastMilestone.current >= 5 && w.level % 5 === 0) {
        lastMilestone.current = w.level
        void trackEvent('action_milestone', { game_id: 'domino', kind: 'level', value: w.level })
      }
      run.update(w.stats)
      pushHud()
      return
    }
    // Show what went wrong, then let the player fix the trail.
    w.stage = 'fail'
    w.stageT = 1.6
    w.hearts -= 1
    fx.flash('#ef4444', 0.25)
    fx.shake(8, 0.35)
    sfx.hurt()
    haptic.error()
    if (w.breakAt) {
      fx.ring(w.breakAt.x, w.breakAt.y, { color: '#ef4444', maxR: 34, life: 0.8, width: 4 })
      fx.text(w.breakAt.x, w.breakAt.y - 26, 'CHAIN BROKE', '#fca5a5', 15)
    }
    pushHud()
    if (w.hearts <= 0) die()
    else setBanner({ key: Date.now(), text: 'MISSED!', sub: 'fix your trail and try again' })
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.slowmo(1, 0.3)
    sfx.lose()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.stats.level * 3 + w.stats.stars + Math.floor(w.score / 400)) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.stats.level >= 7, stats: { ...w.stats }, coins }, revive)
    }, 1300)
  }

  /** Revive: a heart back and the same level, trail intact and standing. */
  function revive() {
    const w = world.current
    w.hearts = 1
    resetTrail()
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'your trail is waiting' })
    fx.ring(w.lv.start.x, w.lv.start.y, { color: '#fde047', maxR: 80, life: 0.6 })
    pushHud()
    setPhaseBoth('play')
  }

  // ── Input ─────────────────────────────────────────────

  function toBoard(x: number, y: number) {
    const { s, ox, oy } = view()
    return { x: (x - ox) / s, y: (y - oy) / s }
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const w = world.current
    if (w.stage !== 'draw') return
    const el = e.currentTarget
    const lp = localPoint(e, el)
    const b = toBoard(lp.x, lp.y)
    el.setPointerCapture(e.pointerId)
    beginStroke(e.pointerId, b)
  }

  function beginStroke(pid: number, b: P) {
    const w = world.current
    // Anchor: nearest own domino within reach of the finger, else the last one, else the pad.
    const own = w.doms.filter((d) => !d.pre)
    let anchor: P & { a: number } = w.lv.start
    if (own.length) {
      let best: Dom | null = null
      let bd = 46
      for (const d of own) {
        const dd = dist(d.x, d.y, b.x, b.y)
        if (dd < bd) {
          bd = dd
          best = d
        }
      }
      const padD = dist(w.lv.start.x, w.lv.start.y, b.x, b.y)
      if (best && bd <= padD) anchor = best
      else if (padD > 46) anchor = own[own.length - 1]
    }
    w.stroke += 1
    drawing.current = { pid, anchor: { x: anchor.x, y: anchor.y, a: anchor.a }, placed: 0, blocked: null, sx: b.x, sy: b.y }
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const dr = drawing.current
    if (!dr || dr.pid !== e.pointerId) return
    const w = world.current
    if (w.stage !== 'draw' || dr.blocked) return
    const lp = localPoint(e, e.currentTarget)
    extendStroke(toBoard(lp.x, lp.y))
  }

  function extendStroke(f: P) {
    const dr = drawing.current
    const w = world.current
    if (!dr || w.stage !== 'draw' || dr.blocked) return
    for (let guard = 0; guard < 12; guard++) {
      const dx = f.x - dr.anchor.x
      const dy = f.y - dr.anchor.y
      if (Math.hypot(dx, dy) < SP) break
      if (used() >= w.lv.count + w.extra) {
        dr.blocked = { x: f.x, y: f.y }
        fx.text(f.x, f.y - 30, 'Out of dominoes', '#fecaca', 15)
        sfx.miss()
        break
      }
      let a = Math.atan2(dy, dx)
      let diff = a - dr.anchor.a
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      a = dr.anchor.a + clamp(diff, -TURN, TURN)
      const nx = dr.anchor.x + Math.cos(a) * SP
      const ny = dr.anchor.y + Math.sin(a) * SP
      if (!canStand(dr.anchor, nx, ny, null)) {
        dr.blocked = { x: nx, y: ny }
        fx.burst(nx, ny, { count: 6, color: ['#ef4444', '#fecaca'], speed: 90 })
        sfx.miss()
        haptic.light()
        break
      }
      const idx = used()
      w.doms.push({ x: nx, y: ny, a, state: 0, p: 0, pre: false, hue: HUES[Math.floor(idx / 6) % HUES.length], stroke: w.stroke })
      if (dr.placed === 0) w.strokes.push(w.stroke)
      dr.placed++
      dr.anchor = { x: nx, y: ny, a }
      if (idx % 2 === 0) sfx.tick()
      // gem on the path preview
      for (const g of w.gems) if (dist(g.x, g.y, nx, ny) < 22) fx.ring(g.x, g.y, { color: '#67e8f9', maxR: 16, life: 0.2 })
    }
    pushHud()
  }

  function onUp(e: React.PointerEvent<HTMLDivElement>) {
    const dr = drawing.current
    if (!dr || dr.pid !== e.pointerId) return
    drawing.current = null
    const w = world.current
    if (dr.placed > 0) {
      sfx.thud()
      haptic.light()
      return
    }
    // A tap on the pad starts the run.
    const lp = localPoint(e, e.currentTarget)
    const b = toBoard(lp.x, lp.y)
    if (dist(b.x, b.y, w.lv.start.x, w.lv.start.y) < 34) go()
  }

  // Dev-only bot hook: draw the level's verified trail through the real stroke code, then GO.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__lv3dm = {
      state: () => ({ level: world.current.level, stage: world.current.stage, used: used() }),
      solve: () => {
        const w = world.current
        if (phaseRef.current !== 'play' || w.stage !== 'draw') return false
        const src = LEVELS[w.level - 1]
        if (!src) return false
        if (!used()) {
          for (const stroke of src.sol) {
            beginStroke(-1, { x: stroke[0][0], y: stroke[0][1] })
            for (let i = 0; i < stroke.length - 1; i++) {
              const [ax, ay] = stroke[i]
              const [bx, by] = stroke[i + 1]
              const n = Math.max(1, Math.ceil(dist(ax, ay, bx, by) / 4))
              for (let k = 1; k <= n; k++) extendStroke({ x: ax + ((bx - ax) * k) / n, y: ay + ((by - ay) * k) / n })
            }
            drawing.current = null
          }
          pushHud()
          return true
        }
        // Wait for a GO moment when the chain will meet every gate open (≈ half a fall per domino).
        const own = w.doms.filter((d) => !d.pre)
        for (let k = 1; k < own.length; k++) {
          for (const g of w.lv.gates) {
            if (!segCross(own[k - 1], own[k], { x: g.x1, y: g.y1 }, { x: g.x2, y: g.y2 })) continue
            const t = w.gateT + k * FALL_T * 0.5
            if (!gateOpen(g, t - 0.2) || !gateOpen(g, t + 0.2)) return false
          }
        }
        go()
        return true
      },
    }
    return () => {
      delete win.__lv3dm
    }
  })

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'Enter') go()
      if (e.key === 'z' || e.key === 'Backspace') undo()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  // ── Simulation ────────────────────────────────────────

  function step(dt: number) {
    const w = world.current
    const lv = w.lv
    w.simT += dt
    let falling = 0
    for (let i = 0; i < w.doms.length; i++) {
      const d = w.doms[i]
      if (d.state !== 1) continue
      falling++
      const before = d.p
      d.p = Math.min(1, d.p + dt / FALL_T)
      if (before < 0.5 && d.p >= 0.5) {
        const ca = Math.cos(d.a)
        const sa = Math.sin(d.a)
        let pushed = false
        for (const o of w.doms) {
          if (o.state !== 0) continue
          const dx = o.x - d.x
          const dy = o.y - d.y
          const l = Math.hypot(dx, dy)
          if (l > REACH || l < 0.01) continue
          if ((dx * ca + dy * sa) / l < CONE) continue
          const blocked = lv.gates.some((g) => !gateOpen(g, w.gateT) && segCross(d, o, { x: g.x1, y: g.y1 }, { x: g.x2, y: g.y2 }))
          if (blocked) {
            fx.burst((d.x + o.x) / 2, (d.y + o.y) / 2, { count: 10, color: ['#ef4444', '#fde047'], speed: 150, shape: 'spark' })
            fx.text(o.x, o.y - 20, 'GATE!', '#fca5a5', 14)
            sfx.clang()
            continue
          }
          o.state = 1
          pushed = true
        }
        const tip = { x: d.x + ca * DOM_H * 0.85, y: d.y + sa * DOM_H * 0.85 }
        for (const b of w.bells) {
          if (b.rung) continue
          if (dist(b.x, b.y, tip.x, tip.y) < 20 || (dist(b.x, b.y, d.x, d.y) < REACH + 14 && ((b.x - d.x) * ca + (b.y - d.y) * sa) / Math.max(1, dist(b.x, b.y, d.x, d.y)) > CONE)) {
            b.rung = true
            b.swing = 1
            pushed = true
            w.stats.bells += 1
            w.score += 100
            const last = w.bells.every((x) => x.rung)
            fx.burst(b.x, b.y, { count: last ? 30 : 18, color: ['#fde047', '#fef3c7', '#ffffff'], speed: last ? 280 : 200, shape: 'spark', gravity: 60 })
            fx.ring(b.x, b.y, { color: '#fde047', maxR: last ? 70 : 44, life: 0.5, width: 4 })
            fx.text(b.x, b.y - 30, last ? 'DING DONG!' : 'DING! +100', '#fde047', last ? 22 : 17)
            fx.shake(last ? 7 : 3, 0.3)
            if (last) {
              fx.slowmo(0.9, 0.25)
              fx.flash('#fde047', 0.15)
            }
            sfx.clang()
            sfx.score(w.stats.bells % 8)
            haptic.medium()
          }
        }
        for (const b of lv.buttons) {
          if (b.pressed) continue
          if (dist(b.x, b.y, tip.x, tip.y) < 18 || dist(b.x, b.y, d.x, d.y) < 16) {
            b.pressed = true
            pushed = true
            const first = w.doms.find((o) => o.pre && Math.abs(o.x - b.chain[0].x) < 0.5 && Math.abs(o.y - b.chain[0].y) < 0.5)
            if (first && first.state === 0) first.state = 1
            fx.ring(b.x, b.y, { color: '#f87171', maxR: 30, life: 0.4 })
            fx.text(b.x, b.y - 24, 'CLICK!', '#fecaca', 15)
            sfx.power()
            haptic.medium()
          }
        }
        for (const g of w.gems) {
          if (g.got) continue
          if (dist(g.x, g.y, tip.x, tip.y) < 18 || dist(g.x, g.y, d.x, d.y) < 16) {
            g.got = true
            w.levelGems++
            w.stats.gems += 1
            w.score += 50
            fx.burst(g.x, g.y, { count: 14, color: ['#67e8f9', '#e0f2fe', '#a78bfa'], speed: 180, shape: 'spark' })
            fx.text(g.x, g.y - 20, '+50', '#67e8f9', 15)
            sfx.power()
          }
        }
        if (!pushed) w.breakAt = { x: tip.x, y: tip.y }
      }
      if (d.p >= 1) {
        d.state = 2
        w.stats.toppled += 1
        w.score += 2
        if (w.stats.toppled % 3 === 0) sfx.tick()
        if (Math.random() < 0.25) fx.burst(d.x + Math.cos(d.a) * DOM_H, d.y + Math.sin(d.a) * DOM_H, { count: 2, color: ['#e2e8f0'], speed: 40, size: 2, gravity: 0 })
      }
    }
    // Slow-mo when the chain closes in on the final bell.
    const unrung = w.bells.filter((b) => !b.rung)
    if (!w.slowDone && unrung.length === 1) {
      const b = unrung[0]
      if (w.doms.some((d) => d.state === 1 && dist(d.x, d.y, b.x, b.y) < 60)) {
        w.slowDone = true
        fx.slowmo(1.1, 0.3)
      }
    }
    if (falling === 0) {
      w.quiet += dt
      if (w.quiet > 0.5) finish()
    } else w.quiet = 0
  }

  // ── Drawing ───────────────────────────────────────────

  function drawDomino(ctx: CanvasRenderingContext2D, d: Dom) {
    const pe = d.state === 2 ? 1 : d.p * d.p
    const len = DOM_T + (DOM_H - DOM_T) * pe
    // Angled view: a standing tile is extruded towards the top of the screen.
    const hz = 13 * (1 - pe)
    const col = tileColors(d.pre ? -1 : d.hue)
    ctx.save()
    ctx.translate(d.x, d.y)
    ctx.rotate(d.a)
    const sx = -Math.sin(d.a)
    const sy = -Math.cos(d.a)
    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.beginPath()
    ctx.roundRect(-DOM_T / 2 + 2, -DOM_W / 2 + 2, len + hz * 0.5, DOM_W, 2)
    ctx.fill()
    const layers = hz > 1 ? 4 : 0
    for (let k = 0; k <= layers; k++) {
      const dz = layers ? (hz * k) / layers : 0
      const top = k === layers
      ctx.fillStyle = top ? col.body : col.side
      ctx.beginPath()
      ctx.roundRect(-DOM_T / 2 + sx * dz, -DOM_W / 2 + sy * dz, len, DOM_W, 2.5)
      ctx.fill()
    }
    const tx = sx * hz
    const ty = sy * hz
    if (len > DOM_T + 6) {
      // face up with pips once it lies flat
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      const mid = -DOM_T / 2 + len / 2 + tx
      ctx.fillRect(mid - 0.7, -DOM_W / 2 + 2.5 + ty, 1.4, DOM_W - 5)
      const pip = (x: number, y: number) => {
        ctx.beginPath()
        ctx.arc(x, y + ty, 1.7, 0, Math.PI * 2)
        ctx.fill()
      }
      pip(mid - len * 0.25, -3)
      pip(mid - len * 0.25, 3)
      pip(mid + len * 0.25, 0)
    } else {
      ctx.fillStyle = col.light
      ctx.fillRect(-DOM_T / 2 + 1 + tx, -DOM_W / 2 + 1.5 + ty, 2, DOM_W - 3)
    }
    ctx.restore()
  }

  function drawBell(ctx: CanvasRenderingContext2D, b: Bell, t: number) {
    ctx.save()
    ctx.translate(b.x, b.y)
    ctx.rotate(Math.sin(t * 18) * 0.35 * b.swing)
    if (!b.rung) glow(ctx, 0, 0, 30, '#fde047', 0.25 + Math.sin(t * 4) * 0.1)
    const g = ctx.createLinearGradient(-12, -14, 12, 12)
    g.addColorStop(0, '#fef08a')
    g.addColorStop(0.5, '#facc15')
    g.addColorStop(1, '#a16207')
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(3, 13, 14, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-13, 10)
    ctx.quadraticCurveTo(-11, -14, 0, -14)
    ctx.quadraticCurveTo(11, -14, 13, 10)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ca8a04'
    ctx.beginPath()
    ctx.roundRect(-15, 8, 30, 5, 2.5)
    ctx.fill()
    ctx.fillStyle = '#78350f'
    ctx.beginPath()
    ctx.arc(0, 14, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.ellipse(-5, -5, 2.5, 6, 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#a16207'
    ctx.fillRect(-2, -18, 4, 5)
    if (b.rung) {
      ctx.strokeStyle = '#4ade80'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-5, -2)
      ctx.lineTo(-1, 3)
      ctx.lineTo(6, -6)
      ctx.stroke()
    }
    ctx.restore()
  }

  function idleDemo(t: number) {
    const w = world.current
    if (w.doms.length === 0 || (w.stage === 'clear' && w.stageT <= 0)) {
      w.lv = { start: { x: 60, y: 470, a: -Math.PI / 2 }, bells: [{ x: 290, y: 110 }], walls: [], pools: [], gates: [], gems: [], buttons: [], count: 99, par: 99 }
      w.bells = [{ x: 290, y: 110, rung: false, swing: 0 }]
      w.gems = []
      w.doms = []
      let a = -Math.PI / 2
      let x = 60
      let y = 470
      for (let i = 0; i < 46; i++) {
        const target = Math.atan2(110 - y, 290 - x)
        a += clamp(target - a + Math.sin(i * 0.3 + t) * 0.5, -0.35, 0.35)
        x += Math.cos(a) * SP
        y += Math.sin(a) * SP
        if (dist(x, y, 290, 110) < 30) break
        w.doms.push({ x, y, a, state: 0, p: 0, pre: false, hue: HUES[Math.floor(i / 6) % HUES.length], stroke: 0 })
      }
      w.stage = 'draw'
      w.stageT = 1.2
    }
    if (w.stage === 'draw') {
      w.stageT -= 1 / 60
      if (w.stageT <= 0) {
        w.stage = 'run'
        w.doms[0].state = 1
        w.quiet = 0
      }
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const { s, ox, oy } = view()
    w.gateT += dt

    if (ph === 'idle') {
      idleDemo(t)
      if (w.stage === 'run') {
        for (const d of w.doms) {
          if (d.state !== 1) continue
          const before = d.p
          d.p = Math.min(1, d.p + dt / FALL_T)
          if (before < 0.5 && d.p >= 0.5) {
            const nx = w.doms[w.doms.indexOf(d) + 1]
            if (nx) nx.state = 1
            else {
              w.bells[0].rung = true
              w.bells[0].swing = 1
            }
          }
          if (d.p >= 1) d.state = 2
        }
        if (w.bells[0].rung) {
          w.stage = 'clear'
          w.stageT = 1.5
        }
      } else if (w.stage === 'clear') w.stageT -= raw
    }

    if (ph === 'play') {
      if (w.stage === 'run') step(dt)
      else if (w.stage === 'clear') {
        w.stageT -= raw
        if (w.stageT <= 0) nextLevel()
      } else if (w.stage === 'fail') {
        w.stageT -= raw
        if (w.stageT <= 0) resetTrail()
      }
    }
    for (const b of w.bells) b.swing = Math.max(0, b.swing - raw * 0.8)

    // ── Draw ─────────────────────────────────────────
    ctx.fillStyle = '#3f1d38'
    ctx.fillRect(0, 0, W, H)
    fx.applyShake(ctx)
    ctx.save()
    ctx.translate(ox, oy)
    ctx.scale(s, s)

    // table felt
    const felt = ctx.createRadialGradient(BW / 2, BH / 2, 40, BW / 2, BH / 2, BH * 0.7)
    felt.addColorStop(0, '#be185d')
    felt.addColorStop(1, '#831843')
    ctx.fillStyle = felt
    ctx.beginPath()
    ctx.roundRect(0, 0, BW, BH, 18)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 20; x < BW; x += 20) {
      ctx.moveTo(x, 4)
      ctx.lineTo(x, BH - 4)
    }
    for (let y = 20; y < BH; y += 20) {
      ctx.moveTo(4, y)
      ctx.lineTo(BW - 4, y)
    }
    ctx.stroke()
    ctx.strokeStyle = '#4a0f2c'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.roundRect(0, 0, BW, BH, 18)
    ctx.stroke()

    const lv = w.lv
    // pools
    for (const p of lv.pools) {
      const g = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 2, p.x, p.y, p.r)
      g.addColorStop(0, '#67e8f9')
      g.addColorStop(1, '#0e7490')
      ctx.fillStyle = '#4a0f2c'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r + 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1.5
      for (let i = 0; i < 2; i++) {
        const rr = ((t * 14 + i * p.r * 0.5) % (p.r * 0.9)) + 4
        ctx.globalAlpha = 1 - rr / p.r
        ctx.beginPath()
        ctx.arc(p.x + p.r * 0.15, p.y + p.r * 0.1, rr, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    // walls
    for (const r of lv.walls) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.fillRect(r.x + 4, r.y + 5, r.w, r.h)
      const g = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h)
      g.addColorStop(0, '#d6a46b')
      g.addColorStop(1, '#8b5a2b')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.roundRect(r.x, r.y, r.w, r.h, 3)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, 2)
    }
    // gates
    for (const g of lv.gates) {
      const open = gateOpen(g, w.gateT)
      const k = ((w.gateT + g.phase) % g.period) / g.period
      ctx.lineCap = 'round'
      ctx.strokeStyle = open ? 'rgba(74,222,128,0.35)' : '#ef4444'
      ctx.lineWidth = open ? 3 : 8
      ctx.setLineDash(open ? [4, 5] : [])
      ctx.beginPath()
      ctx.moveTo(g.x1, g.y1)
      ctx.lineTo(g.x2, g.y2)
      ctx.stroke()
      ctx.setLineDash([])
      // rhythm dial
      const cx = (g.x1 + g.x2) / 2
      const cy = g.y1 - 18
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.beginPath()
      ctx.arc(cx, cy, 9, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = open ? '#4ade80' : '#f87171'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (open ? 1 - k / 0.5 : 1 - (k - 0.5) / 0.5))
      ctx.stroke()
    }
    // buttons + wires
    for (const b of lv.buttons) {
      ctx.strokeStyle = 'rgba(248,113,113,0.45)'
      ctx.setLineDash([3, 5])
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(b.x, b.y)
      ctx.lineTo(b.chain[0].x, b.chain[0].y + 12)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#334155'
      ctx.beginPath()
      ctx.arc(b.x, b.y, 12, 0, Math.PI * 2)
      ctx.fill()
      const g = ctx.createRadialGradient(b.x - 3, b.y - 3, 1, b.x, b.y, 9)
      g.addColorStop(0, '#fecaca')
      g.addColorStop(1, b.pressed ? '#7f1d1d' : '#dc2626')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(b.x, b.y + (b.pressed ? 1.5 : 0), b.pressed ? 7 : 9, 0, Math.PI * 2)
      ctx.fill()
    }
    // gems
    for (const g of w.gems) {
      if (g.got) continue
      const bob = Math.sin(t * 3 + g.x) * 2
      glow(ctx, g.x, g.y, 18, '#67e8f9', 0.35)
      ctx.fillStyle = '#22d3ee'
      ctx.beginPath()
      ctx.moveTo(g.x, g.y - 8 + bob)
      ctx.lineTo(g.x + 7, g.y - 2 + bob)
      ctx.lineTo(g.x, g.y + 8 + bob)
      ctx.lineTo(g.x - 7, g.y - 2 + bob)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#cffafe'
      ctx.beginPath()
      ctx.moveTo(g.x, g.y - 8 + bob)
      ctx.lineTo(g.x + 3, g.y - 2 + bob)
      ctx.lineTo(g.x - 3, g.y - 2 + bob)
      ctx.closePath()
      ctx.fill()
    }
    // start pad
    const sp = lv.start
    ctx.save()
    ctx.translate(sp.x, sp.y)
    ctx.rotate(sp.a + Math.PI / 2)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.roundRect(-16, -8, 34, 26, 8)
    ctx.fill()
    const pg = ctx.createLinearGradient(0, -10, 0, 18)
    pg.addColorStop(0, '#fde047')
    pg.addColorStop(1, '#ca8a04')
    ctx.fillStyle = pg
    ctx.beginPath()
    ctx.roundRect(-18, -10, 36, 26, 8)
    ctx.fill()
    const push = w.stage === 'run' ? Math.min(1, w.simT * 8) * 6 : Math.sin(t * 4) * 1.5
    ctx.fillStyle = '#78350f'
    ctx.fillRect(-10, -14 - push, 20, 6)
    ctx.fillStyle = '#422006'
    ctx.font = "900 9px 'Plus Jakarta Sans', system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('GO', 0, 4)
    ctx.restore()
    if (ph === 'play' && w.stage === 'draw' && used() === 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.setLineDash([4, 6])
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(sp.x, sp.y - 20)
      ctx.lineTo(sp.x + Math.cos(sp.a) * (60 + Math.sin(t * 3) * 10), sp.y + Math.sin(sp.a) * (60 + Math.sin(t * 3) * 10))
      ctx.stroke()
      ctx.setLineDash([])
    }

    // dominoes: fallen first, then standing (so standing ones read on top)
    for (const d of w.doms) if (d.state === 2) drawDomino(ctx, d)
    for (const d of w.doms) if (d.state !== 2) drawDomino(ctx, d)
    for (const b of w.bells) drawBell(ctx, b, t)
    if (w.stage === 'fail') {
      for (const b of w.bells) if (!b.rung) glow(ctx, b.x, b.y, 34, '#ef4444', 0.4 + Math.sin(t * 12) * 0.2)
      if (w.breakAt) {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(w.breakAt.x, w.breakAt.y, 14 + Math.sin(t * 10) * 2, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    const dr = drawing.current
    if (dr?.blocked) {
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(dr.blocked.x - 6, dr.blocked.y - 6)
      ctx.lineTo(dr.blocked.x + 6, dr.blocked.y + 6)
      ctx.moveTo(dr.blocked.x + 6, dr.blocked.y - 6)
      ctx.lineTo(dr.blocked.x - 6, dr.blocked.y + 6)
      ctx.stroke()
    }

    fx.draw(ctx)
    ctx.restore()
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const won = hud.cleared >= 7
  const left = hud.count - hud.used
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena domino-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Level {hud.level}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hearts">
                  {'❤'.repeat(Math.max(0, hud.hearts))}
                  <span style={{ opacity: 0.3 }}>{'❤'.repeat(Math.max(0, hud.maxHearts - hud.hearts))}</span>
                </span>
                <span className={`action-hud__small${left <= 3 ? ' domino-low' : ''}`}>{left} dominoes left</span>
              </div>
            </div>
          )}
          {phase === 'play' && (
            <div className="domino-bar" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" className="domino-btn" disabled={hud.stage !== 'draw'} onClick={undo}>
                Undo
              </button>
              <button type="button" className="domino-btn" disabled={hud.stage !== 'draw'} onClick={clearAll}>
                Clear
              </button>
              <button type="button" className="domino-btn domino-btn--go" disabled={hud.stage !== 'draw' || hud.used === 0} onClick={go}>
                GO
              </button>
            </div>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner domino-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="domino"
              icon={meta.icon}
              title={meta.title}
              hint="Drag from the start pad to lay dominoes, then tap GO. Ring every bell to clear the level."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Chain champion!' : 'Chain over'}
            subtitle={`Score ${hud.score} · Level ${hud.level} · ${hud.cleared} cleared this run`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
