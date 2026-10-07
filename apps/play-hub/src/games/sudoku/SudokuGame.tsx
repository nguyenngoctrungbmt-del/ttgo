import { useMemo, useState } from 'react'
import { getGame } from '../../data/games'
import LevelMap from '../../shared/action/LevelMap'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import LevelCleared from '../../shared/LevelCleared'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import { geoFor, sudokuLevel } from './levels'
import './sudoku.css'

const meta = getGame('sudoku')

type Board = number[] // 0 = empty

/** 3★ with no corrections, 2★ with a few, else 1★. */
function starsFor(moves: number, holes: number): number {
  if (moves <= holes) return 3
  if (moves <= holes + Math.ceil(holes * 0.25) + 1) return 2
  return 1
}

const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

export default function SudokuGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const record = useProgressStore((s) => s.levelProgress.sudoku)
  const nextLevel = (record?.cleared ?? 0) + 1
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [stage, setStage] = useState(1)
  const [board, setBoard] = useState<Board>(() => sudokuLevel(1).puzzle)
  const [selected, setSelected] = useState<number | null>(null)
  const [moves, setMoves] = useState(0)
  const [running, setRunning] = useState(false)
  const [won, setWon] = useState(false)
  const [stars, setStars] = useState(0)
  const [best, setBest] = useState(false)

  const lv = sudokuLevel(stage)
  const { size, boxR, boxC } = lv
  const geo = useMemo(() => geoFor(lv), [lv])
  const given = lv.puzzle.map((v) => v !== 0)
  const holes = lv.puzzle.filter((v) => !v).length

  const filled = useMemo(() => board.filter((v) => v !== 0).length, [board])
  const conflictSet = useMemo(() => {
    const set = new Set<number>()
    for (let i = 0; i < board.length; i += 1) {
      if (board[i] && geo.peers[i].some((p) => board[p] === board[i])) set.add(i)
    }
    return set
  }, [board, geo])

  function loadStage(next: number) {
    void unlockAudio()
    setStage(next)
    setBoard([...sudokuLevel(next).puzzle])
    setSelected(null)
    setMoves(0)
    setWon(false)
    setRunning(true)
    sfx.ready()
  }

  function backToMap() {
    setRunning(false)
    setWon(false)
  }

  function selectCell(index: number) {
    if (won || given[index]) return
    void unlockAudio()
    setSelected(index)
    sfx.tap()
  }

  function place(digit: number) {
    if (won || selected === null || given[selected]) return
    void unlockAudio()
    const next = [...board]
    const clearing = digit === 0 || next[selected] === digit
    next[selected] = clearing ? 0 : digit
    setBoard(next)
    const finalMoves = moves + 1
    setMoves(finalMoves)
    sfx.move()

    const complete = next.every((v, i) => v !== 0 && !geo.peers[i].some((p) => next[p] === v))
    if (complete) {
      setWon(true)
      setSelected(null)
      sfx.win()
      const st = starsFor(finalMoves, holes)
      const score = Math.max(800 - Math.max(0, finalMoves - holes) * 12, 120) + stage * 50
      burst(score, stage)
      levelUp()
      setStars(st)
      setBest(useProgressStore.getState().completeLevel('sudoku', stage, st).improved)
      recordPlay('sudoku', score, true)
    }
  }

  const showBoard = running || won

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Filled', value: `${filled}/${size * size}` },
        { label: 'Moves', value: `${moves}/${holes}` },
        { label: 'Lv', value: stage },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={backToMap}>
            Levels
          </button>
        ) : undefined
      }
    >
      <div className="sudoku-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!showBoard && (
          <div className="play-idle">
            <p className="muted play-idle__hint">Fill every row, column and box once. No corrections = ★★★.</p>
            <LevelMap game="sudoku" onPick={(n) => loadStage(n)} />
            <button type="button" className="btn btn-primary btn-play" onClick={() => loadStage(nextLevel)}>
              Play · Level {nextLevel}
            </button>
          </div>
        )}
        {showBoard && (
          <>
            <BoardStage status={`Level ${stage} · ${size}×${size}`}>
              <div
                className={`sudoku-grid sudoku-grid--${size}`}
                style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
                role="grid"
                aria-label={`${size} by ${size} sudoku`}
              >
                {board.map((value, index) => {
                  const r = Math.floor(index / size)
                  const c = index % size
                  const isGiven = given[index]
                  const isSelected = selected === index
                  const hasConflict = conflictSet.has(index)
                  return (
                    <button
                      key={index}
                      type="button"
                      role="gridcell"
                      className={[
                        'sudoku-cell',
                        isGiven ? 'is-given' : '',
                        isSelected ? 'is-selected' : '',
                        hasConflict ? 'is-conflict' : '',
                        c > 0 && c % boxC === 0 ? 'box-left' : '',
                        r > 0 && r % boxR === 0 ? 'box-top' : '',
                        c === size - 1 ? 'is-col-last' : '',
                        r === size - 1 ? 'is-row-last' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => selectCell(index)}
                      disabled={won || isGiven}
                      aria-label={
                        value
                          ? `Row ${r + 1} column ${c + 1}, ${value}`
                          : `Row ${r + 1} column ${c + 1}, empty`
                      }
                      aria-pressed={isSelected}
                    >
                      {value || ''}
                    </button>
                  )
                })}
              </div>
            </BoardStage>

            <div className={`sudoku-pad sudoku-pad--${size}`} role="group" aria-label="Number pad">
              {Array.from({ length: size }, (_, k) => k + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  className="sudoku-key"
                  disabled={won || selected === null}
                  onClick={() => place(n)}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                className="sudoku-key sudoku-key-clear"
                disabled={won || selected === null}
                onClick={() => place(0)}
                aria-label="Clear cell"
              >
                ✕
              </button>
            </div>
          </>
        )}

        <LevelCleared
          open={won}
          title={starText(stars)}
          subtitle={`Level ${stage} cleared · ${moves} moves (${holes} blanks)${best ? ' · New best!' : ''}`}
          onNext={() => loadStage(stage + 1)}
          onReplay={backToMap}
          replayLabel="Levels"
        />
      </div>
    </GameShell>
  )
}
