import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, dist, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { FISH, ZONES, drawBoat, drawFish, drawLure, drawSky, waterAt, zoneIndex, type FishKind } from './art'
import '../../shared/action/action.css'
import './fisher.css'

const meta = getGame('fisher')

type Phase = 'idle' | 'play' | 'shop' | 'dying' | 'over'
type Mode = 'sink' | 'rise' | 'air' | 'summary'

type Fish = { id: number; kind: FishKind; x: number; m: number; vx: number; t: number; hooked: boolean; gone: boolean }
type AirFish = { kind: FishKind; x: number; y: number; vx: number; vy: number; rot: number; vr: number; delay: number }
type ShopKey = 'line' | 'cap' | 'shield' | 'gun' | 'heart'

const SHOP: Record<ShopKey, { label: string; desc: string; base: number; growth: number; max: number }> = {
  line: { label: 'Longer Line', desc: '+50 m of line to sink deeper', base: 60, growth: 1.45, max: 30 },
  cap: { label: 'Bigger Hook', desc: '+3 fish per haul', base: 50, growth: 1.55, max: 20 },
  shield: { label: 'Bumper Lure', desc: 'Brush past +1 fish while sinking', base: 120, growth: 1.8, max: 3 },
  gun: { label: 'Wide Shot', desc: '+20% shot radius in the air', base: 80, growth: 1.7, max: 4 },
  heart: { label: 'Spare Line', desc: '+1 line (life), max 5', base: 250, growth: 2, max: 3 },
}
const POOLS: [FishKind, number][][] = [
  [['sardine', 5], ['clown', 3], ['mackerel', 2], ['jelly', 1]],
  [['mackerel', 2], ['tuna', 4], ['squid', 3], ['jelly', 2]],
  [['lantern', 4], ['angler', 3], ['squid', 1], ['jelly', 1.5]],
  [['gulper', 4], ['angler', 2], ['lantern', 1], ['jelly', 1]],
  [['coela', 4], ['gulper', 2], ['golden', 1.2], ['jelly', 1]],
]

type World = {
  demo: boolean
  mode: Mode
  hearts: number
  money: number
  earned: number
  dive: number
  deepest: number
  line: number
  cap: number
  shieldMax: number
  shield: number
  gunMul: number
  bounty: number
  lureX: number
  targetX: number
  depth: number
  vy: number
  fish: Fish[]
  hooked: Fish[]
  air: AirFish[]
  diveCash: number
  streak: number
  summaryT: number
  camY: number
  seenZone: number
  recordShown: boolean
  bought: Record<ShopKey, number>
  id: number
  stats: { score: number; depth: number; fish: number; money: number; dives: number; golden: number }
}

function freshWorld(demo: boolean): World {
  return {
    demo,
    mode: 'summary',
    hearts: 3,
    money: 0,
    earned: 0,
    dive: 0,
    deepest: 0,
    line: 120,
    cap: 6,
    shieldMax: 0,
    shield: 0,
    gunMul: 1,
    bounty: 1,
    lureX: 180,
    targetX: 180,
    depth: 0,
    vy: 0,
    fish: [],
    hooked: [],
    air: [],
    diveCash: 0,
    streak: 0,
    summaryT: 0,
    camY: -200,
    seenZone: 0,
    recordShown: false,
    bought: { line: 0, cap: 0, shield: 0, gun: 0, heart: 0 },
    id: 1,
    stats: { score: 0, depth: 0, fish: 0, money: 0, dives: 0, golden: 0 },
  }
}

