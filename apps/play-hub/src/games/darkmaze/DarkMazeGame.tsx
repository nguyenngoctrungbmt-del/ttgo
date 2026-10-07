import { useEffect, useRef, useState } from 'react'
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
import '../../shared/action/action.css'
import { Hearts, ICONS, PowerBar, drawSym, phasePill, rr } from '../matrix/memkit'
import { SIGNATURE, config, seeded } from './levels'
import { BIT, DX, DY, doorBetween, generate, neighbor, type Maze } from './maze'

const meta = getGame('darkmaze')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Sub = 'intro' | 'preview' | 'dark' | 'exit'

type World = {
  level: number
  bonus: boolean
  maze: Maze
  pc: number
  from: number
  moveT: number
  face: number
  queued: number
  keys: number
  oil: number
  oilMax: number
  hearts: number
  maxHearts: number
  peeks: number
  peekT: number
  sub: Sub
  subT: number
  memo: number
  hurtThisLevel: boolean
  peekedThisLevel: boolean
  streak: number
  score: number
  gems: number
  lightR: number
  visited: Set<number>
  bump: number
  lastMilestone: number
  moths: { a: number; r: number; s: number }[]
  stats: { score: number; level: number; mazes: number; keys: number; streak: number; flasks: number }
}

function freshWorld(): World {
  const maze = generate({ cols: 6, rows: 8, doors: 1, traps: 3, oils: 1, gems: 0, loops: 2 })
  return {
    level: 0,
    bonus: false,
    maze,
    pc: maze.start,
    from: maze.start,
    moveT: 1,
    face: 1,
    queued: -1,
    keys: 0,
    oil: 10,
    oilMax: 10,
    hearts: 3,
    maxHearts: 3,
    peeks: 1,
    peekT: 0,
    sub: 'intro',
    subT: 0,
    memo: 3,
    hurtThisLevel: false,
    peekedThisLevel: false,
    streak: 0,
    score: 0,
    gems: 0,
    lightR: 1.6,
    visited: new Set(),
    bump: 0,
    lastMilestone: 0,
    moths: Array.from({ length: 5 }, () => ({ a: rand(0, 6.28), r: rand(0.5, 1.2), s: rand(1, 2.5) })),
    stats: { score: 0, level: 0, mazes: 0, keys: 0, streak: 0, flasks: 0 },
  }
}

const MOVE_TIME = 0.13

