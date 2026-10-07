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
import { levelSpec, wallMask, type Pers, type PaintLevelSpec, type RivalDef } from './levels'
import '../../shared/action/action.css'
import './paint.css'

const meta = getGame('paint')

type Phase = 'idle' | 'play' | 'clear' | 'dying' | 'over'
type PickKind = 'speed' | 'shield' | 'bomb'

type P = {
  id: number
  name: string
  color: string
  dark: string
  light: string
  c32: number
  d32: number
  t32: number
  x: number
  y: number
  dir: number
  next: number
  prog: number
  stopped: boolean
  trail: number[]
  alive: boolean
  ai: boolean
  pers: Pers
  bold: number
  plan: number[]
  inv: number
  shield: number
  boots: number
  kills: number
  squash: number
  blink: number
}

type Pickup = { x: number; y: number; kind: PickKind; ph: number; life: number }
type Row = { name: string; pct: number; me: boolean; king: boolean; color: string }

const DIRS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
]
const PALETTE = ['#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#6366f1']
const NAMES = ['Brushy', 'Splat', 'Doodle', 'Crayon', 'Smudge', 'Pixel', 'Inky', 'Drip', 'Swoosh', 'Blot', 'Scribble', 'Dabby', 'Glaze', 'Chalk']
const PICK: Record<PickKind, { color: string; label: string }> = {
  speed: { color: '#facc15', label: 'SPEED!' },
  shield: { color: '#22d3ee', label: 'SHIELD' },
  bomb: { color: '#f472b6', label: 'PAINT BOMB!' },
}
const BOARDS = [
  { bg: '#fdf2f8', line: '#fbcfe8', back: ['#fce7f3', '#f9a8d4'] },
  { bg: '#f0f9ff', line: '#bae6fd', back: ['#e0f2fe', '#7dd3fc'] },
  { bg: '#fefce8', line: '#fde68a', back: ['#fef9c3', '#fcd34d'] },
  { bg: '#f0fdf4', line: '#bbf7d0', back: ['#dcfce7', '#86efac'] },
  { bg: '#f5f3ff', line: '#ddd6fe', back: ['#ede9fe', '#c4b5fd'] },
]

function hexRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}
function mix(hex: string, k: number) {
  const [r, g, b] = hexRgb(hex)
  const f = (c: number) => Math.round(k >= 0 ? c + (255 - c) * k : c * (1 + k))
  return `#${((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1)}`
}
function c32(hex: string, a = 255) {
  const [r, g, b] = hexRgb(hex)
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0
}

type World = {
  spec: PaintLevelSpec
  wall: Uint8Array
  walls: number
  area: number
  levelKills: number
  G: number
  owner: Uint8Array
  trail: Uint8Array
  vis: Uint8Array
  queue: Int32Array
  first: Int8Array
  counts: Int32Array
  byId: (P | undefined)[]
  players: P[]
  me: P | null
  nextId: number
  terr: ImageData
  shad: ImageData
  trl: ImageData
  terr32: Uint32Array
  shad32: Uint32Array
  trl32: Uint32Array
  cTerr: HTMLCanvasElement
  cShad: HTMLCanvasElement
  cTrl: HTMLCanvasElement
  dirty: boolean
  level: number
  target: number
  rivals: number
  time: number
  cam: { x: number; y: number }
  pickups: Pickup[]
  pickT: number
  respawn: number[]
  flash: number[]
  flashT: number
  nextEvent: number
  eventIdx: number
  hudT: number
  clearT: number
  score: number
  snapshot: Uint8Array | null
  deathX: number
  deathY: number
  lastTrack: number
  clock: number
  board: number
  stats: { score: number; level: number; kills: number; tiles: number; percent: number; kings: number }
}

function makeCanvas(G: number) {
  const c = document.createElement('canvas')
  c.width = G
  c.height = G
  return c
}

function newWorld(spec: PaintLevelSpec): World {
  const level = spec.n
  const G = spec.G
  const wall = wallMask(spec)
  let walls = 0
  for (let i = 0; i < G * G; i++) walls += wall[i]
  const terr = new ImageData(G, G)
  const shad = new ImageData(G, G)
  const trl = new ImageData(G, G)
  return {
    spec,
    wall,
    walls,
    area: G * G - walls,
    levelKills: 0,
    G,
    owner: new Uint8Array(G * G),
    trail: new Uint8Array(G * G),
    vis: new Uint8Array(G * G),
    queue: new Int32Array(G * G),
    first: new Int8Array(G * G),
    counts: new Int32Array(256),
    byId: [],
    players: [],
    me: null,
    nextId: 1,
    terr,
    shad,
    trl,
    terr32: new Uint32Array(terr.data.buffer),
    shad32: new Uint32Array(shad.data.buffer),
    trl32: new Uint32Array(trl.data.buffer),
    cTerr: makeCanvas(G),
    cShad: makeCanvas(G),
    cTrl: makeCanvas(G),
    dirty: true,
    level,
    target: spec.target,
    rivals: spec.rivals.length,
    time: 0,
    cam: { x: G / 2, y: G / 2 },
    pickups: [],
    pickT: 6,
    respawn: [],
    flash: [],
    flashT: 0,
    nextEvent: spec.events ? spec.events : 1e9,
    eventIdx: 0,
    hudT: 0,
    clearT: 0,
    score: 0,
    snapshot: null,
    deathX: G / 2,
    deathY: G / 2,
    lastTrack: -99,
    clock: 0,
    board: (spec.board ?? level - 1) % BOARDS.length,
    stats: { score: 0, level: 0, kills: 0, tiles: 0, percent: 0, kings: 0 },
  }
}

function paintCell(w: World, i: number) {
  const o = w.owner[i]
  const p = o ? w.byId[o] : undefined
  w.terr32[i] = p ? p.c32 : 0
  w.shad32[i] = p ? p.d32 : 0
  const t = w.trail[i]
  const q = t ? w.byId[t] : undefined
  w.trl32[i] = q ? q.t32 : 0
  w.dirty = true
}

function repaint(w: World) {
  for (let i = 0; i < w.G * w.G; i++) paintCell(w, i)
}

function recount(w: World) {
  w.counts.fill(0)
  for (let i = 0; i < w.G * w.G; i++) w.counts[w.owner[i]]++
}

