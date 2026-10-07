/** Screw Jam cover: layered plates on a pegboard with a screw spinning out toward its toolbox. */
export default function Cover() {
  const screw = (x: number, y: number, r: number, fill: string, dark: string, sym: 'cross' | 'slot' | 'star') => (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="1.5" cy="2.5" r={r} fill="#000" opacity="0.3" />
      <circle r={r} fill={fill} stroke={dark} strokeWidth="1.2" />
      <circle cx={-r * 0.3} cy={-r * 0.35} r={r * 0.35} fill="#fff" opacity="0.4" />
      {sym === 'cross' ? <path d={`M${-r * 0.55} 0H${r * 0.55}M0 ${-r * 0.55}V${r * 0.55}`} stroke="#1f2937" strokeWidth="2" strokeLinecap="round" /> : null}
      {sym === 'slot' ? <path d={`M${-r * 0.6} 0H${r * 0.6}`} stroke="#1f2937" strokeWidth="2" strokeLinecap="round" /> : null}
      {sym === 'star' ? <path d="M0 -3.5 L1 -1 3.5 -1 1.5 0.8 2.2 3.4 0 1.9 -2.2 3.4 -1.5 0.8 -3.5 -1 -1 -1 Z" fill="#1f2937" /> : null}
    </g>
  )
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Screw Jam">
      <defs>
        <linearGradient id="screwjam-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#334155" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="screwjam-peg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a16207" />
          <stop offset="1" stopColor="#713f12" />
        </linearGradient>
        <linearGradient id="screwjam-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f5d6a8" />
          <stop offset="1" stopColor="#d9a86c" />
        </linearGradient>
        <linearGradient id="screwjam-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2e8f0" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="screwjam-box" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fca5a5" />
          <stop offset="0.4" stopColor="#ef4444" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#screwjam-bg)" />
      <rect x="14" y="44" width="92" height="66" rx="10" fill="url(#screwjam-peg)" />
      <g fill="#422006" opacity="0.45">
        {[0, 1, 2, 3, 4, 5].map((i) => [0, 1, 2, 3].map((j) => <circle key={`${i}-${j}`} cx={22 + i * 15} cy={52 + j * 15} r="1.5" />))}
      </g>
      <g transform="rotate(-24 52 82)">
        <rect x="22" y="82" width="64" height="16" rx="8" fill="#000" opacity="0.3" transform="translate(2 4)" />
        <rect x="22" y="76" width="64" height="16" rx="8" fill="url(#screwjam-metal)" stroke="#475569" strokeWidth="1.5" />
      </g>
      <rect x="54" y="64" width="40" height="34" rx="7" fill="#000" opacity="0.3" transform="translate(3 5)" />
      <rect x="54" y="64" width="40" height="34" rx="7" fill="url(#screwjam-wood)" stroke="#9a6a36" strokeWidth="1.5" />
      <path d="M58 72c10 2 22-2 32 1M58 82c10 2 22-2 32 1M58 91c10 2 22-2 32 1" stroke="#9a6a36" strokeOpacity="0.35" fill="none" />
      {screw(34, 96, 6, '#3b82f6', '#1e3a8a', 'slot')}
      {screw(62, 72, 6, '#facc15', '#a16207', 'star')}
      {screw(86, 90, 6, '#3b82f6', '#1e3a8a', 'slot')}
      <circle cx="78" cy="51" r="3.5" fill="#1c1917" opacity="0.7" />
      {/* toolbox */}
      <rect x="18" y="12" width="52" height="24" rx="6" fill="url(#screwjam-box)" stroke="#7f1d1d" strokeWidth="1.5" />
      <path d="M36 12 l2 -5 h12 l2 5" stroke="#7f1d1d" strokeWidth="3" fill="none" />
      <circle cx="30" cy="24" r="5" fill="#0f172a" opacity="0.5" />
      {screw(44, 24, 5, '#ef4444', '#7f1d1d', 'cross')}
      <circle cx="58" cy="24" r="5" fill="#0f172a" opacity="0.5" />
      {/* flying screw */}
      <path d="M78 48 q10 -22 -14 -26" stroke="#fef9c3" strokeWidth="2" strokeDasharray="3 3" fill="none" strokeLinecap="round" />
      <rect x="85" y="26" width="5" height="12" rx="1.5" fill="#9ca3af" transform="rotate(20 87 32)" />
      {screw(86, 24, 7.5, '#ef4444', '#7f1d1d', 'cross')}
      <g stroke="#fde047" strokeWidth="2" strokeLinecap="round">
        <path d="M98 16 l5 -4" />
        <path d="M100 26 h6" />
      </g>
    </svg>
  )
}
