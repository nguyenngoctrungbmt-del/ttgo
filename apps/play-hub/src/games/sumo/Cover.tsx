/** Sumo Push cover: a top-down wrestler charging a rival over the straw ring edge. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Sumo Push">
      <defs>
        <radialGradient id="sumo-ring" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0" stopColor="#ecc996" />
          <stop offset="1" stopColor="#c99a62" />
        </radialGradient>
        <radialGradient id="sumo-hero" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fff3e0" />
          <stop offset="0.3" stopColor="#f1c27d" />
          <stop offset="1" stopColor="#a8783f" />
        </radialGradient>
        <radialGradient id="sumo-rival" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fff3e0" />
          <stop offset="0.3" stopColor="#d6a77a" />
          <stop offset="1" stopColor="#8a5a33" />
        </radialGradient>
        <radialGradient id="sumo-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="#3b2314" />
      <rect x="8" y="8" width="104" height="104" rx="10" fill="#b4834e" />
      <circle cx="60" cy="60" r="46" fill="url(#sumo-ring)" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="#8a6a3a" strokeWidth="6" />
      <circle cx="60" cy="60" r="46" fill="none" stroke="#e9d8a6" strokeWidth="4" strokeDasharray="5 2" />
      <circle cx="16" cy="16" r="5" fill="#1d4ed8" />
      <circle cx="104" cy="16" r="5" fill="#dc2626" />
      <circle cx="104" cy="104" r="5" fill="#f8fafc" />
      <circle cx="16" cy="104" r="5" fill="#111827" />
      {/* dust trail */}
      <g fill="#e2bd88" opacity="0.8">
        <circle cx="30" cy="92" r="5" />
        <circle cx="22" cy="100" r="3.5" />
        <circle cx="38" cy="98" r="3" />
      </g>
      {/* rival being shoved over the edge */}
      <g transform="translate(82 38) rotate(225)">
        <ellipse cx="0" cy="0" rx="15" ry="13.5" fill="url(#sumo-rival)" stroke="#3b2314" strokeOpacity="0.4" />
        <path d="M-13 4 A14 12 0 0 0 13 4" stroke="#78716c" strokeWidth="4" fill="none" />
        <circle cx="0" cy="-4" r="6" fill="#292524" />
      </g>
      {/* hero charging */}
      <circle cx="52" cy="70" r="26" fill="url(#sumo-glow)" />
      <g transform="translate(52 70) rotate(45)">
        <path d="M-12 -4 L-14 -20 M12 -4 L14 -20" stroke="#d9a868" strokeWidth="7" strokeLinecap="round" />
        <circle cx="-14" cy="-21" r="4" fill="#f1c27d" />
        <circle cx="14" cy="-21" r="4" fill="#f1c27d" />
        <ellipse cx="0" cy="0" rx="17" ry="15" fill="url(#sumo-hero)" stroke="#3b2314" strokeOpacity="0.4" />
        <path d="M-15 4 A16 13 0 0 0 15 4" stroke="#e11d48" strokeWidth="4.5" fill="none" />
        <circle cx="0" cy="-3" r="6.5" fill="#111827" />
        <ellipse cx="0" cy="-8" rx="2" ry="3.5" fill="#111827" />
      </g>
      {/* slap sparks */}
      <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round">
        <line x1="70" y1="48" x2="76" y2="44" />
        <line x1="66" y1="44" x2="68" y2="37" />
        <line x1="74" y1="54" x2="81" y2="54" />
      </g>
    </svg>
  )
}