function makePlayer(w: World, name: string, color: string, ai: boolean, pers: Pers): P {
  let id = w.nextId
  for (let k = 0; k < 250 && w.byId[id]?.alive; k++) id = (id % 250) + 1
  w.nextId = (id % 250) + 1
  const p: P = {
    id,
    name,
    color,
    dark: mix(color, -0.35),
    light: mix(color, 0.45),
    c32: c32(color),
    d32: c32(mix(color, -0.4)),
    t32: c32(mix(color, 0.35), 200),
    x: 0,
    y: 0,
    dir: 0,
    next: -1,
    prog: 0,
    stopped: false,
    trail: [],
    alive: true,
    ai,
    pers,
    bold: pers === 'timid' ? 1 : pers === 'hunter' ? 2 : pers === 'king' ? 4 : 3,
    plan: [],
    inv: 0,
    shield: 0,
    boots: 0,
    kills: 0,
    squash: 0,
    blink: rand(1, 4),
  }
  w.byId[id] = p
  w.players.push(p)
  return p
}

function makeBase(w: World, p: P, cx: number, cy: number, rad: number) {
  const G = w.G
  for (let y = cy - rad; y <= cy + rad; y++) {
    for (let x = cx - rad; x <= cx + rad; x++) {
      if (x < 0 || y < 0 || x >= G || y >= G) continue
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > rad * rad + rad) continue
      const i = y * G + x
      if (w.wall[i]) continue
      w.owner[i] = p.id
      if (w.trail[i]) w.trail[i] = 0
      paintCell(w, i)
    }
  }
  p.x = cx
  p.y = cy
  p.prog = 0
  p.dir = Math.floor(Math.random() * 4)
}

/** Find a neutral patch for a new base, far from the player. */
function freeSpot(w: World, rad: number, avoid: P | null) {
  const G = w.G
  let best = { x: Math.floor(G / 2), y: Math.floor(G / 2) }
  let bestScore = -1
  for (let k = 0; k < 50; k++) {
    const x = Math.floor(rand(rad + 2, G - rad - 2))
    const y = Math.floor(rand(rad + 2, G - rad - 2))
    let neutral = 0
    for (let dy = -rad - 1; dy <= rad + 1; dy++)
      for (let dx = -rad - 1; dx <= rad + 1; dx++) {
        const j = (y + dy) * G + x + dx
        if (w.wall[j]) neutral -= 3
        else if (!w.owner[j] && !w.trail[j]) neutral++
      }
    const far = avoid && avoid.alive ? Math.min(20, Math.abs(avoid.x - x) + Math.abs(avoid.y - y)) : 20
    const s = neutral + far * 3
    if (s > bestScore) {
      bestScore = s
      best = { x, y }
    }
  }
  return best
}

