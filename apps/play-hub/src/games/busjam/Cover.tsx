/** Bus Jam cover: a yellow bus at the stop with a queue of colourful passengers. */
export default function Cover() {
  const people: [number, number, string, string][] = [
    [26, 100, '#ef4444', '#3f2a1d'],
    [46, 104, '#3b82f6', '#111827'],
    [66, 100, '#ef4444', '#f2c14e'],
    [86, 104, '#22c55e', '#3f2a1d'],
  ]
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Bus Jam">
      <defs>
        <linearGradient id="busjam-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#bae6fd" />
        </linearGradient>
        <linearGradient id="busjam-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="0.35" stopColor="#f59e0b" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="busjam-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7dd3fc" />
          <stop offset="1" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="busjam-yard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#busjam-sky)" />
      <rect x="6" y="20" width="16" height="24" fill="#a78bfa" />
      <rect x="24" y="12" width="14" height="32" fill="#f472b6" />
      <rect x="84" y="16" width="16" height="28" fill="#34d399" />
      <rect x="102" y="24" width="14" height="20" fill="#818cf8" />
      <rect y="42" width="120" height="38" fill="#475569" />
      <rect y="80" width="120" height="40" fill="url(#busjam-yard)" />
      <rect y="78" width="120" height="5" fill="#e2e8f0" />
      {/* bus */}
      <g>
        <ellipse cx="60" cy="78" rx="46" ry="3.5" fill="#0f172a" opacity="0.35" />
        <path d="M16 74 L15 46 Q15 38 22 38 L92 38 Q101 39 104 56 L104 74 Z" fill="url(#busjam-body)" stroke="#92400e" strokeWidth="2" />
        <rect x="21" y="41" width="56" height="4" rx="2" fill="#fff" opacity="0.4" />
        {[21, 40, 59].map((x, i) => (
          <g key={x}>
            <rect x={x} y="48" width="16" height="15" rx="3" fill="url(#busjam-glass)" />
            <circle cx={x + 8} cy="57" r="4" fill="#fcd9b8" />
            <path d={`M${x + 4} 55 a4 4 0 0 1 8 0`} fill={['#3f2a1d', '#111827', '#f2c14e'][i]} />
            <path d={`M${x + 12} 60 l3 -7`} stroke="#fcd9b8" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}
        <path d="M86 48 L93 48 Q100 52 101 63 L86 63 Z" fill="#0c4a6e" />
        <rect x="78" y="48" width="6" height="22" rx="2" fill="#92400e" />
        <rect x="15" y="70" width="90" height="4" rx="2" fill="#334155" />
        <circle cx="32" cy="75" r="7" fill="#111827" />
        <circle cx="32" cy="75" r="3.2" fill="#cbd5e1" />
        <circle cx="90" cy="75" r="7" fill="#111827" />
        <circle cx="90" cy="75" r="3.2" fill="#cbd5e1" />
        <ellipse cx="103.5" cy="66" rx="1.5" ry="3" fill="#fef08a" />
        <rect x="34" y="65" width="14" height="4" rx="2" fill="#fff" opacity="0.85" />
      </g>
      {/* motion lines */}
      <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.7">
        <line x1="4" y1="52" x2="11" y2="52" />
        <line x1="2" y1="60" x2="11" y2="60" />
        <line x1="5" y1="68" x2="11" y2="68" />
      </g>
      {/* passengers */}
      {people.map(([x, y, c, hair]) => (
        <g key={x}>
          <ellipse cx={x} cy={y + 9} rx="8" ry="2.5" fill="#92400e" opacity="0.3" />
          <path d={`M${x - 7} ${y + 8} L${x - 7} ${y} Q${x} ${y - 6} ${x + 7} ${y} L${x + 7} ${y + 8} Z`} fill={c} />
          <circle cx={x} cy={y - 7} r="5.5" fill="#fcd9b8" />
          <path d={`M${x - 5.5} ${y - 8} a5.5 5.5 0 0 1 11 0`} fill={hair} />
          <circle cx={x - 2} cy={y - 6} r="0.9" fill="#1f2937" />
          <circle cx={x + 2} cy={y - 6} r="0.9" fill="#1f2937" />
        </g>
      ))}
    </svg>
  )
}
