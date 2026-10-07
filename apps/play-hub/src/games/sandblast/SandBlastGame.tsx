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
import {
  BLOCK,
  RAINBOW_BASE,
  SH,
  STONE,
  SW,
  SandField,
  TETROS,
  collides,
  fillTerrain,
  makeRng,
  pieceWidth,
  rotateBlocks,
  specFor,
  type LevelSpec,
  type Piece,
} from './sand'
import '../../shared/action/action.css'
import { LEVELS, authoredSpec, paintAuthored } from './levels'
import './sandblast.css'

const meta = getGame('sandblast')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type Coin = { x: number; y: number; t: number; d: number }
type Sym = 'circle' | 'star' | 'square' | 'triangle' | 'heart' | 'diamond'

const COLS: { name: string; rgb: [number, number, number]; sym: Sym; css: string }[] = [
  { name: 'Red', rgb: [239, 68, 68], sym: 'circle', css: '#ef4444' },
  { name: 'Yellow', rgb: [250, 204, 21], sym: 'star', css: '#facc15' },
  { name: 'Blue', rgb: [59, 130, 246], sym: 'square', css: '#3b82f6' },
  { name: 'Green', rgb: [34, 197, 94], sym: 'triangle', css: '#22c55e' },
  { name: 'Purple', rgb: [168, 85, 247], sym: 'heart', css: '#a855f7' },
  { name: 'Teal', rgb: [20, 184, 166], sym: 'diamond', css: '#14b8a6' },
]

/** RGBA palette for every cell value. */
const PALETTE = (() => {
  const p = new Uint32Array(256)
  const pack = (r: number, g: number, b: number) => (255 << 24) | (Math.max(0, Math.min(255, b)) << 16) | (Math.max(0, Math.min(255, g)) << 8) | Math.max(0, Math.min(255, r))
  for (let c = 0; c < COLS.length; c++) {
    const [r, g, b] = COLS[c].rgb
    const shades = [1.12, 1, 0.9, 0.8]
    for (let s = 0; s < 4; s++) p[c * 4 + s + 1] = pack(r * shades[s], g * shades[s], b * shades[s])
  }
  for (let s = 0; s < 4; s++) p[RAINBOW_BASE + s] = pack(255, 255, 255)
  p[STONE] = pack(100, 116, 139)
  return p
})()

function symbolPath(g: CanvasRenderingContext2D, sym: Sym, x: number, y: number, r: number) {
  g.beginPath()
  if (sym === 'circle') g.arc(x, y, r * 0.8, 0, Math.PI * 2)
  else if (sym === 'square') g.rect(x - r * 0.7, y - r * 0.7, r * 1.4, r * 1.4)
  else if (sym === 'triangle') {
    g.moveTo(x, y - r * 0.95)
    g.lineTo(x + r * 0.95, y + r * 0.7)
    g.lineTo(x - r * 0.95, y + r * 0.7)
    g.closePath()
  } else if (sym === 'diamond') {
    g.moveTo(x, y - r)
    g.lineTo(x + r * 0.8, y)
    g.lineTo(x, y + r)
    g.lineTo(x - r * 0.8, y)
    g.closePath()
  } else if (sym === 'heart') {
    g.moveTo(x, y + r * 0.85)
    g.bezierCurveTo(x - r * 1.3, y - r * 0.1, x - r * 0.6, y - r * 1.15, x, y - r * 0.4)
    g.bezierCurveTo(x + r * 0.6, y - r * 1.15, x + r * 1.3, y - r * 0.1, x, y + r * 0.85)
    g.closePath()
  } else {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const rr = i % 2 ? r * 0.45 : r
      if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
      else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    }
    g.closePath()
  }
}

const DANGER = 10

type World = {
  level: number
  spec: LevelSpec
  field: SandField
  piece: Piece | null
  next: Piece
  spawnT: number
  bridges: number
  pieces: number
  clearing: { cells: number[]; color: number; t: number } | null
  chain: number
  chainT: number
  checkT: number
  dangerT: number
  score: number
  coins: number
  bombs: number
  rainbows: number
  swaps: number
  failT: number
  clearT: number
  idleT: number
  slam: number
  flying: Coin[]
  stats: { score: number; level: number; bridges: number; grains: number; combo: number; hard: number }
}

