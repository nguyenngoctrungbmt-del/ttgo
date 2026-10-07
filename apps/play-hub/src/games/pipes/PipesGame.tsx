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
import { boardFromMap, E, flows, mapAt, N, openings, parFor, S, W, type Cell, type Mask } from './levels'
import './pipes.css'

const meta = getGame('pipes')

function PipeArt({
  mask,
  kind,
  lit,
}: {
  mask: Mask
  kind: Cell['kind']
  lit: boolean
}) {
  const t = 26
  const half = t / 2
  return (
    <svg
      className={`pipes-art${lit ? ' is-flow' : ''}`}
      viewBox="0 0 100 100"
      aria-hidden
    >
      <g className="pipes-art__body">
        {!!(mask & N) && (
          <rect className="pipe-arm" x={50 - half} y={0} width={t} height={58} rx={half} />
        )}
        {!!(mask & S) && (
          <rect className="pipe-arm" x={50 - half} y={42} width={t} height={58} rx={half} />
        )}
        {!!(mask & W) && (
          <rect className="pipe-arm" x={0} y={50 - half} width={58} height={t} rx={half} />
        )}
        {!!(mask & E) && (
          <rect className="pipe-arm" x={42} y={50 - half} width={58} height={t} rx={half} />
        )}
        <circle className="pipe-hub" cx={50} cy={50} r={18} />
        {!!(mask & N) && (
          <rect className="pipe-shine" x={50 - 5} y={6} width={5} height={40} rx={2.5} />
        )}
        {!!(mask & S) && (
          <rect className="pipe-shine" x={50 - 5} y={54} width={5} height={40} rx={2.5} />
        )}
        {!!(mask & W) && (
          <rect className="pipe-shine" x={6} y={50 - 5} width={40} height={5} rx={2.5} />
        )}
        {!!(mask & E) && (
          <rect className="pipe-shine" x={54} y={50 - 5} width={40} height={5} rx={2.5} />
        )}
      </g>
      {kind === 'start' && <path className="pipe-mark" d="M42 38 L66 50 L42 62 Z" />}
      {kind === 'end' && <circle className="pipe-mark pipe-mark--end" cx={50} cy={50} r={9} />}
    </svg>
  )
}

/** 3★ at most 2 taps over par, 2★ within +50%, else 1★. */
function starsFor(taps: number, par: number): number {
  if (taps <= par + 2) return 3
  if (taps <= Math.ceil(par * 1.5) + 4) return 2
  return 1
}

const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)
const seedFor = (level: number) => level * 101

export default function PipesGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const record = useProgressStore((s) => s.levelProgress.pipes)
  const nextLevel = (record?.cleared ?? 0) + 1
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [level, setLevel] = useState(1)
  const [board, setBoard] = useState(() => boardFromMap(mapAt(1), seedFor(1)))
  const [rotates, setRotates] = useState(0)
  const [score, setScore] = useState(0)
  const [running, setRunning] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [stars, setStars] = useState(0)
  const [best, setBest] = useState(false)

  const size = board.size
  const map = useMemo(() => mapAt(level), [level])
  const par = useMemo(() => parFor(boardFromMap(map, seedFor(level)), map), [map, level])
  const lit = useMemo(() => flows(board.cells, size, board.start), [board, size])
  const connected = lit.has(board.end)

  function startAt(lv: number, keepScore = false) {
    void unlockAudio()
    setLevel(lv)
    setBoard(boardFromMap(mapAt(lv), seedFor(lv)))
    setRotates(0)
    if (!keepScore) setScore(0)
    setRunning(true)
    setCleared(false)
    sfx.ready()
  }

  function backToMap() {
    setRunning(false)
    setCleared(false)
  }

  function reset() {
    if (!running || cleared) return
    void unlockAudio()
    setBoard(boardFromMap(map, seedFor(level)))
    setRotates(0)
    sfx.ready()
  }

  function rotateCell(index: number) {
    if (!running || cleared) return
    void unlockAudio()
    const nextCells = board.cells.map((c, i) => (i === index ? { ...c, rot: (c.rot + 1) % 4 } : c))
    const nextBoard = { ...board, cells: nextCells }
    setBoard(nextBoard)
    const nextRotates = rotates + 1
    setRotates(nextRotates)
    sfx.tap()

    const nextLit = flows(nextCells, size, board.start)
    if (nextLit.has(board.end)) {
      sfx.win()
      const st = starsFor(nextRotates, par)
      const gained = Math.max(140 - Math.max(0, nextRotates - par) * 3, 50) + size * 20 + level * 8
      const nextScore = score + gained
      setScore(nextScore)
      burst(gained, level)
      levelUp()
      setStars(st)
      setBest(useProgressStore.getState().completeLevel('pipes', level, st).improved)
      setCleared(true)
      setRunning(false)
      recordPlay('pipes', nextScore, true)
    }
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
        { label: 'Taps', value: `${rotates}/${par}` },
        { label: 'Flow', value: connected ? 'OK' : '…' },
      ]}
      actions={
        running ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={reset}>
              Reset
            </button>
            <button type="button" className="btn btn-ghost" onClick={backToMap}>
              Levels
            </button>
          </>
        ) : undefined
      }
    >
      <div className="pipes-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!showBoard && (
          <div className="play-idle">
            <p className="muted play-idle__hint">Rotate pipes so water reaches the end valve. Finish near par for ★★★.</p>
            <LevelMap game="pipes" onPick={(lv) => startAt(lv)} />
            <button type="button" className="btn btn-primary btn-play" onClick={() => startAt(nextLevel)}>
              Play · Level {nextLevel}
            </button>
          </div>
        )}
        {showBoard && (
          <BoardStage status={`Level ${level} · ${map.name} · ${size}×${size}`}>
            <div
              className="pipes-grid"
              style={{
                gridTemplateColumns: `repeat(${size}, 1fr)`,
                width: `min(100%, ${Math.min(size * 56, 520)}px)`,
              }}
            >
              {board.cells.map((cell, i) => {
                const m = openings(cell)
                const isLit = lit.has(i)
                return (
                  <button
                    key={`${level}-${i}-${cell.rot}`}
                    type="button"
                    className={`pipes-cell${isLit ? ' is-lit' : ''}${cell.kind === 'start' ? ' is-start' : ''}${cell.kind === 'end' ? ' is-end' : ''}`}
                    onClick={() => rotateCell(i)}
                    disabled={!running || cleared}
                    aria-label={
                      cell.kind === 'start'
                        ? 'Start valve — rotate'
                        : cell.kind === 'end'
                          ? 'End valve — rotate'
                          : 'Rotate pipe'
                    }
                  >
                    <PipeArt mask={m} kind={cell.kind} lit={isLit} />
                  </button>
                )
              })}
            </div>
          </BoardStage>
        )}
        <LevelCleared
          open={cleared}
          title={starText(stars)}
          subtitle={`${map.name} cleared · ${rotates} taps (par ${par})${best ? ' · New best!' : ''} · Score ${score}`}
          onNext={() => startAt(level + 1, true)}
          onReplay={backToMap}
          replayLabel="Levels"
        />
      </div>
    </GameShell>
  )
}
