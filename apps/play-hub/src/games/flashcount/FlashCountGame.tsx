import { useEffect, useRef, useState } from 'react'
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
import { KINDS, blitKind, type Kind } from './art'
import { genLevel, type Obj, type Question } from './gen'
import { SIGNATURE, type CountSig } from './levels'

const meta = getGame('flashcount')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Step = 'ready' | 'flash' | 'cover' | 'ask' | 'feedback' | 'reveal'
type Btn = { x: number; y: number; w: number; h: number; id: 'opt' | 'peek'; val: number }

/** Felt colours for the table; shifts every 5 levels. */
const THEMES = [
  { felt: '#115e59', felt2: '#042f2e', rim: '#d4a017', bg: '#1e1b4b' },
  { felt: '#6b21a8', felt2: '#2e1065', rim: '#f0abfc', bg: '#1e1033' },
  { felt: '#1e40af', felt2: '#172554', rim: '#93c5fd', bg: '#0b1530' },
  { felt: '#166534', felt2: '#052e16', rim: '#fde047', bg: '#0c1f14' },
  { felt: '#9f1239', felt2: '#4c0519', rim: '#fecdd3', bg: '#2a0a14' },
]

const TWISTS: Record<number, string> = {
  5: 'Now they move!',
  6: 'Trick: some may be missing',
  7: 'Two questions per flash',
  9: 'Sizes vary',
  10: 'New: which was MOST?',
  12: 'Crowds overlap',
  14: 'Latecomers & leavers',
  16: 'Up to three questions',
}

type World = {
  level: number
  bonus: boolean
  sig: CountSig | null
  /** Wrong answers and Peeks on this level (for stars). */
  lvlMiss: number
  helped: boolean
  theme: number
  score: number
  hearts: number
  maxHearts: number
  shields: number
  peeks: number
  streak: number
  objs: Obj[]
  qs: Question[]
  qi: number
  step: Step
  stepT: number
  stepDur: number
  flashDur: number
  curtain: number
  peekT: number
  choice: number
  lastOk: boolean
  inputLock: number
  pressT: number
  dead: boolean
  bonusWins: number
  stats: { level: number; correct: number; streak: number; most: number; bonus: number }
}

function freshWorld(): World {
  return {
    level: 0,
    bonus: false,
    sig: null,
    lvlMiss: 0,
    helped: false,
    theme: 0,
    score: 0,
    hearts: 3,
    maxHearts: 3,
    shields: 0,
    peeks: 0,
    streak: 0,
    objs: [],
    qs: [],
    qi: 0,
    step: 'ready',
    stepT: 0,
    stepDur: 1,
    flashDur: 2,
    curtain: 0,
    peekT: 0,
    choice: -1,
    lastOk: false,
    inputLock: 0,
    pressT: 0,
    dead: false,
    bonusWins: 0,
    stats: { level: 0, correct: 0, streak: 0, most: 0, bonus: 0 },
  }
}

function multOf(streak: number) {
  return 1 + Math.min(4, Math.floor(streak / 3))
}

