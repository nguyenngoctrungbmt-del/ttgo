/** Sky Archer cover: an arrow streaking through balloons toward a bullseye. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Sky Archer">
      <defs>
        <linearGradient id="archer-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#bae6fd" />
        </linearGradient>
        <radialGradient id="archer-red" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.25" stopColor="#ef4444" />
          <stop offset="1" stopColor="#991b1b" />
        </radialGradient>
        <radialGradient id="archer-yel" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.25" stopColor="#facc15" />
          <stop offset="1" stopColor="#a16207" />
        </radialGradient>
        <radialGradient id="archer-blu" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.25" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1e3a8a" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#archer-sky)" />
      <circle cx="96" cy="22" r="10" fill="#fffbeb" opacity="0.9" />
      <path d="M0 96 Q30 80 60 92 T120 88 V120 H0 Z" fill="#4ade80" />
      <path d="M0 106 H120 V120 H0 Z" fill="#16a34a" />
      {/* target */}
      <g transform="translate(92 66)">
        <rect x="-2.5" y="0" width="5" height="40" fill="#78350f" />
        <circle r="18" fill="#f8fafc" />
        <circle r="14.4" fill="#1f2937" />
        <circle r="10.8" fill="#2563eb" />
        <circle r="7.2" fill="#dc2626" />
        <circle r="3.6" fill="#facc15" />
      </g>
      {/* balloons */}
      <path d="M34 50 q4 8 0 16" stroke="#fff" strokeWidth="1" fill="none" />
      <ellipse cx="34" cy="38" rx="9" ry="11" fill="url(#archer-red)" />
      <path d="M58 30 q-3 8 1 15" stroke="#fff" strokeWidth="1" fill="none" />
      <ellipse cx="58" cy="20" rx="8" ry="10" fill="url(#archer-yel)" />
      <path d="M16 74 q3 7 0 13" stroke="#fff" strokeWidth="1" fill="none" />
      <ellipse cx="16" cy="64" rx="7.5" ry="9.5" fill="url(#archer-blu)" />
      {/* popped burst */}
      <g fill="#22c55e">
        <rect x="56" y="52" width="4" height="4" transform="rotate(20 58 54)" />
        <rect x="66" y="46" width="3.5" height="3.5" transform="rotate(-30 67 47)" />
        <rect x="62" y="62" width="3" height="3" />
      </g>
      {/* arrow trail + arrow */}
      <path d="M8 104 Q40 56 78 64" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" strokeDasharray="1 5" />
      <g transform="translate(80 64) rotate(8)">
        <line x1="-30" y1="0" x2="-2" y2="0" stroke="#92400e" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M5 0 L-4 -4 L-2 0 L-4 4 Z" fill="#e2e8f0" />
        <path d="M-24 0 L-32 -5 L-30 0 L-32 5 Z" fill="#f43f5e" />
      </g>
    </svg>
  )
}
