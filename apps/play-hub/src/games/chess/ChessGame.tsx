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
import './chess.css'

const meta = getGame('chess')

type Side = 'w' | 'b'
type Piece = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p'
type Board = (Piece | null)[]
type Result = 'win' | 'lose' | 'draw' | null
type CastleRights = { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }

type Move = {
  from: number
  to: number
  promo?: Piece
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'

const GLYPH: Record<Piece, string> = {
  K: '♔',
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
}

const VALUE: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
}

function isWhite(p: Piece) {
  return p === p.toUpperCase()
}

function sideOf(p: Piece): Side {
  return isWhite(p) ? 'w' : 'b'
}

function parseFen(fen: string): Board {
  const board: Board = Array.from({ length: 64 }, () => null)
  const rows = fen.split('/')
  for (let r = 0; r < 8; r += 1) {
    let c = 0
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) c += Number(ch)
      else {
        board[r * 8 + c] = ch as Piece
        c += 1
      }
    }
  }
  return board
}

function cloneBoard(board: Board): Board {
  return [...board]
}

function kingIndex(board: Board, side: Side): number {
  const target = side === 'w' ? 'K' : 'k'
  return board.findIndex((p) => p === target)
}

function attacked(board: Board, sq: number, by: Side): boolean {
  const r = Math.floor(sq / 8)
  const c = sq % 8
  const enemyPawn = by === 'w' ? 'P' : 'p'
  const pr = by === 'w' ? r + 1 : r - 1
  for (const dc of [-1, 1]) {
    const rr = pr
    const cc = c + dc
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && board[rr * 8 + cc] === enemyPawn) return true
  }
  const knight = by === 'w' ? 'N' : 'n'
  for (const [dr, dc] of [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1],
  ]) {
    const rr = r + dr
    const cc = c + dc
    if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && board[rr * 8 + cc] === knight) return true
  }
  const king = by === 'w' ? 'K' : 'k'
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (!dr && !dc) continue
      const rr = r + dr
      const cc = c + dc
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && board[rr * 8 + cc] === king) return true
    }
  }
  const rookLike = by === 'w' ? ['R', 'Q'] : ['r', 'q']
  for (const [dr, dc] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]) {
    let rr = r + dr
    let cc = c + dc
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const p = board[rr * 8 + cc]
      if (p) {
        if (rookLike.includes(p)) return true
        break
      }
      rr += dr
      cc += dc
    }
  }
  const bishopLike = by === 'w' ? ['B', 'Q'] : ['b', 'q']
  for (const [dr, dc] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]) {
    let rr = r + dr
    let cc = c + dc
    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
      const p = board[rr * 8 + cc]
      if (p) {
        if (bishopLike.includes(p)) return true
        break
      }
      rr += dr
      cc += dc
    }
  }
  return false
}

function inCheck(board: Board, side: Side): boolean {
  const k = kingIndex(board, side)
  if (k < 0) return true
  return attacked(board, k, side === 'w' ? 'b' : 'w')
}

function pushSlide(board: Board, from: number, side: Side, deltas: number[][], moves: Move[]) {
  const r0 = Math.floor(from / 8)
  const c0 = from % 8
  for (const [dr, dc] of deltas) {
    let r = r0 + dr
    let c = c0 + dc
    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      const to = r * 8 + c
      const target = board[to]
      if (!target) moves.push({ from, to })
      else {
        if (sideOf(target) !== side) moves.push({ from, to })
        break
      }
      r += dr
      c += dc
    }
  }
}

