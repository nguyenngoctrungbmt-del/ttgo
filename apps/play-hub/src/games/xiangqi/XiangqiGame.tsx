import { useMemo, useRef, useState, type ReactElement } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import BoardStage from '../../shared/BoardStage'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './xiangqi.css'

const meta = getGame('xiangqi')

type Side = 'r' | 'b'
/** Uppercase = Red (you), lowercase = Black (CPU) */
type Piece = 'K' | 'A' | 'E' | 'H' | 'R' | 'C' | 'S' | 'k' | 'a' | 'e' | 'h' | 'r' | 'c' | 's'
type Board = (Piece | null)[]
type Result = 'win' | 'lose' | 'draw' | null
type Move = { from: number; to: number }

const COLS = 9
const ROWS = 10
const N = COLS * ROWS

const GLYPH: Record<Piece, string> = {
  K: '帅',
  A: '仕',
  E: '相',
  H: '马',
  R: '车',
  C: '炮',
  S: '兵',
  k: '将',
  a: '士',
  e: '象',
  h: '馬',
  r: '車',
  c: '砲',
  s: '卒',
}

const VALUE: Record<string, number> = {
  s: 100,
  a: 200,
  e: 200,
  h: 450,
  c: 500,
  r: 1000,
  k: 20000,
}

type Diff = 'easy' | 'medium' | 'hard'

