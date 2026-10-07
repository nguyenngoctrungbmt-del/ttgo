import { useEffect, useRef, useState } from 'react'
import { getGame } from '../../data/games'
import GameShell from '../../shared/GameShell'
import PlayIdle from '../../shared/PlayIdle'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './reaction.css'

type Phase = 'idle' | 'waiting' | 'go' | 'result' | 'early'

const meta = getGame('reaction')

export default function ReactionGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [phase, setPhase] = useState<Phase>('idle')
  const [ms, setMs] = useState<number | null>(null)
  const [best, setBest] = useState<number | null>(null)
  const [tries, setTries] = useState(0)
  const [streak, setStreak] = useState(0)
  const [score, setScore] = useState(0)
  const goAt = useRef(0)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  function clearTimer() {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }

  function start() {
    void unlockAudio()
    clearTimer()
    setPhase('waiting')
    setMs(null)
    sfx.tick()
    // Longer wait window as streak rises — harder to stay patient
    const delay = 1000 + Math.random() * (2400 + streak * 200)
    timer.current = window.setTimeout(() => {
      goAt.current = performance.now()
      setPhase('go')
      sfx.ready()
    }, delay)
  }

  function onPad() {
    void unlockAudio()
    if (phase === 'waiting') {
      clearTimer()
      setPhase('early')
      setStreak(0)
      sfx.miss()
      return
    }
    if (phase !== 'go') return

    const reaction = Math.round(performance.now() - goAt.current)
    setMs(reaction)
    setPhase('result')
    setTries((t) => t + 1)
    setBest((b) => (b == null ? reaction : Math.min(b, reaction)))
    const gained = Math.max(1000 - reaction, 50)
    const nextStreak = reaction <= 350 ? streak + 1 : 0
    setStreak(nextStreak)
    setScore((s) => s + gained)
    burst(gained, nextStreak)
    if (reaction <= 250) {
      sfx.win()
      levelUp()
    } else sfx.match()
    recordPlay('reaction', gained, reaction <= 350)
  }

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Last', value: ms == null ? '—' : `${ms}ms` },
        { label: 'Best', value: best == null ? '—' : `${best}ms` },
        { label: 'Streak', value: streak },
        { label: 'Tries', value: tries },
        { label: 'Score', value: score },
      ]}
      actions={
        phase !== 'idle' ? (
          <button type="button" className="btn btn-ghost" onClick={start}>
            Again
          </button>
        ) : undefined
      }
    >
      <div className="reaction-board panel">
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        {phase === 'idle' ? (
          <PlayIdle hint="Wait for green, then tap as fast as you can." onPlay={start} />
        ) : (
          <button type="button" className={`reaction-pad phase-${phase}`} onClick={onPad}>
            <span className="reaction-pad__burst" aria-hidden />
            <strong>
              {phase === 'waiting' && 'Wait for green…'}
              {phase === 'go' && 'TAP!'}
              {phase === 'early' && 'Too soon'}
              {phase === 'result' && `${ms} ms`}
            </strong>
            <span className="muted">
              {phase === 'go' && 'Now!'}
              {phase === 'waiting' && 'Stay ready'}
              {phase === 'result' && (ms != null && ms <= 250 ? 'Lightning!' : 'Nice reflex')}
              {phase === 'early' && 'Wait for the flash'}
            </span>
          </button>
        )}
      </div>
    </GameShell>
  )
}
