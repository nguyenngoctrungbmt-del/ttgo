import { useMemo, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './order.css'

const meta = getGame('order')

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function makeBoard(count: number) {
  return shuffle(Array.from({ length: count }, (_, i) => i + 1))
}

export default function OrderGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [count, setCount] = useState(6)
  const [board, setBoard] = useState<number[]>(() => makeBoard(6))
  const [expect, setExpect] = useState(1)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [cleared, setCleared] = useState<number[]>([])
  const [bad, setBad] = useState<number | null>(null)

  const cols = useMemo(() => (count <= 6 ? 3 : count <= 9 ? 3 : 4), [count])

  function start(nextCount = 6) {
    void unlockAudio()
    setCount(nextCount)
    setBoard(makeBoard(nextCount))
    setExpect(1)
    setScore(0)
    setStreak(0)
    setRunning(true)
    setOver(false)
    setCleared([])
    setBad(null)
    sfx.ready()
  }

  function tap(value: number) {
    if (!running || over || cleared.includes(value)) return
    void unlockAudio()
    if (value !== expect) {
      sfx.miss()
      setBad(value)
      setStreak(0)
      window.setTimeout(() => setBad(null), 250)
      setRunning(false)
      setOver(true)
      recordPlay('order', score, score >= 40)
      sfx.lose()
      return
    }

    sfx.tap()
    const nextCleared = [...cleared, value]
    setCleared(nextCleared)
    const nextStreak = streak + 1
    const gained = 8 + count + Math.min(streak, 6)
    setStreak(nextStreak)
    if (value === count) {
      sfx.win()
      const boosted = score + gained + 20
      const nextCount = Math.min(count + 2, 12)
      setScore(boosted)
      burst(gained + 20, nextStreak)
      levelUp()
      window.setTimeout(() => {
        setCount(nextCount)
        setBoard(makeBoard(nextCount))
        setExpect(1)
        setCleared([])
      }, 350)
      return
    }
    setScore((s) => s + gained)
    burst(gained, nextStreak)
    setExpect(value + 1)
  }

  function endRun() {
    setRunning(false)
    setOver(true)
    recordPlay('order', score, score >= 40)
    sfx.lose()
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Streak', value: streak },
        { label: 'Next', value: expect },
        { label: 'Size', value: count },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={endRun}>
            Give up
          </button>
        ) : undefined
      }
    >
      <div className="order-board panel">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint={`Start, then tap 1 → ${count} in order.`} onPlay={() => start()} />
        )}
        {(running || over) && (
          <div className="order-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {board.map((value) => {
              const done = cleared.includes(value)
              return (
                <button
                  key={`${count}-${value}`}
                  type="button"
                  className={`order-cell${done ? ' is-done' : ''}${bad === value ? ' is-bad' : ''}`}
                  onClick={() => tap(value)}
                  disabled={!running || done}
                >
                  {value}
                </button>
              )
            })}
          </div>
        )}
        {over && (
          <div className="overlay">
            <div className="overlay-card panel">
              <h2>Run ended</h2>
              <p>Score {score}</p>
              <div className="overlay-actions">
                <button type="button" className="btn btn-primary" onClick={() => start(6)}>
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
