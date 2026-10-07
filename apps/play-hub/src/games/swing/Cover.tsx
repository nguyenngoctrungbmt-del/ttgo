/** Grapple Swing cover: a hero flinging off a hook over glowing lava, gems along the arc. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Grapple Swing">
      <defs>
        <linearGradient id="swing-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c4a6e" />
          <stop offset="0.6" stopColor="#155e75" />
          <stop offset="1" stopColor="#9a3412" />
        </linearGradient>
        <linearGradient id="swing-lava" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="0.35" stopColor="#f97316" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
        <radialGradient id="swing-hero" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fdba74" />
          <stop offset="1" stopColor="#ea580c" />
        </radialGradient>
        <radialGradient id="swing-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.6" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#swing-sky)" />
      <g fill="#082f49" opacity="0.6">
        <path d="M8 0 L26 0 L18 30 Z" />
        <path d="M60 0 L80 0 L70 22 Z" />
        <path d="M96 0 L114 0 L106 34 Z" />
      </g>
      <rect x="0" y="0" width="120" height="6" fill="#082f49" />
      {/* hook */}
      <line x1="44" y1="0" x2="44" y2="24" stroke="#334155" strokeWidth="2" />
      <circle cx="44" cy="26" r="5" fill="#fde047" stroke="#475569" strokeWidth="2" />
      {/* swing arc */}
      <path d="M14 62 Q40 86 78 52" fill="none" stroke="#67e8f9" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
      {/* rope */}
      <line x1="44" y1="26" x2="76" y2="54" stroke="#fef3c7" strokeWidth="2.2" />
      {/* gems */}
      {[
        [26, 66],
        [92, 34],
        [104, 22],
      ].map(([x, y]) => (
        <g key={x} transform={`translate(${x} ${y})`}>
          <path d="M-5 -2 L-2.5 -5 L2.5 -5 L5 -2 L0 6 Z" fill="#22d3ee" />
          <path d="M-2.5 -5 L2.5 -5 L1.3 -2 L-1.3 -2 Z" fill="#a5f3fc" />
          <path d="M1.3 -2 L5 -2 L0 6 Z" fill="#0891b2" />
        </g>
      ))}
      {/* hero */}
      <circle cx="78" cy="52" r="20" fill="url(#swing-glow)" />
      <path d="M72 56 Q62 58 54 66" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="78" cy="52" r="10" fill="url(#swing-hero)" stroke="#7c2d12" strokeWidth="1.4" />
      <rect x="71" y="46" width="15" height="6.5" rx="3" fill="#1e293b" />
      <rect x="79" y="47.5" width="5.5" height="3" fill="#67e8f9" />
      {/* motion lines */}
      <g stroke="#ecfeff" strokeWidth="1.6" strokeLinecap="round" opacity="0.6">
        <line x1="58" y1="44" x2="66" y2="46" />
        <line x1="60" y1="52" x2="66" y2="53" />
      </g>
      {/* saw */}
      <g transform="translate(100 76)">
        <circle r="10" fill="#cbd5e1" />
        <g fill="#cbd5e1">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} d="M-3 -9 L0 -13 L3 -9 Z" transform={`rotate(${a})`} />
          ))}
        </g>
        <circle r="3.2" fill="#475569" />
      </g>
      {/* lava */}
      <path d="M0 98 Q15 93 30 98 T60 98 T90 98 T120 98 L120 120 L0 120 Z" fill="url(#swing-lava)" />
      <circle cx="36" cy="92" r="2" fill="#fde047" />
      <circle cx="82" cy="89" r="1.6" fill="#fde047" />
    </svg>
  )
}
