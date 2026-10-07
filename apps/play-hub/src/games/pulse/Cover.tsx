/** Pulse Dash cover: a neon cube leaping over spikes to the beat. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Pulse Dash">
      <defs>
        <linearGradient id="pulse-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e0640" />
          <stop offset="1" stopColor="#4c1d95" />
        </linearGradient>
        <radialGradient id="pulse-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e879f9" stopOpacity="0.7" />
          <stop offset="1" stopColor="#e879f9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pulse-cube" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#pulse-bg)" />
      <circle cx="60" cy="52" r="48" fill="url(#pulse-glow)" />
      <g fill="#2e1065">
        <rect x="6" y="56" width="16" height="30" />
        <rect x="26" y="44" width="14" height="42" />
        <rect x="84" y="50" width="16" height="36" />
        <rect x="102" y="62" width="14" height="24" />
      </g>
      <g fill="#c084fc" opacity="0.6">
        <rect x="6" y="56" width="16" height="2" />
        <rect x="26" y="44" width="14" height="2" />
        <rect x="84" y="50" width="16" height="2" />
        <rect x="102" y="62" width="14" height="2" />
      </g>
      <rect x="0" y="86" width="120" height="34" fill="#12052b" />
      <rect x="0" y="86" width="120" height="3" fill="#f0abfc" />
      {/* spikes */}
      <g fill="#12040a" stroke="#ff6b88" strokeWidth="2" strokeLinejoin="round">
        <path d="M58 86 L67 68 L76 86 Z" />
        <path d="M76 86 L85 68 L94 86 Z" />
      </g>
      {/* trail */}
      <g fill="#fb923c">
        <rect x="18" y="62" width="10" height="10" opacity="0.2" transform="rotate(10 23 67)" />
        <rect x="30" y="52" width="12" height="12" opacity="0.35" transform="rotate(25 36 58)" />
      </g>
      {/* arc */}
      <path d="M20 84 Q50 10 92 60" stroke="#fff" strokeWidth="2" strokeDasharray="3 5" fill="none" opacity="0.5" />
      {/* cube */}
      <g transform="translate(58 40) rotate(30)">
        <rect x="-15" y="-15" width="30" height="30" fill="#0a0a14" />
        <rect x="-13" y="-13" width="26" height="26" fill="url(#pulse-cube)" />
        <rect x="-7" y="-7" width="14" height="14" fill="#0a0a14" opacity="0.55" />
        <rect x="-5" y="-5" width="10" height="10" fill="#fef3c7" />
        <rect x="-4" y="-3" width="2.5" height="4" fill="#0a0a14" />
        <rect x="1.5" y="-3" width="2.5" height="4" fill="#0a0a14" />
        <rect x="-13" y="-13" width="26" height="3" fill="#fff" opacity="0.5" />
      </g>
      {/* orb */}
      <circle cx="98" cy="28" r="7" fill="none" stroke="#fde047" strokeWidth="3" />
      <circle cx="98" cy="28" r="3" fill="#fef9c3" />
    </svg>
  )
}
