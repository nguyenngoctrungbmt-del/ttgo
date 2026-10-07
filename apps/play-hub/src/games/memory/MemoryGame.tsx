import { useEffect, useMemo, useState } from 'react'
import { getGame } from '../../data/games'
import BoardStage from '../../shared/BoardStage'
import GameShell from '../../shared/GameShell'
import ResultOverlay from '../../shared/ResultOverlay'
import ScoreBurst from '../../shared/ScoreBurst'
import { sfx, unlockAudio } from '../../shared/sound'
import { useScoreBurst } from '../../shared/useScoreBurst'
import { useProgressStore } from '../../store/progressStore'
import './memory.css'

type Card = {
  id: number
  value: string
  matched: boolean
}

const meta = getGame('memory')
const ICONS = ['▲', '●', '■', '◆', '★', '✚', '◎', '⬡']

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

function createDeck(): Card[] {
  const values = shuffle([...ICONS, ...ICONS])
  return values.map((value, index) => ({
    id: index,
    value,
    matched: false,
  }))
}

export default function MemoryGame() {
  const recordPlay = useProgressStore((s) => s.recordPlay)
  const { bursts, burst, dismiss, levelUp } = useScoreBurst()
  const [deck, setDeck] = useState<Card[]>(() => createDeck())
  const [flipped, setFlipped] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [locked, setLocked] = useState(false)
  const [won, setWon] = useState(false)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [burstFx, setBurstFx] = useState(false)
  const [pairs, setPairs] = useState(0)

  const matchedCount = useMemo(() => deck.filter((c) => c.matched).length, [deck])

  useEffect(() => {
    if (won) return
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    }, 500)
    return () => window.clearInterval(id)
  }, [startedAt, won])

  useEffect(() => {
    if (flipped.length !== 2) return

    const [a, b] = flipped
    const first = deck[a]
    const second = deck[b]
    setLocked(true)

    const timer = window.setTimeout(() => {
      if (first.value === second.value) {
        sfx.match()
        setBurstFx(true)
        window.setTimeout(() => setBurstFx(false), 350)
        setPairs((p) => {
          const next = p + 1
          const gained = 40 + next * 5
          burst(gained, next)
          if (next % 4 === 0) levelUp()
          return next
        })
        setDeck((prev) =>
          prev.map((card, index) =>
            index === a || index === b ? { ...card, matched: true } : card,
          ),
        )
      } else {
        sfx.miss()
      }
      setFlipped([])
      setLocked(false)
    }, 520)

    return () => window.clearTimeout(timer)
  }, [flipped, deck])

  useEffect(() => {
    if (matchedCount === deck.length && deck.length > 0 && !won) {
      setWon(true)
      sfx.win()
      const score = Math.max(1000 - moves * 25 - elapsed * 2, 50)
      recordPlay('memory', score, true)
    }
  }, [matchedCount, deck.length, won, moves, elapsed, recordPlay])

  function flip(index: number) {
    if (locked || won) return
    const card = deck[index]
    if (card.matched || flipped.includes(index)) return
    if (flipped.length >= 2) return

    void unlockAudio()
    sfx.flip()
    if (flipped.length === 1) setMoves((m) => m + 1)
    setFlipped((prev) => [...prev, index])
  }

  function restart() {
    void unlockAudio()
    setDeck(createDeck())
    setFlipped([])
    setMoves(0)
    setLocked(false)
    setWon(false)
    setStartedAt(Date.now())
    setElapsed(0)
    setPairs(0)
    sfx.tick()
  }

  const scorePreview = Math.max(1000 - moves * 25 - elapsed * 2, 50)

  return (
    <GameShell
      title={meta.title}
      icon={meta.icon}
      howTo={meta.howTo}
      stats={[
        { label: 'Moves', value: moves },
        { label: 'Pairs', value: pairs },
        { label: 'Time', value: `${elapsed}s` },
        { label: 'Score', value: scorePreview },
      ]}
      actions={
        <button type="button" className="btn btn-ghost" onClick={restart}>
          Reset
        </button>
      }
    >
      <div className={`memory-board panel board-host${burstFx ? ' is-burst' : ''}`}>
        <ScoreBurst bursts={bursts} onDone={dismiss} />
        <BoardStage status={pairs > 0 ? `${pairs} pairs` : undefined}>
          <div className="memory-grid">
            {deck.map((card, index) => {
              const open = flipped.includes(index) || card.matched
              return (
                <button
                  key={card.id}
                  type="button"
                  className={`memory-card ${open ? 'is-open' : ''} ${card.matched ? 'is-matched' : ''}`}
                  onClick={() => flip(index)}
                  aria-label={open ? card.value : 'Hidden card'}
                >
                  <span className="memory-card__face memory-card__back">?</span>
                  <span className="memory-card__face memory-card__front">{card.value}</span>
                </button>
              )
            })}
          </div>
        </BoardStage>

        <ResultOverlay
          open={won}
          title="Board cleared"
          subtitle={`${moves} moves · ${elapsed}s · score ${scorePreview}`}
          celebrate
          onPrimary={restart}
        />
      </div>
    </GameShell>
  )
}
