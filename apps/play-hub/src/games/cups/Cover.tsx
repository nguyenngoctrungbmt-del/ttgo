/** Cup Shuffle cover: three carnival cups, one lifted over a gold star ball, with swap arcs. */
export default function Cover() {
  const cup = (x: number, y: number, s = 1) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx="0" cy="2" rx="17" ry="4" fill="#000" opacity="0.3" />
      <path d="M-15 0 L-10 -30 Q0 -34 10 -30 L15 0 Q0 5 -15 0 Z" fill="url(#cups-cup)" />
      <path d="M-15 0 Q0 5 15 0 L14 -5 Q0 0 -14 -5 Z" fill="#7f1d1d" />
      <path d="M-11 -26 L-7 -26 L-10 -4 L-13 -4 Z" fill="#fff" opacity="0.35" />
      <ellipse cx="0" cy="-30.5" rx="10" ry="3" fill="#fca5a5" />
      <path d="M0 -20 l2 4 4 .5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -.5z" fill="#fde047" />
    </g>
  )
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Cup Shuffle">
      <defs>
        <linearGradient id="cups-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7c2d12" />
          <stop offset="1" stopColor="#3b0764" />
        </linearGradient>
        <linearGradient id="cups-cup" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#991b1b" />
          <stop offset="0.45" stopColor="#ef4444" />
          <stop offset="1" stopColor="#7f1d1d" />
        </linearGradient>
        <radialGradient id="cups-ball" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fef9c3" />
          <stop offset="0.5" stopColor="#facc15" />
          <stop offset="1" stopColor="#b45309" />
        </radialGradient>
        <radialGradient id="cups-spot" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#fde68a" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#cups-bg)" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${i * 22 - 4} 0 L${i * 22 + 7} 0 L${i * 22 + 10} 46 L${i * 22 - 1} 46 Z`} fill="#fef3c7" opacity="0.12" />
      ))}
      <circle cx="60" cy="60" r="56" fill="url(#cups-spot)" />
      <path d="M0 78 Q60 66 120 78 L120 120 L0 120 Z" fill="#14532d" />
      <path d="M0 78 Q60 66 120 78" stroke="#fbbf24" strokeWidth="2.5" fill="none" />
      {[10, 30, 50, 70, 90, 110].map((x) => (
        <circle key={x} cx={x} cy={8 + Math.abs(60 - x) * 0.08} r="2.6" fill={x % 40 === 10 ? '#fde047' : '#f472b6'} />
      ))}
      <path d="M26 48 Q42 30 58 46" stroke="#fff" strokeWidth="2" fill="none" strokeDasharray="3 4" opacity="0.7" />
      <path d="M92 50 L95 44 M95 44 L89 45" stroke="#fff" strokeWidth="2" opacity="0.7" strokeLinecap="round" />
      <circle cx="60" cy="81" r="8" fill="url(#cups-ball)" />
      <path d="M60 76.5 l1.3 2.6 2.9.4 -2.1 2 .5 2.9 -2.6-1.4 -2.6 1.4 .5-2.9 -2.1-2 2.9-.4z" fill="#fff" opacity="0.9" />
      {cup(26, 86, 0.95)}
      {cup(60, 60, 1.05)}
      {cup(94, 86, 0.95)}
      <g stroke="#fde047" strokeWidth="2" strokeLinecap="round">
        <line x1="44" y1="70" x2="40" y2="66" />
        <line x1="76" y1="70" x2="80" y2="66" />
      </g>
    </svg>
  )
}
