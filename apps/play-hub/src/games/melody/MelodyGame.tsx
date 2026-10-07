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
import { KEYS, drawBird, drawSymbol } from './art'
import { ensureAudio, playBuzz, playNote } from './synth'
import { SIGNATURE, type TuneSig } from './levels'

const meta = getGame('melody')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Step = 'ready' | 'demo' | 'go' | 'input' | 'success' | 'fail'
type Note = { x: number; y: number; vx: number; vy: number; life: number; key: number; rot: number }

const THEMES = [
  { top: '#1e1b4b', bot: '#312e81', light: '#a5b4fc' },
  { top: '#042f2e', bot: '#115e59', light: '#5eead4' },
  { top: '#500724', bot: '#831843', light: '#f9a8d4' },
  { top: '#431407', bot: '#7c2d12', light: '#fdba74' },
]

const TWISTS: Record<number, string> = {
  3: 'Notes can repeat',
  4: 'A 5th key joins the band',
  5: 'Echo bonus: how far can you go?',
  7: 'Six keys now',
  8: 'Feel the rhythm — long & short notes',
  11: 'Seven keys',
  12: 'Sometimes: play it BACKWARDS',
  15: 'The full eight-key band',
  16: 'Keys may shuffle after the tune',
}

type World = {
  level: number
  echo: boolean
  sig: TuneSig | null
  /** A replay was used on this level (costs the third star). */
  usedReplay: boolean
  theme: number
  score: number
  hearts: number
  maxHearts: number
  replays: number
  streak: number
  keyCount: number
  order: number[]
  keyX: number[]
  glowK: number[]
  shakeK: number[]
  seq: number[]
  durs: number[]
  beat: number
  reverse: boolean
  shuffled: boolean
  willShuffle: boolean
  starts: number[]
  demoIdx: number
  shown: number
  inputIdx: number
  inputTimes: number[]
  mistake: boolean
  best: number
  sing: number
  mood: 0 | 1 | -1
  step: Step
  stepT: number
  stepDur: number
  idleT: number
  dead: boolean
  echoLen: number
  notes: Note[]
  stats: { level: number; notes: number; streak: number; echo: number }
}

function freshWorld(): World {
  return {
    level: 0,
    echo: false,
    sig: null,
    usedReplay: false,
    theme: 0,
    score: 0,
    hearts: 3,
    maxHearts: 3,
    replays: 0,
    streak: 0,
    keyCount: 4,
    order: [0, 1, 2, 3, 4, 5, 6, 7],
    keyX: [0, 1, 2, 3, 4, 5, 6, 7],
    glowK: Array(8).fill(0),
    shakeK: Array(8).fill(0),
    seq: [],
    durs: [],
    beat: 0.6,
    reverse: false,
    shuffled: false,
    willShuffle: false,
    starts: [],
    demoIdx: 0,
    shown: 0,
    inputIdx: 0,
    inputTimes: [],
    mistake: false,
    best: 0,
    sing: 0,
    mood: 0,
    step: 'ready',
    stepT: 0,
    stepDur: 1,
    idleT: 0,
    dead: false,
    echoLen: 0,
    notes: [],
    stats: { level: 0, notes: 0, streak: 0, echo: 0 },
  }
}

function keysFor(L: number) {
  return L >= 15 ? 8 : L >= 11 ? 7 : L >= 7 ? 6 : L >= 4 ? 5 : 4
}

function randomNote(w: World, prev: number | undefined, allowRepeat: boolean) {
  let n = Math.floor(Math.random() * w.keyCount)
  if (!allowRepeat && prev !== undefined) {
    for (let i = 0; i < 6 && n === prev; i++) n = Math.floor(Math.random() * w.keyCount)
  }
  return n
}

