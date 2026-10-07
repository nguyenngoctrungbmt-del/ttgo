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
import { Hearts, ICONS, PowerBar, drawSym, easeInOut, phasePill, rr, shuffle } from '../matrix/memkit'
import { CUP_LEVELS, cupCount, genBalls, genFakes, genSwaps, parseMoves, swapDur, type CupSig } from './levels'

const meta = getGame('cups')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Sub = 'intro' | 'show' | 'drop' | 'shuffle' | 'pick' | 'reveal'
type HostMood = 'idle' | 'wink' | 'focus' | 'shock' | 'laugh'
/** 0 empty, 1 real ball, 2 fake ball. */
type Content = 0 | 1 | 2

type Cup = {
  slot: number
  x: number
  z: number
  lift: number
  liftWant: number
  content: Content
  opened: boolean
  wob: number
}

type Move = { kind: 'swap'; pairs: [number, number][]; dur: number; from: number[] } | { kind: 'lift'; cup: number; dur: number } | { kind: 'pause'; dur: number }

type World = {
  level: number
  boss: boolean
  title: string
  /** Slow-mo + X-ray used this level (star rating). */
  used: number
  clears: number
  cups: Cup[]
  balls: number
  fakes: number
  moves: Move[]
  mi: number
  mt: number
  sub: Sub
  subT: number
  memo: number
  found: number
  mistakes: number
  hearts: number
  maxHearts: number
  shields: number
  slows: number
  xrays: number
  slowOn: boolean
  xrayT: number
  streak: number
  score: number
  coinsBonus: number
  host: { mood: HostMood; moodT: number; look: number; blink: number }
  hands: { x: number; y: number }[]
  lastMilestone: number
  stats: { score: number; level: number; balls: number; perfect: number; streak: number; bonus: number }
}

function freshWorld(): World {
  return {
    level: 0,
    boss: false,
    title: '',
    used: 0,
    clears: 0,
    cups: [],
    balls: 1,
    fakes: 0,
    moves: [],
    mi: 0,
    mt: 0,
    sub: 'intro',
    subT: 0,
    memo: 1.5,
    found: 0,
    mistakes: 0,
    hearts: 3,
    maxHearts: 3,
    shields: 0,
    slows: 1,
    xrays: 1,
    slowOn: false,
    xrayT: 0,
    streak: 0,
    score: 0,
    coinsBonus: 0,
    host: { mood: 'idle', moodT: 0, look: 0, blink: 2 },
    hands: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    lastMilestone: 0,
    stats: { score: 0, level: 0, balls: 0, perfect: 0, streak: 0, bonus: 0 },
  }
}

function makeCups(n: number, contents: Content[]): Cup[] {
  return Array.from({ length: n }, (_, i) => ({ slot: i, x: 0, z: 0, lift: 1, liftWant: 1, content: contents[i] ?? 0, opened: false, wob: 0 }))
}

