import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { streakScore } from '../../shared/difficulty'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useProgressStore } from '../../store/progressStore'
import './rps.css'

const meta = getGame('rps')

const MOVES = [
  { id: 'rock', label: '✊', name: 'Rock' },
  { id: 'paper', label: '🖐️', name: 'Paper' },
  { id: 'scissors', label: '✌️', name: 'Scissors' },
] as const

type MoveId = (typeof MOVES)[number]['id']

function beats(a: MoveId, b: MoveId): boolean {
  return (
    (a === 'rock' && b === 'scissors') ||
    (a === 'paper' && b === 'rock') ||
    (a === 'scissors' && b === 'paper')
  )
}

function randomMove(): MoveId {
  return MOVES[Math.floor(Math.random() * MOVES.length)].id
}

export default function RpsGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [cpu, setCpu] = useState<MoveId | null>(null)
  const [you, setYou] = useState<MoveId | null>(null)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [timeLeft, setTimeLeft] = useState(2.5)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const [msg, setMsg] = useState('')
  const scoreRef = useRef(0)
  const roundId = useRef(0)
  const limitRef = useRef(2.5)

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    if (!running || over || you) return
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
        loseRound('Too slow!')
      }
    }, 40)
    return () => window.clearInterval(id)
  }, [running, over, you, level])

  function nextRound(nextLevel: number) {
    roundId.current += 1
    setCpu(randomMove())
    setYou(null)
    setMsg('')
    setLevel(nextLevel)
    limitRef.current = Math.max(1.1, 2.5 - nextLevel * 0.08)
  }

  function start() {
    void unlockAudio()
    setScore(0)
    scoreRef.current = 0
    setStreak(0)
    setLives(3)
    setOver(false)
    setRunning(true)
    setFlash(null)
    nextRound(1)
    sfx.ready()
  }

  function loseRound(reason: string) {
    sfx.miss()
    setFlash('bad')
    setMsg(reason)
    setStreak(0)
    setLives((l) => {
      const left = l - 1
      if (left <= 0) {
        setOver(true)
        setRunning(false)
        sfx.lose()
        recordPlay('rps', scoreRef.current, scoreRef.current >= 80)
      } else {
        window.setTimeout(() => {
          setFlash(null)
          nextRound(level)
        }, 500)
      }
      return left
    })
  }

  function pick(move: MoveId) {
    if (!running || over || you || !cpu) return
    void unlockAudio()
    setYou(move)
    if (move === cpu) {
      sfx.tick()
      setMsg('Draw — again!')
      window.setTimeout(() => {
        setFlash(null)
        nextRound(level)
      }, 450)
      return
    }
    if (beats(move, cpu)) {
      sfx.match()
      setFlash('ok')
      setMsg('You win!')
      const nextStreak = streak + 1
      const gained = streakScore(12, streak, { cap: 6, per: 2 })
      setStreak(nextStreak)
      setScore((s) => {
        const next = s + gained
        scoreRef.current = next
        return next
      })
      burst(gained, nextStreak)
      window.setTimeout(() => {
        setFlash(null)
        const nextLevel = level + 1
        if (nextLevel % 5 === 0) levelUp()
        nextRound(nextLevel)
      }, 450)
    } else {
      loseRound('CPU wins')
    }
  }

  const cpuMove = MOVES.find((m) => m.id === cpu)
  const youMove = MOVES.find((m) => m.id === you)

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
      <div className={`rps-board panel${flash ? ` is-${flash}` : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Beat the CPU before the timer hits zero." onPlay={start} />
        )}
        {running && (
          <>
            <div className="progress-bar">
              <span style={{ width: `${(timeLeft / limitRef.current) * 100}%` }} />
            </div>
            <div className="rps-arena">
              <div className="rps-side">
                <span className="muted">CPU</span>
                <div className="rps-hand">{you ? cpuMove?.label : '❔'}</div>
              </div>
              <div className="rps-vs">VS</div>
              <div className="rps-side">
                <span className="muted">You</span>
                <div className="rps-hand">{youMove?.label ?? '❔'}</div>
              </div>
            </div>
            {msg && <p className="rps-msg">{msg}</p>}
            <div className="rps-choices">
              {MOVES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="rps-choice"
                  onClick={() => pick(m.id)}
                  disabled={!!you}
                  aria-label={m.name}
                >
                  <span>{m.label}</span>
                  <small>{m.name}</small>
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
