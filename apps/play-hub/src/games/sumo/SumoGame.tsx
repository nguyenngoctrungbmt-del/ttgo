import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { trackEvent } from '../../analytics/analytics'
import { getGame } from '../../data/games'
import ActionIdle from '../../shared/action/ActionIdle'
import ActionResult from '../../shared/action/ActionResult'
import { Fx, glow, rand } from '../../shared/action/fx'
import { Stick, localPoint, useActionCanvas, type Frame } from '../../shared/action/useActionCanvas'
import { useActionRun } from '../../shared/action/useActionRun'
import GameShell from '../../shared/GameShell'
import { haptic } from '../../shared/haptics'
import { MissionToast } from '../../shared/missions/GameMissions'
import { sfx, unlockAudio } from '../../shared/sound'
import '../../shared/action/action.css'
import './sumo.css'
import { RIVALS, VENUES, rivalFor, type HairStyle, type Mark, type Rival, type Venue } from './rivals'

const meta = getGame('sumo')

type Phase = 'idle' | 'play' | 'perk' | 'dying' | 'over'
type BoutSt = 'ready' | 'fight' | 'end'
type AiMode = 'push' | 'circle' | 'charge' | 'brake' | 'recover' | 'stomp' | 'grip'

type PerkId = 'heavy' | 'legs' | 'thunder' | 'quick' | 'grip' | 'slap'
type Perk = { id: PerkId; icon: string; label: string; blurb: string }
const PERKS: Perk[] = [
  { id: 'heavy', icon: '🍚', label: 'Chanko Feast', blurb: '+12% body mass' },
  { id: 'legs', icon: '🦵', label: 'Strong Legs', blurb: '+12% pushing force' },
  { id: 'thunder', icon: '⚡', label: 'Thunder Dash', blurb: 'Charges hit 20% harder' },
  { id: 'quick', icon: '⏩', label: 'Quick Breath', blurb: 'Charge fills 30% faster' },
  { id: 'grip', icon: '🦶', label: 'Deep Roots', blurb: 'Better grip at the edge' },
  { id: 'slap', icon: '✋', label: 'Thunder Palms', blurb: 'Slaps shove 25% harder' },
]

type Wrestler = {
  x: number
  y: number
  vx: number
  vy: number
  face: number
  mass: number
  charge: number
  dashT: number
  slapT: number
  slapSide: number
  squash: number
  step: number
  out: boolean
  skin: string
  belt: string
  hair: string
  hairStyle: HairStyle
  mark: Mark
  boss: boolean
}

type World = {
  stage: number
  tier: number
  rival: Rival
  venue: Venue
  /** Signature-move state: a queued second charge, cooldown before the next stomp/throw. */
  combo: boolean
  sigCd: number
  /** Did the player win a bout of this match with a charge (star rule). */
  chargeWin: boolean
  me: Wrestler
  ai: Wrestler
  myWins: number
  aiWins: number
  bout: BoutSt
  bT: number
  boutT: number
  R: number
  mode: AiMode
  modeT: number
  circleDir: number
  winBy: 'push' | 'charge' | 'dodge'
  lastHit: 'me' | 'ai'
  perks: Record<PerkId, number>
  score: number
  crowd: number
  inv: number
  stats: { bouts: number; stage: number; charges: number; sweeps: number; bosses: number }
}

function wrestler(skin: string, belt: string, hair: string, mass: number, boss = false, hairStyle: HairStyle = 'topknot', mark: Mark = 'none'): Wrestler {
  return { x: 0, y: 0, vx: 0, vy: 0, face: 0, mass, charge: 0, dashT: 0, slapT: 0, slapSide: 1, squash: 0, step: 0, out: false, skin, belt, hair, hairStyle, mark, boss }
}

function freshWorld(): World {
  const r = RIVALS[0]
  return {
    stage: 0,
    tier: 0,
    rival: r,
    venue: VENUES.hall,
    combo: false,
    sigCd: 3,
    chargeWin: false,
    me: wrestler('#f1c27d', '#e11d48', '#111827', 1),
    ai: wrestler(r.skin, r.belt, r.hair, r.mass, false, r.hairStyle, r.mark),
    myWins: 0,
    aiWins: 0,
    bout: 'ready',
    bT: 0,
    boutT: 0,
    R: 1,
    mode: 'push',
    modeT: 0,
    circleDir: 1,
    winBy: 'push',
    lastHit: 'me',
    perks: { heavy: 0, legs: 0, thunder: 0, quick: 0, grip: 0, slap: 0 },
    score: 0,
    crowd: 0,
    inv: 0,
    stats: { bouts: 0, stage: 1, charges: 0, sweeps: 0, bosses: 0 },
  }
}

const KIMARITE = { push: 'OSHIDASHI!', charge: 'TSUKIDASHI!', dodge: 'HATAKIKOMI!' }