export default function FisherGame() {
  const run = useActionRun('fisher')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(true))
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ id: number; x0: number; lx: number } | null>(null)
  const keys = useRef(new Set<string>()).current
  const snow = useRef(Array.from({ length: 45 }, () => ({ x: Math.random(), y: Math.random(), z: rand(0.3, 1) }))).current

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ money: 0, depth: 0, hearts: 3, hooked: 0, cap: 6, mode: 'summary' as Mode, dive: 0, streak: 0, line: 120, shield: 0 })
  const [shop, setShop] = useState<{ key: ShopKey; price: number; maxed: boolean }[]>([])
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function geo() {
    const { w: W, h: H } = size.current
    const u = Math.min(W / 360, H / 640)
    return { W, H, u, ppm: 6 * u }
  }

  function pushHud() {
    const w = world.current
    setHud({ money: w.money, depth: Math.round(w.depth), hearts: w.hearts, hooked: w.hooked.length, cap: w.cap, mode: w.mode, dive: w.dive, streak: w.streak, line: w.line, shield: w.shield })
  }

  // ── Dive setup ────────────────────────────────────────────
  function populate() {
    const w = world.current
    const { W, u } = geo()
    w.fish = []
    const d = w.dive
    for (let m = 20; m < w.line + 40; ) {
      const z = zoneIndex(m)
      const hazardP = w.demo || d <= 1 ? 0 : Math.min(0.32, 0.06 + d * 0.02 + z * 0.04)
      let kind: FishKind
      if (Math.random() < hazardP) {
        const hz: FishKind[] = ['mine']
        if (z >= 1) hz.push('puffer')
        if (z >= 3) hz.push('eel', 'eel')
        kind = hz[Math.floor(Math.random() * hz.length)]
      } else {
        const pool = POOLS[z]
        const total = pool.reduce((s, p) => s + p[1], 0)
        let r = Math.random() * total
        kind = pool[0][0]
        for (const [k, wt] of pool) {
          r -= wt
          if (r <= 0) {
            kind = k
            break
          }
        }
      }
      const speed = (kind === 'mine' ? rand(5, 15) : rand(25, 70) + z * 8) * u
      w.fish.push({ id: w.id++, kind, x: rand(30 * u, W - 30 * u), m, vx: (Math.random() < 0.5 ? -1 : 1) * speed, t: rand(0, 6), hooked: false, gone: false })
      m += rand(3.2, 6.2) * (1 + z * 0.08) * (d <= 1 && m < 60 ? 1.6 : 1)
    }
  }

  function startDive() {
    const w = world.current
    const { W } = geo()
    w.dive += 1
    w.stats.dives = w.dive
    w.mode = 'sink'
    w.depth = 0
    w.vy = 8
    w.lureX = W / 2
    w.targetX = W / 2
    w.shield = w.shieldMax
    w.hooked = []
    w.air = []
    w.diveCash = 0
    w.streak = 0
    w.recordShown = false
    populate()
    if (!w.demo) {
      const sub = w.dive === 1 ? 'drag to dodge fish' : w.dive === 2 ? 'beware sea mines!' : `${w.line} m of line`
      setBanner({ key: Date.now(), text: `DIVE ${w.dive}`, sub })
      sfx.whoosh()
      run.update(w.stats)
      pushHud()
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────
  function start() {
    void unlockAudio()
    const w = freshWorld(false)
    w.line = 120 + run.level('line') * 30
    w.hearts = 3 + run.level('spare')
    w.bounty = 1 + run.level('bounty') * 0.1
    world.current = w
    fx.reset()
    keys.clear()
    run.begin()
    setPhaseBoth('play')
    startDive()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.4)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.earned / 40 + w.dive)
      run.end({ score: w.earned, cleared: w.deepest >= 250, stats: { ...w.stats }, coins }, revive)
    }, 1100)
  }

  function revive() {
    const w = world.current
    w.hearts = 2
    w.mode = 'summary'
    fx.flash('#fde047', 0.3)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: '+2 lines' })
    openShop()
  }

  function openShop() {
    const w = world.current
    const keysList: ShopKey[] = ['line', 'cap', 'shield', 'gun', 'heart']
    setShop(
      keysList.map((k) => {
        const s = SHOP[k]
        const n = w.bought[k]
        const maxed = n >= s.max || (k === 'heart' && w.hearts >= 5)
        return { key: k, price: Math.round((s.base * Math.pow(s.growth, n)) / 5) * 5, maxed }
      }),
    )
    setPhaseBoth('shop')
    pushHud()
  }

  function buy(k: ShopKey, price: number) {
    const w = world.current
    if (w.money < price) {
      sfx.miss()
      haptic.error()
      return
    }
    w.money -= price
    w.bought[k] += 1
    if (k === 'line') w.line += 50
    if (k === 'cap') w.cap += 3
    if (k === 'shield') w.shieldMax += 1
    if (k === 'gun') w.gunMul += 0.2
    if (k === 'heart') w.hearts += 1
    sfx.score(5)
    haptic.success()
    openShop()
  }

  function leaveShop() {
    setShop([])
    setPhaseBoth('play')
    startDive()
  }

  // ── Dive events ───────────────────────────────────────────
  function lurePos() {
    const w = world.current
    const { ppm } = geo()
    return { x: w.lureX, y: w.depth * ppm }
  }

  function cut(f: Fish) {
    const w = world.current
    const { x, y } = lurePos()
    const sy = y - w.camY
    f.gone = true
    fx.explode(x, sy, 1.4, ['#fde047', '#ef4444', '#fff', '#fb923c'])
    fx.flash('#ef4444', 0.3)
    fx.stop(0.12)
    sfx.boom(0.6)
    haptic.heavy()
    w.hearts -= 1
    for (const h of w.hooked) {
      h.hooked = false
      h.vx = (Math.random() < 0.5 ? -1 : 1) * 120
    }
    w.hooked = []
    w.mode = 'summary'
    w.summaryT = 1.6
    setBanner({ key: Date.now(), text: 'LINE CUT!', sub: w.hearts > 0 ? `${w.hearts} line${w.hearts > 1 ? 's' : ''} left` : 'no lines left' })
    pushHud()
    if (w.hearts <= 0) die()
  }

  function beginRise(text: string) {
    const w = world.current
    w.mode = 'rise'
    if (!w.demo) {
      setBanner({ key: Date.now(), text, sub: `${Math.round(w.depth)} m · now catch!` })
      sfx.ready()
      haptic.medium()
      pushHud()
    }
  }

  function launch() {
    const w = world.current
    const { u } = geo()
    w.air = w.hooked.map((f, i) => ({
      kind: f.kind,
      x: w.lureX + rand(-20, 20) * u,
      y: 0,
      vx: rand(-150, 150) * u,
      vy: -rand(720, 960) * u,
      rot: 0,
      vr: rand(-6, 6),
      delay: i * 0.12,
    }))
    w.hooked = []
    w.mode = 'air'
    if (!w.demo) {
      setBanner({ key: Date.now(), text: 'SHOOT!', sub: 'tap the flying fish · skip jellies' })
      sfx.boom(0.3)
    }
    pushHud()
  }

  function shoot(sx: number, sy: number) {
    const w = world.current
    const { u } = geo()
    const wx = sx
    const wy = sy + w.camY
    let best: AirFish | null = null
    let bd = 34 * u * w.gunMul
    for (const a of w.air) {
      if (a.delay > 0) continue
      const d = dist(a.x, a.y, wx, wy) - FISH[a.kind].size * u * 0.6
      if (d < bd) {
        bd = d
        best = a
      }
    }
    sfx.shoot()
    fx.ring(sx, sy, { color: '#fff', maxR: 18 * u * w.gunMul, life: 0.18, width: 2 })
    if (!best) {
      if (w.streak >= 3) fx.text(sx, sy - 20, 'streak lost', '#cbd5e1', 13)
      w.streak = 0
      pushHud()
      return
    }
    w.air = w.air.filter((a) => a !== best)
    const sp = FISH[best.kind]
    const fy = best.y - w.camY
    if (best.kind === 'jelly') {
      w.money = Math.max(0, w.money + sp.value)
      w.diveCash += sp.value
      w.streak = 0
      fx.burst(best.x, fy, { count: 18, color: ['#f0abfc', '#c026d3', '#fff'], speed: 200 })
      fx.text(best.x, fy - 20, `-$${-sp.value}`, '#f87171', 20)
      fx.flash('#c026d3', 0.15)
      sfx.hurt()
      haptic.error()
    } else {
      w.streak += 1
      const mult = 1 + Math.min(1, (w.streak - 1) * 0.1)
      const val = Math.round(sp.value * w.bounty * mult)
      w.money += val
      w.earned += val
      w.diveCash += val
      w.stats.fish += 1
      w.stats.money = w.earned
      w.stats.score = w.earned
      if (best.kind === 'golden') {
        w.stats.golden += 1
        fx.flash('#fde047', 0.2)
        sfx.levelUp()
      }
      fx.burst(best.x, fy, { count: 16, color: [sp.body, sp.belly, '#fde047'], speed: 240, shape: 'square', size: 4, gravity: 500 })
      fx.burst(best.x, fy, { count: 8, color: ['#fde047', '#fbbf24'], speed: 160, shape: 'dot', size: 3, gravity: 600 })
      fx.text(best.x, fy - 22, w.streak >= 3 ? `+$${val} x${mult.toFixed(1)}` : `+$${val}`, val >= 100 ? '#fde047' : '#fef3c7', val >= 100 ? 22 : 16)
      fx.stop(0.02)
      sfx.pop()
      sfx.score(Math.min(10, w.streak))
      haptic.light()
    }
    run.update(w.stats)
    pushHud()
  }

  function finishDive() {
    const w = world.current
    w.mode = 'summary'
    w.summaryT = 1.5
    if (w.demo) return
    setBanner({ key: Date.now(), text: w.diveCash > 0 ? `+$${w.diveCash}` : 'NO CATCH', sub: `dive ${w.dive} · deepest ${w.deepest} m` })
    if (w.diveCash > 0) sfx.win()
    if (w.dive % 5 === 0) void trackEvent('action_milestone', { game_id: 'fisher', kind: 'dive', value: w.dive })
    pushHud()
  }

  // ── Input ─────────────────────────────────────────────────
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    const w = world.current
    if (w.mode === 'air') {
      shoot(p.x, p.y)
      return
    }
    drag.current = { id: e.pointerId, x0: p.x, lx: w.targetX }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const p = localPoint(e, e.currentTarget)
    const { W, u } = geo()
    world.current.targetX = clamp(d.lx + (p.x - d.x0) * 1.35, 18 * u, W - 18 * u)
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      keys.add(e.key)
      if (e.key.startsWith('Arrow')) e.preventDefault()
      if (e.key === ' ' && phaseRef.current === 'play' && world.current.mode === 'air') {
        e.preventDefault()
        const a = world.current.air.find((f) => f.delay <= 0 && f.kind !== 'jelly')
        if (a) shoot(a.x, a.y - world.current.camY)
      }
    }
    function up(e: KeyboardEvent) {
      keys.delete(e.key)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ── Simulation ────────────────────────────────────────────
  function step(dt: number) {
    const w = world.current
    const { W, H, u, ppm } = geo()
    const live = phaseRef.current === 'play' && !w.demo
    const lureR = 9 * u

    if (keys.has('ArrowLeft')) w.targetX = clamp(w.targetX - 320 * u * dt, 18 * u, W - 18 * u)
    if (keys.has('ArrowRight')) w.targetX = clamp(w.targetX + 320 * u * dt, 18 * u, W - 18 * u)

    // Demo autopilot dodges fish on the way down.
    if (w.demo) {
      if (w.mode === 'summary' && w.summaryT <= 0) {
        w.dive = 3
        w.line = 160
        startDive()
      }
      const ahead = w.fish.find((f) => !f.gone && f.m > w.depth && f.m < w.depth + 12 && Math.abs(f.x - w.lureX) < 40 * u)
      if (ahead && w.mode === 'sink') w.targetX = clamp(ahead.x + (ahead.x > W / 2 ? -80 : 80) * u, 20 * u, W - 20 * u)
      else if (w.mode === 'rise') {
        const near = w.fish.find((f) => !f.gone && !f.hooked && f.m < w.depth && f.m > w.depth - 15)
        if (near) w.targetX = near.x
      }
    }

    for (const f of w.fish) {
      if (f.gone || f.hooked) continue
      f.t += dt
      f.x += f.vx * dt
      if (f.x < 16 * u || f.x > W - 16 * u) {
        f.vx *= -1
        f.x = clamp(f.x, 16 * u, W - 16 * u)
      }
    }

    w.lureX = approach(w.lureX, w.targetX, 12, dt)

    if (w.mode === 'sink') {
      w.vy = Math.min(32, w.vy + 22 * dt)
      w.depth += w.vy * dt
      if (!w.demo) {
        const z = zoneIndex(w.depth)
        if (z > w.seenZone) {
          w.seenZone = z
          setBanner({ key: Date.now(), text: ZONES[z].name.toUpperCase(), sub: `${ZONES[z].at} m · rarer fish` })
          sfx.levelUp()
        }
        if (w.depth > w.deepest) {
          if (!w.recordShown && w.deepest >= 50 && w.dive > 1) {
            w.recordShown = true
            fx.text(w.lureX, w.depth * ppm - w.camY + 40 * u, 'NEW RECORD', '#7dd3fc', 16)
          }
          w.deepest = Math.floor(w.depth)
          w.stats.depth = w.deepest
        }
      }
      for (const f of w.fish) {
        if (f.gone || f.hooked || Math.abs(f.m - w.depth) > 6) continue
        const fy = f.m * ppm
        if (dist(f.x, fy, w.lureX, w.depth * ppm) < lureR + FISH[f.kind].size * u * 0.72) {
          if (FISH[f.kind].hazard) {
            if (live) cut(f)
            else f.gone = true
            return
          }
          if (w.shield > 0) {
            w.shield -= 1
            f.vx = (f.x > w.lureX ? 1 : -1) * 220 * u
            fx.ring(w.lureX, w.depth * ppm - w.camY, { color: '#7dd3fc', maxR: 30 * u })
            if (!w.demo) {
              fx.text(w.lureX, w.depth * ppm - w.camY - 24 * u, 'BUMP', '#7dd3fc', 14)
              sfx.clang()
              pushHud()
            }
            continue
          }
          f.hooked = true
          w.hooked.push(f)
          beginRise('HOOKED!')
          break
        }
      }
      if (w.mode === 'sink' && w.depth >= w.line) {
        w.depth = w.line
        beginRise('LINE END')
      }
      if (live) {
        // throttle depth HUD updates to ~10 Hz
        if (Math.floor(w.depth / 3) !== Math.floor((w.depth - w.vy * dt) / 3)) pushHud()
      }
    } else if (w.mode === 'rise') {
      w.depth = Math.max(0, w.depth - 44 * dt)
      for (const f of w.fish) {
        if (f.gone || f.hooked || Math.abs(f.m - w.depth) > 6) continue
        const fy = f.m * ppm
        if (dist(f.x, fy, w.lureX, w.depth * ppm) < lureR + FISH[f.kind].size * u * 0.72) {
          if (FISH[f.kind].hazard) {
            if (live) cut(f)
            else f.gone = true
            return
          }
          if (w.hooked.length >= w.cap) continue
          f.hooked = true
          w.hooked.push(f)
          if (!w.demo) {
            fx.burst(w.lureX, w.depth * ppm - w.camY, { count: 6, color: [FISH[f.kind].body, '#fff'], speed: 100, gravity: 0 })
            sfx.score(Math.min(10, w.hooked.length))
            haptic.light()
            if (w.hooked.length === w.cap) fx.text(w.lureX, w.depth * ppm - w.camY - 26 * u, 'FULL!', '#fde047', 16)
            pushHud()
          }
        }
      }
      if (w.depth <= 0) {
        if (w.hooked.length) launch()
        else finishDive()
      } else if (live && Math.floor(w.depth / 3) !== Math.floor((w.depth + 44 * dt) / 3)) pushHud()
    } else if (w.mode === 'air') {
      for (const a of w.air) {
        if (a.delay > 0) {
          a.delay -= dt
          if (a.delay <= 0) fx.burst(a.x, -w.camY, { count: 10, color: ['#e0f2fe', '#7dd3fc'], speed: 160, gravity: 400, angle: -Math.PI / 2, spread: 1.4 })
          continue
        }
        a.vy += 900 * u * dt
        a.x += a.vx * dt
        a.y += a.vy * dt
        a.rot += a.vr * dt
        if (a.x < 14 * u || a.x > W - 14 * u) a.vx *= -1
      }
      const fallen = w.air.filter((a) => a.delay <= 0 && a.vy > 0 && a.y > 8 * u)
      for (const a of fallen) fx.burst(a.x, -w.camY, { count: 8, color: ['#e0f2fe', '#7dd3fc'], speed: 120, gravity: 300, angle: -Math.PI / 2, spread: 1.2 })
      w.air = w.air.filter((a) => !fallen.includes(a))
      if (w.demo) {
        // demo shoots automatically
        const tgt = w.air.find((a) => a.delay <= 0 && a.vy > -200 * u && a.kind !== 'jelly')
        if (tgt && Math.random() < 0.05) w.air = w.air.filter((a) => a !== tgt)
      }
      if (w.air.length === 0) finishDive()
    } else if (w.mode === 'summary') {
      w.summaryT -= dt
      if (w.summaryT <= 0 && live && w.hearts > 0) {
        w.summaryT = 99
        openShop()
      }
    }

    // Hooked fish dangle under the lure
    w.hooked.forEach((f, i) => {
      const a = i * 2.4
      f.x = w.lureX + Math.cos(a) * (8 + i * 1.5) * u
      f.m = w.depth + 2.2 + Math.sin(a) * 0.6 + i * 0.25
      f.t += dt * 2
    })

    // Camera
    let target: number
    if (w.mode === 'sink') target = w.depth * ppm - H * 0.32
    else if (w.mode === 'rise') target = w.depth * ppm - H * 0.62
    else if (w.mode === 'air') target = -H * 0.78
    else target = -H * 0.45
    w.camY = approach(w.camY, target, w.mode === 'air' ? 4 : 7, dt)
  }

  // ── Render ────────────────────────────────────────────────
  function frame({ ctx, w: W, h: H, raw, t: time }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const ph = phaseRef.current
    const dt = ph === 'shop' ? 0 : fx.step(raw)
    if (ph === 'shop') fx.step(0)
    if (ph === 'idle' || ph === 'play' || ph === 'dying') step(dt)
    const { u, ppm } = geo()
    const cam = w.camY
    const surf = -cam

    fx.applyShake(ctx)
    // Sky above the surface
    if (surf > 0) drawSky(ctx, W, 0, surf, u, time)
    // Water column
    const top = Math.max(0, surf)
    if (top < H) {
      const m0 = Math.max(0, cam / ppm)
      const m1 = (cam + H) / ppm
      const g = ctx.createLinearGradient(0, top, 0, H)
      g.addColorStop(0, waterAt(m0))
      g.addColorStop(1, waterAt(Math.max(m0, m1)))
      ctx.fillStyle = g
      ctx.fillRect(0, top, W, H - top)
      // light rays near the surface
      const rayA = Math.max(0, 0.18 - m0 / 400)
      if (rayA > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${rayA})`
        for (let i = 0; i < 4; i++) {
          const x0 = ((i * 0.27 + Math.sin(time * 0.3 + i) * 0.03) % 1) * W
          ctx.beginPath()
          ctx.moveTo(x0, top)
          ctx.lineTo(x0 + 40 * u, top)
          ctx.lineTo(x0 + 120 * u, top + 420 * u)
          ctx.lineTo(x0 + 50 * u, top + 420 * u)
          ctx.closePath()
          ctx.fill()
        }
      }
      // marine snow
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      for (const s of snow) {
        const yy = (((s.y * H - cam * s.z * 0.6 - time * 6 * s.z) % H) + H) % H
        if (yy < top) continue
        ctx.globalAlpha = 0.25 + s.z * 0.35
        ctx.fillRect(s.x * W, yy, 1.6 * s.z * u + 0.5, 1.6 * s.z * u + 0.5)
      }
      ctx.globalAlpha = 1
      // depth markers
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.font = `700 ${Math.round(10 * u + 2)}px system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      const step = 50
      for (let m = Math.ceil(m0 / step) * step; m * ppm - cam < H; m += step) {
        if (m <= 0) continue
        const yy = m * ppm - cam
        ctx.fillRect(0, yy, 10 * u, 1.5)
        ctx.fillText(`${m} m`, 13 * u, yy)
      }
      if (w.mode === 'sink' || w.mode === 'rise') {
        // line limit marker
        const ly = w.line * ppm - cam
        if (ly < H && ly > top) {
          ctx.strokeStyle = 'rgba(248,113,113,0.6)'
          ctx.setLineDash([8 * u, 6 * u])
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(0, ly)
          ctx.lineTo(W, ly)
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
    }

    // Fish
    for (const f of w.fish) {
      if (f.gone) continue
      const sy = f.m * ppm - cam
      if (sy < -40 || sy > H + 40) continue
      if (FISH[f.kind].hazard) {
        ctx.globalAlpha = 0.18 + Math.sin(time * 6) * 0.06
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(f.x, sy, FISH[f.kind].size * u * 1.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
      drawFish(ctx, f.kind, f.x, sy, u, f.hooked ? (f.id % 2 ? 1 : -1) : f.vx > 0 ? 1 : -1, f.t)
    }

    // Surface waves + boat
    const rodTip = { x: W / 2 + 46 * u, y: surf - 58 * u }
    if (surf > -80 && surf < H + 80) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)'
      ctx.beginPath()
      ctx.moveTo(0, surf)
      for (let x = 0; x <= W; x += 10) ctx.lineTo(x, surf + Math.sin(x * 0.04 + time * 2) * 2.5 * u)
      ctx.lineTo(W, surf + 4 * u)
      ctx.lineTo(0, surf + 4 * u)
      ctx.fill()
      drawBoat(ctx, W / 2, surf, u, time, rodTip, w.mode === 'air' ? w.lureX : undefined)
    }

    // Line and lure
    const ly = w.depth * ppm - cam
    if (w.mode !== 'air' && (ph !== 'shop' || w.depth > 0)) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(rodTip.x, rodTip.y)
      ctx.lineTo(w.lureX, ly)
      ctx.stroke()
      drawLure(ctx, w.lureX, ly, u, time, w.mode === 'sink' ? w.shield : 0)
      if ((w.mode === 'sink' || w.mode === 'rise') && Math.random() < 0.3) fx.burst(w.lureX, ly - 10 * u, { count: 1, color: 'rgba(255,255,255,0.7)', speed: 20, size: 2, life: 0.8, gravity: -60, drag: 1 })
    }

    // Flying fish
    for (const a of w.air) {
      if (a.delay > 0) continue
      ctx.save()
      ctx.translate(a.x, a.y - cam)
      ctx.rotate(a.rot)
      drawFish(ctx, a.kind, 0, 0, u * 1.1, 1, time)
      ctx.restore()
    }

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const hearts = []
  for (let i = 0; i < hud.hearts; i++) hearts.push(<i key={i} className="df-hook" />)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div
          className="action-arena df-arena"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score df-money">${hud.money}</div>
                <div className="action-hud__small">
                  Dive {Math.max(1, hud.dive)} · line {hud.line} m
                </div>
              </div>
              <div className="action-hud__right">
                <span className="df-hooks">{hearts}</span>
                {hud.mode === 'rise' || hud.mode === 'sink' ? (
                  <span className="action-hud__small">
                    Catch {hud.hooked}/{hud.cap}
                  </span>
                ) : null}
              </div>
            </div>
          )}
          {phase === 'play' && (hud.mode === 'sink' || hud.mode === 'rise') ? (
            <div className={`df-depth${hud.mode === 'rise' ? ' is-rise' : ''}`}>
              {hud.depth}
              <small>m</small>
            </div>
          ) : null}
          {phase === 'play' && hud.mode === 'air' && hud.streak >= 2 ? (
            <div className="df-streak" key={hud.streak}>
              {hud.streak} streak
            </div>
          ) : null}
          {banner && (phase === 'play' || phase === 'dying') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'shop' && (
            <div className="df-shop" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Tackle Shop</h3>
              <p>
                <b>${hud.money}</b> · deepest {world.current.deepest} m
              </p>
              <div className="df-shop__list">
                {shop.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className="df-shop__card"
                    disabled={s.maxed || hud.money < s.price}
                    onClick={() => buy(s.key, s.price)}
                  >
                    <span className="df-shop__icon">
                      <ShopIcon k={s.key} />
                    </span>
                    <strong>{SHOP[s.key].label}</strong>
                    <span>{SHOP[s.key].desc}</span>
                    <em>{s.maxed ? 'MAX' : `$${s.price}`}</em>
                  </button>
                ))}
              </div>
              <button type="button" className="btn btn-primary df-shop__go" onClick={leaveShop}>
                Dive {hud.dive + 1} ▾
              </button>
            </div>
          )}
          {phase === 'idle' && (
            <ActionIdle
              game="fisher"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to steer. Dodge fish on the way down, hook them on the way up, then tap to shoot them out of the sky."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={world.current.deepest >= 250 ? 'Deep sea legend!' : 'Lines all cut'}
            subtitle={`Earned $${world.current.earned} · Deepest ${world.current.deepest} m`}
            celebrate={world.current.deepest >= 250}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}

function ShopIcon({ k }: { k: ShopKey }) {
  return (
    <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="rgba(255,255,255,0.12)" />
      {k === 'line' && (
        <g fill="none" strokeLinecap="round">
          <circle cx="16" cy="16" r="8" stroke="#e2e8f0" strokeWidth="3" />
          <circle cx="16" cy="16" r="3" fill="#94a3b8" />
          <path d="M24 16 Q30 22 26 32" stroke="#fff" strokeWidth="1.6" />
          <path d="M26 32 q-3 0 -3 -3" stroke="#cbd5e1" strokeWidth="2" />
        </g>
      )}
      {k === 'cap' && (
        <g fill="none" strokeLinecap="round">
          <path d="M20 6 V24 Q20 31 14 31 Q9 31 9 25" stroke="#e2e8f0" strokeWidth="3" />
          <path d="M9 25 l3 -3" stroke="#e2e8f0" strokeWidth="3" />
          <path d="M28 12 v8 M24 16 h8" stroke="#86efac" strokeWidth="3" />
        </g>
      )}
      {k === 'shield' && (
        <g>
          <circle cx="20" cy="20" r="11" fill="none" stroke="#7dd3fc" strokeWidth="2.6" />
          <ellipse cx="20" cy="20" rx="4.5" ry="7" fill="#dc2626" />
          <ellipse cx="20" cy="24" rx="4.5" ry="3" fill="#f8fafc" />
        </g>
      )}
      {k === 'gun' && (
        <g>
          <circle cx="20" cy="20" r="11" fill="none" stroke="#fde047" strokeWidth="2.4" />
          <circle cx="20" cy="20" r="5" fill="none" stroke="#fde047" strokeWidth="2" />
          <path d="M20 4 v8 M20 28 v8 M4 20 h8 M28 20 h8" stroke="#fde047" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
      {k === 'heart' && (
        <g fill="none" strokeLinecap="round">
          <circle cx="20" cy="13" r="5" stroke="#f87171" strokeWidth="3" />
          <path d="M20 18 V28 Q20 33 15 33" stroke="#f87171" strokeWidth="3" />
          <path d="M28 22 v6 M25 25 h6" stroke="#86efac" strokeWidth="2.6" />
        </g>
      )}
    </svg>
  )
}
