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
import './flap.css'

const meta = getGame('flap')

type Pipe = {
  id: number
  x: number
  /** Current gap center (0–100). */
  gapY: number
  /** Oscillation center — gap swings around this. */
  baseY: number
  amp: number
  phase: number
  /** rad/s */
  omega: number
  /** Gap height — always wide enough for the bird. */
  gap: number
  scored: boolean
}

const BIRD_X = 22
const BIRD_R = 3.2
const PIPE_W = 14
/** Minimum clear opening = bird diameter + generous pad. */
const GAP_MIN = BIRD_R * 2 + 14
const GAP_BASE = 28
/** Keep gap clear of ceiling/floor. */
const EDGE_PAD = 8
const GRAVITY = 95
const FLAP_V = -38
const PIPE_SPEED = 28

function gapBounds(gap: number) {
  const half = gap / 2
  return { lo: EDGE_PAD + half, hi: 100 - EDGE_PAD - half }
}

function clampGapY(y: number, gap: number) {
  const { lo, hi } = gapBounds(gap)
  return Math.max(lo, Math.min(hi, y))
}

function gapForScore(score: number) {
  return Math.max(GAP_MIN, GAP_BASE - score * 0.25)
}

function makePipe(id: number, score: number): Pipe {
  const gap = gapForScore(score)
  const { lo, hi } = gapBounds(gap)
  // Amp grows with score but never exceeds room so gap stays on-screen.
  const maxAmp = Math.max(0, (hi - lo) / 2 - 1)
  const amp =
    score < 2
      ? 0
      : Math.min(maxAmp, 4 + score * 0.85 + Math.random() * 2)
  const baseY = lo + amp + Math.random() * Math.max(0.1, hi - lo - 2 * amp)
  const omega = score < 2 ? 0 : 0.9 + Math.min(1.6, score * 0.08) + Math.random() * 0.35
  const phase = Math.random() * Math.PI * 2
  return {
    id,
    x: 110,
    gapY: clampGapY(baseY + Math.sin(phase) * amp, gap),
    baseY,
    amp,
    phase,
    omega,
    gap,
    scored: false,
  }
}

