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
import { useProgressStore } from '../../store/progressStore'
import {
  COLS,
  GARBAGE,
  GEM,
  HIDDEN,
  ROWS,
  SHAPES,
  THEMES,
  TONES,
  bag,
  blockSprite,
  cellsOf,
  collides,
  dropDistance,
  fullRows,
  kicks,
  removeRows,
  secondsPerRow,
  spawnPiece,
  type Piece,
} from './pieces'
import '../../shared/action/action.css'

const meta = getGame('blocks')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Rect = { x: number; y: number; w: number; h: number }
type Flash = { x: number; y: number; t: number }
type BgShape = { k: number; x: number; y: number; s: number; v: number; rot: number; vr: number }

type Game = {
  grid: number[]
  piece: Piece | null
  queue: number[]
  hold: number
  holdGem: number
  canHold: boolean
  fall: number
  lock: number
  lockResets: number
  lastRotate: boolean
  clearRows: number[]
  clearT: number
  readyT: number
  score: number
  lines: number
  level: number
  combo: number
  b2b: boolean
  bombs: number
  gemRain: number
  eventT: number
  eventIdx: number
  garbageT: number
  garbageN: number
  flashes: Flash[]
  theme: number
  prevTheme: number
  themeT: number
  dieT: number
  best: number
  bestShown: boolean
  time: number
  dangerTick: number
  demoX: number
  demoR: number
  stats: { lines: number; level: number; quads: number; combo: number; gems: number; tspins: number }
}

const EVENT_EVERY = 40
const LOCK_DELAY = 0.5

function freshGame(): Game {
  return {
    grid: new Array(COLS * ROWS).fill(0),
    piece: null,
    queue: [...bag(), ...bag()],
    hold: -1,
    holdGem: -1,
    canHold: true,
    fall: 0,
    lock: 0,
    lockResets: 0,
    lastRotate: false,
    clearRows: [],
    clearT: 0,
    readyT: 0,
    score: 0,
    lines: 0,
    level: 1,
    combo: 0,
    b2b: false,
    bombs: 0,
    gemRain: 0,
    eventT: 35,
    eventIdx: 0,
    garbageT: 0,
    garbageN: 1,
    flashes: [],
    theme: 0,
    prevTheme: 0,
    themeT: 0,
    dieT: 0,
    best: 0,
    bestShown: false,
    time: 0,
    dangerTick: 0,
    demoX: 3,
    demoR: 0,
    stats: { lines: 0, level: 1, quads: 0, combo: 0, gems: 0, tspins: 0 },
  }
}

function makeBg(): BgShape[] {
  const out: BgShape[] = []
  for (let i = 0; i < 9; i++) out.push({ k: i % 7, x: Math.random(), y: Math.random(), s: rand(10, 22), v: rand(0.006, 0.02), rot: rand(0, 6.28), vr: rand(-0.2, 0.2) })
  return out
}

function inRect(p: { x: number; y: number }, r: Rect) {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
}

