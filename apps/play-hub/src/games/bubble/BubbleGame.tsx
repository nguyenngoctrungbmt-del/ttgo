import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'
import { COLORS, PALETTES, drawBubble, drawShooter, drawSpecial, drawStarMark, type Special } from './art'
import * as B from './board'
import { TOP, makeGeo, type Ball, type Board, type Cell, type Geo } from './board'
import { gridFromRows, levelFor, type BubbleLevel } from './levels'

const meta = getGame('bubble')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Pop = { x: number; y: number; color: number; special?: Special; t: number }
type Fall = { x: number; y: number; vx: number; vy: number; color: number; rot: number; special?: Special; star?: boolean }
type Shot = { x: number; y: number; vx: number; vy: number; ball: Ball; trail: Array<[number, number]> }

const SPEED = 1500
/** Shots between row pushes in the idle demo. */
const IDLE_PUSH = 6

type Game = Board & {
  colors: number
  cur: Ball
  next: Ball
  shot: Shot | null
  pushIn: number
  level: number
  lv: BubbleLevel
  /** Bubble feed for this level (seeded, so a board deals the same bubbles on every attempt). */
  rng: () => number
  shots: number
  used: number
  cleared: number
  clearing: boolean
  score: number
  combo: number
  fever: number
  pops: Pop[]
  falls: Fall[]
  aim: number
  aiming: boolean
  puff: number
  danger: boolean
  dangerT: number
  aiT: number
  lastMilestone: number
  bokeh: Array<{ x: number; y: number; r: number; sp: number }>
  stats: { popped: number; dropped: number; level: number; combo: number; specials: number }
}

function freshGame(): Game {
  return {
    grid: [],
    parity: 0,
    ceil: 0,
    gridOff: 0,
    colors: 4,
    cur: { color: 0 },
    next: { color: 1 },
    shot: null,
    pushIn: IDLE_PUSH,
    level: 1,
    lv: levelFor(1),
    rng: Math.random,
    shots: 0,
    used: 0,
    cleared: 0,
    clearing: false,
    score: 0,
    combo: 0,
    fever: 0,
    pops: [],
    falls: [],
    aim: -Math.PI / 2,
    aiming: false,
    puff: 0,
    danger: false,
    dangerT: 0,
    aiT: 0,
    lastMilestone: 0,
    bokeh: Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), r: rand(8, 40), sp: rand(0.01, 0.04) })),
    stats: { popped: 0, dropped: 0, level: 1, combo: 0, specials: 0 },
  }
}