function freshWorld(): World {
  return {
    level: 0,
    spec: specFor(1),
    field: new SandField(),
    piece: null,
    next: { blocks: TETROS[0], x: 0, y: 0, color: 0, kind: 'sand' },
    spawnT: 0,
    bridges: 0,
    pieces: 0,
    clearing: null,
    chain: 0,
    chainT: 0,
    checkT: 0,
    dangerT: 0,
    score: 0,
    coins: 0,
    bombs: 1,
    rainbows: 1,
    swaps: 2,
    failT: 0,
    clearT: 0,
    idleT: 0.5,
    slam: 0,
    flying: [],
    stats: { score: 0, level: 1, bridges: 0, grains: 0, combo: 0, hard: 0 },
  }
}

const BombIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="14" r="7" fill="currentColor" fillOpacity="0.3" />
    <path d="M15 9l3-3M18 6l1-3M18 6l3 1" />
  </svg>
)
const RainbowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M3 18a9 9 0 0 1 18 0" />
    <path d="M7 18a5 5 0 0 1 10 0" />
  </svg>
)
const SwapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </svg>
)

export default function SandBlastGame() {
  const run = useActionRun('sandblast')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 620 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const lastEvent = useRef(0)
  const rng = useRef(makeRng(Date.now() & 0xffff))
  const img = useRef<{ c: HTMLCanvasElement; ctx: CanvasRenderingContext2D; data: ImageData; u32: Uint32Array } | null>(null)
  const press = useRef<{ id: number; x: number; y: number; t: number; px: number; moved: boolean; dropped: boolean } | null>(null)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hard: false, coins: 0, bridges: 0, goal: 2, bombs: 0, rainbows: 0, swaps: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string; stars?: number; hard?: boolean } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.level, hard: w.spec.hard, coins: w.coins, bridges: w.bridges, goal: w.spec.goal, bombs: w.bombs, rainbows: w.rainbows, swaps: w.swaps })
  }

  const playing = () => phaseRef.current === 'play'

  function geo() {
    const { w: W, h: H } = size.current
    const top = 76
    const bottom = H - 88
    const s = Math.min((W - 34) / SW, (bottom - top) / SH)
    const fw = SW * s
    const fh = SH * s
    return { W, H, s, fw, fh, fx: (W - fw) / 2, fy: top + Math.max(0, (bottom - top - fh) / 2) }
  }

  // ── Pieces ──────────────────────────────────────
  function randomPiece(): Piece {
    const w = world.current
    const r = rng.current
    return { blocks: TETROS[Math.floor(r() * TETROS.length)], x: 0, y: 0, color: Math.floor(r() * w.spec.colors), kind: 'sand' }
  }

  function spawn() {
    const w = world.current
    const p = w.next
    w.next = randomPiece()
    const pw = pieceWidth(p)
    p.x = Math.round((SW - pw) / 2 / BLOCK) * BLOCK
    p.y = -BLOCK * 0.5
    if (collides(w.field, p, p.x, Math.max(0, p.y))) {
      w.piece = null
      if (playing()) overflow()
      return
    }
    w.piece = p
  }

  function land(p: Piece) {
    const w = world.current
    const f = w.field
    const g = geo()
    const yi = Math.floor(p.y)
    w.piece = null
    w.spawnT = 0.18
    if (playing()) w.pieces += 1
    if (p.kind === 'bomb') {
      const cx = p.x + BLOCK
      const cy = yi + BLOCK
      const n = f.blast(cx, cy, BLOCK * 2.4)
      const px = g.fx + cx * g.s
      const py = g.fy + cy * g.s
      fx.explode(px, py, 1.6, ['#fde047', '#fb923c', '#ef4444', '#fff7ed'])
      fx.flash('#fde047', 0.15)
      fx.stop(0.08)
      sfx.boom(0.8)
      haptic.heavy()
      if (playing()) {
        w.score += n
        w.stats.grains += n
        fx.text(px, py - 30, `BOOM +${n}`, '#fde047', 18)
      }
      return
    }
    for (const [bx, by] of p.blocks) {
      for (let y = 0; y < BLOCK; y++) {
        for (let x = 0; x < BLOCK; x++) {
          const gx = p.x + bx * BLOCK + x
          const gy = yi + by * BLOCK + y
          if (gy < 0) continue
          const shade = ((x + y * 3) & 3) ^ (Math.random() < 0.3 ? 1 : 0)
          f.set(gx, gy, p.kind === 'rainbow' ? RAINBOW_BASE + shade : p.color * 4 + 1 + shade)
        }
      }
    }
    // a little crumble: loosen the top grains so they trickle
    const px = g.fx + (p.x + pieceWidth(p) / 2) * g.s
    const py = g.fy + (yi + BLOCK * 2) * g.s
    const col = p.kind === 'rainbow' ? '#ffffff' : COLS[p.color].css
    fx.burst(px, py, { count: 10, color: [col, '#fde68a', '#ffffff'], speed: 120, size: 2.5, gravity: 300, angle: -Math.PI / 2, spread: 2.4 })
    w.slam = Math.max(w.slam, 0.25)
    if (phaseRef.current === 'play' || phaseRef.current === 'clear') {
      sfx.thud()
      haptic.light()
    }
  }

  function tryMove(dx: number) {
    const w = world.current
    const p = w.piece
    if (!p) return false
    const ny = Math.max(0, p.y)
    if (collides(w.field, p, p.x + dx, ny)) return false
    p.x += dx
    return true
  }

  function rotate() {
    const w = world.current
    const p = w.piece
    if (!p || p.kind === 'bomb') return
    const nb = rotateBlocks(p.blocks)
    const test: Piece = { ...p, blocks: nb }
    for (const kick of [0, -BLOCK, BLOCK, -2 * BLOCK, 2 * BLOCK]) {
      const nx = Math.max(0, Math.min(SW - pieceWidth(test), p.x + kick))
      if (!collides(w.field, test, nx, Math.max(0, p.y))) {
        p.blocks = nb
        p.x = nx
        if (playing()) sfx.flip()
        return
      }
    }
  }

  function hardDrop() {
    const w = world.current
    const p = w.piece
    if (!p) return
    let y = Math.max(0, Math.floor(p.y))
    while (!collides(w.field, p, p.x, y + 1)) y++
    const dist = y - p.y
    p.y = y
    if (playing()) {
      w.score += Math.max(0, Math.round(dist / BLOCK))
      sfx.whoosh()
      fx.shake(3, 0.12)
    }
    land(p)
  }

  // ── Bridges ─────────────────────────────────────
  function checkBridge() {
    const w = world.current
    if (w.clearing) return
    const b = w.field.findBridge(w.spec.colors)
    if (!b) return
    w.clearing = { cells: b.cells, color: b.color, t: 0 }
    if (phaseRef.current === 'play') {
      sfx.ready()
      haptic.medium()
    }
  }

  function finishClear() {
    const w = world.current
    const c = w.clearing
    if (!c) return
    w.clearing = null
    const g = geo()
    const n = c.cells.length
    // particles from a sample of the cleared grains
    const step = Math.max(1, Math.floor(n / 70))
    for (let k = 0; k < n; k += step) {
      const i = c.cells[k]
      fx.burst(g.fx + ((i % SW) + 0.5) * g.s, g.fy + (Math.floor(i / SW) + 0.5) * g.s, { count: 1, color: [COLS[c.color].css, '#ffffff', '#fde68a'], speed: 200, size: 3, gravity: 260, life: 0.7 })
    }
    w.field.removeCells(c.cells)
    if (!playing()) return
    w.chain = w.chainT > 0 ? w.chain + 1 : 1
    w.chainT = 2.4
    const gain = n * w.chain
    w.score += gain
    w.bridges += 1
    w.stats.bridges += 1
    w.stats.grains += n
    w.stats.combo = Math.max(w.stats.combo, w.chain)
    w.stats.score = w.score
    let ys = 0
    for (const i of c.cells) ys += Math.floor(i / SW)
    const cy = g.fy + (ys / n) * g.s
    fx.text(g.W / 2, cy - 10, w.chain > 1 ? `+${gain} CHAIN x${w.chain}` : `+${gain}`, w.chain > 1 ? '#fde047' : '#ffffff', 20 + Math.min(8, w.chain * 2))
    fx.ring(g.W / 2, cy, { color: COLS[c.color].css, maxR: g.fw * 0.55, life: 0.45, width: 6 })
    fx.shake(5 + Math.min(6, n / 120), 0.25)
    fx.stop(0.05)
    sfx.boom(0.35)
    sfx.match()
    if (w.chain >= 2) {
      sfx.combo()
      setBanner({ key: Date.now(), text: w.chain === 2 ? 'DOUBLE BRIDGE!' : `CHAIN x${w.chain}!` })
    }
    haptic.heavy()
    run.update(w.stats)
    pushHud()
    if (w.bridges >= w.spec.goal) levelClear()
  }

  // ── Boosters ────────────────────────────────────
  function useBomb() {
    const w = world.current
    if (!playing() || w.bombs <= 0 || !w.piece) return
    w.bombs -= 1
    const p = w.piece
    w.piece = { blocks: [[0, 0], [1, 0], [0, 1], [1, 1]], x: Math.max(0, Math.min(SW - 2 * BLOCK, p.x)), y: p.y, color: p.color, kind: 'bomb' }
    if (collides(w.field, w.piece, w.piece.x, Math.max(0, w.piece.y))) w.piece.y = Math.max(-BLOCK, p.y - BLOCK)
    sfx.power()
    haptic.medium()
    pushHud()
  }

  function useRainbow() {
    const w = world.current
    if (!playing() || w.rainbows <= 0 || !w.piece || w.piece.kind !== 'sand') return
    w.rainbows -= 1
    w.piece.kind = 'rainbow'
    sfx.power()
    haptic.medium()
    pushHud()
  }

  function useSwap() {
    const w = world.current
    if (!playing() || w.swaps <= 0 || !w.piece || w.piece.kind !== 'sand') return
    const cur = w.piece
    const nxt = w.next
    const cand: Piece = { ...nxt, x: Math.min(cur.x, SW - pieceWidth(nxt)), y: cur.y }
    if (collides(w.field, cand, cand.x, Math.max(0, cand.y))) return
    w.swaps -= 1
    w.piece = cand
    w.next = { ...cur, x: 0, y: 0 }
    sfx.flip()
    haptic.light()
    pushHud()
  }

  // ── Lifecycle ───────────────────────────────────
  function start(level?: number) {
    void unlockAudio()
    const first = typeof level === 'number' && level >= 1 ? Math.floor(level) : run.nextLevel
    const w = freshWorld()
    w.bombs = 1 + run.level('bomb')
    world.current = w
    fx.reset()
    setPhaseBoth('play')
    run.begin()
    beginLevel(first)
  }

  function beginLevel(n: number) {
    const w = world.current
    w.level = n
    const authored = authoredSpec(n)
    w.spec = authored ?? specFor(n)
    w.bridges = 0
    w.pieces = 0
    w.clearing = null
    w.chain = 0
    w.dangerT = 0
    w.failT = 0
    if (authored) {
      // hand-made sand + the fixed piece sequence the level was verified with
      const seed = LEVELS[n - 1].seed
      paintAuthored(w.field, n, makeRng(seed ^ 0x5bd1))
      rng.current = makeRng(seed)
    } else fillTerrain(w.field, w.spec, makeRng(Math.floor(Math.random() * 1e9)))
    w.next = randomPiece()
    w.piece = null
    w.spawnT = 0.6
    w.stats.level = n
    const spec = w.spec
    setBanner({ key: Date.now(), text: spec.hard ? 'HARD LEVEL' : `LEVEL ${n}`, sub: [LEVELS[n - 1]?.name, spec.intro ?? (spec.hard ? 'faster sand' : `build ${spec.goal} bridges`)].filter(Boolean).join(' · '), hard: spec.hard })
    if (spec.hard) sfx.boom(0.3)
    else sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function levelClear() {
    const w = world.current
    // Stars by pieces used: up to 6 per bridge = 3, up to 9 = 2, otherwise 1.
    const stars = w.pieces <= w.spec.goal * 6 ? 3 : w.pieces <= w.spec.goal * 9 ? 2 : 1
    run.completeLevel(w.level, stars)
    const bonus = 150 + stars * 60 + (w.spec.hard ? 250 : 0)
    w.score += bonus
    w.coins += 2 + stars + (w.spec.hard ? 5 : 0)
    if (w.spec.hard) w.stats.hard += 1
    w.stats.score = w.score
    let gift = ''
    if (w.spec.hard) {
      w.bombs += 1
      gift = ' · +1 bomb'
    } else if (w.level % 3 === 0) {
      if (Math.random() < 0.5) {
        w.rainbows += 1
        gift = ' · +1 rainbow'
      } else {
        w.swaps += 1
        gift = ' · +1 swap'
      }
    }
    setPhaseBoth('clear')
    w.clearT = 2
    w.piece = null
    const g = geo()
    for (let k = 0; k < 4; k++) fx.burst(g.W * (0.2 + k * 0.2), g.H * 0.4, { count: 18, color: ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#ffffff'], speed: 360, shape: 'square', size: 5, gravity: 420, life: 1.1 })
    for (let k = 0; k < 2 + stars * 2; k++) w.flying.push({ x: g.W / 2 + rand(-40, 40), y: g.H * 0.45 + rand(-20, 20), t: 0, d: 0.5 + k * 0.08 })
    fx.flash('#fef9c3', 0.2)
    sfx.win()
    haptic.success()
    setBanner({ key: Date.now(), text: w.spec.hard ? 'HARD LEVEL BEATEN!' : `LEVEL ${w.level} CLEAR!`, sub: `+${bonus}${gift}`, stars })
    if ((w.level % 5 === 0 || w.spec.hard) && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'sandblast', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  function overflow() {
    const w = world.current
    if (!playing()) return
    w.failT = 1.1
    w.piece = null
    setPhaseBoth('dying')
    setBanner({ key: Date.now(), text: 'OVERFLOW!', hard: true })
    fx.flash('#ef4444', 0.3)
    fx.shake(10, 0.45)
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

  /** Revive: blow away the upper half of the sand and hand over a bomb. */
  function revive() {
    const w = world.current
    const f = w.field
    const g = geo()
    const cut = Math.floor(SH * 0.65)
    for (let y = 0; y < cut; y++) {
      for (let x = 0; x < SW; x++) {
        const i = y * SW + x
        if (f.g[i] && (x + y) % 9 === 0) fx.burst(g.fx + x * g.s, g.fy + y * g.s, { count: 1, color: ['#fde68a', '#fb923c', '#ffffff'], speed: 260, size: 3, gravity: -60, life: 0.7 })
        f.g[i] = 0
      }
    }
    f.wakeAll()
    w.bombs += 1
    w.dangerT = 0
    w.failT = 0
    w.spawnT = 0.8
    w.clearing = null
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'sand blown away · +1 bomb' })
    fx.flash('#fef3c7', 0.25)
    sfx.boom(0.5)
    pushHud()
  }

  // ── Input ───────────────────────────────────────
  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (!playing()) return
    const p = localPoint(e, e.currentTarget)
    e.currentTarget.setPointerCapture(e.pointerId)
    press.current = { id: e.pointerId, x: p.x, y: p.y, t: performance.now(), px: world.current.piece?.x ?? 0, moved: false, dropped: false }
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const pr = press.current
    if (!pr || pr.id !== e.pointerId || !playing()) return
    const w = world.current
    const p = localPoint(e, e.currentTarget)
    const dx = p.x - pr.x
    const dy = p.y - pr.y
    if (!pr.dropped && dy > 70 && dy > Math.abs(dx) * 1.6 && performance.now() - pr.t < 450) {
      pr.dropped = true
      hardDrop()
      return
    }
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) pr.moved = true
    if (pr.dropped || !w.piece) return
    const { s } = geo()
    const target = Math.max(0, Math.min(SW - pieceWidth(w.piece), pr.px + Math.round(dx / s)))
    let guard = 0
    while (w.piece.x !== target && guard++ < SW) {
      if (!tryMove(Math.sign(target - w.piece.x))) break
    }
  }

  function onUp(e: PointerEvent<HTMLDivElement>) {
    const pr = press.current
    if (!pr || pr.id !== e.pointerId) return
    press.current = null
    if (!playing() || pr.dropped) return
    if (!pr.moved && performance.now() - pr.t < 350) rotate()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (phaseRef.current !== 'play') return
      if (e.key === 'ArrowLeft') tryMove(-3)
      else if (e.key === 'ArrowRight') tryMove(3)
      else if (e.key === 'ArrowUp') rotate()
      else if (e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        hardDrop()
      } else if (e.key === 'b') useBomb()
      else if (e.key === 'r') useRainbow()
      else if (e.key === 's') useSwap()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Tick ────────────────────────────────────────
  function speed() {
    const w = world.current
    return w.spec.speed * (1 - 0.08 * (phaseRef.current === 'idle' ? 0 : run.level('slow')))
  }

  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    const f = w.field
    if (ph === 'idle') {
      if (w.level === 0) {
        w.level = 1
        w.spec = { ...specFor(3), goal: 99 }
        fillTerrain(f, w.spec, makeRng(7))
        w.next = randomPiece()
      }
      if (w.piece) {
        w.idleT -= raw
        if (w.idleT <= 0) {
          w.idleT = 0.9
          const p = w.piece
          const target = Math.floor(Math.random() * ((SW - pieceWidth(p)) / BLOCK + 1)) * BLOCK
          while (p.x !== target && tryMove(Math.sign(target - p.x)));
          if (Math.random() < 0.5) rotate()
        }
      }
      if (f.top() < DANGER + 20) fillTerrain(f, w.spec, makeRng(Math.floor(Math.random() * 999)))
    }
    // the sand: settle faster than it falls
    const flashing = !!w.clearing
    if (!flashing && dt > 0) {
      f.step()
      f.step()
      if (dt > 0.02) f.step()
    }
    if (w.clearing) {
      w.clearing.t += raw
      if (w.clearing.t > 0.45) finishClear()
    } else {
      w.checkT -= raw
      if (w.checkT <= 0) {
        w.checkT = 0.12
        checkBridge()
      }
    }
    w.chainT = Math.max(0, w.chainT - dt)
    w.slam = Math.max(0, w.slam - raw)

    const live = ph === 'play' || ph === 'idle'
    if (live && !flashing) {
      if (!w.piece) {
        w.spawnT -= dt
        if (w.spawnT <= 0) spawn()
      } else {
        const p = w.piece
        const ny = p.y + speed() * dt * (ph === 'idle' ? 2.2 : 1)
        if (collides(f, p, p.x, Math.max(0, Math.floor(ny)) + 1) && ny >= 0) {
          let y = Math.max(0, Math.floor(p.y))
          while (!collides(f, p, p.x, y + 1) && y < ny) y++
          p.y = y
          land(p)
        } else p.y = ny
      }
    }
    if (ph === 'play') {
      // overflow: settled sand above the danger line
      if (f.top() < DANGER && f.moved < 20) {
        w.dangerT += dt
        if (w.dangerT > 0.6) overflow()
      } else w.dangerT = Math.max(0, w.dangerT - dt)
    } else if (ph === 'clear') {
      w.clearT -= raw
      // sweep the old sand away from the bottom up
      if (w.clearT < 1.4) {
        const g = geo()
        for (let k = 0; k < 4; k++) {
          const y = SH - 1 - Math.floor((1.4 - w.clearT) * SH * 0.8) + k
          if (y < 0 || y >= SH) continue
          for (let x = 0; x < SW; x++) {
            if (f.g[y * SW + x] && x % 7 === 0) fx.burst(g.fx + x * g.s, g.fy + y * g.s, { count: 1, color: ['#fde68a', '#ffffff'], speed: 120, size: 2.5, gravity: -80, life: 0.5 })
            f.g[y * SW + x] = 0
          }
        }
        f.wakeAll()
      }
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
    for (const c of w.flying) c.t += raw
    if (w.flying.some((c) => c.t >= c.d + 0.55)) {
      w.flying = w.flying.filter((c) => c.t < c.d + 0.55)
      sfx.tick()
    }
  }

  // ── Render ──────────────────────────────────────
  function ensureImg() {
    if (img.current) return img.current
    const c = document.createElement('canvas')
    c.width = SW
    c.height = SH
    const ctx = c.getContext('2d')!
    const data = ctx.createImageData(SW, SH)
    img.current = { c, ctx, data, u32: new Uint32Array(data.data.buffer) }
    return img.current
  }

  function paintField(t: number) {
    const w = world.current
    const im = ensureImg()
    const g = w.field.g
    const u = im.u32
    const bgA = 0x00000000
    for (let i = 0; i < g.length; i++) {
      const v = g[i]
      if (v === 0) u[i] = bgA
      else if (v >= RAINBOW_BASE && v !== STONE) {
        const hue = ((i % SW) * 6 + Math.floor(i / SW) * 3 + t * 120) % 360
        const [r, gg, b] = hsl(hue)
        u[i] = (255 << 24) | (b << 16) | (gg << 8) | r
      } else u[i] = PALETTE[v]
    }
    if (w.clearing) {
      const on = Math.floor(w.clearing.t * 14) % 2 === 0
      if (on) for (const i of w.clearing.cells) u[i] = 0xffffffff
    }
    // the falling piece
    const p = w.piece
    if (p && p.kind !== 'bomb') {
      const yi = Math.floor(p.y)
      for (const [bx, by] of p.blocks) {
        for (let y = 0; y < BLOCK; y++) {
          const gy = yi + by * BLOCK + y
          if (gy < 0 || gy >= SH) continue
          for (let x = 0; x < BLOCK; x++) {
            const gx = p.x + bx * BLOCK + x
            const shade = (x + y * 3) & 3
            if (p.kind === 'rainbow') {
              const [r, gg, b] = hsl((gx * 6 + gy * 3 + t * 200) % 360)
              u[gy * SW + gx] = (255 << 24) | (b << 16) | (gg << 8) | r
            } else u[gy * SW + gx] = PALETTE[p.color * 4 + 1 + shade]
          }
        }
      }
    }
    im.ctx.putImageData(im.data, 0, 0)
    return im.c
  }

  function hsl(h: number): [number, number, number] {
    const s = 0.85
    const l = 0.6
    const k = (n: number) => (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
  }

  function drawBackdrop(ctx: CanvasRenderingContext2D, t: number) {
    const g = geo()
    const { W, H } = g
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#7c2d12')
    sky.addColorStop(0.45, '#c2410c')
    sky.addColorStop(1, '#fbbf24')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)
    glow(ctx, W * 0.75, H * 0.32, 90, '#fde68a', 0.5)
    ctx.fillStyle = '#fde68a'
    ctx.beginPath()
    ctx.arc(W * 0.75, H * 0.32, 26, 0, Math.PI * 2)
    ctx.fill()
    // dunes (parallax drift)
    const dune = (y: number, amp: number, col: string, sp: number) => {
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.moveTo(0, H)
      for (let x = 0; x <= W; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.012 + t * sp) * amp + Math.sin(x * 0.031) * amp * 0.4)
      ctx.lineTo(W, H)
      ctx.closePath()
      ctx.fill()
    }
    dune(H * 0.55, 18, '#d97706', 0.05)
    dune(H * 0.7, 14, '#b45309', 0.08)
    dune(H * 0.84, 10, '#92400e', 0.12)
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    update(dt, raw)
    const g = geo()
    drawBackdrop(ctx, t)
    fx.applyShake(ctx)
    // frame
    ctx.fillStyle = 'rgba(28,10,0,0.45)'
    ctx.beginPath()
    ctx.roundRect(g.fx - 9, g.fy - 5, g.fw + 18, g.fh + 16, 14)
    ctx.fill()
    const fr = ctx.createLinearGradient(0, g.fy, 0, g.fy + g.fh)
    fr.addColorStop(0, '#a16207')
    fr.addColorStop(1, '#713f12')
    ctx.fillStyle = fr
    ctx.beginPath()
    ctx.roundRect(g.fx - 8, g.fy - 8, g.fw + 16, g.fh + 16, 14)
    ctx.fill()
    const inner = ctx.createLinearGradient(0, g.fy, 0, g.fy + g.fh)
    inner.addColorStop(0, '#1c1917')
    inner.addColorStop(1, '#292524')
    ctx.fillStyle = inner
    ctx.fillRect(g.fx, g.fy, g.fw, g.fh)
    // faint grid of block columns
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let x = BLOCK; x < SW; x += BLOCK) {
      ctx.beginPath()
      ctx.moveTo(g.fx + x * g.s, g.fy)
      ctx.lineTo(g.fx + x * g.s, g.fy + g.fh)
      ctx.stroke()
    }
    // danger line
    const dy = g.fy + DANGER * g.s
    const danger = w.dangerT > 0 || w.field.top() < DANGER + 12
    ctx.strokeStyle = danger ? `rgba(239,68,68,${0.6 + Math.sin(t * 12) * 0.3})` : 'rgba(248,113,113,0.35)'
    ctx.setLineDash([8, 6])
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(g.fx, dy)
    ctx.lineTo(g.fx + g.fw, dy)
    ctx.stroke()
    ctx.setLineDash([])
    // ghost of the landing spot
    const p = w.piece
    if (p && phaseRef.current === 'play') {
      let y = Math.max(0, Math.floor(p.y))
      while (!collides(w.field, p, p.x, y + 1)) y++
      ctx.strokeStyle = p.kind === 'sand' ? COLS[p.color].css : '#ffffff'
      ctx.globalAlpha = 0.45
      ctx.lineWidth = 1.5
      for (const [bx, by] of p.blocks) ctx.strokeRect(g.fx + (p.x + bx * BLOCK) * g.s + 1, g.fy + (y + by * BLOCK) * g.s + 1, BLOCK * g.s - 2, BLOCK * g.s - 2)
      ctx.globalAlpha = 0.07
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(g.fx + p.x * g.s, g.fy, pieceWidth(p) * g.s, g.fh)
      ctx.globalAlpha = 1
    }
    // sand
    const sand = paintField(t)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(sand, g.fx, g.fy, g.fw, g.fh)
    ctx.imageSmoothingEnabled = true
    // piece symbols + bomb
    if (p) {
      const yi = Math.floor(p.y)
      if (p.kind === 'bomb') {
        const cx = g.fx + (p.x + BLOCK) * g.s
        const cy = g.fy + (yi + BLOCK) * g.s
        const r = BLOCK * g.s * 0.9
        const gr = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r)
        gr.addColorStop(0, '#64748b')
        gr.addColorStop(1, '#0f172a')
        ctx.fillStyle = gr
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#334155'
        ctx.fillRect(cx - r * 0.25, cy - r * 1.15, r * 0.5, r * 0.3)
        ctx.strokeStyle = '#a16207'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(cx, cy - r * 1.15)
        ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 1.6, cx + r * 0.6, cy - r * 1.4)
        ctx.stroke()
        glow(ctx, cx + r * 0.6, cy - r * 1.4, 10 + Math.sin(t * 30) * 3, '#fde047', 0.9)
      } else if (p.kind === 'sand') {
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        for (const [bx, by] of p.blocks) {
          const cx = g.fx + (p.x + bx * BLOCK + BLOCK / 2) * g.s
          const cy = g.fy + (yi + by * BLOCK + BLOCK / 2) * g.s
          symbolPath(ctx, COLS[p.color].sym, cx, cy, BLOCK * g.s * 0.2)
          ctx.fill()
        }
      }
    }
    fx.draw(ctx)
    ctx.restore()
    // next piece preview + colour legend
    if (phaseRef.current !== 'idle') {
      const nx = W / 2 - 34
      ctx.fillStyle = 'rgba(28,10,0,0.5)'
      ctx.beginPath()
      ctx.roundRect(nx, 8, 68, 58, 12)
      ctx.fill()
      ctx.fillStyle = '#fde68a'
      ctx.font = "800 9px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('NEXT', W / 2, 17)
      const n = w.next
      const bw = Math.max(...n.blocks.map((b) => b[0])) + 1
      const bh = Math.max(...n.blocks.map((b) => b[1])) + 1
      const cs = 9
      const ox = W / 2 - (bw * cs) / 2
      const oy = 40 - (bh * cs) / 2
      for (const [bx, by] of n.blocks) {
        ctx.fillStyle = COLS[n.color].css
        ctx.beginPath()
        ctx.roundRect(ox + bx * cs + 0.5, oy + by * cs + 0.5, cs - 1, cs - 1, 2)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      symbolPath(ctx, COLS[n.color].sym, W / 2, 59, 3.5)
      ctx.fill()
    }
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
    win.__sandblastLevel = (n: number) => beginLevel(n)
    win.__sandblast = () => {
      const w = world.current
      const g = geo()
      const p = w.piece
      const out: { x: number; y: number; pts: number[]; match: boolean }[] = []
      if (p && phaseRef.current === 'play') {
        const cx = g.fx + (p.x + pieceWidth(p) / 2) * g.s
        const cy = Math.max(g.fy + 40, g.fy + (p.y + BLOCK) * g.s)
        const tx = g.fx + Math.random() * g.fw
        // slide to a random column, then flick down
        out.push({ x: cx, y: cy, pts: [tx, cy + 4, tx, cy + 120], match: true })
      }
      return { phase: phaseRef.current, level: w.level, bridges: w.bridges, top: w.field.top(), out, wait: 120 }
    }
    return () => {
      delete win.__sandblast
      delete win.__sandblastLevel
    }
  }, [])

  const won = hud.level >= 5
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena sb-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="sb-hud-level">
                  Lv {hud.level}
                  {hud.hard ? <span className="sb-hard">HARD</span> : null}
                </div>
                <div className="sb-sub">
                  {hud.score} pts · bridges {Math.min(hud.bridges, hud.goal)}/{hud.goal}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="sb-coins">
                  <i />
                  {hud.coins}
                </span>
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'clear' || phase === 'dying' ? (
            <div className="sb-boosters" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" className="sb-boost tp-boost" aria-label="Bomb piece" disabled={hud.bombs <= 0} onClick={useBomb}>
                <BombIcon />
                Bomb
                <span className="sb-boost__n">{hud.bombs}</span>
              </button>
              <button type="button" className="sb-boost tp-boost" aria-label="Rainbow sand" disabled={hud.rainbows <= 0} onClick={useRainbow}>
                <RainbowIcon />
                Rainbow
                <span className="sb-boost__n">{hud.rainbows}</span>
              </button>
              <button type="button" className="sb-boost tp-boost" aria-label="Swap with next" disabled={hud.swaps <= 0} onClick={useSwap}>
                <SwapIcon />
                Swap
                <span className="sb-boost__n">{hud.swaps}</span>
              </button>
            </div>
          ) : null}
          {banner && phase !== 'idle' && phase !== 'over' ? (
            <div className={`action-banner sb-banner${banner.hard ? ' is-hard' : ''}`} key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.stars ? <span className="sb-stars">{'★'.repeat(banner.stars) + '☆'.repeat(3 - banner.stars)}</span> : null}
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="sandblast"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to move, tap to rotate, swipe down to drop. Join one colour of sand from wall to wall to blast it away."
              onPlay={(lv) => start(lv)}
            />
          )}
          <ActionResult run={run} title={won ? 'Sand master!' : 'Overflow!'} subtitle={`Score ${hud.score} · reached level ${hud.level}`} celebrate={won} onPlayAgain={() => start()} />
        </div>
      </div>
    </GameShell>
  )
}
