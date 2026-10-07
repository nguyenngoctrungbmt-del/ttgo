/** Bubble Blast cover: the blowfish shooter firing up into a cluster of glossy bubbles. */
export default function Cover() {
  const bubbles: Array<[number, number, string, string]> = [
    [24, 20, 'bubble-r', ''],
    [44, 20, 'bubble-b', ''],
    [64, 20, 'bubble-b', ''],
    [84, 20, 'bubble-y', ''],
    [104, 20, 'bubble-g', ''],
    [34, 37, 'bubble-r', ''],
    [54, 37, 'bubble-p', ''],
    [74, 37, 'bubble-y', ''],
    [94, 37, 'bubble-g', ''],
    [44, 54, 'bubble-p', ''],
    [84, 54, 'bubble-y', ''],
  ]
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Bubble Blast">
      <defs>
        <linearGradient id="bubble-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        {[
          ['bubble-r', '#fecaca', '#ef4444', '#7f1d1d'],
          ['bubble-b', '#bfdbfe', '#3b82f6', '#1e3a8a'],
          ['bubble-y', '#fef9c3', '#facc15', '#854d0e'],
          ['bubble-g', '#bbf7d0', '#22c55e', '#14532d'],
          ['bubble-p', '#e9d5ff', '#a855f7', '#4c1d95'],
        ].map(([id, a, b, c]) => (
          <radialGradient key={id} id={id} cx="0.35" cy="0.3" r="0.75">
            <stop offset="0" stopColor={a} />
            <stop offset="0.5" stopColor={b} />
            <stop offset="1" stopColor={c} />
          </radialGradient>
        ))}
        <radialGradient id="bubble-fish" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#a5f3fc" />
          <stop offset="0.6" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0e7490" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#bubble-bg)" />
      <rect x="0" y="6" width="120" height="5" fill="#94a3b8" opacity="0.7" />
      {bubbles.map(([x, y, id], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="9.6" fill={`url(#${id})`} />
          <ellipse cx={x - 3.5} cy={y - 4} rx="3" ry="1.7" fill="#fff" opacity="0.8" transform={`rotate(-35 ${x - 3.5} ${y - 4})`} />
        </g>
      ))}
      {/* popping trio */}
      <g fill="#fde047">
        <circle cx="64" cy="54" r="2" />
        <circle cx="70" cy="60" r="1.4" />
        <circle cx="58" cy="61" r="1.6" />
      </g>
      <circle cx="64" cy="54" r="12" fill="none" stroke="#fef08a" strokeWidth="2" opacity="0.8" />
      {/* guide + shot */}
      <g fill="#fff" opacity="0.85">
        <circle cx="62" cy="84" r="1.5" />
        <circle cx="63" cy="77" r="1.5" />
      </g>
      <circle cx="64" cy="68" r="8" fill="url(#bubble-b)" />
      <ellipse cx="61" cy="65" rx="2.4" ry="1.4" fill="#fff" opacity="0.8" />
      {/* blowfish */}
      <g transform="translate(60 103)">
        <path d="M-14 0 Q-24 -6 -22 6 Z M14 0 Q24 -6 22 6 Z" fill="#0e7490" />
        <circle r="14" fill="url(#bubble-fish)" />
        <ellipse cx="-5" cy="-2" rx="3.2" ry="3.6" fill="#fff" />
        <ellipse cx="5" cy="-2" rx="3.2" ry="3.6" fill="#fff" />
        <circle cx="-4.6" cy="-3.4" r="1.5" fill="#0f172a" />
        <circle cx="5.4" cy="-3.4" r="1.5" fill="#0f172a" />
        <ellipse cx="0" cy="6" rx="2" ry="2.4" fill="#7f1d1d" />
        <ellipse cx="-9" cy="4" rx="2" ry="1.2" fill="#f472b6" opacity="0.6" />
        <ellipse cx="9" cy="4" rx="2" ry="1.2" fill="#f472b6" opacity="0.6" />
      </g>
    </svg>
  )
}
