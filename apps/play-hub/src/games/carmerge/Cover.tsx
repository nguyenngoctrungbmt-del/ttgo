/** Car Merge cover: two cars fusing into a red supercar on an oval track. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Car Merge">
      <defs>
        <linearGradient id="carmerge-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22c55e" />
          <stop offset="1" stopColor="#14532d" />
        </linearGradient>
        <linearGradient id="carmerge-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7f1d1d" />
          <stop offset="0.5" stopColor="#fca5a5" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
        <linearGradient id="carmerge-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="0.5" stopColor="#93c5fd" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="carmerge-flame" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#fde047" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="carmerge-pop" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#fde047" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#carmerge-bg)" />
      <ellipse cx="60" cy="64" rx="64" ry="40" fill="#ffffff" />
      <ellipse cx="60" cy="64" rx="61" ry="37" fill="#334155" />
      <ellipse cx="60" cy="64" rx="36" ry="16" fill="#ffffff" />
      <ellipse cx="60" cy="64" rx="34" ry="14" fill="#16a34a" />
      <ellipse cx="60" cy="64" rx="48" ry="26" fill="none" stroke="#ffffff" strokeOpacity="0.3" strokeDasharray="6 6" />
      {/* grandstand crowd */}
      <rect x="14" y="8" width="92" height="14" rx="4" fill="#475569" />
      {[18, 26, 34, 42, 50, 58, 66, 74, 82, 90, 98].map((x, i) => (
        <circle key={x} cx={x} cy={14 + (i % 2) * 3} r="2.4" fill={['#f87171', '#facc15', '#60a5fa', '#f472b6'][i % 4]} />
      ))}
      <circle cx="60" cy="88" r="20" fill="url(#carmerge-pop)" />
      {/* small blue cars merging */}
      <g transform="translate(14 96) rotate(-10)">
        <rect x="0" y="-6" width="20" height="12" rx="4" fill="url(#carmerge-blue)" stroke="#0b0f19" strokeWidth="1.2" />
        <rect x="12" y="-4" width="4" height="8" rx="1" fill="#0f172a" />
      </g>
      <g transform="translate(106 96) rotate(190)">
        <rect x="0" y="-6" width="20" height="12" rx="4" fill="url(#carmerge-blue)" stroke="#0b0f19" strokeWidth="1.2" />
        <rect x="12" y="-4" width="4" height="8" rx="1" fill="#0f172a" />
      </g>
      {/* supercar */}
      <g transform="translate(60 84) rotate(-8)">
        <path d="M-48 0 q8 -6 16 -5 q-6 5 -6 5 q0 0 6 5 q-8 1 -16 -5z" fill="url(#carmerge-flame)" />
        <rect x="-26" y="-14" width="7" height="6" rx="2" fill="#111827" />
        <rect x="14" y="-14" width="8" height="6" rx="2" fill="#111827" />
        <rect x="-26" y="8" width="7" height="6" rx="2" fill="#111827" />
        <rect x="14" y="8" width="8" height="6" rx="2" fill="#111827" />
        <path d="M-30 -10 L8 -12 L32 -3 L32 3 L8 12 L-30 10 Z" fill="url(#carmerge-body)" stroke="#0b0f19" strokeWidth="1.6" strokeLinejoin="round" />
        <rect x="-34" y="-12" width="6" height="24" rx="2" fill="#0b0f19" />
        <path d="M-6 -7 L12 -5 L12 5 L-6 7 Z" fill="#1e3a8a" stroke="#0b0f19" strokeWidth="1.2" />
        <path d="M-2 -5 L8 -4" stroke="#bfdbfe" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <line x1="8" y1="78" x2="18" y2="78" />
        <line x1="4" y1="86" x2="12" y2="86" />
      </g>
    </svg>
  )
}
