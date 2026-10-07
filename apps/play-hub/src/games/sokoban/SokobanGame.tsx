import { useMemo, useState } from 'react'
import { getGame } from '../../data/games'
import LevelMap from '../../shared/action/LevelMap'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import LevelCleared from '../../shared/LevelCleared'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { dirToDelta, useDirectionInput } from '../../shared/useDirectionInput'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import { levelAt } from './levels'
import './sokoban.css'

const meta = getGame('sokoban')

type Cell = 'wall' | 'floor' | 'goal' | 'void'

type LevelState = {
  w: number
  h: number
  cells: Cell[]
  player: number
  crates: Set<number>
}

function parseLevel(raw: string): LevelState {
  const rows = raw
    .replace(/^\n+|\n+$/g, '')
    .split('\n')
    .map((r) => r.trimEnd())
  const h = rows.length
  const w = Math.max(...rows.map((r) => r.length))
  const cells: Cell[] = Array.from({ length: w * h }, () => 'floor')
  const crates = new Set<number>()
  let player = 0

  for (let y = 0; y < h; y += 1) {
    const row = rows[y].padEnd(w, '_')
    for (let x = 0; x < w; x += 1) {
      const i = y * w + x
      const ch = row[x]
      if (ch === '#') cells[i] = 'wall'
      else if (ch === '_') cells[i] = 'void'
      else if (ch === '.' || ch === '+' || ch === '*') cells[i] = 'goal'
      else cells[i] = 'floor'

      if (ch === '@' || ch === '+') player = i
      if (ch === '$' || ch === '*') crates.add(i)
    }
  }
  return { w, h, cells, player, crates }
}

function cloneState(s: LevelState): LevelState {
  return { w: s.w, h: s.h, cells: s.cells, player: s.player, crates: new Set(s.crates) }
}

function goalsDone(s: LevelState): boolean {
  for (let i = 0; i < s.cells.length; i += 1) {
    if (s.cells[i] === 'goal' && !s.crates.has(i)) return false
  }
  return true
}

/** 3★ within 10% of the solver's par, 2★ within +60%, else 1★. */
function starsFor(moves: number, par: number): number {
  if (moves <= Math.ceil(par * 1.1)) return 3
  if (moves <= Math.ceil(par * 1.6) + 2) return 2
  return 1
}

const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

