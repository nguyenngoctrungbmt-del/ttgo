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
import {
  drawAuroraLayer,
  drawBolt,
  drawBossBar,
  drawComet,
  drawCometWarn,
  drawFlag,
  drawGem,
  drawGoo,
  drawGooKing,
  drawStarAura,
  drawStormCloud,
  drawStormLayer,
  drawStrikeWarn,
  drawSuperStar,
} from './content'

const meta = getGame('bouncy')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type PType = 'normal' | 'moving' | 'breaking' | 'vanish'
type Item = 'spring' | 'tramp' | 'hat' | 'jet' | 'shield' | 'star' | null
type Theme = 'grass' | 'space' | 'storm' | 'ice'
// Clouds are screen-anchored (y = screen y); comets live in world space once they drop
type Hazard = { kind: 'cloud' | 'comet'; x: number; y: number; vy: number; tx: number; t: number; state: number; dead: boolean }
type Boss = { x: number; sy: number; hp: number; max: number; t: number; state: 'enter' | 'fight' | 'leave'; atk: number; windup: number; hit: number; lvl: number }
type Goo = { x: number; y: number; vy: number; dead: boolean }
type Gem = { x: number; y: number; taken: boolean }
type Plat = { x: number; y: number; w: number; type: PType; vx: number; item: Item; used: boolean; broken: boolean; fade: number; squash: number }
type MKind = 'blob' | 'flyer' | 'spiky'
type Monster = { x: number; y: number; kind: MKind; ph: number; vx: number; dead: boolean }
type Shot = { x: number; y: number; vx: number; vy: number; life: number }
type Piece = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number; w: number }
type Biome = { name: string; at: number; top: string; bot: string; sub?: string; amb?: 'storm' | 'aurora' }

const BIOMES: Biome[] = [
  { name: 'Sunny Meadow', at: 0, top: '#7dd3fc', bot: '#e0f2fe' },
  { name: 'Cloud Kingdom', at: 1000, top: '#60a5fa', bot: '#bfdbfe' },
  { name: 'Thunderstorm', at: 1500, top: '#1e293b', bot: '#64748b', sub: 'dodge the lightning', amb: 'storm' },
  { name: 'Sunset Heights', at: 2200, top: '#7c3aed', bot: '#fb923c' },
  { name: 'Aurora Skies', at: 3000, top: '#0b1d3a', bot: '#115e59', sub: 'icy platforms ahead', amb: 'aurora' },
  { name: 'Outer Space', at: 4500, top: '#020617', bot: '#1e1b4b' },
  { name: 'Deep Cosmos', at: 7000, top: '#000000', bot: '#3b0764' },
]
const STORM = BIOMES.findIndex((b) => b.amb === 'storm')
const AURORA = BIOMES.findIndex((b) => b.amb === 'aurora')

// When the new threats switch on (metres climbed)
const LIGHTNING_FROM = 1500
const LIGHTNING_TO = 4500
const COMET_FROM = 2400
const BOSS_FIRST = 1900
const BOSS_EVERY = 2600
const GEM_FROM = 500
const STAR_FROM = 1200

const G = 1500
const JUMP = 720
const PW = 64
const PH = 14
const PXM = 10

type World = {
  x: number
  y: number
  vx: number
  vy: number
  face: 1 | -1
  squash: number
  startY: number
  minY: number
  camTop: number
  plats: Plat[]
  monsters: Monster[]
  shots: Shot[]
  pieces: Piece[]
  genY: number
  fly: number
  flyKind: 'hat' | 'jet' | null
  shield: number
  inv: number
  biome: number
  nextMark: number
  nextMilestone: number
  demoT: number
  deadSpin: number
  t: number
  respawns: number
  stats: { height: number; stomps: number; kills: number; springs: number; powerups: number }
  hazards: Hazard[]
  hazT: number
  cometT: number
  boss: Boss | null
  bossN: number
  nextBoss: number
  goos: Goo[]
  gems: Gem[]
  gemCount: number
  bonus: number
  star: number
  seen: { lightning: boolean; comet: boolean }
}

function freshWorld(W: number, H: number): World {
  const y0 = H - 80
  return {
    x: W / 2,
    y: y0 - 30,
    vx: 0,
    vy: -JUMP,
    face: 1,
    squash: 0,
    startY: y0,
    minY: y0,
    camTop: 0,
    plats: [{ x: W / 2 - PW / 2, y: y0, w: PW, type: 'normal', vx: 0, item: null, used: false, broken: false, fade: 1, squash: 0 }],
    monsters: [],
    shots: [],
    pieces: [],
    genY: y0,
    fly: 0,
    flyKind: null,
    shield: 0,
    inv: 0,
    biome: 0,
    nextMark: 500,
    nextMilestone: 1000,
    demoT: 0,
    deadSpin: 0,
    t: 0,
    respawns: 2,
    stats: { height: 0, stomps: 0, kills: 0, springs: 0, powerups: 0 },
    hazards: [],
    hazT: 4,
    cometT: 5,
    boss: null,
    bossN: 0,
    nextBoss: BOSS_FIRST,
    goos: [],
    gems: [],
    gemCount: 0,
    bonus: 0,
    star: 0,
    seen: { lightning: false, comet: false },
  }
}

/** Weight 0..1 of biome `idx` at altitude hm, matching the sky blend. */
function biomeWeight(hm: number, idx: number) {
  if (idx < 0) return 0
  const b = BIOMES[idx]
  const prev = BIOMES[idx - 1]
  const next = BIOMES[idx + 1]
  const blend = (lo: Biome, hi: Biome) => clamp((hm - lo.at) / (hi.at - lo.at) * 2.5 - 1.5, 0, 1)
  if (hm < b.at) return prev ? blend(prev, b) : 0
  return next ? 1 - blend(b, next) : 1
}

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k
}

function mix(a: string, b: string, k: number) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const r = Math.round(lerp((pa >> 16) & 255, (pb >> 16) & 255, k))
  const g = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, k))
  const bl = Math.round(lerp(pa & 255, pb & 255, k))
  return `rgb(${r},${g},${bl})`
}

// ── Art ────────────────────────────────────────────────────

