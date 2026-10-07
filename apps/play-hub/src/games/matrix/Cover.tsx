/** Grid Recall cover: a glowing 4×4 grid with tiles flipping up. */
export default function Cover() {
  const lit = new Set([1, 6, 8, 11, 13])
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Grid Recall">
      <defs>
        <linearGradient id="matrix-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d28d9" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
        <linearGradient id="matrix-lit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#67e8f9" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="matrix-off" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#475569" />
          <stop offset="1" stopColor="#1e293b" />
        </linearGradient>
        <radialGradient id="matrix-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.55" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#matrix-bg)" />
      <circle cx="60" cy="62" r="54" fill="url(#matrix-glow)" />
      <rect x="17" y="19" width="86" height="86" rx="14" fill="#0f0a2e" opacity="0.7" />
      {Array.from({ length: 16 }, (_, i) => {
        const r = Math.floor(i / 4)
        const c = i % 4
        const x = 22 + c * 20
        const y = 24 + r * 20
        const on = lit.has(i)
        const flipping = i === 13
        return (
          <g key={i} transform={flipping ? `translate(${x + 8} ${y + 8}) scale(0.45 1.08) translate(${-x - 8} ${-y - 8})` : undefined}>
            <rect x={x} y={y + 1.5} width="16" height="16" rx="4" fill="#000" opacity="0.35" />
            <rect x={x} y={y} width="16" height="16" rx="4" fill={on ? 'url(#matrix-lit)' : 'url(#matrix-off)'} />
            <rect x={x + 2} y={y + 1.5} width="12" height="4" rx="2" fill="#fff" opacity={on ? 0.45 : 0.12} />
            {on ? <path d={`M${x + 8} ${y + 3.5} L${x + 12} ${y + 8} L${x + 8} ${y + 12.5} L${x + 4} ${y + 8} Z`} fill="#fff" /> : null}
          </g>
        )
      })}
      <g stroke="#fde047" strokeWidth="2.4" strokeLinecap="round" opacity="0.9">
        <line x1="94" y1="92" x2="100" y2="86" />
        <line x1="98" y1="100" x2="106" y2="98" />
        <line x1="86" y1="98" x2="88" y2="106" />
      </g>
      <circle cx="30" cy="32" r="3" fill="#fff" opacity="0.8" />
    </svg>
  )
}
