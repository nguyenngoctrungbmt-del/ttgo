import './CelebrateBurst.css'

/** Confetti / spark burst for win overlays. */
export default function CelebrateBurst() {
  return (
    <div className="celebrate-burst" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => (
        <span key={i} className={`celebrate-burst__piece celebrate-burst__piece--${(i % 6) + 1}`} />
      ))}
      <div className="celebrate-burst__glow" />
    </div>
  )
}
