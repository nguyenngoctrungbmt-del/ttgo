import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import type { Bullet, Enemy, GamePhase, Player, Upgrade, Weapon } from './types'
import './shooter.css'

const meta = getGame('shooter')

const PLAYER_W = 10
const PLAYER_H = 8
const BULLET_W = 1.6
const BULLET_H = 3.2
const ENEMY_W = 9
const ENEMY_H = 8

const ALL_UPGRADES: Upgrade[] = [
  { id: 'damage', label: '+Damage', blurb: 'Bullets hit harder' },
  { id: 'firerate', label: 'Rapid fire', blurb: 'Shorter shot cooldown' },
  { id: 'multishot', label: 'Multi-shot', blurb: 'Extra bullet per volley' },
  { id: 'speed', label: 'Thrusters', blurb: 'Move faster sideways' },
  { id: 'life', label: '+1 Life', blurb: 'Restore one hit point' },
]

function killQuotaFor(stage: number) {
  return 8 + stage * 3
}

function spawnMsFor(stage: number) {
  return Math.max(380, 1100 - stage * 70)
}

function enemyVyFor(stage: number) {
  return 12 + stage * 2.4
}

function enemyHpFor(stage: number) {
  return 1 + Math.floor((stage - 1) / 2)
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

function makePlayer(speed = 55): Player {
  return {
    x: 50 - PLAYER_W / 2,
    y: 88,
    w: PLAYER_W,
    h: PLAYER_H,
    speed,
    lives: 3,
  }
}

function makeWeapon(): Weapon {
  return { damage: 1, cooldownMs: 280, shots: 1 }
}

export default function ShooterGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [phase, setPhase] = useState<GamePhase>('idle')
  const [stage, setStage] = useState(1)
  const [score, setScore] = useState(0)
  const [kills, setKills] = useState(0)
  const [quota, setQuota] = useState(killQuotaFor(1))
  const [lives, setLives] = useState(3)
  const [playerView, setPlayerView] = useState<Player>(() => makePlayer())
  const [bulletsView, setBulletsView] = useState<Bullet[]>([])
  const [enemiesView, setEnemiesView] = useState<Enemy[]>([])
  const [upgrades, setUpgrades] = useState<Upgrade[]>([])

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
  const quotaRef = useRef(killQuotaFor(1))
  const stageRef = useRef(1)
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
    setQuota(quotaRef.current)
    setStage(stageRef.current)
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
    stageRef.current = 1
    scoreRef.current = 0
    killsRef.current = 0
    quotaRef.current = killQuotaFor(1)
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
    killsRef.current = 0
    stageRef.current += 1
    quotaRef.current = killQuotaFor(stageRef.current)
    setUpgrades([])
    setPhase('playing')
    phaseRef.current = 'playing'
    syncView()
    sfx.ready()
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
    burst(80 + stageRef.current * 40, stageRef.current)
  }

  function finishLost() {
    cancelLoop()
    setPhase('lost')
    phaseRef.current = 'lost'
    syncView()
    if (recordedRef.current) return
    recordedRef.current = true
    sfx.lose()
    recordPlay('shooter', scoreRef.current, false)
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
        weaponRef.current = { ...w, cooldownMs: Math.max(90, Math.round(w.cooldownMs * 0.82)) }
        break
      case 'multishot':
        weaponRef.current = { ...w, shots: Math.min(5, w.shots + 1) }
        break
      case 'speed':
        playerRef.current = { ...p, speed: p.speed + 14 }
        break
      case 'life':
        playerRef.current = { ...p, lives: Math.min(5, p.lives + 1) }
        break
    }
    sfx.tap()
    resumeAfterUpgrade()
  }

  function fire(now: number) {
    const w = weaponRef.current
    if (now - lastFireRef.current < w.cooldownMs) return
    lastFireRef.current = now
    const p = playerRef.current
    const cx = p.x + p.w / 2
    const count = w.shots
    const spread = count === 1 ? 0 : 2.2
    const start = -((count - 1) / 2) * spread
    for (let i = 0; i < count; i++) {
      idRef.current += 1
      const offset = start + i * spread
      bulletsRef.current.push({
        id: idRef.current,
        x: cx - BULLET_W / 2 + offset,
        y: p.y - BULLET_H,
        w: BULLET_W,
        h: BULLET_H,
        vy: -95,
        vx: count === 1 ? 0 : offset * 1.8,
        damage: w.damage,
      })
    }
    sfx.tick()
  }

  function spawnEnemy() {
    idRef.current += 1
    const hp = enemyHpFor(stageRef.current)
    const x = 4 + Math.random() * (100 - ENEMY_W - 8)
    enemiesRef.current.push({
      id: idRef.current,
      x,
      y: -ENEMY_H - 2,
      w: ENEMY_W,
      h: ENEMY_H,
      vy: enemyVyFor(stageRef.current) * (0.85 + Math.random() * 0.35),
      hp,
      maxHp: hp,
    })
  }

  function tick(ts: number) {
    if (phaseRef.current !== 'playing') return

    const last = lastTsRef.current || ts
    const dt = Math.min(0.05, (ts - last) / 1000)
    lastTsRef.current = ts

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

    fire(ts)

    bulletsRef.current = bulletsRef.current
      .map((b) => ({ ...b, x: b.x + b.vx * dt, y: b.y + b.vy * dt }))
      .filter((b) => b.y + b.h > -4 && b.x > -5 && b.x < 105)

    enemiesRef.current = enemiesRef.current.map((e) => ({
      ...e,
      y: e.y + e.vy * dt,
    }))

    if (ts - lastSpawnRef.current > spawnMsFor(stageRef.current)) {
      lastSpawnRef.current = ts
      if (enemiesRef.current.length < 14) spawnEnemy()
    }

    // bullet × enemy
    const nextBullets: Bullet[] = []
    let gained = 0
    let killGain = 0
    for (const b of bulletsRef.current) {
      let alive = true
      for (const e of enemiesRef.current) {
        if (e.hp <= 0) continue
        if (!aabb(b, e)) continue
        e.hp -= b.damage
        alive = false
        if (e.hp <= 0) {
          killGain += 1
          const pts = 20 + stageRef.current * 8 + e.maxHp * 10
          gained += pts
        }
        break
      }
      if (alive) nextBullets.push(b)
    }
    bulletsRef.current = nextBullets
    enemiesRef.current = enemiesRef.current.filter((e) => e.hp > 0)

    if (killGain > 0) {
      killsRef.current += killGain
      scoreRef.current += gained
      burst(gained, killsRef.current)
      sfx.pop()
    }

    // enemy reached bottom or hit player
    let hit = 0
    const kept: Enemy[] = []
    for (const e of enemiesRef.current) {
      if (e.y > 102) {
        hit += 1
        continue
      }
      if (aabb(e, p)) {
        hit += 1
        continue
      }
      kept.push(e)
    }
    enemiesRef.current = kept

    if (hit > 0) {
      p.lives = Math.max(0, p.lives - hit)
      sfx.miss()
      if (p.lives <= 0) {
        syncView()
        finishLost()
        return
      }
    }

    if (killsRef.current >= quotaRef.current) {
      scoreRef.current += 100 + stageRef.current * 50
      syncView()
      openUpgrade()
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

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'HP', value: lives },
        { label: 'Kills', value: `${kills}/${quota}` },
        { label: 'Score', value: score },
        { label: 'Lv', value: stage },
      ]}
      actions={
        phase !== 'idle' ? (
          <button type="button" className="btn btn-ghost" onClick={startRun}>
            New run
          </button>
        ) : undefined
      }
    >
      <div className="shooter-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />

        {phase === 'idle' && (
          <PlayIdle
            hint="Steer left/right and auto-fire. Clear the wave, then pick an upgrade."
            onPlay={startRun}
          />
        )}

        {showArena && (
          <div
            ref={arenaRef}
            className="shooter-arena"
            role="application"
            aria-label="Shooter arena"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {enemiesView.map((e) => (
              <div
                key={e.id}
                className="shooter-enemy"
                style={{
                  left: `${e.x}%`,
                  top: `${e.y}%`,
                  width: `${e.w}%`,
                  height: `${e.h}%`,
                }}
                aria-hidden
              >
                <span className="shooter-enemy__hp">
                  {e.hp > 1 ? e.hp : ''}
                </span>
              </div>
            ))}

            {bulletsView.map((b) => (
              <div
                key={b.id}
                className="shooter-bullet"
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  width: `${b.w}%`,
                  height: `${b.h}%`,
                }}
                aria-hidden
              />
            ))}

            <div
              className="shooter-player"
              style={{
                left: `${playerView.x}%`,
                top: `${playerView.y}%`,
                width: `${playerView.w}%`,
                height: `${playerView.h}%`,
              }}
              aria-hidden
            />

            {playing && (
              <div className="shooter-hud" aria-hidden>
                Wave {stage}
              </div>
            )}
          </div>
        )}

        {phase === 'upgrade' && (
          <div className="overlay shooter-upgrade" role="dialog" aria-modal="true" aria-label="Choose upgrade">
            <div className="overlay-card panel shooter-upgrade__card">
              <h2>Wave cleared!</h2>
              <p>Level {stage} · Score {score}. Pick an upgrade.</p>
              <div className="shooter-upgrade__grid">
                {upgrades.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="shooter-upgrade__btn"
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
          subtitle={`Score ${score} · Reached level ${stage}`}
          onPrimary={startRun}
          primaryLabel="Try again"
        />
      </div>
    </GameShell>
  )
}
