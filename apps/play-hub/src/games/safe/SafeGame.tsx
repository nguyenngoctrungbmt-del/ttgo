import { useMemo, useState } from 'react'
import { getGame } from '../../data/games'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import LevelCleared from '../../shared/LevelCleared'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './safe.css'

const meta = getGame('safe')

function neighbors(index: number, size: number): number[] {
  const r = Math.floor(index / size)
  const c = index % size
  const list: number[] = []
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) list.push(nr * size + nc)
    }
  }
  return list
}

function makeBoard(size: number, bombs: number) {
  const total = size * size
  const bombSet = new Set<number>()
  while (bombSet.size < bombs) bombSet.add(Math.floor(Math.random() * total))
  const counts = Array.from({ length: total }, (_, i) => {
    if (bombSet.has(i)) return -1
    return neighbors(i, size).filter((n) => bombSet.has(n)).length
  })
  return { bombs: bombSet, counts, size, bombCount: bombs }
}

export default function SafeGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [level, setLevel] = useState(1)
  const [board, setBoard] = useState(() => makeBoard(6, 6))
  const [open, setOpen] = useState<number[]>([])
  const [score, setScore] = useState(0)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [boom, setBoom] = useState<number | null>(null)

  const size = board.size
  const bombCount = board.bombCount
  const safeTotal = size * size - bombCount
  const remaining = useMemo(() => safeTotal - open.length, [open.length, safeTotal])

  function boardForLevel(lv: number) {
    const nextSize = lv < 3 ? 6 : lv < 5 ? 7 : 8
    const nextBombs = Math.min(Math.floor(nextSize * nextSize * 0.22), 4 + lv * 2)
    return makeBoard(nextSize, nextBombs)
  }

  function start(nextLevel = 1) {
    void unlockAudio()
    setLevel(nextLevel)
    setBoard(boardForLevel(nextLevel))
    setOpen([])
    if (nextLevel === 1) setScore(0)
    setRunning(true)
    setOver(false)
    setWon(false)
    setCleared(false)
    setBoom(null)
    sfx.ready()
  }

  function reveal(index: number) {
    if (!running || over || won || cleared || open.includes(index)) return
    void unlockAudio()
    if (board.bombs.has(index)) {
      sfx.lose()
      setBoom(index)
      setOver(true)
      setRunning(false)
      recordPlay('safe', score, false)
      return
    }

    sfx.tap()
    const next = new Set(open)
    const stack = [index]
    while (stack.length) {
      const cur = stack.pop()!
      if (next.has(cur) || board.bombs.has(cur)) continue
      next.add(cur)
      if (board.counts[cur] === 0) {
        for (const n of neighbors(cur, size)) {
          if (!next.has(n) && !board.bombs.has(n)) stack.push(n)
        }
      }
    }
    const opened = [...next]
    const gained = 8 * (opened.length - open.length) + level * 2
    setOpen(opened)
    const nextScore = score + gained
    setScore(nextScore)
    burst(gained, level)
    if (opened.length >= safeTotal) {
      sfx.win()
      const clearBonus = 40 + level * 10
      const finalScore = nextScore + clearBonus
      setScore(finalScore)
      burst(clearBonus, level + 2)
      levelUp()
      setCleared(true)
      setRunning(false)
      if (level >= 5) {
        setWon(true)
        recordPlay('safe', finalScore, true)
      }
    }
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Lv', value: level },
        { label: 'Safe left', value: Math.max(remaining, 0) },
        { label: 'Bombs', value: bombCount },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={() => start(1)}>
            Restart
          </button>
        ) : undefined
      }
    >
      <div className="safe-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && !won && !cleared && (
          <PlayIdle hint="Reveal safe tiles. Avoid the bombs." onPlay={() => start(1)} />
        )}
        {(running || over || won || cleared) && (
          <BoardStage status={`Level ${level}`}>
            <div
              className="safe-grid"
              style={{
                gridTemplateColumns: `repeat(${size}, 1fr)`,
                width: `min(100%, ${size <= 6 ? 520 : size === 7 ? 560 : 600}px)`,
              }}
            >
              {board.counts.map((count, index) => {
                const isOpen = open.includes(index) || boom === index
                const isBomb = board.bombs.has(index) && (over || won)
                return (
                  <button
                    key={`${size}-${index}`}
                    type="button"
                    className={`safe-cell${isOpen ? ' is-open' : ''}${boom === index ? ' is-boom' : ''}`}
                    onClick={() => reveal(index)}
                    disabled={!running || isOpen}
                  >
                    {boom === index || (isBomb && isOpen)
                      ? '💣'
                      : isOpen
                        ? count > 0
                          ? count
                          : ''
                        : ''}
                  </button>
                )
              })}
            </div>
          </BoardStage>
        )}
        <LevelCleared
          open={cleared}
          title={won ? 'All clear!' : 'Level completed!'}
          subtitle={`Score ${score} · Level ${level}`}
          onNext={won ? undefined : () => start(level + 1)}
          onReplay={() => start(1)}
        />
        {over && !cleared && (
          <div className="overlay">
            <div className="overlay-card panel">
              <h2>Boom!</h2>
              <p>
                Score {score} · Level {level}
              </p>
              <div className="overlay-actions">
                <button type="button" className="btn btn-primary" onClick={() => start(1)}>
                  Play again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  )
}
