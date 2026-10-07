import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import BoardStage from '../../shared/BoardStage'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './reversi.css'

const meta = getGame('reversi')
const SIZE = 8
type Cell = 0 | 1 | 2 // empty | you (black) | cpu (white)
type Result = 'win' | 'lose' | 'draw' | null

const DIRS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
]

function idx(r: number, c: number) {
  return r * SIZE + c
}

function startBoard(): Cell[] {
  const board = Array.from({ length: SIZE * SIZE }, () => 0 as Cell)
  board[idx(3, 3)] = 2
  board[idx(3, 4)] = 1
  board[idx(4, 3)] = 1
  board[idx(4, 4)] = 2
  return board
}

function flipsAt(board: Cell[], r: number, c: number, player: 1 | 2): number[] {
  if (board[idx(r, c)] !== 0) return []
  const foe = player === 1 ? 2 : 1
  const flips: number[] = []
  for (const [dr, dc] of DIRS) {
    const line: number[] = []
    let rr = r + dr
    let cc = c + dc
    while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[idx(rr, cc)] === foe) {
      line.push(idx(rr, cc))
      rr += dr
      cc += dc
    }
    if (
      line.length > 0 &&
      rr >= 0 &&
      rr < SIZE &&
      cc >= 0 &&
      cc < SIZE &&
      board[idx(rr, cc)] === player
    ) {
      flips.push(...line)
    }
  }
  return flips
}

function legalMoves(board: Cell[], player: 1 | 2): number[] {
  const moves: number[] = []
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (flipsAt(board, r, c, player).length > 0) moves.push(idx(r, c))
    }
  }
  return moves
}

function applyMove(board: Cell[], move: number, player: 1 | 2): Cell[] {
  const r = Math.floor(move / SIZE)
  const c = move % SIZE
  const next = [...board]
  next[move] = player
  for (const i of flipsAt(board, r, c, player)) next[i] = player
  return next
}

function count(board: Cell[], player: 1 | 2) {
  return board.filter((c) => c === player).length
}

const CORNERS = [0, 7, 56, 63]
const DANGER = [1, 8, 9, 6, 14, 15, 48, 49, 57, 55, 62, 54]

function moveScore(board: Cell[], move: number, player: 1 | 2): number {
  const next = applyMove(board, move, player)
  let score = flipsAt(board, Math.floor(move / SIZE), move % SIZE, player).length * 3
  score += count(next, player) - count(next, player === 1 ? 2 : 1)
  if (CORNERS.includes(move)) score += 80
  if (DANGER.includes(move)) score -= 18
  return score + Math.random() * 2
}

function pickCpu(board: Cell[]): number | null {
  const moves = legalMoves(board, 2)
  if (moves.length === 0) return null
  let best = moves[0]
  let bestScore = -Infinity
  for (const m of moves) {
    const s = moveScore(board, m, 2)
    if (s > bestScore) {
      bestScore = s
      best = m
    }
  }
  return best
}

