/** Fruit Drop cover: a glass jar of smiling fruit with a watermelon dropping in. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Fruit Drop">
      <defs>
        <linearGradient id="fruitmerge-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdba74" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <radialGradient id="fruitmerge-wm" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#bbf7d0" />
          <stop offset="0.5" stopColor="#22c55e" />
          <stop offset="1" stopColor="#14532d" />
        </radialGradient>
        <radialGradient id="fruitmerge-or" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffedd5" />
          <stop offset="0.5" stopColor="#f97316" />
          <stop offset="1" stopColor="#9a3412" />
        </radialGradient>
        <radialGradient id="fruitmerge-gr" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#f3e8ff" />
          <stop offset="0.5" stopColor="#9333ea" />
          <stop offset="1" stopColor="#3b0764" />
        </radialGradient>
        <radialGradient id="fruitmerge-ch" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fecdd3" />
          <stop offset="0.5" stopColor="#e11d48" />
          <stop offset="1" stopColor="#7f1d1d" />
        </radialGradient>
        <linearGradient id="fruitmerge-glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e0f2fe" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="1" stopColor="#e0f2fe" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#fruitmerge-bg)" />
      <circle cx="20" cy="22" r="3" fill="#fff7ed" opacity="0.5" />
      <circle cx="100" cy="16" r="2" fill="#fff7ed" opacity="0.5" />
      {/* jar back */}
      <rect x="22" y="44" width="76" height="66" rx="12" fill="url(#fruitmerge-glass)" />
      {/* fruit inside */}
      <circle cx="44" cy="93" r="13" fill="url(#fruitmerge-or)" />
      <circle cx="74" cy="92" r="14" fill="url(#fruitmerge-gr)" />
      <circle cx="58" cy="74" r="9" fill="url(#fruitmerge-ch)" />
      <circle cx="84" cy="70" r="7" fill="url(#fruitmerge-ch)" />
      <g fill="#1f2937">
        <circle cx="40" cy="92" r="1.6" />
        <circle cx="48" cy="92" r="1.6" />
        <circle cx="70" cy="91" r="1.6" />
        <circle cx="78" cy="91" r="1.6" />
        <circle cx="55" cy="74" r="1.2" />
        <circle cx="61" cy="74" r="1.2" />
      </g>
      <g stroke="#1f2937" strokeWidth="1.3" fill="none" strokeLinecap="round">
        <path d="M41 96 q3 3 6 0" />
        <path d="M71 95 q3 3 6 0" />
        <path d="M56 77 q2 2 4 0" />
      </g>
      {/* jar rim + highlight */}
      <path d="M22 44 V100 q0 10 10 10 H88 q10 0 10 -10 V44" fill="none" stroke="#ffffff" strokeWidth="3" opacity="0.9" />
      <rect x="27" y="50" width="4" height="44" rx="2" fill="#ffffff" opacity="0.4" />
      <line x1="24" y1="58" x2="96" y2="58" stroke="#ef4444" strokeWidth="1.6" strokeDasharray="4 3" opacity="0.7" />
      {/* falling watermelon */}
      <g transform="translate(60 26)">
        <circle r="17" fill="url(#fruitmerge-wm)" />
        <path d="M-9 -14 q-3 14 0 28 M0 -17 q-2 17 0 34 M9 -14 q3 14 0 28" stroke="#14532d" strokeWidth="2.6" fill="none" opacity="0.8" />
        <ellipse cx="-7" cy="-8" rx="4" ry="2.2" fill="#ffffff" opacity="0.6" transform="rotate(-35 -7 -8)" />
        <ellipse cx="-5.5" cy="1" rx="2.6" ry="3" fill="#ffffff" />
        <ellipse cx="5.5" cy="1" rx="2.6" ry="3" fill="#ffffff" />
        <circle cx="-5" cy="1.5" r="1.6" fill="#1f2937" />
        <circle cx="6" cy="1.5" r="1.6" fill="#1f2937" />
        <path d="M-3 7 q3 3 6 0" stroke="#1f2937" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>
      <g stroke="#fff7ed" strokeWidth="2.2" strokeLinecap="round" opacity="0.7">
        <line x1="38" y1="8" x2="38" y2="18" />
        <line x1="82" y1="6" x2="82" y2="16" />
      </g>
    </svg>
  )
}