export default function BubbleGame() {
  const run = useActionRun('bubble')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const G = useRef<Game>(freshGame())
  const geoRef = useRef<Geo>(makeGeo(360, 600))
  const phaseRef = useRef<Phase>('idle')
  const dprRef = useRef(1)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, left: 0, cleared: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const g = G.current
    setHud({ score: g.score, level: g.level, left: g.shots, cleared: g.cleared })
  }

  // ── Grid helpers (rules live in board.ts) ──────────────

  const rowLen = (r: number) => B.rowLen(G.current, r)
  const cellXY = (r: number, c: number, withOff = true) => B.cellXY(G.current, geoRef.current, r, c, withOff)
  const presentColors = () => B.presentColors(G.current, G.current.colors)
  const bubbleCount = () => B.bubbleCount(G.current)
  const lowestBottom = () => B.lowestBottom(G.current, geoRef.current)
  const collides = (x: number, y: number) => B.collides(G.current, geoRef.current, x, y)
  const trace = (a: number, maxLen: number, maxB: number) => B.trace(G.current, geoRef.current, a, maxLen, maxB)
  const snapCell = (x: number, y: number) => B.snapCell(G.current, geoRef.current, x, y)
  const flood = (r: number, c: number, color: number) => B.flood(G.current, r, c, color)

  function makeRow(r: number, above: Cell[] | null, rnd: () => number): Cell[] {
    const g = G.current
    const n = rowLen(r)
    const row: Cell[] = []
    for (let c = 0; c < n; c++) {
      let color = Math.floor(rnd() * g.colors)
      if (c > 0 && row[c - 1] && rnd() < 0.45) color = row[c - 1]!.color
      else if (above && rnd() < 0.35) {
        const a = above[Math.min(above.length - 1, c)]
        if (a) color = a.color
      }
      row.push({ color, star: rnd() < 0.035 })
    }
    return row
  }

  function initBoard(rows: number, rnd: () => number = Math.random) {
    const g = G.current
    g.grid = []
    g.parity = 0
    g.ceil = 0
    for (let r = 0; r < rows; r++) g.grid.push(makeRow(r, r > 0 ? g.grid[r - 1] : null, rnd))
  }

  function randomBall(): Ball {
    const cols = presentColors()
    return { color: cols[Math.floor(G.current.rng() * cols.length)] }
  }

  /** Simulate a landing for the AI: group size for the current ball. */
  function scoreAngle(a: number, ball: Ball): number {
    const tr = trace(a, 2000, 3)
    if (!tr.land) return -1
    const [r, c] = snapCell(tr.x, tr.y)
    if (ball.special === 'bomb' || ball.special === 'bolt') return 10 - r * 0.1 + r
    const g = G.current
    while (g.grid.length <= r) g.grid.push(new Array(rowLen(g.grid.length)).fill(null))
    g.grid[r][c] = { color: ball.color }
    const n = flood(r, c, ball.color).length
    g.grid[r][c] = null
    return (n >= 3 ? n * 10 : n) + r * 0.3
  }

  // ── Resolve a landed ball ──────────────────────────────

  function land(ball: Ball, x: number, y: number) {
    const g = G.current
    const live = phaseRef.current === 'play'
    const res = B.place(g, geoRef.current, ball, x, y)
    const { cx, cy } = res
    if (ball.special) {
      if (live) g.stats.specials += 1
      if (ball.special === 'bomb') {
        fx.explode(cx, cy, 1.4, ['#fde047', '#fb923c', '#ef4444', '#ffffff'])
        fx.flash('#fde68a', 0.15)
        if (live) {
          sfx.boom(0.7)
          haptic.heavy()
          fx.stop(0.08)
        }
      } else if (ball.special === 'bolt') {
        const { W } = geoRef.current
        for (let i = 0; i < 3; i++) fx.burst(rand(0, W), cy, { count: 8, color: ['#fef9c3', '#38bdf8', '#ffffff'], speed: 220, shape: 'spark' })
        fx.ring(cx, cy, { color: '#38bdf8', maxR: 80, life: 0.35 })
        fx.flash('#bae6fd', 0.12)
        if (live) {
          sfx.slash()
          sfx.power()
          haptic.medium()
        }
      } else {
        fx.ring(cx, cy, { color: '#ffffff', maxR: 50, life: 0.4 })
        if (live) sfx.power()
      }
    }
    for (const p of res.popped) {
      g.pops.push({ x: p.x, y: p.y, color: p.cell.color, special: p.cell.special, t: -p.delay })
      if (p.cell.star) {
        g.fever += 25
        fx.text(p.x, p.y - 16, 'FEVER +25', '#fde047', 14)
      }
    }
    for (const d of res.dropped) {
      g.falls.push({ x: d.x, y: d.y, vx: rand(-80, 80), vy: rand(-160, -20), color: d.cell.color, rot: 0, special: d.cell.special, star: d.cell.star })
      if (d.cell.star) g.fever += 25
    }
    const popped = res.popped.length
    const dropped = res.dropped.length
    if (popped > 0) {
      g.combo += 1
      if (live) g.stats.combo = Math.max(g.stats.combo, g.combo)
    } else {
      g.combo = 0
      if (live) sfx.move()
    }
    if (live) {
      const comboK = 1 + Math.max(0, g.combo - 1) * 0.5
      const pts = Math.round(popped * 10 * comboK + dropped * 25 * (1 + Math.floor(dropped / 5) * 0.5))
      g.score += pts
      g.stats.popped += popped
      g.stats.dropped += dropped
      g.fever += (popped * 3 + dropped * 5) * (1 + run.level('fever') * 0.2)
      if (popped) {
        fx.text(cx, cy - 20, `+${pts}`, '#ffffff', popped + dropped > 8 ? 22 : 16)
        sfx.pop()
        sfx.score(Math.min(10, g.combo))
        haptic.light()
        if (g.combo >= 3) {
          fx.text(cx, cy - 46, `COMBO x${g.combo}`, '#fde047', 18)
          if (g.combo % 3 === 0) sfx.combo()
        }
      }
      if (dropped >= 5) {
        fx.text(geoRef.current.W / 2, cy + 30, `DROP x${dropped}!`, '#86efac', 22)
        fx.shake(4, 0.2)
        sfx.combo()
        haptic.medium()
      }
      run.update({ ...g.stats, level: g.level })
      if (bubbleCount() === 0) {
        levelClear()
        return
      }
      if (g.lv.drop) {
        g.pushIn -= 1
        if (g.pushIn <= 0) dropCeiling()
      }
      if (checkDeath()) return
      if (g.shots <= 0) {
        die('OUT OF SHOTS')
        return
      }
    } else {
      // Idle demo keeps the classic endless pushes.
      if (bubbleCount() === 0) initBoard(5)
      g.pushIn -= 1
      if (g.pushIn <= 0) pushRow()
      else if (checkDeath()) return
    }
    nextBall()
    pushHud()
  }

  function pushRow() {
    const g = G.current
    g.parity ^= 1
    g.grid.unshift(makeRow(0, g.grid[0] ?? null, Math.random))
    g.gridOff = -geoRef.current.rowH
    g.pushIn = IDLE_PUSH
    checkDeath()
  }

  /** Authored levels: the ceiling (and every bubble) moves down one row. */
  function dropCeiling() {
    const g = G.current
    g.ceil += 1
    g.gridOff = -geoRef.current.rowH
    g.pushIn = g.lv.drop + run.level('breather')
    sfx.clang()
    fx.shake(5, 0.25)
    haptic.medium()
  }

  function checkDeath(): boolean {
    const g = G.current
    const { deathY } = geoRef.current
    const low = lowestBottom()
    g.danger = low > deathY - geoRef.current.rowH * 2.5
    if (low > deathY) {
      if (phaseRef.current === 'idle') {
        initBoard(5)
        return true
      }
      die('OVERFLOW!')
      return true
    }
    return false
  }

  function levelClear() {
    const g = G.current
    g.clearing = true
    g.shot = null
    const stars = g.used <= g.lv.par ? 3 : g.used <= Math.ceil(g.lv.par * 1.35) ? 2 : 1
    const saved = run.completeLevel(g.level, stars)
    g.cleared += 1
    const bonus = g.shots * 150 + stars * 300 + (g.level % 5 === 0 ? 1500 : 0)
    g.score += bonus
    g.fever += 20
    setBanner({ key: Date.now(), text: g.level % 5 === 0 ? 'BOSS BOARD CLEAR!' : 'BOARD CLEAR!', sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  +${bonus}${saved.improved && !saved.firstClear ? ' · new best' : ''}` })
    sfx.win()
    haptic.success()
    fx.flash('#ffffff', 0.2)
    const { W, H } = geoRef.current
    for (let i = 0; i < 4; i++) fx.burst(rand(W * 0.2, W * 0.8), rand(H * 0.2, H * 0.5), { count: 16, color: ['#fde047', '#ffffff', '#f472b6', '#38bdf8'], speed: 240, shape: 'spark', gravity: 120 })
    if (saved.firstClear && g.level % 5 === 0) milestone('level', g.level)
    run.update({ ...g.stats, level: g.level })
    pushHud()
    window.setTimeout(() => {
      if (G.current !== g || phaseRef.current !== 'play') return
      loadLevel(g.level + 1)
    }, 2300)
  }

  function milestone(kind: string, value: number) {
    const g = G.current
    const now = performance.now()
    if (now - g.lastMilestone < 30000) return
    g.lastMilestone = now
    void trackEvent('action_milestone', { game_id: 'bubble', kind, value })
  }

  function nextBall() {
    const g = G.current
    g.cur = g.next
    if (g.cur.special == null && !presentColors().includes(g.cur.color)) g.cur = randomBall()
    if (g.fever >= 100) {
      g.fever -= 100
      const pool: Special[] = ['rainbow']
      if (g.level >= 2) pool.push('bomb')
      if (g.level >= 3) pool.push('bolt')
      g.next = { color: 0, special: pool[Math.floor(g.rng() * pool.length)] }
      if (phaseRef.current === 'play') {
        sfx.power()
        fx.text(geoRef.current.swapX, geoRef.current.swapY - 30, 'SPECIAL!', '#fde047', 16)
      }
    } else g.next = randomBall()
  }

  // ── Run lifecycle ──────────────────────────────────────

  function loadLevel(n: number) {
    const g = G.current
    const lv = levelFor(n)
    g.lv = lv
    g.level = n
    g.stats.level = Math.max(g.stats.level, n)
    g.colors = lv.colors
    g.rng = B.seededRng(lv.gen ? lv.gen.seed + 1 : n * 7919 + 13)
    g.gridOff = 0
    if (lv.gen) initBoard(lv.gen.rows, B.seededRng(lv.gen.seed))
    else {
      g.grid = gridFromRows(lv.rows)
      g.parity = 0
      g.ceil = 0
    }
    g.shots = lv.shots
    g.used = 0
    g.pushIn = lv.drop ? lv.drop + run.level('breather') : 0
    g.shot = null
    g.clearing = false
    g.combo = 0
    g.danger = false
    g.cur = randomBall()
    g.next = randomBall()
    const boss = n % 5 === 0
    const tips = [lv.hint, lv.drop ? `ceiling drops every ${lv.drop + run.level('breather')}` : null, `${lv.shots} shots`].filter(Boolean)
    setBanner({ key: Date.now(), text: boss ? `BOSS · LEVEL ${n}` : `LEVEL ${n}`, sub: `${lv.name} · ${tips.join(' · ')}` })
    sfx.ready()
    run.update({ ...g.stats, level: g.level })
    pushHud()
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const g = freshGame()
    G.current = g
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    loadLevel(Math.max(1, level))
  }

  function die(reason: string) {
    if (phaseRef.current !== 'play') return
    const g = G.current
    setPhaseBoth('dying')
    setBanner({ key: Date.now(), text: reason, sub: `${bubbleCount()} bubbles left` })
    fx.flash('#ef4444', 0.3)
    fx.shake(10, 0.4)
    fx.slowmo(0.8, 0.35)
    sfx.lose()
    haptic.error()
    // Bubbles over the line flash as they burst (the board itself stays intact for a revive)
    g.grid.forEach((row, r) =>
      row.forEach((b, c) => {
        if (!b) return
        const [x, y] = cellXY(r, c, false)
        if (y + geoRef.current.R > geoRef.current.deathY - geoRef.current.rowH) fx.burst(x, y, { count: 6, color: ['#ef4444', '#ffffff'], speed: 160, size: 3 })
      }),
    )
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(g.cleared * 5 + g.stats.popped / 40 + g.stats.dropped / 25)
      run.end({ score: g.score, cleared: g.cleared >= 3, stats: { ...g.stats }, coins }, revive)
    }, 1200)
  }

  /** Revive: clear the bottom rows if they crossed the line, +5 shots and a bomb loaded. */
  function revive() {
    const g = G.current
    const { deathY, rowH } = geoRef.current
    while (g.grid.length && lowestBottom() > deathY - rowH * 5) {
      const r = g.grid.length - 1
      g.grid[r].forEach((b, c) => {
        if (!b) return
        const [x, y] = cellXY(r, c)
        g.pops.push({ x, y, color: b.color, special: b.special, t: -Math.random() * 0.2 })
      })
      g.grid.pop()
    }
    B.dropFloating(g, geoRef.current)
    g.shot = null
    g.danger = false
    g.shots = Math.max(0, g.shots) + 5
    if (g.lv.drop) g.pushIn = g.lv.drop + 2 + run.level('breather')
    g.next = g.cur
    g.cur = { color: 0, special: 'bomb' }
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: '+5 shots · bomb loaded' })
    fx.ring(geoRef.current.sx, geoRef.current.sy, { color: '#fde047', maxR: 80, life: 0.6 })
    pushHud()
    setPhaseBoth('play')
    if (bubbleCount() === 0) levelClear()
  }

  // ── Shooting ───────────────────────────────────────────

  function shoot(a: number) {
    const g = G.current
    if (g.shot) return
    if (phaseRef.current === 'play') {
      if (g.clearing || g.shots <= 0) return
      g.shots -= 1
      g.used += 1
      pushHud()
    }
    const { R, sx, sy } = geoRef.current
    g.shot = { x: sx + Math.cos(a) * R * 1.3, y: sy + Math.sin(a) * R * 1.3, vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED, ball: g.cur, trail: [] }
    g.puff = 1
    if (phaseRef.current === 'play') {
      sfx.whoosh()
      haptic.light()
    }
  }

  function swap() {
    const g = G.current
    if (g.shot || g.clearing) return
    const t = g.cur
    g.cur = g.next
    g.next = t
    g.puff = 0.5
    sfx.flip()
  }

  function setAim(px: number, py: number) {
    const g = G.current
    const { sx, sy } = geoRef.current
    const a = Math.atan2(Math.min(py, sy - 24) - sy, px - sx)
    g.aim = clamp(a, -Math.PI + 0.13, -0.13)
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const g = G.current
    const p = localPoint(e, e.currentTarget)
    const { swapX, swapY, R } = geoRef.current
    if (Math.hypot(p.x - swapX, p.y - swapY) < R * 1.9) {
      swap()
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    g.aiming = true
    setAim(p.x, p.y)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const g = G.current
    if (!g.aiming) return
    const p = localPoint(e, e.currentTarget)
    setAim(p.x, p.y)
  }

  function onPointerUp() {
    const g = G.current
    if (!g.aiming) return
    g.aiming = false
    if (phaseRef.current === 'play') shoot(g.aim)
  }

  // Dev-only bot hook: pick the best shot (with swap) by simulating landings on a copy of the board.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__lv3bb = {
      state: () => ({ level: G.current.level, shots: G.current.shots, left: bubbleCount(), phase: phaseRef.current }),
      step: () => {
        const g = G.current
        if (phaseRef.current !== 'play' || g.shot || g.clearing) return false
        const geo = geoRef.current
        let best = { a: -Math.PI / 2, swap: false, sc: -Infinity }
        for (const sw of [false, true]) {
          const ball = sw ? g.next : g.cur
          for (let i = 0; i <= 160; i++) {
            const a = -Math.PI + 0.13 + (i / 160) * (Math.PI - 0.26)
            const tr = trace(a, 3000, 30)
            if (!tr.land) continue
            const t: Board = { grid: g.grid.map((r) => r.map((c) => (c ? { ...c } : null))), parity: g.parity, ceil: g.ceil, gridOff: g.gridOff }
            const res = B.place(t, geo, ball, tr.x, tr.y)
            let sc = res.popped.length * 10 + res.dropped.length * 14
            if (!res.popped.length && !ball.special) sc = B.neighbors(t, res.r, res.c).filter(([r, c]) => B.cell(t, r, c)?.color === ball.color).length * 3 - res.r * 0.6
            if (B.bubbleCount(t) === 0) sc += 1000
            if (sc > best.sc) best = { a, swap: sw, sc }
          }
        }
        if (best.swap) swap()
        g.aim = best.a
        shoot(best.a)
        return true
      },
    }
    return () => {
      delete win.__lv3bb
    }
  })

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (phaseRef.current !== 'play') return
      const g = G.current
      if (e.key === 'ArrowLeft') g.aim = clamp(g.aim - 0.05, -Math.PI + 0.13, -0.13)
      else if (e.key === 'ArrowRight') g.aim = clamp(g.aim + 0.05, -Math.PI + 0.13, -0.13)
      else if (e.key === ' ') shoot(g.aim)
      else if (e.key === 'ArrowUp' || e.key === 's') swap()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Update ─────────────────────────────────────────────

  function update(dt: number, raw: number) {
    const g = G.current
    const ph = phaseRef.current
    const { W, H, R } = geoRef.current
    g.puff = Math.max(0, g.puff - raw * 4)
    if (g.gridOff < 0) g.gridOff = Math.min(0, g.gridOff + raw * 160)
    g.dangerT += raw
    if (g.danger && ph === 'play' && Math.floor(g.dangerT * 2) !== Math.floor((g.dangerT - raw) * 2)) sfx.tick()

    if (ph === 'idle') {
      if (!g.grid.length || bubbleCount() === 0) {
        initBoard(6)
        g.cur = randomBall()
        g.next = randomBall()
      }
      g.aiT += raw
      if (!g.shot && g.aiT > 1.1) {
        g.aiT = 0
        let best = -Math.PI / 2
        let bs = -Infinity
        for (let i = 0; i < 46; i++) {
          const a = -Math.PI + 0.15 + (i / 45) * (Math.PI - 0.3)
          const sc = scoreAngle(a, g.cur) + Math.random() * 2
          if (sc > bs) {
            bs = sc
            best = a
          }
        }
        g.aim = best
        shoot(best)
      }
    }

    // Shot flight (small fixed steps so it never tunnels through a bubble)
    const s = g.shot
    if (s && ph !== 'over') {
      let dist = SPEED * dt
      while (dist > 0 && g.shot) {
        const st = Math.min(4, dist)
        dist -= st
        const sp = Math.hypot(s.vx, s.vy)
        s.x += (s.vx / sp) * st
        s.y += (s.vy / sp) * st
        if (s.x < R || s.x > W - R) {
          const left = s.x < R
          s.x = left ? 2 * R - s.x : 2 * (W - R) - s.x
          s.vx = left ? Math.abs(s.vx) : -Math.abs(s.vx)
          if (ph === 'play') sfx.tick()
          fx.burst(left ? R * 0.4 : W - R * 0.4, s.y, { count: 4, color: '#ffffff', speed: 80, size: 2 })
        }
        if (s.y < B.ceilY(g, geoRef.current) + R || collides(s.x, s.y)) {
          g.shot = null
          land(s.ball, s.x, s.y)
        }
      }
      if (g.shot) {
        s.trail.push([s.x, s.y])
        if (s.trail.length > 8) s.trail.shift()
      }
    }

    // Pops + falls
    for (const p of g.pops) {
      const was = p.t
      p.t += raw
      if (was < 0 && p.t >= 0) {
        const col = p.special ? '#ffffff' : COLORS[p.color].base
        fx.burst(p.x, p.y, { count: 7, color: [col, '#ffffff'], speed: 170, size: 3, gravity: 300 })
        fx.ring(p.x, p.y, { color: col, maxR: R * 1.4, life: 0.25, width: 2 })
      }
    }
    g.pops = g.pops.filter((p) => p.t < 0.22)
    for (const f of g.falls) {
      f.vy += 1500 * dt
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.rot += f.vx * 0.02 * dt
      if (f.x < R || f.x > W - R) f.vx = -f.vx
    }
    const landed = g.falls.filter((f) => f.y > H - 20)
    if (landed.length) {
      for (const f of landed.slice(0, 6)) {
        fx.burst(f.x, H - 24, { count: 6, color: [COLORS[f.color].base, '#ffffff'], speed: 160, angle: -Math.PI / 2, spread: 1.4, size: 3 })
      }
      if (ph === 'play') sfx.pop()
      g.falls = g.falls.filter((f) => f.y <= H - 20)
    }
  }

  // ── Render ─────────────────────────────────────────────

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    geoRef.current = makeGeo(W, H)
    const { R, rowH } = geoRef.current
    dprRef.current = ctx.getTransform().a || 1
    const dpr = dprRef.current
    const g = G.current
    const ph = phaseRef.current
    const dt = fx.step(raw)
    update(dt, raw)
    const geo = geoRef.current
    const pal = PALETTES[(g.level - 1) % PALETTES.length]

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, pal.top)
    bg.addColorStop(1, pal.bot)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    for (const b of g.bokeh) {
      b.y -= b.sp * raw
      if (b.y < -0.1) {
        b.y = 1.1
        b.x = Math.random()
      }
      ctx.globalAlpha = 0.08
      ctx.fillStyle = pal.glow
      ctx.beginPath()
      ctx.arc(b.x * W, b.y * H, b.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 0.18
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    fx.applyShake(ctx)

    // Ceiling (authored levels lower it: a riveted press plate fills the space above)
    const CT = B.ceilY(g, geo)
    if (CT > TOP + 1) {
      const pg = ctx.createLinearGradient(0, TOP - 12, 0, CT)
      pg.addColorStop(0, '#1e293b')
      pg.addColorStop(1, '#475569')
      ctx.fillStyle = pg
      ctx.fillRect(0, TOP - 12, W, CT - TOP + 12)
      ctx.strokeStyle = 'rgba(148,163,184,0.35)'
      ctx.lineWidth = 2
      ctx.beginPath()
      for (let x = -40; x < W + 40; x += 22) {
        ctx.moveTo(x, CT - 12)
        ctx.lineTo(x + 18, TOP - 12)
      }
      ctx.stroke()
    }
    const cg = ctx.createLinearGradient(0, CT - 14, 0, CT + 4)
    cg.addColorStop(0, '#334155')
    cg.addColorStop(1, '#94a3b8')
    ctx.fillStyle = cg
    ctx.fillRect(0, CT - 12, W, 14)
    ctx.fillStyle = '#1e293b'
    for (let x = 10; x < W; x += 28) {
      ctx.beginPath()
      ctx.arc(x, CT - 5, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    // Ceiling-drop countdown pips
    const pipN = ph === 'idle' ? IDLE_PUSH : g.lv.drop ? g.lv.drop + run.level('breather') : 0
    for (let i = 0; i < pipN; i++) {
      const on = i < g.pushIn
      ctx.fillStyle = on ? (g.pushIn <= 2 ? '#f87171' : '#fde047') : 'rgba(15,23,42,0.6)'
      ctx.beginPath()
      ctx.arc(W / 2 + (i - (pipN - 1) / 2) * 12, CT - 5, 3.6, 0, Math.PI * 2)
      ctx.fill()
    }

    // Death line
    const pulse = g.danger ? 0.5 + Math.sin(t * 10) * 0.4 : 0.35
    ctx.strokeStyle = `rgba(248,113,113,${pulse})`
    ctx.lineWidth = 2
    ctx.setLineDash([8, 7])
    ctx.beginPath()
    ctx.moveTo(0, geo.deathY)
    ctx.lineTo(W, geo.deathY)
    ctx.stroke()
    ctx.setLineDash([])
    if (g.danger) {
      ctx.globalAlpha = 0.12 + Math.sin(t * 10) * 0.06
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(0, geo.deathY - rowH * 2, W, rowH * 2)
      ctx.globalAlpha = 1
    }

    // Grid
    const wob = g.pushIn === 1 && ph === 'play' && g.lv.drop ? Math.sin(t * 40) * 1.2 : 0
    g.grid.forEach((row, r) =>
      row.forEach((b, c) => {
        if (!b) return
        const [x, y] = cellXY(r, c)
        if (b.special) drawSpecial(ctx, b.special, x + wob, y, R - 0.5, t)
        else drawBubble(ctx, b.color, x + wob, y, R - 0.5, dpr)
        if (b.star) drawStarMark(ctx, x + wob, y, R, t)
      }),
    )

    // Guide
    const aimingNow = (ph === 'play' && g.aiming) || ph === 'idle'
    if (aimingNow && !g.shot) {
      const lvl = run.level('sight')
      const tr = trace(g.aim, ph === 'idle' ? 220 : 380 + lvl * 160, Math.min(3, 1 + lvl))
      let acc = 0
      ctx.fillStyle = '#ffffff'
      for (let i = 1; i < tr.pts.length; i++) {
        const [x0, y0] = tr.pts[i - 1]
        const [x1, y1] = tr.pts[i]
        const seg = Math.hypot(x1 - x0, y1 - y0)
        for (let d = (14 - (acc % 14)) % 14; d < seg; d += 14) {
          const k = d / seg
          const total = acc + d
          ctx.globalAlpha = Math.max(0.15, 0.9 - total / 900)
          ctx.beginPath()
          ctx.arc(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 2.6, 0, Math.PI * 2)
          ctx.fill()
        }
        acc += seg
      }
      ctx.globalAlpha = 1
      if (tr.land && lvl >= 2 && ph === 'play') {
        const [r, c] = snapCell(tr.x, tr.y)
        const [gx, gy] = cellXY(r, c)
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'
        ctx.lineWidth = 2
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.arc(gx, gy, R - 2, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    // Pops
    for (const p of g.pops) {
      if (p.t < 0) {
        if (p.special) drawSpecial(ctx, p.special, p.x, p.y, R - 0.5, t)
        else drawBubble(ctx, p.color, p.x, p.y, R - 0.5, dpr)
        continue
      }
      const k = p.t / 0.22
      ctx.globalAlpha = 1 - k
      drawBubble(ctx, p.special ? 3 : p.color, p.x, p.y, R - 0.5, dpr, 1 + k * 0.5)
      ctx.globalAlpha = 1
    }
    // Falls
    for (const f of g.falls) {
      if (f.special) drawSpecial(ctx, f.special, f.x, f.y, R - 0.5, t)
      else drawBubble(ctx, f.color, f.x, f.y, R - 0.5, dpr)
      if (f.star) drawStarMark(ctx, f.x, f.y, R, t)
    }

    // Shot
    const s = g.shot
    if (s) {
      s.trail.forEach(([x, y], i) => {
        ctx.globalAlpha = (i / s.trail.length) * 0.35
        ctx.fillStyle = s.ball.special ? '#ffffff' : COLORS[s.ball.color].light
        ctx.beginPath()
        ctx.arc(x, y, R * 0.7, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
      if (s.ball.special) drawSpecial(ctx, s.ball.special, s.x, s.y, R - 0.5, t)
      else drawBubble(ctx, s.ball.color, s.x, s.y, R - 0.5, dpr)
    }

    // Shooter + fever ring
    const sr = R * 1.25
    const fk = clamp(g.fever / 100, 0, 1)
    ctx.strokeStyle = 'rgba(15,23,42,0.5)'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.arc(geo.sx, geo.sy, sr * 1.65, 0, Math.PI * 2)
    ctx.stroke()
    if (fk > 0) {
      ctx.strokeStyle = fk > 0.9 ? `rgba(253,224,71,${0.7 + Math.sin(t * 12) * 0.3})` : '#fde047'
      ctx.lineWidth = 5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(geo.sx, geo.sy, sr * 1.65, -Math.PI / 2, -Math.PI / 2 + fk * Math.PI * 2)
      ctx.stroke()
    }
    drawShooter(ctx, geo.sx, geo.sy, sr, g.aim, g.puff, t, g.danger)
    if (!s && ph !== 'dying' && ph !== 'over') {
      const nx = geo.sx + Math.cos(g.aim) * sr * 1.3
      const ny = geo.sy + Math.sin(g.aim) * sr * 1.3
      if (g.cur.special) drawSpecial(ctx, g.cur.special, nx, ny, R - 0.5, t)
      else drawBubble(ctx, g.cur.color, nx, ny, R - 0.5, dpr)
    }
    // Next dish
    ctx.fillStyle = 'rgba(15,23,42,0.45)'
    ctx.beginPath()
    ctx.arc(geo.swapX, geo.swapY, R * 1.35, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    if (g.next.special) drawSpecial(ctx, g.next.special, geo.swapX, geo.swapY, R * 0.8, t)
    else drawBubble(ctx, g.next.color, geo.swapX, geo.swapY, R * 0.8, dpr)
    // swap arrows
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(geo.swapX, geo.swapY, R * 1.7, -Math.PI * 0.9, -Math.PI * 0.35)
    ctx.stroke()
    const ax = geo.swapX + Math.cos(-Math.PI * 0.35) * R * 1.7
    const ay = geo.swapY + Math.sin(-Math.PI * 0.35) * R * 1.7
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.beginPath()
    ctx.moveTo(ax + 5, ay + 2)
    ctx.lineTo(ax - 3, ay - 4)
    ctx.lineTo(ax - 2, ay + 5)
    ctx.fill()
    ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillText('SWAP', geo.swapX, geo.swapY + R * 2.1)

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
            <div className="action-hud" style={{ top: '0.35rem' }}>
              <div>
                <div className="action-hud__score" style={{ fontSize: '1.5rem' }}>{hud.score}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">Level {hud.level}</span>
                <span className="action-hud__small">{hud.left} shots</span>
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
          {phase === 'idle' && (
            <ActionIdle
              game="bubble"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to aim, release to shoot. Match 3 to pop and drop whole clusters before the rows reach the line."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.cleared >= 3 ? 'Bubble master!' : 'Board lost'}
            subtitle={`Score ${hud.score} · Level ${hud.level} · ${hud.cleared} cleared`}
            celebrate={hud.cleared >= 3}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
