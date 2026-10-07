/** Route Recall cover: a taxi turning at a city junction toward a map pin. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Route Recall">
      <defs>
        <linearGradient id="route-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#075985" />
        </linearGradient>
        <linearGradient id="route-taxi" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#eab308" />
          <stop offset="0.5" stopColor="#fde047" />
          <stop offset="1" stopColor="#eab308" />
        </linearGradient>
        <radialGradient id="route-pin" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fecaca" />
          <stop offset="1" stopColor="#dc2626" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#route-bg)" />
      {/* blocks */}
      <rect x="8" y="8" width="38" height="38" rx="6" fill="#cbd5e1" />
      <rect x="74" y="8" width="38" height="38" rx="6" fill="#cbd5e1" />
      <rect x="8" y="74" width="38" height="38" rx="6" fill="#cbd5e1" />
      <rect x="74" y="74" width="38" height="38" rx="6" fill="#4ade80" />
      <rect x="12" y="12" width="14" height="14" fill="#f87171" />
      <rect x="28" y="12" width="14" height="14" fill="#a78bfa" />
      <rect x="12" y="28" width="30" height="14" fill="#facc15" />
      <rect x="78" y="12" width="30" height="30" fill="#38bdf8" />
      <rect x="12" y="78" width="30" height="30" fill="#fb923c" />
      <circle cx="86" cy="86" r="7" fill="#16a34a" />
      <circle cx="100" cy="98" r="7" fill="#22c55e" />
      {/* road lines */}
      <path d="M60 0 V48 M60 72 V120 M0 60 H48 M72 60 H120" stroke="#fff" strokeWidth="2" strokeDasharray="6 6" opacity="0.7" />
      {/* route */}
      <path d="M66 118 V68 Q66 55 79 55 H120" stroke="#fde047" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="1 9" />
      {/* taxi */}
      <g transform="translate(66 84) rotate(25)">
        <rect x="-10" y="-17" width="20" height="34" rx="6" fill="#000" opacity="0.3" transform="translate(2 3)" />
        <rect x="-10" y="-17" width="20" height="34" rx="6" fill="url(#route-taxi)" stroke="#a16207" strokeWidth="1" />
        <rect x="-7.5" y="-11" width="15" height="6" rx="2" fill="#1e3a5f" />
        <rect x="-7" y="8" width="14" height="4" rx="1.5" fill="#1e3a5f" />
        <rect x="-10" y="-1" width="20" height="3" fill="#111827" />
        <rect x="-10" y="-1" width="4" height="1.5" fill="#fff" />
        <rect x="-2" y="-1" width="4" height="1.5" fill="#fff" />
        <rect x="6" y="-1" width="4" height="1.5" fill="#fff" />
        <rect x="-8" y="-17" width="4" height="2" fill="#fef9c3" />
        <rect x="4" y="-17" width="4" height="2" fill="#fef9c3" />
      </g>
      {/* turn arrow */}
      <path d="M44 96 V84 Q44 76 52 76 H56" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.9" />
      <path d="M55 70 L63 76 L55 82 Z" fill="#fff" opacity="0.9" />
      {/* pin */}
      <g transform="translate(100 44)">
        <ellipse cx="0" cy="14" rx="7" ry="2.5" fill="#000" opacity="0.3" />
        <path d="M0 13 C-11 2 -9 -12 0 -12 C9 -12 11 2 0 13 Z" fill="url(#route-pin)" stroke="#7f1d1d" strokeWidth="1.2" />
        <circle cx="0" cy="-3" r="3.5" fill="#fff" />
      </g>
    </svg>
  )
}
