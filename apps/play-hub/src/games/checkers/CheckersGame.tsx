import { useMemo, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import BoardStage from '../../shared/BoardStage'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './checkers.css'

const meta = getGame('checkers')
const SIZE = 8

type Side = 'you' | 'cpu'
type Piece = { side: Side; king: boolean }
type Board = (Piece | null)[]
type Result = 'win' | 'lose' | 'draw' | null
type Move = { from: number; to: number; capture?: number }

function idx(r: number, c: number) {
  return r * SIZE + c
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE
}

/** American checkers: play on dark squares, dark square at each player's bottom-right. */
function dark(i: number) {
  const r = Math.floor(i / SIZE)
  const c = i % SIZE
  return (r + c) % 2 === 0
}

function startBoard(): Board {
  const board: Board = Array.from({ length: SIZE * SIZE }, () => null)
  for (let i = 0; i < SIZE * SIZE; i += 1) {
    if (!dark(i)) continue
    const r = Math.floor(i / SIZE)
    if (r < 3) board[i] = { side: 'cpu', king: false }
    if (r > 4) board[i] = { side: 'you', king: false }
  }
  return board
}

/** Men move/jump forward only; kings all four diagonals. */
function dirsFor(piece: Piece): number[][] {
  if (piece.king) {
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]
  }
  return piece.side === 'you'
    ? [
        [-1, -1],
        [-1, 1],
      ]
    : [
        [1, -1],
        [1, 1],
      ]
}

function wouldCrown(piece: Piece, to: number): boolean {
  if (piece.king) return false
  const r = Math.floor(to / SIZE)
  return piece.side === 'you' ? r === 0 : r === SIZE - 1
}

function genMoves(board: Board, side: Side): Move[] {
  const steps: Move[] = []
  const jumps: Move[] = []
  for (let from = 0; from < board.length; from += 1) {
    const p = board[from]
    if (!p || p.side !== side) continue
    const r = Math.floor(from / SIZE)
    const c = from % SIZE
    for (const [dr, dc] of dirsFor(p)) {
      const r1 = r + dr
      const c1 = c + dc
      if (!inBounds(r1, c1)) continue
      const mid = idx(r1, c1)
      const occupant = board[mid]
      if (!occupant) {
        if (dark(mid)) steps.push({ from, to: mid })
        continue
      }
      if (occupant.side === side) continue
      const r2 = r + dr * 2
      const c2 = c + dc * 2
      if (!inBounds(r2, c2)) continue
      const to = idx(r2, c2)
      if (!board[to] && dark(to)) jumps.push({ from, to, capture: mid })
    }
  }
  // Captures are mandatory
  return jumps.length > 0 ? jumps : steps
}

function applyMove(board: Board, move: Move): Board {
  const next = [...board]
  const piece = { ...next[move.from]! }
  next[move.from] = null
  if (move.capture != null) next[move.capture] = null
  if (wouldCrown(piece, move.to)) piece.king = true
  next[move.to] = piece
  return next
}

/**
 * Extra jumps after a capture.
 * After crowning mid-sequence the piece is a king and may keep jumping
 * if more captures are available (casual / international-style chaining).
 */
function furtherJumps(board: Board, from: number): Move[] {
  const p = board[from]
  if (!p) return []
  const moves: Move[] = []
  const r = Math.floor(from / SIZE)
  const c = from % SIZE
  for (const [dr, dc] of dirsFor(p)) {
    const r1 = r + dr
    const c1 = c + dc
    const r2 = r + dr * 2
    const c2 = c + dc * 2
    if (!inBounds(r2, c2)) continue
    const mid = idx(r1, c1)
    const to = idx(r2, c2)
    const victim = board[mid]
    if (victim && victim.side !== p.side && !board[to] && dark(to)) {
      moves.push({ from, to, capture: mid })
    }
  }
  return moves
}

function countSide(board: Board, side: Side) {
  return board.filter((p) => p?.side === side).length
}