function genPseudo(board: Board, side: Side, castling: CastleRights): Move[] {
  const moves: Move[] = []
  for (let from = 0; from < 64; from += 1) {
    const p = board[from]
    if (!p || sideOf(p) !== side) continue
    const r = Math.floor(from / 8)
    const c = from % 8
    const kind = p.toLowerCase()
    if (kind === 'p') {
      const dir = side === 'w' ? -1 : 1
      const startRow = side === 'w' ? 6 : 1
      const promoRow = side === 'w' ? 0 : 7
      const one = (r + dir) * 8 + c
      if (r + dir >= 0 && r + dir < 8 && !board[one]) {
        if (r + dir === promoRow) {
          const q = (side === 'w' ? 'Q' : 'q') as Piece
          moves.push({ from, to: one, promo: q })
        } else {
          moves.push({ from, to: one })
          if (r === startRow) {
            const two = (r + dir * 2) * 8 + c
            if (!board[two]) moves.push({ from, to: two })
          }
        }
      }
      for (const dc of [-1, 1]) {
        const rr = r + dir
        const cc = c + dc
        if (rr < 0 || rr >= 8 || cc < 0 || cc >= 8) continue
        const to = rr * 8 + cc
        const target = board[to]
        if (target && sideOf(target) !== side) {
          if (rr === promoRow) {
            const q = (side === 'w' ? 'Q' : 'q') as Piece
            moves.push({ from, to, promo: q })
          } else moves.push({ from, to })
        }
      }
    } else if (kind === 'n') {
      for (const [dr, dc] of [
        [-2, -1],
        [-2, 1],
        [-1, -2],
        [-1, 2],
        [1, -2],
        [1, 2],
        [2, -1],
        [2, 1],
      ]) {
        const rr = r + dr
        const cc = c + dc
        if (rr < 0 || rr >= 8 || cc < 0 || cc >= 8) continue
        const to = rr * 8 + cc
        const target = board[to]
        if (!target || sideOf(target) !== side) moves.push({ from, to })
      }
    } else if (kind === 'b') {
      pushSlide(
        board,
        from,
        side,
        [
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ],
        moves,
      )
    } else if (kind === 'r') {
      pushSlide(
        board,
        from,
        side,
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ],
        moves,
      )
    } else if (kind === 'q') {
      pushSlide(
        board,
        from,
        side,
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [1, -1],
          [-1, 1],
          [-1, -1],
        ],
        moves,
      )
    } else if (kind === 'k') {
      for (let dr = -1; dr <= 1; dr += 1) {
        for (let dc = -1; dc <= 1; dc += 1) {
          if (!dr && !dc) continue
          const rr = r + dr
          const cc = c + dc
          if (rr < 0 || rr >= 8 || cc < 0 || cc >= 8) continue
          const to = rr * 8 + cc
          const target = board[to]
          if (!target || sideOf(target) !== side) moves.push({ from, to })
        }
      }
      // Castling
      if (side === 'w' && from === 60 && !inCheck(board, 'w')) {
        if (castling.wK && !board[61] && !board[62] && !attacked(board, 61, 'b') && !attacked(board, 62, 'b')) {
          moves.push({ from, to: 62 })
        }
        if (castling.wQ && !board[59] && !board[58] && !board[57] && !attacked(board, 59, 'b') && !attacked(board, 58, 'b')) {
          moves.push({ from, to: 58 })
        }
      }
      if (side === 'b' && from === 4 && !inCheck(board, 'b')) {
        if (castling.bK && !board[5] && !board[6] && !attacked(board, 5, 'w') && !attacked(board, 6, 'w')) {
          moves.push({ from, to: 6 })
        }
        if (castling.bQ && !board[3] && !board[2] && !board[1] && !attacked(board, 3, 'w') && !attacked(board, 2, 'w')) {
          moves.push({ from, to: 2 })
        }
      }
    }
  }
  return moves
}