function drawHero(ctx: CanvasRenderingContext2D, t: number, face: number, squash: number, vy: number, fly: 'hat' | 'jet' | null) {
  const stretch = clamp(-vy / 2400, -0.12, 0.18)
  const sx = 1 + squash * 0.3 - stretch * 0.5
  const sy = 1 - squash * 0.3 + stretch
  ctx.save()
  ctx.scale(face, 1)
  if (fly === 'jet') {
    ctx.fillStyle = '#64748b'
    ctx.beginPath()
    ctx.roundRect(-20, -8, 9, 20, 3)
    ctx.fill()
    const L = 16 + Math.random() * 10
    ctx.fillStyle = '#f97316'
    ctx.beginPath()
    ctx.moveTo(-20, 12)
    ctx.quadraticCurveTo(-15.5, 12 + L, -11, 12)
    ctx.fill()
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.moveTo(-18.5, 12)
    ctx.quadraticCurveTo(-15.5, 12 + L * 0.6, -12.5, 12)
    ctx.fill()
  }
  ctx.scale(sx, sy)
  // Feet
  ctx.fillStyle = '#ea580c'
  const kick = vy < 0 ? 2 : 0
  ctx.beginPath()
  ctx.ellipse(-6, 14 + kick, 5, 3, 0, 0, Math.PI * 2)
  ctx.ellipse(6, 14 - kick, 5, 3, 0, 0, Math.PI * 2)
  ctx.fill()
  // Body
  const g = ctx.createRadialGradient(-5, -7, 2, 0, 0, 18)
  g.addColorStop(0, '#fef08a')
  g.addColorStop(0.6, '#facc15')
  g.addColorStop(1, '#ea8a0c')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, 0, 15, 15, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#b45309'
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Wing
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.ellipse(-9, 3, 5, 7, 0.5 + Math.sin(t * 20) * (vy < 0 ? 0.4 : 0.1), 0, Math.PI * 2)
  ctx.fill()
  // Eye
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.ellipse(5, -4, 5.5, 6.5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#1e293b'
  const look = clamp(vy / 900, -1, 1) * 2
  ctx.beginPath()
  ctx.arc(6.5, -4 + look, 2.8, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(7.5, -5.5 + look, 1, 0, Math.PI * 2)
  ctx.fill()
  // Beak + blush
  ctx.fillStyle = '#f97316'
  ctx.beginPath()
  ctx.moveTo(13, 1)
  ctx.lineTo(20, 3)
  ctx.lineTo(13, 6)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(244,114,182,0.55)'
  ctx.beginPath()
  ctx.ellipse(3, 6, 3, 2, 0, 0, Math.PI * 2)
  ctx.fill()
  // Tuft
  ctx.strokeStyle = '#ea8a0c'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(-1, -14)
  ctx.quadraticCurveTo(-3, -21, 2, -22)
  ctx.stroke()
  if (fly === 'hat') {
    ctx.fillStyle = '#2563eb'
    ctx.beginPath()
    ctx.ellipse(0, -13, 10, 5, 0, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(-10, -14, 20, 2.5)
    ctx.fillStyle = '#334155'
    ctx.fillRect(-1, -22, 2, 6)
    const bl = Math.cos(t * 50) * 14
    ctx.strokeStyle = '#facc15'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-bl, -22)
    ctx.lineTo(bl, -22)
    ctx.stroke()
  }
  ctx.restore()
}

const PLAT_COLS: Record<Theme, [string, string, string]> = {
  grass: ['#92400e', '#22c55e', '#86efac'],
  space: ['#475569', '#94a3b8', '#e2e8f0'],
  storm: ['#334155', '#94a3b8', '#f1f5f9'],
  ice: ['#155e75', '#a5f3fc', '#f0fdfa'],
}

function drawPlat(ctx: CanvasRenderingContext2D, p: Plat, y: number, t: number, theme: Theme) {
  const x = p.x
  const sq = p.squash * 4
  ctx.save()
  ctx.globalAlpha = p.fade
  if (p.type === 'normal') {
    const [base, top, hi] = PLAT_COLS[theme]
    if (theme === 'ice') {
      // Icicles
      ctx.fillStyle = '#cffafe'
      ctx.beginPath()
      for (let i = 8; i < p.w - 6; i += 12) {
        ctx.moveTo(x + i - 3, y + PH + sq)
        ctx.lineTo(x + i, y + PH + 7 + ((i * 7) % 5) + sq)
        ctx.lineTo(x + i + 3, y + PH + sq)
      }
      ctx.fill()
    }
    ctx.fillStyle = base
    ctx.beginPath()
    ctx.roundRect(x, y + 3 + sq, p.w, PH - 1, 6)
    ctx.fill()
    ctx.fillStyle = top
    ctx.beginPath()
    ctx.roundRect(x - 1, y + sq, p.w + 2, 8, 5)
    ctx.fill()
    ctx.fillStyle = hi
    ctx.fillRect(x + 6, y + 1 + sq, p.w - 12, 2)
    if (theme === 'storm') {
      // Rain puddle glint
      ctx.fillStyle = 'rgba(191,219,254,0.7)'
      ctx.beginPath()
      ctx.ellipse(x + p.w * 0.35, y + 4 + sq, 6, 1.5, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (p.type === 'moving') {
    ctx.fillStyle = '#1d4ed8'
    ctx.beginPath()
    ctx.roundRect(x, y + sq, p.w, PH, 7)
    ctx.fill()
    ctx.fillStyle = '#60a5fa'
    ctx.beginPath()
    ctx.roundRect(x + 2, y + sq, p.w - 4, 6, 4)
    ctx.fill()
    ctx.fillStyle = '#bfdbfe'
    for (const s of [8, p.w - 12]) {
      ctx.beginPath()
      ctx.moveTo(x + s, y + 7 + sq)
      ctx.lineTo(x + s + 4 * (s < 20 ? -1 : 1) + (s < 20 ? 4 : 0), y + 10 + sq)
      ctx.lineTo(x + s, y + 13 + sq)
      ctx.fill()
    }
  } else if (p.type === 'breaking') {
    ctx.fillStyle = '#a16207'
    ctx.beginPath()
    ctx.roundRect(x, y, p.w, PH, 4)
    ctx.fill()
    ctx.strokeStyle = '#422006'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x + p.w * 0.3, y)
    ctx.lineTo(x + p.w * 0.38, y + 7)
    ctx.lineTo(x + p.w * 0.32, y + PH)
    ctx.moveTo(x + p.w * 0.68, y)
    ctx.lineTo(x + p.w * 0.6, y + 8)
    ctx.lineTo(x + p.w * 0.7, y + PH)
    ctx.stroke()
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.strokeStyle = '#cbd5e1'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(x, y + sq, p.w, PH, 7)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = 'rgba(148,163,184,0.5)'
    ctx.beginPath()
    ctx.arc(x + p.w / 2, y + 7 + sq, 3 + Math.sin(t * 6) * 1, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawItem(ctx: CanvasRenderingContext2D, p: Plat, y: number, t: number) {
  const cx = p.x + p.w / 2
  if (p.item === 'spring') {
    const h = p.used ? 22 : 12
    ctx.strokeStyle = '#94a3b8'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let i = 0; i <= 4; i++) {
      const yy = y - (i / 4) * h
      ctx.lineTo(cx + (i % 2 ? 6 : -6), yy)
    }
    ctx.stroke()
    ctx.fillStyle = '#ef4444'
    ctx.beginPath()
    ctx.roundRect(cx - 9, y - h - 4, 18, 5, 2)
    ctx.fill()
  } else if (p.item === 'tramp') {
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(p.x + 6, y)
    ctx.lineTo(p.x + 10, y - 10)
    ctx.moveTo(p.x + p.w - 6, y)
    ctx.lineTo(p.x + p.w - 10, y - 10)
    ctx.stroke()
    ctx.strokeStyle = '#ec4899'
    ctx.lineWidth = 5
    ctx.beginPath()
    ctx.moveTo(p.x + 6, y - 10)
    ctx.quadraticCurveTo(cx, y - 10 + (p.used ? 8 : 2), p.x + p.w - 6, y - 10)
    ctx.stroke()
  } else if (p.item === 'star') {
    const by = y - 18 + Math.sin(t * 4 + p.x) * 3
    glow(ctx, cx, by, 26, '#fde047', 0.6)
    drawSuperStar(ctx, cx, by, t)
  } else if (p.item) {
    const by = y - 16 + Math.sin(t * 4 + p.x) * 3
    const col = p.item === 'hat' ? '#facc15' : p.item === 'jet' ? '#f97316' : '#38bdf8'
    glow(ctx, cx, by, 22, col, 0.5)
    ctx.save()
    ctx.translate(cx, by)
    if (p.item === 'hat') {
      ctx.fillStyle = '#2563eb'
      ctx.beginPath()
      ctx.ellipse(0, 3, 10, 6, 0, Math.PI, 0)
      ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(-10, 2, 20, 2.5)
      ctx.fillStyle = '#334155'
      ctx.fillRect(-1, -8, 2, 6)
      const bl = Math.cos(t * 30) * 11
      ctx.strokeStyle = '#facc15'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(-bl, -8)
      ctx.lineTo(bl, -8)
      ctx.stroke()
    } else if (p.item === 'jet') {
      const g = ctx.createLinearGradient(-8, 0, 8, 0)
      g.addColorStop(0, '#475569')
      g.addColorStop(0.5, '#e2e8f0')
      g.addColorStop(1, '#475569')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.roundRect(-9, -9, 8, 17, 3)
      ctx.roundRect(1, -9, 8, 17, 3)
      ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(-9, -3, 18, 3)
      ctx.fillStyle = '#fb923c'
      ctx.beginPath()
      ctx.moveTo(-8, 8)
      ctx.lineTo(-5, 13 + Math.random() * 3)
      ctx.lineTo(-2, 8)
      ctx.moveTo(2, 8)
      ctx.lineTo(5, 13 + Math.random() * 3)
      ctx.lineTo(8, 8)
      ctx.fill()
    } else {
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2.5
      ctx.fillStyle = 'rgba(56,189,248,0.25)'
      ctx.beginPath()
      ctx.arc(0, 0, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.ellipse(-4, -4, 3, 1.6, -0.7, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

function drawMonster(ctx: CanvasRenderingContext2D, m: Monster, y: number, t: number) {
  ctx.save()
  ctx.translate(m.x, y)
  if (m.kind === 'blob') {
    const wob = Math.sin(m.ph * 4) * 1.5
    const g = ctx.createRadialGradient(-5, -6, 2, 0, 0, 20)
    g.addColorStop(0, '#d8b4fe')
    g.addColorStop(1, '#7e22ce')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.moveTo(-17, 10)
    ctx.quadraticCurveTo(-19 - wob, -16, 0, -16)
    ctx.quadraticCurveTo(19 + wob, -16, 17, 10)
    for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(17 - i * 8.5 - 4, 15, 17 - (i + 1) * 8.5, 10)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(0, -4, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1e1b4b'
    ctx.beginPath()
    ctx.arc(Math.sin(t * 2) * 2, -3, 3.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.moveTo(-7, 5)
    ctx.lineTo(-4, 9)
    ctx.lineTo(-1, 5)
    ctx.lineTo(2, 9)
    ctx.lineTo(5, 5)
    ctx.closePath()
    ctx.fill()
  } else if (m.kind === 'flyer') {
    const f = Math.sin(m.ph * 16)
    ctx.fillStyle = '#b91c1c'
    for (const s of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(s * 6, -2)
      ctx.quadraticCurveTo(s * 18, -14 * f - 4, s * 24, -4 * f)
      ctx.quadraticCurveTo(s * 16, 2, s * 6, 4)
      ctx.fill()
    }
    const g = ctx.createRadialGradient(-3, -4, 1, 0, 0, 12)
    g.addColorStop(0, '#fca5a5')
    g.addColorStop(1, '#dc2626')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(-4, -2, 3.5, 0, Math.PI * 2)
    ctx.arc(4, -2, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(-3.5 + Math.sign(m.vx), -1.5, 1.8, 0, Math.PI * 2)
    ctx.arc(4.5 + Math.sign(m.vx), -1.5, 1.8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#7f1d1d'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-6, -7)
    ctx.lineTo(-1, -5)
    ctx.moveTo(6, -7)
    ctx.lineTo(1, -5)
    ctx.stroke()
  } else {
    ctx.rotate(m.ph * 1.5)
    ctx.fillStyle = '#450a0a'
    ctx.beginPath()
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2
      const r = i % 2 ? 12 : 19
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.rotate(-m.ph * 1.5)
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.arc(0, 0, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.moveTo(-7, -4)
    ctx.lineTo(-1, -1)
    ctx.lineTo(-7, 1)
    ctx.moveTo(7, -4)
    ctx.lineTo(1, -1)
    ctx.lineTo(7, 1)
    ctx.fill()
  }
  ctx.restore()
}

export default function BouncyGame() {
  const run = useActionRun('bouncy')
  const best = useProgressStore((s) => s.games.bouncy?.bestScore ?? 0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 600 })
  const world = useRef<World>(freshWorld(360, 600))
  const phaseRef = useRef<Phase>('idle')
  const bestRef = useRef(best)
  bestRef.current = best
  const pointer = useRef<{ id: number | null; x: number; y: number; t: number; sx: number; sy: number; moved: boolean }>({ id: null, x: 0, y: 0, t: 0, sx: 0, sy: 0, moved: false })
  const keys = useRef({ l: false, r: false })
  const hudT = useRef(0)
  const dbg = useRef({ god: false })
  const amb = useRef({ flash: 0, boltX: 100, next: 3 })

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ height: 0, kills: 0, fly: 0, shield: 0, gems: 0, star: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }
  function say(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }
  function height() {
    const w = world.current
    return Math.max(0, Math.floor((w.startY - w.minY) / PXM))
  }
  function pushHud() {
    const w = world.current
    setHud({ height: height(), kills: w.stats.kills, fly: Math.ceil(w.fly), shield: w.shield, gems: w.gemCount, star: Math.ceil(w.star) })
  }

  function start() {
    void unlockAudio()
    const { w: W, h: H } = size.current
    const w = freshWorld(W, H)
    w.shield = run.level('shield')
    const boost = run.level('boost')
    if (boost > 0) {
      w.fly = 1.5 + boost
      w.flyKind = 'jet'
    }
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    say(BIOMES[0].name.toUpperCase(), boost > 0 ? 'rocket start!' : 'drag to steer')
    sfx.ready()
    pushHud()
  }

  function finishRun() {
    const w = world.current
    setPhaseBoth('over')
    const h = height()
    const coins = Math.round(h / 60 + w.stats.kills + w.stats.powerups + w.gemCount / 3 + w.bonus)
    run.end({ score: h, cleared: h >= 1000, stats: { ...w.stats, height: h }, coins }, revive)
  }

  function die(fall: boolean) {
    const w = world.current
    setPhaseBoth('dying')
    const sy = w.y - w.camTop
    if (!fall) {
      w.vy = -300
      fx.burst(w.x, sy, { count: 22, color: ['#facc15', '#fff', '#f97316'], speed: 280, shape: 'spark' })
      fx.stop(0.12)
      fx.shake(12, 0.4)
      sfx.hurt()
    } else {
      sfx.miss()
    }
    fx.flash('#ef4444', 0.3)
    sfx.lose()
    haptic.error()
    run.update({ ...w.stats, height: height() })
    window.setTimeout(finishRun, fall ? 700 : 1200)
  }

  function revive() {
    const w = world.current
    const H = size.current.h
    w.monsters = w.monsters.filter((m) => m.y < w.camTop - 40)
    w.hazards = []
    w.goos = []
    w.hazT = Math.max(w.hazT, 5)
    w.cometT = Math.max(w.cometT, 5)
    if (w.boss) {
      w.boss.atk = Math.max(w.boss.atk, 3)
      w.boss.windup = 0
    }
    w.y = w.camTop + H * 0.6
    w.vy = -200
    w.fly = 2
    w.flyKind = 'hat'
    w.inv = 3
    w.shield = Math.max(w.shield, 1)
    fx.ring(w.x, w.y - w.camTop, { color: '#7dd3fc', maxR: 90, life: 0.6 })
    say('REVIVED!', 'propeller up')
    setPhaseBoth('play')
    pushHud()
  }

  function genRow() {
    const w = world.current
    const W = size.current.w
    const hpx = w.startY - w.genY
    const diff = clamp(hpx / 45000, 0, 1)
    const luck = 1 + run.level('luck') * 0.2
    const early = hpx < 2600
    const gap = early ? rand(42, 56) : clamp(lerp(52, 138, diff) * rand(0.8, 1.12), 40, 150)
    const y = w.genY - gap
    let type: PType = 'normal'
    const r = Math.random()
    if (hpx > 2500 && r < 0.12 + 0.2 * diff) type = 'moving'
    else if (hpx > 9000 && r < 0.12 + 0.2 * diff + 0.1 + 0.08 * diff) type = 'vanish'
    const pw = early ? PW + 30 : type === 'moving' ? PW - 6 : PW - Math.round(diff * 10)
    const x = rand(4, W - pw - 4)
    let item: Item = null
    const ir = Math.random()
    if (type !== 'vanish') {
      if (ir < 0.07 * luck) item = 'spring'
      else if (hpx > 3000 && ir < 0.07 * luck + 0.02 * luck) item = 'tramp'
      else if (hpx > 1500 && ir < 0.09 * luck + 0.022 * luck) {
        const opts: Item[] = ['hat', 'shield', 'hat']
        if (hpx > 6000) opts.push('jet')
        if (hpx > STAR_FROM * PXM) opts.push('star')
        item = opts[Math.floor(Math.random() * opts.length)]
      }
    }
    // Gem trails (a small arc of 3, or a single gem)
    if (hpx > GEM_FROM * PXM && Math.random() < 0.16) {
      const n = Math.random() < 0.4 ? 3 : 1
      const gx = clamp(rand(30, W - 30), 40, W - 40)
      for (let i = 0; i < n; i++) w.gems.push({ x: gx + (i - (n - 1) / 2) * 22, y: y - gap * 0.5 - (n > 1 && i === 1 ? 10 : 0), taken: false })
    }
    w.plats.push({ x, y, w: pw, type, vx: type === 'moving' ? (Math.random() < 0.5 ? -1 : 1) * (40 + 90 * diff) : 0, item, used: false, broken: false, fade: 1, squash: 0 })
    // Decoy breaking platform
    if (hpx > 1800 && Math.random() < 0.12 + 0.15 * diff) {
      const bx = rand(4, W - PW - 4)
      if (Math.abs(bx - x) > PW) w.plats.push({ x: bx, y: y + gap * 0.5, w: PW, type: 'breaking', vx: 0, item: null, used: false, broken: false, fade: 1, squash: 0 })
    }
    // Monsters
    if (hpx > 2500 && !w.boss && Math.random() < 0.035 + 0.08 * diff) {
      const kinds: MKind[] = ['blob', 'blob']
      if (hpx > 6000) kinds.push('flyer', 'flyer')
      if (hpx > 12000) kinds.push('spiky')
      const kind = kinds[Math.floor(Math.random() * kinds.length)]
      let mx = rand(30, W - 30)
      // Keep monsters away from the platform directly beneath their row
      if (Math.abs(mx - (x + pw / 2)) < 50) mx = (mx + W / 2) % W
      w.monsters.push({ x: clamp(mx, 30, W - 30), y: y - gap * 0.55, kind, ph: rand(0, 6), vx: kind === 'flyer' ? (Math.random() < 0.5 ? -1 : 1) * (60 + 60 * diff) : 0, dead: false })
    }
    w.genY = y
  }

  function shoot(tx: number, ty: number) {
    const w = world.current
    if (phaseRef.current !== 'play') return
    const sy = w.y - w.camTop
    let dx = tx - w.x
    let dy = ty - sy
    if (dy > -20) dy = -60
    const d = Math.hypot(dx, dy) || 1
    dx /= d
    dy /= d
    w.shots.push({ x: w.x, y: w.y - 8, vx: dx * 900, vy: dy * 900, life: 0.9 })
    sfx.shoot()
  }

  function onDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    pointer.current = { id: e.pointerId, x: p.x, y: p.y, t: performance.now(), sx: p.x, sy: p.y, moved: false }
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    const pt = pointer.current
    if (pt.id !== e.pointerId) return
    const p = localPoint(e, e.currentTarget)
    pt.x = p.x
    pt.y = p.y
    if (Math.hypot(p.x - pt.sx, p.y - pt.sy) > 12) pt.moved = true
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    const pt = pointer.current
    if (pt.id !== e.pointerId) return
    if (!pt.moved && performance.now() - pt.t < 220) shoot(pt.x, pt.y)
    pt.id = null
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.l = true
      if (e.key === 'ArrowRight' || e.key === 'd') keys.current.r = true
      if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault()
        const w = world.current
        if (!e.repeat) shoot(w.x, w.y - w.camTop - 200)
      }
    }
    function up(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.current.l = false
      if (e.key === 'ArrowRight' || e.key === 'd') keys.current.r = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  function bounce(p: Plat | null, mult: number) {
    const w = world.current
    w.vy = -JUMP * mult * (w.star > 0 ? 1.2 : 1)
    w.squash = 1
    if (p) p.squash = 1
  }

  function step(dt: number, W: number, H: number) {
    const w = world.current
    const ph = phaseRef.current
    const playing = ph === 'play'
    if (playing) w.t += dt
    const demo = ph === 'idle'

    // Steering
    let ax = 0
    const pt = pointer.current
    if (playing && pt.id != null && (pt.moved || performance.now() - pt.t > 160)) {
      let dx = pt.x - w.x
      if (dx > W / 2) dx -= W
      if (dx < -W / 2) dx += W
      w.vx = clamp(dx * 9, -560, 560)
    } else if (playing && (keys.current.l || keys.current.r)) {
      ax = keys.current.l ? -1 : 1
      w.vx = clamp(w.vx + ax * 2400 * dt, -460, 460)
    } else if (demo) {
      const target = w.plats.find((p) => p.y < w.y - 20 && p.y > w.y - 200 && !p.broken)
      if (target) w.vx = clamp((target.x + target.w / 2 - w.x) * 4, -300, 300)
    } else {
      w.vx *= Math.exp(-6 * dt)
    }
    if (Math.abs(w.vx) > 20) w.face = w.vx > 0 ? 1 : -1
    w.x += w.vx * dt
    if (w.x < -16) w.x += W + 32
    if (w.x > W + 16) w.x -= W + 32

    // Vertical
    const prevY = w.y
    if (w.fly > 0 && (playing || demo)) {
      w.fly -= dt
      w.vy = w.flyKind === 'jet' ? -900 : -560
      if (Math.random() < 0.5) fx.burst(w.x - w.face * 15, w.y - w.camTop + 20, { count: 1, color: w.flyKind === 'jet' ? ['#fb923c', '#fde047', '#cbd5e1'] : ['#fff', '#e0f2fe'], speed: 80, angle: Math.PI / 2, spread: 0.8, size: 3, life: 0.4, gravity: 0 })
      if (w.fly <= 0) {
        w.fly = 0
        w.flyKind = null
        w.inv = Math.max(w.inv, 0.6)
        w.vy = -300
        pushHud()
      }
    } else {
      w.vy += G * dt
      w.vy = Math.min(w.vy, 1100)
    }
    w.y += w.vy * dt
    if (ph === 'dying' || ph === 'over') w.deadSpin += dt * 8
    w.squash = Math.max(0, w.squash - dt * 6)
    w.inv = Math.max(0, w.inv - dt)

    // Platforms
    for (const p of w.plats) {
      p.squash = Math.max(0, p.squash - dt * 6)
      if (p.type === 'moving') {
        p.x += p.vx * dt
        if (p.x < 2 || p.x + p.w > W - 2) {
          p.vx *= -1
          p.x = clamp(p.x, 2, W - p.w - 2)
        }
      }
      if (p.type === 'vanish' && p.used) p.fade = Math.max(0, p.fade - dt * 3)
      if (p.broken || p.fade <= 0) continue
      if ((playing || demo) && w.vy > 0 && w.fly <= 0) {
        const feet = w.y + 14
        const prevFeet = prevY + 14
        const top = p.item === 'tramp' ? p.y - 10 : p.y
        if (prevFeet <= top + 2 && feet >= top && w.x > p.x - 10 && w.x < p.x + p.w + 10) {
          if (p.type === 'breaking') {
            p.broken = true
            for (let i = 0; i < 2; i++) w.pieces.push({ x: p.x + i * p.w / 2, y: p.y, vx: (i ? 1 : -1) * 60, vy: 0, rot: 0, vr: (i ? 1 : -1) * 3, life: 1, w: p.w / 2 })
            if (playing) sfx.miss()
            continue
          }
          const sx = w.x
          const sy = p.y - w.camTop
          // Spring sits in the middle of the platform
          const onSpring = p.item === 'spring' && Math.abs(w.x - (p.x + p.w / 2)) < 16
          if (onSpring) {
            p.used = true
            bounce(p, 1.65)
            if (playing) {
              w.stats.springs += 1
              fx.burst(sx, sy - 12, { count: 10, color: ['#fca5a5', '#fff'], speed: 220, angle: -Math.PI / 2, spread: 1.2, shape: 'spark' })
              sfx.levelUp()
              haptic.medium()
              run.update(w.stats)
            }
          } else if (p.item === 'tramp') {
            p.used = true
            bounce(p, 2.2)
            if (playing) {
              w.stats.springs += 1
              fx.ring(sx, sy - 10, { color: '#f472b6', maxR: 50, life: 0.4, width: 4 })
              fx.text(sx, sy - 40, 'BOING!', '#f9a8d4', 18)
              sfx.combo()
              haptic.medium()
              run.update(w.stats)
            }
          } else {
            bounce(p, 1)
            if (playing) {
              fx.burst(sx, sy, { count: 5, color: p.type === 'normal' ? ['#86efac', '#fff'] : ['#bfdbfe', '#fff'], speed: 110, angle: -Math.PI / 2, spread: 2.4, size: 2.5, life: 0.3, gravity: 300 })
              sfx.tap()
            }
          }
          if (p.type === 'vanish') p.used = true
          break
        }
      }
    }

    // Items
    if (playing && w.fly <= 0) {
      for (const p of w.plats) {
        if (!p.item || p.item === 'spring' || p.item === 'tramp' || p.used || p.broken) continue
        const ix = p.x + p.w / 2
        const iy = p.y - 16
        if (Math.abs(ix - w.x) < 22 && Math.abs(iy - w.y) < 26) {
          p.used = true
          w.stats.powerups += 1
          const sy = iy - w.camTop
          if (p.item === 'shield') {
            w.shield = Math.min(3, w.shield + 1)
            say('SHIELD', 'blocks one hit')
          } else if (p.item === 'star') {
            w.star = 7
            say('SUPER STAR!', 'invincible · higher bounces')
            sfx.combo()
          } else {
            w.flyKind = p.item === 'jet' ? 'jet' : 'hat'
            w.fly = p.item === 'jet' ? 3.2 : 2.6
            say(p.item === 'jet' ? 'JETPACK!' : 'PROPELLER!')
          }
          p.item = null
          fx.ring(ix, sy, { color: '#fde047', maxR: 60, life: 0.45, width: 4 })
          fx.burst(ix, sy, { count: 18, color: ['#fde047', '#fff', '#7dd3fc'], speed: 240, shape: 'spark' })
          sfx.power()
          haptic.medium()
          run.update(w.stats)
          pushHud()
        }
      }
    }

    // Shots
    for (const s of w.shots) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.life -= dt
      for (const m of w.monsters) {
        if (m.dead) continue
        if (Math.hypot(m.x - s.x, m.y - s.y) < 20) {
          s.life = 0
          killMonster(m, false)
          break
        }
      }
    }
    w.shots = w.shots.filter((s) => s.life > 0)

    // Monsters
    for (const m of w.monsters) {
      m.ph += dt
      if (m.dead) {
        m.y += 500 * dt
        continue
      }
      if (m.kind === 'flyer') {
        m.x += m.vx * dt
        if (m.x < 24 || m.x > W - 24) m.vx *= -1
      }
      const my = m.y + (m.kind === 'blob' ? Math.sin(m.ph * 2) * 4 : m.kind === 'flyer' ? Math.sin(m.ph * 3) * 10 : 0)
      if (!playing) continue
      const dx = Math.abs(m.x - w.x)
      const dy = w.y - my
      if (dx < 24 && Math.abs(dy) < 26) {
        if (w.fly > 0 || w.inv > 0 || w.star > 0) {
          if (w.fly > 0 || w.star > 0) killMonster(m, false)
          continue
        }
        if (w.vy > 0 && dy < -10 && m.kind !== 'spiky') {
          killMonster(m, true)
          bounce(null, 1.15)
          continue
        }
        if (w.shield > 0) {
          w.shield -= 1
          w.inv = 1.2
          killMonster(m, false)
          fx.text(w.x, w.y - w.camTop - 30, 'SHIELD!', '#7dd3fc', 18)
          sfx.clang()
          pushHud()
          continue
        }
        if (dbg.current.god) continue
        die(false)
        return
      }
    }
    w.monsters = w.monsters.filter((m) => m.y < w.camTop + H + 80)

    if (stepContent(dt, W, H)) return

    // Breaking pieces
    for (const p of w.pieces) {
      p.vy += 1200 * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vr * dt
      p.life -= dt
    }
    w.pieces = w.pieces.filter((p) => p.life > 0)

    // Camera
    if (playing || demo) {
      const target = w.y - H * 0.42
      if (target < w.camTop) w.camTop = target
      if (w.y < w.minY) w.minY = w.y
    }
    // Generate & prune
    while (w.genY > w.camTop - 80) genRow()
    w.plats = w.plats.filter((p) => p.y < w.camTop + H + 40)

    // Fell off
    if (w.y - w.camTop > H + 30) {
      if (playing && ((w.t < 20 && w.respawns > 0) || dbg.current.god)) {
        // Opening safety net: pop back onto a fresh platform
        if (!dbg.current.god) w.respawns -= 1
        w.y = w.camTop + H * 0.6
        w.vy = -JUMP
        w.inv = 1
        w.plats.push({ x: clamp(w.x - PW, 4, W - PW * 2 - 4), y: w.y + 16, w: PW * 2, type: 'normal', vx: 0, item: null, used: false, broken: false, fade: 1, squash: 1 })
        fx.flash('#ffffff', 0.2)
        fx.ring(w.x, w.y - w.camTop, { color: '#fde047', maxR: 60, life: 0.45, width: 4 })
        fx.text(w.x, w.y - w.camTop - 34, 'SAVED!', '#fde047', 18)
        sfx.power()
        haptic.medium()
      } else if (playing) {
        die(true)
        return
      }
      if (demo) {
        world.current = freshWorld(W, H)
        return
      }
    }

    if (playing) {
      const h = height()
      if (h !== w.stats.height) {
        w.stats.height = h
        if (h % 20 === 0) run.update(w.stats)
      }
      const nb = BIOMES.findIndex((b, i) => h >= b.at && (i === BIOMES.length - 1 || h < BIOMES[i + 1].at))
      if (nb > w.biome) {
        w.biome = nb
        say(BIOMES[nb].name.toUpperCase(), BIOMES[nb].sub ?? `${BIOMES[nb].at} m`)
        sfx.levelUp()
        haptic.success()
        fx.flash('#ffffff', 0.25)
      } else if (h >= w.nextMark) {
        fx.text(W / 2, 90, `${w.nextMark} m`, '#fff', 22)
        sfx.tick()
      }
      if (h >= w.nextMark) w.nextMark += 500
      if (bestRef.current > 0 && h >= bestRef.current && h - 2 < bestRef.current) {
        say('NEW BEST!', `${h} m`)
        sfx.win()
      }
      if (h >= w.nextMilestone) {
        w.nextMilestone += 1000
        void trackEvent('action_milestone', { game_id: 'bouncy', kind: 'height', value: h })
      }
    }
  }

  // ── Later-run content: lightning clouds, comets, Goo King, gems, Super Star ──

  /** Hazard contact. Returns true when the run ended. */
  function hurt(x: number, sy: number): boolean {
    const w = world.current
    if (w.star > 0 || w.fly > 0 || w.inv > 0 || dbg.current.god) return false
    if (w.shield > 0) {
      w.shield -= 1
      w.inv = 1.2
      fx.ring(x, sy, { color: '#7dd3fc', maxR: 50, life: 0.4, width: 4 })
      fx.text(w.x, w.y - w.camTop - 30, 'SHIELD!', '#7dd3fc', 18)
      fx.shake(6, 0.2)
      sfx.clang()
      haptic.medium()
      pushHud()
      return false
    }
    die(false)
    return true
  }

  function warnBusy() {
    return world.current.hazards.some((z) => !z.dead && (z.kind === 'cloud' ? z.state < 3 : z.state === 0))
  }

  function spawnCloud(W: number) {
    const w = world.current
    const fromLeft = Math.random() < 0.5
    const tx = clamp(w.x + rand(-60, 60), 34, W - 34)
    w.hazards.push({ kind: 'cloud', x: fromLeft ? -60 : W + 60, y: 74, vy: 0, tx, t: 0, state: 0, dead: false })
    if (!w.seen.lightning) {
      w.seen.lightning = true
      say('LIGHTNING!', 'step out of the glow')
    }
    sfx.whoosh()
  }

  function spawnComet(W: number) {
    const w = world.current
    const x = Math.random() < 0.6 ? clamp(w.x + rand(-80, 80), 24, W - 24) : rand(24, W - 24)
    w.hazards.push({ kind: 'comet', x, y: 0, vy: 0, tx: x, t: 0, state: 0, dead: false })
    if (!w.seen.comet) {
      w.seen.comet = true
      say('COMETS!', 'dodge the red markers')
    }
    sfx.tick()
  }

  function spawnBoss() {
    const w = world.current
    const W = size.current.w
    const lvl = w.bossN
    const hp = 12 + lvl * 5
    w.boss = { x: W / 2, sy: -90, hp, max: hp, t: 0, state: 'enter', atk: 2.4, windup: 0, hit: 0, lvl }
    for (const z of w.hazards) if (z.kind === 'cloud' && z.state < 2) z.state = 3
    w.hazards = w.hazards.filter((z) => z.kind === 'cloud' || z.state > 0)
    say('GOO KING!', lvl ? `returns · level ${lvl + 1}` : 'tap to shoot him down')
    sfx.boom(0.9)
    window.setTimeout(() => sfx.clang(), 220)
    window.setTimeout(() => sfx.levelUp(), 460)
    fx.shake(8, 0.5)
    fx.flash('#f0abfc', 0.25)
    haptic.heavy()
  }

  function defeatBoss() {
    const w = world.current
    const b = w.boss
    if (!b) return
    const coins = 10 + b.lvl * 5
    w.boss = null
    w.bossN += 1
    w.nextBoss = height() + BOSS_EVERY
    w.bonus += coins
    w.gemCount += 10
    w.stats.kills += 1
    w.star = Math.max(w.star, 5)
    w.shield = Math.min(3, w.shield + 1)
    for (const g of w.goos) {
      g.dead = true
      fx.burst(g.x, g.y - w.camTop, { count: 6, color: ['#f0abfc', '#fff'], speed: 140, size: 3 })
    }
    fx.explode(b.x, b.sy, 2, ['#f0abfc', '#c026d3', '#facc15', '#fff'])
    fx.burst(b.x, b.sy, { count: 30, color: ['#67e8f9', '#cffafe', '#fde047'], speed: 360, size: 4, shape: 'spark', gravity: 400 })
    fx.ring(b.x, b.sy, { color: '#facc15', maxR: 120, life: 0.6, width: 6 })
    fx.slowmo(0.7, 0.3)
    fx.flash('#ffffff', 0.35)
    fx.shake(14, 0.6)
    say('KING DEFEATED!', `+${coins} coins · +10 gems · star`)
    sfx.boom(1)
    window.setTimeout(() => sfx.win(), 250)
    haptic.success()
    void trackEvent('action_milestone', { game_id: 'bouncy', kind: 'boss', value: w.bossN })
    run.update(w.stats)
    pushHud()
  }

  /** Updates hazards, boss, gems and Super Star. Returns true when the run ended. */
  function stepContent(dt: number, W: number, H: number): boolean {
    const w = world.current
    const playing = phaseRef.current === 'play'
    const cam = w.camTop
    const hsy = w.y - cam
    const h = height()

    // Super Star
    if (w.star > 0) {
      w.star = Math.max(0, w.star - dt)
      if (Math.random() < 0.6) fx.burst(w.x, hsy, { count: 1, color: ['#f87171', '#fbbf24', '#4ade80', '#38bdf8', '#c084fc'], speed: 60, size: 3, life: 0.5, gravity: 0 })
      if (w.star === 0) pushHud()
    }

    // Shots vs new targets
    for (const s of w.shots) {
      if (s.life <= 0) continue
      const ssy = s.y - cam
      for (const z of w.hazards) {
        if (z.dead) continue
        const zy = z.kind === 'cloud' ? z.y : z.y - cam
        if ((z.kind === 'cloud' && z.state < 2) || (z.kind === 'comet' && z.state === 1)) {
          if (Math.abs(z.x - s.x) < (z.kind === 'cloud' ? 36 : 18) && Math.abs(zy - ssy) < 22) {
            s.life = 0
            if (z.kind === 'cloud') {
              z.state = 3
              z.t = 0
              fx.burst(z.x, zy, { count: 14, color: ['#94a3b8', '#e2e8f0', '#fde047'], speed: 200, size: 4 })
              fx.text(z.x, zy + 26, 'POOF!', '#e2e8f0', 16)
            } else {
              z.dead = true
              fx.explode(z.x, zy, 0.7)
              fx.text(z.x, zy - 20, 'SMASH!', '#fdba74', 16)
            }
            sfx.hit()
            haptic.light()
            break
          }
        }
      }
      if (s.life <= 0) continue
      for (const g of w.goos) {
        if (!g.dead && Math.hypot(g.x - s.x, g.y - s.y) < 18) {
          g.dead = true
          s.life = 0
          fx.burst(g.x, g.y - cam, { count: 10, color: ['#f0abfc', '#a21caf', '#fff'], speed: 180, size: 3 })
          sfx.pop()
          break
        }
      }
      const b = w.boss
      if (s.life > 0 && b && b.state !== 'leave' && Math.abs(s.x - b.x) < 50 && Math.abs(ssy - b.sy) < 44) {
        s.life = 0
        b.hp -= 1
        b.hit = 0.08
        fx.burst(s.x, ssy, { count: 8, color: ['#f0abfc', '#fff', '#c026d3'], speed: 200, size: 3 })
        fx.shake(3, 0.1)
        sfx.hit()
        haptic.light()
        if (b.hp <= 0) defeatBoss()
      }
    }

    // Lightning clouds & comets
    for (const z of w.hazards) {
      z.t += dt
      if (z.kind === 'cloud') {
        if (z.state === 0) {
          z.x += (z.tx - z.x) * Math.min(1, dt * 5)
          if (z.t > 0.7) {
            z.x = z.tx
            z.state = 1
            z.t = 0
            sfx.tick()
          }
        } else if (z.state === 1) {
          const warn = lerp(1.4, 1.05, clamp((h - LIGHTNING_FROM) / 2800, 0, 1))
          if (z.t > warn) {
            z.state = 2
            z.t = 0
            z.vy = Math.random() * 100 // bolt shape seed
            fx.flash('#fef9c3', 0.15)
            fx.shake(7, 0.25)
            sfx.boom(0.45)
            haptic.medium()
            for (let i = 0; i < 3; i++) fx.burst(z.x, z.y + 30 + Math.random() * (H - z.y), { count: 4, color: ['#fde047', '#fff'], speed: 160, size: 2.5, shape: 'spark', life: 0.35 })
          }
        } else if (z.state === 2) {
          let dx = Math.abs(w.x - z.x)
          dx = Math.min(dx, W + 32 - dx)
          if (playing && z.t < 0.2 && dx < 22 && hsy > z.y) {
            if (hurt(w.x, hsy)) return true
          }
          if (z.t > 0.3) {
            z.state = 3
            z.t = 0
          }
        } else {
          z.y -= 50 * dt
          if (z.t > 0.6) z.dead = true
        }
      } else {
        if (z.state === 0) {
          if (z.t > 1.1) {
            z.state = 1
            z.t = 0
            z.y = cam - 60
            z.vy = 380
            sfx.whoosh()
          }
        } else {
          z.vy += 320 * dt
          z.y += z.vy * dt
          if (Math.random() < 0.5) fx.burst(z.x, z.y - cam - 10, { count: 1, color: ['#fb923c', '#fde047', '#78716c'], speed: 40, angle: -Math.PI / 2, spread: 1, size: 3, life: 0.4, gravity: 0 })
          if (z.y - cam > H + 80) z.dead = true
          else if (playing && Math.hypot(z.x - w.x, z.y - w.y) < 22) {
            z.dead = true
            if (w.star > 0 || w.fly > 0) {
              fx.explode(z.x, z.y - cam, 0.8)
              sfx.hit()
            } else {
              fx.explode(z.x, z.y - cam, 0.6)
              if (hurt(w.x, hsy)) return true
            }
          }
        }
      }
    }
    w.hazards = w.hazards.filter((z) => !z.dead)

    // Goo King
    const b = w.boss
    if (b) {
      b.t += dt
      b.hit = Math.max(0, b.hit - dt)
      if (b.state === 'enter') {
        b.sy += (120 - b.sy) * Math.min(1, dt * 3)
        if (b.t > 1.3) {
          b.state = 'fight'
          b.t = 0
        }
      } else if (b.state === 'fight') {
        if (b.windup <= 0) {
          let dx = w.x - b.x
          if (dx > W / 2) dx -= W
          if (dx < -W / 2) dx += W
          const sp = (70 + 15 * b.lvl) * dt
          b.x = clamp(b.x + clamp(dx, -sp, sp), 50, W - 50)
          b.atk -= dt
          if (b.atk <= 0 && playing) {
            b.windup = 0.001
            sfx.flip()
          }
        } else {
          b.windup += dt / 0.8
          if (b.windup >= 1) {
            b.windup = 0
            b.atk = Math.max(1.2, 2.3 - 0.3 * b.lvl) * rand(0.9, 1.15)
            w.goos.push({ x: b.x, y: cam + b.sy + 26, vy: 140, dead: false })
            fx.burst(b.x, b.sy + 22, { count: 8, color: ['#f0abfc', '#a3e635'], speed: 120, angle: Math.PI / 2, spread: 1.2, size: 3 })
            sfx.pop()
            sfx.thud()
          }
        }
        if (b.t > 30) {
          b.state = 'leave'
          b.windup = 0
          w.nextBoss = h + BOSS_EVERY
          say('IT GOT AWAY', 'he will be back')
          sfx.miss()
        }
      } else {
        b.sy -= 180 * dt
        if (b.sy < -130) w.boss = null
      }
    } else if (playing && h >= w.nextBoss && w.t > 10) {
      spawnBoss()
    }
    for (const g of w.goos) {
      if (g.dead) continue
      g.vy += 650 * dt
      g.y += g.vy * dt
      if (g.y - cam > H + 40) g.dead = true
      else if (playing && Math.hypot(g.x - w.x, g.y - w.y) < 20) {
        g.dead = true
        fx.burst(g.x, g.y - cam, { count: 12, color: ['#f0abfc', '#a21caf'], speed: 200, size: 3.5 })
        if (w.star <= 0 && w.fly <= 0 && hurt(w.x, hsy)) return true
      }
    }
    w.goos = w.goos.filter((g) => !g.dead)

    // Gems
    for (const g of w.gems) {
      if (g.taken || !playing) continue
      if (Math.abs(g.x - w.x) < 22 && Math.abs(g.y - w.y) < 26) {
        g.taken = true
        w.gemCount += 1
        const gy = g.y - cam
        fx.burst(g.x, gy, { count: 8, color: ['#67e8f9', '#cffafe', '#fff'], speed: 150, size: 2.5, shape: 'spark', life: 0.4 })
        fx.ring(g.x, gy, { color: '#67e8f9', maxR: 22, life: 0.25, width: 2 })
        sfx.score(w.gemCount % 8)
        haptic.light()
        if (w.gemCount % 25 === 0) fx.text(g.x, gy - 20, `${w.gemCount} GEMS!`, '#67e8f9', 18)
      }
    }
    w.gems = w.gems.filter((g) => !g.taken && g.y < cam + H + 40)

    // Spawning: never two telegraphs at once, nothing new during the boss
    if (playing && w.t > 15 && !w.boss) {
      if (h >= LIGHTNING_FROM && h < LIGHTNING_TO) {
        w.hazT -= dt
        if (w.hazT <= 0) {
          if (!warnBusy() && w.fly <= 0) {
            spawnCloud(W)
            w.hazT = lerp(7, 4.2, clamp((h - LIGHTNING_FROM) / 2800, 0, 1)) * rand(0.85, 1.2)
          } else w.hazT = 0.6
        }
      }
      if (h >= COMET_FROM) {
        w.cometT -= dt
        if (w.cometT <= 0) {
          if (!warnBusy()) {
            spawnComet(W)
            w.cometT = lerp(6, 2.6, clamp((h - COMET_FROM) / 5000, 0, 1)) * rand(0.8, 1.2)
          } else w.cometT = 0.5
        }
      }
    }
    return false
  }

  function killMonster(m: Monster, stomp: boolean) {
    const w = world.current
    m.dead = true
    w.stats.kills += 1
    if (stomp) w.stats.stomps += 1
    const sy = m.y - w.camTop
    const col = m.kind === 'blob' ? ['#d8b4fe', '#7e22ce', '#fff'] : m.kind === 'flyer' ? ['#fca5a5', '#dc2626', '#fff'] : ['#ef4444', '#450a0a', '#fde047']
    fx.burst(m.x, sy, { count: 18, color: col, speed: 260, size: 4, gravity: 500 })
    fx.ring(m.x, sy, { color: col[0], maxR: 44, life: 0.35, width: 4 })
    fx.text(m.x, sy - 26, stomp ? 'STOMP!' : 'POW!', '#fde047', 18)
    fx.stop(0.05)
    fx.shake(5, 0.15)
    sfx.hit()
    sfx.pop()
    haptic.medium()
    run.update(w.stats)
    pushHud()
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    if ((size.current.w !== W || size.current.h !== H) && phaseRef.current === 'idle') {
      size.current = { w: W, h: H }
      world.current = freshWorld(W, H)
    }
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    step(dt, W, H)
    const ph = phaseRef.current
    if (ph === 'play') {
      hudT.current -= raw
      if (hudT.current <= 0) {
        hudT.current = 0.15
        pushHud()
      }
    }
    const cam = w.camTop
    const hm = Math.max(0, (w.startY - cam - H) / PXM)

    // Sky blends between biomes by altitude
    let bi = 0
    while (bi < BIOMES.length - 1 && hm >= BIOMES[bi + 1].at) bi++
    const b0 = BIOMES[bi]
    const b1 = BIOMES[Math.min(BIOMES.length - 1, bi + 1)]
    const k = b1 === b0 ? 0 : clamp((hm - b0.at) / (b1.at - b0.at) * 2.5 - 1.5, 0, 1)
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, mix(b0.top, b1.top, k))
    bg.addColorStop(1, mix(b0.bot, b1.bot, k))
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    const spaceK = clamp((hm - 3500) / 1500, 0, 1)
    // Stars
    if (spaceK > 0) {
      ctx.fillStyle = '#fff'
      for (let i = 0; i < 60; i++) {
        const sx = (i * 97.3) % W
        const sy = (((i * 61.7 - cam * 0.05) % H) + H) % H
        ctx.globalAlpha = spaceK * (0.4 + Math.abs(Math.sin(t * 1.5 + i)) * 0.6)
        ctx.fillRect(sx, sy, 1.8, 1.8)
      }
      ctx.globalAlpha = 1
      // Planet
      const py = ((H * 0.3 - cam * 0.02) % (H * 3)) + 0
      glow(ctx, W * 0.78, py, 80, '#a78bfa', 0.3 * spaceK)
      ctx.globalAlpha = spaceK
      ctx.fillStyle = '#7c3aed'
      ctx.beginPath()
      ctx.arc(W * 0.78, py, 30, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#f0abfc'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(W * 0.78, py, 48, 10, -0.3, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    // Hills near the ground
    const hillY = w.startY + 40 - cam * 1
    const farHill = w.startY - 10 - cam * 0.5
    if (farHill - 100 < H) {
      ctx.fillStyle = '#86efac'
      ctx.beginPath()
      ctx.moveTo(0, H + 400)
      for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, farHill - 60 - Math.sin(x * 0.015) * 30)
      ctx.lineTo(W + 20, H + 400)
      ctx.fill()
    }
    if (hillY < H + 100) {
      ctx.fillStyle = '#22c55e'
      ctx.beginPath()
      ctx.moveTo(0, H + 400)
      for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, hillY - 30 - Math.sin(x * 0.02 + 1) * 20)
      ctx.lineTo(W + 20, H + 400)
      ctx.fill()
    }
    const stormK = biomeWeight(hm, STORM)
    const auroraK = biomeWeight(hm, AURORA)
    const a = amb.current
    a.flash = Math.max(0, a.flash - raw * 3)
    a.next -= raw
    if (a.next <= 0) {
      a.next = rand(2.5, 5.5)
      if (stormK > 0.3) {
        a.flash = 1
        a.boltX = rand(W * 0.1, W * 0.9)
        if (ph === 'play') sfx.thud()
      }
    }
    drawAuroraLayer(ctx, W, H, cam, t, auroraK)
    // Clouds (parallax)
    if (spaceK < 1) {
      ctx.fillStyle = stormK > 0 ? mix('#ffffff', '#64748b', stormK) : auroraK > 0 ? mix('#ffffff', '#99f6e4', auroraK * 0.6) : '#ffffff'
      for (let i = 0; i < 7; i++) {
        const cx = ((i * 131 + t * (6 + i * 2)) % (W + 160)) - 80
        const span = H * 1.6
        const cy = ((((i * 211 - cam * 0.3) % span) + span) % span) - H * 0.3
        ctx.globalAlpha = (0.55 + (i % 3) * 0.12) * (1 - spaceK)
        ctx.beginPath()
        ctx.ellipse(cx, cy, 34, 12, 0, 0, Math.PI * 2)
        ctx.ellipse(cx + 20, cy - 8, 22, 13, 0, 0, Math.PI * 2)
        ctx.ellipse(cx - 18, cy - 4, 18, 10, 0, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    drawStormLayer(ctx, W, H, cam, t, stormK, a.flash, a.boltX)

    fx.applyShake(ctx)

    // Altitude flags every 250 m
    if (ph !== 'idle') {
      const top = Math.floor((w.startY - cam) / PXM / 250) * 250
      for (let m = top; m >= 250 && m > top - 250 * 4; m -= 250) {
        const fy = w.startY - m * PXM - cam
        if (fy < -20 || fy > H + 40) continue
        drawFlag(ctx, W, fy, `${m}`, t, m % 1000 === 0)
      }
    }

    // Best height marker
    if (ph !== 'idle' && bestRef.current > 0) {
      const by = w.startY - bestRef.current * PXM - cam
      if (by > 0 && by < H) {
        ctx.strokeStyle = '#facc15'
        ctx.setLineDash([10, 8])
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, by)
        ctx.lineTo(W, by)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#facc15'
        ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif"
        ctx.textAlign = 'right'
        ctx.textBaseline = 'bottom'
        ctx.fillText('BEST', W - 8, by - 3)
      }
    }

    const theme: Theme = auroraK > 0.5 ? 'ice' : stormK > 0.5 ? 'storm' : spaceK > 0.5 ? 'space' : 'grass'
    // Lightning telegraph columns sit behind the platforms
    for (const z of w.hazards) {
      if (z.kind === 'cloud' && z.state === 1) drawStrikeWarn(ctx, z.x, z.y + 18, H, t, clamp(z.t / 1.2, 0, 1))
    }
    for (const p of w.plats) {
      if (p.broken) continue
      const sy = p.y - cam
      if (sy < -30 || sy > H + 20) continue
      drawPlat(ctx, p, sy, t, theme)
      if (p.item) drawItem(ctx, p, sy, t)
    }
    for (const g of w.gems) {
      const sy = g.y - cam
      if (sy > -20 && sy < H + 20) drawGem(ctx, g.x, sy, t)
    }
    for (const p of w.pieces) {
      ctx.save()
      ctx.globalAlpha = clamp(p.life * 2, 0, 1)
      ctx.translate(p.x + p.w / 2, p.y - cam + PH / 2)
      ctx.rotate(p.rot)
      ctx.fillStyle = '#a16207'
      ctx.fillRect(-p.w / 2, -PH / 2, p.w, PH)
      ctx.restore()
    }
    for (const m of w.monsters) {
      const my = m.y + (m.kind === 'blob' ? Math.sin(m.ph * 2) * 4 : m.kind === 'flyer' ? Math.sin(m.ph * 3) * 10 : 0)
      const sy = my - cam
      if (sy < -40 || sy > H + 40) continue
      if (m.dead) {
        ctx.save()
        ctx.globalAlpha = 0.6
        ctx.translate(m.x, sy)
        ctx.scale(1, -1)
        ctx.translate(-m.x, -sy)
        drawMonster(ctx, m, sy, t)
        ctx.restore()
      } else drawMonster(ctx, m, sy, t)
    }
    // Goo King, his goo and the telegraphed spit line
    const boss = w.boss
    if (boss) {
      if (boss.windup > 0) {
        ctx.save()
        ctx.globalAlpha = 0.25 + boss.windup * 0.55
        ctx.strokeStyle = '#ef4444'
        ctx.lineWidth = 3
        ctx.setLineDash([12, 10])
        ctx.lineDashOffset = -t * 80
        ctx.beginPath()
        ctx.moveTo(boss.x, boss.sy + 40)
        ctx.lineTo(boss.x, H)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()
      }
      let dx = w.x - boss.x
      if (dx > W / 2) dx -= W
      if (dx < -W / 2) dx += W
      drawGooKing(ctx, boss.x, boss.sy, t, boss.windup, boss.hit, dx)
    }
    for (const g of w.goos) drawGoo(ctx, g.x, g.y - cam, t)
    for (const z of w.hazards) {
      if (z.kind === 'cloud') {
        if (z.state === 2) drawBolt(ctx, z.x, z.y + 16, H + 10, z.vy + Math.floor(t * 20), 1 - z.t / 0.3)
        const alpha = z.state === 3 ? clamp(1 - z.t / 0.6, 0, 1) : 1
        drawStormCloud(ctx, z.x, z.y, t, z.state === 1 ? clamp(z.t / 1.2, 0, 1) : z.state === 2 ? 1 : 0, alpha)
      } else if (z.state === 0) drawCometWarn(ctx, z.x, t, clamp(z.t / 1.1, 0, 1))
      else drawComet(ctx, z.x, z.y - cam, t)
    }
    for (const s of w.shots) {
      const sy = s.y - cam
      glow(ctx, s.x, sy, 12, '#fde047', 0.6)
      ctx.fillStyle = '#fff7ed'
      ctx.beginPath()
      ctx.arc(s.x, sy, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Hero (+ wrap ghost)
    const hy = w.y - cam
    const drawAt = (x: number) => {
      ctx.save()
      ctx.translate(x, hy)
      if (ph === 'dying' || ph === 'over') ctx.rotate(w.deadSpin)
      ctx.globalAlpha = w.inv > 0 && w.fly <= 0 && Math.sin(t * 40) > 0.3 ? 0.45 : 1
      drawHero(ctx, t, w.face, w.squash, w.vy, w.fly > 0 ? w.flyKind : null)
      ctx.restore()
      if (w.star > 0 && ph === 'play') drawStarAura(ctx, x, hy, t, w.star)
      if (w.shield > 0 && ph === 'play') {
        ctx.strokeStyle = 'rgba(56,189,248,0.7)'
        ctx.fillStyle = 'rgba(56,189,248,0.12)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, hy, 25 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }
    drawAt(w.x)
    if (w.x < 20) drawAt(w.x + W + 32)
    if (w.x > W - 20) drawAt(w.x - W - 32)
    ctx.globalAlpha = 1

    fx.draw(ctx)
    ctx.restore()
    if (boss && boss.state !== 'leave' && ph === 'play') drawBossBar(ctx, W, H, boss.hp, boss.max, boss.state === 'enter' ? 30 : Math.max(0, 30 - boss.t))
    fx.drawOverlay(ctx, W, H)
  }

  // Dev-only hooks so tests can jump straight to new content
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const jump = (m: number) => {
      const w = world.current
      const { w: W, h: H } = size.current
      const ty = w.startY - m * PXM
      w.y = ty
      w.minY = ty
      w.vy = -JUMP
      w.camTop = ty - H * 0.42
      w.plats = [{ x: clamp(w.x - PW, 4, W - PW * 2 - 4), y: ty + 16, w: PW * 2, type: 'normal', vx: 0, item: null, used: false, broken: false, fade: 1, squash: 0 }]
      w.monsters = []
      w.hazards = []
      w.goos = []
      w.gems = []
      w.genY = ty + 16
      w.nextMark = Math.ceil((m + 1) / 500) * 500
      w.nextMilestone = Math.ceil((m + 1) / 1000) * 1000
      if (!w.boss) w.nextBoss = Math.max(w.nextBoss, m + 400)
      w.t = Math.max(w.t, 16)
      w.hazT = Math.min(w.hazT, 2)
      w.cometT = Math.min(w.cometT, 2.5)
      return height()
    }
    const hook = {
      world: () => world.current,
      jump,
      skip: jump,
      biome: (i: number) => jump(BIOMES[clamp(i, 0, BIOMES.length - 1)].at + 15),
      spawn: (kind: string) => {
        const w = world.current
        const W = size.current.w
        if (kind === 'lightning' || kind === 'cloud') spawnCloud(W)
        else if (kind === 'comet') spawnComet(W)
        else if (kind === 'boss') spawnBoss()
        else if (kind === 'bosskill' && w.boss) {
          w.boss.hp = 0
          defeatBoss()
        } else if (kind === 'star' || kind === 'gem') {
          const y = w.y - 60
          if (kind === 'star') w.plats.push({ x: clamp(w.x - PW / 2, 4, W - PW - 4), y, w: PW, type: 'normal', vx: 0, item: 'star', used: false, broken: false, fade: 1, squash: 0 })
          else for (let i = 0; i < 3; i++) w.gems.push({ x: clamp(w.x, 40, W - 40) + (i - 1) * 22, y: y - 20, taken: false })
        } else return `unknown kind ${kind}`
        return kind
      },
      god: (on: boolean) => {
        dbg.current.god = on
        return on
      },
      state: () => {
        const w = world.current
        return {
          phase: phaseRef.current,
          height: height(),
          t: Math.round(w.t),
          biome: BIOMES[w.biome].name,
          hazards: w.hazards.map((z) => `${z.kind}:${z.state}`),
          boss: w.boss ? { hp: w.boss.hp, state: w.boss.state, lvl: w.boss.lvl } : null,
          nextBoss: w.nextBoss,
          gems: w.gemCount,
          star: w.star,
          shield: w.shield,
          bonus: w.bonus,
        }
      },
    }
    ;(window as unknown as { __en1_bouncy?: typeof hook }).__en1_bouncy = hook
    return () => {
      delete (window as unknown as { __en1_bouncy?: typeof hook }).__en1_bouncy
    }
  })

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.height} m</div>
                <div className="action-hud__small">Monsters {hud.kills}{hud.gems > 0 ? ` · Gems ${hud.gems}` : ''}</div>
              </div>
              <div className="action-hud__right">
                {hud.star > 0 ? <span className="action-hud__small" style={{ color: '#fbbf24' }}>Star {hud.star}s</span> : null}
                {hud.fly > 0 ? <span className="action-hud__small" style={{ color: '#fde047' }}>Flying {hud.fly}s</span> : null}
                {hud.shield > 0 ? <span className="action-hud__small" style={{ color: '#7dd3fc' }}>Shield ×{hud.shield}</span> : null}
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
              game="bouncy"
              icon={meta.icon}
              title={meta.title}
              hint="Drag left and right to steer — you bounce automatically. Tap to shoot monsters, or stomp them from above."
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.height >= 4500 ? 'Space bouncer!' : hud.height >= 1000 ? 'Sky high!' : 'Down you go!'}
            subtitle={`${hud.height} m · ${hud.kills} monsters${hud.gems > 0 ? ` · ${hud.gems} gems` : ''}`}
            celebrate={hud.height >= 1000}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
