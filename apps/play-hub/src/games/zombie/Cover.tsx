/** Last Stand cover: a zombie lurching toward the barricade under a crosshair, moonlit ruins behind. */
export default function Cover() {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Last Stand">
      <defs>
        <linearGradient id="zombie-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e1b2e" />
          <stop offset="1" stopColor="#5b4470" />
        </linearGradient>
        <linearGradient id="zombie-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4d4433" />
          <stop offset="1" stopColor="#1c1917" />
        </linearGradient>
        <radialGradient id="zombie-moon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="0.6" stopColor="#fef3c7" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fef3c7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="zombie-skin" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#a3c46b" />
          <stop offset="1" stopColor="#4d7c0f" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#zombie-sky)" />
      <circle cx="28" cy="24" r="18" fill="url(#zombie-moon)" />
      <circle cx="28" cy="24" r="8" fill="#fef9c3" />
      <g fill="#2a2236">
        <rect x="0" y="40" width="14" height="22" />
        <rect x="16" y="46" width="12" height="16" />
        <rect x="84" y="36" width="14" height="26" />
        <rect x="100" y="44" width="20" height="18" />
      </g>
      <rect x="0" y="60" width="120" height="60" fill="url(#zombie-ground)" />
      {/* zombie */}
      <ellipse cx="60" cy="94" rx="20" ry="4" fill="#000" opacity="0.35" />
      <path d="M52 94 L54 72 M68 94 L66 72" stroke="#1f2937" strokeWidth="6" strokeLinecap="round" />
      <rect x="45" y="52" width="30" height="24" rx="5" fill="#334155" />
      <rect x="45" y="52" width="4" height="24" fill="#ffffff" opacity="0.12" />
      <path d="M46 57 L34 66 M74 57 L86 64" stroke="url(#zombie-skin)" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="60" cy="42" r="12" fill="url(#zombie-skin)" />
      <rect x="53" y="39" width="4.5" height="3" fill="#fde047" />
      <rect x="62.5" y="39" width="4.5" height="3" fill="#fde047" />
      <ellipse cx="60" cy="48" rx="3.5" ry="2.4" fill="#1c1917" />
      {/* crosshair on the head */}
      <g stroke="#ef4444" strokeWidth="2" fill="none" strokeLinecap="round">
        <circle cx="60" cy="42" r="17" />
        <line x1="60" y1="20" x2="60" y2="30" />
        <line x1="60" y1="54" x2="60" y2="64" />
        <line x1="38" y1="42" x2="48" y2="42" />
        <line x1="72" y1="42" x2="82" y2="42" />
      </g>
      {/* barricade planks */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${i * 30 + 15} 104) rotate(${i % 2 ? 6 : -5})`}>
          <rect x="-14" y="-10" width="28" height="18" fill="#92400e" stroke="#451a03" strokeWidth="1.5" />
          <line x1="-12" y1="-8" x2="12" y2="6" stroke="#451a03" strokeWidth="1.5" />
        </g>
      ))}
    </svg>
  )
}