const DIFFS: { id: Diff; label: string }[] = [
  { id: 'easy', label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard', label: 'Hard' },
]

const DIFF_DEPTH: Record<Diff, number> = { easy: 4, medium: 5, hard: 6 }
const DIFF_NOISE: Record<Diff, number> = { easy: 0, medium: 0, hard: 0 }
const DIFF_SCORE_MUL: Record<Diff, number> = { easy: 0.85, medium: 1.1, hard: 1.5 }
const DIFF_THINK_MS: Record<Diff, number> = { easy: 550, medium: 750, hard: 950 }
const DIFF_QDEPTH: Record<Diff, number> = { easy: 3, medium: 4, hard: 5 }
const DIFF_BUDGET_MS: Record<Diff, number> = { easy: 520, medium: 900, hard: 1400 }

/** Positional bonus for Red (bottom). Black uses mirrored ranks. */
function pstBonus(kind: string, r: number, c: number, side: Side): number {
  const rr = side === 'r' ? r : 9 - r
  const center = 4 - Math.abs(c - 4)
  if (kind === 's') {
    let v = (9 - rr) * 10
    if (rr <= 4) v += 45 + center * 6
    if (rr <= 2) v += 30
    if (rr === 0) v += 40
    return v
  }
  if (kind === 'h') return center * 14 + (rr >= 3 && rr <= 6 ? 18 : 0) + (rr <= 4 ? 10 : 0)
  if (kind === 'c') return center * 8 + (rr === 2 || rr === 7 ? 22 : 0) + (rr <= 4 ? 12 : 0)
  if (kind === 'r') return center * 6 + (c === 0 || c === 8 ? 12 : 0) + (rr <= 4 ? 18 : 0)
  if (kind === 'e') return rr >= 5 ? 10 : -30
  if (kind === 'a') return c === 4 ? 12 : 4
  if (kind === 'k') return c === 4 ? 10 : -8
  return 0
}


const START: (Piece | null)[] = [
  'r', 'h', 'e', 'a', 'k', 'a', 'e', 'h', 'r',
  null, null, null, null, null, null, null, null, null,
  null, 'c', null, null, null, null, null, 'c', null,
  's', null, 's', null, 's', null, 's', null, 's',
  null, null, null, null, null, null, null, null, null,
  null, null, null, null, null, null, null, null, null,
  'S', null, 'S', null, 'S', null, 'S', null, 'S',
  null, 'C', null, null, null, null, null, 'C', null,
  null, null, null, null, null, null, null, null, null,
  'R', 'H', 'E', 'A', 'K', 'A', 'E', 'H', 'R',
]

function isRed(p: Piece) {
  return p === p.toUpperCase()
}

function sideOf(p: Piece): Side {
  return isRed(p) ? 'r' : 'b'
}

function rc(i: number) {
  return { r: Math.floor(i / COLS), c: i % COLS }
}

function at(r: number, c: number) {
  return r * COLS + c
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS
}

function inPalace(r: number, c: number, side: Side) {
  if (c < 3 || c > 5) return false
  return side === 'r' ? r >= 7 && r <= 9 : r >= 0 && r <= 2
}

function crossedRiver(r: number, side: Side) {
  return side === 'r' ? r <= 4 : r >= 5
}

function cloneBoard(board: Board): Board {
  return [...board]
}

function kingIndex(board: Board, side: Side): number {
  const target = side === 'r' ? 'K' : 'k'
  return board.findIndex((p) => p === target)
}

/** Flying general: same file, only empty squares between */
function flyingGeneral(board: Board): boolean {
  const rk = kingIndex(board, 'r')
  const bk = kingIndex(board, 'b')
  if (rk < 0 || bk < 0) return true
  const { c: rc0 } = rc(rk)
  const { c: bc0 } = rc(bk)
  if (rc0 !== bc0) return false
  const rLo = Math.min(rc(rk).r, rc(bk).r)
  const rHi = Math.max(rc(rk).r, rc(bk).r)
  for (let r = rLo + 1; r < rHi; r += 1) {
    if (board[at(r, rc0)]) return false
  }
  return true
}

function slideAlong(
  board: Board,
  from: number,
  side: Side,
  dr: number,
  dc: number,
  moves: Move[],
  maxSteps = 99,
) {
  const { r: r0, c: c0 } = rc(from)
  let r = r0 + dr
  let c = c0 + dc
  let steps = 0
  while (inBounds(r, c) && steps < maxSteps) {
    const to = at(r, c)
    const target = board[to]
    if (!target) moves.push({ from, to })
    else {
      if (sideOf(target) !== side) moves.push({ from, to })
      break
    }
    r += dr
    c += dc
    steps += 1
  }
}

function genPseudo(board: Board, side: Side): Move[] {
  const moves: Move[] = []
  for (let from = 0; from < N; from += 1) {
    const p = board[from]
    if (!p || sideOf(p) !== side) continue
    const { r, c } = rc(from)
    const kind = p.toLowerCase()

    if (kind === 'k') {
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const rr = r + dr
        const cc = c + dc
        if (!inPalace(rr, cc, side)) continue
        const to = at(rr, cc)
        const target = board[to]
        if (!target || sideOf(target) !== side) moves.push({ from, to })
      }
    } else if (kind === 'a') {
      for (const [dr, dc] of [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]) {
        const rr = r + dr
        const cc = c + dc
        if (!inPalace(rr, cc, side)) continue
        const to = at(rr, cc)
        const target = board[to]
        if (!target || sideOf(target) !== side) moves.push({ from, to })
      }
    } else if (kind === 'e') {
      for (const [dr, dc] of [
        [2, 2],
        [2, -2],
        [-2, 2],
        [-2, -2],
      ]) {
        const rr = r + dr
        const cc = c + dc
        if (!inBounds(rr, cc)) continue
        if (side === 'r' && rr < 5) continue
        if (side === 'b' && rr > 4) continue
        const block = at(r + dr / 2, c + dc / 2)
        if (board[block]) continue
        const to = at(rr, cc)
        const target = board[to]
        if (!target || sideOf(target) !== side) moves.push({ from, to })
      }
    } else if (kind === 'h') {
      for (const [dr, dc, br, bc] of [
        [-2, -1, -1, 0],
        [-2, 1, -1, 0],
        [2, -1, 1, 0],
        [2, 1, 1, 0],
        [-1, -2, 0, -1],
        [1, -2, 0, -1],
        [-1, 2, 0, 1],
        [1, 2, 0, 1],
      ] as const) {
        const rr = r + dr
        const cc = c + dc
        if (!inBounds(rr, cc)) continue
        if (board[at(r + br, c + bc)]) continue
        const to = at(rr, cc)
        const target = board[to]
        if (!target || sideOf(target) !== side) moves.push({ from, to })
      }
    } else if (kind === 'r') {
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        slideAlong(board, from, side, dr, dc, moves)
      }
    } else if (kind === 'c') {
      for (const [dr, dc] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        let rr = r + dr
        let cc = c + dc
        let jumped = false
        while (inBounds(rr, cc)) {
          const to = at(rr, cc)
          const target = board[to]
          if (!jumped) {
            if (!target) moves.push({ from, to })
            else jumped = true
          } else if (target) {
            if (sideOf(target) !== side) moves.push({ from, to })
            break
          }
          rr += dr
          cc += dc
        }
      }
    } else if (kind === 's') {
      const forward = side === 'r' ? -1 : 1
      const fr = r + forward
      if (inBounds(fr, c)) {
        const to = at(fr, c)
        const target = board[to]
        if (!target || sideOf(target) !== side) moves.push({ from, to })
      }
      if (crossedRiver(r, side)) {
        for (const dc of [-1, 1]) {
          const cc = c + dc
          if (!inBounds(r, cc)) continue
          const to = at(r, cc)
          const target = board[to]
          if (!target || sideOf(target) !== side) moves.push({ from, to })
        }
      }
    }
  }
  return moves
}

