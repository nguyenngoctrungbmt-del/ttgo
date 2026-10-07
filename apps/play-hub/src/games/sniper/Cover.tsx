/** Sniper Scope cover: a scope reticle over a dusk rooftop with a target in the crosshair. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Sniper Scope">
      <defs>
        <linearGradient id="sniper-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#312e81" />
          <stop offset="0.6" stopColor="#a21caf" />
          <stop offset="1" stopColor="#fb923c" />
        </linearGradient>
        <radialGradient id="sniper-lens" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.7" />
        </radialGradient>
        <clipPath id="sniper-frame">
          <rect width="120" height="120" rx="26" />
        </clipPath>
        <clipPath id="sniper-clip">
          <circle cx="60" cy="58" r="40" />
        </clipPath>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#sniper-sky)" />
      <path d="M0 94 h10 v-20 h14 v12 h12 V120 H0 Z M84 120 V80 h12 v-14 h14 v10 h10 V120 Z" fill="#4c1d95" opacity="0.8" clipPath="url(#sniper-frame)" />
      <rect width="120" height="120" rx="26" fill="#020617" opacity="0.35" />
      <g clipPath="url(#sniper-clip)">
        <rect x="0" y="0" width="120" height="120" fill="url(#sniper-sky)" />
        <circle cx="86" cy="40" r="12" fill="#fef3c7" />
        <rect x="10" y="74" width="100" height="50" fill="#1e1b4b" />
        <g fill="#fde68a">
          <rect x="20" y="84" width="6" height="7" />
          <rect x="44" y="84" width="6" height="7" />
          <rect x="80" y="96" width="6" height="7" />
        </g>
        <rect x="76" y="62" width="20" height="12" fill="#94a3b8" />
        {/* hostile */}
        <g transform="translate(58 74)">
          <path d="M-3 -16 L-4 0 M3 -16 L4 0" stroke="#1f2937" strokeWidth="3.5" strokeLinecap="round" />
          <rect x="-6" y="-30" width="12" height="16" rx="3" fill="#3f3f46" />
          <path d="M-4 -20 L13 -29" stroke="#0f172a" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="0" cy="-35" r="5" fill="#e0ac80" />
          <ellipse cx="-1" cy="-39" rx="6" ry="2.6" fill="#b91c1c" />
        </g>
      </g>
      <circle cx="60" cy="58" r="40" fill="url(#sniper-lens)" />
      <circle cx="60" cy="58" r="42" fill="none" stroke="#0f172a" strokeWidth="6" />
      <circle cx="60" cy="58" r="46" fill="none" stroke="#64748b" strokeWidth="1.6" />
      <g stroke="#0f172a" strokeWidth="1.4">
        <line x1="20" y1="58" x2="54" y2="58" />
        <line x1="66" y1="58" x2="100" y2="58" />
        <line x1="60" y1="18" x2="60" y2="52" />
        <line x1="60" y1="64" x2="60" y2="98" />
        <line x1="56" y1="70" x2="64" y2="70" />
        <line x1="57" y1="80" x2="63" y2="80" />
      </g>
      <circle cx="60" cy="58" r="1.8" fill="#ef4444" />
    </svg>
  )
}
