import { useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'
import { HALF_H, HALF_W, PALETTES, ROOM_LEN, genRoom, paneContains, paneState, type Crystal, type Pane } from './world'

const meta = getGame('smash')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Ball = { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; hit: boolean; spent: boolean }
type Shard = { x: number; y: number; z: number; vx: number; vy: number; vz: number; rot: number; vr: number; tumble: number; vt: number; pts: number[]; life: number; color: string }

const NEAR = 0.35
const FAR = 70
const BALL_R = 0.17
const THROW = 32
const BALL_G = 7

type Game = {
  t: number
  camZ: number
  speed: number
  room: number
  nextRoomZ: number
  panes: Pane[]
  crystals: Crystal[]
  balls: Ball[]
  shards: Shard[]
  ammo: number
  streak: number
  bestStreak: number
  score: number
  cool: number
  inv: number
  crashT: number
  crashSeed: number
  aiT: number
  pal: number
  palK: number
  lastMilestone: number
  stats: { distance: number; rooms: number; glass: number; crystals: number; streak: number }
}

function freshGame(): Game {
  return {
    t: 0,
    camZ: 0,
    speed: 7.5,
    room: 1,
    nextRoomZ: 0,
    panes: [],
    crystals: [],
    balls: [],
    shards: [],
    ammo: 25,
    streak: 0,
    bestStreak: 0,
    score: 0,
    cool: 0,
    inv: 0,
    crashT: 0,
    crashSeed: 1,
    aiT: 0,
    pal: 0,
    palK: 1,
    lastMilestone: 0,
    stats: { distance: 0, rooms: 1, glass: 0, crystals: 0, streak: 0 },
  }
}

const multiFor = (s: number) => (s >= 45 ? 4 : s >= 25 ? 3 : s >= 10 ? 2 : 1)

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function mix(a: string, b: string, k: number) {
  const A = hexToRgb(a)
  const B = hexToRgb(b)
  return `rgb(${Math.round(A[0] + (B[0] - A[0]) * k)},${Math.round(A[1] + (B[1] - A[1]) * k)},${Math.round(A[2] + (B[2] - A[2]) * k)})`
}

export default function SmashGame() {
  const run = useActionRun('smash')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const G = useRef<Game>(freshGame())
  const phaseRef = useRef<Phase>('idle')
  const view = useRef({ W: 360, H: 600, F: 360, cx: 180, cy: 300 })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ ammo: 25, dist: 0, room: 1, multi: 1, streak: 0, score: 0, dark: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const g = G.current
    setHud({ ammo: g.ammo, dist: Math.floor(g.camZ), room: g.room, multi: multiFor(g.streak), streak: g.streak, score: g.score, dark: PALETTES[g.pal].dark })
  }

  function proj(x: number, y: number, z: number): [number, number, number] | null {
    const d = z - G.current.camZ
    if (d < NEAR) return null
    const { F, cx, cy } = view.current
    const k = F / d
    return [cx + x * k, cy - y * k, k]
  }

  function milestone(kind: string, value: number) {
    const g = G.current
    const now = performance.now()
    if (now - g.lastMilestone < 30000) return
    g.lastMilestone = now
    void trackEvent('action_milestone', { game_id: 'smash', kind, value })
  }

  function ensureWorld() {
    const g = G.current
    while (g.nextRoomZ < g.camZ + FAR + 20) {
      const roomNo = Math.round(g.nextRoomZ / ROOM_LEN) + 1
      const out = genRoom(roomNo, g.nextRoomZ)
      g.panes.push(...out.panes)
      g.crystals.push(...out.crystals)
      g.nextRoomZ += ROOM_LEN
    }
  }

  // ── Run lifecycle ──────────────────────────────────────

  function start() {
    void unlockAudio()
    const g = freshGame()
    g.ammo = 25 + run.level('balls') * 5
    G.current = g
    ensureWorld()
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    setBanner({ key: Date.now(), text: 'ROOM 1', sub: 'tap to throw' })
    sfx.ready()
    pushHud()
  }

  function die() {
    if (phaseRef.current !== 'play') return
    const g = G.current
    setPhaseBoth('dying')
    fx.flash('#ffffff', 0.35)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    setBanner({ key: Date.now(), text: 'OUT OF BALLS', sub: `${Math.floor(g.camZ)} m` })
    window.setTimeout(() => {
      setPhaseBoth('over')
      g.stats.distance = Math.floor(g.camZ)
      const coins = Math.round(g.camZ / 40 + g.stats.crystals / 4 + g.room * 2)
      run.end({ score: g.score, cleared: g.room >= 4, stats: { ...g.stats }, coins }, revive)
    }, 1300)
  }

  function revive() {
    const g = G.current
    g.ammo = Math.max(g.ammo, 15)
    g.inv = 2.5
    // Clear the next stretch so the restart is fair.
    for (const p of g.panes) {
      if (!p.broken && p.z > g.camZ && p.z < g.camZ + 16 && p.kind !== 'bar') shatter(p, 0, 0, false)
    }
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: '+15 balls' })
    fx.ring(view.current.cx, view.current.cy, { color: '#ffffff', maxR: 120, life: 0.6 })
    pushHud()
    setPhaseBoth('play')
  }

  // ── Throwing ───────────────────────────────────────────

  function throwAt(sx: number, sy: number) {
    const g = G.current
    if (g.ammo <= 0 || g.cool > 0) return
    const { F, cx, cy } = view.current
    const n = multiFor(g.streak)
    g.ammo -= 1
    g.cool = 0.11
    const dx = (sx - cx) / F
    const dy = -(sy - cy) / F
    // Aim the ball (thrown from just below the eye) so it crosses the tapped ray ~12 m ahead.
    const tx = dx * 12
    const ty = dy * 12 + 0.5 * BALL_G * (12 / THROW) ** 2
    for (let i = 0; i < n; i++) {
      const ox = n > 1 ? (i - (n - 1) / 2) * 0.35 : 0
      const sx0 = ox
      const sy0 = -0.45
      let vx = tx + ox * 0.3 - sx0
      let vy = ty - sy0
      let vz = 12
      const l = Math.hypot(vx, vy, vz)
      vx = (vx / l) * THROW
      vy = (vy / l) * THROW
      vz = (vz / l) * THROW + g.speed
      g.balls.push({ x: sx0, y: sy0, z: g.camZ + 0.5, vx, vy, vz, life: 3.2, hit: false, spent: false })
    }
    if (g.balls.length > 40) g.balls.splice(0, g.balls.length - 40)
    if (phaseRef.current === 'play') {
      sfx.shoot()
      haptic.light()
      if (g.ammo <= 0 && !g.balls.some((b) => !b.spent)) window.setTimeout(() => G.current === g && g.ammo <= 0 && die(), 1600)
    }
    pushHud()
  }

  function shatter(p: Pane, hx: number, hy: number, scoring: boolean) {
    const g = G.current
    p.broken = true
    const { x, a } = paneState(p, g.t)
    const pal = PALETTES[g.pal]
    const cols = p.kind === 'gate' ? 5 : Math.max(2, Math.round(p.hw * 1.6))
    const rows = p.kind === 'gate' ? 4 : Math.max(2, Math.round(p.hh * 1.6))
    const cw = (p.hw * 2) / cols
    const ch = (p.hh * 2) / rows
    const c = Math.cos(a)
    const s = Math.sin(a)
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        if (g.shards.length > 320) g.shards.shift()
        const lx = -p.hw + cw * (i + 0.5)
        const ly = -p.hh + ch * (j + 0.5)
        const wx = x + lx * c - ly * s
        const wy = p.y + lx * s + ly * c
        const ox = wx - hx
        const oy = wy - hy
        const d = Math.hypot(ox, oy) + 0.3
        for (let k = 0; k < 2; k++) {
          const w = cw * rand(0.4, 0.6)
          const h = ch * rand(0.4, 0.6)
          g.shards.push({
            x: wx + rand(-cw, cw) * 0.25,
            y: wy + rand(-ch, ch) * 0.25,
            z: p.z,
            vx: (ox / d) * rand(1, 3.5),
            vy: (oy / d) * rand(1, 3.5) + rand(0, 1.5),
            vz: rand(2, 6) + (scoring ? 0 : g.speed * 0.4),
            rot: rand(0, 6),
            vr: rand(-8, 8),
            tumble: rand(0, 6),
            vt: rand(-10, 10),
            pts: k ? [-w, -h, w, -h * 0.2, -w * 0.3, h] : [w, h, -w, h * 0.3, w * 0.2, -h],
            life: rand(1, 1.8),
            color: p.kind === 'gate' ? pal.accent : pal.glass,
          })
        }
      }
    }
    if (scoring) {
      g.stats.glass += 1
      g.score += p.kind === 'gate' ? 100 : 10
      run.update({ ...g.stats, distance: Math.floor(g.camZ) })
    }
  }

  function crash(p: Pane) {
    const g = G.current
    shatter(p, 0, 0, false)
    if (phaseRef.current !== 'play') return
    if (g.inv > 0) return
    const cost = Math.max(4, 10 - run.level('shield') * 2)
    g.ammo = Math.max(0, g.ammo - cost)
    g.streak = 0
    g.crashT = 1
    g.crashSeed = Math.random() * 100
    g.inv = 0.6
    fx.flash('#ef4444', 0.3)
    fx.shake(14, 0.4)
    fx.stop(0.08)
    fx.text(view.current.cx, view.current.cy - 60, `-${cost}`, '#fca5a5', 30)
    sfx.hurt()
    sfx.boom(0.5)
    haptic.heavy()
    pushHud()
    if (g.ammo <= 0) die()
  }

  // ── Update ─────────────────────────────────────────────

  function hitPane(b: Ball, p: Pane, lx: number, ly: number) {
    const g = G.current
    const play = phaseRef.current === 'play'
    const pr = proj(b.x, b.y, b.z)
    if (p.kind === 'bar') {
      b.vz = -Math.abs(b.vz) * 0.25 + g.speed
      b.vx *= 0.5
      b.spent = true
      if (pr) fx.burst(pr[0], pr[1], { count: 6, color: ['#ffffff', '#fde047'], speed: 120, shape: 'spark', size: 2 })
      if (play) sfx.clang()
      return
    }
    p.hp -= 1
    p.cracks.push({ x: lx, y: ly, seed: Math.random() * 100 })
    b.hit = true
    b.vz *= 0.72
    if (play && !b.spent) {
      g.streak += 1
      g.bestStreak = Math.max(g.bestStreak, g.streak)
      g.stats.streak = g.bestStreak
      const m = multiFor(g.streak)
      if (m > multiFor(g.streak - 1)) {
        setBanner({ key: Date.now(), text: `${m}x BALLS!`, sub: `${g.streak} hit streak` })
        sfx.levelUp()
      }
    }
    b.spent = true
    if (p.hp <= 0) {
      shatter(p, b.x, b.y, play)
      if (pr) {
        fx.burst(pr[0], pr[1], { count: 14, color: ['#ffffff', PALETTES[g.pal].glass, PALETTES[g.pal].accent], speed: 260, shape: 'spark', size: 2.5 })
        if (p.kind === 'gate') fx.ring(pr[0], pr[1], { color: '#ffffff', maxR: 160, life: 0.5 })
      }
      if (play) {
        sfx.slash()
        sfx.pop()
        haptic.light()
        if (p.kind === 'gate') {
          sfx.boom(0.6)
          fx.shake(6, 0.25)
        }
      }
    } else {
      if (pr) fx.burst(pr[0], pr[1], { count: 6, color: ['#ffffff'], speed: 120, shape: 'spark', size: 2 })
      if (play) {
        sfx.tick()
        sfx.hit()
      }
    }
  }

  function update(dt: number, raw: number) {
    const g = G.current
    const ph = phaseRef.current
    if (ph === 'over') return
    g.t += dt
    g.cool = Math.max(0, g.cool - raw)
    g.inv = Math.max(0, g.inv - dt)
    g.crashT = Math.max(0, g.crashT - raw)
    g.palK = Math.min(1, g.palK + raw * 0.8)
    const speed = ph === 'dying' ? 0 : g.speed
    const prevZ = g.camZ
    g.camZ += speed * dt
    ensureWorld()

    // Camera crossing obstacles
    for (const p of g.panes) {
      if (p.broken || p.z <= prevZ || p.z > g.camZ) continue
      if (p.kind === 'gate') {
        crash(p)
        enterRoom(p.room + 1)
      } else if (p.kind === 'glass' && paneContains(p, g.t, 0, 0, -0.22)) crash(p)
    }
    // Room transition for gates already broken
    for (const p of g.panes) {
      if (p.kind === 'gate' && p.broken && p.z <= g.camZ && p.z > prevZ) enterRoom(p.room + 1)
    }
    g.panes = g.panes.filter((p) => p.z > g.camZ - 1)
    g.crystals = g.crystals.filter((c) => c.z > g.camZ - 1)

    // Balls
    const sub = 3
    const h = dt / sub
    for (const b of g.balls) {
      for (let k = 0; k < sub; k++) {
        const oz = b.z
        b.vy -= BALL_G * h
        b.x += b.vx * h
        b.y += b.vy * h
        b.z += b.vz * h
        if (b.x < -HALF_W + BALL_R) {
          b.x = -HALF_W + BALL_R
          b.vx = Math.abs(b.vx) * 0.6
        } else if (b.x > HALF_W - BALL_R) {
          b.x = HALF_W - BALL_R
          b.vx = -Math.abs(b.vx) * 0.6
        }
        if (b.y < -HALF_H + BALL_R) {
          b.y = -HALF_H + BALL_R
          b.vy = Math.abs(b.vy) * 0.45
          b.vz *= 0.92
        } else if (b.y > HALF_H - BALL_R) {
          b.y = HALF_H - BALL_R
          b.vy = -Math.abs(b.vy) * 0.5
        }
        for (const p of g.panes) {
          if (p.broken) continue
          if ((oz - p.z) * (b.z - p.z) > 0) continue
          const loc = paneContains(p, g.t, b.x, b.y, BALL_R * 0.6)
          if (loc) {
            hitPane(b, p, loc.lx, loc.ly)
            break
          }
        }
        for (const c of g.crystals) {
          if (c.taken) continue
          if (Math.abs(c.z - b.z) < c.r + BALL_R + 0.25 && Math.hypot(c.x - b.x, c.y - b.y) < c.r + BALL_R + 0.12) takeCrystal(c, b)
        }
      }
      b.life -= dt
    }
    const gone = g.balls.filter((b) => b.life <= 0 || b.z < g.camZ - 0.3 || b.z > g.camZ + FAR)
    if (gone.length) {
      for (const b of gone) {
        if (!b.hit && !b.spent && ph === 'play' && g.streak > 0) {
          g.streak = 0
          pushHud()
        }
      }
      g.balls = g.balls.filter((b) => !gone.includes(b))
      if (ph === 'play' && g.ammo <= 0 && !g.balls.length) die()
    }

    // Shards
    for (const s of g.shards) {
      s.vy -= 9 * dt
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.z += s.vz * dt
      s.rot += s.vr * dt
      s.tumble += s.vt * dt
      s.life -= dt
      if (s.y < -HALF_H) {
        s.y = -HALF_H
        s.vy = Math.abs(s.vy) * 0.3
        s.vx *= 0.7
        s.vz *= 0.7
      }
    }
    g.shards = g.shards.filter((s) => s.life > 0 && s.z > g.camZ + NEAR)

    // Attract mode: auto-throw at blocking glass and crystals
    if (ph === 'idle') {
      g.aiT -= dt
      if (g.aiT <= 0) {
        const target =
          g.panes.find((p) => !p.broken && p.kind !== 'bar' && p.z - g.camZ > 7 && p.z - g.camZ < 15 && (p.kind === 'gate' || paneContains(p, g.t, 0, 0, -0.1))) ??
          g.crystals.find((c) => !c.taken && c.z - g.camZ > 6 && c.z - g.camZ < 13)
        if (target) {
          const tz = 'hw' in target ? target.z : target.z
          const tx = 'hw' in target ? paneState(target, g.t).x : target.x
          const pr = proj(tx, target.y, tz)
          if (pr) {
            g.ammo = 99
            throwAt(pr[0] + rand(-6, 6), pr[1] + rand(-6, 6))
          }
          g.aiT = 0.35
        } else g.aiT = 0.15
      }
    }

    // Distance score
    if (ph === 'play') {
      const m = Math.floor(g.camZ)
      if (m !== Math.floor(prevZ)) {
        g.score += 1
        if (m % 100 === 0 && m > 0) {
          fx.text(view.current.cx, view.current.cy - 120, `${m} m`, '#ffffff', 22)
          sfx.score(3)
        }
        if (m % 5 === 0) pushHud()
        if (m % 25 === 0) {
          g.stats.distance = m
          run.update({ ...g.stats })
        }
      }
    }
  }

  function takeCrystal(c: Crystal, b: Ball) {
    const g = G.current
    c.taken = true
    b.hit = true
    const gain = (c.big ? 5 : 3) + run.level('crystal')
    const pr = proj(c.x, c.y, c.z)
    if (pr) {
      fx.burst(pr[0], pr[1], { count: 18, color: ['#a5f3fc', '#ffffff', '#22d3ee'], speed: 240, shape: 'spark', size: 2.5 })
      fx.ring(pr[0], pr[1], { color: '#67e8f9', maxR: 50, life: 0.35 })
    }
    if (phaseRef.current !== 'play') return
    g.ammo += gain
    g.stats.crystals += 1
    g.score += 50
    g.streak += 1
    g.bestStreak = Math.max(g.bestStreak, g.streak)
    g.stats.streak = g.bestStreak
    if (pr) fx.text(pr[0], pr[1] - 20, `+${gain}`, '#22d3ee', 22)
    sfx.power()
    sfx.score(Math.min(8, Math.floor(g.streak / 3)))
    haptic.medium()
    run.update({ ...g.stats, distance: Math.floor(g.camZ) })
    pushHud()
  }

  function enterRoom(n: number) {
    const g = G.current
    if (n <= g.room) return
    g.room = n
    g.pal = (n - 1) % PALETTES.length
    g.palK = 0
    g.speed = Math.min(13.5, 7.5 + (n - 1) * 0.45)
    if (phaseRef.current !== 'play') return
    g.stats.rooms = n
    g.score += 250
    setBanner({ key: Date.now(), text: `ROOM ${n}`, sub: n % 5 === 0 ? 'checkpoint · speed up' : 'speed up' })
    sfx.levelUp()
    haptic.success()
    if (n % 5 === 0) milestone('room', n)
    run.update({ ...g.stats, distance: Math.floor(g.camZ) })
    pushHud()
  }

  // ── Input ──────────────────────────────────────────────

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    throwAt(p.x, p.y)
  }

  // ── Render ─────────────────────────────────────────────

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    const F = Math.min(W * 1.0, H * 0.75)
    view.current = { W, H, F, cx: W / 2, cy: H * 0.46 }
    const g = G.current
    const ph = phaseRef.current
    if (ph === 'idle' && !g.panes.length) ensureWorld()
    const dt = fx.step(raw)
    update(dt, raw)
    const prevPal = PALETTES[(g.pal + PALETTES.length - 1) % PALETTES.length]
    const pal0 = PALETTES[g.pal]
    const k = g.palK
    const col = (key: 'fog' | 'near' | 'floor' | 'ceil' | 'line') => (k >= 1 ? pal0[key] : mix(prevPal[key], pal0[key], k))
    const fog = col('fog')
    const { cx, cy } = view.current

    ctx.fillStyle = fog
    ctx.fillRect(0, 0, W, H)
    fx.applyShake(ctx)

    // Corridor surfaces
    const zn = g.camZ + NEAR + 0.02
    const zf = g.camZ + FAR
    const quad = (pts: Array<[number, number, number]>, fill: string | CanvasGradient) => {
      ctx.fillStyle = fill
      ctx.beginPath()
      pts.forEach(([x, y, z], i) => {
        const p = proj(x, y, z)!
        if (i) ctx.lineTo(p[0], p[1])
        else ctx.moveTo(p[0], p[1])
      })
      ctx.closePath()
      ctx.fill()
    }
    // Gradients run from ~1.2 m (vivid) to ~45 m (fog) so the visible part of every wall carries colour.
    const pn = proj(HALF_W, HALF_H, g.camZ + 1.2)!
    const pfar = proj(HALF_W, HALF_H, g.camZ + 45)!
    const grad = (a: number, b: number, vertical: boolean, c0: string) => {
      const gr = vertical ? ctx.createLinearGradient(0, a, 0, b) : ctx.createLinearGradient(a, 0, b, 0)
      gr.addColorStop(0, c0)
      gr.addColorStop(0.55, mix(c0.startsWith('#') ? c0 : pal0.near, pal0.fog, 0.6))
      gr.addColorStop(1, fog)
      return gr
    }
    quad([[-HALF_W, -HALF_H, zn], [HALF_W, -HALF_H, zn], [HALF_W, -HALF_H, zf], [-HALF_W, -HALF_H, zf]], grad(cy + (cy - pn[1]), cy + (cy - pfar[1]), true, col('floor')))
    quad([[-HALF_W, HALF_H, zn], [HALF_W, HALF_H, zn], [HALF_W, HALF_H, zf], [-HALF_W, HALF_H, zf]], grad(pn[1], pfar[1], true, col('ceil')))
    quad([[-HALF_W, -HALF_H, zn], [-HALF_W, HALF_H, zn], [-HALF_W, HALF_H, zf], [-HALF_W, -HALF_H, zf]], grad(cx - (pn[0] - cx), cx - (pfar[0] - cx), false, col('near')))
    quad([[HALF_W, -HALF_H, zn], [HALF_W, HALF_H, zn], [HALF_W, HALF_H, zf], [HALF_W, -HALF_H, zf]], grad(pn[0], pfar[0], false, col('near')))
    // Corner edges
    ctx.strokeStyle = col('line')
    ctx.globalAlpha = 0.6
    ctx.lineWidth = 2
    ctx.beginPath()
    for (const [x, y] of [[-HALF_W, -HALF_H], [HALF_W, -HALF_H], [-HALF_W, HALF_H], [HALF_W, HALF_H]] as const) {
      const a = proj(x, y, zn)!
      const b = proj(x, y, zf)!
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
    }
    ctx.stroke()
    ctx.globalAlpha = 1
    // Vanishing glow
    const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(30, (pfar[0] - cx) * 3))
    vg.addColorStop(0, '#ffffff')
    vg.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.globalAlpha = pal0.dark ? 0.25 : 0.7
    ctx.fillStyle = vg
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1
    // Rings + rails for speed
    const line = col('line')
    ctx.strokeStyle = line
    const step = 3
    for (let z = Math.ceil(zn / step) * step; z < zf; z += step) {
      const a = proj(-HALF_W, -HALF_H, z)
      const b = proj(HALF_W, HALF_H, z)
      if (!a || !b) continue
      const d = z - g.camZ
      ctx.globalAlpha = Math.max(0, 0.5 * (1 - d / FAR))
      ctx.lineWidth = Math.max(0.5, 3 / d)
      ctx.strokeRect(a[0], b[1], b[0] - a[0], a[1] - b[1])
    }
    ctx.globalAlpha = 0.35
    ctx.lineWidth = 1
    ctx.beginPath()
    for (const x of [-2, -1, 0, 1, 2]) {
      const a = proj(x, -HALF_H, zn)!
      const b = proj(x, -HALF_H, zf)!
      ctx.moveTo(a[0], a[1])
      ctx.lineTo(b[0], b[1])
    }
    for (const y of [-1, 0, 1]) {
      for (const x of [-HALF_W, HALF_W]) {
        const a = proj(x, y, zn)!
        const b = proj(x, y, zf)!
        ctx.moveTo(a[0], a[1])
        ctx.lineTo(b[0], b[1])
      }
    }
    ctx.stroke()
    ctx.globalAlpha = 1

    // Depth-sorted drawables
    type D = { z: number; draw: () => void }
    const list: D[] = []
    for (const p of g.panes) if (!p.broken && p.z > zn && p.z < zf) list.push({ z: p.z, draw: () => drawPane(ctx, p) })
    for (const c of g.crystals) if (!c.taken && c.z > zn && c.z < zf) list.push({ z: c.z, draw: () => drawCrystal(ctx, c, t) })
    for (const s of g.shards) list.push({ z: s.z, draw: () => drawShard(ctx, s) })
    for (const b of g.balls) if (b.z > zn) list.push({ z: b.z, draw: () => drawBall(ctx, b) })
    list.sort((a, b) => b.z - a.z)
    for (const d of list) d.draw()

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)

    // Crash cracks on the "lens"
    if (g.crashT > 0) {
      ctx.globalAlpha = g.crashT
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      const ox = cx + (Math.sin(g.crashSeed) * W) / 5
      const oy = cy + (Math.cos(g.crashSeed) * H) / 6
      ctx.beginPath()
      for (let i = 0; i < 9; i++) {
        let a = (i / 9) * Math.PI * 2 + g.crashSeed
        let x = ox
        let y = oy
        ctx.moveTo(x, y)
        for (let j = 0; j < 4; j++) {
          a += Math.sin(g.crashSeed * (i + 1) + j) * 0.4
          const len = 30 + ((i * 37 + j * 53) % 40)
          x += Math.cos(a) * len
          y += Math.sin(a) * len
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    // Speed streaks
    if (ph === 'play' && g.speed > 9) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + Math.sin(t * 3 + i) * 0.3
        const r0 = ((t * 900 + i * 97) % (W * 0.7)) + W * 0.15
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0)
        ctx.lineTo(cx + Math.cos(a) * (r0 + 30), cy + Math.sin(a) * (r0 + 30))
      }
      ctx.stroke()
    }
  }

  function fogA(z: number) {
    const d = z - G.current.camZ
    return clamp(1 - (d - FAR * 0.55) / (FAR * 0.45), 0, 1)
  }

  function drawPane(ctx: CanvasRenderingContext2D, p: Pane) {
    const g = G.current
    const { x, a } = paneState(p, g.t)
    const pr = proj(x, p.y, p.z)
    if (!pr) return
    const [sx, sy, k] = pr
    const pal = PALETTES[g.pal]
    ctx.save()
    ctx.globalAlpha = fogA(p.z)
    ctx.translate(sx, sy)
    ctx.scale(k, -k)
    ctx.rotate(a)
    const lw = 1.6 / k
    if (p.kind === 'bar') {
      ctx.fillStyle = pal.dark ? '#64748b' : '#334155'
      ctx.fillRect(-p.hw, -p.hh, p.hw * 2, p.hh * 2)
      ctx.fillStyle = pal.dark ? '#94a3b8' : '#475569'
      ctx.fillRect(-p.hw, p.hh - Math.min(0.12, p.hh * 0.4), p.hw * 2, Math.min(0.12, p.hh * 0.4))
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = lw
      ctx.strokeRect(-p.hw, -p.hh, p.hw * 2, p.hh * 2)
      // hazard stripes
      ctx.strokeStyle = 'rgba(250,204,21,0.7)'
      ctx.lineWidth = Math.min(p.hw, p.hh) * 0.35
      ctx.beginPath()
      for (let u = -p.hw; u < p.hw; u += Math.min(p.hw, p.hh) * 1.4) {
        ctx.moveTo(u, -p.hh * 0.6)
        ctx.lineTo(u + Math.min(p.hw, p.hh) * 0.6, p.hh * 0.6)
      }
      ctx.stroke()
    } else {
      const gate = p.kind === 'gate'
      const thick = p.maxHp > 1
      ctx.fillStyle = gate ? `${pal.accent}55` : thick ? `${pal.glass}aa` : `${pal.glass}55`
      ctx.fillRect(-p.hw, -p.hh, p.hw * 2, p.hh * 2)
      ctx.strokeStyle = gate ? pal.accent : '#ffffff'
      ctx.lineWidth = lw * (gate ? 2.5 : 1.5)
      ctx.strokeRect(-p.hw, -p.hh, p.hw * 2, p.hh * 2)
      // gloss streaks
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'
      ctx.lineWidth = lw * 1.4
      ctx.beginPath()
      const m = Math.min(p.hw, p.hh)
      ctx.moveTo(-p.hw + m * 0.2, p.hh - m * 0.8)
      ctx.lineTo(-p.hw + m * 0.8, p.hh - m * 0.2)
      ctx.moveTo(-p.hw + m * 0.2, p.hh - m * 1.25)
      ctx.lineTo(-p.hw + m * 1.25, p.hh - m * 0.2)
      ctx.stroke()
      if (gate) {
        // pips showing hits left
        for (let i = 0; i < p.maxHp; i++) {
          ctx.fillStyle = i < p.hp ? '#ffffff' : 'rgba(255,255,255,0.25)'
          ctx.beginPath()
          ctx.arc((i - (p.maxHp - 1) / 2) * 0.35, 0, 0.1, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      // cracks
      if (p.cracks.length) {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'
        ctx.lineWidth = lw
        ctx.beginPath()
        for (const c of p.cracks) {
          for (let i = 0; i < 7; i++) {
            let ang = (i / 7) * Math.PI * 2 + c.seed
            let px = c.x
            let py = c.y
            ctx.moveTo(px, py)
            for (let j = 0; j < 3; j++) {
              ang += Math.sin(c.seed + i * 3 + j) * 0.5
              const len = 0.25 + ((i * 13 + j * 7) % 5) * 0.06
              px = clamp(px + Math.cos(ang) * len, -p.hw, p.hw)
              py = clamp(py + Math.sin(ang) * len, -p.hh, p.hh)
              ctx.lineTo(px, py)
            }
          }
        }
        ctx.stroke()
      }
    }
    ctx.restore()
  }

  function drawCrystal(ctx: CanvasRenderingContext2D, c: Crystal, t: number) {
    const bob = Math.sin(t * 2 + c.ph) * 0.08
    const pr = proj(c.x, c.y + bob, c.z)
    if (!pr) return
    const [sx, sy, k] = pr
    const r = c.r * k
    const rot = t * 1.8 + c.ph
    ctx.save()
    ctx.globalAlpha = fogA(c.z)
    // glow
    const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3)
    gl.addColorStop(0, 'rgba(103,232,249,0.55)')
    gl.addColorStop(1, 'rgba(103,232,249,0)')
    ctx.fillStyle = gl
    ctx.beginPath()
    ctx.arc(sx, sy, r * 3, 0, Math.PI * 2)
    ctx.fill()
    // octahedron facets
    const top: [number, number] = [sx, sy - r * 1.5]
    const bot: [number, number] = [sx, sy + r * 1.5]
    const eq = [0, 1, 2, 3].map((i) => {
      const a = rot + (i * Math.PI) / 2
      return { x: sx + Math.cos(a) * r, d: Math.sin(a), a }
    })
    const faces = eq.map((e, i) => ({ e, n: eq[(i + 1) % 4] })).filter(({ e, n }) => e.d + n.d < 0.4)
    faces.sort((a, b) => b.e.d + b.n.d - (a.e.d + a.n.d))
    for (const { e, n } of faces) {
      const shade = 0.55 + 0.45 * Math.cos((e.a + n.a) / 2 - 0.6)
      for (const [apex, light] of [[top, 1], [bot, 0.75]] as const) {
        ctx.fillStyle = `rgba(${Math.round(80 + 140 * shade * light)},${Math.round(200 + 50 * shade * light)},255,0.95)`
        ctx.beginPath()
        ctx.moveTo(apex[0], apex[1])
        ctx.lineTo(e.x, sy)
        ctx.lineTo(n.x, sy)
        ctx.closePath()
        ctx.fill()
      }
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'
    ctx.lineWidth = Math.max(0.6, k * 0.02)
    ctx.beginPath()
    ctx.moveTo(top[0], top[1])
    ctx.lineTo(bot[0], bot[1])
    ctx.stroke()
    ctx.restore()
  }

  function drawShard(ctx: CanvasRenderingContext2D, s: Shard) {
    const pr = proj(s.x, s.y, s.z)
    if (!pr) return
    const [sx, sy, k] = pr
    ctx.save()
    ctx.globalAlpha = Math.min(1, s.life * 1.5) * fogA(s.z)
    ctx.translate(sx, sy)
    ctx.rotate(s.rot)
    ctx.scale(k * Math.max(0.15, Math.abs(Math.cos(s.tumble))), k)
    ctx.fillStyle = `${s.color}cc`
    ctx.beginPath()
    ctx.moveTo(s.pts[0], s.pts[1])
    ctx.lineTo(s.pts[2], s.pts[3])
    ctx.lineTo(s.pts[4], s.pts[5])
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 1.2 / k
    ctx.stroke()
    ctx.restore()
  }

  function drawBall(ctx: CanvasRenderingContext2D, b: Ball) {
    const pr = proj(b.x, b.y, b.z)
    if (!pr) return
    const [sx, sy, k] = pr
    const r = Math.max(1.5, BALL_R * k)
    const sh = proj(b.x, -HALF_H, b.z)
    ctx.globalAlpha = fogA(b.z)
    if (sh) {
      ctx.fillStyle = 'rgba(15,23,42,0.18)'
      ctx.beginPath()
      ctx.ellipse(sh[0], sh[1], r * 1.1, r * 0.35, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    const gr = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.1, sx, sy, r)
    gr.addColorStop(0, '#ffffff')
    gr.addColorStop(0.5, '#94a3b8')
    gr.addColorStop(1, '#1e293b')
    ctx.fillStyle = gr
    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud" style={hud.dark ? undefined : { color: '#0f172a', textShadow: '0 1px 0 rgba(255,255,255,0.7)' }}>
              <div>
                <div className="action-hud__small">Room {hud.room}</div>
                <div className="action-hud__small">{hud.dist} m</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="action-hud__score" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                  <span
                    aria-hidden
                    style={{
                      width: '1.05rem',
                      height: '1.05rem',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 35% 30%, #fff, #94a3b8 50%, #1e293b)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                  />
                  {hud.ammo}
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4 }}>
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: i <= hud.multi ? '#0ea5e9' : 'rgba(15,23,42,0.2)' }} />
                  ))}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">{hud.score}</span>
                <span className="action-hud__small">streak {hud.streak}</span>
              </div>
            </div>
          )}
          {banner && (phase === 'play' || phase === 'dying') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)} style={hud.dark ? undefined : { color: '#0f172a', textShadow: '0 2px 0 rgba(255,255,255,0.8)' }}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="smash"
              icon={meta.icon}
              title={meta.title}
              hint="Tap to throw balls. Smash the glass in your path, hit crystals for more balls — run out and it is over."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.room >= 4 ? 'Glass breaker!' : 'Out of balls!'}
            subtitle={`${hud.dist} m · Room ${hud.room} · Score ${hud.score}`}
            celebrate={hud.room >= 4}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
