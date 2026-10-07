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
import { slideLevel, slideNeighbors } from './levels'
import './slide.css'

const meta = getGame('slide')

const isSolved = (board: number[]) => board.every((v, i) => v === (i + 1) % board.length)

/** Par is the optimal move count: 3★ within +30%, 2★ within 2.5×, else 1★. */
function starsFor(moves: number, par: number): number {
  if (moves <= Math.ceil(par * 1.3) + 2) return 3
  if (moves <= Math.ceil(par * 2.5) + 6) return 2
  return 1
}

const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

export default function SlideGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const record = useProgressStore((s) => s.levelProgress.slide)
  const nextLevel = (record?.cleared ?? 0) + 1
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [stage, setStage] = useState(1)
  const [board, setBoard] = useState<number[]>(() => slideLevel(1).tiles)
  const [moves, setMoves] = useState(0)
  const [running, setRunning] = useState(false)
  const [won, setWon] = useState(false)
  const [moving, setMoving] = useState<number | null>(null)
  const [stars, setStars] = useState(0)
  const [best, setBest] = useState(false)

  const { size, par } = useMemo(() => slideLevel(stage), [stage])
  const empty = useMemo(() => board.indexOf(0), [board])

  function start(lv: number) {
    void unlockAudio()
    setStage(lv)
    setBoard(slideLevel(lv).tiles)
    setMoves(0)
    setWon(false)
    setRunning(true)
    sfx.ready()
  }

  function backToMap() {
    setRunning(false)
    setWon(false)
  }

  function slide(index: number) {
    if (won || !running) return
    if (!slideNeighbors(empty, size).includes(index)) {
      sfx.miss()
      return
    }
    void unlockAudio()
    const next = [...board]
    ;[next[empty], next[index]] = [next[index], next[empty]]
    setMoving(index)
    window.setTimeout(() => setMoving(null), 180)
    setBoard(next)
    const finalMoves = moves + 1
    setMoves(finalMoves)
    sfx.move()

    if (isSolved(next)) {
      setWon(true)
      sfx.win()
      const st = starsFor(finalMoves, par)
      const score = Math.max(900 - Math.max(0, finalMoves - par) * 8, 80) + stage * 20
      burst(score, stage)
      levelUp()
      setStars(st)
      setBest(useProgressStore.getState().completeLevel('slide', stage, st).improved)
      recordPlay('slide', score, true)
    }
  }

  const showBoard = running || won

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Moves', value: `${moves}/${par}` },
        { label: 'Lv', value: stage },
        { label: 'Goal', value: size === 3 ? '1→8' : '1→15' },
      ]}
      actions={
        running ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => start(stage)}>
              Reset
            </button>
            <button type="button" className="btn btn-ghost" onClick={backToMap}>
              Levels
            </button>
          </>
        ) : undefined
      }
    >
      <div className="slide-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!showBoard && (
          <div className="play-idle">
            <p className="muted play-idle__hint">Slide tiles into order with the gap last. Stay near par for ★★★.</p>
            <LevelMap game="slide" onPick={(lv) => start(lv)} />
            <button type="button" className="btn btn-primary btn-play" onClick={() => start(nextLevel)}>
              Play · Level {nextLevel}
            </button>
          </div>
        )}
        {showBoard && (
          <BoardStage status={`Level ${stage} · par ${par}${moves > 0 ? ` · ${moves} moves` : ''}`}>
            <div className={`slide-grid slide-grid--${size}`} style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
              {board.map((value, index) => (
                <button
                  key={`${value}-${index}`}
                  type="button"
                  className={`slide-tile${value === 0 ? ' is-empty' : ''}${moving === index ? ' is-moving' : ''}`}
                  onClick={() => slide(index)}
                  disabled={value === 0 || won}
                  aria-label={value === 0 ? 'Empty' : `Tile ${value}`}
                >
                  {value || ''}
                </button>
              ))}
            </div>
          </BoardStage>
        )}

        <LevelCleared
          open={won}
          title={starText(stars)}
          subtitle={`Solved! Level ${stage} · ${moves} moves (par ${par})${best ? ' · New best!' : ''}`}
          onNext={() => start(stage + 1)}
          onReplay={backToMap}
          replayLabel="Levels"
        />
      </div>
    </GameShell>
  )
}
