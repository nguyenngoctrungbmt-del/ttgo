/** Orbit Guard cover: a shield arc around a small planet deflecting a meteor. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Orbit Guard">
      <defs>
        <radialGradient id="orbit-bg" cx="0.5" cy="0.55" r="0.75">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="1" stopColor="#050816" />
        </radialGradient>
        <radialGradient id="orbit-planet" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#1e3a8a" />
        </radialGradient>
        <linearGradient id="orbit-shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.45" stopColor="#020617" stopOpacity="0" />
          <stop offset="1" stopColor="#020617" stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id="orbit-rock" cx="0.3" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#f87171" />
          <stop offset="1" stopColor="#3f0d12" />
        </radialGradient>
        <linearGradient id="orbit-tail" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f87171" stopOpacity="0" />
          <stop offset="1" stopColor="#fca5a5" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="orbit-giant" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="1" stopColor="#3b0764" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#orbit-bg)" />
      <g fill="#e0e7ff">
        <circle cx="12" cy="40" r="1" />
        <circle cx="104" cy="96" r="1.2" />
        <circle cx="90" cy="18" r="0.9" />
        <circle cx="30" cy="104" r="1" />
        <circle cx="56" cy="12" r="0.8" />
      </g>
      <circle cx="18" cy="18" r="11" fill="url(#orbit-giant)" opacity="0.7" />
      <ellipse cx="18" cy="18" rx="19" ry="4" fill="none" stroke="#ddd6fe" strokeOpacity="0.5" strokeWidth="1.5" transform="rotate(-20 18 18)" />
      {/* orbit guide */}
      <circle cx="60" cy="64" r="34" fill="none" stroke="#94a3b8" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="3 5" />
      {/* planet */}
      <circle cx="60" cy="64" r="20" fill="url(#orbit-planet)" />
      <path d="M46 56 q6 -6 14 -2 q4 4 -2 8 q-8 2 -12 -6 z" fill="#4ade80" opacity="0.7" />
      <path d="M62 72 q6 -2 10 2 q-2 6 -8 4 z" fill="#4ade80" opacity="0.7" />
      <circle cx="60" cy="64" r="20" fill="url(#orbit-shade)" />
      <ellipse cx="52" cy="54" rx="6" ry="3" fill="#fff" opacity="0.35" transform="rotate(-30 52 54)" />
      {/* meteor + tail */}
      <path d="M112 8 L86 30 L92 36 Z" fill="url(#orbit-tail)" />
      <circle cx="88" cy="34" r="6.5" fill="url(#orbit-rock)" />
      {/* impact sparks */}
      <g stroke="#fde047" strokeWidth="2" strokeLinecap="round">
        <line x1="82" y1="40" x2="88" y2="44" />
        <line x1="80" y1="34" x2="86" y2="30" />
        <line x1="76" y1="44" x2="78" y2="50" />
      </g>
      {/* shield arc */}
      <path d="M60 30 A34 34 0 0 1 92 52" fill="none" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="12" strokeLinecap="round" />
      <path d="M60 30 A34 34 0 0 1 92 52" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" />
      <path d="M61 32 A32 32 0 0 1 90 52" fill="none" stroke="#e0f2fe" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
