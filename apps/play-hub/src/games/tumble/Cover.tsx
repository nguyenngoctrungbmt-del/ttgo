/** Tumble Tower cover: a wooden block tower with one block sliding out. */
export default function Cover() {
  const front = '#d9a066'
  const top = '#f3cf9c'
  const side = '#a86f3c'
  // Oblique tower: alternate three end-blocks and one long side block per layer
  const layers = [0, 1, 2, 3, 4, 5]
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Tumble Tower">
      <defs>
        <radialGradient id="tumble-bg" cx="0.5" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#7c4a21" />
          <stop offset="1" stopColor="#2a180c" />
        </radialGradient>
        <linearGradient id="tumble-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="1" stopColor="#ca8a04" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#tumble-bg)" />
      <rect x="0" y="100" width="120" height="20" fill="#7c4a21" />
      <rect x="0" y="98" width="120" height="4" fill="#a0632e" />
      <ellipse cx="62" cy="100" rx="30" ry="4" fill="rgba(0,0,0,0.35)" />
      {layers.map((l) => {
        const y = 92 - l * 11
        if (l % 2 === 0) {
          return (
            <g key={l}>
              {[0, 1, 2].map((i) => (
                <g key={i}>
                  <path d={`M${38 + i * 12} ${y} l6 -5 h12 l-6 5 Z`} fill={top} />
                  <rect x={38 + i * 12} y={y} width="12" height="9" fill={front} stroke="#7c4a21" strokeWidth="0.6" />
                </g>
              ))}
              <path d={`M74 ${y} l6 -5 v9 l-6 5 Z`} fill={side} />
            </g>
          )
        }
        return (
          <g key={l}>
            <path d={`M38 ${y} l6 -5 h36 l-6 5 Z`} fill={top} />
            <rect x="38" y={y} width="36" height="9" fill="#e3b27a" stroke="#7c4a21" strokeWidth="0.6" />
            <path d={`M74 ${y} l6 -5 v9 l-6 5 Z`} fill={side} />
            <path d={`M76 ${y + 3} l2 -1.6`} stroke="#7c4a21" strokeWidth="0.8" />
          </g>
        )
      })}
      {/* block sliding out of layer 2 */}
      <g transform="translate(-14 10)">
        <path d="M50 70 l6 -5 h12 l-6 5 Z" fill="#fef08a" />
        <rect x="50" y="70" width="12" height="9" fill="url(#tumble-gold)" stroke="#92400e" strokeWidth="0.6" />
      </g>
      <g stroke="#fde68a" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <line x1="22" y1="84" x2="30" y2="84" />
        <line x1="20" y1="89" x2="31" y2="89" />
      </g>
      {/* hovering block above */}
      <g transform="rotate(-6 60 26)">
        <path d="M44 28 l6 -5 h24 l-6 5 Z" fill={top} />
        <rect x="44" y="28" width="24" height="8" fill="#e3b27a" stroke="#7c4a21" strokeWidth="0.6" />
      </g>
      <path d="M56 42 v6 M62 42 v6" stroke="#fde047" strokeWidth="1.6" strokeDasharray="2 2" />
    </svg>
  )
}
