/** Melody Keys cover: a singing bird over a rainbow xylophone with flying notes. */
export default function Cover() {
  const bars = [
    { c: '#ef4444', d: '#991b1b', h: 46 },
    { c: '#f97316', d: '#9a3412', h: 43 },
    { c: '#eab308', d: '#854d0e', h: 40 },
    { c: '#22c55e', d: '#166534', h: 37 },
    { c: '#3b82f6', d: '#1e3a8a', h: 34 },
  ]
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Melody Keys">
      <defs>
        <linearGradient id="melody-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#1e1b4b" />
        </linearGradient>
        <radialGradient id="melody-bird" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#e0e7ff" />
          <stop offset="0.55" stopColor="#818cf8" />
          <stop offset="1" stopColor="#3730a3" />
        </radialGradient>
        <radialGradient id="melody-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.7" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#melody-bg)" />
      <rect x="10" y="76" width="100" height="5" rx="2.5" fill="#78350f" />
      <rect x="10" y="102" width="100" height="5" rx="2.5" fill="#78350f" />
      {bars.map((b, i) => (
        <g key={b.c}>
          {i === 2 ? <circle cx={20 + i * 20} cy={90} r="20" fill="url(#melody-glow)" /> : null}
          <rect x={11 + i * 20} y={92 - b.h / 2 - (i === 2 ? 4 : 0)} width="17" height={b.h} rx="5" fill={b.c} stroke={b.d} strokeWidth="1.5" />
          <rect x={13 + i * 20} y={95 - b.h / 2 - (i === 2 ? 4 : 0)} width="4" height={b.h - 6} rx="2" fill="#fff" opacity="0.3" />
        </g>
      ))}
      {/* symbols */}
      <circle cx="19.5" cy="92" r="3.5" fill="#fff" />
      <path d="M39.5 88 L43.5 95 L35.5 95 Z" fill="#fff" />
      <path d="M59.5 83 l1.6 3.4 3.6 0.4 -2.7 2.4 0.8 3.6 -3.3 -1.9 -3.3 1.9 0.8 -3.6 -2.7 -2.4 3.6 -0.4 Z" fill="#fff" />
      <rect x="76.5" y="89" width="6" height="6" rx="1" fill="#fff" />
      <path d="M99.5 92 m0 4 c-5 -3 -4 -8 0 -5.5 c4 -2.5 5 2.5 0 5.5 Z" fill="#fff" />
      {/* bird */}
      <g transform="translate(58 42)">
        <path d="M17 4 L29 -2 L27 9 Z" fill="#4338ca" />
        <ellipse rx="21" ry="19" fill="url(#melody-bird)" stroke="#312e81" strokeWidth="1.5" />
        <ellipse cx="-1" cy="7" rx="12" ry="9" fill="#fef3c7" />
        <ellipse cx="-4" cy="-23" rx="2.5" ry="6" fill="#eab308" transform="rotate(-20 -4 -23)" />
        <ellipse cx="2" cy="-24" rx="2.5" ry="6" fill="#eab308" />
        <path d="M-10 -6 a3 3 0 0 1 6 0" stroke="#1e1b4b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M4 -6 a3 3 0 0 1 6 0" stroke="#1e1b4b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M-4 -1 L4 -1 L0 3 Z" fill="#f59e0b" />
        <path d="M-3 1 L3 1 L0 8 Z" fill="#d97706" />
      </g>
      {/* flying notes */}
      <g fill="#fde047" stroke="#fde047">
        <ellipse cx="90" cy="30" rx="4.5" ry="3.3" transform="rotate(-25 90 30)" stroke="none" />
        <path d="M94 29 V15 q4 2 5 7" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      <g fill="#f9a8d4" stroke="#f9a8d4">
        <ellipse cx="25" cy="34" rx="4" ry="3" transform="rotate(-25 25 34)" stroke="none" />
        <path d="M28.5 33 V21 q4 2 4.5 6" strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
      <g stroke="#e0e7ff" strokeWidth="2" strokeLinecap="round" opacity="0.6">
        <path d="M82 46 q5 -3 10 0" fill="none" />
        <path d="M84 53 q6 -3 12 0" fill="none" />
      </g>
    </svg>
  )
}
