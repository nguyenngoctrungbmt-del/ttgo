import { useEffect, useRef, useState, type PointerEvent } from 'react'
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
import { sfx } from '../../shared/sound'
import { useProgressStore } from '../../store/progressStore'
import { Synth } from './audio'
import { makeSong, type Ev, type Note, type Song } from './song'
import '../../shared/action/action.css'

const meta = getGame('beats')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Grade = 'perfect' | 'great' | 'good'

const LANE_COL = ['#22d3ee', '#e879f9', '#facc15', '#4ade80']
const LANE_DARK = ['#0e7490', '#a21caf', '#a16207', '#15803d']
const KEYS: Record<string, number> = { d: 0, f: 1, j: 2, k: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 }
const JUDGE_COL: Record<string, string> = { PERFECT: '#a5f3fc', GREAT: '#86efac', GOOD: '#fde68a', MISS: '#f87171', BREAK: '#fca5a5' }

type World = {
  songIdx: number
  seed: number
  song: Song
  events: Ev[]
  evIdx: number
  noteIdx: number
  pos: number
  /** 'song' playing, 'break' between songs, 'resume' frozen countdown after revive */
  mode: 'song' | 'break' | 'resume'
  modeT: number
  score: number
  combo: number
  maxCombo: number
  health: number
  fever: number
  feverT: number
  counts: { perfect: number; great: number; good: number; miss: number }
  laneFlash: number[]
  press: boolean[]
  holding: (Note | null)[]
  judge: { text: string; t: number }
  holdTick: number
  best: number
  bestShown: boolean
  stats: { songs: number; combo: number; perfects: number; fevers: number }
}

function countIn(song: Song): Ev[] {
  const beat = song.step * 4
  return [4, 3, 2, 1].map((k) => ({ t: -k * beat, v: 'hat' as const, f: 0, d: 0, vel: k === 1 ? 1.4 : 1 }))
}

function freshWorld(seed: number, idx = 0): World {
  const song = makeSong(idx, seed)
  return {
    songIdx: idx,
    seed,
    song,
    events: [...countIn(song), ...song.events],
    evIdx: 0,
    noteIdx: 0,
    pos: -song.step * 16 - 0.4,
    mode: 'song',
    modeT: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    health: 100,
    fever: 0,
    feverT: 0,
    counts: { perfect: 0, great: 0, good: 0, miss: 0 },
    laneFlash: [0, 0, 0, 0],
    press: [false, false, false, false],
    holding: [null, null, null, null],
    judge: { text: '', t: 0 },
    holdTick: 0,
    best: 0,
    bestShown: false,
    stats: { songs: 0, combo: 0, perfects: 0, fevers: 0 },
  }
}

const STARS = Array.from({ length: 50 }, (_, i) => ({ x: ((i * 7919) % 1000) / 1000, y: ((i * 104729) % 1000) / 1000, r: 0.5 + (i % 3) * 0.5 }))

