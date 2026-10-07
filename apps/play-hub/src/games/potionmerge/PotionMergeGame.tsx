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
import { CUSTOMERS, GLASS, INGREDIENTS, POTION, POTIONS, POTION_COLORS, WISP, drawCat, drawCauldron, drawCustomer, itemSprite, shopSprite } from './art'
import '../../shared/action/action.css'
import './potionmerge.css'

const meta = getGame('potionmerge')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Item = { chain: number; tier: number; pop: number; pending: boolean; id: number; fly: { x: number; y: number; t: number } | null }
type Want = { chain: number; tier: number }
type Customer = { kind: number; want: Want; patience: number; max: number; vip: boolean; leave: number; angry: boolean; enter: number; happy: number }
type MergeAnim = { chain: number; tier: number; x0: number; y0: number; dst: number; t: number; wisp: boolean }
type Brew = { t: number; tier: number }

const COLS = 5
const ROWS = 5
const CELLS = COLS * ROWS
const MAX_POTION = POTIONS.length - 1

const isIng = (it: { chain: number } | null) => !!it && it.chain < POTION
const isPotion = (it: { chain: number } | null) => !!it && it.chain === POTION
const topTier = (chain: number) => (chain === POTION ? MAX_POTION : 3)
const itemName = (w: Want) => (w.chain === POTION ? POTIONS[w.tier] : INGREDIENTS[w.chain].items[w.tier])

type World = {
  demo: boolean
  cells: (Item | null)[]
  customers: (Customer | null)[]
  custIn: number[]
  anims: MergeAnim[]
  pot: Want[]
  brew: Brew | null
  spawnT: number
  specialIn: number
  hearts: number
  freeze: number
  rush: number
  rushIn: number
  level: number
  served: number
  score: number
  best: number
  chains: number
  seen: Set<string>
  combo: number
  lastMerge: number
  clock: number
  nextId: number
  stats: { score: number; served: number; best: number; merges: number; brews: number; level: number }
}

function freshWorld(demo = false): World {
  return {
    demo,
    cells: Array.from({ length: CELLS }, () => null),
    customers: [null, null, null],
    custIn: [1.5, 6, 14],
    anims: [],
    pot: [],
    brew: null,
    spawnT: 0.6,
    specialIn: 45,
    hearts: 3,
    freeze: 0,
    rush: 0,
    rushIn: 70,
    level: 1,
    served: 0,
    score: 0,
    best: -1,
    chains: 3,
    seen: new Set(),
    combo: 0,
    lastMerge: -9,
    clock: 0,
    nextId: 1,
    stats: { score: 0, served: 0, best: 0, merges: 0, brews: 0, level: 1 },
  }
}

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

