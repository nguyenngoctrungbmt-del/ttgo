import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { getGame } from '../../data/games'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import LevelCleared from '../../shared/LevelCleared'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './match3.css'

const meta = getGame('match3')
const SIZE = 6
const COLORS = ['#DB2777', '#0D9488', '#F59E0B', '#2563EB', '#8B5CF6'] as const
const SWAP_MS = 280
const CLEAR_MS = 320
const GAP_PX = 4

type Cell = number
type Board = Cell[]

type SwapAnim = {
  a: number
  b: number
  /** Pixel offset applied to cell a toward b (and inverse on b). */
  dx: number
  dy: number
}

function sizeTarget(stage: number): number {
  return 12 + stage * 4
}

function moveLimit(stage: number): number {
  return Math.max(14, 22 - Math.floor((stage - 1) / 2))
}

function randomCell(): Cell {
  return Math.floor(Math.random() * COLORS.length)
}

function makeBoard(): Board {
  const board: Board = Array.from({ length: SIZE * SIZE }, () => randomCell())
  for (let i = 0; i < board.length; i += 1) {
    while (formsMatchAt(board, i)) {
      board[i] = randomCell()
    }
  }
  return board
}

function idx(r: number, c: number): number {
  return r * SIZE + c
}

function adjacent(a: number, b: number): boolean {
  const ar = Math.floor(a / SIZE)
  const ac = a % SIZE
  const br = Math.floor(b / SIZE)
  const bc = b % SIZE
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1
}

function formsMatchAt(board: Board, i: number): boolean {
  const r = Math.floor(i / SIZE)
  const c = i % SIZE
  const color = board[i]
  let left = 0
  for (let x = c - 1; x >= 0 && board[idx(r, x)] === color; x -= 1) left += 1
  let right = 0
  for (let x = c + 1; x < SIZE && board[idx(r, x)] === color; x += 1) right += 1
  if (left + right + 1 >= 3) return true
  let up = 0
  for (let y = r - 1; y >= 0 && board[idx(y, c)] === color; y -= 1) up += 1
  let down = 0
  for (let y = r + 1; y < SIZE && board[idx(y, c)] === color; y += 1) down += 1
  return up + down + 1 >= 3
}

function findMatches(board: Board): Set<number> {
  const matched = new Set<number>()
  for (let r = 0; r < SIZE; r += 1) {
    let run = 1
    for (let c = 1; c <= SIZE; c += 1) {
      const same = c < SIZE && board[idx(r, c)] === board[idx(r, c - 1)]
      if (same) {
        run += 1
      } else {
        if (run >= 3) {
          for (let k = 0; k < run; k += 1) matched.add(idx(r, c - 1 - k))
        }
        run = 1
      }
    }
  }
  for (let c = 0; c < SIZE; c += 1) {
    let run = 1
    for (let r = 1; r <= SIZE; r += 1) {
      const same = r < SIZE && board[idx(r, c)] === board[idx(r - 1, c)]
      if (same) {
        run += 1
      } else {
        if (run >= 3) {
          for (let k = 0; k < run; k += 1) matched.add(idx(r - 1 - k, c))
        }
        run = 1
      }
    }
  }
  return matched
}

/** One gravity + refill pass (no cascade loop). */
function collapseOnce(board: Board, matched: Set<number>): { next: Board; cleared: number; fell: Set<number> } {
  const next = [...board]
  const cleared = matched.size
  const fell = new Set<number>()

  for (let c = 0; c < SIZE; c += 1) {
    const kept: Cell[] = []
    for (let r = SIZE - 1; r >= 0; r -= 1) {
      const i = idx(r, c)
      if (!matched.has(i)) kept.push(board[i])
    }
    for (let r = SIZE - 1; r >= 0; r -= 1) {
      const i = idx(r, c)
      next[i] = kept.length > 0 ? kept.shift()! : randomCell()
      if (next[i] !== board[i] || matched.has(i)) fell.add(i)
    }
  }

  return { next, cleared, fell }
}

function collapseAll(board: Board, first: Set<number>): { next: Board; cleared: number; fell: Set<number> } {
  let current = board
  let matched = first
  let cleared = 0
  const fell = new Set<number>()
  while (matched.size > 0) {
    const pass = collapseOnce(current, matched)
    cleared += pass.cleared
    for (const i of pass.fell) fell.add(i)
    current = pass.next
    matched = findMatches(current)
  }
  return { next: current, cleared, fell }
}

