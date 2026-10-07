import type { CSSProperties } from 'react'
import './ImpactFlash.css'

type Props = {
  /** Bumps to replay the flash (e.g. Date.now()). 0 = hidden. */
  trigger: number
  /** Optional impact point in % of the arena. */
  x?: number
  y?: number
}

/** Red flash + spark burst when the player is hit / dies. */
export default function ImpactFlash({ trigger, x = 50, y = 50 }: Props) {
  if (!trigger) return null

  return (
    <div className="impact-flash" key={trigger} aria-hidden>
      <div className="impact-flash__veil" />
      <div className="impact-flash__blast" style={{ left: `${x}%`, top: `${y}%` }}>
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className="impact-flash__spark"
            style={{ '--i': i } as CSSProperties}
          />
        ))}
        <span className="impact-flash__ring" />
        <span className="impact-flash__boom">💥</span>
      </div>
    </div>
  )
}
