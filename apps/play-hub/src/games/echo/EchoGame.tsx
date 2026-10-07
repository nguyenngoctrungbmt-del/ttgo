import { useState } from 'react'
import { getGame } from '../../data/games'
import { streakScore } from '../../shared/difficulty'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './echo.css'

const meta = getGame('echo')

const COLORS = ['#0D9488', '#45C486', '#FFC83D', '#FF6B6B', '#0284C7', '#26C6DA'] as const

type Round = {
  pattern: number[]
  grid: number[]
}

function makeRound(level: number): Round {
  const size = level < 3 ? 4 : level < 6 ? 6 : 9
  const patternLen = Math.min(2 + Math.floor(level / 2), 5)
  const paletteSize = Math.min(3 + Math.floor(level / 3), COLORS.length)
  const pattern = Array.from({ length: patternLen }, () => Math.floor(Math.random() * paletteSize))
  const grid = Array.from({ length: size }, () => Math.floor(Math.random() * paletteSize))
  const cols = size <= 4 ? 2 : 3
  const maxStart = size - patternLen
  const start = Math.max(0, Math.floor(Math.random() * (maxStart + 1)))
  const row = Math.floor(start / cols)
  let plant = start
  if (start % cols + patternLen > cols) {
    plant = row * cols
    if (plant + patternLen > size) plant = size - patternLen
  }
  for (let i = 0; i < patternLen; i += 1) grid[plant + i] = pattern[i]
  return { pattern, grid }
}

export default function EchoGame() {
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
    recordPlay('echo', finalScore, finalScore >= 80)
  }

  function tap(index: number) {
    if (!running || over || picked.includes(index)) return
    void unlockAudio()
    const expectIndex = picked.length
    const expectColor = round.pattern[expectIndex]
    if (round.grid[index] !== expectColor) {
      sfx.miss()
      setFlash('bad')
      setStreak(0)
      setPicked([])
      setLives((l) => {
        const left = l - 1
        if (left <= 0) endRun(score)
        else {
          window.setTimeout(() => {
            setFlash(null)
            setRound(makeRound(level))
          }, 280)
        }
        return left
      })
      return
    }

    sfx.tap()
    const next = [...picked, index]
    setPicked(next)

    if (next.length === round.pattern.length) {
      sfx.match()
      setFlash('ok')
      const nextStreak = streak + 1
      const gained = streakScore(14 + round.pattern.length * 4, streak, { cap: 6, per: 2 })
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
      }, 300)
    }
  }

  const cols = round.grid.length <= 4 ? 2 : 3

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
      <div className={`echo-board panel${flash ? ` is-${flash}` : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Match the color pattern on the grid, in order." onPlay={start} />
        )}
        {running && (
          <>
            <div className="echo-pattern">
              {round.pattern.map((c, i) => (
                <span
                  key={`${level}-p-${i}`}
                  className={`echo-swatch${picked.length > i ? ' is-done' : ''}`}
                  style={{ background: COLORS[c] }}
                />
              ))}
            </div>
            <div className="echo-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {round.grid.map((c, index) => (
                <button
                  key={`${level}-${index}`}
                  type="button"
                  className={`echo-cell${picked.includes(index) ? ' is-picked' : ''}`}
                  style={{ background: COLORS[c] }}
                  onClick={() => tap(index)}
                  aria-label={`Color ${c + 1}`}
                />
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