export default function BeatsGame() {
  const run = useActionRun('beats')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const synth = useRef(new Synth()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld(1, 2))
  const phaseRef = useRef<Phase>('idle')
  const pointers = useRef(new Map<number, number>())

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, song: 1, style: '', acc: 100, mult: 1, songs: 0, maxCombo: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  const live = () => phaseRef.current === 'play'
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }
  function accuracy(w: World) {
    const c = w.counts
    const n = c.perfect + c.great + c.good + c.miss
    return n ? Math.round(((c.perfect + c.great * 0.7 + c.good * 0.4) / n) * 100) : 100
  }
  function mult(w: World) {
    return Math.min(4, 1 + Math.floor(w.combo / 10))
  }
  function pushHud() {
    const w = world.current
    setHud({ score: w.score, song: w.songIdx + 1, style: w.song.style.name, acc: accuracy(w), mult: mult(w) * (w.feverT > 0 ? 2 : 1), songs: w.stats.songs, maxCombo: w.maxCombo })
  }
  function windows() {
    const k = 1 + run.level('assist') * 0.1
    return { perfect: 0.045 * k, great: 0.09 * k, good: 0.14 * k }
  }

  function geo() {
    const { w: W, h: H } = size.current
    const hitY = H - Math.max(84, H * 0.15)
    const horizonY = H * 0.2
    const laneW = Math.min(W * 0.21, 88)
    const cx = W / 2
    return { W, H, hitY, horizonY, laneW, cx, left: cx - laneW * 2 }
  }
  const S0 = 1 / 3.4
  /** p: 0 at spawn (horizon) → 1 at hit line. Returns screen scale + y. */
  function proj(p: number) {
    const g = geo()
    const z = 1 - p
    const s = 1 / (1 + 2.4 * Math.max(-0.35, z))
    return { s, y: g.horizonY + (g.hitY - g.horizonY) * ((s - S0) / (1 - S0)) }
  }
  function laneX(lane: number, s: number) {
    const g = geo()
    return g.cx + (lane - 1.5) * g.laneW * s
  }

  // ── Lifecycle ─────────────────────────────────────────

  function introSong() {
    const w = world.current
    const s = w.song
    say(`SONG ${w.songIdx + 1}`, `${s.name} · ${s.style.name} · ${s.bpm} BPM`)
    synth.lead = s.style.lead
    synth.bassWave = s.style.bass
  }

  function start() {
    synth.ensure()
    synth.duck(false)
    const w = freshWorld(Math.floor(Math.random() * 1e6))
    w.best = useProgressStore.getState().games.beats?.bestScore ?? 0
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    introSong()
    pushHud()
    run.update(w.stats)
  }

  function die() {
    const w = world.current
    if (!live()) return
    setPhaseBoth('dying')
    pushHud()
    synth.duck(true)
    for (let i = 0; i < 4; i++) w.holding[i] = null
    const g = geo()
    fx.flash('#ef4444', 0.4)
    fx.shake(12, 0.5)
    fx.burst(g.cx, g.hitY, { count: 40, color: LANE_COL, speed: 380, gravity: 300, shape: 'spark' })
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.stats.songs * 7 + w.stats.perfects / 25 + w.maxCombo / 25) * (1 + run.level('fever') * 0.05))
      run.end({ score: w.score, cleared: w.stats.songs >= 2, stats: { ...w.stats }, coins }, revive)
    }, 1200)
  }

  /** Ad revive: refill health, clear the next notes and count back in. */
  function revive() {
    const w = world.current
    w.health = 65
    for (const n of w.song.notes) if (n.state === 0 && n.t < w.pos + 2.2) n.state = 3
    w.mode = 'resume'
    w.modeT = 1.6
    synth.ensure()
    say('REVIVED!', 'get ready')
    setPhaseBoth('play')
    pushHud()
  }

  function nextSong() {
    const w = world.current
    w.songIdx += 1
    w.song = makeSong(w.songIdx, w.seed)
    w.events = [...countIn(w.song), ...w.song.events]
    w.evIdx = 0
    w.noteIdx = 0
    w.pos = -w.song.step * 16 - 0.3
    w.counts = { perfect: 0, great: 0, good: 0, miss: 0 }
    w.mode = 'song'
    introSong()
    pushHud()
  }

  function songClear() {
    const w = world.current
    const acc = accuracy(w)
    const grade = acc >= 95 ? 'S' : acc >= 85 ? 'A' : acc >= 70 ? 'B' : 'C'
    const fc = w.counts.miss === 0
    const bonus = Math.round((500 + w.songIdx * 250) * (fc ? 2 : 1))
    w.score += bonus
    w.stats.songs += 1
    w.mode = 'break'
    w.modeT = 3.2
    w.health = Math.min(100, w.health + 20)
    say(fc ? 'FULL COMBO!' : `SONG CLEAR · ${grade}`, `${acc}% accuracy · +${bonus}`)
    const g = geo()
    fx.burst(g.cx, g.H * 0.4, { count: 50, color: [...LANE_COL, '#ffffff'], speed: 420, gravity: 260, shape: 'square', size: 5 })
    sfx.win()
    haptic.success()
    if (w.stats.songs % 3 === 0) void trackEvent('action_milestone', { game_id: 'beats', kind: 'songs', value: w.stats.songs })
    run.update(w.stats)
    pushHud()
  }

  // ── Judging ───────────────────────────────────────────

  function addScore(base: number) {
    const w = world.current
    w.score += base * mult(w) * (w.feverT > 0 ? 2 : 1)
    if (!w.bestShown && w.best > 0 && w.score > w.best) {
      w.bestShown = true
      say('NEW BEST!')
      sfx.mission()
    }
  }

  function addFever(v: number) {
    const w = world.current
    if (w.feverT > 0) return
    w.fever = clamp(w.fever + v, 0, 1)
    if (w.fever >= 1) {
      w.fever = 0
      w.feverT = 8 + run.level('fever') * 1.5
      w.stats.fevers += 1
      say('FEVER!', 'double score')
      fx.flash('#f0abfc', 0.25)
      sfx.power()
      haptic.success()
    }
  }

  function judge(n: Note, gr: Grade) {
    const w = world.current
    const lane = n.lane
    const p = proj(1)
    const x = laneX(lane, 1)
    w.combo += 1
    w.maxCombo = Math.max(w.maxCombo, w.combo)
    w.stats.combo = w.maxCombo
    w.counts[gr] += 1
    if (gr === 'perfect') w.stats.perfects += 1
    addScore(gr === 'perfect' ? 300 : gr === 'great' ? 200 : 100)
    addFever(gr === 'perfect' ? 0.04 : gr === 'great' ? 0.025 : 0.01)
    w.health = Math.min(100, w.health + (gr === 'perfect' ? 2 : gr === 'great' ? 1.4 : 0.5))
    w.judge = { text: gr.toUpperCase(), t: 1 }
    w.laneFlash[lane] = 1
    const c = LANE_COL[lane]
    fx.burst(x, p.y, { count: gr === 'perfect' ? 14 : 8, color: [c, '#ffffff'], speed: gr === 'perfect' ? 300 : 200, angle: -Math.PI / 2, spread: 2.2, shape: 'spark', gravity: 200 })
    fx.ring(x, p.y, { color: c, maxR: gr === 'perfect' ? 48 : 34, life: 0.3, width: 4 })
    if (w.combo > 0 && w.combo % 50 === 0) {
      say(`${w.combo} COMBO!`)
      sfx.combo()
      fx.shake(4, 0.2)
    }
    haptic.light()
    run.update(w.stats)
  }

  function missNote(n: Note, early = false) {
    const w = world.current
    n.state = 3
    if (w.combo >= 20) fx.shake(5, 0.2)
    w.combo = 0
    w.counts.miss += 1
    const dmg = (w.songIdx === 0 ? 5 : Math.min(12, 7 + w.songIdx * 0.6)) * (1 - run.level('heart') * 0.12) * (early ? 0.6 : 1)
    w.health -= w.feverT > 0 ? dmg * 0.5 : dmg
    w.fever = Math.max(0, w.fever - 0.1)
    w.judge = { text: early ? 'BREAK' : 'MISS', t: 1 }
    const x = laneX(n.lane, 1)
    fx.burst(x, geo().hitY, { count: 6, color: ['#f87171', '#7f1d1d'], speed: 120, gravity: 300 })
    if (synth.ctx) synth.dud(synth.ctx.currentTime)
    haptic.medium()
    if (w.health <= 0) {
      w.health = 0
      die()
    }
  }

  function pressLane(lane: number) {
    const w = world.current
    w.press[lane] = true
    if (!live() || w.mode !== 'song') return
    const win = windows()
    let best: Note | null = null
    let bestAbs = 9
    const notes = w.song.notes
    for (let i = w.noteIdx; i < notes.length; i++) {
      const n = notes[i]
      if (n.t - w.pos > win.good) break
      if (n.state !== 0 || n.lane !== lane) continue
      const a = Math.abs(w.pos - n.t)
      if (a <= win.good && a < bestAbs) {
        best = n
        bestAbs = a
      }
    }
    if (!best) {
      w.laneFlash[lane] = Math.max(w.laneFlash[lane], 0.35)
      // Way-too-early taps count against the incoming note, so mashing never pays.
      for (let i = w.noteIdx; i < notes.length; i++) {
        const n = notes[i]
        if (n.t - w.pos > win.good * 2.2) break
        if (n.state === 0 && n.lane === lane && n.t - w.pos > win.good) {
          missNote(n)
          pushHud()
          break
        }
      }
      return
    }
    const gr: Grade = bestAbs <= win.perfect ? 'perfect' : bestAbs <= win.great ? 'great' : 'good'
    if (best.hold > 0) {
      best.state = 1
      w.holding[lane] = best
    } else best.state = 2
    judge(best, gr)
    pushHud()
  }

  function releaseLane(lane: number) {
    const w = world.current
    w.press[lane] = false
    const n = w.holding[lane]
    if (!n) return
    w.holding[lane] = null
    if (!live()) return
    if (w.pos < n.t + n.hold - 0.12) missNote(n, true)
    else completeHold(n)
    pushHud()
  }

  function completeHold(n: Note) {
    const w = world.current
    n.state = 2
    w.holding[n.lane] = null
    addScore(150)
    const x = laneX(n.lane, 1)
    const y = geo().hitY
    fx.ring(x, y, { color: '#ffffff', maxR: 54, life: 0.35, width: 5 })
    fx.text(x, y - 50, 'HOLD!', LANE_COL[n.lane], 18)
    sfx.score(Math.min(10, w.combo / 5))
  }

  // ── Input ─────────────────────────────────────────────

  function laneAt(x: number) {
    const g = geo()
    return clamp(Math.floor((x - g.left) / g.laneW), 0, 3)
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!live()) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const lane = laneAt(localPoint(e, e.currentTarget).x)
    pointers.current.set(e.pointerId, lane)
    pressLane(lane)
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const lane = pointers.current.get(e.pointerId)
    if (lane == null) return
    pointers.current.delete(e.pointerId)
    if (![...pointers.current.values()].includes(lane)) releaseLane(lane)
  }

  useEffect(() => {
    function dn(e: KeyboardEvent) {
      const l = KEYS[e.key]
      if (l == null || !live()) return
      e.preventDefault()
      if (!e.repeat) pressLane(l)
    }
    function up(e: KeyboardEvent) {
      const l = KEYS[e.key]
      if (l == null) return
      releaseLane(l)
    }
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', dn)
      window.removeEventListener('keyup', up)
      synth.close()
    }
  }, [])

  // ── Simulation ────────────────────────────────────────

  function schedule() {
    const w = world.current
    if (!synth.ready) return
    synth.syncMute()
    const ctx = synth.ctx!
    const lat = synth.latency
    const evs = w.events
    while (w.evIdx < evs.length && evs[w.evIdx].t <= w.pos + 0.12) {
      const e = evs[w.evIdx++]
      if (e.t < w.pos - 0.03) continue
      synth.play(e.v, ctx.currentTime + (e.t - w.pos) - lat, e.f, e.d, e.vel)
    }
  }

  function update(raw: number) {
    const w = world.current
    const ph = phaseRef.current
    for (let i = 0; i < 4; i++) w.laneFlash[i] = Math.max(0, w.laneFlash[i] - raw * 4)
    w.judge.t = Math.max(0, w.judge.t - raw * 1.6)

    if (ph === 'idle') {
      // Attract mode: the demo chart plays itself silently.
      w.pos += raw
      for (let i = w.noteIdx; i < w.song.notes.length; i++) {
        const n = w.song.notes[i]
        if (n.t > w.pos) break
        if (n.state === 0) {
          n.state = 2
          w.laneFlash[n.lane] = 1
          const p = proj(1)
          fx.burst(laneX(n.lane, 1), p.y, { count: 6, color: [LANE_COL[n.lane], '#fff'], speed: 200, angle: -Math.PI / 2, spread: 2, shape: 'spark' })
        }
      }
      if (w.pos > w.song.length) {
        for (const n of w.song.notes) n.state = 0
        w.pos = -1
      }
      return
    }
    if (ph !== 'play') return

    if (w.mode === 'resume') {
      w.modeT -= raw
      if (w.modeT <= 0) {
        w.mode = 'song'
        w.evIdx = w.events.findIndex((e) => e.t >= w.pos)
        if (w.evIdx < 0) w.evIdx = w.events.length
        synth.duck(false)
      }
      return
    }
    if (w.mode === 'break') {
      w.modeT -= raw
      if (w.modeT <= 0) nextSong()
      return
    }

    w.pos += raw
    schedule()
    const win = windows()
    const notes = w.song.notes
    for (let i = w.noteIdx; i < notes.length; i++) {
      const n = notes[i]
      if (n.t > w.pos) break
      if (n.state === 0 && w.pos - n.t > win.good) {
        missNote(n)
        if (!live()) return
      }
    }
    while (w.noteIdx < notes.length && notes[w.noteIdx].state >= 2) w.noteIdx++
    // Holds
    w.holdTick -= raw
    const tick = w.holdTick <= 0
    if (tick) w.holdTick = w.song.step * 2
    for (let l = 0; l < 4; l++) {
      const n = w.holding[l]
      if (!n) continue
      if (w.pos >= n.t + n.hold) completeHold(n)
      else if (tick) {
        addScore(10)
        addFever(0.006)
        fx.burst(laneX(l, 1), geo().hitY, { count: 2, color: [LANE_COL[l], '#fff'], speed: 150, angle: -Math.PI / 2, spread: 0.8, gravity: 100 })
      }
    }
    if (w.feverT > 0) {
      w.feverT = Math.max(0, w.feverT - raw)
      w.health = Math.min(100, w.health + raw * 2)
    }
    if (w.pos > w.song.length + 0.6) songClear()
    if (tick) pushHud()
  }

  // ── Drawing ───────────────────────────────────────────

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    fx.step(raw)
    update(raw)
    const w = world.current
    const g = geo()
    const st = w.song.style
    const beat = w.song.step * 4
    const bp = w.pos >= 0 ? (w.pos % beat) / beat : ((w.pos % beat) + beat) / beat
    const pulse = w.mode === 'song' ? Math.exp(-bp * 5) : 0.1
    const fever = w.feverT > 0

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, g.horizonY + 20)
    sky.addColorStop(0, st.top)
    sky.addColorStop(1, st.bot)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, g.horizonY + 20)
    ctx.fillStyle = '#ffffff'
    for (const s of STARS) {
      ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 0.8 + s.x * 20))
      ctx.fillRect(s.x * W, s.y * g.horizonY, s.r, s.r)
    }
    ctx.globalAlpha = 1
    // Sun with stripes
    const sunR = Math.min(W * 0.22, 90) * (1 + pulse * 0.04)
    glow(ctx, g.cx, g.horizonY, sunR * 2, st.sun, 0.35 + pulse * 0.2)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, W, g.horizonY)
    ctx.clip()
    const sg = ctx.createLinearGradient(0, g.horizonY - sunR, 0, g.horizonY)
    sg.addColorStop(0, '#fef08a')
    sg.addColorStop(1, st.sun)
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.arc(g.cx, g.horizonY, sunR, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = st.bot
    for (let i = 0; i < 5; i++) {
      const yy = g.horizonY - sunR * 0.12 - i * sunR * 0.17
      ctx.fillRect(g.cx - sunR, yy, sunR * 2, 2 + (4 - i) * 0.8)
    }
    // Mountains
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.moveTo(0, g.horizonY)
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, g.horizonY - 14 - Math.abs(Math.sin(x * 0.021 + 1)) * 26 - Math.sin(x * 0.07) * 4)
    ctx.lineTo(W, g.horizonY)
    ctx.fill()
    ctx.restore()

    // Floor
    const floor = ctx.createLinearGradient(0, g.horizonY, 0, H)
    floor.addColorStop(0, '#0b0620')
    floor.addColorStop(1, '#05030f')
    ctx.fillStyle = floor
    ctx.fillRect(0, g.horizonY, W, H - g.horizonY)

    fx.applyShake(ctx)

    // Floor grid scrolling with the beat
    ctx.strokeStyle = st.grid
    ctx.lineWidth = 1
    for (let k = 0; k < 10; k++) {
      const tt = Math.ceil(w.pos / beat) * beat + k * beat
      const p = 1 - (tt - w.pos) / w.song.approach
      if (p < 0 || p > 1.4) continue
      const pr = proj(p)
      ctx.globalAlpha = Math.min(1, pr.s * 0.6) * (0.25 + pulse * 0.3)
      ctx.beginPath()
      ctx.moveTo(0, pr.y)
      ctx.lineTo(W, pr.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 0.18
    for (let k = -6; k <= 6; k++) {
      ctx.beginPath()
      ctx.moveTo(g.cx + k * g.laneW * S0, g.horizonY)
      ctx.lineTo(g.cx + k * g.laneW * 1.3, H)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Side equalizers
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 6; i++) {
        const hgt = (14 + Math.abs(Math.sin(t * 3 + i * 1.7 + side)) * 30) * (0.6 + pulse * 0.8) * (fever ? 1.4 : 1)
        const x = side < 0 ? 8 + i * 7 : W - 12 - i * 7
        ctx.fillStyle = LANE_COL[i % 4]
        ctx.globalAlpha = 0.5
        ctx.fillRect(x, g.hitY + 30 - hgt, 4, hgt)
      }
    }
    ctx.globalAlpha = 1

    // Highway
    const bottom = proj(1.25)
    const lanePoly = (l0: number, l1: number, y0: number, s0: number, y1: number, s1: number) => {
      ctx.beginPath()
      ctx.moveTo(g.cx + (l0 - 2) * g.laneW * s0, y0)
      ctx.lineTo(g.cx + (l1 - 2) * g.laneW * s0, y0)
      ctx.lineTo(g.cx + (l1 - 2) * g.laneW * s1, y1)
      ctx.lineTo(g.cx + (l0 - 2) * g.laneW * s1, y1)
      ctx.closePath()
    }
    for (let l = 0; l < 4; l++) {
      lanePoly(l, l + 1, g.horizonY, S0, bottom.y, bottom.s)
      ctx.fillStyle = l % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)'
      ctx.fill()
      if (w.laneFlash[l] > 0 || w.press[l]) {
        const a = Math.max(w.laneFlash[l], w.press[l] ? 0.35 : 0)
        const lg = ctx.createLinearGradient(0, g.horizonY, 0, g.hitY)
        lg.addColorStop(0, 'rgba(0,0,0,0)')
        lg.addColorStop(1, LANE_COL[l])
        ctx.globalAlpha = a * 0.4
        ctx.fillStyle = lg
        lanePoly(l, l + 1, g.horizonY, S0, g.hitY, 1)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
    // Dividers
    ctx.lineWidth = 2
    for (let l = 0; l <= 4; l++) {
      const hue = fever ? `hsl(${(t * 200 + l * 60) % 360} 90% 65%)` : l === 0 || l === 4 ? st.grid : 'rgba(255,255,255,0.25)'
      ctx.strokeStyle = hue
      ctx.globalAlpha = l === 0 || l === 4 ? 0.8 + pulse * 0.2 : 0.6
      ctx.beginPath()
      ctx.moveTo(g.cx + (l - 2) * g.laneW * S0, g.horizonY)
      ctx.lineTo(g.cx + (l - 2) * g.laneW * bottom.s, bottom.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1

    // Receptors
    for (let l = 0; l < 4; l++) {
      const x = laneX(l, 1)
      const on = w.press[l] || w.laneFlash[l] > 0.5
      const rw = g.laneW * 0.86 * (on ? 1.06 : 1)
      const rh = 22 * (on ? 1.1 : 1)
      ctx.fillStyle = on ? LANE_COL[l] : 'rgba(255,255,255,0.08)'
      ctx.strokeStyle = LANE_COL[l]
      ctx.lineWidth = 3
      ctx.globalAlpha = on ? 0.9 : 0.8 + pulse * 0.2
      ctx.beginPath()
      ctx.roundRect(x - rw / 2, g.hitY - rh / 2, rw, rh, 10)
      ctx.fill()
      ctx.stroke()
      ctx.globalAlpha = 1
      if (on) glow(ctx, x, g.hitY, g.laneW * 0.9, LANE_COL[l], 0.35)
    }

    // Notes (far first)
    const ap = w.song.approach
    const notes = w.song.notes
    const visible: Note[] = []
    for (let i = w.noteIdx; i < notes.length; i++) {
      const n = notes[i]
      if (n.t - w.pos > ap) break
      if (n.state >= 2 && !(n.state === 3 && w.pos - n.t < 0.25)) continue
      visible.push(n)
    }
    for (let i = visible.length - 1; i >= 0; i--) {
      const n = visible[i]
      const pHead = n.state === 1 ? 1 : 1 - (n.t - w.pos) / ap
      if (n.hold > 0) {
        const pTail = Math.max(0, 1 - (n.t + n.hold - w.pos) / ap)
        if (pTail < pHead) {
          const a = proj(Math.max(0, pTail))
          const b = proj(pHead)
          const hw = g.laneW * 0.28
          ctx.globalAlpha = n.state === 3 ? 0.25 : n.state === 1 ? 0.85 : 0.6
          const rg = ctx.createLinearGradient(0, a.y, 0, b.y)
          rg.addColorStop(0, LANE_DARK[n.lane])
          rg.addColorStop(1, LANE_COL[n.lane])
          ctx.fillStyle = rg
          ctx.beginPath()
          ctx.moveTo(laneX(n.lane, a.s) - hw * a.s, a.y)
          ctx.lineTo(laneX(n.lane, a.s) + hw * a.s, a.y)
          ctx.lineTo(laneX(n.lane, b.s) + hw * b.s, b.y)
          ctx.lineTo(laneX(n.lane, b.s) - hw * b.s, b.y)
          ctx.closePath()
          ctx.fill()
          if (n.state === 1) {
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 2
            ctx.stroke()
          }
          ctx.globalAlpha = 1
          // Tail cap
          ctx.fillStyle = LANE_COL[n.lane]
          ctx.beginPath()
          ctx.ellipse(laneX(n.lane, a.s), a.y, hw * a.s * 1.3, 5 * a.s, 0, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      if (pHead < 0) continue
      const pr = proj(pHead)
      const x = laneX(n.lane, pr.s)
      const nw = g.laneW * 0.82 * pr.s
      const nh = 20 * pr.s
      const miss = n.state === 3
      ctx.globalAlpha = miss ? 0.35 : 1
      if (!miss && pr.s > 0.6) glow(ctx, x, pr.y, nw * 0.9, LANE_COL[n.lane], 0.25)
      const ng = ctx.createLinearGradient(0, pr.y - nh / 2, 0, pr.y + nh / 2)
      ng.addColorStop(0, '#ffffff')
      ng.addColorStop(0.35, miss ? '#64748b' : LANE_COL[n.lane])
      ng.addColorStop(1, miss ? '#334155' : LANE_DARK[n.lane])
      ctx.fillStyle = ng
      ctx.beginPath()
      ctx.roundRect(x - nw / 2, pr.y - nh / 2, nw, nh, nh * 0.45)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.beginPath()
      ctx.roundRect(x - nw * 0.32, pr.y - nh * 0.32, nw * 0.64, nh * 0.18, nh * 0.1)
      ctx.fill()
      if (n.dbl && !miss) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    // Double-note connectors
    for (let i = 0; i + 1 < visible.length; i++) {
      const a = visible[i]
      const b = visible[i + 1]
      if (!a.dbl || !b.dbl || a.state !== 0 || b.state !== 0 || Math.abs(a.t - b.t) > 0.001) continue
      const pr = proj(1 - (a.t - w.pos) / ap)
      if (pr.s < S0) continue
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = 3 * pr.s
      ctx.beginPath()
      ctx.moveTo(laneX(a.lane, pr.s), pr.y)
      ctx.lineTo(laneX(b.lane, pr.s), pr.y)
      ctx.stroke()
    }

    fx.draw(ctx)
    ctx.restore()

    // UI: health + fever bars
    const ph = phaseRef.current
    if (ph !== 'idle') {
      const bw = Math.min(W * 0.56, 230)
      const bx = (W - bw) / 2
      const by = 72
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.beginPath()
      ctx.roundRect(bx - 3, by - 3, bw + 6, 20, 8)
      ctx.fill()
      const hv = clamp(w.health / 100, 0, 1)
      const hc = hv > 0.5 ? '#4ade80' : hv > 0.25 ? '#facc15' : Math.floor(t * 8) % 2 ? '#ef4444' : '#f87171'
      ctx.fillStyle = hc
      ctx.beginPath()
      ctx.roundRect(bx, by, Math.max(6, bw * hv), 8, 4)
      ctx.fill()
      const fv = fever ? w.feverT / (8 + run.level('fever') * 1.5) : w.fever
      const fg = ctx.createLinearGradient(bx, 0, bx + bw, 0)
      fg.addColorStop(0, '#22d3ee')
      fg.addColorStop(0.5, '#e879f9')
      fg.addColorStop(1, '#facc15')
      ctx.fillStyle = fg
      ctx.globalAlpha = fever ? 0.7 + Math.sin(t * 20) * 0.3 : 0.9
      ctx.beginPath()
      ctx.roundRect(bx, by + 10, Math.max(4, bw * fv), 4, 2)
      ctx.fill()
      ctx.globalAlpha = 1
      // Song progress
      const sp = clamp(w.pos / w.song.length, 0, 1)
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.fillRect(bx, by + 18, bw, 2)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(bx, by + 18, bw * sp, 2)

      // Combo + judgement
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      if (w.combo >= 5) {
        const cs = 1 + pulse * 0.08
        ctx.font = `900 ${Math.round(38 * cs)}px 'Plus Jakarta Sans', system-ui, sans-serif`
        ctx.fillStyle = fever ? `hsl(${(t * 220) % 360} 90% 70%)` : '#ffffff'
        ctx.globalAlpha = 0.9
        ctx.fillText(String(w.combo), g.cx, H * 0.36)
        ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.fillText(`COMBO · ×${mult(w) * (fever ? 2 : 1)}`, g.cx, H * 0.36 + 26)
        ctx.globalAlpha = 1
      }
      if (w.judge.t > 0) {
        const k = w.judge.t
        const pop = k > 0.85 ? 1 + (k - 0.85) * 2 : 1
        ctx.globalAlpha = Math.min(1, k * 2)
        ctx.font = `900 ${Math.round(24 * pop)}px 'Plus Jakarta Sans', system-ui, sans-serif`
        ctx.lineWidth = 4
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'
        ctx.strokeText(w.judge.text, g.cx, g.hitY - 64)
        ctx.fillStyle = JUDGE_COL[w.judge.text] ?? '#fff'
        ctx.fillText(w.judge.text, g.cx, g.hitY - 64)
        ctx.globalAlpha = 1
      }
      if (w.mode === 'resume' || (w.mode === 'song' && w.pos < 0)) {
        const n = w.mode === 'resume' ? Math.ceil(w.modeT / 0.55) : Math.ceil(-w.pos / beat)
        if (n > 0 && n <= 4) {
          ctx.font = "900 54px 'Plus Jakarta Sans', system-ui, sans-serif"
          ctx.fillStyle = '#ffffff'
          ctx.globalAlpha = 0.85
          ctx.fillText(String(n), g.cx, H * 0.5)
          ctx.globalAlpha = 1
        }
      }
      if (fever) {
        ctx.strokeStyle = `hsl(${(t * 200) % 360} 90% 65%)`
        ctx.lineWidth = 6
        ctx.globalAlpha = 0.5 + pulse * 0.4
        ctx.strokeRect(3, 3, W - 6, H - 6)
        ctx.globalAlpha = 1
      }
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Song {hud.song} · {hud.style}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">{hud.acc}%</span>
                <span className="action-hud__small" style={{ color: '#f0abfc' }}>
                  ×{hud.mult}
                </span>
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
              game="beats"
              icon={meta.icon}
              title={meta.title}
              hint="Tap the lanes as notes hit the line — hold the long ones. Songs get faster as the setlist goes on."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.songs >= 2 ? 'Encore!' : 'Track over'}
            subtitle={`Score ${hud.score} · ${hud.songs} songs · best combo ${hud.maxCombo}`}
            celebrate={hud.songs >= 2}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
