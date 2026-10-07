/** Street Brawler cover: the hero lands a punch under a street lamp. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Street Brawler">
      <defs>
        <linearGradient id="brawler-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#7c2d12" />
        </linearGradient>
        <radialGradient id="brawler-impact" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="0.5" stopColor="#fde047" />
          <stop offset="1" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="brawler-lamp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fef08a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fef08a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#brawler-sky)" />
      {/* skyline */}
      <path d="M0 78 V50 H14 V40 H28 V56 H40 V34 H54 V60 H70 V44 H84 V52 H100 V38 H120 V78 Z" fill="#1e1b3a" />
      <g fill="#fde68a" opacity="0.8">
        <rect x="18" y="44" width="3" height="4" />
        <rect x="44" y="40" width="3" height="4" />
        <rect x="48" y="48" width="3" height="4" />
        <rect x="104" y="44" width="3" height="4" />
        <rect x="74" y="50" width="3" height="4" />
      </g>
      {/* lamp */}
      <path d="M100 26 L118 96 H82 Z" fill="url(#brawler-lamp)" />
      <rect x="104" y="24" width="3" height="60" fill="#0b0b12" />
      <ellipse cx="100" cy="26" rx="6" ry="3" fill="#fef9c3" />
      {/* ground */}
      <path d="M0 78 H120 V94 Q120 120 94 120 H26 Q0 120 0 94 Z" fill="#374151" />
      <rect x="0" y="92" width="120" height="4" fill="#9ca3af" />
      {/* thug knocked back */}
      <g transform="rotate(-22 86 70)">
        <ellipse cx="88" cy="91" rx="12" ry="3" fill="#000" opacity="0.35" />
        <path d="M84 76 L80 90 M90 76 L94 90" stroke="#0b0b12" strokeWidth="7.5" strokeLinecap="round" />
        <path d="M84 76 L80 90 M90 76 L94 90" stroke="#374151" strokeWidth="5" strokeLinecap="round" />
        <rect x="79" y="54" width="17" height="24" rx="6" fill="#0b0b12" />
        <rect x="80.5" y="55.5" width="14" height="21" rx="5" fill="#16a34a" />
        <circle cx="88" cy="47" r="8" fill="#0b0b12" />
        <circle cx="88" cy="47" r="6.6" fill="#d4a373" />
        <path d="M84 45 l3 3 M87 45 l-3 3" stroke="#111" strokeWidth="1.4" />
      </g>
      {/* impact */}
      <circle cx="72" cy="52" r="15" fill="url(#brawler-impact)" />
      <path d="M72 36 L75 47 L86 44 L77 52 L86 60 L75 57 L72 68 L69 57 L58 60 L67 52 L58 44 L69 47 Z" fill="#fef08a" />
      {/* hero */}
      <ellipse cx="38" cy="96" rx="16" ry="4" fill="#000" opacity="0.4" />
      <path d="M36 76 L28 94 M40 76 L50 94" stroke="#0b0b12" strokeWidth="8.5" strokeLinecap="round" />
      <path d="M36 76 L28 94 M40 76 L50 94" stroke="#1d4ed8" strokeWidth="6" strokeLinecap="round" />
      <rect x="27" y="95" width="9" height="4" rx="1.5" fill="#111827" />
      <rect x="47" y="95" width="9" height="4" rx="1.5" fill="#111827" />
      <rect x="29" y="51" width="19" height="28" rx="7" fill="#0b0b12" transform="rotate(10 38 65)" />
      <rect x="30.5" y="52.5" width="16" height="25" rx="6" fill="#f8fafc" transform="rotate(10 38 65)" />
      <rect x="31" y="71" width="16" height="4" fill="#dc2626" transform="rotate(10 38 65)" />
      <path d="M33 58 L28 66 L35 62" stroke="#0b0b12" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M33 58 L28 66 L35 62" stroke="#f1c27d" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="36" cy="62" r="5" fill="#0b0b12" />
      <circle cx="36" cy="62" r="3.8" fill="#f8fafc" />
      {/* punching arm */}
      <path d="M44 57 L54 54 L64 53" stroke="#0b0b12" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M44 57 L54 54 L64 53" stroke="#f1c27d" strokeWidth="5.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="66" cy="53" r="6.4" fill="#0b0b12" />
      <circle cx="66" cy="53" r="5.2" fill="#f8fafc" />
      <circle cx="43" cy="42" r="9.5" fill="#0b0b12" />
      <circle cx="43" cy="42" r="8.2" fill="#f1c27d" />
      <path d="M35 38 H51 V41 H35 Z" fill="#dc2626" />
      <path d="M35 39 L26 35 L27 42 Z" fill="#dc2626" />
      <circle cx="47" cy="43" r="1.4" fill="#111" />
      <path d="M44 39 L49 40" stroke="#111" strokeWidth="1.4" />
      {/* motion lines */}
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <path d="M14 50 H24 M12 58 H22 M16 66 H25" />
      </g>
    </svg>
  )
}
