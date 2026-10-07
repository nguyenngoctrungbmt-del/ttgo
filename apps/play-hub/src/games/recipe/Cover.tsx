/** Recipe Rush cover: a towering burger dropping its top bun next to an order ticket. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Recipe Rush">
      <defs>
        <linearGradient id="recipe-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="recipe-bun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fcd34d" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="recipe-patty" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#92400e" />
          <stop offset="1" stopColor="#451a03" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#recipe-bg)" />
      {/* checker strip */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={i * 12} y="96" width="12" height="8" fill={i % 2 ? '#fff' : '#111827'} opacity="0.9" />
      ))}
      <rect x="0" y="104" width="120" height="16" fill="#dc2626" />
      {/* ticket */}
      <g transform="rotate(8 92 40)">
        <rect x="76" y="16" width="34" height="46" rx="4" fill="#fffbeb" stroke="#d6d3d1" />
        <rect x="81" y="22" width="16" height="3" rx="1.5" fill="#b91c1c" />
        <circle cx="85" cy="33" r="3.5" fill="#92400e" />
        <rect x="91" y="31.5" width="14" height="3" rx="1.5" fill="#a8a29e" />
        <circle cx="85" cy="42" r="3.5" fill="#facc15" />
        <rect x="91" y="40.5" width="11" height="3" rx="1.5" fill="#a8a29e" />
        <circle cx="85" cy="51" r="3.5" fill="#4ade80" />
        <rect x="91" y="49.5" width="13" height="3" rx="1.5" fill="#a8a29e" />
      </g>
      {/* plate */}
      <ellipse cx="48" cy="94" rx="36" ry="7" fill="#f8fafc" />
      {/* burger */}
      <rect x="20" y="80" width="56" height="9" rx="4" fill="url(#recipe-bun)" />
      <rect x="18" y="71" width="60" height="10" rx="5" fill="url(#recipe-patty)" />
      <path d="M17 70 L79 70 L76 75 L62 80 L58 75 L36 75 L30 79 L24 75 Z" fill="#facc15" />
      <path d="M16 66 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0 q4 6 8 0 L80 66 Z" fill="#4ade80" />
      <rect x="22" y="60" width="24" height="6" rx="3" fill="#dc2626" />
      <rect x="50" y="60" width="24" height="6" rx="3" fill="#dc2626" />
      {/* falling top bun */}
      <g transform="translate(0 -6)">
        <path d="M19 52 C19 30 77 30 77 52 Z" fill="url(#recipe-bun)" />
        <ellipse cx="38" cy="42" rx="2.5" ry="1.4" fill="#fef3c7" />
        <ellipse cx="50" cy="38" rx="2.5" ry="1.4" fill="#fef3c7" />
        <ellipse cx="60" cy="43" rx="2.5" ry="1.4" fill="#fef3c7" />
      </g>
      <g stroke="#fff7ed" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
        <line x1="30" y1="18" x2="30" y2="27" />
        <line x1="48" y1="13" x2="48" y2="24" />
        <line x1="66" y1="18" x2="66" y2="27" />
      </g>
    </svg>
  )
}
