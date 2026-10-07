/** Wave Surfer cover: a surfer flying off the lip of a curling barrel at sunset. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Wave Surfer">
      <defs>
        <linearGradient id="surf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="surf-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="0.4" stopColor="#0e7490" />
          <stop offset="1" stopColor="#075985" />
        </linearGradient>
        <linearGradient id="surf-lip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#5eead4" />
        </linearGradient>
        <linearGradient id="surf-board" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fed7aa" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#surf-sky)" />
      <circle cx="96" cy="22" r="10" fill="#fef3c7" />
      {/* wave face */}
      <path d="M0 120 L0 62 Q 30 40 60 58 Q 90 74 120 70 L120 120 Z" fill="url(#surf-face)" />
      <path d="M10 72 Q 40 66 70 76 M20 88 Q 60 82 100 92" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="2" fill="none" />
      {/* curling lip and tube */}
      <path d="M0 104 Q 4 70 18 54 Q 30 42 50 52" fill="none" stroke="url(#surf-lip)" strokeWidth="12" strokeLinecap="round" />
      <path d="M2 100 Q 8 74 20 60" fill="none" stroke="#0c4a6e" strokeOpacity="0.4" strokeWidth="8" />
      <g fill="#ffffff">
        <circle cx="6" cy="108" r="8" />
        <circle cx="16" cy="112" r="6" />
        <circle cx="30" cy="48" r="2.5" />
        <circle cx="38" cy="42" r="2" />
      </g>
      {/* spray trail */}
      <path d="M58 60 Q 66 46 72 40" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 5" fill="none" />
      {/* airborne surfer */}
      <g transform="translate(82 38) rotate(-28)">
        <path d="M-22 6 Q -20 2 0 2 Q 20 2 24 6 Q 20 10 0 10 Q -20 10 -22 6 Z" fill="url(#surf-board)" />
        <rect x="-12" y="5" width="26" height="1.8" fill="#fde047" />
        <path d="M-7 3 L-6 -6 L-1 -12 M7 3 L8 -5 L2 -12" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" fill="none" />
        <path d="M0 -12 L5 -24" stroke="#0f172a" strokeWidth="6.5" strokeLinecap="round" />
        <path d="M5 -23 L-7 -30 M5 -23 L17 -18" stroke="#f0b48a" strokeWidth="3" strokeLinecap="round" />
        <circle cx="8" cy="-30" r="4.8" fill="#f0b48a" />
        <path d="M3 -31 A5 5 0 0 1 13 -32 L6 -29 Z" fill="#facc15" />
      </g>
      {/* shark fin */}
      <path d="M92 96 Q 98 88 102 80 Q 103 90 110 96 Z" fill="#334155" />
      <ellipse cx="100" cy="96" rx="13" ry="2.5" fill="#ffffff" opacity="0.8" />
    </svg>
  )
}
