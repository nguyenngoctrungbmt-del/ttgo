import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import { roundLimit, streakScore } from '../../shared/difficulty'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useDirectionInput } from '../../shared/useDirectionInput'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './arrow.css'

const meta = getGame('arrow')

const DIRS = [
  { id: 'up', label: '↑' },
  { id: 'down', label: '↓' },
  { id: 'left', label: '←' },
  { id: 'right', label: '→' },
] as const

type DirId = (typeof DIRS)[number]['id']

function randomDir(): DirId {
  return DIRS[Math.floor(Math.random() * DIRS.length)].id
}

export default function ArrowGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [dir, setDir] = useState<DirId>('up')
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [timeLeft, setTimeLeft] = useState(2)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const scoreRef = useRef(0)
  const roundId = useRef(0)
  const limitRef = useRef(2)

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    if (!running || over) return
    const current = roundId.current
    const limit = limitRef.current
    setTimeLeft(limit)
    const started = Date.now()
    const id = window.setInterval(() => {
      if (roundId.current !== current) {
        window.clearInterval(id)
        return
      }
      const left = Math.max(0, limit - (Date.now() - started) / 1000)
      setTimeLeft(Number(left.toFixed(1)))
      if (left <= 0) {
        window.clearInterval(id)
        fail()
      }
    }, 40)
    return () => window.clearInterval(id)
  }, [running, over, dir])

  function bump(next: DirId) {
    roundId.current += 1
    setDir(next)
  }

  function start() {
    void unlockAudio()
    setScore(0)
    scoreRef.current = 0
    setStreak(0)
    setLives(3)
    setLevel(1)
    limitRef.current = 2
    setOver(false)
    setRunning(true)
    setFlash(null)
    bump(randomDir())
    sfx.ready()
  }

  function fail() {
    sfx.miss()
    setFlash('bad')
    setStreak(0)
    setLives((l) => {
      const next = l - 1
      if (next <= 0) {
        setOver(true)
        setRunning(false)
        sfx.lose()
        recordPlay('arrow', scoreRef.current, scoreRef.current >= 80)
      } else {
        window.setTimeout(() => {
          setFlash(null)
          bump(randomDir())
        }, 260)
      }
      return next
    })
  }

  function pick(id: DirId) {
    if (!running || over) return
    void unlockAudio()
    if (id === dir) {
      sfx.tap()
      setFlash('ok')
      const nextStreak = streak + 1
      const gained = streakScore(8, streak, { cap: 8, per: 2 })
      setStreak(nextStreak)
      setScore((s) => {
        const next = s + gained
        scoreRef.current = next
        return next
      })
      burst(gained, nextStreak)
      const nextLevel = level + 1
      setLevel(nextLevel)
      limitRef.current = roundLimit(2, nextLevel, 0.75, 0.07)
      if (nextLevel % 5 === 0) levelUp()
      window.setTimeout(() => {
        setFlash(null)
        bump(randomDir())
      }, 160)
    } else {
      fail()
    }
  }

  const shown = DIRS.find((d) => d.id === dir)!

  const { swipeHandlers } = useDirectionInput({
    enabled: running && !over,
    onDirection: (id) => pick(id),
  })

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
      <div className={`arrow-board panel${flash ? ` is-${flash}` : ''}`} {...swipeHandlers}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Swipe or use arrow keys to match the direction." onPlay={start} />
        )}
        {running && (
          <>
            <div className="progress-bar">
              <span style={{ width: `${(timeLeft / limitRef.current) * 100}%` }} />
            </div>
            <div className="arrow-prompt" aria-live="polite">
              {shown.label}
            </div>
            <p className="arrow-hint muted">Swipe or press arrow keys</p>
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
