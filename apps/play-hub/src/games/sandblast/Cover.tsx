/** Sand Blast cover: crumbling tetromino over striped sand layers, one bridge blasting. */
export default function Cover() {
  const grains: [number, number, string][] = []
  for (let i = 0; i < 26; i++) grains.push([30 + ((i * 37) % 60), 38 + ((i * 23) % 22), i % 3 ? '#facc15' : '#fde68a'])
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Sand Blast">
      <defs>
        <linearGradient id="sandblast-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c2d12" />
          <stop offset="0.5" stopColor="#c2410c" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
        <linearGradient id="sandblast-well" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c1917" />
          <stop offset="1" stopColor="#292524" />
        </linearGradient>
        <linearGradient id="sandblast-flash" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#sandblast-sky)" />
      <rect x="16" y="12" width="88" height="98" rx="10" fill="#a16207" />
      <rect x="22" y="16" width="76" height="90" fill="url(#sandblast-well)" />
      {/* sand piles */}
      <path d="M22 106 L22 84 Q40 76 56 82 Q74 88 98 80 L98 106 Z" fill="#3b82f6" />
      <path d="M22 84 Q40 76 56 82 Q74 88 98 80 L98 74 Q78 80 58 72 Q40 66 22 74 Z" fill="#ef4444" />
      <path d="M22 74 Q40 66 58 72 Q78 80 98 74 L98 64 Q76 70 58 62 Q38 56 22 64 Z" fill="#22c55e" />
      {/* blasting bridge flash */}
      <rect x="22" y="62" width="76" height="12" fill="url(#sandblast-flash)" />
      {/* falling yellow T piece */}
      <g>
        <rect x="42" y="22" width="12" height="12" fill="#facc15" />
        <rect x="54" y="22" width="12" height="12" fill="#eab308" />
        <rect x="66" y="22" width="12" height="12" fill="#facc15" />
        <rect x="54" y="34" width="12" height="12" fill="#eab308" />
        <path d="M60 25 l1.6 3.4 3.6 .4 -2.7 2.4 .8 3.6 -3.3 -1.9 -3.3 1.9 .8 -3.6 -2.7 -2.4 3.6 -.4 z" fill="#fff" opacity="0.9" />
      </g>
      {grains.map(([x, y, c], i) => (
        <rect key={i} x={x} y={y + 12} width="2.4" height="2.4" fill={c} opacity={0.5 + (i % 3) * 0.2} />
      ))}
      <g stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8">
        <line x1="10" y1="68" x2="18" y2="68" />
        <line x1="102" y1="68" x2="110" y2="68" />
      </g>
    </svg>
  )
}
