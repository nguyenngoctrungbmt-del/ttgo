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
import { GUN_NAMES, MAX_TIER, PALETTES, TIER_COLORS, drawBarricade, drawZombie, fieldSprite, gunSprite, type ZKind } from './art'
import '../../shared/action/action.css'
import './gunmerge.css'

const meta = getGame('gunmerge')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Shot = 'bullet' | 'pellet' | 'rocket' | 'plasma' | 'snipe' | 'beam' | 'rail'
type GunDef = { rate: number; shot: Shot; pellets?: number; pierce?: number; splash?: number; color: string }

const GUNS: GunDef[] = [
  { rate: 1.6, shot: 'bullet', color: '#fde047' },
  { rate: 1.1, shot: 'bullet', color: '#fde047' },
  { rate: 6, shot: 'bullet', color: '#fef08a' },
  { rate: 0.95, shot: 'pellet', pellets: 5, color: '#fdba74' },
  { rate: 1.5, shot: 'bullet', pierce: 1, color: '#fde047' },
  { rate: 6.5, shot: 'bullet', color: '#fef08a' },
  { rate: 0.7, shot: 'snipe', pierce: 3, color: '#e0f2fe' },
  { rate: 16, shot: 'bullet', color: '#fdba74' },
  { rate: 0.75, shot: 'rocket', splash: 58, color: '#f97316' },
  { rate: 9, shot: 'beam', color: '#22d3ee' },
  { rate: 1.8, shot: 'plasma', splash: 44, pierce: 2, color: '#e879f9' },
  { rate: 0.55, shot: 'rail', pierce: 99, color: '#93c5fd' },
]
const gunDps = (t: number) => 5 * Math.pow(2.3, t)

/** [hp, speed px/s, radius, barricade dps, cash, score] at wave 1. */
const ZDEF: Record<ZKind, [number, number, number, number, number, number]> = {
  walker: [10, 26, 14, 5, 1, 10],
  runner: [6, 54, 12, 4, 1, 12],
  bat: [5, 44, 11, 4, 1, 12],
  bomber: [12, 32, 14, 0, 2, 20],
  spitter: [14, 24, 14, 0, 2, 20],
  brute: [45, 15, 22, 14, 4, 40],
  armored: [24, 20, 15, 6, 3, 30],
  boss: [260, 10, 34, 30, 25, 300],
}
const NEW_KIND: Partial<Record<number, [ZKind, string]>> = {
  2: ['runner', 'Runners: fast and frail'],
  3: ['bat', 'Bats swoop in zig-zags'],
  6: ['bomber', 'Bombers explode — pop them early'],
  7: ['spitter', 'Spitters attack from range'],
  8: ['brute', 'Brutes: slow, tough, hit hard'],
  11: ['armored', 'Armored: bullets do half damage'],
}
const BOSS_NAMES = ['Brute King', 'Hive Mother', 'Toxic Titan', 'Blood Colossus']

const LINE = 5
const GC = 5
const GR = 2
const SLOTS = LINE + GC * GR

type Gun = { tier: number; pop: number; cd: number; aim: number; recoil: number; flash: number; pending: boolean; id: number }
type Enemy = {
  id: number
  kind: ZKind
  x: number
  y: number
  hp: number
  max: number
  sp: number
  r: number
  dps: number
  cash: number
  score: number
  flash: number
  t: number
  atWall: boolean
  spitT: number
  phase: number
  variant: number
  dead: boolean
  bossKind: number
  abilT: number
}
type Proj = { x: number; y: number; vx: number; vy: number; dmg: number; pierce: number; splash: number; shot: Shot; color: string; life: number; hits: number[] }
type Beam = { x0: number; y0: number; x1: number; y1: number; life: number; max: number; color: string; width: number }
type Spit = { x: number; y: number; vy: number; dmg: number }
type Nade = { x0: number; y0: number; x1: number; y1: number; t: number; dur: number; dmg: number }
type Crate = { x: number; y: number; t: number }
type Coin = { x: number; y: number; vx: number; vy: number; t: number }
type MergeAnim = { tier: number; x0: number; y0: number; dst: number; t: number }

type World = {
  demo: boolean
  slots: (Gun | null)[]
  lineSlots: number
  enemies: Enemy[]
  projs: Proj[]
  beams: Beam[]
  spits: Spit[]
  nades: Nade[]
  coins: Coin[]
  anims: MergeAnim[]
  crate: Crate | null
  crateIn: number
  wave: number
  queue: ZKind[]
  spawnT: number
  breakT: number
  waveTotal: number
  waveKills: number
  bar: number
  barMax: number
  barShake: number
  barHitT: number
  invuln: number
  cash: number
  buys: number
  grenades: number
  score: number
  best: number
  seen: boolean[]
  combo: number
  lastMerge: number
  clock: number
  nextId: number
  bossName: string
  shotSfx: number
  hintT: number
  stats: { score: number; wave: number; kills: number; best: number; bosses: number; merges: number }
}

function freshWorld(demo = false): World {
  return {
    demo,
    slots: Array.from({ length: SLOTS }, () => null),
    lineSlots: 3,
    enemies: [],
    projs: [],
    beams: [],
    spits: [],
    nades: [],
    coins: [],
    anims: [],
    crate: null,
    crateIn: 40,
    wave: 0,
    queue: [],
    spawnT: 0,
    breakT: 0,
    waveTotal: 1,
    waveKills: 0,
    bar: 100,
    barMax: 100,
    barShake: 0,
    barHitT: 0,
    invuln: 0,
    cash: 20,
    buys: 0,
    grenades: 1,
    score: 0,
    best: 0,
    seen: Array.from({ length: MAX_TIER + 1 }, (_, i) => i === 0),
    combo: 0,
    lastMerge: -9,
    clock: 0,
    nextId: 1,
    bossName: '',
    shotSfx: 0,
    hintT: 0,
    stats: { score: 0, wave: 0, kills: 0, best: 1, bosses: 0, merges: 0 },
  }
}

function fmt(n: number) {
  if (n < 10000) return String(Math.floor(n))
  if (n < 1e6) return `${(n / 1000).toFixed(n < 1e5 ? 1 : 0)}K`
  if (n < 1e9) return `${(n / 1e6).toFixed(1)}M`
  return `${(n / 1e9).toFixed(1)}B`
}

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif"

