/** Glass Smash cover: a chrome ball bursting through a glass pane down a bright corridor. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Glass Smash">
      <defs>
        <radialGradient id="smash-fog" cx="0.5" cy="0.46" r="0.6">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#7dd3fc" />
        </radialGradient>
        <radialGradient id="smash-ball" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#1e293b" />
        </radialGradient>
        <linearGradient id="smash-crystal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecfeff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#smash-fog)" />
      {/* corridor perspective */}
      <g fill="none" stroke="#0284c7" strokeWidth="1.2" opacity="0.55">
        <path d="M0 0 L46 42 M120 0 L74 42 M0 120 L46 78 M120 120 L74 78" />
        <rect x="46" y="42" width="28" height="36" />
        <rect x="32" y="29" width="56" height="62" opacity="0.6" />
        <rect x="16" y="14" width="88" height="92" opacity="0.35" />
      </g>
      {/* shattering pane */}
      <g stroke="#ffffff" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M30 26 L58 30 L52 56 L28 50 Z" fill="#bae6fd" fillOpacity="0.55" />
        <path d="M64 28 L92 24 L94 52 L68 56 Z" fill="#bae6fd" fillOpacity="0.5" />
        <path d="M26 58 L50 62 L46 92 L22 88 Z" fill="#bae6fd" fillOpacity="0.45" />
        <path d="M70 62 L96 58 L98 90 L74 94 Z" fill="#bae6fd" fillOpacity="0.5" />
        <path d="M14 18 L22 14 L20 24 Z M100 16 L108 20 L100 26 Z M104 98 L112 100 L106 106 Z M10 98 L18 96 L14 106 Z" fill="#e0f2fe" />
      </g>
      <g stroke="#ffffff" strokeWidth="1.3" opacity="0.9">
        <path d="M61 58 L46 40 M61 58 L80 42 M61 58 L44 76 M61 58 L80 78 M61 58 L61 34" />
      </g>
      {/* crystal */}
      <path d="M90 66 L96 74 L90 84 L84 74 Z" fill="url(#smash-crystal)" stroke="#ffffff" strokeWidth="1" />
      <path d="M90 66 L90 84" stroke="#ffffff" strokeWidth="0.8" />
      {/* ball with motion */}
      <g stroke="#0ea5e9" strokeWidth="2.4" strokeLinecap="round" opacity="0.7">
        <line x1="72" y1="80" x2="86" y2="96" />
        <line x1="66" y1="84" x2="76" y2="102" />
      </g>
      <circle cx="61" cy="62" r="11" fill="url(#smash-ball)" />
      <ellipse cx="57" cy="57.5" rx="3.6" ry="2.2" fill="#ffffff" opacity="0.85" />
    </svg>
  )
}
