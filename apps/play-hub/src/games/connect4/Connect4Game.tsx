import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './connect4.css'

const meta = getGame('connect4')
const COLS = 7
const ROWS = 6
const AI_DEPTH = 4
type Cell = 0 | 1 | 2 // empty | you (red) | cpu (yellow)
type Result = 'win' | 'lose' | 'draw' | null
type DropAnim = { index: number; rows: number }

const CENTER_BIAS = [2, 3, 4, 1, 5, 0, 6]

function emptyBoard(): Cell[] {
  return Array.from({ length: COLS * ROWS }, () => 0)
}

function drop(board: Cell[], col: number, player: 1 | 2): { next: Cell[]; row: number } | null {
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    const i = row * COLS + col
    if (board[i] === 0) {
      const next = [...board]
      next[i] = player
      return { next, row }
    }
  }
  return null
}

function dropDurationMs(rowsFallen: number) {
  return Math.round(180 + rowsFallen * 55)
}

function openCols(board: Cell[]): number[] {
  return CENTER_BIAS.filter((c) => board[c] === 0)
}

function winner(board: Cell[]): 0 | 1 | 2 {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const start = board[r * COLS + c]
      if (!start) continue
      for (const [dr, dc] of dirs) {
        let ok = true
        for (let k = 1; k < 4; k += 1) {
          const rr = r + dr * k
          const cc = c + dc * k
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || board[rr * COLS + cc] !== start) {
            ok = false
            break
          }
        }
        if (ok) return start
      }
    }
  }
  return 0
}

function scoreWindow(cells: Cell[], player: 1 | 2): number {
  const me = cells.filter((c) => c === player).length
  const opp = cells.filter((c) => c === (player === 1 ? 2 : 1)).length
  const empty = cells.filter((c) => c === 0).length
  if (me > 0 && opp > 0) return 0
  if (me === 4) return 100_000
  if (opp === 4) return -100_000
  if (me === 3 && empty === 1) return 900
  if (opp === 3 && empty === 1) return -950
  if (me === 2 && empty === 2) return 60
  if (opp === 2 && empty === 2) return -70
  if (me === 1 && empty === 3) return 8
  return 0
}

function evaluate(board: Cell[], player: 1 | 2): number {
  let score = 0
  const center = Math.floor(COLS / 2)
  for (let r = 0; r < ROWS; r += 1) {
    if (board[r * COLS + center] === player) score += 12
    if (board[r * COLS + center - 1] === player || board[r * COLS + center + 1] === player) score += 5
  }

  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      for (const [dr, dc] of dirs) {
        const cells: Cell[] = []
        for (let k = 0; k < 4; k += 1) {
          const rr = r + dr * k
          const cc = c + dc * k
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break
          cells.push(board[rr * COLS + cc])
        }
        if (cells.length === 4) score += scoreWindow(cells, player)
      }
    }
  }
  return score
}

/** Immediate winning column for `player`, or -1. */
function winningCol(board: Cell[], player: 1 | 2): number {
  for (const col of openCols(board)) {
    const dropped = drop(board, col, player)
    if (dropped && winner(dropped.next) === player) return col
  }
  return -1
}

function minimax(
  board: Cell[],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  const w = winner(board)
  if (w === 2) return 100_000 + depth
  if (w === 1) return -100_000 - depth
  const cols = openCols(board)
  if (cols.length === 0) return 0
  if (depth === 0) return evaluate(board, 2)

  if (maximizing) {
    let value = -Infinity
    for (const col of cols) {
      const dropped = drop(board, col, 2)
      if (!dropped) continue
      value = Math.max(value, minimax(dropped.next, depth - 1, alpha, beta, false))
      alpha = Math.max(alpha, value)
      if (alpha >= beta) break
    }
    return value
  }

  let value = Infinity
  for (const col of cols) {
    const dropped = drop(board, col, 1)
    if (!dropped) continue
    value = Math.min(value, minimax(dropped.next, depth - 1, alpha, beta, true))
    beta = Math.min(beta, value)
    if (alpha >= beta) break
  }
  return value
}

