import { useState } from 'react'
import { getGame } from '../../data/games'
import { streakScore } from '../../shared/difficulty'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './sum.css'

const meta = getGame('sum')

type Round = {
  target: number
  cells: number[]
  pair: [number, number]
}

function makeRound(level: number): Round {
  const size = level < 4 ? 6 : level < 8 ? 8 : 9
  const a = 2 + Math.floor(Math.random() * (6 + level))
  const b = 2 + Math.floor(Math.random() * (6 + level))
  const target = a + b
  const cells = Array.from({ length: size }, () => 1 + Math.floor(Math.random() * (target - 1)))
  const i = Math.floor(Math.random() * size)
  let j = Math.floor(Math.random() * size)
  while (j === i) j = Math.floor(Math.random() * size)
  cells[i] = a
  cells[j] = b
  return { target, cells, pair: [i, j] }
}

export default function SumGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [round, setRound] = useState<Round>(() => makeRound(1))
  const [picked, setPicked] = useState<number[]>([])
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)

  function start() {
    void unlockAudio()
    setScore(0)
    setStreak(0)
    setLives(3)
    setLevel(1)
    setRound(makeRound(1))
    setPicked([])
    setRunning(true)
    setOver(false)
    setFlash(null)
    sfx.ready()
  }

  function endRun(finalScore: number) {
    setOver(true)
    setRunning(false)
    sfx.lose()
    recordPlay('sum', finalScore, finalScore >= 80)
  }

  function tap(index: number) {
    if (!running || over || picked.includes(index)) return
    void unlockAudio()
    const next = [...picked, index]
    setPicked(next)
    sfx.tap()

    if (next.length < 2) return

    const [x, y] = next
    const sum = round.cells[x] + round.cells[y]
    if (sum === round.target) {
      sfx.match()
      setFlash('ok')
      const nextStreak = streak + 1
      const gained = streakScore(12, streak, { cap: 8, per: 2 })
      const nextScore = score + gained
      const nextLevel = level + 1
      setScore(nextScore)
      setStreak(nextStreak)
      burst(gained, nextStreak)
      setLevel(nextLevel)
      if (nextLevel % 5 === 0) levelUp()
      window.setTimeout(() => {
        setFlash(null)
        setPicked([])
        setRound(makeRound(nextLevel))
      }, 280)
    } else {
      sfx.miss()
      setFlash('bad')
      setStreak(0)
      setLives((l) => {
        const left = l - 1
        if (left <= 0) {
          endRun(score)
        } else {
          window.setTimeout(() => {
            setFlash(null)
            setPicked([])
            setRound(makeRound(level))
          }, 280)
        }
        return left
      })
    }
  }

  const cols = 3

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
      <div className={`sum-board panel${flash ? ` is-${flash}` : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Start, then pick two numbers that add up." onPlay={start} />
        )}
        {running && (
          <>
            <div className="sum-target">
              Target <strong>{round.target}</strong>
            </div>
            <div className="sum-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {round.cells.map((value, index) => (
                <button
                  key={`${level}-${index}-${value}`}
                  type="button"
                  className={`sum-cell${picked.includes(index) ? ' is-picked' : ''}`}
                  onClick={() => tap(index)}
                >
                  {value}
                </button>
              ))}
            </div>
          </>
        )}
        {over && (
          <div className="overlay">
            <div className="overlay-card panel">
              <h2>Round over</h2>
              <p>
                Score {score} · Level {level}
              </p>
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
