import { useMemo, useState } from 'react'
import { getGame } from '../../data/games'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import LevelCleared from '../../shared/LevelCleared'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './patches.css'

const meta = getGame('patches')

type ColorId = 0 | 1 | 2 | 3 | 4
type Board = ColorId[]

const PALETTE = ['#0D9488', '#FF6B6B', '#FFC83D', '#0284C7', '#A855F7'] as const

/** Grows every 2 levels, caps at 10×10 so late levels stay playable. */
function sizeForStage(stage: number): number {
  return Math.min(5 + Math.floor((stage - 1) / 2), 10)
}

/** Starts generous, then squeezes slowly so endless runs stay challenging. */
function moveLimitFor(size: number, stage: number): number {
  const base = size + 9
  const squeeze = Math.floor((stage - 1) / 3)
  return Math.max(size + 4, base - squeeze)
}

function makeBoard(size: number): Board {
  return Array.from({ length: size * size }, () =>
    Math.floor(Math.random() * PALETTE.length),
  ) as Board
}

/** Flood from top-left: recolor the connected region that matches the start color. */
function flood(board: Board, size: number, nextColor: ColorId): Board {
  const from = board[0]
  if (from === nextColor) return board

  const next = [...board] as Board
  const stack = [0]
  const seen = new Set<number>([0])

  while (stack.length > 0) {
    const i = stack.pop()!
    next[i] = nextColor
    const r = Math.floor(i / size)
    const c = i % size
    const neighbors = [
      r > 0 ? i - size : -1,
      r < size - 1 ? i + size : -1,
      c > 0 ? i - 1 : -1,
      c < size - 1 ? i + 1 : -1,
    ]
    for (const n of neighbors) {
      if (n < 0 || seen.has(n) || board[n] !== from) continue
      seen.add(n)
      stack.push(n)
    }
  }
  return next
}

function isWon(board: Board): boolean {
  return board.every((c) => c === board[0])
}

export default function PatchesGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [stage, setStage] = useState(1)
  const size = sizeForStage(stage)
  const limit = moveLimitFor(size, stage)

  const [board, setBoard] = useState<Board>(() => makeBoard(sizeForStage(1)))
  const [moves, setMoves] = useState(0)
  const [won, setWon] = useState(false)
  const [lost, setLost] = useState(false)

  const filled = useMemo(() => {
    const start = board[0]
    return board.filter((c) => c === start).length
  }, [board])

  function restart(nextStage = 1) {
    void unlockAudio()
    const s = Math.max(1, nextStage)
    setStage(s)
    setBoard(makeBoard(sizeForStage(s)))
    setMoves(0)
    setWon(false)
    setLost(false)
    sfx.tick()
  }

  function pickColor(colorId: ColorId) {
    if (won || lost) return
    void unlockAudio()

    if (board[0] === colorId) {
      sfx.tap()
      return
    }

    const next = flood(board, size, colorId)
    const nextMoves = moves + 1
    setBoard(next)
    setMoves(nextMoves)
    sfx.move()

    if (isWon(next)) {
      setWon(true)
      sfx.win()
      const score = Math.max(limit - nextMoves, 0) * 40 + stage * 60 + 100
      burst(score, stage)
      levelUp()
      recordPlay('patches', score, true)
      return
    }

    if (nextMoves >= limit) {
      setLost(true)
      sfx.lose()
      recordPlay('patches', Math.max(filled * 2, 10), false)
    }
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Moves', value: `${moves}/${limit}` },
        { label: 'Filled', value: `${filled}/${size * size}` },
        { label: 'Lv', value: stage },
      ]}
      actions={
        <button type="button" className="btn btn-ghost" onClick={() => restart(1)}>
          New run
        </button>
      }
    >
      <div className="patches-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        <BoardStage status={`Level ${stage} · ${size}×${size}`}>
          <div
            className="patches-grid"
            style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
          >
            {board.map((colorIndex, index) => (
              <div
                key={index}
                className={`patches-cell${index === 0 ? ' is-origin' : ''}`}
                style={{ background: PALETTE[colorIndex] }}
                aria-hidden
              />
            ))}
          </div>
        </BoardStage>

        <div className="patches-palette" role="group" aria-label="Pick a flood color">
          {PALETTE.map((hex, id) => {
            const colorId = id as ColorId
            const active = board[0] === colorId
            return (
              <button
                key={hex}
                type="button"
                className={`patches-swatch${active ? ' is-active' : ''}`}
                style={{ background: hex }}
                aria-label={`Flood with color ${id + 1}`}
                aria-pressed={active}
                disabled={won || lost}
                onClick={() => pickColor(colorId)}
              />
            )
          })}
        </div>

        <LevelCleared
          open={won}
          title="Level cleared!"
          subtitle={`${moves} moves · Level ${stage}`}
          onNext={() => restart(stage + 1)}
          onReplay={() => restart(1)}
          replayLabel="New run"
        />
        <ResultOverlay
          open={lost}
          title="Out of moves"
          subtitle={`Level ${stage} · ${filled} cells matched`}
          onPrimary={() => restart(stage)}
          primaryLabel="Try again"
          onSecondary={() => restart(1)}
          secondaryLabel="New run"
        />
      </div>
    </GameShell>
  )
}
