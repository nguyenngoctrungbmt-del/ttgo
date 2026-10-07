import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, dist, glow, rand } from '../../shared/action/fx'
import { Stick, localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { drawObj } from './art'
import { BLOCK, ROAD, genCity, growth, type City, type Obj } from './city'
import { HOLE_LEVELS } from './levels'
import '../../shared/action/action.css'
import './hole.css'

const meta = getGame('hole')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type PickKind = 'clock' | 'vortex' | 'boost'

type Hole = {
  id: number
  x: number
  y: number
  r: number
  rt: number
  vx: number
  vy: number
  ai: boolean
  name: string
  color: string
  inv: number
  alive: boolean
  think: number
  tx: number
  ty: number
  spin: number
  dying: number
}

type Pickup = { x: number; y: number; kind: PickKind; ph: number; life: number }

const PICK: Record<PickKind, { color: string; label: string }> = {
  clock: { color: '#22d3ee', label: '+8 s' },
  vortex: { color: '#e879f9', label: 'VORTEX' },
  boost: { color: '#facc15', label: 'BOOST' },
}
/** Dev-only hooks for scripted tests: time multiplier and a steering override. */
let devSpeed = 1
let devMove: { x: number; y: number } | null = null

const RIVAL_NAMES = ['Gulp', 'Abyss', 'Vacuum', 'Muncher', 'Sinkhole', 'Void', 'Chomp', 'Crater']
const RIVAL_COLORS = ['#f43f5e', '#f97316', '#10b981', '#eab308', '#06b6d4', '#ec4899']

type World = {
  level: number
  city: City
  objs: Obj[]
  holes: Hole[]
  me: Hole | null
  left: number
  roundTime: number
  r0: number
  target: number
  star2: number
  star3: number
  cam: { x: number; y: number; z: number }
  pickups: Pickup[]
  pickTimer: number
  vortex: number
  boost: number
  combo: number
  comboT: number
  sndT: number
  score: number
  tickT: number
  hudT: number
  clearT: number
  initial: number
  lastStars: number
  reason: 'time' | 'rival' | null
  lastTrack: number
  clock: number
  warned: boolean
  stats: { score: number; level: number; swallowed: number; cars: number; rivals: number; stars: number; towers: number }
  clearedRun: number
  tip: string
  tipT: number
}

function freshWorld(): World {
  const city = genCity(1)
  return {
    level: 1,
    city,
    objs: city.objs,
    holes: [],
    me: null,
    left: 90,
    roundTime: 90,
    r0: 16,
    target: 50,
    star2: 60,
    star3: 70,
    cam: { x: city.size / 2, y: city.size / 2, z: 1 },
    pickups: [],
    pickTimer: 10,
    vortex: 0,
    boost: 0,
    combo: 0,
    comboT: 0,
    sndT: 0,
    score: 0,
    tickT: 0,
    hudT: 0,
    clearT: 0,
    initial: city.objs.length,
    lastStars: 0,
    reason: null,
    lastTrack: -99,
    clock: 0,
    warned: false,
    stats: { score: 0, level: 0, swallowed: 0, cars: 0, rivals: 0, stars: 0, towers: 0 },
    clearedRun: 0,
    tip: '',
    tipT: 0,
  }
}

let holeId = 1
function makeHole(x: number, y: number, r: number, ai: boolean, name: string, color: string): Hole {
  return { id: holeId++, x, y, r, rt: r, vx: 0, vy: 0, ai, name, color, inv: 0, alive: true, think: 0, tx: x, ty: y, spin: 0, dying: 0 }
}

/** Road intersections are always free of buildings — safe spawn points. */
function crossing(i: number, j: number) {
  return { x: i * (BLOCK + ROAD) + ROAD / 2, y: j * (BLOCK + ROAD) + ROAD / 2 }
}

export default function HoleGame() {
  const run = useActionRun('hole')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const stick = useRef(new Stick(56)).current
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const keys = useRef(new Set<string>())

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, left: 90, r: 16, r0: 16, target: 50, star2: 60, star3: 70, combo: 0, vortex: 0, boost: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [clearCard, setClearCard] = useState<{ level: number; stars: number; bonus: number } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function beginLevel(w: World, level: number, withPlayer: boolean) {
    const spec = withPlayer ? HOLE_LEVELS[level - 1] : undefined
    const city = genCity(level, spec)
    w.tip = spec?.tip ?? ''
    w.tipT = w.tip ? 5 : 0
    w.level = level
    w.city = city
    w.objs = city.objs
    // Flat things first, then buildings by height so tall roofs overlap short ones.
    w.objs.sort((a, b) => (a.kind === 'car' || a.kind === 'bus' ? 0 : a.height) - (b.kind === 'car' || b.kind === 'bus' ? 0 : b.height))
    w.initial = w.objs.length
    w.pickups = []
    w.pickTimer = 9
    w.vortex = 0
    w.boost = 0
    w.combo = 0
    w.warned = false
    w.r0 = 16 + (withPlayer ? run.level('size') * 3 : 0)
    const f = spec ? spec.f : Math.min(0.6, 0.35 + level * 0.03)
    w.target = Math.round(Math.sqrt(w.r0 * w.r0 + city.potential * f))
    w.star2 = Math.round(Math.sqrt(w.r0 * w.r0 + city.potential * (f + 0.14)))
    w.star3 = Math.round(Math.sqrt(w.r0 * w.r0 + city.potential * (f + 0.27)))
    w.roundTime = (spec?.time ?? 90) + (withPlayer ? run.level('time') * 5 : 0)
    w.left = w.roundTime
    w.holes = []
    const mid = Math.floor(city.n / 2)
    const c = crossing(mid, mid)
    if (withPlayer) {
      const me = makeHole(c.x, c.y, w.r0, false, 'You', '#a78bfa')
      me.inv = 1
      w.holes.push(me)
      w.me = me
    } else w.me = null
    const rivals = withPlayer ? (spec ? (spec.rivals ?? 0) : level >= 3 ? Math.min(4, 1 + Math.floor((level - 3) / 2)) : 0) : 2
    const corners = [
      [0, 0],
      [city.n, city.n],
      [city.n, 0],
      [0, city.n],
    ]
    for (let k = 0; k < rivals; k++) {
      const [i, j] = corners[k % 4]
      const p = crossing(i, j)
      const r = w.r0 * rand(0.85, 1.15) + Math.min(6, level * 0.3)
      w.holes.push(makeHole(p.x, p.y, r, true, RIVAL_NAMES[(level + k) % RIVAL_NAMES.length], RIVAL_COLORS[(level + k) % RIVAL_COLORS.length]))
    }
    w.cam = { x: c.x, y: c.y, z: w.cam.z }
  }

  function levelSub(w: World) {
    const spec = HOLE_LEVELS[w.level - 1]
    if (spec) return `${w.level % 5 === 0 ? 'boss · ' : ''}${spec.name} · size ${w.target}`
    return `${w.city.theme.name} · size ${w.target}`
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    world.current = w
    beginLevel(w, Math.max(1, Math.floor(level)), true)
    fx.reset()
    setClearCard(null)
    run.begin()
    setPhaseBoth('play')
    say(`LEVEL ${w.level}`, levelSub(w))
    sfx.ready()
    haptic.light()
  }

  function die(reason: 'time' | 'rival') {
    const w = world.current
    if (phaseRef.current !== 'play') return
    w.reason = reason
    setPhaseBoth('dying')
    fx.flash(reason === 'rival' ? '#ef4444' : '#6366f1', 0.3)
    fx.stop(0.12)
    fx.shake(reason === 'rival' ? 14 : 6, 0.4)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    say(reason === 'rival' ? 'SWALLOWED!' : "TIME'S UP!", reason === 'time' ? `size ${Math.round(w.me?.r ?? 0)} of ${w.target}` : undefined)
    window.setTimeout(() => {
      setPhaseBoth('over')
      w.stats.score = Math.round(w.score)
      const coins = Math.round(clamp(w.score / 260 + w.clearedRun * 4 + w.stats.stars, 3, 400))
      run.end({ score: w.stats.score, cleared: w.clearedRun >= 1, stats: { ...w.stats }, coins }, revive)
    }, 1150)
  }

  function revive() {
    const w = world.current
    const city = w.city
    if (w.reason === 'time') {
      w.left += 20
      say('REVIVED!', '+20 seconds')
    } else {
      // Respawn at the crossing farthest from every rival.
      let best = crossing(0, 0)
      let bestD = -1
      for (let i = 0; i <= city.n; i++) {
        for (let j = 0; j <= city.n; j++) {
          const p = crossing(i, j)
          const d = Math.min(...w.holes.filter((h) => h.ai && h.alive).map((h) => dist(h.x, h.y, p.x, p.y)), 1e9)
          if (d > bestD) {
            bestD = d
            best = p
          }
        }
      }
      const r = Math.max(w.r0, (w.me?.r ?? w.r0) * 0.9)
      const me = makeHole(best.x, best.y, r, false, 'You', '#a78bfa')
      me.inv = 2.5
      w.holes = w.holes.filter((h) => h.ai)
      w.holes.push(me)
      w.me = me
      say('REVIVED!', 'shielded for 2 s')
    }
    if (w.me) fx.ring(w.me.x, w.me.y, { color: '#c4b5fd', maxR: w.me.r * 3, life: 0.6, width: 6 })
    w.reason = null
    setPhaseBoth('play')
  }

  function clearLevel(early: boolean) {
    const w = world.current
    const me = w.me
    if (!me) return
    const stars = 1 + (me.r >= w.star2 ? 1 : 0) + (me.r >= w.star3 ? 1 : 0)
    const bonus = Math.round(w.left * 15 + stars * 400 + (early ? 1500 : 0))
    w.score += bonus
    w.stats.level = w.level
    w.stats.stars += stars
    w.stats.score = Math.round(w.score)
    w.lastStars = stars
    const res = run.completeLevel(w.level, stars)
    w.clearedRun += 1
    w.clearT = 3.2
    setPhaseBoth('clear')
    setClearCard({ level: w.level, stars, bonus })
    fx.flash('#ffffff', 0.2)
    fx.ring(me.x, me.y, { color: '#c4b5fd', maxR: me.r * 4, life: 0.7, width: 8 })
    sfx.win()
    haptic.success()
    run.update(w.stats)
    if (res.firstClear && (w.level % 5 === 0 || w.level === 3)) {
      if (w.clock - w.lastTrack > 30) {
        w.lastTrack = w.clock
        void trackEvent('action_milestone', { game_id: 'hole', kind: 'level', value: w.level })
      }
    }
  }

  function nextLevel() {
    const w = world.current
    beginLevel(w, w.level + 1, true)
    setClearCard(null)
    setPhaseBoth('play')
    say(`LEVEL ${w.level}`, levelSub(w))
    sfx.levelUp()
  }

  function swallowObj(w: World, h: Hole, o: Obj) {
    o.fall = 0
    o.fx = o.x
    o.fy = o.y
    o.owner = h.id
    h.rt = Math.sqrt(h.rt * h.rt + growth(o.size))
    if (h !== w.me) return
    w.stats.swallowed++
    if (o.kind === 'car' || o.kind === 'bus') w.stats.cars++
    if (o.kind === 'tower' || o.kind === 'sky' || o.kind === 'monument') w.stats.towers++
    w.combo = w.comboT > 0 ? w.combo + 1 : 1
    w.comboT = 1.1
    const pts = Math.max(1, Math.round(((o.size * o.size) / 8) * (1 + Math.min(20, w.combo) * 0.08)))
    w.score += pts
    w.stats.score = Math.round(w.score)
    const big = o.size >= 25
    if (pts >= 20 || w.combo % 10 === 0) fx.text(o.x, o.y - 12, w.combo >= 10 && w.combo % 10 === 0 ? `COMBO x${w.combo}` : `+${pts}`, big ? '#fde047' : '#e9d5ff', (big ? 22 : 15) / w.cam.z)
    if (w.sndT <= 0) {
      w.sndT = 0.06
      sfx.score(Math.min(10, w.combo))
    }
    if (big) {
      fx.shake(Math.min(12, o.size / 8), 0.3)
      fx.stop(Math.min(0.1, o.size / 900))
      fx.burst(o.x, o.y, { count: Math.min(30, Math.round(o.size / 3)), color: ['#a8a29e', '#78716c', '#e7e5e4', o.color], speed: o.size * 5, size: 4, shape: 'square', gravity: 0 })
      sfx.boom(Math.min(1, o.size / 120))
      haptic.medium()
      if (o.size >= 90) {
        fx.slowmo(0.5, 0.4)
        say(o.kind === 'monument' ? 'MONUMENT DOWN!' : 'SKYSCRAPER!', `+${pts}`)
      }
    } else if (w.combo % 5 === 0) haptic.light()
    run.update(w.stats)
  }

  function step(w: World, dt: number, ph: Phase, t: number) {
    const city = w.city
    w.clock += dt
    const me = w.me
    const size = city.size
    // Player movement.
    if (me && me.alive && ph === 'play') {
      const v = devMove ?? stick.vec()
      let kx = 0
      let ky = 0
      const k = keys.current
      if (k.has('ArrowLeft') || k.has('a')) kx -= 1
      if (k.has('ArrowRight') || k.has('d')) kx += 1
      if (k.has('ArrowUp') || k.has('w')) ky -= 1
      if (k.has('ArrowDown') || k.has('s')) ky += 1
      let dx = v.x
      let dy = v.y
      if (kx || ky) {
        const l = Math.hypot(kx, ky)
        dx = kx / l
        dy = ky / l
      }
      const spd = (120 + me.r * 1.7) * (1 + run.level('speed') * 0.08) * (w.boost > 0 ? 1.5 : 1)
      me.vx = approach(me.vx, dx * spd, 10, dt)
      me.vy = approach(me.vy, dy * spd, 10, dt)
    } else if (me) {
      me.vx = approach(me.vx, 0, 8, dt)
      me.vy = approach(me.vy, 0, 8, dt)
    }
    // Rival AI: chase food, hunt smaller holes, flee bigger ones.
    for (const h of w.holes) {
      if (!h.ai || !h.alive) continue
      h.think -= dt
      if (h.think <= 0) {
        h.think = 0.35 + Math.random() * 0.2
        let fled = false
        for (const o of w.holes) {
          if (o === h || !o.alive) continue
          const d = dist(o.x, o.y, h.x, h.y)
          if (o.r > h.r * 1.1 && d < o.r * 3 + 120) {
            h.tx = h.x + (h.x - o.x) * 2
            h.ty = h.y + (h.y - o.y) * 2
            fled = true
            break
          }
          // Rivals leave the player alone for the first seconds of a round.
          if (h.r > o.r * 1.15 && d < 380 && o.inv <= 0 && (o.ai || (ph === 'play' && w.roundTime - w.left > 10))) {
            h.tx = o.x + o.vx * 0.4
            h.ty = o.y + o.vy * 0.4
            fled = true
            break
          }
        }
        if (!fled) {
          let best = 0
          for (const o of w.objs) {
            if (!o.alive || o.fall >= 0 || o.size > h.r * 0.9) continue
            const d = Math.abs(o.x - h.x) + Math.abs(o.y - h.y)
            if (d > 700) continue
            const s = (o.size * o.size) / (d + 60)
            if (s > best) {
              best = s
              h.tx = o.x
              h.ty = o.y
            }
          }
          if (best === 0) {
            h.tx = rand(ROAD, size - ROAD)
            h.ty = rand(ROAD, size - ROAD)
          }
        }
      }
      const dx = h.tx - h.x
      const dy = h.ty - h.y
      const d = Math.hypot(dx, dy) || 1
      const spd = (95 + h.r * 1.4) * (0.75 + Math.min(0.2, w.level * 0.02))
      h.vx = approach(h.vx, (dx / d) * spd, 4, dt)
      h.vy = approach(h.vy, (dy / d) * spd, 4, dt)
    }
    for (const h of w.holes) {
      if (!h.alive) continue
      h.x = clamp(h.x + h.vx * dt, h.r * 0.4, size - h.r * 0.4)
      h.y = clamp(h.y + h.vy * dt, h.r * 0.4, size - h.r * 0.4)
      h.r = approach(h.r, h.rt, 5, dt)
      h.spin += dt * (1.5 + 30 / h.r)
      if (h.inv > 0) h.inv -= dt
    }

    // Traffic and pedestrians.
    for (const o of w.objs) {
      if (!o.alive || o.fall >= 0) continue
      if (o.lane >= 0) {
        o.x += o.vx * dt
        o.y += o.vy * dt
        if (o.x < -40) o.x = size + 40
        else if (o.x > size + 40) o.x = -40
        if (o.y < -40) o.y = size + 40
        else if (o.y > size + 40) o.y = -40
      } else if (o.kind === 'person') {
        let fear = false
        for (const h of w.holes) {
          if (!h.alive) continue
          const dx = o.x - h.x
          const dy = o.y - h.y
          const d = Math.hypot(dx, dy)
          if (d < h.r * 2 + 40) {
            o.vx = (dx / (d || 1)) * 55
            o.vy = (dy / (d || 1)) * 55
            fear = true
            break
          }
        }
        if (!fear && Math.random() < dt * 0.4) {
          const a = rand(0, Math.PI * 2)
          const s = Math.random() < 0.3 ? 0 : 14
          o.vx = Math.cos(a) * s
          o.vy = Math.sin(a) * s
        }
        o.x = clamp(o.x + o.vx * dt, 4, size - 4)
        o.y = clamp(o.y + o.vy * dt, 4, size - 4)
        if (o.vx || o.vy) o.rot = Math.atan2(o.vy, o.vx)
      }
    }

    // Swallowing.
    for (const h of w.holes) {
      if (!h.alive || h.dying > 0) continue
      const pull = h === me && w.vortex > 0 ? h.r * 2.2 : 0
      for (const o of w.objs) {
        if (!o.alive || o.fall >= 0) continue
        const dx = o.x - h.x
        if (dx > h.r + o.size + pull || dx < -h.r - o.size - pull) continue
        const dy = o.y - h.y
        if (dy > h.r + o.size + pull || dy < -h.r - o.size - pull) continue
        const d = Math.hypot(dx, dy)
        const fits = o.size <= h.r * 0.92
        if (fits && d < h.r - o.size * 0.4) swallowObj(w, h, o)
        else if (fits && pull > 0 && d < pull) {
          o.x -= (dx / d) * 160 * dt
          o.y -= (dy / d) * 160 * dt
        } else if (!fits && d < h.r * 0.85 + o.size * 0.5) o.jig = 0.25
      }
    }
    // Falling animation.
    for (const o of w.objs) {
      if (o.jig > 0) o.jig -= dt
      if (o.fall < 0 || !o.alive) continue
      o.fall += dt / (0.35 + o.size / 220)
      if (o.fall >= 1) o.alive = false
    }
    if (Math.random() < 0.2) w.objs = w.objs.filter((o) => o.alive)

    // Hole vs hole.
    for (const a of w.holes) {
      for (const b of w.holes) {
        if (a === b || !a.alive || !b.alive || a.dying > 0 || b.dying > 0) continue
        if (a.r > b.r * 1.1 && b.inv <= 0 && dist(a.x, a.y, b.x, b.y) < a.r - b.r * 0.3) {
          a.rt = Math.sqrt(a.rt * a.rt + b.r * b.r * 0.6)
          b.dying = 0.6
          fx.burst(b.x, b.y, { count: 30, color: [b.color, '#ffffff', '#1e1b4b'], speed: 300, gravity: 0, shape: 'spark' })
          fx.ring(b.x, b.y, { color: b.color, maxR: b.r * 3, life: 0.5, width: 6 })
          if (b === me) {
            w.me = null
            b.alive = false
            die('rival')
          } else if (a === me) {
            w.stats.rivals++
            w.score += 1500
            fx.text(b.x, b.y - 20, 'RIVAL SWALLOWED!', '#fde047', 24 / w.cam.z)
            fx.stop(0.12)
            fx.shake(12, 0.4)
            sfx.boom(0.9)
            haptic.heavy()
            say('RIVAL DOWN!', `${b.name} +1500`)
            run.update(w.stats)
          }
        }
      }
    }
    for (const h of w.holes) {
      if (h.dying > 0) {
        h.dying -= dt
        h.r *= 1 - Math.min(1, dt * 5)
        if (h.dying <= 0) h.alive = false
      }
    }
    w.holes = w.holes.filter((h) => h.alive)

    if (ph !== 'play' || !me) return

    // Pickups.
    w.pickTimer -= dt
    if (w.pickTimer <= 0) {
      w.pickTimer = rand(13, 18)
      if (w.pickups.length < 2) {
        const i = Math.floor(rand(0, city.n + 1))
        const horiz = Math.random() < 0.5
        const c = i * (BLOCK + ROAD) + ROAD / 2
        const along = clamp(me.x + rand(-450, 450), ROAD, size - ROAD)
        const alongY = clamp(me.y + rand(-450, 450), ROAD, size - ROAD)
        const kinds: PickKind[] = w.left < 30 ? ['clock', 'clock', 'vortex', 'boost'] : ['clock', 'vortex', 'boost']
        w.pickups.push({ x: horiz ? along : c, y: horiz ? c : alongY, kind: kinds[Math.floor(Math.random() * kinds.length)], ph: 0, life: 25 })
      }
    }
    for (const p of w.pickups) {
      p.ph += dt
      p.life -= dt
      if (p.life > 0 && dist(p.x, p.y, me.x, me.y) < me.r + 14) {
        p.life = 0
        if (p.kind === 'clock') w.left += 8
        else if (p.kind === 'vortex') w.vortex = 6
        else w.boost = 6
        fx.ring(p.x, p.y, { color: PICK[p.kind].color, maxR: 80, life: 0.5, width: 5 })
        fx.burst(p.x, p.y, { count: 16, color: [PICK[p.kind].color, '#fff'], speed: 240, gravity: 0, shape: 'spark' })
        fx.text(p.x, p.y - 20, PICK[p.kind].label, PICK[p.kind].color, 20 / w.cam.z)
        sfx.power()
        haptic.medium()
      }
    }
    w.pickups = w.pickups.filter((p) => p.life > 0)
    w.vortex = Math.max(0, w.vortex - dt)
    w.boost = Math.max(0, w.boost - dt)
    if (w.comboT > 0) {
      w.comboT -= dt
      if (w.comboT <= 0 && w.combo >= 15) {
        fx.text(me.x, me.y - me.r - 20, `${w.combo} CHAIN!`, '#fde047', 20 / w.cam.z)
        sfx.combo()
      }
    }
    w.sndT -= dt

    if (!w.warned && me.r >= w.target) {
      w.warned = true
      say('TARGET REACHED!', 'keep growing for more stars')
      sfx.levelUp()
      haptic.success()
      fx.ring(me.x, me.y, { color: '#fde047', maxR: me.r * 3, life: 0.6, width: 6 })
    }

    // Clock.
    w.left -= dt
    if (w.left <= 10 && w.left > 0) {
      w.tickT -= dt
      if (w.tickT <= 0) {
        w.tickT = 1
        sfx.tick()
      }
    }
    const remaining = w.objs.length
    if (remaining < w.initial * 0.04) clearLevel(true)
    else if (w.left <= 0) {
      w.left = 0
      if (me.r >= w.target) clearLevel(false)
      else die('time')
    }

    w.hudT -= dt
    if (w.hudT <= 0) {
      w.hudT = 0.15
      setHud({ score: Math.round(w.score), level: w.level, left: w.left, r: me.r, r0: w.r0, target: w.target, star2: w.star2, star3: w.star3, combo: w.comboT > 0 ? w.combo : 0, vortex: w.vortex, boost: w.boost })
    }
    void t
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
      ;(window as unknown as Record<string, unknown>).__hole = world
      ;(window as unknown as Record<string, unknown>).__lv4hole = {
        world,
        move(x: number, y: number) {
          devMove = x || y ? { x, y } : null
        },
        speed(v: number) {
          devSpeed = v
        },
      }
    }
    function down(e: KeyboardEvent) {
      if (phaseRef.current !== 'play') return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
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

  function drawGround(ctx: CanvasRenderingContext2D, w: World, vx0: number, vy0: number, vx1: number, vy1: number) {
    const city = w.city
    const th = city.theme
    ctx.fillStyle = th.road
    ctx.fillRect(0, 0, city.size, city.size)
    for (const b of city.blocks) {
      if (b.x > vx1 || b.x + BLOCK < vx0 || b.y > vy1 || b.y + BLOCK < vy0) continue
      ctx.fillStyle = th.walk
      ctx.fillRect(b.x, b.y, BLOCK, BLOCK)
      ctx.fillStyle = 'rgba(0,0,0,0.12)'
      ctx.fillRect(b.x, b.y + BLOCK - 3, BLOCK, 3)
      const green = b.type === 'park' || b.type === 'houses' || b.type === 'landmark'
      ctx.fillStyle = green ? th.grass : th.plaza
      ctx.fillRect(b.x + 16, b.y + 16, BLOCK - 32, BLOCK - 32)
      if (green) {
        ctx.fillStyle = th.grass2
        for (let i = 0; i < 4; i++) ctx.fillRect(b.x + 16, b.y + 16 + i * ((BLOCK - 32) / 4), BLOCK - 32, (BLOCK - 32) / 8)
      } else {
        ctx.strokeStyle = 'rgba(0,0,0,0.06)'
        ctx.lineWidth = 1
        ctx.beginPath()
        for (let i = 1; i < 10; i++) {
          const k = b.x + 16 + (i * (BLOCK - 32)) / 10
          ctx.moveTo(k, b.y + 16)
          ctx.lineTo(k, b.y + BLOCK - 16)
          const q = b.y + 16 + (i * (BLOCK - 32)) / 10
          ctx.moveTo(b.x + 16, q)
          ctx.lineTo(b.x + BLOCK - 16, q)
        }
        ctx.stroke()
      }
      if (b.type === 'park') {
        ctx.fillStyle = th.snow ? '#cbd5e1' : '#e7d3a8'
        ctx.fillRect(b.x + BLOCK / 2 - 9, b.y + 16, 18, BLOCK - 32)
        ctx.fillRect(b.x + 16, b.y + BLOCK / 2 - 9, BLOCK - 32, 18)
      } else if (b.type === 'houses') {
        ctx.fillStyle = th.walk
        ctx.fillRect(b.x + BLOCK / 2 - 6, b.y + 16, 12, BLOCK - 32)
      }
    }
    // Lane markings and crosswalks.
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 3
    ctx.setLineDash([18, 16])
    ctx.beginPath()
    for (let k = 0; k <= city.n; k++) {
      const c = k * (BLOCK + ROAD) + ROAD / 2
      if (c > vy0 - 10 && c < vy1 + 10) {
        ctx.moveTo(Math.max(0, vx0), c)
        ctx.lineTo(Math.min(city.size, vx1), c)
      }
      if (c > vx0 - 10 && c < vx1 + 10) {
        ctx.moveTo(c, Math.max(0, vy0))
        ctx.lineTo(c, Math.min(city.size, vy1))
      }
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    for (let i = 0; i <= city.n; i++) {
      for (let j = 0; j <= city.n; j++) {
        const cx = i * (BLOCK + ROAD) + ROAD / 2
        const cy = j * (BLOCK + ROAD) + ROAD / 2
        if (cx < vx0 - 100 || cx > vx1 + 100 || cy < vy0 - 100 || cy > vy1 + 100) continue
        ctx.fillStyle = th.road
        ctx.fillRect(cx - ROAD / 2, cy - ROAD / 2, ROAD, ROAD)
        ctx.fillStyle = 'rgba(255,255,255,0.65)'
        for (let s = -3; s <= 3; s++) {
          ctx.fillRect(cx + s * 9 - 3, cy - ROAD / 2 - 14, 6, 12)
          ctx.fillRect(cx + s * 9 - 3, cy + ROAD / 2 + 2, 6, 12)
          ctx.fillRect(cx - ROAD / 2 - 14, cy + s * 9 - 3, 12, 6)
          ctx.fillRect(cx + ROAD / 2 + 2, cy + s * 9 - 3, 12, 6)
        }
      }
    }
  }

  function drawHole(ctx: CanvasRenderingContext2D, h: Hole, me: Hole | null, t: number) {
    const r = h.r
    const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, r)
    g.addColorStop(0, '#000000')
    g.addColorStop(0.7, '#05030f')
    g.addColorStop(0.92, '#1e1b4b')
    g.addColorStop(1, '#312e81')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(h.x, h.y, r, 0, Math.PI * 2)
    ctx.fill()
    // Swirl inside the void.
    ctx.save()
    ctx.translate(h.x, h.y)
    ctx.rotate(h.spin)
    ctx.strokeStyle = h.ai ? h.color : '#a78bfa'
    ctx.lineWidth = Math.max(1.5, r * 0.05)
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.28
      ctx.beginPath()
      for (let k = 0; k <= 12; k++) {
        const a = (i * Math.PI * 2) / 3 + k * 0.28
        const rr = r * (0.85 - k * 0.06)
        if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      ctx.stroke()
    }
    ctx.restore()
    ctx.globalAlpha = 1
    // Rim: player violet, rivals red when dangerous, green when edible.
    let rim = '#a78bfa'
    if (h.ai && me) rim = h.r > me.r * 1.1 ? '#ef4444' : me.r > h.r * 1.1 ? '#4ade80' : '#facc15'
    else if (h.ai) rim = h.color
    const blink = h.inv > 0 && Math.floor(t * 12) % 2 === 0
    ctx.strokeStyle = rim
    ctx.globalAlpha = blink ? 0.3 : 0.95
    ctx.lineWidth = Math.max(3, r * 0.08)
    ctx.beginPath()
    ctx.arc(h.x, h.y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 0.25
    ctx.lineWidth = Math.max(6, r * 0.2)
    ctx.beginPath()
    ctx.arc(h.x, h.y, r + ctx.lineWidth * 0.5, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, z: number) {
    const info = PICK[p.kind]
    const y = p.y + Math.sin(p.ph * 3) * 3
    if (p.life < 5 && Math.floor(p.ph * 8) % 2 === 0) ctx.globalAlpha = 0.4
    glow(ctx, p.x, y, 34, info.color, 0.5)
    ctx.fillStyle = '#0f172a'
    ctx.beginPath()
    ctx.arc(p.x, y, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = info.color
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.strokeStyle = info.color
    ctx.fillStyle = info.color
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    if (p.kind === 'clock') {
      ctx.arc(p.x, y, 7, 0, Math.PI * 2)
      ctx.moveTo(p.x, y)
      ctx.lineTo(p.x, y - 5)
      ctx.moveTo(p.x, y)
      ctx.lineTo(p.x + 4, y + 1)
      ctx.stroke()
    } else if (p.kind === 'vortex') {
      for (let k = 0; k <= 16; k++) {
        const a = k * 0.55 + p.ph * 4
        const rr = k * 0.5
        if (k === 0) ctx.moveTo(p.x, y)
        else ctx.lineTo(p.x + Math.cos(a) * rr, y + Math.sin(a) * rr)
      }
      ctx.stroke()
    } else {
      ctx.moveTo(p.x - 6, y + 5)
      ctx.lineTo(p.x, y - 6)
      ctx.lineTo(p.x + 6, y + 5)
      ctx.moveTo(p.x - 6, y + 1)
      ctx.lineTo(p.x, y - 10)
      ctx.lineTo(p.x + 6, y + 1)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    void z
  }

  function frame({ ctx, w: W, h: H, raw: raw0, t }: Frame) {
    const raw = raw0 * devSpeed
    const ph = phaseRef.current
    if (ph === 'idle' && world.current.holes.length === 0) beginLevel(world.current, 1, false)
    const w = world.current
    const dt = fx.step(raw)
    if (ph === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0) nextLevel()
    }
    if (dt > 0) step(w, dt, ph, t)
    const city = w.city
    const me = w.me
    const focus = me ?? (ph === 'idle' ? w.holes[0] : null)
    const scr = Math.min(W, H * 0.75) / 390
    if (focus) {
      w.cam.x = approach(w.cam.x, focus.x, 6, raw)
      w.cam.y = approach(w.cam.y, focus.y, 6, raw)
      const zt = ((scr * 390) / (220 + focus.r * 8)) * (ph === 'idle' ? 0.8 : 1)
      w.cam.z = approach(w.cam.z, zt, 2, raw)
    }
    const z = w.cam.z

    ctx.fillStyle = city.theme.night ? '#0b1120' : city.theme.snow ? '#94a3b8' : '#4d7c4f'
    ctx.fillRect(0, 0, W, H)
    fx.applyShake(ctx)
    ctx.translate(W / 2, H / 2)
    ctx.scale(z, z)
    ctx.translate(-w.cam.x, -w.cam.y)
    const vx0 = w.cam.x - W / 2 / z - 40
    const vx1 = w.cam.x + W / 2 / z + 40
    const vy0 = w.cam.y - H / 2 / z - 40
    const vy1 = w.cam.y + H / 2 / z + 40
    // Hedge border around the city.
    ctx.fillStyle = city.theme.snow ? '#e2e8f0' : '#2f5d34'
    ctx.fillRect(-26, -26, city.size + 52, city.size + 52)
    ctx.strokeStyle = city.theme.snow ? '#f8fafc' : '#3f7a45'
    ctx.lineWidth = 10
    ctx.setLineDash([14, 8])
    ctx.strokeRect(-13, -13, city.size + 26, city.size + 26)
    ctx.setLineDash([])
    drawGround(ctx, w, vx0, vy0, vx1, vy1)

    for (const h of w.holes) drawHole(ctx, h, me, t)
    const night = city.theme.night
    const snow = city.theme.snow
    // Falling objects, clipped to their hole so they sink through the opening.
    for (const o of w.objs) {
      if (o.fall < 0 || !o.alive) continue
      const h = w.holes.find((q) => q.id === o.owner)
      if (!h) {
        o.alive = false
        continue
      }
      const k = o.fall
      const e = k * k
      const x = o.fx + (h.x - o.fx) * Math.min(1, k * 1.6)
      const y = o.fy + (h.y - o.fy) * Math.min(1, k * 1.6) + e * h.r * 0.3
      ctx.save()
      ctx.beginPath()
      ctx.arc(h.x, h.y, h.r * 0.97, 0, Math.PI * 2)
      ctx.clip()
      ctx.globalAlpha = 1 - e * 0.85
      ctx.translate(x, y)
      ctx.rotate(k * (o.seed - 0.5) * 3)
      ctx.translate(-x, -y)
      drawObj(ctx, o, x, y, 1 - e * 0.55, w.cam.x, w.cam.y, t, night, snow)
      ctx.restore()
    }
    ctx.globalAlpha = 1
    for (const o of w.objs) {
      if (o.fall >= 0 || !o.alive) continue
      const m = o.size + o.height * 0.6
      if (o.x + m < vx0 || o.x - m > vx1 || o.y + m < vy0 || o.y - m > vy1) continue
      const jx = o.jig > 0 ? Math.sin(t * 50 + o.seed * 9) * 1.6 : 0
      drawObj(ctx, o, o.x + jx, o.y, 1, w.cam.x, w.cam.y, t, night, snow)
    }
    for (const p of w.pickups) drawPickup(ctx, p, z)

    if (city.theme.tint) {
      ctx.fillStyle = city.theme.tint
      ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0)
    }
    if (night) {
      for (const o of w.objs) {
        if (o.kind !== 'lamp' || o.fall >= 0) continue
        if (o.x < vx0 || o.x > vx1 || o.y < vy0 || o.y > vy1) continue
        glow(ctx, o.x + 7, o.y - 5, 46, '#fde68a', 0.35)
      }
      for (const h of w.holes) glow(ctx, h.x, h.y, h.r * 1.6, h.ai ? h.color : '#8b5cf6', 0.25)
    }
    // Rival name tags.
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `800 ${Math.round(13 / z)}px 'Plus Jakarta Sans', system-ui, sans-serif`
    for (const h of w.holes) {
      if (!h.ai) continue
      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillText(`${h.name} ${Math.round(h.r)}`, h.x + 1 / z, h.y - h.r - 13 / z + 1 / z)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(`${h.name} ${Math.round(h.r)}`, h.x, h.y - h.r - 13 / z)
    }
    fx.draw(ctx)
    ctx.restore()

    // Off-screen rival arrows.
    if (me && ph === 'play') {
      for (const h of w.holes) {
        if (!h.ai) continue
        const sx = (h.x - w.cam.x) * z + W / 2
        const sy = (h.y - w.cam.y) * z + H / 2
        if (sx > 0 && sx < W && sy > 0 && sy < H) continue
        const a = Math.atan2(sy - H / 2, sx - W / 2)
        const ex = clamp(sx, 22, W - 22)
        const ey = clamp(sy, 70, H - 22)
        ctx.save()
        ctx.translate(ex, ey)
        ctx.rotate(a)
        ctx.fillStyle = h.r > me.r * 1.1 ? '#ef4444' : me.r > h.r * 1.1 ? '#4ade80' : '#facc15'
        ctx.beginPath()
        ctx.moveTo(10, 0)
        ctx.lineTo(-6, -7)
        ctx.lineTo(-6, 7)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
    }
    if (me && ph === 'play' && w.left < 10) {
      ctx.fillStyle = `rgba(239,68,68,${0.12 + Math.sin(t * 8) * 0.08})`
      ctx.fillRect(0, 0, W, H)
    }
    stick.draw(ctx)
    if (ph === 'play' && w.tipT > 0) {
      w.tipT = Math.max(0, w.tipT - raw)
      ctx.globalAlpha = Math.min(1, w.tipT, (5 - w.tipT) * 3)
      ctx.font = "800 13px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const tw = Math.min(W - 24, ctx.measureText(w.tip).width + 28)
      ctx.fillStyle = 'rgba(15,23,42,0.65)'
      ctx.beginPath()
      ctx.roundRect((W - tw) / 2, H - 58, tw, 30, 15)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText(w.tip, W / 2, H - 43, W - 40)
      ctx.globalAlpha = 1
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const span = Math.max(1, hud.star3 - hud.r0)
  const pct = (v: number) => `${clamp(((v - hud.r0) / span) * 100, 0, 100)}%`
  const playing = phase === 'play' || phase === 'dying' || phase === 'clear'
  const mm = Math.max(0, Math.ceil(hud.left))
  const w0 = world.current

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Level {hud.level}</div>
              </div>
              <div className={`hole-timer${hud.left < 10 ? ' is-low' : ''}`}>
                {Math.floor(mm / 60)}:{String(mm % 60).padStart(2, '0')}
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">
                  Size {Math.round(hud.r)} / {hud.target}
                </span>
                {hud.combo >= 3 ? <span className="hole-combo">x{hud.combo}</span> : null}
              </div>
            </div>
          )}
          {phase !== 'idle' && (
            <div className="hole-bar" aria-label="Size progress">
              <span className="hole-bar__fill" style={{ width: pct(hud.r) }} />
              {[hud.target, hud.star2, hud.star3].map((v, i) => (
                <i key={i} className={`hole-bar__mark${hud.r >= v ? ' is-on' : ''}`} style={{ left: pct(v) }}>
                  <Star />
                </i>
              ))}
            </div>
          )}
          {playing && (hud.vortex > 0 || hud.boost > 0) ? (
            <div className="hole-pows">
              {hud.vortex > 0 ? <span style={{ background: PICK.vortex.color }}>VORTEX {Math.ceil(hud.vortex)}</span> : null}
              {hud.boost > 0 ? <span style={{ background: PICK.boost.color }}>BOOST {Math.ceil(hud.boost)}</span> : null}
            </div>
          ) : null}
          {banner && playing ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          {clearCard && phase === 'clear' ? (
            <div className="hole-clear">
              <h3>Level {clearCard.level} clear!</h3>
              <div className="hole-clear__stars">
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i < clearCard.stars ? 'is-on' : ''} style={{ animationDelay: `${0.15 + i * 0.2}s` }}>
                    <Star />
                  </span>
                ))}
              </div>
              <p>+{clearCard.bonus} bonus</p>
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="hole"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to move your hole. Swallow anything smaller than you and reach the target size before time runs out."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={w0.clearedRun >= 2 ? 'City eater!' : 'Still hungry'}
            subtitle={`Score ${Math.round(w0.score)} · ${w0.clearedRun} level${w0.clearedRun === 1 ? '' : 's'} cleared`}
            celebrate={w0.clearedRun >= 1}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}

function Star() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  )
}
