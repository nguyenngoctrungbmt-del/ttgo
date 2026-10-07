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
import './runner.css'

const meta = getGame('runner')

type Lane = 0 | 1 | 2
type ObstacleKind = 'block' | 'crate' | 'spike'

type Obstacle = {
  id: number
  lane: Lane
  y: number
  kind: ObstacleKind
  scored: boolean
}

const LANE_X = [22, 50, 78] as const
const PLAYER_Y = 82
const HIT_R = 7

function kindFor(score: number): ObstacleKind {
  const roll = Math.random()
  if (score > 12 && roll < 0.28) return 'spike'
  if (score > 5 && roll < 0.45) return 'crate'
  return 'block'
}

function makeObstacle(id: number, score: number, avoidLane?: Lane): Obstacle {
  let lane = Math.floor(Math.random() * 3) as Lane
  if (avoidLane !== undefined && lane === avoidLane) {
    lane = ((lane + 1 + Math.floor(Math.random() * 2)) % 3) as Lane
  }
  return { id, lane, y: -8, kind: kindFor(score), scored: false }
}

export default function RunnerGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [lane, setLane] = useState<Lane>(1)
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [score, setScore] = useState(0)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [impact, setImpact] = useState({ trigger: 0, x: 50, y: PLAYER_Y })
  const [shaking, setShaking] = useState(false)

  const laneRef = useRef<Lane>(1)
  const obsRef = useRef<Obstacle[]>([])
  const scoreRef = useRef(0)
  const runningRef = useRef(false)
  const dyingRef = useRef(false)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const spawnAtRef = useRef(0)
  const idRef = useRef(1)
  const lastSpawnLaneRef = useRef<Lane | undefined>(undefined)
  const swipeXRef = useRef<number | null>(null)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function playImpact(x: number, y: number) {
    setImpact({ trigger: Date.now(), x, y })
    setShaking(true)
    window.setTimeout(() => setShaking(false), 420)
  }

  function endRun(hitX = LANE_X[laneRef.current], hitY = PLAYER_Y) {
    if (!runningRef.current || dyingRef.current) return
    dyingRef.current = true
    runningRef.current = false
    playImpact(hitX, hitY)
    sfx.lose()
    window.setTimeout(() => {
      setRunning(false)
      setOver(true)
      recordPlay('runner', scoreRef.current, scoreRef.current >= 15)
    }, 420)
  }

  function start() {
    void unlockAudio()
    cancelAnimationFrame(rafRef.current)
    laneRef.current = 1
    obsRef.current = []
    scoreRef.current = 0
    idRef.current = 1
    spawnAtRef.current = 0.9
    lastSpawnLaneRef.current = undefined
    dyingRef.current = false
    setLane(1)
    setObstacles([])
    setScore(0)
    setOver(false)
    setImpact({ trigger: 0, x: 50, y: PLAYER_Y })
    setRunning(true)
    runningRef.current = true
    lastRef.current = performance.now()
    sfx.ready()
    rafRef.current = requestAnimationFrame(tick)
  }

  function shift(dir: -1 | 1) {
    if (!runningRef.current) return
    void unlockAudio()
    const next = Math.max(0, Math.min(2, laneRef.current + dir)) as Lane
    if (next === laneRef.current) return
    laneRef.current = next
    setLane(next)
    sfx.tap()
  }

  function tick(now: number) {
    if (!runningRef.current) return
    const dt = Math.min(0.05, (now - lastRef.current) / 1000)
    lastRef.current = now

    const speed = 55 + Math.min(scoreRef.current * 1.8, 45)
    spawnAtRef.current -= dt
    if (spawnAtRef.current <= 0) {
      const o = makeObstacle(idRef.current++, scoreRef.current, lastSpawnLaneRef.current)
      lastSpawnLaneRef.current = o.lane
      obsRef.current.push(o)
      // Sometimes spawn a second obstacle in another lane
      if (scoreRef.current > 8 && Math.random() < 0.35) {
        const extra = makeObstacle(idRef.current++, scoreRef.current, o.lane)
        obsRef.current.push(extra)
      }
      spawnAtRef.current = Math.max(0.42, 1.05 - scoreRef.current * 0.02)
    }

    const next: Obstacle[] = []
    let hit = false

    for (const o of obsRef.current) {
      const y = o.y + speed * dt
      if (y > 112) continue

      let scored = o.scored
      if (!scored && y > PLAYER_Y + HIT_R) {
        scored = true
        scoreRef.current += 1
        setScore(scoreRef.current)
        burst(8, Math.min(scoreRef.current, 6))
        sfx.match()
        if (scoreRef.current % 10 === 0) levelUp()
      }

      if (o.lane === laneRef.current && Math.abs(y - PLAYER_Y) < HIT_R) {
        hit = true
      }

      next.push({ ...o, y, scored })
    }

    obsRef.current = next
    setObstacles(next.slice())

    if (hit) {
      endRun(LANE_X[laneRef.current], PLAYER_Y)
      return
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    if (!running || over) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault()
        shift(-1)
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        shift(1)
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
      stats={[{ label: 'Score', value: score }]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={start}>
            Restart
          </button>
        ) : undefined
      }
    >
      <div className="runner-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over ? (
          <PlayIdle hint="Swipe or tap sides to switch lanes." onPlay={start} />
        ) : (
          <div
            className={`runner-arena${shaking ? ' is-impact-shake' : ''}`}
            role="application"
            aria-label="Lane rush — swipe left or right"
            onPointerDown={(e) => {
              e.preventDefault()
              swipeXRef.current = e.clientX
            }}
            onPointerUp={(e) => {
              if (swipeXRef.current == null) return
              const dx = e.clientX - swipeXRef.current
              swipeXRef.current = null
              if (Math.abs(dx) < 24) {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                shift(e.clientX < rect.left + rect.width / 2 ? -1 : 1)
              } else {
                shift(dx < 0 ? -1 : 1)
              }
            }}
          >
            <ImpactFlash trigger={impact.trigger} x={impact.x} y={impact.y} />
            <div className="runner-hud">{score}</div>
            <div className="runner-road" aria-hidden />
            <div className="runner-lanes" aria-hidden>
              <div className="runner-lane" />
              <div className="runner-lane" />
              <div className="runner-lane" />
            </div>
            {obstacles.map((o) => (
              <div
                key={o.id}
                className={`runner-obstacle${o.kind === 'crate' ? ' is-crate' : ''}${o.kind === 'spike' ? ' is-spike' : ''}`}
                style={{ left: `${LANE_X[o.lane]}%`, top: `${o.y}%` }}
                aria-hidden
              />
            ))}
            <div
              className="runner-player"
              style={{ left: `${LANE_X[lane]}%`, top: `${PLAYER_Y}%` }}
              aria-hidden
            >
              <span className="runner-car-cabin" />
              <span className="runner-car-hood" />
              <span className="runner-car-wheel is-fl" />
              <span className="runner-car-wheel is-fr" />
              <span className="runner-car-wheel is-rl" />
              <span className="runner-car-wheel is-rr" />
              <span className="runner-car-light is-l" />
              <span className="runner-car-light is-r" />
            </div>
            <div className="runner-hint">← swipe / tap →</div>
          </div>
        )}
        <ResultOverlay
          open={over}
          title="Crashed"
          subtitle={`Cleared ${score} hazard${score === 1 ? '' : 's'}`}
          celebrate={score >= 15}
          onPrimary={start}
        />
      </div>
    </GameShell>
  )
}
