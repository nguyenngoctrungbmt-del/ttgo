import CelebrateBurst from './CelebrateBurst'
import { ResultPlayCta } from './playStore'
import './LevelCleared.css'

type Props = {
  open: boolean
  title?: string
  subtitle?: string
  /** When set, shows a primary "Next" action for mid-run clears. */
  onNext?: () => void
  nextLabel?: string
  /** Final-run or replay action. */
  onReplay: () => void
  replayLabel?: string
}

export default function LevelCleared({
  open,
  title = 'Level completed!',
  subtitle,
  onNext,
  nextLabel = 'Next level',
  onReplay,
  replayLabel = 'Play again',
}: Props) {
  if (!open) return null

  return (
    <div className="overlay level-cleared is-celebrate" role="dialog" aria-modal="true" aria-label={title}>
      <CelebrateBurst />
      <div className="overlay-card panel level-cleared__card">
        <div className="level-cleared__burst" aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="level-cleared__badge" aria-hidden>
          ✓
        </div>
        <h2 className="level-cleared__title">{title}</h2>
        {subtitle ? <p className="level-cleared__sub">{subtitle}</p> : null}
        <div className="overlay-actions">
          {onNext ? (
            <button type="button" className="btn btn-primary" onClick={onNext}>
              {nextLabel}
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={onReplay}>
              {replayLabel}
            </button>
          )}
          {onNext ? (
            <button type="button" className="btn btn-ghost" onClick={onReplay}>
              {replayLabel}
            </button>
          ) : null}
          <ResultPlayCta />
        </div>
      </div>
    </div>
  )
}