function applyMove(board: Board, move: Move): Board {
  const next = cloneBoard(board)
  next[move.to] = next[move.from]
  next[move.from] = null
  return next
}

function inCheck(board: Board, side: Side): boolean {
  const k = kingIndex(board, side)
  if (k < 0) return true
  const enemy = side === 'r' ? 'b' : 'r'
  const attacks = genPseudo(board, enemy)
  if (attacks.some((m) => m.to === k)) return true
  return flyingGeneral(board)
}

function legalMoves(board: Board, side: Side): Move[] {
  return genPseudo(board, side).filter((m) => {
    const next = applyMove(board, m)
    return !inCheck(next, side)
  })
}

function material(board: Board, side: Side): number {
  let score = 0
  let myMajor = 0
  let theirMajor = 0
  for (let i = 0; i < N; i += 1) {
    const p = board[i]
    if (!p) continue
    const kind = p.toLowerCase()
    const { r, c } = rc(i)
    const owner = sideOf(p)
    const v = (VALUE[kind] ?? 0) + pstBonus(kind, r, c, owner)
    if (owner === side) {
      score += v
      if (kind === 'r' || kind === 'c' || kind === 'h') myMajor += 1
    } else {
      score -= v
      if (kind === 'r' || kind === 'c' || kind === 'h') theirMajor += 1
    }
  }
  // Prefer trading when ahead in major pieces
  if (myMajor > theirMajor) score += (myMajor - theirMajor) * 18
  return score
}

function orderMoves(board: Board, moves: Move[], side: Side): Move[] {
  const ranked = moves.map((m) => ({ m, s: moveScore(board, m, side) }))
  ranked.sort((a, b) => b.s - a.s)
  return ranked.map((x) => x.m)
}

function moveScore(board: Board, m: Move, side: Side): number {
  let s = 0
  const captured = board[m.to]
  if (captured) s += 1000 + (VALUE[captured.toLowerCase()] ?? 0)
  const p = board[m.from]
  if (p) {
    const kind = p.toLowerCase()
    const from = rc(m.from)
    const to = rc(m.to)
    s += pstBonus(kind, to.r, to.c, side) - pstBonus(kind, from.r, from.c, side)
    // Cheap “gives check?” probe without full legal move gen: attack king square after move
    const enemy = side === 'r' ? 'b' : 'r'
    const next = applyMove(board, m)
    const k = kingIndex(next, enemy)
    if (k >= 0) {
      const attacks = genPseudo(next, side)
      if (attacks.some((x) => x.to === k) || flyingGeneral(next)) s += 320
    }
  }
  return s
}

function quiesce(
  board: Board,
  side: Side,
  alpha: number,
  beta: number,
  qDepth: number,
): number {
  let stand = material(board, side)
  if (inCheck(board, side === 'r' ? 'b' : 'r')) stand += 40
  if (inCheck(board, side)) stand -= 55
  if (stand >= beta) return stand
  if (stand > alpha) alpha = stand
  if (qDepth <= 0) return stand

  const moves = orderMoves(board, legalMoves(board, side), side).filter((m) => {
    if (board[m.to]) return true
    const next = applyMove(board, m)
    return inCheck(next, side === 'r' ? 'b' : 'r')
  })

  for (const m of moves) {
    const next = applyMove(board, m)
    const score = -quiesce(next, side === 'r' ? 'b' : 'r', -beta, -alpha, qDepth - 1)
    if (score >= beta) return score
    if (score > alpha) alpha = score
  }
  return alpha
}

