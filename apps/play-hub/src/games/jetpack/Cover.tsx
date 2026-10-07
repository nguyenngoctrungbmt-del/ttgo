/** Jetpack Rush cover: helmeted hero blasting past an electric zapper. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Jetpack Rush">
      <defs>
        <linearGradient id="jetpack-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="1" stopColor="#0b1a33" />
        </linearGradient>
        <linearGradient id="jetpack-suit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdba74" />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id="jetpack-visor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a5f3fc" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        <linearGradient id="jetpack-pack" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#64748b" />
          <stop offset="0.5" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
        <radialGradient id="jetpack-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#jetpack-bg)" />
      <rect x="14" y="20" width="22" height="70" rx="6" fill="#25456f" />
      <rect x="84" y="14" width="22" height="70" rx="6" fill="#25456f" />
      <rect x="0" y="100" width="120" height="20" fill="#0e1a2e" />
      <rect x="0" y="100" width="120" height="2" fill="#38bdf8" />
      {/* zapper */}
      <circle cx="96" cy="44" r="22" fill="url(#jetpack-glow)" />
      <path d="M92 20 L99 30 L91 38 L100 48 L92 58 L98 68" stroke="#facc15" strokeWidth="4" fill="none" strokeLinejoin="round" />
      <path d="M92 20 L99 30 L91 38 L100 48 L92 58 L98 68" stroke="#fffbeb" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <circle cx="94" cy="18" r="6" fill="#1f2937" stroke="#9ca3af" strokeWidth="1.5" />
      <circle cx="94" cy="18" r="3" fill="#fde047" />
      <circle cx="97" cy="70" r="6" fill="#1f2937" stroke="#9ca3af" strokeWidth="1.5" />
      <circle cx="97" cy="70" r="3" fill="#fde047" />
      {/* coins */}
      <circle cx="74" cy="84" r="5" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
      <circle cx="86" cy="88" r="5" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
      <circle cx="98" cy="90" r="5" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
      {/* motion lines */}
      <g stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" opacity="0.5">
        <line x1="8" y1="50" x2="24" y2="50" />
        <line x1="4" y1="62" x2="18" y2="62" />
        <line x1="12" y1="38" x2="22" y2="38" />
      </g>
      <g transform="translate(50 58) rotate(-14)">
        {/* flame */}
        <path d="M-22 12 Q-18 46 -14 12 Z" fill="#f97316" />
        <path d="M-20.5 12 Q-18 34 -15.5 12 Z" fill="#fde047" />
        <path d="M-13 12 Q-9 42 -5 12 Z" fill="#f97316" />
        <path d="M-11.5 12 Q-9 30 -6.5 12 Z" fill="#fde047" />
        {/* scarf */}
        <path d="M-2 -12 C-12 -10 -20 -16 -32 -10" stroke="#ef4444" strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* pack */}
        <rect x="-24" y="-16" width="20" height="28" rx="6" fill="url(#jetpack-pack)" />
        <rect x="-21" y="-10" width="13" height="4" fill="#ef4444" />
        {/* legs */}
        <path d="M0 10 L4 24 M4 10 L12 22" stroke="#1e3a8a" strokeWidth="7" strokeLinecap="round" />
        {/* body */}
        <rect x="-8" y="-14" width="22" height="26" rx="7" fill="url(#jetpack-suit)" />
        <rect x="-8" y="3" width="22" height="4" fill="#7c2d12" />
        <path d="M8 -6 L22 -2" stroke="#ea580c" strokeWidth="6" strokeLinecap="round" />
        {/* helmet */}
        <circle cx="5" cy="-24" r="13" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
        <ellipse cx="10" cy="-24" rx="7.5" ry="6.5" fill="url(#jetpack-visor)" />
        <ellipse cx="8" cy="-27" rx="3" ry="1.6" fill="#fff" opacity="0.9" transform="rotate(-25 8 -27)" />
      </g>
    </svg>
  )
}
