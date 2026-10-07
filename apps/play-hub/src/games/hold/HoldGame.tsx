import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useProgressStore } from '../../store/progressStore'
import './hold.css'

const meta = getGame('hold')

function makeTarget(level: number) {
  return Math.max(0.7, 2.4 - level * 0.08) + Math.random() * 0.9
}

export default function HoldGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [target, setTarget] = useState(() => makeTarget(1))
  const [held, setHeld] = useState(0)
  const [holding, setHolding] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const startAt = useRef(0)
  const tick = useRef<number | null>(null)
  const scoreRef = useRef(0)

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(
    () => () => {
      if (tick.current) window.clearInterval(tick.current)
    },
    [],
  )

  function start() {
    void unlockAudio()
    if (tick.current) window.clearInterval(tick.current)
    setScore(0)
    scoreRef.current = 0
    setStreak(0)
    setLives(3)
    setLevel(1)
    setTarget(makeTarget(1))
    setHeld(0)
    setHolding(false)
    setRunning(true)
    setOver(false)
    setFlash(null)
    sfx.ready()
  }

  function beginHold() {
    if (!running || over || holding) return
    void unlockAudio()
    setHolding(true)
    startAt.current = performance.now()
    sfx.tick()
    tick.current = window.setInterval(() => {
      setHeld((performance.now() - startAt.current) / 1000)
    }, 30)
  }

  function endHold() {
    if (!holding || !running || over) return
    if (tick.current) window.clearInterval(tick.current)
    setHolding(false)
    const duration = (performance.now() - startAt.current) / 1000
    setHeld(duration)
    const err = Math.abs(duration - target)
    const tol = Math.max(0.12, 0.28 - level * 0.01)
    if (err <= tol) {
      sfx.match()
      setFlash('ok')
      const accuracy = 1 - err / tol
      const gained = 10 + Math.round(accuracy * 16) + Math.min(streak, 6) * 2
      const nextScore = scoreRef.current + gained
      scoreRef.current = nextScore
      setScore(nextScore)
      const nextStreak = streak + 1
      setStreak(nextStreak)
      burst(gained, nextStreak)
      const nextLevel = level + 1
      setLevel(nextLevel)
      if (nextLevel % 5 === 0) levelUp()
      window.setTimeout(() => {
        setFlash(null)
        setHeld(0)
        setTarget(makeTarget(nextLevel))
      }, 320)
    } else {
      sfx.miss()
      setFlash('bad')
      setStreak(0)
      setLives((l) => {
        const left = l - 1
        if (left <= 0) {
          setOver(true)
          setRunning(false)
          sfx.lose()
          recordPlay('hold', scoreRef.current, scoreRef.current >= 80)
        } else {
          window.setTimeout(() => {
            setFlash(null)
            setHeld(0)
            setTarget(makeTarget(level))
          }, 320)
        }
        return left
      })
    }
  }

  const fill = Math.min((held / Math.max(target * 1.35, 0.01)) * 100, 100)
  const mark = (target / Math.max(target * 1.35, 0.01)) * 100

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Streak', value: streak },
        { label: 'Lv', value: level },
        { label: 'Lives', value: lives },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={start}>
            Restart
          </button>
        ) : undefined
      }
    >
      <div className={`hold-board panel${flash ? ` is-${flash}` : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Hold the button, release on the target time." onPlay={start} />
        )}
        {running && (
          <>
            <div className="hold-target">
              Hold <strong>{target.toFixed(2)}s</strong>
            </div>
            <div className="hold-ring">
              <div className="hold-fill" style={{ height: `${fill}%` }} />
              <div className="hold-mark" style={{ bottom: `${mark}%` }} />
              <span className="hold-readout">{held.toFixed(2)}s</span>
            </div>
            <button
              type="button"
              className={`hold-btn${holding ? ' is-holding' : ''}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                beginHold()
              }}
              onPointerUp={endHold}
              onPointerCancel={endHold}
              onPointerLeave={() => {
                if (holding) endHold()
              }}
            >
              {holding ? 'Release…' : 'Hold'}
            </button>
          </>
        )}
        {over && (
          <div className="overlay">
            <div className="overlay-card panel">
              <h2>Round over</h2>
              <p>Score {score} · Level {level}</p>
              <div className="overlay-actions">
                <button type="button" className="btn btn-primary" onClick={start}>
                  Play again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  )
}
