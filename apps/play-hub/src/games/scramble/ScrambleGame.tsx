import { useMemo, useState } from 'react'
import { getGame } from '../../data/games'
import { streakScore } from '../../shared/difficulty'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './scramble.css'

const meta = getGame('scramble')

const WORDS_EASY = ['BRAIN', 'LIGHT', 'SCORE', 'GAMES', 'FOCUS', 'MATCH', 'QUICK', 'STARS']
const WORDS_MID = ['PUZZLE', 'LOGIC', 'FLASH', 'TILES', 'COMBO', 'CLEAR', 'DAILY', 'SMART']
const WORDS_HARD = ['REFLEX', 'MEMORY', 'PUZZLE', 'STREAK', 'MASTER', 'CHALLENGE', 'PATTERN', 'SEQUENCE']

function wordPool(cleared: number): string[] {
  if (cleared >= 5) return [...WORDS_MID, ...WORDS_HARD]
  if (cleared >= 2) return [...WORDS_EASY, ...WORDS_MID]
  return WORDS_EASY
}

function scrambleWord(word: string): string {
  const chars = word.split('')
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  const out = chars.join('')
  return out === word ? scrambleWord(word) : out
}

function pickWord(cleared: number, exclude?: string) {
  const pool = wordPool(cleared).filter((w) => w !== exclude)
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function ScrambleGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [word, setWord] = useState(() => pickWord(0))
  const [scrambled, setScrambled] = useState(() => scrambleWord(word))
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [cleared, setCleared] = useState(0)
  const [streak, setStreak] = useState(0)
  const [running, setRunning] = useState(false)
  const [over, setOver] = useState(false)
  const [message, setMessage] = useState('Unscramble the word.')
  const [shake, setShake] = useState(false)

  const letters = useMemo(() => scrambled.split(''), [scrambled])

  function nextWord(fromCleared: number, from = word) {
    const next = pickWord(fromCleared, from)
    setWord(next)
    setScrambled(scrambleWord(next))
    setInput('')
  }

  function start() {
    void unlockAudio()
    setScore(0)
    setCleared(0)
    setStreak(0)
    setRunning(true)
    setOver(false)
    setMessage('Unscramble the word.')
    nextWord(0)
    sfx.ready()
  }

  function submit() {
    if (!running || over) return
    void unlockAudio()
    const guess = input.trim().toUpperCase()
    if (!guess) return

    if (guess === word) {
      sfx.match()
      const nextStreak = streak + 1
      const gained = streakScore(20 + word.length * 2, streak, { cap: 6, per: 3 })
      const nextCleared = cleared + 1
      const nextScore = score + gained
      setCleared(nextCleared)
      setScore(nextScore)
      setStreak(nextStreak)
      burst(gained, nextStreak)
      setMessage('Nice! Next word…')
      if (nextCleared % 3 === 0) levelUp()
      if (nextCleared >= 8) {
        setOver(true)
        setRunning(false)
        sfx.win()
        recordPlay('scramble', nextScore, true)
        return
      }
      window.setTimeout(() => {
        setMessage('Unscramble the word.')
        nextWord(nextCleared, word)
      }, 350)
      return
    }

    sfx.miss()
    setStreak(0)
    setShake(true)
    setMessage('Not quite — try again.')
    window.setTimeout(() => setShake(false), 280)
  }

  function skip() {
    if (!running || over) return
    void unlockAudio()
    sfx.tick()
    setStreak(0)
    setScore((s) => Math.max(0, s - 5))
    setMessage(`It was ${word}. Next…`)
    window.setTimeout(() => {
      setMessage('Unscramble the word.')
      nextWord(cleared, word)
    }, 450)
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Streak', value: streak },
        { label: 'Words', value: `${cleared}/8` },
      ]}
      actions={
        running ? (
          <button type="button" className="btn btn-ghost" onClick={start}>
            Restart
          </button>
        ) : undefined
      }
    >
      <div className={`scramble-board panel${shake ? ' is-shake' : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {!running && !over && (
          <PlayIdle hint="Start to unscramble 8 words." onPlay={start} />
        )}
        {running && (
          <>
            <p className="scramble-msg muted">{message}</p>
            <div className="scramble-letters">
              {letters.map((letter, index) => (
                <span key={`${scrambled}-${index}`} className="scramble-letter">
                  {letter}
                </span>
              ))}
            </div>
            <form
              className="scramble-form"
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value.toUpperCase())}
                placeholder="TYPE WORD"
                aria-label="Unscrambled word"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <button type="submit" className="btn btn-primary">
                Check
              </button>
            </form>
            <button type="button" className="btn btn-ghost" onClick={skip}>
              Skip (−5)
            </button>
          </>
        )}
        <ResultOverlay
          open={over}
          title="Words cleared"
          subtitle={`Score ${score}`}
          celebrate
          onPrimary={start}
        />
      </div>
    </GameShell>
  )
}
