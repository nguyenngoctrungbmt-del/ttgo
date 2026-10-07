import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { useProgressStore } from '../../store/progressStore'
import { HELIX_LEVELS, parseRing } from './levels'
import { PALETTES, RED, shade, type Palette } from './palette'
import '../../shared/action/action.css'

const meta = getGame('helix')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type SegT = 0 | 1 | 2 // gap, solid, red
type Splat = { a: number; life: number; s: number }
type Ring = {
  n: number
  segs: SegT[]
  off: number
  spin: number
  blink: boolean
  phase: number
  gem: number
  finish: boolean
  level: number
  splats: Splat[]
}
type Breaking = { y: number; segs: SegT[]; rot: number; t: number; pal: number; finish: boolean }

// World units (scaled to the canvas at draw time).
const SEGS = 12
const SEG_A = (Math.PI * 2) / SEGS
const R = 128
const R0 = 34
const TY = 0.36
const TH = 15
const D = 150
const BALL_R = 11
const RB = 82
const G = 1900
const BOUNCE = 640
const BALL_ANG = Math.PI / 2

type World = {
  rings: Ring[]
  breaking: Breaking[]
  rot: number
  rotV: number
  ballY: number
  vy: number
  squash: number
  camY: number
  level: number
  levelStartN: number
  levelEndN: number
  passStreak: number
  fire: number
  fireCharges: number
  shields: number
  invuln: number
  clearT: number
  score: number
  time: number
  pal: number
  prevPal: number
  palT: number
  trail: { x: number; y: number; life: number }[]
  dead: boolean
  best: number
  bestShown: boolean
  /** Per-level star tracking. */
  lvGems: number
  lvGemsGot: number
  lvHit: boolean
  clearedRun: number
  tip: string
  tipT: number
  stats: { rings: number; level: number; smashes: number; gems: number }
}

function mod(a: number, m: number) {
  return ((a % m) + m) % m
}

function freshWorld(): World {
  return {
    rings: [],
    breaking: [],
    rot: 0,
    rotV: 0,
    ballY: D - 90,
    vy: 0,
    squash: 0,
    camY: 0,
    level: 1,
    levelStartN: 0,
    levelEndN: 0,
    passStreak: 0,
    fire: 0,
    fireCharges: 0,
    shields: 0,
    invuln: 0,
    clearT: 0,
    score: 0,
    time: 0,
    pal: 0,
    prevPal: 0,
    palT: 0,
    trail: [],
    dead: false,
    best: 0,
    bestShown: false,
    lvGems: 0,
    lvGemsGot: 0,
    lvHit: false,
    clearedRun: 0,
    tip: '',
    tipT: 0,
    stats: { rings: 0, level: 1, smashes: 0, gems: 0 },
  }
}

function ringY(n: number) {
  return (n + 1) * D
}

function makeRing(n: number, level: number, j: number, gemBoost: number): Ring {
  const segs: SegT[] = new Array(SEGS).fill(1)
  const gapSize = level === 1 && j < 3 ? 3 : level < 4 ? 2 + (Math.random() < 0.4 ? 1 : 0) : level < 8 ? 1 + Math.floor(Math.random() * 2) + (Math.random() < 0.25 ? 1 : 0) : 1 + (Math.random() < 0.5 ? 1 : 0)
  const gapStart = Math.floor(Math.random() * SEGS)
  for (let i = 0; i < gapSize; i++) segs[(gapStart + i) % SEGS] = 0
  // Second gap on easy rings
  if (level < 3 && Math.random() < 0.35) segs[(gapStart + 6) % SEGS] = 0
  if (level >= 2) {
    const reds = Math.min(5, Math.floor(Math.random() * (1 + Math.min(4, Math.floor(level / 2)))) + (level >= 5 ? 1 : 0))
    for (let r = 0; r < reds; r++) {
      const i = Math.floor(Math.random() * SEGS)
      if (segs[i] === 1) segs[i] = 2
    }
    // Every 5th level is a gauntlet: reds hug the gaps.
    if (level % 5 === 0) {
      segs[mod(gapStart - 1, SEGS)] = segs[mod(gapStart - 1, SEGS)] === 0 ? 0 : 2
      if (Math.random() < 0.5) segs[(gapStart + gapSize) % SEGS] = 2
    }
    // Never a ring that is all red + gap.
    if (!segs.some((s) => s === 1)) segs[(gapStart + gapSize) % SEGS] = 1
  }
  const spinOn = level >= 4 && Math.random() < Math.min(0.6, 0.15 * (level - 3))
  const spin = spinOn ? (Math.random() < 0.5 ? -1 : 1) * Math.min(1.5, 0.35 + level * 0.07) : 0
  const blink = level >= 6 && Math.random() < 0.3 && segs.includes(2)
  let gem = -1
  if (Math.random() < 0.28 + gemBoost) {
    const gaps = segs.map((s, i) => (s === 0 ? i : -1)).filter((i) => i >= 0)
    gem = gaps[Math.floor(Math.random() * gaps.length)]
  }
  return { n, segs, off: rand(0, Math.PI * 2), spin, blink, phase: rand(0, 3), gem, finish: false, level, splats: [] }
}