function swap(board: Board, a: number, b: number): Board {
  const next = [...board]
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export default function Match3Game() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const gridRef = useRef<HTMLDivElement>(null)

  const [stage, setStage] = useState(1)
  const target = sizeTarget(stage)
  const limit = moveLimit(stage)

  const [board, setBoard] = useState<Board>(() => makeBoard())
  const [selected, setSelected] = useState<number | null>(null)
  const [moves, setMoves] = useState(0)
  const [cleared, setCleared] = useState(0)
  const [won, setWon] = useState(false)
  const [lost, setLost] = useState(false)
  const [busy, setBusy] = useState(false)
  const [swapAnim, setSwapAnim] = useState<SwapAnim | null>(null)
  const [clearing, setClearing] = useState<Set<number>>(() => new Set())
  const [falling, setFalling] = useState<Set<number>>(() => new Set())

  const progress = useMemo(() => Math.min(cleared, target), [cleared, target])

  function restart(nextStage = 1) {
    void unlockAudio()
    setStage(Math.max(1, nextStage))
    setBoard(makeBoard())
    setSelected(null)
    setMoves(0)
    setCleared(0)
    setWon(false)
    setLost(false)
    setBusy(false)
    setSwapAnim(null)
    setClearing(new Set())
    setFalling(new Set())
    sfx.tick()
  }

  function measureSwap(a: number, b: number): { dx: number; dy: number } {
    const grid = gridRef.current
    if (!grid) {
      const ar = Math.floor(a / SIZE)
      const ac = a % SIZE
      const br = Math.floor(b / SIZE)
      const bc = b % SIZE
      // Fallback using estimated cell size.
      const cell = 48
      return { dx: (bc - ac) * (cell + GAP_PX), dy: (br - ar) * (cell + GAP_PX) }
    }
    const cells = grid.querySelectorAll<HTMLElement>('.match3-cell')
    const elA = cells[a]
    const elB = cells[b]
    if (!elA || !elB) return { dx: 0, dy: 0 }
    const ra = elA.getBoundingClientRect()
    const rb = elB.getBoundingClientRect()
    return { dx: rb.left - ra.left, dy: rb.top - ra.top }
  }

  async function runSwap(a: number, b: number) {
    setBusy(true)
    setSelected(null)

    const { dx, dy } = measureSwap(a, b)
    setSwapAnim({ a, b, dx, dy })
    sfx.move()
    await wait(SWAP_MS)

    const swapped = swap(board, a, b)
    setBoard(swapped)
    setSwapAnim(null)

    // Force layout with swapped colors at rest for a beat.
    await wait(40)

    const matched = findMatches(swapped)
    if (matched.size === 0) {
      // Bounce back so the failed swap is readable.
      setSwapAnim({ a, b, dx, dy })
      sfx.miss()
      await wait(SWAP_MS)
      setBoard(board)
      setSwapAnim(null)
      setBusy(false)
      return
    }

    const nextMoves = moves + 1
    setMoves(nextMoves)

    // Pop matched gems, then collapse with fall-in.
    setClearing(new Set(matched))
    sfx.match()
    await wait(CLEAR_MS)

    const { next, cleared: gained, fell } = collapseAll(swapped, matched)
    setClearing(new Set())
    setBoard(next)
    setFalling(fell)
    const total = cleared + gained
    setCleared(total)
    burst(gained * 8, Math.min(gained, 8))
    await wait(340)
    setFalling(new Set())

    if (total >= target) {
      setWon(true)
      sfx.win()
      const score = Math.max(limit - nextMoves, 0) * 30 + stage * 80 + total * 4
      burst(score, stage)
      levelUp()
      recordPlay('match3', score, true)
      setBusy(false)
      return
    }

    if (nextMoves >= limit) {
      setLost(true)
      sfx.lose()
      recordPlay('match3', Math.max(total * 3, 10), false)
    }
    setBusy(false)
  }

  function tap(i: number) {
    if (won || lost || busy) return
    void unlockAudio()

    if (selected === null) {
      setSelected(i)
      sfx.tap()
      return
    }

    if (selected === i) {
      setSelected(null)
      sfx.tap()
      return
    }

    if (!adjacent(selected, i)) {
      setSelected(i)
      sfx.tap()
      return
    }

    void runSwap(selected, i)
  }

  function cellStyle(i: number): CSSProperties {
    const color = board[i]
    const style: CSSProperties = {
      background: color >= 0 ? COLORS[color] : 'transparent',
    }
    if (swapAnim && (swapAnim.a === i || swapAnim.b === i)) {
      const sign = swapAnim.a === i ? 1 : -1
      style.transform = `translate(${swapAnim.dx * sign}px, ${swapAnim.dy * sign}px) scale(1.04)`
    }
    return style
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Cleared', value: `${progress}/${target}` },
        { label: 'Moves', value: `${moves}/${limit}` },
        { label: 'Lv', value: stage },
      ]}
      actions={
        <button type="button" className="btn btn-ghost" onClick={() => restart(1)}>
          New run
        </button>
      }
    >
      <div className="match3-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        <BoardStage status={`Level ${stage} · clear ${target}`}>
          <div
            ref={gridRef}
            className="match3-grid"
            style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
          >
            {board.map((_, i) => {
              const isSwap = swapAnim !== null && (swapAnim.a === i || swapAnim.b === i)
              return (
                <button
                  key={i}
                  type="button"
                  className={[
                    'match3-cell',
                    selected === i ? 'is-selected' : '',
                    isSwap ? 'is-swapping' : '',
                    clearing.has(i) ? 'is-clearing' : '',
                    falling.has(i) ? 'is-falling-in' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={cellStyle(i)}
                  aria-label={`Gem ${board[i] + 1}`}
                  disabled={won || lost || busy}
                  onClick={() => tap(i)}
                />
              )
            })}
          </div>
        </BoardStage>

        <LevelCleared
          open={won}
          title="Level cleared!"
          subtitle={`${cleared} gems · ${moves} moves`}
          onNext={() => restart(stage + 1)}
          onReplay={() => restart(1)}
          replayLabel="New run"
        />
        <ResultOverlay
          open={lost}
          title="Out of moves"
          subtitle={`Cleared ${cleared}/${target}`}
          onPrimary={() => restart(stage)}
          primaryLabel="Try again"
          onSecondary={() => restart(1)}
          secondaryLabel="New run"
        />
      </div>
    </GameShell>
  )
}
