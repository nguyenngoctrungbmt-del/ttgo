import { useEffect, useRef, useState } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, approach, clamp, rand } from '../../shared/action/fx'
import { localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import { drawBuilding, drawTerrain } from './art'
import {
  BUILDINGS,
  EXPANSIONS,
  MAX,
  ORDER,
  canPlace,
  cityFromMap,
  dealFrom,
  dealOne,
  freeTiles,
  growShore,
  inLand,
  landBox,
  newCity,
  preview,
  total,
  type BType,
  type City,
  type Preview,
} from './city'
import { levelSpec, seeded, type CityLevelSpec } from './levels'
import '../../shared/action/action.css'
import './tinycity.css'

const meta = getGame('tinycity')

type Phase = 'idle' | 'play' | 'clear' | 'pick' | 'wild' | 'dying' | 'over'
type PerkId = 'bulldoze' | 'swap' | 'undo' | 'wild'
type Perk = { id: PerkId; label: string; blurb: string }
const PERKS: Perk[] = [
  { id: 'bulldoze', label: 'Bulldozer', blurb: 'Clear one tile of your choice' },
  { id: 'swap', label: 'Fresh Deal', blurb: '+2 swaps for the current building' },
  { id: 'undo', label: 'Rewind', blurb: '+1 undo' },
  { id: 'wild', label: 'Architect', blurb: 'Choose any building type, once' },
]

type Agent = { car: boolean; ax: number; ay: number; bx: number; by: number; k: number; speed: number; col: string }
type Snap = { cells: (BType | null)[]; queue: BType[]; land: number; level: number }

type World = {
  spec: CityLevelSpec
  runScore: number
  usedTools: boolean
  levels: number
  city: City
  queue: BType[]
  level: number
  score: number
  undo: Snap[]
  undos: number
  swaps: number
  dozers: number
  wilds: number
  mode: 'place' | 'doze'
  hover: { x: number; y: number } | null
  pv: Preview | null
  placedAt: number[][]
  agents: Agent[]
  landPrev: number
  landT: number
  cam: { cx: number; cy: number; tw: number }
  rnd: () => number
  stats: { level: number; buildings: number; bigplay: number; parks: number }
}

function freshWorld(seed: number): World {
  const rnd = seeded(seed)
  const city = newCity(rnd)
  const placedAt: number[][] = []
  for (let y = 0; y < MAX; y++) placedAt.push(new Array(MAX).fill(-9))
  return {
    spec: levelSpec(1),
    runScore: 0,
    usedTools: false,
    levels: 0,
    city,
    queue: [dealOne(1, rnd), dealOne(1, rnd), dealOne(1, rnd)],
    level: 1,
    score: 0,
    undo: [],
    undos: 1,
    swaps: 1,
    dozers: 0,
    wilds: 0,
    mode: 'place',
    hover: null,
    pv: null,
    placedAt,
    agents: [],
    landPrev: 0,
    landT: 9,
    cam: { cx: 4, cy: 4, tw: 40 },
    rnd,
    stats: { level: 1, buildings: 0, bigplay: 0, parks: 0 },
  }
}

const COLORS: Record<BType, [string, string]> = {
  house: ['#ef4444', '#fde68a'],
  park: ['#22c55e', '#86efac'],
  shop: ['#0284c7', '#7dd3fc'],
  factory: ['#6b7280', '#d1d5db'],
  fountain: ['#0ea5e9', '#e0f2fe'],
  school: ['#ca8a04', '#fde047'],
  windmill: ['#b91c1c', '#f5f5f4'],
  tower: ['#4338ca', '#a5b4fc'],
  statue: ['#ca8a04', '#fef08a'],
}

function BIcon({ b }: { b: BType }) {
  const [a, c] = COLORS[b]
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 26 L36 33 L20 40 L4 33 Z" fill="#86efac" />
      {b === 'house' && (
        <g>
          <path d="M9 31 V21 H31 V31 L20 36 Z" fill={c} />
          <path d="M6 22 L20 10 L34 22 Z" fill={a} />
          <rect x="17" y="27" width="5" height="7" fill="#7c2d12" />
        </g>
      )}
      {b === 'park' && (
        <g>
          <circle cx="14" cy="23" r="7" fill={a} />
          <circle cx="26" cy="20" r="8" fill={a} />
          <circle cx="24" cy="17" r="3" fill={c} />
          <rect x="13" y="28" width="2" height="5" fill="#7c4a21" />
          <rect x="25" y="26" width="2" height="6" fill="#7c4a21" />
        </g>
      )}
      {b === 'shop' && (
        <g>
          <path d="M7 32 V16 H33 V32 L20 37 Z" fill={c} />
          <path d="M7 16 H33 L31 21 H9 Z" fill="#ef4444" />
          <path d="M12 16 L11 21 M18 16 L18 21 M24 16 L25 21" stroke="#fff" strokeWidth="2.4" />
          <rect x="16" y="25" width="8" height="9" fill={a} />
        </g>
      )}
      {b === 'factory' && (
        <g>
          <path d="M5 33 V20 L13 15 V20 L21 15 V20 L29 15 V33 L20 37 Z" fill={c} />
          <rect x="29" y="7" width="5" height="26" fill="#7f1d1d" />
          <circle cx="33" cy="5" r="3" fill="#e5e7eb" />
          <rect x="9" y="25" width="16" height="3" fill={a} />
        </g>
      )}
      {b === 'fountain' && (
        <g>
          <ellipse cx="20" cy="31" rx="14" ry="5" fill="#cbd5e1" />
          <ellipse cx="20" cy="30" rx="11" ry="3.5" fill={a} />
          <path d="M20 29 V13 M20 14 Q12 14 10 28 M20 14 Q28 14 30 28" stroke={c} strokeWidth="2" fill="none" />
        </g>
      )}
      {b === 'school' && (
        <g>
          <path d="M5 33 V20 H35 V33 L20 37 Z" fill={c} />
          <path d="M3 21 L20 12 L37 21 Z" fill="#dc2626" />
          <rect x="17" y="4" width="2" height="9" fill="#e5e7eb" />
          <path d="M19 4 L26 6 L19 8 Z" fill="#3b82f6" />
          <rect x="17" y="27" width="6" height="8" fill={a} />
        </g>
      )}
      {b === 'windmill' && (
        <g>
          <path d="M15 34 L17 14 H23 L25 34 Z" fill={c} />
          <path d="M16 14 L20 9 L24 14 Z" fill={a} />
          <path d="M20 12 L8 4 M20 12 L32 20 M20 12 L28 0 M20 12 L12 24" stroke="#a16207" strokeWidth="3" />
        </g>
      )}
      {b === 'tower' && (
        <g>
          <path d="M12 35 V5 H28 V35 L20 38 Z" fill={a} />
          <path d="M20 5 H28 V35 L20 38 Z" fill="#312e81" />
          {[9, 15, 21, 27].map((y) => (
            <g key={y}>
              <rect x="14" y={y} width="3" height="3" fill="#fde68a" />
              <rect x="22" y={y} width="3" height="3" fill="#fde68a" />
            </g>
          ))}
        </g>
      )}
      {b === 'statue' && (
        <g>
          <rect x="12" y="27" width="16" height="7" fill="#d6d3d1" />
          <circle cx="20" cy="9" r="3.4" fill={a} />
          <path d="M16 27 L17 13 H23 L24 27 Z" fill={c} />
          <path d="M23 14 L29 5" stroke={a} strokeWidth="2.4" />
        </g>
      )}
    </svg>
  )
}

