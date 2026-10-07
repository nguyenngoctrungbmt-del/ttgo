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
import { BODY_NAMES, MAX_TIER, NEBULA, PULSAR, RADII, TIER_COLORS, bodySprite, spaceSprite } from './art'
import '../../shared/action/action.css'
import './planetmerge.css'

const meta = getGame('planetmerge')

type Phase = 'idle' | 'play' | 'dying' | 'over'

// Physics runs in world units: danger ring radius = 160.
const RING = 160
const BASE_R = 11
const CORE_R = 14
const LAUNCH_R = 184
const GRAV = 620
const H_STEP = 1 / 120
const SLOP = 0.25
const TRI = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66]

type Body = {
  id: number
  tier: number
  x: number
  y: number
  vx: number
  vy: number
  r: number
  m: number
  ang: number
  born: number
  inPlay: boolean
  over: number
  sleep: number
  asleep: boolean
  pop: number
  golden: boolean
  dead: boolean
}
type MergeAnim = { a: Body; b: Body; t: number; tier: number; golden: boolean }
type Shower = { angles: number[]; t: number }

type World = {
  demo: boolean
  bodies: Body[]
  anims: MergeAnim[]
  next: number
  after: number
  nextGolden: boolean
  aim: number
  aiming: boolean
  cool: number
  acc: number
  clock: number
  score: number
  level: number
  best: number
  seen: boolean[]
  chain: number
  lastMerge: number
  dust: number
  specialNext: number
  pulsars: number
  maxOver: number
  grace: number
  showerIn: number
  shower: Shower | null
  nextId: number
  theme: number
  demoT: number
  stats: { score: number; best: number; merges: number; level: number; suns: number }
}

function freshWorld(demo = false): World {
  return {
    demo,
    bodies: [],
    anims: [],
    next: 0,
    after: 1,
    nextGolden: false,
    aim: -Math.PI / 2,
    aiming: false,
    cool: 0,
    acc: 0,
    clock: 0,
    score: 0,
    level: 1,
    best: 0,
    seen: Array.from({ length: MAX_TIER + 1 }, (_, i) => i === 0),
    chain: 0,
    lastMerge: -9,
    dust: 0,
    specialNext: NEBULA,
    pulsars: 0,
    maxOver: 0,
    grace: 0,
    showerIn: 45,
    shower: null,
    nextId: 1,
    theme: 0,
    demoT: 0,
    stats: { score: 0, best: 1, merges: 0, level: 1, suns: 0 },
  }
}

const levelScore = (n: number) => Math.round(220 * Math.pow(n, 1.75))
const radiusOf = (tier: number) => BASE_R * (tier >= NEBULA ? 1.3 : RADII[tier])
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

