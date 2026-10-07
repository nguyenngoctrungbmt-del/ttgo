/** Slither Arena cover: a glowing green worm curling past pellets on a hex floor. */
export default function Cover() {
  const body: [number, number][] = [
    [26, 96],
    [34, 100],
    [43, 101],
    [52, 98],
    [59, 92],
    [63, 84],
    [64, 75],
    [61, 67],
    [55, 61],
    [49, 55],
    [46, 47],
    [48, 39],
    [54, 32],
    [62, 28],
    [71, 27],
    [80, 30],
  ]
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Slither Arena">
      <defs>
        <radialGradient id="slither-bg" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#1e2b4d" />
          <stop offset="1" stopColor="#070b16" />
        </radialGradient>
        <radialGradient id="slither-bead" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#d9f99d" />
          <stop offset="0.55" stopColor="#4ade80" />
          <stop offset="1" stopColor="#15803d" />
        </radialGradient>
        <radialGradient id="slither-bead2" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="0.55" stopColor="#16a34a" />
          <stop offset="1" stopColor="#14532d" />
        </radialGradient>
        <radialGradient id="slither-pel" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.35" stopColor="#fde047" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="slither-pel2" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.35" stopColor="#f472b6" />
          <stop offset="1" stopColor="#f472b6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="slither-pel3" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.35" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#slither-bg)" />
      <g fill="none" stroke="#38bdf8" strokeOpacity="0.12" strokeWidth="1.2">
        <path d="M10 20 l8 -5 l8 5 v9 l-8 5 l-8 -5 z" />
        <path d="M26 20 l8 -5 l8 5 v9 l-8 5 l-8 -5 z" />
        <path d="M86 70 l8 -5 l8 5 v9 l-8 5 l-8 -5 z" />
        <path d="M94 84 l8 -5 l8 5 v9 l-8 5 l-8 -5 z" />
        <path d="M18 64 l8 -5 l8 5 v9 l-8 5 l-8 -5 z" />
      </g>
      <circle cx="94" cy="50" r="7" fill="url(#slither-pel)" />
      <circle cx="98" cy="22" r="6" fill="url(#slither-pel2)" />
      <circle cx="24" cy="40" r="6" fill="url(#slither-pel3)" />
      <circle cx="88" cy="96" r="7" fill="url(#slither-pel2)" />
      <circle cx="104" cy="74" r="5" fill="url(#slither-pel3)" />
      <circle cx="80" cy="30" r="22" fill="#4ade80" opacity="0.14" />
      <g transform="translate(3 4)" fill="#000" opacity="0.3">
        {body.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i < 4 ? 5 + i * 0.8 : 8} />
        ))}
      </g>
      {body.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={i < 4 ? 5 + i * 0.8 : 8} fill="#14532d" />
          <circle cx={x} cy={y} r={(i < 4 ? 5 + i * 0.8 : 8) - 1.4} fill={Math.floor(i / 2) % 2 ? 'url(#slither-bead2)' : 'url(#slither-bead)'} />
        </g>
      ))}
      <circle cx="80" cy="30" r="9.5" fill="#14532d" />
      <circle cx="80" cy="30" r="8.2" fill="url(#slither-bead)" />
      <g>
        <circle cx="83" cy="25" r="3.6" fill="#fff" />
        <circle cx="85" cy="32" r="3.6" fill="#fff" />
        <circle cx="84.6" cy="24.6" r="1.9" fill="#0f172a" />
        <circle cx="86.6" cy="31.6" r="1.9" fill="#0f172a" />
        <circle cx="84" cy="24" r="0.7" fill="#fff" />
        <circle cx="86" cy="31" r="0.7" fill="#fff" />
      </g>
      <g stroke="#bef264" strokeWidth="2" strokeLinecap="round" opacity="0.55">
        <line x1="18" y1="104" x2="10" y2="106" />
        <line x1="20" y1="96" x2="11" y2="96" />
      </g>
    </svg>
  )
}
