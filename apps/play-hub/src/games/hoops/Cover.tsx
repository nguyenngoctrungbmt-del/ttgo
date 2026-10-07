/** Basket Flick cover: a flaming ball dropping through a swishing net. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Basket Flick">
      <defs>
        <linearGradient id="hoops-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="0.65" stopColor="#7c2d12" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <radialGradient id="hoops-ball" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fed7aa" />
          <stop offset="0.5" stopColor="#f97316" />
          <stop offset="1" stopColor="#9a3412" />
        </radialGradient>
        <linearGradient id="hoops-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ef4444" stopOpacity="0" />
          <stop offset="0.5" stopColor="#f97316" />
          <stop offset="1" stopColor="#fde047" />
        </linearGradient>
        <linearGradient id="hoops-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#hoops-bg)" />
      {/* backboard */}
      <rect x="26" y="14" width="68" height="44" rx="4" fill="url(#hoops-glass)" stroke="#ef4444" strokeWidth="3" />
      <rect x="47" y="30" width="26" height="18" fill="none" stroke="#ef4444" strokeWidth="2.5" />
      {/* net */}
      <g stroke="#ffffff" strokeWidth="1.6" opacity="0.95">
        <path d="M40 60 L46 84 M50 61 L52 86 M60 61 L60 86 M70 61 L68 86 M80 60 L74 84" />
        <path d="M40 60 L52 86 M50 61 L60 86 M60 61 L68 86 M70 61 L74 84 M80 60 L68 86 M70 61 L60 86 M60 61 L52 86 M50 61 L46 84" />
        <path d="M43 72 Q60 76 77 72 M46 84 Q60 88 74 84" fill="none" />
      </g>
      {/* flame trail */}
      <path d="M50 4 Q40 22 52 40 Q58 26 66 40 Q76 20 66 4 Z" fill="url(#hoops-flame)" opacity="0.9" />
      {/* ball */}
      <circle cx="60" cy="52" r="14" fill="url(#hoops-ball)" />
      <g stroke="#431407" strokeWidth="1.6" fill="none">
        <path d="M46 52 H74 M60 38 V66" />
        <path d="M50 41 Q56 52 50 63 M70 41 Q64 52 70 63" />
      </g>
      {/* rim (front) */}
      <ellipse cx="60" cy="60" rx="22" ry="5" fill="none" stroke="#ea580c" strokeWidth="4" />
      <path d="M38 60 A22 5 0 0 0 82 60" fill="none" stroke="#fb923c" strokeWidth="4" />
      {/* sparkles */}
      <g fill="#fde047">
        <circle cx="24" cy="76" r="2.5" />
        <circle cx="96" cy="72" r="2" />
        <circle cx="90" cy="96" r="2.5" />
        <circle cx="30" cy="98" r="1.8" />
      </g>
      <g stroke="#fde68a" strokeWidth="2" strokeLinecap="round">
        <line x1="20" y1="62" x2="30" y2="64" />
        <line x1="100" y1="58" x2="90" y2="62" />
      </g>
    </svg>
  )
}
