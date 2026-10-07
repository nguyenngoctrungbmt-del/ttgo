/** Lane Defense cover: a pea pod firing up a striped lawn at a purple blob monster. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Lane Defense">
      <defs>
        <linearGradient id="lanedefense-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e3a5f" />
          <stop offset="1" stopColor="#14532d" />
        </linearGradient>
        <radialGradient id="lanedefense-pod" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#bef264" />
          <stop offset="1" stopColor="#16a34a" />
        </radialGradient>
        <radialGradient id="lanedefense-blob" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="0.6" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#4c1d95" />
        </radialGradient>
        <radialGradient id="lanedefense-orb" cx="0.4" cy="0.35" r="0.6">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="0.5" stopColor="#fde047" />
          <stop offset="1" stopColor="#f59e0b" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#lanedefense-sky)" />
      <g fill="#14532d">
        <circle cx="10" cy="30" r="14" />
        <circle cx="36" cy="26" r="16" />
        <circle cx="64" cy="28" r="14" />
        <circle cx="92" cy="24" r="17" />
        <circle cx="116" cy="30" r="13" />
      </g>
      <rect y="30" width="120" height="90" fill="#22c55e" />
      <g fill="#4ade80">
        <rect x="0" y="30" width="40" height="22" />
        <rect x="80" y="30" width="40" height="22" />
        <rect x="40" y="52" width="40" height="22" />
        <rect x="0" y="74" width="40" height="22" />
        <rect x="80" y="74" width="40" height="22" />
        <rect x="40" y="96" width="40" height="24" />
      </g>
      {/* monster */}
      <ellipse cx="60" cy="56" rx="16" ry="4" fill="#000" opacity="0.25" />
      <path d="M44 52 C42 36 50 28 60 28 C70 28 78 36 76 52 Q60 58 44 52 Z" fill="url(#lanedefense-blob)" />
      <ellipse cx="54" cy="40" rx="4.5" ry="5" fill="#fff" />
      <ellipse cx="66" cy="40" rx="4.5" ry="5" fill="#fff" />
      <circle cx="54" cy="41" r="2.5" fill="#111827" />
      <circle cx="66" cy="41" r="2.5" fill="#111827" />
      <path d="M50 34 l7 3 M70 34 l-7 3" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="60" cy="49" rx="6" ry="3" fill="#1f2937" />
      <path d="M56 47.5 l1.5 2.5 1.5 -2.5 M61 47.5 l1.5 2.5 1.5 -2.5" fill="#fff" />
      {/* seeds */}
      <circle cx="60" cy="72" r="4.5" fill="#84cc16" stroke="#166534" strokeWidth="1.5" />
      <circle cx="60" cy="62" r="3" fill="#bef264" opacity="0.7" />
      <path d="M60 80 v6" stroke="#fef9c3" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      {/* pea pod */}
      <ellipse cx="60" cy="112" rx="16" ry="4" fill="#000" opacity="0.25" />
      <path d="M60 112 q-2 -8 0 -14" stroke="#15803d" strokeWidth="4" fill="none" />
      <path d="M60 110 q-14 -6 -18 2 q8 2 18 -2 Z M60 110 q14 -6 18 2 q-8 2 -18 -2 Z" fill="#16a34a" />
      <circle cx="60" cy="96" r="11" fill="url(#lanedefense-pod)" />
      <rect x="55" y="82" width="10" height="10" rx="3" fill="#22c55e" />
      <ellipse cx="60" cy="82" rx="4.5" ry="2" fill="#14532d" />
      <circle cx="56" cy="97" r="3" fill="#fff" />
      <circle cx="64" cy="97" r="3" fill="#fff" />
      <circle cx="56" cy="97" r="1.6" fill="#111827" />
      <circle cx="64" cy="97" r="1.6" fill="#111827" />
      {/* energy orb */}
      <circle cx="96" cy="88" r="11" fill="#fde047" opacity="0.3" />
      <circle cx="96" cy="88" r="7" fill="url(#lanedefense-orb)" />
      <g stroke="#fde047" strokeWidth="2" strokeLinecap="round">
        <path d="M96 76 v-3M96 100 v3M84 88 h-3M108 88 h3" />
      </g>
      {/* mower */}
      <rect x="14" y="100" width="18" height="9" rx="3" fill="#dc2626" />
      <circle cx="17" cy="111" r="3" fill="#1f2937" />
      <circle cx="29" cy="111" r="3" fill="#1f2937" />
    </svg>
  )
}
