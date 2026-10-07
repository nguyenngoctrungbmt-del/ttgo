/** Dungeon Dash cover: a knight mid-slash against a slime in torchlight. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Dungeon Dash">
      <defs>
        <linearGradient id="dungeon-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3f3a52" />
          <stop offset="1" stopColor="#14121c" />
        </linearGradient>
        <radialGradient id="dungeon-light" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fb923c" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="dungeon-slime" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="1" stopColor="#15803d" />
        </radialGradient>
        <linearGradient id="dungeon-armor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#dungeon-bg)" />
      {/* bricks */}
      <g fill="#4b4466" opacity="0.7">
        <rect x="6" y="10" width="22" height="9" rx="1.5" />
        <rect x="31" y="10" width="22" height="9" rx="1.5" />
        <rect x="67" y="10" width="22" height="9" rx="1.5" />
        <rect x="92" y="10" width="22" height="9" rx="1.5" />
        <rect x="18" y="22" width="22" height="9" rx="1.5" />
        <rect x="80" y="22" width="22" height="9" rx="1.5" />
      </g>
      {/* floor */}
      <path d="M0 74 H120 V94 Q120 120 94 120 H26 Q0 120 0 94 Z" fill="#2b2738" />
      <path d="M0 86 H120 M30 74 V120 M70 74 V120" stroke="#1a1724" strokeWidth="1.5" />
      {/* torch */}
      <circle cx="60" cy="30" r="28" fill="url(#dungeon-light)" />
      <rect x="57.5" y="30" width="5" height="14" fill="#3f2a1a" />
      <path d="M54 30 Q53 20 60 13 Q67 20 66 30 Z" fill="#f97316" />
      <path d="M57.5 29 Q57 23 60 19 Q63 23 62.5 29 Z" fill="#fde047" />
      {/* slime */}
      <ellipse cx="92" cy="96" rx="17" ry="5" fill="#000" opacity="0.35" />
      <path d="M76 95 Q74 72 92 71 Q110 72 108 95 Q92 99 76 95 Z" fill="url(#dungeon-slime)" />
      <circle cx="87" cy="83" r="4" fill="#fff" />
      <circle cx="98" cy="83" r="4" fill="#fff" />
      <circle cx="85.5" cy="84" r="2" fill="#111" />
      <circle cx="96.5" cy="84" r="2" fill="#111" />
      <path d="M84 77 L90 80 M101 77 L95 80" stroke="#14532d" strokeWidth="2" strokeLinecap="round" />
      {/* slash arc */}
      <path d="M30 46 A36 36 0 0 1 86 66" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.35" />
      <path d="M36 44 A32 32 0 0 1 84 62" fill="none" stroke="#e0f2fe" strokeWidth="3" strokeLinecap="round" />
      {/* knight */}
      <ellipse cx="42" cy="102" rx="16" ry="5" fill="#000" opacity="0.4" />
      <path d="M30 70 Q24 88 28 100 H52 Q54 86 50 70 Z" fill="#b91c1c" />
      <rect x="30" y="72" width="22" height="24" rx="7" fill="url(#dungeon-armor)" />
      <rect x="33" y="74" width="16" height="10" rx="4" fill="#cbd5e1" />
      <rect x="30" y="88" width="22" height="3" fill="#78350f" />
      <circle cx="41" cy="63" r="11" fill="#94a3b8" />
      <ellipse cx="37" cy="58" rx="4" ry="2.4" fill="#e2e8f0" transform="rotate(-30 37 58)" />
      <rect x="39" y="61" width="12" height="3.5" rx="1.7" fill="#0f172a" />
      <rect x="42" y="61.6" width="2.4" height="2" fill="#7dd3fc" />
      <rect x="47" y="61.6" width="2.4" height="2" fill="#7dd3fc" />
      <path d="M41 52 Q30 47 27 60 Q34 53 41 55 Z" fill="#dc2626" />
      {/* sword */}
      <g transform="rotate(-28 54 76)">
        <rect x="50" y="73" width="7" height="5" fill="#78350f" />
        <rect x="56" y="69" width="3" height="13" fill="#fbbf24" />
        <path d="M59 72.5 L86 73.5 L91 75.5 L86 77.5 L59 78.5 Z" fill="#f1f5f9" />
      </g>
      {/* hit sparks */}
      <g stroke="#fde047" strokeWidth="2.4" strokeLinecap="round">
        <path d="M78 66 l-6 -4 M80 62 l-2 -7 M84 64 l5 -5" />
      </g>
    </svg>
  )
}
