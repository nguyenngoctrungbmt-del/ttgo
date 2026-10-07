import { useEffect, useMemo, useState } from 'react'
import { getRewardXpAmount, showRewardedAd } from '../../ads/admob'
import { getGame } from '../../data/games'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import LevelCleared from '../../shared/LevelCleared'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import { pickAnswer, VALID } from './words'
import './wordle.css'

const meta = getGame('wordle')
const WORD_LEN = 5
const MAX_TRIES = 6
const KEYS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
]

type TileState = 'empty' | 'tbd' | 'correct' | 'present' | 'absent'
type KeyState = 'correct' | 'present' | 'absent'

function scoreGuess(secret: string, guess: string): TileState[] {
  const result: TileState[] = Array.from({ length: WORD_LEN }, () => 'absent')
  const remaining = secret.split('')

  for (let i = 0; i < WORD_LEN; i += 1) {
    if (guess[i] === secret[i]) {
      result[i] = 'correct'
      remaining[i] = ''
    }
  }
  for (let i = 0; i < WORD_LEN; i += 1) {
    if (result[i] === 'correct') continue
    const idx = remaining.indexOf(guess[i])
    if (idx >= 0) {
      result[i] = 'present'
      remaining[idx] = ''
    }
  }
  return result
}

function mergeKeyState(prev: KeyState | undefined, next: TileState): KeyState | undefined {
  if (next === 'empty' || next === 'tbd') return prev
  if (next === 'correct') return 'correct'
  if (next === 'present') return prev === 'correct' ? 'correct' : 'present'
  if (prev === 'correct' || prev === 'present') return prev
  return 'absent'
}

