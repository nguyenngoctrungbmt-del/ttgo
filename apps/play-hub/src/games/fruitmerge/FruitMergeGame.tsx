import { useEffect, useRef, useState, type PointerEvent } from 'react'
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
import { FRUITS, MAX_TIER, SPECIAL_NAME, SPECIAL_R, drawFace, drawFruit, drawSpecial, star, type Mood, type SpecialKind } from './art'
import '../../shared/action/action.css'
import './fruitmerge.css'

const meta = getGame('fruitmerge')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Kind = 'fruit' | SpecialKind
type Drop = { kind: Kind; tier: number; golden: boolean }
type Body = {
  id: number
  kind: Kind
  tier: number
  x: number
  y: number
  px: number
  py: number
  vx: number
  vy: number
  r: number
  tr: number
  age: number
  still: number
  asleep: boolean
  merge: number
  mx: number
  my: number
  partner: number
  pop: number
  sq: number
  rot: number
  golden: boolean
  landed: boolean
  fuse: number
  dead: boolean
  blink: number
}

const JH = 430
const DL = 50
const DROP_Y = -52
const GRAV = 1500
const SUB = 4
const ITERS = 3
const DANGER_MAX = 2.2
const TIER_WEIGHTS = [0.34, 0.28, 0.2, 0.12, 0.06]
const LATE_WEIGHTS = [0.27, 0.26, 0.21, 0.16, 0.1]

type World = {
  bodies: Body[]
  nextId: number
  jw: number
  cur: Drop
  next: Drop
  dropX: number
  cooldown: number
  score: number
  combo: number
  lastMerge: number
  clock: number
  dangerT: number
  grace: number
  bestTier: number
  swaps: number
  pops: number
  popMode: boolean
  specialIn: number
  unlocked: SpecialKind[]
  announced: SpecialKind[]
  queued: Drop[]
  frenzyT: number
  nextFrenzy: number
  coins: number
  nextSwapAt: number
  scoreMile: number
  idleT: number
  stats: { score: number; best: number; merges: number; combo: number; specials: number; golden: number }
}

function fruitDrop(tier: number, golden = false): Drop {
  return { kind: 'fruit', tier, golden }
}

function freshWorld(jw = 300): World {
  return {
    bodies: [],
    nextId: 1,
    jw,
    cur: fruitDrop(0),
    next: fruitDrop(1),
    dropX: jw / 2,
    cooldown: 0,
    score: 0,
    combo: 0,
    lastMerge: -9,
    clock: 0,
    dangerT: 0,
    grace: 0,
    bestTier: 0,
    swaps: 1,
    pops: 1,
    popMode: false,
    specialIn: 99,
    unlocked: [],
    announced: [],
    queued: [],
    frenzyT: 0,
    nextFrenzy: 120,
    coins: 0,
    nextSwapAt: 2000,
    scoreMile: 1000,
    idleT: 0,
    stats: { score: 0, best: 1, merges: 0, combo: 0, specials: 0, golden: 0 },
  }
}

function dropRadius(d: Drop) {
  return d.kind === 'fruit' ? FRUITS[d.tier].r : SPECIAL_R[d.kind]
}

const spriteCache = new Map<string, HTMLCanvasElement>()
function fruitSprite(tier: number, rpx: number): HTMLCanvasElement {
  const px = Math.max(4, Math.round(rpx))
  const key = `${tier}|${px}`
  const hit = spriteCache.get(key)
  if (hit) return hit
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
  const dim = Math.ceil(px * 3)
  const c = document.createElement('canvas')
  c.width = Math.ceil(dim * dpr)
  c.height = Math.ceil(dim * dpr)
  const g = c.getContext('2d')!
  g.scale(dpr, dpr)
  g.translate(dim / 2, dim / 2)
  drawFruit(g, tier, px)
  spriteCache.set(key, c)
  if (spriteCache.size > 120) {
    const first = spriteCache.keys().next().value
    if (first) spriteCache.delete(first)
  }
  return c
}

const SwapIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
  </svg>
)
const PopIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="5" />
    <path d="M12 2v3M12 21v1M3 13H2M22 13h-1M5.5 6.5l2 2M18.5 6.5l-2 2" />
  </svg>
)

