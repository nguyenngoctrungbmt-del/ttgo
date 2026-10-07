/** What Changed? cover: a magnifying glass over a cosy scene with a fish that flipped. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="What Changed?">
      <defs>
        <linearGradient id="changed-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <linearGradient id="changed-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde7c8" />
          <stop offset="1" stopColor="#f8d4a8" />
        </linearGradient>
        <radialGradient id="changed-lens" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#bae6fd" stopOpacity="0.15" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#changed-bg)" />
      <rect x="14" y="16" width="92" height="80" rx="8" fill="#78350f" />
      <rect x="19" y="21" width="82" height="70" rx="5" fill="url(#changed-wall)" />
      <rect x="19" y="66" width="82" height="25" fill="#b45309" />
      {/* frame on wall */}
      <rect x="26" y="28" width="22" height="17" rx="2" fill="#8b5cf6" />
      <rect x="29" y="31" width="16" height="11" fill="#bae6fd" />
      <path d="M29 42 L35 35 L39 39 L42 36 L45 42 Z" fill="#22c55e" />
      {/* plant */}
      <path d="M84 52 q-6 -12 0 -18 q6 6 0 18z M84 52 q-12 -6 -12 -14 q8 2 12 14z M84 52 q12 -6 12 -14 q-8 2 -12 14z" fill="#16a34a" />
      <path d="M77 52 h14 l-2 14 h-10 z" fill="#ef4444" />
      {/* ball */}
      <circle cx="36" cy="78" r="8" fill="#facc15" />
      <path d="M30 74 q6 4 12 0" stroke="#fff" strokeWidth="2" fill="none" />
      {/* changed: ring + sparkle */}
      <circle cx="84" cy="56" r="17" fill="none" stroke="#22c55e" strokeWidth="3" strokeDasharray="5 3" />
      {/* magnifier */}
      <g transform="rotate(-35 66 74)">
        <rect x="62" y="90" width="9" height="26" rx="4" fill="#7c2d12" />
        <rect x="62" y="88" width="9" height="6" fill="#facc15" />
      </g>
      <circle cx="60" cy="70" r="17" fill="url(#changed-lens)" stroke="#f8fafc" strokeWidth="4.5" />
      <path d="M50 64 q4 -6 10 -6" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <g stroke="#fde047" strokeWidth="2.4" strokeLinecap="round">
        <line x1="100" y1="44" x2="106" y2="40" />
        <line x1="102" y1="54" x2="109" y2="55" />
      </g>
    </svg>
  )
}
