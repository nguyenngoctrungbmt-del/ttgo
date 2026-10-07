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
import { puzzleAt } from './levels'
import './nonogram.css'

const meta = getGame('nonogram')
const MAX_MISS = 5

type CellMark = 0 | 1 | 2 // empty | fill | x

function runs(line: number[]): number[] {
  const out: number[] = []
  let n = 0
  for (const v of line) {
    if (v) n += 1
    else if (n) {
      out.push(n)
      n = 0
    }
  }
  if (n) out.push(n)
  return out.length ? out : [0]
}

function solutionFor(level: number): number[][] {
  return puzzleAt(level).rows.map((r) => [...r].map((ch) => (ch === '#' ? 1 : 0)))
}

function cluesFor(solution: number[][]) {
  const size = solution.length
  const rows = solution.map((row) => runs(row))
  const cols: number[][] = []
  for (let c = 0; c < size; c += 1) {
    cols.push(runs(solution.map((row) => row[c])))
  }
  return { rows, cols }
}

/** Stars by mistakes: flawless 3★, up to 2 misses 2★, otherwise 1★. */
const starsFor = (mistakes: number) => (mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1)
const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

export default function NonogramGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const record = useProgressStore((s) => s.levelProgress.nonogram)
  const nextLevel = (record?.cleared ?? 0) + 1
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [level, setLevel] = useState(1)
  const [marks, setMarks] = useState<CellMark[]>([])
  const [mode, setMode] = useState<'fill' | 'mark'>('fill')
  const [mistakes, setMistakes] = useState(0)
  const [score, setScore] = useState(0)
  const [running, setRunning] = useState(false)
  const [failed, setFailed] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [stars, setStars] = useState(0)
  const [best, setBest] = useState(false)

  const solution = useMemo(() => solutionFor(level), [level])
  const name = puzzleAt(level).name
  const size = solution.length
  const clues = useMemo(() => cluesFor(solution), [solution])

  const progress = useMemo(() => {
    if (!marks.length) return 0
    let ok = 0
    let need = 0
    for (let i = 0; i < size * size; i += 1) {
      const r = Math.floor(i / size)
      const c = i % size
      if (solution[r][c] === 1) {
        need += 1
        if (marks[i] === 1) ok += 1
      }
    }
    return need ? Math.round((ok / need) * 100) : 0
  }, [marks, solution, size])

  function start(lv: number, keepScore = false) {
    void unlockAudio()
    const n = puzzleAt(lv).rows.length
    setLevel(lv)
    setMarks(Array.from({ length: n * n }, () => 0))
    setMode('fill')
    setMistakes(0)
    if (!keepScore) setScore(0)
    setRunning(true)
    setFailed(false)
    setCleared(false)
    sfx.ready()
  }

  function backToMap() {
    setRunning(false)
    setFailed(false)
    setCleared(false)
  }

  function isComplete(next: CellMark[]): boolean {
    for (let i = 0; i < size * size; i += 1) {
      const r = Math.floor(i / size)
      const c = i % size
      const want = solution[r][c] === 1
      if (want && next[i] !== 1) return false
      if (!want && next[i] === 1) return false
    }
    return true
  }

  function tap(index: number) {
    if (!running || cleared) return
    void unlockAudio()
    const r = Math.floor(index / size)
    const c = index % size
    const wantFill = solution[r][c] === 1
    const next = [...marks]

    if (mode === 'mark') {
      const cur = next[index]
      next[index] = cur === 2 ? 0 : 2
      setMarks(next)
      sfx.tick()
      return
    }

    // fill mode: toggle fill; wrong fill counts as mistake
    if (next[index] === 1 || next[index] === 2) {
      next[index] = 0
      setMarks(next)
      sfx.tick()
      return
    }

    if (!wantFill) {
      sfx.miss()
      next[index] = 2
      setMarks(next)
      const nextMistakes = mistakes + 1
      setMistakes(nextMistakes)
      if (nextMistakes >= MAX_MISS) {
        setRunning(false)
        setFailed(true)
        recordPlay('nonogram', score, false)
        sfx.lose()
      }
      return
    }

    next[index] = 1
    setMarks(next)
    sfx.tap()

    if (isComplete(next)) {
      sfx.win()
      const st = starsFor(mistakes)
      const gained = Math.max(160 - mistakes * 15, 60) + level * 30
      const nextScore = score + gained
      setScore(nextScore)
      burst(gained, level)
      levelUp()
      setStars(st)
      setBest(useProgressStore.getState().completeLevel('nonogram', level, st).improved)
      setCleared(true)
      setRunning(false)
      recordPlay('nonogram', nextScore, true)
    }
  }

  const showBoard = running || cleared || failed

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Lv', value: level },
        { label: 'Done', value: `${progress}%` },
        { label: 'Miss', value: `${mistakes}/${MAX_MISS}` },
      ]}
      actions={
        running ? (
          <>
            <button
              type="button"
              className={`btn btn-ghost${mode === 'mark' ? ' is-active-mode' : ''}`}
              onClick={() => setMode((m) => (m === 'fill' ? 'mark' : 'fill'))}
            >
              {mode === 'fill' ? 'Mark X' : 'Fill'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={backToMap}>
              Levels
            </button>
          </>
        ) : undefined
      }
    >
      <div className="nonogram-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!showBoard && (
          <div className="play-idle">
            <p className="muted play-idle__hint">Use the number clues to paint the picture. No misses = ★★★.</p>
            <LevelMap game="nonogram" onPick={(lv) => start(lv)} />
            <button type="button" className="btn btn-primary btn-play" onClick={() => start(nextLevel)}>
              Play · Level {nextLevel}
            </button>
          </div>
        )}
        {showBoard && (
          <BoardStage status={`Level ${level} · ${size}×${size}${cleared ? ` · ${name}` : ''}`}>
            <div className="nonogram-wrap">
              <div
                className={`nonogram-grid${cleared ? ' is-solved' : ''}`}
                style={{
                  gridTemplateColumns: `auto repeat(${size}, 1fr)`,
                  gridTemplateRows: `auto repeat(${size}, 1fr)`,
                  width: `min(100%, ${Math.min(size * 36 + 72, 560)}px)`,
                }}
              >
                <div className="nonogram-corner" />
                {clues.cols.map((col, i) => (
                  <div key={`c-${i}`} className="nonogram-clue nonogram-clue--col">
                    {col.map((n, j) => (
                      <span key={j}>{n}</span>
                    ))}
                  </div>
                ))}
                {Array.from({ length: size }, (_, r) => [
                  <div key={`r-${r}`} className="nonogram-clue nonogram-clue--row">
                    {clues.rows[r].map((n, j) => (
                      <span key={j}>{n}</span>
                    ))}
                  </div>,
                  ...Array.from({ length: size }, (_, c) => {
                    const i = r * size + c
                    const mark = marks[i] ?? 0
                    return (
                      <button
                        key={`${level}-${i}`}
                        type="button"
                        className={`nonogram-cell${mark === 1 ? ' is-fill' : ''}${mark === 2 ? ' is-x' : ''}`}
                        onClick={() => tap(i)}
                        disabled={!running || cleared}
                        aria-label={`Cell ${r + 1},${c + 1}`}
                      >
                        {mark === 2 ? '×' : ''}
                      </button>
                    )
                  }),
                ])}
              </div>
            </div>
          </BoardStage>
        )}
        <LevelCleared
          open={cleared}
          title={starText(stars)}
          subtitle={`${name}! Level ${level} · ${mistakes} ${mistakes === 1 ? 'miss' : 'misses'}${best ? ' · New best!' : ''} · Score ${score}`}
          onNext={() => start(level + 1, true)}
          onReplay={backToMap}
          replayLabel="Levels"
        />
        {failed && !cleared && (
          <div className="overlay">
            <div className="overlay-card panel">
              <h2>Too many misses</h2>
              <p>Level {level} · Score {score}</p>
              <div className="overlay-actions">
                <button type="button" className="btn btn-ghost" onClick={backToMap}>
                  Levels
                </button>
                <button type="button" className="btn btn-primary" onClick={() => start(level)}>
                  Retry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  )
}
