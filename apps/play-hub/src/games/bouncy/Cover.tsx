/** Bounce Up cover: a round chick springing upward past clouds and platforms. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Bounce Up">
      <defs>
        <linearGradient id="bouncy-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#bae6fd" />
        </linearGradient>
        <radialGradient id="bouncy-body" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="0.6" stopColor="#facc15" />
          <stop offset="1" stopColor="#ea8a0c" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#bouncy-sky)" />
      <g fill="#fff" opacity="0.85">
        <ellipse cx="22" cy="30" rx="16" ry="6" />
        <ellipse cx="32" cy="26" rx="10" ry="6" />
        <ellipse cx="96" cy="50" rx="14" ry="5" />
        <ellipse cx="88" cy="46" rx="9" ry="5" />
      </g>
      {/* platforms */}
      <rect x="8" y="98" width="40" height="9" rx="4" fill="#92400e" />
      <rect x="7" y="96" width="42" height="6" rx="3" fill="#22c55e" />
      <rect x="72" y="76" width="38" height="9" rx="4.5" fill="#1d4ed8" />
      <rect x="74" y="76" width="34" height="4" rx="2" fill="#60a5fa" />
      {/* spring */}
      <path d="M28 96 L22 92 L34 88 L22 84 L34 80" stroke="#94a3b8" strokeWidth="2.5" fill="none" />
      <rect x="20" y="76" width="16" height="4" rx="2" fill="#ef4444" />
      {/* motion lines */}
      <g stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
        <line x1="44" y1="74" x2="44" y2="88" />
        <line x1="54" y1="78" x2="54" y2="96" />
        <line x1="64" y1="74" x2="64" y2="86" />
      </g>
      {/* hero, stretched upward */}
      <g transform="translate(55 46) scale(0.92 1.12)">
        <ellipse cx="-7" cy="17" rx="6" ry="3.5" fill="#ea580c" />
        <ellipse cx="7" cy="19" rx="6" ry="3.5" fill="#ea580c" />
        <circle cx="0" cy="0" r="18" fill="url(#bouncy-body)" stroke="#b45309" strokeWidth="1.5" />
        <ellipse cx="-11" cy="4" rx="6" ry="8" fill="#f59e0b" transform="rotate(30 -11 4)" />
        <ellipse cx="6" cy="-5" rx="6.5" ry="7.5" fill="#fff" />
        <circle cx="7.5" cy="-7" r="3.3" fill="#1e293b" />
        <circle cx="8.6" cy="-8.4" r="1.2" fill="#fff" />
        <path d="M15 1 L24 3.5 L15 7 Z" fill="#f97316" />
        <ellipse cx="4" cy="7" rx="3.5" ry="2.2" fill="#f472b6" opacity="0.55" />
        <path d="M-1 -17 Q-4 -25 2 -26" stroke="#ea8a0c" strokeWidth="2.5" fill="none" />
      </g>
    </svg>
  )
}
