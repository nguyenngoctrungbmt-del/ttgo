import { useEffect, useRef, useState, type PointerEvent } from 'react'
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
import { PERSON_H, THEME_NAME, buildScene, drawPerson, drawScene, hitTest, rng, themeFor, type PKind, type Scene } from './scene'
import { SNIPER_LEVELS } from './levels'
import '../../shared/action/action.css'
import './sniper.css'

const meta = getGame('sniper')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type LState = 'brief' | 'live' | 'clear' | 'fail'
type PState = 'walk' | 'idle' | 'tohide' | 'hide' | 'peek' | 'flee' | 'dead' | 'gone' | 'prone'

type Person = {
  id: number
  kind: PKind
  plat: number
  x: number
  dir: number
  speed: number
  state: PState
  t: number
  tx: number
  crouch: number
  alert: number
  walk: number
  fall: number
  shirt: string
  glintT: number
  glintOn: number
}
type Shot = { x: number; y: number; sx: number; sy: number; t: number; travel: number; d: number }
type Cam = { x: number; y: number; t: number; d: number; from: number }

type World = {
  scene: Scene
  level: number
  hearts: number
  ammo: number
  timeLeft: number
  objective: 'clear' | 'vip'
  people: Person[]
  shots: Shot[]
  aimX: number
  aimY: number
  swayT: number
  breath: number
  exhausted: boolean
  chamber: number
  recoil: number
  wind: number
  lstate: LState
  stateT: number
  cam: Cam | null
  crack: number
  levelShots: number
  levelHits: number
  levelKills: number
  levelHeads: number
  civHits: number
  score: number
  id: number
  stats: { score: number; levels: number; kills: number; headshots: number; stars: number; longshot: number }
  tip: string
  goalText: string
  tipT: number
}

const SHIRTS = ['#2563eb', '#16a34a', '#eab308', '#db2777', '#0891b2', '#ea580c']
const BULLET_SPEED = 900
/** Dev-only time multiplier for scripted tests. */
let devSpeed = 1

function drop(d: number) {
  return 0.35 * (d / 100) ** 2
}
function drift(d: number, wind: number) {
  return wind * 0.11 * (d / 100) ** 1.5
}

function emptyWorld(W: number, H: number): World {
  return {
    scene: buildScene('city', 7, W, H),
    level: 1,
    hearts: 3,
    ammo: 0,
    timeLeft: 0,
    objective: 'clear',
    people: [],
    shots: [],
    aimX: W / 2,
    aimY: H * 0.45,
    swayT: 0,
    breath: 1,
    exhausted: false,
    chamber: 0,
    recoil: 0,
    wind: 0,
    lstate: 'brief',
    stateT: 0,
    cam: null,
    crack: 0,
    levelShots: 0,
    levelHits: 0,
    levelKills: 0,
    levelHeads: 0,
    civHits: 0,
    score: 0,
    id: 1,
    stats: { score: 0, levels: 0, kills: 0, headshots: 0, stars: 0, longshot: 0 },
    tip: '',
    goalText: '',
    tipT: 0,
  }
}

