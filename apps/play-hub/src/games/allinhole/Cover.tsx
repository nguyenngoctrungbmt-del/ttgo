/** All in Hole cover: a black hole on a tilted table swallowing toys and fruit. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="All in Hole">
      <defs>
        <linearGradient id="allinhole-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="allinhole-table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7c48f" />
          <stop offset="1" stopColor="#f5deb3" />
        </linearGradient>
        <radialGradient id="allinhole-hole" cx="0.5" cy="0.62" r="0.6">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.75" stopColor="#0b1020" />
          <stop offset="1" stopColor="#1e293b" />
        </radialGradient>
        <radialGradient id="allinhole-ball" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#fca5a5" />
          <stop offset="0.6" stopColor="#ef4444" />
          <stop offset="1" stopColor="#991b1b" />
        </radialGradient>
        <radialGradient id="allinhole-orange" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#fed7aa" />
          <stop offset="0.6" stopColor="#f97316" />
          <stop offset="1" stopColor="#9a3412" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#allinhole-bg)" />
      <path d="M10 46 L110 46 L116 104 L4 104 Z" fill="#8b5a2b" transform="translate(0 6)" />
      <path d="M10 46 L110 46 L116 104 L4 104 Z" fill="url(#allinhole-table)" />
      <g stroke="#926230" strokeOpacity="0.2" strokeWidth="1.5">
        <path d="M35 46 L32 104M60 46 V104M85 46 L88 104" />
      </g>
      {/* hole */}
      <ellipse cx="60" cy="80" rx="27" ry="15" fill="url(#allinhole-hole)" />
      <path d="M34 78 A27 15 0 0 1 86 78 A26 11 0 0 0 34 78" fill="#475569" opacity="0.55" />
      <ellipse cx="60" cy="80" rx="27" ry="15" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="2" />
      {/* tipping cube */}
      <g transform="rotate(28 50 74)">
        <rect x="42" y="64" width="14" height="12" rx="2" fill="#7c3aed" />
        <rect x="42" y="60" width="14" height="7" rx="2" fill="#c4b5fd" />
      </g>
      {/* falling ball inside */}
      <circle cx="66" cy="80" r="6" fill="url(#allinhole-ball)" opacity="0.85" />
      {/* items around */}
      <ellipse cx="96" cy="66" rx="7" ry="3" fill="#000" opacity="0.2" />
      <circle cx="95" cy="60" r="7" fill="url(#allinhole-orange)" />
      <path d="M95 53 l1 -3" stroke="#166534" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="22" cy="70" rx="7" ry="3" fill="#000" opacity="0.2" />
      <g transform="translate(15 56)">
        <rect width="14" height="13" rx="2" fill="#e5e7eb" />
        <rect y="-4" width="14" height="6" rx="2" fill="#fff" />
        <circle cx="4" cy="5" r="1.5" fill="#1f2937" />
        <circle cx="10" cy="9" r="1.5" fill="#1f2937" />
      </g>
      <ellipse cx="88" cy="96" rx="9" ry="3" fill="#000" opacity="0.2" />
      <ellipse cx="88" cy="92" rx="9" ry="5" fill="#f472b6" />
      <ellipse cx="88" cy="92" rx="3" ry="1.6" fill="#78350f" />
      {/* motion swirl */}
      <g stroke="#fff" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.85">
        <path d="M24 92 q8 6 14 2" />
        <path d="M18 84 q6 4 10 2" />
      </g>
      <g fill="#fff7ed">
        <path d="M60 22 l2.5 5 5 1.5 -5 1.5 -2.5 5 -2.5 -5 -5 -1.5 5 -1.5 Z" />
        <path d="M94 26 l1.5 3 3 1 -3 1 -1.5 3 -1.5 -3 -3 -1 3 -1 Z" />
      </g>
    </svg>
  )
}