export default function CupsGame() {
  const run = useActionRun('cups')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const demo = useRef({ cups: makeCups(3, [0, 1, 0]), moves: [] as Move[], mi: 0, mt: 0, t: 0 })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hearts: 3, max: 3, shields: 0, streak: 0, slows: 0, xrays: 0, sub: 'intro' as Sub, slowOn: false, label: '' })
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
    const label = w.title ? (w.boss ? `Boss · ${w.title}` : w.title) : w.boss ? 'Boss round' : `${w.cups.length} cups${w.balls > 1 ? ` · ${w.balls} balls` : ''}`
    setHud({ score: w.score, level: w.level, hearts: w.hearts, max: w.maxHearts, shields: w.shields, streak: w.streak, slows: w.slows, xrays: w.xrays, sub: w.sub, slowOn: w.slowOn, label })
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: performance.now(), text, sub })
  }

  function geo(n: number) {
    const { w: W, h: H } = size.current
    const tableY = H * 0.71
    const spacing = Math.min(100, (W - 20) / n)
    const cupW = Math.min(76, spacing * 0.8)
    const cupH = cupW * 1.08
    const left = W / 2 - (spacing * n) / 2
    return { W, H, tableY, spacing, cupW, cupH, left, slotX: (s: number) => left + spacing * (s + 0.5) }
  }

  function setHost(m: HostMood, t = 1) {
    const w = world.current
    w.host.mood = m
    w.host.moodT = t
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const L = Math.max(1, Math.floor(level))
    const w = freshWorld()
    w.maxHearts = 3 + run.level('heart')
    w.hearts = w.maxHearts
    // Starting deep in the map: hand over the power-ups a run would have earned on the way.
    const head = Math.min(3, Math.floor((L - 1) / 10))
    w.slows = 1 + run.level('kit') + head
    w.xrays = 1 + run.level('kit') + head
    w.lastMilestone = L - 1
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    startLevel(L)
  }

  /** Turns a signature level's slot-based script into moves over cup indices. */
  function scriptedMoves(sig: CupSig, n: number, dur: number): Move[] {
    const slots = Array.from({ length: n }, (_, i) => i)
    const cupAt = (sl: number) => slots.indexOf(sl)
    return parseMoves(sig.moves).map((st): Move => {
      if ('hop' in st) return { kind: 'lift', cup: cupAt(st.hop), dur: 0.55 }
      const pairs = st.pairs.map(([a, b]) => [cupAt(a), cupAt(b)] as [number, number])
      for (const [p, q] of pairs) {
        const t = slots[p]
        slots[p] = slots[q]
        slots[q] = t
      }
      return { kind: 'swap', pairs, dur: dur * (pairs.length > 1 ? 1.15 : 1), from: [] }
    })
  }

  /** Builds a shuffle sequence over cup indices. */
  function buildMoves(cups: Cup[], L: number, count: number, dur: number, lifts: number, doubles: boolean): Move[] {
    const n = cups.length
    const slots = cups.map((c) => c.slot)
    const cupAt = (s: number) => slots.indexOf(s)
    const moves: Move[] = []
    let lastA = -1
    for (let i = 0; i < count; i++) {
      let a = Math.floor(Math.random() * n)
      let b: number
      if (L < 4 || Math.random() < 0.45) b = a + (a === n - 1 ? -1 : a === 0 ? 1 : Math.random() < 0.5 ? -1 : 1)
      else {
        b = Math.floor(Math.random() * (n - 1))
        if (b >= a) b += 1
      }
      if (a === lastA && Math.random() < 0.5) [a, b] = [b, a]
      lastA = a
      const pairs: [number, number][] = [[cupAt(a), cupAt(b)]]
      if (doubles && n >= 4 && Math.random() < 0.4) {
        const free = Array.from({ length: n }, (_, s) => s).filter((s) => s !== a && s !== b)
        shuffle(free)
        pairs.push([cupAt(free[0]), cupAt(free[1])])
      }
      for (const [p, q] of pairs) {
        const t = slots[p]
        slots[p] = slots[q]
        slots[q] = t
      }
      moves.push({ kind: 'swap', pairs, dur: dur * rand(0.9, 1.15) * (pairs.length > 1 ? 1.15 : 1), from: [] })
      if (lifts > 0 && i > 1 && i < count - 1 && Math.random() < lifts / (count - 2)) {
        moves.push({ kind: 'lift', cup: Math.floor(Math.random() * n), dur: 0.55 })
        lifts -= 1
      }
    }
    return moves
  }

  function startLevel(L: number) {
    const w = world.current
    const isNew = L > w.level
    w.level = L
    w.stats.level = Math.max(w.stats.level, L)
    const sig = CUP_LEVELS[L]
    w.boss = sig ? !!sig.boss : L % 5 === 0
    w.title = sig ? sig.title : ''
    const n = sig ? sig.cups.length : cupCount(L)
    const slow = Math.pow(0.93, run.level('eye'))
    let count = 0
    if (sig) {
      const contents = [...sig.cups].map((ch): Content => (ch === 'o' ? 1 : ch === 'x' ? 2 : 0))
      w.balls = contents.filter((c) => c === 1).length
      w.fakes = contents.filter((c) => c === 2).length
      w.cups = makeCups(n, contents)
      w.moves = scriptedMoves(sig, n, (swapDur(L) * (sig.speed ?? 1)) / slow)
      count = w.moves.filter((m) => m.kind === 'swap').length
    } else {
      w.balls = genBalls(L)
      w.fakes = genFakes(L)
      const contents: Content[] = shuffle([...Array(w.balls).fill(1), ...Array(w.fakes).fill(2), ...Array(n - w.balls - w.fakes).fill(0)])
      w.cups = makeCups(n, contents)
      // Bosses add swaps; the level after a boss is a breather.
      count = genSwaps(L) + (w.boss ? 3 : L % 5 === 1 && L > 5 ? -2 : 0)
      const lifts = L >= 6 ? 1 + (L >= 14 ? 1 : 0) : 0
      w.moves = buildMoves(w.cups, L, count, swapDur(L) / slow, lifts, L >= 10)
    }
    const g = geo(n)
    w.cups.forEach((c) => (c.x = g.slotX(c.slot)))
    w.mi = 0
    w.mt = 0
    w.found = 0
    w.mistakes = 0
    w.used = 0
    w.slowOn = false
    w.xrayT = 0
    w.memo = 1.3 + w.balls * 0.4 + w.fakes * 0.3
    w.sub = 'intro'
    w.subT = 0.8
    setHost('wink', 1.5)
    const intro: Record<number, [string, string]> = {
      4: ['NEW: FAKE BALLS', 'grey balls are decoys'],
      6: ['NEW: HOPPING CUPS', 'cups may hop to fool you'],
      8: ['TWO BALLS!', 'find both gold balls'],
      10: ['DOUBLE SWAPS', 'two pairs move at once'],
      17: ['THREE BALLS!', 'the grand finale'],
    }
    const tw = intro[L]
    const what = `${n} cups · ${count} swaps`
    if (isNew && tw && (L !== 17 || w.balls === 3)) showBanner(tw[0], `${w.title ? `${w.title} · ` : ''}${tw[1]}`)
    else if (w.boss) showBanner(`BOSS · LEVEL ${L}`, `${w.title ? `${w.title} · ` : ''}${what} · 2× points`)
    else if (w.title) showBanner(w.title.toUpperCase(), `Level ${L} · ${L === 1 ? 'watch the gold ball' : what}`)
    else showBanner(`LEVEL ${L}`, what)
    if (w.boss) sfx.power()
    sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function beginPick() {
    const w = world.current
    w.sub = 'pick'
    w.subT = 0
    setHost('idle', 99)
    sfx.ready()
    pushHud()
  }

  function finishRound() {
    const w = world.current
    w.sub = 'reveal'
    w.subT = 1.3
    for (const c of w.cups) c.liftWant = 1
    const perfect = w.mistakes === 0
    // Stars: 3 for no wrong cup and no power-ups; each wrong cup, and using any Slow-mo/X-ray, costs one.
    const stars = Math.max(1, 3 - w.mistakes - (w.used > 0 ? 1 : 0))
    const starText = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`
    run.completeLevel(w.level, stars)
    w.clears += 1
    const gain = Math.round((30 + w.level * 8) * mult(w) * (w.boss ? 2 : 1))
    w.score += gain
    if (w.boss) {
      w.stats.bonus += 1
      w.coinsBonus += 4
      w.xrays += 1
    }
    if (perfect) {
      w.streak += 1
      w.stats.perfect += 1
      w.stats.streak = Math.max(w.stats.streak, w.streak)
      showBanner(w.boss ? 'BOSS DOWN!' : w.streak >= 2 ? `PERFECT ×${w.streak}` : 'PERFECT!', `${starText}  +${gain}`)
      sfx.combo()
      if (w.streak % 3 === 0) {
        w.slows += 1
        fx.text(size.current.w / 2, size.current.h * 0.3, '+1 SLOW-MO', '#fde047', 18)
        sfx.power()
      }
    } else {
      w.streak = 0
      showBanner(w.boss ? 'BOSS DOWN!' : 'ROUND CLEAR', `${starText}  +${gain}`)
      sfx.levelUp()
    }
    setHost('shock', 1.3)
    fx.slowmo(0.2, 0.5)
    haptic.success()
    w.stats.score = w.score
    if (w.level % 5 === 0 && w.level > w.lastMilestone) {
      w.lastMilestone = w.level
      void trackEvent('action_milestone', { game_id: 'cups', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  function pickCup(i: number) {
    const w = world.current
    const c = w.cups[i]
    if (!c || c.opened) return
    c.opened = true
    c.liftWant = 1
    c.wob = 1
    const g = geo(w.cups.length)
    const bx = c.x
    const by = g.tableY - g.cupW * 0.2
    sfx.whoosh()
    if (c.content === 1) {
      w.found += 1
      w.stats.balls += 1
      const pts = Math.round(25 * mult(w) * (w.boss ? 2 : 1))
      w.score += pts
      w.stats.score = w.score
      fx.burst(bx, by, { count: 22, color: ['#fde047', '#fff7ae', '#f59e0b', '#ffffff'], speed: 260, shape: 'spark', life: 0.6 })
      fx.ring(bx, by, { color: '#fde047', maxR: g.cupW * 0.9, life: 0.4, width: 4 })
      fx.text(bx, by - g.cupH * 1.3, `+${pts}`, '#fde047', 20)
      fx.stop(0.05)
      sfx.score(w.found + w.streak)
      sfx.pop()
      haptic.medium()
      setHost('shock', 0.8)
      run.update(w.stats)
      pushHud()
      if (w.found >= w.balls) finishRound()
      return
    }
    w.mistakes += 1
    if (c.content === 2) {
      fx.burst(bx, by, { count: 16, color: ['#9ca3af', '#4b5563', '#d1d5db'], speed: 150, size: 6, life: 0.7, gravity: -60, drag: 3 })
      fx.text(bx, by - g.cupH * 1.3, 'FAKE!', '#d1d5db', 18)
    } else fx.text(bx, by - g.cupH * 1.3, 'EMPTY', '#fca5a5', 18)
    fx.shake(8, 0.25)
    sfx.miss()
    haptic.error()
    setHost('laugh', 1.2)
    if (w.shields > 0) {
      w.shields -= 1
      fx.text(bx, by - g.cupH * 1.7, 'SHIELDED', '#7dd3fc', 16)
      fx.ring(bx, by, { color: '#7dd3fc', maxR: g.cupW, life: 0.4 })
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
    for (const c of w.cups) c.liftWant = 1
    setHost('laugh', 99)
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.4)
    fx.slowmo(0.8, 0.3)
    sfx.lose()
    haptic.heavy()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.level * 2 + w.stats.perfect * 1.5 + w.coinsBonus)
      run.end({ score: w.score, cleared: w.level >= 10 && w.clears > 0, stats: { ...w.stats, level: w.level }, coins }, revive)
    }, 1400)
  }

  /** Ad revive: two hearts back, a shield, and the level replays from the reveal. */
  function revive() {
    const w = world.current
    w.hearts = Math.min(w.maxHearts, 2)
    w.shields += 1
    fx.reset()
    setPhaseBoth('play')
    startLevel(w.level)
    showBanner('REVIVED!', '+2 hearts · +1 shield')
    pushHud()
  }

  function applyPower(id: string) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    if (id === 'slow' && w.slows > 0 && !w.slowOn && (w.sub === 'shuffle' || w.sub === 'drop' || w.sub === 'show')) {
      w.slows -= 1
      w.used += 1
      w.slowOn = true
      fx.flash('#38bdf8', 0.2)
      sfx.power()
      haptic.medium()
    } else if (id === 'xray' && w.xrays > 0 && w.sub === 'pick' && w.xrayT <= 0) {
      w.xrays -= 1
      w.used += 1
      w.xrayT = 1.1
      fx.flash('#a78bfa', 0.15)
      sfx.flip()
      haptic.medium()
    }
    pushHud()
  }

  function onPointerDown(e: React.PointerEvent) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.sub !== 'pick') return
    const p = localPoint(e, arenaRef.current!)
    const g = geo(w.cups.length)
    if (p.y < g.tableY - g.cupH * 2.2 || p.y > g.tableY + g.cupH * 0.6) return
    let best = -1
    let bd = g.spacing * 0.6
    w.cups.forEach((c, i) => {
      const d = Math.abs(c.x - p.x)
      if (d < bd) {
        bd = d
        best = i
      }
    })
    if (best >= 0) pickCup(best)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const w = world.current
      if (phaseRef.current !== 'play') return
      const k = Number(e.key)
      if (k >= 1 && k <= 6 && w.sub === 'pick') {
        const i = w.cups.findIndex((c) => c.slot === k - 1)
        if (i >= 0) pickCup(i)
      }
      if (e.key === 's') applyPower('slow')
      if (e.key === 'x') applyPower('xray')
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation helpers ──────────────────────────────

  /** Advances a shuffle; returns true when finished. */
  function stepMoves(cups: Cup[], moves: Move[], st: { mi: number; mt: number }, dt: number, slotX: (s: number) => number): boolean {
    if (st.mi >= moves.length) return true
    const m = moves[st.mi]
    if (st.mt === 0 && m.kind === 'swap') {
      m.from = cups.map((c) => c.x)
      sfx.move()
    }
    if (st.mt === 0 && m.kind === 'lift') cups[m.cup].liftWant = 0.55
    st.mt += dt
    const k = clamp(st.mt / m.dur, 0, 1)
    if (m.kind === 'swap') {
      const e = easeInOut(k)
      for (const [a, b] of m.pairs) {
        const ca = cups[a]
        const cb = cups[b]
        const xa = slotX(ca.slot)
        const xb = slotX(cb.slot)
        ca.x = xa + (xb - xa) * e
        cb.x = xb + (xa - xb) * e
        const arc = Math.sin(k * Math.PI)
        ca.z = -arc
        cb.z = arc
      }
    } else if (m.kind === 'lift' && k > 0.6) cups[m.cup].liftWant = 0
    if (k >= 1) {
      if (m.kind === 'swap') {
        for (const [a, b] of m.pairs) {
          const t = cups[a].slot
          cups[a].slot = cups[b].slot
          cups[b].slot = t
          cups[a].x = slotX(cups[a].slot)
          cups[b].x = slotX(cups[b].slot)
          cups[a].z = 0
          cups[b].z = 0
        }
      }
      st.mi += 1
      st.mt = 0
    }
    return st.mi >= moves.length
  }

  // ── Drawing ──────────────────────────────────────────

  function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fake: boolean, t: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.ellipse(x, y + r * 0.95, r * 1.05, r * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r)
    if (fake) {
      g.addColorStop(0, '#e5e7eb')
      g.addColorStop(0.5, '#9ca3af')
      g.addColorStop(1, '#374151')
    } else {
      g.addColorStop(0, '#fffbeb')
      g.addColorStop(0.45, '#facc15')
      g.addColorStop(1, '#b45309')
    }
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    if (fake) {
      // Cracked stone with an X so it never relies on colour alone.
      drawSym(ctx, 'cross', x, y, r * 0.45, '#4b5563', 'rgba(255,255,255,0.25)')
      ctx.strokeStyle = 'rgba(31,41,55,0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(x + r * 0.5, y - r * 0.7)
      ctx.lineTo(x + r * 0.25, y - r * 0.3)
      ctx.lineTo(x + r * 0.6, y - r * 0.05)
      ctx.stroke()
    } else {
      drawSym(ctx, 'star', x, y + r * 0.05, r * 0.5 * (1 + Math.sin(t * 5) * 0.06), '#ffffff', 'rgba(180,83,9,0.5)')
      glow(ctx, x, y, r * 2.4, '#fde047', 0.22)
    }
  }

  function drawCup(ctx: CanvasRenderingContext2D, x: number, baseY: number, w: number, h: number, scale: number, xray: boolean) {
    ctx.save()
    ctx.translate(x, baseY)
    ctx.scale(scale, scale)
    ctx.globalAlpha = xray ? 0.32 : 1
    const bw = w / 2
    const tw = w * 0.32
    const body = ctx.createLinearGradient(-bw, 0, bw, 0)
    body.addColorStop(0, '#7f1d1d')
    body.addColorStop(0.3, '#ef4444')
    body.addColorStop(0.5, '#f87171')
    body.addColorStop(1, '#7f1d1d')
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.moveTo(-bw, 0)
    ctx.lineTo(-tw, -h)
    ctx.quadraticCurveTo(0, -h - h * 0.08, tw, -h)
    ctx.lineTo(bw, 0)
    ctx.quadraticCurveTo(0, h * 0.14, -bw, 0)
    ctx.closePath()
    ctx.fill()
    // Cream bands
    ctx.fillStyle = '#fef3c7'
    ctx.globalAlpha = xray ? 0.25 : 0.9
    for (const v of [0.28, 0.62]) {
      const y0 = -h * v
      const hw0 = bw - (bw - tw) * v
      const hw1 = bw - (bw - tw) * (v + 0.09)
      ctx.beginPath()
      ctx.moveTo(-hw0, y0)
      ctx.quadraticCurveTo(0, y0 + h * 0.06, hw0, y0)
      ctx.lineTo(hw1, y0 - h * 0.09)
      ctx.quadraticCurveTo(0, y0 - h * 0.03, -hw1, y0 - h * 0.09)
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalAlpha = xray ? 0.32 : 1
    // Rim
    ctx.fillStyle = '#7f1d1d'
    ctx.beginPath()
    ctx.moveTo(-bw, 0)
    ctx.quadraticCurveTo(0, h * 0.14, bw, 0)
    ctx.lineTo(bw * 0.96, -h * 0.07)
    ctx.quadraticCurveTo(0, h * 0.06, -bw * 0.96, -h * 0.07)
    ctx.closePath()
    ctx.fill()
    // Top cap + highlight
    ctx.fillStyle = '#fca5a5'
    ctx.beginPath()
    ctx.ellipse(0, -h - h * 0.02, tw, h * 0.07, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.moveTo(-bw * 0.62, -h * 0.1)
    ctx.lineTo(-tw * 0.62, -h * 0.9)
    ctx.lineTo(-tw * 0.3, -h * 0.9)
    ctx.lineTo(-bw * 0.4, -h * 0.1)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.restore()
  }

  function drawHost(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, w: World, t: number, idle: boolean) {
    const mood = idle ? 'idle' : w.host.mood
    const bob = Math.sin(t * 2) * r * 0.03 + (mood === 'laugh' ? Math.abs(Math.sin(t * 14)) * r * 0.06 : 0)
    const look = clamp(w.host.look, -1, 1)
    ctx.save()
    ctx.translate(cx, cy + bob)
    // Body / tuxedo
    ctx.fillStyle = '#1e1b4b'
    ctx.beginPath()
    ctx.moveTo(-r * 1.3, r * 2.2)
    ctx.quadraticCurveTo(-r * 1.25, r * 0.7, -r * 0.4, r * 0.75)
    ctx.lineTo(r * 0.4, r * 0.75)
    ctx.quadraticCurveTo(r * 1.25, r * 0.7, r * 1.3, r * 2.2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.moveTo(-r * 0.35, r * 0.78)
    ctx.lineTo(0, r * 1.6)
    ctx.lineTo(r * 0.35, r * 0.78)
    ctx.closePath()
    ctx.fill()
    // Bow tie
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.moveTo(0, r * 0.88)
    ctx.lineTo(-r * 0.3, r * 0.72)
    ctx.lineTo(-r * 0.3, r * 1.04)
    ctx.closePath()
    ctx.moveTo(0, r * 0.88)
    ctx.lineTo(r * 0.3, r * 0.72)
    ctx.lineTo(r * 0.3, r * 1.04)
    ctx.closePath()
    ctx.fill()
    // Ears
    ctx.fillStyle = '#ea580c'
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(s * r * 0.35, -r * 0.6)
      ctx.lineTo(s * r * 0.95, -r * 1.3)
      ctx.lineTo(s * r * 0.95, -r * 0.25)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fed7aa'
      ctx.beginPath()
      ctx.moveTo(s * r * 0.5, -r * 0.55)
      ctx.lineTo(s * r * 0.86, -r * 1.05)
      ctx.lineTo(s * r * 0.86, -r * 0.4)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ea580c'
    }
    // Head
    const hg = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.1)
    hg.addColorStop(0, '#fb923c')
    hg.addColorStop(1, '#c2410c')
    ctx.fillStyle = hg
    ctx.beginPath()
    ctx.moveTo(-r, -r * 0.3)
    ctx.quadraticCurveTo(-r, -r * 0.95, 0, -r * 0.9)
    ctx.quadraticCurveTo(r, -r * 0.95, r, -r * 0.3)
    ctx.quadraticCurveTo(r * 0.85, r * 0.5, 0, r * 0.75)
    ctx.quadraticCurveTo(-r * 0.85, r * 0.5, -r, -r * 0.3)
    ctx.fill()
    // Muzzle
    ctx.fillStyle = '#fff7ed'
    ctx.beginPath()
    ctx.moveTo(-r * 0.7, r * 0.05)
    ctx.quadraticCurveTo(0, -r * 0.15, r * 0.7, r * 0.05)
    ctx.quadraticCurveTo(r * 0.4, r * 0.7, 0, r * 0.74)
    ctx.quadraticCurveTo(-r * 0.4, r * 0.7, -r * 0.7, r * 0.05)
    ctx.fill()
    // Eyes
    const blink = w.host.blink < 0
    for (const s of [-1, 1]) {
      const ex = s * r * 0.4
      const ey = -r * 0.25
      if (mood === 'laugh' || (mood === 'wink' && s === 1) || blink) {
        ctx.strokeStyle = '#1c1917'
        ctx.lineWidth = r * 0.09
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.arc(ex, ey + r * 0.06, r * 0.13, Math.PI * 1.1, Math.PI * 1.9)
        ctx.stroke()
      } else {
        const er = mood === 'shock' ? r * 0.2 : r * 0.16
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.ellipse(ex, ey, er, er * 1.15, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#1c1917'
        ctx.beginPath()
        ctx.arc(ex + look * er * 0.45, ey + er * 0.1, er * 0.55, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(ex + look * er * 0.45 - er * 0.2, ey - er * 0.15, er * 0.18, 0, Math.PI * 2)
        ctx.fill()
      }
      // Brows
      ctx.strokeStyle = '#7c2d12'
      ctx.lineWidth = r * 0.07
      ctx.lineCap = 'round'
      ctx.beginPath()
      const lift = mood === 'shock' ? -r * 0.12 : mood === 'focus' ? r * 0.04 : 0
      ctx.moveTo(ex - s * r * 0.15, ey - r * 0.27 + lift + (mood === 'focus' ? r * 0.05 : 0))
      ctx.lineTo(ex + s * r * 0.15, ey - r * 0.3 + lift)
      ctx.stroke()
    }
    // Nose
    ctx.fillStyle = '#1c1917'
    ctx.beginPath()
    ctx.ellipse(0, r * 0.18, r * 0.13, r * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
    // Moustache
    ctx.fillStyle = '#44403c'
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(0, r * 0.3)
      ctx.quadraticCurveTo(s * r * 0.3, r * 0.2, s * r * 0.55, r * 0.22 - Math.sin(t * 3) * r * 0.03)
      ctx.quadraticCurveTo(s * r * 0.3, r * 0.4, 0, r * 0.36)
      ctx.fill()
    }
    // Mouth
    ctx.strokeStyle = '#7c2d12'
    ctx.lineWidth = r * 0.06
    ctx.beginPath()
    if (mood === 'shock') {
      ctx.fillStyle = '#7c2d12'
      ctx.ellipse(0, r * 0.52, r * 0.1, r * 0.13, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (mood === 'laugh') {
      ctx.fillStyle = '#7c2d12'
      ctx.moveTo(-r * 0.25, r * 0.44)
      ctx.quadraticCurveTo(0, r * 0.75, r * 0.25, r * 0.44)
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.moveTo(-r * 0.18, r * 0.47)
      ctx.quadraticCurveTo(r * 0.05, r * 0.6, r * 0.24, r * 0.42)
      ctx.stroke()
    }
    // Top hat
    ctx.save()
    ctx.translate(0, -r * 0.82)
    ctx.rotate(-0.12 + Math.sin(t * 1.5) * 0.03)
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.ellipse(0, 0, r * 0.85, r * 0.16, 0, 0, Math.PI * 2)
    ctx.fill()
    rr(ctx, -r * 0.52, -r * 0.95, r * 1.04, r * 0.95, r * 0.08)
    ctx.fill()
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(-r * 0.52, -r * 0.3, r * 1.04, r * 0.18)
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(-r * 0.42, -r * 0.9, r * 0.14, r * 0.55)
    ctx.restore()
    ctx.restore()
  }

  function drawHand(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.ellipse(x + 2, y + r * 0.9, r * 0.9, r * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f8fafc'
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.ellipse(x - r * 0.5 + i * r * 0.5, y + r * 0.75 + Math.sin(t * 8 + i) * 1.2, r * 0.22, r * 0.38, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(x - r * 0.8, y - r * 1.1, r * 1.6, r * 0.4)
  }

  function drawScene(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, tableY: number, bonus: boolean) {
    // Tent stripes
    const bg = ctx.createLinearGradient(0, 0, 0, tableY)
    bg.addColorStop(0, bonus ? '#713f12' : '#4c0519')
    bg.addColorStop(1, bonus ? '#422006' : '#1e1b4b')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    const sw = W / 9
    for (let i = 0; i < 10; i++) {
      if (i % 2) continue
      ctx.fillStyle = bonus ? 'rgba(253,224,71,0.1)' : 'rgba(254,243,199,0.08)'
      ctx.beginPath()
      ctx.moveTo(i * sw - sw * 0.2, 0)
      ctx.lineTo(i * sw + sw * 0.8, 0)
      ctx.quadraticCurveTo(i * sw + sw * 0.9, tableY * 0.5, i * sw + sw, tableY)
      ctx.lineTo(i * sw, tableY)
      ctx.quadraticCurveTo(i * sw - sw * 0.1, tableY * 0.5, i * sw - sw * 0.2, 0)
      ctx.fill()
    }
    // String lights
    for (let row = 0; row < 2; row++) {
      const y0 = 78 + row * 46
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let x = 0; x <= W; x += 8) {
        const y = y0 + Math.sin((x / W) * Math.PI) * 26 - row * 6
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      const cols = ['#fde047', '#f472b6', '#60a5fa', '#4ade80']
      for (let i = 0; i < 10; i++) {
        const x = ((i + 0.5 + row * 0.5) / 10) * W
        const y = y0 + Math.sin((x / W) * Math.PI) * 26 - row * 6 + 5
        const on = Math.sin(t * 3 + i * 1.7 + row) > -0.3
        ctx.fillStyle = cols[(i + row) % 4]
        ctx.globalAlpha = on ? 1 : 0.35
        ctx.beginPath()
        ctx.arc(x, y, 3.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        if (on) glow(ctx, x, y, 14, cols[(i + row) % 4], 0.3)
      }
    }
    // Spotlight cone
    ctx.fillStyle = bonus ? 'rgba(253,224,71,0.12)' : 'rgba(254,243,199,0.07)'
    ctx.beginPath()
    ctx.moveTo(W * 0.42, 0)
    ctx.lineTo(W * 0.58, 0)
    ctx.lineTo(W * 0.98, tableY + 20)
    ctx.lineTo(W * 0.02, tableY + 20)
    ctx.closePath()
    ctx.fill()
  }

  function drawTable(ctx: CanvasRenderingContext2D, W: number, H: number, tableY: number, t: number) {
    const top = tableY - 34
    // Felt top
    const felt = ctx.createLinearGradient(0, top, 0, tableY + 30)
    felt.addColorStop(0, '#166534')
    felt.addColorStop(1, '#14532d')
    ctx.fillStyle = felt
    ctx.beginPath()
    ctx.moveTo(-10, tableY + 30)
    ctx.lineTo(18, top)
    ctx.lineTo(W - 18, top)
    ctx.lineTo(W + 10, tableY + 30)
    ctx.closePath()
    ctx.fill()
    glow(ctx, W / 2, tableY, W * 0.5, '#bbf7d0', 0.15)
    // Front cloth
    const cloth = ctx.createLinearGradient(0, tableY + 30, 0, H)
    cloth.addColorStop(0, '#b91c1c')
    cloth.addColorStop(1, '#450a0a')
    ctx.fillStyle = cloth
    ctx.fillRect(0, tableY + 30, W, H - tableY - 30)
    // Gold trim + fringe
    ctx.fillStyle = '#fbbf24'
    ctx.fillRect(0, tableY + 28, W, 6)
    ctx.fillStyle = '#f59e0b'
    for (let x = 6; x < W; x += 14) {
      const sway = Math.sin(t * 2 + x * 0.1) * 1.5
      ctx.beginPath()
      ctx.moveTo(x - 4, tableY + 34)
      ctx.lineTo(x + 4, tableY + 34)
      ctx.lineTo(x + sway, tableY + 46)
      ctx.closePath()
      ctx.fill()
    }
    // Cloth folds
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 2
    for (let x = W / 8; x < W; x += W / 4) {
      ctx.beginPath()
      ctx.moveTo(x, tableY + 50)
      ctx.quadraticCurveTo(x + 6, (tableY + H) / 2, x - 4, H)
      ctx.stroke()
    }
    // Gold star emblem on the cloth
    const ey = tableY + 34 + Math.min(44, (H - tableY - 30) * 0.24)
    const er = Math.min(26, (H - tableY) * 0.14)
    ctx.fillStyle = '#7f1d1d'
    ctx.beginPath()
    ctx.arc(W / 2, ey + 2, er + 4, 0, Math.PI * 2)
    ctx.fill()
    const eg = ctx.createRadialGradient(W / 2 - er * 0.3, ey - er * 0.3, 1, W / 2, ey, er)
    eg.addColorStop(0, '#fef3c7')
    eg.addColorStop(1, '#d97706')
    ctx.fillStyle = eg
    ctx.beginPath()
    ctx.arc(W / 2, ey, er, 0, Math.PI * 2)
    ctx.fill()
    drawSym(ctx, 'star', W / 2, ey + 1, er * 0.62, '#b91c1c', 'rgba(0,0,0,0.2)')
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.moveTo(W / 2 + s * (er + 6), ey - 5)
      ctx.lineTo(W / 2 + s * (er + 40), ey - 9 + Math.sin(t * 2) * 1.5)
      ctx.lineTo(W / 2 + s * (er + 34), ey)
      ctx.lineTo(W / 2 + s * (er + 40), ey + 9 - Math.sin(t * 2) * 1.5)
      ctx.lineTo(W / 2 + s * (er + 6), ey + 5)
      ctx.closePath()
      ctx.fill()
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const w = world.current
    const idle = ph === 'idle'
    const cups = idle ? demo.current.cups : w.cups
    const g = geo(cups.length)

    // ── Update ──
    if (idle) {
      const d = demo.current
      if (d.mi >= d.moves.length) {
        d.t -= raw
        for (const c of d.cups) c.liftWant = d.t > 0.4 && d.t < 1.4 ? 1 : 0
        if (d.t <= 0) {
          d.moves = buildMoves(d.cups, 3, 6, 0.5, 0, false)
          for (const c of d.cups) c.liftWant = 0
          d.mi = 0
          d.mt = 0
          d.t = 1.8
        }
      } else if (cups.every((c) => c.lift < 0.05)) stepMoves(d.cups, d.moves, d, raw, g.slotX)
      for (const c of d.cups) if (d.mi < d.moves.length && c.lift > 0.05) c.x = g.slotX(c.slot)
    } else if (ph === 'play') {
      const speed = w.slowOn ? 0.5 : 1
      if (w.sub === 'intro') {
        w.subT -= dt
        for (const c of w.cups) c.liftWant = 1
        if (w.subT <= 0) {
          w.sub = 'show'
          w.subT = 0
        }
      } else if (w.sub === 'show') {
        w.subT += dt
        if (w.subT >= w.memo) {
          w.sub = 'drop'
          w.subT = 0
          for (const c of w.cups) c.liftWant = 0
          sfx.whoosh()
        }
      } else if (w.sub === 'drop') {
        w.subT += dt
        if (w.cups.every((c) => c.lift < 0.03)) {
          sfx.thud()
          fx.shake(3, 0.12)
          haptic.light()
          w.sub = 'shuffle'
          w.subT = 0.35
          setHost('focus', 99)
        }
      } else if (w.sub === 'shuffle') {
        if (w.subT > 0) w.subT -= dt
        else if (stepMoves(w.cups, w.moves, w, dt * speed, g.slotX)) {
          if (w.cups.every((c) => c.lift < 0.03)) beginPick()
        }
      } else if (w.sub === 'reveal') {
        w.subT -= dt
        if (w.subT <= 0) startLevel(w.level + 1)
      }
      if (w.xrayT > 0) w.xrayT = Math.max(0, w.xrayT - raw)
    }
    for (const c of cups) {
      c.lift = approach(c.lift, c.liftWant, 16, raw)
      if (Math.abs(c.lift - c.liftWant) < 0.01) c.lift = c.liftWant
      c.wob = Math.max(0, c.wob - raw * 2)
    }
    // Host gaze & hands follow the active swap.
    const host = w.host
    host.moodT -= raw
    if (host.moodT <= 0 && ph === 'play') host.mood = w.sub === 'shuffle' ? 'focus' : 'idle'
    host.blink -= raw
    if (host.blink < -0.12) host.blink = rand(1.5, 4)
    const moves = idle ? demo.current.moves : w.moves
    const mi = idle ? demo.current.mi : w.mi
    const active = (idle || w.sub === 'shuffle') && mi < moves.length ? moves[mi] : null
    const handR = g.cupW * 0.2
    const restY = g.tableY - 34 - clamp(W * 0.135, 38, 58) * 0.1
    const hr = clamp(W * 0.135, 38, 58)
    const targets = [
      { x: W / 2 - hr * 1.45, y: restY },
      { x: W / 2 + hr * 1.45, y: restY },
    ]
    if (active && active.kind === 'swap') {
      const [a, b] = active.pairs[0]
      const ca = cups[a]
      const cb = cups[b]
      if (ca && cb) {
        const left = ca.x < cb.x ? ca : cb
        const right = ca.x < cb.x ? cb : ca
        targets[0] = { x: left.x, y: g.tableY - g.cupH * 1.15 - (left.z < 0 ? g.cupH * 0.15 : 0) }
        targets[1] = { x: right.x, y: g.tableY - g.cupH * 1.15 - (right.z < 0 ? g.cupH * 0.15 : 0) }
        host.look = ((ca.x + cb.x) / 2 - W / 2) / (W / 2)
      }
    } else if (!idle && w.sub === 'pick') host.look = Math.sin(t * 0.8) * 0.6
    w.hands.forEach((h, i) => {
      if (h.x === 0 && h.y === 0) {
        h.x = targets[i].x
        h.y = targets[i].y
      }
      h.x = approach(h.x, targets[i].x, 22, raw)
      h.y = approach(h.y, targets[i].y, 22, raw)
    })

    // ── Draw ──
    drawScene(ctx, W, H, t, g.tableY, !idle && w.boss)
    fx.applyShake(ctx)
    const headR = clamp(W * 0.135, 38, 58)
    drawHost(ctx, W / 2, g.tableY - 34 - headR * 2.05, headR, w, t, idle)
    drawTable(ctx, W, H, g.tableY, t)

    const ballR = g.cupW * 0.22
    const xray = !idle && w.xrayT > 0
    // Balls stay on the felt; drawn before cups so cups cover them.
    const sorted = cups.map((_, i) => i).sort((a, b) => cups[a].z - cups[b].z)
    for (const i of sorted) {
      const c = cups[i]
      const depth = c.z
      const scale = depth < 0 ? 1 - -depth * 0.12 : 1 + depth * 0.07
      const baseY = g.tableY + (depth < 0 ? depth * g.cupH * 0.22 : depth * g.cupH * 0.12)
      // Shadow on the felt
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(c.x, baseY + 3, (g.cupW / 2) * scale * (1 - c.lift * 0.25), g.cupW * 0.1 * scale, 0, 0, Math.PI * 2)
      ctx.fill()
      if (c.content && (c.lift > 0.05 || xray)) drawBall(ctx, c.x, baseY - ballR, ballR * scale, c.content === 2, t)
      const lifted = baseY - c.lift * g.cupH * 0.62 + Math.sin(c.wob * 20) * c.wob * 3
      drawCup(ctx, c.x, lifted, g.cupW, g.cupH, scale, xray && c.lift < 0.5)
    }
    // Slot number tags for keyboard players
    if (!idle && w.sub === 'pick') {
      ctx.font = `800 12px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      for (let s = 0; s < cups.length; s++) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        ctx.beginPath()
        ctx.arc(g.slotX(s), g.tableY + 18, 9, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.fillText(String(s + 1), g.slotX(s), g.tableY + 18.5)
      }
    }
    for (const h of w.hands) drawHand(ctx, h.x, h.y, handR, t)

    if (ph === 'play' || ph === 'dying') {
      const py = 98
      if (w.sub === 'show') phasePill(ctx, W / 2, py, w.balls > 1 ? `WATCH ${w.balls} BALLS` : 'WATCH THE BALL', 1 - w.subT / w.memo, '#fde047')
      else if (w.sub === 'shuffle' || w.sub === 'drop') phasePill(ctx, W / 2, py, w.slowOn ? 'SLOW-MO SHUFFLE' : 'SHUFFLING…', (w.moves.length - w.mi) / Math.max(1, w.moves.length), w.slowOn ? '#38bdf8' : '#f472b6')
      else if (w.sub === 'pick') phasePill(ctx, W / 2, py, xray ? 'X-RAY!' : w.balls - w.found > 1 ? `FIND ${w.balls - w.found} BALLS` : 'WHERE IS IT?', null, xray ? '#a78bfa' : '#4ade80', Math.sin(t * 6) * 0.3 + 0.3)
      else if (w.sub === 'intro') phasePill(ctx, W / 2, py, 'GET READY', null, '#94a3b8')
    }
    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__mem = { world, hit: pickCup, jump: (L: number) => start(L) }

  const shuffling = hud.sub === 'shuffle' || hud.sub === 'drop' || hud.sub === 'show'
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
                { id: 'slow', label: 'Slow', icon: ICONS.slow, count: hud.slows, disabled: !shuffling || hud.slowOn, active: hud.slowOn },
                { id: 'xray', label: 'X-ray', icon: ICONS.peek, count: hud.xrays, disabled: hud.sub !== 'pick' },
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
              game="cups"
              icon={meta.icon}
              title={meta.title}
              hint="Watch the gold ball, follow the cups as they shuffle, then tap the right one."
              onPlay={(lv) => start(lv)}
            />
          )}
          <ActionResult
            run={run}
            title={hud.level >= 10 ? 'Eagle eyes!' : 'The house wins'}
            subtitle={`Score ${hud.score} · Level ${hud.level}`}
            celebrate={hud.level >= 10}
            onPlayAgain={() => start()}
          />
        </div>
      </div>
    </GameShell>
  )
}
