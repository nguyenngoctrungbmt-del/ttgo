/** Block Jam cover: chunky colour blocks on a framed board, one sliding out of its door. */
export default function Cover() {
  const cell = (x: number, y: number, top: string, side: string, key: string) => (
    <g key={key}>
      <rect x={x + 1} y={y + 4} width="18" height="18" rx="4" fill={side} />
      <rect x={x + 1} y={y + 1} width="18" height="18" rx="4" fill={top} />
      <rect x={x + 4} y={y + 3} width="12" height="3" rx="1.5" fill="#fff" opacity="0.4" />
    </g>
  )
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Block Jam">
      <defs>
        <linearGradient id="blockjam-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f472b6" />
          <stop offset="1" stopColor="#9d174d" />
        </linearGradient>
        <linearGradient id="blockjam-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#3730a3" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#blockjam-bg)" />
      <rect x="14" y="18" width="92" height="92" rx="12" fill="url(#blockjam-frame)" />
      <rect x="22" y="26" width="76" height="76" fill="#dbe3ff" />
      {/* doors */}
      <rect x="42" y="18" width="36" height="8" rx="3" fill="#facc15" />
      <rect x="98" y="66" width="8" height="20" rx="3" fill="#3b82f6" />
      <rect x="14" y="46" width="8" height="20" rx="3" fill="#ef4444" />
      {/* blocks */}
      {cell(22, 46, '#ef4444', '#991b1b', 'r1')}
      {cell(22, 64, '#ef4444', '#991b1b', 'r2')}
      {cell(40, 64, '#ef4444', '#991b1b', 'r3')}
      {cell(58, 64, '#22c55e', '#14532d', 'g1')}
      {cell(58, 82, '#22c55e', '#14532d', 'g2')}
      {cell(76, 82, '#22c55e', '#14532d', 'g3')}
      {cell(76, 46, '#3b82f6', '#1e3a8a', 'b1')}
      {cell(76, 64, '#3b82f6', '#1e3a8a', 'b2')}
      {cell(22, 82, '#a855f7', '#581c87', 'p1')}
      {/* yellow block popping out the top door */}
      <g transform="translate(0 -12)">
        {cell(44, 14, '#facc15', '#a16207', 'y1')}
        {cell(58, 14, '#facc15', '#a16207', 'y2')}
      </g>
      <path d="M60 10 l4 -5 l4 5 z" fill="#fff" opacity="0.85" />
      <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.7">
        <line x1="50" y1="34" x2="50" y2="42" />
        <line x1="60" y1="32" x2="60" y2="44" />
        <line x1="70" y1="34" x2="70" y2="42" />
      </g>
      <path d="M32 59 l3 -4 l3 4 z M32 74 l3 4 l3 -4 z" fill="#fff" opacity="0.9" />
    </svg>
  )
}
