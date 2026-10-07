/** Beat Tapper cover: a neon four-lane highway under a synthwave sun, notes rushing in. */
export default function Cover() {
  const lanes = ['#22d3ee', '#e879f9', '#facc15', '#4ade80']
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Beat Tapper">
      <defs>
        <linearGradient id="beats-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="0.45" stopColor="#831843" />
          <stop offset="0.46" stopColor="#0b0620" />
          <stop offset="1" stopColor="#05030f" />
        </linearGradient>
        <linearGradient id="beats-sun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="1" stopColor="#fb7185" />
        </linearGradient>
        <radialGradient id="beats-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#e879f9" stopOpacity="0" />
        </radialGradient>
        <clipPath id="beats-clip">
          <rect width="120" height="120" rx="26" />
        </clipPath>
      </defs>
      <g clipPath="url(#beats-clip)">
        <rect width="120" height="120" fill="url(#beats-sky)" />
        <path d="M38 55 A22 22 0 0 1 82 55 Z" fill="url(#beats-sun)" />
        <g fill="#831843">
          <rect x="36" y="46" width="48" height="1.6" />
          <rect x="36" y="50" width="48" height="2.2" />
        </g>
        {/* highway */}
        <path d="M50 55 L70 55 L112 120 L8 120 Z" fill="#ffffff" opacity="0.07" />
        <g stroke="#f472b6" strokeWidth="1.6">
          <line x1="50" y1="55" x2="8" y2="120" />
          <line x1="70" y1="55" x2="112" y2="120" />
        </g>
        <g stroke="#ffffff" strokeWidth="1" opacity="0.35">
          <line x1="55" y1="55" x2="34" y2="120" />
          <line x1="60" y1="55" x2="60" y2="120" />
          <line x1="65" y1="55" x2="86" y2="120" />
        </g>
        {/* notes */}
        <rect x="52" y="64" width="6" height="3" rx="1.5" fill={lanes[1]} />
        <rect x="62.5" y="70" width="8" height="4" rx="2" fill={lanes[2]} />
        <rect x="36" y="84" width="12" height="6" rx="3" fill={lanes[0]} />
        <path d="M72 82 L82 82 L90 104 L78 104 Z" fill={lanes[3]} opacity="0.55" />
        <rect x="75" y="100" width="17" height="8" rx="4" fill={lanes[3]} />
        {/* hit line + burst */}
        <g opacity="0.95">
          {lanes.map((c, i) => (
            <rect key={c} x={12 + i * 25} y="106" width="21" height="6" rx="3" fill="none" stroke={c} strokeWidth="2" />
          ))}
        </g>
        <circle cx="35" cy="105" r="14" fill="url(#beats-glow)" />
        <g stroke="#a5f3fc" strokeWidth="2" strokeLinecap="round">
          <line x1="35" y1="96" x2="35" y2="88" />
          <line x1="26" y1="99" x2="21" y2="94" />
          <line x1="44" y1="99" x2="49" y2="94" />
        </g>
        <rect x="25" y="103" width="20" height="7" rx="3.5" fill="#22d3ee" />
        <rect x="28" y="104" width="13" height="1.8" rx="0.9" fill="#fff" opacity="0.8" />
      </g>
    </svg>
  )
}