export default function PlanetMergeGame() {
  const run = useActionRun('planetmerge')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(true))
  const phaseRef = useRef<Phase>('idle')
  const lastEvent = useRef(0)
  const keys = useRef({ left: false, right: false })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, chain: 0, best: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.level, chain: w.chain, best: w.best })
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const ladderH = 50
    const top = 64
    const avail = H - top - ladderH
    const cx = W / 2
    const cy = top + avail / 2
    const k = Math.min((W / 2 - 8) / (LAUNCH_R + 18), (avail / 2 - 4) / (LAUNCH_R + 18))
    return { W, H, cx, cy, k, ladderH }
  }

  function toScreen(x: number, y: number) {
    const { cx, cy, k } = geo()
    return { x: cx + x * k, y: cy + y * k }
  }

  function rollTier() {
    const w = world.current
    const max = w.level >= 3 ? 4 : 3
    const r = Math.random()
    const weights = [0.34, 0.28, 0.2, 0.12, 0.06].slice(0, max + 1)
    const sum = weights.reduce((a, b) => a + b, 0)
    let acc = 0
    for (let i = 0; i < weights.length; i++) {
      acc += weights[i] / sum
      if (r < acc) return i
    }
    return 0
  }

  function makeBody(tier: number, x: number, y: number, vx = 0, vy = 0): Body {
    const w = world.current
    const r = radiusOf(tier)
    return { id: w.nextId++, tier, x, y, vx, vy, r, m: r * r, ang: rand(0, Math.PI * 2), born: w.clock, inPlay: false, over: 0, sleep: 0, asleep: false, pop: 0.6, golden: false, dead: false }
  }

  // ── Run lifecycle ───────────────────────────────────

  function start() {
    void unlockAudio()
    const w = freshWorld(false)
    world.current = w
    fx.reset()
    lastEvent.current = 0
    w.pulsars = run.level('pulsar')
    w.next = 0
    w.after = rollTier()
    // a few seed bodies resting on the core
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4
      const b = makeBody(i % 2 ? 1 : 0, Math.cos(a) * 30, Math.sin(a) * 30)
      b.inPlay = true
      w.bodies.push(b)
    }
    run.begin()
    setPhaseBoth('play')
    showBanner('GRAVITY WELL', 'tap the rim to fling bodies in')
    sfx.ready()
    pushHud()
  }

  function ringR() {
    return RING * (1 + run.level('ring') * 0.03)
  }

  function launch() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.cool > 0) return
    let tier = w.next
    if (w.dust >= 30) {
      tier = w.specialNext
      w.dust = 0
      w.specialNext = w.specialNext === NEBULA ? PULSAR : NEBULA
    } else {
      w.next = w.after
      w.after = rollTier()
    }
    const lx = Math.cos(w.aim) * LAUNCH_R
    const ly = Math.sin(w.aim) * LAUNCH_R
    const b = makeBody(tier, lx, ly, -Math.cos(w.aim) * 300, -Math.sin(w.aim) * 300)
    b.golden = tier < NEBULA && w.nextGolden
    w.nextGolden = Math.random() < 0.05 && w.clock > 20
    w.bodies.push(b)
    w.cool = 0.42
    const s = toScreen(lx, ly)
    fx.burst(s.x, s.y, { count: 8, color: ['#e0f2fe', '#7dd3fc', '#ffffff'], speed: 120, angle: w.aim + Math.PI, spread: 1, gravity: 0 })
    sfx.whoosh()
    haptic.light()
  }

  function usePulsarCharge() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.pulsars <= 0 || w.cool > 0) return
    w.pulsars -= 1
    const lx = Math.cos(w.aim) * LAUNCH_R
    const ly = Math.sin(w.aim) * LAUNCH_R
    w.bodies.push(makeBody(PULSAR, lx, ly, -Math.cos(w.aim) * 320, -Math.sin(w.aim) * 320))
    w.cool = 0.42
    sfx.power()
  }

  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.4)
    fx.shake(12, 0.5)
    fx.slowmo(1, 0.3)
    fx.stop(0.12)
    sfx.lose()
    haptic.error()
    const { cx, cy } = geo()
    fx.text(cx, cy, 'ORBIT OVERFLOW!', '#fecaca', 24)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.score / 600 + w.best * 1.5 + 2) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.best >= 6, stats: { ...w.stats }, coins }, revive)
    }, 1200)
  }

  /** Revive: vaporise the smallest bodies and anything near the ring; big planets stay. */
  function revive() {
    const w = world.current
    const R = ringR()
    const sorted = [...w.bodies].sort((a, b) => a.tier - b.tier)
    let area = w.bodies.reduce((s, b) => s + b.r * b.r, 0)
    const goal = R * R * 0.32
    for (const b of sorted) {
      const far = Math.hypot(b.x, b.y) + b.r > R * 0.82
      if (!far && area <= goal) continue
      if (b.tier >= 7 && !far) continue
      b.dead = true
      area -= b.r * b.r
      const s = toScreen(b.x, b.y)
      fx.burst(s.x, s.y, { count: 8, color: ['#7dd3fc', '#ffffff', TIER_COLORS[Math.min(b.tier, MAX_TIER)]], speed: 140, gravity: 0 })
    }
    // anything still overlapping the ring is pulled inward
    for (const b of w.bodies) {
      if (b.dead) continue
      const d = Math.hypot(b.x, b.y)
      if (d + b.r > R * 0.9) {
        const k = (R * 0.85 - b.r) / d
        b.x *= k
        b.y *= k
      }
      b.over = 0
      b.vx = b.vy = 0
      b.asleep = false
    }
    w.bodies = w.bodies.filter((b) => !b.dead)
    w.maxOver = 0
    w.grace = 3
    w.pulsars += 1
    const { cx, cy, k } = geo()
    fx.ring(cx, cy, { color: '#7dd3fc', maxR: R * k, life: 0.6, width: 5 })
    fx.flash('#bae6fd', 0.25)
    showBanner('REVIVED!', 'small bodies vaporised · +1 pulsar')
    pushHud()
    setPhaseBoth('play')
  }

  // ── Merging ─────────────────────────────────────────

  function revealTier(tier: number) {
    const w = world.current
    w.seen[tier] = true
    if (tier >= 3) {
      showBanner(`NEW: ${BODY_NAMES[tier].toUpperCase()}!`, tier === MAX_TIER ? 'the end of all things' : `next: ${BODY_NAMES[Math.min(MAX_TIER, tier + 1)]}`)
      sfx.levelUp()
      fx.flash('#fef9c3', 0.15)
    }
  }

  function startMerge(a: Body, b: Body, tier: number) {
    const w = world.current
    a.dead = true
    b.dead = true
    w.anims.push({ a, b, t: 0, tier, golden: a.golden || b.golden })
  }

  function finishMerge(m: MergeAnim) {
    const w = world.current
    const { a, b } = m
    const M = a.m + b.m
    const x = (a.x * a.m + b.x * b.m) / M
    const y = (a.y * a.m + b.y * b.m) / M
    const s = toScreen(x, y)
    const { k } = geo()
    w.chain = w.clock - w.lastMerge < 0.9 ? w.chain + 1 : 1
    w.lastMerge = w.clock
    w.stats.merges += 1
    if (m.tier > MAX_TIER) {
      // two black holes: singularity swallows every small body
      let gained = 600
      for (const o of w.bodies) {
        if (o.dead || o.tier > 4) continue
        o.dead = true
        gained += TRI[o.tier] * 4
        const os = toScreen(o.x, o.y)
        fx.burst(os.x, os.y, { count: 5, color: ['#a855f7', '#fb923c'], speed: 80, gravity: 0 })
      }
      w.score += gained
      fx.explode(s.x, s.y, 3, ['#a855f7', '#fb923c', '#ffffff', '#f0abfc'])
      fx.flash('#ffffff', 0.4)
      fx.slowmo(1.2, 0.3)
      showBanner('SINGULARITY!', `+${gained}`)
      sfx.boom(1)
      sfx.win()
      haptic.success()
    } else {
      const nb = makeBody(m.tier, x, y, (a.vx + b.vx) * 0.25, (a.vy + b.vy) * 0.25)
      nb.inPlay = true
      nb.pop = 1
      nb.golden = false
      w.bodies.push(nb)
      const mult = 1 + (w.chain - 1) * 0.5
      const gain = Math.round(TRI[m.tier] * 2 * mult * (m.golden ? 3 : 1))
      w.score += gain
      w.dust = Math.min(30, w.dust + m.tier + 1)
      const col = TIER_COLORS[m.tier]
      const big = m.tier >= 5
      fx.burst(s.x, s.y, { count: 12 + m.tier * 3, color: [col, '#ffffff', '#fde047'], speed: (110 + m.tier * 22) * Math.min(1.4, k * 1.2), shape: 'spark', gravity: 0, drag: 2.6 })
      fx.burst(s.x, s.y, { count: 6 + m.tier, color: [col, '#ffffff'], speed: 60, size: 4, gravity: 0 })
      fx.ring(s.x, s.y, { color: col, maxR: nb.r * k * 2.1, life: 0.38, width: 4 })
      if (big) fx.ring(s.x, s.y, { color: '#ffffff', maxR: nb.r * k * 3, life: 0.55, width: 2 })
      fx.stop(0.03 + Math.min(0.08, m.tier * 0.008))
      fx.shake(1.5 + m.tier * 0.7, 0.18)
      fx.text(s.x, s.y - nb.r * k - 6, w.chain > 1 ? `+${gain} x${w.chain}` : `+${gain}`, m.golden ? '#fde047' : w.chain > 2 ? '#fde047' : '#ffffff', 13 + Math.min(8, m.tier))
      if (m.golden) fx.text(s.x, s.y + nb.r * k + 8, 'GOLDEN x3', '#fde047', 13)
      sfx.pop()
      sfx.score(Math.min(12, w.chain * 2 + Math.floor(m.tier / 2)))
      if (w.chain >= 3) {
        sfx.combo()
        if (w.chain === 3 || w.chain % 5 === 0) showBanner(`CHAIN x${w.chain}!`, 'cosmic cascade')
      }
      if (big) sfx.boom(0.2 + m.tier * 0.05)
      haptic.medium()
      if (m.tier === 9) w.stats.suns += 1
      if (m.tier > w.best) {
        w.best = m.tier
        w.stats.best = m.tier + 1
      }
      if (!w.seen[m.tier]) revealTier(m.tier)
      // wake neighbours so the pile settles around the new body
      for (const o of w.bodies) if (Math.hypot(o.x - x, o.y - y) < nb.r * 3) o.asleep = false
    }
    w.stats.score = w.score
    while (w.score >= levelScore(w.level)) levelUp()
    run.update(w.stats)
    pushHud()
  }

  function levelUp() {
    const w = world.current
    w.level += 1
    w.stats.level = w.level
    const theme = Math.floor((w.level - 1) / 4)
    const sub = w.level === 3 ? 'Mars-size drops incoming' : theme !== w.theme ? 'new sector' : w.level % 2 === 0 ? 'meteor showers intensify' : undefined
    w.theme = theme
    showBanner(`LEVEL ${w.level}`, sub)
    sfx.levelUp()
    haptic.success()
    if (w.level % 5 === 0 && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'planetmerge', kind: 'level', value: w.level })
    }
  }

  function pulsarBlast(p: Body) {
    const w = world.current
    p.dead = true
    const s = toScreen(p.x, p.y)
    const { k } = geo()
    let n = 0
    for (const o of w.bodies) {
      if (o.dead || o === p || o.tier > 3) continue
      if (Math.hypot(o.x - p.x, o.y - p.y) < 75) {
        o.dead = true
        n += 1
        w.score += TRI[o.tier] * 3
        const os = toScreen(o.x, o.y)
        fx.burst(os.x, os.y, { count: 6, color: ['#67e8f9', '#ffffff'], speed: 120, gravity: 0 })
      }
    }
    for (const o of w.bodies) o.asleep = false
    fx.ring(s.x, s.y, { color: '#67e8f9', maxR: 75 * k, life: 0.45, width: 5 })
    fx.explode(s.x, s.y, 1.2, ['#67e8f9', '#e0f2fe', '#ffffff', '#0ea5e9'])
    fx.text(s.x, s.y - 20, n ? `PULSAR x${n}` : 'PULSAR', '#67e8f9', 16)
    sfx.boom(0.6)
    haptic.heavy()
    w.stats.score = w.score
    run.update(w.stats)
    pushHud()
  }

  // ── Physics ─────────────────────────────────────────

  function stepPhysics(h: number) {
    const w = world.current
    const bs = w.bodies
    for (const b of bs) {
      if (b.dead || b.asleep) continue
      const d = Math.hypot(b.x, b.y) || 0.001
      const g = GRAV * Math.min(1, d / 30)
      b.vx += (-b.x / d) * g * h
      b.vy += (-b.y / d) * g * h
      const damp = 1 / (1 + 1.8 * h)
      b.vx *= damp
      b.vy *= damp
      b.x += b.vx * h
      b.y += b.vy * h
      // roll around the core
      b.ang += ((b.vx * -b.y + b.vy * b.x) / (d * b.r)) * h * 0.6
    }
    for (let it = 0; it < 4; it++) {
      for (let i = 0; i < bs.length; i++) {
        const a = bs[i]
        if (a.dead) continue
        // static core
        const dc = Math.hypot(a.x, a.y) || 0.001
        const pc = CORE_R + a.r - dc
        if (pc > 0) {
          const nx = a.x / dc
          const ny = a.y / dc
          a.x += nx * pc
          a.y += ny * pc
          const vn = a.vx * nx + a.vy * ny
          if (vn < 0) {
            a.vx -= vn * nx * 1.05
            a.vy -= vn * ny * 1.05
          }
          a.inPlay = true
          if (a.tier === PULSAR) {
            pulsarBlast(a)
            continue
          }
        }
        for (let j = i + 1; j < bs.length; j++) {
          const b = bs[j]
          if (b.dead || (a.asleep && b.asleep)) continue
          const dx = b.x - a.x
          const dy = b.y - a.y
          const rr = a.r + b.r
          if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue
          const d2 = dx * dx + dy * dy
          if (d2 >= rr * rr) continue
          const d = Math.sqrt(d2) || 0.001
          // specials
          if (a.tier === PULSAR || b.tier === PULSAR) {
            pulsarBlast(a.tier === PULSAR ? a : b)
            break
          }
          if (a.tier === NEBULA || b.tier === NEBULA) {
            const other = a.tier === NEBULA ? b : a
            const neb = a.tier === NEBULA ? a : b
            if (other.tier !== NEBULA && other.tier <= MAX_TIER) {
              startMerge(neb, other, other.tier + 1)
              if (a.dead) break
              continue
            }
          }
          if (a.tier === b.tier && a.tier <= MAX_TIER && (a.inPlay || b.inPlay)) {
            startMerge(a, b, a.tier + 1)
            break
          }
          a.inPlay = true
          b.inPlay = true
          const nx = dx / d
          const ny = dy / d
          const pen = rr - d
          if (pen > SLOP) {
            const ia = a.asleep ? 0 : 1 / a.m
            const ib = b.asleep ? 0 : 1 / b.m
            const sum = ia + ib || 1
            const corr = ((pen - SLOP) * 0.7) / sum
            a.x -= nx * corr * ia
            a.y -= ny * corr * ia
            b.x += nx * corr * ib
            b.y += ny * corr * ib
            if (pen > 1.2) {
              if (a.asleep && !b.asleep) a.asleep = false
              if (b.asleep && !a.asleep) b.asleep = false
            }
          }
          const rvx = b.vx - a.vx
          const rvy = b.vy - a.vy
          const vn = rvx * nx + rvy * ny
          if (vn < 0) {
            const ia = 1 / a.m
            const ib = 1 / b.m
            const jn = (-(1 + 0.08) * vn) / (ia + ib)
            a.vx -= jn * nx * ia
            a.vy -= jn * ny * ia
            b.vx += jn * nx * ib
            b.vy += jn * ny * ib
            // friction
            const tx = -ny
            const ty = nx
            const vt = rvx * tx + rvy * ty
            const jt = clamp(-vt / (ia + ib), -jn * 0.25, jn * 0.25)
            a.vx -= jt * tx * ia
            a.vy -= jt * ty * ia
            b.vx += jt * tx * ib
            b.vy += jt * ty * ib
          }
        }
      }
    }
    // sleeping
    for (const b of bs) {
      if (b.dead || b.asleep) continue
      if (b.vx * b.vx + b.vy * b.vy < 36 && b.inPlay) {
        b.sleep += h
        if (b.sleep > 0.6) {
          b.asleep = true
          b.vx = b.vy = 0
        }
      } else b.sleep = 0
    }
    if (w.bodies.some((b) => b.dead)) w.bodies = w.bodies.filter((b) => !b.dead)
  }

  // ── Input ───────────────────────────────────────────

  function aimAt(x: number, y: number) {
    const { cx, cy } = geo()
    world.current.aim = Math.atan2(y - cy, x - cx)
  }

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const p = localPoint(e, el)
    const { W, H, ladderH } = geo()
    // pulsar button (bottom-right corner of the play area)
    if (world.current.pulsars > 0 && p.x > W - 64 && p.y > H - ladderH - 64 && p.y < H - ladderH) {
      usePulsarCharge()
      return
    }
    world.current.aiming = true
    aimAt(p.x, p.y)
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const w = world.current
    if (!w.aiming) return
    const p = localPoint(e, e.currentTarget)
    aimAt(p.x, p.y)
  }

  function onUp() {
    const w = world.current
    if (!w.aiming) return
    w.aiming = false
    launch()
  }

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__planetmerge = world
  }, [world])

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') keys.current.left = true
      else if (e.key === 'ArrowRight') keys.current.right = true
      else if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        launch()
      } else if (e.key === 'p' || e.key === 'P') usePulsarCharge()
    }
    function up(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') keys.current.left = false
      else if (e.key === 'ArrowRight') keys.current.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ── Frame ───────────────────────────────────────────

  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    const live = ph === 'play' || (ph === 'idle' && w.demo)
    w.clock += dt
    w.cool = Math.max(0, w.cool - dt)
    w.grace = Math.max(0, w.grace - dt)
    if (keys.current.left) w.aim -= raw * 2.4
    if (keys.current.right) w.aim += raw * 2.4

    for (const m of w.anims) m.t += raw
    const done = w.anims.filter((m) => m.t >= 0.09)
    w.anims = w.anims.filter((m) => m.t < 0.09)
    for (const m of done) finishMerge(m)
    for (const b of w.bodies) b.pop = Math.max(0, b.pop - raw * 2.6)

    if (!live) return
    if (w.demo) {
      w.demoT -= dt
      w.aim += raw * 0.5
      if (w.demoT <= 0 && w.bodies.length < 26) {
        w.demoT = 0.9
        const b = makeBody(rollTier(), Math.cos(w.aim) * LAUNCH_R, Math.sin(w.aim) * LAUNCH_R, -Math.cos(w.aim) * 300, -Math.sin(w.aim) * 300)
        w.bodies.push(b)
      }
      if (w.bodies.length >= 26) w.bodies = []
    }

    w.acc = Math.min(w.acc + dt, H_STEP * 6)
    while (w.acc >= H_STEP) {
      stepPhysics(H_STEP)
      w.acc -= H_STEP
    }
    if (w.demo) return

    // inPlay timeout for launched bodies that missed everything
    const R = ringR()
    let maxOver = 0
    for (const b of w.bodies) {
      if (!b.inPlay && w.clock - b.born > 1.6) b.inPlay = true
      if (!b.inPlay || b.tier >= NEBULA) continue
      const out = Math.hypot(b.x, b.y) + b.r > R
      if (out && w.grace <= 0) b.over += dt
      else b.over = Math.max(0, b.over - dt * 2)
      maxOver = Math.max(maxOver, b.over)
    }
    if (maxOver > 0.35 && Math.floor(maxOver * 4) !== Math.floor(w.maxOver * 4)) sfx.tick()
    w.maxOver = maxOver
    if (maxOver >= 2.1 && ph === 'play') die()

    // meteor showers
    if (w.shower) {
      w.shower.t += dt
      if (w.shower.t >= 1.3) {
        for (const a of w.shower.angles) {
          const b = makeBody(Math.random() < 0.7 ? 0 : 1, Math.cos(a) * LAUNCH_R, Math.sin(a) * LAUNCH_R, -Math.cos(a) * 260, -Math.sin(a) * 260)
          w.bodies.push(b)
        }
        w.shower = null
        sfx.whoosh()
      }
    } else if (w.clock > 30) {
      w.showerIn -= dt
      if (w.showerIn <= 0) {
        const n = Math.min(6, 2 + Math.floor(w.level / 2))
        const base = rand(0, Math.PI * 2)
        w.shower = { angles: Array.from({ length: n }, (_, i) => base + (i / n) * Math.PI * 2 + rand(-0.2, 0.2)), t: 0 }
        w.showerIn = Math.max(22, 48 - w.level * 2)
        showBanner('METEOR SHOWER!', `${n} rocks incoming`)
        sfx.ready()
      }
    }
    if (w.chain > 0 && w.clock - w.lastMerge > 0.9) {
      w.chain = 0
      pushHud()
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const ph = phaseRef.current
    const dt = fx.step(raw)
    update(dt, raw)
    const { cx, cy, k, ladderH } = geo()
    const R = ringR()

    ctx.drawImage(spaceSprite(W, H, w.theme), 0, 0, W, H)
    // drifting near stars (parallax)
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 28; i++) {
      const x = (i * 137.5 + t * (6 + (i % 3) * 5)) % (W + 20) - 10
      const y = (i * 71.3) % H
      ctx.globalAlpha = 0.35 + (i % 4) * 0.15
      ctx.fillRect(x, y, 1.6, 1.6)
    }
    ctx.globalAlpha = 1
    fx.applyShake(ctx)

    // gravity core
    const pulse = 1 + Math.sin(t * 3) * 0.06
    glow(ctx, cx, cy, R * k * 0.9, '#7c3aed', 0.18)
    glow(ctx, cx, cy, CORE_R * k * 3.2 * pulse, '#c4b5fd', 0.5)
    ctx.strokeStyle = 'rgba(196,181,253,0.35)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(cx, cy, CORE_R * k * (1.6 + i * 0.7), t * (1 + i * 0.4) + i, t * (1 + i * 0.4) + i + Math.PI * 0.9)
      ctx.stroke()
    }
    const cg = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, CORE_R * k)
    cg.addColorStop(0, '#ffffff')
    cg.addColorStop(0.5, '#ddd6fe')
    cg.addColorStop(1, '#6d28d9')
    ctx.fillStyle = cg
    ctx.beginPath()
    ctx.arc(cx, cy, CORE_R * k * pulse, 0, Math.PI * 2)
    ctx.fill()

    // danger ring
    const danger = clamp(w.maxOver / 2.1, 0, 1)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(t * 0.15)
    ctx.setLineDash([10, 8])
    ctx.lineWidth = 3 + danger * 3
    ctx.strokeStyle = danger > 0 ? `rgba(239,68,68,${0.6 + Math.sin(t * 16) * 0.35 * danger})` : 'rgba(125,211,252,0.55)'
    ctx.beginPath()
    ctx.arc(0, 0, R * k, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
    ctx.setLineDash([])
    if (w.grace > 0 && ph === 'play') {
      ctx.strokeStyle = `rgba(125,211,252,${0.3 + Math.sin(t * 12) * 0.2})`
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(cx, cy, R * k, 0, Math.PI * 2)
      ctx.stroke()
    }

    // shower telegraphs
    if (w.shower) {
      for (const a of w.shower.angles) {
        const p = toScreen(Math.cos(a) * (LAUNCH_R + 6), Math.sin(a) * (LAUNCH_R + 6))
        ctx.globalAlpha = 0.5 + Math.sin(t * 20) * 0.4
        ctx.fillStyle = '#f87171'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    // aim guide
    if (ph === 'play') {
      const lx = Math.cos(w.aim)
      const ly = Math.sin(w.aim)
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 8])
      ctx.lineDashOffset = -t * 30
      ctx.beginPath()
      ctx.moveTo(cx + lx * LAUNCH_R * k, cy + ly * LAUNCH_R * k)
      ctx.lineTo(cx + lx * CORE_R * k, cy + ly * CORE_R * k)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.lineDashOffset = 0
    }

    // bodies
    for (const b of w.bodies) {
      const s = toScreen(b.x, b.y)
      const r = b.r * k
      const pop = b.pop
      const sc = pop > 0 ? 1 + Math.sin(pop * Math.PI) * 0.22 * (pop > 0.5 ? 1 : 0.6) : 1
      if (b.over > 0.2) glow(ctx, s.x, s.y, r * 1.8, '#ef4444', Math.min(0.7, b.over * 0.4))
      if (b.golden) glow(ctx, s.x, s.y, r * 1.9, '#fde047', 0.45 + Math.sin(t * 8) * 0.15)
      if (b.tier === 9) glow(ctx, s.x, s.y, r * 2.4, '#f59e0b', 0.3 + Math.sin(t * 4) * 0.08)
      const spr = bodySprite(b.tier, r)
      const dim = Math.round(r) * 3.4 * sc
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.rotate(b.tier === 7 || b.tier === 10 ? 0 : b.ang)
      ctx.drawImage(spr, -dim / 2, -dim / 2, dim, dim)
      ctx.restore()
    }
    for (const m of w.anims) {
      const q = Math.min(1, m.t / 0.09)
      const M = m.a.m + m.b.m
      const mx = (m.a.x * m.a.m + m.b.x * m.b.m) / M
      const my = (m.a.y * m.a.m + m.b.y * m.b.m) / M
      for (const b of [m.a, m.b]) {
        const x = b.x + (mx - b.x) * q
        const y = b.y + (my - b.y) * q
        const s = toScreen(x, y)
        const dim = Math.round(b.r * k) * 3.4 * (1 - q * 0.25)
        ctx.drawImage(bodySprite(b.tier, b.r * k), s.x - dim / 2, s.y - dim / 2, dim, dim)
      }
    }

    // launcher with the next body
    if (ph !== 'idle') {
      const lp = toScreen(Math.cos(w.aim) * LAUNCH_R, Math.sin(w.aim) * LAUNCH_R)
      ctx.save()
      ctx.translate(lp.x, lp.y)
      ctx.rotate(w.aim + Math.PI)
      ctx.fillStyle = '#334155'
      ctx.strokeStyle = '#0b0f19'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-16, -14)
      ctx.lineTo(10, -9)
      ctx.lineTo(10, 9)
      ctx.lineTo(-16, 14)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#7dd3fc'
      ctx.fillRect(-12, -2, 18, 4)
      ctx.restore()
      const special = w.dust >= 30
      const nt = special ? w.specialNext : w.next
      const nr = radiusOf(nt) * k
      const ready = w.cool <= 0
      ctx.globalAlpha = ready ? 1 : 0.5
      if (special) glow(ctx, lp.x, lp.y, nr * 2.2, nt === NEBULA ? '#f472b6' : '#67e8f9', 0.5 + Math.sin(t * 10) * 0.2)
      if (w.nextGolden && !special) glow(ctx, lp.x, lp.y, nr * 2, '#fde047', 0.5)
      const dim = Math.round(nr) * 3.4
      ctx.drawImage(bodySprite(nt, nr), lp.x - dim / 2, lp.y - dim / 2, dim, dim)
      ctx.globalAlpha = 1
      // stardust meter around the launcher
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(lp.x, lp.y, nr + 6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = special ? '#f0abfc' : '#a5b4fc'
      ctx.beginPath()
      ctx.arc(lp.x, lp.y, nr + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (w.dust / 30))
      ctx.stroke()
    }
    fx.draw(ctx)
    ctx.restore()

    if (ph !== 'idle') {
      // next-after bubble
      const bx = 34
      const by = H - ladderH - 34
      ctx.fillStyle = 'rgba(15,23,42,0.6)'
      ctx.beginPath()
      ctx.arc(bx, by, 24, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      const ar = Math.min(16, radiusOf(w.after) * k)
      const dim = Math.round(ar) * 3.4
      ctx.drawImage(bodySprite(w.after, ar), bx - dim / 2, by - dim / 2, dim, dim)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = `800 9px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('THEN', bx, by - 31)
      // pulsar charges
      if (w.pulsars > 0) {
        const px = W - 34
        ctx.fillStyle = 'rgba(8,47,73,0.75)'
        ctx.beginPath()
        ctx.arc(px, by, 24, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#67e8f9'
        ctx.stroke()
        const pd = 12 * 3.4
        ctx.drawImage(bodySprite(PULSAR, 12), px - pd / 2, by - pd / 2, pd, pd)
        ctx.fillStyle = '#fff'
        ctx.font = `900 11px ${FONT}`
        ctx.fillText(`x${w.pulsars}`, px + 15, by + 15)
      }
      // tier ladder
      const ly = H - ladderH
      ctx.fillStyle = 'rgba(2,6,23,0.65)'
      ctx.fillRect(0, ly, W, ladderH)
      const n = MAX_TIER + 1
      const step = (W - 16) / n
      for (let i = 0; i < n; i++) {
        const x = 8 + step * (i + 0.5)
        const y = ly + ladderH * 0.45
        const known = w.seen[i] || i <= w.best
        const rr = Math.min(step * 0.36, 7 + i * 0.9)
        if (i === w.best + 1) {
          ctx.strokeStyle = `rgba(253,224,71,${0.6 + Math.sin(t * 6) * 0.3})`
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(x, y, rr + 4, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.globalAlpha = known ? 1 : 0.28
        const dd = Math.round(rr) * 3.4
        ctx.drawImage(bodySprite(i, rr), x - dd / 2, y - dd / 2, dd, dd)
        ctx.globalAlpha = 1
      }
      const nt = Math.min(MAX_TIER, w.best + 1)
      ctx.fillStyle = '#fde68a'
      ctx.font = `800 10px ${FONT}`
      ctx.textAlign = 'center'
      ctx.fillText(w.best >= MAX_TIER ? 'BLACK HOLE FORMED — MERGE TWO FOR A SINGULARITY' : `NEXT: ${BODY_NAMES[nt].toUpperCase()}`, W / 2, ly + ladderH - 7)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const won = hud.best >= 6
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena planetmerge-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Level {hud.level}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">{BODY_NAMES[hud.best]}</span>
                {hud.chain > 1 ? <span className="planetmerge-chain">x{hud.chain}</span> : null}
              </div>
            </div>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner planetmerge-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="planetmerge"
              icon={meta.icon}
              title={meta.title}
              hint="Aim around the rim and release to fling bodies at the gravity well. Merge twins into planets — keep everything inside the ring."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Stellar!' : 'Orbit overflow'}
            subtitle={`Score ${hud.score} · biggest: ${BODY_NAMES[hud.best]}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