export default function WordleGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const grantXp = useProgressStore((s) => s.grantXp)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [stage, setStage] = useState(1)
  const [secret, setSecret] = useState(() => pickAnswer())
  const [guesses, setGuesses] = useState<string[]>([])
  const [results, setResults] = useState<TileState[][]>([])
  const [draft, setDraft] = useState('')
  const [keys, setKeys] = useState<Partial<Record<string, KeyState>>>({})
  const [won, setWon] = useState(false)
  const [lost, setLost] = useState(false)
  const [winStreak, setWinStreak] = useState(0)
  const [adBusy, setAdBusy] = useState(false)
  const [adNote, setAdNote] = useState<string | null>(null)
  const [shake, setShake] = useState(false)
  const [hint, setHint] = useState('Guess the word')
  const xpAmount = getRewardXpAmount()
  const playing = !won && !lost

  const rows = useMemo(() => {
    const out: { letters: string[]; states: TileState[] }[] = []
    for (let i = 0; i < MAX_TRIES; i += 1) {
      if (i < guesses.length) {
        out.push({ letters: guesses[i].split(''), states: results[i] })
      } else if (i === guesses.length && playing) {
        const letters = draft.padEnd(WORD_LEN).split('').map((c) => (c === ' ' ? '' : c))
        out.push({
          letters,
          states: letters.map((c) => (c ? 'tbd' : 'empty')),
        })
      } else {
        out.push({
          letters: Array.from({ length: WORD_LEN }, () => ''),
          states: Array.from({ length: WORD_LEN }, () => 'empty'),
        })
      }
    }
    return out
  }, [guesses, results, draft, playing])

  function startRound(nextStage: number, exclude?: string, nextStreak = winStreak) {
    void unlockAudio()
    setStage(Math.max(1, nextStage))
    setSecret(pickAnswer(exclude))
    setGuesses([])
    setResults([])
    setDraft('')
    setKeys({})
    setWon(false)
    setLost(false)
    setWinStreak(nextStreak)
    setAdBusy(false)
    setAdNote(null)
    setHint('Guess the word')
    sfx.tick()
  }

  async function watchAdToSkip() {
    if (!playing || adBusy) return
    void unlockAudio()
    setAdBusy(true)
    setAdNote(null)
    try {
      const result = await showRewardedAd()
      if (result.rewarded) {
        if (result.xp > 0) grantXp(result.xp)
        setAdNote(`Skipped · +${result.xp || xpAmount} XP`)
        sfx.match()
        window.setTimeout(() => startRound(stage + 1, secret, winStreak), 350)
      } else {
        setAdNote('Ad unavailable. Try again in a moment.')
      }
    } finally {
      setAdBusy(false)
    }
  }

  function flashInvalid(msg: string) {
    setHint(msg)
    setShake(true)
    sfx.miss()
    window.setTimeout(() => setShake(false), 320)
  }

  function submit() {
    if (!playing) return
    if (draft.length !== WORD_LEN) {
      flashInvalid('Need 5 letters')
      return
    }
    if (!VALID.has(draft)) {
      flashInvalid('Not in word list')
      return
    }

    void unlockAudio()
    const states = scoreGuess(secret, draft)
    const nextGuesses = [...guesses, draft]
    const nextResults = [...results, states]
    const nextKeys = { ...keys }
    for (let i = 0; i < WORD_LEN; i += 1) {
      nextKeys[draft[i]] = mergeKeyState(nextKeys[draft[i]], states[i])
    }
    setGuesses(nextGuesses)
    setResults(nextResults)
    setKeys(nextKeys)
    setDraft('')
    setAdNote(null)
    sfx.move()

    if (draft === secret) {
      const nextStreak = winStreak + 1
      setWinStreak(nextStreak)
      setWon(true)
      setHint('Nice!')
      sfx.win()
      const score =
        Math.max(MAX_TRIES - nextGuesses.length, 0) * 80 +
        stage * 60 +
        100 +
        nextStreak * 25
      burst(score, nextStreak)
      levelUp()
      recordPlay('wordle', score, true)
      return
    }

    if (nextGuesses.length >= MAX_TRIES) {
      setWinStreak(0)
      setLost(true)
      setHint(secret)
      sfx.lose()
      recordPlay('wordle', Math.max(nextGuesses.length * 10, 10), false)
      return
    }

    setHint(`${MAX_TRIES - nextGuesses.length} left`)
  }

  function onKey(key: string) {
    if (!playing) return
    void unlockAudio()
    if (key === 'ENTER') {
      submit()
      return
    }
    if (key === '⌫' || key === 'BACKSPACE') {
      setDraft((d) => d.slice(0, -1))
      sfx.tap()
      return
    }
    if (/^[A-Z]$/.test(key) && draft.length < WORD_LEN) {
      setDraft((d) => d + key)
      sfx.tap()
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return
      if (e.key === 'Enter') {
        e.preventDefault()
        onKey('ENTER')
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        onKey('⌫')
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault()
        onKey(e.key.toUpperCase())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onKey closes over draft/guesses
  }, [draft, guesses, results, keys, secret, won, lost, stage, winStreak])

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Try', value: `${guesses.length}/${MAX_TRIES}` },
        { label: 'Streak', value: winStreak },
        { label: 'Lv', value: stage },
      ]}
      actions={
        <button type="button" className="btn btn-ghost" onClick={() => startRound(1, undefined, 0)}>
          New run
        </button>
      }
    >
      <div className="wordle-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        <BoardStage status={hint}>
          <div className={`wordle-grid${shake ? ' is-shake' : ''}`} aria-label="Guess grid">
            {rows.map((row, ri) => (
              <div key={ri} className="wordle-row">
                {row.letters.map((letter, ci) => (
                  <span
                    key={ci}
                    className={`wordle-tile is-${row.states[ci]}${letter ? ' has-letter' : ''}`}
                  >
                    {letter}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </BoardStage>

        {playing ? (
          <div className="wordle-skip">
            <button
              type="button"
              className="btn btn-warm"
              disabled={adBusy}
              onClick={() => void watchAdToSkip()}
            >
              {`Skip level · +${xpAmount} XP`}
            </button>
            {adNote ? <p className="wordle-skip__note muted">{adNote}</p> : null}
          </div>
        ) : null}

        <div className="wordle-keys" role="group" aria-label="Keyboard">
          {KEYS.map((row) => (
            <div key={row.join('')} className="wordle-key-row">
              {row.map((key) => {
                const wide = key === 'ENTER' || key === '⌫'
                const state = keys[key]
                return (
                  <button
                    key={key}
                    type="button"
                    className={`wordle-key${wide ? ' is-wide' : ''}${state ? ` is-${state}` : ''}`}
                    disabled={!playing}
                    onClick={() => onKey(key)}
                  >
                    {key}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <LevelCleared
          open={won}
          title="Word found!"
          subtitle={`${guesses.length} ${guesses.length === 1 ? 'try' : 'tries'} · Streak ${winStreak}`}
          onNext={() => startRound(stage + 1, secret, winStreak)}
          onReplay={() => startRound(1, undefined, 0)}
          replayLabel="New run"
        />
        <ResultOverlay
          open={lost}
          title="Out of tries"
          subtitle={`The word was ${secret} · Streak reset`}
          onPrimary={() => startRound(stage, secret, 0)}
          primaryLabel="Try again"
          onSecondary={() => startRound(1, undefined, 0)}
          secondaryLabel="New run"
        />
      </div>
    </GameShell>
  )
}
