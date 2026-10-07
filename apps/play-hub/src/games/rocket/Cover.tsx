/** Rocket Builder cover: a striped rocket with boosters blasting past clouds toward the Moon. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Rocket Builder">
      <defs>
        <linearGradient id="rocket-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="0.55" stopColor="#6d28d9" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
        <linearGradient id="rocket-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#94a3b8" />
          <stop offset="0.35" stopColor="#ffffff" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="rocket-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff7ed" />
          <stop offset="0.3" stopColor="#fde047" />
          <stop offset="0.7" stopColor="#f97316" />
          <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="rocket-moon" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#94a3b8" />
        </radialGradient>
        <clipPath id="rocket-clip">
          <rect width="120" height="120" rx="26" />
        </clipPath>
      </defs>
      <g clipPath="url(#rocket-clip)">
        <rect width="120" height="120" fill="url(#rocket-sky)" />
        {[
          [14, 14, 1.2],
          [30, 30, 0.8],
          [98, 52, 1],
          [76, 10, 0.9],
          [20, 50, 0.7],
          [104, 30, 0.8],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="#fff" />
        ))}
        <circle cx="94" cy="22" r="13" fill="url(#rocket-moon)" />
        <circle cx="90" cy="19" r="2.6" fill="#94a3b8" opacity="0.6" />
        <circle cx="98" cy="27" r="1.8" fill="#94a3b8" opacity="0.6" />
        {/* clouds */}
        <g fill="#fff" opacity="0.9">
          <ellipse cx="22" cy="104" rx="22" ry="8" />
          <ellipse cx="36" cy="98" rx="12" ry="7" />
          <ellipse cx="98" cy="108" rx="24" ry="8" />
          <ellipse cx="84" cy="102" rx="11" ry="6" />
        </g>
        <g transform="rotate(18 60 62)">
          {/* flames */}
          <path d="M53 88 Q52 104 60 118 Q68 104 67 88 Z" fill="url(#rocket-flame)" />
          <path d="M42 84 Q41 96 45 104 Q49 96 48 84 Z" fill="url(#rocket-flame)" />
          <path d="M72 84 Q71 96 75 104 Q79 96 78 84 Z" fill="url(#rocket-flame)" />
          {/* boosters */}
          <rect x="41" y="58" width="8" height="27" fill="url(#rocket-body)" />
          <rect x="71" y="58" width="8" height="27" fill="url(#rocket-body)" />
          <path d="M41 58 Q45 49 49 58 Z M71 58 Q75 49 79 58 Z" fill="#fb923c" />
          <rect x="41" y="70" width="8" height="3" fill="#f97316" />
          <rect x="71" y="70" width="8" height="3" fill="#f97316" />
          {/* body */}
          <rect x="51" y="40" width="18" height="46" fill="url(#rocket-body)" />
          <rect x="51" y="54" width="18" height="4" fill="#ef4444" />
          <rect x="51" y="72" width="18" height="4" fill="#7c3aed" />
          <path d="M51 40 Q51 26 60 16 Q69 26 69 40 Z" fill="#ef4444" />
          <path d="M53 38 Q54 27 60 20 L60 38 Z" fill="#fca5a5" opacity="0.7" />
          <circle cx="60" cy="47" r="4.2" fill="#334155" />
          <circle cx="60" cy="47" r="3" fill="#7dd3fc" />
          <circle cx="59" cy="46" r="1" fill="#fff" />
          <path d="M51 76 L44 90 L51 88 Z M69 76 L76 90 L69 88 Z" fill="#dc2626" />
          <path d="M54 86 H66 L68 91 H52 Z" fill="#334155" />
        </g>
        <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6">
          <line x1="30" y1="70" x2="22" y2="88" />
          <line x1="98" y1="76" x2="92" y2="90" />
        </g>
      </g>
    </svg>
  )
}
