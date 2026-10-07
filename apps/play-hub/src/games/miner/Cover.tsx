/** Gold Claw cover: a claw hauling a giant nugget out of layered earth. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Gold Claw">
      <defs>
        <linearGradient id="miner-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#e0f2fe" />
        </linearGradient>
        <linearGradient id="miner-earth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a16207" />
          <stop offset="0.5" stopColor="#713f12" />
          <stop offset="1" stopColor="#3b210a" />
        </linearGradient>
        <radialGradient id="miner-gold" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff7c2" />
          <stop offset="0.35" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#b45309" />
        </radialGradient>
        <radialGradient id="miner-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.6" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#miner-earth)" />
      <path d="M0 26 Q0 0 26 0 H94 Q120 0 120 26 V34 H0 Z" fill="url(#miner-sky)" />
      <rect x="0" y="32" width="120" height="6" fill="#65a30d" />
      <path d="M0 62 Q30 56 60 62 T120 60 M0 90 Q40 84 70 90 T120 88" stroke="#3b210a" strokeWidth="2" fill="none" opacity="0.5" />
      {/* winch */}
      <rect x="44" y="16" width="32" height="5" fill="#92400e" />
      <rect x="46" y="20" width="4" height="13" fill="#78350f" />
      <rect x="70" y="20" width="4" height="13" fill="#78350f" />
      <ellipse cx="60" cy="27" rx="9" ry="5" fill="#a16207" />
      {/* rope */}
      <path d="M60 27 L74 66" stroke="#1c1917" strokeWidth="2.4" />
      {/* diamond & rock */}
      <path d="M20 76 L24 71 H32 L36 76 L28 86 Z" fill="#0891b2" />
      <path d="M20 76 L24 71 L28 76 L28 86 Z" fill="#67e8f9" />
      <path d="M96 100 L104 94 L114 98 L112 108 L100 110 Z" fill="#78716c" />
      <path d="M100 98 L106 96 L108 102" stroke="#44403c" strokeWidth="1.2" fill="none" />
      <circle cx="16" cy="104" r="6" fill="#fcd34d" stroke="#92400e" strokeWidth="1" />
      {/* nugget being hauled */}
      <circle cx="78" cy="82" r="26" fill="url(#miner-glow)" />
      <path d="M62 80 L68 68 L82 66 L92 74 L94 88 L84 97 L68 96 L60 88 Z" fill="url(#miner-gold)" stroke="#92400e" strokeWidth="1.6" />
      <ellipse cx="71" cy="74" rx="5" ry="2.6" fill="#fff" opacity="0.6" transform="rotate(-30 71 74)" />
      <path d="M88 70 l1.6 4 l4 1.6 l-4 1.6 l-1.6 4 l-1.6 -4 l-4 -1.6 l4 -1.6 Z" fill="#fff" />
      {/* claw */}
      <g transform="rotate(-20 74 64)">
        <rect x="68" y="58" width="12" height="8" rx="2.5" fill="#334155" />
        <path d="M70 64 Q64 70 68 76 M78 64 Q84 70 80 76" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M70 64 Q64 70 68 76 M78 64 Q84 70 80 76" stroke="#cbd5e1" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </g>
      {/* sun */}
      <circle cx="98" cy="14" r="7" fill="#fde047" />
    </svg>
  )
}
