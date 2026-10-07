/** Potion Shop cover: a bubbling cauldron launching a sparkling potion, crystals merging beside it. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Potion Shop">
      <defs>
        <linearGradient id="potionmerge-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4c1d95" />
          <stop offset="1" stopColor="#1e1b2e" />
        </linearGradient>
        <linearGradient id="potionmerge-pot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#52525b" />
          <stop offset="1" stopColor="#09090b" />
        </linearGradient>
        <radialGradient id="potionmerge-brew" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.3" stopColor="#4ade80" />
          <stop offset="1" stopColor="#14532d" />
        </radialGradient>
        <linearGradient id="potionmerge-liquid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f472b6" />
          <stop offset="1" stopColor="#be185d" />
        </linearGradient>
        <linearGradient id="potionmerge-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="0.6" stopColor="#f97316" />
          <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="potionmerge-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f0abfc" stopOpacity="0.8" />
          <stop offset="1" stopColor="#f0abfc" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="potionmerge-gem" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#potionmerge-bg)" />
      <circle cx="60" cy="34" r="30" fill="url(#potionmerge-glow)" />
      {/* flames */}
      {[40, 52, 64, 76].map((x, i) => (
        <path key={x} d={`M${x - 6} 110 Q${x} ${88 - (i % 2) * 6} ${x + 6} 110 Z`} fill="url(#potionmerge-flame)" />
      ))}
      {/* cauldron */}
      <path d="M26 70 C22 104 98 104 94 70 Z" fill="url(#potionmerge-pot)" stroke="#1e1b2e" strokeWidth="2" />
      <ellipse cx="60" cy="70" rx="35" ry="9" fill="url(#potionmerge-brew)" />
      <ellipse cx="60" cy="70" rx="36" ry="10" fill="none" stroke="#3f3f46" strokeWidth="4" />
      <circle cx="48" cy="62" r="4" fill="#86efac" stroke="#ffffff" strokeWidth="1" />
      <circle cx="70" cy="58" r="3" fill="#86efac" stroke="#ffffff" strokeWidth="1" />
      <circle cx="58" cy="52" r="2.2" fill="#86efac" />
      {/* flying love potion */}
      <g transform="translate(60 30) rotate(12)">
        <path d="M0 22 C-20 8 -12 -8 -3 -1 L-3 -8 L3 -8 L3 -1 C12 -8 20 8 0 22 Z" fill="url(#potionmerge-liquid)" stroke="#1e1b2e" strokeWidth="2" strokeLinejoin="round" />
        <rect x="-4.5" y="-14" width="9" height="7" rx="2" fill="#b45309" stroke="#1e1b2e" strokeWidth="1.4" />
        <ellipse cx="-6" cy="6" rx="1.8" ry="4.5" fill="#ffffff" opacity="0.6" />
      </g>
      <g fill="#ffffff">
        <path d="M86 18 q0 6 6 6 q-6 0 -6 6 q0 -6 -6 -6 q6 0 6 -6z" />
        <path d="M30 30 q0 4 4 4 q-4 0 -4 4 q0 -4 -4 -4 q4 0 4 -4z" />
        <path d="M96 52 q0 3 3 3 q-3 0 -3 3 q0 -3 -3 -3 q3 0 3 -3z" />
      </g>
      {/* crystals merging */}
      <path d="M12 60 L18 50 L24 60 L18 72 Z" fill="url(#potionmerge-gem)" stroke="#1e1b2e" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M100 62 L106 52 L112 62 L106 74 Z" fill="url(#potionmerge-gem)" stroke="#1e1b2e" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
