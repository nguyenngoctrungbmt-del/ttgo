import { useEffect, useRef, useState, type PointerEvent } from 'react'
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
import './zombie.css'
import { Ambient, BIOMES, biomeIndexFor, drawBiome, drawBomber, drawGlob, drawMother, drawRapidPickup, drawSpitter, sacPos, SACS } from './content'

const meta = getGame('zombie')

type Phase = 'idle' | 'play' | 'between' | 'dying' | 'over'
type ZKind = 'walker' | 'runner' | 'brute' | 'crawler' | 'tank' | 'spitter' | 'bomber' | 'mother'
type PickKind = 'grenade' | 'slow' | 'repair' | 'rapid'

type Zombie = {
  id: number
  kind: ZKind
  lane: number
  z: number
  hp: number
  max: number
  speed: number
  bob: number
  flinch: number
  attack: number
  dead: number
  tint: number
  /** Spitter: time to next spit. Mother: time to next brood. */
  charge: number
  /** Spitter stops at this depth. */
  hold: number
  /** Bomber beep timer. */
  beep: number
  /** Brood Mother weak-spot hp. */
  sacs: number[]
}

type Pickup = { kind: PickKind; x: number; y: number; life: number }
type Hole = { x: number; y: number; life: number }
/** Acid glob arcing from a spitter to the barricade (screen space). */
type Glob = { x0: number; y0: number; x1: number; y1: number; t: number; dur: number; x: number; y: number }

const MAG = 8
const RELOAD = 1.05
const BARRICADE = 100

const ZSTAT: Record<ZKind, { hp: number; speed: number; h: number; value: number; dmg: number }> = {
  walker: { hp: 3, speed: 0.085, h: 120, value: 10, dmg: 6 },
  runner: { hp: 2, speed: 0.17, h: 112, value: 15, dmg: 5 },
  brute: { hp: 12, speed: 0.055, h: 160, value: 50, dmg: 15 },
  crawler: { hp: 2, speed: 0.1, h: 54, value: 20, dmg: 6 },
  // Boss every 5th wave: headshots only chip it.
  tank: { hp: 30, speed: 0.04, h: 210, value: 300, dmg: 25 },
  // Wave 6+: stops mid-street and lobs acid at the wall.
  spitter: { hp: 4, speed: 0.09, h: 118, value: 35, dmg: 7 },
  // Wave 8+: explodes on the wall — or on its friends if you drop it first.
  bomber: { hp: 5, speed: 0.075, h: 128, value: 40, dmg: 18 },
  // Boss every 10th wave (replaces the Tank): pop its sacs before it births a horde.
  mother: { hp: 36, speed: 0.03, h: 200, value: 400, dmg: 28 },
}

const SPIT_TELL = 1.2
const BROOD_EVERY = 6

/** Vector pickup icons, centred on (0,0), ~30 px. */
function drawPickup(ctx: CanvasRenderingContext2D, kind: PickKind, t: number) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (kind === 'grenade') {
    const g = ctx.createRadialGradient(-4, -2, 1, 0, 2, 13)
    g.addColorStop(0, '#a3e635')
    g.addColorStop(1, '#365314')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(0, 3, 10, 12, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-10, 3)
    ctx.lineTo(10, 3)
    ctx.moveTo(0, -9)
    ctx.lineTo(0, 15)
    ctx.stroke()
    ctx.fillStyle = '#9ca3af'
    ctx.fillRect(-4, -13, 8, 5)
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(7, -12, 4, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.ellipse(-4, -2, 2.5, 4, -0.4, 0, Math.PI * 2)
    ctx.fill()
  } else if (kind === 'slow') {
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(-3, -16, 6, 5)
    ctx.fillStyle = '#e0f2fe'
    ctx.strokeStyle = '#0284c7'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 2, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, 2)
    ctx.lineTo(0, -6)
    ctx.moveTo(0, 2)
    ctx.lineTo(Math.cos(t * 3) * 7, 2 + Math.sin(t * 3) * 7)
    ctx.stroke()
    ctx.fillStyle = '#0284c7'
    ctx.beginPath()
    ctx.arc(0, 2, 2, 0, Math.PI * 2)
    ctx.fill()
  } else if (kind === 'rapid') {
    drawRapidPickup(ctx, t)
  } else {
    // Wrench
    ctx.save()
    ctx.rotate(-0.7)
    ctx.fillStyle = '#cbd5e1'
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(-3.5, -4, 7, 20, 3)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, -9, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#1c1917'
    ctx.fillRect(-3, -18, 6, 9)
    ctx.restore()
    ctx.fillStyle = '#86efac'
    ctx.beginPath()
    ctx.arc(9, 9, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#14532d'
    ctx.fillRect(7.8, 6, 2.4, 6)
    ctx.fillRect(6, 7.8, 6, 2.4)
  }
}

type World = {
  zombies: Zombie[]
  pickups: Pickup[]
  holes: Hole[]
  globs: Glob[]
  ammo: number
  mag: number
  wallMax: number
  dropChance: number
  reload: number
  recoil: number
  flash: { x: number; y: number; t: number } | null
  barricade: number
  wave: number
  toSpawn: number
  spawnTimer: number
  between: number
  slow: number
  rapid: number
  biome: number
  biomeFade: number
  bonusCoins: number
  introduced: ZKind[]
  hsStreak: number
  id: number
  score: number
  stats: { score: number; kills: number; headshots: number; wave: number; hsStreak: number }
}

function freshWorld(): World {
  return {
    zombies: [],
    pickups: [],
    holes: [],
    globs: [],
    ammo: MAG,
    mag: MAG,
    wallMax: BARRICADE,
    dropChance: 0.1,
    reload: 0,
    recoil: 0,
    flash: null,
    barricade: BARRICADE,
    wave: 0,
    toSpawn: 0,
    spawnTimer: 0,
    between: 0,
    slow: 0,
    rapid: 0,
    biome: 0,
    biomeFade: 1,
    bonusCoins: 0,
    introduced: [],
    hsStreak: 0,
    id: 1,
    score: 0,
    stats: { score: 0, kills: 0, headshots: 0, wave: 0, hsStreak: 0 },
  }
}

