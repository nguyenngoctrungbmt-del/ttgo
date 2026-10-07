import { useRef, useState, type PointerEvent } from 'react'
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
import { FRUITS, drawBomb, drawFruit, drawSpecial } from './art'

const meta = getGame('slash')

type Kind = 'fruit' | 'bomb' | 'star' | 'ice' | 'heart' | 'gold'

type Thing = {
  id: number
  kind: Kind
  /** Fruit art index (fruit kind only). */
  art: number
  juice: string
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  r: number
  dead: boolean
  hp: number
  hitCd: number
}

type Half = {
  /** Fruit art index, -1 = golden melon. */
  art: number
  flesh: string
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  r: number
  cut: number
  side: 1 | -1
  life: number
}

type Splat = {
  x: number
  y: number
  r: number
  color: string
  life: number
  drops: { dx: number; dy: number; r: number }[]
}
type TrailPt = { x: number; y: number; t: number }
type Phase = 'idle' | 'play' | 'dying' | 'over'

const BASE_MAX_LIVES = 5
const START_LIVES = 3
const COMBO_WINDOW = 0.28
const TRAIL_LIFE = 0.12
const GOLD_HP = 8

type World = {
  things: Thing[]
  halves: Half[]
  splats: Splat[]
  trail: TrailPt[]
  pointerDown: boolean
  last: { x: number; y: number } | null
  waveTimer: number
  frenzy: number
  frenzyTick: number
  elapsed: number
  level: number
  goldTimer: number
  invuln: number
  combo: number
  comboTimer: number
  comboX: number
  comboY: number
  idleTimer: number
  id: number
  score: number
  lives: number
  maxLives: number
  luck: number
  best: number
  bestShown: boolean
  nextMilestone: number
  lastTrack: number
  golds: number
  stats: { score: number; sliced: number; combo: number; specials: number }
}

function freshWorld(): World {
  return {
    things: [],
    halves: [],
    splats: [],
    trail: [],
    pointerDown: false,
    last: null,
    waveTimer: 0.6,
    frenzy: 0,
    frenzyTick: 0,
    elapsed: 0,
    level: 1,
    goldTimer: 28,
    invuln: 0,
    combo: 0,
    comboTimer: 0,
    comboX: 0,
    comboY: 0,
    idleTimer: 0,
    id: 1,
    score: 0,
    lives: START_LIVES,
    maxLives: BASE_MAX_LIVES,
    luck: 1,
    best: 0,
    bestShown: false,
    nextMilestone: 100,
    lastTrack: -99,
    golds: 0,
    stats: { score: 0, sliced: 0, combo: 0, specials: 0 },
  }
}

/** Distance from point to segment. */
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy || 1
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1)
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t))
}