export default function FlapGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [birdY, setBirdY] = useState(50)
  const [pipes, setPipes] = useState<Pipe[]>([])
  const [score, setScore] = useState(0)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [impact, setImpact] = useState({ trigger: 0, x: BIRD_X, y: 50 })
  const [shaking, setShaking] = useState(false)

  const yRef = useRef(50)
  const vRef = useRef(0)
  const pipesRef = useRef<Pipe[]>([])
  const scoreRef = useRef(0)
  const runningRef = useRef(false)
  const dyingRef = useRef(false)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const spawnAtRef = useRef(0)
  const idRef = useRef(1)

  useEffect(() => () => cancelAnimationFrame(rafRef.current), [])

  function playImpact(x: number, y: number) {
    setImpact({ trigger: Date.now(), x, y })
    setShaking(true)
    window.setTimeout(() => setShaking(false), 420)
  }

  function endRun(hitX = BIRD_X, hitY = yRef.current) {
    if (!runningRef.current || dyingRef.current) return
    dyingRef.current = true
    runningRef.current = false
    playImpact(hitX, hitY)
    sfx.lose()
    window.setTimeout(() => {
      setRunning(false)
      setOver(true)
      recordPlay('flap', scoreRef.current, scoreRef.current >= 8)
    }, 420)
  }

  function start() {
    void unlockAudio()
    cancelAnimationFrame(rafRef.current)
    yRef.current = 50
    vRef.current = 0
    pipesRef.current = []
    scoreRef.current = 0
    idRef.current = 1
    spawnAtRef.current = 1.2
    dyingRef.current = false
    setBirdY(50)
    setPipes([])
    setScore(0)
    setOver(false)
    setImpact({ trigger: 0, x: BIRD_X, y: 50 })
    setRunning(true)
    runningRef.current = true
    lastRef.current = performance.now()
    sfx.ready()
    rafRef.current = requestAnimationFrame(tick)
  }

  function flap() {
    if (!runningRef.current) return
    void unlockAudio()
    vRef.current = FLAP_V
    sfx.tap()
  }

  function tick(now: number) {
    if (!runningRef.current) return
    const dt = Math.min(0.05, (now - lastRef.current) / 1000)
    lastRef.current = now

    vRef.current += GRAVITY * dt
    yRef.current += vRef.current * dt

    if (yRef.current < BIRD_R || yRef.current > 100 - BIRD_R) {
      setBirdY(yRef.current)
      endRun(BIRD_X, yRef.current)
      return
    }

    const speed = PIPE_SPEED + Math.min(scoreRef.current * 1.2, 18)
    spawnAtRef.current -= dt
    if (spawnAtRef.current <= 0) {
      pipesRef.current.push(makePipe(idRef.current++, scoreRef.current))
      spawnAtRef.current = Math.max(1.1, 1.6 - scoreRef.current * 0.025)
    }

    const next: Pipe[] = []
    let hit = false

    for (const p of pipesRef.current) {
      const x = p.x - speed * dt
      if (x < -PIPE_W) continue

      const inX = Math.abs(BIRD_X - x) < (PIPE_W + BIRD_R * 2) / 2 - 0.5
      // While the bird is inside the pipe column, ease vertical motion so
      // the opening can't yank away mid-crossing.
      const moveScale = inX ? 0.35 : 1
      const phase = p.phase + p.omega * dt * moveScale
      const gapY = clampGapY(p.baseY + Math.sin(phase) * p.amp, p.gap)

      let scored = p.scored
      if (!scored && x + PIPE_W / 2 < BIRD_X) {
        scored = true
        scoreRef.current += 1
        setScore(scoreRef.current)
        burst(10, Math.min(scoreRef.current, 6))
        sfx.match()
        if (scoreRef.current % 5 === 0) levelUp()
      }

      if (inX) {
        const top = gapY - p.gap / 2
        const bot = gapY + p.gap / 2
        if (yRef.current - BIRD_R < top || yRef.current + BIRD_R > bot) {
          hit = true
        }
      }

      next.push({ ...p, x, gapY, phase, scored })
    }

    pipesRef.current = next
    setPipes(next.slice())
    setBirdY(yRef.current)

    if (hit) {
      endRun(BIRD_X, yRef.current)
      return
    }

    rafRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => {
    if (!running || over) return
    function onKey(e: KeyboardEvent) {
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault()
        flap()
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
      <div className="flap-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over ? (
          <PlayIdle hint="Tap to flap — pipes slide up and down." onPlay={start} />
        ) : (
          <div
            className={`flap-arena${shaking ? ' is-impact-shake' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="Tap to flap"
            onPointerDown={(e) => {
              e.preventDefault()
              flap()
            }}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                flap()
              }
            }}
          >
            <ImpactFlash trigger={impact.trigger} x={impact.x} y={impact.y} />
            <div className="flap-hud">{score}</div>
            {pipes.map((p) => (
              <div key={p.id} className="flap-pipe-pair" style={{ left: `${p.x}%` }}>
                <div
                  className="flap-pipe is-top"
                  style={{ height: `${Math.max(0, p.gapY - p.gap / 2)}%` }}
                />
                <div
                  className="flap-pipe is-bot"
                  style={{
                    top: `${p.gapY + p.gap / 2}%`,
                    height: `${Math.max(0, 100 - (p.gapY + p.gap / 2))}%`,
                  }}
                />
              </div>
            ))}
            <div
              className="flap-bird"
              style={{
                left: `${BIRD_X}%`,
                top: `${birdY}%`,
                transform: `translate(-50%, -50%) rotate(${Math.max(-28, Math.min(42, vRef.current * 1.1))}deg)`,
              }}
            />
          </div>
        )}
        <ResultOverlay
          open={over}
          title="Crashed"
          subtitle={`Passed ${score} gate${score === 1 ? '' : 's'}`}
          celebrate={score >= 8}
          onPrimary={start}
        />
      </div>
    </GameShell>
  )
}
