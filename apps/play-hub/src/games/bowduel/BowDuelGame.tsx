import { useEffect, useRef, useState, type PointerEvent } from 'react'
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
import '../../shared/action/action.css'
import './bowduel.css'
import { LADDER, PLAYER_LOOK, hasSig, oppFor, type OppDef } from './rivals'
import { SKIES, drawArrow, drawAxe, drawFighter, drawRag, drawSpear, handPositions, shade, sr, stepRag, type Look, type Rag, type Weapon } from './art'

const meta = getGame('bowduel')

type Phase = 'idle' | 'play' | 'reward' | 'dying' | 'over'
type Sub = 'intro' | 'aim' | 'enemy' | 'fly' | 'after' | 'ko'
type Zone = 'head' | 'body' | 'legs'

type Fighter = {
  x: number
  y: number
  dir: 1 | -1
  hp: number
  maxHp: number
  shownHp: number
  look: Look
  weapon: Weapon
  aimA: number
  draw: number
  lean: number
  leanV: number
  flinch: number
  stuck: Array<{ lx: number; ly: number; a: number; w: Weapon }>
  rag: Rag | null
  headArmor: number
  dmgMul: number
}

type Proj = { x: number; y: number; vx: number; vy: number; w: Weapon; owner: 0 | 1; t: number; rot: number; done: boolean; dmgMul: number; windK: number; rolled?: boolean }
type Stuck = { x: number; y: number; a: number; w: Weapon; life: number }


const WEAPONS: Record<Weapon, { name: string; speed: number; grav: number; dmg: number; wind: number; spin: number; head: number }> = {
  bow: { name: 'Bow', speed: 900, grav: 1, dmg: 20, wind: 1, spin: 0, head: 2 },
  axe: { name: 'Throwing Axe', speed: 800, grav: 1.05, dmg: 32, wind: 0.45, spin: 15, head: 2 },
  spear: { name: 'Javelin', speed: 990, grav: 0.85, dmg: 25, wind: 0.6, spin: 0, head: 2.4 },
}

type PerkId = 'axe' | 'spear' | 'sharp' | 'hide' | 'eagle' | 'hunter' | 'leech' | 'steady' | 'double' | 'heal'
type Perk = { id: PerkId; label: string; desc: string; max: number; weapon?: boolean }
const PERKS: Perk[] = [
  { id: 'axe', label: 'Throwing Axe', desc: 'Heavy spinning hits, barely cares about wind', max: 1, weapon: true },
  { id: 'spear', label: 'Javelin', desc: 'Fast and flat, brutal headshots', max: 1, weapon: true },
  { id: 'sharp', label: 'Sharp Tips', desc: '+20% damage on every hit', max: 3 },
  { id: 'hide', label: 'Thick Hide', desc: '+25 max HP and heal 25', max: 3 },
  { id: 'eagle', label: 'Eagle Eye', desc: 'Longer aim guide', max: 2 },
  { id: 'hunter', label: 'Head Hunter', desc: 'Headshots deal +25% more', max: 2 },
  { id: 'leech', label: 'Life Steal', desc: 'Heal 25% of the damage you deal', max: 2 },
  { id: 'steady', label: 'Steady Hands', desc: 'Wind pushes your shots 40% less', max: 1 },
  { id: 'double', label: 'Double Shot', desc: 'Every throw fires a second projectile', max: 1 },
  { id: 'heal', label: 'Field Rations', desc: 'Heal 50 HP right now', max: 99 },
]

const VW = 400
const GRAV = 900
const HIT_SUB = 4
const BASE_K = 0.85

type Game = {
  duel: number
  opp: OppDef
  player: Fighter
  enemy: Fighter
  terrain: Float32Array
  tx0: number
  tstep: number
  tseed: number
  sky: number
  wind: number
  turn: 0 | 1
  sub: Sub
  subT: number
  projs: Proj[]
  ground: Stuck[]
  camX: number
  aiShots: number
  aiPlan: { a: number; p: number }
  planned: boolean
  trail: Array<[number, number]>
  lastTrail: Array<[number, number]>
  score: number
  streak: number
  owned: Weapon[]
  perks: Partial<Record<PerkId, number>>
  streaks: Array<{ x: number; y: number; len: number; sp: number }>
  lastMilestone: number
  /** Per-duel star tracking. */
  myShots: number
  hitsTaken: number
  dodgedLast: boolean
  stats: { wins: number; headshots: number; bosses: number; damage: number }
}

function makeFighter(x: number, dir: 1 | -1, look: Look, weapon: Weapon, hp: number): Fighter {
  return { x, y: 0, dir, hp, maxHp: hp, shownHp: hp, look, weapon, aimA: -0.5, draw: 0, lean: 0, leanV: 0, flinch: 0, stuck: [], rag: null, headArmor: 1, dmgMul: 1 }
}

function freshGame(): Game {
  const opp = oppFor(1)
  return {
    duel: 0,
    opp,
    player: makeFighter(0, 1, PLAYER_LOOK, 'bow', 100),
    enemy: makeFighter(500, -1, opp.look, opp.weapon, opp.hp),
    terrain: new Float32Array(1),
    tx0: 0,
    tstep: 8,
    tseed: 1,
    sky: 0,
    wind: 0,
    turn: 0,
    sub: 'intro',
    subT: 0,
    projs: [],
    ground: [],
    camX: 0,
    aiShots: 0,
    aiPlan: { a: -0.6, p: 0.7 },
    planned: false,
    trail: [],
    lastTrail: [],
    score: 0,
    streak: 0,
    owned: ['bow'],
    perks: {},
    streaks: Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random() * 0.55, len: rand(20, 60), sp: rand(0.6, 1.4) })),
    lastMilestone: 0,
    myShots: 0,
    hitsTaken: 0,
    dodgedLast: false,
    stats: { wins: 0, headshots: 0, bosses: 0, damage: 0 },
  }
}

function gauss() {
  return (Math.random() + Math.random() + Math.random() - 1.5) * 1.15
}