export default function SniperGame() {
  const run = useActionRun('sniper')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(emptyWorld(360, 600))
  const phaseRef = useRef<Phase>('idle')
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const steadyRef = useRef(false)
  const keys = useRef({ l: false, r: false, u: false, d: false })
  const idleSeeded = useRef(false)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, time: 0, left: 0, vip: false, wind: 0, theme: 'City Rooftops' })
  const [breathUi, setBreathUi] = useState({ v: 1, out: false })
  const [glint, setGlint] = useState(false)
  const [steadyDown, setSteadyDown] = useState(false)
  const [cocking, setCocking] = useState(false)
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function show(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function targetsLeft(w: World) {
    if (w.objective === 'vip') return w.people.some((p) => p.kind === 'vip' && p.state !== 'dead') ? 1 : 0
    return w.people.filter((p) => (p.kind === 'hostile' || p.kind === 'sniper') && p.state !== 'dead').length
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: w.level, time: Math.ceil(w.timeLeft), left: targetsLeft(w), vip: w.objective === 'vip', wind: w.wind, theme: THEME_NAME[w.scene.theme] })
  }

  function distAt(y: number) {
    const pl = world.current.scene.plats
    for (const p of pl) if (p.y >= y - 2) return p.dist
    return pl[pl.length - 1].dist
  }

  function populate(w: World, seed: number, attract: boolean) {
    const r = rng(seed)
    const sc = w.scene
    const lvl = w.level
    w.people = []
    const add = (kind: PKind, plat: number, x?: number) => {
      const pl = sc.plats[plat]
      const px = x ?? pl.x0 + 12 + r() * Math.max(1, pl.x1 - pl.x0 - 24)
      const p: Person = {
        id: w.id++, kind, plat, x: clamp(px, Math.max(4, pl.x0 + 6), Math.min(sc.W - 4, pl.x1 - 6)), dir: r() < 0.5 ? -1 : 1,
        speed: (kind === 'civilian' ? 9 : 11 + Math.min(8, lvl)) * pl.s, state: kind === 'sniper' ? 'prone' : 'idle', t: r() * 2, tx: 0,
        crouch: 0, alert: 0, walk: r() * 6, fall: 0, shirt: kind === 'hostile' ? '#3f3f46' : kind === 'vip' ? '#1f2937' : SHIRTS[Math.floor(r() * SHIRTS.length)],
        glintT: 6 + r() * 4, glintOn: 0,
      }
      w.people.push(p)
      return p
    }
    const nPl = sc.plats.length
    const spec = attract ? null : SNIPER_LEVELS[lvl - 1]
    if (spec) {
      const at = (plat: number, fx: number) => {
        const pl = sc.plats[Math.min(nPl - 1, plat)]
        return pl.x0 + 12 + fx * Math.max(1, pl.x1 - pl.x0 - 24)
      }
      if (spec.objective === 'vip') {
        const plat = Math.min(nPl - 1, spec.vip ?? 1)
        const pl = sc.plats[plat]
        const v = add('vip', plat, pl.x0 + 14)
        v.dir = 1
        v.state = 'walk'
        v.tx = pl.x1 - 8
        v.speed = (pl.x1 - pl.x0 - 22) / (40 + r() * 6)
      }
      for (const [pi, fx] of spec.hostiles) add('hostile', Math.min(nPl - 1, pi), at(pi, fx))
      for (const [pi, fx] of spec.civilians ?? []) add('civilian', Math.min(nPl - 1, pi), at(pi, fx))
      ;(spec.snipers ?? []).forEach(([pi, fx], i) => {
        const plat = Math.min(nPl - 1, pi)
        const pl = sc.plats[plat]
        // Prone snipers never move, so keep them clear of cover (always shootable).
        let x = at(pi, fx)
        const h = PERSON_H * pl.s
        for (let k = 0; k < 2; k++)
          for (const c of pl.covers) if (Math.abs(x - c.x) < c.w / 2 + h * 0.7) x = c.x + (x >= c.x ? 1 : -1) * (c.w / 2 + h * 0.75)
        x = clamp(x, pl.x0 + h * 0.6, pl.x1 - h * 0.6)
        const sn = add('sniper', plat, x)
        sn.glintT = 6 + i * 3.5 + r() * 2
      })
      return
    }
    if (w.objective === 'vip') {
      const plat = 1 + Math.floor(r() * 2)
      const pl = sc.plats[plat]
      const v = add('vip', plat, pl.x0 + 14)
      v.dir = 1
      v.state = 'walk'
      v.tx = pl.x1 - 8
      v.speed = (pl.x1 - pl.x0 - 22) / (38 + r() * 8)
      add('hostile', plat, pl.x0 + 4)
      add('hostile', Math.min(nPl - 1, plat + 1))
    }
    const hostiles = Math.min(8, 2 + Math.ceil(lvl / 2)) - (w.objective === 'vip' ? 2 : 0)
    for (let i = 0; i < hostiles; i++) add('hostile', Math.floor(r() * nPl))
    const civ = attract ? 2 : Math.min(4, 1 + Math.floor(lvl / 3))
    for (let i = 0; i < civ; i++) add('civilian', Math.floor(r() * nPl))
    const snipers = attract ? 0 : lvl >= 8 ? 1 + (r() < 0.4 ? 1 : 0) : lvl >= 4 && r() < 0.6 ? 1 : 0
    for (let i = 0; i < snipers; i++) {
      const s = add('sniper', i % 2, undefined)
      s.glintT = 5 + i * 3 + r() * 3
    }
  }

  function setupLevel(retry: boolean) {
    const w = world.current
    const { w: W, h: H } = size.current
    const spec = SNIPER_LEVELS[w.level - 1]
    // Authored missions keep their layout on a retry; generated ones reshuffle.
    const seed = spec ? spec.seed : w.level * 977 + (retry ? Math.floor(Math.random() * 10000) : 0) + 13
    w.scene = buildScene(spec ? spec.theme : themeFor(w.level), seed, W, H)
    w.objective = spec ? spec.objective : w.level % 3 === 0 ? 'vip' : 'clear'
    populate(w, seed, false)
    const hostiles = w.people.filter((p) => p.kind !== 'civilian').length
    const needed = w.objective === 'vip' ? 1 : hostiles
    w.ammo = (spec?.ammo ?? needed + (w.objective === 'vip' ? hostiles - 1 : 0) + 3) + run.level('mag')
    const vip = w.people.find((p) => p.kind === 'vip')
    w.timeLeft = vip ? Math.abs(vip.tx - vip.x) / vip.speed + 1 : (spec?.time ?? Math.min(95, 32 + hostiles * 9))
    w.wind = spec ? spec.wind : w.level <= 2 ? 0 : Math.round(rand(-1, 1) * Math.min(8, 1 + w.level * 0.5))
    w.shots = []
    w.breath = 1
    w.exhausted = false
    w.chamber = 0
    w.recoil = 0
    w.cam = null
    w.crack = 0
    w.lstate = 'brief'
    w.stateT = 0
    w.levelShots = 0
    w.levelHits = 0
    w.levelKills = 0
    w.levelHeads = 0
    w.civHits = 0
    w.aimX = W / 2
    w.aimY = H * 0.5
    const goal = w.objective === 'vip' ? 'Eliminate the VIP in the suit' : `Eliminate ${hostiles} hostile${hostiles > 1 ? 's' : ''}`
    show(`LEVEL ${w.level}`, retry ? 'retry' : spec ? (w.level % 5 === 0 ? `boss · ${spec.name}` : spec.name) : THEME_NAME[w.scene.theme])
    w.goalText = goal
    w.tip = spec?.tip ?? ''
    w.tipT = 5
    sfx.ready()
    pushHud()
    setGlint(false)
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const { w: W, h: H } = size.current
    const w = emptyWorld(W, H)
    w.level = Math.max(1, Math.floor(level))
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    setupLevel(false)
  }

  function loseHeart(reason: string, sub: string) {
    const w = world.current
    w.hearts -= 1
    fx.flash('#ef4444', 0.35)
    fx.shake(10, 0.4)
    sfx.hurt()
    haptic.heavy()
    show(reason, w.hearts > 0 ? sub : undefined)
    pushHud()
    if (w.hearts <= 0) die()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.stats.levels * 4 + w.stats.stars * 2 + w.stats.headshots * 0.5 + 3)
      run.end({ score: w.score, cleared: w.stats.levels >= 3, stats: { ...w.stats }, coins }, revive)
    }, 1200)
  }

  function revive() {
    const w = world.current
    w.hearts = 2
    setupLevel(true)
    show('REVIVED!', 'level restarted')
    setPhaseBoth('play')
  }

  function alertAround(x: number, y: number, r: number) {
    const w = world.current
    for (const p of w.people) {
      if (p.state === 'dead' || p.state === 'gone' || p.state === 'prone') continue
      const pl = w.scene.plats[p.plat]
      if (Math.hypot(p.x - x, pl.y - y) > r) continue
      if (p.kind === 'civilian') {
        p.state = 'flee'
        p.dir = p.x - pl.x0 < pl.x1 - p.x ? -1 : 1
      } else {
        p.alert = 8
        if (p.kind === 'vip') p.speed *= 1.25
        else if (p.state !== 'hide' && p.state !== 'tohide') goHide(p)
      }
    }
  }

  function goHide(p: Person) {
    const pl = world.current.scene.plats[p.plat]
    if (!pl.covers.length) return
    let best = pl.covers[0]
    for (const c of pl.covers) if (Math.abs(c.x - p.x) < Math.abs(best.x - p.x)) best = c
    p.state = 'tohide'
    p.tx = best.x + rand(-2, 2)
    p.dir = p.tx > p.x ? 1 : -1
  }

  function fire() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.lstate !== 'live' || w.cam) return
    if (w.chamber > 0) return
    if (w.ammo <= 0) {
      sfx.tick()
      return
    }
    const sw = sway(w)
    const ax = w.aimX + sw.x
    const ay = w.aimY + sw.y
    const d = distAt(ay)
    w.ammo -= 1
    w.levelShots += 1
    w.chamber = 0.85
    w.recoil = 1
    setCocking(true)
    w.shots.push({ x: ax + drift(d, w.wind), y: ay + drop(d), sx: ax, sy: ay, t: 0, travel: d / BULLET_SPEED, d })
    fx.shake(7, 0.18)
    sfx.boom(0.3)
    sfx.shoot()
    haptic.medium()
    pushHud()
  }

  function resolve(s: Shot) {
    const w = world.current
    const sc = w.scene
    const res = hitTest(sc, s.x, s.y, (plat) => {
      const pl = sc.plats[plat]
      for (const p of w.people) {
        if (p.plat !== plat || p.state === 'dead' || p.state === 'gone') continue
        const h = PERSON_H * pl.s
        if (p.kind === 'sniper') {
          const hx = p.x + p.dir * h * 0.26
          if (Math.hypot(s.x - hx, s.y - (pl.y - h * 0.14)) < h * 0.12) return { p, head: true }
          const xa = Math.min(p.x - p.dir * h * 0.5, p.x + p.dir * h * 0.3)
          if (s.x >= xa && s.x <= xa + h * 0.8 && s.y >= pl.y - h * 0.22 && s.y <= pl.y) return { p, head: false }
          continue
        }
        const hh = h * (1 - p.crouch * 0.5)
        if (Math.hypot(s.x - p.x, s.y - (pl.y - hh + h * 0.12)) < h * 0.135) return { p, head: true }
        if (Math.abs(s.x - p.x) < h * 0.17 && s.y >= pl.y - hh + h * 0.23 && s.y <= pl.y) return { p, head: false }
      }
      return null
    })
    if (res && 'person' in res) {
      const { p, head } = res.person
      const pl = sc.plats[p.plat]
      if (p.kind === 'civilian') {
        p.state = 'dead'
        w.civHits += 1
        w.score = Math.max(0, w.score - 500)
        w.stats.score = w.score
        fx.burst(s.x, s.y, { count: 10, color: ['#ef4444', '#7f1d1d'], speed: 40, size: 1.2, gravity: 60, life: 0.6 })
        alertAround(p.x, pl.y, 140)
        loseHeart('CIVILIAN HIT!', '-1 heart · check for red caps')
        return
      }
      p.state = 'dead'
      p.t = 0
      w.levelHits += 1
      w.levelKills += 1
      w.stats.kills += 1
      if (head) {
        w.levelHeads += 1
        w.stats.headshots += 1
      }
      w.stats.longshot = Math.max(w.stats.longshot, s.d)
      const pts = Math.round((100 + s.d / 2) * (head ? 2 : 1) * (p.kind === 'vip' ? 3 : p.kind === 'sniper' ? 1.5 : 1))
      w.score += pts
      w.stats.score = w.score
      fx.burst(s.x, s.y, { count: head ? 14 : 9, color: ['#dc2626', '#991b1b', '#fca5a5'], speed: head ? 60 : 40, size: 1.3, gravity: 80, life: 0.7 })
      fx.text(s.x, s.y - 14, head ? `HEADSHOT ${s.d} m` : `${s.d} m`, head ? '#fde047' : '#ffffff', 12)
      fx.text(s.x, s.y - 28, `+${pts}`, '#fef08a', 11)
      sfx.hit()
      sfx.thud()
      haptic.success()
      alertAround(p.x, pl.y, 90)
      const last = targetsLeft(w) === 0
      if ((head && s.d >= 300) || last) {
        w.cam = { x: s.x, y: s.y, t: 0, d: s.d, from: s.sx < s.x ? -1 : 1 }
        fx.slowmo(0.4, 0.2)
        sfx.whoosh()
      }
      run.update(w.stats)
      pushHud()
    } else if (res) {
      fx.burst(s.x, s.y, { count: 8, color: ['#a8a29e', '#d6d3d1', '#78716c'], speed: 30, size: 1.2, gravity: 30, life: 0.6 })
      fx.burst(s.x, s.y, { count: 4, color: '#fde047', speed: 50, size: 0.8, gravity: 0, life: 0.2, shape: 'spark' })
      sfx.thud()
      alertAround(s.x, s.y, 70)
    } else {
      fx.ring(s.x, s.y, { color: 'rgba(255,255,255,0.6)', maxR: 6, life: 0.3, width: 1 })
      sfx.miss()
      alertAround(s.x, s.y, 50)
    }
  }

  function levelClear() {
    const w = world.current
    w.lstate = 'clear'
    w.stateT = 0
    const acc = w.levelShots ? w.levelHits / w.levelShots : 0
    const s2 = w.civHits === 0 && acc >= 0.6
    const s3 = s2 && w.levelKills > 0 && w.levelHeads >= Math.ceil(w.levelKills / 2)
    const stars = 1 + (s2 ? 1 : 0) + (s3 ? 1 : 0)
    const bonus = Math.round(w.timeLeft) * 10 + stars * 250 + w.ammo * 50
    w.score += bonus
    w.stats.score = w.score
    w.stats.stars += stars
    w.stats.levels += 1
    const res = run.completeLevel(w.level, stars)
    show(`LEVEL ${w.level} CLEAR`, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  +${bonus}`)
    sfx.win()
    haptic.success()
    if (res.firstClear && w.level % 5 === 0) void trackEvent('action_milestone', { game_id: 'sniper', kind: 'level', value: w.level })
    run.update(w.stats)
    pushHud()
  }

  function levelFail(reason: string) {
    const w = world.current
    w.lstate = 'fail'
    w.stateT = 0
    loseHeart('MISSION FAILED', reason)
  }

  function sway(w: World) {
    const steadyLvl = run.level('steady')
    const st = w.swayT
    let A = 2.3 * (1 + Math.min(0.6, w.level * 0.03)) * (1 - steadyLvl * 0.15)
    if (steadyRef.current && !w.exhausted) A *= 0.16
    else if (w.exhausted) A *= 1.7
    const beat = Math.max(0, Math.sin(st * 7.5)) ** 12 * 0.6
    return {
      x: A * (Math.sin(st * 1.1) * 0.7 + Math.sin(st * 2.3 + 1) * 0.3),
      y: A * (Math.sin(st * 1.7 + 2) * 0.6 + Math.sin(st * 0.9) * 0.4 + beat),
    }
  }

  function updatePeople(dt: number) {
    const w = world.current
    const sc = w.scene
    for (const p of w.people) {
      const pl = sc.plats[p.plat]
      p.alert = Math.max(0, p.alert - dt)
      const moving = p.state === 'walk' || p.state === 'tohide' || p.state === 'flee'
      if (moving) p.walk += dt * (p.state === 'flee' ? 14 : 8)
      const wantCrouch = p.state === 'hide' ? 1 : 0
      p.crouch += (wantCrouch - p.crouch) * Math.min(1, dt * 6)
      switch (p.state) {
        case 'walk':
        case 'tohide': {
          const sp = p.speed * (p.alert > 0 && p.kind !== 'vip' ? 1.8 : 1)
          p.dir = p.tx > p.x ? 1 : -1
          p.x += p.dir * sp * dt
          if (Math.abs(p.tx - p.x) < sp * dt + 0.5) {
            p.x = p.tx
            if (p.kind === 'vip') {
              p.state = 'gone'
              break
            }
            if (p.state === 'tohide') {
              p.state = 'hide'
              p.t = rand(2, 4) + (p.alert > 0 ? 2.5 : 0)
            } else {
              p.state = 'idle'
              p.t = rand(0.8, 2.6)
            }
          }
          break
        }
        case 'idle':
          p.t -= dt
          if (p.t <= 0) {
            if (p.kind !== 'civilian' && Math.random() < 0.4 + Math.min(0.3, w.level * 0.03)) goHide(p)
            else {
              p.state = 'walk'
              p.tx = pl.x0 + 8 + Math.random() * Math.max(1, pl.x1 - pl.x0 - 16)
              p.tx = clamp(p.tx, 6, sc.W - 6)
            }
          }
          break
        case 'hide':
          p.t -= dt
          if (p.t <= 0) {
            p.state = 'peek'
            p.t = rand(1.2, 2.4)
          }
          break
        case 'peek':
          p.t -= dt
          if (p.t <= 0) {
            if (p.alert > 0) {
              p.state = 'hide'
              p.t = rand(1.5, 3)
            } else {
              p.state = 'idle'
              p.t = 0.3
            }
          }
          break
        case 'flee':
          p.x += p.dir * p.speed * 3 * dt
          if (p.x < pl.x0 - 4 || p.x > pl.x1 + 4 || p.x < -10 || p.x > sc.W + 10) p.state = 'gone'
          break
        case 'dead':
          if (!w.cam) p.fall = Math.min(1, p.fall + dt * 3)
          break
        case 'prone':
          if (phaseRef.current === 'play' && w.lstate === 'live') {
            if (p.glintOn > 0) {
              p.glintOn -= dt
              if (p.glintOn <= 0) {
                p.glintT = rand(8, 11)
                w.crack = 1.6
                sfx.boom(0.6)
                fx.flash('#ffffff', 0.25)
                loseHeart('YOU WERE HIT!', 'kill snipers when they glint')
              }
            } else {
              p.glintT -= dt
              if (p.glintT <= 0) {
                p.glintOn = Math.max(1.8, 3 - w.level * 0.06)
                sfx.tick()
              }
            }
          }
          break
      }
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    drag.current = { id: e.pointerId, x: p.x, y: p.y }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const p = localPoint(e, e.currentTarget)
    const w = world.current
    const { w: W, h: H } = size.current
    w.aimX = clamp(w.aimX + (p.x - d.x) * 0.6, 4, W - 4)
    w.aimY = clamp(w.aimY + (p.y - d.y) * 0.6, 4, H - 4)
    d.x = p.x
    d.y = p.y
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id === e.pointerId) drag.current = null
  }

  function setSteady(v: boolean) {
    steadyRef.current = v
    setSteadyDown(v)
  }

  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__lv4sniper = {
        world,
        fire: () => fire(),
        steady: (v: boolean) => setSteady(v),
        sway: () => sway(world.current),
        drop,
        drift,
        distAt: (y: number) => distAt(y),
        probe(x: number, y: number) {
          const w = world.current
          const sc = w.scene
          const res = hitTest(sc, x, y, (plat) => {
            const pl = sc.plats[plat]
            for (const p of w.people) {
              if (p.plat !== plat || p.state === 'dead' || p.state === 'gone') continue
              const h = PERSON_H * pl.s
              if (p.kind === 'sniper') {
                const xa = Math.min(p.x - p.dir * h * 0.5, p.x + p.dir * h * 0.3)
                if (x >= xa - 1 && x <= xa + h * 0.8 + 1 && y >= pl.y - h * 0.3 && y <= pl.y) return p
                continue
              }
              const hh = h * (1 - p.crouch * 0.5)
              if (Math.abs(x - p.x) < h * 0.17 + 1 && y >= pl.y - hh && y <= pl.y) return p
            }
            return null
          })
          return res && 'person' in res ? res.person : res ? 'solid' : null
        },
        speed(v: number) {
          devSpeed = v
        },
      }
    }
    function key(e: KeyboardEvent, down: boolean) {
      const k = e.key
      if (k === 'ArrowLeft') keys.current.l = down
      else if (k === 'ArrowRight') keys.current.r = down
      else if (k === 'ArrowUp') keys.current.u = down
      else if (k === 'ArrowDown') keys.current.d = down
      else if (k === 'Shift') setSteady(down)
      else if ((k === ' ' || k === 'Enter') && down) fire()
      else return
      e.preventDefault()
    }
    const kd = (e: KeyboardEvent) => key(e, true)
    const ku = (e: KeyboardEvent) => key(e, false)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [])

  function frame({ ctx, w: W, h: H, raw: raw0, t }: Frame) {
    const raw = raw0 * devSpeed
    if (size.current.w !== W || size.current.h !== H || !idleSeeded.current) {
      size.current = { w: W, h: H }
      if (phaseRef.current === 'idle') {
        const w0 = emptyWorld(W, H)
        w0.scene = buildScene('city', 5, W, H)
        populate(w0, 5, true)
        world.current = w0
        idleSeeded.current = true
      }
    }
    const w = world.current
    const sc = w.scene
    const ph = phaseRef.current
    const night = sc.theme === 'harbor'
    const camOn = !!w.cam
    const dt = camOn ? 0 : fx.step(raw)
    if (camOn) fx.step(raw * 0.25)
    const playing = ph === 'play'

    if (ph === 'idle') {
      w.aimX = W / 2 + Math.sin(t * 0.35) * W * 0.3
      w.aimY = H * 0.5 + Math.sin(t * 0.5) * H * 0.18
      updatePeople(raw)
    } else if (playing || ph === 'dying') {
      w.swayT += dt
      w.stateT += raw
      // Keyboard aim
      const kv = 70 * dt
      if (keys.current.l) w.aimX = clamp(w.aimX - kv, 4, W - 4)
      if (keys.current.r) w.aimX = clamp(w.aimX + kv, 4, W - 4)
      if (keys.current.u) w.aimY = clamp(w.aimY - kv, 4, H - 4)
      if (keys.current.d) w.aimY = clamp(w.aimY + kv, 4, H - 4)
      // Breath
      const lungs = 1 + run.level('steady') * 0.2
      if (steadyRef.current && !w.exhausted && w.lstate === 'live') {
        w.breath -= dt / (3.2 * lungs)
        if (w.breath <= 0) {
          w.breath = 0
          w.exhausted = true
          sfx.miss()
        }
      } else {
        w.breath = Math.min(1, w.breath + dt / (w.exhausted ? 3.5 : 2.5))
        if (w.exhausted && w.breath >= 0.6) w.exhausted = false
      }
      if (Math.floor(t * 10) !== Math.floor((t - raw) * 10)) setBreathUi((b) => (Math.abs(b.v - w.breath) > 0.02 || b.out !== w.exhausted ? { v: w.breath, out: w.exhausted } : b))
      if (w.chamber > 0) {
        w.chamber -= dt
        if (w.chamber <= 0) {
          sfx.clang()
          setCocking(false)
        }
      }
      w.recoil = Math.max(0, w.recoil - dt * 3.5)
      w.crack = Math.max(0, w.crack - raw)

      if (w.lstate === 'brief') {
        updatePeople(dt)
        if (w.stateT > 1.4) {
          w.lstate = 'live'
          w.stateT = 0
        }
      } else if (w.lstate === 'live') {
        updatePeople(dt)
        w.timeLeft -= dt
        for (const s of w.shots) {
          s.t += dt
          if (s.t >= s.travel) resolve(s)
        }
        w.shots = w.shots.filter((s) => s.t < s.travel)
        if (Math.floor(w.timeLeft) !== Math.floor(w.timeLeft + dt)) {
          pushHud()
          if (w.timeLeft < 10 && w.timeLeft > 0) sfx.tick()
        }
        if (playing && w.lstate === 'live' && !w.cam) {
          const vip = w.people.find((p) => p.kind === 'vip')
          if (targetsLeft(w) === 0) levelClear()
          else if (vip && vip.state === 'gone') levelFail('the VIP escaped')
          else if (w.timeLeft <= 0) levelFail('time is up')
          else if (w.ammo <= 0 && w.shots.length === 0) levelFail('out of ammo')
        }
        const g = w.people.some((p) => p.kind === 'sniper' && p.state === 'prone' && p.glintOn > 0)
        setGlint((cur) => (cur === g ? cur : g))
      } else if (w.lstate === 'clear') {
        updatePeople(dt)
        if (w.stateT > 3 && playing) {
          w.level += 1
          setupLevel(false)
        }
      } else if (w.lstate === 'fail') {
        if (w.stateT > 2.4 && playing) setupLevel(true)
      }
    }
    if (w.cam) {
      w.cam.t += raw
      if (w.cam.t > 1.6) w.cam = null
    }

    /** Particles only: floating text would be blown up by the zoom. */
    const drawFxMagnified = () => {
      const fl = fx.floaters
      fx.floaters = []
      fx.draw(ctx)
      fx.floaters = fl
    }

    const drawPeopleOn = (plat: number) => {
      const pl = sc.plats[plat]
      for (const p of w.people) {
        if (p.plat !== plat || p.state === 'gone') continue
        drawPerson(ctx, p.kind, p.x, pl.y, pl.s, p.dir, p.walk, p.crouch, p.fall, p.shirt, night, t)
        if (p.kind === 'sniper' && p.state === 'prone' && p.glintOn > 0) {
          const h = PERSON_H * pl.s
          const gx = p.x + p.dir * h * 0.55
          const gy = pl.y - h * 0.16
          const k = 0.6 + 0.4 * Math.sin(t * 20)
          ctx.strokeStyle = `rgba(255,255,240,${k})`
          ctx.lineWidth = 1
          ctx.beginPath()
          const L = 7 * k
          ctx.moveTo(gx - L, gy)
          ctx.lineTo(gx + L, gy)
          ctx.moveTo(gx, gy - L)
          ctx.lineTo(gx, gy + L)
          ctx.stroke()
          ctx.fillStyle = '#fffbeb'
          ctx.beginPath()
          ctx.arc(gx, gy, 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    // ── Bullet cam ──────────────────────────────
    if (w.cam) {
      const c = w.cam
      const k = Math.min(1, c.t / 0.95)
      const Zc = 6 + c.t * 2
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)
      ctx.save()
      ctx.translate(W / 2, H / 2)
      ctx.scale(Zc, Zc)
      ctx.translate(-c.x, -c.y)
      const half = Math.max(W, H) / Zc
      drawScene(ctx, sc, [c.x - half, c.y - half, c.x + half, c.y + half], drawPeopleOn)
      const bx = c.x + c.from * (1 - k * k) * (W / Zc) * 0.6
      const by = c.y + (1 - k * k) * (H / Zc) * 0.25
      if (k < 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'
        ctx.lineWidth = 0.4
        for (let i = 1; i <= 4; i++) {
          const rx = bx + c.from * i * 3
          const ry = by + i * 1.2
          ctx.beginPath()
          ctx.ellipse(rx, ry, 0.6, 1.4 + i * 0.2, Math.sin(c.t * 30 + i) * 0.5, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.save()
        ctx.translate(bx, by)
        ctx.rotate(Math.atan2(c.y - by, c.x - bx))
        ctx.fillStyle = '#d97706'
        ctx.fillRect(-2.2, -0.55, 1.6, 1.1)
        ctx.fillStyle = '#fbbf24'
        ctx.beginPath()
        ctx.moveTo(-0.6, -0.55)
        ctx.lineTo(1.2, -0.3)
        ctx.lineTo(1.8, 0)
        ctx.lineTo(1.2, 0.3)
        ctx.lineTo(-0.6, 0.55)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      drawFxMagnified()
      ctx.restore()
      // Letterbox + caption
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H * 0.12)
      ctx.fillRect(0, H * 0.88, W, H * 0.12)
      ctx.fillStyle = '#fde047'
      ctx.font = "900 15px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`BULLET CAM · ${c.d} m`, W / 2, H * 0.94)
      fx.drawOverlay(ctx, W, H)
      return
    }

    // ── Full view ───────────────────────────────
    fx.applyShake(ctx)
    drawScene(ctx, sc, null, drawPeopleOn)
    fx.draw(ctx)
    ctx.restore()
    // Darken everything outside the scope to focus the eye.
    ctx.fillStyle = 'rgba(2,6,23,0.38)'
    ctx.fillRect(0, 0, W, H)

    // ── Scope lens ──────────────────────────────
    const R = Math.min(W, H) * 0.28
    const optics = playing ? run.level('optics') : 0
    const Z = 3.2 * (optics >= 3 ? 1.25 : 1)
    const sw = ph === 'idle' ? { x: 0, y: 0 } : sway(w)
    const lx = clamp(w.aimX, R + 4, W - R - 4)
    const ly = clamp(w.aimY, R + 64, H - R - 104)
    const vx = w.aimX + sw.x
    const vy = w.aimY + sw.y - w.recoil * 10
    // Aim marker in the full view when the lens is offset.
    if (Math.hypot(lx - w.aimX, ly - w.aimY) > 6) {
      ctx.strokeStyle = 'rgba(248,113,113,0.9)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.arc(w.aimX, w.aimY, 6, 0, Math.PI * 2)
      ctx.moveTo(w.aimX - 9, w.aimY)
      ctx.lineTo(w.aimX + 9, w.aimY)
      ctx.moveTo(w.aimX, w.aimY - 9)
      ctx.lineTo(w.aimX, w.aimY + 9)
      ctx.stroke()
    }
    ctx.save()
    ctx.beginPath()
    ctx.arc(lx, ly, R, 0, Math.PI * 2)
    ctx.clip()
    ctx.fillStyle = '#000'
    ctx.fillRect(lx - R, ly - R, R * 2, R * 2)
    ctx.translate(lx, ly)
    ctx.scale(Z, Z)
    ctx.translate(-vx, -vy)
    const vr = R / Z + 4
    drawScene(ctx, sc, [vx - vr, vy - vr, vx + vr, vy + vr], drawPeopleOn)
    // Tracers in flight
    for (const s of w.shots) {
      const k = s.t / s.travel
      const tx = s.sx + (s.x - s.sx) * k
      const ty = s.sy + (s.y - s.sy) * k
      ctx.strokeStyle = 'rgba(254,243,199,0.8)'
      ctx.lineWidth = 0.6
      ctx.beginPath()
      ctx.moveTo(tx, ty + (1 - k) * 18)
      ctx.lineTo(tx, ty)
      ctx.stroke()
    }
    drawFxMagnified()
    ctx.restore()
    if (night) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(lx, ly, R, 0, Math.PI * 2)
      ctx.clip()
      ctx.fillStyle = 'rgba(34,197,94,0.12)'
      ctx.fillRect(lx - R, ly - R, R * 2, R * 2)
      ctx.restore()
    }
    // Lens vignette and rim
    const vg = ctx.createRadialGradient(lx, ly, R * 0.7, lx, ly, R)
    vg.addColorStop(0, 'rgba(0,0,0,0)')
    vg.addColorStop(1, 'rgba(0,0,0,0.75)')
    ctx.fillStyle = vg
    ctx.beginPath()
    ctx.arc(lx, ly, R, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 9
    ctx.beginPath()
    ctx.arc(lx, ly, R + 3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = '#475569'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(lx, ly, R + 7, 0, Math.PI * 2)
    ctx.stroke()
    // Reticle
    const rc = night ? 'rgba(134,239,172,0.9)' : 'rgba(15,23,42,0.85)'
    ctx.strokeStyle = rc
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(lx - R, ly)
    ctx.lineTo(lx - 8, ly)
    ctx.moveTo(lx + 8, ly)
    ctx.lineTo(lx + R, ly)
    ctx.moveTo(lx, ly - R)
    ctx.lineTo(lx, ly - 8)
    ctx.moveTo(lx, ly + 8)
    ctx.lineTo(lx, ly + R)
    ctx.stroke()
    // Wind ticks (every 2 m/s at 400 m)
    const wt = drift(400, 2) * Z
    for (let i = 1; i <= 4; i++) {
      for (const sd of [-1, 1]) {
        ctx.beginPath()
        ctx.moveTo(lx + sd * wt * i, ly - 3)
        ctx.lineTo(lx + sd * wt * i, ly + 3)
        ctx.stroke()
      }
    }
    // Bullet-drop ticks
    ctx.font = "700 8px 'Plus Jakarta Sans', system-ui, sans-serif"
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = rc
    for (const d of [300, 400, 500, 600]) {
      const yy = ly + drop(d) * Z
      if (yy > ly + R - 6) continue
      ctx.beginPath()
      ctx.moveTo(lx - 6, yy)
      ctx.lineTo(lx + 6, yy)
      ctx.stroke()
      ctx.fillText(`${d}`, lx + 9, yy)
    }
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.arc(lx, ly, 1.8, 0, Math.PI * 2)
    ctx.fill()
    // Range readout + optics marker
    if (ph !== 'idle') {
      const d = distAt(vy)
      ctx.fillStyle = night ? '#bbf7d0' : '#f8fafc'
      ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.fillText(`${d} m`, lx, ly + R - 14)
      if (optics >= 1) {
        const mx = lx + (optics >= 2 ? drift(d, w.wind) * Z : 0)
        const my = ly + drop(d) * Z
        ctx.strokeStyle = '#f43f5e'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(mx, my, 3.5, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (w.chamber > 0) {
        ctx.fillStyle = 'rgba(254,243,199,0.9)'
        ctx.fillText('CHAMBERING…', lx, ly - R + 16)
      }
    }

    // Hearts + ammo
    if (ph !== 'idle') {
      const cx = W / 2
      const by = H - 26
      for (let i = 0; i < 3; i++) {
        const hx = cx - 26 + i * 26
        ctx.fillStyle = i < w.hearts ? '#ef4444' : 'rgba(255,255,255,0.2)'
        ctx.beginPath()
        ctx.moveTo(hx, by - 30)
        ctx.bezierCurveTo(hx - 11, by - 38, hx - 7, by - 48, hx, by - 42)
        ctx.bezierCurveTo(hx + 7, by - 48, hx + 11, by - 38, hx, by - 30)
        ctx.fill()
      }
      const n = Math.min(14, w.ammo)
      for (let i = 0; i < n; i++) {
        const ax = cx - (n - 1) * 4.5 + i * 9
        ctx.fillStyle = '#b45309'
        ctx.fillRect(ax - 2.5, by - 6, 5, 12)
        ctx.fillStyle = '#fbbf24'
        ctx.beginPath()
        ctx.moveTo(ax - 2.5, by - 6)
        ctx.lineTo(ax, by - 13)
        ctx.lineTo(ax + 2.5, by - 6)
        ctx.fill()
      }
      if (w.ammo > 14) {
        ctx.fillStyle = '#fff'
        ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.fillText(`+${w.ammo - 14}`, cx + 70, by)
      }
    }

    // Mission goal + tip for the first seconds of a level.
    if (ph === 'play' && w.tipT > 0) {
      w.tipT = Math.max(0, w.tipT - raw)
      ctx.globalAlpha = Math.min(1, w.tipT, (5 - w.tipT) * 3)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
      const tw = Math.min(W - 24, Math.max(ctx.measureText(w.goalText).width, w.tip ? ctx.measureText(w.tip).width : 0) + 28)
      const bh = w.tip ? 44 : 28
      const by0 = H - 128 - bh
      ctx.fillStyle = 'rgba(2,6,23,0.7)'
      ctx.beginPath()
      ctx.roundRect((W - tw) / 2, by0, tw, bh, 12)
      ctx.fill()
      ctx.fillStyle = '#fde68a'
      ctx.fillText(w.goalText, W / 2, by0 + 14, W - 40)
      if (w.tip) {
        ctx.fillStyle = '#e2e8f0'
        ctx.font = "700 11px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.fillText(w.tip, W / 2, by0 + 31, W - 40)
      }
      ctx.globalAlpha = 1
    }
    // Cracked glass when hit by a sniper
    if (w.crack > 0) {
      ctx.globalAlpha = Math.min(1, w.crack)
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'
      ctx.lineWidth = 1.5
      const ox = W * 0.62
      const oy = H * 0.4
      ctx.beginPath()
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.3
        let px = ox
        let py = oy
        ctx.moveTo(px, py)
        for (let k = 0; k < 4; k++) {
          px += Math.cos(a + Math.sin(i * 7 + k) * 0.4) * 34
          py += Math.sin(a + Math.sin(i * 3 + k) * 0.4) * 34
          ctx.lineTo(px, py)
        }
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const mm = Math.floor(Math.max(0, hud.time) / 60)
  const ss = Math.max(0, hud.time) % 60
  const windTxt = hud.wind === 0 ? 'WIND CALM' : `WIND ${hud.wind < 0 ? '←' : '→'} ${Math.abs(hud.wind)} m/s`

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score.toLocaleString()}</div>
                <div className="action-hud__small">
                  Level {hud.level} · {hud.theme}
                </div>
              </div>
              <div className="action-hud__right">
                <span className={`action-hud__score sn-time${hud.time <= 10 ? ' is-low' : ''}`} style={{ fontSize: '1.4rem' }}>
                  {mm}:{String(ss).padStart(2, '0')}
                </span>
                <span className="action-hud__small">{hud.vip ? 'Target: VIP' : `Targets ${hud.left}`}</span>
              </div>
            </div>
          )}
          {phase === 'play' && <div className="sn-wind">{windTxt}</div>}
          {glint && phase === 'play' ? <div className="sn-glint">SNIPER GLINT!</div> : null}
          {phase === 'play' && (
            <>
              <div className={`sn-breath${breathUi.out ? ' is-out' : ''}`}>
                <span style={{ width: `${Math.round(breathUi.v * 100)}%` }} />
              </div>
              <button
                type="button"
                className={`sn-btn sn-btn--steady${steadyDown ? ' is-down' : ''}`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  e.currentTarget.setPointerCapture(e.pointerId)
                  setSteady(true)
                }}
                onPointerUp={() => setSteady(false)}
                onPointerCancel={() => setSteady(false)}
                onLostPointerCapture={() => setSteady(false)}
              >
                STEADY
              </button>
              <button
                type="button"
                className={`sn-btn sn-btn--fire${cocking ? ' is-cocking' : ''}`}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  fire()
                }}
              >
                FIRE
              </button>
            </>
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
              game="sniper"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to move the scope, hold STEADY to calm your aim, tap FIRE. Red caps are hostiles — never hit civilians."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={world.current.stats.levels >= 3 ? 'Marksman!' : 'Mission over'}
            subtitle={`Score ${hud.score.toLocaleString()} · ${world.current.stats.levels} levels · ${world.current.stats.stars} stars`}
            celebrate={world.current.stats.levels >= 3}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
