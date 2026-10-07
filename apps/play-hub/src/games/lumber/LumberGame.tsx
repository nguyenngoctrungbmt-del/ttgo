import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, glow, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { useProgressStore } from '../../store/progressStore'
import { SEASONS, axeIcon, drawBranch, drawCone, drawJack, drawSeg, drawTreantFace, drawVine, flakeIcon, star, swapArrow, type Seg, type SegKind } from './art'
import '../../shared/action/action.css'

const meta = getGame('lumber')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Fly = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number; kind: 'log' | 'branch' | 'helmet'; seg: Seg; dir: number }
type Amb = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; s: number; c: string; ph: number }

const CHOPS_PER_LEVEL = 25
const CHOPS_PER_SEASON = 100
const SEG_COUNT = 12

type World = {
  segs: Seg[]
  side: -1 | 1
  swing: number
  drop: number
  time: number
  started: boolean
  chops: number
  score: number
  level: number
  season: number
  prevSeason: number
  seasonT: number
  heat: number
  fury: number
  freeze: number
  invuln: number
  helmets: number
  rush: number
  gen: number
  nextPower: number
  flies: Fly[]
  amb: Amb[]
  dead: '' | 'branch' | 'time'
  deadT: number
  blink: number
  demoT: number
  best: number
  bestShown: boolean
  stats: { chops: number; golden: number; powerups: number; level: number }
  /** Next generated segment must have no branch (keeps thorn vines fair). */
  forceGap: boolean
  cones: Cone[]
  coneT: number
  boss: Boss | null
  nextBoss: number
  bossKills: number
}

/** Pinecone dropping on one side: `t` counts down to impact, `dur` is the full warning time. */
type Cone = { side: -1 | 1; t: number; dur: number; rot: number }
type Boss = { hp: number; max: number; roar: number; roarT: number; volleyT: number; hurt: number; wave: number }

const VINE_LEVEL = 7
const CONE_LEVEL = 8
const FIRST_BOSS = 250
const BOSS_EVERY = 300
const BOSS_HP = 40

function freshWorld(): World {
  return {
    segs: [],
    side: -1,
    swing: 0,
    drop: 0,
    time: 0.75,
    started: false,
    chops: 0,
    score: 0,
    level: 1,
    season: 0,
    prevSeason: 0,
    seasonT: 0,
    heat: 0,
    fury: 0,
    freeze: 0,
    invuln: 0,
    helmets: 0,
    rush: 0,
    gen: 0,
    nextPower: 28,
    flies: [],
    amb: [],
    dead: '',
    deadT: 0,
    blink: 3,
    demoT: 0,
    best: 0,
    bestShown: false,
    stats: { chops: 0, golden: 0, powerups: 0, level: 1 },
    forceGap: false,
    cones: [],
    coneT: 3,
    boss: null,
    nextBoss: FIRST_BOSS,
    bossKills: 0,
  }
}

const STARS = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random() * 0.55, r: rand(0.6, 1.8), p: rand(0, 6) }))