/** Negamax with alpha-beta + check extension + capture quiescence. */
function negamax(
  board: Board,
  side: Side,
  depth: number,
  alpha: number,
  beta: number,
  qDepth: number,
): number {
  const inChk = inCheck(board, side)
  const moves = orderMoves(board, legalMoves(board, side), side)
  if (moves.length === 0) {
    return inChk ? -100000 - depth : 0
  }
  const ext = inChk && depth > 0 ? 1 : 0
  const searchDepth = depth + ext
  if (searchDepth === 0) {
    return quiesce(board, side, alpha, beta, qDepth)
  }

  let best = -Infinity
  for (const m of moves) {
    const next = applyMove(board, m)
    const score = -negamax(next, side === 'r' ? 'b' : 'r', searchDepth - 1, -beta, -alpha, qDepth)
    if (score > best) best = score
    if (score > alpha) alpha = score
    if (alpha >= beta) break
  }
  return best
}

function pickCpu(board: Board, diff: Diff): Move | null {
  const rootMoves = orderMoves(board, legalMoves(board, 'b'), 'b')
  if (rootMoves.length === 0) return null

  const maxDepth = DIFF_DEPTH[diff]
  const noise = DIFF_NOISE[diff]
  const qDepth = DIFF_QDEPTH[diff]
  const deadline = performance.now() + DIFF_BUDGET_MS[diff]

  let bestMove = rootMoves[0]
  let moveOrder = rootMoves

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    if (performance.now() > deadline && depth > 1) break

    const scored: { move: Move; score: number }[] = []
    let alpha = -Infinity
    const beta = Infinity
    let aborted = false

    for (const m of moveOrder) {
      if (performance.now() > deadline && depth > 1 && scored.length > 0) {
        aborted = true
        break
      }
      const next = applyMove(board, m)
      const replies = legalMoves(next, 'r')
      let score: number
      if (replies.length === 0) {
        score = inCheck(next, 'r') ? 100000 - depth : 0
      } else {
        score = -negamax(next, 'r', depth - 1, -beta, -alpha, qDepth)
      }
      if (diff === 'hard') {
        if (board[m.to]) score += 2
        if (inCheck(next, 'r')) score += 4
      }
      score += Math.random() * noise
      scored.push({ move: m, score })
      if (score > alpha) alpha = score
    }

    if (scored.length === 0) break
    scored.sort((a, b) => b.score - a.score)
    bestMove = scored[0].move
    // PV move ordering for the next iteration
    moveOrder = scored.map((x) => x.move)

    if (aborted) break
    // Mate found — no need to go deeper
    if (scored[0].score > 90000) break
  }

  return bestMove
}

