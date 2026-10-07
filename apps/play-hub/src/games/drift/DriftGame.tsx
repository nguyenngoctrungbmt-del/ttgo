import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, rand } from '../../shared/action/fx'
import { useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { useProgressStore } from '../../store/progressStore'
import { CAR_L, CAR_W, beamSprite, blit, carSprite, coinSprite, coneSprite, glowSprite, oilSprite, rockSprite, treeSprite, tyreStackSprite } from './art'
import { barrelSprite, drawAmbient, lavaSprite, mineSprite, nitroSprite, sakuraSprite, type Ambient } from './art2'
import '../../shared/action/action.css'
import './drift.css'

const meta = getGame('drift')

type Phase = 'idle' | 'play' | 'dying' | 'over'

const DS = 6
const PIECES_PER_CP = 7
// New content unlocks (checkpoint count reached by the generator)
const NITRO_CP = 2
const ROLLER_CP = 4
const MINE_CP = 7
/** Drift Frenzy fires on every Nth checkpoint */
const FRENZY_EVERY = 6
const FRENZY_TIME = 22

type Theme = {
  name: string
  ground: string
  ground2: string
  track: string
  edge: string
  rumbleA: string
  rumbleB: string
  deco: 'tree' | 'rock' | 'pine' | 'neon' | 'sakura' | 'lava'
  leaf: string
  leaf2: string
  grip: number
  night: boolean
  smoke: string[]
  ambient: Ambient
}

const THEMES: Theme[] = [
  { name: 'Sunny Circuit', ground: '#4d9a3f', ground2: '#448a37', track: '#4b5563', edge: '#e5e7eb', rumbleA: '#ef4444', rumbleB: '#f8fafc', deco: 'tree', leaf: '#2f6b2a', leaf2: '#4f9a3c', grip: 1, night: false, smoke: ['#e5e7eb', '#cbd5e1', '#f8fafc'], ambient: 'none' },
  { name: 'Canyon Run', ground: '#d39a5b', ground2: '#c78b4b', track: '#6b5a4c', edge: '#fde68a', rumbleA: '#f97316', rumbleB: '#fff7ed', deco: 'rock', leaf: '#9a5b2c', leaf2: '#c2773e', grip: 0.95, night: false, smoke: ['#f5d0a9', '#e7b98a', '#fde68a'], ambient: 'dust' },
  { name: 'Snow Pass', ground: '#e6eef5', ground2: '#d8e3ee', track: '#556070', edge: '#ffffff', rumbleA: '#3b82f6', rumbleB: '#f8fafc', deco: 'pine', leaf: '#1f4d3a', leaf2: '#2f6b4f', grip: 0.82, night: false, smoke: ['#ffffff', '#e0f2fe', '#f8fafc'], ambient: 'snow' },
  { name: 'Neon Night', ground: '#0d1024', ground2: '#121634', track: '#1f2338', edge: '#22d3ee', rumbleA: '#e879f9', rumbleB: '#22d3ee', deco: 'neon', leaf: '#312e81', leaf2: '#6d28d9', grip: 1, night: true, smoke: ['#c4b5fd', '#a5f3fc', '#f0abfc'], ambient: 'none' },
  { name: 'Autumn Ridge', ground: '#8a6a2e', ground2: '#7d5f28', track: '#4a4f58', edge: '#fef3c7', rumbleA: '#dc2626', rumbleB: '#fef3c7', deco: 'tree', leaf: '#c2410c', leaf2: '#f59e0b', grip: 0.95, night: false, smoke: ['#e7e5e4', '#d6d3d1', '#fafaf9'], ambient: 'leaves' },
  { name: 'Sakura Gardens', ground: '#7fb069', ground2: '#6fa05a', track: '#5b5f6b', edge: '#fce7f3', rumbleA: '#ec4899', rumbleB: '#fdf2f8', deco: 'sakura', leaf: '#f9a8d4', leaf2: '#fbcfe8', grip: 1, night: false, smoke: ['#fdf2f8', '#fbcfe8', '#ffffff'], ambient: 'petals' },
  { name: 'Volcano Ring', ground: '#2a1d1a', ground2: '#3a2620', track: '#3f3a3a', edge: '#fb923c', rumbleA: '#dc2626', rumbleB: '#fbbf24', deco: 'lava', leaf: '#44403c', leaf2: '#78716c', grip: 0.95, night: false, smoke: ['#a8a29e', '#78716c', '#d6d3d1'], ambient: 'embers' },
]

type Sample = { x: number; y: number; a: number; piece: number; hw: number; theme: number }
type Gate = { idx: number; lat: number; checked: boolean; passed: boolean; flash: number }
type Piece = { kind: 'straight' | 'corner'; dir: number; start: number; end: number; gate: Gate | null; cp: boolean; cpDone: boolean; done: boolean; drifted: number; total: number; theme: number }
type Deco = { x: number; y: number; kind: 'tree' | 'rock' | 'pine' | 'neon' | 'tyres' | 'sakura' | 'lava'; theme: number; rot: number; idx: number }
type Hazard = { kind: 'cone' | 'oil' | 'block' | 'roller' | 'mine'; x: number; y: number; vx: number; vy: number; rot: number; vr: number; hit: boolean; idx: number; t?: number; arm?: number }
type Coin = { x: number; y: number; taken: boolean; idx: number; t: number }
type Ghost = { s: number; lat: number; v: number; x: number; y: number; a: number; drift: number; passed: boolean }

type Car = { x: number; y: number; phi: number; drift: number; v: number; ci: number; lat: number; spin: number; crash: number; inv: number; rumble: boolean; hold: boolean; td: number }

type World = {
  samples: Sample[]
  base: number
  pieces: Piece[]
  gen: { x: number; y: number; a: number; corners: number; cp: number; hw: number; lastDir: number }
  decos: Deco[]
  hazards: Hazard[]
  coins: Coin[]
  nitros: Coin[]
  skids: number[]
  lastRear: [number, number, number, number] | null
  car: Car
  cam: { x: number; y: number; a: number }
  ghost: Ghost | null
  mult: number
  baseMult: number
  chain: number
  score: number
  tows: number
  theme: number
  prevTheme: number
  themeFade: number
  hudT: number
  coinsGot: number
  lastTrack: number
  bestNoted: boolean
  runT: number
  /** nitro boost time left (s) */
  nitro: number
  /** Drift Frenzy event time left (s) */
  frenzy: number
  frenzyGates: number
  frenzyCoins: number
  seen: { roller: boolean; mine: boolean; nitro: boolean }
  stats: { score: number; corners: number; gates: number; checkpoints: number; overtakes: number; mult: number }
}

function angDiff(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

function freshWorld(): World {
  return {
    samples: [],
    base: 0,
    pieces: [],
    gen: { x: 0, y: 0, a: -Math.PI / 2, corners: 0, cp: 0, hw: 92, lastDir: 1 },
    decos: [],
    hazards: [],
    coins: [],
    nitros: [],
    skids: [],
    lastRear: null,
    car: { x: 0, y: 0, phi: -Math.PI / 2, drift: 0, v: 0, ci: 0, lat: 0, spin: 0, crash: 0, inv: 0, rumble: false, hold: false, td: 1 },
    cam: { x: 0, y: -100, a: -Math.PI / 2 },
    ghost: null,
    mult: 1,
    baseMult: 1,
    chain: 0,
    score: 0,
    tows: 0,
    theme: 0,
    prevTheme: 0,
    themeFade: 0,
    hudT: 0,
    coinsGot: 0,
    lastTrack: 0,
    bestNoted: false,
    runT: 0,
    nitro: 0,
    frenzy: 0,
    frenzyGates: 0,
    frenzyCoins: 0,
    seen: { roller: false, mine: false, nitro: false },
    stats: { score: 0, corners: 0, gates: 0, checkpoints: 0, overtakes: 0, mult: 1 },
  }
}

export default function DriftGame() {
  const run = useActionRun('drift')
  const best = useProgressStore((s) => s.games.drift?.bestScore ?? 0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const ui = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 620 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const holdRef = useRef(false)
  const widthMul = useRef(1)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, mult: 1, chain: 0, corners: 0, cp: 0, frenzy: 0, nitro: false })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  // ── Track generation ─────────────────────────────────
  function S(i: number) {
    const w = world.current
    return w.samples[clamp(Math.round(i) - w.base, 0, w.samples.length - 1)]
  }
  function lastIdx() {
    const w = world.current
    return w.base + w.samples.length - 1
  }

  function pushSamples(n: number, da: number, pieceIdx: number, theme: number) {
    const w = world.current
    const g = w.gen
    const targetHw = (92 - Math.min(34, g.cp * 3.2)) * widthMul.current
    for (let k = 0; k < n; k++) {
      g.a += da
      g.x += Math.cos(g.a) * DS
      g.y += Math.sin(g.a) * DS
      g.hw = approach(g.hw, targetHw, 0.02, 1)
      w.samples.push({ x: g.x, y: g.y, a: g.a, piece: pieceIdx, hw: g.hw, theme })
    }
  }

  function decorate(from: number, to: number, piece: Piece) {
    const w = world.current
    const th = THEMES[piece.theme]
    for (let i = from; i < to; i += 11) {
      const s = S(i)
      const nx = -Math.sin(s.a)
      const ny = Math.cos(s.a)
      if (piece.kind === 'corner') {
        // tyre wall on the outside of every bend
        const out = -piece.dir * (s.hw + 26)
        w.decos.push({ x: s.x + nx * out, y: s.y + ny * out, kind: 'tyres', theme: piece.theme, rot: 0, idx: i })
      }
      if (Math.random() < 0.75) {
        const side = Math.random() < 0.5 ? -1 : 1
        const off = side * (s.hw + rand(50, 230))
        w.decos.push({ x: s.x + nx * off, y: s.y + ny * off, kind: th.deco, theme: piece.theme, rot: rand(0, Math.PI * 2), idx: i })
      }
    }
  }

  function addPiece() {
    const w = world.current
    const g = w.gen
    const lvl = g.cp
    const pieceIdx = w.pieces.length
    const theme = Math.floor(g.cp / 3) % THEMES.length
    const prevKind = w.pieces.length ? w.pieces[w.pieces.length - 1].kind : 'corner'
    const start = lastIdx() + 1
    if (prevKind === 'corner') {
      const chicane = lvl >= 3 && Math.random() < 0.25
      const len = chicane ? rand(30, 60) : rand(150, 330) * (1 - Math.min(0.45, lvl * 0.05))
      const cp = g.corners > 0 && g.corners % PIECES_PER_CP === 0
      const piece: Piece = { kind: 'straight', dir: 0, start, end: start, gate: null, cp, cpDone: false, done: false, drifted: 0, total: 0, theme: cp ? Math.floor((g.cp + 1) / 3) % THEMES.length : theme }
      if (cp) g.cp += 1
      w.pieces.push(piece)
      pushSamples(Math.max(4, Math.round(len / DS)), 0, pieceIdx, piece.theme)
      piece.end = lastIdx()
      decorate(start, piece.end, piece)
      // hazards & coins on straights
      const n = piece.end - start
      if (n > 20) {
        const roll = Math.random()
        if (lvl >= ROLLER_CP && n > 28 && roll < 0.24) {
          // rolling barrel sweeping across the straight
          const i = start + Math.floor(n * rand(0.45, 0.65))
          w.hazards.push({ kind: 'roller', x: S(i).x, y: S(i).y, vx: 0, vy: 0, rot: 0, vr: 0, hit: false, idx: i, t: rand(0, Math.PI * 2) })
        } else if (lvl >= MINE_CP && n > 28 && roll < 0.44) {
          // staggered spark mines, alternating sides (centre line stays clear)
          const side = Math.random() < 0.5 ? -1 : 1
          for (let c = 0; c < 3; c++) {
            const i = start + Math.floor(n * (0.3 + c * 0.2))
            const sm = S(i)
            const lat = (c % 2 ? -side : side) * sm.hw * 0.62
            w.hazards.push({ kind: 'mine', x: sm.x - Math.sin(sm.a) * lat, y: sm.y + Math.cos(sm.a) * lat, vx: 0, vy: 0, rot: 0, vr: 0, hit: false, idx: i, t: rand(0, 2), arm: -1 })
          }
        } else if (lvl >= 2 && Math.random() < 0.4) {
          const i = start + Math.floor(n * rand(0.35, 0.7))
          const s = S(i)
          const side = Math.random() < 0.5 ? -1 : 1
          const block = lvl >= 6 && Math.random() < 0.4
          for (let c = 0; c < (block ? 2 : 3); c++) {
            const lat = side * s.hw * (0.25 + c * 0.22)
            w.hazards.push({ kind: block ? 'block' : 'cone', x: s.x - Math.sin(s.a) * lat, y: s.y + Math.cos(s.a) * lat, vx: 0, vy: 0, rot: 0, vr: 0, hit: false, idx: i })
          }
        } else if (Math.random() < 0.55) {
          const lat = rand(-0.4, 0.4)
          for (let c = 0; c < 5; c++) {
            const i = start + Math.floor(n * 0.2) + c * 5
            const s = S(i)
            w.coins.push({ x: s.x - Math.sin(s.a) * lat * s.hw, y: s.y + Math.cos(s.a) * lat * s.hw, taken: false, idx: i, t: c * 0.4 })
          }
        }
        if (lvl >= NITRO_CP && Math.random() < 0.16) {
          const i = start + Math.floor(n * 0.15)
          const sn = S(i)
          const lat = rand(-0.3, 0.3) * sn.hw
          w.nitros.push({ x: sn.x - Math.sin(sn.a) * lat, y: sn.y + Math.cos(sn.a) * lat, taken: false, idx: i, t: 0 })
        }
      }
    } else {
      // Corner: keep the overall heading roughly "up" so the track never loops back.
      const rel = angDiff(-Math.PI / 2, g.a)
      let dir = Math.random() < 0.6 ? -g.lastDir : g.lastDir
      if (rel > 0.8) dir = -1
      if (rel < -0.8) dir = 1
      const maxA = 1.75 - rel * dir
      const A = clamp(rand(0.7, 1.9 + Math.min(0.4, lvl * 0.05)), 0.5, Math.max(0.5, maxA))
      const R = rand(150, 300) - Math.min(30, lvl * 3)
      const n = Math.max(6, Math.round((R * A) / DS))
      const piece: Piece = { kind: 'corner', dir, start, end: start, gate: null, cp: false, cpDone: false, done: false, drifted: 0, total: 0, theme }
      w.pieces.push(piece)
      pushSamples(n, (dir * A) / n, pieceIdx, theme)
      piece.end = lastIdx()
      g.lastDir = dir
      g.corners += 1
      const mid = start + Math.floor(n * 0.5)
      const ms = S(mid)
      piece.gate = { idx: mid, lat: dir * ms.hw * 0.5, checked: false, passed: false, flash: 0 }
      decorate(start, piece.end, piece)
      // apex coin arc
      if (Math.random() < 0.6) {
        for (let c = -2; c <= 2; c++) {
          const i = mid + c * 5
          const s = S(i)
          const lat = dir * s.hw * (0.5 - Math.abs(c) * 0.07)
          w.coins.push({ x: s.x - Math.sin(s.a) * lat, y: s.y + Math.cos(s.a) * lat, taken: false, idx: i, t: c * 0.3 })
        }
      }
      if (lvl >= 4 && Math.random() < 0.35) {
        const i = start + Math.floor(n * 0.78)
        const s = S(i)
        const lat = -dir * s.hw * 0.42
        w.hazards.push({ kind: 'oil', x: s.x - Math.sin(s.a) * lat, y: s.y + Math.cos(s.a) * lat, vx: 0, vy: 0, rot: rand(0, 3), vr: 0, hit: false, idx: i })
      }
    }
  }

  function extend() {
    const w = world.current
    while (lastIdx() < w.car.ci + 520) addPiece()
    // trim behind
    const cut = w.car.ci - 160 - w.base
    if (cut > 200) {
      w.samples.splice(0, cut)
      w.base += cut
      const minIdx = w.base
      w.decos = w.decos.filter((d) => d.idx >= minIdx)
      w.hazards = w.hazards.filter((h) => h.idx >= minIdx)
      w.coins = w.coins.filter((c) => c.idx >= minIdx)
      w.nitros = w.nitros.filter((c) => c.idx >= minIdx)
      if (w.skids.length > 2400) w.skids.splice(0, w.skids.length - 2400)
    }
  }

  function initTrack(cp = 0) {
    const w = world.current
    const th0 = Math.floor(cp / 3) % THEMES.length
    w.gen = { x: 0, y: 0, a: -Math.PI / 2, corners: cp * PIECES_PER_CP, cp, hw: 92 * widthMul.current, lastDir: Math.random() < 0.5 ? 1 : -1 }
    // long opening straight
    w.pieces.push({ kind: 'straight', dir: 0, start: 0, end: 0, gate: null, cp: false, cpDone: true, done: false, drifted: 0, total: 0, theme: th0 })
    pushSamples(70, 0, 0, th0)
    w.pieces[0].end = lastIdx()
    decorate(0, w.pieces[0].end, w.pieces[0])
    w.car.ci = 20
    const s = S(20)
    w.car.x = s.x
    w.car.y = s.y
    w.car.phi = s.a
    w.cam = { x: s.x, y: s.y, a: s.a }
    extend()
  }

  function start() {
    void unlockAudio()
    widthMul.current = 1 + run.level('wide') * 0.06
    const w = freshWorld()
    world.current = w
    w.baseMult = 1 + run.level('mult')
    w.mult = w.baseMult
    w.stats.mult = w.mult
    w.tows = run.level('tow')
    initTrack()
    w.car.v = 200
    fx.reset()
    ui.reset()
    holdRef.current = false
    run.begin()
    setPhaseBoth('play')
    say('GO!', 'hold to drift · release to straighten')
    sfx.ready()
    pushHud()
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, mult: w.mult, chain: Math.floor(w.chain), corners: w.stats.corners, cp: w.stats.checkpoints, frenzy: Math.ceil(w.frenzy), nitro: w.nitro > 0 })
  }

  function addScore(n: number) {
    const w = world.current
    w.score += Math.round(n)
    w.stats.score = w.score
    if (!w.bestNoted && best > 0 && w.score > best && phaseRef.current === 'play') {
      w.bestNoted = true
      const sp = carScreen()
      ui.text(sp.x, sp.y - 110, 'NEW BEST!', '#fde047', 26)
      sfx.win()
      haptic.success()
    }
  }

  function bankChain(clean: boolean) {
    const w = world.current
    if (w.chain < 5) {
      w.chain = 0
      return
    }
    const sp = carScreen()
    if (clean) {
      const pts = w.chain * w.mult
      addScore(pts)
      ui.text(sp.x, sp.y - 70, `+${Math.round(pts)}`, '#fde68a', 18 + Math.min(10, w.mult))
    } else {
      ui.text(sp.x, sp.y - 70, 'DRIFT LOST', '#fca5a5', 18)
      sfx.miss()
    }
    w.chain = 0
  }

  function resetMult() {
    const w = world.current
    if (w.mult > w.baseMult) {
      const sp = carScreen()
      ui.text(sp.x, sp.y - 95, 'MULTIPLIER RESET', '#fca5a5', 15)
    }
    w.mult = w.baseMult
  }

  function carScreen() {
    const w = world.current
    return toScreen(w.car.x, w.car.y)
  }

  function toScreen(x: number, y: number) {
    const w = world.current
    const { w: W, h: H } = size.current
    const r = -Math.PI / 2 - w.cam.a
    const dx = x - w.cam.x
    const dy = y - w.cam.y
    const c = Math.cos(r)
    const s = Math.sin(r)
    return { x: W / 2 + dx * c - dy * s, y: H * 0.62 + dx * s + dy * c }
  }

  function crash() {
    const w = world.current
    const c = w.car
    c.crash = 0.9
    bankChain(false)
    resetMult()
    fx.explode(c.x, c.y, 1.2, ['#fde047', '#fb923c', '#ffffff', '#111827'])
    fx.burst(c.x, c.y, { count: 14, color: ['#111827', '#374151'], speed: 260, shape: 'square', size: 6, gravity: 0, drag: 3 })
    fx.shake(14, 0.45)
    fx.stop(0.12)
    ui.flash('#ef4444', 0.3)
    sfx.boom(0.8)
    sfx.hurt()
    haptic.heavy()
    if (w.tows > 0) {
      w.tows -= 1
    } else {
      setPhaseBoth('dying')
      fx.slowmo(1, 0.35)
      sfx.lose()
      haptic.error()
      window.setTimeout(() => {
        setPhaseBoth('over')
        pushHud()
        const coins = Math.round(w.coinsGot + w.stats.corners * 0.4 + w.stats.checkpoints * 2)
        run.end({ score: w.score, cleared: w.stats.checkpoints >= 3, stats: { ...w.stats }, coins }, revive)
      }, 1150)
    }
  }

  function recover(banner: string, sub?: string) {
    const w = world.current
    const c = w.car
    const s = S(c.ci + 4)
    c.ci += 4
    c.x = s.x
    c.y = s.y
    c.phi = s.a
    c.drift = 0
    c.spin = 0
    c.crash = 0
    c.inv = 2
    c.v = Math.min(c.v, 200)
    w.lastRear = null
    // clear hazards right in front
    for (const h of w.hazards) if (h.idx > c.ci - 10 && h.idx < c.ci + 60) h.hit = true
    const sp = carScreen()
    ui.ring(sp.x, sp.y, { color: '#fde047', maxR: 90, life: 0.6, width: 5 })
    say(banner, sub)
    sfx.power()
  }

  /** Drift Frenzy: golden coin ribbon ahead, gates pay double for FRENZY_TIME seconds. */
  function startFrenzy() {
    const w = world.current
    const c = w.car
    w.frenzy = FRENZY_TIME
    w.frenzyGates = 0
    w.frenzyCoins = w.coinsGot
    for (let i = c.ci + 40; i < Math.min(lastIdx() - 4, c.ci + 420); i += 9) {
      const sm = S(i)
      const p = w.pieces[sm.piece]
      const lat = p.kind === 'corner' ? p.dir * sm.hw * 0.45 : Math.sin(i * 0.05) * sm.hw * 0.35
      w.coins.push({ x: sm.x - Math.sin(sm.a) * lat, y: sm.y + Math.cos(sm.a) * lat, taken: false, idx: i, t: i * 0.1 })
    }
    say('DRIFT FRENZY!', 'gates pay double · golden coins')
    sfx.combo()
    window.setTimeout(() => sfx.levelUp(), 160)
    window.setTimeout(() => sfx.power(), 340)
    ui.flash('#fde047', 0.25)
    haptic.success()
  }

  function endFrenzy() {
    const w = world.current
    w.frenzy = 0
    const coins = w.coinsGot - w.frenzyCoins
    const bonus = 200 + w.frenzyGates * 150 + coins * 20
    addScore(bonus)
    w.coinsGot += 5
    say('FRENZY OVER', `${w.frenzyGates} gates · ${coins} coins · +${bonus}`)
    sfx.win()
    haptic.success()
    if (performance.now() - w.lastTrack > 30000) {
      w.lastTrack = performance.now()
      void trackEvent('action_milestone', { game_id: 'drift', kind: 'frenzy', value: w.stats.checkpoints })
    }
  }

  function revive() {
    recover('REVIVED!', 'back on track')
    setPhaseBoth('play')
  }

  function update(dt: number, raw: number) {
    const w = world.current
    const c = w.car
    const ph = phaseRef.current
    const live = ph === 'play'
    if (live) w.runT += dt
    const demo = ph === 'idle'
    if (w.samples.length === 0) {
      initTrack()
      c.v = 230
    }

    // project the car on the centreline
    let bestI = c.ci
    let bestD = Infinity
    for (let j = Math.max(w.base, c.ci - 6); j <= Math.min(lastIdx(), c.ci + 40); j++) {
      const s = S(j)
      const d = (s.x - c.x) ** 2 + (s.y - c.y) ** 2
      if (d < bestD) {
        bestD = d
        bestI = j
      }
    }
    const prevCi = c.ci
    if (c.crash <= 0) c.ci = bestI
    const s = S(c.ci)
    c.lat = (c.x - s.x) * -Math.sin(s.a) + (c.y - s.y) * Math.cos(s.a)
    const piece = w.pieces[s.piece]
    const th = THEMES[s.theme]
    extend()

    // which way a hold turns: the upcoming bend, else back toward the track
    let td = 0
    for (let j = c.ci; j < c.ci + 42; j += 2) {
      const p = w.pieces[S(j).piece]
      if (p.kind === 'corner') {
        td = p.dir
        break
      }
    }
    const ahead = S(c.ci + 12)
    if (!td) td = Math.sign(angDiff(c.phi, ahead.a) - c.lat * 0.002) || 1
    c.td = td

    let hold = holdRef.current && live
    if (demo) {
      const want = ahead.a - clamp(c.lat * 0.006, -0.5, 0.5)
      hold = angDiff(c.phi, want) * td > 0.04
    }
    c.hold = hold

    const vBase = 235 + Math.min(210, w.stats.checkpoints * 15) + Math.min(30, w.stats.corners * 0.6)
    const grip = th.grip
    if (c.crash > 0) {
      c.crash -= dt
      c.v = approach(c.v, 0, 3, dt)
      c.drift += 7 * dt
      c.x += Math.cos(c.phi) * c.v * dt
      c.y += Math.sin(c.phi) * c.v * dt
      if (c.crash <= 0 && live) recover('TOW TRUCK!', w.tows > 0 ? `${w.tows} left` : 'last tow used')
    } else if (ph === 'dying' || ph === 'over') {
      c.v = approach(c.v, 0, 3, dt)
      c.x += Math.cos(c.phi) * c.v * dt
      c.y += Math.sin(c.phi) * c.v * dt
    } else {
      const omega = (c.v / 118) * grip
      if (c.spin > 0) {
        c.spin -= dt
        c.drift += 10 * dt
        c.phi += td * 0.6 * dt
      } else if (hold) {
        c.phi += td * omega * dt
        c.drift = approach(c.drift, td * 0.62, 5 * grip, dt)
      } else {
        const corr = angDiff(c.phi, ahead.a)
        c.phi += clamp(corr, -0.5 * grip * dt, 0.5 * grip * dt)
        c.drift = approach(c.drift, 0, 6 * grip, dt)
      }
      if (c.spin <= 0 && Math.abs(c.drift) > 3) c.drift = 0
      const target = vBase * (hold ? 0.93 : 1) * (c.rumble ? 0.78 : 1) * (w.nitro > 0 ? 1.28 : 1)
      c.v = approach(c.v, target, 1.6, dt)
      c.x += Math.cos(c.phi) * c.v * dt
      c.y += Math.sin(c.phi) * c.v * dt
    }
    c.inv = Math.max(0, c.inv - dt)
    const theta = c.phi + c.drift
    if (w.nitro > 0 && live) {
      w.nitro = Math.max(0, w.nitro - dt)
      const bx = c.x - Math.cos(theta) * CAR_L * 0.55
      const by = c.y - Math.sin(theta) * CAR_L * 0.55
      fx.burst(bx, by, { count: 2, color: ['#67e8f9', '#a5f3fc', '#ffffff'], speed: 90, angle: theta + Math.PI, spread: 0.5, life: 0.35, gravity: 0 })
    }
    if (w.frenzy > 0 && live) {
      w.frenzy -= dt
      if (w.frenzy <= 0) endFrenzy()
    }

    // edges
    const edge = Math.abs(c.lat)
    const wasRumble = c.rumble
    c.rumble = edge > s.hw - 8 && c.crash <= 0
    if (demo && edge > s.hw - 20) c.phi += -Math.sign(c.lat) * 1.5 * dt
    if (live && c.crash <= 0) {
      if (edge > s.hw + 16 && c.inv <= 0) {
        if (w.runT < 25) {
          // Soft walls while learning: bounce back onto the track.
          const sign = Math.sign(c.lat)
          c.x -= -Math.sin(s.a) * sign * (edge - s.hw + 4)
          c.y -= Math.cos(s.a) * sign * (edge - s.hw + 4)
          c.phi = s.a - sign * 0.25
          c.drift = 0
          c.v *= 0.7
          c.inv = 0.4
          fx.burst(c.x, c.y, { count: 14, color: ['#fde047', '#ffffff'], speed: 220, shape: 'spark', gravity: 0 })
          fx.shake(5, 0.2)
          const sp = carScreen()
          ui.text(sp.x, sp.y - 60, 'CAREFUL!', '#fde68a', 18)
          sfx.clang()
          haptic.medium()
        } else {
          crash()
          return
        }
      }
      if (c.rumble && !wasRumble) {
        if (w.chain > 5) bankChain(false)
        resetMult()
        sfx.thud()
        haptic.light()
      }
    }
    if (c.rumble && Math.random() < 0.6) {
      fx.burst(c.x, c.y, { count: 2, color: ['#fde047', '#fb923c'], speed: 180, shape: 'spark', gravity: 0, life: 0.3 })
    }

    // drift scoring + effects
    const drifting = Math.abs(c.drift) > 0.28 && c.crash <= 0 && ph !== 'dying'
    if (live) {
      if (drifting && !c.rumble && c.spin <= 0) w.chain += (c.v / 10) * dt
      if (!hold && w.chain > 0 && Math.abs(c.drift) < 0.15) bankChain(true)
      if (piece.kind === 'corner' && !piece.done) {
        piece.total += 1
        if (drifting) piece.drifted += 1
      }
    }
    const rx = Math.cos(theta)
    const ry = Math.sin(theta)
    const r1x = c.x - rx * CAR_L * 0.3 - ry * CAR_W * 0.42
    const r1y = c.y - ry * CAR_L * 0.3 + rx * CAR_W * 0.42
    const r2x = c.x - rx * CAR_L * 0.3 + ry * CAR_W * 0.42
    const r2y = c.y - ry * CAR_L * 0.3 - rx * CAR_W * 0.42
    if (drifting || c.spin > 0) {
      if (w.lastRear) w.skids.push(w.lastRear[0], w.lastRear[1], r1x, r1y, w.lastRear[2], w.lastRear[3], r2x, r2y)
      w.lastRear = [r1x, r1y, r2x, r2y]
      if (Math.random() < 0.85) {
        fx.burst(r1x, r1y, { count: 1, color: th.smoke, speed: 40, size: 7, life: 0.8, gravity: -6, drag: 2.5 })
        fx.burst(r2x, r2y, { count: 1, color: th.smoke, speed: 40, size: 7, life: 0.8, gravity: -6, drag: 2.5 })
      }
    } else w.lastRear = null

    // pieces: gates, corners, checkpoints
    if (live && c.crash <= 0) {
      for (let pi = Math.max(0, s.piece - 2); pi <= Math.min(w.pieces.length - 1, s.piece + 1); pi++) {
        const p = w.pieces[pi]
        const gt = p.gate
        if (gt && !gt.checked && c.ci >= gt.idx && prevCi <= gt.idx + 8) {
          gt.checked = true
          const gs = S(gt.idx)
          const latAt = (c.x - gs.x) * -Math.sin(gs.a) + (c.y - gs.y) * Math.cos(gs.a)
          if (Math.abs(latAt - gt.lat) < Math.max(18, gs.hw * 0.3)) {
            gt.passed = true
            gt.flash = 1
            w.mult = Math.min(12, w.mult + (drifting ? 1 : 0))
            w.stats.mult = Math.max(w.stats.mult, w.mult)
            w.stats.gates += 1
            const pts = (drifting ? 100 : 40) * w.mult * (w.frenzy > 0 ? 2 : 1)
            if (w.frenzy > 0) w.frenzyGates += 1
            addScore(pts)
            const sp = toScreen(c.x, c.y)
            ui.text(sp.x, sp.y - 50, drifting ? `GATE x${w.mult}` : 'GATE', drifting ? '#67e8f9' : '#e2e8f0', 20)
            ui.ring(sp.x, sp.y, { color: '#22d3ee', maxR: 60, life: 0.4 })
            fx.burst(c.x, c.y, { count: 14, color: ['#22d3ee', '#a5f3fc', '#ffffff'], speed: 240, shape: 'spark', gravity: 0 })
            sfx.score(w.mult)
            haptic.light()
            if (w.mult > 0 && w.mult % 5 === 0 && drifting) {
              sfx.combo()
              say(`x${w.mult} MULTIPLIER!`)
            }
          }
          run.update(w.stats)
        }
        if (p.kind === 'corner' && !p.done && c.ci > p.end) {
          p.done = true
          w.stats.corners += 1
          const frac = p.total ? p.drifted / p.total : 0
          const perfect = !!p.gate?.passed && frac > 0.35
          const label = perfect ? 'PERFECT!' : frac > 0.4 ? 'NICE DRIFT' : 'CLEAN'
          const pts = (perfect ? 150 : frac > 0.4 ? 60 : 20) * w.mult
          addScore(pts)
          const sp = carScreen()
          ui.text(sp.x, sp.y - 120, `${label} +${pts}`, perfect ? '#fde047' : '#f8fafc', perfect ? 22 : 17)
          if (perfect) {
            sfx.match()
            fx.burst(c.x, c.y, { count: 18, color: ['#fde047', '#facc15', '#ffffff'], speed: 220 })
          }
          run.update(w.stats)
        }
        if (p.cp && !p.cpDone && c.ci >= p.start) {
          p.cpDone = true
          w.stats.checkpoints += 1
          const n = w.stats.checkpoints
          addScore(250 * n)
          const newTheme = p.theme !== w.theme
          if (newTheme) {
            w.prevTheme = w.theme
            w.theme = p.theme
            w.themeFade = 1
          }
          say(newTheme ? THEMES[p.theme].name.toUpperCase() : `CHECKPOINT ${n}`, newTheme ? `checkpoint ${n} · +${250 * n}` : `+${250 * n} · speed up`)
          ui.flash('#ffffff', 0.18)
          sfx.levelUp()
          haptic.success()
          if (n % FRENZY_EVERY === 0) window.setTimeout(() => {
            if (phaseRef.current === 'play') startFrenzy()
          }, 1500)
          else if (n % 4 === 3) {
            w.ghost = { s: c.ci + 70, lat: 0, v: vBase * 0.85, x: c.x, y: c.y, a: c.phi, drift: 0, passed: false }
            window.setTimeout(() => say('RIVAL GHOST', 'overtake for +500'), 1400)
          }
          if (n % 5 === 0 && performance.now() - w.lastTrack > 30000) {
            w.lastTrack = performance.now()
            void trackEvent('action_milestone', { game_id: 'drift', kind: 'checkpoint', value: n })
          }
          run.update(w.stats)
        }
      }
    }
    for (let pi = Math.max(0, s.piece - 3); pi < Math.min(w.pieces.length, s.piece + 3); pi++) {
      const gt = w.pieces[pi].gate
      if (gt && gt.flash > 0) gt.flash = Math.max(0, gt.flash - raw * 2)
    }

    // rival ghost follows the racing line
    const gh = w.ghost
    if (gh) {
      const gs0 = S(gh.s)
      const gp = w.pieces[gs0.piece]
      const wantLat = gp.kind === 'corner' ? gp.dir * gs0.hw * 0.5 : 0
      gh.lat = approach(gh.lat, wantLat, 2, dt)
      gh.drift = approach(gh.drift, gp.kind === 'corner' ? gp.dir * 0.55 : 0, 4, dt)
      gh.s += (gh.v * dt) / DS
      gh.v = approach(gh.v, vBase * 0.85, 1, dt)
      const gs = S(gh.s)
      gh.x = gs.x - Math.sin(gs.a) * gh.lat
      gh.y = gs.y + Math.cos(gs.a) * gh.lat
      gh.a = gs.a + gh.drift
      if (live && !gh.passed && c.ci > gh.s) {
        gh.passed = true
        w.stats.overtakes += 1
        addScore(500)
        const sp = carScreen()
        ui.text(sp.x, sp.y - 90, 'OVERTAKE! +500', '#c4b5fd', 24)
        fx.burst(c.x, c.y, { count: 26, color: ['#a78bfa', '#f0abfc', '#ffffff'], speed: 280 })
        say('OVERTAKE!', '+500')
        sfx.win()
        haptic.success()
        run.update(w.stats)
      }
      if (gh.s < c.ci - 160 || gh.s > lastIdx() - 10) w.ghost = null
    }

    // hazards
    for (const h of w.hazards) {
      if (h.hit) {
        h.x += h.vx * dt
        h.y += h.vy * dt
        h.vx *= 1 - 2 * dt
        h.vy *= 1 - 2 * dt
        h.rot += h.vr * dt
        continue
      }
      if (h.kind === 'roller') {
        // sweeps edge to edge once the car is near
        if (Math.abs(h.idx - c.ci) < 140) h.t = (h.t ?? 0) + dt * 1.7
        const hs = S(h.idx)
        const lat = Math.sin(h.t ?? 0) * (hs.hw - 14)
        h.x = hs.x - Math.sin(hs.a) * lat
        h.y = hs.y + Math.cos(hs.a) * lat
        h.rot = hs.a
      } else if (h.kind === 'mine') {
        h.t = (h.t ?? 0) + raw
        if (live && (h.arm ?? -1) < 0 && Math.abs(h.idx - c.ci) < 30 && (h.x - c.x) ** 2 + (h.y - c.y) ** 2 < 140 * 140) {
          h.arm = 0.38
          sfx.tick()
        }
        if ((h.arm ?? -1) >= 0) {
          h.arm = (h.arm ?? 0) - dt
          if ((h.arm ?? 0) < 0) {
            h.hit = true
            fx.explode(h.x, h.y, 0.7, ['#fde047', '#ef4444', '#ffffff'])
            fx.shake(7, 0.25)
            sfx.boom(0.4)
            if (live && c.crash <= 0 && w.nitro <= 0 && c.inv <= 0 && (h.x - c.x) ** 2 + (h.y - c.y) ** 2 < Math.min(42, S(h.idx).hw * 0.5) ** 2) {
              c.spin = 0.7
              bankChain(false)
              resetMult()
              const sp = carScreen()
              ui.text(sp.x, sp.y - 60, 'BOOM!', '#fca5a5', 22)
              ui.flash('#ef4444', 0.2)
              haptic.heavy()
            }
          }
        }
        continue
      }
      if (!live || c.crash > 0 || Math.abs(h.idx - c.ci) > 12) continue
      const r = h.kind === 'oil' ? 24 : h.kind === 'block' ? 18 : h.kind === 'roller' ? 18 : 12
      if ((h.x - c.x) ** 2 + (h.y - c.y) ** 2 < (r + 10) ** 2) {
        if (w.nitro > 0 && h.kind !== 'oil') {
          // nitro smashes through anything solid
          h.hit = true
          h.vx = Math.cos(c.phi) * c.v * 1.1 + rand(-120, 120)
          h.vy = Math.sin(c.phi) * c.v * 1.1 + rand(-120, 120)
          h.vr = rand(-14, 14)
          fx.burst(h.x, h.y, { count: 12, color: ['#67e8f9', '#ffffff', '#fb923c'], speed: 220, shape: 'spark', gravity: 0 })
          fx.shake(5, 0.15)
          sfx.clang()
          addScore(50)
        } else if (h.kind === 'roller') {
          // a barrel hit knocks you into a spin (not a crash: lateral control is limited)
          if (c.inv > 0) continue
          h.hit = true
          h.vx = Math.cos(c.phi) * c.v * 0.8 + rand(-100, 100)
          h.vy = Math.sin(c.phi) * c.v * 0.8 + rand(-100, 100)
          h.vr = rand(-10, 10)
          c.spin = 0.55
          c.v *= 0.7
          bankChain(false)
          resetMult()
          fx.burst(h.x, h.y, { count: 14, color: ['#ef4444', '#fbbf24', '#111827'], speed: 220, shape: 'square', gravity: 0 })
          fx.shake(9, 0.3)
          fx.stop(0.06)
          const sp = carScreen()
          ui.text(sp.x, sp.y - 60, 'BARREL!', '#fca5a5', 20)
          sfx.thud()
          sfx.hurt()
          haptic.heavy()
        } else if (h.kind === 'oil') {
          h.hit = true
          if (c.inv <= 0 && w.nitro <= 0) {
            c.spin = 0.6
            bankChain(false)
            resetMult()
            const sp = carScreen()
            ui.text(sp.x, sp.y - 60, 'OIL!', '#c4b5fd', 20)
            sfx.miss()
            haptic.medium()
          }
        } else if (h.kind === 'cone') {
          h.hit = true
          h.vx = Math.cos(c.phi) * c.v * 0.9 + rand(-80, 80)
          h.vy = Math.sin(c.phi) * c.v * 0.9 + rand(-80, 80)
          h.vr = rand(-12, 12)
          c.v *= 0.85
          if (c.inv <= 0) resetMult()
          fx.burst(h.x, h.y, { count: 8, color: ['#f97316', '#fdba74', '#ffffff'], speed: 160, shape: 'square', gravity: 0 })
          fx.shake(4, 0.15)
          sfx.thud()
          haptic.light()
        } else if (c.inv <= 0) {
          h.hit = true
          h.vx = Math.cos(c.phi) * 200
          h.vy = Math.sin(c.phi) * 200
          h.vr = rand(-6, 6)
          crash()
          return
        }
      }
    }

    // coins
    for (const co of w.coins) {
      co.t += raw
      if (co.taken || !live || Math.abs(co.idx - c.ci) > 8) continue
      if ((co.x - c.x) ** 2 + (co.y - c.y) ** 2 < 26 * 26) {
        co.taken = true
        w.coinsGot += 1
        addScore(10)
        fx.burst(co.x, co.y, { count: 6, color: ['#fde047', '#facc15'], speed: 120, gravity: 0 })
        sfx.pop()
      }
    }

    for (const n of w.nitros) {
      n.t += raw
      if (n.taken || !live || Math.abs(n.idx - c.ci) > 8) continue
      if ((n.x - c.x) ** 2 + (n.y - c.y) ** 2 < 30 * 30) {
        n.taken = true
        w.nitro = 3.2
        const sp = carScreen()
        ui.text(sp.x, sp.y - 70, 'NITRO!', '#67e8f9', 24)
        ui.ring(sp.x, sp.y, { color: '#22d3ee', maxR: 80, life: 0.45, width: 5 })
        fx.shake(4, 0.2)
        sfx.power()
        sfx.whoosh()
        haptic.medium()
        if (!w.seen.nitro) {
          w.seen.nitro = true
          say('NITRO!', 'boost + smash through obstacles')
        }
      }
    }
    // first sight of new hazards
    for (const h of w.hazards) {
      if (h.hit || h.idx < c.ci + 30 || h.idx > c.ci + 90) continue
      if (h.kind === 'roller' && !w.seen.roller) {
        w.seen.roller = true
        say('ROLLING BARRELS!', 'time your pass across the red line')
        sfx.thud()
      } else if (h.kind === 'mine' && !w.seen.mine) {
        w.seen.mine = true
        say('SPARK MINES!', 'they blow when you get close')
        sfx.tick()
      }
    }

    // camera
    const look = 110
    w.cam.x = approach(w.cam.x, c.x + Math.cos(c.phi) * look, 5, raw)
    w.cam.y = approach(w.cam.y, c.y + Math.sin(c.phi) * look, 5, raw)
    const camTarget = S(c.ci + 14).a
    w.cam.a += angDiff(w.cam.a, camTarget) * (1 - Math.exp(-2.2 * raw))
    w.themeFade = Math.max(0, w.themeFade - raw * 0.8)
    if (demo) w.theme = s.theme

    w.hudT -= raw
    if (w.hudT <= 0 && live) {
      w.hudT = 0.1
      pushHud()
    }
  }

  // ── Drawing ───────────────────────────────────────────
  function drawTrack(ctx: CanvasRenderingContext2D, from: number, to: number) {
    // draw in runs of same theme / similar width
    let i = from
    while (i < to) {
      const s0 = S(i)
      const th = THEMES[s0.theme]
      const hwBucket = Math.round(s0.hw / 4)
      let j = i + 1
      while (j < to && S(j).theme === s0.theme && Math.round(S(j).hw / 4) === hwBucket) j++
      const hw = s0.hw
      const path = new Path2D()
      for (let k = Math.max(from, i - 1); k <= Math.min(to, j); k++) {
        const s = S(k)
        if (k === Math.max(from, i - 1)) path.moveTo(s.x, s.y)
        else path.lineTo(s.x, s.y)
      }
      ctx.lineJoin = 'round'
      ctx.lineCap = 'butt'
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = hw * 2 + 30
      ctx.stroke(path)
      ctx.strokeStyle = th.rumbleA
      ctx.lineWidth = hw * 2 + 16
      ctx.stroke(path)
      ctx.strokeStyle = th.rumbleB
      ctx.setLineDash([14, 14])
      ctx.stroke(path)
      ctx.setLineDash([])
      ctx.strokeStyle = th.track
      ctx.lineWidth = hw * 2
      ctx.stroke(path)
      ctx.strokeStyle = th.edge
      ctx.globalAlpha = th.night ? 0.9 : 0.6
      ctx.lineWidth = hw * 2 - 6
      ctx.stroke(path)
      ctx.globalAlpha = 1
      ctx.strokeStyle = th.track
      ctx.lineWidth = hw * 2 - 10
      ctx.stroke(path)
      // centre dashes
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 3
      ctx.setLineDash([18, 22])
      ctx.stroke(path)
      ctx.setLineDash([])
      i = j
    }

  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    ui.step(raw)
    update(dt, raw)
    const c = w.car
    const th = THEMES[w.theme]

    // ground
    ctx.fillStyle = th.ground
    ctx.fillRect(0, 0, W, H)
    if (w.themeFade > 0) {
      ctx.globalAlpha = w.themeFade
      ctx.fillStyle = THEMES[w.prevTheme].ground
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = 1
    }

    ctx.save()
    ctx.translate(fx.offsetX, fx.offsetY)
    ctx.translate(W / 2, H * 0.62)
    ctx.rotate(-Math.PI / 2 - w.cam.a)
    ctx.translate(-w.cam.x, -w.cam.y)

    const from = Math.max(w.base, c.ci - 110)
    const to = Math.min(lastIdx(), c.ci + 190)
    const viewR = Math.hypot(W, H) * 0.7
    const inView = (x: number, y: number) => Math.abs(x - w.cam.x) < viewR && Math.abs(y - w.cam.y) < viewR

    // ground mottling under decos
    for (const d of w.decos) {
      if (d.idx < from - 40 || d.idx > to + 40 || !inView(d.x, d.y) || d.kind === 'tyres') continue
      const dt2 = THEMES[d.theme]
      ctx.fillStyle = dt2.ground2
      ctx.beginPath()
      ctx.ellipse(d.x + 14, d.y + 10, 34, 20, d.rot, 0, Math.PI * 2)
      ctx.fill()
    }

    drawTrack(ctx, from, to)

    // skid marks
    if (w.skids.length) {
      ctx.strokeStyle = th.night ? 'rgba(0,0,0,0.5)' : 'rgba(20,20,24,0.32)'
      ctx.lineWidth = 3.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      const sk = w.skids
      for (let k = 0; k < sk.length; k += 8) {
        if (!inView(sk[k], sk[k + 1])) continue
        ctx.moveTo(sk[k], sk[k + 1])
        ctx.lineTo(sk[k + 2], sk[k + 3])
        ctx.moveTo(sk[k + 4], sk[k + 5])
        ctx.lineTo(sk[k + 6], sk[k + 7])
      }
      ctx.stroke()
    }

    // checkpoints & gates
    for (let pi = S(from).piece; pi <= S(to).piece; pi++) {
      const p = w.pieces[pi]
      if (p.cp && p.start >= from && p.start <= to) {
        const s = S(p.start)
        ctx.save()
        ctx.translate(s.x, s.y)
        ctx.rotate(s.a)
        const n = 12
        const cw = (s.hw * 2) / n
        for (let k = 0; k < n; k++) {
          for (let r = 0; r < 2; r++) {
            ctx.fillStyle = (k + r) % 2 ? '#111827' : '#f8fafc'
            ctx.fillRect(-7 + r * 7, -s.hw + k * cw, 7, cw + 0.5)
          }
        }
        ctx.fillStyle = p.cpDone ? '#4ade80' : '#facc15'
        ctx.beginPath()
        ctx.arc(0, -s.hw - 14, 7, 0, Math.PI * 2)
        ctx.arc(0, s.hw + 14, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      const gt = p.gate
      if (gt && gt.idx >= from && gt.idx <= to && (!gt.checked || gt.flash > 0)) {
        const s = S(gt.idx)
        const nx = -Math.sin(s.a)
        const ny = Math.cos(s.a)
        const tol = Math.max(18, s.hw * 0.3)
        const ax = s.x + nx * (gt.lat - tol)
        const ay = s.y + ny * (gt.lat - tol)
        const bx = s.x + nx * (gt.lat + tol)
        const by = s.y + ny * (gt.lat + tol)
        const col = gt.passed ? '#4ade80' : '#22d3ee'
        ctx.globalAlpha = gt.checked ? gt.flash : 0.55 + Math.sin(t * 6) * 0.25
        ctx.strokeStyle = col
        ctx.lineWidth = 4
        ctx.setLineDash([6, 6])
        ctx.lineDashOffset = -t * 30
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.globalAlpha = 1
        blit(ctx, glowSprite('rgba(34,211,238,0.7)', 18), ax, ay, 36, 36)
        blit(ctx, glowSprite('rgba(34,211,238,0.7)', 18), bx, by, 36, 36)
        ctx.fillStyle = '#ecfeff'
        ctx.beginPath()
        ctx.arc(ax, ay, 5, 0, Math.PI * 2)
        ctx.arc(bx, by, 5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // hazards & coins
    for (const h of w.hazards) {
      if (h.idx < from || h.idx > to) continue
      if (h.kind === 'roller') {
        if (!h.hit) {
          // telegraph: red dashed sweep line across the track + edge chevrons
          const hs = S(h.idx)
          const nx = -Math.sin(hs.a)
          const ny = Math.cos(hs.a)
          ctx.globalAlpha = 0.5 + Math.sin(t * 8) * 0.2
          ctx.strokeStyle = '#ef4444'
          ctx.lineWidth = 3
          ctx.setLineDash([10, 8])
          ctx.beginPath()
          ctx.moveTo(hs.x - nx * hs.hw, hs.y - ny * hs.hw)
          ctx.lineTo(hs.x + nx * hs.hw, hs.y + ny * hs.hw)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.globalAlpha = 1
          blit(ctx, glowSprite('rgba(239,68,68,0.55)', 16), hs.x - nx * (hs.hw + 10), hs.y - ny * (hs.hw + 10), 32, 32)
          blit(ctx, glowSprite('rgba(239,68,68,0.55)', 16), hs.x + nx * (hs.hw + 10), hs.y + ny * (hs.hw + 10), 32, 32)
        }
        const frame = ((Math.floor(((h.t ?? 0) * 6) % 12) + 12) % 12)
        blit(ctx, barrelSprite(frame), h.x, h.y, 30, 37, h.rot)
      } else if (h.kind === 'mine') {
        if (h.hit) {
          ctx.fillStyle = 'rgba(20,12,8,0.45)'
          ctx.beginPath()
          ctx.arc(h.x, h.y, 18, 0, Math.PI * 2)
          ctx.fill()
          continue
        }
        const armed = (h.arm ?? -1) >= 0
        const lit = armed ? Math.floor(t * 20) % 2 === 0 : Math.sin((h.t ?? 0) * 5) > 0.2
        if (lit) blit(ctx, glowSprite('rgba(239,68,68,0.5)', 20), h.x, h.y, 40, 40)
        blit(ctx, mineSprite(lit), h.x, h.y, 32, 32)
        if (armed) {
          const k = 1 - (h.arm ?? 0) / 0.38
          ctx.strokeStyle = `rgba(239,68,68,${0.4 + k * 0.5})`
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(h.x, h.y, 12 + k * 30, 0, Math.PI * 2)
          ctx.stroke()
        }
      } else if (h.kind === 'oil') blit(ctx, oilSprite(), h.x, h.y, 50, 34, h.rot)
      else if (h.kind === 'cone') blit(ctx, coneSprite(), h.x, h.y, 16, 16, h.rot)
      else blit(ctx, tyreStackSprite('#ef4444'), h.x, h.y, 30, 30, h.rot)
    }
    for (const co of w.coins) {
      if (co.taken || co.idx < from || co.idx > to) continue
      const sx = 0.35 + Math.abs(Math.cos(co.t * 4)) * 0.65
      ctx.save()
      ctx.translate(co.x, co.y)
      ctx.rotate(w.cam.a + Math.PI / 2)
      ctx.scale(sx, 1)
      blit(ctx, coinSprite(), 0, 0, 18, 18)
      ctx.restore()
    }

    for (const n of w.nitros) {
      if (n.taken || n.idx < from || n.idx > to) continue
      const bob = 1 + Math.sin(n.t * 5) * 0.08
      blit(ctx, glowSprite('rgba(34,211,238,0.55)', 22), n.x, n.y, 44 * bob, 44 * bob)
      blit(ctx, nitroSprite(), n.x, n.y, 22 * bob, 30 * bob, w.cam.a + Math.PI / 2)
    }

    // ghost rival
    if (w.ghost) {
      const g = w.ghost
      ctx.globalAlpha = 0.5
      blit(ctx, carSprite('#a78bfa', '#4c1d95', '#f0abfc'), g.x, g.y, CAR_L, CAR_W, g.a)
      ctx.globalAlpha = 1
    }

    // player car
    const theta = c.phi + c.drift
    if (phaseRef.current !== 'over' || c.v > 5) {
      if (th.night) blit(ctx, glowSprite('rgba(232,121,249,0.4)', 40), c.x, c.y, 80, 80)
      if (w.nitro > 0) blit(ctx, glowSprite('rgba(34,211,238,0.45)', 40), c.x, c.y, 90, 90)
      const blink = c.inv > 0 && Math.floor(t * 12) % 2 === 0
      if (!blink) blit(ctx, carSprite('#ef4444', '#7f1d1d', '#f8fafc'), c.x, c.y, CAR_L, CAR_W, theta)
      if (c.hold && phaseRef.current === 'play') {
        // brake glow
        const bx = c.x - Math.cos(theta) * CAR_L * 0.5
        const by = c.y - Math.sin(theta) * CAR_L * 0.5
        blit(ctx, glowSprite('rgba(239,68,68,0.6)', 16), bx, by, 32, 32)
      }
    }

    // decorations (on top so trees overhang)
    for (const d of w.decos) {
      if (d.idx < from - 40 || d.idx > to + 40 || !inView(d.x, d.y)) continue
      const dt2 = THEMES[d.theme]
      if (d.kind === 'tyres') blit(ctx, tyreStackSprite(dt2.rumbleA), d.x, d.y, 24, 24)
      else if (d.kind === 'rock') blit(ctx, rockSprite(dt2.leaf, dt2.leaf2), d.x, d.y, 34, 26, d.rot)
      else if (d.kind === 'sakura') blit(ctx, sakuraSprite(), d.x, d.y, 48, 48, d.rot)
      else if (d.kind === 'lava') {
        const pulse = 1 + Math.sin(t * 2 + d.rot * 3) * 0.06
        blit(ctx, glowSprite('rgba(249,115,22,0.35)', 34), d.x, d.y, 68 * pulse, 68 * pulse)
        blit(ctx, lavaSprite(), d.x, d.y, 60, 40, d.rot)
        if (d.rot > 3) blit(ctx, rockSprite(dt2.leaf, dt2.leaf2), d.x + 26, d.y - 14, 30, 22, d.rot)
      }
      else if (d.kind === 'neon') {
        blit(ctx, glowSprite(d.rot > 3 ? 'rgba(232,121,249,0.5)' : 'rgba(34,211,238,0.5)', 26), d.x, d.y, 52, 52)
        ctx.fillStyle = d.rot > 3 ? '#f0abfc' : '#a5f3fc'
        ctx.beginPath()
        ctx.arc(d.x, d.y, 4, 0, Math.PI * 2)
        ctx.fill()
      } else blit(ctx, treeSprite(dt2.leaf, dt2.leaf2, d.kind === 'pine'), d.x, d.y, 44, 44, d.rot)
    }

    fx.draw(ctx)
    ctx.restore()

    // night: darkness with a headlight cutout
    if (th.night) {
      const sp = carScreen()
      const g = ctx.createRadialGradient(sp.x, sp.y - 60, 40, sp.x, sp.y - 60, Math.max(W, H) * 0.75)
      g.addColorStop(0, 'rgba(2,3,12,0)')
      g.addColorStop(1, 'rgba(2,3,12,0.78)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'
      const r = theta + (-Math.PI / 2 - w.cam.a)
      blit(ctx, beamSprite(), sp.x + Math.cos(r) * 120, sp.y + Math.sin(r) * 120, 200, 120, r)
      ctx.globalCompositeOperation = 'source-over'
    }

    drawAmbient(ctx, th.ambient, W, H, t)
    if (w.frenzy > 0) {
      const a = 0.25 + Math.sin(t * 6) * 0.1
      const fg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75)
      fg.addColorStop(0, 'rgba(250,204,21,0)')
      fg.addColorStop(1, `rgba(250,204,21,${a})`)
      ctx.fillStyle = fg
      ctx.fillRect(0, 0, W, H)
    }

    // hold-direction hint while holding
    if (phaseRef.current === 'play' && c.hold) {
      const sp = carScreen()
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'
      ctx.lineWidth = 3
      ctx.beginPath()
      const dx = c.td * 46
      ctx.moveTo(sp.x + dx * 0.6, sp.y - 8)
      ctx.lineTo(sp.x + dx, sp.y)
      ctx.lineTo(sp.x + dx * 0.6, sp.y + 8)
      ctx.stroke()
    }

    ui.draw(ctx)
    ui.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  // Dev-only hook for screenshots: __en2drift.jump(cp) rebuilds the track at checkpoint cp; .frenzy(); .nitro()
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const hook = {
      jump(cp: number) {
        const w = world.current
        w.samples = []
        w.pieces = []
        w.decos = []
        w.hazards = []
        w.coins = []
        w.nitros = []
        w.skids = []
        w.lastRear = null
        w.ghost = null
        w.base = 0
        w.stats.checkpoints = cp
        w.runT = 0
        initTrack(cp)
        w.theme = w.prevTheme = Math.floor(cp / 3) % THEMES.length
        w.car.v = 230
        w.car.inv = 1
        pushHud()
      },
      frenzy() {
        startFrenzy()
      },
      nitro() {
        world.current.nitro = 3.2
      },
      /** place a hazard / pickup just ahead of the car */
      spawn(kind: 'roller' | 'mine' | 'nitro') {
        const w = world.current
        const i = w.car.ci + 45
        const sm = S(i)
        const at = (lat: number) => ({ x: sm.x - Math.sin(sm.a) * lat, y: sm.y + Math.cos(sm.a) * lat })
        if (kind === 'nitro') w.nitros.push({ ...at(0), taken: false, idx: i, t: 0 })
        else if (kind === 'roller') w.hazards.push({ kind, ...at(0), vx: 0, vy: 0, rot: 0, vr: 0, hit: false, idx: i, t: 0 })
        else w.hazards.push({ kind, ...at(sm.hw * 0.62), vx: 0, vy: 0, rot: 0, vr: 0, hit: false, idx: i, t: 0, arm: -1 })
      },
    }
    ;(window as unknown as { __en2drift?: typeof hook }).__en2drift = hook
    return () => {
      delete (window as unknown as { __en2drift?: typeof hook }).__en2drift
    }
  }, [])

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault()
        holdRef.current = true
      }
    }
    function up(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp') holdRef.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    holdRef.current = true
    sfx.tick()
  }
  function onUp() {
    holdRef.current = false
  }

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Corners {hud.corners} · CP {hud.cp}
                </div>
              </div>
              <div className="action-hud__right">
                <span className={`drift-mult${hud.mult >= 5 ? ' is-hot' : ''}`}>x{hud.mult}</span>
                {best > 0 ? <span className="action-hud__small">Best {best}</span> : null}
                {hud.frenzy > 0 ? <span className="drift-frenzy">FRENZY {hud.frenzy}s</span> : null}
                {hud.nitro ? <span className="drift-nitro">NITRO</span> : null}
              </div>
            </div>
          )}
          {phase === 'play' && hud.chain > 0 ? (
            <div className="drift-chain">
              DRIFT <b>{hud.chain}</b> <span>x{hud.mult}</span>
            </div>
          ) : null}
          {banner && phase === 'play' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle game="drift" icon={meta.icon} title={meta.title} hint="Hold to drift into the bend, release to straighten. Hit the glowing apex gates to grow your multiplier." onPlay={start} />
          )}
          <ActionResult
            run={run}
            title={hud.cp >= 3 ? 'Drift king!' : 'Off the track!'}
            subtitle={`Score ${hud.score} · ${hud.corners} corners`}
            celebrate={hud.cp >= 3}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