export default function LumberGame() {
  const run = useActionRun('lumber')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, season: 0, helmets: 0, golden: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  const live = () => phaseRef.current === 'play'
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }
  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.level, season: w.season, helmets: w.helmets, golden: w.stats.golden })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const groundY = H - Math.max(64, H * 0.13)
    const TW = Math.min(W * 0.24, 92)
    const SH = TW * 0.72
    const stumpH = SH * 0.55
    const k = SH / 60
    return { W, H, groundY, TW, SH, stumpH, k, cx: W / 2 }
  }

  // ── Tree generation ───────────────────────────────────

  function genSeg(safe = false): Seg {
    const w = world.current
    w.gen += 1
    const prev = w.segs[w.segs.length - 1]
    const lvl = w.level
    let branch: -1 | 0 | 1 = 0
    let kind: SegKind = 'log'
    if (w.rush > 0 && !safe) return { branch: 0, kind: 'gold', hp: 1, dent: 0 }
    if (w.forceGap) {
      w.forceGap = false
      return { branch: 0, kind: 'log', hp: 1, dent: 0 }
    }
    // Thorn vine: swaps sides on every chop. Always sandwiched between gaps so it is never a trap.
    if (!safe && live() && lvl >= VINE_LEVEL && prev && prev.branch === 0 && Math.random() < Math.min(0.2, 0.1 + (lvl - VINE_LEVEL) * 0.01)) {
      w.forceGap = true
      return { branch: Math.random() < 0.5 ? -1 : 1, kind: 'flip', hp: 1, dent: 0 }
    }
    if (!safe) {
      const gapRule = lvl < 6
      const chance = Math.min(0.78, 0.5 + lvl * 0.03)
      if (!(gapRule && prev && prev.branch !== 0) && Math.random() < chance) {
        // Later levels like to flip sides, which forces fast switching.
        if (prev && prev.branch !== 0 && Math.random() < Math.min(0.7, lvl * 0.06)) branch = prev.branch === 1 ? -1 : 1
        else branch = Math.random() < 0.5 ? -1 : 1
      }
      if (live()) {
        if (lvl >= 3 && w.gen >= w.nextPower) {
          kind = Math.random() < 0.5 ? 'fury' : 'freeze'
          w.nextPower = w.gen + Math.round(rand(22, 34))
        } else if (lvl >= 5 && w.helmets < 3 && Math.random() < 0.02) kind = 'helmet'
        else if (lvl >= 2 && Math.random() < 0.06 + run.level('golden') * 0.025) kind = 'gold'
        else if (lvl >= 4 && Math.random() < Math.min(0.2, 0.06 + (lvl - 4) * 0.015)) kind = 'hard'
      }
    }
    return { branch, kind, hp: kind === 'hard' ? 2 : 1, dent: 0 }
  }

  function buildTree() {
    const w = world.current
    w.segs = []
    for (let i = 0; i < SEG_COUNT; i++) w.segs.push(genSeg(i < 5))
  }

  // ── Lifecycle ─────────────────────────────────────────

  function start() {
    void unlockAudio()
    const w = freshWorld()
    w.helmets = run.level('helmet')
    w.best = useProgressStore.getState().games.lumber?.bestScore ?? 0
    world.current = w
    buildTree()
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    pushHud()
    run.update(w.stats)
    say('CHOP!', 'tap left or right')
    sfx.ready()
  }

  function die(kind: 'branch' | 'time') {
    const w = world.current
    if (!live()) return
    w.dead = kind
    w.deadT = 0
    setPhaseBoth('dying')
    const g = geo()
    const px = g.cx + w.side * (g.TW / 2 + 42 * g.k)
    if (kind === 'branch') {
      fx.flash('#ef4444', 0.35)
      fx.shake(14, 0.45)
      fx.stop(0.14)
      fx.burst(px, g.groundY - 70 * g.k, { count: 26, color: [SEASONS[w.season].leaf, SEASONS[w.season].leafDark, '#fff'], speed: 320, gravity: 500 })
      sfx.hurt()
      sfx.thud()
    } else {
      fx.text(g.cx, g.H * 0.4, 'TIME UP', '#fecaca', 30)
      fx.flash('#1e293b', 0.3)
      fx.shake(5, 0.3)
    }
    fx.slowmo(0.8, 0.35)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.chops / 8 + w.stats.golden + w.stats.powerups * 2 + w.bossKills * 8) * (1 + run.level('golden') * 0.15))
      run.end({ score: w.score, cleared: w.chops >= CHOPS_PER_SEASON, stats: { ...w.stats }, coins }, revive)
    }, 1150)
  }

  /** Ad revive: full timer, branches near the ground removed, short invulnerability. */
  function revive() {
    const w = world.current
    const g = geo()
    w.time = 1
    w.dead = ''
    w.invuln = 2
    w.cones = []
    w.coneT = 4
    if (w.boss) {
      w.boss.volleyT = 3.5
      w.boss.roarT = 0
    }
    for (let i = 0; i < 7 && i < w.segs.length; i++) {
      if (w.segs[i].branch !== 0) {
        const y = g.groundY - g.stumpH - (i + 0.5) * g.SH
        fx.burst(g.cx + w.segs[i].branch * g.TW, y, { count: 10, color: [SEASONS[w.season].leaf, '#fff'], speed: 200 })
      }
      w.segs[i].branch = 0
    }
    fx.ring(g.cx, g.groundY - 60 * g.k, { color: '#fde047', maxR: 120, life: 0.6, width: 5 })
    say('REVIVED!', 'branches cleared')
    setPhaseBoth('play')
    pushHud()
  }

  // ── Chopping ──────────────────────────────────────────

  function smashBranch(i: number, why: string) {
    const w = world.current
    const g = geo()
    const s = w.segs[i]
    const y = g.groundY - g.stumpH - (i + 0.5) * g.SH
    w.flies.push({ x: g.cx + s.branch * (g.TW / 2 + 20 * g.k), y, vx: s.branch * rand(220, 360), vy: -rand(200, 360), rot: 0, vr: s.branch * rand(6, 12), life: 1.4, kind: 'branch', seg: { ...s }, dir: s.branch })
    fx.burst(g.cx + s.branch * g.TW, y, { count: 14, color: [SEASONS[w.season].leaf, SEASONS[w.season].leafDark], speed: 260, gravity: 400, shape: 'square', size: 4 })
    s.branch = 0
    if (s.kind === 'flip') s.kind = 'log'
    if (why) fx.text(g.cx + w.side * g.TW, y - 20, why, '#fde047', 18)
    sfx.slash()
  }

  /** Returns true if the player survives a branch at segment i. */
  function hitBranch(i: number): boolean {
    const w = world.current
    if (w.fury > 0) {
      smashBranch(i, 'SMASH!')
      return true
    }
    if (w.invuln > 0) {
      smashBranch(i, '')
      return true
    }
    if (w.helmets > 0) {
      w.helmets -= 1
      const g = geo()
      const px = g.cx + w.side * (g.TW / 2 + 42 * g.k)
      w.flies.push({ x: px, y: g.groundY - 85 * g.k, vx: -w.side * 160, vy: -420, rot: 0, vr: 10, life: 1.4, kind: 'helmet', seg: w.segs[i], dir: 1 })
      smashBranch(i, '')
      w.invuln = 0.6
      fx.flash('#fde047', 0.2)
      fx.shake(8, 0.25)
      sfx.clang()
      haptic.heavy()
      say('HELMET SAVED!', `${w.helmets} left`)
      pushHud()
      return true
    }
    die('branch')
    return false
  }

  // ── Elder Treant boss + pinecones ─────────────────────

  function wakeBoss() {
    const w = world.current
    const wave = w.bossKills
    const hp = BOSS_HP + wave * 10
    w.boss = { hp, max: hp, roar: 0, roarT: 0, volleyT: 3, hurt: 0, wave }
    w.cones = []
    say('ELDER TREANT AWAKENS', `chop ${hp} logs to fell it — dodge its pinecones`)
    sfx.boom(0.9)
    window.setTimeout(() => sfx.levelUp(), 220)
    fx.flash('#14532d', 0.35)
    fx.shake(12, 0.6)
    haptic.heavy()
  }

  function felled() {
    const w = world.current
    const g = geo()
    w.boss = null
    w.cones = []
    w.bossKills += 1
    w.nextBoss = w.chops + BOSS_EVERY
    w.score += 50
    w.helmets = Math.min(3, w.helmets + 1)
    w.time = 1
    const y = g.groundY - g.stumpH - g.SH * 3
    fx.explode(g.cx, y, 1.6, [SEASONS[w.season].leaf, '#fde047', '#86efac', '#ffffff'])
    fx.burst(g.cx, y, { count: 30, color: [SEASONS[w.season].leaf, SEASONS[w.season].leafDark], speed: 380, shape: 'square', size: 5, gravity: 420 })
    fx.text(g.cx, y - 30, '+50', '#fde047', 30)
    fx.slowmo(0.7, 0.35)
    fx.flash('#fde047', 0.3)
    say('TREANT FELLED!', '+50 points · bonus helmet · timer refilled')
    sfx.win()
    haptic.success()
    void trackEvent('action_milestone', { game_id: 'lumber', kind: 'boss', value: w.bossKills })
  }

  function spawnCone(side: -1 | 1, dur: number) {
    const w = world.current
    w.cones.push({ side, t: dur, dur, rot: rand(0, 6) })
    // The tree shakes loose anything that would block one escape chop to the other side.
    const away = side === 1 ? -1 : 1
    for (let i = 0; i < 2 && i < w.segs.length; i++) {
      const s = w.segs[i]
      if (s.branch !== 0 && (s.branch === away || s.kind === 'flip')) smashBranch(i, '')
    }
    sfx.tick()
  }

  function coneLands(c: Cone) {
    const w = world.current
    const g = geo()
    const x = g.cx + c.side * (g.TW / 2 + 42 * g.k)
    const y = g.groundY - 40 * g.k
    fx.burst(x, g.groundY - 6, { count: 12, color: ['#78350f', '#b45309', '#fde68a'], speed: 240, shape: 'square', size: 4, gravity: 700, angle: -Math.PI / 2, spread: 2.2 })
    fx.shake(4, 0.15)
    sfx.thud()
    if (c.side !== w.side) {
      fx.text(x, y - 30, 'DODGED +2', '#a7f3d0', 16)
      w.score += 2
      pushHud()
      return
    }
    if (w.fury > 0 || w.invuln > 0) {
      fx.text(x, y - 40, 'BONK!', '#fde047', 20)
      sfx.clang()
      return
    }
    if (w.helmets > 0) {
      w.helmets -= 1
      w.invuln = 0.6
      w.flies.push({ x, y: g.groundY - 85 * g.k, vx: -w.side * 160, vy: -420, rot: 0, vr: 10, life: 1.4, kind: 'helmet', seg: w.segs[0], dir: 1 })
      fx.flash('#fde047', 0.2)
      fx.shake(8, 0.25)
      sfx.clang()
      haptic.heavy()
      say('HELMET SAVED!', `${w.helmets} left`)
      pushHud()
      return
    }
    die('branch')
  }

  function updateHazards(dt: number) {
    const w = world.current
    const b = w.boss
    if (b) {
      b.hurt = Math.max(0, b.hurt - dt)
      b.roar = approach(b.roar, b.roarT > 0 ? 1 : 0, 6, dt)
      if (b.roarT > 0) {
        b.roarT -= dt
        if (b.roarT <= 0 && w.cones.length === 0) {
          // Volley aimed at the player's side: forces a switch.
          spawnCone(w.side, Math.max(1.05, 1.35 - b.wave * 0.1))
        }
      } else if (w.cones.length === 0) {
        b.volleyT -= dt
        if (b.volleyT <= 0) {
          b.volleyT = rand(2.1, 3.1) - Math.min(0.6, b.wave * 0.2)
          b.roarT = 0.55
          fx.shake(5, 0.4)
          sfx.whoosh()
        }
      }
    } else if (w.level >= CONE_LEVEL && w.rush <= 0) {
      w.coneT -= dt
      if (w.coneT <= 0 && w.cones.length === 0) {
        spawnCone(Math.random() < 0.65 ? w.side : w.side === 1 ? -1 : 1, 1.45)
        w.coneT = rand(4.5, 7) * Math.max(0.55, 1 - (w.level - CONE_LEVEL) * 0.04)
      }
    }
    for (const c of w.cones) {
      c.t -= dt
      c.rot += dt * 3
    }
    if (w.cones.length && w.cones[0].t <= 0) {
      const c = w.cones.shift()!
      coneLands(c)
    }
  }

  function chop(side: -1 | 1) {
    const w = world.current
    const playing = live()
    if (!playing && phaseRef.current !== 'idle') return
    const g = geo()
    w.side = side
    w.swing = 1
    if (playing) w.started = true
    const s0 = w.segs[0]
    if (s0.branch === side && playing && !hitBranch(0)) return

    const hitY = g.groundY - g.stumpH - g.SH * 0.5
    const hitX = g.cx + side * g.TW * 0.5
    if (s0.kind === 'hard' && s0.hp > 1) {
      s0.hp -= 1
      s0.dent = 1
      fx.burst(hitX, hitY, { count: 12, color: ['#e2e8f0', '#fde047', '#ffffff'], speed: 300, shape: 'spark', angle: side < 0 ? Math.PI : 0, spread: 1.4 })
      fx.shake(4, 0.12)
      fx.stop(0.04)
      if (playing) {
        sfx.clang()
        haptic.medium()
        w.time = Math.min(1, w.time + 0.02)
      }
      return
    }

    // Log flies off to the far side.
    w.segs.shift()
    w.segs.push(genSeg())
    for (const s of w.segs) {
      if (s.kind === 'flip' && s.branch !== 0) {
        s.branch = s.branch === 1 ? -1 : 1
        s.flip = 1
      }
    }
    w.drop = g.SH
    w.flies.push({ x: g.cx, y: hitY, vx: -side * rand(420, 560), vy: -rand(160, 280), rot: 0, vr: -side * rand(8, 14), life: 1.3, kind: 'log', seg: s0, dir: -side })
    if (w.flies.length > 14) w.flies.shift()
    const sea = SEASONS[w.season]
    fx.burst(hitX, hitY, { count: 8, color: [sea.barkLight, '#fde68a', sea.bark], speed: 260, shape: 'square', size: 4, angle: side < 0 ? Math.PI * 1.15 : -Math.PI * 0.15, spread: 1.2, gravity: 700 })

    if (!playing) return

    w.chops += 1
    w.stats.chops = w.chops
    w.heat = Math.min(1, w.heat + 0.07)
    let pts = 1
    if (w.heat > 0.75) pts += 1
    if (s0.kind === 'gold') {
      pts += 5
      w.stats.golden += 1
      fx.burst(hitX, hitY, { count: 18, color: ['#fde047', '#fef9c3', '#f59e0b'], speed: 300, shape: 'spark', gravity: 200 })
      fx.ring(hitX, hitY, { color: '#fde047', maxR: 44, life: 0.35 })
      sfx.power()
    } else if (s0.kind === 'fury') {
      w.fury = 5
      w.stats.powerups += 1
      say('AXE FURY!', 'branches can’t stop you')
      fx.flash('#fb923c', 0.2)
      fx.explode(hitX, hitY, 1.1, ['#fdba74', '#f97316', '#fde047', '#fff7ed'])
      sfx.power()
      haptic.success()
    } else if (s0.kind === 'freeze') {
      w.freeze = 5.5
      w.time = Math.max(w.time, 0.8)
      w.stats.powerups += 1
      say('FREEZE!', 'the timer stops')
      fx.flash('#7dd3fc', 0.2)
      fx.burst(hitX, hitY, { count: 22, color: ['#e0f2fe', '#7dd3fc', '#ffffff'], speed: 280, shape: 'spark', gravity: 60 })
      sfx.power()
      haptic.success()
    } else if (s0.kind === 'helmet') {
      w.helmets = Math.min(3, w.helmets + 1)
      w.stats.powerups += 1
      say('HARD HAT!', `${w.helmets} helmet${w.helmets > 1 ? 's' : ''} — one free hit each`)
      fx.burst(hitX, hitY, { count: 18, color: ['#fde047', '#fef9c3', '#ca8a04'], speed: 260, shape: 'spark', gravity: 120 })
      fx.ring(hitX, hitY, { color: '#facc15', maxR: 50, life: 0.4 })
      sfx.power()
      haptic.success()
    }
    if (w.boss) {
      const b = w.boss
      b.hp -= w.fury > 0 ? 2 : 1
      b.hurt = 0.15
    }
    if (w.fury > 0) pts *= 2
    w.score += pts
    w.time = Math.min(1, w.time + Math.min(0.1, 0.06 + (w.level - 1) * 0.004))
    if (pts > 1) fx.text(hitX - side * 10, hitY - 30, `+${pts}`, s0.kind === 'gold' ? '#fde047' : '#ffffff', pts >= 6 ? 22 : 16)
    fx.shake(2.5, 0.08)
    fx.stop(0.015)
    sfx.thud()
    if (w.chops % 10 === 0) sfx.score(Math.min(10, w.chops / 10))
    haptic.light()

    const lvl = 1 + Math.floor(w.chops / CHOPS_PER_LEVEL)
    if (lvl > w.level) {
      w.level = lvl
      w.stats.level = lvl
      if (w.chops % CHOPS_PER_SEASON !== 0) {
        say(
          `LEVEL ${lvl}`,
          lvl === 2
            ? 'golden logs appear'
            : lvl === 3
              ? 'power-up logs appear'
              : lvl === 4
                ? 'iron logs take 2 chops'
                : lvl === 6
                  ? 'no more safe gaps'
                  : lvl === VINE_LEVEL
                    ? 'thorn vines swap sides every chop!'
                    : lvl === CONE_LEVEL
                      ? 'pinecones fall — watch the shadows'
                      : 'the timer drains faster',
        )
        sfx.levelUp()
      }
    }
    if (w.chops % CHOPS_PER_SEASON === 0) {
      w.prevSeason = w.season
      w.season = (w.season + 1) % SEASONS.length
      w.seasonT = 1
      w.rush = 6
      for (let i = 4; i < w.segs.length; i++) w.segs[i] = { branch: 0, kind: 'gold', hp: 1, dent: 0 }
      say(SEASONS[w.season].name.toUpperCase(), 'timber rush — golden logs!')
      sfx.win()
      haptic.success()
      fx.flash('#ffffff', 0.25)
      void trackEvent('action_milestone', { game_id: 'lumber', kind: 'season', value: w.chops })
    }
    if (w.boss && w.boss.hp <= 0) felled()
    else if (!w.boss && w.chops >= w.nextBoss && w.rush <= 0) wakeBoss()
    if (!w.bestShown && w.best > 0 && w.score > w.best) {
      w.bestShown = true
      say('NEW BEST!')
      sfx.mission()
    }

    // Did the next log bring a branch down on us?
    const n0 = w.segs[0]
    if (n0.branch === side) hitBranch(0)
    run.update(w.stats)
    pushHud()
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!live()) return
    const p = localPoint(e, e.currentTarget)
    chop(p.x < size.current.w / 2 ? -1 : 1)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (!live()) return
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') chop(-1)
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') chop(1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Frame ─────────────────────────────────────────────

  function update(dt: number, raw: number) {
    const w = world.current
    const ph = phaseRef.current
    if (ph === 'play' && w.started) {
      w.fury = Math.max(0, w.fury - dt)
      w.freeze = Math.max(0, w.freeze - dt)
      w.invuln = Math.max(0, w.invuln - dt)
      w.rush = Math.max(0, w.rush - dt)
      if (w.freeze <= 0) {
        const drain = Math.min(0.42, 0.1 + 0.017 * (w.level - 1)) * (1 - run.level('stamina') * 0.08) * (w.boss ? 0.85 : 1)
        w.time -= drain * dt
      }
      updateHazards(dt)
      if (w.time <= 0 && live()) {
        w.time = 0
        die('time')
      }
    }
    if (ph === 'idle') {
      w.demoT -= raw
      if (w.segs.length === 0) buildTree()
      if (w.demoT <= 0) {
        w.demoT = rand(0.28, 0.5)
        const bad0 = w.segs[0].branch
        const bad1 = w.segs[1].branch
        let side: -1 | 1 = Math.random() < 0.5 ? -1 : 1
        if (side === bad0 || side === bad1) side = side === 1 ? -1 : 1
        if (side !== bad0 && side !== bad1) chop(side)
        else {
          // No safe chop: clear the hazard so the demo keeps flowing.
          w.segs[1].branch = 0
          chop(bad0 === 1 ? -1 : 1)
        }
      }
    }
    w.heat = Math.max(0, w.heat - raw * 0.45)
    w.swing = Math.max(0, w.swing - raw * 7)
    w.drop = approach(w.drop, 0, 22, raw)
    w.seasonT = Math.max(0, w.seasonT - raw * 0.7)
    for (const s of w.segs) if (s.flip) s.flip = Math.max(0, s.flip - raw * 7)
    w.blink -= raw
    if (w.blink < -0.12) w.blink = rand(2, 4)
    if (w.dead) w.deadT += raw
    for (const f of w.flies) {
      f.vy += 1500 * dt
      f.x += f.vx * dt
      f.y += f.vy * dt
      f.rot += f.vr * dt
      f.life -= raw
    }
    if (w.flies.length) w.flies = w.flies.filter((f) => f.life > 0)
  }

  function drawBackground(ctx: CanvasRenderingContext2D, si: number, alpha: number, t: number) {
    const g = geo()
    const { W, H, groundY } = g
    const sea = SEASONS[si]
    ctx.globalAlpha = alpha
    const sky = ctx.createLinearGradient(0, 0, 0, groundY)
    sky.addColorStop(0, sea.skyTop)
    sky.addColorStop(1, sea.skyBot)
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, groundY + 2)
    if (sea.night) {
      for (const s of STARS) {
        ctx.globalAlpha = alpha * (0.5 + Math.sin(t * 2 + s.p) * 0.4)
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(s.x * W, s.y * groundY, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = alpha
    }
    const sunX = W * 0.8
    const sunY = groundY * 0.2
    glow(ctx, sunX, sunY, 70, sea.sun, 0.45 * alpha)
    ctx.globalAlpha = alpha
    ctx.fillStyle = sea.sun
    ctx.beginPath()
    ctx.arc(sunX, sunY, 20, 0, Math.PI * 2)
    ctx.fill()
    if (sea.night) {
      ctx.fillStyle = sea.skyTop
      ctx.beginPath()
      ctx.arc(sunX + 8, sunY - 5, 17, 0, Math.PI * 2)
      ctx.fill()
    }
    if (sea.aurora) {
      // Aurora ribbons
      for (let r = 0; r < 3; r++) {
        const baseY = groundY * (0.16 + r * 0.09)
        const ag = ctx.createLinearGradient(0, baseY - 40, 0, baseY + 30)
        ag.addColorStop(0, 'rgba(45,212,191,0)')
        ag.addColorStop(0.5, r === 1 ? 'rgba(167,139,250,0.35)' : 'rgba(45,212,191,0.4)')
        ag.addColorStop(1, 'rgba(45,212,191,0)')
        ctx.fillStyle = ag
        ctx.globalAlpha = alpha * (0.7 + Math.sin(t * 0.7 + r) * 0.3)
        ctx.beginPath()
        ctx.moveTo(0, baseY + 30)
        for (let x = 0; x <= W; x += 20) ctx.lineTo(x, baseY - 30 + Math.sin(x * 0.012 + t * 0.6 + r * 2) * 18 + Math.sin(x * 0.03 - t) * 6)
        for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, baseY + 24 + Math.sin(x * 0.014 + t * 0.5 + r) * 10)
        ctx.closePath()
        ctx.fill()
      }
      ctx.globalAlpha = alpha
    }
    if (sea.volcano) {
      // Distant volcano with a glowing crater and smoke
      const vx = W * 0.26
      const vy = groundY - 40
      glow(ctx, vx, vy - 120, 90, '#f97316', 0.35 * alpha)
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#3b1306'
      ctx.beginPath()
      ctx.moveTo(vx - 150, vy + 40)
      ctx.lineTo(vx - 22, vy - 120)
      ctx.lineTo(vx + 22, vy - 120)
      ctx.lineTo(vx + 160, vy + 40)
      ctx.fill()
      ctx.fillStyle = '#fb923c'
      ctx.beginPath()
      ctx.ellipse(vx, vy - 120, 22, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ea580c'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(vx - 6, vy - 118)
      ctx.quadraticCurveTo(vx - 20, vy - 70, vx - 34, vy - 20)
      ctx.moveTo(vx + 8, vy - 118)
      ctx.quadraticCurveTo(vx + 18, vy - 80, vx + 40, vy - 30)
      ctx.stroke()
      for (let i = 0; i < 4; i++) {
        const k = (t * 0.12 + i / 4) % 1
        ctx.globalAlpha = alpha * (1 - k) * 0.45
        ctx.fillStyle = '#57534e'
        ctx.beginPath()
        ctx.arc(vx + Math.sin(k * 5 + i) * 18 + k * 40, vy - 130 - k * 110, 14 + k * 30, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = alpha
    }
    // Clouds drift
    if (!sea.night && !sea.volcano) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      for (let i = 0; i < 3; i++) {
        const cx = ((t * (6 + i * 3) + i * 170) % (W + 160)) - 80
        const cy = groundY * (0.12 + i * 0.12)
        ctx.beginPath()
        ctx.arc(cx, cy, 14, 0, Math.PI * 2)
        ctx.arc(cx + 16, cy - 6, 18, 0, Math.PI * 2)
        ctx.arc(cx + 34, cy, 13, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // Far hills
    ctx.fillStyle = sea.far
    ctx.beginPath()
    ctx.moveTo(0, groundY)
    for (let x = 0; x <= W; x += 16) ctx.lineTo(x, groundY - 70 - Math.sin(x * 0.012 + 1) * 26 - Math.sin(x * 0.031) * 10)
    ctx.lineTo(W, groundY)
    ctx.fill()
    // Distant trees
    for (let i = 0; i < 7; i++) {
      const tx = (i + 0.5) * (W / 7) + Math.sin(i * 3.1) * 14
      const th = 34 + (i % 3) * 10
      ctx.fillStyle = sea.barkDark
      ctx.fillRect(tx - 2, groundY - th * 0.5, 4, th * 0.5)
      ctx.fillStyle = sea.near
      ctx.beginPath()
      if (sea.pines) {
        for (let l = 0; l < 3; l++) {
          const ly = groundY - th * 0.35 - l * th * 0.28
          const lw = th * (0.42 - l * 0.1)
          ctx.moveTo(tx - lw, ly)
          ctx.lineTo(tx, ly - th * 0.45)
          ctx.lineTo(tx + lw, ly)
        }
        ctx.fill()
        ctx.fillStyle = 'rgba(241,245,249,0.85)'
        ctx.beginPath()
        ctx.moveTo(tx - th * 0.12, groundY - th * 1.05)
        ctx.lineTo(tx, groundY - th * 1.26)
        ctx.lineTo(tx + th * 0.12, groundY - th * 1.05)
      } else {
        ctx.arc(tx, groundY - th * 0.65, th * 0.32, 0, Math.PI * 2)
        ctx.arc(tx - th * 0.18, groundY - th * 0.5, th * 0.24, 0, Math.PI * 2)
        ctx.arc(tx + th * 0.2, groundY - th * 0.52, th * 0.24, 0, Math.PI * 2)
      }
      ctx.fill()
    }
    // Ground
    const gr = ctx.createLinearGradient(0, groundY, 0, H)
    gr.addColorStop(0, sea.ground)
    gr.addColorStop(1, sea.groundDark)
    ctx.fillStyle = gr
    ctx.fillRect(0, groundY, W, H - groundY)
    ctx.fillStyle = sea.groundDark
    for (let x = 6; x < W; x += 22) {
      ctx.beginPath()
      ctx.moveTo(x, groundY + 4)
      ctx.lineTo(x + 3, groundY - 4)
      ctx.lineTo(x + 6, groundY + 4)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    update(dt, raw)
    const g = geo()
    const { groundY, TW, SH, stumpH, k, cx } = g
    const sea = SEASONS[w.season]

    drawBackground(ctx, w.season, 1, t)
    if (w.seasonT > 0) drawBackground(ctx, w.prevSeason, w.seasonT, t)

    // Ambient particles
    if (w.amb.length < 26 && Math.random() < raw * 12) {
      const c = sea.ambient[Math.floor(Math.random() * sea.ambient.length)]
      const fire = sea.fall === 'firefly'
      const ember = sea.fall === 'ember'
      w.amb.push({ x: rand(0, W), y: ember ? groundY + 4 : fire ? rand(groundY * 0.3, groundY) : -10, vx: rand(-20, 20), vy: ember ? rand(-70, -35) : fire ? rand(-8, 8) : rand(25, 60), rot: rand(0, 6), vr: rand(-3, 3), s: rand(2, 5), c, ph: rand(0, 6) })
    }
    for (const a of w.amb) {
      a.ph += raw
      a.x += (a.vx + Math.sin(a.ph * 2) * 18) * raw
      a.y += a.vy * raw
      a.rot += a.vr * raw
      ctx.save()
      ctx.translate(a.x, a.y)
      ctx.rotate(a.rot)
      if (sea.fall === 'ember') {
        glow(ctx, 0, 0, a.s * 3, a.c, 0.45)
        ctx.fillStyle = '#fef3c7'
        ctx.fillRect(-1.2, -1.2, 2.4, 2.4)
      } else if (sea.fall === 'firefly') {
        glow(ctx, 0, 0, a.s * 4, a.c, 0.5 + Math.sin(a.ph * 4) * 0.3)
        ctx.fillStyle = '#fff'
        ctx.fillRect(-1, -1, 2, 2)
      } else if (sea.fall === 'snow' || sea.fall === 'pollen') {
        ctx.fillStyle = a.c
        ctx.globalAlpha = 0.85
        ctx.beginPath()
        ctx.arc(0, 0, a.s * 0.7, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = a.c
        ctx.globalAlpha = 0.9
        ctx.beginPath()
        ctx.ellipse(0, 0, a.s * 1.4, a.s * 0.7, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
    ctx.globalAlpha = 1
    w.amb = w.amb.filter((a) => a.y < H + 10 && a.y > -20 && a.x > -30 && a.x < W + 30)

    fx.applyShake(ctx)

    // Trunk (top down so branches overlap nicely)
    const base = groundY - stumpH
    if (w.fury > 0) glow(ctx, cx, base - SH * 2, TW * 2.2, '#f97316', 0.25 + Math.sin(t * 12) * 0.08)
    const topVisible = Math.ceil(base / SH) + 2
    for (let i = Math.min(w.segs.length - 1, topVisible); i >= 0; i--) {
      const s = w.segs[i]
      const y = base - (i + 1) * SH - w.drop
      if (y > H || y + SH < -SH) continue
      drawSeg(ctx, s, cx, y, TW, SH, sea, t)
      if (s.branch !== 0 && s.kind === 'flip') {
        const d = s.branch * Math.cos((s.flip ?? 0) * Math.PI)
        drawVine(ctx, cx + (d < 0 ? -1 : 1) * (TW / 2 - 2), y + SH * 0.5, d, 72 * k, 8 * k, t + i)
        swapArrow(ctx, cx, y - 4 * k, TW * 0.55, t)
      } else if (s.branch !== 0) drawBranch(ctx, cx + s.branch * (TW / 2 - 2), y + SH * 0.5, s.branch, 72 * k, 9 * k, sea, Math.sin(t * 1.6 + i) * 0.03)
    }
    if (w.boss) {
      const b = w.boss
      const fy = base - SH * 3.2 - w.drop * 0.2
      glow(ctx, cx, fy, TW * 1.6, '#16a34a', 0.18 + b.roar * 0.2)
      drawTreantFace(ctx, cx, fy, TW, t, b.roar, b.hurt)
    }
    // Stump with roots
    const sg = ctx.createLinearGradient(cx - TW * 0.7, 0, cx + TW * 0.7, 0)
    sg.addColorStop(0, sea.barkDark)
    sg.addColorStop(0.4, sea.barkLight)
    sg.addColorStop(1, sea.barkDark)
    ctx.fillStyle = sg
    ctx.beginPath()
    ctx.moveTo(cx - TW / 2, base)
    ctx.lineTo(cx + TW / 2, base)
    ctx.quadraticCurveTo(cx + TW * 0.55, groundY - 6, cx + TW * 0.85, groundY + 4)
    ctx.lineTo(cx - TW * 0.85, groundY + 4)
    ctx.quadraticCurveTo(cx - TW * 0.55, groundY - 6, cx - TW / 2, base)
    ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse(cx, groundY + 5, TW * 0.95, 7, 0, 0, Math.PI * 2)
    ctx.fill()

    // Lumberjack
    const px = cx + w.side * (TW / 2 + 42 * k)
    let squash = 1
    let tilt = 0
    if (w.dead === 'branch') squash = Math.max(0.35, 1 - w.deadT * 6)
    if (w.dead === 'time') tilt = -w.side * Math.min(1.45, w.deadT * 3)
    const swing = w.swing > 0 ? Math.min(1, w.swing * 1.6) : 0
    if (w.invuln > 0 && Math.floor(t * 14) % 2 === 0) ctx.globalAlpha = 0.5
    if (w.fury > 0) glow(ctx, px, groundY - 50 * k, 70 * k, '#fb923c', 0.35)
    drawJack(ctx, px, groundY, -w.side, k, { swing, squash, tilt, blink: w.blink < 0, fury: w.fury > 0, helmet: w.helmets > 0 })
    ctx.globalAlpha = 1
    if (w.swing > 0.6) {
      // Swoosh arc
      ctx.strokeStyle = w.fury > 0 ? 'rgba(251,146,60,0.8)' : 'rgba(255,255,255,0.7)'
      ctx.lineWidth = 4 * k
      ctx.beginPath()
      const ax = px + 2 * k * -w.side
      const ay = groundY - 54 * k
      if (w.side < 0) ctx.arc(ax, ay, 50 * k, -1.4, 0.35)
      else ctx.arc(ax, ay, 50 * k, Math.PI - 0.35, Math.PI + 1.4)
      ctx.stroke()
    }

    // Pinecones: pulsing ground marker + cone falling from the canopy
    for (const c of w.cones) {
      const x = cx + c.side * (TW / 2 + 42 * k)
      const p = 1 - c.t / c.dur
      const urgent = c.t < 0.5
      ctx.globalAlpha = 0.35 + p * 0.5
      ctx.fillStyle = urgent && Math.floor(t * 16) % 2 ? '#fca5a5' : '#ef4444'
      ctx.beginPath()
      ctx.ellipse(x, groundY + 2, 18 * k + p * 12 * k, 5 * k + p * 2 * k, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(x, groundY - 110 * k, 13 * k, 0, Math.PI * 2 * (1 - p))
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.font = `900 ${Math.round(16 * k)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('!', x, groundY - 110 * k)
      const cy = -20 + (groundY - 30 * k + 20) * p * p
      ctx.globalAlpha = Math.min(1, p * 3)
      drawCone(ctx, x, cy, 11 * k, c.rot)
      ctx.globalAlpha = 1
    }

    // Flying debris
    for (const f of w.flies) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, f.life * 2)
      ctx.translate(f.x, f.y)
      ctx.rotate(f.rot)
      if (f.kind === 'log') {
        drawSeg(ctx, { ...f.seg, branch: 0 }, 0, -SH / 2, TW, SH, sea, t)
        // Cut faces
        ctx.fillStyle = '#fde68a'
        ctx.beginPath()
        ctx.ellipse(0, -SH / 2, TW / 2, 4, 0, 0, Math.PI * 2)
        ctx.fill()
      } else if (f.kind === 'branch') {
        drawBranch(ctx, -20 * k * f.dir, 0, f.dir, 60 * k, 8 * k, sea, 0)
      } else {
        ctx.fillStyle = '#facc15'
        ctx.beginPath()
        ctx.arc(0, 0, 12 * k, Math.PI, 0)
        ctx.fill()
        ctx.fillRect(-14 * k, -1, 28 * k, 3 * k)
      }
      ctx.restore()
    }

    fx.draw(ctx)
    ctx.restore()

    // Timer bar (UI layer)
    const ph = phaseRef.current
    if (ph !== 'idle') {
      const bw = Math.min(W * 0.6, 250)
      const bx = (W - bw) / 2
      const by = 74
      ctx.fillStyle = 'rgba(15,23,42,0.55)'
      ctx.beginPath()
      ctx.roundRect(bx - 4, by - 4, bw + 8, 22, 11)
      ctx.fill()
      const v = clamp(w.time, 0, 1)
      const low = v < 0.25
      const col = w.freeze > 0 ? '#7dd3fc' : low ? (Math.floor(t * 8) % 2 ? '#ef4444' : '#f87171') : v < 0.5 ? '#facc15' : '#4ade80'
      const bg2 = ctx.createLinearGradient(0, by, 0, by + 14)
      bg2.addColorStop(0, '#ffffff')
      bg2.addColorStop(0.3, col)
      bg2.addColorStop(1, col)
      ctx.fillStyle = bg2
      ctx.beginPath()
      ctx.roundRect(bx, by, Math.max(8, bw * v), 14, 7)
      ctx.fill()
      if (w.freeze > 0) flakeIcon(ctx, bx - 16, by + 7, 8)
      if (w.fury > 0) axeIcon(ctx, bx + bw + 18, by + 7, 9)
      if (w.heat > 0.75) {
        ctx.fillStyle = '#fde047'
        ctx.font = "900 13px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText('ON FIRE ×2', W / 2, by + 20)
      }
      if (!w.started && ph === 'play') {
        // Tap hints
        const a = 0.5 + Math.sin(t * 5) * 0.3
        ctx.globalAlpha = a
        ctx.fillStyle = '#ffffff'
        ctx.font = "900 20px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('TAP', W * 0.18, H * 0.6)
        ctx.fillText('TAP', W * 0.82, H * 0.6)
        ctx.globalAlpha = 1
      }
    }
    if (w.rush > 0 && ph === 'play') star(ctx, W - 22, 104, 6 + Math.sin(t * 8) * 2, '#fde047')
    if (w.boss && ph !== 'idle') {
      const b = w.boss
      const bw = Math.min(W * 0.6, 250)
      const bx = (W - bw) / 2
      const by = 118
      ctx.fillStyle = 'rgba(15,23,42,0.6)'
      ctx.beginPath()
      ctx.roundRect(bx - 4, by - 4, bw + 8, 16, 8)
      ctx.fill()
      const hg = ctx.createLinearGradient(bx, 0, bx + bw, 0)
      hg.addColorStop(0, '#15803d')
      hg.addColorStop(1, '#4ade80')
      ctx.fillStyle = hg
      ctx.beginPath()
      ctx.roundRect(bx, by, Math.max(6, (bw * Math.max(0, b.hp)) / b.max), 8, 4)
      ctx.fill()
      ctx.fillStyle = '#dcfce7'
      ctx.font = "900 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(`ELDER TREANT · ${Math.max(0, b.hp)}`, W / 2, by + 12)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const hook = {
      chops(n: number) {
        const w = world.current
        w.chops = n
        w.stats.chops = n
        w.level = 1 + Math.floor(n / CHOPS_PER_LEVEL)
        w.stats.level = w.level
        w.season = Math.floor(n / CHOPS_PER_SEASON) % SEASONS.length
        w.time = 1
        pushHud()
      },
      season(i: number) {
        world.current.season = i % SEASONS.length
        world.current.seasonT = 0
        pushHud()
      },
      boss: () => wakeBoss(),
      cone: () => spawnCone(world.current.side, 1.45),
      vine() {
        const w = world.current
        w.segs[1] = { branch: 0, kind: 'log', hp: 1, dent: 0 }
        w.segs[2] = { branch: 1, kind: 'flip', hp: 1, dent: 0 }
        w.segs[3] = { branch: 0, kind: 'log', hp: 1, dent: 0 }
        w.segs[4] = { branch: -1, kind: 'helmet', hp: 1, dent: 0 }
      },
      god(on: boolean) {
        world.current.invuln = on ? 9999 : 0
      },
      state: () => ({ chops: world.current.chops, level: world.current.level, season: SEASONS[world.current.season].name, boss: world.current.boss?.hp ?? null, cones: world.current.cones.length }),
    }
    ;(window as unknown as Record<string, unknown>).__en1_lumber = hook
  })

  const sea = SEASONS[hud.season]
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Level {hud.level} · {sea.name}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small" style={{ color: '#fde047' }}>
                  Gold {hud.golden}
                </span>
                {hud.helmets > 0 ? <span className="action-hud__small">Helmet ×{hud.helmets}</span> : null}
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
              game="lumber"
              icon={meta.icon}
              title={meta.title}
              hint="Tap left or right to chop. Dodge the branches and keep the timer full."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.score >= 100 ? 'Timber!' : 'Chopped out!'}
            subtitle={`Score ${hud.score} · Level ${hud.level}`}
            celebrate={hud.level >= 5}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
