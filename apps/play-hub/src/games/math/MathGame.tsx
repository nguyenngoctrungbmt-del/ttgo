import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import { roundLimit, streakScore } from '../../shared/difficulty'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './math.css'

const meta = getGame('math')

type Question = {
  prompt: string
  answer: number
  choices: number[]
}

function makeQuestion(level: number): Question {
  const max = 8 + level * 3
  const a = 1 + Math.floor(Math.random() * max)
  const b = 1 + Math.floor(Math.random() * max)
  const ops = level < 4 ? (['+', '-'] as const) : (['+', '-', '×'] as const)
  const op = ops[Math.floor(Math.random() * ops.length)]
  let answer = 0
  let prompt = ''
  if (op === '+') {
    answer = a + b
    prompt = `${a} + ${b}`
  } else if (op === '-') {
    const hi = Math.max(a, b)
    const lo = Math.min(a, b)
    answer = hi - lo
    prompt = `${hi} − ${lo}`
  } else {
    const x = 2 + Math.floor(Math.random() * 9)
    const y = 2 + Math.floor(Math.random() * 9)
    answer = x * y
    prompt = `${x} × ${y}`
  }

  const choices = new Set<number>([answer])
  while (choices.size < 4) {
    const delta = Math.floor(Math.random() * 11) - 5
    const fake = Math.max(0, answer + (delta === 0 ? 3 : delta))
    choices.add(fake)
  }

  return {
    prompt,
    answer,
    choices: [...choices].sort(() => Math.random() - 0.5),
  }
}

export default function MathGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [q, setQ] = useState<Question>(() => makeQuestion(1))
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [timeLeft, setTimeLeft] = useState(5)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const scoreRef = useRef(0)
  const roundId = useRef(0)
  const limitRef = useRef(5)

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    if (!running || over) return
    const current = roundId.current
    const limit = limitRef.current
    setTimeLeft(limit)
    const started = Date.now()
    const id = window.setInterval(() => {
      if (roundId.current !== current) {
        window.clearInterval(id)
        return
      }
      const left = Math.max(0, limit - (Date.now() - started) / 1000)
      setTimeLeft(Number(left.toFixed(1)))
      if (left <= 0) {
        window.clearInterval(id)
        fail()
      }
    }, 50)
    return () => window.clearInterval(id)
  }, [running, over, q.prompt])

  function bump(next: Question) {
    roundId.current += 1
    setQ(next)
  }

  function start() {
    void unlockAudio()
    setScore(0)
    scoreRef.current = 0
    setStreak(0)
    setLives(3)
    setLevel(1)
    limitRef.current = 5
    setOver(false)
    setRunning(true)
    setFlash(null)
    bump(makeQuestion(1))
    sfx.ready()
  }

  function fail() {
    sfx.miss()
    setFlash('bad')
    setStreak(0)
    setLives((l) => {
      const next = l - 1
      if (next <= 0) {
        setOver(true)
        setRunning(false)
        sfx.lose()
        recordPlay('math', scoreRef.current, scoreRef.current >= 80)
      } else {
        window.setTimeout(() => {
          setFlash(null)
          bump(makeQuestion(level))
        }, 280)
      }
      return next
    })
  }

  function pick(value: number) {
    if (!running || over) return
    void unlockAudio()
    if (value === q.answer) {
      sfx.match()
      setFlash('ok')
      const nextStreak = streak + 1
      const gained = streakScore(10, streak, { cap: 8, per: 2 })
      setStreak(nextStreak)
      setScore((s) => {
        const next = s + gained
        scoreRef.current = next
        return next
      })
      burst(gained, nextStreak)
      const nextLevel = level + 1
      setLevel(nextLevel)
      limitRef.current = roundLimit(5, nextLevel, 2.2, 0.12)
      if (nextLevel % 5 === 0) levelUp()
      window.setTimeout(() => {
        setFlash(null)
        bump(makeQuestion(nextLevel))
      }, 220)
    } else {
      fail()
    }
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Streak', value: streak },
        { label: 'Lv', value: level },
        { label: 'Lives', value: lives },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={start}>
            Restart
          </button>
        ) : undefined
      }
    >
      <div className={`math-board panel${flash ? ` is-${flash}` : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Start to solve quick equations." onPlay={start} />
        )}
        {running && (
          <>
            <div className="progress-bar">
              <span style={{ width: `${(timeLeft / limitRef.current) * 100}%` }} />
            </div>
            <div className="math-prompt">{q.prompt} = ?</div>
            <div className="math-choices">
              {q.choices.map((choice) => (
                <button key={choice} type="button" className="math-choice" onClick={() => pick(choice)}>
                  {choice}
                </button>
              ))}
            </div>
          </>
        )}
        {over && (
          <div className="overlay">
            <div className="overlay-card panel">
              <h2>Round over</h2>
              <p>Score {score} · Level {level}</p>
              <div className="overlay-actions">
                <button type="button" className="btn btn-primary" onClick={start}>
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
