import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { streakScore } from '../../shared/difficulty'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useProgressStore } from '../../store/progressStore'
import './hop.css'

const meta = getGame('hop')
const PADS = 9

function makePath(level: number): number[] {
  const len = Math.min(3 + level, 7)
  const path: number[] = []
  let cur = Math.floor(Math.random() * PADS)
  path.push(cur)
  while (path.length < len) {
    const r = Math.floor(cur / 3)
    const c = cur % 3
    const opts: number[] = []
    if (r > 0) opts.push(cur - 3)
    if (r < 2) opts.push(cur + 3)
    if (c > 0) opts.push(cur - 1)
    if (c < 2) opts.push(cur + 1)
    const filtered = opts.filter((n) => n !== path[path.length - 2])
    const pool = filtered.length ? filtered : opts
    cur = pool[Math.floor(Math.random() * pool.length)]
    path.push(cur)
  }
  return path
}

export default function HopGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [path, setPath] = useState<number[]>(() => makePath(1))
  const [step, setStep] = useState(0)
  const [showing, setShowing] = useState(false)
  const [lit, setLit] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const scoreRef = useRef(0)
  const timers = useRef<number[]>([])

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(
    () => () => {
      timers.current.forEach((t) => window.clearTimeout(t))
    },
    [],
  )

  function clearTimers() {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  function playPath(nextPath: number[], nextLevel: number) {
    clearTimers()
    setPath(nextPath)
    setStep(0)
    setShowing(true)
    setLit(null)
    setLevel(nextLevel)
    const stepMs = Math.max(240, 420 - (nextLevel - 1) * 20)
    const showMs = Math.max(160, 280 - (nextLevel - 1) * 10)
    nextPath.forEach((pad, i) => {
      timers.current.push(
        window.setTimeout(() => {
          setLit(pad)
          sfx.tick()
        }, 350 + i * stepMs),
      )
      timers.current.push(
        window.setTimeout(() => {
          setLit(null)
        }, 350 + i * stepMs + showMs),
      )
    })
    timers.current.push(
      window.setTimeout(() => {
        setShowing(false)
        setLit(null)
      }, 350 + nextPath.length * stepMs + 100),
    )
  }

  function start() {
    void unlockAudio()
    clearTimers()
    setScore(0)
    scoreRef.current = 0
    setStreak(0)
    setLives(3)
    setOver(false)
    setRunning(true)
    setFlash(null)
    playPath(makePath(1), 1)
    sfx.ready()
  }

  function fail() {
    sfx.miss()
    setFlash('bad')
    setStreak(0)
    setLives((l) => {
      const left = l - 1
      if (left <= 0) {
        setOver(true)
        setRunning(false)
        sfx.lose()
        recordPlay('hop', scoreRef.current, scoreRef.current >= 80)
      } else {
        window.setTimeout(() => {
          setFlash(null)
          playPath(makePath(level), level)
        }, 400)
      }
      return left
    })
  }

  function tap(index: number) {
    if (!running || over || showing) return
    void unlockAudio()
    if (index !== path[step]) {
      fail()
      return
    }
    sfx.tap()
    const nextStep = step + 1
    setLit(index)
    if (nextStep >= path.length) {
      sfx.match()
      setFlash('ok')
      const nextStreak = streak + 1
      const gained = streakScore(14 + path.length * 3, streak, { cap: 6, per: 2 })
      setStreak(nextStreak)
      setScore((s) => {
        const next = s + gained
        scoreRef.current = next
        return next
      })
      burst(gained, nextStreak)
      const nextLevel = level + 1
      if (nextLevel % 5 === 0) levelUp()
      window.setTimeout(() => {
        setFlash(null)
        playPath(makePath(nextLevel), nextLevel)
      }, 350)
    } else {
      setStep(nextStep)
      window.setTimeout(() => setLit(null), 180)
    }
  }

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
      <div className={`hop-board panel${flash ? ` is-${flash}` : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Watch the glowing path, then hop the pads in order." onPlay={start} />
        )}
        {running && (
          <>
            <p className="hop-hint muted">{showing ? 'Watch…' : 'Your turn'}</p>
            <div className="hop-grid">
              {Array.from({ length: PADS }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  className={`hop-pad${lit === index ? ' is-lit' : ''}`}
                  onClick={() => tap(index)}
                  disabled={showing}
                  aria-label={`Pad ${index + 1}`}
                />
              ))}
            </div>
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