/** Hand-designed ring from levels.ts. */
function authoredRing(n: number, level: number, j: number, src: string, gemBoost: number): Ring {
  const p = parseRing(src)
  let gem = p.gem
  if (gem < 0 && gemBoost > 0 && Math.random() < gemBoost) {
    const gaps = p.segs.map((s, i) => (s === 0 ? i : -1)).filter((i) => i >= 0)
    if (gaps.length) gem = gaps[Math.floor(Math.random() * gaps.length)]
  }
  return { n, segs: p.segs, off: p.off * SEG_A, spin: p.spin, blink: p.blink, phase: (j * 1.1) % 3, gem, finish: false, level, splats: [] }
}

function finishRing(n: number, level: number): Ring {
  return { n, segs: new Array(SEGS).fill(1), off: 0, spin: 0, blink: false, phase: 0, gem: -1, finish: true, level, splats: [] }
}

function redActive(r: Ring, time: number) {
  return !r.blink || mod(time + r.phase, 3) < 1.7
}

export default function HelixGame() {
  const run = useActionRun('helix')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ id: number; x: number } | null>(null)
  const keys = useRef({ l: false, r: false })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, shields: 0, gems: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  const live = () => phaseRef.current === 'play'
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }
  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.level, shields: w.shields, gems: w.stats.gems })
  }

  function view() {
    const { w: W, h: H } = size.current
    const S = Math.min(W / 360, H / 600)
    return { W, H, S, VW: W / S, VH: H / S }
  }
  /** World → CSS px for fx. */
  function scr(x: number, y: number) {
    const v = view()
    const w = world.current
    return { x: (v.VW / 2 + x) * v.S, y: (y - w.camY) * v.S }
  }

  function buildLevel(startN: number, level: number) {
    const w = world.current
    const gemBoost = run.level('gems') * 0.06
    const spec = HELIX_LEVELS[level - 1]
    const count = spec ? spec.rings.length : Math.min(34, 10 + level * 2)
    const made: Ring[] = []
    for (let j = 0; j < count; j++) made.push(spec ? authoredRing(startN + j, level, j, spec.rings[j], gemBoost) : makeRing(startN + j, level, j, gemBoost))
    // Every level offers at least one gem (needed for the third star).
    if (!made.some((r) => r.gem >= 0)) {
      const r = made[Math.floor(made.length / 2)]
      r.gem = r.segs.findIndex((s) => s === 0)
    }
    w.rings.push(...made)
    w.rings.push(finishRing(startN + count, level))
    w.lvGems = made.filter((r) => r.gem >= 0).length
    w.lvGemsGot = 0
    w.lvHit = false
    w.levelStartN = startN
    w.levelEndN = startN + count
  }

  function levelTitle(L: number) {
    const spec = HELIX_LEVELS[L - 1]
    const w = world.current
    w.tip = spec?.tip ?? ''
    w.tipT = w.tip ? 5 : 0
    const name = spec ? spec.name : L % 5 === 0 ? 'Gauntlet' : PALETTES[(L - 1) % PALETTES.length].name
    return { text: `LEVEL ${L}`, sub: L % 5 === 0 ? `boss · ${name}` : name }
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.shields = run.level('shield')
    w.best = useProgressStore.getState().games.helix?.bestScore ?? 0
    const L = Math.max(1, Math.floor(level))
    w.level = L
    w.stats.level = L
    w.pal = (L - 1) % PALETTES.length
    w.prevPal = w.pal
    world.current = w
    buildLevel(0, L)
    w.ballY = ringY(0) - 120
    w.camY = w.ballY - view().VH * 0.36
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    pushHud()
    run.update(w.stats)
    const tt = levelTitle(L)
    say(tt.text, tt.sub)
    sfx.ready()
  }

  function die() {
    const w = world.current
    if (!live()) return
    w.dead = true
    setPhaseBoth('dying')
    const p = scr(0, w.ballY + RB * TY - BALL_R)
    fx.burst(p.x, p.y, { count: 30, color: [PALETTES[w.pal].ball, '#ffffff', RED.base], speed: 340, gravity: 600 })
    fx.ring(p.x, p.y, { color: RED.base, maxR: 70, life: 0.4, width: 5 })
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.4)
    fx.stop(0.14)
    fx.slowmo(0.8, 0.35)
    sfx.hurt()
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.stats.rings / 6 + w.stats.gems + w.clearedRun * 3) * (1 + run.level('gems') * 0.15))
      run.end({ score: w.score, cleared: w.clearedRun >= 1, stats: { ...w.stats }, coins }, revive)
    }, 1150)
  }

  /** Ad revive: strip the red from the next rings and bounce back with a shield glow. */
  function revive() {
    const w = world.current
    w.dead = false
    w.lvHit = true
    w.invuln = 2.2
    w.vy = -BOUNCE
    for (const r of w.rings) {
      if (ringY(r.n) >= w.ballY - 1 && ringY(r.n) < w.ballY + D * 3.5) r.segs = r.segs.map((s) => (s === 2 ? 1 : s))
    }
    const p = scr(0, w.ballY)
    fx.ring(p.x, p.y, { color: '#fde047', maxR: 90, life: 0.6, width: 5 })
    say('REVIVED!', 'red cleared below')
    setPhaseBoth('play')
    pushHud()
  }

  function shatter(r: Ring, smashed: boolean) {
    const w = world.current
    w.breaking.push({ y: ringY(r.n), segs: [...r.segs], rot: w.rot + r.off, t: 0, pal: w.pal, finish: r.finish })
    if (w.breaking.length > 8) w.breaking.shift()
    w.rings = w.rings.filter((x) => x !== r)
    const pal = PALETTES[w.pal]
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const p = scr(Math.cos(a) * R * 0.8, ringY(r.n) + Math.sin(a) * R * 0.8 * TY)
      fx.burst(p.x, p.y, { count: smashed ? 4 : 2, color: [pal.solid, shade(pal.solid, 0.7), '#ffffff'], speed: smashed ? 300 : 180, shape: 'square', size: 5, gravity: 700 })
    }
  }

  function passRing(r: Ring, idx: number) {
    const w = world.current
    w.passStreak += 1
    w.stats.rings += 1
    const pts = w.level * Math.min(w.passStreak, 8)
    w.score += pts
    const p = scr(0, ringY(r.n))
    fx.text(p.x + 40, p.y - 10, `+${pts}`, w.passStreak >= 3 ? '#fde047' : '#ffffff', 16 + Math.min(10, w.passStreak * 2))
    if (r.gem >= 0 && r.gem === idx) {
      w.stats.gems += 1
      w.lvGemsGot += 1
      w.score += 5 * w.level
      fx.burst(p.x, p.y + RB * TY * view().S, { count: 16, color: ['#67e8f9', '#ecfeff', '#fde047'], speed: 260, shape: 'spark', gravity: 100 })
      fx.text(p.x - 40, p.y, 'GEM', '#67e8f9', 18)
      sfx.power()
    }
    sfx.score(w.passStreak)
    haptic.light()
    shatter(r, false)
    if (w.passStreak >= 3 && w.fire <= 0) {
      w.fire = 1
      w.fireCharges = 1 + run.level('blaze')
      fx.text(p.x, p.y - 40, 'FIREBALL!', '#fb923c', 24)
      sfx.whoosh()
      haptic.medium()
    }
  }

  function smashRing(r: Ring) {
    const w = world.current
    w.stats.smashes += 1
    const pts = w.level * 3
    w.score += pts
    const p = scr(0, ringY(r.n))
    fx.explode(p.x, p.y + RB * TY * view().S, 1.3)
    fx.text(p.x, p.y - 30, `SMASH +${pts}`, '#fb923c', 22)
    fx.stop(0.06)
    fx.flash('#fb923c', 0.12)
    sfx.boom(0.6)
    haptic.heavy()
    shatter(r, true)
    w.fireCharges -= 1
    if (w.fireCharges <= 0) {
      w.fire = 0
      w.passStreak = 0
      w.vy = -BOUNCE * 0.85
    }
  }

  function bounce(r: Ring, idx: number) {
    const w = world.current
    w.vy = -BOUNCE
    w.squash = 1
    w.passStreak = 0
    const local = idx * SEG_A + SEG_A * rand(0.3, 0.7)
    r.splats.push({ a: local, life: 1, s: rand(0.8, 1.2) })
    if (r.splats.length > 5) r.splats.shift()
    const p = scr(0, ringY(r.n) + RB * TY)
    fx.burst(p.x, p.y, { count: 7, color: [PALETTES[w.pal].ball, '#ffffff'], speed: 140, gravity: 500, size: 3 })
    if (live()) {
      sfx.tap()
      haptic.light()
    }
  }

  function levelClear(r: Ring) {
    const w = world.current
    w.clearT = 1.3
    w.vy = -BOUNCE * 0.7
    w.squash = 1
    const bonus = 20 * w.level
    w.score += bonus
    // Stars: clear = 1, no red hit (no shield or revive needed) = +1, every gem on the level = +1.
    const stars = 1 + (w.lvHit ? 0 : 1) + (w.lvGemsGot >= w.lvGems ? 1 : 0)
    const res = run.completeLevel(w.level, stars)
    w.clearedRun += 1
    const p = scr(0, ringY(r.n))
    fx.burst(p.x, p.y, { count: 40, color: ['#fde047', '#f472b6', '#67e8f9', '#4ade80', '#ffffff'], speed: 420, gravity: 500, shape: 'square', size: 5 })
    fx.ring(p.x, p.y, { color: '#fde047', maxR: 160, life: 0.6, width: 6 })
    say(w.level % 5 === 0 ? 'BOSS TOWER DOWN!' : `LEVEL ${w.level} CLEAR!`, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  +${bonus}${res.improved && !res.firstClear ? ' · new best' : ''}`)
    sfx.win()
    haptic.success()
    if (res.firstClear && w.level % 5 === 0) void trackEvent('action_milestone', { game_id: 'helix', kind: 'level', value: w.level })
  }

  function nextLevel() {
    const w = world.current
    const fin = w.rings.find((r) => r.finish && r.n === w.levelEndN)
    const startN = w.levelEndN + 1
    w.level += 1
    w.stats.level = w.level
    w.prevPal = w.pal
    w.pal = (w.level - 1) % PALETTES.length
    w.palT = 1
    buildLevel(startN, w.level)
    if (fin) shatter(fin, true)
    w.passStreak = 0
    const tt = levelTitle(w.level)
    say(tt.text, tt.sub)
    sfx.levelUp()
    run.update(w.stats)
    pushHud()
  }

  // ── Input ─────────────────────────────────────────────

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!live()) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { id: e.pointerId, x: localPoint(e, e.currentTarget).x }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const x = localPoint(e, e.currentTarget).x
    const dx = x - d.x
    d.x = x
    if (live()) world.current.rot += dx * 0.0125
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null
  }

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__lv4helix = world
    function set(e: KeyboardEvent, on: boolean) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.l = on
      else if (e.key === 'ArrowRight' || e.key === 'd') keys.current.r = on
      else return
      e.preventDefault()
    }
    const dn = (e: KeyboardEvent) => set(e, true)
    const up = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', dn)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', dn)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ── Simulation ────────────────────────────────────────

  function step(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    w.time += dt
    w.squash = Math.max(0, w.squash - raw * 7)
    w.palT = Math.max(0, w.palT - raw * 0.8)
    w.tipT = Math.max(0, w.tipT - raw)
    for (const r of w.rings) {
      if (r.spin) r.off += r.spin * dt
      for (const s of r.splats) s.life -= raw * 0.25
      if (r.splats.length && r.splats[0].life <= 0) r.splats.shift()
    }
    for (const b of w.breaking) b.t += raw * 1.6
    w.breaking = w.breaking.filter((b) => b.t < 1)

    if (ph === 'idle') {
      if (w.rings.length === 0) {
        buildLevel(0, 3)
        w.ballY = ringY(0) - 100
      }
      w.rot += raw * 0.6
      w.vy += G * raw
      w.ballY += w.vy * raw
      if (w.ballY >= ringY(0)) {
        w.ballY = ringY(0)
        w.vy = -BOUNCE * 0.8
        w.squash = 1
      }
      w.camY = ringY(0) - view().VH * 0.42
      return
    }
    if (ph !== 'play') return
    if (keys.current.l) w.rot -= raw * 3.2
    if (keys.current.r) w.rot += raw * 3.2
    w.invuln = Math.max(0, w.invuln - dt)

    if (w.clearT > 0) {
      w.clearT -= dt
      // Hop on the finish pad while the banner plays.
      const fin = w.rings.find((r) => r.finish && r.n === w.levelEndN)
      const fy = fin ? ringY(fin.n) : w.ballY
      w.vy += G * dt
      w.ballY += w.vy * dt
      if (w.ballY >= fy) {
        w.ballY = fy
        w.vy = -BOUNCE * 0.55
        w.squash = 1
      }
      if (w.clearT <= 0) nextLevel()
    } else {
      w.vy = Math.min(1150, w.vy + G * dt)
      const y0 = w.ballY
      const y1 = y0 + w.vy * dt
      w.ballY = y1
      if (w.vy > 0) {
        const crossing = w.rings.filter((r) => ringY(r.n) > y0 && ringY(r.n) <= y1).sort((a, b) => a.n - b.n)
        for (const r of crossing) {
          const idx = Math.floor(mod(BALL_ANG - (w.rot + r.off), Math.PI * 2) / SEG_A) % SEGS
          const seg = r.segs[idx]
          if (r.finish) {
            w.ballY = ringY(r.n)
            if (w.fire > 0) {
              w.fire = 0
              w.fireCharges = 0
            }
            levelClear(r)
            break
          }
          if (seg === 0) {
            passRing(r, idx)
            continue
          }
          if (w.fire > 0) {
            smashRing(r)
            if (w.fire > 0) continue
            w.ballY = ringY(r.n)
            break
          }
          if (seg === 2 && redActive(r, w.time)) {
            if (w.invuln > 0) {
              r.segs[idx] = 1
            } else if (w.shields > 0) {
              w.shields -= 1
              w.lvHit = true
              w.invuln = 1.2
              r.segs[idx] = 1
              const p = scr(0, ringY(r.n))
              fx.ring(p.x, p.y, { color: '#7dd3fc', maxR: 80, life: 0.4, width: 5 })
              fx.text(p.x, p.y - 30, 'SHIELD!', '#7dd3fc', 22)
              sfx.clang()
              haptic.medium()
              pushHud()
            } else {
              w.ballY = ringY(r.n)
              die()
              break
            }
          }
          w.ballY = ringY(r.n)
          bounce(r, idx)
          break
        }
      }
      w.stats.level = w.level
    }
    if (!w.bestShown && w.best > 0 && w.score > w.best) {
      w.bestShown = true
      say('NEW BEST!')
      sfx.mission()
    }
    // Camera only moves down.
    const target = w.ballY - view().VH * 0.36
    if (target > w.camY) w.camY = approach(w.camY, target, 9, raw)
    // Drop rings far above the view.
    if (w.rings.length && ringY(w.rings[0].n) < w.camY - D * 2) w.rings.shift()
    w.trail.push({ x: 0, y: w.ballY, life: 0.35 })
    for (const t of w.trail) t.life -= raw
    if (w.trail.length > 14 || (w.trail.length && w.trail[0].life <= 0)) w.trail.shift()
    run.update(w.stats)
  }

  // ── Drawing ───────────────────────────────────────────

  function sectorPath(ctx: CanvasRenderingContext2D, sy: number, a0: number, a1: number, rIn: number, rOut: number) {
    ctx.beginPath()
    for (let s = 0; s <= 3; s++) {
      const a = a0 + ((a1 - a0) * s) / 3
      ctx.lineTo(Math.cos(a) * rOut, sy + Math.sin(a) * rOut * TY)
    }
    for (let s = 3; s >= 0; s--) {
      const a = a0 + ((a1 - a0) * s) / 3
      ctx.lineTo(Math.cos(a) * rIn, sy + Math.sin(a) * rIn * TY)
    }
    ctx.closePath()
  }

  function wallPath(ctx: CanvasRenderingContext2D, sy: number, a0: number, a1: number, rad: number) {
    ctx.beginPath()
    for (let s = 0; s <= 3; s++) {
      const a = a0 + ((a1 - a0) * s) / 3
      ctx.lineTo(Math.cos(a) * rad, sy + Math.sin(a) * rad * TY)
    }
    for (let s = 3; s >= 0; s--) {
      const a = a0 + ((a1 - a0) * s) / 3
      ctx.lineTo(Math.cos(a) * rad, sy + Math.sin(a) * rad * TY + TH)
    }
    ctx.closePath()
  }

  function drawRingShape(ctx: CanvasRenderingContext2D, sy: number, segs: SegT[], rot: number, pal: Palette, rScale: number, ring: Ring | null, time: number) {
    const rOut = R * rScale
    const rIn = R0 * (rScale > 1 ? rScale : 1)
    for (let i = 0; i < SEGS; i++) {
      const s = segs[i]
      if (s === 0) continue
      const a0 = i * SEG_A + rot
      const a1 = a0 + SEG_A
      const mid = Math.sin((a0 + a1) / 2)
      if (mid < -0.2) continue
      const red = s === 2 && (!ring || redActive(ring, time))
      const fin = ring?.finish
      const base = red ? RED.dark : fin ? '#a16207' : pal.solidDark
      ctx.fillStyle = shade(base, 0.8 + mid * 0.2)
      wallPath(ctx, sy, a0, a1, rOut)
      ctx.fill()
    }
    for (let i = 0; i < SEGS; i++) {
      const s = segs[i]
      if (s === 0) continue
      const a0 = i * SEG_A + rot
      const a1 = a0 + SEG_A
      const mid = Math.sin((a0 + a1) / 2)
      const fin = ring?.finish
      let col = fin ? '#facc15' : pal.solid
      if (s === 2) {
        const on = !ring || redActive(ring, time)
        const warn = ring?.blink && !on && mod(time + ring.phase, 3) > 2.6
        col = on ? RED.base : warn && Math.floor(time * 16) % 2 ? RED.base : shade(pal.solid, 0.85)
      }
      ctx.fillStyle = shade(col, 0.82 + mid * 0.18)
      sectorPath(ctx, sy, a0 + 0.012, a1 - 0.012, rIn, rOut)
      ctx.fill()
      if (s === 2 && (!ring || redActive(ring, time))) {
        // Hazard stripes
        ctx.strokeStyle = 'rgba(255,255,255,0.28)'
        ctx.lineWidth = 2
        const am = (a0 + a1) / 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(am) * (rIn + 10), sy + Math.sin(am) * (rIn + 10) * TY)
        ctx.lineTo(Math.cos(am) * (rOut - 8), sy + Math.sin(am) * (rOut - 8) * TY)
        ctx.stroke()
      }
    }
    // Rim highlight on the front edge
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < SEGS; i++) {
      if (segs[i] === 0) continue
      const a0 = i * SEG_A + rot
      const a1 = a0 + SEG_A
      if (Math.sin((a0 + a1) / 2) < 0.1) continue
      ctx.beginPath()
      for (let s = 0; s <= 3; s++) {
        const a = a0 + 0.012 + ((a1 - a0 - 0.024) * s) / 3
        ctx.lineTo(Math.cos(a) * rOut, sy + Math.sin(a) * rOut * TY)
      }
      ctx.stroke()
    }
  }

  function drawPole(ctx: CanvasRenderingContext2D, y0: number, y1: number, pal: Palette) {
    const g = ctx.createLinearGradient(-R0, 0, R0, 0)
    g.addColorStop(0, shade(pal.pole, 0.6))
    g.addColorStop(0.35, shade(pal.pole, 1.15))
    g.addColorStop(1, shade(pal.pole, 0.55))
    ctx.fillStyle = g
    ctx.fillRect(-R0 + 2, y0, (R0 - 2) * 2, y1 - y0)
  }

  function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number) {
    const b = Math.sin(t * 4 + x) * 3
    ctx.save()
    ctx.translate(x, y - 16 + b)
    ctx.scale(Math.cos(t * 3) * 0.3 + 0.9, 1)
    const g = ctx.createLinearGradient(0, -s, 0, s)
    g.addColorStop(0, '#ecfeff')
    g.addColorStop(0.5, '#22d3ee')
    g.addColorStop(1, '#0e7490')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.lineTo(s * 0.8, -s * 0.2)
    ctx.lineTo(0, s)
    ctx.lineTo(-s * 0.8, -s * 0.2)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.beginPath()
    ctx.moveTo(0, -s)
    ctx.lineTo(s * 0.3, -s * 0.2)
    ctx.lineTo(-s * 0.3, -s * 0.2)
    ctx.fill()
    ctx.restore()
  }

  function drawBall(ctx: CanvasRenderingContext2D, y: number, pal: Palette, t: number) {
    const w = world.current
    const sq = w.squash
    const stretch = Math.min(0.25, Math.abs(w.vy) / 4000)
    const sx = 1 + sq * 0.3 - stretch * 0.5
    const sy2 = 1 - sq * 0.3 + stretch
    const fire = w.fire > 0
    if (fire) {
      glow(ctx, 0, y - BALL_R, BALL_R * 4, '#fb923c', 0.6)
      for (let i = 0; i < 3; i++) {
        const fy = y - BALL_R - 10 - i * 9 + Math.sin(t * 30 + i) * 2
        ctx.fillStyle = i === 0 ? '#fde047' : i === 1 ? '#fb923c' : '#ef4444'
        ctx.globalAlpha = 0.8 - i * 0.2
        ctx.beginPath()
        ctx.arc(Math.sin(t * 25 + i * 2) * 3, fy, BALL_R * (0.9 - i * 0.22), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    if (w.invuln > 0) glow(ctx, 0, y - BALL_R, BALL_R * 3, '#7dd3fc', 0.5 + Math.sin(t * 20) * 0.2)
    ctx.save()
    ctx.translate(0, y)
    ctx.scale(sx, sy2)
    const g = ctx.createRadialGradient(-BALL_R * 0.35, -BALL_R * 1.4, 1, 0, -BALL_R, BALL_R * 1.1)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.35, fire ? '#fdba74' : pal.ball)
    g.addColorStop(1, fire ? '#c2410c' : shade(pal.ball, 0.55))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, -BALL_R, BALL_R, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function drawBreaking(ctx: CanvasRenderingContext2D, b: Breaking, camY: number, time: number) {
    const sy = b.y - camY + b.t * 60
    ctx.globalAlpha = Math.max(0, 1 - b.t)
    drawRingShape(ctx, sy, b.segs, b.rot + b.t * 0.6, PALETTES[b.pal], 1 + b.t * 0.9, b.finish ? ({ finish: true } as Ring) : null, time)
    ctx.globalAlpha = 1
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    step(dt, raw)
    const v = view()
    const pal = PALETTES[w.pal]

    // Background
    const paintBg = (p: Palette, a: number) => {
      ctx.globalAlpha = a
      const g = ctx.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, p.bgTop)
      g.addColorStop(1, p.bgBot)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }
    paintBg(pal, 1)
    if (w.palT > 0) paintBg(PALETTES[w.prevPal], w.palT)
    // Parallax bubbles
    for (let i = 0; i < 14; i++) {
      const px = ((i * 97) % 100) / 100
      const sp = 0.15 + (i % 4) * 0.08
      const py = mod(((i * 53) % 100) / 100 * H - w.camY * v.S * sp + t * 6, H + 40) - 20
      glow(ctx, px * W, py, 10 + (i % 5) * 8, pal.accent, 0.12)
    }

    fx.applyShake(ctx)
    ctx.save()
    ctx.scale(v.S, v.S)
    ctx.translate(v.VW / 2, 0)

    const visible = w.rings.filter((r) => {
      const sy = ringY(r.n) - w.camY
      return sy > -D && sy < v.VH + D
    })
    // Pole below the lowest ring
    const lowest = visible[visible.length - 1]
    const lowY = lowest ? ringY(lowest.n) - w.camY : v.VH
    drawPole(ctx, lowY, v.VH + 10, pal)
    const ballSY = w.ballY - w.camY
    let ballDrawn = false
    const ballScreenY = ballSY + RB * TY
    for (let i = visible.length - 1; i >= 0; i--) {
      const r = visible[i]
      const sy = ringY(r.n) - w.camY
      if (!ballDrawn && ringY(r.n) <= w.ballY - 1) {
        drawBallLayer(ctx, ballScreenY, pal, t)
        ballDrawn = true
      }
      const rp = r.level === w.level ? pal : PALETTES[(r.level - 1) % PALETTES.length]
      drawRingShape(ctx, sy, r.segs, w.rot + r.off, rp, 1, r, w.time)
      for (const s of r.splats) {
        const a = s.a + w.rot + r.off
        if (Math.sin(a) < -0.3) continue
        ctx.globalAlpha = Math.min(1, s.life * 2) * 0.85
        ctx.fillStyle = shade(pal.ball, 0.85)
        ctx.beginPath()
        ctx.ellipse(Math.cos(a) * RB, sy + Math.sin(a) * RB * TY, 9 * s.s, 9 * s.s * TY * 1.3, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (r.gem >= 0) {
        const a = (r.gem + 0.5) * SEG_A + w.rot + r.off
        if (Math.sin(a) > -0.6) drawGem(ctx, Math.cos(a) * RB, sy + Math.sin(a) * RB * TY, 8, t)
      }
      const above = visible[i - 1]
      const topY = above ? ringY(above.n) - w.camY : -10
      drawPole(ctx, topY, sy, rp)
    }
    if (!visible.length) drawPole(ctx, -10, v.VH + 10, pal)
    for (const b of w.breaking) drawBreaking(ctx, b, w.camY, w.time)
    if (!ballDrawn) drawBallLayer(ctx, ballScreenY, pal, t)
    ctx.restore()

    fx.draw(ctx)
    ctx.restore()

    // Progress bar
    if (phaseRef.current !== 'idle') {
      const total = w.levelEndN - w.levelStartN + 1
      const done = Math.max(0, Math.min(total, Math.floor(w.ballY / D) - w.levelStartN))
      const bw = Math.min(W * 0.5, 200)
      const bx = (W - bw) / 2
      const by = 26
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.roundRect(bx, by, bw, 10, 5)
      ctx.fill()
      ctx.fillStyle = pal.accent
      ctx.beginPath()
      ctx.roundRect(bx, by, Math.max(10, (bw * done) / total), 10, 5)
      ctx.fill()
      for (const [x, n, on] of [[bx - 14, w.level, true], [bx + bw + 14, w.level + 1, done >= total]] as [number, number, boolean][]) {
        ctx.fillStyle = on ? pal.accent : 'rgba(255,255,255,0.85)'
        ctx.beginPath()
        ctx.arc(x, by + 5, 13, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = on ? '#fff' : '#1f2937'
        ctx.font = "900 13px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(n), x, by + 5.5)
      }
      if (w.passStreak >= 2 && w.fire <= 0) {
        ctx.fillStyle = '#fde68a'
        ctx.font = "900 12px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.fillText(`streak ${w.passStreak}`, W / 2, by + 24)
      }
    }
    // Level tip near the bottom for the first few seconds.
    if (w.tipT > 0 && phaseRef.current === 'play') {
      ctx.globalAlpha = Math.min(1, w.tipT, (5 - w.tipT) * 3)
      ctx.font = "800 13px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const tw = Math.min(W - 24, ctx.measureText(w.tip).width + 28)
      ctx.fillStyle = 'rgba(15,23,42,0.6)'
      ctx.beginPath()
      ctx.roundRect((W - tw) / 2, H - 58, tw, 30, 15)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(w.tip, W / 2, H - 43, W - 40)
      ctx.globalAlpha = 1
    }
    fx.drawOverlay(ctx, W, H)
  }

  function drawBallLayer(ctx: CanvasRenderingContext2D, y: number, pal: Palette, t: number) {
    const w = world.current
    if (w.dead) return
    for (const tr of w.trail) {
      const ty = tr.y - w.camY + RB * TY - BALL_R
      ctx.globalAlpha = Math.max(0, tr.life) * (w.fire > 0 ? 1.6 : 0.6)
      ctx.fillStyle = w.fire > 0 ? '#fb923c' : pal.ball
      ctx.beginPath()
      ctx.arc(0, ty, BALL_R * (0.4 + tr.life), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    drawBall(ctx, y, pal, t)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud" style={{ top: '3.2rem' }}>
              <div>
                <div className="action-hud__score">{hud.score}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small" style={{ color: '#a5f3fc' }}>
                  Gems {hud.gems}
                </span>
                {hud.shields > 0 ? <span className="action-hud__small">Shield ×{hud.shields}</span> : null}
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
              game="helix"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to spin the tower. Drop through the gaps, avoid red, and chain falls into a fireball."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={world.current.clearedRun >= 3 ? 'Tower crusher!' : 'Splat!'}
            subtitle={`Score ${hud.score} · Level ${hud.level}`}
            celebrate={world.current.clearedRun >= 1}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
