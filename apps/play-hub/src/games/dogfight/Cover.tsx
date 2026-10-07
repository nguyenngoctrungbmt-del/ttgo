/** Dogfight Ace cover: a fighter banking over the sea, chasing a red bandit. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Dogfight Ace">
      <defs>
        <linearGradient id="dogfight-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0891b2" />
          <stop offset="1" stopColor="#164e63" />
        </linearGradient>
        <radialGradient id="dogfight-cloud" cx="0.4" cy="0.35" r="0.65">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e2e8f0" />
        </radialGradient>
        <linearGradient id="dogfight-trail" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#dogfight-sea)" />
      <path d="M8 96 q6 -3 12 0 M70 104 q6 -3 12 0 M90 20 q5 -3 10 0" stroke="#cffafe" strokeWidth="1.5" fill="none" opacity="0.5" />
      <ellipse cx="22" cy="30" rx="18" ry="10" fill="#fde68a" opacity="0.85" />
      <ellipse cx="22" cy="30" rx="13" ry="7" fill="#65a30d" />
      {/* enemy */}
      <g transform="translate(84 34) rotate(-35) scale(0.9)">
        <path d="M-3 -18 L6 -17 L9 0 L6 17 L-3 18 L-6 0 Z" fill="#dc2626" />
        <path d="M-15 -8 L-11 -8 L-10 0 L-11 8 L-15 8 L-14 0 Z" fill="#dc2626" />
        <path d="M16 0 Q10 -4.5 -4 -3.5 L-15 -1.5 L-15 1.5 L-4 3.5 Q10 4.5 16 0 Z" fill="#ef4444" />
        <circle cx="1" cy="-11" r="3" fill="#fef2f2" />
        <circle cx="1" cy="11" r="3" fill="#fef2f2" />
      </g>
      {/* tracers */}
      <g stroke="#fde047" strokeWidth="2.4" strokeLinecap="round">
        <line x1="58" y1="58" x2="66" y2="51" />
        <line x1="70" y1="48" x2="76" y2="43" />
        <line x1="54" y1="54" x2="61" y2="48" />
      </g>
      {/* contrails */}
      <path d="M8 118 Q22 96 32 84" stroke="url(#dogfight-trail)" strokeWidth="3" fill="none" />
      <path d="M26 120 Q40 102 50 92" stroke="url(#dogfight-trail)" strokeWidth="3" fill="none" />
      {/* player */}
      <g transform="translate(46 74) rotate(-40) scale(1.7)">
        <path d="M-3 -18 L6 -17 L9 0 L6 17 L-3 18 L-6 0 Z" fill="#e2e8f0" />
        <path d="M-3 0 L9 0 L6 17 L-3 18 L-6 0 Z" fill="#94a3b8" />
        <path d="M-15 -8 L-11 -8 L-10 0 L-11 8 L-15 8 L-14 0 Z" fill="#e2e8f0" />
        <path d="M16 0 Q10 -4.5 -4 -3.5 L-15 -1.5 L-15 1.5 L-4 3.5 Q10 4.5 16 0 Z" fill="#f8fafc" />
        <circle cx="1" cy="-11" r="3.4" fill="#2563eb" />
        <circle cx="1" cy="-11" r="2" fill="#fff" />
        <circle cx="1" cy="-11" r="0.9" fill="#dc2626" />
        <circle cx="1" cy="11" r="3.4" fill="#2563eb" />
        <circle cx="1" cy="11" r="2" fill="#fff" />
        <circle cx="1" cy="11" r="0.9" fill="#dc2626" />
        <ellipse cx="3" cy="0" rx="4.5" ry="2.4" fill="#38bdf8" />
        <ellipse cx="17" cy="0" rx="1.3" ry="8" fill="none" stroke="#e2e8f0" strokeWidth="1" opacity="0.7" />
      </g>
      {/* high cloud */}
      <g opacity="0.85">
        <circle cx="98" cy="92" r="12" fill="url(#dogfight-cloud)" />
        <circle cx="110" cy="98" r="10" fill="url(#dogfight-cloud)" />
        <circle cx="88" cy="102" r="9" fill="url(#dogfight-cloud)" />
      </g>
    </svg>
  )
}
