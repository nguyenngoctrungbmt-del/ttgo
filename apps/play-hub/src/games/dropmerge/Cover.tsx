/** Drop Merge cover: a glowing block dropping into a column onto its twin. */
export default function Cover() {
  const block = (x: number, y: number, s: number, top: string, mid: string, bot: string, n: string, ink = '#fff') => (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-s / 2} y={-s / 2 + s * 0.07} width={s} height={s * 0.93} rx={s * 0.2} fill={bot} />
      <rect x={-s / 2} y={-s / 2} width={s} height={s * 0.88} rx={s * 0.2} fill={mid} />
      <rect x={-s / 2} y={-s / 2} width={s} height={s * 0.45} rx={s * 0.2} fill={top} opacity="0.7" />
      <rect x={-s / 2 + s * 0.1} y={-s / 2 + s * 0.07} width={s * 0.8} height={s * 0.13} rx={s * 0.06} fill="#fff" opacity="0.4" />
      <path d={n} transform={`scale(${s / 24})`} fill={ink} />
    </g>
  )
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Drop Merge">
      <defs>
        <linearGradient id="dropmerge-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e40af" />
          <stop offset="1" stopColor="#0b1d4a" />
        </linearGradient>
        <radialGradient id="dropmerge-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.8" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#dropmerge-bg)" />
      <g fill="#bfdbfe" opacity="0.6">
        <circle cx="16" cy="18" r="1.2" />
        <circle cx="104" cy="26" r="1.5" />
        <circle cx="96" cy="12" r="1" />
      </g>
      <rect x="14" y="40" width="28" height="70" rx="8" fill="#1e3a8a" opacity="0.8" />
      <rect x="46" y="40" width="28" height="70" rx="8" fill="#2563eb" opacity="0.55" />
      <rect x="78" y="40" width="28" height="70" rx="8" fill="#1e3a8a" opacity="0.8" />
      {block(28, 96, 24, '#bbf7d0', '#4ade80', '#15803d', 'M0 -6 L6 0 L0 6 L-6 0 Z')}
      {block(92, 96, 24, '#fed7aa', '#fb923c', '#c2410c', 'M0 -7 L2 -2 L7 -2 L3 1.5 L4.5 7 L0 3.5 L-4.5 7 L-3 1.5 L-7 -2 L-2 -2 Z')}
      {block(92, 71, 24, '#bae6fd', '#38bdf8', '#0369a1', 'M0 -6 C4 -1 4 6 0 6 C-4 6 -4 -1 0 -6 Z')}
      <circle cx="60" cy="96" r="20" fill="url(#dropmerge-glow)" />
      {block(60, 96, 24, '#fef9c3', '#facc15', '#a16207', 'M0 -6 L6.5 5 L-6.5 5 Z', '#422006')}
      {block(60, 52, 26, '#fef9c3', '#facc15', '#a16207', 'M0 -6 L6.5 5 L-6.5 5 Z', '#422006')}
      <g stroke="#fef9c3" strokeWidth="2.4" strokeLinecap="round" opacity="0.7">
        <line x1="52" y1="22" x2="52" y2="34" />
        <line x1="68" y1="22" x2="68" y2="34" />
        <line x1="60" y1="16" x2="60" y2="30" />
      </g>
      <path d="M60 70 v8 m-4 -4 l4 4 l4 -4" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  )
}