export default function DarkMazeGame() {
  const run = useActionRun('darkmaze')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ id: number; x: number; y: number; dir: number; rep: number } | null>(null)
  const demo = useRef({ t: 0, dir: 1 })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hearts: 3, max: 3, keys: 0, peeks: 0, dark: false, streak: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function mult(w: World) {
    return 1 + Math.min(w.streak, 8) * 0.25
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.level, hearts: w.hearts, max: w.maxHearts, keys: w.keys, peeks: w.peeks, dark: w.sub === 'dark', streak: w.streak })
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: performance.now(), text, sub })
  }

  function geo(m: Maze) {
    const { w: W, h: H } = size.current
    const top = 118
    const bottom = 86
    const cs = Math.floor(Math.min((W - 24) / m.cols, (H - top - bottom) / m.rows))
    const mw = cs * m.cols
    const mh = cs * m.rows
    return { cs, ox: Math.round((W - mw) / 2), oy: Math.round(top + (H - top - bottom - mh) / 2), mw, mh }
  }

  function cellXY(m: Maze, c: number) {
    const g = geo(m)
    return { x: g.ox + ((c % m.cols) + 0.5) * g.cs, y: g.oy + (Math.floor(c / m.cols) + 0.5) * g.cs, cs: g.cs }
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.peeks = 1 + run.level('peek')
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    startLevel(Math.max(1, level))
  }

  function startLevel(L: number) {
    const w = world.current
    const isNew = L > w.level
    w.level = L
    w.stats.level = Math.max(w.stats.level, L)
    const c = config(L, run.level('flask'))
    w.bonus = c.bonus
    w.maze = generate(c, c.sig ? seeded(c.sig.seed) : Math.random)
    w.pc = w.maze.start
    w.from = w.pc
    w.moveT = 1
    w.queued = -1
    w.keys = 0
    w.oilMax = Math.ceil(w.maze.route * c.slack) + 3
    w.oil = w.oilMax
    w.peekT = 0
    w.hurtThisLevel = false
    w.peekedThisLevel = false
    w.visited = new Set([w.pc])
    w.lightR = Math.max(1.2, (Math.max(1.45, 2.15 - L * 0.035) + run.level('lantern') * 0.3) * c.light)
    const cells = c.cols * c.rows
    w.memo = ((2.4 + cells * 0.05) * Math.max(0.6, 1 - L * 0.02) + c.doors * 0.6 + c.traps * 0.25) * c.memo
    w.sub = 'intro'
    w.subT = 0.9
    if (c.sig?.boss) showBanner(`BOSS · LEVEL ${L}`, `${c.sig.name.replace('Boss · ', '')} · ${c.sig.sub}`)
    else if (c.sig) showBanner(c.sig.name.toUpperCase(), `Level ${L} · ${c.sig.sub}`)
    else if (isNew && L === 3) showBanner('LOCKED DOOR', 'find the gold key first')
    else if (isNew && L === 5) showBanner('TREASURE RUN', 'grab the gems · no traps')
    else if (isNew && L === 6) showBanner('SPIKE TRAPS', 'they only show in the preview')
    else if (isNew && L === 7) showBanner('OIL FLASKS', 'pick them up to refill')
    else if (isNew && L === 11) showBanner('TWO DOORS', 'two keys, two locks')
    else if (c.bonus) showBanner('TREASURE RUN', 'grab the gems · no traps')
    else showBanner(`LEVEL ${L}`, L === 1 ? 'memorise the way out' : `${c.cols}×${c.rows} maze`)
    sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function goDark() {
    const w = world.current
    w.sub = 'dark'
    w.subT = 0
    sfx.whoosh()
    fx.flash('#000000', 0.25)
    haptic.light()
    pushHud()
  }

  function hurt(text: string) {
    const w = world.current
    const p = cellXY(w.maze, w.pc)
    w.hearts -= 1
    w.hurtThisLevel = true
    w.streak = 0
    fx.flash('#ef4444', 0.3)
    fx.shake(10, 0.3)
    fx.stop(0.1)
    fx.text(p.x, p.y - p.cs * 0.7, text, '#fca5a5', 18)
    sfx.hurt()
    haptic.error()
    pushHud()
    if (w.hearts <= 0) die()
  }

  function tryMove(d: number) {
    const w = world.current
    if (phaseRef.current !== 'play' || (w.sub !== 'dark' && w.sub !== 'preview')) return
    if (w.moveT < 1) {
      w.queued = d
      return
    }
    if (w.sub === 'preview') goDark()
    const m = w.maze
    w.face = d
    const p = cellXY(m, w.pc)
    if (m.walls[w.pc] & BIT[d]) {
      w.bump = 1
      fx.burst(p.x + DX[d] * p.cs * 0.45, p.y + DY[d] * p.cs * 0.45, { count: 5, color: ['#a8a29e', '#78716c'], speed: 80, size: 2.5, life: 0.3 })
      sfx.thud()
      haptic.light()
      return
    }
    const nb = neighbor(m, w.pc, d)
    if (nb < 0) return
    const door = doorBetween(m.doors, w.pc, nb)
    if (door && !door.open) {
      if (w.keys <= 0) {
        w.bump = 1
        fx.text(p.x + DX[d] * p.cs * 0.5, p.y + DY[d] * p.cs * 0.5 - 14, 'LOCKED', '#fcd34d', 15)
        sfx.clang()
        haptic.medium()
        return
      }
      w.keys -= 1
      door.open = true
      fx.burst(p.x + DX[d] * p.cs * 0.5, p.y + DY[d] * p.cs * 0.5, { count: 14, color: ['#fde047', '#fbbf24', '#ffffff'], speed: 180, shape: 'spark' })
      fx.text(p.x, p.y - p.cs * 0.7, 'UNLOCKED', '#fde047', 16)
      sfx.clang()
      sfx.power()
      haptic.medium()
    }
    w.from = w.pc
    w.pc = nb
    w.moveT = 0
    w.oil -= 1
    w.visited.add(nb)
    sfx.move()
    pushHud()
  }

  function arrive() {
    const w = world.current
    const m = w.maze
    const p = cellXY(m, w.pc)
    for (const it of m.items) {
      if (it.c !== w.pc || it.taken) continue
      if (it.kind === 'trap') {
        if (it.hit) continue
        it.hit = true
        fx.burst(p.x, p.y, { count: 16, color: ['#ef4444', '#991b1b', '#e5e7eb'], speed: 200, shape: 'spark' })
        hurt('SPIKES!')
        if (phaseRef.current !== 'play') return
      } else if (it.kind === 'key') {
        it.taken = true
        w.keys += 1
        w.stats.keys += 1
        fx.burst(p.x, p.y, { count: 18, color: ['#fde047', '#fff7ae', '#f59e0b'], speed: 200, shape: 'spark' })
        fx.ring(p.x, p.y, { color: '#fde047', maxR: p.cs, life: 0.4 })
        fx.text(p.x, p.y - p.cs * 0.7, 'KEY!', '#fde047', 18)
        sfx.power()
        haptic.medium()
      } else if (it.kind === 'oil') {
        it.taken = true
        const add = Math.max(6, Math.round(w.oilMax * 0.35))
        w.oil = Math.min(w.oilMax + add, w.oil + add)
        w.stats.flasks += 1
        fx.burst(p.x, p.y, { count: 14, color: ['#fbbf24', '#f59e0b', '#fff7ed'], speed: 160 })
        fx.text(p.x, p.y - p.cs * 0.7, `+${add} OIL`, '#fcd34d', 17)
        sfx.pop()
        sfx.score(2)
        haptic.light()
      } else if (it.kind === 'gem') {
        it.taken = true
        w.gems += 1
        w.score += Math.round(40 * mult(w))
        fx.burst(p.x, p.y, { count: 16, color: ['#67e8f9', '#a5f3fc', '#ffffff'], speed: 200, shape: 'spark' })
        fx.text(p.x, p.y - p.cs * 0.7, `+${Math.round(40 * mult(w))}`, '#67e8f9', 17)
        sfx.score(w.gems)
        haptic.light()
      }
    }
    if (w.pc === m.exit) {
      escape()
      return
    }
    if (w.oil <= 0) {
      const refill = Math.max(8, Math.round(w.oilMax * 0.5))
      w.oil = refill
      hurt('OUT OF OIL')
      if (phaseRef.current === 'play') {
        fx.text(p.x, p.y - p.cs * 1.2, `spare flask +${refill}`, '#fcd34d', 14)
        showBanner('OUT OF OIL', 'spare flask lit')
      }
    }
    w.stats.score = w.score
    run.update(w.stats)
    pushHud()
  }

  function escape() {
    const w = world.current
    const p = cellXY(w.maze, w.pc)
    w.sub = 'exit'
    w.subT = 1.4
    w.stats.mazes += 1
    if (!w.hurtThisLevel) {
      w.streak += 1
      w.stats.streak = Math.max(w.stats.streak, w.streak)
    }
    const gain = Math.round((80 + w.level * 25 + Math.max(0, w.oil) * 5) * mult(w))
    w.score += gain
    w.stats.score = w.score
    if (!w.hurtThisLevel && w.streak % 3 === 0) {
      w.peeks += 1
      fx.text(p.x, p.y - p.cs * 1.4, '+1 PEEK', '#c4b5fd', 16)
    }
    // Stars: escape = 1, no damage = +1, no Peek used = +1.
    const stars = 1 + (w.hurtThisLevel ? 0 : 1) + (w.peekedThisLevel ? 0 : 1)
    run.completeLevel(w.level, stars)
    const boss = !!SIGNATURE[w.level]?.boss
    showBanner(boss ? 'VAULT CLEARED!' : w.hurtThisLevel ? 'ESCAPED!' : w.streak >= 2 ? `CLEAN ESCAPE ×${w.streak}` : 'CLEAN ESCAPE!', `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  +${gain}`)
    fx.burst(p.x, p.y, { count: 30, color: ['#4ade80', '#bbf7d0', '#fde047', '#ffffff'], speed: 280, shape: 'spark', life: 0.8 })
    fx.ring(p.x, p.y, { color: '#4ade80', maxR: p.cs * 3, life: 0.6, width: 5 })
    fx.slowmo(0.3, 0.5)
    sfx.win()
    haptic.success()
    if (w.level % 5 === 0 && w.level > w.lastMilestone) {
      w.lastMilestone = w.level
      void trackEvent('action_milestone', { game_id: 'darkmaze', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    w.peekT = 2
    fx.shake(12, 0.4)
    fx.slowmo(0.8, 0.3)
    sfx.lose()
    haptic.heavy()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.level * 2.5 + w.stats.mazes * 0.5 + w.gems * 2 + w.streak)
      run.end({ score: w.score, cleared: w.level >= 8, stats: { ...w.stats, level: w.level }, coins }, revive)
    }, 1300)
  }

  /** Ad revive: two hearts, a full lantern, and the map is shown again from where you stand. */
  function revive() {
    const w = world.current
    w.hearts = Math.min(w.maxHearts, 2)
    w.oil = Math.max(w.oil, w.oilMax)
    w.peekT = 0
    w.moveT = 1
    w.from = w.pc
    w.sub = 'preview'
    w.subT = 0
    w.memo = Math.max(2.5, w.memo * 0.8)
    fx.reset()
    setPhaseBoth('play')
    showBanner('REVIVED!', '+2 hearts · lantern refilled')
    sfx.ready()
    pushHud()
  }

  function applyPower(id: string) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.sub !== 'dark') return
    if (id === 'peek' && w.peeks > 0 && w.peekT <= 0) {
      w.peeks -= 1
      w.peekedThisLevel = true
      w.peekT = 1.6
      fx.flash('#fde68a', 0.25)
      sfx.flip()
      haptic.medium()
      pushHud()
    }
  }

  // ── Input ──────────────────────────────────────────

  function dirFrom(dx: number, dy: number) {
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0
  }

  function onPointerDown(e: React.PointerEvent) {
    if (phaseRef.current !== 'play') return
    const p = localPoint(e, arenaRef.current!)
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    drag.current = { id: e.pointerId, x: p.x, y: p.y, dir: -1, rep: 0 }
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const p = localPoint(e, arenaRef.current!)
    const dx = p.x - d.x
    const dy = p.y - d.y
    if (Math.hypot(dx, dy) > 24) {
      const dir = dirFrom(dx, dy)
      if (dir !== d.dir) {
        d.dir = dir
        d.rep = 0.24
        tryMove(dir)
      }
      // Re-anchor so changing direction mid-drag feels responsive.
      d.x = p.x - Math.sign(dx) * Math.min(Math.abs(dx), 24) * (dir % 2 ? 1 : 0)
      d.y = p.y - Math.sign(dy) * Math.min(Math.abs(dy), 24) * (dir % 2 ? 0 : 1)
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    drag.current = null
    if (d.dir >= 0) return
    // A tap: step toward the tap point.
    const w = world.current
    const p = localPoint(e, arenaRef.current!)
    const c = cellXY(w.maze, w.pc)
    if (Math.hypot(p.x - c.x, p.y - c.y) < c.cs * 0.4) return
    tryMove(dirFrom(p.x - c.x, p.y - c.y))
  }

  useEffect(() => {
    const keys: Record<string, number> = { ArrowUp: 0, w: 0, ArrowRight: 1, d: 1, ArrowDown: 2, s: 2, ArrowLeft: 3, a: 3 }
    function down(e: KeyboardEvent) {
      if (e.key in keys) {
        e.preventDefault()
        tryMove(keys[e.key])
      } else if (e.key === 'p' || e.key === ' ') applyPower('peek')
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Drawing ──────────────────────────────────────────

  function drawFloor(ctx: CanvasRenderingContext2D, m: Maze, g: ReturnType<typeof geo>) {
    ctx.fillStyle = '#1c1917'
    ctx.fillRect(g.ox, g.oy, g.mw, g.mh)
    for (let c = 0; c < m.cols * m.rows; c++) {
      const x = g.ox + (c % m.cols) * g.cs
      const y = g.oy + Math.floor(c / m.cols) * g.cs
      const h = (c * 2654435761) >>> 0
      ctx.fillStyle = (c + Math.floor(c / m.cols)) % 2 ? '#292524' : '#231f1d'
      ctx.fillRect(x + 1, y + 1, g.cs - 2, g.cs - 2)
      if (h % 5 === 0) {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x + g.cs * 0.2, y + g.cs * ((h % 7) / 10 + 0.2))
        ctx.lineTo(x + g.cs * 0.5, y + g.cs * 0.5)
        ctx.lineTo(x + g.cs * 0.75, y + g.cs * ((h % 3) / 10 + 0.6))
        ctx.stroke()
      }
    }
  }

  function drawWalls(ctx: CanvasRenderingContext2D, m: Maze, g: ReturnType<typeof geo>) {
    const wt = Math.max(3, g.cs * 0.16)
    ctx.beginPath()
    for (let c = 0; c < m.cols * m.rows; c++) {
      const x = g.ox + (c % m.cols) * g.cs
      const y = g.oy + Math.floor(c / m.cols) * g.cs
      const wl = m.walls[c]
      if (wl & 1) {
        ctx.moveTo(x, y)
        ctx.lineTo(x + g.cs, y)
      }
      if (wl & 8) {
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + g.cs)
      }
      if (c % m.cols === m.cols - 1 && wl & 2) {
        ctx.moveTo(x + g.cs, y)
        ctx.lineTo(x + g.cs, y + g.cs)
      }
      if (Math.floor(c / m.cols) === m.rows - 1 && wl & 4) {
        ctx.moveTo(x, y + g.cs)
        ctx.lineTo(x + g.cs, y + g.cs)
      }
    }
    ctx.lineCap = 'round'
    ctx.save()
    ctx.translate(0, wt * 0.35)
    ctx.strokeStyle = '#0c0a09'
    ctx.lineWidth = wt
    ctx.stroke()
    ctx.restore()
    ctx.strokeStyle = '#78716c'
    ctx.lineWidth = wt
    ctx.stroke()
    ctx.strokeStyle = '#a8a29e'
    ctx.lineWidth = wt * 0.38
    ctx.save()
    ctx.translate(0, -wt * 0.15)
    ctx.stroke()
    ctx.restore()
  }

  function drawKey(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
    const bob = Math.sin(t * 3) * s * 0.06
    glow(ctx, x, y, s * 0.9, '#fde047', 0.35)
    ctx.save()
    ctx.translate(x, y + bob)
    ctx.rotate(-0.6)
    ctx.fillStyle = '#facc15'
    ctx.strokeStyle = '#a16207'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(-s * 0.2, 0, s * 0.17, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#1c1917'
    ctx.beginPath()
    ctx.arc(-s * 0.2, 0, s * 0.07, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#facc15'
    ctx.fillRect(-s * 0.05, -s * 0.045, s * 0.36, s * 0.09)
    ctx.fillRect(s * 0.18, 0, s * 0.06, s * 0.13)
    ctx.fillRect(s * 0.26, 0, s * 0.05, s * 0.1)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.beginPath()
    ctx.arc(-s * 0.25, -s * 0.06, s * 0.04, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function drawFlask(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
    const bob = Math.sin(t * 2.5 + x) * s * 0.05
    glow(ctx, x, y, s * 0.8, '#f59e0b', 0.3)
    ctx.save()
    ctx.translate(x, y + bob)
    const g = ctx.createLinearGradient(-s * 0.2, 0, s * 0.2, 0)
    g.addColorStop(0, '#b45309')
    g.addColorStop(0.5, '#fbbf24')
    g.addColorStop(1, '#92400e')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-s * 0.07, -s * 0.22)
    ctx.lineTo(s * 0.07, -s * 0.22)
    ctx.lineTo(s * 0.07, -s * 0.1)
    ctx.quadraticCurveTo(s * 0.24, -s * 0.02, s * 0.22, s * 0.14)
    ctx.quadraticCurveTo(s * 0.2, s * 0.25, 0, s * 0.25)
    ctx.quadraticCurveTo(-s * 0.2, s * 0.25, -s * 0.22, s * 0.14)
    ctx.quadraticCurveTo(-s * 0.24, -s * 0.02, -s * 0.07, -s * 0.1)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#78350f'
    ctx.fillRect(-s * 0.08, -s * 0.3, s * 0.16, s * 0.09)
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.ellipse(-s * 0.09, s * 0.05, s * 0.03, s * 0.07, 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function drawTrap(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, hit: boolean, t: number) {
    const k = s * 0.36
    ctx.fillStyle = hit ? '#3f1d1d' : '#450a0a'
    rr(ctx, x - k, y - k, k * 2, k * 2, k * 0.25)
    ctx.fill()
    ctx.strokeStyle = `rgba(239,68,68,${0.6 + Math.sin(t * 5) * 0.3})`
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = hit ? '#9ca3af' : '#e5e7eb'
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const sx = x - k * 0.62 + i * k * 0.62
        const sy = y - k * 0.3 + j * k * 0.75
        ctx.beginPath()
        ctx.moveTo(sx - k * 0.2, sy + k * 0.2)
        ctx.lineTo(sx, sy - k * 0.38)
        ctx.lineTo(sx + k * 0.2, sy + k * 0.2)
        ctx.closePath()
        ctx.fill()
      }
    }
  }

  function drawExit(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
    glow(ctx, x, y, s * (0.9 + Math.sin(t * 3) * 0.08), '#4ade80', 0.45)
    const k = s * 0.38
    // Stone archway
    ctx.fillStyle = '#57534e'
    ctx.beginPath()
    ctx.moveTo(x - k, y + k)
    ctx.lineTo(x - k, y - k * 0.2)
    ctx.arc(x, y - k * 0.2, k, Math.PI, 0)
    ctx.lineTo(x + k, y + k)
    ctx.closePath()
    ctx.fill()
    // Glowing opening with steps going down
    const kk = k * 0.74
    const og = ctx.createLinearGradient(0, y - kk, 0, y + k)
    og.addColorStop(0, '#bbf7d0')
    og.addColorStop(1, '#14532d')
    ctx.fillStyle = og
    ctx.beginPath()
    ctx.moveTo(x - kk, y + k)
    ctx.lineTo(x - kk, y - k * 0.2)
    ctx.arc(x, y - k * 0.2, kk, Math.PI, 0)
    ctx.lineTo(x + kk, y + k)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(5,46,22,0.7)'
    for (let i = 0; i < 3; i++) {
      const sy = y + k * 0.05 + i * k * 0.32
      const sw = kk * (0.95 - i * 0.15)
      ctx.fillRect(x - sw, sy, sw * 2, k * 0.12)
    }
    // Down arrow so the exit reads without colour
    ctx.fillStyle = '#f0fdf4'
    ctx.beginPath()
    const ay = y - k * 0.55 + Math.sin(t * 4) * k * 0.08
    ctx.moveTo(x - k * 0.22, ay)
    ctx.lineTo(x + k * 0.22, ay)
    ctx.lineTo(x, ay + k * 0.3)
    ctx.closePath()
    ctx.fill()
  }

  function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
    glow(ctx, x, y, s * 0.7, '#22d3ee', 0.4)
    drawSym(ctx, 'diamond', x, y + Math.sin(t * 3 + x) * 2, s * 0.22, '#67e8f9', '#0e7490')
  }

  function drawDoor(ctx: CanvasRenderingContext2D, m: Maze, a: number, b: number, open: boolean, g: ReturnType<typeof geo>) {
    const ax = (a % m.cols) + 0.5
    const ay = Math.floor(a / m.cols) + 0.5
    const bx = (b % m.cols) + 0.5
    const by = Math.floor(b / m.cols) + 0.5
    const mx = g.ox + ((ax + bx) / 2) * g.cs
    const my = g.oy + ((ay + by) / 2) * g.cs
    const horiz = ay === by
    const len = g.cs * 0.8
    const th = g.cs * 0.2
    ctx.save()
    ctx.translate(mx, my)
    if (horiz) ctx.rotate(Math.PI / 2)
    if (open) {
      ctx.globalAlpha = 0.35
      ctx.fillStyle = '#78350f'
      ctx.fillRect(-len / 2, -th / 2, th, th)
      ctx.fillRect(len / 2 - th, -th / 2, th, th)
      ctx.restore()
      return
    }
    ctx.fillStyle = '#92400e'
    rr(ctx, -len / 2, -th / 2, len, th, 3)
    ctx.fill()
    ctx.strokeStyle = '#451a03'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#57534e'
    ctx.fillRect(-len * 0.32, -th / 2, th * 0.35, th)
    ctx.fillRect(len * 0.22, -th / 2, th * 0.35, th)
    ctx.fillStyle = '#facc15'
    ctx.beginPath()
    ctx.arc(0, 0, th * 0.42, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1c1917'
    ctx.fillRect(-th * 0.08, -th * 0.2, th * 0.16, th * 0.4)
    ctx.restore()
  }

  function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, face: number, walking: boolean, t: number) {
    const bob = walking ? Math.abs(Math.sin(t * 18)) * s * 0.06 : Math.sin(t * 2) * s * 0.02
    const r = s * 0.3
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.9, r * 0.9, r * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
    const lx = x + (face === 1 ? r * 1.05 : face === 3 ? -r * 1.05 : r * 0.9)
    const ly = y - bob + (face === 0 ? -r * 0.2 : r * 0.25)
    const behind = face === 0
    const lantern = () => {
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(lx, ly - r * 0.55)
      ctx.lineTo(lx, ly - r * 0.3)
      ctx.stroke()
      ctx.fillStyle = '#fbbf24'
      rr(ctx, lx - r * 0.24, ly - r * 0.32, r * 0.48, r * 0.6, r * 0.12)
      ctx.fill()
      ctx.fillStyle = '#fff7ed'
      ctx.beginPath()
      ctx.ellipse(lx, ly, r * 0.09, r * 0.16 + Math.sin(t * 20) * r * 0.03, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#78350f'
      ctx.fillRect(lx - r * 0.28, ly - r * 0.38, r * 0.56, r * 0.1)
    }
    if (behind) lantern()
    // Cloak
    const cg = ctx.createLinearGradient(0, y - r, 0, y + r)
    cg.addColorStop(0, '#2dd4bf')
    cg.addColorStop(1, '#0f766e')
    ctx.fillStyle = cg
    ctx.beginPath()
    ctx.moveTo(x - r * 0.95, y + r * 0.85 - bob)
    ctx.quadraticCurveTo(x - r, y - r * 0.3 - bob, x, y - r * 0.5 - bob)
    ctx.quadraticCurveTo(x + r, y - r * 0.3 - bob, x + r * 0.95, y + r * 0.85 - bob)
    ctx.closePath()
    ctx.fill()
    // Head
    const hy = y - r * 0.55 - bob
    ctx.fillStyle = '#fed7aa'
    ctx.beginPath()
    ctx.arc(x, hy, r * 0.6, 0, Math.PI * 2)
    ctx.fill()
    // Hood
    ctx.fillStyle = '#7c2d12'
    ctx.beginPath()
    ctx.arc(x, hy - r * 0.05, r * 0.66, Math.PI * 1.02, Math.PI * 1.98)
    ctx.quadraticCurveTo(x, hy - r * 0.35, x - r * 0.66, hy - r * 0.07)
    ctx.fill()
    if (face !== 0) {
      const ex = face === 1 ? r * 0.18 : face === 3 ? -r * 0.18 : 0
      ctx.fillStyle = '#1c1917'
      for (const s2 of [-1, 1]) {
        ctx.beginPath()
        ctx.arc(x + ex + s2 * r * 0.22, hy + r * 0.08, r * 0.09, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(251,113,133,0.5)'
      ctx.beginPath()
      ctx.arc(x + ex - r * 0.36, hy + r * 0.28, r * 0.08, 0, Math.PI * 2)
      ctx.arc(x + ex + r * 0.36, hy + r * 0.28, r * 0.08, 0, Math.PI * 2)
      ctx.fill()
    }
    if (!behind) lantern()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const w = world.current
    const idle = ph === 'idle'
    const m = w.maze
    const g = geo(m)

    // ── Update ──
    if (idle) {
      // Attract mode: wander the demo maze with the lights on.
      const d = demo.current
      d.t -= raw
      if (d.t <= 0 && w.moveT >= 1) {
        d.t = 0.28
        const opts = [0, 1, 2, 3].filter((k) => !(m.walls[w.pc] & BIT[k]))
        const fwd = opts.filter((k) => k !== (d.dir + 2) % 4)
        const k = fwd.length ? fwd[Math.floor(Math.random() * fwd.length)] : opts[0]
        d.dir = k
        w.from = w.pc
        w.pc = neighbor(m, w.pc, k)
        w.face = k
        w.moveT = 0
      }
    }
    if (w.moveT < 1) {
      w.moveT = Math.min(1, w.moveT + dt / MOVE_TIME)
      if (w.moveT >= 1 && ph === 'play') {
        arrive()
        if (w.queued >= 0 && phaseRef.current === 'play' && w.sub === 'dark') {
          const q = w.queued
          w.queued = -1
          tryMove(q)
        }
      }
    }
    if (ph === 'play') {
      if (w.sub === 'intro') {
        w.subT -= dt
        if (w.subT <= 0) {
          w.sub = 'preview'
          w.subT = 0
        }
      } else if (w.sub === 'preview') {
        w.subT += dt
        if (w.subT >= w.memo) goDark()
      } else if (w.sub === 'exit') {
        w.subT -= dt
        if (w.subT <= 0) startLevel(w.level + 1)
      }
      if (w.peekT > 0) w.peekT = Math.max(0, w.peekT - raw)
      // Held drag repeats steps like a joystick.
      const dr = drag.current
      if (dr && dr.dir >= 0 && w.sub === 'dark') {
        dr.rep -= raw
        if (dr.rep <= 0 && w.moveT >= 1) {
          dr.rep = 0.17
          tryMove(dr.dir)
        }
      }
    }
    w.bump = Math.max(0, w.bump - raw * 5)

    // ── Draw ──
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#1c1917')
    bg.addColorStop(1, '#0c0a09')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    fx.applyShake(ctx)
    // Outer stone frame
    ctx.fillStyle = '#0c0a09'
    rr(ctx, g.ox - 8, g.oy - 8, g.mw + 16, g.mh + 16, 12)
    ctx.fill()
    drawFloor(ctx, m, g)
    // Footprints of where you have been.
    if (!idle) {
      ctx.fillStyle = 'rgba(253,230,138,0.13)'
      for (const c of w.visited) {
        const p = cellXY(m, c)
        ctx.beginPath()
        ctx.arc(p.x, p.y, g.cs * 0.1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    const lit = idle || w.sub === 'preview' || w.sub === 'intro' || w.peekT > 0 || ph === 'dying' || ph === 'over' || w.sub === 'exit'
    const ex = cellXY(m, m.exit)
    drawExit(ctx, ex.x, ex.y, g.cs, t)
    for (const it of m.items) {
      if (it.taken) continue
      const p = cellXY(m, it.c)
      if (it.kind === 'trap') {
        if (lit || it.hit) drawTrap(ctx, p.x, p.y, g.cs, it.hit, t)
      } else if (it.kind === 'key') drawKey(ctx, p.x, p.y, g.cs, t)
      else if (it.kind === 'oil') drawFlask(ctx, p.x, p.y, g.cs, t)
      else drawGem(ctx, p.x, p.y, g.cs, t)
    }
    drawWalls(ctx, m, g)
    for (const d of m.doors) drawDoor(ctx, m, d.a, d.b, d.open, g)
    // Player (interpolated between cells, with a small bump nudge into walls)
    const a = cellXY(m, w.from)
    const b = cellXY(m, w.pc)
    const k = w.moveT
    const ease = k * k * (3 - 2 * k)
    let px = a.x + (b.x - a.x) * ease
    let py = a.y + (b.y - a.y) * ease
    px += DX[w.face] * Math.sin(w.bump * Math.PI) * g.cs * 0.12
    py += DY[w.face] * Math.sin(w.bump * Math.PI) * g.cs * 0.12
    // Start marker
    if (!idle) {
      const s0 = cellXY(m, m.start)
      ctx.strokeStyle = 'rgba(45,212,191,0.4)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(s0.x, s0.y, g.cs * 0.3, 0, Math.PI * 2)
      ctx.stroke()
    }
    drawPlayer(ctx, px, py, g.cs, w.face, k < 1, t)

    // Darkness with a flickering lantern hole.
    if (!lit) {
      const lowOil = w.oil <= Math.max(3, w.oilMax * 0.15)
      const flick = Math.sin(t * 13) * 0.04 + Math.sin(t * 7.3) * 0.03 + (lowOil ? Math.sin(t * 25) * 0.08 : 0)
      const R = g.cs * (w.lightR + flick) * (lowOil ? 0.85 : 1)
      const lg = ctx.createRadialGradient(px, py, R * 0.25, px, py, R)
      lg.addColorStop(0, 'rgba(5,4,3,0)')
      lg.addColorStop(0.55, 'rgba(5,4,3,0.35)')
      lg.addColorStop(1, 'rgba(5,4,3,0.985)')
      ctx.fillStyle = lg
      ctx.fillRect(-20, -20, W + 40, H + 40)
      // Warm tint inside the light
      glow(ctx, px, py, R * 0.9, '#f59e0b', 0.14)
      // Moths fluttering around the lantern
      ctx.fillStyle = 'rgba(254,243,199,0.7)'
      for (const mo of w.moths) {
        mo.a += raw * mo.s
        const mx = px + Math.cos(mo.a) * R * 0.5 * mo.r
        const my = py + Math.sin(mo.a * 1.3) * R * 0.4 * mo.r
        ctx.beginPath()
        ctx.ellipse(mx, my, 1.6 + Math.abs(Math.sin(t * 30 + mo.a)) * 1.4, 1.2, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (w.peekT > 0) {
      ctx.fillStyle = `rgba(253,230,138,${0.08 * Math.min(1, w.peekT)})`
      ctx.fillRect(g.ox, g.oy, g.mw, g.mh)
    }

    if (!lit) {
      // Faint outer wall so you always know where the edges are.
      ctx.strokeStyle = 'rgba(168,162,158,0.22)'
      ctx.lineWidth = 2
      rr(ctx, g.ox - 3, g.oy - 3, g.mw + 6, g.mh + 6, 6)
      ctx.stroke()
    }
    // Phase pill / oil meter
    if (ph === 'play' || ph === 'dying') {
      const py0 = 74
      if (w.sub === 'preview') phasePill(ctx, W / 2, py0, 'MEMORISE THE MAZE', 1 - w.subT / w.memo, '#fde68a')
      else if (w.sub === 'intro') phasePill(ctx, W / 2, py0, 'GET READY', null, '#94a3b8')
      else if (w.sub === 'dark' || w.sub === 'exit') {
        const frac = w.oil / w.oilMax
        phasePill(ctx, W / 2, py0, w.peekT > 0 ? 'PEEK!' : `OIL · ${Math.max(0, w.oil)} steps`, Math.min(1, frac), frac < 0.25 ? '#ef4444' : '#f59e0b', frac < 0.25 ? Math.sin(t * 10) * 0.5 + 0.5 : 0)
      }
    }
    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__mem = { world, move: tryMove }

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" ref={arenaRef} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Level {hud.level}
                  {hud.keys > 0 ? ` · ${hud.keys} key${hud.keys > 1 ? 's' : ''}` : ''}
                </div>
              </div>
              <div className="action-hud__right">
                <Hearts hp={hud.hearts} max={hud.max} />
                {hud.streak >= 1 ? (
                  <span className="mem-mult" key={hud.streak}>
                    ×{(1 + Math.min(hud.streak, 8) * 0.25).toFixed(2).replace(/0$/, '')} streak
                  </span>
                ) : null}
              </div>
            </div>
          )}
          {phase === 'play' && <PowerBar onUse={applyPower} powers={[{ id: 'peek', label: 'Peek', icon: ICONS.peek, count: hud.peeks, disabled: !hud.dark }]} />}
          {banner && phase === 'play' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)} style={{ whiteSpace: 'normal', width: 'min(92%, 340px)', textAlign: 'center', lineHeight: 1.05 }}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="darkmaze"
              icon={meta.icon}
              title={meta.title}
              hint="Memorise the maze before the lights go out, then find the exit by lantern light."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.level >= 8 ? 'Master of the dark!' : 'Lost in the dark'}
            subtitle={`Score ${hud.score} · Level ${hud.level}`}
            celebrate={hud.level >= 8}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
