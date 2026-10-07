import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { dirToDelta, useDirectionInput, type Dir } from '../../shared/useDirectionInput'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './snake.css'

const meta = getGame('snake')
const SIZE = 12
const START_LEN = 3

type Point = { r: number; c: number }

function keyOf(p: Point): string {
  return `${p.r},${p.c}`
}

function spawnFood(occupied: Set<string>): Point {
  const free: Point[] = []
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (!occupied.has(`${r},${c}`)) free.push({ r, c })
    }
  }
  return free[Math.floor(Math.random() * free.length)] ?? { r: 0, c: 0 }
}

function initialSnake(): Point[] {
  const mid = Math.floor(SIZE / 2)
  return Array.from({ length: START_LEN }, (_, i) => ({ r: mid, c: mid - i }))
}

export default function SnakeGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [snake, setSnake] = useState<Point[]>(() => initialSnake())
  const [food, setFood] = useState<Point>(() => {
    const s = initialSnake()
    return spawnFood(new Set(s.map(keyOf)))
  })
  const [dir, setDir] = useState<Dir>('right')
  const [score, setScore] = useState(0)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [eaten, setEaten] = useState(0)

  const dirRef = useRef(dir)
  const pendingDirRef = useRef<Dir>('right')
  const snakeRef = useRef(snake)
  const foodRef = useRef(food)
  const runningRef = useRef(running)
  const overRef = useRef(over)

  useEffect(() => {
    dirRef.current = dir
  }, [dir])
  useEffect(() => {
    snakeRef.current = snake
  }, [snake])
  useEffect(() => {
    foodRef.current = food
  }, [food])
  useEffect(() => {
    runningRef.current = running
  }, [running])
  useEffect(() => {
    overRef.current = over
  }, [over])

  function start() {
    void unlockAudio()
    const next = initialSnake()
    setSnake(next)
    setFood(spawnFood(new Set(next.map(keyOf))))
    setDir('right')
    pendingDirRef.current = 'right'
    setScore(0)
    setEaten(0)
    setRunning(true)
    setOver(false)
    sfx.ready()
  }

  function queueDir(next: Dir) {
    if (!runningRef.current || overRef.current) return
    const current = dirRef.current
    const opposite =
      (current === 'up' && next === 'down') ||
      (current === 'down' && next === 'up') ||
      (current === 'left' && next === 'right') ||
      (current === 'right' && next === 'left')
    if (opposite) return
    pendingDirRef.current = next
  }

  const { swipeHandlers } = useDirectionInput({
    enabled: running && !over,
    onDirection: queueDir,
  })

  useEffect(() => {
    if (!running || over) return
    const tickMs = Math.max(90, 170 - eaten * 4)
    const id = window.setInterval(() => {
      const nextDir = pendingDirRef.current
      setDir(nextDir)
      dirRef.current = nextDir

      const body = snakeRef.current
      const head = body[0]
      const { dr, dc } = dirToDelta(nextDir)
      const nextHead = { r: head.r + dr, c: head.c + dc }

      if (
        nextHead.r < 0 ||
        nextHead.r >= SIZE ||
        nextHead.c < 0 ||
        nextHead.c >= SIZE ||
        body.some((p) => p.r === nextHead.r && p.c === nextHead.c)
      ) {
        setOver(true)
        setRunning(false)
        sfx.lose()
        setScore((current) => {
          recordPlay('snake', current, current >= 80)
          return current
        })
        return
      }

      const ate = nextHead.r === foodRef.current.r && nextHead.c === foodRef.current.c
      const nextBody = [nextHead, ...body]
      if (!ate) nextBody.pop()
      else {
        const occupied = new Set(nextBody.map(keyOf))
        const nextFood = spawnFood(occupied)
        foodRef.current = nextFood
        setFood(nextFood)
        setEaten((n) => {
          const next = n + 1
          if (next % 5 === 0) levelUp()
          return next
        })
        setScore((s) => {
          const gained = 12 + Math.floor(eaten / 2) * 2
          burst(gained, Math.min(eaten + 1, 8))
          return s + gained
        })
        sfx.match()
      }

      snakeRef.current = nextBody
      setSnake(nextBody)
    }, tickMs)

    return () => window.clearInterval(id)
  }, [running, over, eaten, burst, levelUp, recordPlay])

  const cells = Array.from({ length: SIZE * SIZE }, (_, i) => {
    const r = Math.floor(i / SIZE)
    const c = i % SIZE
    const isHead = snake[0]?.r === r && snake[0]?.c === c
    const isBody = snake.some((p, idx) => idx > 0 && p.r === r && p.c === c)
    const isFood = food.r === r && food.c === c
    return { isHead, isBody, isFood }
  })

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Eaten', value: eaten },
        { label: 'Len', value: snake.length },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={start}>
            Restart
          </button>
        ) : undefined
      }
    >
      <div className="snake-board panel board-host" {...swipeHandlers}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over ? (
          <PlayIdle hint="Swipe or use arrows to steer." onPlay={start} />
        ) : (
          <BoardStage status={over ? 'Game over' : 'Keep moving'}>
            <div
              className="snake-grid"
              style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
              aria-label="Snake grid"
            >
              {cells.map((cell, i) => (
                <div
                  key={i}
                  className={`snake-cell${cell.isHead ? ' is-head is-snake' : cell.isBody ? ' is-snake' : ''}${cell.isFood ? ' is-food' : ''}`}
                />
              ))}
            </div>
            <p className="snake-hint">Swipe or arrow keys</p>
          </BoardStage>
        )}
        <ResultOverlay
          open={over}
          title="Run over"
          subtitle={`Score ${score} · ${eaten} apples`}
          celebrate={score >= 80}
          onPrimary={start}
          primaryLabel="Play again"
        />
      </div>
    </GameShell>
  )
}
