/** Hill Rider cover: a rider mid-backflip over rolling hills with a fuel can. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Hill Rider">
      <defs>
        <linearGradient id="bmx-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#bfdbfe" />
        </linearGradient>
        <linearGradient id="bmx-dirt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a16207" />
          <stop offset="1" stopColor="#451a03" />
        </linearGradient>
        <linearGradient id="bmx-can" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#991b1b" />
          <stop offset="0.5" stopColor="#ef4444" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#bmx-sky)" />
      <circle cx="96" cy="22" r="9" fill="#fef9c3" />
      <path d="M0 80 Q 30 56 60 72 T 120 64 L120 120 L0 120 Z" fill="#86efac" opacity="0.7" />
      {/* foreground hill with ramp */}
      <path d="M0 100 Q 18 92 30 96 L 52 78 L 52 120 L 0 120 Z" fill="url(#bmx-dirt)" />
      <path d="M0 100 Q 18 92 30 96 L 52 78" fill="none" stroke="#22c55e" strokeWidth="5" strokeLinejoin="round" />
      <path d="M70 120 Q 90 92 120 98 L120 120 Z" fill="url(#bmx-dirt)" />
      <path d="M70 120 Q 90 92 120 98" fill="none" stroke="#22c55e" strokeWidth="5" />
      {/* flip arc */}
      <path d="M40 66 A 26 26 0 1 1 86 70" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeDasharray="3 5" strokeLinecap="round" opacity="0.8" />
      <path d="M86 70 l -6 -2 l 3 6 z" fill="#ffffff" opacity="0.8" />
      {/* bike + rider, tilted back */}
      <g transform="translate(62 52) rotate(-30)">
        <circle cx="-17" cy="10" r="9" fill="#111827" />
        <circle cx="-17" cy="10" r="5.5" fill="#374151" />
        <circle cx="17" cy="10" r="9" fill="#111827" />
        <circle cx="17" cy="10" r="5.5" fill="#374151" />
        <path d="M-17 10 L-2 11 L-7 -3 Z M-7 -3 L12 -6 L-2 11 M12 -6 L17 10" fill="none" stroke="#e11d48" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M12 -6 L11 -12 L16 -13" fill="none" stroke="#1f2937" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M-6 -7 L4 -24" stroke="#f97316" strokeWidth="7" strokeLinecap="round" />
        <path d="M-6 -7 L2 2 L-1 9" stroke="#1d4ed8" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        <path d="M4 -22 L10 -16 L15 -13" stroke="#f0b48a" strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="7" cy="-30" r="6" fill="#f0b48a" />
        <path d="M0 -31 A7 7 0 0 1 14 -32 Z" fill="#facc15" />
      </g>
      {/* fuel can */}
      <g transform="translate(98 84)">
        <rect x="-7" y="-8" width="14" height="16" rx="3" fill="url(#bmx-can)" />
        <rect x="-3" y="-12" width="6" height="4" fill="#7f1d1d" />
        <path d="M-4 -4 L4 4 M4 -4 L-4 4" stroke="#fecaca" strokeWidth="1.6" />
      </g>
    </svg>
  )
}
