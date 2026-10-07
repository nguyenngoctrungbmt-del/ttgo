import { useEffect, useRef, useState } from 'react'
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
import './tumble.css'

const meta = getGame('tumble')

type Phase = 'idle' | 'play' | 'place' | 'dying' | 'over'
type Block = { id: number; layer: number; slot: number; out: number; tight: number; gold: boolean; cracked: boolean; offset: number; removed: boolean }
type Piece = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; w: number; h: number; gold: boolean; long: boolean; rested: boolean }
type Face = { id: number; pts: number[] }
type Snap = { blocks: Block[]; nextId: number }

const LH = 0.6
const START_LAYERS = 10

/** Z layers: blocks run front-to-back at x = slot. X layers: blocks run left-right at z = slot. */
function isZ(layer: number) {
  return layer % 2 === 0
}

type World = {
  blocks: Block[]
  nextId: number
  lean: number
  leanV: number
  margin: number
  active: number | null
  dragStart: { x: number; y: number; out: number } | null
  target: number
  strain: number
  creakT: number
  hold: Block | null
  hoverPhase: number
  dropT: number
  dropPos: number
  moves: number
  score: number
  combo: number
  glue: number
  peek: number
  slow: number
  glued: number
  peeking: boolean
  tremorT: number
  tremorWarn: number
  tremorLeft: number
  nextTremor: number
  pieces: Piece[]
  snap: Snap | null
  pan: number
  panDrag: { y: number; pan: number } | null
  warn: { id: number; t: number; load: boolean } | null
  stats: { moves: number; height: number; perfects: number; golds: number; combo: number }
  demoT: number
}

function makeTower(eye: number): { blocks: Block[]; nextId: number } {
  const blocks: Block[] = []
  let id = 0
  for (let l = 0; l < START_LAYERS; l++) {
    for (let s = -1; s <= 1; s++) {
      const tight = clamp(Math.pow(Math.random(), 0.8) * (1 - eye * 0.1), 0, 1)
      blocks.push({ id: id++, layer: l, slot: s, out: 0, tight, gold: false, cracked: false, offset: 0, removed: false })
    }
  }
  return { blocks, nextId: id }
}

function freshWorld(eye = 0): World {
  const t = makeTower(eye)
  return {
    blocks: t.blocks,
    nextId: t.nextId,
    lean: 0,
    leanV: 0,
    margin: 1,
    active: null,
    dragStart: null,
    target: 0,
    strain: 0,
    creakT: 0,
    hold: null,
    hoverPhase: 0,
    dropT: -1,
    dropPos: 0,
    moves: 0,
    score: 0,
    combo: 0,
    glue: 1,
    peek: 1,
    slow: 0,
    glued: 0,
    peeking: false,
    tremorT: 0,
    tremorWarn: 0,
    tremorLeft: 0,
    nextTremor: 12,
    pieces: [],
    snap: null,
    pan: 0,
    panDrag: null,
    warn: null,
    stats: { moves: 0, height: START_LAYERS, perfects: 0, golds: 0, combo: 0 },
    demoT: 0,
  }
}

function blockPos(b: Block) {
  const y = b.layer * LH + LH / 2
  if (isZ(b.layer)) return { x: b.slot + b.offset, y, z: -b.out, sx: 1, sz: 3 }
  return { x: b.out, y, z: b.slot + b.offset, sx: 3, sz: 1 }
}

function topLayer(blocks: Block[]) {
  let t = 0
  for (const b of blocks) if (!b.removed && b.layer > t) t = b.layer
  return t
}

/** Smallest distance from the load above each layer's centre of mass to its footprint edge (negative = toppling). */
function stability(blocks: Block[], skip = -1) {
  const live = blocks.filter((b) => !b.removed && b.id !== skip)
  const top = topLayer(live)
  let m = 9
  let dir = 0
  for (let k = 0; k < top; k++) {
    let sx = 0
    let sz = 0
    let n = 0
    for (const b of live) {
      if (b.layer <= k) continue
      const p = blockPos(b)
      sx += p.x
      sz += p.z
      n++
    }
    if (!n) continue
    const cx = sx / n
    const cz = sz / n
    let x0 = 9
    let x1 = -9
    let z0 = 9
    let z1 = -9
    let any = false
    for (const b of live) {
      if (b.layer !== k) continue
      const p = blockPos(b)
      x0 = Math.min(x0, p.x - p.sx / 2)
      x1 = Math.max(x1, p.x + p.sx / 2)
      z0 = Math.min(z0, p.z - p.sz / 2)
      z1 = Math.max(z1, p.z + p.sz / 2)
      any = true
    }
    if (!any) return { m: -1, dir: 1 }
    const mm = Math.min(cx - x0, x1 - cx, cz - z0, z1 - cz)
    if (mm < m) {
      m = mm
      dir = cx - (x0 + x1) / 2 + (cz - (z0 + z1) / 2) * 0.5 >= 0 ? 1 : -1
    }
  }
  return { m, dir }
}

