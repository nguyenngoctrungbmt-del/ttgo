/** Black Hole cover: a swirling void in a city street swallowing a tilted car. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Black Hole">
      <defs>
        <linearGradient id="hole-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#86c66b" />
          <stop offset="1" stopColor="#4d8f43" />
        </linearGradient>
        <radialGradient id="hole-void" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.7" stopColor="#0b0620" />
          <stop offset="0.92" stopColor="#312e81" />
          <stop offset="1" stopColor="#4338ca" />
        </radialGradient>
        <linearGradient id="hole-roof" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c7d2fe" />
          <stop offset="1" stopColor="#818cf8" />
        </linearGradient>
        <clipPath id="hole-clip">
          <circle cx="60" cy="66" r="29" />
        </clipPath>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#hole-bg)" />
      {/* roads */}
      <rect x="0" y="52" width="120" height="28" fill="#4b5563" />
      <rect x="46" y="0" width="28" height="120" fill="#4b5563" />
      <g stroke="#fff" strokeWidth="2" strokeDasharray="6 5" opacity="0.6">
        <line x1="0" y1="66" x2="120" y2="66" />
        <line x1="60" y1="0" x2="60" y2="120" />
      </g>
      {/* building with extruded walls */}
      <path d="M84 8 h26 v30 h-26 z" fill="#475569" />
      <path d="M80 4 h26 v30 h-26 z" fill="url(#hole-roof)" />
      <rect x="85" y="9" width="16" height="20" fill="none" stroke="#4338ca" strokeWidth="2" opacity="0.5" />
      {/* trees */}
      <circle cx="18" cy="22" r="11" fill="#166534" />
      <circle cx="16" cy="20" r="9" fill="#22c55e" />
      <circle cx="13" cy="17" r="3" fill="#86efac" />
      <circle cx="22" cy="98" r="10" fill="#166534" />
      <circle cx="20" cy="96" r="8" fill="#22c55e" />
      {/* the hole */}
      <circle cx="60" cy="66" r="36" fill="#a78bfa" opacity="0.25" />
      <circle cx="60" cy="66" r="29" fill="url(#hole-void)" />
      <g fill="none" stroke="#a78bfa" strokeWidth="2" opacity="0.45">
        <path d="M60 42 q20 4 18 24" />
        <path d="M84 70 q-6 18 -26 16" />
        <path d="M38 76 q-6 -20 12 -30" />
      </g>
      {/* car tipping in */}
      <g clipPath="url(#hole-clip)">
        <g transform="translate(62 62) rotate(-35) scale(0.85)">
          <rect x="-17" y="-9" width="34" height="18" rx="5" fill="#991b1b" />
          <rect x="-16" y="-8" width="32" height="16" rx="5" fill="#ef4444" />
          <rect x="3" y="-6.5" width="6" height="13" rx="2" fill="#1e293b" />
          <rect x="-8" y="-6" width="11" height="12" rx="2" fill="#fca5a5" />
          <rect x="14" y="-7" width="2" height="3" fill="#fef08a" />
          <rect x="14" y="4" width="2" height="3" fill="#fef08a" />
        </g>
      </g>
      <circle cx="60" cy="66" r="29" fill="none" stroke="#a78bfa" strokeWidth="3" />
      {/* cone flying in */}
      <g transform="translate(96 96) rotate(30)">
        <rect x="-5" y="-5" width="10" height="10" fill="#7c2d12" />
        <circle r="4" fill="#f97316" />
        <circle r="2.2" fill="none" stroke="#fff" strokeWidth="1.2" />
      </g>
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <line x1="88" y1="86" x2="82" y2="80" />
        <line x1="96" y1="84" x2="92" y2="78" />
      </g>
    </svg>
  )
}
