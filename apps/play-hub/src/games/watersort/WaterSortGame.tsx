import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { getGame } from '../../data/games'
import LevelMap from '../../shared/action/LevelMap'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import LevelCleared from '../../shared/LevelCleared'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import { CAP, canPour, isSolved, makeLevel, pour, type Tube } from './levels'
import './watersort.css'

const meta = getGame('watersort')
const POUR_MS = 420

const PALETTE = ['#ef4444', '#f59e0b', '#10b981', '#0284c7', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

type PourFx = {
  from: number
  to: number
  color: string
  amount: number
}

/** 3★ at or under the solver's par, 2★ within +40%, else 1★. */
function starsFor(moves: number, par: number): number {
  if (moves <= par) return 3
  if (moves <= Math.ceil(par * 1.4) + 2) return 2
  return 1
}

const starText = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n)

export default function WaterSortGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const record = useProgressStore((s) => s.levelProgress.watersort)
  const nextLevel = (record?.cleared ?? 0) + 1
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [level, setLevel] = useState(1)
  const [tubes, setTubes] = useState<Tube[]>(() => makeLevel(1).tubes)
  const [selected, setSelected] = useState<number | null>(null)
  const [moves, setMoves] = useState(0)
  const [score, setScore] = useState(0)
  const [running, setRunning] = useState(false)
  const [cleared, setCleared] = useState(false)
  const [stars, setStars] = useState(0)
  const [best, setBest] = useState(false)
  const [history, setHistory] = useState<Tube[][]>([])
  const [pourFx, setPourFx] = useState<PourFx | null>(null)
  const [draining, setDraining] = useState<{ tube: number; slots: number[] } | null>(null)
  const [filling, setFilling] = useState<{ tube: number; slots: number[] } | null>(null)
  const pouringRef = useRef(false)
  const rackRef = useRef<HTMLDivElement>(null)
  const tubeRefs = useRef<(HTMLButtonElement | null)[]>([])

  const filledHint = useMemo(
    () => tubes.filter((t) => t.length === CAP && t.every((c) => c === t[0])).length,
    [tubes],
  )

  const par = makeLevel(level).par

  function start(lv: number, keepScore = false) {
    void unlockAudio()
    pouringRef.current = false
    setPourFx(null)
    setDraining(null)
    setFilling(null)
    setLevel(lv)
    setTubes(makeLevel(lv).tubes)
    setSelected(null)
    setMoves(0)
    setHistory([])
    if (!keepScore) setScore(0)
    setRunning(true)
    setCleared(false)
    sfx.ready()
  }

  function backToMap() {
    if (pouringRef.current) return
    setRunning(false)
    setCleared(false)
  }

  function streamStyle(from: number, to: number): CSSProperties | undefined {
    const a = tubeRefs.current[from]
    const b = tubeRefs.current[to]
    const rack = rackRef.current
    if (!a || !b || !rack) return undefined
    const ra = a.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    const rr = rack.getBoundingClientRect()
    const x1 = ra.left + ra.width / 2 - rr.left
    const y1 = ra.top + 10 - rr.top
    const x2 = rb.left + rb.width / 2 - rr.left
    const y2 = rb.top + 18 - rr.top
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    return {
      left: x1,
      top: y1,
      width: len,
      transform: `rotate(${angle}deg)`,
    }
  }

  function tapTube(index: number) {
    if (!running || cleared || pouringRef.current) return
    void unlockAudio()
    if (selected === null) {
      if (!tubes[index].length) {
        sfx.miss()
        return
      }
      setSelected(index)
      sfx.tick()
      return
    }
    if (selected === index) {
      setSelected(null)
      sfx.tick()
      return
    }
    const from = tubes[selected]
    const to = tubes[index]
    if (!canPour(from, to)) {
      if (tubes[index].length) {
        setSelected(index)
        sfx.tick()
      } else {
        sfx.miss()
      }
      return
    }

    const result = pour(from, to)
    const prevLen = to.length
    const drainSlots = Array.from({ length: result.moved }, (_, i) => from.length - 1 - i)
    const fillSlots = Array.from({ length: result.moved }, (_, i) => prevLen + i)
    const next = tubes.map((t, i) => {
      if (i === selected) return result.from
      if (i === index) return result.to
      return t
    })
    const fromIdx = selected
    const toIdx = index

    pouringRef.current = true
    setHistory((h) => [...h, tubes.map((t) => [...t])])
    setPourFx({
      from: fromIdx,
      to: toIdx,
      color: PALETTE[result.color % PALETTE.length],
      amount: result.moved,
    })
    setDraining({ tube: fromIdx, slots: drainSlots })
    setSelected(null)
    sfx.move()

    window.setTimeout(() => {
      setTubes(next)
      setPourFx(null)
      setDraining(null)
      setFilling({ tube: toIdx, slots: fillSlots })
      const nextMoves = moves + 1
      setMoves(nextMoves)

      window.setTimeout(() => {
        setFilling(null)
        pouringRef.current = false
        if (isSolved(next)) {
          sfx.win()
          const st = starsFor(nextMoves, par)
          const gained = Math.max(100 - Math.max(0, nextMoves - par) * 2, 30) + level * 12
          const nextScore = score + gained
          setScore(nextScore)
          burst(gained, level)
          levelUp()
          setStars(st)
          setBest(useProgressStore.getState().completeLevel('watersort', level, st).improved)
          setCleared(true)
          setRunning(false)
          recordPlay('watersort', nextScore, true)
        }
      }, 320)
    }, POUR_MS)
  }

  function undo() {
    if (!history.length || !running || cleared || pouringRef.current) return
    void unlockAudio()
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    setTubes(prev)
    setSelected(null)
    setMoves((m) => Math.max(0, m - 1))
    sfx.tick()
  }

  const stream = pourFx ? streamStyle(pourFx.from, pourFx.to) : undefined

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Lv', value: level },
        { label: 'Moves', value: `${moves}/${par}` },
        { label: 'Done', value: filledHint },
      ]}
      actions={
        running ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={undo} disabled={!history.length || !!pourFx}>
              Undo
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => start(level, true)} disabled={!!pourFx}>
              Reset
            </button>
            <button type="button" className="btn btn-ghost" onClick={backToMap} disabled={!!pourFx}>
              Levels
            </button>
          </>
        ) : undefined
      }
    >
      <div className="watersort-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !cleared && (
          <div className="play-idle">
            <p className="muted play-idle__hint">Pour colors until every tube is solid. Finish within par for ★★★.</p>
            <LevelMap game="watersort" onPick={(lv) => start(lv)} />
            <button type="button" className="btn btn-primary btn-play" onClick={() => start(nextLevel)}>
              Play · Level {nextLevel}
            </button>
          </div>
        )}
        {(running || cleared) && (
          <BoardStage status={`Level ${level} · par ${par}`}>
            <div className="watersort-rack" ref={rackRef}>
              {tubes.map((tube, i) => {
                const isSource = pourFx?.from === i
                const isTarget = pourFx?.to === i
                return (
                  <button
                    key={`${level}-${i}`}
                    ref={(el) => {
                      tubeRefs.current[i] = el
                    }}
                    type="button"
                    className={`watersort-tube${selected === i ? ' is-selected' : ''}${isSource ? ' is-pouring' : ''}${isTarget ? ' is-receiving' : ''}`}
                    onClick={() => tapTube(i)}
                    aria-label={`Tube ${i + 1}`}
                    disabled={!!pourFx}
                  >
                    <div className="watersort-glass">
                      {Array.from({ length: CAP }, (_, slot) => {
                        const colorIdx = tube[slot]
                        const isNew =
                          filling?.tube === i && filling.slots.includes(slot) && colorIdx !== undefined
                        const isDrain =
                          draining?.tube === i && draining.slots.includes(slot) && colorIdx !== undefined
                        return (
                          <div
                            key={slot}
                            className={`watersort-layer${isNew ? ' is-filling' : ''}${isDrain ? ' is-draining' : ''}`}
                            style={
                              colorIdx === undefined
                                ? undefined
                                : { background: PALETTE[colorIdx % PALETTE.length] }
                            }
                          />
                        )
                      })}
                    </div>
                  </button>
                )
              })}
              {pourFx && stream && (
                <div
                  className="watersort-stream"
                  style={{ ...stream, background: pourFx.color }}
                  aria-hidden
                />
              )}
            </div>
          </BoardStage>
        )}
        <LevelCleared
          open={cleared}
          title={starText(stars)}
          subtitle={`Level ${level} sorted · ${moves} moves (par ${par})${best ? ' · New best!' : ''} · Score ${score}`}
          onNext={() => start(level + 1, true)}
          onReplay={backToMap}
          replayLabel="Levels"
        />
      </div>
    </GameShell>
  )
}
