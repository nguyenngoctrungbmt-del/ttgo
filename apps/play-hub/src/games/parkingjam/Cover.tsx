/** Parking Jam cover: a packed lot seen from above, one red car driving out. */
export default function Cover() {
  const car = (x: number, y: number, rot: number, body: string, light: string, key: string, len = 30) => (
    <g key={key} transform={`translate(${x} ${y}) rotate(${rot})`}>
      <rect x={-len / 2 + 1.5} y="-8" width={len} height="17" rx="6" fill="#020617" opacity="0.35" />
      <rect x={-len / 2} y="-9" width={len} height="18" rx="6" fill={body} />
      <rect x={-len / 2 + 2} y="-7" width={len - 4} height="5" rx="2.5" fill={light} opacity="0.55" />
      <path d={`M${len * 0.08} -7 L${len * 0.26} -7.5 Q${len * 0.3} 0 ${len * 0.26} 7.5 L${len * 0.08} 7 Z`} fill="#0c4a6e" />
      <rect x={-len * 0.24} y="-6" width={len * 0.32} height="12" rx="2.5" fill={light} opacity="0.7" />
      <rect x={len / 2 - 2.5} y="-6.5" width="2" height="3" fill="#fef9c3" />
      <rect x={len / 2 - 2.5} y="3.5" width="2" height="3" fill="#fef9c3" />
    </g>
  )
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Parking Jam">
      <defs>
        <linearGradient id="parkingjam-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ade80" />
          <stop offset="1" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="parkingjam-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fca5a5" />
          <stop offset="0.45" stopColor="#ef4444" />
          <stop offset="1" stopColor="#991b1b" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#parkingjam-grass)" />
      <rect x="10" y="10" width="100" height="100" rx="10" fill="#475569" />
      <rect x="22" y="22" width="76" height="76" fill="#334155" stroke="#facc15" strokeWidth="2" />
      <g stroke="#ffffff" strokeOpacity="0.2" strokeWidth="1.2">
        <line x1="41" y1="24" x2="41" y2="96" />
        <line x1="60" y1="24" x2="60" y2="96" />
        <line x1="79" y1="24" x2="79" y2="96" />
      </g>
      {car(41, 36, 90, '#3b82f6', '#93c5fd', 'a')}
      {car(79, 41, 90, '#facc15', '#fef08a', 'b')}
      {car(50, 80, 0, '#22c55e', '#86efac', 'c')}
      {car(84, 80, 90, '#a855f7', '#d8b4fe', 'd')}
      {car(26, 72, 90, '#14b8a6', '#5eead4', 'e')}
      {/* hero car driving out the top */}
      <g transform="translate(60 22) rotate(-90)">
        <rect x="-15" y="-9" width="30" height="18" rx="6" fill="url(#parkingjam-red)" />
        <path d="M2.4 -7 L7.8 -7.5 Q9 0 7.8 7.5 L2.4 7 Z" fill="#0c4a6e" />
        <rect x="-7" y="-6" width="9.6" height="12" rx="2.5" fill="#fca5a5" opacity="0.8" />
        <rect x="12.5" y="-6.5" width="2" height="3" fill="#fef9c3" />
        <rect x="12.5" y="3.5" width="2" height="3" fill="#fef9c3" />
      </g>
      <g stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.75">
        <line x1="54" y1="44" x2="54" y2="54" />
        <line x1="66" y1="44" x2="66" y2="56" />
        <line x1="60" y1="46" x2="60" y2="60" />
      </g>
      <circle cx="52" cy="48" r="3" fill="#e2e8f0" opacity="0.7" />
      <circle cx="68" cy="50" r="2.4" fill="#e2e8f0" opacity="0.6" />
    </svg>
  )
}
