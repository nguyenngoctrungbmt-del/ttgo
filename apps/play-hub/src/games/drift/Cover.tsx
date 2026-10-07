/** Drift King cover: a red coupe sliding sideways around a bend with smoke and skid marks. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Drift King">
      <defs>
        <linearGradient id="drift-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fae4b" />
          <stop offset="1" stopColor="#2f7a32" />
        </linearGradient>
        <linearGradient id="drift-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7f1d1d" />
          <stop offset="0.3" stopColor="#ef4444" />
          <stop offset="0.5" stopColor="#fecaca" />
          <stop offset="0.6" stopColor="#ef4444" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
        <radialGradient id="drift-smoke" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e2e8f0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#drift-bg)" />
      {/* bend: rumble + asphalt */}
      <path d="M-10 118 Q 20 30 130 22" fill="none" stroke="#ef4444" strokeWidth="60" />
      <path d="M-10 118 Q 20 30 130 22" fill="none" stroke="#f8fafc" strokeWidth="60" strokeDasharray="8 8" />
      <path d="M-10 118 Q 20 30 130 22" fill="none" stroke="#4b5563" strokeWidth="50" />
      <path d="M-10 118 Q 20 30 130 22" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="8 10" />
      {/* skid marks */}
      <path d="M8 110 Q 22 64 50 52" fill="none" stroke="#111827" strokeOpacity="0.45" strokeWidth="3" />
      <path d="M18 114 Q 30 72 56 62" fill="none" stroke="#111827" strokeOpacity="0.45" strokeWidth="3" />
      {/* smoke */}
      <circle cx="40" cy="66" r="14" fill="url(#drift-smoke)" />
      <circle cx="28" cy="80" r="17" fill="url(#drift-smoke)" />
      <circle cx="18" cy="98" r="14" fill="url(#drift-smoke)" opacity="0.8" />
      {/* apex gate */}
      <circle cx="88" cy="58" r="7" fill="#22d3ee" opacity="0.35" />
      <circle cx="88" cy="58" r="3.5" fill="#ecfeff" />
      {/* car sliding: body angled into the bend */}
      <g transform="translate(66 46) rotate(-58)">
        <rect x="-15" y="-14" width="10" height="5" rx="2" fill="#0a0a0a" />
        <rect x="7" y="-14" width="10" height="5" rx="2" fill="#0a0a0a" />
        <rect x="-15" y="9" width="10" height="5" rx="2" fill="#0a0a0a" />
        <rect x="7" y="9" width="10" height="5" rx="2" fill="#0a0a0a" />
        <rect x="-22" y="-11" width="44" height="22" rx="7" fill="url(#drift-body)" stroke="#450a0a" strokeWidth="1" />
        <rect x="-21" y="-3.5" width="42" height="2.4" fill="#f8fafc" />
        <rect x="-21" y="1" width="42" height="2.4" fill="#f8fafc" />
        <path d="M8 -8 L8 8 L1 6.5 L1 -6.5 Z" fill="#0f172a" />
        <rect x="-10" y="-7" width="11" height="14" rx="3" fill="#ef4444" />
        <path d="M-10 -6 L-10 6 L-15 5 L-15 -5 Z" fill="#0f172a" />
        <rect x="-24" y="-10" width="4" height="20" rx="1.5" fill="#7f1d1d" />
        <rect x="19.5" y="-9" width="2.5" height="4" fill="#fef9c3" />
        <rect x="19.5" y="5" width="2.5" height="4" fill="#fef9c3" />
      </g>
      {/* tyre wall */}
      <g fill="#111827" stroke="#ef4444" strokeWidth="2">
        <circle cx="104" cy="66" r="6" />
        <circle cx="114" cy="62" r="6" />
      </g>
    </svg>
  )
}