export default function MelodyGame() {
  const run = useActionRun('melody')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const size = useRef({ w: 360, h: 600 })

  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__melody = world
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__melodyPress = (pos: number) => press(pos)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hearts: 3, max: 3, mult: 1 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function multOf(streak: number) {
    return 1 + Math.min(4, Math.floor(streak / 2))
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

  function layout() {
    const { w: W, h: H } = size.current
    const stageBottom = H * 0.42
    const slotY = H * 0.47
    const xTop = H * 0.53
    const xBottom = H - 14
    const n = world.current.keyCount
    const colW = (W - 20) / n
    return { W, H, stageBottom, slotY, xTop, xBottom, colW, birdX: W / 2, birdY: H * 0.25, birdR: Math.min(W * 0.12, H * 0.07, 46) }
  }

  function target() {
    const w = world.current
    return w.reverse ? [...w.seq].reverse() : w.seq
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    ensureAudio()
    const w = freshWorld()
    w.replays = run.level('ear')
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
    w.usedReplay = false
    // Signature bosses replace the safe echo round.
    w.echo = w.level % 5 === 0 && !sig
    w.keyCount = sig ? Math.max(keysFor(w.level), Math.max(...sig.notes) + 1) : keysFor(w.level)
    w.order = Array.from({ length: 8 }, (_, i) => i)
    w.shuffled = false
    w.mistake = false
    w.best = 0
    w.reverse = false
    w.willShuffle = false
    if (sig) {
      w.seq = [...sig.notes]
      w.durs = sig.durs ? [...sig.durs] : sig.notes.map(() => 1)
      w.beat = Math.max(0.3, 0.62 - w.level * 0.016) * (1 + run.level('tempo') * 0.08) * (sig.tempo ?? 1)
      w.reverse = !!sig.reverse
      w.willShuffle = !!sig.shuffle
    } else if (w.echo) {
      w.echoLen = 0
      w.seq = []
      for (let i = 0; i < 2; i++) w.seq.push(randomNote(w, w.seq[i - 1], true))
      w.durs = w.seq.map(() => 1)
      w.beat = 0.5 * (1 + run.level('tempo') * 0.08)
    } else {
      const L = w.level
      const len = Math.min(16, 3 + Math.floor((L - 1) / 2))
      w.seq = []
      for (let i = 0; i < len; i++) w.seq.push(randomNote(w, w.seq[i - 1], L >= 3 && Math.random() < 0.6))
      w.durs = w.seq.map(() => (L >= 8 ? [1, 1, 1, 2, 0.5][Math.floor(Math.random() * 5)] : 1))
      w.beat = Math.max(0.3, 0.62 - L * 0.016) * (1 + run.level('tempo') * 0.08)
      w.reverse = L >= 12 && Math.random() < 0.25
      w.willShuffle = !w.reverse && L >= 16 && Math.random() < 0.3
    }
    const twist = TWISTS[w.level]
    setBanner({
      key: Date.now(),
      text: sig?.boss ? `BOSS · LEVEL ${w.level}` : sig ? sig.name.toUpperCase() : w.echo ? 'ECHO BONUS' : `LEVEL ${w.level}`,
      sub: sig?.boss ? `${sig.name.replace('Boss · ', '')} · ${sig.sub}` : sig ? `Level ${w.level} · ${sig.sub}` : w.echo ? 'the tune grows — no hearts lost' : w.reverse ? 'play it BACKWARDS!' : twist ?? (w.level === 1 ? 'listen, then play it back' : undefined),
    })
    if (w.echo) sfx.power()
    else sfx.ready()
    beginDemo(1.3)
    run.update(w.stats)
    pushHud()
  }

  function beginDemo(delay = 0.5) {
    const w = world.current
    w.starts = []
    let tt = 0
    for (let i = 0; i < w.seq.length; i++) {
      w.starts.push(tt)
      tt += w.durs[i] * w.beat
    }
    w.demoIdx = 0
    w.shown = 0
    w.inputIdx = 0
    w.inputTimes = []
    w.mood = 0
    if (w.shuffled) {
      w.order = Array.from({ length: 8 }, (_, i) => i)
      w.shuffled = false
    }
    setStep('ready', delay)
  }

  function press(pos: number) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    ensureAudio()
    const note = w.order[pos]
    if (note === undefined || pos >= w.keyCount) return
    w.glowK[note] = 1
    if (w.step !== 'input') {
      // Free play while waiting — but only the tune counts.
      if (w.step === 'go') playNote(note, 0.5, 0.12)
      return
    }
    const L = layout()
    const kx = 10 + w.keyX[pos] * L.colW + L.colW / 2
    const ky = L.xTop + 30
    const exp = target()[w.inputIdx]
    w.idleT = 0
    if (note === exp) {
      playNote(note, Math.max(0.35, w.beat * 1.2))
      w.inputIdx += 1
      w.inputTimes.push(performance.now() / 1000)
      if (w.inputIdx > w.best) {
        w.best = w.inputIdx
        w.stats.notes += 1
        const pts = Math.round((10 + w.level * 2) * multOf(w.streak))
        w.score += pts
        fx.text(kx, ky - 20, `+${pts}`, KEYS[note].light, 16)
      }
      w.sing = 1
      w.notes.push({ x: kx, y: ky, vx: rand(-30, 30), vy: rand(-180, -120), life: 1.1, key: note, rot: rand(-0.4, 0.4) })
      if (w.notes.length > 30) w.notes.shift()
      fx.burst(kx, ky, { count: 10, color: [KEYS[note].light, '#ffffff'], speed: 180, shape: 'spark', gravity: 100 })
      fx.ring(kx, ky, { color: KEYS[note].light, maxR: 36, life: 0.3 })
      haptic.light()
      run.update(w.stats)
      pushHud()
      if (w.inputIdx >= w.seq.length) tuneDone()
    } else {
      playBuzz()
      w.shakeK[note] = 1
      w.mood = -1
      w.mistake = true
      fx.flash('#ef4444', 0.25)
      fx.shake(9, 0.3)
      haptic.error()
      sfx.hurt()
      if (w.echo) {
        w.stats.echo = Math.max(w.stats.echo, w.seq.length - 1)
        fx.text(L.W / 2, L.slotY - 30, `ECHO ${w.seq.length - 1}`, '#fde047', 26)
      } else {
        w.hearts -= 1
        w.streak = 0
        fx.text(kx, ky - 20, 'OOPS', '#fca5a5', 22)
        if (w.hearts <= 0) w.dead = true
      }
      run.update(w.stats)
      pushHud()
      setStep('fail', 1.2)
    }
  }

  function tuneDone() {
    const w = world.current
    const L = layout()
    w.mood = 1
    if (w.echo) {
      w.echoLen = w.seq.length
      w.stats.echo = Math.max(w.stats.echo, w.seq.length)
      const pts = 30 * w.seq.length
      w.score += pts
      fx.text(L.W / 2, L.slotY - 30, `ECHO ${w.seq.length}! +${pts}`, '#fde047', 22)
      sfx.combo()
    } else {
      if (!w.mistake) {
        w.streak += 1
        w.stats.streak = Math.max(w.stats.streak, w.streak)
      }
      let pts = Math.round((50 + w.level * 10) * multOf(w.streak) * (w.sig?.boss ? 2 : 1))
      // Rhythm bonus: did the player keep the tune's timing?
      if (w.level >= 8 && !w.reverse && w.inputTimes.length >= 3) {
        const a: number[] = []
        const e: number[] = []
        for (let i = 1; i < w.inputTimes.length; i++) {
          a.push(w.inputTimes[i] - w.inputTimes[i - 1])
          e.push(w.durs[i - 1])
        }
        const k = a.reduce((s, v) => s + v, 0) / e.reduce((s, v) => s + v, 0)
        if (a.every((v, i) => Math.abs(v / (e[i] * k) - 1) < 0.45)) {
          pts += 100
          fx.text(L.W / 2, L.slotY - 60, 'RHYTHM! +100', '#f0abfc', 22)
        }
      }
      w.score += pts
      fx.text(L.W / 2, L.slotY - 30, w.mistake ? `+${pts}` : `PERFECT +${pts}`, '#fde047', 22)
      // Stars: play it back = 1, no wrong note = +1, no Replay = +1.
      const stars = 1 + (w.mistake ? 0 : 1) + (w.usedReplay ? 0 : 1)
      run.completeLevel(w.level, stars)
      setBanner({ key: Date.now(), text: w.sig?.boss ? 'BOSS BEATEN!' : w.mistake ? 'NAILED IT!' : 'PERFECT!', sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}${w.sig ? ` · ${w.sig.name.replace('Boss · ', '')}` : ''}` })
      if (!w.mistake && w.streak % 3 === 0) {
        w.replays += 1
        fx.text(L.W / 2, L.slotY - 90, '+1 REPLAY', '#67e8f9', 18)
      }
      sfx.win()
    }
    for (let i = 0; i < 8; i++) {
      const k = w.seq[i % w.seq.length]
      w.notes.push({ x: L.birdX + rand(-30, 30), y: L.birdY, vx: rand(-120, 120), vy: rand(-200, -90), life: 1.3, key: k, rot: rand(-0.5, 0.5) })
    }
    fx.burst(L.birdX, L.birdY, { count: 30, color: KEYS.slice(0, w.keyCount).map((k) => k.light), speed: 300, shape: 'square', size: 5, gravity: 300 })
    fx.stop(0.06)
    haptic.success()
    run.update(w.stats)
    pushHud()
    setStep('success', 1.1)
  }

  function doReplay() {
    const w = world.current
    if (phaseRef.current !== 'play' || (w.step !== 'input' && w.step !== 'go') || w.replays <= 0) return
    w.replays -= 1
    w.usedReplay = true
    sfx.whoosh()
    beginDemo(0.4)
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
      const coins = Math.round(w.level * 1.6 + w.stats.notes * 0.12 + w.stats.echo * 1.5)
      run.end({ score: w.score, cleared: w.level >= 10, stats: { ...w.stats }, coins }, revive)
    }, 1000)
  }

  /** Revive: two hearts back and the tune plays again. */
  function revive() {
    const w = world.current
    w.hearts = Math.min(w.maxHearts, 2)
    w.dead = false
    w.streak = 0
    beginDemo(1.0)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'listen again' })
    pushHud()
    setPhaseBoth('play')
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    const L = layout()
    // Replay button
    const rbx = L.W - 38
    const rby = L.stageBottom - 30
    if (Math.hypot(p.x - rbx, p.y - rby) < 32) {
      doReplay()
      return
    }
    if (p.y < L.xTop - 10) return
    const w = world.current
    for (let pos = 0; pos < w.keyCount; pos++) {
      const x0 = 10 + w.keyX[pos] * L.colW
      if (p.x >= x0 && p.x < x0 + L.colW) {
        press(pos)
        return
      }
    }
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (phaseRef.current !== 'play') return
      if (e.key === 'r' || e.key === 'R') doReplay()
      const n = Number(e.key)
      if (n >= 1 && n <= 8) press(n - 1)
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  function update(dt: number, raw: number) {
    const w = world.current
    for (let i = 0; i < 8; i++) {
      w.glowK[i] = Math.max(0, w.glowK[i] - raw * 3)
      w.shakeK[i] = Math.max(0, w.shakeK[i] - raw * 2.5)
    }
    w.sing = Math.max(0, w.sing - raw * 4)
    for (const n of w.notes) {
      n.x += n.vx * raw
      n.y += n.vy * raw
      n.vy += 40 * raw
      n.life -= raw
    }
    w.notes = w.notes.filter((n) => n.life > 0)
    if (phaseRef.current !== 'play') return
    w.stepT += dt
    if (w.step === 'demo') {
      while (w.demoIdx < w.seq.length && w.stepT >= w.starts[w.demoIdx]) {
        const note = w.seq[w.demoIdx]
        playNote(note, Math.max(0.35, w.durs[w.demoIdx] * w.beat * 1.3))
        w.glowK[note] = 1
        w.sing = 1
        w.shown = w.demoIdx + 1
        const L = layout()
        const pos = w.order.indexOf(note)
        const kx = 10 + w.keyX[pos] * L.colW + L.colW / 2
        fx.burst(kx, L.xTop + 20, { count: 6, color: [KEYS[note].light], speed: 120, shape: 'dot', gravity: -60 })
        w.notes.push({ x: L.birdX + rand(-10, 10), y: L.birdY - L.birdR * 0.2, vx: rand(-60, 60), vy: rand(-140, -90), life: 1.2, key: note, rot: rand(-0.4, 0.4) })
        if (w.notes.length > 30) w.notes.shift()
        w.demoIdx += 1
      }
    }
    if (w.step === 'input') {
      w.idleT += dt
      if (w.idleT > 12) {
        w.idleT = 0
        const exp = target()[w.inputIdx]
        // Count a long silence as a miss on a different key.
        const wrongPos = w.order.findIndex((n, p) => p < w.keyCount && n !== exp)
        press(wrongPos < 0 ? 0 : wrongPos)
      }
    }
    if (w.stepT < w.stepDur) return
    switch (w.step) {
      case 'ready':
        setStep('demo', (w.starts[w.starts.length - 1] ?? 0) + w.durs[w.durs.length - 1] * w.beat + 0.5)
        break
      case 'demo':
        if (w.willShuffle && !w.shuffled) shuffleKeys()
        setStep('go', w.shuffled ? 0.9 : 0.5)
        sfx.tick()
        break
      case 'go':
        setStep('input', 9999)
        w.idleT = 0
        break
      case 'success':
        if (w.echo) {
          if (w.seq.length >= 10) {
            w.score += 500
            fx.text(size.current.w / 2, size.current.h * 0.3, 'MAESTRO! +500', '#fde047', 26)
            finishLevel()
          } else {
            w.seq.push(randomNote(w, w.seq[w.seq.length - 1], true))
            w.durs.push(1)
            w.beat = Math.max(0.3, w.beat * 0.97)
            beginDemo(0.3)
          }
        } else finishLevel()
        break
      case 'fail':
        if (w.dead) {
          die()
          return
        }
        if (w.echo) finishLevel()
        else beginDemo(0.4)
        break
    }
  }

  function shuffleKeys() {
    const w = world.current
    const n = w.keyCount
    const idx = Array.from({ length: n }, (_, i) => i)
    for (let tries = 0; tries < 10; tries++) {
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[idx[i], idx[j]] = [idx[j], idx[i]]
      }
      if (idx.some((v, i) => v !== i)) break
    }
    for (let i = 0; i < n; i++) w.order[i] = idx[i]
    w.shuffled = true
    setBanner({ key: Date.now(), text: 'SHUFFLE!', sub: 'follow the symbols' })
    sfx.whoosh()
  }

  function finishLevel() {
    const w = world.current
    if (w.echo) {
      // Echo rounds: stars by how long the tune grew.
      const len = w.echoLen
      const stars = len >= 10 ? 3 : len >= 6 ? 2 : 1
      run.completeLevel(w.level, stars)
      fx.text(size.current.w / 2, 160, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, '#fde047', 28)
    }
    if (w.level % 5 === 0) {
      if (w.hearts < w.maxHearts) {
        w.hearts += 1
        fx.text(size.current.w / 2, 120, '+1 HEART', '#fca5a5', 22)
      } else {
        w.replays += 1
        fx.text(size.current.w / 2, 120, '+1 REPLAY', '#67e8f9', 22)
      }
      sfx.levelUp()
      void trackEvent('action_milestone', { game_id: 'melody', kind: 'level', value: w.level })
    }
    nextLevel()
  }

  // ── Drawing ─────────────────────────────────────────────────
  const font = (s: number, wt = 800) => `${wt} ${s}px 'Plus Jakarta Sans', system-ui, sans-serif`

  function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
  }

  function drawMusicNote(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string, rot: number) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(rot)
    ctx.fillStyle = color
    ctx.strokeStyle = color
    ctx.beginPath()
    ctx.ellipse(0, 0, s * 0.5, s * 0.36, -0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.lineWidth = Math.max(1.5, s * 0.14)
    ctx.beginPath()
    ctx.moveTo(s * 0.42, -s * 0.1)
    ctx.lineTo(s * 0.42, -s * 1.4)
    ctx.quadraticCurveTo(s * 0.9, -s * 1.1, s * 0.95, -s * 0.6)
    ctx.stroke()
    ctx.restore()
  }

  function drawStage(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
    const w = world.current
    const th = THEMES[w.theme]
    const L = layout()
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, th.top)
    bg.addColorStop(0.5, th.bot)
    bg.addColorStop(1, '#0b0a1a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // Spotlights
    for (const s of [-1, 1]) {
      const sx = W / 2 + s * W * 0.45
      ctx.save()
      ctx.globalAlpha = 0.1 + 0.04 * Math.sin(t * 1.5 + s)
      const g = ctx.createLinearGradient(sx, 0, L.birdX, L.birdY + 40)
      g.addColorStop(0, th.light)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(sx - 8, 0)
      ctx.lineTo(sx + 8, 0)
      ctx.lineTo(L.birdX + 70, L.birdY + 60)
      ctx.lineTo(L.birdX - 70, L.birdY + 60)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }
    // Drifting staff
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1.2
    for (let i = 0; i < 5; i++) {
      const y = H * 0.1 + i * 9
      ctx.beginPath()
      for (let x = 0; x <= W; x += 12) {
        const yy = y + Math.sin(x * 0.02 + t * 0.8) * 6
        if (x === 0) ctx.moveTo(x, yy)
        else ctx.lineTo(x, yy)
      }
      ctx.stroke()
    }
    // Curtains on the sides
    for (const s of [0, 1]) {
      const x0 = s ? W : 0
      const dir = s ? -1 : 1
      const cg = ctx.createLinearGradient(x0, 0, x0 + dir * 40, 0)
      cg.addColorStop(0, '#7f1d1d')
      cg.addColorStop(1, 'rgba(127,29,29,0)')
      ctx.fillStyle = cg
      ctx.fillRect(s ? W - 40 : 0, 0, 40, L.stageBottom)
    }
    glow(ctx, L.birdX, L.birdY, L.birdR * 3, th.light, 0.25)
    // Perch
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(L.birdX - L.birdR * 2.4, L.birdY + L.birdR * 1.05)
    ctx.quadraticCurveTo(L.birdX, L.birdY + L.birdR * 0.85, L.birdX + L.birdR * 2.6, L.birdY + L.birdR * 1.15)
    ctx.stroke()
    ctx.fillStyle = '#22c55e'
    for (const [dx, dy, a] of [[-2.1, 0.95, -0.6], [2.2, 1.0, 0.5], [1.5, 0.95, -0.3]]) {
      ctx.beginPath()
      ctx.ellipse(L.birdX + dx * L.birdR, L.birdY + dy * L.birdR, 9, 4, a, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  function drawSlots(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const L = layout()
    const n = w.seq.length
    if (!n) return
    const s = clamp((L.W - 40) / n - 4, 14, 30)
    const total = n * (s + 4) - 4
    const x0 = L.W / 2 - total / 2
    const tgt = target()
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * (s + 4) + s / 2
      const cy = L.slotY
      let note = -1
      if (w.step === 'demo' && i < w.shown) note = w.seq[i]
      if ((w.step === 'input' || w.step === 'success' || w.step === 'fail') && i < w.inputIdx) note = tgt[i]
      if (w.step === 'success') note = tgt[i]
      const pop = note >= 0 && w.step === 'demo' && i === w.shown - 1 ? 1 + w.sing * 0.25 : 1
      ctx.fillStyle = note >= 0 ? KEYS[note].color : 'rgba(255,255,255,0.12)'
      ctx.beginPath()
      ctx.arc(cx, cy, (s / 2) * pop, 0, Math.PI * 2)
      ctx.fill()
      const cur = w.step === 'input' && i === w.inputIdx
      ctx.strokeStyle = cur ? '#fde047' : 'rgba(255,255,255,0.3)'
      ctx.lineWidth = cur ? 2.5 + Math.sin(t * 8) : 1.5
      ctx.stroke()
      if (note >= 0) drawSymbol(ctx, note, cx, cy, s * 0.26 * pop)
      else if (w.step !== 'demo' && w.step !== 'ready') {
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.font = font(Math.round(s * 0.5), 900)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('?', cx, cy + 1)
      }
      if (w.step === 'demo' || w.step === 'ready') {
        // Rhythm hint: long notes get a tail
        if (w.durs[i] > 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.35)'
          ctx.fillRect(cx - s * 0.3, cy + s * 0.62, s * 0.6, 2.5)
        }
      }
    }
    // Caption
    ctx.fillStyle = '#fff'
    ctx.font = font(15, 900)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const cap =
      w.step === 'ready' ? 'Get ready…' : w.step === 'demo' ? 'LISTEN & WATCH' : w.step === 'go' ? (w.shuffled ? 'Keys moved!' : 'YOUR TURN!') : w.step === 'input' ? (w.reverse ? 'Play it BACKWARDS' : w.echo ? `Echo ${w.seq.length}` : 'Play it back') : w.step === 'success' ? 'Bravo!' : w.echo ? 'Echo over' : 'Listen again…'
    ctx.globalAlpha = 0.95
    ctx.fillStyle = w.step === 'go' ? '#fde047' : '#fff'
    ctx.fillText(cap, L.W / 2, L.slotY - s / 2 - 14)
    ctx.globalAlpha = 1
  }

  function drawKeys(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const L = layout()
    const n = w.keyCount
    const areaH = L.xBottom - L.xTop
    // Rails
    ctx.fillStyle = '#78350f'
    for (const k of [0.22, 0.78]) {
      rr(ctx, 8, L.xTop + areaH * k - 5, L.W - 16, 10, 5)
      ctx.fill()
    }
    const guide = run.level('guide')
    const tgt = target()
    for (let pos = 0; pos < n; pos++) {
      const note = w.order[pos]
      const k = KEYS[note]
      const bw = Math.min(62, L.colW - 8)
      const bh = areaH * (0.96 - note * 0.045)
      const cx = 10 + w.keyX[pos] * L.colW + L.colW / 2 + Math.sin(t * 50) * w.shakeK[note] * 8
      const g = w.glowK[note]
      const bounce = 1 + g * 0.06
      const cy = L.xTop + areaH / 2 - g * 6
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(bounce, bounce)
      if (g > 0.05) glow(ctx, 0, 0, bh * 0.7, k.light, g * 0.6)
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      rr(ctx, -bw / 2 + 3, -bh / 2 + 6, bw, bh, 12)
      ctx.fill()
      const grad = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0)
      grad.addColorStop(0, g > 0.1 ? k.light : k.color)
      grad.addColorStop(0.5, k.color)
      grad.addColorStop(1, k.dark)
      ctx.fillStyle = grad
      rr(ctx, -bw / 2, -bh / 2, bw, bh, 12)
      ctx.fill()
      ctx.strokeStyle = w.shakeK[note] > 0.05 ? '#ef4444' : k.dark
      ctx.lineWidth = w.shakeK[note] > 0.05 ? 4 : 2
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.28)'
      rr(ctx, -bw / 2 + 5, -bh / 2 + 6, bw * 0.25, bh - 12, 6)
      ctx.fill()
      // Pegs on the rails
      ctx.fillStyle = '#e5e7eb'
      for (const kk of [0.22, 0.78]) {
        ctx.beginPath()
        ctx.arc(0, -areaH / 2 + areaH * kk + g * 6, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      drawSymbol(ctx, note, 0, bh * 0.05, Math.min(16, bw * 0.28))
      if (w.step === 'input' && w.inputIdx < guide && tgt[w.inputIdx] === note) {
        ctx.strokeStyle = '#fde047'
        ctx.lineWidth = 3
        ctx.globalAlpha = 0.45 + 0.35 * Math.sin(t * 6)
        rr(ctx, -bw / 2 - 4, -bh / 2 - 4, bw + 8, bh + 8, 14)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      ctx.restore()
    }
  }

  function drawReplay(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    if (w.step !== 'input' && w.step !== 'go') return
    const L = layout()
    const cx = L.W - 38
    const cy = L.stageBottom - 30
    const on = w.replays > 0
    ctx.globalAlpha = on ? 1 : 0.4
    ctx.fillStyle = on ? '#0e7490' : '#334155'
    ctx.beginPath()
    ctx.arc(cx, cy, 22 + (on ? Math.sin(t * 4) * 1.5 : 0), 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#67e8f9'
    ctx.lineWidth = 2
    ctx.stroke()
    // Ear / replay arrow icon
    ctx.strokeStyle = '#ecfeff'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.arc(cx, cy, 9, -Math.PI * 0.2, Math.PI * 1.4)
    ctx.stroke()
    ctx.fillStyle = '#ecfeff'
    ctx.beginPath()
    ctx.moveTo(cx + 9, cy - 9)
    ctx.lineTo(cx + 11, cy + 1)
    ctx.lineTo(cx + 2, cy - 3)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(cx + 16, cy - 16, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#422006'
    ctx.font = font(12, 900)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(w.replays), cx + 16, cy - 15.5)
    ctx.globalAlpha = 1
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const dt = fx.step(raw)
    const w = world.current
    // Smoothly slide keys to their (possibly shuffled) slots.
    for (let pos = 0; pos < 8; pos++) w.keyX[pos] = pos
    if (w.shuffled) {
      const k = clamp(w.step === 'go' ? w.stepT / 0.6 : 1, 0, 1)
      const e = k * k * (3 - 2 * k)
      for (let pos = 0; pos < w.keyCount; pos++) {
        const note = w.order[pos]
        // Keys start from their home slot (= note index) and glide to the new one.
        w.keyX[pos] = note + (pos - note) * e
      }
    }
    update(dt, raw)
    const ph = phaseRef.current
    if (ph === 'idle') {
      // Attract mode: the bird hums a little tune.
      const beat = Math.floor(t / 0.45)
      if (beat !== Math.floor((t - raw) / 0.45) && beat % 8 < 5) {
        const note = [0, 2, 3, 2, 1, 0, 3, 4][beat % 8] % w.keyCount
        w.glowK[note] = 1
        w.sing = 1
      }
    }
    const L = layout()
    drawStage(ctx, W, H, t)
    fx.applyShake(ctx)
    const singK = w.step === 'demo' || ph === 'idle' ? w.sing : w.sing * 0.6
    const bob = Math.sin(t * 2.2) * 3 - singK * 4
    drawBird(ctx, L.birdX, L.birdY + bob, L.birdR, t, singK, KEYS[w.seq[Math.max(0, w.demoIdx - 1)] ?? 0].color, w.mood)
    for (const n of w.notes) {
      ctx.globalAlpha = clamp(n.life, 0, 1)
      drawMusicNote(ctx, n.x, n.y, 12, KEYS[n.key].light, n.rot)
    }
    ctx.globalAlpha = 1
    if (ph !== 'idle') drawSlots(ctx, t)
    drawKeys(ctx, t)
    drawReplay(ctx, t)
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
                {hud.mult > 1 ? <span className="action-hud__small" style={{ color: '#f0abfc' }}>x{hud.mult}</span> : null}
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
              game="melody"
              icon={meta.icon}
              title={meta.title}
              hint="The bird sings a tune and the keys light up. Play it back in the same order — each key has its own colour and symbol."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.level >= 10 ? 'Virtuoso!' : 'Off key!'}
            subtitle={`Score ${hud.score} · Level ${hud.level}`}
            celebrate={hud.level >= 10}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
