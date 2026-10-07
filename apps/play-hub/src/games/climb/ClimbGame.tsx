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
import './climb.css'

const meta = getGame('climb')

type Side = 'left' | 'right'
type ItemKind = 'gem' | 'shield' | 'slow'

type Enemy = {
  id: number
  side: Side
  y: number
  face: string
  scored: boolean
}

type Item = {
  id: number
  side: Side
  y: number
  kind: ItemKind
}

const PLAYER_Y = 72
const LEFT_X = 18
const RIGHT_X = 82
const ENEMY_GAP = 18
const FIRST_ENEMY_AT = 1
const SPAWN_Y = -14
const HIT_DIST = 7
const ITEM_HIT = 8
const SAFE_BAND = 14
const FIRST_ITEM_AT = 3.5
const ITEM_COOLDOWN = 5.5
const SHIELD_HITS = 1
const SLOW_DURATION = 3.2
const FACES = ['👾', '👹', '👺', '👿', '🦇', '🕷️', '🦞', '🧟'] as const
const ITEM_META: Record<ItemKind, { icon: string; label: string }> = {
  gem: { icon: '💎', label: '+5' },
  shield: { icon: '🛡️', label: 'Shield' },
  slow: { icon: '❄️', label: 'Slow' },
}

function sideX(side: Side) {
  return side === 'left' ? LEFT_X : RIGHT_X
}

function otherSide(side: Side): Side {
  return side === 'left' ? 'right' : 'left'
}

function pickFace() {
  return FACES[Math.floor(Math.random() * FACES.length)]
}

function pickItemKind(): ItemKind {
  const roll = Math.random()
  if (roll < 0.4) return 'gem'
  if (roll < 0.7) return 'shield'
  return 'slow'
}

function blocksLaneSwap(enemies: Enemy[], side: Side, y: number) {
  return enemies.some((e) => e.side !== side && Math.abs(e.y - y) < SAFE_BAND)
}

