import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { streakScore } from '../../shared/difficulty'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useProgressStore } from '../../store/progressStore'
import './same.css'

const meta = getGame('same')
const PALETTE = ['#0D9488', '#45C486', '#FFC83D', '#FF6B6B', '#0284C7'] as const

type Round = {
  cells: number[]
  target: number
}

function makeRound(level: number): Round {
  const size = level < 3 ? 9 : level < 6 ? 12 : 16
  const colors = Math.min(3 + Math.floor(level / 2), PALETTE.length)
  const target = Math.floor(Math.random() * colors)
  const cells = Array.from({ length: size }, () => Math.floor(Math.random() * colors))
  // ensure at least 2 targets
  let count = cells.filter((c) => c === target).length
  while (count < 2) {
    cells[Math.floor(Math.random() * size)] = target
    count = cells.filter((c) => c === target).length
  }
  return { cells, target }
}

export default function SameGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [round, setRound] = useState<Round>(() => makeRound(1))
  const [cleared, setCleared] = useState<number[]>([])
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [timeLeft, setTimeLeft] = useState(6)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const scoreRef = useRef(0)
  const roundId = useRef(0)
  const limitRef = useRef(6)
  const targetsLeft = useRef(0)

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
    }, 50)
    return () => window.clearInterval(id)
  }, [running, over, round])

  function bump(next: Round) {
    roundId.current += 1
    targetsLeft.current = next.cells.filter((c) => c === next.target).length
    setRound(next)
    setCleared([])
  }

  function start() {
    void unlockAudio()
    setScore(0)
    scoreRef.current = 0
    setStreak(0)
    setLives(3)
    setLevel(1)
    limitRef.current = 6
    setOver(false)
    setRunning(true)
    setFlash(null)
    bump(makeRound(1))
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
        recordPlay('same', scoreRef.current, scoreRef.current >= 80)
      } else {
        window.setTimeout(() => {
          setFlash(null)
          bump(makeRound(level))
        }, 280)
      }
      return next
    })
  }

  function tap(index: number) {
    if (!running || over || cleared.includes(index)) return
    void unlockAudio()
    if (round.cells[index] !== round.target) {
      fail()
      return
    }
    sfx.pop()
    const nextCleared = [...cleared, index]
    setCleared(nextCleared)
    targetsLeft.current -= 1
    if (targetsLeft.current <= 0) {
      sfx.match()
      setFlash('ok')
      const nextStreak = streak + 1
      const gained = streakScore(12, streak, { cap: 6, per: 2 })
      setStreak(nextStreak)
      setScore((s) => {
        const next = s + gained
        scoreRef.current = next
        return next
      })
      burst(gained, nextStreak)
      const nextLevel = level + 1
      setLevel(nextLevel)
      if (nextLevel % 5 === 0) levelUp()
      limitRef.current = Math.max(2.8, 6 - nextLevel * 0.18)
      window.setTimeout(() => {
        setFlash(null)
        bump(makeRound(nextLevel))
      }, 260)
    }
  }

  const cols = round.cells.length <= 9 ? 3 : 4

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
      <div className={`same-board panel${flash ? ` is-${flash}` : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Clear every tile matching the target color." onPlay={start} />
        )}
        {running && (
          <>
            <div className="progress-bar">
              <span style={{ width: `${(timeLeft / limitRef.current) * 100}%` }} />
            </div>
            <div className="same-target">
              Tap all
              <span className="same-swatch" style={{ background: PALETTE[round.target] }} />
            </div>
            <div className="same-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {round.cells.map((c, index) => (
                <button
                  key={`${level}-${index}`}
                  type="button"
                  className={`same-cell${cleared.includes(index) ? ' is-done' : ''}`}
                  style={{ background: PALETTE[c] }}
                  onClick={() => tap(index)}
                  disabled={cleared.includes(index)}
                  aria-label={`Color tile`}
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
