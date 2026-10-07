import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, glow } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'
import { FAVS, JOBS, JOB_COLORS, NAMES, drawFace, faceDistance, lookAlike, randomFace, type Face } from './art'
import { SIGNATURE, type FaceSig } from './levels'

const meta = getGame('faces')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Step = 'ready' | 'intro' | 'quiz' | 'feedback' | 'done'
type QType = 'tap' | 'name' | 'job' | 'fav'
type Question = { type: QType; target: Face; options: string[]; answer: string; returning: boolean }
type Btn = { x: number; y: number; w: number; h: number; kind: 'face' | 'opt' | 'hint' | 'skip'; val: string }

const THEMES = [
  { top: '#fdba74', bot: '#f472b6', floor: '#7c2d12', flags: ['#ef4444', '#facc15', '#22c55e', '#3b82f6'] },
  { top: '#7dd3fc', bot: '#a7f3d0', floor: '#166534', flags: ['#f97316', '#ec4899', '#a855f7', '#facc15'] },
  { top: '#312e81', bot: '#7c3aed', floor: '#1e1b4b', flags: ['#fde047', '#f0abfc', '#67e8f9', '#fca5a5'] },
  { top: '#fde68a', bot: '#fb7185', floor: '#713f12', flags: ['#0ea5e9', '#22c55e', '#f43f5e', '#8b5cf6'] },
]

const TWISTS: Record<number, string> = {
  3: 'Strangers join the line-up',
  4: 'Guests from earlier return!',
  5: 'Reunion: name everyone you met',
  6: 'Look-alikes appear',
  10: 'Now remember their jobs',
  14: 'And their favourite colour',
}

type World = {
  level: number
  bonus: boolean
  sig: FaceSig | null
  /** Wrong answers and hints on this level (for stars). */
  lvlMiss: number
  helped: boolean
  theme: number
  score: number
  hearts: number
  maxHearts: number
  hints: number
  streak: number
  met: Face[]
  knowJob: Set<number>
  knowFav: Set<number>
  usedNames: Set<string>
  nextId: number
  intros: Face[]
  lineup: Face[]
  qs: Question[]
  qi: number
  found: Set<number>
  removed: Set<string>
  step: Step
  stepT: number
  stepDur: number
  introIdx: number
  introDur: number
  choice: string
  lastOk: boolean
  inputLock: number
  hintT: number
  dead: boolean
  bonusPerfect: boolean
  stats: { level: number; names: number; streak: number; returning: number; reunion: number }
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
    hints: 0,
    streak: 0,
    met: [],
    knowJob: new Set(),
    knowFav: new Set(),
    usedNames: new Set(),
    nextId: 1,
    intros: [],
    lineup: [],
    qs: [],
    qi: 0,
    found: new Set(),
    removed: new Set(),
    step: 'ready',
    stepT: 0,
    stepDur: 1,
    introIdx: 0,
    introDur: 2.4,
    choice: '',
    lastOk: false,
    inputLock: 0,
    hintT: 0,
    dead: false,
    bonusPerfect: true,
    stats: { level: 0, names: 0, streak: 0, returning: 0, reunion: 0 },
  }
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function multOf(streak: number) {
  return 1 + Math.min(4, Math.floor(streak / 3))
}

function takeName(w: World): string {
  let pool = NAMES.filter((n) => !w.usedNames.has(n))
  if (pool.length === 0) {
    // Recycle names nobody on screen is using.
    w.usedNames = new Set(w.met.slice(-12).map((f) => f.name))
    pool = NAMES.filter((n) => !w.usedNames.has(n))
  }
  const n = pool[Math.floor(Math.random() * pool.length)]
  w.usedNames.add(n)
  return n
}

/** New face that differs clearly from everyone in `others`. */
function distinctFace(w: World, others: Face[]): Face {
  let best: Face | null = null
  let bestD = -1
  for (let i = 0; i < 30; i++) {
    const f = randomFace(0, '')
    const d = others.length ? Math.min(...others.map((o) => faceDistance(o, f))) : 9
    if (d > bestD) {
      best = f
      bestD = d
    }
    if (d >= 4) break
  }
  const f = best!
  f.id = w.nextId++
  f.name = takeName(w)
  return f
}

function pickOptions(answer: string, pool: string[], n = 4): string[] {
  const out = new Set<string>([answer])
  for (const p of shuffle([...pool])) {
    if (out.size >= n) break
    out.add(p)
  }
  return shuffle(Array.from(out))
}

