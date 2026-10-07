import { useRef, useState } from 'react'
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
import '../../shared/action/action.css'
import { Hearts, ICONS, PowerBar, checkMark, drawSym, easeInOut, phasePill, rr, shuffle } from './memkit'
import { SIG_LEVELS, genOrdered, genTiles, gridSize, parseLevel } from './levels'

const meta = getGame('matrix')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Sub = 'intro' | 'memo' | 'rotate' | 'recall' | 'reveal'
type Mood = 'idle' | 'focus' | 'happy' | 'sad' | 'wow'

type Tile = {
  /** Flip progress 0 (back) .. 1 (face). */
  f: number
  delay: number
  /** 1-based order index when this tile is a target, else 0. */
  target: number
  decoy: boolean
  /** 0 hidden, 1 found, 2 wrong, 3 missed (revealed at the end). */
  state: 0 | 1 | 2 | 3
  pop: number
  shake: number
}

type World = {
  level: number
  n: number
  order: boolean
  decoys: boolean
  rotate: number
  boss: boolean
  title: string
  /** Peeks + hints used this level (star rating). */
  used: number
  clears: number
  tiles: Tile[]
  targets: number[]
  next: number
  sub: Sub
  subT: number
  memoDur: number
  step: number
  rotA: number
  mistakes: number
  hearts: number
  maxHearts: number
  shields: number
  peeks: number
  hints: number
  peekT: number
  streak: number
  score: number
  coinsBonus: number
  mood: Mood
  moodT: number
  look: { x: number; y: number }
  blink: number
  boardPulse: number
  lastMilestone: number
  stats: { score: number; level: number; tiles: number; perfect: number; streak: number; ordered: number }
}

function freshWorld(): World {
  return {
    level: 0,
    n: 4,
    order: false,
    decoys: false,
    rotate: 0,
    boss: false,
    title: '',
    used: 0,
    clears: 0,
    tiles: [],
    targets: [],
    next: 0,
    sub: 'intro',
    subT: 0,
    memoDur: 2,
    step: 0.7,
    rotA: 0,
    mistakes: 0,
    hearts: 3,
    maxHearts: 3,
    shields: 0,
    peeks: 1,
    hints: 1,
    peekT: 0,
    streak: 0,
    score: 0,
    coinsBonus: 0,
    mood: 'idle',
    moodT: 0,
    look: { x: 0, y: 0 },
    blink: 2,
    boardPulse: 0,
    lastMilestone: 0,
    stats: { score: 0, level: 0, tiles: 0, perfect: 0, streak: 0, ordered: 0 },
  }
}

function blankTiles(n: number): Tile[] {
  return Array.from({ length: n * n }, () => ({ f: 0, delay: 0, target: 0, decoy: false, state: 0 as const, pop: 0, shake: 0 }))
}

const TWIST_INFO: Record<string, [string, string]> = {
  order: ['NEW: IN ORDER', 'tap the tiles in the order they flash'],
  decoy: ['NEW: DECOYS', 'ignore the red X tiles'],
  rotate: ['NEW: ROTATION', 'the grid turns after you memorise'],
}

