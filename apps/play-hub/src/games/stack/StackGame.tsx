import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './stack.css'

const meta = getGame('stack')
const ARENA = 100
const BLOCK_H = 22
const BASE_WIDTH = 62
/** % from stage top — sliding block lane. */
const MOVE_TOP = 10
/** Matches .stack-tower padding-bottom. */
const PAD_BOTTOM = 12
/**
 * Grow from the floor for this many successful drops, then lock that
 * fall gap forever and scroll the tower down as height increases.
 */
const LOCK_AFTER_DROPS = 2
const FALL_MS = 420
const SETTLE_MS = 300
const MISS_MS = 550
const COLORS = ['#EA580C', '#F59E0B', '#EF4444', '#DB2777', '#8B5CF6', '#2563EB'] as const

type Layer = { left: number; width: number; color: string; id: number }

type DropPhase = 'idle' | 'falling' | 'miss'

let layerSeq = 1

export default function StackGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [layers, setLayers] = useState<Layer[]>([
    { left: (ARENA - BASE_WIDTH) / 2, width: BASE_WIDTH, color: COLORS[0], id: layerSeq++ },
  ])
  const [mover, setMover] = useState({ left: 0, width: BASE_WIDTH, dir: 1, top: MOVE_TOP })
  const [score, setScore] = useState(0)
  const [height, setHeight] = useState(0)
  const [combo, setCombo] = useState(0)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [phase, setPhase] = useState<DropPhase>('idle')
  const [landingId, setLandingId] = useState<number | null>(null)
  /** Pushes tower down once the fall gap is locked after LOCK_AFTER_DROPS. */
  const [cameraY, setCameraY] = useState(0)
  /** Extra offset during post-land settle (usually -BLOCK_H → 0). */
  const [settleY, setSettleY] = useState(0)

  const moverRef = useRef(mover)
  const layersRef = useRef(layers)
  const phaseRef = useRef<DropPhase>('idle')
  const heightRef = useRef(0)
  const comboRef = useRef(0)
  const cameraRef = useRef(0)
  const settlingRef = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)

  function stageHeight(): number {
    return stageRef.current?.clientHeight || 400
  }

  /** Layers on the floor before camera lock (base + LOCK_AFTER_DROPS). */
  function lockLayerCount(): number {
    return 1 + LOCK_AFTER_DROPS
  }

  /** Top face of the tower in px (0 = top of stage), camera 0. */
  function naturalStackTopPx(layerCount: number): number {
    const stageH = stageHeight()
    const padPx = (PAD_BOTTOM / 100) * stageH
    return stageH - padPx - layerCount * BLOCK_H
  }

  /**
   * After LOCK_AFTER_DROPS, keep the tower top at the same screen Y
   * it had right after those drops — fall distance stays constant.
   */
  function cameraFor(layerCount: number): number {
    const lockAt = lockLayerCount()
    if (layerCount <= lockAt) return 0
    return naturalStackTopPx(lockAt) - naturalStackTopPx(layerCount)
  }

  function stackTopPx(layerCount: number, cameraPx: number): number {
    return naturalStackTopPx(layerCount) + cameraPx
  }

  /** Where the falling block's top edge should land. */
  function landTopPercent(layerCount: number, cameraPx: number): number {
    return ((stackTopPx(layerCount, cameraPx) - BLOCK_H) / stageHeight()) * 100
  }

  useEffect(() => {
    moverRef.current = mover
  }, [mover])
  useEffect(() => {
    layersRef.current = layers
  }, [layers])
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  useEffect(() => {
    heightRef.current = height
  }, [height])
  useEffect(() => {
    cameraRef.current = cameraY
  }, [cameraY])

  function start() {
    void unlockAudio()
    const base: Layer = {
      left: (ARENA - BASE_WIDTH) / 2,
      width: BASE_WIDTH,
      color: COLORS[0],
      id: layerSeq++,
    }
    setLayers([base])
    setMover({ left: 0, width: BASE_WIDTH, dir: 1, top: MOVE_TOP })
    setScore(0)
    setHeight(0)
    setCombo(0)
    comboRef.current = 0
    setCameraY(0)
    cameraRef.current = 0
    setSettleY(0)
    settlingRef.current = false
    setPhase('idle')
    setLandingId(null)
    setRunning(true)
    setOver(false)
    sfx.ready()
  }

  useEffect(() => {
    if (!running || over || phase !== 'idle') return
    const speed = Math.min(0.55 + height * 0.045, 1.35)
    const id = window.setInterval(() => {
      setMover((m) => {
        let left = m.left + m.dir * speed
        let dir = m.dir
        if (left <= 0) {
          left = 0
          dir = 1
        } else if (left + m.width >= ARENA) {
          left = ARENA - m.width
          dir = -1
        }
        const next = { ...m, left, dir, top: MOVE_TOP }
        moverRef.current = next
        return next
      })
    }, 16)
    return () => window.clearInterval(id)
  }, [running, over, height, phase])

  function drop() {
    if (!running || over || phaseRef.current !== 'idle' || settlingRef.current) return
    void unlockAudio()

    const top = layersRef.current[layersRef.current.length - 1]
    const m = moverRef.current
    const overlapLeft = Math.max(top.left, m.left)
    const overlapRight = Math.min(top.left + top.width, m.left + m.width)
    const overlap = overlapRight - overlapLeft
    const targetTop = landTopPercent(layersRef.current.length, cameraRef.current)

    if (overlap <= 2) {
      setPhase('miss')
      sfx.miss()
      requestAnimationFrame(() => {
        setMover((cur) => {
          const next = { ...cur, top: 110 }
          moverRef.current = next
          return next
        })
      })
      window.setTimeout(() => {
        setOver(true)
        setRunning(false)
        setPhase('idle')
        sfx.lose()
        setScore((current) => {
          recordPlay('stack', current, current >= 80)
          return current
        })
      }, MISS_MS)
      return
    }

    const perfect = Math.abs(overlap - top.width) < 1.2 && Math.abs(m.left - top.left) < 1.2
    const nextWidth = perfect ? top.width : overlap
    const nextLeft = perfect ? top.left : overlapLeft
    const nextHeight = heightRef.current + 1
    const color = COLORS[nextHeight % COLORS.length]

    setPhase('falling')
    sfx.tap()

    setMover((cur) => {
      const next = { ...cur, left: nextLeft, width: nextWidth, top: MOVE_TOP }
      moverRef.current = next
      return next
    })

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMover((cur) => {
          const next = { ...cur, top: targetTop }
          moverRef.current = next
          return next
        })
      })
    })

    window.setTimeout(() => {
      const id = layerSeq++
      const nextLayer: Layer = { left: nextLeft, width: nextWidth, color, id }
      const nextCount = layersRef.current.length + 1
      const nextCamera = cameraFor(nextCount)
      const prevCamera = cameraRef.current

      settlingRef.current = true
      // When camera steps up, park the new top where it landed, then ease down.
      if (nextCamera > prevCamera) {
        setSettleY(-(nextCamera - prevCamera))
      } else {
        setSettleY(0)
      }

      setLayers((prev) => [...prev, nextLayer])
      setCameraY(nextCamera)
      cameraRef.current = nextCamera
      setLandingId(id)
      setHeight(nextHeight)
      heightRef.current = nextHeight

      const nextCombo = perfect ? comboRef.current + 1 : 0
      setCombo(nextCombo)
      comboRef.current = nextCombo

      const gained = 10 + nextHeight * 2 + nextCombo * 6
      setScore((s) => s + gained)
      burst(gained, Math.min(nextCombo || 1, 8))
      if (perfect) sfx.win()
      else sfx.match()
      if (nextHeight % 5 === 0) levelUp()

      setMover({
        left: nextHeight % 2 === 0 ? 0 : ARENA - nextWidth,
        width: nextWidth,
        dir: nextHeight % 2 === 0 ? 1 : -1,
        top: MOVE_TOP,
      })
      setPhase('idle')

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSettleY(0)
        })
      })

      window.setTimeout(() => {
        settlingRef.current = false
        setLandingId(null)
      }, SETTLE_MS)
    }, FALL_MS)
  }

  const visibleCount = Math.max(10, Math.ceil(stageHeight() / BLOCK_H) + 2)
  const visible = layers.slice(-visibleCount)
  const showMover = running && (!over || phase === 'miss')

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Height', value: height },
        { label: 'Combo', value: combo },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={start}>
            Restart
          </button>
        ) : undefined
      }
    >
      <div className="stack-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over ? (
          <PlayIdle hint="Tap to drop the sliding block." onPlay={start} />
        ) : (
          <BoardStage status={over ? 'Tower fell' : `Floor ${height}`}>
            <div
              ref={stageRef}
              className={`stack-stage${phase !== 'idle' ? ' is-busy' : ''}`}
              role="button"
              tabIndex={0}
              aria-label="Tap to drop block"
              onClick={drop}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  drop()
                }
              }}
            >
              {combo > 1 ? <div className="stack-combo">PERFECT ×{combo}</div> : null}
              <div
                className={`stack-tower${settleY !== 0 ? ' is-pre-settle' : ''}`}
                style={{ transform: `translateY(${cameraY + settleY}px)` }}
              >
                {visible.map((layer) => (
                  <div
                    key={layer.id}
                    className={`stack-block${landingId === layer.id ? ' is-landing' : ''}`}
                    style={{
                      width: `${layer.width}%`,
                      marginLeft: `${layer.left}%`,
                      marginRight: `${ARENA - layer.left - layer.width}%`,
                      background: `linear-gradient(180deg, ${layer.color}, color-mix(in srgb, ${layer.color} 70%, #000))`,
                      height: BLOCK_H,
                    }}
                  />
                ))}
              </div>
              {showMover ? (
                <div
                  className={`stack-block is-moving${phase === 'falling' ? ' is-falling' : ''}${phase === 'miss' ? ' is-miss' : ''}`}
                  style={{
                    width: `${mover.width}%`,
                    left: `${mover.left}%`,
                    top: `${mover.top}%`,
                    background: `linear-gradient(180deg, ${COLORS[(height + 1) % COLORS.length]}, color-mix(in srgb, ${COLORS[(height + 1) % COLORS.length]} 70%, #000))`,
                  }}
                />
              ) : null}
            </div>
            <p className="stack-hint">Tap anywhere to drop</p>
          </BoardStage>
        )}
        <ResultOverlay
          open={over}
          title="Tower toppled"
          subtitle={`Score ${score} · height ${height}`}
          celebrate={score >= 80}
          onPrimary={start}
          primaryLabel="Play again"
        />
      </div>
    </GameShell>
  )
}