function WeaponIcon({ w }: { w: Weapon | PerkId }) {
  if (w === 'bow')
    return (
      <svg viewBox="0 0 40 40">
        <path d="M12 4 Q34 20 12 36" fill="none" stroke="#b45309" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M12 4 L12 36" stroke="#f8fafc" strokeWidth="1.2" />
        <path d="M6 20 H34 M34 20 l-5 -3 M34 20 l-5 3" stroke="#e2e8f0" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  if (w === 'axe')
    return (
      <svg viewBox="0 0 40 40">
        <path d="M10 34 L28 8" stroke="#92400e" strokeWidth="4" strokeLinecap="round" />
        <path d="M22 10 Q24 2 34 3 Q37 12 30 20 Q27 14 22 10 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
      </svg>
    )
  if (w === 'spear')
    return (
      <svg viewBox="0 0 40 40">
        <path d="M6 34 L28 12" stroke="#92400e" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M27 13 Q30 4 36 4 Q36 10 27 13 Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.2" />
        <path d="M26 14 l-6 1 l5 -6 Z" fill="#dc2626" />
      </svg>
    )
  const color: Record<string, string> = { sharp: '#f87171', hide: '#4ade80', eagle: '#38bdf8', hunter: '#facc15', leech: '#f472b6', steady: '#a5b4fc', double: '#fb923c', heal: '#86efac' }
  return (
    <svg viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill={color[w] ?? '#fff'} opacity="0.25" />
      <circle cx="20" cy="20" r="16" fill="none" stroke={color[w] ?? '#fff'} strokeWidth="2.5" />
      {w === 'hide' || w === 'heal' ? <path d="M20 11 V29 M11 20 H29" stroke={color[w]} strokeWidth="5" strokeLinecap="round" /> : null}
      {w === 'sharp' ? <path d="M12 28 L28 12 M28 12 l-8 1 M28 12 l-1 8" stroke={color[w]} strokeWidth="3" strokeLinecap="round" /> : null}
      {w === 'eagle' ? <path d="M8 20 Q20 8 32 20 Q20 32 8 20 Z M20 16 a4 4 0 1 0 0.01 0" fill="none" stroke={color[w]} strokeWidth="2.6" /> : null}
      {w === 'hunter' ? <path d="M20 8 V14 M20 26 V32 M8 20 H14 M26 20 H32 M20 15 a5 5 0 1 0 0.01 0" fill="none" stroke={color[w]} strokeWidth="2.6" strokeLinecap="round" /> : null}
      {w === 'leech' ? <path d="M20 30 C10 22 10 14 15 12 C18 11 20 14 20 15 C20 14 22 11 25 12 C30 14 30 22 20 30 Z" fill={color[w]} /> : null}
      {w === 'steady' ? <path d="M9 15 H24 Q30 15 28 10 M9 21 H29 M9 27 H22 Q28 27 26 32" fill="none" stroke={color[w]} strokeWidth="2.6" strokeLinecap="round" /> : null}
      {w === 'double' ? <path d="M9 16 H29 l-4 -3 M9 25 H29 l-4 3" fill="none" stroke={color[w]} strokeWidth="2.6" strokeLinecap="round" /> : null}
    </svg>
  )
}

export default function BowDuelGame() {
  const run = useActionRun('bowduel')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const G = useRef<Game>(freshGame())
  const phaseRef = useRef<Phase>('idle')
  const size = useRef({ w: 360, h: 560 })
  const dragRef = useRef<{ id: number; sx: number; sy: number } | null>(null)
  const devAuto = useRef(false)
  const devSpeed = useRef(1)
  const devErr = useRef(0.6)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    // Test hook for headless bots: autopilot (aim error configurable), fast-forward, state readout.
    const hook = {
      auto: (on: boolean) => (devAuto.current = on),
      err: (e: number) => (devErr.current = e),
      speed: (n: number) => (devSpeed.current = Math.max(1, Math.min(8, Math.round(n)))),
      state: () => {
        const g = G.current
        return { phase: phaseRef.current, stage: g.duel, opp: g.opp.name, php: Math.ceil(g.player.hp), ehp: Math.ceil(g.enemy.hp), sky: g.sky }
      },
      perk: () => (document.querySelector('.bd-pick__card') as HTMLButtonElement | null)?.click(),
    }
    ;(window as unknown as { __lv6bowduel?: typeof hook }).__lv6bowduel = hook
  }, [])

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, duel: 1, php: 100, pmax: 100, ehp: 60, emax: 60, ename: 'Robin', weapon: 'bow' as Weapon, owned: ['bow'] as Weapon[], aim: false, wins: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [picks, setPicks] = useState<Perk[]>([])

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function pushHud() {
    const g = G.current
    setHud({
      score: g.score,
      duel: g.duel,
      php: Math.ceil(g.player.hp),
      pmax: g.player.maxHp,
      ehp: Math.ceil(g.enemy.hp),
      emax: g.enemy.maxHp,
      ename: `${g.opp.name} ${g.opp.title}`,
      weapon: g.player.weapon,
      owned: g.owned.slice(),
      aim: g.sub === 'aim' && g.turn === 0,
      wins: g.stats.wins,
    })
  }

  // ── Terrain ────────────────────────────────────────────

  function terrainY(x: number) {
    const g = G.current
    const f = (x - g.tx0) / g.tstep
    const i = clamp(Math.floor(f), 0, g.terrain.length - 2)
    const k = clamp(f - i, 0, 1)
    return g.terrain[i] * (1 - k) + g.terrain[i + 1] * k
  }

  function genTerrain(D: number) {
    const g = G.current
    g.tx0 = -520
    g.tstep = 8
    const n = Math.ceil((D + 1040) / g.tstep) + 1
    const h = new Float32Array(n)
    const p1 = rand(0, 6)
    const p2 = rand(0, 6)
    const p3 = rand(0, 6)
    const hill = Math.min(170, 20 + g.duel * 14) * rand(0.5, 1)
    const raw = (x: number) => {
      const m = (x - D / 2) / (D * 0.26)
      return -50 - Math.sin(x * 0.006 + p1) * 42 - Math.sin(x * 0.017 + p2) * 16 - Math.sin(x * 0.05 + p3) * 4 - hill * Math.exp(-m * m)
    }
    const h0 = raw(0)
    const h1 = raw(D)
    for (let i = 0; i < n; i++) {
      const x = g.tx0 + i * g.tstep
      let y = raw(x)
      for (const [c, hc] of [[0, h0], [D, h1]] as const) {
        const d = Math.abs(x - c)
        if (d < 80) {
          const k = d < 26 ? 1 : 1 - (d - 26) / 54
          const sm = k * k * (3 - 2 * k)
          y = y * (1 - sm) + hc * sm
        }
      }
      h[i] = y
    }
    g.terrain = h
    g.tseed = Math.random() * 100
  }

  // ── Duel lifecycle ─────────────────────────────────────

  function setupDuel(duel: number, idle: boolean) {
    const g = G.current
    g.duel = duel
    const opp = idle ? oppFor(1 + Math.floor(Math.random() * 9)) : oppFor(duel)
    g.opp = opp
    const D = Math.round(420 + Math.min(320, duel * 24) + rand(-30, 40))
    genTerrain(D)
    const p = g.player
    p.x = 0
    p.y = terrainY(0)
    p.dir = 1
    p.stuck = []
    p.rag = null
    p.lean = 0
    p.leanV = 0
    p.flinch = 0
    p.aimA = -0.5
    p.draw = 0
    if (idle) {
      p.hp = p.maxHp
      p.weapon = (['bow', 'spear', 'axe'] as Weapon[])[Math.floor(Math.random() * 3)]
    }
    const e = makeFighter(D, -1, opp.look, opp.weapon, opp.hp)
    e.y = terrainY(D)
    e.headArmor = opp.armor ?? 1
    e.dmgMul = (0.78 + Math.min(0.22, (duel - 1) * 0.05)) * (1 + Math.floor((duel - 1) / LADDER.length) * 0.15)
    g.enemy = e
    g.sky = idle ? Math.floor(Math.random() * SKIES.length) : opp.sky % SKIES.length
    g.myShots = 0
    g.hitsTaken = 0
    g.dodgedLast = false
    g.projs = []
    g.ground = []
    g.trail = []
    g.lastTrail = []
    g.aiShots = 0
    g.turn = 0
    g.sub = 'intro'
    g.subT = 0
    g.camX = D - VW * 0.7
    newWind()
    if (!idle) {
      setBanner({ key: Date.now(), text: opp.boss ? `👑 ${opp.name.toUpperCase()}` : `LEVEL ${duel} · ${opp.name.toUpperCase()}`, sub: `${opp.title} · “${opp.taunt}”` })
      if (opp.boss) sfx.boom(0.4)
      else sfx.ready()
      if (duel % 5 === 1 && duel > 1) milestone('duel', duel - 1)
    }
    pushHud()
  }

  function newWind() {
    const g = G.current
    const maxW = Math.min(150, 25 + g.duel * 12)
    g.wind = Math.round(rand(-maxW, maxW))
    // Gust callers whip up a headwind against your shots every other turn.
    if (hasSig(g.opp, 'gust') && phaseRef.current === 'play' && Math.random() < 0.6) {
      g.wind = -Math.round(rand(0.55, 0.9) * Math.max(110, maxW))
      fx.text(size.current.w / 2, size.current.h * 0.3, 'GUST!', '#bae6fd', 22)
    }
  }

  function milestone(kind: string, value: number) {
    const g = G.current
    const now = performance.now()
    if (now - g.lastMilestone < 30000) return
    g.lastMilestone = now
    void trackEvent('action_milestone', { game_id: 'bowduel', kind, value })
  }

  function start(level: number = run.nextLevel) {
    void unlockAudio()
    const g = freshGame()
    // Each duel is a level: the map replays beaten rivals, Play continues at the next one.
    const first = Math.max(1, typeof level === 'number' && level > 0 ? Math.floor(level) : run.nextLevel)
    const hp = 100 + run.level('hp') * 15
    g.player.hp = hp
    g.player.maxHp = hp
    g.player.shownHp = hp
    g.player.dmgMul = 1 + run.level('dmg') * 0.08
    G.current = g
    dragRef.current = null
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    setupDuel(first, false)
  }

  function die() {
    const g = G.current
    setPhaseBoth('dying')
    fx.flash('#ef4444', 0.3)
    fx.slowmo(1.2, 0.3)
    sfx.lose()
    haptic.error()
    setBanner({ key: Date.now(), text: 'DEFEATED', sub: `by ${g.opp.name}` })
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(g.stats.wins * 4 + g.stats.headshots * 1 + g.stats.damage / 120)
      run.end({ score: g.score, cleared: g.stats.wins >= 3, stats: { ...g.stats }, coins }, revive)
    }, 1500)
  }

  function revive() {
    const g = G.current
    const p = g.player
    p.rag = null
    p.hp = Math.max(p.hp, Math.round(p.maxHp * 0.6))
    p.shownHp = p.hp
    p.stuck = []
    p.lean = 0
    p.leanV = 0
    p.flinch = 0
    g.projs = []
    g.aiShots = 0
    g.turn = 0
    g.sub = 'aim'
    g.subT = 0
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: 'your shot' })
    fx.ring(size.current.w * 0.3, size.current.h * 0.6, { color: '#86efac', maxR: 80, life: 0.6 })
    pushHud()
    setPhaseBoth('play')
  }

  function offerRewards() {
    const g = G.current
    const pool = PERKS.filter((p) => {
      const lvl = g.perks[p.id] ?? 0
      if (lvl >= p.max) return false
      if (p.id === 'heal') return g.player.hp < g.player.maxHp * 0.7
      return true
    })
    const out: Perk[] = []
    // A new weapon shows up early so the arsenal grows during the run.
    const weapon = pool.filter((p) => p.weapon)
    if (weapon.length && (g.stats.wins === 1 || g.stats.wins === 3)) out.push(weapon[Math.floor(Math.random() * weapon.length)])
    while (out.length < 3 && out.length < pool.length) {
      const c = pool[Math.floor(Math.random() * pool.length)]
      if (!out.includes(c)) out.push(c)
    }
    setPicks(out)
    setPhaseBoth('reward')
  }

  function choose(p: Perk) {
    const g = G.current
    g.perks[p.id] = (g.perks[p.id] ?? 0) + 1
    const pl = g.player
    if (p.id === 'axe' || p.id === 'spear') {
      g.owned.push(p.id)
      pl.weapon = p.id
    } else if (p.id === 'hide') {
      pl.maxHp += 25
      pl.hp = Math.min(pl.maxHp, pl.hp + 25)
    } else if (p.id === 'heal') pl.hp = Math.min(pl.maxHp, pl.hp + 50)
    else if (p.id === 'sharp') pl.dmgMul += 0.2
    sfx.power()
    haptic.success()
    setPicks([])
    setPhaseBoth('play')
    setupDuel(g.duel + 1, false)
  }

  // ── Shooting ───────────────────────────────────────────

  function launchPoint(f: Fighter, aimA: number) {
    const h = handPositions(aimA, 1, f.weapon)
    const s = f.look.size
    return { x: f.x + h.fx * s * f.dir, y: f.y + h.fy * s }
  }

  function fire(f: Fighter, owner: 0 | 1, aimA: number, power: number) {
    const g = G.current
    const w = WEAPONS[f.weapon]
    const speed = w.speed * (0.22 + 0.78 * power)
    const lp = launchPoint(f, aimA)
    const steady = owner === 0 && g.perks.steady ? 0.6 : 1
    const dmgMul = f.dmgMul
    const double = owner === 0 ? !!g.perks.double : !!g.opp.double && phaseRef.current !== 'idle'
    const triple = owner === 1 && hasSig(g.opp, 'triple') && phaseRef.current !== 'idle'
    const shots = triple ? [-0.06, 0, 0.06] : double ? [0, 0.07] : [0]
    if (owner === 0 && phaseRef.current === 'play') g.myShots += 1
    for (const da of shots) {
      const a = aimA + da
      g.projs.push({
        x: lp.x,
        y: lp.y,
        vx: Math.cos(a) * speed * f.dir * (da ? 0.96 : 1),
        vy: Math.sin(a) * speed * (da ? 0.96 : 1),
        w: f.weapon,
        owner,
        t: 0,
        rot: 0,
        done: false,
        dmgMul,
        windK: w.wind * steady,
      })
    }
    f.draw = 0
    g.planned = false
    if (owner === 0) {
      if (g.trail.length) g.lastTrail = g.trail
      g.trail = []
    }
    g.sub = 'fly'
    g.subT = 0
    if (phaseRef.current !== 'idle') {
      sfx.whoosh()
      if (f.weapon === 'bow') sfx.flip()
      haptic.light()
    }
  }

  /** Best launch for the AI: search angles, binary-search power with wind + terrain. */
  function solveAim(f: Fighter, target: Fighter, head: boolean): { a: number; p: number } {
    const g = G.current
    const w = WEAPONS[f.weapon]
    const tx = target.x
    const ty = target.y - (head ? 64 : 36) * target.look.size
    const sim = (a: number, p: number) => {
      const lp = launchPoint(f, a)
      const sp = w.speed * (0.22 + 0.78 * p)
      let x = lp.x
      let y = lp.y
      let vx = Math.cos(a) * sp * f.dir
      let vy = Math.sin(a) * sp
      const h = 1 / 60
      for (let i = 0; i < 400; i++) {
        vy += GRAV * w.grav * h
        vx += g.wind * w.wind * h
        const nx = x + vx * h
        const ny = y + vy * h
        if ((nx - tx) * f.dir >= 0 && (x - tx) * f.dir < 0) {
          const k = (tx - x) / (nx - x)
          return y + (ny - y) * k - ty
        }
        x = nx
        y = ny
        if (y > terrainY(x) + 2) return 2000 - Math.abs(x - tx)
      }
      return 2000
    }
    let best = { a: -0.7, p: 0.8, miss: Infinity }
    for (let deg = 12; deg <= 74; deg += 4) {
      const a = (-deg * Math.PI) / 180
      let lo = 0.12
      let hi = 1
      if (sim(a, hi) > 0) continue
      for (let it = 0; it < 16; it++) {
        const mid = (lo + hi) / 2
        if (sim(a, mid) > 0) lo = mid
        else hi = mid
      }
      const p = (lo + hi) / 2
      const miss = Math.abs(sim(a, p))
      const score = miss + Math.abs(deg - 38) * 0.15
      if (score < best.miss) best = { a, p, miss: score }
    }
    return { a: best.a, p: best.p }
  }

  /** Rivals zero in: the first shots of a duel are clearly short or long, then they tighten up. */
  function planAi(f: Fighter, target: Fighter, err: number, head: boolean, shot: number) {
    const g = G.current
    const sol = solveAim(f, target, head)
    const ladder = [0.16, 0.075]
    const sign = Math.random() < 0.5 ? -1 : 1
    const pe = shot < ladder.length ? sign * ladder[shot] * err * rand(0.85, 1.2) : gauss() * 0.075 * err
    g.aiPlan = { a: clamp(sol.a + gauss() * 0.02 * err, -1.45, 0.2), p: clamp(sol.p * (1 + pe), 0.15, 1) }
  }

  // ── Hits ───────────────────────────────────────────────

  function toLocal(f: Fighter, x: number, y: number) {
    const dx = (x - f.x) * f.dir
    const dy = y - f.y
    const c = Math.cos(f.lean)
    const s = Math.sin(f.lean)
    return { lx: (dx * c - dy * s) / f.look.size, ly: (dx * s + dy * c) / f.look.size }
  }

  function toWorld(f: Fighter, lx: number, ly: number) {
    const x = lx * f.look.size
    const y = ly * f.look.size
    const c = Math.cos(-f.lean)
    const s = Math.sin(-f.lean)
    return { x: f.x + (x * c - y * s) * f.dir, y: f.y + x * s + y * c }
  }

  function hitTest(f: Fighter, x: number, y: number, m: number): { zone: Zone; lx: number; ly: number } | null {
    const { lx, ly } = toLocal(f, x, y)
    if ((lx - 1) ** 2 + (ly + 66) ** 2 < (14.5 + m) ** 2) return { zone: 'head', lx, ly }
    if (lx > -12 - m && lx < 12 + m && ly > -54 - m && ly < -22) return { zone: 'body', lx, ly }
    if (lx > -12 - m && lx < 12 + m && ly >= -22 && ly < 2) return { zone: 'legs', lx, ly }
    return null
  }

  function onHit(p: Proj, f: Fighter, zone: Zone, lx: number, ly: number) {
    const g = G.current
    const W = size.current.w
    const H = size.current.h
    const w = WEAPONS[p.w]
    const byPlayer = p.owner === 0
    const idle = phaseRef.current === 'idle'
    let mult = zone === 'head' ? w.head * f.headArmor : zone === 'body' ? 1 : 0.7
    if (zone === 'head' && byPlayer) mult *= 1 + (g.perks.hunter ?? 0) * 0.25
    const dmg = Math.max(1, Math.round(w.dmg * mult * p.dmgMul * rand(0.92, 1.08)))
    f.hp = Math.max(0, f.hp - dmg)
    f.flinch = 0.7
    const k = zone === 'head' ? 7 : zone === 'body' ? 5 : 3.5
    f.leanV += -Math.sign(p.vx || 1) * f.dir * k
    const a = (f.dir === 1 ? p.rot : Math.PI - p.rot) + f.lean
    f.stuck.push({ lx, ly, a, w: p.w })
    if (f.stuck.length > 9) f.stuck.shift()
    p.done = true
    const sx = (p.x - g.camX) * (W / VW)
    const sy = H * BASE_K + p.y * (W / VW)
    fx.burst(sx, sy, { count: zone === 'head' ? 26 : 16, color: ['#fde047', '#ffffff', '#fb923c'], speed: 260, shape: 'spark', size: 2.5 })
    fx.burst(sx, sy, { count: 8, color: ['#ef4444', '#b91c1c'], speed: 150, size: 3, gravity: 600 })
    fx.ring(sx, sy, { color: zone === 'head' ? '#fde047' : '#ffffff', maxR: zone === 'head' ? 50 : 30, life: 0.3 })
    fx.text(sx, sy - 24, `-${dmg}`, byPlayer ? '#fde047' : '#fca5a5', zone === 'head' ? 24 : 18)
    if (!idle) {
      sfx.hit()
      if (zone === 'head') {
        fx.text(sx, sy - 52, 'HEADSHOT!', '#fde047', 24)
        sfx.combo()
        fx.stop(0.12)
        fx.slowmo(0.6, 0.3)
        fx.shake(9, 0.3)
      } else {
        fx.stop(0.06)
        fx.shake(5, 0.2)
      }
      if (!byPlayer) g.hitsTaken += 1
      if (byPlayer) {
        haptic.medium()
        g.streak += 1
        g.stats.damage += dmg
        g.score += dmg * 10 + (zone === 'head' ? 150 : 0) + (g.streak > 1 ? g.streak * 25 : 0)
        if (zone === 'head') g.stats.headshots += 1
        if (g.streak >= 2) fx.text(sx, sy - 76, `STREAK x${g.streak}`, '#86efac', 18)
        const leech = g.perks.leech ?? 0
        if (leech) g.player.hp = Math.min(g.player.maxHp, g.player.hp + dmg * 0.25 * leech)
        run.update({ ...g.stats })
      } else {
        haptic.heavy()
        fx.flash('#ef4444', 0.2)
      }
    }
    if (f.hp <= 0) ko(f, p, zone)
    pushHud()
  }

  function ko(f: Fighter, p: Proj, zone: Zone) {
    const g = G.current
    const h = handPositions(f.aimA, f.draw, f.weapon)
    const local: Array<[number, number]> = [[1, -66], [0, -52], [0, -24], [h.fx, h.fy], [h.bx, h.by], [8, -1], [-7, -1]]
    const vx = (p.vx * 0.22) / 60
    const vy = (p.vy * 0.22 - 160) / 60
    f.rag = {
      t: 0,
      dt0: 1 / 60,
      pts: local.map(([lx, ly], i) => {
        const wpt = toWorld(f, lx, ly)
        const boost = (zone === 'head' && i <= 1) || (zone === 'body' && (i === 1 || i === 2)) || (zone === 'legs' && i >= 5) ? 1.6 : 0.7
        return { x: wpt.x, y: wpt.y, px: wpt.x - vx * boost, py: wpt.y - vy * boost }
      }),
    }
    g.projs = g.projs.filter((o) => o === p || o.done)
    g.sub = 'ko'
    g.subT = 0
    if (phaseRef.current === 'idle') return
    fx.slowmo(1.1, 0.3)
    sfx.boom(0.5)
    if (f === g.enemy) {
      sfx.win()
      haptic.success()
      // Stars: win = 1, took at most one hit = +1, won with 4 shots or fewer = +1.
      const stars = 1 + (g.hitsTaken <= 1 ? 1 : 0) + (g.myShots <= 4 ? 1 : 0)
      run.completeLevel(g.duel, stars)
      setBanner({ key: Date.now(), text: g.opp.boss ? 'CHAMPION DOWN!' : 'VICTORY!', sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  +${500 * g.duel}` })
    } else die()
  }

  // ── Update ─────────────────────────────────────────────

  function updateFighter(f: Fighter, dt: number) {
    // Spring-damped lean for hit reactions
    f.leanV += (-f.lean * 60 - f.leanV * 9) * dt
    f.lean = clamp(f.lean + f.leanV * dt, -0.9, 0.9)
    f.flinch = Math.max(0, f.flinch - dt)
    f.shownHp = approach(f.shownHp, f.hp, 3, dt)
    if (f.rag) stepRag(f.rag, Math.min(dt, 1 / 30), terrainY)
  }

  function update(dt: number, raw: number) {
    const g = G.current
    const ph = phaseRef.current
    const W = size.current.w
    updateFighter(g.player, dt)
    updateFighter(g.enemy, dt)
    for (const st of g.ground) st.life -= dt
    if (g.ground.length > 14) g.ground.shift()
    g.ground = g.ground.filter((st) => st.life > 0)

    // Camera
    let target = g.camX
    const pv = g.player.x - VW * 0.3
    const ev = g.enemy.x - VW * 0.7
    if (g.sub === 'aim' || (g.sub === 'intro' && g.subT > 0.9)) target = pv
    else if (g.sub === 'enemy' || g.sub === 'intro') target = ev
    else if (g.sub === 'fly') {
      const pr = g.projs.find((o) => !o.done)
      if (pr) target = clamp(pr.x - VW * 0.5, Math.min(pv, ev) - 120, Math.max(pv, ev) + 120)
    } else if (g.sub === 'ko') {
      const rag = g.player.rag ?? g.enemy.rag
      if (rag) target = rag.pts[2].x - VW * 0.5
    }
    g.camX = approach(g.camX, target, g.sub === 'fly' ? 7 : 4.2, raw)

    if (ph === 'over' || ph === 'reward') return
    g.subT += dt

    switch (g.sub) {
      case 'intro':
        if (g.subT > 1.3) {
          g.sub = 'aim'
          g.subT = 0
          pushHud()
        }
        break
      case 'aim':
        if (ph === 'idle') aiTurn(g.player, g.enemy, 0, 1.3)
        else if (import.meta.env.DEV && devAuto.current) aiTurn(g.player, g.enemy, 0, devErr.current)
        else if (!dragRef.current) {
          g.player.draw = approach(g.player.draw, 0, 6, dt)
        }
        break
      case 'enemy':
        aiTurn(g.enemy, g.player, 1, g.opp.err)
        break
      case 'fly':
        stepProjectiles(dt, W)
        if (g.sub === 'fly' && g.projs.every((o) => o.done)) {
          g.sub = 'after'
          g.subT = 0
        }
        break
      case 'after':
        if (g.subT > 0.7) {
          if (g.turn === 0) {
            g.turn = 1
            g.sub = 'enemy'
            // Regenerating rivals patch themselves up before shooting back.
            if (hasSig(g.opp, 'regen') && ph === 'play' && g.enemy.hp > 0 && g.enemy.hp < g.enemy.maxHp) {
              const heal = Math.round(g.enemy.maxHp * 0.05)
              g.enemy.hp = Math.min(g.enemy.maxHp, g.enemy.hp + heal)
              fx.text((g.enemy.x - g.camX) * (W / VW), size.current.h * 0.35, `+${heal}`, '#86efac', 20)
              sfx.power()
            }
          } else {
            g.turn = 0
            g.sub = 'aim'
            newWind()
          }
          g.subT = 0
          pushHud()
        }
        break
      case 'ko':
        if (g.subT > 2.3) {
          if (ph === 'idle') setupDuel(1, true)
          else if (g.enemy.rag) {
            g.stats.wins += 1
            g.score += 500 * g.duel
            if (g.opp.boss) {
              g.stats.bosses += 1
              milestone('boss', g.duel)
            }
            g.player.hp = Math.min(g.player.maxHp, g.player.hp + 30)
            run.update({ ...g.stats })
            pushHud()
            offerRewards()
          }
        }
        break
    }
  }

  function aiTurn(f: Fighter, target: Fighter, owner: 0 | 1, err: number) {
    const g = G.current
    if (!g.planned) {
      g.planned = true
      planAi(f, target, err, owner === 1 && !!g.opp.aimHead, owner === 1 ? g.aiShots : 1)
    }
    const t = g.subT
    if (t < 0.55) f.aimA = approach(f.aimA, g.aiPlan.a, 5, 1 / 60)
    else if (t < 1.35) {
      f.aimA = approach(f.aimA, g.aiPlan.a, 10, 1 / 60)
      const nd = Math.min(g.aiPlan.p, (t - 0.55) / 0.8)
      if (phaseRef.current !== 'idle' && Math.floor(nd * 6) !== Math.floor(f.draw * 6)) sfx.tick()
      f.draw = nd
    } else {
      f.aimA = g.aiPlan.a
      fire(f, owner, g.aiPlan.a, g.aiPlan.p)
      if (owner === 1) {
        g.aiShots += 1
      }
    }
  }

  function stepProjectiles(dt: number, W: number) {
    const g = G.current
    const H = size.current.h
    const s = W / VW
    const h = dt / HIT_SUB
    for (const p of g.projs) {
      if (p.done) continue
      const w = WEAPONS[p.w]
      const target = p.owner === 0 ? g.enemy : g.player
      for (let k = 0; k < HIT_SUB && !p.done; k++) {
        p.vy += GRAV * w.grav * h
        p.vx += g.wind * p.windK * h
        p.x += p.vx * h
        p.y += p.vy * h
        p.t += h
        p.rot = p.w === 'axe' ? p.rot + w.spin * h * Math.sign(p.vx) : Math.atan2(p.vy, p.vx)
        // Nimble rivals may sidestep an incoming shot (never twice in a row).
        if (p.owner === 0 && !p.rolled && !target.rag && Math.abs(p.x - target.x) < 70 && hasSig(g.opp, 'dodge') && phaseRef.current === 'play') {
          p.rolled = true
          if (!g.dodgedLast && Math.random() < 0.4) {
            g.dodgedLast = true
            target.x += 26
            target.y = terrainY(target.x)
            target.leanV += 5
            fx.text((target.x - g.camX) * s, H * BASE_K + (target.y - 90) * s, 'DODGE!', '#e9d5ff', 18)
            sfx.whoosh()
          } else g.dodgedLast = false
        }
        if (!target.rag) {
          const hit = hitTest(target, p.x, p.y, p.w === 'axe' ? 7 : 1)
          if (hit) {
            onHit(p, target, hit.zone, hit.lx, hit.ly)
            break
          }
        }
        const ty = terrainY(p.x)
        if (p.y > ty) {
          p.done = true
          g.ground.push({ x: p.x, y: ty + 4, a: p.rot, w: p.w, life: 14 })
          const sx = (p.x - g.camX) * s
          const sy = H * BASE_K + ty * s
          fx.burst(sx, sy, { count: 10, color: [SKIES[g.sky].ground, SKIES[g.sky].grass, '#d6d3d1'], speed: 140, angle: -Math.PI / 2, spread: 1.6, size: 3, gravity: 500 })
          if (phaseRef.current !== 'idle') {
            sfx.thud()
            if (p.owner === 0) {
              g.streak = 0
              const miss = Math.abs(p.x - target.x)
              if (miss < 40) fx.text(sx, sy - 30, 'SO CLOSE!', '#fde68a', 16)
            }
          }
        } else if (p.x < g.tx0 + 10 || p.x > g.tx0 + g.terrain.length * g.tstep - 10 || p.y > 500 || p.t > 7) p.done = true
      }
      if (p.owner === 0 && !p.done) g.trail.push([p.x, p.y])
    }
  }

  // ── Input ──────────────────────────────────────────────

  function aimFromDrag(px: number, py: number) {
    const g = G.current
    const d = dragRef.current
    if (!d) return
    const dx = d.sx - px
    const dy = d.sy - py
    const len = Math.hypot(dx, dy)
    const pl = g.player
    pl.draw = clamp(len / 130, 0, 1)
    if (len > 6) pl.aimA = clamp(Math.atan2(dy, Math.max(0.0001, dx)), -1.5, 0.4)
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const g = G.current
    if (g.sub === 'intro') {
      g.sub = 'aim'
      g.subT = 0
      pushHud()
    }
    if (g.sub !== 'aim' || g.turn !== 0) return
    const p = localPoint(e, e.currentTarget)
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { id: e.pointerId, sx: p.x, sy: p.y }
    sfx.tap()
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    const p = localPoint(e, e.currentTarget)
    const before = Math.floor(G.current.player.draw * 8)
    aimFromDrag(p.x, p.y)
    if (Math.floor(G.current.player.draw * 8) !== before) sfx.tick()
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    const d = dragRef.current
    if (!d || d.id !== e.pointerId) return
    dragRef.current = null
    const g = G.current
    if (g.sub !== 'aim' || phaseRef.current !== 'play') return
    if (g.player.draw < 0.1) {
      g.player.draw = 0
      return
    }
    fire(g.player, 0, g.player.aimA, g.player.draw)
    pushHud()
  }

  function selectWeapon(w: Weapon) {
    const g = G.current
    if (g.sub !== 'aim' || !g.owned.includes(w)) return
    g.player.weapon = w
    sfx.flip()
    pushHud()
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      const g = G.current
      if (phaseRef.current !== 'play' || g.sub !== 'aim') return
      const pl = g.player
      if (e.key === 'ArrowUp') pl.aimA = clamp(pl.aimA - 0.03, -1.5, 0.4)
      else if (e.key === 'ArrowDown') pl.aimA = clamp(pl.aimA + 0.03, -1.5, 0.4)
      else if (e.key === 'ArrowRight') pl.draw = clamp(pl.draw + 0.03, 0, 1)
      else if (e.key === 'ArrowLeft') pl.draw = clamp(pl.draw - 0.03, 0, 1)
      else if (e.key === ' ' && pl.draw >= 0.1) {
        e.preventDefault()
        fire(pl, 0, pl.aimA, pl.draw)
      } else return
      e.preventDefault()
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  // ── Render ─────────────────────────────────────────────

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const g = G.current
    const ph = phaseRef.current
    if (ph === 'idle' && g.terrain.length < 2) setupDuel(1 + Math.floor(Math.random() * 4), true)
    const reps = import.meta.env.DEV ? devSpeed.current : 1
    for (let i = 0; i < reps; i++) update(fx.step(raw), raw)

    const s = W / VW
    const base = H * BASE_K
    const X = (x: number) => (x - g.camX) * s
    const Y = (y: number) => base + y * s
    const sky = SKIES[g.sky]

    // Sky + parallax
    const sg = ctx.createLinearGradient(0, 0, 0, base)
    sg.addColorStop(0, sky.top)
    sg.addColorStop(1, sky.bot)
    ctx.fillStyle = sg
    ctx.fillRect(0, 0, W, H)
    if (sky.night) {
      ctx.fillStyle = '#fff'
      for (let i = 0; i < 50; i++) {
        ctx.globalAlpha = 0.3 + sr(4, i) * 0.6
        ctx.fillRect(((sr(6, i) * W * 2 - g.camX * 0.05 * s) % W + W) % W, sr(8, i) * base * 0.6, 1.6, 1.6)
      }
      ctx.globalAlpha = 1
    }
    const sunX = W * 0.75 - g.camX * 0.03 * s
    ctx.fillStyle = sky.sun
    ctx.globalAlpha = 0.25
    ctx.beginPath()
    ctx.arc(sunX, base * 0.22, 46, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.beginPath()
    ctx.arc(sunX, base * 0.22, 22, 0, Math.PI * 2)
    ctx.fill()
    for (const [k, color, amp, off] of [[0.15, sky.far, 90, 150], [0.4, sky.mid, 50, 70]] as const) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(0, H)
      for (let sx = 0; sx <= W + 10; sx += 10) {
        const wx = sx / s + g.camX * k
        ctx.lineTo(sx, base - (off + Math.sin(wx * 0.011 + g.tseed) * amp * 0.5 + Math.sin(wx * 0.027 + k * 9) * amp * 0.25) * s)
      }
      ctx.lineTo(W, H)
      ctx.closePath()
      ctx.fill()
    }
    // Wind streaks
    if (Math.abs(g.wind) > 8) {
      ctx.strokeStyle = sky.night ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.45)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (const st of g.streaks) {
        st.x = (((st.x + (g.wind / 400) * st.sp * raw) % 1) + 1) % 1
        const x = st.x * (W + 120) - 60
        const y = 60 + st.y * base
        ctx.moveTo(x, y)
        ctx.lineTo(x - Math.sign(g.wind) * st.len * Math.min(1, Math.abs(g.wind) / 80), y)
      }
      ctx.stroke()
    }

    fx.applyShake(ctx)

    // Terrain
    const tg = ctx.createLinearGradient(0, base - 160 * s, 0, H)
    tg.addColorStop(0, sky.ground)
    tg.addColorStop(1, sky.dirt)
    ctx.fillStyle = tg
    ctx.beginPath()
    ctx.moveTo(0, H)
    for (let sx = -8; sx <= W + 8; sx += 6) ctx.lineTo(sx, Y(terrainY(g.camX + sx / s)))
    ctx.lineTo(W + 8, H)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = sky.grass
    ctx.lineWidth = 6 * s
    ctx.lineJoin = 'round'
    ctx.beginPath()
    for (let sx = -8; sx <= W + 8; sx += 6) {
      const y = Y(terrainY(g.camX + sx / s))
      if (sx === -8) ctx.moveTo(sx, y)
      else ctx.lineTo(sx, y)
    }
    ctx.stroke()
    // Decor: rocks + tufts, deterministic per world x
    const startI = Math.floor(g.camX / 37)
    for (let i = startI - 1; i < startI + W / s / 37 + 2; i++) {
      const wx = i * 37 + sr(g.tseed, i) * 20
      const r = sr(g.tseed + 1, i)
      const y = Y(terrainY(wx))
      const sx = X(wx)
      if (r < 0.18) {
        ctx.fillStyle = shade(sky.ground, 0.25)
        ctx.beginPath()
        ctx.ellipse(sx, y + 2 * s, 7 * s, 4.5 * s, 0, Math.PI, Math.PI * 2)
        ctx.fill()
      } else if (r < 0.6) {
        ctx.strokeStyle = shade(sky.grass === '#f1f5f9' ? '#94a3b8' : sky.grass, -0.2)
        ctx.lineWidth = 1.6 * s
        ctx.beginPath()
        for (let k = -1; k <= 1; k++) {
          ctx.moveTo(sx + k * 3 * s, y)
          ctx.lineTo(sx + k * 5 * s, y - (6 + Math.abs(k * 2)) * s)
        }
        ctx.stroke()
      } else if (r > 0.93 && Math.abs(wx) > 60 && Math.abs(wx - g.enemy.x) > 60) {
        // little pine
        ctx.fillStyle = '#4b2e14'
        ctx.fillRect(sx - 2 * s, y - 12 * s, 4 * s, 12 * s)
        ctx.fillStyle = shade(sky.mid, -0.25)
        for (let k = 0; k < 3; k++) {
          ctx.beginPath()
          ctx.moveTo(sx - (16 - k * 4) * s, y - (10 + k * 12) * s)
          ctx.lineTo(sx, y - (32 + k * 12) * s)
          ctx.lineTo(sx + (16 - k * 4) * s, y - (10 + k * 12) * s)
          ctx.fill()
        }
      }
    }

    // Projectiles stuck in the ground
    for (const st of g.ground) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, st.life)
      ctx.translate(X(st.x), Y(st.y))
      ctx.scale(s, s)
      ctx.rotate(st.a)
      if (st.w === 'axe') drawAxe(ctx)
      else if (st.w === 'spear') drawSpear(ctx)
      else drawArrow(ctx)
      ctx.restore()
    }

    // Previous shot ghost + aim guide
    const aiming = ph === 'play' && g.sub === 'aim' && g.turn === 0
    if (aiming && g.lastTrail.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.28)'
      for (let i = 0; i < g.lastTrail.length; i += 3) {
        const [x, y] = g.lastTrail[i]
        ctx.beginPath()
        ctx.arc(X(x), Y(y), 1.6 * s, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Fighters
    for (const f of [g.player, g.enemy]) {
      if (f.rag) {
        drawRag(ctx, f.rag, f.look, X, Y, s, t)
        continue
      }
      const mine = f === g.player ? 0 : 1
      const ready = !((g.sub === 'fly' || g.sub === 'after') && g.turn === mine)
      ctx.save()
      ctx.translate(X(f.x), Y(f.y))
      ctx.scale(s * f.dir * f.look.size, s * f.look.size)
      ctx.rotate(-f.lean)
      drawFighter(ctx, f.look, f.weapon, { aimA: f.aimA, draw: f.draw, lean: f.lean, flinch: f.flinch, blink: (t + f.x * 0.01) % 3.7 < 0.12, dead: false }, t, ready)
      for (const st of f.stuck) {
        ctx.save()
        ctx.translate(st.lx, st.ly)
        ctx.rotate(st.a)
        ctx.translate(st.w === 'spear' ? 16 : 9, 0)
        if (st.w === 'axe') {
          ctx.translate(-12, 0)
          drawAxe(ctx)
        } else if (st.w === 'spear') drawSpear(ctx)
        else drawArrow(ctx)
        ctx.restore()
      }
      ctx.restore()
    }

    // Projectiles in flight
    for (const p of g.projs) {
      if (p.done) continue
      ctx.save()
      ctx.translate(X(p.x), Y(p.y))
      ctx.scale(s, s)
      ctx.rotate(p.rot)
      if (p.w === 'axe') drawAxe(ctx)
      else if (p.w === 'spear') drawSpear(ctx)
      else drawArrow(ctx)
      ctx.restore()
    }

    if (aiming && g.player.draw >= 0.1) {
      const pl = g.player
      const w = WEAPONS[pl.weapon]
      const span = 0.17 + run.level('aim') * 0.07 + (g.perks.eagle ?? 0) * 0.08
      const lp = launchPoint(pl, pl.aimA)
      const sp = w.speed * (0.22 + 0.78 * pl.draw)
      let x = lp.x
      let y = lp.y
      let vx = Math.cos(pl.aimA) * sp
      let vy = Math.sin(pl.aimA) * sp
      const hh = 1 / 60
      const windK = w.wind * (g.perks.steady ? 0.6 : 1)
      for (let tt = 0, i = 0; tt < span; tt += hh, i++) {
        vy += GRAV * w.grav * hh
        vx += g.wind * windK * hh
        x += vx * hh
        y += vy * hh
        if (i % 2 === 0) {
          ctx.globalAlpha = 1 - tt / span
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(X(x), Y(y), 2.6 * s, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      // angle + power readout
      const deg = Math.round((-pl.aimA * 180) / Math.PI)
      const tx = X(pl.x) + 6
      const ty = Y(pl.y) - 112 * s
      ctx.font = "800 13px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(0,0,0,0.55)'
      const label = `${deg}°  ${Math.round(pl.draw * 100)}%`
      ctx.strokeText(label, tx, ty)
      ctx.fillStyle = pl.draw > 0.95 ? '#fde047' : '#ffffff'
      ctx.fillText(label, tx, ty)
    }

    fx.draw(ctx)
    ctx.restore()
    fx.drawOverlay(ctx, W, H)

    // Off-screen markers
    const pr = g.projs.find((o) => !o.done)
    if (pr && Y(pr.y) < 8) {
      const mx = clamp(X(pr.x), 16, W - 16)
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.beginPath()
      ctx.moveTo(mx, 76)
      ctx.lineTo(mx - 7, 88)
      ctx.lineTo(mx + 7, 88)
      ctx.fill()
    }
    if (ph !== 'idle' && g.sub === 'aim') {
      const ex = X(g.enemy.x)
      if (ex > W) {
        const dist = Math.round((g.enemy.x - g.player.x) / 10)
        const my = Y(g.enemy.y) - 40 * s
        ctx.fillStyle = 'rgba(15,23,42,0.6)'
        ctx.beginPath()
        ctx.roundRect(W - 62, my - 15, 56, 30, 10)
        ctx.fill()
        ctx.fillStyle = '#fca5a5'
        ctx.beginPath()
        ctx.moveTo(W - 4, my)
        ctx.lineTo(W - 12, my - 8)
        ctx.lineTo(W - 12, my + 8)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = "800 12px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'center'
        ctx.fillText(`${dist} m`, W - 36, my + 4)
      }
    }

    // Wind gauge
    if (ph !== 'idle') {
      const wx = W / 2
      const wy = 82
      ctx.fillStyle = 'rgba(15,23,42,0.45)'
      ctx.beginPath()
      ctx.roundRect(wx - 52, wy - 13, 104, 26, 13)
      ctx.fill()
      const k = clamp(g.wind / 150, -1, 1)
      ctx.strokeStyle = '#e0f2fe'
      ctx.fillStyle = '#e0f2fe'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      if (Math.abs(g.wind) > 4) {
        const len = 8 + Math.abs(k) * 30
        const dir = Math.sign(k)
        ctx.beginPath()
        ctx.moveTo(wx - dir * len, wy)
        ctx.lineTo(wx + dir * len, wy)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(wx + dir * (len + 6), wy)
        ctx.lineTo(wx + dir * len, wy - 5)
        ctx.lineTo(wx + dir * len, wy + 5)
        ctx.fill()
      }
      ctx.font = "800 10px 'Plus Jakarta Sans', system-ui, sans-serif"
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(Math.abs(g.wind) > 4 ? `WIND ${Math.round(Math.abs(g.wind) / 10)}` : 'CALM', wx, wy + 24)
    }
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="bd-hud">
              <div className="bd-side">
                <span className="bd-name">You · {hud.php}</span>
                <div className="bd-bar">
                  <i style={{ width: `${(100 * Math.max(0, hud.php)) / hud.pmax}%` }} />
                  <span style={{ width: `${(100 * Math.max(0, hud.php)) / hud.pmax}%` }} />
                </div>
              </div>
              <div className="bd-mid">
                <b>{hud.score}</b>
                <small>Level {hud.duel}</small>
              </div>
              <div className="bd-side is-right">
                <span className="bd-name">{hud.ename}</span>
                <div className="bd-bar">
                  <i style={{ width: `${(100 * Math.max(0, hud.ehp)) / hud.emax}%` }} />
                  <span style={{ width: `${(100 * Math.max(0, hud.ehp)) / hud.emax}%` }} />
                </div>
              </div>
            </div>
          )}
          {phase === 'play' && hud.aim && hud.owned.length > 1 ? (
            <div className="bd-weapons" onPointerDown={(e) => e.stopPropagation()}>
              {hud.owned.map((w) => (
                <button key={w} type="button" className={hud.weapon === w ? 'is-on' : ''} aria-label={WEAPONS[w].name} onClick={() => selectWeapon(w)}>
                  <WeaponIcon w={w} />
                </button>
              ))}
            </div>
          ) : null}
          {phase === 'reward' ? (
            <div className="bd-pick" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Victory!</h3>
              <p>Choose a reward · +30 HP healed</p>
              <div className="bd-pick__list">
                {picks.map((p) => (
                  <button key={p.id} type="button" className={`bd-pick__card${p.weapon ? ' is-weapon' : ''}`} onClick={() => choose(p)}>
                    <WeaponIcon w={p.id} />
                    <b>{p.label}</b>
                    <span>{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {banner && (phase === 'play' || phase === 'dying') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="bowduel"
              icon={meta.icon}
              title={meta.title}
              hint="Drag back to aim, release to shoot. Mind the wind — headshots hit twice as hard."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.wins >= 3 ? 'Legendary archer!' : 'Defeated!'}
            subtitle={`Score ${hud.score} · ${hud.wins} duel${hud.wins === 1 ? '' : 's'} won`}
            celebrate={hud.wins >= 3}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
