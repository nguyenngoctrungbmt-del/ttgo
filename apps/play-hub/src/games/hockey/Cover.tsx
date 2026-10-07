/** Air Hockey cover: neon table, a mallet smashing a glowing puck toward goal. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Air Hockey">
      <defs>
        <radialGradient id="hockey-table" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0" stopColor="#1d4ed8" />
          <stop offset="1" stopColor="#0a1838" />
        </radialGradient>
        <radialGradient id="hockey-mallet" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.3" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#0e7490" />
        </radialGradient>
        <radialGradient id="hockey-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f472b6" stopOpacity="0.8" />
          <stop offset="1" stopColor="#f472b6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hockey-puck" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#64748b" />
          <stop offset="1" stopColor="#0f172a" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="#020617" />
      <rect x="10" y="8" width="100" height="104" rx="16" fill="url(#hockey-table)" />
      <g fill="#93c5fd" opacity="0.2">
        {[20, 34, 48, 62, 76, 90].map((x) => [18, 32, 46, 74, 88, 102].map((y) => <circle key={`${x}-${y}`} cx={x + 5} cy={y} r="1.2" />))}
      </g>
      <line x1="10" y1="60" x2="110" y2="60" stroke="#f472b6" strokeWidth="2.5" opacity="0.8" />
      <circle cx="60" cy="60" r="16" fill="none" stroke="#67e8f9" strokeWidth="2" opacity="0.6" />
      <rect x="10" y="8" width="100" height="104" rx="16" fill="none" stroke="#22d3ee" strokeWidth="3" />
      <rect x="40" y="5" width="40" height="6" rx="2" fill="#000" />
      <path d="M40 8 H80" stroke="#f472b6" strokeWidth="2" />
      {/* puck rocketing upward */}
      <g stroke="#f9a8d4" strokeWidth="3" strokeLinecap="round" opacity="0.7">
        <line x1="62" y1="62" x2="56" y2="78" />
        <line x1="70" y1="60" x2="64" y2="76" />
      </g>
      <circle cx="70" cy="44" r="18" fill="url(#hockey-glow)" />
      <circle cx="70" cy="44" r="9" fill="url(#hockey-puck)" stroke="#f9a8d4" strokeWidth="2.5" />
      <circle cx="70" cy="44" r="4.5" fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeWidth="1.2" />
      {/* mallet */}
      <ellipse cx="51" cy="90" rx="17" ry="15" fill="#000" opacity="0.35" />
      <circle cx="48" cy="86" r="17" fill="url(#hockey-mallet)" stroke="#67e8f9" strokeWidth="2.5" />
      <circle cx="48" cy="86" r="11" fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="2" />
      <circle cx="46" cy="83" r="7.5" fill="#cffafe" />
      {/* impact spark */}
      <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
        <line x1="60" y1="68" x2="66" y2="64" />
        <line x1="56" y1="66" x2="57" y2="60" />
        <line x1="62" y1="73" x2="68" y2="73" />
      </g>
    </svg>
  )
}
