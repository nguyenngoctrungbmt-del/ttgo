/** Castle Crash cover: an angry boulder smashing into a crumbling tower. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Castle Crash">
      <defs>
        <linearGradient id="catapult-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#bfdbfe" />
        </linearGradient>
        <radialGradient id="catapult-rock" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#d1d5db" />
          <stop offset="1" stopColor="#6b7280" />
        </radialGradient>
        <linearGradient id="catapult-wood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e0a868" />
          <stop offset="1" stopColor="#a8652f" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#catapult-sky)" />
      <circle cx="96" cy="22" r="10" fill="#fde68a" opacity="0.9" />
      <path d="M0 92 Q30 80 60 90 T120 86 V120 H0 Z" fill="#4f9d4a" />
      <rect x="0" y="100" width="120" height="20" fill="#8b5a2b" />
      <rect x="0" y="98" width="120" height="5" fill="#65a30d" />
      {/* tower */}
      <rect x="70" y="62" width="7" height="36" fill="url(#catapult-wood)" stroke="#5b3413" strokeWidth="1.5" />
      <rect x="99" y="62" width="7" height="36" fill="url(#catapult-wood)" stroke="#5b3413" strokeWidth="1.5" />
      <rect x="66" y="55" width="44" height="7" fill="#c98b4e" stroke="#5b3413" strokeWidth="1.5" transform="rotate(-8 88 58)" />
      <rect x="80" y="40" width="14" height="14" fill="#98a1ab" stroke="#3f4650" strokeWidth="1.5" transform="rotate(14 87 47)" />
      <rect x="96" y="44" width="12" height="12" fill="#bae6fd" fillOpacity="0.7" stroke="#38bdf8" strokeWidth="1.5" transform="rotate(-20 102 50)" />
      {/* guard */}
      <circle cx="88" cy="88" r="9" fill="#7cc443" stroke="#2f5216" strokeWidth="1.5" />
      <path d="M80 85 A8.5 8.5 0 0 1 96 85 Z" fill="#9aa3ae" />
      <ellipse cx="85" cy="89" rx="2" ry="2.6" fill="#fff" />
      <ellipse cx="91" cy="89" rx="2" ry="2.6" fill="#fff" />
      <circle cx="85" cy="89.5" r="1" fill="#111827" />
      <circle cx="91" cy="89.5" r="1" fill="#111827" />
      <ellipse cx="88" cy="94" rx="1.6" ry="1.4" fill="#3f1d0b" />
      {/* debris */}
      <g fill="#c98b4e">
        <rect x="60" y="40" width="5" height="3" transform="rotate(30 62 41)" />
        <rect x="64" y="30" width="4" height="3" transform="rotate(-20 66 31)" />
        <rect x="108" y="34" width="4" height="4" fill="#bae6fd" />
      </g>
      {/* motion lines */}
      <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.85">
        <line x1="10" y1="58" x2="30" y2="50" />
        <line x1="14" y1="70" x2="32" y2="62" />
        <line x1="20" y1="44" x2="34" y2="39" />
      </g>
      {/* angry boulder */}
      <g transform="translate(50 50)">
        <path d="M-16 -4 L-11 -14 L1 -17 L13 -11 L17 1 L11 13 L-2 17 L-13 11 Z" fill="url(#catapult-rock)" stroke="#3b3f46" strokeWidth="2" />
        <ellipse cx="-6" cy="-1" rx="4" ry="4.6" fill="#fff" />
        <ellipse cx="6" cy="-1" rx="4" ry="4.6" fill="#fff" />
        <circle cx="-4.5" cy="0" r="2" fill="#111827" />
        <circle cx="7.5" cy="0" r="2" fill="#111827" />
        <path d="M-12 -8 L-2 -5 M12 -8 L2 -5" stroke="#111827" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M-4 9 Q1 6 6 9" stroke="#111827" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      <g fill="#fde047">
        <path d="M68 46 l5 -3 l-1 5 l5 1 l-5 3 l1 5 l-4 -3 l-4 3 l1 -5 l-5 -1 l5 -2 Z" />
      </g>
    </svg>
  )
}
