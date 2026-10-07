import { useMemo, useState } from 'react'
import { getGame } from '../../data/games'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import LevelCleared from '../../shared/LevelCleared'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './code.css'

const meta = getGame('code')
const CODE_LEN = 4
const MAX_TRIES = 8
const PALETTE = ['#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'] as const

type ColorId = number
type Guess = ColorId[]
type Feedback = { black: number; white: number }

function colorCount(stage: number): number {
  return Math.min(4 + Math.floor((stage - 1) / 2), PALETTE.length)
}

function makeSecret(colors: number): Guess {
  return Array.from({ length: CODE_LEN }, () => Math.floor(Math.random() * colors))
}

function scoreGuess(secret: Guess, guess: Guess): Feedback {
  const black = secret.reduce((n, c, i) => n + (c === guess[i] ? 1 : 0), 0)
  const secretCount = new Map<number, number>()
  const guessCount = new Map<number, number>()
  for (let i = 0; i < CODE_LEN; i += 1) {
    if (secret[i] === guess[i]) continue
    secretCount.set(secret[i], (secretCount.get(secret[i]) ?? 0) + 1)
    guessCount.set(guess[i], (guessCount.get(guess[i]) ?? 0) + 1)
  }
  let white = 0
  for (const [color, count] of guessCount) {
    white += Math.min(count, secretCount.get(color) ?? 0)
  }
  return { black, white }
}

function emptyGuess(): (ColorId | null)[] {
  return Array.from({ length: CODE_LEN }, () => null)
}

export default function CodeGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()

  const [stage, setStage] = useState(1)
  const colors = colorCount(stage)
  const [secret, setSecret] = useState<Guess>(() => makeSecret(colorCount(1)))
  const [history, setHistory] = useState<{ guess: Guess; feedback: Feedback }[]>([])
  const [draft, setDraft] = useState<(ColorId | null)[]>(() => emptyGuess())
  const [focus, setFocus] = useState(0)
  const [won, setWon] = useState(false)
  const [lost, setLost] = useState(false)

  const triesLeft = MAX_TRIES - history.length
  const draftFull = useMemo(() => draft.every((c) => c !== null), [draft])

  function restart(nextStage = 1) {
    void unlockAudio()
    const s = Math.max(1, nextStage)
    setStage(s)
    setSecret(makeSecret(colorCount(s)))
    setHistory([])
    setDraft(emptyGuess())
    setFocus(0)
    setWon(false)
    setLost(false)
    sfx.tick()
  }

  function pickColor(color: ColorId) {
    if (won || lost) return
    void unlockAudio()
    const next = [...draft]
    next[focus] = color
    setDraft(next)
    sfx.tap()
    const nextEmpty = next.findIndex((c, i) => i > focus && c === null)
    if (nextEmpty >= 0) setFocus(nextEmpty)
    else if (focus < CODE_LEN - 1) setFocus(focus + 1)
  }

  function clearDraft() {
    if (won || lost) return
    void unlockAudio()
    setDraft(emptyGuess())
    setFocus(0)
    sfx.tick()
  }

  function submit() {
    if (won || lost || !draftFull) return
    void unlockAudio()
    const guess = draft as Guess
    const feedback = scoreGuess(secret, guess)
    const nextHistory = [...history, { guess, feedback }]
    setHistory(nextHistory)
    setDraft(emptyGuess())
    setFocus(0)
    sfx.move()

    if (feedback.black === CODE_LEN) {
      setWon(true)
      sfx.win()
      const score = Math.max(MAX_TRIES - nextHistory.length, 0) * 70 + stage * 90 + 120
      burst(score, stage)
      levelUp()
      recordPlay('code', score, true)
      return
    }

    if (nextHistory.length >= MAX_TRIES) {
      setLost(true)
      sfx.lose()
      recordPlay('code', Math.max(nextHistory.length * 8, 10), false)
    }
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Tries', value: `${history.length}/${MAX_TRIES}` },
        { label: 'Left', value: triesLeft },
        { label: 'Lv', value: stage },
      ]}
      actions={
        <button type="button" className="btn btn-ghost" onClick={() => restart(1)}>
          New run
        </button>
      }
    >
      <div className="code-board panel board-host">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        <BoardStage status={`Level ${stage} · ${colors} colors`}>
          <div className="code-rows" aria-label="Guess history">
            {Array.from({ length: MAX_TRIES }, (_, row) => {
              const entry = history[row]
              return (
                <div key={row} className="code-row">
                  <div className="code-pegs" aria-hidden>
                    {Array.from({ length: CODE_LEN }, (_, i) => {
                      const kind =
                        entry && i < entry.feedback.black
                          ? 'black'
                          : entry && i < entry.feedback.black + entry.feedback.white
                            ? 'white'
                            : ''
                      return (
                        <span
                          key={i}
                          className={`code-peg${kind ? ` is-${kind}` : ''}`}
                        />
                      )
                    })}
                  </div>
                  <div className="code-guess">
                    {Array.from({ length: CODE_LEN }, (_, i) => (
                      <span
                        key={i}
                        className={`code-slot${entry ? ' is-filled' : ''}`}
                        style={entry ? { background: PALETTE[entry.guess[i]] } : undefined}
                      />
                    ))}
                  </div>
                  <span className="muted" style={{ fontSize: '0.75rem', width: '1.2rem' }}>
                    {entry ? row + 1 : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </BoardStage>

        <div className="code-composer">
          <div className="code-current" role="group" aria-label="Current guess">
            {draft.map((color, i) => (
              <button
                key={i}
                type="button"
                className={`code-current-slot${color !== null ? ' is-filled' : ''}${focus === i ? ' is-focus' : ''}`}
                style={color !== null ? { background: PALETTE[color] } : undefined}
                aria-label={`Slot ${i + 1}`}
                disabled={won || lost}
                onClick={() => setFocus(i)}
              />
            ))}
          </div>
          <div className="code-palette" role="group" aria-label="Colors">
            {PALETTE.slice(0, colors).map((hex, id) => (
              <button
                key={hex}
                type="button"
                className="code-swatch"
                style={{ background: hex }}
                aria-label={`Color ${id + 1}`}
                disabled={won || lost}
                onClick={() => pickColor(id)}
              />
            ))}
          </div>
          <div className="code-actions">
            <button type="button" className="btn btn-ghost" disabled={won || lost} onClick={clearDraft}>
              Clear
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={won || lost || !draftFull}
              onClick={submit}
            >
              Lock in
            </button>
          </div>
        </div>

        <LevelCleared
          open={won}
          title="Code cracked!"
          subtitle={`${history.length} tries · Level ${stage}`}
          onNext={() => restart(stage + 1)}
          onReplay={() => restart(1)}
          replayLabel="New run"
        />
        <ResultOverlay
          open={lost}
          title="Out of tries"
          subtitle="The secret stays hidden — try again."
          onPrimary={() => restart(stage)}
          primaryLabel="Try again"
          onSecondary={() => restart(1)}
          secondaryLabel="New run"
        />
      </div>
    </GameShell>
  )
}
