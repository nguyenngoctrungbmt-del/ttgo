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
import { useProgressStore } from '../../store/progressStore'
import '../../shared/action/action.css'
import { BIOMES, drawBehemoth, drawBolt, drawComet, drawPrism, drawSky, drawUfo, makeMotes, stepMotes } from './content'

const meta = getGame('orbit')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Kind = 'rock' | 'fast' | 'heavy' | 'split' | 'heal' | 'comet' | 'bolt' | 'boss' | 'prism'

type Meteor = {
  kind: Kind
  a: number
  d: number
  speed: number
  r: number
  hp: number
  spin: number
  rot: number
  knock: number
  verts: number[]
  /** Angular drift (rad/s): spiral comets and the Behemoth curve in. */
  w: number
  /** Raider that fired this bolt (-1 = none). */
  src: number
}

type Ufo = { id: number; a: number; d: number; dir: number; hp: number; maxHp: number; charge: number; cool: number; hurt: number; life: number }
type Zap = { x: number; y: number; ufo: number; life: number }

type Crater = { a: number; r: number }

const KIND_COLOR: Record<Kind, string> = {
  rock: '#d6d3d1',
  fast: '#f87171',
  heavy: '#a78bfa',
  split: '#fbbf24',
  heal: '#4ade80',
  comet: '#67e8f9',
  bolt: '#f43f5e',
  boss: '#f97316',
  prism: '#e879f9',
}
const BASE_HP = 5
const OVERDRIVE_AT = 20
const SHOWER_EVERY = 45
/** New-content schedule (seconds into a run). */
const BIOME_EVERY = 75
const PRISM_AT = 60
const COMET_AT = 95
const UFO_AT = 130
const BOSS_AT = 200
const BOSS_EVERY = 180
const TWIN_DUR = 8
const UFO_CHARGE = 1.2

type World = {
  shield: number
  target: number
  prevShield: number
  meteors: Meteor[]
  craters: Crater[]
  spawnTimer: number
  elapsed: number
  hp: number
  maxHp: number
  /** Shield half-width in radians (upgradable). */
  halfW: number
  overdriveLen: number
  inv: number
  showerTimer: number
  showerWarn: number
  shower: number
  showerA: number
  showerTick: number
  nextMinute: number
  best: number
  bestShown: boolean
  combo: number
  overdrive: number
  shieldFlash: number
  planetRot: number
  score: number
  stars: { x: number; y: number; z: number }[]
  stats: { score: number; blocks: number; combo: number; time: number }
  biome: number
  prevBiome: number
  blend: number
  nextBiome: number
  ufos: Ufo[]
  zaps: Zap[]
  ufoT: number
  ufoId: number
  bossT: number
  bossWarn: number
  bossA: number
  bossN: number
  bossMax: number
  twin: number
  seen: Record<string, boolean>
}

function freshWorld(): World {
  return {
    shield: -Math.PI / 2,
    target: -Math.PI / 2,
    prevShield: -Math.PI / 2,
    meteors: [],
    craters: [],
    spawnTimer: 1,
    elapsed: 0,
    hp: BASE_HP,
    maxHp: BASE_HP,
    halfW: 0.44,
    overdriveLen: 6,
    inv: 0,
    showerTimer: SHOWER_EVERY,
    showerWarn: 0,
    shower: 0,
    showerA: 0,
    showerTick: 0,
    nextMinute: 60,
    best: 0,
    bestShown: false,
    combo: 0,
    overdrive: 0,
    shieldFlash: 0,
    planetRot: 0,
    score: 0,
    stars: Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: rand(0.2, 1) })),
    stats: { score: 0, blocks: 0, combo: 0, time: 0 },
    biome: 0,
    prevBiome: 0,
    blend: 1,
    nextBiome: BIOME_EVERY,
    ufos: [],
    zaps: [],
    ufoT: 0,
    ufoId: 1,
    bossT: BOSS_AT,
    bossWarn: 0,
    bossA: 0,
    bossN: 0,
    bossMax: 6,
    twin: 0,
    seen: {},
  }
}

function angDiff(a: number, b: number) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return d
}

function makeMeteor(kind: Kind, a: number, d: number, speed: number): Meteor {
  const r = kind === 'heavy' ? 17 : kind === 'fast' ? 8 : kind === 'split' ? 13 : kind === 'boss' ? 30 : kind === 'bolt' ? 6 : kind === 'comet' ? 9 : kind === 'prism' ? 11 : 11
  return {
    kind,
    a,
    d,
    speed: kind === 'fast' ? speed * 1.7 : kind === 'heavy' ? speed * 0.7 : kind === 'comet' ? speed * 0.85 : kind === 'prism' ? speed * 0.8 : speed,
    r,
    hp: kind === 'heavy' ? 2 : 1,
    w: kind === 'comet' ? rand(0.5, 0.8) * (Math.random() < 0.5 ? -1 : 1) : 0,
    src: -1,
    spin: rand(-3, 3),
    rot: rand(0, 6.28),
    knock: 0,
    verts: Array.from({ length: kind === 'boss' ? 13 : 9 }, () => rand(kind === 'boss' ? 0.85 : 0.75, 1.1)),
  }
}

