import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import { roundLimit, streakScore } from '../../shared/difficulty'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './colors.css'

const meta = getGame('colors')

const COLORS = [
  { id: 'blue', label: 'Teal', hex: '#0D9488' },
  { id: 'purple', label: 'Sky', hex: '#0284C7' },
  { id: 'green', label: 'Green', hex: '#45C486' },
  { id: 'yellow', label: 'Yellow', hex: '#FFC83D' },
] as const

type ColorId = (typeof COLORS)[number]['id']

type Round = {
  word: ColorId
  ink: ColorId
}

function nextRound(level: number): Round {
  const word = COLORS[Math.floor(Math.random() * COLORS.length)].id
  let ink = COLORS[Math.floor(Math.random() * COLORS.length)].id
  // Higher levels: more mismatch pressure
  const mismatchChance = Math.min(0.92, 0.65 + level * 0.03)
  if (Math.random() < mismatchChance) {
    while (ink === word) ink = COLORS[Math.floor(Math.random() * COLORS.length)].id
  }
  return { word, ink }
}

export default function ColorsGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [round, setRound] = useState<Round>(() => nextRound(1))
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [feedback, setFeedback] = useState<'ok' | 'bad' | null>(null)
  const [timeLeft, setTimeLeft] = useState(3)
  const scoreRef = useRef(0)
  const roundId = useRef(0)
  const limitRef = useRef(3)

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  useEffect(() => {
    if (!running || over) return
    const currentRound = roundId.current
    const limit = limitRef.current
    setTimeLeft(limit)
    const started = Date.now()
    const id = window.setInterval(() => {
      if (roundId.current !== currentRound) {
        window.clearInterval(id)
        return
      }
      const left = Math.max(0, limit - (Date.now() - started) / 1000)
      setTimeLeft(Number(left.toFixed(1)))
      if (left <= 0) {
        window.clearInterval(id)
        miss()
      }
    }, 50)
    return () => window.clearInterval(id)
  }, [running, over, round.word, round.ink])

  function bumpRound(next: Round) {
    roundId.current += 1
    setRound(next)
  }

  function start() {
    void unlockAudio()
    setScore(0)
    scoreRef.current = 0
    setStreak(0)
    setLives(3)
    setLevel(1)
    limitRef.current = 3
    setOver(false)
    setRunning(true)
    setFeedback(null)
    bumpRound(nextRound(1))
    sfx.ready()
  }

  function miss() {
    sfx.miss()
    setFeedback('bad')
    setStreak(0)
    setLives((l) => {
      const next = l - 1
      if (next <= 0) {
        setOver(true)
        setRunning(false)
        sfx.lose()
        recordPlay('colors', scoreRef.current, scoreRef.current >= 80)
      } else {
        window.setTimeout(() => {
          setFeedback(null)
          bumpRound(nextRound(level))
        }, 280)
      }
      return next
    })
  }

  function pick(id: ColorId) {
    if (!running || over) return
    void unlockAudio()
    if (id === round.ink) {
      sfx.match()
      setFeedback('ok')
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
      limitRef.current = roundLimit(3, nextLevel, 1.15, 0.1)
      if (nextLevel % 5 === 0) levelUp()
      window.setTimeout(() => {
        setFeedback(null)
        bumpRound(nextRound(nextLevel))
      }, 220)
    } else {
      miss()
    }
  }

  const wordMeta = COLORS.find((c) => c.id === round.word)!
  const inkMeta = COLORS.find((c) => c.id === round.ink)!

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
      <div className={`colors-board panel${feedback ? ` is-${feedback}` : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Choose the ink color, ignore the word." onPlay={start} />
        )}

        {running && (
          <>
            <div className="colors-timer">
              <div className="progress-bar">
                <span style={{ width: `${(timeLeft / limitRef.current) * 100}%` }} />
              </div>
            </div>
            <div className="colors-prompt" style={{ color: inkMeta.hex }}>
              {wordMeta.label}
            </div>
            <div className="colors-choices">
              {COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  className="colors-choice"
                  style={{
                    background: color.hex,
                    color: color.id === 'yellow' ? '#422006' : '#fff',
                  }}
                  onClick={() => pick(color.id)}
                >
                  {color.label}
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
