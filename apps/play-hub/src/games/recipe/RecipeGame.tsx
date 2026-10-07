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
import { BINS, CUSTOMER_KINDS, LABELS, MENU_NAMES, drawBuild, drawCustomer, drawIng, type Menu } from './art'
import { SIG_BY_LEVEL, UNLOCK, genItem, memoTime, parseOrder, pick, type Item } from './levels'

const meta = getGame('recipe')

type Phase = 'idle' | 'play' | 'dying' | 'over'
type Step = 'arrive' | 'ticket' | 'hide' | 'build' | 'serve' | 'leave' | 'clear'
type Order = { items: Item[]; customer: number; total: number }

const TWISTS: Record<number, string> = {
  3: 'New on the menu: drinks!',
  5: 'Rush hour — three in a row',
  6: 'New on the menu: hot dogs!',
  7: 'Special requests: NO onions!',
  9: 'New on the menu: sundaes!',
  10: 'Double helpings (x2)',
  12: 'Combo orders',
}

const WALLS = [
  { wall: '#99f6e4', wall2: '#5eead4', trim: '#0f766e', counter: '#dc2626' },
  { wall: '#fde68a', wall2: '#fcd34d', trim: '#b45309', counter: '#2563eb' },
  { wall: '#fbcfe8', wall2: '#f9a8d4', trim: '#be185d', counter: '#0d9488' },
  { wall: '#c7d2fe', wall2: '#a5b4fc', trim: '#4338ca', counter: '#ea580c' },
]

type World = {
  level: number
  rush: boolean
  ordersLeft: number
  /** Orders in this level (signature levels replay a failed order). */
  ordersTotal: number
  /** Any wrong tray or timeout this level (star rule). */
  levelMistake: boolean
  /** A ticket peek was used this level (star rule). */
  levelPeek: boolean
  theme: number
  score: number
  tips: number
  hearts: number
  maxHearts: number
  peeks: number
  streak: number
  order: Order | null
  itemIdx: number
  stepIdx: number
  built: string[][]
  mistake: boolean
  step: Step
  stepT: number
  stepDur: number
  memT: number
  patience: number
  patMax: number
  peekT: number
  wrongBin: string
  wrongT: number
  hintBin: string
  hintT: number
  drop: number
  custMood: number
  queue: number[]
  dead: boolean
  serveX: number
  stats: { level: number; orders: number; perfect: number; rush: number; tips: number }
}

function freshWorld(): World {
  return {
    level: 0,
    rush: false,
    ordersLeft: 0,
    ordersTotal: 0,
    levelMistake: false,
    levelPeek: false,
    theme: 0,
    score: 0,
    tips: 0,
    hearts: 3,
    maxHearts: 3,
    peeks: 0,
    streak: 0,
    order: null,
    itemIdx: 0,
    stepIdx: 0,
    built: [],
    mistake: false,
    step: 'arrive',
    stepT: 0,
    stepDur: 1,
    memT: 2,
    patience: 10,
    patMax: 10,
    peekT: 0,
    wrongBin: '',
    wrongT: 0,
    hintBin: '',
    hintT: 0,
    drop: 0,
    custMood: 0,
    queue: [],
    dead: false,
    serveX: 0,
    stats: { level: 0, orders: 0, perfect: 0, rush: 0, tips: 0 },
  }
}

