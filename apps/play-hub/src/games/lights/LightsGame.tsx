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
import { lightsLevel, toggle } from './levels'
import './lights.css'

const meta = getGame('lights')

/** 3★ in the minimum presses, 2★ within double, else 1★. */
function starsFor(moves: number, par: number): number {
  if (moves <= par) return 3
  if (moves <= par * 2 + 2) return 2
  return 1
}

const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

export default function LightsGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const record = useProgressStore((s) => s.levelProgress.lights)
  const nextLevel = (record?.cleared ?? 0) + 1
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [stage, setStage] = useState(1)
  const [board, setBoard] = useState<boolean[]>(() => lightsLevel(1).board)
  const [moves, setMoves] = useState(0)
  const [running, setRunning] = useState(false)
  const [won, setWon] = useState(false)
  const [stars, setStars] = useState(0)
  const [best, setBest] = useState(false)

  const level = useMemo(() => lightsLevel(stage), [stage])
  const { size, par } = level
  const lit = useMemo(() => board.filter(Boolean).length, [board])

  function start(lv: number) {
    void unlockAudio()
    setStage(lv)
    setBoard(lightsLevel(lv).board)
    setMoves(0)
    setWon(false)
    setRunning(true)
    sfx.ready()
  }

  function backToMap() {
    setRunning(false)
    setWon(false)
  }

  function press(index: number) {
    if (won || !running) return
    void unlockAudio()
    const next = toggle(board, index, size)
    setBoard(next)
    const finalMoves = moves + 1
    setMoves(finalMoves)
    sfx.move()
    if (next.every((on) => !on)) {
      setWon(true)
      sfx.win()
      const st = starsFor(finalMoves, par)
      const score = Math.max(900 - Math.max(0, finalMoves - par) * 20, 100) + stage * 40
      burst(score, stage)
      levelUp()
      setStars(st)
      setBest(useProgressStore.getState().completeLevel('lights', stage, st).improved)
      recordPlay('lights', score, true)
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
        { label: 'Lit', value: lit },
        { label: 'Lv', value: stage },
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
      <div className="lights-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!showBoard && (
          <div className="play-idle">
            <p className="muted play-idle__hint">Tap a light to flip it and its neighbours. Turn them all off in par for ★★★.</p>
            <LevelMap game="lights" onPick={(lv) => start(lv)} />
            <button type="button" className="btn btn-primary btn-play" onClick={() => start(nextLevel)}>
              Play · Level {nextLevel}
            </button>
          </div>
        )}
        {showBoard && (
          <BoardStage status={`Level ${stage} · ${size}×${size} · par ${par}`}>
            <div className={`lights-grid lights-grid--${size}`} style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
              {board.map((on, index) => (
                <button
                  key={index}
                  type="button"
                  className={`lights-cell${on ? ' is-on' : ''}`}
                  onClick={() => press(index)}
                  aria-label={on ? 'Light on' : 'Light off'}
                  disabled={won}
                />
              ))}
            </div>
          </BoardStage>
        )}
        <LevelCleared
          open={won}
          title={starText(stars)}
          subtitle={`All dark! Level ${stage} · ${moves} moves (par ${par})${best ? ' · New best!' : ''}`}
          onNext={() => start(stage + 1)}
          onReplay={backToMap}
          replayLabel="Levels"
        />
      </div>
    </GameShell>
  )
}
