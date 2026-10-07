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
import { drawDefender, drawMonster, drawMower, drawOrb, type DefKind, type MonKind } from './art'
import '../../shared/action/action.css'
import { AUTHORED, authoredLevel, type LevelDef, type Spawn } from './levels'
import './lanedefense.css'

const meta = getGame('lanedefense')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type Def = { id: number; kind: DefKind; lane: number; row: number; hp: number; max: number; cd: number; act: number; hit: number; fuse: number; born: number }
type Mon = { id: number; kind: MonKind; lane: number; y: number; hp: number; max: number; speed: number; bite: number; slow: number; hit: number; eating: boolean; jumped: boolean; jumpT: number; windup: number; step: number; dead: number; value: number }
type Shot = { id: number; lane: number; y: number; dmg: number; ice: boolean }
type Orb = { id: number; x: number; y: number; ty: number; life: number; value: number; pick: number }
type Mower = { state: 'ready' | 'go' | 'used'; y: number }

const LANES = 5
const ROWS = 7
const WAVES_PER_LEVEL = 5

const DEFS: Record<DefKind, { cost: number; cd: number; hp: number; name: string }> = {
  pea: { cost: 100, cd: 5, hp: 300, name: 'Pea Pod' },
  bloom: { cost: 50, cd: 5, hp: 300, name: 'Glow Bloom' },
  nut: { cost: 50, cd: 18, hp: 2400, name: 'Rock Nut' },
  boom: { cost: 150, cd: 28, hp: 300, name: 'Boom Berry' },
  frost: { cost: 175, cd: 8, hp: 300, name: 'Frost Pod' },
}
const CARD_ORDER: DefKind[] = ['bloom', 'pea', 'nut', 'boom', 'frost']
/** Level at which each card unlocks. */
const UNLOCK: Record<DefKind, number> = { bloom: 1, pea: 1, nut: 2, boom: 3, frost: 4 }

const MONS: Record<MonKind, { hp: number; speed: number; bite: number; cost: number; value: number; from: number }> = {
  blob: { hp: 190, speed: 0.2, bite: 40, cost: 2, value: 10, from: 1 },
  cone: { hp: 520, speed: 0.2, bite: 40, cost: 4, value: 20, from: 3 },
  runner: { hp: 130, speed: 0.42, bite: 35, cost: 3, value: 15, from: 4 },
  hopper: { hp: 300, speed: 0.3, bite: 40, cost: 5, value: 25, from: 8 },
  brute: { hp: 1150, speed: 0.17, bite: 55, cost: 8, value: 40, from: 12 },
  boss: { hp: 3800, speed: 0.11, bite: 0, cost: 0, value: 300, from: 10 },
}

let uid = 1

type World = {
  level: number
  def: LevelDef | null
  stars: number
  runClears: number
  wave: number
  waveInLevel: number
  waveT: number
  spawns: Spawn[]
  spawnT: number
  defs: Def[]
  mons: Mon[]
  shots: Shot[]
  orbs: Orb[]
  mowers: Mower[]
  energy: number
  cds: Record<DefKind, number>
  sel: DefKind | 'shovel' | null
  drag: { x: number; y: number } | null
  skyT: number
  zaps: number
  score: number
  coins: number
  clearT: number
  lastWaveDone: boolean
  idleT: number
  stats: { score: number; level: number; wave: number; kills: number; bosses: number }
}

function freshWorld(): World {
  return {
    level: 1,
    def: null,
    stars: 0,
    runClears: 0,
    wave: 0,
    waveInLevel: 0,
    waveT: 18,
    spawns: [],
    spawnT: 0,
    defs: [],
    mons: [],
    shots: [],
    orbs: [],
    mowers: Array.from({ length: LANES }, () => ({ state: 'ready' as const, y: 0 })),
    energy: 75,
    cds: { pea: 0, bloom: 0, nut: 0, boom: 0, frost: 0 },
    sel: null,
    drag: null,
    skyT: 5,
    zaps: 1,
    score: 0,
    coins: 0,
    clearT: 0,
    lastWaveDone: false,
    idleT: 0,
    stats: { score: 0, level: 1, wave: 0, kills: 0, bosses: 0 },
  }
}

function isHard(level: number) {
  return level >= 5 && level % 5 === 0
}

/** Budgeted wave builder (levels beyond the authored set): wave k of the campaign; the last wave of a level is huge. */
function buildWave(k: number, level: number, big: boolean, boss: boolean): Spawn[] {
  let budget = Math.round((3 + k * 2.2) * (big ? 1.7 : 1) * (isHard(level) ? 1.25 : 1))
  if (level === 1) budget = Math.min(budget, 2 + k * 2)
  const kinds = (Object.keys(MONS) as MonKind[]).filter((m) => m !== 'boss' && MONS[m].from <= k)
  const out: Spawn[] = []
  const dur = big ? 10 : 16
  while (budget > 0 && out.length < 40) {
    const options = kinds.filter((m) => MONS[m].cost <= budget)
    if (!options.length) break
    // later waves favour tougher kinds
    const m = options[Math.floor(Math.pow(Math.random(), Math.max(0.5, 1.6 - k * 0.04)) * options.length)]
    budget -= MONS[m].cost
    out.push({ kind: m, lane: Math.floor(Math.random() * LANES), at: Math.random() * dur })
  }
  if (boss) out.push({ kind: 'boss', lane: 2, at: dur * 0.4 })
  out.sort((a, b) => a.at - b.at)
  return out
}

const ShovelIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 4l6 6M17 7l-7 7M7 13l4 4-3 3c-1.5 1.5-4 1.5-5 0s-1.5-3.5 0-5z" />
  </svg>
)
const ZapIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2L4 14h6l-1 8 9-12h-6z" />
  </svg>
)

