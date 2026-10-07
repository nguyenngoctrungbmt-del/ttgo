import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, dist, glow, rand } from '../../shared/action/fx'
import { Stick, localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { useProgressStore } from '../../store/progressStore'
import '../../shared/action/action.css'
import { POWER_COLOR, drawComet, drawDrone, drawMine, drawMothership, drawPower, drawShip, drawUfo, type PowerKind } from './art'
import { BIOMES, biomeFor, drawMotes, drawSpaceBg, makeMotes, type Mote } from './biomes'

const meta = getGame('asteroids')

type Phase = 'idle' | 'play' | 'dying' | 'over'

type Ship = { x: number; y: number; vx: number; vy: number; a: number; inv: number; alive: boolean; respawn: number; thrust: number }
type Bullet = { x: number; y: number; vx: number; vy: number; life: number; enemy: boolean }
type Rock = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  size: 1 | 2 | 3
  hp: number
  rot: number
  vr: number
  verts: number[]
  flash: number
  hue: number
  /** Crystal rocks are tougher, glow cyan and always drop a power-up. */
  crystal: boolean
  sat: number
}
/** Proximity mine: `arm` counts down to detonation once triggered (-1 = dormant). */
type Mine = { x: number; y: number; vx: number; vy: number; arm: number; life: number; t: number; beep: number }
type Drone = { x: number; y: number; a: number; hp: number; mode: 'seek' | 'aim' | 'dash'; mt: number; dashA: number; flash: number; t: number }
type Boss = { x: number; y: number; tx: number; hp: number; max: number; t: number; charge: number; volley: number; spawn: number; flash: number; dir: number }
type Ufo = { x: number; y: number; vx: number; t: number; fire: number; hp: number; flash: number }
type Power = { x: number; y: number; kind: PowerKind; life: number; bob: number }
type Star = { x: number; y: number; z: number }
type Comet = { x: number; y: number; vx: number; vy: number; warn: number; life: number }

const POWER_ICON: Record<PowerKind, string> = { triple: '🔱', rapid: '⚡', shield: '🛡️', nova: '💥' }
const POWER_LABEL: Record<PowerKind, string> = { triple: 'Triple shot', rapid: 'Rapid fire', shield: 'Shield', nova: 'NOVA BLAST' }
const MINE_TRIGGER = 88
const MINE_BLAST = 72
const MINE_ARM = 0.9
const MINE_CAP = 6
const DRONE_CAP = 5
const NOVA_R = 190
const ROCK_R = { 3: 40, 2: 24, 1: 13 } as const
const ROCK_HP = { 3: 3, 2: 2, 1: 1 } as const
const ROCK_SCORE = { 3: 20, 2: 50, 1: 100 } as const
const START_LIVES = 3
const COMET_SPEED = 520

type World = {
  ship: Ship
  bullets: Bullet[]
  rocks: Rock[]
  ufo: Ufo | null
  ufoTimer: number
  comets: Comet[]
  cometTimer: number
  powers: Power[]
  buffs: Record<PowerKind, number>
  fireTimer: number
  fireRate: number
  buffMul: number
  wave: number
  waveDelay: number
  score: number
  lives: number
  best: number
  bestShown: boolean
  stars: Star[]
  mines: Mine[]
  drones: Drone[]
  boss: Boss | null
  bosses: number
  biome: number
  prevBiome: number
  biomeBlend: number
  motes: Mote[]
  god: boolean
  stats: { score: number; rocks: number; wave: number; ufos: number }
}

function makeRock(x: number, y: number, size: 1 | 2 | 3, speed: number, angle = rand(0, Math.PI * 2), crystal = false, hue = rand(18, 38), sat = 22): Rock {
  const n = 9 + size * 2
  const verts = Array.from({ length: n }, () => rand(0.72, 1.08))
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: ROCK_R[size],
    size,
    hp: crystal ? 6 : ROCK_HP[size],
    rot: rand(0, 6.28),
    vr: rand(-1.2, 1.2) * (4 - size) * 0.5,
    verts,
    flash: 0,
    hue,
    crystal,
    sat,
  }
}

function freshWorld(W: number, H: number): World {
  return {
    ship: { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2, inv: 2, alive: true, respawn: 0, thrust: 0 },
    bullets: [],
    rocks: [],
    ufo: null,
    ufoTimer: 18,
    comets: [],
    cometTimer: 12,
    powers: [],
    buffs: { triple: 0, rapid: 0, shield: 0, nova: 0 },
    fireTimer: 0,
    fireRate: 1,
    buffMul: 1,
    wave: 0,
    waveDelay: 0.4,
    score: 0,
    lives: START_LIVES,
    best: 0,
    bestShown: false,
    stars: Array.from({ length: 70 }, () => ({ x: rand(0, W), y: rand(0, H), z: rand(0.2, 1) })),
    mines: [],
    drones: [],
    boss: null,
    bosses: 0,
    biome: 0,
    prevBiome: 0,
    biomeBlend: 1,
    motes: [],
    god: false,
    stats: { score: 0, rocks: 0, wave: 0, ufos: 0 },
  }
}

function wrap(v: number, max: number, pad: number) {
  if (v < -pad) return max + pad
  if (v > max + pad) return -pad
  return v
}

