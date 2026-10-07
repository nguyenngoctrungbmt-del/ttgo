/** Neon Racer cover: a neon sports car boosting down a night highway past traffic. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Neon Racer">
      <defs>
        <linearGradient id="racer-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#0b0820" />
        </linearGradient>
        <linearGradient id="racer-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e2140" />
          <stop offset="1" stopColor="#14152a" />
        </linearGradient>
        <linearGradient id="racer-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0e7490" />
          <stop offset="0.5" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        <linearGradient id="racer-flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#f0abfc" />
          <stop offset="1" stopColor="#a21caf" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="racer-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.6" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#racer-bg)" />
      {/* city blocks */}
      <rect x="2" y="8" width="18" height="30" fill="#2e1065" />
      <rect x="2" y="48" width="18" height="34" fill="#172554" />
      <rect x="100" y="16" width="18" height="38" fill="#172554" />
      <rect x="100" y="66" width="18" height="30" fill="#2e1065" />
      <g fill="#f472b6" opacity="0.8">
        <rect x="6" y="14" width="3" height="4" />
        <rect x="13" y="22" width="3" height="4" />
        <rect x="104" y="24" width="3" height="4" />
        <rect x="111" y="74" width="3" height="4" />
      </g>
      <g fill="#22d3ee" opacity="0.8">
        <rect x="6" y="56" width="3" height="4" />
        <rect x="111" y="34" width="3" height="4" />
        <rect x="104" y="82" width="3" height="4" />
      </g>
      {/* road */}
      <rect x="22" y="0" width="76" height="120" fill="url(#racer-road)" />
      <rect x="23" y="0" width="2.5" height="120" fill="#f0abfc" />
      <rect x="94.5" y="0" width="2.5" height="120" fill="#22d3ee" />
      <g fill="#e2e8f0" opacity="0.5">
        <rect x="59" y="-4" width="2.5" height="14" />
        <rect x="59" y="24" width="2.5" height="14" />
        <rect x="59" y="52" width="2.5" height="14" />
        <rect x="59" y="108" width="2.5" height="14" />
      </g>
      {/* traffic car ahead */}
      <g transform="translate(78 22)">
        <rect x="-8" y="-14" width="16" height="28" rx="4" fill="#ef4444" />
        <rect x="-6" y="-8" width="12" height="6" rx="1.5" fill="#1e293b" />
        <rect x="-6" y="5" width="12" height="4" rx="1.5" fill="#1e293b" />
        <circle cx="-5" cy="13" r="2.5" fill="#fca5a5" />
        <circle cx="5" cy="13" r="2.5" fill="#fca5a5" />
        <circle cx="8" cy="13" r="3" fill="#fbbf24" opacity="0.9" />
      </g>
      {/* speed lines */}
      <g stroke="#a5f3fc" strokeWidth="1.6" strokeLinecap="round" opacity="0.55">
        <line x1="34" y1="30" x2="34" y2="54" />
        <line x1="88" y1="56" x2="88" y2="86" />
        <line x1="30" y1="76" x2="30" y2="104" />
      </g>
      {/* hero car */}
      <circle cx="52" cy="70" r="30" fill="url(#racer-glow)" />
      <path d="M44 94 L48 94 L46 116 Z M56 94 L60 94 L58 116 Z" fill="url(#racer-flame)" />
      <g transform="translate(52 72)">
        <rect x="-15" y="-15" width="4" height="9" rx="1.5" fill="#020617" />
        <rect x="11" y="-15" width="4" height="9" rx="1.5" fill="#020617" />
        <rect x="-15" y="8" width="4" height="9" rx="1.5" fill="#020617" />
        <rect x="11" y="8" width="4" height="9" rx="1.5" fill="#020617" />
        <rect x="-12" y="-24" width="24" height="46" rx="9" fill="url(#racer-body)" stroke="#083344" strokeWidth="1.2" />
        <path d="M-9 -10 L9 -10 L10 -1 L-10 -1 Z" fill="#0f172a" />
        <path d="M-6 -9 L-3 -2" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.2" />
        <rect x="-9" y="-1" width="18" height="11" rx="3" fill="#a5f3fc" />
        <path d="M-9 11 L9 11 L7 17 L-7 17 Z" fill="#0f172a" />
        <rect x="-4" y="-24" width="2.2" height="13" fill="#f0abfc" />
        <rect x="1.8" y="-24" width="2.2" height="13" fill="#f0abfc" />
        <rect x="-10" y="-23.5" width="6" height="2.5" rx="1" fill="#fef9c3" />
        <rect x="4" y="-23.5" width="6" height="2.5" rx="1" fill="#fef9c3" />
        <rect x="-11" y="19" width="22" height="3" rx="1.5" fill="#083344" />
      </g>
    </svg>
  )
}
