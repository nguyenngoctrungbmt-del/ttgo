import CelebrateBurst from './CelebrateBurst'
import { ResultPlayCta } from './playStore'
import type { ReactNode } from 'react'

type Props = {
  open: boolean
  title: string
  subtitle?: string
  /** Confetti burst — use for wins / clears. */
  celebrate?: boolean
  onPrimary: () => void
  primaryLabel?: string
  onSecondary?: () => void
  secondaryLabel?: string
  /** Optional slot above the action buttons (e.g. rewarded-ad reveal). */
  children?: ReactNode
}

/** Shared end-of-run dialog that sits above board pieces. */
export default function ResultOverlay({
  open,
  title,
  subtitle,
  celebrate = false,
  onPrimary,
  primaryLabel = 'Play again',
  onSecondary,
  secondaryLabel,
  children,
}: Props) {
  if (!open) return null

  return (
    <div
      className={`overlay${celebrate ? ' is-celebrate' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {celebrate ? <CelebrateBurst /> : null}
      <div className="overlay-card panel">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
        {children}
        <div className="overlay-actions">
          {onSecondary && secondaryLabel ? (
            <button type="button" className="btn btn-ghost" onClick={onSecondary}>
              {secondaryLabel}
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={onPrimary}>
            {primaryLabel}
          </button>
          <ResultPlayCta />
        </div>
      </div>
    </div>
  )
}