function pickCpu(board: Cell[]): number {
  const cols = openCols(board)
  if (cols.length === 0) return 0

  // 1) Take the win
  const winNow = winningCol(board, 2)
  if (winNow >= 0) return winNow

  // 2) Block opponent win
  const block = winningCol(board, 1)
  if (block >= 0) return block

  // 3) Search deeper
  let best = cols[0]
  let bestScore = -Infinity
  for (const col of cols) {
    const dropped = drop(board, col, 2)
    if (!dropped) continue
    const score = minimax(dropped.next, AI_DEPTH - 1, -Infinity, Infinity, false)
    if (score > bestScore) {
      bestScore = score
      best = col
    }
  }
  return best
}

export default function Connect4Game() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [board, setBoard] = useState<Cell[]>(emptyBoard)
  const [running, setRunning] = useState(false)
  const [turn, setTurn] = useState<'you' | 'cpu'>('you')
  const [result, setResult] = useState<Result>(null)
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  const [dropAnim, setDropAnim] = useState<DropAnim | null>(null)
  const [animating, setAnimating] = useState(false)
  const boardRef = useRef(board)
  const ended = useRef(false)

  useEffect(() => {
    boardRef.current = board
  }, [board])

  function finish(outcome: Exclude<Result, null>, nextBoard: Cell[], moveCount: number) {
    if (ended.current) return
    ended.current = true
    setBoard(nextBoard)
    setResult(outcome)
    setRunning(false)
    setTurn('you')
    setAnimating(false)
    const points =
      outcome === 'win'
        ? Math.max(120, 420 - moveCount * 12)
        : outcome === 'draw'
          ? 80
          : Math.max(20, 60 - moveCount)
    setScore(points)
    if (outcome === 'win') {
      sfx.win()
      burst(points, 1)
      levelUp()
    } else if (outcome === 'draw') {
      sfx.tick()
    } else {
      sfx.lose()
    }
    recordPlay('connect4', points, outcome === 'win')
  }

  function start() {
    void unlockAudio()
    ended.current = false
    setBoard(emptyBoard())
    setRunning(true)
    setTurn('you')
    setResult(null)
    setScore(0)
    setMoves(0)
    setDropAnim(null)
    setAnimating(false)
    sfx.ready()
  }

  function placeDisc(
    current: Cell[],
    col: number,
    player: 1 | 2,
    after: (next: Cell[], row: number) => void,
  ) {
    const dropped = drop(current, col, player)
    if (!dropped) return false
    const rowsFallen = dropped.row + 1
    const index = dropped.row * COLS + col
    setAnimating(true)
    setBoard(dropped.next)
    setDropAnim({ index, rows: rowsFallen })
    sfx.move()
    window.setTimeout(() => {
      setDropAnim(null)
      setAnimating(false)
      after(dropped.next, dropped.row)
    }, dropDurationMs(rowsFallen))
    return true
  }

  function playCpu(current: Cell[], moveCount: number) {
    window.setTimeout(() => {
      if (ended.current) return
      const col = pickCpu(current)
      placeDisc(current, col, 2, (next) => {
        const w = winner(next)
        if (w === 2) {
          finish('lose', next, moveCount)
          return
        }
        if (openCols(next).length === 0) {
          finish('draw', next, moveCount)
          return
        }
        setTurn('you')
      })
    }, 280)
  }

  function tapCol(col: number) {
    if (!running || result || turn !== 'you' || ended.current || animating) return
    void unlockAudio()
    const preview = drop(boardRef.current, col, 1)
    if (!preview) {
      sfx.miss()
      return
    }
    const nextMoves = moves + 1
    setMoves(nextMoves)
    setTurn('cpu')
    placeDisc(boardRef.current, col, 1, (next) => {
      const w = winner(next)
      if (w === 1) {
        finish('win', next, nextMoves)
        return
      }
      if (openCols(next).length === 0) {
        finish('draw', next, nextMoves)
        return
      }
      playCpu(next, nextMoves)
    })
  }

  const turnLabel = !running ? 'Ready' : turn === 'you' ? 'Your move' : 'Thinking…'

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Moves', value: moves },
        { label: 'Turn', value: !running ? '—' : turn === 'you' ? 'You' : 'CPU' },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={() => finish('lose', board, moves)}>
            Give up
          </button>
        ) : undefined
      }
    >
      <div className="connect4-board panel">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !result && (
          <PlayIdle hint="Drop discs to connect four before the CPU." onPlay={start} />
        )}
        {(running || result) && (
          <div className="connect4-stage">
            <div className={`connect4-seat is-cpu${turn === 'cpu' && running ? ' is-active' : ''}`}>
              <span className="connect4-seat__avatar" aria-hidden>
                🟡
              </span>
              <div className="connect4-seat__meta">
                <strong>CPU</strong>
                <span className="muted">Yellow</span>
              </div>
              <span className="connect4-seat__pill">{turn === 'cpu' && running ? 'Thinking' : 'Waiting'}</span>
            </div>

            <div className="connect4-frame">
              <div className="connect4-frame__deco connect4-frame__deco--tl" aria-hidden />
              <div className="connect4-frame__deco connect4-frame__deco--tr" aria-hidden />
              <div className="connect4-frame__deco connect4-frame__deco--bl" aria-hidden />
              <div className="connect4-frame__deco connect4-frame__deco--br" aria-hidden />
              <p className="connect4-turn muted">{turnLabel}</p>
              <div className="connect4-cols" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {Array.from({ length: COLS }, (_, col) => (
                  <button
                    key={col}
                    type="button"
                    className="connect4-col"
                    onClick={() => tapCol(col)}
                    disabled={!running || turn !== 'you' || animating || board[col] !== 0}
                    aria-label={`Column ${col + 1}`}
                  >
                    <span className="connect4-holes" aria-hidden>
                      {Array.from({ length: ROWS }, (_, row) => (
                        <span key={row} className="connect4-slot" />
                      ))}
                    </span>
                    {Array.from({ length: ROWS }, (_, row) => {
                      const index = row * COLS + col
                      const cell = board[index]
                      if (cell === 0) return null
                      const dropping = dropAnim?.index === index
                      return (
                        <span
                          key={`d-${row}`}
                          className={`connect4-disc${cell === 1 ? ' is-you' : ' is-cpu'}${dropping ? ' is-dropping' : ''}`}
                          style={{
                            ['--row' as string]: row,
                            ...(dropping
                              ? {
                                  ['--drop-rows' as string]: dropAnim.rows,
                                  ['--drop-ms' as string]: `${dropDurationMs(dropAnim.rows)}ms`,
                                }
                              : null),
                          }}
                        />
                      )
                    })}
                  </button>
                ))}
              </div>
              <div className="connect4-cols-label" aria-hidden>
                {Array.from({ length: COLS }, (_, i) => (
                  <span key={i}>{i + 1}</span>
                ))}
              </div>
            </div>

            <div className={`connect4-seat is-you${turn === 'you' && running ? ' is-active' : ''}`}>
              <span className="connect4-seat__avatar" aria-hidden>
                🔴
              </span>
              <div className="connect4-seat__meta">
                <strong>You</strong>
                <span className="muted">Red</span>
              </div>
              <span className="connect4-seat__pill">{turn === 'you' && running ? 'Your turn' : 'Waiting'}</span>
            </div>
          </div>
        )}
        <ResultOverlay
          open={!!result}
          title={result === 'win' ? 'You win!' : result === 'draw' ? 'Draw' : 'CPU wins'}
          subtitle={`Score ${score}`}
          celebrate={result === 'win'}
          onPrimary={start}
        />
      </div>
    </GameShell>
  )
}
