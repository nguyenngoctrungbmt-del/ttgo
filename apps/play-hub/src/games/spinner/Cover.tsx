/** Spin Tops cover: two battle tops clashing in a glowing bowl with sparks. */
export default function Cover() {
  const blades = (n: number, r: number, color: string, dark: string) =>
    Array.from({ length: n }, (_, i) => (
      <g key={i} transform={`rotate(${(i * 360) / n})`}>
        <path d={`M${r * 0.5} ${-r * 0.3} Q${r * 1.05} ${-r * 0.35} ${r * 1.02} ${r * 0.12} L${r * 0.78} ${r * 0.05} Q${r * 0.72} ${r * 0.32} ${r * 0.45} ${r * 0.32} Z`} fill={dark} />
        <path d={`M${r * 0.5} ${-r * 0.24} Q${r * 0.95} ${-r * 0.28} ${r * 0.94} ${r * 0.06} L${r * 0.74} 0 Q${r * 0.68} ${r * 0.24} ${r * 0.47} ${r * 0.25} Z`} fill={color} />
      </g>
    ))
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Spin Tops">
      <defs>
        <radialGradient id="spinner-bg" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0" stopColor="#4a1035" />
          <stop offset="1" stopColor="#12051a" />
        </radialGradient>
        <radialGradient id="spinner-dish" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#64748b" />
          <stop offset="0.65" stopColor="#334155" />
          <stop offset="1" stopColor="#0f172a" />
        </radialGradient>
        <radialGradient id="spinner-disk" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="0.6" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#334155" />
        </radialGradient>
        <linearGradient id="spinner-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#spinner-bg)" />
      <circle cx="60" cy="62" r="50" fill="url(#spinner-dish)" />
      <circle cx="60" cy="62" r="50" fill="none" stroke="url(#spinner-rim)" strokeWidth="5" />
      <g fill="none" stroke="#94a3b8" strokeOpacity="0.25">
        <circle cx="60" cy="62" r="34" />
        <circle cx="60" cy="62" r="18" />
      </g>
      {/* rival top (orange) */}
      <g transform="translate(80 46)">
        <ellipse cx="3" cy="5" rx="17" ry="15" fill="#000" opacity="0.35" />
        <circle r="13" fill="none" stroke="#fde047" strokeWidth="5" opacity="0.25" />
        {blades(3, 16, '#f97316', '#9a3412')}
        <circle r="10" fill="url(#spinner-disk)" />
        <circle r="6.4" fill="#7c2d12" />
        <circle r="5.4" fill="#fde047" />
        <circle cx="-2" cy="-0.5" r="1" fill="#0f172a" />
        <circle cx="2" cy="-0.5" r="1" fill="#0f172a" />
      </g>
      {/* hero top (pink) */}
      <g transform="translate(46 72)">
        <ellipse cx="4" cy="6" rx="21" ry="19" fill="#000" opacity="0.35" />
        <circle r="17" fill="none" stroke="#fbcfe8" strokeWidth="6" opacity="0.3" />
        {blades(4, 20, '#db2777', '#831843')}
        <circle r="12.5" fill="url(#spinner-disk)" />
        <circle r="8" fill="#831843" />
        <circle r="6.8" fill="#fbcfe8" />
        <circle cx="-2.4" cy="-0.5" r="1.3" fill="#0f172a" />
        <circle cx="2.4" cy="-0.5" r="1.3" fill="#0f172a" />
        <path d="M-4.5 -3.6 L-1 -2.4 M4.5 -3.6 L1 -2.4" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      {/* clash sparks */}
      <g stroke="#fde047" strokeWidth="2.4" strokeLinecap="round">
        <line x1="66" y1="58" x2="74" y2="50" />
        <line x1="64" y1="56" x2="64" y2="44" />
        <line x1="68" y1="61" x2="80" y2="64" />
      </g>
      <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round">
        <line x1="65" y1="57" x2="70" y2="52" />
        <line x1="67" y1="60" x2="74" y2="61" />
      </g>
      <circle cx="65" cy="58" r="3.5" fill="#fff7ed" />
      <path d="M22 96 q-6 -14 4 -26" fill="none" stroke="#f9a8d4" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}