export default function FlashCountGame() {
  const run = useActionRun('flashcount')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const size = useRef({ w: 360, h: 600 })
  const btns = useRef<Btn[]>([])
  const demo = useRef<Obj[]>([])

  // Dev-only handle for automated playtests.
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__flashcount = world

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hearts: 3, max: 3, shields: 0, mult: 1 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: Math.max(1, w.level), hearts: w.hearts, max: w.maxHearts, shields: w.shields, mult: multOf(w.streak) })
  }

  function layout() {
    const { w: W, h: H } = size.current
    const panelH = Math.min(210, Math.max(170, H * 0.33))
    const fx0 = 12
    const fy0 = 64
    const fw = W - 24
    const fh = Math.max(160, H - panelH - fy0 - 10)
    return { W, H, fx0, fy0, fw, fh, py: fy0 + fh + 10, panelH }
  }

  function objR(n: number) {
    const { fw, fh } = layout()
    return clamp(Math.sqrt((fw * fh) / Math.max(1, n)) * 0.26, 13, 30)
  }

  function setStep(s: Step, dur: number) {
    const w = world.current
    w.step = s
    w.stepT = 0
    w.stepDur = dur
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.maxHearts = 3
    w.hearts = 3
    w.peeks = run.level('peek')
    w.shields = run.level('charm')
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    // nextLevel() increments, so begin one below the chosen level.
    w.level = Math.max(0, level - 1)
    nextLevel()
  }

  function nextLevel() {
    const w = world.current
    w.level += 1
    w.stats.level = w.level
    w.theme = Math.floor((w.level - 1) / 5) % THEMES.length
    w.sig = SIGNATURE[w.level] ?? null
    // Signature bosses replace the safe bonus round.
    w.bonus = w.level % 5 === 0 && !w.sig?.boss
    startLevel()
    const twist = TWISTS[w.level]
    const sig = w.sig
    setBanner({
      key: Date.now(),
      text: sig?.boss ? `BOSS · LEVEL ${w.level}` : sig ? sig.name.toUpperCase() : w.bonus ? 'BONUS ROUND' : `LEVEL ${w.level}`,
      sub: sig?.boss ? `${sig.name.replace('Boss · ', '')} · ${sig.sub}` : sig ? `Level ${w.level} · ${sig.sub}` : w.bonus ? 'count them all — no hearts lost' : twist ?? (w.level === 1 ? 'memorise the objects' : undefined),
    })
    if (w.bonus) sfx.power()
    else sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function startLevel() {
    const w = world.current
    const g = genLevel(w.level, w.bonus, run.level('focus'), w.sig)
    w.lvlMiss = 0
    w.helped = false
    w.objs = g.objs
    w.qs = g.qs
    w.qi = 0
    w.flashDur = g.flashDur
    w.dead = false
    w.choice = -1
    setStep('ready', w.level === 1 ? 1.3 : 1.0)
  }

  function answer(val: number) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.step !== 'ask' || w.inputLock > 0) return
    const q = w.qs[w.qi]
    w.choice = val
    w.pressT = 0.18
    const ok = val === q.answer
    w.lastOk = ok
    const { W, py } = layout()
    const bx = btns.current.find((b) => b.id === 'opt' && b.val === val)
    const px = bx ? bx.x + bx.w / 2 : W / 2
    const pyy = bx ? bx.y + bx.h / 2 : py + 60
    if (ok) {
      w.streak += 1
      w.stats.correct += 1
      w.stats.streak = Math.max(w.stats.streak, w.streak)
      if (q.type === 'most') w.stats.most += 1
      const mult = multOf(w.streak)
      const pts = Math.round((40 + w.level * 10) * mult * (q.type === 'total' ? 2 : 1))
      w.score += pts
      if (w.bonus) {
        w.bonusWins += 1
        w.stats.bonus += 1
      }
      fx.burst(px, pyy, { count: 22, color: ['#fde047', '#4ade80', '#ffffff'], speed: 260, shape: 'spark', gravity: 200 })
      fx.ring(px, pyy, { color: '#4ade80', maxR: 60, life: 0.4, width: 4 })
      fx.text(px, pyy - 34, `+${pts}`, '#fde047', 22)
      if (w.streak > 0 && w.streak % 3 === 0 && mult <= 5) {
        fx.text(W / 2, pyy - 70, `x${mult} STREAK!`, '#f0abfc', 24)
        sfx.combo()
      } else sfx.score(w.streak)
      if (w.streak > 0 && w.streak % 4 === 0) {
        w.peeks += 1
        fx.text(W / 2, py - 20, '+1 PEEK', '#67e8f9', 18)
      }
      fx.stop(0.05)
      haptic.success()
    } else {
      w.streak = 0
      w.lvlMiss += 1
      fx.flash('#ef4444', 0.25)
      fx.shake(9, 0.3)
      haptic.error()
      if (w.bonus) {
        fx.text(px, pyy - 34, 'MISSED', '#fca5a5', 20)
        sfx.miss()
      } else if (w.shields > 0) {
        w.shields -= 1
        fx.text(px, pyy - 34, 'SHIELDED!', '#67e8f9', 22)
        fx.ring(px, pyy, { color: '#67e8f9', maxR: 70, life: 0.45, width: 5 })
        sfx.clang()
      } else {
        w.hearts -= 1
        fx.text(px, pyy - 34, val < 0 ? 'TIME!' : 'WRONG', '#fca5a5', 22)
        sfx.hurt()
        if (w.hearts <= 0) w.dead = true
      }
    }
    w.stats.level = w.level
    run.update(w.stats)
    pushHud()
    setStep('feedback', ok ? 0.75 : 1.1)
  }

  function doPeek() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.step !== 'ask' || w.peeks <= 0 || w.peekT > 0) return
    w.peeks -= 1
    w.helped = true
    w.peekT = 0.8
    sfx.whoosh()
    haptic.light()
    pushHud()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.4)
    fx.slowmo(0.8, 0.35)
    sfx.lose()
    haptic.heavy()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.level * 1.6 + w.stats.correct * 0.6 + w.bonusWins * 4)
      run.end({ score: w.score, cleared: w.level >= 10, stats: { ...w.stats }, coins }, revive)
    }, 1000)
  }

  /** Revive: two hearts back and a fresh memorise phase of the current level. */
  function revive() {
    const w = world.current
    w.hearts = Math.min(w.maxHearts, 2)
    w.streak = 0
    startLevel()
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'look again' })
    const { W, fy0, fh } = layout()
    fx.ring(W / 2, fy0 + fh / 2, { color: '#fde047', maxR: 120, life: 0.6, width: 5 })
    pushHud()
    setPhaseBoth('play')
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    const hit = btns.current.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h)
    if (!hit) return
    if (hit.id === 'peek') doPeek()
    else answer(hit.val)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const w = world.current
      if (phaseRef.current !== 'play') return
      if (e.key === 'p' || e.key === 'P') doPeek()
      const n = Number(e.key)
      if (w.step === 'ask' && n >= 1 && n <= 6) {
        const q = w.qs[w.qi]
        if (q && q.options[n - 1] !== undefined) answer(q.options[n - 1])
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation step ─────────────────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    w.inputLock = Math.max(0, w.inputLock - raw)
    w.pressT = Math.max(0, w.pressT - raw)
    if (phaseRef.current !== 'play') return
    if (w.peekT > 0) {
      w.peekT = Math.max(0, w.peekT - raw)
      return
    }
    w.stepT += dt
    if (w.step === 'flash') {
      for (const o of w.objs) {
        if (o.vx === 0 && o.vy === 0) continue
        o.x += o.vx * dt
        o.y += o.vy * dt
        if (o.x < 0.07 || o.x > 0.93) {
          o.vx *= -1
          o.x = clamp(o.x, 0.07, 0.93)
        }
        if (o.y < 0.09 || o.y > 0.91) {
          o.vy *= -1
          o.y = clamp(o.y, 0.09, 0.91)
        }
      }
      const left = w.flashDur - w.stepT
      if (left < 1 && Math.floor((left + dt) * 4) !== Math.floor(left * 4) && left > 0) sfx.tick()
    }
    if (w.stepT < w.stepDur) return
    switch (w.step) {
      case 'ready':
        setStep('flash', w.flashDur)
        sfx.flip()
        break
      case 'flash':
        setStep('cover', 0.4)
        sfx.whoosh()
        break
      case 'cover':
        setStep('ask', Math.max(7, 14 - w.level * 0.3))
        w.inputLock = 0.2
        break
      case 'ask':
        answer(-1)
        break
      case 'feedback':
        if (w.dead) {
          setStep('reveal', 1.6)
        } else if (w.qi < w.qs.length - 1) {
          w.qi += 1
          w.choice = -1
          setStep('ask', Math.max(7, 14 - w.level * 0.3))
          w.inputLock = 0.25
        } else {
          setStep('reveal', 1.3 + Math.min(1, w.objs.length * 0.04))
          sfx.flip()
          levelCleared()
        }
        break
      case 'reveal':
        if (w.dead) {
          die()
          return
        }
        if (w.level % 5 === 0) milestone()
        nextLevel()
        break
    }
  }

  function levelCleared() {
    const w = world.current
    // Stars: clear = 1, no wrong answer = +1, no Peek = +1.
    const stars = 1 + (w.lvlMiss === 0 ? 1 : 0) + (w.helped ? 0 : 1)
    run.completeLevel(w.level, stars)
    setBanner({ key: Date.now(), text: w.sig?.boss ? 'BOSS BEATEN!' : w.lvlMiss === 0 ? 'PERFECT!' : 'CLEARED!', sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` })
  }

  function milestone() {
    const w = world.current
    if (w.hearts < w.maxHearts) {
      w.hearts += 1
      fx.text(size.current.w / 2, 120, '+1 HEART', '#fca5a5', 22)
    } else {
      w.shields += 1
      fx.text(size.current.w / 2, 120, '+1 SHIELD', '#67e8f9', 22)
    }
    sfx.levelUp()
    void trackEvent('action_milestone', { game_id: 'flashcount', kind: 'level', value: w.level })
  }

  // ── Drawing ─────────────────────────────────────────────────
  function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
  }

  function drawCurtain(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, k: number, t: number) {
    if (k <= 0.005) return
    const ch = h * k
    ctx.save()
    rr(ctx, x, y, w, h, 18)
    ctx.clip()
    const g = ctx.createLinearGradient(x, 0, x + w, 0)
    for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, i % 2 ? '#7f1d1d' : '#c0262d')
    ctx.fillStyle = g
    const sc = w / 10
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + w, y)
    ctx.lineTo(x + w, y + ch - sc * 0.4)
    for (let i = 10; i > 0; i--) {
      const x1 = x + i * sc
      const x0 = x + (i - 1) * sc
      ctx.quadraticCurveTo((x0 + x1) / 2, y + ch + sc * 0.35 + Math.sin(t * 2 + i) * 2, x0, y + ch - sc * 0.4)
    }
    ctx.closePath()
    ctx.fill()
    // Gold fringe
    ctx.strokeStyle = '#fbbf24'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(x, y, w, 10)
    ctx.restore()
  }

  function drawObjects(ctx: CanvasRenderingContext2D, objs: Obj[], x0: number, y0: number, fw: number, fh: number, t: number, opts: { since: number; highlight?: (o: Obj) => boolean; label?: boolean; frozen?: boolean }) {
    const r0 = objR(objs.length)
    let idx = 0
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i]
      const local = opts.since - o.delay
      if (!opts.frozen && (local < 0 || (o.leave > 0 && opts.since > o.leave))) continue
      const pop = opts.frozen ? 1 : Math.min(1, local / 0.18)
      const leaveK = !opts.frozen && o.leave > 0 ? clamp((o.leave - opts.since) / 0.15, 0, 1) : 1
      const q1 = pop - 1
      const sc = (pop < 1 ? Math.max(0.05, 1 + 2.70158 * q1 * q1 * q1 + 1.70158 * q1 * q1) : 1) * leaveK
      const r = r0 * o.s
      const x = x0 + o.x * fw
      const y = y0 + o.y * fh + Math.sin(t * 2.4 + i) * 2
      const hl = opts.highlight ? opts.highlight(o) : true
      ctx.globalAlpha = hl ? 1 : 0.22
      ctx.fillStyle = 'rgba(0,0,0,0.28)'
      ctx.beginPath()
      ctx.ellipse(x, y + r * 0.95, r * 0.7 * sc, r * 0.2 * sc, 0, 0, Math.PI * 2)
      ctx.fill()
      blitKind(ctx, o.kind, x, y, r, o.rot, sc, sc)
      ctx.globalAlpha = 1
      if (opts.highlight && hl) {
        idx += 1
        ctx.strokeStyle = '#fde047'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(x, y, r * 1.25, 0, Math.PI * 2)
        ctx.stroke()
        if (opts.label) {
          ctx.fillStyle = '#fde047'
          ctx.beginPath()
          ctx.arc(x + r * 0.9, y - r * 0.9, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#422006'
          ctx.font = "900 12px 'Plus Jakarta Sans', system-ui, sans-serif"
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(idx), x + r * 0.9, y - r * 0.9 + 0.5)
        }
      }
    }
  }

  function drawPanel(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const { W, py, panelH } = layout()
    const x = 12
    const pw = W - 24
    btns.current = []
    ctx.fillStyle = 'rgba(15,23,42,0.82)'
    rr(ctx, x, py, pw, panelH, 18)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const font = (s: number, wt = 800) => `${wt} ${s}px 'Plus Jakarta Sans', system-ui, sans-serif`

    if (phaseRef.current === 'idle') {
      return
    }
    if (w.step === 'ready' || w.step === 'flash' || w.step === 'cover') {
      const flashing = w.step === 'flash'
      ctx.fillStyle = flashing ? '#fde047' : '#e2e8f0'
      ctx.font = font(flashing ? 30 : 22, 900)
      const pulse = flashing ? 1 + Math.sin(t * 10) * 0.03 : 1
      ctx.save()
      ctx.translate(W / 2, py + panelH * 0.38)
      ctx.scale(pulse, pulse)
      ctx.fillText(flashing ? 'MEMORISE!' : w.step === 'cover' ? 'Hidden!' : 'Get ready…', 0, 0)
      ctx.restore()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = font(13, 700)
      ctx.fillText(w.bonus ? 'Count every object' : 'Count each kind you see', W / 2, py + panelH * 0.38 + 30)
      if (flashing) {
        const k = 1 - clamp(w.stepT / w.stepDur, 0, 1)
        const bw = pw - 60
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        rr(ctx, x + 30, py + panelH - 36, bw, 12, 6)
        ctx.fill()
        ctx.fillStyle = k < 0.3 ? '#f87171' : '#fde047'
        rr(ctx, x + 30, py + panelH - 36, Math.max(12, bw * k), 12, 6)
        ctx.fill()
      }
      return
    }
    const q = w.qs[w.qi]
    if (!q) return
    if (w.step === 'reveal') {
      ctx.fillStyle = '#fff'
      ctx.font = font(18, 900)
      const lines = w.qs.map((qq) =>
        qq.type === 'total' ? `There were ${qq.answer} in total` : qq.type === 'most' ? `Most: ${KINDS[qq.kind].name}` : `${KINDS[qq.kind].name}: ${qq.answer}`,
      )
      lines.forEach((ln, i) => ctx.fillText(ln, W / 2, py + 40 + i * 28))
      ctx.fillStyle = w.dead ? '#fca5a5' : '#86efac'
      ctx.font = font(14, 800)
      ctx.fillText(w.dead ? 'Out of hearts…' : 'Level clear!', W / 2, py + panelH - 26)
      return
    }
    // Question header
    const qy = py + 26
    ctx.font = font(18, 900)
    ctx.fillStyle = '#fff'
    if (q.type === 'count') {
      const pre = 'How many'
      const post = `${KINDS[q.kind].name}?`
      const wPre = ctx.measureText(pre).width
      const wPost = ctx.measureText(post).width
      const total = wPre + 40 + wPost
      let cx = W / 2 - total / 2
      ctx.textAlign = 'left'
      ctx.fillText(pre, cx, qy)
      cx += wPre + 20
      blitKind(ctx, q.kind, cx, qy, 13)
      ctx.fillText(post, cx + 20, qy)
      ctx.textAlign = 'center'
    } else if (q.type === 'most') {
      ctx.fillText('Which did you see MOST?', W / 2, qy)
    } else {
      ctx.fillText('How many objects in TOTAL?', W / 2, qy)
    }
    if (w.qs.length > 1) {
      ctx.font = font(11, 800)
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.fillText(`Q${w.qi + 1}/${w.qs.length}`, x + 26, py + 14)
    }
    // Timer bar
    if (w.step === 'ask') {
      const k = 1 - clamp(w.stepT / w.stepDur, 0, 1)
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      rr(ctx, x + 20, py + 44, pw - 40, 5, 3)
      ctx.fill()
      ctx.fillStyle = k < 0.25 ? '#f87171' : '#38bdf8'
      rr(ctx, x + 20, py + 44, (pw - 40) * k, 5, 3)
      ctx.fill()
    }
    // Options
    const n = q.options.length
    const cols = n <= 4 ? 2 : 3
    const rows = Math.ceil(n / cols)
    const gx = x + 14
    const gy = py + 58
    const gap = 10
    const bw = (pw - 28 - gap * (cols - 1)) / cols
    const bh = Math.min(64, (panelH - 58 - 14 - gap * (rows - 1)) / rows)
    const appear = w.step === 'ask' && w.qi >= 0 ? clamp(w.stepT / 0.25, 0, 1) : 1
    for (let i = 0; i < n; i++) {
      const val = q.options[i]
      const c = i % cols
      const r = Math.floor(i / cols)
      const bx = gx + c * (bw + gap)
      const by = gy + r * (bh + gap) + (1 - appear) * 20
      btns.current.push({ x: bx, y: by, w: bw, h: bh, id: 'opt', val })
      const isChoice = w.step === 'feedback' && w.choice === val
      const isAnswer = w.step === 'feedback' && val === q.answer
      let fill = '#334155'
      let edge = '#475569'
      if (isAnswer) {
        fill = '#15803d'
        edge = '#4ade80'
      } else if (isChoice) {
        fill = '#991b1b'
        edge = '#f87171'
      }
      const press = isChoice && w.pressT > 0 ? 0.94 : 1
      const wob = isChoice && !w.lastOk ? Math.sin(w.stepT * 40) * Math.max(0, 0.4 - w.stepT) * 12 : 0
      ctx.save()
      ctx.globalAlpha = appear
      ctx.translate(bx + bw / 2 + wob, by + bh / 2)
      ctx.scale(press, press)
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      rr(ctx, -bw / 2, -bh / 2 + 4, bw, bh, 14)
      ctx.fill()
      const g = ctx.createLinearGradient(0, -bh / 2, 0, bh / 2)
      g.addColorStop(0, isAnswer || isChoice ? edge : '#475569')
      g.addColorStop(1, fill)
      ctx.fillStyle = g
      rr(ctx, -bw / 2, -bh / 2, bw, bh, 14)
      ctx.fill()
      ctx.strokeStyle = edge
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      rr(ctx, -bw / 2 + 4, -bh / 2 + 3, bw - 8, bh * 0.38, 10)
      ctx.fill()
      if (q.type === 'most') {
        blitKind(ctx, val as Kind, 0, 0, Math.min(18, bh * 0.3))
      } else {
        ctx.fillStyle = '#fff'
        ctx.font = font(Math.min(30, bh * 0.5), 900)
        ctx.fillText(String(val), 0, 1)
      }
      if (isAnswer) {
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(bw / 2 - 26, 0)
        ctx.lineTo(bw / 2 - 19, 7)
        ctx.lineTo(bw / 2 - 8, -7)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  function drawPeekButton(ctx: CanvasRenderingContext2D, fx0: number, fy0: number, fw: number, fh: number, t: number) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.step !== 'ask') return
    const r = 24
    const cx = fx0 + fw - r - 12
    const cy = fy0 + fh - r - 12
    const on = w.peeks > 0
    btns.current.push({ x: cx - r - 6, y: cy - r - 6, w: r * 2 + 12, h: r * 2 + 12, id: 'peek', val: 0 })
    ctx.globalAlpha = on ? 1 : 0.4
    ctx.fillStyle = on ? '#0e7490' : '#334155'
    ctx.beginPath()
    ctx.arc(cx, cy, r + (on ? Math.sin(t * 4) * 1.5 : 0), 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#67e8f9'
    ctx.lineWidth = 2
    ctx.stroke()
    // Eye icon
    ctx.fillStyle = '#ecfeff'
    ctx.beginPath()
    ctx.moveTo(cx - 13, cy)
    ctx.quadraticCurveTo(cx, cy - 12, cx + 13, cy)
    ctx.quadraticCurveTo(cx, cy + 12, cx - 13, cy)
    ctx.fill()
    ctx.fillStyle = '#0e7490'
    ctx.beginPath()
    ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(cx + r * 0.75, cy - r * 0.75, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#422006'
    ctx.font = "900 12px 'Plus Jakarta Sans', system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(w.peeks), cx + r * 0.75, cy - r * 0.75 + 0.5)
    ctx.globalAlpha = 1
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const dt = fx.step(raw)
    update(dt, raw)
    const w = world.current
    const ph = phaseRef.current
    const th = THEMES[w.theme]
    const { fx0, fy0, fw, fh } = layout()

    // Curtain target
    const open = ph === 'idle' || w.peekT > 0 || w.step === 'flash' || w.step === 'reveal' || (ph !== 'play' && w.step !== 'ask')
    w.curtain += ((open ? 0 : 1) - w.curtain) * (1 - Math.exp(-(open ? 16 : 10) * raw))

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, th.bg)
    bg.addColorStop(1, '#020617')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    for (let i = 0; i < 18; i++) {
      const sx = ((i * 97.3) % W)
      const sy = ((i * 53.7) % (H * 0.9))
      ctx.globalAlpha = 0.15 + 0.15 * Math.sin(t * 1.3 + i)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(sx, sy, 1.2 + (i % 3) * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    fx.applyShake(ctx)
    // Table
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    rr(ctx, fx0, fy0 + 6, fw, fh, 18)
    ctx.fill()
    const felt = ctx.createRadialGradient(fx0 + fw / 2, fy0 + fh * 0.4, 10, fx0 + fw / 2, fy0 + fh / 2, Math.max(fw, fh) * 0.75)
    felt.addColorStop(0, th.felt)
    felt.addColorStop(1, th.felt2)
    ctx.fillStyle = felt
    rr(ctx, fx0, fy0, fw, fh, 18)
    ctx.fill()
    ctx.strokeStyle = th.rim
    ctx.lineWidth = 3
    ctx.stroke()
    glow(ctx, fx0 + fw / 2, fy0 + fh * 0.35, Math.max(fw, fh) * 0.5, '#ffffff', 0.08)

    // Objects
    ctx.save()
    rr(ctx, fx0, fy0, fw, fh, 18)
    ctx.clip()
    if (ph === 'idle') {
      if (demo.current.length === 0) {
        demo.current = Array.from({ length: 10 }, (_, i) => ({
          kind: (i % 8) as Kind, x: rand(0.1, 0.9), y: rand(0.15, 0.85), vx: rand(-0.06, 0.06), vy: rand(-0.06, 0.06), s: rand(0.9, 1.2), delay: 0, leave: 0, rot: 0,
        }))
      }
      for (const o of demo.current) {
        o.x += o.vx * raw
        o.y += o.vy * raw
        if (o.x < 0.08 || o.x > 0.92) o.vx *= -1
        if (o.y < 0.1 || o.y > 0.9) o.vy *= -1
      }
      drawObjects(ctx, demo.current, fx0, fy0, fw, fh, t, { since: 99, frozen: true })
    } else if (w.step === 'reveal') {
      const asked = new Set(w.qs.map((q) => q.kind))
      const anyTotal = w.qs.some((q) => q.type === 'total')
      drawObjects(ctx, w.objs, fx0, fy0, fw, fh, t, { since: 99, frozen: true, highlight: (o) => anyTotal || asked.has(o.kind), label: w.qs.length === 1 })
    } else if (w.step === 'flash' || (w.step !== 'ready' && w.curtain < 0.99)) {
      const since = w.step === 'flash' ? w.stepT : 99
      drawObjects(ctx, w.objs, fx0, fy0, fw, fh, t, { since, frozen: w.step !== 'flash' })
    }
    ctx.restore()

    drawCurtain(ctx, fx0, fy0, fw, fh, w.curtain, t)
    if (w.curtain > 0.85 && ph !== 'idle') {
      ctx.fillStyle = '#fbbf24'
      ctx.font = `900 ${Math.round(Math.min(90, fh * 0.4))}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.globalAlpha = 0.85
      ctx.lineWidth = 6
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      const bob = Math.sin(t * 2) * 4
      ctx.strokeText('?', fx0 + fw / 2, fy0 + fh * 0.45 + bob)
      ctx.fillText('?', fx0 + fw / 2, fy0 + fh * 0.45 + bob)
      ctx.globalAlpha = 1
    }
    // Countdown ring during flash
    if (ph === 'play' && w.step === 'flash') {
      const k = 1 - clamp(w.stepT / w.stepDur, 0, 1)
      const cx = fx0 + fw - 26
      const cy = fy0 + 26
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.beginPath()
      ctx.arc(cx, cy, 17, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = k < 0.3 ? '#f87171' : '#fde047'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k)
      ctx.stroke()
    }

    drawPanel(ctx, t)
    drawPeekButton(ctx, fx0, fy0, fw, fh, t)
    if (w.peekT > 0) {
      ctx.fillStyle = '#67e8f9'
      ctx.font = "900 16px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.fillText('PEEK', fx0 + fw / 2, fy0 + 18)
    }

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown}>
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
                  <span style={{ opacity: 0.3 }}>{'❤'.repeat(Math.max(0, hud.max - hud.hearts))}</span>
                </span>
                <span className="action-hud__small">
                  {hud.mult > 1 ? <span style={{ color: '#f0abfc' }}>x{hud.mult} </span> : null}
                  {hud.shields > 0 ? <span style={{ color: '#67e8f9' }}>◆{hud.shields}</span> : null}
                </span>
              </div>
            </div>
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
              game="flashcount"
              icon={meta.icon}
              title={meta.title}
              hint="Objects flash on the table for a moment. Count each kind, then answer before the time runs out."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.level >= 10 ? 'Eagle eyes!' : 'Lost count!'}
            subtitle={`Score ${hud.score} · Level ${hud.level}`}
            celebrate={hud.level >= 10}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
