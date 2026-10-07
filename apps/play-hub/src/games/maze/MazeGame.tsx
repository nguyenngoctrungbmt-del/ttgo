import { useMemo, useState } from 'react'
import { getGame } from '../../data/games'
import LevelMap from '../../shared/action/LevelMap'
import GameShell from '../../shared/GameShell'
import LevelCleared from '../../shared/LevelCleared'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { dirToDelta, useDirectionInput } from '../../shared/useDirectionInput'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import { mazeLevel } from './levels'
import './maze.css'

const meta = getGame('maze')

/** par = shortest path: 3★ within 2 steps, 2★ within +50%, else 1★. */
function starsFor(moves: number, par: number): number {
  if (moves <= par + 2) return 3
  if (moves <= Math.ceil(par * 1.5) + 4) return 2
  return 1
}

const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

export default function MazeGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const record = useProgressStore((s) => s.levelProgress.maze)
  const nextLevel = (record?.cleared ?? 0) + 1
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [level, setLevel] = useState(1)
  const [pos, setPos] = useState(0)
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  const [running, setRunning] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [stars, setStars] = useState(0)
  const [best, setBest] = useState(false)
  const [trail, setTrail] = useState<Set<number>>(() => new Set([0]))

  const { size, board, par } = useMemo(() => mazeLevel(level), [level])
  const goal = size * size - 1

  function start(lv: number, keepScore = false) {
    void unlockAudio()
    setLevel(lv)
    setPos(0)
    if (!keepScore) setScore(0)
    setMoves(0)
    setTrail(new Set([0]))
    setRunning(true)
    setCleared(false)
    sfx.ready()
  }

  function step(next: number) {
    if (!running || cleared) return
    if (board[next] === 1) {
      sfx.miss()
      return
    }
    void unlockAudio()
    sfx.move()
    setPos(next)
    setTrail((t) => new Set(t).add(next))
    const nextMoves = moves + 1
    setMoves(nextMoves)
    if (next === goal) {
      sfx.win()
      const st = starsFor(nextMoves, par)
      const amount = Math.max(40 + size * 8 - Math.max(0, nextMoves - par), 20) + st * 10
      const nextScore = score + amount
      setScore(nextScore)
      burst(amount, level)
      levelUp()
      setStars(st)
      setBest(useProgressStore.getState().completeLevel('maze', level, st).improved)
      setCleared(true)
      setRunning(false)
      recordPlay('maze', nextScore, true)
    }
  }

  function tryMove(dr: number, dc: number) {
    const r = Math.floor(pos / size) + dr
    const c = (pos % size) + dc
    if (r < 0 || c < 0 || r >= size || c >= size) return
    step(r * size + c)
  }

  const { swipeHandlers } = useDirectionInput({
    enabled: running && !cleared,
    onDirection: (dir) => {
      const { dr, dc } = dirToDelta(dir)
      tryMove(dr, dc)
    },
  })

  function giveUp() {
    setRunning(false)
    recordPlay('maze', score, score >= 60)
    sfx.lose()
  }

  function backToMap() {
    setRunning(false)
    setCleared(false)
  }

  const showBoard = running || cleared

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Lv', value: level },
        { label: 'Moves', value: `${moves}/${par}` },
        { label: 'Size', value: `${size}×${size}` },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={giveUp}>
            Levels
          </button>
        ) : undefined
      }
    >
      <div className="maze-board panel" {...swipeHandlers}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!showBoard && (
          <div className="play-idle">
            <p className="muted play-idle__hint">Swipe or use arrow keys. Start at S, reach E by the shortest way for ★★★.</p>
            <LevelMap game="maze" onPick={(lv) => start(lv)} />
            <button type="button" className="btn btn-primary btn-play" onClick={() => start(nextLevel)}>
              Play · Level {nextLevel}
            </button>
          </div>
        )}
        {showBoard && (
          <div
            className={`maze-grid${size >= 11 ? ' is-dense' : ''}`}
            style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          >
            {board.map((cell, index) => {
              const isStart = index === 0
              const isGoal = index === goal
              const isYou = index === pos
              const walked = !isYou && trail.has(index)
              return (
                <div
                  key={`${level}-${index}`}
                  className={`maze-cell${cell === 1 ? ' is-wall' : ''}${isYou ? ' is-you' : ''}${isGoal ? ' is-goal' : ''}${isStart ? ' is-start' : ''}${walked ? ' is-trail' : ''}`}
                >
                  {isYou ? '●' : isGoal ? 'E' : isStart ? 'S' : ''}
                </div>
              )
            })}
          </div>
        )}
        <LevelCleared
          open={cleared}
          title={starText(stars)}
          subtitle={`Level ${level} escaped · ${moves} moves (best ${par})${best ? ' · New best!' : ''} · Score ${score}`}
          onNext={() => start(level + 1, true)}
          onReplay={backToMap}
          replayLabel="Levels"
        />
      </div>
    </GameShell>
  )
}