export default function ZombieGame() {
  const run = useActionRun('zombie')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 520 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const ambient = useRef(new Ambient()).current

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, wave: 1, ammo: MAG, mag: MAG, reloading: false, barricade: 100, rapid: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const lastMilestone = useRef(0)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, wave: w.wave, ammo: w.ammo, mag: w.mag, reloading: w.reload > 0, barricade: Math.max(0, Math.round((w.barricade / w.wallMax) * 100)), rapid: Math.ceil(w.rapid) })
  }

  function milestone(kind: string, value: number) {
    const now = performance.now()
    if (now - lastMilestone.current < 30000) return
    lastMilestone.current = now
    void trackEvent('action_milestone', { game_id: 'zombie', kind, value })
  }

  function view() {
    const { w: W, h: H } = size.current
    return { W, H, horizon: H * 0.34, front: H - 70 }
  }

  /** Perspective projection: p=0 at horizon, p=1 at the barricade. */
  function project(lane: number, z: number) {
    const { W, horizon, front } = view()
    const p = 1 - z
    const s = 0.28 + p * 0.85
    const y = horizon + (front - horizon) * Math.pow(p, 1.15)
    const x = W / 2 + lane * (W * 0.1 + W * 0.36 * p)
    return { x, y, s }
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.mag = MAG + run.level('mag') * 2
    w.ammo = w.mag
    w.wallMax = BARRICADE + run.level('wall') * 20
    w.barricade = w.wallMax
    w.dropChance = 0.1 + run.level('lucky') * 0.04
    world.current = w
    fx.reset()
    ambient.reset(BIOMES[0].ambient)
    run.begin()
    setPhaseBoth('play')
    nextWave()
  }

  function nextWave() {
    const w = world.current
    w.wave += 1
    w.stats.wave = w.wave
    w.toSpawn = 5 + w.wave * 3
    w.spawnTimer = 1
    pushHud()
    run.update(w.stats)
    const mother = w.wave % 10 === 0
    const boss = w.wave % 5 === 0
    setBiome(biomeIndexFor(w.wave), false)
    if (mother) {
      spawnZombie('mother')
      bossSting()
    } else if (boss) {
      // The tank lumbers in first, the horde follows.
      spawnZombie('tank')
      sfx.boom(0.6)
    }
    if (w.wave > 1 && w.wave % 5 === 1) milestone('wave', w.wave - 1)
    const intro = w.wave === 6 ? 'spitters lob acid · shoot the globs' : w.wave === 8 ? 'bombers blow up · drop them early' : undefined
    setBanner({
      key: Date.now(),
      text: mother ? `WAVE ${w.wave} · BROOD MOTHER` : boss ? `WAVE ${w.wave} · TANK` : `WAVE ${w.wave}`,
      sub: w.wave === 1 ? 'tap to shoot · aim for heads' : mother ? 'pop the glowing sacs' : boss ? 'pour bullets into the boss' : w.wave === 2 ? 'runners incoming' : w.wave === 3 ? 'crawlers stay low' : w.wave === 4 ? 'brutes soak up bullets' : intro,
    })
    if (!mother) sfx.levelUp()
  }

  function spawnZombie(force?: ZKind) {
    const w = world.current
    const r = Math.random()
    let kind: ZKind = 'walker'
    if (w.wave >= 2 && r < 0.25) kind = 'runner'
    if (w.wave >= 3 && r > 0.82) kind = 'crawler'
    if (w.wave >= 4 && r > 0.93) kind = 'brute'
    // Newer threats take a slice of the walker share, growing slowly with the wave.
    const late = Math.min(0.06, (w.wave - 6) * 0.006)
    if (w.wave >= 6 && r > 0.3 && r < 0.37 + late && w.zombies.filter((z) => !z.dead && z.kind === 'spitter').length < 3) kind = 'spitter'
    if (w.wave >= 8 && r > 0.45 && r < 0.51 + late) kind = 'bomber'
    // First wave a new threat is allowed, make sure it shows up early.
    if (!force && w.wave >= 6 && !w.introduced.includes('spitter')) kind = 'spitter'
    else if (!force && w.wave >= 8 && !w.introduced.includes('bomber')) kind = 'bomber'
    if (force) kind = force
    if (!w.introduced.includes(kind)) w.introduced.push(kind)
    const st = ZSTAT[kind]
    const hp = Math.round(st.hp * (1 + (w.wave - 1) * 0.08))
    w.zombies.push({
      id: w.id++,
      kind,
      lane: kind === 'tank' || kind === 'mother' ? rand(-0.3, 0.3) : rand(-0.9, 0.9),
      z: 1,
      hp,
      max: hp,
      speed: st.speed * (1 + w.wave * 0.03) * rand(0.85, 1.15),
      bob: rand(0, 6),
      flinch: 0,
      attack: 1,
      dead: 0,
      tint: rand(80, 130),
      charge: kind === 'mother' ? 4 : 1.6,
      hold: rand(0.38, 0.55),
      beep: 0,
      sacs: kind === 'mother' ? SACS.map(() => 2) : [],
    })
    if (Math.random() < 0.3) sfx.miss()
  }

  function startReload() {
    const w = world.current
    if (w.reload > 0 || w.ammo === w.mag) return
    w.reload = RELOAD
    sfx.tick()
    window.setTimeout(() => sfx.tick(), 380)
    pushHud()
  }

  function zombieBox(zb: Zombie) {
    const { x, y, s } = project(zb.lane, zb.z)
    const h = ZSTAT[zb.kind].h * s
    const k = zb.kind
    const wdt = (k === 'mother' ? 130 : k === 'tank' ? 100 : k === 'brute' ? 70 : k === 'crawler' ? 64 : k === 'bomber' ? 62 : k === 'spitter' ? 40 : 44) * s
    const headR = (k === 'tank' ? 20 : k === 'brute' ? 17 : k === 'mother' ? 15 : 13) * s
    const headY = zb.kind === 'crawler' ? y - h * 0.55 : y - h + headR
    const headX = zb.kind === 'crawler' ? x + wdt * 0.32 : x
    return { x, y, s, h, wdt, headR, headX, headY }
  }

  /** Switch the scenery; `announce` shows the biome banner (used between waves). */
  function setBiome(i: number, announce: boolean) {
    const w = world.current
    if (i === w.biome) return
    w.biome = i
    w.biomeFade = 0
    ambient.reset(BIOMES[i].ambient)
    if (announce) {
      setBanner({ key: Date.now(), text: BIOMES[i].name, sub: BIOMES[i].sub })
      sfx.whoosh()
      window.setTimeout(() => sfx.ready(), 250)
    }
  }

  /** Short musical sting for the Brood Mother's arrival. */
  function bossSting() {
    sfx.boom(0.8)
    fx.shake(10, 0.6)
    fx.flash('#a855f7', 0.25)
    haptic.heavy()
    window.setTimeout(() => sfx.hurt(), 180)
    window.setTimeout(() => sfx.boom(0.4), 420)
    window.setTimeout(() => sfx.levelUp(), 700)
  }

  /** Bomber detonation: hurts the horde when shot, the wall when it gets there. */
  function bomberBlast(zb: Zombie, onWall: boolean) {
    const w = world.current
    const b = zombieBox(zb)
    const cx = b.x
    const cy = b.y - b.h * 0.5
    fx.explode(cx, cy, 2, ['#fde047', '#f97316', '#ef4444', '#fff7ed'])
    fx.stop(0.1)
    sfx.boom(0.9)
    haptic.heavy()
    if (onWall) {
      w.barricade -= ZSTAT.bomber.dmg
      fx.flash('#ef4444', 0.3)
      fx.shake(14, 0.4)
      fx.text(cx, view().front - 40, `-${ZSTAT.bomber.dmg} WALL`, '#fca5a5', 18)
      pushHud()
      checkBreach()
      return
    }
    let chain = 0
    const radius = 120 * b.s + 50
    for (const o of w.zombies) {
      if (o.dead || o === zb) continue
      const ob = zombieBox(o)
      if (dist(ob.x, ob.y - ob.h / 2, cx, cy) > radius) continue
      if (o.kind === 'tank' || o.kind === 'mother') {
        o.hp -= 8
        o.flinch = 0.3
        if (o.hp <= 0) killZombie(o, false)
      } else {
        o.hp = 0
        chain += 1
        killZombie(o, false)
      }
    }
    if (chain > 0) {
      const bonus = chain * 15
      w.score += bonus
      w.stats.score = w.score
      fx.text(cx, cy - 40, `CHAIN ×${chain} +${bonus}`, '#fdba74', 18)
      sfx.combo()
    }
  }

  function checkBreach() {
    const w = world.current
    if (w.barricade > 0 || phaseRef.current === 'dying' || phaseRef.current === 'over' || phaseRef.current === 'idle') return
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.4)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.wave * 3 + w.stats.kills * 0.2 + w.stats.headshots * 0.2) + w.bonusCoins
      run.end({ score: w.score, cleared: w.wave >= 4, stats: { ...w.stats }, coins }, revive)
    }, 1300)
  }

  function killZombie(zb: Zombie, headshot: boolean) {
    const w = world.current
    zb.dead = 0.001
    const b = zombieBox(zb)
    const value = ZSTAT[zb.kind].value * (headshot ? 2 : 1)
    w.score += value
    w.stats.kills += 1
    w.stats.score = w.score
    fx.burst(b.x, b.y - b.h * 0.5, { count: 20, color: ['#65a30d', '#3f6212', '#a3e635'], speed: 220 * b.s + 60, size: 4 * b.s + 1, gravity: 500 })
    fx.text(b.x, b.y - b.h - 10, headshot ? `HEADSHOT +${value}` : `+${value}`, headshot ? '#fde047' : '#fff', headshot ? 20 : 15)
    if (zb.kind === 'brute') {
      fx.shake(8, 0.3)
      fx.stop(0.08)
      sfx.boom(0.5)
    } else if (zb.kind === 'tank') {
      fx.explode(b.x, b.y - b.h * 0.5, 2.4, ['#a3e635', '#65a30d', '#fde047', '#ffffff'])
      fx.shake(14, 0.5)
      fx.stop(0.15)
      fx.slowmo(0.8, 0.3)
      sfx.boom(1)
      sfx.win()
      setBanner({ key: Date.now(), text: 'TANK DOWN!', sub: `+${value}` })
      milestone('boss', w.wave)
      // Bosses always drop a goodie.
      w.pickups.push({ kind: 'repair', x: b.x, y: b.y - b.h * 0.5, life: 7 })
    } else if (zb.kind === 'mother') {
      fx.explode(b.x, b.y - b.h * 0.5, 2.8, ['#d9f99d', '#a855f7', '#fde047', '#ffffff'])
      fx.burst(b.x, b.y - b.h * 0.5, { count: 30, color: ['#a3e635', '#7c3aed', '#fef9c3'], speed: 380, size: 5, gravity: 600 })
      fx.shake(18, 0.6)
      fx.stop(0.18)
      fx.slowmo(1, 0.25)
      fx.flash('#d9f99d', 0.35)
      sfx.boom(1)
      sfx.win()
      window.setTimeout(() => sfx.combo(), 300)
      window.setTimeout(() => sfx.mission(), 650)
      haptic.success()
      // Reward: wall patch, bonus coins and a rapid-fire crate.
      w.barricade = Math.min(w.wallMax, w.barricade + 25)
      w.bonusCoins += 10
      setBanner({ key: Date.now(), text: 'BROOD MOTHER SLAIN!', sub: `+${value} · +25 wall · +10 coins` })
      milestone('boss', w.wave)
      w.pickups.push({ kind: 'rapid', x: b.x - 30, y: b.y - b.h * 0.5, life: 9 })
      w.pickups.push({ kind: 'repair', x: b.x + 30, y: b.y - b.h * 0.45, life: 9 })
      // The unborn brood dies with her.
      for (const o of w.zombies) {
        if (!o.dead && o.kind === 'crawler' && o.z > 0.15) {
          o.hp = 0
          killZombie(o, false)
        }
      }
      pushHud()
    } else if (zb.kind === 'bomber') {
      bomberBlast(zb, false)
    }
    haptic.medium()
    if (zb.kind !== 'tank' && zb.kind !== 'mother' && Math.random() < w.dropChance && w.pickups.length < 4) {
      const kinds: PickKind[] = w.wave >= 5 ? ['grenade', 'slow', 'repair', 'rapid'] : ['grenade', 'slow', 'repair']
      w.pickups.push({ kind: kinds[Math.floor(Math.random() * kinds.length)], x: b.x, y: b.y - b.h * 0.5, life: 6 })
    }
    run.update(w.stats)
  }

  function usePickup(p: Pickup) {
    const w = world.current
    p.life = 0
    sfx.power()
    haptic.success()
    if (p.kind === 'grenade') {
      fx.explode(p.x, p.y, 2.2)
      fx.flash('#fff7ed', 0.3)
      fx.stop(0.12)
      sfx.boom(1)
      haptic.heavy()
      for (const zb of w.zombies) {
        if (zb.dead) continue
        const b = zombieBox(zb)
        if (dist(b.x, b.y - b.h / 2, p.x, p.y) < 150) {
          if (zb.kind === 'tank' || zb.kind === 'mother') {
            zb.hp -= 15
            zb.flinch = 0.3
            if (zb.hp <= 0) killZombie(zb, false)
          } else {
            zb.hp = 0
            killZombie(zb, false)
          }
        }
      }
      setBanner({ key: Date.now(), text: 'BOOM!' })
    } else if (p.kind === 'slow') {
      w.slow = 5
      setBanner({ key: Date.now(), text: 'SLOW TIME', sub: '5 seconds' })
    } else if (p.kind === 'rapid') {
      w.rapid = 6
      w.reload = 0
      w.ammo = w.mag
      fx.ring(p.x, p.y, { color: '#fbbf24', maxR: 60, life: 0.4, width: 4 })
      setBanner({ key: Date.now(), text: 'RAPID FIRE', sub: 'no reloads · double body damage' })
    } else {
      w.barricade = Math.min(w.wallMax, w.barricade + 30)
      fx.text(p.x, p.y, '+30 WALL', '#86efac', 18)
    }
    pushHud()
  }

  function shoot(px: number, py: number) {
    const w = world.current
    // Pickups are tapped, not shot.
    for (const p of w.pickups) {
      if (p.life > 0 && dist(p.x, p.y, px, py) < 30) {
        usePickup(p)
        return
      }
    }
    const rapid = w.rapid > 0
    if (w.reload > 0 && !rapid) return
    if (w.ammo <= 0 && !rapid) {
      sfx.tick()
      startReload()
      return
    }
    if (!rapid) w.ammo -= 1
    w.recoil = 1
    w.flash = { x: px, y: py, t: 0.06 }
    fx.shake(3, 0.08)
    sfx.shoot()
    sfx.hit()
    haptic.light()
    // Shell casing ejects from the gun.
    const { W, H } = view()
    fx.burst(W * 0.78, H - 70, { count: 1, color: '#fbbf24', speed: 220, angle: -Math.PI * 0.35, spread: 0.4, gravity: 900, size: 4, shape: 'square', life: 0.7, drag: 0.5 })

    // Acid globs can be shot out of the air.
    for (const g of w.globs) {
      if (g.t < g.dur && dist(g.x, g.y, px, py) < 30) {
        g.t = g.dur + 1
        fx.burst(g.x, g.y, { count: 14, color: ['#bef264', '#65a30d', '#ecfccb'], speed: 180, size: 3, gravity: 300 })
        fx.ring(g.x, g.y, { color: '#bef264', maxR: 28, life: 0.25 })
        fx.text(g.x, g.y - 20, 'POP +5', '#d9f99d', 14)
        w.score += 5
        w.stats.score = w.score
        sfx.pop()
        haptic.light()
        if (w.ammo === 0 && !rapid) startReload()
        pushHud()
        return
      }
    }

    // Nearest (largest) zombies first.
    const order = w.zombies.filter((z) => !z.dead).sort((a, b) => a.z - b.z)
    let hit = false
    for (const zb of order) {
      const b = zombieBox(zb)
      if (zb.kind === 'mother') {
        const bobY = Math.sin(zb.bob) * 3 * b.s
        const si = zb.sacs.findIndex((hp, i) => {
          if (hp <= 0) return false
          const sp = sacPos(b, i)
          return dist(px, py, sp.x, sp.y + bobY) < sp.r * 1.35
        })
        if (si >= 0) {
          hit = true
          const sp = sacPos(b, si)
          zb.sacs[si] -= 1
          zb.hp -= 8
          zb.flinch = 0.15
          fx.burst(sp.x, sp.y, { count: 12, color: ['#d9f99d', '#84cc16', '#fef9c3'], speed: 200, size: 3.5, gravity: 400 })
          fx.stop(0.05)
          if (zb.sacs[si] <= 0) {
            fx.ring(sp.x, sp.y, { color: '#bef264', maxR: 50, life: 0.35, width: 4 })
            fx.text(sp.x, sp.y - 24, 'SAC POPPED +40', '#d9f99d', 16)
            w.score += 40
            w.stats.score = w.score
            sfx.boom(0.35)
            haptic.medium()
            if (zb.sacs.every((v) => v <= 0)) {
              // All sacs gone: she reels and stops breeding.
              zb.flinch = 1.2
              setBanner({ key: Date.now(), text: 'BROOD STOPPED', sub: 'finish her off' })
            }
          } else sfx.pop()
          if (zb.hp <= 0) killZombie(zb, false)
          break
        }
      }
      const head = dist(px, py, b.headX, b.headY) < b.headR * 1.25
      const bodyHit = px > b.x - b.wdt / 2 && px < b.x + b.wdt / 2 && py > b.y - b.h && py < b.y
      if (!head && !bodyHit) continue
      hit = true
      const dmg = head ? (zb.kind === 'tank' || zb.kind === 'mother' ? 4 : 99) : rapid ? 2 : 1
      zb.hp -= dmg
      zb.flinch = 0.12
      zb.z = Math.min(1, zb.z + (zb.kind === 'brute' || zb.kind === 'tank' || zb.kind === 'mother' ? 0.004 : 0.018))
      fx.burst(px, py, { count: head ? 14 : 7, color: ['#84cc16', '#365314'], speed: head ? 200 : 120, size: 3, gravity: 400 })
      if (head) {
        w.hsStreak += 1
        w.stats.headshots += 1
        w.stats.hsStreak = Math.max(w.stats.hsStreak, w.hsStreak)
        fx.stop(0.06)
        fx.ring(px, py, { color: '#fde047', maxR: 30, life: 0.25 })
        if (w.hsStreak >= 3) fx.text(px, py - 30, `${w.hsStreak}× streak`, '#fde047', 14)
      } else {
        w.hsStreak = 0
      }
      if (zb.hp <= 0) killZombie(zb, head)
      else sfx.pop()
      break
    }
    if (!hit) {
      w.hsStreak = 0
      w.holes.push({ x: px, y: py, life: 2 })
      fx.burst(px, py, { count: 4, color: ['#a8a29e', '#57534e'], speed: 80, size: 2, gravity: 300 })
    }
    if (w.ammo === 0 && !rapid) startReload()
    pushHud()
  }

  /** Ad revive: barricade back to 50%, a blast clears the closest zombies, full mag. */
  function revive() {
    const w = world.current
    const { W, front } = view()
    w.barricade = Math.max(w.barricade, w.wallMax * 0.5)
    w.ammo = w.mag
    w.reload = 0
    w.slow = 2
    w.globs = []
    for (const zb of w.zombies) {
      if (zb.dead) continue
      if (zb.z < 0.4 && zb.kind !== 'tank' && zb.kind !== 'mother') {
        zb.hp = 0
        zb.dead = 0.001
        const b = zombieBox(zb)
        fx.burst(b.x, b.y - b.h * 0.5, { count: 14, color: ['#65a30d', '#3f6212', '#fde047'], speed: 240, gravity: 500 })
      } else {
        zb.z = Math.min(1, zb.z + 0.35)
        zb.attack = 1.5
      }
    }
    fx.explode(W / 2, front - 20, 2.4)
    fx.flash('#fff7ed', 0.3)
    sfx.boom(1)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'barricade patched' })
    pushHud()
    setPhaseBoth('play')
  }

  /** Spitter lobs an acid glob at the wall section in front of it. */
  function spit(zb: Zombie) {
    const w = world.current
    if (w.globs.length >= 6) return
    const b = zombieBox(zb)
    const to = project(zb.lane, 0)
    const { W, front } = view()
    const x0 = b.headX
    const y0 = b.headY + b.headR
    w.globs.push({ x0, y0, x1: Math.max(30, Math.min(W - 30, to.x)), y1: front - 8, t: 0, dur: 1.3, x: x0, y: y0 })
    fx.burst(x0, y0, { count: 8, color: ['#bef264', '#65a30d'], speed: 120, size: 2.5, gravity: 300 })
    zb.flinch = 0.08
    sfx.miss()
  }

  function acidHit(g: Glob) {
    const w = world.current
    w.barricade -= ZSTAT.spitter.dmg
    fx.burst(g.x1, g.y1, { count: 16, color: ['#a3e635', '#65a30d', '#d9f99d'], speed: 200, size: 3.5, gravity: 500 })
    fx.ring(g.x1, g.y1, { color: '#a3e635', maxR: 34, life: 0.3 })
    fx.text(g.x1, g.y1 - 30, `-${ZSTAT.spitter.dmg}`, '#fca5a5', 16)
    fx.flash('#365314', 0.15)
    fx.shake(5, 0.2)
    sfx.hurt()
    haptic.medium()
    pushHud()
    checkBreach()
  }

  function brood(zb: Zombie) {
    const w = world.current
    const alive = w.zombies.filter((z) => !z.dead).length
    const b = zombieBox(zb)
    fx.burst(b.x, b.y - b.h * 0.3, { count: 18, color: ['#d9f99d', '#84cc16', '#7c3aed'], speed: 220, size: 4, gravity: 500 })
    fx.ring(b.x, b.y - b.h * 0.3, { color: '#d9f99d', maxR: 60, life: 0.35 })
    sfx.hurt()
    fx.shake(4, 0.2)
    for (let i = 0; i < 2 && alive + i < 16; i++) {
      spawnZombie('crawler')
      const c = w.zombies[w.zombies.length - 1]
      c.lane = Math.max(-0.9, Math.min(0.9, zb.lane + (i ? 0.28 : -0.28)))
      c.z = Math.max(0, zb.z - 0.02)
      c.speed *= 0.85
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play' && phaseRef.current !== 'between') return
    const p = localPoint(e, e.currentTarget)
    shoot(p.x, p.y)
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    let dt = fx.step(raw)
    const ph = phaseRef.current
    const { horizon, front } = view()
    if (w.slow > 0) {
      w.slow = Math.max(0, w.slow - raw)
      dt *= 0.4
    }

    if (w.reload > 0) {
      w.reload -= raw
      if (w.reload <= 0) {
        w.reload = 0
        w.ammo = w.mag
        sfx.thud()
        pushHud()
      }
    }
    w.recoil = Math.max(0, w.recoil - raw * 9)
    if (w.flash) {
      w.flash.t -= raw
      if (w.flash.t <= 0) w.flash = null
    }

    if (ph === 'play') {
      if (w.toSpawn > 0) {
        w.spawnTimer -= dt
        if (w.spawnTimer <= 0) {
          spawnZombie()
          w.toSpawn -= 1
          w.spawnTimer = Math.max(0.45, 1.8 - w.wave * 0.1) * rand(0.7, 1.3)
        }
      } else if (w.zombies.every((z) => z.dead)) {
        w.barricade = Math.min(w.wallMax, w.barricade + 10)
        w.between = 2.2
        setPhaseBoth('between')
        const nb = biomeIndexFor(w.wave + 1)
        if (nb !== w.biome) {
          // New scenery rolls in during the breather.
          w.between = 3
          setBiome(nb, true)
        } else setBanner({ key: Date.now(), text: 'WAVE CLEARED', sub: '+10 barricade' })
        sfx.win()
        haptic.success()
        pushHud()
      }
    } else if (ph === 'between') {
      w.between -= raw
      if (w.between <= 0) {
        setPhaseBoth('play')
        nextWave()
      }
    } else if (ph === 'idle') {
      // Attract mode tours the biomes.
      const ib = Math.floor(t / 9) % BIOMES.length
      if (ib !== w.biome) setBiome(ib, false)
      if (w.zombies.length < 5 && Math.random() < 0.01) {
        w.wave = 1
        spawnZombie()
      }
    }
    w.biomeFade = Math.min(1, w.biomeFade + raw / 1.2)
    if (w.rapid > 0) {
      const before = Math.ceil(w.rapid)
      w.rapid = Math.max(0, w.rapid - raw)
      if (Math.ceil(w.rapid) !== before) pushHud()
    }
    const live = ph === 'play' || ph === 'between'

    for (const zb of w.zombies) {
      if (zb.dead) {
        zb.dead += raw
        continue
      }
      zb.bob += dt * (zb.kind === 'runner' ? 12 : 6)
      zb.flinch = Math.max(0, zb.flinch - raw)
      if (zb.kind === 'mother' && live && zb.sacs.some((v) => v > 0)) {
        zb.charge -= dt
        if (zb.charge <= 0) {
          zb.charge = BROOD_EVERY
          brood(zb)
        }
      }
      if (zb.kind === 'bomber' && live && zb.z < 0.3) {
        zb.beep -= dt
        if (zb.beep <= 0) {
          zb.beep = 0.12 + zb.z * 1.3
          sfx.tick()
        }
      }
      if (zb.kind === 'spitter' && zb.z <= zb.hold) {
        // Holds position and spits; telegraphed by the swelling sac.
        if (live) {
          zb.charge -= dt
          if (zb.charge <= 0) {
            spit(zb)
            zb.charge = rand(3.2, 4.4)
          }
        }
      } else if (zb.kind === 'bomber' && zb.z <= 0 && live) {
        zb.hp = 0
        zb.dead = 0.001
        bomberBlast(zb, true)
      } else if (zb.z > 0) {
        const mv = zb.flinch > 0 ? 0 : zb.speed * dt
        zb.z = Math.max(0, zb.z - mv)
      } else if (live) {
        zb.attack -= dt
        if (zb.attack <= 0) {
          zb.attack = 1.1
          w.barricade -= ZSTAT[zb.kind].dmg
          fx.shake(zb.kind === 'brute' ? 10 : 5, 0.2)
          fx.flash('#7f1d1d', 0.12)
          fx.burst(zombieBox(zb).x, front - 10, { count: 8, color: ['#a16207', '#78350f'], speed: 140, shape: 'square', size: 4, gravity: 600 })
          sfx.thud()
          haptic.heavy()
          pushHud()
          checkBreach()
        }
      } else if (ph === 'idle') {
        zb.dead = 0.001
      }
    }
    w.zombies = w.zombies.filter((z) => z.dead < 0.7)
    for (const p of w.pickups) {
      p.life -= raw
      p.y -= 8 * raw
    }
    w.pickups = w.pickups.filter((p) => p.life > 0)
    for (const h of w.holes) h.life -= raw
    w.holes = w.holes.filter((h) => h.life > 0)
    if (w.globs.length) {
      const keep: Glob[] = []
      for (const g of w.globs) {
        if (g.t > g.dur + 0.5) continue
        g.t += dt
        const k = Math.min(1, g.t / g.dur)
        g.x = g.x0 + (g.x1 - g.x0) * k
        g.y = g.y0 + (g.y1 - g.y0) * k - Math.sin(k * Math.PI) * 80
        if (k >= 1) {
          if (live) acidHit(g)
          continue
        }
        keep.push(g)
      }
      w.globs = keep
    }
    ambient.update(raw, W, H)

    // ── Draw ─────────────────────────────────────
    drawBiome(ctx, w.biome, W, H, horizon, front, t)
    if (w.biomeFade < 1) {
      // Fade the new scenery in from the dark.
      ctx.globalAlpha = (1 - w.biomeFade) * 0.9
      ctx.fillStyle = '#07060b'
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }

    fx.applyShake(ctx)
    // Recoil kicks the whole view up a touch.
    ctx.translate(0, -w.recoil * 4)

    const order = [...w.zombies].sort((a, b) => b.z - a.z)
    for (const zb of order) {
      const b = zombieBox(zb)
      const alpha = zb.dead ? Math.max(0, 1 - zb.dead / 0.7) : 1
      ctx.globalAlpha = alpha
      ctx.save()
      ctx.translate(b.x, b.y)
      if (zb.dead) ctx.rotate(Math.min(1.4, zb.dead * 4) * (zb.lane > 0 ? 1 : -1))
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(0, 0, b.wdt * 0.6, b.wdt * 0.15, 0, 0, Math.PI * 2)
      ctx.fill()
      const fl = zb.flinch > 0
      const skin = fl ? '#ffffff' : `hsl(${zb.tint} 35% 42%)`
      const cloth = fl ? '#ffffff' : zb.kind === 'tank' ? '#3f1d0d' : zb.kind === 'brute' ? '#4c1d95' : zb.kind === 'runner' ? '#7f1d1d' : zb.kind === 'spitter' ? '#1f3d24' : zb.kind === 'bomber' ? '#57351c' : '#334155'
      if (zb.kind === 'tank' && !zb.dead) glow(ctx, 0, -b.h * 0.5, b.h * 0.7, '#84cc16', 0.25)
      const bob = Math.sin(zb.bob) * 3 * b.s
      if (zb.kind === 'bomber' && !zb.dead && zb.z < 0.3) {
        // Danger ring: it's about to blow on the wall.
        const k = 1 - zb.z / 0.3
        ctx.strokeStyle = `rgba(239,68,68,${0.4 + 0.5 * Math.abs(Math.sin(t * (6 + k * 10)))})`
        ctx.lineWidth = 2 + k * 2
        ctx.beginPath()
        ctx.ellipse(0, 0, b.wdt * (0.8 + k * 0.4), b.wdt * 0.22, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (zb.kind === 'mother') {
        drawMother(ctx, b, bob, zb.sacs, zb.charge, fl, t)
      } else if (zb.kind === 'crawler') {
        ctx.fillStyle = cloth
        ctx.beginPath()
        ctx.roundRect(-b.wdt / 2, -b.h * 0.5 + bob, b.wdt * 0.8, b.h * 0.42, 6 * b.s)
        ctx.fill()
        ctx.fillStyle = skin
        ctx.beginPath()
        ctx.arc(b.headX - b.x, b.headY - b.y + bob, b.headR, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // Legs
        ctx.strokeStyle = '#1f2937'
        ctx.lineWidth = 7 * b.s
        ctx.lineCap = 'round'
        const step = Math.sin(zb.bob) * 8 * b.s
        ctx.beginPath()
        ctx.moveTo(-b.wdt * 0.2, -b.h * 0.42)
        ctx.lineTo(-b.wdt * 0.2 + step, 0)
        ctx.moveTo(b.wdt * 0.2, -b.h * 0.42)
        ctx.lineTo(b.wdt * 0.2 - step, 0)
        ctx.stroke()
        // Torso
        ctx.fillStyle = cloth
        ctx.beginPath()
        ctx.roundRect(-b.wdt / 2, -b.h * 0.8 + bob, b.wdt, b.h * 0.42, 6 * b.s)
        ctx.fill()
        // Torn shirt edge + rim light
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.fillRect(-b.wdt / 2, -b.h * 0.8 + bob, b.wdt * 0.12, b.h * 0.42)
        if (zb.kind === 'tank') {
          // Shoulder plates with spikes
          ctx.fillStyle = '#57534e'
          for (const sx of [-1, 1]) {
            ctx.beginPath()
            ctx.ellipse(sx * b.wdt * 0.42, -b.h * 0.78 + bob, b.wdt * 0.2, b.h * 0.07, 0, 0, Math.PI * 2)
            ctx.fill()
            ctx.beginPath()
            ctx.moveTo(sx * b.wdt * 0.36, -b.h * 0.83 + bob)
            ctx.lineTo(sx * b.wdt * 0.46, -b.h * 0.95 + bob)
            ctx.lineTo(sx * b.wdt * 0.52, -b.h * 0.82 + bob)
            ctx.fill()
          }
        }
        // Arms reaching forward
        ctx.strokeStyle = skin
        ctx.lineWidth = 6 * b.s
        ctx.beginPath()
        ctx.moveTo(-b.wdt * 0.45, -b.h * 0.72 + bob)
        ctx.lineTo(-b.wdt * 0.3, -b.h * 0.6 + bob + Math.sin(zb.bob + 1) * 4 * b.s)
        ctx.moveTo(b.wdt * 0.45, -b.h * 0.72 + bob)
        ctx.lineTo(b.wdt * 0.3, -b.h * 0.6 + bob + Math.sin(zb.bob) * 4 * b.s)
        ctx.stroke()
        // Head
        ctx.fillStyle = skin
        ctx.beginPath()
        ctx.arc(0, b.headY - b.y + bob, b.headR, 0, Math.PI * 2)
        ctx.fill()
        if (zb.kind === 'spitter') drawSpitter(ctx, b, bob, zb.z <= zb.hold && !zb.dead ? zb.charge : 99, t)
        else if (zb.kind === 'bomber') drawBomber(ctx, b, bob, zb.z < 0.3 ? 1 - zb.z / 0.3 : 0, t)
      }
      // Glowing eyes
      const ey = b.headY - b.y + bob - b.headR * 0.1
      const ex = b.headX - b.x
      ctx.fillStyle = zb.kind === 'tank' || zb.kind === 'mother' ? '#ef4444' : '#fde047'
      ctx.fillRect(ex - b.headR * 0.5, ey, b.headR * 0.3, b.headR * 0.22)
      ctx.fillRect(ex + b.headR * 0.2, ey, b.headR * 0.3, b.headR * 0.22)
      // Gaping mouth
      ctx.fillStyle = '#1c1917'
      ctx.beginPath()
      ctx.ellipse(ex, ey + b.headR * 0.5, b.headR * 0.28, b.headR * (0.12 + Math.abs(Math.sin(zb.bob * 0.5)) * 0.12), 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      if (!zb.dead && zb.kind === 'spitter' && zb.z <= zb.hold && zb.charge < SPIT_TELL) {
        // Telegraph where the acid will land.
        const to = project(zb.lane, 0)
        const k = 1 - zb.charge / SPIT_TELL
        ctx.strokeStyle = `rgba(239,68,68,${0.35 + k * 0.5})`
        ctx.lineWidth = 2
        ctx.setLineDash([6, 5])
        ctx.beginPath()
        ctx.ellipse(Math.max(30, Math.min(W - 30, to.x)), front - 8, 26 - k * 8, 8 - k * 2, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }
      if (!zb.dead && (zb.max > 3 || zb.kind === 'tank') && zb.hp < zb.max) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(b.x - b.wdt / 2, b.y - b.h - 10, b.wdt, 4)
        ctx.fillStyle = '#a3e635'
        ctx.fillRect(b.x - b.wdt / 2, b.y - b.h - 10, b.wdt * (zb.hp / zb.max), 4)
      }
    }
    ctx.globalAlpha = 1

    // Barricade
    const hpk = Math.max(0, w.barricade / w.wallMax)
    for (let i = 0; i < 6; i++) {
      const bx = (i / 6) * W
      const tilt = (1 - hpk) * (i % 2 ? 0.12 : -0.1)
      ctx.save()
      ctx.translate(bx + W / 12, front + 18)
      ctx.rotate(tilt)
      ctx.fillStyle = hpk > 0.3 ? '#92400e' : '#78350f'
      ctx.fillRect(-W / 12 + 2, -22, W / 6 - 4, 34)
      ctx.strokeStyle = '#451a03'
      ctx.lineWidth = 2
      ctx.strokeRect(-W / 12 + 2, -22, W / 6 - 4, 34)
      ctx.beginPath()
      ctx.moveTo(-W / 12 + 4, -20)
      ctx.lineTo(W / 12 - 4, 10)
      ctx.stroke()
      ctx.restore()
    }

    ambient.draw(ctx)

    for (const g of w.globs) {
      if (g.t > g.dur) continue
      ctx.strokeStyle = 'rgba(239,68,68,0.6)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(g.x1, g.y1, 18, 6, 0, 0, Math.PI * 2)
      ctx.stroke()
      // Short dripping trail
      ctx.fillStyle = 'rgba(163,230,53,0.5)'
      for (let i = 1; i <= 3; i++) {
        const k = Math.max(0, g.t / g.dur - i * 0.04)
        const tx = g.x0 + (g.x1 - g.x0) * k
        const ty = g.y0 + (g.y1 - g.y0) * k - Math.sin(k * Math.PI) * 80
        ctx.beginPath()
        ctx.arc(tx, ty, 6 - i * 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
      drawGlob(ctx, g.x, g.y, 10, t)
    }

    for (const h of w.holes) {
      ctx.globalAlpha = Math.min(1, h.life)
      ctx.fillStyle = '#0c0a09'
      ctx.beginPath()
      ctx.arc(h.x, h.y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    for (const p of w.pickups) {
      if (p.life < 1.5 && Math.floor(p.life * 8) % 2 === 0) continue
      glow(ctx, p.x, p.y, 30, '#fde047', 0.55)
      ctx.save()
      ctx.translate(p.x, p.y + Math.sin(t * 5) * 3)
      ctx.strokeStyle = 'rgba(253,224,71,0.8)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, 20 + Math.sin(t * 6) * 2, 0, Math.PI * 2)
      ctx.stroke()
      drawPickup(ctx, p.kind, t)
      ctx.restore()
    }

    fx.draw(ctx)

    if (w.flash) {
      glow(ctx, w.flash.x, w.flash.y, 26, '#fde047', 0.9)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(w.flash.x - 12, w.flash.y)
      ctx.lineTo(w.flash.x + 12, w.flash.y)
      ctx.moveTo(w.flash.x, w.flash.y - 12)
      ctx.lineTo(w.flash.x, w.flash.y + 12)
      ctx.stroke()
    }
    ctx.restore()

    // Gun (screen space, kicks back on recoil)
    if (ph !== 'idle') {
      const gx = W * 0.72
      const gy = H - 30 + w.recoil * 14 + (w.reload > 0 ? 40 * Math.sin((w.reload / RELOAD) * Math.PI) : 0)
      ctx.save()
      ctx.translate(gx, gy)
      ctx.rotate(-0.25 - w.recoil * 0.12)
      ctx.fillStyle = '#1f2937'
      ctx.fillRect(-16, -48, 22, 64)
      ctx.fillStyle = '#374151'
      ctx.fillRect(-12, -78, 14, 34)
      ctx.fillStyle = '#111827'
      ctx.fillRect(-10, -86, 10, 10)
      ctx.restore()
      if (w.recoil > 0.6) glow(ctx, gx - 18, gy - 92, 26, '#fde047', w.recoil * 0.8)
      if (w.rapid > 0) glow(ctx, gx - 10, gy - 60, 60, '#f59e0b', 0.25 + Math.sin(t * 10) * 0.1)
    }
    if (w.slow > 0) {
      ctx.fillStyle = 'rgba(56,189,248,0.1)'
      ctx.fillRect(0, 0, W, H)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  // Dev-only shortcuts for screenshots: __en3skip(wave), __en3spawn(kind), __en3wall(), __en3drop(kind).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__en3skip = (wave: number) => {
      if (phaseRef.current === 'idle' || phaseRef.current === 'over') return
      const w = world.current
      w.zombies = []
      w.globs = []
      w.toSpawn = 0
      w.wave = Math.max(0, wave - 1)
      setPhaseBoth('play')
      nextWave()
    }
    win.__en3spawn = (kind: ZKind, z?: number) => {
      spawnZombie(kind)
      if (z != null) world.current.zombies[world.current.zombies.length - 1].z = z
    }
    win.__en3clear = () => {
      world.current.toSpawn = 0
      world.current.zombies = []
    }
    win.__en3wall = () => {
      world.current.barricade = world.current.wallMax
      pushHud()
    }
    win.__en3drop = (kind: PickKind) => {
      const { W, H } = view()
      world.current.pickups.push({ kind, x: W * 0.5, y: H * 0.5, life: 8 })
    }
    return () => {
      delete win.__en3skip
      delete win.__en3spawn
      delete win.__en3wall
      delete win.__en3clear
      delete win.__en3drop
    }
  })

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena zombie-arena" onPointerDown={onPointerDown}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <>
              <div className="action-hud">
                <div>
                  <div className="action-hud__score">{hud.score}</div>
                  <div className="action-hud__small">Wave {hud.wave}</div>
                </div>
                <div className="action-hud__right">
                  <div className="zombie-barricade" aria-label="Barricade">
                    <span style={{ width: `${hud.barricade}%` }} />
                  </div>
                  <span className="action-hud__small">🧱 {hud.barricade}</span>
                </div>
              </div>
              <button
                type="button"
                className={`zombie-ammo${hud.rapid > 0 ? ' is-rapid' : hud.reloading ? ' is-reloading' : ''}`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  startReload()
                }}
              >
                {hud.rapid > 0 ? `RAPID ∞ ${hud.rapid}s` : hud.reloading ? 'Reloading…' : Array.from({ length: hud.mag }, (_, i) => (i < hud.ammo ? '▮' : '▯')).join('')}
              </button>
            </>
          )}
          {banner && (phase === 'play' || phase === 'between') ? (
            <div className={`action-banner${banner.text.length > 12 || (banner.sub?.length ?? 0) > 26 ? ' zombie-banner--long' : ''}`} key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="zombie"
              icon={meta.icon}
              title={meta.title}
              hint="Tap to shoot. Headshots kill instantly. Hold the barricade — and tap dropped items to use them."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.wave >= 4 ? 'Survivor!' : 'Overrun'}
            subtitle={`Score ${hud.score} · Wave ${hud.wave}`}
            celebrate={hud.wave >= 4}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