function applyMove(board: Board, move: Move, castling: CastleRights): { board: Board; castling: CastleRights } {
  const next = cloneBoard(board)
  const piece = next[move.from]
  next[move.to] = move.promo ?? piece
  next[move.from] = null
  // Castling rook move
  if (piece === 'K' && move.from === 60 && move.to === 62) {
    next[61] = 'R'
    next[63] = null
  }
  if (piece === 'K' && move.from === 60 && move.to === 58) {
    next[59] = 'R'
    next[56] = null
  }
  if (piece === 'k' && move.from === 4 && move.to === 6) {
    next[5] = 'r'
    next[7] = null
  }
  if (piece === 'k' && move.from === 4 && move.to === 2) {
    next[3] = 'r'
    next[0] = null
  }
  const rights = { ...castling }
  if (piece === 'K') {
    rights.wK = false
    rights.wQ = false
  }
  if (piece === 'k') {
    rights.bK = false
    rights.bQ = false
  }
  if (piece === 'R' && move.from === 63) rights.wK = false
  if (piece === 'R' && move.from === 56) rights.wQ = false
  if (piece === 'r' && move.from === 7) rights.bK = false
  if (piece === 'r' && move.from === 0) rights.bQ = false
  if (next[63] !== 'R') rights.wK = false
  if (next[56] !== 'R') rights.wQ = false
  if (next[7] !== 'r') rights.bK = false
  if (next[0] !== 'r') rights.bQ = false
  return { board: next, castling: rights }
}

function legalMoves(board: Board, side: Side, castling: CastleRights): Move[] {
  return genPseudo(board, side, castling).filter((m) => {
    const { board: next } = applyMove(board, m, castling)
    return !inCheck(next, side)
  })
}

function material(board: Board, side: Side): number {
  let score = 0
  for (const p of board) {
    if (!p) continue
    const v = VALUE[p.toLowerCase()] ?? 0
    score += sideOf(p) === side ? v : -v
  }
  return score
}

