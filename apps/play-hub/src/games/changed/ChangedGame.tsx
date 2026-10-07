import { useRef, useState } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'
import { Hearts, ICONS, PowerBar, checkMark, drawSym, phasePill, rr } from '../matrix/memkit'
import { THEMES, THEME_NAME, drawBackdrop, drawObj, type Theme } from './art'
import { SIGNATURE, type SceneSig } from './levels'
import { genScene, type Change, type ChangeType, type Obj } from './scene'

const meta = getGame('changed')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Sub = 'intro' | 'study' | 'blink' | 'find' | 'reveal'
type Mark = { x: number; y: number; t: number }

const LABEL: Record<ChangeType, string> = { move: 'MOVED', vanish: 'GONE', appear: 'NEW', color: 'COLOUR', turn: 'TURNED' }

type World = {
  level: number
  bonus: boolean
  sig: SceneSig | null
  /** Peek or Hint used on this level (costs the third star). */
  helped: boolean
  theme: Theme
  cols: number
  rows: number
  before: Obj[]
  after: Obj[]
  changes: Change[]
  sub: Sub
  subT: number
  memo: number
  findT: number
  mistakes: number
  hearts: number
  maxHearts: number
  peeks: number
  hints: number
  peekT: number
  streak: number
  score: number
  marks: Mark[]
  lastMilestone: number
  stats: { score: number; level: number; changes: number; perfect: number; streak: number }
}

function gridFor(w: number, h: number) {
  const cols = 4
  const rows = clamp(Math.round(h / (w / cols)), 4, 6)
  return { cols, rows }
}

function freshWorld(): World {
  return {
    level: 0,
    bonus: false,
    sig: null,
    helped: false,
    theme: 'room',
    cols: 4,
    rows: 5,
    before: [],
    after: [],
    changes: [],
    sub: 'intro',
    subT: 0,
    memo: 4,
    findT: 0,
    mistakes: 0,
    hearts: 3,
    maxHearts: 3,
    peeks: 1,
    hints: 1,
    peekT: 0,
    streak: 0,
    score: 0,
    marks: [],
    lastMilestone: 0,
    stats: { score: 0, level: 0, changes: 0, perfect: 0, streak: 0 },
  }
}

