/** N-Back Flash cover: a stream of glowing shape cards with a loop arrow linking a match. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="N-Back Flash">
      <defs>
        <linearGradient id="nback-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#db2777" />
          <stop offset="1" stopColor="#3b0764" />
        </linearGradient>
        <linearGradient id="nback-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e9d5ff" />
        </linearGradient>
        <radialGradient id="nback-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f0abfc" stopOpacity="0.7" />
          <stop offset="1" stopColor="#f0abfc" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#nback-bg)" />
      <circle cx="84" cy="66" r="40" fill="url(#nback-glow)" />
      {/* small history cards */}
      <g opacity="0.75">
        <rect x="10" y="52" width="22" height="26" rx="5" fill="url(#nback-card)" />
        <path d="M21 58 l6 10 h-12 z" fill="#f59e0b" />
        <rect x="36" y="52" width="22" height="26" rx="5" fill="url(#nback-card)" />
        <rect x="41" y="59" width="12" height="12" rx="2.5" fill="#3b82f6" />
      </g>
      {/* current card */}
      <rect x="64" y="40" width="44" height="52" rx="9" fill="url(#nback-card)" stroke="#4ade80" strokeWidth="3" />
      <path d="M86 52 l11 19 h-22 z" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
      {/* loop arrow linking matching cards */}
      <path d="M21 48 Q21 22 54 22 Q86 22 86 36" stroke="#fde047" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M80 32 L86 39 L92 32" stroke="#fde047" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="54" cy="22" r="7" fill="#7c3aed" stroke="#fde047" strokeWidth="2" />
      <circle cx="54" cy="22" r="2.6" fill="#fde047" />
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <line x1="70" y1="100" x2="102" y2="100" />
        <line x1="78" y1="106" x2="94" y2="106" />
      </g>
    </svg>
  )
}
