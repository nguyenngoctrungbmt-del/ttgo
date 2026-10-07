import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, clamp, glow } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'
import { LANDMARKS, drawArrow, drawCar, drawLandmark } from './art'
import { D, SIG_BY_LEVEL, landmarkIndex, routeLength, studyTime, turnDir, type Move } from './levels'

const meta = getGame('route')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Step = 'preview' | 'drive' | 'replay' | 'arrive'
type Turn = { ax: number; ay: number; cx: number; cy: number; bx: number; by: number; u: number; len: number; nd: number }

const B = 170
const RW = 48
const LANE = 10
const TR = 34
const ROOFS = ['#f87171', '#fb923c', '#facc15', '#a3e635', '#38bdf8', '#a78bfa', '#f472b6', '#94a3b8', '#e2e8f0', '#fca5a5']

const THEMES = [
  { name: 'day', tint: '', alpha: 0, ground: '#4b5563' },
  { name: 'sunset', tint: '#f97316', alpha: 0.12, ground: '#57534e' },
  { name: 'night', tint: '#0b1030', alpha: 0.5, ground: '#374151' },
  { name: 'dawn', tint: '#f472b6', alpha: 0.12, ground: '#525866' },
]

const TWISTS: Record<number, string> = {
  4: 'Longer routes ahead',
  6: 'Landmark directions!',
  7: 'Watch out for traffic',
  9: 'Decoy landmarks appear',
  10: 'Night shift',
}

function hash(i: number, j: number, k = 0) {
  const v = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453
  return v - Math.floor(v)
}

const key = (i: number, j: number) => `${i},${j}`

type World = {
  level: number
  vip: boolean
  theme: number
  score: number
  hearts: number
  maxHearts: number
  peeks: number
  tires: number
  streak: number
  // Taxi
  ci: number
  cj: number
  dir: number
  s: number
  speed: number
  turn: Turn | null
  x: number
  y: number
  ang: number
  camX: number
  camY: number
  camA: number
  // Route
  moves: Move[]
  nodes: [number, number][]
  landmarkMode: boolean
  marks: Map<string, number>
  listed: Set<number>
  routeKeys: Set<string>
  stepIdx: number
  locked: Move | null
  finalLeg: boolean
  dest: { x: number; y: number }
  jam: { k: number; done: boolean; t: number }
  crossCar: { x: number; y: number; vx: number; vy: number; t: number } | null
  // Flow
  step: Step
  stepT: number
  stepDur: number
  previewDur: number
  driveT: number
  par: number
  mistake: boolean
  /** A GPS peek was used this fare (star rule). */
  levelPeek: boolean
  dead: boolean
  pressed: Move | null
  pressT: number
  stats: { level: number; turns: number; perfect: number; speed: number }
}

function freshWorld(): World {
  return {
    level: 0,
    vip: false,
    theme: 0,
    score: 0,
    hearts: 3,
    maxHearts: 3,
    peeks: 0,
    tires: 0,
    streak: 0,
    ci: 0,
    cj: 0,
    dir: 0,
    s: B * 0.5,
    speed: 0,
    turn: null,
    x: LANE,
    y: -B * 0.5,
    ang: 0,
    camX: LANE,
    camY: -B * 0.5,
    camA: 0,
    moves: [],
    nodes: [],
    landmarkMode: false,
    marks: new Map(),
    listed: new Set(),
    routeKeys: new Set(),
    stepIdx: 0,
    locked: null,
    finalLeg: false,
    dest: { x: 0, y: 0 },
    jam: { k: -1, done: true, t: 0 },
    crossCar: null,
    step: 'preview',
    stepT: 0,
    stepDur: 1,
    previewDur: 3,
    driveT: 0,
    par: 10,
    mistake: false,
    levelPeek: false,
    dead: false,
    pressed: null,
    pressT: 0,
    stats: { level: 0, turns: 0, perfect: 0, speed: 0 },
  }
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}


const BLOCK_PAD = 6
const BLOCK_SCALE = 2
const blockCache = new Map<string, HTMLCanvasElement>()