export default function ReversiGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [board, setBoard] = useState<Cell[]>(startBoard)
  const [running, setRunning] = useState(false)
  const [turn, setTurn] = useState<'you' | 'cpu'>('you')
  const [result, setResult] = useState<Result>(null)
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  const [last, setLast] = useState<number | null>(null)
  const boardRef = useRef(board)
  const ended = useRef(false)

  useEffect(() => {
    boardRef.current = board
  }, [board])

  const youCount = count(board, 1)
  const cpuCount = count(board, 2)
  const highlights = running && turn === 'you' && !result ? legalMoves(board, 1) : []

  function finish(outcome: Exclude<Result, null>, nextBoard: Cell[]) {
    if (ended.current) return
    ended.current = true
    setBoard(nextBoard)
    setResult(outcome)
    setRunning(false)
    const yours = count(nextBoard, 1)
    const cpus = count(nextBoard, 2)
    const points =
      outcome === 'win'
        ? 200 + (yours - cpus) * 8
        : outcome === 'draw'
          ? 90
          : Math.max(15, yours * 2)
    setScore(points)
    if (outcome === 'win') {
      sfx.win()
      burst(points, 1)
      levelUp()
    } else if (outcome === 'draw') sfx.tick()
    else sfx.lose()
    recordPlay('reversi', points, outcome === 'win')
  }

  function resolveEnd(nextBoard: Cell[]) {
    const yours = count(nextBoard, 1)
    const cpus = count(nextBoard, 2)
    if (yours > cpus) finish('win', nextBoard)
    else if (yours < cpus) finish('lose', nextBoard)
    else finish('draw', nextBoard)
  }

  function afterMove(nextBoard: Cell[], nextPlayer: 1 | 2) {
    const youMoves = legalMoves(nextBoard, 1)
    const cpuMoves = legalMoves(nextBoard, 2)
    if (youMoves.length === 0 && cpuMoves.length === 0) {
      resolveEnd(nextBoard)
      return
    }
    if (nextPlayer === 2) {
      if (cpuMoves.length === 0) {
        setTurn('you')
        setBoard(nextBoard)
        return
      }
      setBoard(nextBoard)
      setTurn('cpu')
      window.setTimeout(() => {
        if (ended.current) return
        const move = pickCpu(nextBoard)
        if (move == null) {
          setTurn('you')
          return
        }
        const after = applyMove(nextBoard, move, 2)
        setLast(move)
        sfx.move()
        const youOk = legalMoves(after, 1)
        const cpuOk = legalMoves(after, 2)
        if (youOk.length === 0 && cpuOk.length === 0) {
          resolveEnd(after)
          return
        }
        if (youOk.length === 0 && cpuOk.length > 0) {
          setBoard(after)
          afterMove(after, 2)
          return
        }
        setBoard(after)
        setTurn('you')
      }, 420)
      return
    }
    setBoard(nextBoard)
    setTurn('you')
  }

  function start() {
    void unlockAudio()
    ended.current = false
    setBoard(startBoard())
    setRunning(true)
    setTurn('you')
    setResult(null)
    setScore(0)
    setMoves(0)
    setLast(null)
    sfx.ready()
  }

  function tap(i: number) {
    if (!running || result || turn !== 'you' || ended.current) return
    void unlockAudio()
    if (!highlights.includes(i)) {
      sfx.miss()
      return
    }
    sfx.tap()
    const next = applyMove(boardRef.current, i, 1)
    setLast(i)
    setMoves((m) => m + 1)
    afterMove(next, 2)
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'You', value: youCount },
        { label: 'CPU', value: cpuCount },
        { label: 'Moves', value: moves },
        { label: 'Score', value: score },
        { label: 'Turn', value: !running ? '—' : turn === 'you' ? 'You' : 'CPU' },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={() => finish('lose', board)}>
            Give up
          </button>
        ) : undefined
      }
    >
      <div className="reversi-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !result && (
          <PlayIdle hint="Flip discs and outnumber the CPU." onPlay={start} />
        )}
        {(running || result) && (
          <BoardStage
            status={!running ? 'Game over' : turn === 'you' ? 'Your move' : 'CPU thinking…'}
            topSeat={{
              avatar: '⚫',
              name: 'CPU',
              detail: `White · ${cpuCount}`,
              pill: turn === 'cpu' && running ? 'Thinking' : 'Waiting',
              active: turn === 'cpu' && running,
              tone: 'cpu',
            }}
            bottomSeat={{
              avatar: '⚪',
              name: 'You',
              detail: `Black · ${youCount}`,
              pill: turn === 'you' && running ? 'Your turn' : 'Waiting',
              active: turn === 'you' && running,
              tone: 'you',
            }}
          >
            <div className="reversi-grid">
              {board.map((cell, i) => {
                const legal = highlights.includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    className={`reversi-cell${legal ? ' is-legal' : ''}${last === i ? ' is-last' : ''}`}
                    onClick={() => tap(i)}
                    disabled={!running || turn !== 'you' || !legal}
                  >
                    {cell !== 0 && (
                      <span className={`reversi-disc${cell === 1 ? ' is-you' : ' is-cpu'}`} />
                    )}
                  </button>
                )
              })}
            </div>
          </BoardStage>
        )}
        <ResultOverlay
          open={!!result}
          title={result === 'win' ? 'You win!' : result === 'draw' ? 'Draw' : 'CPU wins'}
          subtitle={`${youCount} – ${cpuCount} · Score ${score}`}
          celebrate={result === 'win'}
          onPrimary={start}
        />
      </div>
    </GameShell>
  )
}
