/** Star Squadron cover: a fighter blasting up at a diving boss alien. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Star Squadron">
      <defs>
        <linearGradient id="galaga-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b4b" />
          <stop offset="1" stopColor="#020617" />
        </linearGradient>
        <radialGradient id="galaga-neb" cx="0.7" cy="0.25" r="0.6">
          <stop offset="0" stopColor="#3b82f6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="galaga-laser" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ecfeff" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#galaga-bg)" />
      <rect width="120" height="120" rx="26" fill="url(#galaga-neb)" />
      <g fill="#fff">
        <circle cx="16" cy="20" r="1" />
        <circle cx="98" cy="70" r="1.2" />
        <circle cx="30" cy="62" r="0.8" />
        <circle cx="88" cy="14" r="0.9" />
        <circle cx="12" cy="92" r="1" />
        <circle cx="106" cy="100" r="0.8" />
      </g>
      {/* boss alien */}
      <g transform="translate(62 36) rotate(-12)">
        <path d="M-7 -4 L-24 -13 L-22 6 L-7 5 Z" fill="#0ea5e9" />
        <path d="M7 -4 L24 -13 L22 6 L7 5 Z" fill="#0ea5e9" />
        <path d="M-7 -9 L-5 -18 L-2 -10 L0 -19 L2 -10 L5 -18 L7 -9 Z" fill="#facc15" />
        <ellipse cx="0" cy="0" rx="12" ry="13" fill="#16a34a" />
        <ellipse cx="0" cy="4" rx="7.5" ry="7.5" fill="#4ade80" />
        <ellipse cx="-4.5" cy="-5" rx="2.4" ry="4" fill="#fff" opacity="0.4" />
        <circle cx="-4.2" cy="5" r="3" fill="#fef2f2" />
        <circle cx="4.2" cy="5" r="3" fill="#fef2f2" />
        <circle cx="-4.2" cy="6" r="1.6" fill="#b91c1c" />
        <circle cx="4.2" cy="6" r="1.6" fill="#b91c1c" />
        <path d="M-8 1 L-1 4.5 M8 1 L1 4.5" stroke="#14532d" strokeWidth="1.6" />
      </g>
      {/* small bees */}
      <g transform="translate(24 30)">
        <ellipse cx="-6" cy="-2" rx="6" ry="3.4" fill="#93c5fd" />
        <ellipse cx="6" cy="-2" rx="6" ry="3.4" fill="#93c5fd" />
        <ellipse cx="0" cy="0" rx="5" ry="7" fill="#facc15" />
        <rect x="-5" y="-3" width="10" height="2" fill="#dc2626" />
        <circle cx="0" cy="6" r="4" fill="#2563eb" />
      </g>
      <g transform="translate(98 44)">
        <ellipse cx="-6" cy="-2" rx="6" ry="3.4" fill="#93c5fd" />
        <ellipse cx="6" cy="-2" rx="6" ry="3.4" fill="#93c5fd" />
        <ellipse cx="0" cy="0" rx="5" ry="7" fill="#facc15" />
        <rect x="-5" y="-3" width="10" height="2" fill="#dc2626" />
        <circle cx="0" cy="6" r="4" fill="#2563eb" />
      </g>
      {/* lasers */}
      <rect x="50" y="52" width="3" height="20" rx="1.5" fill="url(#galaga-laser)" />
      <rect x="67" y="58" width="3" height="16" rx="1.5" fill="url(#galaga-laser)" />
      {/* fighter */}
      <g transform="translate(60 92) scale(1.6)">
        <ellipse cx="0" cy="18" rx="3.5" ry="6" fill="#38bdf8" opacity="0.7" />
        <path d="M0 -17 L4 -7 L4.5 1 L14 7 L14 14 L4.5 11 L3 15 L-3 15 L-4.5 11 L-14 14 L-14 7 L-4.5 1 L-4 -7 Z" fill="#f1f5f9" />
        <path d="M0 -1 L13 8.5 L13 13 L4 10 L-4 10 L-13 13 L-13 8.5 Z" fill="#cbd5e1" />
        <rect x="-14" y="4" width="2.5" height="10" fill="#dc2626" />
        <rect x="11.5" y="4" width="2.5" height="10" fill="#dc2626" />
        <ellipse cx="0" cy="-6" rx="2.3" ry="4.2" fill="#1d4ed8" />
      </g>
      <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.4">
        <line x1="40" y1="104" x2="40" y2="114" />
        <line x1="80" y1="104" x2="80" y2="114" />
      </g>
    </svg>
  )
}