export default function ChangedGame() {
  const run = useActionRun('changed')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const demo = useRef<{ theme: Theme; objs: Obj[]; t: number; i: number }>({ theme: 'aquarium', objs: [], t: 0, i: 0 })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hearts: 3, max: 3, streak: 0, peeks: 0, hints: 0, find: false, label: '' })
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
    setHud({ score: w.score, level: w.level, hearts: w.hearts, max: w.maxHearts, streak: w.streak, peeks: w.peeks, hints: w.hints, find: w.sub === 'find', label: w.bonus ? 'Bonus round' : w.sig ? w.sig.name.replace('Boss · ', 'Boss: ') : THEME_NAME[w.theme] })
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: performance.now(), text, sub })
  }

  function stage() {
    const { w: W, h: H } = size.current
    const x = 12
    const y = 116
    const w = W - 24
    const h = Math.max(220, H - y - 92)
    return { x, y, w, h }
  }

  function toPx(o: { cx: number; cy: number }, cols: number, rows: number) {
    const st = stage()
    const cw = st.w / cols
    const ch = st.h / rows
    return { x: st.x + o.cx * cw, y: st.y + o.cy * ch, unit: Math.min(cw, ch) }
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.maxHearts = 3 + run.level('heart')
    w.hearts = w.maxHearts
    w.peeks = 1 + run.level('kit')
    w.hints = 1 + run.level('kit')
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
    const sig = SIGNATURE[L] ?? null
    w.sig = sig
    w.helped = false
    // Signature bosses replace the safe bonus round: hearts are at stake but points are doubled.
    w.bonus = L % 5 === 0 && !sig?.boss
    w.theme = sig?.theme ?? THEMES[(L - 1) % THEMES.length]
    const st = stage()
    const g = gridFor(st.w, st.h)
    w.cols = g.cols
    w.rows = g.rows
    const sc = genScene(L, w.cols, w.rows, w.theme, w.bonus, sig ?? {})
    w.before = sc.before
    w.after = sc.after
    w.changes = sc.changes
    w.mistakes = 0
    w.peekT = 0
    w.findT = 0
    w.marks = []
    w.memo = (Math.max(2.4, 5 - L * 0.13) + run.level('focus') * 0.5 + (w.changes.length - 1) * 0.6 + w.before.length * 0.08) * (sig?.memo ?? 1)
    w.sub = 'intro'
    w.subT = 0.9
    const n = w.changes.length
    if (sig?.boss) showBanner(`BOSS · LEVEL ${L}`, `${sig.name.replace('Boss · ', '')} · ${sig.sub}`)
    else if (sig) showBanner(sig.name.toUpperCase(), `Level ${L} · ${sig.sub}`)
    else if (isNew && L === 3) showBanner('NEW: MOVES', 'objects can move')
    else if (isNew && L === 5) showBanner('BONUS ROUND', 'no hearts lost · colour changes')
    else if (isNew && L === 7) showBanner('NEW: TURNS', 'objects can flip or tilt')
    else if (isNew && L === 9) showBanner('TWO CHANGES', 'find them both')
    else if (isNew && L === 15) showBanner('THREE CHANGES', 'sharp eyes!')
    else if (w.bonus) showBanner('BONUS ROUND', `${n} changes · no hearts lost`)
    else showBanner(`LEVEL ${L}`, L === 1 ? 'remember everything' : `${THEME_NAME[w.theme]} · ${n} change${n > 1 ? 's' : ''}`)
    sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function finishRound() {
    const w = world.current
    w.sub = 'reveal'
    w.subT = 1.4
    const perfect = w.mistakes === 0
    const boss = !!w.sig?.boss
    const gain = Math.round((40 + w.level * 10) * mult(w) * (w.bonus || boss ? 2 : 1))
    w.score += gain
    // Stars: spot them all = 1, no wrong taps = +1, no Peek/Hint = +1.
    const stars = 1 + (perfect ? 1 : 0) + (w.helped ? 0 : 1)
    run.completeLevel(w.level, stars)
    const starTxt = `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  +${gain}`
    if (perfect) {
      w.streak += 1
      w.stats.perfect += 1
      w.stats.streak = Math.max(w.stats.streak, w.streak)
      showBanner(boss ? 'BOSS BEATEN!' : w.streak >= 2 ? `PERFECT ×${w.streak}` : 'PERFECT!', starTxt)
      sfx.combo()
      if (w.streak % 3 === 0) {
        w.peeks += 1
        fx.text(size.current.w / 2, stage().y + 30, '+1 PEEK', '#fde047', 18)
        sfx.power()
      }
    } else {
      w.streak = 0
      showBanner(boss ? 'BOSS BEATEN!' : 'SPOTTED!', starTxt)
      sfx.levelUp()
    }
    if (w.bonus || boss) w.hints += 1
    fx.slowmo(0.25, 0.5)
    haptic.success()
    w.stats.score = w.score
    if (w.level % 5 === 0 && w.level > w.lastMilestone) {
      w.lastMilestone = w.level
      void trackEvent('action_milestone', { game_id: 'changed', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  function foundChange(ch: Change) {
    const w = world.current
    ch.found = true
    ch.t = 1
    const p = toPx(ch.pts[0], w.cols, w.rows)
    w.stats.changes += 1
    const quick = Math.max(0, 1 - w.findT / 8)
    const pts = Math.round(30 * mult(w) * (1 + quick * 0.5) * (w.bonus || w.sig?.boss ? 2 : 1))
    w.score += pts
    w.stats.score = w.score
    fx.burst(p.x, p.y, { count: 18, color: ['#4ade80', '#bbf7d0', '#fde047', '#ffffff'], speed: 220, shape: 'spark' })
    fx.ring(p.x, p.y, { color: '#4ade80', maxR: p.unit * 0.8, life: 0.4, width: 4 })
    fx.text(p.x, p.y - p.unit * 0.55, `${LABEL[ch.type]} +${pts}`, '#bbf7d0', 16)
    fx.stop(0.04)
    sfx.score(w.stats.changes % 8)
    sfx.match()
    haptic.medium()
    run.update(w.stats)
    pushHud()
    if (w.changes.every((c) => c.found)) finishRound()
  }

  function tapAt(x: number, y: number) {
    const w = world.current
    let best: Change | null = null
    let bd = Infinity
    for (const ch of w.changes) {
      for (const pt of ch.pts) {
        const p = toPx(pt, w.cols, w.rows)
        const d = Math.hypot(p.x - x, p.y - y)
        const r = Math.max(34, p.unit * 0.55)
        if (d < r && d < bd) {
          bd = d
          best = ch
        }
      }
    }
    if (best) {
      if (!best.found) foundChange(best)
      return
    }
    // Wrong spot.
    w.mistakes += 1
    w.marks.push({ x, y, t: 1 })
    fx.burst(x, y, { count: 8, color: ['#f87171', '#fecaca'], speed: 120, size: 3 })
    fx.shake(7, 0.22)
    sfx.miss()
    haptic.error()
    if (w.bonus) {
      fx.text(x, y - 24, 'SAFE', '#fde047', 16)
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
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.4)
    fx.slowmo(0.8, 0.3)
    sfx.lose()
    haptic.heavy()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.level * 2 + w.stats.perfect * 1.5 + w.stats.changes * 0.3)
      run.end({ score: w.score, cleared: w.level >= 10, stats: { ...w.stats, level: w.level }, coins }, revive)
    }, 1500)
  }

  /** Ad revive: two hearts and a fresh study of the same level. */
  function revive() {
    const w = world.current
    w.hearts = Math.min(w.maxHearts, 2)
    fx.reset()
    setPhaseBoth('play')
    startLevel(w.level)
    showBanner('REVIVED!', '+2 hearts · study again')
    pushHud()
  }

  function applyPower(id: string) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.sub !== 'find') return
    if (id === 'peek' && w.peeks > 0 && w.peekT <= 0) {
      w.peeks -= 1
      w.helped = true
      w.peekT = 1.1
      sfx.flip()
      haptic.medium()
    } else if (id === 'hint' && w.hints > 0) {
      const ch = w.changes.find((c) => !c.found)
      if (!ch) return
      w.hints -= 1
      w.helped = true
      sfx.power()
      foundChange(ch)
    }
    pushHud()
  }

  function onPointerDown(e: React.PointerEvent) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.sub !== 'find' || w.peekT > 0) return
    const p = localPoint(e, arenaRef.current!)
    const st = stage()
    if (p.x < st.x || p.y < st.y || p.x > st.x + st.w || p.y > st.y + st.h) return
    tapAt(p.x, p.y)
  }

  // ── Drawing ──────────────────────────────────────────

  function drawScene(ctx: CanvasRenderingContext2D, theme: Theme, objs: Obj[], cols: number, rows: number, t: number) {
    const st = stage()
    ctx.save()
    rr(ctx, st.x, st.y, st.w, st.h, 14)
    ctx.clip()
    drawBackdrop(ctx, theme, st.x, st.y, st.w, st.h, t)
    const sorted = [...objs].sort((a, b) => a.cy - b.cy)
    for (const o of sorted) {
      const p = toPx(o, cols, rows)
      const s = o.s * p.unit
      ctx.fillStyle = 'rgba(0,0,0,0.18)'
      ctx.beginPath()
      ctx.ellipse(p.x, p.y + s * 0.48, s * 0.4, s * 0.09, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(o.rot)
      ctx.scale(o.flip, 1)
      drawObj(ctx, o.kind, s, o.color, t + o.id)
      ctx.restore()
    }
    ctx.restore()
  }

  function drawFrame(ctx: CanvasRenderingContext2D) {
    const st = stage()
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    rr(ctx, st.x - 6, st.y - 2, st.w + 12, st.h + 12, 18)
    ctx.fill()
    const g = ctx.createLinearGradient(0, st.y - 8, 0, st.y + st.h + 8)
    g.addColorStop(0, '#f8fafc')
    g.addColorStop(1, '#cbd5e1')
    ctx.fillStyle = g
    rr(ctx, st.x - 6, st.y - 6, st.w + 12, st.h + 12, 18)
    ctx.fill()
  }

  function drawEyelids(ctx: CanvasRenderingContext2D, k: number) {
    if (k <= 0) return
    const st = stage()
    const half = (st.h / 2) * k
    ctx.save()
    rr(ctx, st.x, st.y, st.w, st.h, 14)
    ctx.clip()
    ctx.fillStyle = '#1e1b4b'
    ctx.beginPath()
    ctx.moveTo(st.x, st.y)
    ctx.lineTo(st.x + st.w, st.y)
    ctx.lineTo(st.x + st.w, st.y + half)
    ctx.quadraticCurveTo(st.x + st.w / 2, st.y + half * 1.25 + 8, st.x, st.y + half)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(st.x, st.y + st.h)
    ctx.lineTo(st.x + st.w, st.y + st.h)
    ctx.lineTo(st.x + st.w, st.y + st.h - half)
    ctx.quadraticCurveTo(st.x + st.w / 2, st.y + st.h - half * 1.25 - 8, st.x, st.y + st.h - half)
    ctx.closePath()
    ctx.fill()
    // Lashes on the closing lid
    if (k > 0.85) {
      ctx.strokeStyle = '#a5b4fc'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      const cy = st.y + st.h / 2
      ctx.beginPath()
      ctx.moveTo(st.x + st.w * 0.2, cy)
      ctx.quadraticCurveTo(st.x + st.w / 2, cy + 18, st.x + st.w * 0.8, cy)
      ctx.stroke()
      for (let i = 0; i < 7; i++) {
        const lx = st.x + st.w * (0.26 + i * 0.08)
        const ly = cy + Math.sin(((i + 0.5) / 7) * Math.PI) * 13
        ctx.beginPath()
        ctx.moveTo(lx, ly)
        ctx.lineTo(lx + (i - 3) * 2, ly + 10)
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const w = world.current
    const idle = ph === 'idle'

    // ── Update ──
    let blinkK = 0
    if (idle) {
      const d = demo.current
      d.t -= raw
      if (d.t <= 0 || d.objs.length === 0) {
        d.t = 4
        d.i += 1
        d.theme = THEMES[d.i % THEMES.length]
        const st = stage()
        const g = gridFor(st.w, st.h)
        d.objs = genScene(8, g.cols, g.rows, d.theme, false).before
        w.cols = g.cols
        w.rows = g.rows
      }
      if (d.t > 3.7) blinkK = (d.t - 3.7) / 0.3
      else if (d.t < 0.3) blinkK = 1 - d.t / 0.3
    } else if (ph === 'play') {
      if (w.sub === 'intro') {
        w.subT -= dt
        blinkK = Math.max(0, w.subT / 0.9)
        if (w.subT <= 0) {
          w.sub = 'study'
          w.subT = 0
        }
      } else if (w.sub === 'study') {
        w.subT += dt
        if (w.subT >= w.memo) {
          w.sub = 'blink'
          w.subT = 0
          sfx.whoosh()
        }
      } else if (w.sub === 'blink') {
        w.subT += dt
        const k = w.subT / 0.9
        blinkK = k < 0.4 ? k / 0.4 : k < 0.6 ? 1 : Math.max(0, 1 - (k - 0.6) / 0.4)
        if (w.subT >= 0.9) {
          w.sub = 'find'
          w.subT = 0
          sfx.pop()
          pushHud()
        }
      } else if (w.sub === 'find') {
        w.findT += dt
      } else if (w.sub === 'reveal') {
        w.subT -= dt
        if (w.subT <= 0) startLevel(w.level + 1)
      }
      if (w.peekT > 0) w.peekT = Math.max(0, w.peekT - raw)
    }
    for (const m of w.marks) m.t -= raw * 1.2
    w.marks = w.marks.filter((m) => m.t > 0)
    for (const c of w.changes) c.t = Math.max(0, c.t - raw * 2)

    // ── Draw ──
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#0f766e')
    bg.addColorStop(1, '#134e4a')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // Soft polka dots
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    for (let i = 0; i < 30; i++) {
      ctx.beginPath()
      ctx.arc((i * 73) % W, (i * 131 + t * 6) % H, 6 + (i % 4) * 3, 0, Math.PI * 2)
      ctx.fill()
    }
    fx.applyShake(ctx)
    drawFrame(ctx)
    const showBefore = idle || w.sub === 'intro' || w.sub === 'study' || (w.sub === 'blink' && w.subT < 0.45) || w.peekT > 0
    if (idle) drawScene(ctx, demo.current.theme, demo.current.objs, w.cols, w.rows, t)
    else drawScene(ctx, w.theme, showBefore ? w.before : w.after, w.cols, w.rows, t)
    drawEyelids(ctx, blinkK)

    if (!idle) {
      // Found / missed change markers
      const revealAll = w.sub === 'reveal' || ph === 'dying' || ph === 'over'
      for (const ch of w.changes) {
        if (!ch.found && !revealAll) continue
        const p = toPx(ch.pts[0], w.cols, w.rows)
        const r = Math.max(26, p.unit * 0.5) * (1 + ch.t * 0.3)
        const col = ch.found ? '#22c55e' : '#ef4444'
        if (ch.type === 'move' && ch.pts[1]) {
          const q = toPx(ch.pts[1], w.cols, w.rows)
          ctx.setLineDash([5, 5])
          ctx.strokeStyle = col
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.moveTo(q.x, q.y)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.globalAlpha = 0.6
          ctx.beginPath()
          ctx.arc(q.x, q.y, r * 0.6, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 1
        }
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = col
        ctx.lineWidth = 3.5
        ctx.stroke()
        // Tag
        ctx.font = `900 11px 'Plus Jakarta Sans', system-ui, sans-serif`
        const label = LABEL[ch.type]
        const tw = ctx.measureText(label).width + 26
        const ty = p.y + r + 4
        ctx.fillStyle = col
        rr(ctx, p.x - tw / 2, ty, tw, 18, 9)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, p.x + 6, ty + 9.5)
        if (ch.found) checkMark(ctx, p.x - tw / 2 + 10, ty + 9, 5)
        else drawSym(ctx, 'cross', p.x - tw / 2 + 10, ty + 9, 5, '#fff', 'rgba(0,0,0,0)')
      }
      for (const m of w.marks) {
        ctx.globalAlpha = Math.min(1, m.t * 2)
        drawSym(ctx, 'cross', m.x, m.y, 12, '#ef4444', '#fff')
        ctx.globalAlpha = 1
      }
      if (w.peekT > 0) {
        const st = stage()
        ctx.strokeStyle = '#fde047'
        ctx.lineWidth = 4
        rr(ctx, st.x, st.y, st.w, st.h, 14)
        ctx.stroke()
      }
    }

    if (ph === 'play' || ph === 'dying') {
      const py = 72
      if (w.sub === 'study') phasePill(ctx, W / 2, py, 'MEMORISE THE SCENE', 1 - w.subT / w.memo, '#5eead4')
      else if (w.sub === 'blink') phasePill(ctx, W / 2, py, 'BLINK…', null, '#a5b4fc')
      else if (w.sub === 'find') {
        const left = w.changes.filter((c) => !c.found).length
        phasePill(ctx, W / 2, py, w.peekT > 0 ? 'ORIGINAL SCENE' : left > 1 ? `FIND ${left} CHANGES` : 'WHAT CHANGED?', null, w.peekT > 0 ? '#fde047' : '#4ade80', Math.sin(t * 5) * 0.25 + 0.25)
      } else if (w.sub === 'intro') phasePill(ctx, W / 2, py, 'GET READY', null, '#94a3b8')
    }
    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__mem = { world, found: foundChange }

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
                <Hearts hp={hud.hearts} max={hud.max} />
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
                { id: 'peek', label: 'Peek', icon: ICONS.peek, count: hud.peeks, disabled: !hud.find },
                { id: 'hint', label: 'Hint', icon: ICONS.reveal, count: hud.hints, disabled: !hud.find },
              ]}
            />
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
              game="changed"
              icon={meta.icon}
              title={meta.title}
              hint="Study the scene. After a blink, something is different — tap what changed."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.level >= 10 ? 'Eagle-eyed!' : 'Missed it!'}
            subtitle={`Score ${hud.score} · Level ${hud.level}`}
            celebrate={hud.level >= 10}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
