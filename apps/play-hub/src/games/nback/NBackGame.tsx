import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, glow, rand } from '../../shared/action/fx'
import { useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'
import { SIGNATURE, parseSeq, type NSig } from './levels'
import { Hearts, ICONS, PowerBar, drawSym, easeOutBack, phasePill, rr, type Sym } from '../matrix/memkit'
import './nback.css'

const meta = getGame('nback')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Sub = 'intro' | 'stream' | 'result'
type Mode = 'shape' | 'pos' | 'dual'
type Stim = { shape: number; pos: number }
type Mood = 'idle' | 'happy' | 'sad' | 'think'

const SHAPES: { sym: Sym; color: string }[] = [
  { sym: 'circle', color: '#ef4444' },
  { sym: 'square', color: '#3b82f6' },
  { sym: 'triangle', color: '#f59e0b' },
  { sym: 'diamond', color: '#22c55e' },
  { sym: 'star', color: '#facc15' },
  { sym: 'cross', color: '#ec4899' },
  { sym: 'hex', color: '#8b5cf6' },
  { sym: 'heart', color: '#f43f5e' },
]

const TABLE: Record<number, [number, Mode, number]> = {
  1: [1, 'shape', 2.5],
  2: [1, 'pos', 2.4],
  3: [1, 'shape', 2.0],
  4: [2, 'shape', 2.7],
  6: [2, 'pos', 2.6],
  7: [2, 'shape', 2.2],
  8: [1, 'dual', 2.7],
  9: [2, 'pos', 2.1],
  11: [3, 'shape', 2.7],
  12: [2, 'dual', 2.7],
  13: [3, 'pos', 2.6],
  14: [3, 'shape', 2.25],
}

function levelCfg(L: number, calm: number) {
  const sig = SIGNATURE[L]
  if (sig) {
    const n = sig.n
    const trials = sig.trials ?? (L <= 3 ? 12 : 13 + n * 2)
    return { n, mode: sig.mode, interval: sig.interval * Math.pow(1.07, calm), trials, bonus: false, sig }
  }
  const bonus = L % 5 === 0
  let n: number
  let mode: Mode
  let interval: number
  if (bonus) {
    n = L >= 15 ? 2 : 1
    mode = L % 10 === 0 ? 'pos' : 'shape'
    interval = Math.max(1.3, 1.9 - L * 0.02)
  } else if (TABLE[L]) [n, mode, interval] = TABLE[L]
  else {
    const k = L - 16
    const modes: Mode[] = ['shape', 'pos', 'dual']
    mode = modes[((k % 3) + 3) % 3]
    n = clamp(3 + Math.floor(k / 6), 2, mode === 'dual' ? 3 : 5)
    interval = Math.max(1.5, 2.6 - (((k % 6) + 6) % 6) * 0.15)
  }
  interval *= Math.pow(1.07, calm)
  const trials = bonus ? 18 : L <= 3 ? 12 : 13 + n * 2
  return { n, mode, interval, trials, bonus, sig: null as NSig | null }
}

type World = {
  level: number
  sig: NSig | null
  /** Hand-written stream for this level (signature levels), else null. */
  script: Stim[] | null
  /** Peek or Slow used on this level (costs the third star). */
  helped: boolean
  n: number
  mode: Mode
  bonus: boolean
  interval: number
  trials: number
  items: Stim[]
  shown: number
  trialT: number
  match: [boolean, boolean]
  resp: [boolean, boolean]
  flash: { kind: 'hit' | 'fa' | 'miss' | 'none'; t: number }
  hint: number
  peekIdx: number
  slowLeft: number
  sub: Sub
  subT: number
  hits: number
  misses: number
  fas: number
  crs: number
  combo: number
  hearts: number
  maxHearts: number
  peeks: number
  slows: number
  score: number
  lastAcc: number
  seenKeys: Record<string, number>
  mood: Mood
  moodT: number
  blink: number
  lastMilestone: number
  stats: { score: number; level: number; hits: number; perfect: number; nback: number; combo: number }
}

function freshWorld(): World {
  return {
    level: 0,
    sig: null,
    script: null,
    helped: false,
    n: 1,
    mode: 'shape',
    bonus: false,
    interval: 2.5,
    trials: 16,
    items: [],
    shown: 0,
    trialT: 0,
    match: [false, false],
    resp: [false, false],
    flash: { kind: 'none', t: 0 },
    hint: 1,
    peekIdx: -1,
    slowLeft: 0,
    sub: 'intro',
    subT: 0,
    hits: 0,
    misses: 0,
    fas: 0,
    crs: 0,
    combo: 0,
    hearts: 3,
    maxHearts: 3,
    peeks: 1,
    slows: 1,
    score: 0,
    lastAcc: 1,
    seenKeys: {},
    mood: 'idle',
    moodT: 0,
    blink: 2,
    lastMilestone: 0,
    stats: { score: 0, level: 0, hits: 0, perfect: 0, nback: 0, combo: 0 },
  }
}

function other(v: number, count: number) {
  return (v + 1 + Math.floor(Math.random() * (count - 1))) % count
}

function nextStim(items: Stim[], n: number, mode: Mode, sig: NSig | null = null): Stim {
  const prev = items.length >= n ? items[items.length - n] : null
  const kinds = Math.min(SHAPES.length, sig?.shapes ?? SHAPES.length)
  let shape = Math.floor(Math.random() * kinds)
  let pos = Math.floor(Math.random() * 9)
  if (prev) {
    const p = sig?.matchP ?? (mode === 'dual' ? 0.28 : 0.33)
    if (mode !== 'pos') shape = Math.random() < p ? prev.shape : other(prev.shape, kinds)
    if (mode !== 'shape') pos = Math.random() < p ? prev.pos : other(prev.pos, 9)
  }
  return { shape, pos }
}

const RULE: Record<Mode, string> = { shape: 'same shape', pos: 'same square', dual: 'shape and square' }

export default function NBackGame() {
  const run = useActionRun('nback')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const demo = useRef({ items: [] as Stim[], t: 0 })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hearts: 3, max: 3, combo: 0, peeks: 0, slows: 0, mode: 'shape' as Mode, n: 1, stream: false, slowOn: false })
  const [down, setDown] = useState<[boolean, boolean]>([false, false])
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.level, hearts: w.hearts, max: w.maxHearts, combo: w.combo, peeks: w.peeks, slows: w.slows, mode: w.mode, n: w.n, stream: w.sub === 'stream', slowOn: w.slowLeft > 0 })
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: performance.now(), text, sub })
  }

  function setMood(m: Mood, t = 0.8) {
    world.current.mood = m
    world.current.moodT = t
  }

  function geo() {
    const { w: W, h: H } = size.current
    const card = Math.min(W * 0.52, H * 0.29, 240)
    const stripY = 124
    const cs = Math.min(46, (W - 40) / 4)
    return { W, H, cx: W / 2, cy: Math.max(stripY + cs + 34 + card / 2, H * 0.47), card, stripY }
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.maxHearts = 3 + run.level('heart')
    w.hearts = w.maxHearts
    w.peeks = 1 + run.level('kit')
    w.slows = 1 + run.level('kit')
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    startLevel(Math.max(1, level))
  }

  function startLevel(L: number) {
    const w = world.current
    w.level = L
    w.stats.level = Math.max(w.stats.level, L)
    const c = levelCfg(L, run.level('calm'))
    const isNewN = c.n > w.n || (c.mode !== w.mode && L > 1)
    w.n = c.n
    w.mode = c.mode
    w.bonus = c.bonus
    w.sig = c.sig
    w.script = c.sig ? parseSeq(c.sig) : null
    w.helped = false
    w.interval = c.interval
    w.trials = c.trials
    w.items = []
    w.trialT = 0
    w.match = [false, false]
    w.resp = [false, false]
    w.hits = 0
    w.misses = 0
    w.fas = 0
    w.crs = 0
    w.peekIdx = -1
    // History hint fades the more you play this rule, returns if you struggle.
    const key = `${c.n}${c.mode}`
    const seen = w.seenKeys[key] ?? 0
    w.hint = seen === 0 ? 1 : seen === 1 ? 0.5 : 0
    if (w.lastAcc < 0.75) w.hint = Math.max(w.hint, 0.6)
    if (c.bonus) w.hint = Math.max(w.hint, 0.35)
    w.sub = 'intro'
    w.subT = 2.0
    const what = c.mode === 'shape' ? 'shape' : c.mode === 'pos' ? 'square' : 'shape or square'
    if (c.sig?.boss) showBanner(`BOSS · LEVEL ${L}`, `${c.sig.name.replace('Boss · ', '')} · ${c.sig.sub}`)
    else if (c.sig) showBanner(c.sig.name.toUpperCase(), `${c.n}-back · ${c.sig.sub}`)
    else if (c.bonus) showBanner('SPEED ROUND', `${c.n}-back · no hearts lost`)
    else showBanner(`${c.n}-BACK`, isNewN || L === 1 ? `tap when the ${what} matches ${c.n} back` : `level ${L} · ${RULE[c.mode]}`)
    setMood('think', 2)
    sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function beginStream() {
    const w = world.current
    w.sub = 'stream'
    w.items = [w.script ? w.script[0] : nextStim([], w.n, w.mode, w.sig)]
    w.shown = 1
    w.trialT = 0
    w.match = [false, false]
    w.resp = [false, false]
    sfx.tick()
    pushHud()
  }

  /** Index of the trial being shown (0-based over all items). */
  function curIdx(w: World) {
    return w.shown - 1
  }

  function computeMatch(w: World): [boolean, boolean] {
    if (curIdx(w) < w.n) return [false, false]
    const a = w.items[w.items.length - 1]
    const b = w.items[w.items.length - 1 - w.n]
    return [w.mode !== 'pos' && a.shape === b.shape, w.mode !== 'shape' && a.pos === b.pos]
  }

  function loseHeart(text: string) {
    const w = world.current
    const g = geo()
    fx.text(g.cx, g.cy - g.card * 0.62, text, '#fca5a5', 20)
    fx.shake(8, 0.25)
    sfx.miss()
    haptic.error()
    setMood('sad', 1)
    w.combo = 0
    if (w.bonus) {
      fx.text(g.cx, g.cy - g.card * 0.62 - 24, 'SAFE', '#fde047', 15)
      pushHud()
      return
    }
    w.hearts -= 1
    fx.flash('#ef4444', 0.25)
    fx.stop(0.06)
    sfx.hurt()
    pushHud()
    if (w.hearts <= 0) die()
  }

  function respond(dim: 0 | 1) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.sub !== 'stream') return
    // Single-stream modes map every press to their one dimension.
    const d: 0 | 1 = w.mode === 'pos' ? 1 : w.mode === 'shape' ? 0 : dim
    if (w.resp[d]) return
    w.resp[d] = true
    setDown((p) => {
      const n: [boolean, boolean] = [...p]
      n[d] = true
      return n
    })
    window.setTimeout(() => setDown([false, false]), 140)
    const g = geo()
    if (w.match[d]) {
      w.hits += 1
      w.combo += 1
      w.stats.hits += 1
      w.stats.combo = Math.max(w.stats.combo, w.combo)
      const pts = Math.round(10 * w.n * (1 + Math.min(w.combo, 10) * 0.1) * (w.bonus ? 2 : 1))
      w.score += pts
      w.stats.score = w.score
      w.flash = { kind: 'hit', t: 1 }
      fx.burst(g.cx, g.cy, { count: 20, color: ['#4ade80', '#bbf7d0', '#fde047', '#ffffff'], speed: 260, shape: 'spark' })
      fx.ring(g.cx, g.cy, { color: '#4ade80', maxR: g.card * 0.75, life: 0.35, width: 4 })
      fx.text(g.cx, g.cy - g.card * 0.62, w.combo >= 3 ? `+${pts} ×${w.combo}` : `+${pts}`, '#bbf7d0', 20)
      sfx.score(w.combo)
      haptic.light()
      setMood('happy', 0.8)
      if (w.combo > 0 && w.combo % 5 === 0) sfx.combo()
      run.update(w.stats)
      pushHud()
    } else {
      w.fas += 1
      w.flash = { kind: 'fa', t: 1 }
      loseHeart('NOT A MATCH')
    }
  }

  function resolveTrial() {
    const w = world.current
    const i = curIdx(w)
    for (const d of [0, 1] as const) {
      if (w.match[d] && !w.resp[d]) {
        w.misses += 1
        w.flash = { kind: 'miss', t: 1 }
        loseHeart('MISSED MATCH')
        if (phaseRef.current !== 'play') return
      } else if (!w.match[d] && !w.resp[d] && i >= w.n && (d === 0 ? w.mode !== 'pos' : w.mode !== 'shape')) {
        w.crs += 1
        w.score += 2 * w.n
      }
    }
    w.stats.score = w.score
    if (i + 1 >= w.trials + w.n) {
      finishLevel()
      return
    }
    w.items.push(w.script?.[w.shown] ?? nextStim(w.items, w.n, w.mode, w.sig))
    w.shown += 1
    if (w.items.length > 12) w.items.shift()
    w.trialT = 0
    w.match = computeMatch(w)
    w.resp = [false, false]
    if (w.slowLeft > 0) w.slowLeft -= 1
    sfx.tick()
    pushHud()
  }

  function finishLevel() {
    const w = world.current
    w.sub = 'result'
    w.subT = 1.9
    const total = w.hits + w.misses + w.fas
    const acc = total === 0 ? 1 : w.hits / total
    w.lastAcc = acc
    const key = `${w.n}${w.mode}`
    w.seenKeys[key] = (w.seenKeys[key] ?? 0) + 1
    const perfect = w.misses === 0 && w.fas === 0
    if (perfect) w.stats.perfect += 1
    w.stats.nback = Math.max(w.stats.nback, w.n)
    const bonus = Math.round(acc * 60 * w.n + (perfect ? 50 * w.n : 0))
    w.score += bonus
    w.stats.score = w.score
    // Stars: finish = 1, accuracy ≥ 75% = 2, accuracy ≥ 95% without Peek/Slow = 3.
    const stars = acc >= 0.95 && !w.helped ? 3 : acc >= 0.75 ? 2 : 1
    run.completeLevel(w.level, stars)
    showBanner(w.sig?.boss ? 'BOSS BEATEN!' : perfect ? 'PERFECT!' : `ACCURACY ${Math.round(acc * 100)}%`, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · +${bonus}`)
    if (perfect) {
      w.peeks += 1
      sfx.win()
    } else sfx.levelUp()
    setMood('happy', 1.8)
    fx.slowmo(0.25, 0.5)
    haptic.success()
    if (w.level % 5 === 0 && w.level > w.lastMilestone) {
      w.lastMilestone = w.level
      void trackEvent('action_milestone', { game_id: 'nback', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    setMood('sad', 99)
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.4)
    fx.slowmo(0.8, 0.3)
    sfx.lose()
    haptic.heavy()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.level * 2.5 + w.stats.perfect * 2 + w.stats.hits * 0.2)
      run.end({ score: w.score, cleared: w.level >= 8, stats: { ...w.stats, level: w.level }, coins }, revive)
    }, 1300)
  }

  /** Ad revive: two hearts back and the level restarts from its intro. */
  function revive() {
    const w = world.current
    w.hearts = Math.min(w.maxHearts, 2)
    w.combo = 0
    fx.reset()
    setPhaseBoth('play')
    startLevel(w.level)
    showBanner('REVIVED!', '+2 hearts · level restarts')
    pushHud()
  }

  function applyPower(id: string) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.sub !== 'stream') return
    if (id === 'peek' && w.peeks > 0 && w.peekIdx !== curIdx(w)) {
      w.peeks -= 1
      w.helped = true
      w.peekIdx = curIdx(w)
      sfx.flip()
      haptic.medium()
    } else if (id === 'slow' && w.slows > 0 && w.slowLeft <= 0) {
      w.slows -= 1
      w.helped = true
      w.slowLeft = 6
      fx.flash('#38bdf8', 0.2)
      sfx.power()
      haptic.medium()
    }
    pushHud()
  }

  useEffect(() => {
    function kd(e: KeyboardEvent) {
      if (e.repeat) return
      if (e.key === ' ' || e.key === 'm' || e.key === 'a' || e.key === 'ArrowLeft') {
        e.preventDefault()
        respond(0)
      } else if (e.key === 'l' || e.key === 'k' || e.key === 'ArrowRight') {
        e.preventDefault()
        respond(1)
      } else if (e.key === 'p') applyPower('peek')
      else if (e.key === 's') applyPower('slow')
    }
    window.addEventListener('keydown', kd)
    return () => window.removeEventListener('keydown', kd)
  }, [])

  // ── Drawing ──────────────────────────────────────────

  function drawStim(ctx: CanvasRenderingContext2D, s: Stim, mode: Mode, x: number, y: number, size: number, alpha: number, t: number) {
    ctx.save()
    ctx.globalAlpha = alpha
    const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(1, '#ede9fe')
    ctx.fillStyle = g
    rr(ctx, x - size / 2, y - size / 2, size, size, size * 0.16)
    ctx.fill()
    if (mode === 'shape') {
      const sh = SHAPES[s.shape]
      drawSym(ctx, sh.sym, x, y, size * 0.3, sh.color, 'rgba(30,27,75,0.45)')
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.beginPath()
      ctx.arc(x - size * 0.09, y - size * 0.1, size * 0.05, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const pad = size * 0.1
      const gap = size * 0.04
      const cs = (size - pad * 2 - gap * 2) / 3
      for (let i = 0; i < 9; i++) {
        const cx = x - size / 2 + pad + (i % 3) * (cs + gap)
        const cy = y - size / 2 + pad + Math.floor(i / 3) * (cs + gap)
        const on = i === s.pos
        ctx.fillStyle = on ? '#06b6d4' : '#ddd6fe'
        rr(ctx, cx, cy, cs, cs, cs * 0.2)
        ctx.fill()
        if (on) {
          if (mode === 'dual') {
            ctx.fillStyle = '#ffffff'
            rr(ctx, cx + cs * 0.08, cy + cs * 0.08, cs * 0.84, cs * 0.84, cs * 0.18)
            ctx.fill()
            const sh = SHAPES[s.shape]
            drawSym(ctx, sh.sym, cx + cs / 2, cy + cs / 2, cs * 0.3, sh.color, 'rgba(30,27,75,0.45)')
          } else {
            drawSym(ctx, 'star', cx + cs / 2, cy + cs / 2, cs * 0.28 * (1 + Math.sin(t * 6) * 0.05), '#ffffff', 'rgba(8,51,68,0.4)')
          }
        }
      }
    }
    ctx.restore()
  }

  function drawBrain(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, mood: Mood, blink: boolean, t: number) {
    const bob = Math.sin(t * 2.4) * r * 0.06 + (mood === 'happy' ? -Math.abs(Math.sin(t * 12)) * r * 0.12 : 0)
    ctx.save()
    ctx.translate(x, y + bob)
    const squash = mood === 'happy' ? 1 + Math.sin(t * 12) * 0.04 : 1
    ctx.scale(squash, 2 - squash)
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.2)
    g.addColorStop(0, '#fbcfe8')
    g.addColorStop(1, '#ec4899')
    ctx.fillStyle = g
    ctx.beginPath()
    const bumps = 7
    for (let i = 0; i <= bumps * 2; i++) {
      const a = Math.PI + (i / (bumps * 2)) * Math.PI
      const rr2 = r * (i % 2 ? 1.02 : 0.9)
      const px = Math.cos(a) * rr2
      const py = Math.sin(a) * rr2 * 0.85
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.quadraticCurveTo(r * 1.0, r * 0.55, r * 0.4, r * 0.62)
    ctx.quadraticCurveTo(0, r * 0.75, -r * 0.4, r * 0.62)
    ctx.quadraticCurveTo(-r * 1.0, r * 0.55, -r * 0.9, 0)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#be185d'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.strokeStyle = 'rgba(190,24,93,0.55)'
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.8)
    ctx.quadraticCurveTo(r * 0.12, -r * 0.4, 0, -r * 0.1)
    ctx.moveTo(-r * 0.55, -r * 0.5)
    ctx.quadraticCurveTo(-r * 0.3, -r * 0.35, -r * 0.45, -r * 0.15)
    ctx.moveTo(r * 0.55, -r * 0.5)
    ctx.quadraticCurveTo(r * 0.3, -r * 0.35, r * 0.45, -r * 0.15)
    ctx.stroke()
    // Face
    for (const s of [-1, 1]) {
      const ex = s * r * 0.3
      const ey = r * 0.12
      if (mood === 'happy' || blink) {
        ctx.strokeStyle = '#1e1b4b'
        ctx.lineWidth = r * 0.1
        ctx.lineCap = 'round'
        ctx.beginPath()
        if (mood === 'happy') ctx.arc(ex, ey + r * 0.05, r * 0.11, Math.PI * 1.1, Math.PI * 1.9)
        else {
          ctx.moveTo(ex - r * 0.1, ey)
          ctx.lineTo(ex + r * 0.1, ey)
        }
        ctx.stroke()
      } else {
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(ex, ey, r * 0.15, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#1e1b4b'
        const look = mood === 'think' ? -r * 0.05 : 0
        ctx.beginPath()
        ctx.arc(ex + look, ey + look, r * 0.08, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.strokeStyle = '#831843'
    ctx.lineWidth = r * 0.08
    ctx.beginPath()
    if (mood === 'sad') ctx.arc(0, r * 0.52, r * 0.14, Math.PI * 1.15, Math.PI * 1.85)
    else if (mood === 'happy') ctx.arc(0, r * 0.3, r * 0.16, 0.2, Math.PI - 0.2)
    else {
      ctx.moveTo(-r * 0.1, r * 0.4)
      ctx.lineTo(r * 0.1, r * 0.4)
    }
    ctx.stroke()
    ctx.restore()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const w = world.current
    const idle = ph === 'idle'
    const g = geo()

    // ── Update ──
    if (idle) {
      const d = demo.current
      d.t -= raw
      if (d.t <= 0) {
        d.t = 1.4
        d.items.push(nextStim(d.items, 2, 'shape'))
        if (d.items.length > 6) d.items.shift()
      }
    } else if (ph === 'play') {
      if (w.sub === 'intro') {
        w.subT -= dt
        if (w.subT <= 0) beginStream()
      } else if (w.sub === 'stream') {
        const iv = w.interval * (w.slowLeft > 0 ? 1.4 : 1)
        w.trialT += dt
        if (w.trialT >= iv) resolveTrial()
      } else if (w.sub === 'result') {
        w.subT -= dt
        if (w.subT <= 0) startLevel(w.level + 1)
      }
    }
    w.flash.t = Math.max(0, w.flash.t - raw * 2.5)
    w.moodT -= raw
    if (w.moodT <= 0) w.mood = 'idle'
    w.blink -= raw
    if (w.blink < -0.12) w.blink = rand(1.5, 4)

    // ── Draw ──
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, w.bonus && !idle ? '#713f12' : '#4a044e')
    bg.addColorStop(1, '#1e1b4b')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // Neon perspective floor
    const hy = H * 0.72
    ctx.strokeStyle = 'rgba(244,114,182,0.22)'
    ctx.lineWidth = 1.2
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath()
      ctx.moveTo(W / 2 + i * 14, hy)
      ctx.lineTo(W / 2 + i * 90, H)
      ctx.stroke()
    }
    for (let i = 0; i < 7; i++) {
      const k = ((i + (t * 0.6) % 1) / 7) ** 2
      const y = hy + (H - hy) * k
      ctx.globalAlpha = k
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(W, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    glow(ctx, g.cx, g.cy, g.card * 1.3, w.bonus && !idle ? '#f59e0b' : '#d946ef', 0.28)
    fx.applyShake(ctx)

    const items = idle ? demo.current.items : w.items
    const mode: Mode = idle ? 'shape' : w.mode
    const n = idle ? 2 : w.n
    const streaming = idle || w.sub === 'stream'
    const iv = w.interval * (w.slowLeft > 0 ? 1.4 : 1)
    const cur = items.length ? items[items.length - 1] : null

    // History strip: previous N items, with the N-back one ringed.
    const hintA = idle ? 1 : w.peekIdx === curIdx(w) && w.sub === 'stream' ? 1 : w.hint
    if (cur && streaming && items.length > 1) {
      const cs = Math.min(46, (W - 40) / (n + 2))
      const count = Math.min(n, items.length - 1)
      const totalW = (n + 1) * (cs + 10)
      const x0 = W / 2 - totalW / 2 + cs / 2
      for (let k = 0; k < n; k++) {
        const back = n - k
        const it = items[items.length - 1 - back]
        const x = x0 + k * (cs + 10)
        const y = g.stripY + cs / 2
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        rr(ctx, x - cs / 2, y - cs / 2, cs, cs, cs * 0.18)
        ctx.stroke()
        ctx.setLineDash([])
        if (it && k >= n - count && hintA > 0.02) {
          drawStim(ctx, it, mode, x, y, cs, hintA * (back === n ? 1 : 0.6), t)
          if (back === n) {
            ctx.globalAlpha = hintA
            ctx.strokeStyle = '#fde047'
            ctx.lineWidth = 3
            rr(ctx, x - cs / 2 - 3, y - cs / 2 - 3, cs + 6, cs + 6, cs * 0.22)
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        }
      }
      // Label + arrow to the current card
      const lx = x0
      ctx.globalAlpha = Math.max(0.5, hintA)
      ctx.font = `900 11px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fde047'
      ctx.fillText(`${n} BACK`, lx, g.stripY + cs + 10)
      const ax = x0 + n * (cs + 10)
      ctx.strokeStyle = 'rgba(253,224,71,0.8)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(lx, g.stripY - 4)
      ctx.quadraticCurveTo((lx + ax) / 2, g.stripY - 22, ax, g.stripY - 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(253,224,71,0.8)'
      ctx.beginPath()
      ctx.moveTo(ax - 5, g.stripY - 8)
      ctx.lineTo(ax + 3, g.stripY - 1)
      ctx.lineTo(ax - 7, g.stripY + 1)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText('NOW', ax, g.stripY + cs / 2)
      ctx.globalAlpha = 1
    }

    // Current stimulus card
    if (cur && (streaming || w.sub === 'result')) {
      const tt = idle ? 1.4 - demo.current.t : w.trialT
      const ivv = idle ? 1.4 : iv
      const shown = tt < ivv * 0.74
      const pop = easeOutBack(clamp(tt / 0.22, 0, 1))
      const fade = shown ? 1 : Math.max(0, 1 - (tt - ivv * 0.74) / 0.12)
      const shake = w.flash.kind === 'fa' || w.flash.kind === 'miss' ? Math.sin(w.flash.t * 40) * w.flash.t * 8 : 0
      // Card back/frame always visible so the rhythm is clear
      ctx.fillStyle = 'rgba(15,10,40,0.55)'
      rr(ctx, g.cx - g.card / 2 - 8, g.cy - g.card / 2 - 8, g.card + 16, g.card + 16, g.card * 0.18)
      ctx.fill()
      const fc = w.flash.t > 0 && !idle ? (w.flash.kind === 'hit' ? '#4ade80' : '#ef4444') : 'rgba(255,255,255,0.18)'
      ctx.strokeStyle = fc
      ctx.lineWidth = 3
      ctx.stroke()
      if (fade > 0 && w.sub !== 'result') {
        ctx.save()
        ctx.translate(g.cx + shake, g.cy)
        ctx.scale(0.6 + pop * 0.4, 0.6 + pop * 0.4)
        drawStim(ctx, cur, mode, 0, 0, g.card, fade, t)
        ctx.restore()
      }
      // Timer ring under the card
      if (!idle && w.sub === 'stream') {
        const k = clamp(tt / ivv, 0, 1)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(g.cx - g.card / 2, g.cy + g.card / 2 + 18)
        ctx.lineTo(g.cx + g.card / 2, g.cy + g.card / 2 + 18)
        ctx.stroke()
        ctx.strokeStyle = w.slowLeft > 0 ? '#38bdf8' : '#f0abfc'
        ctx.beginPath()
        ctx.moveTo(g.cx - g.card / 2, g.cy + g.card / 2 + 18)
        ctx.lineTo(g.cx - g.card / 2 + g.card * (1 - k), g.cy + g.card / 2 + 18)
        ctx.stroke()
        // Trial dots
        const done = Math.max(0, curIdx(w) - w.n + 1)
        const tot = w.trials
        const dw = Math.min(10, (g.card - 10) / tot)
        for (let i = 0; i < tot; i++) {
          ctx.fillStyle = i < done ? '#f0abfc' : 'rgba(255,255,255,0.18)'
          ctx.beginPath()
          ctx.arc(g.cx - (tot - 1) * dw * 0.5 + i * dw, g.cy + g.card / 2 + 32, Math.min(3, dw * 0.35), 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    drawBrain(ctx, g.cx + g.card / 2 + 4, g.cy - g.card / 2 - 6, Math.min(26, W * 0.07), idle ? 'idle' : w.mood, w.blink < 0, t)

    if (ph === 'play' || ph === 'dying') {
      const py = 74
      if (w.sub === 'intro') phasePill(ctx, W / 2, py, `${w.n}-BACK · ${RULE[w.mode].toUpperCase()}`, 1 - w.subT / 2, '#f0abfc')
      else if (w.sub === 'stream' && curIdx(w) < w.n) phasePill(ctx, W / 2, py, `REMEMBER… ${w.n - curIdx(w)}`, null, '#a5b4fc')
    }
    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__mem = { world, respond, jump: startLevel }

  const canPress = hud.stream
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena">
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Level {hud.level} · {hud.n}-back
                </div>
              </div>
              <div className="action-hud__right">
                <Hearts hp={hud.hearts} max={hud.max} />
                {hud.combo >= 2 ? (
                  <span className="mem-mult" key={hud.combo}>
                    combo ×{hud.combo}
                  </span>
                ) : null}
              </div>
            </div>
          )}
          {phase === 'play' && (
            <>
              <div className="nback-powers">
                <PowerBar
                  onUse={applyPower}
                  powers={[
                    { id: 'peek', label: 'Peek', icon: ICONS.peek, count: hud.peeks, disabled: !hud.stream },
                    { id: 'slow', label: 'Slow', icon: ICONS.slow, count: hud.slows, disabled: !hud.stream || hud.slowOn, active: hud.slowOn },
                  ]}
                />
              </div>
              {hud.mode === 'dual' ? (
                <div className="nback-duo" onPointerDown={(e) => e.stopPropagation()}>
                  <button type="button" className={`nback-btn nback-btn--shape${down[0] ? ' is-down' : ''}`} disabled={!canPress} onPointerDown={() => respond(0)}>
                    SHAPE
                    <small>same shape</small>
                  </button>
                  <button type="button" className={`nback-btn nback-btn--spot${down[1] ? ' is-down' : ''}`} disabled={!canPress} onPointerDown={() => respond(1)}>
                    SPOT
                    <small>same square</small>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`mem-match${down[0] || down[1] ? ' is-down' : ''}`}
                  disabled={!canPress}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    respond(0)
                  }}
                >
                  MATCH
                  <small>{hud.n} back · {RULE[hud.mode]}</small>
                </button>
              )}
            </>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)} style={{ whiteSpace: 'normal', width: 'min(92%, 340px)', textAlign: 'center', lineHeight: 1.05 }}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="nback"
              icon={meta.icon}
              title={meta.title}
              hint="Tap MATCH when the shape is the same as the one N steps back. Start at 1-back and climb."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.level >= 8 ? 'Mind of steel!' : 'Memory overload'}
            subtitle={`Score ${hud.score} · Level ${hud.level} · ${hud.n}-back`}
            celebrate={hud.level >= 8}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