export default function OrbitGame() {
  const run = useActionRun('orbit')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 520 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const keys = useRef({ left: false, right: false })
  const motes = useRef(makeMotes(40)).current
  const bannerQ = useRef<{ text: string; sub?: string }[]>([])
  const lastBanner = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, hp: BASE_HP, max: BASE_HP, combo: 0, time: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function geo() {
    const { w: W, h: H } = size.current
    const R = Math.max(28, Math.min(W, H) * 0.13)
    return { cx: W / 2, cy: H * 0.54, R, SR: R + 40 }
  }

  /** Show a banner; queue it while another one is still on screen. */
  function showBanner(text: string, sub?: string) {
    const now = performance.now()
    if (now - lastBanner.current < 1350) {
      if (bannerQ.current.length < 3) bannerQ.current.push({ text, sub })
      return
    }
    lastBanner.current = now
    setBanner({ key: now + Math.random(), text, sub })
  }

  function flushBanners() {
    if (!bannerQ.current.length || performance.now() - lastBanner.current < 1350) return
    const b = bannerQ.current.shift()!
    showBanner(b.text, b.sub)
  }

  function intro(key: string, text: string, sub: string) {
    const w = world.current
    if (w.seen[key]) return
    w.seen[key] = true
    showBanner(text, sub)
    sfx.ready()
    haptic.medium()
  }

  function bossAlive() {
    return world.current.meteors.some((m) => m.kind === 'boss')
  }

  function spawnUfo() {
    const w = world.current
    w.ufos.push({ id: w.ufoId++, a: rand(0, Math.PI * 2), d: Math.hypot(size.current.w, size.current.h) * 0.6, dir: Math.random() < 0.5 ? -1 : 1, hp: 3, maxHp: 3, charge: 0, cool: 2.2, hurt: 0, life: 36 })
    intro('ufo', 'RAIDER UFO', 'reflect its bolts back at it')
    sfx.whoosh()
  }

  function startBoss() {
    const w = world.current
    w.bossWarn = 2.6
    w.bossA = rand(0, Math.PI * 2)
    w.bossT = Infinity
    showBanner('BEHEMOTH!', `block it ${6 + w.bossN * 2} times`)
    // Sting: low rumble, then a menacing hit and clang.
    sfx.boom(0.9)
    window.setTimeout(() => sfx.hurt(), 260)
    window.setTimeout(() => sfx.clang(), 560)
    fx.shake(8, 0.6)
    haptic.heavy()
  }

  function ufoDown(u: Ufo, x: number, y: number) {
    const w = world.current
    const pts = 150 * (1 + Math.floor(w.combo / 10))
    w.score += pts
    w.stats.score = w.score
    fx.explode(x, y, 1.3, ['#5eead4', '#e2e8f0', '#fde047', '#ffffff'])
    fx.text(x, y - 20, `RAIDER +${pts}`, '#5eead4', 18)
    fx.stop(0.08)
    sfx.boom(0.6)
    sfx.levelUp()
    haptic.success()
    w.ufos = w.ufos.filter((o) => o !== u)
    w.ufoT = rand(24, 32)
    run.update(w.stats)
    pushHud()
  }

  function bossDown(m: Meteor, x: number, y: number) {
    const w = world.current
    w.bossN += 1
    w.bossT = w.elapsed + BOSS_EVERY
    const pts = 300 + w.bossN * 200
    w.score += pts
    w.stats.score = w.score
    const heal = Math.min(2, w.maxHp - w.hp)
    w.hp += heal
    w.inv = Math.max(w.inv, 1.5)
    for (let i = 0; i < 3; i++) fx.explode(x + rand(-20, 20), y + rand(-20, 20), 1.6, ['#fde047', '#f97316', '#a8a29e', '#ffffff'])
    fx.ring(x, y, { color: '#f97316', maxR: 220, life: 0.8, width: 8 })
    fx.text(x, y - 30, `+${pts}`, '#fde047', 26)
    fx.flash('#fde047', 0.3)
    fx.slowmo(0.9, 0.3)
    fx.shake(16, 0.6)
    sfx.boom(1)
    window.setTimeout(() => sfx.win(), 250)
    haptic.success()
    showBanner('BEHEMOTH SHATTERED', heal > 0 ? `+${pts} · +${heal} HP` : `+${pts} points`)
    void trackEvent('action_milestone', { game_id: 'orbit', kind: 'boss', value: w.bossN })
    m.d = -999
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.maxHp = BASE_HP + run.level('core')
    w.hp = w.maxHp
    w.halfW = 0.44 * (1 + run.level('wide') * 0.08)
    w.overdriveLen = 6 + run.level('surge') * 1.5
    w.best = useProgressStore.getState().games.orbit?.bestScore ?? 0
    w.bestShown = w.best < 200
    world.current = w
    fx.reset()
    bannerQ.current = []
    lastBanner.current = 0
    setHud({ score: 0, hp: w.hp, max: w.maxHp, combo: 0, time: 0 })
    run.begin()
    setPhaseBoth('play')
    showBanner('DEFEND!', 'drag to swing the shield')
    sfx.ready()
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, hp: w.hp, max: w.maxHp, combo: w.combo, time: Math.floor(w.elapsed) })
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    const { cx, cy } = geo()
    fx.explode(cx, cy, 3, ['#fde047', '#f97316', '#ef4444', '#60a5fa'])
    fx.slowmo(1.2, 0.25)
    sfx.boom(1)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      w.stats.time = Math.floor(w.elapsed)
      setPhaseBoth('over')
      const coins = Math.round(w.score / 60 + w.elapsed / 8 + w.stats.combo / 10)
      run.end({ score: w.score, cleared: w.elapsed >= 60, stats: { ...w.stats, score: w.score }, coins }, revive)
    }, 1400)
  }

  /** Ad revive: planet patched to 3 HP, incoming meteors vaporised, brief invulnerability. */
  function revive() {
    const w = world.current
    const { cx, cy } = geo()
    for (const m of w.meteors) {
      fx.burst(cx + Math.cos(m.a) * m.d, cy + Math.sin(m.a) * m.d, { count: 8, color: [KIND_COLOR[m.kind], '#fff'], speed: 150, gravity: 0 })
    }
    w.meteors = []
    w.hp = Math.min(w.maxHp, 3)
    w.inv = 2.5
    w.spawnTimer = 1.5
    w.shower = 0
    w.showerWarn = 0
    w.showerTimer = Math.max(w.showerTimer, 15)
    w.zaps = []
    w.bossWarn = 0
    if (w.bossT === Infinity) w.bossT = w.elapsed + 60
    for (const u of w.ufos) {
      u.charge = 0
      u.cool = 3
    }
    bannerQ.current = []
    lastBanner.current = 0
    fx.ring(cx, cy, { color: '#7dd3fc', maxR: Math.max(size.current.w, size.current.h) * 0.6, life: 0.7, width: 6 })
    pushHud()
    showBanner('REVIVED!', 'planet shielded')
    setPhaseBoth('play')
  }

  function spawn() {
    const w = world.current
    const { w: W, h: H } = size.current
    const far = Math.hypot(W, H) * 0.55
    const lvl = w.elapsed / 30
    const speed = 85 + Math.min(150, w.elapsed * 0.9)
    const pattern = Math.random()
    const pickKind = (): Kind => {
      const r = Math.random()
      if (w.elapsed > 15 && r < 0.08 && w.hp < w.maxHp) return 'heal'
      if (w.elapsed > PRISM_AT && w.twin <= 0 && r > 0.955) return 'prism'
      if (w.elapsed > COMET_AT && r > 0.87 - Math.min(0.08, (w.elapsed - COMET_AT) / 900)) return 'comet'
      if (w.elapsed > 25 && r < 0.2) return 'heavy'
      if (w.elapsed > 10 && r < 0.36) return 'fast'
      if (w.elapsed > 35 && r < 0.48) return 'split'
      return 'rock'
    }
    if (lvl > 0.6 && pattern < 0.18) {
      // Pincer: two meteors from opposite sides.
      const a = rand(0, Math.PI * 2)
      w.meteors.push(makeMeteor('rock', a, far, speed))
      w.meteors.push(makeMeteor('rock', a + Math.PI, far + 40, speed))
    } else if (lvl > 0.3 && pattern < 0.34) {
      // Stream: a line from one direction.
      const a = rand(0, Math.PI * 2)
      for (let i = 0; i < 3; i++) {
        const k = pickKind()
        w.meteors.push(makeMeteor(k === 'heal' || k === 'prism' || k === 'comet' ? 'rock' : k, a + rand(-0.15, 0.15), far + i * 55, speed))
      }
    } else {
      const k = pickKind()
      w.meteors.push(makeMeteor(k, rand(0, Math.PI * 2), far, speed))
      if (k === 'comet') intro('comet', 'SPIRAL COMETS', 'they curve — follow the dots')
      if (k === 'prism') intro('prism', 'PRISM CRYSTAL', 'block it for a twin shield')
    }
    w.spawnTimer = Math.max(0.42, 1.35 - w.elapsed * 0.006) * rand(0.8, 1.2)
  }

  function block(m: Meteor, x: number, y: number) {
    const w = world.current
    w.shieldFlash = 0.12
    const out = m.a
    if (m.kind === 'heal') {
      // Blocking a healer wastes it.
      fx.burst(x, y, { count: 10, color: '#4ade80', speed: 140 })
      fx.text(x, y - 16, 'wasted', '#86efac', 14)
      sfx.miss()
      w.combo = 0
      pushHud()
      return true
    }
    if (m.kind === 'prism') {
      w.twin = TWIN_DUR
      fx.ring(x, y, { color: '#e879f9', maxR: 120, life: 0.5, width: 5 })
      fx.burst(x, y, { count: 22, color: ['#f0abfc', '#67e8f9', '#ffffff'], speed: 260, gravity: 0, shape: 'spark' })
      showBanner('TWIN SHIELD', `${TWIN_DUR} s of double cover`)
      sfx.power()
      haptic.success()
    }
    if (m.kind === 'bolt') {
      // Reflect the plasma bolt back at the raider that fired it.
      w.zaps.push({ x, y, ufo: m.src, life: 1.2 })
      sfx.shoot()
    }
    m.hp -= 1
    if (m.hp > 0 && m.kind === 'boss') {
      m.knock = 0.4
      m.d += 18
      fx.burst(x, y, { count: 18, color: ['#f97316', '#a8a29e', '#fff'], speed: 260, angle: out, spread: 1.6, shape: 'spark', gravity: 0 })
      fx.shake(9, 0.25)
      fx.stop(0.08)
      sfx.clang()
      sfx.boom(0.35)
      haptic.heavy()
      // Chips break off and dive at the planet from either side.
      for (const da of [-0.55, 0.55]) {
        const chip = makeMeteor('rock', m.a + da, m.d + 20, 70 + Math.min(40, w.elapsed * 0.1))
        chip.r = 7
        w.meteors.push(chip)
      }
      w.score += 40
      w.stats.score = w.score
      fx.text(x, y - 24, `${m.hp} left`, '#fdba74', 16)
      pushHud()
      return false
    }
    if (m.hp > 0) {
      m.knock = 0.35
      m.d += 22
      fx.burst(x, y, { count: 10, color: [KIND_COLOR[m.kind], '#fff'], speed: 200, angle: out, spread: 1.4, shape: 'spark', gravity: 0 })
      fx.shake(5, 0.15)
      fx.stop(0.05)
      sfx.clang()
      haptic.medium()
      return false
    }
    w.combo += 1
    w.stats.blocks += 1
    w.stats.combo = Math.max(w.stats.combo, w.combo)
    const mult = 1 + Math.floor(w.combo / 10)
    if (m.kind === 'boss') {
      bossDown(m, x, y)
      run.update(w.stats)
      pushHud()
      return true
    }
    const pts = (m.kind === 'heavy' ? 30 : m.kind === 'comet' ? 25 : m.kind === 'fast' || m.kind === 'bolt' ? 20 : m.kind === 'prism' ? 15 : 10) * mult
    w.score += pts
    w.stats.score = w.score
    fx.burst(x, y, { count: 14, color: [KIND_COLOR[m.kind], '#ffffff', '#7dd3fc'], speed: 260, angle: out, spread: 1.6, shape: 'spark', gravity: 0, drag: 2 })
    fx.burst(x, y, { count: 6, color: KIND_COLOR[m.kind], speed: 90, size: 4, shape: 'square', gravity: 0, life: 0.8 })
    fx.text(x + Math.cos(out) * 20, y + Math.sin(out) * 20, `+${pts}`, mult > 1 ? '#fde047' : '#fff', 14 + Math.min(mult, 4) * 2)
    fx.shake(m.kind === 'heavy' ? 6 : 2.5, 0.12)
    fx.stop(m.kind === 'heavy' ? 0.07 : 0.025)
    sfx.score(Math.min(w.combo, 10))
    haptic.light()
    if (m.kind === 'split') {
      for (const da of [-0.5, 0, 0.5]) {
        const child = makeMeteor('rock', m.a + da, m.d + 60, m.speed * 0.9)
        child.r = 7
        w.meteors.push(child)
      }
      sfx.pop()
    }
    if (w.combo > 0 && w.combo % OVERDRIVE_AT === 0) {
      w.overdrive = w.overdriveLen
      showBanner('OVERDRIVE', `${w.combo} combo`)
      fx.flash('#7dd3fc', 0.25)
      sfx.combo()
      haptic.success()
    } else if (w.combo % 10 === 0) {
      sfx.combo()
    }
    run.update(w.stats)
    if (!w.bestShown && w.score > w.best) {
      w.bestShown = true
      showBanner('NEW BEST!', `beat ${w.best}`)
      sfx.levelUp()
    }
    pushHud()
    return true
  }

  function planetHit(m: Meteor, x: number, y: number) {
    const w = world.current
    const { R } = geo()
    if (m.kind === 'heal') {
      w.hp = Math.min(w.maxHp, w.hp + 1)
      fx.ring(x, y, { color: '#4ade80', maxR: R * 1.6, life: 0.5, width: 5 })
      fx.text(x, y - 20, '+1 HP', '#86efac', 20)
      sfx.power()
      haptic.success()
      pushHud()
      return
    }
    if (m.kind === 'prism') {
      fx.burst(x, y, { count: 12, color: ['#f0abfc', '#ffffff'], speed: 140, gravity: 0 })
      fx.text(x, y - 16, 'missed', '#f0abfc', 14)
      sfx.miss()
      return
    }
    if (m.kind === 'boss') {
      w.bossT = w.elapsed + BOSS_EVERY * 0.6
      showBanner('BEHEMOTH CRASHED', 'it will be back')
    }
    if (w.inv > 0) {
      fx.burst(x, y, { count: 10, color: ['#7dd3fc', '#fff'], speed: 160, gravity: 0 })
      fx.ring(x, y, { color: '#7dd3fc', maxR: 30, life: 0.3 })
      sfx.clang()
      return
    }
    const dmg = m.kind === 'heavy' || m.kind === 'boss' ? 2 : 1
    w.hp -= dmg
    w.combo = 0
    w.craters.push({ a: m.a - w.planetRot, r: m.r * 0.7 })
    if (w.craters.length > 14) w.craters.shift()
    fx.explode(x, y, m.kind === 'boss' ? 2.2 : m.kind === 'heavy' ? 1.4 : 0.9)
    fx.flash('#ef4444', 0.25)
    fx.shake(12, 0.35)
    fx.stop(0.1)
    sfx.boom(0.7)
    sfx.hurt()
    haptic.heavy()
    pushHud()
    if (w.hp <= 0 && phaseRef.current === 'play') die()
  }

  function aimAt(e: PointerEvent<HTMLDivElement>) {
    const p = localPoint(e, e.currentTarget)
    const { cx, cy } = geo()
    if (Math.hypot(p.x - cx, p.y - cy) > 10) world.current.target = Math.atan2(p.y - cy, p.x - cx)
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    aimAt(e)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play' || e.buttons === 0) return
    aimAt(e)
  }

  useEffect(() => {
    if (!import.meta.env.DEV) return
    // Dev-only hooks so screenshots can reach late-run content.
    const win = window as unknown as Record<string, unknown>
    win.__orbit = world
    win.__en3skip = (seconds: number) => {
      const w = world.current
      w.elapsed += seconds
      w.inv = Math.max(w.inv, 5)
    }
    win.__en3force = (kind: string) => {
      const w = world.current
      const { w: W, h: H } = size.current
      const far = Math.hypot(W, H) * 0.42
      if (kind === 'ufo') spawnUfo()
      else if (kind === 'boss') w.bossT = w.elapsed
      else if (kind === 'biome') w.nextBiome = w.elapsed
      else if (kind === 'god') w.inv = 9999
      else if (kind === 'comet' || kind === 'prism') w.meteors.push(makeMeteor(kind, w.shield + 0.6, far, 90))
    }
  }, [])

  useEffect(() => {
    function set(e: KeyboardEvent, v: boolean) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.left = v
      if (e.key === 'ArrowRight' || e.key === 'd') keys.current.right = v
    }
    const down = (e: KeyboardEvent) => set(e, true)
    const up = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  /** Biome rotation, raider spawns, Behemoth boss and the twin-shield timer. */
  function runContent(dt: number) {
    const w = world.current
    const { w: W, h: H } = size.current
    flushBanners()
    if (w.blend < 1) w.blend = Math.min(1, w.blend + dt / 2.5)
    if (w.elapsed >= w.nextBiome) {
      w.nextBiome += BIOME_EVERY
      w.prevBiome = w.biome
      w.biome = (w.biome + 1) % BIOMES.length
      w.blend = 0
      showBanner(BIOMES[w.biome].name, BIOMES[w.biome].sub)
      sfx.whoosh()
    }
    w.twin = Math.max(0, w.twin - dt)
    if (w.elapsed >= UFO_AT) {
      w.ufoT -= dt
      const cap = w.elapsed > 300 ? 2 : 1
      if (w.ufoT <= 0 && w.ufos.length < cap && w.bossT !== Infinity) {
        spawnUfo()
        w.ufoT = rand(26, 34)
      }
    }
    if (w.elapsed >= w.bossT && w.shower <= 0 && w.showerWarn <= 0) startBoss()
    if (w.bossWarn > 0) {
      w.bossWarn -= dt
      if (w.bossWarn <= 0) {
        const b = makeMeteor('boss', w.bossA, Math.hypot(W, H) * 0.55 + 40, 46 + w.bossN * 4)
        b.hp = 6 + w.bossN * 2
        b.spin = 0.4
        w.bossMax = b.hp
        w.meteors.push(b)
      }
    }
  }

  /** Raider saucers orbit, charge (telegraphed aim line) and fire bolts; reflected bolts home back. */
  function stepRaiders(dt: number, cx: number, cy: number, SR: number) {
    const w = world.current
    const { w: W, h: H } = size.current
    const ud = Math.max(SR + 50, Math.min(W, H) * 0.5 - 24)
    const away = Math.hypot(W, H) * 0.7
    for (const u of w.ufos) {
      u.life -= dt
      u.hurt = Math.max(0, u.hurt - dt)
      const target = u.life > 0 ? ud : away
      u.d += (target - u.d) * Math.min(1, dt * 1.6)
      u.a += u.dir * (u.charge > 0 ? 0.12 : 0.35) * dt
      if (u.life <= 0) {
        u.charge = 0
        continue
      }
      if (u.charge > 0) {
        u.charge -= dt
        if (u.charge <= 0) {
          const bolt = makeMeteor('bolt', u.a, u.d - 12, 150 + Math.min(60, w.elapsed * 0.08))
          bolt.src = u.id
          w.meteors.push(bolt)
          u.cool = rand(3, 4.2)
          sfx.shoot()
        }
      } else if (Math.abs(u.d - ud) < 8) {
        u.cool -= dt
        if (u.cool <= 0) {
          u.charge = UFO_CHARGE
          sfx.tick()
        }
      }
    }
    w.ufos = w.ufos.filter((u) => u.life > 0 || u.d < away - 20)
    for (const z of w.zaps) {
      z.life -= dt
      const u = w.ufos.find((o) => o.id === z.ufo)
      const step = 560 * dt
      if (!u) {
        // Nothing to hit: fly off into space.
        const d = Math.hypot(z.x - cx, z.y - cy) || 1
        z.x += ((z.x - cx) / d) * step
        z.y += ((z.y - cy) / d) * step
        continue
      }
      const ux = cx + Math.cos(u.a) * u.d
      const uy = cy + Math.sin(u.a) * u.d
      const dx = ux - z.x
      const dy = uy - z.y
      const d = Math.hypot(dx, dy)
      if (d <= step + 10) {
        z.life = 0
        u.hp -= 1
        u.hurt = 0.15
        fx.burst(ux, uy, { count: 14, color: ['#67e8f9', '#ffffff'], speed: 220, gravity: 0, shape: 'spark' })
        sfx.hit()
        haptic.medium()
        if (u.hp <= 0) ufoDown(u, ux, uy)
        else fx.text(ux, uy - 20, 'HIT!', '#67e8f9', 15)
      } else {
        z.x += (dx / d) * step
        z.y += (dy / d) * step
      }
    }
    w.zaps = w.zaps.filter((z) => z.life > 0)
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const ph = phaseRef.current
    const { cx, cy, R, SR } = geo()
    const half = w.overdrive > 0 ? w.halfW * 1.93 : w.halfW

    if (ph === 'play') {
      w.elapsed += dt
      if (Math.floor(w.elapsed) !== hud.time) pushHud()
      w.inv = Math.max(0, w.inv - dt)
      const sec = Math.floor(w.elapsed)
      if (sec !== w.stats.time) {
        w.stats.time = sec
        run.update(w.stats)
      }
      if (w.elapsed >= w.nextMinute) {
        const mins = w.nextMinute / 60
        showBanner(`${mins}:00 SURVIVED`, mins >= 3 ? 'legendary defender' : 'meteors get faster')
        sfx.levelUp()
        haptic.success()
        void trackEvent('action_milestone', { game_id: 'orbit', kind: 'minute', value: mins })
        w.nextMinute += 60
      }
      // Meteor shower event: telegraphed arc, then a dense stream that slowly sweeps around.
      const bossBusy = w.bossWarn > 0 || w.bossT - w.elapsed < 8 || bossAlive()
      if (w.shower <= 0 && w.showerWarn <= 0) {
        if (!bossBusy) w.showerTimer -= dt
        if (w.showerTimer <= 0) {
          w.showerWarn = 1.6
          w.showerA = rand(0, Math.PI * 2)
          showBanner('METEOR SHOWER', 'watch the red arc')
          sfx.boom(0.3)
        }
      } else if (w.showerWarn > 0) {
        w.showerWarn -= dt
        if (w.showerWarn <= 0) {
          w.shower = 6
          w.showerTick = 0
        }
      } else {
        w.shower -= dt
        w.showerA += dt * 0.35
        w.showerTick -= dt
        if (w.showerTick <= 0) {
          const far = Math.hypot(W, H) * 0.55
          w.meteors.push(makeMeteor('rock', w.showerA + rand(-0.35, 0.35), far, 110 + Math.min(80, w.elapsed * 0.4)))
          w.showerTick = 0.22
        }
        if (w.shower <= 0) w.showerTimer = SHOWER_EVERY
      }
      w.spawnTimer -= dt * (w.shower > 0 ? 0.35 : 1) * (bossBusy && w.bossT === Infinity ? 0.45 : 1)
      if (w.spawnTimer <= 0) spawn()
      runContent(dt)
      if (keys.current.left) w.target -= 5.5 * dt
      if (keys.current.right) w.target += 5.5 * dt
      w.overdrive = Math.max(0, w.overdrive - dt)
    } else if (ph === 'idle') {
      w.target += dt * 1.2
      w.spawnTimer -= dt
      if (w.spawnTimer <= 0) {
        w.meteors.push(makeMeteor('rock', rand(0, 6.28), Math.hypot(W, H) * 0.55, 80))
        w.spawnTimer = 1.2
      }
    }
    w.prevShield = w.shield
    w.shield += angDiff(w.shield, w.target) * Math.min(1, raw * 28)
    w.shieldFlash = Math.max(0, w.shieldFlash - raw)
    w.planetRot += dt * 0.15

    for (const m of w.meteors) {
      m.rot += m.spin * dt
      if (m.knock > 0) {
        m.knock -= dt
        m.d += 140 * dt
        continue
      }
      const prevD = m.d
      m.d -= m.speed * dt
      // Spiral comets curve in; the Behemoth sways from side to side.
      if (m.kind === 'boss') m.w = Math.sin(w.elapsed * 0.7) * 0.22
      if (m.w && m.d > SR - 10) m.a += m.w * dt
      if (ph === 'dying' || ph === 'over') continue
      const x = cx + Math.cos(m.a) * m.d
      const y = cy + Math.sin(m.a) * m.d
      // Crossing the shield ring this frame?
      if (prevD > SR - 4 && m.d <= SR + m.r && ph !== 'idle') {
        let off = Math.abs(angDiff(w.shield, m.a))
        if (w.twin > 0 && m.kind !== 'heal') off = Math.min(off, Math.abs(angDiff(w.shield + Math.PI, m.a)))
        if (off < half + m.r / SR) {
          if (block(m, x, y)) m.d = -999
          continue
        }
      } else if (ph === 'idle' && m.d <= SR + m.r && Math.abs(angDiff(w.shield, m.a)) < half) {
        fx.burst(x, y, { count: 8, color: '#fff', speed: 160, angle: m.a, spread: 1.4, shape: 'spark', gravity: 0 })
        m.d = -999
        continue
      }
      if (m.d <= R + m.r * 0.5 && m.d > -900) {
        if (ph === 'play') planetHit(m, x, y)
        else fx.burst(x, y, { count: 6, color: '#fca5a5', speed: 100 })
        m.d = -999
      }
    }
    w.meteors = w.meteors.filter((m) => m.d > -900)
    if (ph === 'play') stepRaiders(dt, cx, cy, SR)

    // ── Draw ─────────────────────────────────────
    // Sky: current biome cross-fading over the previous one.
    const bNow = BIOMES[w.biome]
    stepMotes(motes, bNow.mote, raw)
    if (w.blend < 1) drawSky(ctx, BIOMES[w.prevBiome], W, H, t, 1, w.stars, motes)
    drawSky(ctx, bNow, W, H, t, w.blend, w.stars, motes)
    glow(ctx, cx, cy, R * 4, bNow.halo, 0.25)

    fx.applyShake(ctx)

    // Behemoth incoming: pulsing orange arc where it will appear.
    if (w.bossWarn > 0) {
      ctx.strokeStyle = `rgba(249,115,22,${0.5 + Math.sin(t * 18) * 0.35})`
      ctx.lineWidth = 12
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(cx, cy, SR + 66, w.bossA - 0.32, w.bossA + 0.32)
      ctx.stroke()
      const ax = cx + Math.cos(w.bossA) * (SR + 92)
      const ay = cy + Math.sin(w.bossA) * (SR + 92)
      ctx.fillStyle = '#fdba74'
      ctx.save()
      ctx.translate(ax, ay)
      ctx.rotate(w.bossA + Math.PI)
      ctx.beginPath()
      ctx.moveTo(10, 0)
      ctx.lineTo(-6, -8)
      ctx.lineTo(-6, 8)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    if (w.showerWarn > 0 || w.shower > 0) {
      const warn = w.showerWarn > 0
      ctx.strokeStyle = warn ? `rgba(239,68,68,${0.4 + Math.sin(t * 20) * 0.3})` : 'rgba(239,68,68,0.25)'
      ctx.lineWidth = warn ? 8 : 5
      ctx.beginPath()
      ctx.arc(cx, cy, SR + 62, w.showerA - 0.45, w.showerA + 0.45)
      ctx.stroke()
    }

    // Danger hint: faint wedge showing where the next meteor comes from.
    for (const m of w.meteors) {
      if (m.d > Math.hypot(W, H) * 0.42 && ph === 'play') {
        const ex = cx + Math.cos(m.a) * (SR + 46)
        const ey = cy + Math.sin(m.a) * (SR + 46)
        ctx.globalAlpha = 0.35 + Math.sin(t * 12) * 0.2
        ctx.fillStyle = KIND_COLOR[m.kind]
        ctx.beginPath()
        ctx.arc(ex, ey, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    // Planet
    if (!(ph === 'over' && w.hp <= 0)) {
      ctx.save()
      ctx.translate(cx, cy)
      const pg = ctx.createRadialGradient(-R * 0.35, -R * 0.35, R * 0.1, 0, 0, R)
      const dmg = 1 - Math.max(0, w.hp) / w.maxHp
      pg.addColorStop(0, `hsl(${200 - dmg * 180} 80% 65%)`)
      pg.addColorStop(1, `hsl(${215 - dmg * 200} 75% 30%)`)
      ctx.fillStyle = pg
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      ctx.fill()
      ctx.save()
      ctx.clip()
      ctx.rotate(w.planetRot)
      ctx.fillStyle = 'rgba(74,222,128,0.55)'
      ctx.beginPath()
      ctx.ellipse(-R * 0.3, -R * 0.2, R * 0.45, R * 0.28, 0.4, 0, Math.PI * 2)
      ctx.ellipse(R * 0.4, R * 0.35, R * 0.3, R * 0.2, -0.3, 0, Math.PI * 2)
      ctx.fill()
      for (const c of w.craters) {
        ctx.fillStyle = 'rgba(30,20,10,0.55)'
        ctx.beginPath()
        ctx.arc(Math.cos(c.a) * R * 0.8, Math.sin(c.a) * R * 0.8, c.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
      ctx.strokeStyle = 'rgba(191,219,254,0.6)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, R + 1, 0, Math.PI * 2)
      ctx.stroke()
      // night-side shading
      const shade = ctx.createLinearGradient(-R, -R, R, R)
      shade.addColorStop(0.45, 'rgba(0,0,0,0)')
      shade.addColorStop(1, 'rgba(2,6,23,0.55)')
      ctx.fillStyle = shade
      ctx.beginPath()
      ctx.arc(0, 0, R, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.beginPath()
      ctx.ellipse(-R * 0.4, -R * 0.45, R * 0.28, R * 0.13, -0.6, 0, Math.PI * 2)
      ctx.fill()
      if (w.inv > 0 && ph === 'play') {
        ctx.strokeStyle = `rgba(125,211,252,${0.4 + Math.sin(t * 10) * 0.25})`
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(0, 0, R + 10, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }

    // Orbit ring guide
    ctx.strokeStyle = 'rgba(148,163,184,0.15)'
    ctx.setLineDash([4, 8])
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, SR, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // Meteors
    for (const m of w.meteors) {
      const x = cx + Math.cos(m.a) * m.d
      const y = cy + Math.sin(m.a) * m.d
      if (m.kind === 'comet') {
        // Preview dots along the curve it will follow.
        ctx.fillStyle = '#a5f3fc'
        for (let k = 1; k <= 5; k++) {
          const fd = m.d - m.speed * k * 0.2
          if (fd < SR) break
          const fa = m.a + m.w * k * 0.2
          ctx.globalAlpha = 0.55 - k * 0.08
          ctx.beginPath()
          ctx.arc(cx + Math.cos(fa) * fd, cy + Math.sin(fa) * fd, 2.4, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        const ta = m.a - m.w * 0.35
        const td = m.d + 40
        drawComet(ctx, x, y, m.r, cx + Math.cos(ta) * td, cy + Math.sin(ta) * td)
        continue
      }
      if (m.kind === 'bolt') {
        drawBolt(ctx, x, y, m.r, -Math.cos(m.a), -Math.sin(m.a), false)
        continue
      }
      if (m.kind === 'prism') {
        drawPrism(ctx, x, y, m.r, m.rot, t)
        continue
      }
      if (m.kind === 'boss') {
        drawBehemoth(ctx, x, y, m.r, m.rot, m.a + Math.PI, m.verts, t, m.knock > 0.38)
        continue
      }
      const color = KIND_COLOR[m.kind]
      // Tail
      const tail = m.kind === 'fast' ? 46 : 24
      const g = ctx.createLinearGradient(x, y, x + Math.cos(m.a) * tail, y + Math.sin(m.a) * tail)
      g.addColorStop(0, color)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.strokeStyle = g
      ctx.lineWidth = m.r * 1.2
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.5
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(m.a) * tail, y + Math.sin(m.a) * tail)
      ctx.stroke()
      ctx.globalAlpha = 1
      if (m.kind === 'heal') {
        glow(ctx, x, y, m.r * 2.4, '#4ade80', 0.6)
        const hg = ctx.createRadialGradient(x - m.r * 0.3, y - m.r * 0.3, 1, x, y, m.r * 1.1)
        hg.addColorStop(0, '#f0fdf4')
        hg.addColorStop(0.4, '#4ade80')
        hg.addColorStop(1, '#15803d')
        ctx.fillStyle = hg
        ctx.beginPath()
        ctx.arc(x, y, m.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(x - m.r * 0.18, y - m.r * 0.6, m.r * 0.36, m.r * 1.2)
        ctx.fillRect(x - m.r * 0.6, y - m.r * 0.18, m.r * 1.2, m.r * 0.36)
        continue
      }
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(m.rot)
      ctx.beginPath()
      m.verts.forEach((k, i) => {
        const a = (i / m.verts.length) * Math.PI * 2
        if (i === 0) ctx.moveTo(Math.cos(a) * m.r * k, Math.sin(a) * m.r * k)
        else ctx.lineTo(Math.cos(a) * m.r * k, Math.sin(a) * m.r * k)
      })
      ctx.closePath()
      if (m.knock > 0) ctx.fillStyle = '#fff'
      else {
        const mg = ctx.createRadialGradient(-m.r * 0.4, -m.r * 0.4, 1, 0, 0, m.r * 1.1)
        mg.addColorStop(0, '#ffffff')
        mg.addColorStop(0.35, color)
        mg.addColorStop(1, 'rgba(30,20,40,1)')
        ctx.fillStyle = mg
      }
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.beginPath()
      ctx.arc(m.r * 0.2, m.r * 0.15, m.r * 0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      if (m.kind === 'heavy' && m.hp > 1) {
        ctx.strokeStyle = '#ddd6fe'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, m.r + 4, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // Raiders: dashed aim line while charging, then the saucer itself.
    for (const u of w.ufos) {
      const ux = cx + Math.cos(u.a) * u.d
      const uy = cy + Math.sin(u.a) * u.d
      if (u.charge > 0 && ph === 'play') {
        ctx.strokeStyle = `rgba(244,63,94,${0.45 + Math.sin(t * 22) * 0.3})`
        ctx.lineWidth = 2.5
        ctx.setLineDash([6, 6])
        ctx.beginPath()
        ctx.moveTo(ux, uy)
        ctx.lineTo(cx + Math.cos(u.a) * (SR - 6), cy + Math.sin(u.a) * (SR - 6))
        ctx.stroke()
        ctx.setLineDash([])
      }
      drawUfo(ctx, ux, uy, 17, t, u.charge > 0 ? 1 - u.charge / UFO_CHARGE : 0, u.hurt, u.hp, u.maxHp)
    }
    for (const z of w.zaps) drawBolt(ctx, z.x, z.y, 5, 0, 0, true)

    // Twin shield (Prism power-up): a second arc opposite the main one.
    if (w.twin > 0 && ph === 'play' && (w.twin > 1.5 || Math.floor(t * 10) % 2 === 0)) {
      const ta = w.shield + Math.PI
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.3
      ctx.strokeStyle = '#e879f9'
      ctx.lineWidth = 16
      ctx.beginPath()
      ctx.arc(cx, cy, SR, ta - half, ta + half)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.lineWidth = 6
      ctx.beginPath()
      ctx.arc(cx, cy, SR, ta - half, ta + half)
      ctx.stroke()
      ctx.strokeStyle = '#fdf4ff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, SR - 1, ta - half * 0.85, ta + half * 0.85)
      ctx.stroke()
    }

    // Shield
    if (ph !== 'over' || w.hp > 0) {
      const swing = angDiff(w.prevShield, w.shield)
      // Motion smear behind the shield when swung hard.
      if (Math.abs(swing) > 0.02) {
        ctx.globalAlpha = Math.min(0.4, Math.abs(swing) * 3)
        ctx.strokeStyle = '#7dd3fc'
        ctx.lineWidth = 10
        ctx.beginPath()
        ctx.arc(cx, cy, SR, w.shield - half - swing * 3, w.shield + half - swing * 3)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      const od = w.overdrive > 0
      const col = w.shieldFlash > 0 ? '#ffffff' : od ? '#fde047' : '#38bdf8'
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.35
      ctx.strokeStyle = col
      ctx.lineWidth = 18
      ctx.beginPath()
      ctx.arc(cx, cy, SR, w.shield - half, w.shield + half)
      ctx.stroke()
      ctx.globalAlpha = 1
      ctx.lineWidth = 7
      ctx.beginPath()
      ctx.arc(cx, cy, SR, w.shield - half, w.shield + half)
      ctx.stroke()
      ctx.strokeStyle = '#e0f2fe'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, SR - 1, w.shield - half * 0.9, w.shield + half * 0.9)
      ctx.stroke()
    }

    fx.draw(ctx)
    ctx.restore()
    // Behemoth health bar.
    const boss = ph === 'play' ? w.meteors.find((m) => m.kind === 'boss') : undefined
    if (boss) {
      const bw = Math.min(240, W * 0.62)
      const bx = (W - bw) / 2
      const by = 86
      ctx.fillStyle = 'rgba(2,6,23,0.6)'
      ctx.fillRect(bx - 3, by - 3, bw + 6, 14)
      ctx.fillStyle = '#7c2d12'
      ctx.fillRect(bx, by, bw, 8)
      ctx.fillStyle = '#f97316'
      ctx.fillRect(bx, by, bw * clamp(boss.hp / w.bossMax, 0, 1), 8)
      ctx.fillStyle = '#fed7aa'
      ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText('BEHEMOTH', W / 2, by + 13)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  {hud.time}s{hud.combo >= 3 ? ` · combo ${hud.combo}` : ''}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hearts">
                  {'❤'.repeat(Math.max(0, hud.hp))}
                  <span style={{ opacity: 0.3 }}>{'❤'.repeat(Math.max(0, hud.max - hud.hp))}</span>
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
              game="orbit"
              icon={meta.icon}
              title={meta.title}
              hint="Drag around the planet to swing your shield. Block meteors — but let the green healers through!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.time >= 60 ? 'Planet held!' : 'Planet lost'}
            subtitle={`Score ${hud.score} · ${hud.time}s survived`}
            celebrate={hud.time >= 60}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
