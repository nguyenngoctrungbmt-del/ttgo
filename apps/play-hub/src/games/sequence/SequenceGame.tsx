import { useRef, useState, type CSSProperties } from 'react'
import { getGame } from '../../data/games'
import { paceMs } from '../../shared/difficulty'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './sequence.css'

const meta = getGame('sequence')

const PADS = [
  { id: 0, label: 'A', color: '#0D9488', note: 523 },
  { id: 1, label: 'B', color: '#0284C7', note: 587 },
  { id: 2, label: 'C', color: '#45C486', note: 659 },
  { id: 3, label: 'D', color: '#FFC83D', note: 784 },
] as const

type Phase = 'idle' | 'watch' | 'input' | 'won' | 'lost'

function randomPad(): number {
  return Math.floor(Math.random() * PADS.length)
}

export default function SequenceGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [sequence, setSequence] = useState<number[]>([])
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [active, setActive] = useState<number | null>(null)
  const [level, setLevel] = useState(0)
  const [score, setScore] = useState(0)
  const playingRef = useRef(false)

  async function playSequence(seq: number[]) {
    playingRef.current = true
    setPhase('watch')
    const onMs = paceMs(420, seq.length, 200, 18)
    const gapMs = paceMs(180, seq.length, 80, 8)
    for (const pad of seq) {
      setActive(pad)
      sfx.tick()
      await wait(onMs)
      setActive(null)
      await wait(gapMs)
    }
    playingRef.current = false
    setPhase('input')
    setStep(0)
  }

  function startRound(nextSeq: number[]) {
    setSequence(nextSeq)
    setLevel(nextSeq.length)
    void playSequence(nextSeq)
  }

  function begin() {
    void unlockAudio()
    setScore(0)
    sfx.ready()
    startRound([randomPad()])
  }

  function onPad(id: number) {
    if (phase !== 'input' || playingRef.current) return
    void unlockAudio()

    setActive(id)
    sfx.tap()
    window.setTimeout(() => setActive(null), 160)

    if (sequence[step] !== id) {
      setPhase('lost')
      sfx.lose()
      recordPlay('sequence', Math.max(score, level), level >= 5)
      return
    }

    const nextStep = step + 1
    if (nextStep >= sequence.length) {
      const gained = 10 + sequence.length * 4
      const nextScore = score + gained
      setScore(nextScore)
      burst(gained, sequence.length)
      if (sequence.length % 3 === 0) levelUp()
      if (sequence.length >= 12) {
        setPhase('won')
        sfx.win()
        recordPlay('sequence', nextScore, true)
        return
      }
      sfx.match()
      const grown = [...sequence, randomPad()]
      setStep(0)
      window.setTimeout(() => startRound(grown), 450)
      return
    }

    setStep(nextStep)
  }

  function restart() {
    setSequence([])
    setStep(0)
    setPhase('idle')
    setActive(null)
    setLevel(0)
    setScore(0)
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Score', value: score },
        { label: 'Level', value: level },
        { label: 'Phase', value: phaseLabel(phase) },
      ]}
      actions={
        phase !== 'idle' ? (
          <button type="button" className="btn btn-ghost" onClick={restart}>
            Reset
          </button>
        ) : undefined
      }
    >
      <div className="sequence-board panel">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {phase === 'idle' ? (
          <PlayIdle hint="Watch the pulse, then tap the pattern back." onPlay={begin} />
        ) : (
          <>
            <p className="sequence-hint muted">
              {phase === 'watch' && 'Watch carefully…'}
              {phase === 'input' && 'Your turn — tap the pattern.'}
              {phase === 'lost' && 'Missed the beat. Try again.'}
              {phase === 'won' && 'Sequence master — 12 levels cleared.'}
            </p>

            <div className="sequence-pads">
              {PADS.map((pad) => (
                <button
                  key={pad.id}
                  type="button"
                  className={`sequence-pad ${active === pad.id ? 'is-lit' : ''}`}
                  style={{ '--pad': pad.color } as CSSProperties}
                  onClick={() => onPad(pad.id)}
                  disabled={phase === 'watch'}
                >
                  {pad.label}
                </button>
              ))}
            </div>

            {(phase === 'lost' || phase === 'won') && (
              <div className="sequence-actions">
                <button type="button" className="btn btn-primary" onClick={begin}>
                  Play again
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </GameShell>
  )
}

function phaseLabel(phase: Phase): string {
  switch (phase) {
    case 'idle':
      return 'Ready'
    case 'watch':
      return 'Watch'
    case 'input':
      return 'Tap'
    case 'won':
      return 'Clear'
    case 'lost':
      return 'Miss'
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