/** Classic xiangqi line board: 9 files × 10 ranks on intersections, river break, palace X. */
function XiangqiLines() {
  const lines = [] as ReactElement[]
  // Horizontal ranks 0..9
  for (let y = 0; y <= 9; y += 1) {
    lines.push(
      <line key={`h${y}`} x1={0} y1={y} x2={8} y2={y} className={y === 0 || y === 9 ? 'is-outer' : undefined} />,
    )
  }
  // Outer verticals full height
  lines.push(<line key="v0" x1={0} y1={0} x2={0} y2={9} className="is-outer" />)
  lines.push(<line key="v8" x1={8} y1={0} x2={8} y2={9} className="is-outer" />)
  // Inner verticals break at the river (between y=4 and y=5)
  for (let x = 1; x <= 7; x += 1) {
    lines.push(<line key={`vt${x}`} x1={x} y1={0} x2={x} y2={4} />)
    lines.push(<line key={`vb${x}`} x1={x} y1={5} x2={x} y2={9} />)
  }
  // Palace diagonals (black top, red bottom)
  lines.push(<line key="pd1" x1={3} y1={0} x2={5} y2={2} />)
  lines.push(<line key="pd2" x1={5} y1={0} x2={3} y2={2} />)
  lines.push(<line key="pd3" x1={3} y1={7} x2={5} y2={9} />)
  lines.push(<line key="pd4" x1={5} y1={7} x2={3} y2={9} />)
  // Cannon / soldier position marks (traditional “+” ticks)
  const marks: [number, number][] = [
    [1, 2],
    [7, 2],
    [1, 7],
    [7, 7],
    [0, 3],
    [2, 3],
    [4, 3],
    [6, 3],
    [8, 3],
    [0, 6],
    [2, 6],
    [4, 6],
    [6, 6],
    [8, 6],
  ]
  for (const [x, y] of marks) {
    const s = 0.12
    if (x > 0) {
      lines.push(<line key={`ml${x}-${y}`} x1={x - s} y1={y} x2={x - s * 0.25} y2={y} />)
      lines.push(<line key={`mtl${x}-${y}`} x1={x - s} y1={y - s} x2={x - s} y2={y - s * 0.25} />)
      lines.push(<line key={`mbl${x}-${y}`} x1={x - s} y1={y + s * 0.25} x2={x - s} y2={y + s} />)
    }
    if (x < 8) {
      lines.push(<line key={`mr${x}-${y}`} x1={x + s * 0.25} y1={y} x2={x + s} y2={y} />)
      lines.push(<line key={`mtr${x}-${y}`} x1={x + s} y1={y - s} x2={x + s} y2={y - s * 0.25} />)
      lines.push(<line key={`mbr${x}-${y}`} x1={x + s} y1={y + s * 0.25} x2={x + s} y2={y + s} />)
    }
  }
  return (
    <svg className="xiangqi-lines" viewBox="0 0 8 9" preserveAspectRatio="none" aria-hidden>
      {lines}
    </svg>
  )
}

