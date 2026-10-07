/** Rooftop Ninja cover: a ninja leaping between rooftops at dusk, sword drawn. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Rooftop Ninja">
      <defs>
        <linearGradient id="ninja-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="0.6" stopColor="#9a3412" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
        <radialGradient id="ninja-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.55" stopColor="#fde68a" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ninja-coin" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="0.4" stopColor="#fde047" />
          <stop offset="1" stopColor="#b45309" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#ninja-sky)" />
      <circle cx="84" cy="34" r="26" fill="url(#ninja-sun)" />
      <circle cx="84" cy="34" r="13" fill="#fef3c7" />
      {/* far skyline */}
      <path d="M0 76 h10 v-14 h10 v8 h12 v-18 h10 v12 h14 v-8 h12 v16 h12 v-22 h10 v14 h10 v12 h10 V120 H0 Z" fill="#3b1a4a" />
      {/* rooftops */}
      <rect x="-4" y="92" width="44" height="40" fill="#140a1c" />
      <rect x="-6" y="88" width="48" height="6" fill="#3f2a52" />
      <rect x="70" y="84" width="56" height="40" fill="#140a1c" />
      <rect x="68" y="80" width="60" height="6" fill="#3f2a52" />
      <g fill="#fde047" opacity="0.55">
        <rect x="6" y="100" width="6" height="8" />
        <rect x="22" y="100" width="6" height="8" />
        <rect x="80" y="94" width="6" height="8" />
        <rect x="96" y="94" width="6" height="8" />
        <rect x="80" y="108" width="6" height="8" />
      </g>
      {/* coins arc */}
      <circle cx="60" cy="44" r="4" fill="url(#ninja-coin)" stroke="#92400e" strokeWidth="1" />
      <circle cx="72" cy="50" r="4" fill="url(#ninja-coin)" stroke="#92400e" strokeWidth="1" />
      <circle cx="82" cy="60" r="4" fill="url(#ninja-coin)" stroke="#92400e" strokeWidth="1" />
      {/* motion lines */}
      <g stroke="#fff" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round">
        <line x1="10" y1="56" x2="26" y2="56" />
        <line x1="6" y1="66" x2="20" y2="66" />
        <line x1="14" y1="76" x2="26" y2="76" />
      </g>
      {/* ninja mid-leap */}
      <g transform="translate(46 64) rotate(-12)">
        <path d="M-6 -16 C-18 -18 -26 -10 -34 -14 C-28 -6 -18 -10 -8 -10 Z" fill="#ef4444" />
        <path d="M-2 0 L-12 10 M2 0 L10 12" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
        <rect x="-7" y="-18" width="14" height="20" rx="6" fill="#0f172a" />
        <circle cx="1" cy="-23" r="8.5" fill="#0f172a" />
        <rect x="1" y="-25.5" width="8" height="3.4" rx="1" fill="#fef3c7" />
        <path d="M5 -10 L28 -26" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
        <path d="M2 -8 L8 -12" stroke="#7c2d12" strokeWidth="4" strokeLinecap="round" />
        <path d="M12 -34 A30 30 0 0 1 34 -6" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85" />
        <path d="M16 -38 A34 34 0 0 1 40 -6" stroke="#7dd3fc" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.8" />
      </g>
    </svg>
  )
}