export default function PaintGame() {
  const run = useActionRun('paint')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const world = useRef<World | null>(null)
  const phaseRef = useRef<Phase>('idle')
  const swipe = useRef<{ id: number; x: number; y: number } | null>(null)
  const totals = useRef({ score: 0, kills: 0, tiles: 0, kings: 0, level: 0, percent: 0 })
  const auto = useRef(false)
  const turbo = useRef(1)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ pct: 0, target: 20, level: 1, kills: 0, score: 0, shield: 0, boots: 0 })
  const [board, setBoard] = useState<Row[]>([])
  const [feed, setFeed] = useState<{ key: number; text: string; me: boolean }[]>([])
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [clearCard, setClearCard] = useState<{ level: number; pct: number; bonus: number; stars: number; time: number; par: number; first: boolean } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }
  function pushFeed(text: string, me: boolean) {
    const key = Date.now() + Math.random()
    setFeed((f) => [...f.slice(-2), { key, text, me }])
    window.setTimeout(() => setFeed((f) => f.filter((x) => x.key !== key)), 3500)
  }

  function addRival(w: World, pers?: Pers, def?: RivalDef) {
    const used = new Set(w.players.filter((p) => p.alive).map((p) => p.name))
    const names = NAMES.filter((n) => !used.has(n))
    const roll = Math.random()
    const kind: Pers = pers ?? (roll < 0.3 ? 'timid' : roll < 0.7 ? 'builder' : w.level >= 2 ? 'hunter' : 'builder')
    const usedColors = new Set(w.players.filter((p) => p.alive).map((p) => p.color))
    const color = PALETTE.find((c) => !usedColors.has(c)) ?? PALETTE[w.nextId % PALETTE.length]
    const name = def?.name ?? (kind === 'king' ? 'King Splat' : names[Math.floor(Math.random() * names.length)] ?? 'Rival')
    const p = makePlayer(w, name, kind === 'king' ? (name === 'King Splat' ? '#eab308' : '#c026d3') : color, true, kind)
    const rad = def?.rad ?? (kind === 'king' ? 7 : 2 + Math.floor(Math.random() * 2))
    let s = def ? { x: Math.round(def.x * (w.G - 1)), y: Math.round(def.y * (w.G - 1)) } : freeSpot(w, rad, w.me)
    if (w.wall[s.y * w.G + s.x]) s = freeSpot(w, rad, w.me)
    makeBase(w, p, s.x, s.y, rad)
    return p
  }

  function buildLevel(level: number, withPlayer: boolean) {
    const w = newWorld(levelSpec(level))
    const prev = world.current
    if (prev) {
      w.score = prev.score
      w.stats = prev.stats
      w.lastTrack = prev.lastTrack
      w.clock = prev.clock
    }
    if (withPlayer) {
      const me = makePlayer(w, 'You', '#f43f5e', false, 'builder')
      const [sx, sy] = w.spec.start ?? [0.5, 0.5]
      makeBase(w, me, Math.floor(w.G * sx), Math.floor(w.G * sy), 3 + run.level('base'))
      me.dir = 3
      me.shield = run.level('shield')
      if (auto.current) me.bold = 2
      me.inv = 1.5
      w.me = me
      w.cam = { x: me.x + 0.5, y: me.y + 0.5 }
    }
    if (withPlayer) for (const d of w.spec.rivals) addRival(w, d.pers, d)
    else for (let k = 0; k < 4; k++) addRival(w)
    recount(w)
    repaint(w)
    world.current = w
    return w
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    world.current = null
    const w = buildLevel(Math.max(1, level), true)
    w.stats = { score: 0, level: 0, kills: 0, tiles: 0, percent: 0, kings: 0 }
    w.score = 0
    fx.reset()
    setFeed([])
    setClearCard(null)
    run.begin()
    setPhaseBoth('play')
    announce(w)
    sfx.ready()
    haptic.light()
  }

  function die() {
    const w = world.current
    if (!w || phaseRef.current !== 'play') return
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.3)
    fx.stop(0.12)
    fx.shake(12, 0.4)
    fx.slowmo(1, 0.3)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      w.stats.score = Math.round(w.score)
      const coins = Math.round(clamp(w.score / 120 + w.stats.level * 4 + w.stats.kills * 2, 3, 400))
      run.end({ score: w.stats.score, cleared: w.stats.level >= 2, stats: { ...w.stats }, coins }, revive)
    }, 1150)
  }

  function revive() {
    const w = world.current
    if (!w || !w.me) return
    const me = w.me
    const G = w.G
    const snap = w.snapshot
    let owned = 0
    if (snap) {
      for (let i = 0; i < G * G; i++) {
        if (!snap[i]) continue
        w.owner[i] = me.id
        owned++
      }
    }
    if (owned < 9) {
      const s = freeSpot(w, 3, null)
      makeBase(w, me, s.x, s.y, 3)
    } else {
      // Respawn on our own land nearest to where we fell.
      let best = -1
      let bd = 1e9
      for (let i = 0; i < G * G; i++) {
        if (w.owner[i] !== me.id) continue
        const d = Math.abs((i % G) - w.deathX) + Math.abs(Math.floor(i / G) - w.deathY)
        if (d < bd) {
          bd = d
          best = i
        }
      }
      me.x = best % G
      me.y = Math.floor(best / G)
      // Face the middle of our land so the restart begins safely inside it.
      let sx = 0
      let sy = 0
      for (let i = 0; i < G * G; i++) {
        if (w.owner[i] !== me.id) continue
        sx += i % G
        sy += Math.floor(i / G)
      }
      const dx = sx / owned - me.x
      const dy = sy / owned - me.y
      me.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : dy > 0 ? 1 : 3
    }
    me.alive = true
    me.trail = []
    me.prog = 0
    me.next = -1
    me.inv = 2.5
    me.stopped = false
    w.byId[me.id] = me
    if (!w.players.includes(me)) w.players.push(me)
    for (const p of w.players) if (p.ai && Math.abs(p.x - me.x) + Math.abs(p.y - me.y) < 8) p.plan = []
    recount(w)
    repaint(w)
    fx.ring(me.x + 0.5, me.y + 0.5, { color: '#fecdd3', maxR: 6, life: 0.6, width: 0.4 })
    say('REVIVED!', 'your land is back')
    setPhaseBoth('play')
  }

  function killP(w: World, v: P, by: P | null) {
    if (!v.alive) return
    v.alive = false
    for (const i of v.trail) {
      if (w.trail[i] === v.id) {
        w.trail[i] = 0
        paintCell(w, i)
      }
    }
    v.trail = []
    const G = w.G
    const mine = v === w.me
    if (mine) w.snapshot = new Uint8Array(G * G)
    for (let i = 0; i < G * G; i++) {
      if (w.owner[i] === v.id) {
        if (mine && w.snapshot) w.snapshot[i] = 1
        w.owner[i] = 0
        paintCell(w, i)
      }
    }
    const [dx, dy] = DIRS[v.dir]
    const px = v.x + 0.5 + dx * v.prog
    const py = v.y + 0.5 + dy * v.prog
    fx.burst(px, py, { count: 24, color: [v.color, v.light, '#ffffff'], speed: 9, size: 0.35, gravity: 0, drag: 2.5, shape: 'square', life: 0.7 })
    fx.ring(px, py, { color: v.color, maxR: 4, life: 0.4, width: 0.3 })
    if (by) by.kills++
    recount(w)
    if (mine) {
      w.deathX = v.x
      w.deathY = v.y
      pushFeed(by ? `${by.name} cut your trail!` : 'You crossed your own trail!', true)
      die()
      return
    }
    w.respawn.push(4)
    if (by && by === w.me) {
      w.stats.kills++
      w.levelKills++
      w.score += v.pers === 'king' ? 1000 : 150
      fx.text(px, py - 1, v.pers === 'king' ? 'KING TOPPLED!' : 'CUT!', v.pers === 'king' ? '#ca8a04' : '#e11d48', 1.4)
      fx.stop(0.08)
      fx.shake(7, 0.25)
      sfx.hit()
      haptic.medium()
      pushFeed(`You cut ${v.name}`, true)
      if (v.pers === 'king') {
        w.stats.kings++
        say('KING TOPPLED!', '+1000')
        sfx.win()
        fx.slowmo(0.6, 0.35)
        if (w.clock - w.lastTrack > 30) {
          w.lastTrack = w.clock
          void trackEvent('action_milestone', { game_id: 'paint', kind: 'boss', value: w.stats.kings })
        }
      }
      run.update(w.stats)
    } else if (by) pushFeed(`${by.name} cut ${v.name}`, false)
    else pushFeed(`${v.name} tripped on its own trail`, false)
  }

  /** Close the loop: trail becomes land, then flood-fill everything enclosed. */
  function claim(w: World, p: P) {
    const G = w.G
    let gained = p.trail.length
    for (const i of p.trail) {
      w.owner[i] = p.id
      w.trail[i] = 0
    }
    const flash: number[] = p === w.me ? [...p.trail] : []
    p.trail = []
    const vis = w.vis
    vis.fill(0)
    const q = w.queue
    let head = 0
    let tail = 0
    const push = (i: number) => {
      if (vis[i] || w.owner[i] === p.id) return
      vis[i] = 1
      q[tail++] = i
    }
    for (let k = 0; k < G; k++) {
      push(k)
      push((G - 1) * G + k)
      push(k * G)
      push(k * G + G - 1)
    }
    while (head < tail) {
      const i = q[head++]
      const x = i % G
      if (x > 0) push(i - 1)
      if (x < G - 1) push(i + 1)
      if (i >= G) push(i - G)
      if (i < G * G - G) push(i + G)
    }
    for (let i = 0; i < G * G; i++) {
      if (!vis[i] && w.owner[i] !== p.id && !w.wall[i]) {
        w.owner[i] = p.id
        gained++
        if (flash.length < 600) flash.push(i)
      }
    }
    repaint(w)
    recount(w)
    for (const o of w.players) if (o !== p && o.alive && w.counts[o.id] === 0) killP(w, o, p)
    if (p === w.me) {
      w.stats.tiles += gained
      w.score += gained
      w.flash = flash
      w.flashT = 0.5
      const px = p.x + 0.5
      const py = p.y + 0.5
      fx.text(px, py - 1.2, `+${gained}`, gained >= 60 ? '#be123c' : '#f43f5e', gained >= 60 ? 1.6 : 1.2)
      fx.burst(px, py, { count: Math.min(30, 6 + Math.floor(gained / 6)), color: [p.color, p.light, '#ffffff'], speed: 8, size: 0.3, gravity: 0, drag: 2.5, life: 0.6 })
      if (gained >= 80) {
        fx.shake(8, 0.3)
        sfx.combo()
        haptic.success()
        if (gained >= 200) say('MASSIVE CLAIM!', `+${gained} tiles`)
      } else {
        sfx.score(Math.min(10, Math.floor(gained / 8)))
        haptic.light()
      }
      run.update(w.stats)
    }
  }

  /** On the board and not stone. */
  function inside(w: World, x: number, y: number) {
    return x >= 0 && y >= 0 && x < w.G && y < w.G && !w.wall[y * w.G + x]
  }

  function enterCell(w: World, p: P, nx: number, ny: number) {
    const G = w.G
    const i = ny * G + nx
    const t = w.trail[i]
    if (t) {
      if (t === p.id) {
        killP(w, p, null)
        return
      }
      const v = w.byId[t]
      if (v && v.alive) {
        if (v.inv > 0) {
          // Shielded by revive/spawn grace: nothing happens.
        } else if (v.shield > 0) {
          v.shield--
          for (const k of v.trail) {
            if (w.trail[k] === v.id) {
              w.trail[k] = 0
              paintCell(w, k)
            }
          }
          v.trail = []
          v.inv = 1
          fx.ring(v.x + 0.5, v.y + 0.5, { color: '#22d3ee', maxR: 4, life: 0.5, width: 0.3 })
          if (v === w.me) {
            fx.text(v.x + 0.5, v.y - 0.5, 'SHIELD SAVED YOU!', '#0891b2', 1.2)
            sfx.clang()
            haptic.heavy()
          }
        } else killP(w, v, p)
      }
    }
    if (!p.alive) return
    p.x = nx
    p.y = ny
    if (w.owner[i] === p.id) {
      if (p.trail.length) claim(w, p)
    } else {
      w.trail[i] = p.id
      p.trail.push(i)
      paintCell(w, i)
    }
    if (p === w.me) {
      for (const k of w.pickups) {
        if (k.life > 0 && k.x === nx && k.y === ny) {
          k.life = 0
          pickup(w, p, k.kind)
        }
      }
    }
  }

  function pickup(w: World, p: P, kind: PickKind) {
    const px = p.x + 0.5
    const py = p.y + 0.5
    if (kind === 'speed') p.boots = 6
    else if (kind === 'shield') p.shield++
    else {
      // Paint bomb: splash a disc of land, then close any enclosed pockets.
      const G = w.G
      const rad = 4
      for (let y = p.y - rad; y <= p.y + rad; y++) {
        for (let x = p.x - rad; x <= p.x + rad; x++) {
          if (!inside(w, x, y) || (x - p.x) ** 2 + (y - p.y) ** 2 > rad * rad + 1) continue
          const i = y * G + x
          if (w.trail[i] === p.id) continue
          if (w.owner[i] !== p.id) {
            w.owner[i] = p.id
            w.stats.tiles++
            w.score++
          }
        }
      }
      recount(w)
      repaint(w)
      for (const o of w.players) if (o !== p && o.alive && w.counts[o.id] === 0) killP(w, o, p)
      fx.burst(px, py, { count: 30, color: [p.color, p.light, '#ffffff', '#fde047'], speed: 14, size: 0.4, gravity: 0, drag: 2.5, shape: 'square', life: 0.7 })
      fx.ring(px, py, { color: p.color, maxR: 5, life: 0.45, width: 0.4 })
      fx.shake(8, 0.3)
      sfx.boom(0.5)
    }
    fx.ring(px, py, { color: PICK[kind].color, maxR: 3.5, life: 0.4, width: 0.3 })
    fx.text(px, py - 1, PICK[kind].label, mix(PICK[kind].color, -0.3), 1.2)
    sfx.power()
    haptic.medium()
  }

  function safe(w: World, p: P, d: number) {
    const [dx, dy] = DIRS[d]
    const nx = p.x + dx
    const ny = p.y + dy
    if (!inside(w, nx, ny)) return false
    if (w.trail[ny * w.G + nx] === p.id) return false
    if (p.trail.length && d === (p.dir + 2) % 4) return false
    return true
  }

  /** BFS to the nearest own tile, avoiding our own trail. Returns first step. */
  function bfsHome(w: World, p: P) {
    const G = w.G
    const vis = w.vis
    vis.fill(0)
    const q = w.queue
    const first = w.first
    let head = 0
    let tail = 0
    const s = p.y * G + p.x
    vis[s] = 1
    for (let d = 0; d < 4; d++) {
      if (!safe(w, p, d)) continue
      const i = s + DIRS[d][0] + DIRS[d][1] * G
      vis[i] = 1
      first[i] = d
      q[tail++] = i
    }
    while (head < tail) {
      const i = q[head++]
      if (w.owner[i] === p.id) return first[i]
      const x = i % G
      const y = (i - x) / G
      for (let d = 0; d < 4; d++) {
        const nx = x + DIRS[d][0]
        const ny = y + DIRS[d][1]
        if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue
        const j = ny * G + nx
        if (vis[j] || w.trail[j] === p.id || w.wall[j]) continue
        vis[j] = 1
        first[j] = first[i]
        q[tail++] = j
      }
    }
    return -1
  }

  function makePlan(w: World, p: P) {
    const G = w.G
    const opts: number[] = []
    for (let d = 0; d < 4; d++) {
      const [dx, dy] = DIRS[d]
      let k = 1
      while (k < 25 && inside(w, p.x + dx * k, p.y + dy * k) && w.owner[(p.y + dy * k) * G + p.x + dx * k] === p.id) k++
      if (inside(w, p.x + dx * (k + 3), p.y + dy * (k + 3))) opts.push(d * 100 + k)
    }
    if (!opts.length) return
    const pickd = opts[Math.floor(Math.random() * opts.length)]
    const d = Math.floor(pickd / 100)
    const edge = pickd % 100
    const early = w.time < 15
    const bold = p.bold * (early ? 0.6 : 1) + Math.min(1.5, w.level * 0.08)
    const a = edge + 1 + Math.floor(rand(1, 2 + bold * 1.8))
    const b = Math.floor(rand(2, 3 + bold * 2.2))
    const side = (d + (Math.random() < 0.5 ? 1 : 3)) % 4
    p.plan = []
    for (let k = 0; k < a; k++) p.plan.push(d)
    for (let k = 0; k < b; k++) p.plan.push(side)
    for (let k = 0; k < a - edge; k++) p.plan.push((d + 2) % 4)
  }

  function aiDecide(w: World, p: P): number {
    const G = w.G
    // The dev autopilot (player) keeps loops short, bails out early and never hunts.
    const careful = p === w.me
    const out = p.trail.length > 0
    const early = w.time < 15
    if (out) {
      const limit = careful ? 14 + Math.min(8, Math.floor(w.level / 3)) : 8 + p.bold * 6 + Math.min(5, Math.floor(w.level / 3))
      let danger = p.trail.length > limit
      if (!danger) {
        for (const q of w.players) {
          if (q === p || !q.alive) continue
          if (q === w.me && early) continue
          for (let k = 0; k < p.trail.length; k += 2) {
            const i = p.trail[k]
            const d = Math.abs((i % G) - q.x) + Math.abs(Math.floor(i / G) - q.y)
            if (d < (careful ? 9 : 3 + (4 - p.bold))) {
              danger = true
              break
            }
          }
          if (danger) break
        }
      }
      if (danger) p.plan = []
    }
    // Opportunistic cuts on nearby enemy trails.
    if (p.pers !== 'timid' && !early && !careful) {
      const reach = p.pers === 'hunter' ? 9 : p.pers === 'king' ? 7 : 5
      let best = -1
      let bd = reach
      for (const q of w.players) {
        if (q === p || !q.alive || !q.trail.length || q.inv > 0) continue
        for (let k = 0; k < q.trail.length; k += 1) {
          const i = q.trail[k]
          // Rivals are a little less keen on the player's trail than on each other's.
          const d = Math.abs((i % G) - p.x) + Math.abs(Math.floor(i / G) - p.y) + (q === w.me ? 2 : 0)
          if (d < bd) {
            bd = d
            best = i
          }
        }
      }
      if (best >= 0 && p.trail.length < 10) {
        const tx = best % G
        const ty = Math.floor(best / G)
        const cand = [tx > p.x ? 0 : tx < p.x ? 2 : -1, ty > p.y ? 1 : ty < p.y ? 3 : -1].filter((d) => d >= 0)
        for (const d of cand) if (safe(w, p, d)) return d
      }
    }
    if (p.plan.length) {
      const d = p.plan[0]
      if (safe(w, p, d)) {
        p.plan.shift()
        return d
      }
      p.plan = []
    }
    if (out) {
      const d = bfsHome(w, p)
      if (d >= 0) return d
    } else if (Math.random() < 0.8) {
      makePlan(w, p)
      if (p.plan.length && safe(w, p, p.plan[0])) return p.plan.shift()!
      p.plan = []
    }
    if (safe(w, p, p.dir) && Math.random() < 0.7) return p.dir
    const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5)
    for (const d of order) if (safe(w, p, d)) return d
    return p.dir
  }

  function stepPlayer(w: World, p: P, dt: number) {
    if (!p.alive) return
    // Dev autopilot steers the player with the rival AI (used to verify levels).
    const bot = p.ai || (auto.current && p === w.me)
    if (p.inv > 0) p.inv -= dt
    if (p.boots > 0) p.boots -= dt
    p.squash = Math.max(0, p.squash - dt * 5)
    p.blink -= dt
    if (p.blink < -0.12) p.blink = rand(2, 5)
    if (!bot && p.next >= 0 && p.next !== p.dir) {
      const reverse = p.next === (p.dir + 2) % 4
      // Snappy turns right after a cell boundary.
      if (!reverse && p.prog < 0.3 && !p.stopped) {
        p.dir = p.next
        p.next = -1
        p.squash = 1
        sfx.move()
      }
    }
    if (p.stopped) {
      if (bot) {
        const d = aiDecide(w, p)
        if (!safeTurn(w, p, d)) return
        p.dir = d
        p.stopped = false
      } else if (p.next >= 0 && safeTurn(w, p, p.next)) {
        p.dir = p.next
        p.next = -1
        p.stopped = false
      } else return
    }
    const lvlSpeed = p.ai ? Math.min(6.2, 5.4 + w.level * 0.04) : 6.6 * (1 + run.level('speed') * 0.06)
    p.prog += lvlSpeed * (p.boots > 0 ? 1.5 : 1) * dt
    while (p.prog >= 1 && p.alive) {
      p.prog -= 1
      const [dx, dy] = DIRS[p.dir]
      enterCell(w, p, p.x + dx, p.y + dy)
      if (!p.alive) return
      if (bot) p.dir = aiDecide(w, p)
      else if (p.next >= 0 && safeTurn(w, p, p.next)) {
        if (p.next !== p.dir) {
          p.squash = 1
          sfx.move()
        }
        p.dir = p.next
        p.next = -1
      }
      const [ex, ey] = DIRS[p.dir]
      if (!inside(w, p.x + ex, p.y + ey)) {
        p.prog = 0
        p.stopped = true
        if (bot) p.dir = aiDecide(w, p)
        return
      }
    }
  }

  /** Player may reverse only while safely at home with no trail. */
  function safeTurn(w: World, p: P, d: number) {
    const [dx, dy] = DIRS[d]
    if (!inside(w, p.x + dx, p.y + dy)) return false
    if (p.trail.length && d === (p.dir + 2) % 4) return false
    return true
  }

  function step(w: World, dt: number, ph: Phase) {
    w.time += dt
    w.clock += dt
    for (const p of w.players) stepPlayer(w, p, dt)
    w.players = w.players.filter((p) => p.alive || p === w.me)
    // Respawn rivals.
    for (let k = 0; k < w.respawn.length; k++) w.respawn[k] -= dt
    while (w.respawn.length && w.respawn[0] <= 0) {
      w.respawn.shift()
      if (w.players.filter((p) => p.ai && p.alive).length < w.rivals) {
        addRival(w)
        recount(w)
      }
    }
    if (w.flashT > 0) w.flashT -= dt
    const me = w.me
    if (ph === 'idle') {
      if (w.players.filter((p) => p.alive).length < 3) w.respawn.push(1)
      return
    }
    if (!me || ph !== 'play' || !me.alive) return
    // Pickups.
    w.pickT -= dt
    if (w.pickT <= 0) {
      w.pickT = rand(9, 13)
      if (w.pickups.length < 3) spawnPickup(w, me)
    }
    for (const k of w.pickups) {
      k.ph += dt
      k.life -= dt
    }
    w.pickups = w.pickups.filter((k) => k.life > 0)
    // Events.
    if (w.time >= w.nextEvent) {
      const n = w.eventIdx++
      w.nextEvent = w.time + 40
      const kind = ['rain', 'hunters', 'surge'][n % 3]
      if (kind === 'rain') {
        for (let k = 0; k < 3; k++) spawnPickup(w, me, 'bomb')
        say('PAINT RAIN', 'bombs dropped nearby')
        sfx.power()
      } else if (kind === 'hunters') {
        for (const p of w.players) if (p.ai && p.pers !== 'king') p.pers = 'hunter'
        say('HUNTER MODE', 'rivals go for trails')
        sfx.ready()
      } else {
        w.rivals = Math.min(8, w.rivals + 1)
        addRival(w)
        recount(w)
        repaint(w)
        say('NEW RIVAL', 'the map gets crowded')
        sfx.whoosh()
      }
    }
    const pct = (w.counts[me.id] / w.area) * 100
    w.stats.percent = Math.max(w.stats.percent, Math.floor(pct))
    if (pct >= w.target) {
      // Stars: clear = 1, within par time = +1, cut at least one rival trail = +1.
      const stars = 1 + (w.time <= w.spec.par ? 1 : 0) + (w.levelKills > 0 ? 1 : 0)
      const res = run.completeLevel(w.level, stars)
      const bonus = 500 * w.level
      w.score += bonus
      w.stats.level = w.level
      w.stats.score = Math.round(w.score)
      run.update(w.stats)
      w.clearT = 2.6
      setClearCard({ level: w.level, pct: Math.floor(pct), bonus, stars, time: Math.round(w.time), par: w.spec.par, first: res.firstClear })
      setPhaseBoth('clear')
      fx.flash('#ffffff', 0.25)
      sfx.win()
      haptic.success()
      if (w.level % 5 === 0 && w.clock - w.lastTrack > 30) {
        w.lastTrack = w.clock
        void trackEvent('action_milestone', { game_id: 'paint', kind: 'level', value: w.level })
      }
      return
    }
    w.hudT -= dt
    if (w.hudT <= 0) {
      w.hudT = 0.25
      w.stats.score = Math.round(w.score)
      run.update(w.stats)
      const total = w.area
      const rows = w.players
        .filter((p) => p.alive)
        .map((p) => ({ name: p.name, pct: (w.counts[p.id] / total) * 100, me: p === me, king: p.pers === 'king', color: p.color }))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 5)
      setBoard(rows)
      setHud({ pct, target: w.target, level: w.level, kills: w.stats.kills, score: Math.round(w.score), shield: me.shield, boots: me.boots })
    }
  }

  function spawnPickup(w: World, me: P, kind?: PickKind) {
    for (let k = 0; k < 20; k++) {
      const x = Math.floor(clamp(me.x + rand(-10, 10), 1, w.G - 2))
      const y = Math.floor(clamp(me.y + rand(-10, 10), 1, w.G - 2))
      if (w.wall[y * w.G + x] || w.owner[y * w.G + x] === me.id || Math.abs(x - me.x) + Math.abs(y - me.y) < 4) continue
      const kinds: PickKind[] = ['speed', 'shield', 'bomb', 'bomb']
      w.pickups.push({ x, y, kind: kind ?? kinds[Math.floor(Math.random() * kinds.length)], ph: 0, life: 22 })
      return
    }
  }

  function nextLevel() {
    const w0 = world.current!
    const w = buildLevel(w0.level + 1, true)
    setClearCard(null)
    setPhaseBoth('play')
    announce(w)
    sfx.levelUp()
  }

  function announce(w: World) {
    const sp = w.spec
    say(sp.boss ? `BOSS · ${sp.name}` : `LEVEL ${w.level} · ${sp.name}`, `own ${w.target}%${sp.hint ? ` · ${sp.hint}` : ` · ${w.rivals} rivals`}`)
  }

  // ── Input ───────────────────────────────────────────────

  function setDir(d: number) {
    const me = world.current?.me
    if (!me || !me.alive || phaseRef.current !== 'play') return
    me.next = d
  }
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    swipe.current = { id: e.pointerId, x: p.x, y: p.y }
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const s = swipe.current
    if (!s || s.id !== e.pointerId) return
    const p = localPoint(e, e.currentTarget)
    const dx = p.x - s.x
    const dy = p.y - s.y
    if (Math.hypot(dx, dy) < 16) return
    setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : dy > 0 ? 1 : 3)
    s.x = p.x
    s.y = p.y
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (swipe.current?.id === e.pointerId) swipe.current = null
  }

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__paint = world
    function down(e: KeyboardEvent) {
      const map: Record<string, number> = { ArrowRight: 0, d: 0, ArrowDown: 1, s: 1, ArrowLeft: 2, a: 2, ArrowUp: 3, w: 3 }
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (k in map && phaseRef.current === 'play') {
        e.preventDefault()
        setDir(map[k])
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Drawing ─────────────────────────────────────────────

  function drawBody(ctx: CanvasRenderingContext2D, p: P, x: number, y: number, t: number) {
    const sq = p.squash
    const bob = Math.sin(t * 12 + p.id) * 0.04
    const along = p.dir % 2 === 0
    const sx = 1 + (along ? -0.15 : 0.15) * sq
    const sy = 1 + (along ? 0.15 : -0.15) * sq
    const r = 0.7
    if (p.inv > 0 && Math.floor(t * 12) % 2 === 0) ctx.globalAlpha = 0.45
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.beginPath()
    ctx.ellipse(x + 0.08, y + 0.32, r * 0.95, r * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.translate(x, y + bob - 0.1)
    ctx.scale(sx, sy)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(-r - 0.12, -r - 0.12, r * 2 + 0.24, r * 2 + 0.36, 0.42)
    ctx.fill()
    ctx.fillStyle = p.dark
    ctx.beginPath()
    ctx.roundRect(-r, -r + 0.12, r * 2, r * 2, 0.35)
    ctx.fill()
    const g = ctx.createLinearGradient(0, -r, 0, r)
    g.addColorStop(0, p.light)
    g.addColorStop(1, p.color)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.roundRect(-r, -r, r * 2, r * 2 - 0.1, 0.35)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.beginPath()
    ctx.roundRect(-r * 0.7, -r * 0.8, r * 0.7, r * 0.3, 0.12)
    ctx.fill()
    const [dx, dy] = DIRS[p.dir]
    const blink = p.blink < 0 ? 0.2 : 1
    for (const s of [-1, 1]) {
      const ox = dx !== 0 ? dx * 0.2 : s * 0.24
      const oy = dx !== 0 ? s * 0.2 - 0.05 : dy * 0.15 - 0.05
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(ox + dx * 0.05, oy + dy * 0.04, 0.17, 0.2 * blink, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.arc(ox + dx * 0.07, oy + dy * 0.07, 0.09 * Math.max(0.3, blink), 0, Math.PI * 2)
      ctx.fill()
    }
    if (p.pers === 'king') {
      ctx.fillStyle = '#facc15'
      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 0.06
      ctx.beginPath()
      ctx.moveTo(-0.45, -0.62)
      ctx.lineTo(-0.45, -1.0)
      ctx.lineTo(-0.22, -0.8)
      ctx.lineTo(0, -1.1)
      ctx.lineTo(0.22, -0.8)
      ctx.lineTo(0.45, -1.0)
      ctx.lineTo(0.45, -0.62)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
    if (p.shield > 0) {
      ctx.strokeStyle = '#22d3ee'
      ctx.lineWidth = 0.1
      ctx.globalAlpha = 0.7 + Math.sin(t * 6) * 0.2
      ctx.beginPath()
      ctx.arc(x, y - 0.1, 0.95, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  function drawPickup(ctx: CanvasRenderingContext2D, k: Pickup) {
    const info = PICK[k.kind]
    const x = k.x + 0.5
    const y = k.y + 0.5 + Math.sin(k.ph * 4) * 0.12
    if (k.life < 4 && Math.floor(k.ph * 8) % 2 === 0) ctx.globalAlpha = 0.4
    glow(ctx, x, y, 1.6, info.color, 0.6)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, 0.62, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = info.color
    ctx.lineWidth = 0.14
    ctx.stroke()
    ctx.fillStyle = mix(info.color, -0.25)
    ctx.strokeStyle = mix(info.color, -0.25)
    ctx.lineWidth = 0.12
    ctx.lineCap = 'round'
    ctx.beginPath()
    if (k.kind === 'bomb') {
      ctx.arc(x - 0.05, y + 0.06, 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(x + 0.12, y - 0.18)
      ctx.quadraticCurveTo(x + 0.3, y - 0.45, x + 0.4, y - 0.35)
      ctx.stroke()
    } else if (k.kind === 'shield') {
      ctx.moveTo(x, y - 0.38)
      ctx.lineTo(x + 0.3, y - 0.25)
      ctx.quadraticCurveTo(x + 0.28, y + 0.2, x, y + 0.38)
      ctx.quadraticCurveTo(x - 0.28, y + 0.2, x - 0.3, y - 0.25)
      ctx.closePath()
      ctx.fill()
    } else {
      ctx.moveTo(x + 0.06, y - 0.4)
      ctx.lineTo(x - 0.22, y + 0.05)
      ctx.lineTo(x, y + 0.05)
      ctx.lineTo(x - 0.08, y + 0.4)
      ctx.lineTo(x + 0.22, y - 0.06)
      ctx.lineTo(x, y - 0.06)
      ctx.closePath()
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    const ph = phaseRef.current
    if (!world.current) buildLevel(1, false)
    const w = world.current!
    const dt = fx.step(raw)
    if (ph === 'clear') {
      w.clearT -= raw
      if (w.clearT <= 0) nextLevel()
    }
    if (dt > 0) for (let k = 0; k < turbo.current && world.current === w; k++) step(w, dt, phaseRef.current)
    const ww = world.current!
    const me = ww.me
    const G = ww.G
    const focus = me && me.alive ? me : ph === 'idle' ? ww.players.find((p) => p.alive) : null
    if (focus) {
      const [dx, dy] = DIRS[focus.dir]
      ww.cam.x = approach(ww.cam.x, focus.x + 0.5 + dx * focus.prog, 8, raw)
      ww.cam.y = approach(ww.cam.y, focus.y + 0.5 + dy * focus.prog, 8, raw)
    }
    const s = (Math.min(W, H * 0.8) / 24) * (ph === 'idle' ? 0.8 : 1)
    const bd = BOARDS[ww.board]

    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, bd.back[0])
    bg.addColorStop(1, bd.back[1])
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    // Parallax confetti dots behind the board.
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    for (let i = 0; i < 26; i++) {
      const px = ((((i * 97) % 389) / 389) * W - ww.cam.x * s * 0.3) % W
      const py = ((((i * 211) % 557) / 557) * H - ww.cam.y * s * 0.3) % H
      ctx.beginPath()
      ctx.arc(px < 0 ? px + W : px, py < 0 ? py + H : py, 3 + (i % 4), 0, Math.PI * 2)
      ctx.fill()
    }

    fx.applyShake(ctx)
    ctx.translate(W / 2, H / 2)
    ctx.scale(s, s)
    ctx.translate(-ww.cam.x, -ww.cam.y)
    // Board.
    ctx.fillStyle = 'rgba(15,23,42,0.18)'
    ctx.fillRect(-0.3, 0.2, G + 0.6, G + 0.6)
    ctx.fillStyle = bd.bg
    ctx.fillRect(0, 0, G, G)
    const x0 = Math.max(0, Math.floor(ww.cam.x - W / 2 / s))
    const x1 = Math.min(G, Math.ceil(ww.cam.x + W / 2 / s))
    const y0 = Math.max(0, Math.floor(ww.cam.y - H / 2 / s))
    const y1 = Math.min(G, Math.ceil(ww.cam.y + H / 2 / s))
    ctx.strokeStyle = bd.line
    ctx.lineWidth = 0.05
    ctx.beginPath()
    for (let x = x0; x <= x1; x++) {
      ctx.moveTo(x, y0)
      ctx.lineTo(x, y1)
    }
    for (let y = y0; y <= y1; y++) {
      ctx.moveTo(x0, y)
      ctx.lineTo(x1, y)
    }
    ctx.stroke()
    if (ww.dirty) {
      ww.cTerr.getContext('2d')!.putImageData(ww.terr, 0, 0)
      ww.cShad.getContext('2d')!.putImageData(ww.shad, 0, 0)
      ww.cTrl.getContext('2d')!.putImageData(ww.trl, 0, 0)
      ww.dirty = false
    }
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(ww.cShad, 0, 0.28, G, G)
    ctx.drawImage(ww.cTerr, 0, 0, G, G)
    ctx.globalAlpha = 0.9
    ctx.drawImage(ww.cTrl, 0, 0, G, G)
    ctx.globalAlpha = 1
    ctx.imageSmoothingEnabled = true
    // Fresh-claim shimmer.
    if (ww.flashT > 0 && ww.flash.length) {
      ctx.fillStyle = `rgba(255,255,255,${ww.flashT * 1.2})`
      for (const i of ww.flash) ctx.fillRect(i % G, Math.floor(i / G), 1, 1)
    }
    // Stone walls: chunky blocks with a lit top edge and a soft shadow.
    if (ww.walls) {
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          if (!ww.wall[y * G + x]) continue
          const up = y > 0 && ww.wall[(y - 1) * G + x]
          ctx.fillStyle = 'rgba(15,23,42,0.22)'
          ctx.fillRect(x + 0.12, y + 0.3, 1, 1)
          ctx.fillStyle = (x + y) % 2 ? '#94a3b8' : '#8b9bb0'
          ctx.fillRect(x, y, 1.02, 1.02)
          if (!up) {
            ctx.fillStyle = '#cbd5e1'
            ctx.fillRect(x, y, 1.02, 0.28)
          }
          if ((x * 7 + y * 13) % 5 === 0) {
            ctx.fillStyle = 'rgba(71,85,105,0.55)'
            ctx.fillRect(x + 0.2, y + 0.45, 0.35, 0.12)
          }
        }
      }
    }
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 0.25
    ctx.strokeRect(-0.12, -0.12, G + 0.24, G + 0.24)

    for (const k of ww.pickups) drawPickup(ctx, k)
    for (const p of ww.players) {
      if (!p.alive) continue
      const [dx, dy] = DIRS[p.dir]
      const px = p.x + 0.5 + dx * p.prog
      const py = p.y + 0.5 + dy * p.prog
      if (px < x0 - 2 || px > x1 + 2 || py < y0 - 2 || py > y1 + 2) continue
      drawBody(ctx, p, px, py, t)
      if (p.ai) {
        ctx.font = `800 0.62px 'Plus Jakarta Sans', system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = mix(p.color, -0.45)
        ctx.fillText(p.name, px, py - (p.pers === 'king' ? 1.5 : 1.05))
      }
    }
    fx.draw(ctx)
    ctx.restore()

    // Danger edge arrows for rivals near our trail.
    if (me && me.alive && me.trail.length && ph === 'play') {
      for (const p of ww.players) {
        if (!p.ai || !p.alive) continue
        const d = Math.abs(p.x - me.x) + Math.abs(p.y - me.y)
        if (d > 14) continue
        const sx = (p.x + 0.5 - ww.cam.x) * s + W / 2
        const sy = (p.y + 0.5 - ww.cam.y) * s + H / 2
        if (sx > 0 && sx < W && sy > 0 && sy < H) continue
        const a = Math.atan2(sy - H / 2, sx - W / 2)
        ctx.save()
        ctx.translate(clamp(sx, 20, W - 20), clamp(sy, 80, H - 20))
        ctx.rotate(a)
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.moveTo(11, 0)
        ctx.lineTo(-6, -8)
        ctx.lineTo(-6, 8)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  // Dev-only probes: autopilot (rival AI drives the player) + time skip, for level verification.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__paintAuto = (on: boolean, speed = 4) => {
      auto.current = on
      turbo.current = on ? speed : 1
      // The autopilot plays like a cautious builder: short loops, early retreats.
      const me = world.current?.me
      if (me) me.bold = on ? 2 : 3
    }
    win.__paintState = () => {
      const w = world.current
      if (!w || !w.me) return null
      return { level: w.level, pct: Math.round((w.counts[w.me.id] / w.area) * 1000) / 10, target: w.target, time: Math.round(w.time), kills: w.levelKills, phase: phaseRef.current }
    }
    return () => {
      delete win.__paintAuto
      delete win.__paintState
    }
  }, [])

  const playing = phase === 'play' || phase === 'dying' || phase === 'clear'
  const st = world.current?.stats ?? totals.current

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena paint-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud paint-hud">
              <div className="paint-stat">
                <div className="action-hud__score">{hud.pct.toFixed(1)}%</div>
                <div className="action-hud__small">
                  Level {hud.level} · goal {hud.target}% · {hud.kills} cuts
                </div>
                <div className="paint-goal">
                  <span style={{ width: `${clamp((hud.pct / hud.target) * 100, 0, 100)}%` }} />
                </div>
                <div className="paint-pows">
                  {hud.shield > 0 ? <span className="is-shield">SHIELD x{hud.shield}</span> : null}
                  {hud.boots > 0 ? <span className="is-speed">SPEED {Math.ceil(hud.boots)}</span> : null}
                </div>
              </div>
              <ol className="paint-board">
                {board.map((r, i) => (
                  <li key={`${r.name}-${i}`} className={r.me ? 'is-me' : ''}>
                    <i style={{ background: r.color }} />
                    {r.name}
                    <b>{r.pct.toFixed(1)}%</b>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {playing && (
            <div className="paint-feed">
              {feed.map((f) => (
                <div key={f.key} className={f.me ? 'is-me' : ''}>
                  {f.text}
                </div>
              ))}
            </div>
          )}
          {banner && playing ? (
            <div className="action-banner paint-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          {clearCard && phase === 'clear' ? (
            <div className="paint-clear">
              <h3>Level {clearCard.level} painted!</h3>
              <p className="paint-stars" aria-label={`${clearCard.stars} stars`}>
                {'★'.repeat(clearCard.stars)}
                {'☆'.repeat(3 - clearCard.stars)}
              </p>
              <p>
                {clearCard.pct}% owned · {clearCard.time}s (par {clearCard.par}s) · +{clearCard.bonus}
              </p>
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="paint"
              icon={meta.icon}
              title={meta.title}
              hint="Swipe to turn. Loop out and come back to claim the inside. Own the target % of each arena to clear the level — never let anyone touch your trail."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={st.level >= 2 ? 'Master painter!' : 'Trail cut!'}
            subtitle={`Score ${Math.round(world.current?.score ?? 0)} · ${st.level} levels · ${st.kills} cuts`}
            celebrate={st.level >= 2}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
