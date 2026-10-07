/** Samurai Parry cover: a samurai silhouette parrying against a setting sun, sparks flying. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Samurai Parry">
      <defs>
        <linearGradient id="parry-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e11d48" />
          <stop offset="0.6" stopColor="#fb923c" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
        <radialGradient id="parry-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset="0.7" stopColor="#fef3c7" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="parry-blade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#parry-sky)" />
      <circle cx="60" cy="50" r="34" fill="url(#parry-sun)" />
      <path d="M0 84 L22 62 L40 76 L62 54 L86 74 L104 60 L120 70 L120 120 L0 120 Z" fill="#9f1239" opacity="0.55" />
      <rect x="0" y="92" width="120" height="28" fill="#292524" />
      <rect x="0" y="92" width="120" height="2" fill="#57534e" />
      {/* samurai */}
      <g fill="#0f172a">
        <ellipse cx="50" cy="93" rx="18" ry="3" fill="#000" opacity="0.3" />
        <path d="M36 93 L43 64 L57 64 L64 93 Z" />
        <rect x="43" y="46" width="14" height="20" rx="5" />
        <circle cx="50" cy="40" r="7" />
        <circle cx="47" cy="31.5" r="3.2" />
        <path d="M54 52 L64 44" stroke="#0f172a" strokeWidth="5" strokeLinecap="round" />
      </g>
      <rect x="43" y="74" width="16" height="3.5" fill="#f8fafc" />
      <ellipse cx="53.5" cy="39.5" rx="2" ry="0.9" fill="#f8fafc" />
      {/* enemy blade coming in */}
      <path d="M118 30 L76 40" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
      {/* katana raised to parry */}
      <path d="M64 44 L88 12" stroke="url(#parry-blade)" strokeWidth="3" strokeLinecap="round" />
      <path d="M60 49 L64 44" stroke="#78350f" strokeWidth="4.5" strokeLinecap="round" />
      {/* clash sparks */}
      <circle cx="79" cy="38" r="9" fill="#fef08a" opacity="0.55" />
      <g stroke="#fffbeb" strokeWidth="2" strokeLinecap="round">
        <line x1="79" y1="38" x2="92" y2="30" />
        <line x1="79" y1="38" x2="94" y2="42" />
        <line x1="79" y1="38" x2="84" y2="24" />
        <line x1="79" y1="38" x2="70" y2="30" />
        <line x1="79" y1="38" x2="86" y2="50" />
      </g>
      {/* petals */}
      <g fill="#fbcfe8">
        <ellipse cx="22" cy="28" rx="3" ry="1.7" transform="rotate(30 22 28)" />
        <ellipse cx="98" cy="72" rx="3" ry="1.7" transform="rotate(-20 98 72)" />
        <ellipse cx="28" cy="70" rx="2.5" ry="1.4" transform="rotate(60 28 70)" />
        <ellipse cx="104" cy="16" rx="2.5" ry="1.4" />
      </g>
    </svg>
  )
}
