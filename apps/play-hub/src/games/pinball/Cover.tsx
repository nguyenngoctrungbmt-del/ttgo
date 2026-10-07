/** Pinball Wizard cover: chrome ball blasting off a neon bumper above glowing flippers. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Pinball Wizard">
      <defs>
        <linearGradient id="pinball-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e1065" />
          <stop offset="1" stopColor="#0b0420" />
        </linearGradient>
        <radialGradient id="pinball-ball" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#cbd5e1" />
          <stop offset="1" stopColor="#334155" />
        </radialGradient>
        <radialGradient id="pinball-bumper" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6d28d9" />
        </radialGradient>
        <radialGradient id="pinball-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f472b6" stopOpacity="0.8" />
          <stop offset="1" stopColor="#f472b6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pinball-flip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#pinball-bg)" />
      <path d="M14 112 V40 Q14 10 60 10 Q106 10 106 40 V112" fill="none" stroke="#a78bfa" strokeWidth="3" opacity="0.9" />
      <path d="M14 112 V40 Q14 10 60 10 Q106 10 106 40 V112" fill="none" stroke="#7c3aed" strokeWidth="8" opacity="0.25" />
      <circle cx="78" cy="44" r="22" fill="url(#pinball-glow)" />
      <circle cx="78" cy="44" r="12" fill="url(#pinball-bumper)" />
      <circle cx="78" cy="44" r="7" fill="none" stroke="#f472b6" strokeWidth="2.4" />
      <circle cx="40" cy="38" r="8" fill="url(#pinball-bumper)" opacity="0.85" />
      <circle cx="40" cy="38" r="4.5" fill="none" stroke="#f472b6" strokeWidth="1.8" />
      {/* lanes */}
      <g fill="#facc15">
        <circle cx="46" cy="20" r="2.4" />
        <circle cx="60" cy="20" r="2.4" />
        <circle cx="74" cy="20" r="2.4" opacity="0.35" />
      </g>
      {/* flippers */}
      <path d="M26 92 L54 102 Q57 104 54 106 L24 98 Q20 95 26 92 Z" fill="url(#pinball-flip)" />
      <path d="M94 92 L70 104 Q67 106 66 103 L90 90 Q96 89 94 92 Z" fill="url(#pinball-flip)" />
      <circle cx="25" cy="95" r="4" fill="#1f2937" />
      <circle cx="94" cy="91" r="4" fill="#1f2937" />
      {/* motion trail + ball */}
      <g fill="#a78bfa">
        <circle cx="46" cy="84" r="3" opacity="0.25" />
        <circle cx="51" cy="77" r="3.6" opacity="0.35" />
        <circle cx="56" cy="70" r="4.2" opacity="0.5" />
      </g>
      <circle cx="62" cy="62" r="7.5" fill="url(#pinball-ball)" />
      <g stroke="#fde047" strokeWidth="2" strokeLinecap="round">
        <line x1="70" y1="55" x2="74" y2="51" />
        <line x1="66" y1="52" x2="67" y2="47" />
        <line x1="72" y1="60" x2="77" y2="59" />
      </g>
    </svg>
  )
}