function ToolIcon({ id }: { id: PerkId }) {
  if (id === 'undo') return <svg viewBox="0 0 24 24"><path d="M9 6 L4 11 L9 16 M4 11 H15 A5 5 0 0 1 15 21" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  if (id === 'swap') return <svg viewBox="0 0 24 24"><path d="M4 8 H18 L14 4 M20 16 H6 L10 20" stroke="#fff" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
  if (id === 'bulldoze') return <svg viewBox="0 0 24 24"><rect x="3" y="10" width="13" height="7" rx="1.5" fill="#fbbf24" /><rect x="6" y="5" width="7" height="6" fill="#fbbf24" /><path d="M16 9 L21 8 L21 19 L16 18" fill="#9ca3af" /><circle cx="6" cy="19" r="2.2" fill="#fff" /><circle cx="13" cy="19" r="2.2" fill="#fff" /></svg>
  return <svg viewBox="0 0 24 24"><path d="M12 3 L14.5 9 L21 9.5 L16 13.5 L17.5 20 L12 16.5 L6.5 20 L8 13.5 L3 9.5 L9.5 9 Z" fill="#f472b6" /></svg>
}

export default function TinyCityGame() {
  const run = useActionRun('tinycity')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const arenaRef = useRef<HTMLDivElement>(null)
  const fx = useRef(new Fx()).current
  const world = useRef<World>(freshWorld(7))
  const phaseRef = useRef<Phase>('idle')
  const size = useRef({ W: 360, H: 600 })
  const pressRef = useRef(false)
  const timeRef = useRef(0)
  const lastEvent = useRef(0)
  const idleT = useRef(0)

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, total: 0, name: '', level: 1, target: 14, prev: 0, queue: [] as BType[], undos: 0, swaps: 0, dozers: 0, wilds: 0, mode: 'place' as 'place' | 'doze', free: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [choices, setChoices] = useState<Perk[]>([])

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function say(text: string, sub?: string) {
    setBanner({ key: performance.now(), text, sub })
  }

  function pushHud() {
    const w = world.current
    setHud({
      score: w.score,
      total: w.runScore + w.score,
      name: w.spec.name,
      level: w.level,
      target: w.spec.target,
      prev: 0,
      queue: [...w.queue],
      undos: w.undos,
      swaps: w.swaps,
      dozers: w.dozers,
      wilds: w.wilds,
      mode: w.mode,
      free: freeTiles(w.city),
    })
  }

  // ── Iso geometry ─────────────────────────────────────
  function midY() {
    return 70 + (size.current.H - 70 - 92) / 2
  }
  function iso(w: World, gx: number, gy: number) {
    const { W } = size.current
    const { cx, cy, tw } = w.cam
    return { x: W / 2 + (gx - cx - (gy - cy)) * (tw / 2), y: midY() + (gx - cx + (gy - cy)) * (tw / 4) }
  }
  function tileAt(w: World, sx: number, sy: number) {
    const { W } = size.current
    const { cx, cy, tw } = w.cam
    const u = (sx - W / 2) / (tw / 2)
    const v = (sy - midY()) / (tw / 4)
    const gx = Math.round((u + v) / 2 + cx)
    const gy = Math.round((v - u) / 2 + cy)
    if (gx < 0 || gy < 0 || gx >= MAX || gy >= MAX) return null
    return { x: gx, y: gy }
  }
  function camTarget(w: World) {
    const r = landBox(w.city)
    const { W, H } = size.current
    const span = (r.w + r.h) / 2
    const tw = Math.min((W * 0.95) / span, ((H - 70 - 100) / (span * 0.5 + 1.2)) * 1)
    return { cx: r.x0 + (r.w - 1) / 2, cy: r.y0 + (r.h - 1) / 2, tw: Math.min(tw, 70) }
  }

  // ── Run ──────────────────────────────────────────────
  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld(Math.floor(Math.random() * 1e9))
    w.undos = 1 + run.level('undo')
    w.swaps = 1 + run.level('swap')
    world.current = w
    loadLevel(Math.max(1, level))
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    pushHud()
    sfx.ready()
  }

  /** Lay out island n: authored terrain, its building deck and target. */
  function loadLevel(n: number) {
    const w = world.current
    const spec = levelSpec(n)
    w.spec = spec
    w.level = n
    w.city = cityFromMap(spec.map, run.level('land') * 3)
    w.rnd = seeded(spec.seed)
    w.queue = [dealFrom(spec.pool, w.rnd, spec.weights), dealFrom(spec.pool, w.rnd, spec.weights), dealFrom(spec.pool, w.rnd, spec.weights)]
    w.score = 0
    w.undo = []
    w.undos = Math.max(w.undos, 1 + run.level('undo'))
    w.swaps = Math.max(w.swaps, 1 + run.level('swap'))
    w.usedTools = false
    w.mode = 'place'
    w.hover = null
    w.pv = null
    w.agents = []
    for (const row of w.placedAt) row.fill(-9)
    w.landT = 0
    w.cam = camTarget(w)
    w.stats.level = Math.max(w.stats.level, n)
    const pool = spec.pool.map((b) => BUILDINGS[b].label).join(', ')
    say(spec.boss ? `BOSS · ${spec.name}` : `LEVEL ${n} · ${spec.name}`, `reach ${spec.target} · ${spec.hint ?? pool}`)
  }

  function snap(w: World): Snap {
    const cells: (BType | null)[] = []
    for (let y = 0; y < MAX; y++) for (let x = 0; x < MAX; x++) cells.push(w.city.cells[y][x].b)
    return { cells, queue: [...w.queue], land: w.city.land, level: w.level }
  }

  function place(x: number, y: number) {
    const w = world.current
    if (!canPlace(w.city, x, y)) {
      sfx.miss()
      haptic.error()
      return
    }
    const b = w.queue[0]
    const pv = preview(w.city, x, y, b)
    w.undo.push(snap(w))
    if (w.undo.length > 20) w.undo.shift()
    w.city.cells[y][x].b = b
    w.placedAt[y][x] = timeRef.current
    w.queue.shift()
    w.queue.push(dealFrom(w.spec.pool, w.rnd, w.spec.weights))
    w.score = total(w.city)
    w.stats.buildings += 1
    if (b === 'park') w.stats.parks += 1
    w.stats.bigplay = Math.max(w.stats.bigplay, pv.delta)
    const p = iso(w, x, y)
    const tw = w.cam.tw
    fx.burst(p.x, p.y, { count: 12, color: ['#e7e5e4', '#d6d3d1', '#a8a29e'], speed: 90, size: 4, gravity: -20, drag: 3 })
    fx.ring(p.x, p.y, { color: '#ffffff', maxR: tw * 0.6, life: 0.35, width: 2 })
    const col = pv.delta >= 8 ? '#fde047' : pv.delta > 0 ? '#bbf7d0' : '#fca5a5'
    fx.text(p.x, p.y - tw * 0.8, `${pv.delta > 0 ? '+' : ''}${pv.delta}`, col, 18 + Math.min(10, Math.max(0, pv.delta)))
    for (const ch of pv.changes) {
      const q = iso(w, ch.x, ch.y)
      fx.text(q.x, q.y - tw * 0.5, `${ch.d > 0 ? '+' : ''}${ch.d}`, ch.d > 0 ? '#86efac' : '#fca5a5', 12)
    }
    if (pv.delta >= 12) {
      fx.burst(p.x, p.y - tw * 0.4, { count: 26, color: ['#fde047', '#ffffff', '#f472b6'], speed: 230, shape: 'spark', gravity: 120 })
      say('AMAZING SPOT!', `+${pv.delta}`)
      sfx.combo()
    } else if (pv.delta >= 8) {
      fx.burst(p.x, p.y - tw * 0.4, { count: 14, color: ['#fde047', '#ffffff'], speed: 170, shape: 'spark', gravity: 120 })
      fx.text(p.x, p.y - tw * 1.3, 'GREAT!', '#fde047', 14)
    }
    fx.shake(2, 0.1)
    sfx.thud()
    if (pv.delta > 0) sfx.score(Math.min(10, pv.delta))
    else sfx.miss()
    haptic.light()
    spawnAgents(w)
    checkLevel(w)
    run.update({ ...w.stats, score: w.runScore + w.score })
    pushHud()
    if (phaseRef.current === 'play') checkEnd(w)
  }

  /** Stars: clear = 1, at least `spare` free tiles left = +1, no undo/swap/bulldozer/architect = +1. */
  function checkLevel(w: World) {
    if (w.score < w.spec.target || phaseRef.current !== 'play') return
    const left = freeTiles(w.city)
    const stars = 1 + (left >= w.spec.spare ? 1 : 0) + (w.usedTools ? 0 : 1)
    const res = run.completeLevel(w.level, stars)
    w.levels += 1
    w.stats.level = Math.max(w.stats.level, w.level + 1)
    const bonus = (w.spec.boss ? 40 : 15) + left * 2
    w.runScore += w.score + bonus
    say(w.spec.boss ? 'BOSS ISLAND BUILT!' : `LEVEL ${w.level} CLEAR!`, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${left} tiles spare · +${bonus}`)
    sfx.win()
    sfx.levelUp()
    haptic.success()
    fx.flash('#fef9c3', 0.2)
    const { W, H } = size.current
    fx.burst(W / 2, H * 0.3, { count: 36, color: ['#fde047', '#4ade80', '#60a5fa', '#f472b6'], speed: 300, shape: 'square', size: 4, gravity: 300 })
    if (res.firstClear && w.level % 5 === 0) {
      const now = performance.now()
      if (now - lastEvent.current > 30000) {
        lastEvent.current = now
        void trackEvent('action_milestone', { game_id: 'tinycity', kind: 'level', value: w.level })
      }
    }
    setPhaseBoth('clear')
    setChoices([...PERKS].sort(() => Math.random() - 0.5).slice(0, 3))
    window.setTimeout(() => {
      if (phaseRef.current === 'clear' && world.current === w) setPhaseBoth('pick')
    }, 1500)
  }

  function checkEnd(w: World) {
    if (freeTiles(w.city) > 0 || w.dozers > 0) return
    die()
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    say('NO SPACE LEFT', 'your town is complete')
    fx.slowmo(0.6, 0.4)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(w.levels * 4 + (w.runScore + w.score) / 35)
      run.end({ score: w.runScore + w.score, cleared: w.levels >= 1, stats: { ...w.stats }, coins }, revive)
    }, 1300)
  }

  /** Ad revive: the shore grows by a few tiles, plus bulldozers. */
  function revive() {
    const w = world.current
    growShore(w.city, 4)
    w.dozers += 2
    say('REVIVED!', 'more land + bulldozers')
    pushHud()
    setPhaseBoth('play')
  }

  function choose(p: Perk) {
    const w = world.current
    if (p.id === 'bulldoze') w.dozers += 1
    else if (p.id === 'swap') w.swaps += 2
    else if (p.id === 'undo') w.undos += 1
    else w.wilds += 1
    sfx.power()
    haptic.success()
    loadLevel(w.level + 1)
    setPhaseBoth('play')
    pushHud()
  }

  function doUndo() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.undos <= 0) return
    const s = w.undo.pop()
    if (!s) return
    w.undos -= 1
    w.usedTools = true
    let i = 0
    for (let y = 0; y < MAX; y++) for (let x = 0; x < MAX; x++) w.city.cells[y][x].b = s.cells[i++]
    w.queue = s.queue
    w.score = total(w.city)
    sfx.whoosh()
    haptic.light()
    pushHud()
  }

  function doSwap() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.swaps <= 0) return
    w.swaps -= 1
    w.usedTools = true
    const cur = w.queue[0]
    let next = dealFrom(w.spec.pool, w.rnd, w.spec.weights)
    for (let k = 0; k < 6 && next === cur; k++) next = dealFrom(w.spec.pool, w.rnd, w.spec.weights)
    w.queue[0] = next
    sfx.flip()
    pushHud()
  }

  function toggleDoze() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.dozers <= 0) return
    w.mode = w.mode === 'doze' ? 'place' : 'doze'
    sfx.tap()
    pushHud()
  }

  function doze(x: number, y: number) {
    const w = world.current
    const cell = w.city.cells[y][x]
    if (!inLand(w.city, x, y) || (!cell.b && !cell.t)) {
      sfx.miss()
      return
    }
    w.undo.push(snap(w))
    cell.b = null
    cell.t = null
    w.dozers -= 1
    w.usedTools = true
    w.mode = 'place'
    w.score = total(w.city)
    const p = iso(w, x, y)
    fx.explode(p.x, p.y - 6, 0.7, ['#fbbf24', '#a8a29e', '#78716c', '#e7e5e4'])
    sfx.boom(0.4)
    haptic.medium()
    pushHud()
  }

  function pickWild(b: BType) {
    const w = world.current
    w.wilds -= 1
    w.usedTools = true
    w.queue[0] = b
    sfx.power()
    setPhaseBoth('play')
    pushHud()
  }

  // ── Pointer ──────────────────────────────────────────
  function updateHover(e: React.PointerEvent) {
    const w = world.current
    const el = arenaRef.current
    if (!el) return
    const p = localPoint(e, el)
    const off = e.pointerType === 'touch' ? 26 : 0
    const t = tileAt(w, p.x, p.y - off)
    const prev = w.hover
    w.hover = t && inLand(w.city, t.x, t.y) ? t : null
    if (w.hover && (!prev || prev.x !== w.hover.x || prev.y !== w.hover.y)) {
      w.pv = w.mode === 'place' && canPlace(w.city, w.hover.x, w.hover.y) ? preview(w.city, w.hover.x, w.hover.y, w.queue[0]) : null
      if (pressRef.current) sfx.tick()
    } else if (!w.hover) w.pv = null
  }
  function onDown(e: React.PointerEvent) {
    if (phaseRef.current !== 'play') return
    pressRef.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    world.current.hover = null
    updateHover(e)
  }
  function onMove(e: React.PointerEvent) {
    if (phaseRef.current !== 'play') return
    updateHover(e)
  }
  function onUp(e: React.PointerEvent) {
    if (!pressRef.current) return
    pressRef.current = false
    if (phaseRef.current !== 'play') return
    updateHover(e)
    const w = world.current
    const h = w.hover
    if (e.pointerType === 'touch') w.hover = null
    if (!h) return
    if (w.mode === 'doze') doze(h.x, h.y)
    else place(h.x, h.y)
    w.pv = null
  }

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (phaseRef.current !== 'play') return
      if (e.key === 'z') doUndo()
      else if (e.key === 's') doSwap()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  // ── Street life ──────────────────────────────────────
  function spawnAgents(w: World) {
    let houses = 0
    let biz = 0
    for (let y = 0; y < MAX; y++) for (let x = 0; x < MAX; x++) {
      const b = w.city.cells[y][x].b
      if (!b || !inLand(w.city, x, y)) continue
      if (b === 'house' || b === 'tower' || b === 'park') houses++
      if (b === 'shop' || b === 'factory' || b === 'school') biz++
    }
    const wantCars = Math.min(10, Math.floor(biz * 0.8 + houses * 0.2))
    const wantPeople = Math.min(16, Math.floor(houses * 0.7))
    const r = landBox(w.city)
    const cars = w.agents.filter((a) => a.car).length
    const ppl = w.agents.length - cars
    const add = (car: boolean) => {
      let ax = r.x0
      let ay = r.y0
      for (let k = 0; k < 20; k++) {
        ax = r.x0 + Math.floor(Math.random() * (r.w + 1))
        ay = r.y0 + Math.floor(Math.random() * (r.h + 1))
        if (cornerOk(w, ax, ay)) break
      }
      w.agents.push({ car, ax, ay, bx: ax, by: ay, k: 1, speed: car ? rand(1.2, 1.8) : rand(0.35, 0.6), col: car ? ['#ef4444', '#3b82f6', '#f59e0b', '#ffffff', '#10b981'][Math.floor(Math.random() * 5)] : ['#f97316', '#a855f7', '#22c55e', '#e11d48'][Math.floor(Math.random() * 4)] })
    }
    for (let i = cars; i < wantCars; i++) add(true)
    for (let i = ppl; i < wantPeople; i++) add(false)
  }

  /** Street corners sit between tiles; a corner is walkable if any tile around it is land. */
  function cornerOk(w: World, x: number, y: number) {
    return inLand(w.city, x, y) || inLand(w.city, x - 1, y) || inLand(w.city, x, y - 1) || inLand(w.city, x - 1, y - 1)
  }

  function stepAgents(w: World, dt: number) {
    for (const a of w.agents) {
      a.k += a.speed * dt
      if (a.k >= 1) {
        a.ax = a.bx
        a.ay = a.by
        a.k = 0
        const opts: [number, number][] = []
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const nx = a.ax + dx
          const ny = a.ay + dy
          if (cornerOk(w, nx, ny)) opts.push([nx, ny])
        }
        const o = opts.length ? opts[Math.floor(Math.random() * opts.length)] : [a.ax, a.ay]
        a.bx = o[0]
        a.by = o[1]
      }
    }
  }

  // ── Drawing ──────────────────────────────────────────
  function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, hw: number) {
    ctx.beginPath()
    ctx.moveTo(x, y - hw / 2)
    ctx.lineTo(x + hw, y)
    ctx.lineTo(x, y + hw / 2)
    ctx.lineTo(x - hw, y)
    ctx.closePath()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { W, H }
    timeRef.current = t
    const w = world.current
    const ph = phaseRef.current
    const dt = ph === 'pick' || ph === 'wild' ? 0 : fx.step(raw)
    if (ph === 'pick' || ph === 'wild') fx.step(0)

    // Idle attract: the town builds itself
    if (ph === 'idle') {
      idleT.current += raw
      if (idleT.current > 0.7) {
        idleT.current = 0
        let best: [number, number, number] | null = null
        for (let y = 0; y < MAX; y++) for (let x = 0; x < MAX; x++) {
          if (!canPlace(w.city, x, y)) continue
          const d = preview(w.city, x, y, w.queue[0]).delta + Math.random() * 2
          if (!best || d > best[2]) best = [x, y, d]
        }
        if (!best || w.stats.buildings > 22) {
          world.current = freshWorld(Math.floor(Math.random() * 1e9))
          world.current.city.land = 2
        } else {
          w.city.cells[best[1]][best[0]].b = w.queue[0]
          w.placedAt[best[1]][best[0]] = t
          w.queue.shift()
          w.queue.push(dealOne(Math.min(7, 2 + Math.floor(w.stats.buildings / 3)), w.rnd))
          w.stats.buildings += 1
          w.score = total(w.city)
          spawnAgents(w)
        }
      }
    }

    const tgt = camTarget(w)
    w.cam.cx = approach(w.cam.cx, tgt.cx, 3, raw)
    w.cam.cy = approach(w.cam.cy, tgt.cy, 3, raw)
    w.cam.tw = approach(w.cam.tw, tgt.tw, 3, raw)
    w.landT += raw
    stepAgents(w, dt)

    // sea
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#7dd3fc')
    g.addColorStop(1, '#0e7490')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 14; i++) {
      const y = (i * 53.3 + t * 6) % H
      const x = (i * 97.1) % W
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.quadraticCurveTo(x + 8, y - 3, x + 16, y)
      ctx.stroke()
    }

    fx.applyShake(ctx)
    const tw = w.cam.tw
    const hw = tw / 2
    const r = landBox(w.city)
    const rp = EXPANSIONS[w.landPrev]
    const rise = clamp(w.landT / 0.8, 0, 1)
    // Authored islands rise as a whole when a level loads; the demo grows edge by edge.
    const fresh = (x: number, y: number) => (w.city.mask ? true : !(x >= rp.x0 && y >= rp.y0 && x < rp.x0 + rp.w && y < rp.y0 + rp.h))
    const lift = (x: number, y: number) => (fresh(x, y) && rise < 1 ? (1 - rise) * (1 - rise) * 40 : 0)

    // island base: dirt sides + street plate
    const depth = tw * 0.32
    for (let s = 0; s < 2; s++) {
      for (let y = r.y0; y < r.y0 + r.h; y++) {
        for (let x = r.x0; x < r.x0 + r.w; x++) {
          if (!inLand(w.city, x, y)) continue
          const p = iso(w, x, y)
          const ly = p.y + lift(x, y)
          ctx.globalAlpha = fresh(x, y) ? rise : 1
          if (s === 0) {
            // side faces where the tile is on the front edge
            if (!inLand(w.city, x, y + 1)) {
              ctx.fillStyle = '#92400e'
              ctx.beginPath()
              ctx.moveTo(p.x - hw, ly)
              ctx.lineTo(p.x, ly + hw / 2)
              ctx.lineTo(p.x, ly + hw / 2 + depth)
              ctx.lineTo(p.x - hw, ly + depth)
              ctx.closePath()
              ctx.fill()
            }
            if (!inLand(w.city, x + 1, y)) {
              ctx.fillStyle = '#78350f'
              ctx.beginPath()
              ctx.moveTo(p.x + hw, ly)
              ctx.lineTo(p.x, ly + hw / 2)
              ctx.lineTo(p.x, ly + hw / 2 + depth)
              ctx.lineTo(p.x + hw, ly + depth)
              ctx.closePath()
              ctx.fill()
            }
          } else {
            ctx.fillStyle = '#cbd5e1'
            diamond(ctx, p.x, ly, hw + 0.5)
            ctx.fill()
          }
        }
      }
    }
    ctx.globalAlpha = 1

    // tiles, terrain, buildings in depth order
    const hov = ph === 'play' ? w.hover : null
    for (let sum = 0; sum <= (MAX - 1) * 2; sum++) {
      for (let x = 0; x < MAX; x++) {
        const y = sum - x
        if (y < 0 || y >= MAX || !inLand(w.city, x, y)) continue
        const p = iso(w, x, y)
        const ly = p.y + lift(x, y)
        const cell = w.city.cells[y][x]
        ctx.globalAlpha = fresh(x, y) ? rise : 1
        ctx.fillStyle = (x + y) % 2 ? '#86efac' : '#7ee0a0'
        diamond(ctx, p.x, ly, hw - 2.5)
        ctx.fill()
        if (hov && hov.x === x && hov.y === y) {
          const ok = w.mode === 'doze' ? !!(cell.b || cell.t) : canPlace(w.city, x, y)
          ctx.fillStyle = ok ? (w.mode === 'doze' ? 'rgba(251,191,36,0.55)' : 'rgba(255,255,255,0.55)') : 'rgba(239,68,68,0.45)'
          diamond(ctx, p.x, ly, hw - 2.5)
          ctx.fill()
        }
        if (w.pv && hov && ph === 'play') {
          for (const ch of w.pv.changes) {
            if (ch.x === x && ch.y === y) {
              ctx.fillStyle = ch.d > 0 ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.5)'
              diamond(ctx, p.x, ly, hw - 2.5)
              ctx.fill()
            }
          }
        }
        if (cell.t === 'water') drawTerrain(ctx, cell.t, p.x, ly, tw, t, x * 7 + y)
      }
    }
    ctx.globalAlpha = 1
    for (const a of w.agents) drawAgent(ctx, w, a, a.ax + (a.bx - a.ax) * a.k, a.ay + (a.by - a.ay) * a.k)
    for (let sum = 0; sum <= (MAX - 1) * 2; sum++) {
      for (let x = 0; x < MAX; x++) {
        const y = sum - x
        if (y < 0 || y >= MAX || !inLand(w.city, x, y)) continue
        const p = iso(w, x, y)
        const ly = p.y + lift(x, y)
        const cell = w.city.cells[y][x]
        ctx.globalAlpha = fresh(x, y) ? rise : 1
        if (cell.t && cell.t !== 'water') drawTerrain(ctx, cell.t, p.x, ly, tw, t, x * 7 + y)
        if (cell.b) {
          const age = t - w.placedAt[y][x]
          const drop = age < 0.35 ? (1 - age / 0.35) * (1 - age / 0.35) * 46 : 0
          const sq = age < 0.5 ? 1 + Math.sin(Math.min(1, age / 0.5) * Math.PI) * 0.12 * (age > 0.3 ? 1 : 0) : 1
          ctx.save()
          ctx.translate(p.x, ly - drop)
          ctx.scale(sq, 2 - sq)
          drawBuilding(ctx, cell.b, 0, 0, tw, t, x * 3 + y * 5)
          ctx.restore()
        } else if (hov && hov.x === x && hov.y === y && w.mode === 'place' && canPlace(w.city, x, y)) {
          ctx.globalAlpha = 0.6 + Math.sin(t * 8) * 0.1
          drawBuilding(ctx, w.queue[0], p.x, ly - 4, tw, t, 1)
          ctx.globalAlpha = 1
        }
      }
    }
    ctx.globalAlpha = 1

    // preview delta + neighbour badges
    if (w.pv && hov && ph === 'play') {
      const p = iso(w, hov.x, hov.y)
      const d = w.pv.delta
      ctx.font = `900 ${Math.round(18 + Math.min(10, Math.max(0, d)))}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 4
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'
      const txt = `${d > 0 ? '+' : ''}${d}`
      const ty = p.y - tw * 1.15 + Math.sin(t * 6) * 2
      ctx.strokeText(txt, p.x, ty)
      ctx.fillStyle = d >= 8 ? '#fde047' : d > 0 ? '#ffffff' : '#fca5a5'
      ctx.fillText(txt, p.x, ty)
      ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
      for (const ch of w.pv.changes) {
        const q = iso(w, ch.x, ch.y)
        const s = `${ch.d > 0 ? '+' : ''}${ch.d}`
        ctx.strokeText(s, q.x, q.y - tw * 0.55)
        ctx.fillStyle = ch.d > 0 ? '#bbf7d0' : '#fecaca'
        ctx.fillText(s, q.x, q.y - tw * 0.55)
      }
    }

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)
  }

  function drawAgent(ctx: CanvasRenderingContext2D, w: World, a: Agent, gx: number, gy: number) {
    const p = iso(w, gx - 0.5, gy - 0.5)
    const tw = w.cam.tw
    if (a.car) {
      const horiz = a.by === a.ay
      const dx = horiz ? tw / 2 : -tw / 2
      const ang = Math.atan2(tw / 4, dx) + (horiz ? (a.bx > a.ax ? 0 : Math.PI) : a.by > a.ay ? 0 : Math.PI)
      ctx.save()
      ctx.translate(p.x, p.y - 2)
      ctx.rotate(ang)
      ctx.fillStyle = 'rgba(0,0,0,0.25)'
      ctx.fillRect(-tw * 0.1, -tw * 0.03, tw * 0.22, tw * 0.1)
      ctx.fillStyle = a.col
      ctx.fillRect(-tw * 0.11, -tw * 0.05, tw * 0.22, tw * 0.1)
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(-tw * 0.02, -tw * 0.04, tw * 0.07, tw * 0.08)
      ctx.restore()
    } else {
      const bob = Math.abs(Math.sin(timeRef.current * 10 + gx * 3)) * 1.2
      ctx.fillStyle = a.col
      ctx.fillRect(p.x - 1.3, p.y - 6 - bob, 2.6, 4.5)
      ctx.fillStyle = '#fcd34d'
      ctx.beginPath()
      ctx.arc(p.x, p.y - 7.5 - bob, 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  useActionCanvas(canvasRef, frame)

  useEffect(() => {
    world.current.city.land = 2
  }, [])

  // Dev-only probe: greedy builder move as a tap (or the perk card to click).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const win = window as unknown as Record<string, unknown>
    win.__tinycityBot = () => {
      const w = world.current
      if (phaseRef.current === 'pick') return { click: '.city-pick__card' }
      if (phaseRef.current !== 'play') return null
      let best: [number, number, number] | null = null
      for (let y = 0; y < MAX; y++) for (let x = 0; x < MAX; x++) {
        if (!canPlace(w.city, x, y)) continue
        const d = preview(w.city, x, y, w.queue[0]).delta
        if (!best || d > best[2]) best = [x, y, d]
      }
      if (!best) return null
      const p = iso(w, best[0], best[1])
      return { tap: { x: p.x, y: p.y } }
    }
    return () => {
      delete win.__tinycityBot
    }
  }, [])

  const progress = clamp((hud.score - hud.prev) / Math.max(1, hud.target - hud.prev), 0, 1)
  const cur = hud.queue[0]
  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div ref={arenaRef} className="action-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => (pressRef.current = false)} onPointerLeave={() => (world.current.hover = null)}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Level {hud.level} · {hud.name} · goal {hud.target}
                </div>
                <div className="city-progress">
                  <span style={{ width: `${progress * 100}%` }} />
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">{hud.free} free tiles</span>
              </div>
            </div>
          )}
          {(phase === 'play' || phase === 'pick' || phase === 'wild') && cur && (
            <div className="city-tray" onPointerDown={(e) => e.stopPropagation()}>
              <div
                className={`city-card${hud.wilds > 0 ? ' is-wild' : ''}`}
                key={`${hud.score}-${cur}-${hud.queue.length}-${hud.swaps}`}
                onClick={() => {
                  if (world.current.wilds > 0 && phaseRef.current === 'play') setPhaseBoth('wild')
                }}
              >
                <BIcon b={cur} />
                <strong>{hud.mode === 'doze' ? 'Bulldozer' : BUILDINGS[cur].label}</strong>
                <span>{hud.mode === 'doze' ? 'Tap a tile to clear it' : hud.wilds > 0 ? 'Tap to choose any building' : BUILDINGS[cur].rule}</span>
              </div>
              <div className="city-next" aria-label="Next buildings">
                {hud.queue.slice(1, 3).map((b, i) => (
                  <BIcon key={i} b={b} />
                ))}
              </div>
              <div className="city-tools">
                <button type="button" className="city-tool" aria-label="Swap" disabled={hud.swaps <= 0} onClick={doSwap}>
                  <ToolIcon id="swap" />
                  <b>{hud.swaps}</b>
                </button>
                <button type="button" className="city-tool" aria-label="Undo" disabled={hud.undos <= 0} onClick={doUndo}>
                  <ToolIcon id="undo" />
                  <b>{hud.undos}</b>
                </button>
                <button type="button" className={`city-tool${hud.mode === 'doze' ? ' is-on' : ''}`} aria-label="Bulldozer" disabled={hud.dozers <= 0} onClick={toggleDoze}>
                  <ToolIcon id="bulldoze" />
                  <b>{hud.dozers}</b>
                </button>
                <button type="button" className="city-tool" aria-label="Architect" disabled={hud.wilds <= 0} onClick={() => phaseRef.current === 'play' && setPhaseBoth('wild')}>
                  <ToolIcon id="wild" />
                  <b>{hud.wilds}</b>
                </button>
              </div>
            </div>
          )}
          {banner && phase !== 'idle' && phase !== 'over' ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'pick' && (
            <div className="city-pick" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Level {hud.level} clear!</h3>
              <p>Pick a bonus for the next island</p>
              <div className="city-pick__list">
                {choices.map((p) => (
                  <button key={p.id} type="button" className="city-pick__card" onClick={() => choose(p)}>
                    <ToolIcon id={p.id} />
                    <strong>{p.label}</strong>
                    <span>{p.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === 'wild' && (
            <div className="city-pick" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Architect</h3>
              <p>Choose the next building</p>
              <div className="city-pick__list is-grid">
                {ORDER.filter((b) => world.current.spec.pool.includes(b)).map((b) => (
                  <button key={b} type="button" className="city-pick__type" onClick={() => pickWild(b)}>
                    <BIcon b={b} />
                    {BUILDINGS[b].label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === 'idle' && (
            <ActionIdle
              game="tinycity"
              icon={meta.icon}
              title={meta.title}
              hint="Build each island up to its target score. Neighbours change every building's score — houses love parks, hate factories."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={world.current.levels > 0 ? 'Thriving towns!' : 'Town complete'}
            subtitle={`Score ${hud.total} · reached level ${hud.level}`}
            celebrate={world.current.levels > 0}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
