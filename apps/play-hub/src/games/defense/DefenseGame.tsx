import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, dist, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'
import { drawArmored, drawCruise, drawDread, drawEdgeWarning, drawLaser, drawReticle, drawSatellite } from './art'
import './defense.css'
import { THEMES, drawSkyLive, drawWeather, freshSky, stepSky, themeForWave, themeLayer, type Sky } from './themes'

const meta = getGame('defense')

type Phase = 'idle' | 'play' | 'between' | 'dying' | 'over'

type City = { x: number; alive: boolean; smoke: number }
type Battery = { x: number; ammo: number; alive: boolean }
type Missile = {
  sx: number
  sy: number
  x: number
  y: number
  tx: number
  ty: number
  speed: number
  mirv: boolean
  smart: boolean
  dead: boolean
  /** Armoured warheads need two different blasts: the first cracks the casing. */
  armor: number
  crack: number
}
type Interceptor = { sx: number; sy: number; x: number; y: number; tx: number; ty: number; mega: boolean }
type Blast = { x: number; y: number; t: number; max: number; grow: number; hold: number; chain: number; enemy: boolean; mega?: boolean }
/** Dreadnought laser: cooldown, charge-up (telegraph), beam display. */
type Laser = { cd: number; charge: number; tx: number; beam: number; ticks: number }
/** Bombers cross once; a mothership (every 5th wave) takes 3 hits and makes two passes; a dreadnought (every 10th) patrols until destroyed. */
type Bomber = { kind: 'bomber' | 'mother' | 'dread'; x: number; y: number; vx: number; drop: number; hp: number; maxHp: number; hitCd: number; passes: number; flash: number; laser?: Laser }
type Crate = { x: number; y: number; sway: number }
/** Low cruise missile: edge warning, weaving flight, then a dive onto its target. */
type Cruise = { x: number; y: number; baseY: number; vx: number; ph: number; tx: number; ty: number; warn: number; diving: boolean; dead: boolean; a: number }
type Sat = { x: number; y: number; vx: number }

const LASER_CHARGE = 2.2
const DREAD_HP = 6

const AMMO = 10
const BLAST_R = 46

type World = {
  cities: City[]
  batteries: Battery[]
  missiles: Missile[]
  shots: Interceptor[]
  blasts: Blast[]
  bomber: Bomber | null
  crate: Crate | null
  crateDone: boolean
  cruise: Cruise[]
  sat: Sat | null
  satDone: boolean
  mega: number
  theme: number
  prevTheme: number
  themeFade: number
  sky: Sky
  wave: number
  toSpawn: number
  spawnTimer: number
  lostThisWave: boolean
  chainId: number
  chains: Record<number, number>
  score: number
  ammoMax: number
  blastR: number
  shields: number
  stats: { score: number; kills: number; wave: number; chain: number; perfect: number }
}

function freshWorld(W: number): World {
  const cities = [0.2, 0.3, 0.4, 0.6, 0.7, 0.8].map((k) => ({ x: W * k, alive: true, smoke: 0 }))
  const batteries = [0.07, 0.5, 0.93].map((k) => ({ x: W * k, ammo: AMMO, alive: true }))
  return {
    cities,
    batteries,
    missiles: [],
    shots: [],
    blasts: [],
    bomber: null,
    crate: null,
    crateDone: false,
    cruise: [],
    sat: null,
    satDone: true,
    mega: 0,
    theme: 0,
    prevTheme: 0,
    themeFade: 1,
    sky: freshSky(),
    wave: 0,
    toSpawn: 0,
    spawnTimer: 0,
    lostThisWave: false,
    chainId: 1,
    chains: {},
    score: 0,
    ammoMax: AMMO,
    blastR: BLAST_R,
    shields: 0,
    stats: { score: 0, kills: 0, wave: 0, chain: 0, perfect: 0 },
  }
}

