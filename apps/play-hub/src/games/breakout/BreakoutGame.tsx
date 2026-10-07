import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import ImpactFlash from '../../shared/ImpactFlash'
import PlayIdle from '../../shared/PlayIdle'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './breakout.css'

const meta = getGame('breakout')

type ItemKind = 'grow' | 'multi' | 'slow' | 'life' | 'fire' | 'score'

type Brick = { id: number; c: number; r: number; alive: boolean; color: string }
type Ball = { id: number; x: number; y: number; vx: number; vy: number; fire: boolean }
type Drop = { id: number; x: number; y: number; kind: ItemKind }
type Enemy = { id: number; x: number; y: number; vx: number; nextBomb: number; face: string }
type Bomb = { id: number; x: number; y: number; vy: number }

const COLS = 8
const ROWS = 4
const BRICK_W = 11
const BRICK_H = 5
const BRICK_GAP_X = 1.2
const BRICK_GAP_Y = 1.4
const BRICK_ORIGIN_X = (100 - COLS * BRICK_W - (COLS - 1) * BRICK_GAP_X) / 2
const BRICK_ORIGIN_Y = 10
const BASE_PADDLE_W = 18
const PADDLE_H = 2.4
const PADDLE_Y = 92
const BALL_R = 1.6
const DROP_R = 2.4
const BOMB_R = 2.2
const ENEMY_R = 4
const COLORS = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6'] as const
const ENEMY_FACES = ['👾', '👹', '👺', '🦇'] as const

const ITEM_META: Record<ItemKind, { icon: string; label: string; chance: number }> = {
  grow: { icon: '↔️', label: 'Wide', chance: 0.22 },
  multi: { icon: '🎱', label: 'Multi', chance: 0.16 },
  slow: { icon: '🐢', label: 'Slow', chance: 0.18 },
  life: { icon: '❤️', label: 'Life', chance: 0.1 },
  fire: { icon: '🔥', label: 'Fire', chance: 0.14 },
  score: { icon: '⭐', label: '+50', chance: 0.2 },
}

const ITEM_KINDS = Object.keys(ITEM_META) as ItemKind[]

function makeBricks(): Brick[] {
  const list: Brick[] = []
  let id = 1
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      list.push({ id: id++, c, r, alive: true, color: COLORS[r % COLORS.length] })
    }
  }
  return list
}

function brickRect(b: Brick) {
  return {
    x: BRICK_ORIGIN_X + b.c * (BRICK_W + BRICK_GAP_X),
    y: BRICK_ORIGIN_Y + b.r * (BRICK_H + BRICK_GAP_Y),
    w: BRICK_W,
    h: BRICK_H,
  }
}

function pickItem(): ItemKind {
  const roll = Math.random()
  let acc = 0
  for (const kind of ITEM_KINDS) {
    acc += ITEM_META[kind].chance
    if (roll <= acc) return kind
  }
  return 'score'
}

function spawnChance(level: number) {
  return Math.min(0.55, 0.28 + level * 0.04)
}