export default function RecipeGame() {
  const run = useActionRun('recipe')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fx = useRef(new Fx()).current
  const world = useRef<World>(freshWorld())
  const phaseRef = useRef<Phase>('idle')
  const size = useRef({ w: 360, h: 600 })

  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__recipe = world

  const [phase, setPhase] = useState<Phase>('idle')
  const [hud, setHud] = useState({ score: 0, level: 1, hearts: 3, max: 3, tips: 0, mult: 1 })
  const [banner, setBanner] = useState<{ key: number; text: string; sub?: string } | null>(null)

  function setPhaseBoth(p: Phase) {
    phaseRef.current = p
    setPhase(p)
  }

  function multOf(streak: number) {
    return 1 + Math.min(4, Math.floor(streak / 2))
  }

  function pushHud() {
    const w = world.current
    setHud({ score: w.score, level: Math.max(1, w.level), hearts: w.hearts, max: w.maxHearts, tips: w.tips, mult: multOf(w.streak) })
  }

  function setStep(s: Step, dur: number) {
    const w = world.current
    w.step = s
    w.stepT = 0
    w.stepDur = dur
  }

  function layout() {
    const { w: W, h: H } = size.current
    const sceneB = Math.round(H * 0.5)
    const counterY = sceneB - Math.round(H * 0.1)
    const custR = Math.min(40, W * 0.105)
    return {
      W,
      H,
      sceneB,
      counterY,
      custX: W * 0.2,
      custY: counterY - custR * 1.1,
      custR,
      plateX: W * 0.66,
      plateY: counterY + Math.round(H * 0.07),
      buildW: Math.min(130, W * 0.36),
      binTop: sceneB + 8,
      binBottom: H - 10,
    }
  }

  function currentMenu(): Menu {
    const w = world.current
    return w.order?.items[w.itemIdx]?.menu ?? 'burger'
  }

  function binRects() {
    const L = layout()
    const ids = BINS[currentMenu()]
    const cols = 4
    const rows = 2
    const gap = 8
    const bw = (L.W - 20 - gap * (cols - 1)) / cols
    const bh = (L.binBottom - L.binTop - gap * (rows - 1)) / rows
    return ids.map((id, i) => ({ id, x: 10 + (i % cols) * (bw + gap), y: L.binTop + Math.floor(i / cols) * (bh + gap), w: bw, h: bh }))
  }

  function start(level = run.nextLevel) {
    void unlockAudio()
    const w = freshWorld()
    w.peeks = run.level('peek')
    // Jumping in late: the peeks a run would have earned on the way.
    w.peeks += Math.min(3, Math.floor((level - 1) / 10))
    w.queue = [Math.floor(Math.random() * CUSTOMER_KINDS), Math.floor(Math.random() * CUSTOMER_KINDS)]
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
    w.theme = Math.floor((w.level - 1) / 5) % WALLS.length
    w.rush = w.level % 5 === 0
    const sig = SIG_BY_LEVEL.get(level)
    w.ordersTotal = sig ? sig.orders.length : w.rush ? 3 : 1
    w.ordersLeft = w.ordersTotal
    w.levelMistake = false
    w.levelPeek = false
    const twist = TWISTS[w.level]
    let text = `LEVEL ${w.level}`
    let sub = w.rush ? `Rush hour · ${w.ordersTotal} orders · x2 tips` : twist ?? (w.level === 1 ? 'remember the order' : undefined)
    if (w.rush) text = `BOSS · LEVEL ${w.level}`
    if (sig) sub = w.rush ? `${sig.name} · ${w.ordersTotal} orders · x2` : sig.tip ? `${sig.name} · ${sig.tip}` : sig.name
    setBanner({ key: Date.now(), text, sub })
    if (w.rush) sfx.power()
    else sfx.ready()
    nextOrder()
    run.update(w.stats)
    pushHud()
  }

  function nextOrder() {
    const w = world.current
    const L = w.level
    const unlocked = UNLOCK.filter((u) => u.level <= L).map((u) => u.menu)
    const fresh = UNLOCK.find((u) => u.level === L)
    const sig = SIG_BY_LEVEL.get(L)
    // Breather right after each boss: slightly shorter orders.
    const breather = L > 5 && L % 5 === 1 ? 1 : 0
    let items: Item[]
    if (sig) {
      items = parseOrder(sig.orders[w.ordersTotal - w.ordersLeft])
    } else if (L >= 12 && Math.random() < 0.4) {
      const first = pick(unlocked.filter((m) => m !== 'drink'))
      items = [genItem(first, L, 2), genItem('drink', L, 2)]
    } else {
      const menu = fresh && w.ordersLeft === w.ordersTotal ? fresh.menu : Math.random() < 0.35 ? unlocked[unlocked.length - 1] : pick(unlocked)
      items = [genItem(menu, L, breather)]
    }
    const total = items.reduce((s, it) => s + it.steps.length, 0)
    const customer = w.queue.shift() ?? Math.floor(Math.random() * CUSTOMER_KINDS)
    while (w.queue.length < (L >= 4 || w.rush ? 2 : 1)) w.queue.push(Math.floor(Math.random() * CUSTOMER_KINDS))
    w.order = { items, customer, total }
    w.itemIdx = 0
    w.stepIdx = 0
    w.built = items.map(() => [])
    w.mistake = false
    w.custMood = 0
    w.dead = false
    w.memT = memoTime(total, L, w.rush) * (1 + 0.15 * run.level('memo'))
    w.patMax = 7 + total * 2.2
    w.patience = w.patMax
    setStep('arrive', 0.7)
  }

  function tapBin(id: string) {
    const w = world.current
    if (phaseRef.current !== 'play' || w.step !== 'build' || !w.order) return
    const item = w.order.items[w.itemIdx]
    const exp = item.steps[w.stepIdx]
    const rect = binRects().find((b) => b.id === id)
    const L = layout()
    const bx = rect ? rect.x + rect.w / 2 : L.W / 2
    const by = rect ? rect.y + rect.h / 2 : L.binTop
    if (id === exp) {
      w.built[w.itemIdx].push(id)
      w.stepIdx += 1
      w.drop = 1
      const pts = Math.round((10 + w.level * 2) * multOf(w.streak))
      w.score += pts
      fx.burst(bx, by, { count: 8, color: ['#fde047', '#ffffff'], speed: 150, shape: 'spark', gravity: 100 })
      fx.text(L.plateX, L.plateY - L.buildW * 0.7, `+${pts}`, '#fde047', 16)
      sfx.pop()
      haptic.light()
      if (w.stepIdx >= item.steps.length) {
        if (w.itemIdx < w.order.items.length - 1) {
          w.itemIdx += 1
          w.stepIdx = 0
          sfx.match()
          setBanner({ key: Date.now(), text: `Now the ${MENU_NAMES[w.order.items[w.itemIdx].menu].toLowerCase()}!` })
        } else serve()
      }
      pushHud()
    } else {
      w.mistake = true
      w.levelMistake = true
      w.wrongBin = id
      w.wrongT = 0.5
      w.hintBin = exp
      w.hintT = 1.0
      w.custMood = -1
      w.streak = 0
      w.hearts -= 1
      fx.flash('#ef4444', 0.25)
      fx.shake(9, 0.3)
      fx.text(bx, by - 26, 'WRONG!', '#fca5a5', 20)
      sfx.hurt()
      haptic.error()
      if (w.hearts <= 0) {
        w.dead = true
        setStep('leave', 1.0)
      }
      pushHud()
    }
  }

  function serve() {
    const w = world.current
    const o = w.order!
    const L = layout()
    const perfect = !w.mistake
    const patFrac = clamp(w.patience / w.patMax, 0, 1)
    const tip = Math.round((4 + o.total * 1.5) * (0.6 + 0.4 * patFrac) * (perfect ? 1.5 : 1) * (w.rush ? 2 : 1))
    w.tips += tip
    w.stats.tips = w.tips
    w.stats.orders += 1
    if (perfect) {
      w.streak += 1
      w.stats.perfect += 1
      if (w.streak % 4 === 0) {
        w.peeks += 1
        fx.text(L.W / 2, L.counterY - 80, '+1 PEEK', '#67e8f9', 18)
      }
    }
    const pts = tip * 10 * multOf(w.streak)
    w.score += pts
    w.custMood = 1
    fx.text(L.custX, L.custY - L.custR * 1.6, `+${tip} TIP`, '#fde047', 22)
    fx.text(L.plateX, L.plateY - L.buildW * 0.9, perfect ? 'PERFECT!' : 'ORDER UP!', perfect ? '#86efac' : '#fff', 20)
    fx.burst(L.plateX, L.plateY - 30, { count: 26, color: ['#fde047', '#f59e0b', '#ffffff'], speed: 280, shape: 'square', size: 5, gravity: 500 })
    fx.ring(L.plateX, L.plateY - 20, { color: '#fde047', maxR: 70, life: 0.45, width: 4 })
    fx.stop(0.05)
    if (perfect && w.streak >= 2) sfx.combo()
    else sfx.win()
    haptic.success()
    w.serveX = 0
    run.update(w.stats)
    pushHud()
    setStep('serve', 1.1)
  }

  function timeout() {
    const w = world.current
    const L = layout()
    w.hearts -= 1
    w.levelMistake = true
    w.streak = 0
    w.custMood = -1
    fx.flash('#ef4444', 0.25)
    fx.shake(8, 0.3)
    fx.text(L.custX, L.custY - L.custR * 1.6, 'TOO SLOW!', '#fca5a5', 20)
    sfx.hurt()
    haptic.error()
    if (w.hearts <= 0) w.dead = true
    pushHud()
    setStep('leave', 1.0)
  }

  function doPeek() {
    const w = world.current
    if (phaseRef.current !== 'play' || w.step !== 'build' || w.peeks <= 0 || w.peekT > 0) return
    w.peeks -= 1
    w.levelPeek = true
    w.peekT = 1.0
    sfx.whoosh()
    haptic.light()
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
      const coins = Math.round((w.tips * 0.12 + w.level) * (1 + run.level('tips') * 0.15))
      run.end({ score: w.score, cleared: w.level >= 10, stats: { ...w.stats }, coins }, revive)
    }, 1000)
  }

  /** Revive: two hearts back and the current level starts over. */
  function revive() {
    const w = world.current
    w.hearts = Math.max(w.hearts, Math.min(w.maxHearts, 2))
    w.dead = false
    setPhaseBoth('play')
    beginLevel(w.level)
    setBanner({ key: Date.now(), text: 'REVIVED!', sub: `level ${w.level} again` })
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (phaseRef.current !== 'play') return
    const w = world.current
    const p = localPoint(e, e.currentTarget)
    const L = layout()
    if (w.step === 'ticket' && w.stepT > 0.6) {
      // Tap to say "got it" and start early.
      if (p.y < L.sceneB) {
        w.stepT = w.stepDur
        return
      }
    }
    if (Math.hypot(p.x - (L.W - 34), p.y - (L.counterY - 34)) < 30) {
      doPeek()
      return
    }
    const hit = binRects().find((b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h)
    if (hit) tapBin(hit.id)
  }

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if (phaseRef.current !== 'play') return
      if (e.key === 'p' || e.key === 'P') doPeek()
      const n = Number(e.key)
      if (n >= 1 && n <= 8) {
        const b = binRects()[n - 1]
        if (b) tapBin(b.id)
      }
    }
    window.addEventListener('keydown', down)
    return () => window.removeEventListener('keydown', down)
  }, [])

  function update(dt: number, raw: number) {
    const w = world.current
    w.drop = Math.max(0, w.drop - raw * 6)
    w.wrongT = Math.max(0, w.wrongT - raw)
    w.hintT = Math.max(0, w.hintT - raw)
    if (phaseRef.current !== 'play') return
    if (w.peekT > 0) {
      w.peekT = Math.max(0, w.peekT - raw)
      return
    }
    w.stepT += dt
    if (w.step === 'build') {
      w.patience -= dt
      if (w.custMood === -1 && w.hintT <= 0 && w.patience > w.patMax * 0.3) w.custMood = 0
      if (w.patience < w.patMax * 0.3 && w.custMood === 0) w.custMood = -1
      if (w.patience <= 0) {
        timeout()
        return
      }
      const left = w.patience
      if (left < 3 && Math.floor(left + dt) !== Math.floor(left)) sfx.tick()
    }
    if (w.step === 'serve') w.serveX = Math.min(1, w.stepT / 0.6)
    if (w.stepT < w.stepDur) return
    switch (w.step) {
      case 'arrive':
        setStep('ticket', w.memT)
        sfx.flip()
        break
      case 'ticket':
        setStep('hide', 0.35)
        sfx.whoosh()
        break
      case 'hide':
        setStep('build', 9999)
        break
      case 'serve':
      case 'leave':
        if (w.dead) {
          die()
          return
        }
        // A customer who left unserved is replaced: the level clears only when every order is served.
        if (w.step === 'serve') w.ordersLeft -= 1
        if (w.ordersLeft > 0) nextOrder()
        else levelDone()
        break
      case 'clear':
        beginLevel(w.level + 1)
        break
    }
  }

  function levelDone() {
    const w = world.current
    if (w.rush) {
      w.stats.rush += 1
      if (w.hearts < w.maxHearts) {
        w.hearts += 1
        fx.text(size.current.w / 2, 110, '+1 HEART', '#fca5a5', 22)
      } else {
        w.peeks += 1
        fx.text(size.current.w / 2, 110, '+1 PEEK', '#67e8f9', 22)
      }
      sfx.levelUp()
      void trackEvent('action_milestone', { game_id: 'recipe', kind: 'rush', value: w.level })
    }
    // Stars: served = 1, no wrong tray or timeout = +1, no ticket peek = +1.
    const stars = 1 + (w.levelMistake ? 0 : 1) + (w.levelPeek ? 0 : 1)
    run.completeLevel(w.level, stars)
    const sig = SIG_BY_LEVEL.get(w.level)
    setBanner({
      key: Date.now(),
      text: w.rush ? 'RUSH SURVIVED!' : 'LEVEL CLEAR!',
      sub: `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}${sig ? ' · ' + sig.name : ''}`,
    })
    if (!w.rush) sfx.levelUp()
    w.order = null
    run.update(w.stats)
    pushHud()
    setStep('clear', 1.4)
  }

  // ── Drawing ─────────────────────────────────────────────────
  const font = (s: number, wt = 800) => `${wt} ${s}px 'Plus Jakarta Sans', system-ui, sans-serif`

  function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
  }

  function drawScene(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const L = layout()
    const th = WALLS[w.theme]
    const g = ctx.createLinearGradient(0, 0, 0, L.sceneB)
    g.addColorStop(0, th.wall)
    g.addColorStop(1, th.wall2)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, L.W, L.sceneB)
    // Checker strip
    const cs = 12
    for (let i = 0; i < L.W / cs + 1; i++) {
      for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#ffffff' : '#111827'
        ctx.fillRect(i * cs, L.counterY - 52 + j * cs, cs, cs)
      }
    }
    // Window with sky
    const wx = L.W * 0.36
    const wy = 62
    const ww = L.W * 0.28
    const wh = L.counterY - 52 - wy - 14
    if (wh > 30) {
      ctx.fillStyle = th.trim
      rr(ctx, wx - 4, wy - 4, ww + 8, wh + 8, 8)
      ctx.fill()
      const sky = ctx.createLinearGradient(0, wy, 0, wy + wh)
      sky.addColorStop(0, '#7dd3fc')
      sky.addColorStop(1, '#e0f2fe')
      ctx.fillStyle = sky
      rr(ctx, wx, wy, ww, wh, 6)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      const cx = wx + ((t * 8) % (ww + 40)) - 20
      ctx.save()
      rr(ctx, wx, wy, ww, wh, 6)
      ctx.clip()
      ctx.beginPath()
      ctx.ellipse(cx, wy + wh * 0.35, 14, 6, 0, 0, Math.PI * 2)
      ctx.ellipse(cx + 10, wy + wh * 0.3, 10, 6, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      ctx.strokeStyle = th.trim
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(wx + ww / 2, wy)
      ctx.lineTo(wx + ww / 2, wy + wh)
      ctx.stroke()
    }
    // Hanging lamps
    for (const lx of [L.W * 0.15, L.W * 0.85]) {
      ctx.strokeStyle = '#374151'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(lx, 0)
      ctx.lineTo(lx, 70)
      ctx.stroke()
      ctx.fillStyle = th.trim
      ctx.beginPath()
      ctx.moveTo(lx - 16, 84)
      ctx.quadraticCurveTo(lx, 60, lx + 16, 84)
      ctx.closePath()
      ctx.fill()
      glow(ctx, lx, 90, 50, '#fef9c3', 0.5)
    }
    // Queue (behind the counter, further back)
    w.queue.forEach((k, i) => {
      ctx.globalAlpha = 0.55
      drawCustomer(ctx, k, L.custX - L.custR * (1.4 + i * 1.1), L.custY + 6 - i * 3, L.custR * 0.7, 0, t + i)
      ctx.globalAlpha = 1
    })
    // Current customer
    if (w.order && phaseRef.current !== 'idle') {
      let x = L.custX
      if (w.step === 'arrive') x = -L.custR * 2 + (L.custX + L.custR * 2) * (1 - Math.pow(1 - clamp(w.stepT / w.stepDur, 0, 1), 3))
      if (w.step === 'leave' || (w.step === 'serve' && w.stepT > 0.6)) {
        const k = w.step === 'leave' ? clamp((w.stepT - 0.3) / 0.7, 0, 1) : clamp((w.stepT - 0.6) / 0.5, 0, 1)
        x = L.custX - k * (L.custX + L.custR * 3)
      }
      const bob = Math.sin(t * (w.step === 'arrive' ? 12 : 2)) * (w.step === 'arrive' ? 4 : 2)
      drawCustomer(ctx, w.order.customer, x, L.custY + bob, L.custR, w.custMood, t)
      // Patience bar
      if (w.step === 'build' || w.step === 'hide') {
        const k = clamp(w.patience / w.patMax, 0, 1)
        const bw = L.custR * 2.2
        const by = L.custY - L.custR * 1.55
        ctx.fillStyle = 'rgba(0,0,0,0.35)'
        rr(ctx, x - bw / 2, by, bw, 8, 4)
        ctx.fill()
        ctx.fillStyle = k > 0.5 ? '#22c55e' : k > 0.3 ? '#f59e0b' : '#ef4444'
        rr(ctx, x - bw / 2, by, bw * k, 8, 4)
        ctx.fill()
      }
    } else if (phaseRef.current === 'idle') {
      drawCustomer(ctx, 0, L.custX, L.custY + Math.sin(t * 2) * 2, L.custR, Math.sin(t) > 0 ? 1 : 0, t)
    }
    // Counter
    const cg = ctx.createLinearGradient(0, L.counterY, 0, L.sceneB)
    cg.addColorStop(0, th.counter)
    cg.addColorStop(1, '#450a0a')
    ctx.fillStyle = cg
    ctx.fillRect(0, L.counterY + 8, L.W, L.sceneB - L.counterY - 8)
    ctx.fillStyle = '#e5e7eb'
    ctx.fillRect(0, L.counterY, L.W, 10)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.fillRect(0, L.counterY, L.W, 2)
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect((i / 6) * L.W + 6, L.counterY + 16, L.W / 6 - 12, L.sceneB - L.counterY - 22)
    }
  }

  function drawTicket(ctx: CanvasRenderingContext2D, t: number, k: number) {
    const w = world.current
    const o = w.order
    if (!o || k <= 0.01) return
    const L = layout()
    const tw = Math.min(L.W - 24, 300)
    const iconS = 40
    const perRow = Math.max(3, Math.floor((tw - 20) / (iconS + 6)))
    const heights = o.items.map((it) => 22 + Math.ceil(it.display.length / perRow) * (iconS + 8))
    const th = heights.reduce((s, h) => s + h, 0) + 30
    const tx = L.W / 2 - tw / 2
    const ty = 60
    ctx.save()
    ctx.translate(L.W / 2, ty)
    ctx.scale(1, k)
    ctx.translate(-L.W / 2, -ty)
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    rr(ctx, tx + 3, ty + 5, tw, th, 10)
    ctx.fill()
    ctx.fillStyle = '#fffbeb'
    rr(ctx, tx, ty, tw, th, 10)
    ctx.fill()
    ctx.strokeStyle = '#d6d3d1'
    ctx.lineWidth = 1.5
    ctx.stroke()
    // Zigzag tear edge
    ctx.fillStyle = '#fffbeb'
    ctx.beginPath()
    for (let i = 0; i <= 20; i++) ctx.lineTo(tx + (i / 20) * tw, ty + th + (i % 2 ? 5 : 0))
    ctx.lineTo(tx + tw, ty + th - 2)
    ctx.lineTo(tx, ty + th - 2)
    ctx.fill()
    ctx.fillStyle = '#b91c1c'
    ctx.font = font(12, 900)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const sigName = SIG_BY_LEVEL.get(w.level)?.name
    ctx.fillText(sigName ? sigName.toUpperCase() : `ORDER #${w.level * 7 + w.stats.orders + 12}`, tx + 12, ty + 14)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#78716c'
    ctx.fillText(w.step === 'ticket' ? 'tap when ready' : '', tx + tw - 34, ty + 14)
    let y = ty + 30
    o.items.forEach((it, ii) => {
      ctx.textAlign = 'left'
      ctx.fillStyle = '#1c1917'
      ctx.font = font(13, 900)
      ctx.fillText(MENU_NAMES[it.menu].toUpperCase(), tx + 12, y + 6)
      ctx.strokeStyle = '#e7e5e4'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(tx + 80, y + 6)
      ctx.lineTo(tx + tw - 12, y + 6)
      ctx.stroke()
      it.display.forEach((en, i) => {
        const c = i % perRow
        const r = Math.floor(i / perRow)
        const cx = tx + 12 + c * (iconS + 6) + iconS / 2
        const cy = y + 22 + r * (iconS + 8) + iconS / 2
        ctx.fillStyle = en.no ? '#fee2e2' : '#f5f5f4'
        rr(ctx, cx - iconS / 2, cy - iconS / 2, iconS, iconS, 8)
        ctx.fill()
        ctx.save()
        ctx.translate(cx, cy)
        drawIng(ctx, en.id, iconS * 0.36)
        ctx.restore()
        if (en.no) {
          ctx.strokeStyle = '#dc2626'
          ctx.lineWidth = 3.5
          ctx.beginPath()
          ctx.arc(cx, cy, iconS * 0.42, 0, Math.PI * 2)
          ctx.moveTo(cx - iconS * 0.3, cy + iconS * 0.3)
          ctx.lineTo(cx + iconS * 0.3, cy - iconS * 0.3)
          ctx.stroke()
          ctx.fillStyle = '#dc2626'
          ctx.font = font(10, 900)
          ctx.textAlign = 'center'
          ctx.fillText('NO', cx, cy + iconS * 0.5 + 1)
        }
        if (en.count > 1) {
          ctx.fillStyle = '#2563eb'
          ctx.beginPath()
          ctx.arc(cx + iconS * 0.4, cy - iconS * 0.4, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.font = font(11, 900)
          ctx.textAlign = 'center'
          ctx.fillText(`x${en.count}`, cx + iconS * 0.4, cy - iconS * 0.4 + 0.5)
        }
        // Step numbers keep the order readable.
        if (!en.no) {
          ctx.fillStyle = '#78716c'
          ctx.font = font(9, 900)
          ctx.textAlign = 'left'
          ctx.fillText(String(it.display.slice(0, i + 1).filter((d) => !d.no).length), cx - iconS / 2 + 3, cy - iconS / 2 + 7)
        }
      })
      y += heights[ii]
    })
    // Countdown ring
    if (w.step === 'ticket') {
      const kk = 1 - clamp(w.stepT / w.stepDur, 0, 1)
      const rx = tx + tw - 18
      const ry = ty + 15
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(rx, ry, 10, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = kk < 0.3 ? '#dc2626' : '#16a34a'
      ctx.beginPath()
      ctx.arc(rx, ry, 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * kk)
      ctx.stroke()
    }
    ctx.restore()
    void t
  }

  function drawBins(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    const L = layout()
    ctx.fillStyle = '#292524'
    ctx.fillRect(0, L.sceneB, L.W, L.H - L.sceneB)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    for (let i = 0; i < 10; i++) ctx.fillRect(0, L.sceneB + i * 30, L.W, 1)
    const active = w.step === 'build'
    for (const b of binRects()) {
      const wrong = w.wrongT > 0 && w.wrongBin === b.id
      const hint = w.hintT > 0 && w.hintBin === b.id
      const shake = wrong ? Math.sin(t * 50) * w.wrongT * 10 : 0
      ctx.save()
      ctx.translate(shake, 0)
      ctx.globalAlpha = active || phaseRef.current === 'idle' ? 1 : 0.6
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      rr(ctx, b.x, b.y + 4, b.w, b.h, 12)
      ctx.fill()
      const g = ctx.createLinearGradient(0, b.y, 0, b.y + b.h)
      g.addColorStop(0, '#d6d3d1')
      g.addColorStop(1, '#a8a29e')
      ctx.fillStyle = g
      rr(ctx, b.x, b.y, b.w, b.h, 12)
      ctx.fill()
      ctx.fillStyle = '#57534e'
      rr(ctx, b.x + 5, b.y + 5, b.w - 10, b.h - 24, 9)
      ctx.fill()
      ctx.save()
      ctx.translate(b.x + b.w / 2, b.y + 5 + (b.h - 24) / 2)
      drawIng(ctx, b.id, Math.min(b.w, b.h - 24) * 0.34)
      ctx.restore()
      ctx.fillStyle = '#1c1917'
      ctx.font = font(11, 900)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(LABELS[b.id], b.x + b.w / 2, b.y + b.h - 10)
      if (wrong || hint) {
        ctx.strokeStyle = wrong ? '#ef4444' : '#4ade80'
        ctx.lineWidth = 4
        rr(ctx, b.x, b.y, b.w, b.h, 12)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  function drawPeekBtn(ctx: CanvasRenderingContext2D, t: number) {
    const w = world.current
    if (w.step !== 'build') return
    const L = layout()
    const cx = L.W - 34
    const cy = L.counterY - 34
    const on = w.peeks > 0
    ctx.globalAlpha = on ? 1 : 0.45
    ctx.fillStyle = on ? '#0e7490' : '#334155'
    ctx.beginPath()
    ctx.arc(cx, cy, 20 + (on ? Math.sin(t * 4) * 1.5 : 0), 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#67e8f9'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = '#fffbeb'
    rr(ctx, cx - 8, cy - 11, 16, 20, 3)
    ctx.fill()
    ctx.fillStyle = '#0e7490'
    for (let i = 0; i < 3; i++) ctx.fillRect(cx - 5, cy - 6 + i * 5, 10, 2)
    ctx.fillStyle = '#fde047'
    ctx.beginPath()
    ctx.arc(cx + 15, cy - 15, 9, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#422006'
    ctx.font = font(11, 900)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(w.peeks), cx + 15, cy - 14.5)
    ctx.globalAlpha = 1
  }

  function frame({ ctx, w: W, h: H, raw, t }: Frame) {
    size.current = { w: W, h: H }
    const dt = fx.step(raw)
    update(dt, raw)
    const w = world.current
    const ph = phaseRef.current
    const L = layout()
    ctx.fillStyle = '#1c1917'
    ctx.fillRect(0, 0, W, H)
    fx.applyShake(ctx)
    drawScene(ctx, t)
    // Plate & build
    if (ph === 'idle') {
      drawBuild(ctx, 'burger', ['patty', 'cheese', 'lettuce', 'tomato'], L.plateX, L.plateY, L.buildW, true, 0)
    } else if (w.order) {
      const item = w.order.items[w.itemIdx]
      let px = L.plateX
      if (w.step === 'serve') px = L.plateX - w.serveX * (L.plateX - L.custX - L.custR)
      const ready = w.step === 'serve'
      drawBuild(ctx, item.menu, w.built[w.itemIdx], px, L.plateY, L.buildW, ready, ready ? Math.max(0, 1 - w.stepT * 5) : w.drop)
      // Finished earlier items sit to the side.
      if (w.itemIdx > 0) {
        const prev = w.order.items[0]
        drawBuild(ctx, prev.menu, w.built[0], L.plateX + L.buildW * 0.62, L.plateY + 4, L.buildW * 0.5, true, 0)
      }
      if (w.step === 'build' && w.order.items.length > 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)'
        rr(ctx, L.plateX - 46, L.counterY + 14, 92, 18, 9)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.font = font(11, 900)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${MENU_NAMES[item.menu]} ${w.itemIdx + 1}/${w.order.items.length}`, L.plateX, L.counterY + 23)
      }
    }
    // Ticket
    let tk = 0
    if (w.step === 'ticket') tk = Math.min(1, w.stepT / 0.15)
    else if (w.step === 'hide') tk = 1 - w.stepT / w.stepDur
    if (w.peekT > 0) tk = 1
    if (ph === 'play' || ph === 'dying') drawTicket(ctx, t, tk)
    if (ph === 'play' && w.step === 'build' && w.stepIdx === 0 && w.itemIdx === 0 && w.stepT < 1.6) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      rr(ctx, W / 2 - 80, 70, 160, 30, 15)
      ctx.fill()
      ctx.fillStyle = '#fde047'
      ctx.font = font(14, 900)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('BUILD IT!', W / 2, 85)
    }
    drawBins(ctx, t)
    drawPeekBtn(ctx, t)
    fx.draw(ctx)
    ctx.restore()
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
                <div className="action-hud__score" style={{ color: '#fff' }}>{hud.score}</div>
                <div className="action-hud__small">Level {hud.level} · Tips {hud.tips}</div>
              </div>
              <div className="action-hud__right">
                <span className="action-hearts">
                  {'❤'.repeat(Math.max(0, hud.hearts))}
                  <span style={{ opacity: 0.3 }}>{'❤'.repeat(Math.max(0, hud.max - hud.hearts))}</span>
                </span>
                {hud.mult > 1 ? <span className="action-hud__small" style={{ color: '#fdf4ff' }}>x{hud.mult}</span> : null}
              </div>
            </div>
          )}
          {banner && phase === 'play' ? (
            <div
              className="action-banner"
              key={banner.key}
              style={{ whiteSpace: 'normal', width: 'min(92%, 340px)', textAlign: 'center', lineHeight: 1.05 }}
              onAnimationEnd={() => setBanner(null)}
            >
              {banner.text}
              {banner.sub ? <small>{banner.sub}</small> : null}
            </div>
          ) : null}
          <MissionToast toast={run.toast} />
          {phase === 'idle' && (
            <ActionIdle
              game="recipe"
              icon={meta.icon}
              title={meta.title}
              hint="Read the order ticket before it flips over, then tap the ingredients in the same order. Happy customers tip!"
              onPlay={start}
            />
          )}
          <ActionResult
            run={run}
            title={hud.level >= 10 ? 'Head chef!' : 'Kitchen closed!'}
            subtitle={`Score ${hud.score} · Level ${hud.level} · ${hud.tips} tips`}
            celebrate={hud.level >= 10}
            onPlayAgain={start}
          />
        </div>
      </div>
    </GameShell>
  )
}