export default function FacesGame() {
  const run = useActionRun('faces')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const size = useRef({ w: 360, h: 600 })
  const btns = useRef<Btn[]>([])
  const demo = useRef<Face[]>([])

  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__faces = world
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__facesAnswer = (v: string) => answer(v)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hearts: 3, max: 3, mult: 1 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: Math.max(1, w.level), hearts: w.hearts, max: w.maxHearts, mult: multOf(w.streak) })
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
    w.maxHearts = 3 + run.level('heart')
    w.hearts = w.maxHearts
    w.hints = run.level('badge')
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
    const sig = SIGNATURE[w.level] ?? null
    w.sig = sig
    // Signature bosses replace the safe reunion round.
    w.bonus = w.level % 5 === 0 && w.met.length >= 3 && !sig?.boss
    buildLevel()
    const twist = TWISTS[w.level]
    setBanner({
      key: Date.now(),
      text: sig?.boss ? `BOSS · LEVEL ${w.level}` : sig ? sig.name.toUpperCase() : w.bonus ? 'REUNION!' : `LEVEL ${w.level}`,
      sub: sig?.boss ? `${sig.name.replace('Boss · ', '')} · ${sig.sub}` : sig ? `Level ${w.level} · ${sig.sub}` : w.bonus ? 'name your old friends — no hearts lost' : twist ?? (w.level === 1 ? 'remember every name' : `${w.intros.length} new guests`),
    })
    if (w.bonus) sfx.power()
    else sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function buildLevel() {
    const w = world.current
    const L = w.level
    w.found = new Set()
    w.removed = new Set()
    w.qi = 0
    w.dead = false
    w.choice = ''
    w.introIdx = 0
    w.lvlMiss = 0
    w.helped = false
    const sig = w.sig
    w.introDur = Math.max(1.4, 2.6 - (L - 1) * 0.07) * (1 + 0.15 * run.level('study')) * (sig?.intro ?? 1)
    if (w.bonus) {
      const cast = shuffle([...w.met]).slice(0, Math.min(6, w.met.length))
      w.intros = []
      w.bonusPerfect = true
      const strangers = [distinctFace(w, cast), distinctFace(w, cast)]
      w.lineup = shuffle([...cast, ...strangers])
      w.qs = cast.map((f) => {
        const tap = Math.random() < 0.4
        return tap
          ? { type: 'tap' as const, target: f, options: [], answer: String(f.id), returning: true }
          : { type: 'name' as const, target: f, options: pickOptions(f.name, w.met.filter((m) => m.id !== f.id).map((m) => m.name)), answer: f.name, returning: true }
      })
      setStep('ready', 1.1)
      return
    }
    const newCount = sig ? sig.fresh : Math.min(5, 2 + Math.floor((L - 1) / 3))
    const fresh: Face[] = []
    const others = [...w.met.slice(-8)]
    for (let i = 0; i < newCount; i++) {
      const f = distinctFace(w, [...others, ...fresh])
      // Themed guests keep their party names.
      const themed = sig?.names?.[i]
      if (themed && !w.met.some((m) => m.name === themed)) f.name = themed
      fresh.push(f)
    }
    const showJob = sig?.job ?? L >= 10
    const showFav = sig?.fav ?? L >= 14
    for (const f of fresh) {
      if (showJob) w.knowJob.add(f.id)
      if (showFav) w.knowFav.add(f.id)
    }
    const retN = sig ? Math.min(sig.returning ?? 0, w.met.length) : L >= 4 ? Math.min(3, 1 + Math.floor((L - 4) / 5), w.met.length) : 0
    const returning = shuffle([...w.met]).slice(0, retN)
    const strangerN = sig ? sig.strangers : L >= 3 ? Math.min(4, 1 + Math.floor(L / 6)) : 0
    const lookP = sig ? (sig.lookP ?? 0) : L >= 6 ? 0.6 : 0
    const strangers: Face[] = []
    const cast = [...fresh, ...returning]
    for (let i = 0; i < strangerN; i++) {
      if (Math.random() < lookP) {
        const base = cast[Math.floor(Math.random() * cast.length)]
        strangers.push(lookAlike(base, w.nextId++, takeName(w)))
      } else strangers.push(distinctFace(w, [...cast, ...strangers]))
    }
    w.intros = fresh
    w.lineup = shuffle([...cast, ...strangers])
    const qs: Question[] = []
    for (const f of shuffle([...cast])) {
      const isRet = returning.includes(f)
      let type: QType = 'tap'
      if (sig) {
        const ok = sig.types.filter((t) => (t === 'job' ? w.knowJob.has(f.id) : t === 'fav' ? w.knowFav.has(f.id) : true))
        type = ok.length ? ok[Math.floor(Math.random() * ok.length)] : 'name'
      } else if (L >= 3) {
        const r = Math.random()
        if (w.knowFav.has(f.id) && r < 0.22) type = 'fav'
        else if (w.knowJob.has(f.id) && r < 0.45) type = 'job'
        else if (r < 0.6) type = 'name'
      }
      if (type === 'tap') qs.push({ type, target: f, options: [], answer: String(f.id), returning: isRet })
      else if (type === 'name') qs.push({ type, target: f, options: pickOptions(f.name, cast.filter((c) => c !== f).map((c) => c.name).concat(strangers.map((s) => s.name))), answer: f.name, returning: isRet })
      else if (type === 'job') qs.push({ type, target: f, options: pickOptions(JOBS[f.job], JOBS.filter((_, i) => i !== f.job)), answer: JOBS[f.job], returning: isRet })
      else qs.push({ type, target: f, options: pickOptions(FAVS[f.fav].name, FAVS.filter((_, i) => i !== f.fav).map((c) => c.name)), answer: FAVS[f.fav].name, returning: isRet })
    }
    w.qs = qs
    setStep('ready', L === 1 ? 1.3 : 1.0)
  }

  function beginQuiz() {
    const w = world.current
    for (const f of w.intros) if (!w.met.includes(f)) w.met.push(f)
    if (w.met.length > 30) w.met = w.met.slice(-30)
    w.qi = 0
    askCurrent()
  }

  function askCurrent() {
    const w = world.current
    w.choice = ''
    w.removed = new Set()
    setStep('quiz', Math.max(8, 14 - w.level * 0.25))
    w.inputLock = 0.25
  }

  function answer(val: string) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.step !== 'quiz' || w.inputLock > 0) return
    const q = w.qs[w.qi]
    w.choice = val
    const ok = val === q.answer
    w.lastOk = ok
    const hit = btns.current.find((b) => (b.kind === 'face' || b.kind === 'opt') && b.val === val)
    const { w: W, h: H } = size.current
    const px = hit ? hit.x + hit.w / 2 : W / 2
    const py = hit ? hit.y + hit.h / 2 : H / 2
    if (ok) {
      w.streak += 1
      w.stats.names += 1
      w.stats.streak = Math.max(w.stats.streak, w.streak)
      if (q.returning) w.stats.returning += 1
      if (q.type === 'tap') w.found.add(q.target.id)
      const mult = multOf(w.streak)
      const pts = Math.round((50 + w.level * 10) * mult * (q.returning ? 1.5 : 1) * (w.sig?.boss ? 2 : 1))
      w.score += pts
      fx.burst(px, py, { count: 24, color: ['#fde047', '#4ade80', '#ffffff', '#f472b6'], speed: 260, shape: 'square', size: 5, gravity: 400 })
      fx.ring(px, py, { color: '#4ade80', maxR: 70, life: 0.4, width: 4 })
      fx.text(px, py - 40, `+${pts}`, '#fde047', 22)
      if (w.streak % 3 === 0) {
        fx.text(W / 2, 150, `x${mult} STREAK!`, '#f0abfc', 24)
        sfx.combo()
      } else sfx.score(w.streak)
      if (w.streak % 5 === 0) {
        w.hints += 1
        fx.text(W / 2, 180, '+1 HINT', '#67e8f9', 18)
      }
      fx.stop(0.05)
      haptic.success()
    } else {
      w.streak = 0
      w.lvlMiss += 1
      fx.flash('#ef4444', 0.25)
      fx.shake(9, 0.3)
      haptic.error()
      sfx.hurt()
      if (w.bonus) {
        w.bonusPerfect = false
        fx.text(px, py - 40, 'NOPE', '#fca5a5', 20)
      } else {
        w.hearts -= 1
        fx.text(px, py - 40, val === '' ? 'TIME!' : 'WRONG', '#fca5a5', 22)
        if (w.hearts <= 0) w.dead = true
      }
    }
    run.update(w.stats)
    pushHud()
    setStep('feedback', ok ? 0.8 : 1.5)
  }

  function takeHint() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.step !== 'quiz' || w.hints <= 0 || w.hintT > 0) return
    const q = w.qs[w.qi]
    if (q.type !== 'tap' && w.removed.size > 0) return
    w.hints -= 1
    w.helped = true
    if (q.type === 'tap') w.hintT = 1.0
    else {
      const wrong = shuffle(q.options.filter((o) => o !== q.answer)).slice(0, 2)
      w.removed = new Set(wrong)
    }
    sfx.power()
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
      const coins = Math.round(w.level * 1.5 + w.stats.names * 0.5 + w.stats.reunion * 5)
      run.end({ score: w.score, cleared: w.level >= 10, stats: { ...w.stats }, coins }, revive)
    }, 1000)
  }

  /** Revive: hearts back and the level's guests are introduced again. */
  function revive() {
    const w = world.current
    w.hearts = Math.min(w.maxHearts, 2)
    w.streak = 0
    w.dead = false
    w.found = new Set()
    // Replay the memorise phase: re-introduce everyone still to be asked.
    const left = w.qs.slice(w.qi)
    w.intros = left.map((q) => q.target)
    w.qs = left
    w.qi = 0
    w.introIdx = 0
    setStep('intro', w.introDur)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'meet them again' })
    pushHud()
    setPhaseBoth('play')
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const w = world.current
    const p = localPoint(e, e.currentTarget)
    if (w.step === 'intro') {
      if (w.stepT > 0.5) advanceIntro()
      return
    }
    const hit = btns.current.find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h)
    if (!hit) return
    if (hit.kind === 'hint') takeHint()
    else if (hit.kind === 'opt' && w.removed.has(hit.val)) return
    else answer(hit.val)
  }

  function advanceIntro() {
    const w = world.current
    w.introIdx += 1
    if (w.introIdx >= w.intros.length) {
      beginQuiz()
      sfx.whoosh()
    } else {
      setStep('intro', w.introDur)
      sfx.flip()
    }
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const w = world.current
      if (phaseRef.current !== 'play') return
      if (e.key === 'h' || e.key === 'H') takeHint()
      if (w.step === 'intro' && (e.key === ' ' || e.key === 'Enter')) advanceIntro()
      const n = Number(e.key)
      if (w.step === 'quiz' && n >= 1 && n <= 9) {
        const opts = btns.current.filter((b) => b.kind === 'face' || b.kind === 'opt')
        if (opts[n - 1]) answer(opts[n - 1].val)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  function update(dt: number, raw: number) {
    const w = world.current
    w.inputLock = Math.max(0, w.inputLock - raw)
    if (phaseRef.current !== 'play') return
    if (w.hintT > 0) {
      w.hintT = Math.max(0, w.hintT - raw)
      return
    }
    w.stepT += dt
    if (w.stepT < w.stepDur) return
    switch (w.step) {
      case 'ready':
        if (w.intros.length) {
          w.introIdx = 0
          setStep('intro', w.introDur)
          sfx.flip()
        } else beginQuiz()
        break
      case 'intro':
        advanceIntro()
        break
      case 'quiz':
        answer('')
        break
      case 'feedback':
        if (w.dead) {
          die()
          return
        }
        if (w.qi < w.qs.length - 1) {
          w.qi += 1
          askCurrent()
        } else {
          setStep('done', 1.0)
          // Stars: clear = 1, no wrong answer = +1, no hint = +1.
          const stars = 1 + (w.lvlMiss === 0 ? 1 : 0) + (w.helped ? 0 : 1)
          run.completeLevel(w.level, stars)
          setBanner({ key: Date.now(), text: w.sig?.boss ? 'BOSS BEATEN!' : w.lvlMiss === 0 ? 'PERFECT!' : 'CLEARED!', sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` })
          if (w.bonus && w.bonusPerfect) {
            w.stats.reunion += 1
            w.score += 300
            fx.text(size.current.w / 2, size.current.h * 0.4, 'PERFECT REUNION +300', '#fde047', 22)
          }
          sfx.win()
        }
        break
      case 'done':
        if (w.level % 5 === 0) {
          if (w.hearts < w.maxHearts) {
            w.hearts += 1
            fx.text(size.current.w / 2, 120, '+1 HEART', '#fca5a5', 22)
          } else {
            w.hints += 1
            fx.text(size.current.w / 2, 120, '+1 HINT', '#67e8f9', 22)
          }
          sfx.levelUp()
          void trackEvent('action_milestone', { game_id: 'faces', kind: 'level', value: w.level })
        }
        nextLevel()
        break
    }
  }

  // ── Drawing ─────────────────────────────────────────────────
  const font = (s: number, wt = 800) => `${wt} ${s}px 'Plus Jakarta Sans', system-ui, sans-serif`

  function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
  }

  function nameTag(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color = '#fde047', size = 13) {
    ctx.font = font(size, 900)
    const tw = ctx.measureText(text).width + 14
    ctx.fillStyle = 'rgba(15,23,42,0.85)'
    rr(ctx, x - tw / 2, y - size * 0.8, tw, size * 1.6, 8)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, x, y + 0.5)
  }

  function anim(f: Face, t: number, mood: 0 | 1 | -1 = 0) {
    const blink = ((t + f.id * 1.37) % 3.4) < 0.12
    return { t, blink, mood }
  }

  function drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
    const th = THEMES[world.current.theme]
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, th.top)
    bg.addColorStop(0.75, th.bot)
    bg.addColorStop(1, th.floor)
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // Back wall windows
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    for (let i = 0; i < 4; i++) {
      rr(ctx, 18 + i * (W / 4), H * 0.2, W / 4 - 36, H * 0.22, 10)
      ctx.fill()
    }
    // Floor
    ctx.fillStyle = th.floor
    ctx.globalAlpha = 0.65
    ctx.fillRect(0, H * 0.86, W, H * 0.14)
    ctx.globalAlpha = 1
    // Bunting
    for (let row = 0; row < 2; row++) {
      const y0 = 58 + row * 22
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(0, y0)
      ctx.quadraticCurveTo(W / 2, y0 + 18, W, y0)
      ctx.stroke()
      const n = 12
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5 + row * 0.5) / n
        const x = k * W
        const y = y0 + Math.sin(k * Math.PI) * 9
        const sw = Math.sin(t * 2 + i + row) * 0.12
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(sw)
        ctx.fillStyle = th.flags[(i + row) % th.flags.length]
        ctx.globalAlpha = 0.75
        ctx.beginPath()
        ctx.moveTo(-7, 0)
        ctx.lineTo(7, 0)
        ctx.lineTo(0, 14)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
    }
    ctx.globalAlpha = 1
  }

  function drawIntro(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
    const w = world.current
    const f = w.intros[w.introIdx]
    if (!f) return
    const k = clamp(w.stepT / 0.35, 0, 1)
    const ease = 1 - Math.pow(1 - k, 3)
    const ox = (1 - ease) * W * 0.8
    const r = Math.min(W * 0.2, H * 0.12, 78)
    const cx = W / 2 + ox
    const cy = H * 0.36
    glow(ctx, cx, cy, r * 2.6, '#ffffff', 0.35)
    // Spotlight floor ellipse
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + r * 2.0, r * 1.5, r * 0.25, 0, 0, Math.PI * 2)
    ctx.fill()
    const bob = Math.sin(t * 3) * 3
    drawFace(ctx, f, cx, cy + bob, r, anim(f, t, w.stepT < 0.8 ? 1 : 0))
    // Speech bubble
    const by = cy - r * 1.95
    ctx.globalAlpha = clamp((w.stepT - 0.2) / 0.2, 0, 1)
    ctx.font = font(15, 800)
    const hi = `Hi, I'm ${f.name}!`
    const bw = ctx.measureText(hi).width + 24
    ctx.fillStyle = '#fff'
    rr(ctx, cx - bw / 2, by - 18, bw, 34, 14)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx - 6, by + 15)
    ctx.lineTo(cx + 8, by + 15)
    ctx.lineTo(cx + 2, by + 26)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#1f2937'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(hi, cx, by)
    ctx.globalAlpha = 1
    // Name plate
    const ny = cy + r * 2.25
    ctx.font = font(34, 900)
    const nw = Math.max(150, ctx.measureText(f.name).width + 50)
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    rr(ctx, cx - nw / 2, ny - 26 + 5, nw, 52, 16)
    ctx.fill()
    const ng = ctx.createLinearGradient(0, ny - 26, 0, ny + 26)
    ng.addColorStop(0, '#fef3c7')
    ng.addColorStop(1, '#fbbf24')
    ctx.fillStyle = ng
    rr(ctx, cx - nw / 2, ny - 26, nw, 52, 16)
    ctx.fill()
    ctx.strokeStyle = '#92400e'
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.fillStyle = '#422006'
    ctx.fillText(f.name, cx, ny + 2)
    // Job / favourite colour chips
    let cy2 = ny + 46
    if (w.knowJob.has(f.id)) {
      ctx.font = font(15, 800)
      const txt = `Job: ${JOBS[f.job]}`
      const tw = ctx.measureText(txt).width + 26
      ctx.fillStyle = 'rgba(15,23,42,0.75)'
      rr(ctx, cx - tw / 2, cy2 - 15, tw, 30, 15)
      ctx.fill()
      ctx.strokeStyle = JOB_COLORS[f.job]
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.fillText(txt, cx, cy2 + 1)
      cy2 += 38
    }
    if (w.knowFav.has(f.id)) {
      const fav = FAVS[f.fav]
      ctx.font = font(15, 800)
      const txt = `Loves ${fav.name}`
      const tw = ctx.measureText(txt).width + 44
      ctx.fillStyle = 'rgba(15,23,42,0.75)'
      rr(ctx, cx - tw / 2, cy2 - 15, tw, 30, 15)
      ctx.fill()
      ctx.fillStyle = fav.color
      ctx.beginPath()
      ctx.arc(cx - tw / 2 + 16, cy2, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.fillText(txt, cx + 10, cy2 + 1)
    }
    // Progress dots and timer
    const n = w.intros.length
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i < w.introIdx ? '#fde047' : i === w.introIdx ? '#ffffff' : 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.arc(W / 2 + (i - (n - 1) / 2) * 18, H - 50, i === w.introIdx ? 6 : 4.5, 0, Math.PI * 2)
      ctx.fill()
    }
    const kk = 1 - clamp(w.stepT / w.stepDur, 0, 1)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    rr(ctx, W * 0.2, H - 30, W * 0.6, 6, 3)
    ctx.fill()
    ctx.fillStyle = '#fde047'
    rr(ctx, W * 0.2, H - 30, W * 0.6 * kk, 6, 3)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = font(12, 700)
    ctx.fillText('MEMORISE · tap to continue', W / 2, H - 70)
  }

  function drawPrompt(ctx: CanvasRenderingContext2D, W: number, q: Question, timerK: number) {
    const y = 104
    ctx.fillStyle = 'rgba(15,23,42,0.82)'
    rr(ctx, 12, y - 30, W - 24, 62, 16)
    ctx.fill()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = font(21, 900)
    ctx.fillStyle = '#fff'
    if (q.type === 'tap') {
      const pre = 'Tap '
      const wPre = ctx.measureText(pre).width
      const wName = ctx.measureText(q.target.name).width
      const x0 = W / 2 - (wPre + wName) / 2
      ctx.textAlign = 'left'
      ctx.fillText(pre, x0, y - 2)
      ctx.fillStyle = '#fde047'
      ctx.fillText(q.target.name, x0 + wPre, y - 2)
      ctx.textAlign = 'center'
    } else if (q.type === 'name') ctx.fillText('Who is this?', W / 2, y - 2)
    else if (q.type === 'job') ctx.fillText('What is their job?', W / 2, y - 2)
    else ctx.fillText('Favourite colour?', W / 2, y - 2)
    if (q.returning) {
      ctx.font = font(10, 900)
      ctx.fillStyle = '#fbbf24'
      ctx.fillText(world.current.bonus ? 'REUNION' : 'RETURNING GUEST', W / 2, y - 22)
    }
    const w = world.current
    if (w.qs.length > 1) {
      ctx.font = font(11, 800)
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.textAlign = 'left'
      ctx.fillText(`${w.qi + 1}/${w.qs.length}`, 24, y - 18)
      ctx.textAlign = 'center'
    }
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    rr(ctx, 30, y + 20, W - 60, 5, 3)
    ctx.fill()
    ctx.fillStyle = timerK < 0.25 ? '#f87171' : '#38bdf8'
    rr(ctx, 30, y + 20, (W - 60) * timerK, 5, 3)
    ctx.fill()
  }

  function drawLineup(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, q: Question | undefined, interactive: boolean) {
    const w = world.current
    const faces = w.lineup
    const n = faces.length
    const cols = n <= 4 ? 2 : n <= 9 ? 3 : 4
    const rows = Math.ceil(n / cols)
    const bottom = H - 70
    const cw = (W - 24) / cols
    const ch = Math.min((bottom - 150) / rows, cw * 1.3)
    const top = 150 + ((bottom - 150) - ch * rows) / 2
    const r = Math.min(cw * 0.28, ch * 0.24, 46)
    const fb = w.step === 'feedback'
    faces.forEach((f, i) => {
      const c = i % cols
      const row = Math.floor(i / cols)
      const lastRowCount = row === rows - 1 ? n - row * cols : cols
      const offset = ((cols - lastRowCount) * cw) / 2
      const cx = 12 + offset + c * cw + cw / 2
      const cy = top + row * ch + ch * 0.42
      if (interactive) btns.current.push({ x: cx - cw / 2 + 3, y: cy - ch * 0.42, w: cw - 6, h: ch - 4, kind: 'face', val: String(f.id) })
      const isTarget = q && f.id === q.target.id
      const isChoice = fb && w.choice === String(f.id)
      let mood: 0 | 1 | -1 = 0
      let shake = 0
      if (fb && isTarget) mood = 1
      if (fb && isChoice && !w.lastOk) {
        mood = -1
        shake = Math.sin(w.stepT * 45) * Math.max(0, 0.5 - w.stepT) * 14
      }
      // Card
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      rr(ctx, cx - cw / 2 + 5, cy - ch * 0.38, cw - 10, ch - 12, 14)
      ctx.fill()
      if (fb && isTarget) {
        ctx.strokeStyle = '#4ade80'
        ctx.lineWidth = 4
        ctx.stroke()
      } else if (isChoice && !w.lastOk) {
        ctx.strokeStyle = '#f87171'
        ctx.lineWidth = 4
        ctx.stroke()
      }
      const hop = fb && isTarget && w.lastOk ? -Math.abs(Math.sin(w.stepT * 9)) * 8 : 0
      drawFace(ctx, f, cx + shake, cy + hop + Math.sin(t * 2 + i) * 1.5, r, anim(f, t, mood))
      const tagY = cy + r * 1.95
      const known = w.found.has(f.id)
      const castMember = w.qs.some((qq) => qq.target.id === f.id)
      if (known) nameTag(ctx, cx, tagY, f.name, '#86efac')
      else if (fb && isTarget) nameTag(ctx, cx, tagY, f.name, '#86efac')
      else if (fb && isChoice) nameTag(ctx, cx, tagY, castMember || w.met.includes(f) ? f.name : 'Stranger', '#fca5a5')
      else if (w.hintT > 0 && castMember) nameTag(ctx, cx, tagY, f.name, '#67e8f9')
    })
  }

  function drawNameQuestion(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, q: Question) {
    const w = world.current
    const fb = w.step === 'feedback'
    const r = Math.min(W * 0.17, H * 0.1, 64)
    const cx = W / 2
    const cy = 150 + r * 1.4
    glow(ctx, cx, cy, r * 2.2, '#ffffff', 0.3)
    const mood: 0 | 1 | -1 = fb ? (w.lastOk ? 1 : -1) : 0
    drawFace(ctx, q.target, cx, cy + Math.sin(t * 2.5) * 2, r, anim(q.target, t, mood))
    const top = cy + r * 2.1
    const bottom = H - 70
    const gap = 10
    const bh = Math.min(62, (bottom - top - gap) / 2)
    const bw = (W - 24 - 28 - gap) / 2
    q.options.forEach((opt, i) => {
      const c = i % 2
      const row = Math.floor(i / 2)
      const x = 26 + c * (bw + gap)
      const y = top + row * (bh + gap)
      btns.current.push({ x, y, w: bw, h: bh, kind: 'opt', val: opt })
      const removed = w.removed.has(opt)
      const isAns = fb && opt === q.answer
      const isChoice = fb && opt === w.choice
      let fill = '#334155'
      let edge = '#64748b'
      if (isAns) {
        fill = '#15803d'
        edge = '#4ade80'
      } else if (isChoice) {
        fill = '#991b1b'
        edge = '#f87171'
      }
      const wob = isChoice && !w.lastOk ? Math.sin(w.stepT * 40) * Math.max(0, 0.4 - w.stepT) * 12 : 0
      ctx.globalAlpha = removed ? 0.25 : 1
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      rr(ctx, x + wob, y + 4, bw, bh, 14)
      ctx.fill()
      const g = ctx.createLinearGradient(0, y, 0, y + bh)
      g.addColorStop(0, edge)
      g.addColorStop(1, fill)
      ctx.fillStyle = g
      rr(ctx, x + wob, y, bw, bh, 14)
      ctx.fill()
      ctx.strokeStyle = edge
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = font(opt.length > 8 ? 16 : 20, 900)
      if (q.type === 'fav') {
        const fav = FAVS.find((c) => c.name === opt)
        if (fav) {
          ctx.fillStyle = fav.color
          ctx.beginPath()
          ctx.arc(x + wob + 22, y + bh / 2, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.fillStyle = '#fff'
        }
        ctx.fillText(opt, x + wob + bw / 2 + 10, y + bh / 2 + 1)
      } else ctx.fillText(opt, x + wob + bw / 2, y + bh / 2 + 1)
      ctx.globalAlpha = 1
    })
  }

  function drawHintButton(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
    const w = world.current
    if (w.step !== 'quiz') return
    const r = 22
    const cx = W - 40
    const cy = H - 38
    const on = w.hints > 0
    btns.current.push({ x: cx - r - 8, y: cy - r - 8, w: r * 2 + 16, h: r * 2 + 16, kind: 'hint', val: 'hint' })
    ctx.globalAlpha = on ? 1 : 0.4
    ctx.fillStyle = on ? '#0e7490' : '#334155'
    ctx.beginPath()
    ctx.arc(cx, cy, r + (on ? Math.sin(t * 4) * 1.5 : 0), 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#67e8f9'
    ctx.lineWidth = 2
    ctx.stroke()
    // Name badge icon
    ctx.fillStyle = '#ecfeff'
    rr(ctx, cx - 12, cy - 8, 24, 16, 4)
    ctx.fill()
    ctx.fillStyle = '#0e7490'
    ctx.fillRect(cx - 7, cy - 2, 14, 2.5)
    ctx.fillRect(cx - 7, cy + 2.5, 9, 2)
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(cx + r * 0.75, cy - r * 0.75, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#422006'
    ctx.font = font(12, 900)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(w.hints), cx + r * 0.75, cy - r * 0.75 + 0.5)
    ctx.globalAlpha = 1
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const dt = fx.step(raw)
    update(dt, raw)
    const w = world.current
    const ph = phaseRef.current
    btns.current = []
    drawBackground(ctx, W, H, t)
    fx.applyShake(ctx)

    if (ph === 'idle') {
      if (demo.current.length === 0) demo.current = Array.from({ length: 6 }, (_, i) => randomFace(i + 1, ''))
      const r = Math.min(W * 0.12, 40)
      demo.current.forEach((f, i) => {
        const c = i % 3
        const row = Math.floor(i / 3)
        drawFace(ctx, f, W * (0.2 + c * 0.3), H * (0.32 + row * 0.3) + Math.sin(t * 2 + i) * 4, r, anim(f, t, Math.sin(t + i) > 0.7 ? 1 : 0))
      })
    } else if (w.step === 'ready') {
      ctx.fillStyle = 'rgba(15,23,42,0.6)'
      rr(ctx, W * 0.15, H * 0.55, W * 0.7, 56, 16)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = font(18, 900)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(w.bonus ? 'Who do you remember?' : 'Meet the guests…', W / 2, H * 0.55 + 28)
    } else if (w.step === 'intro') {
      drawIntro(ctx, W, H, t)
    } else if (w.step === 'quiz' || w.step === 'feedback' || w.step === 'done') {
      const q = w.qs[Math.min(w.qi, w.qs.length - 1)]
      if (q) {
        const timerK = w.step === 'quiz' ? 1 - clamp(w.stepT / w.stepDur, 0, 1) : 0
        if (w.step !== 'done') drawPrompt(ctx, W, q, timerK)
        if (w.step === 'done') {
          drawLineup(ctx, W, H, t, undefined, false)
          ctx.fillStyle = 'rgba(15,23,42,0.82)'
          rr(ctx, 12, 74, W - 24, 62, 16)
          ctx.fill()
          ctx.fillStyle = '#86efac'
          ctx.font = font(22, 900)
          ctx.textAlign = 'center'
          ctx.fillText(w.bonus ? 'Reunion complete!' : 'Level clear!', W / 2, 105)
        } else if (q.type === 'tap') drawLineup(ctx, W, H, t, q, w.step === 'quiz')
        else drawNameQuestion(ctx, W, H, t, q)
        if (w.step === 'feedback' && !w.lastOk && q.type !== 'tap') {
          nameTag(ctx, W / 2, 140, `That's ${q.target.name}${q.type === 'job' ? ` the ${JOBS[q.target.job]}` : ''}`, '#86efac', 14)
        }
        drawHintButton(ctx, W, H, t)
      }
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
            <div className="action-hud" style={{ top: '0.45rem' }}>
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Level {hud.level}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hearts">
                  {'❤'.repeat(Math.max(0, hud.hearts))}
                  <span style={{ opacity: 0.3 }}>{'❤'.repeat(Math.max(0, hud.max - hud.hearts))}</span>
                </span>
                {hud.mult > 1 ? <span className="action-hud__small" style={{ color: '#fdf4ff' }}>x{hud.mult}</span> : null}
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
              game="faces"
              icon={meta.icon}
              title={meta.title}
              hint="Meet each guest and remember their name. Then find them in the line-up — strangers and look-alikes will try to fool you."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.level >= 10 ? 'People person!' : 'Name escaped you!'}
            subtitle={`Score ${hud.score} · Level ${hud.level}`}
            celebrate={hud.level >= 10}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
