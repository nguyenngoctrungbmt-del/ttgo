import { useCallback, useEffect, useState } from 'react'
import { getGame } from '../../data/games'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useDirectionInput, type Dir } from '../../shared/useDirectionInput'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './merge2048.css'

type Board = number[][]

const SIZE = 4
const meta = getGame('2048')

function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => 0))
}

function clone(board: Board): Board {
  return board.map((row) => [...row])
}

function empties(board: Board): Array<[number, number]> {
  const cells: Array<[number, number]> = []
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === 0) cells.push([r, c])
    }
  }
  return cells
}

function spawn(board: Board): Board {
  const spots = empties(board)
  if (spots.length === 0) return board
  const next = clone(board)
  const [r, c] = spots[Math.floor(Math.random() * spots.length)]
  next[r][c] = Math.random() < 0.9 ? 2 : 4
  return next
}

function slideLine(line: number[]): { line: number[]; gained: number; moved: boolean } {
  const filtered = line.filter((n) => n !== 0)
  const merged: number[] = []
  let gained = 0
  let i = 0

  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const value = filtered[i] * 2
      merged.push(value)
      gained += value
      i += 2
    } else {
      merged.push(filtered[i])
      i += 1
    }
  }

  while (merged.length < SIZE) merged.push(0)
  const moved = merged.some((v, idx) => v !== line[idx])
  return { line: merged, gained, moved }
}

function moveBoard(board: Board, dir: Dir): { board: Board; score: number; moved: boolean } {
  const next = emptyBoard()
  let score = 0
  let moved = false

  for (let i = 0; i < SIZE; i += 1) {
    let line: number[]

    if (dir === 'left') line = board[i]
    else if (dir === 'right') line = [...board[i]].reverse()
    else if (dir === 'up') line = board.map((row) => row[i])
    else line = board.map((row) => row[i]).reverse()

    const result = slideLine(line)
    score += result.gained
    moved = moved || result.moved

    const out = dir === 'right' || dir === 'down' ? [...result.line].reverse() : result.line

    if (dir === 'left' || dir === 'right') {
      next[i] = out
    } else {
      for (let j = 0; j < SIZE; j += 1) next[j][i] = out[j]
    }
  }

  return { board: next, score, moved }
}

function canMove(board: Board): boolean {
  if (empties(board).length > 0) return true
  for (const dir of ['up', 'down', 'left', 'right'] as Dir[]) {
    if (moveBoard(board, dir).moved) return true
  }
  return false
}

function createGame(): Board {
  return spawn(spawn(emptyBoard()))
}

function tileClass(value: number): string {
  if (value === 0) return 'tile tile-empty'
  if (value <= 4) return `tile tile-${value}`
  if (value <= 64) return 'tile tile-mid'
  if (value <= 512) return 'tile tile-high'
  return 'tile tile-peak'
}

export default function Merge2048Game() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [board, setBoard] = useState<Board>(() => createGame())
  const [score, setScore] = useState(0)
  const [bestRun, setBestRun] = useState(0)
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)
  const [recorded, setRecorded] = useState(false)
  const [peakTile, setPeakTile] = useState(2)

  const applyMove = useCallback(
    (dir: Dir) => {
      if (over) return
      const result = moveBoard(board, dir)
      if (!result.moved) return

      void unlockAudio()
      if (result.score > 0) {
        sfx.match()
        burst(result.score, Math.min(10, Math.floor(Math.log2(Math.max(result.score, 2)))))
      } else sfx.move()

      const withSpawn = spawn(result.board)
      const nextScore = score + result.score
      setBoard(withSpawn)
      setScore(nextScore)
      setBestRun((b) => Math.max(b, nextScore))

      const maxTile = Math.max(...withSpawn.flat())
      if (maxTile > peakTile) {
        setPeakTile(maxTile)
        if (maxTile >= 128 && (maxTile & (maxTile - 1)) === 0) levelUp()
      }

      const hit2048 = withSpawn.some((row) => row.some((n) => n >= 2048))
      if (hit2048 && !won) {
        setWon(true)
        sfx.win()
      }

      if (!canMove(withSpawn)) {
        setOver(true)
        sfx.lose()
      }
    },
    [board, over, score, won, peakTile, burst, levelUp],
  )

  const { swipeHandlers } = useDirectionInput({
    enabled: !over,
    onDirection: applyMove,
  })

  useEffect(() => {
    if ((!over && !won) || recorded) return
    recordPlay('2048', score, won || score >= 256)
    setRecorded(true)
  }, [over, won, score, recorded, recordPlay])

  function restart() {
    void unlockAudio()
    setBoard(createGame())
    setScore(0)
    setOver(false)
    setWon(false)
    setRecorded(false)
    setPeakTile(2)
    sfx.tick()
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Best', value: bestRun },
      ]}
      actions={
        <button type="button" className="btn btn-ghost" onClick={restart}>
          New
        </button>
      }
    >
      <div className="merge-board panel board-host" {...swipeHandlers}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        <BoardStage status={score > 0 ? `Score ${score}` : undefined}>
          <p className="merge-hint muted">Swipe on the board or use keyboard arrows</p>
          <div className="merge-grid">
            {board.flatMap((row, r) =>
              row.map((value, c) => (
                <div key={`${r}-${c}`} className={tileClass(value)}>
                  {value || ''}
                </div>
              )),
            )}
          </div>
        </BoardStage>

        <ResultOverlay
          open={over || won}
          title={won && !over ? 'You reached 2048!' : 'Board locked'}
          subtitle={`Score ${score}`}
          celebrate={won}
          onPrimary={restart}
          primaryLabel="New game"
          onSecondary={won && !over ? () => setWon(false) : undefined}
          secondaryLabel={won && !over ? 'Keep going' : undefined}
        />
      </div>
    </GameShell>
  )
}