function ToolIcon({ id }: { id: 'glue' | 'peek' | 'slow' }) {
  if (id === 'glue')
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <rect x="8" y="9" width="12" height="16" rx="3" fill="#f8fafc" />
        <rect x="11" y="3" width="6" height="7" rx="1.5" fill="#f59e0b" />
        <rect x="8" y="14" width="12" height="5" fill="#38bdf8" />
      </svg>
    )
  if (id === 'peek')
    return (
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="M2 14 Q14 3 26 14 Q14 25 2 14 Z" fill="#f8fafc" />
        <circle cx="14" cy="14" r="5" fill="#22c55e" />
        <circle cx="14" cy="14" r="2" fill="#052e16" />
      </svg>
    )
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="15" r="10" fill="none" stroke="#c4b5fd" strokeWidth="3" />
      <path d="M14 9 V15 L18 18" stroke="#c4b5fd" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export default function TumbleGame() {
  const run = useActionRun('tumble')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const fx = useRef(new Fx()).current
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const size = useRef({ W: 360, H: 600 })
  const faces = useRef<Face[]>([])
  const lastEvent = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, moves: 0, height: START_LAYERS, glue: 1, peek: 1, slow: 0, combo: 0, stab: 1 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  function say(text: string, sub?: string) {
    setBanner({ key: performance.now(), text, sub })
  }
  function pushHud() {
    const w = world.current
    setHud({ score: w.score, moves: w.moves, height: topLayer(w.blocks) + 1, glue: w.glue, peek: w.peek, slow: w.slow, combo: w.combo, stab: clamp(w.margin / 0.9, 0, 1) })
  }

  // ── View ─────────────────────────────────────────────
  function view(w: World) {
    const { W, H } = size.current
    const th = (topLayer(w.blocks) + 1) * LH
    const S = clamp((H - 250) / (th + 3.4), 30, 60)
    const ox = W / 2 - 0.35 * S
    const oy = H - 100 + w.pan
    return { S, ox, oy }
  }
  function proj(w: World, x: number, y: number, z: number) {
    const { S, ox, oy } = view(w)
    return [ox + (x + w.lean * y * 0.1 + z * 0.55) * S, oy - (y + z * 0.32) * S]
  }

  // ── Run ──────────────────────────────────────────────
  function start() {
    void unlockAudio()
    const w = freshWorld(run.level('eye'))
    w.glue = 1 + run.level('glue')
    world.current = w
    fx.reset()
    run.begin()
    takeSnap(w)
    setPhaseBoth('play')
    pushHud()
    say('TUMBLE TOWER', 'drag a block out slowly')
    sfx.ready()
  }

  function takeSnap(w: World) {
    w.snap = { blocks: w.blocks.map((b) => ({ ...b })), nextId: w.nextId }
  }

  function eligible(w: World, b: Block) {
    if (b.removed) return false
    const top = topLayer(w.blocks)
    const topCount = w.blocks.filter((k) => !k.removed && k.layer === top).length
    if (b.layer === top) return false
    if (topCount < 3 && b.layer === top - 1) return false
    return true
  }

  function effTight(w: World, b: Block) {
    const st = stability(w.blocks, b.id)
    const load = st.m < 0.12
    const depth = (topLayer(w.blocks) - b.layer) * 0.006
    return { tight: clamp((load ? Math.max(b.tight, 0.88) : b.tight) + depth, 0, 1), load }
  }

  function grabBlock(w: World, id: number, x: number, y: number) {
    const b = w.blocks.find((k) => k.id === id)
    if (!b || !eligible(w, b)) {
      sfx.miss()
      if (b) fx.text(x, y - 16, 'TOO HIGH', '#fca5a5', 13)
      return
    }
    w.active = id
    w.dragStart = { x, y, out: b.out }
    w.target = b.out
    const e = effTight(w, b)
    w.warn = { id, t: 0, load: e.load }
    if (e.load) {
      fx.text(x, y - 22, 'LOAD-BEARING!', '#fca5a5', 15)
      haptic.medium()
      sfx.hurt()
    } else if (e.tight < 0.35) {
      fx.text(x, y - 22, 'LOOSE', '#86efac', 14)
      sfx.tap()
      haptic.light()
    } else {
      fx.text(x, y - 22, 'SNUG', '#fde68a', 13)
      sfx.tick()
    }
  }

  function finishPull(w: World, b: Block) {
    b.removed = true
    w.active = null
    w.dragStart = null
    w.strain = 0
    const st = stability(w.blocks)
    if (st.m < 0) {
      collapse(st.dir, 'Pulled a load-bearing block')
      return
    }
    w.hold = { ...b, removed: false, out: 0, offset: 0 }
    if (b.gold) {
      w.score += 50
      w.stats.golds += 1
      fx.text(size.current.W / 2, 140, '+50 GOLD', '#fde047', 22)
      sfx.power()
    }
    w.hoverPhase = Math.random() * Math.PI * 2
    w.dropT = -1
    setPhaseBoth('place')
    sfx.whoosh()
    haptic.light()
    const [px, py] = proj(w, ...xyz(b))
    fx.burst(px, py, { count: 10, color: ['#fde68a', '#d6a46b', '#ffffff'], speed: 140, size: 3, gravity: 200 })
    pushHud()
  }

  function xyz(b: Block): [number, number, number] {
    const p = blockPos(b)
    return [p.x, p.y, p.z]
  }

  function releasePull(w: World) {
    const b = w.blocks.find((k) => k.id === w.active)
    w.active = null
    w.dragStart = null
    w.strain = 0
    if (!b) return
    if (b.out > 1.6 && b.out < 3) {
      // Hanging past the edge: it slides out by itself
      w.active = b.id
      w.target = 3.2
    }
  }

  function drop() {
    const w = world.current
    if (phaseRef.current !== 'place' || !w.hold || w.dropT >= 0) return
    w.dropT = 0
    w.dropPos = Math.sin(w.hoverPhase) * 1.3
    sfx.tap()
  }

  function land(w: World) {
    const b = w.hold
    if (!b) return
    w.hold = null
    const top = topLayer(w.blocks)
    const topCount = w.blocks.filter((k) => !k.removed && k.layer === top).length
    const layer = topCount >= 3 ? top + 1 : top
    const used = new Set(w.blocks.filter((k) => !k.removed && k.layer === layer).map((k) => k.slot))
    let slot = 0
    let bd = 9
    for (const s of [-1, 0, 1]) {
      if (used.has(s)) continue
      const d = Math.abs(w.dropPos - s)
      if (d < bd) {
        bd = d
        slot = s
      }
    }
    let off = w.dropPos - slot
    const { W } = size.current
    if (Math.abs(off) > 0.72) {
      w.combo = 0
      w.leanV += Math.sign(off) * 0.5
      fx.text(W / 2, 150, 'SLIPPED OFF!', '#fca5a5', 18)
      sfx.miss()
      haptic.error()
      const [px, py] = proj(w, isZ(layer) ? w.dropPos : 0, (layer + 0.5) * LH, isZ(layer) ? 0 : w.dropPos)
      w.pieces.push({ x: px, y: py, vx: Math.sign(off) * 120, vy: -60, rot: 0, vr: Math.sign(off) * 4, w: view(w).S * (isZ(layer) ? 1 : 3), h: view(w).S * LH, gold: b.gold, long: !isZ(layer), rested: false })
      nextMove(w, false)
      return
    }
    const perfect = Math.abs(off) <= 0.11
    if (perfect) off = 0
    const nb: Block = { id: w.nextId++, layer, slot, out: 0, tight: Math.random() * 0.6, gold: Math.random() < 0.06 && w.moves > 4, cracked: w.moves > 18 && Math.random() < 0.12, offset: off, removed: false }
    w.blocks.push(nb)
    const [px, py] = proj(w, ...xyz(nb))
    fx.burst(px, py + 4, { count: 10, color: ['#e7e5e4', '#d6a46b'], speed: 100, size: 3, gravity: 120, drag: 3 })
    fx.shake(2 + Math.abs(off) * 6, 0.15)
    w.leanV += off * 1.4 * (w.glued > 0 ? 0.3 : 1)
    sfx.thud()
    haptic.light()
    // Deeper pulls are riskier and worth more
    let gain = 10 + Math.max(0, top - b.layer) * 2
    if (perfect) {
      w.combo += 1
      w.stats.perfects += 1
      w.stats.combo = Math.max(w.stats.combo, w.combo)
      gain += 10 * Math.min(w.combo, 8)
      fx.text(px, py - 30, w.combo > 1 ? `PERFECT x${w.combo}` : 'PERFECT', '#fde047', 18 + Math.min(8, w.combo))
      fx.burst(px, py, { count: 18, color: ['#fde047', '#ffffff'], speed: 200, shape: 'spark', gravity: 100 })
      fx.ring(px, py, { color: '#fde047', maxR: 40, life: 0.35 })
      sfx.score(w.combo)
    } else {
      w.combo = 0
    }
    w.score += gain
    fx.text(px + 30, py - 12, `+${gain}`, '#fef3c7', 14)
    const st = stability(w.blocks)
    if (st.m < 0) {
      collapse(st.dir, 'The top block tipped it over')
      return
    }
    nextMove(w, true)
  }

  function nextMove(w: World, placed: boolean) {
    if (placed) {
      w.moves += 1
      w.stats.moves = w.moves
    }
    w.stats.height = topLayer(w.blocks) + 1
    if (w.glued > 0) w.glued -= 1
    w.peeking = false
    if (placed && w.moves % 5 === 0) {
      const pick = (['glue', 'peek', 'slow'] as const)[Math.floor(Math.random() * 3)]
      w[pick] += 1
      say('POWER-UP!', pick === 'glue' ? '+1 glue' : pick === 'peek' ? '+1 x-ray' : '+1 slow-mo')
      sfx.power()
    }
    const h = w.stats.height
    if (placed && h % 3 === 0 && w.blocks.filter((k) => !k.removed && k.layer === h - 1).length === 1) {
      say(`${h} LAYERS!`, h >= 18 ? 'dizzying heights' : 'keep climbing')
      sfx.levelUp()
      haptic.success()
      const now = performance.now()
      if (now - lastEvent.current > 30000) {
        lastEvent.current = now
        void trackEvent('action_milestone', { game_id: 'tumble', kind: 'height', value: h })
      }
    }
    run.update({ ...w.stats, score: w.score })
    takeSnap(w)
    setPhaseBoth('play')
    pushHud()
  }

  function collapse(dir: number, reason: string) {
    const w = world.current
    if (phaseRef.current === 'dying' || phaseRef.current === 'over') return
    setPhaseBoth('dying')
    w.active = null
    w.hold = null
    const { S } = view(w)
    for (const b of w.blocks) {
      if (b.removed) continue
      const [x, y] = proj(w, ...xyz(b))
      const k = b.layer / Math.max(1, topLayer(w.blocks))
      w.pieces.push({ x: x + (isZ(b.layer) ? 0 : S * 0.8), y, vx: dir * (40 + 220 * k) + rand(-40, 40), vy: -rand(0, 120) * k, rot: 0, vr: dir * rand(1, 4) * (0.3 + k), w: S * (isZ(b.layer) ? 1 : 3), h: S * LH, gold: b.gold, long: !isZ(b.layer), rested: false })
    }
    w.blocks.forEach((b) => (b.removed = true))
    fx.flash('#ef4444', 0.25)
    fx.shake(14, 0.6)
    fx.slowmo(1.2, 0.35)
    sfx.boom(0.8)
    sfx.lose()
    haptic.heavy()
    say('TUMBLE!', reason)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.moves * 0.6 + w.stats.perfects * 0.5 + w.stats.golds * 2)
      run.end({ score: w.score, cleared: w.stats.height >= 18, stats: { ...w.stats }, coins }, revive)
    }, 2000)
  }

  /** Ad revive: rewind to before the failing move, steady the tower, add glue. */
  function revive() {
    const w = world.current
    if (w.snap) {
      w.blocks = w.snap.blocks.map((b) => ({ ...b }))
      w.nextId = w.snap.nextId
    }
    w.pieces = []
    w.lean = 0
    w.leanV = 0
    w.glue += 1
    w.glued = 2
    w.hold = null
    w.active = null
    w.tremorWarn = 0
    w.tremorLeft = 0
    say('REVIVED!', 'tower rewound and glued')
    setPhaseBoth('play')
    pushHud()
  }

  function applyGlue() {
    const w = world.current
    if (w.glue <= 0 || (phaseRef.current !== 'play' && phaseRef.current !== 'place')) return
    w.glue -= 1
    w.lean *= 0.2
    w.leanV = 0
    w.glued = 3
    const { W, H } = size.current
    fx.ring(W / 2, H * 0.55, { color: '#7dd3fc', maxR: 160, life: 0.6, width: 5 })
    say('GLUED!', 'steady for 3 moves')
    sfx.power()
    haptic.success()
    pushHud()
  }
  function applyPeek() {
    const w = world.current
    if (w.peek <= 0 || phaseRef.current !== 'play' || w.peeking) return
    w.peek -= 1
    w.peeking = true
    sfx.power()
    pushHud()
  }
  function applySlow() {
    const w = world.current
    if (w.slow <= 0 || (phaseRef.current !== 'play' && phaseRef.current !== 'place')) return
    w.slow -= 1
    fx.slowmo(5, 0.45)
    say('SLOW-MO')
    sfx.power()
    pushHud()
  }

  // ── Input ────────────────────────────────────────────
  function pointIn(pts: number[], x: number, y: number) {
    let inside = false
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      const xi = pts[i]
      const yi = pts[i + 1]
      const xj = pts[j]
      const yj = pts[j + 1]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  function onDown(e: React.PointerEvent) {
    const ph = phaseRef.current
    const el = arenaRef.current
    if (!el) return
    const p = localPoint(e, el)
    const w = world.current
    if (ph === 'place') {
      drop()
      return
    }
    if (ph !== 'play') return
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    const list = faces.current
    for (let i = list.length - 1; i >= 0; i--) {
      if (pointIn(list[i].pts, p.x, p.y)) {
        grabBlock(w, list[i].id, p.x, p.y)
        return
      }
    }
    w.panDrag = { y: p.y, pan: w.pan }
  }
  function onMove(e: React.PointerEvent) {
    const w = world.current
    const el = arenaRef.current
    if (!el) return
    const p = localPoint(e, el)
    if (w.panDrag) {
      w.pan = clamp(w.panDrag.pan + (p.y - w.panDrag.y), 0, maxPan(w))
      return
    }
    if (w.active == null || !w.dragStart) return
    const { S } = view(w)
    const d = Math.hypot(p.x - w.dragStart.x, p.y - w.dragStart.y) / S
    w.target = clamp(w.dragStart.out + d * 1.25, 0, 3.2)
  }
  function onUp() {
    const w = world.current
    w.panDrag = null
    if (w.active != null && w.dragStart) releasePull(w)
  }
  function maxPan(w: World) {
    const { H } = size.current
    const th = (topLayer(w.blocks) + 1) * LH
    const { S } = view({ ...w, pan: 0 })
    return Math.max(0, (th + 3.4) * S - (H - 200))
  }

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        drop()
      } else if (e.key === 'g') applyGlue()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  // ── Simulation ───────────────────────────────────────
  function update(w: World, dt: number, raw: number, ph: Phase) {
    const st = stability(w.blocks)
    w.margin = st.m
    // Pulling
    if (w.active != null && ph === 'play') {
      const b = w.blocks.find((k) => k.id === w.active)
      if (b && !b.removed) {
        const e = effTight(w, b)
        const lim = 7 - 5.8 * e.tight
        const want = w.target - b.out
        const step = clamp(want, -lim * dt, lim * dt)
        b.out = clamp(b.out + step, 0, 3.2)
        w.strain = Math.max(0, want - step)
        const speed = Math.abs(step) / Math.max(dt, 1e-4)
        const dir = isZ(b.layer) ? -1 : 1
        const hands = 1 - run.level('hands') * 0.1
        const gl = w.glued > 0 ? 0.3 : 1
        const push = e.tight * (w.strain * 2.6 + speed * 0.22) * hands * gl
        w.leanV += dir * push * dt * 1.7
        if (b.cracked && speed > 4.5) {
          b.cracked = false
          w.leanV += dir * 0.9
          const [px, py] = proj(w, ...xyz(b))
          fx.burst(px, py, { count: 16, color: ['#d6a46b', '#7c4a21'], speed: 200, shape: 'square', size: 3, gravity: 500 })
          fx.text(px, py - 20, 'CRACK!', '#fca5a5', 15)
          sfx.hit()
          haptic.medium()
        }
        if (w.strain > 0.25 && e.tight > 0.4) {
          w.creakT -= raw
          if (w.creakT <= 0) {
            w.creakT = 0.18
            sfx.tick()
            haptic.light()
          }
        } else if (speed > 0.5 && Math.random() < 0.08) sfx.move()
        if (b.out >= 3) finishPull(w, b)
      }
    }
    // Tremors after move 12
    if (ph === 'play' && w.moves >= w.nextTremor && w.tremorWarn <= 0 && w.tremorLeft <= 0) {
      w.tremorWarn = 1.3
      w.nextTremor = w.moves + 4 + Math.floor(Math.random() * 4)
      say('TREMOR!', 'hold steady')
      sfx.boom(0.3)
    }
    if (w.tremorWarn > 0) {
      w.tremorWarn -= dt
      if (w.tremorWarn <= 0) w.tremorLeft = 1.2
    }
    if (w.tremorLeft > 0) {
      w.tremorLeft -= dt
      const gl = w.glued > 0 ? 0.25 : 1
      w.leanV += Math.sin(w.tremorLeft * 31) * 2.4 * dt * gl * Math.min(1.6, 0.7 + w.moves * 0.03)
      fx.shake(2, 0.1)
    }
    // Lean spring (taller towers sway more)
    const h = (topLayer(w.blocks) + 1) * LH
    const k = 16 / (1 + h * 0.04)
    const eq = st.m < 0.4 ? st.dir * (0.4 - st.m) * 0.3 : 0
    w.leanV += (-(w.lean - eq) * k - w.leanV * 2.4) * dt
    w.lean += w.leanV * dt
    const crit = 0.22 + 0.6 * clamp(st.m, 0, 0.8)
    if ((ph === 'play' || ph === 'place') && Math.abs(w.lean) > crit) collapse(Math.sign(w.lean), 'It swayed too far')
    if ((ph === 'play' || ph === 'place') && st.m < 0) collapse(st.dir, 'Off balance')

    // Placement hover
    if (ph === 'place') {
      const sp = 1.5 + Math.min(1.7, w.moves * 0.035)
      if (w.dropT < 0) w.hoverPhase += dt * sp
      else {
        w.dropT += dt
        if (w.dropT >= 0.22) {
          w.dropT = -1
          land(w)
        }
      }
      w.pan = approach(w.pan, 0, 4, raw)
    }
    if (w.warn) w.warn.t += raw

    // Falling pieces
    const { oy } = view(w)
    const ground = oy + 4
    for (const p of w.pieces) {
      if (p.rested) continue
      p.vy += 1500 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      if (p.y + p.h / 2 > ground) {
        p.y = ground - p.h / 2
        if (p.vy > 200) {
          fx.burst(p.x, ground, { count: 6, color: ['#d6d3d1', '#a8a29e'], speed: 120, size: 4, gravity: 200 })
          if (Math.random() < 0.3) sfx.thud()
        }
        p.vy *= -0.3
        p.vx *= 0.6
        p.vr *= 0.5
        if (Math.abs(p.vy) < 40) {
          p.rested = true
          p.rot = Math.round(p.rot / (Math.PI / 2)) * (Math.PI / 2)
        }
      }
    }
  }

  // Idle demo: pull a loose block out and stack it
  function demo(w: World, raw: number) {
    w.demoT += raw
    if (w.active == null && !w.hold && w.demoT > 1.6) {
      w.demoT = 0
      const opts = w.blocks.filter((b) => eligible(w, b) && stability(w.blocks, b.id).m > 0.3)
      if (!opts.length || topLayer(w.blocks) > 15) {
        world.current = freshWorld()
        return
      }
      const b = opts[Math.floor(Math.random() * opts.length)]
      w.active = b.id
      w.target = 3.2
      b.tight = 0
    }
    if (w.active != null) {
      const b = w.blocks.find((k) => k.id === w.active)
      if (b) {
        b.out = Math.min(3.2, b.out + raw * 2)
        if (b.out >= 3) {
          b.removed = true
          w.active = null
          w.hold = { ...b, removed: false, out: 0 }
          w.dropT = 0
          w.dropPos = 0
        }
      }
    } else if (w.hold) {
      w.dropT += raw
      if (w.dropT > 0.8) {
        const top = topLayer(w.blocks)
        const n = w.blocks.filter((k) => !k.removed && k.layer === top).length
        const layer = n >= 3 ? top + 1 : top
        const used = new Set(w.blocks.filter((k) => !k.removed && k.layer === layer).map((k) => k.slot))
        const slot = [0, -1, 1].find((s) => !used.has(s)) ?? 0
        w.blocks.push({ ...w.hold, id: w.nextId++, layer, slot, offset: 0 })
        w.hold = null
      }
    }
  }

  // ── Drawing ──────────────────────────────────────────
  function drawBox(ctx: CanvasRenderingContext2D, w: World, b: Block, alpha: number, shake: number, highlight: string | null, marker: string | null) {
    const p = blockPos(b)
    const x0 = p.x - p.sx / 2
    const x1 = p.x + p.sx / 2
    const y0 = p.y - LH / 2
    const y1 = p.y + LH / 2
    const z0 = p.z - p.sz / 2
    const z1 = p.z + p.sz / 2
    const P = (x: number, y: number, z: number) => {
      const r = proj(w, x, y, z)
      return [r[0] + shake, r[1]]
    }
    const f = [...P(x0, y0, z0), ...P(x1, y0, z0), ...P(x1, y1, z0), ...P(x0, y1, z0)]
    const tp = [...P(x0, y1, z0), ...P(x1, y1, z0), ...P(x1, y1, z1), ...P(x0, y1, z1)]
    const rt = [...P(x1, y0, z0), ...P(x1, y0, z1), ...P(x1, y1, z1), ...P(x1, y1, z0)]
    const gold = b.gold
    const poly = (pts: number[], fill: string) => {
      ctx.fillStyle = fill
      ctx.beginPath()
      ctx.moveTo(pts[0], pts[1])
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = 'rgba(92,52,20,0.55)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.globalAlpha = alpha
    const endGrain = isZ(b.layer)
    poly(f, gold ? '#eab308' : endGrain ? '#d9a066' : '#e3b27a')
    poly(tp, gold ? '#fde047' : '#f3cf9c')
    poly(rt, gold ? '#a16207' : endGrain ? '#b07a45' : '#a86f3c')
    // wood grain / end rings
    ctx.strokeStyle = gold ? 'rgba(255,255,255,0.4)' : 'rgba(124,74,33,0.35)'
    ctx.lineWidth = 1
    if (endGrain) {
      const cx = (f[0] + f[4]) / 2
      const cy = (f[1] + f[5]) / 2
      const r = Math.abs(f[2] - f[0]) * 0.32
      ctx.beginPath()
      ctx.ellipse(cx, cy, r, r * 0.55, 0, 0, Math.PI * 2)
      ctx.stroke()
      // long side grain on right face
      ctx.beginPath()
      ctx.moveTo((rt[0] + rt[6]) / 2, (rt[1] + rt[7]) / 2)
      ctx.lineTo((rt[2] + rt[4]) / 2, (rt[3] + rt[5]) / 2)
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.moveTo(f[0] + 3, (f[1] + f[7]) / 2 + 1)
      ctx.quadraticCurveTo((f[0] + f[2]) / 2, (f[1] + f[7]) / 2 - 2, f[2] - 3, (f[1] + f[7]) / 2)
      ctx.stroke()
      const cx = (rt[0] + rt[4]) / 2
      const cy = (rt[1] + rt[5]) / 2
      ctx.beginPath()
      ctx.ellipse(cx, cy, 3, 2, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (b.cracked) {
      ctx.strokeStyle = '#4a2a10'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(f[0] + (f[2] - f[0]) * 0.4, f[1])
      ctx.lineTo(f[0] + (f[2] - f[0]) * 0.5, (f[1] + f[7]) / 2)
      ctx.lineTo(f[0] + (f[2] - f[0]) * 0.42, f[7])
      ctx.stroke()
    }
    if (highlight) {
      ctx.strokeStyle = highlight
      ctx.lineWidth = 2.5
      for (const pts of [f, rt, tp]) {
        ctx.beginPath()
        ctx.moveTo(pts[0], pts[1])
        for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
        ctx.closePath()
        ctx.stroke()
      }
    }
    if (marker) {
      const pts = endGrain ? f : rt
      const cx = (pts[0] + pts[4]) / 2
      const cy = (pts[1] + pts[5]) / 2
      ctx.fillStyle = marker
      ctx.beginPath()
      ctx.arc(cx, cy, 3.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    return { f, rt }
  }

  function frame({ ctx, w: W, h: H, raw }: Frame) {
    size.current = { W, H }
    const w = world.current
    const ph = phaseRef.current
    const dt = fx.step(raw)
    if (ph === 'idle') demo(w, raw)
    update(w, dt, raw, ph)

    // backdrop: warm room
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#3b2416')
    g.addColorStop(0.6, '#5b3a22')
    g.addColorStop(1, '#2a180c')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    glow(ctx, W * 0.5, H * 0.25, W * 0.7, '#fbbf24', 0.18)
    // lamp
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(W * 0.5, 0)
    ctx.lineTo(W * 0.5, 34)
    ctx.stroke()
    ctx.fillStyle = '#1c1917'
    ctx.beginPath()
    ctx.moveTo(W * 0.5 - 26, 50)
    ctx.lineTo(W * 0.5 + 26, 50)
    ctx.lineTo(W * 0.5 + 12, 32)
    ctx.lineTo(W * 0.5 - 12, 32)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fde68a'
    ctx.beginPath()
    ctx.ellipse(W * 0.5, 50, 20, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    fx.applyShake(ctx)
    const { S, oy } = view(w)
    // table
    ctx.fillStyle = '#7c4a21'
    ctx.fillRect(-20, oy + 2, W + 40, H)
    ctx.fillStyle = '#a0632e'
    ctx.fillRect(-20, oy, W + 40, 6)
    ctx.fillStyle = 'rgba(0,0,0,0.12)'
    for (let i = 0; i < 6; i++) ctx.fillRect(-20, oy + 18 + i * 22, W + 40, 2)
    // tower shadow
    const [sx0] = proj(w, -1.5, 0, -1.5)
    const [sx1] = proj(w, 1.5, 0, 1.5)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.ellipse((sx0 + sx1) / 2 + 6, oy + 4, (sx1 - sx0) * 0.62, 7, 0, 0, Math.PI * 2)
    ctx.fill()

    // blocks: layers bottom-up, back-to-front, pulled blocks last
    const live = w.blocks.filter((b) => !b.removed)
    live.sort((a, b) => {
      const pa = a.out > 0.05 ? 1 : 0
      const pb = b.out > 0.05 ? 1 : 0
      if (pa !== pb) return pa - pb
      if (a.layer !== b.layer) return a.layer - b.layer
      const A = blockPos(a)
      const B = blockPos(b)
      if (A.z !== B.z) return B.z - A.z
      return A.x - B.x
    })
    const list: Face[] = []
    for (const b of live) {
      let shake = 0
      let hl: string | null = null
      if (w.active === b.id) {
        hl = '#fde047'
        if (w.strain > 0.15) shake = (Math.random() - 0.5) * Math.min(4, w.strain * 6)
      }
      if (w.warn && w.warn.id === b.id && w.warn.t < 1.2) {
        if (w.warn.load) {
          hl = Math.sin(w.warn.t * 30) > 0 ? '#ef4444' : '#fca5a5'
          shake = Math.sin(w.warn.t * 50) * 2 * (1.2 - w.warn.t)
        } else if (!hl) hl = '#86efac'
      }
      let marker: string | null = null
      if (w.peeking && ph === 'play' && eligible(w, b)) {
        const e = effTight(w, b)
        marker = e.load ? '#ef4444' : e.tight < 0.35 ? '#22c55e' : '#f59e0b'
      }
      const r = drawBox(ctx, w, b, 1, shake, hl, marker)
      if (ph === 'play' && eligible(w, b)) list.push({ id: b.id, pts: r.f }, { id: b.id, pts: r.rt })
    }
    faces.current = list

    // held block hovering above the tower
    if (w.hold && (ph === 'place' || ph === 'idle')) {
      const top = topLayer(w.blocks)
      const n = w.blocks.filter((k) => !k.removed && k.layer === top).length
      const layer = n >= 3 ? top + 1 : top
      const pos = w.dropT >= 0 && ph === 'place' ? w.dropPos : ph === 'idle' ? 0 : Math.sin(w.hoverPhase) * 1.3
      const lift = w.dropT >= 0 ? (1 - Math.min(1, w.dropT / 0.22)) * 2 : 2
      const hb: Block = { ...w.hold, layer, slot: 0, offset: pos, out: 0 }
      ctx.save()
      ctx.translate(0, -lift * S)
      // guide lines down to the slots
      if (ph === 'place') {
        const used = new Set(w.blocks.filter((k) => !k.removed && k.layer === layer).map((k) => k.slot))
        for (const s of [-1, 0, 1]) {
          if (used.has(s)) continue
          const q = blockPos({ ...hb, offset: s })
          const [gx, gy] = proj(w, q.x, q.y - LH / 2, q.z)
          ctx.strokeStyle = Math.abs(pos - s) < 0.11 ? 'rgba(253,224,71,0.95)' : 'rgba(255,255,255,0.25)'
          ctx.lineWidth = 2
          ctx.setLineDash([4, 4])
          ctx.beginPath()
          ctx.moveTo(gx, gy + lift * S)
          ctx.lineTo(gx, gy + lift * S - 8)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
      drawBox(ctx, w, hb, 1, 0, '#fde68a', null)
      ctx.restore()
    }

    // pieces (collapse / slipped)
    for (const p of w.pieces) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.gold ? '#eab308' : p.long ? '#e3b27a' : '#d9a066'
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.fillStyle = p.gold ? '#fde047' : '#f3cf9c'
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * 0.25)
      ctx.strokeStyle = 'rgba(124,74,33,0.5)'
      ctx.lineWidth = 1
      ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  // HUD stability meter refresh
  useEffect(() => {
    const id = window.setInterval(() => {
      if (phaseRef.current === 'play' || phaseRef.current === 'place') {
        const w = world.current
        const crit = 0.22 + 0.6 * clamp(w.margin, 0, 0.8)
        setHud((h) => ({ ...h, stab: clamp(1 - Math.abs(w.lean) / crit, 0, 1) * clamp(w.margin / 0.5, 0.2, 1) }))
      }
    }, 150)
    return () => window.clearInterval(id)
  }, [])

  const stabCol = hud.stab > 0.6 ? '#4ade80' : hud.stab > 0.3 ? '#facc15' : '#ef4444'
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div ref={arenaRef} className="action-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  {hud.height} layers · {hud.moves} moves
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">Stability</span>
                <div className="tumble-meter">
                  <span style={{ width: `${hud.stab * 100}%`, background: stabCol }} />
                </div>
                {hud.combo > 1 ? <span className="action-hud__small">Perfect x{hud.combo}</span> : null}
              </div>
            </div>
          )}
          {(phase === 'play' || phase === 'place') && (
            <>
              <div className="tumble-hint">{phase === 'play' ? 'Drag a block out — slowly if it is tight' : 'Tap to drop it on top'}</div>
              <div className="tumble-tools" onPointerDown={(e) => e.stopPropagation()}>
                <button type="button" className="tumble-tool" aria-label="Glue" disabled={hud.glue <= 0} onClick={applyGlue}>
                  <ToolIcon id="glue" />
                  <b>{hud.glue}</b>
                  <small>Glue</small>
                </button>
                <button type="button" className="tumble-tool" aria-label="X-ray" disabled={hud.peek <= 0 || phase !== 'play'} onClick={applyPeek}>
                  <ToolIcon id="peek" />
                  <b>{hud.peek}</b>
                  <small>X-ray</small>
                </button>
                <button type="button" className="tumble-tool" aria-label="Slow-mo" disabled={hud.slow <= 0} onClick={applySlow}>
                  <ToolIcon id="slow" />
                  <b>{hud.slow}</b>
                  <small>Slow</small>
                </button>
              </div>
            </>
          )}
          {banner && phase !== 'idle' && phase !== 'over' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="tumble"
              icon={meta.icon}
              title={meta.title}
              hint="Slide blocks out of the tower and stack them on top. Tight blocks must be pulled gently."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.height >= 18 ? 'Tower master!' : 'Tumble!'}
            subtitle={`Score ${hud.score} · ${hud.height} layers · ${hud.moves} moves`}
            celebrate={hud.height >= 18}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
