import type { ScoreBurstItem } from './useScoreBurst'
import './ScoreBurst.css'

type Props = {
  bursts: ScoreBurstItem[]
  onDone: (id: number) => void
}

export default function ScoreBurst({ bursts, onDone }: Props) {
  if (bursts.length === 0) return null
  return (
    <div className="score-burst-layer" aria-hidden>
      {bursts.map((b) => (
        <div
          key={b.id}
          className={`score-burst${b.tag ? ' is-combo' : ''}`}
          onAnimationEnd={() => onDone(b.id)}
        >
          {b.tag ? <span className="score-burst__tag">{b.tag}</span> : null}
          <span className="score-burst__pts">+{b.amount}</span>
        </div>
      ))}
    </div>
  )
}
