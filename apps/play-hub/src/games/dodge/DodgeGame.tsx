import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import ImpactFlash from '../../shared/ImpactFlash'
import PlayIdle from '../../shared/PlayIdle'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import type { Bullet, Enemy, GamePhase, Player, Upgrade, Weapon } from './types'
import './dodge.css'

const meta = getGame('dodge')

const BASE_PLAYER_W = 9
const BASE_PLAYER_H = 7
const BASE_ENEMY_W = 8
const BASE_ENEMY_H = 7
const PLAYER_BULLET_W = 1.5
const PLAYER_BULLET_H = 3
const ENEMY_BULLET_W = 1.8
const ENEMY_BULLET_H = 2.8
const MAX_SCALE = 1.85
const PLAYER_FACE = '🛸'
const MONSTER_FACES = ['👾', '👹', '👺', '👿', '💀', '🦇', '🐲', '🦑', '🦀', '🧟'] as const

const ALL_UPGRADES: Upgrade[] = [
  { id: 'damage', label: '+Damage', blurb: 'Your shots hit harder' },
  { id: 'firerate', label: 'Rapid fire', blurb: 'Shorter shot cooldown' },
  { id: 'multishot', label: 'Multi-shot', blurb: 'Extra bullet per volley' },
  { id: 'speed', label: 'Thrusters', blurb: 'Slide faster sideways' },
  { id: 'life', label: '+1 Life', blurb: 'Restore one hit point' },
  { id: 'bulk', label: 'Bulk up', blurb: 'Grow bigger — more HP mass' },
]

function xpToLevel(level: number) {
  return 40 + level * 28
}

function spawnMsFor(level: number) {
  return Math.max(420, 1200 - level * 55)
}

function enemyVyFor(level: number) {
  return 10 + level * 1.6
}

function enemyHpFor(level: number, scale: number) {
  return Math.max(1, Math.floor(level / 2) + Math.round(scale))
}

function growthScale(level: number, elapsed: number) {
  const fromLevel = 1 + (level - 1) * 0.08
  const fromTime = Math.min(0.35, elapsed / 90)
  return Math.min(MAX_SCALE, fromLevel + fromTime)
}

function pickUpgrades(): Upgrade[] {
  const pool = [...ALL_UPGRADES]
  const picks: Upgrade[] = []
  while (picks.length < 3 && pool.length) {
    const i = Math.floor(Math.random() * pool.length)
    picks.push(pool.splice(i, 1)[0])
  }
  return picks
}