export default function SumoGame() {
  const run = useActionRun('sumo')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const size = useRef({ w: 360, h: 560 })
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const stick = useRef(new Stick(56)).current
  const holding = useRef(false)
  const keys = useRef({ l: false, r: false, u: false, d: false, charge: false })
  const bgCache = useRef<{ key: string; c: HTMLCanvasElement | null }>({ key: '', c: null })
  const lastMilestone = useRef(0)
  const devAuto = useRef(false)
  const devSpeed = useRef(1)

  useEffect(() => {
    if (!import.meta.env.DEV) return
    // Test hook for headless bots: autopilot, fast-forward, state readout.
    const hook = {
      auto: (on: boolean) => (devAuto.current = on),
      speed: (n: number) => (devSpeed.current = Math.max(1, Math.min(8, Math.round(n)))),
      state: () => {
        const w = world.current
        return { phase: phaseRef.current, stage: w.stage + 1, my: w.myWins, ai: w.aiWins, rival: w.rival.name, venue: w.venue.id }
      },
      perk: () => (document.querySelector('.sumo-perk__card') as HTMLButtonElement | null)?.click(),
    }
    ;(window as unknown as { __lv6sumo?: typeof hook }).__lv6sumo = hook
  }, [])

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, my: 0, ai: 0, stage: 1, name: RIVALS[0].name, tier: 0 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)
  const [choices, setChoices] = useState<Perk[]>([])

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function au() {
    return phaseRef.current !== 'idle'
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, my: w.myWins, ai: w.aiWins, stage: w.stage + 1, name: w.rival.name, tier: w.tier })
  }

  function geo() {
    const { w: W, h: H } = size.current
    const R0 = Math.min(W * 0.43, (H - 70) * 0.42)
    const cx = W / 2
    const cy = 70 + (H - 70) / 2
    return { W, H, R0, cx, cy, r: R0 * 0.19 }
  }

  function milestone(kind: string, value: number) {
    const now = performance.now()
    if (now - lastMilestone.current < 30000) return
    lastMilestone.current = now
    void trackEvent('action_milestone', { game_id: 'sumo', kind, value })
  }

  function myMass(w: World) {
    return 1 + run.level('mass') * 0.1 + w.perks.heavy * 0.12
  }

  function rivalPower(w: World) {
    return 1 + w.tier * 0.15
  }

  function startBout(w: World) {
    const g = geo()
    w.bout = 'ready'
    w.bT = 0
    w.boutT = 0
    w.R = 1
    w.mode = 'push'
    w.modeT = 1
    w.combo = false
    w.sigCd = rand(2.5, 4)
    w.me.x = g.cx
    w.me.y = g.cy + g.R0 * 0.32
    w.ai.x = g.cx
    w.ai.y = g.cy - g.R0 * 0.32
    for (const wr of [w.me, w.ai]) {
      wr.vx = 0
      wr.vy = 0
      wr.charge = 0
      wr.dashT = 0
      wr.out = false
      wr.squash = 0
    }
    w.me.face = -Math.PI / 2
    w.ai.face = Math.PI / 2
    w.me.mass = myMass(w)
    if (au()) sfx.tick()
  }

  function startMatch(w: World) {
    const pick = rivalFor(w.stage)
    w.rival = pick.rival
    w.tier = pick.tier
    w.venue = pick.venue
    const r = w.rival
    w.ai = wrestler(r.skin, r.belt, r.hair, r.mass * (1 + w.tier * 0.08), !!r.boss, r.hairStyle, r.mark)
    w.chargeWin = false
    w.myWins = 0
    w.aiWins = 0
    w.stats.stage = Math.max(w.stats.stage, w.stage + 1)
    startBout(w)
    setBanner({ key: Date.now(), text: `${r.boss ? '👑 ' : ''}${r.name.toUpperCase()}`, sub: `${r.rank}${w.tier > 0 ? ` · tier ${w.tier + 1}` : ''} · “${r.intro}” · ${r.tip}` })
    pushHud()
  }

  function start(level: number = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    // Each rival is a level: the map replays beaten rivals, Play continues at the next one.
    w.stage = Math.max(0, (typeof level === 'number' && level > 0 ? Math.floor(level) : run.nextLevel) - 1)
    w.stats.stage = w.stage + 1
    world.current = w
    fx.reset()
    run.begin()
    setPhaseBoth('play')
    startMatch(w)
    sfx.ready()
  }

  function dash(wr: Wrestler, dirX: number, dirY: number, power: number) {
    const g = geo()
    const d = Math.hypot(dirX, dirY) || 1
    const sp = g.R0 * (1.3 + 1.9 * power)
    wr.vx += (dirX / d) * sp
    wr.vy += (dirY / d) * sp
    wr.dashT = 0.45
    wr.face = Math.atan2(dirY, dirX)
    wr.charge = 0
    fx.burst(wr.x, wr.y, { count: 12, color: world.current.venue.dust, speed: 160, size: 4, gravity: 0, drag: 3, angle: wr.face + Math.PI, spread: 1.4 })
    if (au()) sfx.whoosh()
  }

  function releaseCharge() {
    const w = world.current
    const me = w.me
    if (phaseRef.current !== 'play' || w.bout !== 'fight') {
      me.charge = 0
      return
    }
    if (me.charge > 0.2) {
      const p = me.charge * (1 + w.perks.thunder * 0.2) * (1 + run.level('dash') * 0.15)
      dash(me, Math.cos(me.face), Math.sin(me.face), p)
      haptic.medium()
    } else me.charge = 0
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = localPoint(e, e.currentTarget)
    stick.down(e.pointerId, p.x, p.y)
    holding.current = true
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const p = localPoint(e, e.currentTarget)
    stick.move(e.pointerId, p.x, p.y)
  }
  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (stick.id !== e.pointerId) return
    stick.up(e.pointerId)
    holding.current = false
    releaseCharge()
  }

  useEffect(() => {
    function set(e: KeyboardEvent, v: boolean) {
      const k = keys.current
      if (e.key === 'ArrowLeft' || e.key === 'a') k.l = v
      else if (e.key === 'ArrowRight' || e.key === 'd') k.r = v
      else if (e.key === 'ArrowUp' || e.key === 'w') k.u = v
      else if (e.key === 'ArrowDown' || e.key === 's') k.d = v
      else if (e.key === ' ') {
        if (e.repeat) return
        k.charge = v
        if (!v) releaseCharge()
      } else return
      e.preventDefault()
    }
    const down = (e: KeyboardEvent) => set(e, true)
    const up = (e: KeyboardEvent) => set(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ── Simulation ──────────────────────────────────────────

  function controlMe(w: World, dt: number, time: number) {
    const g = geo()
    const me = w.me
    const ai = w.ai
    let mx = 0
    let my = 0
    let chargingInput = false
    if (phaseRef.current === 'idle' || (import.meta.env.DEV && devAuto.current)) {
      // Attract-mode autopilot: lean toward the rival from the centre side, charge now and then.
      const dx = ai.x - me.x
      const dy = ai.y - me.y
      const d = Math.hypot(dx, dy) || 1
      mx = dx / d
      my = dy / d
      chargingInput = d > g.r * 3.2 && Math.sin(time * 0.9) > 0.3
      if (!chargingInput && me.charge > 0.5) {
        dash(me, mx, my, me.charge)
      }
    } else {
      const v = stick.vec()
      const k = keys.current
      mx = v.x + (k.r ? 1 : 0) - (k.l ? 1 : 0)
      my = v.y + (k.d ? 1 : 0) - (k.u ? 1 : 0)
      const m = Math.hypot(mx, my)
      if (m > 1) {
        mx /= m
        my /= m
      }
      chargingInput = (holding.current && v.mag < 0.3) || k.charge
    }
    if (chargingInput && me.dashT <= 0) {
      const before = me.charge
      me.charge = Math.min(1, me.charge + dt * 1.1 * (1 + w.perks.quick * 0.3) * (1 + run.level('dash') * 0.2))
      if (before < 1 && me.charge >= 1 && au()) sfx.ready()
      mx *= 0.15
      my *= 0.15
    } else if (!chargingInput && phaseRef.current === 'idle') me.charge = 0
    const force = g.R0 * 3.1 * (1 + w.perks.legs * 0.12)
    me.vx += (mx * force * dt) / me.mass
    me.vy += (my * force * dt) / me.mass
    if (Math.hypot(mx, my) > 0.25) me.face = turn(me.face, Math.atan2(my, mx), dt * 9)
    else me.face = turn(me.face, Math.atan2(ai.y - me.y, ai.x - me.x), dt * 5)
  }

  function turn(a: number, b: number, k: number) {
    let d = b - a
    while (d > Math.PI) d -= Math.PI * 2
    while (d < -Math.PI) d += Math.PI * 2
    return a + d * Math.min(1, k)
  }

  function controlAI(w: World, dt: number) {
    const g = geo()
    const me = w.me
    const ai = w.ai
    const r = w.rival
    const pw = rivalPower(w)
    const R = g.R0 * w.R
    w.modeT -= dt
    const dx = me.x - ai.x
    const dy = me.y - ai.y
    const d = Math.hypot(dx, dy) || 1
    let fx2 = 0
    let fy2 = 0
    // React to an incoming player charge with a sidestep.
    if (me.dashT > 0.3 && w.mode !== 'charge' && w.mode !== 'brake') {
      const toward = (me.vx * -dx + me.vy * -dy) / (d * (Math.hypot(me.vx, me.vy) || 1))
      if (toward > 0.8 && d < g.r * 6 && Math.random() < r.sidestep * dt * 12) {
        const side = Math.random() < 0.5 ? -1 : 1
        ai.vx += (-dy / d) * side * g.R0 * 2.2 * r.speed
        ai.vy += (dx / d) * side * g.R0 * 2.2 * r.speed
        fx.burst(ai.x, ai.y, { count: 8, color: ['#d6a15e', '#f5deb3'], speed: 120, size: 3, gravity: 0 })
        if (au()) sfx.whoosh()
        w.modeT = 0.4
        w.mode = 'recover'
      }
    }
    w.sigCd -= dt
    const myD = Math.hypot(me.x - g.cx, me.y - g.cy)
    if (w.modeT <= 0) {
      // Choose the next move.
      const roll = Math.random()
      const stomper = r.sig === 'stomp' || r.sig === 'storm'
      if (w.combo) {
        // Second half of a double charge: a shorter wind-up.
        w.mode = 'brake'
        w.modeT = 0.45
      } else if (stomper && w.sigCd <= 0 && d < g.r * 5) {
        w.mode = 'stomp'
        w.modeT = 0.95
        w.sigCd = rand(4.5, 6.5)
        if (au()) fx.text(ai.x, ai.y - g.r * 1.6, 'SHIKO!', '#fca5a5', 16)
      } else if (r.sig === 'throw' && w.sigCd <= 0 && d < g.r * 2.5 && myD > R * 0.6) {
        w.mode = 'grip'
        w.modeT = 0.6
        w.sigCd = rand(3.5, 5)
        if (au()) fx.text(ai.x, ai.y - g.r * 1.6, 'GRIP!', '#fca5a5', 16)
      } else if (roll < r.charge * 0.6 && d > g.r * 2.6) {
        w.mode = 'brake'
        w.modeT = 0.75 - Math.min(0.3, w.tier * 0.08)
      } else if (roll < 0.75) {
        w.mode = 'push'
        w.modeT = rand(1, 2)
      } else {
        w.mode = 'circle'
        w.modeT = rand(0.6, 1.2)
        w.circleDir = Math.random() < 0.5 ? -1 : 1
      }
    }
    const force = g.R0 * 3.1 * r.force * r.speed * pw
    if (w.mode === 'push' || w.mode === 'circle' || w.mode === 'recover') {
      // Get between the player and the centre, then drive outward.
      const pcx = me.x - g.cx
      const pcy = me.y - g.cy
      const pd = Math.hypot(pcx, pcy) || 1
      const tx = me.x - (pcx / pd) * g.r * 1.8
      const ty = me.y - (pcy / pd) * g.r * 1.8
      const aiCenter = Math.hypot(ai.x - g.cx, ai.y - g.cy)
      let ax = tx - ai.x
      let ay = ty - ai.y
      if (aiCenter < pd || d < g.r * 2.3) {
        ax = dx
        ay = dy
      }
      if (w.mode === 'circle') {
        ax += (-dy / d) * w.circleDir * d
        ay += (dx / d) * w.circleDir * d
      }
      // Don't wander out of the ring yourself.
      if (aiCenter > R * 0.8) {
        ax += (g.cx - ai.x) * 1.5
        ay += (g.cy - ai.y) * 1.5
      }
      const al = Math.hypot(ax, ay) || 1
      fx2 = (ax / al) * force * (w.mode === 'recover' ? 0.3 : 1)
      fy2 = (ay / al) * force * (w.mode === 'recover' ? 0.3 : 1)
      ai.face = turn(ai.face, Math.atan2(dy, dx), dt * 6)
    } else if (w.mode === 'brake') {
      // Telegraphed charge: plant, glow, then launch.
      ai.charge = Math.min(1, ai.charge + dt / 0.75)
      ai.face = turn(ai.face, Math.atan2(dy, dx), dt * 8)
      if (w.modeT <= 0.02) {
        if (!w.combo && Math.random() < r.feint) {
          // Feint: the glow fades and he keeps pushing instead.
          ai.charge = 0
          w.mode = 'push'
          w.modeT = rand(0.6, 1)
          if (au()) fx.text(ai.x, ai.y - g.r * 1.6, 'FEINT!', '#fde68a', 14)
        } else {
          dash(ai, Math.cos(ai.face), Math.sin(ai.face), 0.75 * pw)
          w.combo = !w.combo && (r.sig === 'double' || r.sig === 'storm')
          w.mode = 'charge'
          w.modeT = 0.6
        }
      }
    } else if (w.mode === 'stomp') {
      // Shiko stomp: leg up (red glow), then a shockwave that shoves anyone close.
      ai.charge = Math.min(1, ai.charge + dt / 0.95)
      ai.vx *= Math.exp(-6 * dt)
      ai.vy *= Math.exp(-6 * dt)
      if (w.modeT <= 0.02) {
        ai.charge = 0
        ai.squash = 1
        const range = g.r * 4.4
        fx.ring(ai.x, ai.y, { color: '#fca5a5', maxR: range, life: 0.45, width: 5 })
        fx.burst(ai.x, ai.y, { count: 22, color: w.venue.dust, speed: 260, size: 4, gravity: 0, drag: 3 })
        fx.shake(9, 0.3)
        if (au()) {
          sfx.boom(0.6)
          haptic.heavy()
        }
        if (d < range) {
          const k = (1 - d / range) * g.R0 * 2.4 * pw
          me.vx += ((dx / d) * k) / me.mass
          me.vy += ((dy / d) * k) / me.mass
          w.lastHit = 'ai'
        }
        w.mode = 'recover'
        w.modeT = 0.5
      }
    } else if (w.mode === 'grip') {
      // Edge throw: grabs you near the straw — break contact during the glow to escape.
      ai.charge = Math.min(1, ai.charge + dt / 0.6)
      ai.face = turn(ai.face, Math.atan2(dy, dx), dt * 8)
      fx2 = (dx / d) * force * 0.5
      fy2 = (dy / d) * force * 0.5
      if (d > g.r * 2.8) {
        ai.charge = 0
        w.mode = 'recover'
        w.modeT = 0.4
        if (au()) fx.text(me.x, me.y - g.r * 1.6, 'ESCAPED!', '#86efac', 15)
      } else if (w.modeT <= 0.02) {
        ai.charge = 0
        const ox = (me.x - g.cx) / (myD || 1)
        const oy = (me.y - g.cy) / (myD || 1)
        const tx = -oy * w.circleDir
        const ty = ox * w.circleDir
        const k = g.R0 * 1.8 * pw
        me.vx += ((ox * 0.85 + tx * 0.6) * k) / me.mass
        me.vy += ((oy * 0.85 + ty * 0.6) * k) / me.mass
        w.lastHit = 'ai'
        fx.ring(me.x, me.y, { color: '#fca5a5', maxR: g.r * 2.4, life: 0.3 })
        fx.stop(0.07)
        if (au()) {
          sfx.slash()
          haptic.heavy()
        }
        w.mode = 'recover'
        w.modeT = 0.5
      }
    }
    ai.vx += (fx2 * dt) / ai.mass
    ai.vy += (fy2 * dt) / ai.mass
  }

  function physics(w: World, dt: number) {
    const g = geo()
    const R = g.R0 * w.R
    const ws = [w.me, w.ai]
    for (const wr of ws) {
      const dist = Math.hypot(wr.x - g.cx, wr.y - g.cy)
      // Feet dig in near the straw.
      let fric = w.venue.fric
      if (dist > R * 0.78) fric += wr === w.me ? run.level('grip') * 1.2 + w.perks.grip * 1.2 : 0.6 + w.rival.grip * 1.4 + w.tier * 0.3
      const k = Math.exp(-fric * dt)
      wr.vx *= k
      wr.vy *= k
      wr.x += wr.vx * dt
      wr.y += wr.vy * dt
      wr.dashT = Math.max(0, wr.dashT - dt)
      wr.slapT = Math.max(0, wr.slapT - dt)
      wr.squash = Math.max(0, wr.squash - dt * 4)
      const sp = Math.hypot(wr.vx, wr.vy)
      wr.step += sp * dt * 0.08
      if (sp > g.R0 * 1.2 && Math.random() < 0.4) fx.burst(wr.x, wr.y, { count: 1, color: w.venue.dust, speed: 40, size: 4, gravity: 0, drag: 4, life: 0.5 })
    }
    // Body contact
    const a = w.me
    const b = w.ai
    const dx = b.x - a.x
    const dy = b.y - a.y
    const d = Math.hypot(dx, dy)
    const min = g.r * 2
    if (d < min && d > 0) {
      const nx = dx / d
      const ny = dy / d
      const over = min - d
      const ta = 1 / a.mass
      const tb = 1 / b.mass
      a.x -= nx * over * (ta / (ta + tb))
      a.y -= ny * over * (ta / (ta + tb))
      b.x += nx * over * (tb / (ta + tb))
      b.y += ny * over * (tb / (ta + tb))
      const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
      if (vn < 0) {
        const j = (-(1 + 0.25) * vn) / (ta + tb)
        a.vx -= j * ta * nx
        a.vy -= j * ta * ny
        b.vx += j * tb * nx
        b.vy += j * tb * ny
        const impact = -vn / g.R0
        if (impact > 0.6) {
          const ix = a.x + nx * g.r
          const iy = a.y + ny * g.r
          fx.burst(ix, iy, { count: Math.round(6 + impact * 6), color: ['#ffffff', '#fde68a', '#d6a15e'], speed: 200 + impact * 80, shape: 'spark', gravity: 0 })
          fx.shake(Math.min(10, impact * 3), 0.2)
          if (impact > 1.5) fx.stop(0.06)
          a.squash = 1
          b.squash = 1
          if (au()) {
            sfx.thud()
            if (impact > 1.5) sfx.hit()
          }
          if (impact > 1.2 && au()) haptic.medium()
          w.crowd = Math.max(w.crowd, 0.5)
        }
      }
      // Dash hits shove hard; ongoing contact trades slaps.
      for (const [att, def, sgn] of [
        [a, b, 1],
        [b, a, -1],
      ] as [Wrestler, Wrestler, number][]) {
        if (att.dashT > 0) {
          const bonus = (att === a ? 1 + w.perks.thunder * 0.2 + run.level('dash') * 0.15 : rivalPower(w)) * g.R0 * 1.6
          def.vx += (nx * sgn * bonus) / def.mass
          def.vy += (ny * sgn * bonus) / def.mass
          att.dashT = 0
          att.vx *= 0.3
          att.vy *= 0.3
          w.lastHit = att === a ? 'me' : 'ai'
          fx.ring((a.x + b.x) / 2, (a.y + b.y) / 2, { color: '#fde68a', maxR: g.r * 2.5, life: 0.3 })
          fx.stop(0.08)
          if (au()) sfx.boom(0.35)
        }
        if (att.slapT <= 0) {
          att.slapT = rand(0.16, 0.26)
          att.slapSide = -att.slapSide
          const slap = (att === a ? 1 + w.perks.slap * 0.25 : rivalPower(w) * w.rival.force * w.rival.slap) * g.R0 * 0.3
          def.vx += (nx * sgn * slap) / def.mass
          def.vy += (ny * sgn * slap) / def.mass
          const sx = att.x + nx * sgn * g.r * 1.05 + -ny * att.slapSide * g.r * 0.4
          const sy = att.y + ny * sgn * g.r * 1.05 + nx * att.slapSide * g.r * 0.4
          fx.burst(sx, sy, { count: 5, color: ['#ffffff', '#fef3c7'], speed: 140, size: 2, shape: 'spark', gravity: 0, life: 0.25 })
          if (au() && att === a) sfx.tap()
          if (att === a) w.lastHit = 'me'
        }
      }
    }
  }

  function checkOut(w: World) {
    const g = geo()
    const R = g.R0 * w.R
    for (const wr of [w.me, w.ai]) {
      if (Math.hypot(wr.x - g.cx, wr.y - g.cy) > R + g.r * 0.15) {
        wr.out = true
        endBout(w, wr === w.ai)
        return
      }
    }
  }

  function endBout(w: World, iWon: boolean) {
    const g = geo()
    const live = phaseRef.current === 'play'
    w.bout = 'end'
    w.bT = 0
    const loser = iWon ? w.ai : w.me
    fx.explode(loser.x, loser.y, 1.2, ['#d6a15e', '#f5deb3', '#b7814a', '#ffffff'])
    fx.slowmo(0.7, 0.3)
    w.crowd = 1.4
    if (!live) return
    if (iWon && w.inv <= 0) {
      // Was it a charge, a dodge or a plain push?
      const by: 'push' | 'charge' | 'dodge' = w.me.dashT > 0 || Math.hypot(w.ai.vx, w.ai.vy) > g.R0 * 2.2 ? 'charge' : w.lastHit === 'ai' ? 'dodge' : 'push'
      w.winBy = by
      w.myWins += 1
      w.stats.bouts += 1
      if (by === 'charge') {
        w.stats.charges += 1
        w.chargeWin = true
      }
      const pts = 100 * (w.stage + 1) + (by === 'charge' ? 50 : by === 'dodge' ? 80 : 0)
      w.score += pts
      fx.text(g.cx, g.cy - g.R0 * 0.2, `+${pts}`, '#fde68a', 22)
      setBanner({ key: Date.now(), text: KIMARITE[by], sub: `${w.myWins} – ${w.aiWins}` })
      sfx.win()
      haptic.success()
    } else if (!iWon) {
      w.aiWins += 1
      fx.flash('#ef4444', 0.25)
      setBanner({ key: Date.now(), text: 'OUT!', sub: `${w.myWins} – ${w.aiWins}` })
      sfx.hurt()
      haptic.error()
    }
    run.update(w.stats)
    pushHud()
  }

  function afterBout(w: World) {
    if (w.myWins >= 2) {
      const sweep = w.aiWins === 0
      if (sweep) w.stats.sweeps += 1
      if (w.rival.boss) {
        w.stats.bosses += 1
        milestone('yokozuna', w.stage + 1)
      } else if ((w.stage + 1) % 3 === 0) milestone('stage', w.stage + 1)
      const bonus = 300 * (w.stage + 1) + (sweep ? 200 : 0)
      w.score += bonus
      // Stars: win = 1, 2–0 sweep = +1, a bout won with a charge = +1.
      const stars = 1 + (sweep ? 1 : 0) + (w.chargeWin ? 1 : 0)
      run.completeLevel(w.stage + 1, stars)
      setBanner({ key: Date.now(), text: w.rival.boss ? 'NEW YOKOZUNA!' : 'MATCH WON!', sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${sweep ? 'sweep ' : ''}+${bonus}` })
      sfx.levelUp()
      run.update(w.stats)
      pushHud()
      w.bout = 'ready'
      w.bT = -99
      window.setTimeout(() => {
        if (phaseRef.current !== 'play') return
        setChoices([...PERKS].sort(() => Math.random() - 0.5).slice(0, 3))
        setPhaseBoth('perk')
      }, 1300)
    } else if (w.aiWins >= 2) {
      loseMatch()
    } else startBout(w)
  }

  function choosePerk(p: Perk) {
    const w = world.current
    w.perks[p.id] += 1
    w.stage += 1
    sfx.power()
    haptic.medium()
    setPhaseBoth('play')
    startMatch(w)
  }

  function loseMatch() {
    const w = world.current
    setPhaseBoth('dying')
    sfx.lose()
    setBanner({ key: Date.now(), text: 'DEFEATED', sub: `${w.rival.name} wins ${w.aiWins}–${w.myWins}` })
    window.setTimeout(() => {
      setPhaseBoth('over')
      const coins = Math.round(3 + w.stats.bouts * 3 + (w.stats.stage - 1) * 8 + w.stats.bosses * 20)
      run.end({ score: w.score, cleared: w.stats.stage >= 3, stats: { ...w.stats }, coins }, revive)
    }, 1300)
  }

  /** Ad revive: the last lost bout is wiped off the board and a fresh bout begins. */
  function revive() {
    const w = world.current
    w.aiWins = Math.max(0, w.aiWins - 1)
    w.inv = 0
    startBout(w)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: `${w.myWins} – ${w.aiWins} · fresh bout` })
    pushHud()
    setPhaseBoth('play')
  }

  // ── Drawing ─────────────────────────────────────────────

  function buildBg(W: number, H: number, V: Venue) {
    const g = geo()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const c = document.createElement('canvas')
    c.width = Math.round(W * dpr)
    c.height = Math.round(H * dpr)
    const x = c.getContext('2d')!
    x.scale(dpr, dpr)
    x.fillStyle = V.floor
    x.fillRect(0, 0, W, H)
    // Spectators on cushions around the platform
    const sq = Math.min(g.R0 * 1.22, W / 2 - 4)
    const pal = V.crowd ?? ['#000000']
    const skins = ['#f1c27d', '#e0ac69', '#ffdbac', '#c68642']
    x.fillStyle = V.rows
    for (let yy = 0; yy < H; yy += 17) x.fillRect(0, yy + 12, W, 3)
    if (V.crowd) for (let yy = 8; yy < H; yy += 17) {
      for (let xx = 8 + ((yy / 17) % 2) * 8; xx < W; xx += 16) {
        if (Math.abs(xx - g.cx) < sq + 8 && Math.abs(yy - g.cy) < sq + 10) continue
        const n = Math.abs(Math.round(xx * 7 + yy * 13 + ((xx * yy) % 11)))
        x.fillStyle = pal[n % pal.length]
        x.beginPath()
        x.ellipse(xx, yy + 3, 6.5, 5, 0, 0, Math.PI * 2)
        x.fill()
        x.fillStyle = skins[n % skins.length]
        x.beginPath()
        x.arc(xx, yy - 1, 3.6, 0, Math.PI * 2)
        x.fill()
        x.fillStyle = '#1f2937'
        x.beginPath()
        x.arc(xx, yy - 2, 3.6, Math.PI, Math.PI * 2)
        x.fill()
      }
    }
    drawDecor(x, V, W, H, sq)
    // Raised clay platform
    x.fillStyle = shade(V.plat[1], 0.6)
    x.fillRect(g.cx - sq - 6, g.cy - sq + 4, sq * 2 + 12, sq * 2 + 8)
    const plat = x.createLinearGradient(0, g.cy - sq, 0, g.cy + sq)
    plat.addColorStop(0, V.plat[0])
    plat.addColorStop(1, V.plat[1])
    x.fillStyle = plat
    x.fillRect(g.cx - sq, g.cy - sq, sq * 2, sq * 2)
    // Sand speckle
    for (let i = 0; i < 500; i++) {
      x.fillStyle = Math.random() < 0.5 ? 'rgba(255,240,210,0.18)' : 'rgba(90,50,20,0.14)'
      x.fillRect(g.cx - sq + Math.random() * sq * 2, g.cy - sq + Math.random() * sq * 2, 1.5, 1.5)
    }
    // Ring floor
    const ring = x.createRadialGradient(g.cx, g.cy, g.R0 * 0.1, g.cx, g.cy, g.R0)
    ring.addColorStop(0, V.ring[0])
    ring.addColorStop(1, V.ring[1])
    x.fillStyle = ring
    x.beginPath()
    x.arc(g.cx, g.cy, g.R0, 0, Math.PI * 2)
    x.fill()
    // Shikiri lines
    x.fillStyle = '#ffffff'
    x.fillRect(g.cx - g.r * 0.9, g.cy - g.R0 * 0.14, g.r * 1.8, 3)
    x.fillRect(g.cx - g.r * 0.9, g.cy + g.R0 * 0.14 - 3, g.r * 1.8, 3)
    // Tassels at the corners
    const tassels = ['#1d4ed8', '#dc2626', '#f8fafc', '#111827']
    ;[
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].forEach(([sx, sy], i) => {
      const tx = g.cx + sx * (sq - 8)
      const ty = g.cy + sy * (sq - 8)
      x.fillStyle = tassels[i]
      x.beginPath()
      x.arc(tx, ty, 9, 0, Math.PI * 2)
      x.fill()
      x.strokeStyle = 'rgba(0,0,0,0.4)'
      x.lineWidth = 2
      x.stroke()
    })
    // Darken the top strip so the HUD reads over the crowd.
    const top = x.createLinearGradient(0, 0, 0, 76)
    top.addColorStop(0, 'rgba(20,8,2,0.85)')
    top.addColorStop(1, 'rgba(20,8,2,0)')
    x.fillStyle = top
    x.fillRect(0, 0, W, 76)
    return c
  }

  /** Venue scenery painted into the cached background around the platform. */
  function drawDecor(x: CanvasRenderingContext2D, V: Venue, W: number, H: number, sq: number) {
    const g = geo()
    const top = g.cy - sq
    const bot = g.cy + sq
    if (V.decor === 'torii') {
      // Pine silhouettes and a red torii gate above the ring.
      for (let i = 0; i < 9; i++) {
        const px = (i / 8) * W
        const py = i % 2 ? H - 30 : 110
        x.fillStyle = i % 3 ? '#0d1a0c' : '#1a2e17'
        x.beginPath()
        x.moveTo(px, py - 70)
        x.lineTo(px - 30, py + 10)
        x.lineTo(px + 30, py + 10)
        x.closePath()
        x.fill()
      }
      const ty = Math.max(78, top - 46)
      x.fillStyle = '#b91c1c'
      x.fillRect(g.cx - sq * 0.75, ty, 8, 46)
      x.fillRect(g.cx + sq * 0.75 - 8, ty, 8, 46)
      x.fillRect(g.cx - sq * 0.95, ty - 4, sq * 1.9, 9)
      x.fillStyle = '#111827'
      x.fillRect(g.cx - sq * 1.0, ty - 12, sq * 2.0, 7)
      x.fillStyle = '#b91c1c'
      x.fillRect(g.cx - sq * 0.8, ty + 12, sq * 1.6, 6)
    } else if (V.decor === 'lanterns' || V.decor === 'neon') {
      const cols = V.decor === 'neon' ? ['#22d3ee', '#e879f9', '#a3e635'] : ['#ef4444', '#f97316', '#facc15']
      for (const yy of [top - 22, bot + 22]) {
        if (yy < 70 || yy > H - 6) continue
        x.strokeStyle = 'rgba(255,255,255,0.25)'
        x.lineWidth = 1
        x.beginPath()
        x.moveTo(0, yy - 10)
        x.quadraticCurveTo(W / 2, yy + 6, W, yy - 10)
        x.stroke()
        for (let i = 0; i < 9; i++) {
          const lx = ((i + 0.5) / 9) * W
          const ly = yy - 10 + Math.sin((i / 8) * Math.PI) * 9
          const c = cols[i % cols.length]
          const gl = x.createRadialGradient(lx, ly + 6, 1, lx, ly + 6, 22)
          gl.addColorStop(0, c + '88')
          gl.addColorStop(1, c + '00')
          x.fillStyle = gl
          x.fillRect(lx - 22, ly - 16, 44, 44)
          x.fillStyle = c
          x.beginPath()
          if (V.decor === 'neon') x.roundRect(lx - 7, ly, 14, 10, 3)
          else x.ellipse(lx, ly + 6, 7, 9, 0, 0, Math.PI * 2)
          x.fill()
        }
      }
    } else if (V.decor === 'snow') {
      for (let i = 0; i < 160; i++) {
        x.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.5})`
        x.beginPath()
        x.arc(Math.random() * W, Math.random() * H, Math.random() * 2 + 0.6, 0, Math.PI * 2)
        x.fill()
      }
    } else if (V.decor === 'waves') {
      const sea = x.createLinearGradient(0, 70, 0, top)
      sea.addColorStop(0, '#f97316')
      sea.addColorStop(0.5, '#be185d')
      sea.addColorStop(1, '#0e7490')
      x.fillStyle = sea
      x.fillRect(0, 70, W, Math.max(0, top - 80))
      x.fillStyle = '#fde68a'
      x.beginPath()
      x.arc(W * 0.78, 70 + Math.max(10, (top - 80) * 0.45), 18, 0, Math.PI * 2)
      x.fill()
      x.strokeStyle = 'rgba(255,255,255,0.35)'
      x.lineWidth = 2
      for (let i = 0; i < 4; i++) {
        const yy = top - 14 - i * 9
        if (yy < 76) continue
        x.beginPath()
        for (let xx = 0; xx <= W; xx += 12) x.lineTo(xx, yy + Math.sin(xx * 0.08 + i) * 2)
        x.stroke()
      }
    } else if (V.decor === 'blossom') {
      for (let i = 0; i < 70; i++) {
        const bx = Math.random() * W
        const by = 70 + Math.random() * (H - 70)
        if (Math.abs(bx - g.cx) < sq && Math.abs(by - g.cy) < sq) continue
        x.fillStyle = Math.random() < 0.5 ? '#fbcfe8' : '#f9a8d4'
        x.beginPath()
        x.ellipse(bx, by, 4, 2.4, Math.random() * Math.PI, 0, Math.PI * 2)
        x.fill()
      }
    }
  }

  function drawTawara(ctx: CanvasRenderingContext2D, R: number) {
    const g = geo()
    const V = world.current.venue
    ctx.strokeStyle = V.straw[0]
    ctx.lineWidth = g.r * 0.5
    ctx.beginPath()
    ctx.arc(g.cx, g.cy, R + g.r * 0.25, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = V.straw[1]
    ctx.lineWidth = g.r * 0.36
    ctx.stroke()
    ctx.strokeStyle = 'rgba(120,90,40,0.6)'
    ctx.lineWidth = 1.5
    const segs = 28
    ctx.beginPath()
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2
      ctx.moveTo(g.cx + Math.cos(a) * (R + g.r * 0.07), g.cy + Math.sin(a) * (R + g.r * 0.07))
      ctx.lineTo(g.cx + Math.cos(a) * (R + g.r * 0.43), g.cy + Math.sin(a) * (R + g.r * 0.43))
    }
    ctx.stroke()
  }

  function drawWrestler(ctx: CanvasRenderingContext2D, wr: Wrestler, time: number, telegraph: boolean) {
    const g = geo()
    const r = g.r * Math.sqrt(wr.mass) * 0.95
    const sq = wr.squash * 0.12
    ctx.save()
    ctx.translate(wr.x, wr.y)
    // Shadow
    ctx.fillStyle = 'rgba(40,20,5,0.35)'
    ctx.beginPath()
    ctx.ellipse(r * 0.12, r * 0.2, r * 1.15, r * 1.05, 0, 0, Math.PI * 2)
    ctx.fill()
    if (wr.charge > 0.05) {
      const col = telegraph ? '#ef4444' : '#fde047'
      glow(ctx, 0, 0, r * (1.6 + wr.charge), col, 0.35 + wr.charge * 0.35)
      ctx.strokeStyle = col
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(0, 0, r * 1.35, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * wr.charge)
      ctx.stroke()
    }
    if (wr.boss) glow(ctx, 0, 0, r * 1.8, '#fde047', 0.2 + Math.sin(time * 4) * 0.05)
    ctx.rotate(wr.face + Math.PI / 2)
    ctx.scale(1 + sq, 1 - sq)
    // Feet stepping behind
    const st = Math.sin(wr.step * Math.PI * 2)
    ctx.fillStyle = shade(wr.skin, 0.8)
    ctx.beginPath()
    ctx.ellipse(-r * 0.5, r * 0.75 + st * r * 0.15, r * 0.24, r * 0.32, 0, 0, Math.PI * 2)
    ctx.ellipse(r * 0.5, r * 0.75 - st * r * 0.15, r * 0.24, r * 0.32, 0, 0, Math.PI * 2)
    ctx.fill()
    // Arms reaching forward; slapping hand pushes out.
    const slapK = wr.slapT > 0 ? Math.sin((wr.slapT / 0.22) * Math.PI) : 0
    for (const side of [-1, 1]) {
      const ext = side === wr.slapSide ? slapK : 0
      const charging = wr.charge > 0.05 ? 1 : 0
      const hx = side * r * (0.85 - charging * 0.15)
      const hy = -r * (0.75 + ext * 0.6 - charging * 0.3)
      ctx.strokeStyle = shade(wr.skin, 0.85)
      ctx.lineCap = 'round'
      ctx.lineWidth = r * 0.42
      ctx.beginPath()
      ctx.moveTo(side * r * 0.75, -r * 0.1)
      ctx.lineTo(hx, hy)
      ctx.stroke()
      ctx.fillStyle = wr.skin
      ctx.beginPath()
      ctx.arc(hx, hy, r * 0.25, 0, Math.PI * 2)
      ctx.fill()
    }
    // Body
    const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r * 1.05)
    bg.addColorStop(0, '#fff3e0')
    bg.addColorStop(0.25, wr.skin)
    bg.addColorStop(1, shade(wr.skin, 0.65))
    ctx.fillStyle = bg
    ctx.beginPath()
    ctx.ellipse(0, 0, r, r * 0.9, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(60,30,10,0.45)'
    ctx.lineWidth = 2
    ctx.stroke()
    // Mawashi belt (back knot visible from above)
    ctx.strokeStyle = wr.belt
    ctx.lineWidth = r * 0.24
    ctx.beginPath()
    ctx.ellipse(0, r * 0.1, r * 0.92, r * 0.78, 0, 0.15 * Math.PI, 0.85 * Math.PI)
    ctx.stroke()
    ctx.fillStyle = shade(wr.belt, 0.7)
    ctx.beginPath()
    ctx.roundRect(-r * 0.2, r * 0.68, r * 0.4, r * 0.3, r * 0.08)
    ctx.fill()
    if (wr.boss) {
      // Yokozuna rope
      ctx.strokeStyle = '#f8fafc'
      ctx.lineWidth = r * 0.12
      ctx.beginPath()
      ctx.ellipse(0, r * 0.05, r * 0.95, r * 0.82, 0, 0.1 * Math.PI, 0.9 * Math.PI)
      ctx.stroke()
    }
    // Body marks: war paint / scar across the shoulders
    if (wr.mark === 'paint') {
      ctx.strokeStyle = '#dc2626'
      ctx.lineWidth = r * 0.08
      ctx.lineCap = 'round'
      ctx.beginPath()
      for (const sd of [-1, 1]) {
        ctx.moveTo(sd * r * 0.45, -r * 0.45)
        ctx.lineTo(sd * r * 0.8, -r * 0.05)
        ctx.moveTo(sd * r * 0.35, -r * 0.2)
        ctx.lineTo(sd * r * 0.65, r * 0.15)
      }
      ctx.stroke()
    } else if (wr.mark === 'scar') {
      ctx.strokeStyle = 'rgba(120,40,30,0.7)'
      ctx.lineWidth = r * 0.05
      ctx.beginPath()
      ctx.moveTo(-r * 0.7, r * 0.3)
      ctx.lineTo(r * 0.2, -r * 0.55)
      ctx.stroke()
    }
    // Head with hair style
    ctx.fillStyle = wr.skin
    ctx.beginPath()
    ctx.arc(0, -r * 0.3, r * 0.42, 0, Math.PI * 2)
    ctx.fill()
    if (wr.mark === 'beard' || wr.mark === 'brows') {
      ctx.fillStyle = wr.mark === 'beard' ? shade(wr.hair === '#e2e8f0' ? '#94a3b8' : '#3b2412', 1) : '#111827'
      ctx.beginPath()
      if (wr.mark === 'beard') ctx.arc(0, -r * 0.42, r * 0.36, Math.PI * 1.1, Math.PI * 1.9)
      else ctx.ellipse(0, -r * 0.62, r * 0.3, r * 0.07, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = wr.hair
    if (wr.hairStyle === 'bald') {
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.beginPath()
      ctx.arc(0, -r * 0.22, r * 0.3, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.beginPath()
      ctx.arc(0, -r * 0.18, r * 0.38, 0, Math.PI * 2)
      ctx.fill()
      if (wr.hairStyle === 'topknot') {
        ctx.beginPath()
        ctx.ellipse(0, -r * 0.42, r * 0.12, r * 0.22, 0, 0, Math.PI * 2)
        ctx.fill()
      } else if (wr.hairStyle === 'bun2') {
        ctx.beginPath()
        ctx.arc(-r * 0.3, -r * 0.1, r * 0.15, 0, Math.PI * 2)
        ctx.arc(r * 0.3, -r * 0.1, r * 0.15, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = wr.belt
        ctx.fillRect(-r * 0.36, -r * 0.13, r * 0.12, r * 0.06)
        ctx.fillRect(r * 0.24, -r * 0.13, r * 0.12, r * 0.06)
      } else if (wr.hairStyle === 'wild') {
        ctx.beginPath()
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * 0.1 + (i / 8) * Math.PI * 0.8
          ctx.moveTo(Math.cos(a) * r * 0.25, -r * 0.18 + Math.sin(a) * r * 0.25)
          ctx.lineTo(Math.cos(a) * r * 0.55, -r * 0.18 + Math.sin(a) * r * 0.5)
          ctx.lineTo(Math.cos(a + 0.18) * r * 0.3, -r * 0.18 + Math.sin(a + 0.18) * r * 0.3)
        }
        ctx.fill()
      } else if (wr.hairStyle === 'mohawk') {
        ctx.fillStyle = wr.belt
        ctx.beginPath()
        ctx.ellipse(0, -r * 0.2, r * 0.09, r * 0.42, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    if (wr.mark === 'mask') {
      // Festival fox mask tied to the side of the head.
      ctx.fillStyle = '#f8fafc'
      ctx.beginPath()
      ctx.moveTo(r * 0.3, -r * 0.5)
      ctx.lineTo(r * 0.62, -r * 0.42)
      ctx.lineTo(r * 0.52, -r * 0.12)
      ctx.lineTo(r * 0.32, -r * 0.18)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#dc2626'
      ctx.fillRect(r * 0.4, -r * 0.36, r * 0.12, r * 0.04)
    }
    ctx.fillStyle = 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.ellipse(-r * 0.12, -r * 0.3, r * 0.1, r * 0.06, -0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  function shade(hex: string, k: number) {
    const n = parseInt(hex.slice(1), 16)
    return `rgb(${Math.round(((n >> 16) & 255) * k)},${Math.round(((n >> 8) & 255) * k)},${Math.round((n & 255) * k)})`
  }

  function drawReferee(ctx: CanvasRenderingContext2D, time: number, w: World) {
    const g = geo()
    const x = g.cx + Math.sin(time * 0.7) * g.R0 * 0.3
    const y = g.cy - g.R0 * 1.08
    ctx.fillStyle = '#7c3aed'
    ctx.beginPath()
    ctx.ellipse(x, y, g.r * 0.7, g.r * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#111827'
    ctx.beginPath()
    ctx.arc(x, y - g.r * 0.05, g.r * 0.3, 0, Math.PI * 2)
    ctx.fill()
    // Gunbai fan points at the leader
    const lead = w.myWins >= w.aiWins ? w.me : w.ai
    const a = Math.atan2(lead.y - y, lead.x - x)
    ctx.strokeStyle = '#78350f'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * g.r * 0.9, y + Math.sin(a) * g.r * 0.9)
    ctx.stroke()
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a) * g.r * 1.15, y + Math.sin(a) * g.r * 1.15, g.r * 0.32, g.r * 0.24, a, 0, Math.PI * 2)
    ctx.fill()
  }

  function simulate(raw: number, time: number) {
    const w = world.current
    const ph = phaseRef.current
    const dt = ph === 'perk' ? 0 : fx.step(raw)
    if (ph === 'perk') fx.step(0)
    const g = geo()

    if (w.me.x === 0) startBout(w)

    if (ph === 'play' || ph === 'idle' || ph === 'dying') {
      w.bT += dt
      if (w.bout === 'ready') {
        if (w.bT > 1.3) {
          w.bout = 'fight'
          w.bT = 0
          if (au()) {
            setBanner({ key: Date.now(), text: 'HAKKEYOI!' })
            sfx.boom(0.3)
            haptic.light()
          }
          // Tachiai: both lunge off the line.
          w.ai.vx = 0
          w.ai.vy = g.R0 * 0.9
          w.me.vy = -g.R0 * 0.4
        }
      } else if (w.bout === 'fight') {
        w.boutT += dt
        // The ring tightens after a while.
        if (w.boutT > 9) w.R = Math.max(0.4, 1 - ((w.boutT - 9) / 26) * 0.6)
        if (w.boutT > 9 && w.boutT - dt <= 9 && au()) fx.text(g.cx, g.cy, 'RING SHRINKING', '#fde68a', 18)
        if (ph !== 'dying') {
          controlMe(w, dt, time)
          controlAI(w, dt)
        }
        physics(w, dt)
        if (ph !== 'dying') checkOut(w)
      } else if (w.bout === 'end') {
        physics(w, dt)
        if (w.bT > 1.6) {
          if (ph === 'idle') startBout(w)
          else if (ph === 'play') afterBout(w)
        }
      }
      w.crowd = Math.max(0, w.crowd - raw * 0.7)
      w.inv = Math.max(0, w.inv - dt)
    }

  }

  function frame({ ctx, w: W, h: H, raw, t: time }: Frame) {
    size.current = { w: W, h: H }
    const reps = import.meta.env.DEV ? devSpeed.current : 1
    for (let i = 0; i < reps; i++) simulate(raw, time)
    const w = world.current
    const ph = phaseRef.current
    const g = geo()

    // ── Draw ──
    const key = `${W}x${H}:${w.venue.id}`
    if (bgCache.current.key !== key) bgCache.current = { key, c: buildBg(W, H, w.venue) }
    fx.applyShake(ctx)
    if (bgCache.current.c) ctx.drawImage(bgCache.current.c, 0, 0, W, H)
    // Crowd excitement: waving shimmer outside the platform
    if (w.crowd > 0) {
      ctx.globalAlpha = Math.min(0.35, w.crowd * 0.3)
      ctx.fillStyle = '#fde68a'
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2 + time
        const rr = g.R0 * (1.35 + (i % 3) * 0.12)
        ctx.beginPath()
        ctx.arc(g.cx + Math.cos(a) * rr, g.cy + Math.sin(a) * rr + Math.sin(time * 14 + i) * 3, 3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    }
    // Shrunk-away ring area turns to dark, scuffed clay.
    const R = g.R0 * w.R
    if (w.R < 1) {
      ctx.fillStyle = 'rgba(90,50,20,0.45)'
      ctx.beginPath()
      ctx.arc(g.cx, g.cy, g.R0, 0, Math.PI * 2)
      ctx.arc(g.cx, g.cy, R + g.r * 0.4, 0, Math.PI * 2, true)
      ctx.fill()
    }
    drawTawara(ctx, R)
    // Danger pulse when you are near the straw
    const myD = Math.hypot(w.me.x - g.cx, w.me.y - g.cy)
    if (ph === 'play' && w.bout === 'fight' && myD > R * 0.8) {
      ctx.strokeStyle = `rgba(239,68,68,${0.4 + Math.sin(time * 12) * 0.25})`
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(g.cx, g.cy, R + g.r * 0.25, 0, Math.PI * 2)
      ctx.stroke()
    }
    drawReferee(ctx, time, w)
    drawWrestler(ctx, w.ai, time, true)
    drawWrestler(ctx, w.me, time, false)
    // Player marker
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    const mr = g.r * Math.sqrt(w.me.mass)
    ctx.moveTo(w.me.x, w.me.y - mr * 1.25 - 4)
    ctx.lineTo(w.me.x - 6, w.me.y - mr * 1.25 - 13)
    ctx.lineTo(w.me.x + 6, w.me.y - mr * 1.25 - 13)
    ctx.closePath()
    ctx.fill()
    if (w.bout === 'ready' && w.bT > 0 && ph !== 'idle') {
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `900 ${Math.round(g.r * 1.2)}px 'Plus Jakarta Sans', system-ui, sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.fillText('READY…', g.cx, g.cy)
    }
    fx.draw(ctx)
    ctx.restore()
    if (ph === 'play') stick.draw(ctx)
    fx.drawOverlay(ctx, W, H)
  }

  useActionCanvas(canvasRef, frame)

  return (
    <GameShell title={meta.title} icon={meta.icon} howTo={meta.howTo}>
      <div className="action-board panel board-host">
        <div className="action-arena" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} className="action-canvas" />
          {phase !== 'idle' && (
            <div className="action-hud">
              <div>
                <div className="action-hud__score">{hud.score}</div>
                <div className="action-hud__small">
                  Level {hud.stage}
                  {hud.tier > 0 ? ` · Tier ${hud.tier + 1}` : ''}
                </div>
              </div>
              <div className="action-hud__right">
                <span className="action-hud__small">{hud.name}</span>
                <span className="action-hud__score" style={{ fontSize: '1.4rem' }}>
                  <span style={{ color: '#fda4af' }}>{hud.my}</span> – <span style={{ color: '#e2e8f0' }}>{hud.ai}</span>
                </span>
              </div>
            </div>
          )}
          {banner && (phase === 'play' || phase === 'dying') ? (
            <div className="action-banner" key={banner.key} onAnimationEnd={() => setBanner(null)}>
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'perk' && (
            <div className="sumo-perk" onPointerDown={(e) => e.stopPropagation()}>
              <h3>Match won!</h3>
              <p>Pick a training perk for this tournament</p>
              <div className="sumo-perk__list">
                {choices.map((p) => (
                  <button key={p.id} type="button" className="sumo-perk__card" onClick={() => choosePerk(p)}>
                    <span className="sumo-perk__icon">{p.icon}</span>
                    <strong>{p.label}</strong>
                    <span>{p.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {phase === 'idle' && (
            <ActionIdle
              game="sumo"
              icon={meta.icon}
              title={meta.title}
              hint="Drag to shove, hold still to charge, release to dash. Push your rival out of the ring — best of 3!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.stage >= 3 ? 'Ozeki material!' : 'Pushed out!'}
            subtitle={`Score ${hud.score} · Level ${hud.stage} · ${hud.my}–${hud.ai}`}
            celebrate={hud.stage >= 3}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
