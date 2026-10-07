import { useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './guess.css'

const meta = getGame('guess')

function secretNumber() {
  return 1 + Math.floor(Math.random() * 100)
}

export default function GuessGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [secret, setSecret] = useState(() => secretNumber())
  const [guess, setGuess] = useState('')
  const [tries, setTries] = useState(0)
  const [hint, setHint] = useState('Pick a number from 1 to 100.')
  const [won, setWon] = useState(false)
  const [shake, setShake] = useState(false)
  const [hotStreak, setHotStreak] = useState(0)

  function restart() {
    void unlockAudio()
    setSecret(secretNumber())
    setGuess('')
    setTries(0)
    setHint('Pick a number from 1 to 100.')
    setWon(false)
    setHotStreak(0)
    sfx.tick()
  }

  function submit() {
    if (won) return
    const value = Number(guess)
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      setHint('Enter a whole number between 1 and 100.')
      sfx.miss()
      setShake(true)
      window.setTimeout(() => setShake(false), 280)
      return
    }

    void unlockAudio()
    const nextTries = tries + 1
    setTries(nextTries)
    const distance = Math.abs(value - secret)

    if (value === secret) {
      setWon(true)
      setHint(`Found it in ${nextTries} ${nextTries === 1 ? 'try' : 'tries'}!`)
      sfx.win()
      const score = Math.max(1000 - nextTries * 60, 80)
      burst(score, Math.max(1, 10 - nextTries))
      levelUp()
      recordPlay('guess', score, nextTries <= 8)
      return
    }

    sfx.move()
    if (distance <= 5) {
      const nextHot = hotStreak + 1
      setHotStreak(nextHot)
      burst(5, nextHot)
      setHint(value < secret ? 'Burning hot ↑' : 'Burning hot ↓')
    } else if (distance <= 15) {
      setHotStreak(0)
      setHint(value < secret ? 'Warm ↑' : 'Warm ↓')
    } else {
      setHotStreak(0)
      setHint(value < secret ? 'Higher ↑' : 'Lower ↓')
    }
    setGuess('')
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Tries', value: tries },
        { label: 'Range', value: '1–100' },
      ]}
      actions={
        <button type="button" className="btn btn-ghost" onClick={restart}>
          New
        </button>
      }
    >
      <div className={`guess-board panel${shake ? ' is-shake' : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        <div className={`guess-hint${won ? ' is-win' : ''}`}>{hint}</div>
        <form
          className="guess-form"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Your guess"
            aria-label="Guess number"
            disabled={won}
          />
          <button type="submit" className="btn btn-primary" disabled={won}>
            Guess
          </button>
        </form>
        {won && (
          <button type="button" className="btn btn-ghost" onClick={restart}>
            Play again
          </button>
        )}
      </div>
    </GameShell>
  )
}