export default function SlashGame() {
  const run = useActionRun('slash')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const world = useRef<World>(freshWorld())
  const size = useRef({ w: 360, h: 520 })
  const phaseRef = useRef<Phase>('idle')

  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(START_LIVES)
  const [level, setLevel] = useState(1)
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function showBanner(text: string, sub?: string) {
    setBanner({ key: Date.now() + Math.random(), text, sub })
  }

  function milestone(kind: string, value: number) {
    const w = world.current
    if (w.elapsed - w.lastTrack < 30) return
    w.lastTrack = w.elapsed
    void trackEvent('action_milestone', { game_id: 'slash', kind, value })
  }

  function start() {
    void unlockAudio()
    const w = freshWorld()
    const vital = run.level('vital')
    w.lives = START_LIVES + vital
    w.maxLives = BASE_MAX_LIVES + vital
    w.luck = 1 + run.level('lucky') * 0.3
    w.best = useProgressStore.getState().games.slash?.bestScore ?? 0
    w.bestShown = w.best < 20
    world.current = w
    fx.reset()
    setScore(0)
    setLives(w.lives)
    setLevel(1)
    run.begin()
    setPhaseBoth('play')
    sfx.ready()
    showBanner('SLASH!', 'swipe through the fruit')
  }

  function syncStats() {
    const w = world.current
    w.stats.score = w.score
    run.update(w.stats)
  }

  function addScore(n: number) {
    const w = world.current
    w.score += n
    setScore(w.score)
    if (!w.bestShown && w.score > w.best) {
      w.bestShown = true
      showBanner('NEW BEST!', `beat ${w.best}`)
      sfx.levelUp()
      haptic.success()
    } else if (w.score >= w.nextMilestone) {
      showBanner(`${w.nextMilestone} POINTS!`)
      w.nextMilestone += 100
      sfx.combo()
    }
  }

  function spawn(kind: Kind, opts: { fromSide?: boolean } = {}) {
    const w = world.current
    const { w: W, h: H } = size.current
    const g = H * 1.15
    const base = clamp(W * 0.075, 24, 38)
    const r = kind === 'gold' ? base * 1.45 : base * (kind === 'fruit' ? rand(0.9, 1.15) : 1)
    let x: number
    let vx: number
    let vy: number
    let y = H + r
    if (opts.fromSide) {
      const left = Math.random() < 0.5
      x = left ? -r : W + r
      y = rand(H * 0.45, H * 0.75)
      vx = (left ? 1 : -1) * rand(W * 0.45, W * 0.75)
      vy = -rand(H * 0.6, H * 0.95)
    } else {
      x = kind === 'gold' ? W / 2 + rand(-W * 0.15, W * 0.15) : rand(W * 0.14, W * 0.86)
      const apex = kind === 'gold' ? H * 0.28 : rand(H * 0.18, H * 0.5)
      vy = -Math.sqrt(2 * g * (y - apex))
      const flight = (-vy / g) * 2
      const targetX = kind === 'gold' ? W / 2 : rand(W * 0.2, W * 0.8)
      vx = (targetX - x) / flight
    }
    const art = Math.floor(Math.random() * FRUITS.length)
    const juice =
      kind === 'fruit' ? FRUITS[art].juice
      : kind === 'bomb' ? '#fbbf24'
      : kind === 'star' || kind === 'gold' ? '#fde047'
      : kind === 'ice' ? '#7dd3fc'
      : '#f472b6'
    w.things.push({ id: w.id++, kind, art, juice, x, y, vx, vy, rot: rand(0, 6.28), vr: rand(-4, 4), r, dead: false, hp: kind === 'gold' ? GOLD_HP : 1, hitCd: 0 })
  }

  function spawnWave() {
    const w = world.current
    const count = clamp(1 + Math.floor(Math.random() * (1 + w.level * 0.6)), 1, 6)
    const bombChance = Math.min(0.32, 0.06 + w.level * 0.03)
    const staggered = Math.random() < 0.45
    const sp = 0.06 * w.luck
    for (let i = 0; i < count; i++) {
      const roll = Math.random()
      let kind: Kind = 'fruit'
      if (w.elapsed > 4 && roll < bombChance) kind = 'bomb'
      else if (roll > 1 - sp * 0.4 && w.elapsed > 8) kind = 'star'
      else if (roll > 1 - sp * 0.75 && w.elapsed > 12) kind = 'ice'
      else if (roll > 1 - sp && w.lives < w.maxLives) kind = 'heart'
      if (staggered) window.setTimeout(() => phaseRef.current === 'play' && spawn(kind), i * 160)
      else spawn(kind)
    }
    if (count >= 4) sfx.whoosh()
    w.waveTimer = Math.max(0.85, 2.1 - w.level * 0.09) + rand(-0.15, 0.25)
  }

  function die() {
    const w = world.current
    setPhaseBoth('dying')
    fx.slowmo(0.9, 0.25)
    fx.flash('#ef4444', 0.3)
    sfx.lose()
    haptic.error()
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round((w.score * 0.25 + w.stats.combo * 2 + w.golds * 4) * (1 + run.level('bounty') * 0.15))
      run.end({ score: w.score, cleared: w.score >= 50, stats: { ...w.stats, score: w.score }, coins }, revive)
    }, 900)
  }

  /** Ad revive: two lives back, the screen is wiped and blades are safe for a moment. */
  function revive() {
    const w = world.current
    for (const t of w.things) {
      fx.burst(t.x, t.y, { count: 10, color: t.kind === 'bomb' ? ['#9ca3af', '#fde047'] : [t.juice, '#fff'], speed: 200 })
    }
    w.things = []
    w.lives = 2
    w.invuln = 2.5
    w.waveTimer = 1.2
    w.frenzy = 0
    w.combo = 0
    setLives(w.lives)
    fx.ring(size.current.w / 2, size.current.h / 2, { color: '#67e8f9', maxR: size.current.w * 0.6, life: 0.6, width: 5 })
    showBanner('REVIVED!', 'blade is shielded')
    setPhaseBoth('play')
  }

  function loseLife(x: number, reason: 'miss' | 'bomb') {
    const w = world.current
    if (phaseRef.current !== 'play') return
    if (w.invuln > 0) return
    w.lives -= 1
    setLives(w.lives)
    if (reason === 'miss') {
      fx.text(clamp(x, 24, size.current.w - 24), size.current.h - 30, '✖', '#f87171', 30)
      fx.shake(4, 0.15)
      fx.flash('#ef4444', 0.12)
      sfx.miss()
      haptic.light()
    }
    if (w.lives <= 0) die()
  }

  function addSplat(x: number, y: number, r: number, color: string, cutAngle: number) {
    const w = world.current
    const sr = r * rand(1.1, 1.5)
    w.splats.push({
      x,
      y,
      r: sr,
      color,
      life: 3.5,
      // Droplets streak along the cut direction for a directional splash.
      drops: Array.from({ length: 9 }, () => {
        const along = rand(-1.3, 1.3) * sr
        const off = rand(-0.35, 0.35) * sr
        return {
          dx: Math.cos(cutAngle) * along - Math.sin(cutAngle) * off,
          dy: Math.sin(cutAngle) * along + Math.cos(cutAngle) * off,
          r: rand(0.08, 0.3) * sr,
        }
      }),
    })
    if (w.splats.length > 18) w.splats.shift()
  }

  function pushHalves(t: Thing, cutAngle: number, art: number, flesh: string) {
    const w = world.current
    const nx = -Math.sin(cutAngle)
    const ny = Math.cos(cutAngle)
    const push = 70
    for (const side of [1, -1] as const) {
      w.halves.push({
        art,
        flesh,
        x: t.x,
        y: t.y,
        vx: t.vx * 0.6 + nx * push * side,
        vy: Math.min(t.vy, 0) * 0.3 + ny * push * side - 60,
        rot: t.rot,
        vr: t.vr + side * rand(2, 5),
        r: t.r,
        cut: cutAngle - t.rot,
        side,
        life: 1.6,
      })
    }
    if (w.halves.length > 40) w.halves.splice(0, 2)
  }

  function hitGold(t: Thing, cutAngle: number) {
    const w = world.current
    if (t.hitCd > 0) return
    t.hitCd = 0.06
    t.hp -= 1
    // Each hit bumps it up and slows it so it hangs in the air.
    t.vy = Math.min(t.vy * 0.3, 0) - 140
    t.vx *= 0.4
    t.vr += rand(-3, 3)
    fx.burst(t.x, t.y, { count: 10, color: ['#fde047', '#ffffff', '#facc15'], speed: 240, angle: cutAngle, spread: 1.4, shape: 'spark' })
    fx.text(t.x + rand(-20, 20), t.y - t.r, '+1', '#fde047', 18)
    fx.stop(0.02)
    sfx.score(GOLD_HP - t.hp)
    haptic.light()
    addScore(1)
    if (t.hp <= 0) {
      t.dead = true
      w.golds += 1
      pushHalves(t, cutAngle, -1, '#fef3c7')
      fx.explode(t.x, t.y, 1.6, ['#fde047', '#ffffff', '#facc15', '#fef3c7'])
      fx.ring(t.x, t.y, { color: '#fde047', maxR: t.r * 3, life: 0.45, width: 5 })
      fx.text(t.x, t.y - t.r - 20, 'GOLDEN +10', '#fde047', 26)
      fx.flash('#fde047', 0.2)
      fx.stop(0.1)
      fx.shake(8, 0.3)
      sfx.win()
      haptic.success()
      addScore(10)
      milestone('gold', w.golds)
    }
    syncStats()
  }

  function sliceThing(t: Thing, ax: number, ay: number, bx: number, by: number) {
    const w = world.current
    const cutAngle = Math.atan2(by - ay, bx - ax)
    if (t.kind === 'gold') {
      hitGold(t, cutAngle)
      return
    }
    t.dead = true

    if (t.kind === 'bomb') {
      if (w.invuln > 0) {
        fx.burst(t.x, t.y, { count: 14, color: ['#9ca3af', '#67e8f9'], speed: 200 })
        fx.text(t.x, t.y - t.r, 'DEFUSED', '#67e8f9', 18)
        sfx.clang()
        return
      }
      fx.explode(t.x, t.y, 1.8)
      fx.flash('#fff', 0.25)
      fx.stop(0.12)
      fx.shake(16, 0.5)
      sfx.boom(1)
      haptic.heavy()
      // Blast clears every fruit on screen.
      for (const o of w.things) {
        if (o.dead || o === t) continue
        o.vx += (o.x - t.x) * 3
        o.vy += (o.y - t.y) * 3 - 200
        o.dead = true
        fx.burst(o.x, o.y, { count: 6, color: o.juice, speed: 160 })
        if (o.kind === 'fruit') pushHalves(o, rand(0, 3), o.art, FRUITS[o.art].flesh)
      }
      w.combo = 0
      loseLife(t.x, 'bomb')
      return
    }

    if (t.kind === 'fruit') pushHalves(t, cutAngle, t.art, FRUITS[t.art].flesh)
    fx.burst(t.x, t.y, { count: 16, color: [t.juice, '#ffffff'], speed: 260, size: 3.2, angle: cutAngle, spread: 1.6, gravity: 500 })
    fx.burst(t.x, t.y, { count: 8, color: t.juice, speed: 120, size: 5, gravity: 600 })
    fx.ring(t.x, t.y, { color: '#ffffff', maxR: t.r * 1.5, life: 0.22, width: 3 })
    addSplat(t.x, t.y, t.r, t.juice, cutAngle)
    fx.stop(0.03)
    fx.shake(2.5, 0.1)
    sfx.slash()
    haptic.light()

    if (t.kind === 'fruit') {
      w.stats.sliced += 1
      w.combo += 1
      w.comboTimer = COMBO_WINDOW
      w.comboX = t.x
      w.comboY = t.y
      fx.text(t.x, t.y - t.r, '+1', '#fff', 18)
      sfx.score(w.combo)
      addScore(1)
    } else {
      w.stats.specials += 1
      sfx.power()
      haptic.medium()
      fx.burst(t.x, t.y, { count: 18, color: [t.juice, '#ffffff'], speed: 300, shape: 'spark' })
      if (t.kind === 'star') {
        w.frenzy = 2.6
        w.frenzyTick = 0
        showBanner('FRENZY!', 'fruit storm')
        fx.flash('#fde047', 0.2)
      } else if (t.kind === 'ice') {
        fx.slowmo(3.2, 0.4)
        showBanner('SLOW-MO', 'everything slows down')
        fx.flash('#7dd3fc', 0.25)
      } else if (t.kind === 'heart') {
        w.lives = Math.min(w.maxLives, w.lives + 1)
        setLives(w.lives)
        fx.text(t.x, t.y - t.r, '+1 LIFE', '#f9a8d4', 22)
      }
    }
    syncStats()
  }

  function endCombo() {
    const w = world.current
    if (w.combo >= 3) {
      const bonus = w.combo
      w.stats.combo = Math.max(w.stats.combo, w.combo)
      fx.text(clamp(w.comboX, 70, size.current.w - 70), w.comboY - 40, `${w.combo} FRUIT COMBO +${bonus}`, '#fde047', 22)
      fx.stop(0.07)
      fx.shake(6, 0.2)
      sfx.combo()
      haptic.medium()
      addScore(bonus)
    }
    w.combo = 0
    syncStats()
  }

  function onSwipe(x: number, y: number) {
    const w = world.current
    const now = performance.now() / 1000
    const prev = w.last
    w.trail.push({ x, y, t: now })
    w.last = { x, y }
    if (!prev || phaseRef.current !== 'play') return
    const len = Math.hypot(x - prev.x, y - prev.y)
    if (len < 3) return
    if (len > 40 && Math.random() < 0.35) sfx.whoosh()
    for (const t of w.things) {
      if (t.dead) continue
      if (segDist(t.x, t.y, prev.x, prev.y, x, y) < t.r * 0.95) sliceThing(t, prev.x, prev.y, x, y)
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    const w = world.current
    w.pointerDown = true
    w.last = null
    w.trail = []
    onSwipe(p.x, p.y)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!world.current.pointerDown) return
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]
    for (const ev of events) {
      const p = localPoint(ev, e.currentTarget)
      onSwipe(p.x, p.y)
    }
  }

  function onPointerUp() {
    const w = world.current
    w.pointerDown = false
    w.last = null
    if (w.combo > 0) endCombo()
  }

  function frame({ ctx, w: W, h: H, raw }: Frame) {
    size.current = { w: W, h: H }
    const w = world.current
    const dt = fx.step(raw)
    const phaseNow = phaseRef.current
    const g = H * 1.15

    if (phaseNow === 'play') {
      w.elapsed += dt
      w.invuln = Math.max(0, w.invuln - raw)
      const lv = 1 + Math.floor(w.elapsed / 11)
      if (lv !== w.level) {
        w.level = lv
        setLevel(lv)
        if (lv % 3 === 0) {
          showBanner(`LEVEL ${lv}`, 'faster fruit, more bombs')
          sfx.levelUp()
        }
        if (lv % 5 === 0) milestone('level', lv)
      }
      w.waveTimer -= dt
      if (w.waveTimer <= 0 && w.frenzy <= 0) spawnWave()
      w.goldTimer -= dt
      if (w.goldTimer <= 0) {
        spawn('gold')
        showBanner('GOLDEN MELON!', 'slash it again and again')
        sfx.ready()
        w.goldTimer = rand(35, 50)
      }
      if (w.frenzy > 0) {
        w.frenzy -= dt
        w.frenzyTick -= dt
        if (w.frenzyTick <= 0) {
          spawn('fruit', { fromSide: true })
          w.frenzyTick = 0.14
        }
      }
      if (w.comboTimer > 0) {
        w.comboTimer -= dt
        if (w.comboTimer <= 0 && w.combo > 0) endCombo()
      }
    } else if (phaseNow === 'idle') {
      w.idleTimer -= dt
      if (w.idleTimer <= 0) {
        spawn(Math.random() < 0.12 ? 'bomb' : 'fruit')
        w.idleTimer = rand(0.7, 1.4)
      }
    }

    for (const t of w.things) {
      if (t.dead) continue
      // Golden melon floats down slowly once it has been hit.
      const grav = t.kind === 'gold' && t.hp < GOLD_HP ? g * 0.45 : g
      t.vy += grav * dt
      t.x += t.vx * dt
      t.y += t.vy * dt
      t.rot += t.vr * dt
      t.hitCd -= dt
      if (t.kind === 'gold') t.x = clamp(t.x, t.r, W - t.r)
      if (t.vy > 0 && t.y > H + t.r * 1.2) {
        t.dead = true
        if (t.kind === 'fruit' && phaseNow === 'play') loseLife(t.x, 'miss')
      }
    }
    w.things = w.things.filter((t) => !t.dead)

    for (const h of w.halves) {
      h.vy += g * dt
      h.x += h.vx * dt
      h.y += h.vy * dt
      h.rot += h.vr * dt
      h.life -= dt
    }
    w.halves = w.halves.filter((h) => h.life > 0 && h.y < H + 80)
    for (const s of w.splats) s.life -= raw
    w.splats = w.splats.filter((s) => s.life > 0)
    const now = performance.now() / 1000
    w.trail = w.trail.filter((p) => now - p.t < TRAIL_LIFE)

    // ── Draw ─────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#4a2c17')
    bg.addColorStop(1, '#1c1009')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    const plank = W / 5
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.08)' : 'rgba(255,220,180,0.04)'
      ctx.fillRect(i * plank, 0, plank, H)
      ctx.strokeStyle = 'rgba(255,220,180,0.05)'
      ctx.lineWidth = 1
      for (let k = 0; k < 3; k++) {
        const gx = i * plank + plank * (0.25 + k * 0.25)
        ctx.beginPath()
        ctx.moveTo(gx, 0)
        ctx.bezierCurveTo(gx + 6, H * 0.3, gx - 6, H * 0.6, gx + 3, H)
        ctx.stroke()
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'
    ctx.lineWidth = 2
    for (let i = 1; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(i * plank, 0)
      ctx.lineTo(i * plank, H)
      ctx.stroke()
    }
    glow(ctx, W / 2, H * 0.35, W * 0.7, 'rgba(255,190,120,0.25)', 1)

    fx.applyShake(ctx)
    for (const s of w.splats) {
      ctx.globalAlpha = Math.min(0.32, s.life / 4)
      ctx.fillStyle = s.color
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r * 0.55, 0, Math.PI * 2)
      ctx.fill()
      for (const d of s.drops) {
        ctx.beginPath()
        ctx.arc(s.x + d.dx, s.y + d.dy, d.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    for (const t of w.things) {
      if (t.kind === 'bomb') {
        glow(ctx, t.x, t.y, t.r * 1.9, 'rgba(239,68,68,0.9)', 0.3 + Math.sin(now * 14) * 0.12)
        drawBomb(ctx, t.x, t.y, t.r, t.rot * 0.3, now)
      } else if (t.kind === 'fruit') {
        drawFruit(ctx, t.art, t.x, t.y, t.r, t.rot)
      } else {
        if (t.kind === 'gold') glow(ctx, t.x, t.y, t.r * 2.2, '#fde047', 0.45)
        drawSpecial(ctx, t.kind, t.x, t.y, t.r, t.rot, now, GOLD_HP - t.hp)
      }
    }

    for (const h of w.halves) {
      ctx.save()
      ctx.globalAlpha = Math.min(1, h.life * 1.5)
      ctx.translate(h.x, h.y)
      ctx.rotate(h.rot + h.cut)
      ctx.beginPath()
      if (h.side === 1) ctx.rect(-h.r * 1.4, 0, h.r * 2.8, h.r * 1.4)
      else ctx.rect(-h.r * 1.4, -h.r * 1.4, h.r * 2.8, h.r * 1.4)
      ctx.clip()
      ctx.save()
      ctx.rotate(-h.cut)
      if (h.art < 0) drawSpecial(ctx, 'gold', 0, 0, h.r, 0, now, 0)
      else drawFruit(ctx, h.art, 0, 0, h.r)
      ctx.restore()
      // Juicy cut face along the slice.
      ctx.fillStyle = h.flesh
      ctx.beginPath()
      ctx.ellipse(0, 0, h.r * 0.86, h.r * 0.22, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.beginPath()
      ctx.ellipse(0, 0, h.r * 0.6, h.r * 0.1, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    fx.draw(ctx)

    // Blade trail
    if (w.trail.length > 1) {
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      const shielded = w.invuln > 0
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 1; i < w.trail.length; i++) {
          const a = w.trail[i - 1]
          const b = w.trail[i]
          const k = 1 - (now - b.t) / TRAIL_LIFE
          ctx.globalAlpha = pass === 0 ? 0.35 * k : 0.95 * k
          ctx.strokeStyle = pass === 0 ? (shielded ? '#a5f3fc' : '#67e8f9') : '#ffffff'
          ctx.lineWidth = (pass === 0 ? (shielded ? 22 : 14) : 5) * (0.25 + k * 0.75)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
      ctx.globalAlpha = 1
    }
    ctx.restore()

    if (w.invuln > 0 && phaseNow === 'play') {
      ctx.strokeStyle = `rgba(103,232,249,${0.35 + Math.sin(now * 10) * 0.2})`
      ctx.lineWidth = 6
      ctx.strokeRect(3, 3, W - 6, H - 6)
    }
    if (fx.slowTime > 0) {
      ctx.fillStyle = 'rgba(125,211,252,0.08)'
      ctx.fillRect(0, 0, W, H)
    }
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  const hearts = Array.from({ length: Math.max(lives, 0) }, () => '❤').join('')

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div
          className="action-arena"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{score}</div>
                <div className="action-hud__small">Level {level}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hearts">{hearts || '—'}</span>
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
              game="slash"
              icon={meta.icon}
              title={meta.title}
              hint="Swipe to slice fruit. Chain 3+ in one swipe for combos. Never touch the bombs!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={score >= 50 ? 'Blade master!' : 'Out of lives'}
            subtitle={`Score ${score} · Level ${level}`}
            celebrate={score >= 50}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