function roundRectPath(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

function paintBlock(g: CanvasRenderingContext2D, i: number, j: number, inner: number) {
  const x0 = 0
  const y0 = 0
  const rr = roundRectPath
  g.fillStyle = '#cbd5e1'
  rr(g, x0, y0, inner, inner, 10)
  g.fill()
  const h = hash(i, j)
  if (h < 0.13) {
    g.fillStyle = '#4ade80'
    rr(g, x0 + 6, y0 + 6, inner - 12, inner - 12, 8)
    g.fill()
    for (let k = 0; k < 6; k++) {
      const tx = x0 + 18 + hash(i, j, k + 10) * (inner - 36)
      const ty = y0 + 18 + hash(i, j, k + 20) * (inner - 36)
      g.fillStyle = 'rgba(0,0,0,0.18)'
      g.beginPath()
      g.arc(tx + 4, ty + 4, 12, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = k % 2 ? '#16a34a' : '#22c55e'
      g.beginPath()
      g.arc(tx, ty, 12, 0, Math.PI * 2)
      g.fill()
    }
    return
  }
  const half = (inner - 12) / 2
  for (let q = 0; q < 4; q++) {
    const lx = x0 + 6 + (q % 2) * half
    const ly = y0 + 6 + Math.floor(q / 2) * half
    const hq = hash(i, j, q + 1)
    const roof = ROOFS[Math.floor(hq * ROOFS.length)]
    g.fillStyle = 'rgba(0,0,0,0.25)'
    g.fillRect(lx + 5, ly + 5, half - 4, half - 4)
    g.fillStyle = roof
    g.fillRect(lx + 2, ly + 2, half - 4, half - 4)
    g.fillStyle = 'rgba(255,255,255,0.22)'
    g.fillRect(lx + 6, ly + 6, half - 12, half - 12)
    if (hq > 0.5) {
      g.fillStyle = 'rgba(0,0,0,0.25)'
      g.fillRect(lx + half * 0.55, ly + half * 0.2, half * 0.2, half * 0.2)
    }
  }

}

function blockSprite(i: number, j: number, inner: number): HTMLCanvasElement {
  const key = i + ',' + j
  const hit = blockCache.get(key)
  if (hit) return hit
  const size = inner + BLOCK_PAD * 2
  const c = document.createElement('canvas')
  c.width = Math.ceil(size * BLOCK_SCALE)
  c.height = Math.ceil(size * BLOCK_SCALE)
  const g = c.getContext('2d')!
  g.scale(BLOCK_SCALE, BLOCK_SCALE)
  g.translate(BLOCK_PAD, BLOCK_PAD)
  paintBlock(g, i, j, inner)
  blockCache.set(key, c)
  if (blockCache.size > 160) {
    const first = blockCache.keys().next().value
    if (first) blockCache.delete(first)
  }
  return c
}

export default function RouteGame() {
  const run = useActionRun('route')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const size = useRef({ w: 360, h: 600 })

  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__route = world

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hearts: 3, max: 3, tires: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: Math.max(1, w.level), hearts: w.hearts, max: w.maxHearts, tires: w.tires })
  }

  function setStep(s: Step, dur: number) {
    const w = world.current
    w.step = s
    w.stepT = 0
    w.stepDur = dur
  }

  function speedFor(L: number) {
    return 120 + Math.min(80, L * 4)
  }

  function landmarkAt(i: number, j: number): number {
    const w = world.current
    const k = key(i, j)
    const m = w.marks.get(k)
    if (m !== undefined) return m
    if (w.routeKeys.has(k)) return -1
    const h = hash(i, j, 3)
    if (h > 0.2) return -1
    let type = Math.floor(hash(i, j, 4) * LANDMARKS.length)
    // Off-route decor never uses a landmark that the directions mention.
    for (let n = 0; n < 8 && w.listed.has(type); n++) type = (type + 1) % LANDMARKS.length
    return w.listed.has(type) ? -1 : type
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.peeks = run.level('gps')
    // Jumping in late: the GPS peeks a run would have earned on the way.
    w.peeks += Math.min(3, Math.floor((level - 1) / 10))
    w.tires = run.level('tire')
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    beginLevel(Math.max(1, level))
  }

  function beginLevel(level: number) {
    const w = world.current
    w.level = level
    w.stats.level = Math.max(w.stats.level, level)
    const sig = SIG_BY_LEVEL.get(level)
    w.theme = sig?.theme ?? Math.floor((w.level - 1) / 5) % THEMES.length
    w.vip = w.level % 5 === 0
    w.levelPeek = false
    buildRoute()
    const twist = TWISTS[w.level]
    let sub = w.vip ? 'VIP fare · x2 tips' : twist ?? (w.level === 1 ? 'memorise the directions' : undefined)
    if (sig) sub = w.vip ? `${sig.name} · VIP x2` : sig.tip ? `${sig.name} · ${sig.tip}` : sig.name
    setBanner({ key: Date.now(), text: w.vip ? `BOSS · LEVEL ${w.level}` : `LEVEL ${w.level}`, sub })
    if (w.vip) sfx.power()
    else sfx.ready()
    run.update(w.stats)
    pushHud()
  }

  function buildRoute() {
    const w = world.current
    const L = w.level
    const sig = SIG_BY_LEVEL.get(L)
    const n = sig ? sig.moves.length : routeLength(L)
    let moves: Move[] = []
    let nodes: [number, number][] = []
    let finalDir = w.dir
    if (sig) {
      // Signature routes are relative, so they fit from wherever the taxi stands.
      moves = sig.moves.split('') as Move[]
      let ci = w.ci + D[w.dir][0]
      let cj = w.cj + D[w.dir][1]
      let d = w.dir
      for (const m of moves) {
        nodes.push([ci, cj])
        d = turnDir(d, m)
        ci += D[d][0]
        cj += D[d][1]
      }
      finalDir = d
    }
    for (let attempt = 0; attempt < 60 && !sig; attempt++) {
      const visited = new Set<string>([key(w.ci, w.cj)])
      let ci = w.ci + D[w.dir][0]
      let cj = w.cj + D[w.dir][1]
      let d = w.dir
      moves = []
      nodes = []
      let ok = true
      for (let k = 0; k < n; k++) {
        visited.add(key(ci, cj))
        nodes.push([ci, cj])
        const opts = shuffle<Move>(['L', 'S', 'R', Math.random() < 0.4 ? 'S' : 'L', Math.random() < 0.5 ? 'R' : 'L'])
        let chosen: Move | null = null
        for (const m of opts) {
          const nd = turnDir(d, m)
          const ni = ci + D[nd][0]
          const nj = cj + D[nd][1]
          if (visited.has(key(ni, nj))) continue
          // Keep the first junction gentle on level 1.
          chosen = m
          break
        }
        if (!chosen) {
          ok = false
          break
        }
        moves.push(chosen)
        d = turnDir(d, chosen)
        ci += D[d][0]
        cj += D[d][1]
      }
      if (ok && !visited.has(key(ci, cj))) {
        finalDir = d
        break
      }
    }
    w.moves = moves
    w.nodes = nodes
    const last = nodes[nodes.length - 1]
    const rv = D[(finalDir + 1) % 4]
    const mx = (last[0] + D[finalDir][0] * 0.5) * B
    const my = (last[1] + D[finalDir][1] * 0.5) * B
    w.dest = { x: mx + rv[0] * (RW / 2 + 26), y: my + rv[1] * (RW / 2 + 26) }
    w.routeKeys = new Set(nodes.map(([i, j]) => key(i, j)))
    w.marks = new Map()
    w.listed = new Set()
    const turns = moves.filter((m) => m !== 'S').length
    w.landmarkMode = sig
      ? !!(sig.tour || sig.marks)
      : L >= 6 && turns <= LANDMARKS.length && turns >= 1 && Math.random() < (L >= 10 ? 0.7 : 0.5)
    let types = shuffle(Array.from({ length: LANDMARKS.length }, (_, i) => i))
    // Landmark tours name their sights in order; the rest stay spare for decoys.
    if (sig?.tour) {
      const tour = sig.tour.map(landmarkIndex)
      types = [...tour, ...types.filter((t) => !tour.includes(t))]
    }
    if (w.landmarkMode) {
      let ti = 0
      moves.forEach((m, k) => {
        if (m !== 'S') {
          const t = types[ti++]
          w.marks.set(key(...nodes[k]), t)
          w.listed.add(t)
        }
      })
      const spare = types.slice(ti)
      let si = 0
      moves.forEach((m, k) => {
        if (m !== 'S' || !spare.length) return
        if (sig ? sig.decoys && si++ % 2 === 0 : L >= 9 && Math.random() < 0.45) w.marks.set(key(...nodes[k]), spare[(sig ? si : Math.floor(Math.random() * spare.length)) % spare.length])
      })
    } else {
      // Plain mode: a few landmarks along the way as memory anchors.
      moves.forEach((_, k) => {
        if (Math.random() < 0.3) w.marks.set(key(...nodes[k]), types[k % types.length])
      })
    }
    w.stepIdx = 0
    w.locked = null
    w.finalLeg = false
    w.mistake = false
    w.dead = false
    const jamK = sig ? sig.jam ?? -1 : L >= 7 && n > 3 && Math.random() < 0.45 ? 1 + Math.floor(Math.random() * (n - 2)) : -1
    w.jam = { k: jamK, done: false, t: 0 }
    w.crossCar = null
    const v = speedFor(L)
    w.par = n * ((B - 2 * TR) / v + (TR * 2) / v + 0.9) + 2
    w.driveT = 0
    w.previewDur = studyTime(L, n, w.landmarkMode ? turns : 0) * (1 + 0.15 * run.level('study'))
    setStep('preview', w.previewDur)
  }

  function choose(m: Move) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.step !== 'drive' || w.locked || w.turn || w.finalLeg) return
    w.pressed = m
    w.pressT = 0.2
    const exp = w.moves[w.stepIdx]
    const { w: W, h: H } = size.current
    if (m === exp) {
      w.locked = m
      w.stats.turns += 1
      const pts = Math.round((15 + w.level * 3) * (1 + Math.min(4, Math.floor(w.streak / 2))))
      w.score += pts
      fx.text(W / 2, H * 0.5, `+${pts}`, '#fde047', 18)
      sfx.score(w.stepIdx)
      haptic.light()
      run.update(w.stats)
      pushHud()
    } else {
      w.mistake = true
      w.streak = 0
      w.speed = 0
      fx.flash('#ef4444', 0.25)
      fx.shake(10, 0.35)
      sfx.hurt()
      haptic.error()
      if (w.tires > 0) {
        w.tires -= 1
        fx.text(W / 2, H * 0.45, 'SPARE TIRE!', '#67e8f9', 22)
        sfx.clang()
      } else {
        w.hearts -= 1
        fx.text(W / 2, H * 0.45, 'WRONG TURN!', '#fca5a5', 22)
        if (w.hearts <= 0) w.dead = true
      }
      pushHud()
      setStep('replay', w.dead ? 1.0 : 1.8)
    }
  }

  function doPeek() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.step !== 'drive' || w.peeks <= 0 || w.finalLeg) return
    w.peeks -= 1
    w.levelPeek = true
    sfx.whoosh()
    haptic.light()
    setStep('replay', 1.3)
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.35)
    fx.shake(12, 0.4)
    fx.slowmo(0.8, 0.35)
    sfx.lose()
    haptic.heavy()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.level * 1.5 + w.stats.turns * 0.3 + w.stats.speed * 2)
      run.end({ score: w.score, cleared: w.level >= 10, stats: { ...w.stats }, coins }, revive)
    }, 1000)
  }

  /** Revive: two hearts back and the current fare starts over from where the taxi stands. */
  function revive() {
    const w = world.current
    w.hearts = Math.max(w.hearts, Math.min(w.maxHearts, 2))
    w.dead = false
    setPhaseBoth('play')
    beginLevel(w.level)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: `level ${w.level} again` })
  }

  function buttons() {
    const { w: W, h: H } = size.current
    const gap = 10
    const bw = (W - 24 - gap * 2) / 3
    const bh = 62
    const y = H - bh - 12
    return (['L', 'S', 'R'] as Move[]).map((m, i) => ({ m, x: 12 + i * (bw + gap), y, w: bw, h: bh }))
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const w = world.current
    const p = localPoint(e, e.currentTarget)
    if (w.step === 'preview') {
      if (w.stepT > 0.6) w.stepT = w.stepDur
      return
    }
    const { w: W } = size.current
    if (Math.hypot(p.x - (W - 36), p.y - 104) < 28) {
      doPeek()
      return
    }
    const b = buttons().find((bb) => p.x >= bb.x && p.x <= bb.x + bb.w && p.y >= bb.y && p.y <= bb.y + bb.h)
    if (b) choose(b.m)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (phaseRef.current !== 'play') return
      const w = world.current
      if (w.step === 'preview' && (e.key === ' ' || e.key === 'Enter')) w.stepT = w.stepDur
      if (e.key === 'ArrowLeft' || e.key === 'a') choose('L')
      if (e.key === 'ArrowUp' || e.key === 'w') choose('S')
      if (e.key === 'ArrowRight' || e.key === 'd') choose('R')
      if (e.key === 'p' || e.key === 'P') doPeek()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Taxi movement ───────────────────────────────────────────
  function edgePos(w: World) {
    const r = D[(w.dir + 1) % 4]
    w.x = w.ci * B + D[w.dir][0] * w.s + r[0] * LANE
    w.y = w.cj * B + D[w.dir][1] * w.s + r[1] * LANE
  }

  function beginTurn(w: World, m: Move) {
    const nd = turnDir(w.dir, m)
    const ni = w.ci + D[w.dir][0]
    const nj = w.cj + D[w.dir][1]
    const r0 = D[(w.dir + 1) % 4]
    const r1 = D[(nd + 1) % 4]
    const ax = ni * B - D[w.dir][0] * TR + r0[0] * LANE
    const ay = nj * B - D[w.dir][1] * TR + r0[1] * LANE
    const bx = ni * B + D[nd][0] * TR + r1[0] * LANE
    const by = nj * B + D[nd][1] * TR + r1[1] * LANE
    let cx = (ax + bx) / 2
    let cy = (ay + by) / 2
    if (nd !== w.dir) {
      const t = (bx - ax) * D[w.dir][0] + (by - ay) * D[w.dir][1]
      cx = ax + D[w.dir][0] * t
      cy = ay + D[w.dir][1] * t
    }
    const len = nd === w.dir ? TR * 2 : (Math.hypot(cx - ax, cy - ay) + Math.hypot(bx - cx, by - cy)) * 0.82
    w.turn = { ax, ay, cx, cy, bx, by, u: 0, len, nd }
  }

  function driveStep(dt: number) {
    const w = world.current
    const v = speedFor(w.level)
    if (w.turn) {
      const tn = w.turn
      w.speed += (v * 0.8 - w.speed) * Math.min(1, dt * 4)
      tn.u = Math.min(1, tn.u + (w.speed * dt) / tn.len)
      const u = tn.u
      const iu = 1 - u
      w.x = iu * iu * tn.ax + 2 * iu * u * tn.cx + u * u * tn.bx
      w.y = iu * iu * tn.ay + 2 * iu * u * tn.cy + u * u * tn.by
      const tx = 2 * iu * (tn.cx - tn.ax) + 2 * u * (tn.bx - tn.cx)
      const ty = 2 * iu * (tn.cy - tn.ay) + 2 * u * (tn.by - tn.cy)
      if (Math.abs(tx) + Math.abs(ty) > 0.001) w.ang = Math.atan2(tx, -ty)
      if (u >= 1) {
        w.ci += D[w.dir][0]
        w.cj += D[w.dir][1]
        w.dir = tn.nd
        w.s = TR
        w.turn = null
        w.stepIdx += 1
        if (w.stepIdx >= w.moves.length) w.finalLeg = true
        w.ang = (w.dir * Math.PI) / 2
      }
      return
    }
    // Traffic jam on one stretch of the route.
    if (w.jam.k === w.stepIdx && !w.jam.done && w.s > B * 0.32) {
      w.jam.done = true
      w.jam.t = 1.8
      const ni = w.ci + D[w.dir][0]
      const nj = w.cj + D[w.dir][1]
      const pd = D[(w.dir + 1) % 4]
      w.crossCar = { x: ni * B - pd[0] * B * 0.6, y: nj * B - pd[1] * B * 0.6, vx: pd[0] * 140, vy: pd[1] * 140, t: 2.4 }
      fx.text(size.current.w / 2, size.current.h * 0.38, 'TRAFFIC!', '#fdba74', 20)
      sfx.tick()
      window.setTimeout(() => sfx.tick(), 140)
    }
    let target = v
    if (w.jam.t > 0) {
      w.jam.t -= dt
      target = 0
    }
    const stopAt = w.finalLeg ? B * 0.5 : B - TR - 3
    if (w.finalLeg || !w.locked) target = Math.min(target, Math.sqrt(2 * 520 * Math.max(0, stopAt - w.s)))
    w.speed += (target - w.speed) * Math.min(1, dt * (target < w.speed ? 9 : 3))
    w.s = Math.min(w.s + w.speed * dt, w.finalLeg || !w.locked ? stopAt : B)
    edgePos(w)
    w.ang = (w.dir * Math.PI) / 2
    if (!w.finalLeg && w.locked && w.s >= B - TR) {
      beginTurn(w, w.locked)
      w.locked = null
    }
    if (w.finalLeg && w.s >= stopAt - 1) arrive()
  }

  function arrive() {
    const w = world.current
    const { w: W, h: H } = size.current
    const fast = w.driveT <= w.par
    let tip = 20 + w.moves.length * 5
    if (fast) {
      tip += 25
      w.stats.speed += 1
    }
    if (!w.mistake) {
      w.streak += 1
      w.stats.perfect += 1
      tip += 20
      if (w.streak % 3 === 0) {
        w.peeks += 1
        fx.text(W / 2, H * 0.3, '+1 GPS PEEK', '#67e8f9', 18)
      }
    }
    if (w.vip) tip *= 2
    const pts = tip * 10
    w.score += pts
    fx.text(W / 2, H * 0.42, `+${pts}`, '#fde047', 26)
    if (fast) fx.text(W / 2, H * 0.36, 'SPEED BONUS!', '#86efac', 20)
    if (!w.mistake) fx.text(W / 2, H * 0.48, 'PERFECT FARE', '#f0abfc', 18)
    fx.burst(W / 2, H * 0.58, { count: 30, color: ['#fde047', '#facc15', '#ffffff'], speed: 300, shape: 'square', size: 5, gravity: 400 })
    fx.ring(W / 2, H * 0.58, { color: '#fde047', maxR: 80, life: 0.5, width: 4 })
    sfx.win()
    haptic.success()
    // Stars: delivered = 1, no wrong turn = +1, no GPS peek = +1.
    const stars = 1 + (w.mistake ? 0 : 1) + (w.levelPeek ? 0 : 1)
    run.completeLevel(w.level, stars)
    const sig = SIG_BY_LEVEL.get(w.level)
    setBanner({
      key: Date.now(),
      text: w.vip ? 'VIP DELIVERED!' : 'ARRIVED!',
      sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}${sig ? ' · ' + sig.name : ''}`,
    })
    run.update(w.stats)
    pushHud()
    setStep('arrive', 1.4)
  }

  function update(dt: number, raw: number) {
    const w = world.current
    w.pressT = Math.max(0, w.pressT - raw)
    if (w.crossCar) {
      w.crossCar.x += w.crossCar.vx * dt
      w.crossCar.y += w.crossCar.vy * dt
      w.crossCar.t -= dt
      if (w.crossCar.t <= 0) w.crossCar = null
    }
    if (phaseRef.current === 'idle') {
      // Attract mode: cruise around the block.
      if (!w.turn && w.s >= B - TR) beginTurn(w, Math.random() < 0.5 ? 'S' : 'R')
      if (w.turn) {
        const tn = w.turn
        tn.u = Math.min(1, tn.u + (110 * raw) / tn.len)
        const u = tn.u
        const iu = 1 - u
        w.x = iu * iu * tn.ax + 2 * iu * u * tn.cx + u * u * tn.bx
        w.y = iu * iu * tn.ay + 2 * iu * u * tn.cy + u * u * tn.by
        const tx = 2 * iu * (tn.cx - tn.ax) + 2 * u * (tn.bx - tn.cx)
        const ty = 2 * iu * (tn.cy - tn.ay) + 2 * u * (tn.by - tn.cy)
        w.ang = Math.atan2(tx, -ty)
        if (u >= 1) {
          w.ci += D[w.dir][0]
          w.cj += D[w.dir][1]
          w.dir = tn.nd
          w.s = TR
          w.turn = null
        }
      } else {
        w.s += 110 * raw
        edgePos(w)
        w.ang = (w.dir * Math.PI) / 2
      }
      return
    }
    if (phaseRef.current !== 'play') return
    w.stepT += dt
    if (w.step === 'drive') {
      w.driveT += dt
      driveStep(dt)
    } else if (w.step === 'preview' || w.step === 'replay') {
      w.speed = 0
    }
    if (w.stepT < w.stepDur || w.step === 'drive') return
    switch (w.step) {
      case 'preview':
        setStep('drive', 9999)
        sfx.tick()
        break
      case 'replay':
        if (w.dead) {
          die()
          return
        }
        setStep('drive', 9999)
        break
      case 'arrive':
        if (w.level % 5 === 0) {
          if (w.hearts < w.maxHearts) {
            w.hearts += 1
            fx.text(size.current.w / 2, 120, '+1 HEART', '#fca5a5', 22)
          } else {
            w.peeks += 1
            fx.text(size.current.w / 2, 120, '+1 GPS PEEK', '#67e8f9', 22)
          }
          sfx.levelUp()
          void trackEvent('action_milestone', { game_id: 'route', kind: 'level', value: w.level })
        }
        // The fare ends where the next begins: continue from the destination.
        beginLevel(w.level + 1)
        break
    }
  }

  // ── Drawing ─────────────────────────────────────────────────
  const font = (s: number, wt = 800) => `${wt} ${s}px 'Plus Jakarta Sans', system-ui, sans-serif`

  function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
  }

  function drawCity(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
    const w = world.current
    const th = THEMES[w.theme]
    ctx.fillStyle = th.ground
    ctx.fillRect(0, 0, W, H)
    ctx.save()
    ctx.translate(W / 2, H * 0.6)
    ctx.rotate(-w.camA)
    ctx.translate(-w.camX, -w.camY)
    const R = Math.hypot(W, H) * 0.75
    const i0 = Math.floor((w.camX - R) / B) - 1
    const i1 = Math.floor((w.camX + R) / B) + 1
    const j0 = Math.floor((w.camY - R) / B) - 1
    const j1 = Math.floor((w.camY + R) / B) + 1
    const inner = B - RW
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        // City blocks never change, so each is drawn once into a cached sprite.
        ctx.drawImage(blockSprite(i, j, inner), i * B + RW / 2 - BLOCK_PAD, j * B + RW / 2 - BLOCK_PAD, inner + BLOCK_PAD * 2, inner + BLOCK_PAD * 2)
      }
    }
    // Lane dashes
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'
    ctx.lineWidth = 2.5
    ctx.setLineDash([14, 14])
    ctx.beginPath()
    for (let i = i0; i <= i1; i++) {
      ctx.moveTo(i * B, j0 * B)
      ctx.lineTo(i * B, j1 * B)
    }
    for (let j = j0; j <= j1; j++) {
      ctx.moveTo(i0 * B, j * B)
      ctx.lineTo(i1 * B, j * B)
    }
    ctx.stroke()
    ctx.setLineDash([])
    // Intersections & crosswalks
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        ctx.fillStyle = th.ground
        ctx.fillRect(i * B - RW / 2, j * B - RW / 2, RW, RW)
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        for (let k = 0; k < 5; k++) {
          const o = -RW / 2 + 5 + k * 8.5
          ctx.rect(i * B + o, j * B - RW / 2 - 9, 5, 7)
          ctx.rect(i * B + o, j * B + RW / 2 + 2, 5, 7)
          ctx.rect(i * B - RW / 2 - 9, j * B + o, 7, 5)
          ctx.rect(i * B + RW / 2 + 2, j * B + o, 7, 5)
        }
      }
    }
    ctx.fill()
    // Time-of-day tint goes under landmarks so they always stay readable.
    if (th.alpha > 0) {
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = th.alpha
      ctx.fillStyle = th.tint
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      ctx.restore()
      if (w.theme === 2) {
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) glow(ctx, i * B + RW / 2 + 4, j * B + RW / 2 + 4, 46, '#fef3c7', 0.35)
      }
    }
    // Upcoming junction marker
    if (phaseRef.current === 'play' && w.step !== 'preview' && !w.finalLeg && w.stepIdx < w.nodes.length) {
      const [ni, nj] = w.nodes[w.stepIdx]
      const pulse = 0.5 + 0.5 * Math.sin(t * 6)
      ctx.strokeStyle = w.locked ? '#4ade80' : '#fde047'
      ctx.globalAlpha = 0.5 + pulse * 0.4
      ctx.lineWidth = 3
      ctx.setLineDash([8, 6])
      ctx.strokeRect(ni * B - RW / 2 + 2, nj * B - RW / 2 + 2, RW - 4, RW - 4)
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      if (w.locked) {
        // Painted arrow on the junction shows the locked-in choice.
        ctx.save()
        ctx.translate(ni * B, nj * B)
        ctx.rotate(w.camA)
        drawArrow(ctx, w.locked, 0, 0, 16, 'rgba(74,222,128,0.95)')
        ctx.restore()
      }
    }
    // Landmarks (kept upright)
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const lm = landmarkAt(i, j)
        if (lm < 0) continue
        ctx.save()
        ctx.translate(i * B - RW / 2 - 26, j * B - RW / 2 - 26)
        ctx.rotate(w.camA)
        drawLandmark(ctx, lm, 0, 0, 20)
        ctx.restore()
      }
    }
    // Destination
    if (phaseRef.current === 'play' && w.nodes.length) {
      ctx.save()
      ctx.translate(w.dest.x, w.dest.y)
      ctx.rotate(w.camA)
      const bob = Math.sin(t * 4) * 4
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(0, 8, 14, 5, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#facc15'
      ctx.beginPath()
      ctx.moveTo(0, 6 + bob)
      ctx.bezierCurveTo(-18, -12 + bob, -14, -34 + bob, 0, -34 + bob)
      ctx.bezierCurveTo(14, -34 + bob, 18, -12 + bob, 0, 6 + bob)
      ctx.fill()
      ctx.strokeStyle = '#a16207'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(0, -20 + bob, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
    // Crossing car (traffic event)
    if (w.crossCar) {
      const c = w.crossCar
      drawCar(ctx, c.x, c.y, Math.atan2(c.vx, -c.vy), 34, '#3b82f6', false, w.theme === 2, false)
    }
    ctx.restore()
  }

  function drawDirections(ctx: CanvasRenderingContext2D, W: number, H: number, fromStep: number, title: string, timerK: number) {
    const w = world.current
    const pw = W - 28
    const x = 14
    const moves = w.moves
    type Row = { move: Move; lm: number; idx: number }
    let rows: Row[] = []
    if (w.landmarkMode) {
      moves.forEach((m, k) => {
        if (m !== 'S' && k >= fromStep) rows.push({ move: m, lm: w.marks.get(key(...w.nodes[k])) ?? -1, idx: k })
      })
    } else rows = moves.map((m, k) => ({ move: m, lm: -1, idx: k })).filter((r) => r.idx >= fromStep)
    const perRow = 5
    const tile = Math.min(56, (pw - 24 - (perRow - 1) * 8) / perRow)
    const listH = w.landmarkMode ? Math.max(1, rows.length) * 50 : Math.ceil(Math.max(1, rows.length) / perRow) * (tile + 10)
    const ph = 76 + listH + 40
    const y = Math.max(70, H * 0.42 - ph / 2)
    ctx.fillStyle = 'rgba(2,6,23,0.55)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(15,23,42,0.95)'
    rr(ctx, x, y, pw, ph, 18)
    ctx.fill()
    ctx.strokeStyle = '#fde047'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#fde047'
    ctx.font = font(18, 900)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, W / 2, y + 24)
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = font(12, 700)
    ctx.fillText(w.landmarkMode ? 'Go STRAIGHT at every other junction' : `${rows.length} junction${rows.length === 1 ? '' : 's'}, in order`, W / 2, y + 46)
    const ly = y + 66
    if (rows.length === 0) {
      ctx.fillStyle = '#fff'
      ctx.font = font(15, 800)
      ctx.fillText('Straight on to the pin!', W / 2, ly + 20)
    } else if (w.landmarkMode) {
      rows.forEach((r, i) => {
        const ry = ly + i * 50 + 22
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        rr(ctx, x + 12, ry - 21, pw - 24, 44, 12)
        ctx.fill()
        if (r.lm >= 0) drawLandmark(ctx, r.lm, x + 38, ry - 2, 15, false)
        ctx.fillStyle = r.move === 'L' ? '#60a5fa' : '#f472b6'
        rr(ctx, x + 62, ry - 16, 34, 32, 8)
        ctx.fill()
        drawArrow(ctx, r.move, x + 79, ry, 11)
        ctx.fillStyle = '#fff'
        ctx.font = font(15, 800)
        ctx.textAlign = 'left'
        ctx.fillText(`${r.move === 'L' ? 'Left' : 'Right'} at the ${r.lm >= 0 ? LANDMARKS[r.lm].name : '?'}`, x + 106, ry + 1)
        ctx.textAlign = 'center'
      })
    } else {
      rows.forEach((r, i) => {
        const c = i % perRow
        const rw = Math.floor(i / perRow)
        const inRow = Math.min(perRow, rows.length - rw * perRow)
        const rowW = inRow * tile + (inRow - 1) * 8
        const tx = W / 2 - rowW / 2 + c * (tile + 8)
        const ty = ly + rw * (tile + 10)
        ctx.fillStyle = r.move === 'L' ? '#2563eb' : r.move === 'R' ? '#db2777' : '#475569'
        rr(ctx, tx, ty, tile, tile, 12)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        rr(ctx, tx + 3, ty + 3, tile - 6, tile * 0.35, 9)
        ctx.fill()
        drawArrow(ctx, r.move, tx + tile / 2, ty + tile / 2 + 2, tile * 0.3)
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.font = font(10, 900)
        ctx.textAlign = 'left'
        ctx.fillText(String(r.idx + 1), tx + 5, ty + 9)
        ctx.textAlign = 'center'
      })
    }
    // Timer + hint
    const by = y + ph - 22
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    rr(ctx, x + 24, by - 3, pw - 48, 6, 3)
    ctx.fill()
    ctx.fillStyle = timerK < 0.3 ? '#f87171' : '#fde047'
    rr(ctx, x + 24, by - 3, (pw - 48) * timerK, 6, 3)
    ctx.fill()
    if (w.step === 'preview') {
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = font(11, 700)
      ctx.fillText('MEMORISE · tap to drive', W / 2, by + 13)
    }
  }

  function drawButtons(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const active = w.step === 'drive' && !w.locked && !w.turn && !w.finalLeg
    for (const b of buttons()) {
      const isLocked = w.locked === b.m
      const press = w.pressed === b.m && w.pressT > 0 ? 0.94 : 1
      ctx.save()
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2)
      ctx.scale(press, press)
      ctx.globalAlpha = active || isLocked ? 1 : 0.45
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      rr(ctx, -b.w / 2, -b.h / 2 + 4, b.w, b.h, 16)
      ctx.fill()
      const g = ctx.createLinearGradient(0, -b.h / 2, 0, b.h / 2)
      const base = isLocked ? '#16a34a' : b.m === 'L' ? '#2563eb' : b.m === 'R' ? '#db2777' : '#475569'
      g.addColorStop(0, isLocked ? '#4ade80' : '#94a3b8')
      g.addColorStop(0.08, base)
      g.addColorStop(1, base)
      ctx.fillStyle = g
      rr(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 16)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 2
      ctx.stroke()
      drawArrow(ctx, b.m, -b.w * 0.3, 0, 14 + (active ? Math.sin(t * 5) * 0.6 : 0))
      ctx.fillStyle = '#fff'
      ctx.font = font(14, 900)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(b.m === 'L' ? 'LEFT' : b.m === 'R' ? 'RIGHT' : 'AHEAD', b.w * 0.1, 1)
      ctx.restore()
    }
  }

  function drawTopInfo(ctx: CanvasRenderingContext2D, W: number, t: number) {
    const w = world.current
    if (w.step === 'preview') return
    const txt = w.finalLeg ? 'Almost there!' : `Junction ${Math.min(w.stepIdx + 1, w.moves.length)} of ${w.moves.length}`
    ctx.font = font(13, 900)
    const tw = ctx.measureText(txt).width + 24
    ctx.fillStyle = 'rgba(15,23,42,0.75)'
    rr(ctx, W / 2 - tw / 2, 66, tw, 26, 13)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(txt, W / 2, 79.5)
    // Speed-bonus timer
    const k = clamp(1 - w.driveT / w.par, 0, 1)
    ctx.fillStyle = 'rgba(15,23,42,0.6)'
    rr(ctx, W / 2 - 50, 96, 100, 6, 3)
    ctx.fill()
    ctx.fillStyle = k > 0 ? '#4ade80' : '#64748b'
    rr(ctx, W / 2 - 50, 96, 100 * k, 6, 3)
    ctx.fill()
    // GPS peek button
    const cx = W - 36
    const cy = 104
    const on = w.peeks > 0 && w.step === 'drive' && !w.finalLeg
    ctx.globalAlpha = on ? 1 : 0.45
    ctx.fillStyle = on ? '#0e7490' : '#334155'
    ctx.beginPath()
    ctx.arc(cx, cy, 20 + (on ? Math.sin(t * 4) * 1.5 : 0), 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#67e8f9'
    ctx.lineWidth = 2
    ctx.stroke()
    // Map pin icon
    ctx.fillStyle = '#ecfeff'
    ctx.beginPath()
    ctx.moveTo(cx, cy + 10)
    ctx.bezierCurveTo(cx - 10, cy, cx - 8, cy - 11, cx, cy - 11)
    ctx.bezierCurveTo(cx + 8, cy - 11, cx + 10, cy, cx, cy + 10)
    ctx.fill()
    ctx.fillStyle = '#0e7490'
    ctx.beginPath()
    ctx.arc(cx, cy - 3, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(cx + 15, cy - 15, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#422006'
    ctx.font = font(11, 900)
    ctx.fillText(String(w.peeks), cx + 15, cy - 14.5)
    ctx.globalAlpha = 1
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    // DEV-only time scale for bot playthroughs (window.__routeTime).
    const scale = import.meta.env.DEV ? Number((window as unknown as Record<string, unknown>).__routeTime) || 1 : 1
    const dt = fx.step(raw * scale)
    update(dt, raw)
    const w = world.current
    const ph = phaseRef.current
    // Camera follows the taxi, rotating so the road ahead points up.
    const k = 1 - Math.exp(-raw * 6)
    w.camX += (w.x - w.camX) * Math.min(1, k * 2)
    w.camY += (w.y - w.camY) * Math.min(1, k * 2)
    let da = w.ang - w.camA
    while (da > Math.PI) da -= Math.PI * 2
    while (da < -Math.PI) da += Math.PI * 2
    w.camA += da * k
    ctx.save()
    ctx.translate(fx.offsetX, fx.offsetY)
    drawCity(ctx, W, H, t)
    // Taxi at the anchor, rotated relative to the camera.
    let rel = w.ang - w.camA
    while (rel > Math.PI) rel -= Math.PI * 2
    while (rel < -Math.PI) rel += Math.PI * 2
    const tsx = W / 2 + (w.x - w.camX) * Math.cos(-w.camA) - (w.y - w.camY) * Math.sin(-w.camA)
    const tsy = H * 0.6 + (w.x - w.camX) * Math.sin(-w.camA) + (w.y - w.camY) * Math.cos(-w.camA)
    drawCar(ctx, tsx, tsy, rel, 40, '#facc15', true, w.theme === 2, w.speed < 20 && ph === 'play')
    ctx.restore()
    if (ph === 'play' || ph === 'dying') {
      drawTopInfo(ctx, W, t)
      drawButtons(ctx, t)
      if (w.step === 'preview') drawDirections(ctx, W, H, 0, SIG_BY_LEVEL.get(w.level)?.name ?? (w.vip ? 'VIP route' : 'Directions'), 1 - clamp(w.stepT / w.stepDur, 0, 1))
      else if (w.step === 'replay') drawDirections(ctx, W, H, w.stepIdx, 'Remaining route', 1 - clamp(w.stepT / w.stepDur, 0, 1))
    }
    fx.draw(ctx)
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud" style={{ top: '0.4rem' }}>
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">Fare {hud.level}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hearts">
                  {'❤'.repeat(Math.max(0, hud.hearts))}
                  <span style={{ opacity: 0.3 }}>{'❤'.repeat(Math.max(0, hud.max - hud.hearts))}</span>
                </span>
                {hud.tires > 0 ? <span className="action-hud__small" style={{ color: '#67e8f9' }}>Spare {hud.tires}</span> : null}
              </div>
            </div>
          )}
          {banner && phase === 'play' ? (
            <div
              className="action-banner"
              key={banner.key}
              onAnimationEnd={() => setBanner(null)}
              style={{ top: '12%', whiteSpace: 'normal', width: 'min(92%, 340px)', textAlign: 'center', lineHeight: 1.05 }}
            >
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="route"
              icon={meta.icon}
              title={meta.title}
              hint="Memorise the turn-by-turn directions, then drive the taxi: choose Left, Ahead or Right before each junction."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.level >= 10 ? 'Street legend!' : 'Lost in town!'}
            subtitle={`Score ${hud.score} · Fare ${hud.level}`}
            celebrate={hud.level >= 10}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
