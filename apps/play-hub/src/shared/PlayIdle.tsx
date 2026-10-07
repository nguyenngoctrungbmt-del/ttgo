type PlayIdleProps = {
  hint?: string
  onPlay: () => void
  label?: string
}

/** Centered Play CTA for the idle state of a game board. */
export default function PlayIdle({ hint, onPlay, label = 'Play' }: PlayIdleProps) {
  return (
    <div className="play-idle">
      {hint ? <p className="muted play-idle__hint">{hint}</p> : null}
      <button type="button" className="btn btn-primary btn-play" onClick={onPlay}>
        {label}
      </button>
    </div>
  )
}