export default function MatrixGame() {
  const run = useActionRun('matrix')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const demo = useRef({ tiles: blankTiles(4), t: 0 })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hearts: 3, max: 3, shields: 0, streak: 0, peeks: 0, hints: 0, recall: false, label: '' })
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
    const label = w.title ? (w.boss ? `Boss · ${w.title}` : w.title) : w.boss ? 'Boss' : w.order ? 'In order' : w.rotate ? 'Rotation' : w.decoys ? 'Decoys' : `${w.n}×${w.n} grid`
    setHud({ score: w.score, level: w.level, hearts: w.hearts, max: w.maxHearts, shields: w.shields, streak: w.streak, peeks: w.peeks, hints: w.hints, recall: w.sub === 'recall', label })
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: performance.now(), text, sub })
  }

  function geo(n: number) {
    const { w: W, h: H } = size.current
    const top = 96
    const bottom = 92
    const s = Math.max(180, Math.min(W - 30, H - top - bottom, 460))
    const bx = (W - s) / 2
    const by = top + Math.max(0, (H - top - bottom - s) / 2)
    const pad = s * 0.045
    const gap = (s * 0.1) / n
    const cell = (s - pad * 2 - gap * (n - 1)) / n
    return { bx, by, s, pad, gap, cell }
  }

  function cellCenter(i: number, n: number) {
    const g = geo(n)
    const r = Math.floor(i / n)
    const c = i % n
    return { x: g.bx + g.pad + c * (g.cell + g.gap) + g.cell / 2, y: g.by + g.pad + r * (g.cell + g.gap) + g.cell / 2, cell: g.cell }
  }

  function setMood(m: Mood, t = 0.9) {
    const w = world.current
    w.mood = m
    w.moodT = t
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const L = Math.max(1, Math.floor(level))
    const w = freshWorld()
    w.maxHearts = 3 + run.level('heart')
    w.hearts = w.maxHearts
    // Starting deep in the map: hand over the power-ups a run would have earned on the way.
    const head = Math.min(3, Math.floor((L - 1) / 10))
    w.peeks = 1 + run.level('kit') + head
    w.hints = 1 + run.level('kit') + head
    w.lastMilestone = L - 1
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    startLevel(L)
  }

  function startLevel(L: number) {
    const w = world.current
    const isNew = L > w.level
    w.level = L
    w.stats.level = Math.max(w.stats.level, L)
    w.n = gridSize(L)
    const sig = SIG_LEVELS[L]
    w.boss = sig ? !!sig.boss : L % 5 === 0
    w.title = sig ? sig.title : ''
    let order = false
    let decoys = false
    let rotate = 0
    let k = 0
    let cells: number[] = []
    let decoyCells: number[] = []
    if (sig) {
      const p = parseLevel(sig)
      order = p.order
      decoys = p.decoys.length > 0
      rotate = sig.rotate ?? 0
      k = p.targets.length
      cells = p.targets
      decoyCells = p.decoys
    } else {
      // Twists unlock over time; bosses mix two of them and add tiles, the level after a boss is a breather.
      const pool: string[] = ['plain']
      if (L >= 4) pool.push('order')
      if (L >= 7) pool.push('decoy')
      if (L >= 11) pool.push('rotate')
      const pick = w.boss ? (Math.random() < 0.3 ? 'order' : 'rotate') : pool[Math.floor(Math.random() * pool.length)]
      order = pick === 'order'
      decoys = pick === 'decoy' || (w.boss && pick === 'rotate')
      rotate = pick === 'rotate' ? (Math.random() < 0.5 ? 1 : -1) : 0
      if (L >= 16 && rotate && Math.random() < 0.5) decoys = true
      if (L >= 18 && rotate && Math.random() < 0.35) rotate *= 2
      k = genTiles(L)
      if (order) k = Math.min(w.boss ? 14 : 99, genOrdered(L) + (w.boss ? 2 : 0))
      else if (w.boss) k = Math.min(Math.floor(w.n * w.n * 0.5), k + 2)
      else if (L % 5 === 1 && L > 5) k = Math.max(3, k - 1)
      const all = shuffle(Array.from({ length: w.n * w.n }, (_, i) => i))
      cells = all.slice(0, k)
      if (decoys) decoyCells = all.slice(k, k + Math.min(1 + Math.floor((L - 5) / 5), 4))
    }
    w.order = order
    w.decoys = decoys
    w.rotate = rotate
    w.targets = cells.slice()
    w.tiles = blankTiles(w.n)
    w.targets.forEach((c, i) => (w.tiles[c].target = i + 1))
    for (const c of decoyCells) w.tiles[c].decoy = true
    w.tiles.forEach((t, i) => (t.delay = (Math.floor(i / w.n) + (i % w.n)) * 0.03))
    w.next = 0
    w.mistakes = 0
    w.used = 0
    w.peekT = 0
    w.rotA = 0
    const speed = Math.max(0.55, 1 - (L - 1) * 0.018)
    w.memoDur = Math.max(1.2, (1.4 + k * 0.25) * speed) + run.level('focus') * 0.3 + (decoys ? 0.4 : 0)
    w.step = clamp(0.8 - L * 0.012, 0.45, 0.8) + run.level('focus') * 0.06
    if (order) w.memoDur = w.step * k + 0.3
    w.sub = 'intro'
    w.subT = 0.9
    w.boardPulse = 1
    setMood('idle')
    const twistAt: Record<number, string> = { 4: 'order', 7: 'decoy', 11: 'rotate' }
    const twist = twistAt[L]
    const what = rotate ? (Math.abs(rotate) === 2 ? 'grid flips 180°' : `grid turns ${rotate > 0 ? 'right' : 'left'}`) : order ? 'in order' : decoys ? 'ignore the red X' : `${w.n}×${w.n} · ${k} tiles`
    if (isNew && twist) showBanner(TWIST_INFO[twist][0], `${w.title ? `${w.title} · ` : ''}${TWIST_INFO[twist][1]}`)
    else if (w.boss) showBanner(`BOSS · LEVEL ${L}`, `${w.title ? `${w.title} · ` : ''}${what} · 2× points`)
    else if (w.title) showBanner(w.title.toUpperCase(), `Level ${L} · ${L === 1 ? 'remember the lit tiles' : what}`)
    else showBanner(`LEVEL ${L}`, what)
    if (w.boss) sfx.power()
    sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function beginRecall() {
    const w = world.current
    w.sub = 'recall'
    w.subT = 0
    setMood('focus', 99)
    sfx.whoosh()
    pushHud()
  }

  function finishRound() {
    const w = world.current
    w.sub = 'reveal'
    w.subT = 1.1
    const perfect = w.mistakes === 0
    const base = 20 + w.level * 5
    const gain = Math.round(base * mult(w) * (w.boss ? 2 : 1))
    w.score += gain
    if (w.order) w.stats.ordered += 1
    // Stars: 3 for a flawless round with no power-ups; each mistake, and using any Peek/Hint, costs one.
    const stars = Math.max(1, 3 - w.mistakes - (w.used > 0 ? 1 : 0))
    const starText = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`
    run.completeLevel(w.level, stars)
    w.clears += 1
    if (perfect) {
      w.streak += 1
      w.stats.perfect += 1
      w.stats.streak = Math.max(w.stats.streak, w.streak)
      showBanner(w.boss ? 'BOSS DOWN!' : w.streak >= 2 ? `PERFECT ×${w.streak}` : 'PERFECT!', `${starText}  +${gain}`)
      sfx.combo()
      if (w.streak % 3 === 0) {
        w.peeks += 1
        const { w: W } = size.current
        fx.text(W / 2, geo(w.n).by - 8, '+1 PEEK', '#fde047', 18)
        sfx.power()
      }
    } else {
      w.streak = 0
      showBanner(w.boss ? 'BOSS DOWN!' : 'CLEAR', `${starText}  +${gain}`)
      sfx.levelUp()
    }
    if (w.boss) {
      w.hints += 1
      w.coinsBonus += 3
    }
    setMood(perfect ? 'wow' : 'happy', 1.1)
    const g = geo(w.n)
    fx.ring(g.bx + g.s / 2, g.by + g.s / 2, { color: perfect ? '#fde047' : '#67e8f9', maxR: g.s * 0.7, life: 0.5, width: 5 })
    for (let i = 0; i < w.tiles.length; i++) {
      if (w.tiles[i].state === 1) {
        const c = cellCenter(i, w.n)
        fx.burst(c.x, c.y, { count: 6, color: ['#fde047', '#ffffff', '#67e8f9'], speed: 200, shape: 'spark', life: 0.5 })
      }
    }
    fx.slowmo(0.25, 0.5)
    haptic.success()
    w.stats.score = w.score
    if (w.level % 5 === 0 && w.level > w.lastMilestone) {
      w.lastMilestone = w.level
      void trackEvent('action_milestone', { game_id: 'matrix', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  function hitTile(i: number) {
    const w = world.current
    const t = w.tiles[i]
    if (t.state !== 0) return
    const c = cellCenter(i, w.n)
    const expected = w.order ? w.targets[w.next] : -1
    const correct = t.target > 0 && (!w.order || i === expected)
    if (correct) {
      t.state = 1
      t.pop = 1
      t.delay = 0
      w.next += 1
      w.stats.tiles += 1
      const pts = Math.round(10 * mult(w) * (w.boss ? 2 : 1))
      w.score += pts
      w.stats.score = w.score
      fx.burst(c.x, c.y, { count: 12, color: ['#6ee7b7', '#ffffff', '#fde047'], speed: 180, size: 3, life: 0.45 })
      fx.ring(c.x, c.y, { color: '#6ee7b7', maxR: c.cell * 0.75, life: 0.3 })
      fx.text(c.x, c.y - c.cell * 0.4, `+${pts}`, '#fef08a', 15)
      sfx.score(w.next)
      haptic.light()
      setMood('happy', 0.5)
      run.update(w.stats)
      pushHud()
      if (w.next >= w.targets.length) finishRound()
      return
    }
    // Wrong tap.
    w.mistakes += 1
    if (t.target > 0) {
      // Right tile, wrong order: shake it but leave it in play.
      t.shake = 1
      fx.text(c.x, c.y - c.cell * 0.4, 'ORDER!', '#fca5a5', 15)
    } else {
      t.state = 2
      t.pop = 1
      t.delay = 0
    }
    fx.burst(c.x, c.y, { count: 10, color: ['#f87171', '#7f1d1d', '#fecaca'], speed: 160, shape: 'square', size: 4, gravity: 500 })
    fx.shake(7, 0.25)
    sfx.miss()
    haptic.error()
    setMood('sad', 0.9)
    if (w.shields > 0) {
      w.shields -= 1
      fx.text(c.x, c.y - c.cell * 0.6, 'SHIELDED', '#7dd3fc', 16)
      fx.ring(c.x, c.y, { color: '#7dd3fc', maxR: c.cell, life: 0.4 })
      pushHud()
      return
    }
    w.hearts -= 1
    fx.flash('#ef4444', 0.25)
    fx.stop(0.08)
    sfx.hurt()
    pushHud()
    if (w.hearts <= 0) die()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    w.sub = 'reveal'
    for (const t of w.tiles) if (t.target > 0 && t.state === 0) t.state = 3
    setMood('sad', 99)
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.4)
    fx.slowmo(0.8, 0.3)
    sfx.lose()
    haptic.heavy()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.level * 2 + w.stats.perfect * 1.5 + w.coinsBonus)
      run.end({ score: w.score, cleared: w.level >= 10 && w.clears > 0, stats: { ...w.stats, level: w.level }, coins }, revive)
    }, 1300)
  }

  /** Ad revive: two hearts back and a fresh look at the current level. */
  function revive() {
    const w = world.current
    w.hearts = Math.min(w.maxHearts, 2)
    w.shields += 1
    fx.reset()
    setPhaseBoth('play')
    startLevel(w.level)
    showBanner('REVIVED!', '+2 hearts · +1 shield')
    setMood('wow', 1)
    pushHud()
  }

  function applyPower(id: string) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.sub !== 'recall') return
    if (id === 'peek' && w.peeks > 0 && w.peekT <= 0) {
      w.peeks -= 1
      w.used += 1
      w.peekT = 1.0
      sfx.flip()
      setMood('wow', 1)
      haptic.medium()
    } else if (id === 'hint' && w.hints > 0) {
      const idx = w.order ? w.targets[w.next] : w.targets.find((c) => w.tiles[c].state === 0)
      if (idx == null) return
      w.hints -= 1
      w.used += 1
      const c = cellCenter(idx, w.n)
      fx.ring(c.x, c.y, { color: '#fde047', maxR: c.cell, life: 0.5, width: 4 })
      sfx.power()
      hitTile(idx)
    }
    pushHud()
  }

  function onPointerDown(e: React.PointerEvent) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.sub !== 'recall' || w.peekT > 0) return
    const p = localPoint(e, arenaRef.current!)
    const g = geo(w.n)
    const lx = p.x - g.bx - g.pad
    const ly = p.y - g.by - g.pad
    const c = Math.floor(lx / (g.cell + g.gap))
    const r = Math.floor(ly / (g.cell + g.gap))
    if (c < 0 || r < 0 || c >= w.n || r >= w.n) return
    // Ignore taps in the gutter between tiles.
    if (lx - c * (g.cell + g.gap) > g.cell + 2 || ly - r * (g.cell + g.gap) > g.cell + 2) return
    w.look = { x: p.x, y: p.y }
    hitTile(r * w.n + c)
  }

  // ── Drawing ──────────────────────────────────────────

  function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: Tile, kind: string, label: number, time: number) {
    const f = t.f
    const sx = Math.abs(Math.cos(f * Math.PI))
    const lift = Math.sin(f * Math.PI) * s * 0.12
    const pop = t.pop > 0 ? 1 + Math.sin(t.pop * Math.PI) * 0.12 : 1
    const shake = t.shake > 0 ? Math.sin(t.shake * 40) * t.shake * s * 0.08 : 0
    const cx = x + s / 2 + shake
    const cy = y + s / 2 - lift
    // Drop shadow grows while the tile is in the air.
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    rr(ctx, x + 2 + lift * 0.3, y + 4 + lift * 0.5, s - 4, s - 4, s * 0.2)
    ctx.fill()
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(Math.max(0.04, sx) * pop, pop * (1 + (1 - sx) * 0.06))
    const face = f >= 0.5
    let top = '#475569'
    let bot = '#1e293b'
    if (face) {
      if (kind === 'lit') [top, bot] = ['#67e8f9', '#0e7490']
      else if (kind === 'gold') [top, bot] = ['#fde68a', '#d97706']
      else if (kind === 'decoy') [top, bot] = ['#fdba74', '#c2410c']
      else if (kind === 'found') [top, bot] = ['#6ee7b7', '#047857']
      else if (kind === 'wrong') [top, bot] = ['#fca5a5', '#991b1b']
      else if (kind === 'missed') [top, bot] = ['#a5b4fc', '#4338ca']
    }
    const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2)
    g.addColorStop(0, top)
    g.addColorStop(1, bot)
    ctx.fillStyle = g
    rr(ctx, -s / 2, -s / 2, s, s, s * 0.2)
    ctx.fill()
    // Bevel: bright top lip and dark bottom edge.
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    rr(ctx, -s / 2 + s * 0.1, -s / 2 + s * 0.06, s * 0.8, s * 0.16, s * 0.08)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'
    ctx.lineWidth = 2
    rr(ctx, -s / 2 + 1, -s / 2 + 1, s - 2, s - 2, s * 0.2)
    ctx.stroke()
    const r = s * 0.22
    if (!face) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.beginPath()
      ctx.arc(0, s * 0.04, r * 0.5, 0, Math.PI * 2)
      ctx.fill()
    } else if (kind === 'lit' || kind === 'gold') {
      if (label > 0) {
        ctx.fillStyle = '#fff'
        ctx.font = `900 ${Math.round(s * 0.46)}px 'Plus Jakarta Sans', system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(label), 0, s * 0.03)
      } else {
        const tw = 1 + Math.sin(time * 6) * 0.06
        drawSym(ctx, kind === 'gold' ? 'star' : 'diamond', 0, 0, r * tw, '#ffffff', 'rgba(0,0,0,0.2)')
      }
    } else if (kind === 'decoy' || kind === 'wrong') drawSym(ctx, 'cross', 0, 0, r, '#ffffff', 'rgba(0,0,0,0.25)')
    else if (kind === 'found') checkMark(ctx, 0, 0, r * 1.1)
    else if (kind === 'missed') {
      ctx.globalAlpha = 0.9
      drawSym(ctx, 'diamond', 0, 0, r, 'rgba(255,255,255,0.85)')
      ctx.globalAlpha = 1
    }
    ctx.restore()
    if (face && (kind === 'lit' || kind === 'gold')) glow(ctx, cx, cy, s * 0.9, kind === 'gold' ? '#fde047' : '#22d3ee', 0.25)
  }

  function drawOwl(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, mood: Mood, look: { x: number; y: number }, blink: boolean, t: number) {
    const bob = Math.sin(t * 2.2) * s * 0.04 + (mood === 'happy' || mood === 'wow' ? -Math.abs(Math.sin(t * 12)) * s * 0.08 : 0)
    ctx.save()
    ctx.translate(x, y + bob)
    // Body
    const bg = ctx.createLinearGradient(0, -s, 0, s)
    bg.addColorStop(0, '#a78bfa')
    bg.addColorStop(1, '#5b21b6')
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.ellipse(0, 0, s * 0.85, s, 0, 0, Math.PI * 2)
    ctx.fill()
    // Ear tufts
    ctx.beginPath()
    ctx.moveTo(-s * 0.7, -s * 0.55)
    ctx.lineTo(-s * 0.6, -s * 1.15)
    ctx.lineTo(-s * 0.25, -s * 0.85)
    ctx.moveTo(s * 0.7, -s * 0.55)
    ctx.lineTo(s * 0.6, -s * 1.15)
    ctx.lineTo(s * 0.25, -s * 0.85)
    ctx.fill()
    // Belly
    ctx.fillStyle = '#ede9fe'
    ctx.beginPath()
    ctx.ellipse(0, s * 0.35, s * 0.5, s * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#c4b5fd'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(-s * 0.18 + i * s * 0.18, s * 0.3 + (i % 2) * s * 0.18, s * 0.08, 0.2, Math.PI - 0.2)
      ctx.stroke()
    }
    // Eyes
    const ex = s * 0.36
    const ey = -s * 0.28
    const er = s * 0.3 * (mood === 'wow' ? 1.12 : 1)
    const dx = clamp((look.x - x) / 200, -1, 1) * er * 0.35
    const dy = clamp((look.y - y) / 200, -1, 1) * er * 0.35
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(side * ex, ey, er, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#4c1d95'
      ctx.lineWidth = 2
      ctx.stroke()
      if (mood === 'happy') {
        ctx.strokeStyle = '#1e1b4b'
        ctx.lineWidth = s * 0.09
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(side * ex, ey + er * 0.25, er * 0.5, Math.PI * 1.15, Math.PI * 1.85)
        ctx.stroke()
      } else if (mood === 'sad') {
        ctx.strokeStyle = '#1e1b4b'
        ctx.lineWidth = s * 0.08
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(side * ex - er * 0.45, ey - er * 0.45)
        ctx.lineTo(side * ex + er * 0.45, ey + er * 0.45)
        ctx.moveTo(side * ex + er * 0.45, ey - er * 0.45)
        ctx.lineTo(side * ex - er * 0.45, ey + er * 0.45)
        ctx.stroke()
      } else if (blink) {
        ctx.strokeStyle = '#1e1b4b'
        ctx.lineWidth = s * 0.07
        ctx.beginPath()
        ctx.moveTo(side * ex - er * 0.6, ey)
        ctx.lineTo(side * ex + er * 0.6, ey)
        ctx.stroke()
      } else {
        ctx.fillStyle = '#1e1b4b'
        ctx.beginPath()
        ctx.arc(side * ex + dx, ey + dy, er * (mood === 'focus' ? 0.42 : 0.5), 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(side * ex + dx - er * 0.15, ey + dy - er * 0.18, er * 0.15, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // Brows when focused
    if (mood === 'focus') {
      ctx.strokeStyle = '#3b0764'
      ctx.lineWidth = s * 0.08
      ctx.lineCap = 'round'
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(side * (ex + er * 0.7), ey - er * 1.15)
        ctx.lineTo(side * (ex - er * 0.5), ey - er * 0.95)
        ctx.stroke()
      }
    }
    // Beak
    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.moveTo(-s * 0.12, -s * 0.05)
    ctx.lineTo(s * 0.12, -s * 0.05)
    ctx.lineTo(0, mood === 'wow' ? s * 0.24 : s * 0.16)
    ctx.closePath()
    ctx.fill()
    // Graduation cap
    ctx.fillStyle = '#1e1b4b'
    ctx.beginPath()
    ctx.moveTo(-s * 0.75, -s * 0.92)
    ctx.lineTo(0, -s * 1.22)
    ctx.lineTo(s * 0.75, -s * 0.92)
    ctx.lineTo(0, -s * 0.66)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, -s * 0.94)
    ctx.quadraticCurveTo(s * 0.55, -s * 0.9, s * 0.6, -s * 0.55 + Math.sin(t * 3) * s * 0.05)
    ctx.stroke()
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(s * 0.6, -s * 0.52 + Math.sin(t * 3) * s * 0.05, s * 0.07, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, bonus: boolean) {
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, bonus ? '#422006' : '#2e1065')
    bg.addColorStop(1, bonus ? '#1c1917' : '#0b0a1f')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // Drifting constellation dots (two parallax layers).
    for (let layer = 0; layer < 2; layer++) {
      const sp = layer ? 9 : 4
      ctx.fillStyle = layer ? 'rgba(196,181,253,0.5)' : 'rgba(167,139,250,0.25)'
      for (let i = 0; i < 18; i++) {
        const x = (i * 97 + layer * 51) % W
        const y = (((i * 61 + layer * 33) % H) - t * sp + H * 4) % H
        ctx.beginPath()
        ctx.arc(x, y, layer ? 1.6 : 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    glow(ctx, W / 2, H * 0.45, Math.max(W, H) * 0.55, bonus ? '#f59e0b' : '#7c3aed', 0.25)
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const w = world.current
    const idle = ph === 'idle'

    let n = w.n
    let tiles = w.tiles
    if (idle) {
      const d = demo.current
      d.t -= raw
      n = 4
      tiles = d.tiles
      if (d.t <= 0) {
        d.t = 2.2
        const lit = shuffle(Array.from({ length: 16 }, (_, i) => i)).slice(0, 5)
        d.tiles.forEach((tile, i) => {
          tile.target = lit.includes(i) ? 1 : 0
          tile.delay = ((i % 4) + Math.floor(i / 4)) * 0.05
        })
      }
    }

    // ── Update ──
    if (ph === 'play') {
      if (w.sub === 'intro') {
        w.subT -= dt
        if (w.subT <= 0) {
          w.sub = 'memo'
          w.subT = 0
          setMood('wow', 99)
          sfx.flip()
        }
      } else if (w.sub === 'memo') {
        const prevStep = Math.floor(w.subT / w.step)
        w.subT += dt
        if (w.order && Math.floor(w.subT / w.step) !== prevStep && Math.floor(w.subT / w.step) < w.targets.length) sfx.tick()
        if (w.subT >= w.memoDur) {
          if (w.rotate) {
            w.sub = 'rotate'
            w.subT = 0
            sfx.whoosh()
          } else beginRecall()
        }
      } else if (w.sub === 'rotate') {
        const allDown = w.tiles.every((tile) => tile.f < 0.02)
        if (allDown) w.subT += dt
        const dur = Math.abs(w.rotate) === 2 ? 1.1 : 0.85
        w.rotA = easeInOut(clamp(w.subT / dur, 0, 1)) * w.rotate * (Math.PI / 2)
        if (w.subT >= dur + 0.15) {
          // Bake the rotation into the tile layout.
          const N = w.n
          let tl = w.tiles
          let tg = w.targets
          const turns = (w.rotate + 4) % 4
          for (let k = 0; k < turns; k++) {
            const next = blankTiles(N)
            tl.forEach((tile, i) => {
              const r = Math.floor(i / N)
              const c = i % N
              next[c * N + (N - 1 - r)] = tile
            })
            tg = tg.map((i) => (i % N) * N + (N - 1 - Math.floor(i / N)))
            tl = next
          }
          w.tiles = tl
          w.targets = tg
          w.rotA = 0
          fx.shake(4, 0.15)
          sfx.thud()
          beginRecall()
        }
      }
      if (w.peekT > 0) w.peekT = Math.max(0, w.peekT - raw)
    }
    if (ph === 'play' && w.sub === 'reveal') {
      w.subT -= dt
      if (w.subT <= 0) startLevel(w.level + 1)
    }
    w.moodT -= raw
    if (w.moodT <= 0 && w.mood !== 'idle' && ph === 'play') w.mood = w.sub === 'recall' ? 'focus' : 'idle'
    w.blink -= raw
    if (w.blink < -0.12) w.blink = rand(1.8, 4)
    w.boardPulse = Math.max(0, w.boardPulse - raw * 2)

    // Tile flip targets.
    const memoIdx = w.order ? Math.floor(w.subT / w.step) : -1
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i]
      let want = 0
      if (idle) want = tile.target && demo.current.t > 0.7 ? 1 : 0
      else if (tile.state !== 0) want = 1
      else if (ph === 'play' && w.sub === 'memo') {
        if (w.order) want = tile.target === memoIdx + 1 && w.subT % w.step < w.step * 0.8 ? 1 : 0
        else want = tile.target > 0 || tile.decoy ? 1 : 0
      } else if (w.peekT > 0 && tile.target > 0) want = 1
      if (tile.delay > 0 && want !== Math.round(tile.f)) tile.delay -= raw
      else {
        const sp = raw / 0.2
        tile.f = want ? Math.min(1, tile.f + sp) : Math.max(0, tile.f - sp)
      }
      if (tile.pop > 0) tile.pop = Math.max(0, tile.pop - raw * 3.5)
      if (tile.shake > 0) tile.shake = Math.max(0, tile.shake - raw * 2.5)
    }

    // ── Draw ──
    drawBackground(ctx, W, H, t, !idle && w.boss)
    fx.applyShake(ctx)
    const g = geo(n)
    const bcx = g.bx + g.s / 2
    const bcy = g.by + g.s / 2
    ctx.save()
    if (w.rotA && !idle) {
      ctx.translate(bcx, bcy)
      ctx.rotate(w.rotA)
      ctx.translate(-bcx, -bcy)
    }
    // Board frame
    const ps = 1 + w.boardPulse * 0.03
    ctx.save()
    ctx.translate(bcx, bcy)
    ctx.scale(ps, ps)
    ctx.translate(-bcx, -bcy)
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    rr(ctx, g.bx + 4, g.by + 8, g.s, g.s, 22)
    ctx.fill()
    const fg = ctx.createLinearGradient(0, g.by, 0, g.by + g.s)
    fg.addColorStop(0, '#312e81')
    fg.addColorStop(1, '#1e1b4b')
    ctx.fillStyle = fg
    rr(ctx, g.bx, g.by, g.s, g.s, 22)
    ctx.fill()
    ctx.strokeStyle = !idle && w.boss ? '#fbbf24' : w.sub === 'recall' && !idle ? '#a78bfa' : '#4c1d95'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.restore()
    const showLabels = w.order && !idle
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i]
      const r = Math.floor(i / n)
      const c = i % n
      const x = g.bx + g.pad + c * (g.cell + g.gap)
      const y = g.by + g.pad + r * (g.cell + g.gap)
      let kind = 'lit'
      if (tile.state === 1) kind = 'found'
      else if (tile.state === 2) kind = 'wrong'
      else if (tile.state === 3) kind = 'missed'
      else if (tile.decoy) kind = 'decoy'
      else if (!idle && w.boss) kind = 'gold'
      const label = showLabels && (tile.state === 0 || tile.state === 3) && tile.target > 0 && (w.sub === 'memo' || w.peekT > 0 || tile.state === 3) ? tile.target : 0
      drawTile(ctx, x, y, g.cell, tile, kind, label, t)
    }
    ctx.restore()

    // Owl perched on the board's top edge.
    const owlS = clamp(g.s * 0.075, 16, 26)
    drawOwl(ctx, g.bx + g.s - owlS * 1.6, g.by - owlS * 0.75, owlS, idle ? 'idle' : w.mood, idle ? { x: W / 2, y: H / 2 } : w.look, w.blink < 0, t)

    // Phase pill under the HUD.
    if (ph === 'play' || ph === 'dying') {
      const py = g.by - 46
      if (w.sub === 'memo') phasePill(ctx, W / 2 - owlS, py, w.order ? 'WATCH THE ORDER' : 'MEMORISE', 1 - w.subT / w.memoDur, '#22d3ee')
      else if (w.sub === 'rotate') phasePill(ctx, W / 2 - owlS, py, 'ROTATING…', null, '#c084fc', Math.sin(t * 10) * 0.5 + 0.5)
      else if (w.sub === 'recall') {
        const left = w.targets.length - w.next
        phasePill(ctx, W / 2 - owlS, py, w.peekT > 0 ? 'PEEK!' : w.order ? `TAP #${w.next + 1} · ${left} left` : `YOUR TURN · ${left} left`, null, w.peekT > 0 ? '#fde047' : '#a78bfa')
      } else if (w.sub === 'intro') phasePill(ctx, W / 2 - owlS, py, 'GET READY', null, '#94a3b8')
    }

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)
  // Dev-only hook for scripted play tests.
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__mem = { world, hit: hitTile, jump: (L: number) => start(L) }

  const best = hud.level
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" ref={arenaRef} onPointerDown={onPointerDown}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Level {hud.level} · {hud.label}
                </div>
              </div>
              <div className="action-hud__right">
                <Hearts hp={hud.hearts} max={hud.max} shield={hud.shields} />
                {hud.streak >= 1 ? (
                  <span className="mem-mult" key={hud.streak}>
                    ×{(1 + Math.min(hud.streak, 8) * 0.25).toFixed(2).replace(/0$/, '')} streak
                  </span>
                ) : null}
              </div>
            </div>
          )}
          {phase === 'play' && (
            <PowerBar
              onUse={applyPower}
              powers={[
                { id: 'peek', label: 'Peek', icon: ICONS.peek, count: hud.peeks, disabled: !hud.recall },
                { id: 'hint', label: 'Hint', icon: ICONS.reveal, count: hud.hints, disabled: !hud.recall },
              ]}
            />
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner" key={banner.key} style={{ whiteSpace: 'normal', width: 'min(92%, 340px)', textAlign: 'center', lineHeight: 1.05 }} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="matrix"
              icon={meta.icon}
              title={meta.title}
              hint="Tiles light up for a moment. Remember them, then tap them back. The grid keeps growing."
              onPlay={(lv) => start(lv)}
            />
          )}
          <ActionResult
            run={run}
            title={best >= 10 ? 'Total recall!' : 'Memory full'}
            subtitle={`Score ${hud.score} · Level ${hud.level}`}
            celebrate={best >= 10}
            onPlayAgain={() => start()}
          />
        </div>
      </div>
    </GameShell>
  )
}