export default function ClimbGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [side, setSide] = useState<Side>('left')
  const [enemies, setEnemies] = useState<Enemy[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [score, setScore] = useState(0)
  const [shield, setShield] = useState(0)
  const [slowLeft, setSlowLeft] = useState(0)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [impact, setImpact] = useState({ trigger: 0, x: LEFT_X, y: PLAYER_Y })
  const [shaking, setShaking] = useState(false)
  const [toast, setToast] = useState('')

  const sideRef = useRef<Side>('left')
  const enemiesRef = useRef<Enemy[]>([])
  const itemsRef = useRef<Item[]>([])
  const scoreRef = useRef(0)
  const shieldRef = useRef(0)
  const slowRef = useRef(0)
  const runningRef = useRef(false)
  const dyingRef = useRef(false)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const idRef = useRef(1)
  const nextSideRef = useRef<Side>('right')
  const elapsedRef = useRef(0)
  const firstSpawnedRef = useRef(false)
  const itemCooldownRef = useRef(FIRST_ITEM_AT)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function playImpact(x: number, y: number) {
    setImpact({ trigger: Date.now(), x, y })
    setShaking(true)
    window.setTimeout(() => setShaking(false), 420)
  }

  function showToast(text: string) {
    setToast(text)
    window.setTimeout(() => setToast(''), 900)
  }

  function addScore(n: number) {
    scoreRef.current += n
    setScore(scoreRef.current)
    burst(8, Math.min(scoreRef.current, 6))
    if (scoreRef.current > 0 && scoreRef.current % 8 === 0) levelUp()
  }

  function endRun(hitX = sideX(sideRef.current), hitY = PLAYER_Y) {
    if (!runningRef.current || dyingRef.current) return
    dyingRef.current = true
    runningRef.current = false
    playImpact(hitX, hitY)
    sfx.lose()
    window.setTimeout(() => {
      setRunning(false)
      setOver(true)
      recordPlay('climb', scoreRef.current, scoreRef.current >= 12)
    }, 420)
  }

  function collectItem(item: Item) {
    sfx.match()
    if (item.kind === 'gem') {
      addScore(5)
      showToast('+5 gem')
      return
    }
    if (item.kind === 'shield') {
      shieldRef.current = SHIELD_HITS
      setShield(SHIELD_HITS)
      showToast('Shield!')
      return
    }
    slowRef.current = SLOW_DURATION
    setSlowLeft(SLOW_DURATION)
    showToast('Slow-mo!')
  }

  function start() {
    void unlockAudio()
    cancelAnimationFrame(rafRef.current)
    sideRef.current = 'left'
    nextSideRef.current = 'right'
    firstSpawnedRef.current = false
    enemiesRef.current = []
    itemsRef.current = []
    scoreRef.current = 0
    shieldRef.current = 0
    slowRef.current = 0
    idRef.current = 1
    elapsedRef.current = 0
    itemCooldownRef.current = FIRST_ITEM_AT
    dyingRef.current = false
    setSide('left')
    setEnemies([])
    setItems([])
    setScore(0)
    setShield(0)
    setSlowLeft(0)
    setToast('')
    setOver(false)
    setImpact({ trigger: 0, x: LEFT_X, y: PLAYER_Y })
    setRunning(true)
    runningRef.current = true
    lastRef.current = performance.now()
    sfx.ready()
    rafRef.current = requestAnimationFrame(tick)
  }

  function leap(to?: Side) {
    if (!runningRef.current || dyingRef.current) return
    const next = to ?? otherSide(sideRef.current)
    if (next === sideRef.current) return

    const blocked = enemiesRef.current.some(
      (e) => e.side === next && Math.abs(e.y - PLAYER_Y) < HIT_DIST,
    )
    if (blocked) {
      sfx.tap()
      return
    }

    void unlockAudio()
    sideRef.current = next
    setSide(next)
    sfx.tap()
  }

  function spawnEnemy(side: Side, y: number) {
    let place = side
    if (blocksLaneSwap(enemiesRef.current, place, y)) {
      place = otherSide(place)
      if (blocksLaneSwap(enemiesRef.current, place, y)) return false
    }
    enemiesRef.current.push({
      id: idRef.current++,
      side: place,
      y,
      face: pickFace(),
      scored: false,
    })
    nextSideRef.current = otherSide(place)
    return true
  }

  function spawnItem() {
    // Prefer the wall that is clearer near spawn so items are grab-able
    let side: Side = Math.random() < 0.5 ? 'left' : 'right'
    const nearEnemy = enemiesRef.current.some(
      (e) => e.side === side && Math.abs(e.y - SPAWN_Y) < HIT_DIST + 4,
    )
    if (nearEnemy) side = otherSide(side)
    itemsRef.current.push({
      id: idRef.current++,
      side,
      y: SPAWN_Y - 6,
      kind: pickItemKind(),
    })
  }

  function scrollSpeed() {
    const base = 13 + Math.min(elapsedRef.current * 1.25, 36)
    return slowRef.current > 0 ? base * 0.45 : base
  }

  function tick(now: number) {
    if (!runningRef.current) return
    const dt = Math.min(0.05, (now - lastRef.current) / 1000)
    lastRef.current = now
    elapsedRef.current += dt

    if (slowRef.current > 0) {
      slowRef.current = Math.max(0, slowRef.current - dt)
      setSlowLeft(slowRef.current)
    }

    const scroll = scrollSpeed()

    if (elapsedRef.current >= FIRST_ENEMY_AT) {
      if (!firstSpawnedRef.current) {
        firstSpawnedRef.current = true
        spawnEnemy(nextSideRef.current, SPAWN_Y)
      } else if (enemiesRef.current.length === 0) {
        spawnEnemy(nextSideRef.current, SPAWN_Y)
      } else {
        const topY = enemiesRef.current.reduce((min, e) => Math.min(min, e.y), SPAWN_Y)
        const gap = Math.max(14, ENEMY_GAP - elapsedRef.current * 0.28)
        if (topY > SPAWN_Y + 2) {
          spawnEnemy(nextSideRef.current, topY - gap)
        }
      }
    }

    itemCooldownRef.current -= dt
    if (itemCooldownRef.current <= 0 && elapsedRef.current >= FIRST_ITEM_AT) {
      spawnItem()
      itemCooldownRef.current = Math.max(3.8, ITEM_COOLDOWN - elapsedRef.current * 0.04)
    }

    const px = sideX(sideRef.current)
    const nextEnemies: Enemy[] = []
    let hit: Enemy | null = null

    for (const e of enemiesRef.current) {
      const y = e.y + scroll * dt
      if (y > 120) continue

      let scored = e.scored
      if (!scored && e.side !== sideRef.current && y > PLAYER_Y + HIT_DIST) {
        scored = true
        addScore(1)
        sfx.match()
      }

      if (e.side === sideRef.current && Math.abs(y - PLAYER_Y) < HIT_DIST - 1.5) {
        if (shieldRef.current > 0) {
          shieldRef.current -= 1
          setShield(shieldRef.current)
          scored = true
          addScore(1)
          showToast('Blocked!')
          sfx.match()
          playImpact(px, y)
          continue
        }
        hit = { ...e, y, scored }
      }

      nextEnemies.push({ ...e, y, scored })
    }
    enemiesRef.current = nextEnemies

    const nextItems: Item[] = []
    for (const item of itemsRef.current) {
      const y = item.y + scroll * dt
      if (y > 120) continue
      if (item.side === sideRef.current && Math.abs(y - PLAYER_Y) < ITEM_HIT) {
        collectItem(item)
        continue
      }
      nextItems.push({ ...item, y })
    }
    itemsRef.current = nextItems

    setEnemies(nextEnemies.slice())
    setItems(nextItems.slice())

    if (hit) {
      endRun(px, hit.y)
      return
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    if (!running || over) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        leap('left')
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        leap('right')
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        leap()
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
        ...(shield > 0 ? [{ label: 'Shield', value: shield }] : []),
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={start}>
            Restart
          </button>
        ) : undefined
      }
    >
      <div className="climb-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over ? (
          <PlayIdle hint="Tap to swap — grab gems, shields & slow-mo." onPlay={start} />
        ) : (
          <div
            className={`climb-arena${shaking ? ' is-impact-shake' : ''}${slowLeft > 0 ? ' is-slow' : ''}${
              shield > 0 ? ' has-shield' : ''
            }`}
            role="application"
            aria-label="Cliff climb — swap walls, dodge enemies, grab items"
            onPointerDown={(e) => {
              e.preventDefault()
              leap()
            }}
          >
            <ImpactFlash trigger={impact.trigger} x={impact.x} y={impact.y} />
            <div className="climb-hud">{score}</div>
            {(shield > 0 || slowLeft > 0) && (
              <div className="climb-buffs" aria-hidden>
                {shield > 0 ? <span className="climb-buff is-shield">🛡️</span> : null}
                {slowLeft > 0 ? <span className="climb-buff is-slow">❄️</span> : null}
              </div>
            )}
            {toast ? <div className="climb-toast">{toast}</div> : null}
            <div className="climb-wall is-left" aria-hidden />
            <div className="climb-wall is-right" aria-hidden />
            {items.map((item) => (
              <div
                key={item.id}
                className={`climb-item is-${item.side} is-${item.kind}`}
                style={{ top: `${item.y}%` }}
                aria-hidden
              >
                {ITEM_META[item.kind].icon}
              </div>
            ))}
            {enemies.map((e) => (
              <div
                key={e.id}
                className={`climb-enemy is-${e.side}`}
                style={{ top: `${e.y}%` }}
                aria-hidden
              >
                {e.face}
              </div>
            ))}
            <div
              className={`climb-player${shield > 0 ? ' is-shielded' : ''}`}
              style={{
                left: `${sideX(side)}%`,
                top: `${PLAYER_Y}%`,
              }}
              aria-hidden
            />
            <div className="climb-hint">tap to swap · grab specials</div>
          </div>
        )}
        <ResultOverlay
          open={over}
          title="Caught!"
          subtitle={`Dodged ${score}`}
          celebrate={score >= 12}
          onPrimary={start}
        />
      </div>
    </GameShell>
  )
}
