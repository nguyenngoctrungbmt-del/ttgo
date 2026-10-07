/** Paint Wars cover: a pink painter cube closing a loop of fresh paint against a blue rival. */
export default function Cover() {
  const pink: [number, number][] = [
    [1, 6], [2, 6], [3, 6], [4, 6], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [2, 9], [3, 9], [4, 9],
  ]
  const blue: [number, number][] = [
    [7, 1], [8, 1], [9, 1], [10, 1], [7, 2], [8, 2], [9, 2], [10, 2], [8, 3], [9, 3], [10, 3], [9, 4], [10, 4],
  ]
  const S = 10
  const tile = (x: number, y: number, top: string, side: string, k: string) => (
    <g key={k}>
      <rect x={x * S} y={y * S + 3} width={S} height={S} fill={side} />
      <rect x={x * S} y={y * S} width={S} height={S} fill={top} />
    </g>
  )
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Paint Wars">
      <defs>
        <linearGradient id="paint-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fdf2f8" />
          <stop offset="1" stopColor="#f5d0fe" />
        </linearGradient>
        <linearGradient id="paint-cube" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fda4af" />
          <stop offset="1" stopColor="#e11d48" />
        </linearGradient>
        <pattern id="paint-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M10 0 H0 V10" fill="none" stroke="#f9a8d4" strokeOpacity="0.6" strokeWidth="1" />
        </pattern>
        <clipPath id="paint-clip">
          <rect width="120" height="120" rx="26" />
        </clipPath>
      </defs>
      <g clipPath="url(#paint-clip)">
        <rect width="120" height="120" fill="url(#paint-bg)" />
        <rect width="120" height="120" fill="url(#paint-grid)" />
        {blue.map(([x, y], i) => tile(x, y, '#3b82f6', '#1e3a8a', `b${i}`))}
        {pink.map(([x, y], i) => tile(x, y, '#f43f5e', '#9f1239', `p${i}`))}
        {/* trail loop out of the pink land and back */}
        <path d="M55 65 V35 H85 V75 H60" fill="none" stroke="#fb7185" strokeOpacity="0.85" strokeWidth="10" strokeLinejoin="round" />
        {/* blue rival about to be cut */}
        <g transform="translate(95 55)">
          <rect x="-8" y="-7" width="16" height="16" rx="5" fill="#fff" />
          <rect x="-6.5" y="-5.5" width="13" height="13" rx="4" fill="#2563eb" />
          <circle cx="-2.2" cy="0" r="1.6" fill="#fff" />
          <circle cx="2.2" cy="0" r="1.6" fill="#fff" />
          <circle cx="-2.6" cy="0.3" r="0.8" fill="#0f172a" />
          <circle cx="1.8" cy="0.3" r="0.8" fill="#0f172a" />
        </g>
      </g>
      {/* hero cube */}
      <g transform="translate(62 75)">
        <ellipse cx="1" cy="12" rx="13" ry="4.5" fill="#000" opacity="0.2" />
        <rect x="-14" y="-14" width="28" height="30" rx="8" fill="#fff" />
        <rect x="-12" y="-10" width="24" height="23" rx="7" fill="#9f1239" />
        <rect x="-12" y="-12" width="24" height="22" rx="7" fill="url(#paint-cube)" />
        <rect x="-8" y="-10" width="9" height="3.5" rx="1.7" fill="#fff" opacity="0.55" />
        <ellipse cx="-7.5" cy="-1" rx="2.8" ry="3.4" fill="#fff" />
        <ellipse cx="-7.5" cy="5" rx="2.8" ry="3.4" fill="#fff" />
        <circle cx="-8.6" cy="-1" r="1.5" fill="#0f172a" />
        <circle cx="-8.6" cy="5" r="1.5" fill="#0f172a" />
      </g>
      <g stroke="#e11d48" strokeWidth="2.6" strokeLinecap="round" opacity="0.65">
        <line x1="80" y1="70" x2="92" y2="70" />
        <line x1="80" y1="82" x2="90" y2="82" />
      </g>
      <circle cx="104" cy="96" r="6" fill="#f43f5e" />
      <circle cx="111" cy="88" r="2.6" fill="#f43f5e" />
      <circle cx="98" cy="106" r="2.2" fill="#f43f5e" />
    </svg>
  )
}