export default function XiangqiGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [board, setBoard] = useState<Board>(() => [...START])
  const [running, setRunning] = useState(false)
  const [turn, setTurn] = useState<Side>('r')
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<Result>(null)
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  const [last, setLast] = useState<{ from: number; to: number } | null>(null)
  const [diff, setDiff] = useState<Diff>('medium')
  const ended = useRef(false)
  const diffRef = useRef<Diff>('medium')

  const youMoves = useMemo(
    () => (running && turn === 'r' && !result ? legalMoves(board, 'r') : []),
    [board, running, turn, result],
  )

  const targets = useMemo(() => {
    if (selected == null) return [] as number[]
    return youMoves.filter((m) => m.from === selected).map((m) => m.to)
  }, [selected, youMoves])

  function chooseDiff(next: Diff) {
    if (running) return
    setDiff(next)
    diffRef.current = next
    sfx.tick()
  }

  function finish(outcome: Exclude<Result, null>, moveCount: number) {
    if (ended.current) return
    ended.current = true
    setResult(outcome)
    setRunning(false)
    setSelected(null)
    const mul = DIFF_SCORE_MUL[diffRef.current]
    const raw =
      outcome === 'win'
        ? Math.max(220, 780 - moveCount * 8)
        : outcome === 'draw'
          ? 110
          : Math.max(20, 55 - moveCount)
    const points = Math.round(raw * mul)
    setScore(points)
    if (outcome === 'win') {
      sfx.win()
      burst(points, 1)
      levelUp()
    } else if (outcome === 'draw') sfx.tick()
    else sfx.lose()
    recordPlay('xiangqi', points, outcome === 'win')
  }

  function start() {
    void unlockAudio()
    ended.current = false
    diffRef.current = diff
    setBoard([...START])
    setRunning(true)
    setTurn('r')
    setSelected(null)
    setResult(null)
    setScore(0)
    setMoves(0)
    setLast(null)
    sfx.ready()
  }

  function playCpu(current: Board, moveCount: number) {
    const level = diffRef.current
    const startedAt = performance.now()
    // Yield so the "CPU thinking" seat paints before the search blocks.
    window.setTimeout(() => {
      if (ended.current) return
      const move = pickCpu(current, level)
      const apply = () => {
        if (ended.current) return
        if (!move) {
          finish(inCheck(current, 'b') ? 'win' : 'draw', moveCount)
          return
        }
        const next = applyMove(current, move)
        setBoard(next)
        setLast({ from: move.from, to: move.to })
        sfx.move()
        const replies = legalMoves(next, 'r')
        if (replies.length === 0) {
          finish(inCheck(next, 'r') ? 'lose' : 'draw', moveCount)
          return
        }
        setTurn('r')
      }
      const remain = Math.max(0, DIFF_THINK_MS[level] - (performance.now() - startedAt))
      window.setTimeout(apply, remain)
    }, 16)
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
    const nextMoves = moves + 1
    setMoves(nextMoves)
    setBoard(next)
    setLast({ from, to })
    setSelected(null)
    const cpuReplies = legalMoves(next, 'b')
    if (cpuReplies.length === 0) {
      finish(inCheck(next, 'b') ? 'win' : 'draw', nextMoves)
      return
    }
    setTurn('b')
    playCpu(next, nextMoves)
  }

  function tap(i: number) {
    if (!running || result || turn !== 'r' || ended.current) return
    void unlockAudio()
    if (selected != null && targets.includes(i)) {
      tryMove(selected, i)
      return
    }
    const p = board[i]
    if (p && sideOf(p) === 'r') {
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
        { label: 'Diff', value: DIFFS.find((d) => d.id === diff)?.label ?? 'Medium' },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={() => finish('lose', moves)}>
            Give up
          </button>
        ) : undefined
      }
    >
      <div className="xiangqi-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !result && (
          <div className="play-idle">
            <div className="xiangqi-diff" role="group" aria-label="Difficulty">
              {DIFFS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`xiangqi-diff__btn${diff === d.id ? ' is-on' : ''}`}
                  onClick={() => chooseDiff(d.id)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="muted play-idle__hint">
              Play Red against the CPU. Checkmate the general to win.
            </p>
            <button type="button" className="btn btn-primary btn-play" onClick={start}>
              Play
            </button>
          </div>
        )}
        {!running && result && (
          <div className="xiangqi-diff xiangqi-diff--bar" role="group" aria-label="Difficulty">
            {DIFFS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`xiangqi-diff__btn${diff === d.id ? ' is-on' : ''}`}
                onClick={() => chooseDiff(d.id)}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
        {(running || result) && (
          <BoardStage
            status={!running ? 'Game over' : turn === 'r' ? 'Your move' : 'CPU thinking…'}
            topSeat={{
              avatar: '将',
              name: 'CPU',
              detail: DIFFS.find((d) => d.id === diff)?.label ?? 'Medium',
              pill: turn === 'b' && running ? 'Thinking' : 'Waiting',
              active: turn === 'b' && running,
              tone: 'cpu',
            }}
            bottomSeat={{
              avatar: '帅',
              name: 'You',
              detail: 'Red',
              pill: turn === 'r' && running ? 'Your turn' : 'Waiting',
              active: turn === 'r' && running,
              tone: 'you',
            }}
          >
            <div className="xiangqi-frame">
              <div className="xiangqi-stage">
                <XiangqiLines />
                <div className="xiangqi-river-label">
                  <span>楚 河</span>
                  <span>汉 界</span>
                </div>
                <div className="xiangqi-points">
                  {board.map((piece, i) => {
                    const { r, c } = rc(i)
                    const isSel = selected === i
                    const isTarget = targets.includes(i)
                    const isLast = last?.from === i || last?.to === i
                    return (
                      <button
                        key={i}
                        type="button"
                        className={`xiangqi-point${isSel ? ' is-sel' : ''}${isTarget ? ' is-target' : ''}${isLast ? ' is-last' : ''}${piece ? ' has-piece' : ''}`}
                        style={{ left: `${(c / 8) * 100}%`, top: `${(r / 9) * 100}%` }}
                        onClick={() => tap(i)}
                        disabled={!running || turn !== 'r'}
                        aria-label={piece ? GLYPH[piece] : `Empty ${r},${c}`}
                      >
                        {piece ? (
                          <span className={`xiangqi-piece${isRed(piece) ? ' is-red' : ' is-black'}`}>
                            {GLYPH[piece]}
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </BoardStage>
        )}
        <ResultOverlay
          open={!!result}
          title={result === 'win' ? 'Checkmate!' : result === 'draw' ? 'Draw' : 'You lost'}
          subtitle={`${DIFFS.find((d) => d.id === diff)?.label ?? 'Medium'} · Score ${score}`}
          celebrate={result === 'win'}
          onPrimary={start}
        />
      </div>
    </GameShell>
  )
}