export default function GunMergeGame() {
  const run = useActionRun('gunmerge')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(true))
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ pid: number; idx: number; x: number; y: number; sx: number; sy: number; moved: boolean } | null>(null)
  const lastEvent = useRef(0)
  const lastNote = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, wave: 1, cash: 0, combo: 0, boss: -1, bossName: '' })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    const boss = w.enemies.find((e) => e.kind === 'boss' && !e.dead)
    setHud({ score: w.score, wave: w.wave, cash: w.cash, combo: w.combo, boss: boss ? boss.hp / boss.max : -1, bossName: w.bossName })
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const barH = 62
    const cs = Math.floor(Math.min((W - 20) / GC, (H - barH - 300) / 3.6, 72))
    const gx = Math.round((W - cs * GC) / 2)
    const gridY = H - barH - cs * GR - 4
    const lineY = gridY - cs - 12
    const fieldH = lineY - 4
    const wallY = fieldH - 16
    const hz = fieldH * 0.16
    const k = clamp(W / 380, 0.8, 1.25)
    return { W, H, barH, cs, gx, gridY, lineY, fieldH, wallY, hz, k }
  }

  function slotXY(i: number) {
    const { cs, gx, gridY, lineY } = geo()
    if (i < LINE) return { x: gx + i * cs, y: lineY }
    const j = i - LINE
    return { x: gx + (j % GC) * cs, y: gridY + Math.floor(j / GC) * cs }
  }

  function slotAt(x: number, y: number) {
    const { cs } = geo()
    for (let i = 0; i < SLOTS; i++) {
      const s = slotXY(i)
      if (x >= s.x && x < s.x + cs && y >= s.y && y < s.y + cs) return i
    }
    return -1
  }

  function buttons() {
    const { W, H, barH, gx, cs } = geo()
    const y = H - barH + 6
    const h = barH - 12
    const total = cs * GC
    const buyW = Math.round(total * 0.42)
    const nadeW = Math.round(total * 0.24)
    return {
      buy: { x: gx, y, w: buyW, h },
      next: { x: gx + buyW + 6, y, w: total - buyW - nadeW - 12, h },
      nade: { x: Math.min(W - 10, gx + total) - nadeW, y, w: nadeW, h },
    }
  }

  function inRect(x: number, y: number, r: { x: number; y: number; w: number; h: number }) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
  }

  // ── Economy ─────────────────────────────────────────

  function shopTier() {
    return Math.max(0, world.current.best - 5)
  }

  function buyCost() {
    const w = world.current
    return Math.round(10 * Math.pow(1.02, w.buys) * Math.pow(2, shopTier()))
  }

  function sellValue(tier: number) {
    return Math.max(1, Math.round(0.4 * 10 * Math.pow(2, tier) * Math.pow(1.02, world.current.buys * 0.6)))
  }

  function emptyGrid() {
    const w = world.current
    const out: number[] = []
    for (let i = LINE; i < SLOTS; i++) if (!w.slots[i]) out.push(i)
    return out
  }

  function newGun(tier: number): Gun {
    return { tier, pop: 1, cd: rand(0, 0.4), aim: -Math.PI / 2, recoil: 0, flash: 0, pending: false, id: world.current.nextId++ }
  }

  function placeGun(tier: number, preferLine = false) {
    const w = world.current
    let idx = -1
    if (preferLine) for (let i = 0; i < w.lineSlots && idx < 0; i++) if (!w.slots[i]) idx = i
    if (idx < 0) {
      const e = emptyGrid()
      if (e.length) idx = e[0]
    }
    if (idx < 0) for (let i = 0; i < w.lineSlots && idx < 0; i++) if (!w.slots[i]) idx = i
    if (idx < 0) return -1
    w.slots[idx] = newGun(tier)
    return idx
  }

  function buy() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    const cost = buyCost()
    const { cs } = geo()
    const b = buttons().buy
    if (w.cash < cost) {
      if (performance.now() - lastNote.current > 900) {
        lastNote.current = performance.now()
        fx.text(b.x + b.w / 2, b.y - 8, 'Not enough cash', '#fecaca', 13)
      }
      sfx.miss()
      haptic.light()
      return
    }
    const tier = shopTier()
    const idx = placeGun(tier)
    if (idx < 0) {
      fx.text(b.x + b.w / 2, b.y - 8, 'Arsenal full — merge!', '#fecaca', 13)
      sfx.miss()
      return
    }
    w.cash -= cost
    w.buys += 1
    const s = slotXY(idx)
    fx.burst(s.x + cs / 2, s.y + cs / 2, { count: 10, color: ['#fde047', '#ffffff', '#86efac'], speed: 140, shape: 'spark', gravity: 100 })
    fx.ring(s.x + cs / 2, s.y + cs / 2, { color: '#86efac', maxR: cs * 0.6, life: 0.3 })
    sfx.pop()
    haptic.light()
    pushHud()
  }

  function sell(idx: number) {
    const w = world.current
    const g = w.slots[idx]
    if (!g) return
    if (w.slots.filter(Boolean).length <= 1) {
      sfx.miss()
      return
    }
    const v = sellValue(g.tier)
    w.slots[idx] = null
    w.cash += v
    const b = buttons().buy
    fx.text(b.x + b.w / 2, b.y - 10, `SOLD +$${fmt(v)}`, '#86efac', 15)
    fx.burst(b.x + b.w / 2, b.y + b.h / 2, { count: 10, color: ['#22c55e', '#86efac', '#fde047'], speed: 160, shape: 'square', gravity: 300 })
    sfx.score(2)
    haptic.medium()
    pushHud()
  }

  // ── Run lifecycle ───────────────────────────────────

  function start() {
    void unlockAudio()
    const w = freshWorld(false)
    world.current = w
    fx.reset()
    lastEvent.current = 0
    w.barMax = Math.round(100 * (1 + run.level('sandbags') * 0.25))
    w.bar = w.barMax
    w.slots[0] = newGun(0)
    w.slots[1] = newGun(0)
    w.slots[LINE + 2] = newGun(0)
    const extra = run.level('armory')
    for (let i = 0; i < extra; i++) w.slots[LINE + 6 + i] = newGun(1)
    if (extra > 0) {
      w.best = 1
      w.seen[1] = true
      w.stats.best = 2
    }
    w.breakT = 1.2
    run.begin()
    setPhaseBoth('play')
    showBanner('HOLD THE LINE', 'drag matching guns to merge')
    sfx.ready()
    pushHud()
  }

  function startWave() {
    const w = world.current
    w.wave += 1
    w.stats.wave = w.wave
    const n = 8 + Math.floor(w.wave * 2.2)
    const pool: ZKind[] = ['walker']
    if (w.wave >= 2) pool.push('runner')
    if (w.wave >= 3) pool.push('bat')
    if (w.wave >= 6) pool.push('bomber')
    if (w.wave >= 7) pool.push('spitter')
    if (w.wave >= 8) pool.push('brute')
    if (w.wave >= 11) pool.push('armored')
    const q: ZKind[] = []
    const boss = w.wave % 5 === 0
    const count = boss ? Math.ceil(n * 0.6) : n
    for (let i = 0; i < count; i++) {
      // new arrivals show up a lot in their debut wave
      const fresh = NEW_KIND[w.wave]
      q.push(fresh && Math.random() < 0.4 ? fresh[0] : pool[Math.floor(Math.random() * pool.length)])
    }
    if (boss) q.splice(Math.min(3, q.length), 0, 'boss')
    w.queue = q
    w.waveTotal = q.length
    w.waveKills = 0
    w.spawnT = 0.5
    if (w.demo) return
    if (w.wave === 6 || w.wave === 12) {
      w.lineSlots = Math.min(LINE, w.lineSlots + 1)
      showBanner('NEW FIRING SLOT!', `wave ${w.wave}`)
      sfx.levelUp()
      const s = slotXY(w.lineSlots - 1)
      const { cs } = geo()
      fx.ring(s.x + cs / 2, s.y + cs / 2, { color: '#fde047', maxR: cs, life: 0.6, width: 4 })
    } else if (boss) {
      w.bossName = BOSS_NAMES[(w.wave / 5 - 1) % BOSS_NAMES.length]
      showBanner(`BOSS: ${w.bossName.toUpperCase()}`, `wave ${w.wave}`)
      sfx.boom(0.5)
      haptic.heavy()
      fx.flash('#7f1d1d', 0.25)
    } else {
      const nk = NEW_KIND[w.wave]
      showBanner(`WAVE ${w.wave}`, nk ? nk[1] : w.wave % 10 === 1 && w.wave > 1 ? PALETTES[Math.floor((w.wave - 1) / 10) % PALETTES.length].name : undefined)
      sfx.ready()
    }
    run.update(w.stats)
    pushHud()
  }

  function spawnEnemy(kind: ZKind, x?: number, y?: number) {
    const w = world.current
    const { W, hz, k } = geo()
    const d = ZDEF[kind]
    const hm = Math.pow(1.29, Math.max(0, w.wave - 1))
    const cm = Math.ceil(2 * Math.pow(1.15, Math.max(0, w.wave - 1)))
    const boss = kind === 'boss'
    const hp = d[0] * hm * (boss ? 1 + Math.floor(w.wave / 10) * 0.3 : 1)
    w.enemies.push({
      id: w.nextId++,
      kind,
      x: x ?? rand(W * 0.14, W * 0.86),
      y: y ?? hz - 6,
      hp,
      max: hp,
      sp: d[1] * rand(0.9, 1.1) * (boss && (w.wave / 5) % 4 === 0 ? 1.4 : 1),
      r: d[2] * k * 1.3,
      dps: d[3],
      cash: d[4] * cm,
      score: d[5],
      flash: 0,
      t: rand(0, 5),
      atWall: false,
      spitT: rand(1, 2.5),
      phase: rand(0, Math.PI * 2),
      variant: Math.floor(Math.random() * 3),
      dead: false,
      bossKind: boss ? (w.wave / 5 - 1) % 4 : 0,
      abilT: 4,
    })
  }

  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.4)
    fx.shake(14, 0.6)
    fx.slowmo(1.1, 0.3)
    fx.stop(0.15)
    sfx.lose()
    haptic.error()
    const { W, wallY } = geo()
    fx.text(W / 2, wallY - 40, 'THE LINE IS BROKEN!', '#fecaca', 22)
    fx.explode(W / 2, wallY, 1.6)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.wave * 1.2 + w.stats.bosses * 3 + w.best) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.wave >= 6, stats: { ...w.stats }, coins }, revive)
    }, 1200)
  }

  /** Revive: rebuild the barricade, airstrike the lower field, push the rest back. Guns are kept. */
  function revive() {
    const w = world.current
    const { W, hz, wallY } = geo()
    w.bar = Math.round(w.barMax * 0.7)
    w.invuln = 3
    w.grenades = Math.min(5, w.grenades + 1)
    for (const e of w.enemies) {
      if (e.kind === 'boss') {
        e.hp = Math.max(1, e.hp - e.max * 0.3)
        e.y = hz + 10
        e.atWall = false
      } else if (e.y > hz + (wallY - hz) * 0.35) {
        e.dead = true
        fx.explode(e.x, e.y, 0.8)
      } else e.y = hz
    }
    w.enemies = w.enemies.filter((e) => !e.dead)
    w.spits = []
    fx.flash('#fde68a', 0.3)
    fx.ring(W / 2, wallY, { color: '#fde047', maxR: W * 0.6, life: 0.6, width: 5 })
    showBanner('REVIVED!', 'barricade rebuilt')
    pushHud()
    setPhaseBoth('play')
  }

  // ── Combat ──────────────────────────────────────────

  function hurt(e: Enemy, dmg: number, shot: Shot) {
    if (e.dead) return
    const armored = e.kind === 'armored' && (shot === 'bullet' || shot === 'pellet')
    e.hp -= armored ? dmg * 0.5 : dmg
    e.flash = 1
    if (e.hp <= 0) kill(e)
  }

  function kill(e: Enemy) {
    const w = world.current
    e.dead = true
    const { k } = geo()
    const L = e.kind === 'boss' ? 2.4 : e.kind === 'brute' ? 1.4 : 1
    fx.burst(e.x, e.y - e.r * 0.3, { count: Math.round(10 * L), color: ['#4ade80', '#166534', '#a3e635', '#7f1d1d'], speed: 170 * L, size: 3.4, gravity: 420, shape: 'square' })
    fx.burst(e.x, e.y, { count: 5, color: ['#57534e', '#a8a29e'], speed: 50, size: 6, life: 0.6, gravity: -30, drag: 3 })
    if (w.demo) return
    const gain = Math.round(e.score * (1 + w.wave * 0.15))
    w.score += gain
    w.cash += e.cash
    w.waveKills += 1
    w.stats.kills += 1
    w.stats.score = w.score
    for (let i = 0; i < Math.min(4, 1 + Math.floor(e.cash / 6)); i++) {
      if (w.coins.length < 40) w.coins.push({ x: e.x, y: e.y, vx: rand(-90, 90), vy: rand(-200, -120), t: 0 })
    }
    if (e.kind === 'bomber') {
      const R = 66 * k
      fx.explode(e.x, e.y, 1.1)
      sfx.boom(0.45)
      const hm = Math.pow(1.29, w.wave - 1)
      for (const o of w.enemies) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < R + o.r) hurt(o, 30 * hm, 'rocket')
    } else if (e.kind === 'boss') {
      w.stats.bosses += 1
      w.score += 500 * Math.ceil(w.wave / 5)
      w.grenades = Math.min(5, w.grenades + 1)
      fx.explode(e.x, e.y, 2.6, ['#fde047', '#f472b6', '#ffffff', '#c084fc'])
      fx.stop(0.15)
      fx.slowmo(0.9, 0.3)
      fx.flash('#ffffff', 0.25)
      sfx.boom(1)
      sfx.win()
      haptic.success()
      showBanner('BOSS DOWN!', '+1 grenade')
      if (performance.now() - lastEvent.current > 30000) {
        lastEvent.current = performance.now()
        void trackEvent('action_milestone', { game_id: 'gunmerge', kind: 'boss', value: w.wave })
      }
    } else {
      fx.text(e.x, e.y - e.r - 4, `+$${fmt(e.cash)}`, '#86efac', 12)
      if (Math.random() < 0.5) sfx.hit()
    }
    run.update(w.stats)
  }

  function frontEnemy(x: number, y: number) {
    let best: Enemy | null = null
    let bd = 1e9
    for (const e of world.current.enemies) {
      if (e.dead) continue
      const d = Math.hypot(e.x - x, e.y - y) - (e.kind === 'boss' ? 30 : 0)
      if (d < bd) {
        bd = d
        best = e
      }
    }
    return best
  }

  function hitscan(x0: number, y0: number, a: number, dmg: number, pierce: number, shot: Shot) {
    const w = world.current
    const dx = Math.cos(a)
    const dy = Math.sin(a)
    const hits: { e: Enemy; d: number }[] = []
    for (const e of w.enemies) {
      if (e.dead) continue
      const px = e.x - x0
      const py = e.y - e.r * 0.3 - y0
      const along = px * dx + py * dy
      if (along < 0) continue
      const perp = Math.abs(px * dy - py * dx)
      if (perp < e.r * 1.1) hits.push({ e, d: along })
    }
    hits.sort((p, q) => p.d - q.d)
    const n = Math.min(hits.length, pierce + 1)
    for (let i = 0; i < n; i++) {
      hurt(hits[i].e, dmg, shot)
      fx.burst(hits[i].e.x, hits[i].e.y - hits[i].e.r * 0.3, { count: 4, color: ['#ffffff', GUNS[shot === 'rail' ? 11 : shot === 'beam' ? 9 : 6].color], speed: 120, shape: 'spark', gravity: 0 })
    }
    return n > 0 ? hits[n - 1].d : 0
  }

  function fire(g: Gun, mx: number, my: number, target: Enemy) {
    const w = world.current
    const def = GUNS[g.tier]
    const dmg = gunDps(g.tier) / def.rate / (def.pellets ?? 1)
    const a = g.aim
    g.recoil = 1
    g.flash = 1
    if (def.shot === 'beam' || def.shot === 'snipe' || def.shot === 'rail') {
      const len = def.shot === 'beam' ? Math.hypot(target.x - mx, target.y - my) : 1400
      if (def.shot === 'beam') hurt(target, dmg, 'beam')
      else hitscan(mx, my, a, dmg, def.pierce ?? 0, def.shot)
      w.beams.push({ x0: mx, y0: my, x1: mx + Math.cos(a) * len, y1: my + Math.sin(a) * len, life: def.shot === 'beam' ? 0.09 : 0.22, max: def.shot === 'beam' ? 0.09 : 0.22, color: def.color, width: def.shot === 'rail' ? 7 : def.shot === 'snipe' ? 3 : 4 })
      if (def.shot !== 'beam') fx.shake(def.shot === 'rail' ? 4 : 2, 0.12)
    } else {
      const n = def.pellets ?? 1
      const sp = def.shot === 'rocket' ? 520 : def.shot === 'plasma' ? 620 : 980
      for (let i = 0; i < n; i++) {
        const aa = a + (n > 1 ? (i / (n - 1) - 0.5) * 0.32 : rand(-0.03, 0.03))
        if (w.projs.length > 180) w.projs.shift()
        w.projs.push({ x: mx, y: my, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, dmg, pierce: def.pierce ?? 0, splash: def.splash ?? 0, shot: def.shot, color: def.color, life: 1.4, hits: [] })
      }
    }
    if (!w.demo && w.clock - w.shotSfx > 0.07) {
      w.shotSfx = w.clock
      if (def.shot === 'rocket' || def.shot === 'rail') sfx.whoosh()
      else sfx.shoot()
    }
  }

  function explodeAt(x: number, y: number, R: number, dmg: number, colors?: string[]) {
    const w = world.current
    fx.explode(x, y, R / 50, colors)
    for (const e of w.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - e.r * 0.3 - y) < R + e.r) hurt(e, dmg, 'rocket')
  }

  function throwGrenade() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    const b = buttons().nade
    if (w.grenades <= 0) {
      fx.text(b.x + b.w / 2, b.y - 8, 'No grenades', '#fecaca', 13)
      sfx.miss()
      return
    }
    const { W, wallY } = geo()
    const tgt = frontEnemy(W / 2, wallY)
    if (!tgt) {
      fx.text(b.x + b.w / 2, b.y - 8, 'No targets', '#e5e7eb', 13)
      return
    }
    w.grenades -= 1
    let line = 0
    for (let i = 0; i < w.lineSlots; i++) {
      const g = w.slots[i]
      if (g) line += gunDps(g.tier)
    }
    const hm = Math.pow(1.29, w.wave - 1)
    w.nades.push({ x0: b.x + b.w / 2, y0: b.y, x1: tgt.x, y1: tgt.y - tgt.r * 0.3, t: 0, dur: 0.55, dmg: line * 2.5 + 60 * hm })
    sfx.whoosh()
    haptic.light()
    pushHud()
  }

  function crateReward(c: Crate) {
    const w = world.current
    const { W, wallY, cs } = geo()
    const r = Math.random()
    fx.burst(c.x, c.y, { count: 22, color: ['#fde047', '#a16207', '#ffffff'], speed: 220, shape: 'square', gravity: 400 })
    fx.ring(c.x, c.y, { color: '#fde047', maxR: 60, life: 0.4 })
    sfx.power()
    haptic.success()
    if (r < 0.45 && emptyGrid().length) {
      const tier = Math.max(0, w.best - 2)
      const idx = placeGun(tier)
      const s = slotXY(idx)
      fx.ring(s.x + cs / 2, s.y + cs / 2, { color: '#fde047', maxR: cs * 0.8, life: 0.5, width: 4 })
      showBanner('SUPPLY DROP!', `free ${GUN_NAMES[tier]}`)
      if (!w.seen[tier]) revealTier(tier)
    } else if (r < 0.65) {
      w.bar = Math.min(w.barMax, w.bar + w.barMax * 0.35)
      showBanner('REPAIRS!', 'barricade +35%')
      fx.burst(W / 2, wallY, { count: 26, color: ['#d6c08f', '#86efac', '#ffffff'], speed: 200, shape: 'square', gravity: 300 })
    } else if (r < 0.85) {
      showBanner('AIRSTRIKE!')
      for (const e of w.enemies) {
        if (e.dead) continue
        fx.explode(e.x, e.y, 0.7)
        hurt(e, e.max * (e.kind === 'boss' ? 0.15 : 0.6), 'rocket')
      }
      fx.flash('#fde68a', 0.25)
      fx.shake(12, 0.4)
      sfx.boom(0.9)
    } else {
      const v = Math.ceil(2 * Math.pow(1.15, w.wave - 1)) * 10
      w.cash += v
      showBanner('CASH CRATE!', `+$${fmt(v)}`)
      for (let i = 0; i < 10; i++) w.coins.push({ x: c.x, y: c.y, vx: rand(-140, 140), vy: rand(-260, -120), t: 0 })
    }
    pushHud()
  }

  // ── Merging ─────────────────────────────────────────

  function revealTier(tier: number) {
    const w = world.current
    w.seen[tier] = true
    if (tier >= 2) {
      showBanner(`NEW: ${GUN_NAMES[tier].toUpperCase()}!`, tier === MAX_TIER ? 'ultimate weapon' : `next: ${GUN_NAMES[Math.min(MAX_TIER, tier + 1)]}`)
      sfx.levelUp()
      fx.flash('#fef9c3', 0.15)
    }
  }

  function finishMerge(a: MergeAnim) {
    const w = world.current
    const g = w.slots[a.dst]
    if (!g) return
    g.pending = false
    g.tier = Math.min(MAX_TIER, a.tier + 1)
    g.pop = 1
    g.cd = 0.15
    const { cs } = geo()
    const s = slotXY(a.dst)
    const cx = s.x + cs / 2
    const cy = s.y + cs / 2
    w.combo = w.clock - w.lastMerge < 1.8 ? w.combo + 1 : 1
    w.lastMerge = w.clock
    w.stats.merges += 1
    const col = TIER_COLORS[g.tier]
    fx.burst(cx, cy, { count: 14 + g.tier * 3, color: [col, '#ffffff', '#fde047'], speed: 170 + g.tier * 18, shape: 'spark', gravity: 80 })
    fx.burst(cx, cy, { count: 8, color: [col, '#ffffff'], speed: 90, size: 4, gravity: -20 })
    fx.ring(cx, cy, { color: col, maxR: cs * (0.75 + g.tier * 0.05), life: 0.38, width: 4 })
    fx.ring(cx, cy, { color: '#ffffff', maxR: cs * 0.45, life: 0.22, width: 2 })
    fx.stop(0.035 + Math.min(0.06, g.tier * 0.006))
    fx.shake(2 + g.tier * 0.5, 0.15)
    fx.text(cx, cy - cs * 0.55, w.combo > 1 ? `${GUN_NAMES[g.tier]} x${w.combo}` : GUN_NAMES[g.tier], w.combo > 2 ? '#fde047' : '#ffffff', 13 + Math.min(6, g.tier))
    sfx.pop()
    sfx.score(Math.min(12, w.combo + Math.floor(g.tier / 2)))
    if (w.combo >= 3) {
      sfx.combo()
      if (w.combo === 3 || w.combo % 5 === 0) showBanner(`COMBO x${w.combo}!`, 'merge frenzy')
    }
    haptic.medium()
    w.score += 5 * Math.pow(2, g.tier)
    w.stats.score = w.score
    if (g.tier > w.best) {
      w.best = g.tier
      w.stats.best = g.tier + 1
    }
    if (!w.seen[g.tier]) revealTier(g.tier)
    run.update(w.stats)
    pushHud()
  }

  // ── Input ───────────────────────────────────────────

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const el = e.currentTarget
    const { x, y } = localPoint(e, el)
    const w = world.current
    const bt = buttons()
    if (inRect(x, y, bt.buy)) return buy()
    if (inRect(x, y, bt.nade)) return throwGrenade()
    const i = slotAt(x, y)
    if (i >= 0) {
      const g = w.slots[i]
      if (!g || g.pending) return
      el.setPointerCapture(e.pointerId)
      drag.current = { pid: e.pointerId, idx: i, x, y, sx: x, sy: y, moved: false }
      sfx.tap()
      return
    }
    const c = w.crate
    if (c && Math.hypot(c.x - x, c.y - y) < 44) {
      w.crate = null
      crateReward(c)
    }
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
    const src = w.slots[d.idx]
    if (!src || src.pending) return
    const { cs } = geo()
    if (!d.moved) {
      const s = slotXY(d.idx)
      fx.text(s.x + cs / 2, s.y - 4, `${GUN_NAMES[src.tier]} · ${fmt(gunDps(src.tier))} dps`, '#ffffff', 12)
      return
    }
    if (inRect(d.x, d.y, buttons().buy)) return sell(d.idx)
    const dst = slotAt(d.x, d.y)
    if (dst < 0 || dst === d.idx) return
    if (dst < LINE && dst >= w.lineSlots) {
      const s = slotXY(dst)
      fx.text(s.x + cs / 2, s.y, dst === 3 ? 'Unlocks at wave 6' : 'Unlocks at wave 12', '#fecaca', 12)
      sfx.miss()
      return
    }
    const tgt = w.slots[dst]
    if (!tgt) {
      w.slots[dst] = src
      w.slots[d.idx] = null
      src.pop = 0.6
      src.aim = -Math.PI / 2
      sfx.move()
      return
    }
    if (tgt.pending) return
    if (tgt.tier === src.tier && src.tier < MAX_TIER) {
      w.slots[d.idx] = null
      tgt.pending = true
      w.anims.push({ tier: src.tier, x0: d.x, y0: d.y - cs * 0.2, dst, t: 0 })
      sfx.whoosh()
      return
    }
    // different tiers: swap places
    w.slots[dst] = src
    w.slots[d.idx] = tgt
    src.pop = 0.6
    tgt.pop = 0.6
    src.aim = tgt.aim = -Math.PI / 2
    sfx.flip()
  }

  useEffect(() => {
    // test hook for scripted bots (stripped from production builds)
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__gunmerge = world
  }, [world])

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'b' || e.key === 'B' || e.key === ' ') {
        e.preventDefault()
        buy()
      } else if (e.key === 'g' || e.key === 'G') throwGrenade()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation ──────────────────────────────────────

  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    const { W, cs, wallY, hz, k } = geo()
    const live = ph === 'play' || (ph === 'idle' && w.demo)
    w.clock += dt
    w.barShake = Math.max(0, w.barShake - raw * 20)
    w.invuln = Math.max(0, w.invuln - dt)

    for (const a of w.anims) a.t += raw
    const done = w.anims.filter((a) => a.t >= 0.12)
    w.anims = w.anims.filter((a) => a.t < 0.12)
    for (const a of done) finishMerge(a)

    for (const g of w.slots) {
      if (!g) continue
      g.pop = Math.max(0, g.pop - raw * 3.2)
      g.recoil = Math.max(0, g.recoil - raw * 9)
      g.flash = Math.max(0, g.flash - raw * 14)
    }

    if (live) {
      // waves
      if (w.breakT > 0) {
        w.breakT -= dt
        if (w.breakT <= 0) startWave()
      } else if (w.queue.length) {
        w.spawnT -= dt
        if (w.spawnT <= 0) {
          spawnEnemy(w.queue.shift()!)
          const iv = Math.max(0.4, 1.4 - w.wave * 0.04)
          w.spawnT = w.demo ? 1.4 : iv * rand(0.6, 1.3)
          if (w.demo && w.queue.length === 0) w.queue = ['walker', 'runner', 'bat', 'walker', 'brute']
        }
      } else if (!w.enemies.length && !w.demo && ph === 'play') {
        // wave cleared
        const bonus = 50 * w.wave
        w.score += bonus
        w.stats.score = w.score
        w.bar = Math.min(w.barMax, w.bar + w.barMax * 0.12)
        if (w.wave % 3 === 0) w.grenades = Math.min(5, w.grenades + 1)
        w.breakT = 2.6
        if (w.wave % 5 !== 0) showBanner(`WAVE ${w.wave} CLEAR`, `+${bonus}${w.wave % 3 === 0 ? ' · +1 grenade' : ''}`)
        sfx.win()
        if (w.wave % 5 === 0 && performance.now() - lastEvent.current > 30000) {
          lastEvent.current = performance.now()
          void trackEvent('action_milestone', { game_id: 'gunmerge', kind: 'wave', value: w.wave })
        }
        run.update(w.stats)
        pushHud()
      }

      // airdrops
      if (!w.demo && w.wave >= 2) {
        if (!w.crate) {
          w.crateIn -= dt
          if (w.crateIn <= 0) {
            w.crate = { x: rand(W * 0.2, W * 0.8), y: hz - 20, t: 0 }
            w.crateIn = rand(32, 46)
            fx.text(W / 2, hz + 30, 'SUPPLY DROP — TAP IT!', '#fde047', 15)
            sfx.ready()
          }
        } else {
          const c = w.crate
          c.t += dt
          c.y += 26 * dt
          c.x += Math.sin(c.t * 1.6) * 14 * dt
          if (c.y > wallY - 30) {
            fx.burst(c.x, c.y, { count: 10, color: ['#a16207', '#78350f'], speed: 120, shape: 'square', gravity: 400 })
            fx.text(c.x, c.y - 20, 'Missed drop', '#e5e7eb', 12)
            w.crate = null
          }
        }
      }

      // enemies
      const speedK = (wallY - hz) / 300
      const hmDmg = 1 + w.wave * 0.03
      let wallHit = false
      for (const e of w.enemies) {
        if (e.dead) continue
        e.t += dt
        e.flash = Math.max(0, e.flash - raw * 8)
        const stopY = e.kind === 'spitter' ? hz + (wallY - hz) * 0.5 : wallY - e.r * 0.5
        if (e.kind === 'bat') e.x += Math.cos(e.t * 2.4 + e.phase) * 70 * dt * k
        if (e.y < stopY) {
          e.y += e.sp * speedK * dt
          if (e.y >= stopY) {
            e.y = stopY
            e.atWall = e.kind !== 'spitter'
          }
        }
        e.x = clamp(e.x, 16, W - 16)
        if (e.kind === 'spitter' && e.y >= stopY) {
          e.spitT -= dt
          if (e.spitT <= 0) {
            e.spitT = 2.6
            w.spits.push({ x: e.x, y: e.y - e.r, vy: 160, dmg: 5 * hmDmg })
            if (!w.demo) sfx.pop()
          }
        }
        if (e.kind === 'boss') {
          e.abilT -= dt
          if (e.abilT <= 0 && !w.demo) {
            e.abilT = 5
            if (e.bossKind === 1) {
              spawnEnemy('bat', e.x - 20, e.y)
              spawnEnemy('bat', e.x + 20, e.y)
              fx.ring(e.x, e.y, { color: '#a78bfa', maxR: 50 })
            } else if (e.bossKind === 2) {
              for (const o of [-30, 0, 30]) w.spits.push({ x: e.x + o, y: e.y - e.r, vy: 150, dmg: 6 * hmDmg })
            } else if (e.bossKind === 0 && !e.atWall) {
              e.y += 18 * k
              fx.shake(5, 0.2)
              sfx.thud()
            }
          }
        }
        if (e.atWall) {
          if (e.kind === 'bomber') {
            e.dead = true
            fx.explode(e.x, e.y, 1.2)
            sfx.boom(0.5)
            if (!w.demo && w.invuln <= 0) {
              w.bar -= 16 * hmDmg
              w.barShake = 8
              fx.flash('#f97316', 0.2)
              haptic.heavy()
            }
            continue
          }
          if (!w.demo && w.invuln <= 0) {
            w.bar -= e.dps * hmDmg * dt
            wallHit = true
          }
        }
      }
      // separation so the horde doesn't stack
      const es = w.enemies
      for (let i = 0; i < es.length; i++) {
        for (let j = i + 1; j < es.length; j++) {
          const a = es[i]
          const b = es[j]
          if (a.kind === 'bat' || b.kind === 'bat') continue
          const dx = b.x - a.x
          const dy = b.y - a.y
          const min = (a.r + b.r) * 0.75
          if (Math.abs(dx) < min && Math.abs(dy) < min) {
            const d = Math.hypot(dx, dy) || 0.01
            if (d < min) {
              const push = ((min - d) / d) * 0.5
              a.x -= dx * push * 0.6
              b.x += dx * push * 0.6
              if (!a.atWall && !b.atWall) {
                if (a.y < b.y) a.y -= dy * push * 0.3
                else b.y -= dy * push * 0.3
              }
            }
          }
        }
      }
      if (wallHit) {
        w.barHitT -= raw
        w.barShake = Math.max(w.barShake, 2.5)
        if (w.barHitT <= 0) {
          w.barHitT = 0.55
          sfx.thud()
          haptic.light()
          fx.burst(rand(W * 0.2, W * 0.8), wallY, { count: 5, color: ['#d6c08f', '#92400e'], speed: 120, shape: 'square', angle: -Math.PI / 2, spread: 2, gravity: 500 })
        }
      }

      // guns on the firing line
      for (let i = 0; i < w.lineSlots; i++) {
        const g = w.slots[i]
        if (!g || g.pending) continue
        const s = slotXY(i)
        const gx = s.x + cs / 2
        const gy = s.y + cs / 2
        const tgt = frontEnemy(gx, gy)
        if (!tgt || tgt.y < hz - 10) {
          g.aim += (-Math.PI / 2 - g.aim) * Math.min(1, dt * 4)
          continue
        }
        const want = Math.atan2(tgt.y - tgt.r * 0.3 - gy, tgt.x - gx)
        g.aim += (want - g.aim) * Math.min(1, dt * 14)
        g.cd -= dt
        if (g.cd <= 0) {
          g.cd += 1 / GUNS[g.tier].rate
          if (g.cd < 0) g.cd = 0
          const len = cs * 0.46
          fire(g, gx + Math.cos(g.aim) * len, gy + Math.sin(g.aim) * len, tgt)
        }
      }

      // projectiles
      for (const p of w.projs) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.life -= dt
        if (p.shot === 'rocket' && Math.random() < 0.6) fx.burst(p.x, p.y, { count: 1, color: ['#a8a29e', '#78716c'], speed: 20, size: 4, life: 0.4, gravity: -20 })
        if (p.y < hz - 30 || p.x < -20 || p.x > W + 20) p.life = 0
        if (p.life <= 0) continue
        for (const e of w.enemies) {
          if (e.dead || p.hits.includes(e.id)) continue
          if (Math.abs(e.x - p.x) > e.r + 4 || Math.abs(e.y - e.r * 0.3 - p.y) > e.r + 4) continue
          if (p.splash > 0) {
            explodeAt(p.x, p.y, p.splash * k, p.dmg, p.shot === 'plasma' ? ['#f0abfc', '#d946ef', '#ffffff'] : undefined)
            if (!w.demo) sfx.boom(p.shot === 'plasma' ? 0.25 : 0.4)
          } else {
            hurt(e, p.dmg, p.shot)
            fx.burst(p.x, p.y, { count: 3, color: ['#bef264', '#fef08a'], speed: 90, size: 2, gravity: 200 })
          }
          p.hits.push(e.id)
          if (p.pierce-- <= 0) {
            p.life = 0
            break
          }
        }
      }
      w.projs = w.projs.filter((p) => p.life > 0)

      // spit blobs
      for (const s of w.spits) {
        s.y += s.vy * dt
        if (s.y >= wallY - 4) {
          s.vy = 0
          fx.burst(s.x, wallY - 4, { count: 8, color: ['#a3e635', '#65a30d'], speed: 110, gravity: 300 })
          if (!w.demo && w.invuln <= 0 && ph === 'play') {
            w.bar -= s.dmg
            w.barShake = 4
            sfx.hurt()
          }
        }
      }
      w.spits = w.spits.filter((s) => s.vy > 0)

      // grenades
      for (const n of w.nades) {
        n.t += dt
        if (n.t >= n.dur) {
          explodeAt(n.x1, n.y1, 80 * k, n.dmg, ['#fde047', '#fb923c', '#ffffff', '#ef4444'])
          fx.stop(0.06)
          fx.shake(10, 0.3)
          sfx.boom(0.8)
          haptic.heavy()
        }
      }
      w.nades = w.nades.filter((n) => n.t < n.dur)

      w.enemies = w.enemies.filter((e) => !e.dead)
      if (ph === 'play' && w.bar <= 0) {
        w.bar = 0
        die()
      }
    }

    // beams fade
    for (const b of w.beams) b.life -= raw
    w.beams = w.beams.filter((b) => b.life > 0)

    // cash coins fly to the HUD
    const tx = W - 46
    const ty = 22
    for (const c of w.coins) {
      c.t += raw
      if (c.t < 0.35) {
        c.vy += 600 * raw
        c.x += c.vx * raw
        c.y += c.vy * raw
      } else {
        const kk = Math.min(1, raw * 9)
        c.x += (tx - c.x) * kk
        c.y += (ty - c.y) * kk
      }
    }
    const before = w.coins.length
    w.coins = w.coins.filter((c) => !(c.t > 0.35 && Math.hypot(c.x - tx, c.y - ty) < 14))
    if (w.coins.length < before && ph === 'play') {
      pushHud()
      if (Math.random() < 0.4) sfx.tick()
    }

    if (w.combo > 0 && w.clock - w.lastMerge > 1.8) {
      w.combo = 0
      if (ph === 'play') pushHud()
    }
    if (ph === 'play' && Math.floor(w.clock * 6) !== Math.floor((w.clock - dt) * 6)) pushHud()
  }

  // ── Drawing ─────────────────────────────────────────

  function drawGunAt(ctx: CanvasRenderingContext2D, tier: number, x: number, y: number, size: number, ang: number, recoil = 0, flash = 0) {
    ctx.save()
    ctx.translate(x - Math.cos(ang) * recoil * size * 0.08, y - Math.sin(ang) * recoil * size * 0.08)
    ctx.rotate(ang)
    // flip when pointing left so the gun is never upside-down
    if (Math.cos(ang) < -0.01) ctx.scale(1, -1)
    ctx.drawImage(gunSprite(tier, size), -size / 2, -size * 0.43, size, size)
    if (flash > 0) {
      const mx = size * 0.47
      const my = -size * 0.01
      ctx.globalAlpha = flash
      ctx.fillStyle = GUNS[tier].shot === 'beam' || GUNS[tier].shot === 'rail' ? GUNS[tier].color : '#fde047'
      ctx.beginPath()
      ctx.moveTo(mx, my - size * 0.08)
      ctx.lineTo(mx + size * 0.28, my)
      ctx.lineTo(mx, my + size * 0.08)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(mx + size * 0.04, my, size * 0.05, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    ctx.restore()
  }

  function drawSlot(ctx: CanvasRenderingContext2D, x: number, y: number, cs: number, line: boolean, locked: boolean) {
    ctx.fillStyle = line ? 'rgba(68,64,60,0.95)' : 'rgba(41,37,36,0.95)'
    ctx.beginPath()
    ctx.roundRect(x + 3, y + 3, cs - 6, cs - 6, 10)
    ctx.fill()
    ctx.strokeStyle = line ? 'rgba(250,204,21,0.35)' : 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.beginPath()
    ctx.roundRect(x + 5, y + cs * 0.62, cs - 10, cs * 0.3, 8)
    ctx.fill()
    if (locked) {
      const cx = x + cs / 2
      const cy = y + cs / 2
      ctx.strokeStyle = '#a8a29e'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy - 4, 7, Math.PI, 0)
      ctx.stroke()
      ctx.fillStyle = '#a8a29e'
      ctx.beginPath()
      ctx.roundRect(cx - 10, cy - 4, 20, 15, 3)
      ctx.fill()
      ctx.fillStyle = '#44403c'
      ctx.fillRect(cx - 1.5, cy + 1, 3, 6)
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const ph = phaseRef.current
    const dt = fx.step(raw)
    const G = geo()
    const { cs, gx, gridY, lineY, fieldH, wallY, hz } = G

    if (ph === 'idle' && w.demo && !w.slots.some(Boolean)) {
      ;[3, 7, 9].forEach((tier, i) => (w.slots[i] = newGun(tier)))
      ;[0, 1, 2, 4, 5].forEach((tier, i) => (w.slots[LINE + i * 2] = newGun(tier)))
      w.wave = 1
      w.breakT = 0.5
      w.cash = 0
    }
    update(dt, raw)

    const pal = Math.floor(Math.max(0, w.wave - 1) / 10) % PALETTES.length
    ctx.drawImage(fieldSprite(pal, W, fieldH), 0, 0, W, fieldH)
    // HUD contrast band
    const band = ctx.createLinearGradient(0, 0, 0, 70)
    band.addColorStop(0, 'rgba(0,0,0,0.5)')
    band.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = band
    ctx.fillRect(0, 0, W, 70)

    fx.applyShake(ctx)
    // supply crate
    if (w.crate) {
      const c = w.crate
      const sw = Math.sin(c.t * 1.6) * 0.15
      ctx.save()
      ctx.translate(c.x, c.y)
      ctx.rotate(sw)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(-12, -6)
      ctx.lineTo(-26, -34)
      ctx.moveTo(12, -6)
      ctx.lineTo(26, -34)
      ctx.stroke()
      const pg = ctx.createLinearGradient(0, -56, 0, -30)
      pg.addColorStop(0, '#f8fafc')
      pg.addColorStop(1, '#94a3b8')
      ctx.fillStyle = pg
      ctx.beginPath()
      ctx.moveTo(-30, -32)
      ctx.quadraticCurveTo(0, -66, 30, -32)
      ctx.quadraticCurveTo(15, -38, 0, -32)
      ctx.quadraticCurveTo(-15, -38, -30, -32)
      ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.moveTo(-8, -50)
      ctx.quadraticCurveTo(0, -54, 8, -50)
      ctx.lineTo(4, -34)
      ctx.lineTo(-4, -34)
      ctx.closePath()
      ctx.fill()
      glow(ctx, 0, 0, 34, '#fde047', 0.35 + Math.sin(t * 8) * 0.15)
      const cg = ctx.createLinearGradient(0, -12, 0, 12)
      cg.addColorStop(0, '#d97706')
      cg.addColorStop(1, '#78350f')
      ctx.fillStyle = cg
      ctx.strokeStyle = '#1c0a02'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(-14, -12, 28, 24, 3)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = '#fde047'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(-14, -12)
      ctx.lineTo(14, 12)
      ctx.moveTo(14, -12)
      ctx.lineTo(-14, 12)
      ctx.stroke()
      ctx.restore()
    }

    // enemies, back to front
    w.enemies.sort((a, b) => a.y - b.y)
    for (const e of w.enemies) {
      const sc = 0.62 + 0.4 * clamp((e.y - hz) / (wallY - hz), 0, 1)
      const r = e.r * sc
      if (e.kind === 'boss') glow(ctx, e.x, e.y - r * 0.3, r * 2.2, '#dc2626', 0.25 + Math.sin(t * 4) * 0.08)
      drawZombie(ctx, e.kind, e.x, e.y - r * 0.4, r, e.t, e.flash, e.variant)
      if (e.hp < e.max && e.kind !== 'boss') {
        const bw = r * 1.6
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.fillRect(e.x - bw / 2, e.y - r * 1.75, bw, 4)
        ctx.fillStyle = e.hp / e.max > 0.5 ? '#4ade80' : e.hp / e.max > 0.25 ? '#facc15' : '#ef4444'
        ctx.fillRect(e.x - bw / 2, e.y - r * 1.75, bw * clamp(e.hp / e.max, 0, 1), 4)
      }
    }
    for (const s of w.spits) {
      ctx.fillStyle = '#a3e635'
      ctx.beginPath()
      ctx.ellipse(s.x, s.y, 5, 7, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.beginPath()
      ctx.arc(s.x - 1.5, s.y - 2, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }

    drawBarricade(ctx, W, wallY, w.bar / w.barMax, w.barShake)
    if (w.invuln > 0 && ph === 'play') {
      ctx.globalAlpha = 0.35 + Math.sin(t * 14) * 0.2
      ctx.fillStyle = '#7dd3fc'
      ctx.fillRect(0, wallY - 34, W, 6)
      ctx.globalAlpha = 1
    }

    // projectiles + beams
    ctx.lineCap = 'round'
    for (const p of w.projs) {
      if (p.shot === 'rocket') {
        const a = Math.atan2(p.vy, p.vx)
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(a)
        glow(ctx, -8, 0, 10, '#f97316', 0.7)
        ctx.fillStyle = '#4d7c0f'
        ctx.fillRect(-8, -3, 12, 6)
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.moveTo(4, -3)
        ctx.lineTo(9, 0)
        ctx.lineTo(4, 3)
        ctx.fill()
        ctx.restore()
      } else if (p.shot === 'plasma') {
        glow(ctx, p.x, p.y, 14, '#e879f9', 0.9)
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const len = p.shot === 'pellet' ? 0.012 : 0.022
        ctx.strokeStyle = p.color
        ctx.lineWidth = p.shot === 'pellet' ? 2.2 : 2.6
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - p.vx * len, p.y - p.vy * len)
        ctx.stroke()
      }
    }
    for (const b of w.beams) {
      const a = b.life / b.max
      ctx.globalAlpha = a
      ctx.strokeStyle = b.color
      ctx.lineWidth = b.width * (0.6 + a * 0.6)
      ctx.beginPath()
      ctx.moveTo(b.x0, b.y0)
      ctx.lineTo(b.x1, b.y1)
      ctx.stroke()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = b.width * 0.35
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    for (const n of w.nades) {
      const q = n.t / n.dur
      const x = n.x0 + (n.x1 - n.x0) * q
      const y = n.y0 + (n.y1 - n.y0) * q - Math.sin(q * Math.PI) * 90
      ctx.fillStyle = '#3f6212'
      ctx.strokeStyle = '#0b0f19'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(x, y, 6, 7, q * 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#fde047'
      ctx.fillRect(x - 1, y - 9, 2, 3)
    }

    // arsenal panel
    const pg = ctx.createLinearGradient(0, fieldH, 0, H)
    pg.addColorStop(0, '#292524')
    pg.addColorStop(1, '#0c0a09')
    ctx.fillStyle = pg
    ctx.fillRect(-10, fieldH, W + 20, H - fieldH + 10)
    ctx.fillStyle = 'rgba(250,204,21,0.8)'
    for (let x = -10; x < W + 10; x += 22) {
      ctx.beginPath()
      ctx.moveTo(x, fieldH)
      ctx.lineTo(x + 11, fieldH)
      ctx.lineTo(x + 5, fieldH + 5)
      ctx.lineTo(x - 6, fieldH + 5)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fillRect(gx - 6, gridY - 4, cs * GC + 12, cs * GR + 8)
    for (let i = 0; i < SLOTS; i++) {
      const s = slotXY(i)
      drawSlot(ctx, s.x, s.y, cs, i < LINE, i < LINE && i >= w.lineSlots)
    }
    // barricade HP bar along the firing line
    if (ph !== 'idle') {
      const bw = cs * GC
      const kk = clamp(w.bar / w.barMax, 0, 1)
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.beginPath()
      ctx.roundRect(gx, lineY - 9, bw, 6, 3)
      ctx.fill()
      ctx.fillStyle = kk > 0.5 ? '#4ade80' : kk > 0.25 ? '#facc15' : '#ef4444'
      ctx.beginPath()
      ctx.roundRect(gx, lineY - 9, Math.max(6, bw * kk), 6, 3)
      ctx.fill()
      if (kk < 0.25 && Math.sin(t * 10) > 0) {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }

    const d = drag.current
    // matching guns glow while dragging, or as a hint for new players
    const dragTier = d && d.moved ? w.slots[d.idx]?.tier ?? -1 : -1
    let hintTier = -1
    if (ph === 'play' && w.stats.merges === 0 && dragTier < 0) {
      const counts = new Map<number, number>()
      for (const g of w.slots) if (g) counts.set(g.tier, (counts.get(g.tier) ?? 0) + 1)
      for (const [tier, c] of counts) if (c >= 2) hintTier = tier
    }
    for (let i = 0; i < SLOTS; i++) {
      const g = w.slots[i]
      if (!g || (d && d.moved && d.idx === i)) continue
      const s = slotXY(i)
      if ((dragTier >= 0 && g.tier === dragTier && g.tier < MAX_TIER) || g.tier === hintTier) glow(ctx, s.x + cs / 2, s.y + cs / 2, cs * 0.7, '#fde047', 0.35 + Math.sin(t * 8) * 0.15)
      if (g.tier >= 6) glow(ctx, s.x + cs / 2, s.y + cs / 2, cs * 0.6, TIER_COLORS[g.tier], 0.2 + Math.sin(t * 3 + i) * 0.06)
      const pop = g.pop
      const sz = cs * (0.92 + pop * 0.3 - (pop > 0.75 ? (pop - 0.75) * 0.8 : 0))
      if (i < LINE) drawGunAt(ctx, g.tier, s.x + cs / 2, s.y + cs / 2, sz, g.aim, g.recoil, g.flash)
      else drawGunAt(ctx, g.tier, s.x + cs / 2, s.y + cs / 2 + Math.sin(t * 2 + i) * 1.2, sz, -0.35)
      // tier badge
      ctx.fillStyle = TIER_COLORS[g.tier]
      ctx.beginPath()
      ctx.arc(s.x + 12, s.y + 12, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0b0f19'
      ctx.font = `900 10px ${FONT}`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(g.tier + 1), s.x + 12, s.y + 12.5)
    }
    // drop target highlight
    if (d && d.moved) {
      const src = w.slots[d.idx]
      const dst = slotAt(d.x, d.y)
      if (src && dst >= 0 && dst !== d.idx) {
        const tgt = w.slots[dst]
        const locked = dst < LINE && dst >= w.lineSlots
        const s = slotXY(dst)
        ctx.strokeStyle = locked ? '#ef4444' : tgt && tgt.tier === src.tier ? '#fde047' : '#ffffff'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(s.x + 3, s.y + 3, cs - 6, cs - 6, 10)
        ctx.stroke()
      }
    }
    for (const a of w.anims) {
      const s = slotXY(a.dst)
      const q = Math.min(1, a.t / 0.12)
      const x = a.x0 + (s.x + cs / 2 - a.x0) * q
      const y = a.y0 + (s.y + cs / 2 - a.y0) * q
      drawGunAt(ctx, a.tier, x, y, cs * (1.05 - q * 0.2), -0.35)
    }
    if (d && d.moved) {
      const g = w.slots[d.idx]
      if (g) {
        ctx.globalAlpha = 0.3
        ctx.fillStyle = '#000'
        ctx.beginPath()
        ctx.ellipse(d.x + 4, d.y + cs * 0.1, cs * 0.35, cs * 0.1, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        drawGunAt(ctx, g.tier, d.x, d.y - cs * 0.2, cs * 1.1, -0.35 + Math.sin(t * 12) * 0.05)
      }
    }
    fx.draw(ctx)
    ctx.restore()

    // bottom bar: buy / next tier / grenade
    if (ph !== 'idle') {
      const bt = buttons()
      const cost = buyCost()
      const can = w.cash >= cost
      const dragging = !!(d && d.moved)
      const overBuy = dragging && inRect(d!.x, d!.y, bt.buy)
      const bg = ctx.createLinearGradient(0, bt.buy.y, 0, bt.buy.y + bt.buy.h)
      bg.addColorStop(0, dragging ? (overBuy ? '#f87171' : '#b91c1c') : can ? '#4ade80' : '#57534e')
      bg.addColorStop(1, dragging ? '#7f1d1d' : can ? '#15803d' : '#292524')
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.roundRect(bt.buy.x, bt.buy.y, bt.buy.w, bt.buy.h, 14)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#fff'
      if (dragging) {
        const g = w.slots[d!.idx]
        ctx.font = `900 14px ${FONT}`
        ctx.fillText('SELL', bt.buy.x + 12, bt.buy.y + bt.buy.h * 0.36)
        ctx.font = `800 12px ${FONT}`
        ctx.fillText(g ? `+$${fmt(sellValue(g.tier))}` : '', bt.buy.x + 12, bt.buy.y + bt.buy.h * 0.68)
      } else {
        const st = shopTier()
        ctx.drawImage(gunSprite(st, bt.buy.h * 0.9), bt.buy.x + 2, bt.buy.y + bt.buy.h * 0.06, bt.buy.h * 0.9, bt.buy.h * 0.9)
        ctx.font = `900 13px ${FONT}`
        ctx.fillText('BUY', bt.buy.x + bt.buy.h * 0.92, bt.buy.y + bt.buy.h * 0.34)
        ctx.font = `800 13px ${FONT}`
        ctx.fillStyle = can ? '#fef9c3' : '#d6d3d1'
        ctx.fillText(`$${fmt(cost)}`, bt.buy.x + bt.buy.h * 0.92, bt.buy.y + bt.buy.h * 0.68)
      }
      // next tier goal
      const nx = bt.next
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      ctx.beginPath()
      ctx.roundRect(nx.x, nx.y, nx.w, nx.h, 12)
      ctx.fill()
      const nt = Math.min(MAX_TIER, w.best + 1)
      const done = w.best >= MAX_TIER
      ctx.globalAlpha = done ? 1 : 0.85
      ctx.drawImage(gunSprite(nt, nx.h * 0.8), nx.x + 2, nx.y + nx.h * 0.1, nx.h * 0.8, nx.h * 0.8)
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = `800 9px ${FONT}`
      ctx.fillText(done ? 'MAXED' : 'NEXT', nx.x + nx.h * 0.82, nx.y + nx.h * 0.32)
      ctx.fillStyle = TIER_COLORS[nt]
      ctx.font = `900 11px ${FONT}`
      const nm = GUN_NAMES[nt]
      ctx.fillText(nm.length > 10 ? nm.split(' ')[0] : nm, nx.x + nx.h * 0.82, nx.y + nx.h * 0.62)
      // grenade
      const gb = bt.nade
      const has = w.grenades > 0
      const gg = ctx.createLinearGradient(0, gb.y, 0, gb.y + gb.h)
      gg.addColorStop(0, has ? '#f97316' : '#57534e')
      gg.addColorStop(1, has ? '#9a3412' : '#292524')
      ctx.fillStyle = gg
      ctx.beginPath()
      ctx.roundRect(gb.x, gb.y, gb.w, gb.h, 14)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.stroke()
      const gx2 = gb.x + gb.w * 0.36
      const gy2 = gb.y + gb.h * 0.55
      ctx.fillStyle = '#3f6212'
      ctx.strokeStyle = '#0b0f19'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.ellipse(gx2, gy2, 9, 11, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#a8a29e'
      ctx.fillRect(gx2 - 4, gy2 - 15, 8, 5)
      ctx.strokeStyle = '#d6d3d1'
      ctx.beginPath()
      ctx.arc(gx2 + 6, gy2 - 13, 4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = `900 15px ${FONT}`
      ctx.textAlign = 'center'
      ctx.fillText(`${w.grenades}`, gb.x + gb.w * 0.76, gy2)
      // wave progress
      if (w.waveTotal > 0 && w.wave > 0) {
        const pw = W * 0.34
        const px = (W - pw) / 2
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.beginPath()
        ctx.roundRect(px, 10, pw, 5, 3)
        ctx.fill()
        ctx.fillStyle = '#f87171'
        ctx.beginPath()
        ctx.roundRect(px, 10, Math.max(5, pw * clamp(w.waveKills / w.waveTotal, 0, 1)), 5, 3)
        ctx.fill()
      }
    }
    // flying cash
    for (const c of w.coins) {
      ctx.fillStyle = '#16a34a'
      ctx.strokeStyle = '#052e16'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(c.x - 6, c.y - 3.5, 12, 7, 1.5)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#bbf7d0'
      ctx.beginPath()
      ctx.arc(c.x, c.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const won = hud.wave >= 6
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena gunmerge-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud gunmerge-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Wave {hud.wave}</div>
              </div>
              <div className="action-hud__right">
                <span className="gunmerge-cash">${fmt(hud.cash)}</span>
                {hud.combo > 1 ? <span className="gunmerge-combo">x{hud.combo}</span> : null}
              </div>
            </div>
          )}
          {phase === 'play' && hud.boss >= 0 ? (
            <div className="gunmerge-bossbar">
              {hud.bossName}
              <div>
                <span style={{ width: `${Math.max(0, hud.boss) * 100}%` }} />
              </div>
            </div>
          ) : null}
          {banner && phase === 'play' ? (
            <div className="action-banner gunmerge-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="gunmerge"
              icon={meta.icon}
              title={meta.title}
              hint="Drag matching guns together to merge them. Guns on the firing line shoot the horde — don't let the barricade fall."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Line held!' : 'Overrun!'}
            subtitle={`Score ${hud.score} · Wave ${hud.wave}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
