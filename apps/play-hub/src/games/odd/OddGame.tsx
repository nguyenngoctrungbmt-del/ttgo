import { useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { streakScore } from '../../shared/difficulty'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useProgressStore } from '../../store/progressStore'
import './odd.css'

const meta = getGame('odd')
const SHAPES = ['●', '▲', '■', '◆', '★', '✚'] as const

type Round = {
  cells: string[]
  oddIndex: number
}

function makeRound(level: number): Round {
  const size = level < 4 ? 9 : level < 8 ? 12 : 16
  const base = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  let odd = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  while (odd === base) odd = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  const oddIndex = Math.floor(Math.random() * size)
  const cells = Array.from({ length: size }, (_, i) => (i === oddIndex ? odd : base))
  return { cells, oddIndex }
}

export default function OddGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [round, setRound] = useState<Round>(() => makeRound(1))
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
    setRunning(true)
    setOver(false)
    setFlash(null)
    sfx.ready()
  }

  function pick(index: number) {
    if (!running || over) return
    void unlockAudio()
    if (index === round.oddIndex) {
      sfx.match()
      setFlash('ok')
      const nextLevel = level + 1
      const nextStreak = streak + 1
      const gained = streakScore(12, streak, { cap: 8, per: 2 })
      setStreak(nextStreak)
      setScore((s) => s + gained)
      burst(gained, nextStreak)
      setLevel(nextLevel)
      if (nextLevel % 5 === 0) levelUp()
      window.setTimeout(() => {
        setFlash(null)
        setRound(makeRound(nextLevel))
      }, 220)
      return
    }

    sfx.miss()
    setFlash('bad')
    setStreak(0)
    setLives((l) => {
      const next = l - 1
      if (next <= 0) {
        setOver(true)
        setRunning(false)
        sfx.lose()
        setScore((current) => {
          recordPlay('odd', current, current >= 80)
          return current
        })
      } else {
        window.setTimeout(() => {
          setFlash(null)
          setRound(makeRound(level))
        }, 250)
      }
      return next
    })
  }

  const cols = round.cells.length <= 9 ? 3 : round.cells.length <= 12 ? 4 : 4

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
      <div className={`odd-board panel${flash ? ` is-${flash}` : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Start, then tap the odd shape." onPlay={start} />
        )}
        {running && (
          <div className="odd-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {round.cells.map((shape, index) => (
              <button
                key={`${level}-${index}-${shape}`}
                type="button"
                className="odd-cell"
                onClick={() => pick(index)}
                aria-label={`Shape ${shape}`}
              >
                {shape}
              </button>
            ))}
          </div>
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