export default function LaneDefenseGame() {
  const run = useActionRun('lanedefense')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const pointer = useRef<number | null>(null)
  const lastEvent = useRef(0)
  const devAuto = useRef(false)
  const devSpeed = useRef(1)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, wave: 0, hard: false, zaps: 0, shovel: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.level, wave: w.wave, hard: isHard(w.level), zaps: w.zaps, shovel: w.sel === 'shovel' })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const top = 96
    const cardH = 74
    const mowH = 30
    const gridBottom = H - cardH - mowH - 6
    const rh = (gridBottom - top) / ROWS
    const cw = (W - 12) / LANES
    const gx = 6
    return { W, H, top, rh, cw, gx, gridBottom, mowY: gridBottom + mowH / 2 + 2, cardY: H - cardH, cardH, s: Math.min(cw, rh * 1.15) }
  }

  function tileXY(lane: number, row: number) {
    const { gx, cw, top, rh } = geo()
    return { x: gx + (lane + 0.5) * cw, y: top + (row + 0.5) * rh }
  }

  function cardRect(i: number) {
    const { W, cardY, cardH } = geo()
    const ex = 64
    const cwid = (W - ex - 14) / CARD_ORDER.length
    return { x: ex + 8 + i * cwid, y: cardY + 6, w: cwid - 5, h: cardH - 12 }
  }

  // ── Level / waves ─────────────────────────────
  function startLevel(n: number) {
    const w = world.current
    w.level = n
    w.def = n <= AUTHORED.length ? authoredLevel(n) : null
    w.waveInLevel = 0
    w.waveT = n === 1 ? 20 : 15
    w.spawns = []
    w.defs = []
    w.mons = []
    w.shots = []
    w.orbs = []
    w.mowers = Array.from({ length: LANES }, () => ({ state: 'ready' as const, y: 0 }))
    w.energy = 75 + run.level('energy') * 25 + (n > 1 ? 75 : 0)
    w.cds = { pea: 0, bloom: 0, nut: 0, boom: 0, frost: 0 }
    w.sel = null
    w.skyT = 4
    w.lastWaveDone = false
    w.stats.level = n
    const unlocked = CARD_ORDER.find((k) => UNLOCK[k] === n && n > 1)
    const tips: Record<number, string> = { 1: 'tap a card, then a tile', 2: 'Rock Nut blocks the way', 3: 'Boom Berry blasts a 3×3 area', 4: 'Frost Pod slows monsters' }
    if (phaseRef.current !== 'idle') {
      const name = w.def?.name ? `${w.def.name} · ` : ''
      setBanner({ key: Date.now(), text: isHard(n) ? `LEVEL ${n} · BOSS` : `LEVEL ${n}`, sub: `${name}${w.def?.tip ?? tips[n] ?? (unlocked ? `new: ${DEFS[unlocked].name}` : `${WAVES_PER_LEVEL} waves · tap energy orbs`)}` })
      if (isHard(n)) sfx.boom(0.3)
      else sfx.ready()
      run.update(w.stats)
    }
    pushHud()
  }

  function nextWave() {
    const w = world.current
    w.wave += 1
    w.waveInLevel += 1
    const k = w.wave
    const last = w.waveInLevel === WAVES_PER_LEVEL
    w.spawns = w.def ? w.def.waves[w.waveInLevel - 1].map((sp) => ({ ...sp })) : buildWave((w.level - 1) * WAVES_PER_LEVEL + w.waveInLevel, w.level, last, last && isHard(w.level))
    w.spawnT = 0
    w.waveT = last ? 28 : 19
    if (phaseRef.current !== 'play') return
    if (w.spawns.some((sp) => sp.kind === 'boss')) {
      setBanner({ key: Date.now(), text: 'BOSS WAVE!', sub: 'the Giant approaches' })
      sfx.boom(0.6)
      fx.shake(6, 0.4)
    } else if (last) {
      setBanner({ key: Date.now(), text: 'FINAL WAVE!', sub: `wave ${k}` })
      sfx.boom(0.4)
      fx.shake(4, 0.3)
    } else {
      setBanner({ key: Date.now(), text: `WAVE ${k}`, sub: w.waveInLevel === 1 ? 'here they come' : undefined })
      sfx.ready()
    }
    haptic.medium()
    pushHud()
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.zaps = 1 + (run.level('energy') >= 3 ? 1 : 0)
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    startLevel(Math.max(1, level))
  }

  function levelClear() {
    const w = world.current
    // Stars by lawn mowers left untouched: all 5 = 3, 3–4 = 2, fewer = 1.
    const spent = w.mowers.filter((m) => m.state !== 'ready').length
    const stars = spent === 0 ? 3 : spent <= 2 ? 2 : 1
    w.stars = stars
    w.runClears += 1
    run.completeLevel(w.level, stars)
    const bonus = 200 + w.level * 50 + (isHard(w.level) ? 300 : 0)
    w.score += bonus
    w.stats.score = w.score
    const gain = 4 + Math.floor(w.level / 2) + (isHard(w.level) ? 4 : 0)
    w.coins += gain
    w.clearT = 2.4
    w.sel = null
    if (w.level % 2 === 0) w.zaps += 1
    setPhaseBoth('clear')
    const { W, H } = geo()
    for (let i = 0; i < 5; i++) fx.burst(rand(W * 0.15, W * 0.85), rand(H * 0.25, H * 0.45), { count: 18, color: ['#fde047', '#f472b6', '#60a5fa', '#4ade80', '#ffffff'], speed: 320, shape: 'square', size: 5, gravity: 380, life: 1.1 })
    fx.flash('#fef9c3', 0.18)
    sfx.win()
    haptic.success()
    setBanner({ key: Date.now(), text: `LEVEL ${w.level} CLEAR!`, sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)} · +${bonus} · +${gain} coins${w.level % 2 === 0 ? ' · +1 zap' : ''}` })
    if (w.level % 2 === 0 && performance.now() - lastEvent.current > 30000) {
      lastEvent.current = performance.now()
      void trackEvent('action_milestone', { game_id: 'lanedefense', kind: 'level', value: w.level })
    }
    run.update(w.stats)
    pushHud()
  }

  // ── Actions ───────────────────────────────────
  function plant(kind: DefKind, lane: number, row: number) {
    const w = world.current
    const d = DEFS[kind]
    if (w.energy < d.cost || w.cds[kind] > 0 || w.defs.some((o) => o.lane === lane && o.row === row)) return false
    w.energy -= d.cost
    w.cds[kind] = phaseRef.current === 'idle' ? 0 : d.cd
    w.defs.push({ id: uid++, kind, lane, row, hp: d.hp, max: d.hp, cd: kind === 'bloom' ? 6 : kind === 'boom' ? 0.9 : 0.6, act: 0, hit: 0, fuse: kind === 'boom' ? 0.9 : 0, born: 1 })
    const p = tileXY(lane, row)
    fx.burst(p.x, p.y + 10, { count: 10, color: ['#86efac', '#a16207', '#fde68a'], speed: 140, gravity: 300, size: 3 })
    if (phaseRef.current === 'play') {
      sfx.thud()
      haptic.light()
    }
    return true
  }

  function collectOrb(o: Orb) {
    const w = world.current
    if (o.pick > 0) return
    o.pick = 0.001
    w.energy += o.value
    if (phaseRef.current === 'play') {
      sfx.pop()
      haptic.light()
    }
  }

  function zap() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.zaps <= 0) return
    w.zaps -= 1
    const { W } = geo()
    for (const m of w.mons) {
      if (m.dead) continue
      const p = tileXY(m.lane, m.y)
      damage(m, m.kind === 'boss' ? 900 : 600)
      fx.burst(p.x, p.y, { count: 10, color: ['#fde047', '#ffffff', '#93c5fd'], speed: 220, shape: 'spark', gravity: 0 })
    }
    fx.flash('#fef08a', 0.3)
    fx.shake(8, 0.35)
    fx.text(W / 2, geo().top + 120, 'ZAP!', '#fde047', 30)
    sfx.boom(0.7)
    haptic.heavy()
    pushHud()
  }

  function damage(m: Mon, dmg: number, ice = false) {
    const w = world.current
    if (m.dead) return
    m.hp -= dmg * (1 + run.level('power') * 0.1)
    m.hit = 0.1
    if (ice) m.slow = 3
    if (m.hp <= 0) {
      m.dead = 0.001
      const p = tileXY(m.lane, m.y)
      fx.burst(p.x, p.y, { count: m.kind === 'boss' ? 50 : 14, color: ['#c4b5fd', '#8b5cf6', '#ffffff', '#fde047'], speed: m.kind === 'boss' ? 380 : 220, gravity: 300, size: 3.5 })
      fx.ring(p.x, p.y, { color: '#e9d5ff', maxR: m.kind === 'boss' ? 90 : 30, life: 0.35 })
      if (phaseRef.current === 'play') {
        w.score += MONS[m.kind].value
        w.stats.kills += 1
        w.stats.score = w.score
        if (m.kind === 'boss') {
          w.stats.bosses += 1
          fx.explode(p.x, p.y, 2.2)
          fx.slowmo(0.8, 0.3)
          fx.stop(0.12)
          sfx.boom(1)
          sfx.win()
          haptic.heavy()
          setBanner({ key: Date.now(), text: 'GIANT DOWN!', sub: `+${MONS.boss.value}` })
          void trackEvent('action_milestone', { game_id: 'lanedefense', kind: 'boss', value: w.stats.bosses })
        } else {
          sfx.pop()
          fx.text(p.x, p.y - 20, `+${MONS[m.kind].value}`, '#fde68a', 13)
        }
        run.update(w.stats)
        pushHud()
      }
    }
  }

  // ── Fail / revive ─────────────────────────────
  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    w.sel = null
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.5)
    fx.slowmo(1, 0.3)
    fx.stop(0.12)
    sfx.lose()
    haptic.error()
    const { W, gridBottom } = geo()
    fx.text(W / 2, gridBottom - 40, 'THEY BROKE THROUGH!', '#fecaca', 22)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.coins + w.stats.wave * 1.2 + w.stats.kills / 20) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.runClears > 0 && w.level >= 3, stats: { ...w.stats }, coins }, revive)
      pushHud()
    }, 1100)
  }

  /** Revive: fresh lawn mowers, the bottom half of the lawn is blasted clear, +150 energy. */
  function revive() {
    const w = world.current
    w.mowers = Array.from({ length: LANES }, () => ({ state: 'ready' as const, y: 0 }))
    for (const m of w.mons) {
      if (m.dead || m.y < ROWS * 0.45) continue
      const p = tileXY(m.lane, m.y)
      fx.explode(p.x, p.y, 0.8)
      m.hp = 0
      m.dead = 0.001
    }
    w.energy += 150
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'mowers restored · +150 energy' })
    setPhaseBoth('play')
    pushHud()
  }

  // ── Input ─────────────────────────────────────
  function tileAt(x: number, y: number) {
    const { gx, cw, top, rh } = geo()
    const lane = Math.floor((x - gx) / cw)
    const row = Math.floor((y - top) / rh)
    if (lane < 0 || lane >= LANES || row < 0 || row >= ROWS) return null
    return { lane, row }
  }

  function cardAt(x: number, y: number) {
    for (let i = 0; i < CARD_ORDER.length; i++) {
      const r = cardRect(i)
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return CARD_ORDER[i]
    }
    return null
  }

  function tryPlace(x: number, y: number) {
    const w = world.current
    const t = tileAt(x, y)
    if (!t || !w.sel) return false
    if (w.sel === 'shovel') {
      const d = w.defs.find((o) => o.lane === t.lane && o.row === t.row)
      if (!d) return false
      w.defs = w.defs.filter((o) => o !== d)
      w.energy += Math.floor(DEFS[d.kind].cost * 0.5)
      const p = tileXY(t.lane, t.row)
      fx.burst(p.x, p.y, { count: 12, color: ['#a16207', '#86efac'], speed: 160, gravity: 400 })
      sfx.move()
      w.sel = null
      pushHud()
      return true
    }
    const ok = plant(w.sel, t.lane, t.row)
    if (ok) {
      w.sel = null
      pushHud()
    } else {
      sfx.miss()
    }
    return ok
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    // orbs first
    for (const o of w.orbs) {
      if (o.pick > 0) continue
      if (Math.hypot(o.x - p.x, o.y - p.y) < 30) {
        collectOrb(o)
        return
      }
    }
    const c = cardAt(p.x, p.y)
    if (c) {
      if (UNLOCK[c] > w.level) {
        sfx.miss()
        return
      }
      if (w.energy < DEFS[c].cost || w.cds[c] > 0) {
        sfx.miss()
        fx.text(p.x, p.y - 30, w.cds[c] > 0 ? 'RECHARGING' : 'NEED ENERGY', '#fecaca', 12)
        return
      }
      w.sel = w.sel === c ? null : c
      e.currentTarget.setPointerCapture(e.pointerId)
      pointer.current = e.pointerId
      w.drag = { x: p.x, y: p.y }
      sfx.tap()
      pushHud()
      return
    }
    if (w.sel) tryPlace(p.x, p.y)
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId) return
    const w = world.current
    const p = localPoint(e, e.currentTarget)
    if (w.drag) {
      w.drag.x = p.x
      w.drag.y = p.y
    }
  }

  function onUp(e: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== e.pointerId) return
    pointer.current = null
    const w = world.current
    const p = localPoint(e, e.currentTarget)
    w.drag = null
    if (phaseRef.current === 'play' && w.sel && tileAt(p.x, p.y)) tryPlace(p.x, p.y)
  }

  function toggleShovel() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    w.sel = w.sel === 'shovel' ? null : 'shovel'
    sfx.tap()
    pushHud()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const n = Number(e.key)
      if (n >= 1 && n <= 5) {
        const w = world.current
        const k = CARD_ORDER[n - 1]
        if (UNLOCK[k] <= w.level) w.sel = w.sel === k ? null : k
        pushHud()
      } else if (e.key === 'z') zap()
      else if (e.key === 'x') toggleShovel()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Simulation ────────────────────────────────
  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    const live = ph === 'play' || ph === 'idle' || ph === 'clear'
    const { top } = geo()
    for (const k of Object.keys(w.cds) as DefKind[]) if (w.cds[k] > 0) w.cds[k] = Math.max(0, w.cds[k] - dt)

    // waves
    if (ph === 'play' || ph === 'idle') {
      if (w.spawns.length) {
        w.spawnT += dt
        while (w.spawns.length && w.spawns[0].at <= w.spawnT) {
          const s = w.spawns.shift()!
          const m = MONS[s.kind]
          const hpK = s.kind === 'boss' ? 1 : 1 + (w.level - 1) * 0.03
          w.mons.push({ id: uid++, kind: s.kind, lane: s.lane, y: -0.9, hp: m.hp * hpK, max: m.hp * hpK, speed: m.speed * rand(0.92, 1.08), bite: m.bite, slow: 0, hit: 0, eating: false, jumped: false, jumpT: 0, windup: 0, step: Math.random() * 6, dead: 0, value: m.value })
        }
      }
      const alive = w.mons.some((m) => !m.dead)
      if (ph === 'play') {
        if (w.waveInLevel < WAVES_PER_LEVEL) {
          w.waveT -= dt
          // the next wave comes early if the lawn is clear
          if (!alive && !w.spawns.length && w.waveInLevel > 0 && w.waveT > 4) w.waveT = 4
          if (w.waveT <= 0) {
            if (w.waveInLevel > 0) {
              w.stats.wave = w.wave
              run.update(w.stats)
            }
            nextWave()
          }
        } else if (!alive && !w.spawns.length && !w.lastWaveDone) {
          w.lastWaveDone = true
          w.stats.wave = w.wave
          levelClear()
        }
      } else {
        // attract mode: endless gentle waves
        w.waveT -= dt
        if (w.waveT <= 0) {
          w.waveT = 9
          w.spawns = [{ kind: Math.random() < 0.3 ? 'cone' : 'blob', lane: Math.floor(Math.random() * LANES), at: 0 }]
          w.spawnT = 0
        }
      }
    }

    // sky orbs
    if (ph === 'play') {
      w.skyT -= dt
      if (w.skyT <= 0) {
        w.skyT = 9 + Math.random() * 3
        const lane = Math.floor(Math.random() * LANES)
        const p = tileXY(lane, 1 + Math.random() * 4)
        w.orbs.push({ id: uid++, x: p.x + rand(-10, 10), y: top - 20, ty: p.y, life: 10, value: 25, pick: 0 })
      }
    }
    for (const o of w.orbs) {
      if (o.pick > 0) {
        o.pick += raw * 2.2
        continue
      }
      if (o.y < o.ty) o.y = Math.min(o.ty, o.y + dt * 70)
      o.life -= dt
      if (ph === 'idle' && o.life < 8) collectOrb(o)
    }
    w.orbs = w.orbs.filter((o) => o.life > 0 && o.pick < 1)

    if (!live) return

    // defenders
    for (const d of w.defs) {
      d.act = Math.max(0, d.act - raw * 3)
      d.hit = Math.max(0, d.hit - raw)
      d.born = Math.max(0, d.born - raw * 3)
      if (d.kind === 'boom') {
        d.fuse -= dt
        d.act = 1 - Math.max(0, d.fuse) / 0.9
        if (d.fuse <= 0) {
          d.hp = 0
          const p = tileXY(d.lane, d.row)
          fx.explode(p.x, p.y, 2.2, ['#fde047', '#f97316', '#ef4444', '#fff7ed'])
          fx.flash('#fed7aa', 0.2)
          fx.stop(0.08)
          if (ph === 'play') {
            sfx.boom(1)
            haptic.heavy()
          }
          for (const m of w.mons) if (!m.dead && Math.abs(m.lane - d.lane) <= 1 && Math.abs(m.y - d.row) <= 1.5) damage(m, 1800)
        }
        continue
      }
      d.cd -= dt
      if (d.kind === 'bloom') {
        if (d.cd <= 0) {
          d.cd = 11
          d.act = 1
          const p = tileXY(d.lane, d.row)
          w.orbs.push({ id: uid++, x: p.x + rand(-8, 8), y: p.y - 10, ty: p.y - 4, life: 10, value: 25, pick: 0 })
          if (ph === 'play') sfx.tick()
        }
        continue
      }
      if (d.kind === 'pea' || d.kind === 'frost') {
        const target = w.mons.some((m) => !m.dead && m.lane === d.lane && m.y < d.row + 0.3 && m.y > -0.8)
        if (target && d.cd <= 0) {
          d.cd = 1.45
          d.act = 1
          w.shots.push({ id: uid++, lane: d.lane, y: d.row - 0.35, dmg: 26, ice: d.kind === 'frost' })
          if (ph === 'play') sfx.shoot()
        }
      }
    }

    // shots
    for (const s of w.shots) {
      s.y -= dt * 6
      let hit: Mon | null = null
      for (const m of w.mons) {
        if (m.dead || m.lane !== s.lane || m.jumpT > 0) continue
        if (s.y <= m.y + 0.3 && s.y >= m.y - 0.5 && (!hit || m.y > hit.y)) hit = m
      }
      if (hit) {
        damage(hit, s.dmg, s.ice)
        const p = tileXY(s.lane, s.y)
        fx.burst(p.x, p.y, { count: 5, color: s.ice ? ['#e0f2fe', '#7dd3fc'] : ['#bef264', '#4ade80'], speed: 120, gravity: 200, size: 2.5 })
        if (ph === 'play') sfx.hit()
        s.y = -99
      }
    }
    w.shots = w.shots.filter((s) => s.y > -1.2)

    // monsters
    for (const m of w.mons) {
      if (m.dead) {
        m.dead += raw * 2
        continue
      }
      m.hit = Math.max(0, m.hit - raw)
      if (m.slow > 0) m.slow -= dt
      const sp = m.speed * (m.slow > 0 ? 0.5 : 1)
      if (m.jumpT > 0) {
        m.jumpT -= dt
        m.y += dt * 1.6
        continue
      }
      const blocker = w.defs.find((d) => d.lane === m.lane && d.hp > 0 && d.kind !== 'boom' && m.y >= d.row - 0.62 && m.y < d.row + 0.2)
      if (blocker) {
        if (m.kind === 'hopper' && !m.jumped) {
          m.jumped = true
          m.jumpT = 0.75
          if (ph === 'play') sfx.whoosh()
          continue
        }
        m.eating = true
        if (m.kind === 'boss') {
          m.windup += dt
          if (m.windup >= 1.3) {
            m.windup = 0
            blocker.hp = 0
            const p = tileXY(blocker.lane, blocker.row)
            fx.explode(p.x, p.y, 1.2, ['#a16207', '#78350f', '#fde68a', '#ffffff'])
            fx.shake(9, 0.3)
            if (ph === 'play') {
              sfx.boom(0.8)
              haptic.heavy()
            }
          }
        } else {
          blocker.hp -= m.bite * dt * (m.slow > 0 ? 0.5 : 1)
          blocker.hit = 0.12
          m.step += dt * 10
          if (ph === 'play' && Math.random() < dt * 2) sfx.tick()
        }
      } else {
        m.eating = false
        m.windup = Math.max(0, m.windup - dt)
        m.y += sp * dt
        m.step += dt * (6 + sp * 20)
      }
      // reached the house
      if (m.y >= ROWS - 0.35) {
        const mw = w.mowers[m.lane]
        if (mw.state === 'ready') {
          mw.state = 'go'
          mw.y = ROWS + 0.3
          if (ph === 'play') {
            sfx.power()
            haptic.medium()
            const p = tileXY(m.lane, ROWS)
            fx.text(p.x, p.y - 40, 'MOWER!', '#fde047', 16)
          }
        } else if (mw.state === 'used' || (mw.state === 'go' && mw.y < m.y - 0.6)) {
          if (ph === 'play') die()
          else m.dead = 0.001
        }
      }
    }
    w.mons = w.mons.filter((m) => m.dead < 1)
    // defenders destroyed
    for (const d of w.defs) {
      if (d.hp <= 0 && d.kind !== 'boom') {
        const p = tileXY(d.lane, d.row)
        fx.burst(p.x, p.y, { count: 14, color: ['#86efac', '#16a34a', '#a16207'], speed: 200, gravity: 400, shape: 'square', size: 3.5 })
        if (ph === 'play') sfx.hurt()
      }
    }
    w.defs = w.defs.filter((d) => d.hp > 0)

    // mowers sweep up the lane
    for (let i = 0; i < LANES; i++) {
      const mw = w.mowers[i]
      if (mw.state !== 'go') continue
      mw.y -= dt * 5
      for (const m of w.mons) {
        if (!m.dead && m.lane === i && Math.abs(m.y - mw.y) < 0.5) {
          damage(m, 99999)
          const p = tileXY(i, m.y)
          fx.burst(p.x, p.y, { count: 16, color: ['#c4b5fd', '#ffffff'], speed: 260, gravity: 300 })
        }
      }
      if (Math.random() < 0.6) {
        const p = tileXY(i, mw.y)
        fx.burst(p.x, p.y + 10, { count: 1, color: ['#86efac', '#4ade80'], speed: 120, gravity: 300, size: 2.5 })
      }
      if (mw.y < -1.5) mw.state = 'used'
    }

    if (ph === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0) {
        setPhaseBoth('play')
        startLevel(w.level + 1)
      }
    }
    if (ph === 'idle') {
      w.idleT -= raw
      if (w.idleT <= 0) {
        w.idleT = 1.5
        w.energy = 500
        const plan: [DefKind, number, number][] = [
          ['bloom', 0, 6], ['pea', 1, 5], ['pea', 2, 5], ['bloom', 3, 6], ['pea', 3, 5], ['nut', 2, 2], ['pea', 0, 5], ['frost', 4, 5], ['nut', 0, 2], ['pea', 4, 4],
        ]
        for (const [k, lane, row] of plan) if (!w.defs.some((d) => d.lane === lane && d.row === row) && plant(k, lane, row)) break
      }
    }
  }

  // ── Render ────────────────────────────────────
  /** Dev-only scripted player used to verify every authored level is clearable (no zaps). */
  function autopilot() {
    const w = world.current
    for (const o of w.orbs) if (!o.pick && o.y >= o.ty - 1) collectOrb(o)
    const free = (lane: number, row: number) => !w.defs.some((d) => d.lane === lane && d.row === row)
    const ok = (k: DefKind) => UNLOCK[k] <= w.level && w.cds[k] <= 0 && w.energy >= DEFS[k].cost
    // emergencies: blast anything deep in the lawn or any Giant
    for (const m of w.mons) {
      if (m.dead || m.y < 0) continue
      if ((m.y > 4.3 || (m.kind === 'boss' && m.y > 1.0) || (m.kind === 'brute' && m.y > 3.5)) && ok('boom')) {
        const row = Math.min(ROWS - 1, Math.round(m.y + (m.kind === 'boss' ? 0.4 : 0.6)))
        if (free(m.lane, row)) {
          plant('boom', m.lane, row)
          return
        }
      }
    }
    const order = [2, 1, 3, 0, 4]
    const plan: [DefKind, number, number][] = []
    const blooms = w.defs.filter((d) => d.kind === 'bloom').length
    const unguarded = (l: number, deep: number) => w.mons.some((m) => !m.dead && m.lane === l && m.y > deep) && !w.defs.some((d) => d.lane === l && d.kind === 'pea')
    // lane pressure: monster hp still to kill vs. shooters in the lane
    const pressure = (l: number) => {
      const hp = w.mons.reduce((a, m) => a + (!m.dead && m.lane === l ? m.hp : 0), 0) + w.spawns.reduce((a, sp) => a + (sp.lane === l ? MONS[sp.kind].hp : 0), 0)
      const guns = w.defs.filter((d) => d.lane === l && (d.kind === 'pea' || d.kind === 'frost')).length
      return hp / (1 + guns * 1.2)
    }
    const byPressure = order.slice().sort((a, b) => pressure(b) - pressure(a))
    for (const l of order) if (unguarded(l, 2.2)) plan.push(['pea', l, 5])
    if (blooms < 2) plan.push(['bloom', 2, 6], ['bloom', 1, 6])
    // a Rock Nut in front of tough monsters buys the peas time
    for (const l of order) {
      const tough = w.mons.some((m) => !m.dead && m.lane === l && m.y > -0.5 && m.y < 3 && m.kind !== 'blob' && m.kind !== 'runner')
      if (tough && !w.defs.some((d) => d.lane === l && d.kind === 'nut')) plan.push(['nut', l, 3])
    }
    for (const l of order) if (unguarded(l, -1)) plan.push(['pea', l, 5])
    if (blooms < 5) for (const l of order) plan.push(['bloom', l, 6])
    const top = byPressure[0]
    if (pressure(top) > 400) {
      for (const row of [5, 4, 3]) plan.push(['pea', top, row])
      if (w.level >= 4) plan.push(['frost', top, 4], ['frost', top, 3])
      plan.push(['nut', top, 1])
    }
    if (blooms < 5) plan.push(['bloom', 0, 6], ['bloom', 4, 6])
    for (const l of byPressure) plan.push(['pea', l, 5], ['pea', l, 4])
    for (const l of byPressure) plan.push(['nut', l, 1], ['frost', l, 3], ['pea', l, 2])
    // keep a Boom Berry in reserve once the economy runs
    const reserve = UNLOCK.boom <= w.level && blooms >= 4 ? DEFS.boom.cost : 0
    const urgent = plan.length ? plan[0] : null
    for (const [k, lane, row] of plan) {
      if (!free(lane, row) || UNLOCK[k] > w.level) continue
      const isUrgent = urgent && urgent[0] === k && urgent[1] === lane && urgent[2] === row && unguarded(lane, 2.2)
      if (!isUrgent && k !== 'bloom' && w.energy < DEFS[k].cost + reserve) return
      if (!ok(k)) {
        if (w.cds[k] > 0) continue
        return
      }
      plant(k, lane, row)
      return
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const reps = import.meta.env.DEV ? devSpeed.current : 1
    for (let r = 0; r < reps; r++) {
      if (import.meta.env.DEV && devAuto.current && phaseRef.current === 'play') autopilot()
      update(dt, raw)
    }
    const g = geo()
    const hard = isHard(w.level) && ph !== 'idle'

    // sky + forest edge
    const bg = ctx.createLinearGradient(0, 0, 0, g.top + 20)
    bg.addColorStop(0, hard ? '#450a0a' : '#1e3a5f')
    bg.addColorStop(1, hard ? '#7f1d1d' : '#14532d')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = hard ? '#3f0f0f' : '#14532d'
    for (let i = 0; i < 12; i++) {
      const x = (i / 11) * W
      ctx.beginPath()
      ctx.arc(x, g.top - 4, 22 + ((i * 37) % 13), Math.PI, 0)
      ctx.fill()
    }
    // spawn gate glow
    for (let l = 0; l < LANES; l++) glow(ctx, g.gx + (l + 0.5) * g.cw, g.top - 6, 26, hard ? '#ef4444' : '#a78bfa', 0.25 + Math.sin(t * 2 + l) * 0.08)

    fx.applyShake(ctx)
    // lawn
    for (let r = 0; r < ROWS; r++) {
      for (let l = 0; l < LANES; l++) {
        const x = g.gx + l * g.cw
        const y = g.top + r * g.rh
        const light = (r + l) % 2 === 0
        ctx.fillStyle = light ? '#4ade80' : '#22c55e'
        ctx.fillRect(x, y, g.cw + 0.5, g.rh + 0.5)
      }
    }
    ctx.strokeStyle = 'rgba(21,128,61,0.55)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 40; i++) {
      const x = g.gx + ((i * 53) % (W - 12))
      const y = g.top + ((i * 97) % (g.gridBottom - g.top))
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - 2, y - 5)
      ctx.moveTo(x + 3, y)
      ctx.lineTo(x + 4, y - 6)
      ctx.stroke()
    }
    // house strip + mowers
    ctx.fillStyle = '#a16207'
    ctx.fillRect(0, g.gridBottom, W, g.cardY - g.gridBottom)
    ctx.fillStyle = '#ca8a04'
    for (let x = 0; x < W; x += 18) ctx.fillRect(x, g.gridBottom + 2, 14, 4)
    // placement highlight
    const sel = w.sel
    if (sel && ph === 'play') {
      for (let r = 0; r < ROWS; r++) for (let l = 0; l < LANES; l++) {
        const occ = w.defs.some((d) => d.lane === l && d.row === r)
        if (sel === 'shovel' ? !occ : occ) continue
        const p = tileXY(l, r)
        ctx.fillStyle = sel === 'shovel' ? 'rgba(239,68,68,0.18)' : `rgba(255,255,255,${0.1 + Math.sin(t * 5) * 0.05})`
        ctx.fillRect(p.x - g.cw / 2 + 2, p.y - g.rh / 2 + 2, g.cw - 4, g.rh - 4)
      }
    }

    // defenders (back to front)
    const blinkOn = (id: number) => (t * 0.7 + id * 0.37) % 4 < 0.12
    for (const d of [...w.defs].sort((a, b) => a.row - b.row)) {
      const p = tileXY(d.lane, d.row)
      ctx.save()
      ctx.translate(p.x, p.y + g.s * 0.05)
      const pop = d.born > 0 ? 1 + Math.sin(d.born * Math.PI) * 0.25 : 1
      ctx.scale(pop, pop)
      if (d.hit > 0) ctx.translate(Math.sin(t * 60) * 1.5, 0)
      drawDefender(ctx, d.kind, g.s, t + d.id, d.act, 1 - d.hp / d.max, blinkOn(d.id))
      ctx.restore()
      if (d.hp < d.max && d.kind !== 'boom') {
        ctx.fillStyle = 'rgba(0,0,0,0.4)'
        ctx.fillRect(p.x - 14, p.y + g.rh * 0.38, 28, 4)
        ctx.fillStyle = d.hp / d.max > 0.4 ? '#4ade80' : '#f87171'
        ctx.fillRect(p.x - 14, p.y + g.rh * 0.38, 28 * (d.hp / d.max), 4)
      }
    }
    // shots
    for (const s of w.shots) {
      const p = tileXY(s.lane, s.y)
      if (s.ice) {
        ctx.fillStyle = '#e0f2fe'
        ctx.beginPath()
        ctx.moveTo(p.x, p.y - 8)
        ctx.lineTo(p.x + 5, p.y)
        ctx.lineTo(p.x, p.y + 6)
        ctx.lineTo(p.x - 5, p.y)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = '#0ea5e9'
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else {
        ctx.fillStyle = '#166534'
        ctx.beginPath()
        ctx.arc(p.x, p.y + 1, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#84cc16'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.beginPath()
        ctx.arc(p.x - 2, p.y - 2, 1.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // monsters
    for (const m of [...w.mons].sort((a, b) => a.y - b.y)) {
      const p = tileXY(m.lane, m.y)
      const jump = m.jumpT > 0 ? Math.sin((1 - m.jumpT / 0.75) * Math.PI) * g.rh * 0.8 : 0
      ctx.save()
      ctx.translate(p.x, p.y - jump)
      if (m.dead) {
        ctx.globalAlpha = Math.max(0, 1 - m.dead)
        ctx.scale(1 + m.dead * 0.4, 1 - m.dead * 0.7)
      }
      const bite = m.eating ? (Math.sin(m.step) + 1) / 2 : 0
      drawMonster(ctx, m.kind, g.s, m.step, bite, m.slow > 0, m.hit > 0.05, m.windup / 1.3)
      ctx.restore()
      ctx.globalAlpha = 1
      if (!m.dead && m.hp < m.max) {
        const bw = m.kind === 'boss' ? 54 : 26
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        ctx.fillRect(p.x - bw / 2, p.y - g.s * (m.kind === 'boss' ? 0.75 : 0.48) - jump, bw, 4)
        ctx.fillStyle = m.kind === 'boss' ? '#f472b6' : '#f87171'
        ctx.fillRect(p.x - bw / 2, p.y - g.s * (m.kind === 'boss' ? 0.75 : 0.48) - jump, bw * Math.max(0, m.hp / m.max), 4)
      }
      if (m.kind === 'boss' && m.windup > 0.4 && !m.dead) {
        ctx.strokeStyle = `rgba(239,68,68,${0.4 + Math.sin(t * 20) * 0.3})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(p.x, p.y + g.rh * 0.6, g.s * 0.5, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    // mowers
    for (let i = 0; i < LANES; i++) {
      const mw = w.mowers[i]
      if (mw.state === 'used') continue
      const x = g.gx + (i + 0.5) * g.cw
      const y = mw.state === 'go' ? tileXY(i, mw.y).y : g.mowY
      drawMower(ctx, x, y, g.s * 0.8, t, mw.state === 'go')
    }
    // orbs
    for (const o of w.orbs) {
      if (o.pick > 0) {
        const k = o.pick
        const x = o.x + (34 - o.x) * k
        const y = o.y + (g.cardY + g.cardH / 2 - o.y) * k
        drawOrb(ctx, x, y, 11 * (1 - k * 0.4), t)
      } else {
        ctx.globalAlpha = o.life < 2 ? 0.5 + Math.sin(t * 20) * 0.3 : 1
        drawOrb(ctx, o.x, o.y + Math.sin(t * 3 + o.id) * 3, 12, t)
        ctx.globalAlpha = 1
      }
    }
    fx.draw(ctx)
    ctx.restore()

    // card bar
    ctx.fillStyle = '#78350f'
    ctx.fillRect(0, g.cardY, W, g.cardH)
    ctx.fillStyle = '#92400e'
    ctx.fillRect(0, g.cardY, W, 4)
    // energy box
    ctx.fillStyle = '#451a03'
    ctx.beginPath()
    ctx.roundRect(6, g.cardY + 6, 56, g.cardH - 12, 10)
    ctx.fill()
    drawOrb(ctx, 34, g.cardY + 24, 10, t)
    ctx.font = "900 16px 'Plus Jakarta Sans', system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fef3c7'
    ctx.fillText(String(w.energy), 34, g.cardY + g.cardH - 20)
    CARD_ORDER.forEach((k, i) => {
      const r = cardRect(i)
      const locked = UNLOCK[k] > w.level
      const d = DEFS[k]
      const ready = !locked && w.energy >= d.cost && w.cds[k] <= 0
      const on = w.sel === k
      ctx.fillStyle = on ? '#fde68a' : locked ? '#57534e' : '#fef3c7'
      ctx.beginPath()
      ctx.roundRect(r.x, r.y - (on ? 4 : 0), r.w, r.h, 8)
      ctx.fill()
      ctx.strokeStyle = on ? '#f59e0b' : '#a16207'
      ctx.lineWidth = on ? 3 : 1.5
      ctx.stroke()
      if (!locked) {
        ctx.save()
        ctx.beginPath()
        ctx.roundRect(r.x, r.y - (on ? 4 : 0), r.w, r.h, 8)
        ctx.clip()
        ctx.translate(r.x + r.w / 2, r.y + r.h * 0.42 - (on ? 4 : 0))
        drawDefender(ctx, k, Math.min(r.w, r.h) * 0.85, t * 0.5, 0, 0, false)
        ctx.restore()
        ctx.fillStyle = ready ? '#78350f' : '#b91c1c'
        ctx.font = "900 11px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.fillText(String(d.cost), r.x + r.w / 2, r.y + r.h - 8 - (on ? 4 : 0))
        if (!ready) {
          ctx.fillStyle = 'rgba(30,20,10,0.45)'
          const cdk = w.cds[k] / d.cd
          ctx.fillRect(r.x, r.y, r.w, r.h * (w.cds[k] > 0 ? cdk : 1))
        }
      } else {
        ctx.fillStyle = '#d6d3d1'
        ctx.font = "900 10px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.fillText(`LV ${UNLOCK[k]}`, r.x + r.w / 2, r.y + r.h / 2)
      }
    })
    // dragged card ghost
    if (w.drag && w.sel && w.sel !== 'shovel' && ph === 'play') {
      ctx.globalAlpha = 0.75
      ctx.save()
      ctx.translate(w.drag.x, w.drag.y - 20)
      drawDefender(ctx, w.sel, g.s, t, 0, 0, false)
      ctx.restore()
      ctx.globalAlpha = 1
    }

    if (ph !== 'idle') {
      // wave progress with flags
      const bx = W * 0.42
      const bw = W - bx - 112
      const by = 20
      const total = WAVES_PER_LEVEL
      const done = clamp((w.waveInLevel - (w.spawns.length ? 0.5 : 0)) / total, 0, 1)
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.beginPath()
      ctx.roundRect(bx, by, bw, 10, 5)
      ctx.fill()
      ctx.fillStyle = '#a3e635'
      ctx.beginPath()
      ctx.roundRect(bx, by, Math.max(10, bw * done), 10, 5)
      ctx.fill()
      for (let i = 1; i <= total; i++) {
        if (i !== total) continue
        const fx2 = bx + (bw * i) / total
        ctx.strokeStyle = '#fef3c7'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(fx2 - 2, by + 12)
        ctx.lineTo(fx2 - 2, by - 8)
        ctx.stroke()
        ctx.fillStyle = isHard(w.level) ? '#a855f7' : '#ef4444'
        ctx.beginPath()
        ctx.moveTo(fx2 - 2, by - 8)
        ctx.lineTo(fx2 + 9, by - 4)
        ctx.lineTo(fx2 - 2, by)
        ctx.fill()
      }
      ctx.fillStyle = '#fff'
      ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'left'
      ctx.fillText(`Wave ${Math.max(1, w.waveInLevel)}/${total}`, bx, by + 22)
      if (w.waveInLevel === 0 && ph === 'play') {
        ctx.fillStyle = '#fef3c7'
        ctx.fillText(`first wave in ${Math.ceil(w.waveT)}s`, bx, by + 34)
      }
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__t2fail = () => {
      const w = world.current
      if (phaseRef.current !== 'play') return
      for (const mw of w.mowers) mw.state = 'used'
      w.mons.push({ id: uid++, kind: 'runner', lane: 0, y: ROWS - 0.4, hp: 100, max: 100, speed: 1, bite: 0, slow: 0, hit: 0, eating: false, jumped: true, jumpT: 0, windup: 0, step: 0, dead: 0, value: 0 })
    }
    win.__t2level = (n: number, fair = false) => {
      const w = world.current
      if (phaseRef.current !== 'play') return
      startLevel(n)
      if (fair) return
      w.energy = 2000
      w.waveT = 1
    }
    win.__lv2auto = (on: boolean, speed = 1) => {
      devAuto.current = on
      devSpeed.current = Math.max(1, Math.min(12, speed))
    }
    win.__lv2state = () => ({ phase: phaseRef.current, level: world.current.level, wave: world.current.waveInLevel, defs: world.current.defs.map((d) => d.kind[0] + d.lane + d.row).join(' '), mons: world.current.mons.filter((m) => !m.dead).map((m) => (m.kind === 'boss' ? 'G' : m.kind[0]) + m.lane + ':' + m.y.toFixed(1)).join(' '), mowers: world.current.mowers.filter((m) => m.state !== 'ready').length, energy: world.current.energy })
    win.__t2spawn = (kind: MonKind, lane: number, y: number) => {
      const m = MONS[kind]
      world.current.mons.push({ id: uid++, kind, lane, y, hp: m.hp, max: m.hp, speed: m.speed, bite: m.bite, slow: 0, hit: 0, eating: false, jumped: false, jumpT: 0, windup: 0, step: 0, dead: 0, value: m.value })
    }
    win.__lanedefense = () => {
      const w = world.current
      if (phaseRef.current !== 'play') return null
      const orb = w.orbs.find((o) => !o.pick && o.y >= o.ty - 1)
      if (orb) return { tap: { x: orb.x, y: orb.y } }
      const plan: [DefKind, number, number][] = []
      for (let l = 0; l < LANES; l++) plan.push(['bloom', l, 6])
      for (let l = 0; l < LANES; l++) plan.push(['pea', l, 5])
      for (let l = 0; l < LANES; l++) plan.push(['nut', l, 2])
      for (let l = 0; l < LANES; l++) plan.push(['pea', l, 4])
      for (let l = 0; l < LANES; l++) plan.push(['frost', l, 3])
      for (const [k, lane, row] of plan) {
        if (UNLOCK[k] > w.level || w.defs.some((d) => d.lane === lane && d.row === row)) continue
        if (w.cds[k] > 0) continue
        if (w.energy < DEFS[k].cost) return null
        const c = cardRect(CARD_ORDER.indexOf(k))
        const p = tileXY(lane, row)
        return { drag: [{ x: c.x + c.w / 2, y: c.y + c.h / 2 }, { x: (c.x + p.x) / 2, y: (c.y + p.y) / 2 }, { x: p.x, y: p.y }] }
      }
      return null
    }
    return () => {
      delete win.__t2fail
      delete win.__t2level
      delete win.__lanedefense
      delete win.__t2spawn
      delete win.__lv2auto
      delete win.__lv2state
    }
  }, [])

  const won = hud.level >= 3
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena ld-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="ld-sub">
                  Level {hud.level}
                  {hud.hard ? <span className="ld-hard">HARD</span> : null}
                </div>
              </div>
            </div>
          )}
          {phase === 'play' || phase === 'clear' || phase === 'dying' ? (
            <div className="ld-tools">
              <button type="button" className={`ld-tool${hud.shovel ? ' is-on' : ''}`} aria-label="Shovel" onPointerDown={stop} onClick={toggleShovel}>
                <ShovelIcon />
              </button>
              <button type="button" className="ld-tool ld-tool--zap" aria-label="Lightning" disabled={hud.zaps <= 0} onPointerDown={stop} onClick={zap}>
                <ZapIcon />
                <span className="ld-tool__n">{hud.zaps}</span>
              </button>
            </div>
          ) : null}
          {hud.shovel && phase === 'play' ? <div className="ld-hint">Tap a defender to dig it up (50% refund)</div> : null}
          {banner && (phase === 'play' || phase === 'clear') ? (
            <div className="action-banner ld-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="lanedefense"
              icon={meta.icon}
              title={meta.title}
              hint="Tap a defender card, then a tile. Collect energy orbs, hold all five lanes and survive every wave."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={won ? 'Lawn legend!' : 'Overrun!'}
            subtitle={`Score ${hud.score} · level ${hud.level} · wave ${hud.wave}`}
            celebrate={won}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
