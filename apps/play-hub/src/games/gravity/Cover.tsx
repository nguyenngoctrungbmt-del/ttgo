/** Gravity Flip cover: a little robot swooping from floor to ceiling past a saw. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Gravity Flip">
      <defs>
        <linearGradient id="gravity-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#140a2e" />
          <stop offset="0.5" stopColor="#3b1d7a" />
          <stop offset="1" stopColor="#140a2e" />
        </linearGradient>
        <linearGradient id="gravity-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c7d2fe" />
        </linearGradient>
        <radialGradient id="gravity-saw" cx="0.4" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="1" stopColor="#64748b" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#gravity-bg)" />
      <rect x="0" y="0" width="120" height="24" fill="#2e1a5c" />
      <rect x="0" y="22" width="120" height="3" fill="#a78bfa" />
      <rect x="0" y="96" width="120" height="24" fill="#2e1a5c" />
      <rect x="0" y="95" width="120" height="3" fill="#a78bfa" />
      {/* saw on floor */}
      <g transform="translate(92 96)">
        <path d="M0 -20 L5 -15 L12 -16 L13 -9 L19 -6 L16 0 L-16 0 L-19 -6 L-13 -9 L-12 -16 L-5 -15 Z" fill="#cbd5e1" stroke="#ef4444" strokeWidth="2" />
        <path d="M-12 0 A12 12 0 0 1 12 0 Z" fill="url(#gravity-saw)" />
        <circle cx="0" cy="0" r="3" fill="#7f1d1d" />
      </g>
      {/* ceiling spikes */}
      <g fill="#e2e8f0" stroke="#ef4444" strokeWidth="1.5">
        <path d="M70 25 L77 38 L84 25 Z" />
        <path d="M84 25 L91 38 L98 25 Z" />
      </g>
      {/* swoop trail */}
      <path d="M8 92 C30 92 30 40 52 34" stroke="#a78bfa" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.35" />
      <path d="M14 92 C32 90 32 44 52 36" stroke="#c4b5fd" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.7" />
      {/* orbs */}
      <circle cx="30" cy="60" r="4" fill="#a5f3fc" />
      <circle cx="104" cy="60" r="4" fill="#a5f3fc" />
      {/* robot, upside down mid-flip */}
      <g transform="translate(56 44) rotate(160)">
        <path d="M-4 8 L-2 15 M4 8 L6 15" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
        <path d="M0 -12 Q-3 -18 -6 -21" stroke="#94a3b8" strokeWidth="2" fill="none" />
        <circle cx="-6" cy="-21" r="3" fill="#c4b5fd" />
        <rect x="-12" y="-13" width="24" height="22" rx="9" fill="url(#gravity-body)" stroke="#4338ca" strokeWidth="1.5" />
        <rect x="-8" y="-8" width="18" height="9" rx="4.5" fill="#1e1b4b" />
        <circle cx="-2" cy="-3.5" r="2.2" fill="#c4b5fd" />
        <circle cx="5" cy="-3.5" r="2.2" fill="#c4b5fd" />
      </g>
    </svg>
  )
}