export default function SokobanGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const record = useProgressStore((s) => s.levelProgress.sokoban)
  const nextLevel = (record?.cleared ?? 0) + 1
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [level, setLevel] = useState(1)
  const [state, setState] = useState<LevelState>(() => parseLevel(levelAt(1).map))
  const [moves, setMoves] = useState(0)
  const [score, setScore] = useState(0)
  const [running, setRunning] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [stars, setStars] = useState(0)
  const [best, setBest] = useState(false)
  const [history, setHistory] = useState<LevelState[]>([])
  const par = levelAt(level).par

  const goalCount = useMemo(
    () => state.cells.reduce((n, c) => n + (c === 'goal' ? 1 : 0), 0),
    [state],
  )
  const onGoal = useMemo(() => {
    let n = 0
    for (const c of state.crates) if (state.cells[c] === 'goal') n += 1
    return n
  }, [state])

  function start(lv: number, keepScore = false) {
    void unlockAudio()
    setLevel(lv)
    setState(parseLevel(levelAt(lv).map))
    setMoves(0)
    setHistory([])
    if (!keepScore) setScore(0)
    setRunning(true)
    setCleared(false)
    sfx.ready()
  }

  function backToMap() {
    setRunning(false)
    setCleared(false)
  }

  function tryMove(dr: number, dc: number) {
    if (!running || cleared) return
    const { w, h, cells, player, crates } = state
    const x = player % w
    const y = Math.floor(player / w)
    const nx = x + dc
    const ny = y + dr
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
      sfx.miss()
      return
    }
    const nextI = ny * w + nx
    if (cells[nextI] === 'wall' || cells[nextI] === 'void') {
      sfx.miss()
      return
    }

    const next = cloneState(state)
    if (crates.has(nextI)) {
      const bx = nx + dc
      const by = ny + dr
      if (bx < 0 || by < 0 || bx >= w || by >= h) {
        sfx.miss()
        return
      }
      const beyond = by * w + bx
      if (cells[beyond] === 'wall' || cells[beyond] === 'void' || crates.has(beyond)) {
        sfx.miss()
        return
      }
      next.crates.delete(nextI)
      next.crates.add(beyond)
      sfx.move()
    } else {
      sfx.tap()
    }

    void unlockAudio()
    setHistory((hs) => [...hs, cloneState(state)])
    next.player = nextI
    setState(next)
    const nextMoves = moves + 1
    setMoves(nextMoves)

    if (goalsDone(next)) {
      sfx.win()
      const st = starsFor(nextMoves, par)
      const gained = Math.max(120 - Math.max(0, nextMoves - par) * 2, 40) + level * 25 + st * 20
      const nextScore = score + gained
      setScore(nextScore)
      burst(gained, level)
      levelUp()
      setStars(st)
      setBest(useProgressStore.getState().completeLevel('sokoban', level, st).improved)
      setCleared(true)
      setRunning(false)
      recordPlay('sokoban', nextScore, true)
    }
  }

  const { swipeHandlers } = useDirectionInput({
    enabled: running && !cleared,
    onDirection: (dir) => {
      const { dr, dc } = dirToDelta(dir)
      tryMove(dr, dc)
    },
  })

  function undo() {
    if (!history.length || !running || cleared) return
    void unlockAudio()
    const prev = history[history.length - 1]
    setHistory((hs) => hs.slice(0, -1))
    setState(prev)
    setMoves((m) => Math.max(0, m - 1))
    sfx.tick()
  }

  function resetLevel() {
    if (!running) return
    start(level, true)
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
        { label: 'Goals', value: `${onGoal}/${goalCount}` },
      ]}
      actions={
        running ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={undo} disabled={!history.length}>
              Undo
            </button>
            <button type="button" className="btn btn-ghost" onClick={resetLevel}>
              Reset
            </button>
            <button type="button" className="btn btn-ghost" onClick={backToMap}>
              Levels
            </button>
          </>
        ) : undefined
      }
    >
      <div className="sokoban-board panel board-host" {...swipeHandlers}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!showBoard && (
          <div className="play-idle">
            <p className="muted play-idle__hint">Swipe or use arrow keys. Push every crate onto a goal — reach par for ★★★.</p>
            <LevelMap game="sokoban" onPick={(lv) => start(lv)} />
            <button type="button" className="btn btn-primary btn-play" onClick={() => start(nextLevel)}>
              Play · Level {nextLevel}
            </button>
          </div>
        )}
        {showBoard && (
          <BoardStage status={`Level ${level} · par ${par}`}>
            <div
              className="sokoban-grid"
              style={{
                gridTemplateColumns: `repeat(${state.w}, 1fr)`,
                width: `min(100%, ${Math.min(state.w * 44, 520)}px)`,
              }}
            >
              {state.cells.map((cell, i) => {
                const isPlayer = state.player === i
                const isCrate = state.crates.has(i)
                const onG = cell === 'goal'
                return (
                  <div
                    key={`${level}-${i}`}
                    className={`sokoban-cell${cell === 'wall' ? ' is-wall' : ''}${cell === 'void' ? ' is-void' : ''}${onG ? ' is-goal' : ''}${isCrate ? ' is-crate' : ''}${isCrate && onG ? ' is-done' : ''}${isPlayer ? ' is-player' : ''}`}
                  >
                    {isPlayer ? '☺' : isCrate ? '▣' : onG ? '○' : ''}
                  </div>
                )
              })}
            </div>
          </BoardStage>
        )}
        <LevelCleared
          open={cleared}
          title={starText(stars)}
          subtitle={`Level ${level} cleared · ${moves} moves (par ${par})${best ? ' · New best!' : ''} · Score ${score}`}
          onNext={() => start(level + 1, true)}
          onReplay={backToMap}
          replayLabel="Levels"
        />
      </div>
    </GameShell>
  )
}