export default function DefenseGame() {
  const run = useActionRun('defense')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 520 })
  const world = useRef<World>(freshWorld(360))
  const phaseRef = useRef<Phase>('idle')
  const betweenTimer = useRef(0)
  const lastMilestone = useRef(0)
  const devGod = useRef(false)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, wave: 1, shields: 0, mega: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [zone, setZone] = useState<{ key: number; name: string; sub: string; color: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function groundY() {
    return size.current.h - 46
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, wave: w.wave, shields: w.shields, mega: w.mega })
  }

  function milestone(kind: string, value: number) {
    const now = performance.now()
    if (now - lastMilestone.current < 30000) return
    lastMilestone.current = now
    void trackEvent('action_milestone', { game_id: 'defense', kind, value })
  }

  function start() {
    void unlockAudio()
    const w = freshWorld(size.current.w)
    w.ammoMax = AMMO + run.level('ammo') * 2
    w.blastR = BLAST_R * (1 + run.level('blast') * 0.1)
    w.shields = run.level('shield')
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    nextWave()
  }

  function addScore(n: number) {
    const w = world.current
    w.score += n
    w.stats.score = w.score
    pushHud()
  }

  function nextWave() {
    const w = world.current
    const { w: W, h: H } = size.current
    w.wave += 1
    w.stats.wave = w.wave
    w.toSpawn = 8 + w.wave * 3
    w.spawnTimer = 1
    w.lostThisWave = false
    w.crateDone = w.wave < 2
    w.satDone = w.wave < 3 || Math.random() < 0.4
    for (const b of w.batteries) {
      b.alive = true
      b.ammo = w.ammoMax
    }
    pushHud()
    run.update(w.stats)
    const boss = w.wave % 5 === 0
    const dread = boss && w.wave % 10 === 0
    if (dread) {
      const left = Math.random() < 0.5
      w.bomber = {
        kind: 'dread', x: left ? -70 : W + 70, y: H * 0.13, vx: left ? 28 : -28, drop: 3, hp: DREAD_HP, maxHp: DREAD_HP, hitCd: 0, passes: 0, flash: 0,
        laser: { cd: 6, charge: 0, tx: 0, beam: 0, ticks: 0 },
      }
      // Arrival sting: rumble, two clangs, deep boom.
      sfx.boom(0.8)
      window.setTimeout(() => sfx.clang(), 260)
      window.setTimeout(() => sfx.clang(), 460)
      window.setTimeout(() => sfx.boom(0.6), 720)
      fx.flash('#ef4444', 0.15)
      fx.shake(8, 0.6)
      haptic.heavy()
    } else if (boss) {
      const left = Math.random() < 0.5
      w.bomber = { kind: 'mother', x: left ? -60 : W + 60, y: H * 0.14, vx: left ? 34 : -34, drop: 2, hp: 3, maxHp: 3, hitCd: 0, passes: 0, flash: 0 }
      sfx.boom(0.5)
    }
    setBanner({
      key: Date.now(),
      text: dread ? 'DREADNOUGHT' : boss ? `WAVE ${w.wave} · MOTHERSHIP` : `WAVE ${w.wave}`,
      sub: w.wave === 1 ? 'tap the sky to intercept'
      : dread ? `wave ${w.wave} · hits jam its laser`
      : boss ? 'hit it 3 times'
      : w.wave === 3 ? 'MIRVs split mid-air'
      : w.wave === 6 ? 'smart bombs dodge blasts'
      : w.wave === 7 ? 'cruise missiles fly in low'
      : w.wave === 8 ? 'armored warheads need 2 blasts'
      : undefined,
    })
    sfx.levelUp()
    const nt = themeForWave(w.wave)
    if (nt !== w.theme) {
      w.prevTheme = w.theme
      w.theme = nt
      w.themeFade = 0
      w.sky.motes = []
      const th = THEMES[nt]
      setZone({ key: Date.now() + Math.random(), name: th.name, sub: th.sub, color: th.accent })
      sfx.whoosh()
      window.setTimeout(() => sfx.ready(), 200)
    }
  }

  function pickTarget(): { x: number; y: number } {
    const w = world.current
    const gy = groundY()
    const targets = [
      ...w.cities.filter((c) => c.alive).map((c) => ({ x: c.x, y: gy })),
      ...w.batteries.filter((b) => b.alive).map((b) => ({ x: b.x, y: gy - 6 })),
    ]
    if (targets.length === 0) return { x: rand(0, size.current.w), y: gy }
    return targets[Math.floor(Math.random() * targets.length)]
  }

  function launchMissile(sx: number, sy: number, opts: { mirv?: boolean; smart?: boolean; armored?: boolean } = {}) {
    const w = world.current
    const tgt = pickTarget()
    // Very gentle first waves, then ramps.
    const speed = (34 + w.wave * 6) * (opts.smart ? 1.6 : 1) * (opts.armored ? 0.7 : 1) * rand(0.85, 1.15)
    w.missiles.push({ sx, sy, x: sx, y: sy, tx: tgt.x, ty: tgt.y, speed, mirv: !!opts.mirv, smart: !!opts.smart, dead: false, armor: opts.armored ? 1 : 0, crack: 0 })
  }

  function spawnCruise() {
    const w = world.current
    const { w: W, h: H } = size.current
    const left = Math.random() < 0.5
    const y = H * rand(0.4, 0.55)
    const tgt = pickTarget()
    w.cruise.push({ x: left ? -20 : W + 20, y, baseY: y, vx: (left ? 1 : -1) * (58 + w.wave * 3), ph: rand(0, 6), tx: tgt.x, ty: tgt.y, warn: 1.2, diving: false, dead: false, a: left ? 0 : Math.PI })
    sfx.tick()
  }

  function spawnSat() {
    const w = world.current
    const { w: W, h: H } = size.current
    const left = Math.random() < 0.5
    w.sat = { x: left ? -30 : W + 30, y: H * rand(0.22, 0.32), vx: left ? 36 : -36 }
    fx.text(left ? 80 : W - 80, w.sat.y + 30, 'GOLD SATELLITE', '#fde047', 15)
    sfx.ready()
  }

  /** Score a kill caught in a blast; the secondary explosion keeps the chain alive. */
  function chainKill(x: number, y: number, b: Blast, base = 25) {
    const w = world.current
    const chainLen = (w.chains[b.chain] ?? 0) + 1
    w.chains[b.chain] = chainLen
    w.stats.kills += 1
    w.stats.chain = Math.max(w.stats.chain, chainLen)
    const pts = base * chainLen
    addScore(pts)
    fx.text(x, y - 12, chainLen >= 2 ? `CHAIN ×${chainLen}` : `+${pts}`, chainLen >= 3 ? '#fde047' : '#fff', 13 + Math.min(chainLen, 6) * 2)
    sfx.score(chainLen)
    haptic.light()
    boomAt(x, y, b.chain, 30)
    if (chainLen >= 5 && chainLen % 5 === 0) {
      fx.slowmo(0.5, 0.35)
      sfx.combo()
      haptic.medium()
      setBanner({ key: Date.now(), text: `CHAIN ×${chainLen}!`, sub: 'chain reaction' })
    }
    run.update(w.stats)
  }

  function spawnWaveUnit() {
    const w = world.current
    const { w: W, h: H } = size.current
    const r = Math.random()
    if (w.wave >= 4 && !w.bomber && r < 0.1) {
      const left = Math.random() < 0.5
      w.bomber = { kind: 'bomber', x: left ? -40 : W + 40, y: H * rand(0.12, 0.22), vx: left ? 60 : -60, drop: 1.2, hp: 1, maxHp: 1, hitCd: 0, passes: 0, flash: 0 }
      sfx.whoosh()
      return
    }
    if (!w.crateDone && w.toSpawn < 8 + w.wave * 1.5 && Math.random() < 0.35) {
      w.crateDone = true
      w.crate = { x: rand(W * 0.2, W * 0.8), y: -30, sway: rand(0, 6) }
      fx.text(w.crate.x, 40, 'SUPPLY DROP', '#86efac', 15)
      sfx.ready()
    }
    if (!w.satDone && !w.sat && w.toSpawn < 6 + w.wave * 2 && Math.random() < 0.3) {
      w.satDone = true
      spawnSat()
    }
    if (w.wave >= 7 && r >= 0.2 && r < 0.3 && w.cruise.length < 3) {
      spawnCruise()
      return
    }
    launchMissile(rand(0, W), -10, { mirv: w.wave >= 3 && r < 0.18, smart: w.wave >= 6 && r > 0.88, armored: w.wave >= 8 && r >= 0.3 && r < 0.38 })
  }

  function boomAt(x: number, y: number, chain: number, radius = world.current.blastR, mega = false) {
    const w = world.current
    w.blasts.push({ x, y, t: 0, max: radius, grow: 0.3, hold: mega ? 0.6 : 0.45, chain, enemy: false, mega })
    fx.burst(x, y, { count: mega ? 22 : 10, color: mega ? ['#fef08a', '#f59e0b', '#ffffff'] : ['#fde047', '#fb923c', '#fff7ed'], speed: mega ? 280 : 180, shape: 'spark', gravity: 0, life: 0.4 })
    if (mega) fx.ring(x, y, { color: '#fde047', maxR: radius * 1.2, life: 0.4, width: 4 })
    fx.shake(mega ? 6 : radius > 40 ? 3 : 2, 0.12)
  }

  function fireFrom(b: Battery, tx: number, ty: number, mega = false) {
    const gy = groundY()
    world.current.shots.push({ sx: b.x, sy: gy - 14, x: b.x, y: gy - 14, tx, ty, mega })
    fx.burst(b.x, gy - 16, { count: 6, color: ['#fde047', '#d6d3d1'], speed: 110, angle: -Math.PI / 2, spread: 0.8, gravity: 0, size: 2.5, life: 0.3 })
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const p = localPoint(e, e.currentTarget)
    const w = world.current
    const gy = groundY()
    const ty = Math.min(p.y, gy - 50)
    let best: Battery | null = null
    let bestD = Infinity
    for (const b of w.batteries) {
      if (!b.alive || b.ammo <= 0) continue
      const d = Math.abs(b.x - p.x)
      if (d < bestD) {
        bestD = d
        best = b
      }
    }
    if (!best) {
      sfx.miss()
      fx.text(p.x, p.y, 'no ammo', '#fca5a5', 14)
      return
    }
    best.ammo -= 1
    const mega = w.mega > 0
    if (mega) {
      w.mega -= 1
      pushHud()
    }
    fireFrom(best, p.x, ty, mega)
    sfx.shoot()
    haptic.light()
  }

  function cityHit(x: number) {
    const w = world.current
    const gy = groundY()
    if (import.meta.env.DEV && devGod.current) {
      fx.explode(x, gy - 8, 0.6)
      return
    }
    const victims = [...w.cities.filter((c) => c.alive && Math.abs(c.x - x) < 18), ...w.batteries.filter((b) => b.alive && Math.abs(b.x - x) < 18)]
    if (victims.length && w.shields > 0) {
      // Shield dome soaks the hit.
      w.shields -= 1
      fx.ring(x, gy - 10, { color: '#7dd3fc', maxR: 60, life: 0.4, width: 4 })
      fx.burst(x, gy - 20, { count: 16, color: ['#7dd3fc', '#e0f2fe'], speed: 200, shape: 'spark', gravity: 0 })
      fx.text(x, gy - 50, 'SHIELDED', '#7dd3fc', 16)
      sfx.clang()
      haptic.medium()
      pushHud()
      return
    }
    for (const c of w.cities) {
      if (c.alive && Math.abs(c.x - x) < 18) {
        c.alive = false
        c.smoke = 1
      }
    }
    for (const b of w.batteries) {
      if (b.alive && Math.abs(b.x - x) < 18) {
        b.alive = false
        b.ammo = 0
      }
    }
    const hit = victims.length > 0
    fx.explode(x, gy - 8, hit ? 1.4 : 0.8)
    w.blasts.push({ x, y: gy - 6, t: 0, max: 30, grow: 0.2, hold: 0.25, chain: 0, enemy: true })
    if (hit) {
      w.lostThisWave = true
      fx.flash('#ef4444', 0.25)
      fx.shake(10, 0.35)
      sfx.boom(0.9)
      haptic.heavy()
      if (w.cities.every((c) => !c.alive) && phaseRef.current !== 'dying') die()
    } else sfx.boom(0.4)
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.slowmo(1.2, 0.3)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.wave * 3 + w.stats.kills * 0.15 + w.stats.perfect * 2) * (1 + (w.wave >= 4 ? 0.2 : 0)))
      run.end({ score: w.score, cleared: w.wave >= 4, stats: { ...w.stats }, coins }, revive)
    }, 1500)
  }

  /** Ad revive: rebuild one city, refill ammo, and detonate everything in the sky. */
  function revive() {
    const w = world.current
    const gy = groundY()
    const ruin = w.cities.find((c) => !c.alive)
    if (ruin) {
      ruin.alive = true
      ruin.smoke = 0
      fx.burst(ruin.x, gy - 12, { count: 24, color: ['#7dd3fc', '#fde047', '#ffffff'], speed: 200, gravity: 200 })
    }
    for (const b of w.batteries) {
      b.alive = true
      b.ammo = w.ammoMax
    }
    for (const m of w.missiles) fx.explode(m.x, m.y, 0.6)
    w.missiles = []
    for (const c of w.cruise) fx.explode(c.x, c.y, 0.6)
    w.cruise = []
    if (w.bomber?.kind === 'bomber') {
      fx.explode(w.bomber.x, w.bomber.y, 1)
      w.bomber = null
    }
    if (w.bomber?.laser) {
      w.bomber.laser.charge = 0
      w.bomber.laser.cd = 5
    }
    w.spawnTimer = 2.5
    fx.flash('#ffffff', 0.3)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'city rebuilt · ammo full' })
    pushHud()
    setPhaseBoth('play')
  }

  function endWave() {
    const w = world.current
    const cities = w.cities.filter((c) => c.alive).length
    const ammo = w.batteries.reduce((s, b) => s + (b.alive ? b.ammo : 0), 0)
    const bonus = cities * 100 + ammo * 5
    addScore(bonus)
    if (!w.lostThisWave) {
      w.stats.perfect += 1
      run.update(w.stats)
    }
    // Rebuild a city every third wave.
    let rebuilt = false
    if (w.wave % 3 === 0) {
      const ruin = w.cities.find((c) => !c.alive)
      if (ruin) {
        ruin.alive = true
        ruin.smoke = 0
        rebuilt = true
      }
    }
    if (w.wave % 5 === 0) milestone('wave', w.wave)
    w.sat = null
    setBanner({
      key: Date.now(),
      text: w.lostThisWave ? 'WAVE CLEAR' : 'PERFECT DEFENSE',
      sub: `+${bonus} bonus${rebuilt ? ' · city rebuilt' : ''}`,
    })
    sfx.win()
    haptic.success()
    betweenTimer.current = 2.2
    setPhaseBoth('between')
  }

  function drawPlane(ctx: CanvasRenderingContext2D, bm: Bomber, t: number) {
    const dir = bm.vx > 0 ? 1 : -1
    ctx.save()
    ctx.translate(bm.x, bm.y + Math.sin(t * 2.4) * 2)
    ctx.scale(dir, 1)
    if (bm.kind === 'bomber') {
      // Tail fin + rear wing
      ctx.fillStyle = '#7f1d1d'
      ctx.beginPath()
      ctx.moveTo(-18, -2)
      ctx.lineTo(-24, -12)
      ctx.lineTo(-17, -12)
      ctx.lineTo(-10, -2)
      ctx.fill()
      // Far wing
      ctx.fillStyle = '#991b1b'
      ctx.beginPath()
      ctx.moveTo(2, -2)
      ctx.lineTo(-8, -12)
      ctx.lineTo(-3, -12)
      ctx.lineTo(10, -2)
      ctx.fill()
      // Fuselage
      const g = ctx.createLinearGradient(0, -6, 0, 6)
      g.addColorStop(0, '#fca5a5')
      g.addColorStop(0.5, '#dc2626')
      g.addColorStop(1, '#7f1d1d')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(22, 0)
      ctx.quadraticCurveTo(18, -6, 6, -6)
      ctx.lineTo(-20, -4)
      ctx.lineTo(-22, 2)
      ctx.lineTo(6, 5)
      ctx.quadraticCurveTo(18, 5, 22, 0)
      ctx.fill()
      // Cockpit
      ctx.fillStyle = '#bae6fd'
      ctx.beginPath()
      ctx.ellipse(13, -3, 4, 2, -0.2, 0, Math.PI * 2)
      ctx.fill()
      // Near wing
      ctx.fillStyle = '#b91c1c'
      ctx.beginPath()
      ctx.moveTo(4, 1)
      ctx.lineTo(-8, 13)
      ctx.lineTo(-2, 13)
      ctx.lineTo(12, 1)
      ctx.fill()
      // Bomb bay blink
      if (bm.drop < 0.3) glow(ctx, 0, 6, 10, '#fde047', 0.9)
      // Propeller blur
      ctx.fillStyle = 'rgba(226,232,240,0.6)'
      ctx.beginPath()
      ctx.ellipse(23, 0, 1.5, 8 * Math.abs(Math.sin(t * 40)) + 2, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (bm.kind === 'dread') {
      ctx.restore()
      const L = bm.laser
      drawDread(ctx, bm.x, bm.y, dir, { flash: bm.flash > 0, charge: L && L.charge > 0 ? L.charge / LASER_CHARGE : 0, hp: bm.hp, maxHp: bm.maxHp, t })
      return
    } else {
      // Mothership saucer
      glow(ctx, 0, 6, 70, '#e879f9', 0.25)
      ctx.fillStyle = '#a5f3fc'
      ctx.globalAlpha = 0.85
      ctx.beginPath()
      ctx.ellipse(0, -8, 16, 12, 0, Math.PI, 0)
      ctx.fill()
      ctx.globalAlpha = 1
      const g = ctx.createLinearGradient(0, -8, 0, 10)
      g.addColorStop(0, bm.flash > 0 ? '#ffffff' : '#c4b5fd')
      g.addColorStop(0.5, bm.flash > 0 ? '#fecaca' : '#6d28d9')
      g.addColorStop(1, '#2e1065')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(0, 0, 44, 11, 0, 0, Math.PI * 2)
      ctx.fill()
      for (let i = 0; i < 7; i++) {
        const lx = -33 + i * 11
        ctx.fillStyle = Math.floor(t * 6 + i) % 3 === 0 ? '#fde047' : '#f0abfc'
        ctx.beginPath()
        ctx.arc(lx, 2, 2.3, 0, Math.PI * 2)
        ctx.fill()
      }
      // HP pips
      for (let i = 0; i < bm.maxHp; i++) {
        ctx.fillStyle = i < bm.hp ? '#f43f5e' : 'rgba(255,255,255,0.25)'
        ctx.fillRect(-13 + i * 9, -28, 7, 3)
      }
    }
    ctx.restore()
  }

  function drawCrate(ctx: CanvasRenderingContext2D, c: Crate, t: number) {
    const sw = Math.sin(t * 2 + c.sway) * 0.15
    ctx.save()
    ctx.translate(c.x, c.y)
    ctx.rotate(sw)
    // Parachute canopy
    ctx.fillStyle = '#f8fafc'
    ctx.beginPath()
    ctx.arc(0, -26, 18, Math.PI, 0)
    ctx.quadraticCurveTo(9, -30, 0, -26)
    ctx.quadraticCurveTo(-9, -30, -18, -26)
    ctx.fill()
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.moveTo(-6, -26)
    ctx.arc(0, -26, 18, Math.PI * 1.33, Math.PI * 1.67)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(248,250,252,0.7)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-17, -26)
    ctx.lineTo(-7, -6)
    ctx.moveTo(17, -26)
    ctx.lineTo(7, -6)
    ctx.moveTo(0, -27)
    ctx.lineTo(0, -6)
    ctx.stroke()
    // Crate
    ctx.fillStyle = '#a16207'
    ctx.fillRect(-9, -7, 18, 14)
    ctx.strokeStyle = '#713f12'
    ctx.lineWidth = 2
    ctx.strokeRect(-9, -7, 18, 14)
    ctx.beginPath()
    ctx.moveTo(-9, -7)
    ctx.lineTo(9, 7)
    ctx.stroke()
    ctx.fillStyle = '#86efac'
    ctx.fillRect(-3, -2, 6, 4)
    ctx.restore()
    glow(ctx, c.x, c.y, 26, '#86efac', 0.35)
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const gy = groundY()

    if (ph === 'between') {
      betweenTimer.current -= raw
      if (betweenTimer.current <= 0) {
        setPhaseBoth('play')
        nextWave()
      }
    }

    if (ph === 'play') {
      if (w.toSpawn > 0) {
        w.spawnTimer -= dt
        if (w.spawnTimer <= 0) {
          const n = Math.min(w.toSpawn, 1 + Math.floor(Math.random() * Math.min(3, 1 + w.wave / 3)))
          for (let i = 0; i < n; i++) spawnWaveUnit()
          w.toSpawn -= n
          w.spawnTimer = Math.max(0.7, 2.4 - w.wave * 0.12) * rand(0.8, 1.2)
        }
      } else if (w.missiles.length === 0 && w.cruise.length === 0 && !w.bomber && w.blasts.length === 0 && w.shots.length === 0 && !w.crate) {
        endWave()
      }
      // The dreadnought outlasts a wave's magazines: keep supply crates coming.
      if (w.bomber?.kind === 'dread' && !w.crate && w.toSpawn === 0) {
        const ammo = w.batteries.reduce((s, b) => s + (b.alive ? b.ammo : 0), 0)
        if (ammo < 4) {
          w.crate = { x: rand(W * 0.2, W * 0.8), y: -30, sway: rand(0, 6) }
          fx.text(w.crate.x, 40, 'SUPPLY DROP', '#86efac', 15)
          sfx.ready()
        }
      }
    } else if (ph === 'idle') {
      if (w.missiles.length < 3 && Math.random() < 0.02) launchMissile(rand(0, W), -10)
      // Attract mode: batteries auto-intercept.
      if (w.shots.length === 0 && Math.random() < 0.03) {
        const m = w.missiles.find((o) => o.y > H * 0.3 && o.y < H * 0.6)
        if (m) {
          const d = dist(m.x, m.y, m.tx, m.ty)
          const tx = m.x + ((m.tx - m.x) / d) * m.speed * 0.45
          const ty = m.y + ((m.ty - m.y) / d) * m.speed * 0.45
          const b = w.batteries.reduce((a, c) => (Math.abs(c.x - tx) < Math.abs(a.x - tx) ? c : a))
          fireFrom(b, tx, ty)
        }
      }
    }

    // Interceptors
    for (const s of w.shots) {
      const d = dist(s.x, s.y, s.tx, s.ty)
      const step = 560 * dt
      if (d <= step) {
        s.x = s.tx
        s.y = s.ty
        boomAt(s.x, s.y, w.chainId++, s.mega ? w.blastR * 1.6 : w.blastR, s.mega)
        if (ph !== 'idle') sfx.boom(s.mega ? 0.55 : 0.25)
        s.tx = NaN
      } else {
        s.x += ((s.tx - s.x) / d) * step
        s.y += ((s.ty - s.y) / d) * step
      }
    }
    w.shots = w.shots.filter((s) => !Number.isNaN(s.tx))

    // Blasts
    for (const b of w.blasts) b.t += dt
    w.blasts = w.blasts.filter((b) => b.t < b.grow + b.hold)
    const blastR = (b: Blast) => {
      if (b.t < b.grow) return b.max * (1 - (1 - b.t / b.grow) ** 3)
      return b.max * (1 - ((b.t - b.grow) / b.hold) ** 2)
    }

    // Missiles
    for (const m of w.missiles) {
      if (m.dead) continue
      const d = dist(m.x, m.y, m.tx, m.ty)
      let vx = ((m.tx - m.x) / d) * m.speed
      let vy = ((m.ty - m.y) / d) * m.speed
      if (m.smart) {
        // Smart bombs sidestep nearby blasts.
        for (const b of w.blasts) {
          const bd = dist(b.x, b.y, m.x, m.y)
          if (!b.enemy && bd < b.max + 40 && bd > 1) {
            vx += ((m.x - b.x) / bd) * 70
            vy += ((m.y - b.y) / bd) * 20
          }
        }
      }
      m.x += vx * dt
      m.y += vy * dt
      if (m.mirv && m.y > H * 0.38 && ph === 'play') {
        m.dead = true
        fx.burst(m.x, m.y, { count: 8, color: '#fca5a5', speed: 80, gravity: 0 })
        for (let i = 0; i < 3; i++) {
          const tgt = pickTarget()
          w.missiles.push({ sx: m.x, sy: m.y, x: m.x, y: m.y, tx: tgt.x, ty: tgt.y, speed: m.speed * 1.1, mirv: false, smart: false, dead: false, armor: 0, crack: 0 })
        }
        sfx.pop()
        continue
      }
      for (const b of w.blasts) {
        if (b.enemy) continue
        if (m.crack && b.chain === m.crack) continue
        if (dist(b.x, b.y, m.x, m.y) < blastR(b) + 3) {
          if (m.armor > 0 && (ph === 'play' || ph === 'between')) {
            // First blast only cracks the casing; a different blast must finish it.
            m.armor = 0
            m.crack = b.chain
            fx.burst(m.x, m.y, { count: 12, color: ['#e2e8f0', '#94a3b8', '#fde68a'], speed: 200, shape: 'spark', gravity: 0 })
            fx.text(m.x, m.y - 14, 'CRACKED', '#fdba74', 14)
            sfx.clang()
            haptic.medium()
            break
          }
          m.dead = true
          if (ph !== 'play' && ph !== 'between') {
            fx.burst(m.x, m.y, { count: 6, color: ['#fde047', '#fb923c'], speed: 120, gravity: 0 })
            break
          }
          chainKill(m.x, m.y, b, m.crack ? 60 : 25)
          break
        }
      }
      if (!m.dead && m.y >= m.ty - 2) {
        m.dead = true
        if (ph === 'play' || ph === 'between') cityHit(m.tx)
        else fx.burst(m.x, m.y, { count: 8, color: ['#f97316', '#57534e'], speed: 100 })
      }
    }
    w.missiles = w.missiles.filter((m) => !m.dead)

    // Cruise missiles
    for (const c of w.cruise) {
      if (c.warn > 0) {
        const before = c.warn
        c.warn -= dt
        if (before > 0.6 && c.warn <= 0.6) sfx.tick()
        continue
      }
      if (!c.diving) {
        c.x += c.vx * dt
        c.ph += dt * 4
        c.y = c.baseY + Math.sin(c.ph) * 14
        c.a = (c.vx > 0 ? 0 : Math.PI) + Math.cos(c.ph) * 0.35 * Math.sign(c.vx)
        if ((c.vx > 0 && c.x >= c.tx) || (c.vx < 0 && c.x <= c.tx)) {
          c.diving = true
          sfx.whoosh()
        }
      } else {
        const d = dist(c.x, c.y, c.tx, c.ty)
        const sp = 165
        c.a = Math.atan2(c.ty - c.y, c.tx - c.x)
        if (d <= sp * dt + 2) {
          c.dead = true
          if (ph === 'play' || ph === 'between') cityHit(c.tx)
          continue
        }
        c.x += ((c.tx - c.x) / d) * sp * dt
        c.y += ((c.ty - c.y) / d) * sp * dt
      }
      if (Math.random() < 0.5) fx.burst(c.x - Math.cos(c.a) * 14, c.y - Math.sin(c.a) * 14, { count: 1, color: ['#a8a29e', '#d6d3d1'], speed: 10, size: 3, life: 0.5, gravity: -10, drag: 2 })
      for (const b of w.blasts) {
        if (b.enemy || dist(b.x, b.y, c.x, c.y) > blastR(b) + 6) continue
        c.dead = true
        chainKill(c.x, c.y, b, 40)
        break
      }
    }
    w.cruise = w.cruise.filter((c) => !c.dead)

    // Gold satellite: catch it in a blast for 3 MEGA interceptors.
    if (w.sat) {
      const s = w.sat
      s.x += s.vx * dt
      for (const b of w.blasts) {
        if (b.enemy || dist(b.x, b.y, s.x, s.y) > blastR(b) + 16 || ph === 'idle') continue
        w.mega += 3
        addScore(150)
        fx.burst(s.x, s.y, { count: 28, color: ['#fde047', '#fef9c3', '#60a5fa'], speed: 260, shape: 'square', gravity: 120 })
        fx.ring(s.x, s.y, { color: '#fde047', maxR: 70, life: 0.45, width: 5 })
        fx.text(s.x, s.y - 22, 'MEGA BLAST ×3', '#fde047', 20)
        sfx.power()
        window.setTimeout(() => sfx.combo(), 160)
        haptic.success()
        w.sat = null
        break
      }
      if (w.sat && (s.x < -50 || s.x > W + 50)) w.sat = null
    }

    // Supply crate: shoot it for ammo.
    if (w.crate) {
      const c = w.crate
      c.y += 42 * dt
      for (const b of w.blasts) {
        if (!b.enemy && dist(b.x, b.y, c.x, c.y) < blastR(b) + 14) {
          for (const bt of w.batteries) if (bt.alive) bt.ammo = Math.min(w.ammoMax + 6, bt.ammo + 5)
          addScore(50)
          fx.burst(c.x, c.y, { count: 24, color: ['#86efac', '#fde047', '#ffffff'], speed: 240, shape: 'square', gravity: 200 })
          fx.ring(c.x, c.y, { color: '#86efac', maxR: 50 })
          fx.text(c.x, c.y - 20, 'AMMO +5', '#86efac', 18)
          sfx.power()
          haptic.success()
          w.crate = null
          break
        }
      }
      if (w.crate && c.y > gy - 10) w.crate = null
    }

    // Bomber / mothership
    if (w.bomber) {
      const bm = w.bomber
      const L = bm.laser
      const holding = !!L && (L.charge > 0 || L.beam > 0)
      if (!holding) bm.x += bm.vx * dt
      bm.drop -= dt
      bm.hitCd = Math.max(0, bm.hitCd - dt)
      bm.flash = Math.max(0, bm.flash - raw)
      if (bm.kind === 'dread') {
        if (bm.vx > 0 && bm.x > W - 70) bm.vx = -Math.abs(bm.vx)
        else if (bm.vx < 0 && bm.x < 70) bm.vx = Math.abs(bm.vx)
      }
      if (L && ph === 'play') {
        if (L.beam > 0) L.beam = Math.max(0, L.beam - dt)
        else if (L.charge > 0) {
          L.charge += dt
          const tk = Math.floor(L.charge * (3 + L.charge * 3))
          if (tk !== L.ticks) {
            L.ticks = tk
            sfx.tick()
          }
          if (L.charge >= LASER_CHARGE) {
            L.charge = 0
            L.beam = 0.4
            L.cd = 6.5
            fx.flash('#fecaca', 0.15)
            fx.shake(8, 0.3)
            sfx.boom(0.6)
            cityHit(L.tx)
          }
        } else {
          L.cd -= dt
          if (L.cd <= 0 && bm.x > 40 && bm.x < W - 40) {
            const alive = w.cities.filter((c) => c.alive)
            if (alive.length) {
              L.tx = alive[Math.floor(Math.random() * alive.length)].x
              L.charge = 0.001
              L.ticks = 0
              fx.text(bm.x, bm.y + 44, 'LASER CHARGING', '#fca5a5', 14)
              sfx.ready()
            } else L.cd = 2
          }
        }
      }
      if (bm.drop <= 0 && bm.x > 20 && bm.x < W - 20 && ph === 'play') {
        if (bm.kind === 'dread') {
          launchMissile(bm.x, bm.y + 16, { armored: Math.random() < 0.3 })
          bm.drop = 2.6
        } else if (bm.kind === 'mother') {
          launchMissile(bm.x - 20, bm.y + 10)
          launchMissile(bm.x + 20, bm.y + 10, { mirv: w.wave >= 10 })
          bm.drop = 2.2
        } else {
          launchMissile(bm.x, bm.y + 8)
          bm.drop = 1.4
        }
      }
      if (bm.kind === 'mother' && bm.passes < 1 && ((bm.vx > 0 && bm.x > W - 50) || (bm.vx < 0 && bm.x < 50))) {
        bm.vx = -bm.vx
        bm.passes += 1
      }
      const hitR = bm.kind === 'dread' ? 50 : bm.kind === 'mother' ? 40 : 16
      for (const b of w.blasts) {
        if (b.enemy || bm.hitCd > 0 || ph === 'idle') continue
        if (dist(b.x, b.y, bm.x, bm.y) < blastR(b) + hitR) {
          bm.hp -= 1
          bm.hitCd = 0.6
          bm.flash = 0.15
          if (L && L.charge > 0 && bm.hp > 0) {
            L.charge = 0
            L.cd = 4
            fx.text(bm.x, bm.y + 44, 'LASER JAMMED!', '#7dd3fc', 16)
            sfx.clang()
          }
          if (bm.hp <= 0 && bm.kind === 'dread') {
            fx.explode(bm.x, bm.y, 2.6)
            fx.explode(bm.x - 30, bm.y + 6, 1.2, ['#c4b5fd', '#f0abfc', '#ffffff', '#7c3aed'])
            fx.explode(bm.x + 30, bm.y - 4, 1.2)
            addScore(2000)
            fx.text(bm.x, bm.y - 20, '+2000 DREADNOUGHT', '#fde047', 22)
            w.stats.kills += 1
            const ruin = w.cities.find((c) => !c.alive)
            if (ruin) {
              ruin.alive = true
              ruin.smoke = 0
              fx.burst(ruin.x, gy - 12, { count: 24, color: ['#7dd3fc', '#fde047', '#ffffff'], speed: 200, gravity: 200 })
            }
            w.shields += 1
            pushHud()
            fx.slowmo(1, 0.3)
            fx.flash('#ffffff', 0.35)
            fx.stop(0.2)
            sfx.boom(1)
            window.setTimeout(() => sfx.win(), 300)
            window.setTimeout(() => sfx.combo(), 760)
            haptic.heavy()
            setBanner({ key: Date.now(), text: 'DREADNOUGHT DOWN!', sub: `+2000${ruin ? ' · city rebuilt' : ''} · +1 shield` })
            milestone('boss', w.wave)
            run.update(w.stats)
          } else if (bm.hp <= 0) {
            const big = bm.kind === 'mother'
            fx.explode(bm.x, bm.y, big ? 2.2 : 1.3)
            const pts = big ? 1000 : 200
            addScore(pts)
            fx.text(bm.x, bm.y - 20, big ? '+1000 MOTHERSHIP' : '+200 BOMBER', '#fde047', big ? 22 : 18)
            w.stats.kills += 1
            sfx.boom(big ? 1 : 0.8)
            haptic.heavy()
            fx.stop(big ? 0.15 : 0.08)
            if (big) {
              fx.slowmo(0.8, 0.3)
              fx.flash('#ffffff', 0.3)
              setBanner({ key: Date.now(), text: 'MOTHERSHIP DOWN!', sub: '+1000' })
              milestone('boss', w.wave)
            }
            run.update(w.stats)
          } else {
            fx.burst(bm.x, bm.y, { count: 14, color: bm.kind === 'dread' ? ['#cbd5e1', '#fde68a'] : ['#f0abfc', '#ffffff'], speed: 220, shape: 'spark', gravity: 0 })
            fx.text(bm.x, bm.y - 30, `${bm.hp} left`, '#f0abfc', 14)
            sfx.hit()
            fx.shake(4, 0.15)
          }
          break
        }
      }
      if (bm.hp <= 0 || bm.x < -80 || bm.x > W + 80) w.bomber = null
    }

    // ── Draw ─────────────────────────────────────
    // Cached sky + skyline per theme; a theme change cross-fades over ~1.6 s.
    const dpr = ctx.getTransform().a || 1
    w.themeFade = Math.min(1, w.themeFade + raw / 1.6)
    if (w.themeFade < 1) {
      ctx.drawImage(themeLayer(w.prevTheme, W, H, gy, dpr), 0, 0, W, H)
      drawSkyLive(ctx, w.prevTheme, W, H, gy, t, w.sky, 1)
      ctx.globalAlpha = w.themeFade
    }
    ctx.drawImage(themeLayer(w.theme, W, H, gy, dpr), 0, 0, W, H)
    ctx.globalAlpha = 1
    drawSkyLive(ctx, w.theme, W, H, gy, t, w.sky, w.themeFade)
    const theme = THEMES[w.themeFade < 0.5 ? w.prevTheme : w.theme]
    if (stepSky(w.sky, w.theme, THEMES[w.theme].weather, W, H, gy, dt) && ph !== 'idle') window.setTimeout(() => sfx.boom(0.12), 380)

    fx.applyShake(ctx)

    for (const m of w.missiles) {
      if (m.armor > 0 || m.crack) {
        const a = Math.atan2(m.ty - m.y, m.tx - m.x)
        ctx.strokeStyle = 'rgba(148,163,184,0.55)'
        ctx.lineWidth = 3.5
        ctx.beginPath()
        ctx.moveTo(m.sx, m.sy)
        ctx.lineTo(m.x, m.y)
        ctx.stroke()
        drawReticle(ctx, m.tx, m.ty - 4, t)
        drawArmored(ctx, m.x, m.y, a, m.armor === 0, t)
        continue
      }
      const g = ctx.createLinearGradient(m.sx, m.sy, m.x, m.y)
      g.addColorStop(0, 'rgba(248,113,113,0)')
      g.addColorStop(1, m.smart ? 'rgba(232,121,249,0.9)' : 'rgba(248,113,113,0.85)')
      ctx.strokeStyle = g
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(m.sx, m.sy)
      ctx.lineTo(m.x, m.y)
      ctx.stroke()
      glow(ctx, m.x, m.y, 10, m.smart ? '#e879f9' : '#f87171', 0.9)
      // Warhead pointing along its path.
      const a = Math.atan2(m.ty - m.y, m.tx - m.x)
      ctx.save()
      ctx.translate(m.x, m.y)
      ctx.rotate(a)
      ctx.fillStyle = m.smart ? '#f5d0fe' : '#fecaca'
      ctx.beginPath()
      ctx.moveTo(5, 0)
      ctx.lineTo(-3, -2.5)
      ctx.lineTo(-3, 2.5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      if (m.mirv) {
        ctx.strokeStyle = 'rgba(253,164,175,0.8)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(m.x, m.y, 6 + Math.sin(t * 10) * 1.5, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    for (const c of w.cruise) {
      if (c.warn > 0) drawEdgeWarning(ctx, W, c.baseY, c.vx > 0, t)
      else {
        if (c.diving) drawReticle(ctx, c.tx, c.ty - 4, t)
        drawCruise(ctx, c.x, c.y, c.a, t)
      }
    }
    if (w.sat) drawSatellite(ctx, w.sat.x, w.sat.y, t)

    for (const s of w.shots) {
      ctx.strokeStyle = s.mega ? 'rgba(253,224,71,0.85)' : 'rgba(125,211,252,0.7)'
      ctx.lineWidth = s.mega ? 3 : 2
      ctx.beginPath()
      ctx.moveTo(s.sx, s.sy)
      ctx.lineTo(s.x, s.y)
      ctx.stroke()
      glow(ctx, s.x, s.y, s.mega ? 12 : 8, s.mega ? '#fde047' : '#7dd3fc', 1)
      // Target cross
      ctx.strokeStyle = s.mega ? 'rgba(253,224,71,0.9)' : 'rgba(125,211,252,0.8)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(s.tx - 5, s.ty - 5)
      ctx.lineTo(s.tx + 5, s.ty + 5)
      ctx.moveTo(s.tx + 5, s.ty - 5)
      ctx.lineTo(s.tx - 5, s.ty + 5)
      ctx.stroke()
    }

    for (const b of w.blasts) {
      const r = blastR(b)
      if (r <= 0) continue
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r)
      if (b.enemy) {
        g.addColorStop(0, 'rgba(254,202,202,0.9)')
        g.addColorStop(1, 'rgba(239,68,68,0)')
      } else if (b.mega) {
        g.addColorStop(0, 'rgba(255,255,255,0.95)')
        g.addColorStop(0.35, 'rgba(254,240,138,0.9)')
        g.addColorStop(0.75, 'rgba(245,158,11,0.55)')
        g.addColorStop(1, 'rgba(245,158,11,0)')
      } else {
        g.addColorStop(0, 'rgba(255,255,255,0.95)')
        g.addColorStop(0.4, 'rgba(253,224,71,0.85)')
        g.addColorStop(0.8, 'rgba(249,115,22,0.5)')
        g.addColorStop(1, 'rgba(249,115,22,0)')
      }
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(b.x, b.y, r, 0, Math.PI * 2)
      ctx.fill()
    }

    if (w.crate) drawCrate(ctx, w.crate, t)
    if (w.bomber) {
      const L = w.bomber.laser
      if (L && (L.charge > 0 || L.beam > 0)) drawLaser(ctx, w.bomber.x, w.bomber.y + 24, L.tx, gy - 6, L.charge / LASER_CHARGE, L.beam, t)
      drawPlane(ctx, w.bomber, t)
    }
    drawWeather(ctx, w.sky, THEMES[w.theme].weather)

    // Ground
    ctx.fillStyle = theme.ground
    ctx.fillRect(-20, gy, W + 40, H - gy + 20)
    ctx.fillStyle = theme.lip
    ctx.fillRect(-20, gy, W + 40, 3)

    if (w.shields > 0 && ph !== 'idle') {
      ctx.globalAlpha = 0.12 + Math.sin(t * 3) * 0.04
      ctx.fillStyle = '#7dd3fc'
      ctx.beginPath()
      ctx.ellipse(W / 2, gy, W * 0.42, 54, 0, Math.PI, 0)
      ctx.fill()
      ctx.globalAlpha = 0.5
      ctx.strokeStyle = '#7dd3fc'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    for (const c of w.cities) {
      if (c.alive) {
        const heights = [16, 24, 12, 20]
        heights.forEach((hh, i) => {
          const bx = c.x - 16 + i * 8
          ctx.fillStyle = i % 2 ? '#38bdf8' : '#0ea5e9'
          ctx.fillRect(bx, gy - hh, 7, hh)
          ctx.fillStyle = 'rgba(255,255,255,0.25)'
          ctx.fillRect(bx, gy - hh, 1.5, hh)
          ctx.fillStyle = 'rgba(254,240,138,0.8)'
          for (let wy = gy - hh + 3; wy < gy - 3; wy += 5) ctx.fillRect(bx + 2, wy, 3, 2)
        })
        ctx.fillStyle = '#f43f5e'
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4 + c.x)
        ctx.fillRect(c.x - 9, gy - 27, 2, 2)
        ctx.globalAlpha = 1
      } else {
        ctx.fillStyle = '#44403c'
        ctx.beginPath()
        ctx.moveTo(c.x - 16, gy)
        ctx.lineTo(c.x - 8, gy - 6)
        ctx.lineTo(c.x, gy - 3)
        ctx.lineTo(c.x + 10, gy - 7)
        ctx.lineTo(c.x + 16, gy)
        ctx.fill()
        if (Math.random() < 0.15) fx.burst(c.x + rand(-8, 8), gy - 6, { count: 1, color: ['#57534e', '#78716c'], speed: 15, size: 5, gravity: -30, drag: 1, life: 1.4 })
        if (Math.random() < 0.08) fx.burst(c.x + rand(-6, 6), gy - 4, { count: 1, color: ['#f97316', '#fde047'], speed: 20, size: 2, gravity: -60, life: 0.5 })
      }
    }

    for (const b of w.batteries) {
      ctx.fillStyle = b.alive ? '#64748b' : '#3f3f46'
      ctx.beginPath()
      ctx.moveTo(b.x - 18, gy)
      ctx.lineTo(b.x - 10, gy - 14)
      ctx.lineTo(b.x + 10, gy - 14)
      ctx.lineTo(b.x + 18, gy)
      ctx.fill()
      if (b.alive) {
        ctx.fillStyle = '#94a3b8'
        ctx.fillRect(b.x - 2, gy - 22, 4, 9)
        ctx.fillStyle = b.ammo > 0 ? '#7dd3fc' : '#f87171'
        ctx.fillRect(b.x - 2, gy - 23, 4, 2)
        const perRow = 6
        for (let i = 0; i < b.ammo; i++) {
          ctx.fillStyle = '#7dd3fc'
          ctx.fillRect(b.x - 17 + (i % perRow) * 6, gy + 7 + Math.floor(i / perRow) * 7, 4, 5)
        }
      } else {
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(b.x - 5, gy + 9)
        ctx.lineTo(b.x + 5, gy + 19)
        ctx.moveTo(b.x + 5, gy + 9)
        ctx.lineTo(b.x - 5, gy + 19)
        ctx.stroke()
      }
    }

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  if (import.meta.env.DEV) {
    // Dev-only skips for screenshots: __en3def(wave, god?) jumps to a wave; __en3defSpawn(kind) spawns new content.
    const win = window as unknown as Record<string, unknown>
    win.__en3def = (wv: number, god = true) => {
      if (phaseRef.current !== 'play' && phaseRef.current !== 'between') return 'not playing'
      const w = world.current
      devGod.current = god
      w.missiles = []
      w.cruise = []
      w.bomber = null
      w.crate = null
      w.sat = null
      w.toSpawn = 0
      w.wave = Math.max(0, wv - 1)
      setPhaseBoth('play')
      nextWave()
      return `wave ${w.wave}`
    }
    win.__en3defSpawn = (k: 'cruise' | 'armored' | 'sat' | 'dread' | 'charge' | 'mega') => {
      const w = world.current
      const W = size.current.w
      if (k === 'cruise') spawnCruise()
      else if (k === 'armored') launchMissile(rand(W * 0.2, W * 0.8), -10, { armored: true })
      else if (k === 'sat') spawnSat()
      else if (k === 'dread') {
        w.bomber = { kind: 'dread', x: W / 2, y: size.current.h * 0.13, vx: 28, drop: 3, hp: DREAD_HP, maxHp: DREAD_HP, hitCd: 0, passes: 0, flash: 0, laser: { cd: 1, charge: 0, tx: 0, beam: 0, ticks: 0 } }
      } else if (k === 'charge' && w.bomber?.laser) w.bomber.laser.cd = 0
      else if (k === 'mega') {
        w.mega += 3
        pushHud()
      }
      return w.sat ? { x: Math.round(w.sat.x / W * 100) / 100, y: Math.round(w.sat.y / size.current.h * 100) / 100 } : null
    }
  }

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Wave {hud.wave}</div>
              </div>
              {(hud.shields > 0 || hud.mega > 0) && (
                <div className="action-hud__right">
                  {hud.shields > 0 && <span className="action-hud__small">🛡️ {hud.shields}</span>}
                  {hud.mega > 0 && <span className="action-hud__small defense-mega">MEGA ×{hud.mega}</span>}
                </div>
              )}
            </div>
          )}
          {zone && (phase === 'play' || phase === 'between') ? (
            <div className="defense-zone" key={zone.key} style={{ '--zone': zone.color } as CSSProperties} onAnimationEnd={() => setZone(null)}>
              <small>New sky</small>
              {zone.name}
              <em>{zone.sub}</em>
            </div>
          ) : null}
          {banner && (phase === 'play' || phase === 'between') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="defense"
              icon={meta.icon}
              title={meta.title}
              hint="Tap the sky to fire interceptors. Catch missiles in the blast — every kill explodes and can chain."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.wave >= 4 ? 'Valiant defense!' : 'Cities fallen'}
            subtitle={`Score ${hud.score} · Wave ${hud.wave}`}
            celebrate={hud.wave >= 4}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
