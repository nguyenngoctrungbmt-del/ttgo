/** Bullet Storm cover: a neon ship threading a spiral of glowing bullets. */
export default function Cover() {
  const orbs = Array.from({ length: 14 }, (_, i) => {
    const a = i * 0.62
    const r = 12 + i * 3.1
    return { x: 60 + Math.cos(a) * r, y: 40 + Math.sin(a) * r * 0.8, c: i % 2 ? '#22d3ee' : '#f472b6' }
  })
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Bullet Storm">
      <defs>
        <linearGradient id="bullet-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b0764" />
          <stop offset="1" stopColor="#0b0216" />
        </linearGradient>
        <radialGradient id="bullet-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fdf4ff" />
          <stop offset="0.5" stopColor="#e879f9" />
          <stop offset="1" stopColor="#e879f9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bullet-hull" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#cbd5e1" />
          <stop offset="0.5" stopColor="#ffffff" />
          <stop offset="1" stopColor="#94a3b8" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="26" fill="url(#bullet-bg)" />
      <circle cx="60" cy="40" r="30" fill="url(#bullet-core)" opacity="0.6" />
      <path d="M44 34 L60 24 L76 34 L72 52 L60 58 L48 52 Z" fill="#a855f7" />
      <path d="M50 36 L60 29 L70 36 L67 49 L60 53 L53 49 Z" fill="#f5d0fe" />
      <circle cx="60" cy="41" r="4" fill="#facc15" />
      {orbs.map((o, i) => (
        <g key={i}>
          <circle cx={o.x} cy={o.y} r="5" fill={o.c} opacity="0.35" />
          <circle cx={o.x} cy={o.y} r="3" fill={o.c} />
          <circle cx={o.x} cy={o.y} r="1.5" fill="#fff" />
        </g>
      ))}
      <g transform="translate(60 94) scale(1.35)">
        <ellipse cx="-5" cy="17" rx="2.5" ry="6" fill="#f472b6" opacity="0.7" />
        <ellipse cx="5" cy="17" rx="2.5" ry="6" fill="#f472b6" opacity="0.7" />
        <path d="M0 -6 L17 8 L15 13 L4 9 L-4 9 L-15 13 L-17 8 Z" fill="#7e22ce" />
        <path d="M0 -4 L15 8 L4 6 L-4 6 L-15 8 Z" fill="#e879f9" />
        <path d="M0 -20 L6 -4 L7 12 L-7 12 L-6 -4 Z" fill="url(#bullet-hull)" />
        <ellipse cx="0" cy="-7" rx="2.8" ry="5.5" fill="#0891b2" />
        <circle cx="0" cy="2" r="3.4" fill="#f472b6" />
        <circle cx="0" cy="2" r="1.8" fill="#fff" />
      </g>
    </svg>
  )
}
