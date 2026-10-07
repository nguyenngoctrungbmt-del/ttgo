/** Deep Fisher cover: a lure plunging past glowing deep-sea fish. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Deep Fisher">
      <defs>
        <linearGradient id="fisher-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="0.45" stopColor="#0369a1" />
          <stop offset="1" stopColor="#0b1c33" />
        </linearGradient>
        <linearGradient id="fisher-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
        <radialGradient id="fisher-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#67e8f9" stopOpacity="0.7" />
          <stop offset="1" stopColor="#67e8f9" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="fisher-gold" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#fisher-sea)" />
      <path d="M0 26 Q0 0 26 0 H94 Q120 0 120 26 V24 H0 Z" fill="url(#fisher-sky)" />
      <rect x="0" y="0" width="120" height="24" fill="url(#fisher-sky)" opacity="0" />
      <path d="M0 24 Q15 21 30 24 T60 24 T90 24 T120 24 V27 H0 Z" fill="#e0f2fe" opacity="0.7" />
      {/* light rays */}
      <path d="M20 26 L30 26 L52 100 L40 100 Z M70 26 L78 26 L96 90 L86 90 Z" fill="#fff" opacity="0.08" />
      {/* boat */}
      <path d="M38 16 H70 L66 23 H42 Z" fill="#7c2d12" />
      <rect x="38" y="14" width="32" height="3" fill="#b45309" />
      <circle cx="50" cy="8" r="3.4" fill="#f1c27d" />
      <ellipse cx="50" cy="5.5" rx="5" ry="1.6" fill="#facc15" />
      <rect x="47" y="10" width="6" height="5" rx="1.5" fill="#1d4ed8" />
      <path d="M54 12 Q62 4 70 2" stroke="#44403c" strokeWidth="1.4" fill="none" />
      {/* line */}
      <path d="M70 2 L62 70" stroke="#fff" strokeWidth="1" opacity="0.8" />
      {/* fish */}
      <g transform="translate(30 50)">
        <path d="M-9 0 L-16 -6 L-15 0 L-16 6 Z" fill="#c2410c" />
        <ellipse cx="0" cy="0" rx="10" ry="6" fill="#f97316" />
        <rect x="-2" y="-6" width="2.6" height="12" fill="#fff" />
        <circle cx="5" cy="-1.5" r="1.8" fill="#fff" />
        <circle cx="5.6" cy="-1.5" r="0.9" fill="#111" />
      </g>
      <g transform="translate(92 62) scale(-1 1)">
        <path d="M-12 0 L-21 -8 L-19 0 L-21 8 Z" fill="#172554" />
        <ellipse cx="0" cy="0" rx="13" ry="7" fill="#1e3a8a" />
        <ellipse cx="1" cy="3" rx="10" ry="3" fill="#cbd5e1" />
        <circle cx="7" cy="-2" r="2" fill="#fff" />
        <circle cx="7.6" cy="-2" r="1" fill="#111" />
      </g>
      {/* angler glow */}
      <circle cx="30" cy="92" r="16" fill="url(#fisher-glow)" />
      <g transform="translate(24 98)">
        <ellipse cx="0" cy="0" rx="11" ry="9" fill="#3f3f46" />
        <path d="M5 -6 Q10 -15 13 -9" stroke="#71717a" strokeWidth="1.2" fill="none" />
        <circle cx="13" cy="-9" r="2" fill="#fde047" />
        <path d="M10 0 L4 2 L10 5 Z" fill="#0a0a0a" />
        <circle cx="5" cy="-3" r="1.6" fill="#fff" />
      </g>
      {/* golden fish */}
      <circle cx="96" cy="100" r="13" fill="url(#fisher-gold)" />
      <g transform="translate(96 100)">
        <path d="M-7 0 L-13 -5 L-12 0 L-13 5 Z" fill="#d97706" />
        <ellipse cx="0" cy="0" rx="8" ry="4.6" fill="#fbbf24" />
        <circle cx="4" cy="-1" r="1.3" fill="#111" />
      </g>
      {/* lure */}
      <circle cx="62" cy="74" r="10" fill="#fde047" opacity="0.25" />
      <ellipse cx="62" cy="72" rx="4.5" ry="7" fill="#dc2626" />
      <ellipse cx="62" cy="76" rx="4.5" ry="3" fill="#f8fafc" />
      <path d="M64 81 a3 3 0 1 1 -4 3" stroke="#cbd5e1" strokeWidth="1.6" fill="none" />
      <g stroke="#e0f2fe" strokeWidth="1.6" strokeLinecap="round" opacity="0.7">
        <path d="M56 56 v8 M68 52 v8" />
      </g>
      <circle cx="58" cy="88" r="1.6" fill="#e0f2fe" opacity="0.7" />
      <circle cx="66" cy="94" r="1.2" fill="#e0f2fe" opacity="0.6" />
    </svg>
  )
}
