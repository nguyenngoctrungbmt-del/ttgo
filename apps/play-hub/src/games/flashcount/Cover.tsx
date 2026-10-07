/** Flash Count cover: a burst of objects popping off a felt table with a camera-flash sparkle. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Flash Count">
      <defs>
        <linearGradient id="flashcount-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor="#9a3412" />
        </linearGradient>
        <radialGradient id="flashcount-felt" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#042f2e" />
        </radialGradient>
        <radialGradient id="flashcount-apple" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fecaca" />
          <stop offset="0.5" stopColor="#ef4444" />
          <stop offset="1" stopColor="#991b1b" />
        </radialGradient>
        <radialGradient id="flashcount-star" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="0.55" stopColor="#facc15" />
          <stop offset="1" stopColor="#ca8a04" />
        </radialGradient>
        <radialGradient id="flashcount-flash" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#flashcount-bg)" />
      <ellipse cx="60" cy="92" rx="50" ry="20" fill="url(#flashcount-felt)" stroke="#fbbf24" strokeWidth="2.5" />
      <circle cx="60" cy="44" r="34" fill="url(#flashcount-flash)" />
      {/* motion lines */}
      <g stroke="#fff7ed" strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
        <line x1="24" y1="30" x2="16" y2="24" />
        <line x1="96" y1="30" x2="104" y2="24" />
        <line x1="60" y1="12" x2="60" y2="4" />
      </g>
      {/* gem */}
      <g transform="translate(26 70)">
        <path d="M-12 -4 L-6 -12 L6 -12 L12 -4 L0 12 Z" fill="#0891b2" stroke="#155e75" strokeWidth="1.5" />
        <path d="M-6 -12 L6 -12 L4 -4 L-4 -4 Z" fill="#67e8f9" />
        <path d="M-4 -4 L4 -4 L0 12 Z" fill="#22d3ee" />
      </g>
      {/* apple */}
      <g transform="translate(90 72)">
        <path d="M0 -8 C6 -14 14 -6 12 2 C10 10 4 13 0 10 C-4 13 -10 10 -12 2 C-14 -6 -6 -14 0 -8 Z" fill="url(#flashcount-apple)" stroke="#7f1d1d" strokeWidth="1.2" />
        <ellipse cx="-5" cy="-3" rx="2" ry="3.5" fill="#fff" opacity="0.6" />
        <path d="M0 -8 q1 -4 3 -6" stroke="#78350f" strokeWidth="2" fill="none" strokeLinecap="round" />
        <ellipse cx="6" cy="-13" rx="4" ry="2" fill="#22c55e" transform="rotate(-25 6 -13)" />
      </g>
      {/* star with face */}
      <g transform="translate(60 46)">
        <path d="M0 -24 L6.5 -8 L23 -7.5 L10 3 L14.5 19.5 L0 10 L-14.5 19.5 L-10 3 L-23 -7.5 L-6.5 -8 Z" fill="url(#flashcount-star)" stroke="#a16207" strokeWidth="2" strokeLinejoin="round" />
        <ellipse cx="-5" cy="-1" rx="2.2" ry="3" fill="#1f2937" />
        <ellipse cx="5" cy="-1" rx="2.2" ry="3" fill="#1f2937" />
        <path d="M-4 5 Q0 9 4 5" stroke="#1f2937" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      </g>
      {/* critter */}
      <g transform="translate(60 92)">
        <path d="M-13 6 C-15 -6 -8 -13 0 -13 C8 -13 15 -6 13 6 Q0 12 -13 6 Z" fill="#4ade80" stroke="#14532d" strokeWidth="1.5" />
        <circle cx="-4.5" cy="-3" r="3.5" fill="#fff" />
        <circle cx="4.5" cy="-3" r="3.5" fill="#fff" />
        <circle cx="-4" cy="-2.5" r="1.8" fill="#111827" />
        <circle cx="5" cy="-2.5" r="1.8" fill="#111827" />
      </g>
      {/* count badge */}
      <circle cx="95" cy="22" r="13" fill="#fde047" stroke="#422006" strokeWidth="2" />
      <path d="M91 22 h8 M95 18 v8" stroke="#422006" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
