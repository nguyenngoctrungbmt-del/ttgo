/** Domino Build cover: a curving chain of tiles toppling toward a golden bell. */
export default function Cover() {
  const tiles = [
    { x: 22, y: 98, a: -70, c: '#f472b6', fall: 1 },
    { x: 30, y: 86, a: -62, c: '#fb923c', fall: 1 },
    { x: 40, y: 76, a: -50, c: '#facc15', fall: 0.7 },
    { x: 52, y: 70, a: -30, c: '#4ade80', fall: 0.35 },
    { x: 64, y: 66, a: -20, c: '#38bdf8', fall: 0 },
    { x: 76, y: 62, a: -35, c: '#a78bfa', fall: 0 },
    { x: 86, y: 54, a: -55, c: '#f472b6', fall: 0 },
  ]
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Domino Build">
      <defs>
        <radialGradient id="domino-bg" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#db2777" />
          <stop offset="1" stopColor="#701a3e" />
        </radialGradient>
        <linearGradient id="domino-bell" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fef08a" />
          <stop offset="0.55" stopColor="#facc15" />
          <stop offset="1" stopColor="#a16207" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#domino-bg)" />
      <g stroke="#fff" strokeOpacity="0.07">
        {[20, 40, 60, 80, 100].map((v) => (
          <g key={v}>
            <line x1={v} y1="0" x2={v} y2="120" />
            <line x1="0" y1={v} x2="120" y2={v} />
          </g>
        ))}
      </g>
      {tiles.map((t, i) => {
        const len = 6 + 16 * t.fall
        const hz = 11 * (1 - t.fall)
        return (
          <g key={i} transform={`translate(${t.x} ${t.y}) rotate(${t.a})`}>
            <rect x={-3 + 2} y={-7 + 2} width={len + hz * 0.5} height="14" rx="2" fill="#000" opacity="0.28" />
            <g transform={`rotate(${-t.a}) translate(0 ${-hz}) rotate(${t.a})`}>
              <rect x="-3" y="-7" width={len} height="14" rx="2.5" fill={t.c} />
              {t.fall > 0.6 ? (
                <g fill="#fff">
                  <rect x={-3 + len / 2 - 0.6} y="-5" width="1.2" height="10" />
                  <circle cx={-3 + len * 0.25} cy="-3" r="1.5" />
                  <circle cx={-3 + len * 0.25} cy="3" r="1.5" />
                  <circle cx={-3 + len * 0.75} cy="0" r="1.5" />
                </g>
              ) : (
                <rect x="-2" y="-5.5" width="2" height="11" fill="#fff" opacity="0.55" />
              )}
            </g>
          </g>
        )
      })}
      {/* bell */}
      <ellipse cx="99" cy="46" rx="15" ry="5" fill="#000" opacity="0.25" />
      <g transform="rotate(14 96 30)">
        <path d="M82 40 Q84 14 96 14 Q108 14 110 40 Z" fill="url(#domino-bell)" />
        <rect x="79" y="38" width="34" height="6" rx="3" fill="#ca8a04" />
        <circle cx="96" cy="46" r="4" fill="#78350f" />
        <ellipse cx="90" cy="25" rx="2.5" ry="6.5" fill="#fff" opacity="0.6" />
        <rect x="94" y="9" width="4" height="6" fill="#a16207" />
      </g>
      <g stroke="#fde047" strokeWidth="2.2" strokeLinecap="round">
        <line x1="112" y1="16" x2="117" y2="11" />
        <line x1="114" y1="27" x2="119" y2="26" />
        <line x1="104" y1="8" x2="106" y2="3" />
      </g>
      <path d="M58 98 l3 -6 l3 6 l-3 6 z" fill="#67e8f9" />
    </svg>
  )
}