function pickCpu(board: Board): Move | null {
  const moves = genMoves(board, 'cpu')
  if (moves.length === 0) return null
  let best = moves[0]
  let bestScore = -Infinity
  for (const m of moves) {
    let next = applyMove(board, m)
    let score = (m.capture != null ? 40 : 0) + countSide(next, 'cpu') * 10 - countSide(next, 'you') * 12
    if (next[m.to]?.king) score += 15
    let from = m.to
    let chain = m.capture != null ? furtherJumps(next, from) : []
    while (chain.length > 0) {
      const cont = chain[0]
      next = applyMove(next, cont)
      score += 35
      from = cont.to
      chain = furtherJumps(next, from)
    }
    const replies = genMoves(next, 'you')
    if (replies.length === 0) score += 500
    score += Math.random() * 6
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

export default function CheckersGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [board, setBoard] = useState<Board>(() => startBoard())
  const [running, setRunning] = useState(false)
  const [turn, setTurn] = useState<Side>('you')
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<Result>(null)
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  const [last, setLast] = useState<{ from: number; to: number } | null>(null)
  const [mustContinue, setMustContinue] = useState<number | null>(null)
  const ended = useRef(false)

  const youMoves = useMemo(() => {
    if (!running || turn !== 'you' || result) return [] as Move[]
    if (mustContinue != null) return furtherJumps(board, mustContinue)
    return genMoves(board, 'you')
  }, [board, running, turn, result, mustContinue])

  const targets = useMemo(() => {
    if (selected == null) return [] as number[]
    return youMoves.filter((m) => m.from === selected).map((m) => m.to)
  }, [selected, youMoves])

  function finish(outcome: Exclude<Result, null>, moveCount: number) {
    if (ended.current) return
    ended.current = true
    setResult(outcome)
    setRunning(false)
    setSelected(null)
    setMustContinue(null)
    const points =
      outcome === 'win'
        ? Math.max(180, 650 - moveCount * 8)
        : outcome === 'draw'
          ? 90
          : Math.max(15, 40 - moveCount)
    setScore(points)
    if (outcome === 'win') {
      sfx.win()
      burst(points, 1)
      levelUp()
    } else if (outcome === 'draw') sfx.tick()
    else sfx.lose()
    recordPlay('checkers', points, outcome === 'win')
  }

  function start() {
    void unlockAudio()
    ended.current = false
    setBoard(startBoard())
    setRunning(true)
    setTurn('you')
    setSelected(null)
    setResult(null)
    setScore(0)
    setMoves(0)
    setLast(null)
    setMustContinue(null)
    sfx.ready()
  }

  function runCpuChain(current: Board, first: Move, moveCount: number) {
    let next = applyMove(current, first)
    let from = first.to
    // Multi-jump only continues after a capture — never after a quiet step.
    let chain = first.capture != null ? furtherJumps(next, from) : []
    const origin = first.from
    const playStep = () => {
      setBoard(next)
      setLast({ from: origin, to: from })
      sfx.move()
      if (chain.length > 0) {
        const cont = chain[0]
        window.setTimeout(() => {
          if (ended.current) return
          next = applyMove(next, cont)
          from = cont.to
          chain = furtherJumps(next, from)
          playStep()
        }, 320)
        return
      }
      if (countSide(next, 'you') === 0 || genMoves(next, 'you').length === 0) {
        finish('lose', moveCount)
        return
      }
      setTurn('you')
    }
    playStep()
  }

  function playCpu(current: Board, moveCount: number) {
    window.setTimeout(() => {
      if (ended.current) return
      const move = pickCpu(current)
      if (!move) {
        finish('win', moveCount)
        return
      }
      runCpuChain(current, move, moveCount)
    }, 420)
  }

  function tryMove(from: number, to: number) {
    const move = youMoves.find((m) => m.from === from && m.to === to)
    if (!move) {
      sfx.miss()
      return
    }
    void unlockAudio()
    sfx.tap()
    const next = applyMove(board, move)
    const nextMoves = mustContinue == null ? moves + 1 : moves
    if (mustContinue == null) setMoves(nextMoves)
    setBoard(next)
    setLast({ from, to })
    setSelected(null)

    if (move.capture != null) {
      const more = furtherJumps(next, to)
      if (more.length > 0) {
        setMustContinue(to)
        setSelected(to)
        return
      }
    }

    setMustContinue(null)
    if (countSide(next, 'cpu') === 0 || genMoves(next, 'cpu').length === 0) {
      finish('win', nextMoves)
      return
    }
    setTurn('cpu')
    playCpu(next, nextMoves)
  }

  function tap(i: number) {
    if (!running || result || turn !== 'you' || ended.current) return
    void unlockAudio()
    if (selected != null && targets.includes(i)) {
      tryMove(selected, i)
      return
    }
    if (mustContinue != null) {
      if (i === mustContinue) {
        setSelected(i)
        sfx.tick()
      }
      return
    }
    const p = board[i]
    if (p && p.side === 'you' && youMoves.some((m) => m.from === i)) {
      setSelected(i)
      sfx.tick()
      return
    }
    setSelected(null)
  }

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
          <button type="button" className="btn btn-ghost" onClick={() => finish('lose', moves)}>
            Give up
          </button>
        ) : undefined
      }
    >
      <div className="checkers-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !result && (
          <PlayIdle hint="Jump the CPU’s pieces. Reach the far row to crown a king." onPlay={start} />
        )}
        {(running || result) && (
          <BoardStage
            status={
              !running
                ? 'Game over'
                : mustContinue != null
                  ? 'Keep jumping!'
                  : turn === 'you'
                    ? 'Your move'
                    : 'CPU thinking…'
            }
            topSeat={{
              avatar: '●',
              name: 'CPU',
              detail: `${countSide(board, 'cpu')} left`,
              pill: turn === 'cpu' && running ? 'Thinking' : 'Waiting',
              active: turn === 'cpu' && running,
              tone: 'cpu',
            }}
            bottomSeat={{
              avatar: '●',
              name: 'You',
              detail: `${countSide(board, 'you')} left`,
              pill: turn === 'you' && running ? 'Your turn' : 'Waiting',
              active: turn === 'you' && running,
              tone: 'you',
            }}
          >
            <div className="checkers-grid">
              {board.map((piece, i) => {
                const isDark = dark(i)
                const isSel = selected === i
                const isTarget = targets.includes(i)
                const isLast = last?.from === i || last?.to === i
                return (
                  <button
                    key={i}
                    type="button"
                    className={`checkers-cell${isDark ? ' is-dark' : ''}${isSel ? ' is-sel' : ''}${isTarget ? ' is-target' : ''}${isLast ? ' is-last' : ''}`}
                    onClick={() => tap(i)}
                    disabled={!running || turn !== 'you' || !isDark}
                  >
                    {piece ? (
                      <span className={`checkers-piece${piece.side === 'you' ? ' is-you' : ' is-cpu'}`}>
                        {piece.king ? '♔' : ''}
                      </span>
                    ) : null}
                    {isTarget && !piece ? <span className="checkers-dot" /> : null}
                  </button>
                )
              })}
            </div>
          </BoardStage>
        )}
        <ResultOverlay
          open={!!result}
          title={result === 'win' ? 'You win!' : result === 'draw' ? 'Draw' : 'You lost'}
          subtitle={`Score ${score}`}
          celebrate={result === 'win'}
          onPrimary={start}
        />
      </div>
    </GameShell>
  )
}