export default function FruitMergeGame() {
  const run = useActionRun('fruitmerge')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const aim = useRef<{ id: number } | null>(null)
  const bgRef = useRef<{ c: HTMLCanvasElement; w: number; h: number } | null>(null)
  const lastEvent = useRef(0)
  const keys = useRef({ left: false, right: false })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, best: 0, swaps: 0, pops: 0, popMode: false, frenzy: 0, combo: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, best: w.bestTier, swaps: w.swaps, pops: w.pops, popMode: w.popMode, frenzy: Math.ceil(w.frenzyT), combo: w.combo })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const jw = world.current.jw
    const top = 62
    const bottom = 74
    const s = Math.min((W - 22) / (jw + 22), (H - top - bottom) / (JH + 86))
    const jx = (W - jw * s) / 2
    const jy = H - bottom - JH * s
    return { W, H, s, jx, jy, jw, bottom }
  }

  function addBody(kind: Kind, tier: number, x: number, y: number, golden = false): Body {
    const w = world.current
    const r = kind === 'fruit' ? FRUITS[tier].r : SPECIAL_R[kind]
    const b: Body = {
      id: w.nextId++,
      kind,
      tier,
      x,
      y,
      px: x,
      py: y,
      vx: 0,
      vy: 0,
      r,
      tr: r,
      age: 0,
      still: 0,
      asleep: false,
      merge: 0,
      mx: 0,
      my: 0,
      partner: 0,
      pop: 0,
      sq: 0,
      rot: rand(-0.3, 0.3),
      golden,
      landed: false,
      fuse: -1,
      dead: false,
      blink: rand(1, 5),
    }
    w.bodies.push(b)
    return b
  }

  function wakeAll() {
    for (const b of world.current.bodies) {
      b.asleep = false
      b.still = 0
    }
  }

  // ── Physics ─────────────────────────────────────
  const contacts: number[] = []
  function physics(h: number) {
    const w = world.current
    const bs = w.bodies
    const jw = w.jw
    for (const b of bs) {
      if (b.asleep || b.merge > 0 || b.dead) continue
      b.px = b.x
      b.py = b.y
      b.vy += GRAV * h
      b.x += b.vx * h
      b.y += b.vy * h
    }
    const n = bs.length
    for (let it = 0; it < ITERS; it++) {
      const last = it === ITERS - 1
      if (last) contacts.length = 0
      for (let i = 0; i < n; i++) {
        const a = bs[i]
        if (a.merge > 0 || a.dead) continue
        for (let j = i + 1; j < n; j++) {
          const b = bs[j]
          if (b.merge > 0 || b.dead || (a.asleep && b.asleep)) continue
          const dx = b.x - a.x
          const dy = b.y - a.y
          const rr = a.r + b.r
          if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue
          const d2 = dx * dx + dy * dy
          if (d2 >= rr * rr) continue
          const d = Math.sqrt(d2) || 0.001
          const nx = dx / d
          const ny = dy / d
          if (it === 0 && (a.asleep || b.asleep)) {
            const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
            if (rel < -160) {
              a.asleep = false
              b.asleep = false
              a.still = 0
              b.still = 0
            }
          }
          const wa = a.asleep ? 0 : 1 / (a.r * a.r)
          const wb = b.asleep ? 0 : 1 / (b.r * b.r)
          const sum = wa + wb
          if (sum === 0) continue
          const p = rr - d
          a.x -= nx * p * (wa / sum)
          a.y -= ny * p * (wa / sum)
          b.x += nx * p * (wb / sum)
          b.y += ny * p * (wb / sum)
          if (last) contacts.push(i, j)
        }
      }
      for (const b of bs) {
        if (b.asleep || b.merge > 0 || b.dead) continue
        if (b.x < b.r) b.x = b.r
        else if (b.x > jw - b.r) b.x = jw - b.r
        if (b.y > JH - b.r) b.y = JH - b.r
      }
    }
    for (const b of bs) {
      if (b.asleep || b.merge > 0 || b.dead) continue
      const nvx = (b.x - b.px) / h
      const nvy = (b.y - b.py) / h
      const impact = b.vy - nvy
      if (impact > 260 && b.age > 0.05) b.sq = Math.max(b.sq, Math.min(0.22, impact / 2600))
      b.vx = nvx * 0.9995
      b.vy = nvy
      const onFloor = b.y >= JH - b.r - 0.01
      if (onFloor) b.vx *= 0.985
      const sp = Math.hypot(b.vx, b.vy)
      if (sp > 1400) {
        b.vx *= 1400 / sp
        b.vy *= 1400 / sp
      }
      b.rot += (b.vx * h) / b.r
    }
    // Contact friction stops endless rolling.
    for (let k = 0; k < contacts.length; k += 2) {
      const a = bs[contacts[k]]
      const b = bs[contacts[k + 1]]
      a.landed = true
      b.landed = true
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 1
      const tx = -dy / d
      const ty = dx / d
      const vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty
      const wa = a.asleep ? 0 : 1 / (a.r * a.r)
      const wb = b.asleep ? 0 : 1 / (b.r * b.r)
      const sum = wa + wb
      if (sum === 0) continue
      const j = vt * 0.05
      a.vx += tx * j * (wa / sum)
      a.vy += ty * j * (wa / sum)
      b.vx -= tx * j * (wb / sum)
      b.vy -= ty * j * (wb / sum)
    }
    for (const b of bs) {
      if (b.asleep || b.merge > 0 || b.dead) continue
      if (b.y >= JH - b.r - 0.01) b.landed = true
      if (b.landed && Math.abs(b.vx) + Math.abs(b.vy) < 10) b.still += h
      else b.still = 0
      if (b.still > 0.45) {
        b.asleep = true
        b.vx = 0
        b.vy = 0
      }
    }
  }

  // ── Merging & specials ──────────────────────────
  function beginMerge(a: Body, b: Body, tx: number, ty: number) {
    a.merge = b.merge = 0.085
    a.mx = b.mx = tx
    a.my = b.my = ty
    a.partner = b.id
    b.partner = a.id
  }

  function detectContacts() {
    const w = world.current
    const bs = w.bodies
    for (let i = 0; i < bs.length; i++) {
      const a = bs[i]
      if (a.merge > 0 || a.dead) continue
      for (let j = i + 1; j < bs.length; j++) {
        const b = bs[j]
        if (b.merge > 0 || b.dead || a.merge > 0) continue
        const rr = a.r + b.r + 1.5
        const dx = b.x - a.x
        const dy = b.y - a.y
        if (dx * dx + dy * dy > rr * rr) continue
        if (a.kind === 'fruit' && b.kind === 'fruit') {
          if (a.tier === b.tier && a.age > 0.02 && b.age > 0.02) {
            const lower = a.y > b.y ? a : b
            const other = lower === a ? b : a
            beginMerge(a, b, lower.x * 0.65 + other.x * 0.35, lower.y * 0.65 + other.y * 0.35)
          }
          continue
        }
        const sp = a.kind === 'fruit' ? b : a
        const fr = sp === a ? b : a
        if (sp.kind === 'rainbow' && fr.kind === 'fruit' && fr.tier < MAX_TIER) {
          sp.tier = fr.tier
          beginMerge(sp, fr, fr.x, fr.y)
        } else if (sp.kind === 'bomb' && sp.fuse < 0) {
          lightFuse(sp)
        } else if (sp.kind === 'potion' && fr.kind === 'fruit') {
          splashPotion(sp)
        }
      }
    }
    for (const b of bs) {
      if (b.dead || b.merge > 0) continue
      if (b.kind === 'bomb' && b.fuse < 0 && b.y >= JH - b.r - 0.5) lightFuse(b)
      if ((b.kind === 'rainbow' || b.kind === 'potion') && b.age > 3.5 && b.landed) {
        b.dead = true
        const { s, jx, jy } = geo()
        fx.burst(jx + b.x * s, jy + b.y * s, { count: 16, color: ['#fff', '#a5f3fc', '#f0abfc'], speed: 160 })
        sfx.pop()
      }
    }
  }

  function lightFuse(b: Body) {
    b.fuse = 0.75
    sfx.tick()
  }

  function scorePts(base: number, golden: boolean) {
    const w = world.current
    return Math.round(base * (golden ? 3 : 1) * (w.frenzyT > 0 ? 2 : 1))
  }

  function explodeBomb(b: Body) {
    const w = world.current
    const { s, jx, jy } = geo()
    b.dead = true
    const R = 92
    let n = 0
    for (const o of w.bodies) {
      if (o.dead || o === b || o.merge > 0) continue
      const dx = o.x - b.x
      const dy = o.y - b.y
      const d = Math.hypot(dx, dy)
      if (d > R + o.r) continue
      if (o.kind !== 'fruit' || o.tier <= 5) {
        o.dead = true
        n++
        if (o.kind === 'fruit') {
          w.score += scorePts(FRUITS[o.tier].pts, false)
          fx.burst(jx + o.x * s, jy + o.y * s, { count: 10, color: FRUITS[o.tier].colors, speed: 260, gravity: 500 })
        }
      } else {
        const k = (1 - d / (R + o.r)) * 520
        o.vx += (dx / (d || 1)) * k
        o.vy += (dy / (d || 1)) * k - 120
      }
    }
    const sx = jx + b.x * s
    const sy = jy + b.y * s
    fx.explode(sx, sy, 1.6)
    fx.ring(sx, sy, { color: '#fde047', maxR: R * s, life: 0.4, width: 5 })
    fx.text(sx, sy - 30, n ? `BOOM! ${n} cleared` : 'BOOM!', '#fde047', 20)
    fx.flash('#fff7ed', 0.18)
    fx.stop(0.08)
    sfx.boom(0.8)
    haptic.heavy()
    w.stats.score = w.score
    wakeAll()
    afterScore()
  }

  function splashPotion(p: Body) {
    const w = world.current
    const { s, jx, jy } = geo()
    p.dead = true
    const R = 105
    let n = 0
    for (const o of w.bodies) {
      if (o.dead || o.kind !== 'fruit' || o.merge > 0) continue
      if (Math.hypot(o.x - p.x, o.y - p.y) > R + o.r) continue
      n++
      if (o.tier === 0) {
        o.dead = true
        fx.burst(jx + o.x * s, jy + o.y * s, { count: 8, color: ['#a5f3fc', '#c4b5fd'], speed: 140 })
      } else {
        o.tier -= 1
        o.tr = FRUITS[o.tier].r
        o.pop = 0.6
      }
    }
    const sx = jx + p.x * s
    const sy = jy + p.y * s
    fx.burst(sx, sy, { count: 34, color: ['#22d3ee', '#a78bfa', '#ffffff', '#f0abfc'], speed: 300, gravity: 200, size: 4 })
    fx.ring(sx, sy, { color: '#a78bfa', maxR: R * s, life: 0.45, width: 4 })
    fx.text(sx, sy - 30, `SHRINK x${n}`, '#c4b5fd', 20)
    sfx.power()
    haptic.medium()
    wakeAll()
  }

  function finishMerge(a: Body, b: Body) {
    const w = world.current
    const { s, jx, jy } = geo()
    a.dead = true
    b.dead = true
    const rainbow = a.kind === 'rainbow' || b.kind === 'rainbow'
    const fruit = a.kind === 'fruit' ? a : b
    const golden = a.golden || b.golden
    const tier = fruit.tier + 1
    const x = a.mx
    const y = a.my
    const sx = jx + x * s
    const sy = jy + y * s
    w.combo = w.clock - w.lastMerge < 1.15 ? w.combo + 1 : 1
    w.lastMerge = w.clock
    w.stats.combo = Math.max(w.stats.combo, w.combo)
    w.stats.merges += 1
    if (rainbow) w.stats.specials += 1
    const mult = Math.min(3, 1 + (w.combo - 1) * 0.25)
    if (tier > MAX_TIER) {
      // Two golden melons: jackpot.
      const gain = scorePts(2000, false)
      w.score += gain
      w.coins += 10
      fx.explode(sx, sy, 2.4, ['#fde047', '#fbbf24', '#ffffff', '#f59e0b'])
      fx.burst(sx, sy, { count: 40, color: ['#fde047', '#fff7ed'], speed: 420, shape: 'square', size: 5, gravity: 300 })
      fx.flash('#fde047', 0.35)
      fx.slowmo(0.8, 0.3)
      fx.text(sx, sy - 40, `JACKPOT +${gain}`, '#fde047', 26)
      setBanner({ key: Date.now(), text: 'GOLDEN JACKPOT!', sub: '+10 coins' })
      sfx.win()
      haptic.success()
      wakeAll()
      afterScore()
      return
    }
    const nb = addBody('fruit', tier, x, y)
    nb.r = Math.max(a.r, b.r)
    nb.pop = 1
    nb.vy = -60
    nb.landed = true
    nb.age = 0.1
    const def = FRUITS[tier]
    const gain = Math.round(scorePts(def.pts * 2, golden) * mult)
    w.score += gain
    if (golden) w.coins += 1
    if (tier === MAX_TIER) w.stats.golden += 1
    // Juice
    const big = tier >= 6
    fx.burst(sx, sy, { count: 12 + tier * 3, color: def.colors, speed: 140 + tier * 22, size: 3 + tier * 0.3, gravity: 420, life: 0.6 })
    fx.burst(sx, sy, { count: 6 + tier, color: ['#ffffff', '#fef9c3'], speed: 200 + tier * 20, shape: 'spark', gravity: 0 })
    fx.ring(sx, sy, { color: '#ffffff', maxR: def.r * s * 1.6, life: 0.32, width: 3 })
    if (golden) fx.burst(sx, sy, { count: 14, color: ['#fde047', '#fbbf24'], speed: 220, shape: 'square', size: 4, gravity: 300 })
    fx.text(sx, sy - def.r * s - 8, w.combo > 1 ? `+${gain} x${w.combo}` : `+${gain}`, w.combo > 2 ? '#fde047' : '#ffffff', 15 + Math.min(10, tier * 1.2))
    sfx.pop()
    sfx.score(Math.min(10, w.combo + Math.floor(tier / 2)))
    if (w.combo >= 3) {
      sfx.combo()
      if (w.combo === 3 || w.combo % 2 === 1) setBanner({ key: Date.now(), text: `COMBO x${w.combo}`, sub: w.combo >= 5 ? 'juicy!' : undefined })
    }
    if (big) {
      fx.shake(2 + tier * 0.6, 0.22)
      fx.stop(0.04 + tier * 0.006)
      sfx.boom(0.2 + tier * 0.04)
      haptic.heavy()
    } else haptic.medium()
    if (tier > w.bestTier) {
      w.bestTier = tier
      w.stats.best = tier + 1
      if (tier >= 3) {
        const nextName = tier < MAX_TIER ? `next: ${FRUITS[tier + 1].name}` : 'the rarest fruit!'
        setBanner({ key: Date.now() + 1, text: `NEW: ${def.name}!`, sub: nextName })
        fx.text(sx, sy - def.r * s - 30, def.name.toUpperCase(), '#fef08a', 20)
        sfx.levelUp()
        fx.flash('#fff7ed', 0.12)
        if (tier >= 5) {
          w.pops += 1
          fx.text(sx, sy + def.r * s, '+1 POP', '#f9a8d4', 15)
        }
      }
      if (tier >= 7 && performance.now() - lastEvent.current > 30000) {
        lastEvent.current = performance.now()
        void trackEvent('action_milestone', { game_id: 'fruitmerge', kind: 'tier', value: tier + 1 })
      }
    }
    wakeAll()
    afterScore()
  }

  function afterScore() {
    const w = world.current
    w.stats.score = w.score
    if (w.score >= w.nextSwapAt) {
      w.nextSwapAt += 2000 + Math.floor(w.nextSwapAt / 3)
      w.swaps += 1
      const { W } = geo()
      fx.text(W / 2, 110, '+1 SWAP', '#fdba74', 18)
    }
    if (w.score >= w.scoreMile) {
      const m = w.scoreMile
      w.scoreMile += m < 5000 ? 1000 : 2500
      setBanner((b) => b ?? { key: Date.now() + 2, text: `${m.toLocaleString()} POINTS!` })
      sfx.levelUp()
    }
    run.update(w.stats)
    pushHud()
  }

  // ── Dropping ────────────────────────────────────
  function roll(): Drop {
    const w = world.current
    if (w.queued.length) return w.queued.shift()!
    w.specialIn -= 1
    if (w.specialIn <= 0 && w.unlocked.length) {
      w.specialIn = Math.round(rand(12, 18))
      const fresh = w.unlocked.find((k) => !w.announced.includes(k))
      const kind = fresh ?? w.unlocked[Math.floor(Math.random() * w.unlocked.length)]
      if (fresh) {
        w.announced.push(fresh)
        const desc = fresh === 'rainbow' ? 'merges with any fruit' : fresh === 'bomb' ? 'blasts small fruit away' : 'shrinks nearby fruit'
        setBanner({ key: Date.now() + 3, text: `NEW: ${SPECIAL_NAME[fresh]}!`, sub: desc })
        sfx.power()
      }
      return { kind, tier: 0, golden: false }
    }
    const weights = w.clock > 200 ? LATE_WEIGHTS : TIER_WEIGHTS
    let q = Math.random()
    let tier = 0
    for (; tier < weights.length - 1; tier++) {
      q -= weights[tier]
      if (q <= 0) break
    }
    // Never offer a fruit bigger than the player has made so far (keeps early game calm).
    tier = Math.min(tier, Math.max(2, w.bestTier))
    const golden = w.clock > 30 && Math.random() < 0.06
    return fruitDrop(tier, golden)
  }

  function dropNow() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.cooldown > 0 || w.popMode) return
    const d = w.cur
    const r = dropRadius(d)
    const x = clamp(w.dropX, r + 1, w.jw - r - 1)
    const b = addBody(d.kind, d.tier, x, DROP_Y, d.golden)
    b.vy = 220
    if (d.kind !== 'fruit') w.stats.specials += 1
    w.cur = w.next
    w.next = roll()
    w.cooldown = 0.42
    sfx.whoosh()
    haptic.light()
    run.update(w.stats)
  }

  function swap() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.swaps <= 0) return
    const t = w.cur
    w.cur = w.next
    w.next = t
    w.swaps -= 1
    sfx.flip()
    haptic.light()
    pushHud()
  }

  function togglePop() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    if (w.popMode) w.popMode = false
    else if (w.pops > 0) w.popMode = true
    sfx.tap()
    pushHud()
  }

  function popAt(wx: number, wy: number) {
    const w = world.current
    let best: Body | null = null
    let bd = 1e9
    for (const b of w.bodies) {
      if (b.dead || b.merge > 0) continue
      const d = Math.hypot(b.x - wx, b.y - wy) - b.r
      if (d < bd) {
        bd = d
        best = b
      }
    }
    if (!best || bd > 16) return
    const { s, jx, jy } = geo()
    best.dead = true
    w.pops -= 1
    w.popMode = false
    w.stats.specials += 1
    const cols = best.kind === 'fruit' ? FRUITS[best.tier].colors : ['#ffffff', '#a5f3fc']
    fx.burst(jx + best.x * s, jy + best.y * s, { count: 26, color: cols, speed: 260, gravity: 500, size: 4 })
    fx.ring(jx + best.x * s, jy + best.y * s, { color: '#f9a8d4', maxR: best.r * s * 1.8, life: 0.35 })
    fx.text(jx + best.x * s, jy + best.y * s - 20, 'POP!', '#f9a8d4', 20)
    fx.shake(4, 0.15)
    sfx.pop()
    sfx.boom(0.25)
    haptic.medium()
    wakeAll()
    run.update(w.stats)
    pushHud()
  }

  // ── Run lifecycle ───────────────────────────────
  function start() {
    void unlockAudio()
    const w = freshWorld(Math.round(300 * (1 + run.level('jar') * 0.07)))
    w.swaps = 1 + run.level('swap')
    w.cur = fruitDrop(0)
    w.next = fruitDrop(1)
    w.cooldown = 0.3
    world.current = w
    fx.reset()
    spriteCache.clear()
    run.begin()
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'FRUIT DROP', sub: 'match two to merge' })
    sfx.ready()
    pushHud()
  }

  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    w.popMode = false
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.5)
    fx.slowmo(1, 0.3)
    fx.stop(0.12)
    sfx.lose()
    haptic.error()
    const { W, jy, s } = geo()
    fx.text(W / 2, jy + DL * s - 30, 'JAR OVERFLOW!', '#fecaca', 26)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.score / 300 + (w.bestTier + 1) * 1.5 + w.coins) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.bestTier >= 7, stats: { ...w.stats }, coins }, revive)
      pushHud()
    }, 1200)
  }

  /** Revive: clear the smallest fruit (keeping big ones), breathe, and hand over a bomb. */
  function revive() {
    const w = world.current
    const { s, jx, jy } = geo()
    const live = w.bodies.filter((b) => !b.dead)
    const target = Math.max(6, Math.ceil(live.length * 0.45))
    const order = [...live].sort((a, b) => (a.kind === 'fruit' ? a.tier : -1) - (b.kind === 'fruit' ? b.tier : -1))
    let removed = 0
    for (const b of order) {
      const high = b.y - b.r < DL + 10
      if ((removed < target && (b.kind !== 'fruit' || b.tier <= 6)) || (high && b.tier <= 7)) {
        b.dead = true
        removed++
        fx.burst(jx + b.x * s, jy + b.y * s, { count: 10, color: b.kind === 'fruit' ? FRUITS[b.tier].colors : ['#fff'], speed: 180, gravity: 300 })
      }
    }
    w.bodies = w.bodies.filter((b) => !b.dead)
    w.dangerT = 0
    w.grace = 3
    w.cooldown = 0.6
    w.queued = []
    w.next = { kind: 'bomb', tier: 0, golden: false }
    wakeAll()
    fx.ring(jx + (w.jw / 2) * s, jy + (JH / 2) * s, { color: '#fde047', maxR: 220, life: 0.6, width: 5 })
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'small fruit cleared · bomb ready' })
    setPhaseBoth('play')
    pushHud()
  }

  // ── Input ───────────────────────────────────────
  function toWorld(e: PointerEvent<HTMLDivElement>) {
    const p = localPoint(e, e.currentTarget)
    const { s, jx, jy } = geo()
    return { x: (p.x - jx) / s, y: (p.y - jy) / s }
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const w = world.current
    const p = toWorld(e)
    if (w.popMode) {
      popAt(p.x, p.y)
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    aim.current = { id: e.pointerId }
    w.dropX = p.x
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!aim.current || aim.current.id !== e.pointerId) return
    world.current.dropX = toWorld(e).x
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    if (!aim.current || aim.current.id !== e.pointerId) return
    aim.current = null
    world.current.dropX = toWorld(e).x
    dropNow()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.left = true
      else if (e.key === 'ArrowRight' || e.key === 'd') keys.current.right = true
      else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        dropNow()
      } else if (e.key === 's' || e.key === 'Shift') swap()
    }
    function up(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.left = false
      else if (e.key === 'ArrowRight' || e.key === 'd') keys.current.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ── Simulation tick ─────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    if (dt > 0) {
      const h = Math.min(dt, 1 / 30) / SUB
      for (let k = 0; k < SUB; k++) physics(h)
    }
    for (const b of w.bodies) {
      if (b.dead) continue
      b.age += dt
      b.sq = Math.max(0, b.sq - raw * 1.6)
      b.pop = Math.max(0, b.pop - raw * 3.2)
      b.blink -= raw
      if (b.blink < -0.12) b.blink = rand(2, 6)
      if (Math.abs(b.r - b.tr) > 0.05) b.r += (b.tr - b.r) * Math.min(1, dt * 12)
      if (b.merge > 0) {
        b.x += (b.mx - b.x) * Math.min(1, dt * 30)
        b.y += (b.my - b.y) * Math.min(1, dt * 30)
        b.merge -= dt
      }
      if (b.fuse > 0) {
        const before = b.fuse
        b.fuse -= dt
        if (Math.floor(before * 6) !== Math.floor(b.fuse * 6)) sfx.tick()
      }
    }
    // Finish merges once both partners have arrived.
    for (const b of w.bodies) {
      if (b.dead || b.merge > 0 || b.partner === 0) continue
      const p = w.bodies.find((o) => o.id === b.partner)
      b.partner = 0
      if (p && !p.dead) {
        p.partner = 0
        if (ph === 'idle') {
          b.dead = p.dead = true
          const nb = addBody('fruit', Math.min(MAX_TIER, (b.kind === 'fruit' ? b.tier : p.tier) + 1), b.mx, b.my)
          nb.r = Math.max(b.r, p.r)
          nb.pop = 1
          nb.landed = true
          const { s, jx, jy } = geo()
          fx.burst(jx + b.mx * s, jy + b.my * s, { count: 12, color: FRUITS[nb.tier].colors, speed: 160, gravity: 400 })
          wakeAll()
        } else finishMerge(b, p)
      }
    }
    for (const b of w.bodies) if (b.kind === 'bomb' && !b.dead && b.fuse > -1 && b.fuse <= 0) explodeBomb(b)
    if (w.bodies.some((b) => b.dead)) w.bodies = w.bodies.filter((b) => !b.dead)
    if (dt > 0) detectContacts()

    if (ph === 'play') {
      w.clock += dt
      w.cooldown = Math.max(0, w.cooldown - dt)
      w.grace = Math.max(0, w.grace - dt)
      if (keys.current.left) w.dropX -= 260 * raw
      if (keys.current.right) w.dropX += 260 * raw
      const cr = dropRadius(w.cur)
      w.dropX = clamp(w.dropX, cr + 1, w.jw - cr - 1)
      const unlock = (k: SpecialKind, at: number) => {
        if (w.clock >= at && !w.unlocked.includes(k)) {
          w.unlocked.push(k)
          w.specialIn = Math.min(w.specialIn, 1)
        }
      }
      unlock('rainbow', 40)
      unlock('bomb', 95)
      unlock('potion', 150)
      if (w.clock >= w.nextFrenzy) {
        w.nextFrenzy += 80
        w.frenzyT = 12
        setBanner({ key: Date.now() + 4, text: 'FRUIT FRENZY!', sub: 'double points for 12s' })
        sfx.power()
        haptic.success()
      }
      if (w.frenzyT > 0) {
        const before = Math.ceil(w.frenzyT)
        w.frenzyT = Math.max(0, w.frenzyT - dt)
        if (Math.ceil(w.frenzyT) !== before) pushHud()
      }
      // Overflow check
      let over = false
      for (const b of w.bodies) {
        if (b.merge > 0 || b.age < 1 || !b.landed) continue
        if (b.y - b.r < DL) {
          over = true
          break
        }
      }
      if (over && w.grace <= 0) {
        const before = w.dangerT
        w.dangerT += dt
        if (Math.floor(before * 3) !== Math.floor(w.dangerT * 3)) {
          sfx.tick()
          haptic.light()
        }
        if (w.dangerT >= DANGER_MAX) die()
      } else w.dangerT = Math.max(0, w.dangerT - dt * 1.5)
    } else if (ph === 'idle') {
      // Attract mode: a gentle self-playing jar.
      w.idleT -= raw
      if (w.idleT <= 0) {
        w.idleT = 0.85
        const t = Math.floor(Math.random() * 4)
        addBody('fruit', t, rand(30, w.jw - 30), DROP_Y).vy = 200
      }
      if (w.bodies.some((b) => b.age > 1 && b.y - b.r < DL + 40)) {
        const { s, jx, jy } = geo()
        for (const b of w.bodies) fx.burst(jx + b.x * s, jy + b.y * s, { count: 5, color: b.kind === 'fruit' ? FRUITS[b.tier].colors : ['#fff'], speed: 140 })
        w.bodies = []
      }
    }
  }

  // ── Rendering ───────────────────────────────────
  function background(W: number, H: number) {
    const cached = bgRef.current
    if (cached && cached.w === W && cached.h === H) return cached.c
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    const c = document.createElement('canvas')
    c.width = Math.ceil(W * dpr)
    c.height = Math.ceil(H * dpr)
    const g = c.getContext('2d')!
    g.scale(dpr, dpr)
    const wall = g.createLinearGradient(0, 0, 0, H)
    wall.addColorStop(0, '#fff7ed')
    wall.addColorStop(0.6, '#fed7aa')
    wall.addColorStop(1, '#fdba74')
    g.fillStyle = wall
    g.fillRect(0, 0, W, H)
    // wallpaper dots
    g.fillStyle = 'rgba(251,146,60,0.18)'
    for (let y = 18; y < H; y += 34) {
      for (let x = (y / 34) % 2 ? 0 : 17; x < W; x += 34) {
        g.beginPath()
        g.arc(x, y, 3.2, 0, Math.PI * 2)
        g.fill()
      }
    }
    // window with distant orchard
    const wx = W * 0.08
    const wy = H * 0.06
    const ww = W * 0.34
    const wh = H * 0.2
    g.fillStyle = '#fef3c7'
    g.beginPath()
    g.roundRect(wx - 6, wy - 6, ww + 12, wh + 12, 10)
    g.fill()
    const sky = g.createLinearGradient(0, wy, 0, wy + wh)
    sky.addColorStop(0, '#7dd3fc')
    sky.addColorStop(1, '#e0f2fe')
    g.fillStyle = sky
    g.beginPath()
    g.roundRect(wx, wy, ww, wh, 6)
    g.fill()
    g.save()
    g.beginPath()
    g.roundRect(wx, wy, ww, wh, 6)
    g.clip()
    g.fillStyle = '#86efac'
    g.beginPath()
    g.ellipse(wx + ww * 0.3, wy + wh, ww * 0.5, wh * 0.35, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#4ade80'
    g.beginPath()
    g.ellipse(wx + ww * 0.85, wy + wh * 1.05, ww * 0.5, wh * 0.4, 0, 0, Math.PI * 2)
    g.fill()
    for (let i = 0; i < 3; i++) {
      const tx = wx + ww * (0.2 + i * 0.3)
      const ty = wy + wh * 0.68
      g.fillStyle = '#15803d'
      g.beginPath()
      g.arc(tx, ty, wh * 0.13, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#ef4444'
      g.beginPath()
      g.arc(tx - 3, ty - 2, 2, 0, Math.PI * 2)
      g.arc(tx + 4, ty + 3, 2, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = '#fde047'
    g.beginPath()
    g.arc(wx + ww * 0.78, wy + wh * 0.25, wh * 0.11, 0, Math.PI * 2)
    g.fill()
    g.restore()
    g.fillStyle = '#fef3c7'
    g.fillRect(wx + ww / 2 - 3, wy, 6, wh)
    g.fillRect(wx, wy + wh / 2 - 3, ww, 6)
    // shelf with jars on the right
    const shy = H * 0.17
    g.fillStyle = '#b45309'
    g.fillRect(W * 0.6, shy, W * 0.36, 8)
    g.fillStyle = '#92400e'
    g.fillRect(W * 0.6, shy + 8, W * 0.36, 4)
    const jarCols = ['#f472b6', '#facc15', '#a3e635']
    for (let i = 0; i < 3; i++) {
      const x = W * 0.63 + i * W * 0.11
      g.fillStyle = 'rgba(255,255,255,0.55)'
      g.beginPath()
      g.roundRect(x, shy - 30, W * 0.08, 30, 5)
      g.fill()
      g.fillStyle = jarCols[i]
      g.beginPath()
      g.roundRect(x + 2, shy - 18, W * 0.08 - 4, 16, 4)
      g.fill()
      g.fillStyle = '#9a3412'
      g.fillRect(x - 1, shy - 34, W * 0.08 + 2, 6)
    }
    // table
    const geoNow = geo()
    const ty = geoNow.jy + JH * geoNow.s
    const tg = g.createLinearGradient(0, ty, 0, H)
    tg.addColorStop(0, '#c2410c')
    tg.addColorStop(1, '#7c2d12')
    g.fillStyle = tg
    g.fillRect(0, ty, W, H - ty)
    g.fillStyle = '#ea580c'
    g.fillRect(0, ty, W, 5)
    g.strokeStyle = 'rgba(67,20,7,0.35)'
    g.lineWidth = 1.5
    for (let x = 30; x < W; x += 70) {
      g.beginPath()
      g.moveTo(x, ty + 8)
      g.lineTo(x - 10, H)
      g.stroke()
    }
    bgRef.current = { c, w: W, h: H }
    return c
  }

  function drawBody(ctx: CanvasRenderingContext2D, b: Body, s: number, jx: number, jy: number, t: number, dangerMood: boolean) {
    const x = jx + b.x * s
    const y = jy + b.y * s
    const pop = b.pop > 0 ? 1 + Math.sin(b.pop * Math.PI * 2.5) * 0.22 * b.pop : 1
    const shrink = b.merge > 0 ? 0.92 : 1
    ctx.save()
    ctx.translate(x, y)
    ctx.scale((1 + b.sq) * pop * shrink, (1 - b.sq) * pop * shrink)
    ctx.rotate(b.rot)
    if (b.kind === 'fruit') {
      const def = FRUITS[b.tier]
      const base = def.r * s
      const k = b.r / def.r
      const spr = fruitSprite(b.tier, base)
      const dim = Math.ceil(Math.max(4, Math.round(base)) * 3)
      const sc = (base / Math.max(4, Math.round(base))) * k
      ctx.drawImage(spr, (-dim / 2) * sc, (-dim / 2) * sc, dim * sc, dim * sc)
      const rr = b.r * s
      let mood: Mood = 'happy'
      if (b.merge > 0 || b.sq > 0.08) mood = 'squish'
      else if (dangerMood && b.y - b.r < DL + 20) mood = 'scared'
      else if (b.pop > 0.3) mood = 'wow'
      else if (b.blink < 0) mood = 'blink'
      drawFace(ctx, b.tier, rr, mood)
      if (b.golden) {
        ctx.strokeStyle = `rgba(253,224,71,${0.7 + Math.sin(t * 6 + b.id) * 0.3})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(0, 0, rr + 2, 0, Math.PI * 2)
        ctx.stroke()
        ctx.rotate(-b.rot + t * 1.5)
        star(ctx, rr * 0.85, -rr * 0.6, 4 + Math.sin(t * 8 + b.id) * 2, '#fef08a')
        star(ctx, -rr * 0.8, rr * 0.55, 3 + Math.cos(t * 7 + b.id) * 1.5, '#fef08a')
      }
    } else {
      drawSpecial(ctx, b.kind, b.r * s, t, b.fuse)
    }
    ctx.restore()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    if (size.current.w !== W || size.current.h !== H) {
      size.current = { w: W, h: H }
      bgRef.current = null
    }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    update(dt, raw)
    const { s, jx, jy, jw } = geo()

    ctx.drawImage(background(W, H), 0, 0, W, H)
    // floating dust motes for depth
    ctx.fillStyle = 'rgba(255,255,255,0.55)'
    for (let i = 0; i < 10; i++) {
      const mx = ((i * 97 + t * (8 + i)) % (W + 20)) - 10
      const my = (i * 61 + Math.sin(t * 0.5 + i) * 20) % (H * 0.6)
      ctx.beginPath()
      ctx.arc(mx, my + 40, 1.5 + (i % 3), 0, Math.PI * 2)
      ctx.fill()
    }

    fx.applyShake(ctx)
    const jW = jw * s
    const jH = JH * s
    // jar shadow + back glass
    ctx.fillStyle = 'rgba(67,20,7,0.25)'
    ctx.beginPath()
    ctx.ellipse(jx + jW / 2, jy + jH + 6, jW * 0.56, 9, 0, 0, Math.PI * 2)
    ctx.fill()
    const glass = ctx.createLinearGradient(jx, 0, jx + jW, 0)
    glass.addColorStop(0, 'rgba(224,242,254,0.82)')
    glass.addColorStop(0.5, 'rgba(255,251,245,0.72)')
    glass.addColorStop(1, 'rgba(224,242,254,0.85)')
    ctx.fillStyle = glass
    ctx.beginPath()
    ctx.roundRect(jx - 6, jy - 8, jW + 12, jH + 14, [8, 8, 22, 22])
    ctx.fill()
    if (w.frenzyT > 0) glow(ctx, jx + jW / 2, jy + jH / 2, jW * 0.8, '#fde047', 0.25 + Math.sin(t * 8) * 0.08)

    // danger line
    const dly = jy + DL * s
    const danger = w.dangerT > 0
    ctx.setLineDash([8, 6])
    ctx.lineWidth = danger ? 3 : 2
    ctx.strokeStyle = danger ? `rgba(239,68,68,${0.6 + Math.sin(t * 20) * 0.4})` : 'rgba(239,68,68,0.45)'
    ctx.beginPath()
    ctx.moveTo(jx, dly)
    ctx.lineTo(jx + jW, dly)
    ctx.stroke()
    ctx.setLineDash([])

    // drop guide
    if (ph === 'play' && !w.popMode) {
      const cr = dropRadius(w.cur)
      const ready = w.cooldown <= 0
      let hitY = JH - cr
      for (const b of w.bodies) {
        const dx = Math.abs(b.x - w.dropX)
        const rr = b.r + cr
        if (dx < rr) hitY = Math.min(hitY, b.y - Math.sqrt(rr * rr - dx * dx))
      }
      const gx = jx + w.dropX * s
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'
      ctx.lineWidth = 2
      ctx.setLineDash([3, 7])
      ctx.lineDashOffset = -t * 30
      ctx.beginPath()
      ctx.moveTo(gx, jy + (DROP_Y + cr) * s)
      ctx.lineTo(gx, jy + hitY * s)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.lineDashOffset = 0
      ctx.globalAlpha = 0.3
      ctx.beginPath()
      ctx.arc(gx, jy + hitY * s, cr * s, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
      // claw holding the fruit
      const cy = jy + DROP_Y * s
      ctx.strokeStyle = '#7c2d12'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(gx, cy - cr * s - 22)
      ctx.lineTo(gx, cy - cr * s - 6)
      ctx.stroke()
      ctx.fillStyle = '#9a3412'
      ctx.beginPath()
      ctx.roundRect(gx - 16, cy - cr * s - 10, 32, 7, 3)
      ctx.fill()
      const open = ready ? 0 : 0.5
      ctx.strokeStyle = '#9a3412'
      ctx.lineWidth = 3.5
      ctx.lineCap = 'round'
      for (const sx of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(gx + sx * 14, cy - cr * s - 6)
        ctx.quadraticCurveTo(gx + sx * (cr * s + 6 + open * 10), cy - cr * s * 0.3, gx + sx * (cr * s * 0.6 + open * 12), cy + cr * s * 0.2)
        ctx.stroke()
      }
      if (ready) {
        const fake: Body = { ...placeholder, kind: w.cur.kind, tier: w.cur.tier, x: w.dropX, y: DROP_Y, r: cr, tr: cr, golden: w.cur.golden, id: -1, blink: Math.sin(t * 0.7) > 0.97 ? -1 : 1, rot: Math.sin(t * 2) * 0.08 }
        drawBody(ctx, fake, s, jx, jy, t, false)
      }
    }

    for (const b of w.bodies) drawBody(ctx, b, s, jx, jy, t, danger)
    if (w.popMode) {
      ctx.strokeStyle = `rgba(244,114,182,${0.6 + Math.sin(t * 10) * 0.3})`
      ctx.lineWidth = 2.5
      for (const b of w.bodies) {
        ctx.beginPath()
        ctx.arc(jx + b.x * s, jy + b.y * s, b.r * s + 3, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // jar front glass highlights + rim
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.beginPath()
    ctx.roundRect(jx + 6, jy + 10, 7, jH - 30, 4)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.beginPath()
    ctx.roundRect(jx + jW - 16, jy + 30, 5, jH * 0.5, 3)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(jx - 4, jy - 10)
    ctx.lineTo(jx - 4, jy + jH - 14)
    ctx.quadraticCurveTo(jx - 4, jy + jH + 5, jx + 18, jy + jH + 5)
    ctx.lineTo(jx + jW - 18, jy + jH + 5)
    ctx.quadraticCurveTo(jx + jW + 4, jy + jH + 5, jx + jW + 4, jy + jH - 14)
    ctx.lineTo(jx + jW + 4, jy - 10)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(14,116,144,0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath()
    ctx.roundRect(jx - 10, jy - 14, 14, 8, 4)
    ctx.roundRect(jx + jW - 4, jy - 14, 14, 8, 4)
    ctx.fill()

    if (danger) {
      const k = clamp(w.dangerT / DANGER_MAX, 0, 1)
      const cx = jx + jW / 2
      ctx.fillStyle = 'rgba(127,29,29,0.55)'
      ctx.beginPath()
      ctx.arc(cx, dly, 18, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#f87171'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(cx, dly, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - k))
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = "900 15px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('!', cx, dly + 1)
    }

    fx.draw(ctx)
    ctx.restore()

    if (danger) {
      const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7)
      vg.addColorStop(0, 'rgba(239,68,68,0)')
      vg.addColorStop(1, `rgba(239,68,68,${0.25 * clamp(w.dangerT / DANGER_MAX, 0, 1) + 0.05})`)
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, W, H)
    }

    if (ph !== 'idle') {
      // next bubble
      const nx = W - 40
      const ny = 36
      ctx.fillStyle = 'rgba(124,45,18,0.35)'
      ctx.beginPath()
      ctx.arc(nx, ny, 25, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'
      ctx.lineWidth = 2
      ctx.stroke()
      const nr = dropRadius(w.next)
      const ns = Math.min(17 / nr, 1)
      const fake: Body = { ...placeholder, kind: w.next.kind, tier: w.next.tier, golden: w.next.golden, x: 0, y: 0, r: nr, tr: nr, id: -2, blink: 1, rot: 0 }
      drawBody(ctx, fake, ns, nx, ny, t, false)
      ctx.fillStyle = '#fff'
      ctx.font = "800 9px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('NEXT', nx, ny + 27)

      // tier ladder
      const lx0 = 70
      const lx1 = W - 70
      const step = (lx1 - lx0) / FRUITS.length
      const ly = H - 26
      const ir = Math.min(11, step * 0.42)
      const goal = Math.min(MAX_TIER, w.bestTier + 1)
      ctx.fillStyle = 'rgba(67,20,7,0.35)'
      ctx.beginPath()
      ctx.roundRect(lx0 - 6, ly - ir - 6, lx1 - lx0 + 12, ir * 2 + 12, ir + 6)
      ctx.fill()
      for (let i = 0; i < FRUITS.length; i++) {
        const x = lx0 + step * (i + 0.5)
        const reached = i <= w.bestTier
        ctx.globalAlpha = reached ? 1 : i === goal ? 0.75 : 0.28
        const spr = fruitSprite(i, ir / 1.1)
        const dim = Math.ceil(Math.max(4, Math.round(ir / 1.1)) * 3)
        const pulse = i === goal ? 1 + Math.sin(t * 5) * 0.12 : 1
        ctx.drawImage(spr, x - (dim / 2) * pulse, ly - (dim / 2) * pulse, dim * pulse, dim * pulse)
        if (i === goal && goal > w.bestTier) {
          ctx.globalAlpha = 1
          ctx.strokeStyle = '#fde047'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(x, ly, ir + 3, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
      if (goal > w.bestTier) {
        ctx.fillStyle = '#fff7ed'
        ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillText(`next: ${FRUITS[goal].name}`, (lx0 + lx1) / 2, ly - ir - 8)
      }
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const won = hud.best >= 7
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena fm-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="fm-sub">Best: {FRUITS[hud.best].name}</div>
                {hud.frenzy > 0 ? <span className="fm-pill">FRENZY x2 · {hud.frenzy}s</span> : null}
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'dying' ? (
            <>
              <button
                type="button"
                className="fm-helper is-left"
                aria-label="Swap current and next fruit"
                disabled={hud.swaps <= 0}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={swap}
              >
                <SwapIcon />
                <span className="fm-helper__n">{hud.swaps}</span>
              </button>
              <button
                type="button"
                className={`fm-helper is-right${hud.popMode ? ' is-on' : ''}`}
                aria-label="Pop a fruit"
                disabled={hud.pops <= 0 && !hud.popMode}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={togglePop}
              >
                <PopIcon />
                <span className="fm-helper__n">{hud.pops}</span>
              </button>
            </>
          ) : null}
          {hud.popMode && phase === 'play' ? <div className="fm-hint">Tap a fruit to pop it</div> : null}
          {banner && phase === 'play' ? (
            <div className="action-banner fm-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="fruitmerge"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to aim, release to drop. Two matching fruits merge into a bigger one — don't let the jar overflow!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Fruit master!' : 'Jar overflow'}
            subtitle={`Score ${hud.score} · biggest: ${FRUITS[hud.best].name}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}

const placeholder: Body = {
  id: 0,
  kind: 'fruit',
  tier: 0,
  x: 0,
  y: 0,
  px: 0,
  py: 0,
  vx: 0,
  vy: 0,
  r: 10,
  tr: 10,
  age: 9,
  still: 0,
  asleep: true,
  merge: 0,
  mx: 0,
  my: 0,
  partner: 0,
  pop: 0,
  sq: 0,
  rot: 0,
  golden: false,
  landed: true,
  fuse: -1,
  dead: false,
  blink: 1,
}
