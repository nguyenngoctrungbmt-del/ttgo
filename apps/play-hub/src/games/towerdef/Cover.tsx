/** Tower Rush cover: a stone tesla tower zapping goblins on a winding path. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Tower Rush">
      <defs>
        <linearGradient id="towerdef-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#65a30d" />
          <stop offset="1" stopColor="#365314" />
        </linearGradient>
        <radialGradient id="towerdef-orb" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#0e7490" />
        </radialGradient>
        <radialGradient id="towerdef-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#a5f3fc" stopOpacity="0.8" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="towerdef-stone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#towerdef-bg)" />
      {/* winding path */}
      <path d="M-5 28 H86 Q100 28 100 42 V58 Q100 72 86 72 H34 Q20 72 20 86 V125" fill="none" stroke="#7c4a1e" strokeWidth="20" strokeLinejoin="round" />
      <path d="M-5 28 H86 Q100 28 100 42 V58 Q100 72 86 72 H34 Q20 72 20 86 V125" fill="none" stroke="#d9b27a" strokeWidth="15" strokeLinejoin="round" />
      {/* trees */}
      <circle cx="104" cy="104" r="11" fill="#2f5d12" />
      <circle cx="101" cy="100" r="7" fill="#4d7c0f" />
      <circle cx="12" cy="52" r="8" fill="#2f5d12" />
      <circle cx="10" cy="49" r="5" fill="#4d7c0f" />
      {/* goblins on path */}
      <g transform="translate(78 72)">
        <ellipse cx="0" cy="7" rx="7" ry="2.5" fill="#000" opacity="0.3" />
        <path d="M-6 -2 L-12 -7 L-6 1 Z M6 -2 L12 -7 L6 1 Z" fill="#65a30d" />
        <ellipse cx="0" cy="0" rx="7" ry="6.5" fill="#65a30d" stroke="#365314" strokeWidth="1.2" />
        <circle cx="-2" cy="-1" r="1.8" fill="#fff" />
        <circle cx="3" cy="-1" r="1.8" fill="#fff" />
        <circle cx="-1.5" cy="-0.8" r="0.9" fill="#111" />
        <circle cx="3.5" cy="-0.8" r="0.9" fill="#111" />
      </g>
      <g transform="translate(46 72)">
        <ellipse cx="0" cy="7" rx="6" ry="2.2" fill="#000" opacity="0.3" />
        <ellipse cx="0" cy="0" rx="6" ry="5.5" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.2" />
        <path d="M-3 -4 L-4 -9 L-1 -5 Z M2 -5 L4 -10 L4 -4 Z" fill="#fef3c7" />
        <circle cx="-1.5" cy="-1" r="1.5" fill="#fde047" />
        <circle cx="2.5" cy="-1" r="1.5" fill="#fde047" />
      </g>
      {/* lightning */}
      <path d="M60 40 L66 52 L62 54 L76 70" fill="none" stroke="#22d3ee" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <path d="M60 40 L66 52 L62 54 L76 70" fill="none" stroke="#f0f9ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M52 40 L48 54 L52 56 L46 68" fill="none" stroke="#f0f9ff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      {/* tower */}
      <ellipse cx="57" cy="60" rx="20" ry="6" fill="#000" opacity="0.3" />
      <path d="M40 58 L42 46 H72 L74 58 Z" fill="#334155" />
      <path d="M41 56 L43 45 H71 L73 56 Z" fill="url(#towerdef-stone)" />
      <path d="M41 56 L43 45 H71 L73 56 Z" fill="none" stroke="#fbbf24" strokeWidth="1.6" />
      <rect x="54" y="18" width="6" height="28" fill="#57534e" />
      {[42, 36, 30, 24].map((y, i) => (
        <g key={y}>
          <ellipse cx="57" cy={y + 1.2} rx={11 - i} ry={3.5 - i * 0.3} fill="#92400e" />
          <ellipse cx="57" cy={y} rx={11 - i} ry={3.5 - i * 0.3} fill={i % 2 ? '#f59e0b' : '#d97706'} />
        </g>
      ))}
      <circle cx="57" cy="15" r="14" fill="url(#towerdef-glow)" />
      <circle cx="57" cy="15" r="7" fill="url(#towerdef-orb)" />
      <path d="M44 41 V31 L36 34 L44 37" fill="#dc2626" />
      <path d="M70 41 V31 L78 34 L70 37" fill="#dc2626" />
      <circle cx="80" cy="74" r="10" fill="#fde047" opacity="0.35" />
    </svg>
  )
}
