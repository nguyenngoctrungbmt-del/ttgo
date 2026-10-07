import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, glow, rand } from '../../shared/action/fx'
import { Stick, localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { drawDecor, drawMech, drawMotes, drawWingDrone, enemySprite, enemySpriteSize, gemSprite, groundTile, moteVelocity, type Mote } from './art'
import { BIOMES, BOSS_NAMES, ENEMIES, MAX_LEVEL, PASSIVES, WEAPONS, biomeAt, xpNeed, type EnemyKind, type PassiveId, type WeaponId } from './defs'
import { PartIcon } from './icons'
import '../../shared/action/action.css'
import './mech.css'

const meta = getGame('mech')

type Phase = 'idle' | 'play' | 'upgrade' | 'crossroad' | 'dying' | 'over'

type Enemy = {
  id: number
  kind: EnemyKind
  x: number
  y: number
  vx: number
  vy: number
  kx: number
  ky: number
  r: number
  hp: number
  max: number
  speed: number
  dmg: number
  xp: number
  flash: number
  elite: boolean
  boss: boolean
  anim: number
  sawCd: number
  fuse: number
  shoot: number
  life: number
  state: 'walk' | 'tele-dash' | 'dash' | 'tele-burst' | 'spiral' | 'tele-laser' | 'laser' | 'barrage'
  stateT: number
  /** Linker partner id (-1 = none) and which side of the pair this one holds. */
  link: number
  side: number
  zap: number
  laserA: number
  dirX: number
  dirY: number
  spiralA: number
  burn: number
}

type Bolt = { x: number; y: number; vx: number; vy: number; dmg: number; pierce: number; life: number; beam: boolean; drone: boolean; hit: number[] }
/** Lobbed mortar shell or falling meteor: lands at (x, y) when t reaches 0. */
type Shell = { x: number; y: number; sx: number; sy: number; t: number; max: number; r: number; dmg: number; meteor: boolean }
type Rail = { x: number; y: number; a: number; len: number; w: number; life: number; max: number; evo: boolean }
type Missile = { x: number; y: number; vx: number; vy: number; target: number; dmg: number; radius: number; life: number; micro: boolean }
type EShot = { x: number; y: number; vx: number; vy: number; life: number; r: number; dmg: number }
type Gem = { x: number; y: number; v: number; pull: boolean; sp: number }
type PickKind = 'heal' | 'magnet' | 'bomb' | 'chest' | 'overdrive'
type Pickup = { x: number; y: number; kind: PickKind; ph: number }
type Arc = { pts: number[]; life: number }
type Flame = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number }
type WState = { lvl: number; cd: number; evolved: boolean; phase: number }

type Choice = { kind: 'weapon' | 'passive' | 'heal' | 'gold'; id: WeaponId | PassiveId | 'heal' | 'gold'; lvl: number; isNew: boolean }

type World = {
  t: number
  mech: { x: number; y: number; vx: number; vy: number; hp: number; max: number; inv: number; face: number; aim: number; walk: number; moving: boolean; flash: number }
  enemies: Enemy[]
  bolts: Bolt[]
  missiles: Missile[]
  eshots: EShot[]
  gems: Gem[]
  pickups: Pickup[]
  arcs: Arc[]
  flames: Flame[]
  shells: Shell[]
  rails: Rail[]
  motes: Mote[]
  moteBiome: number
  droneA: number
  overdrive: number
  storm: number
  stormAcc: number
  endless: boolean
  endT: number
  bossTier: number
  weapons: Partial<Record<WeaponId, WState>>
  passives: Partial<Record<PassiveId, number>>
  level: number
  xp: number
  pending: number
  spawnAcc: number
  horde: number
  events: { t: number; kind: string; done: boolean }[]
  boss: Enemy | null
  victory: boolean
  sawA: number
  flameTick: number
  shootSnd: number
  popSnd: number
  boomSnd: number
  hudT: number
  biome: number
  prevBiome: number
  biomeFade: number
  id: number
  lastTrack: number
  clock: number
  score: number
  stats: { score: number; time: number; kills: number; level: number; bosses: number; evolutions: number; wins: number }
}

function makeEvents() {
  const ev: { t: number; kind: string; done: boolean }[] = []
  const push = (t: number, kind: string) => ev.push({ t, kind, done: false })
  push(30, 'crawlers')
  push(90, 'brutes')
  push(150, 'spitters')
  push(210, 'swarm')
  push(240, 'bombers')
  push(270, 'horde')
  push(300, 'warden')
  push(330, 'mortars')
  push(390, 'swarm')
  push(435, 'linkers')
  push(450, 'horde')
  push(510, 'swarm')
  push(525, 'meteor')
  push(570, 'horde')
  push(600, 'overlord')
  for (let m = 1; m <= 9; m++) if (m !== 5) push(m * 60, 'elite')
  for (const b of [120, 240, 360, 480]) push(b + 0.5, 'biome')
  return ev.sort((a, b) => a.t - b.t)
}

/** Optional endless mode after the Overlord: new biomes, meteor storms and a boss every 3 minutes. */
function endlessEvents(start: number) {
  const ev: { t: number; kind: string; done: boolean }[] = []
  const push = (t: number, kind: string) => ev.push({ t: start + t, kind, done: false })
  push(6, 'biome:5')
  push(45, 'swarm')
  push(60, 'elite')
  push(80, 'meteor')
  push(110, 'horde')
  push(120, 'elite')
  push(150, 'biome:6')
  push(165, 'swarm')
  push(180, 'elite')
  push(200, 'boss:colossus')
  const cycle = [5, 4, 6, 2, 5, 1, 6, 3]
  const bosses = ['warden', 'overlord', 'colossus']
  for (let c = 1; c <= 14; c++) {
    const b = 200 + c * 180
    push(b + 25, `biome:${cycle[(c - 1) % cycle.length]}`)
    push(b + 50, 'elite')
    push(b + 70, 'meteor')
    push(b + 100, 'horde')
    push(b + 120, 'elite')
    push(b + 140, 'swarm')
    push(b + 175, `boss:${bosses[c % 3]}`)
  }
  return ev
}

/** Short "music sting" for bosses and big events. */
function sting(kind: 'boss' | 'event' | 'reward') {
  if (kind === 'boss') {
    sfx.boom(0.85)
    window.setTimeout(() => sfx.hurt(), 160)
    window.setTimeout(() => sfx.lose(), 320)
  } else if (kind === 'event') {
    sfx.whoosh()
    window.setTimeout(() => sfx.ready(), 140)
    window.setTimeout(() => sfx.ready(), 300)
  } else {
    sfx.win()
    window.setTimeout(() => sfx.levelUp(), 260)
  }
}

