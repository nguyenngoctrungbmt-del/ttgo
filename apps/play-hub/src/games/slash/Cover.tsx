/** Blade Slash cover: a watermelon split mid-air by a glowing blade swipe. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Blade Slash">
      <defs>
        <linearGradient id="slash-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c3f1d" />
          <stop offset="1" stopColor="#1c1009" />
        </linearGradient>
        <radialGradient id="slash-rind" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#4ade80" />
          <stop offset="1" stopColor="#14532d" />
        </radialGradient>
        <radialGradient id="slash-flesh" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#fca5a5" />
          <stop offset="1" stopColor="#dc2626" />
        </radialGradient>
        <linearGradient id="slash-blade" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#67e8f9" stopOpacity="0" />
          <stop offset="0.6" stopColor="#a5f3fc" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <radialGradient id="slash-glow" cx="0.5" cy="0.45" r="0.5">
          <stop offset="0" stopColor="#fdba74" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fdba74" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#slash-bg)" />
      <g stroke="#000" strokeOpacity="0.3" strokeWidth="2">
        <line x1="30" y1="0" x2="30" y2="120" />
        <line x1="60" y1="0" x2="60" y2="120" />
        <line x1="90" y1="0" x2="90" y2="120" />
      </g>
      <circle cx="60" cy="56" r="52" fill="url(#slash-glow)" />
      {/* juice splat */}
      <g fill="#ef4444" opacity="0.35">
        <circle cx="74" cy="84" r="12" />
        <circle cx="90" cy="96" r="5" />
        <circle cx="58" cy="98" r="4" />
      </g>
      {/* lower-left half */}
      <g transform="translate(-6 8) rotate(-12 50 62)">
        <path d="M22 58 A30 30 0 0 0 82 58 Z" fill="url(#slash-rind)" stroke="#052e16" strokeWidth="2" />
        <path d="M22 58 L82 58" stroke="#f0fdf4" strokeWidth="4" />
        <path d="M25 59 A27 26 0 0 0 79 59 Z" fill="url(#slash-flesh)" />
        <g fill="#1f2937">
          <ellipse cx="40" cy="66" rx="1.8" ry="3" />
          <ellipse cx="52" cy="70" rx="1.8" ry="3" />
          <ellipse cx="64" cy="66" rx="1.8" ry="3" />
        </g>
      </g>
      {/* upper-right half */}
      <g transform="translate(10 -10) rotate(-12 60 52)">
        <path d="M30 52 A30 30 0 0 1 90 52 Z" fill="url(#slash-rind)" stroke="#052e16" strokeWidth="2" />
        <g stroke="#166534" strokeWidth="4" fill="none">
          <path d="M45 26 q3 13 -1 26" />
          <path d="M60 22 q3 15 0 30" />
          <path d="M75 26 q3 13 -1 26" />
        </g>
        <path d="M30 52 L90 52" stroke="#f0fdf4" strokeWidth="4" />
        <ellipse cx="44" cy="32" rx="7" ry="3" fill="#fff" opacity="0.4" transform="rotate(-30 44 32)" />
      </g>
      {/* blade swipe */}
      <path d="M8 98 Q56 64 112 22 Q60 72 14 102 Z" fill="url(#slash-blade)" />
      <path d="M20 92 Q60 64 108 26" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* droplets */}
      <g fill="#f87171">
        <circle cx="86" cy="62" r="3.2" />
        <circle cx="96" cy="52" r="2.2" />
        <circle cx="34" cy="50" r="2.6" />
        <circle cx="26" cy="60" r="1.8" />
      </g>
      <g fill="#fff">
        <circle cx="104" cy="28" r="2" />
        <path d="M108 16 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5 z" />
      </g>
    </svg>
  )
}