export default function PotionMergeGame() {
  const run = useActionRun('potionmerge')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(true))
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ pid: number; idx: number; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null)
  const lastEvent = useRef(0)
  const lastNote = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, served: 0, combo: 0, best: -1 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.level, served: w.served, combo: w.combo, best: w.best })
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const counterY = 132
    const cs = Math.floor(Math.min((W - 16) / COLS, (H - counterY - 18 - 120) / ROWS, 76))
    const bx = Math.round((W - cs * COLS) / 2)
    const by = H - 8 - cs * ROWS
    const potY = (counterY + 18 + by) / 2 - 2
    const potR = Math.min(36, (by - counterY - 18) * 0.32)
    return { W, H, counterY, cs, bx, by, potX: W / 2, potY, potR }
  }

  function cellXY(i: number) {
    const { cs, bx, by } = geo()
    return { x: bx + (i % COLS) * cs, y: by + Math.floor(i / COLS) * cs }
  }

  function cellAt(x: number, y: number) {
    const { cs, bx, by } = geo()
    const c = Math.floor((x - bx) / cs)
    const r = Math.floor((y - by) / cs)
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return -1
    return r * COLS + c
  }

  function custPos(i: number) {
    const { W } = geo()
    return { x: W * (0.18 + i * 0.32), y: 94 }
  }

  function custRect(i: number) {
    const p = custPos(i)
    const { W } = geo()
    return { x: p.x - W * 0.15, y: 46, w: W * 0.3, h: 92 }
  }

  function catPos() {
    const { W, potY } = geo()
    return { x: W * 0.13, y: potY + 4 }
  }

  function glassPos() {
    const { W, potY } = geo()
    return { x: W * 0.87, y: potY }
  }

  function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
  }

  function note(x: number, y: number, text: string) {
    if (performance.now() - lastNote.current < 800) return
    lastNote.current = performance.now()
    fx.text(x, y, text, '#fecaca', 13)
  }

  function newItem(chain: number, tier: number): Item {
    return { chain, tier, pop: 1, pending: false, id: world.current.nextId++, fly: null }
  }

  function emptyNear(x: number, y: number) {
    const w = world.current
    const { cs } = geo()
    let best = -1
    let bd = 1e9
    for (let i = 0; i < CELLS; i++) {
      if (w.cells[i]) continue
      const s = cellXY(i)
      const d = Math.hypot(s.x + cs / 2 - x, s.y + cs / 2 - y) + Math.random()
      if (d < bd) {
        bd = d
        best = i
      }
    }
    return best
  }

  function place(chain: number, tier: number, fromX: number, fromY: number, near = true) {
    const w = world.current
    let i = -1
    if (near) i = emptyNear(fromX, fromY)
    else {
      const e: number[] = []
      for (let k = 0; k < CELLS; k++) if (!w.cells[k]) e.push(k)
      if (e.length) i = e[Math.floor(Math.random() * e.length)]
    }
    if (i < 0) return -1
    const it = newItem(chain, tier)
    it.fly = { x: fromX, y: fromY, t: 0 }
    w.cells[i] = it
    return i
  }

  // ── Customers ───────────────────────────────────────

  function makeCustomer(): Customer {
    const w = world.current
    const L = w.level
    let want: Want
    if (L >= 4 && Math.random() < 0.2) want = { chain: Math.floor(Math.random() * w.chains), tier: Math.random() < 0.75 ? 2 : 3 }
    else {
      const hi = Math.min(MAX_POTION - 1, 1 + Math.floor(L * 0.55))
      const lo = Math.max(0, hi - 2)
      want = { chain: POTION, tier: Math.floor(rand(lo, hi + 1)) }
    }
    const vip = w.clock > 40 && Math.random() < (w.rush > 0 ? 0.3 : 0.08)
    const max = (42 - Math.min(16, L * 1.2)) * (1 + run.level('patience') * 0.1) + want.tier * 4
    const kinds = Math.min(CUSTOMERS.length, 2 + Math.floor(L / 2))
    return { kind: Math.floor(Math.random() * kinds), want, patience: max, max, vip, leave: -1, angry: false, enter: 0, happy: 0 }
  }

  function serve(idx: number, ci: number) {
    const w = world.current
    const c = w.customers[ci]
    const it = w.cells[idx]
    if (!c || !it || c.leave >= 0 || c.enter < 1) return false
    if (it.chain !== c.want.chain || it.tier !== c.want.tier) return false
    w.cells[idx] = null
    c.leave = 0
    c.happy = 1
    const base = (it.chain === POTION ? 15 : 12) * Math.pow(2, it.tier)
    const tip = c.patience / c.max
    const pay = Math.round(base * (1 + tip * 0.5) * (c.vip ? 3 : 1))
    w.score += pay
    w.served += 1
    w.stats.served = w.served
    w.stats.score = w.score
    const p = custPos(ci)
    fx.burst(p.x, p.y, { count: 22, color: ['#fde047', '#f0abfc', '#ffffff', '#86efac'], speed: 200, shape: 'spark', gravity: 150 })
    fx.ring(p.x, p.y, { color: c.vip ? '#fde047' : '#f0abfc', maxR: 50, life: 0.4, width: 4 })
    fx.text(p.x, p.y - 34, `+${pay}`, '#fde047', 18)
    if (tip > 0.6) fx.text(p.x, p.y - 14, c.vip ? 'VIP x3!' : 'Great tip!', '#bbf7d0', 12)
    fx.stop(0.05)
    sfx.win()
    haptic.success()
    if (w.served % 5 === 0) levelUp()
    run.update(w.stats)
    pushHud()
    return true
  }

  function levelUp() {
    const w = world.current
    w.level += 1
    w.stats.level = w.level
    let sub = 'fancier orders, less patience'
    if (w.level === 3 && w.chains < 4) {
      w.chains = 4
      sub = 'new ingredient: Feathers!'
    } else if (w.level % 2 === 0 && 2 + Math.floor(w.level / 2) <= CUSTOMERS.length) sub = `new customer: ${CUSTOMERS[Math.min(CUSTOMERS.length - 1, 1 + Math.floor(w.level / 2))]}`
    showBanner(`SHOP LEVEL ${w.level}`, sub)
    sfx.levelUp()
    if (w.level % 3 === 0 && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'potionmerge', kind: 'level', value: w.level })
    }
  }

  // ── Run lifecycle ───────────────────────────────────

  function start() {
    void unlockAudio()
    const w = freshWorld(false)
    world.current = w
    fx.reset()
    lastEvent.current = 0
    for (const [i, c, t] of [[11, 0, 0], [12, 1, 0], [13, 0, 0], [17, 1, 0]] as const) w.cells[i] = newItem(c, t)
    run.begin()
    setPhaseBoth('play')
    showBanner('SHOP OPEN!', 'merge twins · brew two kinds in the cauldron')
    sfx.ready()
    pushHud()
  }

  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(10, 0.45)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    const { W, potY } = geo()
    fx.text(W / 2, potY, 'SHOP CLOSED!', '#fecaca', 24)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.served * 0.8 + Math.max(0, w.best + 1) * 1.5 + w.level + 2) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.served >= 10, stats: { ...w.stats }, coins }, revive)
    }, 1100)
  }

  /** Revive: two hearts back, every waiting customer calms down, and a cluttered table is tidied. */
  function revive() {
    const w = world.current
    w.hearts = 2
    w.freeze = 4
    for (const c of w.customers) if (c && c.leave < 0) c.patience = c.max
    const used = w.cells.filter(Boolean).length
    if (used > CELLS - 5) {
      const small = w.cells
        .map((it, i) => ({ it, i }))
        .filter((o) => isIng(o.it))
        .sort((a, b) => a.it!.tier - b.it!.tier)
        .slice(0, 5)
      const { cs } = geo()
      for (const o of small) {
        const s = cellXY(o.i)
        fx.burst(s.x + cs / 2, s.y + cs / 2, { count: 8, color: ['#f0abfc', '#ffffff'], speed: 120, gravity: 0 })
        w.cells[o.i] = null
      }
    }
    showBanner('REVIVED!', 'customers are patient again')
    pushHud()
    setPhaseBoth('play')
  }

  // ── Merging & brewing ───────────────────────────────

  function reveal(w: World, chain: number, tier: number) {
    const key = `${chain}|${tier}`
    if (w.seen.has(key)) return
    w.seen.add(key)
    if (chain === POTION && tier >= 2) {
      showBanner(`NEW: ${POTIONS[tier].toUpperCase()}!`, tier >= MAX_POTION ? 'the ultimate brew' : `next: ${POTIONS[tier + 1]}`)
      sfx.levelUp()
      fx.flash('#f5d0fe', 0.15)
    } else if (chain < POTION && tier === 3) {
      showBanner(`NEW: ${INGREDIENTS[chain].items[3].toUpperCase()}!`, 'rare ingredient')
      sfx.levelUp()
    }
  }

  function finishMerge(a: MergeAnim) {
    const w = world.current
    const it = w.cells[a.dst]
    if (!it) return
    it.pending = false
    it.chain = a.chain
    it.tier = Math.min(topTier(a.chain), a.tier + 1)
    it.pop = 1
    const { cs } = geo()
    const s = cellXY(a.dst)
    const cx = s.x + cs / 2
    const cy = s.y + cs / 2
    w.combo = w.clock - w.lastMerge < 1.8 ? w.combo + 1 : 1
    w.lastMerge = w.clock
    w.stats.merges += 1
    const col = a.chain === POTION ? POTION_COLORS[it.tier] : INGREDIENTS[a.chain].color
    fx.burst(cx, cy, { count: 14 + it.tier * 3, color: [col, '#ffffff', '#f0abfc', '#fde047'], speed: 150 + it.tier * 16, shape: 'spark', gravity: 30 })
    fx.burst(cx, cy, { count: 6, color: ['#f5d0fe', '#ffffff'], speed: 60, size: 4, gravity: -60 })
    fx.ring(cx, cy, { color: col, maxR: cs * (0.7 + it.tier * 0.05), life: 0.38, width: 4 })
    fx.ring(cx, cy, { color: '#ffffff', maxR: cs * 0.42, life: 0.22, width: 2 })
    fx.stop(0.03 + Math.min(0.06, it.tier * 0.006))
    fx.shake(1.5 + it.tier * 0.4, 0.14)
    const name = a.chain === POTION ? POTIONS[it.tier] : INGREDIENTS[a.chain].items[it.tier]
    fx.text(cx, cy - cs * 0.5, w.combo > 1 ? `${name} x${w.combo}` : name, w.combo > 2 ? '#fde047' : '#ffffff', 12 + Math.min(6, it.tier))
    sfx.pop()
    sfx.score(Math.min(12, w.combo + it.tier))
    if (w.combo >= 3) {
      sfx.combo()
      if (w.combo === 3 || w.combo % 5 === 0) showBanner(`COMBO x${w.combo}!`, 'magic in the air')
    }
    haptic.medium()
    w.score += 4 * Math.pow(2, it.tier)
    w.stats.score = w.score
    if (it.chain === POTION && it.tier > w.best) {
      w.best = it.tier
      w.stats.best = it.tier + 1
    }
    reveal(w, it.chain, it.tier)
    run.update(w.stats)
    pushHud()
  }

  function addToPot(idx: number) {
    const w = world.current
    const it = w.cells[idx]
    const { potX, potY } = geo()
    if (!it) return
    if (w.brew) {
      note(potX, potY - 50, 'Brewing… one moment')
      return
    }
    if (!isIng(it)) {
      note(potX, potY - 50, it.chain === POTION ? 'Potions go to customers' : 'Only ingredients brew')
      sfx.miss()
      return
    }
    if (w.pot.length === 1 && w.pot[0].chain === it.chain) {
      note(potX, potY - 50, 'Needs two different ingredients')
      sfx.miss()
      return
    }
    w.cells[idx] = null
    w.pot.push({ chain: it.chain, tier: it.tier })
    fx.burst(potX, potY - 20, { count: 10, color: [INGREDIENTS[it.chain].color, '#ffffff'], speed: 120, angle: -Math.PI / 2, spread: 1.5, gravity: 300 })
    sfx.pop()
    haptic.light()
    if (w.pot.length === 2) {
      w.brew = { t: 0, tier: Math.min(MAX_POTION, w.pot[0].tier + w.pot[1].tier) }
      sfx.whoosh()
    }
  }

  function finishBrew() {
    const w = world.current
    const b = w.brew!
    w.brew = null
    w.pot = []
    const { potX, potY } = geo()
    const i = place(POTION, b.tier, potX, potY - 20)
    w.stats.brews += 1
    const col = POTION_COLORS[b.tier]
    fx.burst(potX, potY - 20, { count: 30, color: [col, '#ffffff', '#f0abfc', '#fde047'], speed: 240, shape: 'spark', gravity: 60 })
    fx.ring(potX, potY - 20, { color: col, maxR: 70, life: 0.45, width: 4 })
    fx.text(potX, potY - 60, POTIONS[b.tier], '#ffffff', 15)
    fx.stop(0.05)
    sfx.power()
    sfx.score(4 + b.tier)
    haptic.success()
    if (i < 0) fx.text(potX, potY - 40, 'Table full!', '#fecaca', 13)
    if (b.tier > w.best) {
      w.best = b.tier
      w.stats.best = b.tier + 1
    }
    reveal(w, POTION, b.tier)
    run.update(w.stats)
    pushHud()
  }

  function tapItem(i: number) {
    const w = world.current
    const it = w.cells[i]
    if (!it) return
    const { cs } = geo()
    const s = cellXY(i)
    if (it.chain === GLASS) {
      w.cells[i] = null
      w.freeze = 8
      showBanner('TIME STANDS STILL', 'patience frozen for 8s')
      fx.burst(s.x + cs / 2, s.y + cs / 2, { count: 24, color: ['#fde047', '#bae6fd', '#ffffff'], speed: 180, shape: 'spark', gravity: 0 })
      sfx.power()
      haptic.success()
      return
    }
    const name = it.chain === WISP ? 'Wisp: drop on anything to upgrade it' : itemName(it)
    fx.text(s.x + cs / 2, s.y - 4, name, '#ffffff', 12)
    it.pop = 0.4
    sfx.tap()
  }

  // ── Input ───────────────────────────────────────────

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const el = e.currentTarget
    const { x, y } = localPoint(e, el)
    const w = world.current
    const { potX, potY, potR } = geo()
    // tap the cauldron to take back a lone ingredient
    if (Math.hypot(x - potX, y - potY) < potR * 1.2 && w.pot.length === 1 && !w.brew) {
      const back = w.pot.pop()!
      place(back.chain, back.tier, potX, potY - 20)
      sfx.flip()
      return
    }
    const i = cellAt(x, y)
    if (i < 0 || !w.cells[i] || w.cells[i]!.pending || w.cells[i]!.fly) return
    el.setPointerCapture(e.pointerId)
    drag.current = { pid: e.pointerId, idx: i, x, y, sx: x, sy: y, moved: false }
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.pid !== e.pointerId) return
    const { x, y } = localPoint(e, e.currentTarget)
    d.x = x
    d.y = y
    if (Math.hypot(x - d.sx, y - d.sy) > 8) d.moved = true
  }

  function onUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.pid !== e.pointerId) return
    drag.current = null
    const w = world.current
    if (phaseRef.current !== 'play') return
    const src = w.cells[d.idx]
    if (!src || src.pending) return
    if (!d.moved) return tapItem(d.idx)
    const { cs, potX, potY, potR } = geo()
    for (let ci = 0; ci < 3; ci++) {
      if (inRect(d.x, d.y, custRect(ci))) {
        if (!serve(d.idx, ci)) {
          const c = w.customers[ci]
          note(d.x, d.y + 24, c ? `Wants: ${itemName(c.want)}` : 'Nobody here')
          sfx.miss()
        }
        return
      }
    }
    if (Math.hypot(d.x - potX, d.y - potY) < potR * 1.4) return addToPot(d.idx)
    const cat = catPos()
    if (Math.hypot(d.x - cat.x, d.y - cat.y) < 36) {
      w.cells[d.idx] = null
      fx.burst(cat.x, cat.y, { count: 10, color: ['#a78bfa', '#18181b'], speed: 110, gravity: 0 })
      fx.text(cat.x, cat.y - 30, 'Nom!', '#c4b5fd', 13)
      sfx.thud()
      return
    }
    const dst = cellAt(d.x, d.y)
    if (dst < 0 || dst === d.idx) return
    const tgt = w.cells[dst]
    if (!tgt) {
      w.cells[dst] = src
      w.cells[d.idx] = null
      src.pop = 0.5
      sfx.move()
      return
    }
    if (tgt.pending || tgt.fly) return
    const mergeable = (a: Item, b: Item) => (isIng(a) || isPotion(a)) && a.chain === b.chain && a.tier === b.tier && a.tier < topTier(a.chain)
    const wispOn = src.chain === WISP && (isIng(tgt) || isPotion(tgt)) && tgt.tier < topTier(tgt.chain)
    const onWisp = tgt.chain === WISP && (isIng(src) || isPotion(src)) && src.tier < topTier(src.chain)
    if (mergeable(src, tgt) || wispOn || onWisp) {
      const base = wispOn ? tgt : src
      w.cells[d.idx] = null
      tgt.pending = true
      w.anims.push({ chain: base.chain, tier: base.tier, x0: d.x, y0: d.y - cs * 0.2, dst, t: 0, wisp: wispOn || onWisp })
      sfx.whoosh()
      return
    }
    w.cells[dst] = src
    w.cells[d.idx] = tgt
    src.pop = 0.5
    tgt.pop = 0.5
    sfx.flip()
  }

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__potionmerge = world
  }, [world])

  // ── Frame ───────────────────────────────────────────

  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    const live = ph === 'play' || (ph === 'idle' && w.demo)
    w.clock += dt
    for (const a of w.anims) a.t += raw
    const done = w.anims.filter((a) => a.t >= 0.12)
    w.anims = w.anims.filter((a) => a.t < 0.12)
    for (const a of done) finishMerge(a)
    for (const it of w.cells) {
      if (!it) continue
      it.pop = Math.max(0, it.pop - raw * 3)
      if (it.fly) {
        it.fly.t += raw / 0.3
        if (it.fly.t >= 1) {
          it.fly = null
          it.pop = 0.7
        }
      }
    }
    if (w.brew) {
      w.brew.t += dt
      if (w.brew.t >= 0.75) finishBrew()
    }
    if (!live) return
    const { W } = geo()

    // ingredients appear
    w.spawnT -= dt
    if (w.spawnT <= 0) {
      w.spawnT = (Math.max(0.8, 2.0 - w.level * 0.08) / (1 + run.level('basket') * 0.08)) * (w.demo ? 1.5 : 1)
      const tier = Math.random() < 0.12 ? 1 : 0
      const i = place(Math.floor(Math.random() * w.chains), tier, W / 2, -20, false)
      if (i < 0 && w.demo) w.cells = w.cells.map(() => null)
    }
    if (w.demo) {
      for (let ci = 0; ci < 3; ci++) if (!w.customers[ci]) w.customers[ci] = makeCustomer()
      for (const c of w.customers) if (c) c.enter = Math.min(1, c.enter + raw * 2)
      return
    }
    // specials
    w.specialIn -= dt
    if (w.specialIn <= 0) {
      w.specialIn = rand(40, 60)
      const kind = Math.random() < 0.55 ? WISP : GLASS
      if (place(kind, 0, W / 2, -20, false) >= 0) fx.text(W / 2, geo().by - 10, kind === WISP ? 'A wisp appeared!' : 'An hourglass appeared!', '#a5f3fc', 13)
    }
    // rush hour from level 4
    if (w.level >= 4) {
      if (w.rush > 0) w.rush -= dt
      else {
        w.rushIn -= dt
        if (w.rushIn <= 0) {
          w.rush = 15
          w.rushIn = rand(55, 75)
          showBanner('RUSH HOUR!', 'more customers · more VIPs')
          sfx.ready()
        }
      }
    }
    w.freeze = Math.max(0, w.freeze - dt)

    // customers
    for (let ci = 0; ci < 3; ci++) {
      const c = w.customers[ci]
      if (!c) {
        w.custIn[ci] -= dt * (w.rush > 0 ? 2 : 1)
        if (w.custIn[ci] <= 0) {
          w.customers[ci] = makeCustomer()
          sfx.tap()
        }
        continue
      }
      c.enter = Math.min(1, c.enter + raw * 2.5)
      c.happy = Math.max(0, c.happy - raw)
      if (c.leave >= 0) {
        c.leave += raw
        if (c.leave > 1) {
          w.customers[ci] = null
          w.custIn[ci] = Math.max(1.5, rand(3, 7) - w.level * 0.2)
        }
        continue
      }
      if (w.freeze <= 0 && c.enter >= 1) c.patience -= dt
      if (c.patience <= 0) {
        c.leave = 0
        c.angry = true
        w.hearts -= 1
        const p = custPos(ci)
        fx.text(p.x, p.y - 30, 'Hmph!', '#fca5a5', 16)
        fx.burst(p.x, p.y, { count: 12, color: ['#ef4444', '#7f1d1d'], speed: 140, gravity: 200 })
        fx.flash('#ef4444', 0.2)
        fx.shake(7, 0.25)
        sfx.hurt()
        haptic.heavy()
        if (w.hearts <= 0) die()
      } else if (c.patience < c.max * 0.25 && Math.floor(c.patience) !== Math.floor(c.patience + dt)) sfx.tick()
    }
    if (w.combo > 0 && w.clock - w.lastMerge > 1.8) {
      w.combo = 0
      pushHud()
    }
  }

  function drawItemAt(ctx: CanvasRenderingContext2D, it: { chain: number; tier: number }, x: number, y: number, size: number) {
    ctx.drawImage(itemSprite(it.chain, it.tier, size), x - size / 2, y - size / 2, size, size)
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const ph = phaseRef.current
    const dt = fx.step(raw)
    update(dt, raw)
    const { counterY, cs, bx, by, potX, potY, potR } = geo()

    ctx.drawImage(shopSprite(W, H, counterY), 0, 0, W, H)
    // candles
    for (const x of [W * 0.04 + 6, W * 0.7]) {
      glow(ctx, x, 30, 28, '#fde68a', 0.25 + Math.sin(t * 7 + x) * 0.05)
    }
    fx.applyShake(ctx)

    // customers behind the counter
    const d = drag.current
    const dragged = d && d.moved ? w.cells[d.idx] : null
    for (let ci = 0; ci < 3; ci++) {
      const c = w.customers[ci]
      if (!c) continue
      const p = custPos(ci)
      const off = (1 - c.enter) * 60 + (c.leave >= 0 ? c.leave * c.leave * 80 : 0)
      const mood = c.leave >= 0 ? (c.angry ? 0 : 1) : clamp(c.patience / c.max + 0.15, 0, 1)
      ctx.save()
      ctx.globalAlpha = c.leave >= 0 ? Math.max(0, 1 - c.leave) : 1
      ctx.translate(0, off)
      if (c.vip) glow(ctx, p.x, p.y + 6, 40, '#fde047', 0.4 + Math.sin(t * 6) * 0.12)
      drawCustomer(ctx, c.kind, p.x - 12, p.y + 10, 24, mood, t)
      // speech bubble with the request
      const bx2 = p.x + 16
      const by2 = p.y - 22
      const can = dragged && dragged.chain === c.want.chain && dragged.tier === c.want.tier
      ctx.fillStyle = can ? '#dcfce7' : '#ffffff'
      ctx.strokeStyle = can ? '#16a34a' : '#1e1b2e'
      ctx.lineWidth = can ? 3 : 2
      ctx.beginPath()
      ctx.roundRect(bx2 - 22, by2 - 22, 44, 44, 12)
      ctx.fill()
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(bx2 - 16, by2 + 18)
      ctx.lineTo(bx2 - 24, by2 + 30)
      ctx.lineTo(bx2 - 6, by2 + 21)
      ctx.fillStyle = can ? '#dcfce7' : '#ffffff'
      ctx.fill()
      drawItemAt(ctx, c.want, bx2, by2, 40)
      if (c.vip) {
        ctx.fillStyle = '#ca8a04'
        ctx.font = `900 9px ${FONT}`
        ctx.textAlign = 'center'
        ctx.fillText('VIP', bx2, by2 - 26)
      }
      // patience bar
      if (c.leave < 0) {
        const k = clamp(c.patience / c.max, 0, 1)
        const pw = 54
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.beginPath()
        ctx.roundRect(p.x - pw / 2, p.y + 34, pw, 6, 3)
        ctx.fill()
        ctx.fillStyle = w.freeze > 0 ? '#7dd3fc' : k > 0.5 ? '#4ade80' : k > 0.25 ? '#facc15' : '#ef4444'
        ctx.beginPath()
        ctx.roundRect(p.x - pw / 2, p.y + 34, Math.max(6, pw * k), 6, 3)
        ctx.fill()
      }
      ctx.restore()
    }

    // cauldron, cat, hearts
    const brewK = w.brew ? w.brew.t / 0.75 : 0
    const liquid = w.brew ? POTION_COLORS[w.brew.tier] : w.pot.length ? INGREDIENTS[w.pot[0].chain].color : '#4ade80'
    glow(ctx, potX, potY - potR * 0.3, potR * 2.2, liquid, 0.25 + brewK * 0.3)
    const overPot = !!(d && d.moved && Math.hypot(d.x - potX, d.y - potY) < potR * 1.4)
    drawCauldron(ctx, potX, potY, potR * (overPot ? 1.08 : 1), t, liquid, brewK)
    for (let k = 0; k < w.pot.length; k++) {
      const a = t * 2 + k * Math.PI
      drawItemAt(ctx, w.pot[k], potX + Math.cos(a) * potR * 0.45, potY - potR * 0.45 + Math.sin(a) * potR * 0.1 - brewK * 10, potR * 0.75 * (1 - brewK * 0.5))
    }
    if (ph === 'play' && w.pot.length === 0 && w.clock < 25) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.font = `800 10px ${FONT}`
      ctx.textAlign = 'center'
      ctx.fillText('drop 2 different ingredients', potX, potY + potR * 1.25)
    }
    const cat = catPos()
    const overCat = !!(d && d.moved && Math.hypot(d.x - cat.x, d.y - cat.y) < 36)
    drawCat(ctx, cat.x, cat.y, 26, t, overCat)
    // hearts
    if (ph !== 'idle') {
      const gp = glassPos()
      for (let k = 0; k < 3; k++) {
        const hx = gp.x - 22 + k * 22
        const hy = gp.y - 8
        ctx.save()
        ctx.translate(hx, hy)
        ctx.scale(0.9, 0.9)
        ctx.beginPath()
        ctx.moveTo(0, 8)
        ctx.bezierCurveTo(-12, 0, -8, -10, 0, -4)
        ctx.bezierCurveTo(8, -10, 12, 0, 0, 8)
        ctx.fillStyle = k < w.hearts ? '#f43f5e' : 'rgba(255,255,255,0.18)'
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = '#1e1b2e'
        ctx.stroke()
        ctx.restore()
      }
      if (w.freeze > 0) {
        ctx.fillStyle = '#bae6fd'
        ctx.font = `900 11px ${FONT}`
        ctx.textAlign = 'center'
        ctx.fillText(`frozen ${Math.ceil(w.freeze)}s`, gp.x, gp.y + 16)
      } else if (w.rush > 0) {
        ctx.fillStyle = '#fde047'
        ctx.font = `900 11px ${FONT}`
        ctx.textAlign = 'center'
        ctx.fillText(`rush ${Math.ceil(w.rush)}s`, gp.x, gp.y + 16)
      }
    }

    // table
    ctx.fillStyle = '#78350f'
    ctx.beginPath()
    ctx.roundRect(bx - 6, by - 6, cs * COLS + 12, cs * ROWS + 12, 14)
    ctx.fill()
    for (let i = 0; i < CELLS; i++) {
      const s = cellXY(i)
      const odd = (i % COLS + Math.floor(i / COLS)) % 2
      ctx.fillStyle = odd ? '#a16207' : '#92400e'
      ctx.beginPath()
      ctx.roundRect(s.x + 2, s.y + 2, cs - 4, cs - 4, 9)
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(s.x + 8, s.y + cs * 0.55)
      ctx.lineTo(s.x + cs - 8, s.y + cs * 0.55)
      ctx.stroke()
    }
    const wanted = new Set<string>()
    for (const c of w.customers) if (c && c.leave < 0) wanted.add(`${c.want.chain}|${c.want.tier}`)
    for (let i = 0; i < CELLS; i++) {
      const it = w.cells[i]
      if (!it || (d && d.moved && d.idx === i)) continue
      const s = cellXY(i)
      let x = s.x + cs / 2
      let y = s.y + cs / 2
      if (it.fly) {
        const q = it.fly.t
        x = it.fly.x + (x - it.fly.x) * q
        y = it.fly.y + (y - it.fly.y) * q - Math.sin(q * Math.PI) * cs * 0.6
      }
      if (dragged && it !== dragged && dragged.chain === it.chain && dragged.tier === it.tier && it.tier < topTier(it.chain) && dragged.chain <= POTION) glow(ctx, x, y, cs * 0.7, '#fde047', 0.4 + Math.sin(t * 8) * 0.15)
      if (it.chain === POTION && it.tier >= 4) glow(ctx, x, y, cs * 0.6, POTION_COLORS[it.tier], 0.25 + Math.sin(t * 3 + i) * 0.08)
      if (it.chain >= WISP) glow(ctx, x, y, cs * 0.6, it.chain === WISP ? '#a5f3fc' : '#fde047', 0.4 + Math.sin(t * 6) * 0.15)
      const pop = it.pop
      const sz = cs * (0.86 + pop * 0.28 - (pop > 0.75 ? (pop - 0.75) * 0.8 : 0))
      drawItemAt(ctx, it, x, y + (it.chain === WISP ? Math.sin(t * 4 + i) * 2 : 0), sz)
      if (!it.fly && wanted.has(`${it.chain}|${it.tier}`)) {
        ctx.fillStyle = '#16a34a'
        ctx.beginPath()
        ctx.arc(s.x + cs - 10, s.y + 10, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(s.x + cs - 13, s.y + 10)
        ctx.lineTo(s.x + cs - 10.5, s.y + 12.5)
        ctx.lineTo(s.x + cs - 6.5, s.y + 7.5)
        ctx.stroke()
      }
    }
    if (d && d.moved) {
      const dst = cellAt(d.x, d.y)
      if (dst >= 0 && dst !== d.idx) {
        const s = cellXY(dst)
        ctx.strokeStyle = '#f5d0fe'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(s.x + 3, s.y + 3, cs - 6, cs - 6, 9)
        ctx.stroke()
      }
    }
    for (const a of w.anims) {
      const s = cellXY(a.dst)
      const q = Math.min(1, a.t / 0.12)
      drawItemAt(ctx, a.wisp ? { chain: WISP, tier: 0 } : a, a.x0 + (s.x + cs / 2 - a.x0) * q, a.y0 + (s.y + cs / 2 - a.y0) * q, cs * (1 - q * 0.2))
    }
    if (d && d.moved) {
      const it = w.cells[d.idx]
      if (it) drawItemAt(ctx, it, d.x, d.y - cs * 0.25 + Math.sin(t * 12) * 1.5, cs * 1.08)
    }
    // potion ladder hint above the table
    if (ph !== 'idle') {
      const nt = Math.min(MAX_POTION, w.best + 1)
      ctx.fillStyle = 'rgba(30,27,46,0.6)'
      ctx.beginPath()
      ctx.roundRect(W / 2 - 70, by - 26, 140, 18, 9)
      ctx.fill()
      ctx.fillStyle = '#f5d0fe'
      ctx.font = `800 10px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(w.best >= MAX_POTION ? 'MASTER ALCHEMIST' : `NEXT POTION: ${POTIONS[nt].toUpperCase()}`, W / 2, by - 17)
    }
    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const won = hud.served >= 10
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena potionmerge-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud potionmerge-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">
                  Level {hud.level} · {hud.served} served
                </span>
                {hud.combo > 1 ? <span className="potionmerge-combo">x{hud.combo}</span> : null}
              </div>
            </div>
          )}
          {banner && phase === 'play' ? (
            <div className="action-banner potionmerge-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="potionmerge"
              icon={meta.icon}
              title={meta.title}
              hint="Merge matching ingredients, brew two different ones in the cauldron and serve customers before their patience runs out."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Master brewer!' : 'Shop closed'}
            subtitle={`Score ${hud.score} · ${hud.served} customers served`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