function freshWorld(): World {
  return {
    t: 0,
    mech: { x: 0, y: 0, vx: 0, vy: 0, hp: 100, max: 100, inv: 0, face: 0, aim: 0, walk: 0, moving: false, flash: 0 },
    enemies: [],
    bolts: [],
    missiles: [],
    eshots: [],
    gems: [],
    pickups: [],
    arcs: [],
    flames: [],
    shells: [],
    rails: [],
    motes: [],
    moteBiome: -1,
    droneA: 0,
    overdrive: 0,
    storm: 0,
    stormAcc: 0,
    endless: false,
    endT: 0,
    bossTier: 0,
    weapons: { blaster: { lvl: 1, cd: 0.5, evolved: false, phase: 0 } },
    passives: {},
    level: 1,
    xp: 0,
    pending: 0,
    spawnAcc: 0,
    horde: 0,
    events: makeEvents(),
    boss: null,
    victory: false,
    sawA: 0,
    flameTick: 0,
    shootSnd: 0,
    popSnd: 0,
    boomSnd: 0,
    hudT: 0,
    biome: 0,
    prevBiome: 0,
    biomeFade: 0,
    id: 1,
    lastTrack: -99,
    clock: 0,
    score: 0,
    stats: { score: 0, time: 0, kills: 0, level: 1, bosses: 0, evolutions: 0, wins: 0 },
  }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export default function MechGame() {
  const run = useActionRun('mech')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const stick = useRef(new Stick(56)).current
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const keys = useRef(new Set<string>())
  const patterns = useRef(new Map<number, CanvasPattern | null>())
  const size = useRef({ w: 360, h: 560, s: 1 })
  const devGod = useRef(false)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ t: 0, level: 1, xp: 0, need: 10, kills: 0, hp: 100, max: 100, od: 0, endless: false })
  const [loadout, setLoadout] = useState<{ id: WeaponId | PassiveId; lvl: number; evolved: boolean; color: string }[]>([])
  const [bossBar, setBossBar] = useState<{ name: string; k: number } | null>(null)
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [choices, setChoicesState] = useState<Choice[]>([])
  const choicesRef = useRef<Choice[]>([])
  function setChoices(c: Choice[]) {
    choicesRef.current = c
    setChoicesState(c)
  }

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }
  const P = (w: World, id: PassiveId) => w.passives[id] ?? 0

  function syncLoadout(w: World) {
    const out: { id: WeaponId | PassiveId; lvl: number; evolved: boolean; color: string }[] = []
    for (const id of Object.keys(w.weapons) as WeaponId[]) {
      const s = w.weapons[id]!
      out.push({ id, lvl: s.lvl, evolved: s.evolved, color: WEAPONS[id].color })
    }
    for (const id of Object.keys(w.passives) as PassiveId[]) out.push({ id, lvl: w.passives[id]!, evolved: false, color: PASSIVES[id].color })
    setLoadout(out)
  }

  function maxHp(w: World) {
    return 100 + run.level('armor') * 15 + P(w, 'armor') * 20
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.mech.max = maxHp(w)
    w.mech.hp = w.mech.max
    world.current = w
    fx.reset()
    setBossBar(null)
    syncLoadout(w)
    run.begin()
    setPhaseBoth('play')
    say('SURVIVE 10:00', 'weapons fire on their own')
    sfx.ready()
    haptic.light()
  }

  function endRun(w: World, victory: boolean) {
    w.stats.time = Math.floor(w.t)
    w.stats.level = w.level
    w.score = Math.round(w.stats.kills + Math.floor(w.t) * 2 + w.stats.bosses * 1500 + w.level * 50 + (victory ? 5000 : 0))
    w.stats.score = w.score
    const coins = Math.round(clamp(w.t / 12 + w.stats.kills / 40 + w.stats.bosses * 10 + (victory ? 30 : 0), 3, 500))
    return { score: w.score, cleared: victory || w.t >= 300, stats: { ...w.stats }, coins }
  }

  function die() {
    const w = world.current
    if (phaseRef.current !== 'play') return
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.stop(0.15)
    fx.shake(14, 0.5)
    fx.slowmo(1, 0.3)
    fx.explode(w.mech.x, w.mech.y, 1.6)
    sfx.boom(0.9)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      run.end(endRun(w, w.victory), revive)
    }, 1200)
  }

  function revive() {
    const w = world.current
    const m = w.mech
    m.hp = Math.round(m.max * 0.6)
    m.inv = 2.5
    // Shockwave clears the nearby swarm.
    for (const e of w.enemies) {
      const d = Math.hypot(e.x - m.x, e.y - m.y)
      if (d < 260) {
        if (e.boss) {
          e.kx += ((e.x - m.x) / (d || 1)) * 500
          e.ky += ((e.y - m.y) / (d || 1)) * 500
        } else hurt(w, e, 9999, 0, 0)
      }
    }
    w.eshots = []
    w.shells = []
    fx.ring(m.x, m.y, { color: '#7dd3fc', maxR: 260, life: 0.6, width: 8 })
    fx.flash('#7dd3fc', 0.2)
    say('REVIVED!', 'shockwave + shield')
    setPhaseBoth('play')
  }

  // ── Enemies ─────────────────────────────────────────────

  function spawnEnemy(w: World, kind: EnemyKind, x: number, y: number, elite = false): Enemy {
    const d = ENEMIES[kind]
    const t = w.t
    const hpMul = 1 + t / 100 + (t > 300 ? (t - 300) / 140 : 0)
    const boss = !!BOSS_NAMES[kind]
    const e: Enemy = {
      id: w.id++,
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      kx: 0,
      ky: 0,
      r: d.r * (elite ? 1.8 : 1),
      hp: boss ? d.hp * (1 + w.bossTier * 0.6) : d.hp * hpMul * (elite ? 14 : 1),
      max: 0,
      speed: d.speed * (elite ? 0.85 : 1) * (1 + Math.min(0.25, t / 1200)),
      dmg: boss ? d.dmg : d.dmg * Math.min(1, 0.3 + t / 170) * (1 + t / 700) * (elite ? 1.4 : 1),
      xp: d.xp * (elite ? 10 : 1),
      flash: 0,
      elite,
      boss,
      anim: rand(0, 2),
      sawCd: 0,
      fuse: 0,
      shoot: rand(1.5, 2.8),
      life: 14,
      state: 'walk',
      stateT: 2.5,
      dirX: 0,
      dirY: 0,
      spiralA: 0,
      burn: 0,
      link: -1,
      side: 0,
      zap: 4,
      laserA: 0,
    }
    e.max = e.hp
    w.enemies.push(e)
    return e
  }

  /** Two tesla pylons linked by a sweeping beam that arms on a cycle. */
  function spawnLinkerPair(w: World, a: number, ring: number, cx = w.mech.x, cy = w.mech.y) {
    const p1 = spawnEnemy(w, 'linker', cx + Math.cos(a - 0.2) * ring, cy + Math.sin(a - 0.2) * ring)
    const p2 = spawnEnemy(w, 'linker', cx + Math.cos(a + 0.2) * ring, cy + Math.sin(a + 0.2) * ring)
    p1.link = p2.id
    p2.link = p1.id
    p1.side = 1
    p2.side = -1
    p1.spiralA = p2.spiralA = a + Math.PI / 2 - w.t * 0.45
    p1.zap = p2.zap = 4
  }

  function lob(w: World, sx: number, sy: number, x: number, y: number, flight: number, r: number, dmg: number, meteor: boolean) {
    if (w.shells.length >= 40) return
    w.shells.push({ x, y, sx, sy, t: flight, max: flight, r, dmg, meteor })
  }

  function spawnRing() {
    const { w: W, h: H, s } = size.current
    return (Math.hypot(W, H) / 2) / s + 40
  }

  function pickKind(t: number): EnemyKind {
    const opts: [EnemyKind, number][] = [
      ['drone', 10],
      ['crawler', t > 30 ? 8 : 0],
      ['brute', t > 90 ? 2.5 + t / 150 : 0],
      ['spitter', t > 150 ? 2.5 : 0],
      ['bomber', t > 240 ? 2.5 : 0],
      ['bat', t > 210 ? 2 : 0],
      ['mortar', t > 330 ? 1.6 : 0],
      ['linker', t > 435 ? 0.9 : 0],
    ]
    const total = opts.reduce((s, o) => s + o[1], 0)
    let r = Math.random() * total
    for (const [k, wgt] of opts) {
      r -= wgt
      if (r <= 0) return k
    }
    return 'drone'
  }

  function runEvent(w: World, kind: string) {
    const m = w.mech
    const ring = spawnRing()
    if (kind === 'elite') {
      const a = rand(0, Math.PI * 2)
      const k = pickKind(w.t)
      spawnEnemy(w, k === 'bat' || k === 'linker' ? 'brute' : k, m.x + Math.cos(a) * ring, m.y + Math.sin(a) * ring, true)
      say('ELITE INBOUND', 'it carries a chest')
      sfx.ready()
    } else if (kind === 'crawlers') {
      say('CRAWLERS!', 'fast bugs incoming')
    } else if (kind === 'brutes') {
      say('BRUTES!', 'heavy armor')
    } else if (kind === 'spitters') {
      say('SPITTERS!', 'dodge their acid')
    } else if (kind === 'bombers') {
      say('BOMBERS!', 'they explode — keep moving')
    } else if (kind === 'mortars') {
      for (let i = 0; i < 3; i++) {
        const a = rand(0, Math.PI * 2)
        spawnEnemy(w, 'mortar', m.x + Math.cos(a) * ring, m.y + Math.sin(a) * ring)
      }
      say('SHELLBACKS!', 'mortar crabs — leave the red circles')
      sfx.thud()
    } else if (kind === 'linkers') {
      spawnLinkerPair(w, rand(0, Math.PI * 2), ring)
      say('TESLA LINKERS!', 'pairs fire a beam when it flickers')
      sfx.slash()
    } else if (kind === 'meteor') {
      w.storm = 18
      w.stormAcc = 0
      say('METEOR SHOWER!', 'survive 18 s for a supply drop')
      sting('event')
      fx.shake(6, 0.5)
    } else if (kind === 'swarm') {
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2
        const e = spawnEnemy(w, 'bat', m.x + Math.cos(a) * ring, m.y + Math.sin(a) * ring)
        e.vx = -Math.cos(a) * e.speed
        e.vy = -Math.sin(a) * e.speed
      }
      say('BAT SWARM!', 'they close in from all sides')
      sfx.whoosh()
    } else if (kind === 'horde') {
      w.horde = 20
      say('THE HORDE', 'spawns surge for 20 s')
      sfx.boom(0.4)
    } else if (kind === 'warden' || kind === 'overlord' || kind.startsWith('boss:')) {
      const bk = (kind.startsWith('boss:') ? kind.slice(5) : kind) as EnemyKind
      const a = rand(0, Math.PI * 2)
      const b = spawnEnemy(w, bk, m.x + Math.cos(a) * ring, m.y + Math.sin(a) * ring)
      if (w.endless) w.bossTier++
      w.boss = b
      const name = BOSS_NAMES[bk] ?? 'BOSS'
      const title = bk === 'colossus' ? 'TITAN: COLOSSUS' : bk === 'overlord' ? (w.endless ? 'BOSS: OVERLORD' : 'FINAL BOSS: OVERLORD') : `BOSS: ${name}`
      const sub = bk === 'colossus' ? 'its laser sweeps — move against the arrow' : bk === 'warden' ? 'it charges — sidestep!' : 'survive the storm'
      say(title, sub)
      sting('boss')
      fx.shake(10, 0.6)
      haptic.heavy()
    } else if (kind === 'biome' || kind.startsWith('biome:')) {
      w.prevBiome = w.biome
      w.biome = kind === 'biome' ? biomeAt(w.t) : Number(kind.slice(6))
      w.biomeFade = 1
      say(BIOMES[w.biome].name.toUpperCase(), w.endless ? `endless · ${fmt(w.t)}` : `minute ${Math.floor(w.t / 60)}`)
      sfx.levelUp()
    }
  }

  function hurt(w: World, e: Enemy, dmg: number, kx: number, ky: number) {
    if (e.hp <= 0) return
    e.hp -= dmg
    e.flash = 0.08
    if (!e.boss) {
      const k = e.elite ? 0.3 : 1
      e.kx += kx * k
      e.ky += ky * k
    }
    if (dmg >= 30 && dmg < 9000) fx.text(e.x, e.y - e.r - 4, String(Math.round(dmg)), '#fde68a', 12)
    if (e.hp <= 0) kill(w, e)
  }

  function kill(w: World, e: Enemy) {
    const d = ENEMIES[e.kind]
    w.stats.kills++
    if (e.boss) {
      for (let i = 0; i < 24; i++) w.gems.push({ x: e.x + rand(-60, 60), y: e.y + rand(-60, 60), v: i < 4 ? 25 : 5, pull: false, sp: 0 })
      w.pickups.push({ x: e.x, y: e.y, kind: 'chest', ph: 0 })
      w.stats.bosses++
      w.boss = null
      setBossBar(null)
      fx.explode(e.x, e.y, 3, [d.color, '#fde047', '#ffffff', '#fb923c'])
      fx.slowmo(1.2, 0.3)
      fx.flash('#ffffff', 0.35)
      sfx.boom(1)
      sfx.win()
      haptic.success()
      if (w.t - w.lastTrack > 30) {
        w.lastTrack = w.t
        void trackEvent('action_milestone', { game_id: 'mech', kind: 'boss', value: w.stats.bosses })
      }
      if (e.kind === 'overlord' && !w.victory) {
        victory(w)
        return
      }
      if (e.kind === 'colossus') {
        // Titan reward: full repair, an overdrive core and a score bounty.
        w.mech.hp = w.mech.max
        w.pickups.push({ x: e.x + 30, y: e.y, kind: 'overdrive', ph: 0 })
        w.score += 3000
        fx.text(e.x, e.y - e.r - 10, '+3000', '#5eead4', 22)
        window.setTimeout(() => sfx.levelUp(), 400)
        say('COLOSSUS DESTROYED!', 'full repair · overdrive core · chest')
      } else say(`${BOSS_NAMES[e.kind] ?? 'BOSS'} DESTROYED!`, 'open the chest')
    } else {
      w.gems.push({ x: e.x, y: e.y, v: e.xp, pull: false, sp: 0 })
      if (e.elite) {
        w.pickups.push({ x: e.x, y: e.y, kind: 'chest', ph: 0 })
        fx.explode(e.x, e.y, 1.4, [d.color, '#fde047', '#ffffff'])
        sfx.boom(0.6)
        haptic.medium()
      } else {
        const roll = Math.random()
        if (roll < 0.012) w.pickups.push({ x: e.x, y: e.y, kind: 'heal', ph: 0 })
        else if (roll < 0.016) w.pickups.push({ x: e.x, y: e.y, kind: 'magnet', ph: 0 })
        else if (roll < 0.019) w.pickups.push({ x: e.x, y: e.y, kind: 'bomb', ph: 0 })
        else if (roll < 0.0215 && w.t > 90) w.pickups.push({ x: e.x, y: e.y, kind: 'overdrive', ph: 0 })
        fx.burst(e.x, e.y, { count: 7, color: [d.color, d.dark, '#ffffff'], speed: 150, size: 3, gravity: 0, life: 0.4 })
      }
      if (w.popSnd <= 0) {
        w.popSnd = 0.05
        sfx.pop()
      }
    }
    if (w.stats.kills % 100 === 0) run.update(w.stats)
  }

  function victory(w: World) {
    w.victory = true
    w.stats.wins = 1
    run.update(w.stats)
    say('VICTORY!', 'you survived 10 minutes')
    setPhaseBoth('dying')
    window.setTimeout(() => {
      if (phaseRef.current !== 'dying' || world.current !== w) return
      stick.id = null
      setPhaseBoth('crossroad')
    }, 2000)
  }

  function claimVictory() {
    const w = world.current
    if (phaseRef.current !== 'crossroad') return
    setPhaseBoth('over')
    run.end(endRun(w, true))
  }

  function goEndless() {
    const w = world.current
    if (phaseRef.current !== 'crossroad') return
    w.endless = true
    w.endT = w.t
    w.events.push(...endlessEvents(w.t))
    w.events.sort((a, b) => a.t - b.t)
    w.mech.hp = Math.min(w.mech.max, w.mech.hp + w.mech.max * 0.3)
    w.mech.inv = 2
    setPhaseBoth('play')
    say('ENDLESS MODE', 'the Colossus stirs in the deep')
    sting('event')
    haptic.success()
    if (w.t - w.lastTrack > 30) {
      w.lastTrack = w.t
      void trackEvent('action_milestone', { game_id: 'mech', kind: 'endless', value: 1 })
    }
  }

  // ── Player growth ───────────────────────────────────────

  function rollChoices(w: World): Choice[] {
    const pool: { c: Choice; wgt: number }[] = []
    const owned = Object.keys(w.weapons) as WeaponId[]
    for (const id of Object.keys(WEAPONS) as WeaponId[]) {
      const s = w.weapons[id]
      if (!s) pool.push({ c: { kind: 'weapon', id, lvl: 1, isNew: true }, wgt: 2.2 })
      else if (s.lvl < MAX_LEVEL && !s.evolved) pool.push({ c: { kind: 'weapon', id, lvl: s.lvl + 1, isNew: false }, wgt: 3 })
    }
    for (const id of Object.keys(PASSIVES) as PassiveId[]) {
      const l = P(w, id)
      if (l >= MAX_LEVEL) continue
      const paired = owned.some((wid) => WEAPONS[wid].pair === id)
      pool.push({ c: { kind: 'passive', id, lvl: l + 1, isNew: l === 0 }, wgt: paired ? 2.4 : 1.3 })
    }
    const out: Choice[] = []
    while (out.length < 3 && pool.length) {
      const total = pool.reduce((s, p) => s + p.wgt, 0)
      let r = Math.random() * total
      let i = 0
      for (; i < pool.length - 1; i++) {
        r -= pool[i].wgt
        if (r <= 0) break
      }
      out.push(pool.splice(i, 1)[0].c)
    }
    if (out.length < 3) out.push({ kind: 'heal', id: 'heal', lvl: 0, isNew: false })
    if (out.length < 3) out.push({ kind: 'gold', id: 'gold', lvl: 0, isNew: false })
    return out
  }

  function applyChoice(w: World, c: Choice) {
    if (c.kind === 'weapon') {
      const id = c.id as WeaponId
      const s = w.weapons[id]
      if (s) s.lvl = c.lvl
      else w.weapons[id] = { lvl: 1, cd: 0.3, evolved: false, phase: 0 }
    } else if (c.kind === 'passive') {
      const id = c.id as PassiveId
      w.passives[id] = c.lvl
      if (id === 'armor') {
        const before = w.mech.max
        w.mech.max = maxHp(w)
        w.mech.hp += w.mech.max - before
      }
    } else if (c.kind === 'heal') w.mech.hp = Math.min(w.mech.max, w.mech.hp + 40)
    else w.score += 200
    syncLoadout(w)
  }

  function choose(c: Choice) {
    const w = world.current
    applyChoice(w, c)
    w.pending--
    sfx.power()
    haptic.medium()
    if (w.pending > 0) setChoices(rollChoices(w))
    else {
      setPhaseBoth('play')
      w.mech.inv = Math.max(w.mech.inv, 0.6)
    }
  }

  function openChest(w: World) {
    const m = w.mech
    m.hp = Math.min(m.max, m.hp + 20)
    for (const id of Object.keys(w.weapons) as WeaponId[]) {
      const s = w.weapons[id]!
      const def = WEAPONS[id]
      if (s.lvl >= MAX_LEVEL && !s.evolved && P(w, def.pair) > 0) {
        s.evolved = true
        w.stats.evolutions++
        say('EVOLVED!', def.evolved)
        fx.slowmo(0.8, 0.35)
        fx.flash('#fde047', 0.3)
        fx.ring(m.x, m.y, { color: '#fde047', maxR: 200, life: 0.7, width: 8 })
        sfx.win()
        haptic.success()
        syncLoadout(w)
        run.update(w.stats)
        if (w.t - w.lastTrack > 30) {
          w.lastTrack = w.t
          void trackEvent('action_milestone', { game_id: 'mech', kind: 'evolve', value: w.stats.evolutions })
        }
        return
      }
    }
    const c = rollChoices(w).find((x) => x.kind === 'weapon' || x.kind === 'passive')
    if (c) {
      applyChoice(w, c)
      const name = c.kind === 'weapon' ? WEAPONS[c.id as WeaponId].name : PASSIVES[c.id as PassiveId].name
      say('CHEST!', `${name} ${c.isNew ? 'unlocked' : `Lv ${c.lvl}`}`)
    } else {
      w.score += 500
      say('CHEST!', '+500 score')
    }
    fx.ring(m.x, m.y, { color: '#fde047', maxR: 120, life: 0.5, width: 6 })
    sfx.levelUp()
    haptic.success()
  }

  function gainXp(w: World, v: number) {
    w.xp += v
    while (w.xp >= xpNeed(w.level)) {
      w.xp -= xpNeed(w.level)
      w.level++
      w.pending++
      w.stats.level = w.level
    }
  }

  // ── Weapons ─────────────────────────────────────────────

  function nearest(w: World, x: number, y: number, range: number, skip?: number[]) {
    let best: Enemy | null = null
    let bd = range * range
    for (const e of w.enemies) {
      if (e.hp <= 0 || (skip && skip.includes(e.id))) continue
      const d = (e.x - x) ** 2 + (e.y - y) ** 2
      if (d < bd) {
        bd = d
        best = e
      }
    }
    return best
  }

  function explodeAt(w: World, x: number, y: number, radius: number, dmg: number) {
    for (const e of w.enemies) {
      const d = Math.hypot(e.x - x, e.y - y)
      if (d < radius + e.r) hurt(w, e, dmg, ((e.x - x) / (d || 1)) * 120, ((e.y - y) / (d || 1)) * 120)
    }
    fx.burst(x, y, { count: 10, color: ['#fde047', '#fb923c', '#ef4444', '#fff7ed'], speed: radius * 5, size: 3, shape: 'spark', gravity: 0, life: 0.35 })
    fx.ring(x, y, { color: '#fb923c', maxR: radius, life: 0.3, width: 4 })
    if (w.boomSnd <= 0) {
      w.boomSnd = 0.12
      sfx.boom(0.25)
    }
  }

  /** Instant piercing rail: damages every enemy within half-width of the line. */
  function fireRail(w: World, x: number, y: number, a: number, len: number, width: number, dmg: number, evo: boolean) {
    const c = Math.cos(a)
    const s = Math.sin(a)
    for (const e of w.enemies) {
      if (e.hp <= 0) continue
      const dx = e.x - x
      const dy = e.y - y
      const along = dx * c + dy * s
      if (along < -e.r || along > len + e.r) continue
      if (Math.abs(-dx * s + dy * c) > width / 2 + e.r) continue
      hurt(w, e, dmg, c * 160, s * 160)
      fx.burst(e.x, e.y, { count: 4, color: ['#e9d5ff', '#c084fc', '#ffffff'], speed: 170, size: 2, shape: 'spark', gravity: 0, life: 0.25 })
    }
    w.rails.push({ x, y, a, len, w: width, life: 0.32, max: 0.32, evo })
  }

  function dronePos(w: World, i: number, n: number, evolved: boolean) {
    const a = w.droneA + (i / n) * Math.PI * 2
    const r = evolved ? 54 : 44
    return { x: w.mech.x + Math.cos(a) * r, y: w.mech.y - 14 + Math.sin(a) * r * 0.62 + Math.sin(w.clock * 3 + i) * 2 }
  }

  function droneCount(s: WState) {
    return s.evolved ? 5 : [1, 2, 2, 3, 3][s.lvl - 1]
  }

  function fireWeapons(w: World, dt: number, idle: boolean) {
    const m = w.mech
    const cdMul = Math.pow(0.92, P(w, 'servo')) * (w.overdrive > 0 ? 0.55 : 1)
    const dmgMul = (1 + run.level('power') * 0.08) * (1 + P(w, 'capacitor') * 0.1) * (idle ? 3 : 1)
    const area = 1 + P(w, 'blast') * 0.12
    const spd = 1 + P(w, 'gyro') * 0.12
    const dur = 1 + P(w, 'fuel') * 0.15
    const ws = w.weapons
    // Blaster / Pulse Cannon.
    const bl = ws.blaster
    if (bl) {
      bl.cd -= dt
      if (bl.cd <= 0) {
        const tgt = nearest(w, m.x, m.y, 440)
        if (!tgt) bl.cd = 0.1
        else {
          const a = Math.atan2(tgt.y - m.y, tgt.x - m.x)
          const cx = m.x + Math.cos(a) * 14
          const cy = m.y - 12 + Math.sin(a) * 14
          if (bl.evolved) {
            bl.cd = 0.15 * cdMul
            bl.phase = 1 - bl.phase
            const off = (bl.phase ? 1 : -1) * 6
            const sp = 720 * spd
            w.bolts.push({ x: cx - Math.sin(a) * off, y: cy + Math.cos(a) * off, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: 17 * dmgMul, pierce: 5, life: 0.8, beam: true, drone: false, hit: [] })
          } else {
            const l = bl.lvl
            bl.cd = 0.72 * (l >= 3 ? 0.85 : 1) * (l >= 5 ? 0.85 : 1) * cdMul
            const count = [1, 2, 2, 3, 3][l - 1]
            const dmg = (14 + (l >= 3 ? 3 : 0) + (l >= 5 ? 5 : 0)) * dmgMul
            const sp = 470 * spd
            for (let i = 0; i < count; i++) {
              const aa = a + (i - (count - 1) / 2) * 0.13
              w.bolts.push({ x: cx, y: cy, vx: Math.cos(aa) * sp, vy: Math.sin(aa) * sp, dmg, pierce: l >= 4 ? 1 : 0, life: 1, beam: false, drone: false, hit: [] })
            }
          }
          m.aim = a
          if (w.shootSnd <= 0 && !idle) {
            w.shootSnd = 0.09
            sfx.shoot()
          }
        }
      }
    }
    // Orbit saws.
    const sw = ws.saws
    if (sw) {
      sw.phase += dt
      const on = sw.evolved || sw.phase % (3 * dur + 2) < 3 * dur
      w.sawA += dt * 3.3 * spd
      if (on) {
        const rings: [number, number, number][] = sw.evolved
          ? [
              [6, 98 * area, 1],
              [4, 54 * area, -1.4],
            ]
          : [[[2, 3, 3, 4, 5][sw.lvl - 1], [52, 52, 64, 64, 76][sw.lvl - 1] * area, 1]]
        const dmg = (sw.evolved ? 24 : [8, 11, 11, 15, 15][sw.lvl - 1]) * dmgMul
        for (const [n, rad, dir] of rings) {
          for (let i = 0; i < n; i++) {
            const a = w.sawA * dir + (i / n) * Math.PI * 2
            const sx = m.x + Math.cos(a) * rad
            const sy = m.y + Math.sin(a) * rad
            for (const e of w.enemies) {
              if (e.sawCd > 0 || e.hp <= 0) continue
              const dx = e.x - sx
              const dy = e.y - sy
              if (dx * dx + dy * dy < (e.r + 10 * area) ** 2) {
                e.sawCd = 0.32
                hurt(w, e, dmg, (dx / (Math.hypot(dx, dy) || 1)) * 140, (dy / (Math.hypot(dx, dy) || 1)) * 140)
                fx.burst(sx, sy, { count: 3, color: ['#fde047', '#ffffff'], speed: 160, size: 2, shape: 'spark', gravity: 0, life: 0.25 })
              }
            }
          }
        }
      }
    }
    // Missiles.
    const ms = ws.missiles
    if (ms) {
      ms.cd -= dt
      if (ms.cd <= 0 && w.enemies.length) {
        const l = ms.lvl
        ms.cd = (ms.evolved ? 1.0 : [2.2, 2.2, 2.2, 1.8, 1.8][l - 1]) * cdMul
        const count = ms.evolved ? 8 : [1, 2, 2, 3, 5][l - 1]
        const dmg = (ms.evolved ? 26 : [24, 24, 32, 32, 42][l - 1]) * dmgMul
        const radius = (ms.evolved ? 58 : [42, 42, 52, 52, 56][l - 1]) * area
        const near = [...w.enemies].sort((a, b) => (a.x - m.x) ** 2 + (a.y - m.y) ** 2 - ((b.x - m.x) ** 2 + (b.y - m.y) ** 2)).slice(0, 8)
        for (let i = 0; i < count; i++) {
          const a = rand(0, Math.PI * 2)
          const tgt = near[i % Math.max(1, near.length)]
          w.missiles.push({ x: m.x, y: m.y - 14, vx: Math.cos(a) * 160, vy: Math.sin(a) * 160 - 60, target: tgt ? tgt.id : -1, dmg, radius, life: 3, micro: ms.evolved })
        }
        if (!idle) sfx.whoosh()
      }
    }
    // Railgun / Gauss Lance.
    const rg = ws.railgun
    if (rg) {
      rg.cd -= dt
      if (rg.cd <= 0) {
        const tgt = nearest(w, m.x, m.y, 500)
        if (!tgt) rg.cd = 0.2
        else {
          const l = rg.lvl
          const evo = rg.evolved
          rg.cd = (evo ? 1.1 : [2.6, 2.6, 2.1, 2.1, 2.1][l - 1]) * cdMul
          const dmg = (evo ? 95 : [44, 58, 58, 58, 78][l - 1]) * dmgMul
          const width = (evo ? 18 : l >= 5 ? 14 : 9) * area
          const n = evo ? 3 : l >= 4 ? 2 : 1
          const base = Math.atan2(tgt.y - m.y, tgt.x - m.x)
          for (let i = 0; i < n; i++) fireRail(w, m.x, m.y - 14, base + (i - (n - 1) / 2) * (evo ? 0.24 : 0.18), 560, width, dmg, evo)
          m.aim = base
          if (!idle) {
            sfx.clang()
            fx.shake(evo ? 3 : 2, 0.1)
          }
        }
      }
    }
    // Wing drones / Hive Swarm: round-robin fire from each orbiting drone.
    const dr = ws.drones
    if (dr) {
      const n = droneCount(dr)
      w.droneA += dt * 1.7 * spd
      dr.cd -= dt
      if (dr.cd <= 0) {
        const period = (dr.evolved ? 0.36 : [1.0, 1.0, 0.8, 0.8, 0.66][dr.lvl - 1]) * cdMul
        dr.cd = period / n
        dr.phase = (Math.floor(dr.phase) + 1) % n
        const p = dronePos(w, dr.phase, n, dr.evolved)
        const tgt = nearest(w, p.x, p.y, 380)
        if (tgt) {
          const a = Math.atan2(tgt.y - p.y, tgt.x - p.x)
          const dmg = (dr.evolved ? 16 : [9, 9, 12, 12, 16][dr.lvl - 1]) * dmgMul
          w.bolts.push({ x: p.x, y: p.y, vx: Math.cos(a) * 540 * spd, vy: Math.sin(a) * 540 * spd, dmg, pierce: dr.evolved ? 1 : 0, life: 0.8, beam: false, drone: true, hit: [] })
        }
      }
    }
    // Arc lightning.
    const lt = ws.lightning
    if (lt) {
      lt.cd -= dt
      if (lt.cd <= 0) {
        const l = lt.lvl
        lt.cd = (lt.evolved ? 0.75 : [1.8, 1.8, 1.5, 1.5, 1.25][l - 1]) * cdMul
        const chains = lt.evolved ? 10 : [2, 3, 3, 5, 7][l - 1]
        const dmg = (lt.evolved ? 34 : [18, 23, 23, 29, 29][l - 1]) * dmgMul
        const strikes = lt.evolved ? 2 : 1
        let any = false
        for (let s = 0; s < strikes; s++) {
          const cands = w.enemies.filter((e) => e.hp > 0 && Math.hypot(e.x - m.x, e.y - m.y) < 320)
          if (!cands.length) break
          let cur = cands[Math.floor(Math.random() * Math.min(cands.length, 6))]
          const hit: number[] = []
          const pts = [m.x, m.y - 30]
          for (let c = 0; c <= chains && cur; c++) {
            hit.push(cur.id)
            const px = pts[pts.length - 2]
            const py = pts[pts.length - 1]
            // Jagged segment.
            for (let k = 1; k <= 3; k++) {
              const tt = k / 4
              pts.push(px + (cur.x - px) * tt + rand(-8, 8), py + (cur.y - py) * tt + rand(-8, 8))
            }
            pts.push(cur.x, cur.y)
            hurt(w, cur, dmg, 0, 0)
            fx.burst(cur.x, cur.y, { count: 4, color: ['#fef08a', '#ffffff'], speed: 120, size: 2, shape: 'spark', gravity: 0, life: 0.25 })
            const nxt = nearest(w, cur.x, cur.y, 130 * area, hit)
            cur = nxt as Enemy
          }
          w.arcs.push({ pts, life: 0.22 })
          any = true
        }
        if (any && !idle) sfx.slash()
      }
    }
    // Flamethrower / Inferno ring.
    const fl = ws.flamer
    if (fl) {
      fl.phase += dt
      const on = fl.evolved || fl.phase % (2 * dur + 1.6) < 2 * dur
      if (on) {
        const tgt = nearest(w, m.x, m.y, 200)
        const aim = tgt ? Math.atan2(tgt.y - m.y, tgt.x - m.x) : m.face
        const range = (fl.evolved ? 118 : [80, 95, 95, 110, 110][fl.lvl - 1]) * area
        const half = fl.lvl >= 3 ? 0.5 : 0.36
        const dps = (fl.evolved ? 62 : [26, 32, 32, 40, 50][fl.lvl - 1]) * dmgMul
        // Visual flames.
        const n = fl.evolved ? 4 : 3
        for (let i = 0; i < n && w.flames.length < 140; i++) {
          if (fl.evolved) {
            const a = rand(0, Math.PI * 2)
            const rr = range * rand(0.55, 1)
            w.flames.push({ x: m.x + Math.cos(a) * rr, y: m.y + Math.sin(a) * rr, vx: -Math.sin(a) * 60, vy: Math.cos(a) * 60 - 30, life: 0.45, max: 0.45, r: rand(7, 12) })
          } else {
            const a = aim + rand(-half, half) * 0.8
            const sp = range * rand(2.4, 3.2)
            w.flames.push({ x: m.x + Math.cos(aim) * 12, y: m.y - 8 + Math.sin(aim) * 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.36, max: 0.36, r: rand(5, 9) })
          }
        }
        w.flameTick -= dt
        if (w.flameTick <= 0) {
          w.flameTick = 0.13
          for (const e of w.enemies) {
            const dx = e.x - m.x
            const dy = e.y - m.y
            const d = Math.hypot(dx, dy)
            if (d > range + e.r) continue
            if (fl.evolved) {
              if (d < range * 0.45) continue
            } else {
              let da = Math.atan2(dy, dx) - aim
              while (da > Math.PI) da -= Math.PI * 2
              while (da < -Math.PI) da += Math.PI * 2
              if (Math.abs(da) > half + 0.15) continue
            }
            e.burn = 1.2
            hurt(w, e, dps * 0.13, 0, 0)
          }
        }
        m.aim = fl.evolved ? m.aim : aim
      }
    }
  }

  // ── Simulation ──────────────────────────────────────────

  function takeDamage(w: World, d: number) {
    const m = w.mech
    if (m.inv > 0 || phaseRef.current !== 'play' || devGod.current) return
    const dmg = Math.max(1, Math.round(d - P(w, 'armor')))
    m.hp -= dmg
    m.inv = 0.6
    m.flash = 0.2
    fx.flash('#ef4444', 0.18)
    fx.shake(Math.min(10, 3 + dmg / 3), 0.25)
    fx.text(m.x, m.y - 34, `-${dmg}`, '#fca5a5', 15)
    sfx.hurt()
    haptic.medium()
    if (m.hp <= 0) {
      m.hp = 0
      die()
    }
  }

  function bossAI(w: World, e: Enemy, dt: number) {
    const m = w.mech
    const dx = m.x - e.x
    const dy = m.y - e.y
    const d = Math.hypot(dx, dy) || 1
    e.stateT -= dt
    const over = e.kind === 'overlord' || e.kind === 'colossus'
    if (e.state === 'walk' && e.kind === 'colossus') {
      e.vx = (dx / d) * e.speed
      e.vy = (dy / d) * e.speed
      if (e.stateT <= 0) {
        const r = Math.random()
        if (r < 0.2) {
          e.state = 'tele-dash'
          e.stateT = 0.9
          e.dirX = dx / d
          e.dirY = dy / d
        } else if (r < 0.52) {
          e.state = 'tele-laser'
          e.stateT = 1.1
          e.side = Math.random() < 0.5 ? 1 : -1
          e.laserA = Math.atan2(dy, dx) - e.side * 0.95
          sfx.ready()
        } else if (r < 0.78) {
          e.state = 'barrage'
          e.stateT = 1.8
          e.fuse = 0
        } else if (r < 0.9) {
          spawnLinkerPair(w, rand(0, Math.PI * 2), 120, e.x, e.y)
          fx.ring(e.x, e.y, { color: '#5eead4', maxR: 120, life: 0.5, width: 5 })
          sfx.slash()
          e.stateT = 2
        } else {
          e.state = 'spiral'
          e.stateT = 2.6
        }
      }
    } else if (e.state === 'walk') {
      e.vx = (dx / d) * e.speed
      e.vy = (dy / d) * e.speed
      if (e.stateT <= 0) {
        const r = Math.random()
        if (r < 0.35) {
          e.state = 'tele-dash'
          e.stateT = 0.8
          e.dirX = dx / d
          e.dirY = dy / d
        } else if (r < 0.65 || !over) {
          if (r < 0.8 || over) {
            e.state = 'tele-burst'
            e.stateT = 0.6
          } else {
            // Summon minions.
            for (let i = 0; i < 6; i++) {
              const a = (i / 6) * Math.PI * 2
              spawnEnemy(w, over ? 'brute' : 'drone', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70)
            }
            fx.ring(e.x, e.y, { color: ENEMIES[e.kind].color, maxR: 90, life: 0.4, width: 5 })
            e.stateT = 2.2
          }
        } else {
          e.state = 'spiral'
          e.stateT = 2.6
        }
      }
    } else if (e.state === 'tele-dash') {
      e.vx = 0
      e.vy = 0
      if (e.stateT <= 0) {
        e.state = 'dash'
        e.stateT = 0.65
        sfx.whoosh()
      }
    } else if (e.state === 'dash') {
      e.vx = e.dirX * 520
      e.vy = e.dirY * 520
      if (e.stateT <= 0) {
        e.state = 'walk'
        e.stateT = rand(1.8, 2.8)
      }
    } else if (e.state === 'tele-burst') {
      e.vx *= 0.9
      e.vy *= 0.9
      if (e.stateT <= 0) {
        const n = over ? 24 : 16
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rand(0, 0.2)
          w.eshots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, life: 4, r: 6, dmg: 10 })
        }
        fx.ring(e.x, e.y, { color: '#fca5a5', maxR: 70, life: 0.3, width: 5 })
        sfx.boom(0.4)
        e.state = 'walk'
        e.stateT = rand(1.8, 2.8)
      }
    } else if (e.state === 'tele-laser') {
      e.vx *= 0.85
      e.vy *= 0.85
      if (e.stateT <= 0) {
        e.state = 'laser'
        e.stateT = 2.2
        sfx.boom(0.5)
        fx.shake(5, 0.3)
      }
    } else if (e.state === 'laser') {
      e.vx = 0
      e.vy = 0
      e.laserA += e.side * 0.86 * dt
      // Beam hit test against the mech (ray from the boss core).
      const c = Math.cos(e.laserA)
      const sn = Math.sin(e.laserA)
      const mx = m.x - e.x
      const my = m.y - 6 - e.y
      const along = mx * c + my * sn
      if (along > 0 && along < 470 && Math.abs(-mx * sn + my * c) < 20) takeDamage(w, 18)
      if (Math.random() < 0.6) fx.burst(e.x + c * 470, e.y + sn * 470, { count: 1, color: ['#99f6e4', '#ffffff'], speed: 120, size: 3, shape: 'spark', gravity: 0, life: 0.3 })
      if (e.stateT <= 0) {
        e.state = 'walk'
        e.stateT = rand(1.6, 2.4)
      }
    } else if (e.state === 'barrage') {
      e.vx *= 0.85
      e.vy *= 0.85
      e.fuse -= dt
      if (e.fuse <= 0) {
        e.fuse = 0.2
        const a = rand(0, Math.PI * 2)
        const rr = rand(0, 90)
        lob(w, e.x, e.y - e.r, m.x + m.vx * 0.5 + Math.cos(a) * rr, m.y + m.vy * 0.5 + Math.sin(a) * rr, 1.15, 50, 16, false)
        sfx.thud()
      }
      if (e.stateT <= 0) {
        e.state = 'walk'
        e.stateT = rand(1.6, 2.4)
      }
    } else if (e.state === 'spiral') {
      e.vx = (dx / d) * e.speed * 0.3
      e.vy = (dy / d) * e.speed * 0.3
      e.spiralA += dt * 2.6
      e.anim += dt
      if (Math.floor(e.stateT * 12) !== Math.floor((e.stateT + dt) * 12)) {
        const arms = e.kind === 'colossus' ? 4 : 3
        for (let k = 0; k < arms; k++) {
          const a = e.spiralA + (k / arms) * Math.PI * 2
          w.eshots.push({ x: e.x, y: e.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, life: 4, r: 5, dmg: 9 })
        }
      }
      if (e.stateT <= 0) {
        e.state = 'walk'
        e.stateT = 2
      }
    }
  }

  function step(w: World, dt: number, ph: Phase) {
    const idle = ph === 'idle'
    const m = w.mech
    if (!idle && ph === 'play') w.t += dt
    w.shootSnd -= dt
    w.popSnd -= dt
    w.boomSnd -= dt
    // Movement.
    let ix = 0
    let iy = 0
    w.clock += dt
    if (idle) {
      const a = w.clock * 0.5
      ix = Math.cos(a) * 0.8
      iy = Math.sin(a) * 0.8
    } else if (ph === 'play') {
      const v = stick.vec()
      ix = v.x
      iy = v.y
      const k = keys.current
      if (k.has('ArrowLeft') || k.has('a')) ix -= 1
      if (k.has('ArrowRight') || k.has('d')) ix += 1
      if (k.has('ArrowUp') || k.has('w')) iy -= 1
      if (k.has('ArrowDown') || k.has('s')) iy += 1
      const l = Math.hypot(ix, iy)
      if (l > 1) {
        ix /= l
        iy /= l
      }
    }
    if (w.overdrive > 0 && ph === 'play') w.overdrive -= dt
    const speed = 120 * (1 + P(w, 'thrusters') * 0.1) * (w.overdrive > 0 ? 1.25 : 1)
    m.moving = Math.hypot(ix, iy) > 0.15
    m.vx = ix * speed
    m.vy = iy * speed
    if (ph === 'play' || idle) {
      m.x += ix * speed * dt
      m.y += iy * speed * dt
    }
    if (m.moving) {
      m.face = Math.atan2(iy, ix)
      m.walk += dt * 11
    } else m.walk += dt * 2
    if (m.inv > 0) m.inv -= dt
    if (m.flash > 0) m.flash -= dt
    if (P(w, 'nanites') && ph === 'play') m.hp = Math.min(m.max, m.hp + P(w, 'nanites') * 0.4 * dt)

    // Events & spawning.
    if (ph === 'play') {
      for (const ev of w.events) {
        if (ev.done || w.t < ev.t) continue
        if (w.boss && (ev.kind.startsWith('boss:') || ev.kind === 'meteor')) {
          ev.t = w.t + 12
          continue
        }
        ev.done = true
        runEvent(w, ev.kind)
      }
    }
    const t = idle ? 40 : w.t
    let rate = idle ? 1.2 : 0.9 + t / 30
    if (w.horde > 0) {
      w.horde -= dt
      rate *= 2.5
    }
    if (w.boss) rate *= 0.5
    const cap = idle ? 30 : Math.min(150, 50 + t / 3)
    w.spawnAcc += rate * dt
    const ring = spawnRing()
    while (w.spawnAcc >= 1) {
      w.spawnAcc -= 1
      if (w.enemies.length >= cap) continue
      const a = rand(0, Math.PI * 2)
      const kind = idle ? 'drone' : pickKind(t)
      if (kind === 'linker') {
        spawnLinkerPair(w, a, ring)
        continue
      }
      const e = spawnEnemy(w, kind, m.x + Math.cos(a) * ring, m.y + Math.sin(a) * ring)
      if (kind === 'bat') {
        const b = Math.atan2(m.y - e.y, m.x - e.x)
        e.vx = Math.cos(b) * e.speed
        e.vy = Math.sin(b) * e.speed
      }
    }

    if (w.storm > 0 && ph === 'play') {
      w.storm -= dt
      w.stormAcc += dt * 2.8
      while (w.stormAcc >= 1) {
        w.stormAcc -= 1
        const near = Math.random() < 0.35
        const a = rand(0, Math.PI * 2)
        const rr = near ? rand(0, 50) : rand(60, 260)
        const tx = m.x + (near ? m.vx * 0.9 : 0) + Math.cos(a) * rr
        const ty = m.y + (near ? m.vy * 0.9 : 0) + Math.sin(a) * rr
        lob(w, tx + 180, ty - 460, tx, ty, 1.5, 44, 18 * Math.min(1.6, 1 + w.t / 1200), true)
      }
      if (w.storm <= 0) {
        w.pickups.push({ x: m.x + 70, y: m.y - 20, kind: 'chest', ph: 0 })
        w.pickups.push({ x: m.x - 70, y: m.y - 20, kind: 'overdrive', ph: 0 })
        say('STORM SURVIVED!', 'supply drop: chest + overdrive')
        sting('reward')
        haptic.success()
      }
    }

    fireWeapons(w, dt, idle)

    // Enemies.
    const dmgScale = idle ? 0 : 1
    for (const e of w.enemies) {
      if (e.hp <= 0) continue
      e.anim += dt * (e.kind === 'bat' || e.kind === 'drone' ? 9 : 6)
      if (e.flash > 0) e.flash -= dt
      if (e.sawCd > 0) e.sawCd -= dt
      if (e.burn > 0) {
        e.burn -= dt
        if (Math.random() < dt * 6) fx.burst(e.x, e.y - e.r * 0.5, { count: 1, color: ['#fb923c', '#fde047'], speed: 30, size: 3, gravity: -60, life: 0.4 })
      }
      const dx = m.x - e.x
      const dy = m.y - e.y
      const d = Math.hypot(dx, dy) || 1
      if (e.boss) bossAI(w, e, dt)
      else if (e.kind === 'bat') {
        e.life -= dt
        if (e.life <= 0) e.hp = 0
      } else if (e.kind === 'spitter') {
        const want = d > 200 ? 1 : d < 140 ? -1 : 0
        e.vx = (dx / d) * e.speed * want
        e.vy = (dy / d) * e.speed * want
        e.shoot -= dt
        if (e.shoot <= 0 && d < 380) {
          e.shoot = rand(2.4, 3.2)
          w.eshots.push({ x: e.x, y: e.y, vx: (dx / d) * 160, vy: (dy / d) * 160, life: 3.5, r: 6, dmg: e.dmg })
          fx.burst(e.x + (dx / d) * e.r, e.y + (dy / d) * e.r, { count: 4, color: ['#5eead4', '#ccfbf1'], speed: 80, gravity: 0, life: 0.3 })
        }
      } else if (e.kind === 'mortar') {
        const want = d > 270 ? 1 : d < 190 ? -0.6 : 0
        e.vx = (dx / d) * e.speed * want
        e.vy = (dy / d) * e.speed * want
        e.shoot -= dt
        if (e.shoot <= 0 && d < 430 && !idle) {
          e.shoot = rand(3.8, 4.8)
          lob(w, e.x, e.y - e.r, m.x + m.vx * 0.6, m.y + m.vy * 0.6, 1.35, 46, e.dmg, false)
          fx.burst(e.x, e.y - e.r, { count: 6, color: ['#78716c', '#d6d3d1', '#fb923c'], speed: 90, size: 3, gravity: -40, life: 0.45 })
          sfx.thud()
        }
      } else if (e.kind === 'linker') {
        const p = e.link >= 0 ? w.enemies.find((o) => o.id === e.link && o.hp > 0) : undefined
        if (!p) {
          e.link = -1
          e.vx = (dx / d) * e.speed
          e.vy = (dy / d) * e.speed
        } else {
          // Hold a slowly rotating flank position so the beam sweeps across the mech.
          const pa = e.spiralA + w.t * 0.45
          const tx = m.x + Math.cos(pa) * 100 * e.side - e.x
          const ty = m.y + Math.sin(pa) * 100 * e.side - e.y
          const td = Math.hypot(tx, ty) || 1
          const sp = td > 8 ? e.speed : 0
          e.vx = (tx / td) * sp
          e.vy = (ty / td) * sp
          e.zap -= dt
          if (e.zap <= 0) e.zap += 4
          if (e.side === 1 && e.zap < 1.6 && !idle) {
            const bx = p.x - e.x
            const by = p.y - e.y
            const bl = Math.hypot(bx, by)
            if (bl < 300) {
              const k = clamp(((m.x - e.x) * bx + (m.y - 6 - e.y) * by) / (bl * bl), 0, 1)
              if (Math.hypot(e.x + bx * k - m.x, e.y + by * k - m.y + 6) < 11) takeDamage(w, e.dmg * 0.7 * dmgScale)
            }
          }
        }
      } else if (e.kind === 'bomber') {
        if (e.fuse > 0) {
          e.fuse -= dt
          e.vx = 0
          e.vy = 0
          if (e.fuse <= 0) {
            e.hp = 0
            w.stats.kills++
            fx.explode(e.x, e.y, 1.3)
            if (w.boomSnd <= 0) {
              w.boomSnd = 0.1
              sfx.boom(0.5)
            }
            if (Math.hypot(m.x - e.x, m.y - e.y) < 72) takeDamage(w, e.dmg * dmgScale)
            for (const o of w.enemies) if (o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 72) hurt(w, o, 40, 0, 0)
            w.gems.push({ x: e.x, y: e.y, v: e.xp, pull: false, sp: 0 })
            continue
          }
        } else {
          e.vx = (dx / d) * e.speed
          e.vy = (dy / d) * e.speed
          if (d < 50) e.fuse = 0.65
        }
      } else {
        e.vx = (dx / d) * e.speed
        e.vy = (dy / d) * e.speed
      }
      e.x += (e.vx + e.kx) * dt
      e.y += (e.vy + e.ky) * dt
      e.kx *= Math.max(0, 1 - dt * 8)
      e.ky *= Math.max(0, 1 - dt * 8)
      // Contact damage.
      if (d < e.r + 13 && e.kind !== 'bomber') {
        if (m.inv <= 0 && !e.boss) {
          e.kx -= (dx / d) * 240
          e.ky -= (dy / d) * 240
        }
        takeDamage(w, e.dmg * dmgScale)
      }
      // Despawn stragglers far behind.
      if (!e.boss && !e.elite && d > ring * 2.2) {
        const a = rand(0, Math.PI * 2)
        e.x = m.x + Math.cos(a) * ring
        e.y = m.y + Math.sin(a) * ring
      }
    }
    // Light separation so swarms don't stack into one blob.
    const es = w.enemies
    for (let i = 0; i < es.length; i++) {
      const a = es[i]
      for (let j = i + 1; j < Math.min(es.length, i + 12); j++) {
        const b = es[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const rr = a.r + b.r
        const d2 = dx * dx + dy * dy
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2)
          const push = ((rr - d) / d) * 0.5
          const wa = a.boss ? 0.1 : 1
          const wb = b.boss ? 0.1 : 1
          a.x -= dx * push * wa
          a.y -= dy * push * wa
          b.x += dx * push * wb
          b.y += dy * push * wb
        }
      }
    }
    // Rotate the order a bit each frame so separation covers different pairs.
    if (es.length > 12) es.push(es.shift()!)

    // Player projectiles.
    for (const b of w.bolts) {
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.life -= dt
      for (const e of w.enemies) {
        if (b.life <= 0) break
        if (e.hp <= 0 || b.hit.includes(e.id)) continue
        const dx = e.x - b.x
        const dy = e.y - b.y
        if (dx * dx + dy * dy < (e.r + (b.beam ? 6 : 4)) ** 2) {
          b.hit.push(e.id)
          const sp = Math.hypot(b.vx, b.vy)
          hurt(w, e, b.dmg, (b.vx / sp) * 90, (b.vy / sp) * 90)
          fx.burst(b.x, b.y, { count: 3, color: [b.beam ? '#67e8f9' : '#7dd3fc', '#ffffff'], speed: 120, size: 2, shape: 'spark', gravity: 0, life: 0.2 })
          if (b.pierce-- <= 0) b.life = 0
        }
      }
    }
    w.bolts = w.bolts.filter((b) => b.life > 0)
    for (const ms of w.missiles) {
      ms.life -= dt
      let tgt = w.enemies.find((e) => e.id === ms.target && e.hp > 0)
      if (!tgt) {
        tgt = nearest(w, ms.x, ms.y, 400) ?? undefined
        ms.target = tgt ? tgt.id : -1
      }
      const sp = (ms.micro ? 330 : 280) * (1 + P(w, 'gyro') * 0.12)
      if (tgt) {
        const a = Math.atan2(tgt.y - ms.y, tgt.x - ms.x)
        ms.vx = approach(ms.vx, Math.cos(a) * sp, 4.5, dt)
        ms.vy = approach(ms.vy, Math.sin(a) * sp, 4.5, dt)
        if (Math.hypot(tgt.x - ms.x, tgt.y - ms.y) < tgt.r + 6) ms.life = 0
      }
      ms.x += ms.vx * dt
      ms.y += ms.vy * dt
      if (Math.random() < 0.5) fx.burst(ms.x, ms.y, { count: 1, color: ['#94a3b8', '#cbd5e1'], speed: 20, size: 3, gravity: -20, life: 0.35 })
      if (ms.life <= 0) explodeAt(w, ms.x, ms.y, ms.radius, ms.dmg)
    }
    w.missiles = w.missiles.filter((ms) => ms.life > 0)
    for (const s of w.eshots) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.life -= dt
      if (Math.hypot(s.x - m.x, s.y - m.y + 6) < s.r + 10) {
        s.life = 0
        takeDamage(w, s.dmg * dmgScale)
      }
    }
    w.eshots = w.eshots.filter((s) => s.life > 0)
    for (const sh of w.shells) {
      sh.t -= dt
      if (sh.t > 0) continue
      const pd = Math.hypot(sh.x - m.x, sh.y - m.y)
      if (pd < sh.r + 8) takeDamage(w, sh.dmg * dmgScale)
      for (const o of w.enemies) if (!o.boss && Math.hypot(o.x - sh.x, o.y - sh.y) < sh.r + o.r) hurt(w, o, sh.meteor ? 60 : 25, 0, 0)
      if (sh.meteor) {
        fx.explode(sh.x, sh.y, 1.1, ['#fb923c', '#fde047', '#78350f', '#ffffff'])
        if (Math.random() < 0.35) w.gems.push({ x: sh.x, y: sh.y, v: 5, pull: false, sp: 0 })
        if (Math.random() < 0.025) w.pickups.push({ x: sh.x, y: sh.y, kind: 'overdrive', ph: 0 })
      } else fx.explode(sh.x, sh.y, 0.8, ['#f97316', '#fde047', '#57534e'])
      fx.shake(pd < 200 ? 4 : 1.5, 0.15)
      if (w.boomSnd <= 0) {
        w.boomSnd = 0.1
        sfx.boom(sh.meteor ? 0.55 : 0.4)
      }
    }
    w.shells = w.shells.filter((sh) => sh.t > 0)
    for (const r of w.rails) r.life -= dt
    w.rails = w.rails.filter((r) => r.life > 0)
    for (const a of w.arcs) a.life -= dt
    w.arcs = w.arcs.filter((a) => a.life > 0)
    for (const f of w.flames) {
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.vx *= 1 - dt * 2
      f.vy *= 1 - dt * 2
      f.life -= dt
    }
    w.flames = w.flames.filter((f) => f.life > 0)
    w.enemies = w.enemies.filter((e) => e.hp > 0)

    // Gems.
    const mag = 80 * (1 + P(w, 'magnet') * 0.3) * (1 + run.level('magnet') * 0.2)
    let gained = 0
    for (const g of w.gems) {
      const dx = m.x - g.x
      const dy = m.y - g.y
      const d = Math.hypot(dx, dy)
      if (!g.pull && d < mag) g.pull = true
      if (g.pull) {
        g.sp = Math.min(700, g.sp + dt * 900)
        g.x += (dx / (d || 1)) * g.sp * dt
        g.y += (dy / (d || 1)) * g.sp * dt
        if (d < 14) {
          gained += g.v
          g.v = 0
        }
      }
    }
    if (gained) {
      if (!idle) gainXp(w, gained)
      w.gems = w.gems.filter((g) => g.v > 0)
      if (w.popSnd <= 0 && !idle) {
        w.popSnd = 0.06
        sfx.score(Math.min(10, Math.floor(w.xp / Math.max(1, xpNeed(w.level)) * 10)))
      }
    }
    if (w.gems.length > 260) {
      // Merge the farthest gems into one big gem to keep counts bounded.
      w.gems.sort((a, b) => (b.x - m.x) ** 2 + (b.y - m.y) ** 2 - ((a.x - m.x) ** 2 + (a.y - m.y) ** 2))
      const far = w.gems.splice(0, 60)
      const v = far.reduce((s, g) => s + g.v, 0)
      w.gems.push({ x: far[0].x, y: far[0].y, v, pull: false, sp: 0 })
    }
    // Pickups.
    for (const p of w.pickups) {
      p.ph += dt
      if (Math.hypot(p.x - m.x, p.y - m.y) < 22 && ph === 'play') {
        p.ph = -1
        if (p.kind === 'heal') {
          m.hp = Math.min(m.max, m.hp + 30)
          fx.text(m.x, m.y - 36, '+30 HP', '#4ade80', 16)
          sfx.power()
        } else if (p.kind === 'magnet') {
          for (const g of w.gems) g.pull = true
          fx.ring(m.x, m.y, { color: '#22d3ee', maxR: 300, life: 0.5, width: 5 })
          sfx.power()
        } else if (p.kind === 'bomb') {
          for (const e of w.enemies) if (!e.boss && Math.hypot(e.x - m.x, e.y - m.y) < 420) hurt(w, e, 9999, 0, 0)
          fx.flash('#ffffff', 0.4)
          fx.shake(12, 0.4)
          fx.ring(m.x, m.y, { color: '#fde047', maxR: 400, life: 0.6, width: 10 })
          sfx.boom(1)
        } else if (p.kind === 'overdrive') {
          w.overdrive = 9
          fx.text(m.x, m.y - 36, 'OVERDRIVE!', '#fbbf24', 17)
          fx.ring(m.x, m.y, { color: '#f59e0b', maxR: 140, life: 0.5, width: 6 })
          fx.flash('#f59e0b', 0.15)
          sfx.power()
          window.setTimeout(() => sfx.combo(), 120)
        } else openChest(w)
        haptic.medium()
      }
    }
    w.pickups = w.pickups.filter((p) => p.ph >= 0)

    if (ph === 'play') {
      if (w.pending > 0) {
        setChoices(rollChoices(w))
        stick.id = null
        setPhaseBoth('upgrade')
        fx.ring(m.x, m.y, { color: '#a5f3fc', maxR: 90, life: 0.5, width: 5 })
        sfx.levelUp()
        haptic.success()
      }
      if (w.boss) setBossBar({ name: BOSS_NAMES[w.boss.kind] ?? 'BOSS', k: clamp(w.boss.hp / w.boss.max, 0, 1) })
      w.hudT -= dt
      if (w.hudT <= 0) {
        w.hudT = 0.2
        w.stats.time = Math.floor(w.t)
        w.stats.level = w.level
        run.update(w.stats)
        setHud({ t: w.t, level: w.level, xp: w.xp, need: xpNeed(w.level), kills: w.stats.kills, hp: m.hp, max: m.max, od: Math.max(0, w.overdrive), endless: w.endless })
      }
    }
  }

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

  useEffect(() => {
    if (import.meta.env.DEV) {
      const win = window as unknown as Record<string, unknown>
      win.__mech = world
      // Dev-only skips for screenshots: jump the clock, spawn a boss or event, grant weapons.
      win.__en3mech = {
        skip(t: number) {
          const w = world.current
          w.t = t
          for (const ev of w.events) if (ev.t < t - 0.5) ev.done = true
          if (!w.endless) w.biome = biomeAt(t)
        },
        biome(i: number) {
          world.current.biome = i
        },
        event(kind: string) {
          runEvent(world.current, kind)
        },
        give(id: WeaponId, lvl = 5, evolve = false) {
          const w = world.current
          w.weapons[id] = { lvl, cd: 0.2, evolved: evolve, phase: 0 }
          w.passives[WEAPONS[id].pair] = Math.max(1, w.passives[WEAPONS[id].pair] ?? 0)
          syncLoadout(w)
        },
        god() {
          devGod.current = true
        },
        win() {
          const w = world.current
          w.t = Math.max(w.t, 600)
          victory(w)
        },
      }
    }
    function down(e: KeyboardEvent) {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (phaseRef.current === 'crossroad') {
        if (k === '1') goEndless()
        else if (k === '2') claimVictory()
        return
      }
      if (phaseRef.current === 'upgrade' && ['1', '2', '3'].includes(k)) {
        const c = choicesRef.current[Number(k) - 1]
        if (c) choose(c)
        return
      }
      if (phaseRef.current !== 'play') return
      if (k.startsWith('Arrow')) e.preventDefault()
      keys.current.add(k)
    }
    function up(e: KeyboardEvent) {
      keys.current.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ── Drawing ─────────────────────────────────────────────

  function groundFill(ctx: CanvasRenderingContext2D, b: number) {
    if (!patterns.current.has(b)) patterns.current.set(b, ctx.createPattern(groundTile(b), 'repeat'))
    return patterns.current.get(b) ?? BIOMES[b].ground
  }

  function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, t: number) {
    const y = p.y + Math.sin(p.ph * 3) * 2
    if (p.kind === 'chest') {
      glow(ctx, p.x, y, 40, '#fde047', 0.5 + Math.sin(t * 5) * 0.15)
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(p.x, p.y + 12, 14, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#92400e'
      ctx.beginPath()
      ctx.roundRect(p.x - 13, y - 6, 26, 16, 3)
      ctx.fill()
      ctx.fillStyle = '#d97706'
      ctx.beginPath()
      ctx.roundRect(p.x - 14, y - 13, 28, 9, 4)
      ctx.fill()
      ctx.fillStyle = '#fde047'
      ctx.fillRect(p.x - 14, y - 5, 28, 3)
      ctx.fillRect(p.x - 3, y - 7, 6, 8)
      ctx.fillStyle = '#78350f'
      ctx.fillRect(p.x - 1, y - 4, 2, 3)
      return
    }
    if (p.kind === 'overdrive') {
      // Overdrive core: spinning gold hexagon with a lightning glyph.
      glow(ctx, p.x, y, 30, '#f59e0b', 0.55 + Math.sin(t * 8) * 0.15)
      ctx.save()
      ctx.translate(p.x, y)
      ctx.rotate(t * 1.5)
      const g = ctx.createLinearGradient(0, -12, 0, 12)
      g.addColorStop(0, '#fef3c7')
      g.addColorStop(0.5, '#f59e0b')
      g.addColorStop(1, '#92400e')
      ctx.fillStyle = g
      ctx.beginPath()
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2
        if (k === 0) ctx.moveTo(Math.cos(a) * 12, Math.sin(a) * 12)
        else ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12)
      }
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#451a03'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.moveTo(p.x + 2, y - 8)
      ctx.lineTo(p.x - 4, y + 1)
      ctx.lineTo(p.x, y + 1)
      ctx.lineTo(p.x - 2, y + 8)
      ctx.lineTo(p.x + 4, y - 1)
      ctx.lineTo(p.x, y - 1)
      ctx.closePath()
      ctx.fill()
      return
    }
    const col = p.kind === 'heal' ? '#4ade80' : p.kind === 'magnet' ? '#22d3ee' : '#f43f5e'
    glow(ctx, p.x, y, 22, col, 0.5)
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.arc(p.x, y, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = col
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.lineCap = 'round'
    ctx.beginPath()
    if (p.kind === 'heal') {
      ctx.moveTo(p.x - 5, y)
      ctx.lineTo(p.x + 5, y)
      ctx.moveTo(p.x, y - 5)
      ctx.lineTo(p.x, y + 5)
    } else if (p.kind === 'magnet') {
      ctx.arc(p.x, y, 4.5, Math.PI, 0, true)
      ctx.moveTo(p.x - 4.5, y)
      ctx.lineTo(p.x - 4.5, y - 4)
      ctx.moveTo(p.x + 4.5, y)
      ctx.lineTo(p.x + 4.5, y - 4)
    } else {
      ctx.arc(p.x - 1, y + 1, 4.5, 0, Math.PI * 2)
      ctx.moveTo(p.x + 2, y - 3)
      ctx.lineTo(p.x + 5, y - 6)
    }
    ctx.stroke()
  }

  function drawBoss(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
    const d = ENEMIES[e.kind]
    const r = e.r
    const over = e.kind === 'overlord'
    const col = e.kind === 'colossus'
    // Laser telegraph / beam drawn under the body.
    if (e.state === 'tele-laser' || e.state === 'laser') {
      const live = e.state === 'laser'
      const c = Math.cos(e.laserA)
      const sn = Math.sin(e.laserA)
      if (!live) {
        // Sweep wedge + arrow showing where the beam will travel.
        ctx.fillStyle = 'rgba(239,68,68,0.12)'
        ctx.beginPath()
        ctx.moveTo(e.x, e.y)
        ctx.arc(e.x, e.y, 470, e.laserA, e.laserA + e.side * 1.9, e.side < 0)
        ctx.closePath()
        ctx.fill()
        ctx.strokeStyle = `rgba(254,202,202,${0.5 + Math.sin(t * 30) * 0.3})`
        ctx.lineWidth = 3
        ctx.setLineDash([14, 10])
        ctx.beginPath()
        ctx.moveTo(e.x, e.y)
        ctx.lineTo(e.x + c * 470, e.y + sn * 470)
        ctx.stroke()
        ctx.setLineDash([])
        const aa = e.laserA + e.side * 0.5
        const ax = e.x + Math.cos(aa) * 200
        const ay = e.y + Math.sin(aa) * 200
        ctx.save()
        ctx.translate(ax, ay)
        ctx.rotate(aa + (e.side * Math.PI) / 2)
        ctx.fillStyle = 'rgba(254,202,202,0.85)'
        ctx.beginPath()
        ctx.moveTo(16, 0)
        ctx.lineTo(-8, -11)
        ctx.lineTo(-8, 11)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      } else {
        ctx.lineCap = 'round'
        for (const [cl, lw] of [
          ['rgba(20,184,166,0.35)', 44],
          ['#2dd4bf', 22],
          ['#f0fdfa', 8],
        ] as [string, number][]) {
          ctx.strokeStyle = cl
          ctx.lineWidth = lw * (0.9 + Math.sin(t * 40) * 0.1)
          ctx.beginPath()
          ctx.moveTo(e.x + c * e.r * 0.5, e.y + sn * e.r * 0.5)
          ctx.lineTo(e.x + c * 470, e.y + sn * 470)
          ctx.stroke()
        }
      }
    }
    ctx.save()
    ctx.translate(e.x, e.y)
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.beginPath()
    ctx.ellipse(4, r * 0.8, r * 1.1, r * 0.4, 0, 0, Math.PI * 2)
    ctx.fill()
    if (e.state === 'tele-burst' || e.state === 'spiral') glow(ctx, 0, 0, r * 2, '#fca5a5', 0.4 + Math.sin(t * 20) * 0.2)
    // Legs.
    ctx.strokeStyle = d.dark
    ctx.lineWidth = 7
    ctx.lineCap = 'round'
    const legs = col ? 6 : 4
    for (let i = 0; i < legs; i++) {
      const a = (i / legs) * Math.PI * 2 + Math.PI / 4
      const st = Math.sin(e.anim * 2 + i) * 6
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6)
      ctx.lineTo(Math.cos(a) * (r * 1.2 + st), Math.sin(a) * (r * 1.2 + st) + 6)
      ctx.stroke()
    }
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 2, 0, 0, r)
    g.addColorStop(0, e.flash > 0 ? '#ffffff' : col ? '#ccfbf1' : '#fecaca')
    g.addColorStop(0.3, e.flash > 0 ? '#fecaca' : d.color)
    g.addColorStop(1, d.dark)
    ctx.fillStyle = g
    ctx.beginPath()
    if (col) {
      // Hexagonal armored hull.
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6
        if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      }
      ctx.closePath()
    } else if (over) {
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + t * 0.3
        const rr = k % 2 ? r * 0.85 : r
        if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      ctx.closePath()
    } else ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = d.dark
    ctx.lineWidth = 3
    ctx.stroke()
    if (col) {
      // Rotating armor plates and twin shoulder cannons.
      ctx.fillStyle = '#134e4a'
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + t * 0.4
        ctx.save()
        ctx.rotate(a)
        ctx.beginPath()
        ctx.roundRect(r * 0.66, -r * 0.12, r * 0.22, r * 0.24, 3)
        ctx.fill()
        ctx.restore()
      }
      const la0 = Math.atan2(world.current.mech.y - e.y, world.current.mech.x - e.x)
      for (const sd of [-1, 1]) {
        ctx.save()
        ctx.translate(Math.cos(la0 + sd * 1.3) * r * 0.75, Math.sin(la0 + sd * 1.3) * r * 0.75)
        ctx.rotate(la0)
        ctx.fillStyle = '#0f172a'
        ctx.beginPath()
        ctx.roundRect(-6, -7, 30, 14, 4)
        ctx.fill()
        ctx.fillStyle = '#5eead4'
        ctx.fillRect(20, -5, 4, 10)
        ctx.restore()
      }
    }
    // Armor plates & core eye.
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2)
    ctx.fill()
    const m = world.current.mech
    const la = Math.atan2(m.y - e.y, m.x - e.x)
    ctx.fillStyle = '#fef2f2'
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = col ? (e.state === 'tele-laser' || e.state === 'laser' ? '#ef4444' : '#0d9488') : over ? '#a21caf' : '#dc2626'
    ctx.beginPath()
    ctx.arc(Math.cos(la) * r * 0.16, Math.sin(la) * r * 0.16, r * 0.24, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.arc(Math.cos(la) * r * 0.22, Math.sin(la) * r * 0.22, r * 0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(-r * 0.45, -r * 0.5)
    ctx.lineTo(-r * 0.1, -r * 0.38)
    ctx.moveTo(r * 0.45, -r * 0.5)
    ctx.lineTo(r * 0.1, -r * 0.38)
    ctx.stroke()
    ctx.restore()
    // Dash telegraph.
    if (e.state === 'tele-dash') {
      ctx.strokeStyle = `rgba(239,68,68,${0.35 + Math.sin(t * 30) * 0.2})`
      ctx.lineWidth = r * 1.6
      ctx.beginPath()
      ctx.moveTo(e.x, e.y)
      ctx.lineTo(e.x + e.dirX * 340, e.y + e.dirY * 340)
      ctx.stroke()
    }
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    const ph = phaseRef.current
    const w = world.current
    const s = clamp(Math.min(W, H * 0.62) / 350, 0.85, 1.25)
    size.current = { w: W, h: H, s }
    const dt = fx.step(raw)
    if (dt > 0 && ph !== 'upgrade' && ph !== 'over' && ph !== 'crossroad') step(w, dt, ph)
    else if (ph === 'over' && dt > 0) {
      for (const e of w.enemies) e.anim += dt * 4
    }
    const m = w.mech
    if (w.biomeFade > 0) w.biomeFade = Math.max(0, w.biomeFade - raw / 2.5)

    const camX = m.x
    const camY = m.y - 10
    const x0 = camX - W / 2 / s - 40
    const x1 = camX + W / 2 / s + 40
    const y0 = camY - H / 2 / s - 40
    const y1 = camY + H / 2 / s + 40

    fx.applyShake(ctx)
    ctx.translate(W / 2, H / 2)
    ctx.scale(s, s)
    ctx.translate(-camX, -camY)
    ctx.fillStyle = groundFill(ctx, w.biome)
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
    if (w.biomeFade > 0) {
      ctx.globalAlpha = w.biomeFade
      ctx.fillStyle = groundFill(ctx, w.prevBiome)
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
      ctx.globalAlpha = 1
    }
    drawDecor(ctx, w.biome, x0, y0, x1, y1, t)

    // Shell / meteor landing zones (ground layer).
    for (const sh of w.shells) {
      const k = 1 - sh.t / sh.max
      ctx.fillStyle = `rgba(239,68,68,${0.1 + k * 0.22})`
      ctx.beginPath()
      ctx.ellipse(sh.x, sh.y, sh.r, sh.r * 0.7, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgba(254,202,202,${0.5 + Math.sin(t * 24) * 0.25})`
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = 'rgba(220,38,38,0.35)'
      ctx.beginPath()
      ctx.ellipse(sh.x, sh.y, sh.r * k, sh.r * 0.7 * k, 0, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const g of w.gems) {
      if (g.x < x0 || g.x > x1 || g.y < y0 || g.y > y1) continue
      const sp = gemSprite(g.v)
      ctx.drawImage(sp, g.x - 8, g.y - 10 + Math.sin(t * 4 + g.x) * 1.5, 16, 20.8)
    }
    for (const p of w.pickups) drawPickup(ctx, p, t)

    // Inferno ring glow under everything.
    const fl = w.weapons.flamer
    if (fl?.evolved) glow(ctx, m.x, m.y, 130 * (1 + P(w, 'blast') * 0.12), '#f97316', 0.18)

    for (const e of w.enemies) {
      if (!e.boss && (e.x < x0 - 60 || e.x > x1 + 60 || e.y < y0 - 60 || e.y > y1 + 60)) continue
      if (e.boss) {
        drawBoss(ctx, e, t)
        continue
      }
      const sz = enemySpriteSize(e.kind) * (e.elite ? 1.8 : 1)
      const frameIdx = Math.floor(e.anim) % 2
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.ellipse(e.x + 2, e.y + e.r * 0.75, e.r * 0.9, e.r * 0.35, 0, 0, Math.PI * 2)
      ctx.fill()
      if (e.elite) glow(ctx, e.x, e.y, e.r * 2.2, '#fde047', 0.35 + Math.sin(t * 6) * 0.1)
      const face = e.kind === 'bat' ? Math.atan2(e.vy, e.vx) : Math.atan2(m.y - e.y, m.x - e.x)
      const flip = Math.cos(face) < 0
      ctx.save()
      ctx.translate(e.x, e.y + (e.kind === 'drone' || e.kind === 'bat' ? Math.sin(e.anim) * 2 - 4 : 0))
      if (flip) ctx.scale(-1, 1)
      if (e.kind === 'bat' || e.kind === 'drone') ctx.rotate(flip ? -(face - Math.PI) * 0.3 : face * 0.3)
      ctx.drawImage(enemySprite(e.kind, frameIdx, e.flash > 0), -sz / 2, -sz / 2, sz, sz)
      ctx.restore()
      if (e.kind === 'bomber' && e.fuse > 0) {
        const k = 1 - e.fuse / 0.65
        ctx.strokeStyle = `rgba(239,68,68,${0.4 + Math.sin(t * 40) * 0.3})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(e.x, e.y, 72 * k, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (e.kind === 'spitter' && e.shoot < 0.5) glow(ctx, e.x, e.y, e.r * 1.8, '#5eead4', 0.5)
      if (e.elite) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.fillRect(e.x - 18, e.y - e.r - 10, 36, 4)
        ctx.fillStyle = '#fde047'
        ctx.fillRect(e.x - 18, e.y - e.r - 10, 36 * clamp(e.hp / e.max, 0, 1), 4)
      }
    }

    // Linker beams.
    for (const e of w.enemies) {
      if (e.kind !== 'linker' || e.side !== 1 || e.link < 0) continue
      const o = w.enemies.find((q) => q.id === e.link)
      if (!o || Math.hypot(o.x - e.x, o.y - e.y) > 300 || e.zap > 2.2) continue
      if (e.zap >= 1.6) {
        // Warning flicker before the beam arms.
        if (Math.floor(t * 18) % 2) continue
        ctx.strokeStyle = 'rgba(254,202,202,0.75)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([6, 6])
        ctx.beginPath()
        ctx.moveTo(e.x, e.y)
        ctx.lineTo(o.x, o.y)
        ctx.stroke()
        ctx.setLineDash([])
        continue
      }
      const segs = 8
      for (const [cl, lw] of [
        ['rgba(239,68,68,0.45)', 10],
        ['#fda4af', 4],
        ['#ffffff', 1.6],
      ] as [string, number][]) {
        ctx.strokeStyle = cl
        ctx.lineWidth = lw
        ctx.beginPath()
        ctx.moveTo(e.x, e.y)
        for (let i = 1; i < segs; i++) {
          const k = i / segs
          ctx.lineTo(e.x + (o.x - e.x) * k + rand(-4, 4), e.y + (o.y - e.y) * k + rand(-4, 4))
        }
        ctx.lineTo(o.x, o.y)
        ctx.stroke()
      }
    }
    // Rails.
    ctx.lineCap = 'round'
    for (const r of w.rails) {
      const k = r.life / r.max
      const ex = r.x + Math.cos(r.a) * r.len
      const ey = r.y + Math.sin(r.a) * r.len
      for (const [cl, lw] of [
        [r.evo ? 'rgba(250,204,21,0.35)' : 'rgba(192,132,252,0.35)', r.w * 2],
        [r.evo ? '#fde047' : '#c084fc', r.w],
        ['#ffffff', r.w * 0.35],
      ] as [string, number][]) {
        ctx.globalAlpha = k
        ctx.strokeStyle = cl
        ctx.lineWidth = lw * (0.4 + k * 0.6)
        ctx.beginPath()
        ctx.moveTo(r.x, r.y)
        ctx.lineTo(ex, ey)
        ctx.stroke()
      }
      // Spiral coil wrap.
      ctx.strokeStyle = '#f5d0fe'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let d = 0; d < r.len; d += 6) {
        const off = Math.sin(d * 0.25 + (1 - k) * 20) * r.w * 0.9
        const px = r.x + Math.cos(r.a) * d - Math.sin(r.a) * off
        const py = r.y + Math.sin(r.a) * d + Math.cos(r.a) * off
        if (d === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    // Saws.
    const sw = w.weapons.saws
    if (sw) {
      const dur = 1 + P(w, 'fuel') * 0.15
      const on = sw.evolved || sw.phase % (3 * dur + 2) < 3 * dur
      if (on) {
        const area = 1 + P(w, 'blast') * 0.12
        const rings: [number, number, number][] = sw.evolved
          ? [
              [6, 98 * area, 1],
              [4, 54 * area, -1.4],
            ]
          : [[[2, 3, 3, 4, 5][sw.lvl - 1], [52, 52, 64, 64, 76][sw.lvl - 1] * area, 1]]
        for (const [n, rad, dir] of rings) {
          for (let i = 0; i < n; i++) {
            const a = w.sawA * dir + (i / n) * Math.PI * 2
            const sx = m.x + Math.cos(a) * rad
            const sy = m.y + Math.sin(a) * rad
            ctx.save()
            ctx.translate(sx, sy)
            ctx.rotate(t * 25)
            const sr = 10 * area
            ctx.fillStyle = sw.evolved ? '#fde047' : '#cbd5e1'
            ctx.beginPath()
            for (let k = 0; k < 16; k++) {
              const aa = (k / 16) * Math.PI * 2
              const rr = k % 2 ? sr * 0.72 : sr
              if (k === 0) ctx.moveTo(Math.cos(aa) * rr, Math.sin(aa) * rr)
              else ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr)
            }
            ctx.closePath()
            ctx.fill()
            ctx.fillStyle = '#475569'
            ctx.beginPath()
            ctx.arc(0, 0, sr * 0.35, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
          }
        }
      }
    }
    // Flames.
    for (const f of w.flames) {
      const k = f.life / f.max
      ctx.globalAlpha = Math.min(1, k * 1.5) * 0.85
      ctx.fillStyle = k > 0.66 ? '#fef08a' : k > 0.33 ? '#fb923c' : '#dc2626'
      ctx.beginPath()
      ctx.arc(f.x, f.y, f.r * (1.4 - k * 0.6), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    // Missiles.
    for (const ms of w.missiles) {
      const a = Math.atan2(ms.vy, ms.vx)
      ctx.save()
      ctx.translate(ms.x, ms.y)
      ctx.rotate(a)
      const L = ms.micro ? 7 : 10
      ctx.fillStyle = '#fde047'
      ctx.beginPath()
      ctx.arc(-L, 0, 3 + Math.random() * 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#e2e8f0'
      ctx.beginPath()
      ctx.roundRect(-L, -2.5, L * 1.6, 5, 2.5)
      ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.moveTo(L * 0.6, -2.5)
      ctx.lineTo(L * 1.1, 0)
      ctx.lineTo(L * 0.6, 2.5)
      ctx.fill()
      ctx.restore()
    }
    // Bolts.
    ctx.lineCap = 'round'
    for (const b of w.bolts) {
      ctx.strokeStyle = b.drone ? '#4ade80' : b.beam ? '#67e8f9' : '#7dd3fc'
      ctx.lineWidth = b.beam ? 5 : 3.5
      ctx.beginPath()
      ctx.moveTo(b.x, b.y)
      ctx.lineTo(b.x - b.vx * (b.beam ? 0.035 : 0.025), b.y - b.vy * (b.beam ? 0.035 : 0.025))
      ctx.stroke()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = b.beam ? 2 : 1.5
      ctx.stroke()
    }
    // Enemy shots.
    for (const sh of w.eshots) {
      if (sh.x < x0 || sh.x > x1 || sh.y < y0 || sh.y > y1) continue
      glow(ctx, sh.x, sh.y, sh.r * 2.4, '#ef4444', 0.45)
      ctx.fillStyle = '#fee2e2'
      ctx.beginPath()
      ctx.arc(sh.x, sh.y, sh.r * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
    // Shells and meteors in flight.
    for (const sh of w.shells) {
      const k = 1 - sh.t / sh.max
      if (sh.meteor) {
        const kk = k * k
        const mx = sh.sx + (sh.x - sh.sx) * kk
        const my = sh.sy + (sh.y - sh.sy) * kk
        const ang = Math.atan2(sh.y - sh.sy, sh.x - sh.sx)
        ctx.strokeStyle = 'rgba(251,146,60,0.45)'
        ctx.lineWidth = 12
        ctx.beginPath()
        ctx.moveTo(mx, my)
        ctx.lineTo(mx - Math.cos(ang) * 60, my - Math.sin(ang) * 60)
        ctx.stroke()
        ctx.strokeStyle = 'rgba(254,240,138,0.8)'
        ctx.lineWidth = 5
        ctx.stroke()
        glow(ctx, mx, my, 26, '#f97316', 0.5)
        ctx.fillStyle = '#57534e'
        ctx.beginPath()
        ctx.arc(mx, my, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#a8a29e'
        ctx.beginPath()
        ctx.arc(mx - 3, my - 3, 4, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const mx = sh.sx + (sh.x - sh.sx) * k
        const my = sh.sy + (sh.y - sh.sy) * k - Math.sin(Math.PI * k) * 140
        glow(ctx, mx, my, 16, '#f97316', 0.45)
        ctx.fillStyle = '#292524'
        ctx.beginPath()
        ctx.arc(mx, my, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fb923c'
        ctx.beginPath()
        ctx.arc(mx - 1.5, my - 1.5, 2.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // Mech.
    if (ph !== 'over' || w.victory) {
      const blink = m.inv > 0 && m.inv < 2.6 && Math.floor(t * 14) % 2 === 0 && ph === 'play'
      if (!blink) drawMech(ctx, m.x, m.y, m.face, m.aim, m.walk, m.moving, m.flash > 0)
      if (m.inv > 0.6 && ph === 'play') {
        ctx.strokeStyle = 'rgba(125,211,252,0.6)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(m.x, m.y - 4, 24, 0, Math.PI * 2)
        ctx.stroke()
      }
      // Hull bar.
      if (ph !== 'idle') {
        const k = clamp(m.hp / m.max, 0, 1)
        ctx.fillStyle = 'rgba(0,0,0,0.55)'
        ctx.fillRect(m.x - 16, m.y + 16, 32, 4)
        ctx.fillStyle = k > 0.5 ? '#4ade80' : k > 0.25 ? '#facc15' : '#ef4444'
        ctx.fillRect(m.x - 16, m.y + 16, 32 * k, 4)
      }
      if (w.overdrive > 0 && ph !== 'idle') {
        ctx.strokeStyle = `rgba(245,158,11,${0.45 + Math.sin(t * 16) * 0.25})`
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(m.x, m.y - 4, 28 + Math.sin(t * 8) * 2, 0, Math.PI * 2)
        ctx.stroke()
        if (Math.random() < 0.4) fx.burst(m.x + rand(-12, 12), m.y + 6, { count: 1, color: ['#fde047', '#f59e0b'], speed: 30, size: 2.5, gravity: -80, life: 0.4 })
      }
      const dr = w.weapons.drones
      if (dr) {
        const n = droneCount(dr)
        for (let i = 0; i < n; i++) {
          const dp = dronePos(w, i, n, dr.evolved)
          drawWingDrone(ctx, dp.x, dp.y, m.aim, t + i, dr.evolved)
        }
      }
    }
    // Lightning arcs.
    for (const a of w.arcs) {
      ctx.globalAlpha = a.life / 0.22
      for (const [col, lw] of [
        ['#facc15', 5],
        ['#ffffff', 2],
      ] as [string, number][]) {
        ctx.strokeStyle = col
        ctx.lineWidth = lw
        ctx.beginPath()
        ctx.moveTo(a.pts[0], a.pts[1])
        for (let i = 2; i < a.pts.length; i += 2) ctx.lineTo(a.pts[i], a.pts[i + 1])
        ctx.stroke()
      }
    }
    ctx.globalAlpha = 1
    // Ambient biome particles drift through the view.
    const vw = x1 - x0
    const vh = y1 - y0
    if (w.moteBiome !== w.biome || !w.motes.length) {
      w.moteBiome = w.biome
      w.motes = []
      for (let i = 0; i < 34; i++) {
        const [vx, vy] = moteVelocity(w.biome)
        w.motes.push({ x: x0 + Math.random() * vw, y: y0 + Math.random() * vh, vx, vy, s: rand(1.5, 3.5), ph: rand(0, 6.28) })
      }
    }
    for (const mo of w.motes) {
      mo.x += mo.vx * raw
      mo.y += mo.vy * raw
      if (mo.x < x0) mo.x += vw
      else if (mo.x > x1) mo.x -= vw
      if (mo.y < y0) mo.y += vh
      else if (mo.y > y1) mo.y -= vh
    }
    drawMotes(ctx, w.motes, w.biome, t)
    fx.draw(ctx)
    ctx.restore()

    // Off-screen pointers to bosses and chests.
    if (ph === 'play') {
      const marks: [number, number, string][] = []
      if (w.boss) marks.push([w.boss.x, w.boss.y, '#ef4444'])
      for (const p of w.pickups) if (p.kind === 'chest') marks.push([p.x, p.y, '#fde047'])
      for (const [tx, ty, col] of marks) {
        const sx = (tx - camX) * s + W / 2
        const sy = (ty - camY) * s + H / 2
        if (sx > 0 && sx < W && sy > 0 && sy < H) continue
        const a = Math.atan2(sy - H / 2, sx - W / 2)
        ctx.save()
        ctx.translate(clamp(sx, 18, W - 18), clamp(sy, 90, H - 18))
        ctx.rotate(a)
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.moveTo(12, 0)
        ctx.lineTo(-6, -8)
        ctx.lineTo(-6, 8)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      if (w.storm > 0) {
        ctx.fillStyle = `rgba(124,45,18,${0.12 + Math.sin(t * 3) * 0.04})`
        ctx.fillRect(0, 0, W, H)
      }
      if (m.hp / m.max < 0.3) {
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7)
        g.addColorStop(0, 'rgba(239,68,68,0)')
        g.addColorStop(1, `rgba(239,68,68,${0.3 + Math.sin(t * 6) * 0.12})`)
        ctx.fillStyle = g
        ctx.fillRect(0, 0, W, H)
      }
    }
    stick.draw(ctx)
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const w0 = world.current
  const playing = phase === 'play' || phase === 'dying' || phase === 'upgrade' || phase === 'crossroad'

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena mech-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <>
              <div className="mech-xp" aria-label="Experience">
                <span style={{ width: `${clamp((hud.xp / hud.need) * 100, 0, 100)}%` }} />
                <b>LV {hud.level}</b>
              </div>
              <div className="action-hud mech-hud">
                <div className="mech-loadout">
                  {loadout.map((l) => (
                    <span key={l.id} className={`mech-slot${l.evolved ? ' is-evo' : ''}`}>
                      <PartIcon id={l.id} color={l.color} />
                      <i>{l.evolved ? 'EVO' : l.lvl}</i>
                    </span>
                  ))}
                </div>
                <div className="mech-mid">
                  <div className={`mech-timer${hud.t > 540 && !hud.endless ? ' is-late' : ''}${hud.endless ? ' is-endless' : ''}`}>{fmt(hud.t)}</div>
                  {hud.endless ? <span className="mech-pill is-endless">ENDLESS</span> : null}
                  {hud.od > 0 ? <span className="mech-pill is-od">OVERDRIVE {Math.ceil(hud.od)}</span> : null}
                </div>
                <div className="action-hud__right">
                  <span className="action-hud__small">{hud.kills} kills</span>
                  <span className="action-hud__small">
                    {Math.ceil(hud.hp)}/{hud.max} HP
                  </span>
                </div>
              </div>
            </>
          )}
          {bossBar && phase === 'play' ? (
            <div className="mech-boss">
              <small>{bossBar.name}</small>
              <div>
                <span style={{ width: `${bossBar.k * 100}%` }} />
              </div>
            </div>
          ) : null}
          {banner && playing ? (
            <div className="action-banner mech-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          {phase === 'upgrade' && (
            <div className="mech-upgrade" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Level {w0.level - w0.pending + 1}!</h3>
              <p>Choose an upgrade</p>
              <div className="mech-upgrade__list">
                {choices.map((c, i) => {
                  const isW = c.kind === 'weapon'
                  const isP = c.kind === 'passive'
                  const name = isW ? WEAPONS[c.id as WeaponId].name : isP ? PASSIVES[c.id as PassiveId].name : c.kind === 'heal' ? 'Repair Kit' : 'Scrap Bonus'
                  const desc = isW ? WEAPONS[c.id as WeaponId].levels[c.lvl - 1] : isP ? PASSIVES[c.id as PassiveId].desc : c.kind === 'heal' ? 'Restore 40 HP' : '+200 score'
                  const color = isW ? WEAPONS[c.id as WeaponId].color : isP ? PASSIVES[c.id as PassiveId].color : c.kind === 'heal' ? '#4ade80' : '#fbbf24'
                  const pairNote = isP ? (Object.values(WEAPONS).find((d) => d.pair === c.id)?.name ?? '') : isW ? PASSIVES[WEAPONS[c.id as WeaponId].pair].name : ''
                  return (
                    <button key={`${c.id}-${i}`} type="button" className={`mech-card${isW ? ' is-weapon' : isP ? ' is-passive' : ''}`} onClick={() => choose(c)}>
                      <PartIcon id={c.id} color={color} />
                      <strong>
                        {name} {c.isNew ? <em>NEW</em> : c.lvl ? <em>Lv {c.lvl}</em> : null}
                      </strong>
                      <span>{desc}</span>
                      {pairNote ? <small>Evolves with {pairNote}</small> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {phase === 'crossroad' && (
            <div className="mech-upgrade mech-cross" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Victory!</h3>
              <p>The Overlord has fallen and your win is saved. Bank it now, or push on into endless mode.</p>
              <div className="mech-upgrade__list">
                <button type="button" className="mech-card is-endless" onClick={goEndless}>
                  <PartIcon id="lightning" color="#14b8a6" />
                  <strong>Endless mode</strong>
                  <span>Keep your build. Crystal Wastes, the Void Core and the Colossus titan await.</span>
                  <small>Win bonus kept · bosses every 3 minutes</small>
                </button>
                <button type="button" className="mech-card" onClick={claimVictory}>
                  <PartIcon id="gold" color="#f59e0b" />
                  <strong>Claim victory</strong>
                  <span>End the run now with the 10:00 bonus.</span>
                </button>
              </div>
            </div>
          )}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="mech"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to walk — your weapons fire on their own. Grab XP gems, level up, evolve your arsenal and survive 10 minutes — then dare endless mode."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={w0.endless ? 'Endless legend!' : w0.victory ? 'Victory!' : w0.t >= 300 ? 'Heroic stand!' : 'Mech down'}
            subtitle={`Survived ${fmt(w0.t)} · ${w0.stats.kills} kills · Lv ${w0.level}`}
            celebrate={w0.victory || w0.t >= 300}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
