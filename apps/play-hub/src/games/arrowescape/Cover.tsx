/** Arrow Escape cover: a grid of bent arrows, one shooting off the edge. */
export default function Cover() {
  const arrow = (d: string, color: string, dark: string, tip: string, key: string) => (
    <g key={key}>
      <path d={d} fill="none" stroke={dark} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d={tip} fill={color} stroke={dark} strokeWidth="1.5" strokeLinejoin="round" />
    </g>
  )
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Arrow Escape">
      <defs>
        <linearGradient id="arrowescape-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#134e4a" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#arrowescape-bg)" />
      <rect x="14" y="14" width="80" height="92" rx="12" fill="#f0fdfa" />
      {arrow('M26 30 L26 50 L44 50', '#f43f5e', '#9f1239', 'M44 43 L54 50 L44 57 Z', 'a')}
      {arrow('M30 94 L30 72', '#8b5cf6', '#4c1d95', 'M23 72 L30 62 L37 72 Z', 'b')}
      {arrow('M80 30 L62 30', '#f59e0b', '#92400e', 'M62 23 L52 30 L62 37 Z', 'c')}
      {arrow('M48 90 L66 90 L66 72', '#0ea5e9', '#075985', 'M59 72 L66 62 L73 72 Z', 'd')}
      {arrow('M82 94 L82 82', '#84cc16', '#3f6212', 'M75 82 L82 72 L89 82 Z', 'e')}
      {/* escaping arrow */}
      {arrow('M70 54 L100 54', '#14b8a6', '#0f766e', 'M100 46 L112 54 L100 62 Z', 'f')}
      <g stroke="#ccfbf1" strokeWidth="2.4" strokeLinecap="round" opacity="0.8">
        <line x1="54" y1="46" x2="64" y2="46" />
        <line x1="50" y1="54" x2="62" y2="54" />
        <line x1="54" y1="62" x2="64" y2="62" />
      </g>
    </svg>
  )
}