function pickCpu(board: Board, castling: CastleRights): Move | null {
  const moves = legalMoves(board, 'b', castling)
  if (moves.length === 0) return null
  let best = moves[0]
  let bestScore = -Infinity
  for (const m of moves) {
    const { board: next, castling: nextCastle } = applyMove(board, m, castling)
    let score = material(next, 'b')
    if (board[m.to]) score += (VALUE[board[m.to]!.toLowerCase()] ?? 0) * 1.2
    if (inCheck(next, 'w')) score += 40
    const replies = legalMoves(next, 'w', nextCastle)
    if (replies.length === 0) {
      score += inCheck(next, 'w') ? 100000 : 500
    } else {
      let worst = Infinity
      for (const r of replies.slice(0, 12)) {
        const after = applyMove(next, r, nextCastle).board
        worst = Math.min(worst, material(after, 'b'))
      }
      score += worst * 0.15
    }
    score += Math.random() * 8
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

const FULL_CASTLE: CastleRights = { wK: true, wQ: true, bK: true, bQ: true }

export default function ChessGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [board, setBoard] = useState<Board>(() => parseFen(START_FEN))
  const [castling, setCastling] = useState<CastleRights>(FULL_CASTLE)
  const [running, setRunning] = useState(false)
  const [turn, setTurn] = useState<Side>('w')
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<Result>(null)
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  const [last, setLast] = useState<{ from: number; to: number } | null>(null)
  const ended = useRef(false)

  const youMoves = useMemo(
    () => (running && turn === 'w' && !result ? legalMoves(board, 'w', castling) : []),
    [board, castling, running, turn, result],
  )

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
    const points =
      outcome === 'win'
        ? Math.max(200, 700 - moveCount * 10)
        : outcome === 'draw'
          ? 100
          : Math.max(20, 50 - moveCount)
    setScore(points)
    if (outcome === 'win') {
      sfx.win()
      burst(points, 1)
      levelUp()
    } else if (outcome === 'draw') sfx.tick()
    else sfx.lose()
    recordPlay('chess', points, outcome === 'win')
  }

  function start() {
    void unlockAudio()
    ended.current = false
    setBoard(parseFen(START_FEN))
    setCastling(FULL_CASTLE)
    setRunning(true)
    setTurn('w')
    setSelected(null)
    setResult(null)
    setScore(0)
    setMoves(0)
    setLast(null)
    sfx.ready()
  }

  function playCpu(current: Board, rights: CastleRights, moveCount: number) {
    window.setTimeout(() => {
      if (ended.current) return
      const move = pickCpu(current, rights)
      if (!move) {
        finish(inCheck(current, 'b') ? 'win' : 'draw', moveCount)
        return
      }
      const applied = applyMove(current, move, rights)
      setBoard(applied.board)
      setCastling(applied.castling)
      setLast({ from: move.from, to: move.to })
      sfx.move()
      const replies = legalMoves(applied.board, 'w', applied.castling)
      if (replies.length === 0) {
        finish(inCheck(applied.board, 'w') ? 'lose' : 'draw', moveCount)
        return
      }
      setTurn('w')
    }, 450)
  }

  function tryMove(from: number, to: number) {
    const move = youMoves.find((m) => m.from === from && m.to === to)
    if (!move) {
      sfx.miss()
      return
    }
    void unlockAudio()
    sfx.tap()
    const applied = applyMove(board, move, castling)
    const nextMoves = moves + 1
    setMoves(nextMoves)
    setBoard(applied.board)
    setCastling(applied.castling)
    setLast({ from, to })
    setSelected(null)
    const cpuReplies = legalMoves(applied.board, 'b', applied.castling)
    if (cpuReplies.length === 0) {
      finish(inCheck(applied.board, 'b') ? 'win' : 'draw', nextMoves)
      return
    }
    setTurn('b')
    playCpu(applied.board, applied.castling, nextMoves)
  }

  function tap(i: number) {
    if (!running || result || turn !== 'w' || ended.current) return
    void unlockAudio()
    if (selected != null && targets.includes(i)) {
      tryMove(selected, i)
      return
    }
    const p = board[i]
    if (p && sideOf(p) === 'w') {
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
        { label: 'Turn', value: !running ? '—' : turn === 'w' ? 'You' : 'CPU' },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={() => finish('lose', moves)}>
            Give up
          </button>
        ) : undefined
      }
    >
      <div className="chess-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !result && (
          <PlayIdle hint="Play White against the CPU. Checkmate to win." onPlay={start} />
        )}
        {(running || result) && (
          <BoardStage
            status={!running ? 'Game over' : turn === 'w' ? 'Your move' : 'CPU thinking…'}
            topSeat={{
              avatar: '♞',
              name: 'CPU',
              detail: 'Black',
              pill: turn === 'b' && running ? 'Thinking' : 'Waiting',
              active: turn === 'b' && running,
              tone: 'cpu',
            }}
            bottomSeat={{
              avatar: '♟',
              name: 'You',
              detail: 'White',
              pill: turn === 'w' && running ? 'Your turn' : 'Waiting',
              active: turn === 'w' && running,
              tone: 'you',
            }}
          >
            <div className="chess-grid">
              {board.map((piece, i) => {
                const r = Math.floor(i / 8)
                const c = i % 8
                const dark = (r + c) % 2 === 1
                const isSel = selected === i
                const isTarget = targets.includes(i)
                const isLast = last?.from === i || last?.to === i
                return (
                  <button
                    key={i}
                    type="button"
                    className={`chess-cell${dark ? ' is-dark' : ''}${isSel ? ' is-sel' : ''}${isTarget ? ' is-target' : ''}${isLast ? ' is-last' : ''}`}
                    onClick={() => tap(i)}
                    disabled={!running || turn !== 'w'}
                  >
                    {piece ? <span className={`chess-piece${isWhite(piece) ? ' is-white' : ' is-black'}`}>{GLYPH[piece]}</span> : null}
                    {isTarget && !piece ? <span className="chess-dot" /> : null}
                  </button>
                )
              })}
            </div>
          </BoardStage>
        )}
        <ResultOverlay
          open={!!result}
          title={result === 'win' ? 'Checkmate!' : result === 'draw' ? 'Draw' : 'You lost'}
          subtitle={`Score ${score}`}
          celebrate={result === 'win'}
          onPrimary={start}
        />
      </div>
    </GameShell>
  )
}
