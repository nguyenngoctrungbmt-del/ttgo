/** Slope Ski cover: a skier carving past pines with a snow spray, yeti lurking above. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Slope Ski">
      <defs>
        <linearGradient id="ski-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="0.45" stopColor="#f8fbff" />
          <stop offset="1" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="ski-jacket" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0369a1" />
          <stop offset="0.5" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
        <radialGradient id="ski-spray" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#ski-bg)" />
      {/* distant yeti */}
      <g transform="translate(92 26) scale(0.55)">
        <ellipse cx="0" cy="-20" rx="17" ry="19" fill="#e2e8f0" />
        <path d="M-13 -26 L-24 -42 M13 -26 L24 -42" stroke="#e2e8f0" strokeWidth="7" strokeLinecap="round" />
        <ellipse cx="0" cy="-26" rx="9" ry="8" fill="#7dd3fc" />
        <circle cx="-3.5" cy="-29" r="1.8" fill="#ef4444" />
        <circle cx="3.5" cy="-29" r="1.8" fill="#ef4444" />
        <ellipse cx="0" cy="-22" rx="5" ry="3.5" fill="#7f1d1d" />
      </g>
      {/* pines */}
      {[
        [18, 40, 1],
        [30, 58, 0.8],
        [104, 76, 1.1],
      ].map(([x, y, s]) => (
        <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
          <rect x="-2" y="-6" width="4" height="7" fill="#6b4226" />
          <path d="M-12 -4 L0 -24 L12 -4 Z" fill="#1f5135" />
          <path d="M-9 -14 L0 -32 L9 -14 Z" fill="#2f7048" />
          <path d="M-4 -26 L0 -32 L4 -26 Q0 -24 -4 -26 Z" fill="#ffffff" />
        </g>
      ))}
      {/* tracks */}
      <path d="M40 14 Q 70 40 56 70" fill="none" stroke="#93c5fd" strokeWidth="1.6" />
      <path d="M46 14 Q 76 40 62 70" fill="none" stroke="#93c5fd" strokeWidth="1.6" />
      {/* spray */}
      <circle cx="70" cy="86" r="18" fill="url(#ski-spray)" />
      <g fill="#ffffff">
        <circle cx="80" cy="78" r="2.5" />
        <circle cx="86" cy="86" r="2" />
        <circle cx="76" cy="92" r="2.2" />
      </g>
      {/* skier carving */}
      <g transform="translate(58 80) rotate(-22)">
        <path d="M-20 10 L18 18" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M-18 16 L20 24" stroke="#0f172a" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M12 16.6 L18 18 M14 22.6 L20 24" stroke="#ef4444" strokeWidth="1.6" />
        <rect x="-6" y="-2" width="5" height="16" rx="2" fill="#1e3a8a" />
        <rect x="2" y="0" width="5" height="16" rx="2" fill="#1e3a8a" />
        <rect x="-9" y="-20" width="18" height="20" rx="7" fill="url(#ski-jacket)" />
        <path d="M-8 -14 L-18 4 M8 -14 L16 6" stroke="#94a3b8" strokeWidth="1.6" />
        <circle cx="0" cy="-26" r="6.5" fill="#fcd9b6" />
        <path d="M-7 -27 A7 7 0 0 1 7 -27 Z" fill="#f43f5e" />
        <rect x="-5.5" y="-27" width="11" height="4" rx="2" fill="#0f172a" />
        <rect x="-3.5" y="-26.3" width="3.5" height="1.8" fill="#67e8f9" />
      </g>
      {/* slalom flag */}
      <path d="M100 104 L100 84" stroke="#334155" strokeWidth="2" />
      <path d="M100 84 Q 106 86 112 89 L100 93 Z" fill="#ef4444" />
    </svg>
  )
}