function aabb(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function makePlayer(speed = 52, scale = 1, lives = 3): Player {
  const w = BASE_PLAYER_W * scale
  const h = BASE_PLAYER_H * scale
  return { x: 50 - w / 2, y: 88 - (h - BASE_PLAYER_H) * 0.3, w, h, speed, lives, scale }
}

function makeWeapon(): Weapon {
  return { damage: 1, cooldownMs: 300, shots: 1 }
}

function resizePlayer(p: Player, scale: number): Player {
  const cx = p.x + p.w / 2
  const w = BASE_PLAYER_W * scale
  const h = BASE_PLAYER_H * scale
  return {
    ...p,
    scale,
    w,
    h,
    x: Math.max(1, Math.min(99 - w, cx - w / 2)),
    y: Math.min(92, 88 - (h - BASE_PLAYER_H) * 0.3),
  }
}

export default function DodgeGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [phase, setPhase] = useState<GamePhase>('idle')
  const [level, setLevel] = useState(1)
  const [xp, setXp] = useState(0)
  const [xpNeed, setXpNeed] = useState(xpToLevel(1))
  const [score, setScore] = useState(0)
  const [kills, setKills] = useState(0)
  const [lives, setLives] = useState(3)
  const [playerView, setPlayerView] = useState<Player>(() => makePlayer())
  const [bulletsView, setBulletsView] = useState<Bullet[]>([])
  const [enemiesView, setEnemiesView] = useState<Enemy[]>([])
  const [upgrades, setUpgrades] = useState<Upgrade[]>([])
  const [impact, setImpact] = useState({ trigger: 0, x: 50, y: 88 })
  const [shaking, setShaking] = useState(false)

  const phaseRef = useRef<GamePhase>('idle')
  const playerRef = useRef<Player>(makePlayer())
  const weaponRef = useRef<Weapon>(makeWeapon())
  const bulletsRef = useRef<Bullet[]>([])
  const enemiesRef = useRef<Enemy[]>([])
  const keysRef = useRef({ left: false, right: false })
  const pointerXRef = useRef<number | null>(null)
  const idRef = useRef(0)
  const scoreRef = useRef(0)
  const killsRef = useRef(0)
  const xpRef = useRef(0)
  const levelRef = useRef(1)
  const xpNeedRef = useRef(xpToLevel(1))
  const elapsedRef = useRef(0)
  const lastFireRef = useRef(0)
  const lastSpawnRef = useRef(0)
  const lastTsRef = useRef(0)
  const rafRef = useRef(0)
  const recordedRef = useRef(false)
  const arenaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    function onKey(e: KeyboardEvent, down: boolean) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keysRef.current.left = down
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keysRef.current.right = down
    }
    const down = (e: KeyboardEvent) => onKey(e, true)
    const up = (e: KeyboardEvent) => onKey(e, false)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useEffect(() => () => cancelLoop(), [])

  function cancelLoop() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
  }

  function syncView() {
    setPlayerView({ ...playerRef.current })
    setBulletsView(bulletsRef.current.map((b) => ({ ...b })))
    setEnemiesView(enemiesRef.current.map((e) => ({ ...e })))
    setScore(scoreRef.current)
    setKills(killsRef.current)
    setXp(xpRef.current)
    setXpNeed(xpNeedRef.current)
    setLevel(levelRef.current)
    setLives(playerRef.current.lives)
  }

  function clearEntities() {
    bulletsRef.current = []
    enemiesRef.current = []
    lastFireRef.current = 0
    lastSpawnRef.current = 0
  }

  function startRun() {
    void unlockAudio()
    cancelLoop()
    recordedRef.current = false
    levelRef.current = 1
    xpRef.current = 0
    xpNeedRef.current = xpToLevel(1)
    scoreRef.current = 0
    killsRef.current = 0
    elapsedRef.current = 0
    weaponRef.current = makeWeapon()
    playerRef.current = makePlayer()
    clearEntities()
    keysRef.current = { left: false, right: false }
    pointerXRef.current = null
    setUpgrades([])
    setPhase('playing')
    phaseRef.current = 'playing'
    syncView()
    sfx.ready()
    lastTsRef.current = 0
    rafRef.current = requestAnimationFrame(tick)
  }

  function resumeAfterUpgrade() {
    void unlockAudio()
    clearEntities()
    setUpgrades([])
    setPhase('playing')
    phaseRef.current = 'playing'
    syncView()
    sfx.ready()
    // leftover XP may already fill the next bar
    if (xpRef.current >= xpNeedRef.current) {
      gainXp(0)
      return
    }
    lastTsRef.current = 0
    rafRef.current = requestAnimationFrame(tick)
  }

  function openUpgrade() {
    cancelLoop()
    setPhase('upgrade')
    phaseRef.current = 'upgrade'
    setUpgrades(pickUpgrades())
    syncView()
    sfx.levelUp()
    levelUp()
    burst(60 + levelRef.current * 30, levelRef.current)
  }

  function playImpact(x: number, y: number) {
    setImpact({ trigger: Date.now(), x, y })
    setShaking(true)
    window.setTimeout(() => setShaking(false), 420)
  }

  function finishLost() {
    cancelLoop()
    setPhase('lost')
    phaseRef.current = 'lost'
    syncView()
    if (recordedRef.current) return
    recordedRef.current = true
    sfx.lose()
    recordPlay('dodge', scoreRef.current, scoreRef.current >= 200)
  }

  function applyUpgrade(u: Upgrade) {
    void unlockAudio()
    const w = weaponRef.current
    const p = playerRef.current
    switch (u.id) {
      case 'damage':
        weaponRef.current = { ...w, damage: w.damage + 1 }
        break
      case 'firerate':
        weaponRef.current = { ...w, cooldownMs: Math.max(90, Math.round(w.cooldownMs * 0.8)) }
        break
      case 'multishot':
        weaponRef.current = { ...w, shots: Math.min(5, w.shots + 1) }
        break
      case 'speed':
        playerRef.current = { ...p, speed: p.speed + 12 }
        break
      case 'life':
        playerRef.current = { ...p, lives: Math.min(6, p.lives + 1) }
        break
      case 'bulk': {
        const nextScale = Math.min(MAX_SCALE, p.scale + 0.12)
        playerRef.current = {
          ...resizePlayer(p, nextScale),
          lives: Math.min(6, p.lives + 1),
        }
        break
      }
    }
    sfx.tap()
    resumeAfterUpgrade()
  }

  function firePlayer(now: number) {
    const w = weaponRef.current
    if (now - lastFireRef.current < w.cooldownMs) return
    lastFireRef.current = now
    const p = playerRef.current
    const cx = p.x + p.w / 2
    const count = w.shots
    const spread = count === 1 ? 0 : 2.4
    const start = -((count - 1) / 2) * spread
    const bw = PLAYER_BULLET_W * Math.min(1.35, 0.85 + p.scale * 0.25)
    const bh = PLAYER_BULLET_H * Math.min(1.35, 0.85 + p.scale * 0.25)
    for (let i = 0; i < count; i++) {
      idRef.current += 1
      const offset = start + i * spread
      bulletsRef.current.push({
        id: idRef.current,
        x: cx - bw / 2 + offset,
        y: p.y - bh,
        w: bw,
        h: bh,
        vy: -92,
        vx: count === 1 ? 0 : offset * 1.6,
        damage: w.damage,
        hostile: false,
      })
    }
    sfx.tick()
  }

  function fireEnemy(e: Enemy, now: number) {
    idRef.current += 1
    const scale = e.scale
    const bw = ENEMY_BULLET_W * Math.min(1.4, 0.9 + scale * 0.25)
    const bh = ENEMY_BULLET_H * Math.min(1.4, 0.9 + scale * 0.25)
    bulletsRef.current.push({
      id: idRef.current,
      x: e.x + e.w / 2 - bw / 2,
      y: e.y + e.h,
      w: bw,
      h: bh,
      vy: 38 + levelRef.current * 2.5 + scale * 6,
      vx: (Math.random() - 0.5) * 8,
      damage: 1,
      hostile: true,
    })
    e.nextShot = now + Math.max(700, 1600 - levelRef.current * 70) + Math.random() * 400
  }

  function spawnEnemy(now: number) {
    idRef.current += 1
    const scale = growthScale(levelRef.current, elapsedRef.current) * (0.85 + Math.random() * 0.35)
    const clamped = Math.min(MAX_SCALE, scale)
    const w = BASE_ENEMY_W * clamped
    const h = BASE_ENEMY_H * clamped
    const hp = enemyHpFor(levelRef.current, clamped)
    enemiesRef.current.push({
      id: idRef.current,
      x: 3 + Math.random() * (100 - w - 6),
      y: -h - 2,
      w,
      h,
      vy: enemyVyFor(levelRef.current) * (0.8 + Math.random() * 0.4),
      hp,
      maxHp: hp,
      scale: clamped,
      nextShot: now + 400 + Math.random() * 900,
      face: MONSTER_FACES[Math.floor(Math.random() * MONSTER_FACES.length)],
    })
  }

  function gainXp(amount: number) {
    xpRef.current += amount
    while (xpRef.current >= xpNeedRef.current) {
      xpRef.current -= xpNeedRef.current
      levelRef.current += 1
      xpNeedRef.current = xpToLevel(levelRef.current)
      scoreRef.current += 80 + levelRef.current * 35
      // grow player a bit each level
      const grown = Math.min(MAX_SCALE, playerRef.current.scale + 0.06)
      playerRef.current = resizePlayer(playerRef.current, grown)
      syncView()
      openUpgrade()
      return true
    }
    return false
  }

  function tick(ts: number) {
    if (phaseRef.current !== 'playing') return

    const last = lastTsRef.current || ts
    const dt = Math.min(0.05, (ts - last) / 1000)
    lastTsRef.current = ts
    elapsedRef.current += dt

    // grow slowly over time even between levels
    const targetScale = Math.min(
      MAX_SCALE,
      Math.max(playerRef.current.scale, growthScale(levelRef.current, elapsedRef.current) * 0.92),
    )
    if (targetScale > playerRef.current.scale + 0.002) {
      playerRef.current = resizePlayer(playerRef.current, playerRef.current.scale + 0.002)
    }

    const p = playerRef.current
    let dx = 0
    if (keysRef.current.left) dx -= 1
    if (keysRef.current.right) dx += 1
    if (pointerXRef.current != null) {
      const target = pointerXRef.current - p.w / 2
      const diff = target - p.x
      if (Math.abs(diff) > 0.4) dx = Math.sign(diff)
    }
    p.x = Math.max(1, Math.min(99 - p.w, p.x + dx * p.speed * dt))

    firePlayer(ts)

    // enemies move + shoot
    for (const e of enemiesRef.current) {
      e.y += e.vy * dt
      // enemies also bulk up slowly
      if (e.scale < MAX_SCALE) {
        const next = Math.min(MAX_SCALE, e.scale + dt * 0.015)
        if (next > e.scale + 0.001) {
          const cx = e.x + e.w / 2
          e.scale = next
          e.w = BASE_ENEMY_W * next
          e.h = BASE_ENEMY_H * next
          e.x = cx - e.w / 2
        }
      }
      if (ts >= e.nextShot && e.y > 2 && e.y < 70) {
        fireEnemy(e, ts)
      }
    }

    if (ts - lastSpawnRef.current > spawnMsFor(levelRef.current)) {
      lastSpawnRef.current = ts
      if (enemiesRef.current.length < 12) spawnEnemy(ts)
    }

    bulletsRef.current = bulletsRef.current
      .map((b) => ({ ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt }))
      .filter((b) => b.y + b.h > -6 && b.y < 108 && b.x > -8 && b.x < 108)

    // player bullets × enemies
    const nextBullets: Bullet[] = []
    let gained = 0
    let killGain = 0
    let xpGain = 0
    for (const b of bulletsRef.current) {
      if (b.hostile) {
        nextBullets.push(b)
        continue
      }
      let alive = true
      for (const e of enemiesRef.current) {
        if (e.hp <= 0) continue
        if (!aabb(b, e)) continue
        e.hp -= b.damage
        alive = false
        if (e.hp <= 0) {
          killGain += 1
          const pts = 18 + levelRef.current * 7 + e.maxHp * 8
          gained += pts
          xpGain += 12 + e.maxHp * 6 + Math.round(e.scale * 4)
        }
        break
      }
      if (alive) nextBullets.push(b)
    }

    // hostile bullets × player
    const afterHostile: Bullet[] = []
    let playerHits = 0
    for (const b of nextBullets) {
      if (!b.hostile) {
        afterHostile.push(b)
        continue
      }
      if (aabb(b, p)) {
        playerHits += 1
        continue
      }
      afterHostile.push(b)
    }
    bulletsRef.current = afterHostile
    enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0)

    if (killGain > 0) {
      killsRef.current += killGain
      scoreRef.current += gained
      burst(gained, killsRef.current)
      sfx.pop()
    }

    // enemy body contact / passed bottom
    const kept: Enemy[] = []
    for (const e of enemiesRef.current) {
      if (e.y > 104) {
        playerHits += 1
        continue
      }
      if (aabb(e, p)) {
        playerHits += 1
        continue
      }
      kept.push(e)
    }
    enemiesRef.current = kept

    if (playerHits > 0) {
      const cx = p.x + p.w / 2
      const cy = p.y + p.h / 2
      playImpact(cx, cy)
      p.lives = Math.max(0, p.lives - playerHits)
      sfx.miss()
      // brief clear of hostile bullets near player
      bulletsRef.current = bulletsRef.current.filter(
        (b) => !b.hostile || Math.abs(b.y - p.y) > 18,
      )
      if (p.lives <= 0) {
        syncView()
        // let the blast show before the lose overlay
        window.setTimeout(() => finishLost(), 380)
        return
      }
    }

    if (xpGain > 0 && gainXp(xpGain)) {
      // upgrade overlay opened — stop tick
      return
    }

    syncView()
    rafRef.current = requestAnimationFrame(tick)
  }

  function pointerToPct(clientX: number) {
    const el = arenaRef.current
    if (!el) return 50
    const r = el.getBoundingClientRect()
    return ((clientX - r.left) / r.width) * 100
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (phase !== 'playing') return
    void unlockAudio()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    pointerXRef.current = pointerToPct(e.clientX)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (phase !== 'playing' || pointerXRef.current == null) return
    pointerXRef.current = pointerToPct(e.clientX)
  }

  function onPointerUp() {
    pointerXRef.current = null
  }

  const playing = phase === 'playing'
  const showArena = phase !== 'idle'
  const xpPct = Math.min(100, (xp / xpNeed) * 100)

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'HP', value: lives },
        { label: 'Kills', value: kills },
        { label: 'Score', value: score },
        { label: 'Lv', value: level },
      ]}
      actions={
        phase !== 'idle' ? (
          <button type="button" className="btn btn-ghost" onClick={startRun}>
            New run
          </button>
        ) : undefined
      }
    >
      <div className="dodge-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />

        {phase === 'idle' && (
          <PlayIdle
            hint="Steer, auto-fire, dodge enemy shots. Level up to upgrade."
            onPlay={startRun}
          />
        )}

        {showArena && (
          <div
            ref={arenaRef}
            className={`dodge-arena${shaking ? ' is-impact-shake' : ''}`}
            role="application"
            aria-label="Meteor Rush arena"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <ImpactFlash trigger={impact.trigger} x={impact.x} y={impact.y} />
            <div className="dodge-xp" aria-hidden>
              <div className="dodge-xp__fill" style={{ width: `${xpPct}%` }} />
              <span className="dodge-xp__label">
                XP {xp}/{xpNeed}
              </span>
            </div>

            {enemiesView.map((e) => (
              <div
                key={e.id}
                className="dodge-enemy"
                style={{
                  left: `${e.x}%`,
                  top: `${e.y}%`,
                  width: `${e.w}%`,
                  height: `${e.h}%`,
                }}
                aria-hidden
              >
                <span className="dodge-enemy__face">{e.face}</span>
                {e.hp > 1 ? <span className="dodge-enemy__hp">{e.hp}</span> : null}
              </div>
            ))}

            {bulletsView.map((b) => (
              <div
                key={b.id}
                className={`dodge-bullet${b.hostile ? ' is-hostile' : ''}`}
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  width: `${Math.max(b.w, 3.2)}%`,
                  height: `${Math.max(b.h, 3.2)}%`,
                }}
                aria-hidden
              >
                {b.hostile ? '💢' : '✨'}
              </div>
            ))}

            <div
              className="dodge-player"
              style={{
                left: `${playerView.x}%`,
                top: `${playerView.y}%`,
                width: `${playerView.w}%`,
                height: `${playerView.h}%`,
              }}
              aria-hidden
            >
              <span className="dodge-player__face">{PLAYER_FACE}</span>
            </div>

            {playing && (
              <div className="dodge-hud" aria-hidden>
                Level {level}
              </div>
            )}
          </div>
        )}

        {phase === 'upgrade' && (
          <div className="overlay dodge-upgrade" role="dialog" aria-modal="true" aria-label="Choose upgrade">
            <div className="overlay-card panel dodge-upgrade__card">
              <h2>Level up!</h2>
              <p>
                Level {level} · Score {score}. Pick an upgrade.
              </p>
              <div className="dodge-upgrade__grid">
                {upgrades.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="dodge-upgrade__btn"
                    onClick={() => applyUpgrade(u)}
                  >
                    <strong>{u.label}</strong>
                    <span>{u.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <ResultOverlay
          open={phase === 'lost'}
          title="Ship down"
          subtitle={`Score ${score} · Level ${level} · ${kills} kills`}
          celebrate={score >= 200}
          onPrimary={startRun}
          primaryLabel="Try again"
        />
      </div>
    </GameShell>
  )
}
