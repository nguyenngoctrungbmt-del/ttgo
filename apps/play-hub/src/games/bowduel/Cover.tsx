/** Bow Duel cover: a hero archer at full draw on a hilltop, arrow streaking away. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Bow Duel">
      <defs>
        <linearGradient id="bowduel-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f97316" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="bowduel-hill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f766e" />
          <stop offset="1" stopColor="#134e4a" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#bowduel-sky)" />
      <circle cx="88" cy="30" r="13" fill="#fff7ed" opacity="0.9" />
      <path d="M0 80 Q30 66 60 78 T120 70 V120 H0 Z" fill="#b45309" opacity="0.55" />
      <path d="M0 98 Q24 84 46 92 Q80 106 120 92 V120 H0 Z" fill="url(#bowduel-hill)" />
      <path d="M0 98 Q24 84 46 92 Q80 106 120 92" fill="none" stroke="#4ade80" strokeWidth="3" />
      {/* archer */}
      <g transform="translate(34 90)">
        <path d="M-1 -20 L-6 -2 M2 -20 L7 -2" stroke="#1e3a8a" strokeWidth="5" strokeLinecap="round" />
        <rect x="-8" y="-42" width="16" height="24" rx="6" fill="#2563eb" />
        <rect x="-8" y="-24" width="16" height="3" fill="#fbbf24" />
        <path d="M-4 -37 L-16 -36" stroke="#1d4ed8" strokeWidth="4" strokeLinecap="round" />
        <circle cx="1" cy="-52" r="11" fill="#f2c094" />
        <path d="M-10 -53 A11 11 0 0 1 12 -55 Z" fill="#f97316" />
        <ellipse cx="13" cy="-55" rx="6" ry="1.8" fill="#f97316" />
        <ellipse cx="5" cy="-52" rx="2" ry="2.4" fill="#fff" />
        <circle cx="6" cy="-52" r="1.2" fill="#111827" />
        <path d="M2 -46 L8 -46" stroke="#7f1d1d" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M2 -38 L20 -42" stroke="#2563eb" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M14 -60 Q30 -42 16 -24" fill="none" stroke="#7c2d12" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M14 -60 L-14 -37 L16 -24" fill="none" stroke="#f8fafc" strokeWidth="1" />
      </g>
      {/* flying arrow */}
      <g transform="translate(88 50) rotate(-18)">
        <line x1="-22" y1="0" x2="0" y2="0" stroke="#7c4a21" strokeWidth="2.4" />
        <path d="M5 0 L-3 -4 L-1 0 L-3 4 Z" fill="#e2e8f0" />
        <path d="M-17 0 L-24 -5 L-21 0 L-24 5 Z" fill="#ef4444" />
      </g>
      <g stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.8">
        <line x1="54" y1="64" x2="66" y2="60" />
        <line x1="58" y1="72" x2="68" y2="68" />
      </g>
      {/* rival in the distance */}
      <g transform="translate(104 92) scale(0.55)">
        <rect x="-8" y="-42" width="16" height="24" rx="6" fill="#15803d" />
        <circle cx="0" cy="-52" r="11" fill="#f2c094" />
        <path d="M-12 -50 A12 12 0 0 1 12 -50 L12 -44 L-14 -40 Z" fill="#166534" />
        <path d="M-1 -20 L-5 -2 M2 -20 L6 -2" stroke="#57534e" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  )
}
