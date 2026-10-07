/** Bridge Builder cover: a truss bridge over a canyon with a truck crossing. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Bridge Builder">
      <defs>
        <linearGradient id="bridge-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#e0f2fe" />
        </linearGradient>
        <linearGradient id="bridge-rock" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a16207" />
          <stop offset="1" stopColor="#451a03" />
        </linearGradient>
        <linearGradient id="bridge-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0c4a6e" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#bridge-sky)" />
      <circle cx="92" cy="26" r="9" fill="#fef9c3" />
      <path d="M0 70 Q30 52 60 64 T120 58 V100 H0 Z" fill="#86b98c" />
      <rect x="0" y="92" width="120" height="28" fill="url(#bridge-water)" />
      <path d="M8 100 q6 -3 12 0 t12 0 M70 106 q6 -3 12 0 t12 0" stroke="#e0f2fe" strokeWidth="1.5" fill="none" />
      <path d="M0 62 H24 V120 H0 Z" fill="url(#bridge-rock)" />
      <path d="M96 62 H120 V120 H96 Z" fill="url(#bridge-rock)" />
      <rect x="0" y="59" width="24" height="5" fill="#65a30d" />
      <rect x="96" y="59" width="24" height="5" fill="#65a30d" />
      {/* truss */}
      <g stroke="#22c55e" strokeWidth="3" strokeLinecap="round">
        <line x1="24" y1="62" x2="40" y2="76" />
        <line x1="40" y1="62" x2="40" y2="76" />
        <line x1="40" y1="76" x2="56" y2="62" />
      </g>
      <g stroke="#facc15" strokeWidth="3" strokeLinecap="round">
        <line x1="40" y1="76" x2="80" y2="76" />
        <line x1="56" y1="62" x2="56" y2="76" />
        <line x1="64" y1="62" x2="64" y2="76" />
      </g>
      <g stroke="#ef4444" strokeWidth="3" strokeLinecap="round">
        <line x1="56" y1="62" x2="64" y2="76" />
        <line x1="64" y1="76" x2="80" y2="62" />
      </g>
      <g stroke="#22c55e" strokeWidth="3" strokeLinecap="round">
        <line x1="80" y1="62" x2="80" y2="76" />
        <line x1="80" y1="76" x2="96" y2="62" />
      </g>
      <rect x="22" y="58" width="76" height="5" fill="#1f2937" />
      <path d="M26 60 h6 M38 60 h6 M50 60 h6 M62 60 h6 M74 60 h6 M86 60 h6" stroke="#fde68a" strokeWidth="1" />
      {[24, 40, 56, 64, 80, 96].map((x) => (
        <circle key={x} cx={x} cy="62" r="2.4" fill="#e2e8f0" stroke="#334155" />
      ))}
      <circle cx="24" cy="62" r="3.2" fill="#ef4444" />
      <circle cx="96" cy="62" r="3.2" fill="#ef4444" />
      {/* truck */}
      <g transform="translate(50 37.5)">
        <rect x="0" y="0" width="20" height="13" rx="1.5" fill="#f8fafc" />
        <rect x="2" y="3" width="12" height="5" fill="#f59e0b" />
        <path d="M21 3 H27 L31 9 V16 H21 Z" fill="#f59e0b" />
        <path d="M23 5 H26.5 L29 9 H23 Z" fill="#bfdbfe" />
        <rect x="0" y="13" width="31" height="3" fill="#374151" />
        <circle cx="6" cy="17" r="3.4" fill="#111827" />
        <circle cx="25" cy="17" r="3.4" fill="#111827" />
        <circle cx="6" cy="17" r="1.4" fill="#9ca3af" />
        <circle cx="25" cy="17" r="1.4" fill="#9ca3af" />
      </g>
      <g stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <line x1="36" y1="46" x2="44" y2="46" />
        <line x1="32" y1="51" x2="44" y2="51" />
      </g>
    </svg>
  )
}
