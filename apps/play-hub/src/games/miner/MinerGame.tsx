import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, dist, rand } from '../../shared/action/fx'
import { useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { MINER_LEVELS, type MinerKind } from './levels'
import { MINES, blob, drawClaw, drawDynamite, drawItem, drawMiner, paintMine, type ItemKind } from './art'
import '../../shared/action/action.css'
import './miner.css'

const meta = getGame('miner')

type Phase = 'idle' | 'play' | 'shop' | 'dying' | 'over'

type Item = {
  id: number
  kind: ItemKind
  x: number
  y: number
  r: number
  value: number
  weight: number
  verts: number[]
  seed: number
  dir: number
  speed: number
  x0: number
  holds: boolean
  big: boolean
}

type Claw = { mode: 'swing' | 'out' | 'back'; ang: number; len: number; swingT: number; item: Item | null; open: number }
type Stick = { x: number; y: number; t: number }

export type ShopId = 'dynamite' | 'tonic' | 'clover' | 'polish' | 'rockbook'
type Offer = { id: ShopId; label: string; desc: string; price: number; bought: boolean }

const SHOP: Record<ShopId, { label: string; desc: string; base: number }> = {
  dynamite: { label: 'Dynamite', desc: 'Blow up a bad catch while reeling', base: 35 },
  tonic: { label: 'Strength Tonic', desc: 'Reel 60% faster next level', base: 110 },
  clover: { label: 'Lucky Clover', desc: 'Mystery bags pay much more', base: 70 },
  polish: { label: 'Gem Polish', desc: 'Diamonds worth +50%', base: 90 },
  rockbook: { label: 'Rock Collector', desc: 'Rocks worth 5x next level', base: 15 },
}

/** Money needed during generated level n (after the authored mines). */
const need = (n: number) => Math.min(2000, 1600 + Math.max(0, n - 30) * 10)
/** Money to earn during level n: hand-set for authored mines, formula afterwards. */
const targetFor = (n: number) => MINER_LEVELS[n - 1]?.target ?? need(n)
const mineFor = (n: number) => MINER_LEVELS[n - 1]?.mine ?? Math.floor((Math.max(1, n) - 1) / 4) % MINES.length
const KIND_SPEC: Record<MinerKind, keyof typeof SPEC> = {
  gS: 'goldS', gM: 'goldM', gL: 'goldL', gX: 'goldX', rS: 'rockS', rL: 'rockL', dm: 'diamond', bag: 'bag', tnt: 'tnt', bone: 'bone',
}

type World = {
  demo: boolean
  items: Item[]
  claw: Claw
  sticks: Stick[]
  level: number
  money: number
  earned: number
  goal: number
  time: number
  dynamite: number
  strength: number
  boosts: { tonic: boolean; clover: boolean; polish: boolean; rockbook: boolean }
  bagBoost: number
  crank: number
  mood: 'idle' | 'strain' | 'cheer' | 'sad'
  moodT: number
  id: number
  autoT: number
  ended: boolean
  /** Level bookkeeping for stars. */
  target: number
  levelEarned: number
  goalAt: number
  clearedRun: number
  tip: string
  tipT: number
  stats: { score: number; level: number; money: number; diamonds: number; moles: number; blasts: number }
}

function freshWorld(demo: boolean): World {
  return {
    demo,
    items: [],
    claw: { mode: 'swing', ang: 0, len: 0, swingT: 0, item: null, open: 1 },
    sticks: [],
    level: 0,
    money: 0,
    earned: 0,
    goal: 0,
    time: 60,
    dynamite: 0,
    strength: 1,
    boosts: { tonic: false, clover: false, polish: false, rockbook: false },
    bagBoost: 1,
    crank: 0,
    mood: 'idle',
    moodT: 0,
    id: 1,
    autoT: 1.5,
    ended: false,
    target: 0,
    levelEarned: 0,
    goalAt: -1,
    clearedRun: 0,
    tip: '',
    tipT: 0,
    stats: { score: 0, level: 0, money: 0, diamonds: 0, moles: 0, blasts: 0 },
  }
}

const SPEC: Record<string, { kind: ItemKind; r: number; value: number; weight: number }> = {
  goldS: { kind: 'gold', r: 10, value: 50, weight: 1 },
  goldM: { kind: 'gold', r: 18, value: 125, weight: 2.5 },
  goldL: { kind: 'gold', r: 30, value: 300, weight: 5.5 },
  goldX: { kind: 'gold', r: 38, value: 500, weight: 7.5 },
  rockS: { kind: 'rock', r: 14, value: 11, weight: 3 },
  rockL: { kind: 'rock', r: 24, value: 20, weight: 6.5 },
  diamond: { kind: 'diamond', r: 9, value: 600, weight: 0.5 },
  bag: { kind: 'bag', r: 13, value: 0, weight: 1.5 },
  tnt: { kind: 'tnt', r: 15, value: 0, weight: 1 },
  mole: { kind: 'mole', r: 12, value: 2, weight: 1 },
  bone: { kind: 'bone', r: 12, value: 15, weight: 1 },
}

export default function MinerGame() {
  const run = useActionRun('miner')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(true))
  const phaseRef = useRef<Phase>('idle')
  const bg = useRef<{ key: string; canvas: HTMLCanvasElement | null }>({ key: '', canvas: null })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ money: 0, goal: 650, level: 1, time: 60, dynamite: 0, earned: 0 })
  const [offers, setOffers] = useState<Offer[]>([])
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ money: w.money, goal: w.goal, level: w.level, time: Math.ceil(w.time), dynamite: w.dynamite, earned: w.earned })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const u = Math.min(W / 360, H / 640)
    const sy = Math.round(62 + 74 * u)
    return { W, H, u, sy, px: W / 2, py: sy - 20 * u }
  }

  // ── Level generation ──────────────────────────────────────
  function place(spec: keyof typeof SPEC, minY: number, maxY: number) {
    const w = world.current
    const { W, u, sy, H } = geo()
    const s = SPEC[spec]
    const r = s.r * u
    const top = sy + 46 * u
    const bottom = H - 14 * u
    for (let tries = 0; tries < 40; tries++) {
      const x = rand(r + 10 * u, W - r - 10 * u)
      const y = top + (bottom - top) * rand(minY, maxY)
      if (y + r > bottom || y - r < top) continue
      if (w.items.some((o) => dist(o.x, o.y, x, y) < o.r + r + 8 * u)) continue
      const it: Item = {
        id: w.id++,
        kind: s.kind,
        x,
        y,
        r,
        value: s.value,
        weight: s.weight,
        verts: blob(w.id * 7.3),
        seed: Math.random(),
        dir: Math.random() < 0.5 ? -1 : 1,
        speed: 0,
        x0: x,
        holds: false,
        big: spec === 'goldL' || spec === 'goldX',
      }
      w.items.push(it)
      return it
    }
    return null
  }

  /** Authored placement: x 0..1 across, y 0..1 down the dig area. */
  function placeAt(spec: keyof typeof SPEC, fx: number, fy: number) {
    const w = world.current
    const { W, u, sy, H } = geo()
    const s = SPEC[spec]
    const top = sy + 46 * u
    const bottom = H - 14 * u
    const r = s.r * u
    const x = Math.min(W - r - 2, Math.max(r + 2, fx * W))
    const y = top + (bottom - top) * fy
    const it: Item = { id: w.id++, kind: s.kind, x, y, r, value: s.value, weight: s.weight, verts: blob(w.id * 7.3), seed: Math.random(), dir: Math.random() < 0.5 ? -1 : 1, speed: 0, x0: x, holds: false, big: spec === 'goldL' || spec === 'goldX' }
    w.items.push(it)
    return it
  }

  function genLevel(n: number) {
    const w = world.current
    w.items = []
    const lv = MINER_LEVELS[n - 1]
    if (lv) {
      for (const [k, x, y] of lv.items) placeAt(KIND_SPEC[k], x, y)
      for (const [x, y, holds] of lv.moles ?? []) {
        const m = placeAt('mole', x, y)
        m.speed = (28 + n * 1.5) * geo().u * rand(0.85, 1.15)
        if (holds) {
          m.holds = true
          m.value = 650
          m.weight = 1.5
        }
      }
      return
    }
    const rush = n % 5 === 0
    // Tuned with scratch/lv4-miner-gen.mjs so most generated mines stay clearable.
    const budget = need(n) * 2 * (rush ? 1.25 : 1)
    if (n >= 3) for (let i = 0; i < Math.min(2, 1 + Math.floor(n / 4)); i++) place('tnt', 0.25, 0.85)
    if (n >= 2) {
      for (let i = 0; i < Math.min(3, 1 + Math.floor(n / 3)); i++) {
        const m = place('mole', 0.3, 0.95)
        if (m) {
          m.speed = (28 + n * 2) * geo().u * rand(0.8, 1.2)
          if (Math.random() < 0.3 + n * 0.04) {
            m.holds = true
            m.value = 650
            m.weight = 1.5
          }
        }
      }
    }
    for (let i = 0; i < Math.min(4, Math.floor(n / 2)); i++) place('diamond', 0.6, 1)
    for (let i = 0; i < 1 + (n % 2); i++) place('bag', 0.2, 1)
    for (let i = 0; i < 3 + Math.min(4, Math.floor(Math.max(0, n - 30) / 8)); i++) place(Math.random() < 0.55 ? 'rockS' : 'rockL', 0.05, 1)
    if (Math.random() < 0.6) place('bone', 0.4, 1)
    let value = w.items.reduce((s, it) => s + it.value, 0)
    let guard = 0
    while (value < budget && guard++ < 60) {
      const r = Math.random()
      const spec = r < 0.42 ? 'goldS' : r < 0.78 ? 'goldM' : r < 0.94 || n < 4 ? 'goldL' : 'goldX'
      const it = place(spec, spec === 'goldS' ? 0 : spec === 'goldM' ? 0.15 : 0.45, 1)
      if (it) value += it.value
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────
  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld(false)
    w.dynamite = run.level('kit')
    // startLevel() increments, so begin one below the chosen level.
    w.level = Math.max(1, Math.floor(level)) - 1
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    startLevel()
  }

  function startLevel() {
    const w = world.current
    w.level += 1
    w.stats.level = w.level
    w.target = targetFor(w.level)
    w.goal = w.money + w.target
    w.levelEarned = 0
    w.goalAt = -1
    w.time = 60 + run.level('clock') * 5
    w.strength = (1 + run.level('strong') * 0.1) * (w.boosts.tonic ? 1.6 : 1)
    w.bagBoost = w.boosts.clover ? 2.5 : 1
    w.claw = { mode: 'swing', ang: 0, len: 0, swingT: 0, item: null, open: 1 }
    w.sticks = []
    w.ended = false
    genLevel(w.level)
    const spec = MINER_LEVELS[w.level - 1]
    const mine = MINES[mineFor(w.level)]
    const rush = w.level % 5 === 0
    w.tip = spec?.tip ?? ''
    w.tipT = w.tip ? 5 : 0
    setBanner({
      key: Date.now(),
      text: rush ? 'GOLD RUSH!' : `LEVEL ${w.level}`,
      sub: `${spec?.name ?? mine.name} · earn ${w.target}`,
    })
    sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function finishLevel(early: boolean) {
    const w = world.current
    if (w.ended) return
    w.ended = true
    // Stars: goal = 1, haul ≥ 135% of the target = +1, goal reached with 20 s or more left = +1.
    const stars = 1 + (w.levelEarned >= w.target * 1.35 ? 1 : 0) + (w.goalAt >= 20 ? 1 : 0)
    const res = run.completeLevel(w.level, stars)
    w.clearedRun += 1
    if (res.firstClear && w.level % 5 === 0) void trackEvent('action_milestone', { game_id: 'miner', kind: 'level', value: w.level })
    if (early && w.time > 0) {
      const bonus = Math.round(w.time) * 5
      w.money += bonus
      w.earned += bonus
      w.stats.money = w.earned
      w.stats.score = w.earned
      fx.text(geo().W / 2, geo().sy + 40, `Time bonus +$${bonus}`, '#fde047', 18)
    }
    w.boosts = { tonic: false, clover: false, polish: false, rockbook: false }
    w.mood = 'cheer'
    w.moodT = 1.5
    sfx.win()
    haptic.success()
    setBanner({ key: Date.now(), text: w.level % 5 === 0 ? 'RUSH CLEARED!' : 'LEVEL CLEAR!', sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${w.money}` })
    run.update(w.stats)
    pushHud()
    window.setTimeout(() => {
      if (phaseRef.current !== 'play') return
      const lv = w.level
      const ids = (Object.keys(SHOP) as ShopId[]).sort(() => Math.random() - 0.5).slice(0, 3)
      if (!ids.includes('dynamite') && Math.random() < 0.5) ids[0] = 'dynamite'
      setOffers(ids.map((id) => ({ id, label: SHOP[id].label, desc: SHOP[id].desc, price: Math.round((SHOP[id].base * (1 + lv * 0.18) * rand(0.85, 1.2)) / 5) * 5, bought: false })))
      setPhaseBoth('shop')
    }, 1300)
  }

  function buy(o: Offer) {
    const w = world.current
    if (o.bought || w.money < o.price) {
      sfx.miss()
      haptic.error()
      return
    }
    w.money -= o.price
    if (o.id === 'dynamite') w.dynamite += 1
    else w.boosts[o.id] = true
    setOffers((list) => list.map((x) => (x === o ? { ...x, bought: true } : x)))
    sfx.score(4)
    haptic.success()
    pushHud()
  }

  function leaveShop() {
    setOffers([])
    setPhaseBoth('play')
    startLevel()
  }

  function die() {
    const w = world.current
    w.ended = true
    w.mood = 'sad'
    w.moodT = 99
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.3)
    fx.shake(8, 0.3)
    sfx.lose()
    haptic.error()
    setBanner({ key: Date.now(), text: "TIME'S UP", sub: `$${w.money} of $${w.goal}` })
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.clearedRun * 3 + w.earned / 400)
      run.end({ score: w.earned, cleared: w.clearedRun >= 1, stats: { ...w.stats }, coins }, revive)
    }, 1300)
  }

  function revive() {
    const w = world.current
    w.time = 20
    w.ended = false
    w.mood = 'idle'
    w.moodT = 0
    for (let i = 0; i < 4; i++) place(i < 2 ? 'goldM' : 'goldL', 0.1, 1)
    const { W, sy } = geo()
    fx.ring(W / 2, sy, { color: '#fde047', maxR: W * 0.6, life: 0.6, width: 6 })
    fx.flash('#fde047', 0.3)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: '+20 seconds · fresh gold' })
    setPhaseBoth('play')
    pushHud()
  }

  // ── Claw actions ──────────────────────────────────────────
  function fire() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.claw.mode !== 'swing' || w.ended) return
    w.claw.mode = 'out'
    w.claw.len = 24 * geo().u
    w.claw.open = 1
    sfx.whoosh()
    haptic.light()
  }

  function useDynamite() {
    const w = world.current
    const c = w.claw
    if (phaseRef.current !== 'play' || c.mode !== 'back' || !c.item || w.dynamite <= 0) return
    w.dynamite -= 1
    w.stats.blasts += 1
    const { px, py } = geo()
    w.sticks.push({ x: px, y: py, t: 0 })
    sfx.whoosh()
    haptic.light()
    run.update(w.stats)
    pushHud()
  }

  function explodeAt(x: number, y: number, radius: number, chain = true) {
    const w = world.current
    fx.explode(x, y, radius > 60 ? 2 : 1.2)
    fx.flash('#fb923c', 0.18)
    fx.stop(0.08)
    sfx.boom(radius > 60 ? 0.8 : 0.5)
    haptic.heavy()
    if (!chain) return
    const hit = w.items.filter((it) => it !== w.claw.item && dist(it.x, it.y, x, y) < radius + it.r)
    w.items = w.items.filter((it) => !hit.includes(it))
    for (const it of hit) {
      fx.burst(it.x, it.y, { count: 10, color: it.kind === 'gold' ? ['#fcd34d', '#b45309'] : ['#78716c', '#44403c'], speed: 200, shape: 'square', size: 4, gravity: 500 })
      if (it.kind === 'tnt') window.setTimeout(() => explodeAt(it.x, it.y, 85 * geo().u), 120)
    }
  }

  function collect(it: Item) {
    const w = world.current
    const { W, sy } = geo()
    let value = it.value
    let label = ''
    if (it.kind === 'rock' && w.boosts.rockbook) value *= 5
    if ((it.kind === 'diamond' || (it.kind === 'mole' && it.holds)) && w.boosts.polish) value = Math.round(value * 1.5)
    if (it.kind === 'bag') {
      const r = Math.random()
      if (r < 0.15) {
        w.dynamite += 1
        label = '+1 DYNAMITE'
        value = 0
      } else if (r < 0.27) {
        w.strength *= 1.4
        label = 'STRENGTH!'
        value = 0
      } else if (r < 0.35) {
        w.time += 10
        label = '+10 SECONDS'
        value = 0
      } else {
        value = Math.round((rand(30, 400) + (Math.random() < 0.2 ? 400 : 0)) * w.bagBoost)
      }
    }
    if (w.demo) return
    if (it.kind === 'diamond' || (it.kind === 'mole' && it.holds)) w.stats.diamonds += 1
    if (it.kind === 'mole') w.stats.moles += 1
    w.money += value
    w.earned += value
    w.levelEarned += value
    w.stats.money = w.earned
    w.stats.score = w.earned
    const tx = W / 2
    const ty = sy - 60
    if (label) fx.text(tx, ty, label, '#a5f3fc', 20)
    else fx.text(tx, ty, `+$${value}`, value >= 300 ? '#fde047' : value < 30 ? '#d6d3d1' : '#fef3c7', value >= 300 ? 26 : 18)
    if (value >= 300 || label) {
      fx.burst(tx, ty + 20, { count: 26, color: ['#fde047', '#fbbf24', '#fff'], speed: 260, shape: 'spark', gravity: 300 })
      sfx.levelUp()
      haptic.success()
      w.mood = 'cheer'
      w.moodT = 1.2
    } else if (value < 30) {
      sfx.thud()
      w.mood = 'sad'
      w.moodT = 0.8
    } else {
      sfx.score(Math.min(8, value / 60))
      haptic.medium()
    }
    if (w.money >= w.goal && w.money - value < w.goal) {
      w.goalAt = w.time
      setBanner({ key: Date.now(), text: 'GOAL REACHED!', sub: 'keep digging or tap Next' })
      sfx.combo()
    }
    run.update(w.stats)
    pushHud()
  }

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__lv4miner = { world, fire: () => fire(), next: () => finishLevel(true) }
    function down(e: KeyboardEvent) {
      if (phaseRef.current !== 'play') return
      if (e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        fire()
      } else if (e.key === 'ArrowUp' || e.key === 'd') {
        e.preventDefault()
        useDynamite()
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation ────────────────────────────────────────────
  function step(dt: number) {
    const w = world.current
    const { W, H, u, px, py } = geo()
    const c = w.claw
    const live = phaseRef.current === 'play' && !w.demo

    if (w.demo) {
      if (w.items.length < 6) {
        w.level = 3
        genLevel(3)
      }
      w.autoT -= dt
      if (w.autoT <= 0 && c.mode === 'swing') {
        c.mode = 'out'
        c.len = 24 * u
        w.autoT = rand(1.5, 2.8)
      }
    }

    // Moles patrol
    for (const it of w.items) {
      if (it.kind !== 'mole' || it === c.item) continue
      it.x += it.dir * it.speed * dt
      if (it.x < it.r + 8 * u || it.x > W - it.r - 8 * u || Math.abs(it.x - it.x0) > 70 * u) {
        it.dir *= -1
        it.x += it.dir * it.speed * dt * 2
      }
    }

    if (c.mode === 'swing') {
      c.swingT += dt
      c.ang = Math.sin(c.swingT * 1.9) * 1.25
      c.len = 24 * u
      c.open = Math.min(1, c.open + dt * 4)
      if (w.mood === 'strain') w.mood = 'idle'
    } else if (c.mode === 'out') {
      c.len += 440 * u * dt
      const tx = px + Math.sin(c.ang) * c.len
      const ty = py + Math.cos(c.ang) * c.len
      if (tx < 4 || tx > W - 4 || ty > H - 6) {
        c.mode = 'back'
      } else {
        for (const it of w.items) {
          if (dist(it.x, it.y, tx, ty) < it.r + 7 * u) {
            if (it.kind === 'tnt') {
              w.items = w.items.filter((o) => o !== it)
              explodeAt(it.x, it.y, 85 * u)
              c.mode = 'back'
              if (!w.demo) {
                w.mood = 'sad'
                w.moodT = 1
              }
            } else {
              c.item = it
              c.mode = 'back'
              c.open = 0
              w.items = w.items.filter((o) => o !== it)
              fx.burst(tx, ty, { count: 8, color: it.kind === 'gold' ? ['#fde047', '#fff'] : ['#d6d3d1', '#78716c'], speed: 140, size: 2.5 })
              if (!w.demo) {
                sfx.clang()
                haptic.light()
              }
            }
            break
          }
        }
      }
    } else {
      const wt = c.item ? c.item.weight : 0
      const speed = c.item ? (430 * u * w.strength) / (1 + wt * 0.55) : 600 * u
      c.len -= speed * dt
      w.crank += dt * (speed / (u * 30))
      if (c.item && wt >= 3 && !w.demo) w.mood = 'strain'
      if (c.item) {
        const tx = px + Math.sin(c.ang) * c.len
        const ty = py + Math.cos(c.ang) * c.len
        c.item.x = tx + Math.sin(c.ang) * c.item.r * 0.8
        c.item.y = ty + Math.cos(c.ang) * c.item.r * 0.8
        if (Math.random() < 0.15) fx.burst(c.item.x, c.item.y + c.item.r * 0.5, { count: 1, color: '#a16207', speed: 40, size: 2, gravity: 300 })
      }
      if (c.len <= 24 * u) {
        c.len = 24 * u
        c.mode = 'swing'
        c.open = 0.3
        if (c.item) collect(c.item)
        c.item = null
        if (w.mood === 'strain') w.mood = 'idle'
      }
    }

    // Dynamite sticks fly to the hooked item
    for (const s of w.sticks) {
      s.t += dt
      const target = c.item
      if (!target) {
        s.t = 99
        continue
      }
      const k = Math.min(1, s.t / 0.25)
      s.x = px + (target.x - px) * k
      s.y = py + (target.y - py) * k - Math.sin(k * Math.PI) * 30 * u
      if (k >= 1) {
        explodeAt(target.x, target.y, 20 * u, false)
        fx.text(target.x, target.y - 20, 'BOOM!', '#fb923c', 20)
        c.item = null
        s.t = 99
      }
    }
    w.sticks = w.sticks.filter((s) => s.t < 1)

    if (w.moodT > 0) {
      w.moodT -= dt
      if (w.moodT <= 0 && w.mood !== 'strain') w.mood = 'idle'
    }

    if (live && !w.ended) {
      const before = Math.ceil(w.time)
      w.time -= dt
      const now = Math.ceil(w.time)
      if (now !== before) {
        pushHud()
        if (now <= 10 && now > 0) sfx.tick()
      }
      if (w.time <= 0) {
        w.time = 0
        if (w.money >= w.goal) finishLevel(false)
        else die()
      } else if (w.items.length === 0 && c.mode === 'swing') {
        if (w.money >= w.goal) finishLevel(true)
        else die()
      }
    }
  }

  // ── Render ────────────────────────────────────────────────
  function frame({ ctx, w: W, h: H, raw, t: time }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const ph = phaseRef.current
    const dt = ph === 'shop' ? 0 : fx.step(raw)
    if (ph === 'shop') fx.step(0)
    if (ph === 'idle' || ph === 'play') step(dt)
    const { u, sy, px, py } = geo()
    const mi = mineFor(w.level)
    const key = `${W}x${H}:${mi}:${w.demo ? 0 : w.level}`
    if (bg.current.key !== key) {
      const c = bg.current.canvas ?? document.createElement('canvas')
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      c.width = Math.round(W * dpr)
      c.height = Math.round(H * dpr)
      const g = c.getContext('2d')!
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      paintMine(g, MINES[mi], W, H, sy, u, w.level * 3.1)
      bg.current = { key, canvas: c }
    }
    fx.applyShake(ctx)
    ctx.drawImage(bg.current.canvas!, 0, 0, W, H)

    // Clouds
    for (let i = 0; i < 3; i++) {
      const cx = ((time * (6 + i * 3) + i * 140) % (W + 120)) - 60
      const cy = 30 + i * 18
      ctx.globalAlpha = 0.75
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(cx, cy, 12 * u, 0, Math.PI * 2)
      ctx.arc(cx + 14 * u, cy - 5 * u, 15 * u, 0, Math.PI * 2)
      ctx.arc(cx + 30 * u, cy, 11 * u, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    for (const it of w.items) drawItem(ctx, it.kind, it.x, it.y, it.r, it.verts, time, it.seed, { dir: it.dir, holds: it.holds })

    // Rope + claw
    const c = w.claw
    const tx = px + Math.sin(c.ang) * c.len
    const ty = py + Math.cos(c.ang) * c.len
    ctx.strokeStyle = '#1c1917'
    ctx.lineWidth = 2.5 * u
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(tx, ty)
    ctx.stroke()
    ctx.strokeStyle = '#a8a29e'
    ctx.lineWidth = 1 * u
    ctx.stroke()
    if (c.mode === 'swing' && (ph === 'play' || ph === 'idle')) {
      // aim guide
      ctx.setLineDash([4 * u, 8 * u])
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      ctx.lineWidth = 1.5 * u
      ctx.beginPath()
      ctx.moveTo(tx, ty)
      ctx.lineTo(px + Math.sin(c.ang) * 900, py + Math.cos(c.ang) * 900)
      ctx.stroke()
      ctx.setLineDash([])
    }
    if (c.item) drawItem(ctx, c.item.kind, c.item.x, c.item.y, c.item.r, c.item.verts, time, c.item.seed, { dir: c.item.dir, holds: c.item.holds })
    drawClaw(ctx, tx, ty, c.ang, u * 1.1, c.open)

    drawMiner(ctx, px, sy, u, w.crank, w.mood, time)
    for (const s of w.sticks) drawDynamite(ctx, s.x, s.y, u, s.t * 20)

    fx.draw(ctx)
    ctx.restore()
    if (w.tipT > 0 && ph === 'play') {
      w.tipT = Math.max(0, w.tipT - raw)
      ctx.globalAlpha = Math.min(1, w.tipT, (5 - w.tipT) * 3)
      ctx.font = "800 13px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const tw = Math.min(W - 24, ctx.measureText(w.tip).width + 28)
      ctx.fillStyle = 'rgba(28,25,23,0.72)'
      ctx.beginPath()
      ctx.roundRect((W - tw) / 2, H - 96, tw, 30, 15)
      ctx.fill()
      ctx.fillStyle = '#fef3c7'
      ctx.fillText(w.tip, W / 2, H - 81, W - 40)
      ctx.globalAlpha = 1
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const pct = Math.min(100, (hud.money / Math.max(1, hud.goal)) * 100)
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena gc-arena" onPointerDown={() => fire()}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud gc-hud">
              <div>
                <div className="action-hud__score gc-money">${hud.money}</div>
                <div className="gc-goal">
                  <span style={{ width: `${pct}%` }} className={pct >= 100 ? 'is-done' : ''} />
                  <em>Goal ${hud.goal}</em>
                </div>
              </div>
              <div className="action-hud__right">
                <span className={`gc-time${hud.time <= 10 ? ' is-low' : ''}`}>{hud.time}s</span>
                <span className="action-hud__small">Level {hud.level}</span>
              </div>
            </div>
          )}
          {phase === 'play' && (
            <div className="gc-btns" onPointerDown={stop}>
              <button type="button" className="gc-btn" onClick={useDynamite} disabled={hud.dynamite <= 0} aria-label="Use dynamite">
                <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                  <rect x="8" y="6" width="8" height="16" rx="2" fill="#dc2626" />
                  <rect x="9" y="7" width="2" height="14" fill="#fca5a5" />
                  <path d="M12 6 Q13 3 16 2" stroke="#57534e" strokeWidth="1.6" fill="none" />
                  <circle cx="16.5" cy="2.5" r="2" fill="#fbbf24" />
                </svg>
                <b>{hud.dynamite}</b>
              </button>
              {hud.money >= hud.goal ? (
                <button type="button" className="gc-btn gc-btn--next" onClick={() => finishLevel(true)}>
                  Next <small>+${hud.time * 5}</small>
                </button>
              ) : null}
            </div>
          )}
          {banner && (phase === 'play' || phase === 'dying') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'shop' && (
            <div className="gc-shop" onPointerDown={stop}>
              <h3>Trading Post</h3>
              <p>
                You have <b>${hud.money}</b> · next target +${targetFor(hud.level + 1)}
              </p>
              <div className="gc-shop__list">
                {offers.map((o) => (
                  <button key={o.id} type="button" className={`gc-shop__card${o.bought ? ' is-bought' : ''}`} onClick={() => buy(o)} disabled={o.bought || hud.money < o.price}>
                    <span className="gc-shop__icon">
                      <ShopIcon id={o.id} />
                    </span>
                    <strong>{o.label}</strong>
                    <span>{o.desc}</span>
                    <em>{o.bought ? 'Bought' : `$${o.price}`}</em>
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn-primary gc-shop__next" onClick={leaveShop}>
                Level {hud.level + 1} ▸
              </button>
            </div>
          )}
          {phase === 'idle' && (
            <ActionIdle
              game="miner"
              icon={meta.icon}
              title={meta.title}
              hint="Tap to drop the swinging claw. Heavy loot reels slowly — grab gold and diamonds to reach the goal before time runs out."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={world.current.clearedRun >= 2 ? 'Prospector!' : 'Out of time'}
            subtitle={`Earned $${hud.earned} · Level ${hud.level}`}
            celebrate={world.current.clearedRun >= 1}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}

function ShopIcon({ id }: { id: ShopId }) {
  return (
    <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="rgba(0,0,0,0.3)" />
      {id === 'dynamite' && (
        <g>
          <rect x="11" y="13" width="7" height="18" rx="2" fill="#dc2626" />
          <rect x="17" y="13" width="7" height="18" rx="2" fill="#b91c1c" />
          <rect x="23" y="13" width="7" height="18" rx="2" fill="#dc2626" />
          <rect x="10" y="19" width="21" height="3" fill="#1c1917" />
          <path d="M20 13 Q22 7 27 7" stroke="#57534e" strokeWidth="1.8" fill="none" />
          <circle cx="27.5" cy="7" r="2.6" fill="#fbbf24" />
        </g>
      )}
      {id === 'tonic' && (
        <g>
          <path d="M16 8 H24 V14 L29 22 Q31 32 20 32 Q9 32 11 22 L16 14 Z" fill="#e0f2fe" opacity="0.6" />
          <path d="M12 23 Q20 19 28 23 Q30 31 20 31 Q10 31 12 23 Z" fill="#22c55e" />
          <rect x="15" y="6" width="10" height="4" rx="1.5" fill="#92400e" />
          <circle cx="17" cy="26" r="1.6" fill="#bbf7d0" />
        </g>
      )}
      {id === 'clover' && (
        <g fill="#16a34a">
          <circle cx="15" cy="15" r="6" />
          <circle cx="25" cy="15" r="6" />
          <circle cx="15" cy="25" r="6" />
          <circle cx="25" cy="25" r="6" />
          <path d="M20 20 Q24 28 22 34" stroke="#15803d" strokeWidth="2.4" fill="none" />
          <circle cx="13" cy="13" r="2" fill="#86efac" />
        </g>
      )}
      {id === 'polish' && (
        <g>
          <path d="M9 17 L14 11 H26 L31 17 L20 31 Z" fill="#0891b2" />
          <path d="M9 17 L14 11 L20 17 L20 31 Z" fill="#67e8f9" />
          <path d="M14 11 H26 L20 17 Z" fill="#cffafe" />
          <path d="M30 6 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2 Z" fill="#fff" />
        </g>
      )}
      {id === 'rockbook' && (
        <g>
          <rect x="10" y="9" width="20" height="24" rx="2" fill="#7c2d12" />
          <rect x="12" y="9" width="18" height="22" rx="1.5" fill="#a16207" />
          <path d="M16 22 L19 16 L25 17 L26 23 L20 26 Z" fill="#a8a29e" />
          <path d="M19 16 L20 21 L25 17" stroke="#57534e" strokeWidth="1" fill="none" />
        </g>
      )}
    </svg>
  )
}