export default function BlocksGame() {
  const run = useActionRun('blocks')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const game = useRef<Game>(freshGame())
  const bg = useRef<BgShape[]>(makeBg())
  const phaseRef = useRef<Phase>('idle')
  const ptr = useRef<{ id: number; x0: number; y0: number; ax: number; ay: number; t0: number; moved: boolean; lastY: number; lastT: number; vy: number } | null>(null)
  const lastMilestone = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, lines: 0, combo: 0, b2b: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  const live = () => phaseRef.current === 'play'

  function pushHud() {
    const g = game.current
    setHud({ score: g.score, level: g.level, lines: g.lines, combo: g.combo, b2b: g.b2b })
  }

  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function layout() {
    const { w: W, h: H } = size.current
    const top = 66
    const bottom = 12
    const cell = Math.floor(Math.max(10, Math.min((H - top - bottom) / 20, (W - 26) / 14.4)))
    const bw = cell * COLS
    const bh = cell * 20
    const side = Math.round(cell * 4.1)
    const gap = Math.max(8, Math.round(cell * 0.35))
    const bx = Math.round((W - (bw + gap + side)) / 2)
    const by = Math.round(top + Math.max(0, (H - top - bottom - bh) / 2))
    const sx = bx + bw + gap
    const next: Rect = { x: sx, y: by, w: side, h: cell * 8.2 }
    const hold: Rect = { x: sx, y: by + cell * 8.8, w: side, h: cell * 3.8 }
    const bomb: Rect = { x: sx, y: hold.y + hold.h + cell * 0.6, w: side, h: cell * 3.6 }
    return { cell, bx, by, bw, bh, next, hold, bomb }
  }

  function cellXY(x: number, y: number) {
    const L = layout()
    return { x: L.bx + x * L.cell + L.cell / 2, y: L.by + (y - HIDDEN) * L.cell + L.cell / 2 }
  }

  // ── Run lifecycle ─────────────────────────────────────

  function start() {
    void unlockAudio()
    const g = freshGame()
    g.bombs = run.level('bomb')
    g.best = useProgressStore.getState().games.blocks?.bestScore ?? 0
    game.current = g
    lastMilestone.current = 0
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    g.readyT = 0.6
    pushHud()
    run.update(g.stats)
    say('LEVEL 1', 'drag · tap to spin · flick down')
    sfx.ready()
  }

  function die() {
    const g = game.current
    if (phaseRef.current !== 'play') return
    g.piece = null
    g.dieT = 0
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.45)
    fx.stop(0.12)
    fx.slowmo(0.8, 0.4)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((g.lines * 0.6 + g.level * 2 + g.stats.gems * 2 + g.stats.quads * 3) * (1 + run.level('gems') * 0.15))
      run.end({ score: g.score, cleared: g.level >= 5, stats: { ...g.stats }, coins }, revive)
    }, 1200)
  }

  /** Second chance: blast away the top half of the stack and resume. */
  function revive() {
    const g = game.current
    const L = layout()
    for (let y = 0; y < 12; y++) {
      for (let x = 0; x < COLS; x++) {
        const v = g.grid[y * COLS + x]
        if (!v) continue
        g.grid[y * COLS + x] = 0
        if (y >= HIDDEN && Math.random() < 0.5) {
          const p = cellXY(x, y)
          fx.burst(p.x, p.y, { count: 3, color: [TONES[v & 15].base, '#fff'], speed: 260, shape: 'square', size: L.cell * 0.25, gravity: 500 })
        }
      }
    }
    g.garbageT = 0
    g.readyT = 1.2
    g.dieT = 0
    g.eventT = Math.max(g.eventT, 20)
    fx.ring(L.bx + L.bw / 2, L.by + L.bh / 2, { color: '#fde047', maxR: L.bw, life: 0.6, width: 6 })
    fx.flash('#ffffff', 0.25)
    say('REVIVED!', 'stack cleared')
    setPhaseBoth('play')
    pushHud()
  }

  // ── Piece control ─────────────────────────────────────

  function gemChance() {
    return 0.1 + run.level('gems') * 0.05
  }

  function placeNew(k: number, gem: number): boolean {
    const g = game.current
    const p = spawnPiece(k, gem)
    if (collides(g.grid, p)) return false
    if (!collides(g.grid, p, 0, 1)) p.y += 1
    g.piece = p
    g.fall = 0
    g.lock = 0
    g.lockResets = 0
    g.lastRotate = false
    return true
  }

  function spawnNext() {
    const g = game.current
    const k = g.queue.shift()!
    if (g.queue.length < 7) g.queue.push(...bag())
    let gem = -1
    if (g.gemRain > 0) {
      g.gemRain -= 1
      gem = Math.floor(Math.random() * 4)
    } else if (live() && Math.random() < gemChance()) gem = Math.floor(Math.random() * 4)
    g.canHold = true
    if (!placeNew(k, gem)) {
      g.queue.unshift(k)
      if (live()) die()
      else resetDemo()
    }
  }

  function grounded() {
    const g = game.current
    return !!g.piece && collides(g.grid, g.piece, 0, 1)
  }

  function onMoved() {
    const g = game.current
    if (grounded() && g.lockResets < 15) {
      g.lock = 0
      g.lockResets += 1
    }
  }

  function shift(dx: number) {
    const g = game.current
    const p = g.piece
    if (!p || !live() || collides(g.grid, p, dx, 0)) return false
    p.x += dx
    g.lastRotate = false
    onMoved()
    sfx.move()
    return true
  }

  function rotate(dir: 1 | -1) {
    const g = game.current
    const p = g.piece
    if (!p || !live()) return
    const to = (p.r + dir + 4) % 4
    for (const [kx, ky] of kicks(p.k, p.r, to)) {
      if (!collides(g.grid, p, kx, -ky, to)) {
        p.x += kx
        p.y -= ky
        p.r = to
        g.lastRotate = true
        onMoved()
        sfx.flip()
        haptic.light()
        return
      }
    }
    sfx.tick()
  }

  function softDrop() {
    const g = game.current
    const p = g.piece
    if (!p || !live() || collides(g.grid, p, 0, 1)) return
    p.y += 1
    g.fall = 0
    g.score += 1
    g.lastRotate = false
  }

  function hardDrop() {
    const g = game.current
    const p = g.piece
    if (!p || !live()) return
    const d = dropDistance(g.grid, p)
    const L = layout()
    for (const [cx, cy] of cellsOf(p)) {
      const top = cellXY(p.x + cx, p.y + cy)
      for (let i = 0; i < Math.min(d, 6); i++) {
        fx.burst(top.x + rand(-L.cell * 0.4, L.cell * 0.4), top.y + (i * d * L.cell) / 6, { count: 1, color: TONES[p.k + 1].light, speed: 30, life: 0.35, size: 2, gravity: 0 })
      }
    }
    p.y += d
    g.score += d * 2
    if (d > 0) g.lastRotate = false
    fx.shake(2 + Math.min(5, d * 0.25), 0.15)
    sfx.thud()
    haptic.medium()
    lockPiece()
  }

  function holdPiece() {
    const g = game.current
    const p = g.piece
    if (!p || !live() || !g.canHold) return
    const k = p.k
    const gem = p.gem
    if (g.hold < 0) {
      g.hold = k
      g.holdGem = gem
      g.piece = null
      spawnNext()
    } else {
      const nk = g.hold
      const ngem = g.holdGem
      g.hold = k
      g.holdGem = gem
      if (!placeNew(nk, ngem)) {
        g.piece = null
        die()
        return
      }
    }
    g.canHold = false
    sfx.whoosh()
    haptic.light()
    const L = layout()
    fx.ring(L.hold.x + L.hold.w / 2, L.hold.y + L.hold.h / 2, { color: '#e0e7ff', maxR: L.hold.w * 0.6, life: 0.3 })
  }

  function fireBomb() {
    const g = game.current
    if (!live() || g.bombs <= 0 || !g.piece || g.clearT > 0) return
    g.bombs -= 1
    const L = layout()
    const rows: number[] = []
    for (let y = ROWS - 3; y < ROWS; y++) {
      let any = false
      for (let x = 0; x < COLS; x++) {
        const v = g.grid[y * COLS + x]
        if (!v) continue
        any = true
        if (v & GEM) collectGem(x, y)
        const c = cellXY(x, y)
        if (Math.random() < 0.6) fx.burst(c.x, c.y, { count: 3, color: [TONES[v & 15].base, '#fde047', '#fff'], speed: 380, shape: 'square', size: L.cell * 0.28, gravity: 700 })
      }
      if (any) rows.push(y)
    }
    const cy = L.by + L.bh - L.cell * 1.5
    fx.explode(L.bx + L.bw / 2, cy, 2.2)
    fx.flash('#fde68a', 0.25)
    fx.stop(0.08)
    sfx.boom(0.85)
    haptic.heavy()
    if (rows.length) {
      g.grid = removeRows(g.grid, rows)
      g.score += 100 * rows.length * g.level
      fx.text(L.bx + L.bw / 2, cy - 30, `BOOM +${100 * rows.length * g.level}`, '#fde047', 22)
      addLines(rows.length)
    }
    const p = g.piece
    while (p && collides(g.grid, p) && p.y > -2) p.y -= 1
    pushHud()
  }

  function collectGem(x: number, y: number) {
    const g = game.current
    const c = cellXY(x, y)
    g.stats.gems += 1
    g.score += 50 * g.level
    fx.burst(c.x, c.y, { count: 12, color: ['#fde047', '#67e8f9', '#ffffff'], speed: 240, shape: 'spark', gravity: 100 })
    fx.ring(c.x, c.y, { color: '#67e8f9', maxR: 30, life: 0.35 })
    fx.text(c.x, c.y - 14, 'GEM', '#67e8f9', 16)
    sfx.power()
  }

  function addLines(n: number) {
    const g = game.current
    g.lines += n
    g.stats.lines = g.lines
    const lvl = 1 + Math.floor(g.lines / 10)
    if (lvl > g.level) {
      g.level = lvl
      g.stats.level = lvl
      g.prevTheme = g.theme
      g.theme = (lvl - 1) % THEMES.length
      g.themeT = 1
      say(`LEVEL ${lvl}`, THEMES[g.theme].name)
      sfx.levelUp()
      haptic.success()
      fx.flash(THEMES[g.theme].glow, 0.2)
      if (lvl % 5 === 0 && lvl !== lastMilestone.current) {
        lastMilestone.current = lvl
        void trackEvent('action_milestone', { game_id: 'blocks', kind: 'level', value: lvl })
      }
    }
  }

  function lockPiece() {
    const g = game.current
    const p = g.piece
    if (!p) return
    let tspin = false
    if (p.k === 2 && g.lastRotate) {
      let n = 0
      for (const [cx, cy] of [[0, 0], [2, 0], [0, 2], [2, 2]]) {
        const x = p.x + cx
        const y = p.y + cy
        if (x < 0 || x >= COLS || y >= ROWS || (y >= 0 && g.grid[y * COLS + x] !== 0)) n++
      }
      tspin = n >= 3
    }
    let above = true
    cellsOf(p).forEach(([cx, cy], i) => {
      const x = p.x + cx
      const y = p.y + cy
      if (y >= 0) g.grid[y * COLS + x] = (p.k + 1) | (p.gem === i ? GEM : 0)
      if (y >= HIDDEN) above = false
      g.flashes.push({ x, y, t: 0.22 })
    })
    g.piece = null
    if (!live()) {
      // Attract-mode board: clear instantly.
      const rows = fullRows(g.grid)
      if (rows.length) {
        for (const y of rows) {
          const c = cellXY(COLS / 2, y)
          fx.burst(c.x, c.y, { count: 10, color: ['#fff', THEMES[g.theme].glow], speed: 260, shape: 'square', size: 4 })
        }
        g.grid = removeRows(g.grid, rows)
      }
      return
    }
    if (above) {
      die()
      return
    }
    sfx.thud()
    const rows = fullRows(g.grid)
    const n = rows.length
    const L = layout()
    const lv = g.level
    let pts = tspin ? [400, 800, 1200, 1600][n] * lv : [0, 100, 300, 500, 800][n] * lv
    let label = ''
    let sub: string | undefined
    if (tspin) {
      g.stats.tspins += 1
      label = n ? `T-SPIN ${['', 'SINGLE', 'DOUBLE', 'TRIPLE'][n]}` : 'T-SPIN'
    }
    if (n === 4) {
      label = 'QUAD!'
      g.stats.quads += 1
    }
    if (n > 0) {
      const hard = n === 4 || tspin
      if (hard && g.b2b) {
        pts = Math.round(pts * 1.5)
        sub = 'back-to-back ×1.5'
      }
      g.b2b = hard
      g.combo += 1
      if (g.combo > 1) pts += 50 * (g.combo - 1) * lv
      g.stats.combo = Math.max(g.stats.combo, g.combo)
      if (!label && g.combo >= 2) label = `COMBO ×${g.combo}`
      else if (label && g.combo >= 2) sub = sub ? `${sub} · combo ×${g.combo}` : `combo ×${g.combo}`
      g.clearRows = rows
      g.clearT = 0.3
      const midY = cellXY(0, rows[Math.floor(rows.length / 2)]).y
      for (const y of rows) {
        for (let x = 0; x < COLS; x++) {
          const v = g.grid[y * COLS + x]
          const c = cellXY(x, y)
          fx.burst(c.x, c.y, { count: n === 4 ? 4 : 2, color: [TONES[v & 15].light, TONES[v & 15].base, '#ffffff'], speed: 200 + n * 60, shape: 'square', size: L.cell * 0.22, gravity: 600, life: 0.7 })
          if (v & GEM) collectGem(x, y)
        }
      }
      fx.text(L.bx + L.bw / 2, midY - 10, `+${pts}`, n === 4 || tspin ? '#fde047' : '#ffffff', n === 4 ? 30 : 22)
      if (n === 4 || tspin) {
        fx.ring(L.bx + L.bw / 2, midY, { color: '#fde047', maxR: L.bw * 0.8, life: 0.5, width: 6 })
        fx.shake(8, 0.3)
        fx.stop(0.08)
        fx.flash('#ffffff', 0.15)
        sfx.boom(0.5)
        sfx.win()
        haptic.heavy()
      } else {
        fx.shake(2 + n * 1.5, 0.18)
        fx.stop(0.03 * n)
        if (g.combo >= 2) sfx.combo()
        sfx.score(g.combo + n)
        haptic.medium()
      }
      if (label) say(label, sub)
      g.score += pts
      addLines(n)
    } else {
      if (tspin) {
        g.score += pts
        say(label)
        sfx.combo()
      }
      g.combo = 0
      spawnNext()
    }
    afterScore()
  }

  function afterScore() {
    const g = game.current
    if (!g.bestShown && g.best > 0 && g.score > g.best) {
      g.bestShown = true
      say('NEW BEST!', 'keep stacking')
      sfx.mission()
    }
    run.update(g.stats)
    pushHud()
  }

  function finishClear() {
    const g = game.current
    g.grid = removeRows(g.grid, g.clearRows)
    g.clearRows = []
    if (live() && g.grid.every((v) => v === 0)) {
      const bonus = 2000 * g.level
      g.score += bonus
      say('ALL CLEAR!', `+${bonus}`)
      sfx.win()
      fx.flash('#fde047', 0.3)
      afterScore()
    }
    spawnNext()
  }

  function riseGarbage(n: number) {
    const g = game.current
    const L = layout()
    const hole = Math.floor(Math.random() * COLS)
    const rows: number[] = []
    for (let i = 0; i < n; i++) for (let x = 0; x < COLS; x++) rows.push(x === hole ? 0 : GARBAGE)
    g.grid = [...g.grid.slice(n * COLS), ...rows]
    const p = g.piece
    if (p) {
      while (collides(g.grid, p) && p.y > -3) p.y -= 1
      if (collides(g.grid, p)) {
        die()
        return
      }
    }
    fx.shake(7, 0.3)
    fx.burst(L.bx + L.bw / 2, L.by + L.bh, { count: 20, color: ['#94a3b8', '#ef4444', '#fff'], speed: 260, angle: -Math.PI / 2, spread: 1.4, shape: 'square', size: 4 })
    sfx.hurt()
    haptic.heavy()
  }

  function triggerEvent() {
    const g = game.current
    g.eventT = EVENT_EVERY
    const kind = g.eventIdx % 3
    g.eventIdx += 1
    if (kind === 0) {
      g.gemRain = 4
      say('GEM RAIN', 'next 4 pieces carry gems')
      sfx.power()
    } else if (kind === 1 && g.level >= 2) {
      g.garbageN = g.level >= 7 ? 2 : 1
      g.garbageT = 4
      say('INCOMING!', `${g.garbageN} garbage row${g.garbageN > 1 ? 's' : ''} rising`)
      sfx.miss()
    } else {
      g.bombs += 1
      say('BOMB DROP', 'tap the bomb to blast 3 rows')
      sfx.power()
      const L = layout()
      fx.ring(L.bomb.x + L.bomb.w / 2, L.bomb.y + L.bomb.h / 2, { color: '#fde047', maxR: L.bomb.w * 0.7, life: 0.5 })
    }
  }

  // ── Attract mode ──────────────────────────────────────

  function resetDemo() {
    const g = game.current
    g.grid = new Array(COLS * ROWS).fill(0)
    for (let y = ROWS - 5; y < ROWS; y++) {
      const hole = Math.floor(Math.random() * COLS)
      for (let x = 0; x < COLS; x++) if (x !== hole && Math.random() < 0.85) g.grid[y * COLS + x] = 1 + Math.floor(Math.random() * 7)
    }
    g.piece = null
  }

  function demoStep(dt: number) {
    const g = game.current
    if (!g.piece) {
      if (g.grid.every((v) => v === 0)) resetDemo()
      spawnNext()
      g.demoX = Math.floor(Math.random() * 8)
      g.demoR = Math.floor(Math.random() * 4)
      return
    }
    const p = g.piece
    g.fall += dt
    if (g.fall < 0.09) return
    g.fall = 0
    if (p.r !== g.demoR && !collides(g.grid, p, 0, 0, (p.r + 1) % 4)) p.r = (p.r + 1) % 4
    else if (p.x < g.demoX && !collides(g.grid, p, 1, 0)) p.x++
    else if (p.x > g.demoX && !collides(g.grid, p, -1, 0)) p.x--
    else if (!collides(g.grid, p, 0, 1)) p.y++
    else lockPiece()
  }

  // ── Input ─────────────────────────────────────────────

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!live()) return
    const p = localPoint(e, e.currentTarget)
    const L = layout()
    if (inRect(p, L.hold)) {
      holdPiece()
      return
    }
    if (inRect(p, L.bomb)) {
      fireBomb()
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    const now = performance.now()
    ptr.current = { id: e.pointerId, x0: p.x, y0: p.y, ax: p.x, ay: p.y, t0: now, moved: false, lastY: p.y, lastT: now, vy: 0 }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const s = ptr.current
    if (!s || s.id !== e.pointerId || !live()) return
    const p = localPoint(e, e.currentTarget)
    const step = layout().cell * 0.9
    while (p.x - s.ax > step) {
      shift(1)
      s.ax += step
      s.moved = true
    }
    while (s.ax - p.x > step) {
      shift(-1)
      s.ax -= step
      s.moved = true
    }
    if (Math.abs(p.y - s.y0) > Math.abs(p.x - s.x0) * 1.2) {
      while (p.y - s.ay > step) {
        softDrop()
        s.ay += step
        s.moved = true
      }
    } else s.ay = Math.max(s.ay, p.y - step * 0.5)
    const now = performance.now()
    const dtm = Math.max(1, now - s.lastT)
    s.vy = s.vy * 0.5 + ((p.y - s.lastY) / dtm) * 0.5
    s.lastY = p.y
    s.lastT = now
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const s = ptr.current
    if (!s || s.id !== e.pointerId) return
    ptr.current = null
    if (!live()) return
    const p = localPoint(e, e.currentTarget)
    const L = layout()
    const dx = p.x - s.x0
    const dy = p.y - s.y0
    const ms = performance.now() - s.t0
    if (dy > L.cell * 1.8 && dy > Math.abs(dx) * 1.4 && (s.vy > 0.7 || ms < 260)) hardDrop()
    else if (dy < -L.cell * 2 && -dy > Math.abs(dx) * 1.4) holdPiece()
    else if (!s.moved && Math.hypot(dx, dy) < 14 && ms < 400) rotate(p.x < size.current.w * 0.22 ? -1 : 1)
    pushHud()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (!live()) return
      const k = e.key
      if (k === 'ArrowLeft') shift(-1)
      else if (k === 'ArrowRight') shift(1)
      else if (k === 'ArrowDown') softDrop()
      else if (k === 'ArrowUp' || k === 'x' || k === 'X') rotate(1)
      else if (k === 'z' || k === 'Z') rotate(-1)
      else if (k === ' ') hardDrop()
      else if (k === 'c' || k === 'C' || k === 'Shift') holdPiece()
      else if (k === 'b' || k === 'B') fireBomb()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation ────────────────────────────────────────

  function update(dt: number) {
    const g = game.current
    g.time += dt
    if (g.clearT > 0) {
      g.clearT -= dt
      if (g.clearT <= 0) finishClear()
      return
    }
    if (g.readyT > 0) {
      g.readyT -= dt
      if (g.readyT <= 0 && !g.piece) spawnNext()
      return
    }
    if (!g.piece) return
    g.eventT -= dt
    if (g.eventT <= 0) triggerEvent()
    if (g.garbageT > 0) {
      const before = g.garbageT
      g.garbageT -= dt
      if (Math.floor(before) !== Math.floor(g.garbageT) && g.garbageT > 0) sfx.tick()
      if (g.garbageT <= 0) {
        g.garbageT = 0
        riseGarbage(g.garbageN)
        if (!live()) return
      }
    }
    const p = g.piece
    if (!p) return
    if (collides(g.grid, p, 0, 1)) {
      g.fall = 0
      g.lock += dt
      if (g.lock >= LOCK_DELAY) lockPiece()
    } else {
      g.lock = 0
      g.fall += dt
      const spr = secondsPerRow(g.level, run.level('calm'))
      while (g.fall >= spr && !collides(g.grid, p, 0, 1)) {
        g.fall -= spr
        p.y += 1
        g.lastRotate = false
      }
    }
  }

  // ── Drawing ───────────────────────────────────────────

  function drawMini(ctx: CanvasRenderingContext2D, k: number, cx: number, cy: number, cs: number, alpha = 1, gem = -1) {
    const cells = SHAPES[k][0]
    let minX = 9
    let maxX = -9
    let minY = 9
    let maxY = -9
    for (const [x, y] of cells) {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    const ox = cx - ((maxX - minX + 1) * cs) / 2
    const oy = cy - ((maxY - minY + 1) * cs) / 2
    ctx.globalAlpha = alpha
    const spr = blockSprite(k + 1, cs)
    cells.forEach(([x, y], i) => {
      const px = ox + (x - minX) * cs
      const py = oy + (y - minY) * cs
      ctx.drawImage(spr, px, py, cs, cs)
      if (gem === i) drawGem(ctx, px + cs / 2, py + cs / 2, cs, 0)
    })
    ctx.globalAlpha = 1
  }

  function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, t: number) {
    const s = cs * 0.3
    const tw = 0.85 + Math.sin(t * 5 + x * 0.1) * 0.15
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(tw, tw)
    const gr = ctx.createLinearGradient(0, -s, 0, s)
    gr.addColorStop(0, '#ecfeff')
    gr.addColorStop(0.5, '#22d3ee')
    gr.addColorStop(1, '#0e7490')
    ctx.fillStyle = gr
    ctx.strokeStyle = '#083344'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.lineTo(s * 0.85, -s * 0.2)
    ctx.lineTo(0, s)
    ctx.lineTo(-s * 0.85, -s * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.lineTo(s * 0.35, -s * 0.2)
    ctx.lineTo(-s * 0.35, -s * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  function drawBombIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number, on: boolean) {
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = r * 0.18
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x + r * 0.5, y - r * 0.7)
    ctx.quadraticCurveTo(x + r * 0.9, y - r * 1.3, x + r * 1.2, y - r * 1.05)
    ctx.stroke()
    const gr = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r)
    gr.addColorStop(0, on ? '#64748b' : '#475569')
    gr.addColorStop(1, on ? '#0f172a' : '#1e293b')
    ctx.fillStyle = gr
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#334155'
    ctx.fillRect(x + r * 0.25, y - r * 0.95, r * 0.5, r * 0.35)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.2, 0, Math.PI * 2)
    ctx.fill()
    if (on) {
      const f = 0.7 + Math.sin(t * 20) * 0.3
      glow(ctx, x + r * 1.2, y - r * 1.05, r * 0.7 * f, '#fde047', 0.9)
      ctx.fillStyle = '#fff7ed'
      ctx.beginPath()
      ctx.arc(x + r * 1.2, y - r * 1.05, r * 0.14, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function panel(ctx: CanvasRenderingContext2D, r: Rect, label: string, glowCol: string, dim = false) {
    ctx.fillStyle = 'rgba(8,12,28,0.72)'
    ctx.strokeStyle = glowCol
    ctx.globalAlpha = dim ? 0.35 : 0.75
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(r.x, r.y, r.w, r.h, 10)
    ctx.fill()
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = `800 ${Math.max(9, Math.round(r.w * 0.12))}px 'Plus Jakarta Sans', system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(label, r.x + r.w / 2, r.y + 5)
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const g = game.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    if (ph === 'play') update(dt)
    else if (ph === 'idle') demoStep(raw)
    else if (ph === 'dying') g.dieT += raw
    g.themeT = Math.max(0, g.themeT - raw * 0.8)
    for (const f of g.flashes) f.t -= raw
    if (g.flashes.length) g.flashes = g.flashes.filter((f) => f.t > 0)

    const L = layout()
    const th = THEMES[g.theme]

    // Background
    const bgG = ctx.createLinearGradient(0, 0, 0, H)
    bgG.addColorStop(0, th.top)
    bgG.addColorStop(1, th.bot)
    ctx.fillStyle = bgG
    ctx.fillRect(0, 0, W, H)
    if (g.themeT > 0) {
      const pt = THEMES[g.prevTheme]
      const pg = ctx.createLinearGradient(0, 0, 0, H)
      pg.addColorStop(0, pt.top)
      pg.addColorStop(1, pt.bot)
      ctx.globalAlpha = g.themeT
      ctx.fillStyle = pg
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }
    glow(ctx, W * 0.2, H * 0.25, W * 0.6, th.glow, 0.12)
    glow(ctx, W * 0.85, H * 0.8, W * 0.5, th.glow, 0.1)
    // Drifting silhouettes (parallax)
    for (const s of bg.current) {
      s.y -= s.v * raw
      s.rot += s.vr * raw
      if (s.y < -0.1) {
        s.y = 1.1
        s.x = Math.random()
      }
      ctx.save()
      ctx.translate(s.x * W, s.y * H)
      ctx.rotate(s.rot)
      ctx.globalAlpha = 0.07 + s.s * 0.003
      ctx.fillStyle = th.glow
      for (const [x, y] of SHAPES[s.k][0]) ctx.fillRect((x - 1.5) * s.s, (y - 1) * s.s, s.s - 2, s.s - 2)
      ctx.restore()
    }
    ctx.globalAlpha = 1

    fx.applyShake(ctx)

    // Well
    for (let i = 3; i >= 1; i--) {
      ctx.globalAlpha = 0.08 * (4 - i)
      ctx.strokeStyle = th.glow
      ctx.lineWidth = i * 3
      ctx.beginPath()
      ctx.roundRect(L.bx - 4, L.by - 4, L.bw + 8, L.bh + 8, 10)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = th.well
    ctx.beginPath()
    ctx.roundRect(L.bx - 4, L.by - 4, L.bw + 8, L.bh + 8, 10)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let x = 1; x < COLS; x++) {
      ctx.moveTo(L.bx + x * L.cell + 0.5, L.by)
      ctx.lineTo(L.bx + x * L.cell + 0.5, L.by + L.bh)
    }
    for (let y = 1; y < 20; y++) {
      ctx.moveTo(L.bx, L.by + y * L.cell + 0.5)
      ctx.lineTo(L.bx + L.bw, L.by + y * L.cell + 0.5)
    }
    ctx.stroke()

    // Danger glow when the stack climbs
    let highest = ROWS
    for (let i = 0; i < g.grid.length; i++) {
      if (g.grid[i]) {
        highest = Math.floor(i / COLS)
        break
      }
    }
    const danger = ph === 'play' ? Math.max(0, (HIDDEN + 6 - highest) / 6) : 0
    if (danger > 0) {
      const pulse = 0.5 + Math.sin(t * 8) * 0.5
      const dg = ctx.createLinearGradient(0, L.by, 0, L.by + L.bh * 0.45)
      dg.addColorStop(0, `rgba(239,68,68,${0.35 * danger * (0.6 + pulse * 0.4)})`)
      dg.addColorStop(1, 'rgba(239,68,68,0)')
      ctx.fillStyle = dg
      ctx.fillRect(L.bx, L.by, L.bw, L.bh * 0.45)
      g.dangerTick -= raw
      if (g.dangerTick <= 0 && danger > 0.5) {
        g.dangerTick = 0.9
        sfx.tick()
      }
    }

    ctx.save()
    ctx.beginPath()
    ctx.rect(L.bx, L.by, L.bw, L.bh)
    ctx.clip()

    // Settled cells
    const cs = L.cell
    const clearing = new Set(g.clearRows)
    const clearK = g.clearT > 0 ? 1 - g.clearT / 0.3 : 0
    const greyRows = ph === 'dying' || ph === 'over' ? Math.floor(g.dieT * 34) : -1
    for (let y = HIDDEN; y < ROWS; y++) {
      const py = L.by + (y - HIDDEN) * cs
      const isClear = clearing.has(y)
      for (let x = 0; x < COLS; x++) {
        const v = g.grid[y * COLS + x]
        if (!v) continue
        const px = L.bx + x * cs
        if (isClear) {
          const s = cs * (1 - clearK * 0.8)
          ctx.drawImage(blockSprite(v & 15, cs), px + (cs - s) / 2, py + (cs - s) / 2, s, s)
        } else {
          ctx.drawImage(blockSprite(greyRows >= y - HIDDEN ? GARBAGE : v & 15, cs), px, py, cs, cs)
          if (v & GEM) drawGem(ctx, px + cs / 2, py + cs / 2, cs, t)
        }
      }
      if (isClear) {
        ctx.globalAlpha = Math.min(1, (1 - clearK) * 1.4) * 0.85
        ctx.fillStyle = '#ffffff'
        const bw = L.bw * Math.min(1, clearK * 3)
        ctx.fillRect(L.bx + (L.bw - bw) / 2, py + cs * 0.15, bw, cs * 0.7)
        ctx.globalAlpha = 1
      }
    }
    for (const f of g.flashes) {
      if (f.y < HIDDEN) continue
      ctx.globalAlpha = (f.t / 0.22) * 0.6
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(L.bx + f.x * cs + 1, L.by + (f.y - HIDDEN) * cs + 1, cs - 2, cs - 2, cs * 0.2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Ghost + active piece
    const p = g.piece
    if (p) {
      const tone = TONES[p.k + 1]
      if (ph === 'play') {
        const d = dropDistance(g.grid, p)
        ctx.strokeStyle = tone.base
        ctx.lineWidth = 2
        for (const [cx, cy] of cellsOf(p)) {
          const gy = p.y + cy + d
          if (gy < HIDDEN) continue
          const px = L.bx + (p.x + cx) * cs
          const py = L.by + (gy - HIDDEN) * cs
          ctx.globalAlpha = 0.14
          ctx.fillStyle = tone.base
          ctx.fillRect(px + 2, py + 2, cs - 4, cs - 4)
          ctx.globalAlpha = 0.55
          ctx.beginPath()
          ctx.roundRect(px + 2, py + 2, cs - 4, cs - 4, cs * 0.18)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
      const spr = blockSprite(p.k + 1, cs)
      const lockFade = g.lock > 0 ? 0.75 + Math.cos(g.lock * 30) * 0.25 : 1
      ctx.globalAlpha = lockFade
      cellsOf(p).forEach(([cx, cy], i) => {
        const y = p.y + cy
        if (y < HIDDEN) return
        const px = L.bx + (p.x + cx) * cs
        const py = L.by + (y - HIDDEN) * cs
        ctx.drawImage(spr, px, py, cs, cs)
        if (p.gem === i) drawGem(ctx, px + cs / 2, py + cs / 2, cs, t)
      })
      ctx.globalAlpha = 1
    }

    // Garbage telegraph
    if (g.garbageT > 0) {
      const pulse = 0.5 + Math.sin(t * 14) * 0.5
      ctx.fillStyle = `rgba(239,68,68,${0.25 + pulse * 0.35})`
      ctx.fillRect(L.bx, L.by + L.bh - cs * 0.35 * g.garbageN, L.bw, cs * 0.35 * g.garbageN)
    }
    ctx.restore()

    if (g.garbageT > 0) {
      ctx.fillStyle = '#fecaca'
      ctx.font = `900 ${Math.round(cs * 0.7)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`GARBAGE IN ${Math.ceil(g.garbageT)}`, L.bx + L.bw / 2, L.by + L.bh - cs * 0.5)
    }

    // Side panels
    panel(ctx, L.next, 'NEXT', th.glow)
    const mini = cs * 0.72
    for (let i = 0; i < 3; i++) {
      const k = g.queue[i]
      const s = i === 0 ? mini : mini * 0.78
      const cy = L.next.y + cs * 1.9 + i * cs * 2.3 + (i > 0 ? cs * 0.2 : 0)
      drawMini(ctx, k, L.next.x + L.next.w / 2, cy, s, i === 0 ? 1 : 0.75)
    }
    panel(ctx, L.hold, 'HOLD', th.glow, !g.canHold)
    if (g.hold >= 0) drawMini(ctx, g.hold, L.hold.x + L.hold.w / 2, L.hold.y + L.hold.h * 0.58, mini * 0.9, g.canHold ? 1 : 0.35, g.holdGem)
    else {
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = `700 ${Math.round(cs * 0.45)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('tap / flick up', L.hold.x + L.hold.w / 2, L.hold.y + L.hold.h * 0.6)
    }
    const bombOn = g.bombs > 0
    panel(ctx, L.bomb, 'BOMB', bombOn ? '#fde047' : th.glow, !bombOn)
    drawBombIcon(ctx, L.bomb.x + L.bomb.w * 0.42, L.bomb.y + L.bomb.h * 0.6, cs * 0.55, t, bombOn)
    ctx.fillStyle = bombOn ? '#fde047' : 'rgba(255,255,255,0.4)'
    ctx.font = `900 ${Math.round(cs * 0.6)}px 'Plus Jakarta Sans', system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`×${g.bombs}`, L.bomb.x + L.bomb.w * 0.78, L.bomb.y + L.bomb.h * 0.66)

    // Event timer pip under the side column
    if (ph === 'play') {
      const ey = L.bomb.y + L.bomb.h + cs * 0.5
      if (ey + 6 < L.by + L.bh + 4) {
        const k = 1 - g.eventT / EVENT_EVERY
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.beginPath()
        ctx.roundRect(L.bomb.x, ey, L.bomb.w, 6, 3)
        ctx.fill()
        ctx.fillStyle = th.glow
        ctx.beginPath()
        ctx.roundRect(L.bomb.x, ey, Math.max(6, L.bomb.w * Math.min(1, k)), 6, 3)
        ctx.fill()
      }
    }

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    resetDemo()
  }, [])

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Level {hud.level} · {hud.lines} lines
                </div>
              </div>
              <div className="action-hud__right">
                {hud.combo >= 2 ? <span className="action-hud__small" style={{ color: '#fde047' }}>Combo ×{hud.combo}</span> : null}
                {hud.b2b ? <span className="action-hud__small" style={{ color: '#67e8f9' }}>B2B ready</span> : null}
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
            <ActionIdle
              game="blocks"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to slide, tap to spin, flick down to slam. Clear lines, chain combos, grab gems."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.level >= 5 ? 'Block master!' : 'Stacked out!'}
            subtitle={`Score ${hud.score} · Level ${hud.level} · ${hud.lines} lines`}
            celebrate={hud.level >= 5}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