export default function AsteroidsGame() {
  const run = useActionRun('asteroids')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const stick = useRef(new Stick(52)).current
  const keys = useRef(new Set<string>()).current
  const size = useRef({ w: 360, h: 520 })
  const world = useRef<World>(freshWorld(360, 520))
  const phaseRef = useRef<Phase>('idle')

  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(START_LIVES)
  const [wave, setWave] = useState(1)
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function start() {
    void unlockAudio()
    const w = freshWorld(size.current.w, size.current.h)
    w.lives = START_LIVES + run.level('hull')
    w.fireRate = 1 + run.level('cannon') * 0.12
    w.buffMul = 1 + run.level('surge') * 0.25
    w.best = useProgressStore.getState().games.asteroids?.bestScore ?? 0
    w.bestShown = w.best < 500
    world.current = w
    fx.reset()
    setScore(0)
    setLives(w.lives)
    setWave(1)
    run.begin()
    setPhaseBoth('play')
    sfx.ready()
  }

  function addScore(n: number) {
    const w = world.current
    w.score += n
    w.stats.score = w.score
    setScore(w.score)
    run.update(w.stats)
    if (!w.bestShown && w.score > w.best) {
      w.bestShown = true
      showBanner('NEW BEST!', `beat ${w.best}`)
      sfx.levelUp()
      haptic.success()
    }
  }

  function nextWave() {
    const w = world.current
    const { w: W, h: H } = size.current
    w.wave += 1
    w.stats.wave = w.wave
    setWave(w.wave)
    run.update(w.stats)
    const bossWave = w.wave % 5 === 0
    const nb = biomeFor(w.wave)
    const biomeChanged = nb !== w.biome
    if (biomeChanged) {
      w.prevBiome = w.biome
      w.biome = nb
      w.biomeBlend = 0
      w.motes = makeMotes(BIOMES[nb], W, H)
    }
    const bio = BIOMES[w.biome]
    // Boss waves bring only a few boulders so the mothership is the star.
    const count = bossWave ? Math.min(2 + Math.floor(w.wave / 10), 4) : Math.min(3 + w.wave, 10)
    for (let i = 0; i < count; i++) {
      const [x, y] = edgeSpawn(150)
      // Every 3rd wave hides a crystal rock among the boulders.
      const crystal = w.wave % 3 === 0 && i === 0
      w.rocks.push(makeRock(x, y, crystal ? 2 : 3, rand(26, 40) + w.wave * 5, undefined, crystal, rand(bio.rockHue[0], bio.rockHue[1]), bio.rockSat))
    }
    // Mines from wave 3, seeker drones from wave 7 (never on boss waves).
    if (w.wave >= 3 && !bossWave) {
      const n = Math.min(1 + Math.floor((w.wave - 3) / 3), 4)
      for (let i = 0; i < n && w.mines.length < MINE_CAP; i++) {
        const [x, y] = edgeSpawn(220, true)
        spawnMine(x, y)
      }
    }
    if (w.wave >= 7 && !bossWave) {
      const n = Math.min(1 + Math.floor((w.wave - 7) / 3), 4)
      for (let i = 0; i < n; i++) {
        const [x, y] = edgeSpawn(220)
        spawnDrone(x, y)
      }
    }
    if (bossWave) {
      showBanner('WARNING!', 'hive mothership approaching')
      spawnBoss()
    } else if (biomeChanged) {
      showBanner(bio.name, `sector ${Math.floor((w.wave - 1) / 5)} cleared · ${bio.sub}`)
      void trackEvent('action_milestone', { game_id: 'asteroids', kind: 'wave', value: w.wave - 1 })
      sfx.win()
      window.setTimeout(() => sfx.whoosh(), 250)
    } else if (w.wave > 1 && (w.wave - 1) % 5 === 0) {
      showBanner(`SECTOR ${(w.wave - 1) / 5} CLEARED!`, `wave ${w.wave} incoming`)
      void trackEvent('action_milestone', { game_id: 'asteroids', kind: 'wave', value: w.wave - 1 })
      sfx.win()
    } else {
      const sub =
        w.wave === 1 ? 'drag to fly · auto-fire'
        : w.wave === 2 ? 'watch for UFOs'
        : w.wave === 3 ? 'space mines — shoot them from range'
        : w.wave === 4 ? 'comets incoming — watch the red lines'
        : w.wave === 7 ? 'seeker drones — dodge when they flash'
        : w.wave % 3 === 0 ? 'crystal rock spotted'
        : 'incoming'
      showBanner(`WAVE ${w.wave}`, sub)
    }
    sfx.levelUp()
  }

  /** A point on (or just inside) the screen edge, at least `minD` from the ship. */
  function edgeSpawn(minD: number, inside = false): [number, number] {
    const w = world.current
    const { w: W, h: H } = size.current
    let x = 0
    let y = 0
    for (let tries = 0; tries < 14; tries++) {
      if (inside) {
        x = rand(30, W - 30)
        y = rand(60, H - 30)
      } else {
        x = rand(0, W)
        y = Math.random() < 0.5 ? rand(-30, 30) : H + rand(-30, 30)
        if (Math.random() < 0.5) [x, y] = [Math.random() < 0.5 ? rand(-30, 30) : W + rand(-30, 30), rand(0, H)]
      }
      if (dist(x, y, w.ship.x, w.ship.y) > minD) break
    }
    return [x, y]
  }

  function spawnMine(x: number, y: number, vx = rand(-14, 14), vy = rand(-14, 14)) {
    world.current.mines.push({ x, y, vx, vy, arm: -1, life: 45, t: rand(0, 6), beep: 0 })
  }

  function spawnDrone(x: number, y: number) {
    const w = world.current
    if (w.drones.length >= DRONE_CAP) return
    w.drones.push({ x, y, a: Math.atan2(w.ship.y - y, w.ship.x - x), hp: 2, mode: 'seek', mt: rand(1.5, 2.5), dashA: 0, flash: 0, t: 0 })
  }

  function spawnBoss() {
    const w = world.current
    const { w: W } = size.current
    const hp = 34 + w.wave * 3
    w.boss = { x: W / 2, y: -70, tx: W / 2, hp, max: hp, t: 0, charge: -1, volley: 2.5, spawn: 5, flash: 0, dir: 1 }
    // Boss sting: low boom then two clangs.
    sfx.boom(0.5)
    window.setTimeout(() => sfx.clang(), 180)
    window.setTimeout(() => sfx.clang(), 420)
    fx.shake(6, 0.5)
    haptic.heavy()
  }

  function killBoss() {
    const w = world.current
    const b = w.boss
    if (!b) return
    w.boss = null
    w.bosses += 1
    const sector = Math.max(1, Math.floor(w.wave / 5))
    const pts = 1500 * sector
    for (let i = 0; i < 4; i++) {
      window.setTimeout(() => fx.explode(b.x + rand(-40, 40), b.y + rand(-30, 30), 1.4, ['#c4b5fd', '#f0abfc', '#fde047', '#ffffff']), i * 140)
    }
    fx.explode(b.x, b.y, 2.4, ['#818cf8', '#f0abfc', '#fde047', '#ffffff'])
    fx.ring(b.x, b.y, { color: '#f0abfc', maxR: 160, life: 0.7, width: 6 })
    fx.flash('#ffffff', 0.35)
    fx.slowmo(1.1, 0.3)
    fx.stop(0.18)
    fx.shake(16, 0.6)
    // Victory sting.
    sfx.boom(1)
    window.setTimeout(() => sfx.win(), 260)
    window.setTimeout(() => sfx.levelUp(), 700)
    haptic.success()
    addScore(pts)
    fx.text(b.x, b.y, `+${pts} MOTHERSHIP`, '#f0abfc', 22)
    w.lives = Math.min(6, w.lives + 1)
    setLives(w.lives)
    showBanner('MOTHERSHIP DOWN!', `+${pts} · +1 ship`)
    w.powers.push({ x: b.x, y: b.y, kind: 'nova', life: 12, bob: 0 })
    dropPower(b.x - 26, b.y + 10)
    dropPower(b.x + 26, b.y + 10)
    w.bullets = w.bullets.filter((o) => !o.enemy)
    void trackEvent('action_milestone', { game_id: 'asteroids', kind: 'boss', value: w.bosses })
  }

  function killDrone(d: Drone) {
    const w = world.current
    d.hp = 0
    fx.explode(d.x, d.y, 0.8, ['#fb7185', '#fde047', '#ffffff'])
    sfx.boom(0.45)
    haptic.medium()
    addScore(150)
    fx.text(d.x, d.y, '+150', '#fda4af', 15)
    if (Math.random() < 0.12 * w.buffMul) dropPower(d.x, d.y)
  }

  /** Blow a mine: hurts the ship and anything nearby, chains into other mines. */
  function detonate(m: Mine) {
    const w = world.current
    const s = w.ship
    m.life = -1
    fx.explode(m.x, m.y, 1.2, ['#ef4444', '#fb923c', '#fde047', '#ffffff'])
    fx.ring(m.x, m.y, { color: '#f87171', maxR: MINE_BLAST, life: 0.35, width: 5 })
    fx.shake(8, 0.25)
    sfx.boom(0.7)
    if (s.alive && dist(m.x, m.y, s.x, s.y) < MINE_BLAST + 6) shipHit()
    const hit = w.rocks.filter((r) => dist(r.x, r.y, m.x, m.y) < MINE_BLAST + r.r * 0.6)
    if (hit.length) {
      w.rocks = w.rocks.filter((r) => !hit.includes(r))
      for (const r of hit) {
        r.hp -= 3
        if (r.hp <= 0) destroyRock(r, r.x - m.x, r.y - m.y)
        else w.rocks.push(r)
      }
    }
    for (const d of w.drones) if (d.hp > 0 && dist(d.x, d.y, m.x, m.y) < MINE_BLAST) killDrone(d)
    for (const o of w.mines) if (o !== m && o.life > 0 && dist(o.x, o.y, m.x, m.y) < MINE_BLAST + 10) o.arm = o.arm < 0 ? 0.15 : Math.min(o.arm, 0.15)
    run.update(w.stats)
  }

  /** Nova power-up: shockwave that clears the area around the ship. */
  function nova(x: number, y: number) {
    const w = world.current
    fx.ring(x, y, { color: '#f5d0fe', maxR: NOVA_R, life: 0.55, width: 8 })
    fx.ring(x, y, { color: '#ffffff', maxR: NOVA_R * 0.7, life: 0.4, width: 4 })
    fx.burst(x, y, { count: 30, color: ['#f5d0fe', '#e879f9', '#ffffff'], speed: 380, shape: 'spark', gravity: 0, life: 0.6 })
    fx.flash('#f5d0fe', 0.25)
    fx.shake(10, 0.35)
    fx.stop(0.08)
    sfx.boom(0.8)
    sfx.power()
    haptic.heavy()
    const hit = w.rocks.filter((r) => dist(r.x, r.y, x, y) < NOVA_R + r.r * 0.5)
    if (hit.length) {
      w.rocks = w.rocks.filter((r) => !hit.includes(r))
      for (const r of hit) {
        r.hp -= 3
        if (r.hp <= 0) destroyRock(r, r.x - x, r.y - y)
        else w.rocks.push(r)
      }
    }
    for (const m of w.mines) {
      if (m.life > 0 && dist(m.x, m.y, x, y) < NOVA_R) {
        m.life = -1
        fx.burst(m.x, m.y, { count: 10, color: ['#94a3b8', '#fca5a5'], speed: 140, gravity: 0 })
        addScore(40)
      }
    }
    for (const d of w.drones) if (d.hp > 0 && dist(d.x, d.y, x, y) < NOVA_R) killDrone(d)
    w.bullets = w.bullets.filter((b) => !b.enemy || dist(b.x, b.y, x, y) > NOVA_R)
    if (w.ufo && dist(w.ufo.x, w.ufo.y, x, y) < NOVA_R) w.ufo.hp = Math.min(w.ufo.hp, 1)
    if (w.boss && dist(w.boss.x, w.boss.y, x, y) < NOVA_R + 40) {
      w.boss.hp -= 10
      w.boss.flash = 0.15
      if (w.boss.hp <= 0) killBoss()
    }
    run.update(w.stats)
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.slowmo(1, 0.3)
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.score / 110 + w.wave * 2 + w.stats.ufos * 3 + w.bosses * 6)
      run.end({ score: w.score, cleared: w.wave >= 3, stats: { ...w.stats, score: w.score }, coins }, revive)
    }, 1300)
  }

  /** Ad revive: two ships back, space around the spawn cleared, long invulnerability. */
  function revive() {
    const w = world.current
    const { w: W, h: H } = size.current
    const s = w.ship
    w.lives = 2
    setLives(2)
    Object.assign(s, { x: W / 2, y: H / 2, vx: 0, vy: 0, alive: true, inv: 3, respawn: 0 })
    w.rocks = w.rocks.filter((r) => {
      if (dist(r.x, r.y, s.x, s.y) > 170) return true
      fx.burst(r.x, r.y, { count: 10, color: ['#a5f3fc', '#d6d3d1'], speed: 160, gravity: 0 })
      return false
    })
    w.bullets = w.bullets.filter((b) => !b.enemy)
    w.comets = []
    w.cometTimer = 10
    w.mines = w.mines.filter((m) => {
      if (dist(m.x, m.y, s.x, s.y) > 200) return true
      fx.burst(m.x, m.y, { count: 8, color: ['#94a3b8', '#fca5a5'], speed: 140, gravity: 0 })
      return false
    })
    for (const m of w.mines) m.arm = -1
    for (const d of w.drones) {
      d.mode = 'seek'
      d.mt = 3
    }
    if (w.boss) {
      w.boss.charge = -1
      w.boss.volley = 3.5
    }
    if (w.ufo) {
      fx.explode(w.ufo.x, w.ufo.y, 1, ['#86efac', '#ffffff'])
      w.ufo = null
    }
    w.buffs.shield = 6
    fx.ring(s.x, s.y, { color: '#67e8f9', maxR: 170, life: 0.6, width: 5 })
    showBanner('REVIVED!', 'shield up')
    setPhaseBoth('play')
  }

  function shipHit() {
    const w = world.current
    const s = w.ship
    if (!s.alive || s.inv > 0 || phaseRef.current !== 'play' || w.god) return
    if (w.buffs.shield > 0) {
      w.buffs.shield = 0
      s.inv = 1
      fx.ring(s.x, s.y, { color: '#67e8f9', maxR: 60, life: 0.4, width: 5 })
      fx.shake(6, 0.2)
      sfx.clang()
      haptic.medium()
      return
    }
    s.alive = false
    s.respawn = 1.4
    w.lives -= 1
    setLives(w.lives)
    fx.explode(s.x, s.y, 1.6, ['#67e8f9', '#e0f2fe', '#fde047', '#f472b6'])
    fx.flash('#ef4444', 0.3)
    fx.stop(0.15)
    fx.shake(14, 0.45)
    sfx.boom(0.9)
    sfx.hurt()
    haptic.heavy()
    if (w.lives <= 0) die()
  }

  function destroyRock(rock: Rock, hitVx: number, hitVy: number) {
    const w = world.current
    const power = rock.size === 3 ? 1.3 : rock.size === 2 ? 0.9 : 0.55
    if (rock.crystal) {
      fx.explode(rock.x, rock.y, 1.4, ['#a5f3fc', '#67e8f9', '#ffffff', '#c4b5fd'])
      fx.ring(rock.x, rock.y, { color: '#67e8f9', maxR: 70, life: 0.4, width: 4 })
      fx.stop(0.08)
      sfx.win()
      addScore(250)
      fx.text(rock.x, rock.y, '+250 CRYSTAL', '#a5f3fc', 18)
      dropPower(rock.x - 14, rock.y)
      dropPower(rock.x + 14, rock.y)
      w.stats.rocks += 1
      haptic.success()
      return
    }
    fx.explode(rock.x, rock.y, power, ['#fde68a', '#fdba74', '#d6d3d1', '#ffffff'])
    fx.burst(rock.x, rock.y, { count: 8 + rock.size * 4, color: [`hsl(${rock.hue} 25% 45%)`, `hsl(${rock.hue} 20% 30%)`], speed: 160, size: 4, shape: 'square', gravity: 0, drag: 1.4, life: 0.9 })
    if (rock.size === 3) fx.stop(0.06)
    sfx.boom(power * 0.6)
    haptic.medium()
    addScore(ROCK_SCORE[rock.size])
    fx.text(rock.x, rock.y, `+${ROCK_SCORE[rock.size]}`, '#fde68a', 14 + rock.size * 2)
    w.stats.rocks += 1
    if (rock.size > 1) {
      const base = Math.atan2(rock.vy + hitVy * 0.08, rock.vx + hitVx * 0.08)
      const speed = Math.hypot(rock.vx, rock.vy) * 1.35 + 12
      const child = (rock.size - 1) as 1 | 2
      w.rocks.push(makeRock(rock.x, rock.y, child, speed, base + rand(0.5, 1), false, rock.hue + rand(-4, 4), rock.sat))
      w.rocks.push(makeRock(rock.x, rock.y, child, speed, base - rand(0.5, 1), false, rock.hue + rand(-4, 4), rock.sat))
    }
    if (rock.size < 3 && Math.random() < 0.07 * w.buffMul) dropPower(rock.x, rock.y)
  }

  function dropPower(x: number, y: number) {
    const w = world.current
    const kinds: PowerKind[] = ['triple', 'rapid', 'shield']
    // The nova bomb joins the pool once the run reaches the nebula (wave 6+).
    const kind = w.wave >= 6 && Math.random() < 0.15 ? 'nova' : kinds[Math.floor(Math.random() * 3)]
    w.powers.push({ x, y, kind, life: 9, bob: rand(0, 6) })
  }

  function spawnComet() {
    const w = world.current
    const { w: W, h: H } = size.current
    // Aim roughly at the ship from a random edge, telegraphed by a warning line.
    const edge = Math.floor(Math.random() * 4)
    const x = edge === 0 ? -40 : edge === 1 ? W + 40 : rand(0, W)
    const y = edge === 2 ? -40 : edge === 3 ? H + 40 : rand(0, H)
    const a = Math.atan2(w.ship.y - y, w.ship.x - x) + rand(-0.2, 0.2)
    w.comets.push({ x, y, vx: Math.cos(a) * COMET_SPEED, vy: Math.sin(a) * COMET_SPEED, warn: 1.2, life: 3 })
    sfx.tick()
  }

  function fire() {
    const w = world.current
    const s = w.ship
    const angles = w.buffs.triple > 0 ? [s.a - 0.17, s.a, s.a + 0.17] : [s.a]
    const nose = 14
    for (const a of angles) {
      w.bullets.push({
        x: s.x + Math.cos(s.a) * nose,
        y: s.y + Math.sin(s.a) * nose,
        vx: Math.cos(a) * 540 + s.vx * 0.5,
        vy: Math.sin(a) * 540 + s.vy * 0.5,
        life: 0.85,
        enemy: false,
      })
    }
    // Recoil nudges the ship back — small but you feel it.
    s.vx -= Math.cos(s.a) * 6
    s.vy -= Math.sin(s.a) * 6
    sfx.shoot()
  }

  function updateBoss(dt: number, W: number, H: number) {
    const w = world.current
    const b = w.boss
    if (!b) return
    const s = w.ship
    b.t += dt
    b.flash = Math.max(0, b.flash - dt)
    const homeY = H * 0.24
    if (b.y < homeY - 2 && b.t < 4) {
      // Slow, ominous entry — no attacks yet.
      b.y += 55 * dt
      return
    }
    b.y += (homeY + Math.sin(b.t * 0.9) * 16 - b.y) * Math.min(1, dt * 2)
    const spd = 42 + Math.min(40, w.wave * 2)
    if (Math.abs(b.tx - b.x) < 6) b.tx = rand(W * 0.22, W * 0.78)
    b.x += Math.sign(b.tx - b.x) * Math.min(Math.abs(b.tx - b.x), spd * dt)
    if (phaseRef.current !== 'play') return
    if (b.charge >= 0) {
      b.charge -= dt
      if (b.charge < 0) {
        // Radial volley with a gap — the telegraph ticks show where bullets go.
        const n = 10 + Math.min(6, Math.floor(w.wave / 5))
        for (let i = 0; i < n; i++) {
          const a = b.dir + (i / n) * Math.PI * 2
          w.bullets.push({ x: b.x + Math.cos(a) * 30, y: b.y + Math.sin(a) * 26, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 3.4, enemy: true })
        }
        // A couple of aimed shots on top in later sectors.
        if (w.wave >= 10 && s.alive) {
          const a = Math.atan2(s.y - b.y, s.x - b.x)
          for (const o of [-0.12, 0.12]) w.bullets.push({ x: b.x, y: b.y, vx: Math.cos(a + o) * 210, vy: Math.sin(a + o) * 210, life: 3, enemy: true })
        }
        b.volley = Math.max(2.4, 4 - w.wave * 0.05)
        fx.ring(b.x, b.y, { color: '#fb7185', maxR: 60, life: 0.3, width: 4 })
        sfx.boom(0.35)
      }
    } else {
      b.volley -= dt
      if (b.volley <= 0) {
        b.charge = 1.05
        b.dir = rand(0, Math.PI * 2)
        sfx.tick()
      }
    }
    b.spawn -= dt
    if (b.spawn <= 0) {
      b.spawn = 7
      // Early sectors drop mines; later the hive launches seeker drones.
      if (w.wave >= 10 && w.drones.length < 3) {
        spawnDrone(b.x - 56, b.y + 6)
        spawnDrone(b.x + 56, b.y + 6)
      } else if (w.mines.length < MINE_CAP) spawnMine(b.x, b.y + 30, rand(-20, 20), 36)
      sfx.whoosh()
    }
  }

  function updateDrones(dt: number, W: number, H: number) {
    const w = world.current
    const s = w.ship
    for (const d of w.drones) {
      d.t += dt
      d.flash = Math.max(0, d.flash - dt)
      d.mt -= dt
      const toS = Math.atan2(s.y - d.y, s.x - d.x)
      let vx = 0
      let vy = 0
      if (d.mode === 'seek') {
        let diff = toS - d.a
        while (diff > Math.PI) diff -= Math.PI * 2
        while (diff < -Math.PI) diff += Math.PI * 2
        d.a += diff * Math.min(1, dt * 3)
        const spd = Math.min(115, 70 + w.wave * 2)
        vx = Math.cos(d.a) * spd
        vy = Math.sin(d.a) * spd
        if (d.mt <= 0 && s.alive && phaseRef.current === 'play' && dist(d.x, d.y, s.x, s.y) < 270) {
          d.mode = 'aim'
          d.mt = 0.8
          sfx.tick()
        }
      } else if (d.mode === 'aim') {
        // Telegraph: hover in place, track the ship, lock the last moment.
        if (d.mt > 0.25) {
          let diff = toS - d.a
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          d.a += diff * Math.min(1, dt * 8)
        }
        if (d.mt <= 0) {
          d.mode = 'dash'
          d.dashA = d.a
          d.mt = 0.55
          sfx.whoosh()
        }
      } else {
        vx = Math.cos(d.dashA) * 400
        vy = Math.sin(d.dashA) * 400
        if (Math.random() < 0.7) fx.burst(d.x, d.y, { count: 1, color: ['#fb7185', '#fde047'], speed: 40, size: 2.6, life: 0.3, gravity: 0 })
        if (d.mt <= 0) {
          d.mode = 'seek'
          d.mt = rand(2.2, 3.4)
        }
      }
      d.x = wrap(d.x + vx * dt, W, 20)
      d.y = wrap(d.y + vy * dt, H, 20)
    }
  }

  function updateMines(dt: number, W: number, H: number) {
    const w = world.current
    const s = w.ship
    for (const m of w.mines) {
      if (m.life <= 0) continue
      m.t += dt
      m.life -= dt
      m.x = wrap(m.x + m.vx * dt, W, 16)
      m.y = wrap(m.y + m.vy * dt, H, 16)
      if (m.arm < 0) {
        if (s.alive && s.inv <= 0 && phaseRef.current === 'play' && dist(m.x, m.y, s.x, s.y) < MINE_TRIGGER) {
          m.arm = MINE_ARM
          sfx.tick()
          haptic.light()
        } else if (m.life <= 0) {
          fx.burst(m.x, m.y, { count: 8, color: ['#94a3b8', '#475569'], speed: 90, gravity: 0 })
        }
      } else {
        m.arm -= dt
        m.beep -= dt
        if (m.beep <= 0) {
          m.beep = 0.15
          sfx.tick()
        }
        if (m.arm <= 0) detonate(m)
      }
    }
    w.mines = w.mines.filter((m) => m.life > 0)
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    // Dev-only: jump to a wave (`__en3skip(10)`), toggle invulnerability, spawn hazards.
    win.__en3skip = (wave: number) => {
      const w = world.current
      w.wave = Math.max(0, wave - 1)
      w.rocks = []
      w.ufo = null
      w.boss = null
      w.drones = []
      w.waveDelay = 0
    }
    win.__en3god = (on = true) => {
      world.current.god = on
    }
    win.__en3spawn = (kind: 'mine' | 'drone' | 'nova') => {
      const w = world.current
      const s = w.ship
      if (kind === 'mine') spawnMine(s.x + 70, s.y - 40, 0, 0)
      else if (kind === 'drone') spawnDrone(s.x + 150, s.y - 100)
      else w.powers.push({ x: s.x + 60, y: s.y, kind: 'nova', life: 12, bob: 0 })
    }
    win.__en3w = () => world.current
    return () => {
      delete win.__en3skip
      delete win.__en3god
      delete win.__en3spawn
      delete win.__en3w
    }
  })

  useEffect(() => {
    const map: Record<string, string> = { ArrowLeft: 'l', a: 'l', ArrowRight: 'r', d: 'r', ArrowUp: 'u', w: 'u', ArrowDown: 'd', s: 'd' }
    function down(e: KeyboardEvent) {
      const k = map[e.key]
      if (!k) return
      e.preventDefault()
      keys.add(k)
    }
    function up(e: KeyboardEvent) {
      const k = map[e.key]
      if (k) keys.delete(k)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [keys])

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    stick.down(e.pointerId, p.x, p.y)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = localPoint(e, e.currentTarget)
    stick.move(e.pointerId, p.x, p.y)
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    stick.up(e.pointerId)
  }

  function inputVec() {
    const v = stick.vec()
    if (v.mag > 0.15 || keys.size === 0) return v
    const x = (keys.has('r') ? 1 : 0) - (keys.has('l') ? 1 : 0)
    const y = (keys.has('d') ? 1 : 0) - (keys.has('u') ? 1 : 0)
    const m = Math.hypot(x, y)
    return m ? { x: x / m, y: y / m, mag: 1 } : v
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const s = w.ship
    const dt = fx.step(raw)
    const playing = phaseRef.current === 'play' || phaseRef.current === 'dying'

    if (playing) {
      if (w.rocks.length === 0 && !w.ufo && !w.boss && w.drones.length === 0 && phaseRef.current === 'play') {
        w.waveDelay -= dt
        if (w.waveDelay <= 0) {
          nextWave()
          w.waveDelay = 1.6
        }
      }

      for (const k of Object.keys(w.buffs) as PowerKind[]) w.buffs[k] = Math.max(0, w.buffs[k] - dt)

      if (s.alive) {
        const v = inputVec()
        s.thrust = 0
        if (v.mag > 0.15) {
          const target = Math.atan2(v.y, v.x)
          let diff = target - s.a
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          s.a += diff * Math.min(1, dt * 12)
          s.thrust = v.mag
          const thrust = 420 * v.mag
          s.vx += Math.cos(s.a) * thrust * dt
          s.vy += Math.sin(s.a) * thrust * dt
          if (Math.random() < 0.8) {
            fx.burst(s.x - Math.cos(s.a) * 12, s.y - Math.sin(s.a) * 12, {
              count: 1,
              color: ['#fde047', '#fb923c', '#f97316'],
              speed: 120,
              angle: s.a + Math.PI,
              spread: 0.5,
              size: 2.6,
              life: 0.3,
              gravity: 0,
            })
          }
        }
        const drag = Math.exp(-0.9 * dt)
        s.vx *= drag
        s.vy *= drag
        const sp = Math.hypot(s.vx, s.vy)
        if (sp > 300) {
          s.vx *= 300 / sp
          s.vy *= 300 / sp
        }
        s.x = wrap(s.x + s.vx * dt, W, 12)
        s.y = wrap(s.y + s.vy * dt, H, 12)
        s.inv = Math.max(0, s.inv - dt)

        w.fireTimer -= dt
        if (w.fireTimer <= 0) {
          fire()
          w.fireTimer = (w.buffs.rapid > 0 ? 0.1 : 0.21) / w.fireRate
        }
      } else if (w.lives > 0) {
        s.respawn -= dt
        if (s.respawn <= 0) {
          Object.assign(s, { x: W / 2, y: H / 2, vx: 0, vy: 0, alive: true, inv: 2.5 })
          fx.ring(s.x, s.y, { color: '#67e8f9', maxR: 50, life: 0.5 })
        }
      }

      // UFO
      if (w.wave >= 2) {
        if (!w.ufo) {
          w.ufoTimer -= dt
          if (w.ufoTimer <= 0) {
            const left = Math.random() < 0.5
            w.ufo = { x: left ? -30 : W + 30, y: rand(H * 0.15, H * 0.6), vx: left ? 70 : -70, t: 0, fire: 1.4, hp: 3, flash: 0 }
            w.ufoTimer = rand(16, 24)
            sfx.whoosh()
          }
        } else {
          const u = w.ufo
          u.t += dt
          u.x += u.vx * dt
          u.y += Math.sin(u.t * 2.2) * 40 * dt
          u.flash = Math.max(0, u.flash - dt)
          u.fire -= dt
          if (u.fire <= 0 && s.alive) {
            const a = Math.atan2(s.y - u.y, s.x - u.x) + rand(-0.25, 0.25)
            w.bullets.push({ x: u.x, y: u.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, life: 2.2, enemy: true })
            u.fire = 1.5
            sfx.tick()
          }
          if (u.x < -60 || u.x > W + 60) w.ufo = null
        }
      }

      // Comets (wave 4+): telegraphed streaks that cross the whole screen.
      if (w.wave >= 4 && phaseRef.current === 'play') {
        w.cometTimer -= dt
        if (w.cometTimer <= 0) {
          spawnComet()
          if (w.wave >= 8 && Math.random() < 0.4) window.setTimeout(() => phaseRef.current === 'play' && spawnComet(), 500)
          w.cometTimer = Math.max(5, rand(10, 15) - w.wave * 0.4)
        }
      }
      for (const c of w.comets) {
        if (c.warn > 0) {
          c.warn -= dt
          if (c.warn <= 0) sfx.whoosh()
          continue
        }
        c.x += c.vx * dt
        c.y += c.vy * dt
        c.life -= dt
        if (Math.random() < 0.6) fx.burst(c.x, c.y, { count: 1, color: ['#fb923c', '#fde047'], speed: 60, size: 3, life: 0.4, gravity: 0 })
        if (s.alive && s.inv <= 0 && dist(c.x, c.y, s.x, s.y) < 18) shipHit()
      }
      w.comets = w.comets.filter((c) => c.life > 0)

      updateBoss(dt, W, H)
      updateDrones(dt, W, H)
    } else if (phaseRef.current === 'idle') {
      if (w.rocks.length < 5) w.rocks.push(makeRock(rand(0, W), -40, (1 + Math.floor(Math.random() * 3)) as 1 | 2 | 3, rand(20, 40)))
      // Attract mode: a demo saucer drifts by now and then.
      if (!w.ufo) {
        w.ufoTimer -= dt
        if (w.ufoTimer <= 0 || w.ufoTimer > 8) {
          w.ufo = { x: -30, y: rand(H * 0.2, H * 0.6), vx: 50, t: 0, fire: 99, hp: 3, flash: 0 }
          w.ufoTimer = 6
        }
      } else {
        w.ufo.t += dt
        w.ufo.x += w.ufo.vx * dt
        w.ufo.y += Math.sin(w.ufo.t * 2.2) * 30 * dt
        if (w.ufo.x > W + 60) w.ufo = null
      }
    }

    // Rocks
    for (const r of w.rocks) {
      r.x = wrap(r.x + r.vx * dt, W, r.r)
      r.y = wrap(r.y + r.vy * dt, H, r.r)
      r.rot += r.vr * dt
      r.flash = Math.max(0, r.flash - raw)
    }

    // Bullets
    for (const b of w.bullets) {
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.life -= dt
      if (!b.enemy) {
        b.x = wrap(b.x, W, 0)
        b.y = wrap(b.y, H, 0)
      }
    }

    if (playing) {
      const dead = new Set<Rock>()
      const spawned: Rock[] = []
      const before = w.rocks.length
      for (const b of w.bullets) {
        if (b.life <= 0) continue
        if (b.enemy) {
          if (s.alive && dist(b.x, b.y, s.x, s.y) < 12) {
            b.life = 0
            shipHit()
          }
          continue
        }
        if (w.boss && w.boss.y > -20 && Math.abs(b.x - w.boss.x) < 66 && Math.abs(b.y - w.boss.y) < 38 && (dist(b.x, b.y, w.boss.x, w.boss.y) < 40 || Math.abs(b.y - w.boss.y - 3) < 12)) {
          b.life = 0
          const bo = w.boss
          bo.hp -= 1
          bo.flash = 0.06
          fx.burst(b.x, b.y, { count: 4, color: ['#c4b5fd', '#ffffff'], speed: 130, gravity: 0, size: 2 })
          if (Math.random() < 0.4) sfx.clang()
          if (bo.hp <= 0) killBoss()
          continue
        }
        let hitOther = false
        for (const d of w.drones) {
          if (d.hp > 0 && dist(b.x, b.y, d.x, d.y) < 15) {
            b.life = 0
            d.hp -= 1
            d.flash = 0.08
            fx.burst(b.x, b.y, { count: 5, color: ['#fda4af', '#ffffff'], speed: 130, gravity: 0, size: 2 })
            if (d.hp <= 0) killDrone(d)
            else sfx.hit()
            hitOther = true
            break
          }
        }
        if (hitOther) continue
        for (const m of w.mines) {
          if (m.life > 0 && dist(b.x, b.y, m.x, m.y) < 15) {
            b.life = 0
            if (m.arm < 0 || m.arm > 0.05) {
              m.arm = 0.01
              addScore(40)
              fx.text(m.x, m.y - 16, '+40 MINE', '#fca5a5', 13)
            }
            hitOther = true
            break
          }
        }
        if (hitOther) continue
        if (w.ufo && dist(b.x, b.y, w.ufo.x, w.ufo.y) < 22) {
          b.life = 0
          const u = w.ufo
          u.hp -= 1
          u.flash = 0.08
          fx.burst(b.x, b.y, { count: 6, color: '#a7f3d0', speed: 140 })
          sfx.hit()
          if (u.hp <= 0) {
            fx.explode(u.x, u.y, 1.5, ['#86efac', '#fde047', '#ffffff'])
            fx.stop(0.1)
            fx.shake(8, 0.25)
            sfx.boom(0.8)
            haptic.heavy()
            addScore(300)
            fx.text(u.x, u.y, '+300 UFO', '#86efac', 20)
            w.stats.ufos += 1
            dropPower(u.x, u.y)
            w.ufo = null
          }
          continue
        }
        for (const r of w.rocks) {
          if (dead.has(r)) continue
          if (dist(b.x, b.y, r.x, r.y) < r.r * 0.92) {
            b.life = 0
            r.hp -= 1
            r.flash = 0.07
            r.vx += b.vx * 0.02
            r.vy += b.vy * 0.02
            fx.burst(b.x, b.y, { count: 5, color: r.crystal ? ['#a5f3fc', '#ffffff'] : ['#fef3c7', '#d6d3d1'], speed: 120, angle: Math.atan2(-b.vy, -b.vx), spread: 1.4, size: 2, gravity: 0 })
            if (r.hp <= 0) {
              dead.add(r)
              const len = w.rocks.length
              destroyRock(r, b.vx, b.vy)
              spawned.push(...w.rocks.splice(len))
            } else {
              if (r.crystal) sfx.clang()
              else sfx.hit()
              haptic.light()
            }
            break
          }
        }
      }
      if (dead.size || spawned.length) {
        w.rocks = w.rocks.slice(0, before).filter((r) => !dead.has(r)).concat(spawned)
        run.update(w.stats)
      }

      if (s.alive && s.inv <= 0) {
        for (const r of w.rocks) {
          if (dist(r.x, r.y, s.x, s.y) < r.r * 0.85 + 9) {
            if (w.buffs.shield > 0) {
              r.hp = 0
              const len = w.rocks.length
              destroyRock(r, s.vx, s.vy)
              const kids = w.rocks.splice(len)
              w.rocks = w.rocks.filter((o) => o !== r).concat(kids)
              shipHit()
            } else shipHit()
            break
          }
        }
        if (w.ufo && dist(w.ufo.x, w.ufo.y, s.x, s.y) < 26) shipHit()
        if (w.boss && dist(w.boss.x, w.boss.y, s.x, s.y) < 46) shipHit()
        for (const d of w.drones) {
          if (d.hp > 0 && dist(d.x, d.y, s.x, s.y) < 16) {
            shipHit()
            killDrone(d)
            break
          }
        }
      }

      updateMines(dt, W, H)
      w.drones = w.drones.filter((d) => d.hp > 0)

      for (const p of w.powers) {
        p.life -= dt
        p.bob += dt
        if (s.alive && dist(p.x, p.y, s.x, s.y) < 28) {
          p.life = 0
          if (p.kind === 'nova') nova(s.x, s.y)
          else w.buffs[p.kind] = (p.kind === 'shield' ? 12 : 8) * w.buffMul
          fx.ring(p.x, p.y, { color: POWER_COLOR[p.kind][0], maxR: 44 })
          fx.burst(p.x, p.y, { count: 12, color: [POWER_COLOR[p.kind][0], '#ffffff'], speed: 160, shape: 'spark', gravity: 0 })
          fx.text(p.x, p.y - 20, POWER_LABEL[p.kind], POWER_COLOR[p.kind][0], 16)
          sfx.power()
          haptic.medium()
        }
      }
      w.powers = w.powers.filter((p) => p.life > 0)
    }
    w.bullets = w.bullets.filter((b) => b.life > 0)

    // ── Draw ─────────────────────────────────────
    // Biome background, cross-fading over ~2.5 s when a new sector begins.
    w.biomeBlend = Math.min(1, w.biomeBlend + raw * 0.4)
    const bio = BIOMES[w.biome]
    if (w.biomeBlend < 1) drawSpaceBg(ctx, BIOMES[w.prevBiome], W, H, t, 1)
    drawSpaceBg(ctx, bio, W, H, t, w.biomeBlend < 1 ? w.biomeBlend : 1)
    const starCol = w.biomeBlend < 0.5 ? BIOMES[w.prevBiome].star : bio.star
    for (const st of w.stars) {
      st.x = (st.x - s.vx * st.z * 0.04 * raw + W) % W
      st.y = (st.y - s.vy * st.z * 0.04 * raw + H) % H
      ctx.globalAlpha = 0.3 + st.z * 0.6 + Math.sin(t * 3 + st.x) * 0.1
      ctx.fillStyle = starCol
      ctx.fillRect(st.x, st.y, st.z * 2, st.z * 2)
    }
    ctx.globalAlpha = 1
    drawMotes(ctx, bio, w.motes, W, H, raw, s.vx, s.vy, t, w.biomeBlend)

    fx.applyShake(ctx)

    // comet warning lines
    for (const c of w.comets) {
      if (c.warn <= 0) continue
      const blink = Math.floor(c.warn * 10) % 2 === 0
      ctx.strokeStyle = blink ? 'rgba(239,68,68,0.75)' : 'rgba(239,68,68,0.35)'
      ctx.lineWidth = 3
      ctx.setLineDash([12, 10])
      ctx.beginPath()
      ctx.moveTo(c.x, c.y)
      ctx.lineTo(c.x + c.vx * 3, c.y + c.vy * 3)
      ctx.stroke()
      ctx.setLineDash([])
      const ex = Math.min(W - 18, Math.max(18, c.x))
      const ey = Math.min(H - 18, Math.max(18, c.y))
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.moveTo(ex, ey - 12)
      ctx.lineTo(ex + 11, ey + 8)
      ctx.lineTo(ex - 11, ey + 8)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillRect(ex - 1.5, ey - 5, 3, 7)
      ctx.fillRect(ex - 1.5, ey + 4, 3, 2.5)
    }

    for (const m of w.mines) {
      if (m.arm >= 0) {
        // Arming: blast radius closes in as the fuse burns.
        const k = 1 - Math.max(0, m.arm) / MINE_ARM
        ctx.fillStyle = `rgba(239,68,68,${0.08 + k * 0.14})`
        ctx.beginPath()
        ctx.arc(m.x, m.y, MINE_BLAST, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = Math.floor(t * 16) % 2 ? 'rgba(248,113,113,0.95)' : 'rgba(254,202,202,0.7)'
        ctx.lineWidth = 2.5
        ctx.setLineDash([8, 6])
        ctx.beginPath()
        ctx.arc(m.x, m.y, MINE_BLAST, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.strokeStyle = 'rgba(254,202,202,0.9)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(m.x, m.y, 16 + (MINE_BLAST - 16) * k, 0, Math.PI * 2)
        ctx.stroke()
        glow(ctx, m.x, m.y, 30, '#ef4444', 0.5)
      } else {
        glow(ctx, m.x, m.y, 22, '#ef4444', 0.16 + Math.sin(t * 4 + m.t) * 0.06)
        // faint trigger zone
        ctx.strokeStyle = 'rgba(248,113,113,0.08)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(m.x, m.y, MINE_TRIGGER, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (m.life < 3 && m.arm < 0 && Math.floor(m.life * 8) % 2 === 0) continue
      drawMine(ctx, m.x, m.y, t + m.t, m.arm >= 0 ? 1 - m.arm / MINE_ARM : -1, false)
    }

    for (const r of w.rocks) {
      if (r.crystal) glow(ctx, r.x, r.y, r.r * 2, '#22d3ee', 0.35 + Math.sin(t * 5) * 0.1)
      ctx.save()
      ctx.translate(r.x, r.y)
      ctx.rotate(r.rot)
      ctx.beginPath()
      r.verts.forEach((k, i) => {
        const a = (i / r.verts.length) * Math.PI * 2
        const px = Math.cos(a) * r.r * k
        const py = Math.sin(a) * r.r * k
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.closePath()
      const g = ctx.createLinearGradient(-r.r, -r.r, r.r, r.r)
      if (r.crystal) {
        g.addColorStop(0, '#cffafe')
        g.addColorStop(0.5, '#22d3ee')
        g.addColorStop(1, '#4c1d95')
      } else {
        g.addColorStop(0, `hsl(${r.hue} ${r.sat}% 52%)`)
        g.addColorStop(1, `hsl(${r.hue} ${r.sat + 3}% 22%)`)
      }
      ctx.fillStyle = r.flash > 0 ? '#ffffff' : g
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = r.crystal ? '#ecfeff' : `hsl(${r.hue} ${r.sat + 8}% 70% / 0.6)`
      ctx.stroke()
      if (r.crystal && r.flash <= 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(-r.r * 0.5, -r.r * 0.2)
        ctx.lineTo(0, -r.r * 0.6)
        ctx.lineTo(r.r * 0.4, r.r * 0.1)
        ctx.lineTo(-r.r * 0.1, r.r * 0.5)
        ctx.closePath()
        ctx.stroke()
      } else if (r.size > 1 && r.flash <= 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.22)'
        ctx.beginPath()
        ctx.arc(r.r * 0.25, -r.r * 0.2, r.r * 0.2, 0, Math.PI * 2)
        ctx.arc(-r.r * 0.3, r.r * 0.3, r.r * 0.13, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.beginPath()
        ctx.arc(-r.r * 0.3, -r.r * 0.35, r.r * 0.35, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    for (const p of w.powers) {
      if (p.life < 2 && Math.floor(p.life * 8) % 2 === 0) continue
      glow(ctx, p.x, p.y, 28, POWER_COLOR[p.kind][0], 0.4)
      drawPower(ctx, p.kind, p.x, p.y + Math.sin(p.bob * 4) * 3, t)
    }

    if (w.ufo) {
      const u = w.ufo
      glow(ctx, u.x, u.y, 38, '#4ade80', 0.35)
      const charge = u.fire < 0.5 && phaseRef.current === 'play' ? 1 - u.fire / 0.5 : 0
      drawUfo(ctx, u.x, u.y, u.t, u.flash > 0, charge)
    }

    if (w.boss) {
      const b = w.boss
      const charge = b.charge >= 0 ? 1 - b.charge / 1.05 : 0
      glow(ctx, b.x, b.y, 90, charge > 0 ? '#f43f5e' : '#a78bfa', 0.3 + charge * 0.3)
      if (charge > 0) {
        // Volley telegraph: ticks along every bullet lane.
        const n = 10 + Math.min(6, Math.floor(w.wave / 5))
        ctx.strokeStyle = `rgba(251,113,133,${0.35 + charge * 0.55})`
        ctx.lineWidth = 3
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const a = b.dir + (i / n) * Math.PI * 2
          const r0 = 50
          const r1 = 50 + 24 * charge
          ctx.moveTo(b.x + Math.cos(a) * r0, b.y + Math.sin(a) * r0)
          ctx.lineTo(b.x + Math.cos(a) * r1, b.y + Math.sin(a) * r1)
        }
        ctx.stroke()
      }
      drawMothership(ctx, b.x, b.y, t, charge, b.flash > 0, b.hp / b.max)
    }

    for (const d of w.drones) {
      if (d.mode === 'aim') {
        const k = 1 - d.mt / 0.8
        ctx.strokeStyle = Math.floor(t * 14) % 2 ? `rgba(244,63,94,${0.4 + k * 0.5})` : `rgba(254,205,211,${0.3 + k * 0.4})`
        ctx.lineWidth = 2 + k * 2
        ctx.setLineDash([10, 8])
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x + Math.cos(d.a) * 220, d.y + Math.sin(d.a) * 220)
        ctx.stroke()
        ctx.setLineDash([])
      }
      glow(ctx, d.x, d.y, 24, '#f43f5e', d.mode === 'aim' ? 0.55 : 0.28)
      drawDrone(ctx, d.x, d.y, d.mode === 'dash' ? d.dashA : d.a, t + d.t, d.mode === 'aim' ? 1 - d.mt / 0.8 : 0, d.mode === 'dash', d.flash > 0)
    }

    for (const c of w.comets) if (c.warn <= 0) drawComet(ctx, c.x, c.y, c.vx, c.vy, t)

    for (const b of w.bullets) {
      const color = b.enemy ? '#f472b6' : '#fde047'
      glow(ctx, b.x, b.y, b.enemy ? 10 : 8, color, 0.7)
      ctx.strokeStyle = color
      ctx.lineWidth = b.enemy ? 4 : 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(b.x, b.y)
      ctx.lineTo(b.x - b.vx * 0.018, b.y - b.vy * 0.018)
      ctx.stroke()
    }

    if (s.alive && phaseRef.current !== 'idle' && !(s.inv > 0 && Math.floor(t * 14) % 2 === 0)) {
      glow(ctx, s.x, s.y, 26, '#22d3ee', 0.3)
      drawShip(ctx, s.x, s.y, s.a, s.thrust, t)
      if (w.buffs.shield > 0) {
        ctx.strokeStyle = `rgba(103,232,249,${0.5 + Math.sin(t * 8) * 0.2})`
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(s.x, s.y, 22, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    fx.draw(ctx)
    ctx.restore()
    if (w.boss && phaseRef.current !== 'idle') {
      // Boss health bar along the bottom edge.
      const bw = Math.min(260, W - 60)
      const bx = (W - bw) / 2
      const by = H - 34
      ctx.fillStyle = 'rgba(15,23,42,0.75)'
      ctx.beginPath()
      ctx.roundRect(bx - 4, by - 16, bw + 8, 26, 8)
      ctx.fill()
      ctx.fillStyle = '#e9d5ff'
      ctx.font = '900 10px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('HIVE MOTHERSHIP', W / 2, by - 5)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.fillRect(bx, by, bw, 6)
      const hg = ctx.createLinearGradient(bx, 0, bx + bw, 0)
      hg.addColorStop(0, '#f472b6')
      hg.addColorStop(1, '#a78bfa')
      ctx.fillStyle = hg
      ctx.fillRect(bx, by, bw * Math.max(0, w.boss.hp / w.boss.max), 6)
    }
    stick.draw(ctx)
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const buffs = world.current.buffs
  const shipIcons = Array.from({ length: Math.max(lives, 0) }, () => '▲').join(' ')

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div
          className="action-arena"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{score}</div>
                <div className="action-hud__small">Wave {wave}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hearts" style={{ color: '#67e8f9' }}>
                  {shipIcons || '—'}
                </span>
                <span className="action-hud__small">
                  {(Object.keys(buffs) as PowerKind[]).filter((k) => buffs[k] > 0).map((k) => POWER_ICON[k]).join(' ')}
                </span>
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
              game="asteroids"
              icon={meta.icon}
              title={meta.title}
              hint="Drag anywhere to fly — your ship fires on its own. Shatter rocks, dodge the debris."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={wave >= 3 ? 'Sector cleared!' : 'Ship destroyed'}
            subtitle={`Score ${score} · Wave ${wave}`}
            celebrate={wave >= 3}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
