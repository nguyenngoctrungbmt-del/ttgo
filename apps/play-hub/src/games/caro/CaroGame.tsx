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
import './caro.css'

const meta = getGame('caro')
const SIZE = 12
const NEED = 5
type Cell = 0 | 1 | 2 // empty | you (X) | cpu (O)
type Result = 'win' | 'lose' | 'draw' | null

function emptyBoard(): Cell[] {
  return Array.from({ length: SIZE * SIZE }, () => 0)
}

function idx(r: number, c: number) {
  return r * SIZE + c
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE
}

function lineLen(board: Cell[], r: number, c: number, dr: number, dc: number, player: 1 | 2) {
  let n = 0
  let rr = r + dr
  let cc = c + dc
  while (inBounds(rr, cc) && board[idx(rr, cc)] === player) {
    n += 1
    rr += dr
    cc += dc
  }
  return n
}

function winsAt(board: Cell[], move: number, player: 1 | 2): boolean {
  const r = Math.floor(move / SIZE)
  const c = move % SIZE
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  for (const [dr, dc] of dirs) {
    const total = 1 + lineLen(board, r, c, dr, dc, player) + lineLen(board, r, c, -dr, -dc, player)
    if (total >= NEED) return true
  }
  return false
}

function empties(board: Cell[]): number[] {
  return board.map((c, i) => (c === 0 ? i : -1)).filter((i) => i >= 0)
}

function nearMoves(board: Cell[]): number[] {
  const set = new Set<number>()
  for (let i = 0; i < board.length; i += 1) {
    if (board[i] === 0) continue
    const r = Math.floor(i / SIZE)
    const c = i % SIZE
    for (let dr = -2; dr <= 2; dr += 1) {
      for (let dc = -2; dc <= 2; dc += 1) {
        const rr = r + dr
        const cc = c + dc
        if (!inBounds(rr, cc)) continue
        const j = idx(rr, cc)
        if (board[j] === 0) set.add(j)
      }
    }
  }
  const list = [...set]
  return list.length > 0 ? list : empties(board)
}

function threatScore(board: Cell[], move: number, player: 1 | 2): number {
  const next = [...board]
  next[move] = player
  if (winsAt(next, move, player)) return 1_000_000
  const r = Math.floor(move / SIZE)
  const c = move % SIZE
  let score = 0
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  for (const [dr, dc] of dirs) {
    const total = 1 + lineLen(next, r, c, dr, dc, player) + lineLen(next, r, c, -dr, -dc, player)
    if (total >= 4) score += 400
    else if (total === 3) score += 60
    else if (total === 2) score += 10
  }
  const mid = (SIZE - 1) / 2
  score += 8 - (Math.abs(r - mid) + Math.abs(c - mid))
  return score
}

function pickCpu(board: Cell[]): number {
  const candidates = nearMoves(board)
  // Win now
  for (const m of candidates) {
    const next = [...board]
    next[m] = 2
    if (winsAt(next, m, 2)) return m
  }
  // Block you
  for (const m of candidates) {
    const next = [...board]
    next[m] = 1
    if (winsAt(next, m, 1)) return m
  }
  let best = candidates[0]
  let bestScore = -Infinity
  for (const m of candidates) {
    const attack = threatScore(board, m, 2)
    const defend = threatScore(board, m, 1) * 0.9
    const score = attack + defend + Math.random() * 3
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

export default function CaroGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [board, setBoard] = useState<Cell[]>(emptyBoard)
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

  function finish(outcome: Exclude<Result, null>, nextBoard: Cell[], moveCount: number) {
    if (ended.current) return
    ended.current = true
    setBoard(nextBoard)
    setResult(outcome)
    setRunning(false)
    const points =
      outcome === 'win'
        ? Math.max(150, 500 - moveCount * 8)
        : outcome === 'draw'
          ? 70
          : Math.max(15, 40 - moveCount)
    setScore(points)
    if (outcome === 'win') {
      sfx.win()
      burst(points, 1)
      levelUp()
    } else if (outcome === 'draw') sfx.tick()
    else sfx.lose()
    recordPlay('caro', points, outcome === 'win')
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
    setLast(null)
    sfx.ready()
  }

  function playCpu(current: Cell[], moveCount: number) {
    window.setTimeout(() => {
      if (ended.current) return
      const move = pickCpu(current)
      const next = [...current]
      next[move] = 2
      setLast(move)
      sfx.move()
      if (winsAt(next, move, 2)) {
        finish('lose', next, moveCount)
        return
      }
      if (empties(next).length === 0) {
        finish('draw', next, moveCount)
        return
      }
      setBoard(next)
      setTurn('you')
    }, 380)
  }

  function tap(i: number) {
    if (!running || result || turn !== 'you' || ended.current) return
    void unlockAudio()
    if (boardRef.current[i] !== 0) {
      sfx.miss()
      return
    }
    sfx.tap()
    const next = [...boardRef.current]
    next[i] = 1
    const nextMoves = moves + 1
    setMoves(nextMoves)
    setLast(i)
    if (winsAt(next, i, 1)) {
      finish('win', next, nextMoves)
      return
    }
    if (empties(next).length === 0) {
      finish('draw', next, nextMoves)
      return
    }
    setBoard(next)
    setTurn('cpu')
    playCpu(next, nextMoves)
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
          <button type="button" className="btn btn-ghost" onClick={() => finish('lose', board, moves)}>
            Give up
          </button>
        ) : undefined
      }
    >
      <div className="caro-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !result && (
          <PlayIdle hint="Get five in a row before the CPU." onPlay={start} />
        )}
        {(running || result) && (
          <BoardStage
            status={!running ? 'Game over' : turn === 'you' ? 'Your move' : 'CPU thinking…'}
            topSeat={{
              avatar: '○',
              name: 'CPU',
              detail: 'Circle',
              pill: turn === 'cpu' && running ? 'Thinking' : 'Waiting',
              active: turn === 'cpu' && running,
              tone: 'cpu',
            }}
            bottomSeat={{
              avatar: '✕',
              name: 'You',
              detail: 'Cross',
              pill: turn === 'you' && running ? 'Your turn' : 'Waiting',
              active: turn === 'you' && running,
              tone: 'you',
            }}
          >
            <div className="caro-grid" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}>
              {board.map((cell, i) => (
                <button
                  key={i}
                  type="button"
                  className={`caro-cell${last === i ? ' is-last' : ''}${cell === 1 ? ' has-you' : ''}${cell === 2 ? ' has-cpu' : ''}`}
                  onClick={() => tap(i)}
                  disabled={!running || turn !== 'you' || cell !== 0}
                >
                  {cell === 1 ? <span className="caro-mark is-you">✕</span> : null}
                  {cell === 2 ? <span className="caro-mark is-cpu">○</span> : null}
                </button>
              ))}
            </div>
          </BoardStage>
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
