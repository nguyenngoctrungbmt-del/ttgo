/** Merge Town cover: two cottages merging into a castle on green plots with a sparkle burst. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Merge Town">
      <defs>
        <linearGradient id="mergetown-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5eead4" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="mergetown-plot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ade80" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="mergetown-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="mergetown-roof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
        <radialGradient id="mergetown-burst" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fef08a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#fef08a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#mergetown-bg)" />
      {/* plots */}
      <rect x="10" y="78" width="30" height="30" rx="6" fill="url(#mergetown-plot)" />
      <rect x="80" y="78" width="30" height="30" rx="6" fill="url(#mergetown-plot)" />
      <rect x="34" y="40" width="52" height="52" rx="8" fill="url(#mergetown-plot)" />
      <circle cx="60" cy="58" r="40" fill="url(#mergetown-burst)" />
      {/* castle */}
      <ellipse cx="60" cy="86" rx="22" ry="4" fill="#000" opacity="0.2" />
      <rect x="47" y="56" width="26" height="30" rx="2" fill="url(#mergetown-stone)" />
      <rect x="39" y="46" width="11" height="40" rx="2" fill="url(#mergetown-stone)" />
      <rect x="70" y="46" width="11" height="40" rx="2" fill="url(#mergetown-stone)" />
      <path d="M37 47 L44.5 33 L52 47 Z" fill="url(#mergetown-roof)" />
      <path d="M68 47 L75.5 33 L83 47 Z" fill="url(#mergetown-roof)" />
      {[48, 54, 60, 66].map((x) => (
        <rect key={x} x={x} y="51" width="4" height="5" fill="#e2e8f0" />
      ))}
      <path d="M55 86 V75 a5 5 0 0 1 10 0 V86 Z" fill="#7c2d12" />
      <rect x="42" y="56" width="5" height="6" fill="#fde68a" />
      <rect x="73" y="56" width="5" height="6" fill="#fde68a" />
      <line x1="44.5" y1="33" x2="44.5" y2="25" stroke="#475569" strokeWidth="1.4" />
      <path d="M44.5 25 L51 27 L44.5 29.5 Z" fill="#facc15" />
      {/* cottages flying in */}
      {[
        { x: 25, r: -12 },
        { x: 95, r: 12 },
      ].map((c) => (
        <g key={c.x} transform={`translate(${c.x} 94) rotate(${c.r})`}>
          <rect x="-9" y="-6" width="18" height="12" rx="1.5" fill="#fef3c7" />
          <path d="M-11 -5 L0 -15 L11 -5 Z" fill="#dc2626" />
          <rect x="-6" y="-2" width="4" height="4" fill="#fde68a" />
          <rect x="2" y="-1" width="4" height="7" fill="#7c2d12" />
        </g>
      ))}
      <g stroke="#fef9c3" strokeWidth="2.4" strokeLinecap="round">
        <line x1="38" y1="84" x2="44" y2="80" />
        <line x1="82" y1="84" x2="76" y2="80" />
        <line x1="60" y1="18" x2="60" y2="11" />
        <line x1="86" y1="28" x2="91" y2="23" />
        <line x1="34" y1="28" x2="29" y2="23" />
      </g>
      <circle cx="96" cy="44" r="2.5" fill="#fef08a" />
      <circle cx="24" cy="48" r="2" fill="#fef08a" />
    </svg>
  )
}
