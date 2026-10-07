/** Goal Keeper cover: a keeper at full stretch tipping a fizzing ball past the post. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Goal Keeper">
      <defs>
        <linearGradient id="goalie-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0f172a" />
          <stop offset="0.55" stopColor="#1e3a5f" />
          <stop offset="0.56" stopColor="#22a447" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="goalie-jersey" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9f99d" />
          <stop offset="0.5" stopColor="#a3e635" />
          <stop offset="1" stopColor="#4d7c0f" />
        </linearGradient>
        <radialGradient id="goalie-ball" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9ca3af" />
        </radialGradient>
        <radialGradient id="goalie-light" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fef9c3" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fef9c3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#goalie-bg)" />
      <circle cx="18" cy="14" r="22" fill="url(#goalie-light)" />
      <circle cx="102" cy="14" r="22" fill="url(#goalie-light)" />
      {/* net */}
      <g stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1">
        {[22, 32, 42, 52, 62, 72, 82, 92].map((x) => (
          <line key={x} x1={x} y1="34" x2={x} y2="66" />
        ))}
        {[40, 48, 56, 64].map((y) => (
          <line key={y} x1="16" y1={y} x2="104" y2={y} />
        ))}
      </g>
      {/* posts */}
      <rect x="12" y="28" width="5" height="40" rx="2" fill="#f8fafc" />
      <rect x="103" y="28" width="5" height="40" rx="2" fill="#f8fafc" />
      <rect x="12" y="27" width="96" height="5" rx="2" fill="#ffffff" />
      {/* diving keeper */}
      <g transform="rotate(-28 60 62)">
        <path d="M30 70 L50 66" stroke="#111827" strokeWidth="8" strokeLinecap="round" />
        <path d="M32 78 L52 70" stroke="#111827" strokeWidth="8" strokeLinecap="round" />
        <circle cx="29" cy="70" r="4" fill="#a3e635" />
        <circle cx="31" cy="78" r="4" fill="#a3e635" />
        <rect x="48" y="58" width="30" height="18" rx="8" fill="url(#goalie-jersey)" />
        <path d="M76 62 L94 56" stroke="#a3e635" strokeWidth="7" strokeLinecap="round" />
        <path d="M76 70 L95 66" stroke="#65a30d" strokeWidth="7" strokeLinecap="round" />
        <circle cx="84" cy="74" r="7" fill="#e0ac69" />
        <path d="M78 72 A7 7 0 0 1 90 70" fill="#3f2a14" />
        <ellipse cx="98" cy="55" rx="6" ry="7" fill="#ffffff" stroke="#334155" strokeWidth="1" />
        <ellipse cx="99" cy="66" rx="6" ry="7" fill="#ffffff" stroke="#334155" strokeWidth="1" />
        <circle cx="98" cy="56" r="2.5" fill="#f97316" />
        <circle cx="99" cy="67" r="2.5" fill="#f97316" />
      </g>
      {/* ball with motion lines */}
      <g stroke="#fde68a" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
        <line x1="66" y1="100" x2="84" y2="80" />
        <line x1="58" y1="96" x2="74" y2="78" />
        <line x1="74" y1="106" x2="88" y2="90" />
      </g>
      <circle cx="92" cy="34" r="9" fill="url(#goalie-ball)" />
      <path d="M92 29 l4 3 -1.5 4.5 h-5 l-1.5 -4.5 z" fill="#111827" />
      <circle cx="92" cy="34" r="12" fill="none" stroke="#fde047" strokeWidth="2" strokeDasharray="4 3" />
      {/* impact sparks */}
      <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
        <line x1="104" y1="22" x2="110" y2="18" />
        <line x1="104" y1="40" x2="111" y2="42" />
        <line x1="96" y1="20" x2="98" y2="14" />
      </g>
    </svg>
  )
}
