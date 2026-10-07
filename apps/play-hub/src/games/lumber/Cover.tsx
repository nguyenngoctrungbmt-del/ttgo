/** Lumber Chop cover: a bearded lumberjack mid-swing, a log flying off the trunk. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Lumber Chop">
      <defs>
        <linearGradient id="lumber-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#dcfce7" />
        </linearGradient>
        <linearGradient id="lumber-bark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a2a10" />
          <stop offset="0.4" stopColor="#a16a3a" />
          <stop offset="1" stopColor="#4a2a10" />
        </linearGradient>
        <linearGradient id="lumber-axe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#lumber-sky)" />
      <circle cx="96" cy="20" r="10" fill="#fef08a" />
      <path d="M0 92 Q30 76 60 88 T120 84 V120 H0 Z" fill="#4ade80" />
      <rect x="0" y="100" width="120" height="20" fill="#4d7c0f" />
      {/* trunk */}
      <rect x="62" y="0" width="26" height="102" fill="url(#lumber-bark)" />
      <g stroke="#3f2410" strokeWidth="1.4" opacity="0.5">
        <line x1="62" y1="30" x2="88" y2="30" />
        <line x1="62" y1="52" x2="88" y2="52" />
        <line x1="62" y1="74" x2="88" y2="74" />
      </g>
      {/* branch with leaves */}
      <path d="M88 20 Q100 18 112 16 L112 22 Q100 25 88 27 Z" fill="#6b3f1d" />
      <circle cx="110" cy="16" r="8" fill="#15803d" />
      <circle cx="104" cy="12" r="6" fill="#22c55e" />
      {/* flying log */}
      <g transform="translate(100 60) rotate(28)">
        <rect x="-12" y="-9" width="24" height="18" rx="2" fill="url(#lumber-bark)" />
        <ellipse cx="-12" cy="0" rx="3" ry="9" fill="#fde68a" />
      </g>
      <g fill="#fde68a">
        <rect x="92" y="78" width="4" height="4" transform="rotate(20 94 80)" />
        <rect x="104" y="44" width="3" height="3" />
        <rect x="90" y="48" width="3" height="3" />
      </g>
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <path d="M44 46 Q58 46 62 62" fill="none" />
        <path d="M40 54 Q52 54 56 66" fill="none" />
      </g>
      {/* lumberjack */}
      <ellipse cx="38" cy="103" rx="16" ry="3.5" fill="#000" opacity="0.25" />
      <rect x="29" y="84" width="7" height="18" rx="2" fill="#1e3a8a" />
      <rect x="39" y="84" width="7" height="18" rx="2" fill="#1e3a8a" />
      <rect x="27" y="99" width="10" height="5" rx="2" fill="#422006" />
      <rect x="38" y="99" width="11" height="5" rx="2" fill="#422006" />
      <rect x="27" y="61" width="22" height="26" rx="7" fill="#dc2626" />
      <g stroke="#7f1d1d" strokeWidth="1.5" opacity="0.6">
        <line x1="33" y1="62" x2="33" y2="86" />
        <line x1="39" y1="62" x2="39" y2="86" />
        <line x1="44" y1="62" x2="44" y2="86" />
        <line x1="27" y1="70" x2="49" y2="70" />
        <line x1="27" y1="78" x2="49" y2="78" />
      </g>
      <circle cx="39" cy="52" r="9" fill="#f5c39b" />
      <path d="M31 51 Q31 64 40 64 Q49 64 48 52 Q44 57 39 57 Q34 57 31 51 Z" fill="#78350f" />
      <circle cx="44" cy="49" r="1.6" fill="#1f2937" />
      <path d="M30 47 A9.5 9.5 0 0 1 48 47 Z" fill="#15803d" />
      <circle cx="37" cy="37" r="3" fill="#fef9c3" />
      {/* arm + axe mid swing */}
      <g transform="translate(42 66) rotate(-18)">
        <rect x="-2" y="-4" width="16" height="8" rx="4" fill="#b91c1c" />
        <rect x="10" y="-1.8" width="22" height="3.6" fill="#92400e" />
        <path d="M27 -2 L27 3 Q34 6 36 11 Q39 1 36 -12 Q33 -6 27 -2 Z" fill="url(#lumber-axe)" />
      </g>
    </svg>
  )
}