export default function BreakoutGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [paddleX, setPaddleX] = useState(50)
  const [paddleW, setPaddleW] = useState(BASE_PADDLE_W)
  const [balls, setBalls] = useState<Ball[]>([])
  const [bricks, setBricks] = useState<Brick[]>(() => makeBricks())
  const [drops, setDrops] = useState<Drop[]>([])
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [bombs, setBombs] = useState<Bomb[]>([])
  const [buff, setBuff] = useState('')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)
  const [served, setServed] = useState(false)
  const [impact, setImpact] = useState({ trigger: 0, x: 50, y: 90 })
  const [shaking, setShaking] = useState(false)

  const paddleXRef = useRef(50)
  const paddleWRef = useRef(BASE_PADDLE_W)
  const ballsRef = useRef<Ball[]>([])
  const bricksRef = useRef<Brick[]>(makeBricks())
  const dropsRef = useRef<Drop[]>([])
  const enemiesRef = useRef<Enemy[]>([])
  const bombsRef = useRef<Bomb[]>([])
  const scoreRef = useRef(0)
  const livesRef = useRef(3)
  const levelRef = useRef(1)
  const runningRef = useRef(false)
  const fireUntilRef = useRef(0)
  const growUntilRef = useRef(0)
  const slowUntilRef = useRef(0)
  const nextEnemyAtRef = useRef(0)
  const idRef = useRef(1)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const arenaRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const launchedRef = useRef(false)
  const levelClearingRef = useRef(false)

  useEffect(() => {
    paddleXRef.current = paddleX
  }, [paddleX])

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function nextId() {
    idRef.current += 1
    return idRef.current
  }

  function syncViews() {
    setBalls(ballsRef.current.map((b) => ({ ...b })))
    setDrops(dropsRef.current.map((d) => ({ ...d })))
    setEnemies(enemiesRef.current.map((e) => ({ ...e })))
    setBombs(bombsRef.current.map((b) => ({ ...b })))
    setPaddleW(paddleWRef.current)
  }

  function resetBall(serve = true) {
    const px = paddleXRef.current
    ballsRef.current = [
      {
        id: nextId(),
        x: px,
        y: PADDLE_Y - PADDLE_H / 2 - BALL_R - 0.5,
        vx: (Math.random() > 0.5 ? 1 : -1) * (24 + levelRef.current * 3),
        vy: -(34 + levelRef.current * 2),
        fire: false,
      },
    ]
    setBalls(ballsRef.current.map((b) => ({ ...b })))
    launchedRef.current = !serve
    setServed(!serve)
  }

  function clearExtras() {
    dropsRef.current = []
    enemiesRef.current = []
    bombsRef.current = []
    fireUntilRef.current = 0
    growUntilRef.current = 0
    slowUntilRef.current = 0
    paddleWRef.current = BASE_PADDLE_W
    setPaddleW(BASE_PADDLE_W)
    setBuff('')
    setDrops([])
    setEnemies([])
    setBombs([])
  }

  function start(nextLevel = 1) {
    void unlockAudio()
    cancelAnimationFrame(rafRef.current)
    levelClearingRef.current = false
    const bricks = makeBricks()
    bricksRef.current = bricks
    setBricks(bricks)
    levelRef.current = nextLevel
    setLevel(nextLevel)
    if (nextLevel === 1) {
      scoreRef.current = 0
      livesRef.current = 3
      setScore(0)
      setLives(3)
    }
    paddleXRef.current = 50
    setPaddleX(50)
    clearExtras()
    nextEnemyAtRef.current = performance.now() + 2200
    resetBall(true)
    setOver(false)
    setWon(false)
    setRunning(true)
    runningRef.current = true
    lastRef.current = performance.now()
    sfx.ready()
    rafRef.current = requestAnimationFrame(tick)
  }

  function finish(cleared: boolean) {
    if (!runningRef.current) return
    runningRef.current = false
    setRunning(false)
    setOver(true)
    setWon(cleared)
    if (cleared) sfx.win()
    else sfx.lose()
    recordPlay('breakout', scoreRef.current, cleared || scoreRef.current >= 200)
  }

  function applyItem(kind: ItemKind, now: number) {
    switch (kind) {
      case 'grow':
        paddleWRef.current = Math.min(32, BASE_PADDLE_W + 10)
        growUntilRef.current = now + 10000
        setBuff('Wide paddle')
        break
      case 'multi': {
        const src = ballsRef.current[0]
        if (src && ballsRef.current.length < 3) {
          ballsRef.current.push({
            id: nextId(),
            x: src.x,
            y: src.y,
            vx: -src.vx * 0.9 || 22,
            vy: src.vy,
            fire: src.fire,
          })
        }
        setBuff('Multi-ball')
        break
      }
      case 'slow':
        for (const b of ballsRef.current) {
          const sp = Math.hypot(b.vx, b.vy)
          const target = Math.max(18, sp * 0.65)
          const scale = target / Math.max(1, sp)
          b.vx *= scale
          b.vy *= scale
        }
        slowUntilRef.current = now + 8000
        setBuff('Slow ball')
        break
      case 'life':
        if (livesRef.current < 3) {
          livesRef.current += 1
          setLives(livesRef.current)
          setBuff('+1 life')
        } else {
          scoreRef.current += 40
          setScore(scoreRef.current)
          burst(40, 1)
          setBuff('Full lives · +40')
        }
        break
      case 'fire':
        fireUntilRef.current = now + 9000
        for (const b of ballsRef.current) b.fire = true
        setBuff('Fireball')
        break
      case 'score':
        scoreRef.current += 50
        setScore(scoreRef.current)
        burst(50, 2)
        setBuff('+50')
        break
    }
    sfx.win()
  }

  function playImpact(x: number, y: number) {
    setImpact({ trigger: Date.now(), x, y })
    setShaking(true)
    window.setTimeout(() => setShaking(false), 420)
  }

  function loseLife(now: number, hitX = paddleXRef.current, hitY = PADDLE_Y) {
    livesRef.current -= 1
    setLives(livesRef.current)
    playImpact(hitX, hitY)
    sfx.miss()
    if (livesRef.current <= 0) {
      finish(false)
      return true
    }
    dropsRef.current = []
    bombsRef.current = []
    enemiesRef.current = []
    fireUntilRef.current = 0
    growUntilRef.current = 0
    paddleWRef.current = BASE_PADDLE_W
    setBuff('')
    resetBall(true)
    nextEnemyAtRef.current = now + 1800
    syncViews()
    return false
  }

  function tick(now: number) {
    if (!runningRef.current || levelClearingRef.current) return
    const dt = Math.min(0.05, (now - lastRef.current) / 1000)
    lastRef.current = now

    // buff expiry
    if (growUntilRef.current && now > growUntilRef.current) {
      growUntilRef.current = 0
      paddleWRef.current = BASE_PADDLE_W
    }
    if (fireUntilRef.current && now > fireUntilRef.current) {
      fireUntilRef.current = 0
      for (const b of ballsRef.current) b.fire = false
    }
    if (slowUntilRef.current && now > slowUntilRef.current) {
      slowUntilRef.current = 0
    }

    if (!launchedRef.current) {
      const b = ballsRef.current[0]
      if (b) {
        b.x = paddleXRef.current
        b.y = PADDLE_Y - PADDLE_H / 2 - BALL_R - 0.5
      }
      syncViews()
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    const half = paddleWRef.current / 2
    const px = paddleXRef.current
    const speedMul = slowUntilRef.current > now ? 0.85 : 1

    // —— balls ——
    const surviving: Ball[] = []
    let bricksDirty = false

    for (const ball of ballsRef.current) {
      let { x, y, vx, vy, fire } = ball
      fire = fire || now < fireUntilRef.current
      x += vx * dt * speedMul
      y += vy * dt * speedMul

      if (x < BALL_R) {
        x = BALL_R
        vx = Math.abs(vx)
      } else if (x > 100 - BALL_R) {
        x = 100 - BALL_R
        vx = -Math.abs(vx)
      }
      if (y < BALL_R) {
        y = BALL_R
        vy = Math.abs(vy)
      }

      if (
        vy > 0 &&
        y + BALL_R >= PADDLE_Y - PADDLE_H / 2 &&
        y - BALL_R <= PADDLE_Y + PADDLE_H / 2 &&
        x >= px - half &&
        x <= px + half
      ) {
        y = PADDLE_Y - PADDLE_H / 2 - BALL_R
        const offset = (x - px) / half
        const speed = Math.hypot(vx, vy)
        const angle = -Math.PI / 2 + offset * (Math.PI / 3)
        vx = Math.cos(angle) * speed
        vy = Math.sin(angle) * speed
        if (vy > -12) vy = -12
        sfx.tap()
      }

      let bounced = false
      bricksRef.current = bricksRef.current.map((br) => {
        if (!br.alive || bounced) return br
        const r = brickRect(br)
        if (x + BALL_R < r.x || x - BALL_R > r.x + r.w || y + BALL_R < r.y || y - BALL_R > r.y + r.h) {
          return br
        }
        if (!fire) {
          bounced = true
          const overlapL = x + BALL_R - r.x
          const overlapR = r.x + r.w - (x - BALL_R)
          const overlapT = y + BALL_R - r.y
          const overlapB = r.y + r.h - (y - BALL_R)
          if (Math.min(overlapL, overlapR) < Math.min(overlapT, overlapB)) vx = -vx
          else vy = -vy
        }
        bricksDirty = true
        const cx = r.x + r.w / 2
        const cy = r.y + r.h / 2
        if (Math.random() < spawnChance(levelRef.current)) {
          dropsRef.current.push({ id: nextId(), x: cx, y: cy, kind: pickItem() })
        }
        const gained = 10 + levelRef.current * 2
        scoreRef.current += gained
        burst(gained, 1)
        sfx.match()
        return { ...br, alive: false }
      })

      // hit enemy
      enemiesRef.current = enemiesRef.current.filter((e) => {
        if (Math.abs(x - e.x) < ENEMY_R + BALL_R && Math.abs(y - e.y) < ENEMY_R + BALL_R) {
          scoreRef.current += 30
          burst(30, 2)
          sfx.pop()
          if (!fire) {
            bounced = true
            vy = -Math.abs(vy)
          }
          return false
        }
        return true
      })

      if (y > 108) continue
      surviving.push({ id: ball.id, x, y, vx, vy, fire })
    }

    ballsRef.current = surviving
    if (bricksDirty) {
      setBricks(bricksRef.current.slice())
      setScore(scoreRef.current)
      const alive = bricksRef.current.filter((b) => b.alive).length
      if (alive === 0) {
        syncViews()
        if (levelRef.current >= 5) {
          finish(true)
          return
        }
        levelClearingRef.current = true
        levelUp()
        sfx.win()
        window.setTimeout(() => start(levelRef.current + 1), 450)
        return
      }
    }

    if (ballsRef.current.length === 0) {
      if (loseLife(now, paddleXRef.current, 98)) return
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    // —— falling items ——
    const keptDrops: Drop[] = []
    for (const d of dropsRef.current) {
      const y = d.y + 28 * dt
      if (y > 110) continue
      if (
        y + DROP_R >= PADDLE_Y - PADDLE_H &&
        y - DROP_R <= PADDLE_Y + PADDLE_H &&
        Math.abs(d.x - px) < half + DROP_R
      ) {
        applyItem(d.kind, now)
        continue
      }
      keptDrops.push({ ...d, y })
    }
    dropsRef.current = keptDrops

    // —— enemies ——
    if (now >= nextEnemyAtRef.current && enemiesRef.current.length < 2 + Math.floor(levelRef.current / 2)) {
      nextEnemyAtRef.current = now + Math.max(2800, 5200 - levelRef.current * 400)
      const fromLeft = Math.random() > 0.5
      enemiesRef.current.push({
        id: nextId(),
        x: fromLeft ? -4 : 104,
        y: 28 + Math.random() * 18,
        vx: (fromLeft ? 1 : -1) * (10 + levelRef.current * 1.5 + Math.random() * 4),
        nextBomb: now + 600 + Math.random() * 700,
        face: ENEMY_FACES[Math.floor(Math.random() * ENEMY_FACES.length)],
      })
    }

    const keptEnemies: Enemy[] = []
    for (const e of enemiesRef.current) {
      let x = e.x + e.vx * dt
      let vx = e.vx
      if (x < 6) {
        x = 6
        vx = Math.abs(vx)
      } else if (x > 94) {
        x = 94
        vx = -Math.abs(vx)
      }
      let nextBomb = e.nextBomb
      if (now >= nextBomb) {
        bombsRef.current.push({
          id: nextId(),
          x,
          y: e.y + ENEMY_R,
          vy: 26 + levelRef.current * 2,
        })
        nextBomb = now + Math.max(900, 1800 - levelRef.current * 120) + Math.random() * 500
        sfx.tick()
      }
      // despawn after crossing a while — keep while on screen
      if (x > -8 && x < 108) keptEnemies.push({ ...e, x, vx, nextBomb })
    }
    enemiesRef.current = keptEnemies

    // —— bombs ——
    const keptBombs: Bomb[] = []
    let bombHit: { x: number; y: number } | null = null
    for (const b of bombsRef.current) {
      const y = b.y + b.vy * dt
      if (y > 110) continue
      if (
        y + BOMB_R >= PADDLE_Y - PADDLE_H &&
        y - BOMB_R <= PADDLE_Y + PADDLE_H &&
        Math.abs(b.x - px) < half + BOMB_R
      ) {
        bombHit = { x: b.x, y }
        continue
      }
      keptBombs.push({ ...b, y })
    }
    bombsRef.current = keptBombs

    if (bombHit) {
      if (loseLife(now, bombHit.x, bombHit.y)) return
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    syncViews()
    rafRef.current = requestAnimationFrame(tick)
  }

  function moveToClientX(clientX: number) {
    const el = arenaRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * 100
    const half = paddleWRef.current / 2
    const clamped = Math.max(half, Math.min(100 - half, x))
    paddleXRef.current = clamped
    setPaddleX(clamped)
  }

  function launch() {
    if (!runningRef.current || launchedRef.current) return
    launchedRef.current = true
    setServed(true)
    sfx.tap()
  }

  useEffect(() => {
    if (!running || over) return
    function onKey(e: KeyboardEvent) {
      const step = e.shiftKey ? 5 : 3
      const half = paddleWRef.current / 2
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        const next = Math.max(half, paddleXRef.current - step)
        paddleXRef.current = next
        setPaddleX(next)
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        const next = Math.min(100 - half, paddleXRef.current + step)
        paddleXRef.current = next
        setPaddleX(next)
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        launch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, over])

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Lives', value: lives },
        { label: 'Level', value: level },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={() => start(1)}>
            Restart
          </button>
        ) : undefined
      }
    >
      <div className="breakout-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over ? (
          <PlayIdle
            hint="Catch power-ups. Dodge enemy bombs."
            onPlay={() => start(1)}
          />
        ) : (
          <div
            ref={arenaRef}
            className={`breakout-arena${shaking ? ' is-impact-shake' : ''}`}
            onPointerDown={(e) => {
              if (!running || over) return
              draggingRef.current = true
              e.currentTarget.setPointerCapture(e.pointerId)
              void unlockAudio()
              moveToClientX(e.clientX)
              launch()
            }}
            onPointerMove={(e) => {
              if (!draggingRef.current) return
              moveToClientX(e.clientX)
            }}
            onPointerUp={() => {
              draggingRef.current = false
            }}
            onPointerCancel={() => {
              draggingRef.current = false
            }}
          >
            <ImpactFlash trigger={impact.trigger} x={impact.x} y={impact.y} />
            <div className="breakout-hud">
              {served ? (buff ? buff : `Level ${level}`) : 'Tap to serve'}
            </div>

            {bricks
              .filter((b) => b.alive)
              .map((b) => {
                const r = brickRect(b)
                return (
                  <div
                    key={b.id}
                    className="breakout-brick"
                    style={{
                      left: `${r.x}%`,
                      top: `${r.y}%`,
                      width: `${r.w}%`,
                      height: `${r.h}%`,
                      background: `linear-gradient(180deg, color-mix(in srgb, ${b.color} 85%, #fff), ${b.color})`,
                    }}
                  />
                )
              })}

            {enemies.map((e) => (
              <div
                key={e.id}
                className="breakout-enemy"
                style={{ left: `${e.x}%`, top: `${e.y}%` }}
                aria-hidden
              >
                {e.face}
              </div>
            ))}

            {drops.map((d) => (
              <div
                key={d.id}
                className={`breakout-drop is-${d.kind}`}
                style={{ left: `${d.x}%`, top: `${d.y}%` }}
                aria-hidden
                title={ITEM_META[d.kind].label}
              >
                {ITEM_META[d.kind].icon}
              </div>
            ))}

            {bombs.map((b) => (
              <div
                key={b.id}
                className="breakout-bomb"
                style={{ left: `${b.x}%`, top: `${b.y}%` }}
                aria-hidden
              >
                💣
              </div>
            ))}

            <div
              className="breakout-paddle"
              style={{
                left: `${paddleX}%`,
                top: `${PADDLE_Y}%`,
                width: `${paddleW}%`,
                height: `${PADDLE_H}%`,
              }}
            />

            {balls.map((b) => (
              <div
                key={b.id}
                className={`breakout-ball${b.fire ? ' is-fire' : ''}`}
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                }}
              />
            ))}
          </div>
        )}
        <ResultOverlay
          open={over}
          title={won ? 'Bricks cleared' : 'Out of lives'}
          subtitle={
            won
              ? `Score ${score} · cleared all 5 levels`
              : `Score ${score} · reached level ${level}`
          }
          celebrate={won || score >= 200}
          onPrimary={() => start(1)}
          primaryLabel="Play again"
        />
      </div>
    </GameShell>
  )
}
