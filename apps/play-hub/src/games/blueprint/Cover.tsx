/** Blueprint cover: a house plan on blue grid paper, a piece dropping into place. */
export default function Cover() {
  const grid = []
  for (let i = 12; i < 120; i += 12) {
    grid.push(<line key={`v${i}`} x1={i} y1="0" x2={i} y2="120" />)
    grid.push(<line key={`h${i}`} x1="0" y1={i} x2="120" y2={i} />)
  }
  const brick = (x: number, y: number, fill: string, k: string) => (
    <g key={k}>
      <rect x={x} y={y} width="13" height="13" rx="2" fill={fill} />
      <rect x={x + 1.5} y={y + 1.2} width="10" height="1.6" fill="#fff" opacity="0.4" />
    </g>
  )
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Blueprint">
      <defs>
        <linearGradient id="blueprint-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#1e3a8a" />
        </linearGradient>
        <radialGradient id="blueprint-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#93c5fd" stopOpacity="0.45" />
          <stop offset="1" stopColor="#93c5fd" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#blueprint-bg)" />
      <g stroke="#bfdbfe" strokeOpacity="0.16" strokeWidth="1">{grid}</g>
      <circle cx="60" cy="64" r="48" fill="url(#blueprint-glow)" />
      {/* dashed plan outline */}
      <path d="M21 92 V60 L60 30 L99 60 V92 Z" fill="#93c5fd" fillOpacity="0.18" stroke="#e0f2fe" strokeWidth="2" strokeDasharray="4 3" />
      {/* placed bricks */}
      {[28, 41, 54, 67, 80].map((x, i) => brick(x, 79, i === 2 ? '#92400e' : '#d9653f', `a${x}`))}
      {[28, 41, 67, 80].map((x) => brick(x, 66, '#d9653f', `b${x}`))}
      {brick(54, 66, '#92400e', 'door')}
      <rect x="41" y="66" width="13" height="13" rx="2" fill="#7dd3fc" />
      <path d="M43 77 L50 68 H52 L45 77 Z" fill="#fff" opacity="0.6" />
      {/* roof */}
      <path d="M28 64 L60 39 L92 64 Z" fill="#b91c1c" />
      <path d="M28 64 L60 39 L66 44 L38 64 Z" fill="#ef4444" opacity="0.6" />
      {/* falling piece */}
      <g transform="translate(70 12) rotate(8)">
        {brick(0, 0, '#f59e0b', 'p1')}
        {brick(13, 0, '#f59e0b', 'p2')}
        {brick(13, 13, '#f59e0b', 'p3')}
      </g>
      <g stroke="#fde047" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <line x1="72" y1="4" x2="72" y2="9" />
        <line x1="86" y1="2" x2="86" y2="8" />
      </g>
      {/* smoke */}
      <rect x="78" y="40" width="7" height="12" fill="#9f4a32" />
      <circle cx="83" cy="34" r="4" fill="#e2e8f0" opacity="0.8" />
      <circle cx="88" cy="27" r="5" fill="#e2e8f0" opacity="0.55" />
      <line x1="14" y1="100" x2="106" y2="100" stroke="#bfdbfe" strokeWidth="2" opacity="0.6" />
    </svg>
  )
}
